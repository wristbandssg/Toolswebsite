/**
 * Batch: "Loan Calculators" expansion 3 (3 Oct 2026), sub-batch 11 of 11 —
 * Commercial Real Estate Loans (8 tools), filed under Mortgage Calculators
 * (a commercial real estate loan is a commercial mortgage). See
 * calc-engine-loan-sba.ts for the full batch context.
 *
 * Already built, so not repeated here: commercial-loan-calculator (amount
 * from LTV, payment, balloon, DSCR), commercial-property-loan-calculator
 * (max loan by LTV and DSCR — covers CRE affordability and eligibility) and
 * commercial-loan-dscr-calculator. Merged: Prequalification (=
 * eligibility), Consolidation (= refinance), Early Payoff (= payoff).
 *
 * Commercial mortgages usually amortize over 20-30 years but come due in
 * 5-10 (a balloon), may start interest-only, and carry prepayment
 * penalties — which is what these tools model:
 *  - creLoanPayment: interest-only period, then amortizing, and the balloon.
 *  - creLoanPayoff: step-down (5-4-3-2-1 or 3-2-1) or yield maintenance.
 *  - creLoanRefinance (incl. consolidation): new loan = lower of LTV and
 *    DSCR limits -> cash out after paying off the old loan and costs.
 *  - creLoanApr: points and closing costs over the term, with the balloon.
 *  - creLoanInterest: interest over the term vs principal repaid.
 *  - creLoanComparison: two term sheets (rate, amortization, points).
 *  - creLoanAmortization: any year's interest/principal, balance and LTV.
 *  - creLoanTotalCost: interest + points + third-party costs + exit fee.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-mortgage-commercial-real-estate-calculators.ts for the copy.
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

/** Loan terms shared by most tools: monthly rate, amortizing payment, months in the term, balloon. */
function termLoan(loan: number, ratePercent: number, amortYears: number, termYears: number) {
  const i = ratePercent / 100 / 12;
  const n = Math.min(amortYears, termYears) * 12;
  const pmt = payment(loan, i, amortYears * 12);
  return { i, n, pmt, balloon: balanceAfter(loan, i, pmt, n) };
}

// --- 1. Commercial Real Estate Loan Payment Calculator (IO then amortizing) ----------
export const creLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 2000000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.75));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const ioYears = Math.min(termYears, Math.max(0, Math.round(safeNumber(values.ioYears, 2))));
  const amortYears = Math.max(1, Math.round(safeNumber(values.amortYears, 25)));

  const i = annualRatePercent / 100 / 12;
  const io = loanAmount * i;
  const pmt = payment(loanAmount, i, amortYears * 12);
  const amortMonths = Math.min(amortYears * 12, (termYears - ioYears) * 12);
  const balloon = balanceAfter(loanAmount, i, pmt, amortMonths);

  return {
    interestOnlyPayment: round2(io),
    amortizingPayment: round2(pmt),
    annualDebtService: round2(pmt * 12),
    balloonAtMaturity: round2(balloon),
  };
};

// --- 2. Commercial Real Estate Loan Payoff Calculator (prepayment penalty) ----------
export const creLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 2000000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.75));
  const amortYears = Math.max(1, Math.round(safeNumber(values.amortYears, 25)));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const yearsPaid = Math.min(termYears, Math.max(0, Math.round(safeNumber(values.yearsPaid, 3))));
  const raw = Math.round(safeNumber(values.penaltyType, 1));
  const penaltyType = [0, 1, 2, 3].includes(raw) ? raw : 1;
  const treasuryRatePercent = Math.max(0, safeNumber(values.treasuryRatePercent, 4.25));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, amortYears * 12);
  const k = yearsPaid * 12;
  const balance = balanceAfter(loanAmount, i, pmt, k);
  const year = yearsPaid + 1;
  let penalty = 0;
  if (penaltyType === 1) penalty = (balance * Math.max(0, 6 - year)) / 100;
  if (penaltyType === 2) penalty = (balance * Math.max(0, 4 - year)) / 100;
  if (penaltyType === 3) {
    const months = Math.max(0, termYears * 12 - k);
    const spread = Math.max(0, annualRatePercent - treasuryRatePercent) / 100 / 12;
    penalty = presentValue(balance * spread, treasuryRatePercent / 100 / 12, months);
  }

  return {
    currentBalance: round2(balance),
    prepaymentPenaltyPercent: round2(balance > 0 ? (penalty / balance) * 100 : 0),
    prepaymentPenalty: round2(penalty),
    totalPayoff: round2(balance + penalty),
  };
};

