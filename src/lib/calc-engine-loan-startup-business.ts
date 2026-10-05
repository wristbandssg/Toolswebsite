/**
 * Batch: "Loan Calculators" expansion 5 (4 Oct 2026), sub-batch 1 of 10 —
 * Startup Business Loans (11 tools), filed under Loan Calculators > General
 * Loan Calculators. The user's 150-keyword list was checked against every
 * existing slug. 25 were already built under another name: Term Loan
 * Calculator/Payment/Payoff/Refinance/APR/Affordability/Interest/Comparison/
 * Amortization (= business-loan-*), Revolving Credit Loan x7 (=
 * line-of-credit-*), Unsecured Personal Loan Calculator/APR/Refinance/
 * Payoff/Early Payoff/Consolidation/Comparison (= personal-loan-calculator,
 * personal-loan-apr, personal-loan-refinance, personal-loan-extra-payment,
 * debt-consolidation-calculator), Secured Personal Loan Comparison (=
 * secured-vs-unsecured-loan-calculator) and Co-Signer Release Loan
 * Calculator (= cosigned-loan-payoff-calculator). 24 were merged as the
 * same purpose: Prequalification -> Eligibility, Early Payoff -> Payoff and
 * Consolidation -> Refinance for Startup/Term/Secured; Unsecured
 * Prequalification; No-Credit-Check x4 -> Bad Credit; Same-Day x4 ->
 * Emergency; Christmas x4 -> Holiday; Co-Signer Release Payment/Cost. The
 * remaining Unsecured Personal Loan tools are built as personal-loan-*
 * (the stronger keyword for the same intent). 101 tools in 10 sub-batches:
 *  - calc-engine-loan-startup-business.ts (this file) -> General Loan Calculators
 *  - calc-engine-loan-trade-po-term.ts                  -> General Loan Calculators
 *  - calc-engine-loan-asset-based-bridge.ts             -> General Loan Calculators
 *  - calc-engine-loan-personal-core.ts                  -> Personal Loan Calculators
 *  - calc-engine-loan-secured-personal.ts               -> Personal Loan Calculators
 *  - calc-engine-loan-bail-holiday.ts                   -> Personal Loan Calculators
 *  - calc-engine-loan-bad-credit-emergency.ts           -> Short-Term & High-Cost Loan Calculators
 *  - calc-engine-loan-green-energy.ts                   -> Home Improvement Loan Calculators
 *  - calc-engine-mortgage-down-payment-assistance.ts    -> Mortgage Calculators
 *  - calc-engine-credit-debt-settlement-transfer.ts     -> Credit & Debt Calculators
 *
 * What each startup tool models beyond the plain payment formula:
 *  - startupBusinessLoan: launch costs + months of runway - owner equity.
 *  - startupBusinessLoanPayment: the payment vs profit that ramps up each
 *    month — when profit covers it and the cash reserve needed until then.
 *  - startupBusinessLoanPayoff: extra each month.
 *  - startupBusinessLoanRefinance (incl. consolidation): replacing costly
 *    early financing (cards, online loans) with a cheaper term loan.
 *  - startupBusinessLoanApr: origination + other fees -> APR.
 *  - startupBusinessLoanAffordability: lenders look at the business's
 *    projected cash flow AND the owner's personal DTI; the lower limit.
 *  - startupBusinessLoanEligibility (incl. prequalification): score, cash
 *    injection, collateral coverage, industry experience.
 *  - startupBusinessLoanInterest: interest and its after-tax cost.
 *  - startupBusinessLoanComparison: bank/SBA-style offer vs online lender.
 *  - startupBusinessLoanAmortization: any year of the schedule.
 *  - startupBusinessLoanTotalCost: interest + all fees, cost per $1.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-startup-business-calculators.ts for the copy.
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

/** Monthly rate at which `pmt` for `n` months repays `pv` (bisection). */
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

// --- 1. Startup Business Loan Calculator --------------------------------------------
export const startupBusinessLoanCalculator: CustomCalculator = (values) => {
  const startupCosts = Math.max(0, safeNumber(values.startupCosts, 120000));
  const monthlyBurn = Math.max(0, safeNumber(values.monthlyBurn, 8000));
  const runwayMonths = Math.max(0, safeNumber(values.runwayMonths, 6));
  const ownerEquityPercent = Math.min(100, Math.max(0, safeNumber(values.ownerEquityPercent, 20)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 7)));

  const need = startupCosts + monthlyBurn * runwayMonths;
  const equity = (need * ownerEquityPercent) / 100;
  const loan = need - equity;
  const n = termYears * 12;
  const pmt = payment(loan, annualRatePercent / 100 / 12, n);

  return {
    totalFundingNeeded: round2(need),
    ownerEquity: round2(equity),
    loanAmount: round2(loan),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * n - loan),
  };
};

