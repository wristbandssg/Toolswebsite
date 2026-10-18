/**
 * Batch: "Law & Government Calculators" → Military & Veterans Calculators —
 * pay & allowances (11 tools).
 *
 * Data (2026):
 *  - MIL_PAY_2026: monthly basic pay by grade and years of service after the
 *    3.8% raise of 1 Jan 2026 (FY2026 NDAA), rounded to the dollar. O-7 to
 *    O-10 are capped at Executive Schedule Level II ($18,999.90/month).
 *  - BAS 2026: $476.95 enlisted, $328.48 officer; BAS II $953.90.
 *  - 2026 HHS poverty guideline (48 states): $15,960 + $5,680 per extra
 *    person; Alaska $19,950 + $7,100; Hawaii $18,360 + $6,530.
 *  - CZTE officer cap: highest enlisted basic pay ($11,166.90 in 2026) plus
 *    hostile fire / imminent danger pay ($225).
 *
 * Near-namesakes, kept distinct on purpose:
 *  - military-pay-calculator: basic pay + BAH + BAS + other pays (cash).
 *  - rmc-calculator: Regular Military Compensation and the taxable civilian
 *    salary it equals (adds the tax advantage of untaxed allowances).
 *  - military-separation-pay-calculator: DoD separation pay (10% / 5%
 *    formula) — not the VA, not a bonus.
 *  - bonus-recoupment-calculator: the unearned part of a bonus you repay.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-law-mil-pay-calculators.ts for the copy.
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

export const BAS_2026 = { enlisted: 476.95, officer: 328.48, basII: 953.9 };
export const CZTE_OFFICER_CAP_2026 = 11166.9 + 225;

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

const isEnlisted = (grade: number) => gradeAt(grade)[1];

/** Military Pay Calculator: basic pay + BAH + BAS + other monthly pays. */
export const militaryPay: CustomCalculator = (v) => {
  const base = basicPay(v.grade, v.yearsOfService);
  const bas = isEnlisted(v.grade) ? BAS_2026.enlisted : BAS_2026.officer;
  const bah = nonNeg(v.monthlyBah);
  const other = nonNeg(v.otherMonthlyPay);
  const monthly = base + bah + bas + other;
  return {
    totalMonthlyPay: round2(monthly),
    monthlyBasicPay: round2(base),
    monthlyBas: bas,
    annualPay: round2(monthly * 12),
    annualBasicPay: round2(base * 12),
    taxFreeAllowancesPerYear: round2((bah + bas) * 12),
    payPerCheck: round2(monthly / 2),
  };
};

/** BAS Calculator. */
export const basAllowance: CustomCalculator = (v) => {
  const type = Math.round(safeNumber(v.memberType));
  const rate = type === 1 ? BAS_2026.officer : type === 2 ? BAS_2026.basII : BAS_2026.enlisted;
  const months = Math.min(12, nonNeg(v.months, 12));
  return {
    monthlyBas: rate,
    dailyBas: round2(rate / 30),
    basForPeriod: round2(rate * months),
    annualBas: round2(rate * 12),
  };
};

/** RMC Calculator: basic + BAH + BAS + federal tax advantage = civilian equivalent. */
export const rmc: CustomCalculator = (v) => {
  const base = nonNeg(v.monthlyBasicPay);
  const bah = nonNeg(v.monthlyBah);
  const bas = nonNeg(v.monthlyBas);
  const rate = Math.min(60, nonNeg(v.taxRatePercent)) / 100;
  const rmcAnnual = (base + bah + bas) * 12;
  const taxAdvantage = (bah + bas) * 12 * (rate / (1 - rate));
  return {
    civilianSalaryEquivalent: round2(rmcAnnual + taxAdvantage),
    annualRmc: round2(rmcAnnual),
    taxAdvantage: round2(taxAdvantage),
    taxFreeAllowances: round2((bah + bas) * 12),
    monthlyRmc: round2(rmcAnnual / 12),
  };
};

