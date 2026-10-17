/**
 * Batch: "Jobs & Education Calculators" → SAT, ACT & School Test Calculators
 * (14 tools). Score conversions are estimates — test makers equate each form
 * separately — built from published scale ranges and concordances:
 *  - satScore / psatScore: digital, adaptive SAT/PSAT — module 2 is harder
 *    or easier depending on module 1, which caps the section score.
 *  - actScore: enhanced ACT (2025): English 50, Math 45, Reading 36, optional
 *    Science 40; composite = average of English, Math and Reading.
 *  - actSuperscore: best section across up to three test dates.
 *  - actToSat: 2018 ACT/College Board concordance, both directions.
 *  - psatToSat: projected SAT from a PSAT score and time to the SAT.
 *  - nationalMeritIndex: Selection Index = (2 × RW + Math) ÷ 10.
 *  - shsatScore, ssatScore (covers "SSAT percentile"), iseeScore: raw →
 *    scaled score estimates with percentile / stanine.
 *  - eocScore: end-of-course exam's share of the final course grade.
 *  - solScore: Virginia SOL raw → 0–600 scaled (400 pass, 500 advanced).
 *  - englishRegentsScore: NY English Regents weighted raw → 0–100 scale.
 *  - actScholarship: merit-aid tier estimate from ACT and GPA.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-edu-tests-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const yes = (v: number) => Math.round(safeNumber(v)) === 1;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const round10 = (n: number) => Math.round(n / 10) * 10;

/** Two-module adaptive section → scaled score between lo and hi. */
function adaptiveSection(m1: number, m2: number, perModule: number, lo: number, hi: number) {
  const a = clamp(nonNeg(m1), 0, perModule);
  const b = clamp(nonNeg(m2), 0, perModule);
  const hard = a / perModule >= 0.6;
  const eff = (a + b * (hard ? 1.25 : 0.75)) / (perModule * 2.25);
  return { score: round10(lo + (hi - lo) * Math.pow(clamp(eff, 0, 1), 1.05)), hard };
}

const SAT_PERCENTILE: [number, number][] = [[1550, 99], [1500, 98], [1450, 96], [1400, 94], [1350, 91], [1300, 87], [1250, 81], [1200, 74], [1150, 66], [1100, 58], [1050, 49], [1000, 40], [950, 31], [900, 22], [850, 15], [800, 9], [700, 2], [400, 1]];
const lookup = (table: [number, number][], x: number) => table.find(([t]) => x >= t)?.[1] ?? 1;

function satLike(v: Record<string, number>, lo: number, hi: number) {
  const rw = adaptiveSection(v.rwModule1, v.rwModule2, 27, lo, hi);
  const m = adaptiveSection(v.mathModule1, v.mathModule2, 22, lo, hi);
  return { rw, m, total: rw.score + m.score };
}

export const satScore: CustomCalculator = (v) => {
  const { rw, m, total } = satLike(v, 200, 800);
  return { totalScore: total, readingWritingScore: rw.score, mathScore: m.score, estimatedPercentile: lookup(SAT_PERCENTILE, total), harderSecondModules: (rw.hard ? 1 : 0) + (m.hard ? 1 : 0) };
};

export const psatScore: CustomCalculator = (v) => {
  const { rw, m, total } = satLike(v, 160, 760);
  return { totalScore: total, readingWritingScore: rw.score, mathScore: m.score, selectionIndex: Math.round((2 * rw.score + m.score) / 10), estimatedPercentile: lookup(SAT_PERCENTILE, total + 60) };
};

const actScale = (correct: number, total: number) => (total > 0 ? Math.round(clamp(1 + 35 * (nonNeg(correct) / total), 1, 36)) : 0);
const ACT_PERCENTILE: [number, number][] = [[36, 100], [35, 99], [33, 98], [32, 96], [31, 95], [30, 93], [29, 91], [28, 88], [27, 85], [26, 82], [25, 78], [24, 74], [23, 69], [22, 63], [21, 58], [20, 51], [19, 45], [18, 38], [17, 31], [16, 23], [15, 15], [14, 8], [13, 3], [1, 1]];

export const actScore: CustomCalculator = (v) => {
  const e = actScale(v.englishCorrect, 50);
  const m = actScale(v.mathCorrect, 45);
  const r = actScale(v.readingCorrect, 36);
  const tookScience = nonNeg(v.scienceCorrect) > 0;
  const s = tookScience ? actScale(v.scienceCorrect, 40) : 0;
  const composite = Math.round((e + m + r) / 3);
  return { compositeScore: composite, englishScore: e, mathScore: m, readingScore: r, scienceScore: s, stemScore: tookScience ? Math.round((m + s) / 2) : 0, estimatedPercentile: lookup(ACT_PERCENTILE, composite) };
};

