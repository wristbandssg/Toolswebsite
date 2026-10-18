/**
 * Batch: "Law & Government Calculators" → Military & Veterans Calculators —
 * military retirement (11 tools).
 *
 * Data:
 *  - MIL_PAY_2026: the 2026 basic pay table (3.8% raise, rounded to the
 *    dollar) — copied from the pay batch so this file stays self-contained;
 *    used to estimate a high-3 (average of the last 36 months in grade).
 *  - Multipliers: High-3 2.5%/yr (max 75%), BRS 2.0%/yr, REDUX 40% at 20 years
 *    + 3.5% per extra year (until age 62), Final Pay 2.5% of final basic pay.
 *  - Retiree COLA 2026: 2.8% (REDUX: CPI − 1%).
 *  - SBP: premium 6.5% of the base amount, annuity 55%; base amount at least $300.
 *  - VA compensation (veteran alone) from 1 Dec 2025 for the CRDP/CRSC and
 *    medical-retirement offsets.
 *  - FERS military deposit 3% (CSRS 7%) of military basic pay; 2026 OPM
 *    interest rate 4.25%.
 *  - Special Social Security wage credits: $300 per quarter of active duty
 *    1957–1977; $100 per $300 of basic pay, up to $1,200 a year, 1978–2001.
 *
 * Near-namesakes, kept distinct on purpose:
 *  - military-retirement-calculator: one system's pension.
 *  - brs-calculator: BRS vs legacy High-3 side by side, with TSP matching.
 *  - reserve-guard-retirement-calculator: pension from points; the points
 *    calculator counts one year's points.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-law-mil-retire-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

/** Years-of-service columns of the pay table ("over N"; 0 = under 2). */
export const YOS_COLUMNS = [0, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 30, 34, 38, 40];

const CAP_EX2 = 18999.9;
const fill = (vals: number[]): number[] => {
  const out = [...vals];
  while (out.length < YOS_COLUMNS.length) out.push(out[out.length - 1]);
  return out;
};
/** For grades that start later (E-8, E-9, W-5, O-xE): leading columns use the first rate. */
const startAt = (yos: number, vals: number[]): number[] => {
  const lead = YOS_COLUMNS.indexOf(yos);
  return fill([...Array(lead).fill(vals[0]), ...vals]);
};

