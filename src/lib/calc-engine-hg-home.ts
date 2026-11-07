/**
 * Batch: "House & Garden Calculators" → Home Building, Remodel & Cleaning Cost Calculators
 * (part 1: measuring, cleaning mixes, glass, ladders & scaffolding, home value and cleaning prices).
 *
 * Data / methods:
 *  - Areas: rectangle, circle, triangle and L-shape; 1 sq m = 10.7639 sq ft; 1 acre = 43,560 sq ft.
 *  - Construction cost: about $175/sq ft for a standard-quality US home (2026), scaled by quality and a regional
 *    cost index (metro coasts ~1.35–1.4, Midwest/South ~0.85–0.9, Hawaii/Alaska ~1.5).
 *  - Dilution: C1·V1 = C2·V2. Bleach ppm = bleach volume × % × 10,000 ÷ total volume.
 *  - Glass: 2.5 g/cm³ (156 lb/ft³) → 0.512 lb per sq ft per mm of thickness.
 *  - Window glass thickness: plate formula σ = β·q·b² ÷ t² (Roark, simply supported rectangle) with allowable
 *    stress 2,800 psi annealed, ×2 heat-strengthened, ×4 tempered — an estimate, not ASTM E1300.
 *  - Glass shelf: simply supported beam, σ = 0.75·W·L ÷ (b·t²); sustained-load allowable stress 1,000 psi annealed,
 *    4,000 psi tempered; E = 10.4 × 10⁶ psi.
 *  - Ladders: OSHA 4:1 rule (75.5°), 3 ft above the landing; extension ladder overlap 3 ft (≤ 36 ft), 4 ft (≤ 48 ft).
 *  - Egress (IRC R310): net clear opening ≥ 5.7 sq ft (5.0 at grade), width ≥ 20 in, height ≥ 24 in, sill ≤ 44 in.
 *  - Pressure-washer nozzles: orifice size = gpm per nozzle × √(4,000 ÷ psi).
 *  - Window savings: ΔU × area × degree-days × 24 (conduction only).
 *  - Costs are typical 2026 US prices (editable inputs), not quotes.
 *
 * Self-contained: no imports from any other batch, per this project's established per-batch convention.
 * See prisma/create-hg-home-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

const num = (x: number, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);
const pos = (x: number, d = 0) => Math.max(0, num(x, d));
const pick = (x: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(num(x))));
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;
const ceil = (x: number) => Math.ceil(x - 1e-9);
const spread = (t: number) => ({ costLow: r2(t * 0.85), costHigh: r2(t * 1.25) });
const RAD = Math.PI / 180;

/* ---------- Measuring ---------- */

export const AREA_SHAPES = ["Rectangle / square", "Circle (length = diameter)", "Triangle (length = base, width = height)", "L-shape (two rectangles)"];
export const squareFootage: CustomCalculator = (v) => {
  const L = pos(v.length), W = pos(v.width), L2 = pos(v.length2), W2 = pos(v.width2);
  const s = pick(v.shape, 4);
  const sq = [L * W, Math.PI * (L / 2) ** 2, (L * W) / 2, L * W + L2 * W2][s];
  return { sqFt: r2(sq), sqM: r2(sq / 10.7639), sqYd: r2(sq / 9), acres: Math.round((sq / 43560) * 10000) / 10000, cost: r2(sq * pos(v.pricePerSqFt)) };
};

export const COST_REGIONS = ["US average", "Northeast metro (NYC, Boston, DC)", "West Coast metro (SF, LA, Seattle)", "Midwest", "South / Southeast", "Mountain West", "Hawaii / Alaska", "Rural / small town"];
const REGION_INDEX = [1, 1.35, 1.4, 0.9, 0.88, 1.0, 1.5, 0.85];
export const BUILD_QUALITY = ["Basic / builder grade", "Standard", "Custom", "Luxury"];
const QUALITY_MULT = [0.75, 1, 1.45, 2.1];
export const constructionCostByZip: CustomCalculator = (v) => {
  const sq = pos(v.sqft, 2000);
  const idx = REGION_INDEX[pick(v.region, 8)] * (1 + num(v.adjust) / 100);
  const per = pos(v.basePerSqFt, 175) * QUALITY_MULT[pick(v.quality, 4)] * idx;
  const total = per * sq;
  return { totalCost: r2(total), costPerSqFt: r2(per), ...spread(total), costIndex: r2(idx * 100) };
};

