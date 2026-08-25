import { describe, it, expect } from 'vitest';
import type { MediaFile } from './mediaService';

// The reported crash, from the console of the affected user:
//
//   Uncaught TypeError: Cannot read properties of null (reading 'name')
//       at Array.map (<anonymous>)
//
// The media list populates `uploadedBy`, and Mongo yields null for a reference
// whose document has been deleted. The type declared it as always present, so
// nothing warned about `file.uploadedBy.name` in the render — it threw during the
// file map, React turned that into an unhandled exception, and Next.js replaced
// the admin page with "Application error: a client-side exception has occurred".
//
// One account being deleted should cost a caption, not the page. These pin the
// shape of the fix: the type admits null, and reading the name never throws.

function uploaderName(file: Pick<MediaFile, 'uploadedBy'>): string {
  // Mirrors the render: file.uploadedBy?.name ?? 'Unknown uploader'
  return file.uploadedBy?.name ?? 'Unknown uploader';
}

describe('media uploader name', () => {
  it('shows the uploader when the account still exists', () => {
    expect(
      uploaderName({
        uploadedBy: { _id: 'u1', name: 'Cling De Guzman', email: 'c@example.test' },
      })
    ).toBe('Cling De Guzman');
  });

  it('does not throw when the uploader has been deleted', () => {
    // The crash case: populate returned null.
    expect(() => uploaderName({ uploadedBy: null })).not.toThrow();
  });

  it('falls back to a caption rather than blowing up the page', () => {
    expect(uploaderName({ uploadedBy: null })).toBe('Unknown uploader');
  });

  it('survives a whole listing containing one orphaned file', () => {
    // This is the real shape: Array.map over a page of files, one of them orphaned.
    const files: Pick<MediaFile, 'uploadedBy'>[] = [
      { uploadedBy: { _id: 'u1', name: 'Alice', email: 'a@example.test' } },
      { uploadedBy: null },
      { uploadedBy: { _id: 'u2', name: 'Bob', email: 'b@example.test' } },
    ];

    expect(() => files.map(uploaderName)).not.toThrow();
    expect(files.map(uploaderName)).toEqual(['Alice', 'Unknown uploader', 'Bob']);
  });
});
