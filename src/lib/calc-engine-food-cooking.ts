/**
 * Batch: "Food & Drink Calculators" → Cooking Time, Meat & Curing Calculators.
 *
 * Data / methods:
 *  - USDA turkey roasting at 325 °F (unstuffed / stuffed, hours, interpolated between the chart's
 *    weight bands): 8 lb 2.75 / 3, 12 lb 3 / 3.5, 14 lb 3.75 / 4, 18 lb 4.25 / 4.25, 20 lb 4.5 / 4.75,
 *    24 lb 5 / 5.25; bone-in breast 4 lb 1.5 h, 8 lb 3.25 h; spatchcocked at 450 °F ≈ 7 min/lb.
 *    Thawing (USDA / Butterball): refrigerator 1 day per 4 lb; cold water 30 min per lb.
 *  - Deep-frying turkey: ≈ 3.5 min/lb whole, 6 min/lb breast, oil at 350 °F; birds over 14 lb not advised.
 *  - USDA ham chart at 325 °F (min/lb): fully cooked whole bone-in 15–18, half 18–24, spiral 10–14,
 *    boneless 10–15 (to 140 °F); cook-before-eating whole 18–20, half 22–25, shank/butt 35–40, fresh 22–26 (145 °F).
 *  - USDA lamb leg at 325 °F (min/lb): bone-in MR 20–25, medium 25–30, well 30–35; boneless +5.
 *  - Beef doneness pull temps (°F, final after rest): rare 120 (125), MR 130 (135), medium 140 (145),
 *    medium-well 150 (155), well 155 (160). USDA safe minimum for whole cuts 145 °F + 3 min rest.
 *  - Smoking times at 225 °F (h/lb): brisket 1.5, pork shoulder 1.5, beef ribs 1.25, whole chicken
 *    0.75, turkey 0.6, pork loin 0.75, salmon 0.5 (per lb of fillet); racks of ribs fixed 6 h spare /
 *    5 h baby back. 250 °F ≈ ×0.8, 275 °F ≈ ×0.67.
 *  - Curing: Prague Powder #1 / #2 at 0.25% of total weight (≈156 ppm ingoing nitrite, USDA max
 *    for comminuted products); 1 level tsp ≈ 5.5 g. Equilibrium cure on meat (+ water for brines).
 *  - Salt by volume (g per cup): table 288, Morton kosher 230, Diamond Crystal kosher 135.
 *  - Raw-to-cooked yields (cooked ÷ raw): USDA Table of Cooking Yields typical values.
 *  - Shelf life: USDA FoodKeeper (lower end of the refrigerator range, quality range for freezer).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-food-cooking-calculators.ts for the copy.
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
const LB = 0.45359237;
/** Pounds from a weight + unit dropdown (0 lb, 1 kg). */
const lbOf = (w: number, unit: number) => (pick(unit, 2) === 1 ? nonNeg(w) / LB : nonNeg(w));
/** Linear interpolation over [x, y] points, extrapolating with the end segments. */
function interp(pts: [number, number][], x: number) {
  if (x <= pts[0][0]) { const [[x0, y0], [x1, y1]] = pts; return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0); }
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (x <= x1) return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
  }
  const [x0, y0] = pts[pts.length - 2];
  const [x1, y1] = pts[pts.length - 1];
  return y1 + ((x - x1) * (y1 - y0)) / (x1 - x0);
}
const timeOut = (minutes: number) => ({ totalMinutes: Math.round(minutes), totalHours: round2(minutes / 60) });

export const DONENESS: [string, number, number][] = [["Rare", 120, 125], ["Medium-rare", 130, 135], ["Medium", 140, 145], ["Medium-well", 150, 155], ["Well done", 155, 160]];