export const LENGTH_UNITS = ["Feet", "Inches", "Yards", "Meters", "Centimeters"];
const TO_FT = [1, 1 / 12, 3, 3.28084, 0.0328084];
export const cubicFeet: CustomCalculator = (v) => {
  const f = TO_FT[pick(v.unit, 5)];
  const cf = pos(v.length) * f * pos(v.width) * f * pos(v.height) * f * Math.max(1, pos(v.quantity, 1));
  return { cubicFeet: r2(cf), cubicYards: r2(cf / 27), cubicMeters: Math.round((cf / 35.3147) * 1000) / 1000, gallons: r2(cf * 7.48052), liters: r2(cf * 28.3168) };
};

export const roomArea: CustomCalculator = (v) => {
  const L = pos(v.length), W = pos(v.width), H = pos(v.height);
  const per = 2 * (L + W);
  const walls = Math.max(0, per * H - pos(v.doors) * 21 - pos(v.windows) * 15);
  return { floorSqFt: r2(L * W), wallSqFt: r2(walls), ceilingSqFt: r2(L * W), paintableSqFt: r2(walls + L * W), perimeterFt: r2(per) };
};

export const linearFeetToSquareFeet: CustomCalculator = (v) => {
  const wFt = pos(v.width) / 12;
  return { sqFt: r2(pos(v.linearFeet) * wFt), linearFeetFromSqFt: wFt > 0 ? r2(pos(v.sqFtToConvert) / wFt) : 0, sqM: r2((pos(v.linearFeet) * wFt) / 10.7639) };
};

export const floorPlanArea: CustomCalculator = (v) => {
  let net = 0, rooms = 0;
  for (let i = 1; i <= 6; i++) { const a = pos(v[`l${i}`]) * pos(v[`w${i}`]); if (a > 0) rooms++; net += a; }
  const gross = net * (1 + pos(v.wallPercent) / 100);
  return { grossSqFt: r2(gross), netSqFt: r2(net), sqM: r2(gross / 10.7639), rooms };
};

/* ---------- Cleaning mixes ---------- */

export const bleachDilution: CustomCalculator = (v) => {
  const strength = pos(v.strength, 6) / 100, ppm = pos(v.ppm), waterFlOz = pos(v.water) * 128;
  if (strength <= 0 || ppm <= 0) return { bleachFlOz: 0, bleachTsp: 0, bleachMl: 0, ratioParts: 0 };
  const frac = ppm / 1e6 / strength; // share of final mix that is bleach
  const b = (waterFlOz * frac) / Math.max(1e-9, 1 - frac);
  return { bleachFlOz: r2(b), bleachTsp: r1(b * 6), bleachMl: r1(b * 29.5735), ratioParts: r1(waterFlOz / Math.max(1e-9, b)) };
};

export const vinegarDilution: CustomCalculator = (v) => {
  const c1 = pos(v.strength, 5), c2 = pos(v.target), V = pos(v.volume);
  const vin = c1 > 0 ? Math.min(V, (c2 * V) / c1) : 0;
  return { vinegarOz: r2(vin), waterOz: r2(V - vin), vinegarCups: r2(vin / 8), ratioParts: vin > 0 ? r1((V - vin) / vin) : 0 };
};

export const softwashMix: CustomCalculator = (v) => {
  const tank = pos(v.tank), sh = pos(v.shStrength, 12.5), mix = Math.min(sh, pos(v.mix));
  const shGal = sh > 0 ? (tank * mix) / sh : 0;
  return { shGallons: r2(shGal), waterGallons: r2(tank - shGal), surfactantOz: r2(tank * pos(v.surfactantPerGal)), downstreamStrength: r2(sh / (1 + Math.max(0, pos(v.injectorRatio, 10)))) };
};

/* ---------- Waste & weights ---------- */

export const CAN_SHAPES = ["Round can", "Square / rectangular can"];
export const garbageBagSize: CustomCalculator = (v) => {
  const H = pos(v.height), D = pos(v.diameter), W2 = pos(v.depth);
  const round = pick(v.shape, 2) === 0;
  const width = round ? (Math.PI * D) / 2 : D + W2;
  const length = round ? H + D / 2 + 3 : H + Math.max(D, W2) / 2 + 3;
  const gal = round ? (Math.PI * (D / 2) ** 2 * H) / 231 : (D * W2 * H) / 231;
  return { bagWidthIn: ceil(width), bagLengthIn: ceil(length), canGallons: r1(gal) };
};

