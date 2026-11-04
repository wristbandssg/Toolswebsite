/**
 * Batch: "Business & Industrial Calculators" → Construction Materials & Estimating Calculators.
 *
 * Data / methods:
 *  - Board feet = thickness (in) × width (in) × length (ft) ÷ 12.
 *  - Wood densities (lb/ft³, green / 12% moisture) from the USDA Wood Handbook
 *    (FPL-GTR-282), rounded.
 *  - R-values per inch: DOE / ASHRAE Handbook of Fundamentals typical values.
 *  - Blown-in insulation: fiberglass ≈ R-2.6/in at ~0.4 lb/ft³, cellulose ≈ R-3.6/in at
 *    ~1.5 lb/ft³ settled.
 *  - Beam formulas: simply supported, M = wL²/8 + PL/4, Δ = 5wL⁴/384EI + PL³/48EI;
 *    reference design values (NDS Supplement): DF-L #2 Fb 900 psi, Fv 180, E 1.6M;
 *    SYP #2 Fb 750 (2x10) / Fv 175 / E 1.4M; LVL Fb 2,600 / Fv 285 / E 2.0M;
 *    24F glulam Fb 2,400 / Fv 265 / E 1.8M. Load duration and size factors = 1.0.
 *  - Wind: ASCE 7-16 velocity pressure qz = 0.00256·Kz·Kzt·Kd·Ke·V²,
 *    Kz = 2.01(z/zg)^(2/α), z ≥ 15 ft; exposure B α 7 zg 1,200; C 9.5 / 900; D 11.5 / 700.
 *  - Surety bonds: standard-market premium schedule 2.5% of first $100k, 1.5% next
 *    $400k, 1.0% next $2M, 0.75% next $2.5M, 0.7% above $5M.
 *  - Epoxy floor coating: 1 US gallon covers 1,604 sq ft at 1 mil (100% solids);
 *    1 gal = 231 in³.
 *  - Cost tables are 2025–2026 US national mid-range installed prices.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-biz-construction-calculators.ts for the copy.
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
const r4 = (n: number) => Math.round(n * 10000) / 10000;

// --- Demolition ------------------------------------------------------------------------------------------
/** [label, $/sq ft mid, debris tons per sq ft] */
export const DEMO_TYPES: [string, number, number][] = [
  ["Interior gut / room tear-out", 4, 0.012], ["Whole house (wood frame)", 8, 0.06], ["Concrete slab / driveway (4 in)", 4, 0.025], ["Reinforced concrete (6 in+)", 7, 0.04], ["Garage / shed", 6, 0.04], ["Deck removal", 5, 0.008], ["Commercial building", 10, 0.08],
];
export const demolitionCost: CustomCalculator = (v) => {
  const [, rate, debris] = DEMO_TYPES[pick(v.type, DEMO_TYPES.length)];
  const area = nonNeg(v.area);
  const labor = area * rate * (1 + safeNumber(v.regionAdjust) / 100);
  const tons = area * debris;
  const hazmat = yes(v.hazmat) ? area * nonNeg(v.hazmatPerSqFt) : 0;
  const disposal = tons * nonNeg(v.disposalPerTon);
  const total = labor + hazmat + disposal + nonNeg(v.permit);
  return { totalCost: round2(total), demolitionLabor: round2(labor), debrisTons: round2(tons), disposalCost: round2(disposal), hazmatCost: round2(hazmat), costPerSqFt: round2(area ? total / area : 0), dumpsters30Yd: ceil(tons / 4) };
};

// --- Lumber ------------------------------------------------------------------------------------------------
export const boardFoot: CustomCalculator = (v) => {
  const bfEach = (nonNeg(v.thickness) * nonNeg(v.width) * nonNeg(v.length)) / 12;
  const bf = bfEach * Math.max(1, nonNeg(v.pieces, 1)) * (1 + nonNeg(v.waste) / 100);
  return { boardFeet: round2(bf), boardFeetEach: round2(bfEach), cubicFeet: round2(bf / 12), cubicMeters: round2((bf / 12) * 0.0283168), totalCost: round2(bf * nonNeg(v.pricePerBoardFoot)), linearFeet: round2(nonNeg(v.length) * Math.max(1, nonNeg(v.pieces, 1))) };
};

/** Nominal lumber sizes: [label, actual thickness, actual width]. */
export const LUMBER_SIZES: [string, number, number][] = [["1×4", 0.75, 3.5], ["1×6", 0.75, 5.5], ["1×8", 0.75, 7.25], ["2×4", 1.5, 3.5], ["2×6", 1.5, 5.5], ["2×8", 1.5, 7.25], ["2×10", 1.5, 9.25], ["2×12", 1.5, 11.25], ["4×4", 3.5, 3.5], ["4×6", 3.5, 5.5], ["6×6", 5.5, 5.5]];
export const STOCK_LENGTHS = [8, 10, 12, 14, 16, 20];
export const lumber: CustomCalculator = (v) => {
  const [, t, w] = LUMBER_SIZES[pick(v.size, LUMBER_SIZES.length)];
  const nominalT = Math.ceil(t);
  const nominalW = Math.round(w + 0.5);
  const stock = STOCK_LENGTHS[pick(v.stockLength, STOCK_LENGTHS.length)];
  let boards: number;
  let linear: number;
  let offcut = 0;
  if (pick(v.mode, 2) === 1) {
    const piece = nonNeg(v.pieceLength) / 12;
    const perBoard = piece > 0 ? Math.floor((stock + 1e-9) / (piece + 0.125 / 12)) : 0;
    boards = perBoard > 0 ? ceil(Math.max(0, nonNeg(v.pieceCount)) / perBoard) : 0;
    linear = nonNeg(v.pieceCount) * piece;
    offcut = perBoard > 0 ? stock - perBoard * piece : 0;
  } else {
    linear = nonNeg(v.linearFeet);
    boards = ceil((linear * (1 + nonNeg(v.waste) / 100)) / stock);
  }
  const bf = (boards * nonNeg(nominalT) * nominalW * stock) / 12;
  return { boardsNeeded: boards, linearFeet: round2(linear), boardFeet: round2(bf), offcutPerBoardFt: round2(offcut), totalCost: round2(boards * nonNeg(v.boardPrice)), costPerLinearFoot: round2(boards ? (boards * nonNeg(v.boardPrice)) / (boards * stock) : 0) };
};

