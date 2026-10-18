// One-time (but safe to re-run) batch setup script: creates 8 military PCS move, travel and
// housing-allowance calculators (Law & Government Calculators > Military & Veterans
// Calculators). Rates live in src/lib/calc-engine-law-mil-moves.ts; the examples below are
// computed from that engine so they always match the calculator.
// Merged keywords (covered here, no separate page): Army TLA → tle; Personally Procured Move,
// DPS Move, Army Move → ppm-move; Travel Days (Army), Army Travel Pay, Army ETS Travel Pay,
// DOD Travel, Army/Military Mileage → military-travel-pay; GSA Per Diem → per-diem;
// Military Housing → oha (overseas) — BAH itself is location data and is handled separately.
//
// HOW TO RUN (after prisma/setup-law-government-category.ts --apply)
//   npx tsx prisma/create-law-mil-moves-calculators.ts
// or
//   npm run db:create-law-mil-moves-calculators

import * as E from "../src/lib/calc-engine-law-mil-moves";

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(key: string, label: string, opts: { unit?: string; default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "number", unit: opts.unit, required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "currency", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function percentField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "percentage", unit: "%", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100, step: opts.step ?? 0.5 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const CAT = "military-veterans-calculators";
const DISCLAIMER = "Estimates only, based on the Joint Travel Regulations (JTR) and published 2026 rates — your orders, your transportation office and the finance office decide the final amounts. Not affiliated with the Department of Defense.";

const GRADES: [string, number][] = E.MOVE_GRADES.map(([label], i) => [label, i]);
const g = (label: string) => GRADES.find(([l]) => l === label)![1];
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const lbs = (n: number) => `${n.toLocaleString("en-US")} lb`;
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const DEPS: [string, number][] = [["No dependents", 0], ["With dependents", 1]];

const exDla = r(E.dislocationAllowance, { grade: g("E-5"), dependents: 1, moveType: 0 });
const exTravel = r(E.militaryTravelPay, { miles: 1200, vehicles: 2, dependents12Plus: 1, dependentsUnder12: 1 });
const exTle = r(E.tle, { days: 10, lodgingRate: 113, mieRate: 68, actualLodgingPerNight: 150, dependents12Plus: 1, dependentsUnder12: 2 });
const exPcs = r(E.pcsMove, { grade: g("E-6"), miles: 1200, vehicles: 2, dependents12Plus: 1, dependentsUnder12: 1, tleDays: 10, lodgingPerNight: 140, outOfPocketCosts: 2500 });
const exPpm = r(E.ppmMove, { grade: g("E-5"), dependents: 1, weightMoved: 8000, governmentConstructedCost: 9500, movingExpenses: 3200, taxRatePercent: 22 });
const exHhg = r(E.hhgWeight, { grade: g("E-5"), dependents: 1, bedrooms: 3, otherRooms: 3, garageOrStorage: 1, extraHeavyItems: 2, boxes: 0, costPerExcessPound: 1 });
const exPd = r(E.perDiem, { nights: 4, lodgingRate: 113, mieRate: 68, actualLodgingPerNight: 105 });
const exOha = r(E.oha, { monthlyRent: 2400, rentCeiling: 2200, utilityAllowance: 450, moveInAllowance: 1500 });

const DEP_COUNTS = [
  numberField("dependents12Plus", "Dependents Age 12 or Older (incl. spouse)", { default: 1, max: 10 }),
  numberField("dependentsUnder12", "Dependents Under 12", { default: 1, max: 10 }),
];

const TOOLS: ToolDef[] = [
  {
    slug: "dislocation-allowance-calculator",
    title: "Dislocation Allowance (DLA) Calculator",
    description: "Look up your 2026 Dislocation Allowance for a PCS move by pay grade, with or without dependents — plus the partial DLA for government-directed moves into or out of quarters.",
    metaTitle: "DLA Calculator 2026 — Dislocation Allowance by Rank",
    metaDescription: "Free 2026 DLA calculator. See the dislocation allowance for your pay grade with and without dependents, and the partial DLA rate.",
    calcInputs: [
      dropdown("grade", "Pay Grade", GRADES, g("E-5")),
      dropdown("dependents", "Dependency Status", DEPS, 1),
      dropdown("moveType", "Type of Move", [["PCS move (full DLA)", 0], ["Ordered into/out of government quarters (partial DLA)", 1]], 0),
    ],
    calcResult: { label: "Your DLA", format: "currency" },
    calcResults: [
      { key: "dlaAmount", label: "Your DLA", format: "currency", highlight: true },
      { key: "dlaWithoutDependents", label: "Rate Without Dependents", format: "currency" },
      { key: "dlaWithDependents", label: "Rate With Dependents", format: "currency" },
      { key: "differenceWithDependents", label: "Extra for Members With Dependents", format: "currency" },
    ],
    instructions: "Choose your pay grade on the date you report and whether your dependents are moving with you. Use partial DLA only for a government-directed move into or out of government quarters without a PCS.",
    examples: `Example: an E-5 with dependents receives ${usd(exDla.dlaAmount)} DLA on a 2026 PCS move — ${usd(exDla.differenceWithDependents)} more than the ${usd(exDla.dlaWithoutDependents)} paid without dependents.`,
    assumptions: `2026 DLA rates effective 1 January 2026; partial DLA ${usd(E.PARTIAL_DLA)}. DLA is not paid for the first move to duty after entry (without dependents), for a final separation or retirement move, or to members who don't establish a household. Dual-military couples moving together get one DLA. DLA is tax-free. ${DISCLAIMER}`,
    faq: [
      { question: "Is DLA taxable?", answer: "No, DLA is a non-taxable allowance." },
      { question: "Can I get DLA advanced?", answer: "Yes — you can request DLA as an advance before you move through your finance office." },
    ],
  },
  {
    slug: "military-travel-pay-calculator",
    title: "Military Travel Pay Calculator (PCS & ETS)",
    description: "Estimate military travel pay for a PCS or ETS move by car — authorized travel days, mileage (MALT) for up to two vehicles, and flat-rate per diem for you and your family.",
    metaTitle: "Military Travel Pay Calculator — MALT, Per Diem & Travel Days",
    metaDescription: "Free PCS/ETS travel pay calculator. Enter the official distance to see authorized travel days, MALT at 23.5¢ a mile and per diem for your family.",
    calcInputs: [
      numberField("miles", "Official Distance (miles)", { default: 1200, max: 6000, unit: "miles" }),
      numberField("vehicles", "Authorized Vehicles Driven (1–2)", { default: 2, min: 1, max: 2 }),
      ...DEP_COUNTS,
    ],
    calcResult: { label: "Total Travel Pay", format: "currency" },
    calcResults: [
      { key: "totalTravelPay", label: "Total Travel Pay", format: "currency", highlight: true },
      { key: "authorizedTravelDays", label: "Authorized Travel Days", format: "number" },
      { key: "maltMileagePay", label: "MALT (Mileage) Pay", format: "currency" },
      { key: "perDiemPay", label: "Per Diem", format: "currency" },
      { key: "perDiemPerDay", label: "Family Per Diem per Day", format: "currency" },
    ],
    instructions: "Enter the official distance between your old and new duty stations (or, for ETS, to your home of record or place of entry), the number of authorized privately owned vehicles you're driving, and the dependents travelling with you.",
    examples: `Example: 1,200 miles in two cars with a spouse and one child under 12 gives ${exTravel.authorizedTravelDays} authorized travel days, ${usd(exTravel.maltMileagePay)} of MALT and ${usd(exTravel.perDiemPay)} of per diem — ${usd(exTravel.totalTravelPay)} in total.`,
    assumptions: `MALT ${usd(E.MALT_PER_MILE)} a mile per authorized vehicle (travel from 1 July 2026; it was $0.205 before). Travel days: 1 day for the first 400 miles, then 1 day per 350 miles, plus 1 for a remainder of 51 miles or more. Flat per diem = standard CONUS rate (${usd(E.STD_PER_DIEM)} in FY2027) for the member, 75% per dependent 12 or older and 50% under 12. Dependents in a second car don't add mileage beyond the vehicle rate. ${DISCLAIMER}`,
    faq: [
      { question: "How many miles a day do I get for a PCS?", answer: "The JTR allows one travel day for every 350 miles after the first 400 miles." },
      { question: "Do I get travel pay when I ETS?", answer: "Yes — separating members get travel to their home of record or place of entry (or to a chosen home if retiring), paid at the same mileage and per diem rules." },
    ],
  },
  {
    slug: "tle-calculator",
    title: "TLE Calculator — Temporary Lodging Expense",
    description: "Estimate Temporary Lodging Expense (TLE) for a CONUS PCS — your family percentage of the local lodging and M&IE rates, the $290 daily cap, and the total for your nights in temporary lodging.",
    metaTitle: "TLE Calculator — Military Temporary Lodging Expense",
    metaDescription: "Free TLE calculator for a CONUS PCS. Uses the JTR family percentages and the $290 daily cap to estimate TLE per day and in total.",
    calcInputs: [
      numberField("days", "Days in Temporary Lodging (max 21)", { default: 10, min: 1, max: 21, unit: "days" }),
      currencyField("lodgingRate", "Local Lodging Rate (GSA)", { default: 113, max: 600 }),
      currencyField("mieRate", "Local M&IE Rate (GSA)", { default: 68, max: 200 }),
      currencyField("actualLodgingPerNight", "What You Pay per Night", { default: 150, max: 1000 }),
      numberField("dependents12Plus", "Dependents Age 12 or Older (incl. spouse)", { default: 1, max: 10 }),
      numberField("dependentsUnder12", "Dependents Under 12", { default: 2, max: 10 }),
    ],
    calcResult: { label: "Total TLE", format: "currency" },
    calcResults: [
      { key: "totalTle", label: "Total TLE", format: "currency", highlight: true },
      { key: "tlePerDay", label: "TLE per Day", format: "currency" },
      { key: "familyPercentage", label: "Family Percentage of the Rate", format: "percentage" },
      { key: "lodgingPortionPerDay", label: "Lodging Part per Day", format: "currency" },
      { key: "capped", label: "Hit the $290 Daily Cap? (1 = yes)", format: "number" },
    ],
    instructions: "Look up the GSA per diem rate (lodging and M&IE) for the city where you're staying, enter what your room actually costs, and the number of nights. TLE is for temporary lodging near the old or new duty station while you find a home.",
    examples: `Example: a member, spouse and two young children staying 10 nights in a $150 room where the rate is $113 + $68 get ${exTle.familyPercentage}% of the rates — ${usd(exTle.tlePerDay)} a day, ${usd(exTle.totalTle)} in total.`,
    assumptions: `JTR 0540 percentages: member alone 65%; member + 1 dependent 100%; each further dependent 12+ 35%, under 12 25%. Lodging is your actual cost up to the percentage of the lodging rate; M&IE gets the same percentage (no M&IE if you have a kitchen and the JTR reduces it). Capped at ${usd(E.TLE_DAILY_CAP)} a day; up to 14 days CONUS (21 in some cases). ${DISCLAIMER}`,
    faq: [
      { question: "How many days of TLE can I get?", answer: "Up to 14 days for a CONUS PCS, split between the old and new locations; some moves allow up to 21 days." },
      { question: "Does TLE count if I stay with family?", answer: "No — TLE covers commercial or government lodging costs you actually pay." },
    ],
  },
  {
    slug: "pcs-move-calculator",
    title: "PCS Move Calculator",
    description: "Estimate the total money you'll receive for a PCS move — Dislocation Allowance, mileage and per diem for the trip, and Temporary Lodging Expense — and what's left after your moving costs.",
    metaTitle: "PCS Move Calculator 2026 — DLA, Travel Pay & TLE",
    metaDescription: "Free PCS calculator. Adds 2026 DLA, MALT, per diem and TLE for your rank and family to estimate total PCS entitlements.",
    calcInputs: [
      dropdown("grade", "Pay Grade", GRADES, g("E-6")),
      numberField("miles", "Official Distance (miles)", { default: 1200, max: 6000, unit: "miles" }),
      numberField("vehicles", "Authorized Vehicles Driven (1–2)", { default: 2, min: 1, max: 2 }),
      ...DEP_COUNTS,
      numberField("tleDays", "Days of Temporary Lodging", { default: 10, max: 21, unit: "days" }),
      currencyField("lodgingPerNight", "Hotel Cost per Night", { default: 140, max: 1000 }),
      currencyField("outOfPocketCosts", "Your Own Moving Costs", { default: 2500, max: 50000, step: 50 }),
    ],
    calcResult: { label: "Total PCS Entitlements", format: "currency" },
    calcResults: [
      { key: "totalPcsEntitlements", label: "Total PCS Entitlements", format: "currency", highlight: true },
      { key: "dislocationAllowance", label: "Dislocation Allowance", format: "currency" },
      { key: "travelPay", label: "Travel Pay (MALT + Per Diem)", format: "currency" },
      { key: "tlePay", label: "Temporary Lodging Expense", format: "currency" },
      { key: "authorizedTravelDays", label: "Authorized Travel Days", format: "number" },
      { key: "netAfterMovingCosts", label: "Left After Your Moving Costs", format: "currency" },
    ],
    instructions: "Enter your pay grade, the official distance, how many cars you're driving and who's moving with you. Add the nights you expect to spend in a hotel and your own costs (deposits, fuel beyond MALT, cleaning) to see what you'll keep. A household goods move by the government or a PPM is handled separately.",
    examples: `Example: an E-6 with a spouse and one young child driving 1,200 miles in two cars with 10 hotel nights gets ${usd(exPcs.dislocationAllowance)} DLA, ${usd(exPcs.travelPay)} travel pay and ${usd(exPcs.tlePay)} TLE — about ${usd(exPcs.totalPcsEntitlements)}, or ${usd(exPcs.netAfterMovingCosts)} after ${usd(2500)} of your own costs.`,
    assumptions: `DLA from the 2026 table (with-dependents rate if anyone moves with you); MALT ${usd(E.MALT_PER_MILE)} a mile per vehicle; flat per diem on the standard CONUS rate; TLE on the standard ${usd(E.STD_LODGING)} + ${usd(E.STD_MIE)} rate with the JTR family percentages and ${usd(E.TLE_DAILY_CAP)} cap. Use your new location's GSA rate in the TLE calculator for a closer figure. ${DISCLAIMER}`,
    faq: [
      { question: "What money do you get for a PCS?", answer: "Typically DLA, mileage (MALT) and per diem for travel days, TLE for temporary lodging, and either a government household goods move or a PPM incentive." },
      { question: "Is PCS money taxable?", answer: "DLA, MALT, per diem and TLE aren't taxable; a PPM incentive above your moving costs is." },
    ],
  },
  {
    slug: "ppm-move-calculator",
    title: "PPM Move Calculator (DITY Move)",
    description: "Estimate your Personally Procured Move (PPM, formerly DITY) profit — 100% of the government constructed cost, pro-rated if you're over your weight allowance, minus your costs and tax withholding.",
    metaTitle: "PPM Calculator — DITY Move Incentive & Profit 2026",
    metaDescription: "Free PPM / DITY move calculator. Enter the government constructed cost, your weight and expenses to estimate your incentive, taxes and profit.",
    calcInputs: [
      dropdown("grade", "Pay Grade", GRADES, g("E-5")),
      dropdown("dependents", "Dependency Status", DEPS, 1),
      numberField("weightMoved", "Weight You Move (lb)", { default: 8000, max: 25000, step: 100, unit: "lb" }),
      currencyField("governmentConstructedCost", "Government Constructed Cost (GCC) Estimate", { default: 9500, max: 100000, step: 50 }),
      currencyField("movingExpenses", "Your Moving Expenses (truck, fuel, tolls, labor)", { default: 3200, max: 50000, step: 50 }),
      percentField("taxRatePercent", "Tax Withheld on the Incentive", { default: 22, max: 37 }),
    ],
    calcResult: { label: "Profit After Tax and Costs", format: "currency" },
    calcResults: [
      { key: "profitAfterTaxAndCosts", label: "Profit After Tax and Costs", format: "currency", highlight: true },
      { key: "ppmIncentive", label: "PPM Incentive", format: "currency" },
      { key: "weightAllowance", label: "Your Weight Allowance (lb)", format: "number" },
      { key: "taxWithheld", label: "Tax on the Profit", format: "currency" },
      { key: "incentivePerPound", label: "Incentive per Pound", format: "currency" },
    ],
    instructions: "Get the government constructed cost (what it would cost the government to move your goods) from your PPM estimate in MilMove or your transportation office, then enter the weight you'll move (from certified empty and full weight tickets) and your receipts for the move.",
    examples: `Example: an E-5 with dependents moving ${lbs(8000)} with a ${usd(9500)} GCC is under the ${lbs(exPpm.weightAllowance)} allowance, so the incentive is ${usd(exPpm.ppmIncentive)}. After ${usd(3200)} of costs and ${usd(exPpm.taxWithheld)} tax, the profit is about ${usd(exPpm.profitAfterTaxAndCosts)}.`,
    assumptions: `PPM incentive = 100% of the GCC for the weight you move, pro-rated when you move more than your JTR weight allowance (pro-gear doesn't count against it). Tax here is estimated on the incentive minus your documented expenses (the incentive is reported as income; allowable expenses reduce the taxable part). ${DISCLAIMER}`,
    faq: [
      { question: "How much do you make on a PPM?", answer: "The government pays what it would have cost to move your goods (the GCC). Whatever is left after your truck, fuel, labor and taxes is your profit." },
      { question: "Do I need weight tickets?", answer: "Yes — certified empty and full weight tickets for every vehicle or trailer are required to get paid." },
    ],
  },
  {
    slug: "household-goods-weight-calculator",
    title: "Military Household Goods Weight Calculator",
    description: "Estimate how much your household goods weigh and compare it with your JTR weight allowance for a PCS move — and what excess weight could cost you.",
    metaTitle: "Military Household Goods Weight Calculator — PCS Allowance",
    metaDescription: "Free military HHG weight estimator. Estimate your household goods weight by room and compare it with the JTR weight allowance for your rank.",
    calcInputs: [
      dropdown("grade", "Pay Grade", GRADES, g("E-5")),
      dropdown("dependents", "Dependency Status", DEPS, 1),
      numberField("bedrooms", "Furnished Bedrooms", { default: 3, max: 10 }),
      numberField("otherRooms", "Other Furnished Rooms (living, dining, kitchen, office)", { default: 3, max: 15 }),
      numberField("garageOrStorage", "Full Garages / Storage Areas", { default: 1, max: 5 }),
      numberField("extraHeavyItems", "Extra Heavy Items (piano, gym, safe, hot tub…)", { default: 2, max: 20 }),
      numberField("boxes", "Extra Boxes of Books/Tools (approx.)", { default: 0, max: 500 }),
      currencyField("costPerExcessPound", "Excess Cost per Pound (estimate)", { default: 1, max: 10, step: 0.05 }),
    ],
    calcResult: { label: "Estimated Weight (lb)", format: "number" },
    calcResults: [
      { key: "estimatedWeight", label: "Estimated Weight (lb)", format: "number", highlight: true },
      { key: "weightAllowance", label: "Your Weight Allowance (lb)", format: "number" },
      { key: "excessWeight", label: "Estimated Excess Weight (lb)", format: "number" },
      { key: "estimatedExcessCost", label: "Possible Excess Weight Charge", format: "currency" },
      { key: "percentOfAllowance", label: "Share of Allowance Used", format: "percentage" },
    ],
    instructions: "Count your furnished rooms and garage or storage areas, add any very heavy items, and pick your pay grade and dependency status. Professional books, papers and equipment (pro-gear) don't count against your allowance — leave them out.",
    examples: `Example: a 3-bedroom home with 3 other rooms, a garage and 2 heavy items weighs about ${lbs(exHhg.estimatedWeight)} — ${exHhg.percentOfAllowance}% of an E-5's ${lbs(exHhg.weightAllowance)} allowance with dependents.`,
    assumptions: `Rule-of-thumb weights: 1,500 lb per furnished bedroom, 1,000 lb per other room, 1,200 lb per garage/storage area, 300 lb per extra heavy item and 40 lb per box. Allowances from JTR Table 5-37 (e.g. E-5 7,000 / 9,000 lb, O-3 13,000 / 14,500 lb, O-6 and above 18,000 lb). Actual weight is set by certified weight tickets; excess-weight charges are billed by the government. ${DISCLAIMER}`,
    faq: [
      { question: "What happens if I go over my weight allowance?", answer: "You pay the government's cost for the excess weight, usually collected from your pay after the move." },
      { question: "Does pro-gear count?", answer: "No — up to 2,000 lb of the member's professional gear and 500 lb of the spouse's are moved separately." },
    ],
  },
  {
    slug: "per-diem-calculator",
    title: "Per Diem Calculator (GSA TDY Rates)",
    description: "Calculate per diem for official travel — lodging up to the GSA rate plus meals and incidentals (M&IE), with 75% M&IE on the first and last day, for military and federal TDY.",
    metaTitle: "Per Diem Calculator — GSA Lodging & M&IE for TDY",
    metaDescription: "Free per diem calculator using FY2027 GSA rates ($113 lodging, $68 M&IE standard). Includes the 75% first and last day rule for TDY.",
    calcInputs: [
      numberField("nights", "Nights of Lodging", { default: 4, max: 180, unit: "nights" }),
      currencyField("lodgingRate", "GSA Lodging Rate per Night", { default: 113, max: 1000 }),
      currencyField("mieRate", "GSA M&IE Rate per Day", { default: 68, max: 200 }),
      currencyField("actualLodgingPerNight", "Your Actual Hotel Cost per Night", { default: 105, max: 1000 }),
    ],
    calcResult: { label: "Total Per Diem", format: "currency" },
    calcResults: [
      { key: "totalPerDiem", label: "Total Per Diem", format: "currency", highlight: true },
      { key: "lodgingReimbursement", label: "Lodging Reimbursed", format: "currency" },
      { key: "mieTotal", label: "Meals & Incidentals (M&IE)", format: "currency" },
      { key: "firstAndLastDayMie", label: "M&IE on First and Last Day", format: "currency" },
      { key: "maxDailyRate", label: "Maximum Daily Rate", format: "currency" },
    ],
    instructions: "Find the lodging and M&IE rates for your destination on the GSA (CONUS) or DoD (OCONUS) per diem lookup — or keep the standard CONUS rate — then enter your nights and what your hotel charges. Lodging is reimbursed at actual cost up to the rate; M&IE is a flat daily amount.",
    examples: `Example: a 4-night TDY at the standard FY2027 rate with a $105 hotel pays ${usd(exPd.lodgingReimbursement)} lodging and ${usd(exPd.mieTotal)} M&IE (75% on travel days) — ${usd(exPd.totalPerDiem)} in total.`,
    assumptions: `FY2027 standard CONUS rate (1 Oct 2026 – 30 Sep 2027): ${usd(E.STD_LODGING)} lodging, ${usd(E.STD_MIE)} M&IE. Days = nights + 1. Lodging taxes are reimbursed separately as a miscellaneous expense; government meals provided and long-term TDY flat rates reduce M&IE. ${DISCLAIMER}`,
    faq: [
      { question: "Why do I only get 75% on travel days?", answer: "Federal travel rules pay 75% of the M&IE rate on the first and last day of travel." },
      { question: "Is per diem taxable?", answer: "Not when it's paid at or below the federal rate for official travel." },
    ],
  },
  {
    slug: "oha-calculator",
    title: "OHA Calculator — Overseas Housing Allowance",
    description: "Estimate your Overseas Housing Allowance — rent up to your OHA rent ceiling, plus the utility/recurring maintenance allowance and the one-time move-in housing allowance.",
    metaTitle: "OHA Calculator — Overseas Housing Allowance Estimate",
    metaDescription: "Free OHA calculator. Enter your rent, OHA rent ceiling and utility allowance to see your monthly OHA and any rent you'd pay yourself.",
    calcInputs: [
      currencyField("monthlyRent", "Monthly Rent (in US dollars)", { default: 2400, max: 20000, step: 10 }),
      currencyField("rentCeiling", "Your OHA Rent Ceiling", { default: 2200, max: 20000, step: 10 }),
      currencyField("utilityAllowance", "Utility / Recurring Maintenance Allowance", { default: 450, max: 3000, step: 5 }),
      currencyField("moveInAllowance", "Move-In Housing Allowance (one-time)", { default: 1500, max: 20000, step: 10 }),
    ],
    calcResult: { label: "Monthly OHA", format: "currency" },
    calcResults: [
      { key: "monthlyOha", label: "Monthly OHA", format: "currency", highlight: true },
      { key: "rentPortion", label: "Rent Covered", format: "currency" },
      { key: "outOfPocketRent", label: "Rent Above the Ceiling (you pay)", format: "currency" },
      { key: "annualOha", label: "Annual OHA", format: "currency" },
      { key: "firstYearWithMoveIn", label: "First Year incl. Move-In Allowance", format: "currency" },
    ],
    instructions: "Look up your rent ceiling, utility/recurring maintenance allowance and move-in housing allowance for your location, grade and dependency status on the DoD OHA rate page, convert your lease rent to dollars, and enter them here.",
    examples: `Example: ${usd(2400)} rent against a ${usd(2200)} ceiling with a ${usd(450)} utility allowance gives ${usd(exOha.monthlyOha)} a month — you'd cover ${usd(exOha.outOfPocketRent)} of rent yourself.`,
    assumptions: `OHA = the lower of your actual rent and the rent ceiling, plus the utility/recurring maintenance allowance; MIHA is paid once for move-in costs. Rates are set in US dollars but track the local currency, so they change with exchange rates. OHA is tax-free. ${DISCLAIMER}`,
    faq: [
      { question: "Does OHA change with the exchange rate?", answer: "Yes — OHA is adjusted as the local currency moves against the dollar, so the dollar amount can rise or fall." },
      { question: "Is OHA the same as BAH?", answer: "No. BAH is a fixed monthly rate by US location; OHA reimburses your actual overseas rent up to a ceiling." },
    ],
  },
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-law-government-category.ts --apply" first.`);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: cat.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(def.calcInputs),
      calcResult: JSON.stringify(def.calcResult),
      calcResults: JSON.stringify(def.calcResults),
      instructions: paragraphsToHtml(def.instructions),
      examples: paragraphsToHtml(def.examples),
      assumptions: paragraphsToHtml(def.assumptions),
      faq: JSON.stringify(def.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: def.metaTitle,
      metaDescription: def.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.tool.update({
        where: { slug: def.slug },
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      updated++;
    } else {
      await prisma.tool.create({
        data: { slug: def.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
  console.log("New tools are created with status Draft — review them in /admin/tools and publish when ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
