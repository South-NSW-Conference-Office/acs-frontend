import { describe, it, expect, vi, afterEach } from 'vitest';
import { serviceManagement } from './serviceManagement';

// GET /admin/services is paginated with a default limit of 10. The services
// register called getServices() bare and displayed page one's length as
// "Ministries on Record" — a super admin saw "10" over a database of 22, and
// rows 11+ were unreachable because the register has no pager. getAllServices
// walks the response's own pagination so every row arrives regardless of count.

type Page = { services: { _id: string }[]; pagination?: { pages: number } };

function pagesOf(total: number, perPage: number): Page[] {
  const pages = Math.max(1, Math.ceil(total / perPage));
  return Array.from({ length: pages }, (_, p) => ({
    services: Array.from(
      { length: Math.min(perPage, total - p * perPage) },
      (_, i) => ({ _id: `s${p * perPage + i + 1}` })
    ),
    pagination: { pages },
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('serviceManagement.getAllServices', () => {
  it('walks every page instead of stopping at the first', async () => {
    // 230 services at the loop's page size of 100 -> three pages.
    const pages = pagesOf(230, 100);
    const spy = vi
      .spyOn(serviceManagement, 'getServices')
      .mockImplementation(async (params) => pages[(params?.page ?? 1) - 1]);

    const result = (await serviceManagement.getAllServices()) as {
      services: unknown[];
    };

    expect(result.services).toHaveLength(230);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('makes exactly one request when everything fits in a page', async () => {
    const pages = pagesOf(22, 100);
    const spy = vi
      .spyOn(serviceManagement, 'getServices')
      .mockImplementation(async (params) => pages[(params?.page ?? 1) - 1]);

    const result = (await serviceManagement.getAllServices()) as {
      services: unknown[];
    };

    expect(result.services).toHaveLength(22);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('preserves order across page boundaries', async () => {
    const pages = pagesOf(150, 100);
    vi.spyOn(serviceManagement, 'getServices').mockImplementation(
      async (params) => pages[(params?.page ?? 1) - 1]
    );

    const result = (await serviceManagement.getAllServices()) as {
      services: { _id: string }[];
    };

    expect(result.services[0]._id).toBe('s1');
    expect(result.services[99]._id).toBe('s100');
    expect(result.services[100]._id).toBe('s101');
    expect(result.services[149]._id).toBe('s150');
  });

  it('survives a response with no pagination block', async () => {
    vi.spyOn(serviceManagement, 'getServices').mockResolvedValue({
      services: [{ _id: 'only' }],
    });

    const result = (await serviceManagement.getAllServices()) as {
      services: unknown[];
    };

    expect(result.services).toHaveLength(1);
  });

  it('stops on an empty page rather than trusting a bad page count', async () => {
    // A server that claims 50 pages but returns nothing past page 1 must not
    // be looped 49 more times.
    const spy = vi
      .spyOn(serviceManagement, 'getServices')
      .mockImplementation(async (params) =>
        (params?.page ?? 1) === 1
          ? { services: [{ _id: 's1' }], pagination: { pages: 50 } }
          : { services: [] }
      );

    const result = (await serviceManagement.getAllServices()) as {
      services: unknown[];
    };

    expect(result.services).toHaveLength(1);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
