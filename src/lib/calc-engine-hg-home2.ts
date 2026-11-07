/**
 * Batch: "House & Garden Calculators" → Home Building, Remodel & Cleaning Cost Calculators
 * (part 2: remodel, addition, repair, remediation and replacement costs).
 *
 * Data / methods:
 *  - Every tool is quantity (sq ft, linear ft, units or rooms) × a typical 2026 US installed rate for the chosen
 *    type, plus fixed add-ons; low/high = −15% / +25%. All rates are editable inputs or documented in the copy.
 *  - Mold: $12 / $20 / $30 per sq ft by severity (minimum $500). Water damage: drying $4 / $5.50 / $7.50 per sq ft
 *    by IICRC water category. Asbestos: $5–15 per sq ft by material (minimum $1,500).
 *  - Additions: second story $300–550 per sq ft; extensions $220–300 per sq ft; garage conversions $60–200.
 *  - House materials ≈ 50% of construction cost, split foundation 12%, framing 20%, roofing 7%, windows & doors 10%,
 *    siding 8%, plumbing/electrical/HVAC 15%, insulation & drywall 8%, interior finishes 20%.
 *  - Costs are typical 2026 US prices (editable inputs), not quotes.
 *
 * Self-contained: no imports from any other batch, per this project's established per-batch convention.
 * See prisma/create-hg-home2-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

const num = (x: number, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);
const pos = (x: number, d = 0) => Math.max(0, num(x, d));
const pick = (x: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(num(x))));
const r2 = (x: number) => Math.round(x * 100) / 100;
const res = (t: number, extra: Record<string, number> = {}) => ({ totalCost: r2(t), costLow: r2(t * 0.85), costHigh: r2(t * 1.25), ...extra });
const adj = (v: Record<string, number>) => 1 + num(v.adjust) / 100;

/* ---------- Remediation & repair ---------- */

export const MOLD_LEVELS = ["Small / surface (under 10 sq ft spots)", "Moderate (wall or ceiling sections)", "Extensive (behind walls, attic or HVAC)"];
export const moldRemediationCost: CustomCalculator = (v) => {
  const t = Math.max(500, pos(v.area) * [12, 20, 30][pick(v.severity, 3)] * adj(v)) + pos(v.testing) + pos(v.hvac);
  return res(t);
};

export const WATER_CATEGORIES = ["Category 1 — clean water (supply line, rain)", "Category 2 — gray water (appliance, sump)", "Category 3 — black water (sewage, flood)"];
export const waterDamageRepairCost: CustomCalculator = (v) => {
  const a = pos(v.area);
  const dry = a * [4, 5.5, 7.5][pick(v.category, 3)] * adj(v);
  const rebuild = a * pos(v.rebuildPerSqFt);
  return res(dry + rebuild + pos(v.contents), { dryingCost: r2(dry), rebuildCost: r2(rebuild) });
};

export const ASBESTOS_MATERIALS = ["Popcorn / acoustic ceiling", "Floor tiles & mastic", "Pipe & boiler insulation", "Siding or roofing", "Attic vermiculite insulation", "Drywall / joint compound"];
const ASB_RATE = [5, 6, 15, 8, 10, 7];
export const asbestosAbatementCost: CustomCalculator = (v) => {
  const removal = Math.max(1500, pos(v.area) * ASB_RATE[pick(v.material, 6)] * adj(v));
  const t = removal + pos(v.testing) + pos(v.clearance);
  return res(t, { encapsulationCost: r2(removal * 0.4 + pos(v.testing)) });
};

export const PEST_TREATMENTS = ["General pest plan (quarterly, per year)", "Termite liquid barrier (per linear ft)", "Termite bait stations (install + 1st year)", "Tent fumigation (per sq ft)", "Bed bug heat treatment (per sq ft)", "Rodent exclusion & trapping"];
const PEST_BASE = [480, 300, 1500, 500, 300, 600], PEST_SQ = [0, 0, 0, 2.5, 2, 0], PEST_LF = [0, 8, 0, 0, 0, 0];
export const pestControlCost: CustomCalculator = (v) => {
  const t = pick(v.treatment, 6);
  const job = (PEST_BASE[t] + PEST_SQ[t] * pos(v.sqft) + PEST_LF[t] * pos(v.perimeter)) * adj(v);
  return res(job + pos(v.damageRepair), { treatmentCost: r2(job) });
};

