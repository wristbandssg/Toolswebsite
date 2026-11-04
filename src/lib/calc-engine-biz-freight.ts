/**
 * Batch: "Business & Industrial Calculators" → Freight, Logistics & Warehouse Calculators.
 *
 * Data / methods:
 *  - Truck transit: FMCSA hours of service (11 h driving / 14 h window) → ~500 mi per day
 *    solo, ~1,000 mi per day team; LTL ~1 day per 400 mi plus terminal handling.
 *  - Emission factors (kg CO2e per tonne-km, well-to-wheel, GLEC Framework v3 typical
 *    defaults): heavy truck FTL 0.075, LTL 0.11, van / parcel 0.45, rail 0.022,
 *    container ship 0.012, inland barge 0.031, air freight 0.60.
 *  - Ocean: 1 TEU = one 20 ft container, 40 ft = 2 TEU, 45 ft = 2.25 TEU; internal volumes
 *    20 ft 33.2 m³, 40 ft 67.7 m³, 40 HC 76.3 m³, 45 HC 86 m³. LCL charged per revenue ton
 *    (W/M = greater of cubic meters and metric tonnes, min 1).
 *  - Forklift capacity at a longer load center by moment balance:
 *    capacity × (rated LC + A) ÷ (actual LC + A), A = front axle to fork face.
 *  - Lumen method for lighting: fixtures = E × A ÷ (lumens × CU × LLF).
 *  - Conveyor bulk capacity (CEMA-style): area ≈ k × (0.9B − 2)² in², with k by trough angle.
 *  - Cost tables are 2025–2026 US national mid-range prices (Canadian moving in CAD).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-biz-freight-calculators.ts for the copy.
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
const dow = (n: number) => (((n + 4) % 7) + 7) % 7;
function addBusinessDays(start: number, days: number) {
  let n = start;
  let left = Math.max(0, Math.round(days));
  while (left > 0) { n++; const w = dow(n); if (w !== 0 && w !== 6) left--; }
  return n;
}

// --- Transport ---------------------------------------------------------------------------------------------
/** Ocean / air international lanes: [label, ocean days, air days]. */
export const LANES: [string, number, number][] = [["China → US West Coast", 16, 4], ["China → US East Coast", 32, 5], ["Europe → US East Coast", 12, 4], ["Asia → Northern Europe", 35, 4], ["India → US East Coast", 30, 5], ["US → South America", 20, 5], ["Asia → Australia", 18, 4]];
export const freightTransit: CustomCalculator = (v) => {
  const mode = pick(v.mode, 7);
  const miles = nonNeg(v.miles);
  let days: number;
  if (mode === 0) days = Math.max(1, ceil(miles / 400)) + 1; // LTL
  else if (mode === 1) days = Math.max(1, ceil(miles / 500)); // FTL solo
  else if (mode === 2) days = Math.max(1, ceil(miles / 1000)); // FTL team
  else if (mode === 3) days = Math.max(2, ceil(miles / 400) + 2); // rail intermodal
  else if (mode === 4) days = miles <= 500 ? 1 : miles <= 1500 ? 2 : 3; // domestic air
  else if (mode === 5) days = LANES[pick(v.lane, LANES.length)][1]; // ocean port-to-port
  else days = LANES[pick(v.lane, LANES.length)][2]; // international air
  const extra = nonNeg(v.pickupDays) + nonNeg(v.customsDays) + nonNeg(v.finalMileDays);
  const total = days + extra;
  const start = safeNumber(v.shipDate, today());
  const calendarMode = mode === 1 || mode === 2 || mode === 5;
  const arrive = calendarMode ? start + total : addBusinessDays(start, total);
  return { transitDays: days, totalDays: round2(total), estimatedArrival: arrive, drivingHours: mode <= 2 ? round2(miles / 50) : 0 };
};

export const EQUIPMENT_RPM = [2.1, 2.45, 2.6, 2.35]; // dry van, reefer, flatbed, step deck — 2026 all-in spot averages
export const truckload: CustomCalculator = (v) => {
  const miles = nonNeg(v.miles);
  const rpm = nonNeg(v.ratePerMile) > 0 ? nonNeg(v.ratePerMile) : EQUIPMENT_RPM[pick(v.equipment, EQUIPMENT_RPM.length)];
  const linehaul = miles * rpm;
  const fsc = yes(v.addFuelSurcharge) ? miles * Math.max(0, (nonNeg(v.dieselPrice) - 1.25) / 6) : 0;
  const access = nonNeg(v.stops) * nonNeg(v.stopFee) + nonNeg(v.detentionHours) * nonNeg(v.detentionRate) + nonNeg(v.otherAccessorials);
  const quote = Math.max(nonNeg(v.minimum), linehaul + fsc + access);
  const totalMiles = miles + nonNeg(v.deadheadMiles);
  const cost = totalMiles * (nonNeg(v.dieselPrice) / Math.max(1, nonNeg(v.mpg, 6.5)) + nonNeg(v.driverPayPerMile) + nonNeg(v.otherCostPerMile));
  return { totalQuote: round2(quote), linehaul: round2(linehaul), fuelSurcharge: round2(fsc), accessorials: round2(access), allInRatePerMile: round2(miles ? quote / miles : 0), carrierCost: round2(cost), carrierProfit: round2(quote - cost), marginPercent: round2(quote ? ((quote - cost) / quote) * 100 : 0) };
};

