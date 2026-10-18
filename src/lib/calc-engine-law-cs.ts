/**
 * Batch: "Law & Government Calculators" → Child Support Calculators
 * (50 state calculators + general, Canada & provinces, UK, Philippines,
 * arrears, parenting time and emancipation — 61 tools).
 *
 * One engine, one config per state (CS_STATES): the income basis (gross or
 * net), the guideline model, and the shared-parenting rule.
 *
 * Models:
 *  - "shares": income shares. The basic obligation comes from an estimated
 *    schedule (SCHEDULE_1_CHILD × CHILD_MULTIPLIERS, Betson–Rothbarth-style
 *    percentages that fall as income rises; net-income states use the gross
 *    curve × 1.25). Users can type the exact figure from their state's
 *    schedule into "basicObligationOverride" to replace the estimate.
 *  - "tx": Texas Family Code §154.125 — 20/25/30/35/40% of the obligor's net
 *    resources, capped at $11,700 a month (from 1 Sep 2025).
 *  - "ny": CSSA — 17/25/29/31/35% of combined parental income up to $193,000
 *    (from 1 Mar 2026), shared pro rata.
 *  - "wi": DCF 150 — 17/25/29/31/34% of the payer's gross, reduced bands above
 *    $7,000 and $12,500 a month; shared placement (25%+) uses the 1.5 formula.
 *  - "nv": NAC 425.140 — tiered % of gross (first $6,000 / next $4,000 / above
 *    $10,000); joint physical custody (40%+) offsets the two obligations.
 *  - "ms": Miss. Code §43-19-101 — 14/20/22/24/26% of adjusted gross income.
 *  - "ak": Civil Rule 90.3 — 20/27/33% + 3% per extra child of adjusted income;
 *    shared custody (30%+) uses the 1.5 formula.
 *  - "nd": obligor-only % of net income (approximation of the ND schedule).
 *  - "ca": Family Code §4055 — CS = K[HN − (H%)(TN)], fraction bands from
 *    1 Sep 2024, multipliers for 2–10 children.
 * Shared parenting ("cross" rule): when the paying parent has at least the
 * state's threshold of overnights, each parent owes the basic obligation ×
 * multiplier × their income share × the other parent's time; the difference
 * is paid.
 *
 * Also: Canada federal tables (approximation of the provincial tables by
 * income), UK Child Maintenance Service rates, generic proportional support
 * (Philippines), arrears with interest, parenting-time schedules, and the
 * age child support ends.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-law-cs-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

export type CsModel = "shares" | "tx" | "ny" | "wi" | "nv" | "ms" | "ak" | "nd" | "ca";

export interface CsState {
  name: string;
  slug: string;
  basis: "gross" | "net";
  model: CsModel;
  /** [overnights a year the paying parent needs, multiplier] for the cross-credit rule; null = no formula adjustment. */
  shared: [number, number] | null;
  /** Statute or guideline name used in the copy. */
  law: string;
  /** Emancipation age (support usually ends). */
  endAge: number;
}

const st = (name: string, basis: "gross" | "net", model: CsModel, shared: [number, number] | null, law: string, endAge = 18): CsState => ({
  name,
  slug: `${name.toLowerCase().replace(/ /g, "-")}-child-support-calculator`,
  basis,
  model,
  shared,
  law,
  endAge,
});

