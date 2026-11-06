/**
 * Batch: "Food & Drink Calculators" → Wine, Spirits & Cocktail Calculators and
 * Coffee, Caffeine & Drink Calculators.
 *
 * Data / methods:
 *  - Ethanol density 0.789 g/mL. US standard drink = 14 g ethanol; UK unit = 10 mL (8 g) ethanol.
 *    US proof = 2 × ABV. Dilution: water = V × (C ÷ T − 1) (volume contraction ignored, ≈1–3%).
 *  - Honey ≈ 35 gravity points per lb per US gallon and ≈ 12 lb per gallon; ABV = (OG − FG) × 131.25.
 *  - Chaptalization: about 17 g/L sugar raises potential alcohol 1% ABV in white must and 19 g/L in
 *    red (fermentation on skins loses more), per EU / OIV practice (16.83 g/L white).
 *  - Federal distilled-spirits excise (26 U.S.C. 5001, craft rates): $2.70 per proof gallon on the first
 *    100,000 PG, $13.34 up to 22,230,000 PG, $13.50 above. Proof gallon = wine gallon × proof ÷ 100.
 *  - Vanilla extract: FDA 21 CFR 169.175 — 13.35 oz vanilla beans per gallon of ≥35% alcohol (single fold).
 *  - Sugar dissolved in water adds about 0.63 mL of volume per gram.
 *  - Mead stabilising: potassium sorbate 200 mg/L, potassium metabisulfite for ~50 ppm SO₂ ≈ 87 mg/L.
 *  - Caffeine (USDA / manufacturer typical): drip coffee 8 oz 95 mg, espresso shot 64, cold brew 16 oz
 *    200, black tea 8 oz 47, green tea 8 oz 28, cola 12 oz 34, energy drink 8.4 oz 80, energy drink
 *    16 oz 160, pre-workout scoop 200, dark chocolate 1 oz 24. FDA: 400 mg/day for healthy adults;
 *    ACOG: 200 mg/day in pregnancy; EFSA: 3 mg/kg single dose.
 *  - Caffeine half-life ≈ 5 h (healthy adult); ≈ 3 h smokers; ≈ 10 h oral contraceptives / late pregnancy.
 *  - Water needs: 33 mL/kg baseline + 350 mL per 30 min of exercise; +500 mL hot climate; +300 mL
 *    pregnancy; +700 mL breastfeeding (NASEM adequate-intake range checks).
 *  - Super juice (Nickle Morris cheat sheet, per 1 L): lime 100 g peel + 44 g citric + 7 g malic;
 *    lemon 100 g + 47 g + 9 g; orange 120 g + 23 g + 2 g + 70 g sugar. Scaled by peel weight.
 *  - Roast weight loss: light 11–13%, medium 13–15%, medium-dark 15–17%, dark 17–20%.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-food-drinks-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;
const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pick = (v: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(safeNumber(v))));
const ML_PER_OZ = 29.5735;
const L_PER_GAL = 3.785411784;
const ETHANOL = 0.789;

/** Volume in mL from a value + unit dropdown (0 mL, 1 fl oz, 2 liters, 3 US gallons). */
const toMl = (v: number, unit: number) => nonNeg(v) * [1, ML_PER_OZ, 1000, L_PER_GAL * 1000][pick(unit, 4)];
const fromMl = (ml: number, unit: number) => ml / [1, ML_PER_OZ, 1000, L_PER_GAL * 1000][pick(unit, 4)];
/** Strength as ABV % from a value + dropdown (0 ABV %, 1 US proof). */
const toAbv = (v: number, unit: number) => (pick(unit, 2) === 1 ? nonNeg(v) / 2 : nonNeg(v));

export const alcoholDilution: CustomCalculator = (v) => {
  const ml = toMl(v.volume, v.volumeUnit);
  const c = toAbv(v.currentStrength, v.strengthUnit);
  const t = toAbv(v.targetStrength, v.strengthUnit);
  const water = t > 0 && c > t ? ml * (c / t - 1) : 0;
  const final = ml + water;
  return { waterToAdd: round2(fromMl(water, v.volumeUnit)), finalVolume: round2(fromMl(final, v.volumeUnit)), waterMl: round2(water), finalAbv: round2(final > 0 ? (ml * c) / final : 0), finalProof: round2(final > 0 ? (2 * ml * c) / final : 0), pureAlcoholMl: round2((ml * c) / 100) };
};

