import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { AI_PROVIDERS, clearAiConfig, getAiConfigPublic, saveAiConfig } from "@/lib/ai/provider";

// AI provider settings (Admin → Marketing → AI Settings). The key is never returned.
const schema = z.object({
  provider: z.enum(Object.keys(AI_PROVIDERS) as [keyof typeof AI_PROVIDERS, ...(keyof typeof AI_PROVIDERS)[]]),
  model: z.string().trim().max(120).default(""),
  embedModel: z.string().trim().max(120).default(""),
  baseUrl: z.string().trim().max(300).default(""),
  apiKey: z.string().trim().max(500).default(""),
});

async function guard() {
  const session = await auth();
  return session?.user ? null : NextResponse.json({ error: "Login required" }, { status: 401 });
}

export async function GET() {
  return (await guard()) ?? NextResponse.json({ config: await getAiConfigPublic() });
}

export async function PUT(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 400 });
  const d = parsed.data;
  if (d.provider === "custom" && !/^https:\/\//.test(d.baseUrl)) {
    return NextResponse.json({ error: "Enter the API's base URL (https://…/v1) for an OpenAI-compatible provider." }, { status: 400 });
  }
  const current = await getAiConfigPublic();
  if (!d.apiKey && !current.hasKey) return NextResponse.json({ error: "Enter the API key." }, { status: 400 });
  await saveAiConfig(d);
  return NextResponse.json({ config: await getAiConfigPublic() });
}

export async function DELETE() {
  const denied = await guard();
  if (denied) return denied;
  await clearAiConfig();
  return NextResponse.json({ config: await getAiConfigPublic() });
}
