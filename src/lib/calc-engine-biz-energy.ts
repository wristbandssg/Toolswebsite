/**
 * Batch: "Business & Industrial Calculators" → Energy, Solar & Electrical Calculators.
 *
 * Data / methods:
 *  - Solar: production = kW × peak sun hours × 365 × (1 − losses) × orientation factor
 *    (PVWatts default losses 14%); panel footprint ≈ 18.5 sq ft. Tilt rules (Landau):
 *    annual 0.76·lat + 3.1°, summer 0.93·lat − 21°, winter 0.875·lat + 19.2°, spring/fall lat − 2.5°.
 *  - Federal credits (2026): the residential §25D credit ended for systems placed in service after
 *    31 Dec 2025 (P.L. 119-21); third-party-owned leases and businesses may still use §48E
 *    subject to begin-construction / placed-in-service deadlines — users enter the credit %.
 *  - Electrical: P = V·I·PF (1φ), √3·V·I·PF (3φ); NEC 220.82 dwelling optional method
 *    (first 10 kVA at 100%, rest at 40%, plus largest of heating / cooling);
 *    NEC Table 310.16 75 °C ampacities; uncoated copper resistance (Ω/kft) per NEC Chapter 9
 *    Table 8; aluminum ≈ 1.64 × copper. Voltage drop 1φ = 2·L·I·R, 3φ = √3·L·I·R.
 *  - Fault current: point-to-point method (Eaton Bussmann SPD), C values for copper in steel
 *    conduit at 600 V.
 *  - Emission factors: US grid 0.37 kg CO2e/kWh (eGRID 2023 national average), natural gas
 *    5.3 kg/therm, diesel 10.21 kg/gal, gasoline 8.78, propane 5.72, heating oil 10.3 (EPA).
 *    Spend-based Scope 3 factors are typical US EEIO averages (kg CO2e per $).
 *  - Embodied carbon (A1–A3, typical industry EPD averages).
 *  - Hydro: P (kW) = Q (cfs) × H (ft) × η ÷ 11.8.
 *  - Petroleum VCF: API MPMS 11.1 / ASTM D1250 Table 6A/6B form, VCF = exp(−αΔT(1 + 0.8αΔT)).
 *  - Fuel heat content: propane 91,500 BTU/gal, heating oil 138,500, natural gas 1,038 BTU/cf.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-biz-energy-calculators.ts for the copy.
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
const SQ3 = Math.sqrt(3);
const DAY = 86400000;
const today = () => Math.floor(Date.now() / DAY);
const nextSize = (sizes: number[], x: number) => sizes.find((s) => s >= x - 1e-9) ?? 0;

// --- Carbon ------------------------------------------------------------------------------------------------
export const SCOPE3: [string, number][] = [["Purchased goods & services", 0.32], ["Capital goods", 0.38], ["Upstream transportation", 0.55], ["Waste (disposal spend)", 0.4], ["Business travel", 0.25], ["Downstream transportation", 0.55]];
export const scope3: CustomCalculator = (v) => {
  const cats = SCOPE3.map(([, f], i) => nonNeg(v[`spend${i}`]) * f);
  const commute = nonNeg(v.employees) * nonNeg(v.commuteMilesPerDay) * nonNeg(v.workDays, 230) * 1.609344 * 0.17 * (1 - nonNeg(v.remoteShare) / 100);
  const use = nonNeg(v.unitsSold) * nonNeg(v.lifetimeKwhPerUnit) * nonNeg(v.gridFactor, 0.37);
  const total = cats.reduce((a, b) => a + b, 0) + commute + use;
  const out: Record<string, number> = { totalTonnes: round2(total / 1000), purchasedGoodsT: round2(cats[0] / 1000), capitalGoodsT: round2(cats[1] / 1000), upstreamTransportT: round2(cats[2] / 1000), wasteT: round2(cats[3] / 1000), businessTravelT: round2(cats[4] / 1000), employeeCommutingT: round2(commute / 1000), downstreamTransportT: round2(cats[5] / 1000), useOfSoldProductsT: round2(use / 1000) };
  return out;
};

/** [label, tonnes CO2e per unit] */
export const EMBODIED: [string, number][] = [["Concrete, ready-mix 4,000 psi (yd³)", 0.3], ["Rebar (short ton)", 0.75], ["Structural steel, EAF (short ton)", 1.0], ["Aluminum (short ton)", 8.0], ["Softwood lumber (1,000 board ft)", 0.15], ["CLT / glulam (m³, fossil only)", 0.15], ["Gypsum board 5/8 in (1,000 sq ft)", 0.25], ["Flat glass (short ton)", 1.3], ["Brick (1,000 bricks)", 0.24], ["XPS insulation board 1 in (1,000 sq ft)", 0.5], ["Mineral wool insulation 1 in (1,000 sq ft)", 0.08], ["Asphalt paving (short ton)", 0.06]];
export const embodiedCarbon: CustomCalculator = (v) => {
  let total = 0;
  const lines: Record<string, number> = {};
  for (let i = 1; i <= 5; i++) {
    const t = nonNeg(v[`qty${i}`]) * EMBODIED[pick(v[`material${i}`], EMBODIED.length)][1];
    lines[`line${i}T`] = round2(t);
    total += t;
  }
  const area = nonNeg(v.buildingArea);
  return { totalTonnesCo2e: round2(total), kgPerSqFt: round2(area ? (total * 1000) / area : 0), kgPerSqM: round2(area ? (total * 1000) / (area * 0.092903) : 0), carsPerYearEquivalent: round2(total / 4.6), ...lines };
};

export const treeOffset: CustomCalculator = (v) => {
  const t = nonNeg(v.annualTonnes) * Math.max(1, nonNeg(v.years, 1));
  const perTree = nonNeg(v.kgPerTreeYear, 22) * Math.max(1, nonNeg(v.years, 1)) * (nonNeg(v.survival, 80) / 100);
  const trees = perTree > 0 ? ceil((t * 1000) / perTree) : 0;
  return { treesNeeded: trees, totalTonnesToOffset: round2(t), plantingCost: round2(trees * nonNeg(v.costPerTree)), acresOfForest: round2(trees / Math.max(1, nonNeg(v.treesPerAcre, 450))), costPerTonne: round2(t ? (trees * nonNeg(v.costPerTree)) / t : 0) };
};

export const businessFootprint: CustomCalculator = (v) => {
  const s1 = nonNeg(v.naturalGasTherms) * 5.3 + nonNeg(v.dieselGal) * 10.21 + nonNeg(v.gasolineGal) * 8.78 + nonNeg(v.propaneGal) * 5.72 + nonNeg(v.fuelOilGal) * 10.3 + nonNeg(v.refrigerantKg) * nonNeg(v.refrigerantGwp, 2088);
  const s2 = nonNeg(v.electricityKwh) * nonNeg(v.gridFactor, 0.37) * (1 - nonNeg(v.renewableShare) / 100);
  const travel = nonNeg(v.airMiles) * 0.2 + nonNeg(v.hotelNights) * 15;
  const total = s1 + s2 + travel;
  return { totalTonnes: round2(total / 1000), scope1Tonnes: round2(s1 / 1000), scope2Tonnes: round2(s2 / 1000), travelTonnes: round2(travel / 1000), perEmployeeTonnes: round2(nonNeg(v.employees) ? total / 1000 / nonNeg(v.employees) : 0), perMillionRevenue: round2(nonNeg(v.revenue) ? total / 1000 / (nonNeg(v.revenue) / 1e6) : 0), offsetCost: round2((total / 1000) * nonNeg(v.offsetPrice)) };
};

