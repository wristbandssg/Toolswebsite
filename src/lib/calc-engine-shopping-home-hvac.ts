/**
 * Batch: "Shopping Calculators" → Home Improvement Cost & Sizing — heating,
 * cooling and air quality sizing (10 tools). All use a shared heat-load
 * rule of thumb — BTU per square foot by climate zone, adjusted for ceiling
 * height, insulation, sun and occupants — then each tool answers its own
 * equipment question:
 *
 *  - btuCalculator: cooling and heating BTU for one room (window/portable AC
 *    or room heater), with kitchen and occupant additions.
 *  - acSize (also HVAC size): whole-house central AC tonnage.
 *  - miniSplitSize: BTU per zone and the total outdoor unit size.
 *  - heatPumpSize: tons for the larger of heating and cooling load.
 *  - furnaceSize: furnace input BTU from heating load and efficiency (AFUE).
 *  - spaceHeaterSize: watts for a room (10 W per sq ft, adjusted).
 *  - woodStoveSize: stove BTU output and firebox size for the area heated.
 *  - dehumidifierSize: pints per day by area and dampness.
 *  - humidifierSize: gallons per day by area and how tight the house is.
 *  - airPurifierSize: CADR = room volume × air changes per hour ÷ 60.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-home-hvac-calculators.ts for the copy.
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

/** Climate zone: 0 hot, 1 warm, 2 mixed, 3 cool, 4 cold. */
const COOL_BTU = [25, 22, 20, 18, 16];
const HEAT_BTU = [20, 28, 35, 42, 50];
const INSULATION = [1.15, 1, 0.9]; // poor, average, good

function factors(v: Record<string, number>) {
  const ceiling = (nonNeg(v.ceilingHeight) || 8) / 8;
  const ins = INSULATION[idx(v.insulation ?? 1, 2)];
  return { ceiling, ins };
}

export const btuCalculator: CustomCalculator = (v) => {
  const area = nonNeg(v.roomLength) * nonNeg(v.roomWidth);
  const { ceiling, ins } = factors(v);
  const zone = idx(v.climate, 4);
  const sun = [0.9, 1, 1.1][idx(v.sun, 2)];
  const people = Math.max(0, nonNeg(v.people) - 2) * 600;
  const kitchen = safeNumber(v.kitchen) === 1 ? 4000 : 0;
  const cool = area * COOL_BTU[zone] * ceiling * ins * sun + people + kitchen;
  const heat = area * HEAT_BTU[zone] * ceiling * ins;
  const sizes = [5000, 6000, 8000, 10000, 12000, 14000, 18000, 24000, 30000, 36000];
  return {
    coolingBtu: Math.round(cool),
    heatingBtu: Math.round(heat),
    acUnitSize: sizes.find((s) => s >= cool) ?? 36000,
    heaterWatts: Math.round(heat / 3.412),
    roomSqFt: round2(area),
  };
};

export const acSize: CustomCalculator = (v) => {
  const area = nonNeg(v.homeSqFt);
  const { ceiling, ins } = factors(v);
  const zone = idx(v.climate, 4);
  const btu = area * COOL_BTU[zone] * ceiling * ins + Math.max(0, nonNeg(v.people) - 4) * 600;
  const tons = Math.ceil((btu / 12000) * 2) / 2;
  return {
    tons: Math.min(5, Math.max(1.5, tons)),
    coolingBtu: Math.round(btu),
    sqFtPerTon: tons > 0 ? Math.round(area / tons) : 0,
    multipleSystemsNeeded: tons > 5 ? 1 : 0,
  };
};

export const miniSplitSize: CustomCalculator = (v) => {
  const { ceiling, ins } = factors(v);
  const zone = idx(v.climate, 4);
  const per = Math.max(COOL_BTU[zone], HEAT_BTU[zone] * 0.6) * ceiling * ins;
  const zones = [v.zone1, v.zone2, v.zone3, v.zone4].map((a) => nonNeg(a) * per);
  const heads = [6000, 9000, 12000, 15000, 18000, 24000];
  const sized = zones.map((b) => (b > 0 ? heads.find((h) => h >= b) ?? 24000 : 0));
  const total = sized.reduce((a, b) => a + b, 0);
  const outdoor = [9000, 12000, 18000, 24000, 30000, 36000, 42000, 48000].find((o) => o >= total * 0.9) ?? 48000;
  return {
    outdoorUnitBtu: total > 0 ? outdoor : 0,
    totalIndoorBtu: total,
    zone1Head: sized[0],
    zone2Head: sized[1],
    zone3Head: sized[2],
    zone4Head: sized[3],
  };
};

