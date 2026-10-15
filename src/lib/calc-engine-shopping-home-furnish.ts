/**
 * Batch: "Shopping Calculators" → Home Improvement Cost & Sizing —
 * furnishing sizes (9 tools). Each uses the interior designers' rule of
 * thumb for that item:
 *
 *  - curtainSize (also curtain rod length): rod = window + extension each
 *    side; total fabric width = rod × fullness; panel count and the
 *    standard panel length for the chosen hem.
 *  - rugSize (also rug pad size): room minus a floor border for the
 *    layout, matched to standard rug sizes, and the pad size.
 *  - diningTableSize: the largest table that leaves 36–42 in clearance,
 *    its seating and a round-table alternative.
 *  - tableclothSize: table plus a drop on every side, matched to standard
 *    tablecloth sizes.
 *  - sofaSize: up to two-thirds of the wall, with depth that keeps a
 *    walkway, and how many it seats.
 *  - coffeeTableSize: about two-thirds of the sofa's length, 1–2 in below
 *    the seat, 14–18 in away.
 *  - furnitureToRoomSize: how much of the floor your furniture covers.
 *  - mattressSize: the mattress for sleepers and height, and the room it
 *    needs.
 *  - barStoolHeight: seat height 10–12 in below the counter and how many
 *    stools fit.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-home-furnish-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const idx = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(safeNumber(v))));

const PANEL_LENGTHS = [63, 84, 95, 108, 120, 132];

export const curtainSize: CustomCalculator = (v) => {
  const w = nonNeg(v.windowWidth);
  const rod = w + 2 * nonNeg(v.extension);
  const fullness = [1.5, 2, 2.5, 3][idx(v.fullness, 3)];
  const fabric = rod * fullness;
  const panelWidth = Math.max(1, nonNeg(v.panelWidth) || 50);
  const panels = Math.max(2, Math.ceil(fabric / panelWidth / 2) * 2);
  const top = nonNeg(v.windowHeight) + nonNeg(v.mountAbove);
  // Hem: 0 sill (stop at the window bottom), 1 below sill (+6), 2 floor (to floor, needs floor height), 3 puddle (+4 past floor).
  const hem = idx(v.hem, 3);
  const floorDrop = nonNeg(v.windowToFloor);
  const needed = hem === 0 ? top : hem === 1 ? top + 6 : hem === 2 ? top + floorDrop - 0.5 : top + floorDrop + 4;
  const standard = PANEL_LENGTHS.find((l) => l >= needed) ?? PANEL_LENGTHS[PANEL_LENGTHS.length - 1];
  return {
    rodLength: round2(rod),
    totalFabricWidth: round2(fabric),
    panelsNeeded: panels,
    exactLength: round2(needed),
    standardPanelLength: standard,
  };
};

const RUGS: [number, number][] = [[3, 5], [4, 6], [5, 8], [6, 9], [8, 10], [9, 12], [10, 14], [12, 15]];

export const rugSize: CustomCalculator = (v) => {
  const L = nonNeg(v.roomLength);
  const W = nonNeg(v.roomWidth);
  const border = [1.5, 2, 4][idx(v.layout, 2)]; // all legs on, front legs on, floating (ft per side)
  const maxL = Math.max(0, L - 2 * border);
  const maxW = Math.max(0, W - 2 * border);
  const long = Math.max(maxL, maxW);
  const short = Math.min(maxL, maxW);
  let best = 0;
  RUGS.forEach(([a, b], i) => {
    if (b <= long && a <= short) best = i + 1;
  });
  const [rs, rl] = best > 0 ? RUGS[best - 1] : [0, 0];
  return {
    rugSizeCode: best,
    rugWidthFt: rs,
    rugLengthFt: rl,
    maxRugWidthFt: round2(short),
    maxRugLengthFt: round2(long),
    padWidthIn: rs > 0 ? rs * 12 - 2 : 0,
    padLengthIn: rl > 0 ? rl * 12 - 2 : 0,
  };
};

export const diningTableSize: CustomCalculator = (v) => {
  const L = nonNeg(v.roomLength) * 12;
  const W = nonNeg(v.roomWidth) * 12;
  const clear = Math.max(30, nonNeg(v.clearance) || 36);
  const tl = Math.max(0, Math.max(L, W) - 2 * clear);
  const tw = Math.max(0, Math.min(L, W) - 2 * clear);
  const width = Math.min(tw, 42);
  const length = Math.min(tl, 144);
  // 24 in of edge per diner along each side, plus one at each end on tables 36 in wide or more.
  const seats = length >= 48 ? 2 * Math.floor(length / 24) + (width >= 36 ? 2 : 0) : 4;
  return {
    maxTableLength: Math.round(length),
    maxTableWidth: Math.round(width),
    seats: Math.max(2, Math.min(14, seats)),
    roundTableDiameter: Math.round(Math.min(tl, tw, 72)),
  };
};

const CLOTH_RECT: [number, number][] = [[52, 70], [60, 84], [60, 102], [60, 120], [70, 120], [90, 132], [90, 156]];
const CLOTH_ROUND = [60, 70, 90, 108, 120, 132];

export const tableclothSize: CustomCalculator = (v) => {
  const round = safeNumber(v.shape) === 1;
  const drop = [7, 10, 15, 29.5][idx(v.drop, 3)];
  if (round) {
    const need = nonNeg(v.tableLength) + 2 * drop;
    const std = CLOTH_ROUND.find((d) => d >= need) ?? CLOTH_ROUND[CLOTH_ROUND.length - 1];
    return { neededLength: round2(need), neededWidth: round2(need), standardLength: std, standardWidth: std, dropInches: drop };
  }
  const nl = nonNeg(v.tableLength) + 2 * drop;
  const nw = nonNeg(v.tableWidth) + 2 * drop;
  const std = CLOTH_RECT.find(([w, l]) => w >= nw && l >= nl) ?? CLOTH_RECT[CLOTH_RECT.length - 1];
  return { neededLength: round2(nl), neededWidth: round2(nw), standardLength: std[1], standardWidth: std[0], dropInches: drop };
};

export const sofaSize: CustomCalculator = (v) => {
  const wall = nonNeg(v.wallLength) * 12;
  const depth = nonNeg(v.roomDepth) * 12;
  const maxW = wall * (2 / 3);
  const walkway = nonNeg(v.walkway) || 36;
  const coffee = safeNumber(v.coffeeTable) === 1 ? 18 + 18 : 0; // gap + a small table depth
  const maxD = Math.max(0, Math.min(44, depth - walkway - coffee - 24));
  return {
    maxSofaWidth: Math.round(maxW),
    maxSofaDepth: Math.round(maxD),
    seats: Math.max(1, Math.floor(maxW / 30)),
    sectionalPossible: depth >= 156 && wall >= 120 ? 1 : 0,
  };
};

export const coffeeTableSize: CustomCalculator = (v) => {
  const sofa = nonNeg(v.sofaLength);
  const seat = nonNeg(v.seatHeight);
  return {
    idealLength: Math.round(sofa * (2 / 3)),
    lengthRangeLow: Math.round(sofa * 0.5),
    lengthRangeHigh: Math.round(sofa * 0.75),
    tableHeightLow: Math.round(Math.max(0, seat - 2)),
    tableHeightHigh: Math.round(seat),
    gapFromSofa: 16,
  };
};

export const furnitureToRoomSize: CustomCalculator = (v) => {
  const room = nonNeg(v.roomLength) * nonNeg(v.roomWidth);
  let foot = 0;
  for (let i = 1; i <= 5; i++) foot += (nonNeg(v[`len${i}`]) * nonNeg(v[`wid${i}`])) / 144;
  const cover = room > 0 ? (foot / room) * 100 : 0;
  return {
    floorCoveredPercent: round2(cover),
    furnitureFootprintSqFt: round2(foot),
    freeFloorSqFt: round2(Math.max(0, room - foot)),
    fitCode: cover <= 40 ? 1 : cover <= 55 ? 2 : cover <= 65 ? 3 : 4,
    roomSqFt: round2(room),
  };
};

/** [width, length] in inches: twin, twin XL, full, queen, king, California king. */
const MATTRESS: [number, number][] = [[38, 75], [38, 80], [54, 75], [60, 80], [76, 80], [72, 84]];

