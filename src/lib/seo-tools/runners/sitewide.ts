import { loadPage, headingsOf, urlList } from "../html";
import { round, wordCount } from "../text";
import { tfidf, similarityMatrix, nmf } from "../vectors";
import { mapLimit } from "../fetch-page";
import { getAiConfig, aiJson } from "@/lib/ai/provider";
import { loadDocs, type Doc } from "./keywords";
import type { Cell, ReportSection } from "../types";
import { type Runner, str, num, need, grade, ToolInputError } from "./util";

// Site-wide content and the ML tools — ports of keyword_cannibalization.py,
// content_similarity_checker.py, content_pruning_analyzer.py,
// semantic_similarity.py, keyword_clustering.py, topic_modeler.py,
// topic_authority_scorer.py, content_gap_mapper.py and entity_analysis.py.
// Where the Python used spaCy or sentence-transformers, the AI provider
// (AI Settings) does that work; without one, a built-in method runs instead.

const failedList = (failed: string[]): ReportSection[] => (failed.length ? [{ kind: "list", title: "Pages that couldn't be loaded", items: failed, tone: "bad" }] : []);
const pairsOf = (n: number) => Array.from({ length: n }, (_, i) => Array.from({ length: n - i - 1 }, (_, k) => [i, i + k + 1] as const)).flat();

async function sitePages(input: Record<string, unknown>, min: number, max = 50) {
  const { docs, failed } = await loadDocs(urlList(input.urls, max));
  if (docs.length < min) throw new ToolInputError(`Need at least ${min} pages that load.`);
  return { docs, failed };
}

/** Keyword Cannibalization (keyword_cannibalization). */
export const cannibalization: Runner = async (input) => {
  const threshold = num(input.threshold, 0.5, 0.1, 0.99);
  const { docs, failed } = await sitePages(input, 2);
  const t = tfidf(docs.map((d) => d.text), { ngramMin: 1, ngramMax: 2, maxFeatures: 1000 });
  const sim = similarityMatrix(t.matrix);
  const conflicts = pairsOf(docs.length)
    .filter(([i, j]) => sim[i][j] >= threshold)
    .map(([i, j]) => {
      const shared = t.features
        .map((f, k): [string, number] => [f, t.matrix[i][k] > 0.05 && t.matrix[j][k] > 0.05 ? (t.matrix[i][k] + t.matrix[j][k]) / 2 : 0])
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([f]) => f);
      const s = sim[i][j];
      return { a: docs[i], b: docs[j], s, shared, severity: s >= 0.7 ? "HIGH" : s >= 0.5 ? "MEDIUM" : "LOW" };
    })
    .sort((x, y) => y.s - x.s);
  const high = conflicts.filter((c) => c.severity === "HIGH").length;
  return {
    headline: `${docs.length} pages, ${conflicts.length} conflict(s) at similarity ≥ ${threshold}`,
    score: Math.max(0, 100 - high * 15 - (conflicts.length - high) * 5),
    grade: grade(Math.max(0, 100 - high * 15 - (conflicts.length - high) * 5)),
    stats: [
      { label: "Pages", value: docs.length },
      { label: "Conflicts", value: conflicts.length },
      { label: "High", value: high },
    ],
    passed: conflicts.length ? undefined : ["No cannibalization at this threshold"],
    sections: [
      {
        kind: "table",
        title: "Competing pages",
        note: "Pages that target the same terms compete with each other in search. Merge them, or make each one clearly about a different keyword.",
        columns: ["Severity", "Similarity", "Page A", "Title A", "Page B", "Title B", "Shared terms"],
        rows: conflicts.map((c): Cell[] => [c.severity, round(c.s, 3), c.a.url, c.a.title.slice(0, 60), c.b.url, c.b.title.slice(0, 60), c.shared.join(", ")]),
      },
      ...failedList(failed),
    ],
  };
};

// MinHash over 5-word shingles: 128 universal hashes of a 32-bit FNV-1a base hash.
function fnv(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
const P = 4294967311; // prime > 2^32
const HASHES = Array.from({ length: 128 }, (_, i) => [((i + 1) * 2654435761) % P, ((i + 7) * 40503 * 97) % P] as const);
function shingles(text: string, k = 5) {
  const w = text.toLowerCase().split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(" "));
  return out;
}
function minhash(sh: Set<string>) {
  const sig = new Array(128).fill(Infinity);
  for (const s of sh) {
    const h = fnv(s);
    for (let i = 0; i < 128; i++) {
      // (a·h + b) mod P without losing precision: split h into 16-bit halves.
      const [a, b] = HASHES[i];
      const v = (((a * (h >>> 16)) % P) * 65536 + a * (h & 0xffff) + b) % P;
      if (v < sig[i]) sig[i] = v;
    }
  }
  return sig;
}

