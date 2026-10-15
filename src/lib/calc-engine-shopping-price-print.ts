/**
 * Batch: "Shopping Calculators" → Pricing, Markup & Seller Fee — printing
 * and apparel decoration (9 tools).
 *
 *  - printingCost: documents and flyers — pages × copies × sides at B&W and
 *    colour per-page costs, paper and binding.
 *  - bookPrintingCost: print-on-demand cost per book (fixed + per page by
 *    interior type, hardcover add-on) and the 60% royalty at a list price.
 *  - largeFormatPrintingCost: banners, posters and signs by square foot and
 *    material, plus finishing and design.
 *  - labelPrintingCost: roll or sheet labels — setup spread over the run
 *    plus material by label area.
 *  - screenPrintingCost: screens per colour + print charge per colour per
 *    location + blanks, marked up, per shirt and per order.
 *  - dtgPricing: direct-to-garment — blank, ink and pretreat by print size,
 *    machine and labor time.
 *  - htvVinylShirtPricing: heat transfer vinyl by square inch, weeding and
 *    pressing time.
 *  - tShirtPricing: retail price for selling tees that reaches a target
 *    margin after printing, packaging, shipping and platform fees.
 *  - tShirtOrderSizeBreakdown: splits a bulk order into sizes using a
 *    typical size curve for the audience.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-price-print-calculators.ts for the copy.
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
const whole = (v: number, d = 0) => Math.max(0, Math.round(safeNumber(v, d)));

export const printingCost: CustomCalculator = (v) => {
  const copies = whole(v.copies);
  const pages = whole(v.pages);
  const duplex = safeNumber(v.sides) === 2;
  const impressions = copies * pages;
  const sheets = copies * (duplex ? Math.ceil(pages / 2) : pages);
  const color = pct(v.colorShare);
  const ink = impressions * (color * nonNeg(v.colorPerPage) + (1 - color) * nonNeg(v.bwPerPage));
  const paper = sheets * nonNeg(v.paperPerSheet);
  const binding = copies * nonNeg(v.bindingPerCopy);
  const total = ink + paper + binding;
  return {
    totalCost: round2(total),
    costPerCopy: copies > 0 ? round2(total / copies) : 0,
    printingCost: round2(ink),
    paperCost: round2(paper),
    sheetsUsed: sheets,
    costPerPage: impressions > 0 ? round2((total / impressions) * 1000) / 1000 : 0,
  };
};

/** [fixed $ per book, $ per page] by interior; dropdown value = index. */
const BOOK_INTERIOR: [number, number][] = [
  [1, 0.012], // black & white
  [1, 0.036], // standard colour
  [1, 0.07], // premium colour
];

export const bookPrintingCost: CustomCalculator = (v) => {
  const pages = whole(v.pages);
  const [fixed, perPage] = BOOK_INTERIOR[Math.min(2, whole(v.interior))];
  const hardcover = safeNumber(v.binding) === 1 ? nonNeg(v.hardcoverExtra) : 0;
  const perBook = fixed + perPage * pages + hardcover;
  const copies = whole(v.copies);
  const list = nonNeg(v.listPrice);
  const royalty = list * pct(v.royaltyRate) - perBook;
  return {
    printCostPerBook: round2(perBook),
    totalPrintCost: round2(perBook * copies),
    royaltyPerSale: round2(royalty),
    minimumListPrice: round2(pct(v.royaltyRate) > 0 ? perBook / pct(v.royaltyRate) : 0),
    authorCopiesWithShipping: round2((perBook + nonNeg(v.shippingPerBook)) * copies),
  };
};

/** $ per sq ft by material; dropdown value = index. */
const LF_MATERIALS = [4, 2.5, 5, 10, 8, 12];

export const largeFormatPrintingCost: CustomCalculator = (v) => {
  const sqft = nonNeg(v.widthFt) * nonNeg(v.heightFt);
  const rate = safeNumber(v.customRate) > 0 ? nonNeg(v.customRate) : LF_MATERIALS[Math.min(5, whole(v.material))];
  const qty = Math.max(1, whole(v.quantity, 1));
  const print = sqft * rate * qty;
  const finishing = nonNeg(v.finishingEach) * qty;
  const total = print + finishing + nonNeg(v.designFee);
  return {
    totalCost: round2(total),
    costEach: round2(total / qty),
    squareFeetEach: round2(sqft),
    printingCost: round2(print),
    ratePerSqFt: round2(rate),
  };
};

export const labelPrintingCost: CustomCalculator = (v) => {
  const qty = whole(v.quantity);
  const area = nonNeg(v.widthIn) * nonNeg(v.heightIn);
  const material = qty * area * nonNeg(v.costPerSqIn);
  const total = nonNeg(v.setupFee) + material + nonNeg(v.finishingFee);
  return {
    totalCost: round2(total),
    costPerLabel: qty > 0 ? round2((total / qty) * 1000) / 1000 : 0,
    materialCost: round2(material),
    setupShare: qty > 0 ? round2((nonNeg(v.setupFee) / total) * 100) : 0,
    labelArea: round2(area),
  };
};

