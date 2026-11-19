/**
 * Batch: Tech keyword check (15 Nov 2026) — RF & power-system tools, 11 tools for Science >
 * Electrical & Electronics Engineering Calculators.
 *
 * Near-namesakes kept apart on purpose:
 *  - noise-figure-calculator = NF / noise temperature and cascaded (Friis) NF. The existing
 *    noise-floor-calculator gives thermal noise power only.
 *  - eirp-calculator = transmitter + cable + antenna gain. link-budget-calculator (existing) runs
 *    the whole path to the receiver.
 *  - fault-current-calculator = available short-circuit current (point-to-point method). The
 *    existing line-to-line-fault-calculator does sequence-network faults; arc-flash is separate.
 *  - awg-wire-gauge-calculator = gauge geometry/resistance/weight and combining gauges. The
 *    existing wire-size-calculator chooses a size for a load and voltage drop.
 *  - fuse-size-calculator = NEC overcurrent sizing for loads, motors and transformer primaries;
 *    breaker-size-calculator (existing) does breakers for household circuits.
 *
 * Methods:
 *  - Friis: F = F1 + (F2 − 1)/G1 + (F3 − 1)/(G1G2) …; Te = 290(F − 1); sensitivity = −174 dBm/Hz +
 *    10log(BW) + NF + SNR.
 *  - EIRP = P(dBm) − loss + G(dBi); ERP = EIRP − 2.15 dB.
 *  - Fraunhofer distance 2D²/λ; reactive near field 0.62√(D³/λ).
 *  - Rectangular waveguide f_c(m,n) = c/(2√εr)·√((m/a)² + (n/b)²); circular TE11 1.8412, TM01
 *    2.4048 (× c / 2πr√εr).
 *  - FCC OET Bulletin 65 MPE limits (47 CFR 1.1310); S = P·G·duty·(reflection 2.56 optional)/(4πR²).
 *  - Motor locked-rotor kVA/hp: NEC 430.7(B) code letters (upper value of each range).
 *  - Point-to-point (Eaton Bussmann): Isc = FLA × 100/(0.9 × %Z); f = √3·L·I/(C·n·V) (3φ) or
 *    2·L·I/(C·n·V) (1φ); M = 1/(1 + f). C = Bussmann copper, three single conductors, steel conduit.
 *  - AWG: d = 0.127 mm × 92^((36 − n)/39); Cu ρ = 1.7241 µΩ·cm, Al 2.826 µΩ·cm at 20 °C;
 *    Cu density 8.96 g/cm³. Ampacity: NEC 310.16, 75 °C copper.
 *  - Fuses: NEC 210.20 (125% continuous), 430.52 (motor: 175% dual-element, 300% non-time-delay),
 *    450.3(B) (transformer primary: 125% above 9 A, 167% 2–9 A, 300% below 2 A); standard ratings
 *    from NEC 240.6(A).
 */

import { type TrvCalculator as Calc, InputError, num, pos, pick, txt, nfmt, sig } from "./trv-core";

const C0 = 299792458;
const log10 = Math.log10;
const dbmW = (dbm: number) => 10 ** ((dbm - 30) / 10);
const wDbm = (w: number) => 10 * log10(w) + 30;

// ------------------------------------------------------------------ noise figure / Friis
export const noiseFigure: Calc = (v) => {
  const stages = txt(v, "stages").split(/[;\n]+/).map((s) => s.trim()).filter(Boolean).map((s, i) => {
    const [g, nf] = s.split(/[/,\s]+/).map(Number);
    if (!Number.isFinite(g) || !Number.isFinite(nf) || nf < 0) throw new InputError(`Stage ${i + 1} ("${s}") must be "gain dB / NF dB", e.g. 20/1.5.`);
    return { g: 10 ** (g / 10), f: 10 ** (nf / 10), gdb: g };
  });
  if (!stages.length) throw new InputError("Enter at least one stage as gain/NF in dB, e.g. 20/1.5; 10/6.");
  let F = 0, G = 1;
  stages.forEach((s, i) => { F += i === 0 ? s.f : (s.f - 1) / G; G *= s.g; });
  const nf = 10 * log10(F);
  const bw = pos(v.bw, 1e6), snr = num(v.snr, 10);
  const floor = -174 + 10 * log10(bw) + nf;
  return { nf: sig(nf, 4), te: sig(290 * (F - 1), 4), gain: sig(stages.reduce((s, x) => s + x.gdb, 0), 4), factor: sig(F, 4), floor: sig(floor, 4), sens: sig(floor + snr, 4), first: `First stage contributes ${sig((10 * log10(stages[0].f) / nf) * 100, 3)}% of the total NF in dB` };
};
export const eirp: Calc = (v) => {
  const u = pick(v.unit, 3), p = num(v.power, 20);
  if (u > 0 && p <= 0) throw new InputError("Enter a power above 0.");
  const dbm = u === 0 ? p : u === 1 ? wDbm(p) : 10 * log10(p);
  const e = dbm - pos(v.loss, 0) + num(v.gain, 0);
  return { dbm: sig(e, 4), w: sig(dbmW(e), 4), dbw: sig(e - 30, 4), erp: sig(e - 2.15, 4), erpW: sig(dbmW(e - 2.15), 4), tx: `${sig(dbm, 4)} dBm = ${sig(dbmW(dbm), 4)} W at the transmitter` };
};

