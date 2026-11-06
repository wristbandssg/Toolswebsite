/**
 * Batch: "Food & Drink Calculators" → Baking & Recipe Calculators and Party & Event Food Calculators.
 *
 * Data / methods:
 *  - Ingredient densities (g per US cup): water 236.6, milk 245, all-purpose flour 120, bread flour 127,
 *    granulated sugar 200, brown sugar (packed) 213, powdered sugar 120, butter 227, oil 218, honey 340,
 *    rolled oats 90, cocoa 85, white rice 185, table salt 288. 1 cup = 16 tbsp = 48 tsp = 8 fl oz.
 *  - Baker's percentages are relative to total flour = 100%. Sourdough starter at hydration h splits into
 *    flour = starter ÷ (1 + h) and water = starter × h ÷ (1 + h).
 *  - Desired dough temperature: water = DDT × 3 − (room + flour + friction); × 4 with a preferment.
 *  - Fermentation speed roughly doubles per 17 °F (≈ 9.5 °C) warmer (Q10 ≈ 2).
 *  - Fresh : dried herbs — leafy 3 : 1, ground 6 : 1, fresh ginger : ground 12 : 1.
 *  - Butter ≈ 81% fat and 16% water (USDA); shortening and oil 100% fat; shortening 191 g/cup.
 *  - High-altitude baking adjustments (Colorado State University Extension P-2,
 *    King Arthur): bands 3,000 / 5,000 / 7,000 ft for leavening, sugar, liquid, flour, temperature.
 *  - Ice cream components: whole milk 3.5% fat / 8.7% MSNF; heavy cream 36% fat / 5.5% MSNF; egg yolk
 *    (17 g) 32% fat, 50% solids; skim milk powder 96% MSNF.
 *  - Frosting: surface area × ¼ in, 14.44 in³ per cup (matches Wilton's 3½ cups for an 8 in 2-layer);
 *    American buttercream per cup ≈ ¼ cup butter, 1 cup powdered sugar, 2 tsp milk.
 *  - Ball pectin: package recipe scaled; 6 tbsp Ball Classic = 1 box of other brands; ≤ 10 jars per batch.
 *  - Party portions follow common caterer guides (e.g. 6 oz cooked protein per guest at a meal).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-food-baking-calculators.ts for the copy.
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
const toF = (t: number, unit: number) => (pick(unit, 2) === 1 ? safeNumber(t) * 1.8 + 32 : safeNumber(t));

// ---------- Baking & recipe ----------

export const recipeScale: CustomCalculator = (v) => {
  const mode = pick(v.mode, 3);
  let factor = nonNeg(v.multiplier, 1);
  if (mode === 0) factor = nonNeg(v.originalServings) > 0 ? nonNeg(v.newServings) / nonNeg(v.originalServings) : 0;
  if (mode === 1) {
    const area = (shape: number, size: number, size2: number) => (pick(shape, 3) === 0 ? Math.PI * (size / 2) ** 2 : pick(shape, 3) === 1 ? size * size : size * size2);
    const a0 = area(v.originalShape, nonNeg(v.originalSize), nonNeg(v.originalSize2));
    factor = a0 > 0 ? area(v.newShape, nonNeg(v.newSize), nonNeg(v.newSize2)) / a0 : 0;
  }
  return { scaleFactor: round2(factor), ingredient1: round2(nonNeg(v.ing1) * factor), ingredient2: round2(nonNeg(v.ing2) * factor), ingredient3: round2(nonNeg(v.ing3) * factor), ingredient4: round2(nonNeg(v.ing4) * factor), eggs: Math.max(0, Math.round(nonNeg(v.eggs) * factor)) };
};

export const sourdoughHydration: CustomCalculator = (v) => {
  const h = nonNeg(v.starterHydration, 100) / 100;
  const starter = nonNeg(v.starter);
  const flour = nonNeg(v.flour) + starter / (1 + h);
  const water = nonNeg(v.water) + (starter * h) / (1 + h);
  const target = nonNeg(v.targetHydration) / 100;
  return { hydration: round2(flour > 0 ? (water / flour) * 100 : 0), totalFlour: round2(flour), totalWater: round2(water), inoculation: round2(nonNeg(v.flour) > 0 ? (starter / nonNeg(v.flour)) * 100 : 0), saltPercent: round2(flour > 0 ? (nonNeg(v.salt) / flour) * 100 : 0), waterForTarget: round2(target > 0 ? Math.max(0, flour * target - (starter * h) / (1 + h)) : 0), totalDough: round2(nonNeg(v.flour) + nonNeg(v.water) + starter + nonNeg(v.salt)) };
};

export const YEAST: [string, number][] = [["Instant dry yeast (IDY)", 1], ["Active dry yeast (ADY)", 1.25], ["Fresh / cake yeast", 3]];
export const pizzaDough: CustomCalculator = (v) => {
  const total = nonNeg(v.balls, 4) * nonNeg(v.ballWeight, 250) * (1 + nonNeg(v.waste, 2) / 100);
  const h = nonNeg(v.hydration, 65) / 100;
  const s = nonNeg(v.saltPercent, 2.8) / 100;
  const y = (nonNeg(v.yeastPercent, 0.3) / 100) * YEAST[pick(v.yeastType, YEAST.length)][1];
  const o = nonNeg(v.oilPercent) / 100;
  const su = nonNeg(v.sugarPercent) / 100;
  const flour = total / (1 + h + s + y + o + su);
  return { flourGrams: round2(flour), waterGrams: round2(flour * h), saltGrams: round2(flour * s), yeastGrams: round2(flour * y), oilGrams: round2(flour * o), sugarGrams: round2(flour * su), totalDoughGrams: round2(total), flourCups: round2(flour / 127) };
};

export const DENSITIES: [string, number][] = [["Water / broth", 236.6], ["Milk", 245], ["All-purpose flour", 120], ["Bread flour", 127], ["Granulated sugar", 200], ["Brown sugar (packed)", 213], ["Powdered sugar", 120], ["Butter", 227], ["Vegetable oil", 218], ["Honey / syrup", 340], ["Rolled oats", 90], ["Cocoa powder", 85], ["White rice (uncooked)", 185], ["Table salt", 288]];
export const UNITS: [string, number, number][] = [
  // name, factor, 0 = volume (in cups) / 1 = mass (in grams)
  ["Cups", 1, 0], ["Tablespoons", 1 / 16, 0], ["Teaspoons", 1 / 48, 0], ["Fluid ounces", 1 / 8, 0], ["Milliliters", 1 / 236.588, 0], ["Liters", 1000 / 236.588, 0], ["Grams", 1, 1], ["Ounces (weight)", 28.3495, 1], ["Pounds", 453.592, 1], ["Kilograms", 1000, 1],
];
export const cookingConvert: CustomCalculator = (v) => {
  const density = DENSITIES[pick(v.ingredient, DENSITIES.length)][1];
  const [, ff, fm] = UNITS[pick(v.fromUnit, UNITS.length)];
  const [, tf, tm] = UNITS[pick(v.toUnit, UNITS.length)];
  const amt = nonNeg(v.amount);
  const grams = fm === 1 ? amt * ff : amt * ff * density;
  const cups = grams / density;
  const result = tm === 1 ? grams / tf : cups / tf;
  return { result: round2(result), grams: round2(grams), ounces: round2(grams / 28.3495), cups: round2(cups), tablespoons: round2(cups * 16), milliliters: round2(cups * 236.588) };
};

export const servingSize: CustomCalculator = (v) => {
  const total = nonNeg(v.totalWeight);
  const mode = pick(v.mode, 2);
  const servings = mode === 0 ? nonNeg(v.servings, 1) : nonNeg(v.portion) > 0 ? total / nonNeg(v.portion) : 0;
  const portion = mode === 0 ? (servings > 0 ? total / servings : 0) : nonNeg(v.portion);
  const k = nonNeg(v.totalCalories);
  return { servingWeight: round2(portion), servings: round2(servings), caloriesPerServing: round2(servings > 0 ? k / servings : 0), proteinPerServing: round2(servings > 0 ? nonNeg(v.totalProtein) / servings : 0), caloriesPer100: round2(total > 0 ? (k / total) * 100 : 0) };
};

export const bakersPercentage: CustomCalculator = (v) => {
  const p = [v.waterPct, v.saltPct, v.yeastPct, v.other1Pct, v.other2Pct].map((x) => nonNeg(x) / 100);
  const sum = 1 + p.reduce((s, x) => s + x, 0);
  const flour = pick(v.mode, 2) === 0 ? nonNeg(v.flour) : nonNeg(v.totalDough) / sum;
  return { flourGrams: round2(flour), waterGrams: round2(flour * p[0]), saltGrams: round2(flour * p[1]), yeastGrams: round2(flour * p[2]), other1Grams: round2(flour * p[3]), other2Grams: round2(flour * p[4]), totalDoughGrams: round2(flour * sum), totalPercent: round2(sum * 100) };
};

export const HERBS: [string, number][] = [["Leafy herbs (basil, parsley, oregano, thyme…) — dried leaf", 3], ["Herbs — ground dried", 6], ["Fresh ginger → ground ginger", 12]];
export const herbConvert: CustomCalculator = (v) => {
  const ratio = HERBS[pick(v.herb, HERBS.length)][1];
  const tsp = nonNeg(v.amount) * [1, 3, 48][pick(v.unit, 3)];
  const out = pick(v.direction, 2) === 0 ? tsp / ratio : tsp * ratio;
  return { resultTeaspoons: round2(out), resultTablespoons: round2(out / 3), resultCups: round2(out / 48), ratio, inputTeaspoons: round2(tsp) };
};

export const sourdoughFeeding: CustomCalculator = (v) => {
  const s = nonNeg(v.starterPart, 1);
  const f = nonNeg(v.flourPart, 1);
  const w = nonNeg(v.waterPart, 1);
  const sum = s + f + w;
  const total = nonNeg(v.totalWanted, 150);
  const unit = sum > 0 ? total / sum : 0;
  const t = toF(v.temp, v.tempUnit);
  const peak = (2.5 + 1.5 * (f / Math.max(0.1, s))) * Math.pow(2, (75 - t) / 17);
  return { starterGrams: round2(unit * s), flourGrams: round2(unit * f), waterGrams: round2(unit * w), hydration: round2(f > 0 ? (w / f) * 100 : 0), hoursToPeak: round2(peak), discardIfKeeping: round2(Math.max(0, nonNeg(v.currentStarter) - unit * s)) };
};

export const FATS: [string, number, number][] = [["Shortening → butter", 1 / 0.81, 1], ["Butter → shortening", 0.81, 0], ["Shortening → vegetable oil", 0.875, 0], ["Butter → vegetable oil", 0.75, 0]];
export const fatSwap: CustomCalculator = (v) => {
  const [, factor, addsWater] = FATS[pick(v.swap, FATS.length)];
  const cups = pick(v.unit, 2) === 1 ? nonNeg(v.amount) / [191, 227, 191, 227][pick(v.swap, 4)] : nonNeg(v.amount);
  const outCups = cups * factor;
  const outG = outCups * [227, 191, 218, 218][pick(v.swap, 4)];
  return { resultCups: round2(outCups), resultTablespoons: round2(outCups * 16), resultGrams: round2(outG), reduceLiquidTbsp: round2(addsWater ? outCups * 16 * 0.16 : 0), addLiquidTbsp: round2(!addsWater && pick(v.swap, 4) === 1 ? cups * 16 * 0.16 : 0), inputCups: round2(cups) };
};

export const highAltitude: CustomCalculator = (v) => {
  const ft = pick(v.altUnit, 2) === 1 ? nonNeg(v.altitude) * 3.28084 : nonNeg(v.altitude);
  const band = ft < 3000 ? 0 : ft < 5000 ? 1 : ft < 7000 ? 2 : 3;
  const leaven = [1, 0.875, 0.8125, 0.75][band];
  const sugarTbspPerCup = [0, 0.5, 1, 2][band];
  const liquidTbspPerCup = [0, 1.5, 3, 3.5][band];
  const flourTbspPerCup = ft < 3500 ? 0 : 1 + Math.floor((ft - 3500) / 1500);
  const temp = nonNeg(v.ovenTemp, 350) + [0, 15, 20, 25][band];
  return { bakingPowderTsp: round2(nonNeg(v.bakingPowder) * leaven), sugarCups: round2(Math.max(0, nonNeg(v.sugar) - (nonNeg(v.sugar) * sugarTbspPerCup) / 16)), liquidCups: round2(nonNeg(v.liquid) + (nonNeg(v.liquid) * liquidTbspPerCup) / 16), flourCups: round2(nonNeg(v.flour) + (nonNeg(v.flour) * flourTbspPerCup) / 16), ovenTempF: temp, bakeMinutes: round2(nonNeg(v.bakeMinutes) * (band ? 0.8 : 1)), altitudeBand: band };
};

export const iceCream: CustomCalculator = (v) => {
  const milk = nonNeg(v.milk);
  const cream = nonNeg(v.cream);
  const sugar = nonNeg(v.sugar);
  const yolkG = nonNeg(v.yolks) * 17;
  const smp = nonNeg(v.milkPowder);
  const total = milk + cream + sugar + yolkG + smp;
  const fat = milk * 0.035 + cream * 0.36 + yolkG * 0.32;
  const msnf = milk * 0.087 + cream * 0.055 + smp * 0.96;
  const solids = fat + msnf + sugar + yolkG * 0.18;
  const pct = (x: number) => round2(total > 0 ? (x / total) * 100 : 0);
  return { fatPercent: pct(fat), sugarPercent: pct(sugar), msnfPercent: pct(msnf), totalSolidsPercent: pct(solids), totalMixGrams: round2(total), quartsAfterChurning: round2((total / 1030) * 1.057 * (1 + nonNeg(v.overrun, 25) / 100)), servingsHalfCup: Math.floor(((total / 1030) * 1000 * (1 + nonNeg(v.overrun, 25) / 100)) / 118) };
};

export const pectin: CustomCalculator = (v) => {
  const baseFruit = nonNeg(v.recipeFruitCups, 6);
  const f = baseFruit > 0 ? nonNeg(v.yourFruitCups) / baseFruit : 0;
  const jars = nonNeg(v.recipeJars, 6) * f;
  return { pectinTbsp: round2(nonNeg(v.recipePectinTbsp) * f), sugarCups: round2(nonNeg(v.recipeSugarCups) * f), lemonJuiceTbsp: round2(nonNeg(v.recipeLemonTbsp) * f), halfPintJars: round2(jars), batchesNeeded: Math.max(1, Math.ceil(jars / 10)), boxesOfOtherBrand: round2((nonNeg(v.recipePectinTbsp) * f) / 6), scaleFactor: round2(f) };
};

export const CAKES: [string, number, number][] = [["6 in round", 6, 0], ["8 in round", 8, 0], ["9 in round", 9, 0], ["10 in round", 10, 0], ["12 in round", 12, 0], ["8 in square", 8, 1], ["9 × 13 in sheet", 9, 2], ["Quarter sheet (9 × 13 in, 2 layers)", 9, 2], ["Half sheet (12 × 18 in)", 12, 3]];
export const buttercream: CustomCalculator = (v) => {
  const [, a, shape] = CAKES[pick(v.cake, CAKES.length)];
  const b = shape === 2 ? 13 : shape === 3 ? 18 : a;
  const height = nonNeg(v.height, 4);
  const layers = Math.max(1, Math.round(nonNeg(v.layers, 2)));
  const top = shape === 0 ? Math.PI * (a / 2) ** 2 : a * b;
  const perim = shape === 0 ? Math.PI * a : 2 * (a + b);
  const coatIn2 = top + (pick(v.frostSides, 2) === 1 ? perim * height : 0) + top * (layers - 1);
  const cakeCups = (coatIn2 * nonNeg(v.thickness, 0.25)) / 14.44;
  const cupcakeCups = (nonNeg(v.cupcakes) * nonNeg(v.perCupcakeTbsp, 2)) / 16;
  const cups = (cakeCups * nonNeg(v.cakes, 1) + cupcakeCups) * (1 + nonNeg(v.decorationPercent, 15) / 100);
  return { frostingCups: round2(cups), butterCups: round2(cups * 0.25), butterGrams: round2(cups * 0.25 * 227), powderedSugarCups: round2(cups), powderedSugarGrams: round2(cups * 120), milkTbsp: round2(cups * (2 / 3)), batches4Cup: round2(cups / 4) };
};

export const doughTemp: CustomCalculator = (v) => {
  const c = pick(v.tempUnit, 2) === 1;
  const factors = pick(v.preferment, 2) === 1 ? 4 : 3;
  const sum = toF(v.roomTemp, v.tempUnit) + toF(v.flourTemp, v.tempUnit) + (c ? nonNeg(v.friction) * 1.8 : nonNeg(v.friction)) + (factors === 4 ? toF(v.prefermentTemp, v.tempUnit) : 0);
  const water = toF(v.desiredTemp, v.tempUnit) * factors - sum;
  const out = (f: number) => round2(c ? (f - 32) / 1.8 : f);
  return { waterTemp: out(water), waterTempF: round2(water), waterTempC: round2((water - 32) / 1.8), needsIce: water < 50 ? 1 : 0, factorsUsed: factors };
};

// ---------- Party & event food ----------

const appetite = (v: Record<string, number>) => [0.8, 1, 1.25][pick(v.appetite, 3)];
const people = (v: Record<string, number>) => nonNeg(v.adults) + nonNeg(v.kids) * 0.6;

export const PIZZAS: [string, number][] = [["Small 10 in (6 slices)", 6], ["Medium 12 in (8 slices)", 8], ["Large 14 in (8 slices)", 8], ["Extra-large 16 in (12 slices)", 12]];
export const pizzaParty: CustomCalculator = (v) => {
  const slices = (nonNeg(v.adults) * 3 + nonNeg(v.kids) * 2) * appetite(v);
  const per = PIZZAS[pick(v.size, PIZZAS.length)][1];
  const pizzas = per > 0 ? Math.ceil(slices / per) : 0;
  return { pizzas, slicesNeeded: Math.ceil(slices), totalSlices: pizzas * per, extraSlices: pizzas * per - Math.ceil(slices), totalCost: round2(pizzas * nonNeg(v.pricePerPizza)), costPerPerson: round2(nonNeg(v.adults) + nonNeg(v.kids) > 0 ? (pizzas * nonNeg(v.pricePerPizza)) / (nonNeg(v.adults) + nonNeg(v.kids)) : 0) };
};

export const tacoBar: CustomCalculator = (v) => {
  const tacos = people(v) * nonNeg(v.tacosPerPerson, 3) * appetite(v);
  return { tacos: Math.ceil(tacos), meatLbRaw: round2((tacos * 2) / 16), tortillas: Math.ceil(tacos * 1.1), cheeseCups: round2(tacos * 0.125), lettuceHeads: round2(tacos / 40), salsaCups: round2((tacos * 2) / 16), sourCreamCups: round2((tacos * 1) / 16), avocados: Math.ceil(tacos / 8), riceCupsDry: round2(people(v) * 0.17), beansCans: Math.ceil(people(v) / 5) };
};

export const DISHES: [string, number, number, string][] = [
  // name, amount per guest as a main, as a side, unit (lb or cups)
  ["Pasta salad", 1, 0.5, "cups"], ["Fruit salad / fruit tray", 0.75, 0.5, "cups"], ["Spaghetti (dry pasta, lb)", 0.19, 0.125, "lb"], ["Chili", 1.5, 0.75, "cups"], ["Mashed potatoes (raw potatoes, lb)", 0.5, 0.33, "lb"], ["Potato salad", 1, 0.5, "cups"], ["Coleslaw", 0.75, 0.5, "cups"], ["Green salad (lettuce, lb)", 0.13, 0.07, "lb"], ["Mac and cheese", 1, 0.5, "cups"], ["Baked beans", 0.75, 0.5, "cups"], ["Rice (dry, lb)", 0.17, 0.09, "lb"], ["Soup", 1.5, 1, "cups"],
];
// A 2½-in-deep half steam pan holds about 3 quarts (12 cups).
export const partyFood: CustomCalculator = (v) => {
  const [, main, side, unit] = DISHES[pick(v.dish, DISHES.length)];
  const per = pick(v.role, 2) === 0 ? main : side;
  const total = people(v) * per * appetite(v);
  const cups = unit === "cups" ? total : 0;
  return { totalAmount: round2(total), quarts: round2(cups / 4), gallons: round2(cups / 16), halfPans: round2(cups / 12), perGuest: round2(per * appetite(v)), unitIsPounds: unit === "lb" ? 1 : 0, sauceQuarts: pick(v.dish, DISHES.length) === 2 ? round2((people(v) * 0.5) / 4) : 0 };
};

export const lowCountryBoil: CustomCalculator = (v) => {
  const p = people(v) * appetite(v);
  return { shrimpLb: round2(p * 0.5), sausageLb: round2(p * 0.25), cornEars: Math.ceil(p * 1.5), redPotatoesLb: round2(p * 0.33), onions: Math.ceil(p / 4), lemons: Math.ceil(p / 4), seasoningCups: round2(p * 0.04), potQuarts: Math.ceil(people(v) * 2.5), cost: round2(p * 0.5 * nonNeg(v.shrimpPrice) + p * 0.25 * nonNeg(v.sausagePrice) + Math.ceil(p * 1.5) * 0.6 + p * 0.33 * 1.2) };
};

export const jambalaya: CustomCalculator = (v) => {
  const gumbo = pick(v.dish, 2) === 1;
  const cupsPer = pick(v.role, 2) === 0 ? 1.5 : 1;
  const servings = people(v) * appetite(v);
  const totalCups = servings * cupsPer;
  const riceDry = gumbo ? (servings * 0.5) / 3 : totalCups / 6;
  return { totalGallons: round2(totalCups / 16), proteinLb: round2(servings * 0.25 * (cupsPer / 1.5)), riceCupsDry: round2(riceDry), stockQuarts: round2(gumbo ? (totalCups * 0.75) / 4 : (riceDry * 2) / 4), onions: Math.ceil(totalCups / 12), bellPeppers: Math.ceil(totalCups / 16), roux: round2(gumbo ? (totalCups / 4) * 0.25 : 0), potQuarts: Math.ceil((totalCups / 4) * 1.3) };
};

export const BACON: [string, number][] = [["Regular cut (≈ 16 slices/lb)", 16], ["Thick cut (≈ 11 slices/lb)", 11], ["Thin cut (≈ 22 slices/lb)", 22]];
export const bacon: CustomCalculator = (v) => {
  const slices = people(v) * nonNeg(v.slicesPerPerson, 3) * appetite(v);
  const perLb = BACON[pick(v.cut, BACON.length)][1];
  const lb = slices / perLb;
  return { poundsToBuy: round2(lb), slices: Math.ceil(slices), packages12oz: Math.ceil(lb / 0.75), packages16oz: Math.ceil(lb), cookedWeightLb: round2(lb * 0.33), sheetPans: Math.ceil(slices / 14), cost: round2(lb * nonNeg(v.pricePerLb)) };
};

export const appetizers: CustomCalculator = (v) => {
  const guests = nonNeg(v.guests);
  const hours = Math.max(1, nonNeg(v.hours, 2));
  const type = pick(v.eventType, 3);
  const perGuest = type === 0 ? 5 : type === 1 ? 6 + 4 * (hours - 1) : 3 + 2 * (hours - 1);
  const pieces = guests * perGuest * appetite(v);
  const varieties = guests <= 15 ? 4 : guests <= 30 ? 6 : guests <= 60 ? 8 : 10;
  return { totalPieces: Math.ceil(pieces), piecesPerGuest: round2(perGuest * appetite(v)), varieties: type === 1 ? varieties : Math.max(3, varieties - 2), piecesPerVariety: Math.ceil(pieces / (type === 1 ? varieties : Math.max(3, varieties - 2))), dipsCups: round2(guests / 8), cost: round2(pieces * nonNeg(v.costPerPiece)) };
};

export const burgers: CustomCalculator = (v) => {
  const n = Math.ceil((nonNeg(v.adults) * 1.5 + nonNeg(v.kids)) * appetite(v));
  const patty = [0.25, 0.33, 0.5][pick(v.pattySize, 3)];
  const beef = n * patty;
  return { burgers: n, groundBeefLb: round2(beef), bunPacks8: Math.ceil(n / 8), cheeseSlices: n, lettuceHeads: Math.ceil(n / 15), tomatoes: Math.ceil(n / 6), onions: Math.ceil(n / 10), cost: round2(beef * nonNeg(v.beefPrice) + Math.ceil(n / 8) * nonNeg(v.bunPrice)) };
};

export const sandwiches: CustomCalculator = (v) => {
  const style = pick(v.style, 3); // 0 full sandwiches (lunch), 1 halves (party), 2 sliders
  const per = [1.25, 2, 3][style];
  const n = Math.ceil(people(v) * per * appetite(v));
  const meatOz = [3, 1.75, 1.25][style];
  return { sandwiches: n, meatLb: round2((n * meatOz) / 16), cheeseLb: round2((n * (meatOz / 3)) / 16), breadLoaves: style === 1 ? Math.ceil(n / 20) : 0, rollsOrBuns: style === 1 ? 0 : n, lettuceHeads: Math.ceil(n / 20), tomatoes: Math.ceil(n / 8), cost: round2(((n * meatOz) / 16) * nonNeg(v.meatPrice)) };
};

export const popcorn: CustomCalculator = (v) => {
  const cups = nonNeg(v.guests) * nonNeg(v.cupsPerPerson, 4);
  const kernels = cups / 32;
  return { kernelsCups: round2(kernels), kernelsLb: round2((kernels * 190) / 453.592), poppedCups: round2(cups), microwaveBags: Math.ceil(cups / 11), oilTbsp: round2(kernels * 4), butterTbsp: round2(cups / 4), saltTsp: round2(cups / 8), calories: Math.round(cups * (pick(v.style, 2) === 0 ? 31 : 55) + (cups / 4) * 102) };
};

export const foodBakingCustomCalculators: Record<string, CustomCalculator> = {
  "recipe-calculator": recipeScale,
  "sourdough-hydration-calculator": sourdoughHydration,
  "pizza-dough-hydration-calculator": pizzaDough,
  "cooking-calculator": cookingConvert,
  "serving-size-calculator": servingSize,
  "bakers-percentage-calculator": bakersPercentage,
  "fresh-to-dried-herb-conversion-calculator": herbConvert,
  "sourdough-feeding-ratio-calculator": sourdoughFeeding,
  "shortening-to-butter-conversion-calculator": fatSwap,
  "high-altitude-baking-calculator": highAltitude,
  "ice-cream-calculator": iceCream,
  "ball-pectin-calculator": pectin,
  "buttercream-icing-calculator": buttercream,
  "dough-temp-calculator": doughTemp,
  "pizza-calculator": pizzaParty,
  "taco-bar-calculator": tacoBar,
  "party-food-calculator": partyFood,
  "low-country-boil-calculator": lowCountryBoil,
  "jambalaya-calculator": jambalaya,
  "bacon-calculator": bacon,
  "appetizers-per-person-calculator": appetizers,
  "burger-calculator": burgers,
  "sandwich-calculator": sandwiches,
  "popcorn-calculator": popcorn,
};
