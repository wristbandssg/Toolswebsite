// One-time (but safe to re-run) batch setup script: creates the 22 government-fee tools from the
// vehicle keyword check (13 Nov 2026 — Claude outputs/Vehicle_Build_Plan.json):
//  - 16 state vehicle registration fee calculators + Texas TTL (Law & Government > Government Fees)
//  - BAC calculator for driving (Law & Government > Court, Criminal & Legal Fee)
//  - Kentucky, North Carolina, Wisconsin, Pennsylvania car sales tax (Shopping > Sales Tax)
// Fee tables live in src/lib/calc-engine-veh-gov.ts; examples are computed from the engine.
// All tools are created Published.
//
// HOW TO RUN
//   npx tsx prisma/create-veh-gov-calculators.ts        (VEH_DRY=1 → check only, no database)
// or
//   npm run db:create-veh-gov-calculators

import * as E from "../src/lib/calc-engine-veh-gov";
import { mk, num, money, dd, pct, upsertTools, type ToolDef, type Line } from "./trv-tool-kit";
import { money as money$ } from "../src/lib/trv-core";

const C = E.vehGovCustomCalculators;
const usd = (x: unknown) => money$(Number(x), "$", Number.isInteger(Number(x)) ? 0 : 2);
const yn = (key: string, label: string, def = 0) => dd(key, label, ["No", "Yes"], def);
const FUEL = dd("fuelType", "Fuel Type", ["Gas / diesel", "Hybrid", "Electric"], 0);
const REG_RESULTS: Line[] = [["totalRegistrationCost", "Estimated Registration Cost", "c"], ["registrationFee", "Registration Fee", "c"], ["valueBasedTax", "Value / Age-Based Tax or Fee", "c"], ["weightFee", "Weight Fee", "c"], ["otherFees", "Other / Local Fees", "c"], ["monthlyEquivalent", "Per Month", "c"]];
const PER100 = new Set(["North Carolina", "Kentucky"]);

const REG: ToolDef[] = E.VEH_REG.map((s) => {
  const inputs: Record<string, unknown>[] = [];
  const d = s.defaults;
  if (s.inputs.includes("value") || s.inputs.includes("msrp")) inputs.push(money("vehicleValue", s.valueLabel, d.value, "$", 1000000));
  if (s.inputs.includes("age")) inputs.push(num("vehicleAge", "Vehicle Age (years since model year; 0 = new)", d.age, 0, 40, 1));
  if (s.inputs.includes("weight")) inputs.push(num("vehicleWeight", "Vehicle Weight (lb)", d.weight, 500, 20000, 50));
  if (s.inputs.includes("fuel")) inputs.push(FUEL);
  if (s.name === "Washington") inputs.push(num("rtaPercent", "Sound Transit RTA Tax (% — 0 outside the RTA district)", 1.1, 0, 2, 0.01));
  if (s.inputs.includes("mill")) inputs.push(PER100.has(s.name) ? num("millageRate", "Combined Property Tax Rate (per $100 of value)", d.mill, 0, 10, 0.01) : num("millageRate", "Local Millage (mills)", d.mill, 0, 400, 0.5));
  if (s.inputs.includes("purchase")) inputs.push(yn("isPurchase", "Just Bought the Vehicle (include the one-time 3% Highway Use Tax)?", 0));
  if (s.inputs.includes("local")) inputs.push(money("localFees", "County / Local Fees", d.local, "$", 5000));
  inputs.push(money("registrationFeeOverride", "Registration Fee From Your Notice (0 = estimate)", 0, "$", 5000));
  const ex: Record<string, number> = { vehicleValue: d.value, vehicleAge: d.age, vehicleWeight: d.weight, fuelType: 0, rtaPercent: 1.1, millageRate: d.mill, isPurchase: 0, localFees: d.local, registrationFeeOverride: 0 };
  const two = s.years === 2, valued = s.inputs.includes("value") || s.inputs.includes("msrp");
  const parts = [valued ? `a ${usd(d.value)} vehicle` : "a typical passenger car", s.inputs.includes("age") ? `${d.age} years old` : "", s.inputs.includes("weight") ? `${d.weight.toLocaleString()} lb` : ""].filter(Boolean).join(", ");
  const o = E.vehRegistration(s)(ex);
  return mk({
    slug: s.slug, title: `${s.name} Vehicle Registration Fee Calculator`,
    meta: `${s.name} Car Registration Fee Calculator 2026`,
    desc: `Estimate ${s.name} car registration fees for 2026 — ${valued ? "value- and age-based taxes, " : ""}${s.inputs.includes("weight") ? "weight fees, " : ""}the registration fee, EV fees and local fees.`,
    inputs, results: REG_RESULTS, fn: C[s.slug], ex,
    exText: (r) => `Example: ${parts} — about ${usd(r.totalRegistrationCost)} ${two ? "for a two-year registration" : "a year"}${Number(r.valueBasedTax) ? `, including ${usd(r.valueBasedTax)} of value- or age-based tax` : ""}.`,
    how: `Enter your vehicle's details${valued ? ` (${s.valueLabel})` : ""} and local fees. If you have your renewal notice, enter its registration fee to replace the estimate.`,
    assume: `${s.rule} Some fixed amounts are typical 2026 figures, not official — your renewal notice or the state's fee estimator is authoritative.`,
    faq: [[`How much is car registration in ${s.name}?`, `For a typical car it's about ${usd(o.totalRegistrationCost)} ${two ? "every two years" : "a year"}, depending on ${valued ? "the vehicle's value and age" : s.inputs.includes("weight") ? "the vehicle's weight" : "the vehicle's age"} and local fees.`], [`Where do I renew my registration in ${s.name}?`, "Online through the state motor vehicle agency, by mail, or at a local office or county tag agency."]],
  });
});

