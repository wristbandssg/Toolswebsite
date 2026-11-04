/**
 * Batch: "Business & Industrial Calculators" → Manufacturing, Metals & Engineering Calculators
 * (plant, piping and fluid-handling tools).
 *
 * Data / methods:
 *  - Darcy–Weisbach with the Swamee–Jain friction factor; water at 60 °F (ν = 1.217e-5 ft²/s,
 *    62.37 lb/ft³). Absolute roughness: PVC 0.000005 ft, copper 0.000005, commercial steel
 *    0.00015, galvanized 0.0005, cast iron 0.00085, concrete 0.004.
 *  - Hazen–Williams: hf/100 ft = 0.2083 (100/C)^1.852 Q^1.852 / d^4.8655 (Q gpm, d in).
 *  - Manning full-pipe flow: Q = (1.486/n) A R^(2/3) S^(1/2).
 *  - IFGC eq. 4-1 low-pressure gas sizing: Q = 2313 D^2.623 (ΔH / (Cr L))^0.541,
 *    Cr = 0.6094 natural gas, 1.2462 propane; Schedule 40 steel inside diameters.
 *  - Orifice: Q (gpm) = 29.84 Cd d² √(ΔP / SG) / √(1 − β⁴).
 *  - Saturated steam specific volume (ft³/lb) by gauge pressure (steam tables).
 *  - Barlow / ASME B31.8: P = 2 S t F E T / D; API 5L SMYS by grade.
 *  - Grease interceptors: UPC Appendix H gravity sizing (meals × waste flow × retention ×
 *    storage factor) and PDI G-101 hydromechanical flow rating.
 *  - Bearing L10 life (ISO 281): L10 = (C/P)^p × 10⁶ rev, p = 3 ball / 10/3 roller.
 *  - Desiccant units: MIL-STD-2073-1 Method II, U = 0.011 A + X D.
 *  - 4–20 mA scaling with NAMUR NE 43 fault limits (< 3.8 mA, > 20.5 mA).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-biz-fluids-calculators.ts for the copy.
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
const nextSize = (sizes: number[], x: number) => sizes.find((s) => s >= x - 1e-9) ?? 0;
const G = 32.174;

/** Schedule 40 steel: [nominal size (in), inside diameter (in), outside diameter (in)]. */
export const SCH40: [number, number, number][] = [[0.5, 0.622, 0.84], [0.75, 0.824, 1.05], [1, 1.049, 1.315], [1.25, 1.38, 1.66], [1.5, 1.61, 1.9], [2, 2.067, 2.375], [2.5, 2.469, 2.875], [3, 3.068, 3.5], [4, 4.026, 4.5], [5, 5.047, 5.563], [6, 6.065, 6.625], [8, 7.981, 8.625], [10, 10.02, 10.75], [12, 11.938, 12.75]];

// --- Civil / containment -----------------------------------------------------------------------------------
export const MANHOLE_SIZES = [48, 60, 72, 84, 96, 108, 120, 144];
export const manhole: CustomCalculator = (v) => {
  const h1 = nonNeg(v.pipe1Od) + nonNeg(v.clearance, 4);
  const h2 = nonNeg(v.pipe2Od) + nonNeg(v.clearance, 4);
  const leg = nonNeg(v.minLeg, 8);
  const theta = (Math.min(180, Math.max(10, nonNeg(v.angle, 180))) * Math.PI) / 180;
  const byAngle = (2 * ((h1 + h2) / 2 + leg)) / theta;
  const byHole = Math.max(h1, h2) + 2 * leg;
  const req = Math.max(byAngle, byHole, 48);
  const size = nextSize(MANHOLE_SIZES, req);
  return { recommendedDiameterIn: size, requiredDiameterIn: round2(req), largestHoleIn: round2(Math.max(h1, h2)), riserSections4Ft: ceil(nonNeg(v.depth) / 4), concreteLegIn: round2(leg) };
};

