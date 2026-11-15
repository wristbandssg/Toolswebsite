// One-time (but safe to re-run) batch setup script: 9 everyday calculators from the tech keyword check
// (15 Nov 2026 — Claude outputs/Tech_Keyword_Check.md): Science > Scientific & Graphing (3) and
// Science > Math (6). Formulas: src/lib/calc-engine-tech-gen.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-tech-gen-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-tech-gen";
import { mk, num, dd, tx, date, T, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.techGenCustomCalculators;

const CALC: ToolDef[] = [
  mk({
    slug: "basic-calculator", title: "Basic Calculator (Simple Online Calculator & Adding Machine)",
    meta: "Basic Calculator — Simple Online Calculator with Tape",
    desc: "A simple online calculator for everyday sums: add, subtract, multiply, divide, brackets and percentages. Or switch to adding-machine mode to total a list of numbers with a running tape, count and average.",
    inputs: [dd("mode", "Mode", E.BASIC_MODES, 0), tx("expr", "Calculation or List of Numbers", "12.5 + 7 × 3 − 4 ÷ 2")],
    results: [["result", "Answer", "t"], ["tape", "Tape", "t"], ["count", "Numbers Added", "n", 0], ["avg", "Average", "t"], ["sci", "Scientific Notation", "t"], ["expr", "You Entered", "t"]],
    fn: C["basic-calculator"], ex: { mode: 0, ...T("expr", "12.5 + 7 × 3 − 4 ÷ 2") },
    exText: (o) => `Example: 12.5 + 7 × 3 − 4 ÷ 2 = ${o.result}. Multiplication and division are done before addition and subtraction.`,
    how: "Type a calculation using + − × ÷ (or * and /), brackets and %. 25% means 0.25, so 80 × 25% = 20. Normal order of operations applies.\n\nIn adding-machine mode, list numbers separated by spaces, commas or semicolons; negative numbers subtract. The tape shows the running total after each entry, like a 10-key printing calculator.",
    assume: "Standard order of operations. For functions (sin, log, powers), use the Scientific Calculator; for exact very large integers, use the Big Number Calculator.",
    faq: [["Does this follow BODMAS/PEMDAS?", "Yes: brackets first, then × and ÷, then + and −."], ["How do I add up a column of numbers?", "Choose adding-machine mode and paste the numbers. You get the total, count and average."]],
  }),
  mk({
    slug: "big-number-calculator", title: "Big Number Calculator (Exact Large Integer Arithmetic)",
    meta: "Big Number Calculator — Exact Arithmetic on Huge Numbers",
    desc: "Add, subtract, multiply, divide, raise to a power, take the modulo or find the GCD and LCM of whole numbers of any size, with every digit exact. Shows the digit count, digit sum and scientific notation.",
    inputs: [tx("a", "First Number (A)", "123456789012345678901234567890"), dd("op", "Operation", E.BIG_OPS, 2), tx("b", "Second Number (B)", "987654321987654321")],
    results: [["result", "Exact Result", "t"], ["digits", "Number of Digits", "n", 0], ["sci", "Scientific Notation", "t"], ["extra", "Remainder / LCM", "t"], ["sum", "Digit Sum", "n", 0]],
    fn: C["big-number-calculator"], ex: { ...T("a", "123456789012345678901234567890"), op: 2, ...T("b", "987654321987654321") },
    exText: (o) => `Example: 123,456,789,012,345,678,901,234,567,890 × 987,654,321,987,654,321 has ${o.digits} digits: ${o.sci}.`,
    how: "Ordinary calculators round after about 15 digits. This one keeps every digit, using arbitrary-precision integers. Type whole numbers (commas are ignored).\n\nDivision gives the whole-number quotient and the remainder. Powers are limited to results of about 20,000 digits.",
    assume: "Whole numbers only. Very long results are shortened in the middle for display; the digit count is always exact.",
    faq: [["What is 2 to the power 100?", "1,267,650,600,228,229,401,496,703,205,376 (31 digits)."], ["Why does my phone calculator give 1.2e+38?", "It stores about 15–17 significant digits. This calculator keeps them all."]],
  }),
  mk({
    slug: "3d-graphing-calculator", title: "3D Graphing Calculator (z = f(x, y) Surfaces)",
    meta: "3D Graphing Calculator — Evaluate & Explore z = f(x, y)",
    desc: "Explore a 3D surface z = f(x, y): its value and gradient at a point, the highest and lowest points over a square window, and a table of z values across the grid. Supports powers, trig, exp, log and sqrt.",
    inputs: [tx("fxy", "z = f(x, y)", "sin(x) * cos(y)"), num("min", "Window Minimum (x and y)", -3, -1e6, 1e6, 0.1), num("max", "Window Maximum (x and y)", 3, -1e6, 1e6, 0.1), num("x0", "Point x", 1, -1e9, 1e9, 0.01), num("y0", "Point y", 0.5, -1e9, 1e9, 0.01)],
    results: [["z", "z at the Point", "t"], ["grad", "Gradient at the Point", "t"], ["max", "Highest Point in Window", "t"], ["min", "Lowest Point in Window", "t"], ["shape", "Direction", "t"], ["table", "z-Value Table", "t"]],
    fn: C["3d-graphing-calculator"], ex: { ...T("fxy", "sin(x) * cos(y)"), min: -3, max: 3, x0: 1, y0: 0.5 },
    exText: (o) => `Example: z = sin(x)·cos(y) at (1, 0.5) is ${o.z}. Its highest point in the window −3 to 3 is ${o.max}.`,
    how: "Type the surface using x and y, for example x^2 + y^2 (a bowl), x^2 − y^2 (a saddle) or sin(x)*cos(y) (an egg-crate).\n\nThe gradient (∂z/∂x, ∂z/∂y) points uphill. Where both are 0, you are at a peak, a valley or a saddle point. The table samples z on a 7 × 7 grid; rows are y and columns are x.",
    assume: "Radians for trig. Extremes come from a 61 × 61 grid, so narrow peaks can fall between grid points. Zoom the window for detail.",
    faq: [["How do I graph a 3D function?", "Enter z = f(x, y) and a window. The calculator samples the surface and reports its shape, values and extremes."], ["What's the 2D version?", "Use the Graphing Calculator for y = f(x)."]],
  }),
];

const MATH: ToolDef[] = [
  mk({
    slug: "percentage-calculator", title: "Percentage Calculator (Percent of, Percent Change & More)",
    meta: "Percentage Calculator — What Is X% of Y, Percent Change",
    desc: "Answer any everyday percentage question: what is X% of Y, X is what percent of Y, X is Y% of what number, percent increase or decrease from A to B, and adding or taking off a percentage.",
    inputs: [dd("mode", "Question", E.PCT_MODES, 0), num("a", "A", 15, -1e12, 1e12, 0.0001), num("b", "B", 200, -1e12, 1e12, 0.0001)],
    results: [["result", "Answer", "t"], ["text", "In Words", "t"], ["formula", "Formula", "t"], ["raw", "Unrounded", "n", 10]],
    fn: C["percentage-calculator"], ex: { mode: 0, a: 15, b: 200 },
    exText: (o) => `Example: ${o.text}. And 30 is 15% of 200, so 30 ÷ 200 × 100 = 15%.`,
    how: "Percent means per hundred: 15% = 15/100 = 0.15. X% of Y = X ÷ 100 × Y. To find what percent X is of Y, divide X by Y and multiply by 100.\n\nPercent change = (new − old) ÷ old × 100. A rise of 50% followed by a fall of 50% leaves you at 75% of the start, not back where you began.",
    assume: "Percent change uses the starting value as the base. For the difference between two values with no clear start, use the Percent Difference Calculator.",
    faq: [["How do I work out 20% of 80?", "20 ÷ 100 × 80 = 16."], ["How do I add 15% to a price?", "Multiply by 1.15. $40 × 1.15 = $46."], ["What percent is 45 out of 60?", "45 ÷ 60 × 100 = 75%."]],
  }),
  mk({
    slug: "fraction-calculator", title: "Fraction Calculator (Add, Subtract, Multiply, Divide & Simplify)",
    meta: "Fraction Calculator — Add, Subtract, Multiply & Divide Fractions",
    desc: "Add, subtract, multiply or divide fractions and mixed numbers, or simplify a fraction. Gives the answer in lowest terms, as a mixed number, decimal and percentage, with the working.",
    inputs: [tx("a", "First Fraction (e.g. 3/4 or 1 2/3)", "1 2/3"), dd("op", "Operation", E.FRAC_OPS, 0), tx("b", "Second Fraction", "3/4")],
    results: [["result", "Answer (Simplest Form)", "t"], ["mixed", "Mixed Number", "t"], ["decimal", "Decimal", "t"], ["pct", "Percentage", "t"], ["steps", "Working", "t"]],
    fn: C["fraction-calculator"], ex: { ...T("a", "1 2/3"), op: 0, ...T("b", "3/4") },
    exText: (o) => `Example: 1 2/3 + 3/4 = ${o.result} = ${o.mixed} (${o.decimal}).`,
    how: "To add or subtract, rewrite both fractions over a common denominator, then add the tops. To multiply, multiply tops and bottoms. To divide, flip the second fraction and multiply.\n\nType mixed numbers with a space (1 2/3), and negative fractions with a minus sign. Decimals like 0.75 are converted to fractions.",
    assume: "Results are reduced to lowest terms with the greatest common divisor.",
    faq: [["What is 1/2 + 1/3?", "5/6."], ["How do I simplify 18/24?", "Divide top and bottom by 6 to get 3/4."]],
  }),
  mk({
    slug: "time-calculator", title: "Time Calculator (Add Hours & Minutes, Time Between, End Time)",
    meta: "Time Calculator — Add & Subtract Hours and Minutes",
    desc: "Add and subtract hours, minutes and seconds, find the time between two clock times (including overnight), or work out an end time from a start time and a duration, such as when a movie ends. Shows decimal hours too.",
    inputs: [dd("mode", "Calculate", E.TIME_MODES, 0), tx("list", "Durations to Add (e.g. 2:30 + 1:45 − 0:20)", "2:30 + 1:45 - 0:20"), tx("start", "Start Time (e.g. 7:30 PM)", "7:30 PM"), tx("end", "End Time or Duration (e.g. 6:45 or 2h 28m)", "2h 28m")],
    results: [["total", "Total (h:mm)", "t"], ["clock", "Clock Time", "t"], ["decimal", "Decimal Hours", "n", 4], ["minutes", "Minutes", "n", 2], ["seconds", "Seconds", "n", 0], ["days", "Days + Time", "t"]],
    fn: C["time-calculator"], ex: { mode: 0, ...T("list", "2:30 + 1:45 - 0:20"), ...T("start", "7:30 PM"), ...T("end", "2h 28m") },
    exText: (o) => `Example: 2:30 + 1:45 − 0:20 = ${o.total} (${o.decimal} hours). A 2 h 28 min movie starting at 7:30 PM ends at 9:58 PM.`,
    how: "Write durations as h:mm (2:30), h:mm:ss, 1h 45m or decimal hours (1.5). Use − to subtract. Minutes carry over at 60, so 0:45 + 0:30 = 1:15, not 0:75.\n\nTime between two clock times counts forward, so 10:15 PM to 6:45 AM is 8:30 overnight. For a weekly timesheet with lunch breaks, use the Time Card Calculator.",
    assume: "Clock times can be 24-hour (19:30) or 12-hour (7:30 PM). Clock time results are shown in 24-hour format. No time zones or daylight-saving changes.",
    faq: [["How do I convert 2 hours 15 minutes to decimal?", "15 ÷ 60 = 0.25, so 2.25 hours."], ["How many hours from 9 AM to 5:30 PM?", "8 hours 30 minutes (8.5 hours)."]],
  }),
  mk({
    slug: "date-calculator", title: "Date Calculator (Days Between Dates & Add Days to a Date)",
    meta: "Date Calculator — Days Between Dates, Add or Subtract Days",
    desc: "Count the days, weeks, months and business days between two dates, or add or subtract days, weeks, months or years from a date to find the new date and its weekday.",
    inputs: [dd("mode", "Calculate", E.DATE_MODES, 0), date("d1", "Start Date", "today"), date("d2", "End Date", "today+30"), dd("incl", "Count the End Date?", ["No", "Yes (inclusive)"], 0), num("n", "Amount to Add / Subtract", 30, 0, 100000, 1), dd("unit", "Unit", E.DATE_UNITS, 0)],
    results: [["result", "Result", "t"], ["days", "Days", "n", 0], ["weeks", "Weeks", "t"], ["ymd", "Years, Months, Days", "t"], ["weekday", "Weekday", "t"], ["business", "Business Days", "t"]],
    fn: C["date-calculator"], ex: { mode: 0, d1: 20454, d2: 20819, incl: 0, n: 30, unit: 0 },
    exText: (o) => `Example: from 1 January 2026 to 1 January 2027 is ${o.result} (${o.weeks}).`,
    how: "Days between dates counts calendar days from the start to the end date; choose inclusive to count both ends, as for a hotel stay or a contract period. Business days skip Saturdays and Sundays.\n\nAdding months keeps the same day number, or uses the month's last day if it's shorter: 31 January + 1 month = 28 or 29 February.",
    assume: "Gregorian calendar. Public holidays aren't removed from business days.",
    faq: [["How many days until Christmas?", "Pick today and 25 December — the calculator counts the days."], ["What date is 90 days from today?", "Choose Add to a date, enter 90 days, and the new date and weekday are shown."]],
  }),
  mk({
    slug: "age-calculator", title: "Age Calculator (Exact Age in Years, Months & Days)",
    meta: "Age Calculator — Exact Age in Years, Months, Days",
    desc: "Calculate your exact age from your date of birth in years, months and days, plus total months, weeks, days and hours, the day of the week you were born and how long until your next birthday.",
    inputs: [date("birth", "Date of Birth", 7305), date("asof", "Age as of", "today")],
    results: [["age", "Age", "t"], ["years", "Years", "n", 0], ["months", "Total Months", "n", 0], ["weeks", "Total Weeks", "t"], ["days", "Total Days", "t"], ["hours", "Total Hours", "t"], ["next", "Next Birthday", "t"], ["born", "Day You Were Born", "t"]],
    fn: C["age-calculator"], ex: { birth: 7305, asof: 20454 },
    exText: (o) => `Example: someone born on 1 January 1990 is ${o.age} old on 1 January 2026, which is ${o.days} days. They were born on a ${o.born}.`,
    how: "Age counts whole years, then whole months, then the remaining days since your birth date. Leave \"as of\" on today, or pick any date to find an age then, for example on a school cut-off date.\n\nIf you were born on 29 February, your birthday falls on 28 February in non-leap years.",
    assume: "Gregorian calendar, whole days (no time of birth). Total hours = days × 24.",
    faq: [["How old am I in days?", "Enter your birth date. The total days is shown, along with weeks and hours."], ["How is age calculated?", "Completed years since birth, then completed months, then days."]],
  }),
  mk({
    slug: "factorial-calculator", title: "Factorial Calculator (n!, Exact Digits & Trailing Zeros)",
    meta: "Factorial Calculator — n! Exact Value, Digits & Zeros",
    desc: "Calculate n! exactly for any whole number up to 10,000, with the number of digits, trailing zeros, scientific notation and the double factorial n!!. Non-integers use the gamma function.",
    inputs: [num("n", "n", 25, 0, 10000, 0.01)],
    results: [["result", "n!", "t"], ["digits", "Number of Digits", "t"], ["zeros", "Trailing Zeros", "t"], ["sci", "Scientific Notation", "t"], ["dbl", "Double Factorial n!!", "t"], ["note", "Definition", "t"]],
    fn: C["factorial-calculator"], ex: { n: 25 },
    exText: (o) => `Example: 25! = ${o.result}, which has ${o.digits} digits and ${o.zeros} trailing zeros.`,
    how: "n! = n × (n − 1) × … × 2 × 1, and 0! = 1. Factorials count arrangements: 10 people can line up in 10! = 3,628,800 ways.\n\nTrailing zeros come from factors of 10 = 2 × 5, so count the 5s: ⌊n/5⌋ + ⌊n/25⌋ + ⌊n/125⌋ + …",
    assume: "Exact integer arithmetic. Very long results are shortened in the middle for display. For non-integers, n! = Γ(n + 1).",
    faq: [["What is 0 factorial?", "1, by definition (there is one way to arrange nothing)."], ["How many zeros does 100! end with?", "24."]],
  }),
];

async function main() {
  const all = [...CALC, ...MATH];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); return; }
  await upsertTools("scientific-graphing-calculators", CALC);
  await upsertTools("math-calculators", MATH);
}
main().catch((e) => { console.error(e); process.exit(1); });
