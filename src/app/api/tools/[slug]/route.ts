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

  // Slug (URL) rename — optional. `slug` here is the OLD slug (from the
  // route param, used to find the row); `body.slug` is what the admin form
  // now wants it to be, which may be unchanged. Validate format and
  // uniqueness before touching anything, since a slug change is a live URL
  // change (old links to the previous URL will 404 after this).
  let newSlug = existing.slug;
  if (typeof body.slug === "string" && body.slug !== existing.slug) {
    if (!/^[a-z0-9-]+$/.test(body.slug)) {
      return NextResponse.json(
        { error: "Slug can only contain lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }
    const clash = await prisma.tool.findUnique({ where: { slug: body.slug } });
    if (clash) {
      return NextResponse.json({ error: "This slug is already in use" }, { status: 409 });
    }
    newSlug = body.slug;
  }

  const tool = await prisma.tool.update({
    where: { slug },
    data: {
      slug: newSlug,
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      templateKey: body.templateKey ?? existing.templateKey,
      status: body.status ?? existing.status,
      categoryId: body.categoryId ?? existing.categoryId,
      // Only touched when explicitly present so older callers that don't
      // send this field at all leave it untouched.
      ...(typeof body.isPopular === "boolean" ? { isPopular: body.isPopular } : {}),
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
      assumptions: body.assumptions ?? existing.assumptions,
      faq: body.faq ? JSON.stringify(body.faq) : existing.faq,
      // SEO — edited inline on this same form and saved together with
      // everything else. Only touched when the request actually includes a
      // `seo` object; upsert since the tool may or may not have a SeoMeta
      // row yet (e.g. one created before this feature existed).
      ...(body.seo && typeof body.seo === "object"
        ? {
            seoMeta: {
              upsert: {
                create: {
                  contentType: "tool",
                  metaTitle: body.seo.metaTitle || null,
                  metaDescription: body.seo.metaDescription || null,
                  canonicalUrl: body.seo.canonicalUrl || null,
                  robotsIndex: typeof body.seo.robotsIndex === "boolean" ? body.seo.robotsIndex : true,
                  schemaType: body.seo.schemaType || null,
                },
                update: {
                  metaTitle: body.seo.metaTitle || null,
                  metaDescription: body.seo.metaDescription || null,
                  canonicalUrl: body.seo.canonicalUrl || null,
                  robotsIndex: typeof body.seo.robotsIndex === "boolean" ? body.seo.robotsIndex : true,
                  schemaType: body.seo.schemaType || null,
                },
              },
            },
          }
        : {}),
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

  // StateCalculatorLink.toolSlug is a plain string, not a relation, so
  // deleting the Tool row above doesn't touch it — without this, a deleted
  // state tax tool would leave its row in the "Other State Calculators"
  // grid pointing at a now-404ing URL instead of reverting to "not built
  // yet". Clear it back to null (same as a state that never had a tool).
  await prisma.stateCalculatorLink.updateMany({
    where: { toolSlug: slug },
    data: { toolSlug: null },
  });
  return NextResponse.json({ ok: true });
}