export const containment: CustomCalculator = (v) => {
  const largest = nonNeg(v.largestTankGal);
  const rainFt = nonNeg(v.rainfallIn) / 12;
  const L = nonNeg(v.dikeLength);
  const W = nonNeg(v.dikeWidth);
  const footprints = Math.max(0, Math.round(nonNeg(v.otherTanks))) * Math.PI * Math.pow(nonNeg(v.tankDiameter) / 2, 2);
  const netArea = Math.max(0, L * W - footprints);
  const rule = pick(v.rule, 2);
  const reqGal = rule === 0 ? largest * 1.1 : largest + L * W * rainFt * 7.48052;
  const reqFt3 = reqGal / 7.48052;
  const height = netArea > 0 ? reqFt3 / netArea : 0;
  const capGal = netArea * nonNeg(v.wallHeight) * 7.48052;
  return { requiredCapacityGal: round2(reqGal), minWallHeightFt: round2(height), minWallHeightIn: round2(height * 12), existingCapacityGal: round2(capGal), adequate: capGal >= reqGal ? 1 : 0, netAreaSqFt: round2(netArea) };
};

// --- Pipe flow -------------------------------------------------------------------------------------------------
export const ROUGHNESS: [string, number][] = [["PVC / plastic", 0.000005], ["Copper / brass", 0.000005], ["Commercial steel", 0.00015], ["Galvanized steel", 0.0005], ["Cast / ductile iron", 0.00085], ["Concrete", 0.004], ["HDPE", 0.000005]];
function darcy(gpm: number, idIn: number, lengthFt: number, rough: number, nu: number) {
  const D = idIn / 12;
  const A = (Math.PI / 4) * D * D;
  const Q = gpm / 448.831;
  const V = A > 0 ? Q / A : 0;
  const Re = nu > 0 ? (V * D) / nu : 0;
  let f = 0;
  if (Re > 0 && Re < 2300) f = 64 / Re;
  else if (Re >= 2300) f = 0.25 / Math.pow(Math.log10(rough / (3.7 * D) + 5.74 / Math.pow(Re, 0.9)), 2);
  const hf = D > 0 ? f * (lengthFt / D) * ((V * V) / (2 * G)) : 0;
  return { V, Re, f, hf };
}

export const pipeFlow: CustomCalculator = (v) => {
  const id = nonNeg(v.insideDiameter);
  const A = (Math.PI / 4) * Math.pow(id / 12, 2);
  const gpm = pick(v.mode, 2) === 0 ? nonNeg(v.flowGpm) : nonNeg(v.velocity) * A * 448.831;
  const V = A > 0 ? gpm / 448.831 / A : 0;
  const Re = (V * (id / 12)) / 1.217e-5;
  const C = Math.max(1, nonNeg(v.hazenC, 130));
  const hw = id > 0 ? (0.2083 * Math.pow(100 / C, 1.852) * Math.pow(gpm, 1.852)) / Math.pow(id, 4.8655) : 0;
  return { flowGpm: round2(gpm), velocityFps: round2(V), flowLps: round2(gpm * 0.0630902), flowM3h: round2(gpm * 0.227125), reynoldsNumber: Math.round(Re), turbulent: Re >= 4000 ? 1 : 0, headLossPer100Ft: round2(hw), psiLossPer100Ft: round2(hw * 0.4331) };
};

export const pressureDrop: CustomCalculator = (v) => {
  const sg = nonNeg(v.specificGravity, 1);
  const nu = nonNeg(v.viscosityCst, 1.13) * 1.07639e-5; // cSt → ft²/s
  const L = nonNeg(v.length) + nonNeg(v.fittingsEquivalentLength);
  const { V, Re, f, hf } = darcy(nonNeg(v.flowGpm), nonNeg(v.insideDiameter), L, ROUGHNESS[pick(v.material, ROUGHNESS.length)][1], nu);
  const elev = safeNumber(v.elevationChange);
  const psi = (hf * 62.37 * sg) / 144;
  return { pressureDropPsi: round2(psi), headLossFt: round2(hf), totalPsiWithElevation: round2(psi + (elev * 62.37 * sg) / 144), velocityFps: round2(V), reynoldsNumber: Math.round(Re), frictionFactor: r4(f), psiPer100Ft: round2(L > 0 ? (psi / L) * 100 : 0) };
};

