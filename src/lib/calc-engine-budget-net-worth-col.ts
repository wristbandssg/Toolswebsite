/**
 * Batch: "Budget Calculators" (5 Oct 2026), sub-batch 12 of 12 — Net Worth &
 * Cost of Living (5 tools), filed under Budget Calculators > Net Worth & Cost
 * of Living Calculators. See calc-engine-budget-methods.ts for the full
 * batch context.
 *
 *  - personalNetWorth (incl. debt-to-asset ratio): assets - liabilities,
 *    liquid net worth.
 *  - financialHealthScore: 0–100 from five 20-point parts — savings rate,
 *    emergency months, debt-to-income, retirement savings vs an age-based
 *    salary multiple (1x by 30 … 10x by 67), credit score.
 *  - costOfLivingComparison (incl. expat cost of living): salary needed in
 *    the new place from cost-of-living indexes; rent difference.
 *  - costOfLivingAdjustment: a COLA raise vs actual inflation.
 *  - livingWage: after-tax basic costs for a household -> pre-tax income
 *    and hourly wage per working adult, vs the local minimum wage.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-budget-net-worth-col-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// --- 1. Personal Net Worth Calculator --------------------------------------------------
export const personalNetWorthCalculator: CustomCalculator = (values) => {
  const cash = pos(values.cash, 15000);
  const investments = pos(values.investments, 60000);
  const retirement = pos(values.retirement, 120000);
  const home = pos(values.home, 400000);
  const vehicles = pos(values.vehicles, 25000);
  const otherAssets = pos(values.otherAssets, 10000);
  const mortgage = pos(values.mortgage, 280000);
  const carLoans = pos(values.carLoans, 12000);
  const studentLoans = pos(values.studentLoans, 20000);
  const creditCards = pos(values.creditCards, 4000);
  const otherDebts = pos(values.otherDebts, 0);

  const assets = cash + investments + retirement + home + vehicles + otherAssets;
  const debts = mortgage + carLoans + studentLoans + creditCards + otherDebts;

  return {
    totalAssets: round2(assets),
    totalLiabilities: round2(debts),
    netWorth: round2(assets - debts),
    debtToAssetRatio: round2(assets > 0 ? (debts / assets) * 100 : 0),
    liquidNetWorth: round2(cash + investments - creditCards - otherDebts),
  };
};

// --- 2. Financial Health Score Calculator ----------------------------------------------
export const financialHealthScoreCalculator: CustomCalculator = (values) => {
  const income = pos(values.income, 6000);
  const expenses = pos(values.expenses, 4500);
  const emergencySavings = pos(values.emergencySavings, 15000);
  const debtPayments = pos(values.debtPayments, 900);
  const retirementSavings = pos(values.retirementSavings, 80000);
  const yearlySalary = pos(values.yearlySalary, 85000);
  const age = clamp(pos(values.age, 35), 18, 100);
  const creditScore = clamp(pos(values.creditScore, 720), 300, 850);

  const savingsRate = income > 0 ? (income - expenses) / income : 0;
  const months = expenses > 0 ? emergencySavings / expenses : 0;
  const dti = income > 0 ? debtPayments / income : 0;
  const target =
    age <= 30 ? Math.max(0, (age - 22) / 8)
    : age <= 40 ? 1 + (age - 30) * 0.2
    : age <= 50 ? 3 + (age - 40) * 0.3
    : age <= 60 ? 6 + (age - 50) * 0.2
    : age <= 67 ? 8 + ((age - 60) * 2) / 7
    : 10;
  const multiple = yearlySalary > 0 ? retirementSavings / yearlySalary : 0;

  const s1 = 20 * clamp(savingsRate / 0.2, 0, 1);
  const s2 = 20 * clamp(months / 6, 0, 1);
  const s3 = 20 * clamp((0.36 - dti) / 0.26, 0, 1);
  const s4 = target > 0 ? 20 * clamp(multiple / target, 0, 1) : 20;
  const s5 = 20 * clamp((creditScore - 580) / 220, 0, 1);

  return {
    savingsRatePercent: round2(savingsRate * 100),
    emergencyMonths: round2(months),
    debtToIncomePercent: round2(dti * 100),
    retirementMultiple: round2(multiple),
    retirementTargetMultiple: round2(target),
    financialHealthScore: Math.round(s1 + s2 + s3 + s4 + s5),
  };
};

// --- 3. Cost of Living Comparison Calculator -------------------------------------------
export const costOfLivingComparisonCalculator: CustomCalculator = (values) => {
  const salary = pos(values.salary, 75000);
  const currentIndex = Math.max(1, pos(values.currentIndex, 100));
  const newIndex = Math.max(1, pos(values.newIndex, 125));
  const currentRent = pos(values.currentRent, 1600);
  const newRent = pos(values.newRent, 2300);
  const offeredSalary = pos(values.offeredSalary, 90000);

  const equivalent = (salary * newIndex) / currentIndex;

  return {
    equivalentSalary: round2(equivalent),
    raiseNeededPercent: round2((newIndex / currentIndex - 1) * 100),
    offerVsEquivalent: round2(offeredSalary - equivalent),
    monthlyRentDifference: round2(newRent - currentRent),
    yearlyRentDifference: round2((newRent - currentRent) * 12),
  };
};

// --- 4. Cost of Living Adjustment Calculator -------------------------------------------
export const costOfLivingAdjustmentCalculator: CustomCalculator = (values) => {
  const currentPay = pos(values.currentPay, 60000);
  const colaPercent = safeNumber(values.colaPercent, 2.8);
  const inflationPercent = safeNumber(values.inflationPercent, 3);

  const newPay = currentPay * (1 + colaPercent / 100);
  const real = ((1 + colaPercent / 100) / (1 + inflationPercent / 100) - 1) * 100;

  return {
    newPay: round2(newPay),
    yearlyIncrease: round2(newPay - currentPay),
    monthlyIncrease: round2((newPay - currentPay) / 12),
    realChangePercent: round2(real),
    payNeededToKeepUp: round2(currentPay * (1 + inflationPercent / 100)),
  };
};

// --- 5. Living Wage Calculator ---------------------------------------------------------
export const livingWageCalculator: CustomCalculator = (values) => {
  const housing = pos(values.housing, 1400);
  const food = pos(values.food, 650);
  const childcare = pos(values.childcare, 800);
  const transportation = pos(values.transportation, 450);
  const health = pos(values.health, 400);
  const other = pos(values.other, 400);
  const taxPercent = Math.min(90, pos(values.taxPercent, 15));
  const workingAdults = Math.max(1, Math.round(pos(values.workingAdults, 1)));
  const minimumWage = pos(values.minimumWage, 15);

  const afterTax = (housing + food + childcare + transportation + health + other) * 12;
  const preTax = afterTax / (1 - taxPercent / 100);
  const hourly = preTax / workingAdults / 2080;

  return {
    yearlyCostsAfterTax: round2(afterTax),
    preTaxIncomeNeeded: round2(preTax),
    livingWagePerHour: round2(hourly),
    gapVsMinimumWage: round2(hourly - minimumWage),
  };
};

export const budgetNetWorthColCustomCalculators: Record<string, CustomCalculator> = {
  "personal-net-worth-calculator": personalNetWorthCalculator,
  "financial-health-score-calculator": financialHealthScoreCalculator,
  "cost-of-living-comparison-calculator": costOfLivingComparisonCalculator,
  "cost-of-living-adjustment-calculator": costOfLivingAdjustmentCalculator,
  "living-wage-calculator": livingWageCalculator,
};