export const CS_STATES: CsState[] = [
  st("Alabama", "gross", "shares", null, "Alabama Rule of Judicial Administration 32", 19),
  st("Alaska", "net", "ak", [110, 1.5], "Alaska Civil Rule 90.3"),
  st("Arizona", "gross", "shares", null, "Arizona Child Support Guidelines"),
  st("Arkansas", "gross", "shares", null, "Arkansas Administrative Order No. 10"),
  st("California", "net", "ca", null, "California Family Code §4055"),
  st("Colorado", "gross", "shares", [93, 1.5], "C.R.S. §14-10-115", 19),
  st("Connecticut", "net", "shares", null, "Connecticut Child Support and Arrearage Guidelines"),
  st("Delaware", "net", "shares", null, "Delaware Child Support Formula (Melson)"),
  st("Florida", "net", "shares", [73, 1.5], "Florida Statutes §61.30"),
  st("Georgia", "gross", "shares", null, "O.C.G.A. §19-6-15"),
  st("Hawaii", "gross", "shares", null, "Hawaii Child Support Guidelines"),
  st("Idaho", "gross", "shares", null, "Idaho Child Support Guidelines (I.R.F.L.P. 120)"),
  st("Illinois", "net", "shares", [146, 1.5], "750 ILCS 5/505"),
  st("Indiana", "gross", "shares", null, "Indiana Child Support Rules and Guidelines", 19),
  st("Iowa", "net", "shares", [146, 1.5], "Iowa Court Rules Chapter 9"),
  st("Kansas", "gross", "shares", null, "Kansas Child Support Guidelines"),
  st("Kentucky", "gross", "shares", null, "KRS 403.212"),
  st("Louisiana", "gross", "shares", [182, 1.5], "La. R.S. 9:315"),
  st("Maine", "gross", "shares", null, "19-A M.R.S. Chapter 63"),
  st("Maryland", "gross", "shares", [128, 1.5], "Maryland Family Law §12-204"),
  st("Massachusetts", "gross", "shares", null, "Massachusetts Child Support Guidelines", 18),
  st("Michigan", "net", "shares", null, "Michigan Child Support Formula"),
  st("Minnesota", "gross", "shares", null, "Minn. Stat. §518A.35"),
  st("Mississippi", "net", "ms", null, "Miss. Code §43-19-101", 21),
  st("Missouri", "gross", "shares", null, "Missouri Supreme Court Rule 88.01 (Form 14)", 21),
  st("Montana", "net", "shares", null, "Montana Child Support Guidelines (ARM 37.62)"),
  st("Nebraska", "net", "shares", [142, 1.5], "Nebraska Child Support Guidelines", 19),
  st("Nevada", "gross", "nv", [146, 1], "NAC Chapter 425"),
  st("New Hampshire", "net", "shares", null, "RSA 458-C"),
  st("New Jersey", "net", "shares", null, "New Jersey Child Support Guidelines (Rule 5:6A)"),
  st("New Mexico", "gross", "shares", [146, 1.5], "NMSA §40-4-11.1"),
  st("New York", "gross", "ny", null, "Child Support Standards Act (DRL §240, FCA §413)", 21),
  st("North Carolina", "gross", "shares", [123, 1.5], "North Carolina Child Support Guidelines"),
  st("North Dakota", "net", "nd", null, "N.D. Admin. Code ch. 75-02-04.1"),
  st("Ohio", "gross", "shares", null, "Ohio Revised Code Chapter 3119"),
  st("Oklahoma", "gross", "shares", [121, 1.5], "43 O.S. §118"),
  st("Oregon", "gross", "shares", null, "OAR 137-050 (Oregon Child Support Guidelines)"),
  st("Pennsylvania", "net", "shares", null, "Pa.R.C.P. 1910.16"),
  st("Rhode Island", "gross", "shares", null, "Rhode Island Family Court Child Support Guidelines"),
  st("South Carolina", "gross", "shares", [110, 1.5], "South Carolina Child Support Guidelines"),
  st("South Dakota", "net", "shares", null, "SDCL §25-7-6.2"),
  st("Tennessee", "gross", "shares", null, "Tenn. Comp. R. & Regs. 1240-02-04"),
  st("Texas", "net", "tx", null, "Texas Family Code §154.125"),
  st("Utah", "gross", "shares", [111, 1.5], "Utah Code §78B-12"),
  st("Vermont", "gross", "shares", null, "15 V.S.A. §653–656"),
  st("Virginia", "gross", "shares", [90, 1.4], "Va. Code §20-108.2"),
  st("Washington", "net", "shares", null, "RCW 26.19"),
  st("West Virginia", "gross", "shares", [127, 1.5], "W. Va. Code §48-13"),
  st("Wisconsin", "gross", "wi", [92, 1.5], "Wis. Admin. Code DCF 150"),
  st("Wyoming", "net", "shares", null, "Wyo. Stat. §20-2-304"),
];

