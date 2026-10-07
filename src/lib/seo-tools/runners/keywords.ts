import { loadPage, headingsOf, linksOf, urlList, jsonLdObjects } from "../html";
import { STOP_WORDS, wordCount, round } from "../text";
import { tfidf, similarityMatrix, columnMeans, cosine } from "../vectors";
import { mapLimit } from "../fetch-page";
import { extractEntities, embedTexts, keywordList } from "../semantic";
import { getAiConfig, aiJson, aiCanEmbed, aiEmbed, AI_PROVIDERS } from "@/lib/ai/provider";
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

/** Competitor Analysis (competitor_analysis). */
export const competitorAnalysis: Runner = async (input) => {
  const keyword = str(input.keyword);
  const { docs, failed } = await loadDocs(urlList(input.urls, 10));
  if (docs.length < 2) throw new ToolInputError("Need at least 2 competitor pages that load.");
  const common = commonTerms(docs.map((d) => d.text), 0.5, 1000, 50);

  // Entities per page (spaCy in the original).
  const perPage = await mapLimit(docs, 3, (d) => extractEntities(d.text, 60));
  const method = perPage[0]?.method ?? "";
  const pageCounts = perPage.map((p) => new Map(p.entities.map((e) => [e.entity, e.count])));
  const spread = new Map<string, number>();
  for (const m of pageCounts) for (const e of m.keys()) spread.set(e, (spread.get(e) ?? 0) + 1);
  const topEntities = [...spread.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([e]) => e);
  const entityRows = topEntities.map((e) => {
    const counts = pageCounts.map((m) => m.get(e) ?? 0);
    return { entity: e, counts, total: counts.reduce((a, b) => a + b, 0) };
  });

  // Similarity of the first 512 words of each page.
  const emb = await embedTexts(docs.map((d) => d.text.split(/\s+/).slice(0, 512).join(" ")));
  const sim = similarityMatrix(emb.vectors);

  const sections: ReportSection[] = [
    { kind: "table", title: "Page overview", columns: ["#", "Page", "Words", "H2s"], rows: docs.map((d, i): Cell[] => [i + 1, d.url, d.words, d.h2.length]) },
    { kind: "table", title: "Common high-value terms (in 50%+ of pages)", columns: ["Term", "Avg TF-IDF", "In # pages"], rows: common.map((c): Cell[] => c) },
    { kind: "table", title: "Entity coverage", note: `Entities: ${method}`, columns: ["Entity", ...docs.map((_, i) => `Page ${i + 1}`), "Total"], rows: entityRows.map((r): Cell[] => [r.entity, ...r.counts, r.total]) },
    { kind: "table", title: "Semantic similarity", note: `Method: ${emb.method}. 1 = identical topic coverage.`, columns: ["", ...docs.map((_, i) => `Page ${i + 1}`)], rows: sim.map((row, i): Cell[] => [`Page ${i + 1}`, ...row.map((v) => round(v, 3))]) },
  ];
  const stats: { label: string; value: Cell }[] = [
    { label: "Pages analysed", value: docs.length },
    { label: "Avg words", value: Math.round(mean(docs.map((d) => d.words))) },
    { label: "Avg H2s", value: round(mean(docs.map((d) => d.h2.length))) },
  ];
  const issues: string[] = [];

  const mine = str(input.myUrl);
  if (mine) {
    const my = await loadDoc(mine);
    const lower = my.text.toLowerCase();
    const termGaps = common.filter(([t]) => !lower.includes(t.toLowerCase()));
    const entityGaps = entityRows.filter((r) => r.total >= 2 && !lower.includes(r.entity.toLowerCase()));
    const avgWords = Math.round(mean(docs.map((d) => d.words)));
    const avgH2 = round(mean(docs.map((d) => d.h2.length)));
    stats.push({ label: "Your words", value: my.words }, { label: "Your H2s", value: my.h2.length });
    if (my.words < avgWords * 0.8) issues.push(`Your page has ${my.words} words vs a competitor average of ${avgWords}`);
    if (my.h2.length < avgH2) issues.push(`Your page has ${my.h2.length} H2s vs a competitor average of ${avgH2}`);
    if (termGaps.length) issues.push(`${termGaps.length} common competitor terms are missing from your page`);
    if (entityGaps.length) issues.push(`${entityGaps.length} entities competitors mention are missing from your page`);
    sections.push(
      { kind: "table", title: "Missing terms (your page vs competitors)", columns: ["Term", "Avg TF-IDF", "Competitor pages"], rows: termGaps.map((c): Cell[] => c) },
      { kind: "table", title: "Missing entities", columns: ["Entity", "Competitor mentions"], rows: entityGaps.map((r): Cell[] => [r.entity, r.total]) }
    );
  }
  if (keyword) {
    const kw = keyword.toLowerCase();
    sections.unshift({
      kind: "table",
      title: `Target keyword "${keyword}"`,
      columns: ["Page", "In title", "Mentions", "In an H2"],
      rows: docs.map((d): Cell[] => [d.url, d.title.toLowerCase().includes(kw) ? "yes" : "no", d.text.toLowerCase().split(kw).length - 1, d.h2.some((h) => h.toLowerCase().includes(kw)) ? "yes" : "no"]),
    });
  }
  return { headline: keyword ? `Competitor analysis — "${keyword}"` : "Competitor analysis", stats, issues: issues.length ? issues : undefined, sections: [...sections, ...failedList(failed)] };
};

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

