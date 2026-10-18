/**
 * Batch: "Law & Government Calculators" → Alimony, Divorce & Probate
 * Calculators (31 tools).
 *
 * Alimony — separate pages only for states with a statutory or court
 * guideline formula; every other state uses the general calculator:
 *  - general: AAML recommendation — 30% of payor gross − 20% of payee gross,
 *    capped so the payee ends up with no more than 40% of combined income;
 *    term = marriage length × 30% (0–3 yrs), 40% (3–10), 60% (10–20), 80% (20+).
 *  - Illinois 750 ILCS 5/504(b-1): 33.33% of payor net − 25% of payee net,
 *    payee total capped at 40% of combined net; duration factor .20–.80.
 *  - Colorado C.R.S. 14-10-114 (combined ≤ $240,000): 40% of combined gross −
 *    lower income; term from the statute's table (31% of months at 3 years,
 *    37.17% at 73 months, 50% at 20 years — interpolated between).
 *  - New York DRL §236(B)(6): with child support 20% of payor − 25% of payee,
 *    without 30% − 20%, compared with 40% of combined − payee; payor income cap
 *    $241,000 (1 Mar 2026); advisory term 15–30% / 30–40% / 35–50%.
 *  - Massachusetts G.L. c.208 §53: 30–35% of the gross income difference; term
 *    50/60/70/80% of months for marriages up to 5/10/15/20 years.
 *  - Pennsylvania Pa.R.C.P. 1910.16-4: 40% of the net income difference, or 30%
 *    after child support when there are children.
 *  - Texas Fam. Code §8.055: lesser of $5,000 or 20% of payor gross; eligibility
 *    10+ years; term 5/7/10 years for 10–20/20–30/30+ years.
 *  - California (temporary, Santa Clara guideline): 40% of payor net − 50% of
 *    payee net (after child support); long-term rule of thumb half the length of
 *    marriages under 10 years.
 *  - Florida §61.08 (2023): lesser of need or 35% of the net income difference;
 *    durational term up to 50/60/75% for 3–10/10–20/20+ years.
 *  - New Hampshire RSA 458:19-a: 23% of the gross income difference; term up to
 *    50% of the marriage.
 *  - Virginia (pendente lite, §16.1-278.17:1): 28% of payor gross − 58% of payee
 *    gross (26% − 50% with child support).
 *
 * Divorce: property division (community 50/50 vs equitable %), Moore-Marsden,
 * pension coverture fraction (QDRO, Majauskas, Nelson), Smith-Ostler bonus
 * support, length of marriage milestones.
 *
 * Probate: general probate costs, executor fees by state schedule, California
 * statutory fees (Prob. Code §10800/10810), California trustee fees, Florida
 * attorney (§733.6171) and personal representative (§733.617) fees, New York
 * commissions (SCPA §2307), New Jersey (N.J.S.A. 3B:18-14), Oregon (ORS
 * 116.173), Pennsylvania (Johnson Estate schedule), Virginia probate tax
 * (§58.1-1712), Michigan inventory fee (MCL 600.871), New York intestacy (EPTL
 * 4-1.1), Islamic inheritance (Faraid), conservatorship bond.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-law-family-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

function result(monthly: number, termMonths: number, payor: number, extra: Record<string, number> = {}) {
  const m = Math.max(0, monthly);
  return {
    monthlyAlimony: round2(m),
    annualAlimony: round2(m * 12),
    suggestedTermMonths: Math.round(Math.max(0, termMonths)),
    totalOverTerm: round2(m * Math.max(0, termMonths)),
    percentOfPayorIncome: round2(payor > 0 ? (m / payor) * 100 : 0),
    ...extra,
  };
}

const years = (v: Record<string, number>) => nonNeg(v.marriageYears, 10);

export const alimonyGeneral: CustomCalculator = (v) => {
  const p = nonNeg(v.payorIncome);
  const q = nonNeg(v.payeeIncome);
  const raw = 0.3 * p - 0.2 * q;
  const cap = 0.4 * (p + q) - q;
  const amount = Math.max(0, Math.min(raw, cap));
  const y = years(v);
  const factor = y < 3 ? 0.3 : y < 10 ? 0.4 : y < 20 ? 0.6 : 0.8;
  return result(amount, y * 12 * factor, p, { cappedAt40Percent: raw > cap ? 1 : 0 });
};

const IL_FACTORS = [0.2, 0.2, 0.2, 0.2, 0.2, 0.24, 0.28, 0.32, 0.36, 0.4, 0.44, 0.48, 0.52, 0.56, 0.6, 0.64, 0.68, 0.72, 0.76, 0.8];
export const alimonyIllinois: CustomCalculator = (v) => {
  const p = nonNeg(v.payorIncome);
  const q = nonNeg(v.payeeIncome);
  const raw = p / 3 - 0.25 * q;
  const cap = 0.4 * (p + q) - q;
  const amount = Math.max(0, Math.min(raw, cap));
  const y = years(v);
  const term = y >= 20 ? y * 12 : y * 12 * IL_FACTORS[Math.floor(y)];
  return result(amount, term, p, { cappedAt40Percent: raw > cap ? 1 : 0, durationFactorPercent: y >= 20 ? 100 : IL_FACTORS[Math.floor(y)] * 100 });
};

export const alimonyColorado: CustomCalculator = (v) => {
  const p = nonNeg(v.payorIncome);
  const q = nonNeg(v.payeeIncome);
  const lower = Math.min(p, q);
  const amount = Math.max(0, 0.4 * (p + q) - lower);
  const months = years(v) * 12;
  let pct = 0;
  if (months >= 36) {
    if (months <= 73) pct = 0.31 + ((0.3717 - 0.31) * (months - 36)) / 37;
    else if (months <= 240) pct = 0.3717 + ((0.5 - 0.3717) * (months - 73)) / 167;
    else pct = 0.5;
  }
  const overCap = (p + q) * 12 > 240000 ? 1 : 0;
  return result(months >= 36 ? amount : 0, months * pct, p, { guidelineApplies: overCap ? 0 : 1, termPercentOfMarriage: round2(pct * 100) });
};

export const NY_MAINT_CAP = 241000;
export const alimonyNewYork: CustomCalculator = (v) => {
  const p = Math.min(nonNeg(v.payorIncome), NY_MAINT_CAP / 12);
  const q = nonNeg(v.payeeIncome);
  const withCs = Math.round(safeNumber(v.childSupportPaid)) === 1;
  const a = withCs ? 0.2 * p - 0.25 * q : 0.3 * p - 0.2 * q;
  const b = 0.4 * (p + q) - q;
  const amount = Math.max(0, Math.min(a, b));
  const y = years(v);
  const [lo, hi] = y <= 15 ? [0.15, 0.3] : y <= 20 ? [0.3, 0.4] : [0.35, 0.5];
  return result(amount, y * 12 * (lo + hi) / 2, nonNeg(v.payorIncome), {
    shortestTermMonths: Math.round(y * 12 * lo),
    longestTermMonths: Math.round(y * 12 * hi),
  });
};

export const alimonyMassachusetts: CustomCalculator = (v) => {
  const p = nonNeg(v.payorIncome);
  const q = nonNeg(v.payeeIncome);
  const pct = Math.min(35, Math.max(30, nonNeg(v.percentOfDifference, 33))) / 100;
  const amount = Math.max(0, (p - q) * pct);
  const y = years(v);
  const f = y <= 5 ? 0.5 : y <= 10 ? 0.6 : y <= 15 ? 0.7 : y <= 20 ? 0.8 : 1;
  return result(amount, y * 12 * f, p, { indefiniteTerm: y > 20 ? 1 : 0, lowEndOfRange: round2(Math.max(0, (p - q) * 0.3)), highEndOfRange: round2(Math.max(0, (p - q) * 0.35)) });
};

export const alimonyPennsylvania: CustomCalculator = (v) => {
  const p = nonNeg(v.payorIncome);
  const q = nonNeg(v.payeeIncome);
  const cs = nonNeg(v.childSupport);
  const amount = cs > 0 ? 0.3 * (p - cs - q) : 0.4 * (p - q);
  return result(amount, years(v) * 12 * 0.5, p, { childSupportDeducted: cs > 0 ? 1 : 0 });
};

export const alimonyTexas: CustomCalculator = (v) => {
  const p = nonNeg(v.payorIncome);
  const y = years(v);
  const eligible = y >= 10 || Math.round(safeNumber(v.otherGround)) === 1;
  const need = nonNeg(v.payeeMonthlyShortfall) > 0 ? nonNeg(v.payeeMonthlyShortfall) : Infinity;
  const amount = eligible ? Math.min(5000, 0.2 * p, need) : 0;
  const term = !eligible ? 0 : y >= 30 ? 120 : y >= 20 ? 84 : y >= 10 ? 60 : 60;
  return result(amount, term, p, { eligible: eligible ? 1 : 0, statutoryCap: round2(Math.min(5000, 0.2 * p)) });
};

export const alimonyCalifornia: CustomCalculator = (v) => {
  const p = nonNeg(v.payorIncome);
  const q = nonNeg(v.payeeIncome);
  const cs = nonNeg(v.childSupport);
  const amount = 0.4 * (p - cs) - 0.5 * (q + cs);
  const y = years(v);
  return result(amount, y < 10 ? y * 6 : 0, p, { longMarriageNoSetEnd: y >= 10 ? 1 : 0 });
};

export const alimonyFlorida: CustomCalculator = (v) => {
  const p = nonNeg(v.payorIncome);
  const q = nonNeg(v.payeeIncome);
  const need = nonNeg(v.payeeMonthlyShortfall) > 0 ? nonNeg(v.payeeMonthlyShortfall) : Infinity;
  const amount = Math.min(need, Math.max(0, 0.35 * (p - q)));
  const y = years(v);
  const f = y < 3 ? 0 : y < 10 ? 0.5 : y < 20 ? 0.6 : 0.75;
  return result(y < 3 ? 0 : amount, y * 12 * f, p, { maxDurationPercent: f * 100 });
};

export const alimonyNewHampshire: CustomCalculator = (v) => {
  const p = nonNeg(v.payorIncome);
  const q = nonNeg(v.payeeIncome);
  const need = nonNeg(v.payeeMonthlyShortfall) > 0 ? nonNeg(v.payeeMonthlyShortfall) : Infinity;
  const amount = Math.min(need, Math.max(0, 0.23 * (p - q)));
  return result(amount, years(v) * 12 * 0.5, p);
};

export const alimonyVirginia: CustomCalculator = (v) => {
  const p = nonNeg(v.payorIncome);
  const q = nonNeg(v.payeeIncome);
  const withCs = Math.round(safeNumber(v.childSupportPaid)) === 1;
  const amount = withCs ? 0.26 * p - 0.5 * q : 0.28 * p - 0.58 * q;
  return result(amount, years(v) * 12 * 0.5, p, { childSupportVersion: withCs ? 1 : 0 });
};

// --- Divorce ---------------------------------------------------------------------------------

export const divorceSettlement: CustomCalculator = (v) => {
  const assets = nonNeg(v.maritalAssets);
  const debts = nonNeg(v.maritalDebts);
  const net = assets - debts;
  const community = Math.round(safeNumber(v.propertyRegime)) === 0;
  const pctA = community ? 0.5 : Math.min(100, nonNeg(v.spouseAPercent, 50)) / 100;
  const shareA = net * pctA;
  const keptByA = nonNeg(v.assetsKeptBySpouseA) - nonNeg(v.debtsTakenBySpouseA);
  return {
    spouseAShare: round2(shareA),
    spouseBShare: round2(net - shareA),
    netMaritalEstate: round2(net),
    equalizationPayment: round2(keptByA - shareA),
    spouseATotalWithSeparate: round2(shareA + nonNeg(v.separatePropertyA)),
  };
};

export const mooreMarsden: CustomCalculator = (v) => {
  const price = Math.max(1, nonNeg(v.purchasePrice));
  const fmvMarriage = nonNeg(v.valueAtMarriage, price);
  const fmvNow = nonNeg(v.valueNow);
  const cp = nonNeg(v.principalPaidDuringMarriage);
  const loanNow = nonNeg(v.loanBalanceNow);
  const cpPct = Math.min(1, cp / price);
  const appreciation = Math.max(0, fmvNow - fmvMarriage);
  const community = cp + cpPct * appreciation;
  const equity = fmvNow - loanNow;
  const separate = Math.max(0, equity - community);
  return {
    communityInterest: round2(community),
    separateInterest: round2(separate),
    eachSpouseCommunityShare: round2(community / 2),
    communityPercent: round2(cpPct * 100),
    totalEquity: round2(equity),
  };
};

export const coverture: CustomCalculator = (v) => {
  const benefit = nonNeg(v.monthlyPensionBenefit);
  const marriedService = nonNeg(v.monthsServiceDuringMarriage);
  const total = Math.max(1, nonNeg(v.totalMonthsOfService));
  const fraction = Math.min(1, marriedService / total);
  const award = Math.min(100, nonNeg(v.percentAwarded, 50)) / 100;
  const monthly = benefit * fraction * award;
  return {
    formerSpouseMonthlyShare: round2(monthly),
    covertureFractionPercent: round2(fraction * 100),
    maritalPortion: round2(benefit * fraction),
    employeeKeepsMonthly: round2(benefit - monthly),
    formerSpouseAnnualShare: round2(monthly * 12),
  };
};

export const smithOstler: CustomCalculator = (v) => {
  const bonus = nonNeg(v.grossBonus);
  const net = bonus * (1 - Math.min(70, nonNeg(v.taxRatePercent, 35)) / 100);
  const cs = net * (Math.min(100, nonNeg(v.childSupportPercent)) / 100);
  const ss = net * (Math.min(100, nonNeg(v.spousalSupportPercent)) / 100);
  return {
    additionalSupportDue: round2(cs + ss),
    childSupportFromBonus: round2(cs),
    spousalSupportFromBonus: round2(ss),
    netBonus: round2(net),
    payorKeeps: round2(net - cs - ss),
  };
};

export const marriageLength: CustomCalculator = (v) => {
  const months = nonNeg(v.marriageYears) * 12 + nonNeg(v.marriageMonths);
  const to = (target: number) => round2(Math.max(0, target * 12 - months));
  return {
    yearsMarried: round2(months / 12),
    monthsMarried: Math.round(months),
    monthsToTenYears: to(10),
    monthsToTwentyYears: to(20),
    reachedTenYears: months >= 120 ? 1 : 0,
  };
};

// --- Probate ---------------------------------------------------------------------------------

/** Tiered percentage schedule: [band size, rate]; the last band runs to infinity if size is Infinity. */
export function tiered(value: number, bands: [number, number][]): number {
  let left = nonNeg(value);
  let fee = 0;
  for (const [size, rate] of bands) {
    const part = Math.min(left, size);
    fee += part * rate;
    left -= part;
    if (left <= 0) break;
  }
  return fee;
}

