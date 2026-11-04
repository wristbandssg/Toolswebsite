/**
 * Batch: "Pets & Animals Calculators" → Pet Food, Care & Cost Calculators.
 *
 * Data / methods:
 *  - RER = 70 × kg^0.75 kcal/day; MER = RER × life-stage factor (WSAVA / NRC 2006 typical factors:
 *    dogs neutered 1.6, intact 1.8, inactive 1.2, loss 1.0, senior 1.4, puppies 3.0 / 2.0, work 2–5,
 *    late pregnancy 3.0, lactation 4.0; cats neutered 1.2, intact 1.4, inactive 1.0, loss 0.8,
 *    senior 1.1, kittens 2.5, pregnancy 1.6, lactation 3.0).
 *  - Modified Atwater (AAFCO): kcal/kg = 10 × (3.5 × protein + 8.5 × fat + 3.5 × NFE), as-fed %.
 *    NFE (carbohydrate) = 100 − protein − fat − fiber − moisture − ash; dry matter = as fed ÷ (1 − moisture).
 *  - Water: dogs ≈ 50 mL/kg/day, cats ≈ 45 mL/kg/day (maintenance), part supplied by wet food.
 *  - Raw feeding: adult dogs 2–3% of ideal body weight, puppies a % of current weight by age;
 *    cats 2–4%, kittens 4–6%; prey-model ratio 80% meat / 10% bone / 5% liver / 5% other organ.
 *  - Mini pigs: maintenance ME ≈ 106 × kg^0.75 kcal/day (NRC swine).
 *  - Service prices are 2026 US mid-range rates the user can override.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-pets-food-calculators.ts for the copy.
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
const ceil = (n: number) => Math.ceil(n - 1e-9);
const LB = 0.45359237;
const kgOf = (v: Record<string, number>) => (pick(v.weightUnit, 2) === 0 ? nonNeg(v.weight) * LB : nonNeg(v.weight));
const rer = (kg: number) => 70 * Math.pow(Math.max(0, kg), 0.75);

export const DOG_FACTORS: [string, number][] = [["Neutered adult", 1.6], ["Intact adult", 1.8], ["Inactive / weight-gain prone", 1.2], ["Weight loss", 1.0], ["Weight gain", 1.7], ["Senior", 1.4], ["Light work / active", 2.0], ["Moderate work", 3.0], ["Heavy work (sled, herding)", 5.0], ["Puppy under 4 months", 3.0], ["Puppy 4–12 months", 2.0], ["Pregnant (last 3 weeks)", 3.0], ["Nursing mother", 4.0]];
export const CAT_FACTORS: [string, number][] = [["Neutered adult", 1.2], ["Intact adult", 1.4], ["Inactive / indoor, weight-gain prone", 1.0], ["Weight loss", 0.8], ["Weight gain", 1.4], ["Senior", 1.1], ["Kitten (under 1 year)", 2.5], ["Pregnant", 1.6], ["Nursing mother", 3.0]];

function dailyKcal(v: Record<string, number>, cat = false) {
  const f = (cat ? CAT_FACTORS : DOG_FACTORS)[pick(v.lifeStage, (cat ? CAT_FACTORS : DOG_FACTORS).length)][1];
  return rer(kgOf(v)) * f;
}

function feeding(kcal: number, v: Record<string, number>) {
  const wetShare = pick(v.feedingType, 3) === 0 ? 0 : pick(v.feedingType, 3) === 1 ? 1 : nonNeg(v.wetPercent, 50) / 100;
  const dryKcal = kcal * (1 - wetShare);
  const wetKcal = kcal * wetShare;
  const cups = nonNeg(v.kcalPerCup) > 0 ? dryKcal / nonNeg(v.kcalPerCup) : 0;
  const cans = nonNeg(v.kcalPerCan) > 0 ? wetKcal / nonNeg(v.kcalPerCan) : 0;
  const meals = Math.max(1, Math.round(nonNeg(v.meals, 2)));
  return { dailyCalories: Math.round(kcal), cupsDryPerDay: round2(cups), cansWetPerDay: round2(cans), cupsPerMeal: round2(cups / meals), gramsDryPerDay: Math.round(cups * nonNeg(v.gramsPerCup, 100)), dryCalories: Math.round(dryKcal), wetCalories: Math.round(wetKcal) };
}

export const dogFood: CustomCalculator = (v) => feeding(dailyKcal(v), v);
export const catFood: CustomCalculator = (v) => feeding(dailyKcal(v, true), v);

function calorieOut(v: Record<string, number>, cat: boolean) {
  const kg = kgOf(v);
  const r = rer(kg);
  const k = dailyKcal(v, cat);
  return { dailyCalories: Math.round(k), restingEnergyRer: Math.round(r), lifeStageFactor: round2(r ? k / r : 0), caloriesPerMeal: Math.round(k / Math.max(1, Math.round(nonNeg(v.meals, 2)))), treatAllowance: Math.round(k * 0.1), weightKg: round2(kg) };
}
export const dogCalorie: CustomCalculator = (v) => calorieOut(v, false);
export const catCalorie: CustomCalculator = (v) => calorieOut(v, true);

export const PUPPY_RAW: [number, number][] = [[3, 10], [4, 8], [6, 6], [9, 4.5], [12, 3]];
export const rawDog: CustomCalculator = (v) => {
  const kg = kgOf(v);
  let pctBw: number;
  if (pick(v.stage, 2) === 1) { const m = nonNeg(v.ageMonths, 4); pctBw = (PUPPY_RAW.find(([max]) => m <= max) ?? PUPPY_RAW[PUPPY_RAW.length - 1])[1]; }
  else pctBw = nonNeg(v.percentBodyWeight, 2.5);
  const g = kg * 1000 * (pctBw / 100);
  return { gramsPerDay: Math.round(g), poundsPerDay: round2(g / 453.592), meatGrams: Math.round(g * 0.8), boneGrams: Math.round(g * 0.1), liverGrams: Math.round(g * 0.05), otherOrganGrams: Math.round(g * 0.05), poundsPerWeek: round2((g * 7) / 453.592), monthlyCost: round2(((g * 30.4) / 453.592) * nonNeg(v.pricePerLb)), percentBodyWeightUsed: pctBw };
};

export const rawCat: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const pctBw = pick(v.stage, 2) === 1 ? (nonNeg(v.ageMonths, 4) <= 6 ? 6 : 4.5) : nonNeg(v.percentBodyWeight, 3);
  const g = kg * 1000 * (pctBw / 100);
  return { gramsPerDay: Math.round(g), ouncesPerDay: round2(g / 28.3495), meatGrams: Math.round(g * 0.8), boneGrams: Math.round(g * 0.1), liverGrams: Math.round(g * 0.05), otherOrganGrams: Math.round(g * 0.05), monthlyCost: round2(((g * 30.4) / 453.592) * nonNeg(v.pricePerLb)), percentBodyWeightUsed: pctBw };
};

export const puppyFood: CustomCalculator = (v) => {
  const months = nonNeg(v.ageMonths, 4);
  const factor = months < 4 ? 3.0 : months < 12 ? 2.0 : 1.6;
  const kcal = rer(kgOf(v)) * factor;
  const meals = months < 3 ? 4 : months < 6 ? 3 : 2;
  const cups = nonNeg(v.kcalPerCup) > 0 ? kcal / nonNeg(v.kcalPerCup) : 0;
  return { dailyCalories: Math.round(kcal), cupsPerDay: round2(cups), mealsPerDay: meals, cupsPerMeal: round2(cups / meals), gramsPerDay: Math.round(cups * nonNeg(v.gramsPerCup, 100)), growthFactor: factor };
};

/** Homemade recipe calorie split: [label, kcal per gram cooked, share of calories]. */
export const HOMEMADE: [string, number, number][] = [["Lean protein (cooked chicken / turkey / lean beef)", 1.65, 0.48], ["Carbohydrate (cooked rice / sweet potato / oats)", 1.15, 0.3], ["Vegetables (cooked)", 0.35, 0.07], ["Oil (fish / vegetable oil)", 8.84, 0.15]];
export const homemade: CustomCalculator = (v) => {
  const kcal = dailyKcal(v);
  const diabetic = yes(v.lowCarb);
  const shares = diabetic ? [0.55, 0.15, 0.15, 0.15] : HOMEMADE.map(([, , s]) => s);
  const g = HOMEMADE.map(([, d], i) => (kcal * shares[i]) / d);
  return { dailyCalories: Math.round(kcal), proteinGrams: Math.round(g[0]), carbGrams: Math.round(g[1]), vegetableGrams: Math.round(g[2]), oilGrams: round2(g[3]), oilTeaspoons: round2(g[3] / 4.5), totalGramsPerDay: Math.round(g.reduce((a, b) => a + b, 0)) };
};

