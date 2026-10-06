/**
 * Batch: "Car & Vehicle Cost Calculators" (5 Oct 2026), sub-batch 9 of 9 —
 * Vehicle Business Use & Income (8 tools), filed under Car & Vehicle Cost
 * Calculators > Vehicle Business Use & Income Calculators. See
 * calc-engine-car-buying.ts for the full batch context.
 *
 *  - mileageReimbursement (corporate mileage reimbursement value): 2026 IRS
 *    business rate 72.5 cents (Jan-Jun) and 76 cents (Jul-Dec, mid-year
 *    increase) vs the employer's rate and your actual cost per mile.
 *  - vehicleBusinessUsePercentage: business miles / total miles (commuting
 *    isn't business); actual-expense vs standard-mileage deduction.
 *  - vehicleDepreciationTax: first-year deduction by class — passenger cars
 *    capped (2026: $20,300 with bonus, $12,300 without, x business use),
 *    heavy SUVs (Section 179 cap $32,000 then 100% bonus), heavy trucks and
 *    vans; 50%-or-less business use -> 10% straight-line (ADS) year one.
 *  - fleetVehicleCost: depreciation, fuel, maintenance, insurance,
 *    registration and telematics per vehicle and for the fleet.
 *  - fleetReplacementCycle: average yearly cost for keeping a vehicle 1-10
 *    years (depreciation + rising maintenance) -> cheapest replacement year.
 *  - fleetFuelCardSavings: per-gallon discount + prevented misuse + admin
 *    time saved, less card fees.
 *  - carSharingHostEarnings: bookings x host share, less cleaning and extra
 *    wear, after tax.
 *  - carWrapAdvertisingIncome: monthly payment less extra driving cost,
 *    after tax.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-car-business-calculators.ts for the copy.
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

// --- 1. Mileage Reimbursement Calculator -----------------------------------------------
export const mileageReimbursementCalculator: CustomCalculator = (values) => {
  const milesFirstHalf = pos(values.milesFirstHalf, 4000);
  const milesSecondHalf = pos(values.milesSecondHalf, 4000);
  const rateFirstHalf = pos(values.rateFirstHalf, 0.725);
  const rateSecondHalf = pos(values.rateSecondHalf, 0.76);
  const employerRate = pos(values.employerRate, 0.6);
  const actualCostPerMile = pos(values.actualCostPerMile, 0.45);

  const miles = milesFirstHalf + milesSecondHalf;
  const irs = milesFirstHalf * rateFirstHalf + milesSecondHalf * rateSecondHalf;
  const employer = miles * employerRate;
  const actual = miles * actualCostPerMile;

  return {
    totalBusinessMiles: round2(miles),
    irsRateValue: round2(irs),
    employerReimbursement: round2(employer),
    shortfallVsIrsRate: round2(irs - employer),
    yourActualCost: round2(actual),
    gainOverActualCost: round2(employer - actual),
  };
};

// --- 2. Vehicle Business-Use Percentage Calculator -------------------------------------
export const vehicleBusinessUsePercentageCalculator: CustomCalculator = (values) => {
  const totalMiles = pos(values.totalMiles, 15000);
  const businessMiles = pos(values.businessMiles, 6000);
  const totalExpenses = pos(values.totalExpenses, 9000);
  const standardRate = pos(values.standardRate, 0.725);
  const taxRatePercent = Math.min(100, pos(values.taxRatePercent, 30));

  const share = totalMiles > 0 ? Math.min(1, businessMiles / totalMiles) : 0;
  const actual = totalExpenses * share;
  const standard = Math.min(businessMiles, totalMiles) * standardRate;
  const best = Math.max(actual, standard);

  return {
    businessUsePercent: round2(share * 100),
    actualExpenseDeduction: round2(actual),
    standardMileageDeduction: round2(standard),
    largerDeduction: round2(best),
    taxSavings: round2((best * taxRatePercent) / 100),
  };
};

// --- 3. Vehicle Depreciation Tax Calculator --------------------------------------------
export const vehicleDepreciationTaxCalculator: CustomCalculator = (values) => {
  const vehicleCost = pos(values.vehicleCost, 60000);
  const vehicleClass = pick(values.vehicleClass, 2, 3);
  const businessUsePercent = Math.min(100, pos(values.businessUsePercent, 80));
  const useBonus = Math.round(safeNumber(values.useBonus, 1)) === 1;
  const taxRatePercent = Math.min(100, pos(values.taxRatePercent, 30));

  const share = businessUsePercent / 100;
  const basis = vehicleCost * share;
  let deduction: number;
  if (businessUsePercent <= 50) {
    // Alternative depreciation system: 5-year straight line, half-year -> 10% in year one.
    deduction = basis * 0.1;
    if (vehicleClass === 1) deduction = Math.min(deduction, 12300 * share);
  } else if (vehicleClass === 1) {
    const cap = (useBonus ? 20300 : 12300) * share;
    deduction = Math.min(useBonus ? basis : basis * 0.2, cap);
  } else if (vehicleClass === 2) {
    const s179 = Math.min(basis, 32000);
    deduction = useBonus ? basis : s179 + (basis - s179) * 0.2;
  } else {
    deduction = basis;
  }

  return {
    businessBasis: round2(basis),
    firstYearDeduction: round2(deduction),
    firstYearTaxSavings: round2((deduction * taxRatePercent) / 100),
    remainingBasis: round2(basis - deduction),
    deductionAsShareOfCost: round2(vehicleCost > 0 ? (deduction / vehicleCost) * 100 : 0),
  };
};

// --- 4. Fleet Vehicle Cost Calculator --------------------------------------------------
export const fleetVehicleCostCalculator: CustomCalculator = (values) => {
  const vehicles = Math.max(1, Math.round(pos(values.vehicles, 10)));
  const purchasePrice = pos(values.purchasePrice, 40000);
  const years = Math.max(1, pos(values.years, 5));
  const resalePercent = Math.min(100, pos(values.resalePercent, 35));
  const milesPerYear = pos(values.milesPerYear, 25000);
  const mpg = Math.max(1, pos(values.mpg, 22));
  const fuelPrice = pos(values.fuelPrice, 3.5);
  const maintenancePerMile = pos(values.maintenancePerMile, 0.08);
  const insurance = pos(values.insurance, 2500);
  const registration = pos(values.registration, 300);
  const telematicsMonthly = pos(values.telematicsMonthly, 30);

  const depreciation = (purchasePrice * (1 - resalePercent / 100)) / years;
  const fuel = (milesPerYear / mpg) * fuelPrice;
  const maintenance = milesPerYear * maintenancePerMile;
  const perVehicle = depreciation + fuel + maintenance + insurance + registration + telematicsMonthly * 12;

  return {
    depreciationPerVehicle: round2(depreciation),
    fuelPerVehicle: round2(fuel),
    costPerVehiclePerYear: round2(perVehicle),
    fleetYearlyCost: round2(perVehicle * vehicles),
    costPerMile: round2(milesPerYear > 0 ? perVehicle / milesPerYear : 0),
  };
};

// --- 5. Fleet Vehicle Replacement Cycle Calculator -------------------------------------
export const fleetReplacementCycleCalculator: CustomCalculator = (values) => {
  const purchasePrice = pos(values.purchasePrice, 40000);
  const depreciationPercent = Math.min(90, pos(values.depreciationPercent, 18));
  const firstYearMaintenance = pos(values.firstYearMaintenance, 800);
  const maintenanceGrowthPercent = pos(values.maintenanceGrowthPercent, 25);
  const plannedYears = Math.min(10, Math.max(1, Math.round(pos(values.plannedYears, 5))));

  const averages: number[] = [];
  let maint = 0;
  for (let n = 1; n <= 10; n++) {
    maint += firstYearMaintenance * Math.pow(1 + maintenanceGrowthPercent / 100, n - 1);
    const value = purchasePrice * Math.pow(1 - depreciationPercent / 100, n);
    averages.push((purchasePrice - value + maint) / n);
  }
  let best = 0;
  for (let k = 1; k < averages.length; k++) if (averages[k] < averages[best]) best = k;

  return {
    bestReplacementYear: best + 1,
    lowestAverageYearlyCost: round2(averages[best]),
    yourPlanAverageYearlyCost: round2(averages[plannedYears - 1]),
    extraCostPerYearOfYourPlan: round2(averages[plannedYears - 1] - averages[best]),
  };
};

// --- 6. Fleet Fuel Card Savings Calculator ---------------------------------------------
export const fleetFuelCardSavingsCalculator: CustomCalculator = (values) => {
  const vehicles = Math.max(1, Math.round(pos(values.vehicles, 10)));
  const gallonsPerVehicle = pos(values.gallonsPerVehicle, 120);
  const fuelPrice = pos(values.fuelPrice, 3.5);
  const discountPerGallon = pos(values.discountPerGallon, 0.06);
  const misusePreventedPercent = Math.min(100, pos(values.misusePreventedPercent, 2));
  const adminHoursSaved = pos(values.adminHoursSaved, 10);
  const adminHourlyCost = pos(values.adminHourlyCost, 30);
  const cardFeePerVehicle = pos(values.cardFeePerVehicle, 2);

  const gallons = vehicles * gallonsPerVehicle;
  const spend = gallons * fuelPrice;
  const discount = gallons * discountPerGallon;
  const misuse = (spend * misusePreventedPercent) / 100;
  const admin = adminHoursSaved * adminHourlyCost;
  const fees = cardFeePerVehicle * vehicles;
  const net = discount + misuse + admin - fees;

  return {
    monthlyFuelSpend: round2(spend),
    discountSavings: round2(discount),
    misusePrevented: round2(misuse),
    adminTimeSavings: round2(admin),
    cardFees: round2(fees),
    netMonthlySavings: round2(net),
    netYearlySavings: round2(net * 12),
  };
};

// --- 7. Car Sharing Host Earnings Calculator -------------------------------------------
export const carSharingHostEarningsCalculator: CustomCalculator = (values) => {
  const dailyRate = pos(values.dailyRate, 70);
  const bookedDaysPerMonth = Math.min(31, pos(values.bookedDaysPerMonth, 15));
  const hostSharePercent = Math.min(100, pos(values.hostSharePercent, 75));
  const tripsPerMonth = pos(values.tripsPerMonth, 5);
  const cleaningPerTrip = pos(values.cleaningPerTrip, 20);
  const milesPerBookedDay = pos(values.milesPerBookedDay, 50);
  const wearPerMile = pos(values.wearPerMile, 0.1);
  const taxRatePercent = Math.min(100, pos(values.taxRatePercent, 22));

  const gross = dailyRate * bookedDaysPerMonth;
  const share = (gross * hostSharePercent) / 100;
  const costs = tripsPerMonth * cleaningPerTrip + bookedDaysPerMonth * milesPerBookedDay * wearPerMile;
  const net = share - costs;
  const afterTax = net > 0 ? net * (1 - taxRatePercent / 100) : net;

  return {
    grossBookings: round2(gross),
    hostEarnings: round2(share),
    monthlyCosts: round2(costs),
    netMonthlyBeforeTax: round2(net),
    netMonthlyAfterTax: round2(afterTax),
    netYearlyAfterTax: round2(afterTax * 12),
    netPerBookedDay: round2(bookedDaysPerMonth > 0 ? net / bookedDaysPerMonth : 0),
  };
};

// --- 8. Car Wrap Advertising Income Calculator -----------------------------------------
export const carWrapAdvertisingIncomeCalculator: CustomCalculator = (values) => {
  const monthlyPayment = pos(values.monthlyPayment, 150);
  const months = pos(values.months, 6);
  const extraMilesPerMonth = pos(values.extraMilesPerMonth, 0);
  const costPerMile = pos(values.costPerMile, 0.3);
  const taxRatePercent = Math.min(100, pos(values.taxRatePercent, 22));

  const gross = monthlyPayment * months;
  const driving = extraMilesPerMonth * costPerMile * months;
  const net = gross - driving;
  const afterTax = net > 0 ? net * (1 - taxRatePercent / 100) : net;

  return {
    grossIncome: round2(gross),
    extraDrivingCost: round2(driving),
    netBeforeTax: round2(net),
    netAfterTax: round2(afterTax),
    netPerMonth: round2(months > 0 ? afterTax / months : 0),
  };
};

export const carBusinessCustomCalculators: Record<string, CustomCalculator> = {
  "mileage-reimbursement-calculator": mileageReimbursementCalculator,
  "vehicle-business-use-percentage-calculator": vehicleBusinessUsePercentageCalculator,
  "vehicle-depreciation-tax-calculator": vehicleDepreciationTaxCalculator,
  "fleet-vehicle-cost-calculator": fleetVehicleCostCalculator,
  "fleet-replacement-cycle-calculator": fleetReplacementCycleCalculator,
  "fleet-fuel-card-savings-calculator": fleetFuelCardSavingsCalculator,
  "car-sharing-host-earnings-calculator": carSharingHostEarningsCalculator,
  "car-wrap-advertising-income-calculator": carWrapAdvertisingIncomeCalculator,
};
