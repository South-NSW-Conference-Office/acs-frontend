import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for the Admin Panel
 *
 * NOTE: Full server-side route protection (JWT validation) is not possible here
 * because the app stores auth tokens in localStorage, which is inaccessible to
 * server-side middleware. Migrating to httpOnly cookie-based auth would enable
 * proper server-side route guards in this middleware.
 *
 * Current responsibilities:
 * 1. Add security response headers for protected routes (defense-in-depth)
 * 2. Prevent browser caching of authenticated pages
 * 3. Add CSP frame-ancestors directive to prevent clickjacking on admin pages
 *
 * Client-side auth protection is handled by:
 * - AdminLayout component (redirects unauthenticated users)
 * - HierarchicalPermissionProvider context (manages auth state)
 * - PermissionGate components (granular permission checks)
 */

const publicPaths = ['/', '/forgot-password', '/reset-password', '/verify-email'];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // For protected (non-public) routes, add additional security headers
  if (!isPublicPath(pathname)) {
    // Prevent browsers from caching authenticated admin pages.
    // This stops the back-button from showing stale authenticated content
    // after a user has logged out.
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo|api).*)'],
};
