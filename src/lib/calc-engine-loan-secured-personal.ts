/**
 * Batch: "Loan Calculators" expansion 5 (4 Oct 2026), sub-batch 5 of 10 —
 * Secured Personal Loans (10 tools), filed under Loan Calculators >
 * Personal Loan Calculators. "Secured Personal Loan Comparison" was already
 * built as secured-vs-unsecured-loan-calculator; Prequalification, Early
 * Payoff and Consolidation were merged into Eligibility, Payoff and
 * Refinance. See calc-engine-loan-startup-business.ts for the full batch
 * context.
 *
 * A secured personal loan is backed by collateral — savings or a CD (a
 * share-secured loan), a paid-off vehicle, or other valuables:
 *  - securedPersonalLoan: loan limited by collateral x the lender's LTV for
 *    that collateral type.
 *  - securedPersonalLoanPayment: share-secured — rate = savings rate +
 *    margin; your pledged savings keep earning, so the net cost is lower.
 *  - securedPersonalLoanPayoff: extra each month (and collateral released
 *    sooner).
 *  - securedPersonalLoanRefinance (incl. consolidation): moving high-rate
 *    card debt to a secured loan.
 *  - securedPersonalLoanApr: application / lien-filing fees -> APR.
 *  - securedPersonalLoanAffordability: lower of the collateral limit and
 *    what a monthly budget repays.
 *  - securedPersonalLoanEligibility (incl. prequalification): LTV within
 *    the limit, DTI, and a lower credit bar than unsecured loans.
 *  - securedPersonalLoanInterest: year-1, total and average monthly
 *    interest.
 *  - securedPersonalLoanAmortization: balance vs a depreciating vehicle's
 *    value at any month — loan-to-value and equity.
 *  - securedPersonalLoanTotalCost: interest + fees + the full-coverage
 *    insurance a vehicle-secured loan requires.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-secured-personal-calculators.ts for the copy.
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

function solveMonthlyRate(pv: number, pmt: number, n: number): number {
  if (pv <= 0 || pmt <= 0 || n <= 0 || pmt * n <= pv) return 0;
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (presentValue(pmt, mid, n) > pv) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Typical maximum loan-to-value by collateral: 1 savings/CD, 2 vehicle, 3 other valuables. */
function collateralLtv(type: number): number {
  return type === 1 ? 100 : type === 2 ? 80 : 50;
}

// --- 1. Secured Personal Loan Calculator -------------------------------------------------
export const securedPersonalLoanCalculator: CustomCalculator = (values) => {
  const raw = Math.round(safeNumber(values.collateralType, 2));
  const type = [1, 2, 3].includes(raw) ? raw : 2;
  const collateralValue = Math.max(0, safeNumber(values.collateralValue, 15000));
  const requested = Math.max(0, safeNumber(values.requested, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));

  const maxLoan = (collateralValue * collateralLtv(type)) / 100;
  const loan = Math.min(requested, maxLoan);
  const pmt = payment(loan, annualRatePercent / 100 / 12, termMonths);

  return {
    maxLoanAgainstCollateral: round2(maxLoan),
    loanAmount: round2(loan),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - loan),
  };
};

// --- 2. Secured Personal Loan Payment Calculator (share-secured) ------------------------
export const securedPersonalLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 8000));
  const savingsRatePercent = Math.max(0, safeNumber(values.savingsRatePercent, 4));
  const marginPercent = Math.max(0, safeNumber(values.marginPercent, 3));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));

  const rate = savingsRatePercent + marginPercent;
  const pmt = payment(loanAmount, rate / 100 / 12, termMonths);
  const interest = pmt * termMonths - loanAmount;
  // Pledged savings shrink as the loan is repaid, so they earn on the same balances.
  const earned = rate > 0 ? (interest * savingsRatePercent) / rate : 0;

  return {
    loanRate: round2(rate),
    monthlyPayment: round2(pmt),
    interestPaid: round2(interest),
    interestEarnedOnSavings: round2(earned),
    netInterestCost: round2(interest - earned),
  };
};

// --- 3. Secured Personal Loan Payoff Calculator ------------------------------------------
export const securedPersonalLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 7000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 36)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 100));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(balance, i, remainingMonths);
  const fast = repay(balance, i, pmt + extraMonthly);

  return {
    currentPayment: round2(pmt),
    newPayment: round2(pmt + extraMonthly),
    monthsToPayoff: fast.months,
    monthsSaved: Math.max(0, remainingMonths - fast.months),
    interestSaved: round2(Math.max(0, pmt * remainingMonths - balance - fast.interest)),
  };
};

// --- 4. Secured Personal Loan Refinance Calculator (incl. consolidation) ----------------
export const securedPersonalLoanRefinanceCalculator: CustomCalculator = (values) => {
  const debt = Math.max(0, safeNumber(values.debt, 10000));
  const debtAprPercent = Math.max(0, safeNumber(values.debtAprPercent, 24));
  const currentPayment = Math.max(0, safeNumber(values.currentPayment, 350));
  const securedRatePercent = Math.max(0, safeNumber(values.securedRatePercent, 9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));

  const now = repay(debt, debtAprPercent / 100 / 12, currentPayment);
  const pmt = payment(debt, securedRatePercent / 100 / 12, termMonths);
  const newInterest = pmt * termMonths - debt;

  return {
    monthsAtCurrentPayment: now.months,
    interestAtCurrentPayment: round2(now.interest),
    newMonthlyPayment: round2(pmt),
    newTotalInterest: round2(newInterest),
    interestSaved: round2(now.interest - newInterest),
  };
};

