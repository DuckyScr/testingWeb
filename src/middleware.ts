import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth-token');
  const { pathname } = request.nextUrl;

  // Check if the user is trying to access a protected route
  if (pathname.startsWith('/dashboard')) {
    // If no auth token is present, redirect to login
    if (!authToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // If user is logged in and trying to access login page, redirect to dashboard
  if (pathname === '/login' && authToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};