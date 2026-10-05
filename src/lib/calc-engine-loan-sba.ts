/**
 * Batch: "Loan Calculators" expansion 3 (3 Oct 2026), sub-batch 1 of 11 —
 * SBA Loans (11 tools), filed under Loan Calculators > General Loan
 * Calculators (next to the business-loan-* tools). The user's 106-keyword
 * list was checked against every existing slug: 3 were already built
 * (Commercial Real Estate Loan Calculator = commercial-loan-calculator;
 * CRE Loan Affordability and Eligibility = commercial-property-loan-
 * calculator, which sizes the loan by LTV and DSCR) and 14 were merged as
 * the same calculator purpose: SBA Loan Prequalification -> Eligibility,
 * Consolidation -> Refinance, Early Payoff -> Payoff; SBA 7(a) Payment,
 * Payoff, Interest, Affordability, Comparison and Eligibility -> the SBA
 * Loan tools (7(a) is the standard SBA loan); CRE Loan Prequalification,
 * Consolidation and Early Payoff; Merchant Cash Advance Payment ->
 * Calculator; Trailer Loan Cost -> Calculator. 89 tools were built across
 * 11 sub-batches:
 *  - calc-engine-loan-sba.ts (this file)            -> General Loan Calculators
 *  - calc-engine-loan-sba-programs.ts (7(a) + 504)    -> General Loan Calculators
 *  - calc-engine-loan-microloan.ts                    -> General Loan Calculators
 *  - calc-engine-loan-peer-to-peer.ts                 -> Personal Loan Calculators
 *  - calc-engine-loan-franchise.ts                    -> General Loan Calculators
 *  - calc-engine-loan-inventory-financing.ts          -> General Loan Calculators
 *  - calc-engine-loan-invoice-mca.ts                  -> General Loan Calculators
 *  - calc-engine-loan-agricultural.ts                 -> General Loan Calculators
 *  - calc-engine-loan-fleet.ts                        -> Auto & Vehicle Loan Calculators
 *  - calc-engine-loan-truck-trailer.ts                -> Auto & Vehicle Loan Calculators
 *  - calc-engine-mortgage-commercial-real-estate.ts   -> Mortgage Calculators
 *
 * SBA rules used here (FY2026 7(a) fee notice, SOP 50 10):
 *  - guaranteed share: 85% for loans of $150,000 or less, 75% above that,
 *    50% for SBA Express; microloans carry no SBA guaranty fee.
 *  - upfront guaranty fee on the GUARANTEED portion (maturity over 12
 *    months): 2% up to $150,000; 3% for $150,001-$700,000; above $700,000,
 *    3.5% of the guaranteed portion up to $1,000,000 plus 3.75% above it.
 *    SBA resets the schedule every October, so the copy says to check it.
 *  - maximum variable-rate spread over prime: 6.5% (<= $50,000), 6.0%
 *    ($50,001-$250,000), 4.5% ($250,001-$350,000), 3.0% (above $350,000).
 *  - prepayment fee on loans with a maturity of 15 years or more, when 25%+
 *    of the balance is prepaid in the first three years: 5% / 3% / 1%.
 *  - the guaranteed portion is capped at $3,750,000.
 *  - minimum debt service coverage for 7(a): 1.15 (lenders often want 1.25).
 *
 * What each tool models beyond the plain payment formula:
 *  - sbaLoan: program choice (7(a) / Express / Microloan), program maximum,
 *    guaranteed portion and the upfront guaranty fee.
 *  - sbaLoanPayment: prime + lender spread capped at SBA's maximum, term by
 *    use of proceeds, and the payment if prime rises 2 points.
 *  - sbaLoanPayoff (incl. early payoff): balance plus SBA's prepayment fee.
 *  - sbaLoanRefinance (incl. consolidation): replacing existing business
 *    debt with a longer SBA loan — cash flow freed vs extra total cost.
 *  - sbaLoanApr: the guaranty fee financed and closing fees -> APR.
 *  - sbaLoanAffordability: cash flow / DSCR -> maximum SBA loan.
 *  - sbaLoanEligibility (incl. prequalification): five standard checks.
 *  - sbaLoanInterest: variable-rate interest if prime moves.
 *  - sbaLoanComparison: SBA loan vs a shorter conventional loan.
 *  - sbaLoanAmortization: one year of the schedule and the balance after it.
 *  - sbaLoanTotalCost: interest + guaranty fee (and interest on it if
 *    financed) + closing costs.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-sba-calculators.ts for the copy.
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

/** Share of the loan SBA guarantees. program: 1 = 7(a), 2 = Express, 3 = Microloan. */
function guaranteedShare(amount: number, program: number): number {
  if (program === 3) return 0;
  if (program === 2) return 0.5;
  return amount <= 150000 ? 0.85 : 0.75;
}

