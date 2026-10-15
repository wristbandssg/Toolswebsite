/**
 * Batch: "Shopping Calculators" → Home Improvement Cost & Sizing — doors,
 * garages, sheds, kitchens, outdoor areas and lighting (10 tools):
 *
 *  - doorSize: door slab ↔ rough opening (+2 in wide, +2.5 in tall).
 *  - garageDoorSize: width and height for the vehicles, plus headroom and
 *    side room the tracks need.
 *  - garageSize: garage dimensions for cars plus workshop or storage space.
 *  - storageShedSize: floor area from what you'll store plus access space,
 *    matched to standard shed sizes.
 *  - kitchenIslandSize: the island that leaves 42–48 in aisles, with
 *    seating.
 *  - rangeHoodSize: hood width and CFM (gas BTU ÷ 100 or 10 CFM per inch
 *    of electric cooktop; more for islands), height and duct size.
 *  - firePitSize: pit diameter and seating circle for a number of people.
 *  - shadeSail: sail size from the fixing points minus hardware allowance,
 *    the shaded area and cost.
 *  - recessedLightingSpacing: can spacing = ceiling height ÷ 2, layout and
 *    lumens.
 *  - lumens: lumens needed for a room by use, bulbs and LED watts.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-home-spaces-calculators.ts for the copy.
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

const DOOR_WIDTHS = [24, 28, 30, 32, 36];

export const doorSize: CustomCalculator = (v) => {
  const fromSlab = safeNumber(v.mode) === 0;
  const w = nonNeg(v.width);
  const h = nonNeg(v.height);
  const slabW = fromSlab ? w : w - 2;
  const slabH = fromSlab ? h : h - 2.5;
  const std = DOOR_WIDTHS.findIndex((d) => Math.abs(d - slabW) < 0.75);
  return {
    roughOpeningWidth: round2(slabW + 2),
    roughOpeningHeight: round2(slabH + 2.5),
    slabWidth: round2(slabW),
    slabHeight: round2(slabH),
    prehungUnitWidth: round2(slabW + 1.5),
    standardSizeCode: std < 0 ? 0 : std + 1,
  };
};

export const garageDoorSize: CustomCalculator = (v) => {
  const cars = Math.max(1, Math.round(nonNeg(v.vehicles) || 1));
  const tall = nonNeg(v.tallestVehicle);
  const wide = safeNumber(v.wideVehicles) === 1;
  const doors = safeNumber(v.layout) === 1 ? cars : 1;
  const perDoor = doors === 1 ? cars : 1;
  const width = perDoor === 1 ? (wide ? 10 : 9) : perDoor === 2 ? (wide ? 18 : 16) : 8 + perDoor * 9;
  const height = tall > 6.5 ? 8 : 7;
  return {
    doorWidthFt: width,
    doorHeightFt: height,
    doorsNeeded: doors,
    headroomIn: 15,
    sideRoomIn: 4,
    backroomFt: height + 1.5,
  };
};

export const garageSize: CustomCalculator = (v) => {
  const cars = Math.max(1, Math.round(nonNeg(v.cars) || 1));
  const comfy = safeNumber(v.comfort) === 1;
  const width = cars * (comfy ? 12 : 10) + (comfy ? 2 : 0);
  const depth = (comfy ? 24 : 22) + (safeNumber(v.truck) === 1 ? 4 : 0) + nonNeg(v.workshopDepth);
  const side = nonNeg(v.storageWidth);
  return {
    widthFt: width + side,
    depthFt: depth,
    floorAreaSqFt: (width + side) * depth,
    doorWidthNeeded: cars === 1 ? 9 : 16,
  };
};

const SHEDS: [number, number][] = [[6, 8], [8, 8], [8, 10], [10, 10], [10, 12], [10, 14], [12, 12], [12, 16], [12, 20], [14, 24]];

export const storageShedSize: CustomCalculator = (v) => {
  const items =
    nonNeg(v.ridingMowers) * 30 +
    nonNeg(v.pushMowers) * 8 +
    nonNeg(v.bikes) * 8 +
    nonNeg(v.bins) * 3 +
    nonNeg(v.kayaks) * 10 +
    nonNeg(v.workbench) * 16 +
    nonNeg(v.otherSqFt);
  const needed = items * 1.4; // aisle and access space
  const i = SHEDS.findIndex(([a, b]) => a * b >= needed);
  const [w, d] = SHEDS[i < 0 ? SHEDS.length - 1 : i];
  return {
    shedWidthFt: w,
    shedDepthFt: d,
    shedAreaSqFt: w * d,
    itemFootprintSqFt: round2(items),
    areaNeededSqFt: round2(needed),
  };
};

export const kitchenIslandSize: CustomCalculator = (v) => {
  const L = nonNeg(v.kitchenLength) * 12;
  const W = nonNeg(v.kitchenWidth) * 12;
  const cab = nonNeg(v.counterDepth) || 25;
  const aisle = safeNumber(v.twoCooks) === 1 ? 48 : 42;
  const runs = safeNumber(v.layout) === 1 ? 2 : 1; // counters on one or both long walls
  const maxDepth = Math.max(0, W - cab * runs - aisle * 2);
  const maxLen = Math.max(0, L - 2 * aisle);
  const depth = Math.min(maxDepth, 48);
  const seatingOverhang = depth >= 36 ? 12 : 0;
  return {
    islandLength: Math.round(Math.min(maxLen, 120)),
    islandDepth: Math.round(depth),
    seats: depth >= 36 ? Math.floor(Math.min(maxLen, 120) / 24) : 0,
    seatingOverhang,
    aisleWidth: aisle,
    fitsIsland: depth >= 24 && maxLen >= 48 ? 1 : 0,
  };
};

export const rangeHoodSize: CustomCalculator = (v) => {
  const w = nonNeg(v.cooktopWidth);
  const gas = safeNumber(v.fuel) === 0;
  const island = safeNumber(v.mounting) === 1;
  const cfmBase = gas ? nonNeg(v.btu) / 100 : w * 10;
  const cfm = Math.ceil((island ? cfmBase * 1.2 : cfmBase) / 50) * 50;
  const duct = cfm <= 400 ? 6 : cfm <= 600 ? 7 : cfm <= 900 ? 8 : 10;
  return {
    hoodWidth: w + (island ? 6 : 3),
    recommendedCfm: cfm,
    mountHeightLow: gas ? 24 : 20,
    mountHeightHigh: gas ? 30 : 24,
    ductDiameter: duct,
    makeupAirLikely: cfm > 400 ? 1 : 0,
  };
};

export const firePitSize: CustomCalculator = (v) => {
  const people = Math.max(2, Math.round(nonNeg(v.people) || 2));
  const chairW = 30;
  const gap = nonNeg(v.seatDistance) || 30;
  const chair = nonNeg(v.chairDepth) || 30;
  const pit = Math.min(60, Math.max(30, 28 + people * 2));
  const circle = pit + 2 * (gap + chair);
  const byPeople = (people * chairW) / Math.PI + 2 * chair;
  const seating = Math.max(circle, byPeople);
  return {
    firePitDiameter: Math.round(pit),
    seatingCircleDiameterFt: round2(seating / 12),
    patioAreaSqFt: Math.round(Math.PI * (seating / 24) ** 2),
    clearanceFromHouseFt: safeNumber(v.fuel) === 1 ? 10 : 25,
  };
};

export const shadeSail: CustomCalculator = (v) => {
  const a = nonNeg(v.sideA);
  const b = nonNeg(v.sideB);
  const tri = safeNumber(v.shape) === 1;
  const gap = Math.max(0.5, Math.min(a, b) * 0.1); // hardware/tension allowance per side
  const sa = Math.max(0, a - gap);
  const sb = Math.max(0, b - gap);
  const area = tri ? (sa * sb) / 2 : sa * sb;
  return {
    sailSideA: round2(sa),
    sailSideB: round2(sb),
    shadeAreaSqFt: round2(area),
    estimatedSailCost: round2(area * nonNeg(v.pricePerSqFt)),
    hardwareAllowanceFt: round2(gap),
  };
};

const FOOTCANDLES = [10, 20, 30, 50, 70]; // bedroom, living, dining, kitchen/bath, office/workshop

export const recessedLightingSpacing: CustomCalculator = (v) => {
  const L = nonNeg(v.roomLength);
  const W = nonNeg(v.roomWidth);
  const ceiling = nonNeg(v.ceilingHeight);
  const spacing = Math.max(2, ceiling / 2);
  const cols = Math.max(1, Math.round(L / spacing));
  const rows = Math.max(1, Math.round(W / spacing));
  const lumens = L * W * FOOTCANDLES[idx(v.roomType, 4)];
  const total = rows * cols;
  return {
    spacingFt: round2(spacing),
    lightsNeeded: total,
    rows,
    perRow: cols,
    distanceFromWallFt: round2(spacing / 2),
    lumensPerLight: total > 0 ? Math.round(lumens / total) : 0,
  };
};

export const lumens: CustomCalculator = (v) => {
  const area = nonNeg(v.roomLength) * nonNeg(v.roomWidth);
  const fc = FOOTCANDLES[idx(v.roomType, 4)];
  const total = area * fc * (safeNumber(v.darkSurfaces) === 1 ? 1.25 : 1);
  const perBulb = nonNeg(v.lumensPerBulb) || 800;
  return {
    lumensNeeded: Math.round(total),
    bulbsNeeded: Math.ceil(total / perBulb),
    ledWatts: Math.round(total / 90),
    incandescentEquivalentWatts: Math.round(total / 15),
    footCandles: fc,
  };
};

export const shoppingHomeSpacesCustomCalculators: Record<string, CustomCalculator> = {
  "door-size-calculator": doorSize,
  "garage-door-size-calculator": garageDoorSize,
  "garage-size-calculator": garageSize,
  "storage-shed-size-calculator": storageShedSize,
  "kitchen-island-size-calculator": kitchenIslandSize,
  "range-hood-size-calculator": rangeHoodSize,
  "fire-pit-size-calculator": firePitSize,
  "shade-sail-calculator": shadeSail,
  "recessed-lighting-spacing-calculator": recessedLightingSpacing,
  "lumens-calculator": lumens,
};
