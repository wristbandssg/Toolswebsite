/**
 * Batch: Vehicle keyword check (13 Nov 2026), government-fee part, 22 tools:
 *  - 16 more state vehicle registration fee pages (Law & Government > Government Fees). Same
 *    hybrid state policy and result shape as the 21 pages in calc-engine-law-gov.ts, but with its
 *    own state table here (fees are 2026 typical figures with a fee-override input; the rule text
 *    says which parts are statutory and which are estimates).
 *  - Texas tax, title & license (TTL): 6.25% motor vehicle tax (or the $90 new-resident tax,
 *    or 6.25% of 80% SPV on private sales) + title + registration + local + inspection fees.
 *  - BAC for driving (Widmark formula) — Law & Government > Court, Criminal.
 *  - Car sales tax for Kentucky, North Carolina (Highway Use Tax), Wisconsin and Pennsylvania
 *    (Shopping > Sales Tax), same outputs as the existing 29 state car sales tax pages.
 */

import { type TrvCalculator as VehCalculator, InputError, pos, pick, r1, r2, nfmt } from "./trv-core";

// ------------------------------------------------------------ registration
export type RegInput = "value" | "msrp" | "age" | "weight" | "fuel" | "local" | "mill" | "purchase";
export interface RegFees { registration: number; valueTax: number; weightFee: number; other: number }
export interface VehReg { name: string; slug: string; years: number; inputs: RegInput[]; defaults: { value: number; age: number; weight: number; local: number; mill: number }; valueLabel: string; rule: string; fn: (v: Record<string, number>) => RegFees }

const fuelOf = (v: Record<string, number>) => pick(v.fuelType, 3); // 0 gas, 1 hybrid, 2 electric
const ageOf = (v: Record<string, number>) => Math.round(pos(v.vehicleAge));
const val = (v: Record<string, number>) => pos(v.vehicleValue);
const wt = (v: Record<string, number>) => pos(v.vehicleWeight, 3500);
const loc = (v: Record<string, number>, d: number) => (v.localFees === undefined ? d : pos(v.localFees));
const mills = (v: Record<string, number>, d: number) => (v.millageRate === undefined ? d : pos(v.millageRate));
const evFee = (v: Record<string, number>, hybrid: number, ev: number) => [0, hybrid, ev][fuelOf(v)];
const D = (value: number, age: number, weight: number, local: number, mill = 0) => ({ value, age, weight, local, mill });
const R = (name: string, years: number, inputs: RegInput[], defaults: VehReg["defaults"], valueLabel: string, rule: string, fn: VehReg["fn"]): VehReg => ({ name, slug: `${name.toLowerCase().replace(/ /g, "-")}-vehicle-registration-fee-calculator`, years, inputs, defaults, valueLabel, rule, fn });