/** Keyword Gap (keyword_gap_analyzer). */
export const keywordGap: Runner = async (input) => {
  const [mine, theirs] = await Promise.all([loadDocs(urlList(input.myUrls, 10)), loadDocs(urlList(input.competitorUrls, 10))]);
  if (!mine.docs.length || !theirs.docs.length) throw new ToolInputError("Need at least 1 page that loads from each side.");
  const t = tfidf([...mine.docs, ...theirs.docs].map((d) => d.text), { ngramMin: 1, ngramMax: 3, maxFeatures: 2000 });
  const myAvg = columnMeans(t.matrix.slice(0, mine.docs.length));
  const compAvg = columnMeans(t.matrix.slice(mine.docs.length));
  const top = num(input.top, 50, 10, 200);
  const gaps = t.features
    .map((f, i) => ({ f, my: myAvg[i], comp: compAvg[i] }))
    .filter((g) => g.comp > 0.02 && g.my < g.comp * 0.3)
    .sort((a, b) => b.comp - b.my - (a.comp - a.my))
    .slice(0, top);
  const strengths = t.features
    .map((f, i) => ({ f, my: myAvg[i], comp: compAvg[i] }))
    .filter((g) => g.my > 0.02 && g.comp < g.my * 0.3)
    .sort((a, b) => b.my - a.my)
    .slice(0, top);
  const high = gaps.filter((g) => g.comp > 0.05 && g.my < 0.01).length;
  return {
    headline: `Your ${mine.docs.length} page(s) vs ${theirs.docs.length} competitor page(s)`,
    stats: [
      { label: "Terms you're missing", value: gaps.length },
      { label: "High priority", value: high },
      { label: "Your unique strengths", value: strengths.length },
    ],
    sections: [
      { kind: "table", title: "Terms you're missing", columns: ["Term", "Your TF-IDF", "Competitor TF-IDF", "Gap", "Priority"], rows: gaps.map((g): Cell[] => [g.f, round(g.my, 5), round(g.comp, 5), round(g.comp - g.my, 5), g.comp > 0.05 && g.my < 0.01 ? "HIGH" : "MEDIUM"]) },
      { kind: "table", title: "Your unique strengths", columns: ["Term", "Your TF-IDF", "Competitor TF-IDF"], rows: strengths.map((g): Cell[] => [g.f, round(g.my, 5), round(g.comp, 5)]) },
      ...failedList([...mine.failed, ...theirs.failed]),
    ],
  };
};