// --- Solar -----------------------------------------------------------------------------------------------------
export const ORIENT = [1, 0.96, 0.86, 0.62]; // south, SE/SW, E/W, north (moderate tilt)
function production(kw: number, psh: number, loss: number, orient = 1) {
  return kw * psh * 365 * (1 - loss / 100) * orient;
}
export const solarSize: CustomCalculator = (v) => {
  const annual = pick(v.usageMode, 2) === 0 ? nonNeg(v.monthlyKwh) * 12 : nonNeg(v.annualKwh);
  const target = annual * (nonNeg(v.offset, 100) / 100);
  const kw = target / (365 * Math.max(0.5, nonNeg(v.sunHours, 4.5)) * (1 - nonNeg(v.losses, 14) / 100) * ORIENT[pick(v.orientation, ORIENT.length)]);
  const panels = ceil((kw * 1000) / Math.max(100, nonNeg(v.panelWatts, 400)));
  const actualKw = (panels * nonNeg(v.panelWatts, 400)) / 1000;
  const prod = production(actualKw, nonNeg(v.sunHours, 4.5), nonNeg(v.losses, 14), ORIENT[pick(v.orientation, ORIENT.length)]);
  return { systemSizeKw: round2(actualKw), panelsNeeded: panels, roofAreaSqFt: round2(panels * 18.5), annualProductionKwh: round2(prod), offsetPercent: round2(annual ? (prod / annual) * 100 : 0), estimatedCost: round2(actualKw * 1000 * nonNeg(v.costPerWatt)) };
};

export const pvwatts: CustomCalculator = (v) => {
  const kw = nonNeg(v.systemKw);
  const tiltF = 1 - Math.abs(nonNeg(v.tilt) - nonNeg(v.latitude)) * 0.004;
  const annual = production(kw, nonNeg(v.sunHours, 4.5), nonNeg(v.losses, 14), ORIENT[pick(v.orientation, ORIENT.length)] * Math.max(0.7, tiltF)) * (nonNeg(v.inverterEff, 96) / 96);
  return { annualKwh: round2(annual), monthlyAverageKwh: round2(annual / 12), dailyAverageKwh: round2(annual / 365), capacityFactorPercent: round2(kw ? (annual / (kw * 8760)) * 100 : 0), specificYield: round2(kw ? annual / kw : 0), annualValue: round2(annual * nonNeg(v.pricePerKwh)) };
};

export const panelAngle: CustomCalculator = (v) => {
  const lat = Math.abs(safeNumber(v.latitude, 40));
  const n = safeNumber(v.date, today());
  const d = new Date(n * DAY);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1) / DAY;
  const doy = n - start + 1;
  const decl = 23.44 * Math.sin(((2 * Math.PI) / 365) * (284 + doy));
  const hemi = safeNumber(v.latitude, 40) >= 0 ? 1 : -1;
  return { annualFixedTilt: round2(lat * 0.76 + 3.1), summerTilt: round2(Math.max(0, lat * 0.93 - 21)), winterTilt: round2(lat * 0.875 + 19.2), springFallTilt: round2(Math.max(0, lat - 2.5)), bestTiltOnDate: round2(Math.max(0, lat - hemi * decl)), noonSunElevation: round2(90 - lat + hemi * decl), declination: round2(decl) };
};

export const POWERWALL_KWH = 13.5;
export const solarBattery: CustomCalculator = (v) => {
  const daily = pick(v.mode, 2) === 0 ? nonNeg(v.dailyKwh) : nonNeg(v.averageLoadKw) * nonNeg(v.backupHours);
  const days = pick(v.mode, 2) === 0 ? Math.max(0.1, nonNeg(v.daysAutonomy, 1)) : 1;
  const dod = [0.9, 0.8, 0.5][pick(v.chemistry, 3)];
  const eff = nonNeg(v.inverterEff, 92) / 100;
  const kwh = (daily * days) / (dod * eff);
  const V = Math.max(1, nonNeg(v.systemVoltage, 48));
  return { batteryCapacityKwh: round2(kwh), usableKwhNeeded: round2(daily * days), amphoursAtVoltage: round2((kwh * 1000) / V), powerwallsNeeded: ceil((daily * days) / (POWERWALL_KWH * eff)), peakLoadOk: nonNeg(v.peakKw) <= ceil((daily * days) / (POWERWALL_KWH * eff)) * 11.5 ? 1 : 0, estimatedCost: round2(kwh * nonNeg(v.costPerKwh)) };
};

export const CONTROLLER_SIZES = [10, 15, 20, 30, 40, 50, 60, 70, 85, 100, 150, 200];
export const chargeController: CustomCalculator = (v) => {
  const watts = nonNeg(v.panelWatts) * nonNeg(v.panels);
  const V = Math.max(1, nonNeg(v.batteryVoltage, 12));
  const series = Math.max(1, Math.round(nonNeg(v.seriesPanels, 1)));
  const strings = Math.max(1, Math.ceil(nonNeg(v.panels) / series));
  const vocCold = nonNeg(v.panelVoc) * series * (1 + 0.003 * Math.max(0, 25 - safeNumber(v.minTempC, -10)));
  const mppt = (watts / V) * 1.25;
  const pwm = nonNeg(v.panelIsc) * strings * 1.25;
  const amps = pick(v.type, 2) === 0 ? mppt : pwm;
  const voltClass = [75, 100, 150, 250, 450].find((c) => c >= vocCold) ?? 0;
  return { minControllerAmps: round2(amps), recommendedAmps: nextSize(CONTROLLER_SIZES, amps), maxPvVoltageCold: round2(vocCold), pvVoltageClass: voltClass, arrayWatts: round2(watts), parallelStrings: strings };
};

export const leaseVsBuy: CustomCalculator = (v) => {
  const years = Math.max(1, Math.round(nonNeg(v.years, 25)));
  const prod0 = nonNeg(v.annualKwh);
  const rate0 = nonNeg(v.utilityRate);
  let buy = -(nonNeg(v.systemCost) * (1 - nonNeg(v.buyCredit) / 100) - nonNeg(v.otherIncentives));
  let lease = 0;
  let pay = nonNeg(v.leasePayment) * 12;
  let buyNpv = buy;
  let leaseNpv = 0;
  const r = nonNeg(v.discountRate) / 100;
  for (let y = 1; y <= years; y++) {
    const prod = prod0 * Math.pow(1 - nonNeg(v.degradation, 0.5) / 100, y - 1);
    const rate = rate0 * Math.pow(1 + nonNeg(v.rateEscalation, 3) / 100, y - 1);
    const value = prod * rate;
    const b = value - nonNeg(v.maintenance);
    const l = value - (y <= nonNeg(v.leaseTerm, 25) ? pay : 0);
    buy += b;
    lease += l;
    buyNpv += b / Math.pow(1 + r, y);
    leaseNpv += l / Math.pow(1 + r, y);
    pay *= 1 + nonNeg(v.leaseEscalator) / 100;
  }
  return { buyNetSavings: round2(buy), leaseNetSavings: round2(lease), difference: round2(buy - lease), betterOption: buy >= lease ? 1 : 2, buyNpv: round2(buyNpv), leaseNpv: round2(leaseNpv), buyNetCost: round2(nonNeg(v.systemCost) * (1 - nonNeg(v.buyCredit) / 100) - nonNeg(v.otherIncentives)) };
};

