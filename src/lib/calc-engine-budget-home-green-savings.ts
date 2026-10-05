/**
 * Batch: "Budget Calculators" (5 Oct 2026), sub-batch 11 of 12 — Home &
 * Green Savings (6 tools), filed under Budget Calculators > Money-Saving &
 * Spending Calculators. See calc-engine-budget-methods.ts for the full batch
 * context.
 *
 *  - secondHandVsNewPurchaseSavings (incl. library & sharing economy):
 *    cost per year of new vs used vs borrowing/renting.
 *  - energyEfficientAppliancePaybackPeriod (incl. home insulation): net
 *    cost, yearly savings with rising prices, payback, lifetime savings.
 *  - solarPanelHouseholdPaybackPeriod: system cost less rebates (the
 *    federal 25D credit ended after 2025), production, rising rates,
 *    panel degradation, payback year and 25-year savings.
 *  - waterConservationSavingsEstimate: gallons and dollars saved; fixture
 *    payback.
 *  - zeroWasteLifestyleCostImpact (incl. composting & waste reduction):
 *    reusables vs disposables, smaller trash service.
 *  - charitableGivingPlanner (incl. tithing): giving as % of gross or net,
 *    tax savings under 2026 rules — itemizers deduct above a 0.5%-of-AGI
 *    floor; non-itemizers deduct up to $1,000 ($2,000 joint) of cash gifts.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-budget-home-green-savings-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// --- 1. Second-Hand vs New Purchase Savings Calculator ---------------------------------
export const secondHandVsNewPurchaseSavingsCalculator: CustomCalculator = (values) => {
  const newPrice = pos(values.newPrice, 800);
  const newYears = Math.max(0.1, pos(values.newYears, 8));
  const usedPrice = pos(values.usedPrice, 400);
  const usedYears = Math.max(0.1, pos(values.usedYears, 5));
  const borrowCostPerUse = pos(values.borrowCostPerUse, 15);
  const usesPerYear = pos(values.usesPerYear, 4);

  const newYearly = newPrice / newYears;
  const usedYearly = usedPrice / usedYears;
  const borrowYearly = borrowCostPerUse * usesPerYear;

  return {
    newCostPerYear: round2(newYearly),
    usedCostPerYear: round2(usedYearly),
    borrowOrRentCostPerYear: round2(borrowYearly),
    usedSavingsPerYear: round2(newYearly - usedYearly),
    upfrontSavingsBuyingUsed: round2(newPrice - usedPrice),
  };
};

// --- 2. Energy-Efficient Appliance Payback Period Calculator ---------------------------
export const energyEfficientAppliancePaybackPeriodCalculator: CustomCalculator = (values) => {
  const upgradeCost = pos(values.upgradeCost, 1200);
  const rebates = pos(values.rebates, 200);
  const oldYearlyEnergy = pos(values.oldYearlyEnergy, 220);
  const newYearlyEnergy = pos(values.newYearlyEnergy, 110);
  const lifeYears = Math.max(1, Math.round(pos(values.lifeYears, 12)));
  const priceIncreasePercent = safeNumber(values.priceIncreasePercent, 3);

  const net = Math.max(0, upgradeCost - rebates);
  const first = oldYearlyEnergy - newYearlyEnergy;
  let cum = 0;
  let payback = 0;
  let lifetime = 0;
  for (let y = 0; y < lifeYears; y++) {
    const s = first * Math.pow(1 + priceIncreasePercent / 100, y);
    lifetime += s;
    if (!payback && cum + s >= net) payback = y + (s > 0 ? (net - cum) / s : 0);
    cum += s;
  }

  return {
    netCost: round2(net),
    firstYearSavings: round2(first),
    paybackYears: round2(payback || 0),
    lifetimeSavings: round2(lifetime),
    netLifetimeGain: round2(lifetime - net),
  };
};

// --- 3. Solar Panel Household Payback Period Calculator --------------------------------
export const solarPanelHouseholdPaybackPeriodCalculator: CustomCalculator = (values) => {
  const systemKw = pos(values.systemKw, 7);
  const costPerWatt = pos(values.costPerWatt, 3);
  const rebates = pos(values.rebates, 1000);
  const kwhPerKw = pos(values.kwhPerKw, 1300);
  const electricityRate = pos(values.electricityRate, 0.17);
  const rateIncreasePercent = safeNumber(values.rateIncreasePercent, 3);
  const degradationPercent = pos(values.degradationPercent, 0.5);
  const years = Math.max(1, Math.round(pos(values.years, 25)));

  const gross = systemKw * 1000 * costPerWatt;
  const net = Math.max(0, gross - rebates);
  let cum = 0;
  let payback = 0;
  let total = 0;
  let first = 0;
  for (let y = 0; y < years; y++) {
    const kwh = systemKw * kwhPerKw * Math.pow(1 - degradationPercent / 100, y);
    const s = kwh * electricityRate * Math.pow(1 + rateIncreasePercent / 100, y);
    if (y === 0) first = s;
    total += s;
    if (!payback && cum + s >= net) payback = y + (s > 0 ? (net - cum) / s : 0);
    cum += s;
  }

  return {
    grossCost: round2(gross),
    netCost: round2(net),
    firstYearSavings: round2(first),
    paybackYears: round2(payback || 0),
    lifetimeSavings: round2(total),
    netLifetimeGain: round2(total - net),
  };
};

// --- 4. Water Conservation Savings Estimate Calculator ---------------------------------
export const waterConservationSavingsEstimateCalculator: CustomCalculator = (values) => {
  const gallonsPerDay = pos(values.gallonsPerDay, 300);
  const reductionPercent = Math.min(100, pos(values.reductionPercent, 20));
  const costPer1000 = pos(values.costPer1000, 12);
  const heatingSavingsYearly = pos(values.heatingSavingsYearly, 50);
  const upgradeCost = pos(values.upgradeCost, 150);

  const gallons = (gallonsPerDay * 365 * reductionPercent) / 100;
  const water = (gallons / 1000) * costPer1000;
  const total = water + heatingSavingsYearly;

  return {
    gallonsSavedPerYear: round2(gallons),
    waterBillSavings: round2(water),
    totalYearlySavings: round2(total),
    paybackMonths: round2(total > 0 ? (upgradeCost / total) * 12 : 0),
  };
};

// --- 5. Zero-Waste Lifestyle Cost Impact Calculator ------------------------------------
export const zeroWasteLifestyleCostImpactCalculator: CustomCalculator = (values) => {
  const disposablesMonthly = pos(values.disposablesMonthly, 80);
  const reusablesUpfront = pos(values.reusablesUpfront, 200);
  const reusablesYearly = pos(values.reusablesYearly, 40);
  const trashSavingsMonthly = pos(values.trashSavingsMonthly, 10);
  const compostSetup = pos(values.compostSetup, 60);
  const years = pos(values.years, 5);

  const yearly = (disposablesMonthly + trashSavingsMonthly) * 12 - reusablesYearly;
  const upfront = reusablesUpfront + compostSetup;

  return {
    upfrontCost: round2(upfront),
    yearlySavings: round2(yearly),
    paybackMonths: round2(yearly > 0 ? (upfront / yearly) * 12 : 0),
    savingsOverYears: round2(yearly * years - upfront),
  };
};

// --- 6. Charitable Giving Planner Calculator -------------------------------------------
export const charitableGivingPlannerCalculator: CustomCalculator = (values) => {
  const grossIncome = pos(values.grossIncome, 90000);
  const takeHome = pos(values.takeHome, 68000);
  const raw = Math.round(safeNumber(values.base, 1));
  const onGross = raw !== 2;
  const givingPercent = pos(values.givingPercent, 10);
  const itemize = Math.round(safeNumber(values.itemize, 0)) === 1;
  const joint = Math.round(safeNumber(values.filing, 2)) === 2;
  const marginalRatePercent = Math.min(37, pos(values.marginalRatePercent, 22));

  const gift = ((onGross ? grossIncome : takeHome) * givingPercent) / 100;
  // 2026: itemizers deduct gifts above 0.5% of AGI (value capped at 35%);
  // non-itemizers deduct up to $1,000 / $2,000 (joint) of cash gifts
  const deductible = itemize ? Math.max(0, gift - grossIncome * 0.005) : Math.min(gift, joint ? 2000 : 1000);
  const rate = itemize ? Math.min(35, marginalRatePercent) : marginalRatePercent;
  const savings = (deductible * rate) / 100;

  return {
    yearlyGiving: round2(gift),
    monthlyGiving: round2(gift / 12),
    deductibleAmount: round2(deductible),
    taxSavings: round2(savings),
    netCostOfGiving: round2(gift - savings),
  };
};

export const budgetHomeGreenSavingsCustomCalculators: Record<string, CustomCalculator> = {
  "second-hand-vs-new-purchase-savings-calculator": secondHandVsNewPurchaseSavingsCalculator,
  "energy-efficient-appliance-payback-period-calculator": energyEfficientAppliancePaybackPeriodCalculator,
  "solar-panel-household-payback-period-calculator": solarPanelHouseholdPaybackPeriodCalculator,
  "water-conservation-savings-estimate-calculator": waterConservationSavingsEstimateCalculator,
  "zero-waste-lifestyle-cost-impact-calculator": zeroWasteLifestyleCostImpactCalculator,
  "charitable-giving-planner-calculator": charitableGivingPlannerCalculator,
};