/** LSI / Related Keywords (lsi_keyword_finder). */
export const lsiKeywords: Runner = async (input) => {
  const keyword = need(str(input.keyword), "Enter a seed keyword.");
  const kw = keyword.toLowerCase();
  const top = num(input.top, 30, 5, 100);
  const { docs, failed } = await loadDocs(urlList(input.urls, 10));
  const texts = [...docs.map((d) => d.text), ...(str(input.text) ? [str(input.text)] : [])];
  if (!texts.length) throw new ToolInputError("Enter corpus URLs or paste some text.");

  const t = tfidf(texts, { ngramMin: 1, ngramMax: 3, maxFeatures: 2000 });
  const relevant = texts.map((x, i) => (x.toLowerCase().includes(kw) ? i : -1)).filter((i) => i >= 0);
  const avg = columnMeans((relevant.length ? relevant : texts.map((_, i) => i)).map((i) => t.matrix[i]));
  const tfidfRelated = t.features
    .map((f, i): [string, number] => [f, round(avg[i], 5)])
    .filter(([f]) => f !== kw)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top);

  // Words within 10 words of the keyword.
  const co = new Map<string, number>();
  const kwWords = kw.split(/\s+/);
  for (const text of texts) {
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) ?? [];
    for (let i = 0; i < words.length; i++) {
      const hit = kwWords.length === 1 ? words[i] === kw : words.slice(i, i + kwWords.length).join(" ") === kw;
      if (!hit) continue;
      const ctx = [...words.slice(Math.max(0, i - 10), i), ...words.slice(i + kwWords.length, i + kwWords.length + 10)];
      for (const w of ctx) if (w.length > 2 && !STOP_WORDS.has(w) && !kwWords.includes(w)) co.set(w, (co.get(w) ?? 0) + 1);
    }
  }
  const cooccur = [...co.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);

  const sections: ReportSection[] = [
    { kind: "table", title: "TF-IDF related terms", columns: ["Term", "TF-IDF score"], rows: tfidfRelated.map((r): Cell[] => r) },
    { kind: "table", title: "Co-occurring words (±10 words)", columns: ["Word", "Count"], rows: cooccur.map((r): Cell[] => r) },
  ];
  // Embedding similarity of the candidates to the seed — needs an AI provider with embeddings.
  const config = await getAiConfig();
  const candidates = [...new Set([...tfidfRelated.map(([t]) => t), ...cooccur.map(([w]) => w)])];
  if (config && (await aiCanEmbed(config)) && candidates.length) {
    try {
      const [seed, ...vecs] = await aiEmbed([keyword, ...candidates], config);
      const ranked = candidates.map((c, i): [string, number] => [c, round(cosine(seed, vecs[i]), 4)]).sort((a, b) => b[1] - a[1]).slice(0, top);
      sections.push({ kind: "table", title: `Semantic similarity to "${keyword}" (AI embeddings)`, columns: ["Term", "Similarity"], rows: ranked.map((r): Cell[] => r) });
    } catch (e) {
      sections.push({ kind: "text", title: "Semantic similarity", text: `AI embeddings failed: ${(e as Error).message}` });
    }
  } else {
    sections.push({ kind: "text", title: "Semantic similarity", text: "Add an AI provider with embeddings (Gemini, ChatGPT, OpenRouter) in AI Settings to also rank these terms by meaning." });
  }
  return { headline: `Related keywords for "${keyword}"`, stats: [{ label: "Corpus documents", value: texts.length }, { label: "Keyword found in", value: `${relevant.length} doc(s)` }], sections: [...sections, ...failedList(failed)] };
};

