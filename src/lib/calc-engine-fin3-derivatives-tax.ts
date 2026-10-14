/**
 * Batch: "Finance Calculators expansion 3" (14 Oct 2026), sub-batch 1 of 10
 * — Derivatives & US Tax (10 tools). The user's 307-keyword list (9 named
 * sub-categories): 94 already built, the rest covered by existing tools,
 * merged, or dropped as expired 2020–21 programmes; 84 new tools in 10
 * sub-batches (`fin3-*`: derivatives-tax 10, pay 8, property 7,
 * homebuying 6, personal 9, debt-retire-sales 8, accounting 9,
 * financial-analysis 8, macro1 10, macro2 9). Each tool is filed in the
 * sub-category the user named (see `category` in each create-fin3-*.ts).
 *
 *  - blackScholes: European call/put with continuous dividend yield, plus
 *    delta, gamma, vega (per 1 vol point), theta (per day) and rho (per 1
 *    point). N(x) from the Abramowitz–Stegun 26.2.17 approximation.
 *  - forwardRate: implied forward rate between two spot rates (annual
 *    compounding and continuous).
 *  - optionsSpread: vertical spreads — bull call, bear put (debit), bull
 *    put, bear call (credit): net premium, max profit/loss, breakeven and
 *    P/L at a chosen expiry price. Different from the existing
 *    options-trading-calculator (one option leg).
 *  - putCallParity: C + K·e^(−rT) = P + S·e^(−qT): implied call and put
 *    and the mispricing.
 *  - amt: 2026 alternative minimum tax — exemption $90,100 / $140,200 /
 *    $70,100, phase-out from $500,000 / $1,000,000 at 50%, 26%/28% split at
 *    $244,500 ($122,250 MFS) — vs regular tax on the 2026 brackets.
 *  - childTaxCredit: 2026 CTC $2,200 per child under 17 (refundable up to
 *    $1,700 via ACTC = 15% of earned income over $2,500), $500 other
 *    dependents, reduced $50 per $1,000 of AGI over $200,000 ($400,000 MFJ).
 *  - magi: MAGI for Roth IRA, ACA premium tax credit or Medicare IRMAA,
 *    with the 2026 Roth phase-out ($153k–$168k single, $242k–$252k MFJ).
 *  - lotteryTax: 24% federal withholding vs the actual 2026 bracket tax on
 *    the prize stacked on other income, plus state tax.
 *  - gstQst: Québec GST 5% + QST 9.975% (14.975%), add or extract.
 *  - futureSalary: salary after N years of raises, in today's dollars, and
 *    total earned.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin3-derivatives-tax-calculators.ts for the copy.
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

/** Standard normal CDF (Abramowitz & Stegun 26.2.17, |error| < 7.5e-8). */
function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}
const normPdf = (x: number) => 0.3989422804014327 * Math.exp((-x * x) / 2);

// 2026 ordinary brackets (Rev. Proc. 2025-32). 1 single, 2 MFJ, 3 HoH, 4 MFS.
const BRACKETS: Record<number, [number, number][]> = {
  1: [[12400, 0.1], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]],
  2: [[24800, 0.1], [100800, 0.12], [211400, 0.22], [403550, 0.24], [512450, 0.32], [768700, 0.35], [Infinity, 0.37]],
  3: [[17700, 0.1], [67450, 0.12], [105700, 0.22], [201775, 0.24], [256200, 0.32], [640600, 0.35], [Infinity, 0.37]],
  4: [[12400, 0.1], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [384350, 0.35], [Infinity, 0.37]],
};
const STD_DEDUCTION: Record<number, number> = { 1: 16100, 2: 32200, 3: 24150, 4: 16100 };

function bracketTax(income: number, status: number): number {
  let tax = 0;
  let prev = 0;
  for (const [top, rate] of BRACKETS[status] ?? BRACKETS[1]) {
    if (income <= prev) break;
    tax += (Math.min(income, top) - prev) * rate;
    prev = top;
  }
  return tax;
}