export const linkSeal: CustomCalculator = (v) => {
  const od = nonNeg(v.pipeOd);
  const hole = nonNeg(v.holeId);
  const gap = Math.max(0, (hole - od) / 2);
  const mean = od + gap;
  const links = ceil((Math.PI * mean) / Math.max(0.1, nonNeg(v.linkPitch, 1.6)));
  const fits = gap >= nonNeg(v.sealMin) && gap <= nonNeg(v.sealMax) ? 1 : 0;
  return { annularGapIn: r4(gap), linksNeeded: links, recommendedHoleIdIn: round2(od + 2 * ((nonNeg(v.sealMin) + nonNeg(v.sealMax)) / 2)), withinSealRange: fits, circumferenceIn: round2(Math.PI * mean) };
};

/** Air tools: [label, CFM at 90 psi, duty cycle]. */
export const AIR_TOOLS: [string, number, number][] = [["1/2 in impact wrench", 5, 0.25], ["3/8 in ratchet", 3.5, 0.2], ["Die grinder", 5, 0.5], ["Dual-action sander", 11, 0.75], ["HVLP spray gun", 12, 0.5], ["Framing nailer", 2.2, 0.1], ["Air hammer / chisel", 4, 0.3], ["4.5 in angle grinder", 6, 0.5], ["Blow gun", 2.5, 0.1], ["Tire inflator", 2, 0.1]];
export const compressorCfm: CustomCalculator = (v) => {
  let avg = 0;
  let peak = 0;
  AIR_TOOLS.forEach(([, cfm, duty], i) => {
    const n = nonNeg(v[`tool${i}`]);
    avg += n * cfm * duty;
    peak += n * cfm;
  });
  avg += nonNeg(v.otherCfm);
  peak += nonNeg(v.otherCfm);
  const req = avg * (1 + nonNeg(v.margin, 30) / 100);
  const press = nonNeg(v.pressure, 90);
  const scfmAt = req * (press > 90 ? 1 + (press - 90) / 200 : 1);
  return { recommendedCfm: round2(scfmAt), averageDemandCfm: round2(avg), peakDemandCfm: round2(peak), estimatedHp: round2(scfmAt / 4), tankGallons: ceil(Math.max(20, scfmAt * 4)) };
};

export const GAS_TYPES: [string, number, number][] = [["Natural gas (1,038 BTU/cf, SG 0.60)", 0.6094, 1038], ["Propane (2,516 BTU/cf, SG 1.52)", 1.2462, 2516]];
export const gasPipe: CustomCalculator = (v) => {
  const [, Cr, btu] = GAS_TYPES[pick(v.gas, GAS_TYPES.length)];
  const cfh = nonNeg(v.loadBtu) / btu;
  const L = Math.max(10, nonNeg(v.length));
  const dH = Math.max(0.1, nonNeg(v.pressureDrop, 0.5));
  const cap = (D: number) => 2313 * Math.pow(D, 2.623) * Math.pow(dH / (Cr * L), 0.541);
  const row = SCH40.find(([, id]) => cap(id) >= cfh);
  return { pipeSizeIn: row ? row[0] : 0, requiredCfh: round2(cfh), capacityOfSelectedCfh: round2(row ? cap(row[1]) : 0), capacityHalfInchCfh: round2(cap(0.622)), capacityOneInchCfh: round2(cap(1.049)), noneFits: row ? 0 : 1 };
};

