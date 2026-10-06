import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { MediaService } from './mediaService';

// The Videos tab is only as good as the query it sends. `mediaKind` has to reach
// the server as its own parameter: the server filters on mimeType for it, and on
// the separate `type` field for purpose (banner, gallery, avatar...). Conflating
// the two would make "show me videos" silently also mean "show me gallery files",
// so these assert the two travel independently.

const requested: string[] = [];

// Only the query string is under test. Parsing the whole URL would need
// NEXT_PUBLIC_API_BASE_URL set, which is a separate concern (and unset here, so the
// origin reads as the literal string "undefined").
function lastQuery(): URLSearchParams {
  const url = requested.at(-1) ?? '';
  return new URLSearchParams(url.slice(url.indexOf('?') + 1));
}

const emptyPage = {
  success: true,
  message: '',
  data: {
    files: [],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalFiles: 0,
      filesPerPage: 20,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    isAdminView: true,
  },
};

beforeEach(() => {
  requested.length = 0;
  vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
    requested.push(String(input));
    return { ok: true, json: async () => emptyPage } as Response;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MediaService.getMediaFiles: mediaKind', () => {
  it('sends mediaKind=video when the Videos tab is active', async () => {
    await MediaService.getMediaFiles({ mediaKind: 'video' });

    expect(lastQuery().get('mediaKind')).toBe('video');
  });

  it('sends mediaKind=image when the Images tab is active', async () => {
    await MediaService.getMediaFiles({ mediaKind: 'image' });

    expect(lastQuery().get('mediaKind')).toBe('image');
  });

  it('omits mediaKind entirely on the All tab', async () => {
    await MediaService.getMediaFiles({ page: 1 });

    expect(lastQuery().has('mediaKind')).toBe(false);
  });

  it('keeps mediaKind and type as separate parameters', async () => {
    await MediaService.getMediaFiles({ mediaKind: 'video', type: 'gallery' });

    expect(lastQuery().get('mediaKind')).toBe('video');
    expect(lastQuery().get('type')).toBe('gallery');
  });

  it('does not disturb the other filters', async () => {
    await MediaService.getMediaFiles({
      mediaKind: 'video',
      category: 'service',
      search: 'tumbarumba',
      page: 2,
    });

    const params = lastQuery();
    expect(params.get('mediaKind')).toBe('video');
    expect(params.get('category')).toBe('service');
    expect(params.get('search')).toBe('tumbarumba');
    expect(params.get('page')).toBe('2');
  });
});