// ------------------------------------------------------------------ far field
export const farField: Calc = (v) => {
  const D = pos(v.size, 0.6), f = pos(v.mhz, 2400) * 1e6;
  if (D <= 0 || f <= 0) throw new InputError("Enter the antenna size and frequency.");
  const lam = C0 / f;
  const fr = (2 * D * D) / lam, near = 0.62 * Math.sqrt(D ** 3 / lam);
  const start = Math.max(fr, 3 * lam, 3 * D);
  return { far: sig(start, 4), fraunhofer: sig(fr, 4), reactive: sig(near, 4), lambda: sig(lam * 100, 4), ft: sig(start * 3.28084, 4), note: fr < 3 * lam ? "Small antenna: the far field starts a few wavelengths away" : "Large (aperture) antenna: the 2D²/λ rule sets the distance" };
};
export const waveguide: Calc = (v) => {
  const shape = pick(v.shape, 2), er = Math.max(1, pos(v.er, 1)), fop = pos(v.fop, 10) * 1e9;
  const a = pos(v.a, 22.86) / 1000, b = pos(v.b, 10.16) / 1000;
  if (a <= 0) throw new InputError("Enter the waveguide dimension(s) in mm.");
  const k = C0 / Math.sqrt(er);
  let modes: [string, number][];
  if (shape === 0) {
    if (b <= 0) throw new InputError("Enter both a (wide side) and b.");
    const fc = (m: number, n: number) => (k / 2) * Math.sqrt((m / a) ** 2 + (n / b) ** 2);
    modes = [["TE10", fc(1, 0)], ["TE20", fc(2, 0)], ["TE01", fc(0, 1)], ["TE11 / TM11", fc(1, 1)], ["TE30", fc(3, 0)], ["TE21 / TM21", fc(2, 1)]];
  } else {
    const r = a / 2, fc = (x: number) => (k * x) / (2 * Math.PI * r);
    modes = [["TE11", fc(1.8412)], ["TM01", fc(2.4048)], ["TE21", fc(3.0542)], ["TE01 / TM11", fc(3.8317)]];
  }
  modes.sort((p, q) => p[1] - q[1]);
  const [m1, f1] = modes[0], f2 = modes[1][1];
  const lg = fop > f1 ? (k / fop) / Math.sqrt(1 - (f1 / fop) ** 2) : NaN;
  const ghz = (x: number) => `${sig(x / 1e9, 4)} GHz`;
  return { fc: sig(f1 / 1e9, 4), dominant: `${m1} at ${ghz(f1)}`, next: `${modes[1][0]} at ${ghz(f2)}`, single: `${ghz(f1)} – ${ghz(f2)}`, band: shape === 0 ? `${ghz(1.25 * f1)} – ${ghz(Math.min(1.9 * f1, 0.95 * f2))} (recommended)` : `${ghz(1.15 * f1)} – ${ghz(0.95 * f2)}`, lg: Number.isFinite(lg) ? `${sig(lg * 1000, 4)} mm at ${ghz(fop)}` : `— (${ghz(fop)} is below cutoff, so it won't propagate)`, all: modes.map(([n, f]) => `${n}: ${ghz(f)}`).join("\n") };
};
export function mpeLimit(fMHz: number, controlled: boolean) {
  if (fMHz < 0.3 || fMHz > 100000) throw new InputError("FCC MPE limits cover 0.3 MHz to 100 GHz.");
  if (controlled) return fMHz < 3 ? 100 : fMHz < 30 ? 900 / fMHz ** 2 : fMHz < 300 ? 1 : fMHz < 1500 ? fMHz / 300 : 5;
  return fMHz < 1.34 ? 100 : fMHz < 30 ? 180 / fMHz ** 2 : fMHz < 300 ? 0.2 : fMHz < 1500 ? fMHz / 1500 : 1;
}
export const rfExposure: Calc = (v) => {
  const P = pos(v.watts, 100) * 1000, G = 10 ** (num(v.gain, 6) / 10), f = pos(v.mhz, 146), duty = Math.min(100, pos(v.duty, 50)) / 100;
  const ctl = pick(v.env, 2) === 1, refl = pick(v.ground, 2) === 0 ? 2.56 : 1;
  const lim = mpeLimit(f, ctl);
  const eff = P * G * duty * refl;
  const R = Math.sqrt(eff / (4 * Math.PI * lim));
  const d = pos(v.dist, 300);
  const S = d > 0 ? eff / (4 * Math.PI * d * d) : NaN;
  return { cm: sig(R, 4), ft: sig(R / 30.48, 4), m: sig(R / 100, 4), limit: sig(lim, 4), at: Number.isFinite(S) ? `${sig(S, 4)} mW/cm² at ${d} cm — ${S <= lim ? "within" : "ABOVE"} the limit (${sig((S / lim) * 100, 3)}%)` : "—", eirp: sig(wDbm((P / 1000) * G), 4) };
};
const CODES: [string, number][] = [["A", 3.14], ["B", 3.54], ["C", 3.99], ["D", 4.49], ["E", 4.99], ["F", 5.59], ["G", 6.29], ["H", 7.09], ["J", 7.99], ["K", 8.99], ["L", 9.99], ["M", 11.19], ["N", 12.49], ["P", 13.99], ["R", 15.99], ["S", 17.99], ["T", 19.99], ["U", 22.39], ["V", 25]];
export const inrush: Calc = (v) => {
  const mode = pick(v.mode, 3), V = pos(v.volts, 480), three = pick(v.phase, 2) === 1;
  if (V <= 0) throw new InputError("Enter the voltage.");
  const f = three ? Math.sqrt(3) * V : V;
  if (mode === 0) {
    const kva = pos(v.size, 75), mult = pos(v.mult, 12);
    const fla = (kva * 1000) / f;
    return { peak: sig(fla * mult, 5), fla: sig(fla, 5), mult: sig(mult, 3), dur: "Decays over about 0.1 s (5–10 cycles)", note: "NEC 450.3 and IEEE C37 commonly use 12× FLA for 0.1 s when coordinating primary protection" };
  }
  if (mode === 1) {
    const hp = pos(v.size, 10), code = CODES[pick(v.code, CODES.length)];
    const lrk = hp * code[1];
    const lra = (lrk * 1000) / f;
    const fla = (hp * 745.7) / (f * 0.85 * 0.9);
    return { peak: sig(lra, 5), fla: sig(fla, 4), mult: sig(lra / fla, 3), dur: "Lasts until the motor reaches speed (a few seconds)", note: `Code ${code[0]}: up to ${code[1]} kVA per hp locked rotor (NEC 430.7(B)). FLA estimated at PF 0.85, 90% efficiency.` };
  }
  const R = pos(v.ntc, 5);
  if (R <= 0) throw new InputError("Enter the series resistance (NTC cold resistance + wiring) in ohms.");
  const pk = (V * Math.SQRT2) / R;
  return { peak: sig(pk, 4), fla: "—", mult: "—", dur: "A few milliseconds while the bulk capacitor charges", note: `Peak = √2 × ${V} V ÷ ${R} Ω. Without an NTC, wiring resistance alone can allow hundreds of amps.` };
};

