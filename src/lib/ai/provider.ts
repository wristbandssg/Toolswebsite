import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getSiteSetting, setSiteSetting } from "@/lib/site-settings";

// One AI provider for the whole admin (set at Marketing → AI Settings), used
// by the SEO tools that need language understanding or embeddings: entity
// extraction, semantic similarity, clustering, topic labels. Supports
// Google Gemini, OpenAI (ChatGPT), Anthropic (Claude), OpenRouter, or any
// OpenAI-compatible API. The API key is stored encrypted and never sent to
// the browser.

export const AI_PROVIDERS = {
  gemini: { label: "Google Gemini", chatModel: "gemini-2.5-flash", embedModel: "text-embedding-004", embeddings: true },
  openai: { label: "OpenAI (ChatGPT)", chatModel: "gpt-4o-mini", embedModel: "text-embedding-3-small", embeddings: true },
  anthropic: { label: "Anthropic (Claude)", chatModel: "claude-sonnet-5-5", embedModel: "", embeddings: false },
  openrouter: { label: "OpenRouter", chatModel: "openai/gpt-4o-mini", embedModel: "openai/text-embedding-3-small", embeddings: true },
  custom: { label: "Other (OpenAI-compatible API)", chatModel: "", embedModel: "", embeddings: true },
} as const;

export type AiProviderId = keyof typeof AI_PROVIDERS;

const KEY = "ai_provider";

interface StoredConfig {
  provider: AiProviderId;
  model: string;
  embedModel: string;
  baseUrl: string; // only for "custom"
  apiKey: string; // encrypted: iv.tag.ciphertext (base64)
}

export interface AiConfig {
  provider: AiProviderId;
  model: string;
  embedModel: string;
  baseUrl: string;
  apiKey: string;
}

/** What the admin screen may see — never the key itself. */
export interface AiConfigPublic {
  provider: AiProviderId | "";
  model: string;
  embedModel: string;
  baseUrl: string;
  hasKey: boolean;
  keyHint: string; // e.g. "…a1B2"
}

function secretKey() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set — can't store API keys safely.");
  return createHash("sha256").update(`ai-provider:${secret}`).digest();
}

function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

function decrypt(stored: string): string {
  const [iv, tag, data] = stored.split(".").map((s) => Buffer.from(s, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", secretKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export async function getAiConfig(): Promise<AiConfig | null> {
  const stored = await getSiteSetting<StoredConfig>(KEY);
  if (!stored?.provider || !stored.apiKey) return null;
  try {
    return { provider: stored.provider, model: stored.model, embedModel: stored.embedModel, baseUrl: stored.baseUrl, apiKey: decrypt(stored.apiKey) };
  } catch {
    return null; // the server secret changed — the key has to be entered again
  }
}

export async function getAiConfigPublic(): Promise<AiConfigPublic> {
  const stored = await getSiteSetting<StoredConfig>(KEY);
  const config = await getAiConfig();
  return {
    provider: stored?.provider ?? "",
    model: stored?.model ?? "",
    embedModel: stored?.embedModel ?? "",
    baseUrl: stored?.baseUrl ?? "",
    hasKey: !!config,
    keyHint: config ? `…${config.apiKey.slice(-4)}` : "",
  };
}

/** Saves the settings. An empty apiKey keeps the stored one. */
export async function saveAiConfig(next: { provider: AiProviderId; model: string; embedModel: string; baseUrl: string; apiKey: string }) {
  const current = await getSiteSetting<StoredConfig>(KEY);
  const apiKey = next.apiKey ? encrypt(next.apiKey) : current?.apiKey ?? "";
  await setSiteSetting(KEY, { provider: next.provider, model: next.model, embedModel: next.embedModel, baseUrl: next.baseUrl, apiKey } satisfies StoredConfig);
}

export async function clearAiConfig() {
  await setSiteSetting(KEY, {});
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("No AI provider is set up. Add a Gemini, ChatGPT, Claude or other API key at Marketing → AI Settings.");
  }
}

export class AiRequestError extends Error {}

const modelOf = (c: AiConfig) => c.model || AI_PROVIDERS[c.provider].chatModel;
const embedModelOf = (c: AiConfig) => c.embedModel || AI_PROVIDERS[c.provider].embedModel;

function openAiBase(c: AiConfig) {
  if (c.provider === "openai") return "https://api.openai.com/v1";
  if (c.provider === "openrouter") return "https://openrouter.ai/api/v1";
  return c.baseUrl.replace(/\/+$/, "");
}

async function call(url: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(90_000) }).catch(() => {
    throw new AiRequestError("Couldn't reach the AI provider.");
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } | string }).error;
    throw new AiRequestError(`AI provider error (${res.status}): ${typeof msg === "string" ? msg : msg?.message ?? "request failed"}`.slice(0, 300));
  }
  return data;
}