function analysis(v: Record<string, number>) {
  const p = nonNeg(v.protein);
  const f = nonNeg(v.fat);
  const fi = nonNeg(v.fiber);
  const m = Math.min(99, nonNeg(v.moisture));
  const ash = nonNeg(v.ash, m > 50 ? 2.5 : 8);
  const nfe = Math.max(0, 100 - p - f - fi - m - ash);
  const dm = (x: number) => (100 - m > 0 ? (x / (100 - m)) * 100 : 0);
  const kcalKg = 10 * (3.5 * p + 8.5 * f + 3.5 * nfe);
  return { p, f, fi, m, ash, nfe, dm, kcalKg };
}
export const dryMatter: CustomCalculator = (v) => {
  const a = analysis(v);
  const tot = 3.5 * a.p + 8.5 * a.f + 3.5 * a.nfe;
  return { proteinDryMatter: round2(a.dm(a.p)), fatDryMatter: round2(a.dm(a.f)), carbsDryMatter: round2(a.dm(a.nfe)), fiberDryMatter: round2(a.dm(a.fi)), carbsAsFed: round2(a.nfe), proteinCaloriesPercent: round2(tot ? ((3.5 * a.p) / tot) * 100 : 0), fatCaloriesPercent: round2(tot ? ((8.5 * a.f) / tot) * 100 : 0), carbCaloriesPercent: round2(tot ? ((3.5 * a.nfe) / tot) * 100 : 0) };
};
export const foodCalories: CustomCalculator = (v) => {
  const a = analysis(v);
  return { kcalPerKg: Math.round(a.kcalKg), kcalPerCup: Math.round((a.kcalKg / 1000) * nonNeg(v.gramsPerCup, 100)), kcalPerCan: Math.round((a.kcalKg / 1000) * nonNeg(v.gramsPerCan)), kcalPerGram: round2(a.kcalKg / 1000), kcalPerOunce: round2((a.kcalKg / 1000) * 28.3495), carbsAsFedPercent: round2(a.nfe) };
};

