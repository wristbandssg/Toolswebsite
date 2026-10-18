/**
 * Batch: "Law & Government Calculators" → Military & Veterans Calculators —
 * VA benefits, GI Bill & veteran property tax exemptions (9 tools).
 *
 * Data:
 *  - VA compensation (veteran alone) from 1 Dec 2025 (2.8% COLA).
 *  - SMC from 1 Dec 2025 (veteran alone): K $139.87 per award (up to 3),
 *    S $4,408.53, L $4,900.83, M $5,408.55, M½ $5,780.00, N $6,152.64,
 *    N½ $6,514.00, O/P $6,877.12.
 *  - 38 CFR 4.85 Tables VI, VIa and VII (hearing impairment) and the 4.86
 *    exceptional patterns.
 *  - PCAFC caregiver stipend: GS-4 step 1 (2026 base $31,103) × (1 + locality)
 *    ÷ 12 × 62.5% (Level 1) or 100% (Level 2); "Rest of US" locality 17.06%.
 *  - VR&E (Chapter 31) FY2026 subsistence, from 1 Oct 2025.
 *  - Post-9/11 GI Bill 2026–27 (from 1 Aug 2026): private/foreign tuition
 *    cap $30,908.34, books $41.67 per credit up to $1,000, online-only
 *    housing $1,261.
 *  - MGIB-AD 2025–26 three-year rate $2,518 full time (¾ $1,888.50, ½ $1,259).
 *  - NY Real Property Tax Law §458-a (alternative veterans exemption) and
 *    Texas Tax Code §11.22 / §11.131.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-law-mil-va-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

export const VA_ALONE_2026: Record<number, number> = {
  0: 0, 10: 180.42, 20: 356.66, 30: 552.47, 40: 795.84, 50: 1132.9, 60: 1435.02, 70: 1808.45, 80: 2102.15, 90: 2362.3, 100: 3938.58,
};
export const vaRate = (rating: number) => VA_ALONE_2026[Math.min(100, Math.max(0, Math.round(nonNeg(rating) / 10) * 10))] ?? 0;

/** VA back pay: monthly rate × months owed (+ optional dependent add-on). */
export const vaBackPay: CustomCalculator = (v) => {
  const months = nonNeg(v.monthsOwed);
  const monthly = vaRate(v.rating) + (nonNeg(v.rating) >= 30 ? nonNeg(v.dependentAddOn) : 0);
  const prior = vaRate(v.priorRating);
  const diff = Math.max(0, monthly - prior);
  return {
    estimatedBackPay: round2(diff * months),
    newMonthlyPayment: round2(monthly),
    previousMonthlyPayment: round2(prior),
    monthlyIncrease: round2(diff),
    annualIncrease: round2(diff * 12),
  };
};

export const GS4_STEP1_2026 = 31103;

/** PCAFC caregiver stipend. */
export const vaCaregiverStipend: CustomCalculator = (v) => {
  const annual = GS4_STEP1_2026 * (1 + nonNeg(v.localityPercent, 17.06) / 100);
  const level = Math.round(safeNumber(v.level)) === 2 ? 1 : 0.625;
  const monthly = (annual / 12) * level;
  return {
    monthlyStipend: round2(monthly),
    annualStipend: round2(monthly * 12),
    gs4Step1LocalityAnnual: round2(annual),
    levelPercent: level * 100,
  };
};

