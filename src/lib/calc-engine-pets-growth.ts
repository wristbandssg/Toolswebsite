/**
 * Batch: "Pets & Animals Calculators" → Pet Age, Growth & Breeding Calculators.
 *
 * Data / methods:
 *  - Dog age: AVMA rule (15 human years at 1, 24 at 2, then +4 small / +5 medium / +6 large /
 *    +7 giant per year) and the UC San Diego epigenetic formula 16 × ln(age) + 31 (Wang et al. 2020).
 *    Cat age: 15, 24, then +4 per year (AAHA/AAFP). Other pets scale by average lifespan.
 *  - Puppy growth: share of adult weight by age and size class (fitted to published growth
 *    curves, e.g. Hawthorne et al. 2004); height ≈ √(weight fraction).
 *  - Body condition: each BCS point above 5/9 ≈ 10% over ideal weight (WSAVA). Feline BMI
 *    (Hawthorne & Butterwick): body fat % = ((ribcage / 0.7062) − leg) / 0.9156 − leg (cm).
 *  - Weight loss: dogs 1.0 × RER at ideal weight, cats 0.8 × RER; RER = 70 × kg^0.75.
 *  - Gestation: dogs 63 days from ovulation (65 from LH surge), cats 65, rabbits 31, guinea pigs 68,
 *    donkeys 365. Incubation: chicken 21, duck 28, Muscovy 35, goose 30, turkey 28, quail 17,
 *    guinea fowl 27, peafowl 28 days.
 *  - Progesterone timing (ng/mL): < 2 baseline, 2–3 LH surge, 4–10 ovulation, > 10 post-ovulation.
 *  - Coat genetics: independent Mendelian loci (dogs B, D, E; rabbits A, B, D; cats X-linked O + D).
 *  - Wright's coefficient of inbreeding: Σ (½)^(n₁ + n₂ + 1) × (1 + F_A).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-pets-growth-calculators.ts for the copy.
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
const LB = 0.45359237;
const pct = (x: number) => round2(x * 100);

function ageYears(v: Record<string, number>) {
  if (pick(v.mode, 2) === 0) return Math.max(0, (today() - safeNumber(v.birthDate, today())) / 365.25);
  return nonNeg(v.years) + nonNeg(v.months) / 12;
}

// --- Age & lifespan -------------------------------------------------------------------------------------
export const DOG_SIZE_STEP = [4, 4, 5, 6, 7];
export const dogAge: CustomCalculator = (v) => {
  const a = ageYears(v);
  const step = DOG_SIZE_STEP[pick(v.size, DOG_SIZE_STEP.length)];
  const human = a <= 1 ? 15 * a : a <= 2 ? 15 + 9 * (a - 1) : 24 + step * (a - 2);
  const epi = a > 0 ? 16 * Math.log(a) + 31 : 0;
  const senior = [10, 9, 8, 7, 6][pick(v.size, 5)];
  return { humanYears: round2(human), epigeneticHumanYears: round2(Math.max(0, epi)), dogAgeYears: round2(a), ageInWeeks: Math.round(a * 52.18), seniorFromAge: senior, lifeStage: a < 1 ? 1 : a < 3 ? 2 : a < senior ? 3 : 4 };
};

export const catAge: CustomCalculator = (v) => {
  const a = ageYears(v);
  const human = a <= 1 ? 15 * a : a <= 2 ? 15 + 9 * (a - 1) : 24 + 4 * (a - 2);
  return { humanYears: round2(human), catAgeYears: round2(a), ageInWeeks: Math.round(a * 52.18), lifeStage: a < 1 ? 1 : a < 7 ? 2 : a < 11 ? 3 : 4, nextBirthday: pick(v.mode, 2) === 0 ? nextBirthday(safeNumber(v.birthDate, today())) : 0 };
};
function nextBirthday(birth: number) {
  const b = new Date(birth * DAY);
  const t = new Date(today() * DAY);
  let y = t.getUTCFullYear();
  let n = Math.round(Date.UTC(y, b.getUTCMonth(), b.getUTCDate()) / DAY);
  if (n < today()) { y += 1; n = Math.round(Date.UTC(y, b.getUTCMonth(), b.getUTCDate()) / DAY); }
  return n;
}

/** [label, average lifespan years] */
export const PET_LIFESPANS: [string, number][] = [["Rabbit", 10], ["Hamster", 2.5], ["Guinea pig", 6], ["Rat", 2.5], ["Mouse", 2], ["Gerbil", 3.5], ["Chinchilla", 15], ["Ferret", 7], ["Budgie / parakeet", 8], ["Cockatiel", 18], ["Large parrot (macaw, African grey)", 50], ["Bearded dragon", 12], ["Leopard gecko", 18], ["Ball python", 25], ["Tortoise", 80], ["Goldfish", 12], ["Mini pig", 15], ["Cat", 15], ["Dog (average)", 12.5]];
export const HUMAN_LIFESPAN = 79;
export const petAge: CustomCalculator = (v) => {
  const [, life] = PET_LIFESPANS[pick(v.species, PET_LIFESPANS.length)];
  const a = ageYears(v);
  return { humanYears: round2((a / life) * HUMAN_LIFESPAN), percentOfLifespan: round2((a / life) * 100), expectedLifespanYears: life, yearsRemaining: round2(Math.max(0, life - a)), ratio: round2(HUMAN_LIFESPAN / life), petAgeYears: round2(a) };
};

