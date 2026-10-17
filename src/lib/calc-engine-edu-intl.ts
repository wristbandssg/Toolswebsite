/**
 * Batch: "Jobs & Education Calculators" → International Exam & Admission
 * Points Calculators (9 tools):
 *  - atar: Victorian-style aggregate (English + best three + 10% of the 5th
 *    and 6th scaled study scores) → estimated ATAR.
 *  - ibScore: six subjects + the TOK/EE core matrix, with the main diploma
 *    pass conditions.
 *  - ucasPoints: UCAS Tariff for A levels, AS levels and the EPQ.
 *  - ieltsScore: Listening / Reading raw → band (Academic or General
 *    Training reading), overall band with IELTS rounding.
 *  - toeflScore: four 0–30 sections → 0–120 total and the 1–6 band used
 *    since January 2026, with CEFR level.
 *  - caoPoints: Leaving Certificate best six, with the 25-point Higher
 *    Maths bonus.
 *  - ucatScore: three cognitive subtests (300–900) → total and percentile,
 *    plus the SJT band.
 *  - upscAge / ndaAge: age on the cut-off date and eligibility for the UPSC
 *    Civil Services Exam (by category) and the NDA (16½–19½ at course start).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-edu-intl-calculators.ts for the copy.
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

function curve(points: [number, number][], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x0, y0] = points[i - 1];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return points[points.length - 1][1];
}

const ATAR_CURVE: [number, number][] = [[0, 0], [80, 28], [90, 36], [100, 44], [110, 52], [120, 60], [130, 67], [140, 74], [150, 80], [160, 85.5], [170, 90], [180, 94], [190, 97], [200, 99], [210, 99.95]];

export const atar: CustomCalculator = (v) => {
  const scores = [v.subject2, v.subject3, v.subject4, v.subject5, v.subject6].map((s) => clamp(nonNeg(s), 0, 60)).sort((a, b) => b - a);
  const english = clamp(nonNeg(v.englishScore), 0, 60);
  const aggregate = english + scores[0] + scores[1] + scores[2] + 0.1 * (scores[3] + scores[4]);
  const est = Math.min(99.95, Math.round(curve(ATAR_CURVE, aggregate) * 20) / 20);
  return { estimatedAtar: est, aggregate: round2(aggregate), primaryFour: round2(english + scores[0] + scores[1] + scores[2]), incrementBonus: round2(0.1 * (scores[3] + scores[4])) };
};

// TOK (rows) × EE (columns) core points, grades A–E; -1 = failing condition.
const CORE: number[][] = [
  [3, 3, 2, 2, -1],
  [3, 2, 2, 1, -1],
  [2, 2, 1, 0, -1],
  [2, 1, 0, 0, -1],
  [-1, -1, -1, -1, -1],
];

export const ibScore: CustomCalculator = (v) => {
  const grades = [1, 2, 3, 4, 5, 6].map((i) => clamp(Math.round(nonNeg(v[`subject${i}`], 1)), 1, 7));
  const core = CORE[clamp(Math.round(nonNeg(v.tok)), 0, 4)][clamp(Math.round(nonNeg(v.ee)), 0, 4)];
  const subjects = grades.reduce((a, b) => a + b, 0);
  const total = subjects + Math.max(0, core);
  const hl = grades[0] + grades[1] + grades[2];
  const sl = grades[3] + grades[4] + grades[5];
  const twos = grades.filter((g) => g === 2).length;
  const threesOrLess = grades.filter((g) => g <= 3).length;
  const passes = core >= 0 && total >= 24 && !grades.includes(1) && twos <= 2 && threesOrLess <= 3 && hl >= 12 && sl >= 9 && yes(v.casComplete);
  return { totalPoints: total, subjectPoints: subjects, corePoints: Math.max(0, core), higherLevelPoints: hl, standardLevelPoints: sl, diplomaAwarded: passes ? 1 : 0 };
};

const A_LEVEL = [56, 48, 40, 32, 24, 16, 0]; // A*, A, B, C, D, E, none
const AS_LEVEL = [20, 16, 12, 10, 6, 0]; // A, B, C, D, E, none
const EPQ = [28, 24, 20, 16, 12, 8, 0]; // A*, A, B, C, D, E, none

export const ucasPoints: CustomCalculator = (v) => {
  const a = [1, 2, 3, 4].reduce((s, i) => s + (A_LEVEL[clamp(Math.round(nonNeg(v[`aLevel${i}`], 6)), 0, 6)] ?? 0), 0);
  const as = [1, 2].reduce((s, i) => s + (AS_LEVEL[clamp(Math.round(nonNeg(v[`asLevel${i}`], 5)), 0, 5)] ?? 0), 0);
  const epq = EPQ[clamp(Math.round(nonNeg(v.epq, 6)), 0, 6)] ?? 0;
  const total = a + as + epq;
  const target = nonNeg(v.offerPoints);
  return { ucasTariffPoints: total, aLevelPoints: a, asLevelPoints: as, epqPoints: epq, pointsVsOffer: target > 0 ? total - target : 0 };
};

const LISTENING: [number, number][] = [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1], [0, 0]];
const READING_ACADEMIC: [number, number][] = [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1], [0, 0]];
const READING_GENERAL: [number, number][] = [[40, 9], [39, 8.5], [37, 8], [36, 7.5], [34, 7], [32, 6.5], [30, 6], [27, 5.5], [23, 5], [19, 4.5], [15, 4], [12, 3.5], [9, 3], [6, 2.5], [3, 2], [1, 1], [0, 0]];
const band = (table: [number, number][], raw: number) => table.find(([r]) => clamp(Math.round(nonNeg(raw)), 0, 40) >= r)?.[1] ?? 0;

/** IELTS overall: average of four bands; .25 rounds up to .5 and .75 up to the next whole band. */
function ieltsRound(avg: number) {
  const q = Math.floor(avg * 4 + 1e-9) / 4;
  const frac = q - Math.floor(q);
  return frac === 0.25 || frac === 0.75 ? q + 0.25 : q;
}