export const SPACINGS = [12, 16, 19.2, 24];
export const framing: CustomCalculator = (v) => {
  const L = nonNeg(v.wallLength);
  const s = SPACINGS[pick(v.spacing, SPACINGS.length)];
  const base = L > 0 ? Math.floor((L * 12) / s + 1e-9) + 1 : 0;
  const corners = Math.round(nonNeg(v.corners));
  const openings = Math.round(nonNeg(v.openings));
  const studs = ceil((base + corners * 2 + openings * 2 + Math.round(nonNeg(v.intersections)) * 2) * (1 + nonNeg(v.waste) / 100));
  const plateFt = L * (pick(v.topPlates, 2) === 0 ? 2 : 3);
  const plateBoards = ceil((plateFt * 1.05) / 16);
  const headerFt = openings * nonNeg(v.avgOpeningWidth) * 2 + openings * 0.5;
  const metal = pick(v.material, 2) === 1;
  return { studsNeeded: studs, plateLinearFeet: round2(plateFt), plateBoards16Ft: plateBoards, headerLinearFeet: round2(headerFt), screwsOrNails: studs * (metal ? 8 : 6), totalCost: round2(studs * nonNeg(v.studPrice) + plateBoards * nonNeg(v.platePrice)) };
};

/** Wood species: [label, green lb/ft³, 12% MC lb/ft³]. */
export const WOODS: [string, number, number][] = [
  ["Red oak", 64, 44], ["White oak", 63, 47], ["Hard (sugar) maple", 56, 44], ["Soft (red) maple", 50, 38], ["Black walnut", 58, 38], ["Black cherry", 45, 35], ["White ash", 48, 42], ["Hickory", 64, 51], ["Southern yellow pine", 53, 36], ["Eastern white pine", 36, 25], ["Douglas fir", 38, 32], ["Western red cedar", 27, 23], ["Yellow poplar", 38, 29], ["Cottonwood", 49, 28], ["Black locust", 58, 48], ["Spruce / SPF", 34, 27],
];
export const logWeight: CustomCalculator = (v) => {
  const [, green, dry] = WOODS[pick(v.species, WOODS.length)];
  const d1 = nonNeg(v.smallEndDiameter) / 12;
  const d2 = nonNeg(v.largeEndDiameter, nonNeg(v.smallEndDiameter)) / 12;
  const len = nonNeg(v.length);
  const vol = (Math.PI * len * (d1 * d1 + d1 * d2 + d2 * d2)) / 12; // frustum
  const density = pick(v.moisture, 2) === 0 ? green : dry;
  const count = Math.max(1, nonNeg(v.count, 1));
  const lb = vol * density * count;
  const doyle = Math.pow(Math.max(0, nonNeg(v.smallEndDiameter) - 4), 2) * (len / 16) * count;
  return { weightLb: round2(lb), weightTons: round2(lb / 2000), weightKg: round2(lb * 0.45359237), cubicFeet: round2(vol * count), densityUsed: density, doyleBoardFeet: round2(doyle) };
};

export const lumberWeight: CustomCalculator = (v) => {
  const [, green, dry] = WOODS[pick(v.species, WOODS.length)];
  const sizeIdx = pick(v.size, LUMBER_SIZES.length + 1);
  const [t, w] = sizeIdx === LUMBER_SIZES.length ? [nonNeg(v.thickness), nonNeg(v.width)] : [LUMBER_SIZES[sizeIdx][1], LUMBER_SIZES[sizeIdx][2]];
  const cuFt = ((t * w) / 144) * nonNeg(v.length) * Math.max(1, nonNeg(v.pieces, 1));
  const density = pick(v.moisture, 2) === 0 ? dry : green;
  const lb = cuFt * density;
  return { weightLb: round2(lb), weightPerPieceLb: round2(lb / Math.max(1, nonNeg(v.pieces, 1))), weightKg: round2(lb * 0.45359237), cubicFeet: round2(cuFt), boardFeetActual: round2(cuFt * 12) };
};

export const SHIPLAP_EXPOSURE: [string, number][] = [["1×6 shiplap (5⅛ in exposure)", 5.125], ["1×8 shiplap (7⅛ in exposure)", 7.125], ["1×10 shiplap (9⅛ in exposure)", 9.125], ["6 in nickel-gap panel (5.5 in)", 5.5], ["8 in nickel-gap panel (7.25 in)", 7.25]];
export const shiplap: CustomCalculator = (v) => {
  const area = Math.max(0, nonNeg(v.length) * nonNeg(v.height) - nonNeg(v.openings));
  const exp = SHIPLAP_EXPOSURE[pick(v.board, SHIPLAP_EXPOSURE.length)][1];
  const lf = ((area * 12) / exp) * (1 + nonNeg(v.waste) / 100);
  const boards = ceil(lf / Math.max(1, nonNeg(v.boardLength, 8)));
  return { boardsNeeded: boards, linearFeet: round2(lf), areaSqFt: round2(area), nails: ceil(lf * 1.5), totalCost: round2(boards * nonNeg(v.boardPrice)), costPerSqFt: round2(area ? (boards * nonNeg(v.boardPrice)) / area : 0) };
};