/** Keyword Difficulty (keyword_difficulty_estimator). */
export const keywordDifficulty: Runner = async (input) => {
  const keyword = need(str(input.keyword), "Enter the keyword.");
  const { docs, failed } = await loadDocs(urlList(input.urls, 10));
  if (!docs.length) throw new ToolInputError("None of the pages could be loaded.");
  const m = {
    words: mean(docs.map((d) => d.words)),
    h2: mean(docs.map((d) => d.h2.length)),
    images: mean(docs.map((d) => d.images)),
    intLinks: mean(docs.map((d) => d.internalLinks)),
    extLinks: mean(docs.map((d) => d.externalLinks)),
    schemaPct: mean(docs.map((d) => (d.schemas > 0 ? 1 : 0))) * 100,
  };
  const factors: [string, number][] = [["Base", 20]];
  const add = (label: string, pts: number) => pts && factors.push([label, pts]);
  add(`Avg ${Math.round(m.words)} words`, m.words > 3000 ? 20 : m.words > 1500 ? 10 : m.words > 800 ? 5 : 0);
  add(`Avg ${round(m.h2)} H2s`, m.h2 > 10 ? 10 : m.h2 > 5 ? 5 : 0);
  add(`Avg ${round(m.images)} images`, m.images > 10 ? 10 : m.images > 5 ? 5 : 0);
  add(`Avg ${round(m.extLinks)} external links`, m.extLinks > 20 ? 10 : m.extLinks > 10 ? 5 : 0);
  add(`${Math.round(m.schemaPct)}% use schema`, m.schemaPct > 60 ? 10 : m.schemaPct > 30 ? 5 : 0);
  const n = keyword.trim().split(/\s+/).length;
  add(n >= 5 ? "Long-tail keyword (5+ words)" : "Short head keyword (1–2 words)", n >= 5 ? -10 : n <= 2 ? 10 : 0);
  add("Commercial modifier (best/top/review)", /\b(best|top|review)\b/i.test(keyword) ? 5 : 0);
  const score = Math.min(95, Math.max(5, factors.reduce((a, [, p]) => a + p, 0)));
  const label = score < 20 ? "Very Easy" : score < 35 ? "Easy" : score < 55 ? "Medium" : score < 75 ? "Hard" : "Very Hard";
  const need_: string[] = [`${Math.round(m.words * 1.2)}+ words`, `${Math.round(m.h2 + 2)}+ H2 subheadings`, `${Math.round(m.images)}+ images`];
  if (m.schemaPct > 30) need_.push(`Structured data (used by ${Math.round(m.schemaPct)}% of competitors)`);
  return {
    headline: `"${keyword}" — ${label}`,
    score: 100 - score,
    grade: label,
    stats: [
      { label: "Difficulty", value: `${score}/100` },
      { label: "Competitors analysed", value: docs.length },
      { label: "Avg words", value: Math.round(m.words) },
      { label: "Avg internal links", value: round(m.intLinks) },
    ],
    sections: [
      { kind: "list", title: "What you need to compete", items: need_ },
      { kind: "table", title: "Difficulty factors", columns: ["Factor", "Points"], rows: factors.map((f): Cell[] => f) },
      { kind: "table", title: "Competitor benchmarks", columns: ["Page", "Words", "H2", "H3", "Images", "Internal links", "External links", "Schema blocks", "Title length"], rows: docs.map((d): Cell[] => [d.url, d.words, d.h2.length, d.h3, d.images, d.internalLinks, d.externalLinks, d.schemas, d.title.length]) },
      ...failedList(failed),
    ],
    passed: [`Score shown is "ease" (100 − difficulty) so higher is better, like the other tools.`],
  };
};

const INTENT_RULES: Record<string, RegExp[]> = {
  transactional: [/\b(buy|purchase|order|shop|deal|discount|coupon|cheap|price|pricing|cost|affordable|sale|checkout|subscribe)\b/, /\b(get quote|free trial|sign up|register|download now|hire|book now|reserve)\b/],
  commercial: [/\b(best|top|review|comparison|compare|vs|versus|alternative|recommend|rated)\b/, /\b(which|pros and cons|benchmark|ranking|tier list)\b/],
  navigational: [/\b(login|log in|sign in|official|website|site|portal|dashboard|account|app)\b/, /\.(com|org|net|io)\b/],
  informational: [/\b(how to|what is|what are|why|when|where|who|guide|tutorial|tips|learn|example|explain|definition|meaning)\b/, /\b(can i|should i|does|do|is it|ways to|steps to|ideas|list of)\b/],
};

