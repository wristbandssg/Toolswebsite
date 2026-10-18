/**
 * Batch: "Law & Government Calculators" → Unemployment, Workers' Comp & Paid
 * Leave Calculators (67 tools).
 *
 * Unemployment (37 states): weekly benefit formulas, minimums and maximums from
 * the U.S. DOL "Significant Provisions of State Unemployment Insurance Laws",
 * effective July 2026 (UI_STATES). Inputs are the highest-quarter wages, the
 * second-highest quarter and total base-period wages. Where a state uses a
 * statutory table (California, Virginia, West Virginia) the formula is the
 * table's approximation.
 *
 * Paid leave (2026): California SDI/PFL (90% up to 70% of SAWW, 70% above, max
 * $1,765); New Jersey FLI/TDI (85% of AWW, max $1,119); New York PFL (67% of
 * AWW, max $1,228.53) and DBL (50%, max $170); Massachusetts PFML (80% up to 50%
 * of SAWW, 50% above, max $1,230.39); Connecticut (95% up to 40 × CT minimum
 * wage, 60% above, max $1,016.40); Colorado FAMLI (90% up to 50% of SAWW, 50%
 * above, max $1,381.45); Washington (90% up to 50% of SAWW, 50% above, max
 * $1,647); Oregon (100% up to 65% of SAWW, 50% above, max $1,692.16 from July
 * 2026); Rhode Island TCI/TDI (4.62% of HQ wages, max $1,103); Minnesota (90%
 * up to 50% of SAWW, 66% to 100%, 55% above, max $1,423). SAWW values are
 * derived from each program's published maximum.
 *
 * Workers' comp: TTD at the state's percentage of the average weekly wage,
 * capped at a state maximum the user can edit (2026 official maximums are
 * filled in where published: California $1,764.11, New York $1,281.50 from
 * 1 Jul 2026, Texas $1,314 from 1 Oct 2026, Georgia $800); permanent
 * impairment by each state's statutory method (Texas IIBs 3 weeks per %,
 * Florida IIB schedule, Tennessee 450 weeks, South Carolina 500 weeks, North
 * Carolina body-part schedule, Kansas 415 weeks, Colorado 400 weeks,
 * Georgia 300 weeks, Arkansas 450 weeks, Ohio 200 weeks, California PD
 * rating table, New York schedule loss of use).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-law-ui-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

// --- Unemployment ------------------------------------------------------------------------------

type UiMethod = "hq" | "avg2" | "two" | "pctHQ" | "pctAvg2" | "pctBPW" | "awwHQ" | "aww2" | "awwBP" | "avg4" | "pa" | "mn";
export interface UiState {
  name: string;
  method: UiMethod;
  /** Divisor (hq, avg2, two, avg4) or rate (the pct and aww methods). */
  k: number;
  min: number;
  max: number;
  weeks: number;
  /** Dependent allowance per dependent and the most dependents counted. */
  dep?: [number, number];
  /** Maximum including dependents (if higher). */
  maxWithDeps?: number;
  sub?: number;
}
const ui = (name: string, method: UiMethod, k: number, min: number, max: number, weeks: number, extra: Partial<UiState> = {}): UiState => ({ name, method, k, min, max, weeks, ...extra });