/** [label, enlisted?, monthly basic pay per YOS column]. Index = dropdown value. */
export const MIL_PAY_2026: [string, boolean, number[]][] = [
  ["E-1", true, fill([2407])],
  ["E-2", true, fill([2698])],
  ["E-3", true, fill([2837, 3015, 3198])],
  ["E-4", true, fill([3142, 3303, 3482, 3659, 3815])],
  ["E-5", true, fill([3343, 3598, 3776, 3947, 4110, 4300, 4395, 4422])],
  ["E-6", true, fill([3401, 3743, 3908, 4068, 4236, 4612, 4760, 5044, 5131, 5194, 5268])],
  ["E-7", true, fill([3932, 4291, 4456, 4673, 4844, 5135, 5300, 5592, 5835, 6001, 6177, 6245, 6475, 6598, 7067])],
  ["E-8", true, startAt(8, [5657, 5907, 6062, 6247, 6448, 6811, 6995, 7308, 7482, 7909, 8068])],
  ["E-9", true, startAt(10, [6910, 7067, 7264, 7496, 7731, 8105, 8423, 8756, 9268, 9730, 10217, 10729])],
  ["W-1", false, fill([4057, 4494, 4611, 4859, 5152, 5585, 5786, 6069, 6346, 6565, 6766, 7010])],
  ["W-2", false, fill([4622, 5059, 5194, 5286, 5586, 6052, 6282, 6509, 6787, 7005, 7201, 7437, 7592, 7714])],
  ["W-3", false, fill([5223, 5441, 5664, 5738, 5971, 6431, 6910, 7136, 7398, 7666, 8150, 8477, 8672, 8879, 9162])],
  ["W-4", false, fill([5720, 6152, 6329, 6503, 6802, 7098, 7398, 7848, 8244, 8620, 8928, 9228, 9669, 10032, 10445, 10654])],
  ["W-5", false, startAt(20, [10170, 10686, 11070, 11495, 12071, 12673, 13308])],
  ["O-1", false, fill([4150, 4320, 5222])],
  ["O-2", false, fill([4782, 5446, 6272, 6484, 6618])],
  ["O-3", false, fill([5535, 6273, 6771, 7383, 7737, 8125, 8376, 8788, 9004])],
  ["O-4", false, fill([6294, 7286, 7773, 7881, 8332, 8816, 9419, 9888, 10214, 10402, 10510])],
  ["O-5", false, fill([7295, 8219, 8787, 8894, 9250, 9462, 9929, 10272, 10714, 11392, 11714, 12033, 12394])],
  ["O-6", false, fill([8751, 9614, 10245, 10245, 10284, 10725, 10784, 10784, 11396, 12480, 13115, 13115, 13751, 14113, 15189, 15493])],
  ["O-7", false, fill([11540, 12076, 12325, 12522, 12879, 13232, 13639, 14046, 14454, 15736, 16818, 16818, 16818, 16818, 16904, 17242])],
  ["O-8", false, fill([13888, 14344, 14645, 14730, 15107, 15736, 15882, 16480, 16652, 17166, 18598, 18598, 18598, CAP_EX2])],
  ["O-9", false, fill([CAP_EX2])],
  ["O-10", false, fill([CAP_EX2])],
  ["O-1E", false, startAt(4, [5222, 5577, 5783, 5994, 6201, 6484])],
  ["O-2E", false, startAt(4, [6484, 6618, 6828, 7184, 7459, 7664])],
  ["O-3E", false, startAt(4, [7383, 7737, 8125, 8376, 8788, 9137, 9337, 9609])],
];

const gradeAt = (g: number) => MIL_PAY_2026[Math.min(MIL_PAY_2026.length - 1, Math.max(0, Math.round(safeNumber(g))))];

/** Monthly basic pay for a grade index and completed years of service. */
export function basicPay(grade: number, yos: number): number {
  const [, , row] = gradeAt(grade);
  const y = nonNeg(yos);
  let col = 0;
  YOS_COLUMNS.forEach((c, i) => {
    if (y >= c) col = i;
  });
  return row[col];
}

/** High-3 estimate: average basic pay over the last 36 months in the same grade. */
export function estimateHigh3(grade: number, yos: number): number {
  const y = nonNeg(yos);
  let sum = 0;
  for (let m = 1; m <= 36; m++) sum += basicPay(grade, Math.max(0, y - m / 12 + 1e-9));
  return sum / 36;
}

/** VA monthly compensation, veteran alone, from 1 Dec 2025 (2.8% COLA). */
export const VA_ALONE_2026: Record<number, number> = {
  0: 0, 10: 180.42, 20: 356.66, 30: 552.47, 40: 795.84, 50: 1132.9, 60: 1435.02, 70: 1808.45, 80: 2102.15, 90: 2362.3, 100: 3938.58,
};
const vaRate = (rating: number) => VA_ALONE_2026[Math.min(100, Math.max(0, Math.round(nonNeg(rating) / 10) * 10))] ?? 0;

export const RETIREE_COLA_2026 = 2.8;

const high3Input = (v: Record<string, number>) => (nonNeg(v.high3Monthly) > 0 ? nonNeg(v.high3Monthly) : estimateHigh3(v.grade, v.yearsOfService));

/** Multiplier for each retirement system. 0 High-3, 1 BRS, 2 REDUX (before age 62), 3 Final Pay. */
function multiplier(system: number, years: number): number {
  const y = nonNeg(years);
  if (system === 1) return Math.min(0.8, 0.02 * y);
  if (system === 2) return Math.min(0.75, Math.max(0, 0.4 + 0.035 * (y - 20)));
  return Math.min(0.75, 0.025 * y);
}