export const forwarding: CustomCalculator = (v) => {
  const mode = pick(v.mode, 3);
  const kg = nonNeg(v.weightKg);
  const cbm = nonNeg(v.cbm);
  let freight = 0;
  let chargeable = 0;
  if (mode === 0) { chargeable = Math.max(kg, cbm * 167); freight = chargeable * nonNeg(v.airRatePerKg); }
  else if (mode === 1) { chargeable = Math.max(1, cbm, kg / 1000); freight = chargeable * nonNeg(v.lclRatePerWm); }
  else { chargeable = Math.max(1, Math.round(nonNeg(v.containers, 1))); freight = chargeable * nonNeg(v.fclRatePerContainer); }
  const local = nonNeg(v.originCharges) + nonNeg(v.destinationCharges) + nonNeg(v.customsClearance) + nonNeg(v.documentation);
  const insurance = nonNeg(v.cargoValue) * (nonNeg(v.insuranceRate) / 100);
  const sub = freight + local + insurance;
  const margin = sub * (nonNeg(v.forwarderMargin) / 100);
  const total = sub + margin;
  return { totalCost: round2(total), freightCharge: round2(freight), localCharges: round2(local), cargoInsurance: round2(insurance), forwarderMargin: round2(margin), chargeableQuantity: round2(chargeable), costPerKg: round2(kg ? total / kg : 0), costAsPercentOfCargo: round2(nonNeg(v.cargoValue) ? (total / nonNeg(v.cargoValue)) * 100 : 0) };
};

export const EMISSION_FACTORS: [string, number][] = [["Heavy truck (FTL)", 0.075], ["Truck LTL / partial", 0.11], ["Van / parcel delivery", 0.45], ["Rail freight", 0.022], ["Container ship (ocean)", 0.012], ["Inland barge", 0.031], ["Air freight", 0.6]];
export const freightEmissions: CustomCalculator = (v) => {
  const tonnes = pick(v.weightUnit, 3) === 0 ? nonNeg(v.weight) / 2204.62 : pick(v.weightUnit, 3) === 1 ? nonNeg(v.weight) / 1000 : nonNeg(v.weight);
  const km = pick(v.distanceUnit, 2) === 0 ? nonNeg(v.distance) * 1.609344 : nonNeg(v.distance);
  const tkm = tonnes * km;
  const kg = tkm * EMISSION_FACTORS[pick(v.mode, EMISSION_FACTORS.length)][1] * Math.max(1, nonNeg(v.shipments, 1));
  return { kgCo2e: round2(kg), tonnesCo2e: round2(kg / 1000), tonneKm: round2(tkm * Math.max(1, nonNeg(v.shipments, 1))), carbonCost: round2((kg / 1000) * nonNeg(v.carbonPrice)), treeYearsToOffset: round2(kg / 22), vsTruckPercent: round2((EMISSION_FACTORS[pick(v.mode, EMISSION_FACTORS.length)][1] / 0.075) * 100) };
};

export const drayage: CustomCalculator = (v) => {
  const rt = nonNeg(v.miles) * 2;
  const base = Math.max(nonNeg(v.minimum), rt * nonNeg(v.ratePerMile));
  const fsc = base * (nonNeg(v.fuelSurcharge) / 100);
  const chassis = nonNeg(v.chassisDays) * nonNeg(v.chassisRate);
  const wait = Math.max(0, nonNeg(v.waitHours) - nonNeg(v.freeHours, 2)) * nonNeg(v.waitRate);
  const extras = (yes(v.prePull) ? nonNeg(v.prePullFee) : 0) + nonNeg(v.yardDays) * nonNeg(v.yardRate) + (yes(v.overweight) ? 150 : 0) + (yes(v.hazmat) ? 175 : 0) + nonNeg(v.terminalFees);
  const total = base + fsc + chassis + wait + extras;
  return { totalCost: round2(total), baseLinehaul: round2(base), fuelSurcharge: round2(fsc), chassisCharges: round2(chassis), waitingTime: round2(wait), otherCharges: round2(extras), costPerRoundTripMile: round2(rt ? total / rt : 0) };
};

