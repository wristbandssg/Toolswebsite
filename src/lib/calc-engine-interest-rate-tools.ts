/**
 * Batch: "Interest Calculators" expansion (5 Oct 2026), sub-batch 2 of 9 —
 * Interest Rate Tools (9 tools), filed under Interest Calculators. See
 * calc-engine-interest-methods.ts for the full batch context.
 *
 *  - ruleOf78sInterest: interest earned by the Rule of 78s after k months
 *    vs the actuarial (amortized) method; payoff and rebate.
 *  - breakEvenInterestRate: the reinvestment rate at which a short CD
 *    rolled over equals a long CD.
 *  - interestRateSpread: lending rate - funding rate, in basis points, net
 *    interest income and net interest margin.
 *  - prepaidInterest: per-diem mortgage interest from closing to month end.
 *  - interestRateCap (borrower buys a cap): quarterly payout when the index
 *    is above the strike, premium amortized, all-in rate with and without.
 *  - interestRateCollar (incl. floor): index kept between floor and cap.
 *  - escrowAccountInterest: interest a lender must pay on escrow balances
 *    in states that require it (average balance x rate).
 *  - trustAccountInterest: interest earned, trustee fee, net income
 *    distributed and the balance left.
 *  - islamicProfitRate (murabaha): flat profit on the cost price ->
 *    selling price, installment and the equivalent APR.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-interest-rate-tools-calculators.ts for the copy.
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

function balanceAfter(principal: number, i: number, pmt: number, k: number): number {
  if (i === 0) return Math.max(0, principal - pmt * k);
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (pmt * (g - 1)) / i);
}

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

// --- 1. Rule of 78s Interest Calculator -----------------------------------------------
export const ruleOf78sInterestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const aprPercent = Math.max(0, safeNumber(values.aprPercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const monthsPaid = Math.min(termMonths, Math.max(0, Math.round(safeNumber(values.monthsPaid, 12))));

  const i = aprPercent / 100 / 12;
  const p = payment(principal, i, termMonths);
  const financeCharge = p * termMonths - principal;
  const n = termMonths;
  const k = monthsPaid;
  const sumAll = (n * (n + 1)) / 2;
  const sumEarned = (k * (2 * n - k + 1)) / 2;
  const earned78 = (financeCharge * sumEarned) / sumAll;
  const earnedActuarial = p * k - (principal - balanceAfter(principal, i, p, k));
  const payoff78 = principal + financeCharge - p * k - (financeCharge - earned78);

  return {
    monthlyPayment: round2(p),
    totalFinanceCharge: round2(financeCharge),
    interestEarnedRuleOf78s: round2(earned78),
    interestEarnedActuarial: round2(earnedActuarial),
    extraCostOfRuleOf78s: round2(earned78 - earnedActuarial),
    rebateOfUnearnedInterest: round2(financeCharge - earned78),
    payoffAmount: round2(payoff78),
  };
};

// --- 2. Break-Even Interest Rate Calculator ------------------------------------------
export const breakEvenInterestRateCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 10000));
  const shortRatePercent = Math.max(0, safeNumber(values.shortRatePercent, 4.25));
  const shortYears = Math.max(0.25, safeNumber(values.shortYears, 1));
  const longRatePercent = Math.max(0, safeNumber(values.longRatePercent, 3.9));
  const longYears = Math.max(shortYears + 0.25, safeNumber(values.longYears, 3));

  const longValue = amount * Math.pow(1 + longRatePercent / 100, longYears);
  const shortValue = amount * Math.pow(1 + shortRatePercent / 100, shortYears);
  // growth factors don't depend on the amount, so this works for $0 too
  const ratio = Math.pow(1 + longRatePercent / 100, longYears) / Math.pow(1 + shortRatePercent / 100, shortYears);
  const breakEven = (Math.pow(ratio, 1 / (longYears - shortYears)) - 1) * 100;

  return {
    longTermValue: round2(longValue),
    shortTermValue: round2(shortValue),
    breakEvenReinvestmentRate: round2(breakEven),
    changeNeeded: round2(breakEven - shortRatePercent),
  };
};

// --- 3. Interest Rate Spread Calculator ----------------------------------------------
export const interestRateSpreadCalculator: CustomCalculator = (values) => {
  const earningRatePercent = safeNumber(values.earningRatePercent, 7.25);
  const fundingRatePercent = safeNumber(values.fundingRatePercent, 3.5);
  const earningAssets = Math.max(0, safeNumber(values.earningAssets, 1000000));
  const fundingAmount = Math.max(0, safeNumber(values.fundingAmount, 900000));

  const income = (earningAssets * earningRatePercent) / 100;
  const cost = (fundingAmount * fundingRatePercent) / 100;
  const net = income - cost;

  return {
    spreadPercent: round2(earningRatePercent - fundingRatePercent),
    spreadBasisPoints: Math.round((earningRatePercent - fundingRatePercent) * 100),
    interestIncome: round2(income),
    interestCost: round2(cost),
    netInterestIncome: round2(net),
    netInterestMargin: round2(earningAssets > 0 ? (net / earningAssets) * 100 : 0),
  };
};

// --- 4. Prepaid Interest Calculator --------------------------------------------------
export const prepaidInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 350000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.5));
  const closingDay = Math.max(1, Math.round(safeNumber(values.closingDay, 18)));
  const daysInMonth = Math.min(31, Math.max(28, Math.round(safeNumber(values.daysInMonth, 30))));
  const raw = Math.round(safeNumber(values.yearBasis, 365));
  const basis = raw === 360 ? 360 : 365;

  const day = Math.min(closingDay, daysInMonth);
  const days = daysInMonth - day + 1;
  const perDiem = (loanAmount * annualRatePercent) / 100 / basis;

  return {
    dailyInterest: round2(perDiem),
    daysOfPrepaidInterest: days,
    prepaidInterest: round2(perDiem * days),
    prepaidIfClosingOnFirst: round2(perDiem * daysInMonth),
    prepaidIfClosingOnLastDay: round2(perDiem),
  };
};

// --- 5. Interest Rate Cap Calculator -------------------------------------------------
export const interestRateCapCalculator: CustomCalculator = (values) => {
  const notional = Math.max(0, safeNumber(values.notional, 10000000));
  const strikePercent = Math.max(0, safeNumber(values.strikePercent, 4.5));
  const indexRatePercent = Math.max(0, safeNumber(values.indexRatePercent, 5.25));
  const spreadPercent = safeNumber(values.spreadPercent, 2.5);
  const premiumPercent = Math.max(0, safeNumber(values.premiumPercent, 1.2));
  const termYears = Math.max(0.25, safeNumber(values.termYears, 3));

  const payout = (notional * Math.max(0, indexRatePercent - strikePercent)) / 100 / 4;
  const premium = (notional * premiumPercent) / 100;
  const premiumPerYear = premium / termYears;
  const uncapped = indexRatePercent + spreadPercent;
  const capped = Math.min(indexRatePercent, strikePercent) + spreadPercent + (notional > 0 ? (premiumPerYear / notional) * 100 : 0);

  return {
    quarterlyPayout: round2(payout),
    yearlyPayout: round2(payout * 4),
    capPremium: round2(premium),
    rateWithoutCap: round2(uncapped),
    allInRateWithCap: round2(capped),
    maximumAllInRate: round2(strikePercent + spreadPercent + (notional > 0 ? (premiumPerYear / notional) * 100 : 0)),
    yearlySavingsAfterPremium: round2(payout * 4 - premiumPerYear),
  };
};

// --- 6. Interest Rate Collar Calculator (incl. floor) --------------------------------
export const interestRateCollarCalculator: CustomCalculator = (values) => {
  const notional = Math.max(0, safeNumber(values.notional, 10000000));
  const capStrikePercent = Math.max(0, safeNumber(values.capStrikePercent, 5.5));
  const floorStrikePercent = Math.max(0, Math.min(capStrikePercent, safeNumber(values.floorStrikePercent, 3)));
  const indexRatePercent = Math.max(0, safeNumber(values.indexRatePercent, 2.5));
  const spreadPercent = safeNumber(values.spreadPercent, 2.5);
  const netPremiumPercent = safeNumber(values.netPremiumPercent, 0);

  const effectiveIndex = Math.min(capStrikePercent, Math.max(floorStrikePercent, indexRatePercent));
  const capReceive = (notional * Math.max(0, indexRatePercent - capStrikePercent)) / 100 / 4;
  const floorPay = (notional * Math.max(0, floorStrikePercent - indexRatePercent)) / 100 / 4;

  return {
    effectiveIndexRate: round2(effectiveIndex),
    allInRate: round2(effectiveIndex + spreadPercent),
    lowestAllInRate: round2(floorStrikePercent + spreadPercent),
    highestAllInRate: round2(capStrikePercent + spreadPercent),
    quarterlyCapPayout: round2(capReceive),
    quarterlyFloorPayment: round2(floorPay),
    netPremium: round2((notional * netPremiumPercent) / 100),
  };
};

// --- 7. Escrow Account Interest Calculator -------------------------------------------
export const escrowAccountInterestCalculator: CustomCalculator = (values) => {
  const annualDisbursements = Math.max(0, safeNumber(values.annualDisbursements, 7200));
  const cushionMonths = Math.max(0, Math.min(2, safeNumber(values.cushionMonths, 2)));
  const requiredRatePercent = Math.max(0, safeNumber(values.requiredRatePercent, 2));
  const years = Math.max(0, safeNumber(values.years, 5));

  const monthly = annualDisbursements / 12;
  const average = annualDisbursements / 2 + monthly * cushionMonths;
  const yearly = (average * requiredRatePercent) / 100;

  return {
    averageEscrowBalance: round2(average),
    interestPerYear: round2(yearly),
    interestOverPeriod: round2(yearly * years),
  };
};

// --- 8. Trust Account Interest Calculator --------------------------------------------
export const trustAccountInterestCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 500000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4.5));
  const trusteeFeePercent = Math.max(0, safeNumber(values.trusteeFeePercent, 1));
  const distributePercent = Math.min(100, Math.max(0, safeNumber(values.distributePercent, 100)));
  const years = Math.max(0, Math.round(safeNumber(values.years, 10)));

  let b = balance;
  let interestTotal = 0;
  let feeTotal = 0;
  let distributed = 0;
  let firstNet = 0;
  for (let y = 0; y < years; y++) {
    const interest = (b * annualRatePercent) / 100;
    const fee = (b * trusteeFeePercent) / 100;
    const net = interest - fee;
    const paid = Math.max(0, (net * distributePercent) / 100);
    if (y === 0) firstNet = net;
    interestTotal += interest;
    feeTotal += fee;
    distributed += paid;
    b = b + net - paid;
  }

  return {
    firstYearInterest: round2((balance * annualRatePercent) / 100),
    firstYearNetIncome: round2(firstNet),
    totalInterest: round2(interestTotal),
    totalTrusteeFees: round2(feeTotal),
    totalDistributed: round2(distributed),
    balanceAtEnd: round2(b),
  };
};

// --- 9. Islamic Profit Rate Calculator (murabaha) ------------------------------------
export const islamicProfitRateCalculator: CustomCalculator = (values) => {
  const costPrice = Math.max(0, safeNumber(values.costPrice, 30000));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 3000));
  const profitRatePercent = Math.max(0, safeNumber(values.profitRatePercent, 5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  const financed = Math.max(0, costPrice - downPayment);
  const profit = (financed * profitRatePercent * termMonths) / 100 / 12;
  const installment = (financed + profit) / termMonths;

  return {
    amountFinanced: round2(financed),
    totalProfit: round2(profit),
    sellingPrice: round2(costPrice + profit),
    monthlyInstallment: round2(installment),
    equivalentApr: round2(solveMonthlyRate(financed, installment, termMonths) * 12 * 100),
  };
};

export const interestRateToolsCustomCalculators: Record<string, CustomCalculator> = {
  "rule-of-78s-interest-calculator": ruleOf78sInterestCalculator,
  "break-even-interest-rate-calculator": breakEvenInterestRateCalculator,
  "interest-rate-spread-calculator": interestRateSpreadCalculator,
  "prepaid-interest-calculator": prepaidInterestCalculator,
  "interest-rate-cap-calculator": interestRateCapCalculator,
  "interest-rate-collar-calculator": interestRateCollarCalculator,
  "escrow-account-interest-calculator": escrowAccountInterestCalculator,
  "trust-account-interest-calculator": trustAccountInterestCalculator,
  "islamic-profit-rate-calculator": islamicProfitRateCalculator,
};