/** Military Retirement (active duty, 20+ years). */
export const militaryRetirement: CustomCalculator = (v) => {
  const system = Math.round(safeNumber(v.system));
  const years = nonNeg(v.yearsOfService, 20);
  const base = system === 3 ? basicPay(v.grade, years) : high3Input(v);
  const mult = years >= 20 ? multiplier(system, years) : 0;
  const monthly = base * mult;
  const yearsRetired = Math.max(0, nonNeg(v.lifeExpectancyAge, 85) - nonNeg(v.retirementAge, 42));
  const cola = nonNeg(v.colaPercent, RETIREE_COLA_2026) / 100;
  let lifetime = 0;
  let pay = monthly * 12;
  for (let y = 0; y < yearsRetired; y++) {
    lifetime += pay;
    pay *= 1 + (system === 2 ? Math.max(0, cola - 0.01) : cola);
  }
  return {
    monthlyRetiredPay: round2(monthly),
    annualRetiredPay: round2(monthly * 12),
    retiredPayBase: round2(base),
    multiplierPercent: round2(mult * 100),
    estimatedLifetimePay: round2(lifetime),
  };
};

/** BRS vs legacy High-3 at the same retirement point. */
export const brsComparison: CustomCalculator = (v) => {
  const years = nonNeg(v.yearsOfService, 20);
  const high3 = high3Input(v);
  const legacy = years >= 20 ? high3 * 0.025 * years : 0;
  const brs = years >= 20 ? high3 * 0.02 * years : 0;
  const own = Math.min(100, nonNeg(v.yourTspPercent, 5)) / 100;
  const ret = nonNeg(v.annualReturnPercent, 6) / 100;
  // Government: 1% automatic from day 60 (round to 0) + match up to 4% while yours ≥ that, years 2–26.
  const match = own >= 0.05 ? 0.04 : own >= 0.03 ? 0.03 + (own - 0.03) * 0.5 : own;
  let balance = 0;
  for (let y = 1; y <= Math.round(years); y++) {
    const salary = basicPay(v.grade, Math.min(y, years)) * 12;
    const govPct = 0.01 + (y >= 3 && y <= 26 ? match : 0);
    balance = balance * (1 + ret) + salary * govPct;
  }
  const yearsRetired = Math.max(0, 85 - nonNeg(v.retirementAge, 42));
  const legacyLifetime = legacy * 12 * yearsRetired;
  const brsLifetime = brs * 12 * yearsRetired;
  return {
    brsAdvantage: round2(brsLifetime + balance - legacyLifetime),
    legacyMonthlyPension: round2(legacy),
    brsMonthlyPension: round2(brs),
    governmentTspBalance: round2(balance),
    pensionDifferencePerMonth: round2(legacy - brs),
  };
};

/** Reserve / Guard retirement: points ÷ 360 = equivalent years × 2.5% (or 2% BRS) × high-3. */
export const reserveRetirement: CustomCalculator = (v) => {
  const points = nonNeg(v.totalPoints);
  const eqYears = points / 360;
  const mult = Math.round(safeNumber(v.system)) === 1 ? 0.02 : 0.025;
  const high3 = high3Input(v);
  const monthly = high3 * mult * eqYears;
  const earlyMonths = Math.min(120, Math.floor(nonNeg(v.qualifyingActiveDutyDays) / 90) * 3);
  const startAge = Math.max(50, 60 - earlyMonths / 12);
  return {
    monthlyRetiredPay: round2(monthly),
    equivalentYears: round2(eqYears),
    annualRetiredPay: round2(monthly * 12),
    payStartAge: round2(startAge),
    grayAreaYears: round2(Math.max(0, startAge - nonNeg(v.currentAge, 42))),
  };
};

/** Reserve retirement points for one year. */
export const reservePoints: CustomCalculator = (v) => {
  const membership = 15;
  const drills = nonNeg(v.drillPeriods, 48);
  const other = nonNeg(v.otherInactivePoints);
  const inactiveRaw = membership + drills + other;
  const inactive = Math.min(130, inactiveRaw);
  const active = nonNeg(v.activeDutyDays, 14);
  const total = Math.min(365, inactive + active);
  return {
    totalRetirementPoints: round2(total),
    inactiveDutyPoints: round2(inactive),
    activeDutyPoints: round2(active),
    goodYear: total >= 50 ? 1 : 0,
    pointsOverInactiveCap: round2(Math.max(0, inactiveRaw - 130)),
    equivalentDaysOfService: round2(total),
  };
};

