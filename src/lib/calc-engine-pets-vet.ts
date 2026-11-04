/**
 * Batch: "Pets & Animals Calculators" → Vet Clinical & Toxicity Calculators.
 *
 * Data / methods:
 *  - Maintenance fluids: dogs 132 × kg^0.75 mL/day, cats 80 × kg^0.75 (AAHA 2013 fluid therapy
 *    guidelines); deficit = % dehydration × kg × 1,000 mL; anesthesia rate dogs 5, cats 3 mL/kg/h.
 *  - CRI: mg/h = dose × kg (× 60 / 1,000 for mcg/kg/min).
 *  - Body surface area: m² = K × weight(g)^(2/3) × 10⁻⁴, K = 10.1 dogs, 10.0 cats.
 *  - CPR drugs (RECOVER 2024): epinephrine low dose 0.01 mg/kg, atropine 0.04 mg/kg,
 *    vasopressin 0.8 U/kg, lidocaine 2 mg/kg (dogs), amiodarone 5 mg/kg, naloxone 0.04 mg/kg,
 *    flumazenil 0.01 mg/kg, atipamezole (equal volume to dexmedetomidine), defibrillation
 *    biphasic 2–4 J/kg.
 *  - Heartworm: AHS 2024 protocol, melarsomine 2.5 mg/kg IM (25 mg/mL) on days 60, 90 and 91.
 *  - Toxic doses (Merck Veterinary Manual, ASPCA APCC): theobromine + caffeine 20 / 40 / 60 mg/kg
 *    (mild / cardiac / seizures); caffeine 20 / 60 / 150 mg/kg; xylitol 0.1 g/kg hypoglycemia,
 *    0.5 g/kg liver failure; ibuprofen dogs 25 / 175 / 400 mg/kg (GI / kidney / CNS), cats half;
 *    cholecalciferol 0.1 mg/kg (≈ 4,000 IU/kg) concern, 0.5 mg/kg severe; bromethalin dogs
 *    ~1.75 mg/kg paralytic, ~5 mg/kg convulsant; onion ≥ 0.5% of body weight (5 g/kg),
 *    garlic ≈ 5× onion potency; raisins / grapes idiosyncratic (lowest reported raisin 2.8 g/kg).
 *  - Hydrogen peroxide 3%: 1 mL per lb (max 45 mL), dogs only.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-pets-vet-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pick = (v: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(safeNumber(v))));
const yes = (v: number) => Math.round(safeNumber(v)) === 1;
const DAY = 86400000;
const today = () => Math.floor(Date.now() / DAY);
const kgOf = (v: Record<string, number>) => (pick(v.weightUnit, 2) === 0 ? nonNeg(v.weight) * 0.45359237 : nonNeg(v.weight));
/** Risk band: 0 = below concern, 1 = mild, 2 = moderate, 3 = severe, 4 = potentially lethal. */
const band = (x: number, limits: number[]) => limits.filter((l) => x >= l).length;

// --- Clinical -------------------------------------------------------------------------------------------
export const vetDose: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const mg = kg * nonNeg(v.doseMgPerKg);
  const conc = nonNeg(v.concentration);
  const tab = nonNeg(v.tabletMg);
  const per = Math.max(1, Math.round(nonNeg(v.timesPerDay, 1)));
  return { doseMg: round2(mg), volumeMl: round2(conc > 0 ? mg / conc : 0), tablets: tab > 0 ? Math.round((mg / tab) * 4) / 4 : 0, dailyMg: round2(mg * per), totalCourseMg: round2(mg * per * nonNeg(v.days, 1)), weightKg: round2(kg) };
};

