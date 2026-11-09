// One-time (but safe to re-run) batch setup script: creates 12 calculators in Science Calculators >
// Scientific & Graphing Calculators (scientific, graphing, math solver, CAS, significant figures,
// logs, exponents, RPN and scientific notation). Formulas live in src/lib/calc-engine-sci-calc.ts;
// examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-science-category.ts --apply)
//   npx tsx prisma/create-sci-calc-calculators.ts
// or
//   npm run db:create-sci-calc-calculators

import * as E from "../src/lib/calc-engine-sci-calc";
import { T, type Vals, type Out, type SciCalculator } from "../src/lib/sci-math-core";

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

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; labels?: string[] };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

/** Number input: key, label, default, min, max, step, unit. */
const num = (key: string, label: string, def: number, min = -1e12, max = 1e12, step = 0.01, unit?: string) => ({ key, label, type: "number", ...(unit ? { unit } : {}), required: true, default: def, min, max, step });
/** Text input (expressions, number lists). */
const tx = (key: string, label: string, def: string) => ({ key, label, type: "text", required: true, default: def });
const opts = (labels: string[]) => labels.map((l, i) => ({ label: l, value: i }));
/** Dropdown with index values. */
const dd = (key: string, label: string, labels: string[], def = 0) => ({ key, label, type: "dropdown", required: true, default: def, options: opts(labels) });
const FMT = { n: "number", l: "label", t: "text", p: "percentage" } as const;
/** [key, label, format, labels-or-decimals]. */
type Line = [key: string, label: string, fmt: keyof typeof FMT, extra?: string[] | number];