export const hotShot: CustomCalculator = (v) => {
  const loaded = nonNeg(v.loadedMiles);
  const quote = Math.max(nonNeg(v.minimum), loaded * nonNeg(v.ratePerMile)) + nonNeg(v.accessorials);
  const total = loaded + nonNeg(v.deadheadMiles);
  const fuel = (total / Math.max(1, nonNeg(v.mpg, 10))) * nonNeg(v.dieselPrice);
  const other = total * nonNeg(v.otherCostPerMile);
  const fixed = nonNeg(v.fixedCostPerDay) * Math.max(1, ceil(total / 550));
  const cost = fuel + other + fixed;
  return { quote: round2(quote), fuelCost: round2(fuel), totalCost: round2(cost), profit: round2(quote - cost), profitPerLoadedMile: round2(loaded ? (quote - cost) / loaded : 0), revenuePerTotalMile: round2(total ? quote / total : 0), daysOnRoad: Math.max(1, ceil(total / 550)) };
};

export const caseCube: CustomCalculator = (v) => {
  const L = nonNeg(v.length);
  const W = nonNeg(v.width);
  const H = nonNeg(v.height);
  const cube = (L * W * H) / 1728;
  const cases = Math.round(nonNeg(v.cases));
  const PL = nonNeg(v.palletLength, 48);
  const PW = nonNeg(v.palletWidth, 40);
  const perLayer = L > 0 && W > 0 ? Math.max(Math.floor(PL / L) * Math.floor(PW / W), Math.floor(PL / W) * Math.floor(PW / L)) : 0;
  const layers = H > 0 ? Math.floor(Math.max(0, nonNeg(v.maxHeight, 60) - 5.5) / H) : 0;
  const perPallet = perLayer * layers;
  return { cubePerCaseCuFt: round2(cube), totalCubicFeet: round2(cube * cases), totalCubicMeters: round2(cube * cases * 0.0283168), casesPerLayer: perLayer, layersPerPallet: layers, casesPerPallet: perPallet, palletsNeeded: perPallet > 0 ? ceil(cases / perPallet) : 0 };
};

export const cwt: CustomCalculator = (v) => {
  const lb = nonNeg(v.weight);
  const cwtUnits = lb / 100;
  const charge = cwtUnits * nonNeg(v.ratePerCwt);
  const breakLb = nonNeg(v.nextBreak);
  const breakCharge = breakLb > lb ? (breakLb / 100) * nonNeg(v.nextBreakRate) : Infinity;
  const best = Math.max(nonNeg(v.minimum), Math.min(charge, breakCharge));
  return { freightCharge: round2(best), hundredweights: round2(cwtUnits), chargeAtActualWeight: round2(charge), chargeAtNextBreak: round2(Number.isFinite(breakCharge) ? breakCharge : 0), usesWeightBreak: breakCharge < charge ? 1 : 0, effectiveRatePerLb: round2(lb ? best / lb : 0), shortTons: round2(lb / 2000) };
};

// --- Moving & junk -----------------------------------------------------------------------------------------
export const JUNK_LOADS: [string, number, number][] = [["Minimum (single item)", 125, 1], ["1/8 truck", 175, 2], ["1/4 truck", 275, 4], ["1/2 truck", 425, 7.5], ["3/4 truck", 575, 11], ["Full truck (~15 yd³)", 700, 15], ["1.5 trucks", 1050, 22.5], ["2 trucks", 1400, 30]];
export const junkRemoval: CustomCalculator = (v) => {
  const [, price, yd] = JUNK_LOADS[pick(v.load, JUNK_LOADS.length)];
  const base = price * (1 + safeNumber(v.regionAdjust) / 100);
  const items = nonNeg(v.appliances) * 50 + nonNeg(v.mattresses) * 40 + nonNeg(v.tvs) * 35 + nonNeg(v.tires) * 15;
  const access = yes(v.stairs) ? 50 : 0;
  const total = base + items + access;
  return { totalCost: round2(total), loadPrice: round2(base), itemSurcharges: round2(items), accessFee: access, cubicYards: yd, lowEstimate: round2(total * 0.8), highEstimate: round2(total * 1.25) };
};

export const MOBILE_HOME: [string, number, number, number][] = [["Single-wide", 1, 7, 2500], ["Double-wide", 2, 7, 5000], ["Triple-wide", 3, 7, 7500]];
export const mobileHomeMove: CustomCalculator = (v) => {
  const [, sections, perMile, setup] = MOBILE_HOME[pick(v.size, MOBILE_HOME.length)];
  const miles = nonNeg(v.miles);
  const transport = sections * Math.max(1500, miles * perMile * (1 + safeNumber(v.regionAdjust) / 100));
  const permits = 250 * sections + (miles > 100 ? miles * 1 : 0);
  const service = pick(v.service, 2) === 0 ? setup : 0;
  const total = transport + permits + service + (yes(v.utilities) ? 1000 : 0) + nonNeg(v.extras);
  return { totalCost: round2(total), transportCost: round2(transport), teardownSetup: service, permitsEscorts: round2(permits), costPerMile: round2(miles ? transport / miles : 0), lowEstimate: round2(total * 0.75), highEstimate: round2(total * 1.4) };
};

