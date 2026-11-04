/**
 * Batch: "Business & Industrial Calculators" → Shipping, Postage & Ecommerce Calculators.
 *
 * Carrier prices here are planning estimates of 2026 list rates, not live quotes. Each
 * service is modelled as (base for 1 lb + per extra lb × (billable lb − 1)) scaled by zone
 * (or by destination region for international), then carrier surcharges are added. Every
 * tool exposes a "rate adjustment" input so users can calibrate against a real quote.
 *
 * Data / methods:
 *  - Billable weight = max(actual weight rounded up, dimensional weight). Dim divisors:
 *    USPS 166 (only when the box is over 1 cu ft), UPS / FedEx / DHL 139 (in³ per lb).
 *  - UPS / FedEx 2026 surcharge estimates: residential $6.15 (ground) / $6.60 (air),
 *    fuel 19% ground / 22% air / 26% international, additional handling $32
 *    (longest side > 48 in, second side > 30 in or > 50 lb), large package $265
 *    (length + girth > 130 in or length > 96 in).
 *  - Size limits: USPS 108 in length + girth (Ground Advantage 130 in), 70 lb;
 *    UPS / FedEx 165 in, 150 lb, 108 in max length.
 *  - Box strength: McKee simplified formula BCT = 5.87 × ECT × √(perimeter × caliper).
 *  - Walmart WFS fulfillment fees (2025–2026 schedule by shipping weight), referral 15%.
 *  - US tariffs (2026): de minimis ended 29 Aug 2025; Canada IEEPA 35% on
 *    non-USMCA goods (10% energy / potash), Section 232 steel / aluminum / copper 50%,
 *    autos 25%; UK deal 10% baseline, 25% steel / aluminum. MPF 0.3464% with the
 *    FY2026 $33.58 minimum / $651.50 maximum. These rates change — users can override.
 *  - Delivery dates skip weekends and US federal holidays (observed dates).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-biz-shipping-calculators.ts for the copy.
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

// --- Dates -------------------------------------------------------------------------------------------------
const DAY = 86400000;
const dayNum = (y: number, m: number, d: number) => Math.round(Date.UTC(y, m, d) / DAY);
const dow = (n: number) => (((n + 4) % 7) + 7) % 7; // 0 = Sunday
function nthWeekday(y: number, m: number, wd: number, nth: number) {
  const first = dayNum(y, m, 1);
  return first + ((wd - dow(first) + 7) % 7) + (nth - 1) * 7;
}
function lastWeekday(y: number, m: number, wd: number) {
  const last = dayNum(y, m + 1, 0);
  return last - ((dow(last) - wd + 7) % 7);
}
function observed(n: number) {
  const d = dow(n);
  return d === 6 ? n - 1 : d === 0 ? n + 1 : n;
}
const holidayCache = new Map<number, Set<number>>();
/** US federal holidays (observed) for a year. */
export function usHolidays(y: number) {
  const hit = holidayCache.get(y);
  if (hit) return hit;
  const s = new Set<number>([
    observed(dayNum(y, 0, 1)), nthWeekday(y, 0, 1, 3), nthWeekday(y, 1, 1, 3), lastWeekday(y, 4, 1), observed(dayNum(y, 5, 19)), observed(dayNum(y, 6, 4)),
    nthWeekday(y, 8, 1, 1), nthWeekday(y, 9, 1, 2), observed(dayNum(y, 10, 11)), nthWeekday(y, 10, 4, 4), observed(dayNum(y, 11, 25)),
  ]);
  holidayCache.set(y, s);
  return s;
}
const isHoliday = (n: number) => usHolidays(new Date(n * DAY).getUTCFullYear()).has(n);
/** Add business days (Mon–Fri, or Mon–Sat when saturday = true), skipping holidays if asked. */
export function addBusinessDays(start: number, days: number, skipHolidays: boolean, saturday = false) {
  let n = start;
  let left = Math.max(0, Math.round(days));
  const ok = (d: number) => { const w = dow(d); return w !== 0 && (saturday || w !== 6) && !(skipHolidays && isHoliday(d)); };
  while (left > 0) { n++; if (ok(n)) left--; }
  return n;
}
const today = () => Math.floor(Date.now() / DAY);

