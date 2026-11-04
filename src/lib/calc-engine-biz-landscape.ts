/**
 * Batch: "Business & Industrial Calculators" → Landscaping, Aggregate & Paving Calculators.
 *
 * Data / methods:
 *  - Loose bulk densities (tons per cubic yard, typical supplier conversion charts
 *    such as Martin Marietta / Vulcan / local quarries): pea gravel 1.35, #57 stone 1.4,
 *    river rock 1.35, crushed concrete 1.2, road base / Class 5 1.4 loose (compacts
 *    ~20–30%), dry sand 1.35, wet sand 1.7, topsoil 1.1, mulch ≈ 0.4.
 *  - Hot-mix asphalt compacted density ≈ 145 lb/ft³ (≈ 1.96 tons per cubic yard);
 *    millings ≈ 1.3 t/yd³ loose; cold patch ≈ 50 lb per 0.33 cu ft.
 *  - Riprap: layer thickness = 2 × D50 (FHWA HEC-23 / NCHRP 568), placed ≈ 1.5 t/yd³.
 *  - Soil swell factors (bank → loose): sand/gravel 12%, topsoil 25%, clay 30%,
 *    blasted rock 50%.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-biz-landscape-calculators.ts for the copy.
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

/** Area in sq ft from a rectangle (length × width) or a circle (length = diameter). */
function areaOf(v: Record<string, number>) {
  return pick(v.shape, 2) === 1 ? Math.PI * Math.pow(nonNeg(v.length) / 2, 2) : nonNeg(v.length) * nonNeg(v.width);
}

/** Generic "spread a loose material" result. */
function spread(cuFt: number, tonsPerYd: number, pricePerTon: number, delivery: number, truckTons = 0) {
  const yd = cuFt / 27;
  const tons = yd * tonsPerYd;
  return { tons: round2(tons), cubicYards: round2(yd), cubicFeet: round2(cuFt), cubicMeters: round2(yd * YD3_M3), bags50lb: ceil((tons * 2000) / 50), truckLoads: truckTons > 0 ? ceil(tons / truckTons) : 0, totalCost: round2(tons * pricePerTon + delivery) };
}

export const GRAVELS: [string, number][] = [["Pea gravel", 1.35], ["#57 crushed stone (3/4 in)", 1.4], ["#3 / #4 crushed stone (1–2 in)", 1.45], ["River rock (1–3 in)", 1.35], ["Large river rock (3–6 in)", 1.4], ["Crushed concrete", 1.2], ["Decomposed granite", 1.3], ["Lava rock", 0.5]];
export const gravel: CustomCalculator = (v) => {
  const cuFt = areaOf(v) * (nonNeg(v.depth) / 12) * (1 + nonNeg(v.waste) / 100);
  return spread(cuFt, GRAVELS[pick(v.material, GRAVELS.length)][1], nonNeg(v.pricePerTon), nonNeg(v.delivery), nonNeg(v.truckTons));
};

export const BASES: [string, number][] = [["Road base / crusher run", 1.4], ["Class 5 aggregate base", 1.4], ["Crushed limestone base (#411 / dense grade)", 1.45], ["Recycled concrete base", 1.2], ["Recycled asphalt base", 1.15]];
export const roadBase: CustomCalculator = (v) => {
  const compacted = areaOf(v) * (nonNeg(v.depth) / 12);
  const loose = compacted * (1 + nonNeg(v.compaction, 25) / 100);
  const out = spread(loose, BASES[pick(v.material, BASES.length)][1], nonNeg(v.pricePerTon), nonNeg(v.delivery), nonNeg(v.truckTons));
  return { ...out, compactedCubicYards: round2(compacted / 27), looseCubicYards: out.cubicYards };
};

export const SANDS: [string, number][] = [["Dry fill / mason sand", 1.35], ["Wet sand", 1.7], ["Play sand", 1.3], ["Concrete sand", 1.4], ["Paver base sand", 1.35]];
export const sand: CustomCalculator = (v) => {
  const cuFt = areaOf(v) * (nonNeg(v.depth) / 12) * (1 + nonNeg(v.waste) / 100);
  return spread(cuFt, SANDS[pick(v.material, SANDS.length)][1], nonNeg(v.pricePerTon), nonNeg(v.delivery), nonNeg(v.truckTons));
};

