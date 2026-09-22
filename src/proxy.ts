import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/** Guards every /admin route except the login page itself. */
export default auth((req) => {
  const isLoginPage = req.nextUrl.pathname === "/admin/login";
  const isLoggedIn = !!req.auth;

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/admin/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
