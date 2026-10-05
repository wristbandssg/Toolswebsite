/**
 * Batch: "Loan Calculators" expansion 3 (3 Oct 2026), sub-batch 9 of 11 —
 * Fleet Loans (7 tools), filed under Loan Calculators > Auto & Vehicle Loan
 * Calculators. See calc-engine-loan-sba.ts for the full batch context.
 *
 * A fleet loan finances several business vehicles at once (vans, pickups,
 * cars, trucks), so these tools work per vehicle and per mile:
 *  - fleetLoan: number of vehicles x price -> amount financed, payment and
 *    payment per vehicle.
 *  - fleetLoanPayment: the payment per vehicle, per day and per mile driven.
 *  - fleetLoanPayoff: the balance at a planned replacement point vs the
 *    fleet's resale value -> equity (or negative equity).
 *  - fleetLoanInterest: interest, the business-use share that's deductible,
 *    and the after-tax interest cost.
 *  - fleetLoanAffordability: revenue and running costs per vehicle -> the
 *    payment and price per vehicle the work supports.
 *  - fleetLoanComparison: financing and owning vs a fleet lease.
 *  - fleetLoanEligibility: DSCR with the new loan, time in business, score.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-fleet-calculators.ts for the copy.
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

// --- 1. Fleet Loan Calculator -----------------------------------------------------------
export const fleetLoanCalculator: CustomCalculator = (values) => {
  const vehicles = Math.max(0, Math.round(safeNumber(values.vehicles, 5)));
  const pricePerVehicle = Math.max(0, safeNumber(values.pricePerVehicle, 45000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  const total = vehicles * pricePerVehicle;
  const financed = total * (1 - downPaymentPercent / 100);
  const pmt = payment(financed, annualRatePercent / 100 / 12, termMonths);

  return {
    totalFleetCost: round2(total),
    amountFinanced: round2(financed),
    monthlyPayment: round2(pmt),
    paymentPerVehicle: round2(vehicles > 0 ? pmt / vehicles : 0),
    totalInterest: round2(pmt * termMonths - financed),
  };
};

// --- 2. Fleet Loan Payment Calculator (per vehicle, per mile) --------------------------
export const fleetLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 200000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const vehicles = Math.max(0, Math.round(safeNumber(values.vehicles, 5)));
  const milesPerVehiclePerMonth = Math.max(0, safeNumber(values.milesPerVehiclePerMonth, 3000));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const perVehicle = vehicles > 0 ? pmt / vehicles : 0;

  return {
    monthlyPayment: round2(pmt),
    paymentPerVehicle: round2(perVehicle),
    paymentPerVehiclePerDay: round2(perVehicle / (365 / 12)),
    paymentPerMile: milesPerVehiclePerMonth > 0 ? Math.round((perVehicle / milesPerVehiclePerMonth) * 1000) / 1000 : 0,
  };
};

// --- 3. Fleet Loan Payoff Calculator (balance vs resale at replacement) ----------------
export const fleetLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 200000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const monthsPaid = Math.min(termMonths, Math.max(0, Math.round(safeNumber(values.monthsPaid, 36))));
  const vehicles = Math.max(0, Math.round(safeNumber(values.vehicles, 5)));
  const resaleValuePerVehicle = Math.max(0, safeNumber(values.resaleValuePerVehicle, 22000));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const bal = balanceAfter(loanAmount, i, pmt, monthsPaid);
  const resale = vehicles * resaleValuePerVehicle;

  return {
    payoffBalance: round2(bal),
    fleetResaleValue: round2(resale),
    equity: round2(resale - bal),
    equityPerVehicle: round2(vehicles > 0 ? (resale - bal) / vehicles : 0),
    interestAvoided: round2(Math.max(0, pmt * (termMonths - monthsPaid) - bal)),
  };
};

// --- 4. Fleet Loan Interest Calculator (tax-deductible interest) -----------------------
export const fleetLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 225000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const businessUsePercent = Math.min(100, Math.max(0, safeNumber(values.businessUsePercent, 100)));
  const taxRatePercent = Math.min(70, Math.max(0, safeNumber(values.taxRatePercent, 25)));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const interest = pmt * termMonths - loanAmount;
  const k = Math.min(12, termMonths);
  const firstYear = pmt * k - (loanAmount - balanceAfter(loanAmount, i, pmt, k));
  const deductible = (interest * businessUsePercent) / 100;
  const saving = (deductible * taxRatePercent) / 100;

  return {
    interestFirstYear: round2(firstYear),
    totalInterest: round2(interest),
    deductibleInterest: round2(deductible),
    taxSavings: round2(saving),
    afterTaxInterest: round2(interest - saving),
  };
};

// --- 5. Fleet Loan Affordability Calculator ---------------------------------------------
export const fleetLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const vehicles = Math.max(0, Math.round(safeNumber(values.vehicles, 5)));
  const revenuePerVehicle = Math.max(0, safeNumber(values.revenuePerVehicle, 6000));
  const operatingCostPerVehicle = Math.max(0, safeNumber(values.operatingCostPerVehicle, 3800));
  const sharePercent = Math.min(100, Math.max(0, safeNumber(values.sharePercent, 40)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const downPaymentPercent = Math.min(99, Math.max(0, safeNumber(values.downPaymentPercent, 10)));

  const margin = Math.max(0, revenuePerVehicle - operatingCostPerVehicle);
  const maxPmt = (margin * sharePercent) / 100;
  const maxLoan = presentValue(maxPmt, annualRatePercent / 100 / 12, termMonths);
  const maxPrice = maxLoan / (1 - downPaymentPercent / 100);

  return {
    marginPerVehicle: round2(margin),
    maxPaymentPerVehicle: round2(maxPmt),
    maxPricePerVehicle: round2(maxPrice),
    totalFleetBudget: round2(maxPrice * vehicles),
  };
};

// --- 6. Fleet Loan Comparison Calculator (finance vs lease) -----------------------------
export const fleetLoanComparisonCalculator: CustomCalculator = (values) => {
  const vehicles = Math.max(0, Math.round(safeNumber(values.vehicles, 5)));
  const pricePerVehicle = Math.max(0, safeNumber(values.pricePerVehicle, 45000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const resalePercent = Math.min(100, Math.max(0, safeNumber(values.resalePercent, 45)));
  const leasePaymentPerVehicle = Math.max(0, safeNumber(values.leasePaymentPerVehicle, 750));

  const down = (pricePerVehicle * downPaymentPercent) / 100;
  const pmt = payment(pricePerVehicle - down, annualRatePercent / 100 / 12, termMonths);
  const buyPer = down + pmt * termMonths - (pricePerVehicle * resalePercent) / 100;
  const leasePer = leasePaymentPerVehicle * termMonths;

  return {
    loanPaymentPerVehicle: round2(pmt),
    buyNetCostFleet: round2(buyPer * vehicles),
    leaseCostFleet: round2(leasePer * vehicles),
    savingsWithBuying: round2((leasePer - buyPer) * vehicles),
  };
};

// --- 7. Fleet Loan Eligibility Calculator --------------------------------------------------
export const fleetLoanEligibilityCalculator: CustomCalculator = (values) => {
  const annualCashFlow = Math.max(0, safeNumber(values.annualCashFlow, 260000));
  const existingAnnualDebt = Math.max(0, safeNumber(values.existingAnnualDebt, 60000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 200000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const yearsInBusiness = Math.max(0, safeNumber(values.yearsInBusiness, 3));
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 680)));

  const newAnnual = payment(loanAmount, annualRatePercent / 100 / 12, termMonths) * 12;
  const total = existingAnnualDebt + newAnnual;
  const dscr = total > 0 ? annualCashFlow / total : 0;
  let passed = 0;
  if (dscr >= 1.25) passed++;
  if (yearsInBusiness >= 2) passed++;
  if (creditScore >= 650) passed++;

  return {
    newAnnualPayments: round2(newAnnual),
    dscr: round2(dscr),
    maxNewMonthlyPayment: round2(Math.max(0, annualCashFlow / 1.25 - existingAnnualDebt) / 12),
    checksPassed: passed,
  };
};

export const loanFleetCustomCalculators: Record<string, CustomCalculator> = {
  "fleet-loan-calculator": fleetLoanCalculator,
  "fleet-loan-payment-calculator": fleetLoanPaymentCalculator,
  "fleet-loan-payoff-calculator": fleetLoanPayoffCalculator,
  "fleet-loan-interest-calculator": fleetLoanInterestCalculator,
  "fleet-loan-affordability-calculator": fleetLoanAffordabilityCalculator,
  "fleet-loan-comparison-calculator": fleetLoanComparisonCalculator,
  "fleet-loan-eligibility-calculator": fleetLoanEligibilityCalculator,
};