export const ieltsScore: CustomCalculator = (v) => {
  const l = band(LISTENING, v.listeningCorrect);
  const r = band(yes(v.generalTraining) ? READING_GENERAL : READING_ACADEMIC, v.readingCorrect);
  const w = clamp(Math.round(nonNeg(v.writingBand) * 2) / 2, 0, 9);
  const s = clamp(Math.round(nonNeg(v.speakingBand) * 2) / 2, 0, 9);
  const overall = ieltsRound((l + r + w + s) / 4);
  return { overallBand: overall, listeningBand: l, readingBand: r, writingBand: w, speakingBand: s, meetsTarget: overall >= nonNeg(v.targetBand) && Math.min(l, r, w, s) >= nonNeg(v.minimumSectionBand) ? 1 : 0 };
};

// Lower bounds of the 0–120 total for each 1–6 band (ETS score scale update, January 2026).
const TOEFL_BANDS: [number, number][] = [[114, 6], [105, 5.5], [95, 5], [84, 4.5], [72, 4], [58, 3.5], [44, 3], [35, 2.5], [24, 2], [12, 1.5], [0, 1]];

export const toeflScore: CustomCalculator = (v) => {
  const secs = [v.reading, v.listening, v.speaking, v.writing].map((s) => clamp(nonNeg(s), 0, 30));
  const total = Math.round(secs.reduce((a, b) => a + b, 0));
  const b = TOEFL_BANDS.find(([t]) => total >= t)?.[1] ?? 1;
  const cefr = total >= 114 ? 6 : total >= 95 ? 5 : total >= 72 ? 4 : total >= 42 ? 3 : 2;
  return { totalScore: total, newScaleBand: b, cefrLevel: cefr, pointsVsRequirement: total - nonNeg(v.requiredScore) };
};

// CAO points: H1–H8 then O1–O8.
const CAO = [100, 88, 77, 66, 56, 46, 37, 0, 56, 46, 37, 28, 20, 12, 0, 0];

export const caoPoints: CustomCalculator = (v) => {
  const pts: number[] = [];
  let bonus = 0;
  for (let i = 1; i <= 8; i++) {
    const g = Math.round(safeNumber(v[`subject${i}`], -1));
    if (g < 0 || g > 15) continue;
    let p = CAO[g];
    if (i === 1 && g <= 5) {
      bonus = 25; // Higher Level Maths H6 or above
      p += 25;
    }
    pts.push(p);
  }
  const best = pts.sort((a, b) => b - a).slice(0, 6);
  const total = best.reduce((a, b) => a + b, 0);
  return { caoPoints: total, mathsBonus: bonus, subjectsCounted: best.length, pointsVsCourse: nonNeg(v.coursePoints) > 0 ? total - nonNeg(v.coursePoints) : 0 };
};

