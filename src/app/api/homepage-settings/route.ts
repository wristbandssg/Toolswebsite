import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getHomepageSettings, homepageSchema, saveHomepageSettings } from "@/lib/homepage-config";

// Home page design + content settings (edited at /admin/homepage).
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  return NextResponse.json({ settings: await getHomepageSettings() });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const parsed = homepageSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Form validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  await saveHomepageSettings(parsed.data);
  return NextResponse.json({ settings: parsed.data });
}
