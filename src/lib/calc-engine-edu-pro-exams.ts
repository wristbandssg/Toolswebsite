/**
 * Batch: "Jobs & Education Calculators" → Graduate & Professional Exam
 * Calculators (16 tools). Every exam equates its scale per form, so these are
 * calibrated estimates from published score ranges, pass points and
 * percentile tables:
 *  - lsat (120–180), mcat (four 118–132 sections, 472–528), gmat (Focus
 *    Edition 205–805 from three 60–90 sections), grePercentile (ETS
 *    percentile tables), dat (1–30 sections, Academic Average and Total
 *    Science).
 *  - praxis, mbe, mpre, naplex, clep, nbme: raw / percent correct → scaled
 *    score with the pass point.
 *  - barExam (UBE: MBE + written out of 400), californiaBar (2,000-point
 *    scale, 1,390 to pass; covers "CA Bar Exam").
 *  - hesi (A2 section average), atiTeas (TEAS 7 adjusted total and
 *    proficiency level), accaExemption (exemptions by qualification and
 *    fees saved).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-edu-pro-exams-calculators.ts for the copy.
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

/** Piecewise-linear interpolation through [x, y] points (x ascending). */
function curve(points: [number, number][], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x0, y0] = points[i - 1];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return points[points.length - 1][1];
}

const LSAT_CURVE: [number, number][] = [[0, 120], [0.2, 128], [0.4, 141], [0.57, 150], [0.66, 155], [0.75, 160], [0.82, 165], [0.88, 170], [0.93, 174], [0.97, 177], [1, 180]];
const LSAT_PCT: [number, number][] = [[120, 0], [130, 2], [135, 6], [140, 14], [145, 27], [150, 44], [155, 64], [160, 80], [165, 91], [170, 97], [175, 99], [180, 99.9]];

export const lsat: CustomCalculator = (v) => {
  const total = Math.max(1, nonNeg(v.totalQuestions, 76));
  const p = clamp(nonNeg(v.correct) / total, 0, 1);
  const scaled = Math.round(curve(LSAT_CURVE, p));
  const target = nonNeg(v.targetScore);
  let needed = 0;
  for (let k = 0; k <= total; k++) if (Math.round(curve(LSAT_CURVE, k / total)) >= target) { needed = k; break; }
  return { lsatScore: scaled, percentile: round2(curve(LSAT_PCT, scaled)), percentCorrect: round2(p * 100), correctNeededForTarget: target > 0 ? needed : 0 };
};

const MCAT_SECTION: [number, number][] = [[0, 0], [0.3, 0.07], [0.5, 0.36], [0.6, 0.5], [0.7, 0.64], [0.8, 0.79], [0.9, 0.93], [1, 1]];
const MCAT_PCT: [number, number][] = [[472, 0], [480, 3], [485, 8], [490, 17], [495, 30], [500, 47], [505, 64], [510, 80], [515, 93], [520, 98], [528, 100]];

export const mcat: CustomCalculator = (v) => {
  const sec = (c: number, t: number) => Math.round(118 + 14 * curve(MCAT_SECTION, clamp(nonNeg(c) / t, 0, 1)));
  const cp = sec(v.chemPhysCorrect, 59);
  const cars = sec(v.carsCorrect, 53);
  const bb = sec(v.bioBiochemCorrect, 59);
  const ps = sec(v.psychSocCorrect, 59);
  const total = cp + cars + bb + ps;
  return { totalScore: total, chemPhysScore: cp, carsScore: cars, bioBiochemScore: bb, psychSocScore: ps, percentile: round2(curve(MCAT_PCT, total)) };
};

const GMAT_PCT: [number, number][] = [[205, 0], [355, 3], [405, 8], [455, 19], [505, 35], [535, 47], [555, 55], [575, 64], [595, 72], [615, 79], [635, 86], [655, 91], [675, 96], [695, 98], [715, 99], [755, 99.9], [805, 100]];

export const gmat: CustomCalculator = (v) => {
  const q = clamp(nonNeg(v.quant, 60), 60, 90);
  const vb = clamp(nonNeg(v.verbal, 60), 60, 90);
  const di = clamp(nonNeg(v.dataInsights, 60), 60, 90);
  const total = clamp(Math.round((205 + ((q + vb + di - 180) * 600) / 90 - 5) / 10) * 10 + 5, 205, 805);
  return { totalScore: total, percentile: round2(curve(GMAT_PCT, total)), sectionAverage: round2((q + vb + di) / 3) };
};

const GRE_V: [number, number][] = [[130, 0], [135, 3], [140, 11], [145, 27], [150, 48], [155, 68], [160, 86], [165, 96], [170, 99]];
const GRE_Q: [number, number][] = [[130, 0], [135, 2], [140, 7], [145, 18], [150, 34], [155, 52], [160, 70], [165, 84], [170, 96]];
const GRE_AW: [number, number][] = [[0, 0], [2, 2], [2.5, 7], [3, 15], [3.5, 38], [4, 54], [4.5, 81], [5, 91], [5.5, 98], [6, 99]];

