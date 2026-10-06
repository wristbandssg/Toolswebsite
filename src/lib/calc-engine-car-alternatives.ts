/**
 * Batch: "Car & Vehicle Cost Calculators" (5 Oct 2026), sub-batch 4 of 9 —
 * Rental & Transport Alternatives (6 tools), filed under Car & Vehicle Cost
 * Calculators > Car Lease, Rental & Transport Calculators. See
 * calc-engine-car-buying.ts for the full batch context.
 *
 *  - carRentalCost (incl. rental car insurance waiver): base rate + taxes and
 *    airport fees + damage/liability waivers and extras per day.
 *  - carRentalVsOwning: renting for trips + rideshare for daily needs vs the
 *    yearly cost of owning; break-even rental days.
 *  - publicTransitVsCar (incl. car-free household savings): commute by car
 *    (per-mile + parking) vs a transit pass; extra savings if you sell the car.
 *  - ebikeVsCarCommute: e-bike cost spread over its life + upkeep +
 *    electricity vs car per-mile cost + parking; payback months.
 *  - carpoolSavings: solo commute cost vs your share when rotating drivers;
 *    CO2 saved (19.6 lb per gallon of gasoline).
 *  - airportParkingVsRideshare: on-airport vs off-site parking vs a rideshare
 *    round trip with tip; break-even trip length.
 *  - secondCarCost: first-year cost of a second household car (depreciation,
 *    insurance, registration, upkeep, fuel, loan interest) vs the rideshare or
 *    rental it replaces.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-car-alternatives-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

function payment(principal: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
}

// --- 1. Car Rental Cost Calculator -----------------------------------------------------
export const carRentalCostCalculator: CustomCalculator = (values) => {
  const dailyRate = pos(values.dailyRate, 55);
  const days = Math.max(1, pos(values.days, 5));
  const taxesFeesPercent = pos(values.taxesFeesPercent, 20);
  const damageWaiverPerDay = pos(values.damageWaiverPerDay, 25);
  const liabilityPerDay = pos(values.liabilityPerDay, 15);
  const buyWaivers = Math.round(safeNumber(values.buyWaivers, 1)) === 1;
  const extrasPerDay = pos(values.extrasPerDay, 0);

  const base = dailyRate * days;
  const taxes = (base * taxesFeesPercent) / 100;
  const waivers = (damageWaiverPerDay + liabilityPerDay) * days;
  const total = base + taxes + extrasPerDay * days + (buyWaivers ? waivers : 0);

  return {
    baseRental: round2(base),
    taxesAndFees: round2(taxes),
    waiverCost: round2(buyWaivers ? waivers : 0),
    totalCost: round2(total),
    costPerDay: round2(total / days),
    savingsByDecliningWaivers: round2(waivers),
  };
};

// --- 2. Car Rental vs Owning Calculator ------------------------------------------------
export const carRentalVsOwningCalculator: CustomCalculator = (values) => {
  const rentalDaysPerYear = pos(values.rentalDaysPerYear, 40);
  const rentalPerDay = pos(values.rentalPerDay, 70);
  const rideshareTripsPerMonth = pos(values.rideshareTripsPerMonth, 10);
  const rideshareFare = pos(values.rideshareFare, 18);
  const ownershipCostYearly = pos(values.ownershipCostYearly, 9500);

  const rental = rentalDaysPerYear * rentalPerDay;
  const rideshare = rideshareTripsPerMonth * 12 * rideshareFare;
  const noCar = rental + rideshare;

  return {
    rentalYearly: round2(rental),
    rideshareYearly: round2(rideshare),
    noCarYearlyCost: round2(noCar),
    owningYearlyCost: round2(ownershipCostYearly),
    savingsWithoutCar: round2(ownershipCostYearly - noCar),
    breakEvenRentalDays: round2(rentalPerDay > 0 ? Math.max(0, ownershipCostYearly - rideshare) / rentalPerDay : 0),
  };
};

// --- 3. Public Transit vs Car Calculator -----------------------------------------------
export const publicTransitVsCarCalculator: CustomCalculator = (values) => {
  const commuteDaysPerMonth = pos(values.commuteDaysPerMonth, 21);
  const roundTripMiles = pos(values.roundTripMiles, 30);
  const carCostPerMile = pos(values.carCostPerMile, 0.3);
  const parkingPerMonth = pos(values.parkingPerMonth, 150);
  const transitPassMonthly = pos(values.transitPassMonthly, 100);
  const carFixedCostsYearly = pos(values.carFixedCostsYearly, 6000);
  const rideshareMonthlyIfCarFree = pos(values.rideshareMonthlyIfCarFree, 80);

  const carMonthly = commuteDaysPerMonth * roundTripMiles * carCostPerMile + parkingPerMonth;
  const monthlySavings = carMonthly - transitPassMonthly;

  return {
    carCommuteMonthly: round2(carMonthly),
    transitMonthly: round2(transitPassMonthly),
    monthlySavings: round2(monthlySavings),
    yearlySavingsKeepingCar: round2(monthlySavings * 12),
    yearlySavingsCarFree: round2(monthlySavings * 12 + carFixedCostsYearly - rideshareMonthlyIfCarFree * 12),
  };
};

// --- 4. E-Bike vs Car Commute Calculator -----------------------------------------------
export const ebikeVsCarCommuteCalculator: CustomCalculator = (values) => {
  const ebikePrice = pos(values.ebikePrice, 1800);
  const ebikeLifeYears = Math.max(1, pos(values.ebikeLifeYears, 5));
  const ebikeUpkeep = pos(values.ebikeUpkeep, 150);
  const roundTripMiles = pos(values.roundTripMiles, 12);
  const commuteDaysPerYear = pos(values.commuteDaysPerYear, 200);
  const carCostPerMile = pos(values.carCostPerMile, 0.35);
  const parkingPerDay = pos(values.parkingPerDay, 5);
  const electricityRate = pos(values.electricityRate, 0.17);

  const miles = roundTripMiles * commuteDaysPerYear;
  const car = miles * carCostPerMile + parkingPerDay * commuteDaysPerYear;
  const electricity = miles * 0.02 * electricityRate;
  const ebike = ebikePrice / ebikeLifeYears + ebikeUpkeep + electricity;
  const monthlyCashSavings = (car - ebikeUpkeep - electricity) / 12;

  return {
    carCommuteYearly: round2(car),
    ebikeYearly: round2(ebike),
    yearlySavings: round2(car - ebike),
    paybackMonths: round2(monthlyCashSavings > 0 ? ebikePrice / monthlyCashSavings : 0),
    milesPerYear: round2(miles),
  };
};

// --- 5. Carpool Savings Calculator -----------------------------------------------------
export const carpoolSavingsCalculator: CustomCalculator = (values) => {
  const roundTripMiles = pos(values.roundTripMiles, 40);
  const daysPerMonth = pos(values.daysPerMonth, 20);
  const mpg = Math.max(1, pos(values.mpg, 28));
  const gasPrice = pos(values.gasPrice, 3.4);
  const maintenancePerMile = pos(values.maintenancePerMile, 0.1);
  const parkingPerMonth = pos(values.parkingPerMonth, 120);
  const tollsPerDay = pos(values.tollsPerDay, 0);
  const people = Math.max(1, Math.round(pos(values.people, 3)));

  const miles = roundTripMiles * daysPerMonth;
  const solo = miles * (gasPrice / mpg + maintenancePerMile) + parkingPerMonth + tollsPerDay * daysPerMonth;
  const share = solo / people;
  const gallonsSavedYearly = ((miles * 12) / mpg) * (1 - 1 / people);

  return {
    soloMonthlyCost: round2(solo),
    carpoolMonthlyCost: round2(share),
    monthlySavings: round2(solo - share),
    yearlySavings: round2((solo - share) * 12),
    co2SavedLbsPerYear: round2(gallonsSavedYearly * 19.6),
  };
};

// --- 6. Airport Parking vs Rideshare Calculator ----------------------------------------
export const airportParkingVsRideshareCalculator: CustomCalculator = (values) => {
  const tripDays = Math.max(1, pos(values.tripDays, 5));
  const airportParkingPerDay = pos(values.airportParkingPerDay, 20);
  const offsiteParkingPerDay = pos(values.offsiteParkingPerDay, 10);
  const milesToAirport = pos(values.milesToAirport, 20);
  const carCostPerMile = pos(values.carCostPerMile, 0.3);
  const rideshareOneWay = pos(values.rideshareOneWay, 45);
  const tipPercent = pos(values.tipPercent, 15);

  const driving = 2 * milesToAirport * carCostPerMile;
  const onAirport = airportParkingPerDay * tripDays + driving;
  const offsite = offsiteParkingPerDay * tripDays + driving;
  const rideshare = 2 * rideshareOneWay * (1 + tipPercent / 100);

  return {
    onAirportParkingCost: round2(onAirport),
    offsiteParkingCost: round2(offsite),
    rideshareCost: round2(rideshare),
    cheapestCost: round2(Math.min(onAirport, offsite, rideshare)),
    breakEvenDaysOnAirport: round2(airportParkingPerDay > 0 ? Math.max(0, rideshare - driving) / airportParkingPerDay : 0),
  };
};

// --- 7. Second Car Cost Calculator -----------------------------------------------------
export const secondCarCostCalculator: CustomCalculator = (values) => {
  const carPrice = pos(values.carPrice, 15000);
  const downPayment = pos(values.downPayment, 3000);
  const loanRatePercent = pos(values.loanRatePercent, 8);
  const loanTermMonths = Math.max(1, Math.round(pos(values.loanTermMonths, 48)));
  const depreciationPercent = Math.min(100, pos(values.depreciationPercent, 12));
  const insurance = pos(values.insurance, 1200);
  const registration = pos(values.registration, 150);
  const maintenance = pos(values.maintenance, 800);
  const milesPerYear = pos(values.milesPerYear, 6000);
  const fuelPerMile = pos(values.fuelPerMile, 0.14);
  const alternativeYearly = pos(values.alternativeYearly, 2500);

  const loan = Math.max(0, carPrice - downPayment);
  const i = loanRatePercent / 100 / 12;
  const pmt = payment(loan, i, loanTermMonths);
  let bal = loan;
  let interest = 0;
  for (let m = 0; m < Math.min(12, loanTermMonths); m++) {
    const int = bal * i;
    interest += int;
    bal = Math.max(0, bal + int - pmt);
  }
  const depreciation = (carPrice * depreciationPercent) / 100;
  const fuel = milesPerYear * fuelPerMile;
  const yearly = depreciation + insurance + registration + maintenance + fuel + interest;

  return {
    depreciation: round2(depreciation),
    loanInterestFirstYear: round2(interest),
    fuelCost: round2(fuel),
    yearlyCost: round2(yearly),
    monthlyCost: round2(yearly / 12),
    extraCostVsAlternative: round2(yearly - alternativeYearly),
  };
};

export const carAlternativesCustomCalculators: Record<string, CustomCalculator> = {
  "car-rental-cost-calculator": carRentalCostCalculator,
  "car-rental-vs-owning-calculator": carRentalVsOwningCalculator,
  "public-transit-vs-car-calculator": publicTransitVsCarCalculator,
  "ebike-vs-car-commute-calculator": ebikeVsCarCommuteCalculator,
  "carpool-savings-calculator": carpoolSavingsCalculator,
  "airport-parking-vs-rideshare-calculator": airportParkingVsRideshareCalculator,
  "second-car-cost-calculator": secondCarCostCalculator,
};
