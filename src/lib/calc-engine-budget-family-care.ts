/**
 * Batch: "Budget Calculators" (5 Oct 2026), sub-batch 5 of 12 — Family Care
 * (5 tools), filed under Budget Calculators > Household & Family Expense
 * Calculators. See calc-engine-budget-methods.ts for the full batch context.
 *
 *  - petOwnershipCostBudget: monthly, yearly, first-year and lifetime cost.
 *  - elderCareBudget: in-home aide (hourly), assisted living (monthly) or
 *    nursing home (daily), rising yearly, less any coverage.
 *  - singleParentBudget: income incl. child support vs costs; childcare
 *    share; emergency fund target.
 *  - divorceExpenseSplitBudget (incl. blended families): shared child costs
 *    split by income share; reimbursement owed.
 *  - homeOfficeUtilityCostSplit: business-use share of utilities, internet
 *    and housing; regular vs simplified ($5/sq ft, max 300) method.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-budget-family-care-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// --- 1. Pet Ownership Cost Budget Calculator -------------------------------------------
export const petOwnershipCostBudgetCalculator: CustomCalculator = (values) => {
  const food = pos(values.food, 60);
  const insurance = pos(values.insurance, 40);
  const grooming = pos(values.grooming, 30);
  const supplies = pos(values.supplies, 20);
  const vetYearly = pos(values.vetYearly, 400);
  const upfront = pos(values.upfront, 600);
  const lifespanYears = Math.max(1, pos(values.lifespanYears, 12));

  const monthly = food + insurance + grooming + supplies + vetYearly / 12;
  const yearly = monthly * 12;

  return {
    monthlyCost: round2(monthly),
    yearlyCost: round2(yearly),
    firstYearCost: round2(yearly + upfront),
    lifetimeCost: round2(yearly * lifespanYears + upfront),
  };
};

// --- 2. Elder Care Budget Calculator ---------------------------------------------------
export const elderCareBudgetCalculator: CustomCalculator = (values) => {
  const raw = Math.round(safeNumber(values.careType, 1));
  const careType = [1, 2, 3].includes(raw) ? raw : 1;
  const hourlyRate = pos(values.hourlyRate, 34);
  const hoursPerWeek = pos(values.hoursPerWeek, 20);
  const assistedMonthly = pos(values.assistedMonthly, 5900);
  const nursingDaily = pos(values.nursingDaily, 320);
  const coverageMonthly = pos(values.coverageMonthly, 0);
  const years = Math.max(0, pos(values.years, 3));
  const inflationPercent = safeNumber(values.inflationPercent, 4);

  const monthly = careType === 1 ? (hourlyRate * hoursPerWeek * 52) / 12 : careType === 2 ? assistedMonthly : (nursingDaily * 365) / 12;
  const net = Math.max(0, monthly - coverageMonthly);
  let total = 0;
  for (let y = 0; y < Math.ceil(years); y++) {
    const share = Math.min(1, years - y);
    total += net * 12 * share * Math.pow(1 + inflationPercent / 100, y);
  }

  return {
    monthlyCost: round2(monthly),
    monthlyAfterCoverage: round2(net),
    yearlyCost: round2(net * 12),
    totalCostOverYears: round2(total),
  };
};

// --- 3. Single-Parent Budget Calculator ------------------------------------------------
export const singleParentBudgetCalculator: CustomCalculator = (values) => {
  const income = pos(values.income, 4200);
  const childSupport = pos(values.childSupport, 600);
  const otherBenefits = pos(values.otherBenefits, 0);
  const housing = pos(values.housing, 1500);
  const childcare = pos(values.childcare, 900);
  const food = pos(values.food, 700);
  const other = pos(values.other, 1200);
  const emergencyMonths = pos(values.emergencyMonths, 6);

  const totalIncome = income + childSupport + otherBenefits;
  const expenses = housing + childcare + food + other;

  return {
    totalIncome: round2(totalIncome),
    totalExpenses: round2(expenses),
    surplusOrDeficit: round2(totalIncome - expenses),
    childcareShare: round2(totalIncome > 0 ? (childcare / totalIncome) * 100 : 0),
    emergencyFundTarget: round2(expenses * emergencyMonths),
  };
};

// --- 4. Divorce Expense Split Budget Calculator ----------------------------------------
export const divorceExpenseSplitBudgetCalculator: CustomCalculator = (values) => {
  const incomeA = pos(values.incomeA, 6000);
  const incomeB = pos(values.incomeB, 3000);
  const sharedChildCosts = pos(values.sharedChildCosts, 1500);
  const paidByA = pos(values.paidByA, 1500);

  const total = incomeA + incomeB;
  const shareA = total > 0 ? incomeA / total : 0.5;
  const owesA = sharedChildCosts * shareA;
  const owesB = sharedChildCosts - owesA;
  // positive: B reimburses A; negative: A reimburses B
  const reimburse = paidByA - owesA;

  return {
    parentAShare: round2(shareA * 100),
    parentAPortion: round2(owesA),
    parentBPortion: round2(owesB),
    parentBOwesParentA: round2(reimburse),
    yearlySharedCosts: round2(sharedChildCosts * 12),
  };
};

// --- 5. Home Office Utility Cost Split Calculator --------------------------------------
export const homeOfficeUtilityCostSplitCalculator: CustomCalculator = (values) => {
  const homeSqFt = Math.max(1, pos(values.homeSqFt, 2000));
  const officeSqFt = pos(values.officeSqFt, 200);
  const yearlyUtilities = pos(values.yearlyUtilities, 4200);
  const yearlyInternet = pos(values.yearlyInternet, 840);
  const internetBusinessPercent = Math.min(100, pos(values.internetBusinessPercent, 50));
  const yearlyHousing = pos(values.yearlyHousing, 18000);
  const yearlyInsurance = pos(values.yearlyInsurance, 1500);

  const share = Math.min(1, officeSqFt / homeSqFt);
  const utilities = yearlyUtilities * share;
  const internet = (yearlyInternet * internetBusinessPercent) / 100;
  const housing = (yearlyHousing + yearlyInsurance) * share;
  const regular = utilities + internet + housing;

  return {
    businessUsePercent: round2(share * 100),
    utilitiesShare: round2(utilities),
    internetShare: round2(internet),
    housingAndInsuranceShare: round2(housing),
    regularMethodTotal: round2(regular),
    simplifiedMethodTotal: round2(Math.min(300, officeSqFt) * 5),
  };
};

export const budgetFamilyCareCustomCalculators: Record<string, CustomCalculator> = {
  "pet-ownership-cost-budget-calculator": petOwnershipCostBudgetCalculator,
  "elder-care-budget-calculator": elderCareBudgetCalculator,
  "single-parent-budget-calculator": singleParentBudgetCalculator,
  "divorce-expense-split-budget-calculator": divorceExpenseSplitBudgetCalculator,
  "home-office-utility-cost-split-calculator": homeOfficeUtilityCostSplitCalculator,
};
