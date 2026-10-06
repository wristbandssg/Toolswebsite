/**
 * Batch: "Car & Vehicle Cost Calculators" (5 Oct 2026), sub-batch 6 of 9 —
 * Fuel & Electric Vehicle Cost (11 tools), filed under Car & Vehicle Cost
 * Calculators > Car Ownership, Fuel & EV Cost Calculators. See
 * calc-engine-car-buying.ts for the full batch context.
 *
 *  - carFuelCost: miles / MPG x gas price; per month, year, mile, person.
 *  - gasMileage (MPG): miles / gallons; L/100 km = 235.215 / MPG.
 *  - fuelEfficiencyComparison: two MPGs -> fuel cost difference and payback
 *    on the more efficient car's extra price.
 *  - evVsGasCost (incl. hybrid vs electric vs gas): price - resale + (fuel +
 *    maintenance) over the years; EV energy blends home and public charging.
 *  - evChargingCost (incl. EV range): range from battery x efficiency; cost
 *    of a charge at home (with charging losses) and in public; monthly cost.
 *  - evHomeChargerInstallation: charger + install + panel + permit - rebates
 *    vs savings over public charging; payback months.
 *  - homeSolarEvCharging (incl. driveway solar carport): kW of solar to cover
 *    the EV's kWh, cost per watt (carport mounting costs more), payback and
 *    25-year savings with rising utility rates. Federal 25D credit ended for
 *    systems placed in service after 31 Dec 2025 (credit % input stays).
 *  - evChargingSubscription: member rate + monthly fee vs pay-as-you-go.
 *  - evBatteryDegradation: capacity after years at a yearly loss rate; range
 *    lost; years until the warranty threshold.
 *  - evTaxCredit: federal clean vehicle credit only for EVs acquired by
 *    30 Sep 2025 (limited to tax owed), plus state and utility rebates.
 *  - chipTuningFuelSavings: MPG gain vs premium fuel and tune cost.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-car-fuel-ev-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// --- 1. Car Fuel Cost Calculator -------------------------------------------------------
export const carFuelCostCalculator: CustomCalculator = (values) => {
  const milesPerMonth = pos(values.milesPerMonth, 1000);
  const mpg = Math.max(0.1, pos(values.mpg, 28));
  const gasPrice = pos(values.gasPrice, 3.4);
  const people = Math.max(1, Math.round(pos(values.people, 1)));

  const gallons = milesPerMonth / mpg;
  const monthly = gallons * gasPrice;

  return {
    gallonsPerMonth: round2(gallons),
    monthlyFuelCost: round2(monthly),
    yearlyFuelCost: round2(monthly * 12),
    costPerMile: round2(gasPrice / mpg),
    costPerPerson: round2(monthly / people),
  };
};

// --- 2. Gas Mileage (MPG) Calculator ---------------------------------------------------
export const gasMileageCalculator: CustomCalculator = (values) => {
  const milesDriven = pos(values.milesDriven, 350);
  const gallons = pos(values.gallons, 12.5);
  const gasPrice = pos(values.gasPrice, 3.4);

  const mpg = gallons > 0 ? milesDriven / gallons : 0;

  return {
    mpg: round2(mpg),
    litersPer100Km: round2(mpg > 0 ? 235.215 / mpg : 0),
    kmPerLiter: round2(mpg * 0.425144),
    costOfThisFill: round2(gallons * gasPrice),
    costPerMile: round2(milesDriven > 0 ? (gallons * gasPrice) / milesDriven : 0),
  };
};

// --- 3. Fuel Efficiency Comparison Calculator ------------------------------------------
export const fuelEfficiencyComparisonCalculator: CustomCalculator = (values) => {
  const mpgA = Math.max(0.1, pos(values.mpgA, 25));
  const mpgB = Math.max(0.1, pos(values.mpgB, 40));
  const milesPerYear = pos(values.milesPerYear, 12000);
  const gasPrice = pos(values.gasPrice, 3.4);
  const years = Math.max(1, pos(values.years, 5));
  const priceDifference = pos(values.priceDifference, 3000);

  const a = (milesPerYear / mpgA) * gasPrice;
  const b = (milesPerYear / mpgB) * gasPrice;
  const saving = a - b;

  return {
    yearlyFuelCostA: round2(a),
    yearlyFuelCostB: round2(b),
    yearlySavings: round2(saving),
    savingsOverYears: round2(saving * years),
    paybackYears: round2(saving > 0 ? priceDifference / saving : 0),
    netSavingsAfterPriceDifference: round2(saving * years - priceDifference),
  };
};

// --- 4. EV vs Gas Cost Calculator (incl. hybrid) ---------------------------------------
export const evVsGasCostCalculator: CustomCalculator = (values) => {
  const milesPerYear = pos(values.milesPerYear, 12000);
  const years = Math.max(1, pos(values.years, 5));
  const gasPrice = pos(values.gasPrice, 3.4);
  const gasCarPrice = pos(values.gasCarPrice, 32000);
  const gasMpg = Math.max(0.1, pos(values.gasMpg, 30));
  const hybridPrice = pos(values.hybridPrice, 34000);
  const hybridMpg = Math.max(0.1, pos(values.hybridMpg, 50));
  const evPrice = pos(values.evPrice, 42000);
  const evKwhPer100Miles = pos(values.evKwhPer100Miles, 30);
  const homeRate = pos(values.homeRate, 0.17);
  const publicRate = pos(values.publicRate, 0.45);
  const publicSharePercent = Math.min(100, pos(values.publicSharePercent, 20));
  const evIncentives = pos(values.evIncentives, 0);
  const gasResalePercent = Math.min(100, pos(values.gasResalePercent, 45));
  const hybridResalePercent = Math.min(100, pos(values.hybridResalePercent, 50));
  const evResalePercent = Math.min(100, pos(values.evResalePercent, 40));

  const maintenance = [0.09, 0.08, 0.06]; // per mile: gas, hybrid, EV
  const gasFuel = (milesPerYear / gasMpg) * gasPrice;
  const hybridFuel = (milesPerYear / hybridMpg) * gasPrice;
  const kwh = (milesPerYear * evKwhPer100Miles) / 100;
  const blended = (homeRate * (100 - publicSharePercent) + publicRate * publicSharePercent) / 100;
  const evFuel = kwh * blended;
  const total = (price: number, resale: number, fuel: number, m: number) =>
    price * (1 - resale / 100) + (fuel + milesPerYear * m) * years;
  const gasTotal = total(gasCarPrice, gasResalePercent, gasFuel, maintenance[0]);
  const hybridTotal = total(hybridPrice, hybridResalePercent, hybridFuel, maintenance[1]);
  const evTotal = total(evPrice, evResalePercent, evFuel, maintenance[2]) - evIncentives;

  return {
    gasFuelPerYear: round2(gasFuel),
    hybridFuelPerYear: round2(hybridFuel),
    evChargingPerYear: round2(evFuel),
    gasTotalCost: round2(gasTotal),
    hybridTotalCost: round2(hybridTotal),
    evTotalCost: round2(evTotal),
    lowestTotalCost: round2(Math.min(gasTotal, hybridTotal, evTotal)),
    evSavingsVsGas: round2(gasTotal - evTotal),
  };
};

// --- 5. EV Charging Cost Calculator (incl. range) --------------------------------------
export const evChargingCostCalculator: CustomCalculator = (values) => {
  const batteryKwh = pos(values.batteryKwh, 75);
  const milesPerKwh = pos(values.milesPerKwh, 3.5);
  const fromPercent = Math.min(100, pos(values.fromPercent, 20));
  const toPercent = Math.min(100, pos(values.toPercent, 80));
  const homeRate = pos(values.homeRate, 0.17);
  const publicRate = pos(values.publicRate, 0.45);
  const lossPercent = Math.min(50, pos(values.lossPercent, 10));
  const milesPerMonth = pos(values.milesPerMonth, 1000);
  const publicSharePercent = Math.min(100, pos(values.publicSharePercent, 20));

  const added = (batteryKwh * Math.max(0, toPercent - fromPercent)) / 100;
  const homeFactor = 1 / (1 - lossPercent / 100);
  const monthlyKwh = milesPerKwh > 0 ? milesPerMonth / milesPerKwh : 0;
  const monthly =
    monthlyKwh * ((1 - publicSharePercent / 100) * homeRate * homeFactor + (publicSharePercent / 100) * publicRate);

  return {
    fullChargeRange: round2(batteryKwh * milesPerKwh),
    kwhAdded: round2(added),
    milesAdded: round2(added * milesPerKwh),
    costThisChargeAtHome: round2(added * homeFactor * homeRate),
    costThisChargePublic: round2(added * publicRate),
    monthlyChargingCost: round2(monthly),
    costPerMile: round2(milesPerMonth > 0 ? monthly / milesPerMonth : 0),
  };
};

// --- 6. EV Home Charger Installation Calculator ----------------------------------------
export const evHomeChargerInstallationCalculator: CustomCalculator = (values) => {
  const chargerPrice = pos(values.chargerPrice, 600);
  const installLabor = pos(values.installLabor, 800);
  const panelUpgrade = pos(values.panelUpgrade, 0);
  const permit = pos(values.permit, 150);
  const rebates = pos(values.rebates, 0);
  const milesPerMonth = pos(values.milesPerMonth, 1000);
  const milesPerKwh = Math.max(0.1, pos(values.milesPerKwh, 3.5));
  const homeRate = pos(values.homeRate, 0.17);
  const publicRate = pos(values.publicRate, 0.45);

  const total = chargerPrice + installLabor + panelUpgrade + permit;
  const net = Math.max(0, total - rebates);
  const kwh = milesPerMonth / milesPerKwh;
  const monthlySavings = kwh * (publicRate - homeRate / 0.9);

  return {
    totalInstalledCost: round2(total),
    netCost: round2(net),
    monthlySavingsVsPublic: round2(monthlySavings),
    yearlySavingsVsPublic: round2(monthlySavings * 12),
    paybackMonths: round2(monthlySavings > 0 ? net / monthlySavings : 0),
  };
};

// --- 7. Home Solar EV Charging Calculator ----------------------------------------------
export const homeSolarEvChargingCalculator: CustomCalculator = (values) => {
  const evMilesPerYear = pos(values.evMilesPerYear, 12000);
  const milesPerKwh = Math.max(0.1, pos(values.milesPerKwh, 3.5));
  const sunHours = Math.max(0.1, pos(values.sunHours, 4.5));
  const costPerWatt = pos(values.costPerWatt, 3);
  const mounting = Math.round(safeNumber(values.mounting, 1)) === 2 ? 2 : 1;
  const creditPercent = Math.min(100, pos(values.creditPercent, 0));
  const utilityRate = pos(values.utilityRate, 0.17);
  const rateIncreasePercent = pos(values.rateIncreasePercent, 2.5);

  const kwh = evMilesPerYear / milesPerKwh;
  const kw = kwh / (sunHours * 365 * 0.8);
  const cost = kw * 1000 * costPerWatt * (mounting === 2 ? 1.4 : 1);
  const net = cost * (1 - creditPercent / 100);
  const first = kwh * utilityRate;
  let total25 = 0;
  for (let y = 0; y < 25; y++) total25 += first * Math.pow(1 + rateIncreasePercent / 100, y);

  return {
    evKwhPerYear: round2(kwh),
    solarKwNeeded: round2(kw),
    systemCost: round2(cost),
    netCost: round2(net),
    firstYearSavings: round2(first),
    paybackYears: round2(first > 0 ? net / first : 0),
    netSavingsOver25Years: round2(total25 - net),
  };
};

// --- 8. EV Charging Subscription Calculator --------------------------------------------
export const evChargingSubscriptionCalculator: CustomCalculator = (values) => {
  const kwhPerMonth = pos(values.kwhPerMonth, 150);
  const payAsYouGoRate = pos(values.payAsYouGoRate, 0.48);
  const memberRate = pos(values.memberRate, 0.36);
  const monthlyFee = pos(values.monthlyFee, 12.99);

  const payg = kwhPerMonth * payAsYouGoRate;
  const member = kwhPerMonth * memberRate + monthlyFee;
  const diff = payAsYouGoRate - memberRate;

  return {
    payAsYouGoMonthly: round2(payg),
    membershipMonthly: round2(member),
    monthlySavings: round2(payg - member),
    yearlySavings: round2((payg - member) * 12),
    breakEvenKwhPerMonth: round2(diff > 0 ? monthlyFee / diff : 0),
  };
};

// --- 9. EV Battery Degradation Calculator ----------------------------------------------
export const evBatteryDegradationCalculator: CustomCalculator = (values) => {
  const originalRange = pos(values.originalRange, 300);
  const yearlyLossPercent = Math.min(50, pos(values.yearlyLossPercent, 2));
  const years = pos(values.years, 8);
  const replacementCost = pos(values.replacementCost, 15000);
  const warrantyMinPercent = Math.min(100, pos(values.warrantyMinPercent, 70));

  const remaining = Math.pow(1 - yearlyLossPercent / 100, years) * 100;
  const yearsToThreshold =
    yearlyLossPercent > 0 && warrantyMinPercent > 0
      ? Math.log(warrantyMinPercent / 100) / Math.log(1 - yearlyLossPercent / 100)
      : 0;

  return {
    capacityRemainingPercent: round2(remaining),
    rangeNow: round2((originalRange * remaining) / 100),
    rangeLost: round2(originalRange * (1 - remaining / 100)),
    valueOfLostCapacity: round2(replacementCost * (1 - remaining / 100)),
    yearsUntilWarrantyThreshold: round2(yearsToThreshold),
  };
};

// --- 10. EV Tax Credit Calculator ------------------------------------------------------
export const evTaxCreditCalculator: CustomCalculator = (values) => {
  const vehiclePrice = pos(values.vehiclePrice, 42000);
  const acquiredBeforeCutoff = Math.round(safeNumber(values.acquiredBeforeCutoff, 0)) === 1;
  const federalCreditAmount = pos(values.federalCreditAmount, 7500);
  const taxOwed = pos(values.taxOwed, 10000);
  const stateRebate = pos(values.stateRebate, 2000);
  const utilityRebate = pos(values.utilityRebate, 500);

  const federal = acquiredBeforeCutoff ? Math.min(federalCreditAmount, taxOwed) : 0;
  const total = federal + stateRebate + utilityRebate;

  return {
    federalCreditValue: round2(federal),
    stateAndUtilityRebates: round2(stateRebate + utilityRebate),
    totalIncentives: round2(total),
    netPrice: round2(Math.max(0, vehiclePrice - total)),
    incentiveShareOfPrice: round2(vehiclePrice > 0 ? (total / vehiclePrice) * 100 : 0),
  };
};

// --- 11. Chip Tuning Fuel Savings Calculator -------------------------------------------
export const chipTuningFuelSavingsCalculator: CustomCalculator = (values) => {
  const tuneCost = pos(values.tuneCost, 600);
  const mpgBefore = Math.max(0.1, pos(values.mpgBefore, 25));
  const mpgGainPercent = pos(values.mpgGainPercent, 5);
  const milesPerYear = pos(values.milesPerYear, 12000);
  const gasPrice = pos(values.gasPrice, 3.4);
  const premiumExtraPerGallon = pos(values.premiumExtraPerGallon, 0);

  const mpgAfter = mpgBefore * (1 + mpgGainPercent / 100);
  const before = (milesPerYear / mpgBefore) * gasPrice;
  const after = (milesPerYear / mpgAfter) * (gasPrice + premiumExtraPerGallon);
  const savings = before - after;

  return {
    mpgAfter: round2(mpgAfter),
    fuelCostBefore: round2(before),
    fuelCostAfter: round2(after),
    yearlyFuelSavings: round2(savings),
    paybackYears: round2(savings > 0 ? tuneCost / savings : 0),
  };
};

export const carFuelEvCustomCalculators: Record<string, CustomCalculator> = {
  "car-fuel-cost-calculator": carFuelCostCalculator,
  "gas-mileage-calculator": gasMileageCalculator,
  "fuel-efficiency-comparison-calculator": fuelEfficiencyComparisonCalculator,
  "ev-vs-gas-cost-calculator": evVsGasCostCalculator,
  "ev-charging-cost-calculator": evChargingCostCalculator,
  "ev-home-charger-installation-calculator": evHomeChargerInstallationCalculator,
  "home-solar-ev-charging-calculator": homeSolarEvChargingCalculator,
  "ev-charging-subscription-calculator": evChargingSubscriptionCalculator,
  "ev-battery-degradation-calculator": evBatteryDegradationCalculator,
  "ev-tax-credit-calculator": evTaxCreditCalculator,
  "chip-tuning-fuel-savings-calculator": chipTuningFuelSavingsCalculator,
};
