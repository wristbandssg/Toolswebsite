/**
 * Batch: "Shopping Calculators" → Discount, Tip & Unit Price — tips and
 * service fees (9 tools). The general tip-calculator (existing) splits a
 * restaurant bill; each of these answers one situation's own question:
 *
 *  - tattooTip: tip on a tattoo, and what it works out to per session hour.
 *  - nailSalonTip: tip on the full price before any coupon, including nail art.
 *  - massageTip (also spa services): skips the tip when a service charge is
 *    already included, and flags medical massage where tipping isn't expected.
 *  - hairSalonTip: splits tips between the stylist, colorist and assistant.
 *  - bartenderTip: per-drink tipping vs a percentage of the tab.
 *  - deliveryTip (also pizza delivery): % of the order with a minimum, plus
 *    extra for distance and bad weather.
 *  - moversTip: per mover per hour vs % of the moving bill.
 *  - tipSplit: a tip pool shared by hours worked across up to 5 people.
 *  - serviceFee: a restaurant or event service charge, its tax, and how
 *    much extra the bill is above the menu prices.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-deal-tips-calculators.ts for the copy.
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

export const tattooTip: CustomCalculator = (v) => {
  const price = nonNeg(v.tattooPrice);
  const tip = price * pct(v.tipPercent);
  const hours = nonNeg(v.hours);
  return {
    tip: round2(tip),
    totalCost: round2(price + tip),
    tipPerHour: hours > 0 ? round2(tip / hours) : 0,
    lowTip: round2(price * 0.15),
    highTip: round2(price * 0.25),
  };
};

export const nailSalonTip: CustomCalculator = (v) => {
  const full = nonNeg(v.servicePrice) + nonNeg(v.addOns);
  const paid = Math.max(0, full - nonNeg(v.discount));
  const tip = full * pct(v.tipPercent); // tip on the price before the coupon
  return {
    tip: round2(tip),
    totalToPay: round2(paid + tip),
    priceAfterDiscount: round2(paid),
    tipOnDiscountedPrice: round2(paid * pct(v.tipPercent)),
    tipDifference: round2(tip - paid * pct(v.tipPercent)),
  };
};

export const massageTip: CustomCalculator = (v) => {
  const price = nonNeg(v.servicePrice);
  const included = price * pct(v.includedGratuity);
  const medical = safeNumber(v.setting) === 2;
  const tip = medical ? 0 : Math.max(0, price * pct(v.tipPercent) - included);
  return {
    tip: round2(tip),
    totalToPay: round2(price + included + tip),
    includedGratuity: round2(included),
    totalGratuity: round2(included + tip),
    effectiveTipPercent: price > 0 ? round2(((included + tip) / price) * 100) : 0,
  };
};

export const hairSalonTip: CustomCalculator = (v) => {
  const cut = nonNeg(v.stylistPrice);
  const color = nonNeg(v.colorPrice);
  const sameStylist = safeNumber(v.sameStylist) === 1;
  const p = pct(v.tipPercent);
  const stylistTip = (sameStylist ? cut + color : cut) * p;
  const colorTip = sameStylist ? 0 : color * p;
  const assistant = nonNeg(v.assistantTip);
  const total = stylistTip + colorTip + assistant;
  return {
    totalTips: round2(total),
    stylistTip: round2(stylistTip),
    coloristTip: round2(colorTip),
    assistantTip: round2(assistant),
    totalToPay: round2(cut + color + total),
  };
};

export const bartenderTip: CustomCalculator = (v) => {
  const tab = nonNeg(v.tab);
  const drinks = nonNeg(v.drinks);
  const perDrink = drinks * nonNeg(v.perDrink);
  const percent = tab * pct(v.tipPercent);
  const usePerDrink = safeNumber(v.method) === 0;
  const tip = usePerDrink ? perDrink : percent;
  return {
    tip: round2(tip),
    totalToPay: round2(tab + tip),
    perDrinkMethod: round2(perDrink),
    percentMethod: round2(percent),
    tipPerDrink: drinks > 0 ? round2(tip / drinks) : 0,
  };
};

export const deliveryTip: CustomCalculator = (v) => {
  const order = nonNeg(v.orderTotal);
  const base = Math.max(order * pct(v.tipPercent), nonNeg(v.minimumTip));
  const distanceExtra = Math.max(0, nonNeg(v.miles) - 5) * nonNeg(v.extraPerMile);
  const weatherExtra = safeNumber(v.badWeather) === 1 ? nonNeg(v.weatherExtra) : 0;
  const tip = base + distanceExtra + weatherExtra;
  return {
    tip: round2(tip),
    totalToPay: round2(order + nonNeg(v.deliveryFee) + tip),
    baseTip: round2(base),
    distanceAndWeatherExtra: round2(distanceExtra + weatherExtra),
    tipAsPercentOfOrder: order > 0 ? round2((tip / order) * 100) : 0,
  };
};

export const moversTip: CustomCalculator = (v) => {
  const movers = Math.max(1, Math.round(safeNumber(v.movers, 1)));
  const hours = nonNeg(v.hours);
  const hourly = movers * hours * nonNeg(v.perMoverPerHour);
  const percent = nonNeg(v.moveCost) * pct(v.tipPercent);
  const tip = safeNumber(v.method) === 0 ? hourly : percent;
  return {
    totalTip: round2(tip),
    tipPerMover: round2(tip / movers),
    hourlyMethod: round2(hourly),
    percentMethod: round2(percent),
    tipAsPercentOfMove: nonNeg(v.moveCost) > 0 ? round2((tip / nonNeg(v.moveCost)) * 100) : 0,
  };
};

export const tipSplit: CustomCalculator = (v) => {
  const pool = nonNeg(v.totalTips) * (1 - pct(v.houseShare));
  const hours = [v.hours1, v.hours2, v.hours3, v.hours4, v.hours5].map((h) => nonNeg(h));
  const totalHours = hours.reduce((a, b) => a + b, 0);
  const rate = totalHours > 0 ? pool / totalHours : 0;
  const out: Record<string, number> = {
    tipsPerHour: round2(rate),
    poolAfterHouseShare: round2(pool),
    totalHours: round2(totalHours),
  };
  hours.forEach((h, i) => (out[`share${i + 1}`] = round2(h * rate)));
  return out;
};

export const serviceFee: CustomCalculator = (v) => {
  const subtotal = nonNeg(v.subtotal);
  const fee = subtotal * pct(v.serviceFeePercent);
  const taxBase = subtotal + (safeNumber(v.feeTaxable) === 1 ? fee : 0);
  const tax = taxBase * pct(v.taxRate);
  const tip = subtotal * pct(v.extraTipPercent);
  const total = subtotal + fee + tax + tip;
  return {
    totalBill: round2(total),
    serviceFee: round2(fee),
    salesTax: round2(tax),
    extraTip: round2(tip),
    extraAboveMenu: subtotal > 0 ? round2(((total - subtotal) / subtotal) * 100) : 0,
  };
};

export const shoppingDealTipsCustomCalculators: Record<string, CustomCalculator> = {
  "tattoo-tip-calculator": tattooTip,
  "nail-salon-tip-calculator": nailSalonTip,
  "massage-tip-calculator": massageTip,
  "hair-salon-tip-calculator": hairSalonTip,
  "bartender-tip-calculator": bartenderTip,
  "delivery-tip-calculator": deliveryTip,
  "movers-tip-calculator": moversTip,
  "tip-split-calculator": tipSplit,
  "service-fee-calculator": serviceFee,
};