// ------------------------------------------------------------------ fault current (point-to-point)
export const CONDUCTORS: [string, number][] = [["14 AWG", 389], ["12 AWG", 617], ["10 AWG", 981], ["8 AWG", 1557], ["6 AWG", 2425], ["4 AWG", 3806], ["3 AWG", 4774], ["2 AWG", 5907], ["1 AWG", 7293], ["1/0", 8925], ["2/0", 10755], ["3/0", 12844], ["4/0", 15082], ["250 kcmil", 16483], ["300 kcmil", 18177], ["350 kcmil", 19704], ["400 kcmil", 20566], ["500 kcmil", 22185], ["600 kcmil", 22965], ["750 kcmil", 24137]];
export const faultCurrent: Calc = (v) => {
  const kva = pos(v.kva, 500), V = pos(v.volts, 480), z = pos(v.z, 5), three = pick(v.phase, 2) === 1;
  if (V <= 0 || z <= 0) throw new InputError("Enter the secondary voltage and the transformer impedance (%Z).");
  const fla = (kva * 1000) / (three ? Math.sqrt(3) * V : V);
  const isc = (fla * 100) / (0.9 * z);
  const L = pos(v.length, 100), n = Math.max(1, Math.round(pos(v.sets, 1)));
  const [cname, Cc] = CONDUCTORS[pick(v.cond, CONDUCTORS.length)];
  const fct = ((three ? Math.sqrt(3) : 2) * L * isc) / (Cc * n * V);
  const M = 1 / (1 + fct);
  return { end: Math.round(isc * M), sec: Math.round(isc), fla: sig(fla, 5), f: sig(fct, 4), m: sig(M, 4), rating: `Equipment at the end of the run needs an interrupting/SCCR rating of at least ${nfmt(Math.ceil((isc * M) / 1000))} kA`, cond: `${n} set(s) of ${cname} copper, ${L} ft` };
};