export const CA_STATUTORY: [number, number][] = [[100000, 0.04], [100000, 0.03], [800000, 0.02], [9000000, 0.01], [15000000, 0.005]];
export const NY_SCPA: [number, number][] = [[100000, 0.05], [200000, 0.04], [700000, 0.03], [4000000, 0.025], [Infinity, 0.02]];
export const FL_PR: [number, number][] = [[1000000, 0.03], [4000000, 0.025], [5000000, 0.02], [Infinity, 0.015]];
export const NJ_CORPUS: [number, number][] = [[200000, 0.05], [800000, 0.035], [Infinity, 0.02]];
export const OR_PR: [number, number][] = [[1000, 0.07], [9000, 0.04], [40000, 0.03], [Infinity, 0.02]];
export const PA_JOHNSON: [number, number][] = [[100000, 0.05], [100000, 0.04], [800000, 0.03], [1000000, 0.02], [1500000, 0.015], [1000000, 0.01], [Infinity, 0.005]];

export function floridaAttorneyFee(value: number): number {
  const v = nonNeg(value);
  if (v <= 40000) return 1500;
  if (v <= 70000) return 2250;
  if (v <= 100000) return 3000;
  return 3000 + tiered(v - 100000, [[900000, 0.03], [2000000, 0.025], [2000000, 0.02], [5000000, 0.015], [Infinity, 0.01]]);
}

