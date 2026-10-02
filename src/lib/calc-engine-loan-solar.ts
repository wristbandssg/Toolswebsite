/**
 * Batch: "Loan Calculators" expansion (2 Oct 2026), sub-batch 6 of 10 —
 * Solar Panel Loans (7 tools), filed under Loan Calculators > Home
 * Improvement Loan Calculators. See calc-engine-loan-debt-consolidation.ts
 * for the full batch context.
 *
 * Federal tax credit note (researched for this batch): the 30% Residential
 * Clean Energy Credit (IRC §25D) was ended by the One Big Beautiful Bill Act
 * (Pub. L. 119-21, July 2025) for expenditures made after 31 Dec 2025, so
 * homeowner-owned systems installed in 2026 don't get it. No tool here
 * assumes a federal credit; incentive inputs default to 0 and are labelled
 * as state/utility rebates (or a credit claimed on an earlier system).
 *
 * What each tool models beyond the plain payment formula:
 *  - solarPanelLoan: system size x cost per watt, less rebates and down
 *    payment, and the loan payment vs the electricity bill savings.
 *  - payment: the "re-amortization" built into many solar loans — the
 *    starting payment assumes you pay down a lump sum (rebate / credit) by a
 *    set month; if you don't, the payment jumps.
 *  - payoff: extra payments, and the years of free power left within the
 *    panel warranty once the loan is gone.
 *  - interest: interest and total loan cost per kWh the panels produce
 *    over the loan (with yearly panel degradation).
 *  - affordability: the system a payment no bigger than part of today's
 *    electric bill can buy.
 *  - comparison: 25-year net savings — pay cash vs loan vs lease/PPA.
 *  - eligibility: DTI and score checks, plus the payment as a share of the
 *    current electric bill.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-solar-calculators.ts for the copy.
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

// --- 1. Solar Panel Loan Calculator ------------------------------------------
export const solarPanelLoanCalculator: CustomCalculator = (values) => {
  const systemSizeKw = Math.max(0, safeNumber(values.systemSizeKw, 8));
  const costPerWatt = Math.max(0, safeNumber(values.costPerWatt, 3));
  const rebates = Math.max(0, safeNumber(values.rebates, 0));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 0));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 20)));
  const productionPerKw = Math.max(0, safeNumber(values.productionPerKw, 1300));
  const electricityRate = Math.max(0, safeNumber(values.electricityRate, 0.17));

  const systemCost = systemSizeKw * 1000 * costPerWatt;
  const loan = Math.max(0, systemCost - rebates - downPayment);
  const pmt = payment(loan, annualRatePercent / 100 / 12, termYears * 12);
  const monthlySavings = (systemSizeKw * productionPerKw * electricityRate) / 12;

  return {
    systemCost: round2(systemCost),
    loanAmount: round2(loan),
    monthlyPayment: round2(pmt),
    monthlyBillSavings: round2(monthlySavings),
    netMonthlyCashFlow: round2(monthlySavings - pmt),
  };
};

// --- 2. Solar Panel Loan Payment Calculator (re-amortization) ---------------
export const solarPanelLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 30000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.99));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 25)));
  const expectedPrepayment = Math.max(0, safeNumber(values.expectedPrepayment, 6000));
  const prepayMonth = Math.max(1, Math.round(safeNumber(values.prepayMonth, 18)));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const k = Math.min(prepayMonth, n - 1);
  const prepay = Math.min(expectedPrepayment, loanAmount);
  // The intro payment is set as if the prepayment had already been made.
  const intro = payment(loanAmount - prepay, i, n);
  const bal = balanceAfter(loanAmount, i, intro, k);
  const ifPrepaid = payment(Math.max(0, bal - prepay), i, n - k);
  const ifNot = payment(bal, i, n - k);

  return {
    introPayment: round2(intro),
    balanceAtPrepayMonth: round2(bal),
    paymentIfPrepaid: round2(ifPrepaid),
    paymentIfNotPrepaid: round2(ifNot),
    paymentJumpIfNotPrepaid: round2(ifNot - intro),
  };
};

// --- 3. Solar Panel Loan Payoff Calculator (vs warranty) ---------------------
export const solarPanelLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 25000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 210));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 50));
  const yearsSinceInstall = Math.max(0, safeNumber(values.yearsSinceInstall, 0));
  const warrantyYears = Math.max(0, safeNumber(values.warrantyYears, 25));

  const i = annualRatePercent / 100 / 12;
  const now = payDown(balance, i, monthlyPayment);
  const faster = payDown(balance, i, monthlyPayment + extraMonthly);

  return {
    monthsLeft: Math.max(0, now.months),
    monthsWithExtra: Math.max(0, faster.months),
    interestSaved: now.months >= 0 && faster.months >= 0 ? round2(now.interest - faster.interest) : 0,
    warrantyYearsAfterPayoff: faster.months >= 0 ? round2(warrantyYears - yearsSinceInstall - faster.months / 12) : 0,
  };
};

// --- 4. Solar Panel Loan Interest Calculator (per kWh) -----------------------
export const solarPanelLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 24000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 20)));
  const systemSizeKw = Math.max(0, safeNumber(values.systemSizeKw, 8));
  const productionPerKw = Math.max(0, safeNumber(values.productionPerKw, 1300));
  const degradationPercent = Math.max(0, safeNumber(values.degradationPercent, 0.5));

  const n = termYears * 12;
  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, n);
  const interest = pmt * n - loanAmount;
  let kwh = 0;
  for (let y = 0; y < termYears; y++) kwh += systemSizeKw * productionPerKw * Math.pow(1 - degradationPercent / 100, y);

  return {
    monthlyPayment: round2(pmt),
    totalInterest: round2(interest),
    kwhOverLoanTerm: Math.round(kwh),
    interestPerKwh: kwh > 0 ? Math.round((interest / kwh) * 1000) / 1000 : 0,
    loanCostPerKwh: kwh > 0 ? Math.round(((pmt * n) / kwh) * 1000) / 1000 : 0,
  };
};

// --- 5. Solar Panel Loan Affordability Calculator ----------------------------
export const solarPanelLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const monthlyElectricBill = Math.max(0, safeNumber(values.monthlyElectricBill, 180));
  const paymentShareOfBillPercent = Math.max(0, safeNumber(values.paymentShareOfBillPercent, 100));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 20)));
  const costPerWatt = Math.max(0.01, safeNumber(values.costPerWatt, 3));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 0));

  const maxPayment = (monthlyElectricBill * paymentShareOfBillPercent) / 100;
  const maxLoan = presentValue(maxPayment, annualRatePercent / 100 / 12, termYears * 12);
  const maxCost = maxLoan + downPayment;

  return {
    maxMonthlyPayment: round2(maxPayment),
    maxLoanAmount: round2(maxLoan),
    maxSystemCost: round2(maxCost),
    maxSystemSizeKw: round2(maxCost / (costPerWatt * 1000)),
  };
};

// --- 6. Solar Panel Loan Comparison Calculator (cash vs loan vs lease) ------
export const solarPanelLoanComparisonCalculator: CustomCalculator = (values) => {
  const systemCost = Math.max(0, safeNumber(values.systemCost, 24000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 20)));
  const firstYearSavings = Math.max(0, safeNumber(values.firstYearSavings, 1800));
  const utilityIncreasePercent = Math.max(0, safeNumber(values.utilityIncreasePercent, 3));
  const degradationPercent = Math.max(0, safeNumber(values.degradationPercent, 0.5));
  const leaseMonthly = Math.max(0, safeNumber(values.leaseMonthly, 120));
  const leaseEscalatorPercent = Math.max(0, safeNumber(values.leaseEscalatorPercent, 2.9));
  const years = 25;

  const pmt = payment(systemCost, annualRatePercent / 100 / 12, termYears * 12);
  let savings = 0;
  let leaseCost = 0;
  for (let y = 0; y < years; y++) {
    savings += firstYearSavings * Math.pow((1 + utilityIncreasePercent / 100) * (1 - degradationPercent / 100), y);
    leaseCost += leaseMonthly * 12 * Math.pow(1 + leaseEscalatorPercent / 100, y);
  }
  const loanPaid = pmt * Math.min(termYears, years) * 12;

  return {
    lifetimeBillSavings: round2(savings),
    cashNetSavings: round2(savings - systemCost),
    loanPayment: round2(pmt),
    loanNetSavings: round2(savings - loanPaid),
    leaseNetSavings: round2(savings - leaseCost),
  };
};

// --- 7. Solar Panel Loan Eligibility Calculator ------------------------------
export const solarPanelLoanEligibilityCalculator: CustomCalculator = (values) => {
  const creditScore = Math.max(300, Math.min(850, safeNumber(values.creditScore, 690)));
  const lenderMinScore = Math.max(300, Math.min(850, safeNumber(values.lenderMinScore, 650)));
  const grossMonthlyIncome = Math.max(1, safeNumber(values.grossMonthlyIncome, 6500));
  const monthlyDebtPayments = Math.max(0, safeNumber(values.monthlyDebtPayments, 2100));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 25000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.99));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 20)));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 45));
  const monthlyElectricBill = Math.max(0, safeNumber(values.monthlyElectricBill, 200));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termYears * 12);
  const dti = ((monthlyDebtPayments + pmt) / grossMonthlyIncome) * 100;

  return {
    monthlyPayment: round2(pmt),
    dtiPercent: round2(dti),
    dtiHeadroomPercent: round2(maxDtiPercent - dti),
    scoreMargin: Math.round(creditScore - lenderMinScore),
    paymentVsBillPercent: monthlyElectricBill > 0 ? round2((pmt / monthlyElectricBill) * 100) : 0,
  };
};

export const loanSolarCustomCalculators: Record<string, CustomCalculator> = {
  "solar-panel-loan-calculator": solarPanelLoanCalculator,
  "solar-panel-loan-payment-calculator": solarPanelLoanPaymentCalculator,
  "solar-panel-loan-payoff-calculator": solarPanelLoanPayoffCalculator,
  "solar-panel-loan-interest-calculator": solarPanelLoanInterestCalculator,
  "solar-panel-loan-affordability-calculator": solarPanelLoanAffordabilityCalculator,
  "solar-panel-loan-comparison-calculator": solarPanelLoanComparisonCalculator,
  "solar-panel-loan-eligibility-calculator": solarPanelLoanEligibilityCalculator,
};
