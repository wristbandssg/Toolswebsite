/**
 * Batch: "Finance Calculators — Business, Investment & Economics" (14 Oct
 * 2026), sub-batch 2 of 5 — Depreciation, Prices, Fees & Conversions (10
 * tools). See calc-engine-fin-valuation.ts for the full batch context.
 *
 *  - macrsDepreciation: IRS Pub 946 Table A-1 (GDS, half-year convention)
 *    for 3/5/7/10/15/20-year property, after Section 179 and bonus
 *    depreciation. Different from the existing property-/real-estate-
 *    depreciation tools (27.5/39-year buildings, mid-month).
 *  - depreciation: any asset — straight-line, double-declining (200%),
 *    150% declining balance or sum-of-the-years'-digits; declining methods
 *    stop at salvage and take the rest in the final year.
 *  - outTheDoorPrice: a car's total drive-away price — price less dealer
 *    discount, plus add-ons, doc fee, sales tax (trade-in credit optional),
 *    title/registration and fees, less rebates.
 *  - paypalFee: percentage + fixed fee (+1.50% international), the net you
 *    receive, and the amount to ask for to net a target.
 *  - waterBill: base charges + water and sewer volume charges (per 1,000
 *    gallons or per CCF = 748 gallons); usage estimated at 82 gallons a
 *    person a day (USGS) when left at 0.
 *  - inflation: US CPI-U annual averages 1913–2026 (BLS; 2026 is Jan–Aug)
 *    or a flat rate; also purchasing (buying) power — the "Buying Power
 *    Calculator" keyword is merged here.
 *  - sip: monthly SIP with an optional yearly step-up, contributions at
 *    the start of each month: FV = P·((1 + i)^n − 1)/i·(1 + i).
 *  - pricePerSquareFoot: price ÷ area (sq ft or m²), vs a comparable rate.
 *  - millionToBillion: one number shown in thousands, lakhs, millions,
 *    crores, billions and trillions.
 *  - basisPoint: bps <-> % <-> decimal, a rate moved by N bps and the dollar
 *    value of the move on an amount.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin-depreciation-tax-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const roundTo = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;
const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const num = (v: number, d: number) => safeNumber(v, d);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// --- 1. MACRS Depreciation Calculator --------------------------------------------------
// IRS Publication 946, Table A-1: GDS, half-year convention (percent of basis).
const MACRS_HALF_YEAR: Record<number, number[]> = {
  3: [33.33, 44.45, 14.81, 7.41],
  5: [20.0, 32.0, 19.2, 11.52, 11.52, 5.76],
  7: [14.29, 24.49, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46],
  10: [10.0, 18.0, 14.4, 11.52, 9.22, 7.37, 6.55, 6.55, 6.56, 6.55, 3.28],
  15: [5.0, 9.5, 8.55, 7.7, 6.93, 6.23, 5.9, 5.9, 5.91, 5.9, 5.91, 5.9, 5.91, 5.9, 5.91, 2.95],
  20: [3.75, 7.219, 6.677, 6.177, 5.713, 5.285, 4.888, 4.522, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 2.231],
};

export const macrsDepreciationCalculator: CustomCalculator = (values) => {
  const cost = pos(values.cost, 50000);
  const period = [3, 5, 7, 10, 15, 20].includes(num(values.recoveryPeriod, 5)) ? num(values.recoveryPeriod, 5) : 5;
  const table = MACRS_HALF_YEAR[period];
  const s179 = Math.min(cost, pos(values.section179, 0));
  const bonusPct = clamp(num(values.bonusPercent, 0), 0, 100);
  const year = clamp(Math.round(num(values.year, 1)), 1, table.length);
  const afterS179 = cost - s179;
  const bonus = afterS179 * (bonusPct / 100);
  const basis = afterS179 - bonus;
  const yearDep = basis * (table[year - 1] / 100);
  const accumulated = s179 + bonus + basis * (table.slice(0, year).reduce((a, b) => a + b, 0) / 100);
  return {
    macrsBasis: round2(basis),
    bonusDepreciation: round2(bonus),
    depreciationRate: roundTo(table[year - 1], 3),
    depreciationThisYear: round2(yearDep + (year === 1 ? s179 + bonus : 0)),
    firstYearDeduction: round2(s179 + bonus + basis * (table[0] / 100)),
    accumulatedDepreciation: round2(accumulated),
    remainingBasis: round2(Math.max(0, cost - accumulated)),
    taxYears: table.length,
  };
};

// --- 2. Depreciation Calculator --------------------------------------------------------
export const depreciationCalculator: CustomCalculator = (values) => {
  const cost = pos(values.cost, 20000);
  const salvage = Math.min(cost, pos(values.salvageValue, 2000));
  const life = clamp(Math.round(num(values.usefulLife, 5)), 1, 50);
  const method = num(values.method, 1); // 1 SL, 2 DDB, 3 150% DB, 4 SYD
  const year = clamp(Math.round(num(values.year, 1)), 1, life);
  const base = cost - salvage;
  const syd = (life * (life + 1)) / 2;
  let bv = cost;
  let first = 0;
  let yearDep = 0;
  let acc = 0;
  for (let y = 1; y <= life; y++) {
    let d: number;
    if (method === 2 || method === 3) {
      const rate = (method === 2 ? 2 : 1.5) / life;
      d = y === life ? bv - salvage : Math.min(bv * rate, bv - salvage);
    } else if (method === 4) d = (base * (life - y + 1)) / syd;
    else d = base / life;
    d = Math.max(0, d);
    if (y === 1) first = d;
    bv -= d;
    if (y <= year) acc += d;
    if (y === year) yearDep = d;
  }
  return {
    depreciableBase: round2(base),
    depreciationThisYear: round2(yearDep),
    firstYearDepreciation: round2(first),
    accumulatedDepreciation: round2(acc),
    bookValueEndOfYear: round2(cost - acc),
    rateOfCost: round2(cost > 0 ? (yearDep / cost) * 100 : 0),
  };
};

// --- 3. Out The Door Price Calculator --------------------------------------------------
export const outTheDoorPriceCalculator: CustomCalculator = (values) => {
  const price = pos(values.vehiclePrice, 35000);
  const discount = pos(values.dealerDiscount, 1500);
  const addOns = pos(values.addOns, 800);
  const docFee = pos(values.docFee, 499);
  const taxRate = pos(values.salesTaxRate, 7) / 100;
  const tradeIn = pos(values.tradeInValue, 0);
  const payoff = pos(values.tradeInPayoff, 0);
  const credit = num(values.tradeInTaxCredit, 1) === 1;
  const titleReg = pos(values.titleRegistration, 450);
  const otherFees = pos(values.otherFees, 0);
  const rebate = pos(values.rebate, 0);
  const down = pos(values.downPayment, 0);
  const sellingPrice = price - discount + addOns + docFee;
  const taxable = Math.max(0, sellingPrice - (credit ? tradeIn : 0));
  const tax = taxable * taxRate;
  const otd = sellingPrice + tax + titleReg + otherFees - rebate;
  const equity = tradeIn - payoff;
  return {
    taxableAmount: round2(taxable),
    salesTax: round2(tax),
    feesTotal: round2(docFee + titleReg + otherFees),
    outTheDoorPrice: round2(otd),
    tradeInEquity: round2(equity),
    amountToPayOrFinance: round2(Math.max(0, otd - equity - down)),
    overStickerPct: round2(price > 0 ? (otd / price - 1) * 100 : 0),
  };
};

// --- 4. PayPal Fee Calculator ----------------------------------------------------------
// [percent, fixed] — US PayPal merchant fees (Goods & Services / Checkout
// 3.49% + $0.49; Friends & Family funded by card 2.90% + $0.30; Advanced
// Credit & Debit Card 2.89% + $0.49). Option 4 uses the custom fields.
const PAYPAL_RATES: Record<number, [number, number]> = { 1: [3.49, 0.49], 2: [2.9, 0.3], 3: [2.89, 0.49] };

export const paypalFeeCalculator: CustomCalculator = (values) => {
  const amount = pos(values.amount, 100);
  const type = num(values.transactionType, 1);
  const [basePct, fixed] = PAYPAL_RATES[type] ?? [pos(values.customPercent, 3.49), pos(values.customFixed, 0.49)];
  const pct = basePct + (num(values.international, 2) === 1 ? 1.5 : 0);
  const fee = amount > 0 ? (amount * pct) / 100 + fixed : 0;
  const ask = amount > 0 ? (amount + fixed) / (1 - pct / 100) : 0;
  return {
    feeRate: round2(pct),
    fee: round2(fee),
    youReceive: round2(Math.max(0, amount - fee)),
    effectiveFeePct: round2(amount > 0 ? (fee / amount) * 100 : 0),
    amountToAsk: round2(ask),
    feeOnAsk: round2(ask - amount),
  };
};

// --- 5. Water Bill Calculator ----------------------------------------------------------
export const waterBillCalculator: CustomCalculator = (values) => {
  const months = clamp(num(values.billingMonths, 1), 1, 12);
  const unit = num(values.unit, 1); // 1 = per 1,000 gallons, 2 = per CCF
  const people = pos(values.people, 3);
  let usage = pos(values.usage, 0);
  const galPerUnit = unit === 2 ? 748 : 1000;
  if (usage === 0) usage = (people * 82 * 30.4 * months) / galPerUnit;
  const water = usage * pos(values.waterRate, 6.5) + pos(values.waterBase, 20) * months;
  const sewer = usage * pos(values.sewerRate, 9) + pos(values.sewerBase, 15) * months;
  const fees = (water + sewer) * (pos(values.taxesFeesPct, 0) / 100);
  const total = water + sewer + fees;
  const gallons = usage * galPerUnit;
  return {
    usageUnits: round2(usage),
    gallonsUsed: Math.round(gallons),
    waterCharge: round2(water),
    sewerCharge: round2(sewer),
    taxesAndFees: round2(fees),
    totalBill: round2(total),
    monthlyCost: round2(total / months),
    annualCost: round2((total / months) * 12),
    costPerGallon: roundTo(gallons > 0 ? total / gallons : 0, 4),
  };
};

// --- 6. Inflation Calculator -----------------------------------------------------------
// US CPI-U, all items, annual averages 1913–2025 (BLS); 2026 = Jan–Aug average.
const CPI_START = 1913;
const CPI = [
  9.883, 10.017, 10.108, 10.883, 12.825, 15.042, 17.333, 20.042, 17.85, 16.75, 17.05, 17.125, 17.542, 17.7, 17.358, 17.158, 17.158, 16.7, 15.208,
  13.642, 12.933, 13.383, 13.725, 13.867, 14.383, 14.092, 13.908, 14.008, 14.725, 16.333, 17.308, 17.592, 17.992, 19.517, 22.325, 24.042, 23.808,
  24.067, 25.958, 26.55, 26.767, 26.85, 26.775, 27.183, 28.092, 28.858, 29.15, 29.575, 29.892, 30.25, 30.625, 31.017, 31.508, 32.458, 33.358,
  34.783, 36.683, 38.825, 40.492, 41.817, 44.4, 49.308, 53.817, 56.908, 60.608, 65.233, 72.575, 82.408, 90.925, 96.5, 99.6, 103.883, 107.567,
  109.608, 113.625, 118.258, 123.967, 130.658, 136.192, 140.317, 144.458, 148.225, 152.383, 156.85, 160.517, 163.008, 166.575, 172.2, 177.067,
  179.875, 183.958, 188.883, 195.292, 201.592, 207.342, 215.303, 214.537, 218.056, 224.939, 229.594, 232.957, 236.736, 237.017, 240.007, 245.12,
  251.107, 255.657, 258.811, 270.97, 292.655, 304.702, 313.689, 321.943, 331.655,
];
const CPI_END = CPI_START + CPI.length - 1;

export const inflationCalculator: CustomCalculator = (values) => {
  const amount = pos(values.amount, 100);
  const mode = num(values.mode, 1);
  let factor: number;
  let years: number;
  if (mode === 2) {
    years = pos(values.years, 10);
    factor = Math.pow(1 + num(values.inflationRate, 3) / 100, years);
  } else {
    const a = clamp(Math.round(num(values.startYear, 2000)), CPI_START, CPI_END);
    const b = clamp(Math.round(num(values.endYear, CPI_END)), CPI_START, CPI_END);
    years = Math.abs(b - a);
    factor = CPI[b - CPI_START] / CPI[a - CPI_START];
  }
  const avg = years > 0 && factor > 0 ? (Math.pow(factor, 1 / years) - 1) * 100 : 0;
  return {
    adjustedValue: round2(amount * factor),
    cumulativeInflation: round2((factor - 1) * 100),
    averageAnnualInflation: round2(avg),
    purchasingPower: round2(factor > 0 ? amount / factor : 0),
    purchasingPowerChange: round2(factor > 0 ? (1 / factor - 1) * 100 : 0),
    years,
  };
};

// --- 7. SIP Calculator -----------------------------------------------------------------
export const sipCalculator: CustomCalculator = (values) => {
  let p = pos(values.monthlyInvestment, 5000);
  const i = num(values.expectedReturn, 12) / 100 / 12;
  const n = Math.round(pos(values.years, 10) * 12);
  const step = pos(values.annualStepUp, 0) / 100;
  let bal = 0;
  let invested = 0;
  for (let m = 1; m <= n; m++) {
    if (m > 1 && (m - 1) % 12 === 0) p *= 1 + step;
    invested += p;
    bal = (bal + p) * (1 + i);
  }
  return {
    investedAmount: round2(invested),
    estimatedReturns: round2(bal - invested),
    totalValue: round2(bal),
    finalMonthlySip: round2(n > 0 ? p : 0),
    wealthGainedMultiple: round2(invested > 0 ? bal / invested : 0),
  };
};

// --- 8. Price Per Square Foot Calculator -----------------------------------------------
export const pricePerSquareFootCalculator: CustomCalculator = (values) => {
  const price = pos(values.price, 450000);
  const area = pos(values.area, 2000);
  const sqft = num(values.areaUnit, 1) === 2 ? area * 10.7639 : area;
  const comp = pos(values.comparablePricePerSqFt, 0);
  const ppsf = sqft > 0 ? price / sqft : 0;
  return {
    areaSqFt: round2(sqft),
    pricePerSqFt: round2(ppsf),
    pricePerSqM: round2(ppsf * 10.7639),
    valueAtComparableRate: round2(comp * sqft),
    differenceVsComparable: round2(comp > 0 ? (ppsf / comp - 1) * 100 : 0),
  };
};

// --- 9. Million to Billion Converter ---------------------------------------------------
const SCALE: Record<number, number> = { 1: 1, 2: 1e3, 3: 1e5, 4: 1e6, 5: 1e7, 6: 1e9, 7: 1e12 };

export const millionToBillionConverter: CustomCalculator = (values) => {
  const v = num(values.value, 1500) * (SCALE[num(values.fromUnit, 4)] ?? 1e6);
  return {
    fullNumber: v,
    thousands: v / 1e3,
    lakhs: v / 1e5,
    millions: v / 1e6,
    crores: v / 1e7,
    billions: v / 1e9,
    trillions: v / 1e12,
  };
};

// --- 10. Basis Point Calculator --------------------------------------------------------
export const basisPointCalculator: CustomCalculator = (values) => {
  const bps = num(values.basisPoints, 25);
  const base = num(values.baseRate, 4.5);
  const amount = pos(values.amount, 100000);
  const pct = bps / 100;
  return {
    percent: roundTo(pct, 4),
    decimal: roundTo(bps / 10000, 6),
    newRate: roundTo(base + pct, 4),
    relativeChange: round2(base !== 0 ? (pct / base) * 100 : 0),
    yearlyDollarImpact: round2((amount * bps) / 10000),
    valuePerBasisPoint: round2(amount / 10000),
  };
};

export const finDepreciationTaxCustomCalculators: Record<string, CustomCalculator> = {
  "macrs-depreciation-calculator": macrsDepreciationCalculator,
  "depreciation-calculator": depreciationCalculator,
  "out-the-door-price-calculator": outTheDoorPriceCalculator,
  "paypal-fee-calculator": paypalFeeCalculator,
  "water-bill-calculator": waterBillCalculator,
  "inflation-calculator": inflationCalculator,
  "sip-calculator": sipCalculator,
  "price-per-square-foot-calculator": pricePerSquareFootCalculator,
  "million-to-billion-converter": millionToBillionConverter,
  "basis-point-calculator": basisPointCalculator,
};
