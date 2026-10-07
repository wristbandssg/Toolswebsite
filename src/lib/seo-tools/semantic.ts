import { getAiConfig, aiJson, aiCanEmbed, aiEmbed, AI_PROVIDERS } from "@/lib/ai/provider";
import { STOP_WORDS, tokens } from "./text";
import { tfidf } from "./vectors";

// The language-understanding parts of the Python toolkit (spaCy entities,
// sentence-transformer embeddings), done with the AI provider set at
// Marketing → AI Settings — or, when none is set (or it fails), with a
// built-in method so every tool still gives a result.

export interface Entity {
  entity: string;
  type: string;
  count: number;
}

/** Proper-noun phrases ("Google Search Console", "New York") counted in the text. */
export function heuristicEntities(text: string, max = 50): Entity[] {
  const counts = new Map<string, number>();
  const sentenceStarts = new Set<number>();
  for (const m of text.matchAll(/(?:^|[.!?]\s+)(\S)/g)) sentenceStarts.add((m.index ?? 0) + m[0].length - 1);
  for (const m of text.matchAll(/\b(?:[A-Z][\p{L}\d&'-]*|[A-Z]{2,}\d*)(?:\s+(?:of|de|the|and|&)?\s*(?:[A-Z][\p{L}\d&'-]*|[A-Z]{2,}\d*))*/gu)) {
    const phrase = m[0].trim().replace(/\s+(of|de|the|and|&)$/i, "").replace(/^(In|On|At|The|A|An|For|By|From|With|And|But|Or|To|As|If|When|Since)\s+(?=\S)/, "");
    const words = phrase.split(/\s+/);
    // A lone capitalised word at the start of a sentence is just grammar.
    if (words.length === 1 && (sentenceStarts.has(m.index ?? -1) || STOP_WORDS.has(phrase.toLowerCase()))) continue;
    if (phrase.length < 2 || /^\d+$/.test(phrase)) continue;
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }
  for (const m of text.matchAll(/(?:[$€£¥]\s?\d[\d,.]*\s?(?:k|m|bn|million|billion)?|\b\d[\d,.]*\s?(?:USD|EUR|GBP|dollars|percent|%))/gi)) {
    counts.set(m[0].trim(), (counts.get(m[0].trim()) ?? 0) + 1);
  }
  const typeOf = (e: string) =>
    /^[$€£¥]|USD|EUR|GBP|dollars/i.test(e) ? "MONEY" : /%|percent/i.test(e) ? "PERCENT" : /^(19|20)\d\d$/.test(e) || /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(e) ? "DATE" : /\b(Inc|Ltd|LLC|Corp|Company|Bank|University|Group)\b/.test(e) || /^[A-Z]{2,}$/.test(e) ? "ORG" : "PROPER NOUN";
  // A single word that's mostly written in lower case ("Search" in a heading, "search" in the text) is a common noun.
  const lowerCounts = new Map<string, number>();
  for (const w of text.match(/(?<!\p{L})\p{Ll}[\p{L}'-]*/gu) ?? []) lowerCounts.set(w, (lowerCounts.get(w) ?? 0) + 1);
  for (const [phrase, c] of counts) {
    if (!phrase.includes(" ") && !/^[A-Z]{2,}\d*$/.test(phrase) && (lowerCounts.get(phrase.toLowerCase()) ?? 0) >= c) counts.delete(phrase);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([entity, count]) => ({ entity, type: typeOf(entity), count }));
}

/** Named entities: the AI provider when set up, else proper-noun detection. */
export async function extractEntities(text: string, max = 50): Promise<{ entities: Entity[]; method: string }> {
  const config = await getAiConfig();
  if (config) {
    try {
      const data = await aiJson<{ entities?: { entity: string; type: string; count?: number }[] }>(
        `List the named entities in the text below — people, organisations, places, products, laws/programmes, events, dates, money amounts — with a type label (PERSON, ORG, GPE, PRODUCT, LAW, EVENT, DATE, MONEY, OTHER) and how many times each appears. Return {"entities":[{"entity":"…","type":"…","count":1}]}, most important first, at most ${max}.\n\nTEXT:\n${text.slice(0, 24_000)}`,
        config
      );
      const entities = (data.entities ?? []).filter((e) => e?.entity).map((e) => ({ entity: String(e.entity), type: String(e.type ?? "OTHER"), count: Number(e.count) || 1 }));
      return { entities: entities.slice(0, max), method: `AI (${AI_PROVIDERS[config.provider].label})` };
    } catch (e) {
      return { entities: heuristicEntities(text, max), method: `Built-in (AI failed: ${(e as Error).message.slice(0, 120)})` };
    }
  }
  return { entities: heuristicEntities(text, max), method: "Built-in proper-noun detection — add an AI key in AI Settings for spaCy-style entities" };
}

/** Word + character-4-gram TF-IDF: a usable stand-in for embeddings on short texts like keywords. */
function charTfidf(texts: string[]): number[][] {
  // Character 4-grams become pseudo-words ("zq_lo", "zqloan"…) so the word TF-IDF can weigh them.
  const expanded = texts.map((t) => {
    const words = tokens(t);
    const grams = words.flatMap((w) => {
      const p = `_${w}_`;
      return p.length <= 4 ? [`zq${p}`] : Array.from({ length: p.length - 3 }, (_, i) => `zq${p.slice(i, i + 4)}`);
    });
    return [...words, ...grams].join(" ");
  });
  return tfidf(expanded, { maxFeatures: 5000 }).matrix;
}

/**
 * Vectors for similarity / clustering. AI embeddings when the provider offers
 * them; otherwise TF-IDF (word n-grams for long texts, char n-grams for short).
 */
export async function embedTexts(texts: string[], opts: { short?: boolean } = {}): Promise<{ vectors: number[][]; method: string; ai: boolean }> {
  const config = await getAiConfig();
  if (config && (await aiCanEmbed(config))) {
    try {
      return { vectors: await aiEmbed(texts, config), method: `AI embeddings (${AI_PROVIDERS[config.provider].label})`, ai: true };
    } catch (e) {
      const fallback = opts.short ? charTfidf(texts) : tfidf(texts, { ngramMin: 1, ngramMax: 2, maxFeatures: 5000 }).matrix;
      return { vectors: fallback, method: `TF-IDF (AI embeddings failed: ${(e as Error).message.slice(0, 120)})`, ai: false };
    }
  }
  const note = config ? `${AI_PROVIDERS[config.provider].label} has no embeddings` : "add an AI key in AI Settings for semantic embeddings";
  const vectors = opts.short ? charTfidf(texts) : tfidf(texts, { ngramMin: 1, ngramMax: 2, maxFeatures: 5000 }).matrix;
  return { vectors, method: `TF-IDF, built-in (${note})`, ai: false };
}

/** Minimal RFC-4180 CSV parser → rows of cells. */
export function parseCsv(text: string, maxRows = 100_000): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const delimiter = (text.split("\n", 1)[0].match(/\t/g)?.length ?? 0) > (text.split("\n", 1)[0].match(/,/g)?.length ?? 0) ? "\t" : text.split("\n", 1)[0].includes(";") && !text.split("\n", 1)[0].includes(",") ? ";" : ",";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) row.push(cell), (cell = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
      if (rows.length >= maxRows) break;
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.some((v) => v.trim())) rows.push(row);
  }
  return rows.map((r) => r.map((v) => v.trim()));
}

