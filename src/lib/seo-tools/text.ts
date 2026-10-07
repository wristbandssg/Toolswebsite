// Text helpers for the SEO tools: word/sentence counting, syllables,
// readability, stop words and n-grams.

export const STOP_WORDS = new Set(
  (
    "a about above across after afterwards again against all almost alone along already also although always am among amongst an and another any anyhow anyone anything anyway anywhere are around as at back be became because become becomes becoming been before beforehand behind being below beside besides between beyond both but by can cannot could did do does doing done down during each either else elsewhere enough etc even ever every everyone everything everywhere except few for former formerly from further get give go had has have having he hence her here hereafter hereby herein hereupon hers herself him himself his how however i if in indeed into is it its itself just keep last latter latterly least less made many may me meanwhile might mine more moreover most mostly much must my myself namely neither never nevertheless next no nobody none noone nor not nothing now nowhere of off often on once one only onto or other others otherwise our ours ourselves out over own per perhaps please put rather re same see seem seemed seeming seems several she should since so some somehow someone something sometime sometimes somewhere still such than that the their them themselves then thence there thereafter thereby therefore therein thereupon these they this those though through throughout thru thus to together too toward towards under until up upon us very via was we well were what whatever when whence whenever where whereafter whereas whereby wherein whereupon wherever whether which while whither who whoever whole whom whose why will with within without would yet you your yours yourself yourselves"
  ).split(" ")
);

/** Lowercase word tokens of 2+ letters/digits (like sklearn's default token pattern). */
export function tokens(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}_]{2,}/gu) ?? [];
}

/** All words, any length, letters only (for readability maths). */
export function letterWords(text: string): string[] {
  return text.match(/\p{L}+/gu) ?? [];
}

export function wordCount(text: string): number {
  return (text.match(/[\p{L}\p{N}]+/gu) ?? []).length;
}

export function sentences(text: string, minLength = 4): string[] {
  return text
    .split(/(?<=[.!?])\s+|[.!?]+$/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLength);
}

export function syllables(word: string): number {
  const w = word.toLowerCase();
  if (w.length <= 2) return 1;
  let count = (w.match(/[aeiouy]+/g) ?? []).length;
  if (w.endsWith("e")) count--;
  return Math.max(count, 1);
}

export function round(n: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export interface Readability {
  words: number;
  sentences: number;
  syllables: number;
  avgSentenceLength: number;
  avgSyllablesPerWord: number;
  complexWordsPct: number;
  longWordsPct: number;
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  gunningFog: number;
  colemanLiau: number;
  ari: number;
  smog: number;
}

/** Flesch, Flesch-Kincaid, Gunning Fog, Coleman-Liau, ARI and SMOG (readability_analyzer.py). */
export function readability(text: string): Readability | null {
  const sents = sentences(text, 4);
  const words = letterWords(text);
  if (!sents.length || !words.length) return null;
  const syl = words.map(syllables);
  const totalSyl = syl.reduce((a, b) => a + b, 0);
  const complex = syl.filter((s) => s >= 3).length;
  const long = words.filter((w) => w.length > 6).length;
  const chars = words.reduce((a, w) => a + w.length, 0);
  const asl = words.length / sents.length;
  const asw = totalSyl / words.length;
  return {
    words: words.length,
    sentences: sents.length,
    syllables: totalSyl,
    avgSentenceLength: round(asl),
    avgSyllablesPerWord: round(asw, 2),
    complexWordsPct: round((complex / words.length) * 100),
    longWordsPct: round((long / words.length) * 100),
    fleschReadingEase: round(206.835 - 1.015 * asl - 84.6 * asw),
    fleschKincaidGrade: round(0.39 * asl + 11.8 * asw - 15.59),
    gunningFog: round(0.4 * (asl + (100 * complex) / words.length)),
    colemanLiau: round(0.0588 * ((chars / words.length) * 100) - 0.296 * ((sents.length / words.length) * 100) - 15.8),
    ari: round(4.71 * (chars / words.length) + 0.5 * asl - 21.43),
    smog: sents.length >= 3 ? round(1.043 * Math.sqrt(complex * (30 / sents.length)) + 3.1291) : 0,
  };
}

export function gradeLabel(fk: number): string {
  if (fk <= 6) return "Easy (6th grade)";
  if (fk <= 8) return "Fairly easy (8th grade)";
  if (fk <= 10) return "Standard (10th grade)";
  if (fk <= 12) return "Fairly difficult (12th grade)";
  return "Difficult (college level)";
}

/** Counts of n-grams of size n, stop words dropped for n = 1 and all-stop-word n-grams skipped. */
export function ngramCounts(text: string, n: number, keepStopWords = false): Map<string, number> {
  let words: string[] = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (n === 1 && !keepStopWords) words = words.filter((w) => !STOP_WORDS.has(w) && w.length > 2);
  const counts = new Map<string, number>();
  for (let i = 0; i + n <= words.length; i++) {
    const gram = words.slice(i, i + n);
    if (n > 1 && !keepStopWords && gram.every((w) => STOP_WORDS.has(w))) continue;
    const key = gram.join(" ");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function topEntries<K>(map: Map<K, number>, n: number): [K, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}
