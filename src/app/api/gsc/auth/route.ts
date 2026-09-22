import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSiteUrl } from "@/lib/seo";

export async function GET() {
  const session = await auth();
  const siteUrl = getSiteUrl();
  if (!session?.user) {
    return NextResponse.redirect(`${siteUrl}/admin/login`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${siteUrl}/admin/search-console?error=not_configured`);
  }

  const redirectUri = `${siteUrl}/api/gsc/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