/** One prompt → text answer. */
export async function aiComplete(prompt: string, opts: { system?: string; json?: boolean; maxTokens?: number } = {}, config?: AiConfig | null): Promise<string> {
  const c = config ?? (await getAiConfig());
  if (!c) throw new AiNotConfiguredError();
  const system = opts.system ?? "You are an SEO analysis assistant. Answer precisely.";
  const maxTokens = opts.maxTokens ?? 2000;

  if (c.provider === "gemini") {
    const data = (await call(`https://generativelanguage.googleapis.com/v1beta/models/${modelOf(c)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": c.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, ...(opts.json ? { responseMimeType: "application/json" } : {}) },
      }),
    })) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  }

  if (c.provider === "anthropic") {
    const data = (await call("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": c.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: modelOf(c), max_tokens: maxTokens, system, messages: [{ role: "user", content: prompt }] }),
    })) as { content?: { type: string; text?: string }[] };
    return data.content?.filter((b) => b.type === "text").map((b) => b.text ?? "").join("") ?? "";
  }

  const data = (await call(`${openAiBase(c)}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.apiKey}` },
    body: JSON.stringify({
      model: modelOf(c),
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  })) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

/** One prompt → parsed JSON (the model is asked for JSON only). */
export async function aiJson<T>(prompt: string, config?: AiConfig | null): Promise<T> {
  const text = await aiComplete(`${prompt}\n\nReply with valid JSON only — no explanation, no code fences.`, { json: true, maxTokens: 4000 }, config);
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new AiRequestError("The AI provider didn't return valid JSON — try again.");
  }
}

/** Whether the configured provider can make embeddings (Claude can't). */
export async function aiCanEmbed(config?: AiConfig | null): Promise<boolean> {
  const c = config ?? (await getAiConfig());
  return !!c && AI_PROVIDERS[c.provider].embeddings && !!embedModelOf(c);
}

/** Text → embedding vectors (in batches). */
export async function aiEmbed(texts: string[], config?: AiConfig | null): Promise<number[][]> {
  const c = config ?? (await getAiConfig());
  if (!c) throw new AiNotConfiguredError();
  if (!(await aiCanEmbed(c))) throw new AiRequestError(`${AI_PROVIDERS[c.provider].label} doesn't offer embeddings.`);
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64).map((t) => t.slice(0, 6000) || " ");
    if (c.provider === "gemini") {
      const model = embedModelOf(c);
      const data = (await call(`https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": c.apiKey },
        body: JSON.stringify({ requests: batch.map((text) => ({ model: `models/${model}`, content: { parts: [{ text }] } })) }),
      })) as { embeddings?: { values: number[] }[] };
      out.push(...(data.embeddings ?? []).map((e) => e.values));
    } else {
      const data = (await call(`${openAiBase(c)}/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.apiKey}` },
        body: JSON.stringify({ model: embedModelOf(c), input: batch }),
      })) as { data?: { embedding: number[]; index: number }[] };
      out.push(...(data.data ?? []).sort((a, b) => a.index - b.index).map((d) => d.embedding));
    }
  }
  if (out.length !== texts.length) throw new AiRequestError("The AI provider returned the wrong number of embeddings.");
  return out;
}
