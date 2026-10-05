/**
 * Batch: "Loan Calculators" expansion 4 (3 Oct 2026), sub-batch 4 of 5 —
 * Adoption Loans (4 tools) and Tax Debt Loans (7 tools), filed under Loan
 * Calculators > Personal Loan Calculators. See
 * calc-engine-loan-powersports.ts for the full batch context.
 *
 * Adoption (2026 federal adoption credit: up to $17,670 of qualified
 * expenses per child, of which up to $5,120 is refundable; the rest only
 * offsets tax owed and can be carried forward 5 years; phases out above
 * $265,080 of MAGI — not modelled):
 *  - adoptionLoan: agency/legal + travel + home study - grants - employer
 *    help - savings -> loan and payment.
 *  - adoptionLoanPayment: the payment, then the first-year credit applied
 *    to the loan when the refund arrives -> faster payoff.
 *  - adoptionLoanCost: net cost of adopting after grants, employer
 *    assistance, the credit, and the loan's interest.
 *  - adoptionLoanPayoff: extra each month plus a lump sum.
 * Tax debt (IRS, Q4 2026: 7% interest compounded daily; failure-to-pay
 * penalty 0.5% a month, 0.25% while on an installment plan if the return
 * was filed on time, up to 25%; failure-to-file 5% a month less the
 * failure-to-pay part, up to 5 months; long-term plans online for $50,000
 * or less, short-term (180 days) under $100,000):
 *  - taxDebtLoan: borrow enough to pay the IRS after an origination fee.
 *  - taxDebtLoanPayment: the IRS installment plan payment with interest and
 *    the reduced penalty, and the plan setup fee.
 *  - taxDebtLoanPayoff: extra payments on an IRS plan.
 *  - taxDebtLoanInterest: what an unpaid bill grows to — interest plus
 *    failure-to-pay (and failure-to-file if not filed).
 *  - taxDebtLoanAffordability: a monthly budget -> the largest tax debt it
 *    clears with a loan vs a 72-month IRS plan.
 *  - taxDebtLoanComparison: personal loan vs IRS installment plan.
 *  - taxDebtLoanEligibility: which options are open — short-term plan,
 *    long-term plan, a personal loan (score and DTI).
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-adoption-tax-debt-calculators.ts for the copy.
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

/** Months and interest to repay `balance` paying `pmt` a month (capped at 600 months). */
function repay(balance: number, i: number, pmt: number): { months: number; interest: number } {
  let b = balance;
  let months = 0;
  let interest = 0;
  while (b > 0.005 && months < 600) {
    const int = b * i;
    if (pmt <= int) return { months: 600, interest: interest + int * (600 - months) };
    interest += int;
    b = b + int - Math.min(pmt, b + int);
    months++;
  }
  return { months, interest };
}

const ADOPTION_CREDIT_MAX = 17670;
const ADOPTION_CREDIT_REFUNDABLE = 5120;

/** Monthly IRS cost on an installment plan: interest (daily compounding) + plan penalty. */
function irsMonthlyRate(irsRatePercent: number, penaltyMonthlyPercent: number): number {
  return Math.pow(1 + irsRatePercent / 100 / 365, 365 / 12) - 1 + penaltyMonthlyPercent / 100;
}