export const VEH_REG: VehReg[] = [
  R("Michigan", 1, ["msrp", "age", "fuel", "local"], D(35000, 2, 3500, 5), "Base MSRP (list price when new)", "Michigan plate fees for 1984+ passenger vehicles are set by the MSRP when new (MCL 257.801), about 0.47% of MSRP in the first year (estimated scale), 90% of that in year 2, 90% of year 2 in year 3, and 90% of year 3 from year 4 on. Electric vehicles add about $140 and hybrids about $47 a year; the Secretary of State service fee is $5.", (v) => {
    const a = Math.min(3, ageOf(v)), base = val(v) * 0.0047 * 0.9 ** a;
    return { registration: Math.max(30, base), valueTax: 0, weightFee: 0, other: evFee(v, 47.25, 140.75) + loc(v, 5) };
  }),
  R("North Carolina", 1, ["value", "fuel", "mill", "purchase", "local"], D(30000, 2, 3500, 0, 0.8), "Vehicle Tax Value", "Private passenger registration about $46.25 a year plus the county/city property tax on the vehicle (tag & tax together; enter your combined rate per $100 — default 0.80%). On purchase, the 3% Highway Use Tax is paid once (see the NC car sales tax calculator). Electric vehicles pay an extra $140.25 a year and plug-in hybrids $70.25.", (v) => ({
    registration: 46.25, valueTax: (val(v) * mills(v, 0.8)) / 100 + (pick(v.isPurchase, 2) === 1 ? val(v) * 0.03 : 0), weightFee: 0, other: evFee(v, 70.25, 140.25) + loc(v, 0),
  })),
  R("Washington", 1, ["msrp", "age", "weight", "fuel", "local"], D(35000, 2, 3500, 20), "Base MSRP (for the Sound Transit RTA tax)", "Basic fee $30 + filing and service fees ($12.50) + weight fee ($25 up to 4,000 lb, $45 to 6,000 lb, $65 to 8,000 lb, $72 above) + the Sound Transit RTA excise of 1.1% of the depreciated MSRP if you live in the RTA district (enter 0% outside it) + local transportation benefit district fees. Electric vehicles pay $225 a year ($150 + $75) and hybrids $75.", (v) => {
    const w = wt(v), dep = [0.95, 0.84, 0.72, 0.62, 0.53, 0.45, 0.38, 0.31, 0.25, 0.19, 0.15, 0.12, 0.1][Math.min(12, ageOf(v))];
    const rta = v.rtaPercent === undefined ? 1.1 : pos(v.rtaPercent);
    return { registration: 42.5, valueTax: (val(v) * dep * rta) / 100, weightFee: w <= 4000 ? 25 : w <= 6000 ? 45 : w <= 8000 ? 65 : 72, other: evFee(v, 75, 225) + loc(v, 20) };
  }),
  R("Minnesota", 1, ["msrp", "age", "fuel", "local"], D(35000, 2, 3500, 12), "Base Value (MSRP when new)", "Minn. Stat. §168.013: registration tax of $10 plus 1.25% of the base value, reduced to 90%, 80% … 10% of the base value in years 2–10 (minimum $35 from year 11), plus the filing and technology fees (default $12). Electric vehicles pay an extra $75 a year.", (v) => {
    const a = ageOf(v), tax = a >= 10 ? 35 : 10 + val(v) * 0.0125 * (1 - 0.1 * a);
    return { registration: 0, valueTax: Math.max(35, tax), weightFee: 0, other: evFee(v, 0, 75) + loc(v, 12) };
  }),
  R("Tennessee", 1, ["fuel", "local"], D(30000, 2, 3500, 50), "Vehicle Value", "State passenger registration $26.50 (Class A) plus the county wheel tax and clerk fees (default $50 — counties range from $0 to about $100). Electric vehicles pay an extra fee of about $274 a year in 2026 (it rises yearly under 2023 law).", (v) => ({ registration: 26.5, valueTax: 0, weightFee: 0, other: evFee(v, 0, 274) + loc(v, 50) })),
  R("Virginia", 1, ["weight", "fuel", "local"], D(30000, 2, 3500, 33), "Vehicle Value", "Passenger vehicle registration $30.75 up to 4,000 lb or $35.75 above (plus $2 if you renew by mail), plus the local vehicle registration (decal) fee — default $33 — and the annual highway use fee for electric vehicles (about $134) and fuel-efficient hybrids. Personal property tax on the car is billed separately by your locality.", (v) => ({ registration: wt(v) <= 4000 ? 30.75 : 35.75, valueTax: 0, weightFee: 0, other: evFee(v, 0, 134.12) + loc(v, 33) })),
  R("New Jersey", 1, ["weight", "age", "fuel"], D(30000, 2, 3500, 0), "Vehicle Value", "Passenger vehicle registration by weight and model year: under 2,700 lb $46.50, 2,700–3,500 lb $59.50, over 3,500 lb $84 (vehicles less than 3 years old, typical figures); older vehicles pay less. Electric vehicles pay the annual zero-emission fee (about $270 for 2026, rising $10 a year).", (v) => {
    const w = wt(v), old = ageOf(v) >= 3;
    const fee = w < 2700 ? (old ? 35.5 : 46.5) : w <= 3500 ? (old ? 46.5 : 59.5) : old ? 71 : 84;
    return { registration: fee, valueTax: 0, weightFee: 0, other: evFee(v, 0, 270) };
  }),
  R("New Hampshire", 1, ["msrp", "age", "weight", "local"], D(35000, 2, 3500, 3), "Manufacturer's List Price (MSRP)", "RSA 261:153 municipal permit fee: MSRP × 18 mills in the current model year, then 15, 12, 9, 6 and 3 mills (year 6 on), paid to your town; plus the state registration fee by weight ($31.20 up to 3,000 lb, $43.20 to 5,000 lb, $55.20 to 8,000 lb) and a town agent fee (default $3).", (v) => {
    const m = [18, 15, 12, 9, 6, 3][Math.min(5, ageOf(v))], w = wt(v);
    return { registration: w <= 3000 ? 31.2 : w <= 5000 ? 43.2 : 55.2, valueTax: (val(v) * m) / 1000, weightFee: 0, other: loc(v, 3) };
  }),
  R("Alabama", 1, ["value", "fuel", "mill", "local"], D(30000, 2, 3500, 25, 33), "Current Market Value", "Registration $23 plus the ad valorem (property) tax: 15% of the vehicle's current value × your county/city millage (default 33 mills), plus issuance and county fees (default $25). Electric vehicles pay an extra $200 a year and plug-in hybrids $100.", (v) => ({ registration: 23, valueTax: val(v) * 0.15 * (mills(v, 33) / 1000), weightFee: 0, other: evFee(v, 100, 200) + loc(v, 25) })),
  R("Kentucky", 1, ["value", "fuel", "mill", "local"], D(25000, 3, 3500, 6, 1.1), "Assessed Value (trade-in value)", "Registration $21 plus the annual vehicle property tax: assessed value × the combined state (45¢) and local rates per $100 (default $1.10 total), plus the clerk fee (default $6). Electric vehicles pay an extra fee of about $120 a year and hybrids about $60 (2026, indexed).", (v) => ({ registration: 21, valueTax: (val(v) * mills(v, 1.1)) / 100, weightFee: 0, other: evFee(v, 60, 120) + loc(v, 6) })),
  R("Massachusetts", 2, ["msrp", "age", "local"], D(35000, 2, 3500, 0), "Manufacturer's List Price (MSRP)", "Passenger registration is $60 for two years. The motor vehicle excise ($25 per $1,000 of value, by MSRP and age) is billed each year by your city or town — the estimate shows two years of it; see the Massachusetts vehicle excise calculator for one bill.", (v) => {
    const pctOf = [0.9, 0.6, 0.4, 0.25, 0.1], a = Math.min(4, ageOf(v));
    const ex = (val(v) * pctOf[a] * 25) / 1000 + (val(v) * pctOf[Math.min(4, a + 1)] * 25) / 1000;
    return { registration: 60, valueTax: ex, weightFee: 0, other: loc(v, 0) };
  }),
  R("Louisiana", 2, ["value", "fuel", "local"], D(30000, 2, 3500, 8), "Vehicle Value", "Two-year license plate fee (license tax) of 0.1% of the vehicle's value per year, minimum $10 a year, plus the $8 handling fee and any parish fees. Electric vehicles pay an extra $110 a year and hybrids $60 (2023 law).", (v) => ({ registration: Math.max(20, val(v) * 0.001 * 2), valueTax: 0, weightFee: 0, other: 2 * evFee(v, 60, 110) + loc(v, 8) })),
  R("Idaho", 1, ["age", "fuel", "local"], D(30000, 2, 3500, 15), "Vehicle Value", "Annual passenger registration by vehicle age: 1–2 years about $69, 3–6 years $57, 7+ years $45 (typical 2026 figures), plus county option fees (default $15). Electric vehicles pay an extra $140 a year and hybrids $75.", (v) => {
    const a = ageOf(v);
    return { registration: a <= 2 ? 69 : a <= 6 ? 57 : 45, valueTax: 0, weightFee: 0, other: evFee(v, 75, 140) + loc(v, 15) };
  }),
  R("South Dakota", 1, ["weight", "age", "fuel", "local"], D(30000, 2, 3500, 0), "Vehicle Value", "SDCL 32-5-6: noncommercial auto fees by weight — about $30 up to 2,000 lb, $60 to 4,000 lb, $90 to 6,000 lb and $120 above (estimated) — reduced 30% once the vehicle is 5 years old; plus local fees. Electric vehicles pay an extra $50 a year.", (v) => {
    const w = wt(v), base = w <= 2000 ? 30 : w <= 4000 ? 60 : w <= 6000 ? 90 : 120;
    return { registration: ageOf(v) >= 5 ? base * 0.7 : base, valueTax: 0, weightFee: 0, other: evFee(v, 0, 50) + loc(v, 0) };
  }),
  R("Hawaii", 1, ["weight", "fuel", "local"], D(30000, 2, 3500, 20), "Vehicle Value", "State registration $45 + state vehicle weight tax (1.75¢/lb up to 4,000 lb, 2¢ to 7,000 lb, 2.25¢ to 10,000 lb) + county weight tax (Honolulu about the same rates) + county fees (default $20, beautification included). Electric vehicles pay the $50 state road usage fee.", (v) => {
    const w = wt(v), rate = w <= 4000 ? 0.0175 : w <= 7000 ? 0.02 : 0.0225;
    return { registration: 45, valueTax: 0, weightFee: w * rate * 2, other: evFee(v, 0, 50) + loc(v, 20) };
  }),
  R("Mississippi", 1, ["value", "mill", "local"], D(30000, 2, 3500, 15, 110), "Assessed Value (from the state's value schedule)", "Car tag = registration $14 + road & bridge privilege tax $15 + ad valorem tax: 30% of the assessed value × your local millage (default 110 mills), less the legislative tag credit (applied by your county), plus county fees (default $15). Ad valorem is most of the bill on newer cars.", (v) => ({ registration: 29, valueTax: val(v) * 0.3 * (mills(v, 110) / 1000), weightFee: 0, other: loc(v, 15) })),
];

