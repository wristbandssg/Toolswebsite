/**
 * Batch: "Shopping Calculators" → Discount, Tip & Unit Price — discounts and
 * deals (12 tools). discount-calculator (existing) handles one % off; these
 * each answer a different shopping question:
 *
 *  - doubleDiscount: stacked discounts applied one after another (20% + 10%
 *    is 28%, not 30%), with an optional third.
 *  - bogo (also "buy 2 get 1 free"): buy X get Y at Z% off, for a cart of N.
 *  - freeShippingThreshold: how much to add to reach free shipping, and
 *    whether a filler item beats paying for shipping.
 *  - volumeDiscount: tiered all-units pricing and the saving at the next tier.
 *  - bundlePrice: bundle vs buying items separately.
 *  - rebate: mail-in and instant rebates, tax on the pre-rebate price and the
 *    expected price if you might not mail it in.
 *  - priceAdjustment: refund when the price drops within the store's window.
 *  - priceIncrease: the new price from a % increase, or the % from two prices.
 *  - originalPrice: the price before a discount (reverse of % off).
 *  - legoPricePerPiece: cost per piece vs the 10¢ benchmark.
 *  - pizzaSizeValue: price per square inch for up to three pizzas.
 *  - annualCost: a recurring cost turned into yearly, monthly, daily and
 *    multi-year totals, and what it could grow to invested.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-deal-discounts-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pct = (v: number) => Math.min(1, nonNeg(v) / 100);
const whole = (v: number, d = 0) => Math.max(0, Math.round(safeNumber(v, d)));

export const doubleDiscount: CustomCalculator = (v) => {
  const price = nonNeg(v.price);
  const final = price * (1 - pct(v.discount1)) * (1 - pct(v.discount2)) * (1 - pct(v.discount3));
  const combined = price > 0 ? (1 - final / price) * 100 : 0;
  const added = Math.min(100, nonNeg(v.discount1) + nonNeg(v.discount2) + nonNeg(v.discount3));
  return {
    finalPrice: round2(final),
    totalSavings: round2(price - final),
    combinedDiscount: round2(combined),
    ifPercentagesAdded: round2(added),
    finalWithTax: round2(final * (1 + nonNeg(v.taxRate) / 100)),
  };
};

export const bogo: CustomCalculator = (v) => {
  const price = nonNeg(v.itemPrice);
  const buy = Math.max(1, whole(v.buyQty, 1));
  const get = whole(v.getQty, 1);
  const cart = whole(v.cartQty);
  const groups = Math.floor(cart / (buy + get));
  const leftover = cart - groups * (buy + get);
  // Leftover items beyond a full "buy" set still earn discounted items only in a full group.
  const discounted = groups * get + Math.max(0, leftover - buy);
  const full = cart - discounted;
  const total = full * price + discounted * price * (1 - pct(v.getDiscount));
  const regular = cart * price;
  return {
    totalPrice: round2(total),
    savings: round2(regular - total),
    effectiveDiscount: regular > 0 ? round2(((regular - total) / regular) * 100) : 0,
    pricePerItem: cart > 0 ? round2(total / cart) : 0,
    discountedItems: discounted,
  };
};

export const freeShippingThreshold: CustomCalculator = (v) => {
  const cart = nonNeg(v.cartTotal);
  const threshold = nonNeg(v.threshold);
  const shipping = nonNeg(v.shippingFee);
  const need = Math.max(0, threshold - cart);
  const filler = nonNeg(v.fillerPrice);
  const fillerCount = filler > 0 ? Math.ceil(need / filler) : 0;
  const fillerSpend = fillerCount * filler;
  return {
    amountToAdd: round2(need),
    shippingSaved: round2(need > 0 ? shipping : 0),
    fillerItemsNeeded: fillerCount,
    extraSpendVsShipping: round2(need > 0 ? fillerSpend - shipping : 0),
    totalIfYouPayShipping: round2(cart + (need > 0 ? shipping : 0)),
    totalIfYouAddItems: round2(cart + fillerSpend),
  };
};

export const volumeDiscount: CustomCalculator = (v) => {
  const unit = nonNeg(v.unitPrice);
  const qty = whole(v.quantity);
  const tiers: [number, number][] = [
    [whole(v.tier1Qty), pct(v.tier1Discount)],
    [whole(v.tier2Qty), pct(v.tier2Discount)],
    [whole(v.tier3Qty), pct(v.tier3Discount)],
  ].filter(([q]) => q > 0).sort((a, b) => a[0] - b[0]) as [number, number][];
  const discFor = (q: number) => tiers.filter(([t]) => q >= t).reduce((d, [, r]) => r, 0);
  const d = discFor(qty);
  const price = unit * (1 - d);
  const total = price * qty;
  const next = tiers.find(([t]) => t > qty);
  const nextTotal = next ? unit * (1 - next[1]) * next[0] : 0;
  return {
    totalPrice: round2(total),
    pricePerUnit: round2(price),
    savings: round2(unit * qty - total),
    discountApplied: round2(d * 100),
    unitsToNextTier: next ? next[0] - qty : 0,
    nextTierTotal: round2(nextTotal),
  };
};

export const bundlePrice: CustomCalculator = (v) => {
  const items = [v.item1, v.item2, v.item3, v.item4].map((x) => nonNeg(x));
  const separate = items.reduce((a, b) => a + b, 0);
  const bundle = nonNeg(v.bundlePrice);
  const wanted = items.slice(0, Math.min(4, Math.max(1, whole(v.itemsYouWant, 4)))).reduce((a, b) => a + b, 0);
  return {
    bundleSavings: round2(separate - bundle),
    percentSaved: separate > 0 ? round2(((separate - bundle) / separate) * 100) : 0,
    separateTotal: round2(separate),
    savingsOnItemsYouWant: round2(wanted - bundle),
    effectivePricePerItem: round2(bundle / Math.max(1, items.filter((x) => x > 0).length)),
  };
};

export const rebate: CustomCalculator = (v) => {
  const price = nonNeg(v.price);
  const instant = nonNeg(v.instantRebate);
  const mail = nonNeg(v.mailInRebate);
  // Sales tax is normally charged on the price before rebates.
  const tax = (safeNumber(v.taxBeforeRebate) === 1 ? price : price - instant) * (nonNeg(v.taxRate) / 100);
  const paidAtRegister = price - instant + tax;
  const effective = paidAtRegister - mail;
  const expected = paidAtRegister - mail * pct(v.redeemChance);
  return {
    effectivePrice: round2(effective),
    paidAtRegister: round2(paidAtRegister),
    salesTax: round2(tax),
    totalRebates: round2(instant + mail),
    expectedPrice: round2(expected),
    effectiveDiscount: price > 0 ? round2(((price + tax - effective) / (price + tax)) * 100) : 0,
  };
};

export const priceAdjustment: CustomCalculator = (v) => {
  const paid = nonNeg(v.pricePaid);
  const now = nonNeg(v.newPrice);
  const qty = Math.max(1, whole(v.quantity, 1));
  const eligible = nonNeg(v.daysSincePurchase) <= nonNeg(v.windowDays) && now < paid;
  const diff = Math.max(0, paid - now) * qty;
  const refund = eligible ? diff * (1 + nonNeg(v.taxRate) / 100) : 0;
  return {
    refund: round2(refund),
    eligible: eligible ? 1 : 0,
    priceDrop: round2(diff),
    daysLeft: Math.max(0, nonNeg(v.windowDays) - nonNeg(v.daysSincePurchase)),
    percentDrop: paid > 0 ? round2(((paid - now) / paid) * 100) : 0,
  };
};

export const priceIncrease: CustomCalculator = (v) => {
  const old = nonNeg(v.originalPrice);
  const byPercent = safeNumber(v.mode) === 0;
  const newPrice = byPercent ? old * (1 + safeNumber(v.increasePercent) / 100) : nonNeg(v.newPrice);
  const change = newPrice - old;
  const qty = nonNeg(v.unitsPerYear);
  return {
    newPrice: round2(newPrice),
    increaseAmount: round2(change),
    percentIncrease: old > 0 ? round2((change / old) * 100) : 0,
    extraCostPerYear: round2(change * qty),
    discountToGoBack: newPrice > 0 ? round2((change / newPrice) * 100) : 0,
  };
};

export const originalPrice: CustomCalculator = (v) => {
  const sale = nonNeg(v.salePrice);
  const d = Math.min(0.99, nonNeg(v.discountPercent) / 100);
  const taxIncluded = safeNumber(v.taxIncluded) === 1;
  const preTax = taxIncluded ? sale / (1 + nonNeg(v.taxRate) / 100) : sale;
  const original = preTax / (1 - d);
  return {
    originalPrice: round2(original),
    amountSaved: round2(original - preTax),
    salePriceBeforeTax: round2(preTax),
    discountPercent: round2(d * 100),
  };
};

export const legoPricePerPiece: CustomCalculator = (v) => {
  const price = nonNeg(v.setPrice) * (1 - pct(v.discountPercent));
  const pieces = nonNeg(v.pieces);
  const ppp = pieces > 0 ? price / pieces : 0;
  const minifigValue = nonNeg(v.minifigs) * nonNeg(v.minifigValue);
  const brickPrice = Math.max(0, price - minifigValue);
  return {
    pricePerPiece: round2(ppp * 100) / 100,
    centsPerPiece: round2(ppp * 100),
    piecesPerDollar: price > 0 ? round2(pieces / price) : 0,
    priceAfterDiscount: round2(price),
    centsPerPieceExMinifigs: pieces > 0 ? round2((brickPrice / pieces) * 100) : 0,
    valueVs10Cents: ppp > 0 ? round2((0.1 / ppp) * 100) : 0,
  };
};

export const pizzaSizeValue: CustomCalculator = (v) => {
  const pizzas = [1, 2, 3].map((i) => {
    const d = nonNeg(v[`size${i}`]);
    const count = whole(v[`count${i}`], 1);
    const area = Math.PI * (d / 2) ** 2 * count;
    const price = nonNeg(v[`price${i}`]);
    return { area, price, ppsi: area > 0 && price > 0 ? price / area : Infinity };
  });
  const valid = pizzas.filter((p) => Number.isFinite(p.ppsi));
  const best = valid.length ? pizzas.indexOf(valid.reduce((a, b) => (b.ppsi < a.ppsi ? b : a))) + 1 : 0;
  const out: Record<string, number> = { bestDeal: best };
  pizzas.forEach((p, i) => {
    out[`centsPerSqIn${i + 1}`] = Number.isFinite(p.ppsi) ? round2(p.ppsi * 100) : 0;
    out[`area${i + 1}`] = round2(p.area);
  });
  return out;
};

export const annualCost: CustomCalculator = (v) => {
  const perYear = [365, 52, 26, 12, 4, 1][Math.min(5, whole(v.frequency))];
  const annual = nonNeg(v.amount) * perYear;
  const years = nonNeg(v.years);
  const r = nonNeg(v.returnRate) / 100;
  const invested = r > 0 ? annual * ((Math.pow(1 + r, years) - 1) / r) : annual * years;
  return {
    annualCost: round2(annual),
    monthlyCost: round2(annual / 12),
    dailyCost: round2(annual / 365),
    totalOverYears: round2(annual * years),
    ifInvested: round2(invested),
  };
};

export const shoppingDealDiscountsCustomCalculators: Record<string, CustomCalculator> = {
  "double-discount-calculator": doubleDiscount,
  "bogo-calculator": bogo,
  "free-shipping-threshold-calculator": freeShippingThreshold,
  "volume-discount-calculator": volumeDiscount,
  "bundle-price-calculator": bundlePrice,
  "rebate-calculator": rebate,
  "price-adjustment-calculator": priceAdjustment,
  "price-increase-calculator": priceIncrease,
  "original-price-calculator": originalPrice,
  "lego-price-per-piece-calculator": legoPricePerPiece,
  "pizza-size-value-calculator": pizzaSizeValue,
  "annual-cost-calculator": annualCost,
};
