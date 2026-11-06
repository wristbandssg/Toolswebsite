/**
 * Batch: "Food & Drink Calculators" → Beer & Homebrewing Calculators.
 *
 * Data / methods:
 *  - Plato = 135.997·SG³ − 630.272·SG² + 1111.14·SG − 616.868 (ASBC polynomial).
 *  - Hydrometer temperature correction (°F): CG = MG × f(T) ÷ f(Tcal),
 *    f(T) = 1.00130346 − 0.000134722124·T + 0.00000204052596·T² − 0.00000000232820948·T³.
 *  - ABV = (OG − FG) × 131.25; alternate (better above ~7%) = 76.08 (OG − FG)/(1.775 − OG) × FG/0.794.
 *  - Tinseth IBU: utilisation = 1.65 × 0.000125^(G−1) × (1 − e^(−0.04 t)) / 4.15;
 *    IBU = utilisation × AA × oz × 7490 / gallons (AA as a fraction).
 *  - Morey SRM = 1.4922 × MCU^0.6859, MCU = Σ(lb × °L) / gallons; EBC = SRM × 1.97.
 *  - Residual CO₂ after fermentation = 3.0378 − 0.050062·T + 0.00026555·T² (T = warmest °F);
 *    dextrose (corn sugar) g = 15.195 × gallons × (target vols − residual). Other sugars by
 *    fermentable-extract ratio: sucrose 0.91, DME 1.47, honey 1.29, maple syrup 1.53.
 *  - Keg PSI = −16.6999 − 0.0101059T + 0.00116512T² + 0.173354TV + 4.24267V − 0.0684226V².
 *  - Brix → SG = 1 + B / (258.6 − (B / 258.2) × 227.1). Refractometer FG with alcohol present
 *    (Terrill cubic) on readings divided by the wort correction factor (default 1.04).
 *  - Strike water (Palmer): Tw = (0.2 / r)(T2 − T1) + T2, r = quarts per pound.
 *  - Brewing salts, ppm per gram per US gallon: gypsum Ca 61.5 / SO₄ 147.4; calcium chloride
 *    (dihydrate) Ca 72 / Cl 127.4; Epsom Mg 26.1 / SO₄ 103; baking soda Na 72.3 / HCO₃ 191.9;
 *    table salt Na 103.9 / Cl 160.3; chalk Ca 105.8 / HCO₃ 322 (only if dissolved).
 *  - Real extract (Balling): RE = 0.1808 OE + 0.8192 AE (°P). Calories per 12 oz =
 *    1881.22·FG·(OG − FG)/(1.775 − OG) + 3550·FG·(0.1808·OG + 0.8192·FG − 1.0004).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-food-beer-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const round4 = (n: number) => Math.round(n * 10000) / 10000;
const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pick = (v: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(safeNumber(v))));
const L_PER_GAL = 3.785411784;

/** Gallons from a volume + unit dropdown (0 gallons, 1 liters). */
const gal = (v: number, unit: number) => (pick(unit, 2) === 1 ? nonNeg(v) / L_PER_GAL : nonNeg(v));
const toF = (t: number, unit: number) => (pick(unit, 2) === 1 ? safeNumber(t) * 1.8 + 32 : safeNumber(t));

export const plato = (sg: number) => 135.997 * sg ** 3 - 630.272 * sg ** 2 + 1111.14 * sg - 616.868;
const abvStd = (og: number, fg: number) => Math.max(0, (og - fg) * 131.25);
const abvAlt = (og: number, fg: number) => Math.max(0, ((76.08 * (og - fg)) / (1.775 - og)) * (fg / 0.794));
const hydroF = (t: number) => 1.00130346 - 0.000134722124 * t + 0.00000204052596 * t * t - 0.00000000232820948 * t ** 3;
const tinseth = (og: number, minutes: number) => 1.65 * Math.pow(0.000125, og - 1) * ((1 - Math.exp(-0.04 * Math.max(0, minutes))) / 4.15);
const ibuOf = (og: number, gallons: number, oz: number, aaPct: number, minutes: number) => (gallons > 0 ? (tinseth(og, minutes) * (aaPct / 100) * oz * 7490) / gallons : 0);
const srmOf = (mcu: number) => (mcu > 0 ? 1.4922 * Math.pow(mcu, 0.6859) : 0);
const residualCo2 = (tF: number) => 3.0378 - 0.050062 * tF + 0.00026555 * tF * tF;

