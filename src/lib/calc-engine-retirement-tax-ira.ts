/**
 * Batch: "Retirement Calculators" sub-batch C (Retirement Tax, RMDs & IRAs,
 * 9 tools). Part of the Retirement Calculators build-out — see
 * calc-engine-retirement-planning.ts for the full list of 7 sub-batches.
 * Filed under Finance Calculators > Retirement Calculators.
 *
 * US federal rules for tax year 2026, from official sources:
 *  - Tax brackets and standard deduction: IRS Rev. Proc. 2025-32 (single
 *    $16,100 / joint $32,200; extra $2,050 unmarried or $1,650 per married
 *    person aged 65+).
 *  - Senior deduction (2025–2028, One Big Beautiful Bill Act): $6,000 per
 *    person aged 65+, reduced by 6% of MAGI over $75,000 ($150,000 joint).
 *  - Taxable Social Security: IRC §86 thresholds ($25,000/$34,000 single,
 *    $32,000/$44,000 joint — not inflation-indexed).
 *  - IRA limits (IRS Notice 2025-67): $7,500 + $1,100 catch-up at 50+.
 *    Traditional IRA deduction phase-outs when covered by a workplace plan:
 *    $81,000–$91,000 single, $129,000–$149,000 joint; spouse-covered only:
 *    $242,000–$252,000. Roth IRA phase-outs: $153,000–$168,000 single,
 *    $242,000–$252,000 joint.
 *  - RMDs: Uniform Lifetime Table and Single Life Table from Treas. Reg.
 *    §1.401(a)(9)-9 (the 2022 tables). RMDs start at 73 (75 if born 1960 or
 *    later) under SECURE 2.0.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - retirementTaxCalculator: a full 2026 retiree return — taxable Social
 *    Security, the 65+ extra standard deduction and the $6,000 senior
 *    deduction. (retirement-income-tax-calculator under Tax applies brackets
 *    to a single income figure only.)
 *  - retirementTaxBracketCalculator: which bracket you're in and how much
 *    more income (e.g. an IRA withdrawal) fits before the next one.
 *  - rothConversionCalculator: tax now vs later on a conversion, and the
 *    future tax rate at which converting breaks even.
 *  - rmdCalculator: the owner's own RMD (Uniform Lifetime Table).
 *  - inheritedIraRmdCalculator: a beneficiary's RMD (Single Life Table) and
 *    the SECURE Act 10-year deadline.
 *  - traditionalIraCalculator: how much of a contribution is DEDUCTIBLE.
 *  - iraContributionCalculator: how much you may put into a Roth vs a
 *    traditional IRA at your income. (ira-calculator / roth-ira-calculator
 *    project balances.)
 *  - iraGrowthCalculator: maxing out each year, with the age-50 catch-up
 *    added automatically.
 *  - iraWithdrawalCalculator: tax, state tax and the 10% early penalty on a
 *    withdrawal — including Roth contributions coming out tax-free first.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-retirement-tax-ira-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 2026 federal figures ----------------------------------------------------
const BRACKETS_2026: Record<1 | 2, [number, number][]> = {
  // [upper edge of bracket, rate]; filing status 1 = single, 2 = married filing jointly
  1: [
    [12400, 0.1],
    [50400, 0.12],
    [105700, 0.22],
    [201775, 0.24],
    [256225, 0.32],
    [640600, 0.35],
    [Infinity, 0.37],
  ],
  2: [
    [24800, 0.1],
    [100800, 0.12],
    [211400, 0.22],
    [403550, 0.24],
    [512450, 0.32],
    [768700, 0.35],
    [Infinity, 0.37],
  ],
};
const STANDARD_DEDUCTION_2026 = { 1: 16100, 2: 32200 } as const;
const EXTRA_65_DEDUCTION_2026 = { 1: 2050, 2: 1650 } as const;
const SENIOR_DEDUCTION = 6000;
const SENIOR_PHASEOUT_START = { 1: 75000, 2: 150000 } as const;
const SS_BASE = { 1: 25000, 2: 32000 } as const;
const SS_ADJUSTED_BASE = { 1: 34000, 2: 44000 } as const;
const IRA_LIMIT_2026 = 7500;
const IRA_CATCH_UP_2026 = 1100;

function status(v: number): 1 | 2 {
  return v >= 2 ? 2 : 1;
}

function federalTax(taxable: number, s: 1 | 2): number {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of BRACKETS_2026[s]) {
    if (taxable <= lower) break;
    tax += (Math.min(taxable, upper) - lower) * rate;
    lower = upper;
  }
  return tax;
}

function marginalBracket(taxable: number, s: 1 | 2): { rate: number; upper: number; nextRate: number } {
  const list = BRACKETS_2026[s];
  for (let k = 0; k < list.length; k++) {
    if (taxable < list[k][0]) return { rate: list[k][1], upper: list[k][0], nextRate: list[Math.min(k + 1, list.length - 1)][1] };
  }
  return { rate: 0.37, upper: Infinity, nextRate: 0.37 };
}

// IRS phase-out rule shared by IRA deduction and Roth limits: the limit is
// cut in proportion to how far MAGI is into the range, rounded UP to the
// next $10, and never below $200 until MAGI reaches the top of the range.
function phasedLimit(limit: number, magi: number, low: number, high: number): number {
  if (magi <= low) return limit;
  if (magi >= high) return 0;
  const reduced = Math.ceil((limit * (1 - (magi - low) / (high - low))) / 10) * 10;
  return Math.min(limit, Math.max(200, reduced));
}

// Treas. Reg. §1.401(a)(9)-9(c) Uniform Lifetime Table, ages 72–120.
const UNIFORM_LIFETIME: number[] = [
  27.4, 26.5, 25.5, 24.6, 23.7, 22.9, 22.0, 21.1, 20.2, 19.4, 18.5, 17.7, 16.8, 16.0, 15.2, 14.4, 13.7, 12.9, 12.2,
  11.5, 10.8, 10.1, 9.5, 8.9, 8.4, 7.8, 7.3, 6.8, 6.4, 6.0, 5.6, 5.2, 4.9, 4.6, 4.3, 4.1, 3.9, 3.7, 3.5, 3.4, 3.3,
  3.1, 3.0, 2.9, 2.8, 2.7, 2.5, 2.3, 2.0,
];
function uniformDivisor(age: number): number {
  if (age < 72) return 0;
  return UNIFORM_LIFETIME[Math.min(age, 120) - 72];
}

// Treas. Reg. §1.401(a)(9)-9(b) Single Life Table, ages 0–120.
const SINGLE_LIFE: number[] = [
  84.6, 83.7, 82.8, 81.8, 80.8, 79.8, 78.8, 77.9, 76.9, 75.9, 74.9, 73.9, 72.9, 71.9, 70.9, 69.9, 69.0, 68.0, 67.0,
  66.0, 65.0, 64.1, 63.1, 62.1, 61.1, 60.2, 59.2, 58.2, 57.3, 56.3, 55.3, 54.4, 53.4, 52.5, 51.5, 50.5, 49.6, 48.6,
  47.7, 46.7, 45.7, 44.8, 43.8, 42.9, 41.9, 41.0, 40.0, 39.0, 38.1, 37.1, 36.2, 35.3, 34.3, 33.4, 32.5, 31.6, 30.6,
  29.8, 28.9, 28.0, 27.1, 26.2, 25.4, 24.5, 23.7, 22.9, 22.0, 21.2, 20.4, 19.6, 18.8, 18.0, 17.2, 16.4, 15.6, 14.8,
  14.1, 13.3, 12.6, 11.9, 11.2, 10.5, 9.9, 9.3, 8.7, 8.1, 7.6, 7.1, 6.6, 6.1, 5.7, 5.3, 4.9, 4.6, 4.3, 4.0, 3.7,
  3.4, 3.2, 3.0, 2.8, 2.6, 2.5, 2.3, 2.2, 2.1, 2.1, 2.1, 2.0, 2.0, 2.0, 2.0, 2.0, 1.9, 1.9, 1.8, 1.8, 1.6, 1.4,
  1.1, 1.0,
];
function singleLife(age: number): number {
  return SINGLE_LIFE[Math.min(120, Math.max(0, Math.round(age)))];
}

// --- 1. Retirement Tax Calculator (2026 federal, retiree return) -----------
export const retirementTaxCalculator: CustomCalculator = (values) => {
  const s = status(safeNumber(values.filingStatus, 2));
  const peopleAge65Plus = Math.min(s === 2 ? 2 : 1, Math.max(0, Math.round(safeNumber(values.peopleAge65Plus, 2))));
  const socialSecurityAnnual = Math.max(0, safeNumber(values.socialSecurityAnnual, 42000));
  const pensionAndIraIncome = Math.max(0, safeNumber(values.pensionAndIraIncome, 50000));
  const otherTaxableIncome = Math.max(0, safeNumber(values.otherTaxableIncome, 5000));
  const taxExemptInterest = Math.max(0, safeNumber(values.taxExemptInterest, 0));

  // Taxable Social Security (IRS Pub. 915 worksheet logic).
  const provisional = pensionAndIraIncome + otherTaxableIncome + taxExemptInterest + socialSecurityAnnual / 2;
  const base = SS_BASE[s];
  const adjusted = SS_ADJUSTED_BASE[s];
  let taxableSs = 0;
  if (provisional > adjusted) {
    taxableSs = Math.min(
      0.85 * socialSecurityAnnual,
      0.85 * (provisional - adjusted) + Math.min(0.5 * socialSecurityAnnual, 0.5 * (adjusted - base))
    );
  } else if (provisional > base) {
    taxableSs = Math.min(0.5 * socialSecurityAnnual, 0.5 * (provisional - base));
  }

  const agi = pensionAndIraIncome + otherTaxableIncome + taxableSs;
  const standard = STANDARD_DEDUCTION_2026[s] + EXTRA_65_DEDUCTION_2026[s] * peopleAge65Plus;
  const seniorEach = Math.max(0, SENIOR_DEDUCTION - 0.06 * Math.max(0, agi - SENIOR_PHASEOUT_START[s]));
  const deductions = standard + seniorEach * peopleAge65Plus;
  const taxable = Math.max(0, agi - deductions);
  const tax = federalTax(taxable, s);
  const totalIncome = socialSecurityAnnual + pensionAndIraIncome + otherTaxableIncome + taxExemptInterest;

  return {
    federalIncomeTax: round2(tax),
    taxableSocialSecurity: round2(taxableSs),
    totalDeductions: round2(deductions),
    taxableIncome: round2(taxable),
    effectiveRateOnAllIncomePercent: totalIncome > 0 ? round2((tax / totalIncome) * 100) : 0,
    marginalRatePercent: round2(marginalBracket(taxable, s).rate * 100),
  };
};

// --- 2. Retirement Tax Bracket Calculator (room left in the bracket) -------
export const retirementTaxBracketCalculator: CustomCalculator = (values) => {
  const s = status(safeNumber(values.filingStatus, 2));
  const taxableIncome = Math.max(0, safeNumber(values.taxableIncome, 90000));

  const b = marginalBracket(taxableIncome, s);
  const tax = federalTax(taxableIncome, s);

  return {
    marginalRatePercent: round2(b.rate * 100),
    roomLeftInBracket: b.upper === Infinity ? 0 : round2(b.upper - taxableIncome),
    nextBracketRatePercent: round2(b.nextRate * 100),
    federalTax: round2(tax),
    effectiveRatePercent: taxableIncome > 0 ? round2((tax / taxableIncome) * 100) : 0,
  };
};

// --- 3. Roth Conversion Calculator -------------------------------------------
export const rothConversionCalculator: CustomCalculator = (values) => {
  const conversionAmount = Math.max(0, safeNumber(values.conversionAmount, 50000));
  const currentTaxRatePercent = Math.min(100, Math.max(0, safeNumber(values.currentTaxRatePercent, 22)));
  const futureTaxRatePercent = Math.min(100, Math.max(0, safeNumber(values.futureTaxRatePercent, 24)));
  const years = Math.max(0, Math.round(safeNumber(values.years, 20)));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 6));
  const sideFundTaxDragPercent = Math.min(100, Math.max(0, safeNumber(values.sideFundTaxDragPercent, 15)));

  // Tax on the conversion is paid now from money outside the IRA. If you
  // don't convert, that same money stays invested in a taxable account
  // whose growth is reduced by the tax-drag %.
  const r = annualReturnPercent / 100;
  const taxNow = (conversionAmount * currentTaxRatePercent) / 100;
  const grown = conversionAmount * Math.pow(1 + r, years);
  const rothValue = grown;
  const sideFund = taxNow * Math.pow(1 + r * (1 - sideFundTaxDragPercent / 100), years);
  const traditionalValue = grown * (1 - futureTaxRatePercent / 100) + sideFund;

  return {
    taxDueNow: round2(taxNow),
    rothValueAfterTax: round2(rothValue),
    traditionalValueAfterTax: round2(traditionalValue),
    conversionAdvantage: round2(rothValue - traditionalValue),
    breakEvenFutureTaxRatePercent: grown > 0 ? round2((sideFund / grown) * 100) : 0,
  };
};

// --- 4. RMD Calculator (owner, Uniform Lifetime Table) -----------------------
export const rmdCalculator: CustomCalculator = (values) => {
  const age = Math.max(60, Math.min(120, Math.round(safeNumber(values.age, 75))));
  const priorYearEndBalance = Math.max(0, safeNumber(values.priorYearEndBalance, 500000));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 5));

  // RMDs begin at 73 for anyone old enough to be asked this year.
  const divisor = age >= 73 ? uniformDivisor(age) : 0;
  const rmd = divisor > 0 ? priorYearEndBalance / divisor : 0;
  const nextBalance = (priorYearEndBalance - rmd) * (1 + annualReturnPercent / 100);
  const nextDivisor = uniformDivisor(Math.max(73, age + 1));

  return {
    requiredMinimumDistribution: round2(rmd),
    distributionPeriod: divisor,
    rmdPercentOfBalance: priorYearEndBalance > 0 ? round2((rmd / priorYearEndBalance) * 100) : 0,
    estimatedNextYearRmd: round2(nextDivisor > 0 ? nextBalance / nextDivisor : 0),
    monthlyIfSpreadEvenly: round2(rmd / 12),
  };
};

// --- 5. Inherited IRA RMD Calculator ------------------------------------------
export const inheritedIraRmdCalculator: CustomCalculator = (values) => {
  const priorYearEndBalance = Math.max(0, safeNumber(values.priorYearEndBalance, 200000));
  const ageInFirstYear = Math.max(0, Math.min(120, Math.round(safeNumber(values.ageInFirstYear, 50))));
  const yearNumber = Math.max(1, Math.round(safeNumber(values.yearNumber, 3)));
  // 1 = life expectancy ("stretch", eligible designated beneficiary)
  // 2 = 10-year rule with yearly RMDs (owner had already started RMDs)
  // 3 = 10-year rule, no yearly RMDs (owner died before their RMDs began)
  const rule = Math.min(3, Math.max(1, Math.round(safeNumber(values.rule, 2))));

  // Non-recalculating method: the first year's factor, minus 1 each year.
  const divisor = Math.max(0, singleLife(ageInFirstYear) - (yearNumber - 1));
  const tenYearDeadlineHit = rule !== 1 && yearNumber >= 10;
  let rmd = 0;
  if (tenYearDeadlineHit || (rule !== 3 && divisor <= 1)) rmd = priorYearEndBalance;
  else if (rule !== 3) rmd = priorYearEndBalance / divisor;
  const yearsLeft = rule === 1 ? Math.max(1, Math.ceil(divisor)) : Math.max(1, 10 - yearNumber + 1);

  return {
    requiredDistributionThisYear: round2(rmd),
    lifeExpectancyFactor: round2(divisor),
    yearsLeftToEmptyAccount: yearsLeft,
    evenWithdrawalToEmptyOnTime: round2(priorYearEndBalance / yearsLeft),
  };
};

// --- 6. Traditional IRA Calculator (2026 deductible amount) ---------------
export const traditionalIraCalculator: CustomCalculator = (values) => {
  const s = status(safeNumber(values.filingStatus, 1));
  // 0 = no workplace plan, 1 = you're covered, 2 = only your spouse is covered
  const coverage = Math.min(2, Math.max(0, Math.round(safeNumber(values.coverage, 1))));
  const magi = Math.max(0, safeNumber(values.magi, 85000));
  const age = Math.max(0, Math.round(safeNumber(values.age, 45)));
  const plannedContribution = Math.max(0, safeNumber(values.plannedContribution, 7500));
  const earnedIncome = Math.max(0, safeNumber(values.earnedIncome, 85000));
  const marginalRatePercent = Math.max(0, safeNumber(values.marginalRatePercent, 22));

  const limit = Math.min(earnedIncome, IRA_LIMIT_2026 + (age >= 50 ? IRA_CATCH_UP_2026 : 0));
  const contribution = Math.min(plannedContribution, limit);
  let deductibleLimit = limit;
  if (coverage === 1) deductibleLimit = s === 2 ? phasedLimit(limit, magi, 129000, 149000) : phasedLimit(limit, magi, 81000, 91000);
  else if (coverage === 2 && s === 2) deductibleLimit = phasedLimit(limit, magi, 242000, 252000);
  const deductible = Math.min(contribution, deductibleLimit);

  return {
    deductibleAmount: round2(deductible),
    maxContribution: round2(limit),
    nonDeductibleAmount: round2(contribution - deductible),
    taxSavingsThisYear: round2((deductible * marginalRatePercent) / 100),
  };
};

// --- 7. IRA Contribution Calculator (Roth vs traditional room) -------------
export const iraContributionCalculator: CustomCalculator = (values) => {
  const s = status(safeNumber(values.filingStatus, 1));
  const magi = Math.max(0, safeNumber(values.magi, 160000));
  const age = Math.max(0, Math.round(safeNumber(values.age, 52)));
  const earnedIncome = Math.max(0, safeNumber(values.earnedIncome, 160000));

  const baseLimit = IRA_LIMIT_2026 + (age >= 50 ? IRA_CATCH_UP_2026 : 0);
  const total = Math.min(baseLimit, earnedIncome);
  const rothLimit = s === 2 ? phasedLimit(baseLimit, magi, 242000, 252000) : phasedLimit(baseLimit, magi, 153000, 168000);
  const roth = Math.min(total, rothLimit);

  return {
    maxRothContribution: round2(roth),
    maxTotalIraContribution: round2(total),
    remainderForTraditionalIra: round2(total - roth),
    rothLimitReducedByPercent: baseLimit > 0 ? round2((1 - rothLimit / baseLimit) * 100) : 0,
  };
};

// --- 8. IRA Growth Calculator (max out yearly, catch-up at 50) ------------
export const iraGrowthCalculator: CustomCalculator = (values) => {
  const currentAge = Math.max(18, Math.round(safeNumber(values.currentAge, 35)));
  const retirementAge = Math.max(currentAge, Math.round(safeNumber(values.retirementAge, 65)));
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 20000));
  const annualContribution = Math.max(0, safeNumber(values.annualContribution, 7500));
  const addCatchUp = safeNumber(values.addCatchUp, 1) >= 1;
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 6));

  const r = annualReturnPercent / 100;
  let balance = currentBalance;
  let contributed = 0;
  let catchUps = 0;
  for (let age = currentAge; age < retirementAge; age++) {
    const catchUp = addCatchUp && age >= 50 ? IRA_CATCH_UP_2026 : 0;
    balance = balance * (1 + r) + annualContribution + catchUp;
    contributed += annualContribution + catchUp;
    catchUps += catchUp;
  }

  return {
    balanceAtRetirement: round2(balance),
    totalContributed: round2(contributed),
    investmentGrowth: round2(balance - currentBalance - contributed),
    catchUpContributionsTotal: round2(catchUps),
  };
};

// --- 9. IRA Withdrawal Calculator (tax + early penalty) --------------------
export const iraWithdrawalCalculator: CustomCalculator = (values) => {
  // 1 = Traditional IRA, 2 = Roth IRA
  const accountType = Math.round(safeNumber(values.accountType, 1)) === 2 ? 2 : 1;
  const amount = Math.max(0, safeNumber(values.amount, 20000));
  const age = Math.max(0, safeNumber(values.age, 52));
  const rothContributionBasis = Math.max(0, safeNumber(values.rothContributionBasis, 15000));
  const federalRatePercent = Math.max(0, safeNumber(values.federalRatePercent, 22));
  const stateRatePercent = Math.max(0, safeNumber(values.stateRatePercent, 5));

  const under595 = age < 59.5;
  // Roth: your own contributions come out first, always tax- and penalty-
  // free; earnings are taxed and penalized before 59½ (assumes the 5-year
  // rule is met once you're 59½).
  const taxable = accountType === 1 ? amount : under595 ? Math.max(0, amount - rothContributionBasis) : 0;
  const federal = (taxable * federalRatePercent) / 100;
  const state = (taxable * stateRatePercent) / 100;
  const penalty = under595 ? taxable * 0.1 : 0;
  const net = amount - federal - state - penalty;

  return {
    amountYouKeep: round2(net),
    federalTax: round2(federal),
    stateTax: round2(state),
    earlyWithdrawalPenalty: round2(penalty),
    totalCostPercent: amount > 0 ? round2(((amount - net) / amount) * 100) : 0,
  };
};

export const retirementTaxIraCustomCalculators: Record<string, CustomCalculator> = {
  "retirement-tax-calculator": retirementTaxCalculator,
  "retirement-tax-bracket-calculator": retirementTaxBracketCalculator,
  "roth-conversion-calculator": rothConversionCalculator,
  "rmd-calculator": rmdCalculator,
  "inherited-ira-rmd-calculator": inheritedIraRmdCalculator,
  "traditional-ira-calculator": traditionalIraCalculator,
  "ira-contribution-calculator": iraContributionCalculator,
  "ira-growth-calculator": iraGrowthCalculator,
  "ira-withdrawal-calculator": iraWithdrawalCalculator,
};
