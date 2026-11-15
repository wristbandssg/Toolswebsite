// One-time (but safe to re-run) batch setup script: 6 science/statistics tools from the general
// keyword check (15 Nov 2026 — Claude outputs/General_Keyword_Check.md): unit converter (Science >
// Math), speed-distance-time (Physics), average, weighted average and dice probability (Statistics &
// Probability), relative humidity (Earth, Weather & Environment).
// Formulas: src/lib/calc-engine-gen-sci.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-gen-sci-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-gen-sci";
import { mk, num, dd, tx, T, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.genSciCustomCalculators;
const uIdx = (s: string) => { const i = E.UNIT_OPTIONS.indexOf(s); if (i < 0) throw new Error(`unit option ${s}`); return i; };

const MATH: ToolDef[] = [
  mk({
    slug: "unit-converter-calculator", title: "Unit Converter (Length, Weight, Volume, Area, Temperature & More)",
    meta: "Unit Converter — Metric & Imperial Conversion Calculator",
    desc: "Convert between metric and imperial units of length, weight, volume, area, temperature, speed, time, digital storage, energy and pressure: cm to inches, kg to lb, litres to gallons, °C to °F and more, with every unit shown at once.",
    inputs: [num("x", "Value", 10, -1e15, 1e15, 0.000001), dd("from", "From", E.UNIT_OPTIONS, uIdx("Length — Centimetre (cm)")), dd("to", "To", E.UNIT_OPTIONS, uIdx("Length — Inch (in)"))],
    results: [["result", "Conversion", "t"], ["value", "Converted Value", "n", 8], ["factor", "Conversion Factor", "t"], ["group", "Measurement", "t"], ["all", "In Every Unit", "t"]],
    fn: C["unit-converter-calculator"], ex: { x: 10, from: uIdx("Length — Centimetre (cm)"), to: uIdx("Length — Inch (in)") },
    exText: (o) => `Example: ${o.result}. ${o.factor}.`,
    how: "Choose the unit you have and the unit you want from the same group (for example two lengths). The value is converted through the SI base unit using exact definitions: 1 inch = 2.54 cm, 1 lb = 0.45359237 kg, 1 US gallon = 3.785411784 L.\n\nTemperature isn't a simple multiplication: °F = °C × 9/5 + 32 and K = °C + 273.15.",
    assume: "US customary cups, pints, quarts and gallons unless marked UK. kB/MB/GB are decimal (1000); KiB/MiB/GiB are binary (1024). A month is 30.437 days and a year is 365.25 days.",
    faq: [["How many centimetres are in an inch?", "Exactly 2.54."], ["How do I convert kg to pounds?", "Multiply by 2.20462. 70 kg ≈ 154.3 lb."], ["What is 100 °F in Celsius?", "About 37.8 °C."]],
  }),
];

const PHYS: ToolDef[] = [
  mk({
    slug: "speed-distance-time-calculator", title: "Speed Distance Time Calculator",
    meta: "Speed Distance Time Calculator — Find Speed, Distance or Time",
    desc: "Solve for speed, distance or time from the other two, in mph, km/h, m/s, ft/s or knots and miles, kilometres, metres, feet or nautical miles, with the answer in every unit and the matching pace per mile and km.",
    inputs: [dd("solve", "Solve For", E.SDT_SOLVE, 0), num("d", "Distance", 150, 0, 1e12, 0.0001), dd("dunit", "Distance Unit", E.SDT_DIST, 0), tx("t", "Time (h:mm:ss, 2h 30m or decimal hours)", "2:30:00"), num("s", "Speed", 60, 0, 1e9, 0.0001), dd("sunit", "Speed Unit", E.SDT_SPEED, 0)],
    results: [["result", "Answer", "t"], ["speed", "Speed", "t"], ["distance", "Distance", "t"], ["time", "Time", "t"], ["pace", "Pace", "t"], ["formula", "Formula", "t"]],
    fn: C["speed-distance-time-calculator"], ex: { solve: 0, d: 150, dunit: 0, ...T("t", "2:30:00"), s: 60, sunit: 0 },
    exText: (o) => `Example: 150 miles in 2 hours 30 minutes is an average speed of ${o.result} (${o.speed}).`,
    how: "Speed = distance ÷ time, distance = speed × time and time = distance ÷ speed. Pick what you want to find, then fill in the other two.\n\nEnter time as 2:30:00, 2h 30m or 2.5 (hours). Units are converted for you, so you can mix miles with km/h.",
    assume: "Average (constant) speed. For running pace and race predictions, use the Pace Calculator.",
    faq: [["How long does it take to drive 300 miles at 65 mph?", "About 4 h 37 min."], ["How do I convert km/h to m/s?", "Divide by 3.6. 90 km/h = 25 m/s."]],
  }),
];

const STATS: ToolDef[] = [
  mk({
    slug: "average-calculator", title: "Average Calculator (Mean of a List of Numbers)",
    meta: "Average Calculator — Find the Mean of Numbers",
    desc: "Find the average (mean) of any list of numbers, plus the sum, count, median, mode, range, minimum and maximum, and the geometric and harmonic means.",
    inputs: [tx("list", "Numbers (separated by commas or spaces)", "85, 92, 78, 90, 88, 95, 72")],
    results: [["mean", "Average (Mean)", "n", 6], ["sum", "Sum", "n", 6], ["count", "Count", "n", 0], ["median", "Median", "n", 6], ["mode", "Mode", "t"], ["range", "Range", "t"], ["others", "Other Averages", "t"], ["working", "Working", "t"]],
    fn: C["average-calculator"], ex: { ...T("list", "85, 92, 78, 90, 88, 95, 72") },
    exText: (o) => `Example: the average of 85, 92, 78, 90, 88, 95 and 72 is ${o.mean} (sum ${o.sum} ÷ ${o.count}).`,
    how: "The average (arithmetic mean) is the sum of the numbers divided by how many there are. The median is the middle value when sorted, and the mode is the most common value.\n\nPaste a column of numbers straight from a spreadsheet — commas, spaces, tabs and new lines all work.",
    assume: "For averages where some values count more than others (like course credits), use the Weighted Average Calculator.",
    faq: [["How do you calculate an average?", "Add the numbers, then divide by how many there are. (4 + 8 + 9) ÷ 3 = 7."], ["What's the difference between mean and median?", "The mean uses every value; the median is the middle one, so outliers move it less."]],
  }),
  mk({
    slug: "weighted-average-calculator", title: "Weighted Average Calculator",
    meta: "Weighted Average Calculator — Σ(value × weight) ÷ Σweight",
    desc: "Calculate a weighted average (weighted mean) from a list of values and their weights, with the sum of weights, each item's share and a comparison with the simple average.",
    inputs: [tx("values", "Values", "80, 90, 75"), tx("weights", "Weights (same order)", "20, 30, 50")],
    results: [["result", "Weighted Average", "n", 6], ["sumW", "Sum of Weights", "n", 6], ["sumWX", "Sum of Value × Weight", "n", 6], ["plain", "Simple Average", "n", 6], ["diff", "Difference", "t"], ["table", "Breakdown", "t"]],
    fn: C["weighted-average-calculator"], ex: { ...T("values", "80, 90, 75"), ...T("weights", "20, 30, 50") },
    exText: (o) => `Example: values 80, 90, 75 with weights 20, 30, 50 have a weighted average of ${o.result}, compared with a simple average of ${o.plain}.`,
    how: "Multiply each value by its weight, add those products, then divide by the total of the weights: (80×20 + 90×30 + 75×50) ÷ 100 = 80.5.\n\nWeights can be percentages, credits, quantities or any positive numbers; they don't need to add up to 100.",
    assume: "Weights must be zero or positive. For class grades by category, the Weighted Grade Calculator adds letter grades.",
    faq: [["When should I use a weighted average?", "When items matter unequally, such as exam vs homework scores, or prices bought in different quantities."], ["Do the weights have to add up to 100?", "No — dividing by their total handles any scale."]],
  }),
  mk({
    slug: "dice-probability-calculator", title: "Dice Probability Calculator",
    meta: "Dice Probability Calculator — Odds of Rolling a Sum",
    desc: "Find the probability of rolling an exact sum, at least or at most a target, with any number of dice and any number of sides (d4, d6, d8, d10, d12, d20 or custom), with the odds and the distribution's mean.",
    inputs: [num("n", "Number of Dice", 2, 1, 100, 1), num("sides", "Sides per Die", 6, 2, 1000, 1), num("target", "Target Sum", 7, 1, 100000, 1), dd("cmp", "Probability Of", E.DICE_CMP, 0)],
    results: [["prob", "Probability", "t"], ["odds", "Odds", "t"], ["ways", "Ways", "t"], ["range", "Possible Sums", "t"], ["stats", "Mean & Spread", "t"], ["raw", "Probability (decimal)", "n", 8]],
    fn: C["dice-probability-calculator"], ex: { n: 2, sides: 6, target: 7, cmp: 0 },
    exText: (o) => `Example: the chance of rolling a total of 7 with two six-sided dice is ${o.prob} (${o.odds}) — ${o.ways}.`,
    how: "Every face of a fair die is equally likely. With several dice, the chance of each total comes from counting combinations: two dice can make 7 in 6 of the 36 ways, so P = 1/6.\n\nThe calculator builds the exact distribution of sums one die at a time, then adds up the totals that match your condition.",
    assume: "Fair, independent dice numbered 1 to the number of sides.",
    faq: [["What is the most common roll with 2 dice?", "7, with a 16.67% chance."], ["What are the odds of rolling a 20 on a d20?", "1 in 20 (5%)."]],
  }),
];

const EARTH: ToolDef[] = [
  mk({
    slug: "relative-humidity-calculator", title: "Relative Humidity Calculator (From Temperature & Dew Point)",
    meta: "Relative Humidity Calculator — RH from Dew Point",
    desc: "Calculate relative humidity from the air temperature and dew point, or the dew point from temperature and relative humidity, in °F or °C, with vapour pressure, absolute humidity and how humid it feels.",
    inputs: [dd("mode", "Calculate", E.RH_MODES, 0), dd("unit", "Temperature Unit", E.TEMP_UNITS, 0), num("t", "Air Temperature", 77, -100, 150, 0.1), num("td", "Dew Point", 60, -100, 150, 0.1), num("rh", "Relative Humidity (%)", 50, 0.1, 100, 0.1)],
    results: [["rh", "Relative Humidity", "t"], ["dew", "Dew Point", "t"], ["comfort", "How It Feels", "t"], ["vapor", "Vapour Pressure", "t"], ["absolute", "Absolute Humidity", "t"], ["raw", "RH (number)", "n", 2]],
    fn: C["relative-humidity-calculator"], ex: { mode: 0, unit: 0, t: 77, td: 60, rh: 50 },
    exText: (o) => `Example: at 77 °F with a 60 °F dew point, the relative humidity is ${o.rh}. It feels "${String(o.comfort).split(" (")[0].toLowerCase()}".`,
    how: "Relative humidity is how much water vapour the air holds compared with the most it could hold at that temperature: RH = e(dew point) ÷ e(temperature) × 100, where e is the saturation vapour pressure from the Magnus formula.\n\nThe dew point is a better guide to comfort than RH: below about 55 °F feels dry and above 65 °F feels sticky, whatever the temperature.",
    assume: "Magnus formula with Alduchov–Eskridge constants (a = 17.625, b = 243.04 °C), accurate within about 0.4% from −40 to 50 °C, at sea-level pressure over water.",
    faq: [["What is a comfortable relative humidity indoors?", "About 30–50%."], ["Can relative humidity be over 100%?", "Not in normal air — at 100% the air is saturated and water condenses as dew, fog or cloud."]],
  }),
];

async function main() {
  const all = [...MATH, ...PHYS, ...STATS, ...EARTH];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); return; }
  await upsertTools("math-calculators", MATH);
  await upsertTools("physics-calculators", PHYS);
  await upsertTools("statistics-probability-calculators", STATS);
  await upsertTools("earth-weather-environment-calculators", EARTH);
}
main().catch((e) => { console.error(e); process.exit(1); });
