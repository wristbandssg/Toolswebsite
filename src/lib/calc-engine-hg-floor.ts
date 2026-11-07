/**
 * Batch: "House & Garden Calculators" → Flooring, Tile, Paint & Interior Calculators.
 *
 * Data / methods:
 *  - Paint ≈ 350 sq ft per gallon per coat on smooth walls (most brands list 250–400); doors ≈ 21 sq ft,
 *    windows ≈ 15 sq ft. Exterior coverage: smooth 350, wood lap 300, stucco / brick 200 sq ft per gallon.
 *  - Wallpaper: strips per roll = floor(roll length ÷ (wall height + pattern repeat)); US double roll
 *    20.5 in × 33 ft, European roll 0.53 × 10.05 m, wide roll 27 in × 27 ft.
 *  - Thinset coverage per 50 lb bag: ¼×¼ in notch ≈ 90 sq ft, ¼×⅜ in ≈ 65, ½×½ in ≈ 42; +20% back-buttering
 *    for large-format tile.
 *  - Carpet rolls 12, 13.2 or 15 ft wide; seams run with the room's long side.
 *  - Stone densities (g/cm³): granite 2.70, quartz (engineered) 2.45, marble 2.71, quartzite 2.65,
 *    soapstone 2.98, porcelain slab 2.40.
 *  - Home theater: THX ≈ 40° viewing angle (screen width = 0.728 × seating distance), SMPTE ≈ 30°
 *    (width = 0.536 × distance); 16:9 diagonal = width ÷ 0.8716.
 *  - Room acoustics: Sabine RT60 = 0.049 × volume (cu ft) ÷ absorption (sabins); 2 × 4 ft panel at NRC 0.85
 *    ≈ 6.8 sabins.
 *  - Ergonomics: standing elbow height ≈ 0.63 × stature, knee height ≈ 0.285 × stature.
 *  - Costs are typical 2026 US prices (editable inputs), not quotes.
 *
 * Self-contained: no imports from any other batch, per this project's established per-batch convention.
 * See prisma/create-hg-floor-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

const num = (x: number, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);
const pos = (x: number, d = 0) => Math.max(0, num(x, d));
const pick = (x: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(num(x))));
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;
const ceil = (x: number) => Math.ceil(x - 1e-9);
const spread = (t: number) => ({ costLow: r2(t * 0.85), costHigh: r2(t * 1.25) });

// ---------- Paint ----------
export const paint: CustomCalculator = (v) => {
  const L = pos(v.length, 12), W = pos(v.width, 14), H = pos(v.height, 8), coats = Math.max(1, pos(v.coats, 2));
  const walls = Math.max(0, 2 * (L + W) * H - pos(v.doors) * 21 - pos(v.windows) * 15);
  const ceiling = pick(v.ceiling, 2) ? L * W : 0;
  const cov = Math.max(100, pos(v.coverage, 350));
  const wallGal = (walls * coats) / cov, ceilGal = (ceiling * coats) / cov;
  const primer = pick(v.primer, 2) ? (walls + ceiling) / cov : 0;
  return { gallons: r1(wallGal + ceilGal), wallGallons: r1(wallGal), ceilingGallons: r1(ceilGal), primerGallons: r1(primer), wallArea: Math.round(walls), cansToBuy: ceil(wallGal + ceilGal) };
};

export const ceilingPaint: CustomCalculator = (v) => {
  const a = pos(v.length, 12) * pos(v.width, 14);
  const gal = (a * Math.max(1, pos(v.coats, 2)) * [1, 1.3][pick(v.texture, 2)]) / Math.max(100, pos(v.coverage, 350));
  return { gallons: r1(gal), area: Math.round(a), cansToBuy: ceil(gal) };
};

const EXT_COV = [350, 300, 200];
export const exteriorPaint: CustomCalculator = (v) => {
  const gables = pos(v.gables) * 0.5 * pos(v.gableWidth, 30) * pos(v.gableRise, 7.5);
  const area = Math.max(0, pos(v.perimeter, 160) * pos(v.wallHeight, 10) + gables - pos(v.openings));
  const coats = Math.max(1, pos(v.coats, 2));
  const gal = (area * coats) / EXT_COV[pick(v.surface, 3)];
  const trim = (pos(v.trimFeet) * coats) / 150;
  return { gallons: r1(gal), trimGallons: r1(trim), buckets5gal: ceil(gal / 5), area: Math.round(area) };
};

export const commercialPaintingCost: CustomCalculator = (v) => {
  const rate = pos(v.customRate) || [2, 1.5, 2.5][pick(v.type, 3)];
  const total = pos(v.area, 10000) * rate * (pick(v.tall, 2) ? 1.2 : 1) * (pick(v.afterHours, 2) ? 1.15 : 1);
  return { totalCost: r2(total), ...spread(total), perSqFt: pos(v.area, 10000) ? r2(total / pos(v.area, 10000)) : 0 };
};

export const accentWall: CustomCalculator = (v) => {
  const a = pos(v.width, 12) * pos(v.height, 8);
  return { area: Math.round(a), paintGallons: r1((a * 2) / 350), wallpaperRolls: ceil((a / 56) * 1.15), shiplapFt: Math.ceil(((a * 12) / 5.5) * 1.1), gridTrimFt: Math.ceil((pos(v.width, 12) * (ceil((pos(v.height, 8) * 12) / 16) + 1) + pos(v.height, 8) * (ceil((pos(v.width, 12) * 12) / 16) + 1)) * 1.1), peelStickPanels: ceil((a / 2.5) * 1.1) };
};

// ---------- Wallpaper & fabric ----------
const ROLLS: [number, number][] = [[20.5, 396], [20.87, 395.7], [27, 324]]; // width in, length in
export const wallpaper: CustomCalculator = (v) => {
  const [rw, rl] = pick(v.roll, 4) === 3 ? [pos(v.customWidth, 20.5), pos(v.customLength, 33) * 12] : ROLLS[pick(v.roll, 3)];
  const H = pos(v.wallHeight, 8) * 12;
  const strips = ceil((pos(v.wallWidth, 40) * 12) / rw);
  const perRoll = Math.max(1, Math.floor(rl / (H + pos(v.repeat) + 2)));
  const openingStrips = Math.floor((pos(v.openings) * 144) / (rw * H) * 0.5);
  const need = Math.max(1, strips - openingStrips);
  return { rolls: ceil((need / perRoll) * 1.1), strips: need, stripsPerRoll: perRoll, wallArea: Math.round(((pos(v.wallWidth, 40) * 12 * H) / 144) - pos(v.openings)) };
};

const FABRIC_W = [44, 54, 60];
export const fabricYardage: CustomCalculator = (v) => {
  const fw = FABRIC_W[pick(v.fabricWidth, 3)], rep = pos(v.repeat);
  let pieces: [number, number, number][] = [[pos(v.pieceWidth, 22), pos(v.pieceLength, 24), Math.max(1, Math.round(pos(v.quantity, 2)))]];
  if (pick(v.mode, 2) === 1) {
    const w = pos(v.cushionWidth, 22), d = pos(v.cushionDepth, 22), t = pos(v.thickness, 4), n = Math.max(1, Math.round(pos(v.quantity, 2)));
    pieces = [[w + 1, d + 1, 2 * n], [t + 1, 2 * (w + d) + 2, n]];
  }
  let inches = 0;
  for (const [pw, pl, q] of pieces) {
    const across = Math.max(1, Math.floor(fw / Math.max(1, pw)));
    const len = rep ? Math.ceil(pl / rep) * rep : pl;
    inches += ceil(q / across) * len;
  }
  return { yards: r1((inches / 36) * 1.1), meters: r1((inches * 0.0254) * 1.1), totalInches: Math.round(inches), cost: r2(((inches / 36) * 1.1) * pos(v.pricePerYard)) };
};

// ---------- Flooring ----------
export const flooring: CustomCalculator = (v) => {
  const a = pos(v.length, 15) * pos(v.width, 12) + pos(v.extraArea);
  const order = a * (1 + [7, 15, 20][pick(v.layout, 3)] / 100);
  const boxes = ceil(order / Math.max(1, pos(v.boxSqFt, 20)));
  return { boxes, sqFtToBuy: Math.round(boxes * pos(v.boxSqFt, 20)), area: Math.round(a), underlaymentRolls: ceil(a / 100), cost: r2(boxes * pos(v.boxSqFt, 20) * pos(v.pricePerSqFt)) };
};

export const plankFlooring: CustomCalculator = (v) => {
  const a = pos(v.length, 15) * pos(v.width, 12) + pos(v.extraArea);
  const boxes = ceil((a * (1 + pos(v.waste, 10) / 100)) / Math.max(1, pos(v.boxSqFt, 20)));
  const buy = boxes * pos(v.boxSqFt, 20);
  return { boxes, sqFtToBuy: Math.round(buy), area: Math.round(a), materialCost: r2(buy * pos(v.pricePerSqFt)), installCost: r2(a * pos(v.installPerSqFt)), underlaymentRolls: ceil(a / 100) };
};

export const carpet: CustomCalculator = (v) => {
  const L = pos(v.length, 15), W = pos(v.width, 12), rw = [12, 15, 13.2][pick(v.rollWidth, 3)];
  const strips = ceil(W / rw), linear = strips * (L + 0.5);
  const orderSqFt = linear * rw * (1 + pos(v.waste, 5) / 100);
  return { squareYards: r1(orderSqFt / 9), roomSqYd: r1((L * W) / 9), linearFeet: r1(linear), seams: Math.max(0, strips - 1), padSqYd: Math.ceil((L * W) / 9 * 1.05), tackStripFt: Math.ceil(2 * (L + W)), cost: r2((orderSqFt / 9) * pos(v.pricePerSqYd)) };
};

export const stairRunner: CustomCalculator = (v) => {
  const per = pos(v.tread, 10) + pos(v.riser, 7.5) + pos(v.nosing, 1.5);
  const total = (per * Math.max(1, pos(v.steps, 13)) + pos(v.landing)) * 1.1;
  return { linearFeet: r1(total / 12), yards: r1(total / 36), perStepIn: r2(per), stairRods: Math.round(pos(v.steps, 13)), cost: r2((total / 12) * pos(v.pricePerFoot)) };
};

export const subfloor: CustomCalculator = (v) => {
  const a = pos(v.length, 20) * pos(v.width, 12);
  const sheets = ceil((a / 32) * 1.1);
  return { sheets, area: Math.round(a), adhesiveTubes: ceil(sheets / 2), screws: sheets * 50, thickness: pick(v.joistSpacing, 3) };
};
export const SUBFLOOR_THICK = ["23/32 in (¾ in) T&G for joists at 16 in", "23/32–7/8 in T&G for joists at 19.2 in", "7/8–1⅛ in T&G for joists at 24 in"];

export const radiantFloor: CustomCalculator = (v) => {
  const heated = pos(v.area, 60) * (pos(v.heatedShare, 85) / 100);
  const watts = heated * 12;
  const install = heated * [12, 15][pick(v.system, 2)] + pos(v.installCost, 600);
  const monthly = (watts / 1000) * pos(v.hoursPerDay, 4) * 30 * pos(v.kwhPrice, 0.17);
  return { matSqFt: Math.floor(heated), watts: Math.round(watts), amps240: r1(watts / 240), installCost: r2(install), monthlyRunningCost: r2(pick(v.system, 2) ? monthly * 0.5 : monthly) };
};

export const POLISH_LEVELS = ["Grind and seal (cream polish)", "Mid-level polish (salt and pepper)", "High gloss / exposed aggregate"];
export const polishedConcreteCost: CustomCalculator = (v) => {
  const a = pos(v.area, 1000);
  const total = Math.max(1500, a * ([3, 5, 8][pick(v.level, 3)] + (pick(v.stain, 2) ? 1 : 0)) + pos(v.crackFeet) * 3);
  return { totalCost: r2(total), ...spread(total), perSqFt: a ? r2(total / a) : 0 };
};

export const dropCeilingCost: CustomCalculator = (v) => {
  const a = pos(v.area, 400);
  const total = a * ([6, 9, 13][pick(v.tile, 3)] + (pick(v.removal, 2) ? 1 : 0));
  return { totalCost: r2(total), ...spread(total), perSqFt: a ? r2(total / a) : 0 };
};

export const MARBLES = ["Carrara", "Calacatta", "Travertine", "Emperador", "Thassos (white)"];
const MARBLE_RATE = [15, 35, 8, 18, 25];
export const marbleFlooringCost: CustomCalculator = (v) => {
  const a = pos(v.area, 300);
  const material = a * 1.1 * (pos(v.customMaterial) || MARBLE_RATE[pick(v.marble, 5)]);
  const labor = a * (pos(v.laborPerSqFt, 12) + (pick(v.prep, 2) ? 2 : 0));
  return { totalCost: r2(material + labor), materialCost: r2(material), laborCost: r2(labor), ...spread(material + labor) };
};

// ---------- Tile ----------
const LAYOUT_WASTE = [10, 15, 20];
export const tile: CustomCalculator = (v) => {
  const a = pos(v.length, 10) * pos(v.width, 8) + pos(v.extraArea);
  const tw = pos(v.tileWidth, 12) + pos(v.joint, 0.125), tl = pos(v.tileLength, 24) + pos(v.joint, 0.125);
  const tiles = ceil(((a * 144) / (tw * tl)) * (1 + LAYOUT_WASTE[pick(v.layout, 3)] / 100));
  const tileSqFt = (pos(v.tileWidth, 12) * pos(v.tileLength, 24)) / 144;
  return { tiles, boxes: ceil((tiles * tileSqFt) / Math.max(1, pos(v.boxSqFt, 15.5))), area: Math.round(a), tilesPerSqFt: r2(144 / (tw * tl)) };
};

export const showerTile: CustomCalculator = (v) => {
  const W = pos(v.width, 5), D = pos(v.depth, 3), H = pos(v.height, 7);
  const walls = [W * H, (W + D) * H, (W + 2 * D) * H][pick(v.walls, 3)] + (pick(v.niche, 2) ? 6 : 0);
  const floor = pick(v.floor, 2) ? W * D : 0;
  const wt = (pos(v.wallTileW, 3) * pos(v.wallTileL, 6)) / 144, ft = (pos(v.floorTile, 2) ** 2) / 144;
  return { wallSqFt: Math.round(walls), floorSqFt: Math.round(floor), wallTiles: ceil((walls / wt) * 1.15), floorTiles: floor ? ceil((floor / ft) * 1.15) : 0, thinsetBags: ceil((walls + floor) / 65), waterproofingSqFt: Math.ceil((walls + floor) * 1.1) };
};

export const backsplash: CustomCalculator = (v) => {
  const a = Math.max(0, pos(v.length, 12) * (pos(v.height, 18) / 12) - pos(v.subtract));
  const tw = pos(v.tileW, 3) + pos(v.joint, 0.0625), tl = pos(v.tileL, 6) + pos(v.joint, 0.0625);
  const tiles = ceil(((a * 144) / (tw * tl)) * 1.1);
  return { sqFt: r1(a), tiles, boxes: ceil((a * 1.1) / Math.max(1, pos(v.boxSqFt, 10))), materialCost: r2(a * 1.1 * pos(v.tilePerSqFt, 10)), installedCost: r2(a * (pos(v.tilePerSqFt, 10) * 1.1 + pos(v.laborPerSqFt, 20))) };
};

const NOTCH_COV = [90, 65, 42];
export const thinset: CustomCalculator = (v) => {
  const size = pos(v.tileSize, 12);
  const notch = size <= 8 ? 0 : size <= 15 ? 1 : 2;
  const bags = ceil((pos(v.area, 100) / NOTCH_COV[notch]) * (size >= 15 ? 1.2 : 1));
  return { bags, trowelNotch: notch, sqFtPerBag: NOTCH_COV[notch], pounds: bags * 50 };
};
export const TROWELS = ["¼ × ¼ in square notch (tiles up to 8 in)", "¼ × ⅜ in square notch (tiles up to ~15 in)", "½ × ½ in square notch (large format) + back-butter"];

export const tileLayout: CustomCalculator = (v) => {
  const j = pos(v.joint, 0.125), tw = pos(v.tileW, 12) + j, tl = pos(v.tileL, 12) + j;
  const lay = (room: number, t: number) => {
    const full = Math.floor(room / t);
    const rem = room - full * t;
    let cut = rem / 2;
    let count = full;
    if (pick(v.start, 2) === 0) {
      if (cut < t / 3) { cut = (rem + t) / 2; count = full - 1; }
      return { tiles: count + 2, cut };
    }
    return { tiles: full + (rem > 0 ? 1 : 0), cut: rem };
  };
  const a = lay(pos(v.roomWidth, 120), tw), b = lay(pos(v.roomLength, 144), tl);
  return { tilesAcross: a.tiles, tilesDown: b.tiles, edgeCutAcrossIn: r2(a.cut), edgeCutDownIn: r2(b.cut), totalTiles: a.tiles * b.tiles };
};

// ---------- Trim & millwork ----------
export const baseboardTrim: CustomCalculator = (v) => {
  const base = Math.max(0, pos(v.perimeter, 52) - pos(v.doors, 1) * 3);
  const casing = pos(v.doors, 1) * 2 * 17 + pos(v.windows, 2) * (2 * (pos(v.windowW, 3) + pos(v.windowH, 4)) + 1);
  const piece = [8, 12, 16][pick(v.pieceLength, 3)];
  return { baseboardFt: Math.ceil(base * 1.1), baseboardPieces: ceil((base * 1.1) / piece), casingFt: Math.ceil(casing * 1.1), casingPieces: ceil((casing * 1.1) / piece), caulkTubes: ceil((base + casing) / 50) };
};

export const crownMolding: CustomCalculator = (v) => {
  const P = pos(v.perimeter, 52);
  const piece = [8, 12, 16][pick(v.pieceLength, 3)];
  return { linearFeet: Math.ceil(P * 1.15), pieces: ceil((P * 1.15) / piece), joints: Math.round(pos(v.insideCorners, 4) + pos(v.outsideCorners)), caulkTubes: ceil(P / 40) };
};

export const wainscoting: CustomCalculator = (v) => {
  const L = pos(v.wallLength, 40), h = pos(v.height, 36), H = pos(v.wallHeight, 8);
  const boxW = pos(v.boxWidth, 30), stile = 4;
  const boxes = Math.max(1, Math.round((L * 12) / (boxW + stile)));
  const actual = (L * 12 - (boxes + 1) * stile) / boxes;
  const boxMoulding = boxes * 2 * (actual + (h - 10)) / 12;
  return { recommendedHeightIn: Math.round((H * 12) / 3), boxes, boxWidthIn: r1(actual), boxMouldingFt: Math.ceil(boxMoulding * 1.1), chairRailFt: Math.ceil(L * 1.1), beadboardSheets: ceil((L * 12) / 48) };
};

export const frameMolding: CustomCalculator = (v) => {
  const mw = pos(v.moldingWidth, 2);
  const pic = (2 * (pos(v.artWidth, 16) + pos(v.artHeight, 20)) + 8 * mw) * 1.1;
  const n = Math.max(1, Math.round(pos(v.boxes, 3)));
  const bw = (pos(v.wallWidth, 120) - 2 * pos(v.margin, 4) - (n - 1) * pos(v.gap, 4)) / n;
  const wallIn = n * 2 * (bw + pos(v.boxHeight, 24)) * 1.1;
  return { pictureMoldingIn: r1(pic), pictureMoldingFt: r2(pic / 12), wallBoxWidthIn: r2(bw), wallMouldingFt: r1(wallIn / 12), pieces8ft: ceil(wallIn / 96) };
};

export const pictureSpacing: CustomCalculator = (v) => {
  const n = Math.max(1, Math.round(pos(v.frames, 3))), fw = pos(v.frameWidth, 16);
  const gap = (pos(v.wallWidth, 96) - n * fw) / (n + 1);
  return { gapIn: r2(gap), nailHeightIn: r2(pos(v.centerHeight, 57) + pos(v.frameHeight, 20) / 2 - pos(v.hangerDrop, 3)), firstNailFromLeftIn: r2(gap + fw / 2), nailSpacingIn: r2(fw + gap) };
};

export const cabinetDoor: CustomCalculator = (v) => {
  const s = pick(v.style, 3), W = pos(v.openingWidth, 30), H = pos(v.openingHeight, 30);
  const add = [1, 1, -0.125][s];
  const pair = W > 24 ? 2 : 1;
  const totalW = W + add;
  const doorW = pair === 2 ? (totalW - 0.125) / 2 : totalW;
  return { doors: pair, doorWidthIn: r2(doorW), doorHeightIn: r2(H + add), overlayEachSideIn: s === 2 ? -0.0625 : 0.5 };
};
export const DOOR_STYLES = ["Full overlay (½ in each side)", "Partial overlay (½ in)", "Inset (1/16 in gap)"];

export const cabinetHardware: CustomCalculator = (v) => {
  const w = pos(v.drawerWidth, 18), h = pos(v.drawerHeight, 6);
  const size = w < 12 ? 0 : w < 24 ? 1 : w <= 36 ? 2 : 3;
  return { pullSize: size, centerToCenterIn: [0, 3.75, 5.0394, 7.5591][size], pullFromTopIn: r2(h > 10 ? 2.5 : h / 2), doorKnobFromEdgeIn: 2.5, doorKnobFromCornerIn: 2.5 };
};
export const PULL_SIZES = ["Knob (drawer under 12 in)", "3–4 in pull (12–24 in drawer)", "5–6 in pull (24–36 in drawer)", "Two pulls or an 8 in+ pull (over 36 in)"];

// ---------- Room planning ----------
export const homeTheater: CustomCalculator = (v) => {
  const d = pos(v.seatingDistance, 12) * 12;
  const thx = (0.728 * d) / 0.8716, smpte = (0.536 * d) / 0.8716;
  return { thxDiagonalIn: Math.round(thx), smpteDiagonalIn: Math.round(smpte), rows: Math.max(1, Math.floor((pos(v.roomLength, 20) - pos(v.seatingDistance, 12) + 3) / 6)), seatsPerRow: Math.max(1, Math.floor(pos(v.roomWidth, 14) / 2.2)) };
};

export const FIT_RESULTS = ["Fits flat — the depth or height clears the door", "Fits if tilted — the diagonal depth clears the door", "Unlikely to fit — measure again or remove legs / the door"];
export const furnitureFit: CustomCalculator = (v) => {
  const dw = pos(v.doorWidth, 32), dh = pos(v.doorHeight, 80);
  const h = pos(v.height, 34), d = pos(v.depth, 38), diag = pos(v.diagonalDepth) || Math.sqrt(h * h + d * d) * 0.6;
  const flat = Math.min(h, d) < dw - 0.5;
  const tilt = diag < dw - 0.5;
  const length = pos(v.length, 84);
  return { result: flat ? 0 : tilt ? 1 : 2, doorDiagonalIn: r1(Math.sqrt(dw * dw + dh * dh)), clearanceIn: r1(dw - Math.min(h, d, diag)), upendOk: length < Math.sqrt(dw * dw + dh * dh) ? 1 : 0 };
};

export const ACOUSTIC_USES = ["Home theater (0.3 s)", "Recording / control room (0.25 s)", "Living room (0.5 s)", "Office or meeting room (0.5 s)"];
const RT_TARGET = [0.3, 0.25, 0.5, 0.5];
export const acousticPanels: CustomCalculator = (v) => {
  const L = pos(v.length, 16), W = pos(v.width, 12), H = pos(v.height, 8);
  const V = L * W * H, S = 2 * (L * W + L * H + W * H);
  const A0 = S * [0.05, 0.12][pick(v.furnished, 2)];
  const target = RT_TARGET[pick(v.use, 4)];
  const need = Math.max(0, (0.049 * V) / target - A0);
  return { panels: ceil(need / 6.8), currentRt60: r2((0.049 * V) / A0), targetRt60: target, extraSabins: Math.round(need), wallCoveragePct: r1(((ceil(need / 6.8) * 8) / (2 * (L + W) * H)) * 100) };
};

export const beanBagFill: CustomCalculator = (v) => {
  const vol = pick(v.shape, 2) === 0 ? (Math.PI / 6) * pos(v.diameter, 36) ** 3 : pos(v.length, 30) * pos(v.width, 30) * pos(v.height, 24);
  const cuFt = (vol / 1728) * (pos(v.fill, 75) / 100);
  return { cubicFeet: r1(cuFt), liters: Math.round(cuFt * 28.32), bags: ceil(cuFt / Math.max(0.5, pos(v.bagCuFt, 4))) };
};

export const lampShade: CustomCalculator = (v) => {
  const bh = pos(v.baseHeight, 20), bw = pos(v.baseWidth, 6);
  const shadeH = bh * 0.66;
  const bottom = Math.max(bw * 2, bh * 0.8);
  return { shadeHeightIn: r1(shadeH), bottomDiameterIn: r1(bottom), topDiameterIn: r1(bottom * 0.75), harpIn: Math.round(shadeH * 0.85) };
};

export const bedHeight: CustomCalculator = (v) => {
  const knee = 0.285 * pos(v.height, 68);
  const top = knee + pos(v.extra, 1.5);
  return { mattressTopIn: r1(top), frameHeightIn: r1(Math.max(0, top - pos(v.mattress, 12))), kneeHeightIn: r1(knee) };
};

export const counterHeight: CustomCalculator = (v) => {
  const elbow = 0.63 * pos(v.height, 66);
  return { workCounterIn: r1(elbow - 5), bakingCounterIn: r1(elbow - 7), standardIn: 36, barHeightIn: 42, vanityIn: r1(Math.min(36, Math.max(30, elbow - 6))) };
};

export const STONES = ["Granite", "Quartz (engineered)", "Marble", "Quartzite", "Soapstone", "Porcelain slab"];
const STONE_D = [2.7, 2.45, 2.71, 2.65, 2.98, 2.4];
export const stoneSlabWeight: CustomCalculator = (v) => {
  const sqft = (pos(v.lengthIn, 96) * pos(v.depthIn, 25.5)) / 144;
  const cm = [2, 3, 1.2][pick(v.thickness, 3)];
  const kgM2 = STONE_D[pick(v.stone, 6)] * cm * 10;
  const lbSqFt = kgM2 * 0.2048;
  return { weightLb: Math.round(sqft * lbSqFt), weightKg: Math.round(sqft * lbSqFt * 0.4536), lbPerSqFt: r1(lbSqFt), sqFt: r1(sqft), carriers: Math.max(2, ceil((sqft * lbSqFt) / 75)) };
};

export const countertopArea: CustomCalculator = (v) => {
  const s = [[v.l1, v.d1], [v.l2, v.d2], [v.l3, v.d3], [v.islandL, v.islandD]].reduce((t, [l, d]) => t + pos(l) * pos(d), 0) / 144;
  const splash = (pos(v.splashLength) * pos(v.splashHeight)) / 144;
  const net = Math.max(0, s + splash - pos(v.cutouts) / 144);
  return { sqFt: r1(net), topSqFt: r1(s), splashSqFt: r1(splash), slabs: ceil((net * 1.2) / 45.8) };
};

export const hgFloorCustomCalculators: Record<string, CustomCalculator> = {
  "paint-calculator": paint,
  "ceiling-paint-calculator": ceilingPaint,
  "exterior-paint-calculator": exteriorPaint,
  "commercial-painting-cost-calculator": commercialPaintingCost,
  "accent-wall-calculator": accentWall,
  "wallpaper-calculator": wallpaper,
  "fabric-yardage-calculator": fabricYardage,
  "flooring-calculator": flooring,
  "laminate-flooring-calculator": plankFlooring,
  "vinyl-plank-flooring-calculator": plankFlooring,
  "hardwood-flooring-calculator": plankFlooring,
  "carpet-calculator": carpet,
  "stair-runner-calculator": stairRunner,
  "subfloor-calculator": subfloor,
  "radiant-floor-heating-calculator": radiantFloor,
  "polished-concrete-floor-cost-calculator": polishedConcreteCost,
  "drop-ceiling-cost-calculator": dropCeilingCost,
  "marble-flooring-cost-calculator": marbleFlooringCost,
  "tile-calculator": tile,
  "shower-tile-calculator": showerTile,
  "backsplash-calculator": backsplash,
  "thinset-calculator": thinset,
  "tile-layout-calculator": tileLayout,
  "baseboard-trim-calculator": baseboardTrim,
  "crown-molding-calculator": crownMolding,
  "wainscoting-calculator": wainscoting,
  "frame-molding-calculator": frameMolding,
  "picture-spacing-calculator": pictureSpacing,
  "cabinet-door-calculator": cabinetDoor,
  "cabinet-hardware-calculator": cabinetHardware,
  "home-theater-size-calculator": homeTheater,
  "furniture-fit-door-calculator": furnitureFit,
  "acoustic-panels-calculator": acousticPanels,
  "bean-bag-fill-calculator": beanBagFill,
  "lamp-shade-size-calculator": lampShade,
  "bed-height-calculator": bedHeight,
  "counter-height-calculator": counterHeight,
  "stone-slab-weight-calculator": stoneSlabWeight,
  "countertop-area-calculator": countertopArea,
};
