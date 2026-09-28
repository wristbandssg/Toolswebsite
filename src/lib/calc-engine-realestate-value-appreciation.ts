/**
 * Batch: "Real Estate Calculators" sub-batch C (Value, Appreciation &
 * Depreciation, 10 tools). Part of the Real Estate build-out — see
 * calc-engine-realestate-rental-income.ts for the full list of 11
 * sub-batches. Filed under Finance Calculators > Real Estate Calculators.
 *
 * US tax rules used: residential rental buildings depreciate over 27.5
 * years, non-residential over 39 years, straight-line with the mid-month
 * convention (IRS Pub. 946/527); land is never depreciated. On sale,
 * depreciation taken is "unrecaptured Section 1250 gain", taxed at ordinary
 * rates capped at 25%.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - propertyValueCalculator: the sales-comparison approach — average price
 *    per square foot of comparable sales × your square footage.
 *  - investmentPropertyValueCalculator: the MOST to pay for a rental to earn
 *    a target cash-on-cash return with your financing.
 *  - incomeApproachPropertyValueCalculator: value = NOI ÷ cap rate, with NOI
 *    built from rent, vacancy and expenses.
 *  - propertyAppreciationCalculator: a property's future value at an
 *    appreciation rate.
 *  - realEstateAppreciationCalculator: the appreciation rate you actually
 *    EARNED between a purchase and today, before and after inflation.
 *  - propertyDepreciationCalculator: a residential rental's yearly and
 *    first-year (mid-month) depreciation and the tax it saves.
 *  - realEstateDepreciationCalculator: residential OR commercial, the
 *    depreciation built up over years held and the recapture tax on sale.
 *  - rentalPropertyAppreciationCalculator: rent AND value growing together
 *    — future rent, value and yield on your original cost.
 *  - rentalPropertyFutureValueCalculator: total wealth from a rental after N
 *    years — equity plus the cash flow collected.
 *  - propertyEquityGrowthCalculator: equity after 5 and 10 years split into
 *    down payment, loan paydown and appreciation.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-realestate-value-appreciation-calculators.ts for the
 * tool content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function payment(principal: number, annualRatePercent: number, years: number): number {
  const n = Math.round(years * 12);
  const i = annualRatePercent / 100 / 12;
  if (n <= 0) return 0;
  return i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
}

function balanceAfter(principal: number, annualRatePercent: number, pmt: number, months: number): number {
  const i = annualRatePercent / 100 / 12;
  if (i === 0) return Math.max(0, principal - pmt * months);
  return Math.max(0, principal * Math.pow(1 + i, months) - (pmt * (Math.pow(1 + i, months) - 1)) / i);
}

const RECAPTURE_MAX_RATE = 25;

// --- 1. Property Value Calculator (comparable sales) ----------------------
export const propertyValueCalculator: CustomCalculator = (values) => {
  const subjectSquareFeet = Math.max(0, safeNumber(values.subjectSquareFeet, 1800));
  const comps = [1, 2, 3].map((k) => ({
    price: Math.max(0, safeNumber(values[`comp${k}Price`], [360000, 395000, 342000][k - 1])),
    sqft: Math.max(1, safeNumber(values[`comp${k}SquareFeet`], [1750, 1950, 1700][k - 1])),
  }));
  const adjustmentPercent = safeNumber(values.adjustmentPercent, 0);

  const perSqft = comps.map((c) => c.price / c.sqft);
  const avg = perSqft.reduce((a, b) => a + b, 0) / perSqft.length;
  const value = avg * subjectSquareFeet * (1 + adjustmentPercent / 100);

  return {
    estimatedValue: round2(value),
    averagePricePerSquareFoot: round2(avg),
    lowEstimate: round2(Math.min(...perSqft) * subjectSquareFeet * (1 + adjustmentPercent / 100)),
    highEstimate: round2(Math.max(...perSqft) * subjectSquareFeet * (1 + adjustmentPercent / 100)),
  };
};

// --- 2. Investment Property Value (max price for a target CoC) -----------
export const investmentPropertyValueCalculator: CustomCalculator = (values) => {
  const annualNoi = Math.max(0, safeNumber(values.annualNoi, 20000));
  const targetCashOnCashPercent = Math.max(0, safeNumber(values.targetCashOnCashPercent, 8));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 25)));
  const closingCostPercent = Math.max(0, safeNumber(values.closingCostPercent, 3));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7));
  const loanYears = Math.max(1, safeNumber(values.loanYears, 30));

  // Price P with (NOI − annual debt service) ÷ cash in = target, where debt
  // service and cash in both scale with P: P = NOI ÷ (t·(d + c) + k·(1 − d)).
  const d = downPaymentPercent / 100;
  const c = closingCostPercent / 100;
  const t = targetCashOnCashPercent / 100;
  const k = payment(1, interestRatePercent, loanYears) * 12;
  const price = annualNoi / (t * (d + c) + k * (1 - d));
  const debtService = k * (1 - d) * price;

  return {
    maxPurchasePrice: round2(price),
    cashNeeded: round2(price * (d + c)),
    annualCashFlowAtThatPrice: round2(annualNoi - debtService),
    capRateAtThatPricePercent: price > 0 ? round2((annualNoi / price) * 100) : 0,
  };
};

// --- 3. Income Approach Property Value (NOI ÷ cap rate) -------------------
export const incomeApproachPropertyValueCalculator: CustomCalculator = (values) => {
  const grossAnnualRent = Math.max(0, safeNumber(values.grossAnnualRent, 120000));
  const vacancyPercent = Math.min(100, Math.max(0, safeNumber(values.vacancyPercent, 5)));
  const operatingExpenses = Math.max(0, safeNumber(values.operatingExpenses, 42000));
  const marketCapRatePercent = Math.max(0.01, safeNumber(values.marketCapRatePercent, 6.5));

  const noi = grossAnnualRent * (1 - vacancyPercent / 100) - operatingExpenses;
  const value = noi / (marketCapRatePercent / 100);

  return {
    estimatedValue: round2(value),
    netOperatingIncome: round2(noi),
    valueIfCapRateHalfPointHigher: round2(noi / ((marketCapRatePercent + 0.5) / 100)),
    valueIfCapRateHalfPointLower: marketCapRatePercent > 0.5 ? round2(noi / ((marketCapRatePercent - 0.5) / 100)) : 0,
  };
};

// --- 4. Property Appreciation Calculator (future value) ------------------
export const propertyAppreciationCalculator: CustomCalculator = (values) => {
  const currentValue = Math.max(0, safeNumber(values.currentValue, 350000));
  const annualAppreciationPercent = safeNumber(values.annualAppreciationPercent, 4);
  const years = Math.max(0, safeNumber(values.years, 10));

  const future = currentValue * Math.pow(1 + annualAppreciationPercent / 100, years);

  return {
    futureValue: round2(future),
    totalAppreciation: round2(future - currentValue),
    totalGrowthPercent: currentValue > 0 ? round2((future / currentValue - 1) * 100) : 0,
    valueAfter5Years: round2(currentValue * Math.pow(1 + annualAppreciationPercent / 100, Math.min(5, years))),
  };
};

// --- 5. Real Estate Appreciation (rate earned, nominal and real) ---------
export const realEstateAppreciationCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0.01, safeNumber(values.purchasePrice, 250000));
  const currentValue = Math.max(0, safeNumber(values.currentValue, 380000));
  const yearsOwned = Math.max(0.1, safeNumber(values.yearsOwned, 8));
  const inflationPercent = safeNumber(values.inflationPercent, 3);

  const rate = Math.pow(currentValue / purchasePrice, 1 / yearsOwned) - 1;

  return {
    annualAppreciationPercent: round2(rate * 100),
    totalAppreciation: round2(currentValue - purchasePrice),
    totalGrowthPercent: round2((currentValue / purchasePrice - 1) * 100),
    realAnnualAppreciationPercent: round2(((1 + rate) / (1 + inflationPercent / 100) - 1) * 100),
  };
};

// --- 6. Property Depreciation (residential, mid-month) --------------------
export const propertyDepreciationCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 350000));
  const landValue = Math.max(0, safeNumber(values.landValue, 70000));
  const capitalImprovements = Math.max(0, safeNumber(values.capitalImprovements, 15000));
  const monthPlacedInService = Math.min(12, Math.max(1, Math.round(safeNumber(values.monthPlacedInService, 7))));
  const marginalTaxRatePercent = Math.max(0, safeNumber(values.marginalTaxRatePercent, 24));

  const basis = Math.max(0, purchasePrice - landValue + capitalImprovements);
  const annual = basis / 27.5;
  // Mid-month convention: placed in service mid-month.
  const firstYear = (annual * (12 - monthPlacedInService + 0.5)) / 12;

  return {
    annualDepreciation: round2(annual),
    firstYearDepreciation: round2(firstYear),
    depreciableBasis: round2(basis),
    annualTaxSavings: round2((annual * marginalTaxRatePercent) / 100),
  };
};

// --- 7. Real Estate Depreciation (27.5 or 39 years, + recapture) ----------
export const realEstateDepreciationCalculator: CustomCalculator = (values) => {
  const buildingBasis = Math.max(0, safeNumber(values.buildingBasis, 800000));
  // 27.5 = residential rental, 39 = commercial / non-residential
  const recoveryYears = safeNumber(values.recoveryYears, 39) === 27.5 ? 27.5 : 39;
  const yearsHeld = Math.max(0, safeNumber(values.yearsHeld, 10));
  const ordinaryTaxRatePercent = Math.max(0, safeNumber(values.ordinaryTaxRatePercent, 32));

  const annual = buildingBasis / recoveryYears;
  const accumulated = Math.min(buildingBasis, annual * yearsHeld);
  const recaptureRate = Math.min(ordinaryTaxRatePercent, RECAPTURE_MAX_RATE);

  return {
    annualDepreciation: round2(annual),
    accumulatedDepreciation: round2(accumulated),
    recaptureTaxIfSold: round2((accumulated * recaptureRate) / 100),
    taxSavedWhileHeld: round2((accumulated * ordinaryTaxRatePercent) / 100),
    remainingBasis: round2(buildingBasis - accumulated),
  };
};

// --- 8. Rental Property Appreciation (rent and value) ----------------------
export const rentalPropertyAppreciationCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0.01, safeNumber(values.purchasePrice, 300000));
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 2200));
  const valueGrowthPercent = safeNumber(values.valueGrowthPercent, 3.5);
  const rentGrowthPercent = safeNumber(values.rentGrowthPercent, 3);
  const years = Math.max(0, safeNumber(values.years, 10));

  const value = purchasePrice * Math.pow(1 + valueGrowthPercent / 100, years);
  const rent = monthlyRent * Math.pow(1 + rentGrowthPercent / 100, years);

  return {
    futurePropertyValue: round2(value),
    futureMonthlyRent: round2(rent),
    grossYieldOnOriginalCostPercent: round2(((rent * 12) / purchasePrice) * 100),
    grossYieldOnFutureValuePercent: round2(((rent * 12) / value) * 100),
  };
};

// --- 9. Rental Property Future Value (equity + cash flow) ----------------
export const rentalPropertyFutureValueCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 300000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 240000));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7));
  const loanYears = Math.max(1, safeNumber(values.loanYears, 30));
  const firstYearCashFlow = safeNumber(values.firstYearCashFlow, 3000);
  const cashFlowGrowthPercent = safeNumber(values.cashFlowGrowthPercent, 3);
  const appreciationPercent = safeNumber(values.appreciationPercent, 3.5);
  const years = Math.max(0, Math.round(safeNumber(values.years, 10)));

  const value = purchasePrice * Math.pow(1 + appreciationPercent / 100, years);
  const pmt = payment(loanAmount, interestRatePercent, loanYears);
  const balance = balanceAfter(loanAmount, interestRatePercent, pmt, years * 12);
  let cashFlows = 0;
  for (let y = 0; y < years; y++) cashFlows += firstYearCashFlow * Math.pow(1 + cashFlowGrowthPercent / 100, y);

  return {
    totalWealthCreated: round2(value - balance + cashFlows),
    equity: round2(value - balance),
    propertyValue: round2(value),
    loanBalance: round2(balance),
    cashFlowCollected: round2(cashFlows),
  };
};

// --- 10. Property Equity Growth (sources over time) ------------------------
export const propertyEquityGrowthCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 400000));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 80000));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 6.5));
  const loanYears = Math.max(1, safeNumber(values.loanYears, 30));
  const appreciationPercent = safeNumber(values.appreciationPercent, 3);

  const loan = Math.max(0, purchasePrice - downPayment);
  const pmt = payment(loan, interestRatePercent, loanYears);
  const at = (years: number) => {
    const value = purchasePrice * Math.pow(1 + appreciationPercent / 100, years);
    const bal = balanceAfter(loan, interestRatePercent, pmt, years * 12);
    return { equity: value - bal, paydown: loan - bal, appreciation: value - purchasePrice };
  };
  const y5 = at(5);
  const y10 = at(10);

  return {
    equityAfter10Years: round2(y10.equity),
    equityAfter5Years: round2(y5.equity),
    fromLoanPaydown10Years: round2(y10.paydown),
    fromAppreciation10Years: round2(y10.appreciation),
    fromDownPayment: round2(downPayment),
  };
};

export const realestateValueAppreciationCustomCalculators: Record<string, CustomCalculator> = {
  "property-value-calculator": propertyValueCalculator,
  "investment-property-value-calculator": investmentPropertyValueCalculator,
  "income-approach-property-value-calculator": incomeApproachPropertyValueCalculator,
  "property-appreciation-calculator": propertyAppreciationCalculator,
  "real-estate-appreciation-calculator": realEstateAppreciationCalculator,
  "property-depreciation-calculator": propertyDepreciationCalculator,
  "real-estate-depreciation-calculator": realEstateDepreciationCalculator,
  "rental-property-appreciation-calculator": rentalPropertyAppreciationCalculator,
  "rental-property-future-value-calculator": rentalPropertyFutureValueCalculator,
  "property-equity-growth-calculator": propertyEquityGrowthCalculator,
};