export const offGrid: CustomCalculator = (v) => {
  const wh = nonNeg(v.dailyWh);
  const psh = Math.max(0.5, nonNeg(v.sunHours, 4));
  const V = Math.max(1, nonNeg(v.systemVoltage, 12));
  const arrayW = (wh / psh / (1 - nonNeg(v.losses, 25) / 100)) * (1 + nonNeg(v.winterMargin) / 100);
  const panels = ceil(arrayW / Math.max(50, nonNeg(v.panelWatts, 200)));
  const dod = [0.9, 0.5][pick(v.chemistry, 2)];
  const battWh = (wh * Math.max(0.5, nonNeg(v.daysAutonomy, 2))) / dod;
  const ah = battWh / V;
  const ctrl = ((panels * nonNeg(v.panelWatts, 200)) / V) * 1.25;
  return { arrayWatts: round2(panels * nonNeg(v.panelWatts, 200)), panelsNeeded: panels, batteryAh: round2(ah), batteryKwh: round2(battWh / 1000), controllerAmps: nextSize(CONTROLLER_SIZES, ctrl), inverterWatts: nextSize([300, 600, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000], nonNeg(v.peakWatts) * 1.25), dailyAh: round2(wh / V) };
};

export const commercialSolar: CustomCalculator = (v) => {
  const kw = nonNeg(v.systemKw);
  const cost = kw * 1000 * nonNeg(v.costPerWatt);
  const itc = cost * (nonNeg(v.itc) / 100);
  const basis = cost - itc / 2;
  const depr = basis * (nonNeg(v.bonusDepreciation) / 100) * (nonNeg(v.taxRate) / 100);
  const net = cost - itc - depr - nonNeg(v.otherIncentives);
  const prod = production(kw, nonNeg(v.sunHours, 4.5), 14);
  const yr1 = prod * nonNeg(v.utilityRate) + nonNeg(v.demandSavings) - kw * nonNeg(v.omPerKw);
  let total = -net;
  for (let y = 1; y <= 25; y++) total += (prod * Math.pow(0.995, y - 1) * nonNeg(v.utilityRate) * Math.pow(1 + nonNeg(v.rateEscalation) / 100, y - 1)) + nonNeg(v.demandSavings) - kw * nonNeg(v.omPerKw);
  return { netCostAfterIncentives: round2(net), grossCost: round2(cost), investmentTaxCredit: round2(itc), depreciationTaxSavings: round2(depr), annualProductionKwh: round2(prod), firstYearSavings: round2(yr1), paybackYears: round2(yr1 > 0 ? net / yr1 : 0), twentyFiveYearNet: round2(total) };
};

/** [label, cost per W, peak sun hours, utility rate $/kWh, export credit share, state credit % of cost, state credit cap, per-W rebate] */
export type StateSolar = [string, number, number, number, number, number, number, number];
export const STATE_SOLAR: Record<string, StateSolar> = {
  TX: ["Texas", 2.6, 5.0, 0.15, 0.35, 0, 0, 0],
  CA: ["California", 3.1, 5.4, 0.32, 0.25, 0, 0, 0],
  FL: ["Florida", 2.6, 4.9, 0.15, 1.0, 0, 0, 0],
  NY: ["New York", 3.2, 3.9, 0.25, 1.0, 25, 5000, 0.2],
};
export function stateSolar(st: keyof typeof STATE_SOLAR): CustomCalculator {
  return (v) => {
    const [, cpw, psh, rate0, exportShare, credPct, credCap, perW] = STATE_SOLAR[st];
    const annual = nonNeg(v.monthlyKwh) * 12;
    const kw = annual / (365 * psh * 0.86);
    const sysKw = nonNeg(v.systemKwOverride) > 0 ? nonNeg(v.systemKwOverride) : kw;
    const cost = sysKw * 1000 * (nonNeg(v.costPerWatt) > 0 ? nonNeg(v.costPerWatt) : cpw);
    const fed = cost * (nonNeg(v.federalCredit) / 100);
    const state = Math.min(credCap || Infinity, cost * (credPct / 100)) + sysKw * 1000 * perW;
    const net = cost - fed - state - nonNeg(v.utilityRebate);
    const prod = sysKw * psh * 365 * 0.86;
    const rate = nonNeg(v.utilityRate) > 0 ? nonNeg(v.utilityRate) : rate0;
    const self = Math.min(1, nonNeg(v.selfConsumption, 50) / 100);
    const exportValue = pick(v.exportRule, 2) === 0 ? exportShare : nonNeg(v.exportCreditShare) / 100;
    const yr1 = prod * rate * (self + (1 - self) * exportValue);
    let total = -net;
    for (let y = 1; y <= 25; y++) total += yr1 * Math.pow(0.995, y - 1) * Math.pow(1.03, y - 1);
    return { netCost: round2(net), systemSizeKw: round2(sysKw), grossCost: round2(cost), federalCredit: round2(fed), stateIncentives: round2(state), annualProductionKwh: round2(prod), firstYearSavings: round2(yr1), paybackYears: round2(yr1 > 0 ? net / yr1 : 0), twentyFiveYearSavings: round2(total) };
  };
}

export const vder: CustomCalculator = (v) => {
  const comps = nonNeg(v.lbmp) + nonNeg(v.icap) + nonNeg(v.environmental) + nonNeg(v.drv) + nonNeg(v.lsrv) + nonNeg(v.communityCredit);
  const kwh = nonNeg(v.annualKwh);
  return { annualCredit: round2(kwh * comps), valuePerKwh: r4(comps), energyValue: round2(kwh * nonNeg(v.lbmp)), capacityValue: round2(kwh * nonNeg(v.icap)), environmentalValue: round2(kwh * nonNeg(v.environmental)), drvAndLsrv: round2(kwh * (nonNeg(v.drv) + nonNeg(v.lsrv))), subscriberSavings: round2(kwh * comps * (nonNeg(v.subscriberDiscount) / 100)) };
};

export const hydroPower: CustomCalculator = (v) => {
  const unit = pick(v.flowUnit, 3);
  const cfs = unit === 0 ? nonNeg(v.flow) : unit === 1 ? nonNeg(v.flow) / 448.83 : nonNeg(v.flow) * 35.3147;
  const head = pick(v.headUnit, 2) === 0 ? nonNeg(v.head) : nonNeg(v.head) * 3.28084;
  const net = head * (1 - nonNeg(v.headLoss) / 100);
  const kw = (cfs * net * (nonNeg(v.efficiency, 70) / 100)) / 11.8;
  const annual = kw * 8760 * (nonNeg(v.capacityFactor, 50) / 100);
  return { powerKw: round2(kw), powerHp: round2(kw / 0.7457), annualKwh: round2(annual), annualValue: round2(annual * nonNeg(v.pricePerKwh)), netHeadFt: round2(net), flowCfs: round2(cfs) };
};