export const BOTTLE_SIZES: [string, number][] = [["Nip / mini (50 mL)", 50], ["Half pint (200 mL)", 200], ["Pint (375 mL)", 375], ["Fifth (750 mL)", 750], ["Liter (1 L)", 1000], ["Handle (1.75 L)", 1750]];
export const shots: CustomCalculator = (v) => {
  const bottle = BOTTLE_SIZES[pick(v.bottleSize, BOTTLE_SIZES.length)][1];
  const shotMl = nonNeg(v.shotOz, 1.5) * ML_PER_OZ;
  const perBottle = shotMl > 0 ? bottle / shotMl : 0;
  const needed = nonNeg(v.guests) * nonNeg(v.shotsPerGuest);
  return { shotsPerBottle: round2(perBottle), fullShotsPerBottle: Math.floor(perBottle), bottlesNeeded: perBottle > 0 ? Math.ceil(needed / Math.floor(Math.max(1, perBottle))) : 0, shotsNeeded: Math.round(needed), shotMl: round2(shotMl), standardDrinksPerShot: round2((shotMl * (nonNeg(v.abv, 40) / 100) * ETHANOL) / 14) };
};

export const DILUTION: [string, number][] = [["Built / on the rocks (≈10%)", 10], ["Stirred (≈22%)", 22], ["Shaken (≈28%)", 28], ["Blended / frozen (≈40%)", 40], ["No dilution (batched, served neat)", 0]];
export const cocktailAbv: CustomCalculator = (v) => {
  const parts = [1, 2, 3, 4].map((i) => ({ oz: nonNeg(v[`ing${i}Oz`]), abv: nonNeg(v[`ing${i}Abv`]) }));
  const vol = parts.reduce((s, p) => s + p.oz, 0);
  const alc = parts.reduce((s, p) => s + (p.oz * p.abv) / 100, 0);
  const dil = DILUTION[pick(v.method, DILUTION.length)][1] / 100;
  const finalVol = vol * (1 + dil);
  const abv = finalVol > 0 ? (alc / finalVol) * 100 : 0;
  return { finalAbv: round2(abv), undilutedAbv: round2(vol > 0 ? (alc / vol) * 100 : 0), finalProof: round2(abv * 2), finalVolumeOz: round2(finalVol), standardDrinks: round2((alc * ML_PER_OZ * ETHANOL) / 14), pureAlcoholOz: round2(alc) };
};

export const mead: CustomCalculator = (v) => {
  const metric = pick(v.unitSystem, 2) === 1;
  const g = metric ? nonNeg(v.batchSize) / L_PER_GAL : nonNeg(v.batchSize);
  const og = nonNeg(v.targetOg, 1.1);
  const pts = (og - 1) * 1000;
  // Points per lb per gallon apply to the finished must volume; honey itself fills ≈ 1/12 gal per lb.
  const lb = (pts * g) / 35;
  const potential = Math.max(0, (og - 0.996) * 131.25);
  const tol = nonNeg(v.yeastTolerance, 14);
  const fg = potential > tol ? og - tol / 131.25 : 0.996;
  const abv = Math.min(potential, tol);
  const residualPts = Math.max(0, (fg - 0.996) * 1000);
  return { honeyLb: round2(lb), honeyKg: round2(lb * 0.453592), honeyVolumeGal: round2(lb / 12), waterGal: round2(Math.max(0, g - lb / 12)), potentialAbv: round2(potential), expectedAbv: round2(abv), expectedFg: round4(fg), sweetness: residualPts < 6 ? 0 : residualPts < 15 ? 1 : residualPts < 30 ? 2 : 3 };
};