export const DOG_LIFE: [string, number][] = [["Toy (under 10 lb)", 14], ["Small (10–25 lb)", 13.5], ["Medium (25–50 lb)", 13], ["Large (50–90 lb)", 11.5], ["Giant (over 90 lb)", 9]];
export const dogLifeExpectancy: CustomCalculator = (v) => {
  let life = DOG_LIFE[pick(v.size, DOG_LIFE.length)][1];
  if (pick(v.breedType, 2) === 1) life += 0.5;
  if (yes(v.neutered)) life += 0.5;
  if (yes(v.overweight)) life -= 1.8;
  if (yes(v.brachycephalic)) life -= 1.5;
  const a = ageYears(v);
  return { expectedLifespanYears: round2(life), yearsRemaining: round2(Math.max(0, life - a)), lifespanLow: round2(life - 2), lifespanHigh: round2(life + 2), percentLived: round2(Math.min(100, (a / life) * 100)) };
};

export const catLifespan: CustomCalculator = (v) => {
  let life = 14;
  const env = pick(v.lifestyle, 3);
  if (env === 0) life += 1.5;
  if (env === 2) life -= 4;
  if (yes(v.neutered)) life += 1;
  if (pick(v.breedType, 2) === 1) life -= 1;
  if (yes(v.overweight)) life -= 1.5;
  const a = ageYears(v);
  return { expectedLifespanYears: round2(life), yearsRemaining: round2(Math.max(0, life - a)), lifespanLow: round2(life - 3), lifespanHigh: round2(life + 4), percentLived: round2(Math.min(100, (a / life) * 100)) };
};

export const QOL_KEYS = ["hurt", "hunger", "hydration", "hygiene", "happiness", "mobility", "moreGoodDays"];
export const qualityOfLife: CustomCalculator = (v) => {
  const scores = QOL_KEYS.map((k) => Math.min(10, nonNeg(v[k])));
  const total = scores.reduce((a, b) => a + b, 0);
  const low = scores.filter((s) => s <= 3).length;
  return { totalScore: total, outOf: 70, acceptable: total > 35 ? 1 : 0, lowScoringAreas: low, percent: round2((total / 70) * 100) };
};

export const SLEEP: [string, number, number][] = [["Puppy (under 1 year)", 18, 20], ["Adult (1–7 years)", 12, 14], ["Senior (7+ years)", 14, 18]];
export const dogSleep: CustomCalculator = (v) => {
  const [, lo, hi] = SLEEP[pick(v.stage, SLEEP.length)];
  const big = pick(v.size, 3) === 2 ? 1 : 0;
  const active = pick(v.activity, 3);
  const adj = big - (active === 2 ? 1 : 0) + (active === 0 ? 1 : 0);
  return { sleepHoursLow: Math.min(20, lo + adj), sleepHoursHigh: Math.min(22, hi + adj), napsPerDay: pick(v.stage, 3) === 0 ? 6 : 3, awakeHoursHigh: 24 - Math.min(20, lo + adj) };
};

