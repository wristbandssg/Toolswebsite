/**
 * Batch: "House & Garden Calculators" → Gravel, Soil & Landscaping Calculators.
 *
 * Data / methods (US units):
 *  - Bulk densities (tons per loose cu yd, typical supplier figures): topsoil 1.2, black dirt 1.1,
 *    fill dirt 1.3, clay 1.5, compost blend 0.8; river rock 1.35, pea gravel 1.4, decorative gravel
 *    1.4, marble chips 1.5, slate chips 1.3, lava rock 0.5, decomposed granite 1.3, crushed stone 1.4,
 *    sand 1.35. Bagged stone/sand 0.5 cu ft per bag.
 *  - Sod: 16 × 24 in slabs (2.67 sq ft); pallets usually 400–500 sq ft (default 450).
 *  - Artificial turf: rolls 15 or 12 ft wide; infill 1.5–3 lb per sq ft (silica sand); base 3 in of
 *    compacted crushed rock / DG; perimeter nails every 6 in and field nails on a 24 in grid.
 *  - Playground surfacing (CPSC Public Playground Safety Handbook): loose-fill wood chips / engineered
 *    wood fiber 12 in initial depth (compresses to ~9 in); shredded rubber 6 in.
 *  - Flagstone coverage per ton: 1–1.5 in ≈ 140 sq ft, 1.5–2.5 in ≈ 90, 2–3 in ≈ 70.
 *  - Gabion fill ≈ 1.4 tons of 4–8 in stone per cu yd of basket (≈ 35% voids).
 *  - Costs are typical 2026 US prices (editable inputs), not quotes.
 *
 * Self-contained: no imports from any other batch, per this project's established per-batch convention.
 * See prisma/create-hg-land-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

const num = (x: number, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);
const pos = (x: number, d = 0) => Math.max(0, num(x, d));
const pick = (x: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(num(x))));
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;
const ceil = (x: number) => Math.ceil(x - 1e-9);
const spread = (t: number) => ({ costLow: r2(t * 0.8), costHigh: r2(t * 1.25) });

/** Area of a rectangle or circle (shape 1 = circle, length = diameter). */
const area = (v: Record<string, number>) => (pick(v.shape, 2) === 1 ? Math.PI * (pos(v.length) / 2) ** 2 : pos(v.length) * pos(v.width));
const yards = (sqft: number, depthIn: number) => (sqft * depthIn) / 12 / 27;

export const SOIL_TYPES = ["Topsoil", "Black dirt", "Fill dirt", "Clay", "Garden soil / compost blend"];
const SOIL_T = [1.2, 1.1, 1.3, 1.5, 0.8];
export const soilDirt: CustomCalculator = (v) => {
  const a = area(v), yd = yards(a, pos(v.depth, 4));
  return { cubicYards: r2(yd), cubicFeet: r1(yd * 27), tons: r2(yd * SOIL_T[pick(v.soil, SOIL_T.length)]), bags: ceil((yd * 27) / Math.max(0.1, pos(v.bagCuFt, 1))), area: r1(a), cost: r2(yd * pos(v.pricePerYard)) };
};

export const ROCK_TYPES = ["River rock", "Lava rock", "Decorative gravel", "Pea gravel", "Marble chips", "Slate chips", "Drain rock (3/4–1.5 in)"];
const ROCK_T = [1.35, 0.5, 1.4, 1.4, 1.5, 1.3, 1.35];
export const landscapeRock: CustomCalculator = (v) => {
  const a = area(v), yd = yards(a, pos(v.depth, 2)), tons = yd * ROCK_T[pick(v.rock, ROCK_T.length)];
  return { tons: r2(tons), cubicYards: r2(yd), bags: ceil((yd * 27) / 0.5), sqFtPerTon: tons ? Math.round(a / tons) : 0, area: r1(a), cost: r2(tons * pos(v.pricePerTon)) };
};

