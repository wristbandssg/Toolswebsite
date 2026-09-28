/**
 * Batch: "Real Estate Calculators" sub-batch K (Short-Term & Vacation
 * Rentals, 8 tools). Part of the Real Estate build-out — see calc-engine-
 * realestate-rental-income.ts for the full list of 11 sub-batches. Filed
 * under Finance Calculators > Real Estate Calculators.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - shortTermRentalCalculator: revenue from nightly rate, occupancy and
 *    stays (cleaning fees charged vs paid, platform fee) — net operating
 *    income before any mortgage.
 *  - airbnbInvestmentCalculator: whether to BUY a property to host — cap
 *    rate, cash flow and cash-on-cash return with furnishing included.
 *  - airbnbProfitCalculator: a host's MONTHLY profit and margin from actual
 *    bookings after platform, management, cleaning and other costs.
 *  - airbnbRoiCalculator: short-term vs long-term renting the same property
 *    — cash flow and ROI side by side.
 *  - airbnbOccupancyRateCalculator: occupancy, average daily rate (ADR),
 *    revenue per available night and break-even nights.
 *  - airbnbCashFlowCalculator: SEASONAL cash flow — peak, shoulder and off
 *    season — with the worst month and the cash reserve needed.
 *  - vacationRentalCalculator: tax rules for a home you both use and rent —
 *    the 14-day rule and splitting expenses by rental days.
 *  - vacationRentalRoiCalculator: a second home you rent out part-time — net
 *    yearly cost and first-year return including appreciation.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-realestate-short-term-calculators.ts for the tool
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

// --- 1. Short-Term Rental (revenue → NOI) -------------------------------
export const shortTermRentalCalculator: CustomCalculator = (values) => {
  const nightlyRate = Math.max(0, safeNumber(values.nightlyRate, 180));
  const occupancyPercent = Math.min(100, Math.max(0, safeNumber(values.occupancyPercent, 65)));
  const averageStayNights = Math.max(1, safeNumber(values.averageStayNights, 3));
  const cleaningFeeCharged = Math.max(0, safeNumber(values.cleaningFeeCharged, 90));
  const cleaningCostPerStay = Math.max(0, safeNumber(values.cleaningCostPerStay, 75));
  const platformFeePercent = Math.max(0, safeNumber(values.platformFeePercent, 3));
  const monthlyOperatingCosts = Math.max(0, safeNumber(values.monthlyOperatingCosts, 900));

  const nights = (365 * occupancyPercent) / 100;
  const stays = nights / averageStayNights;
  const gross = nights * nightlyRate + stays * cleaningFeeCharged;
  const platform = (gross * platformFeePercent) / 100;
  const noi = gross - platform - stays * cleaningCostPerStay - monthlyOperatingCosts * 12;

  return {
    annualGrossRevenue: round2(gross),
    annualNetOperatingIncome: round2(noi),
    monthlyNetOperatingIncome: round2(noi / 12),
    nightsBookedPerYear: round2(nights),
    revenuePerAvailableNight: round2(gross / 365),
  };
};

// --- 2. Airbnb Investment (buy to host) ---------------------------------
export const airbnbInvestmentCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 400000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 20)));
  const closingCostPercent = Math.max(0, safeNumber(values.closingCostPercent, 3));
  const furnishingCost = Math.max(0, safeNumber(values.furnishingCost, 25000));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const annualGrossRevenue = Math.max(0, safeNumber(values.annualGrossRevenue, 72000));
  const operatingExpensePercent = Math.max(0, safeNumber(values.operatingExpensePercent, 40));
  const annualTaxesAndInsurance = Math.max(0, safeNumber(values.annualTaxesAndInsurance, 7000));

  const loan = purchasePrice * (1 - downPaymentPercent / 100);
  const cash = purchasePrice - loan + (purchasePrice * closingCostPercent) / 100 + furnishingCost;
  const noi = annualGrossRevenue * (1 - operatingExpensePercent / 100) - annualTaxesAndInsurance;
  const debt = payment(loan, interestRatePercent, loanTermYears) * 12;
  const cf = noi - debt;

  return {
    annualCashFlow: round2(cf),
    cashOnCashReturnPercent: pct(cf, cash),
    capRatePercent: pct(noi, purchasePrice + furnishingCost),
    netOperatingIncome: round2(noi),
    totalCashInvested: round2(cash),
  };
};

// --- 3. Airbnb Profit (monthly, from bookings) --------------------------
export const airbnbProfitCalculator: CustomCalculator = (values) => {
  const monthlyBookingRevenue = Math.max(0, safeNumber(values.monthlyBookingRevenue, 5500));
  const platformFeePercent = Math.max(0, safeNumber(values.platformFeePercent, 3));
  const managementFeePercent = Math.max(0, safeNumber(values.managementFeePercent, 20));
  const cleaningCosts = Math.max(0, safeNumber(values.cleaningCosts, 600));
  const suppliesAndUtilities = Math.max(0, safeNumber(values.suppliesAndUtilities, 450));
  const mortgageOrRent = Math.max(0, safeNumber(values.mortgageOrRent, 2300));
  const otherCosts = Math.max(0, safeNumber(values.otherCosts, 250));

  const fees = (monthlyBookingRevenue * (platformFeePercent + managementFeePercent)) / 100;
  const profit = monthlyBookingRevenue - fees - cleaningCosts - suppliesAndUtilities - mortgageOrRent - otherCosts;

  return {
    monthlyProfit: round2(profit),
    annualProfit: round2(profit * 12),
    profitMarginPercent: pct(profit, monthlyBookingRevenue),
    platformAndManagementFees: round2(fees),
  };
};

// --- 4. Airbnb ROI (short-term vs long-term) ----------------------------
export const airbnbRoiCalculator: CustomCalculator = (values) => {
  const cashInvested = Math.max(0.01, safeNumber(values.cashInvested, 90000));
  const furnishingCost = Math.max(0, safeNumber(values.furnishingCost, 20000));
  const annualDebtService = Math.max(0, safeNumber(values.annualDebtService, 22000));
  const strAnnualRevenue = Math.max(0, safeNumber(values.strAnnualRevenue, 65000));
  const strAnnualExpenses = Math.max(0, safeNumber(values.strAnnualExpenses, 28000));
  const ltrMonthlyRent = Math.max(0, safeNumber(values.ltrMonthlyRent, 2500));
  const ltrAnnualExpenses = Math.max(0, safeNumber(values.ltrAnnualExpenses, 7500));

  const strCf = strAnnualRevenue - strAnnualExpenses - annualDebtService;
  const ltrCf = ltrMonthlyRent * 12 - ltrAnnualExpenses - annualDebtService;

  return {
    shortTermAnnualCashFlow: round2(strCf),
    longTermAnnualCashFlow: round2(ltrCf),
    shortTermRoiPercent: pct(strCf, cashInvested + furnishingCost),
    longTermRoiPercent: pct(ltrCf, cashInvested),
    extraCashFlowFromShortTerm: round2(strCf - ltrCf),
  };
};

// --- 5. Airbnb Occupancy Rate (ADR, RevPAN, break-even) -----------------
export const airbnbOccupancyRateCalculator: CustomCalculator = (values) => {
  const nightsBooked = Math.max(0, safeNumber(values.nightsBooked, 21));
  const nightsAvailable = Math.max(1, safeNumber(values.nightsAvailable, 30));
  const bookingRevenue = Math.max(0, safeNumber(values.bookingRevenue, 3900));
  const fixedCostsForPeriod = Math.max(0, safeNumber(values.fixedCostsForPeriod, 2600));
  const variableCostPerNight = Math.max(0, safeNumber(values.variableCostPerNight, 30));

  const adr = nightsBooked > 0 ? bookingRevenue / nightsBooked : 0;
  const margin = adr - variableCostPerNight;
  const beNights = margin > 0 ? fixedCostsForPeriod / margin : 0;

  return {
    occupancyRatePercent: round2(Math.min(100, (nightsBooked / nightsAvailable) * 100)),
    averageDailyRate: round2(adr),
    revenuePerAvailableNight: round2(bookingRevenue / nightsAvailable),
    breakEvenNights: round2(beNights),
    breakEvenOccupancyPercent: round2((beNights / nightsAvailable) * 100),
  };
};

// --- 6. Airbnb Cash Flow (seasonal) -------------------------------------
export const airbnbCashFlowCalculator: CustomCalculator = (values) => {
  const peakMonths = Math.max(0, Math.min(12, Math.round(safeNumber(values.peakMonths, 4))));
  const shoulderMonths = Math.max(0, Math.min(12 - peakMonths, Math.round(safeNumber(values.shoulderMonths, 4))));
  const offMonths = 12 - peakMonths - shoulderMonths;
  const peakMonthlyRevenue = Math.max(0, safeNumber(values.peakMonthlyRevenue, 7000));
  const shoulderMonthlyRevenue = Math.max(0, safeNumber(values.shoulderMonthlyRevenue, 4200));
  const offMonthlyRevenue = Math.max(0, safeNumber(values.offMonthlyRevenue, 1800));
  const variableCostPercent = Math.max(0, safeNumber(values.variableCostPercent, 30));
  const fixedMonthlyCosts = Math.max(0, safeNumber(values.fixedMonthlyCosts, 2900));

  const cf = (rev: number) => rev * (1 - variableCostPercent / 100) - fixedMonthlyCosts;
  const seasons = [
    { months: peakMonths, cf: cf(peakMonthlyRevenue) },
    { months: shoulderMonths, cf: cf(shoulderMonthlyRevenue) },
    { months: offMonths, cf: cf(offMonthlyRevenue) },
  ].filter((s) => s.months > 0);
  const annual = seasons.reduce((a, s) => a + s.months * s.cf, 0);
  const worst = Math.min(...seasons.map((s) => s.cf));
  const best = Math.max(...seasons.map((s) => s.cf));
  const reserve = seasons.reduce((a, s) => a + s.months * Math.max(0, -s.cf), 0);

  return {
    annualCashFlow: round2(annual),
    averageMonthlyCashFlow: round2(annual / 12),
    worstMonthCashFlow: round2(worst),
    bestMonthCashFlow: round2(best),
    cashReserveForSlowMonths: round2(reserve),
  };
};

// --- 7. Vacation Rental (14-day rule, expense split) --------------------
export const vacationRentalCalculator: CustomCalculator = (values) => {
  const daysRented = Math.max(0, Math.min(366, Math.round(safeNumber(values.daysRented, 90))));
  const personalUseDays = Math.max(0, Math.min(366, Math.round(safeNumber(values.personalUseDays, 30))));
  const grossRentalIncome = Math.max(0, safeNumber(values.grossRentalIncome, 22000));
  const totalAnnualExpenses = Math.max(0, safeNumber(values.totalAnnualExpenses, 24000));
  const marginalRatePercent = Math.max(0, safeNumber(values.marginalRatePercent, 24));

  const totalDays = daysRented + personalUseDays;
  // Rented 14 days or fewer: the income is tax-free and no rental deductions.
  const under15 = daysRented < 15;
  const share = totalDays > 0 ? daysRented / totalDays : 0;
  let deductible = under15 ? 0 : totalAnnualExpenses * share;
  // Personal use over the greater of 14 days or 10% of rented days makes it a
  // residence: rental deductions can't exceed rental income (no loss).
  const isResidence = personalUseDays > Math.max(14, daysRented * 0.1);
  if (!under15 && isResidence) deductible = Math.min(deductible, grossRentalIncome);
  const taxable = under15 ? 0 : grossRentalIncome - deductible;

  return {
    taxableRentalIncome: round2(taxable),
    deductibleRentalExpenses: round2(deductible),
    rentalUsePercent: round2(share * 100),
    estimatedTaxOnRental: round2((Math.max(0, taxable) * marginalRatePercent) / 100),
    taxFreeRentalIncome: under15 ? round2(grossRentalIncome) : 0,
  };
};

// --- 8. Vacation Rental ROI (second home) -------------------------------
export const vacationRentalRoiCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 450000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 20)));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const annualOwnershipCosts = Math.max(0, safeNumber(values.annualOwnershipCosts, 14000));
  const annualNetRentalIncome = Math.max(0, safeNumber(values.annualNetRentalIncome, 30000));
  const appreciationPercent = safeNumber(values.appreciationPercent, 3);

  const down = (purchasePrice * downPaymentPercent) / 100;
  const loan = purchasePrice - down;
  const pmt = payment(loan, interestRatePercent, loanTermYears);
  const principal = loan - balanceAfter(loan, interestRatePercent, pmt, Math.min(12, Math.round(loanTermYears * 12)));
  const allCosts = pmt * 12 + annualOwnershipCosts;
  const netCost = allCosts - annualNetRentalIncome;
  const appreciation = (purchasePrice * appreciationPercent) / 100;
  const gain = annualNetRentalIncome - allCosts + principal + appreciation;

  return {
    netAnnualCostOfOwning: round2(netCost),
    rentalIncomeCoversPercent: pct(annualNetRentalIncome, allCosts),
    firstYearReturnPercent: pct(gain, down),
    firstYearTotalGain: round2(gain),
    firstYearAppreciation: round2(appreciation),
    firstYearPrincipalPaid: round2(principal),
  };
};

export const realestateShortTermCustomCalculators: Record<string, CustomCalculator> = {
  "short-term-rental-calculator": shortTermRentalCalculator,
  "airbnb-investment-calculator": airbnbInvestmentCalculator,
  "airbnb-profit-calculator": airbnbProfitCalculator,
  "airbnb-roi-calculator": airbnbRoiCalculator,
  "airbnb-occupancy-rate-calculator": airbnbOccupancyRateCalculator,
  "airbnb-cash-flow-calculator": airbnbCashFlowCalculator,
  "vacation-rental-calculator": vacationRentalCalculator,
  "vacation-rental-roi-calculator": vacationRentalRoiCalculator,
};