export const DUMPSTER_PROJECTS: [string, number, number][] = [["Kitchen remodel (per sq ft of room)", 0.05, 0.25], ["Bathroom remodel (per sq ft of room)", 0.08, 0.3], ["Roof tear-off (per sq ft of roof, 1 layer)", 0.012, 0.65], ["Whole-house cleanout (per sq ft of home)", 0.015, 0.15], ["Deck removal (per sq ft)", 0.05, 0.2], ["Flooring / carpet removal (per sq ft)", 0.01, 0.2], ["Drywall removal (per sq ft of wall)", 0.015, 0.25], ["Yard waste / brush (per sq ft)", 0.03, 0.12], ["Concrete removal, 4 in (per sq ft)", 0.0124, 1.2]];
export const DUMPSTERS: [number, number, number][] = [[10, 2, 375], [15, 2.5, 425], [20, 3, 475], [30, 4, 550], [40, 5, 650]];
export const dumpster: CustomCalculator = (v) => {
  const [, ydPerSqFt, tPerYd] = DUMPSTER_PROJECTS[pick(v.project, DUMPSTER_PROJECTS.length)];
  const yd = nonNeg(v.cubicYardsOverride) > 0 ? nonNeg(v.cubicYardsOverride) : nonNeg(v.area) * ydPerSqFt;
  const need = yd * 1.1;
  const tons = yd * tPerYd;
  const heavy = tPerYd >= 1; // clean concrete / dirt: ~0.8 t per yard, max ~10 t per haul
  const lim = (s: number, t: number) => (heavy ? Math.min(s * 0.8, 10) : t);
  let pickIdx = DUMPSTERS.findIndex(([s, t]) => s >= need && lim(s, t) >= tons);
  let count = 1;
  if (pickIdx === -1) { pickIdx = tPerYd >= 1 ? 0 : DUMPSTERS.length - 1; const [s, t] = DUMPSTERS[pickIdx]; count = Math.max(ceil(need / s), ceil(tons / lim(s, t))); }
  const [size, t0, price] = DUMPSTERS[pickIdx];
  const limit = lim(size, t0);
  const over = Math.max(0, tons - limit * count) * nonNeg(v.overweightPerTon, 85);
  return { recommendedSizeYards: size, dumpstersNeeded: count, debrisCubicYards: round2(yd), debrisTons: round2(tons), includedTons: limit * count, rentalCost: round2(price * count + over), overweightFees: round2(over) };
};

export const HOME_SIZES: [string, number, number][] = [["Studio", 300, 2000], ["1 bedroom", 500, 3500], ["2 bedroom", 800, 5000], ["3 bedroom", 1200, 8000], ["4+ bedroom", 1600, 11000]];
/** International: [label, 20 ft door-to-door, 40 ft door-to-door]. */
export const INTL_ROUTES: [string, number, number][] = [["US → Canada (road)", 4500, 7000], ["US → UK / Western Europe", 6500, 9000], ["US → Asia", 7500, 10500], ["US → Australia / NZ", 9000, 13000], ["US → Latin America", 5500, 8000], ["US → Middle East", 8000, 11500]];
export const internationalMove: CustomCalculator = (v) => {
  const [, cuFt] = HOME_SIZES[pick(v.homeSize, HOME_SIZES.length)];
  const [, c20, c40] = INTL_ROUTES[pick(v.route, INTL_ROUTES.length)];
  let container = 0; // 0 LCL, 1 = 20 ft, 2 = 40 ft
  let freight: number;
  if (cuFt <= 600) freight = Math.max(2500, (c20 / 1050) * 1.6 * cuFt);
  else if (cuFt <= 1050) { container = 1; freight = c20; }
  else { container = 2; freight = c40; }
  const packing = yes(v.packing) ? cuFt * 2.5 : 0;
  const insurance = nonNeg(v.goodsValue) * (nonNeg(v.insuranceRate) / 100);
  const car = yes(v.shipCar) ? 2500 : 0;
  const total = freight + packing + insurance + car + nonNeg(v.destinationFees);
  return { totalCost: round2(total), oceanFreight: round2(freight), containerType: container, estimatedCubicFeet: cuFt, packingCost: round2(packing), insuranceCost: round2(insurance), carShipping: car, lowEstimate: round2(total * 0.8), highEstimate: round2(total * 1.35) };
};

