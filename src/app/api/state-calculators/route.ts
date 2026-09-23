import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const createSchema = z.object({
  stateName: z.string().trim().min(1, "State name is required"),
  abbreviation: z
    .string()
    .trim()
    .min(1, "Abbreviation is required")
    .max(4, "Abbreviation should be short, e.g. \"AL\" or \"DC\"")
    .transform((s) => s.toUpperCase()),
  toolSlug: z.string().trim().min(1).nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const links = await prisma.stateCalculatorLink.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ links });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid state calculator entry" },
      { status: 400 }
    );
  }
  const { stateName, abbreviation, toolSlug } = parsed.data;

  const existing = await prisma.stateCalculatorLink.findUnique({ where: { abbreviation } });
  if (existing) {
    return NextResponse.json(
      { error: `"${abbreviation}" is already in the list.` },
      { status: 409 }
    );
  }

  if (toolSlug) {
    const tool = await prisma.tool.findUnique({ where: { slug: toolSlug } });
    if (!tool) {
      return NextResponse.json({ error: "No tool with that slug exists." }, { status: 400 });
    }
  }

  const maxOrder = await prisma.stateCalculatorLink.aggregate({ _max: { order: true } });
  const link = await prisma.stateCalculatorLink.create({
    data: {
      stateName,
      abbreviation,
      toolSlug: toolSlug ?? null,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
  return NextResponse.json({ link }, { status: 201 });
}
