/**
 * Batch: "House & Garden Calculators" → Lawn, Garden & Tree Calculators.
 *
 * Data / methods:
 *  - VPD: saturation vapour pressure (Tetens) es = 0.6108·exp(17.27T/(T+237.3)) kPa, T in °C;
 *    leaf VPD uses the leaf temperature for es and the air's actual vapour pressure.
 *  - Grass seed rates (lb per 1,000 sq ft, new lawn / overseeding; extension-service ranges):
 *    tall fescue 8/4, Kentucky bluegrass 3/1.5, perennial ryegrass 8/4, fine fescue 5/2.5,
 *    Bermuda (hulled) 2/1, Zoysia 1.5/1, centipede 0.5/0.25, Bahia 8/4.
 *  - Compost C:N: mixture C:N = Σ(m·N·CN) ÷ Σ(m·N) using typical as-received C:N and N%
 *    (grass 20:1 / 2.4%, food scraps 15:1 / 2.5%, coffee grounds 20:1 / 2%, cow manure 20:1 / 1.7%,
 *    chicken manure 7:1 / 3.5%, dry leaves 60:1 / 0.9%, straw 80:1 / 0.6%, wood chips 400:1 / 0.1%,
 *    cardboard 350:1 / 0.15%, newspaper 175:1 / 0.3%). Target ≈ 25–35:1.
 *  - Firewood: 1 full cord = 128 cu ft (4 × 4 × 8 ft); face cord = 4 × 8 ft × log length.
 *    Seasoned weights per cord: red oak 3,600 lb, white oak 4,200, sugar maple 3,700, ash 3,500,
 *    birch 3,000, cherry 2,900, pine 2,200, poplar 2,100.
 *  - Tree age = diameter at breast height (in) × species growth factor (ISA / Morton Arboretum table).
 *  - Raised bed mixes: 60% topsoil / 30% compost / 10% potting mix, or Mel's Mix (1/3 compost, 1/3 peat
 *    or coir, 1/3 coarse vermiculite). 1 cu ft = 25.7 dry quarts.
 *  - Frost dates by USDA hardiness zone are rough averages; use your local date for planning.
 *  - Day length: solar declination δ = 23.44°·sin(360/365·(284 + day)); ω0 = acos(−tanφ·tanδ).
 *  - Greenhouse heat loss Q = A·U·ΔT (U in BTU/hr·sq ft·°F: single glass 1.13, single poly 1.15,
 *    double poly 0.70, twin-wall polycarbonate 0.65) + 10% infiltration; propane 91,500 BTU/gal.
 *  - Giant pumpkin weight from the Over-The-Top (OTT) measurement uses the regression behind the
 *    2019 growers' OTT chart (approximate; real weights often run ±10–25%).
 *  - Garden hose flow: Hazen–Williams (C = 140) with 10 psi left at the outlet.
 *  - Root protection area (BS 5837:2012): radius = 12 × stem diameter at 1.5 m; 2–5 stems combine as
 *    √(Σd²); more than 5 stems √(mean d² × n); area capped at 707 m².
 *  - Tree value: simplified trunk formula (CTLA approach) — unit price × trunk cross-section ×
 *    species × condition × location ratings.
 *  - Hammock: sag below the hang points ≈ √((length/2)² − (ridgeline/2)²) with the ridgeline at 83% of
 *    the hammock length; force per strap = weight ÷ (2 sin θ).
 *  - Greenhouse ventilation: ~8 cfm per sq ft of floor (one air change a minute), × elevation factor;
 *    inlet area ≈ total cfm ÷ 400 fpm.
 *
 * Self-contained: no imports from any other batch, per this project's established per-batch convention.
 * See prisma/create-hg-gard-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

const num = (x: number, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);
const pos = (x: number, d = 0) => Math.max(0, num(x, d));
const pick = (x: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(num(x))));
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;
const ceil = (x: number) => Math.ceil(x - 1e-9);
const spread = (t: number) => ({ costLow: r2(t * 0.8), costHigh: r2(t * 1.3) });
const RAD = Math.PI / 180;
/** Day number (days since 1970-01-01 UTC) for a calendar date (month 1–12). */
const dayNum = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 864e5;
const yearOf = (day: number) => new Date(day * 864e5).getUTCFullYear();
const dayOfYear = (day: number) => Math.floor(day - dayNum(yearOf(day), 1, 1)) + 1;

