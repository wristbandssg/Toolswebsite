/**
 * Batch: "Shopping Calculators" → Shipping & Moving Cost — freight and
 * containers (7 tools):
 *
 *  - freightClass: NMFC density-based class (50–500) from size and weight.
 *  - freightShippingCost: LTL line haul by weight, class and distance with
 *    fuel surcharge and accessorials.
 *  - palletShippingCost: per-pallet LTL estimate vs a full truckload.
 *  - airFreightCost: chargeable weight (÷ 6,000) and total air freight cost.
 *  - containerShippingCost: 20 ft / 40 ft / 40 ft HC ocean freight plus
 *    origin, destination, drayage, broker and duty to landed cost.
 *  - containerLoad: how many cartons fit a container by space and by payload.
 *  - cbm: cubic metres, cubic feet and air/sea chargeable weights.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-ship-freight-calculators.ts for the copy.
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

// NMFC 13-tier-style density scale: [minimum pcf, class]
const DENSITY: [number, number][] = [
  [50, 50], [35, 55], [30, 60], [22.5, 65], [15, 70], [13.5, 77.5], [12, 85], [10.5, 92.5],
  [9, 100], [8, 110], [7, 125], [6, 150], [5, 175], [4, 200], [3, 250], [2, 300], [1, 400],
];
const classFor = (pcf: number) => (DENSITY.find(([min]) => pcf >= min) ?? [0, 500])[1];

export const freightClass: CustomCalculator = (v) => {
  const n = Math.max(1, Math.round(nonNeg(v.pieces) || 1));
  const cuft = ((nonNeg(v.length) * nonNeg(v.width) * nonNeg(v.height)) / 1728) * n;
  const weight = nonNeg(v.weightLb) * n;
  const pcf = cuft > 0 ? weight / cuft : 0;
  return {
    freightClass: cuft > 0 && weight > 0 ? classFor(pcf) : 0,
    densityPcf: round2(pcf),
    totalCubicFeet: round2(cuft),
    totalWeightLb: round2(weight),
  };
};

/** LTL rate per 100 lb before discount: rises with distance and class. */
const cwtRate = (miles: number, cls: number) => (20 + miles * 0.07) * Math.pow(Math.max(50, cls) / 100, 0.85);

export const freightShippingCost: CustomCalculator = (v) => {
  const lb = nonNeg(v.weightLb);
  const miles = nonNeg(v.distanceMiles);
  const cls = nonNeg(v.freightClass) || 100;
  const gross = (lb / 100) * cwtRate(miles, cls);
  const discounted = lb > 0 ? Math.max(nonNeg(v.minimumCharge), gross * (1 - nonNeg(v.discount) / 100)) : 0;
  const fuel = (discounted * nonNeg(v.fuelSurcharge)) / 100;
  const total = discounted + fuel + (lb > 0 ? nonNeg(v.accessorials) : 0);
  return {
    totalCost: round2(total),
    lineHaul: round2(discounted),
    fuelSurchargeCost: round2(fuel),
    costPerLb: lb > 0 ? round2(total / lb) : 0,
    costPerMile: miles > 0 ? round2(total / miles) : 0,
  };
};

const PALLET_SPEED = [1, 1.45, 2.3]; // standard LTL, guaranteed / expedited, white glove

export const palletShippingCost: CustomCalculator = (v) => {
  const n = Math.round(nonNeg(v.pallets));
  const lb = nonNeg(v.weightPerPalletLb);
  const miles = nonNeg(v.distanceMiles);
  const each = n > 0 ? (110 + miles * 0.32 * (0.55 + 0.45 * (lb / 1000))) * PALLET_SPEED[idx(v.service, 2)] : 0;
  const ltl = each * n + (n > 0 ? nonNeg(v.accessorials) : 0);
  const ftl = n > 0 ? Math.max(900, miles * nonNeg(v.truckRatePerMile)) : 0;
  return {
    totalCost: round2(ltl),
    costPerPallet: n > 0 ? round2(ltl / n) : 0,
    fullTruckloadEstimate: round2(ftl),
    cheaperOption: n > 0 ? (ltl <= ftl ? 1 : 2) : 0,
    totalWeightLb: round2(n * lb),
  };
};