// --- Electrical -----------------------------------------------------------------------------------------------
export const kwWatt: CustomCalculator = (v) => {
  const phase = pick(v.phase, 3); // 0 DC, 1 single, 2 three
  const pf = phase === 0 ? 1 : Math.min(1, Math.max(0.01, nonNeg(v.powerFactor, 1)));
  const k = phase === 2 ? SQ3 : 1;
  let watts: number;
  if (pick(v.mode, 2) === 0) watts = k * nonNeg(v.volts) * nonNeg(v.amps) * pf;
  else watts = nonNeg(v.kw) * 1000;
  const amps = nonNeg(v.volts) > 0 ? watts / (k * nonNeg(v.volts) * pf) : 0;
  return { watts: round2(watts), kilowatts: r4(watts / 1000), kva: r4(watts / pf / 1000), amps: round2(amps), horsepower: round2(watts / 745.7), btuPerHour: round2(watts * 3.41214), kwhOverPeriod: round2((watts / 1000) * nonNeg(v.hours)), costOverPeriod: round2((watts / 1000) * nonNeg(v.hours) * nonNeg(v.pricePerKwh)) };
};

export const SERVICE_SIZES = [100, 125, 150, 200, 225, 300, 400, 600, 800];
export const dwellingLoad: CustomCalculator = (v) => {
  const general = nonNeg(v.sqFt) * 3 + Math.max(2, Math.round(nonNeg(v.smallApplianceCircuits, 2))) * 1500 + (yes(v.laundry) ? 1500 : 0);
  const appliances = nonNeg(v.range) + nonNeg(v.dryer) + nonNeg(v.waterHeater) + nonNeg(v.dishwasher) + nonNeg(v.disposal) + nonNeg(v.evCharger) + nonNeg(v.otherVa);
  const base = general + appliances;
  const demand = Math.min(base, 10000) + Math.max(0, base - 10000) * 0.4;
  const hvac = Math.max(nonNeg(v.coolingVa), nonNeg(v.heatingVa));
  const total = demand + hvac;
  const amps = total / Math.max(1, nonNeg(v.voltage, 240));
  return { calculatedLoadVa: round2(total), serviceAmps: round2(amps), recommendedService: nextSize(SERVICE_SIZES, amps), generalLoadVa: round2(general), applianceLoadVa: round2(appliances), demandAfterFactorsVa: round2(demand), hvacVa: round2(hvac), spareCapacityPercent: round2(nextSize(SERVICE_SIZES, amps) ? (1 - amps / nextSize(SERVICE_SIZES, amps)) * 100 : 0) };
};

export const threePhase: CustomCalculator = (v) => {
  const V = nonNeg(v.voltage);
  const pf = Math.min(1, Math.max(0.01, nonNeg(v.powerFactor, 0.85)));
  const mode = pick(v.mode, 3);
  let I: number;
  if (mode === 0) I = nonNeg(v.amps);
  else if (mode === 1) I = V > 0 ? (nonNeg(v.kw) * 1000) / (SQ3 * V * pf) : 0;
  else I = V > 0 ? (nonNeg(v.kva) * 1000) / (SQ3 * V) : 0;
  const kva = (SQ3 * V * I) / 1000;
  const kw = kva * pf;
  return { kilowatts: round2(kw), kva: round2(kva), mva: r4(kva / 1000), amps: round2(I), kvar: round2(Math.sqrt(Math.max(0, kva * kva - kw * kw))), horsepower: round2((kw * (nonNeg(v.efficiency, 100) / 100)) / 0.7457) };
};

export const XFMR_1PH = [10, 15, 25, 37.5, 50, 75, 100, 167, 250, 333, 500];
export const XFMR_3PH = [15, 30, 45, 75, 112.5, 150, 225, 300, 500, 750, 1000, 1500, 2000, 2500, 3000, 3750, 5000];
export const transformer: CustomCalculator = (v) => {
  const three = pick(v.phase, 2) === 1;
  const pf = Math.min(1, Math.max(0.01, nonNeg(v.powerFactor, 0.9)));
  const kvaLoad = pick(v.mode, 2) === 0 ? nonNeg(v.loadKw) / pf : ((three ? SQ3 : 1) * nonNeg(v.secondaryVoltage) * nonNeg(v.loadAmps)) / 1000;
  const req = kvaLoad * (1 + nonNeg(v.growth, 20) / 100);
  const size = nextSize(three ? XFMR_3PH : XFMR_1PH, req);
  const k = three ? SQ3 : 1;
  return { recommendedKva: size, requiredKva: round2(req), loadKva: round2(kvaLoad), primaryFullLoadAmps: round2(nonNeg(v.primaryVoltage) ? (size * 1000) / (k * nonNeg(v.primaryVoltage)) : 0), secondaryFullLoadAmps: round2(nonNeg(v.secondaryVoltage) ? (size * 1000) / (k * nonNeg(v.secondaryVoltage)) : 0), loadingPercent: round2(size ? (kvaLoad / size) * 100 : 0) };
};

/** Labor units (hours each): receptacles, switches, fixtures, panels, circuits (home runs), conduit ft, wire ft, EV / appliance hookups. */
export const LABOR_UNITS = [0.35, 0.35, 0.9, 8, 1.25, 0.06, 0.008, 3];
export const electricalBid: CustomCalculator = (v) => {
  const counts = [v.receptacles, v.switches, v.fixtures, v.panels, v.circuits, v.conduitFeet, v.wireFeet, v.hookups].map((x) => nonNeg(x));
  const hours = counts.reduce((a, c, i) => a + c * LABOR_UNITS[i], 0) * (1 + nonNeg(v.difficulty) / 100);
  const labor = hours * nonNeg(v.laborRate);
  const direct = labor + nonNeg(v.materials) + nonNeg(v.permits) + nonNeg(v.equipment);
  const oh = direct * (nonNeg(v.overhead) / 100);
  const profit = (direct + oh) * (nonNeg(v.profit) / 100);
  const bid = direct + oh + profit;
  return { bidPrice: round2(bid), laborHours: round2(hours), laborCost: round2(labor), materials: round2(nonNeg(v.materials)), overheadAmount: round2(oh), profitAmount: round2(profit), crewDays: round2(hours / 8 / Math.max(1, nonNeg(v.crewSize, 2))) };
};

/** [label, $ per sq ft mid (0 = flat job), flat price] */
export const ELECTRICAL_JOBS: [string, number, number][] = [["New construction — residential wiring", 6, 0], ["Whole-house rewire", 9, 0], ["Commercial new construction", 18, 0], ["Commercial tenant improvement", 12, 0], ["Industrial / warehouse", 14, 0], ["Panel upgrade to 200 A", 0, 2800], ["Service upgrade to 400 A", 0, 6500], ["Level 2 EV charger install", 0, 1600], ["Standby generator hookup + transfer switch", 0, 3500]];
export const electricalInstall: CustomCalculator = (v) => {
  const [, perSqFt, flat] = ELECTRICAL_JOBS[pick(v.job, ELECTRICAL_JOBS.length)];
  const f = 1 + safeNumber(v.regionAdjust) / 100;
  const base = (perSqFt > 0 ? nonNeg(v.sqFt) * perSqFt : flat) * f;
  const total = base + nonNeg(v.permits) + (yes(v.utilityWork) ? nonNeg(v.utilityCost) : 0);
  return { totalCost: round2(total), installCost: round2(base), lowEstimate: round2(total * 0.75), highEstimate: round2(total * 1.35), costPerSqFt: round2(nonNeg(v.sqFt) ? total / nonNeg(v.sqFt) : 0) };
};