export const SOILS: [string, number][] = [["Screened topsoil", 1.1], ["Loam / garden blend", 1.0], ["Fill dirt", 1.25], ["Compost", 0.6], ["Clay", 1.45]];
export const topsoil: CustomCalculator = (v) => {
  const cuFt = areaOf(v) * (nonNeg(v.depth) / 12) * (1 + nonNeg(v.settling) / 100);
  const yd = cuFt / 27;
  const tons = yd * SOILS[pick(v.material, SOILS.length)][1];
  const bags = ceil(cuFt / 0.75);
  const bulkCost = yd * nonNeg(v.pricePerYard) + nonNeg(v.delivery);
  return { cubicYards: round2(yd), tons: round2(tons), cubicFeet: round2(cuFt), bags40lb: bags, bulkCost: round2(bulkCost), bagCost: round2(bags * nonNeg(v.bagPrice)), cheaperOption: bulkCost <= bags * nonNeg(v.bagPrice) ? 1 : 2 };
};

export const mulch: CustomCalculator = (v) => {
  const cuFt = areaOf(v) * (nonNeg(v.depth) / 12);
  const yd = cuFt / 27;
  const bags2 = ceil(cuFt / 2);
  const bags3 = ceil(cuFt / 3);
  return { cubicYards: round2(yd), bags2CuFt: bags2, bags3CuFt: bags3, cubicFeet: round2(cuFt), bulkCost: round2(yd * nonNeg(v.pricePerYard) + nonNeg(v.delivery)), bagCost: round2(bags2 * nonNeg(v.bagPrice)), coveragePerYardSqFt: round2(nonNeg(v.depth) > 0 ? 324 / nonNeg(v.depth) : 0) };
};

export const PINE_STRAW: [string, number][] = [["Longleaf", 60], ["Slash", 50], ["Loblolly / short needle", 40]];
export const pineStraw: CustomCalculator = (v) => {
  const area = areaOf(v);
  const perBale = (PINE_STRAW[pick(v.type, PINE_STRAW.length)][1] * 3) / Math.max(1, nonNeg(v.depth, 3));
  const bales = ceil(area / perBale);
  return { balesNeeded: bales, coveragePerBale: round2(perBale), areaSqFt: round2(area), materialCost: round2(bales * nonNeg(v.balePrice)), installedCost: round2(bales * (nonNeg(v.balePrice) + nonNeg(v.laborPerBale))) };
};

export const SWELL: [string, number][] = [["Sand / gravel", 12], ["Topsoil / loam", 25], ["Common earth", 25], ["Clay", 30], ["Rock (ripped / blasted)", 50]];
export const excavationCost: CustomCalculator = (v) => {
  const bank = (nonNeg(v.length) * nonNeg(v.width) * nonNeg(v.depth)) / 27;
  const loose = bank * (1 + SWELL[pick(v.soil, SWELL.length)][1] / 100);
  const loads = ceil(loose / Math.max(1, nonNeg(v.truckYards, 12)));
  const dig = bank * nonNeg(v.digPerYard);
  const haul = yes(v.haulOff) ? loose * nonNeg(v.haulPerYard) : 0;
  const total = dig + haul + nonNeg(v.mobilization);
  return { totalCost: round2(total), bankCubicYards: round2(bank), looseCubicYards: round2(loose), truckLoads: yes(v.haulOff) ? loads : 0, diggingCost: round2(dig), haulingCost: round2(haul), costPerBankYard: round2(bank ? total / bank : 0) };
};

export const stumpGrinding: CustomCalculator = (v) => {
  const n = Math.round(nonNeg(v.stumps));
  const per = Math.max(nonNeg(v.minimumPerStump), nonNeg(v.averageDiameter) * nonNeg(v.ratePerInch));
  const base = n > 0 ? Math.max(nonNeg(v.jobMinimum), per * n) : 0;
  const roots = yes(v.roots) ? base * 0.25 : 0;
  const cleanup = yes(v.cleanup) ? n * nonNeg(v.cleanupPerStump) : 0;
  const total = base + roots + cleanup;
  return { totalCost: round2(total), costPerStump: round2(n ? total / n : 0), grindingCost: round2(base), rootGrinding: round2(roots), cleanupCost: round2(cleanup), totalDiameterInches: round2(n * nonNeg(v.averageDiameter)) };
};

export const hydroseeding: CustomCalculator = (v) => {
  const area = nonNeg(v.area);
  const k = area / 1000;
  const pro = Math.max(nonNeg(v.minimumJob), area * nonNeg(v.costPerSqFt));
  return { professionalCost: round2(pro), seedLb: round2(k * nonNeg(v.seedRate, 5)), mulchLb: round2(k * 45), mulchBales50lb: ceil((k * 45) / 50), fertilizerLb: round2(k * 4), tackifierLb: round2(k * 3), waterGallons: round2(area * 0.3), areaSqFt: round2(area), diyMaterialCost: round2(k * nonNeg(v.seedRate, 5) * nonNeg(v.seedPricePerLb) + ceil((k * 45) / 50) * nonNeg(v.mulchBalePrice)) };
};