export const UI_STATES: UiState[] = [
  ui("Alabama", "avg2", 26, 45, 275, 14),
  ui("Arizona", "hq", 25, 0, 320, 24),
  ui("Arkansas", "avg4", 26, 81, 451, 12),
  ui("California", "hq", 26, 40, 450, 26),
  ui("Colorado", "aww2", 0.6, 25, 804, 26),
  ui("Connecticut", "avg2", 26, 44, 721, 26, { dep: [15, 5], maxWithDeps: 796 }),
  ui("Florida", "hq", 26, 32, 275, 12),
  ui("Idaho", "hq", 26, 72, 624, 26),
  ui("Illinois", "aww2", 0.47, 51, 628, 26),
  ui("Indiana", "awwBP", 0.47, 37, 390, 26),
  ui("Iowa", "hq", 23, 96, 644, 16),
  ui("Kansas", "pctHQ", 0.0425, 165, 663, 16),
  ui("Kentucky", "pctBPW", 0.011923, 39, 720, 16),
  ui("Maine", "avg2", 22, 113, 649, 26, { dep: [25, 10], maxWithDeps: 1135 }),
  ui("Maryland", "hq", 24, 50, 430, 26, { dep: [8, 5] }),
  ui("Massachusetts", "aww2", 0.5, 60, 1105, 26, { dep: [25, 20], maxWithDeps: 99999 }),
  ui("Michigan", "pctHQ", 0.041, 0, 530, 26, { dep: [19.33, 5], maxWithDeps: 530 }),
  ui("Minnesota", "mn", 0.5, 37, 948, 26),
  ui("Missouri", "pctAvg2", 0.04, 35, 320, 20),
  ui("Montana", "pctBPW", 0.01, 227, 767, 26),
  ui("Nevada", "hq", 25, 16, 657, 26),
  ui("New Jersey", "awwBP", 0.6, 186, 905, 26),
  ui("New York", "hq", 26, 140, 869, 26),
  ui("North Carolina", "two", 52, 15, 350, 12),
  ui("North Dakota", "two", 65, 43, 815, 26),
  ui("Ohio", "awwBP", 0.5, 176, 624, 26),
  ui("Oklahoma", "hq", 23, 16, 649, 16),
  ui("Oregon", "pctBPW", 0.0125, 211, 902, 26),
  ui("Pennsylvania", "pa", 0.04, 68, 605, 26),
  ui("Rhode Island", "pctAvg2", 0.0385, 82, 777, 26),
  ui("Tennessee", "avg2", 26, 55, 325, 12),
  ui("Texas", "hq", 25, 75, 605, 26),
  ui("Utah", "hq", 26, 47, 806, 26, { sub: 5 }),
  ui("Virginia", "two", 50, 160, 478, 26),
  ui("Washington", "pctAvg2", 0.0385, 383, 1208, 26),
  ui("West Virginia", "awwBP", 0.55, 24, 662, 26),
  ui("Wisconsin", "pctHQ", 0.04, 54, 370, 26),
];
export const uiSlug = (s: UiState) => `${s.name.toLowerCase().replace(/ /g, "-")}-unemployment-calculator`;

export function uiWeekly(s: UiState, hq: number, hq2: number, bpw: number, deps: number) {
  const q1 = nonNeg(hq);
  const q2 = Math.min(q1, nonNeg(hq2));
  const b = Math.max(nonNeg(bpw), q1 + q2);
  const d = Math.round(nonNeg(deps));
  let base = 0;
  switch (s.method) {
    case "hq":
      // New York uses 1/25 when the high quarter is $3,575 or less.
      base = q1 / (s.name === "New York" && q1 <= 3575 ? 25 : s.k) - (s.sub ?? 0);
      break;
    case "avg2":
      base = (q1 + q2) / 2 / s.k;
      break;
    case "two":
      base = (q1 + q2) / s.k;
      break;
    case "pctHQ":
      base = q1 * s.k;
      break;
    case "pctAvg2":
      base = ((q1 + q2) / 2) * s.k;
      break;
    case "pctBPW":
      base = b * s.k;
      break;
    case "awwHQ":
      base = (q1 / 13) * s.k;
      break;
    case "aww2":
      base = ((q1 + q2) / 26) * s.k;
      break;
    case "awwBP":
      base = (b / 52) * s.k;
      break;
    case "avg4":
      base = b / 4 / s.k;
      break;
    case "pa":
      base = (q1 * 0.04 + 2) * 0.98;
      break;
    case "mn":
      base = Math.max(Math.min((q1 / 13) * 0.5, 611), Math.min((b / 52) * 0.5, 948));
      break;
  }
  base = Math.floor(Math.max(0, base));
  const eligible = base >= s.min && q1 > 0;
  let wba = Math.min(s.max, base);
  let depAllowance = 0;
  if (s.dep && d > 0) {
    depAllowance = s.dep[0] * Math.min(d, s.dep[1]);
    if (s.name === "Connecticut") depAllowance = Math.min(depAllowance, wba);
    if (s.name === "Maine") depAllowance = Math.min(depAllowance, wba * 0.5);
  }
  if (s.name === "Pennsylvania" && d > 0) depAllowance = d >= 2 ? 8 : 5;
  if (s.name === "Rhode Island" && d > 0) {
    const per = Math.max(15, wba * 0.05);
    depAllowance = Math.min(per * d, Math.max(50, wba * 0.25));
  }
  const cap = s.maxWithDeps ?? (s.name === "Pennsylvania" ? 613 : s.name === "Rhode Island" ? 971 : s.max);
  wba = eligible ? Math.min(cap, wba + depAllowance) : 0;
  return { wba, base, eligible, maxTotal: wba * s.weeks };
}

