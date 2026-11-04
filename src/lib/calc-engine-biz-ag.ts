/**
 * Batch: "Business & Industrial Calculators" → Agriculture & Livestock Calculators.
 *
 * Data / methods:
 *  - Corn yield components: bu/ac = ears/ac × kernels/ear ÷ 90,000 (kernels per bushel factor);
 *    1/1000-acre row length = 43,560 ÷ 1,000 ÷ row width (ft).
 *  - Grain bins: 1 bu = 1.2445 ft³ (0.8036 bu/ft³); corn peak at ~23° angle of repose.
 *  - Sprayer calibration (TeeJet): GPA = GPM × 5,940 ÷ (MPH × nozzle spacing in);
 *    nozzle flow ∝ √pressure.
 *  - Field capacity: acres/h = width (ft) × mph × efficiency ÷ 8.25.
 *  - Corn shrink: water shrink = (M₁ − M₂) ÷ (100 − M₂), market moisture 15.5%.
 *  - EMC: ASABE D245.6 modified Henderson, M(%db) = [ln(1 − RH) ÷ (−K(T + C))]^(1/N).
 *  - GDD (corn method): ((min(Tmax, 86) + max(Tmin, 50)) ÷ 2) − 50 °F.
 *  - Gestation: cattle 283 d (Jersey/Holstein 279, Angus 281, Hereford 285, Brahman 292),
 *    goats 150 d, sheep 147 d. 7-day CO-Synch + CIDR (beef cows TAI at 66 ± 2 h, heifers 54 ± 2 h).
 *  - AUM = 780 lb of forage dry matter (26 lb/day × 30 days) per 1,000 lb animal unit.
 *  - PRF insurance subsidies by coverage level (USDA RMA): 70–75% 59%, 80–85% 55%, 90% 51%.
 *  - Pearson square for two-ingredient rations.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-biz-ag-calculators.ts for the copy.
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
const DAY = 86400000;
const today = () => Math.floor(Date.now() / DAY);

// --- Crops --------------------------------------------------------------------------------------------------
export const cornYield: CustomCalculator = (v) => {
  const rowFt = 43560 / 1000 / (Math.max(1, nonNeg(v.rowSpacing, 30)) / 12);
  const earsAcre = nonNeg(v.earsCounted) * 1000;
  const kernels = nonNeg(v.kernelRows) * nonNeg(v.kernelsPerRow);
  const bu = (earsAcre * kernels) / Math.max(1000, nonNeg(v.kernelFactor, 90000));
  return { yieldBuPerAcre: round2(bu), earsPerAcre: Math.round(earsAcre), kernelsPerEar: Math.round(kernels), rowLengthFor1000thAcreFt: round2(rowFt), yieldTonnesPerHa: round2(bu * 56 * 0.0011208), revenuePerAcre: round2(bu * nonNeg(v.price)), totalBushels: round2(bu * nonNeg(v.acres)) };
};

export const soybeanYield: CustomCalculator = (v) => {
  const plantsAcre = pick(v.mode, 2) === 0 ? (nonNeg(v.plantsPerFoot) * 43560 * 12) / Math.max(1, nonNeg(v.rowSpacing, 30)) : nonNeg(v.plantsPerAcre);
  const seeds = plantsAcre * nonNeg(v.podsPerPlant) * nonNeg(v.seedsPerPod, 2.5);
  const bu = seeds / Math.max(500, nonNeg(v.seedsPerLb, 2800)) / 60;
  return { yieldBuPerAcre: round2(bu), plantsPerAcre: Math.round(plantsAcre), seedsPerAcre: Math.round(seeds), yieldTonnesPerHa: round2(bu * 60 * 0.0011208), revenuePerAcre: round2(bu * nonNeg(v.price)) };
};

export const acresPerHour: CustomCalculator = (v) => {
  const ac = (nonNeg(v.width) * nonNeg(v.speed) * (nonNeg(v.efficiency, 75) / 100)) / 8.25;
  const field = nonNeg(v.fieldAcres);
  return { acresPerHour: round2(ac), acresPerDay: round2(ac * nonNeg(v.hoursPerDay, 10)), hoursForField: round2(ac ? field / ac : 0), daysForField: round2(ac ? field / (ac * nonNeg(v.hoursPerDay, 10)) : 0), hectaresPerHour: round2(ac * 0.404686), fuelGallons: round2(ac ? (field / ac) * nonNeg(v.fuelPerHour) : 0) };
};

export const CROP_LB: [string, number][] = [["Corn", 56], ["Soybeans", 60], ["Wheat", 60], ["Barley", 48], ["Oats", 32], ["Sorghum", 56], ["Canola", 50], ["Sunflower", 25]];
export const grainBin: CustomCalculator = (v) => {
  const r = nonNeg(v.diameter) / 2;
  const cyl = Math.PI * r * r * nonNeg(v.grainDepth);
  const peakH = yes(v.peaked) ? r * Math.tan((nonNeg(v.reposeAngle, 23) * Math.PI) / 180) : 0;
  const cone = (Math.PI * r * r * peakH) / 3;
  const ft3 = (cyl + cone) * (1 + nonNeg(v.compaction, 4) / 100);
  const bu = ft3 * 0.8036;
  const lbBu = CROP_LB[pick(v.crop, CROP_LB.length)][1];
  return { bushels: Math.round(bu), cubicFeet: round2(ft3), peakHeightFt: round2(peakH), weightTons: round2((bu * lbBu) / 2000), metricTonnes: round2((bu * lbBu * 0.45359237) / 1000), grainValue: round2(bu * nonNeg(v.price)), bushelsPerFootOfDepth: Math.round(Math.PI * r * r * 0.8036) };
};

export const fertilizer: CustomCalculator = (v) => {
  const grade = [nonNeg(v.n), nonNeg(v.p), nonNeg(v.k)];
  const target = [nonNeg(v.targetN), nonNeg(v.targetP), nonNeg(v.targetK)];
  const i = pick(v.limitBy, 3);
  const rate = grade[i] > 0 ? target[i] / (grade[i] / 100) : 0;
  const area = pick(v.areaUnit, 2) === 0 ? nonNeg(v.area) : nonNeg(v.area) / 43.56; // acres or 1,000 sq ft → per acre basis
  const totalLb = rate * area;
  const bags = ceil(totalLb / Math.max(1, nonNeg(v.bagSize, 50)));
  return { productLbPerAcre: round2(rate), productLbPer1000SqFt: round2(rate / 43.56), totalProductLb: round2(totalLb), bagsNeeded: bags, nSuppliedLbPerAcre: round2((rate * grade[0]) / 100), p2o5SuppliedLbPerAcre: round2((rate * grade[1]) / 100), k2oSuppliedLbPerAcre: round2((rate * grade[2]) / 100), totalCost: round2(bags * nonNeg(v.bagPrice)) };
};

export const NOZZLE_SIZES = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.5];
export const sprayer: CustomCalculator = (v) => {
  const mph = Math.max(0.1, nonNeg(v.speed));
  const W = Math.max(1, nonNeg(v.nozzleSpacing, 20));
  const mode = pick(v.mode, 2);
  const gpm = mode === 0 ? (nonNeg(v.targetGpa) * mph * W) / 5940 : nonNeg(v.ounces) / 128 / Math.max(0.1, nonNeg(v.catchMinutes, 1));
  const gpa = (gpm * 5940) / (mph * W);
  const size = NOZZLE_SIZES.find((s) => s * Math.sqrt(60 / 40) >= gpm) ?? NOZZLE_SIZES[NOZZLE_SIZES.length - 1];
  const pressure = 40 * Math.pow(gpm / size, 2);
  const boomAcres = nonNeg(v.tankGallons) > 0 && gpa > 0 ? nonNeg(v.tankGallons) / gpa : 0;
  return { gallonsPerAcre: round2(gpa), gpmPerNozzle: Math.round(gpm * 1000) / 1000, ouncesPerMinute: round2(gpm * 128), nozzleSizeCode: Math.round(size * 100), pressureForThatNozzlePsi: round2(pressure), acresPerTank: round2(boomAcres), productPerTank: round2(boomAcres * nonNeg(v.productRatePerAcre)) };
};

export const N_SOURCES: [string, number, number][] = [["Anhydrous ammonia (82-0-0)", 82, 0], ["Urea (46-0-0)", 46, 0], ["UAN 28% (3.0 lb N/gal)", 28, 3.0], ["UAN 32% (3.54 lb N/gal)", 32, 3.54], ["Ammonium sulfate (21-0-0-24S)", 21, 0]];
export const PREV_CREDIT = [0, 30, 100, 50, 0];
export const nitrogenRate: CustomCalculator = (v) => {
  const gross = nonNeg(v.yieldGoal) * nonNeg(v.nPerBushel, 1.0);
  const credit = PREV_CREDIT[pick(v.previousCrop, PREV_CREDIT.length)] + nonNeg(v.manureN) + nonNeg(v.soilNitrateCredit);
  const n = Math.max(0, gross - credit);
  const [, pctN, lbGal] = N_SOURCES[pick(v.source, N_SOURCES.length)];
  const lb = pctN > 0 ? n / (pctN / 100) : 0;
  return { nRateLbPerAcre: round2(n), productLbPerAcre: round2(lb), productGalPerAcre: round2(lbGal > 0 ? n / lbGal : 0), creditsLbPerAcre: round2(credit), costPerAcre: round2(n * nonNeg(v.pricePerLbN)), totalCost: round2(n * nonNeg(v.pricePerLbN) * nonNeg(v.acres)), totalProductTons: round2((lb * nonNeg(v.acres)) / 2000) };
};

export const TEXTURE = [1.0, 1.5, 2.0, 2.5]; // tons of 100% ECCE lime per acre per pH unit (6 in): sand, loam, silt/clay loam, clay / high OM
export const lime: CustomCalculator = (v) => {
  const delta = Math.max(0, safeNumber(v.targetPh, 6.5) - safeNumber(v.currentPh, 5.8));
  const pure = delta * TEXTURE[pick(v.texture, TEXTURE.length)] * (nonNeg(v.depth, 6) / 6);
  const tons = pure / Math.max(0.1, nonNeg(v.ecce, 90) / 100);
  const acres = pick(v.areaUnit, 2) === 0 ? nonNeg(v.area) : nonNeg(v.area) / 43.56;
  return { tonsPerAcre: round2(tons), lbPer1000SqFt: round2((tons * 2000) / 43.56), totalTons: round2(tons * acres), totalCost: round2(tons * acres * nonNeg(v.pricePerTon) + (nonNeg(v.spreadPerAcre) * acres)), phChange: round2(delta), bags40lb: ceil((tons * acres * 2000) / 40) };
};

export const seedingRate: CustomCalculator = (v) => {
  const seeds = nonNeg(v.targetStand) / Math.max(0.01, (nonNeg(v.germination, 90) / 100) * (nonNeg(v.emergence, 85) / 100));
  const lb = seeds / Math.max(1, nonNeg(v.seedsPerLb, 2800));
  const perFt = (seeds * Math.max(1, nonNeg(v.rowSpacing, 30))) / 12 / 43560;
  const units = (seeds * nonNeg(v.acres)) / Math.max(1, nonNeg(v.seedsPerUnit, 140000));
  return { seedsPerAcre: Math.round(seeds), lbPerAcre: round2(lb), bushelsPerAcre: round2(lb / 60), seedsPerRowFoot: round2(perFt), seedUnitsNeeded: ceil(units), seedCost: round2(ceil(units) * nonNeg(v.pricePerUnit)), seedCostPerAcre: round2(nonNeg(v.acres) ? (ceil(units) * nonNeg(v.pricePerUnit)) / nonNeg(v.acres) : 0) };
};

export const GDD_BASE: [string, number, number][] = [["Corn / soybeans (50 °F, cap 86 °F)", 50, 86], ["Wheat / barley (32 °F)", 32, 200], ["Cotton (60 °F)", 60, 200], ["Alfalfa weevil (48 °F)", 48, 200]];
export const gdd: CustomCalculator = (v) => {
  const [, base, cap] = GDD_BASE[pick(v.crop, GDD_BASE.length)];
  const hi = Math.min(cap, safeNumber(v.high, 85));
  const lo = Math.max(base, Math.min(cap, safeNumber(v.low, 60)));
  const daily = Math.max(0, (hi + lo) / 2 - base);
  const days = Math.max(1, Math.round(nonNeg(v.days, 1)));
  const acc = daily * days + nonNeg(v.accumulatedSoFar);
  const remain = Math.max(0, nonNeg(v.targetGdd) - acc);
  return { dailyGdd: round2(daily), accumulatedGdd: round2(acc), gddRemaining: round2(remain), daysToTarget: round2(daily > 0 ? remain / daily : 0), periodGdd: round2(daily * days) };
};

export const cannabisYield: CustomCalculator = (v) => {
  const grams = pick(v.mode, 2) === 0 ? nonNeg(v.canopySqFt) * nonNeg(v.gramsPerSqFt) : nonNeg(v.lightWatts) * nonNeg(v.gramsPerWatt);
  const cycles = nonNeg(v.harvestsPerYear, 5);
  const lb = grams / 453.592;
  return { gramsPerHarvest: round2(grams), poundsPerHarvest: round2(lb), annualPounds: round2(lb * cycles), annualRevenue: round2(lb * cycles * nonNeg(v.pricePerLb)), gramsPerPlant: round2(nonNeg(v.plants) ? grams / nonNeg(v.plants) : 0), gramsPerWatt: round2(nonNeg(v.lightWatts) ? grams / nonNeg(v.lightWatts) : 0) };
};

export const cornShrink: CustomCalculator = (v) => {
  const m1 = nonNeg(v.harvestMoisture);
  const m2 = nonNeg(v.marketMoisture, 15.5);
  const wetLb = pick(v.weightUnit, 2) === 0 ? nonNeg(v.wetWeight) : nonNeg(v.wetWeight) * 56;
  const water = m1 > m2 ? (m1 - m2) / (100 - m2) : 0;
  const total = water + nonNeg(v.handlingShrink, 0.5) / 100;
  const dryLb = wetLb * (1 - total);
  const dryBu = dryLb / 56;
  const points = Math.max(0, m1 - m2);
  const pencil = (wetLb / 56) * (1 - (points * nonNeg(v.pencilShrinkPerPoint, 1.4)) / 100);
  return { dryBushels: round2(dryBu), totalShrinkPercent: round2(total * 100), waterShrinkPercent: round2(water * 100), wetBushels: round2(wetLb / 56), elevatorPencilShrinkBushels: round2(pencil), dryingCharge: round2((wetLb / 56) * points * nonNeg(v.dryingPerPoint)), netValue: round2(dryBu * nonNeg(v.price) - (wetLb / 56) * points * nonNeg(v.dryingPerPoint)) };
};

export const agConversion: CustomCalculator = (v) => {
  const lb = CROP_LB[pick(v.crop, CROP_LB.length)][1];
  const x = nonNeg(v.value);
  const mode = pick(v.mode, 4);
  if (mode === 0) return { result: round2(x * lb * 0.0011208), buPerAcre: round2(x), tonnesPerHa: round2(x * lb * 0.0011208), kgPerHa: round2(x * lb * 1.12085), lbPerAcre: round2(x * lb) };
  if (mode === 1) { const bu = x / (lb * 0.0011208); return { result: round2(bu), buPerAcre: round2(bu), tonnesPerHa: round2(x), kgPerHa: round2(x * 1000), lbPerAcre: round2(bu * lb) }; }
  if (mode === 2) return { result: round2(x * 0.404686), buPerAcre: 0, tonnesPerHa: 0, kgPerHa: 0, lbPerAcre: 0 };
  return { result: round2(x * 1.12085), buPerAcre: 0, tonnesPerHa: 0, kgPerHa: round2(x * 1.12085), lbPerAcre: round2(x) };
};

/** ASABE D245.6 modified Henderson constants [label, K, N, C]. */
export const EMC_GRAINS: [string, number, number, number][] = [["Shelled corn", 8.6541e-5, 1.8634, 49.81], ["Soybeans", 30.5327e-5, 1.2164, 134.136], ["Hard red wheat", 2.3007e-5, 2.2857, 55.815], ["Rough rice", 1.9187e-5, 2.4451, 51.161], ["Sorghum", 0.8532e-4, 2.4757, 113.725]];
export const emc: CustomCalculator = (v) => {
  const [, K, N, C] = EMC_GRAINS[pick(v.grain, EMC_GRAINS.length)];
  const tC = (safeNumber(v.temperatureF, 60) - 32) * (5 / 9);
  const rh = Math.min(0.99, Math.max(0.01, nonNeg(v.humidity, 65) / 100));
  const db = Math.pow(Math.log(1 - rh) / (-K * (tC + C)), 1 / N);
  const wb = (db / (100 + db)) * 100;
  return { emcWetBasisPercent: round2(wb), emcDryBasisPercent: round2(db), dryingPossible: wb < nonNeg(v.grainMoisture) ? 1 : 0, temperatureC: round2(tC) };
};

