/**
 * Batch: Books, publishing & reading keyword check (15 Nov 2026, Claude outputs/Books_Keyword_Check.md) —
 * 12 tools. Arts & Entertainment > Art, Film & Creator Income (KDP print cost & royalty, Kindle eBook
 * royalty, Amazon BSR → sales, book publishing cost, book pricing) and > Books, Reading & Writing
 * (reading time, pages per day, book percentage, audiobook, book page count, beat sheet, poem meter).
 *
 * Near-namesakes kept apart on purpose:
 *  - kdp-print-cost-calculator = Amazon KDP's own print-cost table and 50/60% royalty rule.
 *    book-pricing-calculator = any channel: list price from unit cost, profit and retailer discount.
 *    The existing book-printing-cost-calculator (short-run printer quotes) and
 *    ingramspark-price-calculator (IngramSpark wholesale compensation) are not rebuilt.
 *  - book-publishing-cost-calculator = the whole self-publishing budget (editing, cover, ISBN …),
 *    not the cost of one printed copy.
 *  - reading-time-calculator = time to read a length; pages-per-day-calculator = pages needed to hit
 *    a date; book-percentage-calculator = how far through you are.
 *
 * Methods:
 *  - KDP US print cost (2025 table): paperback black ink 24–108 pp $2.30 (large trim $2.84), 110–828 pp
 *    $1.00 + $0.012/page ($0.017 large); premium colour 24–40 pp $3.60 ($4.20), 42–828 pp $1.00 +
 *    $0.065/page ($0.08); standard colour 72–600 pp $1.00 + $0.0255/page ($0.0402). Hardcover black ink
 *    75–108 pp $6.80 ($7.49), 110–550 pp $5.65 + $0.012/page ($6.36 + $0.017); premium colour hardcover
 *    $5.65 + $0.065/page ($6.36 + $0.08). Paperback royalty 60% at $9.99+ and 50% below $9.99 on
 *    Amazon.com; expanded distribution 40%; hardcover 60%, no expanded distribution.
 *  - Kindle: 70% plan = 70% × (price − $0.15/MB delivery) for $2.99–$9.99; 35% plan = 35% × price.
 *  - Amazon BSR → daily sales: log-log interpolation through rough industry estimates.
 *  - Average adult silent reading speed 238 wpm (Brysbaert 2019); audiobook narration ≈ 155 wpm.
 *  - Word count classes (SFWA): short story < 7,500, novelette < 17,500, novella < 40,000, novel 40,000+.
 *  - Save the Cat beats: Snyder's 110-page screenplay page numbers (screenplay) and Brody's
 *    percentages (novel).
 *  - Syllables: vowel-group heuristic with silent-e / -es / -ed trimming; feet = syllables ÷ 2 (duple
 *    metre) or ÷ 3 (triple metre).
 */

import { type TrvCalculator as Calc, InputError, pos, pick, r0, r1, r2, nfmt, money, txt, dateIn } from "./trv-core";