export const stateUnemployment = (s: UiState): CustomCalculator => (v) => {
  const r = uiWeekly(s, v.highestQuarterWages, v.secondHighestQuarterWages, v.baseYearWages, v.dependents);
  const tax = Math.min(40, nonNeg(v.withholdingPercent)) / 100;
  return {
    weeklyBenefitAmount: round2(r.wba),
    maximumTotalBenefits: round2(r.maxTotal),
    weeksAvailable: s.weeks,
    weeklyAfterWithholding: round2(r.wba * (1 - tax)),
    stateMaximumWeekly: s.maxWithDeps && s.maxWithDeps < 99999 ? s.maxWithDeps : s.max,
    likelyEligible: r.eligible ? 1 : 0,
    replacementRatePercent: round2(nonNeg(v.highestQuarterWages) > 0 ? (r.wba / (nonNeg(v.highestQuarterWages) / 13)) * 100 : 0),
  };
};

// --- Paid family & medical leave ---------------------------------------------------------------

export interface PflProgram {
  slug: string;
  name: string;
  /** Tiers: [upper bound as share of SAWW, replacement rate]. */
  tiers: [number, number][];
  saww: number;
  max: number;
  weeks: number;
  basis: "hq" | "aww";
}
const P = (slug: string, name: string, tiers: [number, number][], saww: number, max: number, weeks: number, basis: "hq" | "aww" = "aww"): PflProgram => ({ slug, name, tiers, saww, max, weeks, basis });
export const PFL: PflProgram[] = [
  P("california-paid-family-leave-calculator", "California SDI & Paid Family Leave", [[0.7, 0.9], [Infinity, 0.7]], 1820, 1765, 8, "hq"),
  P("new-jersey-paid-family-leave-calculator", "New Jersey Family Leave & Temporary Disability", [[Infinity, 0.85]], 1, 1119, 12),
  P("new-york-paid-family-leave-calculator", "New York Paid Family Leave", [[Infinity, 0.67]], 1, 1228.53, 12),
  P("new-york-short-term-disability-calculator", "New York Short-Term Disability (DBL)", [[Infinity, 0.5]], 1, 170, 26),
  P("massachusetts-paid-family-leave-calculator", "Massachusetts PFML", [[0.5, 0.8], [Infinity, 0.5]], 1922.48, 1230.39, 12),
  P("connecticut-paid-family-leave-calculator", "Connecticut Paid Leave", [[677.6, 0.95], [Infinity, 0.6]], 1, 1016.4, 12),
  P("colorado-paid-family-leave-calculator", "Colorado FAMLI", [[0.5, 0.9], [Infinity, 0.5]], 1534.94, 1381.45, 12),
  P("washington-paid-family-leave-calculator", "Washington Paid Family & Medical Leave", [[0.5, 0.9], [Infinity, 0.5]], 1830, 1647, 12),
  P("oregon-paid-family-leave-calculator", "Paid Leave Oregon", [[0.65, 1], [Infinity, 0.5]], 1410.13, 1692.16, 12),
  P("rhode-island-paid-family-leave-calculator", "Rhode Island TCI & TDI", [[Infinity, 0.6]], 1, 1103, 8, "hq"),
  P("minnesota-paid-family-leave-calculator", "Minnesota Paid Leave", [[0.5, 0.9], [1, 0.66], [Infinity, 0.55]], 1423, 1423, 12),
];