export const MOTOR_HP = [0.5, 0.75, 1, 1.5, 2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300];
export const pumpSize: CustomCalculator = (v) => {
  const sg = nonNeg(v.specificGravity, 1);
  const tdh = nonNeg(v.staticHead) + nonNeg(v.frictionHead) + (nonNeg(v.dischargePsi) * 2.31) / sg;
  const whp = (nonNeg(v.flowGpm) * tdh * sg) / 3960;
  const bhp = whp / Math.max(0.05, nonNeg(v.pumpEff, 70) / 100);
  const motor = nextSize(MOTOR_HP, bhp * 1.1);
  const kw = (bhp * 0.7457) / Math.max(0.05, nonNeg(v.motorEff, 90) / 100);
  return { totalDynamicHeadFt: round2(tdh), brakeHp: round2(bhp), recommendedMotorHp: motor, waterHp: round2(whp), inputKw: round2(kw), annualEnergyCost: round2(kw * nonNeg(v.hoursPerYear) * nonNeg(v.pricePerKwh)) };
};

export const hydraulicCylinder: CustomCalculator = (v) => {
  const A = (Math.PI / 4) * Math.pow(nonNeg(v.bore), 2);
  const Ar = A - (Math.PI / 4) * Math.pow(nonNeg(v.rod), 2);
  const P = nonNeg(v.pressure);
  const q = nonNeg(v.flowGpm) * 231 / 60; // in³/s
  const stroke = nonNeg(v.stroke);
  return { extendForceLb: round2(P * A), retractForceLb: round2(P * Ar), extendSpeedInPerSec: round2(A > 0 ? q / A : 0), retractSpeedInPerSec: round2(Ar > 0 ? q / Ar : 0), extendTimeSec: round2(q > 0 ? (A * stroke) / q : 0), retractTimeSec: round2(q > 0 ? (Ar * stroke) / q : 0), oilVolumeGal: round2((A * stroke) / 231), hydraulicHp: round2((nonNeg(v.flowGpm) * P) / 1714), extendForceTons: round2((P * A) / 2000) };
};

export const INTERCEPTOR_GPM = [4, 7, 10, 15, 20, 25, 35, 50, 75, 100];
export const greaseTrap: CustomCalculator = (v) => {
  const waste = [6, 5, 2][pick(v.service, 3)];
  const hours = nonNeg(v.hoursOpen, 12);
  const storage = hours <= 8 ? 1 : hours <= 12 ? 1.5 : hours <= 16 ? 2 : hours <= 20 ? 2.5 : 3;
  const gravity = nonNeg(v.mealsPerPeakHour) * waste * nonNeg(v.retentionHours, 2.5) * storage;
  const sinkGal = (nonNeg(v.sinkLength) * nonNeg(v.sinkWidth) * nonNeg(v.sinkDepth) * Math.max(1, nonNeg(v.compartments, 1))) / 231;
  const gpm = (sinkGal * 0.75) / Math.max(1, nonNeg(v.drainMinutes, 1));
  return { gravityInterceptorGal: round2(gravity), hydromechanicalGpm: round2(gpm), recommendedHmiGpm: nextSize(INTERCEPTOR_GPM, gpm), sinkVolumeGal: round2(sinkGal), storageFactor: storage };
};

export const orifice: CustomCalculator = (v) => {
  const d = nonNeg(v.orificeDiameter);
  const D = nonNeg(v.pipeDiameter);
  const beta = D > 0 ? d / D : 0;
  const E = beta < 1 ? 1 / Math.sqrt(1 - Math.pow(beta, 4)) : 0;
  const gpm = 29.84 * nonNeg(v.cd, 0.61) * d * d * Math.sqrt(nonNeg(v.pressureDrop) / Math.max(0.01, nonNeg(v.specificGravity, 1))) * E;
  return { flowGpm: round2(gpm), flowM3h: round2(gpm * 0.227125), betaRatio: r4(beta), orificeVelocityFps: round2(d > 0 ? (gpm / 448.831) / ((Math.PI / 4) * Math.pow(d / 12, 2)) : 0), approachFactor: r4(E) };
};

