/**
 * Batch: "Shopping Calculators" → Shipping & Moving Cost — parcels and
 * postage (9 tools). Parcel prices are planning estimates built from a base
 * charge plus a per-pound charge on the billable weight (the greater of actual
 * and dimensional weight), scaled by zone; carriers' retail rates change every
 * year, so each tool explains what drives the price rather than quoting one
 * carrier's table.
 *
 *  - shippingCost: domestic parcel by weight, size, zone and speed.
 *  - internationalShippingCost: parcel abroad with duties and taxes.
 *  - postage: letters, large envelopes and small packages with stamps.
 *  - overnightShippingCost: next-day by delivery time, with Saturday.
 *  - shippingZone: USPS-style zone (1–8) from distance.
 *  - shippingInsurance: declared-value coverage cost.
 *  - dimensionalWeight: DIM weight and billable weight by divisor.
 *  - usToCanadaShippingCost: cross-border parcel with duty, GST/HST and
 *    brokerage.
 *  - chinaShippingCost: express, air freight or sea from China to landed cost.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-ship-parcel-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const idx = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(safeNumber(v))));

/** Zone multiplier: zone 2 = 1.0, about 9% more per zone up to zone 8. */
const zoneFactor = (zone: number) => 1 + 0.09 * (Math.min(8, Math.max(1, Math.round(zone || 1))) - 2);

function billable(v: Record<string, number>, divisor: number) {
  const actual = nonNeg(v.weightLb);
  const dim = (nonNeg(v.length) * nonNeg(v.width) * nonNeg(v.height)) / divisor;
  return { actual, dim, bill: Math.ceil(Math.max(actual, dim, 0.0001) * 1) };
}

// Ground, 2-day, overnight: [base $, $ per billable lb]
const SPEED: [number, number][] = [[9, 0.85], [17, 1.75], [38, 3.6]];

function parcelPrice(bill: number, zone: number, speed: number) {
  const [base, perLb] = SPEED[idx(speed, 2)];
  return (base + perLb * Math.max(0, bill - 1)) * zoneFactor(zone);
}

export const shippingCost: CustomCalculator = (v) => {
  const { dim, bill } = billable(v, 139);
  const speed = idx(v.service, 2);
  const cost = nonNeg(v.weightLb) > 0 ? parcelPrice(bill, nonNeg(v.zone), speed) : 0;
  const ground = nonNeg(v.weightLb) > 0 ? parcelPrice(bill, nonNeg(v.zone), 0) : 0;
  return {
    estimatedCost: round2(cost),
    billableWeightLb: nonNeg(v.weightLb) > 0 ? bill : 0,
    dimWeightLb: round2(dim),
    costPerLb: bill > 0 && cost > 0 ? round2(cost / bill) : 0,
    groundEquivalent: round2(ground),
  };
};

// Region × service base and per-kg (USD) from the US: [base, perKg] for economy, standard, express.
const INTL: [number, number][][] = [
  [[15, 4], [28, 6], [45, 9]], // Canada / Mexico
  [[22, 7], [38, 10], [60, 14]], // Europe / UK
  [[24, 8], [42, 11], [65, 15]], // Asia
  [[28, 10], [48, 13], [75, 18]], // Australia, Africa, South America
];
const INTL_DAYS = [[10, 6, 3], [14, 8, 4], [16, 9, 4], [21, 10, 5]];

export const internationalShippingCost: CustomCalculator = (v) => {
  const actual = nonNeg(v.weightKg);
  const vol = (nonNeg(v.lengthCm) * nonNeg(v.widthCm) * nonNeg(v.heightCm)) / 5000;
  const kg = Math.ceil(Math.max(actual, vol) * 2) / 2; // half-kilo steps
  const r = idx(v.region, 3);
  const s = idx(v.service, 2);
  const [base, perKg] = INTL[r][s];
  const ship = kg > 0 ? base + perKg * Math.max(0, kg - 0.5) : 0;
  const value = nonNeg(v.declaredValue);
  const duty = (value * nonNeg(v.dutyRate)) / 100;
  const tax = ((value + duty + ship) * nonNeg(v.taxRate)) / 100;
  return {
    shippingCost: round2(ship),
    chargeableKg: kg,
    dutiesAndTaxes: round2(duty + tax),
    landedTotal: round2(ship + duty + tax),
    typicalDays: INTL_DAYS[r][s],
  };
};

