// One-time (but safe to re-run) batch setup script: 6 converters from the mixed keyword check
// (16 Nov 2026 — Claude outputs/Mixed_Keyword_Check.md): height converter and feet & inches (Science >
// Math), torque units (Mechanical), gallons to pounds (Physics), cubic yards to tons (House & Garden >
// Gravel) and lumens to watts (House & Garden > HVAC, Plumbing & Electrical).
// Formulas: src/lib/calc-engine-mix-conv.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-mix-conv-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-mix-conv";
import { mk, num, dd, tx, T, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.mixConvCustomCalculators;
const VOL = E.VOL_UNITS.map((u) => u[0]);

const MATH: ToolDef[] = [
  mk({
    slug: "height-converter-calculator", title: "Height Converter (Feet & Inches ↔ cm)",
    meta: "Height Converter — Feet and Inches to cm and cm to Feet",
    desc: "Convert your height from feet and inches to centimetres, or from cm to feet and inches, in one step. It also shows metres, total inches and how you compare with the average US man and woman.",
    inputs: [dd("mode", "Convert", E.HEIGHT_MODES, 0), num("feet", "Feet", 5, 0, 9, 1), num("inches", "Inches", 9, 0, 11.99, 0.25), num("cm", "Centimetres", 175, 1, 300, 0.1), num("totalIn", "Total Inches", 69, 1, 120, 0.25)],
    results: [["result", "Height", "t"], ["cm", "Centimetres", "n", 1], ["feetInches", "Feet & Inches", "t"], ["inches", "Total Inches", "t"], ["meters", "Metres", "t"], ["feetDecimal", "Decimal Feet", "t"], ["vsMen", "Compared with Men", "t"], ["vsWomen", "Compared with Women", "t"]],
    fn: C["height-converter-calculator"], ex: { mode: 0, feet: 5, inches: 9, cm: 175, totalIn: 69 },
    exText: (o) => `Example: 5 feet 9 inches is ${o.result} (${o.meters}). That is ${o.vsMen}.`,
    how: "Choose the direction, then enter your height. Feet and inches go into separate boxes, so 5′ 9″ is 5 in Feet and 9 in Inches.\n\nThe maths: total inches = feet × 12 + inches, and cm = inches × 2.54. Going back, divide cm by 2.54, then split the inches into whole feet (÷ 12) and the inches left over.",
    assume: "1 inch = 2.54 cm exactly. Feet and inches are shown to the nearest quarter inch. Averages are CDC NHANES 2015–2018 figures for US adults aged 20 and over: men 175.3 cm (5′ 9″), women 161.3 cm (5′ 3½″).",
    faq: [["How tall is 5′ 6″ in cm?", "167.6 cm."], ["What is 170 cm in feet?", "5′ 7″ (66.9 inches)."], ["What is 6 feet in cm?", "182.9 cm."], ["What is 160 cm in feet and inches?", "5′ 3″ (63.0 inches)."]],
  }),
  mk({
    slug: "feet-and-inches-calculator", title: "Feet and Inches Calculator (Add, Subtract & Convert)",
    meta: "Feet and Inches Calculator — Add & Subtract ft-in with Fractions",
    desc: "Add, subtract, multiply or divide lengths in feet and inches with fractions, like a tape measure. Results are shown to the nearest 1/16 inch, with total inches, decimal feet, yards and metric.",
    inputs: [tx("a", "Length A (e.g. 5' 7 1/2\" or 5ft 7in)", "5' 7 1/2\""), dd("op", "Operation", E.FI_OPS, 0), tx("b", "Length B (or a number to multiply/divide by)", "3' 8 3/4\""), dd("round", "Round To", E.FI_ROUND, 0)],
    results: [["result", "Answer", "t"], ["inches", "Total Inches", "t"], ["feet", "Decimal Feet", "t"], ["yards", "Yards", "t"], ["metric", "Metric", "t"], ["working", "Working", "t"]],
    fn: C["feet-and-inches-calculator"], ex: { ...T("a", "5' 7 1/2\""), op: 0, ...T("b", "3' 8 3/4\""), round: 0 },
    exText: (o) => `Example: 5′ 7½″ + 3′ 8¾″ = ${o.result} (${o.inches}).`,
    how: "Type a length the way you would write it: 5' 7 1/2\", 5ft 7in, 5-7, 67in or 67\". A plain number like 5.5 is read as feet, and you can also type 170cm or 2m.\n\nThe calculator turns both lengths into inches, does the sum, then turns the answer back into feet and inches. 12 inches make a foot, so 15 1/4″ is carried over to 1′ 3 1/4″.\n\nTo multiply or divide (for example to split a board into 3 equal pieces), put a plain number in B.",
    assume: "Answers are rounded to the fraction you choose; total inches and decimal feet are not rounded. 1 inch = 2.54 cm.",
    faq: [["How do I add feet and inches?", "Add the inches, then the feet. Every 12 inches carries over as 1 foot: 5′ 7″ + 3′ 8″ = 8′ 15″ = 9′ 3″."], ["How many inches is 5′ 7″?", "67 inches (5 × 12 + 7)."], ["How do I convert inches to feet and inches?", "Divide by 12. The whole number is feet and the remainder is inches: 100″ = 8′ 4″."], ["What is 3/8 inch as a decimal?", "0.375 inch."]],
  }),
];

const MECH: ToolDef[] = [
  mk({
    slug: "torque-conversion-calculator", title: "Torque Conversion Calculator (N·m, ft-lb, in-lb)",
    meta: "Torque Converter — Nm to ft-lb, in-lb to ft-lb & More",
    desc: "Convert torque between newton-metres, foot-pounds, inch-pounds, inch-ounces, kgf·m, kgf·cm, N·cm, daN·m and kN·m. Every unit is shown at once, which helps when reading torque-wrench specs.",
    inputs: [num("x", "Torque Value", 100, -1e12, 1e12, 0.0001), dd("from", "From", E.TORQUE_LABELS, 0), dd("to", "To", E.TORQUE_LABELS, 1)],
    results: [["result", "Conversion", "t"], ["value", "Converted Value", "n", 6], ["factor", "Conversion Factor", "t"], ["all", "In Every Unit", "t"]],
    fn: C["torque-conversion-calculator"], ex: { x: 100, from: 0, to: 1 },
    exText: (o) => `Example: ${o.result}. ${o.factor}.`,
    how: "Torque is force × distance, so its units pair a force with a length. 1 ft-lb is one pound-force acting at one foot: 4.44822 N × 0.3048 m = 1.35582 N·m.\n\nUseful shortcuts: N·m × 0.7376 = ft-lb, ft-lb × 12 = in-lb, in-lb ÷ 8.851 = N·m.",
    assume: "Exact definitions: 1 lbf = 4.4482216152605 N, 1 ft = 0.3048 m, 1 kgf = 9.80665 N. \"ft-lb\" here means torque (pound-force foot), not the energy unit.",
    faq: [["How many ft-lb is 100 N·m?", "73.76 ft-lb."], ["How do I convert ft-lb to in-lb?", "Multiply by 12. 25 ft-lb = 300 in-lb."], ["How do I convert in-lb to ft-lb?", "Divide by 12. 240 in-lb = 20 ft-lb."], ["What is 1 kgf·m in N·m?", "9.80665 N·m."]],
  }),
];

const PHYS: ToolDef[] = [
  mk({
    slug: "gallons-to-pounds-calculator", title: "Gallons to Pounds Calculator (Water & Liquid Weight)",
    meta: "Gallons to Pounds — How Much Does a Gallon of Water Weigh?",
    desc: "Convert gallons, litres, quarts or cubic feet of water, milk, gasoline, diesel, oil, honey or any liquid to pounds or kilograms, or pounds back to gallons, using each liquid's density.",
    inputs: [dd("mode", "Convert", E.GP_MODES, 0), num("amount", "Amount", 1, 0, 1e12, 0.0001), dd("vunit", "Volume Unit", VOL, 0), dd("wunit", "Weight Unit", E.WT_UNITS, 0), dd("liquid", "Liquid", E.LIQUID_LABELS, 0), num("density", "Custom Density (kg/L, if Custom)", 1, 0.01, 25, 0.001)],
    results: [["result", "Answer", "t"], ["pounds", "Pounds", "t"], ["kilograms", "Kilograms", "t"], ["gallons", "Volume", "t"], ["perGallon", "Weight per Gallon", "t"], ["raw", "Answer (number)", "n", 6]],
    fn: C["gallons-to-pounds-calculator"], ex: { mode: 0, amount: 1, vunit: 0, wunit: 0, liquid: 0, density: 1 },
    exText: (o) => `Example: 1 US gallon of water weighs ${o.result} (${o.kilograms}).`,
    how: "Weight = volume × density. A US gallon is 3.785 litres, and water's density is about 0.998 kg per litre at room temperature, so a gallon weighs 3.778 kg = 8.33 lb.\n\nOther liquids differ: gasoline is lighter (about 6.2 lb/gal) and honey heavier (about 11.9 lb/gal). Pick a liquid, or choose Custom and enter its density in kg/L (the same as its specific gravity).",
    assume: "Densities are typical values at about 60–70 °F; real fuels, oils and milks vary a few percent by blend and temperature. A UK (imperial) gallon is 4.546 L, so it holds about 10.0 lb of water.",
    faq: [["How much does a gallon of water weigh?", "About 8.33 lb (3.78 kg) at room temperature, or 8.34 lb at 39 °F."], ["How much does 5 gallons of water weigh?", "About 41.7 lb."], ["How much does a gallon of gasoline weigh?", "About 6.2 lb (6.0–6.3 depending on the blend)."], ["How much does a gallon of diesel weigh?", "About 7.1 lb."]],
  }),
];

const GRAVEL: ToolDef[] = [
  mk({
    slug: "cubic-yards-to-tons-calculator", title: "Cubic Yards to Tons Calculator",
    meta: "Cubic Yards to Tons Calculator — Gravel, Sand, Soil & Stone",
    desc: "Convert cubic yards to tons, or tons to cubic yards, for gravel, crushed stone, sand, topsoil, fill dirt, asphalt, concrete and mulch, with metric tonnes, pounds and truckloads.",
    inputs: [dd("mode", "Convert", E.CYT_MODES, 0), num("amount", "Amount", 10, 0, 1e9, 0.01), dd("material", "Material", E.BULK_LABELS, 1), num("custom", "Custom Density (tons per yd³)", 1.4, 0.01, 5, 0.01), num("truck", "Truck Capacity (tons, optional)", 15, 0, 100, 0.5)],
    results: [["result", "Answer", "t"], ["tons", "US Tons", "t"], ["tonnes", "Metric Tonnes", "t"], ["yards", "Volume", "t"], ["density", "Density Used", "t"], ["trucks", "Truckloads", "t"], ["raw", "Answer (number)", "n", 4]],
    fn: C["cubic-yards-to-tons-calculator"], ex: { mode: 0, amount: 10, material: 1, custom: 1.4, truck: 15 },
    exText: (o) => `Example: 10 cubic yards of #57 crushed stone weighs about ${o.result}, which is ${o.trucks}.`,
    how: "Quarries sell by the ton but you measure in cubic yards. Tons = cubic yards × density, and cubic yards = tons ÷ density. #57 stone is about 1.4 tons per yd³, so 10 yd³ ≈ 14 tons.\n\nIf you only have length, width and depth, work out cubic yards first with the Cubic Yard Calculator, or use the Gravel Calculator.",
    assume: "Loose (as-delivered) bulk densities in US short tons (2,000 lb), from typical supplier charts. Moisture and compaction change weight by 10–30%, so ask your supplier for their figure and enter it as Custom.",
    faq: [["How many tons is a cubic yard of gravel?", "About 1.35–1.45 tons for most gravel and crushed stone."], ["How many cubic yards are in a ton of topsoil?", "About 0.9 yd³ (topsoil is about 1.1 tons per yd³)."], ["How many tons is a yard of sand?", "About 1.35 tons dry, up to 1.7 tons wet."], ["Is a ton the same as a tonne?", "No. A US ton is 2,000 lb; a metric tonne is 1,000 kg (2,204.6 lb)."]],
  }),
];

const ELEC: ToolDef[] = [
  mk({
    slug: "lumens-to-watts-calculator", title: "Lumens to Watts Calculator (LED, CFL, Halogen & Incandescent)",
    meta: "Lumens to Watts Calculator — LED Bulb Equivalent",
    desc: "Convert lumens to watts, or watts to lumens, for LED, CFL, halogen, incandescent and fluorescent bulbs. It shows the incandescent equivalent, other bulb types and the yearly energy cost.",
    inputs: [dd("mode", "Convert", E.LW_MODES, 0), num("x", "Lumens or Watts", 800, 0, 1e7, 1), dd("bulb", "Bulb Type", E.BULB_LABELS, 0), num("eff", "Custom Efficacy (lm/W, if Custom)", 90, 1, 250, 1), num("hours", "Hours On per Day", 3, 0, 24, 0.5), num("price", "Electricity Price ($/kWh)", 0.17, 0, 2, 0.01)],
    results: [["result", "Answer", "t"], ["lumens", "Brightness", "t"], ["watts", "Power", "t"], ["incandescent", "Old-Bulb Equivalent", "t"], ["others", "Same Brightness in Other Bulbs", "t"], ["yearly", "Energy Use", "t"]],
    fn: C["lumens-to-watts-calculator"], ex: { mode: 0, x: 800, bulb: 0, eff: 90, hours: 3, price: 0.17 },
    exText: (o) => `Example: an 800-lumen LED uses about ${o.result}, the same light as a ${String(o.incandescent).replace("≈ ", "").replace(" incandescent equivalent", "")} incandescent bulb.`,
    how: "Lumens measure light; watts measure power. Watts = lumens ÷ efficacy (lumens per watt). LEDs give about 90 lm/W, CFLs about 60, halogens about 18 and old incandescents about 14.\n\nShopping tip: match the lumens on the box to the bulb you're replacing. 450 lm = an old 40 W bulb, 800 lm = 60 W, 1,100 lm = 75 W and 1,600 lm = 100 W.",
    assume: "Typical efficacies; check the packaging for your bulb's exact lumens and watts and enter them as Custom. Incandescent equivalents follow the ENERGY STAR chart, interpolated between its points.",
    faq: [["How many watts is 800 lumens?", "About 9 W for an LED, 13 W for a CFL, 43 W halogen or 60 W incandescent."], ["How many lumens is a 60 W bulb?", "About 800 lumens."], ["How many lumens does a 10 W LED give?", "About 800–1,000 lumens."], ["Are more watts brighter?", "Only within the same bulb type. Compare lumens across types."]],
  }),
];

async function main() {
  const all = [...MATH, ...MECH, ...PHYS, ...GRAVEL, ...ELEC];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); for (const t of all) console.log(`  ${t.slug}: ${t.examples}`); return; }
  await upsertTools("math-calculators", MATH);
  await upsertTools("mechanical-structural-engineering-calculators", MECH);
  await upsertTools("physics-calculators", PHYS);
  await upsertTools("gravel-soil-landscaping-calculators", GRAVEL);
  await upsertTools("hvac-plumbing-electrical-calculators", ELEC);
}
main().catch((e) => { console.error(e); process.exit(1); });
