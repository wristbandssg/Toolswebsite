/**
 * Batch: Tech keyword check (15 Nov 2026) — everyday calculators the site was missing, 9 tools:
 * Science > Scientific & Graphing (basic calculator, big number, 3D graphing) and Science > Math
 * (percentage, fraction, time, date, age, factorial).
 *
 * Near-namesakes kept apart on purpose:
 *  - basic-calculator = everyday 4-function maths and an adding-machine tape. scientific-calculator
 *    (existing) does functions; big-number-calculator = exact integer arithmetic of any size.
 *  - 3d-graphing-calculator = z = f(x, y) surfaces. graphing-calculator (existing) is y = f(x).
 *  - percentage-calculator = the six everyday percentage questions. percentage-change-calculator,
 *    percent-error and percent-difference (existing) are single-purpose and not rebuilt.
 *  - time-calculator = hours:minutes arithmetic and clock-time spans. date-calculator = calendar
 *    days. age-calculator = exact age from a birth date. hours-worked (existing) = weekly timesheet.
 *
 * Dates arrive as whole days since 1970-01-01 UTC (CalculatorWidget convention).
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, nfmt, sig, dayText, dayParts, dayNum, dateIn, parseClock, clockText } from "./trv-core";
import { compileFn, evalExpr, gammaFn } from "./sci-math-core";

const pl = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const tidy = (s: string) => s.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/,/g, "");
const show = (x: number) => (Number.isInteger(x) && Math.abs(x) < 1e15 ? nfmt(x) : Math.abs(x) >= 1e15 || (Math.abs(x) < 1e-6 && x !== 0) ? x.toExponential(10).replace(/\.?0+e/, "e") : nfmt(Number(x.toPrecision(12)), 10).replace(/\.?0+$/, ""));
export const basic: Calc = (v) => {
  if (pick(v.mode, 2) === 1) {
    const items = txt(v, "expr").split(/[\n;]+|,(?=\s)|\s+(?=[+-]?\d)/).map((s) => s.trim().replace(/,/g, "")).filter(Boolean);
    const nums = items.map((s) => { const n = Number(s.replace(/^\+/, "")); if (!Number.isFinite(n)) throw new InputError(`"${s}" isn't a number.`); return n; });
    if (!nums.length) throw new InputError("Enter numbers separated by spaces, commas or semicolons.");
    let run = 0;
    const tape = nums.map((n) => { run += n; return `${n < 0 ? "−" : "+"} ${show(Math.abs(n)).padStart(12)}   = ${show(run)}`; }).join("\n");
    return { result: show(run), sci: run.toExponential(6), tape, count: nums.length, avg: show(run / nums.length), expr: `${nums.length} numbers` };
  }
  const raw = txt(v, "expr");
  if (!raw) throw new InputError("Type a calculation like 12.5 + 7 × 3.");
  const e = tidy(raw).replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
  const x = evalExpr(e);
  return { result: show(x), sci: x.toExponential(6), tape: `${raw} = ${show(x)}`, count: 1, avg: show(x), expr: raw };
};

// ------------------------------------------------------------------ big number (BigInt)
export const BIG_OPS = ["Add (+)", "Subtract (−)", "Multiply (×)", "Divide (quotient & remainder)", "Power (a^b)", "Modulo (a mod b)", "GCD & LCM"];
function bigOf(s: string) {
  const t = s.trim().replace(/[,_\s]/g, "");
  if (!/^-?\d+$/.test(t)) throw new InputError(`"${s.slice(0, 30)}" must be a whole number (digits only).`);
  return BigInt(t);
}
const gcd = (a: bigint, b: bigint): bigint => { a = a < BigInt(0) ? -a : a; b = b < BigInt(0) ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
function digitsText(n: bigint) {
  const s = n.toString();
  const neg = s.startsWith("-"), d = neg ? s.slice(1) : s;
  const grouped = d.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "−" : "") + (d.length > 1200 ? `${grouped.slice(0, 600)} … ${grouped.slice(-600)}` : grouped);
}
export const bigNumber: Calc = (v) => {
  const a = bigOf(txt(v, "a")), b = bigOf(txt(v, "b"));
  const op = pick(v.op, BIG_OPS.length);
  const Z = BigInt(0);
  let r: bigint, extra = "—";
  if ((op === 3 || op === 5) && b === Z) throw new InputError("Can't divide by zero.");
  if (op === 0) r = a + b; else if (op === 1) r = a - b; else if (op === 2) r = a * b;
  else if (op === 3) { r = a / b; extra = `remainder ${digitsText(a % b)}`; }
  else if (op === 4) {
    if (b < Z) throw new InputError("Use a non-negative exponent.");
    const est = Number(b) * Math.log10(Math.max(2, Math.abs(Number(a.toString().slice(0, 15))) * 10 ** Math.max(0, a.toString().replace("-", "").length - 15)));
    if (est > 20000) throw new InputError("That power would have more than 20,000 digits — try a smaller exponent.");
    r = a ** b;
  } else if (op === 5) { r = ((a % b) + b) % b; }
  else { r = gcd(a, b); extra = `LCM ${a === Z || b === Z ? "0" : digitsText((a / r) * b < Z ? -(a / r) * b : (a / r) * b)}`; }
  const s = r.toString().replace("-", "");
  return { result: digitsText(r), digits: s.length, sci: s.length > 1 ? `${r < Z ? "−" : ""}${s[0]}.${s.slice(1, 8)} × 10^${s.length - 1}` : s, extra, sum: [...s].reduce((t, c) => t + Number(c), 0) };
};

// ------------------------------------------------------------------ 3D graphing (z = f(x, y))
export const graph3d: Calc = (v) => {
  const expr = tidy(txt(v, "fxy"));
  const f = compileFn(expr, ["x", "y"]);
  const lo = num(v.min, -3), hi = num(v.max, 3);
  if (hi <= lo) throw new InputError("The maximum must be larger than the minimum.");
  const safe = (x: number, y: number) => { try { const z = f(x, y); return Number.isFinite(z) ? z : NaN; } catch { return NaN; } };
  let mn = Infinity, mx = -Infinity, at = "", atMx = "";
  const N = 60;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const x = lo + ((hi - lo) * i) / N, y = lo + ((hi - lo) * j) / N, z = safe(x, y);
    if (z < mn) { mn = z; at = `(${sig(x, 4)}, ${sig(y, 4)})`; }
    if (z > mx) { mx = z; atMx = `(${sig(x, 4)}, ${sig(y, 4)})`; }
  }
  const x0 = num(v.x0, 1), y0 = num(v.y0, 1), h = 1e-4;
  const z0 = safe(x0, y0);
  const fx = (safe(x0 + h, y0) - safe(x0 - h, y0)) / (2 * h), fy = (safe(x0, y0 + h) - safe(x0, y0 - h)) / (2 * h);
  const ticks = [0, 1, 2, 3, 4, 5, 6].map((k) => lo + ((hi - lo) * k) / 6);
  const head = "   y\\x " + ticks.map((t) => sig(t, 3).toString().padStart(10)).join("");
  const rows = ticks.slice().reverse().map((y) => sig(y, 3).toString().padStart(7) + ticks.map((x) => { const z = safe(x, y); return (Number.isFinite(z) ? sig(Math.abs(z) < 1e-12 ? 0 : z, 4).toString() : "—").padStart(10); }).join(""));
  return { z: Number.isFinite(z0) ? sig(z0, 8) : "undefined", grad: `∂z/∂x = ${sig(fx, 6)}, ∂z/∂y = ${sig(fy, 6)}`, min: Number.isFinite(mn) ? `${sig(mn, 6)} at ${at}` : "—", max: Number.isFinite(mx) ? `${sig(mx, 6)} at ${atMx}` : "—", table: [head, ...rows].join("\n"), shape: Math.abs(fx) < 1e-6 && Math.abs(fy) < 1e-6 ? "Flat point (critical point) at your (x, y)" : `Steepest uphill direction: ${sig((Math.atan2(fy, fx) * 180) / Math.PI, 4)}° from the +x axis` };
};

// ------------------------------------------------------------------ percentage
export const PCT_MODES = ["What is A% of B?", "A is what percent of B?", "A is B% of what number?", "Percent change from A to B", "Increase A by B%", "Decrease A by B%"];
export const percentage: Calc = (v) => {
  const m = pick(v.mode, 6), a = num(v.a, 15), b = num(v.b, 200);
  let r: number, text: string;
  switch (m) {
    case 0: r = (a / 100) * b; text = `${show(a)}% of ${show(b)} = ${show(r)}`; break;
    case 1: if (b === 0) throw new InputError("B can't be 0."); r = (a / b) * 100; text = `${show(a)} is ${show(r)}% of ${show(b)}`; break;
    case 2: if (b === 0) throw new InputError("The percentage can't be 0."); r = a / (b / 100); text = `${show(a)} is ${show(b)}% of ${show(r)}`; break;
    case 3: if (a === 0) throw new InputError("The starting value can't be 0."); r = ((b - a) / Math.abs(a)) * 100; text = `From ${show(a)} to ${show(b)} is ${r >= 0 ? "an increase" : "a decrease"} of ${show(sig(Math.abs(r), 8))}%`; break;
    case 4: r = a * (1 + b / 100); text = `${show(a)} + ${show(b)}% = ${show(r)}`; break;
    default: r = a * (1 - b / 100); text = `${show(a)} − ${show(b)}% = ${show(r)}`;
  }
  const isPct = m === 1 || m === 3;
  return { result: isPct ? `${show(sig(r, 8))}%` : show(sig(r, 12)), text, raw: sig(r, 12), formula: ["A ÷ 100 × B", "A ÷ B × 100", "A ÷ (B ÷ 100)", "(B − A) ÷ |A| × 100", "A × (1 + B ÷ 100)", "A × (1 − B ÷ 100)"][m] };
};

// ------------------------------------------------------------------ fraction
const igcd = (a: number, b: number): number => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
function parseFrac(s: string): [number, number] {
  const t = s.trim();
  let m = t.match(/^(-?)(\d+)\s+(\d+)\/(\d+)$/);
  if (m) { const w = Number(m[2]), n = Number(m[3]), d = Number(m[4]); if (!d) throw new InputError("A denominator can't be 0."); return [(m[1] ? -1 : 1) * (w * d + n), d]; }
  m = t.match(/^(-?\d+)\/(-?\d+)$/);
  if (m) { const d = Number(m[2]); if (!d) throw new InputError("A denominator can't be 0."); return [Number(m[1]) * Math.sign(d), Math.abs(d)]; }
  if (/^-?\d*\.?\d+$/.test(t)) { const dec = (t.split(".")[1] ?? "").length; const d = 10 ** dec; return [Math.round(Number(t) * d), d]; }
  throw new InputError(`"${s}" isn't a fraction — use 3/4, 1 2/3 or 0.75.`);
}
const red = ([n, d]: [number, number]): [number, number] => { const g = igcd(n, d); return [n / g, d / g]; };
const fracText = ([n, d]: [number, number]) => (d === 1 ? `${n}` : `${n}/${d}`);
const mixed = ([n, d]: [number, number]) => { if (d === 1 || Math.abs(n) < d) return fracText([n, d]); const w = Math.trunc(n / d), r = Math.abs(n % d); return r ? `${w} ${r}/${d}` : `${w}`; };
export const fraction: Calc = (v) => {
  const a = parseFrac(txt(v, "a")), op = pick(v.op, 5);
  let r: [number, number], steps: string;
  if (op === 4) { r = red(a); steps = `Divide top and bottom by ${igcd(a[0], a[1])}`; }
  else {
    const b = parseFrac(txt(v, "b"));
    if (op <= 1) {
      const L = (a[1] * b[1]) / igcd(a[1], b[1]);
      const an = a[0] * (L / a[1]), bn = b[0] * (L / b[1]);
      r = red([op === 0 ? an + bn : an - bn, L]);
      steps = `Common denominator ${L}: ${an}/${L} ${op === 0 ? "+" : "−"} ${bn}/${L} = ${op === 0 ? an + bn : an - bn}/${L}`;
    } else if (op === 2) { r = red([a[0] * b[0], a[1] * b[1]]); steps = `Multiply tops and bottoms: ${a[0] * b[0]}/${a[1] * b[1]}`; }
    else { if (b[0] === 0) throw new InputError("Can't divide by zero."); const n = a[0] * b[1] * Math.sign(b[0]), d = a[1] * Math.abs(b[0]); r = red([n, d]); steps = `Flip the second and multiply: ${fracText(a)} × ${fracText([b[1] * Math.sign(b[0]), Math.abs(b[0])])} = ${n}/${d}`; }
  }
  return { result: fracText(r), mixed: mixed(r), decimal: show(r[0] / r[1]), pct: `${show((r[0] / r[1]) * 100)}%`, steps };
};

// ------------------------------------------------------------------ time (hours & minutes)
function parseDur(s: string): number {
  const t = s.trim();
  const neg = t.startsWith("-") || t.startsWith("−");
  const u = t.replace(/^[-−+]/, "");
  let sec: number;
  if (/^\d+(:\d{1,2}){1,2}$/.test(u)) { const p = u.split(":").map(Number); sec = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 3600 + p[1] * 60; }
  else if (/[hms]/i.test(u)) {
    const h = u.match(/(\d+(?:\.\d+)?)\s*h/i), m = u.match(/(\d+(?:\.\d+)?)\s*m(?!s)/i), s2 = u.match(/(\d+(?:\.\d+)?)\s*s/i);
    if (!h && !m && !s2) throw new InputError(`"${s}" isn't a duration.`);
    sec = (h ? Number(h[1]) * 3600 : 0) + (m ? Number(m[1]) * 60 : 0) + (s2 ? Number(s2[1]) : 0);
  } else if (/^\d*\.?\d+$/.test(u)) sec = Number(u) * 3600;
  else throw new InputError(`"${s}" isn't a duration — use 2:30, 1h 45m or 1.5 (hours).`);
  return neg ? -sec : sec;
}
const hms = (sec: number) => { const neg = sec < 0; sec = Math.round(Math.abs(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return `${neg ? "−" : ""}${h}:${String(m).padStart(2, "0")}${s ? `:${String(s).padStart(2, "0")}` : ""}`; };
export const timeCalc: Calc = (v) => {
  const m = pick(v.mode, 4);
  let sec: number, clock = "—";
  if (m === 0) {
    const parts = txt(v, "list").replace(/\s*([+−-])\s*/g, ",$1").split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) throw new InputError("List durations like 2:30, 1:45, -0:20.");
    sec = parts.reduce((s, p) => s + parseDur(p), 0);
  } else if (m === 1) {
    const a = parseClock(txt(v, "start"), "Start time"), b = parseClock(txt(v, "end"), "End time");
    let d = b - a; if (d < 0) d += 1440;
    sec = d * 60; clock = d === b - a ? "Same day" : "Ends the next day (overnight)";
  } else {
    const a = parseClock(txt(v, "start"), "Start time");
    const d = parseDur(txt(v, "end")) / 60;
    const t = a + (m === 2 ? d : -d);
    const days = Math.floor(t / 1440);
    clock = `${clockText(((t % 1440) + 1440) % 1440)}${days > 0 ? ` (+${days} day${days > 1 ? "s" : ""})` : days < 0 ? ` (${days} day)` : ""}`;
    sec = d * 60;
  }
  return { total: hms(sec), decimal: sig(sec / 3600, 6), minutes: sig(sec / 60, 8), seconds: Math.round(sec), clock, days: Math.abs(sec) >= 86400 ? `${Math.floor(Math.abs(sec) / 86400)} d ${hms(Math.abs(sec) % 86400)}` : "—" };
};
export const DATE_UNITS = ["Days", "Weeks", "Months", "Years"];
function addMonths(day: number, months: number) {
  const { y, m, d } = dayParts(day);
  const t = y * 12 + (m - 1) + months, ny = Math.floor(t / 12), nm = (t % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return dayNum(ny, nm, Math.min(d, last));
}
function ymd(a: number, b: number) {
  let months = 0;
  while (addMonths(a, months + 1) <= b) months++;
  const rest = b - addMonths(a, months);
  return { y: Math.floor(months / 12), m: months % 12, d: rest };
}
export const dateCalc: Calc = (v) => {
  const m = pick(v.mode, 4);
  const d1 = dateIn(v, "d1", 20408), d2 = dateIn(v, "d2", 20408 + 100);
  if (m === 1 || m === 2) {
    const n = Math.round(num(v.n, 30)) * (m === 2 ? -1 : 1), u = pick(v.unit, 4);
    const r = u === 0 ? d1 + n : u === 1 ? d1 + 7 * n : u === 2 ? addMonths(d1, n) : addMonths(d1, 12 * n);
    return { result: dayText(r), days: r - d1, weeks: `${sig((r - d1) / 7, 4)} weeks`, ymd: `${dayText(d1)} ${m === 1 ? "+" : "−"} ${Math.abs(n)} ${DATE_UNITS[u].toLowerCase()}`, weekday: dayText(r).split(",")[0], business: "—" };
  }
  const lo = Math.min(d1, d2), hi = Math.max(d1, d2);
  const incl = pick(v.incl, 2) === 1 ? 1 : 0;
  let bus = 0;
  for (let d = lo; d < hi + incl; d++) { const w = ((d % 7) + 7 + 4) % 7; if (w !== 0 && w !== 6) bus++; }
  const span = ymd(lo, hi);
  const days = hi - lo + incl;
  return { result: m === 3 ? `${nfmt(bus)} business days` : `${nfmt(days)} days`, days, weeks: `${pl(Math.floor(days / 7), "week")} ${pl(days % 7, "day")}`, ymd: `${pl(span.y, "year")}, ${pl(span.m, "month")}, ${pl(span.d, "day")}`, weekday: `${dayText(lo).split(",")[0]} → ${dayText(hi).split(",")[0]}`, business: `${nfmt(bus)} weekdays (Mon–Fri, holidays not removed)` };
};

// ------------------------------------------------------------------ age
export const age: Calc = (v) => {
  const b = dateIn(v, "birth", 7305), now = dateIn(v, "asof", Math.floor(Date.now() / 86400000));
  if (b > now) throw new InputError("The birth date is after the 'as of' date.");
  const s = ymd(b, now);
  const { m, d } = dayParts(b), { y } = dayParts(now);
  let next = dayNum(y, m, Math.min(d, new Date(Date.UTC(y, m, 0)).getUTCDate()));
  if (next < now) next = dayNum(y + 1, m, Math.min(d, new Date(Date.UTC(y + 1, m, 0)).getUTCDate()));
  const days = now - b;
  return { age: `${pl(s.y, "year")}, ${pl(s.m, "month")}, ${pl(s.d, "day")}`, years: s.y, months: s.y * 12 + s.m, weeks: `${nfmt(Math.floor(days / 7))} weeks ${pl(days % 7, "day")}`, days: nfmt(days), hours: nfmt(days * 24), next: next - now === 0 ? "Today!" : `${next - now} days — ${dayText(next)} (turning ${dayParts(next).y - dayParts(b).y})`, born: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][((b % 7) + 7 + 4) % 7] };
};

