/**
 * Batch: "Business Finance Calculators" sub-batch J (Valuation, Earnings &
 * Coverage, 8 tools). Part of the Business Finance build-out — see
 * calc-engine-business-profit.ts for the full list of 11 sub-batches.
 * Filed under Finance Calculators > Business Finance Calculators.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - businessValuationCalculator: a small business valued by an earnings
 *    multiple AND a revenue multiple, then equity value after net debt.
 *  - ebitdaCalculator: EBITDA built UP from net income, plus "adjusted"
 *    EBITDA with one-off add-backs.
 *  - ebitCalculator: EBIT top-down from revenue, COGS and operating
 *    expenses, with and without non-operating income. (ebitdaCalculator
 *    builds up from net income; operatingProfitCalculator in sub-batch A
 *    itemizes operating expenses.)
 *  - ebitdaMarginCalculator: EBITDA as a % of revenue and the EBITDA needed
 *    for a target margin.
 *  - enterpriseValueCalculator: EV from market cap, debt, cash and other
 *    claims, and EV/EBITDA.
 *  - priceToEarningsRatioCalculator: P/E from price and EPS, earnings yield
 *    and the PEG ratio.
 *  - debtServiceCoverageRatioCalculator: DSCR and the largest loan a lender
 *    would allow at a minimum DSCR.
 *  - interestCoverageRatioCalculator: EBIT ÷ interest, and the coverage if
 *    interest rates rise.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-business-valuation-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Business Valuation Calculator (multiples) -------------------------
export const businessValuationCalculator: CustomCalculator = (values) => {
  const annualEarnings = Math.max(0, safeNumber(values.annualEarnings, 300000));
  const earningsMultiple = Math.max(0, safeNumber(values.earningsMultiple, 4));
  const annualRevenue = Math.max(0, safeNumber(values.annualRevenue, 1500000));
  const revenueMultiple = Math.max(0, safeNumber(values.revenueMultiple, 0.9));
  const netDebt = safeNumber(values.netDebt, 150000);

  const byEarnings = annualEarnings * earningsMultiple;
  const byRevenue = annualRevenue * revenueMultiple;
  const blended = (byEarnings + byRevenue) / 2;

  return {
    blendedBusinessValue: round2(blended),
    valueByEarningsMultiple: round2(byEarnings),
    valueByRevenueMultiple: round2(byRevenue),
    equityValueToOwners: round2(blended - netDebt),
  };
};

// --- 2. EBITDA Calculator (bottom-up + adjusted) --------------------------
export const ebitdaCalculator: CustomCalculator = (values) => {
  const netIncome = safeNumber(values.netIncome, 180000);
  const interestExpense = Math.max(0, safeNumber(values.interestExpense, 30000));
  const incomeTaxes = Math.max(0, safeNumber(values.incomeTaxes, 50000));
  const depreciation = Math.max(0, safeNumber(values.depreciation, 40000));
  const amortization = Math.max(0, safeNumber(values.amortization, 10000));
  const oneTimeExpenses = Math.max(0, safeNumber(values.oneTimeExpenses, 15000));

  const ebit = netIncome + interestExpense + incomeTaxes;
  const ebitda = ebit + depreciation + amortization;

  return {
    ebitda: round2(ebitda),
    adjustedEbitda: round2(ebitda + oneTimeExpenses),
    ebit: round2(ebit),
    addBacksTotal: round2(ebitda - netIncome),
  };
};

// --- 3. EBIT Calculator (top-down) ------------------------------------------
export const ebitCalculator: CustomCalculator = (values) => {
  const revenue = Math.max(0, safeNumber(values.revenue, 1200000));
  const costOfGoodsSold = Math.max(0, safeNumber(values.costOfGoodsSold, 650000));
  const operatingExpenses = Math.max(0, safeNumber(values.operatingExpenses, 330000));
  const nonOperatingIncome = safeNumber(values.nonOperatingIncome, 10000);

  const ebit = revenue - costOfGoodsSold - operatingExpenses;

  return {
    ebit: round2(ebit),
    ebitMarginPercent: revenue > 0 ? round2((ebit / revenue) * 100) : 0,
    ebitIncludingNonOperatingIncome: round2(ebit + nonOperatingIncome),
    grossProfit: round2(revenue - costOfGoodsSold),
  };
};

// --- 4. EBITDA Margin Calculator ---------------------------------------------
export const ebitdaMarginCalculator: CustomCalculator = (values) => {
  const ebitda = safeNumber(values.ebitda, 280000);
  const revenue = Math.max(0, safeNumber(values.revenue, 1750000));
  const targetMarginPercent = Math.max(0, safeNumber(values.targetMarginPercent, 20));

  return {
    ebitdaMarginPercent: revenue > 0 ? round2((ebitda / revenue) * 100) : 0,
    ebitdaNeededForTarget: round2((revenue * targetMarginPercent) / 100),
    gapToTarget: round2(Math.max(0, (revenue * targetMarginPercent) / 100 - ebitda)),
  };
};

// --- 5. Enterprise Value Calculator --------------------------------------------
export const enterpriseValueCalculator: CustomCalculator = (values) => {
  const sharePrice = Math.max(0, safeNumber(values.sharePrice, 25));
  const sharesOutstanding = Math.max(0, safeNumber(values.sharesOutstanding, 4000000));
  const totalDebt = Math.max(0, safeNumber(values.totalDebt, 30000000));
  const preferredAndMinorityInterest = Math.max(0, safeNumber(values.preferredAndMinorityInterest, 0));
  const cashAndEquivalents = Math.max(0, safeNumber(values.cashAndEquivalents, 12000000));
  const ebitda = safeNumber(values.ebitda, 14000000);

  const marketCap = sharePrice * sharesOutstanding;
  const ev = marketCap + totalDebt + preferredAndMinorityInterest - cashAndEquivalents;

  return {
    enterpriseValue: round2(ev),
    marketCapitalization: round2(marketCap),
    evToEbitda: ebitda !== 0 ? round2(ev / ebitda) : 0,
    netDebt: round2(totalDebt - cashAndEquivalents),
  };
};

// --- 6. Price-to-Earnings (P/E) Ratio ------------------------------------------
export const priceToEarningsRatioCalculator: CustomCalculator = (values) => {
  const sharePrice = Math.max(0, safeNumber(values.sharePrice, 60));
  const netIncome = safeNumber(values.netIncome, 20000000);
  const sharesOutstanding = Math.max(1, safeNumber(values.sharesOutstanding, 5000000));
  const earningsGrowthPercent = safeNumber(values.earningsGrowthPercent, 10);

  const eps = netIncome / sharesOutstanding;
  const pe = eps !== 0 ? sharePrice / eps : 0;

  return {
    priceToEarningsRatio: round2(pe),
    earningsPerShare: round2(eps),
    earningsYieldPercent: sharePrice > 0 ? round2((eps / sharePrice) * 100) : 0,
    pegRatio: earningsGrowthPercent > 0 ? round2(pe / earningsGrowthPercent) : 0,
  };
};

// --- 7. Debt Service Coverage Ratio (DSCR) + max loan -----------------------
export const debtServiceCoverageRatioCalculator: CustomCalculator = (values) => {
  const netOperatingIncome = Math.max(0, safeNumber(values.netOperatingIncome, 180000));
  const annualDebtService = Math.max(0, safeNumber(values.annualDebtService, 130000));
  const minimumDscr = Math.max(0.1, safeNumber(values.minimumDscr, 1.25));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 7.5));
  const loanYears = Math.max(1, safeNumber(values.loanYears, 20));

  // Largest payment the lender allows, turned back into a loan amount.
  const maxAnnualPayment = netOperatingIncome / minimumDscr;
  const i = loanRatePercent / 100 / 12;
  const n = Math.round(loanYears * 12);
  const maxLoan = i === 0 ? (maxAnnualPayment / 12) * n : ((maxAnnualPayment / 12) * (1 - Math.pow(1 + i, -n))) / i;

  return {
    debtServiceCoverageRatio: annualDebtService > 0 ? round2(netOperatingIncome / annualDebtService) : 0,
    maxAnnualDebtServiceAllowed: round2(maxAnnualPayment),
    maxLoanAmount: round2(maxLoan),
    cushionAboveDebtService: round2(netOperatingIncome - annualDebtService),
  };
};

// --- 8. Interest Coverage Ratio (with a rate shock) -----------------------
export const interestCoverageRatioCalculator: CustomCalculator = (values) => {
  const ebit = safeNumber(values.ebit, 400000);
  const interestExpense = Math.max(0, safeNumber(values.interestExpense, 80000));
  const rateIncreasePercent = Math.max(0, safeNumber(values.rateIncreasePercent, 30));

  const shocked = interestExpense * (1 + rateIncreasePercent / 100);

  return {
    interestCoverageRatio: interestExpense > 0 ? round2(ebit / interestExpense) : 0,
    coverageIfInterestRises: shocked > 0 ? round2(ebit / shocked) : 0,
    ebitCushionAboveInterest: round2(ebit - interestExpense),
  };
};

export const businessValuationCustomCalculators: Record<string, CustomCalculator> = {
  "business-valuation-calculator": businessValuationCalculator,
  "ebitda-calculator": ebitdaCalculator,
  "ebit-calculator": ebitCalculator,
  "ebitda-margin-calculator": ebitdaMarginCalculator,
  "enterprise-value-calculator": enterpriseValueCalculator,
  "price-to-earnings-ratio-calculator": priceToEarningsRatioCalculator,
  "debt-service-coverage-ratio-calculator": debtServiceCoverageRatioCalculator,
  "interest-coverage-ratio-calculator": interestCoverageRatioCalculator,
};