export const chaptalization: CustomCalculator = (v) => {
  const liters = toMl(v.volume, v.volumeUnit) / 1000;
  const brixMode = pick(v.readingUnit, 2) === 1;
  const sg = brixMode ? 1 + nonNeg(v.reading) / (258.6 - (nonNeg(v.reading) / 258.2) * 227.1) : nonNeg(v.reading, 1.08);
  const current = Math.max(0, (sg - 0.996) * 131.25);
  const target = nonNeg(v.targetAbv, 13);
  const gPerPct = pick(v.wineType, 2) === 1 ? 19 : 17;
  const raise = Math.max(0, target - current);
  const sugarG = raise * gPerPct * liters;
  return { sugarGrams: round2(sugarG), sugarKg: round2(sugarG / 1000), sugarLb: round2(sugarG / 453.592), currentPotentialAbv: round2(current), abvIncrease: round2(raise), gramsPerLiter: round2(raise * gPerPct), currentSg: round4(sg) };
};

export const DRINKS: [string, number, number][] = [["Beer, regular (12 oz, 5%)", 355, 5], ["Beer, strong / IPA (16 oz pint, 7%)", 473, 7], ["Light beer (12 oz, 4.2%)", 355, 4.2], ["Wine (5 oz glass, 12%)", 148, 12], ["Large wine (250 mL, 13%)", 250, 13], ["Spirit shot (1.5 oz, 40%)", 44.4, 40], ["UK pint lager (568 mL, 4%)", 568, 4], ["Custom (enter size and ABV)", 0, 0]];
export const alcoholUnits: CustomCalculator = (v) => {
  const d = DRINKS[pick(v.drinkType, DRINKS.length)];
  const ml = d[1] > 0 ? d[1] : toMl(v.customVolume, v.volumeUnit);
  const abv = d[1] > 0 ? d[2] : nonNeg(v.customAbv);
  const count = nonNeg(v.drinks, 1);
  const pureMl = ml * (abv / 100) * count;
  const grams = pureMl * ETHANOL;
  return { ukUnits: round2(pureMl / 10), usStandardDrinks: round2(grams / 14), gramsAlcohol: round2(grams), equivalentShots: round2(grams / (44.36 * 0.4 * ETHANOL)), shareOfUkWeeklyLimit: round2((pureMl / 10 / 14) * 100), hoursToProcess: round2(pureMl / 10) };
};

export const batchCocktail: CustomCalculator = (v) => {
  const n = nonNeg(v.servings, 20);
  const per = [1, 2, 3, 4].map((i) => nonNeg(v[`ing${i}Oz`]) * n);
  const spirits = per.reduce((s, x) => s + x, 0);
  const water = spirits * (nonNeg(v.dilution, 20) / 100);
  const total = spirits + water;
  return { totalBatchOz: round2(total), totalBatchMl: round2(total * ML_PER_OZ), ingredient1Oz: round2(per[0]), ingredient2Oz: round2(per[1]), ingredient3Oz: round2(per[2]), ingredient4Oz: round2(per[3]), waterOz: round2(water), totalCups: round2(total / 8), bottles750: round2((total * ML_PER_OZ) / 750) };
};

export const vanilla: CustomCalculator = (v) => {
  const ml = toMl(v.alcoholVolume, v.volumeUnit);
  const fold = nonNeg(v.fold, 1) || 1;
  const gramsPerMl = (13.35 * 28.3495) / (L_PER_GAL * 1000);
  const grams = ml * gramsPerMl * fold;
  const bean = nonNeg(v.beanWeight, 4.5) || 4.5;
  const abv = toAbv(v.alcoholStrength, v.strengthUnit);
  return { beanGrams: round2(grams), beanOunces: round2(grams / 28.3495), beanCount: Math.ceil(grams / bean), alcoholMl: round2(ml), meetsFdaStrength: abv >= 35 ? 1 : 0, costEstimate: round2(Math.ceil(grams / bean) * nonNeg(v.pricePerBean)) };
};

export const limoncello: CustomCalculator = (v) => {
  const ml = toMl(v.alcoholVolume, v.volumeUnit);
  const abv = toAbv(v.alcoholStrength, v.strengthUnit);
  const target = nonNeg(v.targetAbv, 30);
  const final = target > 0 && abv > target ? (ml * abv) / target : ml;
  const syrup = Math.max(0, final - ml);
  const ratio = nonNeg(v.sugarRatio, 1); // grams sugar per gram water
  const water = syrup / (1 + 0.63 * ratio);
  const sugar = water * ratio;
  return { finalVolumeMl: round2(final), syrupMl: round2(syrup), waterMl: round2(water), sugarGrams: round2(sugar), sugarCups: round2(sugar / 200), lemons: Math.ceil(ml / 75), bottles500: round2(final / 500), finalAbv: round2(final > 0 ? (ml * abv) / final : 0) };
};

