import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const calcInputFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["number", "percentage", "currency", "dropdown", "date", "slider"]),
  unit: z.string().optional(),
  required: z.boolean().optional(),
  default: z.union([z.number(), z.string()]).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  options: z.array(z.object({ label: z.string(), value: z.union([z.string(), z.number()]) })).optional(),
});

const toolCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug-এ শুধু ছোট হাতের অক্ষর, সংখ্যা ও হাইফেন ব্যবহার করুন"),
  title: z.string().min(1),
  description: z.string().optional(),
  templateKey: z.string().default("tool-template-1"),
  status: z.enum(["draft", "in_review", "published", "needs_update"]).default("draft"),
  categoryId: z.string().optional().nullable(),
  calcType: z.enum(["expression", "custom"]).default("expression"),
  calcFormula: z.string().optional().nullable(),
  calcInputs: z.array(calcInputFieldSchema).default([]),
  calcResult: z
    .object({
      label: z.string(),
      unit: z.string().optional(),
      format: z.enum(["number", "currency", "percentage"]).optional(),
    })
    .optional()
    .nullable(),
  instructions: z.string().optional().nullable(),
  examples: z.string().optional().nullable(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
});

export async function GET() {
  const tools = await prisma.tool.findMany({
    orderBy: { updatedAt: "desc" },
    include: { category: true },
  });
  return NextResponse.json({ tools });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login প্রয়োজন" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = toolCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Form Validation ব্যর্থ", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const existing = await prisma.tool.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return NextResponse.json({ error: "এই Slug ইতিমধ্যে ব্যবহৃত হয়েছে" }, { status: 409 });
  }

  const tool = await prisma.tool.create({
    data: {
      slug: data.slug,
      title: data.title,
      description: data.description,
      templateKey: data.templateKey,
      status: data.status,
      categoryId: data.categoryId ?? undefined,
      calcType: data.calcType,
      calcFormula: data.calcFormula,
      calcInputs: JSON.stringify(data.calcInputs),
      calcResult: data.calcResult ? JSON.stringify(data.calcResult) : null,
      instructions: data.instructions,
      examples: data.examples,
      faq: JSON.stringify(data.faq),
    },
  });

  return NextResponse.json({ tool }, { status: 201 });
}