export const californiaProbate: CustomCalculator = (v) => {
  const estate = nonNeg(v.grossEstateValue);
  const fee = tiered(estate, CA_STATUTORY);
  const over25m = estate > 25000000 ? 1 : 0;
  const both = fee * (Math.round(safeNumber(v.attorneyToo, 1)) === 1 ? 2 : 1);
  const court = nonNeg(v.courtCosts, 1500);
  return {
    executorStatutoryFee: round2(fee),
    attorneyStatutoryFee: round2(Math.round(safeNumber(v.attorneyToo, 1)) === 1 ? fee : 0),
    totalProbateCost: round2(both + court),
    percentOfEstate: round2(estate > 0 ? ((both + court) / estate) * 100 : 0),
    aboveScheduleCourtSetsFee: over25m,
  };
};

export const californiaTrusteeFee: CustomCalculator = (v) => {
  const assets = nonNeg(v.trustAssets);
  const pct = nonNeg(v.annualFeePercent, 1) / 100;
  const years = nonNeg(v.yearsAdministering, 1);
  const annual = assets * pct;
  return {
    annualTrusteeFee: round2(annual),
    totalTrusteeFee: round2(annual * years),
    monthlyEquivalent: round2(annual / 12),
    compareStatutoryExecutorFee: round2(tiered(assets, CA_STATUTORY)),
  };
};