/** Estimated income-shares schedule: share of combined monthly GROSS income for one child. */
const SCHEDULE_1_CHILD: [number, number][] = [
  [1000, 0.205], [2000, 0.2], [3000, 0.19], [4000, 0.18], [5000, 0.17], [6000, 0.16], [8000, 0.145],
  [10000, 0.135], [15000, 0.115], [20000, 0.1], [30000, 0.085],
];
export const CHILD_MULTIPLIERS = [1, 1.45, 1.7, 1.9, 2.07, 2.22];

function interp(points: [number, number][], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i][0]) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return points[points.length - 1][1];
}

const kidIndex = (children: number) => Math.min(5, Math.max(0, Math.round(nonNeg(children, 1)) - 1));

/** Estimated basic obligation (monthly) for combined income. */
export function estimatedBasicObligation(combined: number, children: number, basis: "gross" | "net"): number {
  const c = nonNeg(combined);
  const gross = basis === "net" ? c * 1.25 : c;
  // Above $30,000 a month the schedule stays at its top rate.
  const pct = interp(SCHEDULE_1_CHILD, gross);
  return c * pct * (basis === "net" ? 1.25 : 1) * CHILD_MULTIPLIERS[kidIndex(children)];
}

interface CsInputs {
  payer: number;
  other: number;
  children: number;
  overnights: number;
  health: number;
  healthPaidByPayer: boolean;
  childcare: number;
  childcarePaidByPayer: boolean;
  override: number;
  aboveCap: boolean;
}

function readInputs(v: Record<string, number>): CsInputs {
  return {
    payer: nonNeg(v.payingParentIncome),
    other: nonNeg(v.otherParentIncome),
    children: Math.max(1, Math.round(nonNeg(v.children, 1))),
    overnights: Math.min(365, nonNeg(v.payingParentOvernights)),
    health: nonNeg(v.healthInsurance),
    healthPaidByPayer: Math.round(safeNumber(v.healthInsurancePaidBy)) === 0,
    childcare: nonNeg(v.childcare),
    childcarePaidByPayer: Math.round(safeNumber(v.childcarePaidBy)) === 0,
    override: nonNeg(v.basicObligationOverride),
    aboveCap: Math.round(safeNumber(v.applyAboveCap)) === 1,
  };
}

/** Add-ons split by income share; credit for whatever the payer pays directly. */
function addOns(i: CsInputs, share: number) {
  const total = i.health + i.childcare;
  const payerShare = total * share;
  const paidDirect = (i.healthPaidByPayer ? i.health : 0) + (i.childcarePaidByPayer ? i.childcare : 0);
  return { total, payerShare, adjustment: payerShare - paidDirect };
}

function finish(basicTotal: number, payerBasic: number, share: number, i: CsInputs, sharedApplied: boolean, ssr: number) {
  const a = addOns(i, share);
  let support = Math.max(0, payerBasic + a.adjustment);
  // Low-income protection: leave the payer at least the self-support reserve (minimum order $50).
  const cap = Math.max(50, i.payer - ssr);
  const lowIncome = support > cap && i.payer > 0;
  if (lowIncome) support = cap;
  return {
    monthlyChildSupport: round2(support),
    basicObligationTotal: round2(basicTotal),
    payingParentIncomeShare: round2(share * 100),
    addOnsPayingParentShare: round2(a.payerShare),
    annualChildSupport: round2(support * 12),
    perChildPerMonth: round2(support / i.children),
    sharedParentingApplied: sharedApplied ? 1 : 0,
    lowIncomeAdjustmentApplied: lowIncome ? 1 : 0,
  };
}

