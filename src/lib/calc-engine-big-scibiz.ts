/**
 * Batch: big generic keyword check (16 Nov 2026) — ten tools: energy converter (Science >
 * Physics), lattice energy (Chemistry), HP to amps (Electrical & Electronics), antipode (Earth,
 * Weather & Environment), star rating and meeting cost (Business > HR, Marketing & Business Ops),
 * safety stock (Freight, Logistics & Warehouse), valve Cv (Manufacturing), pig gestation
 * (Agriculture & Livestock) and lottery odds (Finance > Tax, next to lottery tax/payout).
 *
 * Near-namesakes kept apart on purpose:
 *  - energy-converter = J ↔ kWh, cal, BTU, eV, ft·lbf. unit-converter (existing) has no energy;
 *    torque-conversion (existing) handles ft·lb as torque.
 *  - hp-to-amps = motor HP → amps by phase, efficiency and power factor. watts-to-amps and
 *    kva-to-amps (existing) start from watts or kVA.
 *  - safety-stock = Z × σ-demand × √lead time (and max-min). reorder-point (existing) uses a
 *    given safety stock.
 *  - pig-gestation = sow farrowing (114 days). guinea-pig-gestation (existing) is a pet.
 *  - lottery-odds = jackpot and prize-tier odds. lottery-tax / lottery-payout (existing) are money.
 */

import { type TrvCalculator as Calc, InputError, num, pick, nfmt, sig, dayText, dateIn, nearestPlace, latLonText } from "./trv-core";

