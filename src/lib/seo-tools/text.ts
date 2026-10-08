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

export function wordCount(text: string): number {
  return (text.match(/[\p{L}\p{N}]+/gu) ?? []).length;
}

export function sentences(text: string, minLength = 4): string[] {
  return text
    .split(/(?<=[.!?])\s+|[.!?]+$/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLength);
}

export function round(n: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