const SSR = { gross: 1700, net: 1330 };

/** Income shares with an optional cross-credit shared-parenting rule. */
function sharesModel(s: CsState, i: CsInputs, basicOverride?: number) {
  const combined = i.payer + i.other;
  const share = combined > 0 ? i.payer / combined : 0;
  const basic = basicOverride ?? (i.override > 0 ? i.override : estimatedBasicObligation(combined, i.children, s.basis));
  if (s.shared && i.overnights >= s.shared[0]) {
    const [, mult] = s.shared;
    const payerTime = i.overnights / 365;
    const adjusted = basic * mult;
    const payerOwes = adjusted * share * (1 - payerTime);
    const otherOwes = adjusted * (1 - share) * payerTime;
    return finish(basic, Math.max(0, payerOwes - otherOwes), share, i, true, SSR[s.basis]);
  }
  return finish(basic, basic * share, share, i, false, SSR[s.basis]);
}

const pick = (arr: number[], children: number) => arr[Math.min(arr.length - 1, Math.max(1, Math.round(children)) - 1)];

export const TX_CAP = 11700;
export const NY_CAP = 193000;

function stateModel(s: CsState, i: CsInputs) {
  const combined = i.payer + i.other;
  const share = combined > 0 ? i.payer / combined : 1;
  switch (s.model) {
    case "tx": {
      const pct = pick([0.2, 0.25, 0.3, 0.35, 0.4], i.children);
      const base = Math.min(i.payer, TX_CAP) * pct;
      return finish(base, base, 1, { ...i, health: i.healthPaidByPayer ? 0 : i.health, childcare: 0 }, false, 0);
    }
    case "ny": {
      const pct = pick([0.17, 0.25, 0.29, 0.31, 0.35], i.children);
      const annual = combined * 12;
      const counted = i.aboveCap ? annual : Math.min(annual, NY_CAP);
      const basic = (counted * pct) / 12;
      return finish(basic, basic * share, share, i, false, SSR.gross);
    }
    case "wi": {
      const k = Math.min(5, i.children) - 1;
      const bands = [
        [0.17, 0.25, 0.29, 0.31, 0.34],
        [0.14, 0.2, 0.23, 0.25, 0.27],
        [0.1, 0.15, 0.17, 0.19, 0.2],
      ];
      const owe = (inc: number) => Math.min(inc, 7000) * bands[0][k] + Math.max(0, Math.min(inc, 12500) - 7000) * bands[1][k] + Math.max(0, inc - 12500) * bands[2][k];
      if (i.overnights >= 92) {
        const t = i.overnights / 365;
        const net = owe(i.payer) * 1.5 * (1 - t) - owe(i.other) * 1.5 * t;
        return finish(owe(i.payer), Math.max(0, net), share, i, true, SSR.gross);
      }
      return finish(owe(i.payer), owe(i.payer), share, i, false, SSR.gross);
    }
    case "nv": {
      const n = i.children;
      const t1 = n <= 4 ? [0.16, 0.22, 0.26, 0.28][n - 1] : 0.28 + 0.02 * (n - 4);
      const t2 = n <= 4 ? [0.08, 0.11, 0.13, 0.14][n - 1] : 0.14 + 0.01 * (n - 4);
      const t3 = n <= 4 ? [0.04, 0.06, 0.06, 0.07][n - 1] : 0.07 + 0.01 * (n - 4);
      const owe = (inc: number) => Math.min(inc, 6000) * t1 + Math.max(0, Math.min(inc, 10000) - 6000) * t2 + Math.max(0, inc - 10000) * t3;
      if (i.overnights >= 146) return finish(owe(i.payer), Math.max(0, owe(i.payer) - owe(i.other)), share, i, true, SSR.gross);
      return finish(owe(i.payer), owe(i.payer), share, i, false, SSR.gross);
    }
    case "ms": {
      const base = i.payer * pick([0.14, 0.2, 0.22, 0.24, 0.26], i.children);
      return finish(base, base, share, i, false, SSR.net);
    }
    case "ak": {
      const pct = i.children <= 3 ? [0.2, 0.27, 0.33][i.children - 1] : 0.33 + 0.03 * (i.children - 3);
      if (i.overnights >= 110) {
        const t = i.overnights / 365;
        const net = i.payer * pct * 1.5 * (1 - t) - i.other * pct * 1.5 * t;
        return finish(i.payer * pct, Math.max(0, net), share, i, true, SSR.net);
      }
      return finish(i.payer * pct, i.payer * pct, share, i, false, SSR.net);
    }
    case "nd": {
      const base = i.payer * pick([0.21, 0.29, 0.35, 0.38, 0.41, 0.43], i.children);
      return finish(base, base, share, i, false, SSR.net);
    }
    case "ca": {
      // High earner = the parent with the higher net income; H% = their timeshare.
      const payerHigh = i.payer >= i.other;
      const hn = payerHigh ? i.payer : i.other;
      const hPct = (payerHigh ? i.overnights : 365 - i.overnights) / 365;
      const tn = combined;
      const fraction =
        tn <= 2900 ? 0.165 + tn / 82857 : tn <= 5000 ? 0.131 + tn / 42149 : tn <= 10000 ? 0.25 : tn <= 15000 ? 0.1 + 1499 / tn : 0.12 + 1200 / tn;
      const k = (hPct <= 0.5 ? 1 + hPct : 2 - hPct) * fraction;
      const mult = [1, 1.6, 2, 2.3, 2.5, 2.625, 2.75, 2.813, 2.844, 2.86][Math.min(10, i.children) - 1];
      const cs = k * (hn - hPct * tn) * mult;
      // Positive: high earner pays; negative: the low earner pays.
      const payerPays = payerHigh ? Math.max(0, cs) : Math.max(0, -cs);
      return finish(Math.abs(cs), payerPays, share, i, i.overnights > 0, SSR.net);
    }
    default:
      return sharesModel(s, i);
  }
}