// ------------------------------------------------------------------ buck-boost transformer
const BB_SIZES = [0.05, 0.1, 0.15, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 7.5, 10];
export const buckBoost: Calc = (v) => {
  const vs = pos(v.supply, 208), vd = pos(v.desired, 240), three = pick(v.phase, 2) === 1;
  if (vs <= 0 || vd <= 0) throw new InputError("Enter the supply and the desired voltage.");
  const amps = pos(v.amps) > 0 ? pos(v.amps) : (pos(v.kva, 5) * 1000) / (three ? Math.sqrt(3) * vd : vd);
  const dv = vd - vs;
  const pct = (dv / vs) * 100;
  const kva = three ? (Math.sqrt(3) * amps * Math.abs(dv)) / 1000 : (amps * Math.abs(dv)) / 1000;
  const units = three ? 3 : 1;
  const each = kva / units;
  const sz = BB_SIZES.find((s) => s >= each * 0.9999);
  const sec = [12, 16, 24, 32, 48].reduce((best, s) => (Math.abs(s - Math.abs(dv) / (three ? Math.sqrt(3) : 1)) < Math.abs(best - Math.abs(dv) / (three ? Math.sqrt(3) : 1)) ? s : best), 12);
  return { kva: sig(kva, 4), each: sig(each, 4), size: sz ? `${sz} kVA × ${units}` : "above 10 kVA per unit — use a full isolation transformer", mode: dv > 0 ? "Boost" : dv < 0 ? "Buck" : "No change needed", pct: sig(pct, 3), amps: sig(amps, 4), secondary: `${sec} V secondary (per unit${three ? ", wye connection with 3 units" : ""})` };
};

// ------------------------------------------------------------------ AWG wire gauge
const AMPACITY: Record<number, number> = { 14: 20, 12: 25, 10: 35, 8: 50, 6: 65, 4: 85, 3: 100, 2: 115, 1: 130, 0: 150, [-1]: 175, [-2]: 200, [-3]: 230 };
function parseAwg(s: string): number {
  const t = s.trim().toUpperCase().replace(/\s*AWG$/, "");
  const m = t.match(/^([1-4])\/0$/);
  if (m) return 1 - Number(m[1]);
  if (t === "0") return 0;
  const n = Number(t);
  if (!Number.isInteger(n) || n < -3 || n > 40) throw new InputError(`"${s}" isn't an AWG size — use 0000 (4/0) to 40.`);
  return n;
}
const awgName = (n: number) => (n <= 0 ? `${1 - n}/0` : String(n));
const dia = (n: number) => 0.127 * 92 ** ((36 - n) / 39);
export const awg: Calc = (v) => {
  const mode = pick(v.mode, 3);
  let n: number, area: number;
  if (mode === 0) { n = parseAwg(txt(v, "awg")); area = (Math.PI / 4) * dia(n) ** 2; }
  else if (mode === 1) { area = pos(v.mm2, 2.5); if (area <= 0) throw new InputError("Enter an area in mm²."); n = Math.round(36 - 39 * Math.log(Math.sqrt((4 * area) / Math.PI) / 0.127) / Math.log(92)); }
  else {
    const list = txt(v, "awg").split(/[,;\s]+/).filter(Boolean).map(parseAwg);
    if (list.length < 2) throw new InputError("List two or more gauges, e.g. 12, 12, 14.");
    area = list.reduce((s, x) => s + (Math.PI / 4) * dia(x) ** 2, 0);
    n = Math.round(36 - 39 * Math.log(Math.sqrt((4 * area) / Math.PI) / 0.127) / Math.log(92));
  }
  const d = Math.sqrt((4 * area) / Math.PI);
  const cuKm = (0.017241 / area) * 1000, alKm = (0.02826 / area) * 1000;
  return {
    awg: mode === 0 ? `${awgName(n)} AWG` : mode === 1 ? `${awgName(n)} AWG is closest (${sig((Math.PI / 4) * dia(n) ** 2, 4)} mm²)` : `About ${awgName(n)} AWG (combined ${sig(area, 4)} mm²; ${awgName(n)} AWG = ${sig((Math.PI / 4) * dia(n) ** 2, 4)} mm²)`,
    mm: sig(d, 4), inch: sig(d / 25.4, 4), mm2: sig(area, 4), kcmil: sig(area / 0.506707, 4),
    cu: `${sig(cuKm, 4)} Ω/km (${sig(cuKm * 0.3048, 4)} Ω per 1,000 ft)`, al: `${sig(alKm, 4)} Ω/km`, kg: sig(area * 8.96, 4),
    amp: AMPACITY[n] ? `${AMPACITY[n]} A (NEC 310.16, 75 °C copper)` : "— (see NEC/IEC tables)",
  };
};

