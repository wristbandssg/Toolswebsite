import { STOP_WORDS, tokens } from "./text";

// Vector maths for the content tools, matching scikit-learn's defaults where
// the Python originals used it: TfidfVectorizer (english stop words, n-grams,
// smooth idf, l2-normalised rows), cosine similarity, k-means and NMF.

export interface TfidfResult {
  features: string[];
  /** One l2-normalised row per document. */
  matrix: number[][];
  /** Document frequency of each feature. */
  df: number[];
}

function ngrams(doc: string, min: number, max: number): string[] {
  const words = tokens(doc).filter((w) => !STOP_WORDS.has(w));
  const out: string[] = [];
  for (let n = min; n <= max; n++) for (let i = 0; i + n <= words.length; i++) out.push(words.slice(i, i + n).join(" "));
  return out;
}

export function tfidf(docs: string[], opts: { ngramMin?: number; ngramMax?: number; maxFeatures?: number; useIdf?: boolean } = {}): TfidfResult {
  const { ngramMin = 1, ngramMax = 1, maxFeatures = 2000, useIdf = true } = opts;
  const counts = docs.map((d) => {
    const m = new Map<string, number>();
    for (const g of ngrams(d, ngramMin, ngramMax)) m.set(g, (m.get(g) ?? 0) + 1);
    return m;
  });
  const total = new Map<string, number>();
  const df = new Map<string, number>();
  for (const m of counts) {
    for (const [g, c] of m) {
      total.set(g, (total.get(g) ?? 0) + c);
      df.set(g, (df.get(g) ?? 0) + 1);
    }
  }
  // max_features keeps the terms with the highest corpus frequency.
  const features = [...total.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, maxFeatures)
    .map(([g]) => g)
    .sort();
  const n = docs.length;
  const idf = features.map((f) => (useIdf ? Math.log((1 + n) / (1 + (df.get(f) ?? 0))) + 1 : 1));
  const matrix = counts.map((m) => {
    const row = features.map((f, j) => (m.get(f) ?? 0) * idf[j]);
    const norm = Math.sqrt(row.reduce((a, v) => a + v * v, 0)) || 1;
    return row.map((v) => v / norm);
  });
  return { features, matrix, df: features.map((f) => df.get(f) ?? 0) };
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function similarityMatrix(rows: number[][]): number[][] {
  return rows.map((a) => rows.map((b) => cosine(a, b)));
}

/** Column means of a matrix. */
export function columnMeans(rows: number[][]): number[] {
  if (!rows.length) return [];
  const out = new Array(rows[0].length).fill(0);
  for (const r of rows) for (let j = 0; j < r.length; j++) out[j] += r[j];
  return out.map((v) => v / rows.length);
}

/** Top-n (feature, score) pairs of one row. */
export function topTerms(features: string[], row: number[], n: number): [string, number][] {
  return row
    .map((v, j) => [features[j], v] as [string, number])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

/** Seeded random numbers, so results are repeatable (random_state=42 in the originals). */
function rng(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** k-means (k-means++ init, cosine-friendly when rows are l2-normalised). */
export function kmeans(rows: number[][], k: number, iterations = 50): { labels: number[]; centroids: number[][] } {
  const rand = rng();
  const dist = (a: number[], b: number[]) => a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);
  const centroids: number[][] = [rows[Math.floor(rand() * rows.length)]];
  while (centroids.length < k) {
    const d = rows.map((r) => Math.min(...centroids.map((c) => dist(r, c))));
    const sum = d.reduce((a, b) => a + b, 0);
    let pick = rand() * sum;
    let idx = 0;
    while (idx < d.length - 1 && (pick -= d[idx]) > 0) idx++;
    centroids.push(rows[idx]);
  }
  let labels = new Array(rows.length).fill(0);
  for (let it = 0; it < iterations; it++) {
    const next = rows.map((r) => {
      let best = 0;
      let bestD = Infinity;
      centroids.forEach((c, j) => {
        const dd = dist(r, c);
        if (dd < bestD) (bestD = dd), (best = j);
      });
      return best;
    });
    const changed = next.some((l, i) => l !== labels[i]);
    labels = next;
    for (let j = 0; j < k; j++) {
      const members = rows.filter((_, i) => labels[i] === j);
      if (members.length) centroids[j] = columnMeans(members);
    }
    if (!changed && it > 0) break;
  }
  return { labels, centroids };
}

/** Mean silhouette score (cosine distance), sampled for speed. */
export function silhouette(rows: number[][], labels: number[], sample = 400): number {
  const idx = rows.map((_, i) => i).slice(0, sample);
  const d = (a: number[], b: number[]) => 1 - cosine(a, b);
  let total = 0;
  let n = 0;
  for (const i of idx) {
    const own = idx.filter((j) => j !== i && labels[j] === labels[i]);
    if (!own.length) continue;
    const a = own.reduce((s, j) => s + d(rows[i], rows[j]), 0) / own.length;
    const others = [...new Set(labels)].filter((l) => l !== labels[i]);
    if (!others.length) continue;
    const b = Math.min(...others.map((l) => {
      const m = idx.filter((j) => labels[j] === l);
      return m.reduce((s, j) => s + d(rows[i], rows[j]), 0) / Math.max(m.length, 1);
    }));
    total += (b - a) / Math.max(a, b);
    n++;
  }
  return n ? total / n : 0;
}

/** Non-negative matrix factorisation (multiplicative updates): X ≈ W·H. */
export function nmf(X: number[][], k: number, iterations = 200): { W: number[][]; H: number[][] } {
  const rand = rng();
  const n = X.length;
  const m = X[0]?.length ?? 0;
  const W = Array.from({ length: n }, () => Array.from({ length: k }, () => rand() + 0.01));
  const H = Array.from({ length: k }, () => Array.from({ length: m }, () => rand() + 0.01));
  const eps = 1e-9;
  for (let it = 0; it < iterations; it++) {
    // H ← H ∘ (WᵀX) / (WᵀWH)
    const WtW = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => W.reduce((s, r) => s + r[a] * r[b], 0)));
    for (let a = 0; a < k; a++) {
      for (let j = 0; j < m; j++) {
        let num = 0;
        for (let i = 0; i < n; i++) num += W[i][a] * X[i][j];
        let den = 0;
        for (let b = 0; b < k; b++) den += WtW[a][b] * H[b][j];
        H[a][j] *= num / (den + eps);
      }
    }
    // W ← W ∘ (XHᵀ) / (WHHᵀ)
    const HHt = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => H[a].reduce((s, v, j) => s + v * H[b][j], 0)));
    for (let i = 0; i < n; i++) {
      for (let a = 0; a < k; a++) {
        let num = 0;
        for (let j = 0; j < m; j++) num += X[i][j] * H[a][j];
        let den = 0;
        for (let b = 0; b < k; b++) den += W[i][b] * HHt[b][a];
        W[i][a] *= num / (den + eps);
      }
    }
  }
  return { W, H };
}
