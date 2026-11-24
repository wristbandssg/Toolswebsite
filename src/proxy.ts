import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { publicRedirectTarget } from "@/lib/public-redirects";
import { getSiteUrl } from "@/lib/seo";

/**
 * Runs before every page request (not /api, /_next or files):
 *  - /admin: requires a login, except the login page itself.
 *  - public pages: one 301 to the right URL when needed — old /tools/ and
 *    /pages/ URLs, renamed pages, uppercase, or a missing trailing slash
 *    (see src/lib/public-redirects.ts). next.config.ts turns off Next.js'
 *    own trailing-slash redirect (a 308) so this is the only redirect.
 *  - any other host (www vs no-www, the *.onrender.com address): a 301 to
 *    the same page on the one public host from NEXTAUTH_URL, so search
 *    engines only ever see one copy of each page. Local and bare-IP hosts
 *    (local runs, the platform's internal checks) are left alone.
 */
const isLocal = (host: string) => /^(localhost|\[::1\]|\d+\.\d+\.\d+\.\d+)(:\d+)?$/.test(host);
const siteUrl = getSiteUrl();
const siteHost = new URL(siteUrl).host;

export default auth(async (req) => {
  const { pathname, search } = req.nextUrl;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  if (process.env.NODE_ENV === "production" && host && host !== siteHost && !isLocal(host) && !isLocal(siteHost)) {
    // Fix the path in the same hop, so it is still one redirect.
    const path = !isAdmin && (req.method === "GET" || req.method === "HEAD") ? ((await publicRedirectTarget(pathname)) ?? pathname) : pathname;
    return NextResponse.redirect(`${siteUrl}${path}${search}`, 301);
  }

  if (isAdmin) {
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
