import { NextResponse } from 'next/server';

/**
 * Next.js Middleware — runs at the edge before any page renders.
 *
 * Strategy:
 *  - Protected routes → redirect to /login if no session cookie is found.
 *  - Auth routes      → redirect to /dashboard if a session cookie IS found
 *                       (prevents logged-in users visiting /login again).
 *
 * Cookie name:
 *  Adjust COOKIE_NAME to match whatever your backend sets.
 *  Common names: "token", "session", "accessToken", "jwt", "connect.sid".
 */
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'token';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/invoices',
  '/clients',
  '/business',
  '/bank-accounts',
  '/settings',
];

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
  const isLoggedIn = Boolean(sessionCookie);

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p));

  // Unauthenticated user hitting a protected route → /login?from=<original path>
  if (isProtected && !isLoggedIn) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting an auth page → /dashboard
  if (isAuthPath && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match all paths EXCEPT:
   *  - Next.js internals (_next/static, _next/image)
   *  - Public assets (favicon, images, etc.)
   *  - API routes
   */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