const today = () => Math.floor(Date.now() / 86400000);
const show = (x: number, s = 6) => (Number.isFinite(x) ? (Math.abs(x) >= 1e15 || (Math.abs(x) < 1e-6 && x !== 0) ? x.toExponential(Math.max(0, s - 1)).replace(/\.?0+e/, "e") : nfmt(sig(x, s), 10).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")) : "—");
const usd = (x: number) => `$${x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ------------------------------------------------------------------ energy converter
export const EN_UNITS: [string, number][] = [["joules (J)", 1], ["kilojoules (kJ)", 1e3], ["megajoules (MJ)", 1e6], ["watt-hours (Wh)", 3600], ["kilowatt-hours (kWh)", 3.6e6], ["calories (cal)", 4.184], ["kilocalories / food Calories (kcal)", 4184], ["BTU", 1055.05585262], ["therms", 105505585.262], ["electronvolts (eV)", 1.602176634e-19], ["foot-pounds (ft·lbf)", 1.3558179483], ["ergs", 1e-7]];
export const energyConverter: Calc = (v) => {
  const x = num(v.value, 1), from = EN_UNITS[pick(v.from, EN_UNITS.length)], to = EN_UNITS[pick(v.to, EN_UNITS.length)];
  const j = x * from[1];
  return {
    result: `${show(j / to[1])} ${to[0]}`,
    joules: `${show(j)} J`,
    kwh: `${show(j / 3.6e6)} kWh`,
    kcal: `${show(j / 4184)} kcal`,
    btu: `${show(j / 1055.05585262)} BTU`,
    all: EN_UNITS.map((u) => `${show(j / u[1], 5)} ${u[0].split(" (")[0]}`).join("; "),
  };
};

// ------------------------------------------------------------------ lattice energy
export const LE_PRESETS: [string, number, number, number, number, number, number, number][] = [
  // name, z+, z−, r+ pm, r− pm, ν, Madelung M, Born n
  ["Custom", 1, 1, 102, 181, 2, 1.74756, 8], ["NaCl", 1, 1, 102, 181, 2, 1.74756, 8], ["KCl", 1, 1, 138, 181, 2, 1.74756, 9], ["LiF", 1, 1, 76, 133, 2, 1.74756, 6], ["NaF", 1, 1, 102, 133, 2, 1.74756, 7], ["KBr", 1, 1, 138, 196, 2, 1.74756, 9.5], ["MgO", 2, 2, 72, 140, 2, 1.74756, 7], ["CaO", 2, 2, 100, 140, 2, 1.74756, 8], ["CaF₂", 2, 1, 100, 133, 3, 2.51939, 8], ["CsCl", 1, 1, 167, 181, 2, 1.76267, 10.5],
];
export const latticeEnergy: Calc = (v) => {
  const i = pick(v.preset, LE_PRESETS.length), p = LE_PRESETS[i];
  const [zc, za, rc, ra, nu, M, n] = i === 0 ? [num(v.zc, 1), num(v.za, 1), num(v.rc, 102), num(v.ra, 181), num(v.nu, 2), num(v.madelung, 1.74756), num(v.born, 8)] : p.slice(1) as number[];
  const r = rc + ra;
  if (!(r > 34.5) || !(zc > 0) || !(za > 0) || !(nu > 0)) throw new InputError("Enter positive charges, ions per formula unit and ionic radii in pm.");
  const kap = (1.2025e5 * nu * zc * za / r) * (1 - 34.5 / r);
  const bl = M > 0 && n > 1 ? (1.389354e5 * M * zc * za / r) * (1 - 1 / n) : NaN;
  return {
    kapustinskii: `${show(kap, 4)} kJ/mol`,
    bornLande: Number.isFinite(bl) ? `${show(bl, 4)} kJ/mol` : "— (needs Madelung constant and Born exponent)",
    distance: `r₀ = ${show(r, 4)} pm`,
    ions: `${i === 0 ? "Custom" : p[0]}: charges +${zc}/−${za}, ${nu} ions per formula unit`,
    trend: "Lattice energy rises with higher charges and smaller ions.",
  };
};
export const hpToAmps: Calc = (v) => {
  const hp = num(v.hp, 10), V = num(v.volts, 230), ph = pick(v.phase, 3), eff = num(v.eff, 90) / 100, pf = num(v.pf, 0.85);
  if (!(hp > 0) || !(V > 0) || !(eff > 0) || eff > 1) throw new InputError("Enter horsepower, voltage and an efficiency of 1–100%.");
  if (ph > 0 && (!(pf > 0) || pf > 1)) throw new InputError("Power factor must be between 0 and 1.");
  const w = hp * 745.7, amps = ph === 0 ? w / (V * eff) : ph === 1 ? w / (V * eff * pf) : w / (Math.sqrt(3) * V * eff * pf);
  return {
    amps: `${show(amps, 4)} A`,
    output: `${show(w / 1000, 4)} kW output (1 hp = 745.7 W)`,
    input: `${show(w / eff / 1000, 4)} kW electrical input${ph ? `, ${show(w / eff / pf / 1000, 4)} kVA` : ""}`,
    formula: ph === 0 ? "I = hp × 745.7 ÷ (V × efficiency)" : ph === 1 ? "I = hp × 745.7 ÷ (V × efficiency × PF)" : "I = hp × 745.7 ÷ (√3 × V × efficiency × PF)",
    nec: "For wire and breaker sizing in the US, use the NEC full-load current tables (430.247–430.250), not this estimate.",
  };
};

// ------------------------------------------------------------------ antipode
export const antipode: Calc = (v) => {
  const lat = num(v.lat, 40.7128), lon = num(v.lon, -74.006);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new InputError("Latitude must be −90 to 90 and longitude −180 to 180.");
  const a = { lat: -lat, lon: lon > 0 ? lon - 180 : lon + 180 }, near = nearestPlace(a), here = nearestPlace({ lat, lon });
  return {
    antipode: latLonText(a),
    decimal: `${show(a.lat, 8)}, ${show(a.lon, 8)}`,
    nearest: `${near.place.name} is the nearest big city, ${nfmt(Math.round(near.km))} km (${nfmt(Math.round(near.km / 1.609344))} mi) from the antipode`,
    from: `Your point is near ${here.place.name}`,
    distance: "Any point and its antipode are 20,015 km (12,437 mi) apart — half the Earth's circumference",
    note: near.km > 1500 ? "That's far from any city in our list — the antipode is very likely in the ocean (about 85% of land antipodes are)." : "Close to land — check a map for the exact spot.",
  };
};

// ------------------------------------------------------------------ star rating
export const starRating: Calc = (v) => {
  const c = [1, 2, 3, 4, 5].map((s) => Math.max(0, Math.round(num(v[`s${s}`], 0)))), tgt = num(v.target, 4.5);
  const n = c.reduce((a, b) => a + b, 0), sum = c.reduce((a, b, i) => a + b * (i + 1), 0);
  if (!n) throw new InputError("Enter how many reviews you have at each star level.");
  const avg = sum / n;
  let need = "—";
  if (tgt > 0) { if (tgt >= 5) need = "A 5.0 average needs every review to be 5 stars"; else if (avg >= tgt) need = `Already at ${show(tgt, 3)} or better`; else need = `${nfmt(Math.ceil((tgt * n - sum) / (5 - tgt)))} more 5-star reviews to reach ${show(tgt, 3)}`; }
  return {
    average: `${avg.toFixed(2)} out of 5 (shown as ${(Math.round(avg * 10) / 10).toFixed(1)})`,
    reviews: `${nfmt(n)} reviews, ${nfmt(sum)} stars in total`,
    split: c.map((x, i) => `${i + 1}★ ${show((x / n) * 100, 3)}%`).reverse().join(" · "),
    need,
    positive: `${show(((c[3] + c[4]) / n) * 100, 3)}% positive (4–5 stars)`,
  };
};
export const meetingCost: Calc = (v) => {
  const ppl = num(v.people, 8), pay = num(v.pay, 75000), mode = pick(v.payType, 2), mins = num(v.minutes, 60), per = num(v.perWeek, 1), load = num(v.load, 1.3);
  if (!(ppl > 0) || !(pay > 0) || !(mins > 0)) throw new InputError("Enter attendees, pay and meeting length.");
  const hourly = (mode === 0 ? pay / 2080 : pay) * (load > 0 ? load : 1), cost = ppl * hourly * (mins / 60), year = cost * per * 50;
  return {
    cost: usd(cost),
    perMinute: `${usd(cost / mins)} per minute`,
    year: per > 0 ? `${usd(year)} a year (${show(per, 3)} a week, 50 working weeks)` : "One-off",
    hours: `${show((ppl * mins * per * 50) / 60, 4)} person-hours a year`,
    rate: `${usd(hourly)} loaded hourly cost per person (× ${show(load, 3)} for benefits and overhead)`,
  };
};

// ------------------------------------------------------------------ safety stock
export const SS_LEVELS: [string, number][] = [["90%", 1.2816], ["95%", 1.6449], ["97.5%", 1.96], ["98%", 2.0537], ["99%", 2.3263], ["99.5%", 2.5758], ["99.9%", 3.0902]];
export const safetyStock: Calc = (v) => {
  const m = pick(v.method, 2), d = num(v.demand, 100), sd = num(v.sdDemand, 20), lt = num(v.lead, 7), sdl = num(v.sdLead, 0), dmax = num(v.maxDemand, 140), ltmax = num(v.maxLead, 10);
  if (!(d > 0) || !(lt > 0)) throw new InputError("Enter average daily demand and lead time.");
  const [lvl, z] = SS_LEVELS[pick(v.level, SS_LEVELS.length)];
  const ss = m === 0 ? z * Math.sqrt(lt * sd * sd + d * d * sdl * sdl) : Math.max(0, dmax * ltmax - d * lt);
  return {
    ss: `${nfmt(Math.ceil(ss))} units`,
    rop: `${nfmt(Math.ceil(d * lt + ss))} units (lead-time demand ${nfmt(Math.round(d * lt))} + safety stock)`,
    days: `${show(ss / d, 3)} days of cover`,
    method: m === 0 ? `Z = ${z} for a ${lvl} service level: SS = Z × √(LT × σd² + d² × σLT²)` : "SS = max daily demand × max lead time − average daily demand × average lead time",
  };
};
export const valveCv: Calc = (v) => {
  const m = pick(v.mode, 3), q = num(v.flow, 10), cv = num(v.cv, 2), dp = num(v.dp, 10), sg = num(v.sg, 1), p1 = num(v.p1, 100), tf = num(v.temp, 68);
  if (!(dp > 0) || !(sg > 0)) throw new InputError("Enter a pressure drop and specific gravity above zero.");
  if (m === 0 || m === 1) {
    const c = m === 0 ? q * Math.sqrt(sg / dp) : cv, f = m === 1 ? cv * Math.sqrt(dp / sg) : q;
    if (!(c > 0)) throw new InputError("Enter the flow (gpm) or Cv.");
    return { cv: `Cv = ${show(c, 4)}`, flow: `${show(f, 4)} US gpm (${show(f * 3.78541, 4)} L/min)`, kv: `Kv = ${show(c * 0.865, 4)} (m³/h at 1 bar)`, formula: "Q = Cv × √(ΔP ÷ SG)", note: "Liquid, non-choked, turbulent flow; ΔP in psi." };
  }
  const P1 = p1 + 14.696, T = tf + 459.67;
  if (dp >= P1 / 2) throw new InputError("Pressure drop is at or above half the inlet pressure — the flow is choked; this simple formula doesn't apply.");
  const c = q / (22.67 * P1 * (1 - (2 * dp) / (3 * P1)) * Math.sqrt(dp / (P1 * sg * T)));
  return { cv: `Cv = ${show(c, 4)}`, flow: `${show(q, 4)} scfm of gas (SG ${show(sg, 3)})`, kv: `Kv = ${show(c * 0.865, 4)}`, formula: "Q = 22.67 × Cv × P₁ × (1 − 2ΔP/3P₁) × √(ΔP ÷ (P₁ × SG × T₁))", note: "Swagelok gas sizing; P₁ absolute (gauge + 14.7 psi), T in °R." };
};

// ------------------------------------------------------------------ pig gestation
export const pigGestation: Calc = (v) => {
  const bred = dateIn(v, "bred", today() - 30), now = dateIn(v, "asof", today()), len = Math.round(num(v.days, 114));
  if (len < 100 || len > 125) throw new InputError("Pig gestation is 110–120 days (114 average).");
  const due = bred + len, day = now - bred;
  return {
    due: dayText(due),
    window: `${dayText(bred + 111)} to ${dayText(bred + 117)}`,
    progress: day < 0 ? "Breeding date is in the future" : day > len ? `${day - len} days past the due date` : `Day ${day} of ${len} (${Math.round((day / len) * 100)}%) — ${len - day} days to go`,
    check: `Pregnancy check (ultrasound) ${dayText(bred + 21)}–${dayText(bred + 35)}; watch for return to heat around ${dayText(bred + 21)}`,
    crate: `Move to the farrowing pen about ${dayText(due - 5)}`,
    rule: "3 months, 3 weeks and 3 days (114 days)",
  };
};

// ------------------------------------------------------------------ lottery odds
const nCk = (n: number, k: number) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); };
export const LO_GAMES: [string, number, number, number][] = [["Powerball (5 of 69 + 1 of 26)", 69, 5, 26], ["Mega Millions (5 of 70 + 1 of 24)", 70, 5, 24], ["Lotto America (5 of 52 + 1 of 10)", 52, 5, 10], ["Lucky for Life (5 of 48 + 1 of 18)", 48, 5, 18], ["EuroMillions (5 of 50 + 2 of 12)", 50, 5, -12], ["Custom pick-N game", 0, 0, 0]];
export const lotteryOdds: Calc = (v) => {
  const gi = pick(v.game, LO_GAMES.length), g = LO_GAMES[gi], t = Math.max(1, Math.round(num(v.tickets, 1)));
  const [N, K, B] = gi === LO_GAMES.length - 1 ? [Math.round(num(v.pool, 49)), Math.round(num(v.pick, 6)), Math.round(num(v.bonus, 0))] : [g[1], g[2], g[3]];
  if (!(N > 0) || !(K > 0) || K > N) throw new InputError("Pick count must be between 1 and the pool size.");
  const bonusWays = B > 0 ? B : B < 0 ? nCk(-B, 2) : 1, combos = nCk(N, K) * bonusWays, p = 1 / combos;
  const atLeast = 1 - Math.pow(1 - p, t);
  let tiers = "—";
  if (K === 5 && B > 0) {
    const pb = 1 / B, rows: string[] = [];
    let any = 0;
    for (const [w, b] of [[5, 1], [5, 0], [4, 1], [4, 0], [3, 1], [3, 0], [2, 1], [1, 1], [0, 1]] as [number, number][]) {
      const pw = (nCk(5, w) * nCk(N - 5, 5 - w)) / nCk(N, 5), pr = pw * (b ? pb : 1 - pb); any += pr;
      rows.push(`${w}${b ? "+bonus" : ""}: 1 in ${nfmt(Math.round(1 / pr))}`);
    }
    tiers = `${rows.join("; ")} — any prize about 1 in ${show(1 / any, 4)}`;
  }
  return {
    jackpot: `1 in ${nfmt(combos)}`,
    pct: `${show(p * 100, 4)}% per ticket`,
    tickets: `${nfmt(t)} ticket${t > 1 ? "s" : ""}: ${show(atLeast * 100, 4)}% chance of at least one jackpot (1 in ${nfmt(Math.round(1 / atLeast))})`,
    tiers,
    compare: `About ${show(combos / 15300, 3)}× less likely than being struck by lightning in your lifetime (≈1 in 15,300)`,
  };
};

export const bigSciBizCustomCalculators: Record<string, Calc> = {
  "energy-converter-calculator": energyConverter,
  "lattice-energy-calculator": latticeEnergy,
  "hp-to-amps-calculator": hpToAmps,
  "antipode-calculator": antipode,
  "star-rating-calculator": starRating,
  "meeting-cost-calculator": meetingCost,
  "safety-stock-calculator": safetyStock,
  "valve-cv-calculator": valveCv,
  "pig-gestation-calculator": pigGestation,
  "lottery-odds-calculator": lotteryOdds,
};
