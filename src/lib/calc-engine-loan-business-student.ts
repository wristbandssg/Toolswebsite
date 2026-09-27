/**
 * Batch: "Loan Calculators" sub-batch E (Business & Student Loans, 11
 * tools). Part of the Loan Calculators tool-list build-out — see
 * calc-engine-loan-core.ts for the full batch context, the skipped
 * duplicate (business-loan-calculator, since moved into Loan Calculators),
 * and the other 4 sub-batches.
 *
 * Each tool models what is specific to that kind of borrowing, so none of
 * them is a re-skin of the general loan payment formula (or of the existing
 * business-loan-calculator, which is a plain monthly payment):
 *  - businessLoanPaymentCalculator: daily (business-day), weekly, biweekly
 *    or monthly repayment — as online/alternative business lenders use —
 *    and net funding after an origination fee.
 *  - businessLoanInterestCalculator: interest cost AFTER the business tax
 *    deduction for interest.
 *  - businessLoanPayoffCalculator: early payoff under a tiered prepayment
 *    penalty schedule (SBA 7(a)-style 5%/3%/1%), a flat penalty, or none.
 *  - businessLoanAprCalculator: converts a FACTOR RATE (merchant cash
 *    advance / short-term business financing) into an APR.
 *  - businessLoanAffordabilityCalculator: sized by the debt service
 *    coverage ratio (DSCR) lenders use for businesses, not personal DTI.
 *  - businessLoanEmiCalculator: Indian business-loan EMI with a processing
 *    fee plus GST on that fee, and the net amount disbursed.
 *  - workingCapitalLoanCalculator: sizes the working capital gap from the
 *    cash conversion cycle, and its yearly interest cost.
 *  - equipmentLoanCalculator: down payment %, plus a yearly cost of
 *    ownership after resale (salvage) value over the equipment's life.
 *  - studentLoanCalculator: several years of disbursements, in-school
 *    interest (unsubsidized/capitalized, subsidized, or paid as you go) and
 *    a grace period before repayment starts.
 *  - studentLoanPayoffCalculator: your payment vs the standard 10-year plan.
 *  - studentLoanRefinanceCalculator: consolidates up to 3 loans (weighted
 *    average rate) into one refinanced loan.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-loan-business-student-calculators.ts for the tool
 * content/copy this math is wired to.
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

function presentValue(pmt: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? pmt * n : (pmt * (1 - Math.pow(1 + i, -n))) / i;
}

function balanceAfter(principal: number, i: number, pmt: number, k: number): number {
  if (i === 0) return Math.max(0, principal - pmt * k);
  return Math.max(0, principal * Math.pow(1 + i, k) - (pmt * (Math.pow(1 + i, k) - 1)) / i);
}

function solvePeriodicRate(pv: number, pmt: number, n: number): number {
  if (pv <= 0 || pmt <= 0 || n <= 0 || pmt * n <= pv) return 0;
  let lo = 1e-9;
  let hi = 1;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (presentValue(pmt, mid, n) > pv) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// --- 1. Business Loan Payment Calculator (daily/weekly/monthly) -------------
export const businessLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 100000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));
  const paymentsPerYear = Math.max(1, safeNumber(values.paymentsPerYear, 52));
  const originationFeePercent = Math.max(0, safeNumber(values.originationFeePercent, 0));

  const n = Math.max(1, Math.round((paymentsPerYear * termMonths) / 12));
  const pmt = payment(loanAmount, annualRatePercent / 100 / paymentsPerYear, n);

  return {
    paymentPerPeriod: round2(pmt),
    numberOfPayments: n,
    totalInterest: round2(pmt * n - loanAmount),
    netFundingReceived: round2(loanAmount * (1 - originationFeePercent / 100)),
  };
};

// --- 2. Business Loan Interest Calculator (after tax deduction) -------------
export const businessLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 150000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termYears = Math.max(0, safeNumber(values.termYears, 5));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 21)));

  const n = Math.max(1, Math.round(termYears * 12));
  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, n);
  const totalInterest = pmt * n - loanAmount;
  const year1Payments = Math.min(n, 12);
  const firstYearInterest = pmt * year1Payments - (loanAmount - balanceAfter(loanAmount, i, pmt, year1Payments));
  const tax = taxRatePercent / 100;

  return {
    totalInterest: round2(totalInterest),
    afterTaxInterestCost: round2(totalInterest * (1 - tax)),
    firstYearInterest: round2(firstYearInterest),
    firstYearTaxSavings: round2(firstYearInterest * tax),
    monthlyPayment: round2(pmt),
  };
};

// --- 3. Business Loan Payoff Calculator (tiered prepayment penalty) ---------
export const businessLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 80000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 60)));
  const loanAgeYears = Math.max(0, safeNumber(values.loanAgeYears, 1.5));
  const penaltySchedule = safeNumber(values.penaltySchedule, 1); // 1 = 5/3/1 tiers, 2 = flat, 3 = none
  const flatPenaltyPercent = Math.max(0, safeNumber(values.flatPenaltyPercent, 0));

  let penaltyPercent = 0;
  if (penaltySchedule === 1) {
    penaltyPercent = loanAgeYears < 1 ? 5 : loanAgeYears < 2 ? 3 : loanAgeYears < 3 ? 1 : 0;
  } else if (penaltySchedule === 2) {
    penaltyPercent = flatPenaltyPercent;
  }

  const pmt = payment(balance, annualRatePercent / 100 / 12, remainingMonths);
  const interestAvoided = pmt * remainingMonths - balance;
  const penaltyAmount = (balance * penaltyPercent) / 100;

  return {
    penaltyPercent: round2(penaltyPercent),
    penaltyAmount: round2(penaltyAmount),
    payoffAmount: round2(balance + penaltyAmount),
    interestAvoided: round2(interestAvoided),
    netSavings: round2(interestAvoided - penaltyAmount),
  };
};

// --- 4. Business Loan APR Calculator (factor rate -> APR) -------------------
export const businessLoanAprCalculator: CustomCalculator = (values) => {
  const advanceAmount = Math.max(0, safeNumber(values.advanceAmount, 50000));
  const factorRate = Math.max(1, safeNumber(values.factorRate, 1.3));
  const termMonths = Math.max(1, safeNumber(values.termMonths, 9));
  const paymentsPerYear = Math.max(1, safeNumber(values.paymentsPerYear, 252));
  const originationFeePercent = Math.max(0, safeNumber(values.originationFeePercent, 0));

  const totalRepayment = advanceAmount * factorRate;
  const n = Math.max(1, Math.round((paymentsPerYear * termMonths) / 12));
  const pmt = totalRepayment / n;
  const fee = (advanceAmount * originationFeePercent) / 100;
  const periodicRate = solvePeriodicRate(advanceAmount - fee, pmt, n);

  return {
    aprPercent: round2(periodicRate * paymentsPerYear * 100),
    totalRepayment: round2(totalRepayment),
    paymentPerPeriod: round2(pmt),
    totalFinancingCost: round2(totalRepayment - advanceAmount + fee),
  };
};

// --- 5. Business Loan Affordability Calculator (DSCR) -----------------------
export const businessLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const annualNetOperatingIncome = Math.max(0, safeNumber(values.annualNetOperatingIncome, 240000));
  const existingAnnualDebtService = Math.max(0, safeNumber(values.existingAnnualDebtService, 0));
  const requiredDscr = Math.max(0.01, safeNumber(values.requiredDscr, 1.25));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termYears = Math.max(0, safeNumber(values.termYears, 10));

  const maxAnnualDebtService = Math.max(0, annualNetOperatingIncome / requiredDscr - existingAnnualDebtService);
  const maxMonthlyPayment = maxAnnualDebtService / 12;
  const maxLoanAmount = presentValue(maxMonthlyPayment, annualRatePercent / 100 / 12, Math.round(termYears * 12));

  return {
    maxLoanAmount: round2(maxLoanAmount),
    maxAnnualDebtService: round2(maxAnnualDebtService),
    maxMonthlyPayment: round2(maxMonthlyPayment),
    currentDscr: existingAnnualDebtService > 0 ? round2(annualNetOperatingIncome / existingAnnualDebtService) : 0,
  };
};

// --- 6. Business Loan EMI Calculator (India: processing fee + GST) ----------
export const businessLoanEmiCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 2000000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 14));
  const tenureMonths = Math.max(1, Math.round(safeNumber(values.tenureMonths, 36)));
  const processingFeePercent = Math.max(0, safeNumber(values.processingFeePercent, 0));
  const gstPercent = Math.max(0, safeNumber(values.gstPercent, 18));

  const emi = payment(loanAmount, annualRatePercent / 100 / 12, tenureMonths);
  const totalInterest = emi * tenureMonths - loanAmount;
  const processingFeeWithGst = ((loanAmount * processingFeePercent) / 100) * (1 + gstPercent / 100);

  return {
    emi: round2(emi),
    totalInterest: round2(totalInterest),
    processingFeeWithGst: round2(processingFeeWithGst),
    netDisbursal: round2(loanAmount - processingFeeWithGst),
    totalCostOfLoan: round2(totalInterest + processingFeeWithGst),
  };
};

// --- 7. Working Capital Loan Calculator (cash conversion cycle) -------------
export const workingCapitalLoanCalculator: CustomCalculator = (values) => {
  const annualRevenue = Math.max(0, safeNumber(values.annualRevenue, 1200000));
  const annualCogs = Math.max(0, safeNumber(values.annualCogs, 720000));
  const daysSalesOutstanding = Math.max(0, safeNumber(values.daysSalesOutstanding, 45));
  const daysInventoryOutstanding = Math.max(0, safeNumber(values.daysInventoryOutstanding, 60));
  const daysPayablesOutstanding = Math.max(0, safeNumber(values.daysPayablesOutstanding, 30));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));

  const receivables = (annualRevenue / 365) * daysSalesOutstanding;
  const inventory = (annualCogs / 365) * daysInventoryOutstanding;
  const payables = (annualCogs / 365) * daysPayablesOutstanding;
  const workingCapitalNeeded = Math.max(0, receivables + inventory - payables);

  return {
    workingCapitalNeeded: round2(workingCapitalNeeded),
    cashConversionCycleDays: round2(daysInventoryOutstanding + daysSalesOutstanding - daysPayablesOutstanding),
    annualInterestCost: round2((workingCapitalNeeded * annualRatePercent) / 100),
    monthlyInterestCost: round2((workingCapitalNeeded * annualRatePercent) / 100 / 12),
  };
};

// --- 8. Equipment Loan Calculator ---------------------------------------------
export const equipmentLoanCalculator: CustomCalculator = (values) => {
  const equipmentCost = Math.max(0, safeNumber(values.equipmentCost, 80000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 20)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const usefulLifeYears = Math.max(1, safeNumber(values.usefulLifeYears, 7));
  const salvageValue = Math.max(0, safeNumber(values.salvageValue, 0));

  const downPayment = (equipmentCost * downPaymentPercent) / 100;
  const amountFinanced = equipmentCost - downPayment;
  const pmt = payment(amountFinanced, annualRatePercent / 100 / 12, termMonths);
  const totalInterest = pmt * termMonths - amountFinanced;

  return {
    amountFinanced: round2(amountFinanced),
    monthlyPayment: round2(pmt),
    totalInterest: round2(totalInterest),
    annualCostOfOwnership: round2((equipmentCost + totalInterest - salvageValue) / usefulLifeYears),
  };
};

// --- 9. Student Loan Calculator (in-school interest + grace) ----------------
// Each year's amount is disbursed at the start of that school year. Federal
// student loans accrue SIMPLE interest, so the accrued amount is
// disbursement x rate x years until repayment begins (end of school plus
// the grace period).
export const studentLoanCalculator: CustomCalculator = (values) => {
  const amountPerYear = Math.max(0, safeNumber(values.amountPerYear, 10000));
  const yearsInSchool = Math.min(10, Math.max(1, Math.round(safeNumber(values.yearsInSchool, 4))));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.5));
  const interestHandling = safeNumber(values.interestHandling, 1); // 1 = accrues & capitalizes, 2 = subsidized, 3 = paid while in school
  const graceMonths = Math.max(0, safeNumber(values.graceMonths, 6));
  const repaymentYears = Math.max(1, safeNumber(values.repaymentYears, 10));

  const r = annualRatePercent / 100;
  const totalBorrowed = amountPerYear * yearsInSchool;
  let accruedInterest = 0;
  for (let k = 0; k < yearsInSchool; k++) {
    accruedInterest += amountPerYear * r * (yearsInSchool - k + graceMonths / 12);
  }
  if (interestHandling === 2) accruedInterest = 0;

  const balanceAtRepayment = totalBorrowed + (interestHandling === 1 ? accruedInterest : 0);
  const n = Math.round(repaymentYears * 12);
  const pmt = payment(balanceAtRepayment, r / 12, n);
  const repaymentInterest = pmt * n - balanceAtRepayment;
  const totalInterest = repaymentInterest + accruedInterest;

  return {
    balanceAtRepayment: round2(balanceAtRepayment),
    monthlyPayment: round2(pmt),
    interestBeforeRepayment: round2(accruedInterest),
    totalInterest: round2(totalInterest),
    totalPaid: round2(totalBorrowed + totalInterest),
  };
};

// --- 10. Student Loan Payoff Calculator (vs standard 10-year plan) ----------
export const studentLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 35000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 500));

  const i = annualRatePercent / 100 / 12;
  const standardPayment = payment(balance, i, 120);
  const standardInterest = standardPayment * 120 - balance;

  let remaining = balance;
  let months = 0;
  let interest = 0;
  const repays = balance > 0 && monthlyPayment > balance * i;
  while (repays && remaining > 1e-9 && months < 1200) {
    const monthInterest = remaining * i;
    interest += monthInterest;
    remaining = remaining + monthInterest - Math.min(monthlyPayment, remaining + monthInterest);
    months++;
  }

  return {
    monthsToPayoff: repays ? months : 0,
    totalInterest: repays ? round2(interest) : 0,
    standard10YearPayment: round2(standardPayment),
    standard10YearInterest: round2(standardInterest),
    interestSavedVsStandard: repays ? round2(standardInterest - interest) : 0,
  };
};

// --- 11. Student Loan Refinance Calculator (up to 3 loans consolidated) -----
export const studentLoanRefinanceCalculator: CustomCalculator = (values) => {
  const loans = [1, 2, 3].map((k) => ({
    balance: Math.max(0, safeNumber(values[`loan${k}Balance`], 0)),
    rate: Math.max(0, safeNumber(values[`loan${k}RatePercent`], 0)),
  }));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 120)));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 5));
  const newTermMonths = Math.max(1, Math.round(safeNumber(values.newTermMonths, 120)));

  const totalBalance = loans.reduce((s, l) => s + l.balance, 0);
  const weightedRate = totalBalance > 0 ? loans.reduce((s, l) => s + l.balance * l.rate, 0) / totalBalance : 0;
  const currentPayments = loans.map((l) => payment(l.balance, l.rate / 100 / 12, remainingMonths));
  const currentTotalPayment = currentPayments.reduce((s, p) => s + p, 0);
  const newPayment = payment(totalBalance, newRatePercent / 100 / 12, newTermMonths);

  return {
    weightedAverageRatePercent: round2(weightedRate),
    currentTotalPayment: round2(currentTotalPayment),
    newPayment: round2(newPayment),
    monthlySavings: round2(currentTotalPayment - newPayment),
    totalInterestSaved: round2(currentTotalPayment * remainingMonths - newPayment * newTermMonths),
  };
};

export const loanBusinessStudentCustomCalculators: Record<string, CustomCalculator> = {
  "business-loan-payment-calculator": businessLoanPaymentCalculator,
  "business-loan-interest-calculator": businessLoanInterestCalculator,
  "business-loan-payoff-calculator": businessLoanPayoffCalculator,
  "business-loan-apr-calculator": businessLoanAprCalculator,
  "business-loan-affordability-calculator": businessLoanAffordabilityCalculator,
  "business-loan-emi-calculator": businessLoanEmiCalculator,
  "working-capital-loan-calculator": workingCapitalLoanCalculator,
  "equipment-loan-calculator": equipmentLoanCalculator,
  "student-loan-calculator": studentLoanCalculator,
  "student-loan-payoff-calculator": studentLoanPayoffCalculator,
  "student-loan-refinance-calculator": studentLoanRefinanceCalculator,
};
