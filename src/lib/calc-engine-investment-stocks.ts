/**
 * Batch: "Investment Calculators" expansion (5 Oct 2026), sub-batch 1 of 9 —
 * Stocks (7 tools), filed under Investment Calculators > Stock & Options
 * Calculators.
 *
 * The user's 69-keyword investment list was checked against every existing
 * slug: 16 were already built (Bond, Treasury Bond, Corporate Bond = bond
 * interest/YTM; Real Estate Investment; Forex Trading; DRIP; Money Market
 * Fund; Large-, Mid-, Small-Cap, Blue Chip and Fractional Share =
 * stock-investment; Penny Stock = stock-profit; Robo-Advisor =
 * investment-fee-impact; DSPP = dollar-cost-averaging; Balanced Fund =
 * portfolio-expected-return) and 12 were merged (Index Fund -> ETF; Sector,
 * ESG, Infrastructure Fund -> Mutual Fund; Silver -> Gold; Commodity ->
 * Futures; Warrant -> Options; Puttable -> Callable Bond; Angel -> Venture
 * Capital; Wine -> Art & Collectibles; Inverse -> Leveraged ETF; Emerging
 * Market -> International Stock). 41 new tools in 9 sub-batches, and
 * Investment Calculators was split into 5 sub-categories
 * (organize-tool-categories.ts moves the 56 existing investment tools):
 *  - calc-engine-investment-stocks.ts (this file)  -> Stock & Options
 *  - calc-engine-investment-trading.ts             -> Stock & Options
 *  - calc-engine-investment-equity-comp.ts         -> Stock & Options
 *  - calc-engine-investment-bond-types.ts          -> Bond & Fixed Income
 *  - calc-engine-investment-funds.ts               -> Fund & ETF
 *  - calc-engine-investment-alt-private.ts         -> Alternative Investment
 *  - calc-engine-investment-alt-real-assets.ts     -> Alternative Investment
 *  - calc-engine-investment-accounts.ts            -> Investment Returns & Planning
 *  - calc-engine-retirement-annuity.ts             -> Retirement Calculators
 *
 *  - growthStockInvestment: EPS growth x a future P/E -> future price,
 *    expected yearly return, PEG.
 *  - valueStockInvestment: Graham's revised formula and Graham number,
 *    margin of safety, P/E and P/B.
 *  - preferredStockInvestment: dividend, current yield, yield to call,
 *    after-tax yield (qualified dividends).
 *  - ipoInvestment: shares allotted, first-day (listing) gain and the
 *    return if held a year.
 *  - internationalStockInvestment (incl. emerging markets): local return
 *    and currency move combined; dividends net of foreign withholding.
 *  - rightsIssue: theoretical ex-rights price, value of a right, cost to
 *    take up.
 *  - spinoffStock: cost basis split between parent and spun-off shares by
 *    market value.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-investment-stocks-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Growth Stock Investment Calculator ---------------------------------------------
export const growthStockInvestmentCalculator: CustomCalculator = (values) => {
  const price = Math.max(0.01, safeNumber(values.price, 150));
  const eps = safeNumber(values.eps, 5);
  const growthPercent = safeNumber(values.growthPercent, 15);
  const years = Math.max(1, Math.round(safeNumber(values.years, 5)));
  const futurePe = Math.max(0, safeNumber(values.futurePe, 25));
  const investment = Math.max(0, safeNumber(values.investment, 10000));

  const futureEps = eps * Math.pow(1 + growthPercent / 100, years);
  const futurePrice = Math.max(0, futureEps * futurePe);
  const yearly = (Math.pow(futurePrice / price, 1 / years) - 1) * 100;
  const pe = eps > 0 ? price / eps : 0;

  return {
    currentPe: round2(pe),
    pegRatio: round2(growthPercent > 0 && pe > 0 ? pe / growthPercent : 0),
    futureEps: round2(futureEps),
    futurePrice: round2(futurePrice),
    expectedYearlyReturn: round2(yearly),
    investmentValue: round2((investment * futurePrice) / price),
  };
};

// --- 2. Value Stock Investment Calculator ----------------------------------------------
export const valueStockInvestmentCalculator: CustomCalculator = (values) => {
  const price = Math.max(0.01, safeNumber(values.price, 70));
  const eps = safeNumber(values.eps, 6);
  const bookValuePerShare = safeNumber(values.bookValuePerShare, 40);
  const growthPercent = Math.max(0, safeNumber(values.growthPercent, 5));
  const bondYieldPercent = Math.max(0.1, safeNumber(values.bondYieldPercent, 5));

  const graham = Math.max(0, (eps * (8.5 + 2 * growthPercent) * 4.4) / bondYieldPercent);
  const grahamNumber = eps > 0 && bookValuePerShare > 0 ? Math.sqrt(22.5 * eps * bookValuePerShare) : 0;
  const fair = Math.min(graham, grahamNumber > 0 ? grahamNumber : graham);

  return {
    peRatio: round2(eps > 0 ? price / eps : 0),
    priceToBook: round2(bookValuePerShare > 0 ? price / bookValuePerShare : 0),
    grahamFormulaValue: round2(graham),
    grahamNumber: round2(grahamNumber),
    marginOfSafety: round2(fair > 0 ? ((fair - price) / fair) * 100 : 0),
  };
};

// --- 3. Preferred Stock Investment Calculator ------------------------------------------
export const preferredStockInvestmentCalculator: CustomCalculator = (values) => {
  const parValue = Math.max(0, safeNumber(values.parValue, 25));
  const dividendRatePercent = Math.max(0, safeNumber(values.dividendRatePercent, 6));
  const price = Math.max(0.01, safeNumber(values.price, 24));
  const callPrice = Math.max(0, safeNumber(values.callPrice, 25));
  const yearsToCall = Math.max(0.25, safeNumber(values.yearsToCall, 3));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 15)));
  const shares = Math.max(0, Math.round(safeNumber(values.shares, 400)));

  const dividend = (parValue * dividendRatePercent) / 100;
  // yield to call: quarterly dividends, call at the call price
  const n = Math.round(yearsToCall * 4);
  const pv = (y: number) => {
    const j = y / 4;
    let s = 0;
    for (let t = 1; t <= n; t++) s += dividend / 4 / Math.pow(1 + j, t);
    return s + callPrice / Math.pow(1 + j, n);
  };
  let lo = -0.9;
  let hi = 2;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > price) lo = mid;
    else hi = mid;
  }
  const current = (dividend / price) * 100;

  return {
    annualDividend: round2(dividend),
    currentYield: round2(current),
    yieldToCall: round2(((lo + hi) / 2) * 100),
    afterTaxYield: round2((current * (100 - taxRatePercent)) / 100),
    yearlyIncome: round2(dividend * shares),
  };
};

// --- 4. IPO Investment Calculator -----------------------------------------------------
export const ipoInvestmentCalculator: CustomCalculator = (values) => {
  const sharesApplied = Math.max(0, Math.round(safeNumber(values.sharesApplied, 500)));
  const allocationPercent = Math.min(100, Math.max(0, safeNumber(values.allocationPercent, 20)));
  const offerPrice = Math.max(0, safeNumber(values.offerPrice, 20));
  const firstDayClose = Math.max(0, safeNumber(values.firstDayClose, 26));
  const priceAfterYear = Math.max(0, safeNumber(values.priceAfterYear, 24));

  const shares = Math.floor((sharesApplied * allocationPercent) / 100);
  const cost = shares * offerPrice;

  return {
    sharesAllotted: shares,
    amountInvested: round2(cost),
    firstDayGain: round2(shares * (firstDayClose - offerPrice)),
    firstDayReturn: round2(offerPrice > 0 ? ((firstDayClose - offerPrice) / offerPrice) * 100 : 0),
    oneYearReturnFromOffer: round2(offerPrice > 0 ? ((priceAfterYear - offerPrice) / offerPrice) * 100 : 0),
    oneYearReturnIfBoughtAtClose: round2(firstDayClose > 0 ? ((priceAfterYear - firstDayClose) / firstDayClose) * 100 : 0),
  };
};

// --- 5. International Stock Investment Calculator -------------------------------------
export const internationalStockInvestmentCalculator: CustomCalculator = (values) => {
  const investment = Math.max(0, safeNumber(values.investment, 10000));
  const localReturnPercent = safeNumber(values.localReturnPercent, 6);
  const currencyChangePercent = safeNumber(values.currencyChangePercent, 1);
  const dividendYieldPercent = Math.max(0, safeNumber(values.dividendYieldPercent, 3));
  const withholdingPercent = Math.min(100, Math.max(0, safeNumber(values.withholdingPercent, 15)));
  const years = Math.max(0, Math.round(safeNumber(values.years, 10)));

  const priceInUsd = (1 + localReturnPercent / 100) * (1 + currencyChangePercent / 100) - 1;
  const netDiv = ((dividendYieldPercent / 100) * (1 + currencyChangePercent / 100) * (100 - withholdingPercent)) / 100;
  const total = priceInUsd + netDiv;
  let value = investment;
  let withheld = 0;
  for (let y = 0; y < years; y++) {
    withheld += (value * (dividendYieldPercent / 100) * (1 + currencyChangePercent / 100) * withholdingPercent) / 100;
    value *= 1 + total;
  }

  return {
    priceReturnInUsd: round2(priceInUsd * 100),
    totalYearlyReturnInUsd: round2(total * 100),
    valueAfterYears: round2(value),
    foreignTaxWithheld: round2(withheld),
  };
};

// --- 6. Rights Issue Calculator -------------------------------------------------------
export const rightsIssueCalculator: CustomCalculator = (values) => {
  const sharesHeld = Math.max(0, Math.round(safeNumber(values.sharesHeld, 1000)));
  const newPerHeld = Math.max(0, safeNumber(values.newPerHeld, 1));
  const heldPerNew = Math.max(1, safeNumber(values.heldPerNew, 4));
  const marketPrice = Math.max(0, safeNumber(values.marketPrice, 50));
  const subscriptionPrice = Math.max(0, safeNumber(values.subscriptionPrice, 40));

  const ratio = newPerHeld / heldPerNew;
  const terp = (marketPrice + ratio * subscriptionPrice) / (1 + ratio);
  const newShares = Math.floor(sharesHeld * ratio);

  return {
    newSharesEntitled: newShares,
    costToTakeUp: round2(newShares * subscriptionPrice),
    theoreticalExRightsPrice: round2(terp),
    valuePerRight: round2(terp - subscriptionPrice),
    valueOfYourRights: round2(newShares * (terp - subscriptionPrice)),
    holdingValueIfYouDoNothing: round2(sharesHeld * terp),
  };
};

// --- 7. Spinoff Stock Calculator ------------------------------------------------------
export const spinoffStockCalculator: CustomCalculator = (values) => {
  const parentShares = Math.max(0, Math.round(safeNumber(values.parentShares, 100)));
  const originalBasis = Math.max(0, safeNumber(values.originalBasis, 10000));
  const parentPrice = Math.max(0, safeNumber(values.parentPrice, 80));
  const spinRatio = Math.max(0, safeNumber(values.spinRatio, 0.5));
  const spinPrice = Math.max(0, safeNumber(values.spinPrice, 40));

  const spinShares = Math.floor(parentShares * spinRatio);
  const parentFmv = parentShares * parentPrice;
  const spinFmv = spinShares * spinPrice;
  const total = parentFmv + spinFmv;
  const parentShare = total > 0 ? parentFmv / total : 1;

  return {
    spinoffSharesReceived: spinShares,
    parentBasisPercent: round2(parentShare * 100),
    parentNewBasis: round2(originalBasis * parentShare),
    spinoffBasis: round2(originalBasis * (1 - parentShare)),
    parentBasisPerShare: round2(parentShares > 0 ? (originalBasis * parentShare) / parentShares : 0),
    spinoffBasisPerShare: round2(spinShares > 0 ? (originalBasis * (1 - parentShare)) / spinShares : 0),
  };
};

export const investmentStocksCustomCalculators: Record<string, CustomCalculator> = {
  "growth-stock-investment-calculator": growthStockInvestmentCalculator,
  "value-stock-investment-calculator": valueStockInvestmentCalculator,
  "preferred-stock-investment-calculator": preferredStockInvestmentCalculator,
  "ipo-investment-calculator": ipoInvestmentCalculator,
  "international-stock-investment-calculator": internationalStockInvestmentCalculator,
  "rights-issue-calculator": rightsIssueCalculator,
  "spinoff-stock-calculator": spinoffStockCalculator,
};
