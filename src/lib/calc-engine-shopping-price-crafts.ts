/**
 * Batch: "Shopping Calculators" → Pricing, Markup & Seller Fee — crafts and
 * art pricing (12 tools). Each uses the pricing method that craft's makers
 * actually use, with its own cost inputs:
 *
 *  - candlePricing: wax by weight, fragrance load, vessel/wick/label, time.
 *  - soapPricing: per-batch oils, lye and additives into bars, plus packaging.
 *  - crochetPricing: yarn skeins + hours × rate + profit.
 *  - woodworkingPricing: lumber, hardware/finish, hours and shop rate.
 *  - handmadePricing: the classic (materials + labor + overhead) × 2 =
 *    wholesale, × 2 = retail formula.
 *  - handmadeJewelryPricing: materials × 2 + labor + overhead = wholesale,
 *    × 2 (or chosen multiple) = retail.
 *  - quiltPricing: quilt size × longarm rate per square inch, binding per
 *    inch, piecing hours and fabric.
 *  - resinPrice: resin volume at cost per ml with waste, add-ins and time.
 *  - stainedGlassCost: what a stained glass panel costs a buyer — square
 *    feet × complexity rate + framing and installation.
 *  - artPrintPrice: print cost + packaging × markup, with a limited-edition
 *    premium.
 *  - paintingPrice: original artwork by square inch or linear inch, plus
 *    canvas and frame cost recovered at 2×.
 *  - commissionPrice (also digital art): hours × rate + extra characters,
 *    background, rush fee and commercial-use multiplier.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-price-crafts-calculators.ts for the copy.
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

/** Wholesale and retail from a unit cost and a retail multiple; wholesale = cost × 2. */
function wholesaleRetail(cost: number, retailMultiple: number) {
  const wholesale = cost * 2;
  return { wholesale, retail: cost * Math.max(1, retailMultiple) };
}

export const candlePricing: CustomCalculator = (v) => {
  const sizeOz = nonNeg(v.candleOz);
  const load = pct(v.fragranceLoad);
  const waxOz = sizeOz / (1 + load);
  const fragOz = sizeOz - waxOz;
  const wax = (waxOz / 16) * nonNeg(v.waxPerLb);
  const frag = fragOz * nonNeg(v.fragrancePerOz);
  const materials = wax + frag + nonNeg(v.vesselWickLabel);
  const labor = (nonNeg(v.minutesPerCandle) / 60) * nonNeg(v.hourlyRate);
  const cost = materials + labor;
  const { wholesale, retail } = wholesaleRetail(cost, nonNeg(v.retailMultiple, 2.5));
  return {
    retailPrice: round2(retail),
    wholesalePrice: round2(wholesale),
    costPerCandle: round2(cost),
    materialsPerCandle: round2(materials),
    waxAndFragrance: round2(wax + frag),
    profitAtRetail: round2(retail - cost),
  };
};

export const soapPricing: CustomCalculator = (v) => {
  const bars = Math.max(1, nonNeg(v.barsPerBatch) || 1);
  const batch = nonNeg(v.oilsCost) + nonNeg(v.lyeCost) + nonNeg(v.additivesCost);
  const labor = nonNeg(v.hours) * nonNeg(v.hourlyRate);
  const cost = (batch + labor) / bars + nonNeg(v.packagingPerBar);
  const { wholesale, retail } = wholesaleRetail(cost, nonNeg(v.retailMultiple, 2.5));
  return {
    retailPrice: round2(retail),
    wholesalePrice: round2(wholesale),
    costPerBar: round2(cost),
    ingredientsPerBar: round2(batch / bars),
    profitPerBatchRetail: round2((retail - cost) * bars),
  };
};

export const crochetPricing: CustomCalculator = (v) => {
  const yarn = nonNeg(v.skeins) * nonNeg(v.pricePerSkein);
  const materials = yarn + nonNeg(v.otherMaterials);
  const labor = nonNeg(v.hours) * nonNeg(v.hourlyRate);
  const price = (materials + labor) * (1 + pct(v.profitPercent));
  return {
    price: round2(price),
    materials: round2(materials),
    laborValue: round2(labor),
    profit: round2(price - materials - labor),
    effectiveHourly: nonNeg(v.hours) > 0 ? round2((price - materials) / nonNeg(v.hours)) : 0,
  };
};

