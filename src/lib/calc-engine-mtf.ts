/**
 * Batch: math / time-card / finance keyword check (16 Nov 2026 — Claude outputs/
 * Math_Time_Finance_Keyword_Check.md). Four Science > Math step-by-step tools (long multiplication,
 * long addition & subtraction, order of operations, repeating decimal to fraction) and one
 * Finance > Retirement tool (passive income / living off interest).
 *
 * Near-namesakes kept apart on purpose:
 *  - long-multiplication / long-addition-subtraction show the written column method with carries
 *    and borrows. basic-calculator (existing) only gives the answer; long-division (existing)
 *    covers division.
 *  - order-of-operations shows every PEMDAS/BODMAS step. basic-calculator evaluates the same way
 *    without steps; evaluate-expression (existing) substitutes variable values.
 *  - repeating-decimal-to-fraction handles recurring digits (0.1(6) → 1/6). fraction-calculator
 *    (existing) converts terminating decimals only.
 *  - passive-income = capital needed to live off yield, or income from a balance.
 *    retirement-withdrawal (existing) spends the principal down; fire-number (existing) uses the
 *    4% rule on expenses.
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, money, nfmt } from "./trv-core";

const B0 = BigInt(0), B1 = BigInt(1), B10 = BigInt(10);
const pow10 = (n: number) => B10 ** BigInt(n);
const absB = (x: bigint) => (x < B0 ? -x : x);
const gcdB = (a: bigint, b: bigint): bigint => { a = absB(a); b = absB(b); while (b) { [a, b] = [b, a % b]; } return a; };
const group = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// Exact decimal: value = int / 10^scale
type Dec = { int: bigint; scale: number };
function parseDec(raw: string, label: string): Dec {
  const t = raw.trim().replace(/[,\s_]/g, "").replace(/^−/, "-");
  const m = t.match(/^([+-]?)(\d*)(?:\.(\d*))?$/);
  if (!m || (m[2] === "" && !m[3])) throw new InputError(`${label} must be a number like 3847 or 12.75.`);
  const frac = m[3] ?? "";
  if ((m[2] + frac).length > 200) throw new InputError(`${label} is too long — keep it under 200 digits.`);
  const v = BigInt((m[2] || "0") + frac);
  return { int: m[1] === "-" ? -v : v, scale: frac.length };
}
function decText(d: Dec): string {
  const neg = d.int < B0, s = absB(d.int).toString().padStart(d.scale + 1, "0");
  const ip = s.slice(0, s.length - d.scale), fp = d.scale ? s.slice(s.length - d.scale).replace(/0+$/, "") : "";
  const out = group(ip) + (fp ? "." + fp : "");
  return (neg && /[1-9]/.test(out) ? "−" : "") + out;
}

// ------------------------------------------------------------------ long multiplication
export const longMultiplication: Calc = (v) => {
  const A = parseDec(txt(v, "a"), "The first number"), Bn = parseDec(txt(v, "b"), "The second number");
  const neg = (A.int < B0) !== (Bn.int < B0);
  const a = absB(A.int), b = absB(Bn.int);
  const as = a.toString(), bs = b.toString();
  const steps: string[] = [], partials: bigint[] = [];
  for (let k = 0; k < bs.length; k++) {
    const d = Number(bs[bs.length - 1 - k]);
    // Carries for this row, right to left.
    const carries: number[] = [];
    let carry = 0;
    for (let i = as.length - 1; i >= 0; i--) { const p = Number(as[i]) * d + carry; carry = Math.floor(p / 10); carries.push(carry); }
    const row = a * BigInt(d), shifted = row * pow10(k);
    partials.push(shifted);
    const place = k === 0 ? "ones" : k === 1 ? "tens" : k === 2 ? "hundreds" : k === 3 ? "thousands" : `10^${k}`;
    const cs = carries.slice(0, -1).filter((c) => c > 0);
    if (steps.length < 30) steps.push(`Row ${k + 1} (${place} digit ${d}): ${group(as)} × ${d} = ${group(row.toString())}${k ? ` → shift ${k} place${k > 1 ? "s" : ""} left (add ${"0".repeat(k)}) = ${group(shifted.toString())}` : ""}${cs.length ? ` [carries ${cs.join(", ")}]` : ""}`);
  }
  const prod = a * b, scale = A.scale + Bn.scale;
  const sumLine = partials.length > 1 ? `Add the rows: ${partials.slice(0, 12).map((p) => group(p.toString())).join(" + ")}${partials.length > 12 ? " + …" : ""} = ${group(prod.toString())}` : "Only one row, so no adding needed";
  const res: Dec = { int: neg ? -prod : prod, scale };
  return {
    product: decText(res),
    rows: steps.join("; "),
    sum: sumLine,
    decimals: scale ? `${A.scale} + ${Bn.scale} = ${scale} decimal place${scale > 1 ? "s" : ""}: multiply ${group(as)} × ${group(bs)} as whole numbers, then put the point ${scale} place${scale > 1 ? "s" : ""} from the right` : "No decimals",
    check: `${decText(A)} × ${decText(Bn)} = ${decText(res)}`,
    digits: `${absB(res.int).toString().length} digits`,
  };
};
function align(ds: Dec[]): { ints: bigint[]; scale: number } {
  const scale = Math.max(...ds.map((d) => d.scale));
  return { ints: ds.map((d) => d.int * pow10(scale - d.scale)), scale };
}
const colName = (i: number, scale: number) => {
  const p = i - scale; // 0 = ones
  if (p < 0) return ["tenths", "hundredths", "thousandths"][-p - 1] ?? `10^${p}`;
  return ["ones", "tens", "hundreds", "thousands", "ten-thousands", "hundred-thousands", "millions"][p] ?? `10^${p}`;
};
export const longAdditionSubtraction: Calc = (v) => {
  const mode = pick(v.mode, 2);
  const parts = txt(v, "numbers").split(/[\n;+]+|,\s+|\s+/).map((s) => s.trim()).filter(Boolean);
  if (mode === 1) {
    const A = parseDec(txt(v, "a"), "The top number"), Bd = parseDec(txt(v, "b"), "The number to subtract");
    const { ints, scale } = align([A, Bd]);
    let [x, y] = ints, swapped = false;
    if (x < B0 || y < B0) {
      const r: Dec = { int: x - y, scale };
      return { answer: decText(r), columns: "Column subtraction is shown for positive numbers. For negatives, use the rule a − (−b) = a + b.", carries: "—", setup: `${decText(A)} − ${decText(Bd)}`, check: `${decText(r)} + ${decText(Bd)} = ${decText(A)}` };
    }
    if (y > x) { [x, y] = [y, x]; swapped = true; }
    const xs = x.toString(), ys = y.toString().padStart(xs.length, "0");
    const steps: string[] = [];
    let borrow = 0, borrows = 0;
    const digits: number[] = [];
    for (let i = 0; i < xs.length; i++) {
      const orig = Number(xs[xs.length - 1 - i]), lent = borrow, top = orig - lent, bot = Number(ys[ys.length - 1 - i]);
      const head = lent ? `${orig} − 1 lent = ${top}` : `${orig}`;
      let d = top - bot, line: string;
      if (top < 0) { d += 10; borrow = 1; borrows++; line = `this 0 lent 1 to the right, so it borrows from the next column and becomes 9: 9 − ${bot} = ${d}`; }
      else if (d < 0) { d += 10; borrow = 1; borrows++; line = `${head} is less than ${bot}, so borrow 1 from the next column: ${top + 10} − ${bot} = ${d}`; }
      else { borrow = 0; line = `${head} − ${bot} = ${d}`; }
      digits.push(d);
      if (steps.length < 30) steps.push(`${colName(i, scale)}: ${line}`);
    }
    const diff = x - y, r: Dec = { int: swapped ? -diff : diff, scale };
    return {
      answer: decText(r),
      columns: steps.join("; "),
      carries: `${borrows} borrow${borrows === 1 ? "" : "s"}`,
      setup: swapped ? `The bottom number is larger, so work out ${decText({ int: x, scale })} − ${decText({ int: y, scale })} and make the answer negative` : `${decText(A)} − ${decText(Bd)}, lined up on the decimal point`,
      check: `${decText(r)} + ${decText(Bd)} = ${decText(A)}`,
    };
  }
  if (parts.length < 2) throw new InputError("Enter at least two numbers to add, separated by + or new lines.");
  if (parts.length > 50) throw new InputError("Add up to 50 numbers at a time.");
  const ds = parts.map((p, i) => parseDec(p, `Number ${i + 1}`));
  const { ints, scale } = align(ds);
  if (ints.some((x) => x < B0)) {
    const tot = ints.reduce((s, x) => s + x, B0), r: Dec = { int: tot, scale };
    return { answer: decText(r), columns: "Column addition is shown for positive numbers. A negative number is the same as subtracting it — use Subtract mode.", carries: "—", setup: ds.map(decText).join(" + "), check: `Total ${decText(r)}` };
  }
  const width = Math.max(...ints.map((x) => x.toString().length));
  const strs = ints.map((x) => x.toString().padStart(width, "0"));
  const steps: string[] = [];
  let carry = 0, carries = 0;
  for (let i = 0; i < width; i++) {
    const col = strs.map((s) => Number(s[width - 1 - i]));
    const sum = col.reduce((a, b) => a + b, 0) + carry;
    const d = sum % 10, nc = Math.floor(sum / 10);
    if (steps.length < 30) steps.push(`${colName(i, scale)}: ${col.join(" + ")}${carry ? ` + carry ${carry}` : ""} = ${sum} → write ${d}${nc ? `, carry ${nc}` : ""}`);
    if (nc) carries++;
    carry = nc;
  }
  if (carry) steps.push(`Write the final carry ${carry} at the front`);
  const tot = ints.reduce((s, x) => s + x, B0), r: Dec = { int: tot, scale };
  return {
    answer: decText(r),
    columns: steps.join("; "),
    carries: `${carries} carr${carries === 1 ? "y" : "ies"}`,
    setup: `${ds.map(decText).join(" + ")}${scale ? `, lined up on the decimal point (${scale} decimal place${scale > 1 ? "s" : ""})` : ""}`,
    check: `${ds.length} numbers, total ${decText(r)}`,
  };
};

// ------------------------------------------------------------------ order of operations
type Tok = { t: "n"; v: number } | { t: "o"; v: string } | { t: "("; v: string } | { t: ")"; v: string };
const fmtN = (x: number) => {
  if (!Number.isFinite(x)) throw new InputError("The result is undefined (division by zero or overflow).");
  const r = Number(x.toPrecision(12));
  return Math.abs(r) >= 1e15 || (Math.abs(r) < 1e-9 && r !== 0) ? r.toExponential(6).replace("-", "−") : (r < 0 ? "−" : "") + nfmt(Math.abs(r), 10).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
};
function tokenize(raw: string): Tok[] {
  const s = raw.replace(/[×xX*·]/g, "*").replace(/[÷:]/g, "/").replace(/[−–—]/g, "-").replace(/\*\*/g, "^").replace(/[[{]/g, "(").replace(/[\]}]/g, ")").replace(/,(?=\d{3}\b)/g, "");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    const prev = out[out.length - 1];
    const unaryPos = !prev || prev.t === "o" || prev.t === "(";
    if (/[\d.]/.test(c) || (c === "-" && unaryPos && /[\d.]/.test(s[i + 1] ?? ""))) {
      const m = s.slice(i).match(/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i);
      if (!m) throw new InputError(`Can't read the number at "${s.slice(i, i + 6)}".`);
      if (prev && (prev.t === ")" || prev.t === "n")) out.push({ t: "o", v: "*" });
      // −3^2 means −(3^2): keep the minus outside the power.
      if (m[0].startsWith("-") && s.slice(i + m[0].length).trimStart().startsWith("^")) out.push({ t: "n", v: -1 }, { t: "o", v: "*" }, { t: "n", v: Number(m[0].slice(1)) });
      else out.push({ t: "n", v: Number(m[0]) });
      i += m[0].length; continue;
    }
    if (c === "-" && unaryPos) { out.push({ t: "n", v: -1 }, { t: "o", v: "*" }); i++; continue; }
    if (c === "+" && unaryPos) { i++; continue; }
    if ("+-*/^".includes(c)) { out.push({ t: "o", v: c }); i++; continue; }
    if (c === "(") { if (prev && (prev.t === ")" || prev.t === "n")) out.push({ t: "o", v: "*" }); out.push({ t: "(", v: "(" }); i++; continue; }
    if (c === ")") { out.push({ t: ")", v: ")" }); i++; continue; }
    if (c === "%") { if (!prev || prev.t !== "n") throw new InputError("Put % right after a number."); prev.v /= 100; i++; continue; }
    throw new InputError(`"${c}" isn't allowed. Use numbers, + − × ÷ ^ and brackets.`);
  }
  let depth = 0;
  for (const t of out) { if (t.t === "(") depth++; if (t.t === ")") depth--; if (depth < 0) throw new InputError("A closing bracket has no opening bracket."); }
  if (depth !== 0) throw new InputError("The brackets don't match — check you closed every one.");
  if (!out.length) throw new InputError("Enter an expression such as 3 + 6 × (5 + 4) ÷ 3 − 7.");
  return out;
}
const SYM: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷", "^": "^" };
const show = (ts: Tok[]) => ts.map((t) => (t.t === "n" ? (t.v < 0 ? `(${fmtN(t.v)})` : fmtN(t.v)) : t.t === "o" ? ` ${SYM[t.v]} ` : t.v)).join("").replace(/\( /g, "(").replace(/ \)/g, ")");
export const orderOfOperations: Calc = (v) => {
  const ts = tokenize(txt(v, "expr"));
  const start = show(ts);
  const steps: string[] = [];
  const NAMES: Record<string, string> = { "^": "Exponent", "*": "Multiply", "/": "Divide", "+": "Add", "-": "Subtract" };
  for (let guard = 0; guard < 400; guard++) {
    // Remove brackets around a single number.
    let changed = true;
    while (changed) { changed = false; for (let i = 0; i + 2 < ts.length; i++) if (ts[i].t === "(" && ts[i + 1].t === "n" && ts[i + 2].t === ")") { ts.splice(i, 3, ts[i + 1]); changed = true; break; } }
    if (ts.length === 1 && ts[0].t === "n") break;
    // Innermost bracket group (or the whole expression).
    let lo = 0, hi = ts.length;
    for (let i = 0; i < ts.length; i++) { if (ts[i].t === "(") lo = i + 1; if (ts[i].t === ")") { hi = i; break; } }
    if (hi < ts.length && ts.slice(0, hi).every((t) => t.t !== "(")) lo = 0;
    const seg = ts.slice(lo, hi);
    for (let i = 0; i < seg.length; i++) { const t = seg[i]; if (t.t === "o" && (i === 0 || i === seg.length - 1 || seg[i - 1].t !== "n" || seg[i + 1].t !== "n")) throw new InputError("An operator is missing a number on one side."); if (t.t === "n" && seg[i + 1]?.t === "n") throw new InputError("Two numbers are next to each other with no operator."); }
    let k = -1;
    for (let i = seg.length - 2; i > 0; i--) if (seg[i].t === "o" && seg[i].v === "^") { k = i; break; } // right-associative
    if (k < 0) k = seg.findIndex((t) => t.t === "o" && (t.v === "*" || t.v === "/"));
    if (k < 0) k = seg.findIndex((t) => t.t === "o" && (t.v === "+" || t.v === "-"));
    if (k < 0) throw new InputError("Can't simplify this expression — check it's written correctly.");
    const a = (seg[k - 1] as { v: number }).v, b = (seg[k + 1] as { v: number }).v, op = seg[k].v;
    if (op === "/" && b === 0) throw new InputError("Division by zero isn't defined.");
    const r = op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : op === "/" ? a / b : Math.pow(a, b);
    if (Number.isNaN(r)) throw new InputError("That power has no real answer (e.g. a negative number to a fractional power).");
    const where = lo > 0 ? "inside brackets: " : "";
    ts.splice(lo + k - 1, 3, { t: "n", v: r });
    if (steps.length < 40) steps.push(`${NAMES[op]} ${where}${fmtN(a)} ${SYM[op]} ${fmtN(b)} = ${fmtN(r)} → ${show(ts)}`);
  }
  if (ts.length !== 1 || ts[0].t !== "n") throw new InputError("Can't simplify this expression — check it's written correctly.");
  const ans = ts[0].v;
  return {
    answer: fmtN(ans),
    expression: start,
    steps: steps.length ? steps.map((s, i) => `${i + 1}. ${s}`).join("; ") : "Nothing to work out — it's already a single number",
    count: `${steps.length} operation${steps.length === 1 ? "" : "s"}`,
    rule: "Brackets → Exponents → × and ÷ left to right → + and − left to right",
  };
};

