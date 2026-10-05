/**
 * Batch: "Budget Calculators" (5 Oct 2026), sub-batch 8 of 12 — Travel
 * (8 tools), filed under Budget Calculators > Life Events & Travel Budget
 * Calculators. See calc-engine-budget-methods.ts for the full batch context.
 * Distinct from the existing travel-savings / vacation-savings tools (which
 * plan saving toward a trip): these build the trip budget itself.
 *
 *  - studyAbroadBudget: program, housing, flights, visa/insurance, daily
 *    living, less aid.
 *  - sabbaticalSavingsBudget (incl. gap year): months without pay x
 *    living costs + travel + insurance; monthly saving needed.
 *  - digitalNomadBudget: income after tax vs nomad living costs.
 *  - perDiemTravelBudget: lodging per night + meals & incidentals per day
 *    (75% on travel days, as the federal rules do).
 *  - familyVacationBudget: per-person flights, food, activities + lodging
 *    and car.
 *  - roadTripBudget: fuel from miles/mpg/price, wear per mile, lodging,
 *    food.
 *  - internationalTravelBudget: costs plus foreign transaction fees.
 *  - groupTripExpenseSplit: who paid what vs the fair share; balances.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-budget-travel-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// --- 1. Study Abroad Budget Calculator -------------------------------------------------
export const studyAbroadBudgetCalculator: CustomCalculator = (values) => {
  const programFee = pos(values.programFee, 12000);
  const housing = pos(values.housing, 4000);
  const flights = pos(values.flights, 1500);
  const visaInsurance = pos(values.visaInsurance, 600);
  const dailyLiving = pos(values.dailyLiving, 30);
  const days = pos(values.days, 120);
  const aid = pos(values.aid, 3000);

  const total = programFee + housing + flights + visaInsurance + dailyLiving * days;
  const net = Math.max(0, total - aid);

  return {
    totalCost: round2(total),
    netCostAfterAid: round2(net),
    costPerMonth: round2(days > 0 ? net / (days / 30.4) : 0),
    livingCostTotal: round2(dailyLiving * days),
  };
};

// --- 2. Sabbatical Savings Budget Calculator -------------------------------------------
export const sabbaticalSavingsBudgetCalculator: CustomCalculator = (values) => {
  const months = pos(values.months, 6);
  const monthlyLiving = pos(values.monthlyLiving, 3500);
  const travel = pos(values.travel, 5000);
  const healthInsurance = pos(values.healthInsurance, 600);
  const incomeDuring = pos(values.incomeDuring, 0);
  const cushionPercent = pos(values.cushionPercent, 10);
  const prepMonths = Math.max(1, pos(values.prepMonths, 18));

  const base = months * (monthlyLiving + healthInsurance - incomeDuring) + travel;
  const total = base * (1 + cushionPercent / 100);

  return {
    sabbaticalCost: round2(base),
    totalWithCushion: round2(total),
    monthlySavingsNeeded: round2(total / prepMonths),
  };
};

// --- 3. Digital Nomad Budget Calculator ------------------------------------------------
export const digitalNomadBudgetCalculator: CustomCalculator = (values) => {
  const income = pos(values.income, 5000);
  const taxPercent = Math.min(100, pos(values.taxPercent, 25));
  const accommodation = pos(values.accommodation, 1200);
  const coworking = pos(values.coworking, 200);
  const food = pos(values.food, 600);
  const transport = pos(values.transport, 300);
  const insurance = pos(values.insurance, 150);
  const other = pos(values.other, 300);

  const net = income * (1 - taxPercent / 100);
  const costs = accommodation + coworking + food + transport + insurance + other;
  const left = net - costs;

  return {
    afterTaxIncome: round2(net),
    monthlyLivingCost: round2(costs),
    monthlySavings: round2(left),
    savingsRate: round2(net > 0 ? (left / net) * 100 : 0),
    yearlySavings: round2(left * 12),
  };
};

// --- 4. Per-Diem Travel Budget Calculator ----------------------------------------------
export const perDiemTravelBudgetCalculator: CustomCalculator = (values) => {
  const days = Math.max(1, Math.round(pos(values.days, 4)));
  const lodgingPerNight = pos(values.lodgingPerNight, 110);
  const mealsPerDay = pos(values.mealsPerDay, 68);
  const transportation = pos(values.transportation, 400);
  const travelers = Math.max(1, Math.round(pos(values.travelers, 1)));

  const nights = days - 1;
  // first and last travel days get 75% of the meals & incidentals rate
  const meals = days === 1 ? mealsPerDay * 0.75 : mealsPerDay * (days - 2) + mealsPerDay * 0.75 * 2;
  const perPerson = lodgingPerNight * nights + meals + transportation;

  return {
    lodgingTotal: round2(lodgingPerNight * nights),
    mealsAndIncidentals: round2(meals),
    totalPerTraveler: round2(perPerson),
    totalForAll: round2(perPerson * travelers),
    averagePerDay: round2(perPerson / days),
  };
};

// --- 5. Family Vacation Budget Calculator ----------------------------------------------
export const familyVacationBudgetCalculator: CustomCalculator = (values) => {
  const travelers = Math.max(1, Math.round(pos(values.travelers, 4)));
  const flightPerPerson = pos(values.flightPerPerson, 350);
  const nights = pos(values.nights, 6);
  const lodgingPerNight = pos(values.lodgingPerNight, 220);
  const foodPerPersonPerDay = pos(values.foodPerPersonPerDay, 45);
  const activitiesPerPersonPerDay = pos(values.activitiesPerPersonPerDay, 40);
  const carPerDay = pos(values.carPerDay, 60);
  const extras = pos(values.extras, 200);
  const monthsToSave = Math.max(1, pos(values.monthsToSave, 6));

  const days = nights + 1;
  const total =
    travelers * flightPerPerson +
    nights * lodgingPerNight +
    travelers * days * (foodPerPersonPerDay + activitiesPerPersonPerDay) +
    carPerDay * days +
    extras;

  return {
    totalCost: round2(total),
    costPerPerson: round2(total / travelers),
    costPerDay: round2(total / days),
    monthlySavingsNeeded: round2(total / monthsToSave),
  };
};

// --- 6. Road Trip Budget Calculator ----------------------------------------------------
export const roadTripBudgetCalculator: CustomCalculator = (values) => {
  const miles = pos(values.miles, 1200);
  const mpg = Math.max(1, pos(values.mpg, 28));
  const gasPrice = pos(values.gasPrice, 3.4);
  const wearPerMile = pos(values.wearPerMile, 0.1);
  const nights = pos(values.nights, 4);
  const lodgingPerNight = pos(values.lodgingPerNight, 130);
  const foodPerDay = pos(values.foodPerDay, 120);
  const activities = pos(values.activities, 300);
  const travelers = Math.max(1, Math.round(pos(values.travelers, 2)));

  const fuel = (miles / mpg) * gasPrice;
  const wear = miles * wearPerMile;
  const total = fuel + wear + nights * lodgingPerNight + (nights + 1) * foodPerDay + activities;

  return {
    fuelCost: round2(fuel),
    wearAndTear: round2(wear),
    totalCost: round2(total),
    costPerPerson: round2(total / travelers),
    costPerMile: round2(miles > 0 ? total / miles : 0),
  };
};

// --- 7. International Travel Budget Calculator -----------------------------------------
export const internationalTravelBudgetCalculator: CustomCalculator = (values) => {
  const travelers = Math.max(1, Math.round(pos(values.travelers, 2)));
  const flightsTotal = pos(values.flightsTotal, 2400);
  const nights = pos(values.nights, 7);
  const lodgingPerNight = pos(values.lodgingPerNight, 200);
  const dailyPerPerson = pos(values.dailyPerPerson, 80);
  const insuranceVisa = pos(values.insuranceVisa, 200);
  const foreignFeePercent = pos(values.foreignFeePercent, 3);

  const local = nights * lodgingPerNight + travelers * (nights + 1) * dailyPerPerson;
  const fees = (local * foreignFeePercent) / 100;
  const total = flightsTotal + local + fees + insuranceVisa;

  return {
    spendingAbroad: round2(local),
    foreignTransactionFees: round2(fees),
    totalCost: round2(total),
    costPerPerson: round2(total / travelers),
    costPerDay: round2(total / (nights + 1)),
  };
};

// --- 8. Group Trip Expense Split Calculator --------------------------------------------
export const groupTripExpenseSplitCalculator: CustomCalculator = (values) => {
  const paid = [pos(values.paidA, 800), pos(values.paidB, 300), pos(values.paidC, 150), pos(values.paidD, 0)];
  const people = Math.min(4, Math.max(2, Math.round(pos(values.people, 4))));

  const used = paid.slice(0, people);
  const total = used.reduce((s, v) => s + v, 0);
  const share = total / people;
  const bal = (k: number) => (k < people ? used[k] - share : 0);

  return {
    totalSpent: round2(total),
    fairShare: round2(share),
    personABalance: round2(bal(0)),
    personBBalance: round2(bal(1)),
    personCBalance: round2(bal(2)),
    personDBalance: round2(bal(3)),
  };
};

export const budgetTravelCustomCalculators: Record<string, CustomCalculator> = {
  "study-abroad-budget-calculator": studyAbroadBudgetCalculator,
  "sabbatical-savings-budget-calculator": sabbaticalSavingsBudgetCalculator,
  "digital-nomad-budget-calculator": digitalNomadBudgetCalculator,
  "per-diem-travel-budget-calculator": perDiemTravelBudgetCalculator,
  "family-vacation-budget-calculator": familyVacationBudgetCalculator,
  "road-trip-budget-calculator": roadTripBudgetCalculator,
  "international-travel-budget-calculator": internationalTravelBudgetCalculator,
  "group-trip-expense-split-calculator": groupTripExpenseSplitCalculator,
};