export const peaGravel: CustomCalculator = (v) => {
  const a = area(v), yd = yards(a, pos(v.depth, 3));
  return { tons: r2(yd * 1.4), cubicYards: r2(yd), bags: ceil((yd * 27) / 0.5), sqFtPerTon: yd ? Math.round(a / (yd * 1.4)) : 0, cost: r2(yd * 1.4 * pos(v.pricePerTon)) };
};

const SOD_PIECE = [2.67, 10, 30];
export const sod: CustomCalculator = (v) => {
  const a = (pos(v.length) * pos(v.width) + pos(v.extraArea)) * (1 + pos(v.waste, 5) / 100);
  const pallets = ceil(a / Math.max(1, pos(v.palletSqFt, 450)));
  return { pieces: ceil(a / SOD_PIECE[pick(v.piece, 3)]), pallets, sqFtToOrder: Math.ceil(a), cost: r2(pallets * pos(v.palletPrice)) };
};

export const fillDirt: CustomCalculator = (v) => {
  const yd = yards(pos(v.length) * pos(v.width), pos(v.depth, 12)) * (1 + pos(v.compaction, 15) / 100);
  return { cubicYards: r2(yd), tons: r2(yd * 1.3), truckLoads: ceil(yd / Math.max(1, pos(v.truckYards, 10))), cost: r2(yd * pos(v.pricePerYard) + ceil(yd / Math.max(1, pos(v.truckYards, 10))) * pos(v.deliveryPerLoad)) };
};

export const sodCost: CustomCalculator = (v) => {
  const a = pos(v.area);
  const mat = a * pos(v.sodPerSqFt, 0.45), prep = a * (pos(v.prepPerSqFt, 0.3) + (pick(v.removeOld, 2) ? 0.5 : 0));
  const pro = mat + prep + a * pos(v.laborPerSqFt, 0.8) + pos(v.delivery, 100);
  const diy = mat + pos(v.delivery, 100) + a * 0.05;
  return { proCost: r2(pro), ...spread(pro), diyCost: r2(diy), proPerSqFt: a ? r2(pro / a) : 0 };
};

export const frenchDrain: CustomCalculator = (v) => {
  const L = pos(v.length), w = pos(v.trenchWidth, 12) / 12, d = pos(v.trenchDepth, 18) / 12, pipe = pos(v.pipeDiameter, 4) / 12;
  const gravelCuFt = L * (w * d - Math.PI * (pipe / 2) ** 2);
  const fabricSqFt = L * (2 * d + 2 * w) * 1.15;
  return { gravelTons: r2((gravelCuFt / 27) * 1.4), gravelCuYd: r2(gravelCuFt / 27), pipeFeet: Math.ceil(L * 1.05), fabricSqFt: Math.ceil(fabricSqFt), cost: r2((gravelCuFt / 27) * 1.4 * pos(v.gravelPerTon) + L * pos(v.pipePerFoot) + fabricSqFt * 0.15) };
};

export const PLAY_SURFACES = ["Engineered wood fiber", "Wood chips", "Shredded rubber mulch", "Pea gravel", "Sand"];
const PLAY_DEPTH = [12, 12, 6, 12, 12];
const PLAY_DENS = [0.3, 0.3, 0.6, 1.4, 1.35]; // tons per cu yd
const PLAY_BAG = [2, 2, 0.8, 0.5, 0.5]; // cu ft per bag
export const playgroundMulch: CustomCalculator = (v) => {
  const s = pick(v.surface, PLAY_DEPTH.length);
  const depth = pos(v.depth) || PLAY_DEPTH[s];
  const yd = yards(pos(v.length) * pos(v.width), depth);
  return { cubicYards: r2(yd), recommendedDepthIn: PLAY_DEPTH[s], bags: ceil((yd * 27) / PLAY_BAG[s]), tons: r2(yd * PLAY_DENS[s]), cost: r2(yd * pos(v.pricePerYard)) };
};

