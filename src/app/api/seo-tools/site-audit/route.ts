import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { runSiteAudit } from "@/lib/seo-tools/site-audit";
import { FetchPageError } from "@/lib/seo-tools/fetch-page";

// Admin → Marketing → SEO Tools → Site Audit.
const bodySchema = z.object({
  url: z.string().trim().min(1, "Enter a URL to audit"),
  keyword: z.string().trim().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  try {
    const result = await runSiteAudit(parsed.data.url, parsed.data.keyword);
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof FetchPageError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[api/seo-tools/site-audit]", err);
    return NextResponse.json({ error: "The audit failed — please try again." }, { status: 500 });
  }
}