// ---------- Tree & yard services ----------
export const TREE_TYPES = ["Deciduous / shade tree", "Pine or other conifer", "Palm"];
export const treeRemovalCost: CustomCalculator = (v) => {
  const h = pos(v.height, 40);
  let base = h < 30 ? 400 : h < 60 ? 900 : h < 80 ? 1500 : 2200;
  base *= [1, 1, 0.8][pick(v.type, 3)] * [1, 1.5, 0.7][pick(v.location, 3)] * Math.max(1, pos(v.diameter, 18) / 24);
  const stump = pick(v.stump, 2) ? Math.max(100, pos(v.diameter, 18) * 3) : 0;
  const total = (base + stump + (pick(v.haul, 2) ? 150 : 0)) * Math.max(1, pos(v.trees, 1));
  return { totalCost: r2(total), ...spread(total), stumpCost: r2(stump), perTree: r2(total / Math.max(1, pos(v.trees, 1))) };
};

export const treeTrimmingCost: CustomCalculator = (v) => {
  const rate = [300, 600, 1200][pick(v.size, 3)] * [1, 0.6][pick(v.palm, 2)];
  const total = pos(v.trees) * rate + pos(v.hedgeFeet) * 3 + pos(v.shrubs) * 60;
  return { totalCost: r2(Math.max(total, total ? 150 : 0)), ...spread(total), treeCost: r2(pos(v.trees) * rate) };
};

export const treePlantingCost: CustomCalculator = (v) => {
  const rate = [40, 150, 400, 900, 2000][pick(v.size, 5)];
  const total = pos(v.trees, 1) * (rate + pos(v.suppliesPerTree, 25)) + pos(v.delivery, 75);
  return { totalCost: r2(total), ...spread(total), perTree: r2(total / Math.max(1, pos(v.trees, 1))) };
};

export const yardCleanupCost: CustomCalculator = (v) => {
  const total = Math.max(150, pos(v.acres, 0.25) * [300, 500, 800][pick(v.cover, 3)] + pos(v.bushes) * 75 + pos(v.haulLoads) * 100);
  return { totalCost: r2(total), ...spread(total) };
};

export const lawnAerationCost: CustomCalculator = (v) => {
  const a = pos(v.area);
  const aer = Math.max(75, (a / 1000) * pos(v.ratePer1000, 15));
  const seed = pick(v.overseed, 2) ? a * 0.15 : 0;
  return { totalCost: r2(aer + seed), aerationCost: r2(aer), overseedCost: r2(seed), diyRentalCost: r2(pos(v.rental, 90) + seed * 0.4) };
};

// ---------- Lawn ----------
export const GRASS_TYPES = ["Tall fescue", "Kentucky bluegrass", "Perennial ryegrass", "Fine fescue", "Bermuda (hulled)", "Zoysia", "Centipede", "Bahia"];
const SEED_RATE: [number, number][] = [[8, 4], [3, 1.5], [8, 4], [5, 2.5], [2, 1], [1.5, 1], [0.5, 0.25], [8, 4]];
export const grassSeed: CustomCalculator = (v) => {
  const rate = SEED_RATE[pick(v.grass, SEED_RATE.length)][pick(v.mode, 2)];
  const lb = (pos(v.area) / 1000) * rate;
  const bags = ceil(lb / Math.max(0.5, pos(v.bagLb, 20)));
  return { pounds: r1(lb), bags, ratePer1000: rate, cost: r2(bags * pos(v.bagPrice)) };
};

