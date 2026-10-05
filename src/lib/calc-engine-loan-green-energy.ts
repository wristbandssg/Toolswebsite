/**
 * Batch: "Loan Calculators" expansion 5 (4 Oct 2026), sub-batch 8 of 10 —
 * Green Energy Loans (7 tools), filed under Loan Calculators > Home
 * Improvement Loan Calculators. Solar already has its own solar-panel-loan-*
 * set, so these focus on energy-efficiency upgrades — heat pumps,
 * insulation, windows, water heaters, smart controls — where the payback
 * comes from lower energy bills. See calc-engine-loan-startup-business.ts
 * for the full batch context.
 *
 * The federal efficiency (25C) and solar (25D) credits ended for property
 * placed in service after 31 Dec 2025, so only utility and state rebates
 * are entered here.
 *  - greenEnergyLoan: project - rebates -> loan, payment, and the net
 *    monthly cost after energy savings.
 *  - greenEnergyLoanPayment: the payment vs monthly savings, and the term
 *    needed for savings to cover the payment.
 *  - greenEnergyLoanPayoff: putting the energy savings toward the loan.
 *  - greenEnergyLoanInterest: interest vs savings over the equipment's
 *    life (with energy price inflation) -> net lifetime benefit.
 *  - greenEnergyLoanAffordability: net budget + savings -> max project.
 *  - greenEnergyLoanComparison: an energy loan vs PACE financing (repaid
 *    through property taxes over a longer term).
 *  - greenEnergyLoanEligibility: score, DTI, home ownership.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-green-energy-calculators.ts for the copy.
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

// --- 1. Green Energy Loan Calculator --------------------------------------------------------
export const greenEnergyLoanCalculator: CustomCalculator = (values) => {
  const projectCost = Math.max(0, safeNumber(values.projectCost, 18000));
  const rebates = Math.max(0, safeNumber(values.rebates, 2000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 120)));
  const annualEnergySavings = Math.max(0, safeNumber(values.annualEnergySavings, 1500));

  const loan = Math.max(0, projectCost - rebates);
  const pmt = payment(loan, annualRatePercent / 100 / 12, termMonths);

  return {
    loanAmount: round2(loan),
    monthlyPayment: round2(pmt),
    monthlyEnergySavings: round2(annualEnergySavings / 12),
    netMonthlyCost: round2(pmt - annualEnergySavings / 12),
    totalInterest: round2(pmt * termMonths - loan),
  };
};

// --- 2. Green Energy Loan Payment Calculator (term to be cash-flow positive) -------------
export const greenEnergyLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 84)));
  const monthlySavings = Math.max(0, safeNumber(values.monthlySavings, 140));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  let needed = 0;
  if (monthlySavings > 0 && loanAmount > 0) {
    if (i === 0) needed = Math.ceil(loanAmount / monthlySavings);
    else if (monthlySavings > loanAmount * i) needed = Math.ceil(-Math.log(1 - (loanAmount * i) / monthlySavings) / Math.log(1 + i));
    else needed = 600;
  }

  return {
    monthlyPayment: round2(pmt),
    monthlySavings: round2(monthlySavings),
    monthlyCashFlow: round2(monthlySavings - pmt),
    termForSavingsToCoverPayment: Math.min(600, needed),
  };
};

// --- 3. Green Energy Loan Payoff Calculator (savings as extra) ---------------------------
export const greenEnergyLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 120)));
  const monthlySavings = Math.max(0, safeNumber(values.monthlySavings, 125));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(balance, i, remainingMonths);
  const fast = repay(balance, i, pmt + monthlySavings);

  return {
    currentPayment: round2(pmt),
    paymentWithSavings: round2(pmt + monthlySavings),
    monthsToPayoff: fast.months,
    monthsSaved: Math.max(0, remainingMonths - fast.months),
    interestSaved: round2(Math.max(0, pmt * remainingMonths - balance - fast.interest)),
  };
};

// --- 4. Green Energy Loan Interest Calculator (vs lifetime savings) -----------------------
export const greenEnergyLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 16000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 120)));
  const annualSavings = Math.max(0, safeNumber(values.annualSavings, 1500));
  const lifeYears = Math.max(1, Math.round(safeNumber(values.lifeYears, 15)));
  const energyInflationPercent = safeNumber(values.energyInflationPercent, 3);

  const interest = payment(loanAmount, annualRatePercent / 100 / 12, termMonths) * termMonths - loanAmount;
  let lifetime = 0;
  for (let y = 0; y < lifeYears; y++) lifetime += annualSavings * Math.pow(1 + energyInflationPercent / 100, y);

  return {
    totalInterest: round2(interest),
    totalCostWithInterest: round2(loanAmount + interest),
    lifetimeEnergySavings: round2(lifetime),
    netLifetimeBenefit: round2(lifetime - loanAmount - interest),
  };
};

// --- 5. Green Energy Loan Affordability Calculator ----------------------------------------
export const greenEnergyLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const netBudget = Math.max(0, safeNumber(values.netBudget, 50));
  const monthlySavings = Math.max(0, safeNumber(values.monthlySavings, 120));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 120)));
  const rebates = Math.max(0, safeNumber(values.rebates, 2000));

  const maxPmt = netBudget + monthlySavings;
  const maxLoan = presentValue(maxPmt, annualRatePercent / 100 / 12, termMonths);

  return {
    maxMonthlyPayment: round2(maxPmt),
    maxLoanAmount: round2(maxLoan),
    maxProjectCost: round2(maxLoan + rebates),
  };
};

// --- 6. Green Energy Loan Comparison Calculator (loan vs PACE) ----------------------------
export const greenEnergyLoanComparisonCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 20000));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 7.99));
  const loanTermYears = Math.max(1, Math.round(safeNumber(values.loanTermYears, 10)));
  const paceRatePercent = Math.max(0, safeNumber(values.paceRatePercent, 8.5));
  const paceTermYears = Math.max(1, Math.round(safeNumber(values.paceTermYears, 20)));
  const paceFeesPercent = Math.max(0, safeNumber(values.paceFeesPercent, 5));

  const loanPmt = payment(amount, loanRatePercent / 100 / 12, loanTermYears * 12);
  const paceAmount = amount * (1 + paceFeesPercent / 100);
  const paceAnnual = payment(paceAmount, paceRatePercent / 100, paceTermYears);
  const loanCost = loanPmt * loanTermYears * 12 - amount;
  const paceCost = paceAnnual * paceTermYears - amount;

  return {
    loanMonthlyPayment: round2(loanPmt),
    paceAnnualAssessment: round2(paceAnnual),
    loanTotalCost: round2(loanCost),
    paceTotalCost: round2(paceCost),
    savingsWithLoan: round2(paceCost - loanCost),
  };
};

// --- 7. Green Energy Loan Eligibility Calculator ------------------------------------------
export const greenEnergyLoanEligibilityCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 120)));
  const monthlyIncome = Math.max(0, safeNumber(values.monthlyIncome, 6000));
  const monthlyDebts = Math.max(0, safeNumber(values.monthlyDebts, 2000));
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 680)));
  const homeowner = Math.round(safeNumber(values.homeowner, 1)) === 1;

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const dti = monthlyIncome > 0 ? ((monthlyDebts + pmt) / monthlyIncome) * 100 : 0;
  let passed = 0;
  if (creditScore >= 640) passed++;
  if (monthlyIncome > 0 && dti <= 45) passed++;
  if (homeowner) passed++;

  return {
    monthlyPayment: round2(pmt),
    dtiWithLoan: round2(dti),
    checksPassed: passed,
  };
};

export const loanGreenEnergyCustomCalculators: Record<string, CustomCalculator> = {
  "green-energy-loan-calculator": greenEnergyLoanCalculator,
  "green-energy-loan-payment-calculator": greenEnergyLoanPaymentCalculator,
  "green-energy-loan-payoff-calculator": greenEnergyLoanPayoffCalculator,
  "green-energy-loan-interest-calculator": greenEnergyLoanInterestCalculator,
  "green-energy-loan-affordability-calculator": greenEnergyLoanAffordabilityCalculator,
  "green-energy-loan-comparison-calculator": greenEnergyLoanComparisonCalculator,
  "green-energy-loan-eligibility-calculator": greenEnergyLoanEligibilityCalculator,
};