// --- Growth & weight ------------------------------------------------------------------------------------
const GROWTH_WEEKS = [8, 12, 16, 20, 24, 30, 36, 44, 52, 65, 78, 104];
export const GROWTH: number[][] = [
  [0.25, 0.4, 0.52, 0.64, 0.75, 0.84, 0.9, 0.95, 0.98, 1, 1, 1],
  [0.22, 0.35, 0.47, 0.59, 0.7, 0.8, 0.87, 0.93, 0.97, 0.99, 1, 1],
  [0.18, 0.3, 0.41, 0.52, 0.62, 0.72, 0.8, 0.87, 0.93, 0.97, 0.99, 1],
  [0.15, 0.25, 0.35, 0.45, 0.55, 0.64, 0.72, 0.8, 0.88, 0.94, 0.97, 1],
  [0.12, 0.2, 0.28, 0.37, 0.45, 0.54, 0.62, 0.7, 0.78, 0.87, 0.92, 0.98],
];
export function growthFraction(size: number, weeks: number) {
  const row = GROWTH[Math.min(4, Math.max(0, size))];
  const w = Math.max(1, weeks);
  if (w <= GROWTH_WEEKS[0]) return Math.max(0.03, (row[0] * w) / GROWTH_WEEKS[0]);
  for (let i = 1; i < GROWTH_WEEKS.length; i++) {
    if (w <= GROWTH_WEEKS[i]) {
      const f = (w - GROWTH_WEEKS[i - 1]) / (GROWTH_WEEKS[i] - GROWTH_WEEKS[i - 1]);
      return row[i - 1] + f * (row[i] - row[i - 1]);
    }
  }
  return 1;
}
/** Breeds: [label, size class 0–4 (toy…giant), adult lb low, adult lb high]. Index 0 = mixed / pick size. */
export const BREEDS: [string, number, number, number][] = [
  ["Mixed breed / other (choose size)", -1, 0, 0], ["Yorkshire Terrier", 0, 4, 7], ["Chihuahua", 0, 3, 6], ["Toy Poodle", 0, 4, 6], ["Pomeranian", 0, 3, 7], ["Maltese", 0, 4, 7], ["Shih Tzu", 1, 9, 16], ["Miniature Dachshund", 1, 8, 11], ["French Bulldog", 1, 16, 28], ["Cavalier King Charles", 1, 13, 18], ["Beagle", 2, 20, 30], ["Border Collie", 2, 30, 55], ["Australian Shepherd", 2, 40, 65], ["Siberian Husky", 2, 35, 60], ["Golden Retriever", 3, 55, 75], ["Labrador Retriever", 3, 55, 80], ["German Shepherd", 3, 50, 90], ["Rottweiler", 4, 80, 135], ["Cane Corso", 4, 88, 110], ["Great Dane", 4, 110, 175], ["Bernese Mountain Dog", 4, 70, 115],
];
export const puppyWeight: CustomCalculator = (v) => {
  const b = BREEDS[pick(v.breed, BREEDS.length)];
  const size = b[1] < 0 ? pick(v.size, 5) : b[1];
  const weeks = nonNeg(v.ageWeeks, 12);
  const frac = growthFraction(size, weeks);
  const cur = nonNeg(v.currentWeight);
  const adult = frac > 0 ? cur / frac : 0;
  const kgFactor = pick(v.weightUnit, 2) === 0 ? 1 : 1 / LB;
  return { predictedAdultWeight: round2(adult), percentGrown: pct(frac), weightAt6Months: round2(adult * growthFraction(size, 26)), weightAt1Year: round2(adult * growthFraction(size, 52)), breedStandardLowLb: b[2], breedStandardHighLb: b[3], predictedAdultLb: round2(adult / kgFactor), sizeClass: size + 1 };
};

