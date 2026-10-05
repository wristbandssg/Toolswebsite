/**
 * Batch: "Loan Calculators" expansion 3 (3 Oct 2026), sub-batch 2 of 11 —
 * SBA 7(a) and SBA 504 Loans (8 tools), filed under Loan Calculators >
 * General Loan Calculators. See calc-engine-loan-sba.ts for the full batch
 * context. The general SBA tools (payment, payoff, interest, affordability,
 * comparison, eligibility) already cover 7(a) — the standard SBA loan — so
 * only the main SBA 7(a) Loan Calculator is built here, with a feature the
 * general one lacks. SBA 504 gets its own full set because its structure is
 * different: a bank first lien (about 50%), a fixed-rate CDC/SBA debenture
 * (about 40%) and the borrower's down payment (10%-20%).
 *
 *  - sba7aLoan: a project mixing real estate, equipment and working capital
 *    -> equity injection, loan amount and SBA's weighted-average maturity
 *    (25 years for real estate, 10 for the rest), guaranty fee and payment.
 *  - sba504Loan: project cost -> down payment (10% / 15% / 20%), bank loan,
 *    CDC loan with its financed debenture fees, and both payments.
 *  - sba504LoanPayment: the two payments from loan amounts, with the CDC
 *    loan's ongoing annual fees, and the blended rate.
 *  - sba504LoanPayoff: the debenture prepayment premium, which starts at the
 *    debenture rate and falls 10% a year over the first 10 years (20% a
 *    year over 5 years for a 10-year debenture).
 *  - sba504LoanInterest: interest on both pieces when the bank loan
 *    balloons before the debenture is repaid.
 *  - sba504LoanAffordability: the largest project the business's cash flow
 *    AND the cash for the down payment support.
 *  - sba504LoanComparison: 504 vs a 7(a) loan for the same property.
 *  - sba504LoanEligibility: the alternative size standard (tangible net
 *    worth <= $20M, average net income <= $6.5M), owner-occupancy (51%, or
 *    60% for new construction) and the job-creation ratio ($90,000 of
 *    debenture per job by default).
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-sba-programs-calculators.ts for the copy.
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

function balanceAfter(principal: number, i: number, pmt: number, k: number): number {
  if (i === 0) return Math.max(0, principal - pmt * k);
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (pmt * (g - 1)) / i);
}

/** FY2026 SBA 7(a) upfront guaranty fee (maturity over 12 months). */
function sba7aGuarantyFee(amount: number): number {
  const guaranteed = Math.min(amount * (amount <= 150000 ? 0.85 : 0.75), 3750000);
  if (guaranteed <= 0) return 0;
  if (amount <= 150000) return guaranteed * 0.02;
  if (amount <= 700000) return guaranteed * 0.03;
  return Math.min(guaranteed, 1000000) * 0.035 + Math.max(0, guaranteed - 1000000) * 0.0375;
}

function pickOption(raw: number, allowed: number[], fallback: number): number {
  const v = Math.round(raw);
  return allowed.includes(v) ? v : fallback;
}

// --- 1. SBA 7(a) Loan Calculator (mixed project, weighted maturity) -----------
export const sba7aLoanCalculator: CustomCalculator = (values) => {
  const realEstate = Math.max(0, safeNumber(values.realEstateAmount, 600000));
  const equipment = Math.max(0, safeNumber(values.equipmentAmount, 150000));
  const workingCapital = Math.max(0, safeNumber(values.workingCapitalAmount, 100000));
  const equityInjectionPercent = Math.min(100, Math.max(0, safeNumber(values.equityInjectionPercent, 10)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10.25));

  const project = realEstate + equipment + workingCapital;
  const equity = (project * equityInjectionPercent) / 100;
  const loan = project - equity;
  const blended = project > 0 ? (realEstate * 25 + (equipment + workingCapital) * 10) / project : 10;
  const n = Math.max(12, Math.round(blended * 12));
  const pmt = payment(loan, annualRatePercent / 100 / 12, n);

  return {
    totalProjectCost: round2(project),
    equityInjection: round2(equity),
    loanAmount: round2(loan),
    blendedTermYears: round2(n / 12),
    guarantyFee: round2(sba7aGuarantyFee(loan)),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * n - loan),
  };
};