export const stateChildSupport = (s: CsState): CustomCalculator => (v) => stateModel(s, readInputs(v));

/** General calculator: income shares on gross income with the 1.5 cross-credit at 30% time. */
export const GENERAL_STATE: CsState = { name: "General", slug: "child-support-calculator", basis: "gross", model: "shares", shared: [110, 1.5], law: "income shares guidelines", endAge: 18 };
export const generalChildSupport: CustomCalculator = (v) => sharesModel(GENERAL_STATE, readInputs(v));

/** Canada: approximation of the federal provincial tables (annual payer income → monthly amount). */
const CA_1_CHILD: [number, number][] = [
  [12000, 0], [15000, 0.05], [20000, 0.086], [30000, 0.105], [50000, 0.11], [75000, 0.11], [100000, 0.107], [150000, 0.103], [300000, 0.095],
];
const CA_KIDS = [1, 1.64, 2.15, 2.55, 2.85, 3.1];
export const PROVINCE_FACTORS: Record<number, [string, number]> = {
  0: ["Ontario", 1], 1: ["Alberta", 1.03], 2: ["British Columbia", 1.02], 3: ["Quebec (federal table not used)", 1], 4: ["Manitoba", 1.01], 5: ["Saskatchewan", 1.02], 6: ["Nova Scotia", 1.0], 7: ["New Brunswick", 0.99], 8: ["Other province / territory", 1],
};
export const canadaChildSupport = (fixedProvince?: number): CustomCalculator => (v) => {
  const income = nonNeg(v.payingParentAnnualIncome);
  const prov = fixedProvince ?? Math.round(safeNumber(v.province));
  const factor = (PROVINCE_FACTORS[prov] ?? PROVINCE_FACTORS[8])[1];
  const monthly = (income * interp(CA_1_CHILD, income) * CA_KIDS[kidIndex(v.children)] * factor) / 12;
  const s7 = nonNeg(v.section7Expenses);
  const other = nonNeg(v.otherParentAnnualIncome);
  const s7Share = income + other > 0 ? s7 * (income / (income + other)) : 0;
  let table = monthly;
  // Shared parenting (40%+ time): set-off of both table amounts.
  const sharedTime = Math.min(365, nonNeg(v.payingParentOvernights)) >= 146;
  if (sharedTime) {
    const otherTable = (other * interp(CA_1_CHILD, other) * CA_KIDS[kidIndex(v.children)] * factor) / 12;
    table = Math.max(0, monthly - otherTable);
  }
  return {
    monthlyChildSupport: round2(table + s7Share),
    tableAmount: round2(monthly),
    section7Share: round2(s7Share),
    annualChildSupport: round2((table + s7Share) * 12),
    sharedParentingSetOff: sharedTime ? 1 : 0,
  };
};