export const GREENHOUSE: [string, number][] = [["Hoop house / high tunnel", 8], ["Gutter-connected poly", 28], ["Polycarbonate", 38], ["Glass", 55]];
export const greenhouse: CustomCalculator = (v) => {
  const area = nonNeg(v.sqFt);
  const f = 1 + safeNumber(v.regionAdjust) / 100;
  const structure = area * GREENHOUSE[pick(v.type, GREENHOUSE.length)][1] * f;
  const climate = area * nonNeg(v.climatePerSqFt);
  const benches = area * nonNeg(v.benchesIrrigationPerSqFt);
  const lights = yes(v.lighting) ? area * nonNeg(v.lightingPerSqFt) : 0;
  const total = structure + climate + benches + lights + nonNeg(v.sitePrep) + nonNeg(v.permits);
  return { totalCost: round2(total), costPerSqFt: round2(area ? total / area : 0), structureCost: round2(structure), climateControl: round2(climate), benchesIrrigation: round2(benches), lightingCost: round2(lights), lowEstimate: round2(total * 0.8), highEstimate: round2(total * 1.3) };
};

export const equipmentLease: CustomCalculator = (v) => {
  const cost = nonNeg(v.equipmentCost) - nonNeg(v.downPayment);
  const n = Math.max(1, Math.round(nonNeg(v.termMonths, 60)));
  const residual = nonNeg(v.equipmentCost) * (nonNeg(v.residualPercent) / 100);
  const mf = nonNeg(v.rate) / 2400;
  const dep = (cost - residual) / n;
  const fin = (cost + residual) * mf;
  const pay = Math.max(0, dep + fin);
  const r = nonNeg(v.rate) / 1200;
  const loan = r > 0 ? (cost * r) / (1 - Math.pow(1 + r, -n)) : cost / n;
  return { monthlyLeasePayment: round2(pay), annualLeasePayment: round2(pay * 12), totalLeasePayments: round2(pay * n), residualBuyout: round2(residual), totalCostIfBought: round2(pay * n + residual + nonNeg(v.downPayment)), monthlyLoanPaymentComparison: round2(loan), totalLoanCost: round2(loan * n + nonNeg(v.downPayment)) };
};

