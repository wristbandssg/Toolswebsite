"use client";

import { useState } from "react";
import type { AiConfigPublic, AiProviderId } from "@/lib/ai/provider";

const PROVIDERS: { id: AiProviderId; label: string; model: string; embed: string; keyHelp: string }[] = [
  { id: "gemini", label: "Google Gemini", model: "gemini-2.5-flash", embed: "text-embedding-004", keyHelp: "Get a key at aistudio.google.com → Get API key." },
  { id: "openai", label: "OpenAI (ChatGPT)", model: "gpt-4o-mini", embed: "text-embedding-3-small", keyHelp: "Get a key at platform.openai.com → API keys." },
  { id: "anthropic", label: "Anthropic (Claude)", model: "claude-sonnet-5-5", embed: "", keyHelp: "Get a key at console.anthropic.com. Claude has no embeddings — similarity tools then use the built-in method." },
  { id: "openrouter", label: "OpenRouter", model: "openai/gpt-4o-mini", embed: "openai/text-embedding-3-small", keyHelp: "One key for many models — openrouter.ai/keys." },
  { id: "custom", label: "Other (OpenAI-compatible API)", model: "", embed: "", keyHelp: "Any API that follows OpenAI's /chat/completions and /embeddings format (DeepSeek, Groq, Together, Mistral, a local server…)." },
];

const card = "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900";
const input = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800";

export default function AiSettingsForm({ initial }: { initial: AiConfigPublic }) {
  const [config, setConfig] = useState(initial);
  const [provider, setProvider] = useState<AiProviderId>(initial.provider || "gemini");
  const [model, setModel] = useState(initial.model);
  const [embedModel, setEmbedModel] = useState(initial.embedModel);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "test" | "remove">("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const info = PROVIDERS.find((p) => p.id === provider)!;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    setMessage(null);
    const res = await fetch("/api/ai-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model, embedModel, baseUrl, apiKey }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy("");
    if (!res?.ok) return setMessage({ ok: false, text: data?.error ?? "Could not save." });
    setConfig(data.config);
    setApiKey("");
    setMessage({ ok: true, text: "Saved. Press “Test connection” to check it works." });
  }

  async function test() {
    setBusy("test");
    setMessage(null);
    const res = await fetch("/api/ai-settings/test", { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy("");
    setMessage(res?.ok ? { ok: true, text: `Connected ✓ — the model replied “${data.reply}”. Embeddings: ${data.embeddings}.` } : { ok: false, text: data?.error ?? "The test failed." });
  }

  async function remove() {
    if (!window.confirm("Remove the saved AI provider and key?")) return;
    setBusy("remove");
    const res = await fetch("/api/ai-settings", { method: "DELETE" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy("");
    if (res?.ok) {
      setConfig(data.config);
      setMessage({ ok: true, text: "Removed." });
    }
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      <section className={card}>
        <p className="text-sm">
          Status:{" "}
          {config.hasKey ? (
            <span className="font-semibold text-emerald-600">
              Connected — {PROVIDERS.find((p) => p.id === config.provider)?.label} (key {config.keyHint})
            </span>
          ) : (
            <span className="font-semibold text-amber-600">Not set up — AI-powered SEO tools use their built-in method where they can.</span>
          )}
        </p>
      </section>

      <section className={`${card} space-y-4`}>
        <label className="block text-sm">
          <span className="font-medium">Provider</span>
          <select
            className={input}
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value as AiProviderId);
              setModel("");
              setEmbedModel("");
            }}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-gray-400">{info.keyHelp}</span>
        </label>
        {provider === "custom" ? (
          <label className="block text-sm">
            <span className="font-medium">API base URL</span>
            <input className={input} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.deepseek.com/v1" />
          </label>
        ) : null}
        <label className="block text-sm">
          <span className="font-medium">API key</span>
          <input
            className={`${input} font-mono`}
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={config.hasKey && config.provider === provider ? `Saved (${config.keyHint}) — leave empty to keep it` : "Paste your API key"}
          />
          <span className="mt-1 block text-xs text-gray-400">Stored encrypted. It is never shown again or sent to the browser.</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Chat model</span>
            <input className={input} value={model} onChange={(e) => setModel(e.target.value)} placeholder={info.model || "model name"} />
            <span className="mt-1 block text-xs text-gray-400">Empty = {info.model || "required for this provider"}</span>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Embedding model</span>
            <input className={input} value={embedModel} onChange={(e) => setEmbedModel(e.target.value)} placeholder={info.embed || "none"} disabled={provider === "anthropic"} />
            <span className="mt-1 block text-xs text-gray-400">Used by the similarity and clustering tools.</span>
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!!busy} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
          {busy === "save" ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={test} disabled={!!busy || !config.hasKey} className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800">
          {busy === "test" ? "Testing…" : "Test connection"}
        </button>
        {config.hasKey ? (
          <button type="button" onClick={remove} disabled={!!busy} className="text-sm font-medium text-red-600 hover:underline">
            Remove
          </button>
        ) : null}
        {message ? <span className={`text-sm ${message.ok ? "text-emerald-600" : "text-red-600"}`}>{message.text}</span> : null}
      </div>
    </form>
  );
}
