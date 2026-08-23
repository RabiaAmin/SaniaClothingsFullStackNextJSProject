import { NextResponse } from 'next/server';
import { isProtectedPath } from '@/lib/auth/access';

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'token';

const STATIC_PUBLIC_PATHS = new Set([
  '/',
  '/about',
  '/contact',
  '/services',
  '/products',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]);

function isPublicPath(pathname) {
  return STATIC_PUBLIC_PATHS.has(pathname) || pathname.startsWith('/products/');
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname) || !isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(COOKIE_NAME);
  if (!hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)'],
};
