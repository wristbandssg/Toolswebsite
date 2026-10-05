/**
 * Batch: "Investment Calculators" expansion (5 Oct 2026), sub-batch 7 of 9 —
 * Real Assets (6 tools), filed under Investment Calculators > Alternative
 * Investment Calculators. See calc-engine-investment-stocks.ts for the full
 * batch context.
 *
 *  - reit: dividend yield, price/FFO, payout of FFO, growing dividend
 *    income and total return with price growth.
 *  - goldInvestment (incl. silver): ounces after dealer premium, storage or
 *    fund fee, sell spread, 28% collectibles tax cap.
 *  - artCollectiblesInvestment (incl. wine): buyer's premium, yearly
 *    storage/insurance, seller's commission, collectibles tax.
 *  - farmlandInvestment: cash rent less property tax, appreciation.
 *  - timberlandInvestment: timber value grows by biological growth x
 *    timber price; land appreciates separately; yearly costs.
 *  - oilGasInvestment: intangible drilling costs deducted in year one, the
 *    rest over 7 years; production income declining yearly; 15%
 *    percentage depletion; after-tax payback.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-investment-alt-real-assets-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function annualized(start: number, end: number, years: number): number {
  if (start <= 0 || years <= 0 || end <= 0) return 0;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

// --- 1. REIT Calculator ---------------------------------------------------------------
export const reitCalculator: CustomCalculator = (values) => {
  const price = Math.max(0.01, safeNumber(values.price, 50));
  const dividendPerShare = Math.max(0, safeNumber(values.dividendPerShare, 2.4));
  const ffoPerShare = Math.max(0, safeNumber(values.ffoPerShare, 3.5));
  const shares = Math.max(0, Math.round(safeNumber(values.shares, 200)));
  const dividendGrowthPercent = safeNumber(values.dividendGrowthPercent, 3);
  const priceGrowthPercent = safeNumber(values.priceGrowthPercent, 2);
  const years = Math.max(0, Math.round(safeNumber(values.years, 10)));

  let dividends = 0;
  for (let y = 0; y < years; y++) dividends += dividendPerShare * shares * Math.pow(1 + dividendGrowthPercent / 100, y);
  const endValue = price * shares * Math.pow(1 + priceGrowthPercent / 100, years);
  const cost = price * shares;

  return {
    dividendYield: round2((dividendPerShare / price) * 100),
    priceToFfo: round2(ffoPerShare > 0 ? price / ffoPerShare : 0),
    payoutOfFfo: round2(ffoPerShare > 0 ? (dividendPerShare / ffoPerShare) * 100 : 0),
    yearlyIncome: round2(dividendPerShare * shares),
    totalDividends: round2(dividends),
    totalReturn: round2(endValue + dividends - cost),
  };
};

// --- 2. Gold Investment Calculator (incl. silver) --------------------------------------
export const goldInvestmentCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 10000));
  const spotPrice = Math.max(0.01, safeNumber(values.spotPrice, 3500));
  const premiumPercent = Math.max(0, safeNumber(values.premiumPercent, 4));
  const yearlyFeePercent = Math.max(0, safeNumber(values.yearlyFeePercent, 0.4));
  const priceGrowthPercent = safeNumber(values.priceGrowthPercent, 5);
  const years = Math.max(0, safeNumber(values.years, 10));
  const sellSpreadPercent = Math.max(0, safeNumber(values.sellSpreadPercent, 2));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 28)));

  const ounces = amount / (spotPrice * (1 + premiumPercent / 100));
  const ouncesLeft = ounces * Math.pow(1 - yearlyFeePercent / 100, years);
  const futureSpot = spotPrice * Math.pow(1 + priceGrowthPercent / 100, years);
  const proceeds = ouncesLeft * futureSpot * (1 - sellSpreadPercent / 100);
  const gain = proceeds - amount;
  const tax = Math.max(0, (gain * taxRatePercent) / 100);

  return {
    ouncesBought: Math.round(ounces * 1000) / 1000,
    futurePricePerOunce: round2(futureSpot),
    saleProceeds: round2(proceeds),
    gainBeforeTax: round2(gain),
    tax: round2(tax),
    afterTaxYearlyReturn: round2(annualized(amount, proceeds - tax, years)),
  };
};

// --- 3. Art and Collectibles Investment Calculator (incl. wine) ------------------------
export const artCollectiblesInvestmentCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 20000));
  const buyerPremiumPercent = Math.max(0, safeNumber(values.buyerPremiumPercent, 25));
  const appreciationPercent = safeNumber(values.appreciationPercent, 6);
  const years = Math.max(0, safeNumber(values.years, 10));
  const yearlyCostPercent = Math.max(0, safeNumber(values.yearlyCostPercent, 1));
  const sellCommissionPercent = Math.max(0, safeNumber(values.sellCommissionPercent, 15));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 28)));

  const cost = purchasePrice * (1 + buyerPremiumPercent / 100);
  let value = purchasePrice;
  let holding = 0;
  for (let y = 0; y < Math.round(years); y++) {
    holding += (value * yearlyCostPercent) / 100;
    value *= 1 + appreciationPercent / 100;
  }
  const net = value * (1 - sellCommissionPercent / 100);
  const gain = net - cost;
  const tax = Math.max(0, (gain * taxRatePercent) / 100);
  const afterTax = net - tax - holding;

  return {
    totalPurchaseCost: round2(cost),
    salePrice: round2(value),
    netSaleProceeds: round2(net),
    holdingCosts: round2(holding),
    tax: round2(tax),
    profitAfterAllCosts: round2(afterTax - cost),
    afterTaxYearlyReturn: round2(annualized(cost, afterTax, years)),
  };
};

// --- 4. Farmland Investment Calculator -------------------------------------------------
export const farmlandInvestmentCalculator: CustomCalculator = (values) => {
  const acres = Math.max(0, safeNumber(values.acres, 100));
  const pricePerAcre = Math.max(0, safeNumber(values.pricePerAcre, 8000));
  const cashRentPerAcre = Math.max(0, safeNumber(values.cashRentPerAcre, 250));
  const costsPerAcre = Math.max(0, safeNumber(values.costsPerAcre, 30));
  const appreciationPercent = safeNumber(values.appreciationPercent, 4);
  const years = Math.max(0, safeNumber(values.years, 10));

  const investment = acres * pricePerAcre;
  const income = acres * (cashRentPerAcre - costsPerAcre);
  const value = investment * Math.pow(1 + appreciationPercent / 100, years);

  return {
    investment: round2(investment),
    netIncomePerYear: round2(income),
    cashYield: round2(investment > 0 ? (income / investment) * 100 : 0),
    landValueAfterYears: round2(value),
    totalReturn: round2(value - investment + income * years),
    yearlyTotalReturn: round2(appreciationPercent + (pricePerAcre > 0 ? ((cashRentPerAcre - costsPerAcre) / pricePerAcre) * 100 : 0)),
  };
};

// --- 5. Timberland Investment Calculator -----------------------------------------------
export const timberlandInvestmentCalculator: CustomCalculator = (values) => {
  const acres = Math.max(0, safeNumber(values.acres, 500));
  const pricePerAcre = Math.max(0, safeNumber(values.pricePerAcre, 2500));
  const timberSharePercent = Math.min(100, Math.max(0, safeNumber(values.timberSharePercent, 40)));
  const biologicalGrowthPercent = safeNumber(values.biologicalGrowthPercent, 5);
  const timberPriceChangePercent = safeNumber(values.timberPriceChangePercent, 1);
  const landAppreciationPercent = safeNumber(values.landAppreciationPercent, 2);
  const costPerAcre = Math.max(0, safeNumber(values.costPerAcre, 10));
  const years = Math.max(0, safeNumber(values.years, 15));

  const investment = acres * pricePerAcre;
  const timber0 = (investment * timberSharePercent) / 100;
  const land0 = investment - timber0;
  const timber = timber0 * Math.pow((1 + biologicalGrowthPercent / 100) * (1 + timberPriceChangePercent / 100), years);
  const land = land0 * Math.pow(1 + landAppreciationPercent / 100, years);
  const costs = acres * costPerAcre * years;
  const end = timber + land - costs;

  return {
    investment: round2(investment),
    timberValueAtEnd: round2(timber),
    landValueAtEnd: round2(land),
    totalCosts: round2(costs),
    netValueAtEnd: round2(end),
    yearlyReturn: round2(annualized(investment, end, years)),
  };
};

// --- 6. Oil and Gas Investment Calculator ----------------------------------------------
export const oilGasInvestmentCalculator: CustomCalculator = (values) => {
  const investment = Math.max(0, safeNumber(values.investment, 50000));
  const idcPercent = Math.min(100, Math.max(0, safeNumber(values.idcPercent, 70)));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 37)));
  const firstYearIncome = Math.max(0, safeNumber(values.firstYearIncome, 15000));
  const declinePercent = Math.min(100, Math.max(0, safeNumber(values.declinePercent, 25)));
  const years = Math.max(1, Math.round(safeNumber(values.years, 10)));
  const depletionPercent = Math.min(100, Math.max(0, safeNumber(values.depletionPercent, 15)));

  const t = taxRatePercent / 100;
  const idc = (investment * idcPercent) / 100;
  const tangible = investment - idc;
  let cumulative = -investment;
  let payback = 0;
  let incomeTotal = 0;
  let afterTaxTotal = 0;
  for (let y = 0; y < years; y++) {
    const income = firstYearIncome * Math.pow(1 - declinePercent / 100, y);
    const deductions = (y === 0 ? idc : 0) + (y < 7 ? tangible / 7 : 0);
    const taxable = income * (1 - depletionPercent / 100) - deductions;
    const cash = income - taxable * t;
    incomeTotal += income;
    afterTaxTotal += cash;
    cumulative += cash;
    if (!payback && cumulative >= 0) payback = y + 1;
  }

  return {
    firstYearDeduction: round2(idc + tangible / 7),
    firstYearTaxSavings: round2((idc + tangible / 7) * t),
    totalProductionIncome: round2(incomeTotal),
    afterTaxCashFlow: round2(afterTaxTotal),
    netAfterTaxProfit: round2(afterTaxTotal - investment),
    paybackYear: payback,
  };
};

export const investmentAltRealAssetsCustomCalculators: Record<string, CustomCalculator> = {
  "reit-calculator": reitCalculator,
  "gold-investment-calculator": goldInvestmentCalculator,
  "art-collectibles-investment-calculator": artCollectiblesInvestmentCalculator,
  "farmland-investment-calculator": farmlandInvestmentCalculator,
  "timberland-investment-calculator": timberlandInvestmentCalculator,
  "oil-gas-investment-calculator": oilGasInvestmentCalculator,
};
