/**
 * Batch: "Business & Industrial Calculators" → Concrete & Masonry Calculators.
 *
 * Data / methods:
 *  - Volume: 27 cu ft per cubic yard; 0.764555 m³ per cubic yard.
 *  - Premix bag yields (Quikrete / Sakrete published yields): 40 lb 0.30 cu ft,
 *    50 lb 0.375, 60 lb 0.45, 80 lb 0.60.
 *  - Rebar unit weights (ASTM A615): #3 0.376 lb/ft … #11 5.313 lb/ft.
 *  - Concrete density: normal-weight 145–150 pcf, reinforced 150–156, lightweight
 *    90–115, heavyweight 200+.
 *  - Nominal mix: dry-volume factor 1.54; Portland cement 94 lb = 1 cu ft bag.
 *  - Curing: Nurse–Saul maturity with a −10 °C datum, scaled from the
 *    ACI-typical 70 °F schedule (walk 1 d, forms 2 d, cars 7 d, full 28 d).
 *  - CMU: 8×16 face = 1.125 blocks per sq ft; mortar ≈ 8.5 cu ft per 100 blocks;
 *    full-grout volumes per sq ft of wall (NCMA grout volume tables):
 *    6 in 0.167, 8 in 0.258, 10 in 0.347, 12 in 0.437 cu ft.
 *  - Thrust blocks: T = 2·P·A·sin(θ/2) for bends, T = P·A for tees / dead ends
 *    (AWWA M41 / DIPRA thrust restraint method), bearing area = T·SF ÷ soil bearing.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-biz-concrete-calculators.ts for the copy.
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
const yes = (v: number) => Math.round(safeNumber(v)) === 1;
const ceil = (n: number) => Math.ceil(n - 1e-9);
const YD3_M3 = 0.764555;

/** Premix bag yields in cu ft: 40, 50, 60, 80 lb. */
export const BAG_SIZES: [number, number][] = [[40, 0.3], [50, 0.375], [60, 0.45], [80, 0.6]];
/** Rebar: size label number, diameter (in), weight (lb/ft). */
export const REBAR: [number, number, number][] = [[3, 0.375, 0.376], [4, 0.5, 0.668], [5, 0.625, 1.043], [6, 0.75, 1.502], [7, 0.875, 2.044], [8, 1.0, 2.67], [9, 1.128, 3.4], [10, 1.27, 4.303], [11, 1.41, 5.313]];

/** Shared output block for a wet concrete volume in cu ft. */
function volumeOut(cuFt: number, wastePct: number, pricePerYd = 0) {
  const total = cuFt * (1 + nonNeg(wastePct) / 100);
  const yd = total / 27;
  return {
    cubicYards: round2(yd),
    cubicFeet: round2(total),
    cubicMeters: round2(yd * YD3_M3),
    bags80: ceil(total / 0.6),
    bags60: ceil(total / 0.45),
    bags40: ceil(total / 0.3),
    concreteCost: round2(yd * nonNeg(pricePerYd)),
  };
}

// --- Volume tools -------------------------------------------------------------------------------------
export const concrete: CustomCalculator = (v) => {
  const shape = pick(v.shape, 3); // 0 slab/rect, 1 round column, 2 round slab
  const qty = Math.max(1, nonNeg(v.quantity, 1));
  let each = 0;
  if (shape === 0) each = nonNeg(v.length) * nonNeg(v.width) * (nonNeg(v.thickness) / 12);
  else if (shape === 1) each = Math.PI * Math.pow(nonNeg(v.diameter) / 24, 2) * nonNeg(v.length);
  else each = Math.PI * Math.pow(nonNeg(v.diameter) / 24, 2) * (nonNeg(v.thickness) / 12);
  return volumeOut(each * qty, v.waste, v.pricePerYard);
};

export const concreteColumn: CustomCalculator = (v) => {
  const square = pick(v.shape, 2) === 1;
  const size = nonNeg(v.diameter) / 12;
  const area = square ? size * size : Math.PI * Math.pow(size / 2, 2);
  const count = Math.max(1, nonNeg(v.count, 1));
  const out = volumeOut(area * nonNeg(v.height) * count, v.waste, v.pricePerYard);
  return { ...out, perColumnCuFt: round2(area * nonNeg(v.height)), tubesNeeded: square ? 0 : ceil((count * nonNeg(v.height)) / Math.max(1, nonNeg(v.tubeLength, 12))) };
};