// --- 3. Commercial Real Estate Loan Refinance Calculator (incl. consolidation) -----
export const creLoanRefinanceCalculator: CustomCalculator = (values) => {
  const propertyValue = Math.max(0, safeNumber(values.propertyValue, 3500000));
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 1600000));
  const noi = Math.max(0, safeNumber(values.noi, 260000));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 6.5));
  const amortYears = Math.max(1, Math.round(safeNumber(values.amortYears, 25)));
  const maxLtvPercent = Math.min(100, Math.max(0, safeNumber(values.maxLtvPercent, 75)));
  const minDscr = Math.max(1, safeNumber(values.minDscr, 1.25));
  const closingCostsPercent = Math.max(0, safeNumber(values.closingCostsPercent, 1.5));

  const i = newRatePercent / 100 / 12;
  const n = amortYears * 12;
  const byLtv = (propertyValue * maxLtvPercent) / 100;
  const byDscr = presentValue(noi / minDscr / 12, i, n);
  const loan = Math.min(byLtv, byDscr);
  const costs = (loan * closingCostsPercent) / 100;
  const pmt = payment(loan, i, n);

  return {
    maxLoanByLtv: round2(byLtv),
    maxLoanByDscr: round2(byDscr),
    newLoanAmount: round2(loan),
    cashOut: round2(loan - currentBalance - costs),
    newMonthlyPayment: round2(pmt),
    newDscr: round2(pmt > 0 ? noi / (pmt * 12) : 0),
  };
};

// --- 4. Commercial Real Estate Loan APR Calculator ------------------------------------
export const creLoanAprCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 2000000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.75));
  const amortYears = Math.max(1, Math.round(safeNumber(values.amortYears, 25)));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const pointsPercent = Math.max(0, safeNumber(values.pointsPercent, 1));
  const otherClosingCosts = Math.max(0, safeNumber(values.otherClosingCosts, 15000));

  const t = termLoan(loanAmount, annualRatePercent, amortYears, termYears);
  const upfront = (loanAmount * pointsPercent) / 100 + otherClosingCosts;
  const net = loanAmount - upfront;
  const value = (r: number) => presentValue(t.pmt, r, t.n) + t.balloon / Math.pow(1 + r, t.n);
  let apr = 0;
  if (net > 0 && t.pmt > 0) {
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 200; k++) {
      const mid = (lo + hi) / 2;
      if (value(mid) > net) lo = mid;
      else hi = mid;
    }
    apr = ((lo + hi) / 2) * 12 * 100;
  }

  return {
    monthlyPayment: round2(t.pmt),
    balloonAtMaturity: round2(t.balloon),
    upfrontCosts: round2(upfront),
    apr: round2(apr),
  };
};

// --- 5. Commercial Real Estate Loan Interest Calculator -------------------------------
export const creLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 2000000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.75));
  const amortYears = Math.max(1, Math.round(safeNumber(values.amortYears, 25)));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));

  const t = termLoan(loanAmount, annualRatePercent, amortYears, termYears);
  const principal = loanAmount - t.balloon;
  const k = Math.min(12, t.n);
  const firstYear = t.pmt * k - (loanAmount - balanceAfter(loanAmount, t.i, t.pmt, k));

  return {
    interestFirstYear: round2(firstYear),
    totalInterestOverTerm: round2(t.pmt * t.n - principal),
    principalRepaidOverTerm: round2(principal),
    balloonAtMaturity: round2(t.balloon),
  };
};