export const DOODLE_GEN: [string, number][] = [["F1 (poodle × other breed)", 0.5], ["F1B (F1 × poodle)", 0.75], ["F2 (F1 × F1)", 0.5], ["F2B / multigenerational", 0.6]];
export const doodleWeight: CustomCalculator = (v) => {
  const poodle = nonNeg(v.poodleParentWeight);
  const other = nonNeg(v.otherParentWeight);
  const share = DOODLE_GEN[pick(v.generation, DOODLE_GEN.length)][1];
  const sexAdj = pick(v.sex, 2) === 1 ? 0.92 : 1.04;
  const byParents = (poodle * share + other * (1 - share)) * sexAdj;
  const cur = nonNeg(v.currentWeight);
  const weeks = nonNeg(v.ageWeeks);
  const size = byParents < 12 ? 0 : byParents < 25 ? 1 : byParents < 50 ? 2 : byParents < 90 ? 3 : 4;
  const byGrowth = cur > 0 && weeks > 0 ? cur / growthFraction(size, weeks) : 0;
  const best = byGrowth > 0 ? (byParents + byGrowth) / 2 : byParents;
  return { predictedAdultWeight: round2(best), estimateFromParents: round2(byParents), estimateFromCurrentWeight: round2(byGrowth), rangeLow: round2(best * 0.85), rangeHigh: round2(best * 1.15), sizeCategory: size + 1 };
};

export const dogBmi: CustomCalculator = (v) => {
  const w = nonNeg(v.weight);
  const bcs = Math.min(9, Math.max(1, safeNumber(v.bcs, 5)));
  const ideal = w / (1 + 0.1 * (bcs - 5));
  return { idealWeight: round2(ideal), percentOverIdeal: round2(((w - ideal) / Math.max(0.01, ideal)) * 100), weightToLose: round2(Math.max(0, w - ideal)), weightToGain: round2(Math.max(0, ideal - w)), category: bcs <= 3 ? 1 : bcs <= 5 ? 2 : bcs <= 7 ? 3 : 4, bodyFatEstimatePercent: round2(Math.max(5, 20 + (bcs - 5) * 5)) };
};

export const catBmi: CustomCalculator = (v) => {
  const toCm = pick(v.lengthUnit, 2) === 0 ? 2.54 : 1;
  const rc = nonNeg(v.ribcage) * toCm;
  const lim = nonNeg(v.legLength) * toCm;
  const bf = Math.max(0, (rc / 0.7062 - lim) / 0.9156 - lim);
  const w = nonNeg(v.weight);
  const lean = w * (1 - bf / 100);
  const ideal = lean / 0.8;
  return { bodyFatPercent: round2(bf), category: bf < 10 ? 1 : bf <= 30 ? 2 : bf <= 42 ? 3 : 4, idealWeight: round2(ideal), weightToLose: round2(Math.max(0, w - ideal)), leanMass: round2(lean) };
};

function rer(kg: number) { return 70 * Math.pow(Math.max(0, kg), 0.75); }
function weightLoss(v: Record<string, number>, factor: number, rate: number) {
  const unitKg = pick(v.weightUnit, 2) === 0 ? LB : 1;
  const cur = nonNeg(v.currentWeight);
  const target = Math.min(cur, nonNeg(v.targetWeight));
  const kcal = rer(target * unitKg) * factor;
  const weeks = cur > 0 && target > 0 && target < cur ? Math.log(target / cur) / Math.log(1 - rate) : 0;
  const perCup = nonNeg(v.kcalPerCup);
  return { dailyCalories: Math.round(kcal), cupsPerDay: round2(perCup > 0 ? kcal / perCup : 0), weeksToGoal: round2(weeks), weeklyLoss: round2(cur * rate), totalToLose: round2(cur - target), treatCaloriesMax: Math.round(kcal * 0.1) };
}
export const dogWeightLoss: CustomCalculator = (v) => weightLoss(v, 1.0, nonNeg(v.weeklyRate, 1.5) / 100);
export const catWeightLoss: CustomCalculator = (v) => weightLoss(v, 0.8, nonNeg(v.weeklyRate, 1) / 100);

export const EXERCISE = [30, 60, 90, 120];
export const dogExercise: CustomCalculator = (v) => {
  const stage = pick(v.stage, 3);
  const months = nonNeg(v.ageMonths, 24);
  let minutes: number;
  if (stage === 0) minutes = Math.min(60, 5 * months * 2);
  else minutes = EXERCISE[pick(v.energy, EXERCISE.length)] * (stage === 2 ? 0.6 : 1);
  if (yes(v.weightLoss)) minutes *= 1.25;
  if (yes(v.brachycephalic)) minutes = Math.min(minutes, 45);
  const walks = minutes <= 30 ? 1 : minutes <= 75 ? 2 : 3;
  return { minutesPerDay: Math.round(minutes), walksPerDay: walks, minutesPerWalk: Math.round(minutes / walks), milesPerDayAtWalkingPace: round2((minutes / 60) * 2.5), weeklyHours: round2((minutes * 7) / 60) };
};