export const concreteFooting: CustomCalculator = (v) => {
  const strip = nonNeg(v.stripLength) * (nonNeg(v.stripWidth) / 12) * (nonNeg(v.stripDepth) / 12);
  const pads = nonNeg(v.padCount) * nonNeg(v.padLength) * nonNeg(v.padWidth) * (nonNeg(v.padDepth) / 12);
  const out = volumeOut(strip + pads, v.waste, v.pricePerYard);
  return { ...out, stripCubicYards: round2(strip / 27), padCubicYards: round2(pads / 27) };
};

export const postHole: CustomCalculator = (v) => {
  const d = nonNeg(v.holeDiameter) / 12;
  const depth = Math.max(0, nonNeg(v.holeDepth) - nonNeg(v.gravelBase)) / 12;
  const post = nonNeg(v.postSize) / 12;
  const postArea = pick(v.postShape, 2) === 0 ? post * post : Math.PI * Math.pow(post / 2, 2);
  const per = Math.max(0, Math.PI * Math.pow(d / 2, 2) - postArea) * depth;
  const posts = Math.max(1, nonNeg(v.posts, 1));
  const [lb, yieldFt] = BAG_SIZES[pick(v.bagSize, 4)];
  const total = per * posts * (1 + nonNeg(v.waste) / 100);
  const bags = ceil(total / yieldFt);
  return { bagsNeeded: bags, bagsPerPost: round2(per / yieldFt), cubicFeet: round2(total), cubicYards: round2(total / 27), totalWeightLb: bags * lb, totalCost: round2(bags * nonNeg(v.bagPrice)) };
};

export const premixBags: CustomCalculator = (v) => {
  const cuFt = nonNeg(v.length) * nonNeg(v.width) * (nonNeg(v.depth) / 12) * Math.max(1, nonNeg(v.quantity, 1)) * (1 + nonNeg(v.waste) / 100);
  const [lb, yieldFt] = BAG_SIZES[pick(v.bagSize, 4)];
  const bags = ceil(cuFt / yieldFt);
  return { bagsNeeded: bags, cubicFeet: round2(cuFt), cubicYards: round2(cuFt / 27), totalWeightLb: bags * lb, totalCost: round2(bags * nonNeg(v.bagPrice)), bagsPerCubicYard: round2(27 / yieldFt), pallets: round2(bags / (lb >= 80 ? 42 : lb >= 60 ? 56 : 70)) };
};

export const selfLeveling: CustomCalculator = (v) => {
  const area = nonNeg(v.area);
  const cuFt = area * (nonNeg(v.thickness) / 12) * (1 + nonNeg(v.waste) / 100);
  const yieldFt = Math.max(0.05, nonNeg(v.bagYield, 0.5));
  const bags = ceil(cuFt / yieldFt);
  return { bagsNeeded: bags, cubicFeet: round2(cuFt), coveragePerBag: round2(yieldFt / (Math.max(0.01, nonNeg(v.thickness)) / 12)), waterQuarts: round2(bags * nonNeg(v.waterPerBag)), primerGallons: round2(area / 300), totalCost: round2(bags * nonNeg(v.bagPrice) + Math.ceil(area / 300) * nonNeg(v.primerPrice)) };
};

export const monolithicSlab: CustomCalculator = (v) => {
  const L = nonNeg(v.length);
  const W = nonNeg(v.width);
  const t = nonNeg(v.thickness) / 12;
  const bw = nonNeg(v.beamWidth) / 12;
  const extra = Math.max(0, nonNeg(v.beamDepth) / 12 - t);
  const slab = L * W * t;
  const perimeter = Math.max(0, 2 * (L + W) - 4 * bw);
  const edge = perimeter * bw * extra;
  const interior = nonNeg(v.interiorBeamLength) * bw * extra;
  const out = volumeOut(slab + edge + interior, v.waste, v.pricePerYard);
  return { ...out, slabCubicYards: round2(slab / 27), beamCubicYards: round2((edge + interior) / 27), trucks: ceil(out.cubicYards / 10) };
};

export const concreteCurb: CustomCalculator = (v) => {
  const curb = (nonNeg(v.curbHeight) * nonNeg(v.curbWidth)) / 144;
  const gutter = (nonNeg(v.gutterWidth) * nonNeg(v.gutterThickness)) / 144;
  const out = volumeOut((curb + gutter) * nonNeg(v.length), v.waste, v.pricePerYard);
  return { ...out, yardsPer100Ft: round2(((curb + gutter) * 100) / 27), crossSectionSqFt: round2(curb + gutter) };
};