export const woodworkingPricing: CustomCalculator = (v) => {
  const lumber = nonNeg(v.lumberCost) * (1 + pct(v.wastePercent));
  const materials = lumber + nonNeg(v.hardwareFinish);
  const hours = nonNeg(v.hours);
  const labor = hours * (nonNeg(v.hourlyRate) + nonNeg(v.shopRatePerHour));
  const cost = materials + labor;
  const price = cost * (1 + pct(v.profitPercent));
  return {
    price: round2(price),
    materials: round2(materials),
    laborAndShop: round2(labor),
    profit: round2(price - cost),
    materialsShareOfPrice: price > 0 ? round2((materials / price) * 100) : 0,
  };
};

export const handmadePricing: CustomCalculator = (v) => {
  const labor = nonNeg(v.hours) * nonNeg(v.hourlyRate);
  const base = nonNeg(v.materials) + labor;
  const cost = base * (1 + pct(v.overheadPercent));
  const wholesale = cost * nonNeg(v.wholesaleMultiple, 2);
  const retail = wholesale * nonNeg(v.retailMultiple, 2);
  return {
    retailPrice: round2(retail),
    wholesalePrice: round2(wholesale),
    totalCost: round2(cost),
    laborCost: round2(labor),
    profitAtWholesale: round2(wholesale - cost),
    profitAtRetail: round2(retail - cost),
  };
};

export const handmadeJewelryPricing: CustomCalculator = (v) => {
  const materials = nonNeg(v.metalCost) + nonNeg(v.stonesBeads) + nonNeg(v.findings);
  const labor = nonNeg(v.hours) * nonNeg(v.hourlyRate);
  const overhead = (materials + labor) * pct(v.overheadPercent);
  const wholesale = materials * 2 + labor + overhead;
  const retail = wholesale * nonNeg(v.retailMultiple, 2);
  const cost = materials + labor + overhead;
  return {
    retailPrice: round2(retail),
    wholesalePrice: round2(wholesale),
    materials: round2(materials),
    laborCost: round2(labor),
    totalCost: round2(cost),
    profitAtRetail: round2(retail - cost),
  };
};

/** [width in, length in] by quilt size; dropdown value = index. */
const QUILT_SIZES: [number, number][] = [
  [36, 52], // baby / crib
  [50, 65], // throw
  [70, 90], // twin
  [80, 90], // full
  [90, 95], // queen
  [108, 95], // king
];

export const quiltPricing: CustomCalculator = (v) => {
  const [w, l] = QUILT_SIZES[Math.min(5, Math.max(0, Math.round(safeNumber(v.size))))];
  const area = w * l;
  const quilting = area * nonNeg(v.quiltingPerSqIn);
  const binding = 2 * (w + l) * nonNeg(v.bindingPerInch);
  const piecing = nonNeg(v.piecingHours) * nonNeg(v.hourlyRate);
  const fabric = nonNeg(v.fabricBatting);
  const cost = quilting + binding + piecing + fabric;
  const price = cost * (1 + pct(v.profitPercent));
  return {
    quiltPrice: round2(price),
    quiltingCost: round2(quilting),
    bindingCost: round2(binding),
    piecingLabor: round2(piecing),
    squareInches: area,
    pricePerSqIn: area > 0 ? round2((price / area) * 1000) / 1000 : 0,
  };
};

export const resinPrice: CustomCalculator = (v) => {
  const ml = nonNeg(v.resinMl) * (1 + pct(v.wastePercent));
  const perMl = nonNeg(v.kitMl) > 0 ? nonNeg(v.kitCost) / nonNeg(v.kitMl) : 0;
  const resin = ml * perMl;
  const materials = resin + nonNeg(v.addIns);
  const labor = nonNeg(v.hours) * nonNeg(v.hourlyRate);
  const cost = materials + labor;
  const price = cost * (1 + pct(v.profitPercent));
  return {
    price: round2(price),
    resinCost: round2(resin),
    materials: round2(materials),
    laborCost: round2(labor),
    profit: round2(price - cost),
  };
};

