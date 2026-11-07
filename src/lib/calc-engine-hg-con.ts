/**
 * Batch: "House & Garden Calculators" → Concrete, Masonry & Paving Calculators.
 *
 * Data / methods (US units unless the tool is metric):
 *  - Paver base (crushed gravel) ≈ 1.4 tons per loose cu yd; bedding/joint sand ≈ 1.35 tons per cu yd;
 *    compaction allowance 15–20%. Polymeric sand ≈ 90 lb per cu ft of joint volume (bags of 50 lb).
 *  - Retaining wall: courses = ceil(height ÷ block height) + one buried course; 1 ft of drainage
 *    gravel behind the wall for its full height; perforated drain pipe the length of the wall.
 *  - Concrete ≈ 145 lb per cu ft (demolition debris); bagged concrete yields 0.375 / 0.45 / 0.60 cu ft
 *    per 40 / 60 / 80 lb bag (Quikrete / Sakrete data sheets); premixed stucco ≈ 0.83 cu ft per 80 lb.
 *  - Welded wire mesh weights (WRI / ASTM A1064 tables): 6×6-W1.4×W1.4 21 lb, 6×6-W2.1×W2.1 30 lb,
 *    6×6-W2.9×W2.9 42 lb, 6×6-W4.0×W4.0 58 lb, 4×4-W1.4×W1.4 31 lb, 4×4-W2.9×W2.9 62 lb per 100 sq ft.
 *  - Footings: bottom at or below the local frost depth and at least 12 in below grade (IRC R403.1.4);
 *    minimum footing widths for light-frame houses by stories and soil bearing follow the pattern of
 *    IRC Table R403.1(1) (simplified). Footings at least 6 in thick.
 *  - Screed (UK): sand & cement 1:4 at ~2.1 t/m³ (dry materials ≈ 1.3 × wet volume); liquid anhydrite
 *    ~2.0 t/m³. Drying rule of thumb: 1 mm per day to 40 mm, then 0.5 mm per day beyond.
 *  - Patio slabs (UK): MOT Type 1 sub-base ≈ 2.1 t/m³ compacted; full mortar bed 4:1 sharp sand : cement,
 *    cement in 25 kg bags (≈ 1,440 kg/m³ loose), sharp sand ≈ 1.6 t/m³.
 *  - Tar and chip: ~25 lb of 3/8" chip and ~0.35 gal of emulsion per sq yd per layer.
 *  - Stone veneer: each linear ft of corner covers ≈ 0.75 sq ft of wall; Type S mortar for scratch
 *    + setting coats ≈ one 80 lb bag per 25 sq ft; 2.5 lb metal lath sheets cover ≈ 18 sq ft.
 *  - Cost figures are typical 2026 US installed prices (editable inputs), not quotes.
 *
 * Self-contained: no imports from any other batch, per this project's established per-batch convention.
 * See prisma/create-hg-con-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

const num = (x: number, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);
const pos = (x: number, d = 0) => Math.max(0, num(x, d));
const pick = (x: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(num(x))));
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;
const ceil = (x: number) => Math.ceil(x - 1e-9);

/** Low / typical / high spread used by the cost tools. */
const spread = (total: number) => ({ costLow: r2(total * 0.8), costHigh: r2(total * 1.25) });

// ---------- Pavers & patios ----------
export const paver: CustomCalculator = (v) => {
  const area = pos(v.length) * pos(v.width);
  const pl = pos(v.paverLength, 8) + pos(v.joint), pw = pos(v.paverWidth, 4) + pos(v.joint);
  const perSqFt = 144 / (pl * pw);
  const pavers = ceil(area * perSqFt * (1 + pos(v.waste) / 100));
  const baseYd = (area * pos(v.baseDepth, 4)) / 12 / 27 * 1.2;
  const sandYd = (area * pos(v.sandDepth, 1)) / 12 / 27;
  return {
    pavers, area: r2(area), paversPerSqFt: r2(perSqFt),
    baseCuYd: r2(baseYd), baseTons: r2(baseYd * 1.4), sandCuYd: r2(sandYd), sandTons: r2(sandYd * 1.35),
    edgeFeet: r2(2 * (pos(v.length) + pos(v.width))), paverCost: r2(pavers * pos(v.pricePerPaver)),
  };
};