/** Guaranteed dollars — SBA's maximum 7(a) guaranty is $3,750,000. */
function guaranteedAmount(amount: number, program: number): number {
  return Math.min(amount * guaranteedShare(amount, program), 3750000);
}

/** FY2026 upfront guaranty fee (maturity over 12 months), charged on the guaranteed portion. */
function upfrontGuarantyFee(amount: number, guaranteed: number): number {
  if (guaranteed <= 0) return 0;
  if (amount <= 150000) return guaranteed * 0.02;
  if (amount <= 700000) return guaranteed * 0.03;
  return Math.min(guaranteed, 1000000) * 0.035 + Math.max(0, guaranteed - 1000000) * 0.0375;
}

function maxSpreadOverPrime(amount: number): number {
  if (amount <= 50000) return 6.5;
  if (amount <= 250000) return 6;
  if (amount <= 350000) return 4.5;
  return 3;
}

// --- 1. SBA Loan Calculator ---------------------------------------------------
export const sbaLoanCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 500000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const raw = Math.round(safeNumber(values.program, 1));
  const program = [1, 2, 3].includes(raw) ? raw : 1;

  const programMaximum = program === 1 ? 5000000 : program === 2 ? 500000 : 50000;
  const guaranteed = guaranteedAmount(loanAmount, program);
  const fee = upfrontGuarantyFee(loanAmount, guaranteed);
  const n = termYears * 12;
  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, n);
  const interest = pmt * n - loanAmount;

  return {
    programMaximum,
    amountOverProgramMaximum: round2(Math.max(0, loanAmount - programMaximum)),
    guaranteedAmount: round2(guaranteed),
    guarantyFee: round2(fee),
    monthlyPayment: round2(pmt),
    totalInterest: round2(interest),
    totalCost: round2(interest + fee),
  };
};

// --- 2. SBA Loan Payment Calculator (prime + capped spread, term by use) ------
export const sbaLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 300000));
  const primeRatePercent = Math.max(0, safeNumber(values.primeRatePercent, 7));
  const lenderSpreadPercent = Math.max(0, safeNumber(values.lenderSpreadPercent, 2.75));
  const raw = Math.round(safeNumber(values.useOfProceeds, 1));
  const use = [1, 2, 3].includes(raw) ? raw : 1;

  const maxSpread = maxSpreadOverPrime(loanAmount);
  const rate = primeRatePercent + Math.min(lenderSpreadPercent, maxSpread);
  const termYears = use === 3 ? 25 : 10;
  const n = termYears * 12;
  const pmt = payment(loanAmount, rate / 100 / 12, n);
  const pmtUp = payment(loanAmount, (rate + 2) / 100 / 12, n);

  return {
    maxSpreadAllowed: maxSpread,
    interestRateUsed: round2(rate),
    termYears,
    monthlyPayment: round2(pmt),
    paymentIfPrimeRises2: round2(pmtUp),
    totalInterest: round2(pmt * n - loanAmount),
  };
};

