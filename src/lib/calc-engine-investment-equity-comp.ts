/**
 * Batch: "Investment Calculators" expansion (5 Oct 2026), sub-batch 3 of 9 —
 * Equity Compensation (3 tools), filed under Investment Calculators > Stock
 * & Options Calculators. See calc-engine-investment-stocks.ts for the full
 * batch context.
 *
 *  - stockOptionVesting: cliff then monthly vesting; vested spread value,
 *    exercise cost; NSO spread taxed as ordinary income at exercise, ISO
 *    spread is an AMT preference item instead.
 *  - rsuVesting: shares and value per vest; 22% federal supplemental
 *    withholding (37% above $1M) vs your marginal rate — the extra tax due.
 *  - employeeStockPurchasePlan: payroll contributions over an offering
 *    period, discount (with or without lookback), shares bought, built-in
 *    gain, and the $25,000-a-year purchase limit.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-investment-equity-comp-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Stock Option Vesting Calculator ------------------------------------------------
export const stockOptionVestingCalculator: CustomCalculator = (values) => {
  const optionsGranted = Math.max(0, Math.round(safeNumber(values.optionsGranted, 10000)));
  const strikePrice = Math.max(0, safeNumber(values.strikePrice, 5));
  const currentValue = Math.max(0, safeNumber(values.currentValue, 20));
  const vestingYears = Math.max(0.25, safeNumber(values.vestingYears, 4));
  const cliffMonths = Math.max(0, Math.round(safeNumber(values.cliffMonths, 12)));
  const monthsSinceGrant = Math.max(0, Math.round(safeNumber(values.monthsSinceGrant, 30)));
  const raw = Math.round(safeNumber(values.optionType, 2));
  const iso = raw === 1;
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 32)));

  const total = Math.round(vestingYears * 12);
  const vestedShare = monthsSinceGrant < cliffMonths ? 0 : Math.min(1, monthsSinceGrant / total);
  const vested = Math.floor(optionsGranted * vestedShare);
  const spread = Math.max(0, currentValue - strikePrice);

  return {
    vestedOptions: vested,
    unvestedOptions: optionsGranted - vested,
    spreadPerShare: round2(spread),
    vestedSpreadValue: round2(vested * spread),
    exerciseCost: round2(vested * strikePrice),
    taxIfExercisedNow: round2(iso ? 0 : (vested * spread * taxRatePercent) / 100),
    amtPreferenceAmount: round2(iso ? vested * spread : 0),
  };
};

// --- 2. RSU Vesting Calculator ---------------------------------------------------------
export const rsuVestingCalculator: CustomCalculator = (values) => {
  const units = Math.max(0, Math.round(safeNumber(values.units, 400)));
  const sharePrice = Math.max(0, safeNumber(values.sharePrice, 150));
  const vestingYears = Math.max(0.25, safeNumber(values.vestingYears, 4));
  const raw = Math.round(safeNumber(values.vestsPerYear, 4));
  const vestsPerYear = [1, 2, 4, 12].includes(raw) ? raw : 4;
  const marginalRatePercent = Math.min(100, Math.max(0, safeNumber(values.marginalRatePercent, 35)));
  const withholdingPercent = Math.min(100, Math.max(0, safeNumber(values.withholdingPercent, 22)));

  const vests = Math.max(1, Math.round(vestingYears * vestsPerYear));
  const perVest = units / vests;
  const valuePerVest = perVest * sharePrice;
  const yearly = valuePerVest * vestsPerYear;

  return {
    sharesPerVest: round2(perVest),
    valuePerVest: round2(valuePerVest),
    sharesWithheldPerVest: round2((perVest * withholdingPercent) / 100),
    netSharesPerVest: round2((perVest * (100 - withholdingPercent)) / 100),
    yearlyTaxableIncome: round2(yearly),
    extraTaxDuePerYear: round2((yearly * (marginalRatePercent - withholdingPercent)) / 100),
  };
};

// --- 3. Employee Stock Purchase Plan Calculator ----------------------------------------
export const employeeStockPurchasePlanCalculator: CustomCalculator = (values) => {
  const salary = Math.max(0, safeNumber(values.salary, 100000));
  const contributionPercent = Math.min(100, Math.max(0, safeNumber(values.contributionPercent, 10)));
  const periodMonths = Math.max(1, Math.round(safeNumber(values.periodMonths, 6)));
  const discountPercent = Math.min(15, Math.max(0, safeNumber(values.discountPercent, 15)));
  const startPrice = Math.max(0.01, safeNumber(values.startPrice, 50));
  const endPrice = Math.max(0.01, safeNumber(values.endPrice, 60));
  const lookback = Math.round(safeNumber(values.lookback, 1)) === 1;

  const contributions = (salary * contributionPercent * periodMonths) / 100 / 12;
  const base = lookback ? Math.min(startPrice, endPrice) : endPrice;
  const purchasePrice = base * (1 - discountPercent / 100);
  const shares = Math.floor(contributions / purchasePrice);
  const value = shares * endPrice;
  const cost = shares * purchasePrice;
  // $25,000 of stock (valued at the offering-start price) per calendar year
  const yearlyFmv = shares * startPrice * (12 / periodMonths);

  return {
    contributions: round2(contributions),
    purchasePrice: round2(purchasePrice),
    sharesBought: shares,
    valueAtPurchase: round2(value),
    builtInGain: round2(value - cost),
    returnOnContributions: round2(cost > 0 ? ((value - cost) / cost) * 100 : 0),
    overYearlyLimit: yearlyFmv > 25000 ? 1 : 0,
  };
};

export const investmentEquityCompCustomCalculators: Record<string, CustomCalculator> = {
  "stock-option-vesting-calculator": stockOptionVestingCalculator,
  "rsu-vesting-calculator": rsuVestingCalculator,
  "employee-stock-purchase-plan-calculator": employeeStockPurchasePlanCalculator,
};
