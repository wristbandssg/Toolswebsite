/**
 * Batch: "Finance Calculators expansion 2" (14 Oct 2026), sub-batch 4 of 9 —
 * Business Costs & Budgeting (10 tools). See calc-engine-fin2-investing.ts
 * for the full batch context.
 *
 *  - threeDPrinterBuyVsOutsource: own cost per print (printer write-off,
 *    filament, electricity, maintenance) vs a print service, break-even.
 *    Different from buildVsBuy (software / capability decision over years).
 *  - buildVsBuy: present value of build (upfront + yearly upkeep) vs buy
 *    (setup + yearly licence) over N years; the year buying overtakes.
 *  - businessBudget: monthly revenue, COGS %, operating expenses and tax
 *    -> operating and net profit, break-even revenue.
 *  - costFunction (incl. "Average Fixed Cost"): TC = FC + vQ + cQ² ->
 *    TVC, AFC, AVC, ATC and MC = v + 2cQ.
 *  - costOfDoingBusiness: overhead as % of revenue, cost per billable hour
 *    and per workday, break-even hourly rate.
 *  - directMaterialPriceVariance: (AP − SP) × AQ, quantity variance
 *    (AQ used − SQ) × SP, favourable/unfavourable.
 *  - priceQuantity: total = unit price × quantity (solve any one) and a
 *    second offer's unit price for comparison.
 *  - lemonadeStand: revenue, ingredient cost per cup, setup cost, profit,
 *    hourly earnings and break-even cups.
 *  - parkingRatio: spaces per 1,000 sq ft vs a typical ratio for the use.
 *  - effectiveCorporateTaxRate: tax expense ÷ pre-tax income vs the 21%
 *    federal + state statutory rate (state deductible), cash tax rate.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin2-business-costs-calculators.ts for the copy.
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

// --- 1. 3D Printer Buy vs Outsource Calculator -----------------------------------------
export const threeDPrinterCalculator: CustomCalculator = (values) => {
  const printer = pos(values.printerCost, 800);
  const life = Math.max(0.5, pos(values.lifespanYears, 3));
  const prints = Math.max(1, pos(values.printsPerYear, 200));
  const filament = (pos(values.gramsPerPrint, 60) / 1000) * pos(values.filamentPerKg, 25);
  const power = (pos(values.printerWatts, 150) / 1000) * pos(values.printHours, 4) * pos(values.electricityRate, 0.17);
  const maint = pos(values.maintenancePerYear, 60);
  const variable = filament + power;
  const own = printer / life / prints + maint / prints + variable;
  const out = pos(values.outsourcePrice, 20);
  const unitSaving = out - variable - maint / prints;
  return {
    filamentCostPerPrint: round2(filament),
    electricityCostPerPrint: round2(power),
    ownCostPerPrint: round2(own),
    yearlyOwnCost: round2(own * prints),
    yearlyOutsourceCost: round2(out * prints),
    yearlySavings: round2((out - own) * prints),
    breakEvenPrints: unitSaving > 0 ? Math.ceil(printer / unitSaving) : 0,
  };
};

// --- 2. Build vs Buy Calculator --------------------------------------------------------
export const buildVsBuyCalculator: CustomCalculator = (values) => {
  const years = Math.max(1, Math.round(pos(values.years, 5)));
  const r = num(values.discountRate, 8) / 100;
  const b0 = pos(values.buildUpfront, 250000);
  const bYr = pos(values.buildAnnual, 40000);
  const p0 = pos(values.buyUpfront, 20000);
  const pYr = pos(values.buyAnnual, 70000);
  let build = b0;
  let buy = p0;
  let cumBuild = b0;
  let cumBuy = p0;
  let crossover = 0;
  for (let y = 1; y <= years; y++) {
    const df = Math.pow(1 + r, -y);
    build += bYr * df;
    buy += pYr * df;
    cumBuild += bYr;
    cumBuy += pYr;
    if (!crossover && cumBuild <= cumBuy) crossover = y;
  }
  return {
    buildTotalCost: round2(b0 + bYr * years),
    buyTotalCost: round2(p0 + pYr * years),
    buildPresentCost: round2(build),
    buyPresentCost: round2(buy),
    // 1 build, 2 buy
    cheaperOption: build <= buy ? 1 : 2,
    presentValueSavings: round2(Math.abs(buy - build)),
    yearBuildBreaksEven: crossover,
  };
};

// --- 3. Business Budget Calculator -----------------------------------------------------
export const businessBudgetCalculator: CustomCalculator = (values) => {
  const revenue = pos(values.monthlyRevenue, 50000);
  const cogsPct = pos(values.cogsPercent, 40) / 100;
  const opex =
    pos(values.rent, 4000) + pos(values.payroll, 18000) + pos(values.marketing, 2500) + pos(values.utilities, 800) +
    pos(values.software, 600) + pos(values.insurance, 500) + pos(values.otherExpenses, 1500);
  const gross = revenue * (1 - cogsPct);
  const operating = gross - opex;
  const tax = Math.max(0, operating) * (pos(values.taxRate, 21) / 100);
  const net = operating - tax;
  return {
    grossProfit: round2(gross),
    operatingExpenses: round2(opex),
    operatingProfit: round2(operating),
    incomeTax: round2(tax),
    netProfit: round2(net),
    netMargin: round2(revenue > 0 ? (net / revenue) * 100 : 0),
    breakEvenRevenue: round2(cogsPct < 1 ? opex / (1 - cogsPct) : 0),
    yearlyNetProfit: round2(net * 12),
  };
};

// --- 4. Cost Function Calculator -------------------------------------------------------
export const costFunctionCalculator: CustomCalculator = (values) => {
  const fc = pos(values.fixedCost, 5000);
  const v = pos(values.variableCost, 12);
  const c = num(values.quadraticTerm, 0);
  const q = pos(values.quantity, 500);
  const tvc = v * q + c * q * q;
  const tc = fc + tvc;
  return {
    totalCost: round2(tc),
    totalVariableCost: round2(tvc),
    averageFixedCost: round2(q > 0 ? fc / q : 0),
    averageVariableCost: round2(q > 0 ? tvc / q : 0),
    averageTotalCost: round2(q > 0 ? tc / q : 0),
    marginalCost: round2(v + 2 * c * q),
  };
};

// --- 5. Cost of Doing Business Calculator ----------------------------------------------
export const costOfDoingBusinessCalculator: CustomCalculator = (values) => {
  const expenses = pos(values.operatingExpenses, 180000);
  const owner = pos(values.ownerSalary, 70000);
  const revenue = pos(values.annualRevenue, 320000);
  const hours = pos(values.billableHours, 1400);
  const workdays = Math.max(1, pos(values.workdays, 250));
  const total = expenses + owner;
  return {
    totalCost: round2(total),
    costOfDoingBusinessPct: round2(revenue > 0 ? (total / revenue) * 100 : 0),
    costPerBillableHour: round2(hours > 0 ? total / hours : 0),
    costPerWorkday: round2(total / workdays),
    profit: round2(revenue - total),
  };
};

// --- 6. Direct Material Price Variance Calculator --------------------------------------
export const directMaterialPriceVarianceCalculator: CustomCalculator = (values) => {
  const ap = pos(values.actualPrice, 5.4);
  const sp = pos(values.standardPrice, 5);
  const aq = pos(values.actualQuantityPurchased, 10000);
  const used = pos(values.actualQuantityUsed, 0);
  const sq = pos(values.standardQuantityAllowed, 0);
  const price = (ap - sp) * aq;
  const qty = used > 0 || sq > 0 ? (used - sq) * sp : 0;
  return {
    priceVariance: round2(price),
    // 1 favourable, 2 unfavourable, 0 none
    priceVarianceType: price < 0 ? 1 : price > 0 ? 2 : 0,
    quantityVariance: round2(qty),
    quantityVarianceType: qty < 0 ? 1 : qty > 0 ? 2 : 0,
    pricePerUnitDifference: round2(ap - sp),
  };
};

// --- 7. Price / Quantity Calculator ----------------------------------------------------
export const priceQuantityCalculator: CustomCalculator = (values) => {
  const solve = num(values.solveFor, 1); // 1 total, 2 unit price, 3 quantity
  let total = pos(values.totalPrice, 0);
  let unit = pos(values.unitPrice, 2.5);
  let qty = pos(values.quantity, 12);
  if (solve === 2) unit = qty > 0 ? total / qty : 0;
  else if (solve === 3) qty = unit > 0 ? total / unit : 0;
  else total = unit * qty;
  const cTotal = pos(values.compareTotal, 0);
  const cQty = pos(values.compareQuantity, 0);
  const cUnit = cQty > 0 ? cTotal / cQty : 0;
  return {
    totalPrice: round2(total),
    unitPrice: Math.round(unit * 10000) / 10000,
    quantity: Math.round(qty * 1000) / 1000,
    compareUnitPrice: Math.round(cUnit * 10000) / 10000,
    savingsVsCompare: round2(cUnit > 0 ? (1 - unit / cUnit) * 100 : 0),
  };
};

// --- 8. Lemonade Stand Calculator ------------------------------------------------------
export const lemonadeStandCalculator: CustomCalculator = (values) => {
  const cups = pos(values.cupsSold, 60);
  const price = pos(values.pricePerCup, 1.5);
  const perCup = pos(values.lemonsCostPerCup, 0.25) + pos(values.sugarCostPerCup, 0.05) + pos(values.cupCost, 0.1) + pos(values.iceCostPerCup, 0.05);
  const setup = pos(values.setupCost, 15);
  const hours = pos(values.hoursWorked, 4);
  const revenue = cups * price;
  const costs = cups * perCup + setup;
  const profit = revenue - costs;
  const margin = price - perCup;
  return {
    revenue: round2(revenue),
    costPerCup: round2(perCup),
    totalCosts: round2(costs),
    profit: round2(profit),
    profitPerCup: round2(cups > 0 ? profit / cups : 0),
    hourlyEarnings: round2(hours > 0 ? profit / hours : 0),
    breakEvenCups: margin > 0 ? Math.ceil(setup / margin - 1e-9) : 0,
  };
};

// --- 9. Parking Ratio Calculator -------------------------------------------------------
const TYPICAL_RATIO: Record<number, number> = { 1: 4, 2: 5, 3: 5, 4: 1.5, 5: 10, 6: 3 };

export const parkingRatioCalculator: CustomCalculator = (values) => {
  const spaces = pos(values.parkingSpaces, 180);
  const area = pos(values.buildingArea, 50000);
  const typical = TYPICAL_RATIO[num(values.propertyType, 1)] ?? 4;
  const ratio = area > 0 ? spaces / (area / 1000) : 0;
  const required = Math.ceil((area / 1000) * typical - 1e-9);
  return {
    spacesPer1000SqFt: round2(ratio),
    squareFeetPerSpace: round2(spaces > 0 ? area / spaces : 0),
    typicalRatio: typical,
    spacesAtTypicalRatio: required,
    surplusOrShortfall: spaces - required,
  };
};

// --- 10. Effective Corporate Tax Rate Calculator ---------------------------------------
export const effectiveCorporateTaxRateCalculator: CustomCalculator = (values) => {
  const pretax = num(values.pretaxIncome, 2000000);
  const expense = num(values.taxExpense, 460000);
  const cash = pos(values.cashTaxesPaid, 0);
  const state = pos(values.stateRate, 5) / 100;
  const statutory = 0.21 + state * (1 - 0.21);
  const eff = pretax > 0 ? expense / pretax : 0;
  return {
    effectiveTaxRate: round2(eff * 100),
    statutoryRate: round2(statutory * 100),
    differenceVsStatutory: round2((eff - statutory) * 100),
    cashTaxRate: round2(pretax > 0 ? (cash / pretax) * 100 : 0),
    netIncome: round2(pretax - expense),
  };
};

export const fin2BusinessCostsCustomCalculators: Record<string, CustomCalculator> = {
  "3d-printer-buy-vs-outsource-calculator": threeDPrinterCalculator,
  "build-vs-buy-calculator": buildVsBuyCalculator,
  "business-budget-calculator": businessBudgetCalculator,
  "cost-function-calculator": costFunctionCalculator,
  "cost-of-doing-business-calculator": costOfDoingBusinessCalculator,
  "direct-material-price-variance-calculator": directMaterialPriceVarianceCalculator,
  "price-quantity-calculator": priceQuantityCalculator,
  "lemonade-stand-calculator": lemonadeStandCalculator,
  "parking-ratio-calculator": parkingRatioCalculator,
  "effective-corporate-tax-rate-calculator": effectiveCorporateTaxRateCalculator,
};