export const concreteSteps: CustomCalculator = (v) => {
  const n = Math.max(1, Math.round(nonNeg(v.steps, 1)));
  const rise = nonNeg(v.rise) / 12;
  const run = nonNeg(v.run) / 12;
  const platform = Math.max(run, nonNeg(v.platformDepth) / 12);
  const w = nonNeg(v.width);
  let cuFt = 0;
  for (let i = 1; i < n; i++) cuFt += i * rise * run * w;
  cuFt += n * rise * platform * w;
  const out = volumeOut(cuFt, v.waste, v.pricePerYard);
  return { ...out, totalRiseIn: round2(n * nonNeg(v.rise)), totalRunIn: round2((n - 1) * nonNeg(v.run) + platform * 12) };
};

// --- Cost tools ---------------------------------------------------------------------------------------
export const sidewalkCost: CustomCalculator = (v) => {
  const area = nonNeg(v.length) * nonNeg(v.width);
  const cuFt = area * (nonNeg(v.thickness) / 12);
  const install = area * nonNeg(v.costPerSqFt);
  const demo = yes(v.removeOld) ? area * nonNeg(v.removalPerSqFt) : 0;
  const total = install + demo + nonNeg(v.permit);
  return { totalCost: round2(total), installCost: round2(install), removalCost: round2(demo), squareFeet: round2(area), cubicYards: round2((cuFt * 1.05) / 27), costPerSqFt: round2(area ? total / area : 0), lowEstimate: round2(total * 0.8), highEstimate: round2(total * 1.25) };
};

export const concreteWall: CustomCalculator = (v) => {
  const area = Math.max(0, nonNeg(v.length) * nonNeg(v.height) - nonNeg(v.openings));
  const cuFt = area * (nonNeg(v.thickness) / 12) * (1 + nonNeg(v.waste) / 100);
  const yd = cuFt / 27;
  const material = yd * nonNeg(v.pricePerYard);
  const forming = area * 2 * nonNeg(v.formCostPerSqFt);
  const labor = area * nonNeg(v.laborPerSqFt);
  const total = material + forming + labor + (yes(v.pump) ? nonNeg(v.pumpCost) : 0);
  return { totalCost: round2(total), cubicYards: round2(yd), concreteCost: round2(material), formingCost: round2(forming), laborCost: round2(labor), wallAreaSqFt: round2(area), costPerSqFtOfWall: round2(area ? total / area : 0) };
};

export const DRIVEWAY_FINISH = [0, 2, 3.5, 6, 9]; // broom, colored, exposed aggregate, stamped, stamped + colored ($/sq ft)
export const driveway: CustomCalculator = (v) => {
  const area = nonNeg(v.length) * nonNeg(v.width);
  const cuFt = area * (nonNeg(v.thickness) / 12) * (1 + nonNeg(v.waste) / 100);
  const yd = cuFt / 27;
  const baseTons = (area * (nonNeg(v.baseDepth) / 12) * 1.4 * 1.15) / 27; // 1.4 t/yd³ compacted gravel, 15% compaction
  const concreteCost = yd * nonNeg(v.pricePerYard);
  const finish = area * DRIVEWAY_FINISH[pick(v.finish, DRIVEWAY_FINISH.length)];
  const labor = area * nonNeg(v.laborPerSqFt);
  const base = baseTons * nonNeg(v.gravelPerTon);
  const total = concreteCost + finish + labor + base;
  return { cubicYards: round2(yd), totalCost: round2(total), concreteCost: round2(concreteCost), baseGravelTons: round2(baseTons), finishCost: round2(finish), laborCost: round2(labor), trucks: ceil(yd / 10), costPerSqFt: round2(area ? total / area : 0), squareFeet: round2(area) };
};