// --- Parcel model ----------------------------------------------------------------------------------------
/** [label, base 1 lb at zone 2, per extra lb at zone 2, growth per zone, min days, max days] */
type Svc = [string, number, number, number, number, number];
export const USPS: Svc[] = [["Ground Advantage", 7.75, 1.75, 0.12, 2, 5], ["Priority Mail", 10.1, 2.6, 0.13, 1, 3], ["Priority Mail Express", 31.4, 4.2, 0.1, 1, 2]];
export const USPS_COMMERCIAL = [0.78, 0.8, 0.88];
export const UPS: Svc[] = [["UPS Ground", 10.4, 0.75, 0.065, 1, 5], ["UPS 3 Day Select", 22.5, 2.6, 0.08, 3, 3], ["UPS 2nd Day Air", 27, 3.3, 0.08, 2, 2], ["UPS Next Day Air Saver", 58, 5.5, 0.06, 1, 1], ["UPS Next Day Air", 64, 6, 0.06, 1, 1]];
export const FEDEX: Svc[] = [["FedEx Ground / Home Delivery", 10.35, 0.75, 0.065, 1, 5], ["FedEx Express Saver (3-day)", 22.8, 2.6, 0.08, 3, 3], ["FedEx 2Day", 27, 3.3, 0.08, 2, 2], ["FedEx Standard Overnight", 58, 5.5, 0.06, 1, 1], ["FedEx Priority Overnight", 64, 6, 0.06, 1, 1]];
const zoneOf = (z: number) => Math.min(8, Math.max(1, Math.round(safeNumber(z, 2))));
function svcPrice(s: Svc, bill: number, zone: number) {
  const f = 1 + s[3] * (zoneOf(zone) - 2);
  return (s[1] + s[2] * Math.max(0, bill - 1)) * f;
}
/** Ground transit days by zone 1–8 (UPS / FedEx ground and USPS Ground Advantage). */
export const GROUND_DAYS = [1, 1, 2, 3, 3, 4, 4, 5];
function dims(v: Record<string, number>) {
  const s = [nonNeg(v.length), nonNeg(v.width), nonNeg(v.height)].sort((a, b) => b - a);
  return { L: s[0], W: s[1], H: s[2], vol: s[0] * s[1] * s[2], girth: s[0] + 2 * (s[1] + s[2]) };
}
function billable(v: Record<string, number>, divisor: number, uspsRule = false) {
  const { vol } = dims(v);
  const actual = ceil(Math.max(nonNeg(v.weight), 0.01));
  const dim = vol > 0 && (!uspsRule || vol > 1728) ? ceil(vol / divisor) : 0;
  return { actual, dim, bill: Math.max(actual, dim) };
}
function upsFedexSurcharges(v: Record<string, number>, ground: boolean) {
  const { L, W, girth } = dims(v);
  const residential = yes(v.residential) ? (ground ? 6.15 : 6.6) : 0;
  const large = girth > 130 || L > 96;
  const ah = !large && (L > 48 || W > 30 || nonNeg(v.weight) > 50) ? 32 : 0;
  return { residential, additionalHandling: ah, largePackage: large ? 265 : 0, fuelRate: ground ? 0.19 : 0.22 };
}
function carrierQuote(table: Svc[], v: Record<string, number>, retailFactor: number) {
  const s = table[pick(v.service, table.length)];
  const { bill, dim, actual } = billable(v, 139);
  const ground = pick(v.service, table.length) === 0;
  const base = svcPrice(s, bill, v.zone) * retailFactor * (1 + safeNumber(v.rateAdjust) / 100);
  const sc = upsFedexSurcharges(v, ground);
  const pre = base + sc.residential + sc.additionalHandling + sc.largePackage;
  const fuel = pre * sc.fuelRate;
  const declared = Math.max(0, nonNeg(v.declaredValue) - 100);
  const dv = declared > 0 ? Math.max(4.25, (declared / 100) * 1.45) : 0;
  const total = pre + fuel + dv;
  const days = ground ? GROUND_DAYS[zoneOf(v.zone) - 1] : s[4];
  return { shippingCost: round2(total), baseRate: round2(base), fuelSurcharge: round2(fuel), residentialSurcharge: sc.residential, handlingSurcharges: round2(sc.additionalHandling + sc.largePackage), declaredValueFee: round2(dv), billableWeightLb: bill, dimWeightLb: dim, actualWeightLb: actual, transitDays: days };
}

export const uspsShipping: CustomCalculator = (v) => {
  const i = pick(v.service, USPS.length);
  const { bill, dim, actual } = billable(v, 166, true);
  const commercial = pick(v.pricing, 2) === 1;
  const retail = svcPrice(USPS[i], bill, v.zone) * (1 + safeNumber(v.rateAdjust) / 100);
  const price = commercial ? retail * USPS_COMMERCIAL[i] : retail;
  const { girth } = dims(v);
  const oversize = girth > (i === 0 ? 130 : 108) || nonNeg(v.weight) > 70 ? 1 : 0;
  const ins = nonNeg(v.insuredValue) > 0 ? (nonNeg(v.insuredValue) <= 100 ? 4.4 : 4.4 + Math.ceil((nonNeg(v.insuredValue) - 100) / 100) * 1.75) : 0;
  return { postage: round2(price + ins), labelPrice: round2(price), retailPrice: round2(retail), savingsVsRetail: round2(retail - price), insurance: round2(ins), billableWeightLb: bill, dimWeightLb: dim, actualWeightLb: actual, transitDays: i === 0 ? GROUND_DAYS[zoneOf(v.zone) - 1] + 1 : USPS[i][5], overLimit: oversize };
};

export const groundAdvantage: CustomCalculator = (v) => {
  const oz = pick(v.unit, 2) === 0 ? nonNeg(v.weight) : nonNeg(v.weight) * 16;
  const lbVal = oz / 16;
  const { vol } = dims(v);
  const dim = vol > 1728 ? ceil(vol / 166) : 0;
  const bill = Math.max(oz <= 15.99 ? 0 : ceil(lbVal), dim);
  const z = zoneOf(v.zone);
  let retail: number;
  if (bill === 0) {
    const tier = oz <= 4 ? 0 : oz <= 8 ? 1 : oz <= 12 ? 2 : 3; // ounce tiers under 1 lb
    retail = [5.65, 6.25, 6.95, 7.75][tier] * (1 + 0.06 * (z - 2));
  } else retail = svcPrice(USPS[0], bill, z);
  retail *= 1 + safeNumber(v.rateAdjust) / 100;
  const commercial = retail * USPS_COMMERCIAL[0];
  const price = pick(v.pricing, 2) === 1 ? commercial : retail;
  return { postage: round2(price), retailPrice: round2(retail), commercialPrice: round2(commercial), billableWeightLb: bill === 0 ? round2(lbVal) : bill, transitDays: GROUND_DAYS[z - 1] + 1, overLimit: oz > 70 * 16 ? 1 : 0 };
};

