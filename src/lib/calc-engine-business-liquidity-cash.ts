/**
 * Batch: "Business Finance Calculators" sub-batch G (Liquidity & Cash Flow,
 * 12 tools). Part of the Business Finance build-out — see
 * calc-engine-business-profit.ts for the full list of 11 sub-batches.
 * Filed under Finance Calculators > Business Finance Calculators.
 *
 * Near-namesakes, and how each is deliberately different (cash-flow-
 * calculator already nets one period's inflows and outflows):
 *  - workingCapitalCalculator: working capital from an itemized balance
 *    sheet (cash, receivables, inventory; payables, short-term debt).
 *  - workingCapitalRatioCalculator: the ratio, working capital as a % of
 *    revenue, and the assets needed to reach a target ratio.
 *  - currentRatioCalculator: the ratio NOW and after using cash to pay
 *    down part of current liabilities (a common lender test).
 *  - quickRatioCalculator: the acid test — only cash, marketable securities
 *    and receivables.
 *  - cashRatioCalculator: cash-only ratio plus days of cash on hand.
 *  - cashConversionCycleCalculator: CCC from inventory, receivable and
 *    payable DAYS, and the cash tied up in it.
 *  - operatingCashFlowCalculator: indirect method — net income + non-cash
 *    items ± working-capital changes.
 *  - freeCashFlowCalculator: operating cash flow − capital spending, FCF
 *    margin and per share.
 *  - cashBurnRateCalculator: gross and net burn from monthly spending and
 *    revenue.
 *  - cashRunwayCalculator: months of runway now and after cutting burn.
 *  - cashFlowForecastCalculator: a 12-month forecast with growing inflows
 *    and outflows — lowest balance and the month cash runs out.
 *  - cashFlowBreakEvenCalculator: the month a growing business stops
 *    burning cash.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-business-liquidity-cash-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const ratio = (a: number, b: number) => (b > 0 ? round2(a / b) : 0);

// --- 1. Working Capital Calculator (itemized) -----------------------------
export const workingCapitalCalculator: CustomCalculator = (values) => {
  const cash = Math.max(0, safeNumber(values.cash, 60000));
  const accountsReceivable = Math.max(0, safeNumber(values.accountsReceivable, 85000));
  const inventory = Math.max(0, safeNumber(values.inventory, 70000));
  const otherCurrentAssets = Math.max(0, safeNumber(values.otherCurrentAssets, 10000));
  const accountsPayable = Math.max(0, safeNumber(values.accountsPayable, 65000));
  const shortTermDebt = Math.max(0, safeNumber(values.shortTermDebt, 40000));
  const otherCurrentLiabilities = Math.max(0, safeNumber(values.otherCurrentLiabilities, 20000));

  const ca = cash + accountsReceivable + inventory + otherCurrentAssets;
  const cl = accountsPayable + shortTermDebt + otherCurrentLiabilities;

  return {
    workingCapital: round2(ca - cl),
    currentAssets: round2(ca),
    currentLiabilities: round2(cl),
    currentRatio: ratio(ca, cl),
  };
};

// --- 2. Working Capital Ratio Calculator ----------------------------------
export const workingCapitalRatioCalculator: CustomCalculator = (values) => {
  const currentAssets = Math.max(0, safeNumber(values.currentAssets, 225000));
  const currentLiabilities = Math.max(0, safeNumber(values.currentLiabilities, 150000));
  const annualRevenue = Math.max(0, safeNumber(values.annualRevenue, 900000));
  const targetRatio = Math.max(0, safeNumber(values.targetRatio, 2));

  return {
    workingCapitalRatio: ratio(currentAssets, currentLiabilities),
    workingCapital: round2(currentAssets - currentLiabilities),
    workingCapitalPercentOfRevenue: annualRevenue > 0 ? round2(((currentAssets - currentLiabilities) / annualRevenue) * 100) : 0,
    extraCurrentAssetsForTarget: round2(Math.max(0, targetRatio * currentLiabilities - currentAssets)),
  };
};

// --- 3. Current Ratio Calculator (before/after paying down liabilities) ---
export const currentRatioCalculator: CustomCalculator = (values) => {
  const currentAssets = Math.max(0, safeNumber(values.currentAssets, 180000));
  const currentLiabilities = Math.max(0, safeNumber(values.currentLiabilities, 150000));
  const cashUsedToPayLiabilities = Math.max(0, safeNumber(values.cashUsedToPayLiabilities, 50000));

  const pay = Math.min(cashUsedToPayLiabilities, currentAssets, currentLiabilities);

  return {
    currentRatio: ratio(currentAssets, currentLiabilities),
    currentRatioAfterPaydown: ratio(currentAssets - pay, currentLiabilities - pay),
    workingCapital: round2(currentAssets - currentLiabilities),
  };
};

// --- 4. Quick Ratio Calculator (acid test) --------------------------------
export const quickRatioCalculator: CustomCalculator = (values) => {
  const cash = Math.max(0, safeNumber(values.cash, 40000));
  const marketableSecurities = Math.max(0, safeNumber(values.marketableSecurities, 15000));
  const accountsReceivable = Math.max(0, safeNumber(values.accountsReceivable, 65000));
  const inventory = Math.max(0, safeNumber(values.inventory, 90000));
  const currentLiabilities = Math.max(0, safeNumber(values.currentLiabilities, 110000));

  const quick = cash + marketableSecurities + accountsReceivable;

  return {
    quickRatio: ratio(quick, currentLiabilities),
    quickAssets: round2(quick),
    currentRatioIncludingInventory: ratio(quick + inventory, currentLiabilities),
    shortfallToReach1: round2(Math.max(0, currentLiabilities - quick)),
  };
};

// --- 5. Cash Ratio Calculator (+ days of cash) ------------------------------
export const cashRatioCalculator: CustomCalculator = (values) => {
  const cashAndEquivalents = Math.max(0, safeNumber(values.cashAndEquivalents, 55000));
  const currentLiabilities = Math.max(0, safeNumber(values.currentLiabilities, 125000));
  const annualOperatingExpenses = Math.max(0, safeNumber(values.annualOperatingExpenses, 730000));

  return {
    cashRatio: ratio(cashAndEquivalents, currentLiabilities),
    daysOfCashOnHand: annualOperatingExpenses > 0 ? round2(cashAndEquivalents / (annualOperatingExpenses / 365)) : 0,
    cashShortOfLiabilities: round2(Math.max(0, currentLiabilities - cashAndEquivalents)),
  };
};

// --- 6. Cash Conversion Cycle Calculator (from days) --------------------
export const cashConversionCycleCalculator: CustomCalculator = (values) => {
  const daysInventoryOutstanding = Math.max(0, safeNumber(values.daysInventoryOutstanding, 55));
  const daysSalesOutstanding = Math.max(0, safeNumber(values.daysSalesOutstanding, 40));
  const daysPayableOutstanding = Math.max(0, safeNumber(values.daysPayableOutstanding, 35));
  const annualRevenue = Math.max(0, safeNumber(values.annualRevenue, 1460000));

  const ccc = daysInventoryOutstanding + daysSalesOutstanding - daysPayableOutstanding;

  return {
    cashConversionCycleDays: round2(ccc),
    operatingCycleDays: round2(daysInventoryOutstanding + daysSalesOutstanding),
    cashTiedUpInCycle: round2(Math.max(0, ccc) * (annualRevenue / 365)),
    cashFreedPerDayCut: round2(annualRevenue / 365),
  };
};

// --- 7. Operating Cash Flow Calculator (indirect method) -----------------
export const operatingCashFlowCalculator: CustomCalculator = (values) => {
  const netIncome = safeNumber(values.netIncome, 90000);
  const depreciationAmortization = Math.max(0, safeNumber(values.depreciationAmortization, 25000));
  const otherNonCashItems = safeNumber(values.otherNonCashItems, 5000);
  const increaseInReceivables = safeNumber(values.increaseInReceivables, 12000);
  const increaseInInventory = safeNumber(values.increaseInInventory, 8000);
  const increaseInPayables = safeNumber(values.increaseInPayables, 6000);

  const wcChange = -increaseInReceivables - increaseInInventory + increaseInPayables;
  const ocf = netIncome + depreciationAmortization + otherNonCashItems + wcChange;

  return {
    operatingCashFlow: round2(ocf),
    workingCapitalEffect: round2(wcChange),
    nonCashAddBacks: round2(depreciationAmortization + otherNonCashItems),
    cashConversionOfProfitPercent: netIncome !== 0 ? round2((ocf / netIncome) * 100) : 0,
  };
};

// --- 8. Free Cash Flow Calculator ---------------------------------------------
export const freeCashFlowCalculator: CustomCalculator = (values) => {
  const operatingCashFlow = safeNumber(values.operatingCashFlow, 180000);
  const capitalExpenditures = Math.max(0, safeNumber(values.capitalExpenditures, 60000));
  const revenue = Math.max(0, safeNumber(values.revenue, 1200000));
  const sharesOutstanding = Math.max(0, safeNumber(values.sharesOutstanding, 100000));

  const fcf = operatingCashFlow - capitalExpenditures;

  return {
    freeCashFlow: round2(fcf),
    freeCashFlowMarginPercent: revenue > 0 ? round2((fcf / revenue) * 100) : 0,
    freeCashFlowPerShare: sharesOutstanding > 0 ? round2(fcf / sharesOutstanding) : 0,
    capexShareOfOperatingCashPercent: operatingCashFlow > 0 ? round2((capitalExpenditures / operatingCashFlow) * 100) : 0,
  };
};

// --- 9. Cash Burn Rate Calculator ----------------------------------------------
export const cashBurnRateCalculator: CustomCalculator = (values) => {
  const monthlyOperatingExpenses = Math.max(0, safeNumber(values.monthlyOperatingExpenses, 85000));
  const monthlyRevenue = Math.max(0, safeNumber(values.monthlyRevenue, 30000));
  const cashBalance = Math.max(0, safeNumber(values.cashBalance, 900000));

  const net = monthlyOperatingExpenses - monthlyRevenue;

  return {
    netBurnPerMonth: round2(Math.max(0, net)),
    grossBurnPerMonth: round2(monthlyOperatingExpenses),
    netBurnPerYear: round2(Math.max(0, net) * 12),
    // 0 = not burning cash.
    runwayMonths: net > 0 ? round2(cashBalance / net) : 0,
  };
};

// --- 10. Cash Runway Calculator (with a burn cut) ---------------------------
export const cashRunwayCalculator: CustomCalculator = (values) => {
  const cashBalance = Math.max(0, safeNumber(values.cashBalance, 750000));
  const monthlyNetBurn = Math.max(0, safeNumber(values.monthlyNetBurn, 60000));
  const burnCutPercent = Math.min(100, Math.max(0, safeNumber(values.burnCutPercent, 20)));
  const minimumCashBuffer = Math.max(0, safeNumber(values.minimumCashBuffer, 100000));

  const cutBurn = monthlyNetBurn * (1 - burnCutPercent / 100);
  const usable = Math.max(0, cashBalance - minimumCashBuffer);

  return {
    // 0 = no burn, so cash isn't running down.
    runwayMonths: monthlyNetBurn > 0 ? round2(cashBalance / monthlyNetBurn) : 0,
    runwayAfterBurnCut: cutBurn > 0 ? round2(cashBalance / cutBurn) : 0,
    runwayBeforeHittingBuffer: monthlyNetBurn > 0 ? round2(usable / monthlyNetBurn) : 0,
    monthlySavingsFromCut: round2(monthlyNetBurn - cutBurn),
  };
};

// --- 11. Cash Flow Forecast Calculator (12 months) ------------------------
export const cashFlowForecastCalculator: CustomCalculator = (values) => {
  const startingCash = safeNumber(values.startingCash, 50000);
  const monthlyInflows = Math.max(0, safeNumber(values.monthlyInflows, 40000));
  const monthlyOutflows = Math.max(0, safeNumber(values.monthlyOutflows, 44000));
  const inflowGrowthPercent = safeNumber(values.inflowGrowthPercent, 2);
  const outflowGrowthPercent = safeNumber(values.outflowGrowthPercent, 1);

  let cash = startingCash;
  let lowest = startingCash;
  let lowestMonth = 0;
  let runsOutMonth = 0;
  for (let m = 1; m <= 12; m++) {
    const inflow = monthlyInflows * Math.pow(1 + inflowGrowthPercent / 100, m - 1);
    const outflow = monthlyOutflows * Math.pow(1 + outflowGrowthPercent / 100, m - 1);
    cash += inflow - outflow;
    if (cash < lowest) {
      lowest = cash;
      lowestMonth = m;
    }
    if (cash < 0 && !runsOutMonth) runsOutMonth = m;
  }

  return {
    cashAfter12Months: round2(cash),
    lowestCashBalance: round2(lowest),
    monthOfLowestBalance: lowestMonth,
    // 0 = cash never goes negative in the 12 months.
    monthCashRunsOut: runsOutMonth,
    netCashFlowOver12Months: round2(cash - startingCash),
  };
};

// --- 12. Cash Flow Break-Even Calculator ------------------------------------
export const cashFlowBreakEvenCalculator: CustomCalculator = (values) => {
  const monthlyFixedCashCosts = Math.max(0, safeNumber(values.monthlyFixedCashCosts, 45000));
  const grossMarginPercent = Math.min(100, Math.max(0.1, safeNumber(values.grossMarginPercent, 60)));
  const currentMonthlyRevenue = Math.max(0, safeNumber(values.currentMonthlyRevenue, 50000));
  const monthlyRevenueGrowthPercent = Math.max(0, safeNumber(values.monthlyRevenueGrowthPercent, 5));
  const cashBalance = Math.max(0, safeNumber(values.cashBalance, 200000));

  const needed = monthlyFixedCashCosts / (grossMarginPercent / 100);
  const g = monthlyRevenueGrowthPercent / 100;
  let months = 0;
  let burned = 0;
  if (currentMonthlyRevenue < needed) {
    months = 1200;
    let rev = currentMonthlyRevenue;
    for (let m = 1; m <= 1200; m++) {
      burned += monthlyFixedCashCosts - rev * (grossMarginPercent / 100);
      rev *= 1 + g;
      if (rev >= needed) {
        months = m;
        break;
      }
    }
  }

  return {
    revenueNeededToBreakEven: round2(needed),
    // 1200 = not within 100 years at this growth.
    monthsToCashFlowBreakEven: months,
    cashBurnedBeforeBreakEven: round2(burned),
    // Negative = you'd run out of cash before breaking even.
    cashLeftAtBreakEven: round2(cashBalance - burned),
  };
};

export const businessLiquidityCashCustomCalculators: Record<string, CustomCalculator> = {
  "working-capital-calculator": workingCapitalCalculator,
  "working-capital-ratio-calculator": workingCapitalRatioCalculator,
  "current-ratio-calculator": currentRatioCalculator,
  "quick-ratio-calculator": quickRatioCalculator,
  "cash-ratio-calculator": cashRatioCalculator,
  "cash-conversion-cycle-calculator": cashConversionCycleCalculator,
  "operating-cash-flow-calculator": operatingCashFlowCalculator,
  "free-cash-flow-calculator": freeCashFlowCalculator,
  "cash-burn-rate-calculator": cashBurnRateCalculator,
  "cash-runway-calculator": cashRunwayCalculator,
  "cash-flow-forecast-calculator": cashFlowForecastCalculator,
  "cash-flow-break-even-calculator": cashFlowBreakEvenCalculator,
};