export const canadaMove: CustomCalculator = (v) => {
  const i = pick(v.homeSize, HOME_SIZES.length);
  const lb = HOME_SIZES[i][2];
  const km = nonNeg(v.distanceKm);
  let moving: number;
  let hours = 0;
  if (km < 100) { hours = [3, 4, 6, 8, 10][i]; moving = hours * nonNeg(v.hourlyRate, 160) + nonNeg(v.truckFee, 150); }
  else moving = (lb / 100) * (55 + 0.06 * km);
  moving *= 1 + safeNumber(v.seasonAdjust) / 100;
  const packing = yes(v.packing) ? moving * 0.25 : 0;
  const valuation = nonNeg(v.goodsValue) * (nonNeg(v.valuationRate) / 100);
  const pre = moving + packing + valuation + nonNeg(v.storage);
  const tax = pre * (nonNeg(v.salesTax) / 100);
  return { totalCostCad: round2(pre + tax), movingCharge: round2(moving), packingCost: round2(packing), valuationCoverage: round2(valuation), salesTaxAmount: round2(tax), estimatedWeightLb: lb, localHours: hours };
};

// --- Ocean ---------------------------------------------------------------------------------------------------
export const lcl: CustomCalculator = (v) => {
  const wm = Math.max(nonNeg(v.minimumWm, 1), nonNeg(v.cbm), nonNeg(v.weightKg) / 1000);
  const freight = wm * nonNeg(v.ratePerWm);
  const cfs = wm * (nonNeg(v.originCfs) + nonNeg(v.destinationCfs));
  const total = freight + cfs + nonNeg(v.documentation) + nonNeg(v.customs) + nonNeg(v.delivery);
  const fcl = nonNeg(v.fcl20Price);
  return { totalCost: round2(total), revenueTons: round2(wm), oceanFreight: round2(freight), cfsCharges: round2(cfs), costPerCbm: round2(nonNeg(v.cbm) ? total / nonNeg(v.cbm) : 0), fcl20Comparison: round2(fcl), fclCheaper: fcl > 0 && fcl < total ? 1 : 0 };
};

export const demurrage: CustomCalculator = (v) => {
  const tiers = (days: number, free: number, r1: number, r2: number, r3: number) => {
    const over = Math.max(0, Math.round(days) - Math.round(free));
    const t1 = Math.min(over, 4);
    const t2 = Math.min(Math.max(0, over - 4), 4);
    const t3 = Math.max(0, over - 8);
    return { over, cost: t1 * r1 + t2 * r2 + t3 * r3 };
  };
  const n = Math.max(1, Math.round(nonNeg(v.containers, 1)));
  const d = tiers(nonNeg(v.daysAtTerminal), nonNeg(v.demurrageFreeDays, 4), nonNeg(v.dem1), nonNeg(v.dem2), nonNeg(v.dem3));
  const det = tiers(nonNeg(v.daysOutOfPort), nonNeg(v.detentionFreeDays, 4), nonNeg(v.det1), nonNeg(v.det2), nonNeg(v.det3));
  const storage = Math.max(0, Math.round(nonNeg(v.daysAtTerminal)) - Math.round(nonNeg(v.storageFreeDays, 4))) * nonNeg(v.storageRate);
  const total = (d.cost + det.cost + storage) * n;
  return { totalCharges: round2(total), demurrage: round2(d.cost * n), detention: round2(det.cost * n), portStorage: round2(storage * n), demurrageDays: d.over, detentionDays: det.over, perContainer: round2(total / n) };
};

export const teu: CustomCalculator = (v) => {
  const c20 = nonNeg(v.c20);
  const c40 = nonNeg(v.c40);
  const c40hc = nonNeg(v.c40hc);
  const c45 = nonNeg(v.c45);
  const teus = c20 + 2 * (c40 + c40hc) + 2.25 * c45;
  const vol = c20 * 33.2 + c40 * 67.7 + c40hc * 76.3 + c45 * 86;
  const cargo = nonNeg(v.cargoCbm);
  return { totalTeu: round2(teus), totalFeu: round2(teus / 2), containerCount: c20 + c40 + c40hc + c45, internalVolumeCbm: round2(vol), teuNeededForCargo: round2(cargo / 28), fortyFootersForCargo: ceil(cargo / 58) };
};

// --- Inventory & warehouse ---------------------------------------------------------------------------------
export const leadTime: CustomCalculator = (v) => {
  const lt = nonNeg(v.orderProcessing) + nonNeg(v.production) + nonNeg(v.transit) + nonNeg(v.customs) + nonNeg(v.receiving);
  const need = safeNumber(v.needDate, today() + 90);
  const z = [1.28, 1.65, 1.96, 2.33][pick(v.serviceLevel, 4)];
  const ss = z * Math.sqrt(lt * Math.pow(nonNeg(v.demandStdDev), 2) + Math.pow(nonNeg(v.dailyDemand) * nonNeg(v.leadTimeStdDev), 2));
  return { totalLeadTimeDays: round2(lt), orderByDate: Math.round(need - lt - nonNeg(v.bufferDays)), safetyStockUnits: ceil(ss), reorderPointUnits: ceil(nonNeg(v.dailyDemand) * lt + ss), leadTimeWeeks: round2(lt / 7) };
};