export const waterIntake: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const cat = pick(v.species, 2) === 1;
  let ml = kg * (cat ? 45 : 50);
  ml *= 1 + (yes(v.hotOrActive) ? 0.3 : 0) + (yes(v.nursing) ? 0.5 : 0);
  const fromFood = [0, 0.3, 0.65][pick(v.diet, 3)];
  const drink = ml * (1 - fromFood);
  return { totalWaterMlPerDay: Math.round(ml), toDrinkMlPerDay: Math.round(drink), toDrinkCups: round2(drink / 236.6), toDrinkOunces: round2(drink / 29.57), fromFoodMl: Math.round(ml * fromFood), excessiveAboveMl: Math.round(kg * 100) };
};

export const kittenFeeding: CustomCalculator = (v) => {
  const weeks = nonNeg(v.ageWeeks, 10);
  const kg = kgOf(v);
  if (weeks < 4) {
    const ml = (kg * 1000 / 28.3495) * 8;
    const feeds = weeks < 2 ? 10 : 7;
    return { stage: 1, dailyCalories: Math.round(ml * 0.9), feedingsPerDay: feeds, milkReplacerMlPerDay: Math.round(ml), mlPerFeeding: round2(ml / feeds), wetCansPerDay: 0, dryCupsPerDay: 0 };
  }
  const factor = weeks < 16 ? 3 : weeks < 26 ? 2.5 : 2;
  const kcal = rer(kg) * factor;
  const feeds = weeks < 8 ? 5 : weeks < 12 ? 4 : weeks < 26 ? 3 : 2;
  const wetShare = weeks < 8 ? 1 : nonNeg(v.wetPercent, 50) / 100;
  return { stage: weeks < 8 ? 2 : weeks < 26 ? 3 : 4, dailyCalories: Math.round(kcal), feedingsPerDay: feeds, milkReplacerMlPerDay: 0, mlPerFeeding: 0, wetCansPerDay: round2(nonNeg(v.kcalPerCan) > 0 ? (kcal * wetShare) / nonNeg(v.kcalPerCan) : 0), dryCupsPerDay: round2(nonNeg(v.kcalPerCup) > 0 ? (kcal * (1 - wetShare)) / nonNeg(v.kcalPerCup) : 0) };
};

