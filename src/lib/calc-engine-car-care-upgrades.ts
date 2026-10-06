/**
 * Batch: "Car & Vehicle Cost Calculators" (5 Oct 2026), sub-batch 8 of 9 —
 * Car Care & Upgrades (14 tools), filed under Car & Vehicle Cost Calculators >
 * Car Maintenance, Repair & Upgrade Calculators. See calc-engine-car-buying.ts
 * for the full batch context.
 *
 *  - carInspectionCost (incl. emissions test): fees per inspection plus the
 *    expected retest and repair cost; yearly and total.
 *  - winterDrivingPrep (incl. winter tire swap): winter tires (+ separate
 *    wheels) spread over seasons, swaps, storage and other prep, less any
 *    insurance discount.
 *  - headlightRestoration: DIY kit vs professional vs new headlights per
 *    year of clarity.
 *  - carDetailing: package x vehicle size x times per year vs DIY supplies.
 *  - carWashSubscription: unlimited plan vs paying per wash.
 *  - carWrap: base by size x coverage x finish + design; vs a paint job.
 *  - ceramicCoating: pro coating per year of life vs regular waxing vs DIY.
 *  - paintProtectionFilm: coverage x vehicle factor, per year, less avoided
 *    chip repairs.
 *  - vehicleUndercoating: applications over the years vs the reduction in
 *    expected rust repair.
 *  - carAlarmSecurity: equipment + install + monitoring, less insurance
 *    savings.
 *  - aftermarketCarParts (incl. car modification budget): aftermarket vs
 *    OEM with labor and contingency; insurance increase and resale value.
 *  - customWheelUpgrade: wheels, tires, TPMS, mounting and alignment; extra
 *    fuel from heavier wheels.
 *  - offRoadVehicleUpgrade (incl. overlanding build): parts + labor +
 *    contingency; extra fuel from lower MPG.
 *  - carCampingConversion: build cost vs hotel nights saved; payback.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-car-care-upgrades-calculators.ts for the copy.
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

// --- 1. Car Inspection Cost Calculator -------------------------------------------------
export const carInspectionCostCalculator: CustomCalculator = (values) => {
  const safetyFee = pos(values.safetyFee, 25);
  const emissionsFee = pos(values.emissionsFee, 30);
  const everyYears = Math.max(1, pos(values.everyYears, 1));
  const failChancePercent = Math.min(100, pos(values.failChancePercent, 15));
  const retestFee = pos(values.retestFee, 20);
  const repairsToPass = pos(values.repairsToPass, 200);
  const years = Math.max(1, pos(values.years, 5));

  const perInspection = safetyFee + emissionsFee;
  const expectedExtra = (failChancePercent / 100) * (retestFee + repairsToPass);
  const yearly = (perInspection + expectedExtra) / everyYears;

  return {
    costPerInspection: round2(perInspection),
    expectedRetestAndRepairs: round2(expectedExtra),
    yearlyCost: round2(yearly),
    totalOverYears: round2(yearly * years),
  };
};

// --- 2. Winter Driving Prep Cost Calculator --------------------------------------------
export const winterDrivingPrepCostCalculator: CustomCalculator = (values) => {
  const winterTireSet = pos(values.winterTireSet, 800);
  const separateWheels = Math.round(safeNumber(values.separateWheels, 1)) === 1;
  const wheelsCost = pos(values.wheelsCost, 500);
  const seasons = Math.max(1, pos(values.seasons, 4));
  const swapCostOnWheels = pos(values.swapCostOnWheels, 50);
  const swapCostRemount = pos(values.swapCostRemount, 120);
  const storagePerSeason = pos(values.storagePerSeason, 0);
  const otherPrep = pos(values.otherPrep, 120);
  const insurancePremium = pos(values.insurancePremium, 1800);
  const insuranceDiscountPercent = Math.min(100, pos(values.insuranceDiscountPercent, 0));

  const upfront = winterTireSet + (separateWheels ? wheelsCost : 0);
  const swaps = 2 * (separateWheels ? swapCostOnWheels : swapCostRemount);
  const discount = (insurancePremium * insuranceDiscountPercent) / 100;
  const yearly = upfront / seasons + swaps + storagePerSeason + otherPrep - discount;

  return {
    upfrontCost: round2(upfront),
    swapsPerYear: round2(swaps),
    insuranceSavings: round2(discount),
    yearlyCost: round2(yearly),
    totalOverSeasons: round2(yearly * seasons),
  };
};

// --- 3. Headlight Restoration Cost Calculator ------------------------------------------
export const headlightRestorationCostCalculator: CustomCalculator = (values) => {
  const diyKitCost = pos(values.diyKitCost, 25);
  const diyLifeYears = Math.max(0.25, pos(values.diyLifeYears, 1));
  const proCost = pos(values.proCost, 120);
  const proLifeYears = Math.max(0.25, pos(values.proLifeYears, 2));
  const replacementPerHeadlight = pos(values.replacementPerHeadlight, 300);
  const headlights = Math.max(1, Math.round(pos(values.headlights, 2)));
  const replacementLifeYears = Math.max(0.25, pos(values.replacementLifeYears, 8));

  const diy = diyKitCost / diyLifeYears;
  const pro = proCost / proLifeYears;
  const replaceTotal = replacementPerHeadlight * headlights;
  const replace = replaceTotal / replacementLifeYears;

  return {
    diyPerYear: round2(diy),
    professionalPerYear: round2(pro),
    replacementTotal: round2(replaceTotal),
    replacementPerYear: round2(replace),
    cheapestPerYear: round2(Math.min(diy, pro, replace)),
  };
};

// --- 4. Car Detailing Cost Calculator --------------------------------------------------
export const carDetailingCostCalculator: CustomCalculator = (values) => {
  const pkg = pick(values.pkg, 2, 3);
  const vehicleSize = pick(values.vehicleSize, 1, 3);
  const timesPerYear = pos(values.timesPerYear, 4);
  const addOns = pos(values.addOns, 0);
  const diySuppliesYearly = pos(values.diySuppliesYearly, 120);

  const per = [50, 200, 500][pkg - 1] * [1, 1.25, 1.5][vehicleSize - 1] + addOns;
  const yearly = per * timesPerYear;

  return {
    costPerDetail: round2(per),
    yearlyCost: round2(yearly),
    diyYearlyCost: round2(diySuppliesYearly),
    savingsDoingItYourself: round2(yearly - diySuppliesYearly),
  };
};

// --- 5. Car Wash Subscription Calculator -----------------------------------------------
export const carWashSubscriptionCalculator: CustomCalculator = (values) => {
  const monthlyPlan = pos(values.monthlyPlan, 30);
  const singleWashPrice = pos(values.singleWashPrice, 15);
  const washesPerMonth = pos(values.washesPerMonth, 3);

  const payPer = singleWashPrice * washesPerMonth;

  return {
    payPerWashMonthly: round2(payPer),
    subscriptionMonthly: round2(monthlyPlan),
    monthlySavings: round2(payPer - monthlyPlan),
    yearlySavings: round2((payPer - monthlyPlan) * 12),
    breakEvenWashesPerMonth: round2(singleWashPrice > 0 ? monthlyPlan / singleWashPrice : 0),
    costPerWashOnPlan: round2(washesPerMonth > 0 ? monthlyPlan / washesPerMonth : 0),
  };
};

// --- 6. Car Wrap Cost Calculator -------------------------------------------------------
export const carWrapCostCalculator: CustomCalculator = (values) => {
  const vehicleSize = pick(values.vehicleSize, 2, 4);
  const coverage = pick(values.coverage, 1, 3);
  const finish = pick(values.finish, 1, 3);
  const designFee = pos(values.designFee, 0);
  const lifeYears = Math.max(1, pos(values.lifeYears, 5));
  const paintJobCost = pos(values.paintJobCost, 5000);

  const wrap = [2500, 3000, 3800, 4500][vehicleSize - 1] * [1, 0.5, 0.2][coverage - 1] * [1, 1.15, 1.8][finish - 1] + designFee;

  return {
    wrapCost: round2(wrap),
    costPerYear: round2(wrap / lifeYears),
    savingsVsPaintJob: round2(paintJobCost - wrap),
  };
};

// --- 7. Ceramic Coating Cost Calculator ------------------------------------------------
export const ceramicCoatingCostCalculator: CustomCalculator = (values) => {
  const proCoatingCost = pos(values.proCoatingCost, 1200);
  const coatingLifeYears = Math.max(0.5, pos(values.coatingLifeYears, 5));
  const diyCoatingCost = pos(values.diyCoatingCost, 100);
  const diyLifeYears = Math.max(0.25, pos(values.diyLifeYears, 1));
  const waxPrice = pos(values.waxPrice, 75);
  const waxesPerYear = pos(values.waxesPerYear, 4);

  const pro = proCoatingCost / coatingLifeYears;
  const wax = waxPrice * waxesPerYear;

  return {
    proCoatingPerYear: round2(pro),
    diyCoatingPerYear: round2(diyCoatingCost / diyLifeYears),
    waxingPerYear: round2(wax),
    savingsVsWaxing: round2(wax - pro),
  };
};

// --- 8. Paint Protection Film Cost Calculator ------------------------------------------
export const paintProtectionFilmCostCalculator: CustomCalculator = (values) => {
  const coverage = pick(values.coverage, 2, 4);
  const vehicle = pick(values.vehicle, 1, 3);
  const quote = pos(values.quote, 0);
  const lifeYears = Math.max(1, pos(values.lifeYears, 10));
  const avoidedRepairsPerYear = pos(values.avoidedRepairsPerYear, 150);

  const cost = quote > 0 ? quote : [1500, 2200, 3000, 6500][coverage - 1] * [1, 1.2, 1.5][vehicle - 1];

  return {
    ppfCost: round2(cost),
    costPerYear: round2(cost / lifeYears),
    avoidedRepairsOverLife: round2(avoidedRepairsPerYear * lifeYears),
    netCostOverLife: round2(cost - avoidedRepairsPerYear * lifeYears),
  };
};

// --- 9. Vehicle Undercoating Cost Calculator -------------------------------------------
export const vehicleUndercoatingCostCalculator: CustomCalculator = (values) => {
  const applicationCost = pos(values.applicationCost, 300);
  const reapplyEveryYears = Math.max(1, pos(values.reapplyEveryYears, 5));
  const years = Math.max(1, pos(values.years, 10));
  const rustRepairCost = pos(values.rustRepairCost, 3000);
  const rustChanceWithoutPercent = Math.min(100, pos(values.rustChanceWithoutPercent, 40));
  const rustChanceWithPercent = Math.min(100, pos(values.rustChanceWithPercent, 10));

  const applications = Math.ceil(years / reapplyEveryYears);
  const coating = applications * applicationCost;
  const avoided = (rustRepairCost * (rustChanceWithoutPercent - rustChanceWithPercent)) / 100;

  return {
    applications,
    totalCoatingCost: round2(coating),
    expectedRustCostAvoided: round2(avoided),
    netBenefit: round2(avoided - coating),
  };
};

// --- 10. Car Alarm & Security System Cost Calculator -----------------------------------
export const carAlarmSecurityCostCalculator: CustomCalculator = (values) => {
  const equipmentCost = pos(values.equipmentCost, 250);
  const installation = pos(values.installation, 200);
  const monitoringMonthly = pos(values.monitoringMonthly, 0);
  const years = Math.max(1, pos(values.years, 5));
  const comprehensivePremium = pos(values.comprehensivePremium, 400);
  const insuranceDiscountPercent = Math.min(100, pos(values.insuranceDiscountPercent, 10));

  const upfront = equipmentCost + installation;
  const monitoring = monitoringMonthly * 12 * years;
  const savings = ((comprehensivePremium * insuranceDiscountPercent) / 100) * years;

  return {
    upfrontCost: round2(upfront),
    monitoringOverYears: round2(monitoring),
    insuranceSavingsOverYears: round2(savings),
    netCostOverYears: round2(upfront + monitoring - savings),
  };
};

// --- 11. Aftermarket Car Parts Cost Calculator -----------------------------------------
export const aftermarketCarPartsCostCalculator: CustomCalculator = (values) => {
  const aftermarketParts = pos(values.aftermarketParts, 2000);
  const oemParts = pos(values.oemParts, 2800);
  const laborHours = pos(values.laborHours, 6);
  const laborRate = pos(values.laborRate, 120);
  const contingencyPercent = pos(values.contingencyPercent, 10);
  const insuranceIncreaseYearly = pos(values.insuranceIncreaseYearly, 0);
  const resaleValueAdded = pos(values.resaleValueAdded, 0);

  const labor = laborHours * laborRate;
  const after = (aftermarketParts + labor) * (1 + contingencyPercent / 100);
  const oem = (oemParts + labor) * (1 + contingencyPercent / 100);

  return {
    laborCost: round2(labor),
    aftermarketTotal: round2(after),
    oemTotal: round2(oem),
    savingsVsOem: round2(oem - after),
    firstYearBudget: round2(after + insuranceIncreaseYearly),
    netCostAfterResale: round2(after - resaleValueAdded),
  };
};

// --- 12. Custom Wheel Upgrade Cost Calculator ------------------------------------------
export const customWheelUpgradeCostCalculator: CustomCalculator = (values) => {
  const wheelPrice = pos(values.wheelPrice, 300);
  const wheels = Math.max(1, Math.round(pos(values.wheels, 4)));
  const newTires = Math.round(safeNumber(values.newTires, 1)) === 1;
  const tirePrice = pos(values.tirePrice, 200);
  const tpmsPerWheel = pos(values.tpmsPerWheel, 50);
  const mountPerWheel = pos(values.mountPerWheel, 25);
  const alignment = pos(values.alignment, 100);
  const mpgLossPercent = Math.min(50, pos(values.mpgLossPercent, 2));
  const milesPerYear = pos(values.milesPerYear, 12000);
  const mpg = Math.max(1, pos(values.mpg, 28));
  const gasPrice = pos(values.gasPrice, 3.4);

  const wheelsCost = wheelPrice * wheels;
  const tires = newTires ? tirePrice * wheels : 0;
  const install = (tpmsPerWheel + mountPerWheel) * wheels + alignment;
  const fuel = (milesPerYear / mpg) * gasPrice;
  const extraFuel = fuel / (1 - mpgLossPercent / 100) - fuel;

  return {
    wheelsCost: round2(wheelsCost),
    tiresCost: round2(tires),
    installationAndSensors: round2(install),
    totalUpgradeCost: round2(wheelsCost + tires + install),
    extraFuelPerYear: round2(extraFuel),
  };
};

// --- 13. Off-Road Vehicle Upgrade Cost Calculator --------------------------------------
export const offRoadVehicleUpgradeCostCalculator: CustomCalculator = (values) => {
  const liftKit = pos(values.liftKit, 1500);
  const wheelsTires = pos(values.wheelsTires, 2500);
  const armor = pos(values.armor, 1500);
  const winch = pos(values.winch, 800);
  const lighting = pos(values.lighting, 400);
  const overlandGear = pos(values.overlandGear, 3000);
  const laborHours = pos(values.laborHours, 20);
  const laborRate = pos(values.laborRate, 120);
  const contingencyPercent = pos(values.contingencyPercent, 10);
  const mpgBefore = Math.max(1, pos(values.mpgBefore, 20));
  const mpgDropPercent = Math.min(80, pos(values.mpgDropPercent, 10));
  const milesPerYear = pos(values.milesPerYear, 12000);
  const gasPrice = pos(values.gasPrice, 3.4);

  const parts = liftKit + wheelsTires + armor + winch + lighting + overlandGear;
  const labor = laborHours * laborRate;
  const contingency = ((parts + labor) * contingencyPercent) / 100;
  const fuel = (milesPerYear / mpgBefore) * gasPrice;
  const extraFuel = fuel / (1 - mpgDropPercent / 100) - fuel;

  return {
    partsTotal: round2(parts),
    laborCost: round2(labor),
    contingency: round2(contingency),
    totalBuildCost: round2(parts + labor + contingency),
    extraFuelPerYear: round2(extraFuel),
  };
};

// --- 14. Car Camping Conversion Cost Calculator ----------------------------------------
export const carCampingConversionCostCalculator: CustomCalculator = (values) => {
  const bedPlatform = pos(values.bedPlatform, 300);
  const mattress = pos(values.mattress, 150);
  const windowCovers = pos(values.windowCovers, 100);
  const powerStation = pos(values.powerStation, 500);
  const solarPanel = pos(values.solarPanel, 200);
  const fridge = pos(values.fridge, 300);
  const cooking = pos(values.cooking, 150);
  const storage = pos(values.storage, 150);
  const nightsPerYear = pos(values.nightsPerYear, 20);
  const hotelPerNight = pos(values.hotelPerNight, 130);
  const campsitePerNight = pos(values.campsitePerNight, 30);

  const cost = bedPlatform + mattress + windowCovers + powerStation + solarPanel + fridge + cooking + storage;
  const perNightSaving = hotelPerNight - campsitePerNight;

  return {
    conversionCost: round2(cost),
    yearlySavingsVsHotels: round2(nightsPerYear * perNightSaving),
    paybackNights: round2(perNightSaving > 0 ? cost / perNightSaving : 0),
    firstYearCostPerNight: round2(nightsPerYear > 0 ? (cost + nightsPerYear * campsitePerNight) / nightsPerYear : 0),
  };
};

export const carCareUpgradesCustomCalculators: Record<string, CustomCalculator> = {
  "car-inspection-cost-calculator": carInspectionCostCalculator,
  "winter-driving-prep-cost-calculator": winterDrivingPrepCostCalculator,
  "headlight-restoration-cost-calculator": headlightRestorationCostCalculator,
  "car-detailing-cost-calculator": carDetailingCostCalculator,
  "car-wash-subscription-calculator": carWashSubscriptionCalculator,
  "car-wrap-cost-calculator": carWrapCostCalculator,
  "ceramic-coating-cost-calculator": ceramicCoatingCostCalculator,
  "paint-protection-film-cost-calculator": paintProtectionFilmCostCalculator,
  "vehicle-undercoating-cost-calculator": vehicleUndercoatingCostCalculator,
  "car-alarm-security-system-cost-calculator": carAlarmSecurityCostCalculator,
  "aftermarket-car-parts-cost-calculator": aftermarketCarPartsCostCalculator,
  "custom-wheel-upgrade-cost-calculator": customWheelUpgradeCostCalculator,
  "off-road-vehicle-upgrade-cost-calculator": offRoadVehicleUpgradeCostCalculator,
  "car-camping-conversion-cost-calculator": carCampingConversionCostCalculator,
};
