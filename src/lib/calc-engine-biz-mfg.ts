/**
 * Batch: "Business & Industrial Calculators" → Manufacturing, Metals & Engineering Calculators
 * (metals, fabrication, machining, quality, reliability and production costing).
 *
 * Data / methods:
 *  - Metal densities (lb/in³): carbon steel 0.2836, 304 stainless 0.289, 6061 aluminum 0.0975,
 *    brass 0.307, copper 0.323, titanium 0.16, gray iron 0.26, lead 0.41.
 *  - Sheet gauges: Manufacturers' Standard (steel), galvanized, stainless and Brown & Sharpe
 *    (aluminum) thickness tables.
 *  - Plates: Roark's Formulas, rectangular plate simply supported on all edges under uniform
 *    load, σ = βqb²/t², δ = αqb⁴/(Et³), ν = 0.3.
 *  - Press brake air bending: tons/ft = 575 T² ÷ V (60 ksi mild steel), inside radius ≈ V ÷ 6.4,
 *    bend allowance with K-factor; punching force = perimeter × thickness × shear strength.
 *  - Milling: RPM = SFM × 12 ÷ (π D); IPM = RPM × flutes × chip load; HP = MRR × unit power.
 *  - ANSI/ASQ Z1.4-2003 (R2018) Table I sample size code letters and Table II-A normal single
 *    sampling acceptance numbers.
 *  - Sigma level from DPMO with the 1.5σ shift (Acklam inverse-normal approximation).
 *  - Die per wafer: π d²/(4S) − π d/√(2S); Poisson yield e^(−D·A).
 *  - Accelerated aging: ASTM F1980 Q10 rule and Arrhenius.
 *  - Springs: k = G d⁴ ÷ (8 D³ Nₐ), Wahl factor; RCF = 1.118×10⁻⁵ r(cm) RPM².
 *  - Mexico 2026 minimum wage: MXN 315.04/day general, MXN 440.87/day northern border zone.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-biz-mfg-calculators.ts for the copy.
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
const r4 = (n: number) => Math.round(n * 10000) / 10000;

// --- Precious & base metals -------------------------------------------------------------------------------
/** Weight units to troy ounces. */
export const WEIGHT_TO_OZT = [1 / 31.1035, 1, 1 / 20, 0.911458, 32.1507];
export const SILVER_PURITY: [string, number][] = [["Fine silver .999", 0.999], ["Sterling .925", 0.925], ["Coin silver .900 (US pre-1965)", 0.9], ["European .835", 0.835], ["Silver .800", 0.8], ["Canadian / UK .500", 0.5], ["War nickels .350", 0.35]];
export const silverValue: CustomCalculator = (v) => {
  const ozt = nonNeg(v.weight) * WEIGHT_TO_OZT[pick(v.unit, WEIGHT_TO_OZT.length)];
  const purity = pick(v.purity, SILVER_PURITY.length + 1) === SILVER_PURITY.length ? nonNeg(v.customPurity) / 100 : SILVER_PURITY[pick(v.purity, SILVER_PURITY.length)][1];
  const pure = ozt * purity;
  const melt = pure * nonNeg(v.spotPrice);
  return { meltValue: round2(melt), expectedPayout: round2(melt * (nonNeg(v.payoutPercent, 80) / 100)), pureSilverOzt: r4(pure), pureSilverGrams: round2(pure * 31.1035), valuePerGram: round2(ozt > 0 ? melt / (ozt * 31.1035) : 0), totalTroyOunces: r4(ozt) };
};

export const alloyMix: CustomCalculator = (v) => {
  const w = nonNeg(v.weight);
  const k = Math.min(24, nonNeg(v.currentKarat));
  const t = Math.min(24, Math.max(0.1, nonNeg(v.targetKarat)));
  const fine = (w * k) / 24;
  let alloyToAdd = 0;
  let goldToAdd = 0;
  if (t < k) alloyToAdd = (fine * 24) / t - w;
  else if (t > k && t < 24) goldToAdd = (w * (t - k)) / (24 - t);
  const final = w + alloyToAdd + goldToAdd;
  return { alloyToAddGrams: round2(alloyToAdd), fineGoldToAddGrams: round2(goldToAdd), finalWeightGrams: round2(final), pureGoldGrams: round2(fine + goldToAdd), finalPurityPercent: round2(final ? ((fine + goldToAdd) / final) * 100 : 0), fineness: Math.round(final ? ((fine + goldToAdd) / final) * 1000 : 0) };
};

export const DENSITY: [string, number][] = [["Carbon steel", 0.2836], ["Stainless steel 304", 0.289], ["Aluminum 6061", 0.0975], ["Brass", 0.307], ["Copper", 0.323], ["Titanium", 0.16], ["Gray cast iron", 0.26], ["Lead", 0.41]];
export const SHAPES = ["Plate / sheet", "Round bar", "Square bar", "Hex bar (across flats)", "Flat bar", "Round tube / pipe", "Square tube", "Equal-leg angle"];
export const metalWeight: CustomCalculator = (v) => {
  const s = pick(v.shape, SHAPES.length);
  const t = nonNeg(v.thickness);
  const w = nonNeg(v.width);
  const d = nonNeg(v.diameter);
  let area: number; // in²
  if (s === 0 || s === 4) area = t * w;
  else if (s === 1) area = (Math.PI / 4) * d * d;
  else if (s === 2) area = d * d;
  else if (s === 3) area = 0.866 * d * d;
  else if (s === 5) area = (Math.PI / 4) * (d * d - Math.pow(Math.max(0, d - 2 * t), 2));
  else if (s === 6) area = d * d - Math.pow(Math.max(0, d - 2 * t), 2);
  else area = t * (2 * d - t);
  const lengthIn = nonNeg(v.length) * 12;
  const dens = DENSITY[pick(v.material, DENSITY.length)][1];
  const each = area * lengthIn * dens;
  const qty = Math.max(1, nonNeg(v.quantity, 1));
  return { totalWeightLb: round2(each * qty), weightEachLb: round2(each), weightPerFootLb: round2(area * 12 * dens), totalWeightKg: round2(each * qty * 0.45359237), crossSectionSqIn: r4(area), totalCost: round2(each * qty * nonNeg(v.pricePerLb)) };
};

export const coilLength: CustomCalculator = (v) => {
  const t = Math.max(0.0001, nonNeg(v.thickness));
  const dens = DENSITY[pick(v.material, DENSITY.length)][1];
  const width = nonNeg(v.width);
  let lengthIn: number;
  if (pick(v.mode, 2) === 0) lengthIn = (Math.PI * (Math.pow(nonNeg(v.outerDiameter), 2) - Math.pow(nonNeg(v.innerDiameter), 2))) / (4 * t);
  else lengthIn = width > 0 ? nonNeg(v.coilWeight) / (width * t * dens) : 0;
  const weight = lengthIn * width * t * dens;
  return { coilLengthFt: round2(lengthIn / 12), coilLengthM: round2((lengthIn / 12) * 0.3048), coilWeightLb: round2(weight), squareFeet: round2((lengthIn * width) / 144), piwLbPerInchWidth: round2(width ? weight / width : 0), wraps: round2((nonNeg(v.outerDiameter) - nonNeg(v.innerDiameter)) / (2 * t)) };
};

