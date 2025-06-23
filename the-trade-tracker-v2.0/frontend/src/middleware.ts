import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";

// Define public routes for Clerk authentication
const isClerkPublicRoute = createRouteMatcher([
  "/",
  "/sign-in/(.*)",
  "/sign-up/(.*)",
  "/api/(.*)", // All API routes are public for Clerk (we handle auth in the routes themselves)
  `/:locale(${locales.join("|")})?`,
  `/:locale(${locales.join("|")})?/sign-in/(.*)`,
  `/:locale(${locales.join("|")})?/sign-up/(.*)`,
  `/:locale(${locales.join("|")})?/home`,
]);

// Create the internationalization middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always", // Always use locale prefix for consistency
});

// Main middleware combining Clerk and next-intl
const middleware = clerkMiddleware(
  (auth, request: NextRequest) => {
    const { pathname } = request.nextUrl;

    // Handle API routes - skip internationalization and Clerk middleware
    if (pathname.startsWith("/api/")) {
      console.log(`[Middleware] API route detected: ${pathname}. Passing through.`);
      return NextResponse.next();
    }

    // Handle root redirect - send to home page for all users
    if (pathname === "/") {
      return NextResponse.redirect(new URL(`/${defaultLocale}/home`, request.url));
    }

    // Handle locale-only paths (e.g., /en -> /en/home)
    if (locales.some((locale) => pathname === `/${locale}`)) {
      const locale = pathname.substring(1);
      return NextResponse.redirect(new URL(`/${locale}/home`, request.url));
    }

    // Apply Clerk authentication for protected routes
    if (!isClerkPublicRoute(request)) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Middleware] DEV mode: Route ${pathname} is protected but allowing access.`);
      } else {
        console.log(`[Middleware] Route ${pathname} is protected. Applying Clerk auth.`);
        const response = auth.protect();
        if (response instanceof NextResponse) {
          return response;
        }
      }
    }

    // Apply internationalization middleware for page routes
    console.log(`[Middleware] Applying next-intl middleware for: ${pathname}`);
    return intlMiddleware(request);
  },
  { debug: process.env.NODE_ENV === "development" }
);

export default middleware;

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|robots.txt|.*.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
