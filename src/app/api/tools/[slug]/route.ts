import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  // Admin-only: returns the tool regardless of status, including its
  // calculation formula — never expose this to unauthenticated requests.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { slug } = await params;
  const tool = await prisma.tool.findUnique({
    where: { slug },
    include: { category: true, seoMeta: true, blogRelations: { include: { blog: true } } },
  });
  if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  return NextResponse.json({ tool });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { slug } = await params;
  const body = await req.json();

  const existing = await prisma.tool.findUnique({ where: { slug } });
  if (!existing) return NextResponse.json({ error: "Tool not found" }, { status: 404 });

  const tool = await prisma.tool.update({
    where: { slug },
    data: {
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      templateKey: body.templateKey ?? existing.templateKey,
      status: body.status ?? existing.status,
      categoryId: body.categoryId ?? existing.categoryId,
      calcType: body.calcType ?? existing.calcType,
      calcFormula: body.calcFormula ?? existing.calcFormula,
      calcInputs: body.calcInputs ? JSON.stringify(body.calcInputs) : existing.calcInputs,
      calcResult: body.calcResult ? JSON.stringify(body.calcResult) : existing.calcResult,
      // `calcResults` is only touched when the request explicitly includes
      // the key — an empty array clears it back to single-output mode, and
      // omitting the key entirely (older callers) leaves it untouched.
      ...(Object.prototype.hasOwnProperty.call(body, "calcResults")
        ? {
            calcResults:
              Array.isArray(body.calcResults) && body.calcResults.length > 0
                ? JSON.stringify(body.calcResults)
                : null,
          }
        : {}),
      instructions: body.instructions ?? existing.instructions,
      examples: body.examples ?? existing.examples,
      faq: body.faq ? JSON.stringify(body.faq) : existing.faq,
    },
  });

  return NextResponse.json({ tool });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { slug } = await params;
  await prisma.tool.delete({ where: { slug } });
  return NextResponse.json({ ok: true });
}
