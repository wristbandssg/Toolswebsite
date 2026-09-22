import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchGscSites } from "@/lib/gsc";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const sites = await fetchGscSites();
  return NextResponse.json({ sites });
}