export const floridaAttorney: CustomCalculator = (v) => {
  const estate = nonNeg(v.inventoryValue);
  const attorney = floridaAttorneyFee(estate);
  const pr = tiered(estate, FL_PR);
  return {
    attorneyFee: round2(attorney),
    personalRepresentativeFee: round2(pr),
    combinedFees: round2(attorney + pr),
    percentOfEstate: round2(estate > 0 ? ((attorney + pr) / estate) * 100 : 0),
  };
};

const scheduleResult = (fee: number, estate: number, executors: number, extra: Record<string, number> = {}) => ({
  executorFee: round2(fee),
  percentOfEstate: round2(estate > 0 ? (fee / estate) * 100 : 0),
  perExecutor: round2(fee / Math.max(1, executors)),
  estateAfterFee: round2(estate - fee),
  ...extra,
});

export const floridaPr: CustomCalculator = (v) => scheduleResult(tiered(nonNeg(v.estateValue), FL_PR), nonNeg(v.estateValue), 1);

export const newYorkExecutor: CustomCalculator = (v) => {
  const e = nonNeg(v.estateValue);
  const fee = tiered(e, NY_SCPA);
  const n = Math.max(1, Math.round(nonNeg(v.numberOfExecutors, 1)));
  // SCPA 2307: estates over $300,000 can pay full commissions to up to three executors.
  const total = e > 300000 ? fee * Math.min(3, n) : fee;
  return scheduleResult(total, e, n, { commissionPerFullShare: round2(fee) });
};