export const paverBase: CustomCalculator = (v) => {
  const area = pos(v.length) * pos(v.width);
  const loose = (area * pos(v.depth, 6)) / 12 / 27 * (1 + pos(v.compaction, 20) / 100);
  return { baseTons: r2(loose * 1.4), baseCuYd: r2(loose), area: r2(area), bags50lb: ceil((loose * 1.4 * 2000) / 50), cost: r2(loose * 1.4 * pos(v.pricePerTon)) };
};

export const polymericSand: CustomCalculator = (v) => {
  const area = pos(v.area);
  const jointFtPerSqFt = 12 / pos(v.paverLength, 8) + 12 / pos(v.paverWidth, 4);
  const cuIn = area * jointFtPerSqFt * 12 * pos(v.jointWidth, 0.25) * pos(v.jointDepth, 2.375);
  const lb = (cuIn / 1728) * 90 * 1.1;
  return { bags: ceil(lb / pos(v.bagWeight, 50)), pounds: r1(lb), jointLinearFeet: r1(area * jointFtPerSqFt), sqFtPerBag: r1(area / Math.max(1e-9, lb / pos(v.bagWeight, 50))) };
};

export const patioSlab: CustomCalculator = (v) => {
  const SIZES: [number, number][] = [[600, 600], [600, 900], [450, 450], [300, 600], [900, 900], [400, 400]];
  const [a, b] = SIZES[pick(v.slabSize, SIZES.length)];
  const area = pos(v.length) * pos(v.width);
  const j = pos(v.joint, 10);
  const slabs = ceil((area / (((a + j) / 1000) * ((b + j) / 1000))) * (1 + pos(v.waste, 5) / 100));
  const subBase = area * (pos(v.subBaseDepth, 100) / 1000) * 2.1;
  const bed = area * (pos(v.beddingDepth, 40) / 1000);
  // 4:1 mix: 0.8 of the bed volume is sand, 0.2 cement (dry volumes ≈ 1.3 × wet).
  const sandT = bed * 1.3 * 0.8 * 1.6, cementKg = bed * 1.3 * 0.2 * 1440;
  return { slabs, area: r2(area), subBaseTonnes: r2(subBase), sharpSandTonnes: r2(sandT), cementBags: ceil(cementKg / 25) };
};

export const patioSize: CustomCalculator = (v) => {
  const TABLE = [0, 100, 144, 196]; // none / 4-seat / 6-seat / 8-seat dining zone (sq ft)
  const LOUNGE = [0, 80, 140];
  let area = TABLE[pick(v.dining, 4)] + LOUNGE[pick(v.lounge, 3)] + (pos(v.grill) ? 40 : 0) + (pos(v.firePit) ? 150 : 0) + (pos(v.hotTub) ? 90 : 0);
  area = Math.max(area, pos(v.people, 4) * 25);
  const depth = Math.max(10, Math.round(Math.sqrt(area / 1.5)));
  const fall = pos(v.patioDepth, depth) * pos(v.slopePerFoot, 0.25);
  return { recommendedArea: Math.round(area), suggestedDepthFt: depth, suggestedWidthFt: Math.ceil(area / depth), slopeDropInches: r2(fall) };
};

// ---------- Concrete ----------
const BAG_CUFT = [0.375, 0.45, 0.6]; // 40 / 60 / 80 lb
export const dryPourConcrete: CustomCalculator = (v) => {
  const d = pos(v.holeDiameter, 10) / 12, depth = pos(v.holeDepth, 36) / 12, post = pos(v.postSize, 3.5) / 12;
  const perHole = Math.PI * (d / 2) ** 2 * depth - post * post * depth;
  const holes = pos(v.holes, 1);
  const slab = (pos(v.slabArea) * pos(v.slabThickness, 4)) / 12;
  const cuFt = (Math.max(0, perHole) * holes + slab) * 1.1;
  const bag = BAG_CUFT[pick(v.bagSize, 3)];
  const bags = ceil(cuFt / bag);
  return { bags, cubicFeet: r2(cuFt), bagsPerHole: holes ? r2((Math.max(0, perHole) * 1.1) / bag) : 0, waterGallons: r1(bags * bag * 1.3) };
};