/** Foundation installed cost per sq ft of footprint (mid-points of 2025–2026 national ranges). */
export const FOUNDATION_TYPES: [string, number, number][] = [
  ["Slab-on-grade", 6, 12], ["Monolithic slab", 5, 10], ["Crawl space", 8, 21], ["Pier & beam", 8, 15], ["Basement, unfinished (poured)", 20, 37], ["Basement, finished", 35, 70], ["Precast basement walls (e.g. Superior Walls)", 28, 45],
];
export const foundationCost: CustomCalculator = (v) => {
  const [, lo, hi] = FOUNDATION_TYPES[pick(v.type, FOUNDATION_TYPES.length)];
  const area = nonNeg(v.length) * nonNeg(v.width);
  const f = 1 + safeNumber(v.regionAdjust) / 100;
  const extras = nonNeg(v.excavation) + nonNeg(v.permits) + (yes(v.waterproofing) ? area * 3 : 0);
  const mid = ((lo + hi) / 2) * area * f + extras;
  return { estimatedCost: round2(mid), lowEstimate: round2(lo * area * f + extras), highEstimate: round2(hi * area * f + extras), costPerSqFt: round2(area ? mid / area : 0), footprintSqFt: round2(area) };
};

// --- Weight, rebar, curing ----------------------------------------------------------------------------
export const DENSITY_PCF = [150, 145, 115, 100, 225];
export const concreteWeight: CustomCalculator = (v) => {
  const cuFt = pick(v.mode, 2) === 0 ? nonNeg(v.length) * nonNeg(v.width) * (nonNeg(v.thickness) / 12) : nonNeg(v.cubicYards) * 27;
  const lb = cuFt * DENSITY_PCF[pick(v.density, DENSITY_PCF.length)] * Math.max(1, nonNeg(v.quantity, 1));
  return { weightLb: round2(lb), shortTons: round2(lb / 2000), weightKg: round2(lb * 0.45359237), metricTonnes: round2((lb * 0.45359237) / 1000), cubicYards: round2((cuFt * Math.max(1, nonNeg(v.quantity, 1))) / 27) };
};

export const rebarGrid: CustomCalculator = (v) => {
  const L = nonNeg(v.length);
  const W = nonNeg(v.width);
  const s = Math.max(1, nonNeg(v.spacing, 12)) / 12;
  const c = nonNeg(v.edgeCover) / 12;
  const [, dia, lbFt] = REBAR[pick(v.barSize, REBAR.length)];
  const runL = Math.max(0, L - 2 * c);
  const runW = Math.max(0, W - 2 * c);
  const barsAlongLength = runW > 0 ? Math.floor(runW / s + 1e-9) + 1 : 0; // bars running the length
  const barsAlongWidth = runL > 0 ? Math.floor(runL / s + 1e-9) + 1 : 0;
  const stock = Math.max(1, nonNeg(v.stockLength, 20));
  const lap = (nonNeg(v.lapDiameters, 40) * dia) / 12;
  const piecesFor = (run: number) => (run <= stock ? 1 : 1 + Math.ceil((run - stock) / Math.max(0.1, stock - lap)));
  const linear = barsAlongLength * runL + barsAlongWidth * runW;
  const lapExtra = barsAlongLength * (piecesFor(runL) - 1) * lap + barsAlongWidth * (piecesFor(runW) - 1) * lap;
  const totalFt = (linear + lapExtra) * (1 + nonNeg(v.waste) / 100);
  const lb = totalFt * lbFt;
  return { stockBars: ceil(totalFt / stock), barsRunningLength: barsAlongLength, barsRunningWidth: barsAlongWidth, totalLinearFeet: round2(totalFt), weightLb: round2(lb), weightTons: round2(lb / 2000), intersections: barsAlongLength * barsAlongWidth, totalCost: round2(ceil(totalFt / stock) * nonNeg(v.barPrice)) };
};

export const rebarWeight: CustomCalculator = (v) => {
  const [, dia, lbFt] = REBAR[pick(v.barSize, REBAR.length)];
  const ft = nonNeg(v.barLength) * Math.max(0, nonNeg(v.bars));
  const lb = ft * lbFt;
  return { weightLb: round2(lb), weightKg: round2(lb * 0.45359237), shortTons: round2(lb / 2000), poundsPerFoot: lbFt, totalFeet: round2(ft), diameterIn: dia, totalCost: round2(pick(v.priceBasis, 2) === 0 ? lb * nonNeg(v.price) : (lb / 2000) * nonNeg(v.price)) };
};

