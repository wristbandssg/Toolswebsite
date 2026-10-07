import { loadPage, headingsOf, linksOf, urlList, dateSignals, cleanText, type LoadedPage } from "../html";
import { readability, gradeLabel, sentences, letterWords, syllables, wordCount, ngramCounts, topEntries } from "../text";
import { tfidf, topTerms, columnMeans } from "../vectors";
import { getAiConfig, aiJson } from "@/lib/ai/provider";
import type { Cell, ReportSection } from "../types";
import { type Runner, str, num, need, perUrl, grade, round, ToolInputError } from "./util";

// On-page & content tools, part 1 — ports of readability_analyzer.py,
// sentence_complexity.py, word_frequency_analyzer.py + ngram_analyzer.py,
// thin_content_detector.py, content_freshness_scorer.py,
// content_optimizer.py and question_extractor.py.

/** Text to analyse: a fetched page's main content, or text pasted by the admin. */
export async function textSource(input: Record<string, unknown>): Promise<{ text: string; label: string; page?: LoadedPage }> {
  const url = str(input.url);
  if (url) {
    const page = await loadPage(url);
    return { text: page.mainText, label: page.page.finalUrl, page };
  }
  const text = str(input.text);
  if (!text) throw new ToolInputError("Enter a URL or paste some text.");
  return { text, label: "Pasted text" };
}

/** Readability (readability_analyzer). */
export const readabilityTool: Runner = async (input) => {
  const { text, label } = await textSource(input);
  const r = readability(text);
  if (!r) throw new ToolInputError("Not enough text to analyse.");
  const lens = sentences(text, 4).map((s) => (s.match(/[\p{L}\p{N}]+/gu) ?? []).length);
  return {
    headline: `${label} — ${gradeLabel(r.fleschKincaidGrade)}`,
    stats: [
      { label: "Flesch Reading Ease", value: r.fleschReadingEase },
      { label: "Flesch-Kincaid Grade", value: r.fleschKincaidGrade },
      { label: "Words", value: r.words },
      { label: "Sentences", value: r.sentences },
    ],
    passed: r.fleschKincaidGrade >= 6 && r.fleschKincaidGrade <= 10 ? ["Grade level is in the 6–10 range recommended for most web content"] : undefined,
    issues: r.fleschKincaidGrade > 10 ? [`Grade ${r.fleschKincaidGrade} is hard for most readers — aim for grade 6–10`] : undefined,
    sections: [
      {
        kind: "table",
        title: "All metrics",
        columns: ["Metric", "Value"],
        rows: [
          ["Total syllables", r.syllables],
          ["Avg sentence length (words)", r.avgSentenceLength],
          ["Avg syllables per word", r.avgSyllablesPerWord],
          ["Complex words (3+ syllables) %", r.complexWordsPct],
          ["Long words (7+ letters) %", r.longWordsPct],
          ["Gunning Fog", r.gunningFog],
          ["Coleman-Liau", r.colemanLiau],
          ["ARI", r.ari],
          ["SMOG", r.smog],
          ["Short sentences (<10 words) %", round((lens.filter((l) => l < 10).length / lens.length) * 100)],
          ["Medium sentences (10–20) %", round((lens.filter((l) => l >= 10 && l <= 20).length / lens.length) * 100)],
          ["Long sentences (>20) %", round((lens.filter((l) => l > 20).length / lens.length) * 100)],
          ["Very long sentences (>35)", lens.filter((l) => l > 35).length],
          ["Longest sentence (words)", Math.max(...lens)],
        ],
      },
    ],
  };
};

function isPassive(s: string) {
  return /\b(is|are|was|were|been|being|be)\s+\w+(ed|en)\b|\b(got|get|gets|getting)\s+\w+ed\b/i.test(s);
}