export const concreteCountertop: CustomCalculator = (v) => {
  const top = (pos(v.length) * pos(v.depth) * pos(v.thickness, 1.5)) - pos(v.cutout);
  const splash = pos(v.length) * pos(v.splashHeight) * pos(v.splashThickness, 0.75);
  const cuFt = ((top + splash) / 1728) * 1.1;
  const sqFt = (pos(v.length) * pos(v.depth)) / 144;
  const bags = ceil(cuFt / 0.6);
  return { bags, cubicFeet: r2(cuFt), weightLb: Math.round(cuFt * 150 / 1.1), sqFt: r2(sqFt), diyMaterialCost: r2(bags * pos(v.bagPrice) + sqFt * 6), proCost: r2(sqFt * pos(v.proPerSqFt)) };
};

export const THICKNESS_USES = ["Sidewalk or patio", "Shed, AC or hot tub pad", "Driveway (cars)", "Garage floor", "RV / heavy truck parking", "Basement floor"];
const THICK = [4, 4, 5, 5, 7, 4];
export const THICKNESS_NOTES = [
  "4 in — wire mesh or fiber optional; 3/4 in control joints every 8–10 ft",
  "4 in (6 in for large hot tubs) — wire mesh; check the equipment's pad spec",
  "5 in (4 in minimum) — #3 rebar at 18 in or mesh; joints every 10 ft",
  "5 in (4 in minimum) — #3 rebar at 18–24 in; slope to the door",
  "6–8 in — #4 rebar at 12–16 in on a 6 in compacted base",
  "4 in — vapor barrier under the slab; mesh or fiber",
];
export const concreteThickness: CustomCalculator = (v) => {
  const u = pick(v.use, THICK.length);
  const t = THICK[u], area = pos(v.area);
  const yd = (area * t) / 12 / 27;
  return { recommendation: u, thicknessInches: t, cubicYards: r2(yd), extraYardsPerInch: r2(area / 12 / 27) };
};

export const anchorEpoxy: CustomCalculator = (v) => {
  const D = pos(v.holeDiameter, 0.625), d = pos(v.anchorDiameter, 0.5);
  const perHole = (Math.PI / 4) * Math.max(0, D * D - d * d) * pos(v.embed, 4.5);
  const total = perHole * pos(v.holes, 1) * (1 + pos(v.waste, 15) / 100);
  const cart = pos(v.cartridgeOz, 10) * 1.805;
  return { cartridges: ceil(total / cart), cubicInches: r2(total), cubicInchesPerHole: r2(perHole), holesPerCartridge: perHole ? Math.floor(cart / (perHole * (1 + pos(v.waste, 15) / 100))) : 0 };
};

export const WIRE_MESH = ["6×6 W1.4×W1.4 (10 ga)", "6×6 W2.1×W2.1 (8 ga)", "6×6 W2.9×W2.9 (6 ga)", "6×6 W4.0×W4.0 (4 ga)", "4×4 W1.4×W1.4 (10 ga)", "4×4 W2.9×W2.9 (6 ga)"];
const MESH_LB = [21, 30, 42, 58, 31, 62];
export const wireMesh: CustomCalculator = (v) => {
  const area = pos(v.length) * pos(v.width);
  const withLap = area * 1.1; // one 6 in square of overlap at the laps
  const sheet = pick(v.format, 2) === 0 ? 50 : 750;
  return { pieces: ceil(withLap / sheet), weightLb: Math.round((withLap * MESH_LB[pick(v.mesh, MESH_LB.length)]) / 100), area: r2(area), areaWithOverlap: r2(withLap) };
};

export const FORM_TYPES = ["Slab edge (one side)", "Wall (both sides)", "Footing (both sides)", "Square column (4 sides)"];
export const concreteForm: CustomCalculator = (v) => {
  const t = pick(v.type, 4);
  const L = pos(v.length), h = pos(v.height, 6) / 12;
  const sides = [1, 2, 2, 4][t];
  const contact = t === 3 ? 4 * (pos(v.columnSide, 12) / 12) * L * pos(v.count, 1) : L * h * sides;
  const boards = t === 0 || t === 2 ? ceil((h * 12) / 5.5) * L * sides : 0;
  return { contactSqFt: r2(contact), boardFeet2x6: r2(boards), stakes: t === 3 ? 0 : ceil(L / 3 + 1) * (sides > 1 ? 2 : 1), plywoodSheets: t === 1 || t === 3 ? ceil(contact / 32) : 0, formOilGallons: r2(contact / 450) };
};