// --- Livestock ------------------------------------------------------------------------------------------------
export const pearsonRation: CustomCalculator = (v) => {
  const t = nonNeg(v.targetProtein);
  const a = nonNeg(v.feedAProtein);
  const b = nonNeg(v.feedBProtein);
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  const feasible = t > lo && t < hi;
  const partsA = feasible ? Math.abs(t - b) : 0;
  const partsB = feasible ? Math.abs(a - t) : 0;
  const shareA = partsA + partsB > 0 ? partsA / (partsA + partsB) : 0;
  const batch = nonNeg(v.batchLb);
  const lbA = batch * shareA;
  const lbB = batch - lbA;
  const costTon = (shareA * nonNeg(v.feedACostTon) + (1 - shareA) * nonNeg(v.feedBCostTon));
  const intake = nonNeg(v.bodyWeight) * (nonNeg(v.intakePercent, 2.5) / 100) * Math.max(1, nonNeg(v.head, 1));
  return { feedALb: round2(feasible ? lbA : 0), feedBLb: round2(feasible ? lbB : 0), feedASharePercent: round2(shareA * 100), mixCostPerTon: round2(feasible ? costTon : 0), dailyIntakeLb: round2(intake), dailyFeedCost: round2(feasible ? (intake / 2000) * costTon : 0), feasible: feasible ? 1 : 0 };
};

