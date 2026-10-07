import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { authorSchema } from "@/lib/author-schema";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.author.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Author not found" }, { status: 404 });

  const parsed = authorSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid author" }, { status: 400 });
  }
  const { expertise, ...data } = parsed.data;

  if (data.slug !== existing.slug) {
    const clash = await prisma.author.findUnique({ where: { slug: data.slug } });
    if (clash) return NextResponse.json({ error: "This slug is already in use" }, { status: 409 });
  }

  if (data.isDefault && !existing.isDefault) {
    await prisma.author.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  const author = await prisma.author.update({
    where: { id },
    data: { ...data, expertise: JSON.stringify(expertise) },
  });
  return NextResponse.json({ author });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { id } = await params;

  // Posts/calculators credited to this author fall back to the default
  // author instead of pointing at a deleted row.
  await Promise.all([
    prisma.blog.updateMany({ where: { authorProfileId: id }, data: { authorProfileId: null } }),
    prisma.tool.updateMany({ where: { authorProfileId: id }, data: { authorProfileId: null } }),
  ]);
  await prisma.author.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