export const lawnSize: CustomCalculator = (v) => {
  const rects = pos(v.l1) * pos(v.w1) + pos(v.l2) * pos(v.w2) + pos(v.l3) * pos(v.w3);
  const circ = Math.PI * (pos(v.circleDiameter) / 2) ** 2;
  const tri = 0.5 * pos(v.triBase) * pos(v.triHeight);
  const a = Math.max(0, rects + circ + tri - pos(v.exclude));
  return { sqFt: Math.round(a), acres: r2(a / 43560), sqMeters: Math.round(a * 0.0929), fertilizerBags5k: ceil(a / 5000) };
};

export const lawnTopDressing: CustomCalculator = (v) => {
  const yd = (pos(v.area) * pos(v.depth, 0.25)) / 12 / 27;
  return { cubicYards: r2(yd), cubicFeet: r1(yd * 27), tons: r2(yd * [0.8, 1.35, 1.1][pick(v.material, 3)]), bags: ceil(yd * 27) };
};

export const PRE_UNITS = ["Dry product (oz)", "Liquid product (fl oz)", "Granular product (lb)"];
export const preEmergent: CustomCalculator = (v) => {
  const k = pos(v.area) / 1000;
  const product = k * pos(v.ratePer1000, 0.5);
  return { productAmount: r2(product), waterGallons: r2(k * pos(v.carrierPer1000, 1)), tanks: ceil((k * pos(v.carrierPer1000, 1)) / Math.max(0.5, pos(v.tankGallons, 2))), productPerAcre: r2(pos(v.ratePer1000, 0.5) * 43.56) };
};

export const herbicideMix: CustomCalculator = (v) => {
  const oz = pos(v.ratePerGallon, 2.5) * pos(v.tankGallons, 1);
  const covers = (pos(v.tankGallons, 1) / Math.max(0.01, pos(v.sprayPer1000, 1))) * 1000;
  return { productFlOz: r2(oz), tablespoons: r1(oz * 2), milliliters: Math.round(oz * 29.57), areaCovered: Math.round(covers), productPerAcre: r2((43560 / 1000) * pos(v.sprayPer1000, 1) * pos(v.ratePerGallon, 2.5)) };
};

// ---------- Planting ----------
export const plantSpacing: CustomCalculator = (v) => {
  const s = pos(v.spacing, 12) / 12;
  const per = s ? (1 / (s * s)) * (pick(v.pattern, 2) ? 1.155 : 1) : 0;
  const a = pos(v.length) * pos(v.width);
  return { plants: Math.ceil(a * per), plantsPerSqFt: r2(per), plantsPerAcre: Math.round(per * 43560), plantsInRow: pos(v.rowLength) && s ? Math.floor(pos(v.rowLength) / s) + 1 : 0 };
};

export const groundCover: CustomCalculator = (v) => {
  const s = pos(v.spacing, 12) / 12;
  const plants = s ? Math.ceil((pos(v.area) / (s * s)) * (pick(v.pattern, 2) ? 1.155 : 1)) : 0;
  return { plants, flats: ceil(plants / Math.max(1, pos(v.perFlat, 18))), cost: r2(plants * pos(v.pricePerPlant)) };
};

export const MIXES = ["60% topsoil / 30% compost / 10% potting mix", "Mel's Mix (1/3 compost, 1/3 peat or coir, 1/3 vermiculite)"];
export const raisedBedSoil: CustomCalculator = (v) => {
  const cuFt = pos(v.beds, 1) * pos(v.length) * pos(v.width) * (pos(v.depth, 12) / 12);
  const mel = pick(v.mix, 2) === 1;
  const parts = mel ? [1 / 3, 1 / 3, 1 / 3] : [0.6, 0.3, 0.1];
  return { cubicFeet: r1(cuFt), cubicYards: r2(cuFt / 27), bags: ceil(cuFt / Math.max(0.25, pos(v.bagCuFt, 1.5))), partA: r1(cuFt * parts[0]), partB: r1(cuFt * parts[1]), partC: r1(cuFt * parts[2]) };
};