const usd = (x: number) => money(x, "$", 2);
const ceil2 = (x: number) => Math.ceil(x * 100 - 1e-9) / 100;
const hm = (min: number) => { const m = Math.max(0, Math.round(min)); const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h ${r} min` : `${r} min`; };

export function kdpPrintCost(format: number, ink: number, large: boolean, pages: number): number {
  if (format === 0) {
    if (ink === 0) { if (pages < 24 || pages > 828) throw new InputError("KDP black-ink paperbacks must have 24–828 pages."); return pages <= 108 ? (large ? 2.84 : 2.3) : 1 + pages * (large ? 0.017 : 0.012); }
    if (ink === 1) { if (pages < 72 || pages > 600) throw new InputError("KDP standard-colour paperbacks must have 72–600 pages."); return 1 + pages * (large ? 0.0402 : 0.0255); }
    if (pages < 24 || pages > 828) throw new InputError("KDP premium-colour paperbacks must have 24–828 pages.");
    return pages <= 40 ? (large ? 4.2 : 3.6) : 1 + pages * (large ? 0.08 : 0.065);
  }
  if (ink === 1) throw new InputError("Standard colour isn't offered for KDP hardcovers — choose black ink or premium colour.");
  if (pages < 75 || pages > 550) throw new InputError("KDP hardcovers must have 75–550 pages.");
  if (ink === 0) return pages <= 108 ? (large ? 7.49 : 6.8) : (large ? 6.36 + pages * 0.017 : 5.65 + pages * 0.012);
  return large ? 6.36 + pages * 0.08 : 5.65 + pages * 0.065;
}
const kdpRate = (format: number, price: number) => (format === 0 && price < 9.99 ? 0.5 : 0.6);
/** Lowest list price that earns `need` (print cost + target) under the 50%/60% rule. */
function kdpPriceFor(format: number, need: number) {
  if (format === 1) return ceil2(need / 0.6);
  const p50 = ceil2(need / 0.5);
  return p50 < 9.99 ? p50 : Math.max(9.99, ceil2(need / 0.6));
}
export const kdpCalc: Calc = (v) => {
  const format = pick(v.format, 2), ink = pick(v.ink, 3), large = pick(v.trim, 2) === 1, pages = Math.round(pos(v.pages, 250));
  const override = pos(v.override, 0);
  const cost = override > 0 ? override : r2(kdpPrintCost(format, ink, large, pages));
  const price = pos(v.price, 14.99), target = pos(v.target, 3), copies = pos(v.copies, 0);
  if (!(price > 0)) throw new InputError("Enter the list price.");
  const rate = kdpRate(format, price), royalty = price * rate - cost;
  const ed = format === 0 ? price * 0.4 - cost : NaN;
  return {
    cost, rate: rate * 100, royalty: r2(royalty), expanded: format === 0 ? usd(ed) + (ed < 0 ? " — price too low for expanded distribution" : "") : "Not available for hardcovers",
    minPrice: kdpPriceFor(format, cost), targetPrice: kdpPriceFor(format, cost + target), monthly: r2(Math.max(0, royalty) * copies),
    note: royalty < 0 ? "List price is below KDP's minimum — raise it to at least the minimum list price." : price < 9.99 && format === 0 ? "Priced under $9.99, so this paperback earns the 50% royalty rate. At $9.99 or more it earns 60%." : "Earns the 60% royalty rate on Amazon.com.",
  };
};

// ------------------------------------------------------------------ Kindle eBook royalty
export const kindleCalc: Calc = (v) => {
  const price = pos(v.price, 4.99), mb = pos(v.sizeMB, 2), sales = pos(v.sales, 0), kenp = pos(v.kenp, 0), kenpRate = pos(v.kenpRate, 0.0045);
  if (!(price >= 0.99)) throw new InputError("Kindle list prices start at $0.99.");
  if (price > 200) throw new InputError("Kindle list prices go up to $200.");
  const delivery = Math.max(0.01, r2(mb * 0.15));
  const ok70 = price >= 2.99 && price <= 9.99;
  const r70 = ok70 ? 0.7 * (price - delivery) : 0, r35 = 0.35 * price;
  const best = Math.max(r70, r35), ku = kenp * kenpRate;
  return {
    best: r2(best), plan: ok70 ? (r70 >= r35 ? "70% plan pays more" : "35% plan pays more (large file)") : "Only the 35% plan is allowed at this price (70% needs $2.99–$9.99)",
    r70: ok70 ? usd(r70) : "Not eligible at this price", r35: r2(r35), delivery, monthlySales: r2(best * sales), ku: r2(ku), total: r2(best * sales + ku),
  };
};
const BSR_TABLE: [number, number][][] = [
  [[1, 4000], [10, 1500], [100, 350], [1000, 60], [5000, 18], [10000, 10], [50000, 2.5], [100000, 1], [200000, 0.5], [500000, 0.15], [1000000, 0.05], [3000000, 0.01]],
  [[1, 3000], [10, 1100], [100, 250], [1000, 45], [5000, 12], [10000, 6], [50000, 1.5], [100000, 0.7], [200000, 0.35], [500000, 0.1], [1000000, 0.04], [5000000, 0.005]],
];
export function bsrDaily(store: number, bsr: number): number {
  const t = BSR_TABLE[store];
  if (bsr <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    const [x0, y0] = t[i - 1], [x1, y1] = t[i];
    if (bsr <= x1) { const f = (Math.log(bsr) - Math.log(x0)) / (Math.log(x1) - Math.log(x0)); return Math.exp(Math.log(y0) + f * (Math.log(y1) - Math.log(y0))); }
  }
  return t[t.length - 1][1];
}
export const bsrCalc: Calc = (v) => {
  const store = pick(v.store, 2), bsr = Math.round(pos(v.bsr, 25000)), royalty = pos(v.royalty, 3);
  if (!(bsr >= 1)) throw new InputError("Enter the Best Sellers Rank (1 or higher).");
  const d = bsrDaily(store, bsr), m = d * 30.4;
  return {
    daily: d >= 10 ? r0(d) : r2(d), monthly: r0(m), monthlyRoyalty: r2(m * royalty), yearly: r0(d * 365), yearlyRoyalty: r2(d * 365 * royalty),
    tier: bsr <= 100 ? "Bestseller territory — hundreds of copies a day" : bsr <= 5000 ? "Selling strongly — dozens of copies a day" : bsr <= 50000 ? "Steady seller — a few copies a day" : bsr <= 300000 ? "Occasional sales — a copy every day or few days" : "Rare sales — a few copies a month or fewer",
  };
};

// ------------------------------------------------------------------ book publishing cost
export const EDIT_LEVELS: [string, number][] = [["No paid editing", 0], ["Proofreading only (~$0.015/word)", 0.015], ["Copy editing (~$0.025/word)", 0.025], ["Line editing (~$0.035/word)", 0.035], ["Developmental + copy editing (~$0.065/word)", 0.065]];
export const COVERS: [string, number][] = [["DIY / free template", 0], ["Premade cover (~$100)", 100], ["Custom eBook cover (~$400)", 400], ["Custom print wrap cover (~$700)", 700], ["Illustrated custom cover (~$1,500)", 1500]];
export const ISBNS: [string, number][] = [["Free KDP / IngramSpark ISBN", 0], ["1 Bowker ISBN ($125)", 125], ["10-pack Bowker ISBNs ($295, one used)", 29.5]];
export const pubCostCalc: Calc = (v) => {
  const words = pos(v.words, 80000), edit = EDIT_LEVELS[pick(v.edit, EDIT_LEVELS.length)][1] * words;
  const cover = COVERS[pick(v.cover, COVERS.length)][1], isbn = ISBNS[pick(v.isbn, ISBNS.length)][1];
  const fmt = pos(v.formatting, 300), illus = pos(v.illustrations, 0), copyright = pos(v.copyright, 65), marketing = pos(v.marketing, 500);
  const copies = pos(v.authorCopies, 0) * pos(v.copyCost, 0), royalty = pos(v.royalty, 3);
  const total = edit + cover + isbn + fmt + illus + copyright + marketing + copies;
  return {
    total: r2(total), edit: r2(edit), cover, isbn, other: r2(fmt + illus + copyright), marketing: r2(marketing + copies),
    breakEven: royalty > 0 ? Math.ceil(total / royalty) : 0, perThousand: words > 0 ? r2((total / words) * 1000) : 0,
  };
};

// ------------------------------------------------------------------ book pricing (any channel)
export const GENRES: [string, string][] = [
  ["Fiction paperback (5×8 – 6×9)", "$12.99 – $18.99"], ["Non-fiction paperback", "$14.99 – $24.99"], ["Children's picture book", "$9.99 – $17.99"],
  ["Hardcover fiction", "$22.99 – $29.99"], ["Cookbook / colour book", "$19.99 – $34.99"], ["Low-content (journal, planner)", "$6.99 – $12.99"],
];
export const bookPriceCalc: Calc = (v) => {
  const cost = pos(v.unitCost, 4.5), profit = pos(v.profit, 3), disc = pos(v.discount, 40) / 100;
  if (disc >= 0.95) throw new InputError("The retailer discount must be under 95%.");
  const be = cost / (1 - disc), rec = (cost + profit) / (1 - disc);
  const charm = Math.ceil(rec + 0.01) - 0.01, net = charm * (1 - disc) - cost;
  return { recommended: r2(rec), charm: r2(charm), breakEven: r2(be), net: r2(net), margin: charm > 0 ? r1((net / charm) * 100) : 0, retailer: r2(charm * disc), typical: GENRES[pick(v.genre, GENRES.length)][1] };
};

// ------------------------------------------------------------------ reading time
export const readingTimeCalc: Calc = (v) => {
  const byWords = pick(v.amount, 2) === 1, wpp = pos(v.wordsPerPage, 250);
  const words = byWords ? pos(v.words, 80000) : pos(v.pages, 300) * wpp;
  if (!(words > 0) || !(wpp > 0)) throw new InputError("Enter the pages (and words per page) or the word count.");
  const tp = pos(v.testPages, 0), tm = pos(v.testMinutes, 0);
  const wpm = tp > 0 && tm > 0 ? (tp * wpp) / tm : pos(v.wpm, 238);
  if (!(wpm > 0)) throw new InputError("Enter your reading speed in words per minute.");
  const min = words / wpm, perDay = pos(v.minutesPerDay, 30);
  return {
    time: hm(min), hours: r1(min / 60), wpm: r0(wpm), pagesPerHour: r0((wpm * 60) / wpp), days: perDay > 0 ? Math.ceil(min / perDay) : 0,
    slow: hm(words / 150), avg: hm(words / 238), fast: hm(words / 400), words: r0(words),
  };
};

// ------------------------------------------------------------------ pages per day
export const pagesPerDayCalc: Calc = (v) => {
  const total = Math.round(pos(v.total, 400)), read = Math.round(pos(v.read, 0)), start = dateIn(v, "start", 20407), end = dateIn(v, "end", 20437);
  const pph = pos(v.pagesPerHour, 40), skip = pos(v.daysOff, 0);
  if (!(total > 0)) throw new InputError("Enter the total pages.");
  if (read >= total) throw new InputError("You've already finished — pages read is at or above the total.");
  const days = end - start + 1 - skip;
  if (days < 1) throw new InputError("The finish date must be on or after the start date (and leave at least one reading day).");
  const left = total - read, ppd = Math.ceil(left / days);
  return { ppd, left, days, perWeek: ppd * 7, minutes: pph > 0 ? r0((ppd / pph) * 60) : 0, done: r1((read / total) * 100), finish: end };
};

// ------------------------------------------------------------------ book percentage
export const PCT_MODES = ["Page (or location) → percentage read", "Percentage → page number"];
export const bookPctCalc: Calc = (v) => {
  const mode = pick(v.mode, 2), total = pos(v.total, 320);
  if (!(total > 0)) throw new InputError("Enter the total pages or locations.");
  const cur = mode === 0 ? Math.min(total, pos(v.current, 100)) : Math.round((Math.min(100, pos(v.percent, 50)) / 100) * total);
  const pct = (cur / total) * 100;
  return { pct: r1(pct), page: r0(cur), left: r0(total - cur), leftPct: r1(100 - pct), fraction: pct >= 99.95 ? "Finished!" : pct >= 75 ? "In the home stretch — over three quarters done" : pct >= 50 ? "Past the halfway point" : pct >= 25 ? "A quarter of the way in" : "Just getting started" };
};

// ------------------------------------------------------------------ audiobook
export const audiobookCalc: Calc = (v) => {
  const total = pos(v.totalH, 10) * 60 + pos(v.totalM, 0), done = pos(v.doneH, 0) * 60 + pos(v.doneM, 0), speed = pos(v.speed, 1), perDay = pos(v.minutesPerDay, 45);
  if (!(total > 0)) throw new InputError("Enter the audiobook's total length.");
  if (speed < 0.5 || speed > 4) throw new InputError("Playback speed should be between 0.5× and 4×.");
  if (done > total) throw new InputError("Time listened can't be more than the book's length.");
  const leftReal = (total - done) / speed;
  return {
    left: hm(leftReal), atSpeed: hm(total / speed), saved: hm(total - total / speed), pct: r1((done / total) * 100), days: perDay > 0 ? Math.ceil(leftReal / perDay) : 0,
    words: r0(total * 155), pages: r0((total * 155) / 250), wpm: r0(155 * speed),
  };
};
export const SPACING: [string, number][] = [["Double-spaced, 12 pt (~250 words/page)", 250], ["1.5-spaced, 12 pt (~350 words/page)", 350], ["Single-spaced, 12 pt (~500 words/page)", 500]];
export const TRIMS: [string, number][] = [["5\" × 8\"", 260], ["5.25\" × 8\"", 280], ["5.5\" × 8.5\"", 300], ["6\" × 9\"", 350], ["7\" × 10\"", 450], ["8.5\" × 11\"", 600], ["Mass-market 4.25\" × 6.87\"", 230]];
export const FONTS: [string, number][] = [["10 pt", 1.15], ["11 pt (typical)", 1], ["12 pt", 0.87], ["14 pt large print", 0.65]];
export const wordClass = (w: number) => (w < 1000 ? "Flash fiction" : w < 7500 ? "Short story" : w < 17500 ? "Novelette" : w < 40000 ? "Novella" : w < 110000 ? "Novel" : "Long / epic novel");
export const pageCountCalc: Calc = (v) => {
  const words = pick(v.source, 2) === 1 ? pos(v.docPages, 300) * SPACING[pick(v.spacing, SPACING.length)][1] : pos(v.words, 80000);
  if (!(words > 0)) throw new InputError("Enter the word count or manuscript pages.");
  const wpp = TRIMS[pick(v.trim, TRIMS.length)][1] * FONTS[pick(v.font, FONTS.length)][1], extra = Math.round(pos(v.extra, 10));
  const body = Math.ceil(words / wpp), raw = body + extra, pages = raw % 2 ? raw + 1 : raw;
  return { pages, body, wpp: r0(wpp), words: r0(words), kind: wordClass(words), spineWhite: r2(pages * 0.002252), spineCream: r2(pages * 0.0025), readTime: hm(words / 238) };
};
// [key, name, screenplay page start, screenplay page end, novel % start, novel % end]
export const BEATS: [string, string, number, number, number, number][] = [
  ["opening", "Opening Image", 1, 1, 0, 1], ["theme", "Theme Stated", 5, 5, 5, 5], ["setup", "Set-Up", 1, 10, 1, 10],
  ["catalyst", "Catalyst", 12, 12, 10, 10], ["debate", "Debate", 12, 25, 10, 20], ["breakTwo", "Break into Two", 25, 25, 20, 20],
  ["bStory", "B Story", 30, 30, 22, 22], ["fun", "Fun and Games", 30, 55, 20, 50], ["midpoint", "Midpoint", 55, 55, 50, 50],
  ["badGuys", "Bad Guys Close In", 55, 75, 50, 75], ["allLost", "All Is Lost", 75, 75, 75, 75], ["darkNight", "Dark Night of the Soul", 75, 85, 75, 80],
  ["breakThree", "Break into Three", 85, 85, 80, 80], ["finale", "Finale", 85, 110, 80, 99], ["final", "Final Image", 110, 110, 99, 100],
];
export const beatSheetCalc: Calc = (v) => {
  const novel = pick(v.mode, 2) === 1, len = novel ? pos(v.words, 80000) : pos(v.pages, 110), ch = Math.round(pos(v.chapters, 0));
  if (!(len >= (novel ? 1000 : 10))) throw new InputError(novel ? "Enter a novel length of at least 1,000 words." : "Enter a screenplay length of at least 10 pages.");
  const at = (f: number) => (novel ? `word ${nfmt(Math.round(f * len))}` : `p. ${Math.max(1, Math.round(f * len))}`);
  const chap = (f: number) => (ch > 0 ? ` (ch. ${Math.min(ch, Math.max(1, Math.ceil(f * ch)))})` : "");
  const out: Record<string, string | number> = {};
  for (const [k, , ps, pe, ns, ne] of BEATS) {
    const a = novel ? ns / 100 : ps / 110, b = novel ? ne / 100 : pe / 110;
    out[k] = a === b ? at(a) + chap(a) : `${at(a)} – ${at(b)}${chap(a)}`;
  }
  out.length = novel ? `${nfmt(len)} words` : `${nfmt(len)} pages (≈ ${nfmt(len)} minutes on screen)`;
  return out;
};

// ------------------------------------------------------------------ poem meter
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/'s$/, "s").replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  let c = (w.replace(/^y/, "").match(/[aeiouy]+/g) ?? []).length;
  if (/[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w)) c--; // silent final e (make, compare) — not table
  else if (/[^aeiouyscxzgh]es$/.test(w)) c--; // makes, writes — not horses, judges
  else if (/[^aeiouytd]ed$/.test(w)) c--; // walked — not wanted, needed
  if (/[^aeiouy]ely$/.test(w)) c--; // lovely, lonely
  c += (w.match(/ia|io|eo|ua|uo|iu|oet|ier$/g) ?? []).length; // vowel pairs said as two syllables
  return Math.max(1, c);
}
const LINE_NAMES = ["", "monometer", "dimeter", "trimeter", "tetrameter", "pentameter", "hexameter", "heptameter", "octameter"];
export function meterName(syl: number): string {
  if (syl < 2) return "Too short to scan";
  const fit2 = Math.floor(syl / 2), triple = syl / 3;
  const parts: string[] = [];
  if (fit2 >= 1 && fit2 <= 8) parts.push(`iambic/trochaic ${LINE_NAMES[fit2]}${syl % 2 ? " (with a feminine ending or catalexis)" : ""}`);
  if (syl % 3 === 0 && triple >= 1 && triple <= 8) parts.push(`anapestic/dactylic ${LINE_NAMES[triple]}`);
  return parts.length ? parts.join(" or ") : "Free verse / irregular line length";
}
export const poemMeterCalc: Calc = (v) => {
  const raw = txt(v, "lines");
  const lines = raw.split(/\s*[/|\n]\s*/).map((l) => l.trim()).filter(Boolean).slice(0, 12);
  if (!lines.length) throw new InputError("Type a line of poetry (separate several lines with a /).");
  const counts = lines.map((l) => l.split(/[\s-]+/).reduce((s, w) => s + syllables(w), 0));
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  const first = counts[0], feet = Math.floor(first / 2);
  const haiku = counts.length === 3 && counts[0] === 5 && counts[1] === 7 && counts[2] === 5;
  const even = counts.every((c) => Math.abs(c - counts[0]) <= 1);
  return {
    meter: haiku ? "Haiku (5-7-5)" : meterName(first), counts: counts.join(" · "), lines: counts.length, avg: r1(avg),
    pattern: feet >= 1 && feet <= 8 ? Array.from({ length: feet }, () => "da-DUM").join(" ") + (first % 2 ? " da" : "") : "—",
    regular: counts.length === 1 ? "One line entered" : even ? "Regular — every line is within one syllable of the first" : "Irregular — line lengths vary (likely free verse or mixed metre)",
  };
};

export const booksCustomCalculators: Record<string, Calc> = {
  "kdp-print-cost-calculator": kdpCalc,
  "kindle-royalty-calculator": kindleCalc,
  "amazon-book-sales-calculator": bsrCalc,
  "book-publishing-cost-calculator": pubCostCalc,
  "book-pricing-calculator": bookPriceCalc,
  "reading-time-calculator": readingTimeCalc,
  "pages-per-day-calculator": pagesPerDayCalc,
  "book-percentage-calculator": bookPctCalc,
  "audiobook-calculator": audiobookCalc,
  "book-page-count-calculator": pageCountCalc,
  "beat-sheet-calculator": beatSheetCalc,
  "poem-meter-calculator": poemMeterCalc,
};