export const newJerseyExecutor: CustomCalculator = (v) => {
  const e = nonNeg(v.estateValue);
  const corpus = tiered(e, NJ_CORPUS);
  const income = nonNeg(v.incomeCollected) * 0.06;
  const n = Math.max(1, Math.round(nonNeg(v.numberOfExecutors, 1)));
  return scheduleResult(corpus + income, e, n, { corpusCommission: round2(corpus), incomeCommission: round2(income) });
};

export const oregonPr: CustomCalculator = (v) => {
  const probate = nonNeg(v.estateValue);
  const nonProbate = nonNeg(v.nonProbateTaxableProperty);
  const fee = tiered(probate, OR_PR) + nonProbate * 0.01;
  return scheduleResult(fee, probate, 1, { nonProbateCommission: round2(nonProbate * 0.01) });
};

export const pennsylvaniaExecutor: CustomCalculator = (v) => {
  const e = nonNeg(v.estateValue);
  const johnson = tiered(e, PA_JOHNSON);
  return scheduleResult(johnson, e, Math.max(1, Math.round(nonNeg(v.numberOfExecutors, 1))), { threePercentAlternative: round2(e * 0.03) });
};

export const EXECUTOR_STATES: [string, number][] = [
  ["California (statutory)", 0], ["New York (SCPA 2307)", 1], ["Florida (§733.617)", 2], ["New Jersey (3B:18-14)", 3], ["Oregon (ORS 116.173)", 4], ["Pennsylvania (Johnson schedule)", 5], ["Other state — reasonable fee (3%)", 6],
];
export const executorFeeGeneral: CustomCalculator = (v) => {
  const e = nonNeg(v.estateValue);
  const s = Math.round(safeNumber(v.state, 6));
  const schedules = [CA_STATUTORY, NY_SCPA, FL_PR, NJ_CORPUS, OR_PR, PA_JOHNSON];
  const fee = s >= 0 && s <= 5 ? tiered(e, schedules[s]) : e * (nonNeg(v.reasonablePercent, 3) / 100);
  return scheduleResult(fee, e, Math.max(1, Math.round(nonNeg(v.numberOfExecutors, 1))));
};

