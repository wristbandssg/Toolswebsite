/**
 * Batch: Tech keyword check (15 Nov 2026) — electrical conversions & circuit design, 11 tools for
 * Science > Electrical & Electronics Engineering Calculators.
 *
 * Near-namesakes kept apart on purpose:
 *  - watts-to-amps-calculator = power ↔ current ↔ voltage for DC, AC single-phase and three-phase,
 *    with power factor. kva-to-amps-calculator = apparent power (kVA/MVA, transformers) ↔ current.
 *    kva-to-kw-calculator = apparent ↔ real power through PF (plus kVAR). The existing ohms-law
 *    (DC V/I/R/P), kw-calculator and three-phase-power-calculator are not rebuilt.
 *  - active-filter-calculator = 2nd-order op-amp filter DESIGN (component values). The existing
 *    rc-filter (1st-order passive) and rf-filter (LC) are not rebuilt.
 *  - op-amp-gain-calculator = inverting / non-inverting / follower; differential-amplifier exists.
 *
 * Methods:
 *  - I = P ÷ V (DC), P ÷ (V·PF) (1φ), P ÷ (√3·V_LL·PF) (3φ). 1 hp = 745.7 W.
 *  - Capacitor codes: EIA 3-digit (two digits × 10^n, n = 8 → ×0.01, 9 → ×0.1) in pF; R/p/n/u
 *    decimal-point codes; tolerance letters B C D F G J K M Z; EIA voltage codes (1H = 50 V …).
 *  - Sallen-Key equal-R equal-C: f₀ = 1/(2πRC), Q = 1/(3 − K), K = 1 + Rb/Ra. MFB band-pass
 *    (equal C): R1 = Q/(G·ω₀C), R2 = Q/((2Q² − G)ω₀C), R3 = 2Q/(ω₀C). Twin-T notch f = 1/(2πRC).
 *  - LM317: Vout = 1.25 V × (1 + R2/R1) + 50 µA × R2; dropout ≈ 3 V.
 *  - Boost: D = 1 − Vin·η/Vout; L = Vin·D/(f·ΔI); Cout = Iout·D/(f·ΔV).
 *  - Thermocouples: NIST ITS-90 reference polynomials (type K −270…1372 °C incl. the exponential
 *    term, type J 0…760 °C, type T 0…400 °C). Inverse found by bisection. Cold-junction compensation
 *    adds E(T_cj).
 *  - PCB via: barrel area π·(d + t)·t; R = ρL/A (ρ = 1.724 µΩ·cm at 20 °C, α = 0.00393);
 *    current from the IPC-2221 external-conductor formula I = 0.048·ΔT^0.44·A^0.725 (A in mil²);
 *    inductance L = 5.08·h·(ln(4h/d) + 1) nH (h, d in inches); capacitance
 *    C = 1.41·εr·T·D1/(D2 − D1) pF (inches).
 */

import { type TrvCalculator as Calc, InputError, num, pos, pick, txt, nfmt, sig } from "./trv-core";