export function classifyIntent(keyword: string): { intent: string; confidence: number } {
  const kw = keyword.toLowerCase().trim();
  const scores = Object.fromEntries(Object.entries(INTENT_RULES).map(([k, ps]) => [k, ps.filter((p) => p.test(kw)).length])) as Record<string, number>;
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (!total) return kw.split(/\s+/).length <= 2 && !/\b(best|how|what|why)\b/.test(kw) ? { intent: "commercial", confidence: 0.4 } : { intent: "informational", confidence: 0.3 };
  const intent = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  return { intent, confidence: round(scores[intent] / total, 2) };
}

const EXEMPLARS: Record<string, string[]> = {
  informational: ["how to learn python", "what is machine learning", "why is the sky blue", "guide to cooking", "tutorial for beginners"],
  navigational: ["facebook login", "gmail sign in", "amazon official website", "youtube app download", "netflix account"],
  commercial: ["best laptop 2025", "top rated headphones", "iphone vs samsung comparison", "cheapest web hosting review", "recommended crm software"],
  transactional: ["buy running shoes online", "order pizza delivery", "subscribe to netflix", "book hotel room", "download free antivirus"],
};

/** AI intent: embeddings vs exemplar centroids (as the original), or the chat model when the provider has no embeddings. */
async function aiIntents(keywords: string[]): Promise<{ results: { intent: string; confidence: number }[]; method: string } | null> {
  const config = await getAiConfig();
  if (!config) return null;
  const label = AI_PROVIDERS[config.provider].label;
  if (await aiCanEmbed(config)) {
    const intents = Object.keys(EXEMPLARS);
    const vecs = await aiEmbed([...keywords, ...intents.flatMap((i) => EXEMPLARS[i])], config);
    const kwVecs = vecs.slice(0, keywords.length);
    const centroids = intents.map((_, j) => columnMeans(vecs.slice(keywords.length + j * 5, keywords.length + j * 5 + 5)));
    return {
      method: `AI embeddings (${label})`,
      results: kwVecs.map((v) => {
        const sims = centroids.map((c) => cosine(v, c));
        const best = sims.indexOf(Math.max(...sims));
        return { intent: intents[best], confidence: round(sims[best], 3) };
      }),
    };
  }
  const out: { intent: string; confidence: number }[] = [];
  for (let i = 0; i < keywords.length; i += 150) {
    const batch = keywords.slice(i, i + 150);
    const data = await aiJson<{ results?: { keyword: string; intent: string; confidence?: number }[] }>(
      `Classify the search intent of each keyword as informational, navigational, commercial or transactional, with a confidence 0–1. Return {"results":[{"keyword":"…","intent":"…","confidence":0.9}]} in the same order.\n\n${batch.map((k, j) => `${j + 1}. ${k}`).join("\n")}`,
      config
    );
    batch.forEach((_, j) => {
      const r = data.results?.[j];
      out.push({ intent: String(r?.intent ?? "").toLowerCase() || "?", confidence: round(Number(r?.confidence) || 0, 2) });
    });
  }
  return { results: out, method: `AI (${label})` };
}