/** Sentence Complexity (sentence_complexity). */
export const sentenceComplexity: Runner = async (input) => {
  const { text, label } = await textSource(input);
  const threshold = num(input.threshold, 30, 0, 100);
  const rows = sentences(text, 11)
    .map((s) => {
      const words = letterWords(s);
      if (!words.length) return null;
      const syl = words.map(syllables);
      const avg = syl.reduce((a, b) => a + b, 0) / words.length;
      const complex = syl.filter((x) => x >= 3).length;
      const long = words.filter((w) => w.length > 10).length;
      const passive = isPassive(s);
      let score = 0;
      if (words.length > 35) score += 40;
      else if (words.length > 25) score += 25;
      if (complex / words.length > 0.3) score += 20;
      if (avg > 2) score += 15;
      if (passive) score += 10;
      if (long > 2) score += 10;
      const issues: string[] = [];
      if (words.length > 25) issues.push(`long (${words.length} words)`);
      if (complex > 3) issues.push(`${complex} complex words`);
      if (passive) issues.push("passive voice");
      if (long > 2) issues.push(`${long} very long words`);
      return { s, words: words.length, avg: round(avg, 2), complex, passive, score: Math.min(score, 100), issues };
    })
    .filter((r): r is NonNullable<typeof r> => !!r);
  if (!rows.length) throw new ToolInputError("Not enough sentences to analyse.");
  const flagged = rows.filter((r) => r.score >= threshold);
  const pct = (n: number) => `${n} (${round((n / rows.length) * 100, 0)}%)`;
  return {
    headline: label,
    stats: [
      { label: "Sentences", value: rows.length },
      { label: `Flagged (score ≥ ${threshold})`, value: pct(flagged.length) },
      { label: "Passive voice", value: pct(rows.filter((r) => r.passive).length) },
      { label: "Avg length", value: `${round(rows.reduce((a, r) => a + r.words, 0) / rows.length)} words` },
      { label: "Easy / Medium / Hard", value: `${rows.filter((r) => r.score < 15).length} / ${rows.filter((r) => r.score >= 15 && r.score < 35).length} / ${rows.filter((r) => r.score >= 35).length}` },
    ],
    sections: [
      { kind: "table", title: "Most complex sentences", columns: ["Score", "Sentence", "Words", "Issues"], rows: flagged.sort((a, b) => b.score - a.score).slice(0, 50).map((r): Cell[] => [r.score, r.s.slice(0, 220), r.words, r.issues.join("; ")]) },
      { kind: "table", title: "All sentences", columns: ["Score", "Sentence", "Words", "Avg syllables", "Passive"], rows: rows.map((r): Cell[] => [r.score, r.s.slice(0, 220), r.words, r.avg, r.passive ? "yes" : ""]) },
    ],
  };
};

/** Word Frequency & N-grams (word_frequency_analyzer + ngram_analyzer). */
export const wordFrequency: Runner = async (input) => {
  const { text, label, page } = await textSource(input);
  const top = num(input.top, 30, 5, 100);
  const maxN = num(input.maxN, 3, 1, 5);
  const totalWords = (text.match(/\p{L}+/gu) ?? []).length;
  const sections: ReportSection[] = [];
  for (let n = 1; n <= maxN; n++) {
    const name = n === 1 ? "Words" : n === 2 ? "2-word phrases" : n === 3 ? "3-word phrases" : `${n}-word phrases`;
    sections.push({ kind: "table", title: `Top ${name}`, columns: [name, "Count"], rows: topEntries(ngramCounts(text, n), top).map(([g, c]): Cell[] => [g, c]) });
  }
  const keywords = str(input.keywords).split(/\n|,/).map((k) => k.trim()).filter(Boolean).slice(0, 30);
  if (keywords.length) {
    const lower = text.toLowerCase();
    const title = page?.title.toLowerCase() ?? "";
    const h1 = page ? headingsOf(page.root, "h1").map((h) => h.text).join(" ").toLowerCase() : "";
    const h2 = page ? headingsOf(page.root, "h2").map((h) => h.text).join(" ").toLowerCase() : "";
    const firstPara = (page?.root.querySelectorAll("p").map((p) => cleanText(p)).find((t) => t.length > 30) ?? lower.slice(0, 300)).toLowerCase();
    sections.unshift({
      kind: "table",
      title: "Keyword density & prominence",
      note: "Density 0.5–2.5% is the usual target. Prominence (0–100) rewards the keyword in the title, H1, H2s, first paragraph and early in the text.",
      columns: ["Keyword", "Count", "Density %", "Prominence", "Status"],
      rows: keywords.map((kw): Cell[] => {
        const k = kw.toLowerCase();
        const count = lower.split(k).length - 1;
        const density = (count * k.split(/\s+/).length) / Math.max(totalWords, 1) * 100;
        let prom = 0;
        if (title.includes(k)) prom += 30;
        if (h1.includes(k)) prom += 25;
        if (h2.includes(k)) prom += 15;
        if (firstPara.includes(k)) prom += 15;
        const pos = lower.indexOf(k);
        if (pos >= 0) prom += Math.max(0, 15 * (1 - pos / Math.max(lower.length, 1)));
        return [kw, count, round(density, 3), round(prom), density >= 0.5 && density <= 2.5 ? "✅" : "⚠️"];
      }),
    });
  }
  return { headline: `${label} — ${totalWords} words`, sections };
};

