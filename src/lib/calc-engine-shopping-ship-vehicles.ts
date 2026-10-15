/**
 * Batch: "Shopping Calculators" → Shipping & Moving Cost — vehicles and
 * bulky goods (6 tools). Transport prices taper with distance (long hauls
 * cost less per mile), modelled as a × miles^0.75 + a pickup/handling base:
 *
 *  - carShipping: open or enclosed auto transport by vehicle type.
 *  - boatShipping: per-mile boat hauling with oversize permits and escorts.
 *  - motorcycleShipping: open, enclosed or crated motorcycle transport.
 *  - heavyEquipmentShipping: flatbed, step deck or RGN with permits/escorts.
 *  - furnitureShipping: curbside freight, blanket wrap or white glove.
 *  - wineShipping: cases, weight, speed, insurance and adult signature.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-ship-vehicles-calculators.ts for the copy.
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
const taper = (miles: number, a: number, base: number) => (miles > 0 ? a * Math.pow(miles, 0.75) + base : 0);

const CAR_TYPE = [1, 1.15, 1.25, 1.5]; // sedan, SUV/crossover, pickup/van, oversized or modified

export const carShipping: CustomCalculator = (v) => {
  const miles = nonNeg(v.distanceMiles);
  let cost = taper(miles, 5, 150) * CAR_TYPE[idx(v.vehicleType, 3)];
  if (idx(v.transport, 1) === 1) cost *= 1.6;
  if (cost > 0 && idx(v.running, 1) === 1) cost += 175;
  if (cost > 0 && idx(v.expedited, 1) === 1) cost *= 1.3;
  return {
    estimatedCost: round2(cost),
    lowEstimate: round2(cost * 0.85),
    highEstimate: round2(cost * 1.2),
    costPerMile: miles > 0 ? round2(cost / miles) : 0,
    transitDays: miles > 0 ? Math.ceil(miles / 450) + 1 : 0,
  };
};

export const boatShipping: CustomCalculator = (v) => {
  const miles = nonNeg(v.distanceMiles);
  const len = nonNeg(v.lengthFt);
  const beam = nonNeg(v.beamFt);
  const perMile = 2 + Math.max(0, len - 20) * 0.1 + (idx(v.onOwnTrailer, 1) === 1 ? 0 : 0.6);
  const permits = beam > 8.5 ? 0.75 * miles : 0;
  const escort = beam > 12 ? 1.8 * miles : 0;
  const haul = miles > 0 ? Math.max(400, perMile * miles) : 0;
  const total = haul + permits + escort + (miles > 0 ? nonNeg(v.prepCost) : 0);
  return {
    totalCost: round2(total),
    haulingCost: round2(haul),
    permitsAndEscorts: round2(permits + escort),
    costPerMile: miles > 0 ? round2(total / miles) : 0,
    oversizeLoad: beam > 8.5 ? 1 : 0,
  };
};

export const motorcycleShipping: CustomCalculator = (v) => {
  const miles = nonNeg(v.distanceMiles);
  const m = idx(v.method, 2);
  let cost = taper(miles, 3, 150) * [1, 1.4, 1.25][m] * (idx(v.bikeType, 1) === 1 ? 1.15 : 1);
  if (cost > 0 && m === 2) cost += nonNeg(v.crateFee);
  return {
    estimatedCost: round2(cost),
    lowEstimate: round2(cost * 0.85),
    highEstimate: round2(cost * 1.2),
    costPerMile: miles > 0 ? round2(cost / miles) : 0,
    transitDays: miles > 0 ? Math.ceil(miles / 400) + 2 : 0,
  };
};

const TRAILER_RATE = [3, 3.5, 5.5]; // flatbed, step deck, RGN / lowboy ($/mile)

export const heavyEquipmentShipping: CustomCalculator = (v) => {
  const miles = nonNeg(v.distanceMiles);
  const lb = nonNeg(v.weightLb);
  const width = nonNeg(v.widthFt);
  const t = idx(v.trailer, 2);
  const heavy = lb > 48000;
  const rate = TRAILER_RATE[t] * (heavy ? 1.35 : 1);
  const haul = miles > 0 ? Math.max(600, rate * miles) : 0;
  const states = Math.max(1, Math.round(nonNeg(v.statesCrossed) || 1));
  const oversize = width > 8.5 || heavy;
  const permits = miles > 0 && oversize ? states * (heavy ? 250 : 100) : 0;
  const escorts = miles > 0 && width > 12 ? 1.75 * miles * (width > 14 ? 2 : 1) : 0;
  const total = haul + permits + escorts + (miles > 0 ? nonNeg(v.loadingFee) : 0);
  return {
    totalCost: round2(total),
    haulingCost: round2(haul),
    permitCost: round2(permits),
    escortCost: round2(escorts),
    costPerMile: miles > 0 ? round2(total / miles) : 0,
    oversizeOrOverweight: oversize ? 1 : 0,
  };
};

const FURN_SERVICE = [1, 1.6, 2.4]; // curbside freight, blanket wrap, white glove

export const furnitureShipping: CustomCalculator = (v) => {
  const cuft = nonNeg(v.cubicFeet);
  const miles = nonNeg(v.distanceMiles);
  const base = cuft * (1.5 + miles * 0.0025) * FURN_SERVICE[idx(v.service, 2)];
  const cost = cuft > 0 && miles > 0 ? Math.max(250, base) + nonNeg(v.crating) : 0;
  return {
    estimatedCost: round2(cost),
    costPerCubicFoot: cuft > 0 ? round2(cost / cuft) : 0,
    estimatedWeightLb: Math.round(cuft * 7),
    lowEstimate: round2(cost * 0.8),
    highEstimate: round2(cost * 1.25),
  };
};

const zoneFactor = (zone: number) => 1 + 0.09 * (Math.min(8, Math.max(1, Math.round(zone || 1))) - 2);
const WINE_SPEED: [number, number][] = [[14, 0.95], [28, 1.9], [55, 3.6]]; // ground, 2-day, overnight per box

export const wineShipping: CustomCalculator = (v) => {
  const bottles = Math.round(nonNeg(v.bottles));
  const perBox = Math.max(1, Math.round(nonNeg(v.bottlesPerBox) || 12));
  const boxes = Math.ceil(bottles / perBox);
  const [base, perLb] = WINE_SPEED[idx(v.service, 2)];
  let ship = 0;
  for (let i = 0; i < boxes; i++) {
    const inBox = Math.min(perBox, bottles - i * perBox);
    const lb = Math.ceil(inBox * 3 + 2);
    ship += (base + perLb * lb) * zoneFactor(nonNeg(v.zone)) + nonNeg(v.adultSignatureFee);
  }
  const packaging = boxes * (perBox >= 12 ? 28 : perBox >= 6 ? 18 : 8);
  const insurance = (Math.ceil(nonNeg(v.declaredValue) / 100) * nonNeg(v.insurancePer100));
  const total = ship + packaging + insurance;
  return {
    totalCost: round2(total),
    shippingCost: round2(ship),
    packagingCost: packaging,
    insuranceCost: round2(insurance),
    costPerBottle: bottles > 0 ? round2(total / bottles) : 0,
    boxes,
  };
};

export const shoppingShipVehiclesCustomCalculators: Record<string, CustomCalculator> = {
  "car-shipping-cost-calculator": carShipping,
  "boat-shipping-cost-calculator": boatShipping,
  "motorcycle-shipping-cost-calculator": motorcycleShipping,
  "heavy-equipment-shipping-cost-calculator": heavyEquipmentShipping,
  "furniture-shipping-cost-calculator": furnitureShipping,
  "wine-shipping-cost-calculator": wineShipping,
};
