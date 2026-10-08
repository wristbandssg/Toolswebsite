import { loadPage, headingsOf, linksOf, urlList, jsonLdObjects } from "../html";
import { wordCount, round } from "../text";
import { tfidf, columnMeans } from "../vectors";
import { mapLimit } from "../fetch-page";
import { extractEntities } from "../semantic";
import { getAiConfig, aiJson, AI_PROVIDERS } from "@/lib/ai/provider";
import { loadSitemapUrls } from "./technical-b";
import type { Cell, ReportSection } from "../types";
import { type Runner, str, num, need, ToolInputError } from "./util";

// Keywords & competitors — ports of competitor_analysis.py,
// content_brief_generator.py, keyword_gap_analyzer.py, lsi_keyword_finder.py,
// keyword_difficulty_estimator.py, keyword_intent_classifier.py,
// competitor_strategy_analyzer.py and content_calendar_generator.py.

export interface Doc {
  url: string;
  label: string;
  title: string;
  text: string;
  words: number;
  h2: string[];
  /** All H1–H6 texts. */
  headings: string[];
  h3: number;
  images: number;
  internalLinks: number;
  externalLinks: number;
  schemas: number;
}

/** A page as the Python scripts saw it: text without scripts/nav/footer, headings and counts. */
export async function loadDoc(url: string): Promise<Doc> {
  const p = await loadPage(url);
  const links = linksOf(p.root, p.page.finalUrl);
  return {
    url: p.page.finalUrl,
    label: p.page.finalUrl.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60),
    title: p.title,
    text: p.mainText,
    words: wordCount(p.mainText),
    h2: headingsOf(p.root, "h2").map((h) => h.text).filter(Boolean),
    headings: headingsOf(p.root).map((h) => h.text).filter(Boolean),
    h3: headingsOf(p.root, "h3").length,
    images: p.root.querySelectorAll("img").length,
    internalLinks: links.filter((l) => l.internal).length,
    externalLinks: links.filter((l) => !l.internal).length,
    schemas: jsonLdObjects(p.root).length,
  };
}

/** Loads pages 4 at a time; failures are reported instead of stopping the run. */
export async function loadDocs(urls: string[]): Promise<{ docs: Doc[]; failed: string[] }> {
  const results = await mapLimit(urls, 4, async (u) => {
    try {
      return await loadDoc(u);
    } catch (e) {
      return `${u} — ${(e as Error).message}`;
    }
  });
  return { docs: results.filter((r): r is Doc => typeof r !== "string"), failed: results.filter((r): r is string => typeof r === "string") };
}

const failedList = (failed: string[]): ReportSection[] => (failed.length ? [{ kind: "list", title: "Pages that couldn't be loaded", items: failed, tone: "bad" }] : []);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
function percentile(xs: number[], p: number) {
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  return s[Math.floor(i)] + (s[Math.ceil(i)] - s[Math.floor(i)]) * (i - Math.floor(i));
}

/** Terms in ≥ share of the docs with avg TF-IDF > 0.01, best first. */
function commonTerms(docs: string[], share: number, maxFeatures: number, top: number): [string, number, number][] {
  const t = tfidf(docs, { ngramMin: 1, ngramMax: 3, maxFeatures });
  const avg = columnMeans(t.matrix);
  return t.features
    .map((f, i): [string, number, number] => [f, round(avg[i], 4), t.df[i]])
    .filter(([, s, df]) => df >= docs.length * share && s > 0.01)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top);
}

