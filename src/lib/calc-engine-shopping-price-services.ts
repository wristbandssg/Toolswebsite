/**
 * Batch: "Shopping Calculators" → Pricing, Markup & Seller Fee — service
 * pricing (6 tools). Each prices a service the way that trade quotes it:
 *
 *  - photographyPricing: cost of doing business — yearly expenses + salary
 *    + tax spread over sessions — plus per-session costs.
 *  - babysittingRate: a base hourly rate adjusted for extra children,
 *    certifications, extra duties and late-night hours.
 *  - janitorialBid: square feet ÷ production rate = hours per visit, at a
 *    burdened wage with supplies, overhead and profit → monthly bid.
 *  - lawnCarePricing: time per visit from lawn size and mowing rate, plus
 *    travel, equipment and profit → price per mow, per month and season.
 *  - handymanPricing: hours with a minimum charge, marked-up materials and
 *    a trip fee.
 *  - nailPricing: a nail tech's service price from product cost, time,
 *    target hourly earnings and booth rent per client.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-price-services-calculators.ts for the copy.
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

export const photographyPricing: CustomCalculator = (v) => {
  const sessions = Math.max(1, nonNeg(v.sessionsPerYear) || 1);
  const needed = (nonNeg(v.yearlyExpenses) + nonNeg(v.desiredSalary)) / (1 - Math.min(0.9, pct(v.taxRate)));
  const perSession = needed / sessions + nonNeg(v.perSessionCosts);
  const hours = nonNeg(v.shootHours) + nonNeg(v.editingHours) + nonNeg(v.adminHours);
  return {
    sessionPrice: round2(perSession),
    costOfBusinessPerSession: round2(nonNeg(v.yearlyExpenses) / sessions),
    revenueNeededPerYear: round2(needed + nonNeg(v.perSessionCosts) * sessions),
    totalHoursPerSession: round2(hours),
    effectiveHourly: hours > 0 ? round2((perSession - nonNeg(v.perSessionCosts)) / hours) : 0,
  };
};

export const babysittingRate: CustomCalculator = (v) => {
  const kids = Math.max(1, Math.round(nonNeg(v.children) || 1));
  const rate =
    nonNeg(v.baseRate) +
    (kids - 1) * nonNeg(v.perExtraChild) +
    nonNeg(v.certificationBonus) +
    nonNeg(v.extraDuties);
  const hours = nonNeg(v.hours);
  const late = Math.min(hours, nonNeg(v.lateHours));
  const total = rate * hours + late * rate * pct(v.latePremium) + nonNeg(v.travelFee);
  return {
    hourlyRate: round2(rate),
    totalPay: round2(total),
    lateNightExtra: round2(late * rate * pct(v.latePremium)),
    perChildPerHour: round2(rate / kids),
    tipAt15Percent: round2(total * 0.15),
  };
};

export const janitorialBid: CustomCalculator = (v) => {
  const sqft = nonNeg(v.squareFeet);
  const prod = Math.max(100, nonNeg(v.productionRate) || 2500);
  const hoursPerVisit = sqft / prod;
  const visits = nonNeg(v.visitsPerMonth);
  const labor = hoursPerVisit * visits * nonNeg(v.wage) * (1 + pct(v.burdenPercent));
  const supplies = labor * pct(v.suppliesPercent);
  const overhead = (labor + supplies) * pct(v.overheadPercent);
  const cost = labor + supplies + overhead;
  const bid = cost / (1 - Math.min(0.9, pct(v.profitMargin)));
  return {
    monthlyBid: round2(bid),
    pricePerVisit: visits > 0 ? round2(bid / visits) : 0,
    pricePerSqFtMonthly: sqft > 0 ? round2((bid / sqft) * 1000) / 1000 : 0,
    hoursPerVisit: round2(hoursPerVisit),
    monthlyLaborCost: round2(labor),
    monthlyProfit: round2(bid - cost),
  };
};

export const lawnCarePricing: CustomCalculator = (v) => {
  const sqft = nonNeg(v.lawnSqFt);
  const minutes = (sqft / 1000) * nonNeg(v.minutesPer1000) + nonNeg(v.trimMinutes) + nonNeg(v.travelMinutes);
  const labor = (minutes / 60) * nonNeg(v.hourlyRate);
  const cost = labor + nonNeg(v.equipmentPerVisit);
  const price = Math.max(nonNeg(v.minimumCharge), cost * (1 + pct(v.profitPercent)));
  const visits = nonNeg(v.visitsPerMonth);
  return {
    pricePerVisit: round2(price),
    monthlyPrice: round2(price * visits),
    seasonPrice: round2(price * visits * nonNeg(v.seasonMonths)),
    minutesPerVisit: round2(minutes),
    pricePer1000SqFt: sqft > 0 ? round2(price / (sqft / 1000)) : 0,
  };
};

export const handymanPricing: CustomCalculator = (v) => {
  const hours = Math.max(nonNeg(v.hours), nonNeg(v.minimumHours));
  const labor = hours * nonNeg(v.hourlyRate);
  const materials = nonNeg(v.materials) * (1 + pct(v.materialMarkup));
  const total = labor + materials + nonNeg(v.tripFee);
  return {
    jobPrice: round2(total),
    laborCharge: round2(labor),
    materialsCharge: round2(materials),
    hoursBilled: round2(hours),
    materialsProfit: round2(materials - nonNeg(v.materials)),
  };
};

export const nailPricing: CustomCalculator = (v) => {
  const product = nonNeg(v.productCost);
  const time = nonNeg(v.minutes) / 60;
  const labor = time * nonNeg(v.targetHourly);
  const clients = Math.max(1, nonNeg(v.clientsPerMonth) || 1);
  const rent = nonNeg(v.boothRent) / clients;
  const cost = product + labor + rent;
  const price = cost * (1 + pct(v.profitPercent));
  return {
    servicePrice: round2(price),
    roundedPrice: price > 0 ? Math.ceil(price / 5) * 5 : 0,
    productCost: round2(product),
    rentPerClient: round2(rent),
    earningsPerHour: time > 0 ? round2((price - product - rent) / time) : 0,
  };
};

export const shoppingPriceServicesCustomCalculators: Record<string, CustomCalculator> = {
  "photography-pricing-calculator": photographyPricing,
  "babysitting-rate-calculator": babysittingRate,
  "janitorial-bid-calculator": janitorialBid,
  "lawn-care-pricing-calculator": lawnCarePricing,
  "handyman-pricing-calculator": handymanPricing,
  "nail-pricing-calculator": nailPricing,
};