export const actSuperscore: CustomCalculator = (v) => {
  const best = (k: string) => Math.max(...[1, 2, 3].map((i) => nonNeg(v[`${k}${i}`])));
  const e = best("english");
  const m = best("math");
  const r = best("reading");
  const s = best("science");
  const single = Math.max(...[1, 2, 3].map((i) => Math.round((nonNeg(v[`english${i}`]) + nonNeg(v[`math${i}`]) + nonNeg(v[`reading${i}`])) / 3)));
  const sup = Math.round((e + m + r) / 3);
  return { superscore: sup, bestSingleComposite: single, superscoreGain: sup - single, bestEnglish: e, bestMath: m, bestReading: r, bestScience: s };
};

// 2018 ACT/SAT concordance: ACT composite → SAT total.
const CONCORDANCE: [number, number][] = [
  [36, 1590], [35, 1540], [34, 1500], [33, 1460], [32, 1430], [31, 1400], [30, 1370], [29, 1340], [28, 1310], [27, 1280], [26, 1240], [25, 1210],
  [24, 1180], [23, 1140], [22, 1110], [21, 1080], [20, 1040], [19, 1010], [18, 970], [17, 930], [16, 890], [15, 850], [14, 800], [13, 760], [12, 710], [11, 670], [10, 630], [9, 590],
];

export const actToSat: CustomCalculator = (v) => {
  if (yes(v.satToAct)) {
    const sat = nonNeg(v.score);
    const act = CONCORDANCE.find(([, s]) => sat >= s - 15)?.[0] ?? 9;
    return { convertedScore: act, satEquivalentRange: CONCORDANCE.find(([a]) => a === act)?.[1] ?? 590, estimatedPercentile: lookup(ACT_PERCENTILE, act) };
  }
  const act = clamp(Math.round(nonNeg(v.score)), 9, 36);
  const sat = CONCORDANCE.find(([a]) => a === act)?.[1] ?? 590;
  return { convertedScore: sat, satEquivalentRange: sat, estimatedPercentile: lookup(SAT_PERCENTILE, sat) };
};

export const psatToSat: CustomCalculator = (v) => {
  const psat = clamp(nonNeg(v.psatScore), 320, 1520);
  const months = nonNeg(v.monthsUntilSat);
  // Typical growth: about 5 points a month of schooling, plus structured prep (≈ 1 point per hour, tapering).
  const growth = months * 5 + 60 * (1 - Math.exp(-nonNeg(v.prepHours) / 40));
  const projected = clamp(round10(psat + growth), 400, 1600);
  return { projectedSat: projected, expectedGrowth: round10(growth), sameDayEquivalent: psat, estimatedPercentile: lookup(SAT_PERCENTILE, projected) };
};

export const nationalMeritIndex: CustomCalculator = (v) => {
  const rw = clamp(nonNeg(v.readingWriting), 160, 760);
  const m = clamp(nonNeg(v.math), 160, 760);
  const si = Math.round((2 * rw + m) / 10);
  return {
    selectionIndex: si,
    commended: si >= nonNeg(v.commendedCutoff, 207) ? 1 : 0,
    semifinalist: si >= nonNeg(v.stateCutoff) ? 1 : 0,
    pointsVsStateCutoff: si - nonNeg(v.stateCutoff),
    psatTotal: rw + m,
  };
};

export const shsatScore: CustomCalculator = (v) => {
  const section = (raw: number) => Math.round(100 + 250 * Math.pow(clamp(nonNeg(raw) / 57, 0, 1), 2.6));
  const ela = section(v.elaCorrect);
  const math = section(v.mathCorrect);
  const composite = ela + math;
  const target = nonNeg(v.targetCutoff);
  return { compositeScore: composite, elaScaled: ela, mathScaled: math, meetsTargetCutoff: composite >= target ? 1 : 0, pointsVsTarget: composite - target };
};

const LEVELS: [number, number][] = [[500, 800], [440, 710], [300, 600]];

/** Rough standard-normal CDF. */
function normCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export const ssatScore: CustomCalculator = (v) => {
  const [lo, hi] = LEVELS[Math.min(2, Math.round(nonNeg(v.level)))] ?? LEVELS[0];
  const sec = (c: number, t: number) => {
    const p = t > 0 ? clamp(nonNeg(c) / t, 0, 1) : 0;
    return { s: round10(lo + (hi - lo) * p), p };
  };
  const q = sec(v.quantCorrect, nonNeg(v.quantTotal, 50));
  const vb = sec(v.verbalCorrect, nonNeg(v.verbalTotal, 60));
  const r = sec(v.readingCorrect, nonNeg(v.readingTotal, 40));
  const meanP = (q.p + vb.p + r.p) / 3;
  return {
    totalScaledScore: q.s + vb.s + r.s,
    quantitativeScore: q.s,
    verbalScore: vb.s,
    readingScore: r.s,
    estimatedPercentile: Math.round(clamp(normCdf((meanP - 0.55) / 0.16) * 100, 1, 99)),
  };
};

