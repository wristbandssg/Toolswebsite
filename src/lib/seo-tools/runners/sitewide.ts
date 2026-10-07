import { loadPage, headingsOf, urlList } from "../html";
import { round, wordCount } from "../text";
import { tfidf, similarityMatrix, cosine, columnMeans, kmeans, silhouette, nmf } from "../vectors";
import { mapLimit } from "../fetch-page";
import { embedTexts, extractEntities, keywordList, heuristicEntities } from "../semantic";
import { getAiConfig, aiJson, AI_PROVIDERS } from "@/lib/ai/provider";
import { loadDocs, type Doc } from "./keywords";
import { textSource } from "./content-a";
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

/** Semantic Similarity (semantic_similarity). */
export const semanticSimilarity: Runner = async (input) => {
  const { docs, failed } = await loadDocs(urlList(input.urls, 20));
  const pasted = str(input.texts)
    .split(/\n\s*---+\s*\n|\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
  const items = [...docs.map((d) => ({ label: d.url, text: d.text })), ...pasted.map((t) => ({ label: t.slice(0, 60), text: t }))];
  if (items.length < 2) throw new ToolInputError("Need at least 2 items — URLs, or texts separated by a blank line.");
  const emb = await embedTexts(items.map((i) => i.text.split(/\s+/).slice(0, 512).join(" ")), { short: items.every((i) => i.text.length < 200) });
  const sim = similarityMatrix(emb.vectors);
  // Embeddings and TF-IDF use different scales; TF-IDF cosine runs lower.
  const cut = emb.ai ? [0.8, 0.6, 0.4] : [0.6, 0.4, 0.2];
  const tag = (s: number) => (s > cut[0] ? "VERY SIMILAR" : s > cut[1] ? "SIMILAR" : s > cut[2] ? "MODERATE" : "DIFFERENT");
  const pairs = pairsOf(items.length)
    .map(([i, j]) => [sim[i][j], items[i].label, items[j].label] as const)
    .sort((a, b) => b[0] - a[0]);
  const sections: ReportSection[] = [
    { kind: "table", title: "Pairs, most similar first", note: `Method: ${emb.method}`, columns: ["Similarity", "Verdict", "A", "B"], rows: pairs.map(([s, a, b]): Cell[] => [round(s, 3), tag(s), a, b]) },
    { kind: "table", title: "Similarity matrix", columns: ["", ...items.map((_, i) => `#${i + 1}`)], rows: sim.map((r, i): Cell[] => [`#${i + 1} ${items[i].label.slice(0, 50)}`, ...r.map((v) => round(v, 3))]) },
  ];
  if (items.length === 2) {
    // Paragraph-level comparison of the two items.
    const paras = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z])/).reduce<string[]>((acc, s) => {
      const last = acc[acc.length - 1];
      if (last && last.length < 300) acc[acc.length - 1] = `${last} ${s}`;
      else acc.push(s);
      return acc;
    }, []).filter((p) => p.length > 50).slice(0, 60);
    const pa = paras(items[0].text);
    const pb = paras(items[1].text);
    if (pa.length && pb.length) {
      const e = await embedTexts([...pa, ...pb]);
      const best = pa
        .flatMap((a, i) => pb.map((b, j) => [cosine(e.vectors[i], e.vectors[pa.length + j]), a, b] as const))
        .sort((x, y) => y[0] - x[0])
        .slice(0, 10);
      sections.push({ kind: "table", title: "Most similar passages", columns: ["Similarity", "A", "B"], rows: best.map(([s, a, b]): Cell[] => [round(s, 3), a.slice(0, 200), b.slice(0, 200)]) });
    }
  }
  return { headline: `${items.length} items compared`, stats: [{ label: "Items", value: items.length }, { label: "Method", value: emb.ai ? "AI embeddings" : "TF-IDF" }], sections: [...sections, ...failedList(failed)] };
};

