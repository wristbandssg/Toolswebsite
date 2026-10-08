import { loadPage, cleanText, urlList } from "../html";
import { sentences } from "../text";
import { tfidf, topTerms } from "../vectors";
import type { Cell } from "../types";
import { type Runner, str, num, bool, lines, need, perUrl, round, ToolInputError } from "./util";

// On-page & content tools, part 2 — ports of meta_description_generator.py,
// title_tag_optimizer.py, faq_schema_generator.py,
// structured_data_generator.py, content_repurposer.py,
// content_length_benchmarker.py, tfidf_extractor.py and sentiment_analyzer.py.

/** Meta Description Generator (meta_description_generator). */
export const metaDescriptionGenerator: Runner = async (input) => {
  const url = need(str(input.url), "Enter a URL.");
  const kw = str(input.keyword).toLowerCase();
  const variants = num(input.variants, 3, 1, 8);
  const p = await loadPage(url);
  const h1 = cleanText(p.root.querySelector("h1"));
  const paras = p.root.querySelectorAll("p").map(cleanText).filter((t) => t.length > 30);
  const sents = sentences(paras.join(" "), 1).filter((s) => s.length > 40 && s.length < 200);
  const cut = (s: string) => (s.length > 155 ? `${s.slice(0, 155).replace(/\s+\S*$/, "")}…` : s);
  const out: { text: string; strategy: string }[] = [];
  const kwSentence = kw && sents.find((s) => s.toLowerCase().includes(kw));
  if (kwSentence) out.push({ text: cut(kwSentence), strategy: "keyword sentence" });
  const opener = h1 || p.title;
  if (opener && paras[0]) {
    let d = `${opener.slice(0, 60)}. ${paras[0].slice(0, 120).replace(/\s+\S*$/, "")}…`;
    if (d.length > 160) d = `${d.slice(0, 157)}…`;
    out.push({ text: d, strategy: "title + intro" });
  }
  sents
    .slice(0, 20)
    .map((s, i) => ({ s, score: (kw && s.toLowerCase().includes(kw) ? 50 : 0) + Math.max(0, 20 - i * 2) + (s.length >= 100 && s.length <= 155 ? 15 : 0) + (/\b(learn|discover|find|guide|best|top|calculate|estimate)\b/i.test(s) ? 10 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .forEach(({ s }) => out.push({ text: cut(s), strategy: "best sentence" }));
  if (kw && paras[0]) {
    const snippet = paras[0].slice(0, 80).replace(/\s+\S*$/, "");
    for (const t of [`Learn about ${kw}. ${snippet}… Read our complete guide.`, `Looking for ${kw}? ${snippet}… Find out more here.`, `Your guide to ${kw}: ${snippet}…`]) if (t.length <= 160) out.push({ text: t, strategy: "template" });
  }
  const unique = [...new Map(out.map((o) => [o.text, o])).values()].slice(0, variants);
  if (!unique.length) throw new ToolInputError("The page doesn't have enough paragraph text to build a description from.");
  return {
    headline: `Current: ${p.metaDescription ? `"${p.metaDescription}" (${p.metaDescription.length} chars)` : "none"}`,
    sections: [
      {
        kind: "table",
        title: "Suggestions",
        columns: ["Description", "Strategy", "Length", "120–160", "Keyword"],
        rows: unique.map((o): Cell[] => [o.text, o.strategy, o.text.length, o.text.length >= 120 && o.text.length <= 160 ? "✅" : "⚠️", kw ? (o.text.toLowerCase().includes(kw) ? "✅" : "❌") : "—"]),
      },
    ],
  };
};

const POWER = new Set("ultimate best top proven free easy quick fast simple complete guide essential powerful amazing incredible secret hack boost instant guaranteed step expert exclusive comprehensive definitive".split(" "));
const NEGATIVE = new Set("worst avoid never mistake wrong bad terrible horrible".split(" "));
const EMOTIONAL = new Set("surprising shocking unbelievable amazing stunning incredible remarkable extraordinary mindblowing heartbreaking".split(" "));

function scoreTitle(title: string, kw: string) {
  const lower = title.toLowerCase();
  const words = new Set(lower.match(/[a-z]+/g) ?? []);
  let score = 50;
  const factors: [string, number][] = [];
  const f = (d: string, p: number) => ((score += p), factors.push([d, p]));
  const len = title.length;
  if (len >= 50 && len <= 60) f("Length: ideal (50–60)", 10);
  else if (len >= 40 && len < 50) f("Length: acceptable", 5);
  else if (len > 60) f("Length: truncated in search results", -5);
  else if (len < 30) f("Length: too short", -10);
  if (/\d/.test(title)) f("Contains a number", 8);
  const pw = [...words].filter((w) => POWER.has(w));
  if (pw.length) f(`Power words: ${pw.join(", ")}`, Math.min(pw.length * 4, 12));
  const ew = [...words].filter((w) => EMOTIONAL.has(w));
  if (ew.length) f(`Emotional triggers: ${ew.join(", ")}`, 5);
  const nw = [...words].filter((w) => NEGATIVE.has(w));
  if (nw.length) f(`Curiosity/negative: ${nw.join(", ")}`, 5);
  if (/\b20\d{2}\b/.test(title)) f("Contains a year (freshness)", 5);
  if (/[[(]/.test(title)) f("Has brackets (CTR boost)", 5);
  if (title.endsWith("?") || /^(how|what|why|when|where|who)\b/i.test(title)) f("Question format", 5);
  if (kw) {
    const pos = lower.indexOf(kw);
    if (pos === 0) f("Keyword at the start", 10);
    else if (pos > 0 && pos < 20) f("Keyword near the start", 5);
    else if (pos >= 20) f("Keyword present but late", 2);
    else f("Target keyword missing", -10);
  }
  if (/ [|—-] /.test(title)) f("Brand separator present", 2);
  if ((title.match(/\b[A-Z]{3,}\b/g) ?? []).length > 2) f("Too many ALL CAPS words", -5);
  score = Math.min(Math.max(score, 0), 100);
  const suggestions: string[] = [];
  if (len > 60) suggestions.push(`Shorten to under 60 characters (now ${len})`);
  if (len < 40) suggestions.push("Add more descriptive words");
  if (!/\d/.test(title)) suggestions.push("Add a number (e.g. '7 Best…', 'Top 10…')");
  if (!pw.length) suggestions.push("Add a power word (best, ultimate, proven, guide)");
  if (!/\b20\d{2}\b/.test(title)) suggestions.push("Add the current year for freshness");
  if (!/[[(]/.test(title)) suggestions.push("Add brackets, e.g. [2026 Guide] or (Free)");
  if (kw && !lower.includes(kw)) suggestions.push(`Include the keyword "${kw}"`);
  if (kw && lower.indexOf(kw) > 20) suggestions.push("Move the keyword closer to the beginning");
  return { score, grade: score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : "D", factors, suggestions };
}

/** Title Optimizer (title_tag_optimizer). */
export const titleOptimizer: Runner = async (input) => {
  const kw = str(input.keyword).toLowerCase();
  const titles = lines(input.titles, 200);
  for (const url of urlList(input.urls, 20)) titles.push((await loadPage(url)).title);
  need(titles.filter(Boolean), "Enter titles or page URLs.");
  const rows = titles.filter(Boolean).map((t) => ({ t, ...scoreTitle(t, kw) }));
  return {
    sections: [
      {
        kind: "table",
        title: "Titles",
        columns: ["Grade", "Score", "Title", "Length", "Factors", ...(bool(input.suggest) ? ["Suggestions"] : [])],
        rows: rows.map((r): Cell[] => [r.grade, r.score, r.t, r.t.length, r.factors.map(([d, p]) => `${p > 0 ? "+" : ""}${p} ${d}`).join("; "), ...(bool(input.suggest) ? [r.suggestions.join("; ") || "—"] : [])]),
      },
    ],
  };
};

/** TF-IDF Terms (tfidf_extractor). */
export const tfidfTerms: Runner = async (input) => {
  const urls = urlList(input.urls, 15);
  const docs: { label: string; text: string }[] = [];
  const results = await perUrl(urls, async (u) => (await loadPage(u)).mainText);
  for (const r of results) if (r.ok) docs.push({ label: r.url, text: r.value });
  if (str(input.text)) docs.push({ label: "Pasted text", text: str(input.text) });
  need(docs, "Enter URLs or paste text.");
  const top = num(input.top, 30, 5, 100);
  const t = tfidf(docs.map((d) => d.text), { ngramMin: num(input.ngramMin, 1, 1, 3), ngramMax: num(input.ngramMax, 3, 1, 4), maxFeatures: 2000 });
  return {
    headline: `${docs.length} document(s)${docs.length === 1 ? " — add more documents for sharper IDF weights" : ""}`,
    issues: results.filter((r) => !r.ok).map((r) => `${r.url}: failed — ${(r as { error: string }).error}`),
    sections: docs.map((d, i) => ({ kind: "table" as const, title: `Top ${top} terms — ${d.label}`, columns: ["Term", "TF-IDF"], rows: topTerms(t.features, t.matrix[i], top).map(([term, s]): Cell[] => [term, round(s, 5)]) })),
  };
};