export const crawlSpaceEncapsulationCost: CustomCalculator = (v) => {
  const a = pos(v.area);
  const liner = a * [4.5, 5.5, 7][pick(v.liner, 3)] * adj(v);
  return res(liner + pos(v.dehumidifier) + pos(v.sump) + pos(v.cleanup), { linerCost: r2(liner) });
};

export const WATERPROOF_METHODS = ["Interior sealant / coating (per sq ft of wall)", "Interior drain tile (French drain, per linear ft)", "Exterior excavation & membrane (per linear ft)"];
export const basementWaterproofingCost: CustomCalculator = (v) => {
  const m = pick(v.method, 3), lf = pos(v.perimeter);
  const main = (m === 0 ? lf * pos(v.wallHeight) * 6 : lf * [0, 70, 150][m]) * adj(v);
  return res(main + pos(v.sump) + pos(v.cracks) * 500, { mainCost: r2(main) });
};

export const DEMO_SCOPES = ["Light strip-out (flooring, fixtures)", "Full gut to the studs", "Bathroom demolition", "Kitchen demolition"];
export const interiorDemolitionCost: CustomCalculator = (v) => {
  const labor = pos(v.area) * [2.5, 6, 25, 15][pick(v.scope, 4)] * adj(v);
  return res(labor + pos(v.dumpster) + pos(v.testing));
};

export const SHED_TYPES = ["Plastic / resin", "Metal", "Wood"];
export const shedRemovalCost: CustomCalculator = (v) => {
  const a = pos(v.area);
  const t = (a * [3, 4, 6][pick(v.type, 3)] + (pick(v.slab, 2) === 1 ? a * 6 : 0)) * adj(v) + pos(v.dump);
  return res(Math.max(250, t));
};

export const WALL_TYPES = ["Non-load-bearing wall", "Load-bearing wall (beam & posts)"];
export const wallRemovalCost: CustomCalculator = (v) => {
  const L = pos(v.length), lb = pick(v.type, 2) === 1;
  const wall = (lb ? 2500 + L * 300 : 300 + L * 40) * adj(v);
  const finish = L * (pos(v.finishPerFt) + pos(v.floorPatchPerFt));
  return res(wall + finish + pos(v.reroute), { wallCost: r2(wall) });
};

/* ---------- Windows, doors & shutters ---------- */

export const IMPACT_FRAMES = ["Vinyl", "Aluminum", "Fiberglass or wood-clad"];
export const impactWindowCost: CustomCalculator = (v) => {
  const n = pos(v.windows), win = n * pos(v.sizeSqFt) * [70, 80, 100][pick(v.frame, 3)] * adj(v);
  return res(win + pos(v.doors) * 4000, { perWindow: n > 0 ? r2(win / n) : 0 });
};

export const GLAZING_TYPES = ["uPVC / vinyl double glazed", "Aluminium double glazed", "Timber / wood double glazed", "uPVC / vinyl triple glazed"];
export const WINDOW_SIZES = ["Small (under 10 sq ft)", "Medium (10–20 sq ft)", "Large / bay (over 20 sq ft)"];
export const doubleGlazingCost: CustomCalculator = (v) => {
  const n = pos(v.windows);
  const per = [750, 1100, 1400, 950][pick(v.type, 4)] * [0.8, 1, 1.4][pick(v.size, 3)] * adj(v);
  return res(n * per + pos(v.doors) * 2500, { perWindow: r2(per) });
};

export const glassBlockWindowCost: CustomCalculator = (v) => {
  const per = (150 + pos(v.sizeSqFt) * [90, 100, 120][pick(v.type, 3)]) * adj(v);
  return res(pos(v.windows) * per, { perWindow: r2(per) });
};

export const ENTRY_DOORS = ["Steel entry door", "Fiberglass entry door", "Solid wood entry door", "Sliding patio door", "French / hinged patio doors"];
export const frontDoorCost: CustomCalculator = (v) => {
  const door = [1800, 2500, 3500, 3000, 4500][pick(v.type, 5)] * adj(v);
  const t = door + pos(v.sidelights) * 800 + (pick(v.transom, 2) === 1 ? 500 : 0) + pos(v.hardware) + (pick(v.frame, 2) === 1 ? 400 : 0);
  return res(t);
};

export const SHUTTER_OPS = ["Manual (crank or strap)", "Electric / motorized", "Solar or smart motorized"];
export const rollerShutterCost: CustomCalculator = (v) => {
  const per = pos(v.width) * pos(v.height) * [25, 40, 50][pick(v.operation, 3)] * adj(v);
  return res(Math.max(1, pos(v.shutters)) * per, { perShutter: r2(per) });
};