export const screenPrintingCost: CustomCalculator = (v) => {
  const qty = Math.max(1, whole(v.quantity, 1));
  const colors = whole(v.frontColors) + whole(v.backColors);
  const screens = colors * nonNeg(v.screenFee);
  const printing = qty * colors * nonNeg(v.perColorPerShirt);
  const blanks = qty * nonNeg(v.blankCost);
  const cost = screens + printing + blanks;
  const price = cost * (1 + pct(v.markup));
  return {
    pricePerShirt: round2(price / qty),
    orderTotal: round2(price),
    costPerShirt: round2(cost / qty),
    screenFees: round2(screens),
    profitOnOrder: round2(price - cost),
  };
};

const DTG_INK = [1.5, 3, 5]; // ink + pretreat by print size: small, standard, oversize

export const dtgPricing: CustomCalculator = (v) => {
  const ink = DTG_INK[Math.min(2, whole(v.printSize))] * (safeNumber(v.darkGarment) === 1 ? 1.6 : 1);
  const time = nonNeg(v.minutesPerShirt) / 60;
  const labor = time * (nonNeg(v.laborRate) + nonNeg(v.machineRate));
  const cost = nonNeg(v.blankCost) + ink + labor;
  const price = cost * (1 + pct(v.markup));
  return {
    pricePerShirt: round2(price),
    costPerShirt: round2(cost),
    inkAndPretreat: round2(ink),
    laborAndMachine: round2(labor),
    orderTotal: round2(price * Math.max(1, whole(v.quantity, 1))),
  };
};

export const htvVinylShirtPricing: CustomCalculator = (v) => {
  const vinylSqIn = nonNeg(v.designWidthIn) * nonNeg(v.designHeightIn) * (1 + pct(v.wastePercent));
  const rollSqIn = nonNeg(v.rollWidthIn) * nonNeg(v.rollLengthFt) * 12;
  const vinyl = rollSqIn > 0 ? (vinylSqIn / rollSqIn) * nonNeg(v.rollPrice) * Math.max(1, whole(v.layers, 1)) : 0;
  const labor = (nonNeg(v.minutes) / 60) * nonNeg(v.hourlyRate);
  const cost = nonNeg(v.blankCost) + vinyl + labor;
  const price = cost * (1 + pct(v.markup));
  return {
    pricePerShirt: round2(price),
    costPerShirt: round2(cost),
    vinylCost: round2(vinyl),
    laborCost: round2(labor),
    profitPerShirt: round2(price - cost),
  };
};

export const tShirtPricing: CustomCalculator = (v) => {
  const cost = nonNeg(v.blankCost) + nonNeg(v.printCost) + nonNeg(v.packaging) + nonNeg(v.shippingCost);
  const feeRate = pct(v.platformFee) + pct(v.paymentRate);
  const margin = Math.min(0.9, pct(v.targetMargin));
  const denom = 1 - feeRate - margin;
  const price = denom > 0 ? (cost + nonNeg(v.paymentFixed)) / denom : 0;
  const fees = price * feeRate + nonNeg(v.paymentFixed);
  return {
    retailPrice: round2(price),
    roundedPrice: price > 0 ? Math.ceil(price) - 0.01 : 0,
    profitPerShirt: round2(price - cost - fees),
    totalCost: round2(cost),
    feesPerSale: round2(fees),
  };
};

/** Size curves [S, M, L, XL, 2XL, 3XL] by audience; dropdown value = index. */
const SIZE_CURVES: number[][] = [
  [0.08, 0.24, 0.3, 0.22, 0.11, 0.05], // adult unisex
  [0.16, 0.3, 0.27, 0.17, 0.07, 0.03], // women's
  [0.15, 0.3, 0.3, 0.18, 0.05, 0.02], // youth (XS–XL mapped to S–3XL slots)
];

export const tShirtOrderSizeBreakdown: CustomCalculator = (v) => {
  const total = whole(v.totalShirts);
  const curve = SIZE_CURVES[Math.min(2, whole(v.audience))];
  const raw = curve.map((p) => total * p);
  const counts = raw.map((r) => Math.floor(r));
  let left = total - counts.reduce((a, b) => a + b, 0);
  // Hand out the remainder to the largest fractional parts.
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    counts[i]++;
    left--;
  }
  const keys = ["small", "medium", "large", "xl", "xxl", "xxxl"];
  const out: Record<string, number> = { totalShirts: total };
  counts.forEach((c, i) => (out[keys[i]] = c));
  return out;
};

export const shoppingPricePrintCustomCalculators: Record<string, CustomCalculator> = {
  "printing-cost-calculator": printingCost,
  "book-printing-cost-calculator": bookPrintingCost,
  "large-format-printing-cost-calculator": largeFormatPrintingCost,
  "label-printing-cost-calculator": labelPrintingCost,
  "screen-printing-cost-calculator": screenPrintingCost,
  "dtg-pricing-calculator": dtgPricing,
  "htv-vinyl-shirt-pricing-calculator": htvVinylShirtPricing,
  "t-shirt-pricing-calculator": tShirtPricing,
  "t-shirt-order-size-breakdown-calculator": tShirtOrderSizeBreakdown,
};
