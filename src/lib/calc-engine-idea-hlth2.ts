/**
 * Idea build, batch hlth2 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Health > Heart & Blood (3) + Body & Wellness (7) = 10 tools.
 * Sources: 2017 ACC/AHA blood pressure categories (normal < 120/80; elevated 120–129/< 80; stage 1 130–139 or 80–89; stage 2 ≥ 140 or ≥ 90;
 * crisis > 180 and/or > 120); non-HDL = total − HDL (NCEP ATP III goal = LDL goal + 30 mg/dL); cholesterol 1 mmol/L = 38.67 mg/dL,
 * triglycerides 1 mmol/L = 88.57 mg/dL; BMI Prime = BMI ÷ 25; Ponderal (Rohrer) index = kg ÷ m³ (adults ~11–15, newborns 2.2–3.0 g/cm³ ×
 * 100); CDC/WHO smoking-cessation benefits timeline; Hansraj (2014) head-forward neck load (0° ≈ 10–12 lb, 15° 27 lb, 30° 40 lb, 45° 49 lb,
 * 60° 60 lb); typical reading-glasses strength by age; Fitzpatrick skin phototype scale. Informational only — not a diagnosis.
 */

import { type TrvCalculator as Calc, InputError, num, pick, dateIn, dayText } from "./trv-core";
import { txt, fmt } from "./sci-math-core";

const f = (x: number) => fmt(Math.abs(x) < 1e-12 ? 0 : x, 4);
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const today = () => Math.floor(Date.now() / 86400000);
const bpCat = (s: number, d: number) => (s > 180 || d > 120 ? "Hypertensive crisis range — seek care now if you have symptoms" : s >= 140 || d >= 90 ? "Stage 2 hypertension" : s >= 130 || d >= 80 ? "Stage 1 hypertension" : s >= 120 ? "Elevated" : "Normal");