export const pallet: CustomCalculator = (v) => {
  const PL = nonNeg(v.palletLength, 48);
  const PW = nonNeg(v.palletWidth, 40);
  const bl = nonNeg(v.boxLength);
  const bw = nonNeg(v.boxWidth);
  const bh = nonNeg(v.boxHeight);
  const a = bl > 0 && bw > 0 ? Math.floor(PL / bl) * Math.floor(PW / bw) : 0;
  const b = bl > 0 && bw > 0 ? Math.floor(PL / bw) * Math.floor(PW / bl) : 0;
  const perLayer = Math.max(a, b);
  const layersH = bh > 0 ? Math.floor(Math.max(0, nonNeg(v.maxHeight, 60) - nonNeg(v.palletHeight, 5.5)) / bh) : 0;
  const boxW = nonNeg(v.boxWeight);
  const byWeight = boxW > 0 ? Math.floor(Math.max(0, nonNeg(v.maxWeight, 2500) - 45) / boxW) : Infinity;
  const perPallet = Math.min(perLayer * layersH, byWeight);
  const boxes = Math.round(nonNeg(v.totalBoxes));
  return { boxesPerPallet: perPallet, boxesPerLayer: perLayer, layers: layersH, palletsNeeded: perPallet > 0 ? ceil(boxes / perPallet) : 0, palletWeightLb: round2(perPallet * boxW + 45), footprintUsePercent: round2(PL * PW ? ((perLayer * bl * bw) / (PL * PW)) * 100 : 0), limitedByWeight: byWeight < perLayer * layersH ? 1 : 0 };
};

export const rackCapacity: CustomCalculator = (v) => {
  const levelLoad = nonNeg(v.palletWeight) * Math.max(1, Math.round(nonNeg(v.palletsPerLevel, 2)));
  const levels = Math.max(1, Math.round(nonNeg(v.levels, 4)));
  const bay = levelLoad * levels;
  const beamUse = nonNeg(v.beamCapacity) > 0 ? (levelLoad / nonNeg(v.beamCapacity)) * 100 : 0;
  const frameUse = nonNeg(v.frameCapacity) > 0 ? (bay / nonNeg(v.frameCapacity)) * 100 : 0;
  const maxPallet = Math.min(nonNeg(v.beamCapacity) / Math.max(1, Math.round(nonNeg(v.palletsPerLevel, 2))), nonNeg(v.frameCapacity) / (levels * Math.max(1, Math.round(nonNeg(v.palletsPerLevel, 2)))));
  return { loadPerLevelLb: round2(levelLoad), totalBayLoadLb: round2(bay), beamUtilizationPercent: round2(beamUse), frameUtilizationPercent: round2(frameUse), maxPalletWeightLb: round2(maxPallet), withinCapacity: beamUse <= 100 && frameUse <= 100 ? 1 : 0 };
};

export const threePl: CustomCalculator = (v) => {
  const orders = nonNeg(v.ordersPerMonth);
  const receiving = nonNeg(v.palletsReceived) * nonNeg(v.receivingPerPallet);
  const storage = nonNeg(v.palletsStored) * nonNeg(v.storagePerPallet) + nonNeg(v.binsStored) * nonNeg(v.storagePerBin);
  const pickPack = orders * nonNeg(v.pickPackPerOrder) + orders * Math.max(0, nonNeg(v.itemsPerOrder, 1) - 1) * nonNeg(v.additionalItem);
  const packaging = orders * nonNeg(v.packagingPerOrder);
  const shipping = orders * nonNeg(v.avgShippingLabel);
  const fees = receiving + storage + pickPack + packaging + nonNeg(v.accountFee);
  const billable = Math.max(nonNeg(v.monthlyMinimum), fees);
  const total = billable + shipping;
  return { monthlyTotal: round2(total), fulfillmentFees: round2(billable), costPerOrder: round2(orders ? total / orders : 0), fulfillmentPerOrderExShipping: round2(orders ? billable / orders : 0), receiving: round2(receiving), storage: round2(storage), pickAndPack: round2(pickPack), shippingLabels: round2(shipping) };
};

export const warehouseStorage: CustomCalculator = (v) => {
  let monthly: number;
  let positions: number;
  if (pick(v.mode, 2) === 0) {
    positions = nonNeg(v.pallets);
    monthly = positions * nonNeg(v.storagePerPallet) + nonNeg(v.palletsMoved) * (nonNeg(v.handlingIn) + nonNeg(v.handlingOut));
  } else {
    positions = nonNeg(v.palletPositions);
    monthly = (nonNeg(v.sqFt) * nonNeg(v.rentPerSqFtYear)) / 12 + nonNeg(v.staff) * nonNeg(v.monthlyWage) * 1.3 + nonNeg(v.utilities) + nonNeg(v.equipment) + nonNeg(v.otherOverhead);
  }
  return { monthlyCost: round2(monthly), annualCost: round2(monthly * 12), costPerPalletMonth: round2(positions ? monthly / positions : 0), costPerSqFtYear: round2(nonNeg(v.sqFt) ? (monthly * 12) / nonNeg(v.sqFt) : 0) };
};