/** NEC sizes: [label code, Cu Ω/kft, Cu amp 75°C, Al amp 75°C (0 = n/a), small-conductor OCPD max Cu, Al]. Code: AWG number; 0 = 1/0, −1 = 2/0, −2 = 3/0, −3 = 4/0; ≥ 250 = kcmil. */
export const WIRES: [number, number, number, number, number, number][] = [
  [14, 3.07, 20, 0, 15, 0], [12, 1.93, 25, 20, 20, 15], [10, 1.21, 35, 30, 30, 25], [8, 0.764, 50, 40, 0, 0], [6, 0.491, 65, 50, 0, 0], [4, 0.308, 85, 65, 0, 0], [3, 0.245, 100, 75, 0, 0], [2, 0.194, 115, 90, 0, 0], [1, 0.154, 130, 100, 0, 0], [0, 0.122, 150, 120, 0, 0], [-1, 0.0967, 175, 135, 0, 0], [-2, 0.0766, 200, 155, 0, 0], [-3, 0.0608, 230, 180, 0, 0], [250, 0.0515, 255, 205, 0, 0], [300, 0.0429, 285, 230, 0, 0], [350, 0.0367, 310, 250, 0, 0], [500, 0.0258, 380, 310, 0, 0],
];
export const wireSize: CustomCalculator = (v) => {
  const I = nonNeg(v.amps);
  const design = I * (yes(v.continuous) ? 1.25 : 1);
  const al = pick(v.conductor, 2) === 1;
  const phase = pick(v.phase, 3); // 0 DC / 1φ, 1 single-phase AC, 2 three-phase
  const L = nonNeg(v.distance);
  const V = Math.max(1, nonNeg(v.voltage));
  const maxDrop = nonNeg(v.maxDropPercent, 3);
  let chosen: (typeof WIRES)[number] | undefined;
  let dropPct = 0;
  for (const w of WIRES) {
    const amp = al ? w[3] : w[2];
    if (amp === 0) continue;
    const ocpd = al ? w[5] : w[4];
    if (amp < design || (ocpd > 0 && ocpd < design)) continue;
    const R = w[1] * (al ? 1.64 : 1);
    const vd = (phase === 2 ? SQ3 : 2) * L * I * R / 1000;
    if ((vd / V) * 100 <= maxDrop) { chosen = w; dropPct = (vd / V) * 100; break; }
  }
  return { wireSizeCode: chosen ? chosen[0] : 999, voltageDropPercent: round2(dropPct), voltageDropVolts: round2((dropPct / 100) * V), ampacity: chosen ? (al ? chosen[3] : chosen[2]) : 0, designAmps: round2(design), voltsAtLoad: round2(V * (1 - dropPct / 100)) };
};

/** Saturated steam enthalpy (BTU/lb) by pressure option. */
export const STEAM_H: [string, number][] = [["0 psig", 1150], ["15 psig", 1164], ["50 psig", 1179], ["100 psig", 1189], ["150 psig", 1195], ["200 psig", 1199], ["300 psig", 1203]];
export const boilerEfficiency: CustomCalculator = (v) => {
  const hs = STEAM_H[pick(v.pressure, STEAM_H.length)][1];
  const hf = Math.max(0, safeNumber(v.feedwaterTemp, 180) - 32);
  const out = nonNeg(v.steamLbPerHour) * (hs - hf);
  const fuelUnit = pick(v.fuel, 3);
  const hhv = fuelUnit === 0 ? 1038 : fuelUnit === 1 ? 138500 : 91500; // per cu ft gas, per gal oil, per gal propane
  const input = nonNeg(v.fuelPerHour) * hhv;
  const eff = input > 0 ? (out / input) * 100 : 0;
  const costPerHr = nonNeg(v.fuelPerHour) * nonNeg(v.fuelPrice);
  return { efficiencyPercent: round2(eff), outputMmbtuPerHour: r4(out / 1e6), inputMmbtuPerHour: r4(input / 1e6), boilerHorsepower: round2(out / 33475), fuelCostPerHour: round2(costPerHr), costPer1000LbSteam: round2(nonNeg(v.steamLbPerHour) ? (costPerHr / nonNeg(v.steamLbPerHour)) * 1000 : 0), lossesPercent: round2(Math.max(0, 100 - eff)) };
};

export const subMeter: CustomCalculator = (v) => {
  const used = Math.max(0, nonNeg(v.currentReading) - nonNeg(v.previousReading)) * Math.max(1, nonNeg(v.multiplier, 1));
  const rate = pick(v.rateSource, 2) === 0 ? (nonNeg(v.masterKwh) > 0 ? nonNeg(v.masterBill) / nonNeg(v.masterKwh) : 0) : nonNeg(v.fixedRate);
  const energy = used * rate;
  const charge = energy + nonNeg(v.adminFee) + nonNeg(v.fixedShare);
  return { tenantCharge: round2(charge), kwhUsed: round2(used), ratePerKwh: r4(rate), energyCharge: round2(energy), shareOfBuildingPercent: round2(nonNeg(v.masterKwh) ? (used / nonNeg(v.masterKwh)) * 100 : 0) };
};

export const lcoe: CustomCalculator = (v) => {
  const r = nonNeg(v.discountRate) / 100;
  const n = Math.max(1, Math.round(nonNeg(v.lifeYears, 25)));
  let costs = nonNeg(v.capex);
  let energy = 0;
  for (let y = 1; y <= n; y++) {
    const d = Math.pow(1 + r, y);
    costs += (nonNeg(v.annualOm) * Math.pow(1 + nonNeg(v.costEscalation) / 100, y - 1) + nonNeg(v.annualFuel)) / d;
    energy += (nonNeg(v.annualKwh) * Math.pow(1 - nonNeg(v.degradation) / 100, y - 1)) / d;
  }
  const l = energy > 0 ? costs / energy : 0;
  return { lcoePerKwh: r4(l), lcoePerMwh: round2(l * 1000), discountedCosts: round2(costs), discountedEnergyKwh: round2(energy), vsGridPricePercent: round2(nonNeg(v.gridPrice) ? (l / nonNeg(v.gridPrice)) * 100 : 0) };
};

export const LOAD_BANK_SIZES = [50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 2500, 3000];
export const loadBank: CustomCalculator = (v) => {
  const kw = nonNeg(v.generatorKw);
  const pf = pick(v.loadType, 2) === 0 ? 1 : 0.8;
  const V = Math.max(1, nonNeg(v.voltage, 480));
  const k = pick(v.phase, 2) === 1 ? SQ3 : 1;
  const ampsFull = (kw * 1000) / (k * V * pf);
  const steps = [0.25, 0.5, 0.75, 1];
  const hours = nonNeg(v.testHours, 4);
  const fuel = steps.reduce((a, s) => a + kw * (0.016 + 0.059 * s), 0) * (hours / 4);
  return { recommendedLoadBankKw: nextSize(LOAD_BANK_SIZES, kw), kwAt25: round2(kw * 0.25), kwAt50: round2(kw * 0.5), kwAt75: round2(kw * 0.75), kwAt100: round2(kw), kvaAt100: round2(kw / pf), ampsAt100: round2(ampsFull), dieselGallonsForTest: round2(fuel), nfpa110MinimumKw: round2(kw * 0.3) };
};

