/**
 * Batch: "House & Garden Calculators" → Roofing & Gutter Calculators.
 *
 * Data / methods:
 *  - Pitch factor = √(1 + (rise ÷ 12)²); roof area = footprint (incl. overhangs) × pitch factor.
 *    A hip roof of one pitch has the same area as a gable roof over the same footprint.
 *  - Shingles: 3 bundles per square (100 sq ft); starter ≈ 105 linear ft per bundle; hip & ridge cap
 *    ≈ 33 linear ft per bundle; synthetic underlayment 10 squares per roll; 4 nails per shingle
 *    (6 in high-wind zones), 3-tab ≈ 78 and architectural ≈ 66 shingles per square.
 *  - Snow load (ASCE 7-16): flat-roof pf = 0.7·Ce·Ct·Is·pg; sloped ps = Cs·pf with Cs = 1 up to 30°,
 *    falling linearly to 0 at 70° (non-slippery, warm roof simplification).
 *  - Rafter spans from bending and deflection with NDS 2018 No. 2 design values: DF-L Fb 900 psi,
 *    E 1.6M; SPF 875 / 1.4M; Hem-Fir 850 / 1.3M; SYP by size 1,000 / 925 / 800 / 750, E 1.4M; size
 *    factors 1.3 / 1.2 / 1.1 / 1.0 (2×6–2×12, not SYP); repetitive 1.15; snow duration 1.15;
 *    live-load deflection L/180 (no ceiling). Results are planning estimates, not IRC table values.
 *  - Ridge beams: LVL Fb 2,600 psi, E 2.0M psi, deflection L/240 under total load.
 *  - Gutters (SMACNA-style): 5 in K-style ≈ 5,520 sq ft and 6 in ≈ 7,960 sq ft of roof per 1 in/hr of
 *    rainfall intensity; roof-pitch factors 1.0 / 1.05 / 1.1 / 1.2 / 1.3; one downspout per ~35 ft.
 *  - Attic ventilation (IRC R806): 1 sq ft NFA per 150 sq ft of attic, or 1/300 with a balanced
 *    system / vapor retarder; split about 50/50 intake and exhaust.
 *  - Material weights per square: 3-tab 230 lb, architectural 300, designer 400, metal 100,
 *    concrete tile 950, clay tile 1,100, slate 900, wood shake 350.
 *  - Slates per square = 14,400 ÷ (exposure × width), exposure = (length − headlap) ÷ 2.
 *  - Costs are typical 2026 US installed prices (editable inputs), not quotes. The federal 25D
 *    residential clean energy credit ended for systems installed after 31 December 2025, so the solar
 *    tool's credit input defaults to 0%.
 *
 * Self-contained: no imports from any other batch, per this project's established per-batch convention.
 * See prisma/create-hg-roof-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

const num = (x: number, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);
const pos = (x: number, d = 0) => Math.max(0, num(x, d));
const pick = (x: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(num(x))));
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;
const ceil = (x: number) => Math.ceil(x - 1e-9);
const spread = (t: number) => ({ costLow: r2(t * 0.85), costHigh: r2(t * 1.25) });
const DEG = 180 / Math.PI;
const pf = (rise: number) => Math.sqrt(1 + (rise / 12) ** 2);
const STORY = [1, 1.15, 1.3];

// ---------- Geometry ----------
export const PITCH_CLASSES = ["Flat (under 2/12) — membrane roofing", "Low slope (2/12–4/12) — limited shingle use, extra underlayment", "Conventional (4/12–9/12) — shingles, walkable", "Steep (over 9/12) — needs roof jacks / harness"];
export const roofPitch: CustomCalculator = (v) => {
  const run = pos(v.run, 12) || 12;
  const rise = pos(v.rise, 6);
  const per12 = (rise / run) * 12;
  return { pitchPer12: r2(per12), angleDeg: r1(Math.atan(rise / run) * DEG), slopePercent: r1((rise / run) * 100), pitchFactor: Math.round(pf(per12) * 1000) / 1000, pitchClass: per12 < 2 ? 0 : per12 < 4 ? 1 : per12 <= 9 ? 2 : 3 };
};

export const rafter: CustomCalculator = (v) => {
  const p = pos(v.pitch, 6), k = pf(p);
  const run = Math.max(0, pos(v.span, 24) / 2 - pos(v.ridgeThickness, 1.5) / 24);
  const len = run * k + (pos(v.overhang, 12) / 12) * k;
  const rafters = (Math.floor((pos(v.buildingLength, 40) * 12) / pos(v.spacing, 16)) + 1) * 2;
  return { rafterLengthFt: r2(len), lumberLengthFt: Math.ceil(len / 2) * 2, plumbCutDeg: r1(Math.atan(p / 12) * DEG), ridgeRiseFt: r2((run * p) / 12), rafters };
};

export const roofArea: CustomCalculator = (v) => {
  const oh = (pos(v.overhang, 12) / 12) * 2;
  const foot = (pos(v.length) + oh) * (pos(v.width) + oh);
  const a = foot * pf(pos(v.pitch, 6)) + pos(v.extraArea);
  const withWaste = a * (1 + pos(v.waste, 10) / 100);
  return { squares: r2(withWaste / 100), roofArea: Math.round(a), areaWithWaste: Math.round(withWaste), footprint: Math.round(foot) };
};

export const gableRoof: CustomCalculator = (v) => {
  const p = pos(v.pitch, 6), k = pf(p), oh = pos(v.overhang, 12) / 12, rake = pos(v.rakeOverhang, 12) / 12;
  const W = pos(v.width, 24), L = pos(v.length, 40);
  const raf = (W / 2 + oh) * k;
  const area = 2 * raf * (L + 2 * rake);
  return { roofArea: Math.round(area), squares: r2((area * 1.1) / 100), rafterLengthFt: r2(raf), ridgeLengthFt: r1(L + 2 * rake), gableEndSqFt: Math.round(((W * (W / 2) * p) / 12)), riseFt: r2(((W / 2) * p) / 12) };
};

export const hipRoof: CustomCalculator = (v) => {
  const p = pos(v.pitch, 6), k = pf(p), oh = pos(v.overhang, 12) / 12;
  const L = pos(v.length, 40) + 2 * oh, W = pos(v.width, 28) + 2 * oh;
  const run = Math.min(L, W) / 2, rise = (run * p) / 12;
  const hip = Math.sqrt(2 * run * run + rise * rise);
  const ridge = Math.max(0, Math.abs(L - W));
  const area = L * W * k;
  return { roofArea: Math.round(area), squares: r2((area * 1.15) / 100), hipRafterFt: r2(hip), commonRafterFt: r2(run * k), ridgeLengthFt: r1(ridge), hipAndRidgeFt: r1(4 * hip + ridge) };
};

export const gambrelRoof: CustomCalculator = (v) => {
  const W = pos(v.width, 24), R = W / 2;
  const chord = 2 * R * Math.sin(22.5 / DEG);
  const trusses = Math.floor((pos(v.length, 32) * 12) / pos(v.spacing, 24)) + 1;
  return { rafterLengthFt: r2(chord), heightFt: r2(R), lowerAngleDeg: 67.5, upperAngleDeg: 22.5, roofArea: Math.round(4 * chord * pos(v.length, 32)), trusses };
};

export const shedRoofPitch: CustomCalculator = (v) => {
  const run = pos(v.run, 10), rise = Math.max(0, pos(v.highWall, 9) - pos(v.lowWall, 7));
  const per12 = run ? (rise / run) * 12 : 0;
  const len = Math.sqrt(run * run + rise * rise) + (pos(v.overhang, 12) / 12) * 2 * pf(per12);
  return { pitchPer12: r2(per12), angleDeg: r1(Math.atan2(rise, run) * DEG), rafterLengthFt: r2(len), riseIn: r1(rise * 12) };
};

export const birdsmouth: CustomCalculator = (v) => {
  const p = pos(v.pitch, 6), depth = pos(v.rafterDepth, 7.25), seat = pos(v.seat, 3.5);
  const plumb = (seat * p) / 12;
  const vertical = depth / Math.cos(Math.atan(p / 12));
  return { plumbCutIn: r2(plumb), seatCutIn: seat, heightAbovePlateIn: r2(vertical - plumb), okay: plumb <= depth / 3 ? 1 : 0, maxSeatIn: r2(((depth / 3) * 12) / Math.max(0.01, p)) };
};
export const BIRDSMOUTH_OK = ["Too deep — cut is over 1/3 of the rafter depth; shorten the seat or use a bigger rafter", "OK — cut is within 1/3 of the rafter depth"];

export const TRUSS_TYPES = ["Common (Fink / W)", "King post", "Scissor", "Mono (single slope)", "Attic (room-in-attic)", "Gambrel"];
const WEB = [1.3, 0.6, 1.4, 1.0, 1.6, 1.5];
export const roofTruss: CustomCalculator = (v) => {
  const t = pick(v.type, TRUSS_TYPES.length), span = pos(v.span, 24), p = pos(v.pitch, 6);
  const run = t === 3 ? span : span / 2;
  const top = (run + pos(v.overhang, 12) / 12) * pf(p) * (t === 3 ? 1 : 2);
  const count = Math.floor((pos(v.buildingLength, 40) * 12) / pos(v.spacing, 24)) + 1;
  const lumber = (top + span) * (1 + WEB[t]);
  return { trusses: count, heightFt: r2((run * p) / 12), topChordFt: r2(top), lumberPerTrussFt: Math.round(lumber), cost: r2(count * span * pos(v.pricePerFtSpan, 8) * (t >= 2 ? 1.4 : 1)) };
};

// ---------- Structural ----------
export const LUMBER = ["2×6", "2×8", "2×10", "2×12"];
const DEPTH = [5.5, 7.25, 9.25, 11.25];
const CF = [1.3, 1.2, 1.1, 1.0];
export const SPECIES = ["Douglas fir-larch No. 2", "Spruce-pine-fir No. 2", "Hem-fir No. 2", "Southern yellow pine No. 2"];
const FB = [900, 875, 850, 0];
const SYP_FB = [1000, 925, 800, 750];
const EMOD = [1.6e6, 1.4e6, 1.3e6, 1.4e6];
export const rafterSpan: CustomCalculator = (v) => {
  const s = pick(v.size, 4), sp = pick(v.species, 4);
  const b = 1.5, d = DEPTH[s];
  const S = (b * d * d) / 6, I = (b * d ** 3) / 12;
  const Fb = (sp === 3 ? SYP_FB[s] : FB[sp] * CF[s]) * 1.15 * 1.15;
  const live = [20, 30, 50, 70][pick(v.load, 4)], dead = pos(v.deadLoad, 10);
  const spacing = [12, 16, 24][pick(v.spacing, 3)];
  const wTot = ((live + dead) * spacing) / 12; // lb per ft
  const wLive = (live * spacing) / 12;
  const Lb = Math.sqrt((8 * Fb * S) / 12 / wTot); // ft
  const Ld = Math.pow((384 * EMOD[sp] * I) / (5 * (wLive / 12) * 180), 1 / 3) / 12; // ft, L/180
  const L = Math.min(Lb, Ld);
  return { maxSpanFt: r2(L), feet: Math.floor(L), inches: Math.round((L - Math.floor(L)) * 12), bendingLimitFt: r2(Lb), deflectionLimitFt: r2(Ld) };
};

const LVL_DEPTHS = [9.25, 11.25, 11.875, 14, 16, 18];
export const ridgeBeam: CustomCalculator = (v) => {
  const L = pos(v.beamSpan, 16), trib = pos(v.buildingWidth, 24) / 2;
  const w = (pos(v.snowLoad, 30) + pos(v.deadLoad, 15)) * trib; // lb/ft
  const M = (w * L * L) / 8; // lb-ft
  const Sreq = (M * 12) / 2600;
  for (let plies = 2; plies <= 4; plies++)
    for (let i = 0; i < LVL_DEPTHS.length; i++) {
      const b = 1.75 * plies, d = LVL_DEPTHS[i];
      const S = (b * d * d) / 6, I = (b * d ** 3) / 12;
      const defl = (5 * (w / 12) * (L * 12) ** 4) / (384 * 2.0e6 * I);
      if (S >= Sreq && defl <= (L * 12) / 240) return { plies, depthIn: d, widthIn: r2(b), requiredSectionModulus: r1(Sreq), momentLbFt: Math.round(M), loadPerFt: Math.round(w) };
    }
  return { plies: 0, depthIn: 0, widthIn: 0, requiredSectionModulus: r1(Sreq), momentLbFt: Math.round(M), loadPerFt: Math.round(w) };
};

export const snowLoad: CustomCalculator = (v) => {
  const Ce = [0.9, 1.0, 1.1][pick(v.exposure, 3)], Ct = [1.0, 1.1, 1.2][pick(v.thermal, 3)];
  const pfl = 0.7 * Ce * Ct * pos(v.importance, 1) * pos(v.groundSnow, 30);
  const ang = pos(v.slopeDeg, 26.6);
  const Cs = ang <= 30 ? 1 : ang >= 70 ? 0 : (70 - ang) / 40;
  const ps = Cs * pfl;
  const deadPsf = [3, 1.5, 10, 9, 4.5][pick(v.roofing, 5)] + pos(v.otherDead, 7);
  return { designSnowPsf: r1(ps), flatRoofSnowPsf: r1(pfl), deadLoadPsf: r1(deadPsf), totalPsf: r1(ps + deadPsf), totalLb: Math.round((ps + deadPsf) * pos(v.roofArea, 1500)) };
};

export const purlinSpacing: CustomCalculator = (v) => {
  const g = pick(v.gauge, 3), load = pick(v.snow, 3);
  const spacing = [[24, 18, 12], [36, 24, 18], [48, 36, 24]][g][load];
  const rows = ceil((pos(v.slopeLength, 12) * 12) / spacing) + 1;
  const ts = pos(v.trussSpacing, 2);
  const size = ts <= 2 ? 0 : ts <= 4 ? 1 : ts <= 6 ? 2 : 3;
  return { spacingIn: spacing, rows, linearFeet: Math.ceil(rows * pos(v.roofLength, 30) * Math.max(1, pos(v.sides, 2))), purlinSize: size };
};
export const PURLIN_SIZES = ["2×4 laid flat (trusses up to 2 ft apart)", "2×4 on edge (trusses up to 4 ft apart)", "2×6 on edge (up to 6 ft)", "2×8 on edge or steel purlins (over 6 ft) — get it engineered"];

// ---------- Shingles & materials ----------
export const shingle: CustomCalculator = (v) => {
  const a = pos(v.roofArea, 2000) * (1 + pos(v.waste, 10) / 100);
  const sq = a / 100;
  return { bundles: ceil(sq * pos(v.bundlesPerSquare, 3)), squares: r2(sq), starterBundles: ceil(pos(v.eavesRakes) / 105), ridgeCapBundles: ceil(pos(v.hipRidge) / 33), underlaymentRolls: ceil(sq / 10), nailsLb: ceil(sq * 2.5) };
};

export const ROOF_MATS = ["3-tab asphalt shingles", "Architectural shingles", "Designer / luxury shingles", "Metal panels", "Concrete tile", "Clay tile", "Slate", "Wood shakes"];
const MAT_LB = [230, 300, 400, 100, 950, 1100, 900, 350];
export const shingleWeight: CustomCalculator = (v) => {
  const sq = pos(v.squares, 20), lb = sq * MAT_LB[pick(v.material, MAT_LB.length)] * Math.max(1, pos(v.layers, 1));
  return { totalLb: Math.round(lb), tons: r2(lb / 2000), psf: r1(lb / Math.max(1, sq * 100)), perSquareLb: MAT_LB[pick(v.material, MAT_LB.length)], bundleLb: [77, 75, 100, 0, 0, 0, 0, 0][pick(v.material, 8)] || 0 };
};

export const roofingNails: CustomCalculator = (v) => {
  const perSq = [78, 66][pick(v.shingle, 2)] * [4, 6][pick(v.pattern, 2)];
  const nails = Math.round(pos(v.squares, 20) * perSq * 1.05);
  return { nails, pounds: r1(nails / 140), coilBoxes: ceil(nails / 7200), nailsPerSquare: perSq };
};

export const iceWaterShield: CustomCalculator = (v) => {
  const k = pf(pos(v.pitch, 6));
  const up = ((pos(v.overhang, 12) + pos(v.insideWall, 24) + 6) / 12) * k;
  const courses = ceil(up / 2.75);
  const sqft = (pos(v.eaves) * courses * 3 + pos(v.valleys) * 3) * 1.1;
  const roll = [200, 150, 225][pick(v.roll, 3)];
  return { rolls: ceil(sqft / roll), sqFt: Math.round(sqft), courses, upSlopeFt: r2(up) };
};

export const metalRoof: CustomCalculator = (v) => {
  const t = pick(v.type, 3);
  const cover = pos(v.panelWidth, 36) || 36;
  const perSide = ceil((pos(v.roofLength, 40) * 12) / cover);
  const sides = Math.max(1, Math.round(pos(v.sides, 2)));
  const area = pos(v.roofLength, 40) * (pos(v.run, 14) + 2 / 12) * sides;
  return { panels: perSide * sides, panelLengthFt: r2(pos(v.run, 14) + 2 / 12), screws: t === 0 ? Math.round(area * 0.8) : 0, clips: t === 0 ? 0 : Math.round(area / 2.5), ridgeCapFt: sides > 1 ? Math.ceil(pos(v.roofLength, 40)) : 0, trimFt: Math.ceil(pos(v.roofLength, 40) * sides + pos(v.run, 14) * 2 * sides), minSlope: [3, 3, 0.5][t] };
};
export const METAL_TYPES = ["Exposed-fastener (corrugated / ribbed)", "Snap-lock standing seam", "Mechanically seamed standing seam"];

export const roofTile: CustomCalculator = (v) => {
  const PER_M2 = [60, 9.8, 16, 9.6], GAUGE = [100, 345, 250, 340];
  const t = pick(v.tile, 4), slope = pos(v.slopeLength, 5), width = pos(v.roofWidth, 10), sides = Math.max(1, Math.round(pos(v.sides, 2)));
  const area = slope * width * sides;
  const rows = ceil((slope * 1000) / GAUGE[t]);
  return { tiles: Math.ceil(area * PER_M2[t] * 1.05), roofAreaM2: r1(area), battenMetres: Math.ceil(rows * width * sides * 1.05), ridgeTiles: ceil(pos(v.ridgeLength, 10) / 0.45), membraneM2: Math.ceil(area * 1.1) };
};
export const TILE_TYPES = ["Plain tiles (265 × 165 mm)", "Concrete interlocking (e.g. Marley Modern)", "Clay pantiles", "Double Roman"];

export const slateRoof: CustomCalculator = (v) => {
  const len = [12, 14, 16, 18, 20, 24][pick(v.slateLength, 6)], w = pos(v.slateWidth, 10) || len / 2;
  const exposure = (len - pos(v.headlap, 3)) / 2;
  const perSq = Math.ceil(14400 / (exposure * w));
  const sq = pos(v.roofArea, 2000) / 100;
  return { slates: Math.ceil(perSq * sq * 1.1), slatesPerSquare: perSq, exposureIn: r2(exposure), weightLb: Math.round(sq * 900), cost: r2(sq * pos(v.costPerSquare, 2000)) };
};

export const flatRoofMaterial: CustomCalculator = (v) => {
  const L = pos(v.length, 30), W = pos(v.width, 20), sheet = [10, 20, 10][pick(v.membrane, 3)];
  const strips = ceil(W / (sheet - 0.5));
  const order = strips * sheet * (L + 1);
  return { membraneSqFt: Math.ceil(order), strips, adhesiveGallons: pick(v.membrane, 3) < 2 ? ceil((L * W * 2) / 65) : 0, seamTapeFt: Math.max(0, strips - 1) * Math.ceil(L), edgeTrimFt: Math.ceil(2 * (L + W)), insulationBoards: ceil((L * W) / 32) };
};
export const MEMBRANES = ["EPDM 10 ft wide", "EPDM 20 ft wide", "TPO 10 ft wide (heat-welded)"];

export const flatRoofSlope: CustomCalculator = (v) => {
  const run = pos(v.run, 20), per = [0.25, 0.125, 0.5][pick(v.slope, 3)];
  const fall = run * per;
  return { fallIn: r2(fall), highEndThicknessIn: r2(pos(v.minThickness, 0.5) + fall), slopePercent: r2((per / 12) * 100), angleDeg: r2(Math.atan(per / 12) * DEG) };
};

// ---------- Ventilation, soffit, gutters ----------
export const atticVentilation: CustomCalculator = (v) => {
  const nfaSqFt = pos(v.atticArea, 1500) / (pick(v.ratio, 2) ? 300 : 150);
  const sqIn = nfaSqFt * 144;
  const intake = sqIn * (pos(v.intakeShare, 50) / 100), exhaust = sqIn - intake;
  return { totalNfaSqIn: Math.round(sqIn), intakeSqIn: Math.round(intake), exhaustSqIn: Math.round(exhaust), ridgeVentFt: ceil(exhaust / pos(v.ridgeNfa, 18)), boxVents: ceil(exhaust / pos(v.boxNfa, 50)), soffitVents: ceil(intake / pos(v.soffitNfa, 56)), continuousSoffitFt: ceil(intake / 9) };
};

export const soffit: CustomCalculator = (v) => {
  const sqft = pos(v.eaveLength, 150) * (pos(v.overhang, 16) / 12);
  const panel = [12, 16][pick(v.panel, 2)];
  const panels = ceil((sqft * 1.1) / panel);
  return { panels, sqFt: Math.round(sqft), channelFt: Math.ceil(pos(v.eaveLength, 150) * 2 * 1.05), ventedPanels: Math.round(panels * (pos(v.ventedShare, 50) / 100)) };
};

export const gutter: CustomCalculator = (v) => {
  const L = pos(v.gutterFeet, 120), runs = Math.max(1, Math.round(pos(v.runs, 4)));
  const ds = Math.max(runs, ceil(L / 35));
  return { gutterFeet: Math.ceil(L * 1.05), downspouts: ds, downspoutFeet: Math.ceil(ds * pos(v.wallHeight, 10) + ds * 2), hangers: ceil(L / 2), endCaps: runs * 2, elbows: ds * 3, totalDropIn: r2(((L / runs) / 10) * 0.25) };
};

const GPF = [1, 1.05, 1.1, 1.2, 1.3];
export const GUTTER_SIZES = ["5 in K-style", "6 in K-style", "7 in K-style or box gutter / extra downspouts"];
export const gutterSize: CustomCalculator = (v) => {
  const eff = pos(v.roofArea, 1500) * GPF[pick(v.pitch, 5)];
  const demand = eff * pos(v.intensity, 6);
  const s = demand <= 5520 ? 0 : demand <= 7960 ? 1 : 2;
  return { gutterSize: s, effectiveArea: Math.round(eff), downspouts2x3: ceil(demand / 3600), downspouts3x4: ceil(demand / 7200) };
};

export const snowGuard: CustomCalculator = (v) => {
  const slope = pos(v.slopeLength, 16), snow = pos(v.groundSnow, 30);
  const rows = slope <= 20 && snow <= 30 ? 1 : slope <= 30 && snow <= 60 ? 2 : 3;
  const spacing = [24, 18, 12][pick(v.roof, 3)];
  const perRow = ceil((pos(v.eaveLength, 40) * 12) / spacing);
  return { guards: perRow * rows, rows, perRow, spacingIn: spacing };
};

// ---------- Costs ----------
export const METAL_ROOF_TYPES = ["Exposed-fastener steel (corrugated / ribbed)", "Standing seam steel", "Standing seam aluminum", "Stone-coated / metal shingles", "Copper or zinc"];
const METAL_RATE = [9, 14, 17, 12, 30];
export const metalRoofCost: CustomCalculator = (v) => {
  const a = pos(v.roofArea, 2000);
  const total = a * (pos(v.customRate) || METAL_RATE[pick(v.type, 5)]) + (pick(v.tearOff, 2) ? a * 1.5 : 0);
  return { totalCost: r2(total), ...spread(total), costPerSquare: a ? r2((total / a) * 100) : 0 };
};

export const FLAT_ROOF_TYPES = ["EPDM (rubber)", "TPO", "PVC", "Modified bitumen", "Built-up (tar & gravel)", "Liquid coating overlay"];
const FLAT_RATE = [8, 9, 11, 7, 8, 5];
export const flatRoofCost: CustomCalculator = (v) => {
  const a = pos(v.area, 1000);
  const total = Math.max(1500, a * (pos(v.customRate) || FLAT_RATE[pick(v.type, 6)]) + (pick(v.tearOff, 2) ? a * 1.5 : 0) + (pick(v.insulation, 2) ? a * 2 : 0));
  return { totalCost: r2(total), ...spread(total), costPerSqFt: a ? r2(total / a) : 0 };
};

export const COMMERCIAL_SYSTEMS = ["TPO", "EPDM", "PVC", "Modified bitumen", "Built-up (BUR)", "Standing seam metal", "Spray foam (SPF)", "Coating restoration"];
const COMM_RATE = [8, 7.5, 10, 7, 8, 14, 6, 4];
export const commercialRoofCost: CustomCalculator = (v) => {
  const a = pos(v.area, 20000);
  const total = a * (pos(v.customRate) || COMM_RATE[pick(v.system, COMM_RATE.length)]) + (pick(v.tearOff, 2) ? a * 2 : 0) + (pick(v.insulation, 2) ? a * 2.5 : 0);
  return { totalCost: r2(total), ...spread(total), costPerSqFt: a ? r2(total / a) : 0 };
};

export const solarRoofCost: CustomCalculator = (v) => {
  const a = pos(v.roofArea, 2000), active = a * (pos(v.activeShare, 40) / 100);
  const gross = active * pos(v.activeRate, 42) + (a - active) * pos(v.inactiveRate, 14) + (pick(v.tearOff, 2) ? a * 1.5 : 0) + pos(v.battery);
  const credit = gross * (pos(v.taxCredit) / 100);
  const kw = active * 0.015;
  return { netCost: r2(gross - credit), grossCost: r2(gross), systemKw: r2(kw), annualKwh: Math.round(kw * pos(v.kwhPerKw, 1300)), costPerWatt: kw ? r2((gross - credit) / (kw * 1000)) : 0 };
};

export const roofCoatingCost: CustomCalculator = (v) => {
  const rate = pos(v.customRate) || [1, 3, 2.5, 2, 5][pick(v.type, 5)];
  const total = Math.max(500, pos(v.area, 2000) * rate);
  return { totalCost: r2(total), ...spread(total), costPerSqFt: r2(rate) };
};
export const COATING_TYPES = ["Asphalt shingle rejuvenation (e.g. Roof Maxx)", "Silicone coating", "Acrylic coating", "Elastomeric coating", "Spray foam + coating"];

export const roofPaint: CustomCalculator = (v) => {
  const cov = [100, 250, 100][pick(v.product, 3)];
  const gal = (pos(v.area, 1500) * Math.max(1, pos(v.coats, 2))) / cov * 1.05;
  const buckets = ceil(gal / 5);
  return { gallons: r1(gal), buckets5gal: buckets, materialCost: r2(buckets * pos(v.bucketPrice, 150)), proCost: r2(pos(v.area, 1500) * pos(v.proRate, 2)) };
};
export const ROOF_PAINTS = ["Elastomeric roof coating", "Acrylic roof paint", "Silicone roof coating"];

export const roofCleaningCost: CustomCalculator = (v) => {
  const total = Math.max(300, pos(v.area, 2000) * [0.35, 0.6, 0.3][pick(v.method, 3)] * STORY[pick(v.stories, 3)]);
  return { totalCost: r2(total), ...spread(total) };
};

export const roofTearOffCost: CustomCalculator = (v) => {
  const sq = pos(v.squares, 20), layers = Math.max(1, Math.round(pos(v.layers, 1)));
  const lbPerSq = [230, 350, 950, 900][pick(v.material, 4)];
  const tons = (sq * lbPerSq * layers) / 2000;
  const total = sq * pos(v.laborPerSquare, 100) * layers * [1, 1.2, 1.6, 1.6][pick(v.material, 4)] + tons * pos(v.disposalPerTon, 60);
  return { totalCost: r2(total), debrisTons: r2(tons), dumpsters20yd: ceil(tons / 3), ...spread(total) };
};

export const roofingLaborCost: CustomCalculator = (v) => {
  const sq = pos(v.squares, 20);
  const labor = sq * pos(v.ratePerSquare, 150) * [1, 1.15, 1.3][pick(v.steepness, 3)] * STORY[pick(v.stories, 3)] + sq * pos(v.tearOffLayers) * 50;
  return { laborCost: r2(labor), perSquare: sq ? r2(labor / sq) : 0, ...spread(labor) };
};

export const REPAIRS = ["Replace missing shingles", "Leak repair", "Flashing repair", "Valley repair", "Chimney flashing", "Skylight reflashing", "Sagging / structural repair"];
const REPAIR_RATE = [300, 450, 500, 650, 700, 550, 2500];
export const roofRepairCost: CustomCalculator = (v) => {
  const total = pos(v.quantity, 1) * REPAIR_RATE[pick(v.repair, REPAIR_RATE.length)] * [1, 1.2, 1.5, 2][pick(v.roof, 4)] * STORY[pick(v.stories, 3)];
  return { totalCost: r2(total), ...spread(total) };
};

export const gutterCleaningCost: CustomCalculator = (v) => {
  const total = Math.max(100, pos(v.feet, 150) * pos(v.ratePerFoot, 1) * STORY[pick(v.stories, 3)] * (pick(v.guards, 2) ? 1.5 : 1) + pos(v.downspouts) * 10);
  return { totalCost: r2(total), ...spread(total), yearlyCost: r2(total * Math.max(1, pos(v.timesPerYear, 2))) };
};

export const soffitFasciaCost: CustomCalculator = (v) => {
  const f = STORY[pick(v.stories, 3)];
  const soffitC = pos(v.soffitFeet, 150) * [7, 9, 14][pick(v.soffitMat, 3)] * f;
  const fasciaC = pos(v.fasciaFeet, 150) * [6, 9, 12][pick(v.fasciaMat, 3)] * f;
  const total = soffitC + fasciaC;
  return { totalCost: r2(total), ...spread(total), soffitCost: r2(soffitC), fasciaCost: r2(fasciaC) };
};

export const DORMERS = ["Gable (doghouse) dormer", "Shed dormer (priced per ft of width)", "Hip dormer", "Eyebrow dormer"];
export const dormerCost: CustomCalculator = (v) => {
  const t = pick(v.type, 4);
  const each = t === 1 ? pos(v.width, 12) * 2500 : [15000, 0, 18000, 20000][t];
  const total = Math.max(1, pos(v.count, 1)) * (each + (pick(v.finish, 2) ? 5000 : 0));
  return { totalCost: r2(total), ...spread(total), perDormer: r2(total / Math.max(1, pos(v.count, 1))) };
};

const LIFE = [20, 25, 50, 50, 75, 20];
export const LIFE_TYPES = ["3-tab asphalt (20 yr)", "Architectural shingles (25 yr)", "Metal (50 yr)", "Tile (50 yr)", "Slate (75 yr)", "Flat / TPO / EPDM (20 yr)"];
export const roofDepreciation: CustomCalculator = (v) => {
  const life = pos(v.customLife) || LIFE[pick(v.type, LIFE.length)];
  const dep = Math.min(1, pos(v.age, 10) / life);
  const rcv = pos(v.replacementCost, 15000);
  return { actualCashValue: r2(rcv * (1 - dep)), depreciationPercent: r1(dep * 100), depreciationAmount: r2(rcv * dep), remainingLifeYears: r1(Math.max(0, life - pos(v.age, 10))), lifeYears: life };
};

/** Regional replacement cost (Florida / Austin). */
function regionalRoof(rates: number[], extras: (v: Record<string, number>, a: number) => number): CustomCalculator {
  return (v) => {
    const a = pos(v.roofArea, 2000);
    const total = a * (pos(v.customRate) || rates[pick(v.material, rates.length)]) + extras(v, a) + pos(v.permit, 500);
    return { totalCost: r2(total), ...spread(total), costPerSquare: a ? r2((total / a) * 100) : 0 };
  };
}
export const REGIONAL_MATERIALS = ["Architectural shingles", "Metal (standing seam)", "Concrete tile", "Clay tile", "Flat roof (TPO / mod-bit)"];
export const floridaRoofCost = regionalRoof([6, 14, 13, 18, 9], (v, a) => (pick(v.hvhz, 2) ? a * 1.2 : 0) + (pick(v.secondaryBarrier, 2) ? a * 0.6 : 0));
export const austinRoofCost = regionalRoof([5.5, 13, 12, 17, 9], (v, a) => (pick(v.class4, 2) ? a * 0.75 : 0) + (pick(v.tearOff2, 2) ? a * 0.5 : 0));

