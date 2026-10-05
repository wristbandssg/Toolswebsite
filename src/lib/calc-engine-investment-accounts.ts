/**
 * Batch: "Investment Calculators" expansion (5 Oct 2026), sub-batch 8 of 9 —
 * Investment Accounts (2 tools), filed under Investment Calculators >
 * Investment Returns & Planning Calculators. See
 * calc-engine-investment-stocks.ts for the full batch context.
 *
 *  - custodialInvestmentAccount (UTMA/UGMA): growth to the age of
 *    majority; the child's unearned income and kiddie tax (first $1,350
 *    tax-free, next $1,350 at the child's rate, the rest at the parents');
 *    gifts above the $19,000-per-giver exclusion.
 *  - taxableBrokerageAccount: dividends taxed every year, capital gains
 *    taxed at sale -> after-tax value vs the same savings tax-free.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-investment-accounts-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Custodial Investment Account Calculator ----------------------------------------
export const custodialInvestmentAccountCalculator: CustomCalculator = (values) => {
  const initial = Math.max(0, safeNumber(values.initial, 5000));
  const yearlyContribution = Math.max(0, safeNumber(values.yearlyContribution, 3000));
  const returnPercent = safeNumber(values.returnPercent, 7);
  const years = Math.max(0, Math.round(safeNumber(values.years, 15)));
  const incomeYieldPercent = Math.max(0, safeNumber(values.incomeYieldPercent, 2));
  const childRatePercent = Math.max(0, safeNumber(values.childRatePercent, 10));
  const parentRatePercent = Math.max(0, safeNumber(values.parentRatePercent, 24));
  const threshold = Math.max(0, safeNumber(values.threshold, 1350));
  const giftExclusion = Math.max(0, safeNumber(values.giftExclusion, 19000));

  const kiddieTax = (income: number) =>
    (Math.min(Math.max(0, income - threshold), threshold) * childRatePercent) / 100 +
    (Math.max(0, income - 2 * threshold) * parentRatePercent) / 100;

  let value = initial;
  let firstIncome = 0;
  let lastIncome = 0;
  let taxTotal = 0;
  for (let y = 0; y < years; y++) {
    value += yearlyContribution;
    const income = (value * incomeYieldPercent) / 100;
    if (y === 0) firstIncome = income;
    lastIncome = income;
    taxTotal += kiddieTax(income);
    value *= 1 + returnPercent / 100;
  }
  const contributed = initial + yearlyContribution * years;

  return {
    totalContributed: round2(contributed),
    valueAtMajority: round2(value),
    growth: round2(value - contributed),
    finalYearUnearnedIncome: round2(lastIncome),
    finalYearKiddieTax: round2(kiddieTax(lastIncome)),
    totalKiddieTax: round2(taxTotal),
    firstYearContributionOverGiftExclusion: round2(Math.max(0, initial + yearlyContribution - giftExclusion)),
    firstYearUnearnedIncome: round2(firstIncome),
  };
};

// --- 2. Taxable Brokerage Account Calculator -------------------------------------------
export const taxableBrokerageAccountCalculator: CustomCalculator = (values) => {
  const initial = Math.max(0, safeNumber(values.initial, 50000));
  const monthly = Math.max(0, safeNumber(values.monthly, 1000));
  const totalReturnPercent = safeNumber(values.totalReturnPercent, 8);
  const dividendYieldPercent = Math.max(0, safeNumber(values.dividendYieldPercent, 2));
  const dividendTaxPercent = Math.min(100, Math.max(0, safeNumber(values.dividendTaxPercent, 15)));
  const capitalGainsTaxPercent = Math.min(100, Math.max(0, safeNumber(values.capitalGainsTaxPercent, 15)));
  const years = Math.max(0, Math.round(safeNumber(values.years, 20)));

  const priceGrowth = totalReturnPercent - dividendYieldPercent;
  let value = initial;
  let basis = initial;
  let taxFree = initial;
  let dividendTax = 0;
  for (let y = 0; y < years; y++) {
    value += monthly * 12;
    basis += monthly * 12;
    taxFree += monthly * 12;
    const div = (value * dividendYieldPercent) / 100;
    const tax = (div * dividendTaxPercent) / 100;
    dividendTax += tax;
    value = value * (1 + priceGrowth / 100) + div - tax;
    basis += div - tax; // reinvested dividends add to basis
    taxFree *= 1 + totalReturnPercent / 100;
  }
  const saleTax = (Math.max(0, value - basis) * capitalGainsTaxPercent) / 100;
  const afterTax = value - saleTax;

  return {
    totalContributed: round2(initial + monthly * 12 * years),
    valueBeforeSale: round2(value),
    taxOnDividends: round2(dividendTax),
    taxAtSale: round2(saleTax),
    afterTaxValue: round2(afterTax),
    taxFreeAccountValue: round2(taxFree),
    totalTaxDrag: round2(taxFree - afterTax),
  };
};

export const investmentAccountsCustomCalculators: Record<string, CustomCalculator> = {
  "custodial-investment-account-calculator": custodialInvestmentAccountCalculator,
  "taxable-brokerage-account-calculator": taxableBrokerageAccountCalculator,
};