// --- 1. Black Scholes Calculator -------------------------------------------------------
export const blackScholesCalculator: CustomCalculator = (values) => {
  const s = pos(values.stockPrice, 100);
  const k = pos(values.strikePrice, 105);
  const t = pos(values.daysToExpiry, 90) / 365;
  const r = num(values.riskFreeRate, 4) / 100;
  const sigma = pos(values.volatility, 25) / 100;
  const q = num(values.dividendYield, 0) / 100;
  if (s <= 0 || k <= 0 || t <= 0 || sigma <= 0) return { callPrice: round2(Math.max(0, s - k)), putPrice: round2(Math.max(0, k - s)), callDelta: 0, putDelta: 0, gamma: 0, vegaPerPoint: 0, callThetaPerDay: 0, callRhoPerPoint: 0, d1: 0, d2: 0 };
  const d1 = (Math.log(s / k) + (r - q + (sigma * sigma) / 2) * t) / (sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);
  const dq = Math.exp(-q * t);
  const dr = Math.exp(-r * t);
  const call = s * dq * normCdf(d1) - k * dr * normCdf(d2);
  const put = k * dr * normCdf(-d2) - s * dq * normCdf(-d1);
  const theta = -(s * dq * normPdf(d1) * sigma) / (2 * Math.sqrt(t)) - r * k * dr * normCdf(d2) + q * s * dq * normCdf(d1);
  return {
    callPrice: round2(call),
    putPrice: round2(put),
    callDelta: round4(dq * normCdf(d1)),
    putDelta: round4(dq * (normCdf(d1) - 1)),
    gamma: round4((dq * normPdf(d1)) / (s * sigma * Math.sqrt(t))),
    vegaPerPoint: round4((s * dq * normPdf(d1) * Math.sqrt(t)) / 100),
    callThetaPerDay: round4(theta / 365),
    callRhoPerPoint: round4((k * t * dr * normCdf(d2)) / 100),
    d1: round4(d1),
    d2: round4(d2),
  };
};

// --- 2. Forward Rate Calculator --------------------------------------------------------
export const forwardRateCalculator: CustomCalculator = (values) => {
  const r1 = num(values.shortRate, 4) / 100;
  const t1 = pos(values.shortYears, 1);
  const r2 = num(values.longRate, 4.5) / 100;
  const t2 = pos(values.longYears, 2);
  const span = t2 - t1;
  const fwd = span > 0 ? Math.pow(Math.pow(1 + r2, t2) / Math.pow(1 + r1, t1), 1 / span) - 1 : 0;
  const cont = span > 0 ? (r2 * t2 - r1 * t1) / span : 0;
  return {
    forwardRate: round4(fwd * 100),
    continuousForwardRate: round4(cont * 100),
    forwardPeriodYears: round2(Math.max(0, span)),
  };
};

// --- 3. Options Spread Calculator ------------------------------------------------------
export const optionsSpreadCalculator: CustomCalculator = (values) => {
  const type = num(values.spreadType, 1); // 1 bull call, 2 bear put, 3 bull put, 4 bear call
  const k1 = pos(values.lowerStrike, 100);
  const k2 = Math.max(k1, pos(values.higherStrike, 110));
  const pLow = pos(values.lowerPremium, 6);
  const pHigh = pos(values.higherPremium, 2.5);
  const mult = 100 * Math.max(0, Math.round(pos(values.contracts, 1)));
  const s = pos(values.priceAtExpiry, 108);
  const width = k2 - k1;
  const call = (k: number) => Math.max(0, s - k);
  const put = (k: number) => Math.max(0, k - s);
  let net: number; // + debit, − credit (per share)
  let payoff: number;
  if (type === 2) {
    net = pHigh - pLow;
    payoff = put(k2) - put(k1);
  } else if (type === 3) {
    net = pLow - pHigh;
    payoff = put(k1) - put(k2);
  } else if (type === 4) {
    net = pHigh - pLow;
    payoff = call(k2) - call(k1);
  } else {
    net = pLow - pHigh;
    payoff = call(k1) - call(k2);
  }
  const debit = type === 1 || type === 2;
  const cost = Math.abs(net);
  const maxProfit = debit ? width - cost : cost;
  const maxLoss = debit ? cost : width - cost;
  const breakeven = type === 1 ? k1 + cost : type === 2 ? k2 - cost : type === 3 ? k2 - cost : k1 + cost;
  return {
    netPremium: round2(net * mult),
    maxProfit: round2(maxProfit * mult),
    maxLoss: round2(maxLoss * mult),
    breakeven: round2(breakeven),
    profitAtExpiry: round2((payoff - net) * mult),
    riskRewardRatio: round2(maxProfit > 0 ? maxLoss / maxProfit : 0),
  };
};