export function pflWeekly(p: PflProgram, weeklyWage: number): number {
  const w = nonNeg(weeklyWage);
  // Connecticut tiers are in dollars (40 × CT minimum wage); others are shares of the SAWW.
  const bound = (b: number) => (p.slug.startsWith("connecticut") ? b : b * p.saww);
  let left = w;
  let prev = 0;
  let benefit = 0;
  for (const [upper, rate] of p.tiers) {
    const top = Number.isFinite(upper) ? bound(upper) : Infinity;
    const slice = Math.max(0, Math.min(left, top - prev));
    benefit += slice * rate;
    left -= slice;
    prev = top;
    if (left <= 0) break;
  }
  return Math.min(p.max, benefit);
}

export const paidLeave = (p: PflProgram): CustomCalculator => (v) => {
  const weekly = p.basis === "hq" ? nonNeg(v.highestQuarterWages) / 13 : nonNeg(v.averageWeeklyWage);
  let wba = pflWeekly(p, weekly);
  if (p.slug.startsWith("rhode-island")) {
    wba = Math.min(p.max, nonNeg(v.highestQuarterWages) * 0.0462);
    const deps = Math.round(nonNeg(v.dependents));
    if (deps > 0) wba = Math.min(p.max * 1.3, wba + Math.max(15, wba * 0.07) * deps);
  }
  const weeks = Math.min(52, nonNeg(v.weeksOfLeave, p.weeks));
  return {
    weeklyBenefit: round2(wba),
    totalBenefit: round2(wba * weeks),
    replacementRatePercent: round2(weekly > 0 ? (wba / weekly) * 100 : 0),
    weeklyWageUsed: round2(weekly),
    programMaximumWeekly: p.max,
  };
};

// --- FMLA ----------------------------------------------------------------------------------------

export const fmla: CustomCalculator = (v) => {
  const eligible = nonNeg(v.monthsEmployed) >= 12 && nonNeg(v.hoursLast12Months) >= 1250 && Math.round(safeNumber(v.employer50Within75Miles, 1)) === 1;
  const maxWeeks = Math.round(safeNumber(v.reason)) === 1 ? 26 : 12;
  const left = Math.max(0, maxWeeks - nonNeg(v.weeksUsedLast12Months));
  return {
    weeksAvailable: eligible ? round2(left) : 0,
    eligible: eligible ? 1 : 0,
    hoursAvailable: eligible ? round2(left * nonNeg(v.hoursPerWeek, 40)) : 0,
    hoursShortOf1250: round2(Math.max(0, 1250 - nonNeg(v.hoursLast12Months))),
  };
};

// --- Workers' compensation ---------------------------------------------------------------------

