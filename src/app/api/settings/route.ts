import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getSiteGeneralSettings, saveSiteGeneralSettings } from "@/lib/site-config";

// GET is intentionally public — the public site header/footer/metadata read
// these settings on every page render.
export async function GET() {
  const settings = await getSiteGeneralSettings();
  return NextResponse.json({ settings });
}

const schema = z.object({
  siteName: z.string().min(1),
  siteDescription: z.string().optional().default(""),
  logoUrl: z.string().optional().default(""),
  contactEmail: z.string().optional().default(""),
});

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Form validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  await saveSiteGeneralSettings(parsed.data);
  return NextResponse.json({ settings: parsed.data });
}