export const probateCost: CustomCalculator = (v) => {
  const e = nonNeg(v.estateValue);
  const attorney = Math.round(safeNumber(v.attorneyBilling)) === 0 ? e * (nonNeg(v.attorneyPercent, 3) / 100) : nonNeg(v.attorneyHours) * nonNeg(v.hourlyRate);
  const executor = e * (nonNeg(v.executorPercent, 2) / 100);
  const other = nonNeg(v.courtFees) + nonNeg(v.appraisalAndOther) + e * (nonNeg(v.bondPremiumPercent) / 100);
  const total = attorney + executor + other;
  return {
    totalProbateCost: round2(total),
    attorneyFees: round2(attorney),
    executorFees: round2(executor),
    courtAndOtherCosts: round2(other),
    percentOfEstate: round2(e > 0 ? (total / e) * 100 : 0),
    netToHeirs: round2(e - total),
  };
};

export const virginiaProbateTax: CustomCalculator = (v) => {
  const e = nonNeg(v.estateValue);
  const state = e > 15000 ? Math.ceil(e / 100) * 0.1 : 0;
  const local = Math.round(safeNumber(v.localTax, 1)) === 1 ? state / 3 : 0;
  const clerk = nonNeg(v.clerkFees, 0);
  return {
    totalProbateTax: round2(state + local + clerk),
    stateProbateTax: round2(state),
    localProbateTax: round2(local),
    effectiveRatePercent: round2(e > 0 ? ((state + local) / e) * 100 : 0),
  };
};