export const DEBRIS = ["Household junk & furniture", "Mixed renovation debris", "Drywall", "Asphalt shingles", "Yard waste & brush", "Wood & lumber", "Concrete, brick & block (broken)", "Dirt & soil"];
const DEBRIS_LB = [225, 500, 500, 500, 200, 300, 2400, 2200];
export const dumpsterWeight: CustomCalculator = (v) => {
  const yd = pos(v.cubicYards), lb = yd * DEBRIS_LB[pick(v.debris, 8)], tons = lb / 2000;
  const over = Math.max(0, tons - pos(v.tonsIncluded));
  const size = pos(v.dumpsterYards);
  return { weightLb: Math.round(lb), weightTons: r2(tons), overageCost: r2(over * pos(v.overagePerTon)), percentFull: size > 0 ? r1((yd / size) * 100) : 0 };
};

export const DOOR_TYPES = ["Hollow-core interior", "Solid-core (MDF / particleboard)", "Solid softwood (pine)", "Solid hardwood (oak, mahogany)", "Steel insulated", "Fiberglass", "Fire-rated (mineral core)"];
const DOOR_PCF = [9, 22, 28, 44, 24, 21, 32];
export const doorWeight: CustomCalculator = (v) => {
  const W = pos(v.width), H = pos(v.height), T = pos(v.thickness);
  const lb = ((W * H * T) / 1728) * DOOR_PCF[pick(v.type, 7)];
  return { weightLb: r1(lb), weightKg: r1(lb * 0.453592), hinges: H <= 60 ? 2 : H <= 90 ? 3 : 4, lbPerHinge: r1(lb / (H <= 60 ? 2 : H <= 90 ? 3 : 4)) };
};

const GLASS_LB_SQFT_MM = 0.512;
export const glassWeight: CustomCalculator = (v) => {
  const area = (pos(v.length) * pos(v.width)) / 144, per = GLASS_LB_SQFT_MM * pos(v.thicknessMm);
  const lb = area * per * Math.max(1, pos(v.panes, 1));
  return { weightLb: r1(lb), weightKg: r1(lb * 0.453592), lbPerSqFt: r2(per), areaSqFt: r2(area) };
};

export const GLASS_TYPES = ["Annealed (standard)", "Heat-strengthened (2×)", "Tempered (4×)"];
const GLASS_FACTOR = [1, 2, 4];
export const GLASS_STD = ["1/8 in (3 mm)", "5/32 in (4 mm)", "3/16 in (5 mm)", "1/4 in (6 mm)", "5/16 in (8 mm)", "3/8 in (10 mm)", "1/2 in (12 mm)", "5/8 in (16 mm)", "3/4 in (19 mm)", "Over 3/4 in — use engineered laminated or insulated glass (ASTM E1300)"];
const GLASS_MIN_MM = [2.92, 3.78, 4.57, 5.56, 7.42, 9.02, 11.91, 15.09, 18.26];
const betaFor = (ratio: number) => {
  const xs = [1, 1.5, 2, 3, 4], ys = [0.2874, 0.4872, 0.6102, 0.7134, 0.741];
  if (ratio <= 1) return ys[0];
  for (let i = 1; i < xs.length; i++) if (ratio <= xs[i]) return ys[i - 1] + ((ratio - xs[i - 1]) * (ys[i] - ys[i - 1])) / (xs[i] - xs[i - 1]);
  return 0.75;
};
export const glassThickness: CustomCalculator = (v) => {
  const a = Math.max(pos(v.width), pos(v.height)), b = Math.min(pos(v.width), pos(v.height));
  if (b <= 0) return { requiredMm: 0, requiredIn: 0, standard: 0, paneWeightLb: 0 };
  const q = pos(v.pressure, 30) / 144;
  const sigma = 2800 * GLASS_FACTOR[pick(v.type, 3)];
  const t = b * Math.sqrt((betaFor(a / b) * q) / sigma);
  const mm = t * 25.4;
  let idx = GLASS_MIN_MM.findIndex((m) => m >= mm);
  if (idx < 0) idx = GLASS_STD.length - 1;
  const useMm = idx < GLASS_MIN_MM.length ? [3, 4, 5, 6, 8, 10, 12, 16, 19][idx] : mm;
  return { requiredMm: r2(mm), requiredIn: Math.round(t * 1000) / 1000, standard: idx, paneWeightLb: r1(((a * b) / 144) * GLASS_LB_SQFT_MM * useMm) };
};