export interface WcState {
  slug: string;
  name: string;
  ttdRate: number;
  max: number;
  /** "weeks": PPD = % × weeks × rate; "tx": 3 weeks per %; "fl": FL IIB schedule; "ca": CA PD table; "nc": body part weeks. */
  ppd: "weeks" | "tx" | "fl" | "ca" | "nc";
  ppdWeeks: number;
  /** PPD weekly rate as a share of TTD (e.g. Florida 75%). */
  ppdRateShare: number;
  law: string;
}
const W = (name: string, ttdRate: number, max: number, ppd: WcState["ppd"], ppdWeeks: number, law: string, ppdRateShare = 1): WcState => ({
  slug: `${name.toLowerCase().replace(/ /g, "-")}-workers-comp-calculator`, name, ttdRate, max, ppd, ppdWeeks, law, ppdRateShare,
});
export const WC_STATES: WcState[] = [
  W("California", 2 / 3, 1764.11, "ca", 0, "Labor Code §4653 and §4658"),
  W("Texas", 0.7, 1314, "tx", 3, "Labor Code §408.103 and §408.121"),
  W("Florida", 2 / 3, 1358, "fl", 0, "Florida Statutes §440.15", 0.75),
  W("Tennessee", 2 / 3, 1355, "weeks", 450, "Tenn. Code §50-6-207"),
  W("South Carolina", 2 / 3, 1205, "weeks", 500, "S.C. Code §42-9-30"),
  W("North Carolina", 2 / 3, 1446, "nc", 0, "N.C.G.S. §97-29 and §97-31"),
  W("Kansas", 2 / 3, 835, "weeks", 415, "K.S.A. 44-510e"),
  W("Colorado", 2 / 3, 1365, "weeks", 400, "C.R.S. §8-42-107"),
  W("Georgia", 2 / 3, 800, "weeks", 300, "O.C.G.A. §34-9-261 and §34-9-263"),
  W("Arkansas", 2 / 3, 897, "weeks", 450, "Ark. Code §11-9-519 and §11-9-522"),
  W("Ohio", 0.72, 1217, "weeks", 200, "Ohio Rev. Code §4123.56 and §4123.57"),
  W("New York", 2 / 3, 1281.5, "nc", 0, "Workers' Compensation Law §15"),
];

/** Body-part schedules (weeks): North Carolina §97-31 and New York §15(3). */
export const NC_SCHEDULE: [string, number][] = [["Back / spine", 300], ["Arm", 240], ["Leg", 200], ["Hand", 200], ["Foot", 144], ["Eye", 120], ["Thumb", 75], ["Index finger", 45], ["Hearing (one ear)", 70], ["Hearing (both ears)", 150]];
export const NY_SCHEDULE: [string, number][] = [["Arm", 312], ["Leg", 288], ["Hand", 244], ["Foot", 205], ["Eye", 160], ["Thumb", 75], ["Index finger", 46], ["Big toe", 38], ["Hearing (one ear)", 60], ["Hearing (both ears)", 150]];

/** California PD rating → weeks (LC 4658(d)), approximated by band. */
function caPdWeeks(rating: number): number {
  const r = Math.min(100, nonNeg(rating));
  let weeks = 0;
  const bands: [number, number][] = [[10, 4], [25, 5], [30, 6], [50, 7], [70, 8], [100, 16]];
  let prev = 0;
  for (const [top, perPct] of bands) {
    const part = Math.max(0, Math.min(r, top) - prev);
    weeks += part * perPct;
    prev = top;
  }
  return weeks;
}

function floridaIibWeeks(rating: number): number {
  const r = Math.min(100, nonNeg(rating));
  return Math.min(r, 10) * 2 + Math.max(0, Math.min(r, 15) - 10) * 3 + Math.max(0, Math.min(r, 20) - 15) * 4 + Math.max(0, r - 20) * 6;
}