export const sealerUse = ["Acrylic, solvent-based", "Acrylic, water-based", "Penetrating silane / siloxane", "Epoxy or urethane"];
const SEALER_COV = [250, 300, 150, 250];
export const concreteSealer: CustomCalculator = (v) => {
  const gal = (pos(v.area) * Math.max(1, pos(v.coats, 2))) / SEALER_COV[pick(v.sealer, 4)] * 1.05;
  const cont = ceil(gal / Math.max(0.25, pos(v.containerGallons, 5)));
  return { gallons: r2(gal), containers: cont, cost: r2(cont * pos(v.containerPrice)) };
};

// ---------- Walls & masonry ----------
export const retainingWall: CustomCalculator = (v) => {
  const L = pos(v.length), H = pos(v.height, 3);
  const bl = pos(v.blockLength, 16), bh = pos(v.blockHeight, 6);
  const courses = ceil((H * 12) / bh) + pos(v.buried, 1);
  const perCourse = ceil((L * 12) / bl);
  const blocks = ceil(courses * perCourse * 1.05);
  const caps = ceil(((L * 12) / pos(v.capLength, 16)) * 1.05);
  const gravel = (L * (H + (pos(v.buried, 1) * bh) / 12) * pos(v.gravelDepth, 1)) / 27;
  return { blocks, courses, blocksPerCourse: perCourse, caps, gravelCuYd: r2(gravel + (L * 1 * 0.5) / 27), drainPipeFeet: Math.ceil(L), cost: r2(blocks * pos(v.blockPrice) + caps * pos(v.capPrice)) };
};

export const STONE_TYPES = ["Fieldstone (dry stack)", "Flat ledgestone / flagstone", "Cut / dressed stone"];
const STONE_SOLID = [0.7, 0.8, 0.9];
export const stoneWall: CustomCalculator = (v) => {
  const vol = pos(v.length) * pos(v.height) * pos(v.thickness, 1.5);
  const tons = (vol * STONE_SOLID[pick(v.stone, 3)] * 165) / 2000 * 1.1;
  const mortared = pos(v.mortared) > 0;
  return { tons: r2(tons), wallCubicFeet: r2(vol), faceSqFt: r2(pos(v.length) * pos(v.height)), mortarBags: mortared ? ceil((vol * 0.2) / 0.6) : 0, cost: r2(tons * pos(v.pricePerTon)) };
};

export const stoneVeneer: CustomCalculator = (v) => {
  const corners = pos(v.cornerFeet);
  const flats = Math.max(0, pos(v.wallArea) - pos(v.openings) - corners * 0.75) * 1.1;
  const total = flats + corners * 0.75;
  return { flatSqFt: r2(flats), flatBoxes: ceil(flats / pos(v.flatBox, 10)), cornerBoxes: ceil((corners * 1.05) / pos(v.cornerBox, 8)), mortarBags: ceil(total / 25), lathSheets: ceil(total / 18) };
};

export const STUCCO_SYSTEMS = ["Traditional 3-coat (7/8 in)", "One-coat (3/8 in)", "Finish coat only (1/8 in)"];
const STUCCO_T = [0.875, 0.375, 0.125];
export const stucco: CustomCalculator = (v) => {
  const s = pick(v.system, 3);
  const area = Math.max(0, pos(v.wallArea) - pos(v.openings));
  const cuFt = (area * STUCCO_T[s]) / 12 * 1.1;
  return { bags: ceil(cuFt / 0.83), netArea: r2(area), cubicFeet: r2(cuFt), lathSheets: s < 2 ? ceil(area / 18) : 0 };
};

// ---------- Footings & lintels ----------
const FOOT_W = [[12, 15, 23], [12, 12, 17], [12, 12, 12]]; // soil 1,500 / 2,000 / 3,000 psf × 1–3 stories
export const foundationDepth: CustomCalculator = (v) => {
  const frost = pos(v.frostDepth, 36);
  const type = pick(v.building, 3);
  const depth = Math.max(12, frost + (type === 2 ? 0 : 0));
  const width = type === 2 ? 8 : FOOT_W[pick(v.soil, 3)][pick(v.stories, 3)];
  return { footingDepthIn: depth, footingDepthMm: Math.round(depth * 25.4), footingWidthIn: width, footingThicknessIn: type === 2 ? 6 : Math.max(6, Math.round(width / 2)) };
};

