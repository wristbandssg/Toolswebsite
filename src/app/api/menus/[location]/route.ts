import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MENU_LOCATIONS } from "@/lib/menu/types";

const menuItemSchema: z.ZodType<{
  id: string;
  label: string;
  href: string;
  children: unknown[];
}> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    href: z.string(),
    children: z.array(menuItemSchema),
  })
);

const putSchema = z.object({
  structure: z.array(menuItemSchema),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ location: string }> }) {
  const { location } = await params;
  if (!MENU_LOCATIONS.includes(location as (typeof MENU_LOCATIONS)[number])) {
    return NextResponse.json({ error: "Unknown menu location" }, { status: 400 });
  }
  const menu = await prisma.menu.findUnique({ where: { location } });
  return NextResponse.json({ menu: menu ?? { location, structure: "[]" } });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ location: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { location } = await params;
  if (!MENU_LOCATIONS.includes(location as (typeof MENU_LOCATIONS)[number])) {
    return NextResponse.json({ error: "Unknown menu location" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Form validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const menu = await prisma.menu.upsert({
    where: { location },
    update: { structure: JSON.stringify(parsed.data.structure) },
    create: { location, structure: JSON.stringify(parsed.data.structure) },
  });

  return NextResponse.json({ menu });
}