export const vehRegistration = (s: VehReg): VehCalculator => (v) => {
  const f = s.fn(v), override = pos(v.registrationFeeOverride), reg = override > 0 ? override : f.registration;
  const total = reg + f.valueTax + f.weightFee + f.other;
  return { totalRegistrationCost: r2(total), registrationFee: r2(reg), valueBasedTax: r2(f.valueTax), weightFee: r2(f.weightFee), otherFees: r2(f.other), monthlyEquivalent: r2(total / (12 * s.years)) };
};

// --------------------------------------------------------------- Texas TTL
export const texasTtl: VehCalculator = (v) => {
  const price = pos(v.price, 35000), trade = pos(v.trade, 0), deal = pick(v.deal, 3), spv = pos(v.spv, 0), fuel = pick(v.fuel, 3);
  let tax: number, base: number;
  if (deal === 2) { tax = 90; base = 0; }
  else {
    base = Math.max(0, price - trade);
    if (deal === 1 && spv > 0) base = Math.max(base, spv * 0.8);
    tax = base * 0.0625;
  }
  const title = pos(v.title, 33), reg = 50.75, local = v.local === undefined ? 10 : pos(v.local), insp = 7.5, proc = 4.75;
  const ev = fuel === 2 ? 400 : 0, regTotal = reg + local + insp + proc + ev;
  const doc = pos(v.doc, 225), otd = price - trade + tax + title + regTotal + doc;
  return { ttl: r2(tax + title + regTotal), tax: r2(tax), title: r2(title), reg: r2(regTotal), otd: r2(otd), base: r2(base), how: deal === 2 ? "New resident bringing a vehicle into Texas: flat $90 new-resident tax instead of the 6.25%" : `6.25% motor vehicle tax on ${deal === 1 && spv > 0 && base === spv * 0.8 ? "80% of the standard presumptive value (private sale)" : "the price less your trade-in"}${fuel === 2 ? " · electric vehicle: $400 at first registration (two years of the $200 fee)" : ""}` };
};

