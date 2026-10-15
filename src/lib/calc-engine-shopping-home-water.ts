/**
 * Batch: "Shopping Calculators" → Home Improvement Cost & Sizing — pools,
 * water systems and garage door springs (13 tools):
 *
 *  - poolSize: pool volume in gallons by shape and average depth.
 *  - poolPumpSize: flow (GPM) for an 8-hour turnover, estimated HP at a
 *    typical head.
 *  - poolFilterSize: filter area for the flow by filter type.
 *  - poolHeaterSize: BTU/hr to hold temperature (area × rise × 12) and to
 *    heat the water up in a set time.
 *  - septicTankSize: tank size by bedrooms, daily flow and drain field area.
 *  - wellPumpSize: household GPM and total dynamic head → pump HP.
 *  - pressureTankSize: drawdown for a minimum pump run time ÷ the drawdown
 *    factor for the pressure switch setting.
 *  - expansionTankSize: thermal expansion of a water heater's water and the
 *    tank size by Boyle's law.
 *  - sumpPumpSize: inflow from the pit refill rate and the pump capacity at
 *    the total head.
 *  - waterHeaterSize: tank size and first-hour rating from peak-hour use.
 *  - tanklessWaterHeaterSize: GPM, temperature rise, gas BTU or electric kW.
 *  - waterSoftenerSize: grains per day and the softener capacity for a
 *    weekly regeneration.
 *  - garageDoorSpringSize: torque, turns and inch-pounds per turn (IPPT).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-home-water-calculators.ts for the copy.
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

export const poolSize: CustomCalculator = (v) => {
  const L = nonNeg(v.length);
  const W = nonNeg(v.width);
  const depth = (nonNeg(v.shallowDepth) + nonNeg(v.deepDepth)) / 2;
  const shape = idx(v.shape, 3);
  const area = shape === 0 ? L * W : shape === 1 ? Math.PI * (L / 2) ** 2 : shape === 2 ? Math.PI * (L / 2) * (W / 2) : 0.45 * (W + nonNeg(v.width2)) * L;
  const cubic = area * depth;
  const gallons = cubic * 7.48;
  return {
    gallons: Math.round(gallons),
    liters: Math.round(gallons * 3.785),
    surfaceAreaSqFt: round2(area),
    cubicFeet: round2(cubic),
    averageDepthFt: round2(depth),
  };
};

export const poolPumpSize: CustomCalculator = (v) => {
  const gal = nonNeg(v.gallons);
  const hours = Math.max(1, nonNeg(v.turnoverHours) || 8);
  const gpm = gal / (hours * 60);
  const head = nonNeg(v.headFt) || 50;
  const hp = (gpm * head) / (3960 * 0.5);
  const sizes = [0.5, 0.75, 1, 1.5, 2, 3];
  const pick = sizes.find((s) => s >= hp * 1.1) ?? 3;
  return {
    minimumGpm: round2(gpm),
    gallonsPerHour: Math.round(gpm * 60),
    estimatedHp: round2(hp),
    pumpHp: pick,
    variableSpeedRecommended: 1,
  };
};

const FILTER_RATE = [20, 0.375, 2]; // GPM per sq ft: sand, cartridge, DE

export const poolFilterSize: CustomCalculator = (v) => {
  const gpm = nonNeg(v.gpm);
  const type = idx(v.filterType, 2);
  const area = gpm / FILTER_RATE[type];
  return {
    filterAreaSqFt: round2(area * (type === 1 ? 1.25 : 1.1)),
    minimumAreaSqFt: round2(area),
    flowGpm: round2(gpm),
    turnoverHoursAtFlow: gpm > 0 ? round2(nonNeg(v.gallons) / (gpm * 60)) : 0,
  };
};

export const poolHeaterSize: CustomCalculator = (v) => {
  const area = nonNeg(v.surfaceArea);
  const rise = nonNeg(v.desiredTemp) - nonNeg(v.airTemp);
  const maintain = area * Math.max(0, rise) * 12;
  const heatUp = (nonNeg(v.gallons) * 8.34 * Math.max(0, nonNeg(v.desiredTemp) - nonNeg(v.waterTemp))) / Math.max(1, nonNeg(v.heatUpHours) || 24);
  const need = Math.max(maintain, heatUp);
  const sizes = [100000, 150000, 200000, 250000, 300000, 400000];
  return {
    btuNeeded: Math.round(need),
    btuToMaintain: Math.round(maintain),
    btuToHeatUp: Math.round(heatUp),
    gasHeaterSize: sizes.find((s) => s >= need) ?? 400000,
    heatPumpBtu: Math.round(maintain * 1.0),
  };
};

export const septicTankSize: CustomCalculator = (v) => {
  const br = Math.max(1, Math.round(nonNeg(v.bedrooms) || 1));
  let tank = br <= 3 ? 1000 : 1000 + (br - 3) * 250;
  if (safeNumber(v.disposal) === 1) tank = Math.ceil((tank * 1.5) / 250) * 250;
  const flow = br * 150;
  const loading = [1.2, 0.8, 0.5, 0.3][idx(v.soil, 3)]; // gal/sq ft/day: sand, loam, clay-loam, clay
  return {
    tankGallons: tank,
    dailyFlowGallons: flow,
    drainFieldSqFt: Math.round(flow / loading),
    pumpEveryYears: br <= 3 ? 3 : 2,
  };
};

const BATH_GPM = [6, 8, 10, 12, 14];

export const wellPumpSize: CustomCalculator = (v) => {
  const gpm = BATH_GPM[Math.min(4, Math.max(0, Math.round(nonNeg(v.bathrooms)) - 1))] + (safeNumber(v.irrigation) === 1 ? 4 : 0);
  const tdh = nonNeg(v.pumpingLevel) + nonNeg(v.elevation) + nonNeg(v.pressure) * 2.31 + nonNeg(v.pipeLength) * 0.05;
  const hp = (gpm * tdh) / (3960 * 0.45);
  const sizes = [0.5, 0.75, 1, 1.5, 2, 3, 5];
  return {
    flowGpm: gpm,
    totalDynamicHeadFt: Math.round(tdh),
    estimatedHp: round2(hp),
    pumpHp: sizes.find((s) => s >= hp) ?? 5,
    pumpTypeCode: nonNeg(v.pumpingLevel) > 25 ? 2 : 1,
  };
};

const DRAWDOWN = [0.32, 0.28, 0.25, 0.22]; // 20/40, 30/50, 40/60, 50/70 psi

export const pressureTankSize: CustomCalculator = (v) => {
  const gpm = nonNeg(v.pumpGpm);
  const run = Math.max(1, nonNeg(v.minRunMinutes) || 1);
  const draw = gpm * run;
  const factor = DRAWDOWN[idx(v.pressureSetting, 3)];
  return {
    tankSizeGallons: Math.ceil(draw / factor),
    drawdownGallons: round2(draw),
    drawdownFactor: factor,
    cyclesPerHourAtFullDemand: draw > 0 ? round2((gpm * 60) / (draw * 2)) : 0,
  };
};

const DENS_F = [40, 60, 80, 100, 120, 140, 160];
const DENS = [0.99997, 0.99905, 0.99669, 0.99318, 0.9887, 0.98339, 0.97733];
function density(f: number) {
  if (f <= DENS_F[0]) return DENS[0];
  for (let i = 1; i < DENS_F.length; i++) {
    if (f <= DENS_F[i]) return DENS[i - 1] + ((f - DENS_F[i - 1]) / (DENS_F[i] - DENS_F[i - 1])) * (DENS[i] - DENS[i - 1]);
  }
  return DENS[DENS.length - 1];
}

export const expansionTankSize: CustomCalculator = (v) => {
  const gal = nonNeg(v.heaterGallons);
  const expansion = gal * (density(nonNeg(v.coldTemp)) / density(nonNeg(v.hotTemp)) - 1);
  const p1 = nonNeg(v.supplyPressure) + 14.7;
  const p2 = (nonNeg(v.maxPressure) || 80) + 14.7;
  const tank = p2 > p1 ? (expansion * p2) / (p2 - p1) : 0;
  return {
    expansionGallons: round2(expansion),
    tankSizeGallons: round2(tank),
    precharge: Math.round(nonNeg(v.supplyPressure)),
    standardTankGallons: tank <= 2 ? 2 : tank <= 4.5 ? 4.5 : tank <= 8.6 ? 8.6 : 14,
  };
};

export const sumpPumpSize: CustomCalculator = (v) => {
  const d = nonNeg(v.pitDiameter);
  const gallonsPerInch = (Math.PI * (d / 2) ** 2) / 231;
  const inflowGpm = nonNeg(v.riseMinutes) > 0 ? (gallonsPerInch * nonNeg(v.riseInches)) / nonNeg(v.riseMinutes) : 0;
  const head = nonNeg(v.verticalLift) + nonNeg(v.horizontalRun) / 10;
  const needGph = inflowGpm * 60 * 1.5;
  const hp = head <= 10 && needGph <= 2400 ? 1 : head <= 15 && needGph <= 3600 ? 2 : head <= 20 ? 3 : 4;
  return {
    pumpGphNeeded: Math.round(needGph),
    inflowGph: Math.round(inflowGpm * 60),
    totalHeadFt: round2(head),
    horsepowerCode: hp,
    pitGallonsPerInch: round2(gallonsPerInch),
  };
};

export const waterHeaterSize: CustomCalculator = (v) => {
  const peak =
    nonNeg(v.showers) * 10 + nonNeg(v.baths) * 20 + nonNeg(v.dishwasher) * 6 + nonNeg(v.laundry) * 7 + nonNeg(v.sinkUses) * 2;
  const people = Math.max(1, Math.round(nonNeg(v.people) || 1));
  const byPeople = people <= 2 ? 40 : people <= 4 ? 50 : people <= 5 ? 65 : 80;
  const gas = safeNumber(v.fuel) === 0;
  // Gas tanks recover faster, so a smaller tank reaches the same first-hour rating.
  const tankForPeak = gas ? peak / 1.4 : peak / 1.1;
  const sizes = [30, 40, 50, 65, 75, 80];
  const tank = sizes.find((s) => s >= Math.max(byPeople, tankForPeak)) ?? 80;
  return { tankSizeGallons: tank, firstHourRatingNeeded: Math.round(peak), peakHourGallons: Math.round(peak), sizeByHousehold: byPeople };
};

export const tanklessWaterHeaterSize: CustomCalculator = (v) => {
  const gpm = nonNeg(v.showers) * 2 + nonNeg(v.faucets) * 1 + nonNeg(v.dishwasher) * 1.5 + nonNeg(v.washer) * 2 + nonNeg(v.tubs) * 4;
  const rise = Math.max(0, nonNeg(v.outputTemp) - nonNeg(v.groundTemp));
  const btu = (gpm * 500 * rise) / 0.95;
  const kw = (gpm * rise) / 6.83;
  return {
    flowGpm: round2(gpm),
    temperatureRiseF: Math.round(rise),
    gasBtuNeeded: Math.round(btu),
    electricKwNeeded: round2(kw),
    ampsAt240v: Math.round((kw * 1000) / 240),
  };
};

const SOFTENERS = [24000, 32000, 40000, 48000, 64000, 80000, 96000];

export const waterSoftenerSize: CustomCalculator = (v) => {
  const people = Math.max(1, nonNeg(v.people));
  const hardness = nonNeg(v.hardnessGpg) + nonNeg(v.ironPpm) * 5;
  const perDay = people * (nonNeg(v.gallonsPerPerson) || 75) * hardness;
  const weekly = perDay * 7;
  const size = SOFTENERS.find((s) => s * 0.75 >= weekly) ?? 96000;
  return {
    softenerCapacityGrains: size,
    grainsPerDay: Math.round(perDay),
    grainsPerWeek: Math.round(weekly),
    daysBetweenRegeneration: perDay > 0 ? round2((size * 0.75) / perDay) : 0,
    saltPerRegenerationLb: Math.round((size * 0.75) / 3000),
  };
};

export const garageDoorSpringSize: CustomCalculator = (v) => {
  const weight = nonNeg(v.doorWeight);
  const heightIn = nonNeg(v.doorHeight) * 12;
  const drum = nonNeg(v.drumDiameter) || 4;
  const springs = Math.max(1, Math.round(nonNeg(v.springs) || 1));
  const torque = weight * (drum / 2);
  const turns = heightIn / (Math.PI * drum) + 1;
  const ippt = turns > 0 ? torque / turns / springs : 0;
  const wire = ippt < 20 ? 1 : ippt < 30 ? 2 : ippt < 45 ? 3 : ippt < 65 ? 4 : 5;
  return {
    ipptPerSpring: round2(ippt),
    turnsToWind: round2(turns),
    totalTorqueInLb: round2(torque),
    wireSizeCode: wire,
    springsUsed: springs,
  };
};

export const shoppingHomeWaterCustomCalculators: Record<string, CustomCalculator> = {
  "pool-size-calculator": poolSize,
  "pool-pump-size-calculator": poolPumpSize,
  "pool-filter-size-calculator": poolFilterSize,
  "pool-heater-size-calculator": poolHeaterSize,
  "septic-tank-size-calculator": septicTankSize,
  "well-pump-size-calculator": wellPumpSize,
  "pressure-tank-size-calculator": pressureTankSize,
  "expansion-tank-size-calculator": expansionTankSize,
  "sump-pump-size-calculator": sumpPumpSize,
  "water-heater-size-calculator": waterHeaterSize,
  "tankless-water-heater-size-calculator": tanklessWaterHeaterSize,
  "water-softener-size-calculator": waterSoftenerSize,
  "garage-door-spring-size-calculator": garageDoorSpringSize,
};