export const feetInch: CustomCalculator = (v) => {
  const den = [1, 2, 4, 8, 16][pick(v.denominator, 5)];
  const a = nonNeg(v.feet1) * 12 + nonNeg(v.inches1) + (den > 1 ? nonNeg(v.fraction1) / den : 0);
  const b = nonNeg(v.feet2) * 12 + nonNeg(v.inches2) + (den > 1 ? nonNeg(v.fraction2) / den : 0);
  const op = pick(v.operation, 6);
  const factor = safeNumber(v.factor, 1);
  let inches = 0;
  let area = 0;
  if (op === 0) inches = a + b;
  else if (op === 1) inches = a - b;
  else if (op === 2) inches = a * factor;
  else if (op === 3) inches = factor !== 0 ? a / factor : 0;
  else if (op === 4) area = (a * b) / 144;
  else inches = Math.sqrt(a * a + b * b);
  const neg = inches < 0;
  const abs = Math.abs(inches);
  const sixteenths = Math.round(abs * 16);
  const ft = Math.floor(sixteenths / 192);
  const remIn = (sixteenths - ft * 192) / 16;
  return { decimalFeet: round2((neg ? -abs : abs) / 12), totalInches: round2(neg ? -abs : abs), feet: neg ? -ft : ft, inches: Math.floor(remIn), sixteenths: Math.round((remIn - Math.floor(remIn)) * 16), millimeters: round2((neg ? -abs : abs) * 25.4), areaSqFt: round2(area) };
};

/** Deck boards: [label, width in, gap in]. */
export const DECK_BOARDS: [string, number, number][] = [["5/4×6 wood (5.5 in)", 5.5, 0.125], ["2×6 wood (5.5 in)", 5.5, 0.125], ["Trex / composite 5.5 in", 5.5, 0.1875], ["TimberTech / Azek 5.36 in", 5.36, 0.1875], ["Wide composite 7.25 in", 7.25, 0.1875]];
export const BOARD_LENGTHS = [12, 16, 20];
export const deck: CustomCalculator = (v) => {
  const L = nonNeg(v.length);
  const W = nonNeg(v.width);
  const [, bw, gap] = DECK_BOARDS[pick(v.board, DECK_BOARDS.length)];
  const blen = BOARD_LENGTHS[pick(v.boardLength, BOARD_LENGTHS.length)];
  const rows = ceil((W * 12) / (bw + gap));
  const lf = rows * L * (1 + nonNeg(v.waste) / 100);
  const boards = ceil(lf / blen);
  const spacing = pick(v.joistSpacing, 2) === 0 ? 16 : 12;
  const joists = L > 0 ? Math.floor((L * 12) / spacing + 1e-9) + 1 : 0;
  const fasteners = rows * joists * 2;
  const posts = W > 0 ? (Math.ceil(L / 8) + 1) * Math.max(1, Math.ceil(W / 10)) : 0;
  return { deckBoards: boards, deckingLinearFeet: round2(lf), joists, joistLengthFt: round2(W), screwsOrClips: fasteners, postsApprox: posts, deckAreaSqFt: round2(L * W), boardCost: round2(boards * nonNeg(v.boardPrice)) };
};

export const fence: CustomCalculator = (v) => {
  const L = nonNeg(v.length);
  const sp = Math.max(1, nonNeg(v.postSpacing, 8));
  const sections = L > 0 ? ceil(L / sp) : 0;
  const gates = Math.round(nonNeg(v.gates));
  const posts = L > 0 ? sections + 1 + gates : 0;
  const rails = sections * Math.max(1, Math.round(nonNeg(v.railsPerSection, 2)));
  const pickets = ceil(((L - gates * nonNeg(v.gateWidth)) * 12) / (nonNeg(v.picketWidth, 5.5) + nonNeg(v.gap)) * (1 + nonNeg(v.waste) / 100));
  const concrete = posts * nonNeg(v.bagsPerPost, 2);
  const total = posts * nonNeg(v.postPrice) + rails * nonNeg(v.railPrice) + Math.max(0, pickets) * nonNeg(v.picketPrice) + concrete * nonNeg(v.bagPrice);
  return { posts, rails, pickets: Math.max(0, pickets), concreteBags: concrete, sections, materialCost: round2(total), costPerFoot: round2(L ? total / L : 0) };
};

export const linearFeet: CustomCalculator = (v) => {
  const mode = pick(v.mode, 2);
  const lf = mode === 0 ? nonNeg(v.pieces) * nonNeg(v.pieceLength) * (pick(v.pieceUnit, 3) === 0 ? 1 : pick(v.pieceUnit, 3) === 1 ? 1 / 12 : 3.28084) : (nonNeg(v.area) * 12) / Math.max(0.1, nonNeg(v.boardWidth));
  return { linearFeet: round2(lf), linearYards: round2(lf / 3), meters: round2(lf * 0.3048), inches: round2(lf * 12), totalCost: round2(lf * nonNeg(v.pricePerFoot)) };
};

export const coverage: CustomCalculator = (v) => {
  const area = Math.max(0, nonNeg(v.area) - nonNeg(v.exclude));
  const needed = area * Math.max(1, Math.round(nonNeg(v.coats, 1))) * (1 + nonNeg(v.waste) / 100);
  const per = Math.max(0.01, nonNeg(v.coveragePerUnit, 1));
  const units = ceil(needed / per);
  return { unitsNeeded: units, totalCoverageNeeded: round2(needed), exactUnits: round2(needed / per), leftoverCoverage: round2(units * per - needed), totalCost: round2(units * nonNeg(v.unitPrice)) };
};

