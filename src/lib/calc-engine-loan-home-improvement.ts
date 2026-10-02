/**
 * Batch: "Loan Calculators" expansion (2 Oct 2026), sub-batch 4 of 10 —
 * Home Improvement Loans (13 tools), filed under Loan Calculators > Home
 * Improvement Loan Calculators. See calc-engine-loan-debt-consolidation.ts
 * for the full batch context (Home Improvement Loan Consolidation
 * Calculator was dropped from the list as too vague).
 *
 * Home improvement loans are either unsecured personal loans or secured
 * against the home (home equity loans), so several tools here model
 * home-equity specifics the other batches don't:
 *  - homeImprovementLoan: project cost + a contingency buffer - cash on hand
 *    = loan; payment and interest.
 *  - payment: monthly vs biweekly (half the payment every two weeks).
 *  - payoff: payoff time vs how long the improvement itself will last.
 *  - refinance: moving a personal loan to a cheaper (secured) loan with
 *    dollar closing costs, with break-even.
 *  - apr: APR with discount points AND dollar closing costs, term in years.
 *  - affordability: the lower of an equity limit (max CLTV) and a payment
 *    budget limit.
 *  - eligibility: CLTV, DTI and score checks for a home equity loan.
 *  - interest: total and year-1 interest, and the after-tax cost if the
 *    interest is deductible (secured loan used to improve the home).
 *  - early payoff: the extra monthly payment needed to finish by a target
 *    year.
 *  - comparison: unsecured personal loan vs home equity loan.
 *  - amortization: balance at years 1, 3 and 5, and 5-year interest vs
 *    principal.
 *  - prequalification: prequalified amount + cash vs the project budget,
 *    across an APR range.
 *  - total cost: project + interest + fees, less the value the project adds
 *    to the home.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-home-improvement-calculators.ts for the copy.
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

function balanceAfter(principal: number, i: number, pmt: number, k: number): number {
  if (k <= 0) return principal;
  if (i === 0) return Math.max(0, principal - pmt * k);
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (pmt * (g - 1)) / i);
}

function payDown(balance: number, i: number, pay: number, maxMonths = 1200): { months: number; interest: number } {
  if (balance <= 0) return { months: 0, interest: 0 };
  if (pay <= balance * i + 1e-9) return { months: -1, interest: 0 };
  let b = balance;
  let interest = 0;
  let months = 0;
  while (b > 1e-9 && months < maxMonths) {
    const int = b * i;
    interest += int;
    b = b + int - Math.min(pay, b + int);
    months++;
  }
  return { months, interest };
}

// --- 1. Home Improvement Loan Calculator -------------------------------------
export const homeImprovementLoanCalculator: CustomCalculator = (values) => {
  const projectCost = Math.max(0, safeNumber(values.projectCost, 40000));
  const contingencyPercent = Math.max(0, safeNumber(values.contingencyPercent, 10));
  const cashOnHand = Math.max(0, safeNumber(values.cashOnHand, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 84)));

  const contingency = (projectCost * contingencyPercent) / 100;
  const budget = projectCost + contingency;
  const loanAmount = Math.max(0, budget - cashOnHand);
  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);

  return {
    contingency: round2(contingency),
    totalBudget: round2(budget),
    loanAmount: round2(loanAmount),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - loanAmount),
  };
};

// --- 2. Home Improvement Loan Payment Calculator (monthly vs biweekly) -------
export const homeImprovementLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 30000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));

  const n = termYears * 12;
  const r = annualRatePercent / 100;
  const pmt = payment(loanAmount, r / 12, n);
  const monthlyInterest = pmt * n - loanAmount;

  // Biweekly: half the monthly payment every 2 weeks (26 a year), with
  // interest charged per 2-week period on the remaining balance.
  const half = pmt / 2;
  const ib = r / 26;
  let b = loanAmount;
  let periods = 0;
  let interest = 0;
  while (b > 1e-9 && periods < 2600) {
    const int = b * ib;
    interest += int;
    b = b + int - Math.min(half, b + int);
    periods++;
  }

  return {
    monthlyPayment: round2(pmt),
    biweeklyPayment: round2(half),
    monthsMonthly: n,
    monthsBiweekly: Math.ceil((periods * 12) / 26),
    interestSavedBiweekly: round2(monthlyInterest - interest),
  };
};

// --- 3. Home Improvement Loan Payoff Calculator (vs improvement lifespan) ----
export const homeImprovementLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 25000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 350));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 100));
  const improvementLifeYears = Math.max(0, safeNumber(values.improvementLifeYears, 15));

  const i = annualRatePercent / 100 / 12;
  const now = payDown(balance, i, monthlyPayment);
  const faster = payDown(balance, i, monthlyPayment + extraMonthly);

  return {
    monthsLeft: Math.max(0, now.months),
    monthsWithExtra: Math.max(0, faster.months),
    interestSaved: now.months >= 0 && faster.months >= 0 ? round2(now.interest - faster.interest) : 0,
    yearsOfUseAfterPayoff: faster.months >= 0 ? round2(improvementLifeYears - faster.months / 12) : 0,
  };
};

// --- 4. Home Improvement Loan Refinance Calculator ---------------------------
export const homeImprovementLoanRefinanceCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 30000));
  const currentRatePercent = Math.max(0, safeNumber(values.currentRatePercent, 13));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 60)));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 8.5));
  const newTermMonths = Math.max(1, Math.round(safeNumber(values.newTermMonths, 60)));
  const closingCosts = Math.max(0, safeNumber(values.closingCosts, 750));

  const currentPmt = payment(currentBalance, currentRatePercent / 100 / 12, remainingMonths);
  const newPmt = payment(currentBalance, newRatePercent / 100 / 12, newTermMonths);
  const monthlySavings = currentPmt - newPmt;

  return {
    currentPayment: round2(currentPmt),
    newPayment: round2(newPmt),
    monthlySavings: round2(monthlySavings),
    netSavings: round2(currentPmt * remainingMonths - newPmt * newTermMonths - closingCosts),
    breakEvenMonths: monthlySavings > 0 ? Math.ceil(closingCosts / monthlySavings) : 0,
  };
};

// --- 5. Home Improvement Loan APR Calculator (points + closing costs) --------
export const homeImprovementLoanAprCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 50000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));
  const pointsPercent = Math.max(0, safeNumber(values.pointsPercent, 1));
  const closingCosts = Math.max(0, safeNumber(values.closingCosts, 1000));

  const n = termYears * 12;
  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, n);
  const upfront = (loanAmount * pointsPercent) / 100 + closingCosts;
  const received = loanAmount - upfront;
  const apr = upfront > 0 ? solvePeriodicRate(received, pmt, n) * 12 * 100 : annualRatePercent;

  return {
    aprPercent: round2(apr),
    upfrontCosts: round2(upfront),
    amountReceived: round2(received),
    monthlyPayment: round2(pmt),
    aprAboveRate: round2(apr - annualRatePercent),
  };
};

// --- 6. Home Improvement Loan Affordability Calculator -----------------------
export const homeImprovementLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const homeValue = Math.max(0, safeNumber(values.homeValue, 400000));
  const mortgageBalance = Math.max(0, safeNumber(values.mortgageBalance, 250000));
  const maxCltvPercent = Math.max(0, safeNumber(values.maxCltvPercent, 85));
  const monthlyBudget = Math.max(0, safeNumber(values.monthlyBudget, 500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));

  const equityLimit = Math.max(0, (homeValue * maxCltvPercent) / 100 - mortgageBalance);
  const budgetLimit = presentValue(monthlyBudget, annualRatePercent / 100 / 12, termYears * 12);
  const maxLoan = Math.min(equityLimit, budgetLimit);

  return {
    equityLimit: round2(equityLimit),
    budgetLimit: round2(budgetLimit),
    maxLoanAmount: round2(maxLoan),
    cltvAfterPercent: homeValue > 0 ? round2(((mortgageBalance + maxLoan) / homeValue) * 100) : 0,
  };
};

// --- 7. Home Improvement Loan Eligibility Calculator -------------------------
export const homeImprovementLoanEligibilityCalculator: CustomCalculator = (values) => {
  const homeValue = Math.max(1, safeNumber(values.homeValue, 350000));
  const mortgageBalance = Math.max(0, safeNumber(values.mortgageBalance, 220000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 50000));
  const maxCltvPercent = Math.max(0, safeNumber(values.maxCltvPercent, 85));
  const grossMonthlyIncome = Math.max(1, safeNumber(values.grossMonthlyIncome, 8000));
  const monthlyDebtPayments = Math.max(0, safeNumber(values.monthlyDebtPayments, 2200));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 43));
  const creditScore = Math.max(300, Math.min(850, safeNumber(values.creditScore, 700)));
  const lenderMinScore = Math.max(300, Math.min(850, safeNumber(values.lenderMinScore, 680)));

  const cltv = ((mortgageBalance + loanAmount) / homeValue) * 100;
  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termYears * 12);
  const dti = ((monthlyDebtPayments + pmt) / grossMonthlyIncome) * 100;

  return {
    cltvPercent: round2(cltv),
    cltvHeadroomPercent: round2(maxCltvPercent - cltv),
    newPayment: round2(pmt),
    dtiAfterPercent: round2(dti),
    dtiHeadroomPercent: round2(maxDtiPercent - dti),
    scoreMargin: Math.round(creditScore - lenderMinScore),
  };
};

// --- 8. Home Improvement Loan Interest Calculator (after-tax) ----------------
export const homeImprovementLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 50000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));
  const deductible = safeNumber(values.deductible, 1) === 1;
  const marginalTaxPercent = Math.min(60, Math.max(0, safeNumber(values.marginalTaxPercent, 22)));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const pmt = payment(loanAmount, i, n);
  const total = pmt * n - loanAmount;
  const y1 = pmt * Math.min(12, n) - (loanAmount - balanceAfter(loanAmount, i, pmt, Math.min(12, n)));
  const t = deductible ? marginalTaxPercent / 100 : 0;

  return {
    monthlyPayment: round2(pmt),
    totalInterest: round2(total),
    year1Interest: round2(y1),
    year1TaxSaving: round2(y1 * t),
    afterTaxInterest: round2(total * (1 - t)),
    afterTaxRatePercent: round2(annualRatePercent * (1 - t)),
  };
};

// --- 9. Home Improvement Loan Early Payoff Calculator (target year) ---------
export const homeImprovementLoanEarlyPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 40000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));
  const yearsPaid = Math.min(termYears, Math.max(0, safeNumber(values.yearsPaid, 3)));
  const targetYearsLeft = Math.max(0.0833, safeNumber(values.targetYearsLeft, 5));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const paid = Math.round(yearsPaid * 12);
  const pmt = payment(loanAmount, i, n);
  const bal = balanceAfter(loanAmount, i, pmt, paid);
  const monthsLeft = n - paid;
  const targetMonths = Math.min(monthsLeft, Math.max(1, Math.round(targetYearsLeft * 12)));
  const newPmt = payment(bal, i, targetMonths);

  return {
    currentBalance: round2(bal),
    currentPayment: round2(pmt),
    newPaymentNeeded: round2(newPmt),
    extraPerMonth: round2(newPmt - pmt),
    interestSaved: round2(pmt * monthsLeft - newPmt * targetMonths),
  };
};

// --- 10. Home Improvement Loan Comparison Calculator (personal vs equity) ---
export const homeImprovementLoanComparisonCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 40000));
  const personalRatePercent = Math.max(0, safeNumber(values.personalRatePercent, 12));
  const personalTermMonths = Math.max(1, Math.round(safeNumber(values.personalTermMonths, 84)));
  const personalFeePercent = Math.min(50, Math.max(0, safeNumber(values.personalFeePercent, 3)));
  const equityRatePercent = Math.max(0, safeNumber(values.equityRatePercent, 8.5));
  const equityTermYears = Math.max(1, Math.round(safeNumber(values.equityTermYears, 10)));
  const equityClosingCosts = Math.max(0, safeNumber(values.equityClosingCosts, 1500));

  const pl = amount / (1 - personalFeePercent / 100);
  const plPmt = payment(pl, personalRatePercent / 100 / 12, personalTermMonths);
  const plCost = plPmt * personalTermMonths - amount;
  const heN = equityTermYears * 12;
  const hePmt = payment(amount, equityRatePercent / 100 / 12, heN);
  const heCost = hePmt * heN - amount + equityClosingCosts;

  return {
    personalPayment: round2(plPmt),
    personalTotalCost: round2(plCost),
    equityPayment: round2(hePmt),
    equityTotalCost: round2(heCost),
    equitySavings: round2(plCost - heCost),
  };
};

// --- 11. Home Improvement Loan Amortization Calculator -----------------------
export const homeImprovementLoanAmortizationCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 50000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const pmt = payment(loanAmount, i, n);
  const at = (years: number) => balanceAfter(loanAmount, i, pmt, Math.min(n, years * 12));
  const b5 = at(5);
  const months5 = Math.min(n, 60);

  return {
    monthlyPayment: round2(pmt),
    balanceAfterYear1: round2(at(1)),
    balanceAfterYear3: round2(at(3)),
    balanceAfterYear5: round2(b5),
    interestFirst5Years: round2(pmt * months5 - (loanAmount - b5)),
    principalFirst5Years: round2(loanAmount - b5),
  };
};

// --- 12. Home Improvement Loan Prequalification Calculator -------------------
export const homeImprovementLoanPrequalificationCalculator: CustomCalculator = (values) => {
  const projectBudget = Math.max(0, safeNumber(values.projectBudget, 45000));
  const cashOnHand = Math.max(0, safeNumber(values.cashOnHand, 5000));
  const prequalifiedAmount = Math.max(0, safeNumber(values.prequalifiedAmount, 35000));
  const aprLowPercent = Math.max(0, safeNumber(values.aprLowPercent, 8));
  const aprHighPercent = Math.max(aprLowPercent, safeNumber(values.aprHighPercent, 16));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 84)));

  const needed = Math.max(0, projectBudget - cashOnHand);
  const borrow = Math.min(needed, prequalifiedAmount);

  return {
    amountNeeded: round2(needed),
    fundingGap: round2(Math.max(0, needed - prequalifiedAmount)),
    budgetCoveredPercent: projectBudget > 0 ? round2(Math.min(100, ((borrow + cashOnHand) / projectBudget) * 100)) : 0,
    paymentAtLowApr: round2(payment(borrow, aprLowPercent / 100 / 12, termMonths)),
    paymentAtHighApr: round2(payment(borrow, aprHighPercent / 100 / 12, termMonths)),
  };
};

// --- 13. Home Improvement Loan Total Cost Calculator (net of value added) ----
export const homeImprovementLoanTotalCostCalculator: CustomCalculator = (values) => {
  const projectCost = Math.max(0, safeNumber(values.projectCost, 40000));
  const cashDown = Math.max(0, safeNumber(values.cashDown, 5000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 84)));
  const loanFees = Math.max(0, safeNumber(values.loanFees, 500));
  const valueRecoupPercent = Math.max(0, safeNumber(values.valueRecoupPercent, 70));

  const loanAmount = Math.max(0, projectCost - cashDown);
  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - loanAmount;
  const total = projectCost + interest + loanFees;
  const valueAdded = (projectCost * valueRecoupPercent) / 100;

  return {
    loanAmount: round2(loanAmount),
    totalInterest: round2(interest),
    totalCostWithFinancing: round2(total),
    valueAdded: round2(valueAdded),
    netCostAfterValue: round2(total - valueAdded),
  };
};

export const loanHomeImprovementCustomCalculators: Record<string, CustomCalculator> = {
  "home-improvement-loan-calculator": homeImprovementLoanCalculator,
  "home-improvement-loan-payment-calculator": homeImprovementLoanPaymentCalculator,
  "home-improvement-loan-payoff-calculator": homeImprovementLoanPayoffCalculator,
  "home-improvement-loan-refinance-calculator": homeImprovementLoanRefinanceCalculator,
  "home-improvement-loan-apr-calculator": homeImprovementLoanAprCalculator,
  "home-improvement-loan-affordability-calculator": homeImprovementLoanAffordabilityCalculator,
  "home-improvement-loan-eligibility-calculator": homeImprovementLoanEligibilityCalculator,
  "home-improvement-loan-interest-calculator": homeImprovementLoanInterestCalculator,
  "home-improvement-loan-early-payoff-calculator": homeImprovementLoanEarlyPayoffCalculator,
  "home-improvement-loan-comparison-calculator": homeImprovementLoanComparisonCalculator,
  "home-improvement-loan-amortization-calculator": homeImprovementLoanAmortizationCalculator,
  "home-improvement-loan-prequalification-calculator": homeImprovementLoanPrequalificationCalculator,
  "home-improvement-loan-total-cost-calculator": homeImprovementLoanTotalCostCalculator,
};