/** Point-to-point C values, copper conductors in steel conduit, 600 V (Eaton Bussmann). Indexed like WIRES. */
export const C_VALUES = [389, 617, 981, 1557, 2425, 3806, 4774, 5907, 7293, 8925, 10755, 12844, 15082, 16483, 18177, 19704, 22185];
export const lineToLineFault: CustomCalculator = (v) => {
  const three = pick(v.phase, 2) === 1;
  const kva = nonNeg(v.kva);
  const V = Math.max(1, nonNeg(v.voltage));
  const z = Math.max(0.1, nonNeg(v.impedance, 5.75)) / 100;
  const fla = three ? (kva * 1000) / (SQ3 * V) : (kva * 1000) / V;
  const iTx = fla / z;
  const i3 = three ? iTx : 0;
  const ill = three ? iTx * 0.866 : iTx;
  const L = nonNeg(v.cableLength);
  const n = Math.max(1, Math.round(nonNeg(v.parallel, 1)));
  const C = C_VALUES[pick(v.cableSize, C_VALUES.length)];
  const f3 = three ? (SQ3 * L * i3) / (C * n * V) : 0;
  const fll = (2 * L * ill) / (C * n * V);
  return { lineToLineFaultAmps: round2(ill / (1 + fll)), threePhaseFaultAmps: round2(three ? i3 / (1 + f3) : 0), lineToLineAtTransformer: round2(ill), threePhaseAtTransformer: round2(i3), fullLoadAmps: round2(fla), lineToLineKa: round2(ill / (1 + fll) / 1000) };
};

/** Wood species designated fiber stress (psi, ANSI O5.1). */
export const POLE_WOOD: [string, number][] = [["Southern pine", 8000], ["Douglas fir", 8000], ["Western red cedar", 6000], ["Lodgepole pine", 6600]];
export const poleLoading: CustomCalculator = (v) => {
  const h = nonNeg(v.heightAboveGround);
  const dg = nonNeg(v.groundlineCircumference) / Math.PI;
  const dt = nonNeg(v.topCircumference) / Math.PI;
  const p = nonNeg(v.windPressure, 4);
  const ice = nonNeg(v.iceThickness);
  const poleForce = p * h * ((dg + dt) / 2 / 12);
  const centroid = dg + dt > 0 ? (h * (dg + 2 * dt)) / (3 * (dg + dt)) : 0;
  let wireMoment = 0;
  for (let i = 1; i <= 3; i++) {
    const dia = (nonNeg(v[`wireDiameter${i}`]) + 2 * ice) / 12;
    const force = p * dia * nonNeg(v.span) * nonNeg(v[`wireCount${i}`]);
    wireMoment += force * nonNeg(v[`wireHeight${i}`]);
  }
  const M = (poleForce * centroid + wireMoment) * nonNeg(v.overloadFactor, 2.5);
  const cap = (POLE_WOOD[pick(v.species, POLE_WOOD.length)][1] * Math.PI * Math.pow(dg, 3)) / 32 / 12; // ft-lb
  return { utilizationPercent: round2(cap ? (M / cap) * 100 : 0), factoredMomentFtLb: round2(M), momentCapacityFtLb: round2(cap), poleWindMomentFtLb: round2(poleForce * centroid), wireWindMomentFtLb: round2(wireMoment), passes: M <= cap ? 1 : 0, groundlineDiameterIn: round2(dg) };
};

/** Generator loads: [label, running W, starting W]. */
export const GEN_LOADS: [string, number, number][] = [["Refrigerator", 700, 2200], ["Chest freezer", 500, 1500], ["Sump pump (1/2 hp)", 1050, 2200], ["Well pump (1 hp)", 2000, 4000], ["Furnace fan (1/2 hp)", 800, 2350], ["Central AC (3 ton)", 3500, 9000], ["Window AC (10,000 BTU)", 1200, 3600], ["Electric water heater", 4500, 4500], ["Microwave", 1000, 1000], ["Electric range burner", 1500, 1500], ["Space heater", 1500, 1500], ["Washer", 1150, 2250], ["Electric dryer", 5400, 6750], ["Level 2 EV charger", 7200, 7200]];
export const GEN_SIZES = [2.2, 3.5, 5, 7.5, 10, 12, 14, 16, 18, 20, 22, 24, 26, 32, 38, 48, 60];
export const generatorSize: CustomCalculator = (v) => {
  let running = nonNeg(v.lightsWatts) + nonNeg(v.otherRunningWatts);
  let biggestSurge = 0;
  GEN_LOADS.forEach(([, run, start], i) => {
    const n = nonNeg(v[`load${i}`]);
    if (n > 0) { running += run * n; biggestSurge = Math.max(biggestSurge, start - run); }
  });
  if (yes(v.softStart)) biggestSurge *= 0.5;
  const peak = running + biggestSurge;
  const need = (Math.max(peak, running * (1 + nonNeg(v.margin, 25) / 100))) / 1000;
  return { recommendedKw: nextSize(GEN_SIZES, need), runningWatts: round2(running), startingWatts: round2(peak), largestSurgeWatts: round2(biggestSurge), requiredKw: round2(need) };
};

/** Fuel models: per kW of rating, consumption = a + b × load fraction (per hour). */
export const GEN_FUEL: [string, number, number, string][] = [["Diesel (gal)", 0.016, 0.059, "gal"], ["Propane (gal)", 0.05, 0.112, "gal"], ["Natural gas (cu ft)", 4.6, 9.6, "cu ft"], ["Gasoline (gal)", 0.03, 0.09, "gal"]];
export const generatorFuel: CustomCalculator = (v) => {
  const [, a, b] = GEN_FUEL[pick(v.fuel, GEN_FUEL.length)];
  const kw = nonNeg(v.generatorKw);
  const load = Math.min(1, nonNeg(v.loadPercent, 50) / 100);
  const perHour = kw * (a + b * load);
  const hours = nonNeg(v.hoursPerDay, 24);
  const tank = nonNeg(v.tankSize) * (pick(v.fuel, GEN_FUEL.length) === 1 ? 0.8 : 1);
  return { fuelPerHour: round2(perHour), fuelPerDay: round2(perHour * hours), costPerDay: round2(perHour * hours * nonNeg(v.fuelPrice)), runtimeHoursOnTank: round2(perHour > 0 && tank > 0 ? tank / perHour : 0), kwhPerUnitFuel: round2(perHour > 0 ? (kw * load) / perHour : 0), costPerKwh: round2(kw * load > 0 ? (perHour * nonNeg(v.fuelPrice)) / (kw * load) : 0) };
};