/** Sealant packages in cubic inches. */
export const SEALANT_PACKS: [string, number][] = [["10.1 oz cartridge", 18.23], ["20 oz sausage", 36.09], ["28 oz cartridge", 50.53], ["1 gallon", 231], ["1.5 gallon pail", 346.5], ["2 gallon pail", 462]];
export const sealant: CustomCalculator = (v) => {
  const in3 = nonNeg(v.jointWidth) * nonNeg(v.jointDepth) * nonNeg(v.length) * 12 * (1 + nonNeg(v.waste) / 100);
  const pack = SEALANT_PACKS[pick(v.pack, SEALANT_PACKS.length)][1];
  const units = ceil(in3 / pack);
  return { unitsNeeded: units, cubicInches: round2(in3), gallons: round2(in3 / 231), linearFeetPerUnit: round2(nonNeg(v.jointWidth) * nonNeg(v.jointDepth) > 0 ? pack / (nonNeg(v.jointWidth) * nonNeg(v.jointDepth) * 12) : 0), backerRodFeet: round2(nonNeg(v.length) * 1.05), totalCost: round2(units * nonNeg(v.unitPrice)) };
};

export const materialEstimator: CustomCalculator = (v) => {
  let sub = 0;
  const lines: Record<string, number> = {};
  for (let i = 1; i <= 6; i++) {
    const line = nonNeg(v[`qty${i}`]) * nonNeg(v[`price${i}`]);
    lines[`line${i}`] = round2(line);
    sub += line;
  }
  const waste = sub * (nonNeg(v.waste) / 100);
  const tax = (sub + waste) * (nonNeg(v.taxRate) / 100);
  const total = sub + waste + tax + nonNeg(v.delivery);
  return { grandTotal: round2(total), materialsSubtotal: round2(sub), wasteAllowance: round2(waste), salesTax: round2(tax), ...lines };
};

/** Stone pieces: [label, sq ft per piece]. */
export const MARBLE_FORMATS: [string, number][] = [["12×12 in tile", 1], ["18×18 in tile", 2.25], ["24×24 in tile", 4], ["12×24 in tile", 2], ["Slab 9 × 5 ft (45 sq ft)", 45], ["Slab 10 × 6 ft (60 sq ft)", 60]];
export const MARBLE_THICK = [0.375, 0.75, 1.25]; // 3/8 in tile, 2 cm, 3 cm
export const marble: CustomCalculator = (v) => {
  const area = nonNeg(v.length) * nonNeg(v.width);
  const fmt = MARBLE_FORMATS[pick(v.format, MARBLE_FORMATS.length)][1];
  const buy = area * (1 + nonNeg(v.waste) / 100);
  const pieces = ceil(buy / fmt);
  const t = MARBLE_THICK[pick(v.thickness, MARBLE_THICK.length)];
  const lb = pieces * fmt * (t / 12) * 168;
  return { piecesNeeded: pieces, sqFtToBuy: round2(pieces * fmt), areaSqFt: round2(area), weightLb: round2(lb), materialCost: round2(pieces * fmt * nonNeg(v.pricePerSqFt)), installedCost: round2(pieces * fmt * nonNeg(v.pricePerSqFt) + area * nonNeg(v.laborPerSqFt)) };
};

export const constructionBid: CustomCalculator = (v) => {
  const labor = nonNeg(v.laborHours) * nonNeg(v.laborRate) * (1 + nonNeg(v.laborBurden) / 100);
  const direct = nonNeg(v.materials) + labor + nonNeg(v.equipment) + nonNeg(v.subcontractors) + nonNeg(v.permits);
  const contingency = direct * (nonNeg(v.contingency) / 100);
  const overhead = (direct + contingency) * (nonNeg(v.overhead) / 100);
  const cost = direct + contingency + overhead;
  const profit = cost * (nonNeg(v.profit) / 100);
  const bid = cost + profit;
  return { bidPrice: round2(bid), directCost: round2(direct), laborCost: round2(labor), contingencyAmount: round2(contingency), overheadAmount: round2(overhead), profitAmount: round2(profit), grossMarginPercent: round2(bid ? ((bid - direct) / bid) * 100 : 0), markupOnDirectPercent: round2(direct ? ((bid - direct) / direct) * 100 : 0) };
};

export const PAVER_SIZES: [string, number][] = [["24 × 24 in", 24], ["18 × 18 in", 18], ["12 × 12 in", 12], ["16 × 16 in", 16]];
export const pedestals: CustomCalculator = (v) => {
  const size = PAVER_SIZES[pick(v.paverSize, PAVER_SIZES.length)][1];
  const cols = ceil((nonNeg(v.length) * 12) / size);
  const rows = ceil((nonNeg(v.width) * 12) / size);
  const peds = cols > 0 && rows > 0 ? (cols + 1) * (rows + 1) : 0;
  const avgH = (nonNeg(v.minHeight) + nonNeg(v.maxHeight)) / 2;
  return { pedestalsNeeded: ceil(peds * (1 + nonNeg(v.waste) / 100)), paversNeeded: cols * rows, averageHeightIn: round2(avgH), perimeterPedestals: cols > 0 && rows > 0 ? 2 * (cols + rows) : 0, pedestalCost: round2(ceil(peds * (1 + nonNeg(v.waste) / 100)) * nonNeg(v.pedestalPrice)), paverCost: round2(cols * rows * nonNeg(v.paverPrice)) };
};

// --- Insulation -------------------------------------------------------------------------------------------
export const BLOWN: [string, number, number][] = [["Blown fiberglass", 2.6, 0.4], ["Blown cellulose", 3.6, 1.5], ["Blown mineral wool", 3.0, 2.0]];
export const R_TARGETS = [30, 38, 49, 60];
export const blownInsulation: CustomCalculator = (v) => {
  const [, rPerIn, density] = BLOWN[pick(v.material, BLOWN.length)];
  const target = R_TARGETS[pick(v.targetR, R_TARGETS.length)];
  const add = Math.max(0, target - nonNeg(v.existingR));
  const inches = add / rPerIn;
  const cuFt = nonNeg(v.area) * (inches / 12);
  const lb = cuFt * density * (1 + nonNeg(v.waste) / 100);
  const bags = ceil(lb / Math.max(1, nonNeg(v.bagWeight, 25)));
  return { bagsNeeded: bags, inchesToAdd: round2(inches), rValueAdded: add, poundsNeeded: round2(lb), materialCost: round2(bags * nonNeg(v.bagPrice)), proCost: round2(nonNeg(v.area) * nonNeg(v.proPerSqFt)) };
};