// --- 2. SBA 504 Loan Calculator -----------------------------------------------
export const sba504LoanCalculator: CustomCalculator = (values) => {
  const projectCost = Math.max(0, safeNumber(values.projectCost, 2000000));
  const borrowerPercent = pickOption(safeNumber(values.borrowerPercent, 10), [10, 15, 20], 10);
  const bankRatePercent = Math.max(0, safeNumber(values.bankRatePercent, 7.5));
  const bankAmortYears = Math.max(1, Math.round(safeNumber(values.bankAmortYears, 25)));
  const cdcRatePercent = Math.max(0, safeNumber(values.cdcRatePercent, 6.25));
  const cdcTermYears = pickOption(safeNumber(values.cdcTermYears, 25), [10, 20, 25], 25);
  const debentureFeesPercent = Math.max(0, safeNumber(values.debentureFeesPercent, 2.5));

  const down = (projectCost * borrowerPercent) / 100;
  const bank = projectCost * 0.5;
  const cdcBase = projectCost - down - bank;
  const cdc = cdcBase * (1 + debentureFeesPercent / 100);
  const bankPmt = payment(bank, bankRatePercent / 100 / 12, bankAmortYears * 12);
  const cdcPmt = payment(cdc, cdcRatePercent / 100 / 12, cdcTermYears * 12);

  return {
    downPayment: round2(down),
    bankLoan: round2(bank),
    cdcLoan: round2(cdc),
    bankMonthlyPayment: round2(bankPmt),
    cdcMonthlyPayment: round2(cdcPmt),
    totalMonthlyPayment: round2(bankPmt + cdcPmt),
  };
};

// --- 3. SBA 504 Loan Payment Calculator (ongoing fees, blended rate) ----------
export const sba504LoanPaymentCalculator: CustomCalculator = (values) => {
  const bankLoan = Math.max(0, safeNumber(values.bankLoan, 1000000));
  const bankRatePercent = Math.max(0, safeNumber(values.bankRatePercent, 7.5));
  const bankAmortYears = Math.max(1, Math.round(safeNumber(values.bankAmortYears, 25)));
  const cdcLoan = Math.max(0, safeNumber(values.cdcLoan, 800000));
  const cdcRatePercent = Math.max(0, safeNumber(values.cdcRatePercent, 5.5));
  const ongoingFeePercent = Math.max(0, safeNumber(values.ongoingFeePercent, 0.9));
  const cdcTermYears = pickOption(safeNumber(values.cdcTermYears, 25), [10, 20, 25], 25);

  const bankPmt = payment(bankLoan, bankRatePercent / 100 / 12, bankAmortYears * 12);
  const n = cdcTermYears * 12;
  const cdcBase = payment(cdcLoan, cdcRatePercent / 100 / 12, n);
  const cdcAll = payment(cdcLoan, (cdcRatePercent + ongoingFeePercent) / 100 / 12, n);
  const total = bankLoan + cdcLoan;
  const blended = total > 0 ? (bankLoan * bankRatePercent + cdcLoan * (cdcRatePercent + ongoingFeePercent)) / total : 0;

  return {
    bankMonthlyPayment: round2(bankPmt),
    cdcPaymentBeforeFees: round2(cdcBase),
    cdcPaymentWithFees: round2(cdcAll),
    totalMonthlyPayment: round2(bankPmt + cdcAll),
    blendedRate: round2(blended),
  };
};