export const GRAVEL_TYPES = ["Pea gravel", "#57 crushed stone", "River rock", "Crusher run", "Decorative gravel", "Decomposed granite"];
const GRAVEL_PRICE = [45, 40, 80, 30, 100, 55];
export const gravelCost: CustomCalculator = (v) => {
  const g = pick(v.gravel, GRAVEL_PRICE.length);
  const tons = yards(pos(v.length) * pos(v.width), pos(v.depth, 3)) * 1.4;
  const material = tons * (pos(v.customPricePerTon) || GRAVEL_PRICE[g]);
  const labor = pos(v.length) * pos(v.width) * pos(v.installPerSqFt);
  const total = material + pos(v.delivery, 100) + labor;
  return { totalCost: r2(total), tons: r2(tons), materialCost: r2(material), laborCost: r2(labor), costPerSqFt: pos(v.length) * pos(v.width) ? r2(total / (pos(v.length) * pos(v.width))) : 0 };
};

export const artificialTurf: CustomCalculator = (v) => {
  const L = pos(v.length), W = pos(v.width), roll = pick(v.rollWidth, 2) === 0 ? 15 : 12;
  const strips = ceil(W / roll);
  const order = strips * roll * (L + 0.5);
  const a = L * W;
  return { turfSqFt: Math.ceil(order), rollLinearFeet: Math.ceil(strips * (L + 0.5)), strips, infillLb: Math.round(a * pos(v.infillPerSqFt, 2)), infillBags: ceil((a * pos(v.infillPerSqFt, 2)) / 50), seamFeet: Math.max(0, strips - 1) * Math.ceil(L), nails: ceil(2 * (L + W) * 2 + a / 4), baseTons: r2(yards(a, 3) * 1.4) };
};

export const decomposedGranite: CustomCalculator = (v) => {
  const a = area(v), yd = yards(a, pos(v.depth, 3)) * 1.15;
  return { tons: r2(yd * 1.3), cubicYards: r2(yd), bags: ceil((yd * 27) / 0.5), stabilizerLb: pick(v.stabilized, 2) ? Math.round(yd * 1.3 * 12) : 0, cost: r2(yd * 1.3 * pos(v.pricePerTon)) };
};

export const TRENCH_USES = ["Irrigation / low-voltage line", "Electrical conduit", "Water or gas line", "French drain"];
const TRENCH_RATE = [5, 8, 10, 12];
export const trenchingCost: CustomCalculator = (v) => {
  const depthF = Math.max(1, pos(v.depth, 24) / 24);
  const soil = [1, 1.2, 1.5][pick(v.soil, 3)];
  const total = Math.max(300, pos(v.length) * TRENCH_RATE[pick(v.use, 4)] * depthF * soil);
  const days = ceil(pos(v.length) / 300);
  return { totalCost: r2(total), ...spread(total), diyRentalCost: r2(days * pos(v.rentalPerDay, 150)), costPerFoot: pos(v.length) ? r2(total / pos(v.length)) : 0 };
};

export const GRADING_TYPES = ["Fine grading / leveling", "Rough grading", "Regrading for drainage or a slope"];
const GRADE_RATE = [0.5, 1, 2];
export const landGradingCost: CustomCalculator = (v) => {
  const total = pos(v.area) * GRADE_RATE[pick(v.grading, 3)] + pos(v.fillYards) * pos(v.fillPerYard, 25) + pos(v.mobilization, 300);
  return { totalCost: r2(total), ...spread(total), costPerSqFt: pos(v.area) ? r2(total / pos(v.area)) : 0 };
};

export const FRENCH_TYPES = ["Exterior, shallow (yard)", "Exterior, along the foundation", "Interior basement drain"];
const FRENCH_RATE = [25, 45, 70];
export const frenchDrainCost: CustomCalculator = (v) => {
  const total = pos(v.length) * (pos(v.customRate) || FRENCH_RATE[pick(v.type, 3)]) + (pick(v.sumpPump, 2) ? 1500 : 0);
  return { totalCost: r2(total), ...spread(total), diyMaterialCost: r2(pos(v.length) * 6), costPerFoot: pos(v.length) ? r2(total / pos(v.length)) : 0 };
};