/** Duplicate Content (content_similarity_checker). */
export const duplicateContent: Runner = async (input) => {
  const threshold = num(input.threshold, 0.7, 0.1, 1);
  const method = str(input.method) || "both";
  const { docs, failed } = await sitePages(input, 2);
  const sigs = method !== "cosine" ? docs.map((d) => minhash(shingles(d.text))) : [];
  const cos = method !== "minhash" ? similarityMatrix(tfidf(docs.map((d) => d.text), { maxFeatures: 2000 }).matrix) : [];
  const rows = pairsOf(docs.length)
    .map(([i, j]) => {
      const mh = sigs.length ? sigs[i].filter((v, k) => v === sigs[j][k]).length / 128 : null;
      const c = cos.length ? cos[i][j] : null;
      return { a: docs[i].url, b: docs[j].url, mh, c };
    })
    .filter((r) => (r.mh ?? 0) >= threshold || (r.c ?? 0) >= threshold)
    .sort((x, y) => (y.mh ?? 0) + (y.c ?? 0) - ((x.mh ?? 0) + (x.c ?? 0)));
  return {
    headline: `${docs.length} pages, ${rows.length} near-duplicate pair(s)`,
    stats: [
      { label: "Pages", value: docs.length },
      { label: "Duplicate pairs", value: rows.length },
      { label: "Threshold", value: threshold },
    ],
    passed: rows.length ? undefined : ["No duplicates at this threshold"],
    sections: [
      {
        kind: "table",
        title: "Near-duplicate pages",
        note: "MinHash = share of identical 5-word passages (copied text). Cosine = same vocabulary (same topic, possibly reworded).",
        columns: ["Page A", "Page B", "MinHash", "Cosine"],
        rows: rows.map((r): Cell[] => [r.a, r.b, r.mh == null ? "" : round(r.mh, 3), r.c == null ? "" : round(r.c, 3)]),
      },
      ...failedList(failed),
    ],
  };
};

/** Content Pruning (content_pruning_analyzer). */
export const contentPruning: Runner = async (input) => {
  const urls = urlList(input.urls, 50);
  need(urls, "Enter the page URLs.");
  const pages = await mapLimit(urls, 4, async (url) => {
    try {
      const p = await loadPage(url);
      const modified = p.root.querySelector('meta[property="article:modified_time"]')?.getAttribute("content") || p.root.querySelector('meta[property="article:published_time"]')?.getAttribute("content");
      const d = modified ? new Date(modified) : null;
      return {
        url: p.page.finalUrl,
        title: p.title,
        h1: headingsOf(p.root, "h1")[0]?.text ?? "",
        words: wordCount(p.mainText),
        status: p.page.status,
        days: d && !Number.isNaN(d.getTime()) ? Math.floor((Date.now() - d.getTime()) / 86_400_000) : null,
        text: p.mainText,
        error: "",
      };
    } catch (e) {
      return { url, title: "", h1: "", words: 0, status: 0, days: null, text: "", error: (e as Error).message };
    }
  });
  const withText = pages.filter((p) => p.text);
  const sim = withText.length > 1 ? similarityMatrix(tfidf(withText.map((p) => p.text), { maxFeatures: 1000 }).matrix) : [];
  const results = pages.map((p) => {
    const actions: string[] = [];
    if (p.error) actions.push(`FIX — couldn't load (${p.error})`);
    else if (p.words < 200) actions.push("DELETE or MERGE — extremely thin content");
    else if (p.words < 500) actions.push("EXPAND or MERGE — thin content");
    if (p.days != null && p.days > 730) actions.push("UPDATE — not modified in 2+ years");
    else if (p.days != null && p.days > 365) actions.push("REVIEW — not modified in 1+ year");
    const i = withText.indexOf(p);
    if (i >= 0 && sim.length) {
      const best = sim[i].map((s, j): [number, number] => [s, j]).filter(([, j]) => j !== i).sort((a, b) => b[0] - a[0])[0];
      if (best && best[0] > 0.8) actions.push(`MERGE — very similar to ${withText[best[1]].url} (${round(best[0], 3)})`);
      else if (best && best[0] > 0.6) actions.push(`DIFFERENTIATE — overlaps with ${withText[best[1]].url} (${round(best[0], 3)})`);
    }
    if (p.status >= 400) actions.push(`FIX — HTTP ${p.status}`);
    if (!actions.length) actions.push("KEEP — no issues detected");
    const all = actions.join("; ");
    const priority = /DELETE|MERGE|FIX/.test(all) ? "HIGH" : /UPDATE|EXPAND/.test(all) ? "MEDIUM" : "LOW";
    return { ...p, action: all, priority };
  });
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 } as Record<string, number>;
  results.sort((a, b) => order[a.priority] - order[b.priority]);
  const high = results.filter((r) => r.priority === "HIGH").length;
  const med = results.filter((r) => r.priority === "MEDIUM").length;
  return {
    headline: `${pages.length} pages reviewed`,
    stats: [
      { label: "High priority", value: high },
      { label: "Medium", value: med },
      { label: "Keep", value: results.length - high - med },
    ],
    sections: [
      {
        kind: "table",
        title: "Recommendations",
        columns: ["Priority", "URL", "Title", "Words", "Days since update", "Status", "Action"],
        rows: results.map((r): Cell[] => [r.priority, r.url, r.title.slice(0, 60), r.words, r.days ?? "?", r.status || "", r.action]),
      },
    ],
  };
};