export const DUCT_SIZES = [3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36];
export const dustCollector: CustomCalculator = (v) => {
  const vel = nonNeg(v.velocity, 4000);
  const area = (d: number) => (Math.PI / 4) * Math.pow(d / 12, 2);
  const cfm = [4, 5, 6, 8].reduce((a, d, i) => a + nonNeg(v[`branches${i}`]) * area(d) * vel, 0) + nonNeg(v.otherCfm);
  const mainD = Math.sqrt(cfm / vel / (Math.PI / 4)) * 12;
  const hp = (cfm * nonNeg(v.staticPressure, 8)) / (6356 * Math.max(0.1, nonNeg(v.fanEff, 60) / 100));
  return { totalCfm: round2(cfm), mainDuctDiameterIn: round2(mainD), standardMainDuctIn: nextSize(DUCT_SIZES, mainD), filterAreaSqFt: round2(cfm / Math.max(0.5, nonNeg(v.airToCloth, 6))), estimatedFanHp: round2(hp) };
};

export const STEAM_V: [string, number][] = [["0 psig", 26.8], ["5 psig", 20.1], ["15 psig", 13.9], ["30 psig", 9.46], ["50 psig", 6.66], ["100 psig", 3.88], ["150 psig", 2.75], ["200 psig", 2.13], ["300 psig", 1.47]];
export const steamPipe: CustomCalculator = (v) => {
  const sv = STEAM_V[pick(v.pressure, STEAM_V.length)][1];
  const cfm = (nonNeg(v.steamLbPerHour) * sv) / 60;
  const vmax = Math.max(500, nonNeg(v.maxVelocity, 6000));
  const reqId = Math.sqrt(cfm / vmax / (Math.PI / 4)) * 12;
  const row = SCH40.find(([, id]) => id >= reqId);
  const id = row ? row[1] : 0;
  const actual = id > 0 ? cfm / ((Math.PI / 4) * Math.pow(id / 12, 2)) : 0;
  return { pipeSizeIn: row ? row[0] : 0, requiredIdIn: round2(reqId), actualVelocityFpm: round2(actual), steamVolumeCfm: round2(cfm), specificVolume: sv };
};

/** Rotary valve sizes: [inlet size in, displacement ft³ per rev]. */
export const AIRLOCKS: [number, number][] = [[6, 0.1], [8, 0.25], [10, 0.5], [12, 0.9], [14, 1.4], [16, 2.1], [18, 3.0], [20, 4.2], [24, 6.8]];
export const rotaryAirlock: CustomCalculator = (v) => {
  const ft3h = pick(v.rateUnit, 2) === 0 ? nonNeg(v.rate) / Math.max(1, nonNeg(v.bulkDensity, 40)) : nonNeg(v.rate);
  const rpm = Math.max(1, nonNeg(v.maxRpm, 20));
  const fill = Math.max(0.05, nonNeg(v.fillEfficiency, 75) / 100);
  const reqDisp = ft3h / (rpm * 60 * fill);
  const row = AIRLOCKS.find(([, d]) => d >= reqDisp);
  const runRpm = row ? ft3h / (row[1] * 60 * fill) : 0;
  return { valveSizeIn: row ? row[0] : 0, requiredDisplacement: r4(reqDisp), operatingRpm: round2(runRpm), throughputCuFtPerHour: round2(ft3h), selectedDisplacement: row ? row[1] : 0 };
};

export const pipeSlope: CustomCalculator = (v) => {
  const run = nonNeg(v.runFt);
  const mode = pick(v.mode, 2);
  const slopeInPerFt = mode === 0 ? (run > 0 ? nonNeg(v.dropIn) / run : 0) : nonNeg(v.slopeInPerFt);
  const drop = mode === 0 ? nonNeg(v.dropIn) : slopeInPerFt * run;
  const S = slopeInPerFt / 12;
  const D = nonNeg(v.diameterIn) / 12;
  const A = (Math.PI / 4) * D * D;
  const R = D / 4;
  const n = Math.max(0.005, nonNeg(v.manningN, 0.011));
  const Q = (1.486 / n) * A * Math.pow(R, 2 / 3) * Math.sqrt(S);
  const minSlope = nonNeg(v.diameterIn) <= 2.5 ? 0.25 : nonNeg(v.diameterIn) <= 6 ? 0.125 : 0.0625;
  return { slopeInPerFt: r4(slopeInPerFt), slopePercent: round2(S * 100), totalDropIn: round2(drop), angleDegrees: r4((Math.atan(S) * 180) / Math.PI), fullFlowGpm: round2(Q * 448.831), fullFlowVelocityFps: round2(A > 0 ? Q / A : 0), meetsCodeMinimum: slopeInPerFt >= minSlope ? 1 : 0, codeMinimumInPerFt: minSlope };
};