// --- 3. SBA Loan Payoff Calculator (incl. early payoff + prepayment fee) ------
export const sbaLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 1000000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 25)));
  const n = termYears * 12;
  const monthsPaid = Math.min(n, Math.max(0, Math.round(safeNumber(values.monthsPaid, 20))));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, n);
  const balance = balanceAfter(loanAmount, i, pmt, monthsPaid);
  const year = Math.floor(monthsPaid / 12) + 1;
  const feePercent = termYears >= 15 && balance > 0 ? (year === 1 ? 5 : year === 2 ? 3 : year === 3 ? 1 : 0) : 0;
  const fee = (balance * feePercent) / 100;
  const avoided = Math.max(0, pmt * (n - monthsPaid) - balance);

  return {
    currentBalance: round2(balance),
    prepaymentFeePercent: feePercent,
    prepaymentFee: round2(fee),
    totalPayoff: round2(balance + fee),
    interestAvoided: round2(avoided),
    netSavings: round2(avoided - fee),
  };
};

// --- 4. SBA Loan Refinance Calculator (incl. debt consolidation) --------------
export const sbaLoanRefinanceCalculator: CustomCalculator = (values) => {
  const existingBalance = Math.max(0, safeNumber(values.existingBalance, 250000));
  const existingMonthlyPayment = Math.max(0, safeNumber(values.existingMonthlyPayment, 7500));
  const remainingMonths = Math.max(0, Math.round(safeNumber(values.remainingMonths, 40)));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 10.5));
  const newTermYears = Math.max(1, Math.round(safeNumber(values.newTermYears, 10)));
  const closingCostsPercent = Math.max(0, safeNumber(values.closingCostsPercent, 3));

  const newLoan = existingBalance * (1 + closingCostsPercent / 100);
  const n = newTermYears * 12;
  const pmt = payment(newLoan, newRatePercent / 100 / 12, n);
  const oldCost = existingMonthlyPayment * remainingMonths;
  const newCost = pmt * n;

  return {
    newLoanAmount: round2(newLoan),
    newMonthlyPayment: round2(pmt),
    monthlyCashFlowFreed: round2(existingMonthlyPayment - pmt),
    remainingPaymentsCurrent: round2(oldCost),
    totalPaymentsNew: round2(newCost),
    extraTotalCost: round2(newCost - oldCost),
  };
};

// --- 5. SBA Loan APR Calculator ------------------------------------------------
export const sbaLoanAprCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 350000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10.75));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const closingFees = Math.max(0, safeNumber(values.closingFees, 5000));

  const fee = upfrontGuarantyFee(loanAmount, guaranteedAmount(loanAmount, 1));
  const financed = loanAmount + fee;
  const n = termYears * 12;
  const pmt = payment(financed, annualRatePercent / 100 / 12, n);
  const netProceeds = Math.max(0, loanAmount - closingFees);
  const apr = solveMonthlyRate(netProceeds, pmt, n) * 12 * 100;

  return {
    guarantyFee: round2(fee),
    amountFinanced: round2(financed),
    monthlyPayment: round2(pmt),
    apr: round2(apr),
    aprAboveNoteRate: round2(Math.max(0, apr - annualRatePercent)),
  };
};

// --- 6. SBA Loan Affordability Calculator --------------------------------------
export const sbaLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const annualCashFlow = Math.max(0, safeNumber(values.annualCashFlow, 180000));
  const existingAnnualDebtService = Math.max(0, safeNumber(values.existingAnnualDebtService, 30000));
  const minDscr = Math.max(1, safeNumber(values.minDscr, 1.25));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const maxDs = Math.max(0, annualCashFlow / minDscr - existingAnnualDebtService);
  const maxDsSba = Math.max(0, annualCashFlow / 1.15 - existingAnnualDebtService);

  return {
    maxAnnualDebtService: round2(maxDs),
    maxMonthlyPayment: round2(maxDs / 12),
    maxLoanAmount: round2(presentValue(maxDs / 12, i, n)),
    maxLoanAtSbaMinimum: round2(presentValue(maxDsSba / 12, i, n)),
  };
};