REG.push(mk({
  slug: "texas-tax-title-license-calculator", title: "Texas Tax, Title & License (TTL) Calculator",
  meta: "Texas TTL Calculator — Tax, Title & License Fees 2026",
  desc: "Calculate Texas tax, title and license (TT&L) on a car — 6.25% motor vehicle sales tax, title fee, registration and local fees — and the out-the-door price.",
  inputs: [money("price", "Sales Price", 35000), money("trade", "Trade-In Value", 0), dd("deal", "Type of Purchase", ["From a dealer", "Private sale (SPV rule)", "New resident bringing a car to Texas"], 0), money("spv", "Standard Presumptive Value (private sales)", 0), dd("fuel", "Fuel", ["Gas / diesel", "Hybrid", "Electric"], 0), money("title", "Title Fee ($28 or $33 by county)", 33), money("local", "County Road & Bridge / Child Safety Fees", 10), money("doc", "Dealer Documentary Fee", 225)],
  results: [["ttl", "Total Tax, Title & License", "c"], ["tax", "Motor Vehicle Sales Tax", "c"], ["title", "Title Fee", "c"], ["reg", "Registration & Fees", "c"], ["otd", "Out-the-Door Price", "c"], ["base", "Taxable Amount", "c"], ["how", "Tax Rule Used", "t"]],
  fn: C["texas-tax-title-license-calculator"], ex: { price: 35000, trade: 0, deal: 0, spv: 0, fuel: 0, title: 33, local: 10, doc: 225 },
  exText: (o) => `Example: a $35,000 car from a Texas dealer with no trade-in → ${usd(o.tax)} of sales tax and ${usd(o.ttl)} total TT&L; out the door about ${usd(o.otd)}.`,
  how: "Texas charges 6.25% motor vehicle sales tax on the price less your trade-in. On a private sale the tax is on the greater of the price and 80% of the standard presumptive value (SPV); new residents pay a flat $90 instead.\n\nRegistration is $50.75 plus local fees, the $7.50 inspection program fee (since vehicle safety inspections ended in 2025) and $4.75 processing. Electric vehicles pay $400 at first registration for two years of the annual EV fee.",
  assume: "Tex. Tax Code ch. 152 and Transportation Code fees as of 2026. County fees differ; your county tax assessor-collector's figure is final. The dealer documentary fee isn't part of TT&L but is in the out-the-door price.",
  faq: [["What is TT&L in Texas?", "Tax, title and license: the 6.25% motor vehicle sales tax, the title fee and the registration fees you pay when you buy a car."], ["Does a trade-in reduce sales tax in Texas?", "Yes — the trade-in value is deducted before the 6.25% is applied."]],
}));