export const foodLast: CustomCalculator = (v) => {
  const cupsBag = nonNeg(v.bagWeight) * (pick(v.bagUnit, 2) === 0 ? nonNeg(v.cupsPerLb, 4) : nonNeg(v.cupsPerLb, 4) * 2.20462);
  const perDay = nonNeg(v.cupsPerDayPerDog) * Math.max(1, nonNeg(v.dogs, 1));
  const days = perDay > 0 ? cupsBag / perDay : 0;
  return { daysBagLasts: round2(days), weeksBagLasts: round2(days / 7), cupsInBag: round2(cupsBag), costPerDay: round2(days > 0 ? nonNeg(v.bagPrice) / days : 0), costPerMonth: round2(days > 0 ? (nonNeg(v.bagPrice) / days) * 30.4 : 0), bagsPerYear: round2(days > 0 ? 365 / days : 0) };
};

export const transition: CustomCalculator = (v) => {
  const d = nonNeg(v.dailyAmount);
  const total = [7, 10, 14][pick(v.length, 3)];
  const phase = Math.round(total / 4);
  return { phase1OldAmount: round2(d * 0.75), phase1NewAmount: round2(d * 0.25), phase2OldAmount: round2(d * 0.5), phase2NewAmount: round2(d * 0.5), phase3OldAmount: round2(d * 0.25), phase3NewAmount: round2(d * 0.75), daysPerPhase: phase, fullNewFoodFromDay: phase * 3 + 1, totalDays: total };
};

function costPer1000(price: number, bag: number, unit: number, kcalPerKg: number) {
  const kg = unit === 0 ? bag * LB : bag;
  const kcal = kg * kcalPerKg;
  return kcal > 0 ? (price / kcal) * 1000 : 0;
}
export const foodComparison: CustomCalculator = (v) => {
  const kcal = dailyKcal(v);
  const a = costPer1000(nonNeg(v.priceA), nonNeg(v.bagA), pick(v.bagUnit, 2), nonNeg(v.kcalPerKgA));
  const b = costPer1000(nonNeg(v.priceB), nonNeg(v.bagB), pick(v.bagUnit, 2), nonNeg(v.kcalPerKgB));
  return { costPerDayA: round2((a * kcal) / 1000), costPerDayB: round2((b * kcal) / 1000), costPer1000KcalA: round2(a), costPer1000KcalB: round2(b), annualDifference: round2(Math.abs(a - b) * kcal * 0.365), cheaperFood: a === b ? 0 : a < b ? 1 : 2, dailyCalories: Math.round(kcal) };
};

export const treats: CustomCalculator = (v) => {
  const kcal = dailyKcal(v);
  const allow = kcal * (nonNeg(v.treatPercent, 10) / 100);
  return { treatsPerDay: Math.floor(nonNeg(v.kcalPerTreat) > 0 ? allow / nonNeg(v.kcalPerTreat) : 0), treatCalorieAllowance: Math.round(allow), dailyCalories: Math.round(kcal), mealCaloriesAfterTreats: Math.round(kcal - allow) };
};

export const PIG_FACTORS: [string, number][] = [["Adult mini pig (maintenance)", 1], ["Growing piglet (under 1 year)", 1.6], ["Weight loss", 0.8], ["Pregnant sow", 1.25], ["Nursing sow", 2.0]];
export const pigCalorie: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const kcal = 106 * Math.pow(kg, 0.75) * PIG_FACTORS[pick(v.stage, PIG_FACTORS.length)][1];
  const pelletKcal = kcal * 0.75;
  const lb = nonNeg(v.pelletKcalPerLb, 1300) > 0 ? pelletKcal / nonNeg(v.pelletKcalPerLb, 1300) : 0;
  return { dailyCalories: Math.round(kcal), pelletPoundsPerDay: round2(lb), pelletCupsPerDay: round2(lb / 0.3), vegetableCupsPerDay: round2(lb / 0.3 * 0.5), percentBodyWeightFood: round2(kg ? ((lb * LB) / kg) * 100 : 0) };
};

