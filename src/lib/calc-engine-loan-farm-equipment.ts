/**
 * Batch: "Loan Calculators" expansion 2 (3 Oct 2026), sub-batch 4 of 8 —
 * Farm Equipment Loans (7 tools), filed under Loan Calculators > General
 * Loan Calculators (next to equipment-loan-calculator). "Tractor Loan" x4
 * from the same list was merged into these — a tractor is farm equipment
 * and the tools are the same. See calc-engine-loan-life-events.ts for the
 * full batch context.
 *
 * Farm lenders usually match payments to harvest income, so these tools use
 * ANNUAL (or semi-annual / quarterly) payments rather than monthly ones:
 *  - farmEquipmentLoan: price less trade-in and down payment, with a choice
 *    of payment frequency.
 *  - payment: first annual payment timed to harvest (earlier or later than
 *    12 months after purchase) vs a standard schedule.
 *  - payoff: an extra principal payment after a good harvest year.
 *  - interest: interest plus the Section 179 expensing tax benefit -> after-
 *    tax cost of the machine.
 *  - affordability: a share of net farm income -> max annual payment -> max
 *    price, and the cost per acre.
 *  - comparison: finance and own vs lease, net of resale value.
 *  - eligibility: debt-service coverage ratio (DSCR), the main test farm
 *    lenders use, plus credit score.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-farm-equipment-calculators.ts for the copy.
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


// --- 1. Farm Equipment Loan Calculator ---------------------------------------
export const farmEquipmentLoanCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 150000));
  const tradeInValue = Math.max(0, safeNumber(values.tradeInValue, 30000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 15)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 7)));
  const raw = Math.round(safeNumber(values.paymentsPerYear, 1));
  const paymentsPerYear = [1, 2, 4, 12].includes(raw) ? raw : 1;

  const net = Math.max(0, price - tradeInValue);
  const down = (net * downPaymentPercent) / 100;
  const financed = net - down;
  const n = termYears * paymentsPerYear;
  const pmt = payment(financed, annualRatePercent / 100 / paymentsPerYear, n);

  return {
    downPayment: round2(down),
    amountFinanced: round2(financed),
    paymentPerPeriod: round2(pmt),
    annualCost: round2(pmt * paymentsPerYear),
    totalInterest: round2(pmt * n - financed),
  };
};

// --- 2. Farm Equipment Loan Payment Calculator (first payment at harvest) ----
export const farmEquipmentLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 120000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 5)));
  const monthsUntilFirstPayment = Math.max(1, Math.round(safeNumber(values.monthsUntilFirstPayment, 15)));

  const r = annualRatePercent / 100;
  const standard = payment(loanAmount, r, termYears);
  // Same annual schedule, shifted so the first payment lands at harvest:
  // interest for the extra (or fewer) months is spread over the payments.
  const shifted = standard * Math.pow(1 + r, monthsUntilFirstPayment / 12 - 1);

  return {
    standardAnnualPayment: round2(standard),
    harvestAnnualPayment: round2(shifted),
    standardTotalInterest: round2(standard * termYears - loanAmount),
    harvestTotalInterest: round2(shifted * termYears - loanAmount),
    extraCostOfTiming: round2((shifted - standard) * termYears),
  };
};

// --- 3. Farm Equipment Loan Payoff Calculator (good-harvest prepayment) ------
export const farmEquipmentLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 150000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 7)));
  const extraPayment = Math.max(0, safeNumber(values.extraPayment, 30000));
  const extraYear = Math.max(1, Math.round(safeNumber(values.extraYear, 2)));

  const r = annualRatePercent / 100;
  const pmt = payment(loanAmount, r, termYears);
  const baseInterest = pmt * termYears - loanAmount;
  let b = loanAmount;
  let interest = 0;
  let years = 0;
  let last = 0;
  while (b > 1e-6 && years < 100) {
    const int = b * r;
    interest += int;
    const due = b + int;
    last = Math.min(pmt, due);
    b = due - last;
    years++;
    if (years === extraYear) b = Math.max(0, b - extraPayment);
  }

  return {
    annualPayment: round2(pmt),
    paymentsNeeded: years,
    yearsSaved: termYears - years,
    finalPayment: round2(last),
    interestSaved: round2(baseInterest - interest),
  };
};

// --- 4. Farm Equipment Loan Interest Calculator (Section 179) ----------------
export const farmEquipmentLoanInterestCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 100000));
  const amountFinanced = Math.max(0, safeNumber(values.amountFinanced, 85000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 5)));
  const expensedPercent = Math.min(100, Math.max(0, safeNumber(values.expensedPercent, 100)));
  const taxRatePercent = Math.min(70, Math.max(0, safeNumber(values.taxRatePercent, 24)));

  const r = annualRatePercent / 100;
  const pmt = payment(amountFinanced, r, termYears);
  const interest = pmt * termYears - amountFinanced;
  const year1Interest = amountFinanced * r;
  const expensed = (price * expensedPercent) / 100;
  const t = taxRatePercent / 100;

  return {
    annualPayment: round2(pmt),
    totalInterest: round2(interest),
    year1Deduction: round2(expensed + year1Interest),
    year1TaxSavings: round2((expensed + year1Interest) * t),
    afterTaxCost: round2(price + interest - (expensed + interest) * t),
  };
};

// --- 5. Farm Equipment Loan Affordability Calculator -------------------------
export const farmEquipmentLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const annualNetFarmIncome = Math.max(0, safeNumber(values.annualNetFarmIncome, 120000));
  const maxSharePercent = Math.max(0, safeNumber(values.maxSharePercent, 20));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 7)));
  const downPaymentPercent = Math.min(99, Math.max(0, safeNumber(values.downPaymentPercent, 20)));
  const acres = Math.max(0, safeNumber(values.acres, 800));

  const maxPayment = (annualNetFarmIncome * maxSharePercent) / 100;
  const maxLoan = presentValue(maxPayment, annualRatePercent / 100, termYears);
  const maxPrice = maxLoan / (1 - downPaymentPercent / 100);

  return {
    maxAnnualPayment: round2(maxPayment),
    maxLoanAmount: round2(maxLoan),
    maxEquipmentPrice: round2(maxPrice),
    downPaymentNeeded: round2(maxPrice - maxLoan),
    paymentPerAcre: acres > 0 ? round2(maxPayment / acres) : 0,
  };
};

// --- 6. Farm Equipment Loan Comparison Calculator (buy vs lease) -------------
export const farmEquipmentLoanComparisonCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 200000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 15)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 5)));
  const residualPercent = Math.min(100, Math.max(0, safeNumber(values.residualPercent, 55)));
  const leaseAnnual = Math.max(0, safeNumber(values.leaseAnnual, 30000));

  const down = (price * downPaymentPercent) / 100;
  const pmt = payment(price - down, annualRatePercent / 100, termYears);
  const value = (price * residualPercent) / 100;
  const ownNet = down + pmt * termYears - value;
  const lease = leaseAnnual * termYears;

  return {
    annualLoanPayment: round2(pmt),
    ownNetCost: round2(ownNet),
    leaseTotalCost: round2(lease),
    buyingSaves: round2(lease - ownNet),
  };
};

// --- 7. Farm Equipment Loan Eligibility Calculator (DSCR) --------------------
export const farmEquipmentLoanEligibilityCalculator: CustomCalculator = (values) => {
  const netIncomeBeforeDebt = Math.max(0, safeNumber(values.netIncomeBeforeDebt, 180000));
  const existingAnnualDebt = Math.max(0, safeNumber(values.existingAnnualDebt, 60000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 150000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 7)));
  const minDscr = Math.max(0.01, safeNumber(values.minDscr, 1.25));
  const creditScore = Math.max(300, Math.min(850, safeNumber(values.creditScore, 700)));
  const lenderMinScore = Math.max(300, Math.min(850, safeNumber(values.lenderMinScore, 680)));

  const pmt = payment(loanAmount, annualRatePercent / 100, termYears);
  const totalDebt = existingAnnualDebt + pmt;
  const dscr = totalDebt > 0 ? netIncomeBeforeDebt / totalDebt : 0;

  return {
    newAnnualPayment: round2(pmt),
    dscr: Math.round(dscr * 100) / 100,
    dscrHeadroom: Math.round((dscr - minDscr) * 100) / 100,
    maxNewPaymentAtMinimum: round2(Math.max(0, netIncomeBeforeDebt / minDscr - existingAnnualDebt)),
    scoreMargin: Math.round(creditScore - lenderMinScore),
  };
};

export const loanFarmEquipmentCustomCalculators: Record<string, CustomCalculator> = {
  "farm-equipment-loan-calculator": farmEquipmentLoanCalculator,
  "farm-equipment-loan-payment-calculator": farmEquipmentLoanPaymentCalculator,
  "farm-equipment-loan-payoff-calculator": farmEquipmentLoanPayoffCalculator,
  "farm-equipment-loan-interest-calculator": farmEquipmentLoanInterestCalculator,
  "farm-equipment-loan-affordability-calculator": farmEquipmentLoanAffordabilityCalculator,
  "farm-equipment-loan-comparison-calculator": farmEquipmentLoanComparisonCalculator,
  "farm-equipment-loan-eligibility-calculator": farmEquipmentLoanEligibilityCalculator,
};
