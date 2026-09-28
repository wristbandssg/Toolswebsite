/**
 * Batch: "Savings Calculators" sub-batch C (Interest & Account Types, 9
 * tools). Part of the Savings Calculators build-out — see
 * calc-engine-savings-core.ts for the full list of 6 sub-batches. Filed
 * under Finance Calculators > Savings Calculators.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - compoundSavingsCalculator: the SAME deposit and rate compounded
 *    annually, quarterly, monthly and daily side by side.
 *  - simpleInterestSavingsCalculator: interest PAID OUT (not reinvested) —
 *    the payout each period vs what reinvesting would have grown to.
 *    (simple-interest-calculator under Investment is the bare formula.)
 *  - savingsApyCalculator: the APY actually EARNED, worked backwards from
 *    the interest a bank paid over a number of days (the US Truth in
 *    Savings formula). (apy-calculator converts a nominal rate to APY.)
 *  - savingsAprCalculator: an account's advertised APY converted to the
 *    nominal APR and per-period rate, plus what that means in dollars per
 *    month and per year on a given balance. (apy-to-apr-calculator under
 *    Interest does the bare rate conversion only.)
 *  - savingsAccountCalculator: an account with a monthly maintenance fee
 *    that's waived above a minimum balance — net earnings after fees.
 *  - highYieldSavingsCalculator: a high-yield account vs a traditional
 *    savings account at the same deposits — the extra earned.
 *  - moneyMarketSavingsCalculator: a TIERED rate (one rate up to a balance
 *    threshold, a higher one above it) and the blended rate that results.
 *  - cdSavingsCalculator: a CD cashed in early — the early-withdrawal
 *    penalty and what you'd walk away with vs holding to maturity.
 *    (cd-calculator covers holding to maturity only.)
 *  - savingsComparisonCalculator: any two accounts, each with its own
 *    APY, monthly fee and sign-up bonus, compared over the same deposits.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-savings-accounts-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// Monthly rate that compounds to `apyPercent` over a year.
function monthlyFromApy(apyPercent: number): number {
  return Math.pow(1 + apyPercent / 100, 1 / 12) - 1;
}

// Balance after `months` of monthly compounding at monthly rate `i`, with
// `deposit` added at the end of each month and a flat `fee` taken each month
// (never below zero), starting from `start`.
function simulate(start: number, deposit: number, i: number, fee: number, months: number) {
  let balance = start;
  let interest = 0;
  let fees = 0;
  for (let m = 1; m <= months; m++) {
    const earned = balance * i;
    interest += earned;
    const available = balance + earned + deposit;
    const charged = Math.min(fee, available);
    fees += charged;
    balance = available - charged;
  }
  return { balance, interest, fees };
}

// --- 1. Compound Savings Calculator (compounding frequency side by side) ---
export const compoundSavingsCalculator: CustomCalculator = (values) => {
  const deposit = Math.max(0, safeNumber(values.deposit, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 5));
  const years = Math.max(0, safeNumber(values.years, 10));

  const r = annualRatePercent / 100;
  const at = (m: number) => deposit * Math.pow(1 + r / m, m * years);

  return {
    balanceDaily: round2(at(365)),
    balanceMonthly: round2(at(12)),
    balanceQuarterly: round2(at(4)),
    balanceAnnually: round2(at(1)),
    dailyVsAnnualExtra: round2(at(365) - at(1)),
  };
};

// --- 2. Simple Interest Savings Calculator (interest paid out) -------------
export const simpleInterestSavingsCalculator: CustomCalculator = (values) => {
  const deposit = Math.max(0, safeNumber(values.deposit, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4));
  const payoutsPerYear = Math.max(1, safeNumber(values.payoutsPerYear, 12));
  const years = Math.max(0, safeNumber(values.years, 5));

  const r = annualRatePercent / 100;
  const totalPaidOut = deposit * r * years;
  const reinvested = deposit * Math.pow(1 + r / payoutsPerYear, payoutsPerYear * years);

  return {
    payoutPerPeriod: round2((deposit * r) / payoutsPerYear),
    totalInterestPaidOut: round2(totalPaidOut),
    balanceIfReinvested: round2(reinvested),
    extraFromReinvesting: round2(reinvested - deposit - totalPaidOut),
  };
};

// --- 3. Savings APY Calculator (APY earned, from interest paid) ------------
export const savingsApyCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const interestEarned = Math.max(0, safeNumber(values.interestEarned, 110));
  const daysInTerm = Math.max(1, Math.round(safeNumber(values.daysInTerm, 91)));

  // Truth in Savings (Regulation DD) APY formula:
  // APY = 100 × [(1 + interest ÷ principal)^(365 ÷ days) − 1]
  const growth = principal > 0 ? interestEarned / principal : 0;
  const apy = (Math.pow(1 + growth, 365 / daysInTerm) - 1) * 100;

  return {
    apyEarnedPercent: round4(apy),
    simpleAnnualRatePercent: round4(growth * (365 / daysInTerm) * 100),
    projectedInterestPerYear: round2((principal * apy) / 100),
  };
};

// --- 4. Savings APR Calculator (advertised APY → APR + dollars) ------------
export const savingsAprCalculator: CustomCalculator = (values) => {
  const apyPercent = Math.max(0, safeNumber(values.apyPercent, 4.5));
  const compoundingPerYear = Math.max(1, safeNumber(values.compoundingPerYear, 365));
  const balance = Math.max(0, safeNumber(values.balance, 15000));

  const periodic = Math.pow(1 + apyPercent / 100, 1 / compoundingPerYear) - 1;
  const apr = periodic * compoundingPerYear * 100;

  return {
    aprPercent: round4(apr),
    // Six decimals — a daily rate is a tiny fraction of a percent.
    periodicRatePercent: Math.round(periodic * 100 * 1e6) / 1e6,
    interestPerMonth: round2(balance * monthlyFromApy(apyPercent)),
    interestPerYear: round2((balance * apyPercent) / 100),
  };
};

// --- 5. Savings Account Calculator (fee waived above a minimum balance) ----
export const savingsAccountCalculator: CustomCalculator = (values) => {
  const openingBalance = Math.max(0, safeNumber(values.openingBalance, 1000));
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 100));
  const apyPercent = Math.max(0, safeNumber(values.apyPercent, 0.5));
  const monthlyFee = Math.max(0, safeNumber(values.monthlyFee, 5));
  const minimumBalanceToWaive = Math.max(0, safeNumber(values.minimumBalanceToWaive, 1500));
  const months = Math.max(0, Math.round(safeNumber(values.months, 24)));

  const i = monthlyFromApy(apyPercent);
  let balance = openingBalance;
  let interest = 0;
  let fees = 0;
  let monthsCharged = 0;
  for (let m = 1; m <= months; m++) {
    const earned = balance * i;
    interest += earned;
    // The fee is waived for any month that STARTS at or above the minimum.
    const feeDue = balance >= minimumBalanceToWaive ? 0 : monthlyFee;
    const available = balance + earned + monthlyDeposit;
    const charged = Math.min(feeDue, available);
    if (charged > 0) monthsCharged++;
    fees += charged;
    balance = available - charged;
  }

  return {
    endingBalance: round2(balance),
    interestEarned: round2(interest),
    feesPaid: round2(fees),
    netEarnings: round2(interest - fees),
    monthsFeeCharged: monthsCharged,
  };
};

// --- 6. High-Yield Savings Calculator (vs a traditional account) -----------
export const highYieldSavingsCalculator: CustomCalculator = (values) => {
  const startingBalance = Math.max(0, safeNumber(values.startingBalance, 10000));
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 200));
  const highYieldApyPercent = Math.max(0, safeNumber(values.highYieldApyPercent, 4.25));
  const traditionalApyPercent = Math.max(0, safeNumber(values.traditionalApyPercent, 0.4));
  const years = Math.max(0, safeNumber(values.years, 5));

  const n = Math.round(years * 12);
  const hy = simulate(startingBalance, monthlyDeposit, monthlyFromApy(highYieldApyPercent), 0, n);
  const trad = simulate(startingBalance, monthlyDeposit, monthlyFromApy(traditionalApyPercent), 0, n);

  return {
    highYieldBalance: round2(hy.balance),
    traditionalBalance: round2(trad.balance),
    extraEarned: round2(hy.balance - trad.balance),
    highYieldInterest: round2(hy.interest),
    traditionalInterest: round2(trad.interest),
  };
};

// --- 7. Money Market Savings Calculator (tiered rate) ----------------------
export const moneyMarketSavingsCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 30000));
  const tierThreshold = Math.max(0, safeNumber(values.tierThreshold, 25000));
  const rateBelowPercent = Math.max(0, safeNumber(values.rateBelowPercent, 2.5));
  const rateAbovePercent = Math.max(0, safeNumber(values.rateAbovePercent, 4.25));
  const years = Math.max(0, safeNumber(values.years, 3));

  // Each slice of the balance earns its own tier's rate (the "blended"
  // tiering method), compounded monthly on the running balance.
  const annualInterestOn = (b: number) =>
    Math.min(b, tierThreshold) * (rateBelowPercent / 100) + Math.max(0, b - tierThreshold) * (rateAbovePercent / 100);
  const n = Math.round(years * 12);
  let running = balance;
  for (let m = 1; m <= n; m++) running += annualInterestOn(running) / 12;

  const firstYearRate = annualInterestOn(balance);

  return {
    blendedRatePercent: balance > 0 ? round4((firstYearRate / balance) * 100) : 0,
    interestFirstMonth: round2(firstYearRate / 12),
    balanceAfterPeriod: round2(running),
    totalInterest: round2(running - balance),
  };
};

// --- 8. CD Savings Calculator (early withdrawal penalty) -------------------
export const cdSavingsCalculator: CustomCalculator = (values) => {
  const deposit = Math.max(0, safeNumber(values.deposit, 10000));
  const apyPercent = Math.max(0, safeNumber(values.apyPercent, 4.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));
  const withdrawAfterMonths = Math.min(termMonths, Math.max(0, Math.round(safeNumber(values.withdrawAfterMonths, 12))));
  const penaltyMonthsOfInterest = Math.max(0, safeNumber(values.penaltyMonthsOfInterest, 6));

  const i = monthlyFromApy(apyPercent);
  const atMaturity = deposit * Math.pow(1 + i, termMonths);
  const accruedAtWithdrawal = deposit * Math.pow(1 + i, withdrawAfterMonths) - deposit;
  // Penalties are normally quoted as "N months of interest" at the CD's
  // rate on the amount withdrawn.
  const penalty = withdrawAfterMonths < termMonths ? deposit * i * penaltyMonthsOfInterest : 0;
  const walkAway = deposit + accruedAtWithdrawal - penalty;

  return {
    valueAtMaturity: round2(atMaturity),
    interestAccruedAtWithdrawal: round2(accruedAtWithdrawal),
    earlyWithdrawalPenalty: round2(penalty),
    amountReceivedIfWithdrawnEarly: round2(walkAway),
    netGainOrLossIfWithdrawnEarly: round2(walkAway - deposit),
  };
};

// --- 9. Savings Comparison Calculator (two accounts, fees and bonuses) -----
export const savingsComparisonCalculator: CustomCalculator = (values) => {
  const startingBalance = Math.max(0, safeNumber(values.startingBalance, 5000));
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 200));
  const years = Math.max(0, safeNumber(values.years, 3));
  const apyA = Math.max(0, safeNumber(values.apyA, 4.3));
  const monthlyFeeA = Math.max(0, safeNumber(values.monthlyFeeA, 0));
  const bonusA = Math.max(0, safeNumber(values.bonusA, 0));
  const apyB = Math.max(0, safeNumber(values.apyB, 3.8));
  const monthlyFeeB = Math.max(0, safeNumber(values.monthlyFeeB, 0));
  const bonusB = Math.max(0, safeNumber(values.bonusB, 200));

  const n = Math.round(years * 12);
  // Sign-up bonuses are treated as credited at the start.
  const a = simulate(startingBalance + bonusA, monthlyDeposit, monthlyFromApy(apyA), monthlyFeeA, n);
  const b = simulate(startingBalance + bonusB, monthlyDeposit, monthlyFromApy(apyB), monthlyFeeB, n);

  return {
    balanceA: round2(a.balance),
    balanceB: round2(b.balance),
    differenceAMinusB: round2(a.balance - b.balance),
    netEarningsA: round2(a.interest + bonusA - a.fees),
    netEarningsB: round2(b.interest + bonusB - b.fees),
  };
};

export const savingsAccountsCustomCalculators: Record<string, CustomCalculator> = {
  "compound-savings-calculator": compoundSavingsCalculator,
  "simple-interest-savings-calculator": simpleInterestSavingsCalculator,
  "savings-apy-calculator": savingsApyCalculator,
  "savings-apr-calculator": savingsAprCalculator,
  "savings-account-calculator": savingsAccountCalculator,
  "high-yield-savings-calculator": highYieldSavingsCalculator,
  "money-market-savings-calculator": moneyMarketSavingsCalculator,
  "cd-savings-calculator": cdSavingsCalculator,
  "savings-comparison-calculator": savingsComparisonCalculator,
};