/* ---------- Additions & conversions ---------- */

export const FINISH_LEVELS = ["Basic", "Mid-range", "High-end"];
export const secondStoryAdditionCost: CustomCalculator = (v) => {
  const sq = pos(v.sqft);
  const build = sq * [300, 400, 550][pick(v.finish, 3)] * adj(v) + pos(v.structural);
  const t = build * (1 + pos(v.designPct) / 100) + pos(v.months) * pos(v.rent);
  return res(t, { perSqFt: sq > 0 ? r2(t / sq) : 0 });
};

export const EXTENSION_TYPES = ["Single-storey extension", "Double-storey extension (total floor area)", "Kitchen extension (single-storey)"];
export const SPEC_LEVELS = ["Basic", "Standard", "High specification"];
export const extensionCost: CustomCalculator = (v) => {
  const sq = pos(v.sqft);
  const per = [250, 220, 300][pick(v.type, 3)] * [0.85, 1, 1.35][pick(v.spec, 3)] * adj(v);
  const t = sq * per * (1 + pos(v.designPct) / 100);
  return res(t, { perSqFt: r2(per), perSqM: r2(per * 10.7639) });
};

export const CONSERVATORY_STYLES = ["Lean-to", "Victorian / Edwardian", "Gable-fronted", "Orangery"];
export const CONSERVATORY_JOBS = ["New conservatory", "Replace roof with a solid / tiled roof", "Replace roof with new glass or polycarbonate"];
export const conservatoryCost: CustomCalculator = (v) => {
  const sq = pos(v.sqft), job = pick(v.job, 3);
  const rate = job === 0 ? [200, 240, 260, 320][pick(v.style, 4)] : [0, 120, 90][job];
  return res(sq * rate * adj(v) + pos(v.base));
};

export const LOFT_TYPES = ["Rooflight / skylight (Velux-style)", "Dormer", "Hip-to-gable", "Mansard"];
export const loftConversionCost: CustomCalculator = (v) => {
  const sq = pos(v.sqft), per = [150, 220, 250, 300][pick(v.type, 4)] * adj(v);
  return res(sq * per + pos(v.bathroom) + pos(v.stairs), { perSqFt: r2(per) });
};

export const GARAGE_LEVELS = ["Basic finished room (insulation, drywall, floor)", "Bedroom or office with heating & cooling", "Apartment / ADU with kitchen & bathroom"];
export const garageConversionCost: CustomCalculator = (v) => {
  const sq = pos(v.sqft), per = [60, 100, 200][pick(v.level, 3)] * adj(v);
  return res(sq * per + pos(v.doorInfill) + pos(v.permits), { perSqFt: r2(per) });
};

export const SUNROOM_TYPES = ["Screen enclosure on an existing patio / lanai", "Screened porch with roof", "Three-season room", "Four-season sunroom (heated & cooled)"];
export const sunroomCost: CustomCalculator = (v) => {
  const sq = pos(v.sqft), per = [20, 60, 175, 300][pick(v.type, 4)] * adj(v);
  return res(sq * per + pos(v.foundation) + pos(v.hvac), { perSqFt: r2(per) });
};

/* ---------- Bathrooms, closets, accessibility ---------- */

export const SHOWER_TYPES = ["Prefab shower kit", "One-day acrylic conversion", "Custom tile shower", "Curbless walk-in shower"];
export const tubToShowerCost: CustomCalculator = (v) => {
  const base = [4500, 7500, 11000, 15000][pick(v.type, 4)] * adj(v);
  return res(base + pos(v.glassDoor) + pos(v.plumbing) + pos(v.grabBars) * 200);
};

export const CLOSET_MATERIALS = ["Wire shelving", "Laminate / melamine system", "Custom wood or fitted wardrobe"];
export const closetCost: CustomCalculator = (v) => {
  const sys = pos(v.linearFeet) * [30, 200, 400][pick(v.material, 3)] * adj(v);
  return res(sys + pos(v.doors) * 300 + pos(v.accessories));
};

export const STAIR_TYPES = ["Straight staircase", "Curved or landing staircase", "Outdoor stair lift", "Heavy-duty (bariatric) straight"];
export const stairLiftCost: CustomCalculator = (v) => {
  const t = [4000, 12000, 6000, 6500][pick(v.type, 4)] * Math.max(1, pos(v.staircases, 1)) * adj(v) + pos(v.extras);
  return res(t);
};