export const pottingSoil: CustomCalculator = (v) => {
  const d = pos(v.diameter, 12), h = pos(v.fillDepth, 10);
  const cuIn = pick(v.shape, 2) ? d * d * h : Math.PI * (d / 2) ** 2 * h;
  const cuFt = (cuIn / 1728) * pos(v.pots, 1);
  const bagQt = [8, 16, 25.7, 38.6, 51.4][pick(v.bag, 5)];
  return { quarts: r1(cuFt * 25.7), liters: r1(cuFt * 28.32), cubicFeet: r2(cuFt), bags: ceil((cuFt * 25.7) / bagQt) };
};


export const CROPS = ["Tomato", "Pepper", "Eggplant", "Broccoli", "Cabbage", "Lettuce", "Onion", "Cucumber", "Squash / zucchini", "Basil", "Marigold", "Melon"];
const CROP_DAYS: [number, number][] = [[-49, 7], [-63, 14], [-63, 14], [-49, -14], [-49, -21], [-35, -14], [-77, -28], [-21, 14], [-21, 14], [-42, 14], [-49, 7], [-21, 14]];
export const seedStarting: CustomCalculator = (v) => {
  const frost = num(v.lastFrost, dayNum(2027, 4, 20));
  const [s, t] = CROP_DAYS[pick(v.crop, CROP_DAYS.length)];
  return { startIndoors: frost + s, transplant: frost + t, hardenOff: frost + t - 10, weeksIndoors: r1((t - s) / 7) };
};

const ZONE_DATES: [number, number, number, number][] = [[5, 15, 9, 15], [5, 10, 9, 25], [4, 30, 10, 10], [4, 20, 10, 20], [4, 10, 10, 30], [3, 25, 11, 10], [2, 25, 12, 1], [1, 30, 12, 15]];
export const ZONES = ["Zone 3", "Zone 4", "Zone 5", "Zone 6", "Zone 7", "Zone 8", "Zone 9", "Zone 10"];
export const frostDate: CustomCalculator = (v) => {
  const y = Math.round(pos(v.year, 2027));
  const [lm, ld, fm, fd] = ZONE_DATES[pick(v.zone, ZONE_DATES.length)];
  const last = num(v.customLast) > 0 ? num(v.customLast) : dayNum(y, lm, ld);
  const first = num(v.customFirst) > 0 ? num(v.customFirst) : dayNum(y, fm, fd);
  return { lastFrost: last, firstFrost: first, growingDays: Math.round(first - last), startTomatoes: last - 42, plantPeas: last - 28, transplantTomatoes: last + 14, sowBeans: last + 7, plantGarlic: first - 28 };
};

// ---------- Growing environment ----------
const svp = (c: number) => 0.6108 * Math.exp((17.27 * c) / (c + 237.3));
export const VPD_STAGES = ["Too low — risk of mold, slow transpiration", "Propagation / clones (0.4–0.8 kPa)", "Vegetative growth (0.8–1.2 kPa)", "Flowering (1.2–1.6 kPa)", "Too high — plants stress and close stomata"];
export const vpd: CustomCalculator = (v) => {
  const air = (num(v.airTemp, 77) - 32) / 1.8, leaf = air + num(v.leafOffset, -2) / 1.8;
  const avp = svp(air) * (pos(v.humidity, 60) / 100);
  const leafVpd = Math.max(0, svp(leaf) - avp), airVpd = Math.max(0, svp(air) - avp);
  const stage = leafVpd < 0.4 ? 0 : leafVpd < 0.8 ? 1 : leafVpd < 1.2 ? 2 : leafVpd <= 1.6 ? 3 : 4;
  return { leafVpd: r2(leafVpd), stage, airVpd: r2(airVpd), svpAir: r2(svp(air)), actualVp: r2(avp) };
};

