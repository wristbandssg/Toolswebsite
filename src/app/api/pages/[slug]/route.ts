import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  // Admin-only: returns the page regardless of status — the public site
  // reads published pages straight from Prisma with its own status filter.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { slug } = await params;
  const page = await prisma.page.findUnique({
    where: { slug },
    include: { seoMeta: true },
  });
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  return NextResponse.json({ page });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { slug } = await params;
  const body = await req.json();

  const existing = await prisma.page.findUnique({ where: { slug } });
  if (!existing) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const page = await prisma.page.update({
    where: { slug },
    data: {
      title: body.title ?? existing.title,
      templateKey: body.templateKey ?? existing.templateKey,
      sections: body.sections ? JSON.stringify(body.sections) : existing.sections,
      status: body.status ?? existing.status,
    },
  });

  return NextResponse.json({ page });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { slug } = await params;
  await prisma.page.delete({ where: { slug } });
  return NextResponse.json({ ok: true });
}