export const LINTEL_SIZES = ["65 mm deep (100 × 65) — light loads, short spans", "140 mm deep (100 × 140)", "215 mm deep (100 × 215)", "Steel or engineered lintel — get a structural design"];
export const lintel: CustomCalculator = (v) => {
  const open = pos(v.opening, 900);
  const bearing = open > 1500 ? 150 : 100;
  const len = open + 2 * Math.max(bearing, 150);
  const load = pick(v.load, 3);
  let size = open <= 1200 && load === 0 ? 0 : open <= 2100 && load < 2 ? 1 : open <= 3000 && load < 2 ? 2 : 3;
  if (load === 2 && open <= 1200) size = 1;
  const stock = Math.ceil(len / 150) * 150;
  return { lintelSize: size, lintelLengthMm: len, stockLengthMm: stock, bearingEachEndMm: Math.max(bearing, 150) };
};

// ---------- Driveways ----------
export const DRIVEWAY_MATERIALS = ["Asphalt", "Concrete", "Gravel", "Pavers", "Stamped concrete", "Resin-bound", "Tar and chip", "Heated concrete"];
const DRIVE_RATE = [5, 10, 2, 25, 16, 12, 4, 30];
export const drivewayCost: CustomCalculator = (v) => {
  const area = pos(v.length) * pos(v.width);
  const m = pick(v.material, DRIVE_RATE.length);
  const rate = pos(v.customRate) || DRIVE_RATE[m];
  const total = area * rate + area * (pick(v.removal, 2) ? 2 : 0) + area * pos(v.sitePrep, 1);
  return { totalCost: r2(total), ...spread(total), area: r2(area), costPerSqFt: area ? r2(total / area) : 0 };
};

export const drivewaySealingCost: CustomCalculator = (v) => {
  const area = pos(v.area), coats = Math.max(1, pos(v.coats, 2));
  const crack = pos(v.crackFeet) * 1.5;
  const pails = ceil((area * coats) / 80 / 4.75);
  const diy = pails * pos(v.pailPrice, 30) + crack * 0.4;
  const pro = Math.max(150, area * pos(v.proRate, 0.25) * coats) + crack;
  return { proCost: r2(pro), diyCost: r2(diy), pails, savings: r2(pro - diy) };
};

export const tarAndChip: CustomCalculator = (v) => {
  const sqYd = pos(v.area) / 9, layers = pick(v.layers, 2) + 1;
  const stoneTons = (sqYd * 25 * layers) / 2000;
  return { cost: r2(pos(v.area) * (layers === 1 ? pos(v.rate1, 2.5) : pos(v.rate2, 4))), stoneTons: r2(stoneTons), emulsionGallons: r1(sqYd * 0.35 * layers), baseTons: r2(((pos(v.area) * pos(v.baseDepth)) / 12 / 27) * 1.4) };
};

// ---------- Repair & finishing costs ----------
export const FOUNDATION_REPAIRS = ["Crack sealing (per crack)", "Steel / helical piers (per pier)", "Slabjacking / foam leveling (per sq ft)", "Wall anchors or braces (per anchor)", "Foundation replacement (per sq ft)"];
const FOUND_RATE = [500, 1500, 10, 700, 60];
export const foundationRepairCost: CustomCalculator = (v) => {
  const rate = pos(v.customRate) || FOUND_RATE[pick(v.repair, FOUND_RATE.length)];
  const total = pos(v.quantity, 1) * rate + pos(v.engineer, 600) + pos(v.permit);
  return { totalCost: r2(total), ...spread(total), unitCost: rate };
};

export const WALL_TYPES = ["Concrete block (CMU)", "Split-face block", "Brick", "Natural stone", "Poured concrete"];
const WALL_RATE = [16, 22, 25, 40, 30];
export const blockWallCost: CustomCalculator = (v) => {
  const face = pos(v.length) * pos(v.height);
  const rate = pos(v.customRate) || WALL_RATE[pick(v.wall, WALL_RATE.length)];
  const total = face * rate + pos(v.length) * pos(v.footingPerFoot, 25) + (pos(v.stucco) ? face * 7 : 0);
  return { totalCost: r2(total), ...spread(total), faceSqFt: r2(face), costPerSqFt: face ? r2(total / face) : 0 };
};