/** Thin Content (thin_content_detector). */
export const thinContent: Runner = async (input) => {
  const minWords = num(input.minWords, 300, 50, 5000);
  const results = await perUrl(need(urlList(input.urls, 30), "Enter at least one URL."), async (url) => {
    const p = await loadPage(url);
    const words = wordCount(p.mainText);
    const sents = sentences(p.mainText, 6);
    const paras = p.root.querySelectorAll("p").filter((x) => cleanText(x).length > 20).length;
    const ratio = (Buffer.byteLength(p.mainText) / Math.max(p.page.bytes, 1)) * 100;
    const seen = new Map<string, number>();
    for (const s of sents) seen.set(s.toLowerCase(), (seen.get(s.toLowerCase()) ?? 0) + 1);
    const dupSentences = [...seen.values()].filter((c) => c > 1).length;
    const issues: string[] = [];
    if (words < minWords) issues.push(`Thin content (${words} words < ${minWords})`);
    if (ratio < 10) issues.push(`Low text ratio (${round(ratio)}%)`);
    if (paras < 2) issues.push("Very few paragraphs");
    if (dupSentences > 5) issues.push(`High sentence duplication (${dupSentences})`);
    return { words, sents: sents.length, paras, images: p.root.querySelectorAll("img").length, links: linksOf(p.root, p.page.finalUrl).length, kb: round(p.page.bytes / 1024), ratio: round(ratio), dupSentences, issues };
  });
  const thin = results.filter((r) => r.ok && r.value.issues.length).length;
  return {
    headline: `${thin} of ${results.length} page(s) flagged as thin (min ${minWords} words)`,
    sections: [
      {
        kind: "table",
        title: "Pages",
        columns: ["Status", "URL", "Words", "Sentences", "Paragraphs", "Images", "Links", "HTML KB", "Text ratio %", "Duplicate sentences", "Issues"],
        rows: results.map((r): Cell[] =>
          r.ok
            ? [r.value.issues.length ? "🔴 THIN" : "🟢 OK", r.url, r.value.words, r.value.sents, r.value.paras, r.value.images, r.value.links, r.value.kb, r.value.ratio, r.value.dupSentences, r.value.issues.join("; ") || "Passes checks"]
            : ["⚠️", r.url, "", "", "", "", "", "", "", "", `Failed: ${r.error}`]
        ),
      },
    ],
  };
};

const OUTDATED: [RegExp, string][] = [
  [/\b201[0-8]\b/, "Old year reference"],
  [/\b(flash player|internet explorer|windows xp|windows 7|python 2|php 5)\b/i, "Outdated technology"],
  [/\b(google\+|google plus|vine app)\b/i, "Defunct platform"],
];

/** Content Freshness (content_freshness_scorer). */
export const contentFreshness: Runner = async (input) => {
  const results = await perUrl(need(urlList(input.urls, 20), "Enter at least one URL."), async (url) => {
    const p = await loadPage(url);
    let score = 50;
    const factors: [string, number][] = [];
    const dates = dateSignals(p.root, p.page.headers);
    if (dates.length) {
      const newest = dates.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
      const days = Math.floor((Date.now() - newest.date.getTime()) / 86_400_000);
      if (days <= 30) (score += 25), factors.push([`Recently updated (${days}d ago, ${newest.source})`, 25]);
      else if (days <= 90) (score += 15), factors.push([`Updated ${days}d ago`, 15]);
      else if (days <= 365) (score += 5), factors.push([`Updated ${days}d ago`, 5]);
      else (score -= 15), factors.push([`Not updated in ${days}d`, -15]);
    } else (score -= 10), factors.push(["No date signals found (add <time> or article:modified_time)", -10]);
    const year = new Date().getFullYear();
    if (p.fullText.includes(String(year))) (score += 10), factors.push([`Mentions the current year (${year})`, 10]);
    else if (p.fullText.includes(String(year - 1))) (score += 5), factors.push([`Mentions ${year - 1}`, 5]);
    for (const [re, desc] of OUTDATED) {
      const m = p.fullText.match(re);
      if (m) (score -= 10), factors.push([`Outdated: ${desc} (${m[0]})`, -10]);
    }
    if (/\b(updated|revised|last updated|modified)\b.{0,60}\b20\d{2}\b/i.test(p.fullText)) (score += 5), factors.push(["Shows an 'updated' date in the text", 5]);
    score = Math.min(Math.max(score, 0), 100);
    return { score, factors, dates: dates.map((d) => `${d.source}: ${d.date.toISOString().slice(0, 10)}`) };
  });
  return {
    sections: [
      {
        kind: "table",
        title: "Freshness",
        columns: ["URL", "Score", "Grade", "Dates found", "Factors"],
        rows: results.map((r): Cell[] =>
          r.ok ? [r.url, r.value.score, grade(r.value.score), r.value.dates.join("; ") || "none", r.value.factors.map(([d, p]) => `${p > 0 ? "+" : ""}${p} ${d}`).join("; ")] : [r.url, "", "", "", `Failed: ${r.error}`]
        ),
      },
    ],
  };
};