export const proofGallon: CustomCalculator = (v) => {
  const gallons = toMl(v.volume, v.volumeUnit) / 1000 / L_PER_GAL;
  const proof = pick(v.strengthUnit, 2) === 1 ? nonNeg(v.strength) : nonNeg(v.strength) * 2;
  const pg = (gallons * proof) / 100;
  const rate = [2.7, 13.34, 13.5][pick(v.taxTier, 3)];
  return { proofGallons: round2(pg), federalExcise: round2(pg * rate), wineGallons: round2(gallons), proof: round2(proof), taxPerBottle750: round2(((0.75 / L_PER_GAL) * proof * rate) / 100), ratePerProofGallon: rate };
};

export const backsweeten: CustomCalculator = (v) => {
  const metric = pick(v.unitSystem, 2) === 1;
  const g = metric ? nonNeg(v.volume) / L_PER_GAL : nonNeg(v.volume);
  const cur = (nonNeg(v.currentGravity, 0.998) - 1) * 1000;
  const tgt = (nonNeg(v.targetGravity, 1.01) - 1) * 1000;
  const sweet = [35, 46, 42][pick(v.sweetener, 3)]; // honey, table sugar, corn sugar: points per lb per gal
  const perGal = [12, 13.2, 13.2][pick(v.sweetener, 3)]; // lb that add one gallon of volume (dissolved sugar ≈ 0.63 mL/g)
  const lb = tgt > cur ? (g * (tgt - cur)) / (sweet - tgt / perGal) : 0;
  const liters = g * L_PER_GAL;
  return { sweetenerLb: round2(lb), sweetenerKg: round2(lb * 0.453592), sweetenerCups: round2((lb / perGal) * 16), finalVolumeGal: round2(g + lb / perGal), sorbateGrams: round2(liters * 0.2), metabisulfiteGrams: round2(liters * 0.087) };
};

export const CAFFEINE: [string, string, number][] = [["dripCoffee", "Drip / brewed coffee (8 oz)", 95], ["espresso", "Espresso shot", 64], ["coldBrew", "Cold brew (16 oz)", 200], ["blackTea", "Black tea (8 oz)", 47], ["greenTea", "Green tea (8 oz)", 28], ["cola", "Cola (12 oz)", 34], ["energySmall", "Energy drink (8.4 oz)", 80], ["energyLarge", "Energy drink (16 oz)", 160], ["preWorkout", "Pre-workout (1 scoop)", 200], ["darkChocolate", "Dark chocolate (1 oz)", 24]];
export const caffeine: CustomCalculator = (v) => {
  const total = CAFFEINE.reduce((s, [k, , mg]) => s + nonNeg(v[k]) * mg, 0) + nonNeg(v.otherMg);
  const kg = pick(v.weightUnit, 2) === 1 ? nonNeg(v.weight) : nonNeg(v.weight) * 0.453592;
  const limit = [400, 200, 100][pick(v.group, 3)];
  return { totalCaffeineMg: Math.round(total), dailyLimitMg: limit, remainingMg: Math.round(limit - total), percentOfLimit: round2(limit > 0 ? (total / limit) * 100 : 0), mgPerKg: round2(kg > 0 ? total / kg : 0), cupsOfCoffeeEquivalent: round2(total / 95) };
};

export const HALF_LIVES: [string, number][] = [["Average healthy adult (5 h)", 5], ["Smoker (3 h)", 3], ["Oral contraceptives (10 h)", 10], ["Pregnant, 3rd trimester (10 h)", 10], ["Slow metaboliser / liver condition (8 h)", 8]];
export const caffeineHalfLife: CustomCalculator = (v) => {
  const mg = nonNeg(v.caffeineMg, 200);
  const h = HALF_LIVES[pick(v.profile, HALF_LIVES.length)][1];
  const t = nonNeg(v.hoursSince);
  const left = mg * Math.pow(0.5, t / h);
  const target = nonNeg(v.sleepThreshold, 50) || 50;
  const hoursTo = mg > target ? h * Math.log2(mg / target) : 0;
  return { caffeineRemainingMg: round2(left), percentRemaining: round2(mg > 0 ? (left / mg) * 100 : 0), halfLifeHours: h, hoursUntilBelowThreshold: round2(Math.max(0, hoursTo - t)), totalHoursToThreshold: round2(hoursTo), hoursUntil95Cleared: round2(h * Math.log2(20)) };
};