export const puppyHeight: CustomCalculator = (v) => {
  const b = BREEDS[pick(v.breed, BREEDS.length)];
  const size = b[1] < 0 ? pick(v.size, 5) : b[1];
  const frac = Math.sqrt(growthFraction(size, nonNeg(v.ageWeeks, 16)));
  const adult = frac > 0 ? nonNeg(v.currentHeight) / frac : 0;
  return { predictedAdultHeight: round2(adult), percentOfAdultHeight: pct(frac), heightAt6Months: round2(adult * Math.sqrt(growthFraction(size, 26))), adultHeightCm: round2(pick(v.heightUnit, 2) === 0 ? adult * 2.54 : adult) };
};

const PAW_FRAC_WEEKS = [8, 12, 16, 20, 26, 36];
const PAW_FRAC = [0.6, 0.75, 0.85, 0.92, 0.97, 1];
const PAW_TO_LB: [number, number][] = [[1, 5], [1.5, 12], [2, 25], [2.5, 50], [3, 80], [3.5, 120], [4, 160]];
export const pawSize: CustomCalculator = (v) => {
  const w = nonNeg(v.ageWeeks, 12);
  let f = 1;
  for (let i = 0; i < PAW_FRAC_WEEKS.length; i++) if (w <= PAW_FRAC_WEEKS[i]) { f = i === 0 ? PAW_FRAC[0] : PAW_FRAC[i - 1] + ((w - PAW_FRAC_WEEKS[i - 1]) / (PAW_FRAC_WEEKS[i] - PAW_FRAC_WEEKS[i - 1])) * (PAW_FRAC[i] - PAW_FRAC[i - 1]); break; }
  const width = (pick(v.unit, 2) === 0 ? nonNeg(v.pawWidth) : nonNeg(v.pawWidth) / 2.54) / f;
  let lb = PAW_TO_LB[PAW_TO_LB.length - 1][1];
  if (width <= PAW_TO_LB[0][0]) lb = PAW_TO_LB[0][1] * (width / PAW_TO_LB[0][0]);
  else for (let i = 1; i < PAW_TO_LB.length; i++) if (width <= PAW_TO_LB[i][0]) { const [x0, y0] = PAW_TO_LB[i - 1]; const [x1, y1] = PAW_TO_LB[i]; lb = y0 + ((width - x0) / (x1 - x0)) * (y1 - y0); break; }
  return { estimatedAdultWeightLb: round2(lb), estimatedAdultWeightKg: round2(lb * LB), adultPawWidthIn: round2(width), sizeCategory: lb < 12 ? 1 : lb < 25 ? 2 : lb < 50 ? 3 : lb < 90 ? 4 : 5 };
};

// --- Breeding & pregnancy ---------------------------------------------------------------------------------
export const dogPregnancy: CustomCalculator = (v) => {
  const d = safeNumber(v.eventDate, today() - 21);
  const add = [63, 65, 63][pick(v.basedOn, 3)];
  const base = pick(v.basedOn, 3) === 0 ? d : pick(v.basedOn, 3) === 1 ? d + 2 : d; // ovulation ≈ LH + 2
  const due = d + add;
  const day = today() - (pick(v.basedOn, 3) === 0 ? d : base);
  return { dueDate: due, earliestDue: due - 5, latestDue: due + 5, ultrasoundFrom: base + 25, xrayFrom: base + 45, startTemperatureChecks: due - 7, currentDayOfPregnancy: Math.max(0, day), currentWeek: Math.max(0, Math.ceil(day / 7)), daysToDue: due - today() };
};

