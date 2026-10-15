/**
 * Batch: "Shopping Calculators" → Vehicle, Resale & Collectibles — tires,
 * wheels, towing and car care costs (13 tools):
 *
 *  - tireSize: compare two P-metric sizes (diameter, speedometer error).
 *  - tireLife / tireTread: remaining miles from wear rate, and tread depth
 *    safety (legal, wet and snow limits).
 *  - usedTirePrice: fair price from remaining usable tread and age.
 *  - boltPattern: PCD from adjacent-stud spacing; nearest standard pattern.
 *  - hubCentricRingSize: ring OD/ID from wheel bore and hub bore.
 *  - towingCapacity / payload: safe trailer weight and remaining payload
 *    from GVWR, GCWR, curb weight and tongue weight.
 *  - carPaintCost, carWindowTintCost, dentRepairCost, oilChangeCost:
 *    typical 2026 shop prices from simple tables.
 *  - carBatteryLife: expected life by climate and use, and state of charge
 *    from resting voltage.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-veh-tires-calculators.ts for the copy.
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
const mult = (v: number) => (safeNumber(v) > 0 ? safeNumber(v) : 1);

const diameterIn = (width: number, aspect: number, rim: number) => (2 * width * (aspect / 100)) / 25.4 + rim;

export const tireSize: CustomCalculator = (v) => {
  const d1 = diameterIn(nonNeg(v.width1), nonNeg(v.aspect1), nonNeg(v.rim1));
  const d2 = diameterIn(nonNeg(v.width2), nonNeg(v.aspect2), nonNeg(v.rim2));
  const ratio = d1 > 0 ? d2 / d1 : 0;
  return {
    diameterDifferencePercent: d1 > 0 ? round2((ratio - 1) * 100) : 0,
    currentDiameterIn: round2(d1),
    newDiameterIn: round2(d2),
    actualSpeedAt60: round2(60 * ratio),
    newRevsPerMile: d2 > 0 ? Math.round(63360 / (Math.PI * d2)) : 0,
    widthDifferenceIn: round2((nonNeg(v.width2) - nonNeg(v.width1)) / 25.4),
  };
};

export const tireLife: CustomCalculator = (v) => {
  const start = nonNeg(v.newTread);
  const now = nonNeg(v.currentTread);
  const min = nonNeg(v.minimumTread);
  const miles = nonNeg(v.milesDriven);
  const used = start - now;
  const perThirtySecond = used > 0 ? miles / used : 0;
  const remaining = Math.max(0, (now - min) * perThirtySecond);
  const annual = nonNeg(v.annualMiles);
  const ageLeft = Math.max(0, 6 - nonNeg(v.tireAgeYears)) * 12;
  const byTread = annual > 0 ? (remaining / annual) * 12 : 0;
  return {
    remainingMiles: Math.round(remaining),
    monthsLeft: round2(annual > 0 ? Math.min(byTread, ageLeft) : 0),
    milesPer32nd: Math.round(perThirtySecond),
    projectedTotalMiles: Math.round(miles + remaining),
    treadLeftPercent: start > min ? round2((Math.max(0, now - min) / (start - min)) * 100) : 0,
  };
};

export const tireTread: CustomCalculator = (v) => {
  const t = nonNeg(v.tread32);
  const fresh = nonNeg(v.newTread) || 10;
  // Wet stopping distance grows as tread wears: roughly +0% new, +55% at 4/32, +85% at 2/32.
  const worn = Math.max(0, Math.min(1, (fresh - t) / Math.max(1, fresh - 2)));
  return {
    treadMm: round2(t * 0.79375),
    treadInches: Math.round((t / 32) * 1000) / 1000,
    legalAbove2: t > 2 ? 1 : 0,
    wetSafeAbove4: t >= 4 ? 1 : 0,
    snowSafeAbove6: t >= 6 ? 1 : 0,
    wetStoppingIncrease: round2(85 * Math.pow(worn, 1.6)),
  };
};

export const usedTirePrice: CustomCalculator = (v) => {
  const fresh = nonNeg(v.newTread) || 10;
  const tread = nonNeg(v.tread32);
  const usable = Math.max(0, Math.min(1, (tread - 2) / Math.max(1, fresh - 2)));
  const ageFactor = Math.max(0.3, 1 - 0.08 * nonNeg(v.ageYears));
  const price = nonNeg(v.newPrice) * usable * ageFactor * 0.85;
  const n = Math.max(1, Math.round(nonNeg(v.count) || 1));
  const perUsableNew = fresh > 2 ? nonNeg(v.newPrice) / (fresh - 2) : 0;
  const perUsableUsed = tread > 2 ? price / (tread - 2) : 0;
  return {
    fairPricePerTire: round2(price),
    priceForSet: round2(price * n),
    percentOfNew: nonNeg(v.newPrice) > 0 ? round2((price / nonNeg(v.newPrice)) * 100) : 0,
    usableTreadPercent: round2(usable * 100),
    costPerUsable32ndUsed: round2(perUsableUsed),
    costPerUsable32ndNew: round2(perUsableNew),
  };
};

const PCDS = [98, 100, 105, 108, 110, 112, 114.3, 115, 120, 127, 130, 135, 139.7, 150, 165.1, 170];

export const boltPattern: CustomCalculator = (v) => {
  const n = Math.max(3, Math.round(nonNeg(v.lugs) || 5));
  const s = nonNeg(v.adjacentSpacingMm);
  const pcd = s > 0 ? s / Math.sin(Math.PI / n) : 0;
  const nearest = pcd > 0 ? PCDS.reduce((a, b) => (Math.abs(b - pcd) < Math.abs(a - pcd) ? b : a)) : 0;
  return {
    pcdMm: round2(pcd),
    nearestStandardPcdMm: nearest,
    pcdInches: round2(nearest / 25.4),
    differenceMm: round2(pcd - nearest),
    lugs: n,
  };
};

export const hubCentricRingSize: CustomCalculator = (v) => {
  const wheel = nonNeg(v.wheelBoreMm);
  const hub = nonNeg(v.hubBoreMm);
  const gap = wheel - hub;
  return {
    ringOuterMm: round2(wheel),
    ringInnerMm: round2(hub),
    gapMm: round2(gap),
    ringNeeded: gap > 0.1 ? 1 : 0,
    wheelWontFit: wheel > 0 && gap < 0 ? 1 : 0,
  };
};

export const towingCapacity: CustomCalculator = (v) => {
  const curb = nonNeg(v.curbWeight);
  const cargo = nonNeg(v.cargoWeight);
  const trailer = nonNeg(v.trailerWeight);
  const tonguePct = nonNeg(v.tonguePercent) / 100;
  const byGcwr = nonNeg(v.gcwr) - curb - cargo;
  const byPayload = tonguePct > 0 ? (nonNeg(v.gvwr) - curb - cargo) / tonguePct : Infinity;
  const maxTrailer = Math.max(0, Math.min(nonNeg(v.ratedTowing), byGcwr, byPayload));
  const tongue = trailer * tonguePct;
  const payloadLeft = nonNeg(v.gvwr) - curb - cargo - tongue;
  const gcwrLeft = nonNeg(v.gcwr) - curb - cargo - trailer;
  return {
    maxSafeTrailer: Math.round(maxTrailer),
    tongueWeight: Math.round(tongue),
    payloadRemaining: Math.round(payloadLeft),
    gcwrMargin: Math.round(gcwrLeft),
    percentOfTowRating: nonNeg(v.ratedTowing) > 0 ? round2((trailer / nonNeg(v.ratedTowing)) * 100) : 0,
    withinLimits: trailer <= maxTrailer && payloadLeft >= 0 && gcwrLeft >= 0 ? 1 : 0,
  };
};

export const payload: CustomCalculator = (v) => {
  const capacity = nonNeg(v.gvwr) - nonNeg(v.curbWeight);
  const used = nonNeg(v.passengers) * nonNeg(v.avgPassengerWeight) + nonNeg(v.cargoWeight) + nonNeg(v.accessoriesWeight) + nonNeg(v.tongueWeight);
  return {
    payloadRemaining: Math.round(capacity - used),
    payloadCapacity: Math.round(capacity),
    payloadUsed: Math.round(used),
    percentUsed: capacity > 0 ? round2((used / capacity) * 100) : 0,
    overloaded: used > capacity ? 1 : 0,
  };
};

const PAINT_BASE = [900, 3500, 9000]; // budget single-stage, quality base/clear, showroom

export const carPaintCost: CustomCalculator = (v) => {
  const base = PAINT_BASE[idx(v.quality, 2)] * mult(v.vehicleSize) * (idx(v.colorChange, 1) === 1 ? 1.35 : 1);
  const body = nonNeg(v.bodyworkHours) * nonNeg(v.laborRate);
  const total = base + body;
  return {
    totalCost: round2(total),
    paintJob: round2(base),
    bodywork: round2(body),
    lowEstimate: round2(total * 0.8),
    highEstimate: round2(total * 1.3),
  };
};

export const carWindowTintCost: CustomCalculator = (v) => {
  const windows = Math.round(nonNeg(v.windows));
  const perWindow = mult(v.film);
  const tint = windows * perWindow;
  const shade = idx(v.windshieldStrip, 1) === 1 ? 50 : 0;
  const full = idx(v.fullWindshield, 1) === 1 ? perWindow * 3 : 0;
  const removal = nonNeg(v.removalWindows) * 30;
  const total = tint + shade + full + removal;
  return {
    totalCost: round2(total),
    sideAndRearWindows: round2(tint),
    windshieldWork: round2(shade + full),
    oldTintRemoval: round2(removal),
    lowEstimate: round2(total * 0.8),
    highEstimate: round2(total * 1.3),
  };
};

// Paintless dent repair and conventional (fill + paint) price for the first dent by size.
const PDR = [100, 150, 250, 400];
const CONVENTIONAL = [300, 450, 650, 950];

export const dentRepairCost: CustomCalculator = (v) => {
  const n = Math.round(nonNeg(v.dents));
  const s = idx(v.size, 3);
  const metal = idx(v.aluminum, 1) === 1 ? 1.25 : 1;
  const priceFor = (table: number[]) => (n > 0 ? (table[s] + table[s] * 0.5 * (n - 1)) * metal : 0);
  const pdr = idx(v.paintDamaged, 1) === 1 ? 0 : priceFor(PDR);
  const conv = priceFor(CONVENTIONAL);
  return {
    bestPrice: round2(pdr > 0 ? pdr : conv),
    paintlessPrice: round2(pdr),
    conventionalPrice: round2(conv),
    pdrPossible: pdr > 0 ? 1 : 0,
    perAdditionalDent: round2(n > 1 ? (pdr > 0 ? PDR[s] : CONVENTIONAL[s]) * 0.5 * metal : 0),
  };
};

export const oilChangeCost: CustomCalculator = (v) => {
  const shop = mult(v.oilType);
  const synthetic = shop >= 75;
  const diy = nonNeg(v.quarts) * (synthetic ? nonNeg(v.syntheticQuartPrice) : nonNeg(v.conventionalQuartPrice)) + nonNeg(v.filterPrice);
  const interval = nonNeg(v.intervalMiles) || 5000;
  const perYear = nonNeg(v.annualMiles) / interval;
  return {
    annualShopCost: round2(shop * perYear),
    shopCostPerChange: round2(shop),
    diyCostPerChange: round2(diy),
    annualDiyCost: round2(diy * perYear),
    annualDiySavings: round2((shop - diy) * perYear),
    changesPerYear: round2(perYear),
  };
};

export const carBatteryLife: CustomCalculator = (v) => {
  const base = mult(v.climate);
  const expected = base * (idx(v.shortTrips, 1) === 1 ? 0.85 : 1) * (idx(v.batteryType, 1) === 1 ? 1.2 : 1);
  const age = nonNeg(v.ageYears);
  const remaining = Math.max(0, expected - age);
  const volts = nonNeg(v.restingVoltage);
  const soc = volts > 0 ? Math.max(0, Math.min(100, ((volts - 11.9) / (12.7 - 11.9)) * 100)) : 0;
  const replace = remaining < 0.5 || (volts > 0 && soc < 50) ? 1 : 0;
  return {
    remainingYears: round2(remaining),
    expectedLifeYears: round2(expected),
    stateOfCharge: round2(soc),
    replaceSoon: replace,
    annualCost: expected > 0 ? round2(nonNeg(v.batteryPrice) / expected) : 0,
  };
};

export const shoppingVehTiresCustomCalculators: Record<string, CustomCalculator> = {
  "tire-size-calculator": tireSize,
  "tire-life-calculator": tireLife,
  "tire-tread-calculator": tireTread,
  "used-tire-price-calculator": usedTirePrice,
  "bolt-pattern-calculator": boltPattern,
  "hub-centric-ring-size-calculator": hubCentricRingSize,
  "towing-capacity-calculator": towingCapacity,
  "payload-calculator": payload,
  "car-paint-cost-calculator": carPaintCost,
  "car-window-tint-cost-calculator": carWindowTintCost,
  "dent-repair-cost-calculator": dentRepairCost,
  "oil-change-cost-calculator": oilChangeCost,
  "car-battery-life-calculator": carBatteryLife,
};