export const DLI_CROPS = ["Seedlings / clones (6–12)", "Leafy greens & herbs (12–17)", "Houseplants, low light (2–6)", "Fruiting vegetables (20–30)", "High-light flowering crops (35–45)"];
const DLI_RANGE: [number, number][] = [[6, 12], [12, 17], [2, 6], [20, 30], [35, 45]];
export const DLI_STATUS = ["Below the target range — add light or hours", "Within the target range", "Above the target range — reduce intensity or hours"];
export const parDli: CustomCalculator = (v) => {
  const areaM2 = pos(v.areaSqFt, 16) * 0.0929;
  const ppfd = pos(v.fixturePpf) > 0 && areaM2 ? (pos(v.fixturePpf) * 0.85) / areaM2 : pos(v.ppfd, 400);
  const dli = (ppfd * pos(v.hours, 16) * 3600) / 1e6;
  const [lo, hi] = DLI_RANGE[pick(v.crop, DLI_RANGE.length)];
  return { dli: r1(dli), status: dli < lo ? 0 : dli > hi ? 2 : 1, ppfd: Math.round(ppfd), ppfdForTarget: Math.round((((lo + hi) / 2) * 1e6) / (pos(v.hours, 16) * 3600 || 1)) };
};

export const growRoom: CustomCalculator = (v) => {
  const vol = pos(v.length) * pos(v.width) * pos(v.height, 8);
  const co2CuFt = (vol * Math.max(0, pos(v.targetPpm, 1200) - pos(v.ambientPpm, 400))) / 1e6;
  const cfm = (vol / Math.max(0.5, pos(v.exchangeMinutes, 3))) * (pick(v.carbonFilter, 2) ? 1.25 : 1) * 1.2;
  return { exhaustCfm: Math.round(cfm), co2CuFt: r2(co2CuFt), co2Lb: r2(co2CuFt * 0.0283 * 1.98 * 2.2046), roomCuFt: Math.round(vol), dehumidifierPints: Math.round(pos(v.plants) * pos(v.waterPerPlant, 0.5) * 0.9 * 8) };
};

export const GREENHOUSE_COVERS = ["Single glass", "Single-layer poly film", "Double poly film (inflated)", "Twin-wall polycarbonate"];
const COVER_U = [1.13, 1.15, 0.7, 0.65];
export const greenhouseHeater: CustomCalculator = (v) => {
  const L = pos(v.length), W = pos(v.width), H = pos(v.eaveHeight, 7);
  const roof = W * 0.6 * 2 * L; // gable roof at ~30°: two slopes of ~0.58 W
  const area = 2 * (L + W) * H + W * W * 0.29 + roof;
  const btu = area * COVER_U[pick(v.cover, 4)] * Math.max(0, num(v.insideTemp, 50) - num(v.outsideTemp, 20)) * 1.1;
  return { btuPerHour: Math.round(btu), kilowatts: r2(btu / 3412), propaneGalPerHour: r2(btu / 91500), surfaceAreaSqFt: Math.round(area) };
};

export const greenhouseVentilation: CustomCalculator = (v) => {
  const floor = pos(v.length) * pos(v.width);
  const elev = 1 + pos(v.elevation) / 1000 * 0.04;
  const cfm = floor * pos(v.cfmPerSqFt, 8) * elev;
  return { totalCfm: Math.round(cfm), cfmPerFan: Math.round(cfm / Math.max(1, pos(v.fans, 1))), intakeSqFt: r2(cfm / 400), floorSqFt: Math.round(floor) };
};

export const sunHours: CustomCalculator = (v) => {
  const lat = Math.max(-66, Math.min(66, num(v.latitude, 40)));
  const n = dayOfYear(num(v.date, dayNum(2027, 6, 21)));
  const dec = 23.44 * Math.sin(((360 / 365) * (284 + n)) * RAD);
  const x = -Math.tan(lat * RAD) * Math.tan(dec * RAD);
  const w0 = Math.acos(Math.max(-1, Math.min(1, x))) / RAD;
  const direct = pos(v.directHours);
  return { daylightHours: r1((2 * w0) / 15), noonSunAngle: r1(90 - Math.abs(lat - dec)), sunCategory: direct >= 6 ? 0 : direct >= 3 ? 1 : direct >= 1.5 ? 2 : 3, declination: r1(dec) };
};
export const SUN_CATEGORIES = ["Full sun (6+ hours)", "Part sun / part shade (3–6 hours)", "Shade-tolerant only (1.5–3 hours)", "Full shade (under 1.5 hours)"];