export const SALTS: [string, number][] = [["Diamond Crystal kosher", 135], ["Morton kosher", 230], ["Table salt / fine sea salt", 288]];
export const BRINE_FOODS: [string, number, number, number][] = [
  // name, hours per lb, minimum hours, maximum hours (at ~5–6% brine)
  ["Whole turkey", 1, 8, 24], ["Turkey breast", 1, 4, 12], ["Whole chicken", 1, 4, 12], ["Chicken pieces", 0, 1, 4], ["Pork chops", 0, 2, 6], ["Pork loin / tenderloin", 1, 4, 12], ["Shrimp", 0, 0.5, 1], ["Fish fillets", 0, 0.5, 1],
];
export const brine: CustomCalculator = (v) => {
  const liters = pick(v.volumeUnit, 2) === 1 ? nonNeg(v.water) : nonNeg(v.water) * 3.785411784;
  const waterG = liters * 1000;
  const sal = nonNeg(v.salinity, 6) / 100;
  const saltG = sal < 1 ? (waterG * sal) / (1 - sal) : 0;
  const sugarG = waterG * (nonNeg(v.sugarPercent) / 100);
  const [, perLb, min, max] = BRINE_FOODS[pick(v.food, BRINE_FOODS.length)];
  const hours = Math.min(max, Math.max(min, lbOf(v.meatWeight, v.weightUnit) * perLb)) * (sal > 0 ? Math.min(2, 0.06 / sal) : 1);
  const perCup = SALTS[pick(v.saltType, SALTS.length)][1];
  return { saltGrams: round2(saltG), saltCups: round2(saltG / perCup), saltTablespoons: round2((saltG / perCup) * 16), sugarGrams: round2(sugarG), sugarCups: round2(sugarG / 200), brineHours: round2(hours), waterLiters: round2(liters) };
};

const TURKEY_UNSTUFFED: [number, number][] = [[8, 2.75], [12, 3], [14, 3.75], [18, 4.25], [20, 4.5], [24, 5]];
const TURKEY_STUFFED: [number, number][] = [[8, 3], [12, 3.5], [14, 4], [18, 4.25], [20, 4.75], [24, 5.25]];
const TURKEY_BREAST: [number, number][] = [[4, 1.5], [8, 3.25]];
export const turkeyCook: CustomCalculator = (v) => {
  const lb = lbOf(v.weight, v.weightUnit);
  const style = pick(v.style, 4);
  const hours = lb <= 0 ? 0 : style === 0 ? interp(TURKEY_UNSTUFFED, lb) : style === 1 ? interp(TURKEY_STUFFED, lb) : style === 2 ? interp(TURKEY_BREAST, lb) : (lb * 7) / 60;
  const m = Math.max(0, hours * 60);
  return { ...timeOut(m), ovenTempF: style === 3 ? 450 : 325, checkTempAtMinutes: Math.round(Math.max(0, m - 30)), restMinutes: lb >= 12 ? 30 : 20, startBeforeServingHours: round2((m + (lb >= 12 ? 30 : 20) + 30) / 60), servings: Math.floor(lb / (style === 2 ? 0.75 : 1.25)) };
};

export const primeRib: CustomCalculator = (v) => {
  const lb = lbOf(v.weight, v.weightUnit);
  const d = pick(v.doneness, DONENESS.length);
  const method = pick(v.method, 3);
  const perLb = method === 0 ? [13, 15, 17, 19, 21][d] : method === 1 ? [30, 33, 37, 41, 45][d] : 5; // 325 °F; reverse sear 250 °F; closed-oven 500 °F
  const m = lb * perLb + (method === 1 ? 10 : method === 2 ? 120 : 0);
  const boneIn = pick(v.boneIn, 2) === 1;
  return { ...timeOut(m), pullTempF: DONENESS[d][1], finalTempF: DONENESS[d][2], restMinutes: 30, servings: Math.floor(lb / (boneIn ? 1 : 0.5)), ribBones: boneIn ? Math.max(1, Math.round(lb / 2.25)) : 0 };
};

export const SMOKE_MEATS: [string, number, number, number][] = [
  // name, hours per lb at 225 °F, fixed hours (0 = per lb), target internal °F
  ["Brisket (whole packer)", 1.5, 0, 203], ["Pork shoulder / butt", 1.5, 0, 200], ["Beef ribs (plate)", 1.25, 0, 203], ["Spare ribs (St. Louis), per rack", 0, 6, 195], ["Baby back ribs, per rack", 0, 5, 195], ["Whole chicken", 0.75, 0, 165], ["Whole turkey", 0.6, 0, 165], ["Pork loin", 0.75, 0, 145], ["Salmon fillet", 0.5, 0, 145], ["Tri-tip", 0.75, 0, 130],
];
export const meatSmoking: CustomCalculator = (v) => {
  const [, perLb, fixed, target] = SMOKE_MEATS[pick(v.meat, SMOKE_MEATS.length)];
  const f = [1, 0.8, 0.67][pick(v.smokerTemp, 3)];
  const wrap = pick(v.wrap, 2) === 1 ? 0.85 : 1;
  const hours = (fixed > 0 ? fixed : lbOf(v.weight, v.weightUnit) * perLb) * f * wrap;
  const rest = fixed > 0 || perLb < 1 ? 0.25 : 1;
  return { smokeHours: round2(hours), smokeMinutes: Math.round(hours * 60), targetInternalF: target, restHours: rest, startBeforeServingHours: round2(hours + rest + 0.5), smokerTempF: [225, 250, 275][pick(v.smokerTemp, 3)] };
};

