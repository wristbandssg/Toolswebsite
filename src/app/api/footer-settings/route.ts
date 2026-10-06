import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { footerSchema, saveFooterSettings } from "@/lib/footer-config";

// Footer colors and text (edited at /admin/footer-builder).
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const parsed = footerSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Form validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  await saveFooterSettings(parsed.data);
  return NextResponse.json({ settings: parsed.data });
}