/** Gauge tables (inches) for gauges 7–30. 0 = not standard. */
export const GAUGES: Record<string, number[]> = {
  steel: [0.1793, 0.1644, 0.1495, 0.1345, 0.1196, 0.1046, 0.0897, 0.0747, 0.0673, 0.0598, 0.0538, 0.0478, 0.0418, 0.0359, 0.0329, 0.0299, 0.0269, 0.0239, 0.0209, 0.0179, 0.0164, 0.0149, 0.0135, 0.012],
  galvanized: [0, 0.1681, 0.1532, 0.1382, 0.1233, 0.1084, 0.0934, 0.0785, 0.071, 0.0635, 0.0575, 0.0516, 0.0456, 0.0396, 0.0366, 0.0336, 0.0306, 0.0276, 0.0247, 0.0217, 0.0202, 0.0187, 0.0172, 0.0157],
  stainless: [0.1875, 0.1719, 0.1563, 0.1406, 0.125, 0.1094, 0.094, 0.0781, 0.0703, 0.0625, 0.0563, 0.05, 0.0438, 0.0375, 0.0344, 0.0312, 0.0281, 0.025, 0.0219, 0.0188, 0.0172, 0.0156, 0.0141, 0.0125],
  aluminum: [0.1443, 0.1285, 0.1144, 0.1019, 0.0907, 0.0808, 0.072, 0.0641, 0.0571, 0.0508, 0.0453, 0.0403, 0.0359, 0.032, 0.0285, 0.0253, 0.0226, 0.0201, 0.0179, 0.0159, 0.0142, 0.0126, 0.0113, 0.01],
};
const GAUGE_KEYS = ["steel", "galvanized", "stainless", "aluminum"];
const GAUGE_DENS = [0.2836, 0.2836, 0.289, 0.0975];
export const sheetGauge: CustomCalculator = (v) => {
  const m = pick(v.material, 4);
  const table = GAUGES[GAUGE_KEYS[m]];
  let gauge = Math.min(30, Math.max(7, Math.round(nonNeg(v.gauge, 16))));
  let t = table[gauge - 7];
  if (pick(v.mode, 2) === 1) {
    const target = nonNeg(v.millimeters) / 25.4;
    let best = 7;
    table.forEach((x, i) => { if (x > 0 && Math.abs(x - target) < Math.abs(table[best - 7] - target)) best = i + 7; });
    gauge = best;
    t = table[best - 7];
  }
  return { gauge, thicknessIn: r4(t), thicknessMm: round2(t * 25.4), weightPerSqFtLb: round2(t * 144 * GAUGE_DENS[m]), notStandard: t === 0 ? 1 : 0 };
};

/** Roark simply supported rectangular plate coefficients by a/b. */
const ROARK: [number, number, number][] = [[1, 0.2874, 0.0444], [1.2, 0.3762, 0.0616], [1.4, 0.453, 0.077], [1.6, 0.5172, 0.0906], [1.8, 0.5688, 0.1017], [2, 0.6102, 0.111], [3, 0.7134, 0.1335], [4, 0.741, 0.14], [5, 0.7476, 0.1417], [1000, 0.75, 0.1421]];
function roark(ratio: number) {
  const r = Math.max(1, ratio);
  for (let i = 1; i < ROARK.length; i++) {
    if (r <= ROARK[i][0]) {
      const [a0, b0, c0] = ROARK[i - 1];
      const [a1, b1, c1] = ROARK[i];
      const f = (r - a0) / (a1 - a0);
      return [b0 + f * (b1 - b0), c0 + f * (c1 - c0)];
    }
  }
  return [0.75, 0.1421];
}
export const PLATE_GRADES: [string, number][] = [["A36 (36 ksi)", 36000], ["A572 Gr 50 (50 ksi)", 50000], ["A514 / T-1 (100 ksi)", 100000], ["AR400 (~145 ksi)", 145000], ["6061-T6 aluminum (35 ksi)", 35000]];
export const plateLoad: CustomCalculator = (v) => {
  const a = Math.max(nonNeg(v.length), nonNeg(v.width));
  const b = Math.min(nonNeg(v.length), nonNeg(v.width));
  const t = Math.max(0.01, nonNeg(v.thickness));
  const [beta, alpha] = roark(b > 0 ? a / b : 1);
  const Fy = PLATE_GRADES[pick(v.grade, PLATE_GRADES.length)][1];
  const E = pick(v.grade, PLATE_GRADES.length) === 4 ? 10e6 : 29e6;
  const allow = Fy / Math.max(1, nonNeg(v.safetyFactor, 1.67));
  const q = pick(v.loadMode, 2) === 0 ? nonNeg(v.pressure) : a * b > 0 ? nonNeg(v.totalLoad) / (a * b) : 0;
  const stress = (beta * q * b * b) / (t * t);
  const defl = (alpha * q * Math.pow(b, 4)) / (E * Math.pow(t, 3));
  const qAllow = b > 0 ? (allow * t * t) / (beta * b * b) : 0;
  return { maxStressPsi: round2(stress), allowableStressPsi: round2(allow), utilizationPercent: round2((stress / allow) * 100), allowableUniformPsi: round2(qAllow), allowableTotalLoadLb: round2(qAllow * a * b), maxDeflectionIn: r4(defl), passes: stress <= allow ? 1 : 0 };
};

export const W_SHAPES: [string, number][] = [["W6×12", 12], ["W8×18", 18], ["W8×31", 31], ["W10×22", 22], ["W10×45", 45], ["W12×26", 26], ["W12×50", 50], ["W14×30", 30], ["W16×40", 40], ["W18×50", 50], ["W21×62", 62], ["W24×84", 84], ["Custom (enter lb/ft)", 0]];
export const iBeamCost: CustomCalculator = (v) => {
  const idx = pick(v.shape, W_SHAPES.length);
  const lbFt = idx === W_SHAPES.length - 1 ? nonNeg(v.customWeight) : W_SHAPES[idx][1];
  const qty = Math.max(1, Math.round(nonNeg(v.quantity, 1)));
  const lb = lbFt * nonNeg(v.length) * qty;
  const steel = lb * nonNeg(v.pricePerLb);
  const fab = qty * nonNeg(v.fabricationEach);
  const install = qty * nonNeg(v.installEach);
  const total = steel + fab + install + nonNeg(v.delivery);
  return { totalCost: round2(total), steelCost: round2(steel), totalWeightLb: round2(lb), fabricationCost: round2(fab), installationCost: round2(install), costPerFoot: round2(nonNeg(v.length) * qty ? total / (nonNeg(v.length) * qty) : 0), costPerBeam: round2(total / qty) };
};