export const curingSalt: CustomCalculator = (v) => {
  const meatG = lbOf(v.meatWeight, v.weightUnit) * 453.59237;
  const brineMode = pick(v.method, 3) === 2;
  const waterG = brineMode ? (pick(v.volumeUnit, 2) === 1 ? nonNeg(v.water) : nonNeg(v.water) * 3.785411784) * 1000 : 0;
  const total = meatG + waterG;
  const cure = total * 0.0025;
  const salt = Math.max(0, total * (nonNeg(v.saltPercent, 2.5) / 100) - cure * 0.9375);
  return { cureGrams: round2(cure), cureTeaspoons: round2(cure / 5.5), ingoingNitritePpm: total > 0 ? Math.round(((cure * 0.0625) / total) * 1e6) : 0, saltGrams: round2(salt), totalWeightGrams: Math.round(total), brineCureTime: brineMode ? Math.max(5, Math.round(lbOf(v.meatWeight, v.weightUnit) * 1.5)) : 0 };
};

export const HAMS: [string, number, number, number][] = [
  // name, min/lb low, min/lb high, target °F
  ["Fully cooked, whole bone-in", 15, 18, 140], ["Fully cooked, half bone-in", 18, 24, 140], ["Fully cooked, spiral-cut", 10, 14, 140], ["Fully cooked, boneless", 10, 15, 140], ["Cook-before-eating, whole", 18, 20, 145], ["Cook-before-eating, half", 22, 25, 145], ["Cook-before-eating, shank or butt", 35, 40, 145], ["Fresh (raw) ham, whole leg", 22, 26, 145],
];
export const hamCooking: CustomCalculator = (v) => {
  const lb = lbOf(v.weight, v.weightUnit);
  const [, lo, hi, target] = HAMS[pick(v.hamType, HAMS.length)];
  const mid = (lo + hi) / 2;
  return { ...timeOut(lb * mid), minMinutes: Math.round(lb * lo), maxMinutes: Math.round(lb * hi), targetTempF: target, servings: Math.floor(lb / (pick(v.hamType, HAMS.length) === 3 ? 0.33 : 0.5)), glazeAtMinutes: Math.round(Math.max(0, lb * mid - 20)) };
};

export const brisket: CustomCalculator = (v) => {
  const lb = lbOf(v.weight, v.weightUnit);
  const perLb = [1.5, 1.25, 1.0][pick(v.smokerTemp, 3)];
  const wrap = pick(v.wrap, 2) === 1 ? 0.85 : 1;
  const hours = lb * perLb * wrap;
  const trimmed = lb * (1 - nonNeg(v.trimPercent, 20) / 100);
  const cooked = trimmed * (nonNeg(v.cookedYield, 60) / 100);
  return { cookHours: round2(hours), cookedWeightLb: round2(cooked), servings: Math.floor(cooked / 0.33), restHours: 2, startBeforeServingHours: round2(hours + 2 + 0.5), trimmedWeightLb: round2(trimmed), targetInternalF: 203 };
};

export const lambLeg: CustomCalculator = (v) => {
  const lb = lbOf(v.weight, v.weightUnit);
  const d = pick(v.doneness, 3);
  const perLb = [22.5, 27.5, 32.5][d] + (pick(v.cut, 2) === 1 ? 5 : 0);
  const pull = [130, 140, 155][d];
  return { ...timeOut(lb * perLb), pullTempF: pull, finalTempF: pull + 5, minutesPerLb: perLb, restMinutes: 15, servings: Math.floor(lb / (pick(v.cut, 2) === 1 ? 0.4 : 0.6)) };
};