const UCAT_PCT: [number, number][] = [[900, 0], [1500, 3], [1640, 10], [1720, 20], [1780, 30], [1840, 40], [1880, 50], [1930, 60], [1980, 70], [2040, 80], [2140, 90], [2250, 96], [2400, 99.5], [2700, 100]];

export const ucatScore: CustomCalculator = (v) => {
  const vr = clamp(nonNeg(v.verbal, 300), 300, 900);
  const dm = clamp(nonNeg(v.decision, 300), 300, 900);
  const qr = clamp(nonNeg(v.quant, 300), 300, 900);
  const total = vr + dm + qr;
  const pct = curve(UCAT_PCT, total);
  return { totalScore: total, estimatedPercentile: round2(pct), decile: Math.min(10, Math.max(1, Math.ceil(pct / 10))), averageSubtest: Math.round(total / 3), sjtBand: clamp(Math.round(nonNeg(v.sjtBand, 2)), 1, 4) };
};

/** Age in decimal years on a given date (y, m, d). */
function ageOn(by: number, bm: number, bd: number, y: number, m: number, d: number) {
  let years = y - by;
  if (m < bm || (m === bm && d < bd)) years -= 1;
  const lastBirthday = new Date(Date.UTC(by + years, bm - 1, bd));
  const target = new Date(Date.UTC(y, m - 1, d));
  const months = Math.floor((target.getTime() - lastBirthday.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
  return { years, months: clamp(months, 0, 11), exact: years + months / 12 };
}

// UPSC CSE upper age (must not have attained it on 1 August): General/EWS 32, OBC +3, SC/ST +5; PwBD +10; [age limit, attempts (0 = unlimited)].
const UPSC: [number, number][] = [[32, 6], [35, 9], [37, 0], [42, 9], [45, 9], [47, 0]];

export const upscAge: CustomCalculator = (v) => {
  const year = Math.round(nonNeg(v.examYear, 2027));
  const a = ageOn(Math.round(nonNeg(v.birthYear)), Math.round(nonNeg(v.birthMonth, 1)), Math.round(nonNeg(v.birthDay, 1)), year, 8, 1);
  const [limit, attempts] = UPSC[clamp(Math.round(nonNeg(v.category)), 0, 5)];
  const eligible = a.years >= 21 && a.years < limit;
  return {
    eligible: eligible ? 1 : 0,
    ageYearsOnAugust1: a.years,
    ageExtraMonths: a.months,
    upperAgeLimit: limit,
    yearsLeftToApply: eligible ? limit - 1 - a.years : 0,
    attemptsAllowed: attempts,
  };
};

export const ndaAge: CustomCalculator = (v) => {
  const year = Math.round(nonNeg(v.examYear, 2027));
  const second = yes(v.ndaTwo);
  // Course starts on 2 January (NDA I) or 1 July (NDA II) of the year after the exam.
  const a = ageOn(Math.round(nonNeg(v.birthYear)), Math.round(nonNeg(v.birthMonth, 1)), Math.round(nonNeg(v.birthDay, 1)), year + 1, second ? 7 : 1, second ? 1 : 2);
  const months = a.years * 12 + a.months;
  return {
    eligible: months >= 198 && months < 234 ? 1 : 0,
    ageYearsAtCourseStart: a.years,
    ageExtraMonths: a.months,
    monthsTooYoung: Math.max(0, 198 - months),
    monthsTooOld: Math.max(0, months - 233),
  };
};

export const eduIntlCustomCalculators: Record<string, CustomCalculator> = {
  "atar-calculator": atar,
  "ib-score-calculator": ibScore,
  "ucas-points-calculator": ucasPoints,
  "ielts-score-calculator": ieltsScore,
  "toefl-score-calculator": toeflScore,
  "cao-points-calculator": caoPoints,
  "ucat-score-calculator": ucatScore,
  "age-calculator-of-upsc": upscAge,
  "age-calculator-of-nda": ndaAge,
};