// --- Printing / packaging ---------------------------------------------------------------------------------
export const flexoDistortion: CustomCalculator = (v) => {
  const repeat = pick(v.repeatMode, 2) === 0 ? nonNeg(v.repeat) : nonNeg(v.teeth) * nonNeg(v.pitch, 0.125);
  const K = 2 * Math.PI * nonNeg(v.plateThickness);
  const df = repeat > 0 ? ((repeat - K) / repeat) * 100 : 0;
  return { distortionFactorPercent: r4(df), kFactor: r4(K), artworkLengthIn: r4((nonNeg(v.imageLength) * df) / 100), reductionIn: r4(nonNeg(v.imageLength) * (1 - df / 100)), repeatLengthIn: r4(repeat) };
};

export const ingramCover: CustomCalculator = (v) => {
  const ppi = [0.002252, 0.0025, 0.002347, 0.002347][pick(v.paper, 4)];
  const spine = nonNeg(v.pages) * ppi;
  const bleed = 0.125;
  const hard = pick(v.binding, 2) === 1;
  const wrap = hard ? 0.75 : 0;
  const hinge = hard ? 0.4 : 0;
  const width = 2 * nonNeg(v.trimWidth) + spine + (hard ? 2 * (wrap + hinge) : 2 * bleed);
  const height = nonNeg(v.trimHeight) + (hard ? 2 * wrap : 2 * bleed);
  const dpi = nonNeg(v.dpi, 300);
  return { spineWidthIn: r4(hard ? spine + 0.25 : spine), fullCoverWidthIn: r4(hard ? width + 0.25 : width), fullCoverHeightIn: r4(height), widthPixels: Math.round((hard ? width + 0.25 : width) * dpi), heightPixels: Math.round(height * dpi), spineTextAllowed: spine >= 0.25 ? 1 : 0 };
};

export const ingramPrice: CustomCalculator = (v) => {
  const pages = nonNeg(v.pages);
  const print = nonNeg(v.fixedPrintCost) + pages * nonNeg(v.perPageCost);
  const list = nonNeg(v.listPrice);
  const wholesale = list * (1 - nonNeg(v.discount, 55) / 100);
  const comp = wholesale - print;
  const kdp = list * 0.6 - print;
  return { compensationPerBook: round2(comp), printCost: round2(print), wholesalePrice: round2(wholesale), retailerMargin: round2(list - wholesale), kdpRoyaltyComparison: round2(kdp), minimumListPriceToBreakEven: round2(print / Math.max(0.01, 1 - nonNeg(v.discount, 55) / 100)), annualEarnings: round2(comp * nonNeg(v.unitsPerYear)) };
};

export const labelSize: CustomCalculator = (v) => {
  if (pick(v.mode, 2) === 0) {
    const circ = Math.PI * nonNeg(v.containerDiameter);
    const full = circ + nonNeg(v.overlap, 0.25);
    const panel = circ * (nonNeg(v.coveragePercent, 100) / 100);
    const h = Math.max(0, nonNeg(v.panelHeight) - 2 * nonNeg(v.clearance, 0.125));
    return { labelWidthIn: r4(pick(v.wrap, 2) === 0 ? full : panel), labelHeightIn: r4(h), circumferenceIn: r4(circ), labelsPerSheet: 0, sheetUsePercent: 0, sheetsNeeded: 0 };
  }
  const sw = nonNeg(v.sheetWidth, 8.5) - 2 * nonNeg(v.margin, 0.5);
  const sh = nonNeg(v.sheetHeight, 11) - 2 * nonNeg(v.margin, 0.5);
  const lw = nonNeg(v.labelWidth);
  const lh = nonNeg(v.labelHeight);
  const g = nonNeg(v.gap, 0.125);
  const cols = lw > 0 ? Math.floor((sw + g) / (lw + g)) : 0;
  const rows = lh > 0 ? Math.floor((sh + g) / (lh + g)) : 0;
  const per = cols * rows;
  return { labelWidthIn: r4(lw), labelHeightIn: r4(lh), circumferenceIn: 0, labelsPerSheet: per, sheetUsePercent: round2(((per * lw * lh) / (nonNeg(v.sheetWidth, 8.5) * nonNeg(v.sheetHeight, 11))) * 100), sheetsNeeded: per > 0 ? ceil(nonNeg(v.labelsNeeded) / per) : 0 };
};

export const industrialPaint: CustomCalculator = (v) => {
  const vs = Math.max(0.01, nonNeg(v.volumeSolids, 60) / 100);
  const te = Math.max(0.01, nonNeg(v.transferEfficiency, 65) / 100);
  const dft = nonNeg(v.dftMils);
  const coats = Math.max(1, Math.round(nonNeg(v.coats, 1)));
  const theo = (1604 * vs) / Math.max(0.01, dft);
  const practical = theo * te;
  const gal = practical > 0 ? (nonNeg(v.area) * coats) / practical : 0;
  const thinned = gal * (1 + nonNeg(v.thinnerPercent) / 100);
  return { gallonsNeeded: round2(gal), gallonsWithThinner: round2(thinned), wetFilmThicknessMils: round2((dft / vs) * (1 + nonNeg(v.thinnerPercent) / 100)), theoreticalCoverageSqFtPerGal: round2(theo), practicalCoverageSqFtPerGal: round2(practical), totalCost: round2(gal * nonNeg(v.pricePerGal)) };
};

// --- Machining & fabrication ----------------------------------------------------------------------------------
/** [label, SFM HSS, SFM carbide, unit power hp per in³/min] */
export const MILL_MATERIALS: [string, number, number, number][] = [["Aluminum", 300, 1000, 0.3], ["Brass / bronze", 200, 600, 0.6], ["Mild steel (1018)", 100, 400, 1.0], ["Alloy steel (4140)", 70, 300, 1.3], ["Stainless 304", 60, 250, 1.4], ["Cast iron", 80, 300, 0.8], ["Titanium", 40, 150, 1.4], ["Plastics / acetal", 500, 1000, 0.1]];
export const milling: CustomCalculator = (v) => {
  const [, hss, carb, kp] = MILL_MATERIALS[pick(v.material, MILL_MATERIALS.length)];
  const sfm = nonNeg(v.sfmOverride) > 0 ? nonNeg(v.sfmOverride) : pick(v.tool, 2) === 0 ? carb : hss;
  const D = Math.max(0.001, nonNeg(v.diameter));
  let rpm = (sfm * 12) / (Math.PI * D);
  const capped = nonNeg(v.maxRpm) > 0 && rpm > nonNeg(v.maxRpm);
  if (capped) rpm = nonNeg(v.maxRpm);
  const ipm = rpm * Math.max(1, Math.round(nonNeg(v.flutes, 2))) * nonNeg(v.chipLoad);
  const mrr = nonNeg(v.radialDepth) * nonNeg(v.axialDepth) * ipm;
  return { spindleRpm: Math.round(rpm), feedRateIpm: round2(ipm), surfaceSpeedSfm: round2((rpm * Math.PI * D) / 12), materialRemovalRate: round2(mrr), spindleHp: round2(mrr * kp), rpmLimited: capped ? 1 : 0, feedMmPerMin: round2(ipm * 25.4) };
};