/** Named entities via the AI provider (the spaCy part of the Python originals). Null without a provider. */
export async function aiEntities(text: string): Promise<{ entity: string; type: string; count: number }[] | null> {
  const config = await getAiConfig();
  if (!config) return null;
  const data = await aiJson<{ entities?: { entity: string; type: string; count?: number }[] }>(
    `List the named entities in the text below — people, organisations, places, products, laws/programmes, events, dates, money amounts — with a type label (PERSON, ORG, GPE, PRODUCT, LAW, EVENT, DATE, MONEY, OTHER) and how many times each appears. Return {"entities":[{"entity":"…","type":"…","count":1}]}, most important first, at most 50.\n\nTEXT:\n${text.slice(0, 24_000)}`,
    config
  );
  return (data.entities ?? []).filter((e) => e?.entity).map((e) => ({ entity: String(e.entity), type: String(e.type ?? "OTHER"), count: Number(e.count) || 1 }));
}

/** Content Optimizer (content_optimizer): SEO score from title/meta/H1/density/length/readability/headings/links/entities. */
export const contentOptimizer: Runner = async (input) => {
  const kw = need(str(input.keyword), "Enter the target keyword.").toLowerCase();
  const { text, label, page } = await textSource(input);
  const r = readability(text);
  if (!r) throw new ToolInputError("Not enough text to analyse.");
  const title = page?.title ?? "";
  const meta = page?.metaDescription ?? "";
  const hs = page ? headingsOf(page.root) : [];
  const internal = page ? linksOf(page.root, page.page.finalUrl).filter((l) => l.internal).length : 0;
  const external = page ? linksOf(page.root, page.page.finalUrl).filter((l) => !l.internal).length : 0;
  const lower = text.toLowerCase();
  const freq = lower.split(kw).length - 1;
  const density = round(((freq * kw.split(/\s+/).length) / Math.max(r.words, 1)) * 100, 2);
  const entities = await aiEntities(text).catch(() => null);

  const details: [string, number, number][] = [];
  const add = (label: string, pts: number, max: number) => details.push([label, pts, max]);
  add("Title contains keyword", title.toLowerCase().includes(kw) ? 15 : 0, 15);
  add("Meta description contains keyword", meta.toLowerCase().includes(kw) ? 10 : 0, 10);
  add("H1 contains keyword", hs.some((h) => h.level === 1 && h.text.toLowerCase().includes(kw)) ? 10 : 0, 10);
  add(`Keyword density ${density}% (ideal 0.5–2.5%)`, density >= 0.5 && density <= 2.5 ? 10 : density > 0 ? 5 : 0, 10);
  add(`Word count: ${r.words} (1500+ ideal)`, r.words >= 1500 ? 15 : r.words >= 800 ? 10 : r.words >= 300 ? 5 : 0, 15);
  const fk = r.fleschKincaidGrade;
  add(`Readability FK grade: ${fk} (6–12 ideal)`, fk >= 6 && fk <= 12 ? 10 : fk >= 4 && fk <= 14 ? 5 : 0, 10);
  const h2 = hs.filter((h) => h.level === 2).length;
  const h3 = hs.filter((h) => h.level === 3).length;
  add(`Heading structure (H2s: ${h2}, H3s: ${h3})`, (h2 >= 2 ? 5 : 0) + (h3 >= 1 ? 5 : 0), 10);
  add(`Internal links: ${internal}`, internal >= 3 ? 10 : internal >= 1 ? 5 : 0, 10);
  if (entities) {
    const unique = new Set(entities.map((e) => e.entity.toLowerCase())).size;
    add(`Unique entities: ${unique}`, unique >= 10 ? 10 : unique >= 5 ? 5 : 0, 10);
  }
  const got = details.reduce((a, d) => a + d[1], 0);
  const max = details.reduce((a, d) => a + d[2], 0);
  const score = Math.round((got / max) * 100);

  const paras = text.split(/\n{2,}|(?<=[.!?])\s{2,}/).filter((p) => p.trim().length > 20);
  const t = tfidf(paras.length > 1 ? paras : [text], { ngramMin: 1, ngramMax: 3, maxFeatures: 500 });
  const terms = topTerms(t.features, columnMeans(t.matrix), 30);

  return {
    headline: `${label} — target "${kw}"`,
    score,
    grade: grade(score),
    stats: [
      { label: "Keyword frequency", value: freq },
      { label: "Keyword density", value: `${density}%` },
      { label: "Internal / external links", value: page ? `${internal} / ${external}` : "n/a (pasted text)" },
    ],
    issues: entities ? undefined : ["Entity check skipped — connect an AI provider (Marketing → AI Settings) to include it. The score is out of the remaining checks."],
    sections: [
      { kind: "table", title: "Score breakdown", columns: ["Check", "Points", "Max"], rows: details.map(([l, p, m]): Cell[] => [l, p, m]) },
      { kind: "table", title: "Top TF-IDF terms", columns: ["Term", "Score"], rows: terms.map(([term, s]): Cell[] => [term, round(s, 4)]) },
      ...(entities ? [{ kind: "table" as const, title: "Entities (AI)", columns: ["Entity", "Type", "Count"], rows: entities.map((e): Cell[] => [e.entity, e.type, e.count]) }] : []),
      ...(page ? [{ kind: "table" as const, title: "Headings", columns: ["Tag", "Text"], rows: hs.map((h): Cell[] => [h.tag, h.text]) }] : []),
    ],
  };
};

