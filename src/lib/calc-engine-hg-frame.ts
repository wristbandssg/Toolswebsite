/**
 * Batch: "House & Garden Calculators" → Framing, Drywall, Insulation & Siding Calculators.
 *
 * Data / methods:
 *  - Joist spans from bending and deflection with NDS 2018 No. 2 values (as in the rafter tool):
 *    DF-L Fb 900 psi E 1.6M; SPF 875 / 1.4M; Hem-fir 850 / 1.3M; SYP 1,000/925/800/750 by size, E 1.4M;
 *    size factors 1.3/1.2/1.1/1.0 (2×6–2×12, not SYP); repetitive 1.15; floors L/360, ceilings L/240;
 *    deck joists use wet-service factors (Fb × 0.85, E × 0.9).
 *  - Drywall: screws ≈ 32 per sheet on walls, 40 on ceilings; ready-mix joint compound ≈ 138 lb per
 *    1,000 sq ft for a level-4 finish (USG), 61 lb per 4.5 gal bucket; paper tape ≈ 370 ft per 1,000 sq ft.
 *  - Insulation R per inch: fiberglass batts 3.2, blown fiberglass 2.5, cellulose 3.6, open-cell foam 3.7,
 *    closed-cell foam 6.5. Blown bags assumed to hold about 1,500 (fiberglass) / 1,200 (cellulose) R·sq ft.
 *  - Insulation savings: Q = A·(1/R1 − 1/R2)·HDD·24 BTU; fuels: gas 100,000 BTU/therm, propane 91,500 BTU/gal,
 *    oil 138,500 BTU/gal, electricity 3,412 BTU/kWh (heat pump at COP 2.5); cooling kWh = Q_cool ÷ (SEER × 1,000).
 *  - Equilibrium moisture content: Simpson (1973) Hailwood–Horrobin fit (USDA Wood Handbook). Shrinkage:
 *    ΔW = W × C × ΔMC with dimensional-change coefficients per % MC (tangential / radial) from the Wood Handbook.
 *  - Crown molding cut flat on a compound saw: miter = atan(sin S ÷ tan(A/2)), bevel = asin(cos S · cos(A/2)).
 *  - Geodesic dome chord factors: 2V A 0.54653 / B 0.61803; 3V (5/8 dome) A 0.34862 / B 0.40355 / C 0.41241.
 *  - Typical STC ratings of common wall assemblies (Gypsum Association / NRC test families).
 *  - Workbench heights from typical standing wrist (≈ 0.485 × stature) and elbow (≈ 0.63 × stature) heights.
 *  - Costs are typical 2026 US prices (editable inputs), not quotes.
 *
 * Self-contained: no imports from any other batch, per this project's established per-batch convention.
 * See prisma/create-hg-frame-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

const num = (x: number, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);
const pos = (x: number, d = 0) => Math.max(0, num(x, d));
const pick = (x: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(num(x))));
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;
const ceil = (x: number) => Math.ceil(x - 1e-9);
const spread = (t: number) => ({ costLow: r2(t * 0.85), costHigh: r2(t * 1.25) });
const DEG = 180 / Math.PI, RAD = Math.PI / 180;

// ---------- Drywall ----------
const SHEET = [32, 40, 48];
export const drywall: CustomCalculator = (v) => {
  const L = pos(v.length, 12), W = pos(v.width, 12), H = pos(v.height, 8);
  const walls = Math.max(0, 2 * (L + W) * H - pos(v.doors) * 21 - pos(v.windows) * 15);
  const ceiling = pick(v.ceiling, 2) ? L * W : 0;
  const area = walls + ceiling;
  const sh = SHEET[pick(v.sheet, 3)];
  const sheets = ceil((walls / sh) * 1.1) + ceil((ceiling / sh) * 1.1);
  return { sheets, area: Math.round(area), wallArea: Math.round(walls), ceilingArea: Math.round(ceiling), screws: Math.round((walls / sh) * 32 + (ceiling / sh) * 40), mudBuckets: ceil((area * 0.138) / 61), tapeFeet: Math.ceil(area * 0.37) };
};

const MUD_FACTOR = [0.85, 1, 1.6];
export const drywallMud: CustomCalculator = (v) => {
  const lb = pos(v.area, 1000) * 0.138 * MUD_FACTOR[pick(v.level, 3)];
  return { buckets: ceil(lb / 61), pounds: Math.round(lb), gallons: r1(lb / 13.5), tapeRolls: ceil((pos(v.area, 1000) * 0.37) / 500), powderBags: ceil(lb / 1.3 / 18) };
};

export const drywallRepairCost: CustomCalculator = (v) => {
  const total = Math.max(150, pos(v.small) * 100 + pos(v.medium) * 200 + pos(v.large) * 400 + pos(v.ceilingSqFt) * 8 + (pick(v.texture, 2) ? (pos(v.small) + pos(v.medium) + pos(v.large)) * 50 : 0) + (pick(v.paint, 2) ? 150 : 0));
  return { totalCost: r2(total), ...spread(total) };
};

// ---------- Framing ----------
export const FRAMING_MODES = ["Whole house — labor + materials (per sq ft of floor)", "Whole house — labor only (per sq ft)", "Interior wood stud walls (per linear ft)", "Interior metal stud walls (per linear ft)"];
const FRAMING_RATE = [18, 8, 30, 35];
export const framingCost: CustomCalculator = (v) => {
  const rate = pos(v.customRate) || FRAMING_RATE[pick(v.mode, 4)];
  const total = pos(v.quantity, 2000) * rate;
  return { totalCost: r2(total), ...spread(total), rate };
};

export const framingNails: CustomCalculator = (v) => {
  const wallNails = pos(v.wallFeet, 200) * (12 / pos(v.studSpacing, 16) * 4 + 0.75 + 1.5) * 1.2;
  const sheathNails = pos(v.sheathingSheets) * 50 + pos(v.deckSheets) * 60;
  return { framingNails16d: Math.round(wallNails), framingLb: Math.ceil(wallNails / 47), sheathingNails8d: Math.round(sheathNails), sheathingLb: Math.ceil(sheathNails / 106), boxes: ceil((wallNails + sheathNails) / 2500) };
};

export const rakeWall: CustomCalculator = (v) => {
  const sp = pos(v.spacing, 16), p = pos(v.pitch, 4);
  const studs = Math.floor((pos(v.length, 12) * 12) / sp) + 1;
  const inc = (sp * p) / 12;
  const plate = Math.sqrt((pos(v.length, 12) * 12) ** 2 + (pos(v.length, 12) * p) ** 2) / 12;
  return { studs, shortestStudIn: r2(pos(v.lowHeight, 92.625)), tallestStudIn: r2(pos(v.lowHeight, 92.625) + (studs - 1) * inc), incrementIn: r2(inc), topPlateFt: r2(plate), angleDeg: r1(Math.atan(p / 12) * DEG) };
};

const DEPTH = [5.5, 7.25, 9.25, 11.25];
const CF = [1.3, 1.2, 1.1, 1.0];
const FB = [900, 875, 850, 0], SYP = [1000, 925, 800, 750], EM = [1.6e6, 1.4e6, 1.3e6, 1.4e6];
export const LUMBER = ["2×6", "2×8", "2×10", "2×12"];
export const SPECIES = ["Douglas fir-larch No. 2", "Spruce-pine-fir No. 2", "Hem-fir No. 2", "Southern yellow pine No. 2"];
export const JOIST_USES = ["Floor — living areas (40 psf live, L/360)", "Floor — sleeping rooms (30 psf, L/360)", "Deck joists (40 psf, wet, L/360)", "Ceiling — no attic storage (10 psf, L/240)", "Ceiling — limited storage (20 psf, L/240)"];
const USE_LIVE = [40, 30, 40, 10, 20], USE_DEAD = [10, 10, 10, 5, 10], USE_DEFL = [360, 360, 360, 240, 240];
export const joistSpan: CustomCalculator = (v) => {
  const s = pick(v.size, 4), sp = pick(v.species, 4), u = pick(v.use, 5);
  const wet = u === 2;
  const d = DEPTH[s], S = (1.5 * d * d) / 6, I = (1.5 * d ** 3) / 12;
  const Fb = (sp === 3 ? SYP[s] : FB[sp] * CF[s]) * 1.15 * (wet ? 0.85 : 1);
  const E = EM[sp] * (wet ? 0.9 : 1);
  const spacing = [12, 16, 19.2, 24][pick(v.spacing, 4)];
  const wT = ((USE_LIVE[u] + USE_DEAD[u]) * spacing) / 12, wL = (USE_LIVE[u] * spacing) / 12;
  const Lb = Math.sqrt((8 * Fb * S) / 12 / wT);
  const Ld = Math.pow((384 * E * I) / (5 * (wL / 12) * USE_DEFL[u]), 1 / 3) / 12;
  const L = Math.min(Lb, Ld);
  return { maxSpanFt: r2(L), feet: Math.floor(L), inches: Math.round((L - Math.floor(L)) * 12), joists: Math.floor((pos(v.floorLength, 20) * 12) / spacing) + 1, limitedBy: Ld < Lb ? 1 : 0 };
};
export const SPAN_LIMITS = ["Bending strength", "Deflection (bounce)"];

// ---------- Sheet goods ----------
const PLY_SHEETS = [32, 36, 40];
export const PLY_THICK = ["1/2 in plywood", "5/8 in plywood", "3/4 in plywood", "7/16 in OSB", "23/32 in OSB (subfloor)"];
const PLY_LB = [40, 50, 61, 47, 70];
export const plywood: CustomCalculator = (v) => {
  const a = pos(v.length, 20) * pos(v.width, 12) + pos(v.extraArea);
  const sheets = ceil((a / PLY_SHEETS[pick(v.sheet, 3)]) * (1 + pos(v.waste, 10) / 100));
  return { sheets, area: Math.round(a), weightLb: Math.round(sheets * PLY_LB[pick(v.thickness, 5)] * (PLY_SHEETS[pick(v.sheet, 3)] / 32)), cost: r2(sheets * pos(v.sheetPrice)) };
};

export const sheathing: CustomCalculator = (v) => {
  const wall = Math.max(0, pos(v.perimeter, 160) * pos(v.wallHeight, 9) - pos(v.openings));
  const roof = pos(v.roofArea), floor = pos(v.floorArea);
  const wallSheets = ceil((wall / 32) * 1.1), roofSheets = ceil((roof / 32) * 1.1), floorSheets = ceil((floor / 32) * 1.1);
  return { totalSheets: wallSheets + roofSheets + floorSheets, wallSheets, roofSheets, floorSheets, nails8d: (wallSheets + roofSheets) * 50 + floorSheets * 60, hClips: roofSheets * 2 };
};

export const plywoodCut: CustomCalculator = (v) => {
  const SW = 48, SL = 96, kerf = pos(v.kerf, 0.125);
  const pieces: [number, number][] = [];
  for (let i = 1; i <= 5; i++) {
    const w = pos(v[`w${i}`]), l = pos(v[`l${i}`]), q = Math.min(200, Math.round(pos(v[`q${i}`])));
    if (w > 0 && l > 0) for (let k = 0; k < q; k++) pieces.push([Math.min(w, l), Math.max(w, l)]);
  }
  if (!pieces.length) return { sheets: 0, utilization: 0, pieceAreaSqFt: 0, wasteSqFt: 0, tooBig: 0 };
  let tooBig = 0;
  // Shelf packing: shelves run across the 48 in width; each piece is placed with its short side across.
  const sheets: { used: number; shelf: number; shelfW: number }[] = [];
  pieces.sort((a, b) => b[1] - a[1]);
  for (const [w, l] of pieces) {
    let pw = w, pl = l;
    if (pw > SW) { if (pl <= SW && pw <= SL) [pw, pl] = [pl, pw]; else { tooBig++; continue; } }
    if (pl > SL) { tooBig++; continue; }
    let placed = false;
    for (const s of sheets) {
      if (s.shelfW + pw <= SW + 1e-9 && pl <= s.shelf) { s.shelfW += pw + kerf; placed = true; break; }
      if (s.used + pl <= SL + 1e-9) { s.used += pl + kerf; s.shelf = pl; s.shelfW = pw + kerf; placed = true; break; }
    }
    if (!placed) sheets.push({ used: pl + kerf, shelf: pl, shelfW: pw + kerf });
  }
  const pieceArea = pieces.reduce((t, [w, l]) => t + w * l, 0) / 144;
  const total = sheets.length * 32;
  return { sheets: sheets.length, utilization: total ? r1((pieceArea / total) * 100) : 0, pieceAreaSqFt: r1(pieceArea), wasteSqFt: r1(Math.max(0, total - pieceArea)), tooBig };
};

// ---------- Siding & cladding ----------
export const SIDING_TYPES = ["Vinyl siding (sold by the square)", "Fiber cement lap, 8.25 in plank (7 in exposure, 12 ft)", "LP SmartSide lap, 8 in (6.83 in exposure, 16 ft)", "Cedar lap / clapboard (6 in exposure, 12 ft)", "Metal siding panels (36 in coverage)"];
const PLANK_SQFT = [0, 7, 9.1, 6, 0];
export const siding: CustomCalculator = (v) => {
  const t = pick(v.type, 5);
  const gables = pos(v.gables) * 0.5 * pos(v.gableWidth, 30) * pos(v.gableRise, 7.5);
  const area = Math.max(0, pos(v.perimeter, 160) * pos(v.wallHeight, 9) + gables - pos(v.openings)) * (1 + pos(v.waste, 10) / 100);
  return { squares: r2(area / 100), area: Math.round(area), planks: PLANK_SQFT[t] ? ceil(area / PLANK_SQFT[t]) : 0, starterFt: Math.ceil(pos(v.perimeter, 160) * 1.05), outsideCornerFt: Math.ceil(pos(v.corners, 4) * pos(v.wallHeight, 9)), jChannelFt: Math.ceil(pos(v.openings) * 0.9 + pos(v.gables) * pos(v.gableWidth, 30) * 1.2), nailsLb: ceil((area / 100) * (t === 0 ? 1 : 1.3)) };
};

export const boardBatten: CustomCalculator = (v) => {
  const W = pos(v.wallWidth, 144), H = pos(v.wallHeight, 96), bw = pos(v.battenWidth, 2.5);
  const target = pos(v.spacing, 16);
  const n = Math.max(2, Math.round((W - bw) / (target + bw)) + 1);
  const gap = (W - n * bw) / (n - 1);
  const rails = Math.max(0, Math.round(pos(v.rails, 1)));
  const lf = (n * H + rails * W) / 12;
  return { verticalBattens: n, actualSpacingIn: r2(gap), onCenterIn: r2(gap + bw), linearFeet: r1(lf), eightFtPieces: ceil((lf * 1.1) / 8), nails: Math.round(n * (H / 12) * 2 + rails * (W / 12) * 2) };
};

export const tongueGroove: CustomCalculator = (v) => {
  const a = Math.max(0, pos(v.width, 12) * pos(v.height, 8) - pos(v.openings)) * (1 + pos(v.waste, 10) / 100);
  const lf = (a * 12) / Math.max(1, pos(v.faceWidth, 5.25));
  return { linearFeet: Math.ceil(lf), boards: ceil(lf / Math.max(1, pos(v.boardLength, 8))), area: Math.round(a), nails: Math.ceil(lf * (12 / 16)) };
};

export const mobileHomeSkirting: CustomCalculator = (v) => {
  const P = 2 * (pos(v.length, 70) + pos(v.width, 14));
  const floor = pos(v.length, 70) * pos(v.width, 14);
  return { panels: ceil(((P * 12) / pos(v.panelWidth, 16)) * 1.1), perimeterFt: Math.round(P), trackFt: Math.ceil(P * 2 * 1.05), vents: ceil(floor / 150 / 0.35), skirtingSqFt: Math.round((P * pos(v.height, 30)) / 12) };
};

export const houseWrap: CustomCalculator = (v) => {
  const gables = pos(v.gables) * 0.5 * pos(v.gableWidth, 30) * pos(v.gableRise, 7.5);
  const area = (pos(v.perimeter, 160) * pos(v.wallHeight, 9) + gables) * 1.1;
  const [rw, rl] = [[9, 150], [9, 100], [10, 150]][pick(v.roll, 3)];
  const rows = ceil(pos(v.wallHeight, 9) / (rw - 0.5));
  return { rolls: ceil(area / (rw * rl)), area: Math.round(area), seamTapeFt: Math.ceil(pos(v.perimeter, 160) * Math.max(0, rows - 1) + ceil(area / (rw * rl)) * rw), capNails: Math.round(area * 0.5) };
};

// ---------- Insulation ----------
export const INS_TYPES = ["Fiberglass batts / rolls", "Blown fiberglass", "Blown cellulose", "Open-cell spray foam", "Closed-cell spray foam"];
const R_PER_IN = [3.2, 2.5, 3.6, 3.7, 6.5];
export const insulation: CustomCalculator = (v) => {
  const t = pick(v.type, 5), a = pos(v.area, 1000);
  const add = Math.max(0, pos(v.targetR, 49) - pos(v.currentR));
  const inches = add / R_PER_IN[t];
  return { addRValue: r1(add), inchesToAdd: r1(inches), bags: t === 1 ? ceil((a * add) / 1500) : t === 2 ? ceil((a * add) / 1200) : 0, battPackages: t === 0 ? ceil((a * 1.05) / 40) : 0, boardFeetFoam: t >= 3 ? Math.round(a * inches) : 0 };
};

export const battInsulation: CustomCalculator = (v) => {
  const area = Math.max(0, pos(v.perimeter, 160) * pos(v.wallHeight, 8) - pos(v.openings)) * (pick(v.spacing, 2) ? 0.94 : 0.9);
  const battSqFt = (pick(v.spacing, 2) ? 23 : 15) * 93 / 144;
  return { area: Math.round(area), batts: ceil((area * 1.05) / battSqFt), packages: ceil((area * 1.05) / pos(v.packageSqFt, 40)), rValue: [[13, 15], [19, 21]][pick(v.wall, 2)][pick(v.density, 2)] };
};

const FUEL_BTU = [100000, 3412, 3412 * 2.5, 91500, 138500];
export const FUELS = ["Natural gas ($ per therm)", "Electric resistance ($ per kWh)", "Heat pump ($ per kWh)", "Propane ($ per gallon)", "Heating oil ($ per gallon)"];
export const insulationSavings: CustomCalculator = (v) => {
  const a = pos(v.area, 1000), r1v = Math.max(0.5, pos(v.currentR, 11)), r2v = Math.max(r1v, pos(v.newR, 49));
  const dU = 1 / r1v - 1 / r2v;
  const heatBtu = a * dU * pos(v.hdd, 5000) * 24;
  const f = pick(v.fuel, 5);
  const heat = (heatBtu / (FUEL_BTU[f] * (f === 1 || f === 2 ? 1 : pos(v.efficiency, 90) / 100))) * pos(v.fuelPrice, 1.4);
  const coolKwh = (a * dU * pos(v.cdd, 1000) * 24) / (pos(v.seer, 14) * 1000);
  const cool = coolKwh * pos(v.kwhPrice, 0.17);
  const total = heat + cool;
  return { yearlySavings: r2(total), heatingSavings: r2(heat), coolingSavings: r2(cool), paybackYears: total ? r1(pos(v.installCost, 2000) / total) : 0 };
};

// ---------- Woodworking ----------
export const WOODS = ["Red oak", "White oak", "Hard maple", "Cherry", "Black walnut", "Ash", "Eastern white pine", "Douglas fir", "Poplar", "Hickory"];
const CT = [0.00369, 0.00365, 0.00353, 0.00274, 0.00274, 0.00274, 0.00212, 0.00267, 0.00289, 0.00411];
const CR = [0.00158, 0.0018, 0.00165, 0.00126, 0.0019, 0.00169, 0.00071, 0.00165, 0.00158, 0.00259];
function emc(rh: number, tf: number) {
  const h = Math.max(0.01, Math.min(0.98, rh / 100));
  const W = 330 + 0.452 * tf + 0.00415 * tf * tf, K = 0.791 + 0.000463 * tf - 0.000000844 * tf * tf;
  const K1 = 6.34 + 0.000775 * tf - 0.0000935 * tf * tf, K2 = 1.09 + 0.0284 * tf - 0.0000904 * tf * tf;
  const kh = K * h;
  return (1800 / W) * (kh / (1 - kh) + (K1 * kh + 2 * K1 * K2 * kh * kh) / (1 + K1 * kh + K1 * K2 * kh * kh));
}
export const woodMovement: CustomCalculator = (v) => {
  const e1 = emc(pos(v.rh1, 30), num(v.temp, 70)), e2 = emc(pos(v.rh2, 70), num(v.temp, 70));
  const c = (pick(v.grain, 2) ? CR : CT)[pick(v.species, CT.length)];
  const move = pos(v.width, 10) * c * Math.abs(e2 - e1);
  return { movementIn: Math.round(move * 1000) / 1000, movementMm: r2(move * 25.4), emcLow: r1(e1), emcHigh: r1(e2), coefficient: c };
};

export const compoundMiter: CustomCalculator = (v) => {
  const S = pos(v.spring, 38) * RAD, A = Math.max(1, pos(v.corner, 90)) * RAD;
  const miter = Math.atan(Math.sin(S) / Math.tan(A / 2)) * DEG;
  const bevel = Math.asin(Math.cos(S) * Math.cos(A / 2)) * DEG;
  return { miterDeg: r1(miter), bevelDeg: r1(bevel), nestedMiterDeg: r1(90 - pos(v.corner, 90) / 2) };
};

export const kerfBending: CustomCalculator = (v) => {
  const t = pos(v.thickness, 0.75), keep = pos(v.remaining, 0.125), kw = pos(v.kerfWidth, 0.125), R = pos(v.radius, 12);
  const depth = Math.max(0.01, t - keep);
  const theta = kw / depth; // radians closed per kerf
  const spacing = R * theta;
  const ang = pos(v.bendAngle, 90) * RAD;
  return { kerfSpacingIn: r2(spacing), kerfs: ceil(ang / theta), kerfDepthIn: r2(depth), arcLengthIn: r2(R * ang) };
};

export const DOME_FREQ = ["2V hemisphere", "3V 5/8 sphere"];
export const geodesicDome: CustomCalculator = (v) => {
  const r = pos(v.radius, 10), f = pick(v.frequency, 2);
  const A = f === 0 ? 0.54653 : 0.34862, B = f === 0 ? 0.61803 : 0.40355, C = f === 0 ? 0 : 0.41241;
  return { strutA: r2(A * r), countA: f === 0 ? 30 : 30, strutB: r2(B * r), countB: f === 0 ? 35 : 40, strutC: r2(C * r), countC: f === 0 ? 0 : 50, hubs: f === 0 ? 26 : 61, floorArea: Math.round(Math.PI * r * r), heightFt: r1(f === 0 ? r : r * 1.25) };
};

export const SHELF_MATS = ["3/4 in plywood", "3/4 in MDF", "3/4 in particleboard", "1× solid pine", "2× lumber"];
const SHELF_SPAN = [[36, 32, 28, 24], [28, 24, 20, 16], [24, 20, 16, 14], [32, 28, 24, 20], [48, 40, 32, 28]];
const SHELF_LOAD = [15, 25, 30, 40];
export const shelfBracketSpacing: CustomCalculator = (v) => {
  const L = pos(v.length, 72), ld = pick(v.load, 4);
  const max = SHELF_SPAN[pick(v.material, 5)][ld];
  const total = (L / 12) * SHELF_LOAD[ld];
  const n = Math.max(2, ceil(L / max) + 1, ceil(total / Math.max(1, pos(v.bracketRating, 100))));
  const sp = L / (n - 1);
  return { brackets: n, spacingIn: r1(sp), loadPerBracketLb: r1(total / n), maxSpacingIn: max, studAlignedIn: Math.max(16, Math.floor(Math.min(sp, max) / 16) * 16) };
};

export const workbenchHeight: CustomCalculator = (v) => {
  const H = pos(v.height, 70), wrist = 0.485 * H, elbow = 0.63 * H;
  return { generalIn: r1(wrist + 1), heavyWorkIn: r1(wrist - 2), precisionIn: r1(elbow - 3), wristIn: r1(wrist) };
};

export const drawerSize: CustomCalculator = (v) => {
  const t = pick(v.slide, 3);
  const widthCut = [1, 0.625, 0.25][t], heightCut = [1, 0.875, 0.5][t];
  const slides = [12, 14, 16, 18, 20, 22, 24, 28];
  const slide = slides.filter((s) => s <= pos(v.depth, 22) - 1).pop() ?? 0;
  return { boxWidthIn: r2(pos(v.openingWidth, 18) - widthCut), boxHeightIn: r2(pos(v.openingHeight, 6) - heightCut), slideLengthIn: slide, boxDepthIn: slide, frontWidthIn: r2(pos(v.openingWidth, 18) + 2 * pos(v.overlay, 0.5)), frontHeightIn: r2(pos(v.openingHeight, 6) + 2 * pos(v.overlay, 0.5)) };
};
export const SLIDES = ["Side-mount ball-bearing (½ in each side)", "Undermount (soft-close)", "Center-mount / wood runners"];

// ---------- Windows & openings ----------
export const HEADERS = ["(2) 2×6 — openings up to about 4 ft", "(2) 2×8 — up to about 5 ft", "(2) 2×10 — up to about 6.5 ft", "(2) 2×12 — up to about 8 ft", "Engineered LVL / steel — over 8 ft (size it)"];
export const windowRoughOpening: CustomCalculator = (v) => {
  const replace = pick(v.mode, 2) === 1;
  const w = pos(v.width, 36), h = pos(v.height, 60);
  const ow = replace ? w - 0.25 : w + 0.5, oh = replace ? h - 0.25 : h + 0.5;
  const ro = replace ? w : ow;
  const hs = ro <= 48 ? 0 : ro <= 60 ? 1 : ro <= 78 ? 2 : ro <= 96 ? 3 : 4;
  return { resultWidthIn: r2(ow), resultHeightIn: r2(oh), headerLengthIn: r2(ro + 3), headerSize: hs, jackStudsEachSide: ro > 72 ? 2 : 1 };
};

export const bayWindowAngle: CustomCalculator = (v) => {
  const W = pos(v.openingWidth, 8), C = pos(v.centerWidth, 4), P = pos(v.projection, 1.5);
  const half = Math.max(0.01, (W - C) / 2);
  const ang = Math.atan(P / half) * DEG;
  return { sideAngleDeg: r1(ang), miterDeg: r1(ang / 2), interiorAngleDeg: r1(180 - ang), sideLengthFt: r2(Math.sqrt(P * P + half * half)) };
};

// ---------- Soundproofing ----------
export const WALL_ASSEMBLIES = ["2×4 studs, ½ in drywall each side, no insulation", "2×4 studs, ½ in drywall, insulated", "2×4 insulated, 2 layers one side", "2×4 insulated, resilient channel one side", "Staggered studs on 2×6 plate, insulated", "Double stud wall, insulated, 2 layers each side"];
const STC = [33, 37, 40, 47, 46, 58];
export const STC_LABELS = ["Poor — normal speech understood through the wall", "Fair — loud speech understood", "Good — loud speech heard but not understood", "Very good — loud speech barely audible", "Excellent — loud sounds faint", "Superior — most sounds inaudible"];
export const stcRating: CustomCalculator = (v) => {
  const stc = STC[pick(v.assembly, STC.length)] + pos(v.extraLayers) * 3 + (pick(v.damping, 2) ? 6 : 0) + (pick(v.fiveEighths, 2) ? 1 : 0);
  return { stc, rating: stc < 30 ? 0 : stc < 35 ? 1 : stc < 42 ? 2 : stc < 50 ? 3 : stc < 60 ? 4 : 5 };
};

// ---------- Outbuildings ----------
export const shedMaterial: CustomCalculator = (v) => {
  const W = pos(v.width, 8), L = pos(v.length, 10), H = pos(v.wallHeight, 8), p = pos(v.pitch, 4);
  const lean = pick(v.roof, 2) === 1;
  const P = 2 * (W + L);
  const studs = ceil((P * 12) / 16) + 12;
  const raftersEach = Math.floor((L * 12) / 24) + 1;
  const run = lean ? W : W / 2;
  const rafterLen = (run + 1) * Math.sqrt(1 + (p / 12) ** 2);
  const roofArea = (lean ? 1 : 2) * rafterLen * (L + 1);
  return { floorJoists: Math.floor((L * 12) / 16) + 1, floorSheets: ceil((W * L) / 32), studs, platesFt: Math.ceil(P * 3), wallSheets: ceil((P * H) / 32 * 1.1), rafters: raftersEach * (lean ? 1 : 2), rafterLengthFt: r1(rafterLen), roofSheets: ceil((roofArea / 32) * 1.1), shingleBundles: ceil((roofArea / 100) * 3 * 1.1) };
};

export const poleBarn: CustomCalculator = (v) => {
  const W = pos(v.width, 30), L = pos(v.length, 40), H = pos(v.eaveHeight, 12), sp = Math.max(4, pos(v.postSpacing, 8)), p = pos(v.pitch, 4);
  const sidePosts = (ceil(L / sp) + 1) * 2;
  const endPosts = Math.max(0, ceil(W / sp) - 1) * 2;
  const trusses = ceil(L / pos(v.trussSpacing, 8)) + 1;
  const slope = (W / 2 + 1) * Math.sqrt(1 + (p / 12) ** 2);
  const girtRows = ceil((H * 12) / pos(v.girtSpacing, 24));
  const purlinRows = (ceil((slope * 12) / pos(v.purlinSpacing, 24)) + 1) * 2;
  return { posts: sidePosts + endPosts, trusses, girtFt: Math.ceil(2 * (W + L) * girtRows), purlinFt: Math.ceil(purlinRows * (L + 2)), roofSqFt: Math.round(2 * slope * (L + 2)), wallSqFt: Math.round(2 * (W + L) * H + 2 * (W / 2) * ((W / 2) * p) / 12), concreteBags: (sidePosts + endPosts) * 4 };
};

// ---------- Plaster (metric) ----------
export const PLASTERS = ["Multi-finish skim (2 mm)", "Bonding / backing coat (11 mm)", "Hardwall backing (11 mm)", "One-coat plaster (13 mm)"];
const PLASTER_COV = [10, 2.7, 3.1, 4.5]; // m² per 25 kg bag at the nominal thickness
const PLASTER_T = [2, 11, 11, 13];
export const plaster: CustomCalculator = (v) => {
  const p = pick(v.type, 4);
  const cov = (PLASTER_COV[p] * PLASTER_T[p]) / Math.max(0.5, pos(v.thickness) || PLASTER_T[p]);
  const bags = ceil((pos(v.area, 30) / cov) * 1.1);
  return { bags, coveragePerBag: r1(cov), labourCost: r2(pos(v.area, 30) * pos(v.labourPerM2)), materialCost: r2(bags * pos(v.bagPrice)) };
};

export const hgFrameCustomCalculators: Record<string, CustomCalculator> = {
  "drywall-calculator": drywall,
  "drywall-mud-calculator": drywallMud,
  "drywall-repair-cost-calculator": drywallRepairCost,
  "framing-cost-calculator": framingCost,
  "framing-nails-calculator": framingNails,
  "rake-wall-calculator": rakeWall,
  "joist-span-calculator": joistSpan,
  "plywood-calculator": plywood,
  "sheathing-calculator": sheathing,
  "plywood-cut-calculator": plywoodCut,
  "siding-calculator": siding,
  "board-batten-calculator": boardBatten,
  "tongue-groove-calculator": tongueGroove,
  "mobile-home-skirting-calculator": mobileHomeSkirting,
  "house-wrap-calculator": houseWrap,
  "insulation-calculator": insulation,
  "batt-insulation-calculator": battInsulation,
  "insulation-savings-calculator": insulationSavings,
  "wood-movement-calculator": woodMovement,
  "compound-miter-calculator": compoundMiter,
  "kerf-bending-calculator": kerfBending,
  "geodesic-dome-calculator": geodesicDome,
  "shelf-bracket-spacing-calculator": shelfBracketSpacing,
  "workbench-height-calculator": workbenchHeight,
  "drawer-size-calculator": drawerSize,
  "window-rough-opening-calculator": windowRoughOpening,
  "bay-window-angle-calculator": bayWindowAngle,
  "stc-rating-calculator": stcRating,
  "shed-material-calculator": shedMaterial,
  "pole-barn-calculator": poleBarn,
  "plaster-calculator": plaster,
};
