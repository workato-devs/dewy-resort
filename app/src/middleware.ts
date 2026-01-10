/**
 * Next.js Middleware for route protection
 * Protects guest and manager routes based on user role
 * 
 * Note: This middleware performs basic session validation.
 * Full authentication and role checking is done in the layout components.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get session cookie
  const sessionCookie = request.cookies.get('hotel_session');
  
  // Check if accessing protected routes
  const isGuestRoute = pathname.startsWith('/guest');
  const isManagerRoute = pathname.startsWith('/manager');
  
  if (!isGuestRoute && !isManagerRoute) {
    return NextResponse.next();
  }
  
  // If no session, redirect to login
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Session exists, allow the request to proceed
  // Role-based validation will be handled by the layout components
  return NextResponse.next();
}

export const config = {
  matcher: ['/guest/:path*', '/manager/:path*'],
};