/** Cement type speed factor relative to Type I/II. */
export const CEMENT_SPEED = [1, 0.6, 0.8, 1.3];
export const curingTime: CustomCalculator = (v) => {
  const tC = (safeNumber(v.temperature, 70) - 32) * (5 / 9);
  const factor = Math.max(0.05, (tC + 10) / (21.1 + 10));
  const k = CEMENT_SPEED[pick(v.cementType, CEMENT_SPEED.length)] / factor;
  const tooCold = safeNumber(v.temperature, 70) < 40 ? 1 : 0;
  return { daysToDriveOn: round2(7 * k), hoursToWalkOn: round2(24 * k), daysToStripForms: round2(2 * k), daysTo70Percent: round2(7 * k), daysToFullStrength: round2(28 * k), maturityFactor: round2(factor), coldWeatherWarning: tooCold };
};

// --- Mix ------------------------------------------------------------------------------------------------
export const MIXES: [number, number, number][] = [[1, 2, 4], [1, 1.5, 3], [1, 2, 3], [1, 3, 6], [1, 1, 2], [1, 3, 0]];
export const cementMix: CustomCalculator = (v) => {
  const wet = pick(v.mode, 2) === 0 ? nonNeg(v.length) * nonNeg(v.width) * (nonNeg(v.thickness) / 12) : nonNeg(v.cubicYards) * 27;
  const total = wet * (1 + nonNeg(v.waste) / 100);
  const [c, s, g] = MIXES[pick(v.mix, MIXES.length)];
  const dry = total * (g === 0 ? 1.33 : 1.54);
  const parts = c + s + g;
  const cementFt = (dry * c) / parts;
  const sandFt = (dry * s) / parts;
  const gravelFt = (dry * g) / parts;
  const cementLb = cementFt * 94;
  return { cementBags94: ceil(cementFt), cementLb: round2(cementLb), cementBags50kg: ceil((cementLb * 0.45359237) / 50), sandCubicYards: round2(sandFt / 27), sandTons: round2((sandFt * 100) / 2000), gravelCubicYards: round2(gravelFt / 27), gravelTons: round2((gravelFt * 105) / 2000), waterGallons: round2((cementLb * nonNeg(v.waterCementRatio, 0.5)) / 8.34), wetCubicYards: round2(total / 27) };
};

// --- Masonry --------------------------------------------------------------------------------------------
/** Block face size (in, incl. 3/8 joint) and mortar cu ft per block. */
export const BLOCKS: [string, number, number, number][] = [["8×8×16 standard", 16, 8, 0.085], ["6×8×16", 16, 8, 0.07], ["10×8×16", 16, 8, 0.1], ["12×8×16", 16, 8, 0.115], ["4×8×16", 16, 8, 0.055], ["8×4×16 half-high", 16, 4, 0.06]];
export const cmu: CustomCalculator = (v) => {
  const [, fl, fh, mortar] = BLOCKS[pick(v.blockSize, BLOCKS.length)];
  const area = Math.max(0, nonNeg(v.length) * nonNeg(v.height) - nonNeg(v.openings));
  const perSqFt = 144 / (fl * fh);
  const blocks = ceil(area * perSqFt * (1 + nonNeg(v.waste) / 100));
  const mortarFt = blocks * mortar;
  const bags = ceil(mortarFt / 0.67);
  const courses = ceil((nonNeg(v.height) * 12) / fh);
  return { blocksNeeded: blocks, blocksPerSqFt: round2(perSqFt), courses, mortarBags80: bags, mortarCubicFeet: round2(mortarFt), wallAreaSqFt: round2(area), totalCost: round2(blocks * nonNeg(v.blockPrice) + bags * nonNeg(v.mortarPrice)) };
};

/** Brick / paver units: length, height (in, actual) and whether mortar joints apply. */
export const BRICKS: [string, number, number, number, boolean][] = [
  ["Modular brick", 7.625, 2.25, 3.625, true], ["Queen brick", 7.625, 2.75, 3.125, true], ["King brick", 9.625, 2.625, 3, true], ["Utility brick", 11.625, 3.625, 3.625, true], ["Standard brick (8×2.25)", 8, 2.25, 3.75, true], ["Brick paver 4×8 (flat)", 8, 4, 2.25, false], ["Brick paver 4×8 (herringbone, extra cuts)", 8, 4, 2.25, false],
];
export const brick: CustomCalculator = (v) => {
  const [, l, h, d, mortared] = BRICKS[pick(v.brickType, BRICKS.length)];
  const j = mortared ? nonNeg(v.joint, 0.375) : 0;
  const area = Math.max(0, nonNeg(v.length) * nonNeg(v.height) - nonNeg(v.openings));
  const perSqFt = 144 / ((l + j) * (h + j));
  const extra = pick(v.brickType, BRICKS.length) === 6 ? 5 : 0;
  const units = ceil(area * perSqFt * (1 + (nonNeg(v.waste) + extra) / 100));
  const mortarFt = mortared ? (units * ((l + j) * (h + j) - l * h) * d) / 1728 : 0;
  const sandFt = mortared ? 0 : area * (1 / 12);
  return { bricksNeeded: units, bricksPerSqFt: round2(perSqFt), mortarBags80: ceil(mortarFt / 0.67), mortarCubicFeet: round2(mortarFt), beddingSandCubicYards: round2(sandFt / 27), areaSqFt: round2(area), totalCost: round2(units * nonNeg(v.unitPrice)) };
};

