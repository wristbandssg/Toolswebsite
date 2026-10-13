/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-racket (tennis, pickleball & table tennis, 9 tools). See
 * calc-engine-other-football.ts for the full list of other-* sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - utrCalculator: UTR-style rating from match results vs rated
 *    opponents; tennisRatingCalculator: NTRP self-rating from skills.
 *  - pickleballRatingCalculator: DUPR-style rating from game scores;
 *    tableTennisRatingCalculator: USATT points-exchange table.
 *  - tennisCourtCostCalculator vs pickleballCourtCostCalculator: different
 *    court footprints and fencing.
 *  - tennisCalorieCalculator vs pickleballCaloriesBurnedCalculator.
 *  - tennisStringTensionCalculator: stringing tension.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-racket-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const num = (v: number, d = 0) => safeNumber(v, d);
const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const whole = (v: number, d = 0) => Math.max(0, Math.round(safeNumber(v, d)));
const div = (a: number, b: number) => (b > 0 ? a / b : 0);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const kgOf = (v: number, unit: number) => (whole(unit, 1) === 2 ? v : v * 0.45359237);

// --- 1. UTR-style rating ---------------------------------------------------------------
export const utrCalculator: CustomCalculator = (values) => {
  const ratings: number[] = [];
  for (let i = 1; i <= 5; i++) {
    const opp = nonNeg(values[`opp${i}Utr`], 0);
    const won = nonNeg(values[`games${i}Won`], 0);
    const lost = nonNeg(values[`games${i}Lost`], 0);
    if (opp <= 0 || won + lost <= 0) continue;
    ratings.push(clamp(opp + 5 * (won / (won + lost) - 0.5), 1, 16.5));
  }
  const utr = ratings.length ? ratings.reduce((s, x) => s + x, 0) / ratings.length : 0;

  return { estimatedUtr: round2(utr), matchesCounted: ratings.length, approxNtrp: utr > 0 ? clamp(Math.round((2 + 0.32 * utr) * 2) / 2, 1.5, 7) : 0 };
};

// --- 2. Tennis (NTRP) self-rating ------------------------------------------------------------
export const tennisRatingCalculator: CustomCalculator = (values) => {
  const keys = ["forehand", "backhand", "serve", "returnOfServe", "volley", "movementStrategy"];
  const avg = keys.reduce((s, k) => s + clamp(nonNeg(values[k], 4), 1, 7), 0) / keys.length;
  const ntrp = clamp(Math.round((1.5 + ((avg - 1) * 5.5) / 6) * 2) / 2, 1.5, 7);

  return { ntrpRating: ntrp, averageSkill: round2(avg), approxUtr: round2(Math.max(1, (ntrp - 2) / 0.32)) };
};

// --- 3. Tennis string tension ------------------------------------------------------------------
export const tennisStringTensionCalculator: CustomCalculator = (values) => {
  const head = nonNeg(values.headSize, 100);
  let lb = 55 + (head - 100) / 5;
  const type = whole(values.stringType, 1); // 1 multifilament / synthetic gut, 2 polyester, 3 natural gut
  if (type === 2) lb *= 0.9;
  if (type === 3) lb += 2;
  const goal = whole(values.goal, 2); // 1 power / comfort, 2 balanced, 3 control
  lb += goal === 1 ? -3 : goal === 3 ? 3 : 0;
  if (whole(values.armIssues, 1) === 2) lb -= 4;
  const t = Math.round(clamp(lb, 35, 70));

  return { tensionLb: t, tensionKg: round2(t * 0.45359237), rangeLowLb: t - 2, rangeHighLb: t + 2 };
};

// --- 4. Tennis court cost -------------------------------------------------------------------------
const SURFACE_PER_SQFT: Record<number, number> = { 1: 7, 2: 9, 3: 5.5, 4: 12, 5: 6 };

function courtCost(area: number, perimeter: number, values: Record<string, number>): Record<string, number> {
  const surface = area * (nonNeg(values.surfacePrice, 0) > 0 ? nonNeg(values.surfacePrice, 0) : SURFACE_PER_SQFT[whole(values.surface, 1)] ?? 7);
  const fence = whole(values.fencing, 1) === 1 ? perimeter * nonNeg(values.fencePerFt, 35) : 0;
  const prep = surface * clamp(nonNeg(values.sitePrepPct, 15), 0, 100) / 100;
  const extras = nonNeg(values.netPosts, 1500) + nonNeg(values.lighting, 0);
  const total = surface + fence + prep + extras;

  return { totalCost: round2(total), surfaceCost: round2(surface), fencingCost: round2(fence), costPerSqFt: round2(div(total, area)) };
}