export const postage: CustomCalculator = (v) => {
  const type = idx(v.mailType, 2);
  const oz = Math.ceil(nonNeg(v.weightOz));
  const first = nonNeg(v.firstOunce);
  const extra = nonNeg(v.additionalOunce);
  const count = Math.max(1, Math.round(nonNeg(v.pieces) || 1));
  const limit = [3.5, 13, 15.99][type];
  const each = oz > 0 ? first + extra * Math.max(0, oz - 1) : 0;
  const stamp = nonNeg(v.stampPrice);
  return {
    postagePerPiece: round2(each),
    totalPostage: round2(each * count),
    foreverStampsPerPiece: stamp > 0 ? Math.ceil(each / stamp - 1e-9) : 0,
    overpaymentPerPiece: stamp > 0 ? round2(Math.ceil(each / stamp - 1e-9) * stamp - each) : 0,
    overWeightLimit: nonNeg(v.weightOz) > limit ? 1 : 0,
  };
};

const BY_TIME = [1, 1.18, 1.6]; // end of day, by noon, early morning

export const overnightShippingCost: CustomCalculator = (v) => {
  const { bill } = billable(v, 139);
  if (nonNeg(v.weightLb) <= 0) return { estimatedCost: 0, billableWeightLb: 0, groundCost: 0, overnightPremium: 0, saturdayFee: 0 };
  const sat = idx(v.saturday, 1) === 1 ? 18 : 0;
  const cost = parcelPrice(bill, nonNeg(v.zone), 2) * BY_TIME[idx(v.deliveryBy, 2)] + sat;
  const ground = parcelPrice(bill, nonNeg(v.zone), 0);
  return {
    estimatedCost: round2(cost),
    billableWeightLb: bill,
    groundCost: round2(ground),
    overnightPremium: round2(cost - ground),
    saturdayFee: sat,
  };
};

const ZONE_MAX = [50, 150, 300, 600, 1000, 1400, 1800];

export const shippingZone: CustomCalculator = (v) => {
  const miles = nonNeg(v.distanceMiles);
  const z = ZONE_MAX.findIndex((m) => miles <= m);
  const zone = z === -1 ? 8 : z + 1;
  return {
    zone,
    typicalGroundDays: [1, 2, 2, 3, 4, 4, 5, 5][zone - 1],
    priceVsZone2: round2(zoneFactor(zone) * 100),
    distanceKm: round2(miles * 1.609),
  };
};

export const shippingInsurance: CustomCalculator = (v) => {
  const value = nonNeg(v.declaredValue);
  const included = nonNeg(v.includedCoverage);
  const insured = Math.max(0, value - included);
  const per = Math.ceil(insured / 100 - 1e-9) * nonNeg(v.ratePer100);
  const each = insured > 0 ? Math.max(nonNeg(v.minimumFee), per) : 0;
  const n = Math.max(1, Math.round(nonNeg(v.packages) || 1));
  return {
    insuranceCost: round2(each),
    totalForAllPackages: round2(each * n),
    costPercentOfValue: value > 0 ? round2((each / value) * 100) : 0,
    amountAtRiskUninsured: round2(insured),
  };
};