export const mediaMail: CustomCalculator = (v) => {
  const lb = ceil(Math.max(0.01, nonNeg(v.weight)));
  const retail = (4.86 + 0.89 * (lb - 1)) * (1 + safeNumber(v.rateAdjust) / 100);
  const price = pick(v.pricing, 2) === 1 ? retail * 0.95 : retail;
  const ga = svcPrice(USPS[0], lb, v.zone);
  return { postage: round2(price), billableWeightLb: lb, groundAdvantageRetail: round2(ga), savingsVsGroundAdvantage: round2(ga - price), transitDaysMin: 2, transitDaysMax: 8, overLimit: lb > 70 ? 1 : 0 };
};

export const upsShipping: CustomCalculator = (v) => carrierQuote(UPS, v, pick(v.rateType, 2) === 1 ? 1.28 : 1);
export const fedexShipping: CustomCalculator = (v) => carrierQuote(FEDEX, v, pick(v.rateType, 2) === 1 ? 1.28 : 1);

// --- International ---------------------------------------------------------------------------------------
export const REGIONS = ["Canada", "Mexico", "Europe (incl. UK)", "Asia-Pacific (Japan, China, Australia…)", "Latin America & Caribbean", "Middle East & Africa"];
/** [label, [base, perLb] per region (null = not offered), maxLb, minDays, maxDays] */
type IntlSvc = [string, ([number, number] | null)[], number, number, number];
export const USPS_INTL: IntlSvc[] = [
  ["First-Class Package International (≤ 4 lb)", [[17.5, 3.6], [19.5, 4.4], [22.5, 5.8], [23, 6.2], [22, 5.5], [24, 6.5]], 4, 7, 21],
  ["Priority Mail International", [[50, 4.2], [56, 5.8], [63, 7.5], [65, 8.5], [60, 7], [66, 9]], 66, 6, 10],
  ["Priority Mail Express International", [[72, 4.8], [79, 6.5], [86, 8.5], [89, 9.5], [84, 8], [92, 10]], 66, 3, 5],
];
const EXPEDITED: [number, number][] = [[68, 5.5], [74, 6.5], [95, 9.5], [100, 10.5], [98, 10], [110, 12]];
const scale = (rows: [number, number][], f: number) => rows.map(([a, b]) => [a * f, b * f] as [number, number]);
export const UPS_INTL: IntlSvc[] = [
  ["UPS Standard (Canada & Mexico only)", [[24, 2.2], [30, 2.8], null, null, null, null], 150, 2, 5],
  ["UPS Worldwide Expedited", EXPEDITED, 150, 2, 5],
  ["UPS Worldwide Saver", scale(EXPEDITED, 1.15), 150, 1, 3],
  ["UPS Worldwide Express", scale(EXPEDITED, 1.3), 150, 1, 3],
];
const ECONOMY: [number, number][] = [[66, 5.4], [72, 6.3], [92, 9.3], [97, 10.2], [95, 9.8], [106, 11.8]];
export const FEDEX_INTL: IntlSvc[] = [
  ["FedEx International Ground (Canada only)", [[21, 2], null, null, null, null, null], 150, 2, 7],
  ["FedEx International Economy", ECONOMY, 150, 2, 5],
  ["FedEx International Priority", scale(ECONOMY, 1.15), 150, 1, 3],
  ["FedEx International First", scale(ECONOMY, 1.6), 150, 1, 2],
];
const DHL_WW: [number, number][] = [[58, 6.5], [63, 7.5], [78, 9.5], [82, 10.5], [80, 10], [92, 12]];
export const DHL_INTL: IntlSvc[] = [["DHL Express Worldwide", DHL_WW, 150, 2, 5], ["DHL Express 12:00", scale(DHL_WW, 1.25), 150, 1, 4], ["DHL Express 9:00", scale(DHL_WW, 1.6), 150, 1, 3]];

function intlQuote(table: IntlSvc[], v: Record<string, number>, divisor: number, fuelRate: number, uspsRule = false) {
  const s = table[pick(v.service, table.length)];
  const region = pick(v.region, REGIONS.length);
  const row = s[1][region];
  const { bill, dim, actual } = billable(v, divisor, uspsRule);
  if (!row) return { shippingCost: 0, baseRate: 0, fuelSurcharge: 0, billableWeightLb: bill, dimWeightLb: dim, actualWeightLb: actual, transitDaysMin: 0, transitDaysMax: 0, notAvailable: 1, overLimit: 0, estimatedDuties: 0 };
  const base = (row[0] + row[1] * Math.max(0, bill - 1)) * (1 + safeNumber(v.rateAdjust) / 100);
  const fuel = base * fuelRate;
  const remote = yes(v.remoteArea) ? 35 : 0;
  return { shippingCost: round2(base + fuel + remote), baseRate: round2(base), fuelSurcharge: round2(fuel), billableWeightLb: bill, dimWeightLb: dim, actualWeightLb: actual, transitDaysMin: s[3], transitDaysMax: s[4], notAvailable: 0, overLimit: nonNeg(v.weight) > s[2] ? 1 : 0, estimatedDuties: round2(nonNeg(v.contentsValue) * (nonNeg(v.dutyRate) / 100)) };
}
export const uspsInternational: CustomCalculator = (v) => intlQuote(USPS_INTL, v, 166, 0, true);
export const upsInternational: CustomCalculator = (v) => intlQuote(UPS_INTL, v, 139, 0.26);
export const fedexInternational: CustomCalculator = (v) => intlQuote(FEDEX_INTL, v, 139, 0.26);
export const dhlShipping: CustomCalculator = (v) => intlQuote(DHL_INTL, v, 139, 0.27);

