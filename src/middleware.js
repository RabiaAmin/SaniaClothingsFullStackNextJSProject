import { NextResponse } from 'next/server';

// Auth enforcement is bypassed for UI review — no backend connected yet.
// To re-enable, restore the cookie-check logic below and wrap admin routes
// in <AuthGuard> again (src/app/(admin)/layout.jsx).

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
