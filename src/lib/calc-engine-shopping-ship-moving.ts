/**
 * Batch: "Shopping Calculators" → Shipping & Moving Cost — moving and
 * storage (7 tools). Home sizes share one index: studio, 1, 2, 3, 4 and 5+
 * bedrooms.
 *
 *  - movingCost: local movers by crew, hours, stairs, packing and tip.
 *  - longDistanceMovingCost: interstate move by shipment weight and miles,
 *    with packing, storage-in-transit and full-value protection.
 *  - podMovingCost: portable containers (8/12/16 ft) local or long distance.
 *  - movingTruckSize: cubic feet needed and the rental truck that fits.
 *  - movingBox: boxes by size, tape and supply cost.
 *  - storageUnitSize: unit size from rooms, boxes and a vehicle.
 *  - storageUnitCost: rent over the stay with climate control, insurance,
 *    admin fee and move-in discount.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-ship-moving-calculators.ts for the copy.
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
const home = (v: number) => idx(v, 5);

const CREW = [2, 2, 3, 3, 4, 4];
const HOURS = [3, 4, 6, 8, 10, 12];
const MATERIALS = [100, 150, 250, 400, 550, 700];
const STAIRS = [1, 1.15, 1.3];

export const movingCost: CustomCalculator = (v) => {
  const h = home(v.homeSize);
  const movers = CREW[h];
  const packing = idx(v.packing, 1) === 1;
  const hours = (HOURS[h] * STAIRS[idx(v.stairs, 2)] + nonNeg(v.driveMinutes) / 60) * (packing ? 1.4 : 1);
  const billedHours = Math.ceil(hours * 2) / 2;
  const labor = billedHours * movers * nonNeg(v.hourlyPerMover);
  const materials = packing ? MATERIALS[h] : 0;
  const base = labor + nonNeg(v.truckFee) + materials;
  const tip = (labor * nonNeg(v.tipPercent)) / 100;
  return {
    totalCost: round2(base + tip),
    laborCost: round2(labor),
    estimatedHours: billedHours,
    movers,
    packingMaterials: materials,
    tip: round2(tip),
  };
};

const WEIGHT = [2000, 3500, 6000, 9000, 12000, 15000];

export const longDistanceMovingCost: CustomCalculator = (v) => {
  const lb = nonNeg(v.weightLb) || WEIGHT[home(v.homeSize)];
  const miles = nonNeg(v.distanceMiles);
  const transport = miles > 0 ? lb * (0.35 + 0.0004 * miles) + 300 : 0;
  const packing = idx(v.packing, 1) === 1 ? lb * 0.12 : 0;
  const storage = nonNeg(v.storageMonths) * lb * 0.035;
  const valuation = (nonNeg(v.declaredValue) * nonNeg(v.valuationRate)) / 100;
  const total = transport + packing + storage + valuation;
  return {
    totalCost: round2(total),
    transportCost: round2(transport),
    packingCost: round2(packing),
    storageCost: round2(storage),
    valuationCost: round2(valuation),
    shipmentWeightLb: lb,
    costPerMile: miles > 0 ? round2(total / miles) : 0,
  };
};

const POD_RENT = [150, 190, 250]; // monthly, 8 / 12 / 16 ft
const POD_LONG_BASE = [1100, 1500, 1900];
const POD_LONG_MILE = [0.5, 0.7, 0.9];

export const podMovingCost: CustomCalculator = (v) => {
  const s = idx(v.containerSize, 2);
  const n = Math.max(1, Math.round(nonNeg(v.containers) || 1));
  const miles = nonNeg(v.distanceMiles);
  const local = miles <= 50;
  const transport = local ? 0 : (POD_LONG_BASE[s] + POD_LONG_MILE[s] * miles) * n;
  const delivery = nonNeg(v.deliveryFee) * (local ? 3 : 2) * n;
  const months = Math.max(1, nonNeg(v.months) || 1);
  const rent = POD_RENT[s] * months * n;
  const labor = nonNeg(v.laborHours) * 2 * nonNeg(v.laborRate);
  const total = transport + delivery + rent + labor;
  return {
    totalCost: round2(total),
    transportCost: round2(transport),
    rentalCost: round2(rent),
    deliveryFees: round2(delivery),
    laborCost: round2(labor),
    costPerContainer: round2(total / n),
  };
};

const CUFT = [400, 600, 900, 1250, 1600, 2000];
const TRUCKS: [number, number, number][] = [[10, 402, 20], [15, 764, 30], [20, 1016, 40], [26, 1682, 40]]; // ft, cu ft, base day rate

export const movingTruckSize: CustomCalculator = (v) => {
  const need = CUFT[home(v.homeSize)] * [0.8, 1, 1.25][idx(v.furnishing, 2)] + nonNeg(v.extraCubicFeet);
  const fit = TRUCKS.find((t) => t[1] >= need) ?? TRUCKS[3];
  const trucks = Math.max(1, Math.ceil(need / fit[1]));
  const rental = trucks * (fit[2] + nonNeg(v.localMiles) * nonNeg(v.perMile));
  return {
    truckLengthFt: fit[0],
    cubicFeetNeeded: Math.round(need),
    loadPercent: round2((need / (fit[1] * trucks)) * 100),
    trucksNeeded: trucks,
    localRentalEstimate: round2(rental),
  };
};

// [small, medium, large, wardrobe] for an average-stuff home
const BOXES: [number, number, number, number][] = [
  [10, 8, 4, 1], [15, 12, 6, 2], [25, 20, 10, 3], [35, 28, 15, 4], [45, 35, 20, 5], [55, 45, 25, 6],
];

export const movingBox: CustomCalculator = (v) => {
  const f = [0.75, 1, 1.3][idx(v.stuffLevel, 2)];
  const people = Math.max(1, nonNeg(v.people) || 1);
  const extra = 1 + Math.max(0, people - 2) * 0.1;
  const [s, m, l, w] = BOXES[home(v.homeSize)].map((x) => Math.round(x * f * extra));
  const total = s + m + l + w;
  const tape = Math.ceil(total / 15);
  const cost = s * nonNeg(v.smallPrice) + m * nonNeg(v.mediumPrice) + l * nonNeg(v.largePrice) + w * nonNeg(v.wardrobePrice) + tape * 4;
  return {
    totalBoxes: total,
    smallBoxes: s,
    mediumBoxes: m,
    largeBoxes: l,
    wardrobeBoxes: w,
    tapeRolls: tape,
    estimatedCost: round2(cost),
  };
};

const UNITS = [25, 50, 75, 100, 150, 200, 300];

export const storageUnitSize: CustomCalculator = (v) => {
  const volume = nonNeg(v.rooms) * 250 + nonNeg(v.boxes) * 3 + nonNeg(v.largeItems) * 30;
  let sqft = volume / (nonNeg(v.stackHeightFt) || 7) / 0.7;
  if (idx(v.vehicle, 1) === 1) sqft += 180;
  const unit = UNITS.find((u) => u >= sqft) ?? 300;
  const units = sqft > 300 ? Math.ceil(sqft / 300) : sqft > 0 ? 1 : 0;
  return {
    unitSqFt: sqft > 0 ? unit : 0,
    unitsNeeded: units,
    volumeCuFt: Math.round(volume),
    floorAreaNeededSqFt: round2(sqft),
    fillPercent: sqft > 0 ? round2((sqft / (unit * units)) * 100) : 0,
  };
};

const UNIT_RENT = [45, 70, 95, 130, 170, 215, 300]; // average US monthly, 5×5 … 10×30

export const storageUnitCost: CustomCalculator = (v) => {
  const u = idx(v.unit, 6);
  const months = Math.round(nonNeg(v.months));
  const monthly = UNIT_RENT[u] * [0.8, 1, 1.4][idx(v.market, 2)] * (idx(v.climate, 1) === 1 ? 1.3 : 1);
  const discount = months > 0 ? (monthly * nonNeg(v.firstMonthDiscount)) / 100 : 0;
  const rent = monthly * months - discount;
  const total = months > 0 ? rent + months * nonNeg(v.insurancePerMonth) + nonNeg(v.adminFee) : 0;
  return {
    totalCost: round2(total),
    monthlyRent: round2(monthly),
    averagePerMonth: months > 0 ? round2(total / months) : 0,
    costPerSqFtMonth: round2(monthly / UNITS[u]),
    moveInDiscount: round2(discount),
  };
};

export const shoppingShipMovingCustomCalculators: Record<string, CustomCalculator> = {
  "moving-cost-calculator": movingCost,
  "long-distance-moving-cost-calculator": longDistanceMovingCost,
  "pod-moving-cost-calculator": podMovingCost,
  "moving-truck-size-calculator": movingTruckSize,
  "moving-box-calculator": movingBox,
  "storage-unit-size-calculator": storageUnitSize,
  "storage-unit-cost-calculator": storageUnitCost,
};
