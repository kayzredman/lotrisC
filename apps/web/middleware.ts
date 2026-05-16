import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/', '/login(.*)', '/sign-up(.*)', '/api/dev-login(.*)', '/monitor(.*)', '/request(.*)', '/request-access(.*)']);

export default clerkMiddleware(async (auth, request) => {
  const url = new URL(request.url);

  // Clerk invite links land with ?__clerk_ticket=... on whatever redirectUrl was set.
  // If the ticket arrives on any route other than /sign-up (and not the dev-login API), redirect there preserving all params.
  if (
    url.searchParams.has('__clerk_ticket') &&
    !url.pathname.startsWith('/sign-up') &&
    !url.pathname.startsWith('/api/dev-login') &&
    !url.pathname.startsWith('/login')
  ) {
    const signUpUrl = new URL('/sign-up', request.url);
    for (const [key, value] of url.searchParams.entries()) {
      signUpUrl.searchParams.set(key, value);
    }
    return NextResponse.redirect(signUpUrl);
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
