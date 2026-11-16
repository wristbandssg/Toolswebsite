// One-time (but safe to re-run) batch setup script: 10 tools from the big generic keyword check
// (16 Nov 2026 — Claude outputs/Big_Generic_Keyword_Check.md): energy converter, lattice energy,
// HP to amps, antipode, star rating, meeting cost, safety stock, valve Cv, pig gestation and
// lottery odds. Formulas: src/lib/calc-engine-big-scibiz.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-big-scibiz-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-big-scibiz";
import { mk, num, dd, date, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.bigSciBizCustomCalculators;
const NOW = 20772; // 15 Nov 2026

const PHYS: ToolDef[] = [mk({
  slug: "energy-converter-calculator", title: "Energy Converter (Joules, kWh, Calories, BTU, eV)",
  meta: "Energy Conversion Calculator — J, kWh, kcal, BTU, eV",
  desc: "Convert energy between joules, kilojoules, megajoules, watt-hours, kilowatt-hours, calories, kilocalories, BTU, therms, electronvolts, foot-pounds and ergs.",
  inputs: [num("value", "Value", 1, -1e30, 1e30, 0.000001), dd("from", "From", E.EN_LABELS, 4), dd("to", "To", E.EN_LABELS, 0)],
  results: [["result", "Converted", "t"], ["joules", "Joules", "t"], ["kwh", "Kilowatt-Hours", "t"], ["kcal", "Kilocalories", "t"], ["btu", "BTU", "t"], ["all", "All Units", "t"]],
  fn: C["energy-converter-calculator"], ex: { value: 1, from: 4, to: 0 },
  exText: (o) => `Example: 1 kWh = ${o.result} = ${o.kcal} = ${o.btu}.`,
  how: "Everything is converted through joules: 1 kWh = 3.6 MJ, 1 kcal (food Calorie) = 4,184 J, 1 BTU = 1,055.06 J, 1 eV = 1.602 × 10⁻¹⁹ J, 1 ft·lbf = 1.356 J.",
  assume: "Thermochemical calorie (4.184 J) and International Table BTU.",
  faq: [["How many joules in a kWh?", "3,600,000 J."], ["How many joules in a calorie?", "4.184 J; a food Calorie (kcal) is 4,184 J."], ["How many BTU in a kWh?", "About 3,412 BTU."]],
})];

const CHEM: ToolDef[] = [mk({
  slug: "lattice-energy-calculator", title: "Lattice Energy Calculator (Kapustinskii & Born–Landé)",
  meta: "Lattice Energy Calculator — Kapustinskii & Born–Landé",
  desc: "Estimate the lattice energy of an ionic compound with the Kapustinskii and Born–Landé equations from ion charges, ionic radii, ions per formula unit, Madelung constant and Born exponent, or pick NaCl, MgO, CaF₂ and more.",
  inputs: [dd("preset", "Compound", E.LE_LABELS, 1), num("zc", "Cation Charge (custom)", 1, 1, 4, 1), num("za", "Anion Charge (custom, magnitude)", 1, 1, 4, 1), num("rc", "Cation Radius (pm)", 102, 10, 300, 1), num("ra", "Anion Radius (pm)", 181, 10, 300, 1), num("nu", "Ions per Formula Unit", 2, 2, 10, 1), num("madelung", "Madelung Constant (0 = skip)", 1.74756, 0, 10, 0.00001), num("born", "Born Exponent n", 8, 0, 20, 0.5)],
  results: [["kapustinskii", "Kapustinskii", "t"], ["bornLande", "Born–Landé", "t"], ["distance", "Ion Distance", "t"], ["ions", "Ions", "t"], ["trend", "Trend", "t"]],
  fn: C["lattice-energy-calculator"], ex: { preset: 1, zc: 1, za: 1, rc: 102, ra: 181, nu: 2, madelung: 1.74756, born: 8 },
  exText: (o) => `Example: NaCl's lattice energy is about ${o.kapustinskii} (Kapustinskii) or ${o.bornLande} (Born–Landé); the experimental value is 786 kJ/mol.`,
  how: "Kapustinskii: U = 1.2025 × 10⁵ × ν × |z⁺| × |z⁻| ÷ r₀ × (1 − 34.5 ÷ r₀) kJ/mol, with r₀ = r⁺ + r⁻ in pm. It needs no crystal structure.\n\nBorn–Landé: U = 1.389 × 10⁵ × M × |z⁺z⁻| ÷ r₀ × (1 − 1/n), using the Madelung constant M of the crystal (1.748 for rock salt) and the Born exponent n.",
  assume: "Shannon ionic radii (6-coordinate) for the presets; both are estimates within about 5–10% of experiment.",
  faq: [["What is lattice energy?", "The energy released when gaseous ions form one mole of an ionic solid."], ["Why does MgO have a higher lattice energy than NaCl?", "Its ions have charges of 2 and are smaller."], ["What is the Madelung constant of NaCl?", "1.74756."]],
})];

const ELEC: ToolDef[] = [mk({
  slug: "hp-to-amps-calculator", title: "HP to Amps Calculator (Motor Horsepower to Amps)",
  meta: "HP to Amps Calculator — Motor Current DC, 1 & 3 Phase",
  desc: "Convert motor horsepower to amps for DC, single-phase and three-phase motors from the voltage, efficiency and power factor, with the kW and kVA drawn.",
  inputs: [num("hp", "Horsepower", 10, 0, 100000, 0.01), num("volts", "Voltage (V)", 230, 0, 100000, 1), dd("phase", "Supply", E.HP_PHASES, 2), num("eff", "Efficiency (%)", 90, 1, 100, 0.1), num("pf", "Power Factor", 0.85, 0, 1, 0.01)],
  results: [["amps", "Current", "t"], ["output", "Output Power", "t"], ["input", "Input Power", "t"], ["formula", "Formula", "t"], ["nec", "Note", "t"]],
  fn: C["hp-to-amps-calculator"], ex: { hp: 10, volts: 230, phase: 2, eff: 90, pf: 0.85 },
  exText: (o) => `Example: a 10 hp three-phase motor at 230 V, 90% efficient with a 0.85 power factor, draws about ${o.amps}.`,
  how: "1 hp = 745.7 W of shaft output. Divide by efficiency for the electrical input. Single-phase current = watts ÷ (V × PF); three-phase current = watts ÷ (√3 × V × PF).",
  assume: "Full load at rated voltage. Real motors vary; nameplate FLA overrides this estimate.",
  faq: [["How many amps is a 1 hp motor at 120 V?", "About 8–9 A single-phase (NEC table: 16 A at 115 V, which includes worst-case motors)."], ["How many amps is 5 hp at 480 V three-phase?", "About 6 A."], ["Why does three-phase draw fewer amps?", "Power is shared across three conductors (× √3)."]],
})];

const EARTH: ToolDef[] = [mk({
  slug: "antipode-calculator", title: "Antipode Calculator (Opposite Side of the Earth)",
  meta: "Antipode Calculator — What's on the Other Side of the Earth?",
  desc: "Find the antipode — the point directly opposite on the other side of the Earth — for any latitude and longitude, with the nearest big city to it.",
  inputs: [num("lat", "Latitude (°, north +)", 40.7128, -90, 90, 0.0001), num("lon", "Longitude (°, east +)", -74.006, -180, 180, 0.0001)],
  results: [["antipode", "Antipode", "t"], ["decimal", "Decimal", "t"], ["nearest", "Nearest City", "t"], ["from", "Your Point", "t"], ["distance", "Distance", "t"], ["note", "Land or Sea?", "t"]],
  fn: C["antipode-calculator"], ex: { lat: 40.7128, lon: -74.006 },
  exText: (o) => `Example: the antipode of New York City is ${o.antipode}, in the Indian Ocean southwest of Australia.`,
  how: "Antipode latitude = −latitude. Antipode longitude = longitude − 180° if it's east (positive), or + 180° if it's west.\n\nOnly about 4% of the Earth's surface has land on both sides — most land antipodes are in the ocean.",
  assume: "Spherical Earth; the nearest city comes from the site's built-in list of major cities.",
  faq: [["What is the antipode of the USA?", "Mostly the southern Indian Ocean."], ["Where is the antipode of Spain?", "New Zealand."], ["Can you dig to the other side?", "No — the Earth's core is about 5,000 °C."]],
})];

const BIZ: ToolDef[] = [
  mk({
    slug: "star-rating-calculator", title: "Star Rating Calculator (Average Rating & 5-Star Reviews Needed)",
    meta: "Star Rating Calculator — Average & Reviews Needed",
    desc: "Calculate your average star rating from the number of 1–5 star reviews, the rating split and how many more 5-star reviews you need to reach a target such as 4.5 or 4.8 on Google, Amazon or Yelp.",
    inputs: [num("s5", "5-Star Reviews", 120, 0, 1e9, 1), num("s4", "4-Star Reviews", 30, 0, 1e9, 1), num("s3", "3-Star Reviews", 10, 0, 1e9, 1), num("s2", "2-Star Reviews", 5, 0, 1e9, 1), num("s1", "1-Star Reviews", 15, 0, 1e9, 1), num("target", "Target Average (0 = skip)", 4.5, 0, 5, 0.01)],
    results: [["average", "Average Rating", "t"], ["reviews", "Reviews", "t"], ["split", "Rating Split", "t"], ["need", "To Reach Your Target", "t"], ["positive", "Positive", "t"]],
    fn: C["star-rating-calculator"], ex: { s5: 120, s4: 30, s3: 10, s2: 5, s1: 15, target: 4.5 },
    exText: (o) => `Example: 120 five-star, 30 four-star, 10 three-star, 5 two-star and 15 one-star reviews average ${o.average}. ${o.need}.`,
    how: "Average = (5 × five-star + 4 × four-star + … + 1 × one-star) ÷ number of reviews.\n\nFive-star reviews needed for a target T = (T × reviews − total stars) ÷ (5 − T).",
    assume: "A simple average; some platforms (Amazon) weight reviews by recency and verification.",
    faq: [["How is a star rating calculated?", "Add up all the stars and divide by the number of reviews."], ["How many 5-star reviews does it take to offset a 1-star review?", "To keep a 4.5 average, about 7 five-star reviews for every 1-star review ((4.5 − 1) ÷ (5 − 4.5) = 7)."], ["What is a good Google rating?", "4.2–4.8 looks trustworthy to most buyers."]],
  }),
  mk({
    slug: "meeting-cost-calculator", title: "Meeting Cost Calculator (What Does This Meeting Cost?)",
    meta: "Meeting Cost Calculator — Cost per Meeting & per Year",
    desc: "Work out what a meeting costs in salaries from the number of attendees, their average salary or hourly rate and the length, including benefits overhead, per minute, per meeting and per year.",
    inputs: [num("people", "Attendees", 8, 1, 10000, 1), dd("payType", "Pay Is", E.MC_PAY, 0), num("pay", "Average Pay ($)", 75000, 0, 1e7, 1, "$"), num("minutes", "Meeting Length (minutes)", 60, 1, 1440, 1), num("perWeek", "Meetings per Week (0 = one-off)", 1, 0, 50, 0.5), num("load", "Overhead Multiplier (benefits, 1 = none)", 1.3, 1, 3, 0.05)],
    results: [["cost", "Cost of One Meeting", "t"], ["perMinute", "Per Minute", "t"], ["year", "Per Year", "t"], ["hours", "Time Spent", "t"], ["rate", "Hourly Cost", "t"]],
    fn: C["meeting-cost-calculator"], ex: { people: 8, payType: 0, pay: 75000, minutes: 60, perWeek: 1, load: 1.3 },
    exText: (o) => `Example: a 1-hour weekly meeting with 8 people earning $75,000 costs ${o.cost} each time and ${String(o.year).split(" (")[0]}.`,
    how: "Hourly cost = annual salary ÷ 2,080 hours × overhead (benefits, taxes and space add about 25–40%). Meeting cost = attendees × hourly cost × hours.",
    assume: "2,080 paid hours a year and 50 working weeks; doesn't include lost focus time or preparation.",
    faq: [["How do you calculate the cost of a meeting?", "People × hourly rate × hours."], ["What is a loaded labour rate?", "Pay plus benefits and overhead, often 1.25–1.4 × salary."], ["How much does a weekly 1-hour meeting with 10 people cost?", "At $50/h loaded, $500 a week or $25,000 a year."]],
  }),
];

const LOGI: ToolDef[] = [mk({
  slug: "safety-stock-calculator", title: "Safety Stock Calculator (Service Level, Z-Score & Reorder Point)",
  meta: "Safety Stock Calculator — Z × σ × √Lead Time",
  desc: "Calculate safety stock with the statistical formula (service level Z × demand and lead-time variability) or the max–min method, plus the reorder point and days of cover.",
  inputs: [dd("method", "Method", E.SS_METHODS, 0), dd("level", "Service Level", E.SS_LEVEL_LABELS, 1), num("demand", "Average Daily Demand", 100, 0, 1e9, 0.01), num("sdDemand", "Std Dev of Daily Demand", 20, 0, 1e9, 0.01), num("lead", "Average Lead Time (days)", 7, 0, 3650, 0.1), num("sdLead", "Std Dev of Lead Time (days, 0 = fixed)", 0, 0, 365, 0.1), num("maxDemand", "Max Daily Demand (max–min)", 140, 0, 1e9, 0.01), num("maxLead", "Max Lead Time (max–min, days)", 10, 0, 3650, 0.1)],
  results: [["ss", "Safety Stock", "t"], ["rop", "Reorder Point", "t"], ["days", "Cover", "t"], ["method", "Formula", "t"]],
  fn: C["safety-stock-calculator"], ex: { method: 0, level: 1, demand: 100, sdDemand: 20, lead: 7, sdLead: 0, maxDemand: 140, maxLead: 10 },
  exText: (o) => `Example: 100 units a day (σ 20) with a 7-day lead time at a 95% service level needs ${o.ss} of safety stock and a reorder point of ${String(o.rop).split(" (")[0]}.`,
  how: "Statistical safety stock = Z × √(lead time × σ_demand² + average demand² × σ_lead-time²). Z comes from the service level: 1.65 for 95%, 2.33 for 99%.\n\nMax–min = (max daily demand × max lead time) − (average daily demand × average lead time). Reorder point = average daily demand × lead time + safety stock.",
  assume: "Normally distributed, independent daily demand.",
  faq: [["What is the safety stock formula?", "SS = Z × σ_d × √LT for fixed lead times."], ["What Z-score for 95% service level?", "1.645."], ["What is a reorder point?", "Lead-time demand plus safety stock."]],
})];

const MFG: ToolDef[] = [mk({
  slug: "valve-cv-calculator", title: "Valve Cv Calculator (Flow Coefficient for Liquid & Gas)",
  meta: "Valve Cv Calculator — Flow Coefficient, GPM & Kv",
  desc: "Calculate a valve's flow coefficient (Cv) from liquid flow in gpm, pressure drop and specific gravity, find the flow for a given Cv, or size a gas valve in scfm, with the metric Kv.",
  inputs: [dd("mode", "Calculate", E.CV_MODES, 0), num("flow", "Flow (US gpm for liquid, scfm for gas)", 10, 0, 1e7, 0.01), num("cv", "Cv (flow mode)", 2, 0, 1e6, 0.01), num("dp", "Pressure Drop ΔP (psi)", 10, 0, 10000, 0.01), num("sg", "Specific Gravity (water = 1, air = 1)", 1, 0, 20, 0.001), num("p1", "Inlet Pressure (psig, gas only)", 100, 0, 10000, 0.1), num("temp", "Temperature (°F, gas only)", 68, -400, 2000, 1)],
  results: [["cv", "Flow Coefficient", "t"], ["flow", "Flow", "t"], ["kv", "Kv", "t"], ["formula", "Formula", "t"], ["note", "Note", "t"]],
  fn: C["valve-cv-calculator"], ex: { mode: 0, flow: 10, cv: 2, dp: 10, sg: 1, p1: 100, temp: 68 },
  exText: (o) => `Example: 10 gpm of water with a 10 psi drop needs a valve with ${o.cv} (${o.kv}).`,
  how: "Liquid: Cv = Q × √(SG ÷ ΔP), where Q is US gallons per minute and ΔP is in psi. Cv is the gpm of water that flows with a 1 psi drop.\n\nGas (Swagelok, non-choked): Q = 22.67 × Cv × P₁ × (1 − 2ΔP ÷ 3P₁) × √(ΔP ÷ (P₁ × SG × T₁)), with P₁ in psia and T₁ in °R. Kv = 0.865 × Cv.",
  assume: "Turbulent, non-flashing, non-choked flow.",
  faq: [["What does Cv mean?", "Gallons per minute of 60 °F water through the valve with a 1 psi pressure drop."], ["How do you convert Cv to Kv?", "Kv = 0.865 × Cv."], ["How do I size a valve?", "Calculate the required Cv and pick a valve with a rated Cv about 20–50% higher."]],
})];

const AGRI: ToolDef[] = [mk({
  slug: "pig-gestation-calculator", title: "Pig Gestation Calculator (Sow Farrowing Date)",
  meta: "Pig Gestation Calculator — Sow Farrowing Due Date",
  desc: "Find a sow's or gilt's farrowing (due) date from the breeding date — 114 days, or 3 months, 3 weeks and 3 days — with the likely window, pregnancy check dates and when to move her to the farrowing pen.",
  inputs: [date("bred", "Breeding Date", "today-30"), num("days", "Gestation Length (days)", 114, 100, 125, 1), date("asof", "As of", "today")],
  results: [["due", "Farrowing Date", "t"], ["window", "Likely Window", "t"], ["progress", "Progress", "t"], ["check", "Pregnancy Check", "t"], ["crate", "Farrowing Pen", "t"], ["rule", "Rule of Thumb", "t"]],
  fn: C["pig-gestation-calculator"], ex: { bred: NOW - 30, days: 114, asof: NOW },
  exText: (o) => `Example: a sow bred on 16 October 2026 should farrow on ${o.due} (window ${o.window}).`,
  how: "Pigs carry their litters for about 114 days — the \"3 months, 3 weeks, 3 days\" rule — with most farrowing between day 111 and 117.\n\nCheck for a return to heat 18–24 days after breeding, and confirm by ultrasound from about day 21–35.",
  assume: "Domestic pigs; breed, litter size and parity shift the date by a few days.",
  faq: [["How long is a pig pregnant?", "About 114 days."], ["What is the 3-3-3 rule for pigs?", "3 months, 3 weeks and 3 days of gestation."], ["When does a sow come back into heat after weaning?", "Usually 4–7 days after weaning."]],
})];

const FIN: ToolDef[] = [mk({
  slug: "lottery-odds-calculator", title: "Lottery Odds Calculator (Powerball, Mega Millions & Pick-N Odds)",
  meta: "Lottery Odds Calculator — Powerball & Mega Millions Odds",
  desc: "Calculate the odds of winning the jackpot and every prize tier for Powerball, Mega Millions, Lotto America, Lucky for Life, EuroMillions or any pick-N game, and your chance with several tickets.",
  inputs: [dd("game", "Game", E.LO_LABELS, 0), num("tickets", "Tickets Bought", 1, 1, 1e9, 1), num("pool", "Custom — Numbers in the Pool", 49, 1, 200, 1), num("pick", "Custom — Numbers Picked", 6, 1, 20, 1), num("bonus", "Custom — Bonus Ball Pool (0 = none)", 0, 0, 100, 1)],
  results: [["jackpot", "Jackpot Odds", "t"], ["pct", "Per Ticket", "t"], ["tickets", "With Your Tickets", "t"], ["tiers", "Prize Tiers", "t"], ["compare", "In Perspective", "t"]],
  fn: C["lottery-odds-calculator"], ex: { game: 0, tickets: 1, pool: 49, pick: 6, bonus: 0 },
  exText: (o) => `Example: the odds of winning the Powerball jackpot are ${o.jackpot}.`,
  how: "Jackpot odds = the number of ways to choose the main numbers, C(n, k) = n! ÷ (k! (n − k)!), times the bonus-ball pool. Powerball: C(69, 5) × 26 = 292,201,338.\n\nWith t tickets (all different), the chance of at least one jackpot is 1 − (1 − p)ᵗ.",
  assume: "Each ticket is a different combination; Mega Millions uses the April 2025 format (Mega Ball 1–24).",
  faq: [["What are the odds of winning Powerball?", "1 in 292,201,338."], ["What are the odds of winning Mega Millions?", "1 in 290,472,336."], ["Does buying more tickets help?", "Only a little: 100 tickets make it 1 in 2.9 million."]],
})];

async function main() {
  const all = [...PHYS, ...CHEM, ...ELEC, ...EARTH, ...BIZ, ...LOGI, ...MFG, ...AGRI, ...FIN];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); for (const t of all) console.log(`  ${t.slug}: ${t.examples}`); return; }
  await upsertTools("physics-calculators", PHYS);
  await upsertTools("chemistry-calculators", CHEM);
  await upsertTools("electrical-electronics-engineering-calculators", ELEC);
  await upsertTools("earth-weather-environment-calculators", EARTH);
  await upsertTools("hr-marketing-business-operations-calculators", BIZ);
  await upsertTools("freight-logistics-warehouse-calculators", LOGI);
  await upsertTools("manufacturing-metals-engineering-calculators", MFG);
  await upsertTools("agriculture-livestock-calculators", AGRI);
  await upsertTools("tax-calculators", FIN);
}
main().catch((e) => { console.error(e); process.exit(1); });