export function michiganInventoryFee(value: number): number {
  const v = nonNeg(value);
  if (v <= 0) return 0;
  if (v < 1000) return 5 + 0.01 * Math.max(0, v - 500);
  if (v < 3000) return 25;
  if (v < 10000) return 25 + 0.00625 * (v - 3000);
  if (v < 25000) return 68.75 + 0.005 * (v - 10000);
  if (v < 50000) return 143.75 + 0.00375 * (v - 25000);
  if (v < 100000) return 237.5 + 0.0025 * (v - 50000);
  if (v <= 500000) return 362.5 + 0.00125 * (v - 100000);
  const at500 = 362.5 + 0.00125 * 400000;
  if (v <= 1000000) return at500 + 62.5 * Math.ceil((v - 500000) / 100000);
  return at500 + 62.5 * 5 + 31.25 * Math.ceil((v - 1000000) / 100000);
}
export const michiganInventory: CustomCalculator = (v) => {
  const gross = nonNeg(v.inventoryValue);
  const liens = nonNeg(v.liensOnRealEstate);
  const counted = Math.max(0, gross - liens);
  const fee = michiganInventoryFee(counted);
  return {
    inventoryFee: round2(fee),
    valueCounted: round2(counted),
    percentOfEstate: round2(counted > 0 ? (fee / counted) * 100 : 0),
  };
};

export const newYorkIntestacy: CustomCalculator = (v) => {
  const e = nonNeg(v.estateValue);
  const spouse = Math.round(safeNumber(v.spouse)) === 1;
  const kids = Math.round(nonNeg(v.children));
  const parents = Math.round(nonNeg(v.livingParents));
  const siblings = Math.round(nonNeg(v.siblings));
  let sp = 0;
  let ch = 0;
  let pa = 0;
  let sib = 0;
  if (spouse && kids > 0) {
    sp = Math.min(e, 50000 + Math.max(0, e - 50000) / 2);
    ch = e - sp;
  } else if (spouse) sp = e;
  else if (kids > 0) ch = e;
  else if (parents > 0) pa = e;
  else if (siblings > 0) sib = e;
  return {
    spouseInherits: round2(sp),
    eachChildInherits: round2(kids > 0 ? ch / kids : 0),
    eachParentInherits: round2(parents > 0 ? pa / parents : 0),
    eachSiblingInherits: round2(siblings > 0 ? sib / siblings : 0),
    passesToMoreDistantRelatives: spouse || kids || parents || siblings ? 0 : round2(e),
  };
};

/** Islamic inheritance (Faraid) for spouse, children and parents. */
export const islamicInheritance: CustomCalculator = (v) => {
  const estate = nonNeg(v.netEstate);
  const spouseType = Math.round(safeNumber(v.spouse)); // 0 none, 1 husband, 2 wife/wives
  const wives = Math.max(1, Math.round(nonNeg(v.numberOfWives, 1)));
  const sons = Math.round(nonNeg(v.sons));
  const daughters = Math.round(nonNeg(v.daughters));
  const father = Math.round(safeNumber(v.father)) === 1;
  const mother = Math.round(safeNumber(v.mother)) === 1;
  const kids = sons + daughters > 0;
  let spouse = 0;
  if (spouseType === 1) spouse = kids ? 1 / 4 : 1 / 2;
  if (spouseType === 2) spouse = kids ? 1 / 8 : 1 / 4;
  let mom = 0;
  let dad = 0;
  let girls = 0; // fixed share of all daughters (only when there are no sons)
  if (mother) {
    if (kids) mom = 1 / 6;
    else if (father && spouseType > 0) mom = (1 - spouse) / 3; // 'Umariyyatain: a third of what's left
    else mom = 1 / 3;
  }
  if (father && kids) dad = 1 / 6;
  if (sons === 0 && daughters > 0) girls = daughters === 1 ? 1 / 2 : 2 / 3;
  let fixed = spouse + mom + dad + girls;
  let scale = 1;
  if (fixed > 1) {
    scale = 1 / fixed; // 'awl
    fixed = 1;
  }
  let residue = Math.max(0, 1 - fixed);
  let sonsShare = 0;
  let girlsResidual = 0;
  if (sons > 0) {
    const units = sons * 2 + daughters;
    sonsShare = (residue * sons * 2) / units;
    girlsResidual = (residue * daughters) / units;
    residue = 0;
  } else if (father) {
    dad += residue / scale;
    residue = 0;
  }
  let shares = { spouse: spouse * scale, mom: mom * scale, dad: dad * scale, girls: girls * scale + girlsResidual, sons: sonsShare };
  if (residue > 1e-9) {
    // Radd: return the remainder to blood heirs with fixed shares (not the spouse).
    const blood = shares.mom + shares.girls;
    if (blood > 0) shares = { ...shares, mom: shares.mom + (residue * shares.mom) / blood, girls: shares.girls + (residue * shares.girls) / blood };
    else if (spouseType > 0) shares = { ...shares, spouse: shares.spouse + residue };
    residue = blood > 0 || spouseType > 0 ? 0 : residue;
  }
  return {
    spouseShareTotal: round2(estate * shares.spouse),
    eachWifeShare: round2(spouseType === 2 ? (estate * shares.spouse) / wives : 0),
    eachSonShare: round2(sons > 0 ? (estate * shares.sons) / sons : 0),
    eachDaughterShare: round2(daughters > 0 ? (estate * shares.girls) / daughters : 0),
    fatherShare: round2(estate * shares.dad),
    motherShare: round2(estate * shares.mom),
    unallocatedToOtherRelatives: round2(estate * residue),
  };
};