export const beerGravity: CustomCalculator = (v) => {
  const measured = nonNeg(v.measuredGravity, 1.05);
  const t = toF(v.sampleTemp, v.tempUnit);
  const cal = toF(v.calibrationTemp, v.tempUnit);
  const corrected = measured * (hydroF(t) / hydroF(cal));
  return { correctedGravity: round4(corrected), correction: round4(corrected - measured), plato: round2(plato(corrected)), gravityPoints: round2((corrected - 1) * 1000), potentialAbv: round2(abvStd(corrected, 1.01)) };
};

export const beerRecipe: CustomCalculator = (v) => {
  const g = gal(v.batchSize, v.volumeUnit);
  const eff = nonNeg(v.efficiency, 72) / 100;
  const grains = [1, 2, 3].map((i) => ({ lb: nonNeg(v[`grain${i}Lb`]), ppg: nonNeg(v[`grain${i}Ppg`]), lov: nonNeg(v[`grain${i}Lovibond`]) }));
  const points = g > 0 ? grains.reduce((s, x) => s + x.lb * x.ppg * eff, 0) / g : 0;
  const og = 1 + points / 1000;
  const fg = 1 + (points * (1 - nonNeg(v.attenuation, 75) / 100)) / 1000;
  const ibu = [1, 2].reduce((s, i) => s + ibuOf(og, g, nonNeg(v[`hop${i}Oz`]), nonNeg(v[`hop${i}Alpha`]), nonNeg(v[`hop${i}Minutes`])), 0);
  const mcu = g > 0 ? grains.reduce((s, x) => s + x.lb * x.lov, 0) / g : 0;
  const srm = srmOf(mcu);
  return { originalGravity: round3(og), finalGravity: round3(fg), abv: round2(abvStd(og, fg)), ibu: round2(ibu), srm: round2(srm), ebc: round2(srm * 1.97), buGuRatio: points > 0 ? round2(ibu / points) : 0, totalGrainLb: round2(grains.reduce((s, x) => s + x.lb, 0)) };
};

export const PRIMING_SUGARS: [string, number][] = [["Corn sugar (dextrose)", 1], ["Table sugar (sucrose)", 0.91], ["Dry malt extract (DME)", 1.47], ["Honey", 1.29], ["Maple syrup", 1.53]];
export const primingSugar: CustomCalculator = (v) => {
  const g = gal(v.volume, v.volumeUnit);
  const residual = residualCo2(toF(v.beerTemp, v.tempUnit));
  const need = Math.max(0, nonNeg(v.targetCo2, 2.4) - residual);
  const dextroseG = 15.195 * g * need;
  const factor = PRIMING_SUGARS[pick(v.sugarType, PRIMING_SUGARS.length)][1];
  const grams = dextroseG * factor;
  return { sugarGrams: round2(grams), sugarOunces: round2(grams / 28.3495), residualCo2: round2(residual), co2ToAdd: round2(need), gramsPer12ozBottle: g > 0 ? round2(grams / ((g * 128) / 12)) : 0, dextroseEquivalentGrams: round2(dextroseG) };
};

export const ibu: CustomCalculator = (v) => {
  const g = gal(v.postBoilVolume, v.volumeUnit);
  const og = nonNeg(v.boilGravity, 1.05);
  const parts = [1, 2, 3].map((i) => ibuOf(og, g, nonNeg(v[`hop${i}Oz`]) * (pick(v.weightUnit, 2) === 1 ? 1 / 28.3495 : 1), nonNeg(v[`hop${i}Alpha`]), nonNeg(v[`hop${i}Minutes`])));
  const total = parts.reduce((s, x) => s + x, 0);
  return { totalIbu: round2(total), hop1Ibu: round2(parts[0]), hop2Ibu: round2(parts[1]), hop3Ibu: round2(parts[2]), utilization60Min: round2(tinseth(og, 60) * 100) };
};