/** Drill Pay Calculator: 1 drill = 1/30 of monthly basic pay. */
export const drillPay: CustomCalculator = (v) => {
  const base = basicPay(v.grade, v.yearsOfService);
  const perDrill = base / 30;
  const drills = nonNeg(v.drillsPerMonth, 4);
  const atDays = nonNeg(v.annualTrainingDays, 14);
  const monthly = perDrill * drills;
  const at = perDrill * atDays;
  return {
    annualDrillAndTrainingPay: round2(monthly * 12 + at),
    payPerDrill: round2(perDrill),
    payPerDrillWeekend: round2(perDrill * 4),
    monthlyDrillPay: round2(monthly),
    annualTrainingPay: round2(at),
  };
};

/** Deployment Pay Calculator. */
export const deploymentPay: CustomCalculator = (v) => {
  const months = nonNeg(v.months, 6);
  const base = nonNeg(v.monthlyBasicPay);
  const idp = v.hostileFire ? 225 : 0;
  const fsa = v.familySeparation ? 250 : 0;
  const hdp = Math.min(150, nonNeg(v.hardshipDutyPay));
  const other = nonNeg(v.otherMonthlyPay);
  const extraMonthly = idp + fsa + hdp + other;
  const taxablePay = base + idp + hdp + other;
  const excluded = v.combatZone ? (Math.round(safeNumber(v.officer)) === 1 ? Math.min(taxablePay, CZTE_OFFICER_CAP_2026) : taxablePay) : 0;
  const rate = Math.min(60, nonNeg(v.taxRatePercent)) / 100;
  return {
    extraPayForDeployment: round2(extraMonthly * months),
    extraPayPerMonth: round2(extraMonthly),
    taxFreeIncomePerMonth: round2(excluded),
    estimatedTaxSavings: round2(excluded * rate * months),
    totalPayForDeployment: round2((base + extraMonthly) * months),
  };
};

/** 2026 HHS poverty guideline for a household size (region 0 = 48 states, 1 = Alaska, 2 = Hawaii). */
export function povertyGuideline2026(size: number, region = 0): number {
  const [base, add] = region === 1 ? [19950, 7100] : region === 2 ? [18360, 6530] : [15960, 5680];
  return base + add * (Math.max(1, Math.round(nonNeg(size, 1))) - 1);
}

/** Basic Needs Allowance: tops gross household income up to 200% of the poverty guideline. */
export const basicNeedsAllowance: CustomCalculator = (v) => {
  const threshold = 2 * povertyGuideline2026(v.householdSize, Math.round(safeNumber(v.region)));
  const income = nonNeg(v.grossHouseholdIncome);
  const gap = Math.max(0, threshold - income);
  return {
    monthlyBna: round2(gap / 12),
    annualBna: round2(gap),
    incomeThreshold: threshold,
    incomeAsPercentOfThreshold: round2(threshold > 0 ? (income / threshold) * 100 : 0),
    eligible: gap > 0 ? 1 : 0,
  };
};

/** SRB Calculator: multiple × monthly basic pay × years of obligated service. */
export const srb: CustomCalculator = (v) => {
  const base = nonNeg(v.monthlyBasicPay);
  const years = Math.min(6, nonNeg(v.yearsReenlisting));
  const raw = base * nonNeg(v.multiple) * years;
  const cap = nonNeg(v.capAmount, 100000);
  const total = cap > 0 ? Math.min(raw, cap) : raw;
  const upfront = total * (Math.min(100, nonNeg(v.upfrontPercent, 50)) / 100);
  const yearsLeft = Math.max(0, years - 1);
  return {
    totalBonus: round2(total),
    upfrontPayment: round2(upfront),
    annualInstallment: round2(yearsLeft > 0 ? (total - upfront) / yearsLeft : 0),
    bonusBeforeCap: round2(raw),
    afterTaxUpfront: round2(upfront * (1 - Math.min(60, nonNeg(v.taxRatePercent)) / 100)),
  };
};