/** R-value per inch of material. */
export const R_MATERIALS: [string, number][] = [["None", 0], ["Fiberglass batt", 3.2], ["Mineral wool batt", 4.0], ["Blown cellulose", 3.6], ["Blown fiberglass", 2.6], ["Open-cell spray foam", 3.6], ["Closed-cell spray foam", 6.5], ["XPS foam board", 5.0], ["EPS foam board", 4.0], ["Polyiso foam board", 6.0], ["Plywood / OSB", 1.25], ["Softwood lumber", 1.25], ["Drywall / gypsum", 0.9], ["Brick", 0.2], ["Concrete", 0.08], ["Concrete block (hollow, per inch)", 0.14]];
export const rValue: CustomCalculator = (v) => {
  let total = yes(v.airFilms) ? 0.85 : 0;
  for (let i = 1; i <= 4; i++) total += R_MATERIALS[pick(v[`material${i}`], R_MATERIALS.length)][1] * nonNeg(v[`thickness${i}`]);
  const u = total > 0 ? 1 / total : 0;
  const btuh = u * nonNeg(v.area) * nonNeg(v.deltaT);
  return { totalRValue: round2(total), uFactor: r4(u), heatLossBtuPerHour: round2(btuh), rsiMetric: round2(total * 0.1761), annualHeatLossTherms: round2((btuh * nonNeg(v.heatingHours)) / 100000) };
};

export const sprayFoam: CustomCalculator = (v) => {
  const closed = pick(v.foam, 2) === 1;
  const bf = nonNeg(v.area) * nonNeg(v.thickness) * (1 + nonNeg(v.waste) / 100);
  const r = nonNeg(v.thickness) * (closed ? 6.5 : 3.6);
  const kits = ceil(bf / Math.max(1, nonNeg(v.kitBoardFeet, 600)));
  return { boardFeet: round2(bf), rValue: round2(r), diyKits: kits, diyCost: round2(kits * nonNeg(v.kitPrice)), proCost: round2(bf * nonNeg(v.proPerBoardFoot)), setsForPro: round2(bf / (closed ? 4500 : 16000)) };
};

/** Gutter coil: [label, coil width in]. */
export const GUTTER_COIL: [string, number][] = [["5 in K-style (11⅞ in coil)", 11.875], ["6 in K-style (15 in coil)", 15], ["7 in K-style (18 in coil)", 18], ["5 in half-round (11⅞ in coil)", 11.875], ["6 in half-round (15 in coil)", 15]];
export const gutterCoil: CustomCalculator = (v) => {
  const coilW = GUTTER_COIL[pick(v.gutter, GUTTER_COIL.length)][1];
  const run = nonNeg(v.gutterLength);
  const corners = Math.round(nonNeg(v.corners));
  const coilFt = run + corners * 2 + Math.round(nonNeg(v.runs, 1)) * 1;
  const lbPerFt = nonNeg(v.thickness, 0.027) * coilW * 12 * 0.0975;
  const rolls = ceil(coilFt / Math.max(1, nonNeg(v.coilLength, 500)));
  return { coilFeetNeeded: round2(coilFt), coilRolls: rolls, coilWeightLb: round2(coilFt * lbPerFt), hangers: ceil(run / Math.max(1, nonNeg(v.hangerSpacing, 2))), downspouts: ceil(run / 35), endCaps: Math.round(nonNeg(v.runs, 1)) * 2, coilCost: round2(coilFt * nonNeg(v.coilPricePerFoot)) };
};

export const dropCeiling: CustomCalculator = (v) => {
  const L = nonNeg(v.length);
  const W = nonNeg(v.width);
  const is2x2 = pick(v.panel, 2) === 0;
  const mainRows = W > 0 ? Math.max(1, ceil(W / 4) - 1) : 0;
  const mains = mainRows * ceil(L / 12);
  const cross4 = (mainRows + 1) * Math.max(0, ceil(L / 2) - 1);
  const panels = ceil((ceil(L / 2) * ceil(W / (is2x2 ? 2 : 4))) * (1 + nonNeg(v.waste) / 100));
  const cross2 = is2x2 ? ceil(L / 2) * (mainRows + 1) : 0;
  const wallAngle = ceil((2 * (L + W)) / 10);
  const wires = mainRows * (ceil(L / 4) + 1);
  return { panels, mainTees12Ft: mains, crossTees4Ft: cross4, crossTees2Ft: cross2, wallAngle10Ft: wallAngle, hangerWires: wires, areaSqFt: round2(L * W), totalCost: round2(panels * nonNeg(v.panelPrice) + L * W * nonNeg(v.gridPerSqFt)) };
};

export const epoxy: CustomCalculator = (v) => {
  let gal: number;
  if (pick(v.mode, 2) === 0) gal = ((nonNeg(v.length) * nonNeg(v.width) * nonNeg(v.depth)) / 231) * (nonNeg(v.fillPercent, 100) / 100);
  else gal = (nonNeg(v.area) * nonNeg(v.mils) * Math.max(1, Math.round(nonNeg(v.coats, 1)))) / 1604 / Math.max(0.1, nonNeg(v.solids, 100) / 100);
  gal *= 1 + nonNeg(v.waste) / 100;
  const ratio = [1, 2, 3][pick(v.ratio, 3)];
  return { totalGallons: round2(gal), liters: round2(gal * 3.78541), partAGallons: round2((gal * ratio) / (ratio + 1)), partBGallons: round2(gal / (ratio + 1)), kitsNeeded: ceil(gal / Math.max(0.1, nonNeg(v.kitGallons, 1))), weightLb: round2(gal * 9.2), totalCost: round2(ceil(gal / Math.max(0.1, nonNeg(v.kitGallons, 1))) * nonNeg(v.kitPrice)) };
};