export const carbonation: CustomCalculator = (v) => {
  const t = toF(v.beerTemp, v.tempUnit);
  const vol = nonNeg(v.targetCo2, 2.5);
  const psi = -16.6999 - 0.0101059 * t + 0.00116512 * t * t + 0.173354 * t * vol + 4.24267 * vol - 0.0684226 * vol * vol;
  return { regulatorPsi: round2(Math.max(0, psi)), regulatorBar: round2(Math.max(0, psi) * 0.0689476), co2GramsPerLiter: round2(vol * 1.96), beerTempF: round2(t), daysToCarbonate: 7 + Math.round(Math.max(0, vol - 2) * 2) };
};

export const brix: CustomCalculator = (v) => {
  const wcf = nonNeg(v.correctionFactor, 1.04) || 1.04;
  const ob = nonNeg(v.originalBrix, 12) / wcf;
  const og = 1 + ob / (258.6 - (ob / 258.2) * 227.1);
  const fbRaw = nonNeg(v.finalBrix);
  let fg = og;
  if (fbRaw > 0) {
    const fb = fbRaw / wcf;
    fg = 1 - 0.0044993 * ob + 0.0117741 * fb + 0.000275806 * ob * ob - 0.00127169 * fb * fb - 0.00000727999 * ob ** 3 + 0.0000632929 * fb ** 3;
  }
  return { originalGravity: round4(og), finalGravity: round4(fg), originalPlato: round2(plato(og)), abv: round2(abvStd(og, fg)), potentialAbvIfDry: round2(abvStd(og, 1)), sugarGramsPerLiter: round2(nonNeg(v.originalBrix, 12) * 10 * og) };
};

export const SALTS: { key: string; ions: Record<string, number> }[] = [
  { key: "gypsum", ions: { ca: 61.5, so4: 147.4 } },
  { key: "calciumChloride", ions: { ca: 72, cl: 127.4 } },
  { key: "epsom", ions: { mg: 26.1, so4: 103 } },
  { key: "bakingSoda", ions: { na: 72.3, hco3: 191.9 } },
  { key: "tableSalt", ions: { na: 103.9, cl: 160.3 } },
];
export const brewingWater: CustomCalculator = (v) => {
  const g = gal(v.waterVolume, v.volumeUnit);
  const ion: Record<string, number> = { ca: nonNeg(v.startCa), mg: nonNeg(v.startMg), na: nonNeg(v.startNa), so4: nonNeg(v.startSo4), cl: nonNeg(v.startCl), hco3: nonNeg(v.startHco3) };
  if (g > 0) for (const s of SALTS) for (const [k, ppm] of Object.entries(s.ions)) ion[k] += (nonNeg(v[s.key]) * ppm) / g;
  return { calcium: round2(ion.ca), magnesium: round2(ion.mg), sodium: round2(ion.na), sulfate: round2(ion.so4), chloride: round2(ion.cl), bicarbonate: round2(ion.hco3), sulfateToChlorideRatio: ion.cl > 0 ? round2(ion.so4 / ion.cl) : 0 };
};

export const mashWater: CustomCalculator = (v) => {
  const metric = pick(v.unitSystem, 2) === 1;
  const batch = metric ? nonNeg(v.batchSize) / L_PER_GAL : nonNeg(v.batchSize);
  const grainLb = metric ? nonNeg(v.grainWeight) * 2.20462 : nonNeg(v.grainWeight);
  const strike = (grainLb * nonNeg(v.mashThickness, 1.5)) / 4;
  const boilOff = (metric ? nonNeg(v.boilOffRate) / L_PER_GAL : nonNeg(v.boilOffRate)) * (nonNeg(v.boilMinutes, 60) / 60);
  const absorption = grainLb * nonNeg(v.absorption, 0.125);
  const losses = metric ? (nonNeg(v.trubLoss) + nonNeg(v.deadspace)) / L_PER_GAL : nonNeg(v.trubLoss) + nonNeg(v.deadspace);
  const preBoil = batch + boilOff + (metric ? nonNeg(v.trubLoss) / L_PER_GAL : nonNeg(v.trubLoss));
  const total = preBoil + absorption + (metric ? nonNeg(v.deadspace) / L_PER_GAL : nonNeg(v.deadspace));
  const sparge = Math.max(0, total - strike);
  const out = (x: number) => round2(metric ? x * L_PER_GAL : x);
  return { totalWater: out(total), strikeWater: out(strike), spargeWater: out(sparge), preBoilVolume: out(preBoil), grainAbsorption: out(absorption), boilOff: out(boilOff), lossesTrubDeadspace: out(losses), mashVolume: out(strike + grainLb * 0.08) };
};

