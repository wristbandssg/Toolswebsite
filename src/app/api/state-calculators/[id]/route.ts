import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const updateSchema = z.object({
  stateName: z.string().trim().min(1, "State name is required").optional(),
  abbreviation: z
    .string()
    .trim()
    .min(1, "Abbreviation is required")
    .max(4, "Abbreviation should be short, e.g. \"AL\" or \"DC\"")
    .transform((s) => s.toUpperCase())
    .optional(),
  // Explicit null clears the link (state has no tool yet / no longer does);
  // omitting the key leaves it untouched.
  toolSlug: z.string().trim().min(1).nullable().optional(),
  order: z.number().int().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid state calculator entry" },
      { status: 400 }
    );
  }
  const { stateName, abbreviation, toolSlug, order } = parsed.data;

  if (abbreviation) {
    const clashing = await prisma.stateCalculatorLink.findUnique({ where: { abbreviation } });
    if (clashing && clashing.id !== id) {
      return NextResponse.json(
        { error: `"${abbreviation}" is already used by another entry.` },
        { status: 409 }
      );
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "toolSlug") && toolSlug) {
    const tool = await prisma.tool.findUnique({ where: { slug: toolSlug } });
    if (!tool) {
      return NextResponse.json({ error: "No tool with that slug exists." }, { status: 400 });
    }
  }

  const link = await prisma.stateCalculatorLink.update({
    where: { id },
    data: {
      ...(stateName !== undefined ? { stateName } : {}),
      ...(abbreviation !== undefined ? { abbreviation } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "toolSlug") ? { toolSlug: toolSlug ?? null } : {}),
      ...(order !== undefined ? { order } : {}),
    },
  });
  return NextResponse.json({ link });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.stateCalculatorLink.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
