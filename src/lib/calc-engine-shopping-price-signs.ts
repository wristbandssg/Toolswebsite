/**
 * Batch: "Shopping Calculators" → Pricing, Markup & Seller Fee — making,
 * signs and framing (9 tools).
 *
 *  - embroideryCost: price per 1,000 stitches × stitch count × locations,
 *    a one-time digitizing fee and the garment.
 *  - laserEngravingPrice: material + engraving and setup time at a machine
 *    rate, spread over the quantity, with markup.
 *  - threeDPrintPrice (also filament cost): filament by grams, machine
 *    hours, failure rate, post-processing labor and markup.
 *  - pcbAssemblyCost: bare boards, components, SMT placements and
 *    through-hole joints per board plus setup/stencil per order.
 *  - vinylDecalPricing: vinyl and transfer tape by square inch, weeding time.
 *  - vinylSignPricing: substrate by square foot + vinyl lettering coverage
 *    + labor, for coroplast, PVC or aluminum signs.
 *  - signPrice: what a business sign costs to buy, by sign type and size,
 *    plus installation — the buyer's estimate.
 *  - channelLetterSignPrice: priced per inch of letter height per letter,
 *    by illumination, plus raceway, install and permit.
 *  - pictureFramingCost: custom framing by united inches (moulding), glazing
 *    and mat by area, mounting and labor.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-price-signs-calculators.ts for the copy.
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

export const embroideryCost: CustomCalculator = (v) => {
  const qty = Math.max(1, whole(v.quantity, 1));
  const stitches = nonNeg(v.stitchCount) * Math.max(1, whole(v.locations, 1));
  const perItemStitch = (stitches / 1000) * nonNeg(v.pricePer1000);
  const perItem = perItemStitch + nonNeg(v.garmentCost);
  const total = perItem * qty + nonNeg(v.digitizingFee);
  return {
    pricePerItem: round2(total / qty),
    orderTotal: round2(total),
    embroideryPerItem: round2(perItemStitch),
    digitizingPerItem: round2(nonNeg(v.digitizingFee) / qty),
    totalStitchesPerItem: stitches,
  };
};

export const laserEngravingPrice: CustomCalculator = (v) => {
  const qty = Math.max(1, whole(v.quantity, 1));
  const machine = ((nonNeg(v.engraveMinutes) * qty + nonNeg(v.setupMinutes)) / 60) * nonNeg(v.machineRate);
  const materials = nonNeg(v.materialCost) * qty;
  const cost = machine + materials + nonNeg(v.designFee);
  const price = cost * (1 + pct(v.markup));
  return {
    pricePerItem: round2(price / qty),
    orderTotal: round2(price),
    costPerItem: round2(cost / qty),
    machineTimeCost: round2(machine),
    profit: round2(price - cost),
  };
};

export const threeDPrintPrice: CustomCalculator = (v) => {
  const filament = (nonNeg(v.grams) / 1000) * nonNeg(v.costPerKg);
  const machine = nonNeg(v.printHours) * nonNeg(v.machineRate);
  const failure = Math.min(0.9, pct(v.failureRate));
  const production = (filament + machine) / (1 - failure);
  const labor = (nonNeg(v.postMinutes) / 60) * nonNeg(v.laborRate);
  const cost = production + labor;
  const price = cost * (1 + pct(v.markup));
  return {
    printPrice: round2(price),
    filamentCost: round2(filament),
    machineCost: round2(machine),
    costWithFailures: round2(cost),
    profit: round2(price - cost),
  };
};

export const pcbAssemblyCost: CustomCalculator = (v) => {
  const boards = Math.max(1, whole(v.boards, 1));
  const perBoard =
    nonNeg(v.barePcbCost) +
    nonNeg(v.componentsPerBoard) +
    nonNeg(v.smtPlacements) * nonNeg(v.costPerPlacement) +
    nonNeg(v.throughHoleJoints) * nonNeg(v.costPerJoint);
  const setup = nonNeg(v.setupFee) + nonNeg(v.stencilFee);
  const total = perBoard * boards + setup;
  return {
    costPerBoard: round2(total / boards),
    orderTotal: round2(total),
    assemblyPerBoard: round2(nonNeg(v.smtPlacements) * nonNeg(v.costPerPlacement) + nonNeg(v.throughHoleJoints) * nonNeg(v.costPerJoint)),
    setupPerBoard: round2(setup / boards),
    componentsShare: total > 0 ? round2(((nonNeg(v.componentsPerBoard) * boards) / total) * 100) : 0,
  };
};

export const vinylDecalPricing: CustomCalculator = (v) => {
  const qty = Math.max(1, whole(v.quantity, 1));
  const area = nonNeg(v.widthIn) * nonNeg(v.heightIn) * (1 + pct(v.wastePercent));
  const material = area * (nonNeg(v.vinylPerSqIn) + nonNeg(v.tapePerSqIn));
  const labor = (nonNeg(v.minutesEach) / 60) * nonNeg(v.hourlyRate);
  const cost = material + labor;
  const price = Math.max(nonNeg(v.minimumPrice), cost * (1 + pct(v.markup)));
  return {
    pricePerDecal: round2(price),
    orderTotal: round2(price * qty),
    costPerDecal: round2(cost),
    materialPerDecal: round2(material),
    profitPerDecal: round2(price - cost),
  };
};

const SUBSTRATE = [2.5, 5, 9, 6]; // $/sq ft: coroplast, PVC, aluminum composite, magnetic

export const vinylSignPricing: CustomCalculator = (v) => {
  const sqft = nonNeg(v.widthIn) * nonNeg(v.heightIn) / 144;
  const qty = Math.max(1, whole(v.quantity, 1));
  const substrate = sqft * SUBSTRATE[Math.min(3, whole(v.substrate))];
  const vinyl = sqft * pct(v.coverage) * nonNeg(v.vinylPerSqFt);
  const labor = (nonNeg(v.minutesEach) / 60) * nonNeg(v.hourlyRate);
  const cost = substrate + vinyl + labor;
  const price = cost * (1 + pct(v.markup));
  return {
    pricePerSign: round2(price),
    orderTotal: round2(price * qty + nonNeg(v.designFee)),
    costPerSign: round2(cost),
    squareFeet: round2(sqft),
    profitPerSign: round2(price - cost),
  };
};

/** [$ per sq ft, minimum $] by sign type; dropdown value = index. */
const SIGN_TYPES: [number, number][] = [
  [8, 25], // yard sign
  [6, 60], // vinyl banner
  [25, 150], // A-frame / sidewalk
  [20, 120], // aluminum / metal panel
  [45, 400], // dimensional letters (non-lit)
  [75, 800], // lightbox / cabinet sign
  [120, 3000], // monument sign
];

