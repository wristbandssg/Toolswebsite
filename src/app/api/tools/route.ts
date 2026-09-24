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
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  title: z.string().min(1),
  description: z.string().optional(),
  templateKey: z.string().default("tool-template-1"),
  status: z.enum(["draft", "in_review", "published", "needs_update"]).default("draft"),
  categoryId: z.string().optional().nullable(),
  // Shows a "POPULAR" badge on this tool's card on its category page — see
  // Tool.isPopular in schema.prisma.
  isPopular: z.boolean().optional().default(false),
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
  // Multi-line breakdown result — see Tool.calcResults. Optional; when
  // provided (non-empty), the public page shows a full breakdown instead of
  // the single calcResult number.
  calcResults: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        unit: z.string().optional(),
        format: z.enum(["number", "currency", "percentage"]).optional(),
        highlight: z.boolean().optional(),
      })
    )
    .optional()
    .nullable(),
  instructions: z.string().optional().nullable(),
  examples: z.string().optional().nullable(),
  assumptions: z.string().optional().nullable(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
  // SEO for this tool's own public page — set inline on the same form, no
  // separate SEO Manager visit needed. Optional so older callers that don't
  // send it still work.
  seo: z
    .object({
      metaTitle: z.string().optional().nullable(),
      metaDescription: z.string().optional().nullable(),
      canonicalUrl: z.string().optional().nullable(),
      robotsIndex: z.boolean().optional().default(true),
      schemaType: z.string().optional().nullable(),
    })
    .optional(),
});

export async function GET() {
  // Admin-only: this returns every Tool regardless of status (including
  // drafts), so it must not be reachable without a session.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const tools = await prisma.tool.findMany({
    orderBy: { updatedAt: "desc" },
    include: { category: true },
  });
  return NextResponse.json({ tools });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = toolCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Form validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const existing = await prisma.tool.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return NextResponse.json({ error: "This slug is already in use" }, { status: 409 });
  }

  const tool = await prisma.tool.create({
    data: {
      slug: data.slug,
      title: data.title,
      description: data.description,
      templateKey: data.templateKey,
      status: data.status,
      categoryId: data.categoryId ?? undefined,
      isPopular: data.isPopular ?? false,
      calcType: data.calcType,
      calcFormula: data.calcFormula,
      calcInputs: JSON.stringify(data.calcInputs),
      calcResult: data.calcResult ? JSON.stringify(data.calcResult) : null,
      calcResults: data.calcResults && data.calcResults.length > 0 ? JSON.stringify(data.calcResults) : null,
      instructions: data.instructions,
      examples: data.examples,
      assumptions: data.assumptions,
      faq: JSON.stringify(data.faq),
      // Only attached when the form actually sent SEO data — nested create
      // of the one-to-one SeoMeta row via its Tool.seoMeta back-relation.
      ...(data.seo
        ? {
            seoMeta: {
              create: {
                contentType: "tool",
                metaTitle: data.seo.metaTitle || null,
                metaDescription: data.seo.metaDescription || null,
                canonicalUrl: data.seo.canonicalUrl || null,
                robotsIndex: data.seo.robotsIndex ?? true,
                schemaType: data.seo.schemaType || null,
              },
            },
          }
        : {}),
    },
  });

  return NextResponse.json({ tool }, { status: 201 });
}