// ---------- Water ----------
export const rainwaterCollection: CustomCalculator = (v) => {
  const k = pos(v.roofArea) * 0.623 * (pos(v.efficiency, 85) / 100);
  return { gallonsPerStorm: Math.round(k * pos(v.stormInches, 1)), gallonsPerYear: Math.round(k * pos(v.annualInches, 40)), barrels55: ceil((k * pos(v.stormInches, 1)) / 55), gallonsPerInch: Math.round(k) };
};

const HEAD_GPM = [1.6, 3, 0.9];
export const sprinklerZone: CustomCalculator = (v) => {
  const supply = pos(v.bucketSeconds) > 0 ? (pos(v.bucketGallons, 5) * 60) / pos(v.bucketSeconds) : pos(v.supplyGpm, 10);
  const usable = supply * 0.75;
  const gpm = HEAD_GPM[pick(v.head, 3)] * [1, 0.5, 0.25][pick(v.arc, 3)];
  const heads = Math.floor(usable / gpm);
  return { headsPerZone: heads, supplyGpm: r2(supply), usableGpm: r2(usable), gallonsPerWeek: Math.round(heads * gpm * pos(v.minutes, 20) * pos(v.runsPerWeek, 3)) };
};

export const dripIrrigation: CustomCalculator = (v) => {
  const lineEmitters = pos(v.spacing, 12) ? Math.floor((pos(v.lineFeet) * 12) / pos(v.spacing, 12)) : 0;
  const gph = pos(v.emitters) * pos(v.emitterGph, 1) + lineEmitters * pos(v.lineGph, 0.9);
  const gpm = gph / 60;
  return { totalGph: r1(gph), totalGpm: r2(gpm), gallonsPerWatering: Math.round((gph * pos(v.minutes, 30)) / 60), lineEmitters, zonesNeeded: ceil(gpm / Math.max(0.1, pos(v.supplyGpm, 8) * 0.75)) };
};

const HOSE_D = [0.5, 0.625, 0.75, 1];
export const hoseFlow: CustomCalculator = (v) => {
  const d = HOSE_D[pick(v.diameter, 4)], L = Math.max(1, pos(v.length, 50)), P = Math.max(0, pos(v.pressure, 50) - 10);
  const q = Math.pow((P * Math.pow(140, 1.85) * Math.pow(d, 4.87)) / (4.52 * L), 1 / 1.85);
  const hoseGal = (Math.PI / 4) * d * d * L * 12 / 231;
  return { gpm: r1(q), hoseVolumeGallons: r2(hoseGal), fillMinutes: q ? Math.round(pos(v.fillGallons) / q) : 0, gph: Math.round(q * 60) };
};

// ---------- Trees & wood ----------
export const TREE_SPECIES = ["Red oak", "White oak", "Pin oak", "Sugar maple", "Red maple", "Silver maple", "American elm", "White birch", "Black walnut", "Shagbark hickory", "White ash", "Cottonwood", "Quaking aspen", "Basswood / linden", "Dogwood", "Redbud", "White pine", "Scotch pine", "Norway spruce", "Black cherry"];
const GROWTH = [4.0, 5.0, 3.0, 5.5, 4.5, 3.0, 4.0, 5.0, 4.5, 7.5, 4.0, 2.0, 2.0, 3.0, 7.0, 7.0, 5.0, 3.5, 4.5, 5.0];
export const treeAge: CustomCalculator = (v) => {
  const dia = pos(v.diameter) > 0 ? pos(v.diameter) : pos(v.circumference, 60) / Math.PI;
  const f = GROWTH[pick(v.species, GROWTH.length)];
  return { ageYears: Math.round(dia * f), diameterIn: r1(dia), growthFactor: f };
};

export const treeValue: CustomCalculator = (v) => {
  const area = Math.PI * (pos(v.dbh, 18) / 2) ** 2;
  const value = area * pos(v.unitPrice, 50) * (pos(v.species, 70) / 100) * (pos(v.condition, 80) / 100) * (pos(v.location, 80) / 100);
  return { value: r2(value), trunkAreaSqIn: Math.round(area), basicValue: r2(area * pos(v.unitPrice, 50)) };
};