export const glassShelf: CustomCalculator = (v) => {
  const L = pos(v.span), b = pos(v.depth), t = pos(v.thicknessMm) / 25.4;
  const sigma = pick(v.type, 2) === 1 ? 4000 : 1000;
  if (L <= 0 || b <= 0) return { maxLoadLb: 0, requiredThicknessMm: 0, deflectionIn: 0, shelfWeightLb: 0 };
  const maxW = (sigma * b * t * t) / (0.75 * L);
  const target = pos(v.targetLoad);
  const reqT = Math.sqrt((0.75 * target * L) / (b * sigma));
  const I = (b * t ** 3) / 12;
  const defl = I > 0 ? (5 * target * L ** 3) / (384 * 10.4e6 * I) : 0;
  return { maxLoadLb: r1(maxW), requiredThicknessMm: r1(reqT * 25.4), deflectionIn: Math.round(defl * 1000) / 1000, shelfWeightLb: r1(((L * b) / 144) * GLASS_LB_SQFT_MM * pos(v.thicknessMm)) };
};

/* ---------- Access ---------- */

const EXT_SIZES = [16, 20, 24, 28, 32, 36, 40];
export const ladderHeight: CustomCalculator = (v) => {
  const hgt = pos(v.supportHeight), ang = Math.min(85, Math.max(60, pos(v.angle, 75.5))) * RAD;
  const working = hgt / Math.sin(ang) + pos(v.extendAbove);
  const overlap = working <= 33 ? 3 : working <= 44 ? 4 : 5;
  const need = working + overlap;
  const size = EXT_SIZES.find((s) => s >= need) ?? ceil(need);
  return { ladderLengthFt: r1(working), baseDistanceFt: r1(hgt / Math.tan(ang)), extensionLadderSize: size, stepladderFt: Math.max(2, ceil(pos(v.ceilingHeight) - 4)) };
};

export const SCAFFOLD_FRAMES = ["5 ft tall frames", "6 ft 4 in tall frames"];
export const scaffolding: CustomCalculator = (v) => {
  const L = pos(v.length), H = pos(v.height), fh = pick(v.frame, 2) === 0 ? 5 : 6.33;
  const bays = ceil(L / 7), levels = ceil(H / fh);
  const sections = bays * levels;
  const cost = sections * pos(v.rentPerSectionWeek) * pos(v.weeks) + pos(v.setup);
  return { totalCost: r2(cost), sections, frames: (bays + 1) * levels, crossBraces: sections * 2, planks: bays * 2, faceSqFt: r2(L * H) };
};

export const EGRESS_TYPES = ["Casement", "Double- or single-hung", "Horizontal slider"];
export const EGRESS_STATUS = ["Meets IRC egress size", "Too small — net opening under the minimum area", "Clear width under 20 in", "Clear height under 24 in", "Sill higher than 44 in above the floor"];
export const egressWindow: CustomCalculator = (v) => {
  const W = pos(v.width), H = pos(v.height), t = pick(v.type, 3);
  const cw = Math.max(0, [W - 5, W - 4, W / 2 - 4][t]);
  const ch = Math.max(0, [H - 5, H / 2 - 4, H - 4][t]);
  const area = (cw * ch) / 144;
  const minA = pick(v.grade, 2) === 1 ? 5.0 : 5.7;
  const status = area < minA ? 1 : cw < 20 ? 2 : ch < 24 ? 3 : pos(v.sill) > 44 ? 4 : 0;
  return { status, clearSqFt: r2(area), clearWidthIn: r1(cw), clearHeightIn: r1(ch) };
};