export const dimensionalWeight: CustomCalculator = (v) => {
  const divisor = nonNeg(v.divisor) || 139;
  const cubicIn = nonNeg(v.length) * nonNeg(v.width) * nonNeg(v.height);
  const dim = Math.ceil(cubicIn / divisor - 1e-9);
  const actual = Math.ceil(nonNeg(v.weightLb) - 1e-9);
  return {
    billableWeightLb: Math.max(dim, actual),
    dimWeightLb: dim,
    dimWeightKg: round2(dim * 0.4536),
    cubicFeet: round2(cubicIn / 1728),
    dimApplies: dim > actual ? 1 : 0,
  };
};

// Postal economy, courier standard, courier express to Canada: [base, perLb]
const CA: [number, number][] = [[18, 2.2], [26, 3], [45, 4.5]];

export const usToCanadaShippingCost: CustomCalculator = (v) => {
  const { bill } = billable(v, 139);
  const s = idx(v.service, 2);
  const ship = nonNeg(v.weightLb) > 0 ? CA[s][0] + CA[s][1] * Math.max(0, bill - 1) : 0;
  const value = nonNeg(v.valueUsd);
  const duty = value > nonNeg(v.dutyFreeLimit) ? (value * nonNeg(v.dutyRate)) / 100 : 0;
  const tax = value > nonNeg(v.taxFreeLimit) ? ((value + duty) * nonNeg(v.salesTaxRate)) / 100 : 0;
  const brokerage = value > nonNeg(v.taxFreeLimit) ? nonNeg(v.brokerageFee) : 0;
  return {
    totalCost: round2(ship + duty + tax + brokerage),
    shippingCost: round2(ship),
    dutyCost: round2(duty),
    salesTaxCost: round2(tax),
    brokerage: round2(brokerage),
  };
};

// Express courier, air freight, sea LCL, sea FCL (20 ft)
const CN_RATE = [7.5, 5.5, 85, 2800]; // $/kg, $/kg, $/cbm, $/container
const CN_FEES = [0, 180, 450, 900];
const CN_DAYS = [5, 9, 40, 35];

export const chinaShippingCost: CustomCalculator = (v) => {
  const kg = nonNeg(v.weightKg);
  const cbm = nonNeg(v.volumeCbm);
  const m = idx(v.method, 3);
  let freight = 0;
  let basis = 0;
  if (m === 0) { basis = Math.max(kg, cbm * 200); freight = basis * CN_RATE[0]; }
  else if (m === 1) { basis = Math.max(kg, cbm * 167); freight = Math.max(250, basis * CN_RATE[1]); }
  else if (m === 2) { basis = Math.max(cbm, kg / 1000, 1); freight = basis * CN_RATE[2]; }
  else { basis = Math.max(1, Math.ceil(cbm / 28 - 1e-9)); freight = basis * CN_RATE[3]; }
  if (kg <= 0 && cbm <= 0) freight = 0;
  const fees = freight > 0 ? CN_FEES[m] : 0;
  const goods = nonNeg(v.goodsValue);
  const duty = (goods * nonNeg(v.dutyRate)) / 100;
  const landed = goods + freight + fees + duty;
  return {
    freightCost: round2(freight),
    portAndClearanceFees: fees,
    dutyCost: round2(duty),
    landedCost: round2(landed),
    shippingPercentOfGoods: goods > 0 ? round2(((freight + fees) / goods) * 100) : 0,
    typicalTransitDays: CN_DAYS[m],
  };
};

export const shoppingShipParcelCustomCalculators: Record<string, CustomCalculator> = {
  "shipping-cost-calculator": shippingCost,
  "international-shipping-cost-calculator": internationalShippingCost,
  "postage-calculator": postage,
  "overnight-shipping-cost-calculator": overnightShippingCost,
  "shipping-zone-calculator": shippingZone,
  "shipping-insurance-calculator": shippingInsurance,
  "dimensional-weight-calculator": dimensionalWeight,
  "us-to-canada-shipping-cost-calculator": usToCanadaShippingCost,
  "china-shipping-cost-calculator": chinaShippingCost,
};