// --- 2. Startup Business Loan Payment Calculator (profit ramp-up) -------------------
export const startupBusinessLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 100000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 7)));
  const startingProfit = Math.max(0, safeNumber(values.startingProfit, 0));
  const profitGrowth = Math.max(0, safeNumber(values.profitGrowth, 400));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termYears * 12);
  let months = 0;
  let gap = 0;
  while (startingProfit + profitGrowth * months < pmt && months < 600) {
    gap += pmt - (startingProfit + profitGrowth * months);
    months++;
  }

  return {
    monthlyPayment: round2(pmt),
    monthsUntilProfitCoversPayment: months,
    cashReserveNeeded: round2(gap),
    totalInterest: round2(pmt * termYears * 12 - loanAmount),
  };
};

// --- 3. Startup Business Loan Payoff Calculator --------------------------------------
export const startupBusinessLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 80000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 60)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 500));

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

// --- 4. Startup Business Loan Refinance Calculator (incl. consolidation) ------------
export const startupBusinessLoanRefinanceCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 60000));
  const currentRatePercent = Math.max(0, safeNumber(values.currentRatePercent, 30));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 24)));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 11));
  const newTermMonths = Math.max(1, Math.round(safeNumber(values.newTermMonths, 48)));
  const feePercent = Math.max(0, safeNumber(values.feePercent, 3));

  const oldPmt = payment(balance, currentRatePercent / 100 / 12, remainingMonths);
  const newLoan = balance * (1 + feePercent / 100);
  const newPmt = payment(newLoan, newRatePercent / 100 / 12, newTermMonths);
  const oldCost = oldPmt * remainingMonths - balance;
  const newCost = newPmt * newTermMonths - balance;

  return {
    currentPayment: round2(oldPmt),
    newLoanAmount: round2(newLoan),
    newPayment: round2(newPmt),
    monthlySavings: round2(oldPmt - newPmt),
    totalCostSavings: round2(oldCost - newCost),
  };
};

// --- 5. Startup Business Loan APR Calculator -----------------------------------------
export const startupBusinessLoanAprCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 75000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const originationPercent = Math.max(0, safeNumber(values.originationPercent, 3));
  const otherFees = Math.max(0, safeNumber(values.otherFees, 500));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const fees = (loanAmount * originationPercent) / 100 + otherFees;
  const apr = solveMonthlyRate(Math.max(0, loanAmount - fees), pmt, termMonths) * 12 * 100;

  return {
    monthlyPayment: round2(pmt),
    totalFees: round2(fees),
    cashReceived: round2(loanAmount - fees),
    apr: round2(apr),
  };
};

// --- 6. Startup Business Loan Affordability Calculator (business + personal) --------
export const startupBusinessLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const projectedCashFlow = Math.max(0, safeNumber(values.projectedCashFlow, 3000));
  const minDscr = Math.max(1, safeNumber(values.minDscr, 1.25));
  const personalIncome = Math.max(0, safeNumber(values.personalIncome, 7000));
  const personalDebts = Math.max(0, safeNumber(values.personalDebts, 1500));
  const maxDtiPercent = Math.min(100, Math.max(0, safeNumber(values.maxDtiPercent, 43)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 7)));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const byBusiness = presentValue(projectedCashFlow / minDscr, i, n);
  const personalRoom = Math.max(0, (personalIncome * maxDtiPercent) / 100 - personalDebts);
  const byPersonal = presentValue(personalRoom, i, n);

  return {
    maxPaymentByBusiness: round2(projectedCashFlow / minDscr),
    maxLoanByBusiness: round2(byBusiness),
    maxPaymentByPersonalDti: round2(personalRoom),
    maxLoanByPersonalDti: round2(byPersonal),
    conservativeMaxLoan: round2(Math.min(byBusiness, byPersonal)),
  };
};

// --- 7. Startup Business Loan Eligibility Calculator (incl. prequalification) -------
export const startupBusinessLoanEligibilityCalculator: CustomCalculator = (values) => {
  const projectCost = Math.max(0, safeNumber(values.projectCost, 150000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 120000));
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 690)));
  const collateralValue = Math.max(0, safeNumber(values.collateralValue, 70000));
  const experienceYears = Math.max(0, safeNumber(values.experienceYears, 3));

  const equity = Math.max(0, projectCost - loanAmount);
  const equityPercent = projectCost > 0 ? (equity / projectCost) * 100 : 0;
  const coverage = loanAmount > 0 ? (collateralValue / loanAmount) * 100 : 0;
  let passed = 0;
  if (creditScore >= 680) passed++;
  if (equityPercent >= 10) passed++;
  if (coverage >= 50) passed++;
  if (experienceYears >= 2) passed++;

  return {
    ownerCashInjection: round2(equity),
    cashInjectionPercent: round2(equityPercent),
    collateralCoveragePercent: round2(coverage),
    checksPassed: passed,
  };
};