export const VAPOR: [string, number][] = [["6 mil poly", 0.1], ["10 mil reinforced", 0.2], ["12 mil reinforced", 0.25], ["20 mil crawl space liner", 0.45]];
export const vaporBarrier: CustomCalculator = (v) => {
  const floor = nonNeg(v.length) * nonNeg(v.width);
  const walls = pick(v.coverWalls, 2) === 1 ? 2 * (nonNeg(v.length) + nonNeg(v.width)) * nonNeg(v.wallHeight) : 0;
  const net = floor + walls;
  const buy = net * (1 + nonNeg(v.overlap, 10) / 100);
  const [, price] = VAPOR[pick(v.thickness, VAPOR.length)];
  const material = buy * (nonNeg(v.pricePerSqFt) > 0 ? nonNeg(v.pricePerSqFt) : price);
  const tape = ceil(buy / 500);
  return { sqFtToBuy: round2(buy), rolls10x100: ceil(buy / 1000), seamTapeRolls: tape, materialCost: round2(material + tape * 25), proInstalledCost: round2(net * nonNeg(v.proPerSqFt)), coveredAreaSqFt: round2(net) };
};

// --- Structural ---------------------------------------------------------------------------------------------
export const E_MOD = [1.6e6, 1.4e6, 2.0e6, 1.8e6, 29e6];
export const beamLoad: CustomCalculator = (v) => {
  const Lft = nonNeg(v.span);
  const L = Lft * 12;
  const w = nonNeg(v.uniformLoad) / 12; // lb/in
  const P = nonNeg(v.pointLoad);
  const E = E_MOD[pick(v.material, E_MOD.length)];
  const I = nonNeg(v.momentOfInertia);
  const M = (nonNeg(v.uniformLoad) * Lft * Lft) / 8 + (P * Lft) / 4;
  const V = (nonNeg(v.uniformLoad) * Lft) / 2 + P / 2;
  const defl = I > 0 ? (5 * w * Math.pow(L, 4)) / (384 * E * I) + (P * Math.pow(L, 3)) / (48 * E * I) : 0;
  const S = nonNeg(v.sectionModulus);
  return { maxMomentFtLb: round2(M), maxShearLb: round2(V), reactionEachLb: round2(V), maxDeflectionIn: r4(defl), spanOverDeflection: round2(defl > 0 ? L / defl : 0), bendingStressPsi: round2(S > 0 ? (M * 12) / S : 0) };
};

/** [label, Fb, Fv, E, width per ply, depths] */
export const BEAM_MATERIALS: [string, number, number, number, number, number[]][] = [
  ["Douglas fir-larch #2 (sawn)", 900, 180, 1.6e6, 1.5, [5.5, 7.25, 9.25, 11.25]],
  ["Southern pine #2 (sawn)", 750, 175, 1.4e6, 1.5, [5.5, 7.25, 9.25, 11.25]],
  ["LVL 2.0E", 2600, 285, 2.0e6, 1.75, [7.25, 9.25, 9.5, 11.25, 11.875, 14, 16, 18]],
  ["Glulam 24F-V4 (3.5 in wide)", 2400, 265, 1.8e6, 3.5, [9, 10.5, 12, 13.5, 15, 16.5, 18]],
];
export const beamSpan: CustomCalculator = (v) => {
  const [, Fb, Fv, E, width, depths] = BEAM_MATERIALS[pick(v.material, BEAM_MATERIALS.length)];
  const plies = pick(v.material, BEAM_MATERIALS.length) === 3 ? 1 : Math.max(1, Math.min(4, Math.round(nonNeg(v.plies, 2))));
  const b = width * plies;
  const Lft = nonNeg(v.span);
  const trib = nonNeg(v.tributaryWidth);
  const wTotal = trib * (nonNeg(v.liveLoad) + nonNeg(v.deadLoad)); // plf
  const wLive = trib * nonNeg(v.liveLoad);
  const M = (wTotal * Lft * Lft) / 8 * 12; // in-lb
  const V = (wTotal * Lft) / 2;
  const L = Lft * 12;
  const limit = [360, 240, 480][pick(v.deflectionLimit, 3)];
  let chosen = 0;
  let util = 0;
  for (const d of depths) {
    const S = (b * d * d) / 6;
    const I = (b * Math.pow(d, 3)) / 12;
    const fb = M / S / Fb;
    const fv = (1.5 * V) / (b * d) / Fv;
    const defl = (5 * (wLive / 12) * Math.pow(L, 4)) / (384 * E * I);
    const dr = defl / (L / limit);
    const u = Math.max(fb, fv, dr);
    if (u <= 1) { chosen = d; util = u; break; }
  }
  return { recommendedDepthIn: chosen, beamWidthIn: round2(b), utilizationPercent: round2(util * 100), totalLoadPlf: round2(wTotal), maxMomentFtLb: round2(M / 12), maxShearLb: round2(V), allowableDeflectionIn: round2(L / limit), noSizeWorks: chosen === 0 ? 1 : 0 };
};

export const EXPOSURE: [number, number][] = [[7, 1200], [9.5, 900], [11.5, 700]];
export const windLoad: CustomCalculator = (v) => {
  const [alpha, zg] = EXPOSURE[pick(v.exposure, EXPOSURE.length)];
  const z = Math.max(15, nonNeg(v.height));
  const Kz = 2.01 * Math.pow(Math.min(z, zg) / zg, 2 / alpha);
  const V = nonNeg(v.windSpeed);
  const qz = 0.00256 * Kz * nonNeg(v.kzt, 1) * nonNeg(v.kd, 0.85) * nonNeg(v.ke, 1) * V * V;
  const p = qz * safeNumber(v.pressureCoefficient, 1);
  const force = p * nonNeg(v.area);
  return { designPressurePsf: round2(p), velocityPressurePsf: round2(qz), kz: r4(Kz), windForceLb: round2(force), designPressureKpa: round2(p * 0.04788) };
};

