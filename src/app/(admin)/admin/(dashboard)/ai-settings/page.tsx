import { getAiConfigPublic } from "@/lib/ai/provider";
import AiSettingsForm from "@/components/admin/AiSettingsForm";

export const dynamic = "force-dynamic";

export default async function AiSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">AI Settings</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-500">
        Connect an AI provider — Google Gemini, ChatGPT, Claude, OpenRouter or any OpenAI-compatible API. SEO tools that
        need language understanding (entities, semantic similarity, clustering, topic labels) use it; without one they
        fall back to their built-in method.
      </p>
      <div className="mt-6">
        <AiSettingsForm initial={await getAiConfigPublic()} />
      </div>
    </div>
  );
}