// ------------------------------------------------------------------ factorial
export const factorial: Calc = (v) => {
  const n = num(v.n, 20);
  if (n < 0) throw new InputError("Factorials are defined for n ≥ 0 (for negative non-integers use the gamma function).");
  if (!Number.isInteger(n)) {
    if (n > 170) throw new InputError("Non-integer factorials are shown up to 170.");
    const g = gammaFn(n + 1);
    return { result: sig(g, 12).toString(), digits: "—", zeros: "—", sci: g.toExponential(8), dbl: "—", note: `Γ(${n} + 1) — the gamma function extends n! to non-integers` };
  }
  if (n > 10000) throw new InputError("Enter n up to 10,000.");
  let f = BigInt(1);
  for (let i = 2; i <= n; i++) f *= BigInt(i);
  let df = BigInt(1);
  if (n <= 3000) for (let i = n; i > 1; i -= 2) df *= BigInt(i);
  const s = f.toString();
  let z = 0;
  for (let p = 5; p <= n; p *= 5) z += Math.floor(n / p);
  const g = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return { result: g.length > 1400 ? `${g.slice(0, 700)} … ${g.slice(-700)}` : g, digits: s.length, zeros: z, sci: s.length > 1 ? `${s[0]}.${s.slice(1, 9)} × 10^${s.length - 1}` : s, dbl: n <= 3000 ? (df.toString().length > 60 ? `${df.toString().slice(0, 20)}… (${df.toString().length} digits)` : df.toString()) : "—", note: `${n}! = ${n <= 12 ? [...Array(n)].map((_, i) => n - i).join(" × ") || "1" : `${n} × ${n - 1} × … × 1`}` };
};

export const techGenCustomCalculators: Record<string, Calc> = {
  "basic-calculator": basic,
  "big-number-calculator": bigNumber,
  "3d-graphing-calculator": graph3d,
  "percentage-calculator": percentage,
  "fraction-calculator": fraction,
  "time-calculator": timeCalc,
  "date-calculator": dateCalc,
  "age-calculator": age,
  "factorial-calculator": factorial,
};