export const GEOLOGY = [0.85, 1, 1.35]; // soft / mixed / hard rock
export const wellDrilling: CustomCalculator = (v) => {
  const depth = nonNeg(v.depth);
  const drilling = depth * nonNeg(v.drillPerFoot) * GEOLOGY[pick(v.geology, GEOLOGY.length)];
  const casing = nonNeg(v.casingFeet) * nonNeg(v.casingPerFoot);
  const pump = yes(v.includePump) ? nonNeg(v.pumpSystem) : 0;
  const total = drilling + casing + pump + nonNeg(v.permitsTesting);
  return { totalCost: round2(total), drillingCost: round2(drilling), casingCost: round2(casing), pumpSystemCost: round2(pump), costPerFoot: round2(depth ? total / depth : 0), lowEstimate: round2(total * 0.8), highEstimate: round2(total * 1.3) };
};

export const BOND_TIERS: [number, number][] = [[100000, 0.025], [400000, 0.015], [2000000, 0.01], [2500000, 0.0075], [Infinity, 0.007]];
export const CREDIT = [1, 1.5, 2.5];
export const bondCost: CustomCalculator = (v) => {
  let left = nonNeg(v.contractAmount);
  let premium = 0;
  for (const [size, rate] of BOND_TIERS) {
    const chunk = Math.min(left, size);
    premium += chunk * rate;
    left -= chunk;
    if (left <= 0) break;
  }
  premium *= CREDIT[pick(v.credit, CREDIT.length)];
  if (yes(v.maintenanceBond)) premium *= 1.1;
  const minimum = nonNeg(v.minimumPremium);
  const final = Math.max(minimum, premium);
  return { bondPremium: round2(final), effectiveRatePercent: round2(nonNeg(v.contractAmount) ? (final / nonNeg(v.contractAmount)) * 100 : 0), standardPremium: round2(premium / CREDIT[pick(v.credit, CREDIT.length)]), bondAmount: round2(nonNeg(v.contractAmount)) };
};

export const fiveCut: CustomCalculator = (v) => {
  const a = nonNeg(v.frontWidth);
  const b = nonNeg(v.backWidth);
  const len = Math.max(0.1, nonNeg(v.cutLength));
  const errPerCut = (a - b) / 4;
  const angleDeg = (Math.atan(errPerCut / len) * 180) / Math.PI;
  const adjust = (errPerCut * nonNeg(v.fenceLength)) / len;
  return { errorPerCutIn: r4(errPerCut), angleErrorDegrees: r4(angleDeg), fenceAdjustmentIn: r4(adjust), errorPerFootIn: r4((errPerCut / len) * 12), totalErrorIn: r4(a - b) };
};

/** Commercial renovation $/sq ft: [type, light, moderate, full gut]. */
export const RENO: [string, number, number, number][] = [["Office", 30, 80, 160], ["Retail", 35, 90, 175], ["Restaurant", 75, 200, 350], ["Medical / dental", 80, 200, 350], ["Warehouse / industrial", 15, 45, 100], ["Hotel (per sq ft)", 50, 120, 250], ["Multifamily common areas", 40, 100, 190]];
export const commercialReno: CustomCalculator = (v) => {
  const row = RENO[pick(v.type, RENO.length)];
  const rate = (row[1 + pick(v.level, 3)] as number) * (1 + safeNumber(v.regionAdjust) / 100);
  const area = nonNeg(v.area);
  const base = area * rate;
  const soft = base * (nonNeg(v.softCosts) / 100);
  const contingency = (base + soft) * (nonNeg(v.contingency) / 100);
  const total = base + soft + contingency;
  return { totalCost: round2(total), costPerSqFt: round2(area ? total / area : 0), constructionCost: round2(base), softCosts: round2(soft), contingencyAmount: round2(contingency), lowEstimate: round2(total * 0.8), highEstimate: round2(total * 1.3) };
};

export const hdd: CustomCalculator = (v) => {
  const od = nonNeg(v.pipeDiameter);
  const hole = od * Math.max(1, nonNeg(v.reamFactor, 1.5));
  const len = nonNeg(v.boreLength);
  const holeGal = Math.PI * Math.pow(hole / 24, 2) * len * 7.48052;
  const annGal = Math.max(0, holeGal - Math.PI * Math.pow(od / 24, 2) * len * 7.48052);
  const fluid = holeGal * Math.max(1, nonNeg(v.fluidFactor, 3));
  const bentoniteLb = (fluid / 100) * nonNeg(v.bentonitePer100Gal, 25);
  return { reamedHoleDiameterIn: round2(hole), holeVolumeGallons: round2(holeGal), annularVolumeGallons: round2(annGal), drillingFluidGallons: round2(fluid), bentoniteBags50lb: ceil(bentoniteLb / 50), cuttingsCubicYards: round2(holeGal / 7.48052 / 27), estimatedCost: round2(len * nonNeg(v.costPerFoot) + nonNeg(v.mobilization)) };
};

export const metalBuilding: CustomCalculator = (v) => {
  const area = nonNeg(v.length) * nonNeg(v.width);
  const heightAdj = 1 + Math.max(0, nonNeg(v.eaveHeight) - 12) * 0.025;
  const kit = area * nonNeg(v.kitPerSqFt) * heightAdj;
  const slab = yes(v.foundation) ? area * nonNeg(v.slabPerSqFt) : 0;
  const erection = area * nonNeg(v.erectionPerSqFt);
  const wallArea = 2 * (nonNeg(v.length) + nonNeg(v.width)) * nonNeg(v.eaveHeight);
  const insulation = yes(v.insulation) ? (area + wallArea) * 1.5 : 0;
  const doors = Math.round(nonNeg(v.rollUpDoors)) * nonNeg(v.doorPrice) + Math.round(nonNeg(v.walkDoors)) * 900;
  const total = kit + slab + erection + insulation + doors + nonNeg(v.delivery);
  return { totalCost: round2(total), costPerSqFt: round2(area ? total / area : 0), buildingKit: round2(kit), foundation: round2(slab), erection: round2(erection), insulationCost: round2(insulation), doorsCost: round2(doors), floorAreaSqFt: round2(area) };
};