export const forklift: CustomCalculator = (v) => {
  const rated = nonNeg(v.ratedCapacity);
  const rlc = nonNeg(v.ratedLoadCenter, 24);
  const alc = Math.max(1, nonNeg(v.actualLoadCenter, 24));
  const A = nonNeg(v.axleToFork, 18);
  let cap = rated * ((rlc + A) / (alc + A));
  cap -= nonNeg(v.attachmentWeight) * ((nonNeg(v.attachmentCg) + A) / (alc + A));
  cap *= 1 - nonNeg(v.heightDerate) / 100;
  cap = Math.min(rated, Math.max(0, cap));
  return { adjustedCapacityLb: round2(cap), capacityLossLb: round2(rated - cap), loadUtilizationPercent: round2(cap ? (nonNeg(v.loadWeight) / cap) * 100 : 0), safeToLift: nonNeg(v.loadWeight) <= cap ? 1 : 0, adjustedCapacityKg: round2(cap * 0.45359237) };
};

export const WH_TYPES: [string, number][] = [["Basic dry storage (shell)", 95], ["Distribution center with offices", 130], ["Flex / light industrial", 115], ["Cold storage (refrigerated)", 210], ["Freezer warehouse", 260], ["Automated fulfillment center", 190]];
export const warehouseConstruction: CustomCalculator = (v) => {
  const area = nonNeg(v.sqFt);
  const base = WH_TYPES[pick(v.type, WH_TYPES.length)][1];
  const height = 1 + Math.max(0, nonNeg(v.clearHeight, 32) - 32) * 0.01;
  const hard = area * base * height * (1 + safeNumber(v.regionAdjust) / 100);
  const site = hard * (nonNeg(v.siteWork) / 100);
  const soft = (hard + site) * (nonNeg(v.softCosts) / 100);
  const total = hard + site + soft + nonNeg(v.landCost);
  return { totalProjectCost: round2(total), buildingCost: round2(hard), siteWork: round2(site), softCosts: round2(soft), landCost: round2(nonNeg(v.landCost)), costPerSqFt: round2(area ? total / area : 0), buildingCostPerSqFt: round2(area ? hard / area : 0) };
};

export const TROUGH_K = [0.041, 0.09, 0.12, 0.135];
export const conveyor: CustomCalculator = (v) => {
  if (pick(v.mode, 2) === 1) {
    const pitch = nonNeg(v.itemLength) + nonNeg(v.gap);
    const perMin = pitch > 0 ? (nonNeg(v.speedFpm) * 12) / pitch : 0;
    return { capacityTph: 0, unitsPerHour: round2(perMin * 60), unitsPerMinute: round2(perMin), loadCrossSectionSqFt: 0, poundsPerHour: round2(perMin * 60 * nonNeg(v.itemWeight)) };
  }
  const B = nonNeg(v.beltWidth);
  const area = (TROUGH_K[pick(v.trough, TROUGH_K.length)] * Math.pow(Math.max(0, 0.9 * B - 2), 2)) / 144;
  const lbPerHr = area * nonNeg(v.speedFpm) * nonNeg(v.density) * 60 * (nonNeg(v.fillPercent, 100) / 100);
  return { capacityTph: round2(lbPerHr / 2000), unitsPerHour: 0, unitsPerMinute: 0, loadCrossSectionSqFt: round2(area), poundsPerHour: round2(lbPerHr) };
};

export const fibc: CustomCalculator = (v) => {
  const metric = pick(v.unit, 2) === 1;
  const toIn = metric ? 1 / 2.54 : 1;
  const L = nonNeg(v.length) * toIn;
  const W = nonNeg(v.width) * toIn;
  const H = nonNeg(v.height) * toIn;
  const ft3 = ((pick(v.shape, 2) === 1 ? Math.PI * Math.pow(L / 2, 2) : L * W) * H) / 1728 * (nonNeg(v.fillPercent, 90) / 100);
  const lb = ft3 * nonNeg(v.density);
  const swl = nonNeg(v.swl);
  return { capacityLb: round2(lb), capacityKg: round2(lb * 0.45359237), fillVolumeCuFt: round2(ft3), fillVolumeM3: round2(ft3 * 0.0283168), withinSwl: swl > 0 ? (lb <= swl ? 1 : 0) : 1, bagsForOrder: lb > 0 ? ceil((nonNeg(v.orderTons) * 2000) / Math.min(lb, swl > 0 ? swl : lb)) : 0 };
};