export const strikeWater: CustomCalculator = (v) => {
  const c = pick(v.tempUnit, 2) === 1;
  const r = nonNeg(v.mashThickness, 1.5) || 1.5;
  const t1 = toF(v.grainTemp, v.tempUnit);
  const t2 = toF(v.targetMashTemp, v.tempUnit);
  const tw = (0.2 / r) * (t2 - t1) + t2;
  const grainLb = pick(v.weightUnit, 2) === 1 ? nonNeg(v.grainWeight) * 2.20462 : nonNeg(v.grainWeight);
  const quarts = grainLb * r;
  const outT = (f: number) => round2(c ? (f - 32) / 1.8 : f);
  return { strikeTemp: outT(tw), strikeGallons: round2(quarts / 4), strikeLiters: round2((quarts / 4) * L_PER_GAL), strikeQuarts: round2(quarts), riseAboveMash: round2(c ? (tw - t2) / 1.8 : tw - t2) };
};

export const brewingEfficiency: CustomCalculator = (v) => {
  const g = gal(v.volume, v.volumeUnit);
  const measured = (nonNeg(v.measuredGravity, 1.05) - 1) * 1000 * g;
  const grains = [1, 2, 3].map((i) => nonNeg(v[`grain${i}Lb`]) * nonNeg(v[`grain${i}Ppg`]));
  const potential = grains.reduce((s, x) => s + x, 0);
  const eff = potential > 0 ? (measured / potential) * 100 : 0;
  return { efficiency: round2(eff), measuredPoints: round2(measured), potentialPoints: round2(potential), gravityAt75: g > 0 ? round3(1 + (potential * 0.75) / g / 1000) : 0 };
};

export const preBoilGravity: CustomCalculator = (v) => {
  const pre = gal(v.preBoilVolume, v.volumeUnit);
  const post = gal(v.postBoilVolume, v.volumeUnit);
  const target = (nonNeg(v.targetOg, 1.05) - 1) * 1000;
  const current = (nonNeg(v.currentGravity, 1.044) - 1) * 1000;
  const preGravity = pre > 0 ? 1 + (target * post) / pre / 1000 : 0;
  const predictedOg = post > 0 ? 1 + (current * pre) / post / 1000 : 0;
  // Gravity-points × volume are conserved: compare what the wort holds with what the target needs.
  const held = current * pre;
  const needed = target * post;
  const water = target > 0 && held > needed ? held / target - post : 0; // add after the boil
  const dmeLb = held < needed ? (needed - held) / 44 : 0;
  const k = pick(v.volumeUnit, 2) === 1 ? L_PER_GAL : 1;
  return { preBoilGravityNeeded: round4(preGravity), predictedOg: round4(predictedOg), waterToAdd: round2(water * k), dmeToAddLb: round2(dmeLb), gravityPointsTarget: round2(target) };
};

export const attenuation: CustomCalculator = (v) => {
  const og = nonNeg(v.originalGravity, 1.05);
  const fg = nonNeg(v.finalGravity, 1.01);
  const apparent = og > 1 ? ((og - fg) / (og - 1)) * 100 : 0;
  const oe = plato(og);
  const ae = plato(fg);
  const re = 0.1808 * oe + 0.8192 * ae;
  const real = oe > 0 ? ((oe - re) / oe) * 100 : 0;
  return { apparentAttenuation: round2(apparent), realAttenuation: round2(real), abv: round2(abvStd(og, fg)), abvAlternate: round2(abvAlt(og, fg)), realExtractPlato: round2(re), caloriesPer12oz: Math.max(0, Math.round(1881.22 * fg * ((og - fg) / (1.775 - og)) + 3550 * fg * (0.1808 * og + 0.8192 * fg - 1.0004))) };
};