/* ---------- Furnishing, design, staging ---------- */

export const BUDGET_TIERS = ["Budget", "Mid-range", "High-end"];
export const furnishHouseCost: CustomCalculator = (v) => {
  const k = pick(v.tier, 3);
  const t = (pos(v.bedrooms) * [1500, 4000, 10000][k] + pos(v.living) * [2500, 6000, 15000][k] + pos(v.dining) * [1000, 3000, 8000][k] + pos(v.offices) * [700, 2000, 5000][k] + [800, 2000, 5000][k]) * adj(v) + pos(v.outdoor);
  return res(t);
};

export const DESIGN_FEES = ["Hourly", "Percentage of project", "Per square foot", "Flat fee"];
export const interiorDesignCost: CustomCalculator = (v) => {
  const f = pick(v.feeType, 4);
  const fee = [pos(v.hours) * pos(v.rate), (pos(v.budget) * pos(v.percent)) / 100, pos(v.sqft) * pos(v.perSqFt), pos(v.flat)][f];
  return { designFee: r2(fee), totalProject: r2(fee + pos(v.budget)), feeShare: pos(v.budget) > 0 ? Math.round((fee / pos(v.budget)) * 1000) / 10 : 0 };
};

export const STAGING_TYPES = ["Vacant home (rented furniture)", "Occupied home (use your furniture)"];
export const homeStagingCost: CustomCalculator = (v) => {
  const vacant = pick(v.type, 2) === 0, rooms = pos(v.rooms);
  const t = vacant ? pos(v.setupFee) + rooms * pos(v.monthlyPerRoom) * Math.max(1, pos(v.months, 1)) : pos(v.consultation) + rooms * 300;
  return res(t);
};

/* ---------- Materials ---------- */

export const MATERIAL_QUALITY = ["Basic / builder grade", "Standard", "Custom", "Luxury"];
const MAT_SPLIT = { foundation: 0.12, framing: 0.2, roofing: 0.07, windowsDoors: 0.1, siding: 0.08, mep: 0.15, insulationDrywall: 0.08, finishes: 0.2 };
export const houseMaterialCost: CustomCalculator = (v) => {
  const total = pos(v.sqft) * pos(v.basePerSqFt, 175) * [0.75, 1, 1.45, 2.1][pick(v.quality, 4)] * (pos(v.materialShare, 50) / 100) * adj(v);
  const out: Record<string, number> = { totalMaterials: r2(total), perSqFt: pos(v.sqft) > 0 ? r2(total / pos(v.sqft)) : 0 };
  for (const [k, s] of Object.entries(MAT_SPLIT)) out[k] = r2(total * s);
  return out;
};

export const hgHome2CustomCalculators: Record<string, CustomCalculator> = {
  "mold-remediation-cost-calculator": moldRemediationCost,
  "second-story-addition-cost-calculator": secondStoryAdditionCost,
  "pest-control-cost-calculator": pestControlCost,
  "stair-lift-cost-calculator": stairLiftCost,
  "impact-window-cost-calculator": impactWindowCost,
  "water-damage-repair-cost-calculator": waterDamageRepairCost,
  "tub-to-shower-cost-calculator": tubToShowerCost,
  "crawl-space-encapsulation-cost-calculator": crawlSpaceEncapsulationCost,
  "closet-cost-calculator": closetCost,
  "front-door-cost-calculator": frontDoorCost,
  "sunroom-cost-calculator": sunroomCost,
  "interior-demolition-cost-calculator": interiorDemolitionCost,
  "shed-removal-cost-calculator": shedRemovalCost,
  "glass-block-window-cost-calculator": glassBlockWindowCost,
  "basement-waterproofing-cost-calculator": basementWaterproofingCost,
  "asbestos-abatement-cost-calculator": asbestosAbatementCost,
  "furnish-house-cost-calculator": furnishHouseCost,
  "double-glazing-cost-calculator": doubleGlazingCost,
  "extension-cost-calculator": extensionCost,
  "conservatory-cost-calculator": conservatoryCost,
  "loft-conversion-cost-calculator": loftConversionCost,
  "interior-design-cost-calculator": interiorDesignCost,
  "garage-conversion-cost-calculator": garageConversionCost,
  "home-staging-cost-calculator": homeStagingCost,
  "house-material-cost-calculator": houseMaterialCost,
  "roller-shutter-cost-calculator": rollerShutterCost,
  "wall-removal-cost-calculator": wallRemovalCost,
};
