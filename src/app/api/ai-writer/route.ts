import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { isRateLimited } from "@/lib/rate-limit";
import { WriterError, WriterRequestSchema, writeBlog, writeTool } from "@/lib/ai-writer";

// A full page draft takes Claude one to a few minutes to write.
export const maxDuration = 300;

/**
 * POST /api/ai-writer — admin-only. Returns a draft (plus automatic QC
 * checks) for a calculator page or a blog post. It never saves anything:
 * the admin form fills its fields with the draft, and the admin reviews and
 * presses Save as usual.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  // Each draft costs real API money; cap accidental repeat clicks.
  if (isRateLimited(`ai-writer:${session.user.email ?? "admin"}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many drafts this hour. Please wait a bit." }, { status: 429 });
  }

  const parsed = WriterRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing title or page details." }, { status: 400 });
  }

  try {
    const result = parsed.data.kind === "tool" ? await writeTool(parsed.data) : await writeBlog(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof WriterError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "The ANTHROPIC_API_KEY is invalid." }, { status: 503 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "The AI service is busy. Try again in a minute." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("ai-writer API error", err.status, err.message);
      return NextResponse.json({ error: `AI service error (${err.status ?? "network"}). Try again.` }, { status: 502 });
    }
    console.error("ai-writer failed", err);
    return NextResponse.json({ error: "Writing failed. Try again." }, { status: 500 });
  }
}