export const YIELDS: [string, number][] = [
  ["Ground beef (80/20)", 0.75], ["Beef steak / roast", 0.72], ["Chicken breast (boneless)", 0.75], ["Chicken thigh (boneless)", 0.7], ["Pork chop / loin", 0.72], ["Pork shoulder (pulled)", 0.6], ["Brisket (smoked)", 0.55], ["Bacon", 0.33], ["Fish fillet", 0.82], ["Shrimp", 0.8], ["White rice (dry → cooked)", 3], ["Brown rice", 2.6], ["Pasta (dry → cooked)", 2.25], ["Quinoa", 2.75], ["Oats (rolled, cooked)", 2.5], ["Lentils / dried beans", 2.4], ["Spinach / leafy greens", 0.5], ["Potatoes (baked)", 0.9],
];
export const rawToCooked: CustomCalculator = (v) => {
  const y = YIELDS[pick(v.food, YIELDS.length)][1];
  const reverse = pick(v.direction, 2) === 1;
  const w = nonNeg(v.weight);
  const raw = reverse ? w / y : w;
  const cooked = reverse ? w : w * y;
  const kcalRaw = nonNeg(v.caloriesPer100Raw);
  return { cookedWeight: round2(cooked), rawWeight: round2(raw), yieldPercent: round2(y * 100), changeWeight: round2(cooked - raw), caloriesPer100Cooked: round2(y > 0 ? kcalRaw / y : 0), proteinPer100Cooked: round2(y > 0 ? nonNeg(v.proteinPer100Raw) / y : 0) };
};

export const sirloinRoast: CustomCalculator = (v) => {
  const lb = lbOf(v.weight, v.weightUnit);
  const d = pick(v.doneness, DONENESS.length);
  const perLb = [20, 25, 30, 33, 35][d] * (pick(v.ovenTemp, 2) === 1 ? 0.85 : 1);
  return { ...timeOut(lb * perLb), pullTempF: DONENESS[d][1], finalTempF: DONENESS[d][2], minutesPerLb: round2(perLb), restMinutes: 15, servings: Math.floor(lb / 0.5) };
};

export const perPound: CustomCalculator = (v) => {
  const metric = pick(v.weightUnit, 2) === 1;
  const units = metric ? nonNeg(v.weight) * 2 : nonNeg(v.weight); // per 500 g when metric
  const m = units * nonNeg(v.minutesPerUnit, 15) + nonNeg(v.extraMinutes);
  const rest = nonNeg(v.restMinutes, 15);
  return { ...timeOut(m), withRestMinutes: Math.round(m + rest), startBeforeServingHours: round2((m + rest + nonNeg(v.preheatMinutes, 15)) / 60), checkAtMinutes: Math.round(m * 0.8) };
};

export const equilibriumCure: CustomCalculator = (v) => {
  const g = lbOf(v.meatWeight, v.weightUnit) * 453.59237;
  const cure = pick(v.useCure, 2) === 1 ? g * 0.0025 : 0;
  const salt = g * (nonNeg(v.saltPercent, 2.5) / 100) - cure * 0.9375;
  const thicknessIn = pick(v.thicknessUnit, 2) === 1 ? nonNeg(v.thickness) / 25.4 : nonNeg(v.thickness);
  return { saltGrams: round2(Math.max(0, salt)), sugarGrams: round2(g * (nonNeg(v.sugarPercent, 1) / 100)), cureGrams: round2(cure), cureTeaspoons: round2(cure / 5.5), cureDays: Math.ceil(thicknessIn / 0.25) + 1, meatGrams: Math.round(g), pepperGrams: round2(g * (nonNeg(v.pepperPercent) / 100)) };
};

export const FAT_SOURCES: [string, number][] = [["Pork back fat (≈ 85% fat)", 85], ["Pork fat trimmings (≈ 70%)", 70], ["Beef fat trimmings (≈ 75%)", 75], ["Pork butt / shoulder (≈ 25%)", 25], ["Bacon ends (≈ 45%)", 45]];
export const venisonFat: CustomCalculator = (v) => {
  const lb = lbOf(v.venisonWeight, v.weightUnit);
  const fv = nonNeg(v.venisonFatPercent, 3) / 100;
  const t = nonNeg(v.targetFatPercent, 20) / 100;
  const ff = FAT_SOURCES[pick(v.fatSource, FAT_SOURCES.length)][1] / 100;
  const add = ff > t && t > fv ? (lb * (t - fv)) / (ff - t) : 0;
  const k = pick(v.weightUnit, 2) === 1 ? LB : 1;
  return { fatToAdd: round2(add * k), totalBatch: round2((lb + add) * k), finalFatPercent: round2(lb + add > 0 ? ((lb * fv + add * ff) / (lb + add)) * 100 : 0), fatShareOfBatch: round2(lb + add > 0 ? (add / (lb + add)) * 100 : 0), pattiesQuarterLb: Math.floor((lb + add) * 4) };
};