/** CSV → objects keyed by lower-cased header. */
export function csvRecords(text: string): { headers: string[]; records: Record<string, string>[] } {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  const headers = (rows[0] ?? []).map((h) => h.toLowerCase().trim());
  return { headers, records: rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""]))) };
}

/** First header matching any of the names (exact, then partial). */
export function findColumn(headers: string[], names: string[]): string | undefined {
  return headers.find((h) => names.includes(h)) ?? headers.find((h) => names.some((n) => h.includes(n)));
}

/** Keywords from a textarea (one per line / comma) plus an optional CSV's keyword column. */
export function keywordList(textarea: unknown, csv: unknown, max = 2000): string[] {
  const out = String(textarea ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const csvText = String(csv ?? "");
  if (csvText.trim()) {
    const { headers, records } = csvRecords(csvText);
    const col = findColumn(headers, ["keyword", "keywords", "query", "top queries", "term", "topic"]) ?? headers[0];
    // A one-column file without a header: the "header" is a keyword too.
    if (col && !findColumn(headers, ["keyword", "keywords", "query", "top queries", "term", "topic"]) && headers.length === 1) out.push(col);
    for (const r of records) if (col && r[col]) out.push(r[col]);
  }
  return [...new Set(out.map((k) => k.replace(/\s+/g, " ")))].slice(0, max);
}
