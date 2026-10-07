import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const contentSchema = z.object({ content: z.string() });

/** Saves a category's long-form content (rich text HTML) shown under its post list on the public page. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = contentSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid content" }, { status: 400 });
  }
  const existing = await prisma.blogCategory.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  // An editor left with only empty paragraphs counts as no content.
  const html = parsed.data.content.trim();
  const isEmpty = html.replace(/<[^>]*>|&nbsp;|\s/g, "") === "" && !/<img\b/i.test(html);
  await prisma.blogCategory.update({ where: { id }, data: { content: isEmpty ? null : html } });
  return NextResponse.json({ ok: true });
}