const QUESTION_START = /^(how|what|why|when|where|who|which|can|does|is|are|do|will|should)\b/i;

/** Question Finder (question_extractor): questions in the content and headings, plus suggested FAQ/PAA questions. */
export const questionFinder: Runner = async (input) => {
  const { text, label, page } = await textSource(input);
  const kw = str(input.keyword);
  const found = [...new Set(text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.endsWith("?") && s.length > 10))];
  const headingQs = page ? headingsOf(page.root).filter((h) => h.text.includes("?") || QUESTION_START.test(h.text)) : [];
  const generated: string[] = [];
  if (kw) {
    const year = new Date().getFullYear();
    generated.push(`What is the best ${kw}?`, `How to choose ${kw}?`, `Why do you need ${kw}?`, `${kw} vs alternatives?`, `How much does ${kw} cost?`, `Is ${kw} worth it?`, `What are the top ${kw} in ${year}?`, `How to get started with ${kw}?`);
  }
  let aiQuestions: string[] | null = null;
  const config = await getAiConfig();
  if (config) {
    const data = await aiJson<{ questions?: string[] }>(
      `Read the content below${kw ? ` about "${kw}"` : ""} and list 15 questions real searchers ask that this page should answer (good for an FAQ section and Google's "People also ask"). Use the entities and topics in the text. Return {"questions":["…"]}.\n\nCONTENT:\n${text.slice(0, 20_000)}`,
      config
    ).catch(() => null);
    aiQuestions = data?.questions?.map(String).filter(Boolean) ?? null;
  }
  return {
    headline: label,
    stats: [
      { label: "Questions in content", value: found.length },
      { label: "Question headings", value: headingQs.length },
      { label: "Suggested", value: generated.length + (aiQuestions?.length ?? 0) },
    ],
    issues: config ? undefined : ["Connect an AI provider (Marketing → AI Settings) to also get questions based on the page's entities and topics."],
    sections: [
      { kind: "list", title: "Questions found in the content", items: found.length ? found.slice(0, 100) : ["None found."] },
      { kind: "table", title: "Question-style headings", columns: ["Tag", "Heading"], rows: headingQs.map((h): Cell[] => [h.tag, h.text]) },
      ...(aiQuestions ? [{ kind: "list" as const, title: "Suggested questions (AI, from the page's topics)", items: aiQuestions }] : []),
      ...(generated.length ? [{ kind: "list" as const, title: `Suggested questions for "${kw}"`, items: generated }] : []),
    ],
  };
};

