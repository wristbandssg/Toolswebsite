/**
 * Batch: "House & Garden Calculators" → Pool, Pond & Water Calculators.
 *
 * Data / methods (US gallons; ppm = mg/L):
 *  - Dose (lb) = gallons × Δppm × 8.34 ÷ 1,000,000 ÷ strength. Chlorine products per 1 ppm FC in 10,000 gal:
 *    12.5% liquid 10.7 fl oz, 10% 12.8 fl oz, 8.25% bleach 15.5 fl oz, 6% bleach 21.3 fl oz, cal-hypo 65% 2.0 oz
 *    (weight), dichlor 56% 2.4 oz, trichlor 90% 1.5 oz.
 *  - Total alkalinity: baking soda 1.4 lb per 10,000 gal raises TA 10 ppm; 31.45% muriatic acid ≈ 25.6 fl oz
 *    per 10,000 gal lowers TA 10 ppm. pH: 31.45% acid ≈ 12.8 fl oz per 10,000 gal lowers pH ~0.2 and soda ash
 *    ≈ 6 oz raises pH ~0.2 at TA 100 (scaled by TA — estimates; add in steps and retest).
 *  - Calcium chloride (77%) ≈ 1.2 lb per 10,000 gal raises CH 10 ppm; cyanuric acid ≈ 13 oz per 10,000 gal
 *    raises CYA 10 ppm; salt lb = gallons × Δppm × 8.34 ÷ 10⁶.
 *  - LSI = pH − pHs, pHs = (9.3 + A + B) − (C + D), A = (log TDS − 1)/10, B = −13.12·log(T K) + 34.55,
 *    C = log CH − 0.4, D = log(TA − CYA/3).
 *  - Evaporation (ASHRAE-style): lb/hr·ft² = (0.097 + 0.038·wind mph) × (Pw − Pa) in. Hg; 5.2 lb per in·ft².
 *  - Pump energy: variable-speed pumps at half speed use ≈ 1/8 the power, so the same turnover uses ≈ 1/4
 *    the energy (affinity laws).
 *  - Filter sand by tank diameter interpolated from common sand-filter charts.
 *  - Costs are typical 2026 US prices (editable inputs), not quotes.
 *
 * Self-contained: no imports from any other batch, per this project's established per-batch convention.
 * See prisma/create-hg-pool-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

const num = (x: number, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);
const pos = (x: number, d = 0) => Math.max(0, num(x, d));
const pick = (x: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(num(x))));
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;
const ceil = (x: number) => Math.ceil(x - 1e-9);
const spread = (t: number) => ({ costLow: r2(t * 0.85), costHigh: r2(t * 1.25) });
const k10 = (g: number) => pos(g, 15000) / 10000;

// ---------- Chlorine ----------
export const CHLORINE_PRODUCTS = ["Liquid chlorine 12.5% (fl oz)", "Liquid chlorine 10% (fl oz)", "Bleach 8.25% (fl oz)", "Bleach 6% (fl oz)", "Cal-hypo 65% (oz by weight)", "Dichlor 56% (oz by weight)", "Trichlor 90% (oz by weight)"];
const CL_PER_PPM = [10.7, 12.8, 15.5, 21.3, 2.0, 2.4, 1.5];
const clDose = (gal: number, ppm: number, product: number) => k10(gal) * Math.max(0, ppm) * CL_PER_PPM[pick(product, 7)];
export const poolChlorine: CustomCalculator = (v) => {
  const oz = clDose(v.gallons, pos(v.target, 4) - pos(v.current, 1), v.product);
  return { amount: r1(oz), cups: r2(oz / 8), quarts: r2(oz / 32), gallonsProduct: r2(oz / 128), pounds: r2(oz / 16) };
};

export const SHOCK_GOALS = ["Regular shock (raise to 10 ppm)", "SLAM / algae (FC = 40% of CYA)", "Custom target"];
export const poolShock: CustomCalculator = (v) => {
  const g = pick(v.goal, 3);
  const target = g === 0 ? 10 : g === 1 ? Math.max(10, pos(v.cya, 40) * 0.4) : pos(v.customTarget, 10);
  const oz = clDose(v.gallons, target - pos(v.current, 1), v.product);
  return { amount: r1(oz), targetFc: r1(target), pounds: r2(oz / 16), gallonsProduct: r2(oz / 128) };
};

// ---------- Balance ----------
export const poolAlkalinity: CustomCalculator = (v) => {
  const d = pos(v.target, 90) - pos(v.current, 70);
  return { bakingSodaLb: r2(d > 0 ? k10(v.gallons) * (d / 10) * 1.4 : 0), acidFlOz: r1(d < 0 ? k10(v.gallons) * (-d / 10) * 25.6 : 0), change: r1(d) };
};

export const poolPh: CustomCalculator = (v) => {
  const d = pos(v.target, 7.5) - pos(v.current, 7.8), ta = Math.max(20, pos(v.ta, 90)) / 100;
  return { acidFlOz: r1(d < 0 ? k10(v.gallons) * (-d / 0.2) * 12.8 * ta : 0), sodaAshOz: r1(d > 0 ? k10(v.gallons) * (d / 0.2) * 6 * ta : 0), change: r2(d) };
};

export const poolCalcium: CustomCalculator = (v) => {
  const d = pos(v.target, 300) - pos(v.current, 200);
  return { calciumChlorideLb: r2(d > 0 ? k10(v.gallons) * (d / 10) * 1.2 : 0), drainPercent: r1(d < 0 ? (1 - pos(v.target, 300) / Math.max(1, pos(v.current, 200))) * 100 : 0) };
};

export const poolStabilizer: CustomCalculator = (v) => {
  const d = pos(v.target, 40) - pos(v.current, 20);
  const oz = d > 0 ? k10(v.gallons) * (d / 10) * 13 : 0;
  return { cyaOz: r1(oz), cyaLb: r2(oz / 16), drainPercent: r1(d < 0 ? (1 - pos(v.target, 40) / Math.max(1, pos(v.current, 20))) * 100 : 0), minFc: r1(pos(v.target, 40) * 0.075) };
};

export const poolSalt: CustomCalculator = (v) => {
  const d = pos(v.target, 3200) - pos(v.current, 0);
  const lb = (pos(v.gallons, 15000) * Math.max(0, d) * 8.34) / 1e6;
  return { saltLb: Math.round(lb), bags40lb: ceil(lb / 40), kg: Math.round(lb * 0.4536), drainPercent: r1(d < 0 ? (1 - pos(v.target, 3200) / Math.max(1, pos(v.current))) * 100 : 0) };
};

export const pondSalt: CustomCalculator = (v) => {
  const lb = (pos(v.gallons, 1000) * 8.34 * pos(v.salinity, 0.1)) / 100;
  return { saltLb: r1(lb), saltKg: r1(lb * 0.4536), perDayLb: r1(lb / Math.max(1, pos(v.days, 3))), ppm: Math.round(pos(v.salinity, 0.1) * 10000) };
};

export const LSI_STATUS = ["Corrosive (below −0.3) — etching and metal damage", "Balanced (−0.3 to +0.3)", "Scale-forming (above +0.3) — cloudy water and scale"];
const lsiCalc = (ph: number, tempF: number, ch: number, ta: number, cya: number, tds: number) => {
  const T = (tempF - 32) / 1.8 + 273.15;
  const A = (Math.log10(Math.max(1, tds)) - 1) / 10, B = -13.12 * Math.log10(T) + 34.55;
  const C = Math.log10(Math.max(1, ch)) - 0.4, D = Math.log10(Math.max(1, ta - cya / 3));
  return ph - (9.3 + A + B - (C + D));
};
export const lsi: CustomCalculator = (v) => {
  const x = lsiCalc(pos(v.ph, 7.5), num(v.temp, 82), pos(v.ch, 300), pos(v.ta, 90), pos(v.cya, 40), pos(v.tds, 1000) + pos(v.salt));
  return { lsi: r2(x), status: x < -0.3 ? 0 : x <= 0.3 ? 1 : 2 };
};

export const poolChemical: CustomCalculator = (v) => {
  const g = v.gallons;
  const fc = clDose(g, pos(v.fcTarget, 4) - pos(v.fc, 2), 0);
  const ph = poolPh({ gallons: g, current: v.ph, target: v.phTarget, ta: v.ta }) as Record<string, number>;
  const ta = poolAlkalinity({ gallons: g, current: v.ta, target: v.taTarget }) as Record<string, number>;
  const ch = poolCalcium({ gallons: g, current: v.ch, target: v.chTarget }) as Record<string, number>;
  const cya = poolStabilizer({ gallons: g, current: v.cya, target: v.cyaTarget }) as Record<string, number>;
  const x = lsiCalc(pos(v.phTarget, 7.5), num(v.temp, 82), pos(v.chTarget, 300), pos(v.taTarget, 90), pos(v.cyaTarget, 40), 1000);
  return { liquidChlorineFlOz: r1(fc), acidFlOz: r1(ph.acidFlOz + ta.acidFlOz), sodaAshOz: ph.sodaAshOz, bakingSodaLb: ta.bakingSodaLb, calciumChlorideLb: ch.calciumChlorideLb, stabilizerLb: cya.cyaLb, targetLsi: r2(x) };
};

export const hotTubChemical: CustomCalculator = (v) => {
  const gal = pos(v.gallons, 400), d = Math.max(0, pos(v.target, 4) - pos(v.current, 1));
  const dichlorOz = (gal * d * 8.34e-6 * 16) / 0.56;
  const bromineOz = (gal * d * 2.25 * 8.34e-6 * 16) / 0.6;
  const taD = pos(v.taTarget, 80) - pos(v.ta, 60);
  return { dichlorOz: r2(dichlorOz), bromineOz: r2(bromineOz), bakingSodaOz: r2(taD > 0 ? (gal / 10000) * (taD / 10) * 1.4 * 16 : 0), phDownOz: r2(pos(v.ph, 7.6) > 7.6 ? (gal / 10000) * ((pos(v.ph, 7.6) - 7.4) / 0.2) * 16 * 0.6 : 0) };
};

// ---------- Volumes ----------
export const SHAPES = ["Rectangle / box", "Round (cylinder)", "Oval", "Kidney / irregular"];
const shapeArea = (shape: number, L: number, W: number) => [L * W, Math.PI * (L / 2) ** 2, Math.PI * (L / 2) * (W / 2), L * W * 0.75][shape];
export const waterVolume: CustomCalculator = (v) => {
  const cuFt = shapeArea(pick(v.shape, 4), pos(v.length, 10), pos(v.width, 5)) * pos(v.depth, 4);
  return { gallons: Math.round(cuFt * 7.48), liters: Math.round(cuFt * 28.32), cubicFeet: r1(cuFt), cubicMeters: r2(cuFt * 0.02832), weightLb: Math.round(cuFt * 62.4) };
};

export const pondVolume: CustomCalculator = (v) => {
  const depth = pos(v.avgDepth) > 0 ? pos(v.avgDepth) : (pos(v.shallowDepth, 1.5) + pos(v.deepDepth, 3)) / 2;
  const cuFt = shapeArea(pick(v.shape, 4), pos(v.length, 12), pos(v.width, 8)) * depth;
  const gal = cuFt * 7.48;
  return { gallons: Math.round(gal), liters: Math.round(cuFt * 28.32), koi: Math.floor(gal / 250), pumpGph: Math.round(gal), surfaceSqFt: Math.round(shapeArea(pick(v.shape, 4), pos(v.length, 12), pos(v.width, 8))) };
};

export const TANK_SHAPES = ["Vertical cylinder", "Horizontal cylinder", "Rectangular"];
export const waterTank: CustomCalculator = (v) => {
  const s = pick(v.shape, 3), D = pos(v.diameter, 48), L = pos(v.length, 60), W = pos(v.width, 48), H = pos(v.height, 60);
  const fill = pos(v.fillHeight, 30);
  let full: number, part: number;
  if (s === 0) { full = Math.PI * (D / 2) ** 2 * H; part = Math.PI * (D / 2) ** 2 * Math.min(fill, H); }
  else if (s === 1) {
    const r = D / 2, h = Math.min(fill, D);
    full = Math.PI * r * r * L;
    part = (r * r * Math.acos((r - h) / r) - (r - h) * Math.sqrt(Math.max(0, 2 * r * h - h * h))) * L;
  } else { full = L * W * H; part = L * W * Math.min(fill, H); }
  return { capacityGallons: Math.round(full / 231), currentGallons: Math.round(part / 231), capacityLiters: Math.round((full / 231) * 3.785), percentFull: full ? r1((part / full) * 100) : 0 };
};

export const pondLiner: CustomCalculator = (v) => {
  const d = pos(v.maxDepth, 3), o = pos(v.overlap, 1.5);
  const L = pos(v.length, 12) + 2 * d + 2 * o, W = pos(v.width, 8) + 2 * d + 2 * o;
  return { linerLengthFt: Math.ceil(L), linerWidthFt: Math.ceil(W), linerSqFt: Math.ceil(L) * Math.ceil(W), underlaymentSqFt: Math.ceil(L) * Math.ceil(W) };
};

// ---------- Equipment & operation ----------
export const poolTurnover: CustomCalculator = (v) => {
  const gal = pos(v.gallons, 20000), gpm = Math.max(1, pos(v.gpm, 40));
  return { turnoverHours: r1(gal / (gpm * 60)), gpmFor8Hours: Math.round(gal / 480), gpmForTarget: Math.round(gal / (Math.max(1, pos(v.targetHours, 8)) * 60)), turnoversPerDay: r2((gpm * 60 * pos(v.runHours, 8)) / gal) };
};

export const poolPumpRunTime: CustomCalculator = (v) => {
  const gal = pos(v.gallons, 20000), gpm = Math.max(1, pos(v.gpm, 45));
  const hours = Math.min(24, (gal * Math.max(0.5, pos(v.turnovers, 1))) / (gpm * 60));
  const watts = pos(v.watts) || pos(v.hp, 1.5) * 1000;
  const cost = (watts / 1000) * hours * 30 * pos(v.kwhPrice, 0.17);
  return { hoursPerDay: r1(hours), monthlyCost: r2(cost), variableSpeedMonthly: r2(cost / 4), yearlySavingsVs: r2((cost - cost / 4) * pos(v.months, 6)) };
};

const SAND_D = [14, 16, 18, 20, 22, 24, 26, 30, 36], SAND_LB = [50, 100, 150, 200, 250, 300, 400, 600, 900];
export const poolFilterSand: CustomCalculator = (v) => {
  const d = pos(v.diameter, 22);
  let lb = SAND_LB[SAND_LB.length - 1];
  for (let i = 0; i < SAND_D.length; i++) if (d <= SAND_D[i]) { lb = i === 0 ? SAND_LB[0] : SAND_LB[i - 1] + ((d - SAND_D[i - 1]) * (SAND_LB[i] - SAND_LB[i - 1])) / (SAND_D[i] - SAND_D[i - 1]); break; }
  const sand = pos(v.customLb) || lb;
  return { sandLb: Math.round(sand), bags50lb: ceil(sand / 50), glassMediaLb: Math.round(sand * 0.8), filterBallsLb: r1(sand * 0.028) };
};

const svpInHg = (f: number) => { const c = (f - 32) / 1.8; return 0.6108 * Math.exp((17.27 * c) / (c + 237.3)) * 0.2953; };
export const poolEvaporation: CustomCalculator = (v) => {
  const pw = svpInHg(num(v.waterTemp, 82)), pa = svpInHg(num(v.airTemp, 85)) * (pos(v.humidity, 50) / 100);
  const lbHrFt = Math.max(0, (0.097 + 0.038 * pos(v.wind, 5)) * (pw - pa));
  const inDay = (lbHrFt * 24) / 5.2 * (pick(v.cover, 2) ? 0.1 : 1);
  const area = pos(v.area, 450);
  return { inchesPerDay: r2(inDay), inchesPerWeek: r2(inDay * 7), gallonsPerDay: Math.round(inDay * area * 0.623), gallonsPerMonth: Math.round(inDay * area * 0.623 * 30) };
};

export const pondPumpSize: CustomCalculator = (v) => {
  const turnover = pos(v.gallons, 1000) / Math.max(0.5, pos(v.turnoverHours, 1));
  const falls = pos(v.waterfallWidth) * pos(v.gphPerInch, 150);
  const need = Math.max(turnover, falls);
  return { gphAtHead: Math.round(need), turnoverGph: Math.round(turnover), waterfallGph: Math.round(falls), headFt: r1(pos(v.height, 3) + pos(v.pipeLength, 20) * 0.1), airPumpLph: Math.round((pos(v.gallons, 1000) * 3.785) / 60 * 4) };
};

export const HEATERS = ["Gas heater (84% efficient)", "Heat pump (COP 5)", "Electric resistance"];
export const poolHeatingCost: CustomCalculator = (v) => {
  const gal = pos(v.gallons, 20000), dT = Math.max(0, pos(v.targetTemp, 82) - pos(v.waterTemp, 70));
  const btu = gal * 8.34 * dT * 1.2;
  const h = pick(v.heater, 3);
  const output = h === 0 ? pos(v.heaterBtu, 250000) * 0.84 : h === 1 ? pos(v.heaterBtu, 110000) : pos(v.heaterBtu, 50000);
  const cost = (b: number) => (h === 0 ? (b / (100000 * 0.84)) * pos(v.gasPrice, 1.4) : h === 1 ? (b / (3412 * 5)) * pos(v.kwhPrice, 0.17) : (b / 3412) * pos(v.kwhPrice, 0.17));
  const dailyLoss = pos(v.area, 450) * Math.max(0, pos(v.targetTemp, 82) - pos(v.airTemp, 70)) * 12 * 24 * (pick(v.cover, 2) ? 0.5 : 1);
  return { hoursToHeat: output ? r1(btu / output) : 0, costToHeat: r2(cost(btu)), dailyCostToMaintain: r2(cost(dailyLoss)), monthlyCost: r2(cost(dailyLoss) * 30) };
};

export const poolFillTime: CustomCalculator = (v) => {
  const gal = pos(v.gallons, 20000), gpm = pos(v.hoseGpm, 9) * Math.max(1, Math.round(pos(v.hoses, 1)));
  return { hours: r1(gal / (gpm * 60)), days: r1(gal / (gpm * 60 * 24)), waterCost: r2((gal / 1000) * pos(v.pricePer1000, 10)), trucks: ceil(gal / 6000) };
};

// ---------- Costs ----------
export const POOL_FINISHES = ["Plaster (marcite)", "Quartz aggregate", "Pebble (e.g. PebbleTec, Diamond Brite)", "Fiberglass refinish (gelcoat)", "Vinyl liner replacement"];
const FINISH_RATE = [6, 8.5, 12, 8, 4];
export const poolResurfacingCost: CustomCalculator = (v) => {
  const L = pos(v.length, 32), W = pos(v.width, 16), D = pos(v.avgDepth, 5);
  const area = L * W + 2 * (L + W) * D;
  const total = area * FINISH_RATE[pick(v.finish, 5)] + pos(v.tileFeet) * 25 + 350;
  return { totalCost: r2(total), ...spread(total), interiorSqFt: Math.round(area) };
};

export const poolMaintenanceCost: CustomCalculator = (v) => {
  const service = [0, 150, 200][pick(v.service, 3)];
  const monthly = service + pos(v.chemicals, 50) + pos(v.electricity, 60);
  const yearly = monthly * pos(v.months, 12) + pos(v.openClose) * 300 + pos(v.repairs, 500);
  return { monthlyCost: r2(monthly), yearlyCost: r2(yearly) };
};

export const POOL_REMOVALS = ["Above-ground pool removal", "Inground — partial fill-in (break & bury)", "Inground — full removal"];
export const poolRemovalCost: CustomCalculator = (v) => {
  const t = pick(v.type, 3), f = Math.max(0.6, pos(v.area, 512) / 512);
  const fill = t === 0 ? 0 : pos(v.area, 512) * pos(v.depth, 5) / 27 * (t === 1 ? 0.9 : 1) * pos(v.fillPerYard, 30);
  const total = [1500, 6000, 12000][t] * f + fill + pos(v.permit, 400);
  return { totalCost: r2(total), ...spread(total), fillCost: r2(fill) };
};

export const POND_TYPES = ["Backyard liner pond (with pump & filter)", "Farm / stock pond (excavated)"];
export const pondCost: CustomCalculator = (v) => {
  const a = pos(v.area, 200);
  if (pick(v.type, 2) === 0) { const t = a * pos(v.backyardPerSqFt, 20); return { totalCost: r2(t), ...spread(t), cubicYards: r1((a * pos(v.depth, 3)) / 27) }; }
  const yd = (a * pos(v.depth, 8) * 0.6) / 27;
  const total = yd * pos(v.perYard, 3) + pos(v.spillway, 2500) + pos(v.clay);
  return { totalCost: r2(total), ...spread(total), cubicYards: Math.round(yd) };
};

export const hgPoolCustomCalculators: Record<string, CustomCalculator> = {
  "pool-chlorine-calculator": poolChlorine,
  "pool-shock-calculator": poolShock,
  "pool-alkalinity-calculator": poolAlkalinity,
  "pool-ph-calculator": poolPh,
  "pool-calcium-hardness-calculator": poolCalcium,
  "pool-stabilizer-calculator": poolStabilizer,
  "pool-salt-calculator": poolSalt,
  "pond-salt-calculator": pondSalt,
  "lsi-calculator": lsi,
  "pool-chemical-calculator": poolChemical,
  "hot-tub-chemical-calculator": hotTubChemical,
  "water-volume-calculator": waterVolume,
  "pond-volume-calculator": pondVolume,
  "water-tank-capacity-calculator": waterTank,
  "pond-liner-calculator": pondLiner,
  "pool-turnover-calculator": poolTurnover,
  "pool-pump-run-time-calculator": poolPumpRunTime,
  "pool-filter-sand-calculator": poolFilterSand,
  "pool-evaporation-calculator": poolEvaporation,
  "pond-pump-size-calculator": pondPumpSize,
  "pool-heating-cost-calculator": poolHeatingCost,
  "pool-fill-time-calculator": poolFillTime,
  "pool-resurfacing-cost-calculator": poolResurfacingCost,
  "pool-maintenance-cost-calculator": poolMaintenanceCost,
  "pool-removal-cost-calculator": poolRemovalCost,
  "pond-cost-calculator": pondCost,
};