const eng = (x: number, unit: string, s = 4) => {
  if (!Number.isFinite(x)) return "—";
  if (x === 0) return `0 ${unit}`;
  const pre: [number, string][] = [[1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"]];
  const a = Math.abs(x);
  for (const [f, p] of pre) if (a >= f * 0.9999) return `${sig(x / f, s)} ${p}${unit}`;
  return `${sig(x / 1e-12, s)} p${unit}`;
};
const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
export function nearestE24(x: number) {
  if (!(x > 0)) return 0;
  const dec = 10 ** Math.floor(Math.log10(x));
  let best = 0, err = Infinity;
  for (const m of [...E24, 10]) { const c = m * dec; const e = Math.abs(Math.log(c / x)); if (e < err) { err = e; best = c; } }
  return Number(best.toPrecision(3));
}

// ------------------------------------------------------------------ watts ↔ amps ↔ volts
export const PHASES = ["DC", "AC single-phase", "AC three-phase (line-to-line voltage)", "AC three-phase (line-to-neutral voltage)"];
export const WA_MODES = ["Watts → amps", "Amps → watts", "Watts & amps → volts"];
export const POWER_UNITS: [string, number][] = [["W", 1], ["kW", 1000], ["hp (output)", 745.7]];
export const wattsToAmps: Calc = (v) => {
  const ph = pick(v.phase, 4), mode = pick(v.mode, 3);
  const pf = ph === 0 ? 1 : Math.min(1, Math.max(0.01, num(v.pf, 0.9)));
  const k = [1, 1, Math.sqrt(3), 3][ph] * pf;
  let P = pos(v.power) * POWER_UNITS[pick(v.unit, 3)][1], V = pos(v.volts), I = pos(v.amps);
  if (mode === 0) { if (V <= 0) throw new InputError("Enter the voltage."); I = P / (k * V); }
  else if (mode === 1) { if (V <= 0) throw new InputError("Enter the voltage."); P = I * k * V; }
  else { if (I <= 0) throw new InputError("Enter the current in amps."); V = P / (k * I); }
  const va = P / pf;
  return { amps: sig(I, 5), watts: sig(P, 6), kw: sig(P / 1000, 5), volts: sig(V, 5), va: sig(va, 6), kva: sig(va / 1000, 5), formula: ["I = P ÷ V", "I = P ÷ (V × PF)", "I = P ÷ (√3 × V_LL × PF)", "I = P ÷ (3 × V_LN × PF)"][ph], ohms: ph === 0 && I > 0 ? eng(V / I, "Ω") : "—" };
};

// ------------------------------------------------------------------ kVA ↔ amps
export const KVA_UNITS: [string, number][] = [["kVA", 1000], ["MVA", 1e6], ["VA", 1]];
export const kvaToAmps: Calc = (v) => {
  const three = pick(v.phase, 2) === 1, mode = pick(v.mode, 2);
  const V = pos(v.volts);
  if (V <= 0) throw new InputError("Enter the voltage (line-to-line for three-phase).");
  const f = three ? Math.sqrt(3) * V : V;
  let va = pos(v.kva) * KVA_UNITS[pick(v.unit, 3)][1], I = pos(v.amps);
  if (mode === 0) I = va / f; else va = I * f;
  const std = [15, 25, 30, 45, 50, 75, 100, 112.5, 150, 167, 225, 250, 300, 500, 750, 1000, 1500, 2000, 2500, 3000, 3750, 5000];
  const next = std.find((s) => s * 1000 >= va * 0.9999);
  return { amps: sig(I, 5), kva: sig(va / 1000, 5), mva: sig(va / 1e6, 4), va: sig(va, 6), formula: three ? "I = kVA × 1000 ÷ (√3 × V)" : "I = kVA × 1000 ÷ V", std: next ? `${next} kVA` : "above 5,000 kVA", mode: three ? "Three-phase" : "Single-phase" };
};

// ------------------------------------------------------------------ kVA ↔ kW (power factor)
export const KW_MODES = ["kVA → kW", "kW → kVA"];
export const kvaToKw: Calc = (v) => {
  const pf = Math.min(1, Math.max(0.01, num(v.pf, 0.8)));
  const mode = pick(v.mode, 2);
  const x = pos(v.value);
  const kva = mode === 0 ? x : x / pf, kw = mode === 0 ? x * pf : x;
  const kvar = Math.sqrt(Math.max(0, kva * kva - kw * kw));
  const target = Math.min(1, Math.max(0.01, num(v.target, 0.95)));
  const kvarAtTarget = kw * Math.tan(Math.acos(target));
  return { kw: sig(kw, 6), kva: sig(kva, 6), kvar: sig(kvar, 5), watts: nfmt(kw * 1000, 0), va: nfmt(kva * 1000, 0), angle: sig((Math.acos(pf) * 180) / Math.PI, 4), correction: target > pf ? `${sig(kvar - kvarAtTarget, 4)} kVAR of capacitors raises PF to ${target}` : "— (already at or above the target)" };
};

// ------------------------------------------------------------------ capacitor code
const TOL: Record<string, string> = { B: "±0.1 pF", C: "±0.25 pF", D: "±0.5 pF", F: "±1%", G: "±2%", J: "±5%", K: "±10%", M: "±20%", Z: "+80% / −20%" };
const VCODE: Record<string, number> = { "0G": 4, "0L": 5.5, "0J": 6.3, "1A": 10, "1C": 16, "1E": 25, "1V": 35, "1H": 50, "1J": 63, "1K": 80, "2A": 100, "2Q": 110, "2B": 125, "2C": 160, "2Z": 180, "2D": 200, "2P": 220, "2E": 250, "2F": 315, "2V": 350, "2G": 400, "2W": 450, "2H": 500, "2J": 630, "3A": 1000 };
export const CAP_MODES = ["Code → value", "Value → code"];
export const CAP_UNITS: [string, number][] = [["pF", 1], ["nF", 1e3], ["µF", 1e6]];
export const capacitorCode: Calc = (v) => {
  const mode = pick(v.mode, 2);
  let pf: number, tol = "—", volts = "—";
  if (mode === 0) {
    let s = txt(v, "code").toUpperCase().replace(/\s+/g, "");
    const vm = s.match(/^([0-3][A-Z])(?=\d)/);
    if (vm && VCODE[vm[1]]) { volts = `${VCODE[vm[1]]} V`; s = s.slice(2); }
    const tm = s.match(/([BCDFGJKMZ])$/);
    if (tm && /\d[BCDFGJKMZ]$/.test(s)) { tol = TOL[tm[1]]; s = s.slice(0, -1); }
    if (/^\d{3}$/.test(s)) { const n = Number(s[2]); pf = Number(s.slice(0, 2)) * (n === 8 ? 0.01 : n === 9 ? 0.1 : 10 ** n); }
    else if (/^\d{1,2}$/.test(s)) pf = Number(s);
    else if (/^\d*[RPNU]\d*$/.test(s)) { const L = s.match(/[RPNU]/)![0]; pf = Number(s.replace(L, ".")) * ({ R: 1, P: 1, N: 1e3, U: 1e6 } as Record<string, number>)[L]; }
    else throw new InputError("Enter a code like 104, 472J, 2A104K, 4n7, 2u2 or 4R7.");
  } else {
    pf = pos(v.value) * CAP_UNITS[pick(v.unit, 3)][1];
    if (pf <= 0) throw new InputError("Enter a capacitance.");
  }
  let code = "—";
  if (pf >= 10) { const e = Math.floor(Math.log10(pf)) - 1; const m = Math.round(pf / 10 ** e); code = e <= 9 ? `${m}${e}` : "—"; if (m >= 100) code = `${Math.round(m / 10)}${e + 1}`; }
  else if (pf >= 1) code = `${String(sig(pf, 2)).replace(".", "R")}`;
  return { pf: `${sig(pf, 4)} pF`, nf: `${sig(pf / 1e3, 4)} nF`, uf: `${sig(pf / 1e6, 4)} µF`, code, tol, volts };
};

// ------------------------------------------------------------------ op-amp gain
export const OPAMP = ["Inverting", "Non-inverting", "Voltage follower (buffer)"];
export const opAmpGain: Calc = (v) => {
  const cfg = pick(v.config, 3);
  const rf = pos(v.rf, 100), rin = pos(v.rin, 10);
  if (cfg < 2 && rin <= 0) throw new InputError("Enter the input resistor (kΩ).");
  const g = cfg === 0 ? -rf / rin : cfg === 1 ? 1 + rf / rin : 1;
  const noise = cfg === 0 ? 1 + rf / rin : g;
  const vin = num(v.vin, 0.1), rail = pos(v.rail, 15), head = pos(v.headroom, 1.5);
  const ideal = g * vin, lim = Math.max(0, rail - head);
  const vout = Math.max(-lim, Math.min(lim, ideal));
  const gbw = pos(v.gbw, 1);
  return { gain: sig(g, 5), db: sig(20 * Math.log10(Math.abs(g)), 4), vout: sig(vout, 5), clip: Math.abs(ideal) > lim ? `Clipped — the ideal output ${sig(ideal, 4)} V exceeds the ±${sig(lim, 3)} V swing` : "Within the output swing", bw: gbw > 0 ? eng((gbw * 1e6) / noise, "Hz") : "—", zin: cfg === 0 ? `${sig(rin, 4)} kΩ` : "Very high (op-amp input)", formula: ["G = −Rf ÷ Rin", "G = 1 + Rf ÷ Rin", "G = 1"][cfg] };
};

// ------------------------------------------------------------------ active filter design
export const FILTERS = ["Sallen-Key low-pass (2nd order)", "Sallen-Key high-pass (2nd order)", "Multiple-feedback band-pass", "Twin-T notch (band-stop)"];
export const activeFilter: Calc = (v) => {
  const t = pick(v.type, 4);
  const f = pos(v.f0, 1000), Q = Math.max(0.1, pos(v.q, 0.707)), C = pos(v.cap, 10) * 1e-9, G = Math.max(0.01, pos(v.gain, 1));
  if (f <= 0 || C <= 0) throw new InputError("Enter a frequency and capacitor value above 0.");
  const w = 2 * Math.PI * f;
  const ohm = (x: number) => `${eng(x, "Ω")} (E24: ${eng(nearestE24(x), "Ω", 3)})`;
  if (t <= 1) {
    if (Q >= 3) throw new InputError("Equal-component Sallen-Key needs Q below 3 (gain K = 3 − 1/Q must stay under 3).");
    const R = 1 / (w * C), K = 3 - 1 / Q;
    const ra = 10000, rb = (K - 1) * ra;
    return { r: `R1 = R2 = ${ohm(R)}`, c: `C1 = C2 = ${eng(C, "F")}`, gainRes: K > 1.0001 ? `Ra = 10 kΩ, Rb = ${ohm(rb)}` : "Unity gain: Rb = 0 (follower)", k: sig(K, 4), dB: sig(20 * Math.log10(K), 3), note: `Passband gain ${sig(K, 4)} (${sig(20 * Math.log10(K), 3)} dB). Q = ${Q} (0.707 = Butterworth). Roll-off 40 dB/decade.` };
  }
  if (t === 2) {
    if (G >= 2 * Q * Q) throw new InputError(`Mid-band gain must be below 2Q² = ${sig(2 * Q * Q, 3)} for this circuit.`);
    const r1 = Q / (G * w * C), r2 = Q / ((2 * Q * Q - G) * w * C), r3 = (2 * Q) / (w * C);
    return { r: `R1 = ${ohm(r1)}, R2 = ${ohm(r2)}, R3 = ${ohm(r3)}`, c: `C1 = C2 = ${eng(C, "F")}`, gainRes: "—", k: -G, dB: sig(20 * Math.log10(G), 3), note: `Centre ${sig(f, 4)} Hz, bandwidth ${sig(f / Q, 4)} Hz (Q ${Q}), inverting gain −${G} at centre.` };
  }
  const R = 1 / (w * C);
  return { r: `R = ${ohm(R)} (×2), R/2 = ${ohm(R / 2)}`, c: `C = ${eng(C, "F")} (×2), 2C = ${eng(2 * C, "F")}`, gainRes: "Passive twin-T; add op-amp feedback to raise Q", k: 1, dB: 0, note: `Notch at ${sig(f, 4)} Hz. Passive Q ≈ 0.25; use 1% parts for a deep notch.` };
};

// ------------------------------------------------------------------ LM317
export const LM_MODES = ["Find Vout from R1 & R2", "Find R2 for a target Vout"];
export const lm317: Calc = (v) => {
  const mode = pick(v.mode, 2), r1 = pos(v.r1, 240);
  if (r1 <= 0) throw new InputError("Enter R1 (240 Ω is typical).");
  let r2 = pos(v.r2, 720);
  const iadj = 50e-6;
  if (mode === 1) { const t = pos(v.target, 5); if (t < 1.25) throw new InputError("The LM317 can't regulate below 1.25 V."); r2 = (t - 1.25) / (1.25 / r1 + iadj); }
  const vout = 1.25 * (1 + r2 / r1) + iadj * r2;
  const vin = pos(v.vin, 12), il = pos(v.iload, 0.5);
  const pd = Math.max(0, (vin - vout) * il);
  return { vout: sig(vout, 4), r2: `${sig(r2, 4)} Ω (E24: ${nearestE24(r2)} Ω → ${sig(1.25 * (1 + nearestE24(r2) / r1) + iadj * nearestE24(r2), 4)} V)`, vinMin: sig(vout + 3, 3), pd: sig(pd, 3), ok: vin < vout + 3 ? "Input too low — needs about 3 V above Vout" : pd > 2 ? "Needs a heat sink (over ~2 W)" : "OK", maxV: vin > 40 + vout ? "Warning: input-output difference above 40 V" : "—" };
};

// ------------------------------------------------------------------ boost converter
export const boost: Calc = (v) => {
  const vin = pos(v.vin, 5), vout = pos(v.vout, 12), iout = pos(v.iout, 0.5), fs = pos(v.fsw, 500) * 1e3, rip = pos(v.ripple, 30) / 100, dv = pos(v.dv, 50) / 1000, eff = Math.min(1, pos(v.eff, 90) / 100);
  if (vout <= vin) throw new InputError("A boost converter needs Vout above Vin.");
  if (fs <= 0 || rip <= 0 || dv <= 0) throw new InputError("Enter a switching frequency, ripple current and ripple voltage above 0.");
  const D = 1 - (vin * eff) / vout;
  const iin = (iout * vout) / (vin * eff);
  const di = rip * iin;
  const L = (vin * D) / (fs * di);
  const C = (iout * D) / (fs * dv);
  return { d: Math.round(D * 1000) / 10, L: eng(L, "H"), C: eng(C, "F"), iin: sig(iin, 4), ipk: sig(iin + di / 2, 4), pin: sig(iin * vin, 4), diode: `≥ ${sig(iout * 1.5, 3)} A, ≥ ${sig(vout * 1.25, 3)} V Schottky` };
};

// ------------------------------------------------------------------ ADC
export const ADC_MODES = ["Voltage → digital code", "Digital code → voltage"];
export const adc: Calc = (v) => {
  const n = Math.round(pos(v.bits, 12)), vref = pos(v.vref, 3.3);
  if (n < 1 || n > 32 || vref <= 0) throw new InputError("Enter 1–32 bits and a reference voltage above 0.");
  const steps = 2 ** n, lsb = vref / steps;
  let code: number, volts: number;
  if (pick(v.mode, 2) === 0) { volts = num(v.input, 1.65); code = Math.min(steps - 1, Math.max(0, Math.floor(volts / lsb))); }
  else { code = Math.min(steps - 1, Math.max(0, Math.round(num(v.input)))); volts = code * lsb; }
  return { code, hex: `0x${code.toString(16).toUpperCase()}`, volts: sig(volts, 6), lsb: eng(lsb, "V"), steps: nfmt(steps), snr: sig(6.02 * n + 1.76, 4), back: sig(code * lsb, 6) };
};

// ------------------------------------------------------------------ thermocouple (NIST ITS-90)
const K_POS = [-0.176004136860e-1, 0.38921204975e-1, 0.18558770032e-4, -0.99457592874e-7, 0.31840945719e-9, -0.56072844889e-12, 0.56075059059e-15, -0.3202072e-18, 0.97151147152e-22, -0.12104721275e-25];
const K_NEG = [0, 0.39450128025e-1, 0.23622373598e-4, -0.32858906784e-6, -0.49904828777e-8, -0.67509059173e-10, -0.57410327428e-12, -0.31088872894e-14, -0.10451609365e-16, -0.19889266878e-19, -0.16322697486e-22];
const J_POS = [0, 0.50381187815e-1, 0.3047583693e-4, -0.8568106572e-7, 0.13228195295e-9, -0.17052958337e-12, 0.20948090697e-15, -0.12538395336e-18, 0.15631725697e-22];
const T_POS = [0, 0.38748106364e-1, 0.3329222788e-4, 0.20618243404e-6, -0.21882256846e-8, 0.10996880928e-10, -0.30815758772e-13, 0.4547913529e-16, -0.27512901673e-19];
const poly = (c: number[], t: number) => c.reduce((s, a, i) => s + a * t ** i, 0);
export const TC_TYPES: [string, number, number][] = [["Type K (chromel–alumel), −270 to 1,372 °C", -270, 1372], ["Type J (iron–constantan), 0 to 760 °C", 0, 760], ["Type T (copper–constantan), 0 to 400 °C", 0, 400]];
export function tcEmf(type: number, t: number) {
  if (type === 0) return t < 0 ? poly(K_NEG, t) : poly(K_POS, t) + 0.1185976 * Math.exp(-0.0001183432 * (t - 126.9686) ** 2);
  return poly(type === 1 ? J_POS : T_POS, t);
}
export const TC_MODES = ["Temperature → millivolts", "Millivolts → temperature"];
export const thermocouple: Calc = (v) => {
  const type = pick(v.type, 3), [, lo, hi] = TC_TYPES[type];
  const cj = num(v.cj, 0);
  const cjE = tcEmf(type, Math.min(hi, Math.max(lo, cj)));
  let t: number, mv: number;
  if (pick(v.mode, 2) === 0) {
    t = num(v.input, 100);
    if (t < lo || t > hi) throw new InputError(`This type covers ${lo} to ${hi} °C.`);
    mv = tcEmf(type, t) - cjE;
  } else {
    mv = num(v.input, 4.096);
    const target = mv + cjE;
    let a = lo, b = hi;
    if (target < tcEmf(type, a) || target > tcEmf(type, b)) throw new InputError("That voltage is outside this thermocouple's range.");
    for (let i = 0; i < 80; i++) { const m = (a + b) / 2; if (tcEmf(type, m) < target) a = m; else b = m; }
    t = (a + b) / 2;
  }
  const seebeck = (tcEmf(type, Math.min(hi, t + 0.5)) - tcEmf(type, Math.max(lo, t - 0.5))) * 1000;
  return { temp: Math.round(t * 100) / 100, mv: Math.round(mv * 10000) / 10000, f: Math.round((t * 9 / 5 + 32) * 100) / 100, seebeck: sig(seebeck, 4), cjmv: Math.round(cjE * 10000) / 10000, note: cj !== 0 ? `Includes cold-junction compensation for ${cj} °C` : "Cold junction at 0 °C (reference table)" };
};

// ------------------------------------------------------------------ PCB via
export const pcbVia: Calc = (v) => {
  const d = pos(v.drill, 0.3) / 1000, tp = pos(v.plating, 25) / 1e6, L = pos(v.length, 1.6) / 1000, dT = pos(v.rise, 10);
  if (d <= 0 || tp <= 0 || L <= 0) throw new InputError("Enter the drill size, plating thickness and board thickness.");
  const A = Math.PI * (d + tp) * tp;
  const rho = 1.724e-8 * (1 + 0.00393 * (25 + dT - 20));
  const R = (rho * L) / A;
  const aMil = A / (0.0000254 ** 2);
  const I = 0.048 * dT ** 0.44 * aMil ** 0.725;
  const hIn = L / 0.0254, dIn = d / 0.0254;
  const Lnh = 5.08 * hIn * (Math.log((4 * hIn) / dIn) + 1);
  const pad = pos(v.pad, 0.6) / 25.4, anti = pos(v.antipad, 1.0) / 25.4, er = pos(v.er, 4.3);
  const Cpf = anti > pad ? (1.41 * er * hIn * pad) / (anti - pad) : NaN;
  const rth = L / (401 * A);
  return { amps: sig(I, 3), mohm: sig(R * 1000, 4), vdrop: sig(I * R * 1000, 4), nh: sig(Lnh, 4), pf: Number.isFinite(Cpf) ? sig(Cpf, 3) : "— (antipad must be larger than the pad)", rth: sig(rth, 4), area: `${sig(aMil, 4)} mil² (${sig(A * 1e6, 4)} mm²)` };
};

export const techEe1CustomCalculators: Record<string, Calc> = {
  "watts-to-amps-calculator": wattsToAmps,
  "kva-to-amps-calculator": kvaToAmps,
  "kva-to-kw-calculator": kvaToKw,
  "capacitor-code-calculator": capacitorCode,
  "op-amp-gain-calculator": opAmpGain,
  "active-filter-calculator": activeFilter,
  "lm317-calculator": lm317,
  "boost-converter-calculator": boost,
  "adc-resolution-calculator": adc,
  "thermocouple-calculator": thermocouple,
  "pcb-via-calculator": pcbVia,
};