/** Table VI rows (speech % lower bounds) × columns (PTA upper bounds). */
const T6_COLS = [41, 49, 57, 65, 73, 81, 89, 97, Infinity];
const T6_ROWS: [number, number[]][] = [
  [92, [1, 1, 1, 2, 2, 2, 3, 3, 4]],
  [84, [2, 2, 2, 3, 3, 3, 4, 4, 4]],
  [76, [3, 3, 4, 4, 4, 5, 5, 5, 5]],
  [68, [4, 4, 5, 5, 6, 6, 7, 7, 7]],
  [60, [5, 5, 6, 6, 7, 7, 8, 8, 8]],
  [52, [6, 6, 7, 7, 8, 8, 8, 8, 9]],
  [44, [7, 7, 8, 8, 8, 9, 9, 9, 10]],
  [36, [8, 8, 8, 9, 9, 9, 10, 10, 10]],
  [0, [9, 10, 11, 11, 11, 11, 11, 11, 11]],
];
export function tableVI(pta: number, speech: number): number {
  const s = Math.min(100, nonNeg(speech));
  // Scores fall between the published bands in steps of 2 (e.g. 91 → the 84–90 row).
  const row = T6_ROWS.find(([min]) => s >= min) ?? T6_ROWS[T6_ROWS.length - 1];
  const col = T6_COLS.findIndex((max) => Math.round(nonNeg(pta)) <= max);
  return row[1][col];
}
const T6A = [41, 48, 55, 62, 69, 76, 83, 90, 97, 104, Infinity];
export function tableVIa(pta: number): number {
  return T6A.findIndex((max) => Math.round(nonNeg(pta)) <= max) + 1;
}
/** Table VII: rating by [better ear numeral][poorer ear numeral] (1-based). */
const T7: Record<number, number[]> = {
  // poorer ear:  I  II III  IV   V  VI VII VIII IX   X  XI
  1: [0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10],
  2: [0, 0, 0, 0, 10, 10, 10, 10, 10, 10, 10],
  3: [0, 0, 0, 10, 10, 10, 20, 20, 20, 20, 20],
  4: [0, 0, 0, 10, 10, 20, 20, 20, 30, 30, 30],
  5: [0, 0, 0, 0, 20, 20, 30, 30, 40, 40, 40],
  6: [0, 0, 0, 0, 0, 30, 30, 40, 40, 50, 50],
  7: [0, 0, 0, 0, 0, 0, 40, 40, 50, 60, 60],
  8: [0, 0, 0, 0, 0, 0, 0, 50, 50, 60, 70],
  9: [0, 0, 0, 0, 0, 0, 0, 0, 60, 70, 80],
  10: [0, 0, 0, 0, 0, 0, 0, 0, 0, 80, 90],
  11: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100],
};
export function tableVII(a: number, b: number): number {
  const better = Math.min(a, b);
  const poorer = Math.max(a, b);
  return T7[better][poorer - 1];
}

function earNumeral(f1: number, f2: number, f3: number, f4: number, speech: number): number {
  const t = [f1, f2, f3, f4].map((x) => nonNeg(x));
  const pta = t.reduce((s, x) => s + x, 0) / 4;
  const vi = tableVI(pta, speech);
  const via = tableVIa(pta);
  // 4.86(a): all four frequencies 55 dB+ → the higher of VI and VIa.
  if (t.every((x) => x >= 55)) return Math.max(vi, via);
  // 4.86(b): 30 dB or less at 1000 Hz and 70 dB+ at 2000 Hz → higher numeral, then the next higher.
  if (t[0] <= 30 && t[1] >= 70) return Math.min(11, Math.max(vi, via) + 1);
  return vi;
}

/** VA hearing loss rating from an audiogram (both ears). */
export const vaHearingLoss: CustomCalculator = (v) => {
  const right = earNumeral(v.right1000, v.right2000, v.right3000, v.right4000, v.rightSpeech);
  const left = earNumeral(v.left1000, v.left2000, v.left3000, v.left4000, v.leftSpeech);
  const oneEar = Math.round(safeNumber(v.serviceConnectedEars));
  const r = oneEar === 1 ? right : oneEar === 2 ? 1 : right;
  const l = oneEar === 1 ? 1 : oneEar === 2 ? left : left;
  const rating = tableVII(r, l);
  const avg = (a: number[]) => round2(a.reduce((s, x) => s + nonNeg(x), 0) / 4);
  return {
    hearingLossRating: rating,
    rightEarNumeral: right,
    leftEarNumeral: left,
    rightPureToneAverage: avg([v.right1000, v.right2000, v.right3000, v.right4000]),
    leftPureToneAverage: avg([v.left1000, v.left2000, v.left3000, v.left4000]),
    monthlyPayIfOnlyRating: vaRate(rating),
  };
};