const COURT: ToolDef[] = [mk({
  slug: "bac-calculator", title: "Blood Alcohol (BAC) Calculator for Driving",
  meta: "BAC Calculator — Am I Over the Limit to Drive?",
  desc: "Estimate your blood alcohol concentration (BAC) from drinks, body weight, sex and time, and see how long until you're under the legal driving limit.",
  inputs: [dd("sex", "Sex", ["Male", "Female"], 0), num("weight", "Body Weight", 180, 50, 700, 1), dd("wu", "Weight Unit", ["lb", "kg"], 0), num("drinks", "Standard Drinks", 3, 0, 40, 0.5), num("size", "Alcohol per Drink (fl oz; US standard 0.6)", 0.6, 0.1, 3, 0.05), num("hours", "Hours Since the First Drink", 2, 0, 48, 0.25), dd("limit", "Legal Limit", E.LIMITS.map((l) => l[0]), 0)],
  results: [["bac", "Estimated BAC (%)", "n", 3], ["state", "Driving", "t"], ["toLimit", "Hours Until Under the Limit", "n", 1], ["toZero", "Hours Until 0.00%", "n", 1], ["peak", "Peak BAC (%)", "n", 3], ["oz", "Pure Alcohol (fl oz)", "n", 2], ["how", "Formula", "t"]],
  fn: C["bac-calculator"], ex: { sex: 0, weight: 180, wu: 0, drinks: 3, size: 0.6, hours: 2, limit: 0 },
  exText: (o) => `Example: a 180 lb man who had 3 standard drinks starting 2 hours ago → an estimated BAC of ${o.bac}% (${String(o.state).toLowerCase()}).`,
  how: "A US standard drink is 0.6 fl oz of pure alcohol: 12 oz of 5% beer, 5 oz of 12% wine or 1.5 oz of 40% spirits. Enter how many you've had, your weight and the time since you started.\n\nThe body clears about 0.015% BAC an hour; coffee, water or food don't speed that up.",
  assume: "Widmark formula with average body-water ratios (0.73 men, 0.66 women) and elimination of 0.015% per hour. It's an estimate only — real BAC varies with food, health, medication and drinking speed. Never use it to decide whether you can drive; the only safe limit is zero.",
  faq: [["How many drinks to reach 0.08 BAC?", "For a 180 lb man about 4 standard drinks in an hour; for a 140 lb woman about 2–3."], ["How long does it take for BAC to go down?", "About 0.015% per hour, so from 0.08% roughly 5–6 hours to reach zero."]],
})];

