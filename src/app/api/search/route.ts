import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public calculator search for the home page search box: up to 8 published
// tools whose title contains the query (case-insensitive). Read-only and
// returns only slug + title, so it needs no auth.
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ results: [] });

  const results = await prisma.tool.findMany({
    where: { status: "published", title: { contains: q, mode: "insensitive" } },
    orderBy: [{ isPopular: "desc" }, { title: "asc" }],
    take: 8,
    select: { slug: true, title: true },
  });

  return NextResponse.json({ results });
}
