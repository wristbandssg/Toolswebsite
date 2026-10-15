/**
 * Batch: "Shopping Calculators" → Electronics, Energy & Tech — audio and
 * electronics (8 tools):
 *
 *  - decibel: combines equal sound sources (10·log10 sum), level at a new
 *    distance (inverse square, −6 dB per doubling) and safe exposure time
 *    (NIOSH 85 dB for 8 hours, halved every 3 dB).
 *  - speakerWattage: amplifier watts for a target loudness from speaker
 *    sensitivity, listening distance and headroom.
 *  - speakerImpedance: series, parallel or series-parallel load in ohms.
 *  - headphoneImpedance: power and maximum loudness from a source's output
 *    voltage, and whether you need a headphone amp.
 *  - audioDelay: speaker or subwoofer time alignment in milliseconds.
 *  - subwooferBox: sealed or ported enclosure volume and response from
 *    Thiele/Small parameters.
 *  - ledResistor: series resistor for LEDs, its power and the nearest
 *    standard (E12) value.
 *  - smdResistorCode: resistance from a 3- or 4-digit SMD marking.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-tech-audio-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const log10 = (x: number) => (x > 0 ? Math.log10(x) : 0);

export const decibel: CustomCalculator = (v) => {
  const level = safeNumber(v.level);
  const n = Math.max(1, Math.round(nonNeg(v.sources) || 1));
  const combined = level + 10 * log10(n);
  const d1 = nonNeg(v.distance1) || 1;
  const d2 = nonNeg(v.distance2) || d1;
  const atD2 = combined - 20 * log10(d2 / d1);
  const safeHours = 8 / Math.pow(2, (atD2 - 85) / 3);
  return {
    levelAtNewDistance: round2(atD2),
    combinedLevel: round2(combined),
    safeExposureHours: round2(Math.min(24, safeHours)),
    safeExposureMinutes: Math.round(Math.min(24, safeHours) * 60),
    loudnessVsOriginal: round2(Math.pow(2, (atD2 - level) / 10)),
  };
};

export const speakerWattage: CustomCalculator = (v) => {
  const target = safeNumber(v.targetDb);
  const sens = safeNumber(v.sensitivity);
  const dist = nonNeg(v.distanceM) || 1;
  const head = nonNeg(v.headroomDb);
  const stereo = v.speakers !== undefined && nonNeg(v.speakers) >= 2 ? 10 * log10(nonNeg(v.speakers)) : 0;
  const needDb = target + 20 * log10(dist) + head - sens - stereo;
  const watts = Math.pow(10, needDb / 10);
  return {
    wattsPerSpeaker: round2(watts),
    rmsWattsRecommended: Math.ceil(watts * 1.25),
    splAt1WAndDistance: round2(sens - 20 * log10(dist) + stereo),
    distanceLossDb: round2(20 * log10(dist)),
  };
};

export const speakerImpedance: CustomCalculator = (v) => {
  const n = Math.max(1, Math.round(nonNeg(v.speakers) || 1));
  const z = nonNeg(v.ohms) || 8;
  const mode = Math.round(safeNumber(v.wiring)); // 0 series, 1 parallel, 2 series-parallel (pairs)
  // Series-parallel: pairs wired in series, pairs then in parallel → 2z ÷ number of pairs.
  const total = mode === 0 ? n * z : mode === 1 ? z / n : (2 * z) / Math.max(1, Math.floor(n / 2));
  const min = nonNeg(v.ampMinOhms) || 4;
  return {
    totalImpedance: round2(total),
    safeForAmp: total >= min ? 1 : 0,
    relativePowerVs8Ohm: round2(8 / Math.max(0.1, total)),
    currentPerAmpWatt: round2(Math.sqrt(1 / Math.max(0.1, total))),
  };
};

export const headphoneImpedance: CustomCalculator = (v) => {
  const z = nonNeg(v.impedance) || 32;
  const vrms = nonNeg(v.outputVrms);
  const zout = nonNeg(v.outputImpedance);
  const vAtPhones = vrms * (z / (z + zout));
  const mw = ((vAtPhones * vAtPhones) / z) * 1000;
  const spl = safeNumber(v.sensitivity) + 10 * log10(mw);
  return {
    maxSpl: round2(spl),
    powerMw: round2(mw),
    needsAmp: spl < 110 ? 1 : 0,
    dampingFactor: zout > 0 ? round2(z / zout) : 999,
    voltageNeededFor110Db: round2(Math.sqrt((Math.pow(10, (110 - safeNumber(v.sensitivity)) / 10) / 1000) * z)),
  };
};

export const audioDelay: CustomCalculator = (v) => {
  const speed = 1086 + 1.1 * (safeNumber(v.tempF, 68) - 32); // ft/s
  const diff = Math.abs(nonNeg(v.farDistanceFt) - nonNeg(v.nearDistanceFt));
  const ms = speed > 0 ? (diff / speed) * 1000 : 0;
  return {
    delayMs: round2(ms),
    pathDifferenceFt: round2(diff),
    samplesAt48k: Math.round((ms / 1000) * 48000),
    speedOfSoundFtS: round2(speed),
  };
};

export const subwooferBox: CustomCalculator = (v) => {
  const fs = nonNeg(v.fs);
  const qts = nonNeg(v.qts) || 0.4;
  const vas = nonNeg(v.vasLiters);
  const ported = Math.round(safeNumber(v.boxType)) === 1;
  if (ported) {
    const vb = 15 * vas * Math.pow(qts, 2.87);
    const fb = 0.42 * fs * Math.pow(qts, -0.9);
    const f3 = 0.26 * fs * Math.pow(qts, -1.4);
    return { boxLiters: round2(vb), boxCubicFeet: round2(vb / 28.317), f3Hz: round2(f3), tuningHz: round2(fb), cubeSideIn: round2(Math.cbrt(vb * 61.024)) };
  }
  const qtc = nonNeg(v.targetQtc) || 0.707;
  const ratio = qtc / qts;
  const vb = ratio > 1 ? vas / (ratio * ratio - 1) : 0;
  const fc = fs * ratio;
  const f3 = fc * Math.sqrt((1 / (qtc * qtc) - 2 + Math.sqrt(Math.pow(1 / (qtc * qtc) - 2, 2) + 4)) / 2);
  return { boxLiters: round2(vb), boxCubicFeet: round2(vb / 28.317), f3Hz: round2(f3), tuningHz: round2(fc), cubeSideIn: round2(Math.cbrt(vb * 61.024)) };
};

const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
function nextE12(r: number) {
  if (r <= 0) return 0;
  const decade = Math.pow(10, Math.floor(Math.log10(r)));
  const m = r / decade;
  const pick = E12.find((x) => x >= m - 1e-9);
  return pick ? pick * decade : 10 * decade;
}

export const ledResistor: CustomCalculator = (v) => {
  const vs = nonNeg(v.supplyVolts);
  const n = Math.max(1, Math.round(nonNeg(v.ledsInSeries) || 1));
  const vf = nonNeg(v.forwardVolts);
  const i = nonNeg(v.currentMa) / 1000;
  const drop = vs - n * vf;
  const r = i > 0 && drop > 0 ? drop / i : 0;
  const std = nextE12(r);
  const actualI = std > 0 ? drop / std : 0;
  return {
    resistorOhms: round2(r),
    nearestStandardOhms: round2(std),
    resistorPowerW: round2(actualI * actualI * std * 1000) / 1000,
    actualCurrentMa: round2(actualI * 1000),
    voltageTooLow: drop <= 0 ? 1 : 0,
  };
};

export const smdResistorCode: CustomCalculator = (v) => {
  const code = Math.round(nonNeg(v.code));
  const digits = Math.round(safeNumber(v.digits)) === 1 ? 4 : 3;
  const s = String(code).padStart(digits, "0");
  const sig = parseInt(s.slice(0, digits - 1), 10);
  const mult = parseInt(s.slice(digits - 1), 10);
  const ohms = sig * Math.pow(10, mult);
  return {
    resistanceOhms: ohms,
    resistanceKohms: round2(ohms / 1000),
    resistanceMohms: round2(ohms / 1e6),
    tolerancePercent: digits === 4 ? 1 : 5,
  };
};

export const shoppingTechAudioCustomCalculators: Record<string, CustomCalculator> = {
  "decibel-calculator": decibel,
  "speaker-wattage-calculator": speakerWattage,
  "speaker-impedance-calculator": speakerImpedance,
  "headphone-impedance-calculator": headphoneImpedance,
  "audio-delay-calculator": audioDelay,
  "subwoofer-box-calculator": subwooferBox,
  "led-resistor-calculator": ledResistor,
  "smd-resistor-code-calculator": smdResistorCode,
};
