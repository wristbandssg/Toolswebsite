/**
 * Batch: "Interest Calculators" expansion (5 Oct 2026), sub-batch 6 of 9 —
 * Bonds (7 tools), filed under Investment Calculators. See
 * calc-engine-interest-methods.ts for the full batch context.
 *
 *  - bondInterest: coupon per payment, yearly and total interest, current
 *    yield at the price paid.
 *  - treasuryBill: price from the bank discount rate (360-day), interest
 *    earned, and the investment (bond-equivalent) yield on 365 days.
 *  - bondYieldToMaturity: YTM solved from price, coupon and maturity;
 *    current yield.
 *  - interestRateSensitivity: Macaulay and modified duration, convexity,
 *    and the price change for a yield move (estimated and exact).
 *  - sukukProfitRate: periodic profit distributions and the yield on the
 *    price paid (same math as a bond's YTM; profit, not interest).
 *  - seriesIBond: composite rate = fixed + 2 x semiannual inflation +
 *    fixed x semiannual inflation; compounds semiannually; 3-month
 *    interest penalty before 5 years.
 *  - seriesEeBond (incl. savings bonds generally): fixed rate compounding
 *    semiannually, guaranteed to double at 20 years.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-investment-bonds-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function bondPrice(face: number, couponPercent: number, yieldPercent: number, years: number, freq: number): number {
  const n = Math.max(1, Math.round(years * freq));
  const c = (face * couponPercent) / 100 / freq;
  const j = yieldPercent / 100 / freq;
  if (j === 0) return c * n + face;
  return (c * (1 - Math.pow(1 + j, -n))) / j + face * Math.pow(1 + j, -n);
}

function solveYield(price: number, face: number, couponPercent: number, years: number, freq: number): number {
  if (price <= 0 || face <= 0) return 0;
  let lo = -50;
  let hi = 100;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (bondPrice(face, couponPercent, mid, years, freq) > price) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function freqOf(v: number): number {
  const f = Math.round(v);
  return [1, 2, 4, 12].includes(f) ? f : 2;
}

// --- 1. Bond Interest Calculator -------------------------------------------------------
export const bondInterestCalculator: CustomCalculator = (values) => {
  const faceValue = Math.max(0, safeNumber(values.faceValue, 10000));
  const couponPercent = Math.max(0, safeNumber(values.couponPercent, 5));
  const freq = freqOf(safeNumber(values.paymentsPerYear, 2));
  const yearsToMaturity = Math.max(0, safeNumber(values.yearsToMaturity, 10));
  const pricePercent = Math.max(0, safeNumber(values.pricePercent, 97));

  const yearly = (faceValue * couponPercent) / 100;
  const price = (faceValue * pricePercent) / 100;

  return {
    interestPerPayment: round2(yearly / freq),
    interestPerYear: round2(yearly),
    totalInterestToMaturity: round2(yearly * yearsToMaturity),
    pricePaid: round2(price),
    currentYield: round2(price > 0 ? (yearly / price) * 100 : 0),
  };
};

// --- 2. Treasury Bill Calculator -------------------------------------------------------
export const treasuryBillCalculator: CustomCalculator = (values) => {
  const faceValue = Math.max(0, safeNumber(values.faceValue, 10000));
  const discountRatePercent = Math.max(0, safeNumber(values.discountRatePercent, 3.9));
  const days = Math.max(1, Math.round(safeNumber(values.days, 182)));

  const price = Math.max(0, faceValue * (1 - (discountRatePercent / 100) * (days / 360)));
  const interest = faceValue - price;

  return {
    purchasePrice: round2(price),
    interestEarned: round2(interest),
    investmentYield: round2(price > 0 ? (interest / price) * (365 / days) * 100 : 0),
    pricePer100: round2(faceValue > 0 ? (price / faceValue) * 100 : 0),
  };
};

// --- 3. Bond Yield to Maturity Calculator ----------------------------------------------
export const bondYieldToMaturityCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 950));
  const faceValue = Math.max(0, safeNumber(values.faceValue, 1000));
  const couponPercent = Math.max(0, safeNumber(values.couponPercent, 5));
  const yearsToMaturity = Math.max(0.25, safeNumber(values.yearsToMaturity, 8));
  const freq = freqOf(safeNumber(values.paymentsPerYear, 2));

  const ytm = solveYield(price, faceValue, couponPercent, yearsToMaturity, freq);
  const coupons = (faceValue * couponPercent * yearsToMaturity) / 100;

  return {
    yieldToMaturity: round2(ytm),
    currentYield: round2(price > 0 ? ((faceValue * couponPercent) / 100 / price) * 100 : 0),
    totalCouponIncome: round2(coupons),
    gainOrLossAtMaturity: round2(faceValue - price),
    totalReturnIfHeld: round2(coupons + faceValue - price),
  };
};

// --- 4. Interest Rate Sensitivity Calculator -------------------------------------------
export const interestRateSensitivityCalculator: CustomCalculator = (values) => {
  const faceValue = Math.max(0, safeNumber(values.faceValue, 1000));
  const couponPercent = Math.max(0, safeNumber(values.couponPercent, 4));
  const yieldPercent = Math.max(0, safeNumber(values.yieldPercent, 4.5));
  const yearsToMaturity = Math.max(0.25, safeNumber(values.yearsToMaturity, 10));
  const freq = freqOf(safeNumber(values.paymentsPerYear, 2));
  const changeBps = safeNumber(values.changeBps, 100);

  const n = Math.max(1, Math.round(yearsToMaturity * freq));
  const c = (faceValue * couponPercent) / 100 / freq;
  const j = yieldPercent / 100 / freq;
  let price = 0;
  let weighted = 0;
  let convex = 0;
  for (let t = 1; t <= n; t++) {
    const cf = c + (t === n ? faceValue : 0);
    const pv = cf / Math.pow(1 + j, t);
    price += pv;
    weighted += t * pv;
    convex += t * (t + 1) * pv;
  }
  const macaulay = price > 0 ? weighted / price / freq : 0;
  const modified = macaulay / (1 + j);
  const convexity = price > 0 ? convex / (price * Math.pow(1 + j, 2) * freq * freq) : 0;
  const dy = changeBps / 10000;
  const estPct = (-modified * dy + 0.5 * convexity * dy * dy) * 100;
  const newPrice = bondPrice(faceValue, couponPercent, yieldPercent + changeBps / 100, yearsToMaturity, freq);

  return {
    currentPrice: round2(price),
    macaulayDuration: round2(macaulay),
    modifiedDuration: round2(modified),
    convexity: round2(convexity),
    estimatedPriceChangePercent: round2(estPct),
    newPrice: round2(newPrice),
    priceChange: round2(newPrice - price),
  };
};

// --- 5. Sukuk Profit Rate Calculator ---------------------------------------------------
export const sukukProfitRateCalculator: CustomCalculator = (values) => {
  const faceValue = Math.max(0, safeNumber(values.faceValue, 10000));
  const profitRatePercent = Math.max(0, safeNumber(values.profitRatePercent, 5.5));
  const freq = freqOf(safeNumber(values.paymentsPerYear, 2));
  const yearsToMaturity = Math.max(0.25, safeNumber(values.yearsToMaturity, 5));
  const pricePercent = Math.max(0, safeNumber(values.pricePercent, 99));

  const yearly = (faceValue * profitRatePercent) / 100;
  const price = (faceValue * pricePercent) / 100;

  return {
    profitPerDistribution: round2(yearly / freq),
    profitPerYear: round2(yearly),
    totalProfitToMaturity: round2(yearly * yearsToMaturity),
    pricePaid: round2(price),
    yieldOnPricePaid: round2(solveYield(price, faceValue, profitRatePercent, yearsToMaturity, freq)),
  };
};

// --- 6. Series I Bond Calculator -------------------------------------------------------
export const seriesIBondCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 10000));
  const fixedRatePercent = Math.max(0, safeNumber(values.fixedRatePercent, 0.9));
  const semiannualInflationPercent = safeNumber(values.semiannualInflationPercent, 1.5);
  const yearsHeld = Math.max(0, safeNumber(values.yearsHeld, 5));

  const f = fixedRatePercent / 100;
  const s = semiannualInflationPercent / 100;
  const composite = Math.max(0, f + 2 * s + f * s);
  const value = amount * Math.pow(1 + composite / 2, yearsHeld * 2);
  const threeMonthsEarlier = amount * Math.pow(1 + composite / 2, Math.max(0, yearsHeld - 0.25) * 2);
  const penalty = yearsHeld < 5 && yearsHeld >= 1 ? value - threeMonthsEarlier : 0;

  return {
    compositeRate: round2(composite * 100),
    bondValue: round2(value),
    interestEarned: round2(value - amount),
    earlyRedemptionPenalty: round2(penalty),
    valueIfCashedNow: round2(yearsHeld < 1 ? amount : value - penalty),
  };
};

// --- 7. Series EE Bond Calculator ------------------------------------------------------
export const seriesEeBondCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 10000));
  const fixedRatePercent = Math.max(0, safeNumber(values.fixedRatePercent, 2.5));
  const yearsHeld = Math.max(0, Math.min(30, safeNumber(values.yearsHeld, 20)));

  const r = fixedRatePercent / 100;
  const atRate = (y: number) => amount * Math.pow(1 + r / 2, y * 2);
  // Treasury guarantees the bond is worth at least double at 20 years
  const valueAt = (y: number) => (y >= 20 ? Math.max(atRate(y), 2 * amount * Math.pow(1 + r / 2, (y - 20) * 2)) : atRate(y));
  const value = valueAt(yearsHeld);
  const penalty = yearsHeld < 5 && yearsHeld >= 1 ? value - valueAt(Math.max(0, yearsHeld - 0.25)) : 0;

  return {
    bondValue: round2(value),
    interestEarned: round2(value - amount),
    earlyRedemptionPenalty: round2(penalty),
    valueIfCashedNow: round2(yearsHeld < 1 ? amount : value - penalty),
    valueAt20Years: round2(valueAt(20)),
    rateIfHeld20Years: round2((Math.pow(valueAt(20) / Math.max(1e-9, amount), 1 / 20) - 1) * 100),
  };
};

export const investmentBondsCustomCalculators: Record<string, CustomCalculator> = {
  "bond-interest-calculator": bondInterestCalculator,
  "treasury-bill-calculator": treasuryBillCalculator,
  "bond-yield-to-maturity-calculator": bondYieldToMaturityCalculator,
  "interest-rate-sensitivity-calculator": interestRateSensitivityCalculator,
  "sukuk-profit-rate-calculator": sukukProfitRateCalculator,
  "series-i-bond-calculator": seriesIBondCalculator,
  "series-ee-bond-calculator": seriesEeBondCalculator,
};
