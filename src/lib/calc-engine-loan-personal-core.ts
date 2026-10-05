/**
 * Batch: "Loan Calculators" expansion 5 (4 Oct 2026), sub-batch 4 of 10 —
 * Personal Loans (6 tools), filed under Loan Calculators > Personal Loan
 * Calculators. These come from the "Unsecured Personal Loan" keywords: most
 * personal loans are unsecured, so the same intent is built under the
 * stronger personal-loan-* keyword. Already built and not repeated:
 * personal-loan-calculator, -apr (compares two offers), -refinance,
 * -extra-payment. See calc-engine-loan-startup-business.ts for the full
 * batch context.
 *
 *  - personalLoanPayment: payment and interest at 36, 48 and 60 months.
 *  - personalLoanInterest: interest at your rate vs an excellent-credit
 *    rate — what your credit costs.
 *  - personalLoanAffordability: a monthly budget -> largest loan and the
 *    cash you'd receive after the origination fee.
 *  - personalLoanEligibility: score, DTI with the payment, income,
 *    employment — typical lender screens.
 *  - personalLoanAmortization: any month's interest/principal split and
 *    the balance after it.
 *  - personalLoanTotalCost: interest + origination fee + optional credit
 *    insurance, per dollar actually received.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-personal-core-calculators.ts for the copy.
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
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (pmt * (g - 1)) / i);
}

// --- 1. Personal Loan Payment Calculator (36 / 48 / 60 months) ----------------------
export const personalLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));

  const i = annualRatePercent / 100 / 12;
  const p36 = payment(loanAmount, i, 36);
  const p48 = payment(loanAmount, i, 48);
  const p60 = payment(loanAmount, i, 60);

  return {
    payment36: round2(p36),
    payment48: round2(p48),
    payment60: round2(p60),
    interest36: round2(p36 * 36 - loanAmount),
    interest48: round2(p48 * 48 - loanAmount),
    interest60: round2(p60 * 60 - loanAmount),
  };
};

// --- 2. Personal Loan Interest Calculator (your rate vs excellent credit) -----------
export const personalLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const yourRatePercent = Math.max(0, safeNumber(values.yourRatePercent, 18));
  const excellentRatePercent = Math.max(0, safeNumber(values.excellentRatePercent, 10));

  const i = yourRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const yours = pmt * termMonths - loanAmount;
  const k = Math.min(12, termMonths);
  const firstYear = pmt * k - (loanAmount - balanceAfter(loanAmount, i, pmt, k));
  const best = payment(loanAmount, excellentRatePercent / 100 / 12, termMonths) * termMonths - loanAmount;

  return {
    interestFirstYear: round2(firstYear),
    totalInterestYourRate: round2(yours),
    totalInterestExcellentCredit: round2(best),
    extraCostOfYourCredit: round2(yours - best),
  };
};

// --- 3. Personal Loan Affordability Calculator (from a monthly budget) --------------
export const personalLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const monthlyBudget = Math.max(0, safeNumber(values.monthlyBudget, 400));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 14));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const feePercent = Math.min(20, Math.max(0, safeNumber(values.originationFeePercent, 5)));

  const maxLoan = presentValue(monthlyBudget, annualRatePercent / 100 / 12, termMonths);

  return {
    maxLoanAmount: round2(maxLoan),
    originationFee: round2((maxLoan * feePercent) / 100),
    cashYouReceive: round2(maxLoan * (1 - feePercent / 100)),
    totalInterest: round2(monthlyBudget * termMonths - maxLoan),
  };
};

// --- 4. Personal Loan Eligibility Calculator (incl. prequalification) ---------------
export const personalLoanEligibilityCalculator: CustomCalculator = (values) => {
  const annualIncome = Math.max(0, safeNumber(values.annualIncome, 60000));
  const monthlyDebts = Math.max(0, safeNumber(values.monthlyDebts, 800));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 14));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 670)));
  const monthsEmployed = Math.max(0, safeNumber(values.monthsEmployed, 24));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const monthlyIncome = annualIncome / 12;
  const dti = monthlyIncome > 0 ? ((monthlyDebts + pmt) / monthlyIncome) * 100 : 0;
  let passed = 0;
  if (creditScore >= 640) passed++;
  if (monthlyIncome > 0 && dti <= 40) passed++;
  if (annualIncome >= 25000) passed++;
  if (monthsEmployed >= 12) passed++;

  return {
    monthlyPayment: round2(pmt),
    dtiWithLoan: round2(dti),
    maxPaymentAt40Dti: round2(Math.max(0, monthlyIncome * 0.4 - monthlyDebts)),
    checksPassed: passed,
  };
};

// --- 5. Personal Loan Amortization Calculator (any month) ---------------------------
export const personalLoanAmortizationCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 13));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const monthNumber = Math.min(termMonths, Math.max(1, Math.round(safeNumber(values.monthNumber, 24))));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const before = balanceAfter(loanAmount, i, pmt, monthNumber - 1);
  const after = balanceAfter(loanAmount, i, pmt, monthNumber);
  const interestMonth = before * i;

  return {
    monthlyPayment: round2(pmt),
    interestThatMonth: round2(interestMonth),
    principalThatMonth: round2(before - after),
    balanceAfterMonth: round2(after),
    interestPaidSoFar: round2(pmt * monthNumber - (loanAmount - after)),
  };
};

// --- 6. Personal Loan Total Cost Calculator ------------------------------------------
export const personalLoanTotalCostCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 13));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const feePercent = Math.min(20, Math.max(0, safeNumber(values.originationFeePercent, 6)));
  const insurancePerMonth = Math.max(0, safeNumber(values.insurancePerMonth, 0));

  const interest = payment(loanAmount, annualRatePercent / 100 / 12, termMonths) * termMonths - loanAmount;
  const fee = (loanAmount * feePercent) / 100;
  const insurance = insurancePerMonth * termMonths;
  const total = interest + fee + insurance;
  const received = loanAmount - fee;

  return {
    totalInterest: round2(interest),
    originationFee: round2(fee),
    insuranceCost: round2(insurance),
    totalCostOfBorrowing: round2(total),
    costPerDollarReceived: received > 0 ? Math.round((total / received) * 1000) / 1000 : 0,
  };
};

export const loanPersonalCoreCustomCalculators: Record<string, CustomCalculator> = {
  "personal-loan-payment-calculator": personalLoanPaymentCalculator,
  "personal-loan-interest-calculator": personalLoanInterestCalculator,
  "personal-loan-affordability-calculator": personalLoanAffordabilityCalculator,
  "personal-loan-eligibility-calculator": personalLoanEligibilityCalculator,
  "personal-loan-amortization-calculator": personalLoanAmortizationCalculator,
  "personal-loan-total-cost-calculator": personalLoanTotalCostCalculator,
};