// --------------------------------------------------------------------- BAC
export const LIMITS: [string, number][] = [["US driver 21+ (0.08%)", 0.08], ["Utah / many countries (0.05%)", 0.05], ["Under 21 / zero tolerance (0.02%)", 0.02], ["Commercial driver (0.04%)", 0.04], ["UK England & Wales (0.08%)", 0.08], ["Scotland (0.05%)", 0.05]];
export const bacCalc: VehCalculator = (v) => {
  const male = pick(v.sex, 2) === 0, lb = pick(v.wu, 2) === 1 ? pos(v.weight, 80) * 2.20462 : pos(v.weight, 180);
  if (lb <= 0) throw new InputError("Enter your body weight.");
  const drinks = pos(v.drinks, 3), oz = drinks * pos(v.size, 0.6), hours = pos(v.hours, 2), r = male ? 0.73 : 0.66, beta = 0.015;
  const peak = (oz * 5.14) / (lb * r), bac = Math.max(0, peak - beta * hours), limit = LIMITS[pick(v.limit, LIMITS.length)][1];
  const toLimit = Math.max(0, (bac - limit) / beta), toZero = bac / beta;
  const state = bac >= limit ? `Over the ${nfmt(limit, 2)}% limit — do not drive` : bac > 0 ? `Under the ${nfmt(limit, 2)}% limit, but impaired — driving is still risky` : "No alcohol left in your blood (estimated)";
  return { bac: Math.round(bac * 1000) / 1000, state, toLimit: r1(toLimit), toZero: r1(toZero), peak: Math.round(peak * 1000) / 1000, oz: r2(oz), how: `Widmark: ${nfmt(oz, 2)} oz of alcohol × 5.14 ÷ (${nfmt(lb)} lb × ${r}) − 0.015 × ${nfmt(hours, 1)} h` };
};