const GLASS_RATES = [100, 175, 275, 400]; // $/sq ft: simple, moderate, detailed, highly intricate

export const stainedGlassCost: CustomCalculator = (v) => {
  const sqft = (nonNeg(v.widthIn) * nonNeg(v.heightIn)) / 144;
  const rate = GLASS_RATES[Math.min(3, Math.max(0, Math.round(safeNumber(v.complexity))))];
  const panel = sqft * rate;
  const frame = nonNeg(v.framing);
  const install = nonNeg(v.installation);
  const total = panel + frame + install;
  return {
    totalCost: round2(total),
    panelCost: round2(panel),
    squareFeet: round2(sqft),
    ratePerSqFt: rate,
    lowEstimate: round2(total * 0.8),
    highEstimate: round2(total * 1.25),
  };
};

export const artPrintPrice: CustomCalculator = (v) => {
  const cost = nonNeg(v.printCost) + nonNeg(v.packaging) + nonNeg(v.signingMounting);
  const limited = safeNumber(v.edition) === 1;
  const multiple = nonNeg(v.markupMultiple, 3) * (limited ? 1 + pct(v.limitedPremium) : 1);
  const price = cost * multiple;
  const fee = price * pct(v.salesFeePercent);
  return {
    printPrice: round2(price),
    costPerPrint: round2(cost),
    profitPerPrint: round2(price - cost - fee),
    marketplaceFee: round2(fee),
    editionRevenue: round2((price - cost - fee) * nonNeg(v.editionSize)),
  };
};

export const paintingPrice: CustomCalculator = (v) => {
  const w = nonNeg(v.widthIn);
  const h = nonNeg(v.heightIn);
  const bySqIn = w * h * nonNeg(v.ratePerSqIn);
  const byLinear = (w + h) * nonNeg(v.ratePerLinearIn);
  const useSq = safeNumber(v.method) === 0;
  const base = useSq ? bySqIn : byLinear;
  const materials = (nonNeg(v.canvasCost) + nonNeg(v.frameCost)) * 2;
  const price = base + materials;
  return {
    paintingPrice: round2(price),
    squareInchPrice: round2(bySqIn + materials),
    linearInchPrice: round2(byLinear + materials),
    materialsRecovered: round2(materials),
    squareInches: round2(w * h),
  };
};

export const commissionPrice: CustomCalculator = (v) => {
  const base = nonNeg(v.hours) * nonNeg(v.hourlyRate);
  const extras = base * pct(v.extraCharacterPercent) * nonNeg(v.extraCharacters) + nonNeg(v.backgroundFee);
  const subtotal = base + extras;
  const usage = [1, 2, 3][Math.min(2, Math.max(0, Math.round(safeNumber(v.usage))))];
  const licensed = subtotal * usage;
  const rush = licensed * pct(v.rushPercent);
  const price = licensed + rush;
  return {
    commissionPrice: round2(price),
    basePrice: round2(base),
    extrasCost: round2(extras),
    usageMultiplier: usage,
    rushFee: round2(rush),
    deposit: round2(price * pct(v.depositPercent)),
  };
};

export const shoppingPriceCraftsCustomCalculators: Record<string, CustomCalculator> = {
  "candle-pricing-calculator": candlePricing,
  "soap-pricing-calculator": soapPricing,
  "crochet-pricing-calculator": crochetPricing,
  "woodworking-pricing-calculator": woodworkingPricing,
  "handmade-pricing-calculator": handmadePricing,
  "handmade-jewelry-pricing-calculator": handmadeJewelryPricing,
  "quilt-pricing-calculator": quiltPricing,
  "resin-price-calculator": resinPrice,
  "stained-glass-cost-calculator": stainedGlassCost,
  "art-print-price-calculator": artPrintPrice,
  "painting-price-calculator": paintingPrice,
  "commission-price-calculator": commissionPrice,
};
