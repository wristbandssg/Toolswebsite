/**
 * Batch: "Shopping Calculators" → Sales Tax, VAT & Import Duty — special
 * taxes (8 tools).
 *
 *  - dcSalesTax: Washington, DC's rates by category (general, restaurant
 *    meals and alcohol, hotel, parking), forward or backward from a total.
 *  - salesTaxDeduction: the US itemized deduction — sales tax OR state
 *    income tax, plus property tax, inside the 2026 SALT cap ($40,400,
 *    reduced above $505,000 MAGI, never below $10,000).
 *  - restaurantTax: a restaurant bill with meals tax, tip on the pre-tax
 *    or after-tax amount, and the split per person.
 *  - hotelTax: occupancy/sales tax on a stay, flat per-night taxes and a
 *    taxable resort fee.
 *  - exciseTax: a per-unit or percentage excise, with sales tax charged
 *    on the price including excise.
 *  - luxuryTax: Canada's Select Luxury Items Tax (cars and aircraft over
 *    $100,000, boats over $250,000): the lesser of 10% of the price and 20%
 *    of the amount over the threshold, with GST/HST charged on the tax.
 *  - boatSalesTax: state boat sales tax presets with their caps.
 *  - cannabisPriceTax: cannabis excise + local cannabis tax + sales tax
 *    stacked on the shelf price, and the after-tax price per gram.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-tax-special-calculators.ts for the copy.
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

export const dcSalesTax: CustomCalculator = (v) => {
  const rate = pct(v.category);
  const amount = nonNeg(v.amount);
  const fromTotal = safeNumber(v.mode) === 1;
  const before = fromTotal ? amount / (1 + rate) : amount;
  const tax = before * rate;
  return {
    salesTax: round2(tax),
    priceBeforeTax: round2(before),
    totalWithTax: round2(before + tax),
    taxRate: round2(rate * 100),
  };
};

export const salesTaxDeduction: CustomCalculator = (v) => {
  const mfs = safeNumber(v.filingStatus) === 1;
  const salesTax = nonNeg(v.taxablePurchases) * pct(v.salesTaxRate) + nonNeg(v.bigPurchaseTax);
  const incomeTax = nonNeg(v.stateIncomeTax);
  const useSales = salesTax > incomeTax;
  const chosen = Math.max(salesTax, incomeTax);
  const capFull = mfs ? 20200 : 40400;
  const threshold = mfs ? 252500 : 505000;
  const floor = mfs ? 5000 : 10000;
  const cap = Math.max(floor, capFull - 0.3 * Math.max(0, nonNeg(v.magi) - threshold));
  const salt = Math.min(cap, chosen + nonNeg(v.propertyTax));
  return {
    saltDeduction: round2(salt),
    salesTaxDeduction: round2(salesTax),
    incomeTaxDeduction: round2(incomeTax),
    salesTaxIsBetter: useSales ? 1 : 0,
    saltCap: round2(cap),
    federalTaxSaved: round2(salt * pct(v.marginalRate)),
  };
};

export const restaurantTax: CustomCalculator = (v) => {
  const subtotal = nonNeg(v.subtotal);
  const tax = subtotal * pct(v.mealsTaxRate);
  const service = subtotal * pct(v.serviceCharge);
  const tipBase = safeNumber(v.tipOn) === 1 ? subtotal + tax : subtotal;
  const tip = tipBase * pct(v.tipPercent);
  const total = subtotal + tax + service + tip;
  const people = Math.max(1, Math.round(safeNumber(v.people, 1)));
  return {
    totalBill: round2(total),
    mealsTax: round2(tax),
    tip: round2(tip),
    serviceCharge: round2(service),
    perPerson: round2(total / people),
    taxAndTipShare: subtotal > 0 ? round2(((total - subtotal) / subtotal) * 100) : 0,
  };
};

export const hotelTax: CustomCalculator = (v) => {
  const nights = Math.max(0, Math.round(safeNumber(v.nights)));
  const rooms = Math.max(1, Math.round(safeNumber(v.rooms, 1)));
  const roomCost = nonNeg(v.nightlyRate) * nights * rooms;
  const resort = nonNeg(v.resortFee) * nights * rooms;
  const pctTax = (roomCost + resort) * pct(v.taxRate);
  const flat = nonNeg(v.flatPerNight) * nights * rooms;
  const tax = pctTax + flat;
  const total = roomCost + resort + tax;
  return {
    totalStayCost: round2(total),
    totalTax: round2(tax),
    roomCost: round2(roomCost),
    resortFees: round2(resort),
    costPerNight: nights > 0 ? round2(total / (nights * rooms)) : 0,
    effectiveTaxRate: roomCost > 0 ? round2((tax / roomCost) * 100) : 0,
  };
};

export const exciseTax: CustomCalculator = (v) => {
  const qty = nonNeg(v.quantity);
  const price = nonNeg(v.unitPrice) * qty;
  const perUnit = safeNumber(v.exciseType) === 1;
  const excise = perUnit ? nonNeg(v.exciseRate) * qty : price * pct(v.exciseRate);
  const salesTax = (price + excise) * pct(v.salesTaxRate);
  const total = price + excise + salesTax;
  return {
    exciseTax: round2(excise),
    salesTax: round2(salesTax),
    totalTax: round2(excise + salesTax),
    totalPrice: round2(total),
    taxShareOfPrice: total > 0 ? round2(((excise + salesTax) / total) * 100) : 0,
    excisePerUnit: qty > 0 ? round2(excise / qty) : 0,
  };
};

export const luxuryTax: CustomCalculator = (v) => {
  const price = nonNeg(v.price);
  const threshold = safeNumber(v.itemType) === 1 ? 250000 : 100000;
  const tenPct = price * 0.1;
  const twentyOver = Math.max(0, price - threshold) * 0.2;
  const lux = price > threshold ? Math.min(tenPct, twentyOver) : 0;
  const gstOnLux = lux * pct(v.salesTaxRate);
  const salesTax = price * pct(v.salesTaxRate);
  return {
    luxuryTax: round2(lux),
    tenPercentMethod: round2(price > threshold ? tenPct : 0),
    twentyPercentMethod: round2(twentyOver),
    gstHstOnLuxuryTax: round2(gstOnLux),
    totalWithTaxes: round2(price + lux + gstOnLux + salesTax),
    threshold,
  };
};

/** [state rate %, max tax $ (0 = none), max taxable price $ (0 = none)] */
const BOAT_STATES: [number, number, number][] = [
  [0, 0, 0], // 0 Other — enter the state rate
  [6, 18000, 0], // 1 Florida
  [5, 500, 0], // 2 South Carolina
  [3, 1500, 0], // 3 North Carolina
  [5, 15000, 0], // 4 Maryland (vessel excise)
  [2, 2000, 0], // 5 Virginia (watercraft sales tax)
  [3.3125, 0, 0], // 6 New Jersey (half rate)
  [2.99, 0, 0], // 7 Connecticut
  [4, 0, 230000], // 8 New York (tax on the first $230,000)
  [6.25, 0, 0], // 9 Texas
  [7.25, 0, 0], // 10 California
  [6.25, 0, 0], // 11 Massachusetts
  [0, 0, 0], // 12 Rhode Island (exempt)
  [0, 0, 0], // 13 No sales tax (OR, NH, DE, MT, AK)
];