export const mulchInstallationCost: CustomCalculator = (v) => {
  const yd = yards(pos(v.area), pos(v.depth, 3));
  const material = yd * pos(v.pricePerYard, 40), labor = yd * pos(v.laborPerYard, 50), edging = pos(v.edgingFeet) * 2;
  const total = material + labor + pos(v.delivery, 75) + edging;
  return { totalCost: r2(total), cubicYards: r2(yd), materialCost: r2(material), laborCost: r2(labor + edging) };
};

const FLAG_COV = [140, 90, 70];
export const flagstone: CustomCalculator = (v) => {
  const a = pos(v.area) * (1 + pos(v.waste, 10) / 100);
  const tons = a / FLAG_COV[pick(v.thickness, 3)];
  return { tons: r2(tons), sqFtPerTon: FLAG_COV[pick(v.thickness, 3)], baseTons: r2(yards(pos(v.area), 4) * 1.4 * 1.2), sandTons: r2(yards(pos(v.area), 1) * 1.35), cost: r2(tons * pos(v.pricePerTon)) };
};

export const gabion: CustomCalculator = (v) => {
  const vol = pos(v.length) * pos(v.height) * pos(v.depth, 3);
  const basket = pos(v.basketLength, 6) * pos(v.basketHeight, 3) * pos(v.basketDepth, 3);
  const baskets = basket ? ceil(vol / basket) : 0;
  const tons = (vol / 27) * 1.4;
  return { stoneTons: r2(tons), baskets, cubicYards: r2(vol / 27), cost: r2(tons * pos(v.stonePerTon) + baskets * pos(v.basketPrice)) };
};

export const sandboxSand: CustomCalculator = (v) => {
  const cuFt = area(v) * (pos(v.depth, 9) / 12);
  return { bags: ceil(cuFt / 0.5), cubicFeet: r1(cuFt), tons: r2((cuFt / 27) * 1.35), pounds: Math.round(cuFt * 100) };
};

export const backfill: CustomCalculator = (v) => {
  const dig = pos(v.digLength) * pos(v.digWidth) * pos(v.digDepth);
  const struct = pos(v.structLength) * pos(v.structWidth) * pos(v.structHeight);
  const yd = (Math.max(0, dig - struct) / 27) * (1 + pos(v.compaction, 20) / 100);
  return { cubicYards: r2(yd), tons: r2(yd * (pick(v.material, 2) ? 1.4 : 1.3)), truckLoads: ceil(yd / 10) };
};

const FABRIC_ROLLS: [number, number][] = [[3, 50], [4, 100], [6, 100], [3, 100]];
export const landscapeFabric: CustomCalculator = (v) => {
  const [rw, rl] = FABRIC_ROLLS[pick(v.roll, FABRIC_ROLLS.length)];
  const L = pos(v.length), W = pos(v.width), lap = pos(v.overlap, 6) / 12;
  const strips = rw > lap ? ceil((W - lap) / (rw - lap)) : 1;
  const feet = strips * (L + 1);
  return { rolls: ceil(feet / rl), strips, linearFeet: Math.ceil(feet), staples: ceil((L * W) / 3 + 2 * (L + W)) };
};

export const hgLandCustomCalculators: Record<string, CustomCalculator> = {
  "soil-dirt-calculator": soilDirt,
  "landscape-rock-calculator": landscapeRock,
  "pea-gravel-calculator": peaGravel,
  "sod-calculator": sod,
  "fill-dirt-calculator": fillDirt,
  "sod-cost-calculator": sodCost,
  "french-drain-calculator": frenchDrain,
  "playground-mulch-calculator": playgroundMulch,
  "gravel-cost-calculator": gravelCost,
  "artificial-turf-calculator": artificialTurf,
  "decomposed-granite-calculator": decomposedGranite,
  "trenching-cost-calculator": trenchingCost,
  "land-grading-cost-calculator": landGradingCost,
  "french-drain-cost-calculator": frenchDrainCost,
  "mulch-installation-cost-calculator": mulchInstallationCost,
  "flagstone-calculator": flagstone,
  "gabion-calculator": gabion,
  "sandbox-sand-calculator": sandboxSand,
  "backfill-calculator": backfill,
  "landscape-fabric-calculator": landscapeFabric,
};