/** Continuation Pay: multiple (2.5–13, set by service) × monthly basic pay at 12 YOS. */
export const continuationPay: CustomCalculator = (v) => {
  const base = basicPay(v.grade, 12);
  const mult = Math.min(13, nonNeg(v.multiple, 2.5));
  const gross = base * mult;
  const rate = Math.min(60, nonNeg(v.taxRatePercent)) / 100;
  const lump = Math.round(safeNumber(v.installments, 1)) <= 1;
  const n = lump ? 1 : 4;
  return {
    continuationPay: round2(gross),
    monthlyBasicPayAt12: base,
    afterTaxAmount: round2(gross * (1 - rate)),
    perInstallment: round2(gross / n),
    installments: n,
  };
};

/** Separation pay: full 10%, half 5% × 12 × monthly basic pay × years. */
export const separationPay: CustomCalculator = (v) => {
  const base = nonNeg(v.monthlyBasicPay);
  const years = nonNeg(v.yearsOfService);
  const pct = Math.round(safeNumber(v.payType)) === 1 ? 0.05 : 0.1;
  const gross = pct * 12 * base * years;
  const fedTax = Math.min(60, nonNeg(v.taxRatePercent)) / 100;
  return {
    separationPay: round2(gross),
    afterTaxSeparationPay: round2(gross * (1 - fedTax)),
    federalWithholding: round2(gross * fedTax),
    meetsSixYearMinimum: years >= 6 ? 1 : 0,
  };
};

/** Bonus recoupment: unearned share of a bonus repaid when the obligation isn't completed. */
export const bonusRecoupment: CustomCalculator = (v) => {
  const bonus = nonNeg(v.bonusAmount);
  const total = Math.max(1, nonNeg(v.obligationMonths, 48));
  const served = Math.min(total, nonNeg(v.monthsServed));
  const unearned = bonus * ((total - served) / total);
  const paid = Math.min(bonus, nonNeg(v.amountPaidSoFar, bonus));
  return {
    amountToRepay: round2(Math.max(0, paid - (bonus - unearned))),
    earnedPortion: round2(bonus - unearned),
    unearnedPortion: round2(unearned),
    percentEarned: round2((served / total) * 100),
    monthsRemaining: round2(total - served),
  };
};

/** Savings Deposit Program: 10%/yr compounded quarterly on up to $10,000. */
export const savingsDepositProgram: CustomCalculator = (v) => {
  const monthly = nonNeg(v.monthlyDeposit);
  const initial = Math.min(10000, nonNeg(v.initialDeposit));
  const months = Math.round(Math.min(36, nonNeg(v.deploymentMonths, 9)));
  const after = Math.round(Math.min(3, nonNeg(v.monthsAfterReturn, 3)));
  let principal = initial;
  let balance = initial;
  let interest = 0;
  let accrued = 0;
  for (let m = 1; m <= months + after; m++) {
    // 10% a year accrues monthly on the balance; deposits count up to $10,000.
    accrued += balance * (0.1 / 12);
    if (m % 3 === 0 || m === months + after) {
      interest += accrued;
      balance += accrued;
      accrued = 0;
    }
    if (m <= months) {
      const add = Math.max(0, Math.min(monthly, 10000 - principal));
      principal += add;
      balance += add;
    }
  }
  return {
    finalBalance: round2(balance),
    totalInterest: round2(interest),
    totalDeposited: round2(principal),
    effectiveReturn: round2(principal > 0 ? (interest / principal) * 100 : 0),
  };
};

export const lawMilPayCustomCalculators: Record<string, CustomCalculator> = {
  "military-pay-calculator": militaryPay,
  "bas-calculator": basAllowance,
  "rmc-calculator": rmc,
  "drill-pay-calculator": drillPay,
  "deployment-pay-calculator": deploymentPay,
  "basic-needs-allowance-calculator": basicNeedsAllowance,
  "srb-calculator": srb,
  "continuation-pay-calculator": continuationPay,
  "military-separation-pay-calculator": separationPay,
  "bonus-recoupment-calculator": bonusRecoupment,
  "savings-deposit-program-calculator": savingsDepositProgram,
};
