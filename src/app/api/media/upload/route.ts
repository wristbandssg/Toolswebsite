import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// MVP image upload: no external object storage (S3/Cloudinary) is wired up
// yet, so the file is stored as a base64 data URI directly on the Media
// document. This works fine for typical blog/featured images but is capped
// well under MongoDB's 16MB document limit. A future Media Library phase
// can swap this for real cloud storage without changing the Media model.
const MAX_BYTES = 4 * 1024 * 1024; // 4MB

// Raster formats only — SVG is deliberately excluded even though it starts
// with "image/", since an SVG can carry embedded <script>/event-handler
// content (Section 18: Security).
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, or GIF images are allowed" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be smaller than 4MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

  const media = await prisma.media.create({
    data: {
      url: dataUri,
      altText: file.name,
      uploadedBy: (session.user as { id?: string }).id,
    },
  });

  return NextResponse.json({ media }, { status: 201 });
}