export const airFreightCost: CustomCalculator = (v) => {
  const n = Math.max(1, Math.round(nonNeg(v.pieces) || 1));
  const actual = nonNeg(v.weightKgPerPiece) * n;
  const vol = ((nonNeg(v.lengthCm) * nonNeg(v.widthCm) * nonNeg(v.heightCm)) / 6000) * n;
  const kg = Math.ceil(Math.max(actual, vol) * 2 - 1e-9) / 2;
  const freight = kg * (nonNeg(v.ratePerKg) + nonNeg(v.surchargePerKg));
  const total = kg > 0 ? freight + nonNeg(v.fixedFees) : 0;
  return {
    totalCost: round2(total),
    chargeableKg: kg,
    volumetricKg: round2(vol),
    actualKg: round2(actual),
    costPerKg: kg > 0 ? round2(total / kg) : 0,
  };
};

// Usable volume (m³) and max payload (kg) for 20 ft, 40 ft, 40 ft high cube
const BOX_CBM = [33.2, 67.7, 76.3];
const BOX_PAYLOAD = [28000, 26700, 26500];
const BOX_INNER: [number, number, number][] = [[589, 235, 239], [1203, 235, 239], [1203, 235, 269]];

export const containerShippingCost: CustomCalculator = (v) => {
  const c = idx(v.container, 2);
  const n = Math.max(1, Math.round(nonNeg(v.containers) || 1));
  const perBox = nonNeg(v.oceanFreight) + nonNeg(v.originCharges) + nonNeg(v.destinationCharges) + nonNeg(v.drayage);
  const ship = perBox * n + nonNeg(v.customsBroker);
  const duty = (nonNeg(v.goodsValue) * nonNeg(v.dutyRate)) / 100;
  const loaded = BOX_CBM[c] * 0.85 * n;
  const units = nonNeg(v.units);
  return {
    totalShippingCost: round2(ship),
    dutyCost: round2(duty),
    landedCost: round2(ship + duty + nonNeg(v.goodsValue)),
    costPerCbm: round2(ship / loaded),
    shippingCostPerUnit: units > 0 ? round2((ship + duty) / units) : 0,
  };
};

export const containerLoad: CustomCalculator = (v) => {
  const c = idx(v.container, 2);
  const box = [nonNeg(v.lengthCm), nonNeg(v.widthCm), nonNeg(v.heightCm)];
  const [L, W, H] = BOX_INNER[c];
  let best = 0;
  if (box.every((d) => d > 0)) {
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    // Keep "this side up": when upright only, height must stay vertical.
    const upright = idx(v.upright, 1) === 1;
    for (const [a, b, h] of perms) {
      if (upright && h !== 2) continue;
      const count = Math.floor(L / box[a]) * Math.floor(W / box[b]) * Math.floor(H / box[h]);
      best = Math.max(best, count);
    }
  }
  const kg = nonNeg(v.weightKg);
  const byWeight = kg > 0 ? Math.floor(BOX_PAYLOAD[c] / kg) : best;
  const fit = Math.min(best, byWeight);
  const boxCbm = (box[0] * box[1] * box[2]) / 1e6;
  return {
    maxCartons: fit,
    cartonsBySpace: best,
    cartonsByWeight: byWeight,
    volumeUsedPercent: round2(((fit * boxCbm) / BOX_CBM[c]) * 100),
    totalWeightKg: round2(fit * kg),
  };
};

export const cbm: CustomCalculator = (v) => {
  const n = Math.max(1, Math.round(nonNeg(v.quantity) || 1));
  const m3 = ((nonNeg(v.lengthCm) * nonNeg(v.widthCm) * nonNeg(v.heightCm)) / 1e6) * n;
  const kg = nonNeg(v.weightKgEach) * n;
  return {
    totalCbm: Math.round(m3 * 1000) / 1000,
    cubicFeet: round2(m3 * 35.315),
    airChargeableKg: round2(Math.max(kg, (m3 * 1e6) / 6000)),
    seaRevenueTons: Math.round(Math.max(m3, kg / 1000) * 1000) / 1000,
    percentOf20ftContainer: round2((m3 / 33.2) * 100),
  };
};

export const shoppingShipFreightCustomCalculators: Record<string, CustomCalculator> = {
  "freight-class-calculator": freightClass,
  "freight-shipping-cost-calculator": freightShippingCost,
  "pallet-shipping-cost-calculator": palletShippingCost,
  "air-freight-cost-calculator": airFreightCost,
  "container-shipping-cost-calculator": containerShippingCost,
  "container-load-calculator": containerLoad,
  "cbm-calculator": cbm,
};
