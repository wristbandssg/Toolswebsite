/**
 * Batch: "Loan Calculators" expansion 4 (3 Oct 2026), sub-batch 5 of 5 —
 * Medical Equipment Loans (4 tools), filed under Loan Calculators > General
 * Loan Calculators (business equipment for a medical, dental or veterinary
 * practice, next to equipment-loan-calculator). See
 * calc-engine-loan-powersports.ts for the full batch context.
 *
 *  - medicalEquipmentLoan: price + installation/training - down payment ->
 *    payment and total cost.
 *  - medicalEquipmentLoanPayment: procedures per month needed to cover the
 *    payment (revenue less supplies per procedure), and net cash after it.
 *  - medicalEquipmentLoanCost: buy with a loan (Section 179 deduction,
 *    resale at the end) vs a fair-market-value lease, after tax.
 *  - medicalEquipmentLoanPayoff: extra each month plus a lump sum.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-medical-equipment-calculators.ts for the copy.
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

// --- 1. Medical Equipment Loan Calculator ---------------------------------------------
export const medicalEquipmentLoanCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 250000));
  const installation = Math.max(0, safeNumber(values.installation, 15000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  const total = price + installation;
  const financed = total * (1 - downPaymentPercent / 100);
  const pmt = payment(financed, annualRatePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - financed;

  return {
    totalProjectCost: round2(total),
    amountFinanced: round2(financed),
    monthlyPayment: round2(pmt),
    totalInterest: round2(interest),
    totalCost: round2(total + interest),
  };
};

// --- 2. Medical Equipment Loan Payment Calculator (procedures to cover it) ------------
export const medicalEquipmentLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 200000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const revenuePerProcedure = Math.max(0, safeNumber(values.revenuePerProcedure, 350));
  const suppliesPerProcedure = Math.max(0, safeNumber(values.suppliesPerProcedure, 60));
  const proceduresPerMonth = Math.max(0, safeNumber(values.proceduresPerMonth, 40));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const margin = Math.max(0, revenuePerProcedure - suppliesPerProcedure);
  const contribution = margin * proceduresPerMonth;

  return {
    monthlyPayment: round2(pmt),
    marginPerProcedure: round2(margin),
    breakEvenProcedures: margin > 0 ? Math.ceil(pmt / margin) : 0,
    monthlyContribution: round2(contribution),
    netAfterPayment: round2(contribution - pmt),
  };
};

// --- 3. Medical Equipment Loan Cost Calculator (buy vs FMV lease, after tax) ----------
export const medicalEquipmentLoanCostCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 150000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const leasePayment = Math.max(0, safeNumber(values.leasePayment, 2900));
  const resaleValue = Math.max(0, safeNumber(values.resaleValue, 30000));
  const taxRatePercent = Math.min(70, Math.max(0, safeNumber(values.taxRatePercent, 30)));

  const t = taxRatePercent / 100;
  const pmt = payment(price, annualRatePercent / 100 / 12, termMonths);
  const paid = pmt * termMonths;
  // Section 179 expenses the price; interest is deductible; resale is taxed as recapture.
  const loanAfterTax = paid - price * t - (paid - price) * t - resaleValue * (1 - t);
  const leaseAfterTax = leasePayment * termMonths * (1 - t);

  return {
    loanPayment: round2(pmt),
    loanAfterTaxCost: round2(loanAfterTax),
    leaseAfterTaxCost: round2(leaseAfterTax),
    savingsWithLoan: round2(leaseAfterTax - loanAfterTax),
  };
};

// --- 4. Medical Equipment Loan Payoff Calculator (extra + lump sum) -------------------
export const medicalEquipmentLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 150000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 48)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 1000));
  const lumpSum = Math.max(0, safeNumber(values.lumpSum, 20000));

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

export const loanMedicalEquipmentCustomCalculators: Record<string, CustomCalculator> = {
  "medical-equipment-loan-calculator": medicalEquipmentLoanCalculator,
  "medical-equipment-loan-payment-calculator": medicalEquipmentLoanPaymentCalculator,
  "medical-equipment-loan-cost-calculator": medicalEquipmentLoanCostCalculator,
  "medical-equipment-loan-payoff-calculator": medicalEquipmentLoanPayoffCalculator,
};
