import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { categoryPageSchema, saveCategoryPageSettings } from "@/lib/category-page-config";

// Category page card counts (edited at /admin/tools/categories).
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const parsed = categoryPageSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter whole numbers (sub-categories 1–200, calculators 1–1000)." }, { status: 400 });
  }
  await saveCategoryPageSettings(parsed.data);
  return NextResponse.json({ settings: parsed.data });
}
