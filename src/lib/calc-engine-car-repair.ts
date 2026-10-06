/**
 * Batch: "Car & Vehicle Cost Calculators" (5 Oct 2026), sub-batch 7 of 9 —
 * Maintenance & Repair (14 tools), filed under Car & Vehicle Cost Calculators >
 * Car Maintenance, Repair & Upgrade Calculators. See calc-engine-car-buying.ts
 * for the full batch context.
 *
 *  - carMaintenanceCost (incl. oil change cost over time): oil changes by
 *    interval, tires, brakes and battery prorated by miles/years, plus other
 *    yearly items.
 *  - carRepairCost (incl. car accident repair estimate, recall repair
 *    savings): parts + tax, labor hours x rate, shop fees, diagnosis; what
 *    you pay through an insurance claim.
 *  - mobileMechanicVsDealership: labor rates, parts markup, trip fee and
 *    your time.
 *  - tireReplacementCost (incl. run-flat tire premium): tires + tax,
 *    mounting/balancing, disposal and alignment; cost per mile of tread life.
 *  - carBatteryReplacement, windshieldReplacement (incl. ADAS calibration
 *    and wiper blades), carKeyReplacement, catalyticConverterReplacement,
 *    timingBeltReplacement (incl. water pump, interference-engine risk),
 *    transmissionRepair (repair vs value), brakeJob, carAcRepair (R-134a vs
 *    R-1234yf), carTowing, roadsideAssistancePlan (plan vs expected pay-
 *    per-use cost): typical part prices by type with your quote overriding.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-car-repair-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const pick = (v: number, d: number, n: number) => {
  const r = Math.round(safeNumber(v, d));
  return r >= 1 && r <= n ? r : d;
};
const flag = (v: number, d: number) => Math.round(safeNumber(v, d)) === 1;

// --- 1. Car Maintenance Cost Calculator ------------------------------------------------
export const carMaintenanceCostCalculator: CustomCalculator = (values) => {
  const milesPerYear = pos(values.milesPerYear, 12000);
  const years = Math.max(1, pos(values.years, 5));
  const oilInterval = Math.max(500, pos(values.oilInterval, 7500));
  const oilChangeCost = pos(values.oilChangeCost, 80);
  const tireSetCost = pos(values.tireSetCost, 800);
  const tireLifeMiles = Math.max(1000, pos(values.tireLifeMiles, 50000));
  const brakeJobCost = pos(values.brakeJobCost, 400);
  const brakeLifeMiles = Math.max(1000, pos(values.brakeLifeMiles, 40000));
  const batteryCost = pos(values.batteryCost, 200);
  const batteryLifeYears = Math.max(1, pos(values.batteryLifeYears, 4));
  const otherYearly = pos(values.otherYearly, 250);

  const miles = milesPerYear * years;
  const oilChanges = miles / oilInterval;
  const oil = oilChanges * oilChangeCost;
  const tires = (miles / tireLifeMiles) * tireSetCost;
  const brakes = (miles / brakeLifeMiles) * brakeJobCost;
  const battery = (years / batteryLifeYears) * batteryCost;
  const other = otherYearly * years;
  const total = oil + tires + brakes + battery + other;

  return {
    oilChanges: round2(oilChanges),
    oilChangeTotal: round2(oil),
    tiresTotal: round2(tires),
    brakesTotal: round2(brakes),
    batteryTotal: round2(battery),
    otherTotal: round2(other),
    totalMaintenance: round2(total),
    costPerYear: round2(total / years),
    costPerMile: Math.round((miles > 0 ? total / miles : 0) * 1000) / 1000,
  };
};

// --- 2. Car Repair Cost Calculator -----------------------------------------------------
export const carRepairCostCalculator: CustomCalculator = (values) => {
  const partsCost = pos(values.partsCost, 450);
  const laborHours = pos(values.laborHours, 3);
  const laborRate = pos(values.laborRate, 140);
  const shopFeesPercent = pos(values.shopFeesPercent, 5);
  const salesTaxPercent = pos(values.salesTaxPercent, 7);
  const diagnosticFee = pos(values.diagnosticFee, 120);
  const insuranceClaim = flag(values.insuranceClaim, 0);
  const deductible = pos(values.deductible, 500);

  const labor = laborHours * laborRate;
  const partsTax = (partsCost * salesTaxPercent) / 100;
  const shop = ((partsCost + labor) * shopFeesPercent) / 100;
  const total = partsCost + partsTax + labor + shop + diagnosticFee;
  const youPay = insuranceClaim ? Math.min(total, deductible) : total;

  return {
    laborCost: round2(labor),
    partsWithTax: round2(partsCost + partsTax),
    shopFees: round2(shop),
    totalRepairCost: round2(total),
    insurancePays: round2(total - youPay),
    youPay: round2(youPay),
  };
};

// --- 3. Mobile Mechanic vs Dealership Calculator ---------------------------------------
export const mobileMechanicVsDealershipCalculator: CustomCalculator = (values) => {
  const laborHours = pos(values.laborHours, 2);
  const partsCost = pos(values.partsCost, 300);
  const dealerRate = pos(values.dealerRate, 180);
  const dealerPartsMarkupPercent = pos(values.dealerPartsMarkupPercent, 30);
  const mobileRate = pos(values.mobileRate, 110);
  const mobilePartsMarkupPercent = pos(values.mobilePartsMarkupPercent, 10);
  const mobileTripFee = pos(values.mobileTripFee, 50);
  const dealerTimeHours = pos(values.dealerTimeHours, 3);
  const hourlyValue = pos(values.hourlyValue, 30);

  const dealer = laborHours * dealerRate + partsCost * (1 + dealerPartsMarkupPercent / 100) + dealerTimeHours * hourlyValue;
  const mobile = laborHours * mobileRate + partsCost * (1 + mobilePartsMarkupPercent / 100) + mobileTripFee;

  return {
    dealershipTotal: round2(dealer),
    mobileMechanicTotal: round2(mobile),
    savingsWithMobileMechanic: round2(dealer - mobile),
    savingsPercent: round2(dealer > 0 ? ((dealer - mobile) / dealer) * 100 : 0),
  };
};

// --- 4. Tire Replacement Cost Calculator -----------------------------------------------
export const tireReplacementCostCalculator: CustomCalculator = (values) => {
  const pricePerTire = pos(values.pricePerTire, 180);
  const tires = Math.round(pos(values.tires, 4));
  const runFlat = flag(values.runFlat, 0);
  const runFlatPremiumPercent = pos(values.runFlatPremiumPercent, 40);
  const installPerTire = pos(values.installPerTire, 25);
  const disposalPerTire = pos(values.disposalPerTire, 4);
  const alignment = pos(values.alignment, 100);
  const salesTaxPercent = pos(values.salesTaxPercent, 7);
  const treadLifeMiles = Math.max(1000, pos(values.treadLifeMiles, 50000));
  const milesPerYear = pos(values.milesPerYear, 12000);

  const unit = pricePerTire * (runFlat ? 1 + runFlatPremiumPercent / 100 : 1);
  const tireCost = unit * tires * (1 + salesTaxPercent / 100);
  const install = (installPerTire + disposalPerTire) * tires;
  const total = tireCost + install + alignment;

  return {
    tiresWithTax: round2(tireCost),
    installationAndDisposal: round2(install),
    totalCost: round2(total),
    runFlatExtra: round2(runFlat ? pricePerTire * (runFlatPremiumPercent / 100) * tires * (1 + salesTaxPercent / 100) : 0),
    costPerMile: Math.round((total / treadLifeMiles) * 1000) / 1000,
    yearsUntilNextSet: round2(milesPerYear > 0 ? treadLifeMiles / milesPerYear : 0),
  };
};

// --- 5. Car Battery Replacement Cost Calculator ----------------------------------------
export const carBatteryReplacementCostCalculator: CustomCalculator = (values) => {
  const batteryType = pick(values.batteryType, 1, 3);
  const quotedPrice = pos(values.quotedPrice, 0);
  const installation = pos(values.installation, 50);
  const programming = pos(values.programming, 0);
  const salesTaxPercent = pos(values.salesTaxPercent, 7);
  const lifeYears = Math.max(1, pos(values.lifeYears, 4));

  const price = quotedPrice > 0 ? quotedPrice : [150, 200, 250][batteryType - 1];
  const total = price * (1 + salesTaxPercent / 100) + installation + programming;

  return {
    batteryPrice: round2(price),
    totalCost: round2(total),
    costPerYear: round2(total / lifeYears),
    savedByInstallingYourself: round2(installation),
  };
};

// --- 6. Windshield Replacement Cost Calculator -----------------------------------------
export const windshieldReplacementCostCalculator: CustomCalculator = (values) => {
  const glassPrice = pos(values.glassPrice, 350);
  const glassType = pick(values.glassType, 1, 2);
  const installLabor = pos(values.installLabor, 150);
  const adasCalibration = pos(values.adasCalibration, 250);
  const fullGlassCoverage = flag(values.fullGlassCoverage, 0);
  const deductible = pos(values.deductible, 500);
  const wiperPairPrice = pos(values.wiperPairPrice, 40);
  const wiperChangesPerYear = pos(values.wiperChangesPerYear, 2);

  const total = glassPrice * (glassType === 2 ? 1.6 : 1) + installLabor + adasCalibration;
  const youPay = fullGlassCoverage ? 0 : Math.min(total, deductible);

  return {
    replacementCost: round2(total),
    youPayWithInsurance: round2(youPay),
    insurancePays: round2(total - youPay),
    wiperBladesPerYear: round2(wiperPairPrice * wiperChangesPerYear),
  };
};

// --- 7. Car Key Replacement Cost Calculator --------------------------------------------
export const carKeyReplacementCostCalculator: CustomCalculator = (values) => {
  const keyType = pick(values.keyType, 3, 4);
  const source = pick(values.source, 2, 3);
  const allKeysLost = flag(values.allKeysLost, 0);

  const base = [15, 150, 250, 400][keyType - 1];
  const fSource = [1, 0.7, 0.45][source - 1];
  const key = base * fSource;
  const extra = allKeysLost && keyType > 1 ? 150 * fSource : 0;

  return {
    keyCost: round2(key),
    extraForAllKeysLost: round2(extra),
    totalCost: round2(key + extra),
    dealerPrice: round2(base + (allKeysLost && keyType > 1 ? 150 : 0)),
    savingsVsDealer: round2(base + (allKeysLost && keyType > 1 ? 150 : 0) - key - extra),
  };
};

// --- 8. Catalytic Converter Replacement Cost Calculator --------------------------------
export const catalyticConverterReplacementCostCalculator: CustomCalculator = (values) => {
  const converterType = pick(values.converterType, 1, 3);
  const quotedPartPrice = pos(values.quotedPartPrice, 0);
  const laborHours = pos(values.laborHours, 1.5);
  const laborRate = pos(values.laborRate, 130);
  const extraParts = pos(values.extraParts, 0);
  const theftClaim = flag(values.theftClaim, 0);
  const deductible = pos(values.deductible, 500);

  const part = quotedPartPrice > 0 ? quotedPartPrice : [600, 1200, 2000][converterType - 1];
  const labor = laborHours * laborRate;
  const total = part + labor + extraParts;
  const youPay = theftClaim ? Math.min(total, deductible) : total;

  return {
    partCost: round2(part),
    laborCost: round2(labor),
    totalCost: round2(total),
    youPay: round2(youPay),
    insurancePays: round2(total - youPay),
  };
};

// --- 9. Timing Belt Replacement Cost Calculator ----------------------------------------
export const timingBeltReplacementCostCalculator: CustomCalculator = (values) => {
  const kitPrice = pos(values.kitPrice, 250);
  const waterPumpPrice = pos(values.waterPumpPrice, 100);
  const laborHours = pos(values.laborHours, 4);
  const laborRate = pos(values.laborRate, 130);
  const intervalMiles = Math.max(1000, pos(values.intervalMiles, 100000));
  const milesPerYear = pos(values.milesPerYear, 12000);
  const interference = flag(values.interference, 1);
  const engineDamageCost = pos(values.engineDamageCost, 4000);

  const total = kitPrice + waterPumpPrice + laborHours * laborRate;

  return {
    laborCost: round2(laborHours * laborRate),
    totalCost: round2(total),
    costPerMile: Math.round((total / intervalMiles) * 1000) / 1000,
    yearsBetweenReplacements: round2(milesPerYear > 0 ? intervalMiles / milesPerYear : 0),
    costIfBeltBreaks: round2(interference ? total + engineDamageCost : total + 200),
  };
};

// --- 10. Transmission Repair Cost Calculator -------------------------------------------
export const transmissionRepairCostCalculator: CustomCalculator = (values) => {
  const repairType = pick(values.repairType, 3, 5);
  const quote = pos(values.quote, 0);
  const valueIfRunning = pos(values.valueIfRunning, 9000);
  const valueAsIs = pos(values.valueAsIs, 3000);

  const cost = quote > 0 ? quote : [200, 600, 3500, 2500, 4500][repairType - 1];

  return {
    repairCost: round2(cost),
    repairAsShareOfValue: round2(valueIfRunning > 0 ? (cost / valueIfRunning) * 100 : 0),
    valueAddedByRepair: round2(valueIfRunning - valueAsIs),
    netGainFromRepair: round2(valueIfRunning - valueAsIs - cost),
  };
};

// --- 11. Brake Job Cost Calculator -----------------------------------------------------
export const brakeJobCostCalculator: CustomCalculator = (values) => {
  const axles = pick(values.axles, 1, 3);
  const padsPerAxle = pos(values.padsPerAxle, 80);
  const replaceRotors = flag(values.replaceRotors, 1);
  const rotorsPerAxle = pos(values.rotorsPerAxle, 160);
  const laborHoursPerAxle = pos(values.laborHoursPerAxle, 1.5);
  const laborRate = pos(values.laborRate, 120);
  const fluidFlush = pos(values.fluidFlush, 0);
  const salesTaxPercent = pos(values.salesTaxPercent, 7);

  const n = axles === 3 ? 2 : 1;
  const parts = n * (padsPerAxle + (replaceRotors ? rotorsPerAxle : 0));
  const labor = n * laborHoursPerAxle * laborRate;
  const total = parts * (1 + salesTaxPercent / 100) + labor + fluidFlush;

  return {
    partsCost: round2(parts),
    laborCost: round2(labor),
    totalCost: round2(total),
    padsOnlyCost: round2(n * padsPerAxle * (1 + salesTaxPercent / 100) + labor + fluidFlush),
  };
};

// --- 12. Car AC Repair Cost Calculator -------------------------------------------------
export const carAcRepairCostCalculator: CustomCalculator = (values) => {
  const repairType = pick(values.repairType, 2, 5);
  const refrigerant = pick(values.refrigerant, 1, 2);
  const quote = pos(values.quote, 0);
  const diagnosticFee = pos(values.diagnosticFee, 100);

  const repair = quote > 0 ? quote : [0, 250, 650, 1300, 1600][repairType - 1];
  const recharge = refrigerant === 2 ? 400 : 150;

  return {
    repairCost: round2(repair),
    rechargeCost: round2(recharge),
    diagnosticFee: round2(diagnosticFee),
    totalCost: round2(repair + recharge + diagnosticFee),
  };
};

// --- 13. Car Towing Cost Calculator ----------------------------------------------------
export const carTowingCostCalculator: CustomCalculator = (values) => {
  const hookupFee = pos(values.hookupFee, 75);
  const perMile = pos(values.perMile, 4);
  const miles = pos(values.miles, 15);
  const freeMiles = pos(values.freeMiles, 0);
  const vehicle = pick(values.vehicle, 1, 2);
  const afterHoursPercent = pos(values.afterHoursPercent, 0);
  const extras = pos(values.extras, 0);

  const mileage = Math.max(0, miles - freeMiles) * perMile;
  const base = (hookupFee + mileage) * (vehicle === 2 ? 1.3 : 1);
  const total = base * (1 + afterHoursPercent / 100) + extras;

  return {
    mileageCharge: round2(mileage),
    totalTowCost: round2(total),
    costPerMile: round2(miles > 0 ? total / miles : 0),
  };
};

// --- 14. Roadside Assistance Plan Calculator -------------------------------------------
export const roadsideAssistancePlanCalculator: CustomCalculator = (values) => {
  const planYearlyCost = pos(values.planYearlyCost, 120);
  const towsPerYear = pos(values.towsPerYear, 0.5);
  const towCost = pos(values.towCost, 135);
  const otherCallsPerYear = pos(values.otherCallsPerYear, 0.8);
  const otherCallCost = pos(values.otherCallCost, 75);

  const expected = towsPerYear * towCost + otherCallsPerYear * otherCallCost;

  return {
    expectedPayPerUseCost: round2(expected),
    planCost: round2(planYearlyCost),
    expectedSavingsWithPlan: round2(expected - planYearlyCost),
    breakEvenCallsPerYear: round2(otherCallCost > 0 ? planYearlyCost / otherCallCost : 0),
  };
};

export const carRepairCustomCalculators: Record<string, CustomCalculator> = {
  "car-maintenance-cost-calculator": carMaintenanceCostCalculator,
  "car-repair-cost-calculator": carRepairCostCalculator,
  "mobile-mechanic-vs-dealership-calculator": mobileMechanicVsDealershipCalculator,
  "tire-replacement-cost-calculator": tireReplacementCostCalculator,
  "car-battery-replacement-cost-calculator": carBatteryReplacementCostCalculator,
  "windshield-replacement-cost-calculator": windshieldReplacementCostCalculator,
  "car-key-replacement-cost-calculator": carKeyReplacementCostCalculator,
  "catalytic-converter-replacement-cost-calculator": catalyticConverterReplacementCostCalculator,
  "timing-belt-replacement-cost-calculator": timingBeltReplacementCostCalculator,
  "transmission-repair-cost-calculator": transmissionRepairCostCalculator,
  "brake-job-cost-calculator": brakeJobCostCalculator,
  "car-ac-repair-cost-calculator": carAcRepairCostCalculator,
  "car-towing-cost-calculator": carTowingCostCalculator,
  "roadside-assistance-plan-calculator": roadsideAssistancePlanCalculator,
};
