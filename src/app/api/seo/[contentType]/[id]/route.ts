import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SEO_CONTENT_TYPES, type SeoContentType } from "@/lib/seo";

const seoSchema = z.object({
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  canonicalUrl: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  robotsIndex: z.boolean().default(true),
  schemaType: z.string().optional().nullable(),
});

function whereFor(contentType: SeoContentType, id: string) {
  if (contentType === "tool") return { toolId: id };
  if (contentType === "blog") return { blogId: id };
  if (contentType === "category") return { categoryId: id };
  return { pageId: id };
}

function createDataFor(contentType: SeoContentType, id: string) {
  if (contentType === "tool") return { toolId: id };
  if (contentType === "blog") return { blogId: id };
  if (contentType === "category") return { categoryId: id };
  return { pageId: id };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contentType: string; id: string }> }
) {
  const { contentType, id } = await params;
  if (!SEO_CONTENT_TYPES.includes(contentType as SeoContentType)) {
    return NextResponse.json({ error: "Unknown content type" }, { status: 400 });
  }
  const seoMeta = await prisma.seoMeta.findFirst({
    where: whereFor(contentType as SeoContentType, id),
  });
  return NextResponse.json({ seoMeta });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ contentType: string; id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { contentType, id } = await params;
  if (!SEO_CONTENT_TYPES.includes(contentType as SeoContentType)) {
    return NextResponse.json({ error: "Unknown content type" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = seoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Form validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const type = contentType as SeoContentType;

  // Wrapped in try/catch (instead of letting a Prisma error bubble up into
  // Next.js's generic 500 HTML page) so the real database error reaches the
  // admin UI instead of a bare "server error (500)" with no way to tell
  // what's actually wrong — e.g. a stale Prisma Client that doesn't know
  // about the `categoryId` field yet because `npx prisma db push` /
  // `npx prisma generate` hasn't been run locally since the schema changed.
  try {
    const existing = await prisma.seoMeta.findFirst({ where: whereFor(type, id) });

    const seoMeta = existing
      ? await prisma.seoMeta.update({
          where: { id: existing.id },
          data: {
            contentType: type,
            metaTitle: data.metaTitle || null,
            metaDescription: data.metaDescription || null,
            canonicalUrl: data.canonicalUrl || null,
            ogImage: data.ogImage || null,
            robotsIndex: data.robotsIndex,
            schemaType: data.schemaType || null,
          },
        })
      : await prisma.seoMeta.create({
          data: {
            contentType: type,
            metaTitle: data.metaTitle || null,
            metaDescription: data.metaDescription || null,
            canonicalUrl: data.canonicalUrl || null,
            ogImage: data.ogImage || null,
            robotsIndex: data.robotsIndex,
            schemaType: data.schemaType || null,
            ...createDataFor(type, id),
          },
        });

    return NextResponse.json({ seoMeta });
  } catch (err) {
    console.error(`[api/seo/${contentType}/${id}] PUT failed:`, err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Could not save: ${err.message}`
            : "Could not save the SEO settings — unknown server error.",
      },
      { status: 500 }
    );
  }
}
