/**
 * Batch: big generic keyword check (16 Nov 2026), medical part 2 — eight Health > Sleep & Medical
 * tools (LDL cholesterol, mean arterial pressure, blood pressure, ANC, cardiac output, HOMA-IR,
 * QTc, contact lens vertex) and three Health > Pregnancy & Fertility tools (baby growth
 * percentile, corrected age, breast milk intake).
 *
 * Near-namesakes kept apart on purpose:
 *  - mean-arterial-pressure = MAP from one reading (DBP + PP/3). blood-pressure = AHA category of
 *    one or several readings (averaged). They share inputs but answer different questions.
 *  - baby-growth-percentile = WHO 2006 LMS z-scores for weight, length/height and head
 *    circumference, 0–60 months (src/lib/who-growth-lms.ts). percentile (existing) is a
 *    statistics tool; bmi-child-teen (existing) is CDC BMI-for-age 2–20 y.
 *  - corrected-age = a premature baby's age adjusted for weeks born early. age-calculator and
 *    chronological-age (existing) don't correct for prematurity in days/weeks like this.
 *  - contact-lens-vertex = spectacle → contact lens power at the cornea, Fc = F ÷ (1 − dF).
 *    vertex-form (existing) is a parabola.
 */

import { type TrvCalculator as Calc, InputError, num, pick, nfmt, sig, dayText, dateIn } from "./trv-core";
import { WHO_LMS, type LMS } from "./who-growth-lms";

