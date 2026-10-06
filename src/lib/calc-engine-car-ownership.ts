/**
 * Batch: "Car & Vehicle Cost Calculators" (5 Oct 2026), sub-batch 5 of 9 —
 * Ownership Cost (11 tools), filed under Car & Vehicle Cost Calculators >
 * Car Ownership, Fuel & EV Cost Calculators. See calc-engine-car-buying.ts
 * for the full batch context.
 *
 *  - carTotalCostOfOwnership (incl. truck, SUV, minivan, luxury, sports,
 *    compact, hybrid and college student car ownership cost): typical 5-year
 *    value retention by vehicle type + fuel, insurance, registration,
 *    maintenance, parking, loan interest and sales tax.
 *  - carDepreciation (incl. depreciation by brand category, classic car
 *    value): first-year drop then a yearly rate by category, or your own
 *    rate; classics appreciate.
 *  - motorcycle/boat/RV/ATV total cost of ownership: depreciation + yearly
 *    running costs + fuel by miles or engine hours; cost per mile, hour or
 *    night used.
 *  - firstCarStartupCost: cash needed up front (down payment, tax, fees,
 *    first insurance premium, emergency fund) and the monthly cost after.
 *  - ruralVsUrbanCarOwnership: more miles in the country vs higher insurance
 *    and parking in the city.
 *  - monthlyParkingCost: monthly permit vs daily vs hourly; break-even days.
 *  - tollCost (incl. toll transponder savings): pay-by-plate vs transponder
 *    discount less the transponder fee.
 *  - carStorageCost: storage fees + prep, less insurance savings, vs selling
 *    and buying back.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-car-ownership-calculators.ts for the copy.
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

function payment(principal: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
}

// Interest paid in the first k months of an amortizing loan.
function interestPaid(principal: number, i: number, n: number, k: number): number {
  const p = payment(principal, i, n);
  let bal = principal;
  let total = 0;
  for (let m = 0; m < Math.min(k, n); m++) {
    const int = bal * i;
    total += int;
    bal = Math.max(0, bal + int - p);
  }
  return total;
}

// Shared shape for the vehicle TCO tools.
function simpleTco(price: number, depreciationPercent: number, years: number, yearlyRunning: number, upfront: number) {
  const value = price * Math.pow(1 - Math.min(100, depreciationPercent) / 100, years);
  const depreciation = price - value;
  const total = depreciation + yearlyRunning * years + upfront;
  return { value, depreciation, total };
}

// --- 1. Car Total Cost of Ownership Calculator -----------------------------------------
export const carTotalCostOfOwnershipCalculator: CustomCalculator = (values) => {
  const vehicleType = pick(values.vehicleType, 2, 8);
  const price = pos(values.price, 35000);
  const years = Math.max(1, pos(values.years, 5));
  const milesPerYear = pos(values.milesPerYear, 12000);
  const mpg = Math.max(1, pos(values.mpg, 30));
  const gasPrice = pos(values.gasPrice, 3.4);
  const insurance = pos(values.insurance, 1800);
  const registration = pos(values.registration, 200);
  const maintenance = pos(values.maintenance, 900);
  const parking = pos(values.parking, 0);
  const downPayment = pos(values.downPayment, 5000);
  const loanRatePercent = pos(values.loanRatePercent, 7);
  const loanTermMonths = Math.max(1, Math.round(pos(values.loanTermMonths, 60)));
  const salesTaxPercent = pos(values.salesTaxPercent, 7);

  // Share of value kept after 5 years: compact, midsize, SUV, truck, minivan, hybrid, luxury, sports.
  const retained5 = [0.48, 0.47, 0.52, 0.58, 0.45, 0.5, 0.38, 0.5][vehicleType - 1];
  const value = price * Math.pow(retained5, years / 5);
  const depreciation = price - value;
  const fuel = (milesPerYear / mpg) * gasPrice * years;
  const loan = Math.max(0, price - downPayment);
  const interest = interestPaid(loan, loanRatePercent / 100 / 12, loanTermMonths, Math.round(years * 12));
  const tax = (price * salesTaxPercent) / 100;
  const running = (insurance + registration + maintenance + parking) * years;
  const total = depreciation + fuel + interest + tax + running;

  return {
    depreciation: round2(depreciation),
    fuel: round2(fuel),
    insuranceTotal: round2(insurance * years),
    maintenanceTotal: round2(maintenance * years),
    loanInterest: round2(interest),
    taxesAndFees: round2(tax + registration * years),
    totalCost: round2(total),
    costPerYear: round2(total / years),
    costPerMonth: round2(total / years / 12),
    costPerMile: round2(milesPerYear > 0 ? total / (milesPerYear * years) : 0),
  };
};

// --- 2. Car Depreciation Calculator ----------------------------------------------------
export const carDepreciationCalculator: CustomCalculator = (values) => {
  const purchasePrice = pos(values.purchasePrice, 35000);
  const years = Math.max(0, Math.round(pos(values.years, 5)));
  const category = pick(values.category, 1, 6);
  const customRatePercent = Math.min(100, pos(values.customRatePercent, 0));

  // [first-year drop %, later yearly %]; classics appreciate (negative).
  const rates = [[20, 15], [12, 10], [25, 18], [15, 12], [25, 15], [-4, -4]][category - 1];
  const first = customRatePercent > 0 ? customRatePercent : rates[0];
  const later = customRatePercent > 0 ? customRatePercent : rates[1];
  let value = purchasePrice;
  for (let y = 1; y <= years; y++) value *= 1 - (y === 1 ? first : later) / 100;
  const lost = purchasePrice - value;

  return {
    valueAfterYears: round2(value),
    totalDepreciation: round2(lost),
    depreciationPercent: round2(purchasePrice > 0 ? (lost / purchasePrice) * 100 : 0),
    firstYearLoss: round2(years >= 1 ? (purchasePrice * first) / 100 : 0),
    averagePerYear: round2(years > 0 ? lost / years : 0),
  };
};

// --- 3. Motorcycle Total Cost of Ownership Calculator ----------------------------------
export const motorcycleTotalCostOfOwnershipCalculator: CustomCalculator = (values) => {
  const price = pos(values.price, 12000);
  const years = Math.max(1, pos(values.years, 5));
  const depreciationPercent = pos(values.depreciationPercent, 12);
  const milesPerYear = pos(values.milesPerYear, 4000);
  const mpg = Math.max(1, pos(values.mpg, 45));
  const gasPrice = pos(values.gasPrice, 3.4);
  const insurance = pos(values.insurance, 600);
  const registration = pos(values.registration, 100);
  const maintenance = pos(values.maintenance, 500);
  const gear = pos(values.gear, 800);

  const fuelYearly = (milesPerYear / mpg) * gasPrice;
  const r = simpleTco(price, depreciationPercent, years, fuelYearly + insurance + registration + maintenance, gear);

  return {
    depreciation: round2(r.depreciation),
    fuelPerYear: round2(fuelYearly),
    totalCost: round2(r.total),
    costPerYear: round2(r.total / years),
    costPerMonth: round2(r.total / years / 12),
    costPerMile: round2(milesPerYear > 0 ? r.total / (milesPerYear * years) : 0),
  };
};

// --- 4. Boat Total Cost of Ownership Calculator ----------------------------------------
export const boatTotalCostOfOwnershipCalculator: CustomCalculator = (values) => {
  const price = pos(values.price, 40000);
  const years = Math.max(1, pos(values.years, 5));
  const depreciationPercent = pos(values.depreciationPercent, 8);
  const hoursPerYear = pos(values.hoursPerYear, 75);
  const gallonsPerHour = pos(values.gallonsPerHour, 8);
  const fuelPrice = pos(values.fuelPrice, 4.5);
  const insurance = pos(values.insurance, 800);
  const slipOrStorage = pos(values.slipOrStorage, 3000);
  const maintenance = pos(values.maintenance, 2000);
  const registration = pos(values.registration, 100);

  const fuelYearly = hoursPerYear * gallonsPerHour * fuelPrice;
  const r = simpleTco(price, depreciationPercent, years, fuelYearly + insurance + slipOrStorage + maintenance + registration, 0);

  return {
    depreciation: round2(r.depreciation),
    fuelPerYear: round2(fuelYearly),
    totalCost: round2(r.total),
    costPerYear: round2(r.total / years),
    costPerMonth: round2(r.total / years / 12),
    costPerHourUsed: round2(hoursPerYear > 0 ? r.total / (hoursPerYear * years) : 0),
  };
};

// --- 5. RV Total Cost of Ownership Calculator ------------------------------------------
export const rvTotalCostOfOwnershipCalculator: CustomCalculator = (values) => {
  const price = pos(values.price, 80000);
  const years = Math.max(1, pos(values.years, 5));
  const depreciationPercent = pos(values.depreciationPercent, 10);
  const milesPerYear = pos(values.milesPerYear, 5000);
  const mpg = Math.max(1, pos(values.mpg, 10));
  const gasPrice = pos(values.gasPrice, 3.6);
  const insurance = pos(values.insurance, 1500);
  const registration = pos(values.registration, 400);
  const storage = pos(values.storage, 1200);
  const maintenance = pos(values.maintenance, 1500);
  const nightsPerYear = pos(values.nightsPerYear, 30);
  const campsitePerNight = pos(values.campsitePerNight, 50);

  const fuelYearly = (milesPerYear / mpg) * gasPrice;
  const campsites = nightsPerYear * campsitePerNight;
  const r = simpleTco(price, depreciationPercent, years, fuelYearly + insurance + registration + storage + maintenance + campsites, 0);

  return {
    depreciation: round2(r.depreciation),
    fuelPerYear: round2(fuelYearly),
    campsitesPerYear: round2(campsites),
    totalCost: round2(r.total),
    costPerYear: round2(r.total / years),
    costPerNight: round2(nightsPerYear > 0 ? r.total / (nightsPerYear * years) : 0),
  };
};

// --- 6. ATV Total Cost of Ownership Calculator -----------------------------------------
export const atvTotalCostOfOwnershipCalculator: CustomCalculator = (values) => {
  const price = pos(values.price, 9000);
  const years = Math.max(1, pos(values.years, 5));
  const depreciationPercent = pos(values.depreciationPercent, 12);
  const hoursPerYear = pos(values.hoursPerYear, 100);
  const gallonsPerHour = pos(values.gallonsPerHour, 1);
  const gasPrice = pos(values.gasPrice, 3.4);
  const insurance = pos(values.insurance, 250);
  const registration = pos(values.registration, 50);
  const maintenance = pos(values.maintenance, 400);
  const gear = pos(values.gear, 500);

  const fuelYearly = hoursPerYear * gallonsPerHour * gasPrice;
  const r = simpleTco(price, depreciationPercent, years, fuelYearly + insurance + registration + maintenance, gear);

  return {
    depreciation: round2(r.depreciation),
    fuelPerYear: round2(fuelYearly),
    totalCost: round2(r.total),
    costPerYear: round2(r.total / years),
    costPerMonth: round2(r.total / years / 12),
    costPerHourUsed: round2(hoursPerYear > 0 ? r.total / (hoursPerYear * years) : 0),
  };
};

// --- 7. First Car Startup Cost Calculator ----------------------------------------------
export const firstCarStartupCostCalculator: CustomCalculator = (values) => {
  const carPrice = pos(values.carPrice, 12000);
  const downPaymentPercent = Math.min(100, pos(values.downPaymentPercent, 20));
  const salesTaxPercent = pos(values.salesTaxPercent, 7);
  const registrationTitle = pos(values.registrationTitle, 300);
  const insuranceSixMonths = pos(values.insuranceSixMonths, 1200);
  const inspection = pos(values.inspection, 50);
  const emergencyFund = pos(values.emergencyFund, 1000);
  const accessories = pos(values.accessories, 150);
  const loanRatePercent = pos(values.loanRatePercent, 9);
  const loanTermMonths = Math.max(1, Math.round(pos(values.loanTermMonths, 48)));
  const gasMonthly = pos(values.gasMonthly, 120);
  const maintenanceMonthly = pos(values.maintenanceMonthly, 50);

  const down = (carPrice * downPaymentPercent) / 100;
  const tax = (carPrice * salesTaxPercent) / 100;
  const upfront = down + tax + registrationTitle + insuranceSixMonths + inspection + emergencyFund + accessories;
  const loan = carPrice - down;
  const pmt = payment(loan, loanRatePercent / 100 / 12, loanTermMonths);

  return {
    downPayment: round2(down),
    salesTax: round2(tax),
    upfrontCashNeeded: round2(upfront),
    loanAmount: round2(loan),
    monthlyPayment: round2(pmt),
    monthlyCostAfterPurchase: round2(pmt + insuranceSixMonths / 6 + gasMonthly + maintenanceMonthly),
  };
};

// --- 8. Rural vs Urban Car Ownership Calculator ----------------------------------------
export const ruralVsUrbanCarOwnershipCalculator: CustomCalculator = (values) => {
  const fixedCosts = pos(values.fixedCosts, 4000);
  const maintenancePerMile = pos(values.maintenancePerMile, 0.1);
  const ruralMiles = pos(values.ruralMiles, 18000);
  const ruralFuelPerMile = pos(values.ruralFuelPerMile, 0.12);
  const ruralInsurance = pos(values.ruralInsurance, 1400);
  const urbanMiles = pos(values.urbanMiles, 8000);
  const urbanFuelPerMile = pos(values.urbanFuelPerMile, 0.15);
  const urbanInsurance = pos(values.urbanInsurance, 2200);
  const urbanParking = pos(values.urbanParking, 2400);

  const rural = fixedCosts + ruralInsurance + ruralMiles * (ruralFuelPerMile + maintenancePerMile);
  const urban = fixedCosts + urbanInsurance + urbanParking + urbanMiles * (urbanFuelPerMile + maintenancePerMile);

  return {
    ruralYearlyCost: round2(rural),
    urbanYearlyCost: round2(urban),
    urbanMinusRural: round2(urban - rural),
    ruralCostPerMile: round2(ruralMiles > 0 ? rural / ruralMiles : 0),
    urbanCostPerMile: round2(urbanMiles > 0 ? urban / urbanMiles : 0),
  };
};

// --- 9. Monthly Parking Cost Calculator ------------------------------------------------
export const monthlyParkingCostCalculator: CustomCalculator = (values) => {
  const monthlyPermit = pos(values.monthlyPermit, 200);
  const dailyRate = pos(values.dailyRate, 15);
  const hourlyRate = pos(values.hourlyRate, 3);
  const hoursPerDay = pos(values.hoursPerDay, 9);
  const daysPerMonth = pos(values.daysPerMonth, 20);

  const daily = dailyRate * daysPerMonth;
  const hourly = Math.min(hourlyRate * hoursPerDay, dailyRate > 0 ? dailyRate : Infinity) * daysPerMonth;
  const cheapest = Math.min(monthlyPermit, daily, hourly);

  return {
    monthlyPermitCost: round2(monthlyPermit),
    payingDailyCost: round2(daily),
    payingHourlyCost: round2(hourly),
    cheapestMonthlyCost: round2(cheapest),
    yearlyCost: round2(cheapest * 12),
    breakEvenDaysForPermit: round2(dailyRate > 0 ? monthlyPermit / dailyRate : 0),
  };
};

// --- 10. Toll Cost Calculator ----------------------------------------------------------
export const tollCostCalculator: CustomCalculator = (values) => {
  const tollPerTrip = pos(values.tollPerTrip, 6.5);
  const tripsPerMonth = pos(values.tripsPerMonth, 40);
  const transponderDiscountPercent = Math.min(100, pos(values.transponderDiscountPercent, 30));
  const transponderMonthlyFee = pos(values.transponderMonthlyFee, 0);

  const without = tollPerTrip * tripsPerMonth;
  const withT = without * (1 - transponderDiscountPercent / 100) + transponderMonthlyFee;

  return {
    monthlyTollsWithoutTransponder: round2(without),
    monthlyTollsWithTransponder: round2(withT),
    monthlySavings: round2(without - withT),
    yearlyTolls: round2(withT * 12),
    yearlySavings: round2((without - withT) * 12),
  };
};

// --- 11. Car Storage Cost Calculator ---------------------------------------------------
export const carStorageCostCalculator: CustomCalculator = (values) => {
  const monthlyStorageFee = pos(values.monthlyStorageFee, 150);
  const months = pos(values.months, 6);
  const prepCost = pos(values.prepCost, 100);
  const insuranceSavingsMonthly = pos(values.insuranceSavingsMonthly, 60);
  const carValue = pos(values.carValue, 20000);
  const sellRebuyPercent = pos(values.sellRebuyPercent, 8);

  const fees = monthlyStorageFee * months;
  const savings = insuranceSavingsMonthly * months;
  const net = fees + prepCost - savings;

  return {
    storageFees: round2(fees),
    insuranceSavings: round2(savings),
    netStorageCost: round2(net),
    netCostPerMonth: round2(months > 0 ? net / months : 0),
    sellAndBuyBackCost: round2((carValue * sellRebuyPercent) / 100),
  };
};

export const carOwnershipCustomCalculators: Record<string, CustomCalculator> = {
  "car-total-cost-of-ownership-calculator": carTotalCostOfOwnershipCalculator,
  "car-depreciation-calculator": carDepreciationCalculator,
  "motorcycle-total-cost-of-ownership-calculator": motorcycleTotalCostOfOwnershipCalculator,
  "boat-total-cost-of-ownership-calculator": boatTotalCostOfOwnershipCalculator,
  "rv-total-cost-of-ownership-calculator": rvTotalCostOfOwnershipCalculator,
  "atv-total-cost-of-ownership-calculator": atvTotalCostOfOwnershipCalculator,
  "first-car-startup-cost-calculator": firstCarStartupCostCalculator,
  "rural-vs-urban-car-ownership-calculator": ruralVsUrbanCarOwnershipCalculator,
  "monthly-parking-cost-calculator": monthlyParkingCostCalculator,
  "toll-cost-calculator": tollCostCalculator,
  "car-storage-cost-calculator": carStorageCostCalculator,
};