export const stateWorkersComp = (s: WcState): CustomCalculator => (v) => {
  const aww = nonNeg(v.averageWeeklyWage);
  const max = nonNeg(v.stateMaximumWeekly) || s.max;
  const ttd = Math.min(max, aww * s.ttdRate);
  const ttdWeeks = nonNeg(v.weeksOffWork);
  const rating = Math.min(100, nonNeg(v.impairmentRating));
  let ppdWeeks = 0;
  let ppdRate = ttd * s.ppdRateShare;
  if (s.ppd === "weeks") ppdWeeks = (rating / 100) * s.ppdWeeks;
  if (s.ppd === "tx") ppdWeeks = rating * 3;
  if (s.ppd === "fl") {
    ppdWeeks = floridaIibWeeks(rating);
    if (Math.round(safeNumber(v.returnedToWork)) === 1) ppdRate = ttd * 0.5;
  }
  if (s.ppd === "ca") {
    ppdWeeks = caPdWeeks(rating);
    // PD rate: 2/3 of AWW, min $160, max $290 a week for ratings under 70% (LC 4453/4658).
    ppdRate = Math.min(rating >= 70 ? 435 : 290, Math.max(160, aww * (2 / 3)));
  }
  if (s.ppd === "nc") {
    const sched = s.name === "New York" ? NY_SCHEDULE : NC_SCHEDULE;
    const idx = Math.min(sched.length - 1, Math.max(0, Math.round(safeNumber(v.bodyPart))));
    ppdWeeks = (rating / 100) * sched[idx][1];
  }
  const ppd = ppdWeeks * ppdRate;
  const ttdTotal = ttd * ttdWeeks;
  return {
    weeklyTtdBenefit: round2(ttd),
    temporaryDisabilityTotal: round2(ttdTotal),
    permanentDisabilityAward: round2(ppd),
    permanentDisabilityWeeks: round2(ppdWeeks),
    estimatedTotalBenefits: round2(ttdTotal + ppd + nonNeg(v.futureMedicalEstimate)),
    ttdCappedAtMaximum: aww * s.ttdRate > max ? 1 : 0,
  };
};

/** General workers' comp: TTD at a chosen rate and PPD = % × weeks × rate. */
export const workersCompGeneral: CustomCalculator = (v) => {
  const aww = nonNeg(v.averageWeeklyWage);
  const rate = Math.min(100, nonNeg(v.benefitRatePercent, 66.67)) / 100;
  const max = nonNeg(v.stateMaximumWeekly) || Infinity;
  const ttd = Math.min(max, aww * rate);
  const ppdWeeks = (Math.min(100, nonNeg(v.impairmentRating)) / 100) * nonNeg(v.weeksForBodyPart, 500);
  const ppd = ppdWeeks * ttd;
  const ttdTotal = ttd * nonNeg(v.weeksOffWork);
  return {
    weeklyTtdBenefit: round2(ttd),
    temporaryDisabilityTotal: round2(ttdTotal),
    permanentDisabilityAward: round2(ppd),
    permanentDisabilityWeeks: round2(ppdWeeks),
    estimatedTotalBenefits: round2(ttdTotal + ppd + nonNeg(v.futureMedicalEstimate)),
    ttdCappedAtMaximum: aww * rate > max ? 1 : 0,
  };
};

/** Settlement value: remaining indemnity + PPD + future medical, discounted, less fees. */
export const workersCompSettlement: CustomCalculator = (v) => {
  const weekly = nonNeg(v.weeklyCompRate);
  const remaining = weekly * nonNeg(v.weeksOfBenefitsRemaining);
  const ppd = nonNeg(v.permanentDisabilityValue);
  const medical = nonNeg(v.futureMedicalCosts) * (Math.round(safeNumber(v.closeMedical, 1)) === 1 ? 1 : 0);
  const gross = (remaining + ppd + medical) * (1 - Math.min(50, nonNeg(v.negotiationDiscountPercent, 20)) / 100);
  const fees = gross * (Math.min(25, nonNeg(v.attorneyFeePercent, 15)) / 100);
  return {
    estimatedSettlement: round2(gross),
    netToYou: round2(gross - fees),
    remainingIndemnity: round2(remaining),
    attorneyFees: round2(fees),
    futureMedicalIncluded: round2(medical),
  };
};

export const averageWeeklyWage: CustomCalculator = (v) => {
  const gross = nonNeg(v.grossWagesInPeriod);
  const weeks = Math.max(1, nonNeg(v.weeksInPeriod, 52));
  const aww = gross / weeks + nonNeg(v.weeklyValueOfBenefits);
  const rate = Math.min(100, nonNeg(v.benefitRatePercent, 66.67)) / 100;
  return {
    averageWeeklyWage: round2(aww),
    weeklyCompRate: round2(aww * rate),
    monthlyEquivalent: round2((aww * 52) / 12),
    annualEquivalent: round2(aww * 52),
  };
};