function gestation(days: number, spread: number) {
  return (v: Record<string, number>) => {
    const d = safeNumber(v.breedingDate, today() - 14);
    const due = d + days;
    return { dueDate: due, earliestDue: due - spread, latestDue: due + spread, daysPregnant: Math.max(0, today() - d), daysToDue: due - today(), gestationDays: days } as Record<string, number>;
  };
}
export const catPregnancy: CustomCalculator = (v) => {
  const r = gestation(65, 4)(v);
  const d = safeNumber(v.breedingDate, today() - 14);
  return { ...r, ultrasoundFrom: d + 15, xrayFrom: d + 45, nestingFrom: d + 58 };
};
export const rabbitGestation: CustomCalculator = (v) => { const r = gestation(31, 3)(v); return { ...r, nestBoxIn: safeNumber(v.breedingDate, today() - 14) + 28, palpateFrom: safeNumber(v.breedingDate, today() - 14) + 10 }; };
export const guineaPigGestation: CustomCalculator = (v) => { const r = gestation(68, 6)(v); return { ...r, separateBoarBy: r.dueDate - 7 }; };
export const donkeyGestation: CustomCalculator = (v) => { const r = gestation(pick(v.type, 2) === 1 ? 355 : 365, 20)(v); return { ...r, pregnancyCheckFrom: safeNumber(v.breedingDate, today() - 14) + 16, vaccinateBy: r.dueDate - 30 }; };

export const INCUBATION: [string, number, number][] = [["Chicken", 21, 99.5], ["Duck (most breeds)", 28, 99.5], ["Muscovy duck", 35, 99.5], ["Goose", 30, 99.5], ["Turkey", 28, 99.5], ["Coturnix quail", 17, 99.5], ["Guinea fowl", 27, 99.5], ["Peafowl", 28, 99.5]];
export const incubation: CustomCalculator = (v) => {
  const [, days, temp] = INCUBATION[pick(v.species, INCUBATION.length)];
  const set = safeNumber(v.setDate, today());
  const hatch = set + days;
  return { hatchDate: hatch, firstCandling: set + 7, secondCandling: set + Math.round(days * 0.67), lockdownDate: hatch - 3, incubationDays: days, temperatureF: temp, dayOfIncubationToday: Math.max(0, today() - set) };
};

export const HEAT_INTERVAL = [5, 6, 6, 7, 9];
export const dogHeatCycle: CustomCalculator = (v) => {
  const start = safeNumber(v.lastHeatStart, today() - 120);
  const months = nonNeg(v.intervalMonths) > 0 ? nonNeg(v.intervalMonths) : HEAT_INTERVAL[pick(v.size, HEAT_INTERVAL.length)];
  const next = Math.round(start + months * 30.44);
  return { nextHeatStart: next, fertileWindowStart: next + 9, fertileWindowEnd: next + 14, heatEnds: next + 21, followingHeatStart: Math.round(next + months * 30.44), currentCycleFertileStart: start + 9, intervalMonths: months };
};

export const dogOvulation: CustomCalculator = (v) => {
  const p = nonNeg(v.progesterone);
  const test = safeNumber(v.testDate, today());
  let offset = 0;
  let retest = 0;
  if (p < 2) { offset = 4; retest = 2; } else if (p < 4) offset = 2; else if (p <= 10) offset = 0; else offset = -1;
  const ov = test + offset;
  const [s, e] = [[2, 4], [1, 3], [2, 3], [3, 4]][pick(v.breedingMethod, 4)];
  return { estimatedOvulationDate: ov, bestBreedingStart: ov + s, bestBreedingEnd: ov + e, whelpingDate: ov + 63, retestInDays: retest, stage: p < 2 ? 1 : p < 4 ? 2 : p <= 10 ? 3 : 4 };
};

const domProb = (g: number) => [1, 0.5, 0][Math.min(2, Math.max(0, Math.round(safeNumber(g))))];
/** P(offspring recessive homozygote) for two parents' genotypes (0 = dominant homozygote, 1 = carrier, 2 = recessive). */
const recessive = (a: number, b: number) => (1 - domProb(a)) * (1 - domProb(b));
export const dogColor: CustomCalculator = (v) => {
  const ee = recessive(v.sireE, v.damE);
  const bb = recessive(v.sireB, v.damB);
  const dd = recessive(v.sireD, v.damD);
  const E = 1 - ee;
  return { blackPercent: pct(E * (1 - bb) * (1 - dd)), liverChocolatePercent: pct(E * bb * (1 - dd)), bluePercent: pct(E * (1 - bb) * dd), isabellaLilacPercent: pct(E * bb * dd), yellowRedCreamPercent: pct(ee), carriesChocolatePercent: pct(1 - bb - (domProb(v.sireB) * domProb(v.damB))) };
};