// ------------------------------------------------------------------ fuse size
const STD_FUSE = [1, 3, 6, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6000];
export const fuseSize: Calc = (v) => {
  const mode = pick(v.mode, 3);
  let I = pos(v.amps, 16), pct: number, rule: string;
  if (mode === 2) {
    const kva = pos(v.kva), V = pos(v.volts, 480), three = pick(v.phase, 2) === 1;
    if (kva > 0) { if (V <= 0) throw new InputError("Enter the primary voltage."); I = (kva * 1000) / (three ? Math.sqrt(3) * V : V); }
    pct = I >= 9 ? 125 : I >= 2 ? 167 : 300;
    rule = I >= 9 ? "125% of primary current, next size up allowed" : I >= 2 ? "167% maximum" : "300% maximum";
  } else if (mode === 1) { pct = pick(v.type, 2) === 0 ? 175 : 300; rule = `${pct}% of motor FLA, next standard size up allowed`; }
  else { pct = 125; rule = "125% of continuous load (NEC 210.20)"; }
  if (I <= 0) throw new InputError("Enter the load current in amps (or the transformer kVA).");
  const need = (I * pct) / 100;
  const roundUp = mode !== 2 || I >= 9;
  const size = roundUp ? STD_FUSE.find((s) => s >= need - 1e-9) : [...STD_FUSE].reverse().find((s) => s <= need + 1e-9);
  return { size: size ? `${size} A` : "above 6,000 A", need: sig(need, 4), current: sig(I, 4), pct, rule, wire: mode === 0 ? `Wire must be rated at least ${sig(need, 3)} A` : "Size the conductors to 125% of FLA, not to the fuse" };
};
export const dmxDip: Calc = (v) => {
  let addr: number;
  if (pick(v.mode, 2) === 0) {
    addr = Math.round(num(v.address, 1));
    if (addr < 1 || addr > 511) throw new InputError("DMX addresses run from 1 to 512 (9 switches cover 1–511).");
  } else {
    const s = txt(v, "pattern").replace(/[^01]/g, "");
    if (!s || s.length > 9) throw new InputError("Enter switches 1→9 as 1 (ON) and 0 (OFF), e.g. 101000000.");
    addr = [...s].reduce((a, c, i) => a + (c === "1" ? 2 ** i : 0), 0);
    if (addr === 0) throw new InputError("All switches OFF is address 0, which isn't a valid DMX start address.");
  }
  const on = [...Array(9)].map((_, i) => i + 1).filter((i) => addr & (2 ** (i - 1)));
  const pattern = [...Array(9)].map((_, i) => (addr & (2 ** i) ? "1" : "0")).join("");
  const ch = Math.max(1, Math.round(pos(v.channels, 8))), n = Math.max(1, Math.min(64, Math.round(pos(v.fixtures, 4))));
  const list = [...Array(n)].map((_, i) => addr + i * ch).filter((a) => a + ch - 1 <= 512).map((a, i) => `Fixture ${i + 1}: ${a}–${a + ch - 1}`);
  return { address: addr, on: on.join(", ") || "none", pattern: `${pattern} (switch 1 → 9)`, values: on.map((i) => 2 ** (i - 1)).join(" + "), next: list.join("\n"), lastUsed: addr + n * ch - 1 };
};

export const techEe2CustomCalculators: Record<string, Calc> = {
  "noise-figure-calculator": noiseFigure,
  "eirp-calculator": eirp,
  "far-field-calculator": farField,
  "waveguide-cutoff-calculator": waveguide,
  "rf-exposure-calculator": rfExposure,
  "inrush-current-calculator": inrush,
  "fault-current-calculator": faultCurrent,
  "buck-boost-transformer-calculator": buckBoost,
  "awg-wire-gauge-calculator": awg,
  "fuse-size-calculator": fuseSize,
  "dmx-dip-switch-calculator": dmxDip,
};
