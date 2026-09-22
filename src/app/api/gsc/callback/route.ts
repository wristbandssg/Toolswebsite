import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSiteUrl } from "@/lib/seo";
import { saveGscTokens } from "@/lib/gsc";

export async function GET(req: NextRequest) {
  const session = await auth();
  const siteUrl = getSiteUrl();
  if (!session?.user) {
    return NextResponse.redirect(`${siteUrl}/admin/login`);
  }

  const code = req.nextUrl.searchParams.get("code");
  const errorParam = req.nextUrl.searchParams.get("error");
  if (errorParam || !code) {
    return NextResponse.redirect(`${siteUrl}/admin/search-console?error=denied`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${siteUrl}/admin/search-console?error=not_configured`);
  }

  const redirectUri = `${siteUrl}/api/gsc/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${siteUrl}/admin/search-console?error=token_exchange_failed`);
    }

    const data = await tokenRes.json();
    await saveGscTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expiry_date: Date.now() + data.expires_in * 1000,
    });
  } catch {
    return NextResponse.redirect(`${siteUrl}/admin/search-console?error=token_exchange_failed`);
  }

  return NextResponse.redirect(`${siteUrl}/admin/search-console?connected=1`);
}
