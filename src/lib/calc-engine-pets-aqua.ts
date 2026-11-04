/**
 * Batch: "Pets & Animals Calculators" → Aquarium, Reptile & Small Pet Calculators.
 *
 * Data / methods:
 *  - Volume: 1 US gal = 231 in³ = 3.785 L; water 8.34 lb/gal fresh, ≈8.55 lb/gal salt.
 *  - Free (un-ionised) ammonia fraction = 1 / (1 + 10^(pKa − pH)), pKa = 0.09018 + 2729.92 / T(K)
 *    (Emerson et al. 1975). Free NH3 > 0.02 mg/L stresses fish, > 0.05 is toxic.
 *  - Reef chemistry: 1 dKH = 0.357 meq/L → sodium bicarbonate 30.0 mg/L, soda ash 18.9 mg/L per dKH;
 *    calcium chloride dihydrate 3.67 mg per mg Ca; magnesium chloride hexahydrate 8.37 mg per mg Mg.
 *  - Genetics: Mendelian single-gene Punnett squares (recessive, incomplete dominant, dominant),
 *    two genes assumed unlinked (independent assortment).
 *  - Rats: about 2.5 cubic feet of cage per rat (common rat-club guideline).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-pets-aqua-calculators.ts for the copy.
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
const GAL_L = 3.78541;

export const BODY: [string, number][] = [["Slim (tetras, rasboras, danios)", 1], ["Medium (gouramis, barbs, livebearers)", 1.5], ["Heavy bioload (goldfish, cichlids, plecos)", 2.5]];
export const stocking: CustomCalculator = (v) => {
  const gal = nonNeg(v.gallons);
  const turnover = gal > 0 ? nonNeg(v.filterGph) / gal : 0;
  const filterF = turnover < 4 ? 0.85 : turnover < 8 ? 1 : 1.15;
  const capacity = gal * filterF * (yes(v.planted) ? 1.1 : 1);
  let inches = 0;
  let load = 0;
  let fish = 0;
  for (const i of [1, 2, 3]) {
    const n = Math.round(nonNeg(v[`count${i}`]));
    const len = nonNeg(v[`length${i}`]);
    inches += n * len;
    load += n * len * BODY[pick(v[`body${i}`], BODY.length)][1];
    fish += n;
  }
  const p = capacity > 0 ? (load / capacity) * 100 : 0;
  return { stockingPercent: round2(p), bioloadInches: round2(load), totalFishInches: round2(inches), capacityInches: round2(capacity), remainingInches: round2(capacity - load), totalFish: fish, filterTurnover: round2(turnover), status: p < 85 ? 1 : p <= 110 ? 2 : 3 };
};

export const copper: CustomCalculator = (v) => {
  const gal = nonNeg(v.gallons) * (1 - Math.min(90, nonNeg(v.displacement)) / 100);
  const labelPpm = nonNeg(v.labelPpm, 2);
  const per = nonNeg(v.labelGallons, 1);
  const raise = Math.max(0, nonNeg(v.targetPpm) - nonNeg(v.currentPpm));
  const ml = labelPpm > 0 && per > 0 ? (raise / labelPpm) * nonNeg(v.labelMl) * (gal / per) : 0;
  return { doseMl: round2(ml), doseTeaspoons: round2(ml / 4.93), firstStepMl: round2(ml / 2), waterGallons: round2(gal), waterLiters: round2(gal * GAL_L), ppmIncrease: round2(raise) };
};

export const reefDosing: CustomCalculator = (v) => {
  const L = nonNeg(v.gallons) * GAL_L;
  const dAlk = Math.max(0, nonNeg(v.targetAlk) - nonNeg(v.currentAlk));
  const dCa = Math.max(0, nonNeg(v.targetCa) - nonNeg(v.currentCa));
  const dMg = Math.max(0, nonNeg(v.targetMg) - nonNeg(v.currentMg));
  const soda = pick(v.alkSource, 2) === 1;
  const alkG = (dAlk * (soda ? 18.9 : 30.0) * L) / 1000;
  const caG = (dCa * 3.67 * L) / 1000;
  const mgG = (dMg * 8.37 * L) / 1000;
  const days = Math.max(Math.ceil(dAlk / 1.4 - 1e-9), Math.ceil(dCa / 50 - 1e-9), Math.ceil(dMg / 100 - 1e-9), 0);
  return { alkalinityGrams: round2(alkG), alkalinityTeaspoons: round2(alkG / (soda ? 5.3 : 4.8)), calciumChlorideGrams: round2(caG), magnesiumChlorideGrams: round2(mgG), daysToReachTarget: days, alkGramsPerDay: round2(days ? alkG / days : 0), calciumGramsPerDay: round2(days ? caG / days : 0) };
};

export const gfo: CustomCalculator = (v) => {
  const gal = nonNeg(v.gallons);
  const full = gal * 0.4;
  const start = full / 2;
  const carbon = gal * 1.5;
  const changes = 52 / Math.max(1, nonNeg(v.changeWeeks, 6));
  const yearlyG = (full + carbon) * changes;
  return { gfoGrams: round2(full), gfoStartGrams: round2(start), gfoCups: round2(full / 215), carbonGrams: round2(carbon), carbonCups: round2(carbon / 120), changesPerYear: round2(changes), yearlyCost: round2((yearlyG / 453.592) * nonNeg(v.pricePerLb)) };
};

export const volume: CustomCalculator = (v) => {
  const k = pick(v.unit, 2) === 0 ? 2.54 : 1;
  const a = nonNeg(v.length) * k;
  const b = nonNeg(v.width) * k;
  const h = nonNeg(v.height) * k;
  const shape = pick(v.shape, 4);
  const cm3 = shape === 0 ? a * b * h : shape === 1 ? Math.PI * (a / 2) ** 2 * h : shape === 2 ? ((3 * Math.sqrt(3)) / 2) * a * a * h : (Math.PI * a * a * h) / 4;
  const L = cm3 / 1000;
  const gal = L / GAL_L;
  const net = gal * (1 - Math.min(90, nonNeg(v.displacement)) / 100);
  return { liters: round2(L), usGallons: round2(gal), ukGallons: round2(L / 4.54609), netGallons: round2(net), netLiters: round2(net * GAL_L), waterWeightLb: round2(net * 8.34), waterWeightKg: round2(net * GAL_L) };
};

export const tankWeight: CustomCalculator = (v) => {
  const gal = nonNeg(v.gallons);
  const water = gal * (pick(v.water, 2) === 1 ? 8.55 : 8.34) * (1 - Math.min(90, nonNeg(v.displacement, 10)) / 100);
  const tank = nonNeg(v.tankWeight) > 0 ? nonNeg(v.tankWeight) : gal * 1.25 + 5;
  const sub = nonNeg(v.substrateLb);
  const total = water + tank + sub + nonNeg(v.rockLb) + nonNeg(v.standLb) + nonNeg(v.equipmentLb);
  const footSqFt = (nonNeg(v.footLength) * nonNeg(v.footWidth)) / 144;
  return { totalWeightLb: round2(total), totalWeightKg: round2(total * 0.45359237), waterWeightLb: round2(water), emptyTankLb: round2(tank), floorLoadPsf: round2(footSqFt > 0 ? total / footSqFt : 0), overTypicalFloorRating: footSqFt > 0 && total / footSqFt > 40 ? 1 : 0 };
};

export const SUBSTRATES: [string, number][] = [["Aquarium sand", 1.6], ["Aragonite / reef sand", 1.45], ["Gravel", 1.55], ["Aqua soil (planted)", 1.0], ["Crushed coral", 1.3]];
export const sand: CustomCalculator = (v) => {
  const k = pick(v.unit, 2) === 0 ? 2.54 : 1;
  const cm3 = nonNeg(v.length) * k * nonNeg(v.width) * k * nonNeg(v.depth) * k;
  const kg = (cm3 * SUBSTRATES[pick(v.substrate, SUBSTRATES.length)][1]) / 1000;
  const lb = kg / 0.45359237;
  const bag = nonNeg(v.bagLb, 20);
  return { poundsNeeded: round2(lb), kilogramsNeeded: round2(kg), bagsNeeded: bag > 0 ? Math.ceil(lb / bag - 1e-9) : 0, volumeLiters: round2(cm3 / 1000), cost: round2(bag > 0 ? Math.ceil(lb / bag - 1e-9) * nonNeg(v.bagPrice) : 0) };
};

export const GOLDFISH: [string, number, number][] = [["Fancy goldfish (oranda, ryukin, ranchu)", 20, 10], ["Common / comet / shubunkin", 40, 20]];
export const goldfish: CustomCalculator = (v) => {
  const [, first, extra] = GOLDFISH[pick(v.type, 2)];
  const n = Math.max(1, Math.round(nonNeg(v.count, 1)));
  const gal = first + (n - 1) * extra;
  return { minimumGallons: gal, minimumLiters: round2(gal * GAL_L), filterGph: gal * 10, weeklyWaterChangeGallons: round2(gal * 0.3), currentTankShortfall: Math.max(0, gal - nonNeg(v.currentTank)), pondRecommended: pick(v.type, 2) === 1 && n > 3 ? 1 : 0 };
};

export const turtle: CustomCalculator = (v) => {
  const shell = pick(v.unit, 2) === 0 ? nonNeg(v.shellLength) : nonNeg(v.shellLength) / 2.54;
  const n = Math.max(1, Math.round(nonNeg(v.count, 1)));
  const first = shell * 10;
  const gal = Math.max(20, first * (1 + (n - 1) * 0.5));
  return { minimumGallons: round2(gal), minimumLiters: round2(gal * GAL_L), minimumWaterDepthIn: round2(shell * 1.5), filterRatedGallons: round2(gal * 2.5), baskingAreaIn: round2(shell * 1.5) };
};

export const ammonia: CustomCalculator = (v) => {
  const tan = nonNeg(v.totalAmmonia);
  const c = pick(v.tempUnit, 2) === 0 ? (safeNumber(v.temperature, 77) - 32) / 1.8 : safeNumber(v.temperature, 25);
  const pka = 0.09018 + 2729.92 / (c + 273.15);
  const frac = 1 / (1 + Math.pow(10, pka - safeNumber(v.ph, 7)));
  const nh3 = tan * frac;
  return { freeAmmoniaMgL: Math.round(nh3 * 10000) / 10000, percentFreeAmmonia: round2(frac * 100), ammoniumMgL: round2(tan - nh3), riskLevel: nh3 < 0.02 ? 0 : nh3 < 0.05 ? 1 : nh3 < 0.2 ? 2 : 3, maxSafeTotalAmmonia: round2(frac > 0 ? 0.02 / frac : 0) };
};

const TEMPER = [[1, 0.6, 0.2], [0.6, 0.5, 0.3], [0.2, 0.3, 0.4]];
export const compatibility: CustomCalculator = (v) => {
  const tLo = Math.max(safeNumber(v.tempMinA), safeNumber(v.tempMinB));
  const tHi = Math.min(safeNumber(v.tempMaxA), safeNumber(v.tempMaxB));
  const pLo = Math.max(safeNumber(v.phMinA), safeNumber(v.phMinB));
  const pHi = Math.min(safeNumber(v.phMaxA), safeNumber(v.phMaxB));
  const big = Math.max(nonNeg(v.sizeA), nonNeg(v.sizeB));
  const small = Math.min(nonNeg(v.sizeA), nonNeg(v.sizeB));
  const ratio = small > 0 ? big / small : 0;
  const temp = tHi >= tLo ? 1 : 0;
  const ph = pHi >= pLo ? 1 : 0;
  const sizeScore = ratio <= 2 ? 1 : ratio <= 3 ? 0.6 : 0.1;
  const tm = TEMPER[pick(v.temperA, 3)][pick(v.temperB, 3)];
  const score = temp * ph * (sizeScore * 0.5 + tm * 0.5) * 100;
  return { compatibilityScore: Math.round(score), compatible: score >= 60 ? 1 : 0, sharedTempLow: temp ? tLo : 0, sharedTempHigh: temp ? tHi : 0, sharedPhLow: ph ? round2(pLo) : 0, sharedPhHigh: ph ? round2(pHi) : 0, sizeRatio: round2(ratio), predationRisk: ratio > 3 ? 1 : 0 };
};

function gene(type: number, a: number, b: number) {
  const pa = a / 2;
  const pb = b / 2;
  const g0 = (1 - pa) * (1 - pb);
  const g1 = pa * (1 - pb) + pb * (1 - pa);
  const g2 = pa * pb;
  if (type === 0) return { visual: g2, het: g1, sup: 0, normal: g0, possHet: g0 + g1 > 0 ? g1 / (g0 + g1) : 0 };
  if (type === 1) return { visual: g1, het: 0, sup: g2, normal: g0, possHet: 0 };
  return { visual: g1 + g2, het: 0, sup: g2, normal: g0, possHet: 0 };
}
export const morph: CustomCalculator = (v) => {
  const g1 = gene(pick(v.type1, 3), pick(v.mom1, 3), pick(v.dad1, 3));
  const g2 = gene(pick(v.type2, 3), pick(v.mom2, 3), pick(v.dad2, 3));
  const vis1 = g1.visual + (pick(v.type1, 3) === 1 ? g1.sup : 0);
  const vis2 = g2.visual + (pick(v.type2, 3) === 1 ? g2.sup : 0);
  const clutch = nonNeg(v.clutchSize, 6);
  const p = (x: number) => round2(x * 100);
  return { gene1VisualPercent: p(g1.visual), gene1HetPercent: p(g1.het), gene1SuperPercent: p(g1.sup), gene1NormalPercent: p(g1.normal), gene1PossibleHetPercent: p(g1.possHet), gene2VisualPercent: p(g2.visual), gene2HetPercent: p(g2.het), gene2SuperPercent: p(g2.sup), gene2NormalPercent: p(g2.normal), bothGenesVisualPercent: p(vis1 * vis2), expectedBothVisualPerClutch: round2(vis1 * vis2 * clutch) };
};

export const feederColony: CustomCalculator = (v) => {
  const perWeek = Math.round(nonNeg(v.reptiles, 1)) * nonNeg(v.feedersPerFeeding) * nonNeg(v.feedingsPerWeek);
  const females = Math.ceil((perWeek / 3) * 1.25 - 1e-9);
  const males = Math.ceil(females / 5 - 1e-9);
  const adults = females + males;
  const bin = Math.max(10, Math.ceil(((adults + perWeek * 8) / 60) - 1e-9));
  const saved = perWeek * 52 * nonNeg(v.feederPrice);
  const startup = adults * nonNeg(v.adultPrice) + nonNeg(v.setupCost);
  return { feedersPerWeek: round2(perWeek), femalesNeeded: females, malesNeeded: males, binGallons: bin, monthsUntilSelfSustaining: 4, yearlyFeederCostSaved: round2(saved), startupCost: round2(startup), paybackMonths: round2(saved > 0 ? (startup / saved) * 12 : 0) };
};

export const ratCage: CustomCalculator = (v) => {
  const k = pick(v.unit, 2) === 0 ? 1 : 1 / 2.54;
  const l = nonNeg(v.length) * k;
  const w = nonNeg(v.width) * k;
  const h = nonNeg(v.height) * k;
  const cuft = (l * w * h) / 1728;
  const max = Math.floor(cuft / 2.5 + 1e-9);
  return { cubicFeet: round2(cuft), maxRats: max, floorAreaSqFt: round2((l * w) / 144), barSpacingOk: nonNeg(v.barSpacing) > 0 && nonNeg(v.barSpacing) <= (pick(v.ratAge, 2) === 0 ? 0.5 : 1) ? 1 : 0, roomForPair: max >= 2 ? 1 : 0 };
};

export const pigeon: CustomCalculator = (v) => {
  const yards = pick(v.distanceUnit, 3) === 0 ? nonNeg(v.distance) * 1760 + nonNeg(v.extraYards) : pick(v.distanceUnit, 3) === 1 ? (nonNeg(v.distance) * 1000) / 0.9144 : nonNeg(v.distance);
  const rel = nonNeg(v.releaseHour) * 60 + nonNeg(v.releaseMinute);
  const arr = nonNeg(v.arrivalHour) * 60 + nonNeg(v.arrivalMinute) + nonNeg(v.arrivalSecond) / 60 + nonNeg(v.daysLater) * 1440 - nonNeg(v.nightHours) * 60;
  const mins = Math.max(0, arr - rel);
  const ypm = mins > 0 ? yards / mins : 0;
  return { yardsPerMinute: round2(ypm), metersPerMinute: round2(ypm * 0.9144), milesPerHour: round2((ypm * 60) / 1760), kmPerHour: round2((ypm * 0.9144 * 60) / 1000), flyingMinutes: round2(mins), distanceYards: Math.round(yards) };
};

export const petsAquaCustomCalculators: Record<string, CustomCalculator> = {
  "aquarium-stocking-calculator": stocking,
  "aquarium-copper-treatment-calculator": copper,
  "reef-tank-dosing-calculator": reefDosing,
  "gfo-carbon-dosing-calculator": gfo,
  "aquarium-volume-calculator": volume,
  "aquarium-weight-calculator": tankWeight,
  "aquarium-sand-calculator": sand,
  "goldfish-tank-size-calculator": goldfish,
  "turtle-tank-size-calculator": turtle,
  "aquarium-ammonia-calculator": ammonia,
  "fish-compatibility-calculator": compatibility,
  "reptile-morph-genetics-calculator": morph,
  "dubia-roach-colony-calculator": feederColony,
  "rat-cage-size-calculator": ratCage,
  "pigeon-velocity-calculator": pigeon,
};
