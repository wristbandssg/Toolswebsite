/**
 * Batch: Tech keyword check (15 Nov 2026) — 5 science/engineering tools: Science > Biology & Lab
 * (primer Tm), > Mechanical & Structural (tolerance stack-up, bearing fault frequencies, vibration
 * conversion) and > Earth, Weather & Environment (E6B flight computer).
 *
 * Near-namesakes kept apart on purpose:
 *  - primer-tm-calculator = melting temperature. The existing oligo-molecular-weight-calculator and
 *    primer-dilution-calculator are not rebuilt.
 *  - e6b-flight-calculator = the full wind triangle + time, fuel and magnetic heading. The existing
 *    wind-correction-angle, crosswind and true-airspeed calculators each do one piece.
 *  - bearing-fault-frequency-calculator = BPFO/BPFI/BSF/FTF; bearing-life (existing) = L10 life.
 *
 * Methods:
 *  - Tm nearest-neighbour: SantaLucia (1998) unified ΔH/ΔS with terminal initiation, symmetry
 *    correction, salt correction ΔS += 0.368 (N − 1) ln[Na⁺], Mg²⁺ as Na⁺-equivalent
 *    120√([Mg] − [dNTP]) (von Ahsen 2001), Tm = ΔH/(ΔS + R ln(Ct/4)). Also Wallace 2(A+T) + 4(G+C)
 *    and the salt-adjusted 81.5 + 16.6 log[Na⁺] + 0.41 %GC − 600/N.
 *  - Stack-up: worst case = Σ|tol|; RSS = √Σtol² (each tolerance = 3σ).
 *  - Bearing: FTF = S/2 (1 − d/D cos θ); BPFO = nS/2 (1 − d/D cos θ); BPFI = nS/2 (1 + d/D cos θ);
 *    BSF = D S/(2d) (1 − (d/D cos θ)²).
 *  - Vibration (sine): v = 2πf·x, a = (2πf)²·x; RMS = peak/√2; pk-pk = 2 × peak. ISO 10816-3
 *    group 2, rigid foundation: zone boundaries 1.4 / 2.8 / 4.5 mm/s RMS.
 *  - Wind triangle: WCA = asin(W sin(WD − TC)/TAS); GS = TAS cos WCA − W cos(WD − TC).
 */

import { type TrvCalculator as Calc, InputError, num, pos, pick, txt, sig, r1, r2 } from "./trv-core";
import { normCdf } from "./sci-math-core";

// ------------------------------------------------------------------ primer Tm
const NN: Record<string, [number, number]> = { AA: [-7.9, -22.2], AT: [-7.2, -20.4], TA: [-7.2, -21.3], CA: [-8.5, -22.7], GT: [-8.4, -22.4], CT: [-7.8, -21.0], GA: [-8.2, -22.2], CG: [-10.6, -27.2], GC: [-9.8, -24.4], GG: [-8.0, -19.9] };
const COMP: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };
const rc = (s: string) => [...s].reverse().map((c) => COMP[c]).join("");
export const primerTm: Calc = (v) => {
  const seq = txt(v, "seq").toUpperCase().replace(/[^A-Z]/g, "").replace(/U/g, "T");
  if (seq.length < 6) throw new InputError("Enter a primer of at least 6 bases (A, C, G, T).");
  if (/[^ACGT]/.test(seq)) throw new InputError("Only A, C, G and T are supported (no degenerate bases).");
  const N = seq.length;
  const gc = [...seq].filter((c) => c === "G" || c === "C").length, at = N - gc;
  let dH = 0, dS = 0;
  for (let i = 0; i < N - 1; i++) { const d = seq.slice(i, i + 2); const p = NN[d] ?? NN[rc(d)]; dH += p[0]; dS += p[1]; }
  for (const e of [seq[0], seq[N - 1]]) { if (e === "G" || e === "C") { dH += 0.1; dS += -2.8; } else { dH += 2.3; dS += 4.1; } }
  const self = seq === rc(seq);
  if (self) dS += -1.4;
  const na = pos(v.na, 50) / 1000, mg = pos(v.mg, 1.5) / 1000, dntp = pos(v.dntp, 0.2) / 1000, ct = pos(v.conc, 250) * 1e-9;
  const naEq = na + 0.12 * Math.sqrt(Math.max(0, mg - dntp));
  if (naEq <= 0 || ct <= 0) throw new InputError("Enter the salt and primer concentrations.");
  const dS2 = dS + 0.368 * (N - 1) * Math.log(naEq);
  const R = 1.987;
  const tm = (dH * 1000) / (dS2 + R * Math.log(self ? ct : ct / 4)) - 273.15;
  const wallace = 2 * at + 4 * gc;
  const saltAdj = 81.5 + 16.6 * Math.log10(naEq) + 0.41 * ((gc / N) * 100) - 600 / N;
  const dG = dH - (310.15 * dS2) / 1000;
  const clamp3 = seq.slice(-5).replace(/[AT]/g, "").length;
  return { tm: r1(tm), wallace: r1(wallace), salt: r1(saltAdj), gc: r1((gc / N) * 100), length: N, ta: `${r1(tm - 5)} °C (Tm − 5 °C, adjust by gradient PCR)`, dg: r2(dG), notes: [gc / N < 0.4 || gc / N > 0.6 ? "GC outside 40–60%" : "", clamp3 > 3 ? "More than 3 G/C in the last 5 bases (strong 3′ clamp)" : clamp3 === 0 ? "No G/C in the last 5 bases (weak 3′ end)" : "", /(.)\1{3,}/.test(seq) ? "Run of 4+ identical bases" : "", self ? "Self-complementary (forms dimers)" : "", N < 18 || N > 30 ? "Length outside the usual 18–30 nt" : ""].filter(Boolean).join("; ") || "Looks good: length, GC content and 3′ end are in the usual ranges" };
};