export const WELD_PROCESS: [string, number, number][] = [["SMAW (stick)", 0.65, 3], ["GMAW (MIG, solid wire)", 0.95, 6], ["FCAW (flux core)", 0.85, 8], ["GTAW (TIG)", 0.98, 1.5], ["SAW (submerged arc)", 0.99, 15]];
export const welding: CustomCalculator = (v) => {
  const leg = nonNeg(v.legSize);
  const area = pick(v.joint, 2) === 0 ? (leg * leg) / 2 : nonNeg(v.grooveArea);
  const lbPerFt = area * 12 * 0.2836 * (1 + nonNeg(v.reinforcement, 10) / 100);
  const deposited = lbPerFt * nonNeg(v.length);
  const [, eff, rate] = WELD_PROCESS[pick(v.process, WELD_PROCESS.length)];
  const filler = deposited / eff;
  const rods = pick(v.process, WELD_PROCESS.length) === 0 ? ceil(filler * nonNeg(v.rodsPerLb, 18)) : 0;
  const arcHours = deposited / rate;
  return { fillerMetalLb: round2(filler), depositedMetalLb: round2(deposited), weldMetalLbPerFt: r4(lbPerFt), electrodesNeeded: rods, arcTimeHours: round2(arcHours), laborHours: round2(arcHours / Math.max(0.05, nonNeg(v.operatorFactor, 30) / 100)), totalCost: round2(filler * nonNeg(v.fillerPricePerLb) + (arcHours / Math.max(0.05, nonNeg(v.operatorFactor, 30) / 100)) * nonNeg(v.laborRate)) };
};

export const injectionMolding: CustomCalculator = (v) => {
  const qty = Math.max(1, nonNeg(v.quantity, 1));
  const cav = Math.max(1, Math.round(nonNeg(v.cavities, 1)));
  const scrap = 1 + nonNeg(v.scrap) / 100;
  const material = (nonNeg(v.partWeightG) / 1000) * nonNeg(v.resinPerKg) * scrap;
  const machine = (nonNeg(v.cycleSeconds) / cav / 3600) * nonNeg(v.machineRate) * scrap;
  const mold = nonNeg(v.moldCost) / qty;
  const per = material + machine + mold + nonNeg(v.secondaryPerPart) + nonNeg(v.packagingPerPart);
  const tonnage = nonNeg(v.projectedArea) * cav * nonNeg(v.tonsPerSqIn, 3);
  return { costPerPart: round2(per), totalCost: round2(per * qty), materialPerPart: r4(material), machinePerPart: r4(machine), moldAmortizationPerPart: r4(mold), clampTonnage: round2(tonnage), partsPerHour: round2(nonNeg(v.cycleSeconds) > 0 ? (3600 / nonNeg(v.cycleSeconds)) * cav : 0), productionHours: round2(nonNeg(v.cycleSeconds) > 0 ? (qty * scrap) / ((3600 / nonNeg(v.cycleSeconds)) * cav) : 0) };
};

export const sublimation: CustomCalculator = (v) => {
  const ink = nonNeg(v.printArea) * nonNeg(v.inkPerSqIn);
  const labor = (nonNeg(v.minutesPerItem) / 60) * nonNeg(v.laborRate);
  const cost = nonNeg(v.blankCost) + nonNeg(v.paperCost) + ink + labor + nonNeg(v.overheadPerItem);
  const price = cost * (1 + nonNeg(v.markup) / 100);
  const qty = Math.max(1, nonNeg(v.quantity, 1));
  return { pricePerItem: round2(price), costPerItem: round2(cost), profitPerItem: round2(price - cost), marginPercent: round2(price ? ((price - cost) / price) * 100 : 0), inkCost: r4(ink), orderTotal: round2(price * qty + nonNeg(v.setupFee)), productionHours: round2((qty * nonNeg(v.minutesPerItem)) / 60) };
};

/** Cutting methods: speed (ipm) ≈ k ÷ t^n for mild steel; material multipliers [steel, stainless, aluminum]; default pierce seconds. */
export const CUT_METHODS: [string, number, number, number[], number][] = [["Fiber laser (4–6 kW)", 20, 1.0, [1, 0.8, 1.2], 1], ["Abrasive waterjet", 2, 1.15, [1, 0.85, 2.5], 15], ["Plasma (HD)", 25, 0.8, [1, 0.85, 1.3], 1]];
export const cuttingCost: CustomCalculator = (v) => {
  const [, k, n, mult, pierceDef] = CUT_METHODS[pick(v.method, CUT_METHODS.length)];
  const t = Math.max(0.02, nonNeg(v.thickness));
  const speed = nonNeg(v.speedOverride) > 0 ? nonNeg(v.speedOverride) : (k / Math.pow(t, n)) * mult[pick(v.material, 3)];
  const qty = Math.max(1, nonNeg(v.quantity, 1));
  const cutMin = nonNeg(v.cutLength) / Math.max(0.01, speed);
  const pierceMin = (nonNeg(v.pierces) * (nonNeg(v.pierceSeconds) > 0 ? nonNeg(v.pierceSeconds) : pierceDef)) / 60;
  const minutes = cutMin + pierceMin;
  const machine = (minutes / 60) * nonNeg(v.machineRate);
  const per = machine + nonNeg(v.materialPerPart) + nonNeg(v.setup) / qty;
  return { costPerPart: round2(per), totalCost: round2(per * qty), cutSpeedIpm: round2(speed), machineMinutesPerPart: round2(minutes), machineCostPerPart: round2(machine), totalMachineHours: round2((minutes * qty) / 60) };
};

export const urethaneCasting: CustomCalculator = (v) => {
  const qty = Math.max(1, nonNeg(v.quantity, 1));
  const molds = ceil(qty / Math.max(1, nonNeg(v.partsPerMold, 20)));
  const tooling = nonNeg(v.masterCost) + molds * nonNeg(v.moldCost);
  const resinLb = (nonNeg(v.partVolume) * 16.387 * nonNeg(v.density, 1.1) * (1 + nonNeg(v.waste, 15) / 100)) / 453.592;
  const material = resinLb * nonNeg(v.resinPerLb);
  const labor = (nonNeg(v.minutesPerPart) / 60) * nonNeg(v.laborRate);
  const per = material + labor + nonNeg(v.finishingPerPart) + tooling / qty;
  return { costPerPart: round2(per), totalCost: round2(per * qty), toolingCost: round2(tooling), moldsNeeded: molds, resinPerPartLb: r4(resinLb), materialPerPart: round2(material), laborPerPart: round2(labor) };
};

