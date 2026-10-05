/**
 * Batch: "Interest Calculators" expansion (5 Oct 2026), sub-batch 3 of 9 —
 * CD Types (6 tools), filed under Savings Calculators (next to the existing
 * cd-calculator / cd-savings-calculator, which handle a plain CD). See
 * calc-engine-interest-methods.ts for the full batch context.
 *
 *  - cdLaddering: N rungs maturing yearly, rates interpolated between the
 *    1-year and longest rate; value after N years vs all in the long CD or
 *    rolling 1-year CDs.
 *  - cdEarlyWithdrawalPenalty (incl. no-penalty CD): interest earned vs
 *    the penalty (months of simple interest), net and effective APY, and
 *    a no-penalty CD over the same time.
 *  - callableCd: held to maturity vs called early and reinvested at a
 *    lower rate vs a non-callable CD.
 *  - stepUpCd: scheduled rate increases -> blended APY vs a fixed CD.
 *  - bumpUpCd: one rate bump partway through vs no bump vs a regular CD.
 *  - brokeredCd: simple interest paid out (no compounding), and the market
 *    value if sold before maturity after rates change.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-savings-cd-types-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Growth over `months` at an APY.
function grow(amount: number, apyPercent: number, months: number): number {
  return amount * Math.pow(1 + apyPercent / 100, months / 12);
}

// --- 1. CD Laddering Calculator --------------------------------------------------------
export const cdLadderingCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 25000));
  const rungs = Math.min(10, Math.max(1, Math.round(safeNumber(values.rungs, 5))));
  const oneYearApyPercent = Math.max(0, safeNumber(values.oneYearApyPercent, 4));
  const longestApyPercent = Math.max(0, safeNumber(values.longestApyPercent, 3.75));

  const per = amount / rungs;
  const rate = (k: number) => (rungs === 1 ? oneYearApyPercent : oneYearApyPercent + ((longestApyPercent - oneYearApyPercent) * (k - 1)) / (rungs - 1));
  let firstYear = 0;
  let value = 0;
  let avg = 0;
  for (let k = 1; k <= rungs; k++) {
    const r = rate(k);
    avg += r / rungs;
    firstYear += (per * r) / 100;
    // rung k matures after k years, then rolls into the longest CD
    value += grow(grow(per, r, k * 12), longestApyPercent, (rungs - k) * 12);
  }

  return {
    amountPerRung: round2(per),
    averageStartingApy: round2(avg),
    firstYearInterest: round2(firstYear),
    valueAfterLadder: round2(value),
    valueAllInLongestCd: round2(grow(amount, longestApyPercent, rungs * 12)),
    valueRollingOneYearCds: round2(grow(amount, oneYearApyPercent, rungs * 12)),
  };
};

// --- 2. CD Early Withdrawal Penalty Calculator ----------------------------------------
export const cdEarlyWithdrawalPenaltyCalculator: CustomCalculator = (values) => {
  const deposit = Math.max(0, safeNumber(values.deposit, 20000));
  const apyPercent = Math.max(0, safeNumber(values.apyPercent, 4.5));
  const monthsHeld = Math.max(0, safeNumber(values.monthsHeld, 8));
  const penaltyMonths = Math.max(0, safeNumber(values.penaltyMonths, 6));
  const noPenaltyApyPercent = Math.max(0, safeNumber(values.noPenaltyApyPercent, 3.9));

  const earned = grow(deposit, apyPercent, monthsHeld) - deposit;
  const penalty = (deposit * apyPercent * penaltyMonths) / 100 / 12;
  const net = earned - penalty;
  const noPenalty = grow(deposit, noPenaltyApyPercent, monthsHeld) - deposit;

  return {
    interestEarned: round2(earned),
    penalty: round2(penalty),
    netInterest: round2(net),
    amountYouReceive: round2(deposit + net),
    effectiveApy: round2(deposit > 0 && monthsHeld > 0 ? (Math.pow(Math.max(0, 1 + net / deposit), 12 / monthsHeld) - 1) * 100 : 0),
    noPenaltyCdInterest: round2(noPenalty),
    noPenaltyCdAdvantage: round2(noPenalty - net),
  };
};

// --- 3. Callable CD Calculator ---------------------------------------------------------
export const callableCdCalculator: CustomCalculator = (values) => {
  const deposit = Math.max(0, safeNumber(values.deposit, 50000));
  const callableApyPercent = Math.max(0, safeNumber(values.callableApyPercent, 5));
  const termYears = Math.max(0.5, safeNumber(values.termYears, 5));
  const callAfterYears = Math.min(termYears, Math.max(0, safeNumber(values.callAfterYears, 1)));
  const reinvestApyPercent = Math.max(0, safeNumber(values.reinvestApyPercent, 3.5));
  const nonCallableApyPercent = Math.max(0, safeNumber(values.nonCallableApyPercent, 4.25));

  const held = grow(deposit, callableApyPercent, termYears * 12);
  const called = grow(grow(deposit, callableApyPercent, callAfterYears * 12), reinvestApyPercent, (termYears - callAfterYears) * 12);
  const nonCallable = grow(deposit, nonCallableApyPercent, termYears * 12);

  return {
    interestIfHeldToMaturity: round2(held - deposit),
    interestIfCalled: round2(called - deposit),
    nonCallableInterest: round2(nonCallable - deposit),
    advantageIfNotCalled: round2(held - nonCallable),
    costIfCalled: round2(nonCallable - called),
  };
};

// --- 4. Step-Up CD Calculator ----------------------------------------------------------
export const stepUpCdCalculator: CustomCalculator = (values) => {
  const deposit = Math.max(0, safeNumber(values.deposit, 10000));
  const startingApyPercent = Math.max(0, safeNumber(values.startingApyPercent, 3.5));
  const stepPercent = safeNumber(values.stepPercent, 0.25);
  const stepEveryMonths = Math.max(1, Math.round(safeNumber(values.stepEveryMonths, 12)));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const fixedApyPercent = Math.max(0, safeNumber(values.fixedApyPercent, 3.8));

  let value = deposit;
  let rate = startingApyPercent;
  for (let m = 0; m < termMonths; m++) {
    rate = Math.max(0, startingApyPercent + stepPercent * Math.floor(m / stepEveryMonths));
    value *= Math.pow(1 + rate / 100, 1 / 12);
  }
  const fixed = grow(deposit, fixedApyPercent, termMonths);

  return {
    finalApy: round2(rate),
    blendedApy: round2(deposit > 0 ? (Math.pow(value / deposit, 12 / termMonths) - 1) * 100 : 0),
    totalInterest: round2(value - deposit),
    fixedCdInterest: round2(fixed - deposit),
    stepUpAdvantage: round2(value - fixed),
  };
};

// --- 5. Bump-Up CD Calculator ----------------------------------------------------------
export const bumpUpCdCalculator: CustomCalculator = (values) => {
  const deposit = Math.max(0, safeNumber(values.deposit, 10000));
  const startingApyPercent = Math.max(0, safeNumber(values.startingApyPercent, 3.75));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const bumpMonth = Math.min(termMonths, Math.max(0, Math.round(safeNumber(values.bumpMonth, 12))));
  const newApyPercent = Math.max(0, safeNumber(values.newApyPercent, 4.5));
  const regularApyPercent = Math.max(0, safeNumber(values.regularApyPercent, 4));

  const bumped = grow(grow(deposit, startingApyPercent, bumpMonth), Math.max(startingApyPercent, newApyPercent), termMonths - bumpMonth);
  const noBump = grow(deposit, startingApyPercent, termMonths);
  const regular = grow(deposit, regularApyPercent, termMonths);

  return {
    interestWithBump: round2(bumped - deposit),
    interestWithoutBump: round2(noBump - deposit),
    regularCdInterest: round2(regular - deposit),
    gainFromBump: round2(bumped - noBump),
    advantageVsRegularCd: round2(bumped - regular),
  };
};

// --- 6. Brokered CD Calculator ---------------------------------------------------------
export const brokeredCdCalculator: CustomCalculator = (values) => {
  const faceValue = Math.max(0, safeNumber(values.faceValue, 25000));
  const couponPercent = Math.max(0, safeNumber(values.couponPercent, 4.3));
  const rawFreq = Math.round(safeNumber(values.paymentsPerYear, 12));
  const freq = [1, 2, 4, 12].includes(rawFreq) ? rawFreq : 12;
  const termYears = Math.max(0.25, safeNumber(values.termYears, 3));
  const yearsUntilSale = Math.min(termYears, Math.max(0, safeNumber(values.yearsUntilSale, 1)));
  const marketRatePercent = Math.max(0, safeNumber(values.marketRatePercent, 5));

  const coupon = (faceValue * couponPercent) / 100 / freq;
  const remaining = Math.round((termYears - yearsUntilSale) * freq);
  const j = marketRatePercent / 100 / freq;
  const pv = j === 0 ? coupon * remaining + faceValue : (coupon * (1 - Math.pow(1 + j, -remaining))) / j + faceValue * Math.pow(1 + j, -remaining);

  return {
    interestPerPayment: round2(coupon),
    interestPerYear: round2(coupon * freq),
    totalInterestIfHeld: round2(coupon * Math.round(termYears * freq)),
    marketValueIfSold: round2(pv),
    gainOrLossOnSale: round2(pv - faceValue),
  };
};

export const savingsCdTypesCustomCalculators: Record<string, CustomCalculator> = {
  "cd-laddering-calculator": cdLadderingCalculator,
  "cd-early-withdrawal-penalty-calculator": cdEarlyWithdrawalPenaltyCalculator,
  "callable-cd-calculator": callableCdCalculator,
  "step-up-cd-calculator": stepUpCdCalculator,
  "bump-up-cd-calculator": bumpUpCdCalculator,
  "brokered-cd-calculator": brokeredCdCalculator,
};