const STORY = [1, 1.2, 1.4];
export const tuckpointingCost: CustomCalculator = (v) => {
  const area = pos(v.area) * (pos(v.repairShare, 100) / 100);
  const total = area * pos(v.rate, 12) * STORY[pick(v.stories, 3)];
  return { totalCost: r2(total), ...spread(total), sqFtRepointed: r2(area) };
};

export const concreteDemolitionCost: CustomCalculator = (v) => {
  const tons = (pos(v.area) * (pos(v.thickness, 4) / 12) * 145) / 2000;
  const rate = pos(v.rate, 4) * (pick(v.reinforced, 2) ? 1.25 : 1);
  const total = pos(v.area) * rate + tons * pos(v.disposalPerTon, 50);
  return { totalCost: r2(total), ...spread(total), debrisTons: r2(tons), truckLoads: ceil(tons / 10) };
};

export const STUCCO_JOBS = ["New 3-coat stucco", "New one-coat stucco", "Patch / repair", "Remove and replace"];
const STUCCO_RATE = [9, 7, 20, 14];
export const stuccoCost: CustomCalculator = (v) => {
  const rate = pos(v.customRate) || STUCCO_RATE[pick(v.job, 4)];
  const total = Math.max(300, pos(v.area) * rate * STORY[pick(v.stories, 3)]);
  return { totalCost: r2(total), ...spread(total), costPerSqFt: pos(v.area) ? r2(total / pos(v.area)) : 0 };
};

export const RESURFACE_METHODS = ["Resurfacer / skim coat", "Microtopping", "Stamped overlay", "Epoxy coating", "Grind and polish"];
const RESURF_RATE = [4, 8, 12, 6, 5];
export const concreteResurfacingCost: CustomCalculator = (v) => {
  const total = pos(v.area) * (pos(v.customRate) || RESURF_RATE[pick(v.method, 5)]) + pos(v.crackFeet) * 3;
  return { totalCost: r2(total), ...spread(total), costPerSqFt: pos(v.area) ? r2(total / pos(v.area)) : 0 };
};

export const SCREED_TYPES = ["Sand & cement (1:4)", "Liquid anhydrite", "Fast-drying sand & cement"];
export const screed: CustomCalculator = (v) => {
  const t = pick(v.type, 3);
  const vol = pos(v.area) * (pos(v.depth, 65) / 1000);
  const dens = t === 1 ? 2.0 : 2.1;
  const dry = vol * 1.3;
  const mm = pos(v.depth, 65);
  const days = t === 2 ? Math.max(1, Math.round(mm / 10)) : Math.round(Math.min(mm, 40) + Math.max(0, mm - 40) * 2);
  return { volumeM3: r2(vol), tonnes: r2(vol * dens), sandTonnes: t === 1 ? 0 : r2(dry * 0.8 * 1.6), cementBags: t === 1 ? 0 : ceil((dry * 0.2 * 1440) / 25), dryingDays: days };
};

export const hgConCustomCalculators: Record<string, CustomCalculator> = {
  "paver-calculator": paver,
  "paver-base-calculator": paverBase,
  "polymeric-sand-calculator": polymericSand,
  "patio-slab-calculator": patioSlab,
  "patio-size-calculator": patioSize,
  "dry-pour-concrete-calculator": dryPourConcrete,
  "concrete-countertop-calculator": concreteCountertop,
  "concrete-thickness-calculator": concreteThickness,
  "anchor-epoxy-calculator": anchorEpoxy,
  "wire-mesh-calculator": wireMesh,
  "concrete-form-calculator": concreteForm,
  "concrete-sealer-calculator": concreteSealer,
  "retaining-wall-calculator": retainingWall,
  "stone-wall-calculator": stoneWall,
  "stone-veneer-calculator": stoneVeneer,
  "stucco-calculator": stucco,
  "foundation-depth-calculator": foundationDepth,
  "lintel-calculator": lintel,
  "driveway-cost-calculator": drivewayCost,
  "driveway-sealing-cost-calculator": drivewaySealingCost,
  "tar-and-chip-calculator": tarAndChip,
  "foundation-repair-cost-calculator": foundationRepairCost,
  "block-wall-cost-calculator": blockWallCost,
  "tuckpointing-cost-calculator": tuckpointingCost,
  "concrete-demolition-cost-calculator": concreteDemolitionCost,
  "stucco-cost-calculator": stuccoCost,
  "concrete-resurfacing-cost-calculator": concreteResurfacingCost,
  "screed-calculator": screed,
};
