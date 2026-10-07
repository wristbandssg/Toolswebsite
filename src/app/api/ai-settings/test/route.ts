import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AiNotConfiguredError, AiRequestError, aiCanEmbed, aiComplete, aiEmbed, getAiConfig } from "@/lib/ai/provider";

// Sends a tiny request to the saved AI provider to check the key and model.
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const config = await getAiConfig();
  try {
    if (!config) throw new AiNotConfiguredError();
    const reply = await aiComplete('Reply with the single word "OK".', { maxTokens: 20 }, config);
    let embeddings = "not available with this provider (similarity tools use the built-in method)";
    if (await aiCanEmbed(config)) {
      const [vec] = await aiEmbed(["test"], config);
      embeddings = `working (${vec.length} dimensions)`;
    }
    return NextResponse.json({ ok: true, reply: reply.trim().slice(0, 50), embeddings });
  } catch (err) {
    if (err instanceof AiNotConfiguredError || err instanceof AiRequestError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: "The test failed." }, { status: 500 });
  }
}