// ------------------------------------------------------------ car sales tax
export interface SalesRule { rate: number; tradeCredit: boolean; localDefault: number; fees: number }
export const SALES: Record<string, SalesRule> = {
  kentucky: { rate: 6, tradeCredit: true, localDefault: 0, fees: 30 },
  "north-carolina": { rate: 3, tradeCredit: true, localDefault: 0, fees: 120 },
  wisconsin: { rate: 5, tradeCredit: true, localDefault: 0.5, fees: 250 },
  pennsylvania: { rate: 6, tradeCredit: true, localDefault: 0, fees: 160 },
};
export const carSalesTax = (s: SalesRule, opts: { cap?: (v: Record<string, number>) => number } = {}): VehCalculator => (v) => {
  const price = pos(v.price, 35000), trade = Math.min(pos(v.tradeIn), price + pos(v.docFee)), doc = pos(v.docFee), other = v.otherFees === undefined ? s.fees : pos(v.otherFees);
  const local = (v.localRate === undefined ? s.localDefault : pos(v.localRate)) / 100;
  const base = price + doc, taxable = Math.max(0, base - (s.tradeCredit ? trade : 0));
  let stateTax = taxable * (s.rate / 100);
  const cap = opts.cap ? opts.cap(v) : Infinity;
  stateTax = Math.min(stateTax, cap);
  const localTax = taxable * local, total = stateTax + localTax;
  const noCredit = Math.min(base * (s.rate / 100), cap) + base * local;
  return { salesTax: r2(total), stateTax: r2(stateTax), localTax: r2(localTax), taxablePrice: r2(taxable), tradeInTaxSavings: r2(Math.max(0, noCredit - total)), outTheDoorPrice: r2(price + doc + other + total - trade), effectiveRate: price > 0 ? r2((total / price) * 100) : 0 };
};
// NC Highway Use Tax: capped at $250 for vehicles a new resident brings in already titled elsewhere.
const ncCap = (v: Record<string, number>) => (pick(v.newResident, 2) === 1 ? 250 : Infinity);

export const vehGovCustomCalculators: Record<string, VehCalculator> = {
  ...Object.fromEntries(VEH_REG.map((s) => [s.slug, vehRegistration(s)])),
  "texas-tax-title-license-calculator": texasTtl,
  "bac-calculator": bacCalc,
  "kentucky-car-sales-tax-calculator": carSalesTax(SALES.kentucky),
  "north-carolina-car-sales-tax-calculator": carSalesTax(SALES["north-carolina"], { cap: ncCap }),
  "wisconsin-car-sales-tax-calculator": carSalesTax(SALES.wisconsin),
  "pennsylvania-car-sales-tax-calculator": carSalesTax(SALES.pennsylvania),
};
