/**
 * Batch: "Crypto Calculators" (currency, forex & crypto list) sub-batch G
 * (Forwards, Parity & Exchange Rate Theory, 10 tools). See
 * calc-engine-currency-conversion.ts for the full list of 9 sub-batches.
 *
 * Rates are quoted as units of the QUOTE currency per 1 unit of the BASE
 * currency (EUR/USD 1.085 = 1.085 dollars per euro).
 *
 * Near-namesakes, and how each is deliberately different:
 *  - forwardExchangeRateCalculator: the forward rate from spot and the two
 *    interest rates (money-market day count), plus forward points.
 *  - forwardPremiumCalculator: from a quoted spot AND forward — the premium
 *    or discount, annualized.
 *  - forwardDiscountCalculator: from spot and an annual discount % — the
 *    forward rate it implies and the value locked on an amount.
 *  - currencyForwardCalculator: a business locking in a forward on a
 *    foreign receivable — hedged vs unhedged at expected and worst rates.
 *  - coveredInterestParityCalculator: checks a MARKET forward against the
 *    parity forward — the gap and the arbitrage profit on a notional.
 *  - interestRateParityCalculator: UNCOVERED parity over years — the spot
 *    rate the interest gap implies for the future.
 *  - purchasingPowerParityCalculator: the same item's price in two
 *    countries (Big Mac style) — implied rate and over/undervaluation.
 *  - realExchangeRateCalculator: the real (inflation-adjusted) change behind
 *    a nominal rate move.
 *  - nominalExchangeRateCalculator: the nominal rate relative PPP projects
 *    from the two inflation rates.
 *  - effectiveExchangeRateCalculator: a trade-weighted index of your
 *    currency against three partners — nominal and real.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-currency-forwards-parity-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function roundTo(n: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

const MIN_RATE = 0.000001;
const rate = (v: number, d: number) => Math.max(MIN_RATE, safeNumber(v, d));
const pip = (v: number) => (safeNumber(v, 0.0001) === 0.01 ? 0.01 : 0.0001);
const rateOf = (v: number, d: number) => Math.max(-99, Math.min(1000, safeNumber(v, d)));

// Money-market forward: F = S × (1 + i_quote·d/B) ÷ (1 + i_base·d/B).
function parityForward(spot: number, quotePct: number, basePct: number, days: number, basis: number) {
  return (spot * (1 + (quotePct / 100) * (days / basis))) / Math.max(0.0001, 1 + (basePct / 100) * (days / basis));
}

// --- 1. Forward Exchange Rate -------------------------------------------------
export const forwardExchangeRateCalculator: CustomCalculator = (values) => {
  const spotRate = rate(values.spotRate, 1.085);
  const quoteRatePercent = rateOf(values.quoteRatePercent, 4.25);
  const baseRatePercent = rateOf(values.baseRatePercent, 2.25);
  const days = Math.max(0, Math.min(3650, safeNumber(values.days, 90)));
  const dayBasis = safeNumber(values.dayBasis, 360) === 365 ? 365 : 360;
  const pipSize = pip(values.pipSize);

  const forward = parityForward(spotRate, quoteRatePercent, baseRatePercent, days, dayBasis);

  return {
    forwardRate: roundTo(forward, 6),
    forwardPoints: round2((forward - spotRate) / pipSize),
    premiumPercent: round2((forward / spotRate - 1) * 100),
  };
};

// --- 2. Forward Premium (from quoted spot and forward) ---------------------
export const forwardPremiumCalculator: CustomCalculator = (values) => {
  const spotRate = rate(values.spotRate, 1.085);
  const forwardRate = rate(values.forwardRate, 1.0904);
  const days = Math.max(1, Math.min(3650, safeNumber(values.days, 90)));
  const pipSize = pip(values.pipSize);

  const p = forwardRate / spotRate - 1;

  return {
    annualizedPremiumPercent: round2(p * (365 / days) * 100),
    premiumForPeriodPercent: roundTo(p * 100, 4),
    forwardPoints: round2((forwardRate - spotRate) / pipSize),
  };
};

// --- 3. Forward Discount (forward from an annual discount) ----------------
export const forwardDiscountCalculator: CustomCalculator = (values) => {
  const spotRate = rate(values.spotRate, 150);
  const annualDiscountPercent = Math.max(0, Math.min(100, safeNumber(values.annualDiscountPercent, 3.5)));
  const days = Math.max(0, Math.min(3650, safeNumber(values.days, 180)));
  const baseAmount = Math.max(0, safeNumber(values.baseAmount, 1000000));
  // Defaults to a JPY pair (pip 0.01) to match the USD/JPY example.
  const pipSize = safeNumber(values.pipSize, 0.01) === 0.0001 ? 0.0001 : 0.01;

  const forward = spotRate * Math.max(0, 1 - (annualDiscountPercent / 100) * (days / 365));

  return {
    forwardRate: roundTo(forward, 6),
    forwardPoints: round2((forward - spotRate) / pipSize),
    valueLockedAtForward: round2(baseAmount * forward),
    differenceVsSpot: round2(baseAmount * (forward - spotRate)),
  };
};

// --- 4. Currency Forward (hedging a receivable) -----------------------------
export const currencyForwardCalculator: CustomCalculator = (values) => {
  const foreignAmount = Math.max(0, safeNumber(values.foreignAmount, 500000));
  // Home currency per 1 unit of the foreign currency.
  const forwardRate = rate(values.forwardRate, 1.09);
  const expectedSpotRate = rate(values.expectedSpotRate, 1.06);
  const worstCaseSpotRate = rate(values.worstCaseSpotRate, 1.02);

  const locked = foreignAmount * forwardRate;

  return {
    amountLockedIn: round2(locked),
    unhedgedAtExpectedRate: round2(foreignAmount * expectedSpotRate),
    unhedgedAtWorstRate: round2(foreignAmount * worstCaseSpotRate),
    hedgeBenefitVsExpected: round2(locked - foreignAmount * expectedSpotRate),
    hedgeBenefitVsWorst: round2(locked - foreignAmount * worstCaseSpotRate),
  };
};

// --- 5. Covered Interest Parity (arbitrage check) ---------------------------
export const coveredInterestParityCalculator: CustomCalculator = (values) => {
  const spotRate = rate(values.spotRate, 1.085);
  const marketForwardRate = rate(values.marketForwardRate, 1.0915);
  const quoteRatePercent = rateOf(values.quoteRatePercent, 4.25);
  const baseRatePercent = rateOf(values.baseRatePercent, 2.25);
  const days = Math.max(0, Math.min(3650, safeNumber(values.days, 90)));
  const notional = Math.max(0, safeNumber(values.notional, 1000000));
  const pipSize = pip(values.pipSize);

  const t = days / 360;
  const parity = parityForward(spotRate, quoteRatePercent, baseRatePercent, days, 360);
  // Borrow quote, buy base at spot, invest base, sell it forward at market.
  const viaForward = notional * (1 + (baseRatePercent / 100) * t) * marketForwardRate;
  const cost = notional * spotRate * (1 + (quoteRatePercent / 100) * t);

  return {
    parityForwardRate: roundTo(parity, 6),
    deviationPips: round2((marketForwardRate - parity) / pipSize),
    // Positive: borrow the quote currency; negative: do the reverse.
    arbitrageProfit: round2(viaForward - cost),
  };
};

// --- 6. Interest Rate Parity (uncovered, over years) -------------------------
export const interestRateParityCalculator: CustomCalculator = (values) => {
  const spotRate = rate(values.spotRate, 1.085);
  const quoteRatePercent = rateOf(values.quoteRatePercent, 4.25);
  const baseRatePercent = rateOf(values.baseRatePercent, 2.25);
  const years = Math.max(0, Math.min(50, safeNumber(values.years, 2)));

  const expected = spotRate * Math.pow((1 + quoteRatePercent / 100) / (1 + baseRatePercent / 100), years);

  return {
    expectedFutureSpot: roundTo(expected, 6),
    expectedBaseChangePercent: round2((expected / spotRate - 1) * 100),
    interestDifferentialPoints: round2(quoteRatePercent - baseRatePercent),
  };
};

// --- 7. Purchasing Power Parity (same item, two prices) --------------------
export const purchasingPowerParityCalculator: CustomCalculator = (values) => {
  const priceAtHome = Math.max(0.0001, safeNumber(values.priceAtHome, 5.79));
  const priceAbroad = Math.max(0, safeNumber(values.priceAbroad, 5.2));
  // Foreign currency per 1 unit of home currency.
  const actualRate = rate(values.actualRate, 0.92);

  const ppp = priceAbroad / priceAtHome;

  return {
    impliedPppRate: roundTo(ppp, 6),
    foreignCurrencyValuationPercent: round2((ppp / actualRate - 1) * 100),
    foreignPriceInHomeCurrency: round2(priceAbroad / actualRate),
  };
};

// --- 8. Real Exchange Rate (inflation-adjusted change) ----------------------
export const realExchangeRateCalculator: CustomCalculator = (values) => {
  // Home currency per 1 unit of the foreign currency, start and end.
  const startRate = rate(values.startRate, 1.05);
  const endRate = rate(values.endRate, 1.085);
  const homeInflationPercent = rateOf(values.homeInflationPercent, 3);
  const foreignInflationPercent = rateOf(values.foreignInflationPercent, 2);

  const nominal = endRate / startRate - 1;
  const real = (1 + nominal) * ((1 + foreignInflationPercent / 100) / (1 + homeInflationPercent / 100)) - 1;

  return {
    realChangePercent: round2(real * 100),
    nominalChangePercent: round2(nominal * 100),
    realRateIndex: round2(100 * (1 + real)),
  };
};

// --- 9. Nominal Exchange Rate (relative PPP projection) --------------------
export const nominalExchangeRateCalculator: CustomCalculator = (values) => {
  // Home currency per 1 unit of the foreign currency.
  const currentRate = rate(values.currentRate, 1.085);
  const homeInflationPercent = rateOf(values.homeInflationPercent, 3);
  const foreignInflationPercent = rateOf(values.foreignInflationPercent, 2);
  const years = Math.max(0, Math.min(50, safeNumber(values.years, 5)));

  const projected = currentRate * Math.pow((1 + homeInflationPercent / 100) / (1 + foreignInflationPercent / 100), years);

  return {
    projectedNominalRate: roundTo(projected, 6),
    projectedChangePercent: round2((projected / currentRate - 1) * 100),
    yearlyChangePercent: round2(((1 + homeInflationPercent / 100) / (1 + foreignInflationPercent / 100) - 1) * 100),
  };
};

// --- 10. Effective Exchange Rate (trade-weighted, nominal and real) -------
export const effectiveExchangeRateCalculator: CustomCalculator = (values) => {
  const parts = [1, 2, 3].map((k) => ({
    w: Math.max(0, safeNumber(values[`weight${k}`], [40, 35, 25][k - 1])),
    // % change of your currency against this partner's currency.
    c: Math.max(-99, safeNumber(values[`change${k}`], [3, -2, 5][k - 1])),
  }));
  const homeInflationPercent = rateOf(values.homeInflationPercent, 3);
  const partnerInflationPercent = rateOf(values.partnerInflationPercent, 2);

  const totalW = parts.reduce((a, p) => a + p.w, 0);
  const neer = totalW > 0 ? parts.reduce((acc, p) => acc * Math.pow(1 + p.c / 100, p.w / totalW), 1) - 1 : 0;
  const reer = (1 + neer) * ((1 + homeInflationPercent / 100) / (1 + partnerInflationPercent / 100)) - 1;

  return {
    nominalEffectiveChangePercent: round2(neer * 100),
    realEffectiveChangePercent: round2(reer * 100),
    nominalIndex: round2(100 * (1 + neer)),
    realIndex: round2(100 * (1 + reer)),
  };
};

export const currencyForwardsParityCustomCalculators: Record<string, CustomCalculator> = {
  "forward-exchange-rate-calculator": forwardExchangeRateCalculator,
  "forward-premium-calculator": forwardPremiumCalculator,
  "forward-discount-calculator": forwardDiscountCalculator,
  "currency-forward-calculator": currencyForwardCalculator,
  "covered-interest-parity-calculator": coveredInterestParityCalculator,
  "interest-rate-parity-calculator": interestRateParityCalculator,
  "purchasing-power-parity-calculator": purchasingPowerParityCalculator,
  "real-exchange-rate-calculator": realExchangeRateCalculator,
  "nominal-exchange-rate-calculator": nominalExchangeRateCalculator,
  "effective-exchange-rate-calculator": effectiveExchangeRateCalculator,
};