// --- 4. Put-Call Parity Calculator -----------------------------------------------------
export const putCallParityCalculator: CustomCalculator = (values) => {
  const s = pos(values.stockPrice, 50);
  const k = pos(values.strikePrice, 50);
  const t = pos(values.daysToExpiry, 180) / 365;
  const r = num(values.riskFreeRate, 4) / 100;
  const q = num(values.dividendYield, 0) / 100;
  const c = pos(values.callPrice, 4.2);
  const p = pos(values.putPrice, 3.5);
  const pvK = k * Math.exp(-r * t);
  const pvS = s * Math.exp(-q * t);
  const gap = c + pvK - (p + pvS);
  return {
    presentValueOfStrike: round2(pvK),
    impliedCallPrice: round2(p + pvS - pvK),
    impliedPutPrice: round2(c + pvK - pvS),
    parityGap: round2(gap),
    // 0 holds (within 1¢), 1 call rich (sell call, buy put + stock), 2 put rich
    mispricing: Math.abs(gap) < 0.01 ? 0 : gap > 0 ? 1 : 2,
  };
};

// --- 5. AMT Calculator -----------------------------------------------------------------
const AMT_EXEMPTION: Record<number, number> = { 1: 90100, 2: 140200, 3: 90100, 4: 70100 };
const AMT_PHASEOUT: Record<number, number> = { 1: 500000, 2: 1000000, 3: 500000, 4: 500000 };

export const amtCalculator: CustomCalculator = (values) => {
  const status = clamp(Math.round(num(values.filingStatus, 1)), 1, 4);
  const taxable = pos(values.taxableIncome, 250000);
  const addBack = num(values.tookStandardDeduction, 2) === 1 ? STD_DEDUCTION[status] : 0;
  const amti = taxable + addBack + pos(values.saltDeduction, 0) + pos(values.isoBargainElement, 120000) + pos(values.privateActivityBondInterest, 0) + num(values.otherAdjustments, 0);
  const exemption = Math.max(0, AMT_EXEMPTION[status] - 0.5 * Math.max(0, amti - AMT_PHASEOUT[status]));
  const base = Math.max(0, amti - exemption);
  const split = status === 4 ? 122250 : 244500;
  const tmt = 0.26 * Math.min(base, split) + 0.28 * Math.max(0, base - split);
  const regular = bracketTax(taxable, status);
  return {
    amti: round2(amti),
    exemption: round2(exemption),
    amtBase: round2(base),
    tentativeMinimumTax: round2(tmt),
    regularTax: round2(regular),
    amtOwed: round2(Math.max(0, tmt - regular)),
    totalTax: round2(Math.max(tmt, regular)),
  };
};

// --- 6. Child Tax Credit Calculator ----------------------------------------------------
export const childTaxCreditCalculator: CustomCalculator = (values) => {
  const status = clamp(Math.round(num(values.filingStatus, 2)), 1, 4);
  const kids = Math.round(pos(values.qualifyingChildren, 2));
  const others = Math.round(pos(values.otherDependents, 0));
  const agi = pos(values.agi, 90000);
  const liability = pos(values.taxBeforeCredits, 6000);
  const earned = pos(values.earnedIncome, 90000);
  const threshold = status === 2 ? 400000 : 200000;
  const full = kids * 2200 + others * 500;
  const reduction = agi > threshold ? 50 * Math.ceil((agi - threshold) / 1000) : 0;
  const allowed = Math.max(0, full - reduction);
  const nonrefundable = Math.min(allowed, liability);
  const childPart = Math.max(0, Math.min(allowed, kids * 2200) - nonrefundable);
  const refundable = Math.min(childPart, kids * 1700, Math.max(0, earned - 2500) * 0.15);
  return {
    creditBeforePhaseOut: full,
    phaseOutReduction: Math.min(full, reduction),
    totalCreditAllowed: round2(allowed),
    nonrefundableUsed: round2(nonrefundable),
    refundableActc: round2(refundable),
    totalBenefit: round2(nonrefundable + refundable),
  };
};

