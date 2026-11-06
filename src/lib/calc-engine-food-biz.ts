/**
 * Batch: "Food & Drink Calculators" → Food Costs, Restaurant Prices & Business Calculators.
 *
 * Data / methods:
 *  - Disney Dining Plan 2026 (per person per night, before tax): Quick-Service $60.47 adult (10+),
 *    $26.16 child (3–9); Disney Dining Plan (table service) $98.59 adult, $31.94 child. Quick-Service =
 *    2 quick-service meals + 1 snack per night; Dining Plan = 1 quick-service + 1 table-service + 1 snack.
 *    Orange County, FL resort sales tax 6.5%. Kids are free on some promotional packages.
 *  - Carnival CHEERS! 2026: $69.95 per person per day pre-sail + 20% service charge = $83.94
 *    ($89.94 onboard); every adult (21+) in the cabin must buy it. Bar drinks carry an 18% gratuity.
 *  - Chick-fil-A One: 10 / 11 / 12 / 13 points per $1 for Member / Silver / Red / Signature; tiers at
 *    1,000 / 4,000 / 10,000 points earned in a calendar year.
 *  - Food emissions (kg CO₂e per kg, Poore & Nemecek 2018 via Our World in Data): beef 99.5, lamb 39.7,
 *    cheese 23.9, prawns 26.9, pork 12.3, farmed fish 13.6, poultry 9.9, eggs 4.7, rice 4.5, milk 3.2,
 *    tofu 3.2, wheat/bread 1.6, vegetables 0.5. Electricity 0.373 kg/kWh (EPA eGRID US average);
 *    natural gas 5.30 kg CO₂ per therm (EPA).
 *  - US federal wine excise ≤16% ABV $1.07/gal less the small-producer credit (up to $1.00/gal on the
 *    first 30,000 gal) → about $0.07/gal; a 750 mL bottle is 0.198 gal. 1 ton of grapes ≈ 720 bottles.
 *  - Brand menu prices are typical 2026 US prices (they vary by location and are editable).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-food-biz-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pick = (v: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(safeNumber(v))));

export const disneyDining: CustomCalculator = (v) => {
  const nights = nonNeg(v.nights, 5);
  const adults = nonNeg(v.adults, 2);
  const kids = nonNeg(v.kids);
  const table = pick(v.plan, 2) === 1;
  const kidsFree = pick(v.kidsFree, 2) === 1;
  const taxRate = nonNeg(v.taxRate, 6.5) / 100;
  const nightly = adults * nonNeg(v.adultPlanPrice, table ? 98.59 : 60.47) + (kidsFree ? 0 : kids * nonNeg(v.childPlanPrice, table ? 31.94 : 26.16));
  const planCost = nightly * nights * (1 + taxRate);
  const use = nonNeg(v.usagePercent, 100) / 100;
  const perAdult = table ? nonNeg(v.adultQsMeal) + nonNeg(v.adultTsMeal) + nonNeg(v.snack) : 2 * nonNeg(v.adultQsMeal) + nonNeg(v.snack);
  const perKid = table ? nonNeg(v.kidQsMeal) + nonNeg(v.kidTsMeal) + nonNeg(v.snack) : 2 * nonNeg(v.kidQsMeal) + nonNeg(v.snack);
  const value = (adults * perAdult + kids * perKid) * nights * use * (1 + taxRate);
  return { planCost: round2(planCost), outOfPocketValue: round2(value), savings: round2(value - planCost), planCostPerPersonPerDay: round2(adults + kids > 0 && nights > 0 ? planCost / (adults + kids) / nights : 0), breakEvenUsePercent: round2(value > 0 ? (planCost / (value / use)) * 100 : 0), creditsTotal: Math.round((adults + kids) * nights * 3) };
};

export const carnivalCheers: CustomCalculator = (v) => {
  const days = nonNeg(v.days, 7);
  const adults = nonNeg(v.adults, 2);
  const daily = nonNeg(v.packagePrice, 69.95) * (1 + nonNeg(v.serviceCharge, 20) / 100);
  const pkg = daily * days * adults;
  const g = 1 + nonNeg(v.drinkGratuity, 18) / 100;
  const perDayAlacarte = (nonNeg(v.cocktails) * nonNeg(v.cocktailPrice) + nonNeg(v.beers) * nonNeg(v.beerPrice) + nonNeg(v.wines) * nonNeg(v.winePrice) + nonNeg(v.sodas) * nonNeg(v.sodaPrice) + nonNeg(v.coffees) * nonNeg(v.coffeePrice)) * g;
  const alacarte = perDayAlacarte * days * adults;
  const avgDrink = nonNeg(v.cocktailPrice) * g;
  return { packageCost: round2(pkg), payAsYouGoCost: round2(alacarte), savings: round2(alacarte - pkg), packagePerPersonPerDay: round2(daily), breakEvenCocktailsPerDay: round2(avgDrink > 0 ? daily / avgDrink : 0), payAsYouGoPerPersonPerDay: round2(perDayAlacarte) };
};

export const cateringPricing: CustomCalculator = (v) => {
  const guests = nonNeg(v.guests, 100);
  const food = guests * nonNeg(v.foodCostPerGuest);
  const labor = nonNeg(v.staffHours) * nonNeg(v.hourlyRate);
  const direct = food + labor + nonNeg(v.rentals) + nonNeg(v.otherCosts);
  const overhead = direct * (nonNeg(v.overheadPercent, 15) / 100);
  const cost = direct + overhead;
  const margin = Math.min(0.95, nonNeg(v.profitMargin, 20) / 100);
  const price = cost / (1 - margin);
  const service = price * (nonNeg(v.serviceCharge) / 100);
  const tax = (price + service) * (nonNeg(v.taxRate) / 100);
  return { pricePerGuest: round2(guests > 0 ? price / guests : 0), quoteBeforeTax: round2(price + service), totalWithTax: round2(price + service + tax), totalCost: round2(cost), profit: round2(price - cost), foodCostPercent: round2(price > 0 ? (food / price) * 100 : 0), laborCost: round2(labor) };
};

export const wineBusiness: CustomCalculator = (v) => {
  const bottles = nonNeg(v.tons) * nonNeg(v.bottlesPerTon, 720);
  const grapes = nonNeg(v.tons) * nonNeg(v.pricePerTon);
  const variable = bottles * (nonNeg(v.packagingPerBottle) + nonNeg(v.productionPerBottle) + 0.198 * nonNeg(v.excisePerGallon, 0.07));
  const cost = grapes + variable + nonNeg(v.fixedCosts);
  const dtc = nonNeg(v.dtcShare, 40) / 100;
  const revenue = bottles * (dtc * nonNeg(v.dtcPrice) * (1 - nonNeg(v.dtcCostPercent, 15) / 100) + (1 - dtc) * nonNeg(v.wholesalePrice));
  return { costPerBottle: round2(bottles > 0 ? cost / bottles : 0), bottles: Math.round(bottles), cases: round2(bottles / 12), totalCost: round2(cost), revenue: round2(revenue), profit: round2(revenue - cost), profitMargin: round2(revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0), breakEvenPricePerBottle: round2(bottles > 0 ? cost / bottles : 0) };
};

function order(v: Record<string, number>, n: number) {
  let sub = 0;
  for (let i = 1; i <= n; i++) sub += nonNeg(v[`qty${i}`]) * nonNeg(v[`price${i}`]);
  const tax = sub * (nonNeg(v.taxRate, 7) / 100);
  const appMarkup = sub * (nonNeg(v.appMarkup) / 100);
  const fees = nonNeg(v.deliveryFee) + (sub + appMarkup) * (nonNeg(v.serviceFeePercent) / 100);
  const tip = (sub + appMarkup) * (nonNeg(v.tipPercent) / 100);
  const total = sub + appMarkup + tax + fees + tip;
  const people = Math.max(1, nonNeg(v.people, 1));
  return { orderTotal: round2(total), subtotal: round2(sub), tax: round2(tax), deliveryExtras: round2(appMarkup + fees + tip), perPerson: round2(total / people), items: Math.round([...Array(n)].reduce((s, _, i) => s + nonNeg(v[`qty${i + 1}`]), 0)) };
}
export const MENUS: Record<string, [string, number][]> = {
  mcdonalds: [["Big Mac", 5.99], ["Quarter Pounder with Cheese", 6.49], ["10-piece Chicken McNuggets", 5.99], ["McChicken", 3.29], ["Egg McMuffin", 4.79], ["Medium fries", 3.89], ["Medium soft drink", 1.99], ["McFlurry (regular)", 4.59]],
  chipotle: [["Chicken burrito or bowl", 10.7], ["Steak burrito or bowl", 12.4], ["Barbacoa or carnitas bowl", 11.95], ["Veggie / sofritas bowl", 10.7], ["Chips & guacamole", 5.95], ["Extra guacamole", 2.95], ["Kid's meal", 6.25], ["Fountain drink", 3.25]],
  innout: [["Double-Double", 5.65], ["Cheeseburger", 3.95], ["Hamburger", 3.45], ["French fries", 2.45], ["Double-Double combo", 9.85], ["Shake", 3.25], ["Medium soft drink", 2.35], ["Animal-style upgrade", 0.75]],
  starbucks: [["Grande caffè latte", 5.75], ["Grande brewed coffee", 3.45], ["Grande Frappuccino", 6.15], ["Grande cold brew", 5.25], ["Grande Refresher", 5.45], ["Breakfast sandwich", 5.45], ["Croissant / pastry", 3.95], ["Extra shot or syrup", 1.0]],
  fastfood: [["Combo meal", 10.99], ["Burger or sandwich", 6.49], ["Chicken nuggets / tenders", 6.99], ["Fries or side", 3.49], ["Kids meal", 5.49], ["Drink", 2.29]],
};
export const mcdonaldsPrice: CustomCalculator = (v) => order(v, 8);
export const chipotlePrice: CustomCalculator = (v) => order(v, 8);
export const innoutPrice: CustomCalculator = (v) => order(v, 8);
export const starbucksPrice: CustomCalculator = (v) => order(v, 8);
export const fastFoodPrice: CustomCalculator = (v) => order(v, 6);

export const EMISSIONS: [string, string, number][] = [["beefKg", "Beef", 99.5], ["lambKg", "Lamb", 39.7], ["cheeseKg", "Cheese", 23.9], ["prawnsKg", "Shrimp / prawns", 26.9], ["porkKg", "Pork", 12.3], ["fishKg", "Farmed fish", 13.6], ["poultryKg", "Poultry", 9.9], ["eggsKg", "Eggs", 4.7], ["dairyKg", "Milk & cream (kg ≈ L)", 3.2], ["riceKg", "Rice", 4.5], ["grainsKg", "Bread, pasta & grains", 1.6], ["produceKg", "Vegetables & fruit", 0.5]];
export const restaurantCarbon: CustomCalculator = (v) => {
  const foodWeekly = EMISSIONS.reduce((s, [k, , f]) => s + nonNeg(v[k]) * f, 0);
  const foodYear = foodWeekly * 52;
  const energyYear = (nonNeg(v.kwhPerMonth) * nonNeg(v.gridFactor, 0.373) + nonNeg(v.thermsPerMonth) * 5.3) * 12;
  const total = foodYear + energyYear;
  const covers = nonNeg(v.coversPerWeek) * 52;
  const beef = nonNeg(v.beefKg) * 99.5 * 52;
  return { annualTonnesCo2e: round2(total / 1000), foodTonnes: round2(foodYear / 1000), energyTonnes: round2(energyYear / 1000), kgPerCover: round2(covers > 0 ? total / covers : 0), beefSharePercent: round2(total > 0 ? (beef / total) * 100 : 0), carsEquivalent: round2(total / 4600) };
};

export const meatPricing: CustomCalculator = (v) => {
  const lb = pick(v.weightUnit, 2) === 1 ? nonNeg(v.weight) / 0.45359237 : nonNeg(v.weight);
  const cost = lb * nonNeg(v.costPerLb) + nonNeg(v.processingCost) + nonNeg(v.otherCosts);
  const sellable = lb * (nonNeg(v.yieldPercent, 65) / 100);
  const costPerLb = sellable > 0 ? cost / sellable : 0;
  const margin = Math.min(0.95, nonNeg(v.targetMargin, 30) / 100);
  const price = costPerLb / (1 - margin);
  return { pricePerLb: round2(price), costPerSellableLb: round2(costPerLb), sellableLb: round2(sellable), totalCost: round2(cost), revenue: round2(price * sellable), profit: round2(price * sellable - cost), markupPercent: round2(costPerLb > 0 ? (price / costPerLb - 1) * 100 : 0) };
};

export const CFA_TIERS: [string, number][] = [["Member", 10], ["Silver", 11], ["Red", 12], ["Signature", 13]];
export const chickFilAPoints: CustomCalculator = (v) => {
  const rate = CFA_TIERS[pick(v.tier, CFA_TIERS.length)][1];
  const monthly = nonNeg(v.monthlySpend) * rate;
  const cost = nonNeg(v.rewardPoints, 1000);
  const months = monthly > 0 ? (cost - nonNeg(v.currentPoints)) / monthly : 0;
  const yearly = monthly * 12;
  const nextTier = yearly >= 10000 ? 3 : yearly >= 4000 ? 2 : yearly >= 1000 ? 1 : 0;
  const valuePerPoint = cost > 0 ? nonNeg(v.rewardValue) / cost : 0;
  return { pointsPerMonth: Math.round(monthly), monthsToReward: round2(Math.max(0, months)), pointsPerYear: Math.round(yearly), tierYouWouldEarn: nextTier, centsPerPoint: round2(valuePerPoint * 100), effectiveCashbackPercent: round2(valuePerPoint * rate * 100), rewardsPerYear: round2(cost > 0 ? yearly / cost : 0) };
};

export const foodBizCustomCalculators: Record<string, CustomCalculator> = {
  "disney-dining-plan-calculator": disneyDining,
  "carnival-drink-package-calculator": carnivalCheers,
  "catering-pricing-calculator": cateringPricing,
  "wine-business-calculator": wineBusiness,
  "mcdonalds-price-calculator": mcdonaldsPrice,
  "chipotle-price-calculator": chipotlePrice,
  "in-n-out-price-calculator": innoutPrice,
  "starbucks-price-calculator": starbucksPrice,
  "restaurants-carbon-calculator": restaurantCarbon,
  "meat-pricing-calculator": meatPricing,
  "chick-fil-a-points-calculator": chickFilAPoints,
  "fast-food-price-calculator": fastFoodPrice,
};