export const heatPumpSize: CustomCalculator = (v) => {
  const area = nonNeg(v.homeSqFt);
  const { ceiling, ins } = factors(v);
  const zone = idx(v.climate, 4);
  const cool = area * COOL_BTU[zone] * ceiling * ins;
  const heat = area * HEAT_BTU[zone] * ceiling * ins;
  const coldClimate = safeNumber(v.coldClimateModel) === 1;
  const design = Math.max(cool, coldClimate ? heat * 0.7 : cool);
  const tons = Math.min(5, Math.max(1.5, Math.ceil((design / 12000) * 2) / 2));
  return {
    heatPumpTons: tons,
    coolingLoadBtu: Math.round(cool),
    heatingLoadBtu: Math.round(heat),
    backupHeatKw: Math.round(Math.max(0, heat - tons * 12000 * 0.6) / 3412),
  };
};

export const furnaceSize: CustomCalculator = (v) => {
  const area = nonNeg(v.homeSqFt);
  const { ceiling, ins } = factors(v);
  const output = area * HEAT_BTU[idx(v.climate, 4)] * ceiling * ins;
  const afue = Math.min(0.99, Math.max(0.5, nonNeg(v.afue) / 100 || 0.95));
  const input = output / afue;
  const sizes = [40000, 60000, 80000, 100000, 120000, 140000];
  return {
    furnaceInputBtu: sizes.find((s) => s >= input) ?? 140000,
    heatingOutputNeeded: Math.round(output),
    exactInputBtu: Math.round(input),
    btuPerSqFt: area > 0 ? round2(output / area) : 0,
  };
};

export const spaceHeaterSize: CustomCalculator = (v) => {
  const area = nonNeg(v.roomLength) * nonNeg(v.roomWidth);
  const { ceiling, ins } = factors(v);
  const watts = area * 10 * ceiling * ins * [0.8, 1, 1.25][idx(v.coldness, 2)];
  const heaters = Math.ceil(watts / 1500);
  return {
    wattsNeeded: Math.round(watts),
    btuPerHour: Math.round(watts * 3.412),
    heaters1500w: Math.max(1, heaters),
    costPerHour: round2((Math.min(watts, 1500 * heaters) / 1000) * nonNeg(v.pricePerKwh)),
  };
};

export const woodStoveSize: CustomCalculator = (v) => {
  const area = nonNeg(v.areaSqFt);
  const zone = idx(v.climate, 4);
  const btu = area * [20, 25, 30, 35, 40][zone] * INSULATION[idx(v.insulation ?? 1, 2)];
  const firebox = btu / 25000; // about 25,000 BTU/hr per cubic foot of firebox
  return {
    stoveBtuOutput: Math.round(btu),
    fireboxCubicFeet: round2(firebox),
    sizeCode: firebox <= 1.5 ? 1 : firebox <= 2.5 ? 2 : 3,
    cordsPerSeason: round2((btu * [500, 800, 1200, 1600, 2000][zone]) / 20000000 / 0.7),
  };
};

export const dehumidifierSize: CustomCalculator = (v) => {
  const area = nonNeg(v.areaSqFt);
  const base = [10, 14, 18, 22][idx(v.condition, 3)]; // moderately damp … wet, pints per 500 sq ft
  const pints = base + Math.max(0, area - 500) / 500 * 4;
  const sizes = [20, 22, 35, 50, 70];
  return {
    pintsPerDay: Math.round(pints),
    modelSizePints: sizes.find((s) => s >= pints) ?? 70,
    tankEmptiesPerDay: round2(pints / 8),
  };
};

export const humidifierSize: CustomCalculator = (v) => {
  const area = nonNeg(v.areaSqFt);
  const tight = [1.3, 1, 0.75][idx(v.construction, 2)]; // loose, average, tight
  const gallons = (area / 1000) * 2 * tight;
  return {
    gallonsPerDay: round2(gallons),
    unitTypeCode: area <= 500 ? 1 : area <= 1500 ? 2 : 3,
    refillsPerDay: round2(gallons / (nonNeg(v.tankGallons) || 1.5)),
  };
};

export const airPurifierSize: CustomCalculator = (v) => {
  const area = nonNeg(v.roomLength) * nonNeg(v.roomWidth);
  const volume = area * (nonNeg(v.ceilingHeight) || 8);
  const ach = [3, 4, 5][idx(v.need, 2)];
  const cadr = (volume * ach) / 60;
  return {
    cadrNeeded: Math.round(cadr),
    roomSqFt: round2(area),
    roomCubicFeet: Math.round(volume),
    airChangesPerHour: ach,
    twoThirdsRuleCadr: Math.round(area * (2 / 3)),
  };
};

export const shoppingHomeHvacCustomCalculators: Record<string, CustomCalculator> = {
  "btu-calculator": btuCalculator,
  "ac-size-calculator": acSize,
  "mini-split-size-calculator": miniSplitSize,
  "heat-pump-size-calculator": heatPumpSize,
  "furnace-size-calculator": furnaceSize,
  "space-heater-size-calculator": spaceHeaterSize,
  "wood-stove-size-calculator": woodStoveSize,
  "dehumidifier-size-calculator": dehumidifierSize,
  "humidifier-size-calculator": humidifierSize,
  "air-purifier-size-calculator": airPurifierSize,
};