/** Picks k by silhouette (k = 2 … min(30, n/5)), on a sample for speed. */
function bestK(vectors: number[][]) {
  const maxK = Math.min(30, Math.floor(vectors.length / 5));
  if (maxK < 2) return { k: Math.min(2, vectors.length), score: 0 };
  const sample = vectors.length > 400 ? vectors.filter((_, i) => i % Math.ceil(vectors.length / 400) === 0) : vectors;
  const candidates = [...new Set([2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 22, 26, 30].filter((k) => k <= maxK).concat(maxK))];
  let best = { k: 2, score: -1 };
  for (const k of candidates) {
    if (k >= sample.length) break;
    const { labels } = kmeans(sample, k, 25);
    const s = silhouette(sample, labels);
    if (s > best.score) best = { k, score: s };
  }
  return best;
}

/** DBSCAN with cosine distance (eps 0.45, min 2 — as the Python default). */
function dbscan(vectors: number[][], eps: number, minPts = 2): number[] {
  const n = vectors.length;
  const labels = new Array(n).fill(-2); // -2 unvisited, -1 noise
  const neighbours = (i: number) => vectors.map((v, j) => (j !== i && 1 - cosine(vectors[i], v) <= eps ? j : -1)).filter((j) => j >= 0);
  let c = 0;
  for (let i = 0; i < n; i++) {
    if (labels[i] !== -2) continue;
    const nb = neighbours(i);
    if (nb.length + 1 < minPts) {
      labels[i] = -1;
      continue;
    }
    labels[i] = c;
    const queue = [...nb];
    while (queue.length) {
      const j = queue.shift()!;
      if (labels[j] === -1) labels[j] = c;
      if (labels[j] !== -2) continue;
      labels[j] = c;
      const nb2 = neighbours(j);
      if (nb2.length + 1 >= minPts) queue.push(...nb2);
    }
    c++;
  }
  return labels;
}