// --- Royal Mail (GBP) -------------------------------------------------------------------------------------
/** [service, format, max grams, price] */
export const ROYAL_MAIL: [number, number, number, number][] = [
  // service: 0 = 2nd Class, 1 = 1st Class, 2 = Tracked 48, 3 = Tracked 24, 4 = Special Delivery (by 1pm)
  // format: 0 letter, 1 large letter, 2 small parcel, 3 medium parcel
  [0, 0, 100, 0.87], [1, 0, 100, 1.7],
  [0, 1, 100, 1.55], [0, 1, 250, 2.1], [0, 1, 500, 2.7], [0, 1, 750, 3.0],
  [1, 1, 100, 2.6], [1, 1, 250, 3.3], [1, 1, 500, 4.2], [1, 1, 750, 4.9],
  [2, 1, 750, 3.35], [3, 1, 750, 4.15],
  [0, 2, 2000, 3.49], [1, 2, 2000, 4.79], [2, 2, 2000, 3.79], [3, 2, 2000, 4.99],
  [0, 3, 2000, 5.49], [0, 3, 10000, 7.49], [0, 3, 20000, 10.49],
  [1, 3, 2000, 7.29], [1, 3, 10000, 9.99], [1, 3, 20000, 13.49],
  [2, 3, 2000, 6.25], [2, 3, 10000, 8.25], [2, 3, 20000, 11.25],
  [3, 3, 2000, 7.85], [3, 3, 10000, 10.45], [3, 3, 20000, 14.45],
  [4, 0, 100, 8.75], [4, 1, 750, 9.95], [4, 2, 2000, 11.95], [4, 3, 10000, 19.95], [4, 3, 20000, 26.95],
];
export const royalMail: CustomCalculator = (v) => {
  const service = pick(v.service, 5);
  const format = pick(v.format, 4);
  const g = nonNeg(v.grams);
  const bands = ROYAL_MAIL.filter(([s, f, max]) => s === service && f === format && g <= max).sort((a, b) => a[2] - b[2]);
  const qty = Math.max(1, Math.round(nonNeg(v.quantity, 1)));
  if (!bands.length) return { pricePerItem: 0, totalPrice: 0, weightBandGrams: 0, notAvailable: 1, firstClassStampsEquivalent: 0 };
  const price = bands[0][3] * (1 + safeNumber(v.rateAdjust) / 100);
  return { pricePerItem: round2(price), totalPrice: round2(price * qty), weightBandGrams: bands[0][2], notAvailable: 0, firstClassStampsEquivalent: ceil(price / 1.7) };
};

// --- Postage & delivery ------------------------------------------------------------------------------------
export const eddm: CustomCalculator = (v) => {
  const pieces = Math.round(nonNeg(v.pieces));
  const postage = pieces * nonNeg(v.postagePerPiece);
  const printing = pieces * nonNeg(v.printPerPiece);
  const total = postage + printing + nonNeg(v.design);
  const responses = pieces * (nonNeg(v.responseRate) / 100);
  const customers = responses * (nonNeg(v.conversionRate) / 100);
  return { totalCost: round2(total), postageCost: round2(postage), printingCost: round2(printing), costPerPiece: round2(pieces ? total / pieces : 0), expectedResponses: round2(responses), newCustomers: round2(customers), costPerCustomer: round2(customers ? total / customers : 0), roiPercent: round2(total ? ((customers * nonNeg(v.customerValue) - total) / total) * 100 : 0), bundlesOf100: ceil(pieces / 100) };
};

export const deliveryFee: CustomCalculator = (v) => {
  const miles = nonNeg(v.miles);
  const extraMiles = Math.max(0, miles - nonNeg(v.includedMiles));
  const distance = extraMiles * nonNeg(v.perMile);
  const weight = Math.max(0, nonNeg(v.weight) - nonNeg(v.includedWeight)) * nonNeg(v.perLb);
  const small = nonNeg(v.orderValue) < nonNeg(v.smallOrderThreshold) ? nonNeg(v.smallOrderFee) : 0;
  let fee = nonNeg(v.baseFee) + distance + weight + small;
  fee *= 1 + nonNeg(v.peakSurcharge) / 100;
  const free = nonNeg(v.freeOver) > 0 && nonNeg(v.orderValue) >= nonNeg(v.freeOver);
  const charged = free ? 0 : Math.max(nonNeg(v.minimumFee), fee);
  const cost = miles * 2 * nonNeg(v.driverCostPerMile);
  return { deliveryFee: round2(charged), distanceCharge: round2(distance), weightCharge: round2(weight), smallOrderFee: round2(small), feeAsPercentOfOrder: round2(nonNeg(v.orderValue) ? (charged / nonNeg(v.orderValue)) * 100 : 0), yourRoundTripCost: round2(cost), profitPerDelivery: round2(charged - cost) };
};

