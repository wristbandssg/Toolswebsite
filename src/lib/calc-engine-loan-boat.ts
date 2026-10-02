/**
 * Batch: "Loan Calculators" expansion (2 Oct 2026), sub-batch 9 of 10 —
 * Boat Loans (7 tools), filed under Loan Calculators > Auto & Vehicle Loan
 * Calculators. See calc-engine-loan-debt-consolidation.ts for the full
 * batch context. Motorcycle and RV loans have the same 7 tool names; the
 * boat versions model marine-specific features:
 *  - boatLoan: boat + trailer, sales tax, registration/survey fees and a
 *    percentage down payment, financed over the long terms marine lenders
 *    offer (10-20 years).
 *  - payment: the loan payment plus the real running costs — storage/slip,
 *    insurance and maintenance as a % of the boat's value, and fuel.
 *  - payoff: a once-a-year lump sum (bonus, tax refund, end of season).
 *  - interest: the same loan over 10, 15 and 20 years side by side, each at
 *    its own rate (longer marine terms often price higher).
 *  - affordability: a total monthly boating budget, less running costs,
 *    worked back to a maximum boat price.
 *  - comparison: new vs used boat over the years you'll keep it — payments,
 *    depreciation and what you'd still owe.
 *  - eligibility: LTV, DTI, score AND the cash reserves (liquidity) many
 *    marine lenders ask for on larger loans.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-boat-calculators.ts for the copy.
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

// --- 1. Boat Loan Calculator -------------------------------------------------
export const boatLoanCalculator: CustomCalculator = (values) => {
  const boatPrice = Math.max(0, safeNumber(values.boatPrice, 50000));
  const trailerPrice = Math.max(0, safeNumber(values.trailerPrice, 5000));
  const salesTaxPercent = Math.max(0, safeNumber(values.salesTaxPercent, 6));
  const fees = Math.max(0, safeNumber(values.fees, 800));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));

  const subtotal = boatPrice + trailerPrice;
  const total = subtotal * (1 + salesTaxPercent / 100) + fees;
  const down = (total * downPaymentPercent) / 100;
  const loan = total - down;
  const n = termYears * 12;
  const pmt = payment(loan, annualRatePercent / 100 / 12, n);

  return {
    totalPrice: round2(total),
    downPayment: round2(down),
    loanAmount: round2(loan),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * n - loan),
  };
};

// --- 2. Boat Loan Payment Calculator (with running costs) --------------------
export const boatLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 45000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));
  const boatValue = Math.max(0, safeNumber(values.boatValue, 50000));
  const insurancePercent = Math.max(0, safeNumber(values.insurancePercent, 1.5));
  const maintenancePercent = Math.max(0, safeNumber(values.maintenancePercent, 5));
  const monthlyStorage = Math.max(0, safeNumber(values.monthlyStorage, 250));
  const monthlyFuel = Math.max(0, safeNumber(values.monthlyFuel, 150));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termYears * 12);
  const ins = (boatValue * insurancePercent) / 100 / 12;
  const maint = (boatValue * maintenancePercent) / 100 / 12;
  const total = pmt + ins + maint + monthlyStorage + monthlyFuel;

  return {
    loanPayment: round2(pmt),
    insuranceMonthly: round2(ins),
    maintenanceMonthly: round2(maint),
    totalMonthlyCost: round2(total),
    runningCostSharePercent: total > 0 ? round2(((total - pmt) / total) * 100) : 0,
  };
};

// --- 3. Boat Loan Payoff Calculator (yearly lump sum) ------------------------
export const boatLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 40000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.5));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 400));
  const annualLumpSum = Math.max(0, safeNumber(values.annualLumpSum, 2000));

  const i = annualRatePercent / 100 / 12;
  const run = (lump: number) => {
    if (monthlyPayment <= balance * i + 1e-9 && lump <= 0) return { months: -1, interest: 0 };
    let b = balance;
    let interest = 0;
    let m = 0;
    while (b > 1e-9 && m < 1200) {
      const int = b * i;
      interest += int;
      m++;
      const pay = monthlyPayment + (m % 12 === 0 ? lump : 0);
      b = b + int - Math.min(pay, b + int);
    }
    return { months: m, interest };
  };
  const now = run(0);
  const faster = run(annualLumpSum);

  return {
    monthsLeft: Math.max(0, now.months),
    monthsWithLumpSum: Math.max(0, faster.months),
    yearsSaved: now.months >= 0 ? round2((now.months - faster.months) / 12) : 0,
    interestSaved: now.months >= 0 ? round2(now.interest - faster.interest) : 0,
  };
};

// --- 4. Boat Loan Interest Calculator (10 vs 15 vs 20 years) -----------------
export const boatLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 60000));
  const rate10Percent = Math.max(0, safeNumber(values.rate10Percent, 7.25));
  const rate15Percent = Math.max(0, safeNumber(values.rate15Percent, 7.5));
  const rate20Percent = Math.max(0, safeNumber(values.rate20Percent, 7.75));

  const p = (r: number, y: number) => payment(loanAmount, r / 100 / 12, y * 12);
  const p10 = p(rate10Percent, 10);
  const p15 = p(rate15Percent, 15);
  const p20 = p(rate20Percent, 20);

  return {
    payment10: round2(p10),
    interest10: round2(p10 * 120 - loanAmount),
    payment15: round2(p15),
    interest15: round2(p15 * 180 - loanAmount),
    payment20: round2(p20),
    interest20: round2(p20 * 240 - loanAmount),
  };
};

// --- 5. Boat Loan Affordability Calculator -----------------------------------
export const boatLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const monthlyBoatBudget = Math.max(0, safeNumber(values.monthlyBoatBudget, 1200));
  const monthlyRunningCosts = Math.max(0, safeNumber(values.monthlyRunningCosts, 550));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));
  const downPaymentPercent = Math.min(99, Math.max(0, safeNumber(values.downPaymentPercent, 15)));

  const room = Math.max(0, monthlyBoatBudget - monthlyRunningCosts);
  const maxLoan = presentValue(room, annualRatePercent / 100 / 12, termYears * 12);
  const maxPrice = maxLoan / (1 - downPaymentPercent / 100);

  return {
    paymentRoom: round2(room),
    maxLoanAmount: round2(maxLoan),
    maxBoatPrice: round2(maxPrice),
    downPaymentNeeded: round2(maxPrice - maxLoan),
  };
};

// --- 6. Boat Loan Comparison Calculator (new vs used) ------------------------
export const boatLoanComparisonCalculator: CustomCalculator = (values) => {
  const newPrice = Math.max(0, safeNumber(values.newPrice, 60000));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 7.25));
  const newTermYears = Math.max(1, Math.round(safeNumber(values.newTermYears, 15)));
  const newDepreciationPercent = Math.min(99, Math.max(0, safeNumber(values.newDepreciationPercent, 10)));
  const usedPrice = Math.max(0, safeNumber(values.usedPrice, 38000));
  const usedRatePercent = Math.max(0, safeNumber(values.usedRatePercent, 8.25));
  const usedTermYears = Math.max(1, Math.round(safeNumber(values.usedTermYears, 10)));
  const usedDepreciationPercent = Math.min(99, Math.max(0, safeNumber(values.usedDepreciationPercent, 6)));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 15)));
  const yearsHeld = Math.max(1, Math.round(safeNumber(values.yearsHeld, 5)));

  // Net cost of owning for `yearsHeld`: down payment + payments made + what
  // you'd still owe - what the boat is worth when you sell.
  const side = (price: number, rate: number, years: number, dep: number) => {
    const down = (price * downPaymentPercent) / 100;
    const loan = price - down;
    const i = rate / 100 / 12;
    const n = years * 12;
    const pmt = payment(loan, i, n);
    const k = Math.min(n, yearsHeld * 12);
    const owed = balanceAfter(loan, i, pmt, k);
    const value = price * Math.pow(1 - dep / 100, yearsHeld);
    return { pmt, net: down + pmt * k + owed - value };
  };
  const a = side(newPrice, newRatePercent, newTermYears, newDepreciationPercent);
  const b = side(usedPrice, usedRatePercent, usedTermYears, usedDepreciationPercent);

  return {
    newPayment: round2(a.pmt),
    newNetCost: round2(a.net),
    usedPayment: round2(b.pmt),
    usedNetCost: round2(b.net),
    usedSaves: round2(a.net - b.net),
  };
};

// --- 7. Boat Loan Eligibility Calculator (incl. liquidity) -------------------
export const boatLoanEligibilityCalculator: CustomCalculator = (values) => {
  const creditScore = Math.max(300, Math.min(850, safeNumber(values.creditScore, 720)));
  const lenderMinScore = Math.max(300, Math.min(850, safeNumber(values.lenderMinScore, 680)));
  const grossMonthlyIncome = Math.max(1, safeNumber(values.grossMonthlyIncome, 10000));
  const monthlyDebtPayments = Math.max(0, safeNumber(values.monthlyDebtPayments, 2800));
  const boatPrice = Math.max(1, safeNumber(values.boatPrice, 80000));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 12000));
  const maxLtvPercent = Math.max(0, safeNumber(values.maxLtvPercent, 90));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 20)));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 40));
  const liquidAssets = Math.max(0, safeNumber(values.liquidAssets, 15000));
  const reservePercent = Math.max(0, safeNumber(values.reservePercent, 10));

  const loan = Math.max(0, boatPrice - downPayment);
  const ltv = (loan / boatPrice) * 100;
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
    reserveMargin: round2(liquidAssets - (loan * reservePercent) / 100),
  };
};

export const loanBoatCustomCalculators: Record<string, CustomCalculator> = {
  "boat-loan-calculator": boatLoanCalculator,
  "boat-loan-payment-calculator": boatLoanPaymentCalculator,
  "boat-loan-payoff-calculator": boatLoanPayoffCalculator,
  "boat-loan-interest-calculator": boatLoanInterestCalculator,
  "boat-loan-affordability-calculator": boatLoanAffordabilityCalculator,
  "boat-loan-comparison-calculator": boatLoanComparisonCalculator,
  "boat-loan-eligibility-calculator": boatLoanEligibilityCalculator,
};