/** [label, default dose mg/kg, default concentration mg/mL] */
export const ANESTHESIA: [string, number, number][] = [["Dexmedetomidine (mcg→mg: 0.005 mg/kg)", 0.005, 0.5], ["Butorphanol", 0.2, 10], ["Methadone / hydromorphone", 0.1, 2], ["Ketamine", 3, 100], ["Midazolam", 0.2, 5], ["Propofol induction (to effect)", 4, 10], ["Alfaxalone induction (to effect)", 2, 10], ["Atropine", 0.04, 0.54]];
export const anesthesia: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const out: Record<string, number> = { weightKg: round2(kg) };
  for (let i = 1; i <= 4; i++) {
    const [, dDef, cDef] = ANESTHESIA[pick(v[`drug${i}`], ANESTHESIA.length)];
    const dose = nonNeg(v[`dose${i}`]) > 0 ? nonNeg(v[`dose${i}`]) : dDef;
    const conc = nonNeg(v[`conc${i}`]) > 0 ? nonNeg(v[`conc${i}`]) : cDef;
    out[`ml${i}`] = round2(conc > 0 ? (kg * dose) / conc : 0);
    out[`mg${i}`] = round2(kg * dose);
  }
  const fluid = kg * (pick(v.species, 2) === 0 ? 5 : 3);
  out.fluidRateMlPerHour = round2(fluid);
  out.fluidDropsPerMinute = round2((fluid * nonNeg(v.dripSet, 60)) / 60);
  return out;
};

/** [label, dose per kg, concentration per mL] (units: mg, except vasopressin U and joules). */
export const CPR_DRUGS: [string, number, number][] = [["Epinephrine (low dose)", 0.01, 1], ["Atropine", 0.04, 0.54], ["Vasopressin (U)", 0.8, 20], ["Lidocaine (dogs only)", 2, 20], ["Amiodarone", 5, 50], ["Naloxone", 0.04, 0.4], ["Flumazenil", 0.01, 0.1]];
export const emergencyDrugs: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const out: Record<string, number> = {};
  CPR_DRUGS.forEach(([, d, c], i) => { out[`ml${i}`] = round2((kg * d) / c); });
  out.epinephrineHighDoseMl = round2((kg * 0.1) / 1);
  out.defibJoulesLow = round2(kg * 2);
  out.defibJoulesHigh = round2(kg * 4);
  out.compressionsPerMinute = 110;
  out.weightKg = round2(kg);
  return out;
};

export const fluidRate: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const cat = pick(v.species, 2) === 1;
  const maint = (cat ? 80 : 132) * Math.pow(kg, 0.75);
  const deficit = (nonNeg(v.dehydrationPercent) / 100) * kg * 1000;
  const hours = Math.max(1, nonNeg(v.replaceHours, 24));
  const losses = nonNeg(v.ongoingLossesMlPerDay);
  const rate = maint / 24 + deficit / hours + losses / 24;
  const set = nonNeg(v.dripSet, 15);
  const gtt = (rate * set) / 60;
  return { totalRateMlPerHour: round2(rate), maintenanceMlPerDay: round2(maint), maintenanceMlPerHour: round2(maint / 24), deficitMl: round2(deficit), dropsPerMinute: round2(gtt), secondsPerDrop: round2(gtt > 0 ? 60 / gtt : 0), first24hTotalMl: round2(maint + Math.min(deficit, (deficit / hours) * 24) + losses) };
};

export const cri: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const mgPerHour = pick(v.doseUnit, 2) === 0 ? (nonNeg(v.dose) * kg * 60) / 1000 : nonNeg(v.dose) * kg;
  const conc = nonNeg(v.drugConcentration);
  const drugMlPerHour = conc > 0 ? mgPerHour / conc : 0;
  const bag = nonNeg(v.bagVolume);
  const fluidRate = nonNeg(v.fluidRateMlPerHour);
  const hoursInBag = fluidRate > 0 ? bag / fluidRate : 0;
  const mgToAdd = mgPerHour * hoursInBag;
  return { mgPerHour: round2(mgPerHour), drugMlPerHourNeat: round2(drugMlPerHour), mgToAddToBag: round2(mgToAdd), mlOfDrugToAddToBag: round2(conc > 0 ? mgToAdd / conc : 0), bagLastsHours: round2(hoursInBag), finalConcentrationMgPerMl: round2(bag > 0 ? mgToAdd / bag : 0) };
};

export const bsa: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const K = pick(v.species, 2) === 0 ? 10.1 : 10;
  const m2 = (K * Math.pow(kg * 1000, 2 / 3)) / 10000;
  return { bodySurfaceAreaM2: Math.round(m2 * 1000) / 1000, doseMg: round2(m2 * nonNeg(v.doseMgPerM2)), mgPerKgEquivalent: round2(kg > 0 ? (m2 * nonNeg(v.doseMgPerM2)) / kg : 0), weightKg: round2(kg) };
};