export const shippingBox: CustomCalculator = (v) => {
  const nx = Math.max(1, Math.round(nonNeg(v.across, 1)));
  const ny = Math.max(1, Math.round(nonNeg(v.deep, 1)));
  const nz = Math.max(1, Math.round(nonNeg(v.layers, 1)));
  const pad = nonNeg(v.padding) * 2;
  const L = nonNeg(v.itemLength) * nx + pad;
  const W = nonNeg(v.itemWidth) * ny + pad;
  const H = nonNeg(v.itemHeight) * nz + pad;
  const s = [L, W, H].sort((a, b) => b - a);
  const vol = L * W * H;
  const outer = (x: number) => x + 2 * nonNeg(v.wallThickness, 0.25);
  const ovol = outer(L) * outer(W) * outer(H);
  const weight = nonNeg(v.itemWeight) * nx * ny * nz + ovol / 1728 * 0.9;
  return { innerLengthIn: round2(s[0]), innerWidthIn: round2(s[1]), innerHeightIn: round2(s[2]), itemsPerBox: nx * ny * nz, boxCubicFeet: round2(ovol / 1728), dimWeight139: ceil(ovol / 139), dimWeightUsps166: ovol > 1728 ? ceil(ovol / 166) : 0, estimatedPackedWeightLb: round2(weight), lengthPlusGirthIn: round2(outer(s[0]) + 2 * (outer(s[1]) + outer(s[2]))), voidFillCubicIn: round2(vol - nonNeg(v.itemLength) * nonNeg(v.itemWidth) * nonNeg(v.itemHeight) * nx * ny * nz) };
};

export const lengthGirth: CustomCalculator = (v) => {
  const { L, W, H, girth } = dims(v);
  const w = nonNeg(v.weight);
  return { lengthPlusGirthIn: round2(girth), girthIn: round2(2 * (W + H)), longestSideIn: round2(L), uspsOk: girth <= 108 && w <= 70 ? 1 : 0, uspsGroundAdvantageOk: girth <= 130 && w <= 70 ? 1 : 0, upsFedexOk: girth <= 165 && L <= 108 && w <= 150 ? 1 : 0, largePackageSurcharge: girth > 130 || L > 96 ? 1 : 0, additionalHandling: L > 48 || W > 30 || w > 50 ? 1 : 0, cubicFeet: round2((L * W * H) / 1728) };
};

/** Board grades: [label, ECT lb/in, caliper in]. */
export const BOARDS: [string, number, number][] = [["32 ECT single wall (C flute)", 32, 0.16], ["44 ECT single wall", 44, 0.17], ["48 ECT double wall", 48, 0.25], ["51 ECT double wall", 51, 0.27], ["61 ECT double wall", 61, 0.28], ["71 ECT double wall", 71, 0.29], ["29 ECT single wall (B flute)", 29, 0.125]];
export const boxCompression: CustomCalculator = (v) => {
  const [, ect, cal] = BOARDS[pick(v.board, BOARDS.length)];
  const per = 2 * (nonNeg(v.length) + nonNeg(v.width));
  const bct = 5.87 * ect * Math.sqrt(per * cal);
  const sf = Math.max(1, nonNeg(v.safetyFactor, 4));
  const safe = bct / sf;
  const bw = nonNeg(v.boxWeight);
  const maxStack = bw > 0 ? Math.floor(safe / bw) + 1 : 0;
  const stackH = Math.round(nonNeg(v.stackHeight));
  const load = Math.max(0, stackH - 1) * bw;
  return { boxCompressionLb: round2(bct), safeStackingLoadLb: round2(safe), maxBoxesInStack: maxStack, loadOnBottomBoxLb: round2(load), passes: stackH > 0 && load <= safe ? 1 : 0, perimeterIn: round2(per) };
};

// --- Ecommerce -----------------------------------------------------------------------------------------------
/** Japan → US approximate: [label, base (≤0.5 kg) JPY, per extra 0.5 kg JPY, min days, max days, max kg]. */
export const JP_METHODS: [string, number, number, number, number, number][] = [["EMS", 3900, 1000, 3, 7, 30], ["Airmail (small packet / parcel)", 2300, 700, 7, 14, 30], ["SAL / economy air", 1800, 450, 14, 28, 30], ["Surface (sea mail)", 3000, 350, 45, 90, 30], ["FedEx / DHL via proxy", 5200, 1300, 2, 5, 68]];
export const japanProxy: CustomCalculator = (v) => {
  const fx = Math.max(1, nonNeg(v.jpyPerUsd, 150));
  const [, base, step, dmin, dmax, max] = JP_METHODS[pick(v.method, JP_METHODS.length)];
  const kg = nonNeg(v.weightKg);
  const halfKgSteps = Math.max(0, ceil(kg / 0.5) - 1);
  const intlJpy = (base + step * halfKgSteps) * (1 + safeNumber(v.rateAdjust) / 100);
  const jpy = nonNeg(v.itemPriceJpy) + nonNeg(v.domesticShippingJpy) + nonNeg(v.serviceFeeJpy) + intlJpy + nonNeg(v.optionsJpy);
  const paymentFee = jpy * (nonNeg(v.paymentFee) / 100);
  const totalJpy = jpy + paymentFee;
  const itemUsd = nonNeg(v.itemPriceJpy) / fx;
  const duty = itemUsd * (nonNeg(v.tariff) / 100);
  const totalUsd = totalJpy / fx + duty + nonNeg(v.brokerFee);
  return { totalUsd: round2(totalUsd), totalJpy: round2(totalJpy), internationalShippingJpy: round2(intlJpy), internationalShippingUsd: round2(intlJpy / fx), importDutyUsd: round2(duty), feesUsd: round2((nonNeg(v.serviceFeeJpy) + paymentFee + nonNeg(v.optionsJpy)) / fx + nonNeg(v.brokerFee)), transitDaysMin: dmin, transitDaysMax: dmax, overLimit: kg > max ? 1 : 0, markupOverItemPercent: round2(itemUsd ? ((totalUsd - itemUsd) / itemUsd) * 100 : 0) };
};