/** Fire alarm: [label, $/sq ft mid, low, high, monthly monitoring]. */
export const ALARM: [string, number, number, number, number][] = [["Residential hardwired smoke/CO (interconnected)", 1.5, 1, 2.5, 30], ["Commercial conventional system", 3, 2, 4, 50], ["Commercial addressable system", 4.5, 3, 6, 60], ["Voice evacuation (mass notification)", 6.5, 5, 9, 75]];
export const fireAlarm: CustomCalculator = (v) => {
  const [, mid, lo, hi, monitor] = ALARM[pick(v.system, ALARM.length)];
  const area = nonNeg(v.area);
  const f = 1 + safeNumber(v.regionAdjust) / 100 + (yes(v.retrofit) ? 0.25 : 0);
  const install = Math.max(nonNeg(v.minimum), area * mid * f);
  const annual = (yes(v.monitoring) ? monitor * 12 : 0) + nonNeg(v.annualInspection);
  return { installCost: round2(install), firstYearCost: round2(install + annual), annualOngoing: round2(annual), lowEstimate: round2(Math.max(nonNeg(v.minimum), area * lo * f)), highEstimate: round2(Math.max(nonNeg(v.minimum), area * hi * f)), costPerSqFt: round2(area ? install / area : 0) };
};

/** Seawall $/linear ft mid. */
export const SEAWALL: [string, number][] = [["Vinyl sheet pile", 400], ["Concrete (poured / precast panels)", 600], ["Steel sheet pile", 700], ["Timber / wood", 350], ["Riprap revetment", 250], ["Gabion baskets", 300], ["Natural boulder", 450]];
export const seawall: CustomCalculator = (v) => {
  const [, rate] = SEAWALL[pick(v.material, SEAWALL.length)];
  const heightAdj = 1 + (nonNeg(v.height, 6) - 6) * 0.08;
  let total = nonNeg(v.length) * rate * Math.max(0.6, heightAdj);
  if (yes(v.bargeAccess)) total *= 1.2;
  if (yes(v.removeOld)) total += nonNeg(v.length) * 100;
  total += nonNeg(v.permitsEngineering);
  return { totalCost: round2(total), costPerLinearFoot: round2(nonNeg(v.length) ? total / nonNeg(v.length) : 0), lowEstimate: round2(total * 0.75), highEstimate: round2(total * 1.4) };
};

/** Sprinklers: [label, $/sq ft mid, low, high, sq ft per head]. */
export const SPRINKLER: [string, number, number, number, number][] = [["Residential — new construction (NFPA 13D)", 1.75, 1.25, 2.5, 144], ["Residential — retrofit", 3.5, 2.5, 5, 144], ["Commercial wet pipe (light hazard)", 4, 3, 6, 200], ["Commercial wet pipe (ordinary hazard)", 5, 3.5, 7, 130], ["Commercial dry pipe", 6.5, 5, 9, 130], ["Pre-action system", 8, 6, 12, 130]];
export const fireSprinkler: CustomCalculator = (v) => {
  const [, mid, lo, hi, perHead] = SPRINKLER[pick(v.system, SPRINKLER.length)];
  const area = nonNeg(v.area);
  const f = 1 + safeNumber(v.regionAdjust) / 100;
  const extras = (yes(v.waterService) ? nonNeg(v.waterServiceCost) : 0) + (yes(v.backflow) ? nonNeg(v.backflowCost) : 0) + nonNeg(v.permits);
  const total = area * mid * f + extras;
  return { totalCost: round2(total), costPerSqFt: round2(area ? total / area : 0), sprinklerHeads: ceil(area / perHead), lowEstimate: round2(area * lo * f + extras), highEstimate: round2(area * hi * f + extras), extrasCost: round2(extras) };
};

export const bizConstructionCustomCalculators: Record<string, CustomCalculator> = {
  "demolition-cost-calculator": demolitionCost,
  "board-foot-calculator": boardFoot,
  "lumber-calculator": lumber,
  "framing-calculator": framing,
  "log-weight-calculator": logWeight,
  "lumber-weight-calculator": lumberWeight,
  "shiplap-calculator": shiplap,
  "construction-calculator": feetInch,
  "deck-calculator": deck,
  "fence-calculator": fence,
  "linear-feet-calculator": linearFeet,
  "coverage-calculator": coverage,
  "sealant-calculator": sealant,
  "material-estimator-calculator": materialEstimator,
  "marble-calculator": marble,
  "construction-bid-calculator": constructionBid,
  "bison-pedestal-calculator": pedestals,
  "blown-in-insulation-calculator": blownInsulation,
  "r-value-calculator": rValue,
  "spray-foam-calculator": sprayFoam,
  "gutter-coil-calculator": gutterCoil,
  "drop-ceiling-calculator": dropCeiling,
  "epoxy-calculator": epoxy,
  "vapor-barrier-cost-calculator": vaporBarrier,
  "beam-load-calculator": beamLoad,
  "beam-span-calculator": beamSpan,
  "wind-load-calculator": windLoad,
  "well-drilling-cost-calculator": wellDrilling,
  "construction-bond-cost-calculator": bondCost,
  "5-cut-calculator": fiveCut,
  "commercial-renovation-cost-calculator": commercialReno,
  "horizontal-directional-drilling-calculator": hdd,
  "metal-building-cost-calculator": metalBuilding,
  "fire-alarm-installation-cost-calculator": fireAlarm,
  "seawall-cost-calculator": seawall,
  "fire-sprinkler-system-cost-calculator": fireSprinkler,
};