export const CATTLE_BREEDS: [string, number][] = [["Beef — average", 283], ["Angus", 281], ["Hereford", 285], ["Simmental", 285], ["Brahman / Bos indicus", 292], ["Holstein", 279], ["Jersey", 279], ["Brown Swiss", 290]];
export const cattleGestation: CustomCalculator = (v) => {
  const bred = safeNumber(v.breedingDate, today() - 60);
  const g = CATTLE_BREEDS[pick(v.breed, CATTLE_BREEDS.length)][1];
  const calve = bred + g;
  const t = today();
  return { calvingDate: calve, earliestCalving: calve - 10, latestCalving: calve + 10, pregnancyCheckDate: bred + 35, dryOffDate: calve - 60, daysPregnant: Math.max(0, t - bred), daysToCalving: calve - t, gestationDays: g };
};

export const goatGestation: CustomCalculator = (v) => {
  const bred = safeNumber(v.breedingDate, today() - 30);
  const g = pick(v.breed, 2) === 1 ? 145 : 150;
  const kid = bred + g;
  const t = today();
  return { kiddingDate: kid, earliestKidding: kid - 5, latestKidding: kid + 5, cdtBoosterDate: kid - 30, ultrasoundDate: bred + 45, daysPregnant: Math.max(0, t - bred), daysToKidding: kid - t, nextHeatIfOpen: bred + 21 };
};

