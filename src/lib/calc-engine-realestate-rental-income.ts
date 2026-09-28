/**
 * Batch: "Real Estate Calculators" sub-batch A (Rental Income & Expenses, 12
 * tools). Part of the Real Estate tool-list build-out — 121 tools in the
 * source list, 9 skipped as exact-slug duplicates (rental-property, real-
 * estate-roi, cap-rate, rent-vs-buy, house-flipping, mortgage-
 * affordability, down-payment and closing-cost calculators in
 * calc-engine-finance-real-estate.ts; property-tax-calculator under Tax),
 * 112 built across 11 sub-batches, all filed under Finance Calculators >
 * Real Estate Calculators (real-estate-calculators):
 *  - calc-engine-realestate-rental-income.ts (this file)
 *  - calc-engine-realestate-rental-ratios.ts
 *  - calc-engine-realestate-value-appreciation.ts
 *  - calc-engine-realestate-returns-equity-debt.ts
 *  - calc-engine-realestate-strategies.ts
 *  - calc-engine-realestate-flips.ts
 *  - calc-engine-realestate-homebuying.ts
 *  - calc-engine-realestate-selling-tax.ts
 *  - calc-engine-realestate-mortgage-commercial.ts
 *  - calc-engine-realestate-multifamily-land.ts
 *  - calc-engine-realestate-short-term.ts
 *
 * Near-namesakes, and how each is deliberately different (rental-property-
 * calculator already gives cash flow and cash-on-cash from rent and ONE
 * lump expense figure):
 *  - rentalIncomeCalculator: gross potential and effective income from
 *    several units plus other income (parking, laundry, pets) less vacancy.
 *  - rentalCashFlowCalculator: MONTHLY cash flow with every expense
 *    itemized, the mortgage worked out, and % reserves for repairs and capex.
 *  - rentalPropertyRoiCalculator: year-1 total return from its four parts —
 *    cash flow, loan paydown and appreciation — on cash invested.
 *  - cashOnCashReturnCalculator: yearly pre-tax cash flow ÷ ALL cash put in
 *    (down payment, closing costs, repairs).
 *  - netOperatingIncomeCalculator: NOI from itemized income and operating
 *    expenses (excluding the mortgage).
 *  - operatingExpenseRatioCalculator: operating expenses as a share of
 *    effective gross income.
 *  - vacancyRateCalculator: physical vacancy from vacant unit-days.
 *  - rentalVacancyLossCalculator: rent lost to vacancy PLUS turnover costs.
 *  - propertyManagementFeeCalculator: monthly %, leasing fees and fixed fees
 *    turned into a yearly cost and an effective rate.
 *  - rentalExpenseCalculator: a yearly expense budget per property.
 *  - rentalPropertyProfitCalculator: TAXABLE rental profit after mortgage
 *    interest and depreciation — vs the cash flow.
 *  - rentalPropertyBreakEvenCalculator: break-even occupancy and rent.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-realestate-rental-income-calculators.ts for the tool
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

// Residential rental buildings are depreciated over 27.5 years (IRS Pub. 527).
const RESIDENTIAL_RECOVERY_YEARS = 27.5;

// --- 1. Rental Income Calculator (units + other income − vacancy) ---------
export const rentalIncomeCalculator: CustomCalculator = (values) => {
  const units = Math.max(0, Math.round(safeNumber(values.units, 4)));
  const monthlyRentPerUnit = Math.max(0, safeNumber(values.monthlyRentPerUnit, 1400));
  const otherMonthlyIncome = Math.max(0, safeNumber(values.otherMonthlyIncome, 250));
  const vacancyPercent = Math.min(100, Math.max(0, safeNumber(values.vacancyPercent, 5)));

  const gpi = (units * monthlyRentPerUnit + otherMonthlyIncome) * 12;
  const vacancy = (units * monthlyRentPerUnit * 12 * vacancyPercent) / 100;
  const egi = gpi - vacancy;

  return {
    effectiveGrossIncomeYearly: round2(egi),
    grossPotentialIncomeYearly: round2(gpi),
    vacancyLossYearly: round2(vacancy),
    effectiveIncomePerMonth: round2(egi / 12),
  };
};

// --- 2. Rental Cash Flow Calculator (monthly, itemized) ------------------
export const rentalCashFlowCalculator: CustomCalculator = (values) => {
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 2200));
  const vacancyPercent = Math.min(100, Math.max(0, safeNumber(values.vacancyPercent, 5)));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 240000));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7));
  const loanYears = Math.max(1, safeNumber(values.loanYears, 30));
  const monthlyPropertyTax = Math.max(0, safeNumber(values.monthlyPropertyTax, 250));
  const monthlyInsurance = Math.max(0, safeNumber(values.monthlyInsurance, 110));
  const monthlyHoaAndUtilities = Math.max(0, safeNumber(values.monthlyHoaAndUtilities, 0));
  const repairsPercent = Math.max(0, safeNumber(values.repairsPercent, 5));
  const capexPercent = Math.max(0, safeNumber(values.capexPercent, 5));
  const managementPercent = Math.max(0, safeNumber(values.managementPercent, 8));

  const effective = monthlyRent * (1 - vacancyPercent / 100);
  const mortgage = payment(loanAmount, interestRatePercent, loanYears);
  const reserves = (monthlyRent * (repairsPercent + capexPercent + managementPercent)) / 100;
  const operating = monthlyPropertyTax + monthlyInsurance + monthlyHoaAndUtilities + reserves;
  const cashFlow = effective - mortgage - operating;

  return {
    monthlyCashFlow: round2(cashFlow),
    yearlyCashFlow: round2(cashFlow * 12),
    monthlyMortgagePayment: round2(mortgage),
    monthlyOperatingExpenses: round2(operating),
    expensesShareOfRentPercent: pct(operating, monthlyRent),
  };
};

// --- 3. Rental Property ROI (year-1 total return) ------------------------
export const rentalPropertyRoiCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 300000));
  const cashInvested = Math.max(0.01, safeNumber(values.cashInvested, 72000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 240000));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7));
  const loanYears = Math.max(1, safeNumber(values.loanYears, 30));
  const annualCashFlow = safeNumber(values.annualCashFlow, 3600);
  const appreciationPercent = safeNumber(values.appreciationPercent, 3);

  const pmt = payment(loanAmount, interestRatePercent, loanYears);
  const paydown = loanAmount - balanceAfter(loanAmount, interestRatePercent, pmt, 12);
  const appreciation = (purchasePrice * appreciationPercent) / 100;
  const total = annualCashFlow + paydown + appreciation;

  return {
    totalRoiPercent: pct(total, cashInvested),
    totalReturnYear1: round2(total),
    cashFlowReturnPercent: pct(annualCashFlow, cashInvested),
    loanPaydownYear1: round2(paydown),
    appreciationYear1: round2(appreciation),
  };
};

// --- 4. Cash-on-Cash Return (all cash invested) -----------------------------
export const cashOnCashReturnCalculator: CustomCalculator = (values) => {
  const annualPreTaxCashFlow = safeNumber(values.annualPreTaxCashFlow, 4800);
  const downPayment = Math.max(0, safeNumber(values.downPayment, 60000));
  const closingCosts = Math.max(0, safeNumber(values.closingCosts, 7500));
  const repairsAndSetup = Math.max(0, safeNumber(values.repairsAndSetup, 4500));

  const cashIn = downPayment + closingCosts + repairsAndSetup;

  return {
    cashOnCashReturnPercent: pct(annualPreTaxCashFlow, cashIn),
    totalCashInvested: round2(cashIn),
    monthlyCashFlow: round2(annualPreTaxCashFlow / 12),
    // Years of cash flow to get your cash back (0 = negative cash flow).
    yearsToRecoverCash: annualPreTaxCashFlow > 0 ? round2(cashIn / annualPreTaxCashFlow) : 0,
  };
};

// --- 5. Net Operating Income (NOI) ------------------------------------------
export const netOperatingIncomeCalculator: CustomCalculator = (values) => {
  const grossRentalIncome = Math.max(0, safeNumber(values.grossRentalIncome, 96000));
  const otherIncome = Math.max(0, safeNumber(values.otherIncome, 3000));
  const vacancyPercent = Math.min(100, Math.max(0, safeNumber(values.vacancyPercent, 6)));
  const propertyTaxes = Math.max(0, safeNumber(values.propertyTaxes, 9000));
  const insurance = Math.max(0, safeNumber(values.insurance, 3500));
  const repairsMaintenance = Math.max(0, safeNumber(values.repairsMaintenance, 6000));
  const management = Math.max(0, safeNumber(values.management, 7500));
  const utilitiesAndOther = Math.max(0, safeNumber(values.utilitiesAndOther, 4000));

  const egi = grossRentalIncome * (1 - vacancyPercent / 100) + otherIncome;
  const opex = propertyTaxes + insurance + repairsMaintenance + management + utilitiesAndOther;

  return {
    netOperatingIncome: round2(egi - opex),
    effectiveGrossIncome: round2(egi),
    totalOperatingExpenses: round2(opex),
    noiMarginPercent: pct(egi - opex, egi),
  };
};

// --- 6. Operating Expense Ratio --------------------------------------------
export const operatingExpenseRatioCalculator: CustomCalculator = (values) => {
  const effectiveGrossIncome = Math.max(0, safeNumber(values.effectiveGrossIncome, 90000));
  const operatingExpenses = Math.max(0, safeNumber(values.operatingExpenses, 36000));
  const targetRatioPercent = Math.max(0, safeNumber(values.targetRatioPercent, 35));

  return {
    operatingExpenseRatioPercent: pct(operatingExpenses, effectiveGrossIncome),
    netOperatingIncome: round2(effectiveGrossIncome - operatingExpenses),
    expensesAtTargetRatio: round2((effectiveGrossIncome * targetRatioPercent) / 100),
    savingsNeededForTarget: round2(Math.max(0, operatingExpenses - (effectiveGrossIncome * targetRatioPercent) / 100)),
  };
};

// --- 7. Vacancy Rate Calculator (unit-days) ---------------------------------
export const vacancyRateCalculator: CustomCalculator = (values) => {
  const units = Math.max(1, Math.round(safeNumber(values.units, 10)));
  const daysInPeriod = Math.max(1, safeNumber(values.daysInPeriod, 365));
  const totalVacantUnitDays = Math.max(0, safeNumber(values.totalVacantUnitDays, 240));

  const available = units * daysInPeriod;
  const rate = Math.min(1, totalVacantUnitDays / available);

  return {
    vacancyRatePercent: round2(rate * 100),
    occupancyRatePercent: round2((1 - rate) * 100),
    averageVacantDaysPerUnit: round2(totalVacantUnitDays / units),
    totalUnitDaysAvailable: available,
  };
};

// --- 8. Rental Vacancy Loss (rent lost + turnover costs) ------------------
export const rentalVacancyLossCalculator: CustomCalculator = (values) => {
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 1800));
  const turnoversPerYear = Math.max(0, safeNumber(values.turnoversPerYear, 1));
  const vacantDaysPerTurnover = Math.max(0, safeNumber(values.vacantDaysPerTurnover, 30));
  const turnoverCostEach = Math.max(0, safeNumber(values.turnoverCostEach, 1200));

  const dailyRent = (monthlyRent * 12) / 365;
  const lostRent = dailyRent * vacantDaysPerTurnover * turnoversPerYear;
  const turnover = turnoverCostEach * turnoversPerYear;

  return {
    totalVacancyCostPerYear: round2(lostRent + turnover),
    rentLostPerYear: round2(lostRent),
    turnoverCostsPerYear: round2(turnover),
    effectiveVacancyRatePercent: pct(lostRent + turnover, monthlyRent * 12),
  };
};

// --- 9. Property Management Fee Calculator ---------------------------------
export const propertyManagementFeeCalculator: CustomCalculator = (values) => {
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 2000));
  const managementFeePercent = Math.max(0, safeNumber(values.managementFeePercent, 9));
  const leasingFeePercentOfMonth = Math.max(0, safeNumber(values.leasingFeePercentOfMonth, 50));
  const newLeasesPerYear = Math.max(0, safeNumber(values.newLeasesPerYear, 1));
  const otherFeesPerYear = Math.max(0, safeNumber(values.otherFeesPerYear, 200));

  const monthly = (monthlyRent * managementFeePercent) / 100;
  const leasing = ((monthlyRent * leasingFeePercentOfMonth) / 100) * newLeasesPerYear;
  const total = monthly * 12 + leasing + otherFeesPerYear;

  return {
    totalManagementCostPerYear: round2(total),
    monthlyManagementFee: round2(monthly),
    leasingFeesPerYear: round2(leasing),
    effectiveRateOfRentPercent: pct(total, monthlyRent * 12),
  };
};

// --- 10. Rental Expense Calculator (yearly budget) ---------------------------
export const rentalExpenseCalculator: CustomCalculator = (values) => {
  const propertyTax = Math.max(0, safeNumber(values.propertyTax, 3600));
  const insurance = Math.max(0, safeNumber(values.insurance, 1500));
  const repairs = Math.max(0, safeNumber(values.repairs, 1800));
  const capitalReserves = Math.max(0, safeNumber(values.capitalReserves, 1800));
  const management = Math.max(0, safeNumber(values.management, 2200));
  const utilitiesHoaOther = Math.max(0, safeNumber(values.utilitiesHoaOther, 900));
  const annualRent = Math.max(0, safeNumber(values.annualRent, 26400));

  const total = propertyTax + insurance + repairs + capitalReserves + management + utilitiesHoaOther;

  return {
    totalYearlyExpenses: round2(total),
    monthlyExpenses: round2(total / 12),
    expensesShareOfRentPercent: pct(total, annualRent),
    incomeLeftBeforeMortgage: round2(annualRent - total),
  };
};

// --- 11. Rental Property Profit (taxable, with depreciation) -------------
export const rentalPropertyProfitCalculator: CustomCalculator = (values) => {
  const annualRent = Math.max(0, safeNumber(values.annualRent, 30000));
  const operatingExpenses = Math.max(0, safeNumber(values.operatingExpenses, 10000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 240000));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7));
  const loanYears = Math.max(1, safeNumber(values.loanYears, 30));
  const buildingValue = Math.max(0, safeNumber(values.buildingValue, 240000));

  const pmt = payment(loanAmount, interestRatePercent, loanYears);
  const principalY1 = loanAmount - balanceAfter(loanAmount, interestRatePercent, pmt, 12);
  const interestY1 = pmt * 12 - principalY1;
  const depreciation = buildingValue / RESIDENTIAL_RECOVERY_YEARS;
  const cashFlow = annualRent - operatingExpenses - pmt * 12;

  return {
    taxableRentalProfit: round2(annualRent - operatingExpenses - interestY1 - depreciation),
    cashFlowAfterMortgage: round2(cashFlow),
    mortgageInterestYear1: round2(interestY1),
    depreciationDeduction: round2(depreciation),
  };
};

// --- 12. Rental Property Break-Even (occupancy and rent) ------------------
export const rentalPropertyBreakEvenCalculator: CustomCalculator = (values) => {
  const grossPotentialRent = Math.max(0.01, safeNumber(values.grossPotentialRent, 48000));
  const operatingExpenses = Math.max(0, safeNumber(values.operatingExpenses, 16000));
  const annualDebtService = Math.max(0, safeNumber(values.annualDebtService, 22000));
  const units = Math.max(1, Math.round(safeNumber(values.units, 2)));

  const needed = operatingExpenses + annualDebtService;

  return {
    breakEvenOccupancyPercent: round2((needed / grossPotentialRent) * 100),
    breakEvenRentPerUnitPerMonth: round2(needed / units / 12),
    cushionAtFullOccupancy: round2(grossPotentialRent - needed),
  };
};

export const realestateRentalIncomeCustomCalculators: Record<string, CustomCalculator> = {
  "rental-income-calculator": rentalIncomeCalculator,
  "rental-cash-flow-calculator": rentalCashFlowCalculator,
  "rental-property-roi-calculator": rentalPropertyRoiCalculator,
  "cash-on-cash-return-calculator": cashOnCashReturnCalculator,
  "net-operating-income-calculator": netOperatingIncomeCalculator,
  "operating-expense-ratio-calculator": operatingExpenseRatioCalculator,
  "vacancy-rate-calculator": vacancyRateCalculator,
  "rental-vacancy-loss-calculator": rentalVacancyLossCalculator,
  "property-management-fee-calculator": propertyManagementFeeCalculator,
  "rental-expense-calculator": rentalExpenseCalculator,
  "rental-property-profit-calculator": rentalPropertyProfitCalculator,
  "rental-property-break-even-calculator": rentalPropertyBreakEvenCalculator,
};
