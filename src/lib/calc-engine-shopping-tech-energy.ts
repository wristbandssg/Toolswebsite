/**
 * Batch: "Shopping Calculators" → Electronics, Energy & Tech — home energy
 * and appliances (10 tools):
 *
 *  - electricityCost: a monthly bill from kWh, energy + delivery rates,
 *    fixed charge and tax.
 *  - kwhCost: your real cost per kWh from a bill (all-in and variable-only).
 *  - applianceRunningCost (also TV power): watts × hours, plus standby draw.
 *  - applianceWattage: watts from amps × volts or an EnergyGuide kWh/year
 *    label, with motor start-up surge.
 *  - spaceHeaterCost: a heater's running cost with thermostat cycling.
 *  - lightBulbCost (also LED ROI): old bulbs vs LEDs — energy, replacement
 *    bulbs, yearly savings and payback.
 *  - smartThermostatSavings: setback savings (about 1% per °F per 8 hours)
 *    on heating and cooling, and payback.
 *  - gasBill: therms (or CCF) × supply and delivery rates + fixed charge.
 *  - refrigeratorSize: capacity for the household and whether it fits the
 *    opening.
 *  - freezerSize: freezer capacity by people and how much you stock.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-tech-energy-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pct = (v: number) => nonNeg(v) / 100;
const idx = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(safeNumber(v))));

export const electricityCost: CustomCalculator = (v) => {
  const kwh = nonNeg(v.kwhPerMonth);
  const energy = kwh * (nonNeg(v.energyRate) + nonNeg(v.deliveryRate));
  const before = energy + nonNeg(v.fixedCharge);
  const bill = before * (1 + pct(v.taxRate));
  return {
    monthlyBill: round2(bill),
    yearlyCost: round2(bill * 12),
    dailyCost: round2((bill * 12) / 365),
    allInRatePerKwh: kwh > 0 ? round2((bill / kwh) * 1000) / 1000 : 0,
    usageCharges: round2(energy),
  };
};

export const kwhCost: CustomCalculator = (v) => {
  const kwh = nonNeg(v.kwhUsed);
  const bill = nonNeg(v.billTotal);
  const fixed = nonNeg(v.fixedCharges);
  return {
    allInCostPerKwh: kwh > 0 ? round2((bill / kwh) * 1000) / 1000 : 0,
    variableCostPerKwh: kwh > 0 ? round2((Math.max(0, bill - fixed) / kwh) * 1000) / 1000 : 0,
    fixedShareOfBill: bill > 0 ? round2((fixed / bill) * 100) : 0,
    costOf1000Kwh: kwh > 0 ? round2((Math.max(0, bill - fixed) / kwh) * 1000 + fixed) : 0,
  };
};

export const applianceRunningCost: CustomCalculator = (v) => {
  const watts = nonNeg(v.watts);
  const hours = Math.min(24, nonNeg(v.hoursPerDay));
  const standby = nonNeg(v.standbyWatts);
  const rate = nonNeg(v.rate);
  const dailyKwh = (watts * hours + standby * (24 - hours)) / 1000;
  return {
    costPerMonth: round2(dailyKwh * 30.42 * rate),
    costPerHour: round2((watts / 1000) * rate),
    costPerDay: round2(dailyKwh * rate),
    costPerYear: round2(dailyKwh * 365 * rate),
    kwhPerYear: round2(dailyKwh * 365),
  };
};

export const applianceWattage: CustomCalculator = (v) => {
  const method = idx(v.method, 2);
  let watts = 0;
  if (method === 0) watts = nonNeg(v.amps) * nonNeg(v.volts) * (nonNeg(v.powerFactor) || 1);
  else if (method === 1) watts = (nonNeg(v.kwhPerYear) * 1000) / (365 * Math.max(0.1, nonNeg(v.hoursPerDay) || 24));
  else watts = nonNeg(v.watts);
  const surge = [1, 2, 3][idx(v.motor, 2)];
  return {
    runningWatts: Math.round(watts),
    startingWatts: Math.round(watts * surge),
    ampsAt120v: round2(watts / 120),
    kwhPerHour: round2(watts / 1000),
  };
};

export const spaceHeaterCost: CustomCalculator = (v) => {
  const watts = nonNeg(v.watts) * (safeNumber(v.setting) === 1 ? 0.5 : 1);
  const duty = pct(v.dutyCycle) || 1;
  const hourly = (watts / 1000) * duty * nonNeg(v.rate);
  const daily = hourly * nonNeg(v.hoursPerDay);
  return {
    costPerMonth: round2(daily * 30.42),
    costPerHour: round2(hourly),
    costPerDay: round2(daily),
    costPerSeason: round2(daily * 30.42 * nonNeg(v.months)),
    kwhPerMonth: round2((watts / 1000) * duty * nonNeg(v.hoursPerDay) * 30.42),
  };
};

export const lightBulbCost: CustomCalculator = (v) => {
  const n = nonNeg(v.bulbs);
  const hoursYear = nonNeg(v.hoursPerDay) * 365;
  const rate = nonNeg(v.rate);
  const yearly = (w: number, price: number, life: number) =>
    n * ((w * hoursYear) / 1000) * rate + (life > 0 ? n * price * (hoursYear / life) : 0);
  const oldYear = yearly(nonNeg(v.oldWatts), nonNeg(v.oldPrice), nonNeg(v.oldLife));
  const ledYear = yearly(nonNeg(v.ledWatts), 0, 0) + (nonNeg(v.ledLife) > 0 ? n * nonNeg(v.ledPrice) * (hoursYear / nonNeg(v.ledLife)) : 0);
  const saving = oldYear - ledYear;
  const upfront = n * nonNeg(v.ledPrice);
  return {
    yearlySavings: round2(saving),
    oldBulbsYearlyCost: round2(oldYear),
    ledYearlyCost: round2(ledYear),
    upfrontLedCost: round2(upfront),
    paybackMonths: saving > 0 ? round2((upfront / saving) * 12) : 0,
    tenYearSavings: round2(saving * 10),
  };
};

export const smartThermostatSavings: CustomCalculator = (v) => {
  const heat = nonNeg(v.heatingBill);
  const cool = nonNeg(v.coolingBill);
  const share = (nonNeg(v.setbackHours) / 8) * 0.01; // per °F
  const heatSave = heat * Math.min(0.15, share * nonNeg(v.winterSetback));
  const coolSave = cool * Math.min(0.15, share * nonNeg(v.summerSetup));
  const total = heatSave + coolSave;
  const cost = nonNeg(v.thermostatCost) - nonNeg(v.rebate);
  return {
    yearlySavings: round2(total),
    heatingSavings: round2(heatSave),
    coolingSavings: round2(coolSave),
    paybackMonths: total > 0 ? round2((Math.max(0, cost) / total) * 12) : 0,
    savingsPercent: heat + cool > 0 ? round2((total / (heat + cool)) * 100) : 0,
  };
};

export const gasBill: CustomCalculator = (v) => {
  const therms = safeNumber(v.unit) === 1 ? nonNeg(v.usage) * 1.037 : nonNeg(v.usage);
  const usage = therms * (nonNeg(v.supplyRate) + nonNeg(v.deliveryRate));
  const bill = (usage + nonNeg(v.fixedCharge)) * (1 + pct(v.taxRate));
  return {
    monthlyBill: round2(bill),
    therms: round2(therms),
    usageCharges: round2(usage),
    allInCostPerTherm: therms > 0 ? round2(bill / therms) : 0,
    costPerYearAtThisMonth: round2(bill * 12),
  };
};

export const refrigeratorSize: CustomCalculator = (v) => {
  const people = Math.max(1, nonNeg(v.people));
  const cook = [4, 5, 6][idx(v.cooking, 2)];
  const cuft = 8 + people * cook;
  const ow = nonNeg(v.openingWidth);
  return {
    recommendedCuFt: Math.round(cuft),
    rangeLow: Math.round(cuft - 3),
    rangeHigh: Math.round(cuft + 3),
    maxFridgeWidth: round2(Math.max(0, ow - 1)),
    maxFridgeHeight: round2(Math.max(0, nonNeg(v.openingHeight) - 1)),
    typeCode: ow > 0 && ow < 30 ? 1 : cuft >= 24 ? 3 : 2,
  };
};

export const freezerSize: CustomCalculator = (v) => {
  const people = Math.max(1, nonNeg(v.people));
  const perPerson = [1.5, 2.5, 4][idx(v.stocking, 2)];
  const cuft = people * perPerson + nonNeg(v.extraLbs) / 35;
  return {
    recommendedCuFt: round2(cuft),
    foodCapacityLbs: Math.round(cuft * 35),
    chestOrUprightCode: cuft >= 10 ? 1 : 2,
    estimatedYearlyKwh: Math.round(cuft * 25 + 150),
  };
};

export const shoppingTechEnergyCustomCalculators: Record<string, CustomCalculator> = {
  "electricity-cost-calculator": electricityCost,
  "kwh-cost-calculator": kwhCost,
  "appliance-running-cost-calculator": applianceRunningCost,
  "appliance-wattage-calculator": applianceWattage,
  "space-heater-cost-calculator": spaceHeaterCost,
  "light-bulb-cost-calculator": lightBulbCost,
  "smart-thermostat-savings-calculator": smartThermostatSavings,
  "gas-bill-calculator": gasBill,
  "refrigerator-size-calculator": refrigeratorSize,
  "freezer-size-calculator": freezerSize,
};