// --- Care & costs --------------------------------------------------------------------------------------------
export const SITTER: [string, number][] = [["Drop-in visit (30 min)", 25], ["Overnight stay in your home", 90], ["Boarding in sitter's home (per night)", 55], ["Cat sitting drop-in (20–30 min)", 22], ["House sitting (24 h, live-in)", 75]];
export const petSitter: CustomCalculator = (v) => {
  const base = nonNeg(v.rateOverride) > 0 ? nonNeg(v.rateOverride) : SITTER[pick(v.service, SITTER.length)][1];
  const per = base * (1 + safeNumber(v.marketAdjust) / 100) + Math.max(0, Math.round(nonNeg(v.pets, 1)) - 1) * nonNeg(v.extraPetFee);
  const n = Math.max(0, nonNeg(v.units));
  const holiday = Math.min(n, nonNeg(v.holidayUnits)) * per * (nonNeg(v.holidaySurcharge) / 100);
  const meds = n * nonNeg(v.medsFee);
  const total = per * n + holiday + meds;
  return { totalCost: round2(total), pricePerVisitOrNight: round2(per), holidayCharges: round2(holiday), medicationFees: round2(meds), tipSuggestion: round2(total * 0.15) };
};

export const WALKS: [number, number][] = [[15, 15], [30, 22], [45, 30], [60, 38]];
export const dogWalking: CustomCalculator = (v) => {
  const [, rate] = WALKS[pick(v.duration, WALKS.length)];
  const per = (nonNeg(v.rateOverride) > 0 ? nonNeg(v.rateOverride) : rate) * (1 + safeNumber(v.marketAdjust) / 100) + Math.max(0, Math.round(nonNeg(v.dogs, 1)) - 1) * nonNeg(v.extraDogFee);
  const week = per * nonNeg(v.walksPerWeek);
  const hours = (WALKS[pick(v.duration, WALKS.length)][0] + nonNeg(v.travelMinutes)) / 60;
  return { pricePerWalk: round2(per), weeklyCost: round2(week), monthlyCost: round2(week * 4.33), annualCost: round2(week * 52), walkerHourlyEarnings: round2(hours > 0 ? per / hours : 0) };
};

export const transport: CustomCalculator = (v) => {
  const mode = pick(v.mode, 4);
  const lbs = pick(v.weightUnit, 2) === 0 ? nonNeg(v.weight) : nonNeg(v.weight) / LB;
  const crate = (nonNeg(v.crateL) * nonNeg(v.crateW) * nonNeg(v.crateH)) / 166;
  const bill = Math.max(lbs + 15, crate);
  let carrier: number;
  if (mode === 0) carrier = nonNeg(v.cabinFee, 150) * (yes(v.roundTrip) ? 2 : 1);
  else if (mode === 1) carrier = Math.max(350, 200 + bill * 3 * (1 + nonNeg(v.miles) / 3000)) * (yes(v.roundTrip) ? 2 : 1);
  else if (mode === 2) carrier = Math.max(300, nonNeg(v.miles) * nonNeg(v.perMile, 1.1));
  else carrier = Math.max(1500, 600 + bill * 8);
  const vet = nonNeg(v.healthCertificate, 150) + (mode === 3 ? 173 + nonNeg(v.importFees) : 0);
  const total = carrier + vet + nonNeg(v.crateCost);
  return { totalCost: round2(total), carrierCharge: round2(carrier), vetAndPaperwork: round2(vet), billableWeightLb: round2(mode === 1 || mode === 3 ? bill : lbs), crateCost: round2(nonNeg(v.crateCost)) };
};

export const invisibleFence: CustomCalculator = (v) => {
  const ft = nonNeg(v.perimeterFt);
  const dogs = Math.max(1, Math.round(nonNeg(v.dogs, 1)));
  const diy = 200 + Math.max(0, ft - 500) * 0.12 + (dogs - 1) * 120;
  const pro = Math.max(1200, 800 + ft * 1.5) + (dogs - 1) * 250;
  const gps = dogs * nonNeg(v.gpsCollarPrice, 500) + dogs * 12 * nonNeg(v.gpsMonthlyFee);
  return { diyWiredCost: round2(diy), proInstalledCost: round2(pro), gpsCollarFirstYear: round2(gps), acres: round2(Math.pow(ft / 4, 2) / 43560), cheapestOption: diy <= Math.min(pro, gps) ? 1 : gps < pro ? 3 : 2 };
};

export const dogWorth: CustomCalculator = (v) => {
  const base = nonNeg(v.breedPrice);
  const ped = [0.7, 1, 1.4, 2.2][pick(v.pedigree, 4)];
  const age = [1, 0.75, 0.5, 0.25][pick(v.age, 4)];
  const train = [0, 500, 2500, 25000][pick(v.training, 4)];
  const health = yes(v.healthTested) ? 1.15 : 1;
  const market = base * ped * age * health;
  return { estimatedMarketValue: round2(market + train * 0.5), replacementCost: round2(base * ped * health + train), trainingValue: round2(train), pedigreeFactor: ped };
};