export const lambGestation: CustomCalculator = (v) => {
  const ramIn = safeNumber(v.ramInDate, today() - 30);
  const ramOut = Math.max(ramIn, safeNumber(v.ramOutDate, ramIn + 34));
  const g = nonNeg(v.gestationDays, 147);
  return { firstLambing: ramIn + g - 5, peakLambingStart: ramIn + g, lastLambing: ramOut + g + 5, lambingSeasonDays: ramOut - ramIn + 10, heatCyclesCovered: round2((ramOut - ramIn) / 17), flushingStart: ramIn - 14, shearingOrCrutchingBy: ramIn + g - 30 };
};

export const cidr7: CustomCalculator = (v) => {
  const d0 = safeNumber(v.startDate, today());
  const heifer = pick(v.animal, 2) === 1;
  const taiDay = d0 + (heifer ? 9 : 10);
  return { day0GnrhCidrIn: d0, day7CidrOutPgf: d0 + 7, timedAiDate: taiDay, hoursAfterPgf: heifer ? 54 : 66, expectedCalvingDate: taiDay + 283, cleanupBullInDate: taiDay + 10, pregCheckDate: taiDay + 35 };
};

export const chickenFeed: CustomCalculator = (v) => {
  const type = pick(v.type, 4);
  const birds = nonNeg(v.birds);
  const days = nonNeg(v.days, 30);
  const perDay = [0.25, 0.27, 0.18, 0.2][type]; // layers, broilers (avg over 8 wk), pullets, bantam/other
  const lb = birds * days * perDay * (1 + nonNeg(v.waste, 10) / 100);
  const bags = ceil(lb / Math.max(1, nonNeg(v.bagSize, 50)));
  const eggs = type === 0 ? birds * days * (nonNeg(v.layRate, 75) / 100) : 0;
  const cost = bags * nonNeg(v.bagPrice);
  return { feedLb: round2(lb), bagsNeeded: bags, feedCost: round2(cost), feedPerBirdPerDayLb: perDay, eggsProduced: Math.round(eggs), feedCostPerDozen: round2(eggs > 0 ? (lb * (nonNeg(v.bagPrice) / Math.max(1, nonNeg(v.bagSize, 50)))) / (eggs / 12) : 0) };
};