const SALES_RESULTS = (st: string): Line[] => [["salesTax", `${st} Car Sales Tax`, "c"], ["stateTax", "State Tax", "c"], ["localTax", "Local Tax", "c"], ["taxablePrice", "Taxable Price", "c"], ["tradeInTaxSavings", "Tax Saved by the Trade-In", "c"], ["outTheDoorPrice", "Out-the-Door Price", "c"], ["effectiveRate", "Tax as % of Car Price", "p"]];
function salesTool(key: string, st: string, desc: string, rule: string, faq: [string, string][], extra: Record<string, unknown>[] = [], exExtra: Record<string, number> = {}, localLabel = "Local / County Tax Rate"): ToolDef {
  const s = E.SALES[key], slug = `${key}-car-sales-tax-calculator`;
  const ex = { price: 35000, tradeIn: 10000, docFee: 500, otherFees: s.fees, localRate: s.localDefault, ...exExtra };
  return mk({
    slug, title: `${st} Car Sales Tax Calculator`, meta: `${st} Car Sales Tax Calculator 2026`, desc,
    inputs: [money("price", "Car Price", 35000, "$", 2000000), money("tradeIn", "Trade-In Value", 10000), pct("localRate", localLabel, s.localDefault, 10), money("docFee", "Dealer Doc Fee (Taxable)", 500), money("otherFees", "Title, Registration & Plate Fees", s.fees), ...extra],
    results: SALES_RESULTS(st), fn: C[slug], ex,
    exText: (o) => `Example: a $35,000 car with a $10,000 trade-in and a $500 doc fee: ${st} tax comes to ${usd(o.salesTax)} on a taxable price of ${usd(o.taxablePrice)}; out the door about ${usd(o.outTheDoorPrice)}, and the trade-in saves ${usd(o.tradeInTaxSavings)} of tax.`,
    how: "Enter the car's price, your trade-in and the dealer's doc fee (it's taxable). Title and registration fees are added after tax.",
    assume: `${rule} Rates are those in effect in 2026; check the exact rate and fees with your dealer or the state motor vehicle office.`,
    faq,
  });
}
const SALES: ToolDef[] = [
  salesTool("kentucky", "Kentucky", "Calculate Kentucky motor vehicle usage tax on a new or used car — 6% of the price after your trade-in — and the out-the-door price.", "Kentucky charges a 6% motor vehicle usage tax (KRS 138.460) instead of sales tax, collected by the county clerk when you title the car. On dealer sales it's on the price less the trade-in allowance; on private sales on the greater of the price and the trade-in value in the standard guide. There's no local tax.", [["What is the car sales tax in Kentucky?", "6% motor vehicle usage tax, with no local add-on."], ["Does a trade-in reduce car tax in Kentucky?", "Yes, on a dealer purchase the trade-in allowance is deducted before the 6%."]]),
  salesTool("north-carolina", "North Carolina", "Calculate the North Carolina Highway Use Tax on a car — 3% of the price after your trade-in, $250 cap for new residents — and the out-the-door price.", "North Carolina charges a 3% Highway Use Tax (HUT) instead of sales tax when the title is issued (G.S. 105-187.3), on the sales price less the trade-in. New residents titling a vehicle already titled in another state pay 3% capped at $250. There's no local tax on the HUT; annual county vehicle property tax is billed with the registration.", [["What is the sales tax on a car in North Carolina?", "There's no sales tax — you pay the 3% Highway Use Tax when you title the car."], ["Do new residents pay Highway Use Tax in NC?", "Yes, but it's capped at $250 for a vehicle already titled in your name in another state."]], [dd("newResident", "New Resident Titling an Out-of-State Car?", ["No", "Yes"], 0)], { newResident: 0 }, "Local Tax Rate (none in NC)"),
  salesTool("wisconsin", "Wisconsin", "Calculate Wisconsin car sales tax — 5% state plus 0.5% county tax, after your trade-in — and the out-the-door price.", "Wisconsin charges 5% state sales tax plus 0.5% county tax in most counties (Milwaukee County 0.9% and the city of Milwaukee an extra 2% since 2024 — enter your rate). Trade-ins are deducted before tax. Title ($164.50) and registration ($85) are added on top.", [["How much is car sales tax in Wisconsin?", "5% state plus usually 0.5% county, so 5.5% for most buyers."], ["Does Wisconsin tax the trade-in?", "No — the trade-in value is deducted from the taxable price."]]),
  salesTool("pennsylvania", "Pennsylvania", "Calculate Pennsylvania car sales tax — 6% state, plus 1% in Allegheny County or 2% in Philadelphia — with title, tag and registration fees and your out-the-door price.", "Pennsylvania charges 6% sales tax on vehicles, plus 1% local tax in Allegheny County or 2% in Philadelphia, on the price less the trade-in. Title ($67), registration ($45) and lien or plate fees are added (default $160 total).", [["What is the sales tax on a car in Pennsylvania?", "6%, or 7% in Allegheny County and 8% in Philadelphia."], ["Does Pennsylvania give a trade-in tax credit?", "Yes, the trade-in is deducted before tax is calculated."]], [], {}, "Local Tax (1% Allegheny, 2% Philadelphia)"),
];

export const VEH_GOV: [string, ToolDef[]][] = [
  ["government-fees-public-finance-calculators", REG],
  ["court-criminal-legal-fee-calculators", COURT],
  ["sales-tax-vat-import-duty-calculators", SALES],
];

async function main() {
  const all = VEH_GOV.flatMap(([, t]) => t);
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.VEH_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); return; }
  for (const [cat, tools] of VEH_GOV) await upsertTools(cat, tools);
}
main().catch((e) => { console.error(e); process.exit(1); });
