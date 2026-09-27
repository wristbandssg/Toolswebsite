/**
 * Batch: "Credit & Debt Calculators" (8 tools) — the first of 8 new topic
 * batches built from Finance_Calculators_Topical_SEO_Master.xlsx (a
 * finance-wide SEO/content plan covering Credit & Debt, Salary & Income,
 * Business Finance, Real Estate, Currency, Investment, Retirement, and
 * Savings — the Tax cluster in that same file was skipped entirely, since
 * all 7 of its tools already exist under the "Tax Calculators" category).
 *
 * These are general/global calculators (not jurisdiction-specific), filed
 * directly under the existing "Credit & Debt Calculators" category
 * (credit-debt-calculators, created empty by
 * reparent-tool-categories-under-finance.ts and populated here for the
 * first time). Self-contained: no imports from any other batch, per this
 * project's established per-batch convention.
 *
 * See prisma/create-finance-credit-debt-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

// A standard amortizing payoff simulation: given a starting balance, a
// fixed monthly interest rate, and a fixed monthly payment, simulate
// month-by-month paydown. Capped at 600 months (50 years) so a payment
// that's too low to ever cover the interest can't loop forever — in that
// case the months figure comes back at the cap and totalInterestPaid
// reflects interest paid over that window, which is itself informative
// ("this payment barely dents your balance").
function simulatePayoff(startingBalance: number, monthlyRate: number, monthlyPayment: number) {
  let balance = startingBalance;
  let totalInterest = 0;
  let months = 0;
  const CAP = 600;
  while (balance > 0 && months < CAP) {
    const interest = balance * monthlyRate;
    let principalPayment = monthlyPayment - interest;
    if (principalPayment <= 0) {
      // Payment doesn't even cover interest — the balance never goes down.
      // Report the cap as "months" (a clear signal this payment can't work)
      // and the interest that would accrue over that window.
      totalInterest += interest * (CAP - months);
      months = CAP;
      break;
    }
    if (principalPayment > balance) principalPayment = balance;
    balance -= principalPayment;
    totalInterest += interest;
    months += 1;
  }
  return { months, totalInterest };
}

// Standard loan/annuity payment formula: M = P * r(1+r)^n / ((1+r)^n - 1)
function annuityPayment(principal: number, monthlyRate: number, numPayments: number): number {
  if (monthlyRate === 0) return principal / numPayments;
  const factor = Math.pow(1 + monthlyRate, numPayments);
  return (principal * monthlyRate * factor) / (factor - 1);
}

// --- 1. Debt Payoff Calculator (the primary hub tool) -----------------------
export const debtPayoffCalculator: CustomCalculator = (values) => {
  const balance = safeNumber(values.currentBalance);
  const apr = safeNumber(values.annualInterestRate);
  const payment = safeNumber(values.monthlyPayment);
  const monthlyRate = apr / 100 / 12;
  const { months, totalInterest } = simulatePayoff(balance, monthlyRate, payment);
  return {
    monthsToPayoff: months,
    yearsToPayoff: Math.round((months / 12) * 10) / 10,
    totalInterestPaid: Math.round(totalInterest * 100) / 100,
    totalAmountPaid: Math.round((balance + totalInterest) * 100) / 100,
  };
};

// --- 2. Credit Card Payoff Calculator ---------------------------------------
export const creditCardPayoffCalculator: CustomCalculator = (values) => {
  const balance = safeNumber(values.cardBalance);
  const apr = safeNumber(values.apr);
  const payment = safeNumber(values.monthlyPayment);
  const monthlyRate = apr / 100 / 12;
  const { months, totalInterest } = simulatePayoff(balance, monthlyRate, payment);
  return {
    monthsToPayoff: months,
    totalInterestPaid: Math.round(totalInterest * 100) / 100,
    totalAmountPaid: Math.round((balance + totalInterest) * 100) / 100,
  };
};

// --- 3. Credit Card Interest Calculator -------------------------------------
export const creditCardInterestCalculator: CustomCalculator = (values) => {
  const balance = safeNumber(values.cardBalance);
  const apr = safeNumber(values.apr);
  const dailyRate = apr / 100 / 365;
  const monthlyInterest = balance * (apr / 100 / 12);
  const dailyInterest = balance * dailyRate;
  const annualInterestIfUnpaid = balance * (apr / 100);
  return {
    dailyInterest: Math.round(dailyInterest * 100) / 100,
    monthlyInterest: Math.round(monthlyInterest * 100) / 100,
    annualInterestIfUnpaid: Math.round(annualInterestIfUnpaid * 100) / 100,
  };
};

// --- 4. Minimum Payment Calculator -------------------------------------------
// Most issuers set the minimum as the greater of a flat dollar floor or a
// percentage of the current balance, recalculated every month as the
// balance shrinks — so paying only the minimum stretches out for a very
// long time and the payment itself shrinks along the way.
export const minimumPaymentCalculator: CustomCalculator = (values) => {
  const balance = safeNumber(values.cardBalance);
  const apr = safeNumber(values.apr);
  const minPercent = safeNumber(values.minPaymentPercent, 2) / 100;
  const minFloor = safeNumber(values.minPaymentFloor, 25);
  const monthlyRate = apr / 100 / 12;

  const initialMinimumPayment = Math.max(balance * minPercent, Math.min(minFloor, balance));

  let bal = balance;
  let totalInterest = 0;
  let months = 0;
  const CAP = 600;
  while (bal > 0.01 && months < CAP) {
    const interest = bal * monthlyRate;
    const payment = Math.max(bal * minPercent, minFloor, interest + 0.01);
    const principalPayment = Math.min(payment - interest, bal);
    if (principalPayment <= 0) {
      months = CAP;
      break;
    }
    bal -= principalPayment;
    totalInterest += interest;
    months += 1;
  }

  return {
    initialMinimumPayment: Math.round(initialMinimumPayment * 100) / 100,
    monthsToPayoffAtMinimum: months,
    totalInterestAtMinimum: Math.round(totalInterest * 100) / 100,
  };
};

// --- 5. Debt Consolidation Calculator ----------------------------------------
export const debtConsolidationCalculator: CustomCalculator = (values) => {
  const balance = safeNumber(values.totalDebtBalance);
  const currentApr = safeNumber(values.currentAverageApr);
  const consolidationApr = safeNumber(values.consolidationApr);
  const termMonths = Math.max(1, safeNumber(values.consolidationTermMonths, 36));

  const consolidatedPayment = annuityPayment(balance, consolidationApr / 100 / 12, termMonths);
  const consolidatedTotalInterest = consolidatedPayment * termMonths - balance;

  const originalPaymentSameTerm = annuityPayment(balance, currentApr / 100 / 12, termMonths);
  const originalTotalInterestSameTerm = originalPaymentSameTerm * termMonths - balance;

  return {
    newMonthlyPayment: Math.round(consolidatedPayment * 100) / 100,
    totalInterestAfterConsolidation: Math.round(consolidatedTotalInterest * 100) / 100,
    estimatedInterestSavings: Math.round((originalTotalInterestSameTerm - consolidatedTotalInterest) * 100) / 100,
  };
};

// --- 6. Debt-to-Income Ratio Calculator --------------------------------------
export const debtToIncomeRatioCalculator: CustomCalculator = (values) => {
  const monthlyDebt = safeNumber(values.monthlyDebtPayments);
  const grossIncome = Math.max(1, safeNumber(values.grossMonthlyIncome));
  const dti = (monthlyDebt / grossIncome) * 100;
  return Math.round(dti * 100) / 100;
};

// --- 7. Loan-to-Income Ratio Calculator --------------------------------------
export const loanToIncomeRatioCalculator: CustomCalculator = (values) => {
  const loanAmount = safeNumber(values.totalLoanAmount);
  const annualIncome = Math.max(1, safeNumber(values.annualGrossIncome));
  const ratio = loanAmount / annualIncome;
  return {
    loanToIncomeMultiple: Math.round(ratio * 100) / 100,
    loanToIncomePercent: Math.round(ratio * 100 * 100) / 100,
  };
};

// --- 8. Debt Snowball Calculator ----------------------------------------------
// Supports up to 3 debts (a fixed-slot simplification — see the tool's
// Assumptions text). Pays the minimum on every debt, plus one shared extra
// payment aimed at whichever debt has the SMALLEST balance; once a debt is
// cleared, its minimum joins the extra payment pool for the next-smallest
// (the "snowball" effect).
export const debtSnowballCalculator: CustomCalculator = (values) => {
  const debts = [
    { balance: safeNumber(values.debt1Balance), apr: safeNumber(values.debt1Apr), minPayment: safeNumber(values.debt1MinPayment) },
    { balance: safeNumber(values.debt2Balance), apr: safeNumber(values.debt2Apr), minPayment: safeNumber(values.debt2MinPayment) },
    { balance: safeNumber(values.debt3Balance), apr: safeNumber(values.debt3Apr), minPayment: safeNumber(values.debt3MinPayment) },
  ].filter((d) => d.balance > 0);

  const extraPayment = safeNumber(values.extraMonthlyPayment);

  if (debts.length === 0) {
    return { monthsToDebtFree: 0, yearsToDebtFree: 0, totalInterestPaid: 0 };
  }

  let months = 0;
  let totalInterest = 0;
  const CAP = 600;
  const live = debts.map((d) => ({ ...d }));

  while (live.some((d) => d.balance > 0.01) && months < CAP) {
    // Interest accrues on every live debt this month.
    for (const d of live) {
      if (d.balance <= 0) continue;
      const interest = d.balance * (d.apr / 100 / 12);
      d.balance += interest;
      totalInterest += interest;
    }
    // Every already-cleared debt's minimum payment has nowhere to go but
    // into the snowball pool, alongside the fixed extra payment.
    const freedMinimums = live.filter((d) => d.balance <= 0).reduce((sum, d) => sum + d.minPayment, 0);
    // Minimum payments on every still-live debt.
    for (const d of live) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.minPayment, d.balance);
      d.balance -= pay;
    }
    // Snowball: the extra payment plus every freed-up minimum go to
    // whichever debt has the smallest remaining balance.
    let snowballPool = extraPayment + freedMinimums;
    const target = live
      .filter((d) => d.balance > 0.01)
      .sort((a, b) => a.balance - b.balance)[0];
    if (target && snowballPool > 0) {
      const pay = Math.min(snowballPool, target.balance);
      target.balance -= pay;
      snowballPool -= pay;
    }
    months += 1;
  }

  return {
    monthsToDebtFree: months,
    yearsToDebtFree: Math.round((months / 12) * 10) / 10,
    totalInterestPaid: Math.round(totalInterest * 100) / 100,
  };
};

export const financeCreditDebtCustomCalculators: Record<string, CustomCalculator> = {
  "debt-payoff-calculator": debtPayoffCalculator,
  "credit-card-payoff-calculator": creditCardPayoffCalculator,
  "credit-card-interest-calculator": creditCardInterestCalculator,
  "minimum-payment-calculator": minimumPaymentCalculator,
  "debt-consolidation-calculator": debtConsolidationCalculator,
  "debt-to-income-ratio-calculator": debtToIncomeRatioCalculator,
  "loan-to-income-ratio-calculator": loanToIncomeRatioCalculator,
  "debt-snowball-calculator": debtSnowballCalculator,
};