/** UK Child Maintenance Service (weekly). */
export const ukChildMaintenance: CustomCalculator = (v) => {
  let weekly = Math.min(3000, nonNeg(v.grossWeeklyIncome));
  const kids = Math.min(3, Math.max(1, Math.round(nonNeg(v.children, 1))));
  const otherKids = Math.min(3, Math.round(nonNeg(v.otherChildrenInHousehold)));
  if (otherKids > 0) weekly *= 1 - [0, 0.11, 0.14, 0.16][otherKids];
  let amount = 0;
  let rate = "nil";
  if (weekly < 7) amount = 0;
  else if (weekly <= 100 || Math.round(safeNumber(v.onBenefits)) === 1) {
    amount = 7;
    rate = "flat";
  } else if (weekly < 200) {
    amount = 7 + (weekly - 100) * [0.17, 0.25, 0.31][kids - 1];
    rate = "reduced";
  } else {
    amount = Math.min(weekly, 800) * [0.12, 0.16, 0.19][kids - 1] + Math.max(0, weekly - 800) * [0.09, 0.12, 0.15][kids - 1];
    rate = weekly > 800 ? "basic plus" : "basic";
  }
  const nights = nonNeg(v.overnightsPerYear);
  let reduction = 0;
  if (rate !== "flat" && rate !== "nil") {
    if (nights >= 175) reduction = 0.5;
    else if (nights >= 156) reduction = 3 / 7;
    else if (nights >= 104) reduction = 2 / 7;
    else if (nights >= 52) reduction = 1 / 7;
  }
  let final = amount * (1 - reduction) - (nights >= 175 ? 7 * kids : 0);
  if (rate === "flat" && nights >= 52) final = 0;
  final = Math.max(rate === "nil" || (rate === "flat" && nights >= 52) ? 0 : 7, final);
  return {
    weeklyChildMaintenance: round2(final),
    monthlyChildMaintenance: round2((final * 52) / 12),
    annualChildMaintenance: round2(final * 52),
    sharedCareReductionPercent: round2(reduction * 100),
    rateBand: rate === "nil" ? 0 : rate === "flat" ? 1 : rate === "reduced" ? 2 : rate === "basic" ? 3 : 4,
  };
};

/** Proportional support (no statutory table): child's monthly needs shared by income. */
export const proportionalSupport: CustomCalculator = (v) => {
  const a = nonNeg(v.payingParentIncome);
  const b = nonNeg(v.otherParentIncome);
  const needs = nonNeg(v.childMonthlyNeeds) * Math.max(1, Math.round(nonNeg(v.children, 1)));
  const share = a + b > 0 ? a / (a + b) : 1;
  const support = needs * share;
  return {
    monthlyChildSupport: round2(support),
    payingParentSharePercent: round2(share * 100),
    totalChildNeeds: round2(needs),
    percentOfPayerIncome: round2(a > 0 ? (support / a) * 100 : 0),
  };
};