export const conservatorshipBond: CustomCalculator = (v) => {
  const bond = nonNeg(v.personalProperty) + nonNeg(v.annualIncome) + nonNeg(v.annualPublicBenefits);
  const withCushion = bond * (1 + nonNeg(v.cushionPercent, 10) / 100);
  const premium = Math.max(nonNeg(v.minimumPremium, 250), withCushion * (nonNeg(v.premiumRatePercent, 0.5) / 100));
  return {
    estimatedBondAmount: round2(withCushion),
    annualBondPremium: round2(premium),
    baseBondBeforeCushion: round2(bond),
    premiumPerThousand: round2(withCushion > 0 ? (premium / withCushion) * 1000 : 0),
  };
};

export const lawFamilyCustomCalculators: Record<string, CustomCalculator> = {
  "alimony-calculator": alimonyGeneral,
  "illinois-alimony-calculator": alimonyIllinois,
  "colorado-alimony-calculator": alimonyColorado,
  "new-york-alimony-calculator": alimonyNewYork,
  "massachusetts-alimony-calculator": alimonyMassachusetts,
  "pennsylvania-alimony-calculator": alimonyPennsylvania,
  "texas-alimony-calculator": alimonyTexas,
  "california-alimony-calculator": alimonyCalifornia,
  "florida-alimony-calculator": alimonyFlorida,
  "new-hampshire-alimony-calculator": alimonyNewHampshire,
  "virginia-alimony-calculator": alimonyVirginia,
  "divorce-settlement-calculator": divorceSettlement,
  "moore-marsden-calculator": mooreMarsden,
  "qdro-calculator": coverture,
  "smith-ostler-calculator": smithOstler,
  "length-of-marriage-calculator": marriageLength,
  "probate-calculator": probateCost,
  "executor-fee-calculator": executorFeeGeneral,
  "california-probate-calculator": californiaProbate,
  "california-trustee-fee-calculator": californiaTrusteeFee,
  "florida-probate-attorney-fee-calculator": floridaAttorney,
  "florida-personal-representative-fee-calculator": floridaPr,
  "new-york-executor-fee-calculator": newYorkExecutor,
  "new-jersey-executor-fee-calculator": newJerseyExecutor,
  "oregon-personal-representative-fee-calculator": oregonPr,
  "pennsylvania-executor-fee-calculator": pennsylvaniaExecutor,
  "virginia-probate-tax-calculator": virginiaProbateTax,
  "michigan-probate-inventory-fee-calculator": michiganInventory,
  "new-york-intestacy-calculator": newYorkIntestacy,
  "islamic-inheritance-calculator": islamicInheritance,
  "conservatorship-bond-calculator": conservatorshipBond,
};