export const akcPoints: CustomCalculator = (v) => {
  const pts = nonNeg(v.points);
  const majors = Math.round(nonNeg(v.majors));
  const judges = Math.round(nonNeg(v.majorJudges));
  const champs = Math.round(nonNeg(v.showsDefeatingChampion));
  const levels = [25, 100, 200, 400, 800];
  const next = levels.find((l) => l > pts) ?? 0;
  const eligible = pts >= 25 && majors >= 3 && judges >= 3 && champs >= 3 && yes(v.isChampion);
  return { pointsRemaining: round2(Math.max(0, 25 - pts)), majorsRemaining: Math.max(0, 3 - majors), majorJudgesRemaining: Math.max(0, 3 - judges), championWinsRemaining: Math.max(0, 3 - champs), grandChampionEligible: eligible ? 1 : 0, nextLevelPoints: next, pointsToNextLevel: round2(next ? next - pts : 0) };
};

export const PROHEART_BANDS: [number, number][] = [[25, 95], [50, 145], [75, 195], [100, 245], [Infinity, 295]];
export const proheart: CustomCalculator = (v) => {
  const kg = kgOf(v);
  const lb = kg / LB;
  const ml = kg * 0.05;
  const band = PROHEART_BANDS.find(([max]) => lb <= max) ?? PROHEART_BANDS[4];
  const price = (nonNeg(v.priceOverride) > 0 ? nonNeg(v.priceOverride) : band[1]) * (1 + safeNumber(v.marketAdjust) / 100);
  const monthly = nonNeg(v.monthlyPreventive) * 12;
  return { annualInjectionCost: round2(price), doseMl: round2(ml), doseMgMoxidectin: round2(kg * 0.5), monthlyPreventiveAnnualCost: round2(monthly), annualSavings: round2(monthly - price), costPerMonthEquivalent: round2(price / 12) };
};

export const HARNESS: [string, number, number][] = [["XS", 13, 17], ["S", 17, 22], ["M", 22, 27], ["L", 27, 32], ["XL", 32, 40], ["XXL", 40, 48]];
export const harnessSize: CustomCalculator = (v) => {
  const girth = pick(v.unit, 2) === 0 ? nonNeg(v.chestGirth) : nonNeg(v.chestGirth) / 2.54;
  const fit = girth + 1;
  const idx = HARNESS.findIndex(([, , hi]) => fit <= hi);
  const i = idx === -1 ? HARNESS.length - 1 : idx;
  const between = idx !== -1 && fit > HARNESS[i][2] - 1;
  return { sizeIndex: i + 1, chestRangeLowIn: HARNESS[i][1], chestRangeHighIn: HARNESS[i][2], measuredChestIn: round2(girth), betweenSizes: between ? 1 : 0, neckOpeningMinIn: round2(nonNeg(v.neck) > 0 ? (pick(v.unit, 2) === 0 ? nonNeg(v.neck) : nonNeg(v.neck) / 2.54) + 1 : 0) };
};

export const petsFoodCustomCalculators: Record<string, CustomCalculator> = {
  "dog-food-calculator": dogFood,
  "dog-calorie-calculator": dogCalorie,
  "cat-calorie-calculator": catCalorie,
  "cat-food-calculator": catFood,
  "raw-dog-food-calculator": rawDog,
  "puppy-food-calculator": puppyFood,
  "homemade-dog-food-calculator": homemade,
  "dry-matter-calculator": dryMatter,
  "pet-food-calorie-content-calculator": foodCalories,
  "pet-water-intake-calculator": waterIntake,
  "kitten-feeding-chart-calculator": kittenFeeding,
  "raw-cat-food-calculator": rawCat,
  "how-long-will-dog-food-last-calculator": foodLast,
  "dog-food-transition-calculator": transition,
  "dog-food-comparison-calculator": foodComparison,
  "dog-treats-per-day-calculator": treats,
  "mini-pig-calorie-calculator": pigCalorie,
  "pet-sitter-rates-calculator": petSitter,
  "dog-walking-rate-calculator": dogWalking,
  "pet-transport-cost-calculator": transport,
  "invisible-fence-cost-calculator": invisibleFence,
  "how-much-is-my-dog-worth-calculator": dogWorth,
  "akc-grand-champion-points-calculator": akcPoints,
  "proheart-12-cost-calculator": proheart,
  "dog-harness-size-calculator": harnessSize,
};
