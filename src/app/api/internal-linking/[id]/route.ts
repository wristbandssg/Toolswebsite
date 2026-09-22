import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const patchSchema = z.object({
  status: z.enum(["suggested", "approved", "rejected"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Form validation failed" }, { status: 400 });
  }

  const existing = await prisma.internalLinkSuggestion.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });

  const suggestion = await prisma.internalLinkSuggestion.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ suggestion });
}