export const asphalt: CustomCalculator = (v) => {
  const cuFt = areaOf(v) * (nonNeg(v.thickness) / 12) * (1 + nonNeg(v.waste) / 100);
  const tons = (cuFt * nonNeg(v.density, 145)) / 2000;
  const area = areaOf(v);
  const material = tons * nonNeg(v.pricePerTon);
  const installed = area * nonNeg(v.installedPerSqFt);
  return { tons: round2(tons), cubicYards: round2(cuFt / 27), areaSqFt: round2(area), materialCost: round2(material), installedCost: round2(installed), tonsPerSqFt: round2(area ? (tons / area) * 100 : 0), truckLoads: ceil(tons / Math.max(1, nonNeg(v.truckTons, 20))) };
};

export const millings: CustomCalculator = (v) => {
  const compacted = areaOf(v) * (nonNeg(v.depth) / 12);
  const loose = compacted * (1 + nonNeg(v.compaction, 25) / 100);
  const tons = (loose / 27) * nonNeg(v.tonsPerYard, 1.3);
  return { tons: round2(tons), looseCubicYards: round2(loose / 27), compactedCubicYards: round2(compacted / 27), truckLoads: ceil(tons / Math.max(1, nonNeg(v.truckTons, 15))), totalCost: round2(tons * nonNeg(v.pricePerTon) + nonNeg(v.delivery)), costPerSqFt: round2(areaOf(v) ? (tons * nonNeg(v.pricePerTon) + nonNeg(v.delivery)) / areaOf(v) : 0) };
};

export const coldPatch: CustomCalculator = (v) => {
  const holes = Math.max(1, Math.round(nonNeg(v.holes, 1)));
  const cuFt = nonNeg(v.length) * nonNeg(v.width) * (nonNeg(v.depth) / 12) * holes * (1 + nonNeg(v.compaction, 20) / 100);
  const lb = cuFt * 150;
  const bags = ceil(lb / Math.max(1, nonNeg(v.bagWeight, 50)));
  return { bagsNeeded: bags, poundsNeeded: round2(lb), cubicFeet: round2(cuFt), totalCost: round2(bags * nonNeg(v.bagPrice)), sqFtPerBagAt2In: round2((nonNeg(v.bagWeight, 50) / 150 / (2 / 12)) / (1 + nonNeg(v.compaction, 20) / 100)) };
};

export const sealcoat: CustomCalculator = (v) => {
  const area = nonNeg(v.area);
  const coats = Math.max(1, Math.round(nonNeg(v.coats, 2)));
  const gal = (area * coats) / Math.max(1, nonNeg(v.coverage, 80));
  const total = gal * (1 + nonNeg(v.dilution) / 100);
  const sand = gal * nonNeg(v.sandPerGallon);
  return { sealerGallons: round2(gal), mixedGallons: round2(total), pails5Gal: ceil(gal / 5), drums55Gal: round2(gal / 55), sandLb: round2(sand), sandBags50lb: ceil(sand / 50), materialCost: round2(ceil(gal / 5) * nonNeg(v.pailPrice) + ceil(sand / 50) * nonNeg(v.sandBagPrice)), proCost: round2(area * nonNeg(v.proPerSqFt)) };
};

export const DEPTH_UNITS = [1 / 12, 1, 1 / 30.48, 1 / 0.3048]; // in, ft, cm, m → ft
export const LEN_UNITS = [1, 1 / 0.3048, 3]; // ft, m, yd → ft
export const cubicYard: CustomCalculator = (v) => {
  const lu = LEN_UNITS[pick(v.lengthUnit, LEN_UNITS.length)];
  const L = nonNeg(v.length) * lu;
  const W = nonNeg(v.width) * lu;
  const D = nonNeg(v.depth) * DEPTH_UNITS[pick(v.depthUnit, DEPTH_UNITS.length)];
  const area = pick(v.shape, 2) === 1 ? Math.PI * Math.pow(L / 2, 2) : L * W;
  const cuFt = area * D * Math.max(1, nonNeg(v.quantity, 1));
  const yd = cuFt / 27;
  return { cubicYards: round2(yd), cubicFeet: round2(cuFt), cubicMeters: round2(yd * YD3_M3), liters: round2(yd * YD3_M3 * 1000), totalCost: round2(yd * nonNeg(v.pricePerYard)) };
};