// --- 8. Startup Business Loan Interest Calculator (after tax) -----------------------
export const startupBusinessLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 100000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 84)));
  const taxRatePercent = Math.min(70, Math.max(0, safeNumber(values.taxRatePercent, 25)));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const interest = pmt * termMonths - loanAmount;
  const k = Math.min(12, termMonths);
  const firstYear = pmt * k - (loanAmount - balanceAfter(loanAmount, i, pmt, k));

  return {
    interestFirstYear: round2(firstYear),
    totalInterest: round2(interest),
    taxSavings: round2((interest * taxRatePercent) / 100),
    afterTaxInterest: round2(interest * (1 - taxRatePercent / 100)),
  };
};

// --- 9. Startup Business Loan Comparison Calculator (bank vs online) ---------------
export const startupBusinessLoanComparisonCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 75000));
  const rateA = Math.max(0, safeNumber(values.rateAPercent, 11));
  const termA = Math.max(1, Math.round(safeNumber(values.termAMonths, 84)));
  const feeA = Math.max(0, safeNumber(values.feeAPercent, 3));
  const rateB = Math.max(0, safeNumber(values.rateBPercent, 28));
  const termB = Math.max(1, Math.round(safeNumber(values.termBMonths, 36)));
  const feeB = Math.max(0, safeNumber(values.feeBPercent, 4));

  const pA = payment(loanAmount, rateA / 100 / 12, termA);
  const pB = payment(loanAmount, rateB / 100 / 12, termB);
  const cA = pA * termA - loanAmount + (loanAmount * feeA) / 100;
  const cB = pB * termB - loanAmount + (loanAmount * feeB) / 100;

  return {
    paymentA: round2(pA),
    paymentB: round2(pB),
    totalCostA: round2(cA),
    totalCostB: round2(cB),
    savingsWithA: round2(cB - cA),
  };
};

// --- 10. Startup Business Loan Amortization Calculator ------------------------------
export const startupBusinessLoanAmortizationCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 100000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 7)));
  const yearNumber = Math.min(termYears, Math.max(1, Math.round(safeNumber(values.yearNumber, 2))));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termYears * 12);
  const start = balanceAfter(loanAmount, i, pmt, (yearNumber - 1) * 12);
  const end = balanceAfter(loanAmount, i, pmt, yearNumber * 12);

  return {
    monthlyPayment: round2(pmt),
    interestPaidInYear: round2(pmt * 12 - (start - end)),
    principalPaidInYear: round2(start - end),
    balanceAfterYear: round2(end),
    percentRepaid: round2(loanAmount > 0 ? ((loanAmount - end) / loanAmount) * 100 : 0),
  };
};

// --- 11. Startup Business Loan Total Cost Calculator ---------------------------------
export const startupBusinessLoanTotalCostCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 100000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 84)));
  const originationPercent = Math.max(0, safeNumber(values.originationPercent, 3));
  const guaranteeFeePercent = Math.max(0, safeNumber(values.guaranteeFeePercent, 2));
  const closingCosts = Math.max(0, safeNumber(values.closingCosts, 1500));

  const interest = payment(loanAmount, annualRatePercent / 100 / 12, termMonths) * termMonths - loanAmount;
  const origination = (loanAmount * originationPercent) / 100;
  const guarantee = (loanAmount * guaranteeFeePercent) / 100;
  const total = interest + origination + guarantee + closingCosts;

  return {
    totalInterest: round2(interest),
    originationFee: round2(origination),
    guaranteeFee: round2(guarantee),
    closingCosts: round2(closingCosts),
    totalCostOfBorrowing: round2(total),
    costPerDollarBorrowed: loanAmount > 0 ? Math.round((total / loanAmount) * 1000) / 1000 : 0,
  };
};

export const loanStartupBusinessCustomCalculators: Record<string, CustomCalculator> = {
  "startup-business-loan-calculator": startupBusinessLoanCalculator,
  "startup-business-loan-payment-calculator": startupBusinessLoanPaymentCalculator,
  "startup-business-loan-payoff-calculator": startupBusinessLoanPayoffCalculator,
  "startup-business-loan-refinance-calculator": startupBusinessLoanRefinanceCalculator,
  "startup-business-loan-apr-calculator": startupBusinessLoanAprCalculator,
  "startup-business-loan-affordability-calculator": startupBusinessLoanAffordabilityCalculator,
  "startup-business-loan-eligibility-calculator": startupBusinessLoanEligibilityCalculator,
  "startup-business-loan-interest-calculator": startupBusinessLoanInterestCalculator,
  "startup-business-loan-comparison-calculator": startupBusinessLoanComparisonCalculator,
  "startup-business-loan-amortization-calculator": startupBusinessLoanAmortizationCalculator,
  "startup-business-loan-total-cost-calculator": startupBusinessLoanTotalCostCalculator,
};
