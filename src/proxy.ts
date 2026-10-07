import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { publicRedirectTarget } from "@/lib/public-redirects";

/**
 * Runs before every page request (not /api, /_next or files):
 *  - /admin: requires a login, except the login page itself.
 *  - public pages: one 301 to the right URL when needed — old /tools/ and
 *    /pages/ URLs, renamed pages, uppercase, or a missing trailing slash
 *    (see src/lib/public-redirects.ts). next.config.ts turns off Next.js'
 *    own trailing-slash redirect (a 308) so this is the only redirect.
 */
export default auth(async (req) => {
  const { pathname, search } = req.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const isLoginPage = pathname === "/admin/login";
    if (!req.auth && !isLoginPage) {
      return NextResponse.redirect(new URL("/admin/login", req.nextUrl.origin));
    }
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") return;
  const target = await publicRedirectTarget(pathname);
  if (target) {
    // Built from the request URL, which carries the public https host on
    // Render (same as the admin login redirect above).
    return NextResponse.redirect(new URL(target + search, req.nextUrl.origin), 301);
  }
});

export const config = {
  // Everything except API routes, Next.js internals and files (paths with a dot).
  matcher: ["/((?!api/|_next/|.*\\.).*)"],
};