export const MORTAR_UNITS: [string, number][] = [["Modular brick (per sq ft of wall)", 0.0587], ["Queen / king brick", 0.05], ["8 in CMU block", 0.0956], ["12 in CMU block", 0.129], ["Natural stone veneer (1 in joints)", 0.1], ["Thin brick / tile set", 0.02]];
export const mortar: CustomCalculator = (v) => {
  const [, perSqFt] = MORTAR_UNITS[pick(v.unitType, MORTAR_UNITS.length)];
  const ft = nonNeg(v.area) * perSqFt * (1 + nonNeg(v.waste) / 100);
  const masonryCementBags = ceil(ft / 3); // 1 bag masonry cement + 3 cu ft sand ≈ 3 cu ft mortar
  return { mortarCubicFeet: round2(ft), premixBags80: ceil(ft / 0.67), premixBags60: ceil(ft / 0.5), masonryCementBags70: masonryCementBags, sandTons: round2((masonryCementBags * 3 * 100) / 2000), totalCost: round2(ceil(ft / 0.67) * nonNeg(v.bagPrice)) };
};

/** Grout volume, cu ft per sq ft of fully grouted wall, by block width. */
export const GROUT_PER_SQFT: [string, number][] = [["6 in block", 0.167], ["8 in block", 0.258], ["10 in block", 0.347], ["12 in block", 0.437]];
export const blockFill: CustomCalculator = (v) => {
  const [, perSqFt] = GROUT_PER_SQFT[pick(v.blockWidth, GROUT_PER_SQFT.length)];
  const area = Math.max(0, nonNeg(v.length) * nonNeg(v.height) - nonNeg(v.openings));
  const ft = area * perSqFt * (nonNeg(v.percentFilled, 100) / 100) * (1 + nonNeg(v.waste) / 100);
  return { groutCubicYards: round2(ft / 27), groutCubicFeet: round2(ft), bags80: ceil(ft / 0.6), blocksInWall: ceil(area * 1.125), totalCost: round2((ft / 27) * nonNeg(v.pricePerYard)) };
};

export const ICF_CORES = [4, 6, 8, 10, 12];
export const icf: CustomCalculator = (v) => {
  const L = nonNeg(v.length);
  const H = nonNeg(v.height);
  const area = Math.max(0, L * H - nonNeg(v.openings));
  const faceSqFt = (nonNeg(v.blockLength, 48) * nonNeg(v.blockHeight, 16)) / 144;
  const corners = Math.round(nonNeg(v.corners));
  const courses = ceil((H * 12) / Math.max(1, nonNeg(v.blockHeight, 16)));
  const cornerBlocks = corners * courses;
  const total = ceil((area / Math.max(0.1, faceSqFt)) * (1 + nonNeg(v.waste) / 100));
  const core = ICF_CORES[pick(v.core, ICF_CORES.length)];
  const yd = (area * (core / 12)) / 27;
  const horiz = courses * L * (core >= 8 ? 2 : 1);
  const vert = (Math.floor((L * 12) / Math.max(6, nonNeg(v.verticalSpacing, 24))) + 1) * H;
  return { totalBlocks: total, straightBlocks: Math.max(0, total - cornerBlocks), cornerBlocks, courses, concreteCubicYards: round2(yd * 1.05), rebarLinearFeet: round2((horiz + vert) * 1.1), wallAreaSqFt: round2(area) };
};