export const rootProtectionArea: CustomCalculator = (v) => {
  const stems = [v.stem1, v.stem2, v.stem3, v.stem4, v.stem5].map((x) => pos(x)).filter((x) => x > 0);
  const extra = Math.round(pos(v.extraStems));
  let d: number;
  if (extra > 0) {
    const all = stems.length + extra, meanSq = (stems.reduce((s, x) => s + x * x, 0) + extra * pos(v.extraMean) ** 2) / all;
    d = Math.sqrt(meanSq * all);
  } else d = Math.sqrt(stems.reduce((s, x) => s + x * x, 0));
  const radius = (12 * d) / 1000;
  const area = Math.min(707, Math.PI * radius * radius);
  return { rpaRadiusM: r2(Math.sqrt(area / Math.PI)), rpaAreaM2: r1(area), squareSideM: r1(Math.sqrt(area)), combinedDiameterMm: Math.round(d) };
};

export const WOOD_SPECIES = ["Red oak", "White oak", "Sugar maple", "Ash", "Birch", "Cherry", "Pine", "Poplar"];
const CORD_LB = [3600, 4200, 3700, 3500, 3000, 2900, 2200, 2100];
const SEASON_CORDS = [0.5, 1.5, 4];
export const firewoodCord: CustomCalculator = (v) => {
  const vol = pos(v.length) * pos(v.height) * (pos(v.logLength, 16) / 12);
  const cords = vol / 128;
  return { cords: r2(cords), faceCords: r2(vol / (32 * (pos(v.logLength, 16) / 12))), cubicFeet: r1(vol), weightLb: Math.round(cords * CORD_LB[pick(v.species, CORD_LB.length)]), value: r2(cords * pos(v.pricePerCord)), cordsForSeason: SEASON_CORDS[pick(v.use, 3)] };
};

const PITCH = [0.25, 0.325, 0.375, 0.375, 0.404];
const WRAP = [8, 10.8, 10.5, 12.5, 14];
export const CHAIN_PITCHES = ['1/4"', '.325"', '3/8" low profile', '3/8"', '.404"'];
export const chainsawChain: CustomCalculator = (v) => {
  const p = pick(v.pitch, 5);
  const len = 2 * pos(v.barLength, 18) + WRAP[p];
  return { driveLinks: Math.round(len / (2 * PITCH[p])), chainLengthIn: r1(len), pitchIn: PITCH[p] };
};

export const pumpkinWeight: CustomCalculator = (v) => {
  const ott = pos(v.ott, 300);
  const w = ((14.2 / (1 + 7.3 * Math.pow(2, -ott / 96))) ** 3 + (ott / 51) ** 2.91 - 8) * 0.993;
  return { weightLb: Math.max(0, Math.round(w)), weightKg: Math.max(0, Math.round(w * 0.4536)), heavyLb: Math.max(0, Math.round(w * 1.15)), lightLb: Math.max(0, Math.round(w * 0.85)) };
};

// ---------- Outdoor living ----------
export const chickenCoopSize: CustomCalculator = (v) => {
  const b = pick(v.breed, 3), hens = Math.max(1, pos(v.hens, 6));
  const coopPer = [2, 4, 5][b] * [1, 1, 0.8][pick(v.range, 3)];
  const runPer = [8, 10, 15][b];
  return { coopSqFt: Math.ceil(hens * coopPer), runSqFt: pick(v.range, 3) === 2 ? 0 : Math.ceil(hens * runPer), nestBoxes: ceil(hens / 4), roostInches: hens * [7, 9, 10][b] };
};

export const hammockHang: CustomCalculator = (v) => {
  const ang = Math.max(10, Math.min(60, num(v.angle, 30))) * RAD;
  const ridge = pos(v.hammockLength, 11) * 0.83;
  const span = Math.max(0, (pos(v.distance, 15) - ridge) / 2);
  const strap = span / Math.cos(ang);
  const rise = span * Math.tan(ang);
  const sag = Math.sqrt(Math.max(0, (pos(v.hammockLength, 11) / 2) ** 2 - (ridge / 2) ** 2));
  return { hangHeightIn: Math.round(pos(v.sitHeight, 18) + (sag + rise) * 12), strapLengthFt: r1(strap), forcePerStrapLb: Math.round(pos(v.weight, 200) / (2 * Math.sin(ang))), ridgelineFt: r1(ridge) };
};

