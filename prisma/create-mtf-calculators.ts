// One-time (but safe to re-run) batch setup script: 5 tools from the math / time-card / finance
// keyword check (16 Nov 2026 — Claude outputs/Math_Time_Finance_Keyword_Check.md).
// Science > Math: long multiplication, long addition & subtraction, order of operations,
// repeating decimal to fraction. Finance > Retirement: passive income (live off interest).
// Formulas: src/lib/calc-engine-mtf.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-mtf-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-mtf";
import { mk, dd, tx, money, pct, T, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.mtfCustomCalculators;

const MATH: ToolDef[] = [
  mk({
    slug: "long-multiplication-calculator", title: "Long Multiplication Calculator (With Steps, Carries & Partial Products)",
    meta: "Long Multiplication Calculator — Step-by-Step Working",
    desc: "Multiply two numbers by long multiplication and see every step: each row's partial product with its carries, the shifted rows, the final addition and where the decimal point goes. Works with decimals, negatives and very large numbers.",
    inputs: [tx("a", "Top Number (multiplicand)", "3847"), tx("b", "Bottom Number (multiplier)", "256")],
    results: [["product", "Answer", "t"], ["rows", "Partial Products (one row per digit)", "t"], ["sum", "Add the Rows", "t"], ["decimals", "Decimal Point", "t"], ["check", "Check", "t"], ["digits", "Size", "t"]],
    fn: C["long-multiplication-calculator"], ex: { ...T("a", "3847"), ...T("b", "256") },
    exText: (o) => `Example: 3,847 × 256 = ${o.product}. ${o.sum}.`,
    how: "Write the bigger number on top. Multiply it by the bottom number's ones digit, carrying into the next column whenever a product is 10 or more. Move to the tens digit, put one zero at the end of the row (the placeholder), and repeat for every digit. Then add all the rows.\n\nWith decimals, ignore the points, multiply as whole numbers, then count the decimal places in both numbers and put that many in the answer: 2.5 × 1.25 → 25 × 125 = 3125 → 3.125.",
    assume: "Exact whole-number arithmetic, so there's no rounding even with very long numbers (up to 200 digits each).",
    faq: [["What is 345 × 27 by long multiplication?", "345 × 7 = 2,415; 345 × 2 tens = 6,900; 2,415 + 6,900 = 9,315."], ["Why do you add a zero on the second row?", "The second digit is tens, so you're really multiplying by 20, not 2 — the zero shifts the row one place left."], ["How do you multiply decimals?", "Multiply as whole numbers, then put in as many decimal places as the two numbers have together."]],
  }),
  mk({
    slug: "long-addition-subtraction-calculator", title: "Long Addition & Subtraction Calculator (Column Method With Carrying & Borrowing)",
    meta: "Long Addition & Subtraction Calculator — Carry & Borrow Steps",
    desc: "Add a list of numbers or subtract one number from another with the column method, showing each column from right to left with the carries or borrows (regrouping), lined up on the decimal point.",
    inputs: [dd("mode", "Calculate", E.LAS_MODES, 0), tx("numbers", "Numbers to Add (separate with + or new lines)", "4,786 + 2,957 + 815"), tx("a", "Top Number (subtract mode)", "7,003"), tx("b", "Number to Subtract", "2,458")],
    results: [["answer", "Answer", "t"], ["columns", "Column by Column", "t"], ["carries", "Carries / Borrows", "t"], ["setup", "Set Up", "t"], ["check", "Check", "t"]],
    fn: C["long-addition-subtraction-calculator"], ex: { mode: 0, ...T("numbers", "4,786 + 2,957 + 815"), ...T("a", "7,003"), ...T("b", "2,458") },
    exText: (o) => `Example: 4,786 + 2,957 + 815 = ${o.answer} with ${o.carries}.`,
    how: "Line the numbers up on the right (or on the decimal point). Start with the ones column: add the digits, write the last digit of the total and carry the rest to the next column. Keep going left.\n\nFor subtraction, if the top digit is smaller than the bottom one, borrow 1 from the next column to the left: the top digit gains 10 and the next one loses 1. Across zeros (7,003 − 2,458) the borrow passes through each zero, which becomes 9.",
    assume: "Exact decimal arithmetic. Step-by-step columns are shown for positive numbers; negatives give the answer only.",
    faq: [["What is carrying in addition?", "When a column adds to 10 or more, you write the ones digit and add the tens to the next column."], ["How do you subtract across zeros?", "Borrow from the first non-zero digit to the left; every zero you pass becomes 9."], ["How do I check a subtraction?", "Add the answer to the number you subtracted — you should get the top number."]],
  }),
  mk({
    slug: "order-of-operations-calculator", title: "Order of Operations Calculator (PEMDAS / BODMAS With Steps)",
    meta: "Order of Operations Calculator — PEMDAS Step by Step",
    desc: "Type an expression with brackets, exponents, ×, ÷, + and − and see it solved one operation at a time in PEMDAS / BODMAS order, with the expression rewritten after every step.",
    inputs: [tx("expr", "Expression (use ^ for powers, × or * and ÷ or /)", "3 + 6 × (5 + 4) ÷ 3 − 7")],
    results: [["answer", "Answer", "t"], ["expression", "Expression", "t"], ["steps", "Steps", "t"], ["count", "Operations", "t"], ["rule", "Order Used", "t"]],
    fn: C["order-of-operations-calculator"], ex: { ...T("expr", "3 + 6 × (5 + 4) ÷ 3 − 7") },
    exText: (o) => `Example: 3 + 6 × (5 + 4) ÷ 3 − 7 = ${o.answer} — brackets first (9), then 6 × 9 = 54, 54 ÷ 3 = 18, then 3 + 18 − 7.`,
    how: "PEMDAS (BODMAS in the UK) sets the order: Parentheses (Brackets) first, then Exponents (Orders), then Multiplication and Division from left to right, then Addition and Subtraction from left to right.\n\nMultiplication doesn't come before division, and addition doesn't come before subtraction — each pair is worked left to right as they appear. So 8 ÷ 2 × 4 = 16, not 1. Powers stack from the right: 2^3^2 = 2^9 = 512.",
    assume: "A number next to a bracket means multiply: 2(3 + 4) = 2 × (3 + 4). −3^2 is read as −(3^2) = −9. % divides the number before it by 100. Results are shown to 12 significant digits.",
    faq: [["What is 6 ÷ 2(1 + 2)?", "With strict left-to-right PEMDAS, 6 ÷ 2 × 3 = 9."], ["Is multiplication done before division?", "No — they have equal priority and are worked left to right."], ["What's the difference between PEMDAS and BODMAS?", "Only the names: brackets/parentheses and orders/exponents. The order is the same."]],
  }),
  mk({
    slug: "repeating-decimal-to-fraction-calculator", title: "Repeating Decimal to Fraction Calculator (Recurring Decimals With Steps)",
    meta: "Repeating Decimal to Fraction Calculator — 0.(3) to 1/3",
    desc: "Convert a repeating (recurring) decimal such as 0.333…, 0.1(6) or 2.(142857) into a fraction in lowest terms and a mixed number, with the algebra steps (multiply by 10ⁿ and subtract).",
    inputs: [dd("mode", "Enter As", E.RD_MODES, 0), tx("decimal", "Repeating Decimal (repeating part in brackets, or end with ...)", "0.1(6)"), tx("whole", "Whole Number Part", "0"), tx("nonrep", "Digits After the Point That Don't Repeat (may be blank)", "1"), tx("rep", "Repeating Digits", "6")],
    results: [["fraction", "Fraction", "t"], ["mixed", "Mixed Number", "t"], ["notation", "Reading", "t"], ["steps", "Steps", "t"], ["decimal", "Decimal Check", "t"], ["check", "Check", "t"]],
    fn: C["repeating-decimal-to-fraction-calculator"], ex: { mode: 0, ...T("decimal", "0.1(6)"), ...T("whole", "0"), ...T("nonrep", "1"), ...T("rep", "6") },
    exText: (o) => `Example: 0.1666… (0.1 with the 6 repeating) = ${o.fraction}.`,
    how: "Call the decimal x. Multiply by 10 for each digit that doesn't repeat, and again by 10 for each repeating digit, so the repeating tails line up. Subtract the two equations and the endless tail cancels.\n\nFor 0.1(6): 100x = 16.666…, 10x = 1.666…, so 90x = 15 and x = 15/90 = 1/6. A shortcut for a pure repeat like 0.(27): put the block over the same number of 9s, 27/99 = 3/11.",
    assume: "Brackets mark the repeating block: 0.(3) = 0.333…, 1.2(45) = 1.24545…. With \"...\" the shortest block that is shown at least twice is taken as the repeat.",
    faq: [["What is 0.333… as a fraction?", "1/3."], ["What is 0.1666… as a fraction?", "1/6."], ["Is 0.999… equal to 1?", "Yes — 0.(9) = 9/9 = 1 exactly."]],
  }),
];

const RETIRE: ToolDef[] = [
  mk({
    slug: "passive-income-calculator", title: "Passive Income Calculator (How Much to Live Off Interest)",
    meta: "Passive Income Calculator — Live Off Interest & Dividends",
    desc: "Find how much money you need to live off interest or dividends for a target monthly income, or how much income your savings will pay — after tax and inflation — and how long it takes to save the amount.",
    inputs: [dd("mode", "Calculate", E.PI_MODES, 0), money("target", "Monthly Income Wanted", 3000), money("balance", "Balance (income mode)", 500000), pct("yield", "Yield / Interest Rate (% a year)", 4.5, 30), pct("tax", "Tax on the Income (%)", 15, 99), pct("inflation", "Inflation (% a year)", 3, 30), money("have", "Saved So Far", 50000), money("add", "Monthly Contribution", 1000), pct("growth", "Growth While Saving (% a year)", 7, 30)],
    results: [["capital", "Money Needed", "t"], ["monthly", "Monthly Income (after tax)", "t"], ["annual", "Yearly Income (after tax)", "t"], ["gross", "Before Tax", "t"], ["real", "Inflation", "t"], ["reach", "Time to Get There", "t"], ["rate", "Rates", "t"]],
    fn: C["passive-income-calculator"], ex: { mode: 0, target: 3000, balance: 500000, yield: 4.5, tax: 15, inflation: 3, have: 50000, add: 1000, growth: 7 },
    exText: (o) => `Example: $3,000 a month from a 4.5% yield taxed at 15% needs ${o.capital}. Saving $1,000 a month from $50,000 at 7% gets there in ${String(o.reach).split(" (")[0]}.`,
    how: "Money needed = yearly income ÷ after-tax yield. For $36,000 a year at 4.5% taxed at 15% (3.825% after tax), that's $36,000 ÷ 0.03825 ≈ $941,000.\n\nLiving only off the interest leaves the principal untouched, but inflation slowly shrinks what it buys. To keep its value, spend only the yield above inflation and reinvest the rest — that needs a bigger balance, shown under Inflation.",
    assume: "A steady yield (savings, CDs, bonds or dividends) with the principal never spent. Tax is a flat rate on the income. Time to save compounds monthly. Yields change, so treat this as an estimate; it isn't financial advice.",
    faq: [["How much do I need to live off interest?", "Yearly spending ÷ after-tax yield: $40,000 at a 4% after-tax yield needs $1 million."], ["How much does $1 million make in interest?", "About $45,000 a year at 4.5%, before tax."], ["Is this the same as the 4% rule?", "No — the 4% rule spends some principal over 30 years. Living off interest never touches it."]],
  }),
];

async function main() {
  const all = [...MATH, ...RETIRE];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); for (const t of all) console.log(`  ${t.slug}: ${t.examples}`); return; }
  await upsertTools("math-calculators", MATH);
  await upsertTools("retirement-calculators", RETIRE);
}
main().catch((e) => { console.error(e); process.exit(1); });
