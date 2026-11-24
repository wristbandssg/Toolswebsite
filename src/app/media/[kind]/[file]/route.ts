import { prisma } from "@/lib/prisma";
import { getSiteGeneralSettings } from "@/lib/site-config";
import { decodeDataUri, IMAGE_KINDS, type ImageKind } from "@/lib/image-urls";

// Serves an image that is stored in the database as base64 text as a normal
// image file, e.g. /media/author/jane-doe.jpg (see src/lib/image-urls.ts).
// Only images that public pages already show can be fetched here.

async function storedImage(kind: ImageKind, key: string): Promise<string | null | undefined> {
  switch (kind) {
    case "author":
      return (await prisma.author.findUnique({ where: { slug: key }, select: { photo: true } }))?.photo;
    case "blog": {
      const blog = await prisma.blog.findUnique({ where: { slug: key }, select: { featuredImage: true, status: true } });
      return blog?.status === "published" ? blog.featuredImage : null;
    }
    case "blog-share": {
      const blog = await prisma.blog.findUnique({
        where: { slug: key },
        select: { status: true, featuredImage: true, seoMeta: { select: { ogImage: true } } },
      });
      return blog?.status === "published" ? blog.seoMeta?.ogImage || blog.featuredImage : null;
    }
    case "site-logo":
      return (await getSiteGeneralSettings()).logoUrl;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; file: string }> }) {
  const { kind, file } = await params;
  const dot = file.lastIndexOf(".");
  if (!(IMAGE_KINDS as readonly string[]).includes(kind) || dot <= 0) return new Response("Not found", { status: 404 });

  const image = decodeDataUri(await storedImage(kind as ImageKind, decodeURIComponent(file.slice(0, dot))));
  if (!image || image.ext !== file.slice(dot + 1)) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.body), {
    headers: {
      "Content-Type": image.type,
      "Content-Length": String(image.body.length),
      // The page links carry ?v=<hash of the image>, so a changed image gets a new URL.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
