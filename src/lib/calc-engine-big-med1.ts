/**
 * Batch: big generic keyword check (16 Nov 2026, Claude outputs/Big_Generic_Keyword_Check.md),
 * medical part 1 — nine Health > Sleep & Medical tools: drug dosage, prescription refill,
 * medication schedule, IV drip rate, insulin dose, adjusted body weight, blood sugar converter,
 * pack-years and blood donation eligibility.
 *
 * Near-namesakes kept apart on purpose:
 *  - drug-dosage = HUMAN dose: mg/kg × weight (or a fixed mg dose) → mL from the liquid strength,
 *    with a per-dose cap. vet-dosage (existing) is for pets with drug-specific ranges.
 *  - prescription-refill = days' supply, run-out date and earliest refill date of a fill.
 *    medication-schedule = the clock times of each dose in a day. Neither gives dosing advice.
 *  - adjusted-body-weight = IBW + 0.4 × (actual − IBW) for drug dosing. ideal-weight (existing)
 *    shows several IBW formulas but no adjusted weight.
 *  - blood-sugar-converter = glucose mmol/L ↔ mg/dL. gmi (existing) estimates HbA1c from a CGM mean.
 *
 * Dates arrive as whole days since 1970-01-01 UTC; clock times as text ("08:00").
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, nfmt, sig, dayText, dateIn, parseClock, clockText } from "./trv-core";

const today = () => Math.floor(Date.now() / 86400000);
const show = (x: number, s = 4) => (Number.isFinite(x) ? nfmt(sig(x, s), 6).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") : "—");
const pl = (n: number, w: string) => `${nfmt(n)} ${w}${n === 1 ? "" : "s"}`;
const LB = 0.45359237;
const FREQ_N = [1, 2, 3, 4, 6];
export const drugDosage: Calc = (v) => {
  const mode = pick(v.mode, 3), conc = num(v.concMg, 250), per = num(v.concMl, 5);
  if (!(conc > 0) || !(per > 0)) throw new InputError("Enter the liquid strength, e.g. 250 mg per 5 mL.");
  const mgPerMl = conc / per, n = FREQ_N[pick(v.freq, FREQ_N.length)], cap = Math.max(0, num(v.maxDose, 0));
  let dose: number, working: string, weight = "—";
  if (mode === 0) {
    const w = num(v.weight, 20), kg = pick(v.wunit, 2) === 1 ? w * LB : w, mgkg = num(v.mgkg, 15);
    if (!(kg > 0) || !(mgkg > 0)) throw new InputError("Enter a body weight and a dose in mg/kg above zero.");
    const perDay = pick(v.basis, 2) === 1;
    dose = perDay ? (mgkg * kg) / n : mgkg * kg;
    weight = `${show(kg, 4)} kg (${show(kg / LB, 4)} lb)`;
    working = perDay ? `${show(mgkg)} mg/kg/day × ${show(kg)} kg = ${show(mgkg * kg)} mg/day ÷ ${n} doses = ${show(dose)} mg per dose` : `${show(mgkg)} mg/kg × ${show(kg)} kg = ${show(dose)} mg per dose`;
  } else if (mode === 1) {
    dose = num(v.doseMg, 500);
    if (!(dose > 0)) throw new InputError("Enter the dose in mg.");
    working = `${show(dose)} mg ÷ ${show(mgPerMl)} mg/mL = ${show(dose / mgPerMl)} mL`;
  } else {
    const ml = num(v.doseMl, 5);
    if (!(ml > 0)) throw new InputError("Enter the volume in mL.");
    dose = ml * mgPerMl;
    working = `${show(ml)} mL × ${show(mgPerMl)} mg/mL = ${show(dose)} mg`;
  }
  let capped = "No maximum entered";
  if (cap > 0) { if (dose > cap) { capped = `Capped: the calculated ${show(dose)} mg is above the ${show(cap)} mg maximum, so ${show(cap)} mg is used`; dose = cap; } else capped = `Within the ${show(cap)} mg maximum per dose`; }
  const ml = dose / mgPerMl;
  return {
    dose: `${show(dose)} mg`,
    volume: `${show(ml, 3)} mL`,
    tsp: `${show(ml / 4.92892, 3)} teaspoons (1 tsp = 5 mL dosing spoon: ${show(ml / 5, 3)})`,
    daily: `${show(dose * n)} mg per day (${show(ml * n, 3)} mL) in ${pl(n, "dose")}`,
    strength: `${show(mgPerMl)} mg/mL`,
    weight,
    cap: capped,
    working,
  };
};
const RX_PCT = [0.75, 0.8, 0.85, 0.9, 1];
export const prescriptionRefill: Calc = (v) => {
  const qty = num(v.qty, 30), perDose = num(v.perDose, 1), doses = num(v.doses, 1), fill = dateIn(v, "fill", today()), refills = Math.max(0, Math.round(num(v.refills, 0)));
  if (!(qty > 0) || !(perDose > 0) || !(doses > 0)) throw new InputError("Enter the quantity, the amount per dose and the doses per day (all above zero).");
  const daily = perDose * doses, supply = qty / daily, whole = Math.floor(supply + 1e-9), p = RX_PCT[pick(v.rule, RX_PCT.length)];
  const runOut = fill + whole, early = fill + Math.ceil(whole * p - 1e-9), last = fill + whole * (refills + 1);
  return {
    supply: `${show(supply, 4)} days`,
    runout: `${dayText(runOut)} (last dose on ${dayText(runOut - 1)})`,
    refill: `${dayText(early)} — ${pl(early - fill, "day")} after filling (${Math.round(p * 100)}% of the supply used)`,
    daily: `${show(daily)} per day`,
    leftover: Math.abs(supply - whole) > 1e-9 ? `${show(qty - whole * daily)} left over after ${pl(whole, "full day")}` : "None",
    total: refills > 0 ? `${pl(refills, "refill")}: covered until ${dayText(last)} (${pl(whole * (refills + 1), "day")})` : "No refills entered",
  };
};

// ------------------------------------------------------------------ medication schedule
export const MS_PLANS = ["Every 4 hours", "Every 6 hours", "Every 8 hours", "Every 12 hours", "Once a day (every 24 hours)", "2 times a day (while awake)", "3 times a day (while awake)", "4 times a day (while awake)"];
const MS_EVERY = [4, 6, 8, 12, 24];
export const medicationSchedule: Calc = (v) => {
  const plan = pick(v.plan, MS_PLANS.length), first = parseClock(txt(v, "first") || "08:00", "First dose");
  let times: number[];
  let note: string;
  if (plan < 5) {
    const h = MS_EVERY[plan];
    times = Array.from({ length: 24 / h }, (_, i) => first + i * h * 60);
    note = `Every ${h} hours around the clock — ${24 / h} doses in 24 hours`;
  } else {
    const n = plan - 3, bed = parseClock(txt(v, "bed") || "22:00", "Bedtime");
    let span = bed - first; if (span <= 0) span += 1440;
    if (span < 60 * (n - 1)) throw new InputError("The time from the first dose to bedtime is too short for that many doses.");
    const gap = span / (n - 1);
    times = Array.from({ length: n }, (_, i) => first + Math.round((i * gap) / 15) * 15);
    note = `${n} doses spread over your waking hours, about every ${show(gap / 60, 3)} hours (rounded to 15 minutes)`;
  }
  const days = Math.max(1, Math.min(30, Math.round(num(v.days, 1))));
  return {
    times: times.map((t) => clockText(t)).join(", "),
    count: `${pl(times.length, "dose")} a day${days > 1 ? `, ${pl(times.length * days, "dose")} over ${pl(days, "day")}` : ""}`,
    pattern: note,
    next: `After the last dose at ${clockText(times[times.length - 1])}, the next is ${clockText(plan < 5 ? times[0] + 1440 : times[0] + 1440)} the next day`,
  };
};
const IV_F = [10, 15, 20, 60];
export const ivDripRate: Calc = (v) => {
  const vol = num(v.volume, 1000), mins = num(v.hours, 8) * 60 + num(v.minutes, 0), f = IV_F[pick(v.factor, IV_F.length)];
  if (!(vol > 0) || !(mins > 0)) throw new InputError("Enter the volume and the infusion time (above zero).");
  const mlhr = (vol / mins) * 60, gtt = (vol * f) / mins;
  return {
    gtt: `${nfmt(Math.round(gtt))} gtt/min (exact ${show(gtt, 4)})`,
    mlhr: `${show(mlhr, 4)} mL/hr`,
    sec: `1 drop every ${show(60 / gtt, 3)} seconds (${nfmt(Math.round(gtt / 4))} drops per 15 seconds)`,
    drops: `${nfmt(Math.round(vol * f))} drops in total`,
    working: `${show(vol)} mL × ${f} gtt/mL ÷ ${show(mins)} min = ${show(gtt, 4)} gtt/min`,
  };
};

// ------------------------------------------------------------------ insulin dose
export const INS_UNITS = ["mg/dL", "mmol/L"];
export const insulinDose: Calc = (v) => {
  const u = pick(v.unit, 2), carbs = Math.max(0, num(v.carbs, 60)), bg = num(v.bg, 180), tgt = num(v.target, 120), iob = Math.max(0, num(v.iob, 0)), tdd = Math.max(0, num(v.tdd, 0));
  let icr = num(v.icr, 10), isf = num(v.isf, 50), est = "Using the ratios you entered";
  if (tdd > 0) { icr = 500 / tdd; isf = u === 0 ? 1800 / tdd : 100 / tdd; est = `Estimated from a total daily dose of ${show(tdd)} units: ICR = 500 ÷ TDD = ${show(icr, 3)} g/unit, ISF = ${u === 0 ? "1800" : "100"} ÷ TDD = ${show(isf, 3)} ${INS_UNITS[u]}/unit`; }
  if (!(icr > 0) || !(isf > 0)) throw new InputError("Enter an insulin-to-carb ratio and a correction factor above zero (or a total daily dose).");
  const meal = carbs / icr, corr = (bg - tgt) / isf, total = Math.max(0, meal + corr - iob);
  return {
    total: `${show(Math.round(total * 2) / 2, 4)} units (rounded to ½ unit; exact ${show(total, 3)})`,
    meal: `${show(meal, 3)} units (${show(carbs)} g ÷ ${show(icr, 3)} g/unit)`,
    correction: `${corr >= 0 ? "" : "−"}${show(Math.abs(corr), 3)} units ((${show(bg)} − ${show(tgt)}) ÷ ${show(isf, 3)})`,
    iob: iob > 0 ? `−${show(iob, 3)} units already active` : "None entered",
    ratios: est,
    warning: bg < (u === 0 ? 70 : 3.9) ? "Blood sugar is LOW — treat the low first and don't take a correction dose." : "Always use the doses and ratios set by your diabetes team.",
  };
};
export const adjustedBodyWeight: Calc = (v) => {
  const h = num(v.height, 170), hin = pick(v.hunit, 2) === 1 ? h : h / 2.54, w = num(v.weight, 110), kg = pick(v.wunit, 2) === 1 ? w * LB : w, f = num(v.factor, 0.4), male = pick(v.sex, 2) === 0;
  if (!(hin > 0) || !(kg > 0)) throw new InputError("Enter height and weight above zero.");
  if (f < 0.2 || f > 0.6) throw new InputError("The correction factor is usually 0.4 (range 0.25–0.5).");
  const ibw = Math.max(1, (male ? 50 : 45.5) + 2.3 * (hin - 60)), abw = ibw + f * (kg - ibw), ratio = kg / ibw, bmi = kg / (hin * 0.0254) ** 2;
  const use = ratio > 1.2 ? `Adjusted body weight (${show(abw, 4)} kg) — actual weight is more than 120% of ideal` : ratio < 1 ? `Actual body weight (${show(kg, 4)} kg) — below ideal weight` : `Ideal body weight (${show(ibw, 4)} kg) — actual is within 100–120% of ideal`;
  return {
    abw: `${show(abw, 4)} kg (${show(abw / LB, 4)} lb)`,
    ibw: `${show(ibw, 4)} kg (${show(ibw / LB, 4)} lb) — Devine formula`,
    pct: `${show(ratio * 100, 3)}% of ideal body weight`,
    use,
    bmi: `${show(bmi, 3)} kg/m²`,
    working: `${show(ibw, 4)} + ${f} × (${show(kg, 4)} − ${show(ibw, 4)}) = ${show(abw, 4)} kg`,
  };
};
export const bloodSugarConverter: Calc = (v) => {
  const d = pick(v.dir, 2), x = num(v.value, 5.5), when = pick(v.when, 3);
  if (!(x > 0)) throw new InputError("Enter a glucose reading above zero.");
  const mg = d === 0 ? x * 18.016 : x, mmol = mg / 18.016;
  let band: string;
  if (mg < 54) band = "Very low (level 2 hypoglycaemia, below 54 mg/dL / 3.0 mmol/L)";
  else if (mg < 70) band = "Low (below 70 mg/dL / 3.9 mmol/L)";
  else if (when === 0) band = mg < 100 ? "Normal fasting (70–99 mg/dL)" : mg < 126 ? "Prediabetes range fasting (100–125 mg/dL)" : "Diabetes range fasting (126 mg/dL or more, if repeated)";
  else if (when === 1) band = mg < 140 ? "Normal after a meal (below 140 mg/dL)" : mg < 200 ? "Prediabetes range after a meal (140–199 mg/dL)" : "Diabetes range after a meal (200 mg/dL or more)";
  else band = mg < 200 ? "Below the 200 mg/dL random-glucose diabetes threshold" : "200 mg/dL or more (diabetes range with symptoms)";
  return {
    result: d === 0 ? `${show(mg, 4)} mg/dL` : `${show(mmol, 3)} mmol/L`,
    both: `${show(mmol, 3)} mmol/L = ${show(mg, 4)} mg/dL`,
    band,
    factor: "1 mmol/L of glucose = 18.016 mg/dL (molar mass 180.16 g/mol)",
  };
};
export const packYears: Calc = (v) => {
  const u = pick(v.unit, 2), amt = num(v.amount, 1), per = num(v.perPack, 20), yrs = num(v.years, 20), age = num(v.age, 55), st = pick(v.status, 2), quit = Math.max(0, num(v.quit, 0));
  if (!(amt > 0) || !(yrs > 0) || !(per > 0)) throw new InputError("Enter how much and how many years you smoked (above zero).");
  const ppd = u === 0 ? amt : amt / per, py = ppd * yrs;
  const elig = age >= 50 && age <= 80 && py >= 20 && (st === 0 || quit <= 15);
  const why = age < 50 || age > 80 ? "age is outside 50–80" : py < 20 ? "fewer than 20 pack-years" : st === 1 && quit > 15 ? "quit more than 15 years ago" : "";
  return {
    py: `${show(py, 4)} pack-years`,
    cigs: `${nfmt(Math.round(ppd * per * 365.25 * yrs))} cigarettes in total`,
    ppd: `${show(ppd, 3)} packs (${show(ppd * per, 3)} cigarettes) a day`,
    screening: elig ? "Meets the USPSTF 2021 criteria for a yearly low-dose CT lung cancer screening — ask your doctor" : `Doesn't meet the USPSTF 2021 lung screening criteria (${why})`,
    working: `${show(ppd, 3)} packs/day × ${show(yrs)} years = ${show(py, 4)} pack-years`,
  };
};

// ------------------------------------------------------------------ blood donation eligibility
export const BD_TYPES = ["Whole blood", "Power Red (double red cells)", "Platelets", "Plasma (AB Elite)", "Plasma (paid plasma centre)"];
const BD_DAYS = [56, 112, 7, 28, 2];
const BD_MAX = ["6 times a year", "3 times a year", "24 times a year", "13 times a year", "up to 2 times in 7 days (FDA)"];
export const bloodDonation: Calc = (v) => {
  const t = pick(v.type, BD_TYPES.length), last = dateIn(v, "last", today() - 30), now = dateIn(v, "asof", today());
  const next = last + BD_DAYS[t], wait = next - now;
  return {
    next: dayText(next),
    wait: wait <= 0 ? "You can donate now" : `${pl(wait, "day")} to go`,
    interval: `${BD_TYPES[t]}: wait at least ${pl(BD_DAYS[t], "day")} between donations`,
    max: `Up to ${BD_MAX[t]}`,
    note: "Intervals are the American Red Cross / FDA minimums. Other countries differ (UK: 12 weeks men, 16 weeks women for whole blood).",
  };
};

export const bigMed1CustomCalculators: Record<string, Calc> = {
  "drug-dosage-calculator": drugDosage,
  "prescription-refill-calculator": prescriptionRefill,
  "medication-schedule-calculator": medicationSchedule,
  "iv-drip-rate-calculator": ivDripRate,
  "insulin-dose-calculator": insulinDose,
  "adjusted-body-weight-calculator": adjustedBodyWeight,
  "blood-sugar-converter-calculator": bloodSugarConverter,
  "pack-year-calculator": packYears,
  "blood-donation-eligibility-calculator": bloodDonation,
};
