/**
 * Batch: Tech keyword check (15 Nov 2026) — installation, solar, data-centre and welding tools:
 * House & Garden > HVAC, Plumbing & Electrical (conduit bending, pull box, cable pulling tension,
 * LED strip power, beam angle), Business & Industrial > Energy, Solar & Electrical (solar string,
 * server power cost) and > Manufacturing, Metals & Engineering (weld settings).
 *
 * Near-namesakes kept apart on purpose:
 *  - pull-box-calculator = NEC 314.28 sizing for 4 AWG+ conductors; box-fill-calculator (existing)
 *    = NEC 314.16 volume for small conductors.
 *  - conduit-bending-calculator = bend marks; conduit-fill-calculator (existing) = how many wires.
 *  - weld-settings-calculator = machine amps/volts/wire speed; welding-calculator (existing) = filler
 *    metal quantity; welding-heat-input (existing) = kJ/mm.
 *  - server-power-cost-calculator = racks/servers with PUE and cooling; pc-power-consumption
 *    (existing) = one home PC.
 *
 * Methods:
 *  - Offset bends: distance between bends = rise ÷ sin θ; shrink = rise × tan(θ/2).
 *    3-point saddle (45° centre, 22½° sides): outer marks 2.5 × height from centre; shrink 3/16" per
 *    inch. 90° stub take-up (deduct): EMT ½" 5", ¾" 6", 1" 8", 1¼" 11".
 *  - NEC 314.28(A): straight pull ≥ 8 × largest trade size; angle/U pull ≥ 6 × largest + Σ others in
 *    the same row; raceways enclosing the same conductor ≥ 6 × trade size apart.
 *  - Pulling tension: straight T₂ = T₁ + W·f·L; bend T₂ = T₁·e^(f·θ); sidewall bearing pressure
 *    SWBP = T ÷ R. Max conductor tension 0.008 lb/cmil (copper).
 *  - Beam: spot diameter 2·d·tan(θ/2); solid angle 2π(1 − cos(θ/2)); intensity ≈ lumens ÷ Ω.
 *  - Solar string: Voc_cold = Voc·(1 + β·(T_min − 25)); Vmp_hot = Vmp·(1 + γ·(T_cell,max − 25)).
 *  - Server power: facility kW = IT kW × PUE; cooling BTU/h = IT W × 3.412; 1 ton = 12,000 BTU/h.
 *  - Welding rules of thumb: about 1 A per 0.001" (0.0254 mm) of steel; MIG wire-feed ipm per amp
 *    0.023" 3.5, 0.030" 2, 0.035" 1.6, 0.045" 1; short-circuit volts ≈ 14 + A/20.
 */

import { type TrvCalculator as Calc, InputError, num, pos, pick, txt, sig, r1, r2, nfmt, money } from "./trv-core";

const fracIn = (x: number) => {
  const s = Math.round(x * 16);
  const w = Math.floor(s / 16), f = s % 16;
  if (!f) return `${w}"`;
  const g = f % 8 === 0 ? 8 : f % 4 === 0 ? 4 : f % 2 === 0 ? 2 : 1;
  return `${w ? `${w} ` : ""}${f / g}/${16 / g}"`;
};

// ------------------------------------------------------------------ conduit bending
export const BEND_MODES = ["Offset (two equal bends)", "3-point saddle (45° centre)", "90° stub-up"];
export const BEND_ANGLES = [10, 22.5, 30, 45, 60];
export const EMT_SIZES: [string, number][] = [["½\" EMT", 5], ["¾\" EMT", 6], ["1\" EMT", 8], ["1¼\" EMT", 11]];
export const conduitBend: Calc = (v) => {
  const mode = pick(v.mode, 3), H = pos(v.height, 6), obst = pos(v.dist, 24);
  if (H <= 0) throw new InputError("Enter the offset or saddle height (or stub length) in inches.");
  if (mode === 0) {
    const a = BEND_ANGLES[pick(v.angle, 5)], t = (a * Math.PI) / 180;
    const mult = 1 / Math.sin(t), between = H * mult, shrink = H * Math.tan(t / 2);
    const first = obst + shrink;
    return { main: `Marks ${fracIn(between)} apart`, mult: sig(mult, 4), shrink: fracIn(shrink), first: `First mark at ${fracIn(first)} from the pipe end (obstacle ${fracIn(obst)} + shrink); second at ${fracIn(first + between)}`, between: r2(between), note: `${a}° bends: multiplier ${sig(mult, 3)}, shrink ${sig(Math.tan(t / 2), 3)}" per inch of rise` };
  }
  if (mode === 1) {
    const out = 2.5 * H, shrink = (3 / 16) * H;
    const centre = obst + shrink;
    return { main: `Outer marks ${fracIn(out)} each side of centre`, mult: 2.5, shrink: fracIn(shrink), first: `Centre mark (45°) at ${fracIn(centre)}; outer marks (22½°) at ${fracIn(centre - out)} and ${fracIn(centre + out)}`, between: r2(out), note: "Bend the centre 45° first, then the two outer 22½° bends in the opposite direction" };
  }
  const [name, take] = EMT_SIZES[pick(v.size, EMT_SIZES.length)];
  const mark = H - take;
  if (mark <= 0) throw new InputError(`The stub must be longer than the ${take}" take-up for ${name}.`);
  return { main: `Mark at ${fracIn(mark)} from the end`, mult: "—", shrink: "—", first: `Stub ${fracIn(H)} − take-up ${take}" = ${fracIn(mark)}; line the bender's arrow up with the mark`, between: r2(mark), note: `${name} hand bender take-up (deduct) ${take}"` };
};