export const bpAvg: Calc = (v) => {
  const rows = (txt(v, "r") || "128/82, 124/80, 131/84, 126/79, 122/78, 129/81").split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).map((s) => s.match(/^(\d{2,3})\s*\/\s*(\d{2,3})/)).filter((m): m is RegExpMatchArray => !!m).map((m) => [Number(m[1]), Number(m[2])]);
  if (!rows.length) throw new InputError("Enter readings like 128/82, separated by commas.");
  const drop = pick(v.d, 2) === 0 && rows.length > 4 ? 2 : 0, use = rows.slice(drop), s = use.reduce((a, r) => a + r[0], 0) / use.length, d = use.reduce((a, r) => a + r[1], 0) / use.length;
  return { a: `Average ${f(Math.round(s))}/${f(Math.round(d))} mmHg from ${use.length} readings`, c: bpCat(s, d), note: `${drop ? "First 2 readings (day 1) left out, as home-monitoring protocols suggest · " : ""}Pulse pressure ${f(Math.round(s - d))} · AHA categories for adults · measure seated after 5 min rest, arm at heart level · share readings with your doctor` };
};
export const nonHdl: Calc = (v) => {
  const tc = P(v, "t", 210, "Total cholesterol"), hdl = P(v, "h", 50, "HDL"), mm = pick(v.u, 2) === 1, n = tc - hdl, mg = mm ? n * 38.67 : n;
  if (n < 0) throw new InputError("HDL can't be more than total cholesterol.");
  const band = mg < 130 ? "Desirable (under 130 mg/dL)" : mg < 160 ? "Above desirable (130–159)" : mg < 190 ? "Borderline high (160–189)" : mg < 220 ? "High (190–219)" : "Very high (220+)";
  return { n: `Non-HDL cholesterol ${f(Math.round(n * 10) / 10)} ${mm ? "mmol/L" : "mg/dL"}${mm ? ` (${f(Math.round(mg))} mg/dL)` : ""}`, b: band, note: `Total − HDL · ratio total/HDL ${f(Math.round((tc / hdl) * 10) / 10)} · non-HDL includes LDL, VLDL and remnants · targets depend on your overall risk — discuss with your doctor` };
};
export const cholConv: Calc = (v) => {
  const x = P(v, "x", 200, "Value"), t = pick(v.t, 2), dir = pick(v.d, 2), k = t === 0 ? 38.67 : 88.57;
  const out = dir === 0 ? x / k : x * k;
  return { r: dir === 0 ? `${f(x)} mg/dL = ${f(Math.round(out * 100) / 100)} mmol/L` : `${f(x)} mmol/L = ${f(Math.round(out))} mg/dL`, d: `${t === 0 ? "Cholesterol (total, LDL, HDL, non-HDL)" : "Triglycerides"} factor ${f(k)}`, note: "mg/dL is used in the US; mmol/L in the UK, Europe, Canada and Australia · glucose uses a different factor (18)" };
};
export const bmiPrime: Calc = (v) => {
  const w = P(v, "w", 75, "Weight"), h = P(v, "h", 175, "Height"), imp = pick(v.u, 2) === 1, kg = imp ? w * 0.453592 : w, m = (imp ? h * 2.54 : h) / 100, bmi = kg / (m * m), pr = bmi / 25;
  return { p: `BMI Prime ${pr.toFixed(2)} (BMI ${f(Math.round(bmi * 10) / 10)})`, r: pr < 0.74 ? "Underweight (< 0.74)" : pr < 1 ? "Normal (0.74–0.99)" : pr < 1.2 ? "Overweight (1.00–1.19)" : "Obese (1.20+)", note: `BMI Prime = BMI ÷ 25 — 1.00 is the top of the healthy range · ${pr > 1 ? `${f(Math.round((pr - 1) * 100))}% over` : `${f(Math.round((1 - pr) * 100))}% under`} the upper limit · BMI doesn't separate muscle from fat` };
};
export const ponderal: Calc = (v) => {
  const w = P(v, "w", 75, "Weight"), h = P(v, "h", 175, "Height"), imp = pick(v.u, 2) === 1, baby = pick(v.b, 2) === 1, kg = imp ? w * 0.453592 : w, m = (imp ? h * 2.54 : h) / 100, pi = kg / m ** 3;
  if (baby) { const g = ((kg * 1000) / (m * 100) ** 3) * 100; return { p: `Ponderal index ${g.toFixed(2)} g/cm³ ×100`, r: g < 2.2 ? "Low — may suggest growth restriction (ask your paediatrician)" : g <= 3 ? "Typical for a newborn (2.2–3.0)" : "High", note: "Newborn ponderal index = 100 × weight (g) ÷ length (cm)³ · informational only" }; }
  return { p: `Ponderal index ${f(Math.round(pi * 10) / 10)} kg/m³`, r: pi < 11 ? "Low" : pi <= 15 ? "Typical adult range (≈ 11–15)" : "High", note: "Rohrer's index scales with height³, so it treats very tall and short people more fairly than BMI · BMI for comparison " + f(Math.round((kg / (m * m)) * 10) / 10) };
};
const QUIT: [number, string][] = [[0.014, "20 minutes: heart rate and blood pressure start to drop"], [0.5, "12 hours: carbon monoxide in the blood returns to normal"], [14, "2 weeks–3 months: circulation and lung function improve"], [30, "1–9 months: coughing and shortness of breath decrease"], [365, "1 year: coronary heart disease risk about half that of a smoker"], [1825, "5 years: stroke risk can fall to that of a non-smoker"], [3650, "10 years: lung cancer death risk about half that of a smoker"], [5475, "15 years: heart disease risk similar to a non-smoker"]];
export const quitTimeline: Calc = (v) => {
  const d = dateIn(v, "d", today() - 45), cig = Math.max(0, num(v.c, 15)), price = Math.max(0, num(v.p, 10)), days = Math.max(0, today() - d);
  const done = QUIT.filter(([t]) => days >= t), next = QUIT.find(([t]) => days < t);
  return { m: done.length ? `Reached: ${done[done.length - 1][1]}` : "Your first milestones start within minutes", n: next ? `Next: ${next[1]} — on ${dayText(d + Math.ceil(next[0]))}` : "All major milestones reached", note: `${f(days)} days smoke-free since ${dayText(d)} · ${f(Math.round(days * cig))} cigarettes not smoked · ≈ $${f(Math.round((days * cig / 20) * price))} saved · timeline from CDC/WHO summaries; free help: 1-800-QUIT-NOW` };
};
export const neckLoad: Calc = (v) => {
  const a = Math.min(60, Math.max(0, num(v.a, 45))), hrs = Math.max(0, num(v.h, 4)), pts: [number, number][] = [[0, 11], [15, 27], [30, 40], [45, 49], [60, 60]];
  let lb = 60; for (let i = 0; i < pts.length - 1; i++) if (a <= pts[i + 1][0]) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; lb = y0 + ((a - x0) / (x1 - x0)) * (y1 - y0); break; }
  return { l: `≈ ${f(Math.round(lb))} lb (${f(Math.round(lb * 0.4536))} kg) of effective load on your neck`, d: `Head tilted ${f(a)}° forward · ${f(hrs)} h a day — about ${f(Math.round(lb / 11 * 10) / 10)}× the load of a neutral head`, note: "Estimates from Hansraj (2014) · raise the screen to eye level, take breaks every 20–30 min and do chin tucks · see a clinician for persistent pain" };
};
export const readers: Calc = (v) => {
  const age = Math.round(num(v.a, 50)), dist = pick(v.d, 3), base = age < 40 ? 0 : age < 45 ? 1 : age < 50 ? 1.5 : age < 55 ? 1.75 : age < 60 ? 2.25 : 2.5, adj = [0, -0.5, 0.5][dist];
  const p = Math.max(0, base + adj);
  return { s: p ? `Try about +${p.toFixed(2)} reading glasses` : "You probably don't need readers yet", d: `Age ${age} · ${["normal reading (40 cm)", "computer / arm's length (60 cm)", "close work (30 cm)"][dist]}`, note: "Typical starting strengths: 40–44 +1.00, 45–49 +1.25–1.50, 50–54 +1.75–2.00, 55–59 +2.25, 60+ +2.50 · test in store and get a full eye exam — readers don't correct astigmatism or eye disease" };
};
export const fitz: Calc = (v) => {
  const q = ["e", "h", "s", "b", "t", "x"].map((k) => Math.min(4, Math.max(0, Math.round(num(v[k], 1))))), sc = q.reduce((a, b) => a + b, 0), type = sc <= 4 ? 1 : sc <= 9 ? 2 : sc <= 14 ? 3 : sc <= 18 ? 4 : sc <= 22 ? 5 : 6;
  const d = ["", "Always burns, never tans", "Usually burns, tans minimally", "Sometimes mild burn, tans gradually", "Burns minimally, tans well", "Rarely burns, tans very easily", "Never burns, deeply pigmented"][type];
  return { t: `Fitzpatrick type ${["", "I", "II", "III", "IV", "V", "VI"][type]}`, d: `${d} · score ${sc}/24`, note: "Short self-check version of the Fitzpatrick scale · every skin type needs sun protection — SPF 30+ and skin checks; see a dermatologist for changing moles" };
};
export const hairDensity: Calc = (v) => {
  const c = P(v, "c", 180, "Hairs counted"), a = P(v, "a", 1, "Area (cm²)"), fu = Math.max(0, num(v.u, 0)), dens = c / a;
  return { d: `${f(Math.round(dens))} hairs per cm²`, r: dens < 120 ? "Low density" : dens < 200 ? "Medium density" : "High density", note: `${fu ? `${f(Math.round(fu / a))} follicular units/cm² · ${f(Math.round((c / fu) * 10) / 10)} hairs per unit · ` : ""}typical scalp density is ~120–200+ hairs/cm² · count with a dermatoscope or magnifier over a 1 cm² area · see a dermatologist for sudden shedding` };
};

// ---- registry (generated)
export const ideaHlth2CustomCalculators: Record<string, Calc> = {
  "blood-pressure-average-readings-calculator": bpAvg,
  "non-hdl-cholesterol-calculator": nonHdl,
  "cholesterol-mg-dl-to-mmol-l-calculator": cholConv,
  "bmi-prime-calculator": bmiPrime,
  "ponderal-index-calculator": ponderal,
  "smoking-quit-health-timeline-calculator": quitTimeline,
  "posture-screen-time-neck-load-calculator": neckLoad,
  "reading-glasses-strength-by-age-calculator": readers,
  "skin-type-fitzpatrick-calculator": fitz,
  "hair-density-calculator": hairDensity,
};