export const grePercentile: CustomCalculator = (v) => {
  const vb = clamp(nonNeg(v.verbal, 130), 130, 170);
  const q = clamp(nonNeg(v.quant, 130), 130, 170);
  return {
    verbalPercentile: round2(curve(GRE_V, vb)),
    quantPercentile: round2(curve(GRE_Q, q)),
    writingPercentile: round2(curve(GRE_AW, clamp(nonNeg(v.writing), 0, 6))),
    combinedScore: vb + q,
  };
};

const DAT_AA_PCT: [number, number][] = [[1, 0], [14, 8], [16, 24], [17, 38], [18, 52], [19, 66], [20, 80], [21, 90], [22, 94], [23, 97], [25, 99.5], [30, 100]];

export const dat: CustomCalculator = (v) => {
  const s = (c: number, t: number) => Math.round(clamp(1 + 29 * Math.pow(clamp(nonNeg(c) / t, 0, 1), 1.3), 1, 30));
  const bio = s(v.biologyCorrect, 40);
  const gc = s(v.genChemCorrect, 30);
  const oc = s(v.orgoCorrect, 30);
  const pat = s(v.patCorrect, 90);
  const rc = s(v.readingCorrect, 50);
  const qr = s(v.quantCorrect, 40);
  const aa = Math.round((bio + gc + oc + rc + qr) / 5);
  return { academicAverage: aa, totalScience: Math.round((bio + gc + oc) / 3), perceptualAbility: pat, biology: bio, generalChemistry: gc, organicChemistry: oc, readingComprehension: rc, quantitativeReasoning: qr, academicAveragePercentile: round2(curve(DAT_AA_PCT, aa)) };
};

export const praxis: CustomCalculator = (v) => {
  const p = clamp(nonNeg(v.percentCorrect) / 100, 0, 1);
  const scaled = Math.round(100 + 100 * p);
  const pass = nonNeg(v.passingScore);
  return { scaledScore: scaled, passed: scaled >= pass ? 1 : 0, pointsVsPassing: scaled - pass, percentCorrectNeeded: round2(clamp(pass - 100, 0, 100)) };
};

export const mbe: CustomCalculator = (v) => {
  const raw = clamp(nonNeg(v.rawCorrect), 0, 175);
  const scaled = round2(raw * 0.857 + 37);
  const target = nonNeg(v.targetScaled, 135);
  return { mbeScaledScore: scaled, percentCorrect: round2((raw / 175) * 100), rawNeededForTarget: Math.max(0, Math.ceil((target - 37) / 0.857)), writtenNeededFor266: round2(Math.max(0, 266 - scaled)) };
};

const MPRE_CURVE: [number, number][] = [[0, 50], [0.4, 65], [0.5, 75], [0.6, 85], [0.7, 95], [0.8, 107], [0.9, 120], [1, 150]];

export const mpre: CustomCalculator = (v) => {
  const p = clamp(nonNeg(v.rawCorrect) / 50, 0, 1);
  const scaled = Math.round(curve(MPRE_CURVE, p));
  const pass = nonNeg(v.passingScore, 85);
  let need = 0;
  for (let k = 0; k <= 50; k++) if (Math.round(curve(MPRE_CURVE, k / 50)) >= pass) { need = k; break; }
  return { mpreScaledScore: scaled, passed: scaled >= pass ? 1 : 0, rawNeededToPass: need, percentCorrect: round2(p * 100) };
};

const NAPLEX_CURVE: [number, number][] = [[0, 0], [0.4, 40], [0.6, 72], [0.65, 78], [0.75, 92], [0.85, 110], [1, 150]];

export const naplex: CustomCalculator = (v) => {
  const p = clamp(nonNeg(v.percentCorrect) / 100, 0, 1);
  const scaled = Math.round(curve(NAPLEX_CURVE, p));
  return { naplexScaledScore: scaled, passed: scaled >= 75 ? 1 : 0, pointsVsPassing: scaled - 75 };
};

export const barExam: CustomCalculator = (v) => {
  const mbeScaled = clamp(nonNeg(v.mbeScaled), 0, 200);
  const mee = clamp(nonNeg(v.meeAverage), 1, 6);
  const mpt = clamp(nonNeg(v.mptAverage), 1, 6);
  // Written raw: MEE 60%, MPT 40%; scaled to the MBE scale (≈ 40 + 25 × weighted average).
  const writtenAvg = mee * 0.6 + mpt * 0.4;
  const written = round2(40 + 25 * writtenAvg);
  const total = round2(mbeScaled + written);
  const pass = nonNeg(v.passingScore, 266);
  return { ubeScore: total, mbeScaled, writtenScaled: written, passed: total >= pass ? 1 : 0, pointsVsPassing: round2(total - pass) };
};