export const tarpSize: CustomCalculator = (v) => {
  const L = pos(v.length), W = pos(v.width), H = pos(v.height), o = pos(v.overhang);
  const tl = L + 2 * H + 2 * o, tw = W + 2 * H + 2 * o;
  const buy = (x: number) => Math.max(6, ceil((x + 0.5) / 2) * 2);
  return { buyLength: buy(tl), buyWidth: buy(tw), tarpLengthFt: r1(tl), tarpWidthFt: r1(tw), sqFt: r1(tl * tw) };
};

const NOZZLE_STD = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10, 11, 12, 15];
export const pressureWasherNozzle: CustomCalculator = (v) => {
  const psi = pos(v.psi, 3000), q = pos(v.gpm) / Math.max(1, pos(v.nozzles, 1));
  if (psi <= 0 || q <= 0) return { orificeSize: 0, standardSize: 0, pressureWithStandard: 0 };
  const exact = q * Math.sqrt(4000 / psi);
  const std = NOZZLE_STD.reduce((b, s) => (Math.abs(s - exact) < Math.abs(b - exact) ? s : b), NOZZLE_STD[0]);
  return { standardSize: std, orificeSize: r2(exact), pressureWithStandard: Math.round(4000 * (q / std) ** 2) };
};

/* ---------- Windows & light ---------- */

export const windowEnergySavings: CustomCalculator = (v) => {
  const area = pos(v.windows) * pos(v.sizeSqFt), dU = Math.max(0, pos(v.oldU) - pos(v.newU));
  const heat = (area * dU * pos(v.hdd) * 24) / 1e6 * pos(v.heatPerMMBtu);
  const cool = (area * dU * pos(v.cdd) * 24) / 1e6 * pos(v.coolPerMMBtu);
  const yearly = heat + cool, cost = pos(v.windows) * pos(v.costPerWindow);
  return { yearlySavings: r2(yearly), heatingSavings: r2(heat), coolingSavings: r2(cool), paybackYears: yearly > 0 ? r1(cost / yearly) : 0 };
};

export const ROOM_LIGHT = ["Many windows (skylight ≈ 5% of floor)", "Some windows (≈ 10%)", "Few windows (≈ 15%)"];
export const SKYLIGHT_TYPES = ["Fixed (deck-mounted)", "Manual venting", "Solar / electric venting", "Tubular (10–14 in)"];
const SKY_COST = [1800, 2200, 2900, 900];
export const skylight: CustomCalculator = (v) => {
  const floor = pos(v.length) * pos(v.width);
  const sky = floor * [0.05, 0.1, 0.15][pick(v.light, 3)];
  const t = pick(v.type, 4);
  const unit = t === 3 ? 1.5 : Math.max(1, pos(v.unitSqFt, 7.2));
  const units = Math.max(1, ceil(sky / unit));
  const total = units * SKY_COST[t] * (1 + pos(v.adjust) / 100);
  return { totalCost: r2(total), skylightSqFt: r1(sky), units, ...spread(total) };
};

/* ---------- Value ---------- */

export const homeAdditionValue: CustomCalculator = (v) => {
  const added = pos(v.sqft) * pos(v.localPerSqFt) * (pos(v.resaleFactor, 85) / 100), cost = pos(v.cost);
  return { valueAdded: r2(added), costRecouped: cost > 0 ? r1((added / cost) * 100) : 0, newHomeValue: r2(pos(v.homeValue) + added), netGain: r2(added - cost) };
};

export const RENO_PROJECTS = ["Garage door replacement", "Steel entry door", "Manufactured stone veneer", "Minor kitchen remodel (midrange)", "Fiber-cement siding", "Wood deck addition", "Vinyl siding", "Bathroom remodel (midrange)", "Finished basement", "Vinyl window replacement", "Roof replacement (asphalt)", "Major kitchen remodel (midrange)", "Bathroom addition", "Primary suite addition"];
const RENO_RECOUP = [190, 185, 150, 95, 88, 80, 80, 74, 70, 67, 57, 49, 45, 30];
export const renovationRoi: CustomCalculator = (v) => {
  const cost = pos(v.cost), pct = pos(v.customRecoup) > 0 ? pos(v.customRecoup) : RENO_RECOUP[pick(v.project, RENO_RECOUP.length)];
  const added = (cost * pct) / 100;
  return { valueAdded: r2(added), costRecouped: pct, roiPercent: r1(pct - 100), netCost: r2(cost - added), newHomeValue: r2(pos(v.homeValue) + added) };
};

/* ---------- Cleaning prices ---------- */

