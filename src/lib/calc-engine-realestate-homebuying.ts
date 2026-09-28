/**
 * Batch: "Real Estate Calculators" sub-batch G (Home Buying & Ownership
 * Costs, 10 tools). Part of the Real Estate build-out — see calc-engine-
 * realestate-rental-income.ts for the full list of 11 sub-batches. Filed
 * under Finance Calculators > Real Estate Calculators.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - homeAffordabilityCalculator: the lender 28/36 rule including property
 *    tax, insurance and HOA — the highest home price your income supports.
 *  - homePriceAffordabilityCalculator: a quick check of a SPECIFIC price
 *    against your income (price-to-income multiple) and savings.
 *  - homeDownPaymentCalculator: 3%, 5%, 10% or 20% down — cash, loan,
 *    payment and PMI for the percentage you choose.
 *  - homeClosingCostCalculator: itemized buyer closing costs as a % of price.
 *  - buyerClosingCostCalculator: total CASH TO CLOSE — down payment plus
 *    closing costs minus earnest money and seller credits.
 *  - homeownersInsuranceCalculator: premium from dwelling coverage × rate per
 *    $1,000, adjusted for deductible and extra coverage.
 *  - hoaFeeCalculator: HOA dues over time with annual increases and their
 *    share of your housing payment.
 *  - propertyMaintenanceCostCalculator: yearly upkeep by the 1% rule and the
 *    $1-per-square-foot rule, adjusted for the home's age.
 *  - homeownershipCostCalculator: the full MONTHLY cost of owning.
 *  - totalCostOfHomeownershipCalculator: the full cost over YEARS of
 *    ownership, net of the equity you build.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-realestate-homebuying-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function payment(principal: number, annualRatePercent: number, years: number): number {
  const n = Math.round(years * 12);
  const i = annualRatePercent / 100 / 12;
  if (n <= 0) return 0;
  return i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
}

function balanceAfter(principal: number, annualRatePercent: number, pmt: number, months: number): number {
  const i = annualRatePercent / 100 / 12;
  if (i === 0) return Math.max(0, principal - pmt * months);
  return Math.max(0, principal * Math.pow(1 + i, months) - (pmt * (Math.pow(1 + i, months) - 1)) / i);
}

const pct = (a: number, b: number) => (b !== 0 ? round2((a / b) * 100) : 0);

// --- 1. Home Affordability (28/36 rule) -----------------------------------
export const homeAffordabilityCalculator: CustomCalculator = (values) => {
  const annualIncome = Math.max(0, safeNumber(values.annualIncome, 110000));
  const monthlyDebts = Math.max(0, safeNumber(values.monthlyDebts, 500));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 50000));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 6.5));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const propertyTaxRatePercent = Math.max(0, safeNumber(values.propertyTaxRatePercent, 1.1));
  const monthlyInsurance = Math.max(0, safeNumber(values.monthlyInsurance, 150));
  const monthlyHoa = Math.max(0, safeNumber(values.monthlyHoa, 0));

  const monthlyIncome = annualIncome / 12;
  const maxHousing = Math.max(0, Math.min(monthlyIncome * 0.28, monthlyIncome * 0.36 - monthlyDebts));
  // Solve price P: payment(P − down) + P × tax/12 + insurance + HOA = maxHousing.
  const pmtPerDollar = payment(1, interestRatePercent, loanTermYears);
  const taxPerDollar = propertyTaxRatePercent / 100 / 12;
  const room = maxHousing - monthlyInsurance - monthlyHoa + pmtPerDollar * downPayment;
  const price = Math.max(downPayment, room / (pmtPerDollar + taxPerDollar));
  const loan = Math.max(0, price - downPayment);

  return {
    maxHomePrice: round2(price),
    maxMonthlyHousingPayment: round2(maxHousing),
    loanAmount: round2(loan),
    monthlyPrincipalAndInterest: round2(payment(loan, interestRatePercent, loanTermYears)),
    monthlyPropertyTax: round2(price * taxPerDollar),
  };
};

// --- 2. Home Price Affordability (check a price) --------------------------
export const homePriceAffordabilityCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 400000));
  const annualIncome = Math.max(0.01, safeNumber(values.annualIncome, 100000));
  const savings = Math.max(0, safeNumber(values.savings, 70000));
  const downPaymentPercent = Math.max(0, safeNumber(values.downPaymentPercent, 10));
  const closingCostPercent = Math.max(0, safeNumber(values.closingCostPercent, 3));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 6.5));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));

  const down = (homePrice * downPaymentPercent) / 100;
  const cashNeeded = down + (homePrice * closingCostPercent) / 100;
  const pi = payment(homePrice - down, interestRatePercent, loanTermYears);

  return {
    priceToIncomeRatio: round2(homePrice / annualIncome),
    cashNeededUpFront: round2(cashNeeded),
    savingsLeftOrShortfall: round2(savings - cashNeeded),
    monthlyPrincipalAndInterest: round2(pi),
    paymentShareOfIncomePercent: pct(pi * 12, annualIncome),
  };
};

// --- 3. Home Down Payment ----------------------------------------------------
export const homeDownPaymentCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 380000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 6.5));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const pmiRatePercent = Math.max(0, safeNumber(values.pmiRatePercent, 0.6));

  const down = (homePrice * downPaymentPercent) / 100;
  const loan = homePrice - down;
  const pmi = downPaymentPercent < 20 ? (loan * pmiRatePercent) / 100 / 12 : 0;
  const pi = payment(loan, interestRatePercent, loanTermYears);

  return {
    downPaymentAmount: round2(down),
    loanAmount: round2(loan),
    monthlyPrincipalAndInterest: round2(pi),
    monthlyPmi: round2(pmi),
    extraCashToReach20Percent: round2(Math.max(0, homePrice * 0.2 - down)),
  };
};

// --- 4. Home Closing Cost (itemized) -----------------------------------------
export const homeClosingCostCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 350000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 315000));
  const originationPercent = Math.max(0, safeNumber(values.originationPercent, 1));
  const appraisalAndInspection = Math.max(0, safeNumber(values.appraisalAndInspection, 1100));
  const titleAndEscrow = Math.max(0, safeNumber(values.titleAndEscrow, 2400));
  const transferAndRecordingPercent = Math.max(0, safeNumber(values.transferAndRecordingPercent, 0.4));
  const prepaidsAndEscrow = Math.max(0, safeNumber(values.prepaidsAndEscrow, 3500));
  const otherFees = Math.max(0, safeNumber(values.otherFees, 800));

  const origination = (loanAmount * originationPercent) / 100;
  const transfer = (homePrice * transferAndRecordingPercent) / 100;
  const total = origination + appraisalAndInspection + titleAndEscrow + transfer + prepaidsAndEscrow + otherFees;

  return {
    totalClosingCosts: round2(total),
    closingCostsPercentOfPrice: pct(total, homePrice),
    lenderFees: round2(origination),
    transferTaxesAndRecording: round2(transfer),
    closingCostsExcludingPrepaids: round2(total - prepaidsAndEscrow),
  };
};

// --- 5. Homeowners Insurance ------------------------------------------------
export const homeownersInsuranceCalculator: CustomCalculator = (values) => {
  const dwellingCoverage = Math.max(0, safeNumber(values.dwellingCoverage, 300000));
  const ratePerThousand = Math.max(0, safeNumber(values.ratePerThousand, 5));
  const deductibleDiscountPercent = Math.min(100, Math.max(0, safeNumber(values.deductibleDiscountPercent, 5)));
  const extraCoverageAnnual = Math.max(0, safeNumber(values.extraCoverageAnnual, 250));
  const bundleDiscountPercent = Math.min(100, Math.max(0, safeNumber(values.bundleDiscountPercent, 10)));

  const base = (dwellingCoverage / 1000) * ratePerThousand;
  const annual = (base * (1 - deductibleDiscountPercent / 100) + extraCoverageAnnual) * (1 - bundleDiscountPercent / 100);

  return {
    annualPremium: round2(annual),
    monthlyPremium: round2(annual / 12),
    basePremium: round2(base),
    totalDiscounts: round2(base + extraCoverageAnnual - annual),
  };
};

// --- 6. HOA Fee -------------------------------------------------------------
export const hoaFeeCalculator: CustomCalculator = (values) => {
  const monthlyHoaFee = Math.max(0, safeNumber(values.monthlyHoaFee, 350));
  const annualIncreasePercent = safeNumber(values.annualIncreasePercent, 4);
  const years = Math.max(0, Math.min(50, Math.round(safeNumber(values.years, 10))));
  const specialAssessment = Math.max(0, safeNumber(values.specialAssessment, 0));
  const monthlyMortgagePayment = Math.max(0, safeNumber(values.monthlyMortgagePayment, 2200));

  let total = 0;
  for (let y = 0; y < years; y++) total += monthlyHoaFee * 12 * Math.pow(1 + annualIncreasePercent / 100, y);
  total += specialAssessment;
  const future = monthlyHoaFee * Math.pow(1 + annualIncreasePercent / 100, years);

  return {
    totalHoaCostOverPeriod: round2(total),
    monthlyFeeAtEndOfPeriod: round2(future),
    annualHoaCostNow: round2(monthlyHoaFee * 12),
    hoaShareOfHousingPaymentPercent: pct(monthlyHoaFee, monthlyHoaFee + monthlyMortgagePayment),
  };
};

// --- 7. Property Maintenance Cost ----------------------------------------
export const propertyMaintenanceCostCalculator: CustomCalculator = (values) => {
  const homeValue = Math.max(0, safeNumber(values.homeValue, 400000));
  const squareFeet = Math.max(0, safeNumber(values.squareFeet, 2000));
  const homeAgeYears = Math.max(0, safeNumber(values.homeAgeYears, 25));

  const onePercent = homeValue * 0.01;
  const perSqft = squareFeet * 1;
  // Older homes need more: +0% under 10 years, +25% at 10–29, +50% at 30+.
  const ageFactor = homeAgeYears >= 30 ? 1.5 : homeAgeYears >= 10 ? 1.25 : 1;
  const estimate = ((onePercent + perSqft) / 2) * ageFactor;

  return {
    estimatedAnnualMaintenance: round2(estimate),
    monthlySetAside: round2(estimate / 12),
    onePercentRule: round2(onePercent),
    dollarPerSquareFootRule: round2(perSqft),
  };
};

// --- 8. Homeownership Cost (monthly) ---------------------------------------
export const homeownershipCostCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 400000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 6.5));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const propertyTaxRatePercent = Math.max(0, safeNumber(values.propertyTaxRatePercent, 1.1));
  const annualInsurance = Math.max(0, safeNumber(values.annualInsurance, 1800));
  const monthlyHoa = Math.max(0, safeNumber(values.monthlyHoa, 0));
  const maintenancePercent = Math.max(0, safeNumber(values.maintenancePercent, 1));
  const monthlyUtilities = Math.max(0, safeNumber(values.monthlyUtilities, 300));
  const pmiRatePercent = Math.max(0, safeNumber(values.pmiRatePercent, 0.6));

  const loan = homePrice * (1 - downPaymentPercent / 100);
  const pi = payment(loan, interestRatePercent, loanTermYears);
  const tax = (homePrice * propertyTaxRatePercent) / 100 / 12;
  const ins = annualInsurance / 12;
  const pmi = downPaymentPercent < 20 ? (loan * pmiRatePercent) / 100 / 12 : 0;
  const maint = (homePrice * maintenancePercent) / 100 / 12;
  const total = pi + tax + ins + pmi + monthlyHoa + maint + monthlyUtilities;

  return {
    totalMonthlyCost: round2(total),
    monthlyPrincipalAndInterest: round2(pi),
    monthlyTaxesAndInsurance: round2(tax + ins),
    monthlyPmi: round2(pmi),
    monthlyMaintenance: round2(maint),
    annualCostOfOwning: round2(total * 12),
  };
};

// --- 9. Total Cost of Homeownership (over years, net of equity) ------------
export const totalCostOfHomeownershipCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 400000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 20)));
  const closingCostPercent = Math.max(0, safeNumber(values.closingCostPercent, 3));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 6.5));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const annualTaxInsuranceHoa = Math.max(0, safeNumber(values.annualTaxInsuranceHoa, 6200));
  const maintenancePercent = Math.max(0, safeNumber(values.maintenancePercent, 1));
  const costGrowthPercent = safeNumber(values.costGrowthPercent, 3);
  const appreciationPercent = safeNumber(values.appreciationPercent, 3);
  const yearsOwned = Math.max(1, Math.min(40, Math.round(safeNumber(values.yearsOwned, 10))));
  const sellingCostPercent = Math.max(0, safeNumber(values.sellingCostPercent, 6));

  const down = (homePrice * downPaymentPercent) / 100;
  const loan = homePrice - down;
  const pmt = payment(loan, interestRatePercent, loanTermYears);
  const months = Math.min(yearsOwned * 12, Math.round(loanTermYears * 12));
  const balance = balanceAfter(loan, interestRatePercent, pmt, months);
  const paid = pmt * months;

  let other = 0;
  for (let y = 0; y < yearsOwned; y++) {
    const g = Math.pow(1 + costGrowthPercent / 100, y);
    other += annualTaxInsuranceHoa * g + ((homePrice * maintenancePercent) / 100) * g;
  }
  const closing = (homePrice * closingCostPercent) / 100;
  const outOfPocket = down + closing + paid + other;
  const futureValue = homePrice * Math.pow(1 + appreciationPercent / 100, yearsOwned);
  const equityAtSale = futureValue * (1 - sellingCostPercent / 100) - balance;
  const net = outOfPocket - equityAtSale;

  return {
    totalOutOfPocket: round2(outOfPocket),
    equityIfSold: round2(equityAtSale),
    netCostOfOwning: round2(net),
    netCostPerMonth: round2(net / (yearsOwned * 12)),
    interestPaid: round2(paid - (loan - balance)),
  };
};

// --- 10. Buyer Closing Cost (cash to close) --------------------------------
export const buyerClosingCostCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 360000));
  const downPaymentPercent = Math.max(0, safeNumber(values.downPaymentPercent, 10));
  const closingCostPercent = Math.max(0, safeNumber(values.closingCostPercent, 3));
  const earnestMoneyDeposit = Math.max(0, safeNumber(values.earnestMoneyDeposit, 5000));
  const sellerCredits = Math.max(0, safeNumber(values.sellerCredits, 4000));
  const lenderCredits = Math.max(0, safeNumber(values.lenderCredits, 0));

  const down = (homePrice * downPaymentPercent) / 100;
  const closing = (homePrice * closingCostPercent) / 100;
  const cash = down + closing - earnestMoneyDeposit - sellerCredits - lenderCredits;

  return {
    cashToClose: round2(Math.max(0, cash)),
    downPaymentAmount: round2(down),
    closingCosts: round2(closing),
    totalCreditsAndDeposits: round2(earnestMoneyDeposit + sellerCredits + lenderCredits),
    totalCashForPurchase: round2(Math.max(0, cash) + earnestMoneyDeposit),
  };
};

export const realestateHomebuyingCustomCalculators: Record<string, CustomCalculator> = {
  "home-affordability-calculator": homeAffordabilityCalculator,
  "home-price-affordability-calculator": homePriceAffordabilityCalculator,
  "home-down-payment-calculator": homeDownPaymentCalculator,
  "home-closing-cost-calculator": homeClosingCostCalculator,
  "homeowners-insurance-calculator": homeownersInsuranceCalculator,
  "hoa-fee-calculator": hoaFeeCalculator,
  "property-maintenance-cost-calculator": propertyMaintenanceCostCalculator,
  "homeownership-cost-calculator": homeownershipCostCalculator,
  "total-cost-of-homeownership-calculator": totalCostOfHomeownershipCalculator,
  "buyer-closing-cost-calculator": buyerClosingCostCalculator,
};