export const boatSalesTax: CustomCalculator = (v) => {
  const idx = Math.min(BOAT_STATES.length - 1, Math.max(0, Math.round(safeNumber(v.state))));
  const [presetRate, maxTax, maxPrice] = BOAT_STATES[idx];
  const exempt = idx === 12 || idx === 13;
  const stateRate = idx === 0 ? pct(v.stateRate) : presetRate / 100;
  const taxable = Math.max(0, nonNeg(v.price) - nonNeg(v.tradeIn));
  const capped = maxPrice > 0 ? Math.min(taxable, maxPrice) : taxable;
  let stateTax = capped * stateRate;
  if (maxTax > 0) stateTax = Math.min(stateTax, maxTax);
  // Florida county surtax applies to the first $5,000 only.
  const localBase = idx === 1 ? Math.min(taxable, 5000) : capped;
  const localTax = exempt || idx === 2 || idx === 3 || idx === 4 || idx === 5 ? 0 : localBase * pct(v.localRate);
  const total = exempt ? 0 : stateTax + localTax;
  return {
    boatSalesTax: round2(total),
    stateTax: round2(exempt ? 0 : stateTax),
    localTax: round2(localTax),
    totalCost: round2(nonNeg(v.price) - nonNeg(v.tradeIn) + total),
    effectiveRate: nonNeg(v.price) > 0 ? round2((total / nonNeg(v.price)) * 100) : 0,
    taxSavedByCap: round2(exempt ? 0 : Math.max(0, taxable * stateRate - stateTax)),
  };
};

export const cannabisPriceTax: CustomCalculator = (v) => {
  const price = nonNeg(v.shelfPrice);
  const excise = price * pct(v.exciseRate);
  const local = price * pct(v.localCannabisRate);
  const sales = (price + excise + local) * pct(v.salesTaxRate);
  const total = price + excise + local + sales;
  const grams = nonNeg(v.grams);
  return {
    totalPrice: round2(total),
    totalTax: round2(excise + local + sales),
    exciseTax: round2(excise),
    localCannabisTax: round2(local),
    salesTax: round2(sales),
    pricePerGram: grams > 0 ? round2(total / grams) : 0,
    effectiveTaxRate: price > 0 ? round2(((total - price) / price) * 100) : 0,
  };
};

export const shoppingTaxSpecialCustomCalculators: Record<string, CustomCalculator> = {
  "dc-sales-tax-calculator": dcSalesTax,
  "sales-tax-deduction-calculator": salesTaxDeduction,
  "restaurant-tax-calculator": restaurantTax,
  "hotel-tax-calculator": hotelTax,
  "excise-tax-calculator": exciseTax,
  "luxury-tax-calculator": luxuryTax,
  "boat-sales-tax-calculator": boatSalesTax,
  "cannabis-price-tax-calculator": cannabisPriceTax,
};