// --- Production & quality ---------------------------------------------------------------------------------
export const oee: CustomCalculator = (v) => {
  const planned = Math.max(0, nonNeg(v.shiftMinutes) - nonNeg(v.plannedDowntime));
  const run = Math.max(0, planned - nonNeg(v.unplannedDowntime));
  const total = nonNeg(v.totalCount);
  const good = Math.min(total, nonNeg(v.goodCount));
  const A = planned > 0 ? run / planned : 0;
  const P = run > 0 ? Math.min(1, (nonNeg(v.idealCycleSeconds) * total) / (run * 60)) : 0;
  const Q = total > 0 ? good / total : 0;
  const ideal = nonNeg(v.idealCycleSeconds) > 0 ? (planned * 60) / nonNeg(v.idealCycleSeconds) : 0;
  return { oeePercent: round2(A * P * Q * 100), availabilityPercent: round2(A * 100), performancePercent: round2(P * 100), qualityPercent: round2(Q * 100), idealOutput: Math.round(ideal), lostUnits: Math.round(Math.max(0, ideal - good)), runTimeMinutes: round2(run) };
};

export const mfgCost: CustomCalculator = (v) => {
  const dl = nonNeg(v.laborHours) * nonNeg(v.laborRate);
  const moh = pick(v.overheadBasis, 2) === 0 ? dl * (nonNeg(v.overheadRate) / 100) : nonNeg(v.overheadAmount);
  const total = nonNeg(v.directMaterials) + dl + moh;
  const cogm = total + nonNeg(v.beginningWip) - nonNeg(v.endingWip);
  const units = nonNeg(v.units);
  return { costPerUnit: round2(units ? cogm / units : 0), costOfGoodsManufactured: round2(cogm), totalManufacturingCost: round2(total), directLabor: round2(dl), manufacturingOverhead: round2(moh), primeCost: round2(nonNeg(v.directMaterials) + dl), conversionCost: round2(dl + moh), suggestedPrice: round2(units ? (cogm / units) * (1 + nonNeg(v.markup) / 100) : 0) };
};

export const taktTime: CustomCalculator = (v) => {
  const avail = (nonNeg(v.shiftMinutes) - nonNeg(v.breakMinutes)) * Math.max(1, Math.round(nonNeg(v.shifts, 1))) * 60;
  const demand = nonNeg(v.dailyDemand);
  const takt = demand > 0 ? avail / demand : 0;
  const ops = takt > 0 ? nonNeg(v.workContentSeconds) / takt : 0;
  return { taktTimeSeconds: round2(takt), taktTimeMinutes: round2(takt / 60), availableSecondsPerDay: round2(avail), operatorsNeeded: ceil(ops), theoreticalOperators: round2(ops), cycleTimeMeetsTakt: nonNeg(v.cycleTimeSeconds) <= takt ? 1 : 0, maxOutputAtCycleTime: Math.floor(nonNeg(v.cycleTimeSeconds) > 0 ? avail / nonNeg(v.cycleTimeSeconds) : 0) };
};

const Z14_LOTS = [8, 15, 25, 50, 90, 150, 280, 500, 1200, 3200, 10000, 35000, 150000, 500000, Infinity];
/** Code letter index (A = 0) for levels I, II, III by lot-size row. */
const Z14_CODES = [[0, 0, 1], [0, 1, 2], [1, 2, 3], [2, 3, 4], [2, 4, 5], [3, 5, 6], [4, 6, 7], [5, 7, 8], [6, 8, 9], [7, 9, 10], [8, 10, 11], [9, 11, 12], [10, 12, 13], [11, 13, 14], [12, 14, 15]];
export const Z14_N = [2, 3, 5, 8, 13, 20, 32, 50, 80, 125, 200, 315, 500, 800, 1250, 2000];
export const Z14_LETTERS = "ABCDEFGHJKLMNPQR";
export const Z14_AQLS = [0.25, 0.4, 0.65, 1.0, 1.5, 2.5, 4.0, 6.5];
const AC_SEQ = [0, -1, -2, 1, 2, 3, 5, 7, 10, 14, 21]; // −1 = arrow up, −2 = arrow down
export function z14Plan(lot: number, level: number, aqlIdx: number) {
  const row = Z14_LOTS.findIndex((m) => lot <= m);
  let code = Z14_CODES[Math.max(0, row)][level];
  const r0 = 7 - aqlIdx; // row of the 0/1 plan for this AQL column
  let rel = code - r0;
  if (rel < 0) { code = r0; rel = 0; }
  if (rel === 1) { code = r0; rel = 0; }
  if (rel === 2) { code += 1; rel = 3; }
  if (rel > 10) { code = r0 + 10; rel = 10; }
  code = Math.min(15, code);
  const ac = AC_SEQ[rel];
  return { code, n: Z14_N[code], ac, re: ac + 1 };
}
export const z14: CustomCalculator = (v) => {
  const lot = Math.max(2, Math.round(nonNeg(v.lotSize, 2)));
  const plan = z14Plan(lot, pick(v.level, 3), pick(v.aql, Z14_AQLS.length));
  const n = Math.min(lot, plan.n);
  return { sampleSize: n, acceptNumber: plan.ac, rejectNumber: plan.re, codeLetterIndex: plan.code + 1, sampleShareOfLotPercent: round2((n / lot) * 100), accept: nonNeg(v.defectsFound) <= plan.ac ? 1 : 0 };
};

export const availability: CustomCalculator = (v) => {
  let A: number;
  if (pick(v.mode, 2) === 0) { const mtbf = nonNeg(v.mtbf); const mttr = nonNeg(v.mttr); A = mtbf + mttr > 0 ? mtbf / (mtbf + mttr) : 0; }
  else { const up = nonNeg(v.uptimeHours); const down = nonNeg(v.downtimeHours); A = up + down > 0 ? up / (up + down) : 0; }
  const nines = A > 0 && A < 1 ? -Math.log10(1 - A) : A >= 1 ? 9 : 0;
  return { availabilityPercent: r4(A * 100), downtimeHoursPerYear: round2((1 - A) * 8760), downtimeMinutesPerMonth: round2((1 - A) * 43800), numberOfNines: round2(nines), unavailabilityPercent: r4((1 - A) * 100) };
};