export const HAY_ANIMALS: [string, number][] = [["Beef cow (1,200 lb)", 1200], ["Dairy cow (1,400 lb)", 1400], ["Horse (1,000 lb)", 1000], ["Sheep / goat (150 lb)", 150], ["Yearling (700 lb)", 700]];
export const hay: CustomCalculator = (v) => {
  const bw = HAY_ANIMALS[pick(v.animal, HAY_ANIMALS.length)][1];
  const intake = bw * (nonNeg(v.intakePercent, 2.5) / 100);
  const lbDay = intake * nonNeg(v.head) * (1 + nonNeg(v.waste, 15) / 100);
  const total = lbDay * nonNeg(v.days);
  const bales = ceil(total / Math.max(1, nonNeg(v.baleWeight, 1200)));
  return { balesNeeded: bales, totalTons: round2(total / 2000), lbPerDay: round2(lbDay), balesPerWeek: round2((lbDay * 7) / Math.max(1, nonNeg(v.baleWeight, 1200))), totalCost: round2((total / 2000) * nonNeg(v.pricePerTon)), costPerHeadPerDay: round2(nonNeg(v.head) ? ((lbDay / 2000) * nonNeg(v.pricePerTon)) / nonNeg(v.head) : 0) };
};

export const cattleBreakeven: CustomCalculator = (v) => {
  const purchase = (nonNeg(v.purchaseWeight) / 100) * nonNeg(v.purchasePrice);
  const gain = Math.max(0, nonNeg(v.saleWeight) - nonNeg(v.purchaseWeight));
  const feed = gain * nonNeg(v.costOfGain);
  const interest = (purchase + feed / 2) * (nonNeg(v.interestRate) / 100) * (nonNeg(v.days) / 365);
  const death = purchase * (nonNeg(v.deathLoss) / 100);
  const cost = purchase + feed + nonNeg(v.vetMed) + nonNeg(v.freightCommission) + nonNeg(v.otherCosts) + interest + death;
  const breakeven = nonNeg(v.saleWeight) > 0 ? cost / (nonNeg(v.saleWeight) / 100) : 0;
  const revenue = (nonNeg(v.saleWeight) / 100) * nonNeg(v.expectedSalePrice);
  return { breakevenPerCwt: round2(breakeven), profitPerHead: round2(revenue - cost), totalCostPerHead: round2(cost), revenuePerHead: round2(revenue), costOfGainTotal: round2(feed), interestCost: round2(interest), totalProfit: round2((revenue - cost) * nonNeg(v.head, 1)) };
};