// --- 7. SBA Loan Eligibility Calculator (incl. prequalification) ---------------
export const sbaLoanEligibilityCalculator: CustomCalculator = (values) => {
  const annualCashFlow = Math.max(0, safeNumber(values.annualCashFlow, 150000));
  const existingAnnualDebtService = Math.max(0, safeNumber(values.existingAnnualDebtService, 20000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 400000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 690)));
  const yearsInBusiness = Math.max(0, safeNumber(values.yearsInBusiness, 3));
  const equityInjectionPercent = Math.max(0, safeNumber(values.equityInjectionPercent, 10));
  const forProfit = Math.round(safeNumber(values.forProfit, 1)) === 1;

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const newAnnual = payment(loanAmount, i, n) * 12;
  const totalDs = existingAnnualDebtService + newAnnual;
  const dscr = totalDs > 0 ? annualCashFlow / totalDs : 0;
  const maxLoan = presentValue(Math.max(0, annualCashFlow / 1.15 - existingAnnualDebtService) / 12, i, n);

  let passed = 0;
  if (dscr >= 1.15) passed++;
  if (creditScore >= 650) passed++;
  if (yearsInBusiness >= 2 || equityInjectionPercent >= 10) passed++;
  if (forProfit) passed++;
  if (loanAmount <= 5000000) passed++;

  return {
    newAnnualPayment: round2(newAnnual),
    dscr: round2(dscr),
    maxLoanAtMinimumDscr: round2(maxLoan),
    checksPassed: passed,
  };
};

// --- 8. SBA Loan Interest Calculator (variable rate, prime moves) --------------
export const sbaLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 500000));
  const primeRatePercent = Math.max(0, safeNumber(values.primeRatePercent, 7));
  const spreadPercent = Math.max(0, safeNumber(values.spreadPercent, 2.75));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const primeChangePercent = safeNumber(values.primeChangePercent, 1);
  const n = termYears * 12;
  const changeMonth = Math.min(n, Math.max(0, Math.round(safeNumber(values.changeAfterYears, 2) * 12)));

  const r1 = (primeRatePercent + spreadPercent) / 100 / 12;
  const r2 = Math.max(0, primeRatePercent + primeChangePercent + spreadPercent) / 100 / 12;
  const pmt1 = payment(loanAmount, r1, n);
  const flatInterest = pmt1 * n - loanAmount;
  const bal = balanceAfter(loanAmount, r1, pmt1, changeMonth);
  const pmt2 = payment(bal, r2, n - changeMonth);
  const changedInterest = pmt1 * changeMonth + pmt2 * (n - changeMonth) - loanAmount;
  const firstYear = pmt1 * Math.min(12, n) - (loanAmount - balanceAfter(loanAmount, r1, pmt1, Math.min(12, n)));

  return {
    startingRate: round2(primeRatePercent + spreadPercent),
    interestFirstYear: round2(firstYear),
    paymentAfterChange: round2(pmt2),
    totalInterestIfUnchanged: round2(flatInterest),
    totalInterestWithChange: round2(changedInterest),
    interestDifference: round2(changedInterest - flatInterest),
  };
};

