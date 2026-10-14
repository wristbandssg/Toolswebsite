/**
 * Batch: "Finance Calculators expansion 3" (14 Oct 2026), sub-batch 7 of 10
 * — Accounting & Profit Measures (9 tools). See
 * calc-engine-fin3-derivatives-tax.ts for the full batch context.
 *
 *  - economicProfit (incl. "Accounting Profit"): accounting profit =
 *    revenue − explicit costs; economic profit = that − implicit costs
 *    (owner's forgone salary + forgone return on capital).
 *  - accrualRatio: balance-sheet method ΔNOA ÷ average NOA and cash-flow
 *    method (NI − CFO − CFI) ÷ average NOA (Sloan / CFA).
 *  - actualCashValue: replacement cost − straight-line depreciation by age
 *    (with a salvage floor), less the deductible, vs a replacement-cost
 *    policy.
 *  - ebt: EBIT − interest + other income = EBT, tax and net income.
 *  - goodwill: purchase price + non-controlling interest − fair value of
 *    net identifiable assets (negative = bargain purchase gain).
 *  - retainedEarnings: beginning + net income − dividends.
 *  - netDebt: debt + leases − cash and liquid investments; net debt ÷
 *    EBITDA.
 *  - productivity: output per labour hour and per worker, multifactor
 *    productivity, change vs a prior period.
 *  - degreeOfOperatingLeverage: contribution margin ÷ EBIT and the EBIT
 *    change for a given sales change.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin3-accounting-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;
const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const num = (v: number, d: number) => safeNumber(v, d);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// --- 1. Economic Profit Calculator -----------------------------------------------------
export const economicProfitCalculator: CustomCalculator = (values) => {
  const revenue = pos(values.revenue, 250000);
  const explicit = pos(values.explicitCosts, 150000);
  const salary = pos(values.forgoneSalary, 70000);
  const capital = pos(values.capitalInvested, 100000);
  const r = num(values.alternativeReturn, 6) / 100;
  const implicit = salary + capital * r;
  const accounting = revenue - explicit;
  return {
    accountingProfit: round2(accounting),
    implicitCosts: round2(implicit),
    economicProfit: round2(accounting - implicit),
    normalProfit: round2(implicit),
    // 1 above normal profit (economic profit > 0), 2 normal, 3 economic loss
    verdict: accounting - implicit > 0.005 ? 1 : accounting - implicit < -0.005 ? 3 : 2,
  };
};

// --- 2. Accrual Ratio Calculator -------------------------------------------------------
export const accrualRatioCalculator: CustomCalculator = (values) => {
  const ni = num(values.netIncome, 5000000);
  const cfo = num(values.operatingCashFlow, 4200000);
  const cfi = num(values.investingCashFlow, -1500000);
  const noa0 = num(values.noaBeginning, 40000000);
  const noa1 = num(values.noaEnd, 43000000);
  const avg = (noa0 + noa1) / 2;
  return {
    averageNoa: round2(avg),
    balanceSheetAccrualRatio: round2(avg !== 0 ? ((noa1 - noa0) / avg) * 100 : 0),
    cashFlowAccrualRatio: round2(avg !== 0 ? ((ni - cfo - cfi) / avg) * 100 : 0),
    aggregateAccruals: round2(ni - cfo - cfi),
  };
};

// --- 3. Actual Cash Value Calculator ---------------------------------------------------
export const actualCashValueCalculator: CustomCalculator = (values) => {
  const rc = pos(values.replacementCost, 2000);
  const age = pos(values.ageYears, 4);
  const life = Math.max(0.1, pos(values.usefulLifeYears, 8));
  const floor = clamp(pos(values.salvageFloorPercent, 10), 0, 100) / 100;
  const deductible = pos(values.deductible, 500);
  const depPct = Math.min(1 - floor, age / life);
  const acv = rc * (1 - depPct);
  return {
    depreciationPct: round2(depPct * 100),
    depreciation: round2(rc * depPct),
    actualCashValue: round2(acv),
    acvPayout: round2(Math.max(0, acv - deductible)),
    replacementCostPayout: round2(Math.max(0, rc - deductible)),
  };
};

// --- 4. EBT Calculator -----------------------------------------------------------------
export const ebtCalculator: CustomCalculator = (values) => {
  const revenue = pos(values.revenue, 2000000);
  const cogs = pos(values.cogs, 1100000);
  const opex = pos(values.operatingExpenses, 500000);
  const interest = pos(values.interestExpense, 60000);
  const other = num(values.otherIncome, 10000);
  const t = clamp(pos(values.taxRate, 21), 0, 100) / 100;
  const ebit = revenue - cogs - opex;
  const ebt = ebit - interest + other;
  const tax = Math.max(0, ebt) * t;
  return {
    ebit: round2(ebit),
    ebt: round2(ebt),
    ebtMargin: round2(revenue > 0 ? (ebt / revenue) * 100 : 0),
    incomeTax: round2(tax),
    netIncome: round2(ebt - tax),
  };
};

// --- 5. Goodwill Calculator ------------------------------------------------------------
export const goodwillCalculator: CustomCalculator = (values) => {
  const price = pos(values.purchasePrice, 50000000);
  const assets = pos(values.fairValueAssets, 60000000);
  const liabilities = pos(values.fairValueLiabilities, 22000000);
  const nci = pos(values.nonControllingInterest, 0);
  const net = assets - liabilities;
  const gw = price + nci - net;
  return {
    netIdentifiableAssets: round2(net),
    goodwill: round2(Math.max(0, gw)),
    bargainPurchaseGain: round2(Math.max(0, -gw)),
    goodwillShareOfPrice: round2(price > 0 ? (Math.max(0, gw) / price) * 100 : 0),
  };
};

// --- 6. Retained Earnings Calculator ---------------------------------------------------
export const retainedEarningsCalculator: CustomCalculator = (values) => {
  const begin = num(values.beginningRetainedEarnings, 800000);
  const ni = num(values.netIncome, 250000);
  const cash = pos(values.cashDividends, 60000);
  const stock = pos(values.stockDividends, 0);
  const end = begin + ni - cash - stock;
  return {
    endingRetainedEarnings: round2(end),
    changeInRetainedEarnings: round2(end - begin),
    retentionRatio: round2(ni > 0 ? ((ni - cash - stock) / ni) * 100 : 0),
  };
};

// --- 7. Net Debt Calculator ------------------------------------------------------------
export const netDebtCalculator: CustomCalculator = (values) => {
  const debt = pos(values.shortTermDebt, 150000000) + pos(values.longTermDebt, 900000000) + pos(values.leaseLiabilities, 0);
  const cash = pos(values.cash, 300000000) + pos(values.marketableSecurities, 50000000);
  const ebitda = num(values.ebitda, 400000000);
  const net = debt - cash;
  return {
    totalDebt: round2(debt),
    cashAndEquivalents: round2(cash),
    netDebt: round2(net),
    netDebtToEbitda: round2(ebitda > 0 ? net / ebitda : 0),
  };
};

// --- 8. Productivity Calculator --------------------------------------------------------
export const productivityCalculator: CustomCalculator = (values) => {
  const output = pos(values.output, 12000);
  const hours = pos(values.laborHours, 1600);
  const workers = pos(values.workers, 10);
  const inputs = pos(values.laborCost, 48000) + pos(values.materialCost, 30000) + pos(values.overheadCost, 12000);
  const prior = pos(values.priorOutputPerHour, 0);
  const perHour = hours > 0 ? output / hours : 0;
  return {
    outputPerHour: round4(perHour),
    outputPerWorker: round2(workers > 0 ? output / workers : 0),
    multifactorProductivity: round4(inputs > 0 ? output / inputs : 0),
    changeVsPrior: round2(prior > 0 ? (perHour / prior - 1) * 100 : 0),
  };
};

// --- 9. Degree of Operating Leverage Calculator ----------------------------------------
export const degreeOfOperatingLeverageCalculator: CustomCalculator = (values) => {
  const sales = pos(values.sales, 1000000);
  const variable = pos(values.variableCosts, 600000);
  const fixed = pos(values.fixedCosts, 250000);
  const change = num(values.salesChangePercent, 10);
  const cm = sales - variable;
  const ebit = cm - fixed;
  const dol = ebit !== 0 ? cm / ebit : 0;
  return {
    contributionMargin: round2(cm),
    ebit: round2(ebit),
    dol: round4(dol),
    ebitChangePercent: round2(dol * change),
    projectedEbit: round2(ebit * (1 + (dol * change) / 100)),
  };
};

export const fin3AccountingCustomCalculators: Record<string, CustomCalculator> = {
  "economic-profit-calculator": economicProfitCalculator,
  "accrual-ratio-calculator": accrualRatioCalculator,
  "actual-cash-value-calculator": actualCashValueCalculator,
  "ebt-calculator": ebtCalculator,
  "goodwill-calculator": goodwillCalculator,
  "retained-earnings-calculator": retainedEarningsCalculator,
  "net-debt-calculator": netDebtCalculator,
  "productivity-calculator": productivityCalculator,
  "degree-of-operating-leverage-calculator": degreeOfOperatingLeverageCalculator,
};