// ---------- Compost ----------
export const COMPOST_MATERIALS = ["Grass clippings", "Food scraps", "Coffee grounds", "Cow / horse manure", "Chicken manure", "Dry leaves", "Straw", "Wood chips / sawdust", "Cardboard", "Newspaper"];
const CN = [20, 15, 20, 20, 7, 60, 80, 400, 350, 175];
const NPCT = [2.4, 2.5, 2.0, 1.7, 3.5, 0.9, 0.6, 0.1, 0.15, 0.3];
export const COMPOST_STATUS = ["Too much nitrogen — add browns (leaves, straw, cardboard)", "In the ideal range (25–35:1)", "Too much carbon — add greens (grass, food scraps, manure)"];
export const compost: CustomCalculator = (v) => {
  const items = [[v.m1, v.lb1], [v.m2, v.lb2], [v.m3, v.lb3]].map(([m, lb]) => [pick(m, CN.length), pos(lb)] as [number, number]);
  let N = 0, C = 0;
  for (const [m, lb] of items) { const n = (lb * NPCT[m]) / 100; N += n; C += n * CN[m]; }
  const ratio = N ? C / N : 0;
  const status = ratio < 25 ? 0 : ratio > 35 ? 2 : 1;
  const leavesN = 0.009, grassN = 0.024;
  const addLeaves = ratio < 25 ? Math.max(0, (30 * N - C) / (leavesN * (60 - 30))) : 0;
  const addGrass = ratio > 35 ? Math.max(0, (C - 30 * N) / (grassN * (30 - 20))) : 0;
  return { ratio: r1(ratio), status, addLeavesLb: r1(addLeaves), addGrassLb: r1(addGrass), spreadYards: r2((pos(v.spreadArea) * pos(v.spreadDepth, 1)) / 12 / 27) };
};

export const hgGardCustomCalculators: Record<string, CustomCalculator> = {
  "tree-removal-cost-calculator": treeRemovalCost,
  "tree-trimming-cost-calculator": treeTrimmingCost,
  "tree-planting-cost-calculator": treePlantingCost,
  "yard-cleanup-cost-calculator": yardCleanupCost,
  "lawn-aeration-cost-calculator": lawnAerationCost,
  "grass-seed-calculator": grassSeed,
  "lawn-size-calculator": lawnSize,
  "lawn-top-dressing-calculator": lawnTopDressing,
  "pre-emergent-calculator": preEmergent,
  "herbicide-mix-calculator": herbicideMix,
  "plant-spacing-calculator": plantSpacing,
  "ground-cover-calculator": groundCover,
  "raised-bed-soil-calculator": raisedBedSoil,
  "potting-soil-calculator": pottingSoil,
  "seed-starting-calculator": seedStarting,
  "frost-date-calculator": frostDate,
  "vpd-calculator": vpd,
  "par-dli-calculator": parDli,
  "grow-room-calculator": growRoom,
  "greenhouse-heater-calculator": greenhouseHeater,
  "greenhouse-ventilation-calculator": greenhouseVentilation,
  "sun-hours-calculator": sunHours,
  "rainwater-collection-calculator": rainwaterCollection,
  "sprinkler-zone-calculator": sprinklerZone,
  "drip-irrigation-calculator": dripIrrigation,
  "hose-flow-calculator": hoseFlow,
  "tree-age-calculator": treeAge,
  "tree-value-calculator": treeValue,
  "root-protection-area-calculator": rootProtectionArea,
  "firewood-cord-calculator": firewoodCord,
  "chainsaw-chain-calculator": chainsawChain,
  "pumpkin-weight-calculator": pumpkinWeight,
  "chicken-coop-size-calculator": chickenCoopSize,
  "hammock-hang-calculator": hammockHang,
  "compost-calculator": compost,
};