// --- 9. SBA Loan Comparison Calculator (SBA vs conventional) ------------------
export const sbaLoanComparisonCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 400000));
  const sbaRatePercent = Math.max(0, safeNumber(values.sbaRatePercent, 10.5));
  const sbaTermYears = Math.max(1, Math.round(safeNumber(values.sbaTermYears, 10)));
  const otherRatePercent = Math.max(0, safeNumber(values.otherRatePercent, 9));
  const otherTermYears = Math.max(1, Math.round(safeNumber(values.otherTermYears, 5)));
  const otherFeePercent = Math.max(0, safeNumber(values.otherFeePercent, 1));

  const sbaFee = upfrontGuarantyFee(loanAmount, guaranteedAmount(loanAmount, 1));
  const sbaPmt = payment(loanAmount, sbaRatePercent / 100 / 12, sbaTermYears * 12);
  const otherPmt = payment(loanAmount, otherRatePercent / 100 / 12, otherTermYears * 12);
  const sbaCost = sbaPmt * sbaTermYears * 12 - loanAmount + sbaFee;
  const otherCost = otherPmt * otherTermYears * 12 - loanAmount + (loanAmount * otherFeePercent) / 100;

  return {
    sbaMonthlyPayment: round2(sbaPmt),
    otherMonthlyPayment: round2(otherPmt),
    monthlyCashFlowAdvantage: round2(otherPmt - sbaPmt),
    sbaTotalCost: round2(sbaCost),
    otherTotalCost: round2(otherCost),
    totalCostDifference: round2(sbaCost - otherCost),
  };
};

// --- 10. SBA Loan Amortization Calculator --------------------------------------
export const sbaLoanAmortizationCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 750000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 25)));
  const yearNumber = Math.min(termYears, Math.max(1, Math.round(safeNumber(values.yearNumber, 5))));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const pmt = payment(loanAmount, i, n);
  const start = balanceAfter(loanAmount, i, pmt, (yearNumber - 1) * 12);
  const end = balanceAfter(loanAmount, i, pmt, yearNumber * 12);
  const principal = start - end;

  return {
    monthlyPayment: round2(pmt),
    interestPaidInYear: round2(pmt * 12 - principal),
    principalPaidInYear: round2(principal),
    balanceAfterYear: round2(end),
    percentRepaid: round2(loanAmount > 0 ? ((loanAmount - end) / loanAmount) * 100 : 0),
    totalInterest: round2(pmt * n - loanAmount),
  };
};

// --- 11. SBA Loan Total Cost Calculator ---------------------------------------
export const sbaLoanTotalCostCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 500000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const closingCosts = Math.max(0, safeNumber(values.closingCosts, 6000));
  const financeFee = Math.round(safeNumber(values.financeFee, 1)) === 1;

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const fee = upfrontGuarantyFee(loanAmount, guaranteedAmount(loanAmount, 1));
  const loanInterest = payment(loanAmount, i, n) * n - loanAmount;
  const feeInterest = financeFee ? payment(fee, i, n) * n - fee : 0;
  const total = loanInterest + fee + feeInterest + closingCosts;

  return {
    guarantyFee: round2(fee),
    interestOnLoan: round2(loanInterest),
    interestOnFinancedFee: round2(feeInterest),
    closingCosts: round2(closingCosts),
    totalCostOfBorrowing: round2(total),
    costPerDollarBorrowed: loanAmount > 0 ? Math.round((total / loanAmount) * 1000) / 1000 : 0,
  };
};

export const loanSbaCustomCalculators: Record<string, CustomCalculator> = {
  "sba-loan-calculator": sbaLoanCalculator,
  "sba-loan-payment-calculator": sbaLoanPaymentCalculator,
  "sba-loan-payoff-calculator": sbaLoanPayoffCalculator,
  "sba-loan-refinance-calculator": sbaLoanRefinanceCalculator,
  "sba-loan-apr-calculator": sbaLoanAprCalculator,
  "sba-loan-affordability-calculator": sbaLoanAffordabilityCalculator,
  "sba-loan-eligibility-calculator": sbaLoanEligibilityCalculator,
  "sba-loan-interest-calculator": sbaLoanInterestCalculator,
  "sba-loan-comparison-calculator": sbaLoanComparisonCalculator,
  "sba-loan-amortization-calculator": sbaLoanAmortizationCalculator,
  "sba-loan-total-cost-calculator": sbaLoanTotalCostCalculator,
};