/** Keyword Clustering (keyword_clustering). */
export const keywordClustering: Runner = async (input) => {
  const keywords = need(keywordList(input.keywords, input.csv, 1000), "Enter keywords or upload a CSV.");
  if (keywords.length < 4) throw new ToolInputError("Enter at least 4 keywords.");
  const algorithm = str(input.algorithm) || "kmeans";
  const fixedK = num(input.clusters, 0, 0, 100);
  const emb = await embedTexts(keywords, { short: true });
  let labels: number[];
  let note = "";
  if (algorithm === "dbscan") {
    labels = dbscan(emb.vectors, emb.ai ? 0.45 : 0.6);
    note = `DBSCAN (cosine eps ${emb.ai ? 0.45 : 0.6}, min 2); -1 = unclustered.`;
  } else {
    const chosen = fixedK ? { k: Math.min(fixedK, keywords.length), score: NaN } : bestK(emb.vectors);
    labels = kmeans(emb.vectors, chosen.k, 50).labels;
    note = fixedK ? `k-means, k = ${chosen.k}.` : `k-means, k = ${chosen.k} chosen by silhouette (${round(chosen.score, 3)}).`;
  }
  // Cluster name = keyword nearest the centroid.
  const ids = [...new Set(labels)].sort((a, b) => a - b);
  const names = new Map<number, string>();
  for (const id of ids) {
    if (id === -1) {
      names.set(id, "Unclustered");
      continue;
    }
    const members = labels.map((l, i) => (l === id ? i : -1)).filter((i) => i >= 0);
    const centroid = columnMeans(members.map((i) => emb.vectors[i]));
    const rep = members.reduce((best, i) => (cosine(emb.vectors[i], centroid) > cosine(emb.vectors[best], centroid) ? i : best), members[0]);
    names.set(id, keywords[rep]);
  }
  // With a chat AI: short human topic names for each cluster.
  const config = await getAiConfig();
  let aiNames: Map<number, string> | null = null;
  if (config && input.aiNames !== false && input.aiNames !== "false") {
    try {
      const groups = ids.filter((id) => id !== -1).slice(0, 60);
      const res = await aiJson<{ names?: string[] }>(
        `Give each keyword group a short topic name (2–4 words). Return {"names":["…"]} in the same order.\n\n${groups.map((id, n) => `${n + 1}. ${labels.map((l, i) => (l === id ? keywords[i] : "")).filter(Boolean).slice(0, 15).join("; ")}`).join("\n")}`,
        config
      );
      aiNames = new Map(groups.map((id, n) => [id, res.names?.[n] ?? ""]));
    } catch {
      aiNames = null;
    }
  }
  const sizes = ids.map((id) => [id, labels.filter((l) => l === id).length] as const).sort((a, b) => b[1] - a[1]);
  const rows = keywords.map((k, i) => [labels[i], k] as const).sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
  return {
    headline: `${keywords.length} keywords → ${ids.filter((i) => i !== -1).length} clusters`,
    stats: [
      { label: "Keywords", value: keywords.length },
      { label: "Clusters", value: ids.filter((i) => i !== -1).length },
      { label: "Unclustered", value: labels.filter((l) => l === -1).length },
      { label: "Vectors", value: emb.ai ? "AI embeddings" : "TF-IDF" },
    ],
    sections: [
      {
        kind: "table",
        title: "Clusters",
        note: `${note} Vectors: ${emb.method}.${aiNames ? ` Topic names by AI (${AI_PROVIDERS[config!.provider].label}).` : ""}`,
        columns: aiNames ? ["Cluster", "Topic (AI)", "Representative keyword", "Keywords"] : ["Cluster", "Representative keyword", "Keywords"],
        rows: sizes.map(([id, n]): Cell[] => (aiNames ? [id, aiNames.get(id) ?? "", names.get(id) ?? "", n] : [id, names.get(id) ?? "", n])),
      },
      { kind: "table", title: "Keywords by cluster", columns: ["Keyword", "Cluster id", "Cluster name"], rows: rows.map(([l, k]): Cell[] => [k, l, aiNames?.get(l) || names.get(l) || ""]) },
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

/** Topic Modeler (topic_modeler). */
export const topicModeler: Runner = async (input) => {
  const { docs, failed } = await loadDocs(urlList(input.urls, 30));
  const pasted = str(input.texts).split(/\n\s*---+\s*\n/).map((t) => t.trim()).filter((t) => t.length > 100);
  const items = [...docs.map((d) => ({ label: d.url, text: d.text })), ...pasted.map((t, i) => ({ label: `Text ${i + 1}`, text: t }))];
  if (items.length < 2) throw new ToolInputError("Need at least 2 documents.");
  const k = num(input.topics, 8, 2, 20);
  const { topics, shares } = topicModel(items.map((i) => i.text), k, 2, 2000, 10);
  const names = await aiTopicNames(topics);
  const label = (id: number) => names?.[id] || topics[id].label;
  return {
    headline: `${topics.length} topics in ${items.length} documents`,
    stats: [
      { label: "Documents", value: items.length },
      { label: "Topics", value: topics.length },
    ],
    sections: [
      { kind: "table", title: "Topics", note: `NMF on TF-IDF (1–2 word terms).${names ? " Names by AI." : ""}`, columns: ["Topic", "Name", "Top terms"], rows: topics.map((t): Cell[] => [t.id, label(t.id), t.terms.map(([w, v]) => `${w} (${round(v, 3)})`).join(", ")]) },
      {
        kind: "table",
        title: "Document assignments",
        columns: ["Document", "Dominant topic", "Share"],
        rows: items.map((it, i): Cell[] => {
          const d = shares[i].indexOf(Math.max(...shares[i]));
          return [it.label, `${d}: ${label(d)}`, round(shares[i][d], 3)];
        }),
      },
      { kind: "table", title: "Document × topic matrix", columns: ["Document", ...topics.map((t) => `T${t.id}`)], rows: items.map((it, i): Cell[] => [it.label, ...shares[i].map((v) => round(v, 3))]) },
      ...failedList(failed),
    ],
  };
};

/** Topic Authority (topic_authority_scorer). */
export const topicAuthority: Runner = async (input) => {
  const topic = need(str(input.topic), "Enter the topic.");
  const { docs, failed } = await sitePages(input, 1, 30);
  const topicLower = topic.toLowerCase();
  const totalWords = docs.reduce((a, d) => a + d.words, 0);
  const t = tfidf(docs.map((d) => d.text), { ngramMin: 1, ngramMax: 2, maxFeatures: 1000 });
  const uniqueTerms = columnMeans(t.matrix).filter((v) => v > 0.01).length;
  const mentions = docs.reduce((a, d) => a + (d.text.toLowerCase().split(topicLower).length - 1), 0);
  const headingMentions = docs.reduce((a, d) => a + d.headings.filter((h) => h.toLowerCase().includes(topicLower)).length, 0);
  const ents = await extractEntities(docs.map((d) => d.text.slice(0, 30_000 / docs.length + 2000)).join("\n\n"), 200);
  const entityCount = new Set(ents.entities.map((e) => e.entity.toLowerCase())).size;
  let coherence = 1;
  let coherenceMethod = "single page";
  if (docs.length > 1) {
    const emb = await embedTexts(docs.map((d) => d.text.split(/\s+/).slice(0, 256).join(" ")));
    const sim = similarityMatrix(emb.vectors);
    const ps = pairsOf(docs.length);
    coherence = ps.reduce((a, [i, j]) => a + sim[i][j], 0) / ps.length;
    coherenceMethod = emb.method;
  }
  const coverage = Math.min(25, docs.length * 2.5 + totalWords / 2000);
  const relevance = Math.min(25, mentions * 0.5 + headingMentions * 3);
  const diversity = Math.min(25, entityCount * 0.3 + uniqueTerms * 0.05);
  const coh = Math.max(0, coherence) * 25;
  const total = round(coverage + relevance + diversity + coh, 1);
  const tips: string[] = [];
  if (coverage < 15) tips.push(`Coverage ${round(coverage)}/25 — publish more pages on "${topic}" (each page adds 2.5, every 2,000 words adds 1).`);
  if (relevance < 15) tips.push(`Relevance ${round(relevance)}/25 — mention "${topic}" more, especially in headings (each heading mention adds 3).`);
  if (diversity < 15) tips.push(`Diversity ${round(diversity)}/25 — cover more related entities (people, tools, organisations) and subtopics.`);
  if (coh < 12) tips.push(`Coherence ${round(coh)}/25 — the pages drift apart; keep them focused on the same subject and interlink them.`);
  return {
    headline: `Topical authority for "${topic}"`,
    score: Math.round(total),
    grade: grade(total),
    stats: [
      { label: "Pages", value: docs.length },
      { label: "Total words", value: totalWords },
      { label: "Topic mentions", value: mentions },
      { label: "In headings", value: headingMentions },
      { label: "Unique entities", value: entityCount },
      { label: "Unique terms", value: uniqueTerms },
    ],
    issues: tips.length ? tips : undefined,
    sections: [
      {
        kind: "table",
        title: "Score breakdown",
        columns: ["Part", "Score", "Max", "Based on"],
        rows: [
          ["Coverage", round(coverage), 25, `${docs.length} pages, ${totalWords} words`],
          ["Relevance", round(relevance), 25, `${mentions} mentions, ${headingMentions} in headings`],
          ["Diversity", round(diversity), 25, `${entityCount} entities (${ents.method}), ${uniqueTerms} terms`],
          ["Coherence", round(coh), 25, `avg similarity ${round(coherence, 3)} (${coherenceMethod})`],
        ],
      },
      { kind: "table", title: "Pages", columns: ["URL", "Title", "Words", "Topic mentions"], rows: docs.map((d): Cell[] => [d.url, d.title.slice(0, 70), d.words, d.text.toLowerCase().split(topicLower).length - 1]) },
      ...failedList(failed),
    ],
  };
};

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

/** Entity Analysis (entity_analysis): entities with salience, semantic groups and subject-verb-object triples. */
export const entityAnalysis: Runner = async (input) => {
  const { text, label } = await textSource(input);
  if (text.length < 50) throw new ToolInputError("Not enough text to analyse.");
  const config = await getAiConfig();
  let entities: { entity: string; type: string; count: number }[];
  let triples: { subject: string; verb: string; object: string }[] = [];
  let groups: { name: string; members: string[] }[] = [];
  let method: string;
  if (config) {
    try {
      const res = await aiJson<{ entities?: { entity: string; type: string; count?: number }[]; triples?: { subject: string; verb: string; object: string }[]; groups?: { name: string; members: string[] }[] }>(
        `Analyse the text for SEO entity optimisation.\n1. "entities": every named entity (PERSON, ORG, GPE, PRODUCT, LAW, EVENT, DATE, MONEY, WORK_OF_ART, NORP, OTHER) with how many times it appears — at most 80.\n2. "triples": up to 50 subject–verb–object facts stated in the text (verb as a lemma, e.g. "offer").\n3. "groups": the entities grouped into 2–10 semantic groups, each with a short name.\nReturn {"entities":[{"entity":"…","type":"…","count":1}],"triples":[{"subject":"…","verb":"…","object":"…"}],"groups":[{"name":"…","members":["…"]}]}.\n\nTEXT:\n${text.slice(0, 30_000)}`,
        config
      );
      entities = (res.entities ?? []).filter((e) => e?.entity).map((e) => ({ entity: String(e.entity), type: String(e.type ?? "OTHER"), count: Number(e.count) || 1 }));
      triples = (res.triples ?? []).filter((t) => t?.subject && t?.object).slice(0, 50);
      groups = (res.groups ?? []).filter((g) => g?.name && Array.isArray(g.members));
      method = `AI (${AI_PROVIDERS[config.provider].label})`;
    } catch (e) {
      entities = heuristicEntities(text, 80);
      method = `Built-in (AI failed: ${(e as Error).message.slice(0, 100)})`;
    }
  } else {
    entities = heuristicEntities(text, 80);
    method = "Built-in proper-noun detection — add an AI key in AI Settings for full entity types, groups and fact triples";
  }
  // Salience = 0.6 × relative frequency + 0.4 × how early it first appears (as the Python).
  const counted = entities.map((e) => {
    const escaped = e.entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu");
    const hits = [...text.matchAll(re)];
    return { ...e, count: hits.length || e.count, first: hits[0]?.index ?? text.length };
  });
  const maxCount = Math.max(1, ...counted.map((e) => e.count));
  const scored = counted
    .map(({ first, ...e }) => ({ ...e, firstPct: round((first / text.length) * 100, 1), salience: round(0.6 * (e.count / maxCount) + 0.4 * (1 - first / text.length), 4) }))
    .sort((a, b) => b.salience - a.salience);
  if (!groups.length && scored.length >= 5) {
    // Without AI groups: cluster entity names (embeddings or character TF-IDF).
    const names = scored.slice(0, 50).map((e) => e.entity);
    const emb = await embedTexts(names, { short: true });
    const k = Math.min(Math.max(2, Math.floor(names.length / 5)), 10);
    const { labels } = kmeans(emb.vectors, k, 30);
    groups = [...new Set(labels)].map((id) => ({ name: `Group ${id + 1}`, members: names.filter((_, i) => labels[i] === id) }));
  }
  const types = new Map<string, number>();
  for (const e of scored) types.set(e.type, (types.get(e.type) ?? 0) + 1);
  return {
    headline: label,
    stats: [
      { label: "Entities", value: scored.length },
      ...[...types.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, c]) => ({ label: t, value: c })),
    ],
    sections: [
      { kind: "table", title: "Entities by salience", note: `Method: ${method}. Salience = 60% frequency + 40% how early it first appears.`, columns: ["Entity", "Type", "Count", "First seen at %", "Salience"], rows: scored.map((e): Cell[] => [e.entity, e.type, e.count, e.firstPct, e.salience]) },
      { kind: "table", title: "Semantic groups", columns: ["Group", "Entities"], rows: groups.map((g): Cell[] => [g.name, g.members.join(", ")]) },
      triples.length
        ? { kind: "table", title: "Facts (subject – verb – object)", columns: ["Subject", "Verb", "Object"], rows: triples.map((t): Cell[] => [t.subject, t.verb, t.object]) }
        : { kind: "text", title: "Facts (subject – verb – object)", text: "Fact extraction needs an AI provider (AI Settings) — the Python version used spaCy's dependency parser." },
    ],
  };
};