export const AU: [string, number][] = [["Cow, 1,000 lb", 1], ["Cow with calf", 1.3], ["Bull", 1.35], ["Yearling steer / heifer", 0.7], ["Weaned calf", 0.5], ["Horse", 1.25], ["Sheep", 0.2], ["Goat", 0.15], ["Bison", 1.0], ["Elk", 0.6], ["Deer", 0.2]];
export const aum: CustomCalculator = (v) => {
  const au = AU[pick(v.animal, AU.length)][1] * nonNeg(v.head);
  const needed = au * nonNeg(v.months);
  const available = (nonNeg(v.acres) * nonNeg(v.forageLbPerAcre) * (nonNeg(v.utilization, 50) / 100)) / 780;
  return { aumsNeeded: round2(needed), aumsAvailable: round2(available), animalUnits: round2(au), acresPerAum: round2(available ? nonNeg(v.acres) / available : 0), supportedHeadForPeriod: round2(nonNeg(v.months) && AU[pick(v.animal, AU.length)][1] ? available / nonNeg(v.months) / AU[pick(v.animal, AU.length)][1] : 0), grazingCost: round2(needed * nonNeg(v.pricePerAum)), enoughForage: available >= needed ? 1 : 0 };
};

export const fcr: CustomCalculator = (v) => {
  const gain = pick(v.mode, 2) === 0 ? nonNeg(v.weightGain) : Math.max(0, nonNeg(v.endWeight) - nonNeg(v.startWeight));
  const feed = nonNeg(v.feedConsumed);
  const ratio = gain > 0 ? feed / gain : 0;
  return { feedConversionRatio: round2(ratio), feedEfficiency: round2(feed ? gain / feed : 0), weightGain: round2(gain), costOfGainPerUnit: round2(ratio * nonNeg(v.feedCostPerUnit)), totalFeedCost: round2(feed * nonNeg(v.feedCostPerUnit)), averageDailyGain: round2(nonNeg(v.days) ? gain / nonNeg(v.days) : 0) };
};

export const sheepProfit: CustomCalculator = (v) => {
  const ewes = nonNeg(v.ewes);
  const lambs = ewes * (nonNeg(v.lambingRate, 150) / 100) * (nonNeg(v.survival, 90) / 100);
  const retained = ewes * (nonNeg(v.replacementRate, 20) / 100);
  const sold = Math.max(0, lambs - retained);
  const lambRev = sold * (nonNeg(v.saleWeight) / 100) * nonNeg(v.pricePerCwt);
  const wool = ewes * nonNeg(v.woolLb) * nonNeg(v.woolPrice);
  const culls = ewes * (nonNeg(v.replacementRate, 20) / 100) * nonNeg(v.cullValue);
  const revenue = lambRev + wool + culls;
  const costs = ewes * nonNeg(v.costPerEwe);
  const profit = revenue - costs;
  return { totalProfit: round2(profit), profitPerEwe: round2(ewes ? profit / ewes : 0), lambsSold: Math.round(sold), totalRevenue: round2(revenue), lambRevenue: round2(lambRev), totalCosts: round2(costs), breakevenLambPricePerCwt: round2(sold * nonNeg(v.saleWeight) > 0 ? (costs - wool - culls) / ((sold * nonNeg(v.saleWeight)) / 100) : 0) };
};