export const hydration: CustomCalculator = (v) => {
  const kg = pick(v.weightUnit, 2) === 1 ? nonNeg(v.weight) : nonNeg(v.weight) * 0.453592;
  const base = kg * 33;
  const exercise = (nonNeg(v.exerciseMinutes) / 30) * 350;
  const climate = [0, 500, 750][pick(v.climate, 3)];
  const life = [0, 300, 700][pick(v.lifeStage, 3)];
  const ml = base + exercise + climate + life;
  return { dailyWaterLiters: round2(ml / 1000), dailyWaterOz: round2(ml / ML_PER_OZ), cups8oz: round2(ml / ML_PER_OZ / 8), bottles500ml: round2(ml / 500), baselineLiters: round2(base / 1000), extraForExerciseMl: Math.round(exercise) };
};

export const ESPRESSO: [string, number][] = [["Ristretto (1:1.5)", 1.5], ["Normale (1:2)", 2], ["Lungo (1:3)", 3], ["Custom ratio", 0]];
export const espresso: CustomCalculator = (v) => {
  const dose = nonNeg(v.dose, 18);
  const preset = ESPRESSO[pick(v.style, ESPRESSO.length)][1];
  const ratio = preset > 0 ? preset : nonNeg(v.customRatio, 2);
  const yieldG = dose * ratio;
  const t = nonNeg(v.shotTime, 28);
  return { yieldGrams: round2(yieldG), brewRatio: round2(ratio), yieldMlApprox: round2(yieldG / 0.92), flowRateGps: round2(t > 0 ? yieldG / t : 0), caffeineMgApprox: Math.round(dose * 7.5), timeVerdict: t < 22 ? -1 : t > 35 ? 1 : 0 };
};

export const METHODS: [string, number, number][] = [["Drip / auto-drip (1:16)", 16, 0], ["Pour over / V60 (1:16)", 16, 1], ["Chemex (1:16)", 16, 1], ["French press (1:15)", 15, 2], ["AeroPress (1:13)", 13, 3], ["Moka pot (1:7)", 7, 4], ["Percolator (1:17)", 17, 2]];
export const GRIND_LABELS = ["Medium", "Medium-fine", "Coarse", "Fine-medium", "Fine"];
export const coffeeRatio: CustomCalculator = (v) => {
  const m = METHODS[pick(v.method, METHODS.length)];
  const ratio = m[1] * [1.1, 1, 0.9][pick(v.strength, 3)];
  const waterMl = pick(v.inputMode, 2) === 0 ? nonNeg(v.cups, 4) * nonNeg(v.cupSizeOz, 8) * ML_PER_OZ : 0;
  const coffee = pick(v.inputMode, 2) === 0 ? waterMl / ratio : nonNeg(v.coffeeGrams, 30);
  const water = pick(v.inputMode, 2) === 0 ? waterMl : coffee * ratio;
  return { coffeeGrams: round2(coffee), waterMl: round2(water), waterOz: round2(water / ML_PER_OZ), tablespoons: round2(coffee / 5.3), scoops: round2(coffee / 10.6), ratio: round2(ratio), grindIndex: m[2] };
};

export const coldBrew: CustomCalculator = (v) => {
  const ratio = [4, 5, 8, 0][pick(v.style, 4)] || nonNeg(v.customRatio, 5);
  const byWater = pick(v.inputMode, 2) === 0;
  const waterMl = byWater ? toMl(v.water, v.volumeUnit) : nonNeg(v.coffeeGrams) * ratio;
  const coffee = byWater ? waterMl / ratio : nonNeg(v.coffeeGrams);
  const yieldMl = Math.max(0, waterMl - coffee * 2);
  const dilute = ratio <= 5 ? 2 : 1;
  return { coffeeGrams: round2(coffee), coffeeOunces: round2(coffee / 28.3495), coffeeCups: round2(coffee / 85), waterMl: round2(waterMl), concentrateYieldMl: round2(yieldMl), servings8oz: round2((yieldMl * dilute) / (8 * ML_PER_OZ)), ratio };
};