export const steak: CustomCalculator = (v) => {
  const inches = pick(v.thicknessUnit, 2) === 1 ? nonNeg(v.thickness) / 2.54 : nonNeg(v.thickness, 1);
  const d = pick(v.doneness, DONENESS.length);
  const base = [3, 4, 5, 6, 7][d]; // minutes per side at 1 inch, high direct heat
  const method = pick(v.method, 3);
  const perSide = method === 2 ? 1 : base * Math.pow(Math.max(0.25, inches), 1.1) * [1, 1.1][method]; // reverse sear: 1-minute sear per side
  const reverseSearMin = method === 2 ? Math.round(inches * [30, 35, 40, 45, 50][d]) : 0;
  return { minutesPerSide: round2(perSide), totalMinutes: round2(method === 2 ? reverseSearMin + 2 : perSide * 2), pullTempF: DONENESS[d][1] - 5, finalTempF: DONENESS[d][2], restMinutes: 5, reverseSearOvenMinutes: reverseSearMin };
};

export const CHICKEN: [string, number, number][] = [
  // name, minutes (per lb for whole), per-lb flag
  ["Whole chicken (350 °F)", 22, 1], ["Bone-in breast (375 °F)", 40, 0], ["Boneless breast (400 °F)", 22, 0], ["Bone-in thighs (400 °F)", 40, 0], ["Boneless thighs (400 °F)", 22, 0], ["Drumsticks (425 °F)", 40, 0], ["Wings (400 °F)", 42, 0], ["Chicken tenders (400 °F)", 15, 0],
];
export const chickenCook: CustomCalculator = (v) => {
  const [, mins, perLb] = CHICKEN[pick(v.cut, CHICKEN.length)];
  const method = pick(v.method, 3);
  const size = [0.85, 1, 1.2][pick(v.size, 3)];
  const base = perLb ? lbOf(v.weight, v.weightUnit) * mins : mins * size;
  const m = base * [1, 0.75, 0.9][method];
  return { ...timeOut(m), targetInternalF: 165, checkAtMinutes: Math.round(m * 0.85), restMinutes: perLb ? 15 : 5, flipAtMinutes: method > 0 && !perLb ? Math.round(m / 2) : 0 };
};

export const turkeyFry: CustomCalculator = (v) => {
  const lb = lbOf(v.weight, v.weightUnit);
  const perLb = pick(v.cut, 2) === 1 ? 6 : 3.5;
  const fry = lb * perLb;
  const displacementQt = lb * 0.48;
  const oilQt = Math.max(0, nonNeg(v.potQuarts, 30) * 0.7 - displacementQt);
  return { fryMinutes: Math.round(fry), fryHours: round2(fry / 60), oilQuarts: round2(oilQt), oilGallons: round2(oilQt / 4), totalWithHeatAndRest: Math.round(fry + 45 + 20), tooLargeWarning: lb > 14 ? 1 : 0 };
};

export const thawing: CustomCalculator = (v) => {
  const lb = lbOf(v.weight, v.weightUnit);
  const cook = safeNumber(v.cookDate);
  const fridge = pick(v.method, 2) === 0;
  const days = fridge ? Math.ceil(lb / 4) : 0;
  const waterHours = lb * 0.5;
  return { startThawDate: fridge ? cook - days : cook, fridgeDays: Math.ceil(lb / 4), coldWaterHours: round2(waterHours), waterChanges: Math.ceil(waterHours * 2), daysFromToday: Math.round((fridge ? cook - days : cook) - safeNumber(v.today)) };
};