export const californiaBar: CustomCalculator = (v) => {
  const mbeCa = clamp(nonNeg(v.mbeScaled), 0, 200) * 4.8;
  const essays = [1, 2, 3, 4, 5].reduce((s, i) => s + clamp(nonNeg(v[`essay${i}`]), 0, 100), 0);
  const writtenRaw = essays + clamp(nonNeg(v.performanceTest), 0, 100) * 2;
  const writtenCa = writtenRaw * 1.5;
  const total = Math.round(mbeCa + writtenCa);
  return { totalScaledScore: total, passed: total >= 1390 ? 1 : 0, pointsVsPassing: total - 1390, mbePortion: Math.round(mbeCa), writtenPortion: Math.round(writtenCa), writtenRawScore: writtenRaw };
};

export const hesi: CustomCalculator = (v) => {
  const keys = ["math", "reading", "vocabulary", "grammar", "anatomyPhysiology", "biology", "chemistry"];
  const scores = keys.map((k) => nonNeg(v[k])).filter((s) => s > 0);
  const cumulative = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const min = nonNeg(v.programMinimum, 80);
  return { cumulativeScore: round2(cumulative), meetsProgramMinimum: cumulative >= min ? 1 : 0, sectionsTaken: scores.length, sectionsBelowMinimum: scores.filter((s) => s < min).length, lowestSection: scores.length ? Math.min(...scores) : 0 };
};

export const atiTeas: CustomCalculator = (v) => {
  const r = clamp(nonNeg(v.readingCorrect), 0, 39);
  const m = clamp(nonNeg(v.mathCorrect), 0, 34);
  const s = clamp(nonNeg(v.scienceCorrect), 0, 44);
  const e = clamp(nonNeg(v.englishCorrect), 0, 33);
  const total = ((r + m + s + e) / 150) * 100;
  const level = total >= 90.7 ? 5 : total >= 78.7 ? 4 : total >= 58.7 ? 3 : total >= 41.3 ? 2 : 1;
  return { adjustedIndividualTotal: round2(total), proficiencyLevel: level, readingPercent: round2((r / 39) * 100), mathPercent: round2((m / 34) * 100), sciencePercent: round2((s / 44) * 100), englishPercent: round2((e / 33) * 100) };
};

export const nbme: CustomCalculator = (v) => {
  const p = clamp(nonNeg(v.percentCorrect) / 100, 0, 1);
  const step2 = yes(v.step2);
  const passPoint = step2 ? 218 : 196;
  const score = Math.round(step2 ? 218 + (p - 0.6) * 260 : 196 + (p - 0.6) * 250);
  const prob = 1 / (1 + Math.exp(-(score - passPoint) / 7));
  return { threeDigitEquivalent: score, passProbability: round2(prob * 100), pointsVsPassing: score - passPoint };
};

export const clep: CustomCalculator = (v) => {
  const p = clamp(nonNeg(v.percentCorrect) / 100, 0, 1);
  const scaled = Math.round(20 + 60 * Math.pow(p, 1.2));
  return { clepScaledScore: scaled, passed: scaled >= 50 ? 1 : 0, collegeCredits: scaled >= 50 ? nonNeg(v.creditsOffered, 3) : 0, percentCorrectToPass: round2(Math.pow(0.5, 1 / 1.2) * 100) };
};

// ACCA exemptions by qualification (of 13 exams): accredited accounting degree up to 9, etc.
const ACCA_EXEMPTIONS = [9, 4, 3, 1, 9, 0];

export const accaExemption: CustomCalculator = (v) => {
  const ex = ACCA_EXEMPTIONS[Math.min(5, Math.round(nonNeg(v.qualification)))] ?? 0;
  const knowledge = Math.min(3, ex);
  const skills = Math.max(0, ex - 3);
  const fees = knowledge * nonNeg(v.knowledgeExemptionFee) + skills * nonNeg(v.skillsExemptionFee);
  const saved = ex * nonNeg(v.examFee) - fees;
  return { exemptions: ex, examsRemaining: 13 - ex, exemptionFees: round2(fees), examFeesSaved: round2(Math.max(0, saved)), monthsSaved: ex * nonNeg(v.monthsPerExam, 3) };
};

export const eduProExamsCustomCalculators: Record<string, CustomCalculator> = {
  "lsat-score-calculator": lsat,
  "mcat-score-calculator": mcat,
  "gmat-score-calculator": gmat,
  "gre-percentile-calculator": grePercentile,
  "dat-score-calculator": dat,
  "praxis-score-calculator": praxis,
  "mbe-score-calculator": mbe,
  "mpre-score-calculator": mpre,
  "naplex-score-calculator": naplex,
  "bar-exam-calculator": barExam,
  "california-bar-exam-score-calculator": californiaBar,
  "hesi-score-calculator": hesi,
  "ati-teas-score-calculator": atiTeas,
  "nbme-score-calculator": nbme,
  "clep-score-calculator": clep,
  "acca-exemption-calculator": accaExemption,
};