export const SMC_2026: Record<number, number> = { 1: 4408.53, 2: 4900.83, 3: 5408.55, 4: 5780.0, 5: 6152.64, 6: 6514.0, 7: 6877.12 };
export const SMC_K = 139.87;

/** SMC: chosen level (or basic rating) + SMC-K awards, capped at the O rate. */
export const vaSmc: CustomCalculator = (v) => {
  const level = Math.round(safeNumber(v.smcLevel));
  const base = level === 0 ? vaRate(v.rating) : SMC_2026[level] ?? 0;
  const kAwards = level === 7 ? 0 : Math.min(3, Math.round(nonNeg(v.kAwards)));
  // With the basic rate or SMC-S, SMC-K can't lift the total above the L rate; higher levels cap at O.
  const total = Math.min(level <= 1 ? SMC_2026[2] : SMC_2026[7], base + kAwards * SMC_K);
  return {
    monthlySmcPayment: round2(total),
    baseRate: round2(base),
    smcKAmount: round2(kAwards * SMC_K),
    annualPayment: round2(total * 12),
    increaseOverBasic: round2(total - vaRate(v.rating)),
  };
};

/** VR&E Chapter 31 subsistence (FY2026) or the Post-9/11 rate election. */
const VRE_RATES: Record<number, [number, number, number, number]> = {
  1: [812.84, 1008.24, 1188.15, 86.58],
  2: [610.76, 757.28, 888.32, 66.6],
  3: [408.66, 506.32, 595.16, 44.42],
  4: [204.3, 253.2, 297.59, 22.16],
};
export const vreMonthly: CustomCalculator = (v) => {
  const t = Math.min(4, Math.max(1, Math.round(safeNumber(v.trainingTime, 1))));
  const deps = Math.round(nonNeg(v.dependents));
  const [d0, d1, d2, add] = VRE_RATES[t];
  const ch31 = deps === 0 ? d0 : deps === 1 ? d1 : d2 + add * (deps - 2);
  const bah = nonNeg(v.e5BahWithDependents);
  // The Post-9/11 rate election pays E-5 with-dependents BAH, scaled by rate of pursuit (none at half time or less).
  const pursuit = t === 1 ? 1 : t === 2 ? 0.8 : 0;
  const p911 = bah * pursuit;
  const best = Math.max(ch31, p911);
  return {
    monthlyPayment: round2(best),
    chapter31Rate: round2(ch31),
    post911RateElection: round2(p911),
    usePost911Rate: p911 > ch31 ? 1 : 0,
    annualPayment: round2(best * 12),
  };
};

export const GI_PRIVATE_CAP_2026_27 = 30908.34;
export const GI_ONLINE_MHA_2026_27 = 1261;

/** Post-9/11 GI Bill (Chapter 33) for one academic year. */
export const giBill: CustomCalculator = (v) => {
  const tier = Math.min(100, Math.max(50, nonNeg(v.benefitPercent, 100))) / 100;
  const tuition = nonNeg(v.tuitionAndFees);
  const isPrivate = Math.round(safeNumber(v.schoolType)) === 1;
  const covered = (isPrivate ? Math.min(tuition, GI_PRIVATE_CAP_2026_27) : tuition) * tier;
  const yellowRibbon = isPrivate && tier === 1 ? Math.min(Math.max(0, tuition - GI_PRIVATE_CAP_2026_27), nonNeg(v.yellowRibbonSchool) * 2) : 0;
  const credits = nonNeg(v.creditsPerTerm, 12);
  const pursuit = Math.min(1, credits / Math.max(1, nonNeg(v.fullTimeCredits, 12)));
  const online = Math.round(safeNumber(v.onlineOnly)) === 1;
  const mhaBase = online ? GI_ONLINE_MHA_2026_27 : nonNeg(v.e5BahWithDependents);
  const mha = pursuit > 0.5 ? mhaBase * (Math.round(pursuit * 10) / 10) * tier : 0;
  const months = nonNeg(v.monthsInSchool, 9);
  const terms = Math.max(1, Math.round(nonNeg(v.termsPerYear, 2)));
  const books = Math.min(1000, 41.67 * Math.min(24, credits * terms)) * tier;
  const total = covered + yellowRibbon + mha * months + books;
  return {
    totalYearlyBenefit: round2(total),
    tuitionPaid: round2(covered + yellowRibbon),
    monthlyHousingAllowance: round2(mha),
    booksStipend: round2(books),
    tuitionYouPay: round2(Math.max(0, tuition - covered - yellowRibbon)),
  };
};

