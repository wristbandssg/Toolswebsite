/**
 * Batch: "Real Estate Calculators" sub-batch J (Multifamily, Land &
 * Development, 9 tools). Part of the Real Estate build-out — see
 * calc-engine-realestate-rental-income.ts for the full list of 11
 * sub-batches. Filed under Finance Calculators > Real Estate Calculators.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - multifamilyPropertyCalculator: a building with two unit types — gross
 *    rent, price per door and gross rent multiplier.
 *  - multifamilyCapRateCalculator: cap rate from per-unit rents and per-unit
 *    expenses, and the value a rent bump adds at that cap rate.
 *  - multifamilyCashFlowCalculator: financed cash flow for the building and
 *    PER DOOR, with a capital-expenditure reserve per unit.
 *  - multifamilyRoiCalculator: a VALUE-ADD plan — renovate units, raise rents
 *    and measure the return on the renovation money.
 *  - apartmentInvestmentCalculator: a limited partner in an apartment
 *    syndication — preferred return, profit split and equity multiple.
 *  - realEstateDevelopmentCalculator: residual land value — what a developer
 *    can pay for land after building costs and target profit.
 *  - landInvestmentCalculator: buy land, carry it (tax, interest) and sell —
 *    profit and annualized return.
 *  - landValueCalculator: land value from comparable sales per acre with
 *    adjustments for location, access and utilities.
 *  - propertyDevelopmentProfitCalculator: developer's profit on cost and
 *    margin on gross development value (GDV).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-realestate-multifamily-land-calculators.ts for the tool
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

const pct = (a: number, b: number) => (b !== 0 ? round2((a / b) * 100) : 0);

// --- 1. Multifamily Property (unit mix) -----------------------------------
export const multifamilyPropertyCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 1800000));
  const unitsTypeA = Math.max(0, Math.round(safeNumber(values.unitsTypeA, 12)));
  const rentTypeA = Math.max(0, safeNumber(values.rentTypeA, 1200));
  const unitsTypeB = Math.max(0, Math.round(safeNumber(values.unitsTypeB, 8)));
  const rentTypeB = Math.max(0, safeNumber(values.rentTypeB, 1500));
  const otherMonthlyIncome = Math.max(0, safeNumber(values.otherMonthlyIncome, 600));

  const units = unitsTypeA + unitsTypeB;
  const monthly = unitsTypeA * rentTypeA + unitsTypeB * rentTypeB + otherMonthlyIncome;
  const annual = monthly * 12;

  return {
    grossAnnualRent: round2(annual),
    totalUnits: units,
    pricePerDoor: units > 0 ? round2(purchasePrice / units) : 0,
    averageRentPerUnit: units > 0 ? round2((monthly - otherMonthlyIncome) / units) : 0,
    grossRentMultiplier: annual > 0 ? round2(purchasePrice / annual) : 0,
  };
};

// --- 2. Multifamily Cap Rate (per-unit) -----------------------------------
export const multifamilyCapRateCalculator: CustomCalculator = (values) => {
  const numberOfUnits = Math.max(0, Math.round(safeNumber(values.numberOfUnits, 24)));
  const averageMonthlyRent = Math.max(0, safeNumber(values.averageMonthlyRent, 1300));
  const vacancyPercent = Math.min(100, Math.max(0, safeNumber(values.vacancyPercent, 6)));
  const annualExpensesPerUnit = Math.max(0, safeNumber(values.annualExpensesPerUnit, 6500));
  const purchasePrice = Math.max(0.01, safeNumber(values.purchasePrice, 2900000));
  const plannedRentIncrease = Math.max(0, safeNumber(values.plannedRentIncrease, 100));

  const occ = 1 - vacancyPercent / 100;
  const noi = numberOfUnits * (averageMonthlyRent * 12 * occ - annualExpensesPerUnit);
  const cap = noi / purchasePrice;
  const addedNoi = numberOfUnits * plannedRentIncrease * 12 * occ;

  return {
    capRatePercent: round2(cap * 100),
    netOperatingIncome: round2(noi),
    noiPerUnit: numberOfUnits > 0 ? round2(noi / numberOfUnits) : 0,
    valueAddedByRentIncrease: cap > 0 ? round2(addedNoi / cap) : 0,
  };
};

// --- 3. Multifamily Cash Flow (per door) ---------------------------------
export const multifamilyCashFlowCalculator: CustomCalculator = (values) => {
  const numberOfUnits = Math.max(1, Math.round(safeNumber(values.numberOfUnits, 16)));
  const averageMonthlyRent = Math.max(0, safeNumber(values.averageMonthlyRent, 1250));
  const vacancyPercent = Math.min(100, Math.max(0, safeNumber(values.vacancyPercent, 5)));
  const operatingExpenseRatioPercent = Math.max(0, safeNumber(values.operatingExpenseRatioPercent, 45));
  const capexReservePerUnitAnnual = Math.max(0, safeNumber(values.capexReservePerUnitAnnual, 300));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 1200000));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 6.75));
  const amortizationYears = Math.max(1, safeNumber(values.amortizationYears, 30));

  const egi = numberOfUnits * averageMonthlyRent * 12 * (1 - vacancyPercent / 100);
  const noi = egi * (1 - operatingExpenseRatioPercent / 100);
  const debt = payment(loanAmount, interestRatePercent, amortizationYears) * 12;
  const cf = noi - debt - capexReservePerUnitAnnual * numberOfUnits;

  return {
    annualCashFlow: round2(cf),
    monthlyCashFlow: round2(cf / 12),
    monthlyCashFlowPerDoor: round2(cf / 12 / numberOfUnits),
    netOperatingIncome: round2(noi),
    dscr: debt > 0 ? round2(noi / debt) : 0,
  };
};

// --- 4. Multifamily ROI (value-add renovation) ---------------------------
export const multifamilyRoiCalculator: CustomCalculator = (values) => {
  const unitsRenovated = Math.max(0, Math.round(safeNumber(values.unitsRenovated, 20)));
  const renovationCostPerUnit = Math.max(0, safeNumber(values.renovationCostPerUnit, 12000));
  const rentIncreasePerUnit = Math.max(0, safeNumber(values.rentIncreasePerUnit, 175));
  const capRatePercent = Math.max(0.1, safeNumber(values.capRatePercent, 6.5));
  const extraExpensePercent = Math.min(100, Math.max(0, safeNumber(values.extraExpensePercent, 5)));

  const cost = unitsRenovated * renovationCostPerUnit;
  const addedNoi = unitsRenovated * rentIncreasePerUnit * 12 * (1 - extraExpensePercent / 100);
  const valueAdded = addedNoi / (capRatePercent / 100);

  return {
    returnOnRenovationPercent: pct(addedNoi, cost),
    addedAnnualNoi: round2(addedNoi),
    valueCreated: round2(valueAdded),
    equityCreatedAfterCost: round2(valueAdded - cost),
    paybackYears: addedNoi > 0 ? round2(cost / addedNoi) : 0,
  };
};

// --- 5. Apartment Investment (LP in a syndication) ----------------------
export const apartmentInvestmentCalculator: CustomCalculator = (values) => {
  const investment = Math.max(0, safeNumber(values.investment, 100000));
  const preferredReturnPercent = Math.max(0, safeNumber(values.preferredReturnPercent, 7));
  const annualCashYieldPercent = Math.max(0, safeNumber(values.annualCashYieldPercent, 6));
  const holdYears = Math.max(1, Math.min(20, Math.round(safeNumber(values.holdYears, 5))));
  const saleProfitMultiple = Math.max(0, safeNumber(values.saleProfitMultiple, 1.6));
  const lpSplitPercent = Math.min(100, Math.max(0, safeNumber(values.lpSplitPercent, 70)));

  // Yearly distributions; any shortfall vs the preferred return accrues.
  const distributions = (investment * annualCashYieldPercent) / 100 * holdYears;
  const prefOwed = (investment * preferredReturnPercent) / 100 * holdYears;
  const prefShortfall = Math.max(0, prefOwed - distributions);
  // At sale: capital back, then any unpaid pref, then the profit split.
  const saleProceeds = investment * saleProfitMultiple;
  const capitalBack = Math.min(saleProceeds, investment);
  const prefCatchUp = Math.min(Math.max(0, saleProceeds - capitalBack), prefShortfall);
  const remaining = Math.max(0, saleProceeds - capitalBack - prefCatchUp);
  const lpShare = (remaining * lpSplitPercent) / 100;
  const total = distributions + capitalBack + prefCatchUp + lpShare;
  const multiple = investment > 0 ? total / investment : 0;

  return {
    totalReturnedToYou: round2(total),
    totalProfit: round2(total - investment),
    equityMultiple: round2(multiple),
    annualizedReturnPercent: multiple > 0 ? round2((Math.pow(multiple, 1 / holdYears) - 1) * 100) : -100,
    cashDistributionsDuringHold: round2(distributions),
  };
};

// --- 6. Real Estate Development (residual land value) --------------------
export const realEstateDevelopmentCalculator: CustomCalculator = (values) => {
  const numberOfUnits = Math.max(0, Math.round(safeNumber(values.numberOfUnits, 10)));
  const salePricePerUnit = Math.max(0, safeNumber(values.salePricePerUnit, 450000));
  const buildCostPerUnit = Math.max(0, safeNumber(values.buildCostPerUnit, 260000));
  const softCostPercent = Math.max(0, safeNumber(values.softCostPercent, 15));
  const financingCostPercent = Math.max(0, safeNumber(values.financingCostPercent, 6));
  const sellingCostPercent = Math.max(0, safeNumber(values.sellingCostPercent, 5));
  const targetProfitPercentOfGdv = Math.max(0, safeNumber(values.targetProfitPercentOfGdv, 15));

  const gdv = numberOfUnits * salePricePerUnit;
  const hard = numberOfUnits * buildCostPerUnit;
  const soft = (hard * softCostPercent) / 100;
  const finance = ((hard + soft) * financingCostPercent) / 100;
  const selling = (gdv * sellingCostPercent) / 100;
  const profit = (gdv * targetProfitPercentOfGdv) / 100;
  const residual = gdv - hard - soft - finance - selling - profit;

  return {
    residualLandValue: round2(residual),
    grossDevelopmentValue: round2(gdv),
    totalDevelopmentCosts: round2(hard + soft + finance + selling),
    targetProfit: round2(profit),
    landValuePerUnit: numberOfUnits > 0 ? round2(residual / numberOfUnits) : 0,
  };
};

// --- 7. Land Investment (buy, carry, sell) ------------------------------
export const landInvestmentCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 120000));
  const closingCosts = Math.max(0, safeNumber(values.closingCosts, 3000));
  const annualPropertyTax = Math.max(0, safeNumber(values.annualPropertyTax, 1500));
  const otherAnnualCarryingCosts = Math.max(0, safeNumber(values.otherAnnualCarryingCosts, 800));
  const holdYears = Math.max(0.5, safeNumber(values.holdYears, 5));
  const expectedSalePrice = Math.max(0, safeNumber(values.expectedSalePrice, 185000));
  const sellingCostPercent = Math.max(0, safeNumber(values.sellingCostPercent, 8));

  const carrying = (annualPropertyTax + otherAnnualCarryingCosts) * holdYears;
  const totalIn = purchasePrice + closingCosts + carrying;
  const net = expectedSalePrice * (1 - sellingCostPercent / 100);
  const profit = net - totalIn;
  const multiple = totalIn > 0 ? net / totalIn : 0;

  return {
    netProfit: round2(profit),
    totalInvested: round2(totalIn),
    totalCarryingCosts: round2(carrying),
    totalReturnPercent: pct(profit, totalIn),
    annualizedReturnPercent: multiple > 0 ? round2((Math.pow(multiple, 1 / holdYears) - 1) * 100) : -100,
  };
};

// --- 8. Land Value (comps per acre + adjustments) -----------------------
export const landValueCalculator: CustomCalculator = (values) => {
  const acres = Math.max(0, safeNumber(values.acres, 5));
  const comp1PricePerAcre = Math.max(0, safeNumber(values.comp1PricePerAcre, 22000));
  const comp2PricePerAcre = Math.max(0, safeNumber(values.comp2PricePerAcre, 26000));
  const comp3PricePerAcre = Math.max(0, safeNumber(values.comp3PricePerAcre, 24000));
  const locationAdjustmentPercent = safeNumber(values.locationAdjustmentPercent, 5);
  const accessAndUtilitiesAdjustmentPercent = safeNumber(values.accessAndUtilitiesAdjustmentPercent, -10);

  const avg = (comp1PricePerAcre + comp2PricePerAcre + comp3PricePerAcre) / 3;
  const factor = Math.max(0, 1 + (locationAdjustmentPercent + accessAndUtilitiesAdjustmentPercent) / 100);
  const adjusted = avg * factor;

  return {
    estimatedLandValue: round2(adjusted * acres),
    adjustedPricePerAcre: round2(adjusted),
    averageCompPricePerAcre: round2(avg),
    lowEstimate: round2(Math.min(comp1PricePerAcre, comp2PricePerAcre, comp3PricePerAcre) * factor * acres),
    highEstimate: round2(Math.max(comp1PricePerAcre, comp2PricePerAcre, comp3PricePerAcre) * factor * acres),
  };
};

// --- 9. Property Development Profit ------------------------------------
export const propertyDevelopmentProfitCalculator: CustomCalculator = (values) => {
  const grossDevelopmentValue = Math.max(0, safeNumber(values.grossDevelopmentValue, 3200000));
  const landCost = Math.max(0, safeNumber(values.landCost, 600000));
  const constructionCost = Math.max(0, safeNumber(values.constructionCost, 1700000));
  const professionalFeesPercent = Math.max(0, safeNumber(values.professionalFeesPercent, 10));
  const financeCosts = Math.max(0, safeNumber(values.financeCosts, 150000));
  const sellingCostPercent = Math.max(0, safeNumber(values.sellingCostPercent, 3));
  const contingencyPercent = Math.max(0, safeNumber(values.contingencyPercent, 5));

  const fees = (constructionCost * professionalFeesPercent) / 100;
  const contingency = (constructionCost * contingencyPercent) / 100;
  const selling = (grossDevelopmentValue * sellingCostPercent) / 100;
  const total = landCost + constructionCost + fees + contingency + financeCosts + selling;
  const profit = grossDevelopmentValue - total;

  return {
    developmentProfit: round2(profit),
    profitOnCostPercent: pct(profit, total),
    profitOnGdvPercent: pct(profit, grossDevelopmentValue),
    totalDevelopmentCost: round2(total),
  };
};

export const realestateMultifamilyLandCustomCalculators: Record<string, CustomCalculator> = {
  "multifamily-property-calculator": multifamilyPropertyCalculator,
  "multifamily-cap-rate-calculator": multifamilyCapRateCalculator,
  "multifamily-cash-flow-calculator": multifamilyCashFlowCalculator,
  "multifamily-roi-calculator": multifamilyRoiCalculator,
  "apartment-investment-calculator": apartmentInvestmentCalculator,
  "real-estate-development-calculator": realEstateDevelopmentCalculator,
  "land-investment-calculator": landInvestmentCalculator,
  "land-value-calculator": landValueCalculator,
  "property-development-profit-calculator": propertyDevelopmentProfitCalculator,
};