export const airbnbCleaningFee: CustomCalculator = (v) => {
  const beds = pos(v.bedrooms), baths = pos(v.bathrooms);
  const hrs = 1 + 0.75 * beds + 0.5 * baths;
  const cost = hrs * pos(v.hourlyRate) + Math.max(1, beds) * pos(v.laundryPerBed) + pos(v.supplies);
  const fee = ceil(cost / 5) * 5;
  return { suggestedFee: fee, cleaningCost: r2(cost), hours: r2(hrs), perNight: r2(fee / Math.max(1, pos(v.avgStay, 1))) };
};

export const commercialCleaningCost: CustomCalculator = (v) => {
  const sq = pos(v.sqft), rate = Math.max(1, pos(v.production, 2500));
  const hrs = sq / rate;
  const labor = hrs * pos(v.wage) * (1 + pos(v.burden) / 100);
  const cost = labor * (1 + pos(v.supplies) / 100);
  const margin = Math.min(90, pos(v.margin)) / 100;
  const visit = cost / (1 - margin);
  const monthly = visit * pos(v.perWeek) * 4.33;
  return { monthlyBid: r2(monthly), pricePerVisit: r2(visit), hoursPerVisit: r2(hrs), pricePerSqFt: sq > 0 ? Math.round((monthly / sq) * 1000) / 1000 : 0 };
};

export const PCC_PHASES = ["Rough clean", "Final clean", "Touch-up (sparkle) clean", "All three phases"];
const PCC_RATE = [0.2, 0.3, 0.12, 0.62];
export const postConstructionCleaningCost: CustomCalculator = (v) => {
  const total = pos(v.sqft) * PCC_RATE[pick(v.phase, 4)] * (1 + pos(v.adjust) / 100) + pos(v.windows) * pos(v.windowRate) + pos(v.haul);
  return { totalCost: r2(total), ...spread(total) };
};

export const CLIMATES = ["Mild climate", "Harsh climate (snow, storms, heat)"];
export const homeMaintenanceCost: CustomCalculator = (v) => {
  const onePct = pos(v.homeValue) * 0.01, sqRule = pos(v.sqft) * 1.25;
  const age = pos(v.age);
  const ageF = age < 10 ? 0.8 : age < 25 ? 1 : age < 50 ? 1.25 : 1.5;
  const yearly = ((onePct + sqRule) / 2) * ageF * (pick(v.climate, 2) === 1 ? 1.25 : 1);
  return { recommendedYearly: r2(yearly), monthly: r2(yearly / 12), onePercentRule: r2(onePct), squareFootRule: r2(sqRule) };
};

export const hgHomeCustomCalculators: Record<string, CustomCalculator> = {
  "square-footage-calculator": squareFootage,
  "construction-cost-by-zip-calculator": constructionCostByZip,
  "cubic-feet-calculator": cubicFeet,
  "room-area-calculator": roomArea,
  "linear-feet-to-square-feet-calculator": linearFeetToSquareFeet,
  "floor-plan-area-calculator": floorPlanArea,
  "bleach-dilution-calculator": bleachDilution,
  "vinegar-dilution-calculator": vinegarDilution,
  "softwash-mix-calculator": softwashMix,
  "garbage-bag-size-calculator": garbageBagSize,
  "dumpster-weight-calculator": dumpsterWeight,
  "door-weight-calculator": doorWeight,
  "glass-weight-calculator": glassWeight,
  "glass-thickness-calculator": glassThickness,
  "glass-shelf-calculator": glassShelf,
  "ladder-height-calculator": ladderHeight,
  "scaffolding-calculator": scaffolding,
  "egress-window-calculator": egressWindow,
  "tarp-size-calculator": tarpSize,
  "pressure-washer-nozzle-calculator": pressureWasherNozzle,
  "window-energy-savings-calculator": windowEnergySavings,
  "skylight-calculator": skylight,
  "home-addition-value-calculator": homeAdditionValue,
  "renovation-roi-calculator": renovationRoi,
  "airbnb-cleaning-fee-calculator": airbnbCleaningFee,
  "commercial-cleaning-cost-calculator": commercialCleaningCost,
  "post-construction-cleaning-cost-calculator": postConstructionCleaningCost,
  "home-maintenance-cost-calculator": homeMaintenanceCost,
};
