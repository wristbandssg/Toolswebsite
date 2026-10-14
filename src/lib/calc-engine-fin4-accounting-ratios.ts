/**
 * Batch: "Finance Calculators expansion 4" (14 Oct 2026), sub-batch 3 of 3 —
 * Bookkeeping, Time Value & Ratio Sets (10 tools). See
 * calc-engine-fin4-india-uk.ts for the full batch context.
 *
 * The five ratio-set tools are deliberately different from the single-ratio
 * tools already on the site (current-ratio, quick-ratio, debt-to-equity,
 * net-profit-margin, inventory-turnover…): each takes one set of statement
 * figures and returns the whole family of ratios at once.
 *
 *  - roundMoney: nearest / up / down to a cent, dime, dollar, $5, $10 or
 *    $100.
 *  - futureValueOfCashFlows: uneven yearly deposits grown to a horizon —
 *    Σ CFt (1 + r)^(N − t) — with their present value. Different from the
 *    existing future-value-of-annuity-calculator (equal payments).
 *  - unitsOfProduction (incl. "Activity Method"): (cost − salvage) ÷ total
 *    units × units used this period.
 *  - addingMachine (incl. "10-Key" and "Money Math"): total, count, average,
 *    largest and smallest of up to 20 entries.
 *  - checkbookBalance (incl. "Running Total"): starting balance plus up to
 *    10 deposits/withdrawals, ending and lowest running balance.
 *  - stockRatios, liquidityRatios, debtRatios, profitabilityRatios,
 *    operationsRatios.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin4-accounting-ratios-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const num = (v: number, d: number) => safeNumber(v, d);
const ratio = (a: number, b: number) => (b !== 0 ? round2(a / b) : 0);
const pct = (a: number, b: number) => (b !== 0 ? round2((a / b) * 100) : 0);

// --- 1. Round to Nearest Dollar or Cent ------------------------------------------------
const STEPS: Record<number, number> = { 1: 0.01, 2: 0.1, 3: 1, 4: 5, 5: 10, 6: 100 };

export const roundMoneyCalculator: CustomCalculator = (values) => {
  const amount = num(values.amount, 1234.5678);
  const step = STEPS[num(values.roundTo, 3)] ?? 1;
  const mode = num(values.direction, 1); // 1 nearest, 2 up, 3 down
  const units = amount / step;
  const k = mode === 2 ? Math.ceil(units - 1e-9) : mode === 3 ? Math.floor(units + 1e-9) : Math.round(units);
  const rounded = Math.round(k * step * 100) / 100;
  return { roundedAmount: rounded, difference: round2(rounded - amount) };
};

// --- 2. Future Value of Cash Flows Calculator ------------------------------------------
export const futureValueOfCashFlowsCalculator: CustomCalculator = (values) => {
  const r = num(values.rate, 6) / 100;
  const horizon = Math.max(1, Math.round(pos(values.horizonYears, 5)));
  let fv = pos(values.initialDeposit, 0) * Math.pow(1 + r, horizon);
  let deposits = pos(values.initialDeposit, 0);
  for (let t = 1; t <= 10; t++) {
    const cf = num(values[`cf${t}`], 0);
    if (t > horizon) continue;
    fv += cf * Math.pow(1 + r, horizon - t);
    deposits += cf;
  }
  return {
    futureValue: round2(fv),
    totalDeposited: round2(deposits),
    interestEarned: round2(fv - deposits),
    presentValue: round2(fv / Math.pow(1 + r, horizon)),
  };
};

// --- 3. Units of Production Depreciation Calculator ------------------------------------
export const unitsOfProductionCalculator: CustomCalculator = (values) => {
  const cost = pos(values.cost, 60000);
  const salvage = Math.min(cost, pos(values.salvageValue, 5000));
  const totalUnits = pos(values.totalUnits, 200000);
  const used = pos(values.unitsThisPeriod, 30000);
  const prior = pos(values.unitsUsedBefore, 0);
  const rate = totalUnits > 0 ? (cost - salvage) / totalUnits : 0;
  const remainingUnits = Math.max(0, totalUnits - prior);
  const dep = rate * Math.min(used, remainingUnits);
  const acc = rate * Math.min(totalUnits, prior + used);
  return {
    depreciationPerUnit: Math.round(rate * 10000) / 10000,
    depreciationThisPeriod: round2(dep),
    accumulatedDepreciation: round2(acc),
    bookValue: round2(cost - acc),
    unitsRemaining: Math.max(0, totalUnits - prior - used),
  };
};

// --- 4. Adding Machine Calculator ------------------------------------------------------
export const addingMachineCalculator: CustomCalculator = (values) => {
  const xs: number[] = [];
  for (let k = 1; k <= 20; k++) {
    const v = num(values[`entry${k}`], 0);
    if (v !== 0) xs.push(v);
  }
  const total = xs.reduce((a, b) => a + b, 0);
  return {
    total: round2(total),
    entries: xs.length,
    average: round2(xs.length ? total / xs.length : 0),
    largest: round2(xs.length ? Math.max(...xs) : 0),
    smallest: round2(xs.length ? Math.min(...xs) : 0),
    totalWithTax: round2(total * (1 + pos(values.taxRate, 0) / 100)),
  };
};

// --- 5. Checkbook Balance Calculator ---------------------------------------------------
export const checkbookBalanceCalculator: CustomCalculator = (values) => {
  let bal = num(values.startingBalance, 1500);
  let lowest = bal;
  let deposits = 0;
  let withdrawals = 0;
  for (let k = 1; k <= 10; k++) {
    const t = num(values[`transaction${k}`], 0);
    if (t > 0) deposits += t;
    else withdrawals -= t;
    bal += t;
    lowest = Math.min(lowest, bal);
  }
  return {
    totalDeposits: round2(deposits),
    totalWithdrawals: round2(withdrawals),
    endingBalance: round2(bal),
    lowestRunningBalance: round2(lowest),
    overdrawn: lowest < 0 ? 1 : 0,
  };
};

// --- 6. Stock Ratios Calculator --------------------------------------------------------
export const stockRatiosCalculator: CustomCalculator = (values) => {
  const price = pos(values.sharePrice, 60);
  const eps = num(values.eps, 4);
  const dps = pos(values.dividendsPerShare, 1.5);
  const bvps = num(values.bookValuePerShare, 25);
  const sps = pos(values.salesPerShare, 40);
  return {
    peRatio: eps > 0 ? ratio(price, eps) : 0,
    earningsYield: pct(eps, price),
    dividendYield: pct(dps, price),
    payoutRatio: eps > 0 ? pct(dps, eps) : 0,
    priceToBook: bvps > 0 ? ratio(price, bvps) : 0,
    priceToSales: ratio(price, sps),
  };
};

// --- 7. Liquidity Ratios Calculator ----------------------------------------------------
export const liquidityRatiosCalculator: CustomCalculator = (values) => {
  const ca = pos(values.currentAssets, 500000);
  const inv = pos(values.inventory, 150000);
  const prepaid = pos(values.prepaidExpenses, 10000);
  const cash = pos(values.cashAndSecurities, 120000);
  const cl = pos(values.currentLiabilities, 250000);
  const ocf = num(values.operatingCashFlow, 180000);
  return {
    currentRatio: ratio(ca, cl),
    quickRatio: ratio(ca - inv - prepaid, cl),
    cashRatio: ratio(cash, cl),
    operatingCashFlowRatio: ratio(ocf, cl),
    workingCapital: round2(ca - cl),
  };
};

// --- 8. Debt Ratios Calculator ---------------------------------------------------------
export const debtRatiosCalculator: CustomCalculator = (values) => {
  const assets = pos(values.totalAssets, 1000000);
  const liabilities = pos(values.totalLiabilities, 550000);
  const debt = pos(values.totalDebt, 400000);
  const equity = num(values.shareholdersEquity, 450000);
  const ebit = num(values.ebit, 150000);
  const interest = pos(values.interestExpense, 25000);
  const ebitda = num(values.ebitda, 190000);
  const service = pos(values.annualDebtService, 80000);
  return {
    debtRatio: pct(liabilities, assets),
    debtToEquity: equity > 0 ? ratio(debt, equity) : 0,
    equityRatio: pct(equity, assets),
    interestCoverage: ratio(ebit, interest),
    debtToEbitda: ebitda > 0 ? ratio(debt, ebitda) : 0,
    debtServiceCoverage: ratio(ebitda, service),
  };
};

// --- 9. Profitability Ratios Calculator ------------------------------------------------
export const profitabilityRatiosCalculator: CustomCalculator = (values) => {
  const revenue = pos(values.revenue, 2000000);
  const cogs = pos(values.cogs, 1200000);
  const op = num(values.operatingIncome, 300000);
  const ni = num(values.netIncome, 200000);
  const assets = pos(values.totalAssets, 1600000);
  const equity = num(values.shareholdersEquity, 800000);
  return {
    grossMargin: pct(revenue - cogs, revenue),
    operatingMargin: pct(op, revenue),
    netMargin: pct(ni, revenue),
    returnOnAssets: pct(ni, assets),
    returnOnEquity: equity > 0 ? pct(ni, equity) : 0,
  };
};

// --- 10. Operations Ratios Calculator --------------------------------------------------
export const operationsRatiosCalculator: CustomCalculator = (values) => {
  const revenue = pos(values.revenue, 2000000);
  const cogs = pos(values.cogs, 1200000);
  const assets = pos(values.averageTotalAssets, 1600000);
  const inv = pos(values.averageInventory, 200000);
  const ar = pos(values.averageReceivables, 250000);
  const ap = pos(values.averagePayables, 150000);
  const invTurn = inv > 0 ? cogs / inv : 0;
  const arTurn = ar > 0 ? revenue / ar : 0;
  const apTurn = ap > 0 ? cogs / ap : 0;
  const dio = invTurn > 0 ? 365 / invTurn : 0;
  const dso = arTurn > 0 ? 365 / arTurn : 0;
  const dpo = apTurn > 0 ? 365 / apTurn : 0;
  return {
    assetTurnover: ratio(revenue, assets),
    inventoryTurnover: round2(invTurn),
    daysInventoryOutstanding: round2(dio),
    receivablesTurnover: round2(arTurn),
    daysSalesOutstanding: round2(dso),
    payablesTurnover: round2(apTurn),
    daysPayableOutstanding: round2(dpo),
    cashConversionCycle: round2(dio + dso - dpo),
  };
};

export const fin4AccountingRatiosCustomCalculators: Record<string, CustomCalculator> = {
  "round-to-nearest-dollar-or-cent-calculator": roundMoneyCalculator,
  "future-value-of-cash-flows-calculator": futureValueOfCashFlowsCalculator,
  "units-of-production-depreciation-calculator": unitsOfProductionCalculator,
  "adding-machine-calculator": addingMachineCalculator,
  "checkbook-balance-calculator": checkbookBalanceCalculator,
  "stock-ratios-calculator": stockRatiosCalculator,
  "liquidity-ratios-calculator": liquidityRatiosCalculator,
  "debt-ratios-calculator": debtRatiosCalculator,
  "profitability-ratios-calculator": profitabilityRatiosCalculator,
  "operations-ratios-calculator": operationsRatiosCalculator,
};