/** Average Shopify Shipping label discount vs retail by plan: [USPS, UPS, DHL Express]. */
export const SHOPIFY_DISCOUNT: [string, number, number, number][] = [["Basic", 0.2, 0.4, 0.55], ["Grow / Shopify", 0.22, 0.45, 0.6], ["Advanced", 0.24, 0.5, 0.65], ["Plus", 0.24, 0.5, 0.65]];
export const shopifyShipping: CustomCalculator = (v) => {
  const plan = SHOPIFY_DISCOUNT[pick(v.plan, SHOPIFY_DISCOUNT.length)];
  const carrier = pick(v.carrier, 3);
  const zone = v.zone;
  let retail: number;
  if (carrier === 0) retail = svcPrice(USPS[pick(v.speed, 3) === 0 ? 0 : 1], billable(v, 166, true).bill, zone);
  else if (carrier === 1) retail = svcPrice(UPS[[0, 2, 4][pick(v.speed, 3)]], billable(v, 139).bill, zone) * 1.28 * 1.2;
  else retail = 70 * (1 + 0.05 * (zoneOf(zone) - 2)) + 6 * Math.max(0, billable(v, 139).bill - 1);
  retail *= 1 + safeNumber(v.rateAdjust) / 100;
  const disc = plan[1 + carrier] as number;
  const label = retail * (1 - disc);
  const charged = nonNeg(v.chargedToCustomer);
  return { labelCost: round2(label), retailRate: round2(retail), savings: round2(retail - label), discountPercent: round2(disc * 100), shippingProfit: round2(charged - label), monthlyLabelSpend: round2(label * nonNeg(v.ordersPerMonth)), monthlySavings: round2((retail - label) * nonNeg(v.ordersPerMonth)) };
};

export function wfsFee(lb: number) {
  if (lb <= 1) return 3.45;
  if (lb <= 2) return 4.95;
  if (lb <= 3) return 5.45;
  if (lb <= 20) return 5.75 + 0.4 * Math.max(0, ceil(lb) - 4);
  if (lb <= 30) return 15.55 + 0.4 * Math.max(0, ceil(lb) - 21);
  if (lb <= 50) return 14.55 + 0.4 * Math.max(0, ceil(lb) - 31);
  return 17.55 + 0.4 * Math.max(0, ceil(lb) - 51);
}
export const walmartWfs: CustomCalculator = (v) => {
  const { vol } = dims(v);
  const dimLb = vol / 139;
  const ship = Math.max(nonNeg(v.weight), dimLb);
  let fulfil = wfsFee(ship);
  if (nonNeg(v.price) < 10) fulfil += 1;
  if (yes(v.apparel)) fulfil += 0.5;
  if (yes(v.hazmat)) fulfil += 0.5;
  const referral = nonNeg(v.price) * (nonNeg(v.referralRate, 15) / 100);
  const storage = (vol / 1728) * (pick(v.season, 2) === 1 ? 2.25 : 0.75) * nonNeg(v.monthsStored, 1);
  const fees = fulfil + referral + storage;
  const profit = nonNeg(v.price) - fees - nonNeg(v.cost) - nonNeg(v.inboundPerUnit);
  return { totalWfsFees: round2(fees), fulfillmentFee: round2(fulfil), referralFee: round2(referral), storageFee: round2(storage), shippingWeightLb: round2(ship), profitPerUnit: round2(profit), profitMarginPercent: round2(nonNeg(v.price) ? (profit / nonNeg(v.price)) * 100 : 0), roiPercent: round2(nonNeg(v.cost) ? (profit / nonNeg(v.cost)) * 100 : 0) };
};

export const acos: CustomCalculator = (v) => {
  const spend = nonNeg(v.adSpend);
  const adSales = nonNeg(v.adSales);
  const total = Math.max(adSales, nonNeg(v.totalSales));
  const price = nonNeg(v.price);
  const marginBeforeAds = price ? ((price - nonNeg(v.unitCost) - nonNeg(v.amazonFees)) / price) * 100 : 0;
  const a = adSales ? (spend / adSales) * 100 : 0;
  const units = price ? adSales / price : 0;
  const adProfit = units * (price - nonNeg(v.unitCost) - nonNeg(v.amazonFees)) - spend;
  return { acosPercent: round2(a), roas: round2(spend ? adSales / spend : 0), breakEvenAcosPercent: round2(marginBeforeAds), tacosPercent: round2(total ? (spend / total) * 100 : 0), profitFromAdSales: round2(adProfit), targetAcosForProfitPercent: round2(Math.max(0, marginBeforeAds - nonNeg(v.targetProfit))), costPerOrder: round2(units ? spend / units : 0) };
};