/** Oxygen delivery: [label, mL/kg/min, minimum L/min] */
export const O2_METHODS: [string, number, number][] = [["Nasal cannula / catheter", 75, 0.1], ["Flow-by (hose near nose)", 0, 2], ["Face mask", 150, 1], ["Non-rebreathing circuit (anesthesia, < 7 kg)", 200, 0.5], ["Rebreathing circle system (maintenance)", 30, 0.5], ["Oxygen cage / tent (initial)", 0, 5]];
export const oxygenFlow: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const [, perKg, min] = O2_METHODS[pick(v.method, O2_METHODS.length)];
  const lpm = Math.max(min, (perKg * kg) / 1000);
  return { flowLitersPerMinute: round2(lpm), flowMlPerMinute: Math.round(lpm * 1000), cylinderHoursEType: round2(lpm > 0 ? 680 / lpm / 60 : 0), weightKg: round2(kg) };
};

export const heartworm: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const d0 = safeNumber(v.diagnosisDate, today());
  const mg = kg * 2.5;
  const ml = mg / 25;
  const dox = kg * 10;
  return { melarsomineMlPerInjection: round2(ml), melarsomineMgPerInjection: round2(mg), doxycyclineMgTwiceDaily: round2(dox), firstInjectionDate: d0 + 60, secondInjectionDate: d0 + 90, thirdInjectionDate: d0 + 91, restrictExerciseUntil: d0 + 91 + 42, antigenRetestDate: d0 + 91 + 270, estimatedTreatmentCost: round2(nonNeg(v.costBase) + kg * nonNeg(v.costPerKg)) };
};

/** Resting heart rate ranges (bpm): [label, low, high]. */
export const HR_RANGES: [string, number, number][] = [["Puppy (under 1 year)", 120, 160], ["Toy / small dog", 90, 140], ["Medium dog", 70, 120], ["Large / giant dog", 60, 100], ["Cat", 140, 220]];
export const heartRate: CustomCalculator = (v) => {
  const [, lo, hi] = HR_RANGES[pick(v.size, HR_RANGES.length)];
  const secs = Math.max(1, nonNeg(v.countSeconds, 15));
  const bpm = (nonNeg(v.beatsCounted) * 60) / secs;
  const rr = (nonNeg(v.breathsCounted) * 60) / Math.max(1, nonNeg(v.breathSeconds, 30));
  return { heartRateBpm: Math.round(bpm), normalLow: lo, normalHigh: hi, status: bpm === 0 ? 0 : bpm < lo ? 1 : bpm > hi ? 3 : 2, restingBreathsPerMinute: Math.round(rr), breathingConcern: rr > 30 ? 1 : 0 };
};

export const vetProduction: CustomCalculator = (v) => {
  const production = nonNeg(v.annualProduction);
  const pay = production * (nonNeg(v.productionPercent, 20) / 100);
  const base = nonNeg(v.baseSalary);
  const earned = Math.max(base, pay);
  const days = Math.max(1, nonNeg(v.daysWorked, 220));
  return { annualCompensation: round2(earned), productionPay: round2(pay), bonusOverBase: round2(Math.max(0, pay - base)), productionToBreakEven: round2((base * 100) / Math.max(1, nonNeg(v.productionPercent, 20))), productionPerDay: round2(production / days), earningsPerDay: round2(earned / days), negativeAccrual: round2(Math.max(0, base - pay)) };
};