/** Belt pitches in mm. */
export const BELT_PITCH: [string, number][] = [["GT2 (2 mm)", 2], ["GT3 / HTD 3M (3 mm)", 3], ["HTD 5M (5 mm)", 5], ["HTD 8M (8 mm)", 8], ["HTD 14M (14 mm)", 14], ["XL (0.200 in)", 5.08], ["L (0.375 in)", 9.525], ["H (0.500 in)", 12.7]];
export const timingBelt: CustomCalculator = (v) => {
  const p = BELT_PITCH[pick(v.pitch, BELT_PITCH.length)][1];
  const n1 = Math.max(1, Math.round(nonNeg(v.teeth1, 20)));
  const n2 = Math.max(1, Math.round(nonNeg(v.teeth2, 40)));
  const D1 = (n1 * p) / Math.PI;
  const D2 = (n2 * p) / Math.PI;
  const C = nonNeg(v.centerDistance) * (pick(v.units, 2) === 1 ? 25.4 : 1);
  const L = 2 * C + (Math.PI * (D1 + D2)) / 2 + (C > 0 ? Math.pow(D2 - D1, 2) / (4 * C) : 0);
  const teeth = Math.round(L / p);
  const Lb = teeth * p;
  const b = 2 * Lb - Math.PI * (D2 + D1);
  const Cfit = (b + Math.sqrt(Math.max(0, b * b - 8 * Math.pow(D2 - D1, 2)))) / 8;
  const wrap = C > 0 ? 180 - (2 * Math.asin(Math.min(1, Math.abs(D2 - D1) / (2 * C))) * 180) / Math.PI : 0;
  const k = pick(v.units, 2) === 1 ? 1 / 25.4 : 1;
  return { beltTeeth: teeth, beltLength: round2(L * k), centerForWholeBelt: round2(Cfit * k), speedRatio: r4(n2 / n1), smallPulleyWrapDegrees: round2(wrap), teethInMeshSmall: Math.floor((wrap / 360) * Math.min(n1, n2)), pitchDiameter1: round2(D1 * k), pitchDiameter2: round2(D2 * k) };
};

export const equipmentRoi: CustomCalculator = (v) => {
  const invest = nonNeg(v.equipmentCost) + nonNeg(v.installation) + nonNeg(v.training);
  const savings = nonNeg(v.laborHoursSaved) * nonNeg(v.laborRate) + nonNeg(v.energySavings) + nonNeg(v.scrapSavings) + nonNeg(v.extraProfit) - nonNeg(v.annualOperatingCost);
  const n = Math.max(1, Math.round(nonNeg(v.lifeYears, 7)));
  const r = nonNeg(v.discountRate) / 100;
  let npv = -invest;
  for (let y = 1; y <= n; y++) npv += savings / Math.pow(1 + r, y);
  npv += nonNeg(v.salvage) / Math.pow(1 + r, n);
  return { annualNetSavings: round2(savings), paybackYears: round2(savings > 0 ? invest / savings : 0), roiPercent: round2(invest ? ((savings * n + nonNeg(v.salvage) - invest) / invest) * 100 : 0), npv: round2(npv), totalInvestment: round2(invest), lifetimeNetGain: round2(savings * n + nonNeg(v.salvage) - invest) };
};

export const acceleratedAging: CustomCalculator = (v) => {
  const ta = safeNumber(v.accelTemp, 55);
  const tu = safeNumber(v.useTemp, 25);
  let af: number;
  if (pick(v.method, 2) === 0) af = Math.pow(Math.max(1, nonNeg(v.q10, 2)), (ta - tu) / 10);
  else af = Math.exp(((nonNeg(v.activationEnergy, 83) * 1000) / 8.314) * (1 / (tu + 273.15) - 1 / (ta + 273.15)));
  const days = nonNeg(v.testDays);
  return { accelerationFactor: r4(af), equivalentRealDays: round2(days * af), equivalentRealMonths: round2((days * af) / 30.4375), testDaysForTarget: round2(af > 0 ? (nonNeg(v.targetShelfMonths) * 30.4375) / af : 0), equivalentRealYears: round2((days * af) / 365.25) };
};

export const diePerWafer: CustomCalculator = (v) => {
  const d = Math.max(0, nonNeg(v.waferDiameter, 300) - 2 * nonNeg(v.edgeExclusion, 3));
  const w = nonNeg(v.dieWidth) + nonNeg(v.scribe);
  const h = nonNeg(v.dieHeight) + nonNeg(v.scribe);
  const S = w * h;
  const dpw = S > 0 ? Math.max(0, Math.floor((Math.PI * d * d) / (4 * S) - (Math.PI * d) / Math.sqrt(2 * S))) : 0;
  const areaCm2 = (nonNeg(v.dieWidth) * nonNeg(v.dieHeight)) / 100;
  const D = nonNeg(v.defectDensity);
  const poisson = Math.exp(-D * areaCm2);
  const murphy = D * areaCm2 > 0 ? Math.pow((1 - Math.exp(-D * areaCm2)) / (D * areaCm2), 2) : 1;
  const yieldUsed = pick(v.yieldModel, 2) === 0 ? murphy : poisson;
  const good = Math.floor(dpw * yieldUsed);
  return { grossDiePerWafer: dpw, goodDiePerWafer: good, yieldPercent: round2(yieldUsed * 100), costPerGoodDie: round2(good > 0 ? nonNeg(v.waferCost) / good : 0), dieAreaMm2: round2(nonNeg(v.dieWidth) * nonNeg(v.dieHeight)), poissonYieldPercent: round2(poisson * 100) };
};

