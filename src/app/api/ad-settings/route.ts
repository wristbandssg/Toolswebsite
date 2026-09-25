import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { AD_PLACEMENTS, getAdSettings, saveAdSettings } from "@/lib/ad-settings";

// GET is intentionally public — every public page's <AdSlot> reads this on
// every render (same pattern as /api/settings for the general site config).
export async function GET() {
  const settings = await getAdSettings();
  return NextResponse.json({ settings });
}

const placementSchema = z.object({
  enabled: z.boolean(),
  network: z.enum(["adsterra", "adsense", "other", "none"]),
  code: z.string(),
});

const schema = z.record(z.string(), placementSchema);

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
  // Only ever persist the placements this app actually knows about — a
  // stray/renamed key in the submitted body is silently dropped rather than
  // stored forever.
  const knownKeys = new Set(AD_PLACEMENTS.map((p) => p.key));
  const filtered = Object.fromEntries(
    Object.entries(parsed.data).filter(([key]) => knownKeys.has(key))
  );
  await saveAdSettings(filtered);
  return NextResponse.json({ settings: filtered });
}