/** Medical (disability) retirement: max(rating, 2.5% × years) × high-3, 75% cap; TDRL at least 50%. */
export const medicalRetirement: CustomCalculator = (v) => {
  const rating = Math.min(100, nonNeg(v.disabilityRating));
  const years = nonNeg(v.yearsOfService);
  const high3 = high3Input(v);
  const tdrl = Math.round(safeNumber(v.listType)) === 1;
  const byRating = rating / 100;
  const byYears = 0.025 * years;
  let pct = Math.min(0.75, Math.max(byRating, byYears));
  if (tdrl) pct = Math.max(0.5, pct);
  const retired = high3 * pct;
  const va = vaRate(rating);
  const crdp = rating >= 50 && years >= 20;
  const total = crdp ? retired + va : Math.max(retired, va);
  return {
    monthlyRetiredPay: round2(retired),
    retiredPayPercent: round2(pct * 100),
    usedRatingMethod: byRating >= byYears ? 1 : 0,
    vaCompensationAlone: va,
    totalMonthlyAfterVaOffset: round2(total),
  };
};

/** Survivor Benefit Plan: 6.5% premium, 55% annuity on the chosen base amount. */
export const survivorBenefitPlan: CustomCalculator = (v) => {
  const full = nonNeg(v.monthlyRetiredPay);
  const base = Math.min(full, Math.max(300, nonNeg(v.baseAmount, full)));
  const premium = base * 0.065;
  const annuity = base * 0.55;
  const years = nonNeg(v.yearsPaying, 25);
  const paid = premium * 12 * Math.min(30, years);
  return {
    monthlySurvivorAnnuity: round2(annuity),
    monthlyPremium: round2(premium),
    netRetiredPayAfterPremium: round2(full - premium),
    totalPremiumsPaid: round2(paid),
    yearsOfAnnuityToBreakEven: round2(annuity > 0 ? paid / (annuity * 12) : 0),
  };
};

/** Military retirement in divorce under the frozen benefit rule (divorces after 23 Dec 2016). */
export const militaryRetirementDivorce: CustomCalculator = (v) => {
  const high3AtDivorce = nonNeg(v.high3AtDivorce);
  const colaGrowth = Math.pow(1 + nonNeg(v.colaPercent, RETIREE_COLA_2026) / 100, nonNeg(v.yearsDivorceToRetirement));
  const yosAtDivorce = nonNeg(v.yearsOfServiceAtDivorce);
  const mult = Math.round(safeNumber(v.system)) === 1 ? 0.02 : 0.025;
  const frozen = high3AtDivorce * colaGrowth * mult * yosAtDivorce;
  const overlap = Math.min(yosAtDivorce, nonNeg(v.yearsMarriedDuringService));
  const marital = yosAtDivorce > 0 ? overlap / yosAtDivorce : 0;
  const share = Math.min(100, nonNeg(v.spousePercentOfMarital, 50)) / 100;
  const award = frozen * marital * share;
  return {
    formerSpouseMonthlyShare: round2(award),
    frozenRetiredPay: round2(frozen),
    maritalFractionPercent: round2(marital * 100),
    formerSpouseAnnualShare: round2(award * 12),
    dfasDirectPayment: overlap >= 10 ? 1 : 0,
  };
};