export const propaneUsage: CustomCalculator = (v) => {
  const btuDay = nonNeg(v.furnaceBtu) * nonNeg(v.furnaceHours) + nonNeg(v.waterHeaterBtu) * nonNeg(v.waterHeaterHours) + nonNeg(v.rangeBtu) * nonNeg(v.rangeHours) + nonNeg(v.dryerBtu) * nonNeg(v.dryerHours) + nonNeg(v.fireplaceBtu) * nonNeg(v.fireplaceHours) + nonNeg(v.otherBtu) * nonNeg(v.otherHours);
  const gal = btuDay / 91500;
  const usable = nonNeg(v.tankGallons) * 0.8 * (nonNeg(v.currentFillPercent, 80) / 80);
  return { gallonsPerDay: round2(gal), gallonsPerMonth: round2(gal * 30.4), costPerMonth: round2(gal * 30.4 * nonNeg(v.pricePerGallon)), daysTankLasts: round2(gal > 0 ? (nonNeg(v.tankGallons) * 0.8) / gal : 0), daysUntilEmpty: round2(gal > 0 ? Math.min(usable, nonNeg(v.tankGallons) * 0.8) / gal : 0), btuPerDay: round2(btuDay) };
};

export const CLIMATE_MMBTU = [0.015, 0.03, 0.045, 0.06];
function heatLoad(v: Record<string, number>) {
  return nonNeg(v.annualMmbtu) > 0 ? nonNeg(v.annualMmbtu) : nonNeg(v.sqFt) * CLIMATE_MMBTU[pick(v.climate, CLIMATE_MMBTU.length)];
}
export const heatPumpVsFurnace: CustomCalculator = (v) => {
  const mmbtu = heatLoad(v);
  const fuel = pick(v.furnaceFuel, 3); // gas therms, propane gal, oil gal
  const perUnit = [0.1, 0.0915, 0.1385][fuel]; // MMBtu per unit
  const furnaceUnits = mmbtu / (perUnit * (nonNeg(v.afue, 95) / 100));
  const furnaceCost = furnaceUnits * nonNeg(v.fuelPrice);
  const cop = Math.max(1, nonNeg(v.hspf2, 7.8) / 3.412);
  const kwh = (mmbtu * 1e6) / 3412 / cop;
  const hpCost = kwh * nonNeg(v.electricRate);
  const savings = furnaceCost - hpCost;
  const extra = nonNeg(v.heatPumpInstalled) - nonNeg(v.furnaceInstalled) - nonNeg(v.rebates);
  return { annualSavings: round2(savings), heatPumpAnnualCost: round2(hpCost), furnaceAnnualCost: round2(furnaceCost), heatPumpKwh: round2(kwh), seasonalCop: round2(cop), extraUpfrontCost: round2(extra), paybackYears: round2(savings > 0 && extra > 0 ? extra / savings : 0), annualHeatLoadMmbtu: round2(mmbtu) };
};

export const oilGasRoyalty: CustomCalculator = (v) => {
  const nri = (nonNeg(v.royaltyRate) / 100) * (nonNeg(v.unitAcres) > 0 ? nonNeg(v.netMineralAcres) / nonNeg(v.unitAcres) : 1);
  const oil = nonNeg(v.oilBblPerMonth) * nonNeg(v.oilPrice);
  const gas = nonNeg(v.gasMcfPerMonth) * nonNeg(v.gasPrice) * (1 - nonNeg(v.gasDeductions) / 100);
  const gross = (oil + gas) * nri;
  const sev = gross * (nonNeg(v.severanceTax) / 100);
  const monthly = gross - sev;
  return { monthlyRoyalty: round2(monthly), annualRoyalty: round2(monthly * 12), netRevenueInterest: r4(nri), oilRoyalty: round2(oil * nri), gasRoyalty: round2(gas * nri), severanceTax: round2(sev), valueAt5xAnnual: round2(monthly * 12 * nonNeg(v.valuationMultiple, 5)) };
};

/** [label, $ per ton installed mid] */
export const HVAC_SYSTEMS: [string, number][] = [["Packaged rooftop units (RTU)", 2600], ["Split systems", 3200], ["VRF / VRV", 5000], ["Chiller + air handlers", 7000], ["Water-source heat pumps", 5500]];
export const commercialHvac: CustomCalculator = (v) => {
  const tons = nonNeg(v.tonsOverride) > 0 ? nonNeg(v.tonsOverride) : nonNeg(v.sqFt) / Math.max(100, nonNeg(v.sqFtPerTon, 350));
  const rate = HVAC_SYSTEMS[pick(v.system, HVAC_SYSTEMS.length)][1] * (pick(v.project, 2) === 1 ? 1.25 : 1) * (1 + safeNumber(v.regionAdjust) / 100);
  const equip = tons * rate;
  const ducts = yes(v.newDuctwork) ? nonNeg(v.sqFt) * nonNeg(v.ductPerSqFt) : 0;
  const total = equip + ducts + nonNeg(v.controls) + nonNeg(v.craneAndPermits);
  return { totalCost: round2(total), tonnage: round2(tons), equipmentAndInstall: round2(equip), ductwork: round2(ducts), costPerTon: round2(tons ? total / tons : 0), costPerSqFt: round2(nonNeg(v.sqFt) ? total / nonNeg(v.sqFt) : 0), lowEstimate: round2(total * 0.8), highEstimate: round2(total * 1.3) };
};

/** Natural gas units → BTU, using heat content per cu ft. */
export const naturalGas: CustomCalculator = (v) => {
  const hc = nonNeg(v.heatContent, 1038);
  const q = nonNeg(v.amount);
  const unit = pick(v.unit, 8);
  const btu = [q * hc, q * 100 * hc, q * 1000 * hc, q * 100000, q * 1e6, q * 35.3147 * hc, q * 3412.14, q * 1e6 * hc][unit];
  const cf = btu / hc;
  return { therms: r4(btu / 100000), ccf: r4(cf / 100), mcf: r4(cf / 1000), mmbtu: r4(btu / 1e6), cubicFeet: round2(cf), cubicMeters: round2(cf / 35.3147), kwhEquivalent: round2(btu / 3412.14), totalCost: round2((btu / 100000) * nonNeg(v.pricePerTherm)) };
};

export const annularVolume: CustomCalculator = (v) => {
  const D = nonNeg(v.holeDiameter);
  const d = nonNeg(v.pipeOd);
  const L = nonNeg(v.length);
  const bblFt = Math.max(0, D * D - d * d) / 1029.4;
  const bbl = bblFt * L * (1 + nonNeg(v.excess) / 100);
  const ft3 = bbl * 5.6146;
  return { annularVolumeBbl: round2(bbl), bblPerFoot: r4(bblFt), gallons: round2(bbl * 42), cubicFeet: round2(ft3), cementSacks: ceil(ft3 / Math.max(0.1, nonNeg(v.slurryYield, 1.18))), ftPerBbl: round2(bblFt > 0 ? 1 / bblFt : 0) };
};

export const oilVsGas: CustomCalculator = (v) => {
  const mmbtu = heatLoad(v);
  const oilGal = mmbtu / (0.1385 * (nonNeg(v.oilAfue, 84) / 100));
  const gasTherms = mmbtu / (0.1 * (nonNeg(v.gasAfue, 95) / 100));
  const oilCost = oilGal * nonNeg(v.oilPrice);
  const gasCost = gasTherms * nonNeg(v.gasPrice) + nonNeg(v.gasMonthlyCharge) * 12;
  const savings = oilCost - gasCost;
  return { annualSavingsWithGas: round2(savings), oilAnnualCost: round2(oilCost), gasAnnualCost: round2(gasCost), oilGallons: round2(oilGal), gasTherms: round2(gasTherms), conversionPaybackYears: round2(savings > 0 ? nonNeg(v.conversionCost) / savings : 0), annualHeatLoadMmbtu: round2(mmbtu) };
};

