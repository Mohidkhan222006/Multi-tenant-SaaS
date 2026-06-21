import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isOnboarding = req.nextUrl.pathname.startsWith('/onboarding');

    // Redirect authenticated users without an organization to onboarding
    if (isAuth && !token.organizationId && !isOnboarding) {
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }

    // Redirect authenticated users with an organization trying to visit onboarding
    if (isAuth && token.organizationId && isOnboarding) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/projects/:path*',
    '/settings/:path*',
    '/onboarding/:path*',
    '/api/projects/:path*',
    '/api/tasks/:path*',
  ],
};