// ------------------------------------------------------------------ tolerance stack-up
export const stackUp: Calc = (v) => {
  const items = txt(v, "dims").split(/[;\n]+/).map((s) => s.trim()).filter(Boolean).map((s, i) => {
    const m = s.replace(/\s+/g, "").match(/^([+-]?)(\d*\.?\d+)(?:±|\+\/-|\+-)(\d*\.?\d+)$/);
    if (!m) throw new InputError(`Item ${i + 1} ("${s}") should look like +50 ±0.1 or −20 ±0.05.`);
    return { nom: (m[1] === "-" ? -1 : 1) * Number(m[2]), tol: Number(m[3]) };
  });
  if (items.length < 2) throw new InputError("Enter at least two dimensions, separated by semicolons.");
  const nom = items.reduce((s, x) => s + x.nom, 0);
  const wc = items.reduce((s, x) => s + x.tol, 0);
  const rss = Math.sqrt(items.reduce((s, x) => s + x.tol ** 2, 0));
  const req = num(v.min, 0);
  const sigma = rss / 3;
  const pFail = sigma > 0 ? normCdf((req - nom) / sigma) : nom < req ? 1 : 0;
  return { nominal: sig(nom, 8), worst: `${sig(nom - wc, 8)} to ${sig(nom + wc, 8)} (±${sig(wc, 6)})`, rss: `${sig(nom - rss, 6)} to ${sig(nom + rss, 6)} (±${sig(rss, 4)})`, wcOk: nom - wc >= req ? "Worst case always meets the minimum" : "Worst case can fall below the minimum", fail: `${sig(pFail * 100, 4)}% of assemblies below ${req} (RSS, normal)`, count: items.length, biggest: `Largest contributor: item ${items.reduce((b, x, i) => (x.tol ** 2 > items[b].tol ** 2 ? i : b), 0) + 1} (${sig((Math.max(...items.map((x) => x.tol ** 2)) / (rss * rss)) * 100, 3)}% of RSS variance)` };
};

// ------------------------------------------------------------------ bearing fault frequencies
export const bearingFreq: Calc = (v) => {
  const rpm = pos(v.rpm, 1780), n = Math.round(pos(v.balls, 9)), d = pos(v.bd, 7.94), D = pos(v.pd, 38.5), th = (num(v.angle, 0) * Math.PI) / 180;
  if (n < 3 || d <= 0 || D <= d) throw new InputError("Enter the ball count, ball diameter and a pitch diameter larger than the ball.");
  const S = rpm / 60, r = (d / D) * Math.cos(th);
  const f = { ftf: (S / 2) * (1 - r), bpfo: ((n * S) / 2) * (1 - r), bpfi: ((n * S) / 2) * (1 + r), bsf: ((D * S) / (2 * d)) * (1 - r * r) };
  const out = (x: number) => `${sig(x, 5)} Hz = ${sig(x * 60, 5)} CPM = ${sig(x / S, 4)} × shaft`;
  return { bpfo: sig(f.bpfo, 5), bpfi: sig(f.bpfi, 5), bsf: sig(f.bsf, 5), ftf: sig(f.ftf, 5), shaft: sig(S, 5), detail: `BPFO (outer race): ${out(f.bpfo)}\nBPFI (inner race): ${out(f.bpfi)}\nBSF (ball spin): ${out(f.bsf)} (2 × BSF = ${sig(2 * f.bsf, 5)} Hz)\nFTF (cage): ${out(f.ftf)}` };
};