// --- 6. Commercial Real Estate Loan Comparison Calculator (two term sheets) --------
export const creLoanComparisonCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 2000000));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const rateA = Math.max(0, safeNumber(values.rateAPercent, 6.5));
  const amortA = Math.max(1, Math.round(safeNumber(values.amortAYears, 25)));
  const pointsA = Math.max(0, safeNumber(values.pointsAPercent, 0.5));
  const rateB = Math.max(0, safeNumber(values.rateBPercent, 6.1));
  const amortB = Math.max(1, Math.round(safeNumber(values.amortBYears, 30)));
  const pointsB = Math.max(0, safeNumber(values.pointsBPercent, 1.5));

  const a = termLoan(loanAmount, rateA, amortA, termYears);
  const b = termLoan(loanAmount, rateB, amortB, termYears);
  const costA = a.pmt * a.n - (loanAmount - a.balloon) + (loanAmount * pointsA) / 100;
  const costB = b.pmt * b.n - (loanAmount - b.balloon) + (loanAmount * pointsB) / 100;

  return {
    paymentA: round2(a.pmt),
    paymentB: round2(b.pmt),
    balloonA: round2(a.balloon),
    balloonB: round2(b.balloon),
    costA: round2(costA),
    costB: round2(costB),
    savingsWithB: round2(costA - costB),
  };
};

// --- 7. Commercial Real Estate Loan Amortization Calculator ---------------------------
export const creLoanAmortizationCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 2000000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.75));
  const amortYears = Math.max(1, Math.round(safeNumber(values.amortYears, 25)));
  const yearNumber = Math.min(amortYears, Math.max(1, Math.round(safeNumber(values.yearNumber, 5))));
  const propertyValue = Math.max(0, safeNumber(values.propertyValue, 2800000));
  const appreciationPercent = safeNumber(values.appreciationPercent, 2);

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, amortYears * 12);
  const start = balanceAfter(loanAmount, i, pmt, (yearNumber - 1) * 12);
  const end = balanceAfter(loanAmount, i, pmt, yearNumber * 12);
  const value = propertyValue * Math.pow(1 + appreciationPercent / 100, yearNumber);

  return {
    interestPaidInYear: round2(pmt * 12 - (start - end)),
    principalPaidInYear: round2(start - end),
    balanceAtYearEnd: round2(end),
    propertyValueAtYearEnd: round2(value),
    ltvAtYearEnd: round2(value > 0 ? (end / value) * 100 : 0),
  };
};

// --- 8. Commercial Real Estate Loan Total Cost Calculator -----------------------------
export const creLoanTotalCostCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 2000000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.75));
  const amortYears = Math.max(1, Math.round(safeNumber(values.amortYears, 25)));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const pointsPercent = Math.max(0, safeNumber(values.pointsPercent, 1));
  const thirdPartyCosts = Math.max(0, safeNumber(values.thirdPartyCosts, 25000));
  const exitFeePercent = Math.max(0, safeNumber(values.exitFeePercent, 0));

  const t = termLoan(loanAmount, annualRatePercent, amortYears, termYears);
  const interest = t.pmt * t.n - (loanAmount - t.balloon);
  const points = (loanAmount * pointsPercent) / 100;
  const exit = (t.balloon * exitFeePercent) / 100;
  const total = interest + points + thirdPartyCosts + exit;

  return {
    interestOverTerm: round2(interest),
    originationPoints: round2(points),
    thirdPartyCosts: round2(thirdPartyCosts),
    exitFee: round2(exit),
    totalCostOfBorrowing: round2(total),
    costPerYear: round2(total / (t.n / 12)),
  };
};

export const mortgageCommercialRealEstateCustomCalculators: Record<string, CustomCalculator> = {
  "commercial-real-estate-loan-payment-calculator": creLoanPaymentCalculator,
  "commercial-real-estate-loan-payoff-calculator": creLoanPayoffCalculator,
  "commercial-real-estate-loan-refinance-calculator": creLoanRefinanceCalculator,
  "commercial-real-estate-loan-apr-calculator": creLoanAprCalculator,
  "commercial-real-estate-loan-interest-calculator": creLoanInterestCalculator,
  "commercial-real-estate-loan-comparison-calculator": creLoanComparisonCalculator,
  "commercial-real-estate-loan-amortization-calculator": creLoanAmortizationCalculator,
  "commercial-real-estate-loan-total-cost-calculator": creLoanTotalCostCalculator,
};
