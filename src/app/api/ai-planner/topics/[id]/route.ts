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

  const existing = await prisma.aiContentTopic.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  // Gate 1 (this phase): a topic can only move between suggested/approved/rejected here.
  // Gate 2 (moving to "generated") happens in the content-generation phase, not here.
  if (existing.status === "generated" || existing.status === "published") {
    return NextResponse.json(
      { error: "This topic already has generated content and can no longer be re-approved here." },
      { status: 409 }
    );
  }

  const topic = await prisma.aiContentTopic.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ topic });
}
