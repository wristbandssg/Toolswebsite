/**
 * Batch: "Investment Calculators" expansion (5 Oct 2026), sub-batch 4 of 9 —
 * Bond Types (6 tools), filed under Investment Calculators > Bond & Fixed
 * Income Calculators (with the bond-interest / YTM / T-bill / I and EE bond
 * tools). See calc-engine-investment-stocks.ts for the full batch context.
 *
 *  - municipalBondInvestment: tax-equivalent yield (in-state: free of
 *    federal and state tax; out-of-state: federal only), income vs a
 *    taxable bond.
 *  - zeroCouponBond: price from the yield (semiannual), total accretion,
 *    first-year "phantom" (OID) income and its tax.
 *  - convertibleBond: conversion price and value, conversion premium,
 *    payback of the premium from the income advantage.
 *  - callableBond (incl. puttable): YTM and yield to call/put; the yield
 *    that matters (worst for callable, best for puttable).
 *  - tipsInvestment: principal indexed to inflation, coupons on the
 *    adjusted principal, phantom income tax in year one.
 *  - structuredNote: participation, cap and buffer applied to an index
 *    return vs owning the index with dividends.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-investment-bond-types-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function priceAt(face: number, couponPercent: number, yieldPercent: number, years: number, redemption: number): number {
  const n = Math.max(1, Math.round(years * 2));
  const c = (face * couponPercent) / 100 / 2;
  const j = yieldPercent / 100 / 2;
  if (j === 0) return c * n + redemption;
  return (c * (1 - Math.pow(1 + j, -n))) / j + redemption * Math.pow(1 + j, -n);
}

function solveYield(price: number, face: number, couponPercent: number, years: number, redemption: number): number {
  if (price <= 0) return 0;
  let lo = -50;
  let hi = 100;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (priceAt(face, couponPercent, mid, years, redemption) > price) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// --- 1. Municipal Bond Investment Calculator -------------------------------------------
export const municipalBondInvestmentCalculator: CustomCalculator = (values) => {
  const investment = Math.max(0, safeNumber(values.investment, 50000));
  const muniYieldPercent = Math.max(0, safeNumber(values.muniYieldPercent, 3.5));
  const federalRatePercent = Math.min(99, Math.max(0, safeNumber(values.federalRatePercent, 32)));
  const stateRatePercent = Math.min(99, Math.max(0, safeNumber(values.stateRatePercent, 5)));
  const inState = Math.round(safeNumber(values.inState, 1)) === 1;
  const taxableYieldPercent = Math.max(0, safeNumber(values.taxableYieldPercent, 5));

  const f = federalRatePercent / 100;
  const s = stateRatePercent / 100;
  const muniAfterTax = inState ? muniYieldPercent : muniYieldPercent * (1 - s);
  const tey = muniAfterTax / ((1 - f) * (1 - s));
  const taxableAfterTax = taxableYieldPercent * (1 - f) * (1 - s);

  return {
    taxEquivalentYield: round2(tey),
    yearlyIncome: round2((investment * muniYieldPercent) / 100),
    afterTaxIncomeMuni: round2((investment * muniAfterTax) / 100),
    afterTaxIncomeTaxableBond: round2((investment * taxableAfterTax) / 100),
    muniAdvantagePerYear: round2((investment * (muniAfterTax - taxableAfterTax)) / 100),
  };
};

// --- 2. Zero-Coupon Bond Investment Calculator -----------------------------------------
export const zeroCouponBondCalculator: CustomCalculator = (values) => {
  const faceValue = Math.max(0, safeNumber(values.faceValue, 10000));
  const yieldPercent = Math.max(0, safeNumber(values.yieldPercent, 4.5));
  const years = Math.max(0, safeNumber(values.years, 10));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 24)));

  const j = yieldPercent / 100 / 2;
  const price = faceValue / Math.pow(1 + j, years * 2);
  const firstYear = price * (Math.pow(1 + j, Math.min(2, years * 2)) - 1);

  return {
    purchasePrice: round2(price),
    totalInterest: round2(faceValue - price),
    priceAsPercentOfFace: round2(faceValue > 0 ? (price / faceValue) * 100 : 0),
    firstYearPhantomIncome: round2(firstYear),
    firstYearTaxOnPhantomIncome: round2((firstYear * taxRatePercent) / 100),
  };
};

// --- 3. Convertible Bond Investment Calculator -----------------------------------------
export const convertibleBondCalculator: CustomCalculator = (values) => {
  const faceValue = Math.max(0, safeNumber(values.faceValue, 1000));
  const bondPrice = Math.max(0, safeNumber(values.bondPrice, 1050));
  const conversionRatio = Math.max(0, safeNumber(values.conversionRatio, 20));
  const stockPrice = Math.max(0, safeNumber(values.stockPrice, 45));
  const couponPercent = Math.max(0, safeNumber(values.couponPercent, 3));
  const dividendYieldPercent = Math.max(0, safeNumber(values.dividendYieldPercent, 1));

  const conversionValue = conversionRatio * stockPrice;
  const premium = bondPrice - conversionValue;
  const incomeEdge = (faceValue * couponPercent) / 100 - (conversionValue * dividendYieldPercent) / 100;

  return {
    conversionPrice: round2(conversionRatio > 0 ? faceValue / conversionRatio : 0),
    conversionValue: round2(conversionValue),
    conversionPremium: round2(premium),
    conversionPremiumPercent: round2(conversionValue > 0 ? (premium / conversionValue) * 100 : 0),
    stockPriceToBreakEven: round2(conversionRatio > 0 ? bondPrice / conversionRatio : 0),
    premiumPaybackYears: round2(incomeEdge > 0 && premium > 0 ? premium / incomeEdge : 0),
  };
};

// --- 4. Callable Bond Investment Calculator (incl. puttable) ---------------------------
export const callableBondCalculator: CustomCalculator = (values) => {
  const raw = Math.round(safeNumber(values.bondType, 1));
  const puttable = raw === 2;
  const price = Math.max(0, safeNumber(values.price, 1030));
  const faceValue = Math.max(0, safeNumber(values.faceValue, 1000));
  const couponPercent = Math.max(0, safeNumber(values.couponPercent, 6));
  const yearsToMaturity = Math.max(0.5, safeNumber(values.yearsToMaturity, 10));
  const exercisePrice = Math.max(0, safeNumber(values.exercisePrice, 1000));
  const yearsToExercise = Math.min(yearsToMaturity, Math.max(0.5, safeNumber(values.yearsToExercise, 3)));

  const ytm = solveYield(price, faceValue, couponPercent, yearsToMaturity, faceValue);
  const yte = solveYield(price, faceValue, couponPercent, yearsToExercise, exercisePrice);

  return {
    yieldToMaturity: round2(ytm),
    yieldToCallOrPut: round2(yte),
    relevantYield: round2(puttable ? Math.max(ytm, yte) : Math.min(ytm, yte)),
    currentYield: round2(price > 0 ? ((faceValue * couponPercent) / 100 / price) * 100 : 0),
  };
};

// --- 5. TIPS Investment Calculator ----------------------------------------------------
export const tipsInvestmentCalculator: CustomCalculator = (values) => {
  const investment = Math.max(0, safeNumber(values.investment, 10000));
  const realCouponPercent = Math.max(0, safeNumber(values.realCouponPercent, 1.8));
  const inflationPercent = safeNumber(values.inflationPercent, 2.5);
  const years = Math.max(0, Math.round(safeNumber(values.years, 10)));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 24)));

  const halfInfl = Math.pow(1 + inflationPercent / 100, 0.5) - 1;
  let principal = investment;
  let coupons = 0;
  let firstYearAccrual = 0;
  for (let h = 0; h < years * 2; h++) {
    const before = principal;
    principal *= 1 + halfInfl;
    if (h < 2) firstYearAccrual += principal - before;
    coupons += (principal * realCouponPercent) / 100 / 2;
  }
  // deflation floor: at maturity you get at least the original principal
  const repaid = Math.max(investment, principal);

  return {
    adjustedPrincipal: round2(principal),
    principalRepaid: round2(repaid),
    totalCoupons: round2(coupons),
    totalReturn: round2(repaid + coupons - investment),
    approximateNominalYield: round2(((1 + realCouponPercent / 100) * (1 + inflationPercent / 100) - 1) * 100),
    firstYearPhantomIncome: round2(firstYearAccrual),
    firstYearTaxOnPhantomIncome: round2((firstYearAccrual * taxRatePercent) / 100),
  };
};

// --- 6. Structured Note Investment Calculator ------------------------------------------
export const structuredNoteCalculator: CustomCalculator = (values) => {
  const investment = Math.max(0, safeNumber(values.investment, 10000));
  const indexReturnPercent = safeNumber(values.indexReturnPercent, 25);
  const participationPercent = Math.max(0, safeNumber(values.participationPercent, 100));
  const capPercent = Math.max(0, safeNumber(values.capPercent, 40));
  const bufferPercent = Math.min(100, Math.max(0, safeNumber(values.bufferPercent, 10)));
  const termYears = Math.max(0.25, safeNumber(values.termYears, 5));
  const dividendYieldPercent = Math.max(0, safeNumber(values.dividendYieldPercent, 1.5));

  const r = indexReturnPercent;
  let noteReturn: number;
  if (r >= 0) noteReturn = Math.min((r * participationPercent) / 100, capPercent);
  else if (r >= -bufferPercent) noteReturn = 0;
  else noteReturn = Math.max(-100, r + bufferPercent);
  const indexTotal = ((1 + r / 100) * Math.pow(1 + dividendYieldPercent / 100, termYears) - 1) * 100;
  const value = (investment * (100 + noteReturn)) / 100;

  return {
    noteReturn: round2(noteReturn),
    valueAtMaturity: round2(value),
    annualizedReturn: round2((Math.pow(Math.max(0, 1 + noteReturn / 100), 1 / termYears) - 1) * 100),
    indexTotalReturnWithDividends: round2(indexTotal),
    noteVsIndex: round2((investment * (noteReturn - indexTotal)) / 100),
  };
};

export const investmentBondTypesCustomCalculators: Record<string, CustomCalculator> = {
  "municipal-bond-investment-calculator": municipalBondInvestmentCalculator,
  "zero-coupon-bond-investment-calculator": zeroCouponBondCalculator,
  "convertible-bond-investment-calculator": convertibleBondCalculator,
  "callable-bond-investment-calculator": callableBondCalculator,
  "tips-investment-calculator": tipsInvestmentCalculator,
  "structured-note-investment-calculator": structuredNoteCalculator,
};