// --- 7. MAGI Calculator ----------------------------------------------------------------
export const magiCalculator: CustomCalculator = (values) => {
  const purpose = num(values.purpose, 1); // 1 Roth IRA, 2 ACA, 3 IRMAA
  const status = num(values.filingStatus, 1) === 2 ? 2 : 1;
  const agi = pos(values.agi, 150000);
  const taxExempt = pos(values.taxExemptInterest, 0);
  const foreign = pos(values.foreignIncomeExcluded, 0);
  const untaxedSs = pos(values.untaxedSocialSecurity, 0);
  const ira = pos(values.iraDeduction, 0);
  const sli = pos(values.studentLoanInterest, 0);
  const conversion = pos(values.rothConversionIncome, 0);
  let magi: number;
  if (purpose === 2) magi = agi + taxExempt + foreign + untaxedSs;
  else if (purpose === 3) magi = agi + taxExempt;
  else magi = agi + foreign + ira + sli - conversion;
  const [lo, hi] = status === 2 ? [242000, 252000] : [153000, 168000];
  const rothShare = magi <= lo ? 1 : magi >= hi ? 0 : (hi - magi) / (hi - lo);
  const limit = pos(values.contributionLimit, 7500);
  return {
    magi: round2(magi),
    addBacks: round2(magi - agi),
    rothAllowedPct: round2(purpose === 1 ? rothShare * 100 : 0),
    rothAllowedContribution: purpose === 1 ? Math.ceil((limit * rothShare) / 10) * 10 : 0,
  };
};

// --- 8. Lottery Tax Calculator ---------------------------------------------------------
export const lotteryTaxCalculator: CustomCalculator = (values) => {
  const prize = pos(values.prize, 100000);
  const other = pos(values.otherTaxableIncome, 60000);
  const status = clamp(Math.round(num(values.filingStatus, 1)), 1, 4);
  const stateRate = pos(values.stateTaxRate, 5) / 100;
  const withheld = prize > 5000 ? prize * 0.24 : 0;
  const fed = bracketTax(other + prize, status) - bracketTax(other, status);
  const state = prize * stateRate;
  return {
    federalWithholding: round2(withheld),
    federalTax: round2(fed),
    additionalFederalOwed: round2(fed - withheld),
    stateTax: round2(state),
    totalTax: round2(fed + state),
    takeHome: round2(prize - fed - state),
    effectiveTaxRate: round2(prize > 0 ? ((fed + state) / prize) * 100 : 0),
  };
};

// --- 9. GST/QST Calculator -------------------------------------------------------------
export const gstQstCalculator: CustomCalculator = (values) => {
  const amount = pos(values.amount, 100);
  const extract = num(values.mode, 1) === 2;
  const before = extract ? amount / 1.14975 : amount;
  const gst = before * 0.05;
  const qst = before * 0.09975;
  return {
    amountBeforeTax: round2(before),
    gst: round2(gst),
    qst: round2(qst),
    totalTax: round2(gst + qst),
    totalWithTax: round2(before + gst + qst),
  };
};

// --- 10. Future Salary Calculator ------------------------------------------------------
export const futureSalaryCalculator: CustomCalculator = (values) => {
  const salary = pos(values.currentSalary, 60000);
  const raise = num(values.annualRaise, 3) / 100;
  const years = Math.max(0, Math.round(pos(values.years, 10)));
  const infl = num(values.inflation, 2.5) / 100;
  const future = salary * Math.pow(1 + raise, years);
  let total = 0;
  for (let y = 1; y <= years; y++) total += salary * Math.pow(1 + raise, y);
  const real = future / Math.pow(1 + infl, years);
  return {
    futureSalary: round2(future),
    futureSalaryTodaysDollars: round2(real),
    totalIncrease: round2(future - salary),
    realGrowthPct: round2(salary > 0 ? (real / salary - 1) * 100 : 0),
    totalEarnedOverPeriod: round2(total),
  };
};

export const fin3DerivativesTaxCustomCalculators: Record<string, CustomCalculator> = {
  "black-scholes-calculator": blackScholesCalculator,
  "forward-rate-calculator": forwardRateCalculator,
  "options-spread-calculator": optionsSpreadCalculator,
  "put-call-parity-calculator": putCallParityCalculator,
  "amt-calculator": amtCalculator,
  "child-tax-credit-calculator": childTaxCreditCalculator,
  "magi-calculator": magiCalculator,
  "lottery-tax-calculator": lotteryTaxCalculator,
  "gst-qst-calculator": gstQstCalculator,
  "future-salary-calculator": futureSalaryCalculator,
};
