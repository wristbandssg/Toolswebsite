import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateInternalLinkSuggestions } from "@/lib/internal-linking/suggest";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const created = await generateInternalLinkSuggestions();
  return NextResponse.json({ created });
}