export const tennisCourtCostCalculator: CustomCalculator = (values) => {
  const courts = Math.max(1, whole(values.courts, 1));
  const area = 60 * 120 * courts; // standard fenced area per court
  return { ...courtCost(area, 2 * (60 * courts + 120), values), areaSqFt: area };
};

// --- 5. Pickleball court cost ---------------------------------------------------------------------------
export const pickleballCourtCostCalculator: CustomCalculator = (values) => {
  const courts = Math.max(1, whole(values.courts, 1));
  const area = 30 * 60 * courts; // recommended footprint per court
  return { ...courtCost(area, 2 * (30 * courts + 60), values), areaSqFt: area };
};

// --- 6. Tennis calories ---------------------------------------------------------------------------------
const TENNIS_MET: Record<number, number> = { 1: 4.5, 2: 6, 3: 7.3, 4: 8 };

export const tennisCalorieCalculator: CustomCalculator = (values) => {
  const met = TENNIS_MET[whole(values.play, 3)] ?? 7.3;
  const kg = kgOf(nonNeg(values.weight, 170), values.weightUnit);
  const h = nonNeg(values.minutes, 60) / 60;

  return { calories: Math.round(met * kg * h), caloriesPerHour: Math.round(met * kg), met };
};

// --- 7. Pickleball calories -------------------------------------------------------------------------------
const PICKLE_MET: Record<number, number> = { 1: 4.5, 2: 6, 3: 7.5 };

export const pickleballCaloriesBurnedCalculator: CustomCalculator = (values) => {
  const met = PICKLE_MET[whole(values.play, 1)] ?? 4.5;
  const kg = kgOf(nonNeg(values.weight, 170), values.weightUnit);
  const h = nonNeg(values.minutes, 60) / 60;

  return { calories: Math.round(met * kg * h), caloriesPerHour: Math.round(met * kg), met };
};

// --- 8. Pickleball (DUPR-style) rating ------------------------------------------------------------------------
export const pickleballRatingCalculator: CustomCalculator = (values) => {
  const doubles = whole(values.format, 1) === 1;
  const partner = nonNeg(values.partnerRating, 3.5);
  const out: number[] = [];
  for (let i = 1; i <= 5; i++) {
    const opp = nonNeg(values[`opp${i}Rating`], 0);
    const pf = nonNeg(values[`points${i}For`], 0);
    const pa = nonNeg(values[`points${i}Against`], 0);
    if (opp <= 0 || pf + pa <= 0) continue;
    const team = opp + 3 * (pf / (pf + pa) - 0.5);
    out.push(clamp(doubles ? 2 * team - partner : team, 2, 8));
  }
  const r = out.length ? out.reduce((s, x) => s + x, 0) / out.length : 0;

  return { estimatedRating: round2(r), gamesCounted: out.length, skillLevel: r === 0 ? 0 : r < 3 ? 1 : r < 3.5 ? 2 : r < 4 ? 3 : r < 4.5 ? 4 : r < 5 ? 5 : 6 };
};

// --- 9. Table tennis rating (USATT points exchange) -------------------------------------------------------------
const USATT: [number, number, number][] = [[12, 8, 8], [37, 7, 10], [62, 6, 13], [87, 5, 16], [112, 4, 20], [137, 3, 25], [162, 2, 30], [187, 2, 35], [212, 1, 40], [237, 1, 45], [Infinity, 0, 50]];

export const tableTennisRatingCalculator: CustomCalculator = (values) => {
  const mine = num(values.yourRating, 1500);
  const opp = num(values.opponentRating, 1600);
  const won = whole(values.result, 1) === 1;
  const diff = Math.abs(mine - opp);
  const [, expected, upset] = USATT.find(([d]) => diff <= d) ?? USATT[USATT.length - 1];
  const higher = mine >= opp;
  const pts = won ? (higher ? expected : upset) : -(higher ? upset : expected);

  return { pointsChange: pts, newRating: mine + pts, opponentNewRating: opp - pts, upset: (won && !higher) || (!won && higher && diff > 0) ? 1 : 0 };
};

export const otherRacketCustomCalculators: Record<string, CustomCalculator> = {
  "utr-calculator": utrCalculator,
  "tennis-rating-calculator": tennisRatingCalculator,
  "tennis-string-tension-calculator": tennisStringTensionCalculator,
  "tennis-court-cost-calculator": tennisCourtCostCalculator,
  "pickleball-court-cost-calculator": pickleballCourtCostCalculator,
  "tennis-calorie-calculator": tennisCalorieCalculator,
  "pickleball-calories-burned-calculator": pickleballCaloriesBurnedCalculator,
  "pickleball-rating-calculator": pickleballRatingCalculator,
  "table-tennis-rating-calculator": tableTennisRatingCalculator,
};
