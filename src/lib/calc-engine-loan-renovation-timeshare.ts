/**
 * Batch: "Loan Calculators" expansion (2 Oct 2026), sub-batch 5 of 10 —
 * Renovation & Timeshare Loans (11 tools), filed under Loan Calculators >
 * Home Improvement Loan Calculators. See calc-engine-loan-debt-
 * consolidation.ts for the full batch context.
 *
 * Renovation vs Home Improvement: the 7 Home Improvement tools (calc-engine-
 * loan-home-improvement.ts) treat the loan as a separate personal or home
 * equity loan on a home you already own. The Renovation tools here model a
 * renovation MORTGAGE (FHA 203(k) / Fannie Mae HomeStyle style) that rolls
 * the purchase or refinance AND the renovation into one loan, sized against
 * the home's AFTER-RENOVATION ("as-completed") value:
 *  - renovationLoan: purchase + renovation + contingency reserve, down
 *    payment, loan-to-value against the as-completed value, instant equity.
 *  - renovationLoanPayment: full monthly housing payment (P&I + tax +
 *    insurance + mortgage insurance).
 *  - renovationLoanPayoff: payoff with extra payments and the month the
 *    balance reaches 78% of value (when mortgage insurance usually ends).
 *  - renovationLoanInterest: interest while renovation funds are drawn in
 *    stages, plus lifetime interest.
 *  - renovationLoanAffordability: income -> largest purchase price for a
 *    fixer-upper given the renovation budget.
 *  - renovationLoanComparison: one renovation mortgage vs a purchase
 *    mortgage plus a separate personal loan for the work.
 *  - renovationLoanEligibility: LTV on as-completed value, DTI with the full
 *    housing payment, and credit score.
 *
 * Timeshare loans are usually developer-financed at high rates and come
 * with maintenance fees that keep rising, so every timeshare tool includes
 * those fees:
 *  - timeshareLoan: price, down payment, closing costs, payment + fees.
 *  - timeshareLoanPayment: loan payment plus maintenance fees growing each
 *    year — first-year, last-year and average monthly cost.
 *  - timeshareLoanCost: total cost of ownership over the years you keep it,
 *    net of resale value, and cost per night.
 *  - timeshareLoanPayoff: extra payments vs refinancing the developer loan
 *    with a cheaper personal loan.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-renovation-timeshare-calculators.ts for the copy.
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

// --- 1. Renovation Loan Calculator -------------------------------------------
export const renovationLoanCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 300000));
  const renovationCost = Math.max(0, safeNumber(values.renovationCost, 60000));
  const contingencyPercent = Math.max(0, safeNumber(values.contingencyPercent, 10));
  const asCompletedValue = Math.max(0, safeNumber(values.asCompletedValue, 420000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 3.5)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));

  const contingency = (renovationCost * contingencyPercent) / 100;
  const totalCost = purchasePrice + renovationCost + contingency;
  // Down payment is based on the lower of total cost and as-completed value,
  // the way FHA 203(k) and HomeStyle size the loan.
  const basis = asCompletedValue > 0 ? Math.min(totalCost, asCompletedValue) : totalCost;
  const downPayment = (basis * downPaymentPercent) / 100;
  const loanAmount = basis - downPayment;
  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termYears * 12);

  return {
    totalProjectCost: round2(totalCost),
    downPayment: round2(downPayment + (totalCost - basis)),
    loanAmount: round2(loanAmount),
    monthlyPrincipalInterest: round2(pmt),
    ltvOnAsCompletedPercent: asCompletedValue > 0 ? round2((loanAmount / asCompletedValue) * 100) : 0,
    equityWhenFinished: round2(asCompletedValue - loanAmount),
  };
};

// --- 2. Renovation Loan Payment Calculator (full housing payment) -----------
export const renovationLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 350000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));
  const annualPropertyTax = Math.max(0, safeNumber(values.annualPropertyTax, 4200));
  const annualInsurance = Math.max(0, safeNumber(values.annualInsurance, 1800));
  const mortgageInsurancePercent = Math.max(0, safeNumber(values.mortgageInsurancePercent, 0.55));

  const pi = payment(loanAmount, annualRatePercent / 100 / 12, termYears * 12);
  const tax = annualPropertyTax / 12;
  const ins = annualInsurance / 12;
  const mi = (loanAmount * mortgageInsurancePercent) / 100 / 12;

  return {
    principalInterest: round2(pi),
    propertyTax: round2(tax),
    homeInsurance: round2(ins),
    mortgageInsurance: round2(mi),
    totalMonthlyPayment: round2(pi + tax + ins + mi),
  };
};

// --- 3. Renovation Loan Payoff Calculator (incl. 78% LTV month) --------------
export const renovationLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 350000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));
  const homeValue = Math.max(0, safeNumber(values.homeValue, 400000));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 200));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const pmt = payment(loanAmount, i, n);
  const base = pmt * n - loanAmount;
  const target = homeValue * 0.78;

  let b = loanAmount;
  let months = 0;
  let interest = 0;
  let month78 = loanAmount <= target ? 0 : -1;
  while (b > 1e-9 && months < n) {
    const int = b * i;
    interest += int;
    b = b + int - Math.min(pmt + extraMonthly, b + int);
    months++;
    if (month78 < 0 && b <= target) month78 = months;
  }

  return {
    monthlyPayment: round2(pmt),
    monthsToPayoff: months,
    yearsSaved: round2((n - months) / 12),
    interestSaved: round2(base - interest),
    monthReaching78Ltv: Math.max(0, month78),
  };
};

// --- 4. Renovation Loan Interest Calculator (staged draws) -------------------
export const renovationLoanInterestCalculator: CustomCalculator = (values) => {
  const baseLoan = Math.max(0, safeNumber(values.baseLoan, 290000));
  const renovationFunds = Math.max(0, safeNumber(values.renovationFunds, 60000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const renovationMonths = Math.max(1, Math.round(safeNumber(values.renovationMonths, 6)));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));

  // Renovation money is released in equal draws at the end of each month of
  // work, so interest during the work is charged only on what's been drawn.
  const i = annualRatePercent / 100 / 12;
  const draw = renovationFunds / renovationMonths;
  let renovationInterest = 0;
  for (let m = 0; m < renovationMonths; m++) renovationInterest += draw * m * i;
  const total = baseLoan + renovationFunds;
  const pmt = payment(total, i, termYears * 12);

  return {
    interestOnDrawsDuringWork: round2(renovationInterest),
    interestIfAllDrawnAtStart: round2(renovationFunds * i * renovationMonths),
    interestSavedByStagedDraws: round2(renovationFunds * i * renovationMonths - renovationInterest),
    monthlyPrincipalInterest: round2(pmt),
    lifetimeInterest: round2(pmt * termYears * 12 - total),
  };
};

// --- 5. Renovation Loan Affordability Calculator -----------------------------
export const renovationLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const grossMonthlyIncome = Math.max(0, safeNumber(values.grossMonthlyIncome, 9000));
  const otherDebtPayments = Math.max(0, safeNumber(values.otherDebtPayments, 600));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 43));
  const monthlyTaxInsurance = Math.max(0, safeNumber(values.monthlyTaxInsurance, 550));
  const mortgageInsurancePercent = Math.max(0, safeNumber(values.mortgageInsurancePercent, 0.55));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));
  const downPaymentPercent = Math.min(99, Math.max(0, safeNumber(values.downPaymentPercent, 3.5)));
  const renovationCost = Math.max(0, safeNumber(values.renovationCost, 50000));

  const maxHousing = Math.max(0, (grossMonthlyIncome * maxDtiPercent) / 100 - otherDebtPayments);
  // P&I + mortgage insurance (charged on the loan) must fit after tax + insurance.
  const available = Math.max(0, maxHousing - monthlyTaxInsurance);
  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const perDollar = payment(1, i, n) + mortgageInsurancePercent / 100 / 12;
  const maxLoan = perDollar > 0 ? available / perDollar : 0;
  const maxProject = maxLoan / (1 - downPaymentPercent / 100);

  return {
    maxHousingPayment: round2(maxHousing),
    maxLoanAmount: round2(maxLoan),
    maxTotalProject: round2(maxProject),
    maxPurchasePrice: round2(Math.max(0, maxProject - renovationCost)),
    downPaymentNeeded: round2(maxProject - maxLoan),
  };
};

// --- 6. Renovation Loan Comparison Calculator (one loan vs two) -------------
export const renovationLoanComparisonCalculator: CustomCalculator = (values) => {
  const purchaseLoan = Math.max(0, safeNumber(values.purchaseLoan, 280000));
  const renovationCost = Math.max(0, safeNumber(values.renovationCost, 50000));
  const renovationRatePercent = Math.max(0, safeNumber(values.renovationRatePercent, 7.25));
  const mortgageRatePercent = Math.max(0, safeNumber(values.mortgageRatePercent, 6.875));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));
  const personalRatePercent = Math.max(0, safeNumber(values.personalRatePercent, 12));
  const personalTermMonths = Math.max(1, Math.round(safeNumber(values.personalTermMonths, 84)));
  const renovationExtraFees = Math.max(0, safeNumber(values.renovationExtraFees, 1500));

  const n = termYears * 12;
  const one = payment(purchaseLoan + renovationCost, renovationRatePercent / 100 / 12, n);
  const oneInterest = one * n - purchaseLoan - renovationCost + renovationExtraFees;
  const mort = payment(purchaseLoan, mortgageRatePercent / 100 / 12, n);
  const pl = payment(renovationCost, personalRatePercent / 100 / 12, personalTermMonths);
  const twoInterest = mort * n - purchaseLoan + pl * personalTermMonths - renovationCost;

  return {
    renovationMortgagePayment: round2(one),
    twoLoansPaymentAtStart: round2(mort + pl),
    twoLoansPaymentAfterPersonalLoan: round2(mort),
    renovationMortgageCost: round2(oneInterest),
    twoLoansCost: round2(twoInterest),
    renovationMortgageSaves: round2(twoInterest - oneInterest), // negative = the single loan costs more
  };
};

// --- 7. Renovation Loan Eligibility Calculator -------------------------------
export const renovationLoanEligibilityCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 280000));
  const renovationCost = Math.max(0, safeNumber(values.renovationCost, 60000));
  const asCompletedValue = Math.max(1, safeNumber(values.asCompletedValue, 380000));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 15000));
  const maxLtvPercent = Math.max(0, safeNumber(values.maxLtvPercent, 96.5));
  const grossMonthlyIncome = Math.max(1, safeNumber(values.grossMonthlyIncome, 8500));
  const otherDebtPayments = Math.max(0, safeNumber(values.otherDebtPayments, 500));
  const monthlyTaxInsurance = Math.max(0, safeNumber(values.monthlyTaxInsurance, 500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 43));
  const creditScore = Math.max(300, Math.min(850, safeNumber(values.creditScore, 640)));
  const lenderMinScore = Math.max(300, Math.min(850, safeNumber(values.lenderMinScore, 580)));

  const loan = Math.max(0, purchasePrice + renovationCost - downPayment);
  const ltv = (loan / asCompletedValue) * 100;
  const housing = payment(loan, annualRatePercent / 100 / 12, termYears * 12) + monthlyTaxInsurance;
  const dti = ((housing + otherDebtPayments) / grossMonthlyIncome) * 100;

  return {
    loanAmount: round2(loan),
    ltvPercent: round2(ltv),
    ltvHeadroomPercent: round2(maxLtvPercent - ltv),
    housingPayment: round2(housing),
    dtiPercent: round2(dti),
    dtiHeadroomPercent: round2(maxDtiPercent - dti),
    scoreMargin: Math.round(creditScore - lenderMinScore),
  };
};

// --- 8. Timeshare Loan Calculator --------------------------------------------
export const timeshareLoanCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 24000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const closingCosts = Math.max(0, safeNumber(values.closingCosts, 500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 14.9));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const annualMaintenance = Math.max(0, safeNumber(values.annualMaintenance, 1200));

  const down = (price * downPaymentPercent) / 100;
  const loan = price - down + closingCosts;
  const n = termYears * 12;
  const pmt = payment(loan, annualRatePercent / 100 / 12, n);
  const fee = annualMaintenance / 12;

  return {
    downPayment: round2(down),
    loanAmount: round2(loan),
    monthlyPayment: round2(pmt),
    monthlyMaintenance: round2(fee),
    totalMonthlyCost: round2(pmt + fee),
    totalInterest: round2(pmt * n - loan),
  };
};

// --- 9. Timeshare Loan Payment Calculator (rising maintenance fees) ----------
export const timeshareLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 14.9));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const annualMaintenance = Math.max(0, safeNumber(values.annualMaintenance, 1200));
  const maintenanceIncreasePercent = Math.max(0, safeNumber(values.maintenanceIncreasePercent, 5));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termYears * 12);
  const g = 1 + maintenanceIncreasePercent / 100;
  let totalFees = 0;
  for (let y = 0; y < termYears; y++) totalFees += annualMaintenance * Math.pow(g, y);
  const lastYearFee = annualMaintenance * Math.pow(g, termYears - 1);

  return {
    loanPayment: round2(pmt),
    firstYearMonthlyCost: round2(pmt + annualMaintenance / 12),
    lastYearMonthlyCost: round2(pmt + lastYearFee / 12),
    averageMonthlyCost: round2(pmt + totalFees / (termYears * 12)),
    maintenanceOverLoan: round2(totalFees),
  };
};

// --- 10. Timeshare Loan Cost Calculator (total cost of ownership) ------------
export const timeshareLoanCostCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 24000));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 2400));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 14.9));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const annualMaintenance = Math.max(0, safeNumber(values.annualMaintenance, 1200));
  const maintenanceIncreasePercent = Math.max(0, safeNumber(values.maintenanceIncreasePercent, 5));
  const yearsOwned = Math.max(1, Math.round(safeNumber(values.yearsOwned, 15)));
  const nightsPerYear = Math.max(1, safeNumber(values.nightsPerYear, 7));
  const resaleValue = Math.max(0, safeNumber(values.resaleValue, 0));

  const loan = Math.max(0, price - downPayment);
  const pmt = payment(loan, annualRatePercent / 100 / 12, termYears * 12);
  const interest = pmt * termYears * 12 - loan;
  const g = 1 + maintenanceIncreasePercent / 100;
  let fees = 0;
  for (let y = 0; y < yearsOwned; y++) fees += annualMaintenance * Math.pow(g, y);
  const total = price + interest + fees - resaleValue;

  return {
    totalInterest: round2(interest),
    totalMaintenance: round2(fees),
    totalCostOfOwnership: round2(total),
    costPerYear: round2(total / yearsOwned),
    costPerNight: round2(total / (yearsOwned * nightsPerYear)),
  };
};

// --- 11. Timeshare Loan Payoff Calculator (extra vs personal-loan refi) ------
export const timeshareLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 15.9));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 300));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 100));
  const refiRatePercent = Math.max(0, safeNumber(values.refiRatePercent, 10));

  const i = annualRatePercent / 100 / 12;
  const now = payDown(balance, i, monthlyPayment);
  const faster = payDown(balance, i, monthlyPayment + extraMonthly);
  // Refinance: same remaining months at the personal-loan rate.
  const months = Math.max(0, now.months);
  const refiPmt = payment(balance, refiRatePercent / 100 / 12, months);
  const refiInterest = refiPmt * months - balance;

  return {
    monthsLeft: months,
    monthsWithExtra: Math.max(0, faster.months),
    interestSavedWithExtra: now.months >= 0 && faster.months >= 0 ? round2(now.interest - faster.interest) : 0,
    refinancePayment: round2(refiPmt),
    interestSavedByRefinancing: now.months >= 0 ? round2(now.interest - refiInterest) : 0,
  };
};

export const loanRenovationTimeshareCustomCalculators: Record<string, CustomCalculator> = {
  "renovation-loan-calculator": renovationLoanCalculator,
  "renovation-loan-payment-calculator": renovationLoanPaymentCalculator,
  "renovation-loan-payoff-calculator": renovationLoanPayoffCalculator,
  "renovation-loan-interest-calculator": renovationLoanInterestCalculator,
  "renovation-loan-affordability-calculator": renovationLoanAffordabilityCalculator,
  "renovation-loan-comparison-calculator": renovationLoanComparisonCalculator,
  "renovation-loan-eligibility-calculator": renovationLoanEligibilityCalculator,
  "timeshare-loan-calculator": timeshareLoanCalculator,
  "timeshare-loan-payment-calculator": timeshareLoanPaymentCalculator,
  "timeshare-loan-cost-calculator": timeshareLoanCostCalculator,
  "timeshare-loan-payoff-calculator": timeshareLoanPayoffCalculator,
};