/** Bulk material densities in lb per loose cubic yard. */
export const BULK: [string, number][] = [["Gravel", 2800], ["Crushed stone", 2700], ["Sand (dry)", 2700], ["Sand (wet)", 3400], ["Road base", 2900], ["Topsoil", 2200], ["Fill dirt / common earth", 2500], ["Clay", 2900], ["Mulch / wood chips", 800], ["Compost", 1200], ["Riprap", 3000], ["Asphalt (hot mix)", 3900], ["Asphalt millings", 2600], ["Concrete (wet)", 4000], ["Broken concrete", 2400], ["Limestone", 2700], ["Coal", 1500], ["Salt (rock)", 2000]];
export const bulkMaterial: CustomCalculator = (v) => {
  const cuFt = pick(v.mode, 2) === 0 ? nonNeg(v.length) * nonNeg(v.width) * (nonNeg(v.depth) / 12) : nonNeg(v.cubicYards) * 27;
  const yd = cuFt / 27;
  const lb = yd * BULK[pick(v.material, BULK.length)][1];
  const tons = lb / 2000;
  return { tons: round2(tons), pounds: round2(lb), metricTonnes: round2((lb * 0.45359237) / 1000), cubicYards: round2(yd), truckLoads: ceil(tons / Math.max(1, nonNeg(v.truckTons, 15))), totalCost: round2(tons * nonNeg(v.pricePerTon)) };
};

/** Riprap classes: median stone size D50 (in). */
export const RIPRAP: [string, number][] = [["Class I (D50 ≈ 6 in)", 6], ["Class II (D50 ≈ 9 in)", 9], ["Class III (D50 ≈ 12 in)", 12], ["Class IV (D50 ≈ 15 in)", 15], ["Class V (D50 ≈ 18 in)", 18], ["Class VI (D50 ≈ 21 in)", 21]];
export const ripRap: CustomCalculator = (v) => {
  const d50 = RIPRAP[pick(v.riprapClass, RIPRAP.length)][1];
  const t = nonNeg(v.thickness) > 0 ? nonNeg(v.thickness) : 2 * d50;
  const area = nonNeg(v.length) * nonNeg(v.width);
  const yd = (area * (t / 12)) / 27;
  const tons = yd * nonNeg(v.tonsPerYard, 1.5) * (1 + nonNeg(v.waste) / 100);
  return { tons: round2(tons), cubicYards: round2(yd), layerThicknessIn: round2(t), filterFabricSqYd: round2((area / 9) * 1.15), truckLoads: ceil(tons / Math.max(1, nonNeg(v.truckTons, 20))), totalCost: round2(tons * nonNeg(v.pricePerTon)) };
};

export const BRUSH: [string, number][] = [["Light (grass, small saplings)", 800], ["Medium (thick brush, small trees)", 1800], ["Heavy (dense brush, trees to 8 in)", 3500], ["Very heavy / wooded", 5500]];
export const METHOD = [1, 1.15, 0.85]; // forestry mulching, cut & haul, brush hogging
export const brushRemoval: CustomCalculator = (v) => {
  const acres = pick(v.unit, 2) === 0 ? nonNeg(v.size) : nonNeg(v.size) / 43560;
  const per = BRUSH[pick(v.density, BRUSH.length)][1] * METHOD[pick(v.method, METHOD.length)];
  const base = Math.max(nonNeg(v.minimum), acres * per);
  const haul = yes(v.haulAway) ? acres * nonNeg(v.haulPerAcre) : 0;
  const total = base + haul + (yes(v.slope) ? base * 0.2 : 0);
  return { totalCost: round2(total), costPerAcre: round2(acres ? total / acres : 0), acres: round2(acres), clearingCost: round2(base), haulAwayCost: round2(haul), lowEstimate: round2(total * 0.75), highEstimate: round2(total * 1.35) };
};

export const bizLandscapeCustomCalculators: Record<string, CustomCalculator> = {
  "gravel-calculator": gravel,
  "road-base-calculator": roadBase,
  "sand-calculator": sand,
  "topsoil-calculator": topsoil,
  "mulch-calculator": mulch,
  "pine-straw-calculator": pineStraw,
  "excavation-cost-calculator": excavationCost,
  "stump-grinding-cost-calculator": stumpGrinding,
  "hydroseeding-calculator": hydroseeding,
  "asphalt-calculator": asphalt,
  "asphalt-millings-calculator": millings,
  "cold-patch-asphalt-calculator": coldPatch,
  "sealcoat-calculator": sealcoat,
  "cubic-yard-calculator": cubicYard,
  "bulk-material-calculator": bulkMaterial,
  "rip-rap-calculator": ripRap,
  "brush-removal-cost-calculator": brushRemoval,
};