// --- 5. Secured Personal Loan APR Calculator ----------------------------------------------
export const securedPersonalLoanAprCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 8000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const fees = Math.max(0, safeNumber(values.fees, 150));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const apr = solveMonthlyRate(Math.max(0, loanAmount - fees), pmt, termMonths) * 12 * 100;

  return {
    monthlyPayment: round2(pmt),
    cashReceived: round2(loanAmount - fees),
    apr: round2(apr),
    aprAboveRate: round2(Math.max(0, apr - annualRatePercent)),
  };
};

// --- 6. Secured Personal Loan Affordability Calculator -----------------------------------
export const securedPersonalLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const collateralValue = Math.max(0, safeNumber(values.collateralValue, 15000));
  const maxLtvPercent = Math.min(100, Math.max(0, safeNumber(values.maxLtvPercent, 80)));
  const monthlyBudget = Math.max(0, safeNumber(values.monthlyBudget, 300));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));

  const byCollateral = (collateralValue * maxLtvPercent) / 100;
  const byBudget = presentValue(monthlyBudget, annualRatePercent / 100 / 12, termMonths);

  return {
    maxByCollateral: round2(byCollateral),
    maxByBudget: round2(byBudget),
    maxLoanAmount: round2(Math.min(byCollateral, byBudget)),
  };
};

// --- 7. Secured Personal Loan Eligibility Calculator (incl. prequalification) ----------
export const securedPersonalLoanEligibilityCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 10000));
  const collateralValue = Math.max(0, safeNumber(values.collateralValue, 14000));
  const maxLtvPercent = Math.min(100, Math.max(0, safeNumber(values.maxLtvPercent, 80)));
  const monthlyIncome = Math.max(0, safeNumber(values.monthlyIncome, 3500));
  const monthlyDebts = Math.max(0, safeNumber(values.monthlyDebts, 900));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 590)));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const ltv = collateralValue > 0 ? (loanAmount / collateralValue) * 100 : 0;
  const dti = monthlyIncome > 0 ? ((monthlyDebts + pmt) / monthlyIncome) * 100 : 0;
  let passed = 0;
  if (collateralValue > 0 && ltv <= maxLtvPercent) passed++;
  if (monthlyIncome > 0 && dti <= 45) passed++;
  if (creditScore >= 580) passed++;

  return {
    monthlyPayment: round2(pmt),
    loanToValue: round2(ltv),
    dtiWithLoan: round2(dti),
    checksPassed: passed,
  };
};

// --- 8. Secured Personal Loan Interest Calculator -----------------------------------------
export const securedPersonalLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const total = pmt * termMonths - loanAmount;
  const k = Math.min(12, termMonths);
  const firstYear = pmt * k - (loanAmount - balanceAfter(loanAmount, i, pmt, k));

  return {
    interestFirstYear: round2(firstYear),
    totalInterest: round2(total),
    averageMonthlyInterest: round2(total / termMonths),
    interestAsShareOfLoan: round2(loanAmount > 0 ? (total / loanAmount) * 100 : 0),
  };
};

// --- 9. Secured Personal Loan Amortization Calculator (vs collateral value) -------------
export const securedPersonalLoanAmortizationCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const collateralValue = Math.max(0, safeNumber(values.collateralValue, 20000));
  const depreciationPercent = Math.min(100, Math.max(0, safeNumber(values.depreciationPercent, 12)));
  const monthNumber = Math.min(termMonths, Math.max(0, Math.round(safeNumber(values.monthNumber, 24))));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const bal = balanceAfter(loanAmount, i, pmt, monthNumber);
  const value = collateralValue * Math.pow(1 - depreciationPercent / 100, monthNumber / 12);

  return {
    monthlyPayment: round2(pmt),
    balanceAtMonth: round2(bal),
    collateralValueAtMonth: round2(value),
    loanToValueAtMonth: round2(value > 0 ? (bal / value) * 100 : 0),
    equityAtMonth: round2(value - bal),
  };
};

// --- 10. Secured Personal Loan Total Cost Calculator -------------------------------------
export const securedPersonalLoanTotalCostCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 12000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const fees = Math.max(0, safeNumber(values.fees, 150));
  const extraInsurancePerYear = Math.max(0, safeNumber(values.extraInsurancePerYear, 600));

  const interest = payment(loanAmount, annualRatePercent / 100 / 12, termMonths) * termMonths - loanAmount;
  const insurance = (extraInsurancePerYear * termMonths) / 12;
  const total = interest + fees + insurance;

  return {
    totalInterest: round2(interest),
    fees: round2(fees),
    requiredInsuranceCost: round2(insurance),
    totalCostOfBorrowing: round2(total),
    costPerMonth: round2(total / termMonths),
  };
};

export const loanSecuredPersonalCustomCalculators: Record<string, CustomCalculator> = {
  "secured-personal-loan-calculator": securedPersonalLoanCalculator,
  "secured-personal-loan-payment-calculator": securedPersonalLoanPaymentCalculator,
  "secured-personal-loan-payoff-calculator": securedPersonalLoanPayoffCalculator,
  "secured-personal-loan-refinance-calculator": securedPersonalLoanRefinanceCalculator,
  "secured-personal-loan-apr-calculator": securedPersonalLoanAprCalculator,
  "secured-personal-loan-affordability-calculator": securedPersonalLoanAffordabilityCalculator,
  "secured-personal-loan-eligibility-calculator": securedPersonalLoanEligibilityCalculator,
  "secured-personal-loan-interest-calculator": securedPersonalLoanInterestCalculator,
  "secured-personal-loan-amortization-calculator": securedPersonalLoanAmortizationCalculator,
  "secured-personal-loan-total-cost-calculator": securedPersonalLoanTotalCostCalculator,
};