/** Keyword Intent (keyword_intent_classifier). */
export const keywordIntent: Runner = async (input) => {
  const keywords = need(keywordList(input.keywords, input.csv, 2000), "Enter keywords or upload a CSV.");
  const method = str(input.method) || "rules";
  const rules = keywords.map(classifyIntent);
  let ai: Awaited<ReturnType<typeof aiIntents>> = null;
  let note = "";
  if (method !== "rules") {
    ai = await aiIntents(keywords);
    if (!ai) note = "No AI provider is set up (AI Settings) — showing the rule-based result.";
  }
  const main = method === "ai" && ai ? ai.results : rules;
  const counts = new Map<string, number>();
  for (const r of main) counts.set(r.intent, (counts.get(r.intent) ?? 0) + 1);
  const columns = method === "both" && ai ? ["Keyword", "Intent (rules)", "Confidence (rules)", "Intent (AI)", "Confidence (AI)", "Agree"] : ["Keyword", "Intent", "Confidence"];
  const rows = keywords.map((k, i): Cell[] =>
    method === "both" && ai ? [k, rules[i].intent, rules[i].confidence, ai.results[i].intent, ai.results[i].confidence, rules[i].intent === ai.results[i].intent ? "yes" : "no"] : [k, main[i].intent, main[i].confidence]
  );
  return {
    headline: `${keywords.length} keywords classified`,
    stats: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([intent, c]) => ({ label: intent, value: `${c} (${round((c / keywords.length) * 100)}%)` })),
    issues: note ? [note] : undefined,
    sections: [{ kind: "table", title: "Keywords", note: ai ? `AI method: ${ai.method}` : "Rule-based patterns (same as the Python script).", columns, rows }],
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

const CONTENT_TYPES: Record<string, string[]> = {
  informational: ["Ultimate Guide", "How-To Tutorial", "Explainer Post", "Listicle", "FAQ Roundup"],
  commercial: ["Comparison Post", "Best-Of Roundup", "Product Review", "Buyer's Guide", "Case Study"],
  transactional: ["Landing Page", "Product Page", "Pricing Guide", "Free Tool Page"],
  navigational: ["Pillar Page", "Resource Hub", "Glossary"],
};

const titleCase = (s: string) => s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());