/** ASTM D1250 / API MPMS 11.1 constants: [label, K0, K1, generalized flag]. */
export const VCF_TABLES: [string, number, number][] = [["Crude oil (Table 6A)", 341.0957, 0], ["Gasoline (Table 6B)", 192.4571, 0.2438], ["Jet fuel / kerosene (Table 6B)", 330.301, 0], ["Diesel / fuel oil (Table 6B)", 103.872, 0.2701], ["Lubricating oil (Table 6D)", 0, 0.34878]];
export const vcf: CustomCalculator = (v) => {
  const api = safeNumber(v.api, 35);
  const rho = (141.5 / (api + 131.5)) * 999.016; // kg/m³ at 60 °F
  const [, K0, K1] = VCF_TABLES[pick(v.product, VCF_TABLES.length)];
  const alpha = K0 / (rho * rho) + K1 / rho;
  const dT = safeNumber(v.temperature, 60) - 60;
  const f = Math.exp(-alpha * dT * (1 + 0.8 * alpha * dT));
  const gross = nonNeg(v.grossVolume);
  return { vcf: r4(f), netVolumeAt60F: round2(gross * f), volumeChange: round2(gross * f - gross), alphaPerF: Math.round(alpha * 1e7) / 1e7, densityKgM3: round2(rho), specificGravity: r4(rho / 999.016) };
};

export const texasElectricity: CustomCalculator = (v) => {
  const kwh = nonNeg(v.monthlyKwh);
  const tdu = [[4.23, 0.0559], [4.9, 0.0548], [4.79, 0.0612], [3.42, 0.0563], [7.85, 0.0629], [0, 0]][pick(v.tdu, 6)];
  const tduFixed = pick(v.tdu, 6) === 5 ? nonNeg(v.customTduFixed) : tdu[0];
  const tduRate = pick(v.tdu, 6) === 5 ? nonNeg(v.customTduRate) : tdu[1];
  const energy = kwh * (nonNeg(v.energyCents) / 100);
  const delivery = tduFixed + kwh * tduRate;
  const credit = kwh >= nonNeg(v.creditThreshold) && nonNeg(v.creditThreshold) > 0 ? nonNeg(v.billCredit) : 0;
  const pre = energy + nonNeg(v.baseCharge) + delivery - credit;
  const fees = pre * (nonNeg(v.feesPercent) / 100);
  const total = pre + fees;
  return { monthlyBill: round2(total), allInCentsPerKwh: round2(kwh ? (total / kwh) * 100 : 0), energyCharge: round2(energy), deliveryCharges: round2(delivery), baseCharge: round2(nonNeg(v.baseCharge)), billCredit: round2(credit), taxesAndFees: round2(fees), annualCost: round2(total * 12) };
};

/** Cable bundle packing factor (bundle diameter ÷ cable diameter) for n = 1…12. */
export const BUNDLE_K = [1, 2, 2.155, 2.414, 2.701, 3, 3, 3.304, 3.613, 3.813, 3.923, 4.029];
export const cableBundle: CustomCalculator = (v) => {
  const n = Math.max(1, Math.round(nonNeg(v.cables, 1)));
  const d = nonNeg(v.cableDiameter);
  const k = n <= 12 ? BUNDLE_K[n - 1] : 1.15 * Math.sqrt(n);
  const D = d * k * (1 + nonNeg(v.allowance) / 100);
  const id = nonNeg(v.conduitId);
  const fill = id > 0 ? ((n * d * d) / (id * id)) * 100 : 0;
  const limit = n === 1 ? 53 : n === 2 ? 31 : 40;
  return { bundleDiameterIn: round2(D), bundleDiameterMm: round2(D * 25.4), totalCableAreaSqIn: r4((n * Math.PI * d * d) / 4), conduitFillPercent: round2(fill), necFillLimitPercent: limit, withinFill: id > 0 ? (fill <= limit ? 1 : 0) : 1 };
};

export const sccr: CustomCalculator = (v) => {
  const ratings: number[] = [];
  for (let i = 1; i <= 6; i++) { const r = nonNeg(v[`component${i}`]); if (r > 0) ratings.push(r); }
  const panel = ratings.length ? Math.min(...ratings) : 0;
  const limited = panel; // UL 508A SB4 simplified: the lowest-rated power-circuit component sets the panel SCCR
  const avail = nonNeg(v.availableFault);
  return { panelSccrKa: round2(limited), lowestComponentKa: round2(panel), availableFaultKa: round2(avail), adequate: limited >= avail ? 1 : 0, marginKa: round2(limited - avail) };
};

export const bizEnergyCustomCalculators: Record<string, CustomCalculator> = {
  "scope-3-emissions-calculator": scope3,
  "embodied-carbon-calculator": embodiedCarbon,
  "tree-carbon-offset-calculator": treeOffset,
  "business-carbon-footprint-calculator": businessFootprint,
  "solar-panel-size-calculator": solarSize,
  "pvwatts-solar-calculator": pvwatts,
  "solar-panel-angle-calculator": panelAngle,
  "solar-battery-calculator": solarBattery,
  "solar-charge-controller-calculator": chargeController,
  "solar-lease-vs-buy-calculator": leaseVsBuy,
  "off-grid-solar-calculator": offGrid,
  "commercial-solar-calculator": commercialSolar,
  "texas-solar-panel-cost-calculator": stateSolar("TX"),
  "california-solar-panel-cost-calculator": stateSolar("CA"),
  "florida-solar-panel-cost-calculator": stateSolar("FL"),
  "new-york-solar-panel-cost-calculator": stateSolar("NY"),
  "vder-calculator": vder,
  "hydro-power-calculator": hydroPower,
  "kw-calculator": kwWatt,
  "electrical-load-calculator": dwellingLoad,
  "three-phase-power-calculator": threePhase,
  "transformer-size-calculator": transformer,
  "electrical-bid-calculator": electricalBid,
  "electrical-installation-cost-calculator": electricalInstall,
  "wire-size-calculator": wireSize,
  "boiler-efficiency-calculator": boilerEfficiency,
  "sub-meter-calculator": subMeter,
  "lcoe-calculator": lcoe,
  "load-bank-calculator": loadBank,
  "line-to-line-fault-calculator": lineToLineFault,
  "pole-loading-calculator": poleLoading,
  "generator-size-calculator": generatorSize,
  "generator-fuel-consumption-calculator": generatorFuel,
  "propane-usage-calculator": propaneUsage,
  "heat-pump-vs-furnace-calculator": heatPumpVsFurnace,
  "oil-gas-royalty-calculator": oilGasRoyalty,
  "commercial-hvac-cost-calculator": commercialHvac,
  "natural-gas-calculator": naturalGas,
  "annular-volume-calculator": annularVolume,
  "oil-vs-gas-heating-cost-calculator": oilVsGas,
  "vcf-calculator": vcf,
  "texas-electricity-cost-calculator": texasElectricity,
  "cable-bundle-diameter-calculator": cableBundle,
  "sccr-calculator": sccr,
};