/** Topics with NMF on TF-IDF; returns topic terms and the document × topic weights. */
function topicModel(texts: string[], k: number, ngramMax: number, maxFeatures: number, termsPer: number) {
  const t = tfidf(texts, { ngramMin: 1, ngramMax, maxFeatures });
  const n = Math.max(1, Math.min(k, texts.length, t.features.length));
  const { W, H } = nmf(t.matrix, n, 200);
  const used = new Set<string>();
  const topics = H.map((row, id) => {
    const terms = row.map((v, j): [string, number] => [t.features[j], v]).sort((a, b) => b[1] - a[1]).slice(0, termsPer);
    // Label = top term, or the next term not already labelling another topic.
    const label = terms.find(([w]) => !used.has(w))?.[0] ?? terms[0]?.[0] ?? "";
    used.add(label);
    return { id, label, terms };
  });
  // Rows of W normalised to sum 1, so they read as topic shares.
  const shares = W.map((r) => {
    const s = r.reduce((a, b) => a + b, 0) || 1;
    return r.map((v) => v / s);
  });
  return { topics, W, shares };
}

async function aiTopicNames(topics: { terms: [string, number][] }[]): Promise<string[] | null> {
  const config = await getAiConfig();
  if (!config) return null;
  try {
    const res = await aiJson<{ names?: string[] }>(`Name each topic from its top terms (2–4 words). Return {"names":["…"]} in the same order.\n\n${topics.map((t, i) => `${i + 1}. ${t.terms.map(([w]) => w).join(", ")}`).join("\n")}`, config);
    return res.names ?? null;
  } catch {
    return null;
  }
}

/** Content Gap Map (content_gap_mapper). */
export const contentGapMapper: Runner = async (input) => {
  const [mine, theirs] = await Promise.all([loadDocs(urlList(input.myUrls, 20)), loadDocs(urlList(input.competitorUrls, 20))]);
  if (!mine.docs.length || !theirs.docs.length) throw new ToolInputError("Need pages that load from both sides.");
  const k = num(input.topics, 15, 2, 30);
  const all: Doc[] = [...mine.docs, ...theirs.docs];
  const { topics, W } = topicModel(all.map((d) => d.text), k, 3, 1000, 5);
  const names = await aiTopicNames(topics);
  const n = mine.docs.length;
  const rows = topics.map((t) => {
    const my = Math.max(...W.slice(0, n).map((r) => r[t.id]));
    const comp = Math.max(...W.slice(n).map((r) => r[t.id]));
    return { t, my, comp };
  });
  const gaps = rows
    .filter((r) => r.comp > 0.1 && r.my < r.comp * 0.3)
    .map((r) => ({ ...r, type: r.my < 0.05 ? "MISSING" : "WEAK" }))
    .sort((a, b) => b.comp - a.comp);
  const label = (id: number) => names?.[id] || topics[id].label;
  return {
    headline: `${input.topic ? `"${str(input.topic)}" — ` : ""}${gaps.length} topic gap(s)`,
    stats: [
      { label: "Your pages", value: mine.docs.length },
      { label: "Competitor pages", value: theirs.docs.length },
      { label: "Missing topics", value: gaps.filter((g) => g.type === "MISSING").length },
      { label: "Weak topics", value: gaps.filter((g) => g.type === "WEAK").length },
    ],
    passed: gaps.length ? undefined : ["You cover every subtopic the competitors cover"],
    sections: [
      { kind: "table", title: "Gaps", note: "Subtopics found by NMF across both sets of pages. Coverage = strongest weight of the topic in any page on that side.", columns: ["Priority", "Type", "Topic", "Terms", "Your coverage", "Competitor coverage"], rows: gaps.map((g): Cell[] => [g.type === "MISSING" ? "HIGH" : "MEDIUM", g.type, label(g.t.id), g.t.terms.map(([w]) => w).join(", "), round(g.my, 3), round(g.comp, 3)]) },
      { kind: "table", title: "All subtopics", columns: ["Topic", "Terms", "Your coverage", "Competitor coverage"], rows: rows.map((r): Cell[] => [label(r.t.id), r.t.terms.map(([w]) => w).join(", "), round(r.my, 3), round(r.comp, 3)]) },
      ...failedList([...mine.failed, ...theirs.failed]),
    ],
  };
};