// ------------------------------------------------------------------ pull box (NEC 314.28)
export const PULL_TYPES = ["Straight pull", "Angle or U pull"];
export const pullBox: Calc = (v) => {
  const big = pos(v.largest, 2), type = pick(v.type, 2);
  if (big <= 0) throw new InputError("Enter the largest raceway trade size in inches.");
  const others = txt(v, "others").split(/[,;\s]+/).filter(Boolean).map((x) => { const n = Number(x.replace(/"/g, "")); if (!(n > 0)) throw new InputError(`"${x}" isn't a trade size.`); return n; });
  if (type === 0) return { length: `${r2(8 * big)}" minimum length (8 × ${big}")`, width: "Width/depth: enough for the raceways and conductors (no NEC multiplier)", min: r2(8 * big), spacing: "—", rule: "NEC 314.28(A)(1)" };
  const sum = others.reduce((s, x) => s + x, 0);
  const d = 6 * big + sum;
  return { length: `${r2(d)}" minimum to the opposite wall (6 × ${big}" + ${r2(sum)}" of other raceways in that row)`, width: `Repeat for each row/wall — the larger result sets that dimension`, min: r2(d), spacing: `Raceways carrying the same conductor at least ${r2(6 * big)}" apart`, rule: "NEC 314.28(A)(2)" };
};

// ------------------------------------------------------------------ cable pulling tension
export const cablePull: Calc = (v) => {
  const W = pos(v.weight, 1.5), f = pos(v.friction, 0.5), R = pos(v.radius, 3);
  const segs = txt(v, "route").split(/[;\n]+/).map((s) => s.trim()).filter(Boolean).map((s, i) => {
    const m = s.match(/^([SB])\s*(\d*\.?\d+)$/i);
    if (!m) throw new InputError(`Section ${i + 1} ("${s}") must be S <feet> for straight or B <degrees> for a bend.`);
    return { bend: m[1].toUpperCase() === "B", x: Number(m[2]) };
  });
  if (!segs.length) throw new InputError("Describe the route, e.g. S 100; B 90; S 50.");
  const run = (list: typeof segs) => {
    let T = 0, sw = 0;
    for (const s of list) {
      if (s.bend) { T *= Math.exp(f * ((s.x * Math.PI) / 180)); if (R > 0) sw = Math.max(sw, T / R); }
      else T += W * f * s.x;
    }
    return { T, sw };
  };
  const fwd = run(segs), rev = run([...segs].reverse());
  const cmil = pos(v.cmil, 0), n = Math.max(1, Math.round(pos(v.count, 3)));
  const maxT = cmil > 0 ? 0.008 * cmil * n * (n > 3 ? 0.8 : 1) : 0;
  const best = fwd.T <= rev.T ? "Pull from the start (as entered)" : "Pull from the other end — lower tension";
  return { tension: Math.round(fwd.T), reverse: Math.round(rev.T), best, sw: Math.round(fwd.T <= rev.T ? fwd.sw : rev.sw), max: maxT > 0 ? `${nfmt(Math.round(maxT))} lb allowed on the conductors — ${Math.min(fwd.T, rev.T) <= maxT ? "OK" : "TOO HIGH, add a pull point"}` : "— (enter conductor size to check)", swCheck: `Sidewall pressure ${Math.round(fwd.T <= rev.T ? fwd.sw : rev.sw)} lb/ft (typical limit 500 lb/ft for power cable — check the maker's data)` };
};

// ------------------------------------------------------------------ LED strip power
const PSU = [12, 24, 36, 60, 75, 100, 150, 200, 240, 300, 350, 400, 480, 600, 800, 1000];
export const ledStrip: Calc = (v) => {
  const L = pos(v.length, 5), V = pos(v.volts, 24), head = pos(v.headroom, 20) / 100;
  let wpm = pos(v.wpm, 14.4);
  if (wpm <= 0) { const leds = pos(v.ledsPerM, 60), ma = pos(v.ma, 60); wpm = (leds * ma * V) / 1000; }
  if (L <= 0 || V <= 0 || wpm <= 0) throw new InputError("Enter the strip length, voltage and watts per metre (or LEDs per metre and mA per LED).");
  const W = L * wpm, A = W / V, need = W * (1 + head);
  const psu = PSU.find((p) => p >= need);
  const runMax = V <= 5 ? 2 : V <= 12 ? 5 : 10;
  return { watts: r1(W), amps: r2(A), psu: psu ? `${psu} W (${r1(psu / V)} A at ${V} V)` : `${Math.ceil(need)} W — use several supplies`, need: r1(need), inject: L > runMax ? `Feed power every ${runMax} m (${Math.ceil(L / runMax) - 1} extra injection point${Math.ceil(L / runMax) - 1 > 1 ? "s" : ""}) to avoid dimming at the far end` : "No power injection needed for this length", wire: `${A <= 5 ? "18 AWG (0.75 mm²)" : A <= 10 ? "16 AWG (1.5 mm²)" : A <= 15 ? "14 AWG (2.5 mm²)" : "12 AWG (4 mm²) or split the run"} for short feeds` };
};

// ------------------------------------------------------------------ beam angle
export const beamAngle: Calc = (v) => {
  const ang = pos(v.angle, 36), d = pos(v.dist, 3), lm = pos(v.lumens, 800), feet = pick(v.units, 2) === 1;
  if (ang <= 0 || ang >= 180 || d <= 0) throw new InputError("Enter a beam angle between 0 and 180° and a distance.");
  const t = (ang * Math.PI) / 360;
  const dm = feet ? d * 0.3048 : d;
  const dia = 2 * dm * Math.tan(t), area = (Math.PI * dia * dia) / 4;
  const omega = 2 * Math.PI * (1 - Math.cos(t));
  const cd = lm / omega;
  const target = pos(v.target);
  const need = target > 0 ? (2 * Math.atan((feet ? target * 0.3048 : target) / 2 / dm) * 180) / Math.PI : NaN;
  const len = (m: number) => (feet ? `${r2(m / 0.3048)} ft` : `${r2(m)} m`);
  return { dia: len(dia), area: feet ? `${r2(area / 0.092903)} ft²` : `${r2(area)} m²`, lux: Math.round(lm / area), centre: Math.round(cd / (dm * dm)), cd: Math.round(cd), need: Number.isFinite(need) ? `${r1(need)}° beam for a ${target} ${feet ? "ft" : "m"} spot` : "—" };
};

// ------------------------------------------------------------------ solar string sizing
export const solarString: Calc = (v) => {
  const voc = pos(v.voc, 49.5), vmp = pos(v.vmp, 41.6), isc = pos(v.isc, 13.9), beta = num(v.beta, -0.27) / 100, gamma = num(v.gamma, -0.35) / 100;
  const tmin = num(v.tmin, -10), thot = num(v.thot, 70);
  const vmax = pos(v.vmax, 600), mpMin = pos(v.mppMin, 100), mpMax = pos(v.mppMax, 550), imax = pos(v.imax, 16);
  if (voc <= 0 || vmp <= 0 || vmax <= 0) throw new InputError("Enter the panel Voc, Vmp and the inverter's maximum DC voltage.");
  const vocCold = voc * (1 + beta * (tmin - 25)), vmpHot = vmp * (1 + gamma * (thot - 25)), vmpCold = vmp * (1 + gamma * (tmin - 25));
  const maxN = Math.floor(vmax / vocCold), maxMpp = Math.floor(mpMax / vmpCold), minN = Math.ceil(mpMin / vmpHot);
  const hi = Math.min(maxN, Math.max(maxMpp, minN));
  return { range: minN <= maxN ? `${minN} to ${maxN} panels per string` : "No valid string length — check the inverter voltage window", max: maxN, min: minN, best: minN <= maxN ? `${hi} panels: ${r1(hi * vocCold)} V cold open-circuit, ${r1(hi * vmpHot)} V hot MPP` : "—", vocCold: r2(vocCold), vmpHot: r2(vmpHot), current: isc * 1.25 <= imax ? `OK: ${r2(isc * 1.25)} A (Isc × 1.25) ≤ ${imax} A per MPPT` : `Too high: ${r2(isc * 1.25)} A > ${imax} A — check the inverter's short-circuit rating` };
};

// ------------------------------------------------------------------ server / data-centre power cost
export const serverPower: Calc = (v) => {
  const n = Math.max(0, pos(v.servers, 10)), w = pos(v.watts, 350), pue = Math.max(1, pos(v.pue, 1.5)), price = pos(v.price, 0.14), hours = Math.min(24, pos(v.hours, 24));
  const it = n * w, fac = it * pue;
  const kwhM = (fac / 1000) * hours * 30.4375;
  return { monthly: r2(kwhM * price), yearly: r2(kwhM * 12 * price), kwh: nfmt(Math.round(kwhM)), it: r2(it / 1000), facility: r2(fac / 1000), btu: nfmt(Math.round(it * 3.412)), tons: r2((it * 3.412) / 12000), amps: `${r1(it / 208)} A at 208 V / ${r1(it / 230)} A at 230 V (IT load)`, perServer: money((kwhM * price) / Math.max(1, n), "$", 2) };
};

// ------------------------------------------------------------------ weld settings
export const WELD_PROCESSES = ["MIG (GMAW) — mild steel, short-circuit", "Flux-core (FCAW) — mild steel", "TIG (GTAW) DC — steel / stainless", "TIG (GTAW) AC — aluminium", "Stick (SMAW) — E6013 / E7018"];
export const weldSettings: Calc = (v) => {
  const p = pick(v.process, 5);
  const tIn = pick(v.units, 2) === 1 ? pos(v.thick, 3) / 25.4 : pos(v.thick, 0.125);
  if (tIn <= 0) throw new InputError("Enter the material thickness.");
  const cap = Math.min(tIn, 0.5);
  let amps = cap * 1000;
  let a = "", b = "", c = "";
  if (p === 0 || p === 1) {
    if (p === 1) amps *= 0.9;
    amps = Math.max(30, Math.min(amps, p === 0 ? 220 : 250));
    const wire = tIn <= 0.0625 ? 0.023 : tIn <= 0.1875 ? 0.03 : tIn <= 0.3125 ? 0.035 : 0.045;
    const ipmA = ({ 0.023: 3.5, 0.03: 2, 0.035: 1.6, 0.045: 1 } as Record<number, number>)[wire];
    a = `${wire}" wire${p === 1 ? " (flux-core: use DCEN, no gas)" : ""}`;
    b = `${Math.round(amps * ipmA)} in/min wire feed (${r1((amps * ipmA * 25.4) / 1000)} m/min)`;
    c = `${r1(14 + amps / 20)} V`;
  } else if (p === 2 || p === 3) {
    if (p === 3) amps *= 1.1;
    amps = Math.max(10, Math.min(amps, 300));
    a = `${amps <= 70 ? "1/16\"" : amps <= 150 ? "3/32\"" : "1/8\""} tungsten (${p === 3 ? "zirconiated or lanthanated" : "2% lanthanated or ceriated"})`;
    b = `${amps <= 70 ? "1/16\"" : amps <= 150 ? "3/32\"" : "1/8\""} filler rod`;
    c = p === 3 ? "AC balance ~70% EN, frequency 100–120 Hz" : "DCEN";
  } else {
    const rod = tIn <= 0.09 ? 0.0938 : tIn <= 0.1875 ? 0.125 : 0.156;
    amps = rod * 1000;
    a = `${rod === 0.0938 ? "3/32\"" : rod === 0.125 ? "1/8\"" : "5/32\""} electrode`;
    b = `${Math.round(rod * 1000 * 0.75)}–${Math.round(rod * 1000 * 1.2)} A range for this rod`;
    c = "E7018: DCEP; E6013: AC or DC";
  }
  const gas = ["75% Ar / 25% CO₂ at 20–25 cfh", "None (self-shielded) or 75/25 for dual-shield", "100% argon at 15–20 cfh", "100% argon at 15–25 cfh", "None"][p];
  return { amps: Math.round(amps), wire: a, feed: b, volts: c, gas, passes: tIn > 0.25 ? `Over ¼": bevel the joint and use ${Math.ceil(tIn / 0.1875)} or more passes` : "Single pass" };
};

export const techInstallCustomCalculators: Record<string, Calc> = {
  "conduit-bending-calculator": conduitBend,
  "pull-box-calculator": pullBox,
  "cable-pulling-tension-calculator": cablePull,
  "led-strip-power-calculator": ledStrip,
  "beam-angle-calculator": beamAngle,
  "solar-string-calculator": solarString,
  "server-power-cost-calculator": serverPower,
  "weld-settings-calculator": weldSettings,
};
