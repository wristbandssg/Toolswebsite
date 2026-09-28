/**
 * Batch: "Retirement Calculators" sub-batch D (Workplace Plans, 9 tools).
 * Part of the Retirement Calculators build-out — see
 * calc-engine-retirement-planning.ts for the full list of 7 sub-batches.
 * Filed under Finance Calculators > Retirement Calculators.
 *
 * 2026 IRS limits (IRS news release and Notice 2025-67):
 *  - 401(k)/403(b)/governmental 457(b) elective deferrals: $24,500.
 *  - Age-50+ catch-up: $8,000; ages 60–63 (SECURE 2.0): $11,250 instead.
 *  - SIMPLE IRA: $17,000; catch-up $4,000 (50+), $5,250 at ages 60–63.
 *  - Defined contribution annual additions (415(c), caps a SEP): $72,000.
 *  - Compensation limit (401(a)(17)): $360,000.
 *  - Social Security wage base (for SE tax): $184,500 (SSA).
 *  - 403(b) 15-year catch-up: up to $3,000 a year, $15,000 lifetime.
 *  - 457(b) special catch-up (final 3 years before normal retirement age):
 *    up to twice the regular limit, using under-used prior limits; can't be
 *    combined with the age-50 catch-up in the same year.
 *
 * Near-namesakes, and how each is deliberately different (401k-calculator
 * already projects a balance with a single-tier match at a flat salary):
 *  - fourOhOneKContributionCalculator: your 2026 contribution vs the IRS
 *    limit — per paycheck, % needed to max out, and room left.
 *  - fourOhOneKGrowthCalculator: auto-escalation (contribution % rising 1%
 *    a year to a cap), salary raises and plan fees.
 *  - fourOhOneKMatchCalculator: a TWO-tier match formula (e.g. 100% of the
 *    first 3% + 50% of the next 2%) and match you're leaving unclaimed.
 *  - fourOhOneKWithdrawalCalculator: early withdrawal with the Rule of 55
 *    and the mandatory 20% federal withholding.
 *  - fourOhOneKRolloverCalculator: leave it vs roll to an IRA vs cash out.
 *  - fourOhThreeBCalculator: the 403(b) 15-year catch-up on top of the
 *    regular and age-50 limits.
 *  - fourFiftySevenBCalculator: the 457(b) final-3-years special catch-up.
 *  - sepIraCalculator: self-employed contribution from net profit (after
 *    half of self-employment tax), or 25% of W-2 wages.
 *  - simpleIraCalculator: SIMPLE deferral limits plus the employer's 3%
 *    match or 2% non-elective contribution.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-retirement-workplace-plans-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const DEFERRAL_LIMIT_2026 = 24500;
const CATCH_UP_50_2026 = 8000;
const CATCH_UP_60_63_2026 = 11250;
const SIMPLE_LIMIT_2026 = 17000;
const SIMPLE_CATCH_UP_50_2026 = 4000;
const SIMPLE_CATCH_UP_60_63_2026 = 5250;
const ANNUAL_ADDITIONS_LIMIT_2026 = 72000;
const COMPENSATION_LIMIT_2026 = 360000;
const SS_WAGE_BASE_2026 = 184500;

// Age-based catch-up for 401(k)/403(b)/457(b): the higher amount applies to
// anyone who turns 60, 61, 62 or 63 during the year.
function catchUp(age: number): number {
  if (age >= 60 && age <= 63) return CATCH_UP_60_63_2026;
  return age >= 50 ? CATCH_UP_50_2026 : 0;
}

function simpleCatchUp(age: number): number {
  if (age >= 60 && age <= 63) return SIMPLE_CATCH_UP_60_63_2026;
  return age >= 50 ? SIMPLE_CATCH_UP_50_2026 : 0;
}

// Future value of `pmt` deposited at the END of each of `n` periods at
// periodic rate `i`.
function fvAnnuity(pmt: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? pmt * n : (pmt * (Math.pow(1 + i, n) - 1)) / i;
}

// --- 1. 401(k) Contribution Calculator (vs the 2026 limit) ---------------
export const fourOhOneKContributionCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 85000));
  const contributionPercent = Math.max(0, safeNumber(values.contributionPercent, 10));
  const age = Math.max(0, Math.round(safeNumber(values.age, 45)));
  const payPeriods = Math.max(1, safeNumber(values.payPeriods, 26));
  const marginalRatePercent = Math.max(0, safeNumber(values.marginalRatePercent, 22));

  const limit = Math.min(annualSalary, DEFERRAL_LIMIT_2026 + catchUp(age));
  const wanted = (annualSalary * contributionPercent) / 100;
  const contribution = Math.min(wanted, limit);

  return {
    yourAnnualContribution: round2(contribution),
    perPaycheck: round2(contribution / payPeriods),
    yourLimitFor2026: round2(limit),
    percentNeededToMaxOut: annualSalary > 0 ? round2((limit / annualSalary) * 100) : 0,
    roomLeftUnderLimit: round2(limit - contribution),
    taxSavedNow: round2((contribution * marginalRatePercent) / 100),
  };
};

// --- 2. 401(k) Growth Calculator (auto-escalation, raises, fees) ----------
export const fourOhOneKGrowthCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 30000));
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 70000));
  const startPercent = Math.max(0, safeNumber(values.startPercent, 6));
  const escalationPercent = Math.max(0, safeNumber(values.escalationPercent, 1));
  const maxPercent = Math.max(0, safeNumber(values.maxPercent, 15));
  const employerPercent = Math.max(0, safeNumber(values.employerPercent, 4));
  const salaryGrowthPercent = Math.max(0, safeNumber(values.salaryGrowthPercent, 3));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 7));
  const feePercent = Math.max(0, safeNumber(values.feePercent, 0.5));
  const years = Math.max(0, Math.round(safeNumber(values.years, 30)));

  const i = (annualReturnPercent - feePercent) / 100 / 12;
  let balance = currentBalance;
  let salary = annualSalary;
  const cap = Math.max(startPercent, maxPercent);
  let pct = startPercent;
  let you = 0;
  let employer = 0;
  for (let y = 0; y < years; y++) {
    if (y > 0) {
      salary *= 1 + salaryGrowthPercent / 100;
      pct = Math.min(cap, pct + escalationPercent);
    }
    const monthlyYou = (salary * pct) / 100 / 12;
    const monthlyEmployer = (salary * employerPercent) / 100 / 12;
    for (let m = 0; m < 12; m++) balance = balance * (1 + i) + monthlyYou + monthlyEmployer;
    you += monthlyYou * 12;
    employer += monthlyEmployer * 12;
  }

  return {
    projectedBalance: round2(balance),
    yourContributions: round2(you),
    employerContributions: round2(employer),
    finalContributionPercent: round2(years > 0 ? pct : startPercent),
    finalSalary: round2(salary),
  };
};

// --- 3. 401(k) Match Calculator (two-tier formula) ------------------------
export const fourOhOneKMatchCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.min(COMPENSATION_LIMIT_2026, Math.max(0, safeNumber(values.annualSalary, 75000)));
  const yourPercent = Math.max(0, safeNumber(values.yourPercent, 4));
  const tier1MatchPercent = Math.max(0, safeNumber(values.tier1MatchPercent, 100));
  const tier1UpToPercent = Math.max(0, safeNumber(values.tier1UpToPercent, 3));
  const tier2MatchPercent = Math.max(0, safeNumber(values.tier2MatchPercent, 50));
  const tier2NextPercent = Math.max(0, safeNumber(values.tier2NextPercent, 2));

  const matchPct = (p: number) =>
    Math.min(p, tier1UpToPercent) * (tier1MatchPercent / 100) +
    Math.min(Math.max(0, p - tier1UpToPercent), tier2NextPercent) * (tier2MatchPercent / 100);
  const yours = matchPct(yourPercent);
  const max = matchPct(tier1UpToPercent + tier2NextPercent);

  return {
    employerMatchPerYear: round2((annualSalary * yours) / 100),
    matchAsPercentOfSalary: round2(yours),
    contributeThisMuchForFullMatchPercent: round2(tier1UpToPercent + tier2NextPercent),
    maximumPossibleMatch: round2((annualSalary * max) / 100),
    matchLeftUnclaimed: round2((annualSalary * (max - yours)) / 100),
  };
};

// --- 4. 401(k) Withdrawal Calculator (Rule of 55, 20% withholding) --------
export const fourOhOneKWithdrawalCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 30000));
  const age = Math.max(0, safeNumber(values.age, 56));
  const leftJobAt55OrLater = safeNumber(values.leftJobAt55OrLater, 1) >= 1;
  const federalRatePercent = Math.max(0, safeNumber(values.federalRatePercent, 22));
  const stateRatePercent = Math.max(0, safeNumber(values.stateRatePercent, 5));

  // Rule of 55: no 10% penalty on withdrawals from the plan of an employer
  // you left in or after the year you turned 55.
  const penaltyApplies = age < 59.5 && !leftJobAt55OrLater;
  const penalty = penaltyApplies ? amount * 0.1 : 0;
  const federal = (amount * federalRatePercent) / 100;
  const state = (amount * stateRatePercent) / 100;
  const withheld = amount * 0.2;

  return {
    amountYouKeep: round2(amount - federal - state - penalty),
    earlyWithdrawalPenalty: round2(penalty),
    federalTax: round2(federal),
    stateTax: round2(state),
    federalWithheldUpFront: round2(withheld),
    // Positive = more to pay at tax time; negative = refund of over-withholding.
    federalOwedAtTaxTime: round2(federal + penalty - withheld),
  };
};

// --- 5. 401(k) Rollover Calculator (leave vs IRA vs cash out) -------------
export const fourOhOneKRolloverCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 80000));
  const years = Math.max(0, Math.round(safeNumber(values.years, 20)));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 7));
  const oldPlanFeePercent = Math.max(0, safeNumber(values.oldPlanFeePercent, 0.9));
  const iraFeePercent = Math.max(0, safeNumber(values.iraFeePercent, 0.2));
  const age = Math.max(0, safeNumber(values.age, 40));
  const taxRatePercent = Math.max(0, safeNumber(values.taxRatePercent, 24));
  const stateRatePercent = Math.max(0, safeNumber(values.stateRatePercent, 5));

  const grow = (fee: number) => balance * Math.pow(1 + (annualReturnPercent - fee) / 100, years);
  const leave = grow(oldPlanFeePercent);
  const ira = grow(iraFeePercent);
  const penalty = age < 59.5 ? 0.1 : 0;
  const cashNow = balance * (1 - taxRatePercent / 100 - stateRatePercent / 100 - penalty);

  return {
    rolloverToIraValue: round2(ira),
    leaveInOldPlanValue: round2(leave),
    rolloverAdvantage: round2(ira - leave),
    cashOutNowAfterTaxAndPenalty: round2(Math.max(0, cashNow)),
    costOfCashingOut: round2(balance - Math.max(0, cashNow)),
  };
};

// --- 6. 403(b) Calculator (15-year catch-up) ------------------------------
export const fourOhThreeBCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 65000));
  const contributionPercent = Math.max(0, safeNumber(values.contributionPercent, 12));
  const age = Math.max(0, Math.round(safeNumber(values.age, 52)));
  const yearsOfService = Math.max(0, Math.round(safeNumber(values.yearsOfService, 16)));
  const fifteenYearCatchUpUsed = Math.min(15000, Math.max(0, safeNumber(values.fifteenYearCatchUpUsed, 0)));
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 90000));
  const yearsToRetirement = Math.max(0, Math.round(safeNumber(values.yearsToRetirement, 13)));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 6));

  const fifteenYear = yearsOfService >= 15 ? Math.min(3000, 15000 - fifteenYearCatchUpUsed) : 0;
  const limit = Math.min(annualSalary, DEFERRAL_LIMIT_2026 + fifteenYear + catchUp(age));
  const contribution = Math.min((annualSalary * contributionPercent) / 100, limit);
  const i = annualReturnPercent / 100 / 12;
  const n = yearsToRetirement * 12;
  const projected = currentBalance * Math.pow(1 + i, n) + fvAnnuity(contribution / 12, i, n);

  return {
    yourLimitFor2026: round2(limit),
    fifteenYearCatchUpAvailable: round2(fifteenYear),
    yourAnnualContribution: round2(contribution),
    projectedBalance: round2(projected),
  };
};

// --- 7. 457(b) Calculator (final-3-years special catch-up) -----------------
export const fourFiftySevenBCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 90000));
  const contributionPercent = Math.max(0, safeNumber(values.contributionPercent, 30));
  const age = Math.max(0, Math.round(safeNumber(values.age, 58)));
  const inFinalThreeYears = safeNumber(values.inFinalThreeYears, 1) >= 1;
  const underusedPriorLimits = Math.max(0, safeNumber(values.underusedPriorLimits, 40000));
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 120000));
  const yearsToRetirement = Math.max(0, Math.round(safeNumber(values.yearsToRetirement, 3)));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 6));

  const ageLimit = DEFERRAL_LIMIT_2026 + catchUp(age);
  const specialLimit = inFinalThreeYears ? DEFERRAL_LIMIT_2026 + Math.min(DEFERRAL_LIMIT_2026, underusedPriorLimits) : 0;
  // Use whichever catch-up gives the higher limit — they can't be combined.
  const limit = Math.min(annualSalary, Math.max(ageLimit, specialLimit));
  const contribution = Math.min((annualSalary * contributionPercent) / 100, limit);
  const i = annualReturnPercent / 100 / 12;
  const n = yearsToRetirement * 12;

  return {
    yourLimitFor2026: round2(limit),
    extraRoomFromSpecialCatchUp: round2(Math.max(0, specialLimit - ageLimit)),
    yourAnnualContribution: round2(contribution),
    projectedBalance: round2(currentBalance * Math.pow(1 + i, n) + fvAnnuity(contribution / 12, i, n)),
  };
};

// --- 8. SEP IRA Calculator -----------------------------------------------------
export const sepIraCalculator: CustomCalculator = (values) => {
  // 1 = self-employed (sole proprietor / single-member LLC), 2 = W-2 wages
  const businessType = Math.round(safeNumber(values.businessType, 1)) === 2 ? 2 : 1;
  const income = Math.max(0, safeNumber(values.income, 120000));
  const marginalRatePercent = Math.max(0, safeNumber(values.marginalRatePercent, 24));

  let contribution: number;
  let halfSeTax = 0;
  if (businessType === 1) {
    // Self-employment tax: 12.4% up to the wage base + 2.9% on all, on
    // 92.35% of net profit. Contribution = 20% of (profit − ½ SE tax),
    // which equals 25% of compensation for an owner.
    const seEarnings = income * 0.9235;
    const seTax = Math.min(seEarnings, SS_WAGE_BASE_2026) * 0.124 + seEarnings * 0.029;
    halfSeTax = seTax / 2;
    const base = Math.max(0, income - halfSeTax);
    contribution = Math.min(0.2 * base, 0.25 * COMPENSATION_LIMIT_2026, ANNUAL_ADDITIONS_LIMIT_2026);
  } else {
    contribution = Math.min(0.25 * Math.min(income, COMPENSATION_LIMIT_2026), ANNUAL_ADDITIONS_LIMIT_2026);
  }

  return {
    maxSepContribution: round2(contribution),
    shareOfIncomePercent: income > 0 ? round2((contribution / income) * 100) : 0,
    taxSaved: round2((contribution * marginalRatePercent) / 100),
    halfSelfEmploymentTaxDeduction: round2(halfSeTax),
  };
};

// --- 9. SIMPLE IRA Calculator ---------------------------------------------------
export const simpleIraCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 60000));
  const deferralPercent = Math.max(0, safeNumber(values.deferralPercent, 8));
  const age = Math.max(0, Math.round(safeNumber(values.age, 55)));
  // 1 = dollar-for-dollar match up to 3% of pay, 2 = 2% non-elective for all
  const employerOption = Math.round(safeNumber(values.employerOption, 1)) === 2 ? 2 : 1;

  const limit = Math.min(annualSalary, SIMPLE_LIMIT_2026 + simpleCatchUp(age));
  const you = Math.min((annualSalary * deferralPercent) / 100, limit);
  const employer = employerOption === 1 ? Math.min(you, annualSalary * 0.03) : 0.02 * Math.min(annualSalary, COMPENSATION_LIMIT_2026);

  return {
    totalAnnualContribution: round2(you + employer),
    yourContribution: round2(you),
    employerContribution: round2(employer),
    yourLimitFor2026: round2(limit),
    perBiweeklyPaycheck: round2(you / 26),
  };
};

export const retirementWorkplacePlansCustomCalculators: Record<string, CustomCalculator> = {
  "401k-contribution-calculator": fourOhOneKContributionCalculator,
  "401k-growth-calculator": fourOhOneKGrowthCalculator,
  "401k-match-calculator": fourOhOneKMatchCalculator,
  "401k-withdrawal-calculator": fourOhOneKWithdrawalCalculator,
  "401k-rollover-calculator": fourOhOneKRolloverCalculator,
  "403b-calculator": fourOhThreeBCalculator,
  "457b-calculator": fourFiftySevenBCalculator,
  "sep-ira-calculator": sepIraCalculator,
  "simple-ira-calculator": simpleIraCalculator,
};