export const hgRoofCustomCalculators: Record<string, CustomCalculator> = {
  "roof-pitch-calculator": roofPitch,
  "rafter-calculator": rafter,
  "roof-area-calculator": roofArea,
  "gable-roof-calculator": gableRoof,
  "hip-roof-calculator": hipRoof,
  "gambrel-roof-calculator": gambrelRoof,
  "shed-roof-pitch-calculator": shedRoofPitch,
  "birdsmouth-calculator": birdsmouth,
  "roof-truss-calculator": roofTruss,
  "rafter-span-calculator": rafterSpan,
  "ridge-beam-calculator": ridgeBeam,
  "roof-snow-load-calculator": snowLoad,
  "purlin-spacing-calculator": purlinSpacing,
  "shingle-calculator": shingle,
  "shingle-weight-calculator": shingleWeight,
  "roofing-nails-calculator": roofingNails,
  "ice-water-shield-calculator": iceWaterShield,
  "metal-roof-calculator": metalRoof,
  "roof-tile-calculator": roofTile,
  "slate-roof-calculator": slateRoof,
  "flat-roof-material-calculator": flatRoofMaterial,
  "flat-roof-slope-calculator": flatRoofSlope,
  "attic-ventilation-calculator": atticVentilation,
  "soffit-calculator": soffit,
  "gutter-calculator": gutter,
  "gutter-size-calculator": gutterSize,
  "snow-guard-calculator": snowGuard,
  "metal-roof-cost-calculator": metalRoofCost,
  "flat-roof-cost-calculator": flatRoofCost,
  "commercial-roof-cost-calculator": commercialRoofCost,
  "solar-roof-cost-calculator": solarRoofCost,
  "roof-coating-cost-calculator": roofCoatingCost,
  "roof-paint-calculator": roofPaint,
  "roof-cleaning-cost-calculator": roofCleaningCost,
  "roof-tear-off-cost-calculator": roofTearOffCost,
  "roofing-labor-cost-calculator": roofingLaborCost,
  "roof-repair-cost-calculator": roofRepairCost,
  "gutter-cleaning-cost-calculator": gutterCleaningCost,
  "soffit-fascia-cost-calculator": soffitFasciaCost,
  "dormer-cost-calculator": dormerCost,
  "roof-depreciation-calculator": roofDepreciation,
  "florida-roof-cost-calculator": floridaRoofCost,
  "austin-roof-cost-calculator": austinRoofCost,
};