export const catColor: CustomCalculator = (v) => {
  const sireO = pick(v.sireOrange, 2) === 1 ? 1 : 0;
  const damO = [0, 0.5, 1][pick(v.damOrange, 3)];
  const dd = recessive(v.sireD, v.damD);
  const D = 1 - dd;
  const fOrange = sireO * damO;
  const fTortie = sireO * (1 - damO) + (1 - sireO) * damO;
  const fBlack = (1 - sireO) * (1 - damO);
  return { maleRed: pct(damO * D), maleCream: pct(damO * dd), maleBlack: pct((1 - damO) * D), maleBlue: pct((1 - damO) * dd), femaleRed: pct(fOrange * D), femaleCream: pct(fOrange * dd), femaleBlack: pct(fBlack * D), femaleBlue: pct(fBlack * dd), femaleTortie: pct(fTortie * D), femaleBlueCreamTortie: pct(fTortie * dd) };
};

export const rabbitColor: CustomCalculator = (v) => {
  const aa = recessive(v.sireA, v.damA);
  const bb = recessive(v.sireB, v.damB);
  const dd = recessive(v.sireD, v.damD);
  const A = 1 - aa;
  const B = 1 - bb;
  const D = 1 - dd;
  return { chestnutAgouti: pct(A * B * D), opal: pct(A * B * dd), chocolateAgouti: pct(A * bb * D), lynx: pct(A * bb * dd), black: pct(aa * B * D), blue: pct(aa * B * dd), chocolate: pct(aa * bb * D), lilac: pct(aa * bb * dd) };
};

export const inbreeding: CustomCalculator = (v) => {
  let f = 0;
  let count = 0;
  for (let i = 1; i <= 4; i++) {
    const n1 = Math.round(nonNeg(v[`sireGen${i}`]));
    const n2 = Math.round(nonNeg(v[`damGen${i}`]));
    if (n1 > 0 && n2 > 0) { f += Math.pow(0.5, n1 + n2 + 1) * (1 + nonNeg(v[`ancestorCoi${i}`]) / 100); count++; }
  }
  return { coiPercent: round2(f * 100), commonAncestorPaths: count, equivalentRelationship: f >= 0.25 ? 4 : f >= 0.125 ? 3 : f >= 0.0625 ? 2 : f > 0 ? 1 : 0 };
};

export const petsGrowthCustomCalculators: Record<string, CustomCalculator> = {
  "dog-age-calculator": dogAge,
  "cat-age-calculator": catAge,
  "pet-age-calculator": petAge,
  "dog-life-expectancy-calculator": dogLifeExpectancy,
  "cat-lifespan-calculator": catLifespan,
  "pet-quality-of-life-calculator": qualityOfLife,
  "dog-sleep-calculator": dogSleep,
  "puppy-weight-calculator": puppyWeight,
  "goldendoodle-weight-calculator": doodleWeight,
  "dog-bmi-calculator": dogBmi,
  "cat-bmi-calculator": catBmi,
  "dog-weight-loss-calculator": dogWeightLoss,
  "cat-weight-loss-calculator": catWeightLoss,
  "dog-exercise-calculator": dogExercise,
  "puppy-height-calculator": puppyHeight,
  "puppy-paw-size-calculator": pawSize,
  "dog-pregnancy-calculator": dogPregnancy,
  "cat-pregnancy-calculator": catPregnancy,
  "rabbit-gestation-calculator": rabbitGestation,
  "guinea-pig-gestation-calculator": guineaPigGestation,
  "donkey-gestation-calculator": donkeyGestation,
  "egg-incubation-calculator": incubation,
  "dog-heat-cycle-calculator": dogHeatCycle,
  "dog-ovulation-calculator": dogOvulation,
  "dog-color-genetics-calculator": dogColor,
  "cat-coat-color-calculator": catColor,
  "rabbit-color-calculator": rabbitColor,
  "inbreeding-coefficient-calculator": inbreeding,
};
