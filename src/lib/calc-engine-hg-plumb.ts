/**
 * Batch: "House & Garden Calculators" → HVAC, Plumbing & Electrical Calculators (plumbing, water & electrical).
 *
 * Data / methods:
 *  - Conduit fill (NEC Chapter 9): 53% for one wire, 31% for two, 40% for three or more; internal areas
 *    from Table 4 (EMT, PVC Sch 40 / 80, RMC) and THHN/THWN areas from Table 5.
 *  - Box fill (NEC 314.16(B)): 14 AWG 2.0, 12 AWG 2.25, 10 AWG 2.5, 8 AWG 3.0, 6 AWG 5.0 cu in per conductor;
 *    each device yoke = 2, internal clamps = 1 and all grounds together = 1 conductor of the largest size.
 *  - Pipe IDs: Sch 40 steel/PVC, copper type L and PEX (CTS SDR-9). Water gallons = π/4·ID²·length ÷ 231.
 *  - Velocity: ID (in) = √(0.4085 × gpm ÷ fps). Hazen–Williams friction (psi per ft) = 4.52 Q^1.85 ÷ (C^1.85 d^4.87).
 *  - Demand from water supply fixture units: interpolated from IPC Appendix E tank-type curve.
 *  - Fixture units (IPC 604.3 / 709.1, private use): WSFU bathtub 4, shower 2, lavatory 1, tank toilet 2.5,
 *    kitchen sink 1.5, dishwasher 1.5, clothes washer 4, hose bibb 2.5; DFU bathtub 2, shower 2, lavatory 1,
 *    toilet 3, kitchen sink 2, dishwasher 2, washer 2.
 *  - Septic: ~150 gal per day per bedroom; absorption area = flow ÷ soil application rate.
 *  - Conduit offset bends: distance between bends = offset × cosecant (10° 6.0, 22.5° 2.6, 30° 2.0, 45° 1.4,
 *    60° 1.2); shrink per inch of offset 1/16, 3/16, 1/4, 3/8, 1/2 in.
 *  - Leaks: about 15,140 drips per gallon (¼ mL per drip).
 *  - Copper tube weights (lb/ft) from ASTM B88 (types K, L, M); PVC and steel Sch 40 typical weights.
 *  - Costs are typical 2026 US prices (editable inputs), not quotes.
 *
 * Self-contained: no imports from any other batch, per this project's established per-batch convention.
 * See prisma/create-hg-plumb-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

const num = (x: number, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);
const pos = (x: number, d = 0) => Math.max(0, num(x, d));
const pick = (x: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(num(x))));
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;
const ceil = (x: number) => Math.ceil(x - 1e-9);
const spread = (t: number) => ({ costLow: r2(t * 0.85), costHigh: r2(t * 1.25) });
const RAD = Math.PI / 180;
const interp = (x: number, xs: number[], ys: number[]) => {
  if (x <= xs[0]) return ys[0] * (x / xs[0]);
  for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + ((x - xs[i - 1]) * (ys[i] - ys[i - 1])) / (xs[i] - xs[i - 1]);
  const n = xs.length - 1;
  return ys[n] + ((x - xs[n]) * (ys[n] - ys[n - 1])) / (xs[n] - xs[n - 1]);
};
const hwPsiPerFt = (gpm: number, id: number, C = 150) => (4.52 * gpm ** 1.85) / (C ** 1.85 * id ** 4.87);

// ---------- Electrical ----------
export const CONDUIT_TYPES = ["EMT", "PVC Schedule 40", "PVC Schedule 80", "Rigid metal (RMC)"];
export const CONDUIT_SIZES = ["1/2 in", "3/4 in", "1 in", "1-1/4 in", "1-1/2 in", "2 in"];
const CONDUIT_AREA = [[0.304, 0.533, 0.864, 1.496, 2.036, 3.356], [0.285, 0.508, 0.832, 1.453, 1.986, 3.291], [0.217, 0.409, 0.688, 1.237, 1.711, 2.874], [0.314, 0.549, 0.887, 1.526, 2.071, 3.408]];
export const WIRES = ["14 AWG", "12 AWG", "10 AWG", "8 AWG", "6 AWG", "4 AWG", "3 AWG", "2 AWG", "1 AWG", "1/0 AWG"];
const WIRE_AREA = [0.0097, 0.0133, 0.0211, 0.0366, 0.0507, 0.0824, 0.0973, 0.1158, 0.1562, 0.1855];
export const FILL_OK = ["Over the NEC fill limit — use a bigger conduit", "Within the NEC fill limit"];
export const conduitFill: CustomCalculator = (v) => {
  const t = pick(v.type, 4), w = pick(v.wire, WIRE_AREA.length), n = Math.max(1, Math.round(pos(v.count, 3)));
  const limit = n === 1 ? 0.53 : n === 2 ? 0.31 : 0.4;
  const area = CONDUIT_AREA[t][pick(v.size, 6)];
  const fill = (n * WIRE_AREA[w]) / area;
  const smallest = CONDUIT_AREA[t].findIndex((a) => (n * WIRE_AREA[w]) / a <= limit);
  return { fillPercent: r1(fill * 100), ok: fill <= limit ? 1 : 0, maxWires: Math.floor((area * 0.4) / WIRE_AREA[w]), smallestSize: smallest < 0 ? 5 : smallest };
};

const BOX_VOL = [2, 2.25, 2.5, 3, 5];
export const boxFill: CustomCalculator = (v) => {
  const counts = [v.c14, v.c12, v.c10, v.c8, v.c6].map((x) => Math.round(pos(x)));
  const largest = counts.reduce((m, c, i) => (c > 0 ? i : m), 0);
  let need = counts.reduce((s, c, i) => s + c * BOX_VOL[i], 0);
  need += Math.round(pos(v.devices)) * 2 * BOX_VOL[largest] + (pick(v.clamps, 2) ? BOX_VOL[largest] : 0) + (pick(v.grounds, 2) ? BOX_VOL[largest] : 0);
  return { requiredCuIn: r2(need), ok: pos(v.boxVolume, 18) >= need ? 1 : 0, spareCuIn: r2(pos(v.boxVolume, 18) - need) };
};
export const BOX_OK = ["Too full — use a bigger box or an extension ring", "Within the NEC box-fill limit"];

const BREAKERS = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100];
export const WIRE_FOR_BREAKER = ["14 AWG copper", "12 AWG copper", "10 AWG copper", "8 AWG copper", "6 AWG copper", "4 AWG copper", "3 AWG copper"];
export const breakerSize: CustomCalculator = (v) => {
  const amps = pos(v.amps) > 0 ? pos(v.amps) : pos(v.watts, 3600) / Math.max(1, [120, 240, 208][pick(v.voltage, 3)]);
  const design = amps * (pick(v.continuous, 2) ? 1.25 : 1);
  const b = BREAKERS.find((x) => x >= design) ?? 100;
  const wire = b <= 15 ? 0 : b <= 20 ? 1 : b <= 30 ? 2 : b <= 40 ? 3 : b <= 55 ? 4 : b <= 70 ? 5 : 6;
  return { breakerAmps: b, loadAmps: r1(amps), designAmps: r1(design), wire };
};

export const pipeBend: CustomCalculator = (v) => {
  const a = pick(v.angle, 5), off = pos(v.offset, 6);
  const mult = [6, 2.6, 2, 1.4, 1.2][a], shrink = [1 / 16, 3 / 16, 1 / 4, 3 / 8, 1 / 2][a];
  return { distanceBetweenBendsIn: r2(off * mult), shrinkIn: r2(off * shrink), takeUp90In: [5, 6, 8, 11][pick(v.size, 4)], multiplier: mult };
};
export const BEND_ANGLES = ["10°", "22.5°", "30°", "45°", "60°"];

export const ROOM_FC = ["Living room / bedroom (15 fc)", "Kitchen (40 fc)", "Bathroom (30 fc)", "Home office (50 fc)", "Garage / workshop (60 fc)", "Warehouse aisles (25 fc)", "Hallway / stairs (10 fc)"];
const FC = [15, 40, 30, 50, 60, 25, 10];
export const lightingLayout: CustomCalculator = (v) => {
  const L = pos(v.length, 14), W = pos(v.width, 12), a = L * W;
  const fc = pos(v.customFc) || FC[pick(v.room, FC.length)];
  const lumens = (fc * a) / 0.6;
  const n = Math.max(1, ceil(lumens / Math.max(100, pos(v.fixtureLumens, 800))));
  const cols = Math.max(1, Math.round(Math.sqrt((n * L) / Math.max(1, W))));
  const rows = ceil(n / cols);
  return { fixtures: rows * cols, lumensNeeded: Math.round(lumens), rows, columns: cols, spacingFt: r1(L / cols), fromWallFt: r1(L / cols / 2), targetFc: fc };
};

export const footCandle: CustomCalculator = (v) => {
  const a = Math.max(1, pos(v.area, 200)), k = pos(v.factor, 0.6);
  const fc = (pos(v.lumens, 8000) * k) / a;
  return { footCandles: r1(fc), lux: Math.round(fc * 10.764), lumensForTarget: Math.round((pos(v.targetFc, 50) * a) / Math.max(0.1, k)) };
};

export const PANEL_JOBS = ["Replace panel (same amperage)", "Upgrade 100 A → 200 A panel", "Full service upgrade to 200 A (meter, mast, panel)", "Upgrade to 400 A service", "Add a subpanel"];
const PANEL_RATE = [1800, 2800, 4500, 7000, 1500];
export const panelUpgradeCost: CustomCalculator = (v) => {
  const total = PANEL_RATE[pick(v.job, 5)] + pos(v.circuits) * 300 + pos(v.permit, 300) + pos(v.utilityFee);
  return { totalCost: r2(total), ...spread(total) };
};

export const rewireCost: CustomCalculator = (v) => {
  const total = pos(v.area, 1800) * pos(v.ratePerSqFt, 4) * (pick(v.plaster, 2) ? 1.3 : 1) * [1, 1.1, 1.2][pick(v.stories, 3)] + (pick(v.panel, 2) ? 2800 : 0) + pos(v.permit, 500);
  return { totalCost: r2(total), ...spread(total) };
};

// ---------- Water heating & appliances ----------
export const WH_TYPES = ["Gas tank (40–50 gal)", "Electric tank (40–50 gal)", "Gas tankless", "Electric tankless", "Heat pump water heater"];
const WH_UNIT = [800, 650, 1700, 900, 1900], WH_LABOR = [1000, 800, 1800, 1100, 1300];
export const waterHeaterInstallCost: CustomCalculator = (v) => {
  const t = pick(v.type, 5);
  const labor = WH_LABOR[t] + (pick(v.conversion, 2) ? 1500 : 0) + (pick(v.expansionTank, 2) ? 250 : 0);
  const total = WH_UNIT[t] + labor + pos(v.permit, 100) + 100;
  return { totalCost: r2(total), unitCost: WH_UNIT[t], laborCost: r2(labor), ...spread(total) };
};

const WH_LIFE = [10, 12, 20, 13];
export const WH_STATUS = ["Plenty of life left", "Plan ahead — getting older", "Near or past typical lifespan — budget for replacement"];
export const waterHeaterLifespan: CustomCalculator = (v) => {
  const life = WH_LIFE[pick(v.type, 4)] * [1.1, 1, 0.8][pick(v.hardness, 3)] * (pick(v.maintained, 2) ? 1.1 : 1);
  const age = pos(v.age, 8), left = life - age;
  return { expectedLifeYears: r1(life), yearsLeft: r1(Math.max(0, left)), status: left > 4 ? 0 : left > 1 ? 1 : 2, replaceByYear: Math.round(pos(v.currentYear, 2026) + Math.max(0, left)) };
};
export const WH_LIFE_TYPES = ["Gas tank", "Electric tank", "Tankless", "Heat pump (hybrid)"];

export const dryerEnergyCost: CustomCalculator = (v) => {
  const t = pick(v.type, 3), loads = pos(v.loadsPerWeek, 5) * 52;
  const perLoad = t === 0 ? 3.3 * pos(v.kwhPrice, 0.17) : t === 1 ? 0.2 * pos(v.gasPrice, 1.4) + 0.3 * pos(v.kwhPrice, 0.17) : 1.2 * pos(v.kwhPrice, 0.17);
  return { costPerLoad: r2(perLoad), costPerMonth: r2((perLoad * loads) / 12), costPerYear: r2(perLoad * loads) };
};
export const DRYERS = ["Electric dryer", "Gas dryer", "Heat pump dryer"];

export const hotTubElectricity: CustomCalculator = (v) => {
  const kwh = [150, 250, 400][pick(v.climate, 3)] * [0.8, 1, 1.3][pick(v.size, 3)] * [1.3, 1, 0.8][pick(v.insulation, 3)] * (1 + pos(v.hoursPerWeek, 4) / 40);
  return { kwhPerMonth: Math.round(kwh), costPerMonth: r2(kwh * pos(v.kwhPrice, 0.17)), costPerYear: r2(kwh * 12 * pos(v.kwhPrice, 0.17)) };
};

// ---------- Water & leaks ----------
export const waterLeak: CustomCalculator = (v) => {
  const dripGalDay = (pos(v.dripsPerMinute, 30) * 1440) / 15140;
  const toiletGalDay = pos(v.runningToiletGpm) * 1440;
  const day = dripGalDay + toiletGalDay;
  return { gallonsPerDay: r1(day), gallonsPerYear: Math.round(day * 365), costPerYear: r2(((day * 365) / 1000) * pos(v.pricePer1000, 10)) };
};

const IDS: number[][] = [
  [0.622, 0.824, 1.049, 1.38, 1.61, 2.067, 3.068, 4.026, 6.065], // Sch 40 steel / PVC
  [0.545, 0.785, 1.025, 1.265, 1.505, 1.985, 2.945, 3.905, 5.845], // copper type L
  [0.475, 0.671, 0.862, 1.054, 1.244, 1.629, 1.629, 1.629, 1.629], // PEX
];
export const PIPE_SIZES = ["1/2 in", "3/4 in", "1 in", "1-1/4 in", "1-1/2 in", "2 in", "3 in", "4 in", "6 in"];
export const PIPE_MATS = ["Steel / PVC Schedule 40", "Copper type L", "PEX (CTS)"];
export const pipeVolume: CustomCalculator = (v) => {
  const id = IDS[pick(v.material, 3)][pick(v.size, 9)];
  const perFt = ((Math.PI / 4) * id * id * 12) / 231;
  return { gallons: r2(perFt * pos(v.length, 100)), gallonsPerFoot: Math.round(perFt * 10000) / 10000, waterWeightLb: r1(perFt * pos(v.length, 100) * 8.34), liters: r1(perFt * pos(v.length, 100) * 3.785) };
};

const DRAIN_DFU = [[1.5, 3], [2, 6], [2.5, 12], [3, 20], [4, 160], [6, 620]];
export const pipeSize: CustomCalculator = (v) => {
  const gpm = pos(v.btu) > 0 ? pos(v.btu) / (500 * Math.max(5, pos(v.deltaT, 20))) : pos(v.gpm, 10);
  const vel = [5, 4, 8][pick(v.service, 3)];
  const id = Math.sqrt((0.4085 * gpm) / vel);
  const nominal = IDS[0].findIndex((d) => d >= id);
  const dfu = pos(v.dfu);
  const drain = dfu > 0 ? (DRAIN_DFU.find(([, max]) => max >= dfu) ?? DRAIN_DFU[DRAIN_DFU.length - 1])[0] : 0;
  return { requiredIdIn: Math.round(id * 1000) / 1000, nominalSize: nominal < 0 ? 8 : nominal, flowGpm: r1(gpm), drainSizeIn: drain };
};

const WSFU_X = [1, 6, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100];
const WSFU_Y = [3, 5, 8, 11.5, 14, 17, 20, 25, 29, 32, 38, 43];
export const SERVICE_SIZES = ["3/4 in", "1 in", "1-1/4 in", "1-1/2 in", "2 in"];
const SERVICE_ID = [0.785, 1.025, 1.265, 1.505, 1.985];
export const waterServiceLine: CustomCalculator = (v) => {
  const wsfu = pos(v.bathrooms, 2) * 6 + pos(v.kitchens, 1) * 3 + pos(v.laundry, 1) * 4 + pos(v.hoseBibbs, 2) * 2.5;
  const gpm = interp(wsfu, WSFU_X, WSFU_Y);
  const avail = pos(v.streetPressure, 60) - 20 - pos(v.elevation, 10) * 0.433 - 5; // 5 psi meter / fittings
  const len = pos(v.length, 80) * 1.3;
  let pick2 = SERVICE_ID.length - 1;
  for (let i = 0; i < SERVICE_ID.length; i++) {
    const loss = hwPsiPerFt(gpm, SERVICE_ID[i]) * len;
    const velocity = (0.4085 * gpm) / SERVICE_ID[i] ** 2;
    if (loss <= avail && velocity <= 8) { pick2 = i; break; }
  }
  return { serviceSize: pick2, demandGpm: r1(gpm), wsfu: r1(wsfu), frictionPsi: r1(hwPsiPerFt(gpm, SERVICE_ID[pick2]) * len), availablePsi: r1(avail) };
};

const FIX_WSFU = [4, 2, 1, 2.5, 1.5, 1.5, 4, 2.5], FIX_DFU = [2, 2, 1, 3, 2, 2, 2, 0];
export const fixtureUnits: CustomCalculator = (v) => {
  const counts = [v.tubs, v.showers, v.lavs, v.toilets, v.kitchenSinks, v.dishwashers, v.washers, v.hoseBibbs].map((x) => pos(x));
  const wsfu = counts.reduce((s, c, i) => s + c * FIX_WSFU[i], 0);
  const dfu = counts.reduce((s, c, i) => s + c * FIX_DFU[i], 0);
  return { wsfu: r1(wsfu), dfu: r1(dfu), demandGpm: r1(interp(wsfu, WSFU_X, WSFU_Y)), buildingDrainIn: dfu <= 42 ? 3 : dfu <= 216 ? 4 : 6 };
};

export const pumpHead: CustomCalculator = (v) => {
  const gpm = pos(v.gpm, 20), id = IDS[0][pick(v.pipe, 9)];
  const totalLen = pos(v.pipeLength, 100) + pos(v.fittingsFt, 20);
  const frictionFt = hwPsiPerFt(gpm, id) * totalLen * 2.31;
  const tdh = pos(v.suctionLift) + pos(v.dischargeHeight, 20) + frictionFt + pos(v.outletPsi, 20) * 2.31;
  const suctionFriction = hwPsiPerFt(gpm, id) * pos(v.suctionLength, 10) * 2.31;
  const npsha = 33.9 - pos(v.elevation) * 0.0012 - pos(v.suctionLift) - suctionFriction - 0.6;
  const whp = (gpm * tdh) / 3960;
  return { tdhFt: r1(tdh), tdhPsi: r1(tdh / 2.31), frictionFt: r1(frictionFt), npshaFt: r1(npsha), motorHp: r2(whp / 0.6) };
};

// ---------- Plumbing & gas costs ----------
export const repipeCost: CustomCalculator = (v) => {
  const base = pos(v.bathrooms, 2) * 2000 + 2000;
  const total = base * [1, 1.1, 1.8][pick(v.material, 3)] * [1, 1.1, 1.2][pick(v.stories, 3)] + (pick(v.drywall, 2) ? 1500 : 0);
  return { totalCost: r2(total), ...spread(total) };
};
export const REPIPE_MATS = ["PEX", "CPVC", "Copper"];

export const PLUMBING_JOBS = ["Fixture repair", "Leak repair", "Drain clog", "Toilet install", "Faucet install", "Garbage disposal install", "Water heater flush", "Rough-in (per fixture, new construction)", "Sewer line repair"];
const PLUMB_RATE = [250, 350, 225, 400, 300, 450, 150, 1500, 3000];
export const plumbingCost: CustomCalculator = (v) => {
  const total = (pos(v.quantity, 1) * PLUMB_RATE[pick(v.job, PLUMB_RATE.length)] + pos(v.tripFee, 100)) * (pick(v.afterHours, 2) ? 1.5 : 1);
  return { totalCost: r2(total), ...spread(total) };
};

export const SLAB_METHODS = ["Direct access (break the slab)", "Reroute the line", "Epoxy pipe lining", "Whole-house repipe"];
export const slabLeakCost: CustomCalculator = (v) => {
  const total = [2000, 2500, 3000, 6000][pick(v.method, 4)] + pos(v.detection, 350) + pos(v.flooring, 800);
  return { totalCost: r2(total), ...spread(total) };
};

export const gasLineCost: CustomCalculator = (v) => {
  const total = pos(v.length, 30) * [20, 15][pick(v.material, 2)] + pos(v.appliances, 1) * 200 + pos(v.outdoorFeet) * 10 + pos(v.permit, 150);
  return { totalCost: r2(Math.max(250, total)), ...spread(total) };
};

export const waterLineCost: CustomCalculator = (v) => {
  const L = pos(v.length, 100);
  const total = L * (pos(v.trenchPerFoot, 10) + [2, 2.5, 10][pick(v.material, 3)]) + pos(v.connectionFee, 500);
  return { totalCost: r2(total), ...spread(total), perFoot: L ? r2(total / L) : 0 };
};

export const SEPTIC_TYPES = ["Conventional gravity", "Chamber system", "Mound system", "Aerobic treatment unit (ATU)", "Drip distribution"];
export const septicSystemCost: CustomCalculator = (v) => {
  const total = [7000, 8500, 18000, 15000, 20000][pick(v.system, 5)] * Math.max(1, pos(v.bedrooms, 3) / 3) + pos(v.design, 1500) + pos(v.permit, 800);
  return { totalCost: r2(total), ...spread(total) };
};

export const drainFieldSize: CustomCalculator = (v) => {
  const beds = Math.max(1, Math.round(pos(v.bedrooms, 3)));
  const flow = beds * 150;
  const area = flow / [1.2, 0.8, 0.4][pick(v.soil, 3)];
  return { dailyFlowGal: flow, absorptionSqFt: Math.round(area), trenchFeet: Math.ceil(area / 3), tankGallons: beds <= 3 ? 1000 : 1000 + (beds - 3) * 250 };
};

const TRAP_SIZES = [10, 15, 20, 25, 35, 50, 75, 100];
export const greaseTrapSize: CustomCalculator = (v) => {
  const vol = (pos(v.compartments, 3) * pos(v.length, 18) * pos(v.width, 18) * pos(v.depth, 12)) / 231;
  const gpm = (vol * 0.75) / [1, 2][pick(v.drainMinutes, 2)];
  const size = TRAP_SIZES.find((s) => s >= gpm) ?? 100;
  return { flowGpm: r1(gpm), trapGpm: size, greaseCapacityLb: size * 2, sinkGallons: r1(vol) };
};

// ---------- Small tools ----------
export const pipeOffset: CustomCalculator = (v) => {
  const ang = [45, 22.5, 60, 11.25][pick(v.fitting, 4)] * RAD;
  const off = pos(v.roll) > 0 ? Math.sqrt(pos(v.rise, 12) ** 2 + pos(v.roll) ** 2) : pos(v.rise, 12);
  return { travelIn: r2(off / Math.sin(ang)), runIn: r2(off / Math.tan(ang)), trueOffsetIn: r2(off), constant: r2(1 / Math.sin(ang)) };
};
export const FITTINGS = ["45° fittings", "22½° fittings", "60° fittings", "11¼° fittings"];

export const heatTape: CustomCalculator = (v) => {
  const m = pick(v.mode, 3);
  const len = m === 0 ? pos(v.length, 20) * 1.1 : m === 1 ? pos(v.length, 20) * (1 + Math.max(0, pos(v.pipeDiameter, 2) - 1) * 0.5) : pos(v.length, 40) * 2.5 + pos(v.downspoutFeet, 20) * 2;
  const watts = len * pos(v.wattsPerFoot, 5);
  return { cableFeet: Math.ceil(len), watts: Math.round(watts), amps120: r1(watts / 120), circuits20A: ceil(watts / 1920), monthlyCost: r2((watts / 1000) * pos(v.hoursPerDay, 8) * 30 * pos(v.kwhPrice, 0.17)) };
};
export const HEAT_TAPE_MODES = ["Pipe — straight run", "Pipe — spiral wrap (larger pipe)", "Roof edge & gutters (zig-zag)"];

export const TAPS = ["#6-32 UNC", "#8-32 UNC", "#10-24 UNC", "#10-32 UNF", "1/4-20 UNC", "1/4-28 UNF", "5/16-18 UNC", "5/16-24 UNF", "3/8-16 UNC", "3/8-24 UNF", "7/16-14 UNC", "1/2-13 UNC", "1/2-20 UNF", "5/8-11 UNC", "3/4-10 UNC", "M6 × 1.0", "M8 × 1.25", "M10 × 1.5", "M12 × 1.75", "1/8 NPT", "1/4 NPT", "3/8 NPT", "1/2 NPT", "3/4 NPT", "1 NPT"];
export const TAP_DRILLS = ["#36", "#29", "#25", "#21", "#7", "#3", "F", "I", "5/16 in", "Q", "U", "27/64 in", "29/64 in", "17/32 in", "21/32 in", "5.0 mm", "6.8 mm", "8.5 mm", "10.2 mm", "11/32 in", "7/16 in", "37/64 in", "23/32 in", "59/64 in", "1-5/32 in"];
const TAP_IN = [0.1065, 0.136, 0.1495, 0.159, 0.201, 0.213, 0.257, 0.272, 0.3125, 0.332, 0.368, 0.4219, 0.4531, 0.5312, 0.6562, 0.1969, 0.2677, 0.3346, 0.4016, 0.3438, 0.4375, 0.5781, 0.7188, 0.9219, 1.1562];
export const tapDrill: CustomCalculator = (v) => {
  const t = pick(v.thread, TAPS.length);
  return { drill: t, decimalIn: TAP_IN[t], millimeters: r2(TAP_IN[t] * 25.4) };
};

export const rangeHoodHeight: CustomCalculator = (v) => {
  const gas = pick(v.cooktop, 2) === 1, island = pick(v.hood, 2) === 1;
  const min = gas ? 30 : 24, max = gas ? 36 : 30;
  return { minHeightIn: min, maxHeightIn: max, recommendedIn: island ? max : Math.round((min + max) / 2), hoodWidthIn: pos(v.cooktopWidth, 30) + (island ? 6 : 0) };
};

export const PIPE_WEIGHT_MATS = ["Copper type K", "Copper type L", "Copper type M", "PVC Schedule 40", "Steel Schedule 40"];
const PIPE_LB = [
  [0.344, 0.641, 0.839, 1.04, 1.36, 2.06, 4.0, 6.51],
  [0.285, 0.455, 0.655, 0.884, 1.14, 1.75, 3.33, 5.38],
  [0.204, 0.328, 0.465, 0.682, 0.94, 1.46, 2.68, 4.66],
  [0.16, 0.21, 0.32, 0.43, 0.51, 0.68, 1.43, 2.01],
  [0.85, 1.13, 1.68, 2.27, 2.72, 3.65, 7.58, 10.79],
];
export const pipeWeight: CustomCalculator = (v) => {
  const lbFt = PIPE_LB[pick(v.material, 5)][pick(v.size, 8)];
  const lb = lbFt * pos(v.length, 100);
  return { weightLb: r1(lb), weightKg: r1(lb * 0.4536), lbPerFoot: lbFt, scrapValue: r2(pick(v.material, 5) <= 2 ? lb * pos(v.scrapPrice, 3.5) : 0) };
};

export const hgPlumbCustomCalculators: Record<string, CustomCalculator> = {
  "conduit-fill-calculator": conduitFill,
  "box-fill-calculator": boxFill,
  "breaker-size-calculator": breakerSize,
  "pipe-bend-calculator": pipeBend,
  "lighting-layout-calculator": lightingLayout,
  "foot-candle-calculator": footCandle,
  "panel-upgrade-cost-calculator": panelUpgradeCost,
  "rewire-cost-calculator": rewireCost,
  "water-heater-installation-cost-calculator": waterHeaterInstallCost,
  "water-heater-lifespan-calculator": waterHeaterLifespan,
  "dryer-energy-cost-calculator": dryerEnergyCost,
  "hot-tub-electricity-cost-calculator": hotTubElectricity,
  "water-leak-calculator": waterLeak,
  "pipe-volume-calculator": pipeVolume,
  "pipe-size-calculator": pipeSize,
  "water-service-line-size-calculator": waterServiceLine,
  "plumbing-fixture-units-calculator": fixtureUnits,
  "pump-head-calculator": pumpHead,
  "repipe-cost-calculator": repipeCost,
  "plumbing-cost-calculator": plumbingCost,
  "slab-leak-repair-cost-calculator": slabLeakCost,
  "gas-line-cost-calculator": gasLineCost,
  "water-line-cost-calculator": waterLineCost,
  "septic-system-cost-calculator": septicSystemCost,
  "drain-field-size-calculator": drainFieldSize,
  "grease-trap-size-calculator": greaseTrapSize,
  "pipe-offset-calculator": pipeOffset,
  "heat-tape-calculator": heatTape,
  "tap-drill-size-calculator": tapDrill,
  "range-hood-height-calculator": rangeHoodHeight,
  "copper-pipe-weight-calculator": pipeWeight,
};