// --- 1. Adoption Loan Calculator --------------------------------------------------------
export const adoptionLoanCalculator: CustomCalculator = (values) => {
  const agencyLegalFees = Math.max(0, safeNumber(values.agencyLegalFees, 35000));
  const travel = Math.max(0, safeNumber(values.travel, 5000));
  const homeStudy = Math.max(0, safeNumber(values.homeStudy, 2500));
  const grants = Math.max(0, safeNumber(values.grants, 5000));
  const employerAssistance = Math.max(0, safeNumber(values.employerAssistance, 5000));
  const savings = Math.max(0, safeNumber(values.savings, 5000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  const total = agencyLegalFees + travel + homeStudy;
  const loan = Math.max(0, total - grants - employerAssistance - savings);
  const pmt = payment(loan, annualRatePercent / 100 / 12, termMonths);

  return {
    totalAdoptionCost: round2(total),
    loanAmount: round2(loan),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - loan),
  };
};

// --- 2. Adoption Loan Payment Calculator (payment + credit applied to the loan) --------
export const adoptionLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 30000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const qualifiedExpenses = Math.max(0, safeNumber(values.qualifiedExpenses, 30000));
  const federalTaxOwed = Math.max(0, safeNumber(values.federalTaxOwed, 6000));
  const monthsUntilRefund = Math.min(termMonths, Math.max(0, Math.round(safeNumber(values.monthsUntilRefund, 12))));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const credit = Math.min(qualifiedExpenses, ADOPTION_CREDIT_MAX);
  const refundable = Math.min(credit, ADOPTION_CREDIT_REFUNDABLE);
  const firstYear = refundable + Math.min(credit - refundable, federalTaxOwed);

  let b = loanAmount;
  let months = 0;
  let interest = 0;
  while (b > 0.005 && months < 600) {
    const int = b * i;
    interest += int;
    b = b + int - Math.min(pmt, b + int);
    months++;
    if (months === monthsUntilRefund) b = Math.max(0, b - firstYear);
  }

  return {
    monthlyPayment: round2(pmt),
    adoptionCredit: round2(credit),
    firstYearTaxBenefit: round2(firstYear),
    creditCarriedForward: round2(credit - firstYear),
    monthsToPayoffWithCredit: months,
    interestSaved: round2(Math.max(0, pmt * termMonths - loanAmount - interest)),
  };
};

// --- 3. Adoption Loan Cost Calculator (net cost of adopting) ---------------------------
export const adoptionLoanCostCalculator: CustomCalculator = (values) => {
  const totalExpenses = Math.max(0, safeNumber(values.totalExpenses, 45000));
  const grants = Math.max(0, safeNumber(values.grants, 5000));
  const employerAssistance = Math.max(0, safeNumber(values.employerAssistance, 5000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 25000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  // Expenses reimbursed by an employer can't also be claimed for the credit.
  const credit = Math.min(Math.max(0, totalExpenses - employerAssistance - grants), ADOPTION_CREDIT_MAX);
  const interest = payment(loanAmount, annualRatePercent / 100 / 12, termMonths) * termMonths - loanAmount;

  return {
    adoptionTaxCredit: round2(credit),
    loanInterest: round2(interest),
    outOfPocketBeforeCredit: round2(totalExpenses - grants - employerAssistance + interest),
    netCostOfAdoption: round2(totalExpenses - grants - employerAssistance - credit + interest),
  };
};

// --- 4. Adoption Loan Payoff Calculator --------------------------------------------------
export const adoptionLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 25000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 60)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 100));
  const lumpSum = Math.max(0, safeNumber(values.lumpSum, 2000));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(balance, i, remainingMonths);
  const fast = repay(Math.max(0, balance - lumpSum), i, pmt + extraMonthly);

  return {
    currentPayment: round2(pmt),
    monthsToPayoff: fast.months,
    monthsSaved: Math.max(0, remainingMonths - fast.months),
    interestSaved: round2(Math.max(0, pmt * remainingMonths - balance - fast.interest)),
  };
};