export const mattressSize: CustomCalculator = (v) => {
  const sleepers = Math.max(1, Math.round(nonNeg(v.sleepers) || 1));
  const tallest = nonNeg(v.tallestHeight);
  const extra = safeNumber(v.petsOrKids) === 1;
  let code: number;
  if (sleepers === 1) code = tallest > 72 ? 2 : extra ? 3 : 1;
  else code = tallest > 76 ? 6 : extra || safeNumber(v.sleepStyle) === 1 ? 5 : 4;
  const [w, l] = MATTRESS[code - 1];
  const sideRoom = 24;
  return {
    mattressCode: code,
    mattressWidth: w,
    mattressLength: l,
    minRoomWidthFt: round2((w + 2 * sideRoom) / 12),
    minRoomLengthFt: round2((l + 36) / 12),
  };
};

export const barStoolHeight: CustomCalculator = (v) => {
  const counter = nonNeg(v.counterHeight);
  const seat = counter - 11;
  const stoolW = nonNeg(v.stoolWidth) || 18;
  const gap = nonNeg(v.spacing) || 8;
  const length = nonNeg(v.counterLength);
  return {
    seatHeight: Math.round(seat),
    seatHeightLow: Math.round(counter - 12),
    seatHeightHigh: Math.round(counter - 10),
    stoolsThatFit: length > 0 ? Math.max(0, Math.floor((length + gap) / (stoolW + gap))) : 0,
    stoolTypeCode: counter <= 32 ? 1 : counter <= 39 ? 2 : 3,
  };
};

export const shoppingHomeFurnishCustomCalculators: Record<string, CustomCalculator> = {
  "curtain-size-calculator": curtainSize,
  "rug-size-calculator": rugSize,
  "dining-table-size-calculator": diningTableSize,
  "tablecloth-size-calculator": tableclothSize,
  "sofa-size-calculator": sofaSize,
  "coffee-table-size-calculator": coffeeTableSize,
  "furniture-to-room-size-calculator": furnitureToRoomSize,
  "mattress-size-calculator": mattressSize,
  "bar-stool-height-calculator": barStoolHeight,
};