export const chemDosing: CustomCalculator = (v) => {
  const mgd = pick(v.flowUnit, 2) === 0 ? (nonNeg(v.flow) * 1440) / 1e6 : nonNeg(v.flow);
  const lbDay = mgd * nonNeg(v.doseMgL) * 8.34;
  const strength = Math.max(0.0001, nonNeg(v.strength, 12.5) / 100);
  const sg = Math.max(0.1, nonNeg(v.specificGravity, 1.2));
  const galDay = lbDay / (8.34 * sg * strength);
  return { activeLbPerDay: round2(lbDay), solutionGalPerDay: round2(galDay), pumpRateGph: round2(galDay / 24), pumpRateMlMin: round2((galDay * 3785.41) / 1440), activeKgPerDay: round2(lbDay * 0.45359237), costPerDay: round2(galDay * nonNeg(v.pricePerGal)), daysPerDrum: round2(galDay > 0 ? 55 / galDay : 0) };
};

export const PIPE_OD: [string, number][] = [["1/2 in", 0.84], ["3/4 in", 1.05], ["1 in", 1.315], ["1-1/2 in", 1.9], ["2 in", 2.375], ["3 in", 3.5], ["4 in", 4.5], ["6 in", 6.625], ["8 in", 8.625], ["10 in", 10.75], ["12 in", 12.75]];
export const INSULATION_K: [string, number][] = [["None (bare steel)", 0], ["Fiberglass", 0.021], ["Mineral wool", 0.023], ["Elastomeric foam", 0.022], ["Calcium silicate", 0.033], ["Polyisocyanurate", 0.016]];
export const pipeHeatLoss: CustomCalculator = (v) => {
  const od = PIPE_OD[pick(v.pipeSize, PIPE_OD.length)][1];
  const r1 = od / 24;
  const k = INSULATION_K[pick(v.insulation, INSULATION_K.length)][1];
  const t = nonNeg(v.thickness);
  const dT = safeNumber(v.pipeTemp) - safeNumber(v.ambientTemp);
  const h = nonNeg(v.surfaceH, yes(v.outdoorWind) ? 4 : 1.65);
  let perFt: number;
  if (k === 0 || t === 0) perFt = (yes(v.outdoorWind) ? 4 : 2.5) * 2 * Math.PI * r1 * dT;
  else {
    const r2 = r1 + t / 12;
    perFt = dT / (Math.log(r2 / r1) / (2 * Math.PI * k) + 1 / (h * 2 * Math.PI * r2));
  }
  const L = nonNeg(v.length);
  const watts = (perFt / 3.412) * 1.2;
  const fuelBtu = Math.abs(perFt) * L * nonNeg(v.hoursPerYear);
  return { heatLossBtuPerHrFt: round2(perFt), totalBtuPerHr: round2(perFt * L), heatTraceWattsPerFt: round2(Math.max(0, watts)), totalTraceWatts: round2(Math.max(0, watts) * L), annualEnergyCost: round2((fuelBtu / 3412) * nonNeg(v.pricePerKwh)), annualMmbtu: round2(fuelBtu / 1e6) };
};