/** Content Calendar (content_calendar_generator). */
export const contentCalendar: Runner = async (input) => {
  const keywords = need(keywordList(input.keywords, input.csv, 500), "Enter topics/keywords or upload a CSV.");
  const weeks = num(input.weeks, 12, 1, 52);
  const perWeek = num(input.postsPerWeek, 3, 1, 7);
  let start: Date;
  if (str(input.startDate)) {
    start = new Date(`${str(input.startDate)}T00:00:00Z`);
    if (Number.isNaN(start.getTime())) throw new ToolInputError("Start date must be YYYY-MM-DD.");
  } else {
    const today = new Date();
    start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    start.setUTCDate(start.getUTCDate() + (((8 - start.getUTCDay()) % 7) || 7)); // next Monday
  }

  // Topic clusters: the most shared meaningful word of each keyword.
  const wordFreq = new Map<string, number>();
  const sig = (k: string) => [...new Set((k.toLowerCase().match(/\p{L}{3,}/gu) ?? []).filter((w) => !STOP_WORDS.has(w) && !/^(best|top|how|what|why|guide|review|buy|price|tips|vs)$/.test(w)))];
  for (const k of keywords) for (const w of sig(k)) wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);
  const clusterOf = (k: string) => {
    const ws = sig(k).sort((a, b) => (wordFreq.get(b) ?? 0) - (wordFreq.get(a) ?? 0));
    return ws.length && (wordFreq.get(ws[0]) ?? 0) > 1 ? ws[0] : "general";
  };

  const order = { high: 0, medium: 1, low: 2 } as const;
  const intentOrder: Record<string, number> = { commercial: 0, transactional: 1, informational: 2, navigational: 3 };
  const intentOf = (kw: string) => {
    const k = kw.toLowerCase();
    if (/\b(buy|price|coupon|deal|discount|order|shop)\b/.test(k)) return "transactional";
    if (/\b(best|top|review|vs|compare|alternative)\b/.test(k)) return "commercial";
    return "informational";
  };
  const data = keywords
    .map((keyword) => {
      const n = keyword.split(/\s+/).length;
      return { keyword, intent: intentOf(keyword), priority: (n >= 4 ? "high" : n >= 2 ? "medium" : "low") as keyof typeof order, cluster: clusterOf(keyword) };
    })
    .sort((a, b) => order[a.priority] - order[b.priority] || intentOrder[a.intent] - intentOrder[b.intent]);

  const offsets = perWeek === 3 ? [0, 2, 4] : Array.from({ length: perWeek }, (_, i) => Math.floor((i * 7) / perWeek));
  const rows: { week: number; date: Date; kw: (typeof data)[number]; type: string; title: string; words: number; cycle: number }[] = [];
  let idx = 0;
  for (let week = 1; week <= weeks; week++) {
    for (let post = 0; post < perWeek; post++) {
      const cycle = Math.floor(idx / data.length);
      const kw = data[idx % data.length];
      const types = CONTENT_TYPES[kw.intent] ?? CONTENT_TYPES.informational;
      // On a repeat cycle the keyword gets the next format, so it isn't the same post twice.
      const type = types[(idx % data.length + cycle) % types.length];
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + (week - 1) * 7 + offsets[post % offsets.length]);
      const K = titleCase(kw.keyword);
      const year = date.getUTCFullYear();
      const titles: Record<string, string> = {
        "Ultimate Guide": `The Ultimate Guide to ${K}`,
        "How-To Tutorial": `How to ${K}: Step-by-Step Guide`,
        Listicle: `10 Best ${K} Tips for ${year}`,
        "Comparison Post": `${K}: Complete Comparison Guide`,
        "Best-Of Roundup": `Best ${K} in ${year} (Expert Picks)`,
        "Product Review": `${K} Review: Pros, Cons & Verdict`,
      };
      rows.push({ week, date, kw, type, title: titles[type] ?? `${type}: ${K}`, words: type === "Ultimate Guide" || type === "Buyer's Guide" ? 2000 : type.includes("Guide") ? 1500 : 1000, cycle });
      idx++;
    }
  }

  // With an AI provider: better titles than the templates.
  let titleNote = "Titles from the script's templates.";
  const config = await getAiConfig();
  if (config && input.aiTitles !== false && input.aiTitles !== "false") {
    try {
      const unique = [...new Map(rows.map((r) => [`${r.kw.keyword}|${r.type}`, r])).values()].slice(0, 120);
      const res = await aiJson<{ titles?: string[] }>(
        `Write one compelling, SEO-friendly blog post title (under 65 characters, includes the keyword naturally) for each line "keyword | content format". Year: ${start.getUTCFullYear()}. Return {"titles":["…"]} in the same order.\n\n${unique.map((r, i) => `${i + 1}. ${r.kw.keyword} | ${r.type}`).join("\n")}`,
        config
      );
      const map = new Map(unique.map((r, i) => [`${r.kw.keyword}|${r.type}`, res.titles?.[i]]));
      for (const r of rows) r.title = map.get(`${r.kw.keyword}|${r.type}`) || r.title;
      titleNote = `Titles written by AI (${AI_PROVIDERS[config.provider].label}).`;
    } catch (e) {
      titleNote = `Template titles (AI failed: ${(e as Error).message.slice(0, 100)}).`;
    }
  }

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const day = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  const clusters = new Map<string, number>();
  for (const d of data) clusters.set(d.cluster, (clusters.get(d.cluster) ?? 0) + 1);
  const issues: string[] = [];
  if (rows.length > data.length) issues.push(`${rows.length} slots but only ${data.length} keywords — keywords repeat with a different format (see "Round"). Add more keywords for a calendar without repeats.`);
  return {
    headline: `${weeks} weeks × ${perWeek} posts — ${fmt(rows[0].date)} to ${fmt(rows[rows.length - 1].date)}`,
    stats: [
      { label: "Total posts", value: rows.length },
      { label: "Keywords", value: data.length },
      { label: "High priority", value: data.filter((d) => d.priority === "high").length },
      { label: "Topic clusters", value: clusters.size },
    ],
    issues: issues.length ? issues : undefined,
    sections: [
      {
        kind: "table",
        title: "Calendar",
        note: titleNote,
        columns: ["Week", "Publish date", "Day", "Keyword", "Intent", "Cluster", "Content type", "Priority", "Suggested title", "Target words", "Round", "Status"],
        rows: rows.map((r): Cell[] => [r.week, fmt(r.date), day(r.date), r.kw.keyword, r.kw.intent, r.kw.cluster, r.type, r.kw.priority, r.title, r.words, r.cycle + 1, "planned"]),
      },
      { kind: "table", title: "Topic clusters", columns: ["Cluster", "Keywords"], rows: [...clusters.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]): Cell[] => [c, n]) },
    ],
  };
};
