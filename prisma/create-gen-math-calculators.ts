// One-time (but safe to re-run) batch setup script: 13 basic maths tools from the general keyword
// check (15 Nov 2026 — Claude outputs/General_Keyword_Check.md), all in Science > Math.
// Formulas: src/lib/calc-engine-gen-math.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-gen-math-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-gen-math";
import { mk, num, dd, tx, T, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.genMathCustomCalculators;
const unit = (def = 1) => dd("unit", "Unit", E.LEN_UNITS, def);

const MATH: ToolDef[] = [
  mk({
    slug: "area-calculator", title: "Area Calculator (Rectangle, Square, Circle, Triangle & More)",
    meta: "Area Calculator — Area & Perimeter of Any Shape",
    desc: "Find the area and perimeter of a rectangle, square, triangle, circle, trapezoid, parallelogram, ellipse, rhombus, sector or regular polygon in any unit, with the answer also shown in square feet, square metres and acres.",
    inputs: [dd("shape", "Shape", E.AREA_SHAPES, 0), num("a", "Dimension a (length, base, side or radius)", 12, 0, 1e9, 0.01), num("b", "Dimension b (width or height)", 10, 0, 1e9, 0.01), num("c", "Value c (trapezoid top base, sector angle or polygon sides)", 6, 0, 1e9, 0.01), unit(1)],
    results: [["area", "Area", "t"], ["perimeter", "Perimeter", "t"], ["sqft", "Square Feet", "t"], ["sqm", "Square Metres", "t"], ["acres", "Acres", "t"], ["formula", "Formula", "t"], ["raw", "Area (number)", "n", 6]],
    fn: C["area-calculator"], ex: { shape: 0, a: 12, b: 10, c: 6, unit: 1 },
    exText: (o) => `Example: a 12 ft × 10 ft rectangle has an area of ${o.area} and a perimeter of ${o.perimeter}, which is ${o.sqm} m².`,
    how: "Pick the shape, then enter the measurements it needs; the shape name says which of a, b and c to fill in. All measurements must be in the same unit.\n\nRectangle: length × width. Triangle: ½ × base × height. Circle: π × radius². Trapezoid: average of the two parallel sides × height. Regular polygon: n × side² ÷ (4 × tan(180°/n)).",
    assume: "Flat (2D) shapes. The ellipse perimeter uses Ramanujan's approximation (accurate to a tiny fraction of a percent). For floor and room estimates with waste, use the Square Footage Calculator.",
    faq: [["How do I find the area of a rectangle?", "Multiply length by width. 12 ft × 10 ft = 120 ft²."], ["What is the area of a circle with a 5 cm radius?", "π × 5² ≈ 78.54 cm²."], ["How many square feet are in an acre?", "43,560 ft²."]],
  }),
  mk({
    slug: "volume-calculator", title: "Volume Calculator (Cube, Box, Cylinder, Sphere, Cone & More)",
    meta: "Volume Calculator — Cube, Cylinder, Sphere, Cone & Box",
    desc: "Work out the volume of a cube, rectangular box, cylinder, sphere, cone, pyramid, triangular prism, hemisphere, capsule or ellipsoid, and convert it to litres, US gallons, cubic feet and cubic yards.",
    inputs: [dd("shape", "Shape", E.VOL_SHAPES, 2), num("a", "Dimension a (side or radius)", 3, 0, 1e9, 0.01), num("b", "Dimension b (height, width or length)", 10, 0, 1e9, 0.01), num("c", "Dimension c (box height or prism length)", 4, 0, 1e9, 0.01), unit(0)],
    results: [["volume", "Volume", "t"], ["liters", "Litres", "t"], ["gallons", "US Gallons", "t"], ["cuft", "Cubic Feet", "t"], ["cuyd", "Cubic Yards", "t"], ["formula", "Formula", "t"], ["raw", "Volume (number)", "n", 6]],
    fn: C["volume-calculator"], ex: { shape: 2, a: 3, b: 10, c: 4, unit: 0 },
    exText: (o) => `Example: a cylinder with a 3 in radius and 10 in height holds ${o.volume}, which is ${o.liters} litres or ${o.gallons} US gallons.`,
    how: "Choose the solid and enter its measurements in one unit. Cube: side³. Box: length × width × height. Cylinder: π r² h. Sphere: 4/3 π r³. Cone and pyramid: ⅓ × base area × height.\n\nThe result is in cubic units of what you entered, then converted to litres, gallons, cubic feet and cubic yards so you can size tanks, containers or fill.",
    assume: "Ideal solids. For concrete, gravel or mulch orders, use those calculators — they add bags, tons and waste.",
    faq: [["How do I find the volume of a cylinder?", "π × radius² × height. A 3 in radius, 10 in tall can is about 282.7 in³."], ["How many gallons is a cubic foot?", "About 7.48 US gallons."]],
  }),
  mk({
    slug: "surface-area-calculator", title: "Surface Area Calculator (Cylinder, Cone, Prism, Sphere & Cube)",
    meta: "Surface Area Calculator — Total & Lateral Surface Area",
    desc: "Calculate the total and lateral surface area of a cube, rectangular box, cylinder, sphere, cone, square pyramid, right triangular prism or hemisphere, with the base area, volume and surface-to-volume ratio.",
    inputs: [dd("shape", "Shape", E.SA_SHAPES, 2), num("a", "Dimension a (side, radius or leg)", 4, 0, 1e9, 0.01), num("b", "Dimension b (height, width or leg)", 9, 0, 1e9, 0.01), num("c", "Dimension c (box height or prism length)", 5, 0, 1e9, 0.01), unit(5)],
    results: [["total", "Total Surface Area", "t"], ["lateral", "Lateral (Side) Area", "t"], ["base", "Base Area", "t"], ["volume", "Volume", "t"], ["ratio", "Surface Area ÷ Volume", "t"], ["formula", "Formula", "t"], ["raw", "Total (number)", "n", 6]],
    fn: C["surface-area-calculator"], ex: { shape: 2, a: 4, b: 9, c: 5, unit: 5 },
    exText: (o) => `Example: a cylinder with a 4 cm radius and 9 cm height has a total surface area of ${o.total}. The curved side alone is ${o.lateral}.`,
    how: "Surface area is the total area of every face, like the wrapping paper needed to cover a solid. Lateral area leaves out the top and bottom.\n\nCylinder: 2πr² + 2πrh. Cone: πr² + πr × slant height. Sphere: 4πr². Box: 2(lw + lh + wh).",
    assume: "Closed solids (top and bottom included in the total). For a box, the lateral area treats c as the height.",
    faq: [["What is the surface area of a sphere with radius 3?", "4π × 3² ≈ 113.1 square units."], ["What's the difference between lateral and total surface area?", "Lateral counts only the sides; total adds the base (and top)."]],
  }),
  mk({
    slug: "triangle-calculator", title: "Triangle Calculator (Solve Any Triangle: Sides, Angles & Area)",
    meta: "Triangle Calculator — Missing Sides, Angles & Area",
    desc: "Solve any triangle from three known values (SSS, SAS, ASA, AAS or SSA): find the missing sides and angles, area, perimeter, heights and type, including the ambiguous two-triangle case.",
    inputs: [dd("mode", "What You Know", E.TRI_MODES, 0), num("a", "Side a", 7, 0, 1e9, 0.0001), num("b", "Side b", 9, 0, 1e9, 0.0001), num("c", "Side c", 12, 0, 1e9, 0.0001), num("A", "Angle A (°, opposite a)", 35, 0, 180, 0.0001), num("B", "Angle B (°, opposite b)", 65, 0, 180, 0.0001), num("C", "Angle C (°, opposite c)", 50, 0, 180, 0.0001)],
    results: [["sides", "Sides", "t"], ["angles", "Angles", "t"], ["area", "Area", "n", 4], ["perimeter", "Perimeter", "n", 4], ["kind", "Triangle Type", "t"], ["heights", "Heights", "t"], ["circles", "Circumradius & Inradius", "t"], ["alt", "Other Solution", "t"]],
    fn: C["triangle-calculator"], ex: { mode: 0, a: 7, b: 9, c: 12, A: 35, B: 65, C: 50 },
    exText: (o) => `Example: a triangle with sides 7, 9 and 12 has angles ${o.angles}. Its area is ${o.area} and it is ${String(o.kind).toLowerCase()}.`,
    how: "Choose what you know, then fill in only those values. Side a is opposite angle A, b opposite B and c opposite C.\n\nThe law of cosines (c² = a² + b² − 2ab cos C) handles SSS and SAS. The law of sines (a/sin A = b/sin B = c/sin C) handles ASA, AAS and SSA. With SSA there can be two different triangles, and both are shown.",
    assume: "Angles in degrees. The angles of any triangle add up to 180°. For right triangles only, the Right Triangle Calculator is quicker.",
    faq: [["How do I find a missing side of a triangle?", "With two sides and the angle between them, use the law of cosines. With two angles and a side, use the law of sines."], ["Can three sides always make a triangle?", "Only if each pair adds up to more than the third side (the triangle inequality)."]],
  }),
  mk({
    slug: "long-division-calculator", title: "Long Division Calculator (With Steps & Remainders)",
    meta: "Long Division Calculator — Steps, Quotient & Remainder",
    desc: "Divide any two numbers with long division and see every step, the quotient and remainder, the answer as a mixed number and the decimal result — including repeating decimals and decimal divisors.",
    inputs: [tx("dividend", "Dividend (number being divided)", "7452"), tx("divisor", "Divisor (number you divide by)", "12"), num("dp", "Decimal Places to Show", 6, 0, 30, 1)],
    results: [["quotient", "Quotient (Whole Number)", "t"], ["remainder", "Remainder", "t"], ["decimal", "Decimal Answer", "t"], ["mixed", "Mixed Number", "t"], ["repeat", "Decimal Type", "t"], ["steps", "Long Division Steps", "t"]],
    fn: C["long-division-calculator"], ex: { ...T("dividend", "7452"), ...T("divisor", "12"), dp: 6 },
    exText: (o) => `Example: 7452 ÷ 12 = ${o.quotient} remainder ${o.remainder} (${o.decimal}).`,
    how: "Long division works one digit at a time: bring down the next digit, see how many times the divisor fits, write that digit in the answer, subtract and carry the remainder.\n\nIf the divisor has decimals, both numbers are multiplied by 10, 100… until the divisor is a whole number. The answer doesn't change. Keep dividing past the decimal point for a decimal answer.",
    assume: "Exact integer arithmetic for any size of number. Repeating decimals are detected up to the number of places shown.",
    faq: [["What is 100 ÷ 7 with a remainder?", "14 remainder 2 (14.285714… repeating)."], ["How do you divide by a decimal?", "Move the decimal point in both numbers until the divisor is whole: 4.5 ÷ 0.15 = 450 ÷ 15 = 30."]],
  }),
  mk({
    slug: "rounding-calculator", title: "Rounding Calculator (Nearest Ten, Hundred, Tenth & Whole Number)",
    meta: "Rounding Calculator — Round to Any Place or Decimal",
    desc: "Round any number to the nearest whole number, tenth, hundredth, thousandth, ten, hundred, thousand, ten thousand or million, to N decimal places or N significant figures, using half-up, banker's, ceiling, floor or truncation.",
    inputs: [tx("x", "Number to Round", "3,847.2659"), dd("to", "Round To", E.ROUND_TO, 2), num("n", "N (for decimal places / significant figures)", 2, 0, 15, 1), dd("method", "Rounding Method", E.ROUND_METHOD, 0)],
    results: [["result", "Rounded Number", "t"], ["rule", "Rule Used", "t"], ["neighbours", "Lies Between", "t"], ["error", "Rounding Difference", "t"], ["sci", "Scientific Notation", "t"], ["raw", "Rounded (number)", "n", 10]],
    fn: C["rounding-calculator"], ex: { ...T("x", "3,847.2659"), to: 2, n: 2, method: 0 },
    exText: (o) => `Example: 3,847.2659 rounded to the nearest hundredth is ${o.result}; to the nearest hundred it is 3,800.`,
    how: "Look at the digit just after the place you're rounding to. If it is 5 or more, round up; if it is 4 or less, round down. 3,847.2659 to the nearest tenth: the next digit is 6, so 3,847.3.\n\nBanker's rounding sends exact halves to the even neighbour (2.5 → 2, 3.5 → 4) to avoid bias. Ceiling always goes up and floor always goes down.",
    assume: "Half up rounds exact halves away from zero (−2.5 → −3). For counting significant figures in measurements, the Significant Figures Calculator gives more detail.",
    faq: [["What is 2,456 rounded to the nearest hundred?", "2,500."], ["What is 0.5 rounded to the nearest whole number?", "1 with standard rounding, 0 with banker's rounding."]],
  }),
  mk({
    slug: "square-root-calculator", title: "Square Root Calculator (With Simplified Radical Form)",
    meta: "Square Root Calculator — √x & Simplest Radical Form",
    desc: "Find the square root of any number, its simplified radical form (like √72 = 6√2), whether it is a perfect square, the nearest perfect squares and the imaginary root of a negative number.",
    inputs: [num("x", "Number", 72, -1e15, 1e15, 0.0001)],
    results: [["root", "Square Root", "t"], ["radical", "Simplest Radical Form", "t"], ["perfect", "Perfect Square?", "t"], ["between", "Nearest Perfect Squares", "t"], ["both", "Both Roots (±)", "t"], ["check", "Check", "t"], ["raw", "Square Root (number)", "n", 10]],
    fn: C["square-root-calculator"], ex: { x: 72 },
    exText: (o) => `Example: √72 = ${o.root}, which simplifies to ${o.radical}.`,
    how: "The square root of x is the number that, multiplied by itself, gives x: √49 = 7 because 7 × 7 = 49.\n\nTo simplify a radical, pull out the largest perfect-square factor: 72 = 36 × 2, so √72 = √36 × √2 = 6√2. Every positive number has two square roots (±); the √ sign means the positive one.",
    assume: "Real numbers; a negative input returns an imaginary root (i = √−1). Simplest form is shown for whole numbers up to one trillion.",
    faq: [["What is the square root of 2?", "About 1.41421356."], ["Is 0 a perfect square?", "Yes — 0 × 0 = 0."]],
  }),
  mk({
    slug: "nth-root-calculator", title: "Cube Root & Nth Root Calculator",
    meta: "Cube Root Calculator — ∛x and Any Nth Root",
    desc: "Calculate the cube root, fourth root or any nth root of a number, including real cube roots of negative numbers, with the simplified radical form and a check.",
    inputs: [num("x", "Number", 54, -1e15, 1e15, 0.0001), num("n", "Root (n): 3 = cube root", 3, -100, 100, 0.01)],
    results: [["root", "Root", "t"], ["radical", "Simplest Radical Form", "t"], ["perfect", "Perfect Power?", "t"], ["power", "As a Power", "t"], ["check", "Check", "t"], ["raw", "Root (number)", "n", 10]],
    fn: C["nth-root-calculator"], ex: { x: 54, n: 3 },
    exText: (o) => `Example: the cube root of 54 is ${o.root}, or ${o.radical} in simplest form.`,
    how: "The nth root of x is the number that gives x when multiplied by itself n times: ∛27 = 3 because 3 × 3 × 3 = 27. It is the same as raising x to the power 1/n.\n\nOdd roots of negative numbers are real (∛−8 = −2). Even roots of negative numbers aren't real numbers.",
    assume: "Real roots only. Simplest form is shown for whole-number inputs with a whole-number root index of 2 or more.",
    faq: [["What is the cube root of 64?", "4."], ["How do I find a cube root on a calculator?", "Raise the number to the power 1/3, or enter it here."]],
  }),
  mk({
    slug: "ratio-calculator", title: "Ratio Calculator (Simplify, Equivalent Ratios & Proportions)",
    meta: "Ratio Calculator — Simplify Ratios & Solve Proportions",
    desc: "Simplify a ratio like 12:18 or 4:6:10, solve a proportion A:B = C:x, split a total in a given ratio or scale a ratio up or down, with the unit ratio and each part as a percentage.",
    inputs: [dd("mode", "Calculate", E.RATIO_MODES, 0), tx("ratio", "Ratio (e.g. 12:18 or 2:3:5)", "12:18"), num("c", "C, total to split, or scale factor", 30, -1e12, 1e12, 0.0001)],
    results: [["result", "Answer", "t"], ["simplest", "Simplest Form", "t"], ["unit", "Unit Ratio", "t"], ["percent", "Each Part as a Percentage", "t"], ["fraction", "As a Fraction", "t"], ["detail", "Working", "t"]],
    fn: C["ratio-calculator"], ex: { mode: 0, ...T("ratio", "12:18"), c: 30 },
    exText: (o) => `Example: 12:18 simplifies to ${o.simplest} (${o.percent}). Splitting $30 in the ratio 2:3 gives $12 and $18.`,
    how: "To simplify a ratio, divide every part by the greatest common divisor: 12:18 ÷ 6 = 2:3. To solve A:B = C:x, cross-multiply: x = B × C ÷ A.\n\nTo split a total, add the parts (2 + 3 = 5), divide the total by that (30 ÷ 5 = 6 per part), then multiply each part.",
    assume: "Ratios of non-negative numbers. Decimal ratios are scaled to whole numbers before simplifying.",
    faq: [["What is 15:25 in simplest form?", "3:5."], ["How do I share $100 in the ratio 3:2?", "$60 and $40."]],
  }),
  mk({
    slug: "arithmetic-sequence-calculator", title: "Arithmetic Sequence Calculator (Nth Term & Sum)",
    meta: "Arithmetic Sequence Calculator — Nth Term, Sum & Formula",
    desc: "Find the nth term, the sum of the first n terms and the explicit and recursive formulas of an arithmetic sequence, from the first term and common difference or from any two known terms.",
    inputs: [dd("mode", "You Know", E.SEQ_MODES, 0), num("a1", "First Term a₁", 3, -1e12, 1e12, 0.0001), num("d", "Common Difference d", 4, -1e12, 1e12, 0.0001), num("n", "Term Number n", 20, 1, 1e9, 1), num("p", "Known Term Position p", 3, 1, 1e9, 1), num("ap", "Value of Term p", 11, -1e12, 1e12, 0.0001), num("q", "Known Term Position q", 8, 1, 1e9, 1), num("aq", "Value of Term q", 31, -1e12, 1e12, 0.0001)],
    results: [["an", "nth Term aₙ", "n", 6], ["sum", "Sum of First n Terms Sₙ", "n", 6], ["formula", "Explicit Formula", "t"], ["recursive", "Recursive Formula", "t"], ["terms", "First Terms", "t"], ["a1d", "First Term & Difference", "t"]],
    fn: C["arithmetic-sequence-calculator"], ex: { mode: 0, a1: 3, d: 4, n: 20, p: 3, ap: 11, q: 8, aq: 31 },
    exText: (o) => `Example: 3, 7, 11, 15, … has a 20th term of ${o.an}, and the first 20 terms add up to ${o.sum}.`,
    how: "An arithmetic sequence adds the same number d each time. The nth term is aₙ = a₁ + (n − 1)d. The sum of the first n terms is Sₙ = n(a₁ + aₙ)/2.\n\nIf you know two terms, the difference is d = (a_q − a_p) ÷ (q − p), and then a₁ = a_p − (p − 1)d.",
    assume: "For sequences that multiply by a constant ratio, use the Geometric Sequence Calculator.",
    faq: [["What is the 10th term of 5, 8, 11, …?", "a₁₀ = 5 + 9 × 3 = 32."], ["What is the sum of 1 to 100?", "100 × (1 + 100) ÷ 2 = 5,050."]],
  }),
  mk({
    slug: "distance-formula-calculator", title: "Distance Formula Calculator (Distance Between Two Points)",
    meta: "Distance Formula Calculator — Distance Between Two Points",
    desc: "Find the distance between two points in 2D or 3D with the distance formula, including the exact radical answer, the working, the midpoint and the slope of the line between them.",
    inputs: [dd("dim", "Dimensions", E.DIM, 0), num("x1", "x₁", 1, -1e12, 1e12, 0.0001), num("y1", "y₁", 2, -1e12, 1e12, 0.0001), num("z1", "z₁ (3D only)", 0, -1e12, 1e12, 0.0001), num("x2", "x₂", 7, -1e12, 1e12, 0.0001), num("y2", "y₂", 10, -1e12, 1e12, 0.0001), num("z2", "z₂ (3D only)", 0, -1e12, 1e12, 0.0001)],
    results: [["distance", "Distance", "n", 6], ["exact", "Exact Form", "t"], ["working", "Working", "t"], ["midpoint", "Midpoint", "t"], ["slope", "Slope", "t"], ["deltas", "Change in Each Coordinate", "t"]],
    fn: C["distance-formula-calculator"], ex: { dim: 0, x1: 1, y1: 2, z1: 0, x2: 7, y2: 10, z2: 0 },
    exText: (o) => `Example: from (1, 2) to (7, 10) the distance is ${o.distance}: ${o.working}. The midpoint is ${o.midpoint}.`,
    how: "The distance formula is the Pythagorean theorem on a grid: d = √((x₂ − x₁)² + (y₂ − y₁)²). In 3D, add (z₂ − z₁)² under the root.\n\nThe midpoint averages the coordinates, and the slope is the rise over the run (Δy ÷ Δx).",
    assume: "Straight-line (Euclidean) distance on a flat grid. For driving or map distance between places, use the Distance Calculator.",
    faq: [["What is the distance between (0, 0) and (3, 4)?", "5."], ["Is the distance formula the same as Pythagoras?", "Yes — the two coordinate differences are the legs of a right triangle."]],
  }),
  mk({
    slug: "roman-numeral-calculator", title: "Roman Numeral Converter (Numbers ↔ Roman Numerals)",
    meta: "Roman Numeral Converter — Numbers to Roman Numerals",
    desc: "Convert numbers to Roman numerals and Roman numerals back to numbers, from 1 to 3,999,999, with a place-value breakdown and a check that the numerals are written in standard form.",
    inputs: [dd("mode", "Convert", E.ROMAN_MODES, 0), tx("x", "Number or Roman Numerals", "2026")],
    results: [["result", "Result", "t"], ["roman", "Roman Numerals", "t"], ["number", "Number", "n", 0], ["breakdown", "Breakdown", "t"], ["year", "As a Year", "t"]],
    fn: C["roman-numeral-calculator"], ex: { mode: 0, ...T("x", "2026") },
    exText: (o) => `Example: 2026 in Roman numerals is ${o.roman} (${o.breakdown}).`,
    how: "Roman numerals use I = 1, V = 5, X = 10, L = 50, C = 100, D = 500 and M = 1,000. Write the value place by place, from thousands down to ones.\n\nA smaller numeral before a larger one subtracts: IV = 4, IX = 9, XL = 40, XC = 90, CD = 400, CM = 900. No numeral repeats more than three times in a row.",
    assume: "Standard (subtractive) notation. Numbers from 4,000 up use a bar over a numeral to multiply it by 1,000.",
    faq: [["What is 1999 in Roman numerals?", "MCMXCIX."], ["What does MMXXV mean?", "2025."]],
  }),
  mk({
    slug: "military-time-calculator", title: "Military Time Calculator (24-Hour Time Converter)",
    meta: "Military Time Converter — 12-Hour ↔ 24-Hour Time",
    desc: "Convert regular 12-hour time to military (24-hour) time and back, hear how it is spoken (\"nineteen thirty hours\"), and count the hours and minutes between two military times, even across midnight.",
    inputs: [dd("mode", "Calculate", E.MIL_MODES, 0), tx("t1", "Time (e.g. 7:30 PM or 1930)", "7:30 PM"), tx("t2", "End Time (for hours between)", "0215")],
    results: [["result", "Result", "t"], ["military", "Military Time", "t"], ["colon", "24-Hour Clock", "t"], ["twelve", "12-Hour Time", "t"], ["spoken", "Spoken As", "t"], ["duration", "Duration", "t"]],
    fn: C["military-time-calculator"], ex: { mode: 0, ...T("t1", "7:30 PM"), ...T("t2", "0215") },
    exText: (o) => `Example: 7:30 PM in military time is ${o.military}, spoken "${o.spoken}".`,
    how: "Military time counts hours from 00 to 23 with no AM or PM. Morning times stay the same (9:15 AM = 0915). For afternoon times, add 12 to the hour (7:30 PM = 1930). Midnight is 0000 and noon is 1200.\n\nTo go back, subtract 12 from hours above 12. For hours between two times, the calculator counts forward and handles overnight shifts.",
    assume: "No time zones (for zones, add \"Zulu\" or use a time zone converter). 2400 is read as midnight at the end of the day.",
    faq: [["What is 3 PM in military time?", "1500."], ["What time is 2200?", "10:00 PM."]],
  }),
];

async function main() {
  if (new Set(MATH.map((t) => t.slug)).size !== MATH.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${MATH.length} tool definitions`); return; }
  await upsertTools("math-calculators", MATH);
}
main().catch((e) => { console.error(e); process.exit(1); });
