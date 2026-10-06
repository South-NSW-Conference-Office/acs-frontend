import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Logging in locally failed with "Login failed (404)". The request was:
//
//     POST http://localhost:3001/undefined/api/auth/signin  ->  404
//
// NEXT_PUBLIC_API_BASE_URL was unset and every call site read process.env directly
// with no fallback, so the literal string "undefined" was interpolated into the URL.
// Nothing said what was wrong; the panel simply 404'd everywhere.
//
// The nastier version is production. NEXT_PUBLIC_* is inlined at *build* time, so a
// missing Docker build arg produces a bundle in which every request is broken — and
// the build that produced it succeeds quietly. That is why a production build now
// throws rather than falling back: failing the build is far cheaper than finding out
// after deploy.

const ORIGINAL = process.env.NEXT_PUBLIC_API_BASE_URL;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

async function loadConfig() {
  vi.resetModules();
  return import('./config');
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
  else process.env.NEXT_PUBLIC_API_BASE_URL = ORIGINAL;
  vi.stubEnv('NODE_ENV', ORIGINAL_NODE_ENV ?? 'test');
  vi.unstubAllEnvs();
});

describe('API_BASE_URL', () => {
  it('uses the configured value', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test';

    const { API_BASE_URL } = await loadConfig();

    expect(API_BASE_URL).toBe('https://api.example.test');
  });

  it('strips a trailing slash, which would otherwise produce a double slash', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test/';

    const { API_BASE_URL } = await loadConfig();

    expect(API_BASE_URL).toBe('https://api.example.test');
  });

  it('never yields the string "undefined" — the original bug', async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { API_BASE_URL } = await loadConfig();

    expect(API_BASE_URL).not.toContain('undefined');
    expect(`${API_BASE_URL}/api/auth/signin`).not.toContain('/undefined/');
  });

  it('falls back to the backend port in development, and says so', async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { API_BASE_URL } = await loadConfig();

    expect(API_BASE_URL).toBe('http://localhost:5000');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('NEXT_PUBLIC_API_BASE_URL')
    );
  });

  it('fails a production build rather than shipping a broken bundle', async () => {
    // The guard that matters: caught in CI instead of after deploy.
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    vi.stubEnv('NODE_ENV', 'production');

    await expect(loadConfig()).rejects.toThrow(/NEXT_PUBLIC_API_BASE_URL/);
  });

  it('names the build arg in the failure, so the fix is obvious', async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    vi.stubEnv('NODE_ENV', 'production');

    await expect(loadConfig()).rejects.toThrow(/build arg/i);
  });
});