// --- Toxicity -------------------------------------------------------------------------------------------
/** Methylxanthines (theobromine + caffeine) mg per oz. */
export const CHOCOLATE: [string, number][] = [["White chocolate", 0.25], ["Milk chocolate", 64], ["Semisweet / dark (50–60%)", 150], ["Dark chocolate 70–85%", 230], ["Unsweetened baking chocolate", 440], ["Cocoa powder", 800], ["Cacao nibs / beans", 350], ["Cocoa bean mulch", 255]];
export const chocolate: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const oz = pick(v.amountUnit, 2) === 0 ? nonNeg(v.amount) : nonNeg(v.amount) / 28.3495;
  const mg = oz * CHOCOLATE[pick(v.chocolate, CHOCOLATE.length)][1];
  const dose = kg > 0 ? mg / kg : 0;
  const cat = pick(v.species, 2) === 1;
  const limits = cat ? [15, 30, 50, 80] : [20, 40, 60, 100];
  return { doseMgPerKg: round2(dose), riskLevel: band(dose, limits), methylxanthinesMg: round2(mg), mildSignsAtOz: round2((limits[0] * kg) / CHOCOLATE[pick(v.chocolate, CHOCOLATE.length)][1]), severeSignsAtOz: round2((limits[2] * kg) / CHOCOLATE[pick(v.chocolate, CHOCOLATE.length)][1]), weightKg: round2(kg) };
};

export const raisin: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const grams = pick(v.form, 3) === 2 ? nonNeg(v.amount) : nonNeg(v.amount) * (pick(v.form, 3) === 0 ? 5 : 0.5);
  const isRaisin = pick(v.form, 3) === 1 || (pick(v.form, 3) === 2 && yes(v.gramsAreRaisins));
  const gPerKg = kg > 0 ? grams / kg : 0;
  const ref = isRaisin ? 2.8 : 19.6;
  return { gramsPerKg: round2(gPerKg), percentOfLowestToxicDose: round2((gPerKg / ref) * 100), riskLevel: grams > 0 ? (gPerKg >= ref ? 4 : 3) : 0, gramsEaten: round2(grams), callVetNow: grams > 0 ? 1 : 0, weightKg: round2(kg) };
};

/** Allium forms: [label, onion-equivalent factor per gram] */
export const ALLIUM: [string, number][] = [["Raw / cooked onion", 1], ["Onion powder", 8], ["Garlic (fresh)", 5], ["Garlic powder", 25], ["Leeks / shallots / chives", 1.5]];
export const onionGarlic: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const g = pick(v.amountUnit, 2) === 0 ? nonNeg(v.amount) : nonNeg(v.amount) * 28.3495;
  const eq = g * ALLIUM[pick(v.form, ALLIUM.length)][1];
  const pctBw = kg > 0 ? (eq / (kg * 1000)) * 100 : 0;
  const cat = pick(v.species, 2) === 1;
  const limits = cat ? [0.25, 0.5, 1, 2] : [0.5, 1, 1.5, 3];
  return { onionEquivalentPercentBodyWeight: round2(pctBw), riskLevel: band(pctBw, limits), onionEquivalentGrams: round2(eq), gramsPerKg: round2(kg > 0 ? eq / kg : 0), concernThresholdGrams: round2((limits[0] / 100) * kg * 1000 / ALLIUM[pick(v.form, ALLIUM.length)][1]), weightKg: round2(kg) };
};

export const CAFFEINE: [string, number][] = [["Brewed coffee (8 oz cup)", 95], ["Espresso (1 shot)", 64], ["Coffee grounds (1 tbsp)", 65], ["Coffee beans (1 bean)", 6], ["Energy drink (8 oz)", 80], ["Black tea (8 oz)", 47], ["Caffeine pill (200 mg)", 200], ["Pre-workout (1 scoop)", 200], ["Cola (12 oz)", 34]];
export const caffeine: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const mg = nonNeg(v.servings) * CAFFEINE[pick(v.source, CAFFEINE.length)][1];
  const dose = kg > 0 ? mg / kg : 0;
  return { doseMgPerKg: round2(dose), riskLevel: band(dose, [20, 40, 80, 150]), caffeineMg: round2(mg), mildSignsAtMg: round2(kg * 20), lethalRangeFromMg: round2(kg * 140), weightKg: round2(kg) };
};

export const XYLITOL_SOURCES: [string, number][] = [["Grams of xylitol (known)", 1], ["Sugar-free gum (piece)", 0.5], ["Sugar-free mint (piece)", 0.25], ["Xylitol peanut butter (tbsp)", 4], ["Sugar-free candy (piece)", 1.5], ["Xylitol sweetener (tsp)", 4]];
export const xylitol: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const per = nonNeg(v.gramsPerItem) > 0 ? nonNeg(v.gramsPerItem) : XYLITOL_SOURCES[pick(v.source, XYLITOL_SOURCES.length)][1];
  const g = nonNeg(v.quantity) * per;
  const dose = kg > 0 ? g / kg : 0;
  return { doseGramsPerKg: round2(dose), riskLevel: band(dose, [0.075, 0.1, 0.5, 1]), xylitolGrams: round2(g), hypoglycemiaAtGrams: round2(kg * 0.1), liverFailureAtGrams: round2(kg * 0.5), weightKg: round2(kg) };
};

