/**
 * Batch: "House & Garden Calculators" → HVAC, Plumbing & Electrical Calculators (heating, cooling & air).
 *
 * Data / methods:
 *  - Wet bulb: Stull (2011) empirical formula (°C, RH %); dew point: Magnus formula.
 *  - Round duct friction (ASHRAE equal-friction fit): Δp per 100 ft = 0.109136 · Q^1.9 ÷ D^5.02 (in. w.c.,
 *    Q in cfm, D in inches); rectangular equivalent diameter De = 1.30·(ab)^0.625 ÷ (a + b)^0.25.
 *  - Sensible heat: Q = 1.08 × cfm × ΔT; infiltration Q = 0.018 × volume × ACH × ΔT (BTU/hr).
 *  - Refrigerant pressure–temperature data (psig ↔ °F saturation) for R-410A, R-22 and R-134a from
 *    published PT charts (interpolated).
 *  - ASHRAE 62.2 whole-house ventilation: cfm = 0.03 × floor area + 7.5 × (bedrooms + 1).
 *  - Bath fans (HVI): 1 cfm per sq ft up to 100 sq ft, otherwise 50 cfm per toilet / shower / tub and 100 per
 *    jetted tub.
 *  - Combustion air (NFPA 54 / IFGC 304): indoor air allowed with ≥ 50 cu ft per 1,000 BTU/hr; outdoor openings
 *    1 sq in per 4,000 BTU/hr (vertical ducts or direct), 1 per 2,000 (horizontal ducts), or one opening at
 *    1 per 3,000.
 *  - Glycol freeze points interpolated from typical propylene / ethylene glycol tables.
 *  - Fan laws: cfm ∝ rpm, static pressure ∝ rpm², power ∝ rpm³; fan hp = cfm × SP ÷ (6,356 × efficiency).
 *  - Sauna: about 1 kW per m³, each m² of glass or bare stone adding ~1.2 m³ (heater makers' guidance).
 *  - U-value = 1 ÷ (Rsi + Σ thickness/λ + Rse) with Rsi 0.13 and Rse 0.04 m²K/W (walls).
 *  - Costs are typical 2026 US prices (editable inputs), not quotes. Federal 25C / 25D home energy credits
 *    ended for equipment installed after 31 December 2025, so incentive inputs default to $0.
 *
 * Self-contained: no imports from any other batch, per this project's established per-batch convention.
 * See prisma/create-hg-hvac-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

const num = (x: number, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);
const pos = (x: number, d = 0) => Math.max(0, num(x, d));
const pick = (x: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(num(x))));
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;
const ceil = (x: number) => Math.ceil(x - 1e-9);
const spread = (t: number) => ({ costLow: r2(t * 0.85), costHigh: r2(t * 1.25) });
const toC = (f: number) => (f - 32) / 1.8;
const toF = (c: number) => c * 1.8 + 32;
const interp = (x: number, xs: number[], ys: number[]) => {
  if (x <= xs[0]) return ys[0] + ((x - xs[0]) * (ys[1] - ys[0])) / (xs[1] - xs[0]);
  for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + ((x - xs[i - 1]) * (ys[i] - ys[i - 1])) / (xs[i] - xs[i - 1]);
  const n = xs.length - 1;
  return ys[n] + ((x - xs[n]) * (ys[n] - ys[n - 1])) / (xs[n] - xs[n - 1]);
};

// ---------- Psychrometrics ----------
export const HEAT_STRESS = ["Comfortable (wet bulb under 70 °F)", "Caution (70–78 °F)", "Dangerous for hard work (78–86 °F)", "Extreme — limit exposure (86–95 °F)", "Beyond human tolerance (95 °F+)"];
export const wetBulb: CustomCalculator = (v) => {
  const T = toC(num(v.temp, 90)), RH = Math.max(1, Math.min(100, pos(v.humidity, 50)));
  const tw = T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) + Math.atan(T + RH) - Math.atan(RH - 1.676331) + 0.00391838 * RH ** 1.5 * Math.atan(0.023101 * RH) - 4.686035;
  const a = 17.27, b = 237.7, g = (a * T) / (b + T) + Math.log(RH / 100);
  const dp = (b * g) / (a - g);
  const twF = toF(tw);
  return { wetBulbF: r1(twF), wetBulbC: r1(tw), dewPointF: r1(toF(dp)), stress: twF < 70 ? 0 : twF < 78 ? 1 : twF < 86 ? 2 : twF < 95 ? 3 : 4 };
};

export const mixedAir: CustomCalculator = (v) => {
  const oa = num(v.outsideTemp, 30), ra = num(v.returnTemp, 72), share = pos(v.outsidePct, 20) / 100;
  const mat = share * oa + (1 - share) * ra;
  const measured = num(v.measuredMixed);
  return { mixedTempF: r1(mat), outsideAirPctFromMeasured: measured && oa !== ra ? r1(((measured - ra) / (oa - ra)) * 100) : 0 };
};

export const deltaT: CustomCalculator = (v) => {
  const dt = Math.abs(num(v.returnTemp, 75) - num(v.supplyTemp, 57));
  const heating = pick(v.mode, 2) === 1;
  const status = heating ? (dt < 30 ? 0 : dt <= 70 ? 1 : 2) : dt < 16 ? 0 : dt <= 22 ? 1 : 2;
  return { deltaT: r1(dt), status, btuPerHour: Math.round(1.08 * pos(v.cfm, 1200) * dt) };
};
export const DELTA_STATUS = ["Low — check refrigerant charge, airflow too high, or undersized equipment", "Normal range", "High — check for low airflow (dirty filter or coil, closed vents)"];

// ---------- Refrigerant ----------
const PT_T = [-20, -10, 0, 10, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130];
const PT: number[][] = [
  [25.6, 36.5, 48.6, 62.0, 78.3, 97.3, 118.0, 130.0, 142.7, 170.0, 201.0, 235.0, 274.0, 317.0, 365.0, 418.0, 476.0], // R-410A
  [10.1, 16.5, 24.0, 32.8, 43.0, 54.9, 68.5, 76.0, 84.0, 101.6, 121.4, 143.6, 168.4, 195.9, 226.4, 259.9, 296.8], // R-22
  [-3.7, 1.9, 6.5, 12.0, 18.4, 26.1, 35.0, 40.1, 45.4, 57.4, 71.1, 86.7, 104.3, 124.1, 146.3, 171.1, 198.7], // R-134a
];
export const REFRIGERANTS = ["R-410A", "R-22", "R-134a"];
const satTemp = (r: number, psig: number) => interp(psig, PT[r], PT_T);
const satPress = (r: number, f: number) => interp(f, PT_T, PT[r]);
export const refrigerantPt: CustomCalculator = (v) => {
  const r = pick(v.refrigerant, 3);
  return { satTempF: r1(satTemp(r, num(v.pressure, 118))), pressureAtTempPsig: r1(satPress(r, num(v.temp, 40))), r134aChargeOz: r1(pos(v.r12Charge) * 0.85) };
};

export const SUPERHEAT_STATUS = ["Low — risk of liquid flood-back; check charge and airflow", "Typical range (8–14 °F for a TXV system at the condenser)", "High — likely undercharged or restricted"];
export const superheat: CustomCalculator = (v) => {
  const r = pick(v.refrigerant, 3);
  const st = satTemp(r, num(v.suctionPressure, 118));
  const sh = num(v.lineTemp, 52) - st;
  return { superheatF: r1(sh), satTempF: r1(st), status: sh < 5 ? 0 : sh <= 15 ? 1 : 2 };
};

export const SUBCOOL_STATUS = ["Low — possible undercharge", "Typical range (8–14 °F on most TXV systems — check the data plate)", "High — possible overcharge or restriction"];
export const subcooling: CustomCalculator = (v) => {
  const r = pick(v.refrigerant, 3);
  const st = satTemp(r, num(v.liquidPressure, 317));
  const sc = st - num(v.lineTemp, 90);
  return { subcoolingF: r1(sc), satTempF: r1(st), status: sc < 6 ? 0 : sc <= 15 ? 1 : 2 };
};

const LINE_OZ = [0.3, 0.4, 0.6, 1.2];
export const refrigerantCharge: CustomCalculator = (v) => {
  const extraFt = Math.max(0, pos(v.lineLength, 35) - pos(v.factoryLength, 15));
  const oz = extraFt * LINE_OZ[pick(v.liquidLine, 4)] * [1, 0.9][pick(v.refrigerant, 2)];
  return { addOz: r1(oz), addLb: r2(oz / 16), totalChargeLb: r2(pos(v.factoryCharge, 6) + oz / 16), extraFeet: extraFt };
};

// ---------- Load & sizing ----------
const COOL_F = [30, 28, 25, 22, 20, 18, 16], HEAT_F = [10, 18, 25, 32, 40, 45, 50];
export const manualJLoad: CustomCalculator = (v) => {
  const z = pick(v.zone, 7), a = pos(v.area, 2000);
  const f = [1.3, 1, 0.8][pick(v.insulation, 3)] * (pos(v.ceiling, 8) / 8) * [0.95, 1, 1.12][pick(v.windows, 3)];
  const cool = a * COOL_F[z] * f * [0.9, 1, 1.1][pick(v.sun, 3)] + pos(v.occupants, 4) * 400 + 1200;
  const heat = a * HEAT_F[z] * f;
  return { coolingBtu: Math.round(cool), tons: r2(cool / 12000), heatingBtu: Math.round(heat), furnaceInputBtu: Math.round(heat / 0.95) };
};

export const heatLoss: CustomCalculator = (v) => {
  const dT = Math.max(0, num(v.insideTemp, 70) - num(v.outsideTemp, 10));
  const L = pos(v.length, 14), W = pos(v.width, 12), H = pos(v.height, 8);
  const win = pos(v.windowArea, 20);
  const wall = Math.max(0, pos(v.exteriorWall, 26) * H - win);
  const ceiling = pick(v.ceilingExposed, 2) ? L * W : 0, floor = pick(v.floorExposed, 2) ? L * W : 0;
  const q = (wall / Math.max(1, pos(v.wallR, 13)) + win * pos(v.windowU, 0.35) + ceiling / Math.max(1, pos(v.ceilingR, 38)) + floor / Math.max(1, pos(v.floorR, 19))) * dT + 0.018 * L * W * H * pos(v.ach, 0.5) * dT;
  return { btuPerHour: Math.round(q), watts: Math.round(q / 3.412), btuPerSqFt: L * W ? r1(q / (L * W)) : 0 };
};

export const commercialHvacSize: CustomCalculator = (v) => {
  const sqftPerTon = pos(v.customSqFtPerTon) || [350, 300, 200, 1000, 250, 300, 100][pick(v.type, 7)];
  const tons = pos(v.area, 10000) / sqftPerTon;
  return { tons: r1(tons), btuPerHour: Math.round(tons * 12000), rooftopUnits: ceil(tons / Math.max(1, pos(v.maxUnitTons, 25))), sqFtPerTon: sqftPerTon };
};
export const COMMERCIAL_TYPES = ["Office", "Retail store", "Restaurant", "Warehouse (cooled)", "Medical / clinic", "School / classroom", "Server / IT room"];

export const metalBuildingHvac: CustomCalculator = (v) => {
  const a = pos(v.area, 2400), hf = Math.max(1, pos(v.height, 14) / 10);
  const ins = pick(v.insulation, 3), zone = pick(v.climate, 3);
  const cool = a * [40, 30, 22][ins] * [1.15, 1, 0.85][zone] * hf;
  const heat = a * [45, 32, 24][ins] * [0.7, 1, 1.3][zone] * hf;
  return { coolingTons: r1(cool / 12000), coolingBtu: Math.round(cool), heatingBtu: Math.round(heat), heatingKw: r1(heat / 3412) };
};

export const garageHeater: CustomCalculator = (v) => {
  const vol = pos(v.length, 24) * pos(v.width, 24) * pos(v.height, 9);
  const btu = vol * Math.max(0, num(v.insideTemp, 55) - num(v.outsideTemp, 10)) * [0.18, 0.133, 0.1][pick(v.insulation, 3)];
  return { btuPerHour: Math.round(btu), kilowatts: r1(btu / 3412), amps240: r1(btu / 3412 / 0.24), propaneGalPerHour: r2(btu / 91500) };
};

export const tubeHeater: CustomCalculator = (v) => {
  const vol = pos(v.length, 60) * pos(v.width, 40) * pos(v.height, 16);
  const dT = Math.max(0, num(v.insideTemp, 60) - num(v.outsideTemp, 0));
  const btu = vol * dT * [0.065, 0.045, 0.032][pick(v.insulation, 3)] * 0.85;
  const n = ceil(btu / Math.max(10000, pos(v.heaterBtu, 100000)));
  return { btuPerHour: Math.round(btu), heaters: n, spacingFt: n ? r1(pos(v.length, 60) / n) : 0 };
};

const SAUNA_KW = [3, 4.5, 6, 8, 9, 10.5, 12, 15];
export const saunaHeater: CustomCalculator = (v) => {
  const m3 = pos(v.length, 6) * pos(v.width, 6) * pos(v.height, 7) * 0.0283 + (pos(v.glass) + pos(v.stone)) * 0.0929 * 1.2;
  const kw = Math.max(3, m3);
  const size = SAUNA_KW.find((k) => k >= kw - 0.25) ?? 15;
  return { recommendedKw: r1(kw), heaterSizeKw: size, effectiveVolumeM3: r1(m3), amps240: r1((size * 1000) / 240) };
};

const BOILER_F = [30, 40, 50, 60];
export const COMBI_SIZES = ["24–27 kW combi (1 bathroom)", "28–32 kW combi (1–2 bathrooms)", "33–40 kW combi (2 bathrooms)", "System or regular boiler with a cylinder (3+ bathrooms)"];
export const boilerSize: CustomCalculator = (v) => {
  const btu = pos(v.area, 2000) * BOILER_F[pick(v.climate, 4)] * [1.2, 1, 0.85][pick(v.insulation, 3)];
  const baths = Math.round(pos(v.bathrooms, 1));
  return { heatingBtu: Math.round(btu), heatingKw: r1(btu / 3412), combi: baths <= 1 ? 0 : baths === 2 ? (pick(v.showersAtOnce, 2) ? 2 : 1) : 3, boilerInputBtu: Math.round(btu / 0.9) };
};

export const radiatorBtu: CustomCalculator = (v) => {
  const vol = pos(v.length, 12) * pos(v.width, 12) * pos(v.height, 8);
  let btu = vol * [5, 4, 6, 4, 5][pick(v.room, 5)];
  if (pick(v.north, 2)) btu *= 1.15;
  if (pick(v.windows, 2)) btu *= 1.1;
  if (pos(v.externalWalls, 1) >= 2) btu *= 1.1;
  if (pick(v.insulation, 2)) btu *= 0.9;
  const d50 = pos(v.radiatorDelta50);
  const dt = Math.max(1, (pos(v.flowTemp, 70) + pos(v.returnTemp, 60)) / 2 - pos(v.roomTemp, 20));
  return { btuPerHour: Math.round(btu), watts: Math.round(btu / 3.412), radiatorOutputW: d50 ? Math.round(d50 * (dt / 50) ** 1.3) : 0, deltaT: r1(dt) };
};

export const baseboardHeater: CustomCalculator = (v) => {
  const watts = pos(v.area, 150) * [12.5, 10, 7.5][pick(v.insulation, 3)] * (pos(v.ceiling, 8) / 8);
  return { watts: Math.round(watts), heaterFeet: ceil(watts / 250), heaters: ceil(ceil(watts / 250) / 6), amps240: r1(watts / 240) };
};

export const acAmps: CustomCalculator = (v) => {
  const btu = pos(v.tons) > 0 ? pos(v.tons) * 12000 : pos(v.btu, 36000);
  const volts = [240, 208, 120][pick(v.voltage, 3)];
  const w = btu / Math.max(5, pos(v.eer, 11));
  const rla = w / volts;
  const BREAKERS = [15, 20, 25, 30, 35, 40, 45, 50, 60];
  const maxB = BREAKERS.filter((b) => b <= rla * 2.25).pop() ?? 15;
  return { runningAmps: r1(rla), watts: Math.round(w), minCircuitAmps: r1(rla * 1.25), maxBreakerAmps: maxB };
};

// ---------- Air & ducts ----------
const ROUND = [4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24];
const roundFor = (cfm: number, f: number) => Math.pow((0.109136 * cfm ** 1.9) / Math.max(0.01, f), 1 / 5.02);
const rectWidth = (D: number, h: number) => { for (let w = h / 2; w <= 60; w += 0.5) if (1.3 * Math.pow(w * h, 0.625) / Math.pow(w + h, 0.25) >= D) return w; return 60; };
export const ductSize: CustomCalculator = (v) => {
  const cfm = pos(v.cfm) > 0 ? pos(v.cfm) : pos(v.tons, 3) * 400;
  const D = roundFor(cfm, pos(v.friction, 0.08));
  const nominal = ROUND.find((d) => d >= D - 0.05) ?? Math.ceil(D);
  const area = (Math.PI * (nominal / 2) ** 2) / 144;
  return { roundDiameterIn: r1(D), nominalRoundIn: nominal, velocityFpm: Math.round(cfm / area), rectWidthIn: r1(rectWidth(D, pos(v.rectHeight, 8))), cfm: Math.round(cfm) };
};

const GRILLES: [number, number][] = [[14, 20], [16, 20], [20, 20], [20, 25], [20, 30], [24, 24], [25, 25], [24, 30], [30, 30]];
export const returnAirDuct: CustomCalculator = (v) => {
  const cfm = pos(v.cfm) > 0 ? pos(v.cfm) : pos(v.tons, 3) * 400;
  const D = roundFor(cfm, 0.05);
  const freeIn = (cfm / 300) * 144;
  const g = GRILLES.find(([a, b]) => a * b >= cfm * 0.5) ?? GRILLES[GRILLES.length - 1]; // ≈ 200 sq in of grille per ton
  return { returnDuctIn: ROUND.find((d) => d >= D - 0.05) ?? Math.ceil(D), freeAreaSqIn: Math.round(freeIn), grilleWidthIn: g[0], grilleHeightIn: g[1], cfm: Math.round(cfm) };
};

export const EXHAUST_DUCTS = ["3–4 in duct (up to 50 cfm)", "4 in duct (short runs up to ~25 ft)", "6 in duct", "8 in duct"];
export const exhaustFanDuct: CustomCalculator = (v) => {
  const cfm = pos(v.cfm, 80), run = pos(v.runFeet, 15);
  const d = cfm <= 50 ? 0 : cfm <= 110 && run <= 25 ? 1 : cfm <= 200 ? 2 : 3;
  return { ductSize: d, velocityFpm4in: Math.round(cfm / ((Math.PI * 4) / 144)), velocityFpm6in: Math.round(cfm / ((Math.PI * 9) / 144)) };
};

export const exhaustFanCfm: CustomCalculator = (v) => {
  const area = pos(v.length, 8) * pos(v.width, 10);
  const fixtures = pos(v.toilets, 1) * 50 + pos(v.showers, 1) * 50 + pos(v.tubs) * 50 + pos(v.jetted) * 100;
  const byArea = area * (pos(v.ceiling, 8) / 8);
  const rec = area <= 100 ? Math.max(50, byArea) : fixtures;
  return { recommendedCfm: Math.ceil(rec / 10) * 10, byAreaCfm: Math.round(byArea), byFixturesCfm: fixtures, byAchCfm: Math.round((area * pos(v.ceiling, 8) * 8) / 60) };
};

export const airChanges: CustomCalculator = (v) => {
  const vol = pos(v.length, 20) * pos(v.width, 15) * pos(v.height, 8);
  const area = pos(v.length, 20) * pos(v.width, 15);
  return { ach: vol ? r2((pos(v.cfm, 100) * 60) / vol) : 0, cfmForTarget: Math.round((vol * pos(v.targetAch, 6)) / 60), cfmPerSqFt: area ? r2(pos(v.cfm, 100) / area) : 0, roomCuFt: Math.round(vol) };
};

export const ervSizing: CustomCalculator = (v) => {
  const cfm = 0.03 * pos(v.area, 2000) + 7.5 * (pos(v.bedrooms, 3) + 1);
  const vol = pos(v.area, 2000) * pos(v.ceiling, 8);
  return { continuousCfm: Math.round(cfm), boostCfm: Math.round(cfm * 1.5), achEquivalent: vol ? r2((cfm * 60) / vol) : 0 };
};

export const wholeHouseFan: CustomCalculator = (v) => {
  const vol = pos(v.area, 2000) * pos(v.ceiling, 8);
  const cfm = (vol * pos(v.airChanges, 20)) / 60;
  return { cfm: Math.round(cfm), cfmLow: Math.round(pos(v.area, 2000) * 2), cfmHigh: Math.round(pos(v.area, 2000) * 3), atticNfaSqFt: r1(cfm / 750) };
};

export const atticFan: CustomCalculator = (v) => {
  const cfm = pos(v.atticArea, 1500) * 0.7 * (pick(v.darkRoof, 2) ? 1.15 : 1);
  return { cfm: Math.round(cfm), intakeSqIn: Math.round((cfm / 300) * 144), intakeSqFt: r1(cfm / 300) };
};

export const fanLaw: CustomCalculator = (v) => {
  const ratio = pos(v.rpm2, 1200) / Math.max(1, pos(v.rpm1, 1000));
  return { cfm2: Math.round(pos(v.cfm1, 2000) * ratio), staticPressure2: r2(pos(v.sp1, 0.5) * ratio ** 2), hp2: r2(pos(v.hp1, 0.5) * ratio ** 3), fanHp1: r2((pos(v.cfm1, 2000) * pos(v.sp1, 0.5)) / (6356 * (pos(v.efficiency, 60) / 100))) };
};

export const combustionAir: CustomCalculator = (v) => {
  const btu = pos(v.btu, 140000);
  const need = (btu / 1000) * 50;
  return { requiredVolumeCuFt: Math.round(need), indoorOk: pos(v.spaceVolume) >= need ? 1 : 0, eachOpeningVerticalSqIn: Math.ceil(btu / 4000), eachOpeningHorizontalSqIn: Math.ceil(btu / 2000), singleOpeningSqIn: Math.ceil(btu / 3000) };
};

// ---------- Water & hydronics ----------
const PG = [[10, 26], [20, 18], [30, 8], [40, -7], [50, -28], [60, -55]];
const EG = [[10, 25], [20, 16], [30, 4], [40, -12], [50, -34], [60, -62]];
export const glycolMix: CustomCalculator = (v) => {
  const tbl = pick(v.glycol, 2) ? EG : PG;
  const t = num(v.protectTemp, 0);
  const pct = Math.max(0, Math.min(60, interp(-t, tbl.map((x) => -x[1]), tbl.map((x) => x[0]))));
  const vol = pos(v.systemGallons, 30);
  return { glycolPercent: r1(pct), glycolGallons: r2((vol * pct) / 100), waterGallons: r2(vol * (1 - pct / 100)) };
};

const LOOP_FT = [500, 175, 300, 0];
export const geothermalLoop: CustomCalculator = (v) => {
  const t = pick(v.loop, 4), tons = pos(v.tons, 3), soil = [0.85, 1, 1.3][pick(v.soil, 3)];
  const ft = tons * LOOP_FT[t] * soil;
  return { loopFeet: Math.round(ft), bores: t === 1 ? ceil(ft / 300) : 0, trenchFeet: t === 0 ? Math.round(ft / 2) : 0, gpmOpenLoop: t === 3 ? r1(tons * 1.5) : 0, landSqFt: t === 0 ? Math.round((ft / 2) * 10) : 0 };
};
export const LOOP_TYPES = ["Horizontal (trenches)", "Vertical (bores)", "Pond / lake loop", "Open loop (well water)"];

// ---------- Running costs ----------
export const acRunningCost: CustomCalculator = (v) => {
  const w = pos(v.watts) > 0 ? pos(v.watts) : pos(v.btu, 12000) / Math.max(5, pos(v.eer, 10));
  const kwhDay = (w / 1000) * pos(v.hoursPerDay, 8);
  return { costPerDay: r2(kwhDay * pos(v.kwhPrice, 0.17)), costPerMonth: r2(kwhDay * 30 * pos(v.kwhPrice, 0.17)), kwhPerDay: r2(kwhDay), watts: Math.round(w), costPerHour: r2((w / 1000) * pos(v.kwhPrice, 0.17)) };
};

export const heatPumpRunningCost: CustomCalculator = (v) => {
  const heat = pos(v.heatDemandKwh, 12000);
  const hp = (heat / Math.max(1, pos(v.scop, 3))) * pos(v.elecPrice, 0.25);
  const gas = (heat / (pos(v.boilerEfficiency, 90) / 100)) * pos(v.gasPrice, 0.07);
  return { heatPumpCost: r2(hp), gasBoilerCost: r2(gas), difference: r2(gas - hp), heatPumpKwh: Math.round(heat / Math.max(1, pos(v.scop, 3))) };
};

export const homeHeatingCost: CustomCalculator = (v) => {
  const mmbtu = (pos(v.area, 2000) / 1000) * [15, 25, 35, 45][pick(v.climate, 4)];
  const per = (price: number, btuPerUnit: number, eff: number) => r2(((mmbtu * 1e6) / (btuPerUnit * eff)) * price);
  return { gasCost: per(pos(v.gasPrice, 1.4), 100000, 0.95), propaneCost: per(pos(v.propanePrice, 2.8), 91500, 0.9), oilCost: per(pos(v.oilPrice, 3.8), 138500, 0.85), electricCost: per(pos(v.kwhPrice, 0.17), 3412, 1), heatPumpCost: per(pos(v.kwhPrice, 0.17), 3412, pos(v.cop, 2.8)), woodCost: per(pos(v.cordPrice, 300), 20000000, 0.7), heatNeedMmbtu: r1(mmbtu) };
};

export const gasFireplaceCost: CustomCalculator = (v) => {
  const btu = pos(v.btu, 30000), hrs = pos(v.hoursPerDay, 4) * pos(v.days, 30);
  const propane = pick(v.fuel, 2) === 1;
  const perHour = propane ? (btu / 91500) * pos(v.price, 2.8) : (btu / 100000) * pos(v.price, 1.4);
  return { costPerHour: r2(perHour), costPerMonth: r2(perHour * hrs), unitsPerHour: r2(propane ? btu / 91500 : btu / 100000) };
};

export const seerSavings: CustomCalculator = (v) => {
  const btu = pos(v.tons, 3) * 12000, hrs = pos(v.hours, 1500);
  const oldKwh = (btu * hrs) / (Math.max(5, pos(v.oldSeer, 10)) * 1000), newKwh = (btu * hrs) / (Math.max(5, pos(v.newSeer, 16)) * 1000);
  const save = (oldKwh - newKwh) * pos(v.kwhPrice, 0.17);
  return { yearlySavings: r2(save), oldCost: r2(oldKwh * pos(v.kwhPrice, 0.17)), newCost: r2(newKwh * pos(v.kwhPrice, 0.17)), paybackYears: save > 0 ? r1(pos(v.extraCost, 2000) / save) : 0, newSeer2: r1(pos(v.newSeer, 16) * 0.95) };
};

// ---------- Install & replacement costs ----------
export const HVAC_SYSTEMS = ["Central AC only", "Gas furnace only", "AC + gas furnace", "Heat pump system", "AC + furnace + new ductwork"];
export const hvacReplacementCost: CustomCalculator = (v) => {
  const s = pick(v.system, 5), tons = pos(v.tons, 3);
  const base = [tons * 2200, 4500, tons * 2200 + 4000, tons * 2800, tons * 2200 + 4000 + 5000][s];
  const total = base * [1, 1.15, 1.35][pick(v.tier, 3)] - pos(v.rebates);
  return { totalCost: r2(total), ...spread(total) };
};

export const HEAT_PUMP_TYPES = ["Ducted air-source", "Ductless mini-split (multi-zone)", "Cold-climate ducted", "Dual-fuel (with gas backup)"];
export const heatPumpCost: CustomCalculator = (v) => {
  const tons = pos(v.tons, 3);
  const gross = tons * [2800, 3500, 3600, 3000][pick(v.type, 4)] + (pick(v.ductwork, 2) ? 5000 : 0) + (pick(v.electrical, 2) ? 2000 : 0);
  return { netCost: r2(gross - pos(v.rebates)), grossCost: r2(gross), ...spread(gross) };
};

export const miniSplitCost: CustomCalculator = (v) => {
  const z = Math.max(1, Math.round(pos(v.zones, 1)));
  const t = pick(v.type, 3);
  const total = (t === 0 ? z * 1500 : t === 1 ? 4000 + (z - 1) * 3000 : 1500 + z * 3500) * Math.max(0.6, pos(v.btuPerZone, 12000) / 12000) + (pick(v.electrical, 2) ? 500 : 0);
  return { totalCost: r2(total), ...spread(total), perZone: r2(total / z) };
};

export const ductworkCost: CustomCalculator = (v) => {
  const total = pos(v.area, 2000) * [0.75, 2, 3.5, 5][pick(v.scope, 4)] * [1, 1.2][pick(v.access, 2)];
  return { totalCost: r2(total), ...spread(total) };
};

export const ductCleaningCost: CustomCalculator = (v) => {
  const total = 100 + pos(v.vents, 12) * 30 + (pick(v.dryer, 2) ? 125 : 0) + (pick(v.sanitize, 2) ? 100 : 0) + (pick(v.coil, 2) ? 200 : 0);
  return { totalCost: r2(total * Math.max(1, Math.round(pos(v.systems, 1)))), ...spread(total) };
};

export const BOILER_TYPES = ["Gas combi boiler", "Gas system / regular boiler", "High-efficiency condensing gas boiler", "Oil boiler", "Electric boiler"];
export const boilerCost: CustomCalculator = (v) => {
  const total = [7000, 8000, 9500, 9000, 5500][pick(v.type, 5)] * Math.max(0.8, pos(v.kw, 30) / 30) + (pick(v.flush, 2) ? 600 : 0) - pos(v.rebates);
  return { totalCost: r2(total), ...spread(total) };
};

export const geothermalCost: CustomCalculator = (v) => {
  const tons = pos(v.tons, 3);
  const gross = tons * (3500 + [2500, 5000, 2000, 1500][pick(v.loop, 4)]);
  const net = gross - pos(v.incentives);
  const save = pos(v.currentHvacCost, 2500) * (pos(v.savingsPct, 40) / 100);
  return { netCost: r2(net), grossCost: r2(gross), yearlySavings: r2(save), paybackYears: save ? r1(net / save) : 0 };
};

// ---------- Fireplaces, chimneys & tanks ----------
export const fireplaceSize: CustomCalculator = (v) => {
  const sq = pos(v.roomArea, 300);
  const w = Math.round(Math.sqrt(sq) * 2);
  const h = Math.round(Math.min(w * 0.67, 32));
  const openSqFt = (w * h) / 144;
  return { openingWidthIn: w, openingHeightIn: h, depthIn: Math.max(16, Math.round(h / 2)), hearthFrontIn: openSqFt < 6 ? 16 : 20, hearthSidesIn: openSqFt < 6 ? 8 : 12, flueAreaSqIn: Math.round((w * h) / 10) };
};

export const chimneyFlue: CustomCalculator = (v) => {
  const open = pos(v.openingWidth, 36) * pos(v.openingHeight, 28);
  const p = pos(v.pitch, 6), dist = Math.min(10, pos(v.distanceToRidge, 10));
  const higherWithin10 = (dist * p) / 12;
  const above = Math.max(3, higherWithin10 + 2);
  return { flueAreaRoundSqIn: Math.round(open / 10), roundFlueDiameterIn: r1(2 * Math.sqrt(open / 10 / Math.PI)), flueAreaRectSqIn: Math.round(open / 8), heightAboveRoofFt: r1(above) };
};

const TANKS = [{ w: 27, h: 44, l: 60, vertical: true }, { w: 27, h: 44, l: 60, vertical: false }, { w: 27, h: 44, l: 72, vertical: true }];
export const TANK_TYPES = ["275 gal oval, standing upright", "275 gal oval, lying flat", "330 gal oval, standing upright"];
export const oilTankLevel: CustomCalculator = (v) => {
  const t = TANKS[pick(v.tank, 3)], r = t.w / 2;
  const segment = (hh: number) => { const x = Math.max(0, Math.min(2 * r, hh)); return r * r * Math.acos((r - x) / r) - (r - x) * Math.sqrt(Math.max(0, 2 * r * x - x * x)); };
  const area = (d: number) => {
    if (t.vertical) {
      const H = t.h, straight = H - t.w;
      const dd = Math.max(0, Math.min(H, d));
      if (dd <= r) return segment(dd);
      if (dd <= r + straight) return (Math.PI * r * r) / 2 + (dd - r) * t.w;
      return (Math.PI * r * r) / 2 + straight * t.w + ((Math.PI * r * r) / 2 - segment(H - dd));
    }
    const dd = Math.max(0, Math.min(t.w, d));
    return segment(dd) + (t.h - t.w) * dd;
  };
  const full = area(t.vertical ? t.h : t.w) * t.l / 231;
  const gal = area(pos(v.depth, 20)) * t.l / 231;
  return { gallons: Math.round(gal), percentFull: r1((gal / full) * 100), gallonsToFill: Math.round(full * 0.9 - gal), capacityGallons: Math.round(full) };
};

// ---------- U-value ----------
export const LAYER_MATS = ["None", "PIR board (Kingspan / Celotex) λ 0.022", "Mineral wool / Rockwool λ 0.035", "EPS λ 0.038", "XPS λ 0.034", "Brick λ 0.77", "Dense concrete block λ 1.13", "Aerated block λ 0.15", "Timber λ 0.13", "Plasterboard λ 0.21", "Render / plaster λ 0.50", "Air cavity (R 0.18)"];
const LAMBDA = [0, 0.022, 0.035, 0.038, 0.034, 0.77, 1.13, 0.15, 0.13, 0.21, 0.5, 0];
export const uValue: CustomCalculator = (v) => {
  let R = 0.13 + 0.04;
  for (let i = 1; i <= 5; i++) {
    const m = pick(v[`m${i}`], LAMBDA.length), t = pos(v[`t${i}`]) / 1000;
    if (m === 11) R += 0.18;
    else if (m > 0 && t > 0) R += t / LAMBDA[m];
  }
  const U = 1 / R;
  const target = pos(v.targetU, 0.18);
  const extraPir = target > 0 && U > target ? Math.ceil(((1 / target - R) * 0.022) * 1000) : 0;
  return { uValue: Math.round(U * 1000) / 1000, rValueSi: r2(R), rValueUs: r1(R * 5.678), extraPirMm: extraPir };
};

export const hgHvacCustomCalculators: Record<string, CustomCalculator> = {
  "wet-bulb-calculator": wetBulb,
  "mixed-air-calculator": mixedAir,
  "delta-t-calculator": deltaT,
  "refrigerant-pt-calculator": refrigerantPt,
  "superheat-calculator": superheat,
  "subcooling-calculator": subcooling,
  "refrigerant-charge-calculator": refrigerantCharge,
  "manual-j-load-calculator": manualJLoad,
  "heat-loss-calculator": heatLoss,
  "commercial-hvac-size-calculator": commercialHvacSize,
  "metal-building-hvac-calculator": metalBuildingHvac,
  "garage-heater-size-calculator": garageHeater,
  "tube-heater-size-calculator": tubeHeater,
  "sauna-heater-size-calculator": saunaHeater,
  "boiler-size-calculator": boilerSize,
  "radiator-btu-calculator": radiatorBtu,
  "baseboard-heater-size-calculator": baseboardHeater,
  "ac-amps-calculator": acAmps,
  "duct-size-calculator": ductSize,
  "return-air-duct-calculator": returnAirDuct,
  "exhaust-fan-duct-calculator": exhaustFanDuct,
  "exhaust-fan-cfm-calculator": exhaustFanCfm,
  "air-changes-per-hour-calculator": airChanges,
  "erv-sizing-calculator": ervSizing,
  "whole-house-fan-calculator": wholeHouseFan,
  "attic-fan-calculator": atticFan,
  "fan-law-calculator": fanLaw,
  "combustion-air-calculator": combustionAir,
  "glycol-mix-calculator": glycolMix,
  "geothermal-loop-calculator": geothermalLoop,
  "ac-running-cost-calculator": acRunningCost,
  "heat-pump-running-cost-calculator": heatPumpRunningCost,
  "home-heating-cost-calculator": homeHeatingCost,
  "gas-fireplace-cost-calculator": gasFireplaceCost,
  "seer-savings-calculator": seerSavings,
  "hvac-replacement-cost-calculator": hvacReplacementCost,
  "heat-pump-cost-calculator": heatPumpCost,
  "mini-split-cost-calculator": miniSplitCost,
  "ductwork-cost-calculator": ductworkCost,
  "duct-cleaning-cost-calculator": ductCleaningCost,
  "boiler-cost-calculator": boilerCost,
  "geothermal-cost-calculator": geothermalCost,
  "fireplace-size-calculator": fireplaceSize,
  "chimney-flue-size-calculator": chimneyFlue,
  "oil-tank-level-calculator": oilTankLevel,
  "u-value-calculator": uValue,
};
