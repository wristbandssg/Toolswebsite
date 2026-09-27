/**
 * Batch: "Real Estate Calculators" (9 tools). Part of the
 * Finance_Calculators_Topical_SEO_Master.xlsx build-out (see
 * calc-engine-finance-credit-debt.ts for the full batch list/context).
 * Filed under "Real Estate Calculators" rather than splitting the
 * mortgage-flavored tools (Mortgage Affordability, Mortgage Payment, Down
 * Payment, Closing Cost) into the site's separate empty "Mortgage
 * Calculators" shell — a deliberate choice, following the source file's
 * own Cluster grouping as-is (confirmed with the user).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention. Rental Property, Cap Rate, and Real
 * Estate ROI are deliberately scoped differently (see each function's
 * comment) so they're distinct tools rather than formula clones.
 *
 * See prisma/create-finance-real-estate-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function annuityPayment(principal: number, monthlyRate: number, numPayments: number): number {
  if (monthlyRate === 0) return principal / numPayments;
  const factor = Math.pow(1 + monthlyRate, numPayments);
  return (principal * monthlyRate * factor) / (factor - 1);
}

// Principal a given fixed payment can support over n payments at monthlyRate
// (the algebraic inverse of annuityPayment).
function principalFromPayment(payment: number, monthlyRate: number, numPayments: number): number {
  if (monthlyRate === 0) return payment * numPayments;
  return (payment * (1 - Math.pow(1 + monthlyRate, -numPayments))) / monthlyRate;
}

// Remaining balance on a fixed-rate amortizing loan after numPaymentsMade
// of numPaymentsTotal.
function remainingBalance(principal: number, monthlyRate: number, numPaymentsTotal: number, numPaymentsMade: number): number {
  if (monthlyRate === 0) return principal * (1 - numPaymentsMade / numPaymentsTotal);
  const fTotal = Math.pow(1 + monthlyRate, numPaymentsTotal);
  const fPaid = Math.pow(1 + monthlyRate, numPaymentsMade);
  return (principal * (fTotal - fPaid)) / (fTotal - 1);
}

// --- 1. Mortgage Payment Calculator (full PITI) ------------------------------
export const mortgagePaymentCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice));
  const downPaymentAmount = Math.max(0, safeNumber(values.downPaymentAmount));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const annualPropertyTax = Math.max(0, safeNumber(values.annualPropertyTax));
  const annualHomeInsurance = Math.max(0, safeNumber(values.annualHomeInsurance));
  const monthlyHoa = Math.max(0, safeNumber(values.monthlyHoa));

  const loanAmount = Math.max(0, homePrice - downPaymentAmount);
  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const principalAndInterest = annuityPayment(loanAmount, monthlyRate, numPayments);
  const monthlyPropertyTax = annualPropertyTax / 12;
  const monthlyInsurance = annualHomeInsurance / 12;
  const totalMonthlyPayment = principalAndInterest + monthlyPropertyTax + monthlyInsurance + monthlyHoa;

  return {
    principalAndInterest: round2(principalAndInterest),
    monthlyPropertyTax: round2(monthlyPropertyTax),
    monthlyInsurance: round2(monthlyInsurance),
    totalMonthlyPayment: round2(totalMonthlyPayment),
  };
};

// --- 2. Mortgage Affordability Calculator ------------------------------------
export const mortgageAffordabilityCalculator: CustomCalculator = (values) => {
  const grossMonthlyIncome = Math.max(0, safeNumber(values.grossMonthlyIncome));
  const monthlyDebtPayments = Math.max(0, safeNumber(values.monthlyDebtPayments));
  const downPaymentAmount = Math.max(0, safeNumber(values.downPaymentAmount));
  const annualInterestRate = Math.max(0.01, safeNumber(values.annualInterestRate));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const maxDtiPercent = Math.max(1, safeNumber(values.maxDtiPercent, 36));

  const maxTotalMonthlyDebt = grossMonthlyIncome * (maxDtiPercent / 100);
  const maxMonthlyPayment = Math.max(0, maxTotalMonthlyDebt - monthlyDebtPayments);
  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const maxLoanAmount = principalFromPayment(maxMonthlyPayment, monthlyRate, numPayments);
  const maxHomePrice = maxLoanAmount + downPaymentAmount;

  return {
    maxMonthlyPayment: round2(maxMonthlyPayment),
    maxLoanAmount: round2(maxLoanAmount),
    maxHomePrice: round2(maxHomePrice),
  };
};

// --- 3. Cap Rate Calculator (financing-agnostic: NOI vs. property value) -----
export const capRateCalculator: CustomCalculator = (values) => {
  const propertyValue = Math.max(0.01, safeNumber(values.propertyValue));
  const annualRentalIncome = Math.max(0, safeNumber(values.annualRentalIncome));
  const annualOperatingExpenses = Math.max(0, safeNumber(values.annualOperatingExpenses));

  const netOperatingIncome = annualRentalIncome - annualOperatingExpenses;
  const capRatePercent = (netOperatingIncome / propertyValue) * 100;

  return {
    netOperatingIncome: round2(netOperatingIncome),
    capRatePercent: round2(capRatePercent),
  };
};

// --- 4. Real Estate ROI Calculator (total return incl. appreciation) --------
export const realEstateRoiCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice));
  const totalCashInvested = Math.max(0.01, safeNumber(values.totalCashInvested));
  const annualCashFlow = safeNumber(values.annualCashFlow);
  const annualAppreciationPercent = safeNumber(values.annualAppreciationPercent);
  const holdingPeriodYears = Math.max(0.01, safeNumber(values.holdingPeriodYears, 5));

  const appreciatedValue = purchasePrice * Math.pow(1 + annualAppreciationPercent / 100, holdingPeriodYears);
  const equityGain = appreciatedValue - purchasePrice;
  const totalGain = equityGain + annualCashFlow * holdingPeriodYears;
  const totalRoiPercent = (totalGain / totalCashInvested) * 100;
  const cashOnCashReturnPercent = (annualCashFlow / totalCashInvested) * 100;

  return {
    equityGain: round2(equityGain),
    totalGain: round2(totalGain),
    totalRoiPercent: round2(totalRoiPercent),
    cashOnCashReturnPercent: round2(cashOnCashReturnPercent),
  };
};

// --- 5. House Flipping Calculator ---------------------------------------------
export const houseFlippingCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice));
  const renovationCost = Math.max(0, safeNumber(values.renovationCost));
  const holdingCosts = Math.max(0, safeNumber(values.holdingCosts));
  const sellingPrice = Math.max(0, safeNumber(values.sellingPrice));
  const sellingCostsPercent = Math.max(0, safeNumber(values.sellingCostsPercent, 6));

  const totalInvestment = purchasePrice + renovationCost + holdingCosts;
  const sellingCosts = sellingPrice * (sellingCostsPercent / 100);
  const netProfit = sellingPrice - sellingCosts - totalInvestment;
  const roiPercent = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

  return {
    totalInvestment: round2(totalInvestment),
    sellingCosts: round2(sellingCosts),
    netProfit: round2(netProfit),
    roiPercent: round2(roiPercent),
  };
};

// --- 6. Rent vs Buy Calculator -------------------------------------------------
export const rentVsBuyCalculator: CustomCalculator = (values) => {
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent));
  const rentIncreasePercent = Math.max(0, safeNumber(values.rentIncreasePercent, 3));
  const homePrice = Math.max(0, safeNumber(values.homePrice));
  const downPaymentAmount = Math.max(0, safeNumber(values.downPaymentAmount));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const annualPropertyTax = Math.max(0, safeNumber(values.annualPropertyTax));
  const annualHomeInsurance = Math.max(0, safeNumber(values.annualHomeInsurance));
  const monthlyHoa = Math.max(0, safeNumber(values.monthlyHoa));
  const homeAppreciationPercent = safeNumber(values.homeAppreciationPercent, 3);
  const yearsToStay = Math.max(1, Math.round(safeNumber(values.yearsToStay, 7)));

  // Total rent cost, with an annual increase applied at the start of each year.
  let totalRentCost = 0;
  let rent = monthlyRent;
  for (let y = 0; y < yearsToStay; y++) {
    totalRentCost += rent * 12;
    rent *= 1 + rentIncreasePercent / 100;
  }

  const loanAmount = Math.max(0, homePrice - downPaymentAmount);
  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPI = annuityPayment(loanAmount, monthlyRate, numPayments);
  const monthlyTaxInsHoa = annualPropertyTax / 12 + annualHomeInsurance / 12 + monthlyHoa;
  const totalMonthlyBuy = monthlyPI + monthlyTaxInsHoa;

  const totalCashOutlayBuy = downPaymentAmount + totalMonthlyBuy * 12 * yearsToStay;
  const homeValueAtEnd = homePrice * Math.pow(1 + homeAppreciationPercent / 100, yearsToStay);
  const paymentsMade = Math.min(numPayments, yearsToStay * 12);
  const remaining = loanAmount > 0 ? remainingBalance(loanAmount, monthlyRate, numPayments, paymentsMade) : 0;
  const equityAtEnd = homeValueAtEnd - remaining;
  const netCostOfBuying = totalCashOutlayBuy - equityAtEnd;
  const netAdvantageOfBuying = totalRentCost - netCostOfBuying;

  return {
    totalRentCost: round2(totalRentCost),
    netCostOfBuying: round2(netCostOfBuying),
    netAdvantageOfBuying: round2(netAdvantageOfBuying),
  };
};

// --- 7. Down Payment Calculator -------------------------------------------------
export const downPaymentCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice));
  const downPaymentPercent = Math.max(0, safeNumber(values.downPaymentPercent, 20));

  const downPaymentAmount = homePrice * (downPaymentPercent / 100);
  const loanAmount = homePrice - downPaymentAmount;

  return {
    downPaymentAmount: round2(downPaymentAmount),
    loanAmount: round2(loanAmount),
  };
};

// --- 8. Closing Cost Calculator --------------------------------------------------
export const closingCostCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice));
  const closingCostPercent = Math.max(0, safeNumber(values.closingCostPercent, 3));

  const estimatedClosingCosts = homePrice * (closingCostPercent / 100);
  const lowEstimate = homePrice * 0.02;
  const highEstimate = homePrice * 0.05;

  return {
    estimatedClosingCosts: round2(estimatedClosingCosts),
    lowEstimate: round2(lowEstimate),
    highEstimate: round2(highEstimate),
  };
};

// --- 9. Rental Property Calculator (ongoing monthly cash flow) -----------------
export const rentalPropertyCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice));
  const downPaymentAmount = Math.max(0.01, safeNumber(values.downPaymentAmount));
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent));
  const monthlyExpenses = Math.max(0, safeNumber(values.monthlyExpenses));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));

  const loanAmount = Math.max(0, purchasePrice - downPaymentAmount);
  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyMortgagePayment = annuityPayment(loanAmount, monthlyRate, numPayments);

  const monthlyCashFlow = monthlyRent - monthlyExpenses - monthlyMortgagePayment;
  const annualCashFlow = monthlyCashFlow * 12;
  const cashOnCashReturnPercent = (annualCashFlow / downPaymentAmount) * 100;

  return {
    monthlyMortgagePayment: round2(monthlyMortgagePayment),
    monthlyCashFlow: round2(monthlyCashFlow),
    annualCashFlow: round2(annualCashFlow),
    cashOnCashReturnPercent: round2(cashOnCashReturnPercent),
  };
};

export const financeRealEstateCustomCalculators: Record<string, CustomCalculator> = {
  "mortgage-payment-calculator": mortgagePaymentCalculator,
  "mortgage-affordability-calculator": mortgageAffordabilityCalculator,
  "cap-rate-calculator": capRateCalculator,
  "real-estate-roi-calculator": realEstateRoiCalculator,
  "house-flipping-calculator": houseFlippingCalculator,
  "rent-vs-buy-calculator": rentVsBuyCalculator,
  "down-payment-calculator": downPaymentCalculator,
  "closing-cost-calculator": closingCostCalculator,
  "rental-property-calculator": rentalPropertyCalculator,
};
