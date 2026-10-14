/**
 * Batch: "Finance Calculators expansion 2" (14 Oct 2026), sub-batch 1 of 9 —
 * Indian Investing & Market Tools (10 tools). The user's 186-keyword list
 * (5 named sub-categories): 34 already built, 64 covered by an existing tool
 * or merged, 88 new tools in 9 sub-batches (`fin2-*`: investing 10,
 * web-saas 10, workforce 9, business-costs 10, business-analysis 10,
 * performance 10, equity-valuation 10, equity-returns 10, debt 9). Each tool
 * is filed in the sub-category the user named (see `category` in each
 * create-fin2-*.ts ToolDef).
 *
 *  - ppf: India Public Provident Fund — yearly deposits (₹500–₹1.5 lakh)
 *    made by 5 April, interest compounded yearly at the notified rate
 *    (7.1% for 2025–26), 15-year term extendable in 5-year blocks.
 *  - swp: systematic withdrawal plan — the corpus grows monthly, then the
 *    month's withdrawal is taken; final value, months it lasts and the
 *    largest withdrawal that lasts the whole period.
 *  - lumpsum: one-time mutual fund investment, FV = P(1 + r)^n (yearly
 *    compounding, as Indian fund-house calculators use), plus the value in
 *    today's money. Different from the existing lump-sum-savings-calculator
 *    (tax on bank interest).
 *  - bitcoinEtf: a spot bitcoin ETF position from BTC's price move less the
 *    expense ratio, vs buying BTC directly with a one-off trading fee.
 *  - nav: (assets − liabilities) ÷ units, premium/discount to market price.
 *  - freeFloat: shares available to trade after promoter, insider,
 *    government and strategic holdings; float market cap.
 *  - marketCap: shares × price with the size bands (mega ≥ $200B, large
 *    $10–200B, mid $2–10B, small $300M–2B, micro $50–300M, nano < $50M).
 *  - stockSplit: forward or reverse split — new shares and price, with cash
 *    in lieu of fractional shares.
 *  - carriedInterest: private-fund carry after an 8% hurdle, with full GP
 *    catch-up or none (European, whole-fund waterfall).
 *  - movingAverage: SMA and EMA (seeded with the first SMA,
 *    α = 2 ÷ (n + 1)) over up to 12 prices, price vs average.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin2-investing-calculators.ts for the copy.
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
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// --- 1. PPF Calculator -----------------------------------------------------------------
export const ppfCalculator: CustomCalculator = (values) => {
  const deposit = clamp(pos(values.yearlyDeposit, 150000), 0, 150000);
  const r = num(values.interestRate, 7.1) / 100;
  const years = clamp(Math.round(num(values.years, 15)), 15, 50);
  let bal = 0;
  for (let y = 1; y <= years; y++) bal = (bal + deposit) * (1 + r);
  const invested = deposit * years;
  return {
    investedAmount: round2(invested),
    totalInterest: round2(bal - invested),
    maturityValue: round2(bal),
    years,
  };
};

// --- 2. SWP Calculator -----------------------------------------------------------------
export const swpCalculator: CustomCalculator = (values) => {
  const corpus = pos(values.totalInvestment, 1000000);
  const w = pos(values.monthlyWithdrawal, 10000);
  const i = num(values.expectedReturn, 8) / 100 / 12;
  const n = Math.round(pos(values.years, 10) * 12);
  let bal = corpus;
  let withdrawn = 0;
  let lasted = n;
  for (let m = 1; m <= n; m++) {
    bal *= 1 + i;
    if (bal >= w) {
      bal -= w;
      withdrawn += w;
    } else {
      withdrawn += bal;
      bal = 0;
      lasted = m;
      break;
    }
  }
  const maxW = n > 0 ? (i === 0 ? corpus / n : (corpus * i) / (1 - Math.pow(1 + i, -n))) : 0;
  return {
    totalWithdrawn: round2(withdrawn),
    finalValue: round2(Math.max(0, bal)),
    monthsLasted: lasted,
    maxSustainableWithdrawal: round2(maxW),
  };
};

// --- 3. Lumpsum Calculator -------------------------------------------------------------
export const lumpsumCalculator: CustomCalculator = (values) => {
  const p = pos(values.investment, 100000);
  const r = num(values.expectedReturn, 12) / 100;
  const n = pos(values.years, 10);
  const infl = num(values.inflation, 6) / 100;
  const fv = p * Math.pow(1 + r, n);
  return {
    investedAmount: round2(p),
    estimatedReturns: round2(fv - p),
    totalValue: round2(fv),
    valueInTodaysMoney: round2(fv / Math.pow(1 + infl, n)),
    multiple: round2(p > 0 ? fv / p : 0),
  };
};

// --- 4. Bitcoin ETF Calculator ---------------------------------------------------------
export const bitcoinEtfCalculator: CustomCalculator = (values) => {
  const inv = pos(values.investment, 10000);
  const p0 = pos(values.btcPriceNow, 100000);
  const p1 = pos(values.btcPriceFuture, 150000);
  const er = pos(values.expenseRatio, 0.25) / 100;
  const years = pos(values.years, 3);
  const fee = pos(values.directBuyFee, 1.5) / 100;
  const growth = p0 > 0 ? p1 / p0 : 0;
  const gross = inv * growth;
  const etf = gross * Math.pow(1 - er, years);
  const direct = inv * (1 - fee) * growth;
  return {
    btcPriceChange: round2((growth - 1) * 100),
    etfValue: round2(etf),
    etfGain: round2(etf - inv),
    feesPaid: round2(gross - etf),
    directBtcValue: round2(direct),
    etfMinusDirect: round2(etf - direct),
  };
};

// --- 5. NAV Calculator -----------------------------------------------------------------
export const navCalculator: CustomCalculator = (values) => {
  const assets = pos(values.totalAssets, 105000000);
  const liabilities = pos(values.totalLiabilities, 5000000);
  const units = pos(values.unitsOutstanding, 4000000);
  const price = pos(values.marketPrice, 0);
  const nav = units > 0 ? (assets - liabilities) / units : 0;
  return {
    netAssets: round2(assets - liabilities),
    navPerUnit: Math.round(nav * 10000) / 10000,
    premiumDiscount: round2(price > 0 && nav > 0 ? (price / nav - 1) * 100 : 0),
  };
};

// --- 6. Free Float Calculator ----------------------------------------------------------
export const freeFloatCalculator: CustomCalculator = (values) => {
  const total = pos(values.sharesOutstanding, 100000000);
  const locked = pos(values.promoterShares, 45000000) + pos(values.insiderShares, 5000000) + pos(values.governmentShares, 0) + pos(values.strategicShares, 0);
  const free = Math.max(0, total - locked);
  const price = pos(values.sharePrice, 25);
  return {
    restrictedShares: Math.min(total, locked),
    freeFloatShares: free,
    freeFloatPct: round2(total > 0 ? (free / total) * 100 : 0),
    marketCap: round2(total * price),
    freeFloatMarketCap: round2(free * price),
  };
};

// --- 7. Market Capitalization Calculator -----------------------------------------------
export const marketCapCalculator: CustomCalculator = (values) => {
  const cap = pos(values.sharesOutstanding, 2500000000) * pos(values.sharePrice, 80);
  const b = cap / 1e9;
  return {
    marketCap: round2(cap),
    marketCapBillions: round2(b),
    // 1 mega, 2 large, 3 mid, 4 small, 5 micro, 6 nano
    sizeClass: b >= 200 ? 1 : b >= 10 ? 2 : b >= 2 ? 3 : b >= 0.3 ? 4 : b >= 0.05 ? 5 : 6,
  };
};

// --- 8. Stock Split Calculator ---------------------------------------------------------
export const stockSplitCalculator: CustomCalculator = (values) => {
  const shares = pos(values.sharesOwned, 150);
  const price = pos(values.priceBeforeSplit, 600);
  const newPer = pos(values.newShares, 4);
  const oldPer = pos(values.oldShares, 1);
  const ratio = oldPer > 0 ? newPer / oldPer : 1;
  const exact = shares * ratio;
  const whole = Math.floor(exact + 1e-9);
  const newPrice = ratio > 0 ? price / ratio : 0;
  return {
    splitRatio: Math.round(ratio * 10000) / 10000,
    sharesAfterSplit: whole,
    priceAfterSplit: round2(newPrice),
    cashInLieu: round2((exact - whole) * newPrice),
    positionValue: round2(shares * price),
  };
};

// --- 9. Carried Interest Calculator ----------------------------------------------------
export const carriedInterestCalculator: CustomCalculator = (values) => {
  const capital = pos(values.capitalInvested, 100000000);
  const proceeds = pos(values.totalProceeds, 250000000);
  const hurdle = pos(values.hurdleRate, 8) / 100;
  const years = pos(values.years, 6);
  const carryPct = pos(values.carryPercent, 20) / 100;
  const catchUp = num(values.catchUp, 1) === 1;
  const profit = proceeds - capital;
  const pref = capital * (Math.pow(1 + hurdle, years) - 1);
  let carry = 0;
  if (profit > pref) carry = catchUp ? Math.min(profit - pref, carryPct * profit) : carryPct * (profit - pref);
  const lpProceeds = proceeds - carry;
  return {
    totalProfit: round2(profit),
    preferredReturn: round2(pref),
    gpCarry: round2(carry),
    lpProfit: round2(lpProceeds - capital),
    lpMultiple: round2(capital > 0 ? lpProceeds / capital : 0),
    effectiveCarryPct: round2(profit > 0 ? (carry / profit) * 100 : 0),
  };
};

// --- 10. Moving Average Calculator -----------------------------------------------------
export const movingAverageCalculator: CustomCalculator = (values) => {
  const prices: number[] = [];
  for (let k = 1; k <= 12; k++) {
    const p = pos(values[`price${k}`], 0);
    if (p > 0) prices.push(p);
  }
  const n = clamp(Math.round(num(values.period, 5)), 2, 12);
  if (prices.length < n) return { sma: 0, previousSma: 0, ema: 0, latestPrice: 0, priceVsSma: 0, trend: 0, pricesUsed: prices.length };
  const last = prices.length;
  const avg = (end: number) => prices.slice(end - n, end).reduce((a, b) => a + b, 0) / n;
  const sma = avg(last);
  const prev = last > n ? avg(last - 1) : 0;
  const alpha = 2 / (n + 1);
  let ema = avg(n);
  for (let k = n; k < last; k++) ema = prices[k] * alpha + ema * (1 - alpha);
  const latest = prices[last - 1];
  return {
    sma: round2(sma),
    previousSma: round2(prev),
    ema: round2(ema),
    latestPrice: round2(latest),
    priceVsSma: round2(sma > 0 ? (latest / sma - 1) * 100 : 0),
    // 1 price above the SMA, 2 below
    trend: latest >= sma ? 1 : 2,
    pricesUsed: last,
  };
};

export const fin2InvestingCustomCalculators: Record<string, CustomCalculator> = {
  "ppf-calculator": ppfCalculator,
  "swp-calculator": swpCalculator,
  "lumpsum-calculator": lumpsumCalculator,
  "bitcoin-etf-calculator": bitcoinEtfCalculator,
  "nav-calculator": navCalculator,
  "free-float-calculator": freeFloatCalculator,
  "market-capitalization-calculator": marketCapCalculator,
  "stock-split-calculator": stockSplitCalculator,
  "carried-interest-calculator": carriedInterestCalculator,
  "moving-average-calculator": movingAverageCalculator,
};