export const tileGrout: CustomCalculator = (v) => {
  const L = Math.max(0.1, nonNeg(v.tileLength));
  const W = Math.max(0.1, nonNeg(v.tileWidth));
  const j = nonNeg(v.jointWidth);
  const t = nonNeg(v.tileThickness);
  const in3PerSqFt = ((L + W) / (L * W)) * j * t * 144;
  const density = pick(v.groutType, 3) === 2 ? 0.054 : 0.0625; // lb/in³: cementitious ≈1.73 g/cm³, epoxy ≈1.5
  const lb = nonNeg(v.area) * in3PerSqFt * density * (1 + nonNeg(v.waste) / 100);
  return { groutLb: round2(lb), bags25lb: ceil(lb / 25), bags10lb: ceil(lb / 10), groutKg: round2(lb * 0.45359237), lbPer100SqFt: round2(in3PerSqFt * density * 100), coveragePer25lbBag: round2(lb > 0 ? (25 / lb) * nonNeg(v.area) : 0) };
};

export const flowableFill: CustomCalculator = (v) => {
  const gross = nonNeg(v.length) * (nonNeg(v.width) / 12) * (nonNeg(v.depth) / 12);
  const pipe = Math.PI * Math.pow(nonNeg(v.pipeDiameter) / 24, 2) * nonNeg(v.length);
  const ft = Math.max(0, gross - pipe) * (1 + nonNeg(v.waste) / 100);
  const yd = ft / 27;
  return { cubicYards: round2(yd), cubicMeters: round2(yd * YD3_M3), weightTons: round2((ft * nonNeg(v.density, 120)) / 2000), trucks: ceil(yd / 10), totalCost: round2(yd * nonNeg(v.pricePerYard)) };
};

/** Fitting angle (degrees); 0 = tee / dead end / plug. */
export const FITTINGS: [string, number][] = [["90° bend", 90], ["45° bend", 45], ["22.5° bend", 22.5], ["11.25° bend", 11.25], ["Tee / dead end / plug", 0]];
export const SOILS: [string, number][] = [["Muck / peat (not suitable)", 0], ["Soft clay", 1000], ["Silt", 1500], ["Sandy silt", 3000], ["Sand", 4000], ["Sandy clay", 6000], ["Hard clay", 9000]];
export const thrustBlock: CustomCalculator = (v) => {
  const [, angle] = FITTINGS[pick(v.fitting, FITTINGS.length)];
  const d = nonNeg(v.pipeDiameter);
  const area = (Math.PI / 4) * d * d;
  const p = nonNeg(v.pressure);
  const thrust = angle === 0 ? p * area : 2 * p * area * Math.sin(((angle / 2) * Math.PI) / 180);
  const soil = pick(v.soil, SOILS.length) === 0 ? 0 : SOILS[pick(v.soil, SOILS.length)][1];
  const bearing = soil > 0 ? (thrust * Math.max(1, nonNeg(v.safetyFactor, 1.5))) / soil : 0;
  const side = Math.sqrt(bearing);
  const yd = (bearing * nonNeg(v.blockDepth, 2)) / 27;
  return { thrustLb: round2(thrust), bearingAreaSqFt: round2(bearing), squareFaceSideFt: round2(side), concreteCubicYards: round2(yd), soilUnsuitable: soil === 0 ? 1 : 0 };
};

export const bizConcreteCustomCalculators: Record<string, CustomCalculator> = {
  "concrete-calculator": concrete,
  "concrete-column-calculator": concreteColumn,
  "concrete-footing-calculator": concreteFooting,
  "post-hole-concrete-calculator": postHole,
  "quikrete-calculator": premixBags,
  "self-leveling-concrete-calculator": selfLeveling,
  "monolithic-slab-calculator": monolithicSlab,
  "concrete-curb-calculator": concreteCurb,
  "concrete-steps-calculator": concreteSteps,
  "concrete-sidewalk-calculator": sidewalkCost,
  "concrete-wall-calculator": concreteWall,
  "concrete-driveway-calculator": driveway,
  "foundation-cost-calculator": foundationCost,
  "concrete-weight-calculator": concreteWeight,
  "rebar-calculator": rebarGrid,
  "rebar-weight-calculator": rebarWeight,
  "concrete-curing-time-calculator": curingTime,
  "cement-calculator": cementMix,
  "concrete-block-calculator": cmu,
  "brick-calculator": brick,
  "mortar-calculator": mortar,
  "block-fill-calculator": blockFill,
  "icf-calculator": icf,
  "grout-calculator": tileGrout,
  "flowable-fill-calculator": flowableFill,
  "thrust-block-calculator": thrustBlock,
};
