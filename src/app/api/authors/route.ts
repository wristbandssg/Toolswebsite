import { NextRequest, NextResponse } from "next/server";
import { authorSchema } from "@/lib/author-schema";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const authors = await prisma.author.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ authors });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const parsed = authorSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid author" }, { status: 400 });
  }
  const { expertise, ...data } = parsed.data;

  if (await prisma.author.findUnique({ where: { slug: data.slug } })) {
    return NextResponse.json({ error: "This slug is already in use" }, { status: 409 });
  }

  // The very first author becomes the default automatically, so the bio box
  // shows up on existing posts/calculators without editing each one.
  const isFirst = (await prisma.author.count()) === 0;
  const isDefault = data.isDefault || isFirst;
  if (isDefault) await prisma.author.updateMany({ where: { isDefault: true }, data: { isDefault: false } });

  const author = await prisma.author.create({
    data: { ...data, isDefault, expertise: JSON.stringify(expertise) },
  });
  return NextResponse.json({ author }, { status: 201 });
}
