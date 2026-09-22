import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const patchSchema = z.object({ altText: z.string() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Form validation failed" }, { status: 400 });
  }

  const existing = await prisma.media.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Media not found" }, { status: 404 });

  const media = await prisma.media.update({
    where: { id },
    data: { altText: parsed.data.altText },
  });
  return NextResponse.json({ media });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.media.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Media not found" }, { status: 404 });

  await prisma.media.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