/** Retirement COLA projection (REDUX = CPI − 1%). */
export const retirementCola: CustomCalculator = (v) => {
  const pay = nonNeg(v.monthlyRetiredPay);
  const redux = Math.round(safeNumber(v.system)) === 1;
  const thisYear = nonNeg(v.colaPercent, RETIREE_COLA_2026);
  const future = nonNeg(v.futureColaPercent, 2.5);
  const years = Math.round(nonNeg(v.years, 10));
  const adj = (c: number) => (redux ? Math.max(0, c - 1) : c) / 100;
  const after = pay * (1 + adj(thisYear));
  const projected = after * Math.pow(1 + adj(future), Math.max(0, years - 1));
  return {
    newMonthlyRetiredPay: round2(after),
    monthlyIncrease: round2(after - pay),
    appliedColaPercent: round2(adj(thisYear) * 100),
    projectedMonthlyPay: round2(projected),
    projectedAnnualPay: round2(projected * 12),
  };
};

/** CRSC vs CRDP comparison. */
export const crscCrdp: CustomCalculator = (v) => {
  const retired = nonNeg(v.monthlyRetiredPay);
  const rating = Math.min(100, nonNeg(v.vaRating));
  const combat = Math.min(rating, nonNeg(v.combatRelatedRating));
  const years = nonNeg(v.yearsOfService, 20);
  const va = vaRate(rating);
  const offset = Math.min(retired, va);
  const crdp = rating >= 50 && years >= 20 ? offset : 0;
  const crsc = Math.min(offset, vaRate(combat));
  const best = Math.max(crdp, crsc);
  return {
    totalMonthlyWithBestOption: round2(retired - offset + va + best),
    crdpAmount: round2(crdp),
    crscAmount: round2(crsc),
    vaCompensation: va,
    retiredPayOffset: round2(offset),
    crscIsBetter: crsc > crdp ? 1 : 0,
  };
};

/** FERS/CSRS military deposit (buyback). */
export const militaryBuyback: CustomCalculator = (v) => {
  const pay = nonNeg(v.militaryBasicPayEarned);
  const pct = Math.round(safeNumber(v.system)) === 1 ? 0.07 : 0.03;
  const deposit = pay * pct;
  const years = nonNeg(v.yearsSinceInterestStarted);
  const rate = nonNeg(v.interestRatePercent, 4.25) / 100;
  const total = deposit * Math.pow(1 + rate, years);
  const annuityPerYear = nonNeg(v.expectedHigh3Salary) * (Math.round(safeNumber(v.system)) === 1 ? 0.02 : nonNeg(v.ageAtRetirement, 62) >= 62 ? 0.011 : 0.01);
  const added = annuityPerYear * nonNeg(v.militaryYears);
  return {
    totalDepositDue: round2(total),
    depositBeforeInterest: round2(deposit),
    interest: round2(total - deposit),
    addedAnnualAnnuity: round2(added),
    yearsToBreakEven: round2(added > 0 ? total / added : 0),
  };
};

/** Special extra Social Security wage credits for active duty 1957–2001. */
export const specialMilitarySsCredits: CustomCalculator = (v) => {
  const q = nonNeg(v.quartersServed1957to1977);
  const early = q * 300;
  const years78 = nonNeg(v.yearsServed1978to2001);
  const pay78 = nonNeg(v.averageAnnualBasicPay1978to2001);
  const perYear = Math.min(1200, Math.floor(pay78 / 300) * 100);
  const later = perYear * years78;
  return {
    totalExtraWageCredits: round2(early + later),
    credits1957to1977: round2(early),
    credits1978to2001: round2(later),
    creditPerYear1978to2001: perYear,
  };
};

export const lawMilRetireCustomCalculators: Record<string, CustomCalculator> = {
  "military-retirement-calculator": militaryRetirement,
  "brs-calculator": brsComparison,
  "reserve-guard-retirement-calculator": reserveRetirement,
  "reserve-retirement-points-calculator": reservePoints,
  "military-medical-retirement-calculator": medicalRetirement,
  "survivor-benefit-plan-calculator": survivorBenefitPlan,
  "military-retirement-divorce-calculator": militaryRetirementDivorce,
  "military-retirement-cola-calculator": retirementCola,
  "crsc-crdp-calculator": crscCrdp,
  "military-buyback-calculator": militaryBuyback,
  "special-military-social-security-credit-calculator": specialMilitarySsCredits,
};
