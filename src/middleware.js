import { NextResponse } from 'next/server';

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

const ADMIN_PATHS = [
  '/admin',
  '/dashboard',
  '/invoices',
  '/clients',
  '/business',
  '/bank-accounts',
  '/password',
];

function isPublicPath(pathname) {
  return STATIC_PUBLIC_PATHS.has(pathname) || pathname.startsWith('/products/');
}

function isAdminPath(pathname) {
  return ADMIN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname) || !isAdminPath(pathname)) {
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
