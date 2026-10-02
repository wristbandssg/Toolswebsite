/**
 * Batch: "Loan Calculators" expansion (2 Oct 2026), sub-batch 10 of 10 —
 * RV Loans (7 tools), filed under Loan Calculators > Auto & Vehicle Loan
 * Calculators. See calc-engine-loan-debt-consolidation.ts for the full
 * batch context. Motorcycle and Boat loans have the same 7 tool names; the
 * RV versions model RV-specific features:
 *  - rvLoan: price + extended service contract, sales tax, fees, down
 *    payment, and a trade-in with a loan still owed on it (negative equity
 *    rolled into the new loan).
 *  - payment: loan payment plus insurance, storage and maintenance, as a
 *    cost per night actually spent camping.
 *  - payoff: RVs depreciate fast on long loans — balance vs value when you
 *    plan to sell, and the extra monthly payment needed to break even.
 *  - interest: an RV with sleeping, cooking and toilet facilities can be a
 *    qualified second home — after-tax interest and interest per night.
 *  - affordability: lender DTI limit -> maximum loan -> maximum RV price.
 *  - comparison: owning (financed) vs renting an RV for the same nights.
 *  - eligibility: LTV, DTI, score, and the minimum loan size many lenders
 *    set before they'll offer their longest terms.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-rv-calculators.ts for the copy.
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
  if (k <= 0) return principal;
  if (i === 0) return Math.max(0, principal - pmt * k);
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (pmt * (g - 1)) / i);
}

// --- 1. RV Loan Calculator (incl. negative-equity trade-in) ------------------
export const rvLoanCalculator: CustomCalculator = (values) => {
  const rvPrice = Math.max(0, safeNumber(values.rvPrice, 85000));
  const serviceContract = Math.max(0, safeNumber(values.serviceContract, 3000));
  const salesTaxPercent = Math.max(0, safeNumber(values.salesTaxPercent, 6));
  const fees = Math.max(0, safeNumber(values.fees, 900));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 10000));
  const tradeInValue = Math.max(0, safeNumber(values.tradeInValue, 20000));
  const tradeInOwed = Math.max(0, safeNumber(values.tradeInOwed, 24000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));

  const tax = (Math.max(0, rvPrice - tradeInValue) * salesTaxPercent) / 100;
  const negativeEquity = Math.max(0, tradeInOwed - tradeInValue);
  const financed = Math.max(0, rvPrice + serviceContract + tax + fees - tradeInValue + tradeInOwed - downPayment);
  const n = termYears * 12;
  const pmt = payment(financed, annualRatePercent / 100 / 12, n);

  return {
    salesTax: round2(tax),
    negativeEquityRolledIn: round2(negativeEquity),
    amountFinanced: round2(financed),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * n - financed),
  };
};

// --- 2. RV Loan Payment Calculator (cost per night) --------------------------
export const rvLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 70000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));
  const annualInsurance = Math.max(0, safeNumber(values.annualInsurance, 1500));
  const annualStorage = Math.max(0, safeNumber(values.annualStorage, 1200));
  const annualMaintenance = Math.max(0, safeNumber(values.annualMaintenance, 1500));
  const nightsPerYear = Math.max(1, safeNumber(values.nightsPerYear, 30));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termYears * 12);
  const annual = pmt * 12 + annualInsurance + annualStorage + annualMaintenance;

  return {
    monthlyPayment: round2(pmt),
    monthlyOwnershipCost: round2(annual / 12),
    annualOwnershipCost: round2(annual),
    costPerNight: round2(annual / nightsPerYear),
  };
};

// --- 3. RV Loan Payoff Calculator (break even before selling) ----------------
export const rvLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 70000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));
  const rvValue = Math.max(0, safeNumber(values.rvValue, 78000));
  const depreciationPercent = Math.min(99, Math.max(0, safeNumber(values.depreciationPercent, 12)));
  const yearsUntilSale = Math.max(0, safeNumber(values.yearsUntilSale, 5));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 0));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const k = Math.min(n, Math.round(yearsUntilSale * 12));
  const pmt = payment(loanAmount, i, n);
  const fv = (x: number) => (i === 0 ? x * k : (x * (Math.pow(1 + i, k) - 1)) / i);
  const owedNoExtra = balanceAfter(loanAmount, i, pmt, k);
  const owed = Math.max(0, owedNoExtra - fv(extraMonthly));
  const value = rvValue * Math.pow(1 - depreciationPercent / 100, yearsUntilSale);
  // Extra monthly payment that brings the balance at sale down to the value.
  const gap = owedNoExtra - value;
  const unit = fv(1);

  return {
    monthlyPayment: round2(pmt),
    balanceAtSale: round2(owed),
    valueAtSale: round2(value),
    equityAtSale: round2(value - owed),
    extraNeededToBreakEven: gap > 0 && unit > 0 ? round2(gap / unit) : 0,
  };
};

// --- 4. RV Loan Interest Calculator (second-home deduction) ------------------
export const rvLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 70000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));
  const deductible = safeNumber(values.deductible, 1) === 1;
  const marginalTaxPercent = Math.min(60, Math.max(0, safeNumber(values.marginalTaxPercent, 24)));
  const nightsPerYear = Math.max(1, safeNumber(values.nightsPerYear, 30));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const pmt = payment(loanAmount, i, n);
  const total = pmt * n - loanAmount;
  const n1 = Math.min(12, n);
  const y1 = pmt * n1 - (loanAmount - balanceAfter(loanAmount, i, pmt, n1));
  const t = deductible ? marginalTaxPercent / 100 : 0;

  return {
    monthlyPayment: round2(pmt),
    totalInterest: round2(total),
    year1Interest: round2(y1),
    year1TaxSaving: round2(y1 * t),
    afterTaxInterest: round2(total * (1 - t)),
    year1InterestPerNight: round2((y1 * (1 - t)) / nightsPerYear),
  };
};

// --- 5. RV Loan Affordability Calculator -------------------------------------
export const rvLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const grossMonthlyIncome = Math.max(0, safeNumber(values.grossMonthlyIncome, 9000));
  const monthlyDebtPayments = Math.max(0, safeNumber(values.monthlyDebtPayments, 2400));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 40));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));
  const downPaymentPercent = Math.min(99, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const salesTaxPercent = Math.max(0, safeNumber(values.salesTaxPercent, 6));

  const maxPayment = Math.max(0, (grossMonthlyIncome * maxDtiPercent) / 100 - monthlyDebtPayments);
  const maxLoan = presentValue(maxPayment, annualRatePercent / 100 / 12, termYears * 12);
  const maxTotal = maxLoan / (1 - downPaymentPercent / 100);

  return {
    maxMonthlyPayment: round2(maxPayment),
    maxLoanAmount: round2(maxLoan),
    maxTotalWithTax: round2(maxTotal),
    maxRvPrice: round2(maxTotal / (1 + salesTaxPercent / 100)),
    downPaymentNeeded: round2(maxTotal - maxLoan),
  };
};

// --- 6. RV Loan Comparison Calculator (own vs rent) --------------------------
export const rvLoanComparisonCalculator: CustomCalculator = (values) => {
  const rvPrice = Math.max(0, safeNumber(values.rvPrice, 80000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));
  const depreciationPercent = Math.min(99, Math.max(0, safeNumber(values.depreciationPercent, 12)));
  const annualFixedCosts = Math.max(0, safeNumber(values.annualFixedCosts, 4200));
  const yearsCompared = Math.max(1, Math.round(safeNumber(values.yearsCompared, 5)));
  const nightsPerYear = Math.max(1, safeNumber(values.nightsPerYear, 30));
  const rentalPerNight = Math.max(0, safeNumber(values.rentalPerNight, 200));

  const down = (rvPrice * downPaymentPercent) / 100;
  const loan = rvPrice - down;
  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const pmt = payment(loan, i, n);
  const k = Math.min(n, yearsCompared * 12);
  const owed = balanceAfter(loan, i, pmt, k);
  const value = rvPrice * Math.pow(1 - depreciationPercent / 100, yearsCompared);
  const own = down + pmt * k + annualFixedCosts * yearsCompared + owed - value;
  const nights = nightsPerYear * yearsCompared;
  const rent = rentalPerNight * nights;

  return {
    ownNetCost: round2(own),
    rentCost: round2(rent),
    ownCostPerNight: round2(own / nights),
    rentCostPerNight: round2(rentalPerNight),
    rentingSaves: round2(own - rent),
  };
};

// --- 7. RV Loan Eligibility Calculator (incl. long-term minimum) -------------
export const rvLoanEligibilityCalculator: CustomCalculator = (values) => {
  const creditScore = Math.max(300, Math.min(850, safeNumber(values.creditScore, 710)));
  const lenderMinScore = Math.max(300, Math.min(850, safeNumber(values.lenderMinScore, 680)));
  const grossMonthlyIncome = Math.max(1, safeNumber(values.grossMonthlyIncome, 9000));
  const monthlyDebtPayments = Math.max(0, safeNumber(values.monthlyDebtPayments, 2300));
  const rvPrice = Math.max(1, safeNumber(values.rvPrice, 90000));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 15000));
  const maxLtvPercent = Math.max(0, safeNumber(values.maxLtvPercent, 90));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 20)));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 40));
  const minLoanForTerm = Math.max(0, safeNumber(values.minLoanForTerm, 50000));

  const loan = Math.max(0, rvPrice - downPayment);
  const ltv = (loan / rvPrice) * 100;
  const pmt = payment(loan, annualRatePercent / 100 / 12, termYears * 12);
  const dti = ((monthlyDebtPayments + pmt) / grossMonthlyIncome) * 100;

  return {
    loanAmount: round2(loan),
    ltvPercent: round2(ltv),
    ltvHeadroomPercent: round2(maxLtvPercent - ltv),
    monthlyPayment: round2(pmt),
    dtiPercent: round2(dti),
    dtiHeadroomPercent: round2(maxDtiPercent - dti),
    scoreMargin: Math.round(creditScore - lenderMinScore),
    marginOverTermMinimum: round2(loan - minLoanForTerm),
  };
};

export const loanRvCustomCalculators: Record<string, CustomCalculator> = {
  "rv-loan-calculator": rvLoanCalculator,
  "rv-loan-payment-calculator": rvLoanPaymentCalculator,
  "rv-loan-payoff-calculator": rvLoanPayoffCalculator,
  "rv-loan-interest-calculator": rvLoanInterestCalculator,
  "rv-loan-affordability-calculator": rvLoanAffordabilityCalculator,
  "rv-loan-comparison-calculator": rvLoanComparisonCalculator,
  "rv-loan-eligibility-calculator": rvLoanEligibilityCalculator,
};