export const rateComparison: CustomCalculator = (v) => {
  const speed = pick(v.speed, 3); // 0 ground/economy, 1 2-day, 2 overnight
  const u = billable(v, 166, true).bill;
  const b = billable(v, 139).bill;
  const adj = 1 + safeNumber(v.rateAdjust) / 100;
  const uspsI = [0, 1, 2][speed];
  let usps = svcPrice(USPS[uspsI], u, v.zone) * adj * (pick(v.pricing, 2) === 1 ? USPS_COMMERCIAL[uspsI] : 1);
  if (dims(v).girth > (uspsI === 0 ? 130 : 108) || nonNeg(v.weight) > 70) usps = 0;
  const q = (t: Svc[], idx: number) => carrierQuote(t, { ...v, service: idx, declaredValue: 0, rateAdjust: safeNumber(v.rateAdjust) }, 1).shippingCost as number;
  const ups = q(UPS, [0, 2, 4][speed]);
  const fedex = q(FEDEX, [0, 2, 4][speed]);
  const options = [usps, ups, fedex].map((x, i) => [x, i] as [number, number]).filter(([x]) => x > 0).sort((a, b2) => a[0] - b2[0]);
  return { cheapestPrice: round2(options[0]?.[0] ?? 0), cheapestCarrier: options.length ? options[0][1] + 1 : 0, uspsPrice: round2(usps), upsPrice: round2(ups), fedexPrice: round2(fedex), spread: round2(options.length > 1 ? options[options.length - 1][0] - options[0][0] : 0), billableWeightUsps: u, billableWeightUpsFedex: b };
};

/** Import scenarios: [label, additional tariff %]. */
export const CA_SCENARIOS: [string, number][] = [["USMCA-qualifying goods (exempt)", 0], ["Non-USMCA goods (IEEPA)", 35], ["Energy / potash, non-USMCA", 10], ["Steel, aluminum or copper (Sec. 232)", 50], ["Autos / parts, non-US content (Sec. 232)", 25], ["Custom rate (enter below)", -1]];
export const UK_SCENARIOS: [string, number][] = [["Most goods (UK deal baseline)", 10], ["Cars within UK quota", 7.5], ["Steel / aluminum (UK rate)", 25], ["Aerospace parts (exempt)", 0], ["Custom rate (enter below)", -1]];
function usImport(v: Record<string, number>, scenarios: [string, number][]) {
  const value = nonNeg(v.goodsValue);
  const sc = scenarios[pick(v.scenario, scenarios.length)][1];
  const extra = sc < 0 ? nonNeg(v.customTariff) : sc;
  const mfn = nonNeg(v.mfnRate);
  const duty = value * (mfn / 100);
  const tariff = value * (extra / 100);
  const formal = value > 2500;
  const mpf = formal ? Math.min(651.5, Math.max(33.58, value * 0.003464)) : 2.69;
  const hmf = yes(v.ocean) ? value * 0.00125 : 0;
  const total = duty + tariff + mpf + hmf + nonNeg(v.brokerFee);
  const landed = value + nonNeg(v.freight) + nonNeg(v.insurance) + total;
  return { totalImportCharges: round2(total), dutyMfn: round2(duty), additionalTariff: round2(tariff), mpf: round2(mpf), hmf: round2(hmf), landedCost: round2(landed), landedPerUnit: round2(landed / Math.max(1, nonNeg(v.units, 1))), effectiveRatePercent: round2(value ? (total / value) * 100 : 0) };
}
export const canadaToUs: CustomCalculator = (v) => usImport(v, CA_SCENARIOS);
export const ukToUs: CustomCalculator = (v) => usImport(v, UK_SCENARIOS);

export const perishable: CustomCalculator = (v) => {
  const overnight = pick(v.service, 2) === 0;
  const hours = Math.max(12, nonNeg(v.transitHours, overnight ? 24 : 48));
  const days = hours / 24;
  const iceLb = pick(v.coolant, 3) === 1 ? ceil(nonNeg(v.dryIcePerDay, 7.5) * days) : 0;
  const gelPacks = pick(v.coolant, 3) === 0 ? ceil(nonNeg(v.productWeight) / 4 * days) : 0;
  const packedWeight = nonNeg(v.productWeight) + iceLb + gelPacks * 1.5 + nonNeg(v.boxWeight, 4);
  const svc = overnight ? FEDEX[3] : FEDEX[2];
  const rate = svcPrice(svc, ceil(Math.max(packedWeight, (nonNeg(v.length) * nonNeg(v.width) * nonNeg(v.height)) / 139)), v.zone);
  const residential = yes(v.residential) ? 6.6 : 0;
  const dryIceFee = iceLb > 0 ? 6.5 : 0;
  const pre = (rate + residential + dryIceFee) * (1 + safeNumber(v.rateAdjust) / 100);
  const ship = pre * 1.22;
  const packaging = nonNeg(v.insulatedBoxCost) + gelPacks * nonNeg(v.gelPackCost) + iceLb * nonNeg(v.dryIceCostPerLb);
  return { totalCost: round2(ship + packaging), shippingCost: round2(ship), packagingCoolantCost: round2(packaging), dryIceLb: iceLb, gelPacks, packedWeightLb: round2(packedWeight), costPerProductLb: round2(nonNeg(v.productWeight) ? (ship + packaging) / nonNeg(v.productWeight) : 0) };
};

export const parcelAudit: CustomCalculator = (v) => {
  const spend = nonNeg(v.annualSpend);
  const refunds = spend * (nonNeg(v.lateRate) / 100) * (nonNeg(v.guaranteedShare) / 100);
  const billing = spend * (nonNeg(v.billingErrorRate) / 100);
  const gross = refunds + billing;
  const fee = pick(v.feeModel, 2) === 0 ? gross * (nonNeg(v.contingencyFee) / 100) : nonNeg(v.flatFee) * 12;
  const net = gross - fee;
  return { netAnnualSavings: round2(net), grossRecovery: round2(gross), lateDeliveryRefunds: round2(refunds), billingErrorRecovery: round2(billing), auditFee: round2(fee), roiPercent: round2(fee ? (net / fee) * 100 : 0), savingsPercentOfSpend: round2(spend ? (net / spend) * 100 : 0) };
};

