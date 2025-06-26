import { authMiddleware } from "@clerk/nextjs";
import createIntlMiddleware from "next-intl/middleware";

const intlMiddleware = createIntlMiddleware({
  locales: ["en", "es", "pt"],
  defaultLocale: "en",
});

export default authMiddleware({
  // Run the intl middleware before auth
  beforeAuth: (req) => {
    return intlMiddleware(req);
  },

  // Public routes that don't require authentication
  publicRoutes: [
    "/",
    "/en",
    "/es",
    "/pt",
    "/en/sign-in(.*)",
    "/es/sign-in(.*)",
    "/pt/sign-in(.*)",
    "/en/sign-up(.*)",
    "/es/sign-up(.*)",
    "/pt/sign-up(.*)",
    "/api/webhooks(.*)",
    "/api/clerk-webhook(.*)",
  ],

  // Routes that should redirect to sign-in if not authenticated
  afterAuth(auth, req) {
    const { pathname } = req.nextUrl;

    // If user is not signed in and trying to access protected route
    if (!auth.userId && isProtectedRoute(pathname)) {
      const locale = getLocaleFromPath(pathname);
      const signInUrl = new URL(`/${locale}/sign-in`, req.url);
      return Response.redirect(signInUrl);
    }

    // If user is signed in and trying to access auth pages, redirect to dashboard
    if (auth.userId && isAuthRoute(pathname)) {
      const locale = getLocaleFromPath(pathname);
      const dashboardUrl = new URL(`/${locale}/dashboard`, req.url);
      return Response.redirect(dashboardUrl);
    }
  },
});

function isProtectedRoute(pathname: string): boolean {
  return (
    pathname.includes("/dashboard") ||
    pathname.includes("/bots") ||
    pathname.includes("/analytics") ||
    pathname.includes("/settings") ||
    pathname.includes("/trades") ||
    pathname.includes("/broker-credentials")
  );
}

function isAuthRoute(pathname: string): boolean {
  return pathname.includes("/sign-in") || pathname.includes("/sign-up");
}

function getLocaleFromPath(pathname: string): string {
  const segments = pathname.split("/");
  const locale = segments[1];
  return ["en", "es", "pt"].includes(locale) ? locale : "en";
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
