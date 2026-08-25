import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import MediaThumbnail, { canOptimise } from './MediaThumbnail';

// A colleague opened "Select Banner Image" and the whole admin page died with
// "Application error: a client-side exception has occurred". next/image does not
// degrade when it cannot resolve a src — it throws during render, and React turns
// that into an unhandled exception that takes the page down.
//
// Two ways a media row triggers it: no url at all, or a host absent from
// images.remotePatterns in next.config.ts. Media listings are scoped per user, so
// one bad file among one person's uploads breaks the library for them alone, which
// is exactly how this presented.
//
// What must hold: nothing renderable, however malformed, may throw.

const ALLOWED =
  'https://s3.ap-southeast-2.wasabisys.com/adventistcommunityservices/general/x.webp';

describe('canOptimise', () => {
  it('accepts a configured host and path', () => {
    expect(canOptimise(ALLOWED)).toBe(true);
  });

  it('rejects a host that is not configured', () => {
    // The crash case: next/image would throw on this.
    expect(canOptimise('https://other-bucket.example.com/img.jpg')).toBe(false);
  });

  it('rejects the right host under the wrong bucket path', () => {
    expect(
      canOptimise('https://s3.ap-southeast-2.wasabisys.com/some-old-bucket/img.jpg')
    ).toBe(false);
  });

  it('rejects plain http', () => {
    expect(
      canOptimise('http://s3.ap-southeast-2.wasabisys.com/adventistcommunityservices/x.webp')
    ).toBe(false);
  });

  it.each([
    ['empty', ''],
    ['relative', '/uploads/x.jpg'],
    ['nonsense', 'not-a-url'],
  ])('rejects a %s src rather than throwing', (_label, src) => {
    expect(() => canOptimise(src)).not.toThrow();
    expect(canOptimise(src)).toBe(false);
  });
});

describe('MediaThumbnail', () => {
  it('renders a placeholder when there is no url, without throwing', () => {
    expect(() => render(<MediaThumbnail src={undefined} alt="x" fill />)).not.toThrow();
  });

  it('renders a placeholder for null, without throwing', () => {
    const { container } = render(<MediaThumbnail src={null} alt="x" fill />);

    expect(container.querySelector('img')).toBeNull();
  });

  it('falls back to a plain img for an unconfigured host', () => {
    const { container } = render(
      <MediaThumbnail src="https://other-bucket.example.com/img.jpg" alt="x" fill />
    );
    const img = container.querySelector('img');

    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://other-bucket.example.com/img.jpg');
  });

  it('still renders a configured host', () => {
    const { container } = render(<MediaThumbnail src={ALLOWED} alt="x" fill />);

    expect(container.querySelector('img')).not.toBeNull();
  });

  it('does not throw on any malformed src', () => {
    for (const src of ['', 'not-a-url', '/relative.jpg', 'javascript:alert(1)']) {
      expect(() => render(<MediaThumbnail src={src} alt="x" fill />)).not.toThrow();
    }
  });
});
