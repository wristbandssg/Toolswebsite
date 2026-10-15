/**
 * Batch: "Shopping Calculators" → Electronics, Energy & Tech — batteries
 * and portable power (11 tools):
 *
 *  - batteryLife (also mAh to hours): capacity ÷ load current, derated for
 *    usable capacity.
 *  - batteryChargeTime: capacity ÷ charge current with charging efficiency
 *    and the slow final stage.
 *  - wattHours: Wh = mAh × V ÷ 1,000 (or Ah × V), and the airline limit.
 *  - whToMah: converts Wh ↔ mAh at a voltage.
 *  - upsBatteryBackup: runtime of a UPS from battery Wh, load and inverter
 *    efficiency.
 *  - batteryPack: series/parallel cell count for a target voltage and
 *    capacity, with pack Wh and weight.
 *  - portablePowerStation: how long a power station runs your devices and
 *    how many phone or laptop charges it gives.
 *  - powerBank: how many times a power bank charges a phone, allowing for
 *    3.7 V → 5 V conversion losses.
 *  - inverterSize: continuous and surge watts an inverter needs.
 *  - chargerWattage: the charger wattage a device needs and its charge time.
 *  - droneFlightTime: flight time from battery Wh and the drone's average
 *    power (or all-up weight).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-tech-power-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pct = (v: number) => nonNeg(v) / 100;

export const batteryLife: CustomCalculator = (v) => {
  const mah = nonNeg(v.capacityMah) * (pct(v.usablePercent) || 1);
  const ma = nonNeg(v.loadMa);
  const hours = ma > 0 ? mah / ma : 0;
  return { hours: round2(hours), minutes: Math.round(hours * 60), days: round2(hours / 24), usableMah: Math.round(mah) };
};

export const batteryChargeTime: CustomCalculator = (v) => {
  const mah = nonNeg(v.capacityMah) * pct(v.chargeNeeded || 100);
  const ma = nonNeg(v.chargeCurrentMa);
  const eff = pct(v.efficiency) || 0.85;
  const base = ma > 0 ? mah / (ma * eff) : 0;
  const hours = base * (safeNumber(v.toFull) === 1 ? 1.15 : 1); // constant-voltage top-off stage
  return { hours: round2(hours), minutes: Math.round(hours * 60), cRate: nonNeg(v.capacityMah) > 0 ? round2(ma / nonNeg(v.capacityMah)) : 0 };
};

export const wattHours: CustomCalculator = (v) => {
  const ah = safeNumber(v.capacityUnit) === 1 ? nonNeg(v.capacity) : nonNeg(v.capacity) / 1000;
  const wh = ah * nonNeg(v.voltage);
  return {
    wattHours: round2(wh),
    kilowattHours: round2(wh / 1000 * 1000) / 1000,
    airlineCode: wh <= 100 ? 1 : wh <= 160 ? 2 : 3,
    runtimeHoursAtLoad: nonNeg(v.loadWatts) > 0 ? round2((wh * 0.9) / nonNeg(v.loadWatts)) : 0,
  };
};

export const whToMah: CustomCalculator = (v) => {
  const toMah = safeNumber(v.direction) === 0;
  const volts = nonNeg(v.voltage) || 3.7;
  const val = nonNeg(v.value);
  const mah = toMah ? (val * 1000) / volts : val;
  const wh = toMah ? val : (val * volts) / 1000;
  return { milliampHours: Math.round(mah), wattHours: round2(wh), ampHours: round2(mah / 1000), voltage: volts };
};

export const upsBatteryBackup: CustomCalculator = (v) => {
  const wh = nonNeg(v.batteryVoltage) * nonNeg(v.batteryAh) * nonNeg(v.batteries || 1);
  const usable = wh * (pct(v.depthOfDischarge) || 0.8) * (pct(v.inverterEfficiency) || 0.9);
  const load = nonNeg(v.loadWatts);
  const hours = load > 0 ? usable / load : 0;
  return {
    runtimeMinutes: Math.round(hours * 60),
    runtimeHours: round2(hours),
    batteryWh: round2(wh),
    usableWh: round2(usable),
    vaRatingNeeded: Math.round(load / 0.6),
  };
};

export const batteryPack: CustomCalculator = (v) => {
  const cellV = nonNeg(v.cellVoltage) || 3.6;
  const cellMah = nonNeg(v.cellMah);
  const series = Math.max(1, Math.round(nonNeg(v.targetVoltage) / cellV));
  const parallel = cellMah > 0 ? Math.max(1, Math.ceil((nonNeg(v.targetAh) * 1000) / cellMah)) : 1;
  const cells = series * parallel;
  const packV = series * cellV;
  const packAh = (parallel * cellMah) / 1000;
  return {
    totalCells: cells,
    seriesCells: series,
    parallelCells: parallel,
    packVoltage: round2(packV),
    packAmpHours: round2(packAh),
    packWattHours: round2(packV * packAh),
    packWeightKg: round2((cells * nonNeg(v.cellGrams)) / 1000 * 1.15),
  };
};

export const portablePowerStation: CustomCalculator = (v) => {
  const usable = nonNeg(v.capacityWh) * (pct(v.efficiency) || 0.85);
  const load = nonNeg(v.loadWatts);
  return {
    runtimeHours: load > 0 ? round2(usable / load) : 0,
    usableWh: round2(usable),
    phoneCharges: Math.floor(usable / 15),
    laptopCharges: Math.floor(usable / 60),
    canPowerLoad: load <= nonNeg(v.outputWatts) ? 1 : 0,
    rechargeHoursSolar: nonNeg(v.solarWatts) > 0 ? round2(nonNeg(v.capacityWh) / (nonNeg(v.solarWatts) * 0.7)) : 0,
  };
};

export const powerBank: CustomCalculator = (v) => {
  const bankWh = (nonNeg(v.bankMah) * (nonNeg(v.bankVoltage) || 3.7)) / 1000;
  const deliverable = bankWh * (pct(v.efficiency) || 0.65);
  const phoneWh = (nonNeg(v.phoneMah) * 3.85) / 1000;
  return {
    fullCharges: phoneWh > 0 ? round2(deliverable / phoneWh) : 0,
    bankWattHours: round2(bankWh),
    deliverableWh: round2(deliverable),
    effectiveMahAt5v: Math.round((deliverable / 5) * 1000),
    airlineOk: bankWh <= 100 ? 1 : 0,
  };
};

export const inverterSize: CustomCalculator = (v) => {
  const running = nonNeg(v.runningWatts);
  const surge = Math.max(running, nonNeg(v.largestSurge) + running - nonNeg(v.largestRunning));
  const continuous = running * 1.25;
  const sizes = [300, 600, 1000, 1500, 2000, 3000, 4000, 5000, 8000];
  const pick = sizes.find((s) => s >= continuous && s * 2 >= surge) ?? 8000;
  const volts = nonNeg(v.systemVoltage) || 12;
  return {
    inverterWatts: pick,
    continuousNeeded: Math.round(continuous),
    surgeNeeded: Math.round(surge),
    batteryAmpsDraw: round2(running / volts / 0.9),
    cableSizeHint: running / volts > 150 ? 3 : running / volts > 80 ? 2 : 1,
  };
};

export const chargerWattage: CustomCalculator = (v) => {
  const wh = nonNeg(v.batteryWh);
  const max = nonNeg(v.deviceMaxWatts);
  const charger = nonNeg(v.chargerWatts);
  const effective = Math.min(max || charger, charger) * 0.85;
  return {
    recommendedChargerWatts: [20, 30, 45, 65, 100, 140, 240].find((s) => s >= max) ?? 240,
    chargeTimeHours: effective > 0 ? round2((wh * 0.8) / effective + (wh * 0.2) / (effective * 0.4)) : 0,
    fastChargeTo50Minutes: effective > 0 ? Math.round(((wh * 0.5) / effective) * 60) : 0,
    effectiveChargingWatts: round2(effective),
  };
};

export const droneFlightTime: CustomCalculator = (v) => {
  const wh = (nonNeg(v.batteryMah) * nonNeg(v.batteryVoltage)) / 1000;
  const usable = wh * (pct(v.usablePercent) || 0.8);
  // Power: entered, or estimated at about 170 W per kg of all-up weight for a typical quad in hover.
  const power = nonNeg(v.avgWatts) > 0 ? nonNeg(v.avgWatts) : nonNeg(v.weightGrams) * 0.17;
  const minutes = power > 0 ? (usable / power) * 60 : 0;
  return {
    flightMinutes: round2(minutes),
    batteryWh: round2(wh),
    usableWh: round2(usable),
    averageWatts: round2(power),
  };
};

export const shoppingTechPowerCustomCalculators: Record<string, CustomCalculator> = {
  "battery-life-calculator": batteryLife,
  "battery-charge-time-calculator": batteryChargeTime,
  "watt-hours-calculator": wattHours,
  "wh-to-mah-calculator": whToMah,
  "ups-battery-backup-calculator": upsBatteryBackup,
  "battery-pack-calculator": batteryPack,
  "portable-power-station-calculator": portablePowerStation,
  "power-bank-calculator": powerBank,
  "inverter-size-calculator": inverterSize,
  "charger-wattage-calculator": chargerWattage,
  "drone-flight-time-calculator": droneFlightTime,
};