// --- 5. Tax Debt Loan Calculator ---------------------------------------------------------
export const taxDebtLoanCalculator: CustomCalculator = (values) => {
  const taxOwed = Math.max(0, safeNumber(values.taxOwed, 15000));
  const feePercent = Math.min(20, Math.max(0, safeNumber(values.originationFeePercent, 5)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));

  const gross = taxOwed / (1 - feePercent / 100);
  const pmt = payment(gross, annualRatePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - gross;

  return {
    loanAmountNeeded: round2(gross),
    originationFee: round2(gross - taxOwed),
    monthlyPayment: round2(pmt),
    totalInterest: round2(interest),
    totalCost: round2(interest + gross - taxOwed),
  };
};

// --- 6. Tax Debt Loan Payment Calculator (IRS installment plan) -------------------------
export const taxDebtLoanPaymentCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 15000));
  const months = Math.max(1, Math.round(safeNumber(values.months, 72)));
  const irsRatePercent = Math.max(0, safeNumber(values.irsRatePercent, 7));
  const penaltyMonthlyPercent = Math.max(0, safeNumber(values.penaltyMonthlyPercent, 0.25));
  const setupFee = Math.max(0, safeNumber(values.setupFee, 22));

  const r = irsMonthlyRate(irsRatePercent, penaltyMonthlyPercent);
  const pmt = payment(balance, r, months);
  const interestPart = Math.pow(1 + irsRatePercent / 100 / 365, 365 / 12) - 1;
  const charges = pmt * months - balance;
  const share = r > 0 ? interestPart / r : 0;

  return {
    monthlyPayment: round2(pmt),
    totalInterest: round2(charges * share),
    totalPenalties: round2(charges * (1 - share)),
    setupFee: round2(setupFee),
    totalCost: round2(charges + setupFee),
  };
};

// --- 7. Tax Debt Loan Payoff Calculator (extra on an IRS plan) --------------------------
export const taxDebtLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 12000));
  const currentPayment = Math.max(0, safeNumber(values.currentPayment, 300));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 150));
  const irsRatePercent = Math.max(0, safeNumber(values.irsRatePercent, 7));
  const penaltyMonthlyPercent = Math.max(0, safeNumber(values.penaltyMonthlyPercent, 0.25));

  const r = irsMonthlyRate(irsRatePercent, penaltyMonthlyPercent);
  const now = repay(balance, r, currentPayment);
  const fast = repay(balance, r, currentPayment + extraMonthly);

  return {
    monthsAtCurrentPayment: now.months,
    monthsWithExtra: fast.months,
    monthsSaved: Math.max(0, now.months - fast.months),
    chargesSaved: round2(Math.max(0, now.interest - fast.interest)),
  };
};

// --- 8. Tax Debt Loan Interest Calculator (what an unpaid bill grows to) ----------------
export const taxDebtLoanInterestCalculator: CustomCalculator = (values) => {
  const taxOwed = Math.max(0, safeNumber(values.taxOwed, 10000));
  const monthsLate = Math.max(0, Math.round(safeNumber(values.monthsLate, 12)));
  const filedOnTime = Math.round(safeNumber(values.filedOnTime, 1)) === 1;
  const irsRatePercent = Math.max(0, safeNumber(values.irsRatePercent, 7));

  const interest = taxOwed * (Math.pow(1 + irsRatePercent / 100 / 365, (365 / 12) * monthsLate) - 1);
  const ftp = (taxOwed * Math.min(25, 0.5 * monthsLate)) / 100;
  const ftf = filedOnTime ? 0 : (taxOwed * 4.5 * Math.min(5, monthsLate)) / 100;

  return {
    interest: round2(interest),
    failureToPayPenalty: round2(ftp),
    failureToFilePenalty: round2(ftf),
    totalOwed: round2(taxOwed + interest + ftp + ftf),
    growthPercent: round2(taxOwed > 0 ? ((interest + ftp + ftf) / taxOwed) * 100 : 0),
  };
};

// --- 9. Tax Debt Loan Affordability Calculator --------------------------------------------
export const taxDebtLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const monthlyBudget = Math.max(0, safeNumber(values.monthlyBudget, 500));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 11));
  const loanTermMonths = Math.max(1, Math.round(safeNumber(values.loanTermMonths, 60)));
  const feePercent = Math.min(20, Math.max(0, safeNumber(values.originationFeePercent, 5)));
  const irsRatePercent = Math.max(0, safeNumber(values.irsRatePercent, 7));
  const penaltyMonthlyPercent = Math.max(0, safeNumber(values.penaltyMonthlyPercent, 0.25));

  const loan = presentValue(monthlyBudget, loanRatePercent / 100 / 12, loanTermMonths);
  const irs = presentValue(monthlyBudget, irsMonthlyRate(irsRatePercent, penaltyMonthlyPercent), 72);

  return {
    maxLoanAmount: round2(loan),
    maxTaxDebtWithLoan: round2(loan * (1 - feePercent / 100)),
    maxTaxDebtWithIrsPlan: round2(irs),
    irsPlanMonths: 72,
  };
};