const today = () => Math.floor(Date.now() / 86400000);
const show = (x: number, s = 4) => (Number.isFinite(x) ? nfmt(sig(x, s), 6).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") : "—");
const pl = (n: number, w: string) => `${nfmt(n)} ${w}${n === 1 ? "" : "s"}`;
const LB = 0.45359237;

/** Standard normal CDF (Abramowitz & Stegun 26.2.17, |error| < 7.5e-8). */
export function phi(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

// ------------------------------------------------------------------ LDL cholesterol
export const CH_UNITS = ["mg/dL", "mmol/L"];
export const ldlCholesterol: Calc = (v) => {
  const u = pick(v.unit, 2), tc0 = num(v.tc, 200), hdl0 = num(v.hdl, 50), tg0 = num(v.tg, 150);
  if (!(tc0 > 0) || !(hdl0 > 0) || !(tg0 > 0)) throw new InputError("Enter total cholesterol, HDL and triglycerides (above zero).");
  const tc = u === 1 ? tc0 * 38.67 : tc0, hdl = u === 1 ? hdl0 * 38.67 : hdl0, tg = u === 1 ? tg0 * 88.57 : tg0;
  if (hdl >= tc) throw new InputError("HDL can't be higher than total cholesterol.");
  const non = tc - hdl, fried = tc - hdl - tg / 5;
  const samp = tc / 0.948 - hdl / 0.971 - (tg / 8.56 + (tg * non) / 2140 - (tg * tg) / 16100) - 9.44;
  const ldl = tg <= 400 ? fried : samp;
  const cat = ldl < 100 ? "Optimal (below 100 mg/dL)" : ldl < 130 ? "Near optimal (100–129)" : ldl < 160 ? "Borderline high (130–159)" : ldl < 190 ? "High (160–189)" : "Very high (190 or more)";
  const both = (mg: number) => `${show(mg, 4)} mg/dL (${show(mg / 38.67, 3)} mmol/L)`;
  const r = tc / hdl;
  return {
    ldl: both(ldl),
    category: cat,
    friedewald: tg <= 400 ? both(fried) : "Not valid — triglycerides above 400 mg/dL",
    sampson: both(samp),
    nonhdl: `${both(non)} — goal below 130 mg/dL`,
    tchdl: `${show(r, 3)} — ${r < 3.5 ? "ideal (below 3.5)" : r < 5 ? "acceptable (below 5)" : "high (5 or more)"}`,
    tghdl: `${show(tg / hdl, 3)} (mg/dL units) — ${tg / hdl < 2 ? "ideal (below 2)" : tg / hdl < 4 ? "moderate" : "high (4 or more)"}`,
    ldlhdl: show(ldl / hdl, 3),
  };
};

// ------------------------------------------------------------------ MAP
export const meanArterialPressure: Calc = (v) => {
  const s = num(v.sbp, 120), d = num(v.dbp, 80);
  if (!(s > 0) || !(d > 0) || d >= s) throw new InputError("Enter systolic and diastolic pressure (systolic must be higher).");
  const map = d + (s - d) / 3, pp = s - d;
  return {
    map: `${show(map, 4)} mmHg`,
    pp: `${show(pp, 3)} mmHg${pp > 60 ? " (wide — over 60)" : pp < 25 ? " (narrow)" : ""}`,
    band: map < 65 ? "Below 65 mmHg — may not perfuse organs well" : map <= 100 ? "Normal range (70–100 mmHg)" : "Above 100 mmHg — high",
    alt: `${show(0.412 * s + 0.588 * d, 4)} mmHg (Meaney 0.412 × SBP + 0.588 × DBP)`,
    working: `${show(d)} + (${show(s)} − ${show(d)}) ÷ 3 = ${show(map, 4)}`,
  };
};

// ------------------------------------------------------------------ blood pressure
export const bloodPressure: Calc = (v) => {
  const rs: [number, number][] = [];
  for (const i of [1, 2, 3]) { const s = num(v[`s${i}`], 0), d = num(v[`d${i}`], 0); if (s > 0 && d > 0) rs.push([s, d]); }
  if (!rs.length) throw new InputError("Enter at least one reading (systolic and diastolic).");
  for (const [s, d] of rs) if (d >= s) throw new InputError("Systolic (top number) must be higher than diastolic.");
  const s = rs.reduce((a, r) => a + r[0], 0) / rs.length, d = rs.reduce((a, r) => a + r[1], 0) / rs.length, age = num(v.age, 40);
  let cat: string;
  if (s > 180 || d > 120) cat = "Hypertensive crisis (above 180/120) — get medical help now if you have symptoms";
  else if (s >= 140 || d >= 90) cat = "High blood pressure — stage 2 (140/90 or higher)";
  else if (s >= 130 || d >= 80) cat = "High blood pressure — stage 1 (130–139 / 80–89)";
  else if (s >= 120) cat = "Elevated (120–129 and below 80)";
  else if (s < 90 || d < 60) cat = "Low (below 90/60)";
  else cat = "Normal (below 120/80)";
  return {
    avg: `${Math.round(s)}/${Math.round(d)} mmHg`,
    category: cat,
    readings: `${pl(rs.length, "reading")} averaged`,
    map: `${show(d + (s - d) / 3, 4)} mmHg`,
    pp: `${show(s - d, 3)} mmHg`,
    age: age < 13 ? "Under 13: these adult cut-offs don't apply — children are classified by percentile for age, sex and height (AAP 2017)" : age >= 65 ? "65+: many guidelines aim for below 130/80 if tolerated" : "Adult categories (AHA/ACC 2017) apply",
  };
};

// ------------------------------------------------------------------ ANC
export const absoluteNeutrophil: Calc = (v) => {
  const wbc = num(v.wbc, 6), segs = num(v.segs, 55), bands = Math.max(0, num(v.bands, 3)), eos = Math.max(0, num(v.eos, 2));
  if (!(wbc > 0)) throw new InputError("Enter the white blood cell count (×10³/µL).");
  if (segs < 0 || segs + bands + eos > 100) throw new InputError("Percentages can't add up to more than 100%.");
  const anc = wbc * 1000 * (segs + bands) / 100, aec = wbc * 1000 * eos / 100;
  return {
    anc: `${nfmt(Math.round(anc))} cells/µL`,
    grade: anc >= 1500 ? "Normal (1,500 or more)" : anc >= 1000 ? "Mild neutropenia (1,000–1,499)" : anc >= 500 ? "Moderate neutropenia (500–999)" : "Severe neutropenia (below 500) — high infection risk",
    aec: `${nfmt(Math.round(aec))} cells/µL — ${aec < 500 ? "normal (below 500)" : aec < 1500 ? "mild eosinophilia" : aec < 5000 ? "moderate eosinophilia" : "severe eosinophilia"}`,
    working: `${show(wbc)} × 1,000 × (${show(segs)}% + ${show(bands)}%) = ${nfmt(Math.round(anc))}`,
  };
};

// ------------------------------------------------------------------ cardiac output
export const CO_MODES = ["Heart rate × stroke volume", "Fick (oxygen)"];
export const cardiacOutput: Calc = (v) => {
  const mode = pick(v.mode, 2), h = num(v.height, 175), w = num(v.weight, 75);
  if (!(h > 0) || !(w > 0)) throw new InputError("Enter height (cm) and weight (kg) for body surface area.");
  const bsa = Math.sqrt((h * w) / 3600);
  let co: number, working: string;
  if (mode === 0) {
    const hr = num(v.hr, 70), sv = num(v.sv, 70);
    if (!(hr > 0) || !(sv > 0)) throw new InputError("Enter heart rate and stroke volume.");
    co = (hr * sv) / 1000; working = `${show(hr)} bpm × ${show(sv)} mL = ${show(co, 3)} L/min`;
  } else {
    const vo2in = num(v.vo2, 0), vo2 = vo2in > 0 ? vo2in : 125 * bsa, hb = num(v.hb, 14), sa = num(v.sao2, 98) / 100, sv = num(v.svo2, 70) / 100;
    if (!(hb > 0) || !(sa > sv)) throw new InputError("Enter haemoglobin, and arterial saturation higher than venous.");
    co = vo2 / ((sa - sv) * hb * 1.34 * 10); working = `${show(vo2, 4)} mL/min ÷ [(${show(sa * 100)}% − ${show(sv * 100)}%) × ${show(hb)} × 1.34 × 10] = ${show(co, 3)} L/min${vo2in > 0 ? "" : " (VO₂ estimated as 125 mL/min/m²)"}`;
  }
  const ci = co / bsa;
  return {
    co: `${show(co, 3)} L/min`,
    ci: `${show(ci, 3)} L/min/m²`,
    band: `${co < 4 ? "Low" : co <= 8 ? "Normal" : "High"} output (normal 4–8 L/min); index ${ci < 2.5 ? "low" : ci <= 4 ? "normal" : "high"} (normal 2.5–4)`,
    bsa: `${show(bsa, 3)} m² (Mosteller)`,
    working,
  };
};

// ------------------------------------------------------------------ HOMA-IR
export const HOMA_UNITS = ["mg/dL", "mmol/L"];
export const homaIr: Calc = (v) => {
  const u = pick(v.unit, 2), g = num(v.glucose, 95), ins = num(v.insulin, 10);
  if (!(g > 0) || !(ins > 0)) throw new InputError("Enter fasting glucose and fasting insulin (above zero).");
  const gm = u === 0 ? g / 18.016 : g, ir = (gm * ins) / 22.5, beta = gm > 3.5 ? (20 * ins) / (gm - 3.5) : NaN;
  return {
    ir: show(ir, 3),
    band: ir < 1 ? "Below 1 — very insulin sensitive" : ir < 2 ? "1–1.9 — normal" : ir < 2.9 ? "2–2.9 — early insulin resistance likely" : "2.9 or more — significant insulin resistance",
    beta: Number.isFinite(beta) ? `${show(beta, 3)}% (HOMA-%B, β-cell function)` : "— (needs glucose above 3.5 mmol/L)",
    quicki: show(1 / (Math.log10(ins) + Math.log10(gm * 18.016)), 3),
    working: `${show(gm * 18.016, 4)} mg/dL × ${show(ins)} µU/mL ÷ 405 = ${show(ir, 3)}`,
  };
};

// ------------------------------------------------------------------ QTc
export const QT_SEX = ["Male", "Female"];
export const QT_RATE = ["Heart rate (bpm)", "RR interval (ms)"];
export const qtc: Calc = (v) => {
  const qt = num(v.qt, 400), rateMode = pick(v.rateMode, 2), x = num(v.rate, 75), fem = pick(v.sex, 2) === 1;
  if (!(qt > 0) || !(x > 0)) throw new InputError("Enter the QT interval and the heart rate (or RR interval).");
  const rr = rateMode === 0 ? 60 / x : x / 1000, hr = 60 / rr;
  const baz = qt / Math.sqrt(rr), fri = qt / Math.cbrt(rr), fra = qt + 154 * (1 - rr), hod = qt + 1.75 * (hr - 60);
  const lim = fem ? 460 : 450;
  return {
    bazett: `${Math.round(baz)} ms`,
    fridericia: `${Math.round(fri)} ms`,
    framingham: `${Math.round(fra)} ms`,
    hodges: `${Math.round(hod)} ms`,
    band: fri > 500 || baz > 500 ? "Above 500 ms — markedly prolonged (high torsades risk)" : fri > lim ? `Prolonged (above ${lim} ms for ${fem ? "women" : "men"})` : fri < 350 ? "Short (below 350 ms)" : "Normal",
    rr: `RR ${Math.round(rr * 1000)} ms, heart rate ${show(hr, 3)} bpm`,
  };
};

// ------------------------------------------------------------------ contact lens vertex
const q = (x: number) => Math.round(x * 4) / 4;
const sgn = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toFixed(2)}`;
export const contactLensVertex: Calc = (v) => {
  const sph = num(v.sphere, -5), cyl = num(v.cyl, 0), axis = Math.round(num(v.axis, 180)), d = num(v.vertex, 12) / 1000;
  if (d < 0 || d > 0.025) throw new InputError("Vertex distance is usually 10–14 mm.");
  const conv = (f: number) => f / (1 - d * f);
  const m1 = conv(sph), m2 = conv(sph + cyl), cs = m1, cc = m2 - m1;
  const rx = cyl ? `${sgn(q(cs))} ${sgn(q(cc))} × ${axis}` : `${sgn(q(cs))}`;
  return {
    rx: rx + " D",
    exact: `${sgn(cs)}${cyl ? ` ${sgn(cc)} × ${axis}` : ""} D (unrounded)`,
    needed: Math.abs(sph) >= 4 || Math.abs(sph + cyl) >= 4 ? "Yes — at ±4.00 D or more the vertex distance changes the power" : "Hardly — below ±4.00 D the change is under 0.25 D",
    meridians: `${sgn(sph)} → ${sgn(m1)} and ${sgn(sph + cyl)} → ${sgn(m2)}`,
    note: cyl ? "Soft toric lenses come in limited cylinder steps (often −0.75, −1.25, −1.75, −2.25)." : "Spherical lenses usually come in 0.25 D steps (0.50 D above ±6).",
  };
};

// ------------------------------------------------------------------ baby growth percentile
export const GR_SEX = ["Boy", "Girl"];
export const GR_UNITS = ["Metric (kg, cm)", "US (lb, in)"];
function lmsAt(t: LMS[], m: number): LMS {
  const i = Math.min(59, Math.floor(m)), f = m - i, a = t[i], b = t[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
function zLms(x: number, [L, M, S]: LMS) { return Math.abs(L) < 1e-9 ? Math.log(x / M) / S : ((x / M) ** L - 1) / (L * S); }
const ord = (n: number) => { const r = n % 100; return `${n}${r >= 11 && r <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`; };
const pctText = (z: number) => { const p = phi(z) * 100; return p < 0.5 ? `below the 1st percentile (${show(p, 2)}%)` : p > 99.5 ? "above the 99th percentile" : `${ord(Math.round(p))} percentile`; };
export const babyGrowth: Calc = (v) => {
  const sex = pick(v.sex, 2) === 0 ? "boy" : "girl", m = num(v.months, 6), us = pick(v.units, 2) === 1;
  if (m < 0 || m > 60) throw new InputError("Age must be between 0 and 60 months (WHO standards).");
  const wt = num(v.weight, 0) * (us ? LB : 1), len = num(v.length, 0) * (us ? 2.54 : 1), hc = num(v.head, 0) * (us ? 2.54 : 1);
  if (!(wt > 0) && !(len > 0) && !(hc > 0)) throw new InputError("Enter at least one measurement.");
  const one = (x: number, k: "weight" | "length" | "head", unit: string) => {
    if (!(x > 0)) return "—";
    const p = lmsAt(WHO_LMS[k][sex], m), z = zLms(x, p);
    return `${pctText(z)} (z = ${z.toFixed(2)}; median ${show(p[1], 4)} ${unit})`;
  };
  let flag = "Within the usual range (3rd–97th percentile)";
  for (const [x, k] of [[wt, "weight"], [len, "length"], [hc, "head"]] as const) if (x > 0) { const z = zLms(x, lmsAt(WHO_LMS[k][sex], m)); if (z < -1.881 || z > 1.881) flag = "One or more measurements is outside the 3rd–97th percentile — ask your paediatrician"; }
  return {
    weight: one(wt, "weight", "kg"),
    length: one(len, "length", "cm"),
    head: one(hc, "head", "cm"),
    flag,
    age: `${show(m, 3)} months, ${sex}`,
  };
};

// ------------------------------------------------------------------ corrected age
const ageText = (days: number) => { const w = Math.floor(days / 7), mo = Math.floor(days / 30.4375); return `${pl(w, "week")} ${days % 7 ? `${pl(days % 7, "day")} ` : ""}(about ${pl(mo, "month")})`; };
export const correctedAge: Calc = (v) => {
  const b = dateIn(v, "birth", today() - 120), now = dateIn(v, "asof", today()), gw = num(v.gaWeeks, 32), gd = Math.max(0, Math.min(6, Math.round(num(v.gaDays, 0))));
  if (b > now) throw new InputError("The birth date is after the 'as of' date.");
  if (gw < 22 || gw > 42) throw new InputError("Gestational age at birth should be 22–42 weeks.");
  const gaDays = gw * 7 + gd, prem = Math.max(0, 280 - gaDays), chrono = now - b, corr = chrono - prem, pma = gaDays + chrono;
  return {
    corrected: corr < 0 ? `Not yet at due date — ${pl(-corr, "day")} to go (postmenstrual age ${Math.floor(pma / 7)}w ${pma % 7}d)` : ageText(corr),
    chrono: ageText(chrono),
    early: prem > 0 ? `${Math.floor(prem / 7)} weeks ${prem % 7} days early (born at ${gw}w ${gd}d)` : "Born at term — no correction needed",
    due: dayText(b + prem),
    pma: `${Math.floor(pma / 7)} weeks ${pma % 7} days`,
    note: "Use corrected age for growth and milestones until about 2 years (24 months chronological age).",
  };
};

// ------------------------------------------------------------------ breast milk intake
export const BM_UNITS = ["lb", "kg"];
export const BM_TYPES = ["Breast milk (expressed)", "Infant formula"];
export const breastMilk: Calc = (v) => {
  const w = num(v.weight, 10), lb = pick(v.unit, 2) === 0 ? w : w / LB, feeds = num(v.feeds, 8), type = pick(v.type, 2);
  if (!(lb > 0) || !(feeds > 0)) throw new InputError("Enter the baby's weight and feeds per day.");
  const capped = lb * 2.5 > 32, oz = Math.min(lb * 2.5, 32), ml = oz * 29.5735;
  return {
    perFeed: `${show(oz / feeds, 3)} oz (${Math.round(ml / feeds)} mL) per feed`,
    daily: `${show(oz, 3)} oz (${Math.round(ml)} mL) per day`,
    rule: capped ? "Capped at 32 oz a day — most babies don't need more" : "About 2.5 oz per lb of body weight a day (≈ 150 mL/kg)",
    type: type === 0 ? "Breastfed babies usually level off at about 25–35 oz a day from 1 to 6 months, even as they grow." : "Formula-fed babies usually take up to 32 oz a day; follow hunger cues.",
    weight: `${show(lb, 4)} lb (${show(lb * LB, 4)} kg)`,
  };
};

export const bigMed2CustomCalculators: Record<string, Calc> = {
  "ldl-cholesterol-calculator": ldlCholesterol,
  "mean-arterial-pressure-calculator": meanArterialPressure,
  "blood-pressure-calculator": bloodPressure,
  "absolute-neutrophil-count-calculator": absoluteNeutrophil,
  "cardiac-output-calculator": cardiacOutput,
  "homa-ir-calculator": homaIr,
  "qtc-calculator": qtc,
  "contact-lens-vertex-calculator": contactLensVertex,
  "baby-growth-percentile-calculator": babyGrowth,
  "corrected-age-calculator": correctedAge,
  "breast-milk-intake-calculator": breastMilk,
};