// --- 4. SBA 504 Loan Payoff Calculator (debenture prepayment premium) ---------
export const sba504LoanPayoffCalculator: CustomCalculator = (values) => {
  const debentureAmount = Math.max(0, safeNumber(values.debentureAmount, 800000));
  const debentureRatePercent = Math.max(0, safeNumber(values.debentureRatePercent, 6));
  const termYears = pickOption(safeNumber(values.termYears, 25), [10, 20, 25], 25);
  const n = termYears * 12;
  const monthsPaid = Math.min(n, Math.max(0, Math.round(safeNumber(values.monthsPaid, 48))));

  const i = debentureRatePercent / 100 / 12;
  const pmt = payment(debentureAmount, i, n);
  const balance = balanceAfter(debentureAmount, i, pmt, monthsPaid);
  const year = Math.floor(monthsPaid / 12) + 1;
  const premiumYears = termYears === 10 ? 5 : 10;
  const premiumPercent =
    year <= premiumYears && balance > 0 ? debentureRatePercent * (1 - (year - 1) / premiumYears) : 0;
  const premium = (balance * premiumPercent) / 100;
  const avoided = Math.max(0, pmt * (n - monthsPaid) - balance);

  return {
    currentBalance: round2(balance),
    prepaymentPremiumPercent: round2(premiumPercent),
    prepaymentPremium: round2(premium),
    totalPayoff: round2(balance + premium),
    interestAvoided: round2(avoided),
    netSavings: round2(avoided - premium),
  };
};

// --- 5. SBA 504 Loan Interest Calculator (bank balloon + debenture) -----------
export const sba504LoanInterestCalculator: CustomCalculator = (values) => {
  const bankLoan = Math.max(0, safeNumber(values.bankLoan, 1000000));
  const bankRatePercent = Math.max(0, safeNumber(values.bankRatePercent, 7.5));
  const bankAmortYears = Math.max(1, Math.round(safeNumber(values.bankAmortYears, 25)));
  const bankTermYears = Math.min(bankAmortYears, Math.max(1, Math.round(safeNumber(values.bankTermYears, 10))));
  const cdcLoan = Math.max(0, safeNumber(values.cdcLoan, 820000));
  const cdcRatePercent = Math.max(0, safeNumber(values.cdcRatePercent, 6.25));
  const cdcTermYears = pickOption(safeNumber(values.cdcTermYears, 25), [10, 20, 25], 25);

  const ib = bankRatePercent / 100 / 12;
  const ic = cdcRatePercent / 100 / 12;
  const bankPmt = payment(bankLoan, ib, bankAmortYears * 12);
  const kb = bankTermYears * 12;
  const balloon = balanceAfter(bankLoan, ib, bankPmt, kb);
  const bankInterest = bankPmt * kb - (bankLoan - balloon);
  const nc = cdcTermYears * 12;
  const cdcPmt = payment(cdcLoan, ic, nc);
  const cdcInterest = cdcPmt * nc - cdcLoan;
  const firstYear =
    bankPmt * 12 - (bankLoan - balanceAfter(bankLoan, ib, bankPmt, 12)) +
    cdcPmt * 12 - (cdcLoan - balanceAfter(cdcLoan, ic, cdcPmt, 12));

  return {
    interestFirstYear: round2(firstYear),
    bankInterestToBalloon: round2(bankInterest),
    bankBalloon: round2(balloon),
    cdcTotalInterest: round2(cdcInterest),
    totalInterest: round2(bankInterest + cdcInterest),
  };
};

// --- 6. SBA 504 Loan Affordability Calculator ----------------------------------
export const sba504LoanAffordabilityCalculator: CustomCalculator = (values) => {
  const annualCashFlow = Math.max(0, safeNumber(values.annualCashFlow, 300000));
  const existingAnnualDebtService = Math.max(0, safeNumber(values.existingAnnualDebtService, 40000));
  const minDscr = Math.max(1, safeNumber(values.minDscr, 1.25));
  const cashAvailable = Math.max(0, safeNumber(values.cashAvailable, 250000));
  const borrowerPercent = pickOption(safeNumber(values.borrowerPercent, 10), [10, 15, 20], 10);
  const bankRatePercent = Math.max(0, safeNumber(values.bankRatePercent, 7.5));
  const cdcRatePercent = Math.max(0, safeNumber(values.cdcRatePercent, 6.25));

  const cdcShare = 0.5 - borrowerPercent / 100;
  const perDollar =
    12 * (0.5 * payment(1, bankRatePercent / 100 / 12, 300) + cdcShare * payment(1, cdcRatePercent / 100 / 12, 300));
  const budget = Math.max(0, annualCashFlow / minDscr - existingAnnualDebtService);
  const byCashFlow = perDollar > 0 ? budget / perDollar : 0;
  const byCash = cashAvailable / (borrowerPercent / 100);
  const max = Math.min(byCashFlow, byCash);

  return {
    maxProjectByCashFlow: round2(byCashFlow),
    maxProjectByDownPayment: round2(byCash),
    maxProjectCost: round2(max),
    downPaymentAtMax: round2((max * borrowerPercent) / 100),
    annualPaymentsAtMax: round2(max * perDollar),
  };
};

