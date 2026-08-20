import { describe, it, expect, vi, afterEach } from 'vitest';
import { AuthService } from './auth';

// A user enrolled through the admin panel is created without a password — the API
// comment says so explicitly — so their first sign-in gets a 400 explaining that they
// need to set one. That explanation lives in `message`; `err` carries a short internal
// reason. The client read `err` first, so the person saw "Password not set" instead of
// being told to check their email, which is the one thing that would have helped.

const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

const credentials = { email: 'someone@example.com', password: 'x' };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthService.login error reporting', () => {
  it('surfaces the account-setup explanation, not the terse reason', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse(400, {
        success: false,
        message:
          'Please complete your account setup by setting a password first. Check your email for the verification link.',
        err: 'Password not set',
      })
    );

    const result = await AuthService.login(credentials);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Check your email');
    // The regression: this used to be 'Password not set'.
    expect(result.message).not.toBe('Password not set');
  });

  it('prefers message over err for ordinary bad credentials too', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse(401, {
        success: false,
        message: 'Invalid credentials',
        err: 'User not found or inactive',
      })
    );

    const result = await AuthService.login(credentials);

    expect(result.message).toBe('Invalid credentials');
  });

  it('falls back to err when the API sends no message', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse(401, { success: false, err: 'Something internal' })
    );

    const result = await AuthService.login(credentials);

    expect(result.message).toBe('Something internal');
  });

  it('reports the status rather than a parse error on a non-JSON body', async () => {
    // A proxy error page or empty 502 body: response.json() throws, and the old code
    // let that surface as "Unexpected token <", which says nothing about signing in.
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    } as unknown as Response);

    const result = await AuthService.login(credentials);

    expect(result.success).toBe(false);
    expect(result.message).toContain('502');
    expect(result.message).not.toContain('Unexpected token');
  });

  it('passes a successful response through untouched', async () => {
    const payload = {
      success: true,
      message: 'ok',
      data: { token: 't', user: { id: '1', email: 'someone@example.com' } },
    };
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(200, payload));

    const result = await AuthService.login(credentials);

    expect(result.success).toBe(true);
    expect(result.data?.token).toBe('t');
  });
});
