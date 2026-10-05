/**
 * Batch: "Interest Calculators" expansion (5 Oct 2026), sub-batch 1 of 9 —
 * Interest Methods (9 tools), filed under Interest Calculators.
 *
 * The user's 67-keyword interest list was checked against every existing
 * slug: 13 were already built (Savings Account, CD, Money Market, Credit
 * Card, High-Yield Savings, Simple/Compound Interest Savings, Real Interest
 * Rate = real-rate-of-return, Interest Coverage Ratio, Jumbo CD =
 * cd-calculator, Installment Plan = installment-loan, Post-Dated Interest =
 * daily-interest, Christmas Club = weekly-savings) and 8 were merged
 * (Promotional Rate and Store Card -> Deferred Interest; Prime Rate-Based and
 * SOFR-Based -> Variable Interest Rate; Floor -> Collar; Savings Bond ->
 * Series EE; No-Penalty CD -> CD Early Withdrawal Penalty; Cooperative
 * Society -> Fixed Deposit). 46 new tools in 9 sub-batches, no new
 * categories:
 *  - calc-engine-interest-methods.ts (this file)  -> Interest Calculators
 *  - calc-engine-interest-rate-tools.ts           -> Interest Calculators
 *  - calc-engine-savings-cd-types.ts              -> Savings Calculators
 *  - calc-engine-savings-india-schemes.ts         -> Savings Calculators (INR)
 *  - calc-engine-savings-tax-advantaged.ts        -> Savings Calculators (USD/GBP/CAD)
 *  - calc-engine-investment-bonds.ts              -> Investment Calculators
 *  - calc-engine-loan-bnpl-layaway.ts             -> Loan > Short-Term & High-Cost
 *  - calc-engine-retirement-rrsp.ts               -> Retirement Calculators (CAD)
 *  - calc-engine-salary-gratuity.ts               -> Salary & Income Calculators (INR)
 *
 *  - overdraftInterest: interest at the overdraft rate for N days plus
 *    per-item and extended fees -> total cost and the effective APR.
 *  - accruedInterest: interest built up over N days under 30/360,
 *    Actual/360 or Actual/365, and a bond's dirty price.
 *  - deferredInterest (incl. promotional rate, store card): "no interest if
 *    paid in full" — interest accrues from day one and is charged in full if
 *    any balance is left; vs a true 0% promotion.
 *  - negativeAmortizationInterest: payment below the interest — unpaid
 *    interest added each month, months until the balance cap (recast).
 *  - weightedAverageInterestRate: up to 5 balances.
 *  - tieredInterestRate: blended (each slice at its tier's rate) vs
 *    whole-balance tiers.
 *  - variableInterestRate (incl. prime/SOFR-based): index + margin, reset
 *    yearly by an expected change, periodic and lifetime caps.
 *  - addOnInterest: interest on the full principal for the whole term, the
 *    payment and the true APR.
 *  - bankDiscountInterest: interest deducted up front -> proceeds and the
 *    effective rate.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-interest-methods-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function payment(principal: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
}

// Monthly rate at which `pmt` for n months repays `principal`.
function solveMonthlyRate(principal: number, pmt: number, n: number): number {
  if (principal <= 0 || n <= 0 || pmt * n <= principal) return 0;
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (payment(principal, mid, n) < pmt) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// --- 1. Overdraft Interest Calculator --------------------------------------------------
export const overdraftInterestCalculator: CustomCalculator = (values) => {
  const overdrawnAmount = Math.max(0, safeNumber(values.overdrawnAmount, 500));
  const days = Math.max(0, safeNumber(values.days, 14));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 18));
  const feePerItem = Math.max(0, safeNumber(values.feePerItem, 35));
  const items = Math.max(0, Math.round(safeNumber(values.items, 1)));
  const extendedFee = Math.max(0, safeNumber(values.extendedFee, 0));

  const interest = (overdrawnAmount * annualRatePercent * days) / 100 / 365;
  const fees = feePerItem * items + extendedFee;
  const total = interest + fees;

  return {
    interest: round2(interest),
    fees: round2(fees),
    totalCost: round2(total),
    effectiveApr: round2(overdrawnAmount > 0 && days > 0 ? (total / overdrawnAmount) * (365 / days) * 100 : 0),
  };
};

// --- 2. Accrued Interest Calculator ---------------------------------------------------
export const accruedInterestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 5));
  const days = Math.max(0, safeNumber(values.days, 75));
  const raw = Math.round(safeNumber(values.dayCount, 1));
  const dayCount = [1, 2, 3].includes(raw) ? raw : 1;
  const cleanPricePercent = Math.max(0, safeNumber(values.cleanPricePercent, 98.5));

  const basis = dayCount === 3 ? 365 : 360;
  const accrued = (principal * annualRatePercent * days) / 100 / basis;

  return {
    dailyInterest: round2((principal * annualRatePercent) / 100 / basis),
    accruedInterest: round2(accrued),
    cleanPrice: round2((principal * cleanPricePercent) / 100),
    dirtyPrice: round2((principal * cleanPricePercent) / 100 + accrued),
  };
};

// --- 3. Deferred Interest Calculator --------------------------------------------------
export const deferredInterestCalculator: CustomCalculator = (values) => {
  const purchaseAmount = Math.max(0, safeNumber(values.purchaseAmount, 2400));
  const promoMonths = Math.max(1, Math.round(safeNumber(values.promoMonths, 12)));
  const aprPercent = Math.max(0, safeNumber(values.aprPercent, 29.99));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 150));
  const raw = Math.round(safeNumber(values.promoType, 1));
  const deferred = raw !== 2;

  const i = aprPercent / 100 / 12;
  let balance = purchaseAmount;
  let accrued = 0;
  for (let m = 0; m < promoMonths && balance > 0; m++) {
    accrued += balance * i;
    balance = Math.max(0, balance - monthlyPayment);
  }
  const charged = balance > 0.005 && deferred ? accrued : 0;

  return {
    balanceAtPromoEnd: round2(balance),
    interestChargedAtPromoEnd: round2(charged),
    balanceAfterCharge: round2(balance + charged),
    paymentToClearInTime: round2(purchaseAmount / promoMonths),
    interestThatBuiltUp: round2(accrued),
  };
};

// --- 4. Negative Amortization Interest Calculator ------------------------------------
export const negativeAmortizationInterestCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 250000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 1200));
  const months = Math.max(0, Math.round(safeNumber(values.months, 60)));
  const capPercent = Math.max(100, safeNumber(values.capPercent, 110));

  const i = annualRatePercent / 100 / 12;
  let b = balance;
  let unpaid = 0;
  let capMonth = 0;
  for (let m = 1; m <= Math.max(months, 600); m++) {
    const interest = b * i;
    if (m <= months) unpaid += Math.max(0, interest - monthlyPayment);
    b = b + interest - monthlyPayment;
    if (!capMonth && b >= (balance * capPercent) / 100) capMonth = m;
    if (m >= months && capMonth) break;
    if (b <= 0) break;
  }
  let end = balance;
  for (let m = 0; m < months; m++) end = end * (1 + i) - monthlyPayment;

  return {
    firstMonthInterest: round2(balance * i),
    monthlyShortfall: round2(Math.max(0, balance * i - monthlyPayment)),
    balanceAfterPeriod: round2(Math.max(0, end)),
    unpaidInterestAdded: round2(unpaid),
    monthsUntilCapReached: capMonth,
  };
};

// --- 5. Weighted Average Interest Rate Calculator ------------------------------------
export const weightedAverageInterestRateCalculator: CustomCalculator = (values) => {
  const defaults = [
    [12000, 4.5],
    [8500, 6.8],
    [3000, 22.9],
    [0, 0],
    [0, 0],
  ];
  let total = 0;
  let weighted = 0;
  for (let k = 1; k <= 5; k++) {
    const b = Math.max(0, safeNumber(values[`balance${k}`], defaults[k - 1][0]));
    const r = Math.max(0, safeNumber(values[`rate${k}Percent`], defaults[k - 1][1]));
    total += b;
    weighted += b * r;
  }
  const avg = total > 0 ? weighted / total : 0;

  return {
    totalBalance: round2(total),
    weightedAverageRate: round2(avg),
    annualInterest: round2(weighted / 100),
    monthlyInterest: round2(weighted / 100 / 12),
  };
};

// --- 6. Tiered Interest Rate Calculator ----------------------------------------------
export const tieredInterestRateCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 40000));
  const tier1Limit = Math.max(0, safeNumber(values.tier1Limit, 10000));
  const tier1RatePercent = Math.max(0, safeNumber(values.tier1RatePercent, 0.5));
  const tier2Limit = Math.max(tier1Limit, safeNumber(values.tier2Limit, 50000));
  const tier2RatePercent = Math.max(0, safeNumber(values.tier2RatePercent, 2));
  const tier3RatePercent = Math.max(0, safeNumber(values.tier3RatePercent, 3.5));
  const raw = Math.round(safeNumber(values.method, 1));
  const blended = raw !== 2;

  let interest: number;
  if (blended) {
    const s1 = Math.min(balance, tier1Limit);
    const s2 = Math.min(Math.max(0, balance - tier1Limit), tier2Limit - tier1Limit);
    const s3 = Math.max(0, balance - tier2Limit);
    interest = (s1 * tier1RatePercent + s2 * tier2RatePercent + s3 * tier3RatePercent) / 100;
  } else {
    const r = balance <= tier1Limit ? tier1RatePercent : balance <= tier2Limit ? tier2RatePercent : tier3RatePercent;
    interest = (balance * r) / 100;
  }

  return {
    annualInterest: round2(interest),
    monthlyInterest: round2(interest / 12),
    effectiveRate: round2(balance > 0 ? (interest / balance) * 100 : 0),
  };
};

// --- 7. Variable Interest Rate Calculator --------------------------------------------
export const variableInterestRateCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 200000));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));
  const indexRatePercent = Math.max(0, safeNumber(values.indexRatePercent, 6.75));
  const marginPercent = safeNumber(values.marginPercent, 1);
  const changePerYearPercent = safeNumber(values.changePerYearPercent, 0.25);
  const periodicCapPercent = Math.max(0, safeNumber(values.periodicCapPercent, 2));
  const lifetimeCapPercent = Math.max(0, safeNumber(values.lifetimeCapPercent, 5));

  const start = Math.max(0, indexRatePercent + marginPercent);
  const ceiling = start + lifetimeCapPercent;
  let rate = start;
  let balance = loanAmount;
  let totalInterest = 0;
  let first = 0;
  let last = 0;
  let maxPay = 0;
  for (let y = 0; y < termYears; y++) {
    if (y > 0) {
      const target = Math.max(0, indexRatePercent + changePerYearPercent * y + marginPercent);
      const step = Math.max(-periodicCapPercent, Math.min(periodicCapPercent, target - rate));
      rate = Math.min(ceiling, Math.max(0, rate + step));
    }
    const i = rate / 100 / 12;
    const p = payment(balance, i, (termYears - y) * 12);
    if (y === 0) first = p;
    last = p;
    maxPay = Math.max(maxPay, p);
    for (let m = 0; m < 12; m++) {
      const interest = balance * i;
      totalInterest += interest;
      balance = Math.max(0, balance + interest - p);
    }
  }

  return {
    startingRate: round2(start),
    firstPayment: round2(first),
    finalRate: round2(rate),
    finalYearPayment: round2(last),
    highestPayment: round2(maxPay),
    totalInterest: round2(totalInterest),
    rateCeiling: round2(ceiling),
  };
};

// --- 8. Add-On Interest Calculator ---------------------------------------------------
export const addOnInterestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 15000));
  const addOnRatePercent = Math.max(0, safeNumber(values.addOnRatePercent, 6));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));

  const interest = (principal * addOnRatePercent * termMonths) / 100 / 12;
  const pmt = (principal + interest) / termMonths;
  const apr = solveMonthlyRate(principal, pmt, termMonths) * 12 * 100;

  return {
    totalInterest: round2(interest),
    totalRepaid: round2(principal + interest),
    monthlyPayment: round2(pmt),
    trueApr: round2(apr),
    amortizingInterestAtSameRate: round2(payment(principal, addOnRatePercent / 100 / 12, termMonths) * termMonths - principal),
  };
};

// --- 9. Bank Discount Interest Calculator --------------------------------------------
export const bankDiscountInterestCalculator: CustomCalculator = (values) => {
  const faceAmount = Math.max(0, safeNumber(values.faceAmount, 10000));
  const discountRatePercent = Math.max(0, safeNumber(values.discountRatePercent, 9));
  const termMonths = Math.max(1, safeNumber(values.termMonths, 12));

  const t = termMonths / 12;
  const discount = Math.min(faceAmount, (faceAmount * discountRatePercent * t) / 100);
  const proceeds = faceAmount - discount;

  return {
    interestDeducted: round2(discount),
    proceedsReceived: round2(proceeds),
    amountRepaid: round2(faceAmount),
    effectiveRate: round2(proceeds > 0 ? (discount / proceeds / t) * 100 : 0),
    faceNeededForProceeds: round2(discountRatePercent * t < 100 ? faceAmount / (1 - (discountRatePercent * t) / 100) : 0),
  };
};

export const interestMethodsCustomCalculators: Record<string, CustomCalculator> = {
  "overdraft-interest-calculator": overdraftInterestCalculator,
  "accrued-interest-calculator": accruedInterestCalculator,
  "deferred-interest-calculator": deferredInterestCalculator,
  "negative-amortization-interest-calculator": negativeAmortizationInterestCalculator,
  "weighted-average-interest-rate-calculator": weightedAverageInterestRateCalculator,
  "tiered-interest-rate-calculator": tieredInterestRateCalculator,
  "variable-interest-rate-calculator": variableInterestRateCalculator,
  "add-on-interest-calculator": addOnInterestCalculator,
  "bank-discount-interest-calculator": bankDiscountInterestCalculator,
};