// ------------------------------------------------------------------ repeating decimal to fraction
export const RD_MODES = ["Type it with brackets, e.g. 0.1(6) or 2.(142857)", "Enter the parts separately"];
export const repeatingDecimal: Calc = (v) => {
  let neg = false, I = "0", N = "", R = "";
  if (pick(v.mode, 2) === 1) {
    I = txt(v, "whole").trim().replace(/[,\s]/g, "") || "0"; N = txt(v, "nonrep").trim(); R = txt(v, "rep").trim();
    if (I.startsWith("-") || I.startsWith("−")) { neg = true; I = I.slice(1) || "0"; }
    if (!/^\d+$/.test(I) || !/^\d*$/.test(N) || !/^\d+$/.test(R)) throw new InputError("Use digits only: whole part, non-repeating digits (may be empty) and the repeating block.");
  } else {
    const s = txt(v, "decimal").trim().replace(/[,\s]/g, "").replace(/^−/, "-").replace(/\[/g, "(").replace(/\]/g, ")");
    let m = s.match(/^(-?)(\d*)\.(\d*)\((\d+)\)$/);
    const term = s.match(/^(-?)(\d*)\.?(\d*)$/);
    if (m) { neg = m[1] === "-"; I = m[2] || "0"; N = m[3]; R = m[4]; }
    else if (term && (term[2] || term[3])) { neg = term[1] === "-"; I = term[2] || "0"; N = term[3]; R = "0"; }
    else {
      m = s.match(/^(-?)(\d*)\.(\d+)(?:\.{3}|…)$/);
      if (!m) throw new InputError("Write the repeating part in brackets — 0.(3), 0.1(6), 1.2(45) — or end with ... like 0.1666...");
      neg = m[1] === "-"; I = m[2] || "0";
      const d = m[3];
      // Shortest block that repeats at least twice at the end of the digits shown.
      let found = false;
      for (let p = 1; p <= Math.floor(d.length / 2) && !found; p++) {
        const blk = d.slice(d.length - p);
        let start = d.length - p;
        while (start - p >= 0 && d.slice(start - p, start) === blk) start -= p;
        if (d.length - start >= 2 * p) {
          // Slide the block left while the digit before it matches its last digit (0.1666 → 1 | 6).
          let st = start, b = blk;
          while (st > 0 && d[st - 1] === b[b.length - 1]) { b = b[b.length - 1] + b.slice(0, -1); st--; }
          N = d.slice(0, st); R = b; found = true;
        }
      }
      if (!found) throw new InputError("Can't see a repeating block — show it at least twice (0.142857142857...) or use brackets: 0.(142857).");
    }
  }
  if (R.length > 60 || N.length > 60) throw new InputError("Keep the repeating and non-repeating parts under 60 digits each.");
  const n = N.length, r = R.length;
  const all = BigInt(I + N + R), front = BigInt(I + N);
  let num = all - front, den = pow10(n) * (pow10(r) - B1);
  if (/^9+$/.test(R)) { /* 0.(9) = 1 — handled naturally by the formula */ }
  const g = gcdB(num, den); num /= g; den /= g;
  const sgn = neg && num !== B0 ? "−" : "";
  const whole = num / den, rem = num % den;
  const terminating = R === "0";
  const shown = terminating ? `${sgn}${I}${N ? "." + N : ""}` : `${sgn}${I}.${N}(${R})`;
  const xa = `${BigInt(I)}.${N}${R}${R}…`;
  const big = `10^${n + r} x = ${group(BigInt(I + N + R).toString())}.${R}${R}…`, small = n ? `10^${n} x = ${group(BigInt(I + N).toString())}.${R}${R}…` : `x = ${BigInt(I)}.${R}${R}…`;
  return {
    fraction: `${sgn}${num}/${den}`,
    mixed: whole && rem ? `${sgn}${whole} ${rem}/${den}` : rem ? `${sgn}${rem}/${den}` : `${sgn}${whole}`,
    notation: terminating ? `${shown} — a terminating decimal (no repeating part)` : `${shown} — ${N ? `${N} doesn't repeat, then ` : ""}${R} repeats forever`,
    steps: terminating ? `${shown} = ${group(BigInt(I + N).toString())} / ${group(pow10(n).toString())}; Simplify by ${gcdB(BigInt(I + N), pow10(n))} → ${num}/${den}` : `Let x = ${xa}; ${big}; ${small}; Subtract: (10^${n + r} − 10^${n}) x = ${group(all.toString())} − ${group(front.toString())} = ${group((all - front).toString())}; x = ${group((all - front).toString())} / ${group((pow10(n) * (pow10(r) - B1)).toString())}; Simplify by ${g} → ${num}/${den}`,
    decimal: `${sgn}${(Number(num) / Number(den)).toPrecision(15).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")}`,
    check: `${num} ÷ ${den} = ${shown}`,
  };
};
export const passiveIncome: Calc = (v) => {
  const mode = pick(v.mode, 2);
  const y = num(v.yield, 4.5) / 100, tax = num(v.tax, 15) / 100, inf = num(v.inflation, 3) / 100;
  if (!(y > 0)) throw new InputError("Enter a yield above 0% (for example 4.5% for a high-yield savings account).");
  if (tax < 0 || tax >= 1) throw new InputError("Tax rate must be 0–99%.");
  const net = y * (1 - tax), realNet = net - inf;
  let capital: number, annual: number;
  if (mode === 0) {
    const target = num(v.target, 3000);
    if (!(target > 0)) throw new InputError("Enter the monthly income you want.");
    annual = target * 12; capital = annual / net;
  } else {
    capital = num(v.balance, 500000);
    if (!(capital > 0)) throw new InputError("Enter your balance.");
    annual = capital * net;
  }
  const gross = capital * y;
  const safe = realNet > 0 ? capital * realNet : 0;
  const capProtected = realNet > 0 ? annual / realNet : Infinity;
  // Time to reach the capital from current savings + monthly contributions.
  const have = num(v.have, 50000), add = num(v.add, 1000), g = num(v.growth, 7) / 100, mg = Math.pow(1 + g, 1 / 12) - 1;
  let reach = "Enter current savings or a monthly contribution";
  if (have >= capital) reach = "You already have enough";
  else if (have > 0 || add > 0) {
    let bal = have, m = 0;
    while (bal < capital && m < 1200) { bal = bal * (1 + mg) + add; m++; }
    reach = m >= 1200 ? "More than 100 years at this rate" : `${Math.floor(m / 12)} years ${m % 12} months (saving ${money(add, "$", 0)}/month at ${(g * 100).toFixed(1)}% growth)`;
  }
  return {
    capital: mode === 0 ? money(capital, "$", 0) : money(capital, "$", 0) + " (your balance)",
    monthly: money(annual / 12),
    annual: money(annual, "$", 0),
    gross: `${money(gross, "$", 0)} a year before ${(tax * 100).toFixed(0)}% tax`,
    real: realNet > 0
      ? (mode === 0 ? `${money(capProtected, "$", 0)} keeps the principal growing with ${(inf * 100).toFixed(1)}% inflation` : `${money(safe / 12)} a month if you reinvest enough to keep up with ${(inf * 100).toFixed(1)}% inflation`)
      : `The after-tax yield (${(net * 100).toFixed(2)}%) doesn't beat ${(inf * 100).toFixed(1)}% inflation, so the principal loses buying power`,
    reach,
    rate: `${(y * 100).toFixed(2)}% yield → ${(net * 100).toFixed(2)}% after tax → ${(realNet * 100).toFixed(2)}% after inflation`,
  };
};

export const mtfCustomCalculators: Record<string, Calc> = {
  "long-multiplication-calculator": longMultiplication,
  "long-addition-subtraction-calculator": longAdditionSubtraction,
  "order-of-operations-calculator": orderOfOperations,
  "repeating-decimal-to-fraction-calculator": repeatingDecimal,
  "passive-income-calculator": passiveIncome,
};