export const prfInsurance: CustomCalculator = (v) => {
  const cov = Math.min(90, Math.max(70, nonNeg(v.coverageLevel, 90)));
  const subsidy = cov <= 75 ? 0.59 : cov <= 85 ? 0.55 : 0.51;
  const protection = nonNeg(v.acres) * nonNeg(v.countyBaseValue) * (cov / 100) * (nonNeg(v.productivityFactor, 100) / 100);
  const intervalShare = nonNeg(v.intervalShare, 50) / 100;
  const insured = protection * intervalShare;
  const total = insured * (nonNeg(v.premiumRate) / 100);
  const producer = total * (1 - subsidy);
  const index = nonNeg(v.finalIndex, 100);
  const indemnity = index < cov ? insured * ((cov - index) / cov) : 0;
  return { producerPremium: round2(producer), policyProtection: round2(protection), intervalProtection: round2(insured), totalPremium: round2(total), subsidyPercent: round2(subsidy * 100), estimatedIndemnity: round2(indemnity), netReturn: round2(indemnity - producer) };
};

export const WALNUT_GRADES: [string, number][] = [["Veneer", 5], ["Prime / #1 sawlog", 2.5], ["#2 sawlog", 1.2], ["Low grade / pallet", 0.5]];
export const blackWalnut: CustomCalculator = (v) => {
  const top = nonNeg(v.topDiameter) > 0 ? nonNeg(v.topDiameter) : nonNeg(v.dbh) * 0.85;
  const L = nonNeg(v.logLength, 16);
  const bf = Math.pow(Math.max(0, top - 4), 2) * (L / 16) * Math.max(1, nonNeg(v.logs, 1));
  const mill = bf * WALNUT_GRADES[pick(v.grade, WALNUT_GRADES.length)][1];
  const stump = mill * (nonNeg(v.stumpageShare, 60) / 100);
  return { estimatedStumpageValue: round2(stump), millValue: round2(mill), doyleBoardFeet: round2(bf), topDiameterUsed: round2(top), valuePerBoardFoot: round2(bf ? stump / bf : 0) };
};

export const AUGER_CAP: [string, number][] = [["6 in", 1000], ["8 in", 2400], ["10 in", 4500], ["13 in", 8500], ["16 in", 14000]];
export const auger: CustomCalculator = (v) => {
  const h = nonNeg(v.height) + nonNeg(v.clearance, 3);
  const ang = Math.min(45, Math.max(10, nonNeg(v.angle, 30)));
  const len = h / Math.sin((ang * Math.PI) / 180);
  const reach = len * Math.cos((ang * Math.PI) / 180);
  const base = AUGER_CAP[pick(v.diameter, AUGER_CAP.length)][1];
  const cap = base * (1 - Math.max(0, ang - 30) * 0.015) * (yes(v.wetGrain) ? 0.75 : 1);
  const hp = (cap * len) / 9000;
  return { requiredLengthFt: round2(len), horizontalReachFt: round2(reach), capacityBuPerHour: Math.round(cap), estimatedHp: round2(hp), hoursToFillBin: round2(cap > 0 ? nonNeg(v.binBushels) / cap : 0), recommendedStockLengthFt: [31, 41, 51, 61, 71, 81, 91, 101, 111, 121].find((s) => s >= len) ?? 0 };
};

export const bizAgCustomCalculators: Record<string, CustomCalculator> = {
  "corn-yield-calculator": cornYield,
  "soybean-yield-calculator": soybeanYield,
  "acres-per-hour-calculator": acresPerHour,
  "grain-bin-calculator": grainBin,
  "fertilizer-calculator": fertilizer,
  "sprayer-calibration-calculator": sprayer,
  "nitrogen-rate-calculator": nitrogenRate,
  "lime-calculator": lime,
  "seeding-rate-calculator": seedingRate,
  "growing-degree-days-calculator": gdd,
  "cannabis-yield-calculator": cannabisYield,
  "corn-shrink-calculator": cornShrink,
  "agriculture-conversion-calculator": agConversion,
  "grain-emc-calculator": emc,
  "commercial-greenhouse-cost-calculator": greenhouse,
  "farm-equipment-lease-calculator": equipmentLease,
  "livestock-feed-ration-calculator": pearsonRation,
  "cattle-gestation-calculator": cattleGestation,
  "goat-gestation-calculator": goatGestation,
  "lamb-gestation-calculator": lambGestation,
  "7-day-cidr-protocol-calculator": cidr7,
  "chicken-feed-calculator": chickenFeed,
  "hay-calculator": hay,
  "cattle-breakeven-calculator": cattleBreakeven,
  "aum-calculator": aum,
  "fcr-calculator": fcr,
  "sheep-profit-calculator": sheepProfit,
  "prf-insurance-calculator": prfInsurance,
  "black-walnut-tree-value-calculator": blackWalnut,
  "auger-calculator": auger,
};
