import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { pageSectionsSchema } from "@/lib/templates/page/schema";
import { pageSlugError } from "@/lib/url-changes";


const pageSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  title: z.string().min(1),
  templateKey: z.string().default("page-template-1"),
  sections: pageSectionsSchema.default([]),
  status: z.enum(["draft", "in_review", "published", "needs_update"]).default("draft"),
});

export async function GET() {
  // Admin-only: this returns every Page regardless of status (including
  // drafts), so it must not be reachable without a session.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const pages = await prisma.page.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ pages });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = pageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Form validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const slugError = await pageSlugError(data.slug);
  if (slugError) return NextResponse.json({ error: slugError }, { status: 409 });

  const existing = await prisma.page.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return NextResponse.json({ error: "This slug is already in use" }, { status: 409 });
  }

  const page = await prisma.page.create({
    data: {
      slug: data.slug,
      title: data.title,
      templateKey: data.templateKey,
      sections: JSON.stringify(data.sections),
      status: data.status,
    },
  });

  return NextResponse.json({ page }, { status: 201 });
}