// ------------------------------------------------------------------ vibration conversion
export const VIB_UNITS: [string, number, number][] = [
  // [label, kind 0=disp 1=vel 2=acc, factor to SI peak (m, m/s, m/s²)]
  ["Displacement — µm peak-to-peak", 0, 0.5e-6], ["Displacement — mils peak-to-peak", 0, 0.5 * 25.4e-6], ["Displacement — mm peak", 0, 1e-3],
  ["Velocity — mm/s RMS", 1, Math.SQRT2 * 1e-3], ["Velocity — mm/s peak", 1, 1e-3], ["Velocity — in/s peak", 1, 0.0254], ["Velocity — in/s RMS", 1, Math.SQRT2 * 0.0254],
  ["Acceleration — g peak", 2, 9.80665], ["Acceleration — g RMS", 2, Math.SQRT2 * 9.80665], ["Acceleration — m/s² peak", 2, 1],
];
export const vibration: Calc = (v) => {
  const [, kind, fct] = VIB_UNITS[pick(v.unit, VIB_UNITS.length)];
  const f = pos(v.hz, 100);
  if (f <= 0) throw new InputError("Enter the vibration frequency in Hz (for example 1× running speed = rpm ÷ 60).");
  const w = 2 * Math.PI * f, x0 = num(v.value, 4.5) * fct;
  const xp = kind === 0 ? x0 : kind === 1 ? x0 / w : x0 / (w * w);
  const vp = xp * w, ap = xp * w * w;
  const vr = (vp * 1000) / Math.SQRT2;
  const zone = vr < 1.4 ? "A/B — good (new machine)" : vr < 2.8 ? "B — acceptable for long-term running" : vr < 4.5 ? "C — unsatisfactory, plan maintenance" : "D — severe, risk of damage";
  return { disp: `${sig(xp * 2e6, 4)} µm pk-pk (${sig((xp * 2) / 25.4e-6, 4)} mils pk-pk)`, vel: `${sig(vr, 4)} mm/s RMS | ${sig(vp * 1000, 4)} mm/s peak | ${sig(vp / 0.0254, 4)} in/s peak`, acc: `${sig(ap / 9.80665, 4)} g peak | ${sig(ap / 9.80665 / Math.SQRT2, 4)} g RMS | ${sig(ap, 4)} m/s² peak`, vrms: sig(vr, 4), zone, cpm: sig(f * 60, 5) };
};

// ------------------------------------------------------------------ E6B
const norm360 = (x: number) => ((x % 360) + 360) % 360;
export const e6b: Calc = (v) => {
  const tas = pos(v.tas, 120), tc = num(v.tc, 90), wd = num(v.wd, 30), ws = pos(v.ws, 20), dist = pos(v.dist, 150), burn = pos(v.burn, 9), varE = num(v.var, 0), dev = num(v.dev, 0);
  if (tas <= 0) throw new InputError("Enter the true airspeed.");
  const rel = ((wd - tc) * Math.PI) / 180;
  const s = (ws * Math.sin(rel)) / tas;
  if (Math.abs(s) > 1) throw new InputError("The crosswind is stronger than the airspeed — the course can't be flown.");
  const wca = Math.asin(s);
  const gs = tas * Math.cos(wca) - ws * Math.cos(rel);
  if (gs <= 0) throw new InputError("The headwind is stronger than the airspeed — ground speed would be zero or negative.");
  const th = norm360(tc + (wca * 180) / Math.PI);
  const mh = norm360(th - varE), ch = norm360(mh - dev);
  const hrs = dist / gs, mins = hrs * 60;
  const head = ws * Math.cos(rel), cross = ws * Math.sin(rel);
  return { gs: r1(gs), th: r1(th), wca: r1((wca * 180) / Math.PI), mh: r1(mh), ch: r1(ch), time: `${Math.floor(mins / 60)} h ${Math.round(mins % 60)} min (${r2(hrs)} h)`, fuel: r1(hrs * burn), comps: `${head >= 0 ? "Headwind" : "Tailwind"} ${r1(Math.abs(head))} kt, crosswind ${r1(Math.abs(cross))} kt from the ${cross >= 0 ? "right" : "left"}` };
};

export const techSciCustomCalculators: Record<string, Calc> = {
  "primer-tm-calculator": primerTm,
  "tolerance-stack-up-calculator": stackUp,
  "bearing-fault-frequency-calculator": bearingFreq,
  "vibration-conversion-calculator": vibration,
  "e6b-flight-calculator": e6b,
};