/** Arrears: missed support plus simple interest. */
export const childSupportArrears: CustomCalculator = (v) => {
  const owedMonthly = nonNeg(v.monthlySupportOrdered);
  const months = nonNeg(v.monthsUnpaid);
  const paid = nonNeg(v.totalPaid);
  const principal = Math.max(0, owedMonthly * months - paid);
  const rate = nonNeg(v.interestRatePercent) / 100;
  // Each missed month accrues simple interest from its due date: average age = months / 2.
  const interest = principal * rate * (months / 2 / 12);
  const extra = nonNeg(v.extraMonthlyPayment);
  const totalDue = principal + interest;
  const payoffMonths = extra > 0 ? totalDue / extra : 0;
  return {
    totalArrears: round2(totalDue),
    unpaidSupport: round2(principal),
    interest: round2(interest),
    monthsToPayOff: round2(payoffMonths),
    totalMonthlyPayment: round2(owedMonthly + extra),
  };
};

/** Parenting time from a regular schedule plus holidays and summer. */
export const SCHEDULES: [string, number][] = [
  ["Every other weekend (Fri–Sun, 2 nights)", 52],
  ["Every other weekend (Fri–Mon, 3 nights)", 78],
  ["Every other weekend + one midweek overnight", 104],
  ["Every other weekend + two midweek overnights", 156],
  ["2-2-3 / 2-2-5-5 / week on–week off (50/50)", 182.5],
  ["60/40 (e.g. 4-3 rotation)", 146],
  ["70/30 (every weekend Fri–Sun)", 104],
  ["No regular overnights", 0],
];
export const parentingTime: CustomCalculator = (v) => {
  const idx = Math.min(SCHEDULES.length - 1, Math.max(0, Math.round(safeNumber(v.schedule))));
  const base = SCHEDULES[idx][1];
  // Summer weeks and holidays replace the regular schedule for those nights.
  const summerWeeks = Math.min(12, nonNeg(v.summerWeeks));
  const summerExtra = summerWeeks * 7 - summerWeeks * 7 * (base / 365);
  const holiday = Math.min(60, nonNeg(v.extraHolidayNights));
  const total = Math.min(365, base + summerExtra + holiday);
  return {
    overnightsPerYear: round2(total),
    parentingTimePercent: round2((total / 365) * 100),
    otherParentOvernights: round2(365 - total),
    regularScheduleOvernights: base,
    overnightsPerMonth: round2(total / 12),
  };
};

/** Years until child support ends at the state's age (with an optional high-school extension). */
export const emancipation: CustomCalculator = (v) => {
  const age = nonNeg(v.childAgeYears) + nonNeg(v.childAgeMonths) / 12;
  const end = nonNeg(v.endAge, 18) + (Math.round(safeNumber(v.highSchoolExtension)) === 1 ? nonNeg(v.extensionMonths, 12) / 12 : 0);
  const years = Math.max(0, end - age);
  const monthly = nonNeg(v.monthlySupport);
  return {
    yearsUntilSupportEnds: round2(years),
    monthsUntilSupportEnds: Math.round(years * 12),
    supportEndAge: round2(end),
    remainingSupportTotal: round2(monthly * Math.round(years * 12)),
  };
};

export const lawCsCustomCalculators: Record<string, CustomCalculator> = {
  ...Object.fromEntries(CS_STATES.map((s) => [s.slug, stateChildSupport(s)])),
  "child-support-calculator": generalChildSupport,
  "canada-child-support-calculator": canadaChildSupport(),
  "ontario-child-support-calculator": canadaChildSupport(0),
  "alberta-child-support-calculator": canadaChildSupport(1),
  "british-columbia-child-support-calculator": canadaChildSupport(2),
  "uk-child-maintenance-calculator": ukChildMaintenance,
  "philippines-child-support-calculator": proportionalSupport,
  "child-support-arrears-calculator": childSupportArrears,
  "custody-parenting-time-calculator": parentingTime,
  "child-support-end-date-calculator": emancipation,
};