export const signPrice: CustomCalculator = (v) => {
  const sqft = nonNeg(v.widthFt) * nonNeg(v.heightFt);
  const [rate, min] = SIGN_TYPES[Math.min(6, whole(v.signType))];
  const qty = Math.max(1, whole(v.quantity, 1));
  const each = Math.max(min, sqft * rate);
  const total = each * qty + nonNeg(v.installation) + nonNeg(v.designFee) + nonNeg(v.permitFee);
  return {
    totalCost: round2(total),
    signCostEach: round2(each),
    squareFeet: round2(sqft),
    lowEstimate: round2(total * 0.75),
    highEstimate: round2(total * 1.35),
  };
};

const ILLUMINATION = [1, 1.25, 1.4, 0.6]; // front-lit, back-lit (halo), front & back, non-illuminated

export const channelLetterSignPrice: CustomCalculator = (v) => {
  const letters = whole(v.letters);
  const height = nonNeg(v.letterHeightIn);
  const lettersCost = letters * height * nonNeg(v.pricePerInch) * ILLUMINATION[Math.min(3, whole(v.illumination))];
  const raceway = nonNeg(v.racewayFt) * nonNeg(v.racewayPerFt);
  const total = lettersCost + raceway + nonNeg(v.installation) + nonNeg(v.permitFee);
  return {
    totalCost: round2(total),
    lettersCost: round2(lettersCost),
    racewayCost: round2(raceway),
    costPerLetter: letters > 0 ? round2(lettersCost / letters) : 0,
    costPerLetterInch: letters * height > 0 ? round2(lettersCost / (letters * height)) : 0,
  };
};

const GLAZING = [0.01, 0.025, 0.05]; // $/sq in: regular glass/acrylic, UV-protective, museum glass

export const pictureFramingCost: CustomCalculator = (v) => {
  const matW = nonNeg(v.matWidthIn);
  const w = nonNeg(v.artWidthIn) + 2 * matW;
  const h = nonNeg(v.artHeightIn) + 2 * matW;
  const united = w + h;
  const moulding = united * nonNeg(v.mouldingPerUnitedInch);
  const area = w * h;
  const glazing = area * GLAZING[Math.min(2, whole(v.glazing))];
  const mat = matW > 0 ? area * nonNeg(v.matPerSqIn) : 0;
  const total = moulding + glazing + mat + nonNeg(v.mounting) + nonNeg(v.labor);
  return {
    totalCost: round2(total),
    mouldingCost: round2(moulding),
    glazingCost: round2(glazing),
    matCost: round2(mat),
    unitedInches: round2(united),
    framedSize: round2(area),
  };
};

export const shoppingPriceSignsCustomCalculators: Record<string, CustomCalculator> = {
  "embroidery-cost-calculator": embroideryCost,
  "laser-engraving-price-calculator": laserEngravingPrice,
  "3d-print-price-calculator": threeDPrintPrice,
  "pcb-assembly-cost-calculator": pcbAssemblyCost,
  "vinyl-decal-pricing-calculator": vinylDecalPricing,
  "vinyl-sign-pricing-calculator": vinylSignPricing,
  "sign-price-calculator": signPrice,
  "channel-letter-sign-price-calculator": channelLetterSignPrice,
  "picture-framing-cost-calculator": pictureFramingCost,
};