export const slurry: CustomCalculator = (v) => {
  const sgs = Math.max(0.1, nonNeg(v.solidsSg, 2.65));
  const sgl = Math.max(0.1, nonNeg(v.liquidSg, 1));
  let cw: number;
  if (pick(v.mode, 2) === 0) cw = Math.min(99.9, nonNeg(v.solidsWeightPercent));
  else { const sgm = nonNeg(v.slurrySg); cw = sgm > sgl ? (100 * sgs * (sgm - sgl)) / (sgm * (sgs - sgl)) : 0; }
  const sgm = 100 / (cw / sgs + (100 - cw) / sgl);
  const cv = (cw * sgm) / sgs;
  const tph = (nonNeg(v.flowGpm) * 8.34 * sgm * (cw / 100) * 60) / 2000;
  return { slurrySg: r4(sgm), solidsByWeightPercent: round2(cw), solidsByVolumePercent: round2(cv), slurryDensityLbFt3: round2(sgm * 62.37), solidsTonsPerHour: round2(tph), slurryDensityKgM3: round2(sgm * 999) };
};

export const API5L: [string, number][] = [["Grade B (35,000 psi)", 35000], ["X42", 42000], ["X46", 46000], ["X52", 52000], ["X56", 56000], ["X60", 60000], ["X65", 65000], ["X70", 70000], ["X80", 80000]];
export const CLASS_F = [0.72, 0.6, 0.5, 0.4, 0.8];
export const smys: CustomCalculator = (v) => {
  const S = API5L[pick(v.grade, API5L.length)][1];
  const D = Math.max(0.1, nonNeg(v.od));
  const t = nonNeg(v.wall);
  const F = CLASS_F[pick(v.locationClass, CLASS_F.length)];
  const design = (2 * S * t * F * nonNeg(v.jointFactor, 1) * nonNeg(v.tempFactor, 1)) / D;
  const hoop = (nonNeg(v.operatingPressure) * D) / (2 * Math.max(0.001, t));
  return { maopPsi: round2(design), percentSmys: round2((hoop / S) * 100), hoopStressPsi: round2(hoop), pressureAt100SmysPsi: round2((2 * S * t) / D), designFactor: F, withinMaop: nonNeg(v.operatingPressure) <= design ? 1 : 0 };
};

export const airSuspension: CustomCalculator = (v) => {
  const area = nonNeg(v.effectiveArea) > 0 ? nonNeg(v.effectiveArea) : (Math.PI / 4) * Math.pow(nonNeg(v.effectiveDiameter), 2);
  const bags = Math.max(1, Math.round(nonNeg(v.bags, 2)));
  const perBag = (nonNeg(v.axleLoad) / bags) * Math.max(0.1, nonNeg(v.leverageRatio, 1));
  const psi = area > 0 ? perBag / area : 0;
  return { requiredPsi: round2(psi), loadPerBagLb: round2(perBag), effectiveAreaSqIn: round2(area), capacityAtMaxPsiLb: round2((area * nonNeg(v.maxPsi, 100) * bags) / Math.max(0.1, nonNeg(v.leverageRatio, 1))), withinRating: psi <= nonNeg(v.maxPsi, 100) ? 1 : 0 };
};

export const CRANE_CLASSES = [15, 25, 40, 50, 60, 75, 90, 100, 120, 150, 200, 250, 300, 400, 500, 600, 800];
export const craneSize: CustomCalculator = (v) => {
  const total = nonNeg(v.loadLb) + nonNeg(v.riggingLb) + nonNeg(v.hookBlockLb);
  const chartLimit = [0.85, 0.75, 0.8][pick(v.liftType, 3)];
  const reqAtRadius = total / chartLimit;
  const moment = (total / 2000) * nonNeg(v.radiusFt);
  const nominal = (reqAtRadius / 2000) * Math.max(1, nonNeg(v.radiusFt) / 10) * 1.25;
  return { requiredCapacityAtRadiusLb: round2(reqAtRadius), totalLiftedWeightLb: round2(total), loadMomentFtTons: round2(moment), estimatedCraneClassTons: nextSize(CRANE_CLASSES, nominal), chartPercentUsed: round2(chartLimit * 100) };
};