export const iseeScore: CustomCalculator = (v) => {
  const scaled = (c: number, t: number) => Math.round(760 + 180 * (t > 0 ? clamp(nonNeg(c) / t, 0, 1) : 0));
  const sections = [
    [v.verbalCorrect, nonNeg(v.verbalTotal, 40)], [v.quantCorrect, nonNeg(v.quantTotal, 37)],
    [v.readingCorrect, nonNeg(v.readingTotal, 36)], [v.mathCorrect, nonNeg(v.mathTotal, 47)],
  ].map(([c, t]) => {
    const s = scaled(c, t);
    const pct = Math.round(clamp(normCdf((s - 868) / 22) * 100, 1, 99));
    const stanine = pct >= 96 ? 9 : pct >= 89 ? 8 : pct >= 77 ? 7 : pct >= 60 ? 6 : pct >= 40 ? 5 : pct >= 23 ? 4 : pct >= 11 ? 3 : pct >= 4 ? 2 : 1;
    return { s, pct, stanine };
  });
  return {
    stanineTotal: sections.reduce((a, s) => a + s.stanine, 0),
    verbalStanine: sections[0].stanine,
    quantStanine: sections[1].stanine,
    readingStanine: sections[2].stanine,
    mathStanine: sections[3].stanine,
    averageScaledScore: Math.round(sections.reduce((a, s) => a + s.s, 0) / 4),
  };
};

export const eocScore: CustomCalculator = (v) => {
  const course = nonNeg(v.courseGrade);
  const w = Math.min(100, nonNeg(v.eocWeight)) / 100;
  const final = course * (1 - w) + nonNeg(v.eocScore) * w;
  const target = nonNeg(v.targetGrade);
  return { finalCourseGrade: round2(final), eocScoreNeeded: w > 0 ? round2((target - course * (1 - w)) / w) : 0, eocPointsInGrade: round2(nonNeg(v.eocScore) * w) };
};

export const solScore: CustomCalculator = (v) => {
  const total = Math.max(1, nonNeg(v.totalQuestions, 50));
  const p = clamp(nonNeg(v.correct) / total, 0, 1);
  const pass = clamp(nonNeg(v.passPercent, 60), 1, 99) / 100;
  const adv = clamp(nonNeg(v.advancedPercent, 85), pass * 100 + 1, 99.9) / 100;
  const scaled = p < pass ? (400 * p) / pass : p < adv ? 400 + (100 * (p - pass)) / (adv - pass) : 500 + (100 * (p - adv)) / (1 - adv);
  const s = Math.round(scaled);
  return { scaledScore: s, passed: s >= 400 ? 1 : 0, passAdvanced: s >= 500 ? 1 : 0, percentCorrect: round2(p * 100), questionsToPass: Math.max(0, Math.ceil(pass * total - nonNeg(v.correct))) };
};

export const englishRegentsScore: CustomCalculator = (v) => {
  const raw = clamp(nonNeg(v.part1Correct), 0, 24) + clamp(nonNeg(v.part2Essay), 0, 6) * 4 + clamp(nonNeg(v.part3Analysis), 0, 4) * 2;
  // Approximate conversion (56 weighted raw points): 65 at ~32 raw, 85 (mastery) at ~46 raw.
  const scale = raw < 32 ? (65 * raw) / 32 : raw < 46 ? 65 + (20 * (raw - 32)) / 14 : 85 + (15 * (raw - 46)) / 10;
  const s = Math.round(clamp(scale, 0, 100));
  return { scaleScore: s, weightedRawScore: raw, passed: s >= 65 ? 1 : 0, mastery: s >= 85 ? 1 : 0, performanceLevel: s >= 85 ? 5 : s >= 79 ? 4 : s >= 65 ? 3 : s >= 55 ? 2 : 1 };
};

export const actScholarship: CustomCalculator = (v) => {
  const act = nonNeg(v.actScore);
  const gpa = nonNeg(v.gpa);
  const tiers: [number, number, number][] = [[34, 3.8, 100], [32, 3.6, 75], [30, 3.5, 50], [28, 3.3, 35], [26, 3.2, 25], [24, 3.0, 15], [21, 2.8, 5]];
  const pctAward = tiers.find(([a, g]) => act >= a && gpa >= g)?.[2] ?? 0;
  const yearly = (nonNeg(v.tuition) * pctAward) / 100;
  const next = [...tiers].reverse().find(([, , p]) => p > pctAward && gpa >= tiers.find(([, , q]) => q === p)![1]);
  return {
    estimatedYearlyAward: round2(yearly),
    fourYearValue: round2(yearly * 4),
    shareOfTuition: pctAward,
    actPointsToNextTier: next ? Math.max(0, next[0] - act) : 0,
  };
};

export const eduTestsCustomCalculators: Record<string, CustomCalculator> = {
  "sat-score-calculator": satScore,
  "psat-score-calculator": psatScore,
  "act-score-calculator": actScore,
  "act-superscore-calculator": actSuperscore,
  "act-to-sat-conversion-calculator": actToSat,
  "psat-to-sat-score-calculator": psatToSat,
  "national-merit-selection-index-calculator": nationalMeritIndex,
  "shsat-score-calculator": shsatScore,
  "ssat-score-calculator": ssatScore,
  "isee-score-calculator": iseeScore,
  "eoc-score-calculator": eocScore,
  "sol-score-calculator": solScore,
  "english-regents-score-calculator": englishRegentsScore,
  "act-scholarship-calculator": actScholarship,
};
