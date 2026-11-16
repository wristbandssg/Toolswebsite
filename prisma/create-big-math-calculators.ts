// One-time (but safe to re-run) batch setup script: 12 tools from the big generic keyword check
// (16 Nov 2026 — Claude outputs/Big_Generic_Keyword_Check.md). Science > Math: angle
// relationships, interval notation, scale factor, rectangle diagonal, DMS, triangle centers,
// golden ratio, Fibonacci, day of the year, leap year. Statistics & Probability: pie chart,
// sensitivity & specificity. Formulas: src/lib/calc-engine-big-math.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-big-math-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-big-math";
import { mk, num, dd, tx, date, T, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.bigMathCustomCalculators;
const NOW = 20772; // 15 Nov 2026

const MATH: ToolDef[] = [
  mk({
    slug: "angle-relationships-calculator", title: "Angle Calculator (Complementary, Supplementary, Vertical & Exterior Angles)",
    meta: "Angle Calculator — Complementary, Supplementary & Exterior",
    desc: "Enter an angle to get its complement, supplement, vertical angle, conjugate (360° − angle), type and radians. Add a second angle to find a triangle's third and exterior angles, or a number of sides for regular polygon angles.",
    inputs: [num("angle", "Angle (°)", 35, 0, 360, 0.01), num("angle2", "Second Triangle Angle (°, optional)", 65, 0, 180, 0.01), num("sides", "Polygon Sides (optional)", 0, 0, 1000, 1)],
    results: [["supplement", "Supplementary Angle", "t"], ["complement", "Complementary Angle", "t"], ["vertical", "Vertical Angle", "t"], ["conjugate", "Conjugate (Explementary)", "t"], ["type", "Angle Type", "t"], ["radians", "In Radians", "t"], ["triangle", "Triangle", "t"], ["polygon", "Polygon", "t"]],
    fn: C["angle-relationships-calculator"], ex: { angle: 35, angle2: 65, sides: 0 },
    exText: (o) => `Example: 35° has a complement of ${o.complement} and a supplement of ${o.supplement}. With a second angle of 65°, ${String(o.triangle).charAt(0).toLowerCase() + String(o.triangle).slice(1)}.`,
    how: "Complementary angles add to 90°, supplementary angles add to 180°, and conjugate (explementary) angles add to 360°. Vertical angles — opposite each other where two lines cross — are equal.\n\nIn a triangle the angles add to 180°, and an exterior angle equals the sum of the two interior angles opposite it. A regular n-sided polygon has interior angles of (n − 2) × 180° ÷ n.",
    assume: "Angles in degrees.",
    faq: [["What is the supplement of 120°?", "60°."], ["What is the complement of 25°?", "65°."], ["What is the exterior angle theorem?", "An exterior angle of a triangle equals the sum of the two remote interior angles."]],
  }),
  mk({
    slug: "interval-notation-calculator", title: "Interval Notation Calculator (Inequality to Interval, Union & Intersection)",
    meta: "Interval Notation Calculator — Inequalities, Union & Intersection",
    desc: "Convert inequalities like −2 < x ≤ 5 or x < 0 or x ≥ 3 to interval notation (and back), with set-builder notation and how to graph it, plus the union and intersection of two sets.",
    inputs: [tx("a", "Inequality or Interval (e.g. -2 < x <= 5, x > 3 or x < -1, (1, 4])", "-2 < x <= 5"), tx("b", "Second Set (optional, for ∪ and ∩)", "x >= 3")],
    results: [["interval", "Interval Notation", "t"], ["inequality", "Inequality", "t"], ["setBuilder", "Set-Builder Notation", "t"], ["graph", "Number Line", "t"], ["union", "Union A ∪ B", "t"], ["intersection", "Intersection A ∩ B", "t"]],
    fn: C["interval-notation-calculator"], ex: { ...T("a", "-2 < x <= 5"), ...T("b", "x >= 3") },
    exText: (o) => `Example: −2 < x ≤ 5 is ${o.interval}. Combined with x ≥ 3, the union is ${o.union} and the intersection is ${o.intersection}.`,
    how: "Use a parenthesis ( ) when the end point isn't included (< or >) and a square bracket [ ] when it is (≤ or ≥). Infinity always gets a parenthesis. Join pieces with \"or\" (union ∪) or \"and\" (intersection ∩).\n\nOn a number line, an open circle means not included and a closed (filled) circle means included.",
    assume: "Type <= and >= or ≤ and ≥; inf or ∞ for infinity. Fractions like 1/2 are allowed.",
    faq: [["How do you write x > 3 in interval notation?", "(3, ∞)."], ["What does a square bracket mean?", "The end point is included."], ["What is the union of (−∞, 1) and [3, 5]?", "(−∞, 1) ∪ [3, 5]."]],
  }),
  mk({
    slug: "scale-factor-calculator", title: "Scale Factor Calculator (Similar Figures & Scale Drawings)",
    meta: "Scale Factor Calculator — Similar Figures & 1:N Drawings",
    desc: "Find the scale factor between similar figures, convert a scale drawing (1:50, 1:100) to real size and back, or scale a length, area and volume by a factor k.",
    inputs: [dd("mode", "Calculate", E.SF_MODES, 0), num("a", "Original Length (or drawing / real length)", 4, 0, 1e9, 0.0001), num("b", "New Length", 10, 0, 1e9, 0.0001), num("n", "Scale 1 : N — N", 50, 0, 1e9, 1), num("k", "Scale Factor k", 2.5, 0, 1e6, 0.0001)],
    results: [["result", "Answer", "t"], ["detail", "Working", "t"], ["area", "Area", "t"], ["volume", "Volume", "t"], ["ratio", "Ratio", "t"]],
    fn: C["scale-factor-calculator"], ex: { mode: 0, a: 4, b: 10, n: 50, k: 2.5 },
    exText: (o) => `Example: a side that grows from 4 cm to 10 cm has a ${String(o.result).toLowerCase()}, so areas grow ${String(o.area).replace("Areas ", "")}.`,
    how: "Scale factor = new length ÷ original length. Above 1 is an enlargement, below 1 a reduction. Areas scale by k² and volumes by k³.\n\nOn a 1 : 50 drawing, 1 cm on paper is 50 cm in real life: real = drawing × 50, drawing = real ÷ 50.",
    assume: "Lengths must use the same unit.",
    faq: [["How do you find a scale factor?", "Divide a length in the new figure by the matching length in the original."], ["What does 1:100 scale mean?", "1 unit on the drawing is 100 of the same units in reality."], ["How does scale factor affect area?", "Area is multiplied by the scale factor squared."]],
  }),
  mk({
    slug: "rectangle-diagonal-calculator", title: "Rectangle Diagonal Calculator (Diagonal of a Rectangle or Square)",
    meta: "Diagonal of a Rectangle Calculator — Length, Width & Angle",
    desc: "Find the diagonal of a rectangle or square from its length and width (√(l² + w²)), with the angle, area and perimeter, or work out the sides from a diagonal and aspect ratio such as 16:9.",
    inputs: [dd("mode", "Calculate", E.RD_MODES, 0), num("length", "Length", 12, 0, 1e9, 0.001), num("width", "Width (0 = square)", 5, 0, 1e9, 0.001), num("diagonal", "Diagonal", 55, 0, 1e9, 0.001), num("rw", "Aspect Ratio Width", 16, 0, 1000, 0.01), num("rh", "Aspect Ratio Height", 9, 0, 1000, 0.01)],
    results: [["diagonal", "Diagonal", "t"], ["sides", "Sides", "t"], ["angle", "Diagonal Angle", "t"], ["area", "Area", "t"], ["perimeter", "Perimeter", "t"]],
    fn: C["rectangle-diagonal-calculator"], ex: { mode: 0, length: 12, width: 5, diagonal: 55, rw: 16, rh: 9 },
    exText: (o) => `Example: a 12 × 5 rectangle has a diagonal of ${o.diagonal} and makes an angle of ${o.angle}.`,
    how: "By the Pythagorean theorem, diagonal = √(length² + width²). A square's diagonal is side × √2 ≈ side × 1.414.\n\nFrom a diagonal and aspect ratio w : h, length = d × w ÷ √(w² + h²) and width = d × h ÷ √(w² + h²).",
    assume: "Any unit; results use the same unit.",
    faq: [["What is the diagonal of a 10 × 10 square?", "14.142."], ["What is the diagonal of a 3 × 4 rectangle?", "5."], ["How do I square a frame?", "Measure both diagonals — they're equal when the corners are square."]],
  }),
  mk({
    slug: "dms-calculator", title: "DMS Calculator (Degrees Minutes Seconds ↔ Decimal Degrees)",
    meta: "DMS Calculator — Degrees, Minutes, Seconds to Decimal",
    desc: "Convert decimal degrees to degrees, minutes and seconds (DMS) and back, or add and subtract DMS angles, for GPS coordinates, surveying and astronomy.",
    inputs: [dd("mode", "Calculate", E.DMS_MODES, 0), num("decimal", "Decimal Degrees", 40.7128, -360, 360, 0.000001), num("d1", "Angle 1 — Degrees", 40, -360, 360, 1), num("m1", "Angle 1 — Minutes", 42, 0, 59, 1), num("s1", "Angle 1 — Seconds", 46.08, 0, 59.999, 0.001), num("d2", "Angle 2 — Degrees", 10, -360, 360, 1), num("m2", "Angle 2 — Minutes", 30, 0, 59, 1), num("s2", "Angle 2 — Seconds", 0, 0, 59.999, 0.001)],
    results: [["dms", "Degrees Minutes Seconds", "t"], ["decimal", "Decimal Degrees", "t"], ["radians", "Radians", "t"], ["compass", "As a Coordinate", "t"]],
    fn: C["dms-calculator"], ex: { mode: 0, decimal: 40.7128, d1: 40, m1: 42, s1: 46.08, d2: 10, m2: 30, s2: 0 },
    exText: (o) => `Example: 40.7128° is ${o.dms}.`,
    how: "Degrees = whole part. Minutes = decimal part × 60 (whole part). Seconds = what's left × 60. 40.7128° → 40° 42′ 46.08″.\n\nBack to decimal: degrees + minutes ÷ 60 + seconds ÷ 3600.",
    assume: "A negative degree value makes the whole angle negative (south or west).",
    faq: [["How do you convert decimal degrees to DMS?", "Multiply the decimal part by 60 for minutes, and the remainder by 60 for seconds."], ["What is 1 minute of latitude?", "1/60 of a degree, about 1 nautical mile."], ["How do I enter south or west?", "Use a negative number of degrees."]],
  }),
  mk({
    slug: "triangle-centers-calculator", title: "Triangle Centers Calculator (Orthocenter, Circumcenter, Incenter & Centroid)",
    meta: "Orthocenter & Circumcenter Calculator from 3 Vertices",
    desc: "Find a triangle's orthocenter, circumcenter, incenter and centroid from the coordinates of its three vertices, with the circumradius, inradius, area and the Euler line.",
    inputs: [num("x1", "A — x", 0, -1e9, 1e9, 0.01), num("y1", "A — y", 0, -1e9, 1e9, 0.01), num("x2", "B — x", 6, -1e9, 1e9, 0.01), num("y2", "B — y", 0, -1e9, 1e9, 0.01), num("x3", "C — x", 2, -1e9, 1e9, 0.01), num("y3", "C — y", 4, -1e9, 1e9, 0.01)],
    results: [["orthocenter", "Orthocenter (H)", "t"], ["circumcenter", "Circumcenter (O)", "t"], ["centroid", "Centroid (G)", "t"], ["incenter", "Incenter (I)", "t"], ["radii", "Radii", "t"], ["euler", "Euler Line", "t"], ["area", "Area", "t"]],
    fn: C["triangle-centers-calculator"], ex: { x1: 0, y1: 0, x2: 6, y2: 0, x3: 2, y3: 4 },
    exText: (o) => `Example: for A(0, 0), B(6, 0), C(2, 4) the orthocenter is ${o.orthocenter} and the circumcenter is ${o.circumcenter}.`,
    how: "The orthocenter is where the altitudes meet, the circumcenter where the perpendicular bisectors meet (centre of the circle through the vertices), the incenter where the angle bisectors meet and the centroid where the medians meet (the average of the vertices).\n\nThe orthocenter, centroid and circumcenter always lie on the Euler line, with H = 3G − 2O.",
    assume: "Cartesian coordinates.",
    faq: [["How do you find the orthocenter?", "Intersect two altitudes, or use H = A + B + C − 2O."], ["Where is the circumcenter of a right triangle?", "At the midpoint of the hypotenuse."], ["Is the centroid always inside?", "Yes; the orthocenter and circumcenter can be outside an obtuse triangle."]],
  }),
  mk({
    slug: "golden-ratio-calculator", title: "Golden Ratio Calculator (φ = 1.618 Split & Golden Rectangle)",
    meta: "Golden Ratio Calculator — Split a Length by 1.618",
    desc: "Split any length into golden-ratio parts (φ ≈ 1.618), or find the matching longer, shorter or total length, with golden rectangle sizes for design, art and photography.",
    inputs: [dd("mode", "My Length Is", E.GR_MODES, 0), num("length", "Length", 100, 0, 1e12, 0.001)],
    results: [["long", "Longer Part (a)", "t"], ["short", "Shorter Part (b)", "t"], ["whole", "Whole (a + b)", "t"], ["rectangle", "Golden Rectangle", "t"], ["phi", "φ", "t"]],
    fn: C["golden-ratio-calculator"], ex: { mode: 0, length: 100 },
    exText: (o) => `Example: 100 split by the golden ratio is ${o.long} and ${o.short}.`,
    how: "Two lengths are in the golden ratio when (a + b) ÷ a = a ÷ b = φ = (1 + √5) ÷ 2 ≈ 1.6180. To split a whole: longer = whole ÷ φ ≈ 61.8%, shorter = whole ÷ φ² ≈ 38.2%.\n\nA golden rectangle's long side is φ times its short side.",
    assume: "φ to 10 decimal places.",
    faq: [["What is the golden ratio?", "About 1.618 (φ)."], ["How do you split by the golden ratio?", "Multiply by 0.618 for the longer part and 0.382 for the shorter."], ["Is the golden ratio related to Fibonacci?", "Yes — the ratio of consecutive Fibonacci numbers approaches φ."]],
  }),
  mk({
    slug: "fibonacci-calculator", title: "Fibonacci Calculator (Nth Fibonacci Number & Sequence)",
    meta: "Fibonacci Calculator — Nth Term, Sequence & Check",
    desc: "Find the nth Fibonacci number exactly (up to n = 2,000), list the start of the sequence, get the sum of the terms and check whether a number is a Fibonacci number.",
    inputs: [num("n", "n", 20, 0, 2000, 1), num("check", "Is This a Fibonacci Number? (optional)", 144, 0, 1e15, 1)],
    results: [["fn", "F(n)", "t"], ["digits", "Digits", "t"], ["sequence", "Sequence", "t"], ["sum", "Sum", "t"], ["ratio", "Ratio", "t"], ["check", "Check", "t"]],
    fn: C["fibonacci-calculator"], ex: { n: 20, check: 144 },
    exText: (o) => `Example: F(20) = ${o.fn}, and ${o.check}.`,
    how: "The Fibonacci sequence starts 0, 1 and each term is the sum of the two before it: 0, 1, 1, 2, 3, 5, 8, 13, … So F(n) = F(n − 1) + F(n − 2).\n\nA whole number x is a Fibonacci number exactly when 5x² + 4 or 5x² − 4 is a perfect square.",
    assume: "F(0) = 0 and F(1) = 1. Big values are calculated exactly with whole-number arithmetic.",
    faq: [["What is the 10th Fibonacci number?", "F(10) = 55."], ["What is the formula for Fibonacci?", "F(n) = F(n−1) + F(n−2), or Binet's formula (φⁿ − ψⁿ) ÷ √5."], ["Is 0 a Fibonacci number?", "Yes, F(0) = 0."]],
  }),
  mk({
    slug: "day-of-the-year-calculator", title: "Day of the Year Calculator (Day Number, Week & Days Left)",
    meta: "Day of the Year Calculator — What Day Number Is Today?",
    desc: "Find the day number (1–366) of any date, how many days are left in the year, the ISO week number, quarter and percent of the year gone — or turn a year and day number back into a date.",
    inputs: [dd("mode", "Calculate", E.DY_MODES, 0), date("date", "Date", "today"), num("year", "Year (reverse mode)", 2026, 1, 9999, 1), num("day", "Day Number (reverse mode)", 100, 1, 366, 1)],
    results: [["day", "Day of the Year", "t"], ["date", "Date", "t"], ["left", "Days Left", "t"], ["week", "Week Number", "t"], ["quarter", "Quarter", "t"], ["pct", "Year Gone", "t"]],
    fn: C["day-of-the-year-calculator"], ex: { mode: 0, date: NOW, year: 2026, day: 100 },
    exText: (o) => `Example: 15 November 2026 is ${String(o.day).toLowerCase()}, with ${o.left}.`,
    how: "The day number counts from 1 January (day 1) to 31 December (day 365, or 366 in a leap year). It's also called the ordinal date or, loosely, the Julian date.\n\nISO weeks start on Monday, and week 1 is the week with the year's first Thursday.",
    assume: "Gregorian calendar.",
    faq: [["What day of the year is today?", "Leave the date as today to see it."], ["How many days are in a year?", "365, or 366 in a leap year."], ["What is day 100 of 2026?", "10 April 2026."]],
  }),
  mk({
    slug: "leap-year-calculator", title: "Leap Year Calculator (Is It a Leap Year? Leap Years List)",
    meta: "Leap Year Calculator — Is This Year a Leap Year?",
    desc: "Check whether a year is a leap year and why, the next and previous leap years, the weekday of 29 February and a list of all leap years between two years.",
    inputs: [num("year", "Year", 2028, 1, 99999, 1), num("from", "List From", 2000, 1, 99999, 1), num("to", "List To", 2050, 1, 99999, 1)],
    results: [["answer", "Answer", "t"], ["why", "Rule", "t"], ["days", "Days in Year", "t"], ["next", "Next / Previous", "t"], ["feb29", "29 February", "t"], ["range", "Leap Years in Range", "t"]],
    fn: C["leap-year-calculator"], ex: { year: 2028, from: 2000, to: 2050 },
    exText: (o) => `Example: ${o.answer} — ${String(o.why).toLowerCase()}.`,
    how: "A year is a leap year if it's divisible by 4, except century years, which must be divisible by 400. So 2024 and 2000 are leap years, but 1900 and 2100 are not.\n\nLeap years keep the calendar in step with the Earth's orbit of about 365.2425 days.",
    assume: "Gregorian calendar rules (proleptic for years before 1582).",
    faq: [["Is 2026 a leap year?", "No — the next is 2028."], ["Was 1900 a leap year?", "No, it's divisible by 100 but not 400."], ["How often is a leap year?", "Every 4 years, with 3 skipped every 400 years."]],
  }),
];

const STATS: ToolDef[] = [
  mk({
    slug: "pie-chart-calculator", title: "Pie Chart Calculator (Percentages & Degrees for Each Slice)",
    meta: "Pie Chart Calculator — Slice Percentages & Angles",
    desc: "Turn a list of values into pie chart percentages and angles in degrees, with the start and end angle of each slice — for drawing a pie chart by hand or checking one.",
    inputs: [tx("values", "Values (comma separated)", "45, 30, 15, 10"), tx("labels", "Labels (optional, comma separated)", "Rent, Food, Transport, Other")],
    results: [["slices", "Slices", "t"], ["total", "Total", "t"], ["count", "Count", "t"], ["check", "Check", "t"]],
    fn: C["pie-chart-calculator"], ex: { ...T("values", "45, 30, 15, 10"), ...T("labels", "Rent, Food, Transport, Other") },
    exText: (o) => `Example: 45, 30, 15 and 10 give ${String(o.slices).split("; ")[0]}.`,
    how: "Each slice's percentage = value ÷ total × 100, and its angle = value ÷ total × 360°. Draw the slices one after another from 0° using a protractor.",
    assume: "Values must be zero or positive.",
    faq: [["How do I calculate pie chart angles?", "Value ÷ total × 360."], ["What is 25% in degrees?", "90°."], ["Do the angles have to add to 360?", "Yes."]],
  }),
  mk({
    slug: "sensitivity-specificity-calculator", title: "Sensitivity and Specificity Calculator (PPV, NPV & Accuracy)",
    meta: "Sensitivity & Specificity Calculator — PPV, NPV, LR",
    desc: "Calculate a test's sensitivity, specificity, positive and negative predictive value, accuracy, precision (F1), likelihood ratios and Youden index from a 2×2 table of true/false positives and negatives.",
    inputs: [num("tp", "True Positives", 90, 0, 1e9, 1), num("fp", "False Positives", 30, 0, 1e9, 1), num("fn", "False Negatives", 10, 0, 1e9, 1), num("tn", "True Negatives", 870, 0, 1e9, 1), num("prev", "Prevalence for PPV/NPV (%, 0 = use the table)", 0, 0, 100, 0.01)],
    results: [["sensitivity", "Sensitivity (Recall)", "t"], ["specificity", "Specificity", "t"], ["ppv", "PPV (Precision)", "t"], ["npv", "NPV", "t"], ["accuracy", "Accuracy", "t"], ["f1", "F1 Score", "t"], ["lr", "Likelihood Ratios", "t"], ["prevalence", "Prevalence", "t"], ["youden", "Youden Index", "t"]],
    fn: C["sensitivity-specificity-calculator"], ex: { tp: 90, fp: 30, fn: 10, tn: 870, prev: 0 },
    exText: (o) => `Example: 90 true positives, 30 false positives, 10 false negatives and 870 true negatives give a sensitivity of ${o.sensitivity}, specificity of ${o.specificity} and PPV of ${o.ppv}.`,
    how: "Sensitivity = TP ÷ (TP + FN): the share of people with the condition who test positive. Specificity = TN ÷ (TN + FP). PPV = TP ÷ (TP + FP) and NPV = TN ÷ (TN + FN) at the table's prevalence.\n\nEnter a different prevalence to see how PPV and NPV change in another population (Bayes' theorem).",
    assume: "Counts from a single 2×2 table; no confidence intervals.",
    faq: [["What is the difference between sensitivity and specificity?", "Sensitivity catches true positives; specificity rules out true negatives."], ["Why is PPV low for rare diseases?", "When prevalence is low, false positives outnumber true positives."], ["What is precision?", "The same as PPV."]],
  }),
];

async function main() {
  const all = [...MATH, ...STATS];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); for (const t of all) console.log(`  ${t.slug}: ${t.examples}`); return; }
  await upsertTools("math-calculators", MATH);
  await upsertTools("statistics-probability-calculators", STATS);
}
main().catch((e) => { console.error(e); process.exit(1); });
