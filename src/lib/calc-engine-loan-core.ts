/**
 * Batch: "Loan Calculators" sub-batch A (Payment & Cost, 11 tools). Part of
 * the Loan Calculators tool-list build-out — 54 tools in the source list,
 * 1 skipped as an exact-slug duplicate (business-loan-calculator, already
 * in calc-engine-finance-business.ts under Business Finance), 53 built
 * across 5 sub-batches, all filed under Finance Calculators > Loan
 * Calculators (loan-calculators, created empty by
 * reparent-tool-categories-under-finance.ts):
 *  - calc-engine-loan-core.ts (this file)
 *  - calc-engine-loan-solve.ts
 *  - calc-engine-loan-payoff-refinance.ts
 *  - calc-engine-loan-types.ts
 *  - calc-engine-loan-business-student.ts
 *
 * This list has far more near-namesakes than earlier batches — a dozen
 * tools share the standard amortizing payment formula. Each is
 * deliberately differentiated by its inputs or its output framing:
 *  - loanCalculator: the plain general tool — amount, rate, years.
 *  - loanPaymentCalculator: any payment frequency (weekly ... annually).
 *  - monthlyLoanPaymentCalculator: term in MONTHS, adds monthly add-on
 *    costs (insurance, account fees) and splits month 1 into interest vs
 *    principal.
 *  - emiCalculator: Indian EMI convention — rupees, tenure in months, and
 *    the interest share of the total outgo.
 *  - installmentLoanCalculator: retail/purchase financing — price minus a
 *    down payment, repaid in N monthly installments.
 *  - loanRepaymentCalculator: compares the two repayment structures —
 *    equal installments (amortizing) vs equal principal (declining).
 *  - amortizationCalculator: year-1 interest/principal split plus the
 *    balance at the end of each of years 1-5 (mortgage-amortization-
 *    calculator covers home loans separately).
 *  - loanInterestCalculator: interest-focused — total, first month, first
 *    year, and interest per dollar borrowed.
 *  - totalLoanCostCalculator: interest PLUS origination/upfront/monthly
 *    fees — the full cost of borrowing.
 *  - simpleInterestLoanCalculator: flat (add-on) simple interest vs the
 *    same rate charged on a declining balance, and the flat loan's true
 *    APR.
 *  - compoundInterestLoanCalculator: a loan with NO payments (deferred)
 *    whose interest compounds, vs simple interest over the same period.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-loan-core-calculators.ts for the tool content/copy
 * this math is wired to.
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

// Level payment that repays `principal` over `n` periods at periodic rate `i`.
function payment(principal: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
}

// Balance remaining after `k` level payments of `pmt`.
function balanceAfter(principal: number, i: number, pmt: number, k: number): number {
  if (i === 0) return Math.max(0, principal - pmt * k);
  return Math.max(0, principal * Math.pow(1 + i, k) - (pmt * (Math.pow(1 + i, k) - 1)) / i);
}

// Periodic rate at which the present value of `n` payments of `pmt` equals
// `presentValue` (bisection; the PV falls as the rate rises).
function solvePeriodicRate(presentValue: number, pmt: number, n: number): number {
  if (presentValue <= 0 || pmt <= 0 || n <= 0 || pmt * n <= presentValue) return 0;
  const pv = (i: number) => (pmt * (1 - Math.pow(1 + i, -n))) / i;
  let lo = 1e-9;
  let hi = 1;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > presentValue) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// --- 1. Loan Calculator (general) --------------------------------------------
export const loanCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 25000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.5));
  const termYears = Math.max(0, safeNumber(values.termYears, 5));

  const n = Math.round(termYears * 12);
  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, n);
  const totalPaid = pmt * n;

  return {
    monthlyPayment: round2(pmt),
    totalInterest: round2(totalPaid - loanAmount),
    totalPaid: round2(totalPaid),
  };
};

// --- 2. Loan Payment Calculator (any frequency) ------------------------------
export const loanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const termYears = Math.max(0, safeNumber(values.termYears, 4));
  const paymentsPerYear = Math.max(1, safeNumber(values.paymentsPerYear, 12));

  const n = Math.round(termYears * paymentsPerYear);
  const pmt = payment(loanAmount, annualRatePercent / 100 / paymentsPerYear, n);
  const totalPaid = pmt * n;

  return {
    paymentPerPeriod: round2(pmt),
    numberOfPayments: n,
    totalInterest: round2(totalPaid - loanAmount),
    totalPaid: round2(totalPaid),
  };
};

// --- 3. Monthly Loan Payment Calculator (term in months + add-ons) ----------
export const monthlyLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const monthlyAddOns = Math.max(0, safeNumber(values.monthlyAddOns, 0));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const firstMonthInterest = loanAmount * i;

  return {
    principalAndInterest: round2(pmt),
    totalMonthlyPayment: round2(pmt + monthlyAddOns),
    firstMonthInterest: round2(firstMonthInterest),
    firstMonthPrincipal: round2(pmt - firstMonthInterest),
  };
};

// --- 4. EMI Calculator (India convention) ------------------------------------
export const emiCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 1000000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10.5));
  const tenureMonths = Math.max(1, Math.round(safeNumber(values.tenureMonths, 60)));

  const emi = payment(loanAmount, annualRatePercent / 100 / 12, tenureMonths);
  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - loanAmount;

  return {
    emi: round2(emi),
    totalInterest: round2(totalInterest),
    totalPayment: round2(totalPayment),
    interestSharePercent: totalPayment > 0 ? round2((totalInterest / totalPayment) * 100) : 0,
  };
};

// --- 5. Installment Loan Calculator (purchase financing) ---------------------
export const installmentLoanCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 3000));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 0));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const numberOfInstallments = Math.max(1, Math.round(safeNumber(values.numberOfInstallments, 24)));

  const amountFinanced = Math.max(0, purchasePrice - downPayment);
  const installment = payment(amountFinanced, annualRatePercent / 100 / 12, numberOfInstallments);
  const totalInterest = installment * numberOfInstallments - amountFinanced;

  return {
    amountFinanced: round2(amountFinanced),
    installmentAmount: round2(installment),
    totalInterest: round2(totalInterest),
    totalCost: round2(Math.min(downPayment, purchasePrice) + installment * numberOfInstallments),
  };
};

// --- 6. Loan Repayment Calculator (equal installments vs equal principal) ---
export const loanRepaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 50000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const termYears = Math.max(0, safeNumber(values.termYears, 5));

  const n = Math.max(1, Math.round(termYears * 12));
  const i = annualRatePercent / 100 / 12;
  const amortizingPayment = payment(loanAmount, i, n);
  const amortizingTotalInterest = amortizingPayment * n - loanAmount;

  // Equal principal: the same principal slice each month plus interest on
  // the shrinking balance, so payments start high and decline.
  const principalSlice = loanAmount / n;
  const equalPrincipalTotalInterest = (i * loanAmount * (n + 1)) / 2;

  return {
    amortizingPayment: round2(amortizingPayment),
    amortizingTotalInterest: round2(amortizingTotalInterest),
    equalPrincipalFirstPayment: round2(principalSlice + loanAmount * i),
    equalPrincipalLastPayment: round2(principalSlice * (1 + i)),
    equalPrincipalTotalInterest: round2(equalPrincipalTotalInterest),
    interestSavedWithEqualPrincipal: round2(amortizingTotalInterest - equalPrincipalTotalInterest),
  };
};

// --- 7. Amortization Calculator (year-1 split + year-end balances) ----------
export const amortizationCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 30000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.5));
  const termYears = Math.max(0, safeNumber(values.termYears, 5));

  const n = Math.max(1, Math.round(termYears * 12));
  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, n);
  const balanceAtYear = (y: number) => round2(balanceAfter(loanAmount, i, pmt, Math.min(n, y * 12)));
  const year1Payments = Math.min(n, 12);
  const year1Principal = loanAmount - balanceAfter(loanAmount, i, pmt, year1Payments);

  return {
    monthlyPayment: round2(pmt),
    year1Interest: round2(pmt * year1Payments - year1Principal),
    year1Principal: round2(year1Principal),
    balanceEndYear1: balanceAtYear(1),
    balanceEndYear2: balanceAtYear(2),
    balanceEndYear3: balanceAtYear(3),
    balanceEndYear4: balanceAtYear(4),
    balanceEndYear5: balanceAtYear(5),
    totalInterest: round2(pmt * n - loanAmount),
  };
};

// --- 8. Loan Interest Calculator ---------------------------------------------
export const loanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termYears = Math.max(0, safeNumber(values.termYears, 5));

  const n = Math.max(1, Math.round(termYears * 12));
  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, n);
  const totalInterest = pmt * n - loanAmount;
  const year1Payments = Math.min(n, 12);
  const firstYearInterest = pmt * year1Payments - (loanAmount - balanceAfter(loanAmount, i, pmt, year1Payments));

  return {
    totalInterest: round2(totalInterest),
    firstMonthInterest: round2(loanAmount * i),
    firstYearInterest: round2(firstYearInterest),
    interestPerDollarBorrowed: loanAmount > 0 ? round4(totalInterest / loanAmount) : 0,
  };
};

// --- 9. Total Loan Cost Calculator (interest + fees) -------------------------
export const totalLoanCostCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termYears = Math.max(0, safeNumber(values.termYears, 5));
  const originationFeePercent = Math.max(0, safeNumber(values.originationFeePercent, 0));
  const otherUpfrontFees = Math.max(0, safeNumber(values.otherUpfrontFees, 0));
  const monthlyFees = Math.max(0, safeNumber(values.monthlyFees, 0));

  const n = Math.max(1, Math.round(termYears * 12));
  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, n);
  const totalInterest = pmt * n - loanAmount;
  const totalFees = (loanAmount * originationFeePercent) / 100 + otherUpfrontFees + monthlyFees * n;

  return {
    totalInterest: round2(totalInterest),
    totalFees: round2(totalFees),
    totalCostOfBorrowing: round2(totalInterest + totalFees),
    totalAmountRepaid: round2(pmt * n + totalFees),
  };
};

// --- 10. Simple Interest Loan Calculator (flat vs declining balance) --------
export const simpleInterestLoanCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));

  const flatInterest = (principal * annualRatePercent * termMonths) / 100 / 12;
  const flatMonthlyPayment = (principal + flatInterest) / termMonths;
  const decliningPayment = payment(principal, annualRatePercent / 100 / 12, termMonths);
  const equivalentApr = solvePeriodicRate(principal, flatMonthlyPayment, termMonths) * 12 * 100;

  return {
    flatMonthlyPayment: round2(flatMonthlyPayment),
    flatTotalInterest: round2(flatInterest),
    decliningBalanceTotalInterest: round2(decliningPayment * termMonths - principal),
    flatLoanTrueAprPercent: round2(equivalentApr),
  };
};

// --- 11. Compound Interest Loan Calculator (no payments, deferred) ----------
export const compoundInterestLoanCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const compoundingFrequency = Math.max(1, safeNumber(values.compoundingFrequency, 12));
  const years = Math.max(0, safeNumber(values.years, 3));

  const amountOwed = principal * Math.pow(1 + annualRatePercent / 100 / compoundingFrequency, compoundingFrequency * years);
  const compoundInterest = amountOwed - principal;
  const simpleInterest = (principal * annualRatePercent * years) / 100;

  return {
    amountOwed: round2(amountOwed),
    compoundInterest: round2(compoundInterest),
    simpleInterestSamePeriod: round2(simpleInterest),
    extraFromCompounding: round2(compoundInterest - simpleInterest),
  };
};

export const loanCoreCustomCalculators: Record<string, CustomCalculator> = {
  "loan-calculator": loanCalculator,
  "loan-payment-calculator": loanPaymentCalculator,
  "monthly-loan-payment-calculator": monthlyLoanPaymentCalculator,
  "emi-calculator": emiCalculator,
  "installment-loan-calculator": installmentLoanCalculator,
  "loan-repayment-calculator": loanRepaymentCalculator,
  "amortization-calculator": amortizationCalculator,
  "loan-interest-calculator": loanInterestCalculator,
  "total-loan-cost-calculator": totalLoanCostCalculator,
  "simple-interest-loan-calculator": simpleInterestLoanCalculator,
  "compound-interest-loan-calculator": compoundInterestLoanCalculator,
};