// --- 7. SBA 504 Loan Comparison Calculator (504 vs 7(a)) ----------------------
export const sba504LoanComparisonCalculator: CustomCalculator = (values) => {
  const projectCost = Math.max(0, safeNumber(values.projectCost, 2000000));
  const bankRatePercent = Math.max(0, safeNumber(values.bankRatePercent, 7.5));
  const cdcRatePercent = Math.max(0, safeNumber(values.cdcRatePercent, 6.25));
  const debentureFeesPercent = Math.max(0, safeNumber(values.debentureFeesPercent, 2.5));
  const sba7aRatePercent = Math.max(0, safeNumber(values.sba7aRatePercent, 10));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 25)));

  const n = termYears * 12;
  const bank = projectCost * 0.5;
  const cdcBase = projectCost * 0.4;
  const fees504 = (cdcBase * debentureFeesPercent) / 100;
  const pmt504 =
    payment(bank, bankRatePercent / 100 / 12, n) + payment(cdcBase + fees504, cdcRatePercent / 100 / 12, n);
  const loan7a = projectCost * 0.9;
  const fees7a = sba7aGuarantyFee(loan7a);
  const pmt7a = payment(loan7a + fees7a, sba7aRatePercent / 100 / 12, n);

  return {
    downPayment: round2(projectCost * 0.1),
    fees504: round2(fees504),
    fees7a: round2(fees7a),
    monthlyPayment504: round2(pmt504),
    monthlyPayment7a: round2(pmt7a),
    monthlySavingsWith504: round2(pmt7a - pmt504),
    tenYearSavingsWith504: round2((pmt7a - pmt504) * Math.min(120, n)),
  };
};

// --- 8. SBA 504 Loan Eligibility Calculator ------------------------------------
export const sba504LoanEligibilityCalculator: CustomCalculator = (values) => {
  const tangibleNetWorth = Math.max(0, safeNumber(values.tangibleNetWorth, 8000000));
  const avgNetIncome = Math.max(0, safeNumber(values.avgNetIncome, 1200000));
  const occupancyPercent = Math.min(100, Math.max(0, safeNumber(values.occupancyPercent, 60)));
  const newConstruction = Math.round(safeNumber(values.newConstruction, 0)) === 1;
  const debentureAmount = Math.max(0, safeNumber(values.debentureAmount, 800000));
  const jobs = Math.max(0, Math.round(safeNumber(values.jobsCreatedOrRetained, 8)));
  const debenturePerJob = Math.max(1000, safeNumber(values.debenturePerJob, 90000));

  const requiredOccupancy = newConstruction ? 60 : 51;
  const jobsRequired = Math.ceil(debentureAmount / debenturePerJob);
  let passed = 0;
  if (tangibleNetWorth <= 20000000) passed++;
  if (avgNetIncome <= 6500000) passed++;
  if (occupancyPercent >= requiredOccupancy) passed++;
  if (jobs >= jobsRequired) passed++;

  return {
    requiredOccupancy,
    jobsRequired,
    maxDebentureByJobs: round2(jobs * debenturePerJob),
    checksPassed: passed,
  };
};

export const loanSbaProgramsCustomCalculators: Record<string, CustomCalculator> = {
  "sba-7a-loan-calculator": sba7aLoanCalculator,
  "sba-504-loan-calculator": sba504LoanCalculator,
  "sba-504-loan-payment-calculator": sba504LoanPaymentCalculator,
  "sba-504-loan-payoff-calculator": sba504LoanPayoffCalculator,
  "sba-504-loan-interest-calculator": sba504LoanInterestCalculator,
  "sba-504-loan-affordability-calculator": sba504LoanAffordabilityCalculator,
  "sba-504-loan-comparison-calculator": sba504LoanComparisonCalculator,
  "sba-504-loan-eligibility-calculator": sba504LoanEligibilityCalculator,
};