// --- 10. Tax Debt Loan Comparison Calculator (loan vs IRS plan) -------------------------
export const taxDebtLoanComparisonCalculator: CustomCalculator = (values) => {
  const taxOwed = Math.max(0, safeNumber(values.taxOwed, 15000));
  const months = Math.max(1, Math.round(safeNumber(values.months, 36)));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 11));
  const feePercent = Math.min(20, Math.max(0, safeNumber(values.originationFeePercent, 5)));
  const irsRatePercent = Math.max(0, safeNumber(values.irsRatePercent, 7));
  const penaltyMonthlyPercent = Math.max(0, safeNumber(values.penaltyMonthlyPercent, 0.25));
  const setupFee = Math.max(0, safeNumber(values.setupFee, 22));

  const gross = taxOwed / (1 - feePercent / 100);
  const loanPmt = payment(gross, loanRatePercent / 100 / 12, months);
  const loanCost = loanPmt * months - taxOwed;
  const irsPmt = payment(taxOwed, irsMonthlyRate(irsRatePercent, penaltyMonthlyPercent), months);
  const irsCost = irsPmt * months - taxOwed + setupFee;

  return {
    loanPayment: round2(loanPmt),
    irsPlanPayment: round2(irsPmt),
    loanTotalCost: round2(loanCost),
    irsPlanTotalCost: round2(irsCost),
    savingsWithIrsPlan: round2(loanCost - irsCost),
  };
};

// --- 11. Tax Debt Loan Eligibility Calculator --------------------------------------------
export const taxDebtLoanEligibilityCalculator: CustomCalculator = (values) => {
  const totalOwed = Math.max(0, safeNumber(values.totalOwed, 30000));
  const allReturnsFiled = Math.round(safeNumber(values.allReturnsFiled, 1)) === 1;
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 660)));
  const monthlyIncome = Math.max(0, safeNumber(values.monthlyIncome, 5500));
  const existingDebtPayments = Math.max(0, safeNumber(values.existingDebtPayments, 900));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 12));
  const loanTermMonths = Math.max(1, Math.round(safeNumber(values.loanTermMonths, 60)));

  const loanPmt = payment(totalOwed, loanRatePercent / 100 / 12, loanTermMonths);
  const dti = monthlyIncome > 0 ? ((existingDebtPayments + loanPmt) / monthlyIncome) * 100 : 0;
  let options = 0;
  if (allReturnsFiled && totalOwed < 100000) options++;
  if (allReturnsFiled && totalOwed <= 50000) options++;
  if (creditScore >= 640 && monthlyIncome > 0 && dti <= 40) options++;

  return {
    paymentToClearIn180Days: round2(totalOwed / 6),
    minimumPaymentOver72Months: round2(totalOwed / 72),
    loanPayment: round2(loanPmt),
    dtiWithLoan: round2(dti),
    optionsAvailable: options,
  };
};

export const loanAdoptionTaxDebtCustomCalculators: Record<string, CustomCalculator> = {
  "adoption-loan-calculator": adoptionLoanCalculator,
  "adoption-loan-payment-calculator": adoptionLoanPaymentCalculator,
  "adoption-loan-cost-calculator": adoptionLoanCostCalculator,
  "adoption-loan-payoff-calculator": adoptionLoanPayoffCalculator,
  "tax-debt-loan-calculator": taxDebtLoanCalculator,
  "tax-debt-loan-payment-calculator": taxDebtLoanPaymentCalculator,
  "tax-debt-loan-payoff-calculator": taxDebtLoanPayoffCalculator,
  "tax-debt-loan-interest-calculator": taxDebtLoanInterestCalculator,
  "tax-debt-loan-affordability-calculator": taxDebtLoanAffordabilityCalculator,
  "tax-debt-loan-comparison-calculator": taxDebtLoanComparisonCalculator,
  "tax-debt-loan-eligibility-calculator": taxDebtLoanEligibilityCalculator,
};