export const FOODS: [string, number, number][] = [
  // name, refrigerator days, freezer months (0 = do not freeze)
  ["Raw ground meat or poultry", 1, 4], ["Raw steaks, chops, roasts", 3, 6], ["Raw chicken or turkey (pieces)", 1, 9], ["Raw fish (lean)", 1, 6], ["Raw fatty fish (salmon)", 1, 3], ["Cooked leftovers / casseroles", 3, 3], ["Cooked chicken", 3, 4], ["Cooked rice or pasta", 3, 2], ["Soups and stews", 3, 3], ["Pizza", 3, 2], ["Deli meat (opened)", 3, 2], ["Hot dogs (opened)", 7, 2], ["Bacon (opened)", 7, 1], ["Raw eggs in shell", 21, 0], ["Hard-boiled eggs", 7, 0], ["Milk (opened)", 7, 3], ["Hard cheese (opened)", 21, 6], ["Soft cheese (opened)", 7, 0], ["Fresh berries", 3, 8], ["Opened jarred pasta sauce", 5, 6],
];
export const shelfLife: CustomCalculator = (v) => {
  const [, fridge, freezer] = FOODS[pick(v.food, FOODS.length)];
  const stored = safeNumber(v.storedDate);
  const today = safeNumber(v.today);
  const fridgeBy = stored + fridge;
  const freezeBy = freezer > 0 ? stored + Math.round(freezer * 30.4) : 0;
  return { useByFridge: fridgeBy, fridgeDaysLeft: Math.round(fridgeBy - today), fridgeDays: fridge, freezerMonths: freezer, bestByFreezer: freezeBy, freezerDaysLeft: freezer > 0 ? Math.round(freezeBy - today) : 0 };
};

export const jerkyYield: CustomCalculator = (v) => {
  const lb = lbOf(v.rawWeight, v.weightUnit);
  const trimmed = lb * (1 - nonNeg(v.trimPercent, 10) / 100);
  const jerky = trimmed * (nonNeg(v.dryYield, 40) / 100);
  const cost = lb * nonNeg(v.pricePerLb) + nonNeg(v.marinadeCost);
  const oz = jerky * 16;
  return { jerkyOunces: round2(oz), jerkyPounds: round2(jerky), costPerOunce: round2(oz > 0 ? cost / oz : 0), totalCost: round2(cost), servings1oz: Math.floor(oz), marinadeCups: round2(trimmed / 2), trimmedWeightLb: round2(trimmed) };
};

export const SAUSAGE_TYPES: [string, number, number][] = [["Fresh sausage (breakfast, Italian, bratwurst)", 1.7, 0], ["Smoked / cooked sausage (kielbasa, summer)", 2.0, 1], ["Dry-cured (salami, pepperoni)", 2.8, 2]];
export const sausageSalt: CustomCalculator = (v) => {
  const g = lbOf(v.meatWeight, v.weightUnit) * 453.59237;
  const [, saltPct, cureType] = SAUSAGE_TYPES[pick(v.type, SAUSAGE_TYPES.length)];
  const pctUsed = nonNeg(v.saltPercent) > 0 ? nonNeg(v.saltPercent) : saltPct;
  const cure = cureType > 0 ? g * 0.0025 : 0;
  const salt = g * (pctUsed / 100) - cure * 0.9375;
  return { saltGrams: round2(Math.max(0, salt)), saltTablespoonsMorton: round2(Math.max(0, salt) / 14.4), cureGrams: round2(cure), cureType, iceWaterGrams: round2(g * (nonNeg(v.waterPercent, 10) / 100)), binderGrams: round2(g * (nonNeg(v.binderPercent) / 100)), saltPercentUsed: pctUsed };
};

export const foodCookingCustomCalculators: Record<string, CustomCalculator> = {
  "brine-calculator": brine,
  "turkey-cook-time-calculator": turkeyCook,
  "prime-rib-calculator": primeRib,
  "meat-smoking-calculator": meatSmoking,
  "curing-salt-calculator": curingSalt,
  "ham-cooking-time-calculator": hamCooking,
  "brisket-calculator": brisket,
  "leg-of-lamb-cooking-time-calculator": lambLeg,
  "raw-to-cooked-calculator": rawToCooked,
  "sirloin-roast-cooking-time-calculator": sirloinRoast,
  "15-minutes-per-pound-calculator": perPound,
  "equilibrium-cure-calculator": equilibriumCure,
  "venison-to-fat-ratio-calculator": venisonFat,
  "steak-calculator": steak,
  "chicken-cooking-time-calculator": chickenCook,
  "turkey-fry-time-calculator": turkeyFry,
  "butterball-turkey-thawing-calculator": thawing,
  "food-shelf-life-calculator": shelfLife,
  "beef-jerky-yield-calculator": jerkyYield,
  "sausage-salt-calculator": sausageSalt,
};