export const SUPER_JUICE: [string, number, number, number, number][] = [["Lime", 100, 44, 7, 0], ["Lemon", 100, 47, 9, 0], ["Orange", 120, 23, 2, 70]];
export const superJuice: CustomCalculator = (v) => {
  const [, peelPerL, citric, malic, sugar] = SUPER_JUICE[pick(v.fruit, SUPER_JUICE.length)];
  const peel = nonNeg(v.peelGrams, 100);
  const liters = peel / peelPerL;
  return { citricAcidGrams: round2(liters * citric), malicAcidGrams: round2(liters * malic), sugarGrams: round2(liters * sugar), totalYieldMl: round2(liters * 1000), yieldOz: round2((liters * 1000) / ML_PER_OZ), fruitsNeeded: Math.ceil(peel / [11, 13, 40][pick(v.fruit, 3)]) };
};

export const GRIND: [string, number, number, number][] = [["Turkish", 40, 220, 0], ["Espresso", 180, 380, 25], ["Moka pot", 360, 660, 270], ["AeroPress", 320, 960, 120], ["Pour over / V60", 400, 700, 180], ["Auto-drip", 300, 900, 300], ["Chemex", 600, 900, 270], ["French press", 690, 1300, 240], ["Cold brew", 800, 1400, 57600]];
export const grindSize: CustomCalculator = (v) => {
  const [, lo, hi, targetSec] = GRIND[pick(v.method, GRIND.length)];
  const mid = (lo + hi) / 2;
  const actual = nonNeg(v.brewSeconds);
  const off = targetSec > 0 && actual > 0 ? (actual - targetSec) / targetSec : 0;
  const advice = Math.abs(off) < 0.15 ? 0 : off > 0 ? -1 : 1; // too long → coarser (−1), too short → finer (1)
  return { targetMicronsLow: lo, targetMicronsHigh: hi, targetMicronsMid: mid, encoreSettingApprox: Math.max(1, Math.min(40, Math.round((mid - 150) / 30))), brewTimeTargetSec: targetSec, adjustment: advice };
};

export const roastLoss: CustomCalculator = (v) => {
  const green = nonNeg(v.greenWeight, 500);
  const roasted = nonNeg(v.roastedWeight, 425);
  const loss = green > 0 && roasted > 0 ? ((green - roasted) / green) * 100 : 0;
  const level = loss < 11 ? 0 : loss < 13 ? 1 : loss < 15 ? 2 : loss < 17 ? 3 : 4;
  const targetLoss = [12, 14, 16, 18.5][pick(v.targetLevel, 4)];
  const want = nonNeg(v.wantRoasted, 340);
  return { weightLossPercent: round2(loss), roastLevelIndex: level, moistureLostGrams: round2(green - roasted), greenNeededForTarget: round2(want / (1 - targetLoss / 100)), targetLossPercent: targetLoss };
};

export const foodDrinksCustomCalculators: Record<string, CustomCalculator> = {
  "alcohol-dilution-calculator": alcoholDilution,
  "shot-calculator": shots,
  "cocktail-abv-calculator": cocktailAbv,
  "mead-calculator": mead,
  "chaptalization-calculator": chaptalization,
  "alcohol-units-calculator": alcoholUnits,
  "batch-calculator": batchCocktail,
  "vanilla-calculator": vanilla,
  "limoncello-calculator": limoncello,
  "proof-gallon-calculator": proofGallon,
  "mead-backsweetening-calculator": backsweeten,
  "caffeine-calculator": caffeine,
  "coffee-half-life-calculator": caffeineHalfLife,
  "hydration-needs-calculator": hydration,
  "espresso-calculator": espresso,
  "coffee-calculator": coffeeRatio,
  "cold-brew-ratio-calculator": coldBrew,
  "super-juice-calculator": superJuice,
  "grind-size-calculator": grindSize,
  "coffee-roasting-weight-loss-calculator": roastLoss,
};