/** Content Brief (content_brief_generator). */
export const contentBrief: Runner = async (input) => {
  const keyword = need(str(input.keyword), "Enter the target keyword.");
  const { docs, failed } = await loadDocs(urlList(input.urls, 10));
  if (docs.length < 2) throw new ToolInputError("Need at least 2 competitor pages that load.");
  const words = docs.map((d) => d.words);
  const must = commonTerms(docs.map((d) => d.text), 0.4, 500, 40);
  const h2Counts = new Map<string, number>();
  for (const d of docs) for (const h of d.h2) h2Counts.set(h.toLowerCase().trim(), (h2Counts.get(h.toLowerCase().trim()) ?? 0) + 1);
  const h2s = [...h2Counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  const { entities, method } = await extractEntities(docs.map((d) => d.text.slice(0, 8000)).join("\n\n"), 25);
  const range = `${Math.round(percentile(words, 0.25))}–${Math.round(percentile(words, 0.75))}`;

  const sections: ReportSection[] = [
    { kind: "table", title: "Must-include terms (in 40%+ of competitors)", columns: ["Term", "Avg TF-IDF", "In # pages"], rows: must.map((m): Cell[] => m) },
    { kind: "table", title: "Competitor H2 headings", columns: ["Heading", "Pages using it"], rows: h2s.map((h): Cell[] => h) },
    { kind: "table", title: "Key entities to mention", note: `Entities: ${method}`, columns: ["Entity", "Type", "Mentions"], rows: entities.map((e): Cell[] => [e.entity, e.type, e.count]) },
    { kind: "table", title: "Competitors", columns: ["Page", "Title", "Words", "H2s"], rows: docs.map((d): Cell[] => [d.url, d.title, d.words, d.h2.length]) },
  ];

  // With an AI provider: a ready-to-write outline built from the data above.
  const config = await getAiConfig();
  if (config) {
    try {
      const outline = await aiJson<{ title?: string; metaDescription?: string; outline?: { h2: string; h3?: string[]; notes?: string }[] }>(
        `Write an SEO content brief outline for the keyword "${keyword}". Target length ${range} words. Competitor H2s: ${h2s.map(([h]) => h).join(" | ")}. Terms to cover: ${must.slice(0, 25).map(([t]) => t).join(", ")}. Entities: ${entities.slice(0, 15).map((e) => e.entity).join(", ")}. Return {"title":"…","metaDescription":"…","outline":[{"h2":"…","h3":["…"],"notes":"what to cover"}]} with 6–10 H2 sections, better than the competitors.`,
        config
      );
      sections.unshift({
        kind: "text",
        title: `Suggested outline (AI — ${AI_PROVIDERS[config.provider].label})`,
        text: [`Title: ${outline.title ?? ""}`, `Meta description: ${outline.metaDescription ?? ""}`, "", ...(outline.outline ?? []).flatMap((s) => [`H2: ${s.h2}`, ...(s.h3 ?? []).map((h) => `   H3: ${h}`), ...(s.notes ? [`   → ${s.notes}`] : [])])].join("\n"),
      });
    } catch {
      // The data-driven brief stands on its own.
    }
  }
  return {
    headline: `Content brief — "${keyword}"`,
    stats: [
      { label: "Competitors", value: docs.length },
      { label: "Recommended words", value: range },
      { label: "Avg competitor words", value: Math.round(mean(words)) },
      { label: "Median words", value: Math.round(percentile(words, 0.5)) },
      { label: "Must-include terms", value: must.length },
    ],
    sections: [...sections, ...failedList(failed)],
  };
};

function contentType(url: string, title: string) {
  const u = url.toLowerCase();
  const both = u + title.toLowerCase();
  if (/\/category\/|\/tag\/|\/topic\//.test(u)) return "taxonomy";
  if (/how-to|tutorial|guide/.test(both)) return "how-to/guide";
  if (/review|comparison|vs|versus|best/.test(both)) return "comparison/review";
  if (/news|update|announce/.test(both)) return "news/update";
  if (/case-study|success-story/.test(both)) return "case study";
  if (/glossary|definition|what-is/.test(both)) return "glossary";
  if (/\/blog\/|\/post\/|\/article\//.test(u)) return "blog post";
  if (/\/product\/|\/service\/|\/pricing\//.test(u)) return "product/service";
  return "other";
}

/** Competitor Strategy (competitor_strategy_analyzer). */
export const competitorStrategy: Runner = async (input) => {
  const sitemap = str(input.sitemap);
  const maxPages = num(input.maxPages, 30, 5, 60);
  let entries: { loc: string; lastmod: string }[] = [];
  if (sitemap) entries = await loadSitemapUrls(sitemap, 2000);
  const urls = sitemap ? entries.map((e) => e.loc) : urlList(input.urls, 60);
  if (!urls.length) throw new ToolInputError(sitemap ? "The sitemap has no URLs." : "Enter a sitemap URL or page URLs.");
  // Spread the sample across the whole sitemap instead of only its first pages.
  const step = Math.max(1, urls.length / maxPages);
  const sample = [...new Set(Array.from({ length: Math.min(maxPages, urls.length) }, (_, i) => urls[Math.floor(i * step)]))];
  const { docs, failed } = await loadDocs(sample);

  const types = new Map<string, number>();
  for (const d of docs) types.set(contentType(d.url, d.title), (types.get(contentType(d.url, d.title)) ?? 0) + 1);
  const pathOf = (u: string) => new URL(u).pathname.replace(/^\/+|\/+$/g, "");
  const prefixes = new Map<string, number>();
  for (const u of urls) {
    const first = pathOf(u).split("/")[0];
    if (first) prefixes.set(first, (prefixes.get(first) ?? 0) + 1);
  }
  const words = docs.map((d) => d.words).filter((w) => w > 0);
  const monthly = new Map<string, number>();
  for (const e of entries) {
    const d = new Date(e.lastmod.slice(0, 10));
    if (e.lastmod && !Number.isNaN(d.getTime())) monthly.set(d.toISOString().slice(0, 7), (monthly.get(d.toISOString().slice(0, 7)) ?? 0) + 1);
  }
  const months = [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  return {
    headline: `${urls.length} URLs found, ${docs.length} analysed`,
    stats: [
      { label: "Total URLs", value: urls.length },
      { label: "Avg words", value: Math.round(mean(words)) },
      { label: "Median words", value: words.length ? Math.round(percentile(words, 0.5)) : 0 },
      { label: "Avg URL depth", value: round(mean(urls.map((u) => (pathOf(u) ? pathOf(u).split("/").length : 0)))) },
      { label: "Avg updates / month", value: monthly.size ? round(mean([...monthly.values()])) : "no lastmod dates" },
    ],
    sections: [
      { kind: "table", title: "Content types", columns: ["Type", "Pages", "%"], rows: [...types.entries()].sort((a, b) => b[1] - a[1]).map(([t, c]): Cell[] => [t, c, round((c / docs.length) * 100)]) },
      { kind: "table", title: "Top URL sections", columns: ["Section", "URLs"], rows: [...prefixes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([p, c]): Cell[] => [`/${p}/`, c]) },
      ...(months.length ? [{ kind: "table" as const, title: "Publishing / update cadence (sitemap lastmod, last 12 months)", columns: ["Month", "URLs", ""], rows: months.map(([m, c]): Cell[] => [m, c, "█".repeat(Math.min(c, 40))]) }] : []),
      { kind: "table", title: "Pages analysed", columns: ["URL", "Title", "Type", "Words", "H2s", "Images"], rows: docs.map((d): Cell[] => [d.url, d.title.slice(0, 80), contentType(d.url, d.title), d.words, d.h2.length, d.images]) },
      ...failedList(failed),
    ],
  };
};