export const beerColour: CustomCalculator = (v) => {
  const g = gal(v.batchSize, v.volumeUnit);
  const kg = pick(v.weightUnit, 2) === 1;
  const ebcIn = pick(v.colorUnit, 2) === 1;
  const mcu = g > 0 ? [1, 2, 3, 4].reduce((s, i) => {
    const lb = nonNeg(v[`grain${i}Weight`]) * (kg ? 2.20462 : 1);
    const c = nonNeg(v[`grain${i}Color`]);
    const lov = ebcIn ? (c / 1.97 + 0.76) / 1.3546 : c;
    return s + lb * lov;
  }, 0) / g : 0;
  const srm = srmOf(mcu);
  const BANDS: [number, number][] = [[3, 1], [4, 2], [6, 3], [9, 4], [14, 5], [17, 6], [20, 7], [29, 8], [35, 9], [9999, 10]];
  return { srm: round2(srm), ebc: round2(srm * 1.97), mcu: round2(mcu), colourBand: (BANDS.find(([max]) => srm <= max) ?? BANDS[BANDS.length - 1])[1] };
};

export const BOTTLES: [string, number][] = [["12 oz bottle (355 mL)", 12], ["16 oz / pint (473 mL)", 16], ["22 oz bomber (650 mL)", 22], ["500 mL bottle", 16.907], ["330 mL bottle", 11.159], ["750 mL bottle", 25.36], ["1 L swing-top", 33.814], ["32 oz crowler", 32], ["64 oz growler", 64]];
export const bottling: CustomCalculator = (v) => {
  const g = gal(v.batchSize, v.volumeUnit);
  const usable = Math.max(0, g * 128 * (1 - nonNeg(v.lossPercent, 5) / 100));
  const size = BOTTLES[pick(v.bottleSize, BOTTLES.length)][1];
  const bottles = Math.floor(usable / size);
  return { bottles, sixPacks: round2(bottles / 6), cases24: round2(bottles / 24), usableOunces: round2(usable), capsToBuy: Math.ceil(bottles * 1.1), leftoverOunces: round2(usable - bottles * size) };
};

export const SHELF: [string, number][] = [["Hazy / NEIPA", 60], ["IPA / pale ale (hop-forward)", 90], ["Lager / pilsner / wheat", 180], ["Amber / brown / porter", 180], ["Stout (regular strength)", 270], ["Sour / wild (bottle-conditioned)", 365], ["Barleywine / imperial stout / high ABV", 730]];
export const beerExpiration: CustomCalculator = (v) => {
  const base = SHELF[pick(v.style, SHELF.length)][1];
  const storage = [1, 0.5, 0.33][pick(v.storage, 3)];
  const container = [1, 0.9, 0.25][pick(v.container, 3)];
  const life = Math.round(base * storage * container);
  const packaged = safeNumber(v.packagedDate);
  const best = packaged + life;
  return { bestByDate: best, freshnessDays: life, daysRemaining: Math.round(best - safeNumber(v.today)), ageDays: Math.round(safeNumber(v.today) - packaged) };
};

export const foodBeerCustomCalculators: Record<string, CustomCalculator> = {
  "beer-gravity-calculator": beerGravity,
  "beer-recipe-calculator": beerRecipe,
  "priming-sugar-calculator": primingSugar,
  "ibu-calculator": ibu,
  "carbonation-calculator": carbonation,
  "brix-calculator": brix,
  "brewing-water-calculator": brewingWater,
  "mash-water-calculator": mashWater,
  "strike-water-calculator": strikeWater,
  "brewing-efficiency-calculator": brewingEfficiency,
  "pre-boil-gravity-calculator": preBoilGravity,
  "beer-attenuation-calculator": attenuation,
  "beer-colour-calculator": beerColour,
  "bottling-calculator": bottling,
  "beer-expiration-date-calculator": beerExpiration,
};