interface Spec { slug: string; title: string; desc: string; meta?: string; inputs: Record<string, unknown>[]; results: Line[]; fn: SciCalculator; ex: Vals; exText: (o: Out) => string; how: string; assume: string; faq: [string, string][] }
function mk(s: Spec): ToolDef {
  const o = s.fn(s.ex) as Out;
  const line = ([key, label, f, extra]: Line, i: number) => ({ key, label, format: FMT[f], ...(Array.isArray(extra) ? { labels: extra } : typeof extra === "number" ? { decimals: extra } : {}), ...(i === 0 ? { highlight: true } : {}) });
  const first = line(s.results[0], 0);
  return {
    slug: s.slug,
    title: s.title,
    description: s.desc,
    metaTitle: (s.meta ?? s.title).slice(0, 70),
    metaDescription: s.desc.length > 158 ? `${s.desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : s.desc,
    calcInputs: s.inputs,
    calcResult: { label: first.label, format: first.format, ...("labels" in first ? { labels: first.labels } : {}) },
    calcResults: s.results.map(line),
    instructions: s.how,
    examples: s.exText(o),
    assumptions: s.assume,
    faq: s.faq.map(([question, answer]) => ({ question, answer })),
  };
}

const CAT = "scientific-graphing-calculators";
const ANGLE = dd("angle", "Angle Unit (trig)", E.ANGLE_MODES, 0);
const EXPR_NOTE = "Supported: + − × ÷ ^ ( ), sqrt, cbrt, nthRoot(x, n), sin, cos, tan, sec, csc, cot and their inverses (asin…), sinh/cosh/tanh, exp, ln (natural log), log (base 10; log(x, b) for base b), log2, abs, round, floor, ceil, factorial (5!), pi and e. Implicit multiplication works (2x, 3(x+1)).";

const TOOLS: ToolDef[] = [
  mk({
    slug: "scientific-calculator", title: "Scientific Calculator (Online, Free)",
    desc: "Free online scientific calculator — type any expression with trig, logs, powers, roots, factorials, π and e, in degrees or radians, and get the answer in decimal and scientific notation.",
    meta: "Scientific Calculator — Free Online Scientific Calculator",
    inputs: [tx("expr", "Expression", "sin(30) + sqrt(16) * 2^3"), ANGLE],
    results: [["result", "Answer", "n", 12], ["sci", "Scientific Notation", "t"], ["text", "Working", "t"]],
    fn: E.scientific, ex: { ...T("expr", "sin(30) + sqrt(16) * 2^3"), angle: 0 },
    exText: (o) => `Example: sin(30°) + √16 × 2³ = ${o.result} (0.5 + 4 × 8).`,
    how: `Type the whole calculation in one line, using brackets where you need them, and pick degrees or radians for trig. ${EXPR_NOTE}\n\nIt works like a Casio, Texas Instruments (TI-30, TI-36) or Desmos scientific calculator, but you can see and edit the whole expression.`,
    assume: "Calculations use double-precision floating point (about 15–16 significant digits); the answer is rounded to 12 significant figures. log is base 10 and ln is the natural log, as on a handheld scientific calculator.",
    faq: [["Is this like a Casio or TI scientific calculator?", "Yes — it has the same functions (trig, inverse trig, hyperbolic, logs, powers, roots, factorial, π, e) and the same degree/radian mode, and follows the usual order of operations."], ["How do I enter a power or a root?", "Use ^ for powers (2^10), sqrt(x) for a square root, cbrt(x) for a cube root and nthRoot(x, n) for any root."]],
  }),
  mk({
    slug: "graphing-calculator", title: "Graphing Calculator (Function Analyzer)",
    desc: "Enter a function y = f(x) and a viewing window to get its value at any x, the y-intercept, every zero (x-intercept), local minimums and maximums, the range and a table of points.",
    meta: "Graphing Calculator — Zeros, Extrema & Table of Values",
    inputs: [tx("fx", "Function f(x)", "x^3 - 6x^2 + 9x + 1"), num("xmin", "Window x Min", -2), num("xmax", "Window x Max", 6), num("x0", "Evaluate at x =", 2), ANGLE],
    results: [["y", "f(x) at Your x", "n", 10], ["zeros", "Zeros (x-intercepts)", "t"], ["extrema", "Local Minimums & Maximums", "t"], ["yIntercept", "y-intercept f(0)", "n", 10], ["range", "y Range in Window", "t"], ["table", "Table of Values", "t"]],
    fn: E.graphing, ex: { ...T("fx", "x^3 - 6x^2 + 9x + 1"), xmin: -2, xmax: 6, x0: 2, angle: 1 },
    exText: (o) => `Example: f(x) = x³ − 6x² + 9x + 1 on −2 ≤ x ≤ 6 has a local max and min at — ${String(o.extrema).replace(/\n/g, "; ")} — and f(2) = ${o.y}.`,
    how: `Type the right-hand side of y = f(x) using x as the variable, set the x window you want to study, and read off the key features of the graph — the same points you'd trace on a TI-84, Desmos or NumWorks graph. ${EXPR_NOTE}`,
    assume: "Zeros are found by scanning the window in 4,000 steps and refining sign changes; a zero where the graph only touches the axis may be missed. Extrema are found on an 800-point grid and refined numerically. Points where f is undefined are skipped.",
    faq: [["How do I find where the graph crosses the x-axis?", "Those are the zeros — they're listed in the results for your window. Widen the window if you expect more."], ["Can I graph trig functions?", "Yes — pick radians for the usual sin(x) graph, or degrees if your x values are angles in degrees."]],
  }),
  mk({
    slug: "math-solver-calculator", title: "Math Problem Solver (Equations & Expressions)",
    desc: "Type a sum or an equation — 2x + 3 = 11, x^2 = 5x − 6, 15% of 80 — and get the answer, every real solution for x and a check that it works.",
    meta: "Math Solver Calculator — Solve Equations & Calculations",
    inputs: [tx("problem", "Problem", "x^2 = 5x - 6"), ANGLE],
    results: [["answer", "Answer", "t"], ["type", "What Was Solved", "t"], ["check", "Check", "t"]],
    fn: E.mathSolver, ex: { ...T("problem", "x^2 = 5x - 6"), angle: 0 },
    exText: (o) => `Example: x² = 5x − 6 gives ${o.answer}.`,
    how: `Type a plain calculation to evaluate it, or an equation with one "=" and the unknown x to solve it. An expression with x and no "=" is solved for expression = 0. ${EXPR_NOTE}`,
    assume: "Equations are solved numerically for real solutions between −1,000 and 1,000 (accurate to about 10 significant figures). Complex solutions aren't shown — use the Quadratic Formula or Polynomial Roots calculators for those.",
    faq: [["Does it show steps?", "It shows the solutions and a check (both sides of the equation at the answer). The equation-specific calculators (quadratic formula, linear equations, systems) show the method."], ["What variable should I use?", "Use x for the unknown."]],
  }),
  mk({
    slug: "cas-calculator", title: "CAS Calculator (Symbolic Derivative, Simplify & Integrate)",
    desc: "Online CAS-style calculator: simplify an expression, get its first and second derivative symbolically, and evaluate f(x), the slope at a point and a definite integral.",
    inputs: [tx("fx", "Expression in x", "x^3*sin(x) + 2x^2 - x^2"), num("x0", "Point x =", 1), num("a", "Integrate from a =", 0), num("b", "to b =", 2)],
    results: [["derivative", "Derivative f′(x)", "t"], ["simplified", "Simplified f(x)", "t"], ["second", "Second Derivative f″(x)", "t"], ["valueAt", "f(x) at the Point", "n", 10], ["slopeAt", "Slope f′(x) at the Point", "n", 8], ["integral", "Definite Integral a→b", "n", 10]],
    fn: E.cas, ex: { ...T("fx", "x^3*sin(x) + 2x^2 - x^2"), x0: 1, a: 0, b: 2 },
    exText: (o) => `Example: f(x) = x³·sin(x) + 2x² − x² simplifies to ${o.simplified}; its derivative is ${o.derivative}, and ∫₀² f(x) dx = ${o.integral}.`,
    how: `Type an expression in x. Trig functions use radians, as in calculus. ${EXPR_NOTE}\n\nA CAS (computer algebra system) such as a TI-Nspire CAS or Casio ClassPad works with symbols rather than just numbers — this tool gives the symbolic simplification and derivatives plus numeric values.`,
    assume: "Symbolic work uses the mathjs algebra engine; simplification is algebraic (it may not match a textbook's chosen form). The definite integral is computed numerically with adaptive Simpson's rule.",
    faq: [["What does CAS mean on a calculator?", "Computer Algebra System — the calculator can manipulate expressions (simplify, differentiate, solve) instead of only giving decimal answers."], ["Are CAS calculators allowed in exams?", "Often not — the SAT allows some, but ACT and many school exams ban CAS models. Check your exam's calculator policy."]],
  }),
  mk({
    slug: "significant-figures-calculator", title: "Significant Figures Calculator (Sig Fig Counter & Rounding)",
    desc: "Count significant figures in a number, round to any number of sig figs, and apply the sig-fig rules for adding, subtracting, multiplying and dividing measurements.",
    meta: "Sig Fig Calculator — Count & Round Significant Figures",
    inputs: [dd("op", "What to Do", E.SIG_OPS, 0), tx("a", "Number", "0.004500"), tx("b", "Second Number (operations)", "12.1"), dd("sign", "Operation", ["+ or ×", "− or ÷"], 0), num("n", "Round to (sig figs)", 3, 1, 15, 1)],
    results: [["result", "Significant Figures", "n"], ["rounded", "Result", "t"], ["rule", "Rule Applied", "t"]],
    fn: E.sigFigs, ex: { op: 0, ...T("a", "0.004500"), ...T("b", "12.1"), sign: 0, n: 3 },
    exText: (o) => `Example: 0.004500 has ${o.result} significant figures — the leading zeros don't count, the trailing zeros after the decimal point do.`,
    how: "Counting rules: non-zero digits always count; zeros between non-zero digits count; leading zeros never count; trailing zeros count only if there's a decimal point (1500 has 2, 1500. has 4). For × and ÷ keep the fewest significant figures of the inputs; for + and − keep the fewest decimal places.",
    assume: "Numbers in scientific notation (4.50e3 or 4.50 × 10^3) are counted by their mantissa. A whole number with trailing zeros and no decimal point is treated as having those zeros not significant.",
    faq: [["How many sig figs does 100 have?", "One — the trailing zeros aren't significant without a decimal point. 100. has three, and 1.00 × 10² has three."], ["Do exact numbers limit sig figs?", "No — counted or defined numbers (12 eggs, 100 cm in a metre) have unlimited significant figures."]],
  }),
  mk({
    slug: "antilog-calculator", title: "Antilog Calculator (Inverse Log, 10^x)",
    desc: "Find the antilog (inverse logarithm) of a number in base 10, e or any base — 10^x, e^x or b^x — with the result in decimal and scientific notation.",
    inputs: [num("x", "Logarithm Value x", 0.952), num("base", "Base (10, 2.71828…, 2)", 10, 0.000001, 1e6, 0.0001)],
    results: [["result", "Antilog (b^x)", "n", 12], ["sci", "Scientific Notation", "t"], ["check", "Check", "t"]],
    fn: E.antilog, ex: { x: 0.952, base: 10 },
    exText: (o) => `Example: antilog(0.952) = 10^0.952 = ${o.result}.`,
    how: "The antilog undoes a logarithm: if log₁₀(y) = x then y = 10^x. Use base 2.718281828 for the natural antilog (e^x). On a handheld calculator it's the 10^x key (SHIFT + log).",
    assume: "Exact up to double-precision floating point.",
    faq: [["How do I find antilog on a calculator?", "Press SHIFT (or 2nd) then LOG to get 10^x, and type the number."], ["What is the antilog of 2?", "10² = 100."]],
  }),
  mk({
    slug: "natural-log-calculator", title: "Natural Log (ln) Calculator",
    desc: "Calculate the natural logarithm ln(x) — log base e — along with log base 10 and e^x for the same number.",
    inputs: [num("x", "Number x", 10, -1e6, 1e12)],
    results: [["ln", "ln(x)", "n", 12], ["log10", "log₁₀(x)", "n", 12], ["exp", "e^x", "n", 12]],
    fn: E.naturalLog, ex: { x: 10 },
    exText: (o) => `Example: ln(10) = ${o.ln} and e^10 = ${o.exp}.`,
    how: "ln(x) is the power you raise e ≈ 2.718281828 to in order to get x. It's only defined for x > 0. Useful identities: ln(ab) = ln a + ln b, ln(a/b) = ln a − ln b, ln(aᵇ) = b·ln a.",
    assume: "Exact up to double-precision floating point.",
    faq: [["What is ln(1)?", "0, because e⁰ = 1."], ["What's the difference between ln and log?", "ln is base e; log on most calculators is base 10. ln(x) = 2.302585 × log₁₀(x)."]],
  }),
  mk({
    slug: "log-base-2-calculator", title: "Log Base 2 Calculator (log₂)",
    desc: "Calculate log base 2 of any number — the power of 2 that gives it — plus the number of bits needed and the powers of 2 it falls between.",
    inputs: [num("x", "Number x", 1024, -1e6, 1e15)],
    results: [["log2", "log₂(x)", "n", 12], ["bits", "Bits Needed (ceil log₂)", "n"], ["pow2", "Power of 2", "t"]],
    fn: E.logBase2, ex: { x: 1024 },
    exText: (o) => `Example: log₂(1024) = ${o.log2}, because ${o.pow2}.`,
    how: "log₂(x) = ln(x) ÷ ln(2). It's used in computing (bits, binary search steps), information theory and music (octaves).",
    assume: "Exact up to double-precision floating point.",
    faq: [["How do I calculate log base 2 on a normal calculator?", "Divide log(x) by log(2) — e.g. log(1000)/log(2) ≈ 9.966."]],
  }),
  mk({
    slug: "log-calculator", title: "Logarithm Calculator (Any Base)",
    desc: "Calculate the logarithm of a number in any base, plus its log base 10, natural log and log base 2.",
    meta: "Log Calculator — Logarithm in Any Base (log10, ln, log2)",
    inputs: [num("x", "Number x", 100, -1e6, 1e15), num("base", "Base b", 10, 0.000001, 1e9, 0.0001)],
    results: [["log", "log_b(x)", "n", 12], ["log10", "log₁₀(x)", "n", 12], ["ln", "ln(x)", "n", 12], ["log2", "log₂(x)", "n", 12]],
    fn: E.logCalc, ex: { x: 100, base: 10 },
    exText: (o) => `Example: log₁₀(100) = ${o.log}; ln(100) = ${o.ln}.`,
    how: "Change of base: log_b(x) = ln(x) ÷ ln(b). The base must be positive and not 1, and x must be positive.",
    assume: "Exact up to double-precision floating point.",
    faq: [["What is log₁₀(3628800)?", "About 6.5598 (3,628,800 is 10!)."]],
  }),
  mk({
    slug: "exponent-calculator", title: "Exponent Calculator (Powers, Squares & Cubes)",
    desc: "Raise any number to any power — including negative and fractional exponents — and see its square, cube and root, with very large answers in scientific notation.",
    meta: "Exponent Calculator — Raise a Number to a Power",
    inputs: [num("base", "Base", 2), num("exp", "Exponent", 10)],
    results: [["result", "Base^Exponent", "n", 12], ["sci", "Scientific Notation", "t"], ["square", "Base²", "n", 12], ["cube", "Base³", "n", 12], ["root", "Exponent-th Root of Base", "n", 10]],
    fn: E.exponent, ex: { base: 2, exp: 10 },
    exText: (o) => `Example: 2^10 = ${o.result}; 2³ = ${o.cube}.`,
    how: "A negative exponent means a reciprocal (2^−3 = 1/8); a fractional exponent means a root (8^(1/3) = 2). A negative base only works with whole-number exponents.",
    assume: "Results beyond about 1.8 × 10^308 overflow and are shown as too large.",
    faq: [["What is anything to the power 0?", "1 (for any non-zero base)."], ["How do I cube a number?", "Use exponent 3 — the cube is also shown for any base."]],
  }),
  mk({
    slug: "rpn-calculator", title: "RPN Calculator (Reverse Polish Notation)",
    desc: "Online RPN calculator in the style of HP calculators: enter numbers and operators in postfix order (3 4 + 2 ×) and see the stack after every step.",
    inputs: [tx("stack", "RPN Entry", "3 4 + 2 * 5 sqrt -")],
    results: [["result", "Result (top of stack)", "n", 12], ["depth", "Items Left on Stack", "n"], ["steps", "Stack After Each Step", "t"]],
    fn: E.rpn, ex: T("stack", "3 4 + 2 * 5 sqrt -"),
    exText: (o) => `Example: 3 4 + 2 * 5 sqrt − = (3 + 4) × 2 − √5 = ${o.result}.`,
    how: "Type numbers and operators separated by spaces. Operators: + − * / ^ %, and sqrt, sq, inv (1/x), chs (change sign), sin/cos/tan (degrees), ln, log, swap, dup, pi, e. Each operator uses the number(s) on top of the stack.",
    assume: "Trig in degrees. Division by zero gives infinity.",
    faq: [["Why use RPN?", "There are no brackets — every operation acts immediately on the stack, which is faster for long chains once you're used to it (HP 12C, HP 35s)."]],
  }),
  mk({
    slug: "scientific-notation-calculator", title: "Scientific Notation Calculator",
    desc: "Convert numbers to and from scientific notation and multiply, divide, add or subtract numbers in scientific notation — with E-notation, engineering notation and the order of magnitude.",
    inputs: [dd("op", "Operation", E.SN_OPS, 1), num("a", "First Number (e.g. 4.5e6)", 4500000), num("b", "Second Number (e.g. 3e-4)", 0.0003)],
    results: [["scientific", "Scientific Notation", "t"], ["eNotation", "E Notation", "t"], ["engineering", "Engineering Notation", "t"], ["decimal", "Decimal", "t"], ["magnitude", "Order of Magnitude", "n"]],
    fn: E.sciNotation, ex: { op: 1, a: 4500000, b: 0.0003 },
    exText: (o) => `Example: (4.5 × 10^6) × (3 × 10^−4) = ${o.scientific} = ${o.decimal}.`,
    how: "Type numbers normally or in E notation (6.02e23). Scientific notation writes a number as a × 10^n with 1 ≤ |a| < 10; engineering notation uses powers of 10 that are multiples of 3 (kilo, mega, milli…).",
    assume: "Mantissas are shown to 6 significant figures.",
    faq: [["How do I multiply in scientific notation?", "Multiply the mantissas and add the exponents, then renormalise: (2 × 10³)(4 × 10⁵) = 8 × 10⁸."]],
  }),
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-science-category.ts --apply" first.`);

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
      // Published straight away (user, 6 Nov 2026: no tool should stay Draft).
      await prisma.tool.create({
        data: { slug: def.slug, status: "published", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all published.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