const MGIB_RATES: Record<number, number> = { 1: 2518, 2: 1888.5, 3: 1259 };
/** Montgomery GI Bill – Active Duty (Chapter 30). */
export const mgib: CustomCalculator = (v) => {
  const t = Math.min(3, Math.max(1, Math.round(safeNumber(v.enrollment, 1))));
  const kicker = nonNeg(v.monthlyKicker);
  const buyUp = Math.round(safeNumber(v.buyUp)) === 1 ? 150 : 0;
  const monthly = MGIB_RATES[t] + (kicker + buyUp) * (t === 1 ? 1 : t === 2 ? 0.75 : 0.5);
  const months = Math.min(36, nonNeg(v.monthsRemaining, 36));
  return {
    monthlyPayment: round2(monthly),
    totalRemainingBenefit: round2(monthly * months),
    baseRate: MGIB_RATES[t],
    perAcademicYear: round2(monthly * 9),
  };
};

/** New York alternative veterans exemption (RPTL 458-a). */
export const nyVeteransExemption: CustomCalculator = (v) => {
  const av = nonNeg(v.assessedValue);
  const capMult = nonNeg(v.capMultiplier, 1);
  const eq = Math.max(0.01, nonNeg(v.equalizationRatePercent, 100) / 100);
  const war = Math.round(safeNumber(v.wartime)) === 1 ? Math.min(av * 0.15, 12000 * capMult * eq) : 0;
  const combat = Math.round(safeNumber(v.combatZone)) === 1 ? Math.min(av * 0.1, 8000 * capMult * eq) : 0;
  const disab = Math.min(av * (Math.min(100, nonNeg(v.disabilityRating)) / 100), 40000 * capMult * eq);
  const total = Math.min(av, war + combat + (war > 0 ? disab : 0));
  const rate = nonNeg(v.taxRatePer1000) / 1000;
  return {
    totalExemption: round2(total),
    wartimeExemption: round2(war),
    combatExemption: round2(combat),
    disabilityExemption: round2(war > 0 ? disab : 0),
    estimatedTaxSavings: round2(total * rate),
  };
};

/** Texas disabled veteran exemption (§11.22) and 100% / IU homestead exemption (§11.131). */
export const texasDvExemption: CustomCalculator = (v) => {
  const value = nonNeg(v.appraisedValue);
  const rating = Math.min(100, nonNeg(v.disabilityRating));
  const homestead = Math.round(safeNumber(v.homestead)) === 1;
  const total100 = homestead && (rating >= 100 || Math.round(safeNumber(v.unemployable)) === 1);
  let dv = rating >= 70 ? 12000 : rating >= 50 ? 10000 : rating >= 30 ? 7500 : rating >= 10 ? 5000 : 0;
  if (rating >= 10 && Math.round(safeNumber(v.age65OrBlind)) === 1) dv = 12000;
  const exempt = total100 ? value : Math.min(value, dv);
  const rate = nonNeg(v.taxRatePercent) / 100;
  return {
    exemptValue: round2(exempt),
    taxableValue: round2(value - exempt),
    estimatedTaxSavings: round2(exempt * rate),
    fullHomesteadExemption: total100 ? 1 : 0,
  };
};

export const lawMilVaCustomCalculators: Record<string, CustomCalculator> = {
  "va-back-pay-calculator": vaBackPay,
  "va-caregiver-stipend-calculator": vaCaregiverStipend,
  "va-hearing-loss-rating-calculator": vaHearingLoss,
  "va-smc-calculator": vaSmc,
  "vre-monthly-payment-calculator": vreMonthly,
  "gi-bill-calculator": giBill,
  "mgib-calculator": mgib,
  "ny-veterans-property-tax-exemption-calculator": nyVeteransExemption,
  "texas-disabled-veteran-property-tax-exemption-calculator": texasDvExemption,
};