export const fourTwenty: CustomCalculator = (v) => {
  const lo = safeNumber(v.rangeLow);
  const hi = safeNumber(v.rangeHigh, 100);
  const span = hi - lo;
  let mA: number;
  let value: number;
  if (pick(v.mode, 2) === 0) { mA = safeNumber(v.milliamps, 12); value = lo + ((mA - 4) / 16) * span; }
  else { value = safeNumber(v.value); mA = span !== 0 ? 4 + ((value - lo) / span) * 16 : 4; }
  const pctVal = span !== 0 ? ((value - lo) / span) * 100 : 0;
  return { engineeringValue: r4(value), milliamps: r4(mA), percentOfSpan: round2(pctVal), voltsAcross250Ohm: r4(mA * 0.25), fault: mA < 3.8 || mA > 20.5 ? 1 : 0 };
};

export const RELIABILITY = [1, 0.64, 0.55, 0.47, 0.37, 0.25];
export const bearingLife: CustomCalculator = (v) => {
  const p = pick(v.type, 2) === 0 ? 3 : 10 / 3;
  const C = nonNeg(v.dynamicRating);
  const P = Math.max(0.0001, nonNeg(v.equivalentLoad));
  const n = Math.max(1, nonNeg(v.rpm));
  const a1 = RELIABILITY[pick(v.reliability, RELIABILITY.length)];
  const rev = Math.pow(C / P, p) * 1e6 * a1;
  const hours = rev / (60 * n);
  const target = nonNeg(v.targetHours);
  const reqC = P * Math.pow((target * 60 * n) / (1e6 * a1), 1 / p);
  return { lifeHours: round2(hours), lifeMillionRevs: round2(rev / 1e6), lifeYearsAt8760: round2(hours / 8760), requiredRatingForTarget: round2(reqC), loadRatio: round2(C / P), meetsTarget: hours >= target ? 1 : 0 };
};

export const DUNNAGE_X = [8, 4, 2, 0.5];
export const desiccant: CustomCalculator = (v) => {
  if (pick(v.mode, 2) === 0) {
    const A = 2 * (nonNeg(v.length) * nonNeg(v.width) + nonNeg(v.length) * nonNeg(v.height) + nonNeg(v.width) * nonNeg(v.height));
    const units = 0.011 * A + DUNNAGE_X[pick(v.dunnage, DUNNAGE_X.length)] * nonNeg(v.dunnageLb);
    return { desiccantUnits: ceil(units), barrierAreaSqIn: round2(A), unitGrams: round2(units * 33), containerKg: 0, bags1kg: 0 };
  }
  const m3 = [33.2, 67.7, 76.3][pick(v.container, 3)];
  const climate = [0.6, 1, 1.5][pick(v.climate, 3)];
  const kg = m3 * 0.15 * Math.max(0.5, nonNeg(v.transitDays, 30) / 30) * climate;
  return { desiccantUnits: 0, barrierAreaSqIn: 0, unitGrams: 0, containerKg: round2(kg), bags1kg: ceil(kg) };
};

export const bizFluidsCustomCalculators: Record<string, CustomCalculator> = {
  "manhole-sizing-calculator": manhole,
  "secondary-containment-calculator": containment,
  "pipe-flow-calculator": pipeFlow,
  "pipe-pressure-drop-calculator": pressureDrop,
  "link-seal-calculator": linkSeal,
  "air-compressor-cfm-calculator": compressorCfm,
  "gas-pipe-sizing-calculator": gasPipe,
  "pump-size-calculator": pumpSize,
  "hydraulic-cylinder-calculator": hydraulicCylinder,
  "grease-trap-sizing-calculator": greaseTrap,
  "orifice-flow-calculator": orifice,
  "dust-collector-calculator": dustCollector,
  "steam-pipe-sizing-calculator": steamPipe,
  "rotary-airlock-valve-sizing-calculator": rotaryAirlock,
  "pipe-slope-calculator": pipeSlope,
  "chemical-dosing-calculator": chemDosing,
  "pipe-heat-loss-calculator": pipeHeatLoss,
  "slurry-calculator": slurry,
  "smys-calculator": smys,
  "air-suspension-psi-calculator": airSuspension,
  "crane-size-calculator": craneSize,
  "4-20ma-calculator": fourTwenty,
  "bearing-life-calculator": bearingLife,
  "desiccant-calculator": desiccant,
};