/** Inverse standard normal (Acklam). */
export function invNorm(p: number) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const q0 = Math.min(1 - 1e-12, Math.max(1e-12, p));
  if (q0 < 0.02425) { const q = Math.sqrt(-2 * Math.log(q0)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (q0 > 1 - 0.02425) { const q = Math.sqrt(-2 * Math.log(1 - q0)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = q0 - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
export const sigmaLevel: CustomCalculator = (v) => {
  let dpmo: number;
  if (pick(v.mode, 3) === 0) { const opp = nonNeg(v.units) * Math.max(1, nonNeg(v.opportunities, 1)); dpmo = opp > 0 ? (nonNeg(v.defects) / opp) * 1e6 : 0; }
  else if (pick(v.mode, 3) === 1) dpmo = nonNeg(v.dpmo);
  else dpmo = (1 - nonNeg(v.yieldPercent) / 100) * 1e6;
  dpmo = Math.min(999999, Math.max(0, dpmo));
  const yieldFrac = 1 - dpmo / 1e6;
  const sigma = dpmo > 0 ? invNorm(yieldFrac) + 1.5 : 6 + 1.5;
  return { sigmaLevel: round2(sigma), dpmo: round2(dpmo), yieldPercent: r4(yieldFrac * 100), defectRatePercent: r4((dpmo / 1e6) * 100), longTermSigma: round2(sigma - 1.5) };
};

export const predictiveMaintenance: CustomCalculator = (v) => {
  const assets = nonNeg(v.assets);
  const failures = assets * nonNeg(v.failuresPerAsset);
  const avoided = failures * (nonNeg(v.failureReduction) / 100);
  const failureSavings = avoided * nonNeg(v.costPerFailure);
  const pmSavings = nonNeg(v.annualPmSpend) * (nonNeg(v.pmReduction) / 100);
  const savings = failureSavings + pmSavings;
  const annualCost = assets * nonNeg(v.softwarePerAssetYear);
  const upfront = assets * nonNeg(v.sensorsPerAsset) + nonNeg(v.implementation);
  const net = savings - annualCost;
  return { annualNetSavings: round2(net), grossAnnualSavings: round2(savings), failuresAvoided: round2(avoided), upfrontCost: round2(upfront), paybackMonths: round2(net > 0 ? (upfront / net) * 12 : 0), threeYearRoiPercent: round2(upfront + annualCost * 3 ? ((net * 3 - upfront) / (upfront + annualCost * 3)) * 100 : 0) };
};

export const mttf: CustomCalculator = (v) => {
  const hours = pick(v.mode, 2) === 0 ? nonNeg(v.units) * nonNeg(v.hoursEach) : nonNeg(v.totalHours);
  const f = nonNeg(v.failures);
  const m = f > 0 ? hours / f : 0;
  const t = nonNeg(v.missionHours);
  return { mttfHours: round2(m), failureRatePerHour: f > 0 && hours > 0 ? Math.round((f / hours) * 1e10) / 1e10 : 0, fitRate: round2(m > 0 ? 1e9 / m : 0), reliabilityAtMissionPercent: round2(m > 0 ? Math.exp(-t / m) * 100 : 0), mttfYears: round2(m / 8760), b10LifeHours: round2(m * 0.10536) };
};

export const oring: CustomCalculator = (v) => {
  const cs = Math.max(0.001, nonNeg(v.crossSection));
  const id = Math.max(0.001, nonNeg(v.oringId));
  const groove = nonNeg(v.grooveDiameter);
  const bore = nonNeg(v.boreDiameter);
  const piston = pick(v.application, 3) === 0;
  const face = pick(v.application, 3) === 2;
  const stretch = piston ? Math.max(0, (groove - id) / id) * 100 : 0;
  const csEff = cs * (1 - (stretch / 100) * 0.5);
  const gland = face ? nonNeg(v.grooveDepth) : Math.abs(bore - groove) / 2;
  const squeeze = ((csEff - gland) / csEff) * 100;
  const fill = gland * nonNeg(v.grooveWidth) > 0 ? ((Math.PI / 4) * csEff * csEff) / (gland * nonNeg(v.grooveWidth)) * 100 : 0;
  const dynamic = yes(v.dynamic);
  const okSqueeze = dynamic ? squeeze >= 10 && squeeze <= 20 : squeeze >= 15 && squeeze <= 30;
  return { squeezePercent: round2(squeeze), stretchPercent: round2(stretch), glandFillPercent: round2(fill), glandDepthIn: r4(gland), effectiveCrossSectionIn: r4(csEff), squeezeOk: okSqueeze ? 1 : 0, fillOk: fill <= 85 ? 1 : 0, stretchOk: stretch <= 5 ? 1 : 0 };
};

export const centrifuge: CustomCalculator = (v) => {
  const rCm = nonNeg(v.radiusMm) / 10;
  if (pick(v.mode, 2) === 0) {
    const rcf = 1.118e-5 * rCm * Math.pow(nonNeg(v.rpm), 2);
    return { rcfXg: round2(rcf), rpm: Math.round(nonNeg(v.rpm)), radiusCm: round2(rCm) };
  }
  const rpm = rCm > 0 ? Math.sqrt(nonNeg(v.rcf) / (1.118e-5 * rCm)) : 0;
  return { rcfXg: round2(nonNeg(v.rcf)), rpm: Math.round(rpm), radiusCm: round2(rCm) };
};

export const SPRING_G: [string, number][] = [["Music wire (ASTM A228)", 11.5e6], ["Oil-tempered (A229)", 11.2e6], ["Chrome silicon (A401)", 11.2e6], ["Stainless 302 / 304", 10e6], ["Stainless 17-7 PH", 11e6], ["Phosphor bronze", 6.25e6]];
export const compressionSpring: CustomCalculator = (v) => {
  const d = Math.max(0.001, nonNeg(v.wireDiameter));
  const OD = nonNeg(v.outerDiameter);
  const D = Math.max(d, OD - d);
  const Na = Math.max(0.5, nonNeg(v.activeCoils));
  const G = SPRING_G[pick(v.material, SPRING_G.length)][1];
  const k = (G * Math.pow(d, 4)) / (8 * Math.pow(D, 3) * Na);
  const C = D / d;
  const wahl = C > 1 ? (4 * C - 1) / (4 * C - 4) + 0.615 / C : 1;
  const ends = [2, 2, 0, 1][pick(v.ends, 4)];
  const solid = (Na + ends) * d;
  const free = nonNeg(v.freeLength);
  const travel = Math.max(0, free - solid);
  const defl = Math.min(nonNeg(v.workingDeflection), travel);
  const F = k * defl;
  const stress = (wahl * 8 * F * D) / (Math.PI * Math.pow(d, 3));
  return { springRateLbPerIn: round2(k), loadAtWorkingLb: round2(F), shearStressPsi: round2(stress), springIndex: round2(C), solidHeightIn: r4(solid), maxTravelIn: r4(travel), loadAtSolidLb: round2(k * travel), wahlFactor: r4(wahl) };
};

export const mexicoMfg: CustomCalculator = (v) => {
  const fx = Math.max(1, nonNeg(v.mxnPerUsd, 18.5));
  const daily = pick(v.zone, 2) === 0 ? Math.max(nonNeg(v.dailyWage), 315.04) : Math.max(nonNeg(v.dailyWage), 440.87);
  const workers = nonNeg(v.workers);
  const monthlyWageMxn = daily * 30.4 * workers;
  const burden = monthlyWageMxn * (nonNeg(v.burdenPercent, 45) / 100);
  const hours = workers * nonNeg(v.hoursPerWeek, 48) * 4.33;
  const shelter = hours * nonNeg(v.shelterPerHour);
  const facility = nonNeg(v.sqFt) * nonNeg(v.rentPerSqFtMonth);
  const laborUsd = (monthlyWageMxn + burden) / fx;
  const monthly = laborUsd + shelter + facility + nonNeg(v.utilities) + nonNeg(v.otherMonthly);
  const usCost = hours * nonNeg(v.usLoadedHourly);
  return { monthlyCostUsd: round2(monthly), costPerLaborHourUsd: round2(hours ? monthly / hours : 0), loadedLaborPerHourUsd: round2(hours ? laborUsd / hours : 0), laborCostUsd: round2(laborUsd), shelterFees: round2(shelter), monthlySavingsVsUs: round2(usCost - monthly), annualSavingsVsUs: round2((usCost - monthly) * 12) };
};

export const downtimeCost: CustomCalculator = (v) => {
  const h = nonNeg(v.hours);
  const lostProfit = h * nonNeg(v.unitsPerHour) * nonNeg(v.marginPerUnit);
  const idle = h * nonNeg(v.idleWorkers) * nonNeg(v.laborRate);
  const recovery = nonNeg(v.overtimeHours) * nonNeg(v.overtimeRate);
  const per = lostProfit + idle + recovery + nonNeg(v.repairCost) + nonNeg(v.scrapRestart) + nonNeg(v.penalties);
  return { costPerEvent: round2(per), costPerHour: round2(h ? per / h : 0), lostProfit: round2(lostProfit), idleLabor: round2(idle), recoveryOvertime: round2(recovery), annualCost: round2(per * nonNeg(v.eventsPerYear)) };
};

export const extrusionCost: CustomCalculator = (v) => {
  const qty = Math.max(1, nonNeg(v.quantity, 1));
  const aluminum = pick(v.material, 2) === 0;
  const lbEach = nonNeg(v.weightPerFoot) * nonNeg(v.lengthFt) * (1 + nonNeg(v.scrap, 8) / 100);
  const metal = lbEach * nonNeg(v.materialPerLb);
  const conversion = aluminum ? lbEach * nonNeg(v.conversionPerLb) : nonNeg(v.extruderRate) * (lbEach / Math.max(1, nonNeg(v.outputLbPerHour, 300)));
  const finish = nonNeg(v.lengthFt) * nonNeg(v.finishPerFoot);
  const per = metal + conversion + finish + nonNeg(v.fabricationEach) + nonNeg(v.dieCost) / qty;
  return { costPerPiece: round2(per), totalCost: round2(per * qty), weightPerPieceLb: round2(lbEach), materialPerPiece: round2(metal), conversionPerPiece: round2(conversion), dieAmortizationPerPiece: round2(nonNeg(v.dieCost) / qty), costPerLb: round2(lbEach ? per / lbEach : 0) };
};

// --- Press brake & punching ---------------------------------------------------------------------------------
export const BRAKE_MATERIAL: [string, number][] = [["Mild steel (60 ksi)", 1], ["Stainless 304", 1.5], ["Aluminum 5052-H32", 0.5], ["Aluminum 6061-T6", 0.8], ["High-strength steel (80 ksi)", 1.35], ["AR400 / Hardox", 2.5]];
export const pressBrake: CustomCalculator = (v) => {
  const T = nonNeg(v.thickness);
  const V = nonNeg(v.dieOpening) > 0 ? nonNeg(v.dieOpening) : T <= 0.5 ? 8 * T : 10 * T;
  const mf = BRAKE_MATERIAL[pick(v.material, BRAKE_MATERIAL.length)][1];
  const method = [1, 4, 8][pick(v.method, 3)];
  const tonsFt = V > 0 ? ((575 * T * T) / V) * mf * method : 0;
  const ir = V / 6.4;
  const ang = (Math.min(179, Math.max(1, nonNeg(v.bendAngle, 90))) * Math.PI) / 180;
  const K = nonNeg(v.kFactor, 0.44);
  const ba = ang * (ir + K * T);
  const ossb = Math.tan(ang / 2) * (ir + T);
  return { tonsPerFoot: round2(tonsFt), totalTons: round2(tonsFt * nonNeg(v.bendLength)), dieOpeningIn: r4(V), insideRadiusIn: r4(ir), bendAllowanceIn: r4(ba), bendDeductionIn: r4(2 * ossb - ba), minFlangeIn: r4(V * 0.7) };
};

export const SHEAR_STRENGTH: [string, number][] = [["Mild steel", 50000], ["Stainless 304", 70000], ["Aluminum 5052", 25000], ["Aluminum 6061-T6", 30000], ["Brass", 35000], ["Copper", 25000], ["High-strength steel", 65000]];
export const punchTonnage: CustomCalculator = (v) => {
  const shape = pick(v.shape, 3);
  const perimeter = shape === 0 ? Math.PI * nonNeg(v.diameter) : shape === 1 ? 2 * (nonNeg(v.length) + nonNeg(v.width)) : nonNeg(v.perimeter);
  const t = nonNeg(v.thickness);
  const ss = SHEAR_STRENGTH[pick(v.material, SHEAR_STRENGTH.length)][1];
  const holes = Math.max(1, Math.round(nonNeg(v.holes, 1)));
  const tons = (perimeter * t * ss * holes) / 2000;
  const strip = tons * (nonNeg(v.strippingPercent, 10) / 100);
  return { punchingTons: round2(tons), strippingTons: round2(strip), recommendedPressTons: round2((tons + strip) * 1.2), perimeterIn: r4(perimeter), punchingForceLb: round2(tons * 2000), kiloNewtons: round2(tons * 8.896) };
};

export const bizMfgCustomCalculators: Record<string, CustomCalculator> = {
  "silver-price-calculator": silverValue,
  "alloy-calculator": alloyMix,
  "metal-weight-calculator": metalWeight,
  "coil-length-calculator": coilLength,
  "sheet-metal-gauge-calculator": sheetGauge,
  "steel-plate-load-capacity-calculator": plateLoad,
  "steel-i-beam-cost-calculator": iBeamCost,
  "flexo-plate-distortion-calculator": flexoDistortion,
  "book-cover-spine-calculator": ingramCover,
  "ingramspark-price-calculator": ingramPrice,
  "label-size-calculator": labelSize,
  "industrial-paint-calculator": industrialPaint,
  "milling-speed-feed-calculator": milling,
  "welding-calculator": welding,
  "injection-molding-cost-calculator": injectionMolding,
  "sublimation-calculator": sublimation,
  "laser-waterjet-cutting-cost-calculator": cuttingCost,
  "urethane-casting-cost-calculator": urethaneCasting,
  "oee-calculator": oee,
  "manufacturing-cost-calculator": mfgCost,
  "takt-time-calculator": taktTime,
  "ansi-z14-sampling-calculator": z14,
  "availability-calculator": availability,
  "timing-belt-calculator": timingBelt,
  "equipment-roi-calculator": equipmentRoi,
  "accelerated-aging-calculator": acceleratedAging,
  "die-per-wafer-calculator": diePerWafer,
  "sigma-level-calculator": sigmaLevel,
  "predictive-maintenance-roi-calculator": predictiveMaintenance,
  "mttf-calculator": mttf,
  "o-ring-calculator": oring,
  "centrifuge-rpm-rcf-calculator": centrifuge,
  "compression-spring-calculator": compressionSpring,
  "mexico-manufacturing-cost-calculator": mexicoMfg,
  "downtime-cost-calculator": downtimeCost,
  "extrusion-cost-calculator": extrusionCost,
  "press-brake-tonnage-calculator": pressBrake,
  "punch-forming-tonnage-calculator": punchTonnage,
};
