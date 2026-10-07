import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSeoTool } from "@/lib/seo-tools/registry";
import { RUNNERS } from "@/lib/seo-tools/runners";
import { ToolInputError } from "@/lib/seo-tools/runners/util";
import { FetchPageError } from "@/lib/seo-tools/fetch-page";
import type { ToolInput } from "@/lib/seo-tools/types";

// Runs one SEO tool (Admin → Marketing → SEO Tools). Admin only.
export const maxDuration = 300;

export async function POST(req: NextRequest, { params }: { params: Promise<{ toolId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { toolId } = await params;
  const tool = getSeoTool(toolId);
  const run = RUNNERS[toolId];
  if (!tool || !run) return NextResponse.json({ error: "Unknown tool" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { input?: ToolInput } | null;
  const input: ToolInput = {};
  // Only the tool's own fields are passed on, each capped in size.
  for (const field of tool.fields) {
    const v = body?.input?.[field.name];
    if (v === undefined || v === null) continue;
    input[field.name] = typeof v === "string" ? v.slice(0, field.type === "csv" ? 3_000_000 : 200_000) : v;
  }

  try {
    const report = await run(input);
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof ToolInputError || err instanceof FetchPageError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(`[api/seo-tools/${toolId}]`, err);
    return NextResponse.json({ error: "The tool failed — please try again." }, { status: 500 });
  }
}
