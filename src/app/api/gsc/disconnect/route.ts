import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { disconnectGsc } from "@/lib/gsc";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  await disconnectGsc();
  return NextResponse.json({ ok: true });
}
