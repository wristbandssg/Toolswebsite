import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { setGscSiteUrl } from "@/lib/gsc";

const schema = z.object({ siteUrl: z.string().min(1) });

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A site URL is required" }, { status: 400 });
  }
  await setGscSiteUrl(parsed.data.siteUrl);
  return NextResponse.json({ ok: true });
}
