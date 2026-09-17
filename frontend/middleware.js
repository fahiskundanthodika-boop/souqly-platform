// Next.js middleware - runs before every page load
// Protects /dashboard routes - redirects to login if not logged in
import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('souqly_token')?.value;
  const { pathname } = request.nextUrl;

  // If trying to access dashboard without a token → redirect to login
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If already logged in and visiting login/signup → redirect to dashboard
  if ((pathname === '/login' || pathname === '/signup') && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Only run middleware on these paths
export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