export const temporaryPartialDisability: CustomCalculator = (v) => {
  const loss = Math.max(0, nonNeg(v.preInjuryAww) - nonNeg(v.currentWeeklyEarnings));
  const rate = Math.min(100, nonNeg(v.benefitRatePercent, 66.67)) / 100;
  const max = nonNeg(v.stateMaximumWeekly) || Infinity;
  const weekly = Math.min(max, loss * rate);
  return {
    weeklyTpdBenefit: round2(weekly),
    weeklyWageLoss: round2(loss),
    totalForPeriod: round2(weekly * nonNeg(v.weeks)),
    totalWeeklyIncome: round2(weekly + nonNeg(v.currentWeeklyEarnings)),
  };
};

export const nySlu: CustomCalculator = (v) => {
  const idx = Math.min(NY_SCHEDULE.length - 1, Math.max(0, Math.round(safeNumber(v.bodyPart))));
  const weeks = (Math.min(100, nonNeg(v.lossOfUsePercent)) / 100) * NY_SCHEDULE[idx][1];
  const rate = Math.min(nonNeg(v.stateMaximumWeekly) || 1281.5, nonNeg(v.averageWeeklyWage) * (2 / 3));
  return {
    sluAward: round2(weeks * rate),
    awardWeeks: round2(weeks),
    weeklyRate: round2(rate),
    scheduleWeeksForBodyPart: NY_SCHEDULE[idx][1],
  };
};

export const experienceMod: CustomCalculator = (v) => {
  const actual = nonNeg(v.actualLosses);
  const expected = Math.max(1, nonNeg(v.expectedLosses));
  const w = Math.min(1, nonNeg(v.credibilityWeightPercent, 30) / 100);
  const mod = w * (actual / expected) + (1 - w);
  const premium = nonNeg(v.manualPremium);
  return {
    experienceMod: round2(mod),
    modifiedPremium: round2(premium * mod),
    premiumDifference: round2(premium * (mod - 1)),
    lossRatioPercent: round2((actual / expected) * 100),
  };
};

export const defenseBaseAct: CustomCalculator = (v) => {
  const aww = nonNeg(v.averageWeeklyWage);
  const max = nonNeg(v.maximumWeekly, 3859.62);
  const weekly = Math.min(max, aww * (2 / 3));
  const rating = Math.min(100, nonNeg(v.impairmentRating));
  const weeks = (rating / 100) * nonNeg(v.scheduleWeeks, 312);
  return {
    weeklyCompensation: round2(weekly),
    temporaryDisabilityTotal: round2(weekly * nonNeg(v.weeksOffWork)),
    scheduledAward: round2(weekly * weeks),
    estimatedClaimValue: round2(weekly * nonNeg(v.weeksOffWork) + weekly * weeks + nonNeg(v.futureMedicalEstimate)),
  };
};

export const lawUiCustomCalculators: Record<string, CustomCalculator> = {
  ...Object.fromEntries(UI_STATES.map((s) => [uiSlug(s), stateUnemployment(s)])),
  ...Object.fromEntries(PFL.map((p) => [p.slug, paidLeave(p)])),
  "fmla-calculator": fmla,
  ...Object.fromEntries(WC_STATES.map((s) => [s.slug, stateWorkersComp(s)])),
  "workers-comp-calculator": workersCompGeneral,
  "workers-comp-settlement-calculator": workersCompSettlement,
  "average-weekly-wage-calculator": averageWeeklyWage,
  "temporary-partial-disability-calculator": temporaryPartialDisability,
  "schedule-loss-of-use-calculator": nySlu,
  "experience-mod-calculator": experienceMod,
  "defense-base-act-calculator": defenseBaseAct,
};