export const ibuprofen: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const mg = nonNeg(v.tablets) * nonNeg(v.mgPerTablet, 200);
  const dose = kg > 0 ? mg / kg : 0;
  const cat = pick(v.species, 2) === 1;
  const limits = cat ? [12.5, 25, 87.5, 200] : [25, 50, 175, 400];
  return { doseMgPerKg: round2(dose), riskLevel: band(dose, limits), totalMg: round2(mg), giUlcerAtMg: round2(kg * limits[1]), kidneyInjuryAtMg: round2(kg * limits[2]), weightKg: round2(kg) };
};

export const vitaminD: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const iu = pick(v.unit, 2) === 0 ? nonNeg(v.amountPerUnit) : nonNeg(v.amountPerUnit) * 40000;
  const total = iu * nonNeg(v.quantity);
  const mgKg = kg > 0 ? total / 40000 / kg : 0;
  return { doseMgPerKg: Math.round(mgKg * 1000) / 1000, riskLevel: band(mgKg, [0.05, 0.1, 0.5, 2]), totalIu: Math.round(total), iuPerKg: Math.round(kg > 0 ? total / kg : 0), concernAtIu: Math.round(kg * 0.1 * 40000), weightKg: round2(kg) };
};

export const bromethalin: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const mg = (pick(v.amountUnit, 2) === 0 ? nonNeg(v.amount) : nonNeg(v.amount) * 28.3495) * (nonNeg(v.concentrationPercent, 0.01) / 100) * 1000;
  const dose = kg > 0 ? mg / kg : 0;
  const cat = pick(v.species, 2) === 1;
  const limits = cat ? [0.1, 0.25, 0.4, 1.8] : [0.5, 1.0, 1.75, 5];
  return { doseMgPerKg: Math.round(dose * 1000) / 1000, riskLevel: band(dose, limits), bromethalinMg: round2(mg), paralyticSyndromeAtGramsBait: round2((limits[2] * kg) / ((nonNeg(v.concentrationPercent, 0.01) / 100) * 1000)), weightKg: round2(kg) };
};

export const peroxide: CustomCalculator = (v) => {
  const lb = kgOf(v) / 0.45359237;
  const ml = Math.min(45, lb * 1);
  return { doseMl: round2(ml), doseTeaspoons: round2(ml / 4.93), doseTablespoons: round2(ml / 14.79), maxDoses: 2, repeatAfterMinutes: 15, cappedAtMaximum: lb > 45 ? 1 : 0 };
};

export const petsVetCustomCalculators: Record<string, CustomCalculator> = {
  "vet-dosage-calculator": vetDose,
  "veterinary-anesthesia-calculator": anesthesia,
  "vet-emergency-drug-calculator": emergencyDrugs,
  "veterinary-fluid-rate-calculator": fluidRate,
  "veterinary-cri-calculator": cri,
  "dog-body-surface-area-calculator": bsa,
  "dog-oxygen-flow-rate-calculator": oxygenFlow,
  "heartworm-treatment-calculator": heartworm,
  "dog-heart-rate-calculator": heartRate,
  "veterinary-production-salary-calculator": vetProduction,
  "dog-chocolate-toxicity-calculator": chocolate,
  "dog-raisin-grape-toxicity-calculator": raisin,
  "dog-onion-garlic-toxicity-calculator": onionGarlic,
  "dog-caffeine-toxicity-calculator": caffeine,
  "xylitol-toxicity-in-dogs-calculator": xylitol,
  "ibuprofen-toxicity-dogs-calculator": ibuprofen,
  "dog-vitamin-d-toxicity-calculator": vitaminD,
  "bromethalin-dog-poisoning-calculator": bromethalin,
  "hydrogen-peroxide-dose-for-dogs-calculator": peroxide,
};