// --- Transit time ---------------------------------------------------------------------------------------------
/** USPS service standards (days): [label, by zone 1–8]. */
export const USPS_DAYS: [string, number[]][] = [["First-Class Mail (letters & flats)", [2, 2, 3, 3, 4, 4, 5, 5]], ["Ground Advantage", [2, 2, 3, 3, 4, 4, 5, 5]], ["Priority Mail", [1, 1, 2, 2, 2, 3, 3, 3]], ["Priority Mail Express", [1, 1, 1, 2, 2, 2, 2, 2]], ["Media Mail / Library Mail", [2, 3, 4, 5, 6, 7, 8, 8]], ["Marketing Mail", [3, 3, 4, 5, 6, 7, 8, 10]]];
function zoneFromMiles(m: number) {
  const max = [50, 150, 300, 600, 1000, 1400, 1800];
  const z = max.findIndex((x) => m <= x);
  return z === -1 ? 8 : z + 1;
}
function deliveryOut(start: number, transit: number, skipHolidays: boolean, saturday: boolean, cutoffMissed: boolean) {
  const ship = cutoffMissed ? addBusinessDays(start, 1, skipHolidays) : start;
  const deliver = addBusinessDays(ship, transit, skipHolidays, saturday);
  return { estimatedDeliveryDate: deliver, shipDate: ship, transitBusinessDays: transit, calendarDays: deliver - start };
}
export const uspsDeliveryTime: CustomCalculator = (v) => {
  const svc = USPS_DAYS[pick(v.service, USPS_DAYS.length)];
  const zone = pick(v.mode, 2) === 0 ? zoneOf(v.zone) : zoneFromMiles(nonNeg(v.miles));
  const start = safeNumber(v.shipDate, today());
  return { ...deliveryOut(start, svc[1][zone - 1], true, pick(v.service, USPS_DAYS.length) !== 4, yes(v.afterCutoff)), zone };
};
const UPS_DAYS = [0, 3, 2, 1, 1];
export const upsTransit: CustomCalculator = (v) => {
  const i = pick(v.service, 5);
  const zone = pick(v.mode, 2) === 0 ? zoneOf(v.zone) : zoneFromMiles(nonNeg(v.miles));
  const t = i === 0 ? GROUND_DAYS[zone - 1] : UPS_DAYS[i];
  return { ...deliveryOut(safeNumber(v.shipDate, today()), t, true, yes(v.saturday), yes(v.afterCutoff)), zone };
};
export const fedexTransit: CustomCalculator = (v) => {
  const i = pick(v.service, 5);
  const zone = pick(v.mode, 2) === 0 ? zoneOf(v.zone) : zoneFromMiles(nonNeg(v.miles));
  const t = i === 0 ? GROUND_DAYS[zone - 1] : UPS_DAYS[i];
  return { ...deliveryOut(safeNumber(v.shipDate, today()), t, true, i === 0 ? yes(v.residential) : yes(v.saturday), yes(v.afterCutoff)), zone };
};
export const shippingTime: CustomCalculator = (v) => {
  const start = safeNumber(v.orderDate, today());
  const handled = addBusinessDays(start, nonNeg(v.processingDays), yes(v.skipHolidays));
  const minD = addBusinessDays(handled, nonNeg(v.transitMin), yes(v.skipHolidays), yes(v.saturday));
  const maxD = addBusinessDays(handled, Math.max(nonNeg(v.transitMin), nonNeg(v.transitMax)), yes(v.skipHolidays), yes(v.saturday));
  return { earliestDelivery: minD, latestDelivery: maxD, shipDate: handled, totalBusinessDaysMax: Math.round(nonNeg(v.processingDays) + Math.max(nonNeg(v.transitMin), nonNeg(v.transitMax))), calendarDaysMax: maxD - start };
};

export const bizShippingCustomCalculators: Record<string, CustomCalculator> = {
  "usps-shipping-calculator": uspsShipping,
  "ground-advantage-calculator": groundAdvantage,
  "media-mail-calculator": mediaMail,
  "ups-shipping-calculator": upsShipping,
  "fedex-shipping-calculator": fedexShipping,
  "dhl-shipping-calculator": dhlShipping,
  "usps-international-shipping-calculator": uspsInternational,
  "ups-international-shipping-calculator": upsInternational,
  "fedex-international-shipping-calculator": fedexInternational,
  "royal-mail-shipping-calculator": royalMail,
  "eddm-postage-calculator": eddm,
  "delivery-fee-calculator": deliveryFee,
  "shipping-box-calculator": shippingBox,
  "length-girth-calculator": lengthGirth,
  "box-compression-calculator": boxCompression,
  "japan-proxy-shipping-calculator": japanProxy,
  "shopify-shipping-calculator": shopifyShipping,
  "walmart-wfs-fee-calculator": walmartWfs,
  "amazon-acos-calculator": acos,
  "shipping-rate-comparison-calculator": rateComparison,
  "canada-to-us-import-duty-calculator": canadaToUs,
  "uk-to-us-tariff-calculator": ukToUs,
  "perishable-shipping-calculator": perishable,
  "parcel-audit-roi-calculator": parcelAudit,
  "usps-delivery-time-calculator": uspsDeliveryTime,
  "ups-transit-time-calculator": upsTransit,
  "fedex-transit-time-calculator": fedexTransit,
  "shipping-time-calculator": shippingTime,
};
