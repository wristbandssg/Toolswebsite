/**
 * Batch: review item from the 7,423-keyword popular check (16 Nov 2026 — Claude outputs/
 * Popular_Keyword_Check_2.md). One Science > Astronomy & Space tool: speed of light.
 *
 * Near-namesakes kept apart on purpose:
 *  - speed-of-light = how long light takes to cover a distance (Moon, Sun, Mars, stars or your own),
 *    how far light goes in a time, and what fraction of c a speed is (with the Lorentz factor).
 *  - lightning-distance (existing) uses the speed of SOUND between flash and thunder.
 *  - relativistic-kinetic-energy (existing) gives the energy of a moving mass, not travel times.
 */

import { type TrvCalculator as Calc, InputError, num, pick } from "./trv-core";

export const C_KMS = 299792.458;
const KM: Record<string, number> = { km: 1, mi: 1.609344, m: 0.001, au: 149597870.7, ly: 9460730472580.8 };
const DIST_KEYS = ["km", "mi", "m", "au", "ly"];
export const PRESETS: [string, number][] = [
  ["Custom distance", 0],
  ["Earth → Moon (384,400 km)", 384400],
  ["Earth → Sun (1 AU)", 149597870.7],
  ["Earth → Mars (closest, 54.6 million km)", 54.6e6],
  ["Earth → Mars (average, 225 million km)", 225e6],
  ["Earth → Jupiter (average, 778 million km)", 778.5e6],
  ["Sun → Pluto (average, 5.9 billion km)", 5.906e9],
  ["Earth → Voyager 1 (about 25 billion km)", 25e9],
  ["Sun → Proxima Centauri (4.2465 light-years)", 4.2465 * 9460730472580.8],
  ["Around Earth's equator (40,075 km)", 40075],
  ["New York → London (5,570 km)", 5570],
];
const SEC = [1, 60, 3600, 86400, 31557600];
export const SPEED_UNITS = ["km/s", "km/h", "mph", "m/s"];
const KMS = [1, 1 / 3600, 1.609344 / 3600, 0.001];

const fmtN = (x: number) => (Math.abs(x) >= 1e15 || (Math.abs(x) < 1e-3 && x !== 0) ? x.toExponential(4) : x.toLocaleString("en-US", { maximumFractionDigits: x < 10 ? 6 : 2 }));

export function humanTime(s: number): string {
  if (s < 1e-3) return `${fmtN(s * 1e6)} microseconds`;
  if (s < 1) return `${fmtN(s * 1000)} milliseconds`;
  if (s < 60) return `${fmtN(s)} seconds`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${(s % 60).toFixed(1)} s`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min ${Math.round(s % 60)} s`;
  if (s < 31557600) return `${Math.floor(s / 86400)} days ${Math.floor((s % 86400) / 3600)} h`;
  const y = s / 31557600;
  return `${fmtN(y)} year${y === 1 ? "" : "s"}`;
}

const distAll = (km: number) => `${fmtN(km)} km · ${fmtN(km / KM.mi)} miles · ${fmtN(km / KM.au)} AU · ${fmtN(km / KM.ly)} light-years`;

const speedOfLight: Calc = (v) => {
  const mode = pick(v.mode, 3);
  const c = `${C_KMS.toLocaleString("en-US")} km/s · 186,282 miles/s · 1.08 billion km/h · 671 million mph`;
  if (mode === 0) {
    const preset = pick(v.preset, PRESETS.length);
    const km = preset > 0 ? PRESETS[preset][1] : num(v.distance, 384400) * KM[DIST_KEYS[pick(v.distUnit, 5)]];
    if (!(km > 0)) throw new InputError("Enter a distance greater than 0.");
    const s = km / C_KMS;
    return {
      answer: humanTime(s),
      detail: `${fmtN(s)} seconds · ${fmtN(s / 60)} minutes · ${fmtN(s / 3600)} hours`,
      distance: distAll(km),
      roundTrip: `${humanTime(2 * s)} there and back (a radio signal's round trip)`,
      c,
    };
  }
  if (mode === 1) {
    const t = num(v.time, 1) * SEC[pick(v.timeUnit, 5)];
    if (!(t > 0)) throw new InputError("Enter a time greater than 0.");
    const km = t * C_KMS;
    return {
      answer: `${fmtN(km)} km`,
      detail: `in ${humanTime(t)}`,
      distance: distAll(km),
      roundTrip: `${fmtN(km / 40075)} times around Earth's equator`,
      c,
    };
  }
  const kms = num(v.speed, 1000) * KMS[pick(v.speedUnit, 4)];
  if (!(kms > 0)) throw new InputError("Enter a speed greater than 0.");
  if (kms >= C_KMS) throw new InputError("Nothing with mass can reach or pass the speed of light — enter a lower speed.");
  const beta = kms / C_KMS, gamma = 1 / Math.sqrt(1 - beta * beta);
  return {
    answer: `${beta < 1e-4 ? (beta * 100).toExponential(3) : (beta * 100).toFixed(6).replace(/0+$/, "").replace(/\.$/, "")}% of the speed of light`,
    detail: `Lorentz factor γ = ${gamma < 1.000001 ? `1 + ${(beta * beta / 2).toExponential(2)}` : gamma.toFixed(6)} — clocks at this speed run ${gamma < 1.000001 ? `${((1 - 1 / gamma) * 86400 * 1e6).toExponential(2)} µs a day slow` : `${gamma.toFixed(3)}× slow`}`,
    distance: `${fmtN(kms)} km/s · ${fmtN(kms * 3600)} km/h · ${fmtN(kms * 3600 / 1.609344)} mph`,
    roundTrip: `Earth → Moon in ${humanTime(384400 / kms)}; to Proxima Centauri in ${humanTime(PRESETS[8][1] / kms)}`,
    c,
  };
};

export const lightCustomCalculators: Record<string, Calc> = {
  "speed-of-light-calculator": speedOfLight,
};