export const ledLighting: CustomCalculator = (v) => {
  const area = nonNeg(v.sqFt);
  const fc = [20, 30, 50, 10][pick(v.task, 4)];
  const lumens = Math.max(1, nonNeg(v.ledLumens, 24000));
  const fixtures = ceil((fc * area) / (lumens * nonNeg(v.cu, 0.75) * nonNeg(v.llf, 0.85)));
  const oldKw = (nonNeg(v.oldFixtures) * nonNeg(v.oldWatts)) / 1000;
  const newKw = (fixtures * nonNeg(v.ledWatts)) / 1000;
  const hours = nonNeg(v.hoursPerYear);
  const savingsKwh = Math.max(0, oldKw - newKw) * hours + (yes(v.controls) ? newKw * hours * 0.25 : 0);
  const savings = savingsKwh * nonNeg(v.pricePerKwh) + nonNeg(v.maintenanceSavings);
  const cost = fixtures * (nonNeg(v.fixtureCost) + nonNeg(v.installPerFixture)) - nonNeg(v.rebate);
  return { ledFixturesNeeded: fixtures, annualSavings: round2(savings), projectCost: round2(cost), paybackYears: round2(savings > 0 ? cost / savings : 0), annualKwhSaved: round2(savingsKwh), newConnectedKw: round2(newKw), oldConnectedKw: round2(oldKw), targetFootcandles: fc };
};

export const fillRate: CustomCalculator = (v) => {
  const r = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
  return { orderFillRatePercent: round2(r(nonNeg(v.ordersComplete), nonNeg(v.totalOrders))), lineFillRatePercent: round2(r(nonNeg(v.linesShipped), nonNeg(v.linesOrdered))), unitFillRatePercent: round2(r(nonNeg(v.unitsShipped), nonNeg(v.unitsOrdered))), backorderedUnits: round2(Math.max(0, nonNeg(v.unitsOrdered) - nonNeg(v.unitsShipped))), lostSalesValue: round2(Math.max(0, nonNeg(v.unitsOrdered) - nonNeg(v.unitsShipped)) * nonNeg(v.unitPrice) * (nonNeg(v.lostShare) / 100)) };
};

export const fleetRoi: CustomCalculator = (v) => {
  const n = nonNeg(v.vehicles);
  const fuel = n * nonNeg(v.fuelPerVehicle) * (nonNeg(v.fuelSavings) / 100);
  const maint = n * nonNeg(v.maintenancePerVehicle) * (nonNeg(v.maintenanceSavings) / 100);
  const accidents = nonNeg(v.annualAccidentCost) * (nonNeg(v.accidentReduction) / 100);
  const labor = n * nonNeg(v.hoursSavedPerVehicleMonth) * 12 * nonNeg(v.hourlyWage);
  const insurance = nonNeg(v.annualInsurance) * (nonNeg(v.insuranceDiscount) / 100);
  const savings = fuel + maint + accidents + labor + insurance;
  const subscription = n * nonNeg(v.softwarePerVehicleMonth) * 12;
  const hardware = n * nonNeg(v.hardwarePerVehicle);
  const net1 = savings - subscription - hardware;
  return { firstYearNet: round2(net1), annualSavings: round2(savings), annualSubscription: round2(subscription), hardwareCost: round2(hardware), roiPercent: round2(subscription + hardware ? (net1 / (subscription + hardware)) * 100 : 0), paybackMonths: round2(savings - subscription > 0 ? hardware / ((savings - subscription) / 12) : 0), fuelSavings: round2(fuel), laborSavings: round2(labor) };
};

export const bizFreightCustomCalculators: Record<string, CustomCalculator> = {
  "freight-transit-time-calculator": freightTransit,
  "truckload-freight-calculator": truckload,
  "freight-forwarding-cost-calculator": forwarding,
  "freight-emissions-calculator": freightEmissions,
  "drayage-rate-calculator": drayage,
  "hot-shot-trucking-rate-calculator": hotShot,
  "case-cube-calculator": caseCube,
  "price-per-cwt-calculator": cwt,
  "junk-removal-cost-calculator": junkRemoval,
  "mobile-home-moving-cost-calculator": mobileHomeMove,
  "dumpster-size-calculator": dumpster,
  "international-moving-cost-calculator": internationalMove,
  "canada-moving-cost-calculator": canadaMove,
  "lcl-shipping-calculator": lcl,
  "demurrage-calculator": demurrage,
  "teu-calculator": teu,
  "lead-time-calculator": leadTime,
  "pallet-calculator": pallet,
  "pallet-rack-capacity-calculator": rackCapacity,
  "3pl-fulfillment-cost-calculator": threePl,
  "warehouse-storage-cost-calculator": warehouseStorage,
  "forklift-load-capacity-calculator": forklift,
  "warehouse-construction-cost-calculator": warehouseConstruction,
  "conveyor-capacity-calculator": conveyor,
  "bulk-bag-calculator": fibc,
  "warehouse-led-lighting-calculator": ledLighting,
  "fill-rate-calculator": fillRate,
  "fleet-management-roi-calculator": fleetRoi,
};
