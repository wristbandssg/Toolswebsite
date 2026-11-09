/**
 * Batch: "Science Calculators" → Math Calculators (discrete math, logic, number theory & computing — 28 tools).
 *
 * Boolean expressions use a small hand-written parser (AND: · & * or juxtaposition, OR: + |,
 * NOT: ' ! ~ ¬, XOR: ^ ⊕), minimised with the Quine-McCluskey method plus a greedy prime-implicant
 * cover (exact for the small functions people enter). Big-number work (RSA, modular powers) uses
 * BigInt. IEEE 754 encodings come straight from a DataView. CRC parameters follow the standard
 * catalogue (CRC-8/SMBUS, CRC-16/CCITT-FALSE, CRC-16/MODBUS, CRC-32/ISO-HDLC). Bloom filter:
 * m = −n ln p / (ln 2)², k = (m/n) ln 2. Bessel J by its power series, Y₀/Y₁ by their series and
 * Yₙ by recurrence. See prisma/create-sci-disc-calculators.ts for the copy.
 */

import { type SciCalculator, InputError, txt, num, pos, pick, fmt, sig, compileFn, listOf, gammaFn, lgamma, erf, normInv, evalExpr } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);

// ---------- Boolean algebra ----------
type BNode = { t: "v"; n: string } | { t: "c"; v: boolean } | { t: "not"; a: BNode } | { t: "and" | "or" | "xor"; a: BNode; b: BNode };
function parseBool(src: string): { node: BNode; vars: string[] } {
  const s0 = src.replace(/\s+/g, "").replace(/AND/gi, "&").replace(/XOR/gi, "^").replace(/OR/gi, "+").replace(/NOT/gi, "!").replace(/[·*∧]/g, "&").replace(/[|∨]/g, "+").replace(/[~¬]/g, "!").replace(/⊕/g, "^");
  if (!s0) throw new InputError("Enter a Boolean expression, e.g. A'B + AB.");
  if (s0.length > 200) throw new InputError("Expression too long.");
  let i = 0;
  const vars = new Set<string>();
  const peek = () => s0[i];
  const expr = (): BNode => {
    let l = xorE();
    while (peek() === "+") {
      i++;
      l = { t: "or", a: l, b: xorE() };
    }
    return l;
  };
  const xorE = (): BNode => {
    let l = andE();
    while (peek() === "^") {
      i++;
      l = { t: "xor", a: l, b: andE() };
    }
    return l;
  };
  const andE = (): BNode => {
    let l = unary();
    while (peek() === "&" || (peek() && /[A-Za-z01(!]/.test(peek()))) {
      if (peek() === "&") i++;
      l = { t: "and", a: l, b: unary() };
    }
    return l;
  };
  const unary = (): BNode => {
    if (peek() === "!") {
      i++;
      return { t: "not", a: unary() };
    }
    let n = atom();
    while (peek() === "'") {
      i++;
      n = { t: "not", a: n };
    }
    return n;
  };
  const atom = (): BNode => {
    const ch = peek();
    if (ch === "(") {
      i++;
      const e = expr();
      if (peek() !== ")") throw new InputError("Missing a closing bracket.");
      i++;
      return e;
    }
    if (ch === "0" || ch === "1") {
      i++;
      return { t: "c", v: ch === "1" };
    }
    if (ch && /[A-Za-z]/.test(ch)) {
      i++;
      const name = ch.toUpperCase();
      vars.add(name);
      return { t: "v", n: name };
    }
    throw new InputError(`Unexpected "${ch ?? "end"}" in the expression.`);
  };
  const node = expr();
  if (i < s0.length) throw new InputError(`Unexpected "${s0[i]}" in the expression.`);
  const vs = [...vars].sort();
  if (vs.length > 8) throw new InputError("Up to 8 variables.");
  return { node, vars: vs };
}
const evalB = (n: BNode, env: Record<string, boolean>): boolean => {
  switch (n.t) {
    case "v":
      return env[n.n];
    case "c":
      return n.v;
    case "not":
      return !evalB(n.a, env);
    case "and":
      return evalB(n.a, env) && evalB(n.b, env);
    case "or":
      return evalB(n.a, env) || evalB(n.b, env);
    default:
      return evalB(n.a, env) !== evalB(n.b, env);
  }
};
const mintermsOf = (node: BNode, vars: string[]) => {
  const ms: number[] = [];
  for (let m = 0; m < 1 << vars.length; m++) {
    const env: Record<string, boolean> = {};
    vars.forEach((vv, k) => (env[vv] = ((m >> (vars.length - 1 - k)) & 1) === 1));
    if (evalB(node, env)) ms.push(m);
  }
  return ms;
};
function qm(minterms: number[], dontCares: number[], n: number): string[] {
  if (!minterms.length) return [];
  if (minterms.length + dontCares.length === 1 << n && dontCares.length === 0) return ["1"];
  type Imp = { bits: string; covers: number[] };
  const toBits = (m: number) => m.toString(2).padStart(n, "0");
  let groups: Imp[] = [...new Set([...minterms, ...dontCares])].map((m) => ({ bits: toBits(m), covers: [m] }));
  const primes: Imp[] = [];
  while (groups.length) {
    const used = new Set<number>();
    const next: Imp[] = [];
    for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
      const a = groups[i].bits, b = groups[j].bits;
      let diff = -1, cnt = 0;
      for (let k = 0; k < n; k++) if (a[k] !== b[k]) {
        cnt++;
        diff = k;
      }
      if (cnt === 1) {
        const bits = a.slice(0, diff) + "-" + a.slice(diff + 1);
        used.add(i);
        used.add(j);
        if (!next.some((x) => x.bits === bits)) next.push({ bits, covers: [...new Set([...groups[i].covers, ...groups[j].covers])] });
      }
    }
    groups.forEach((g, i) => {
      if (!used.has(i) && !primes.some((p) => p.bits === g.bits)) primes.push(g);
    });
    groups = next;
  }
  // cover: essential primes first, then greedy
  const need = new Set(minterms);
  const chosen: Imp[] = [];
  for (const m of minterms) {
    const cov = primes.filter((p) => p.covers.includes(m));
    if (cov.length === 1 && !chosen.includes(cov[0])) chosen.push(cov[0]);
  }
  chosen.forEach((p) => p.covers.forEach((m) => need.delete(m)));
  while (need.size) {
    const best = primes.reduce((p, q) => (q.covers.filter((m) => need.has(m)).length > p.covers.filter((m) => need.has(m)).length || (q.covers.filter((m) => need.has(m)).length === p.covers.filter((m) => need.has(m)).length && q.bits.split("-").length > p.bits.split("-").length) ? q : p));
    chosen.push(best);
    best.covers.forEach((m) => need.delete(m));
  }
  return chosen.map((p) => p.bits);
}
const termText = (bits: string, vars: string[]) => (bits === "1" ? "1" : bits.split("").map((b, k) => (b === "-" ? "" : b === "1" ? vars[k] : vars[k] + "'")).join("") || "1");
export const booleanAlgebra: SciCalculator = (v) => {
  const { node, vars } = parseBool(txt(v, "expr"));
  const ms = mintermsOf(node, vars);
  const sop = ms.length === 0 ? "0" : qm(ms, [], vars.length).map((b) => termText(b, vars)).join(" + ");
  const maxterms = [...Array(1 << vars.length).keys()].filter((m) => !ms.includes(m));
  return { simplified: sop, minterms: `Σm(${ms.join(", ")})`, maxterms: maxterms.length ? `ΠM(${maxterms.join(", ")})` : "none", variables: vars.join(", ") || "none" };
};
export const karnaughMap: SciCalculator = (v) => {
  const n = Math.min(6, Math.max(2, Math.round(pos(v.n, 4))));
  const ms = listOf(v, "minterms", 1).map(Math.round), dcS = txt(v, "dc"), dc = dcS ? listOf(v, "dc", 1).map(Math.round) : [];
  if ([...ms, ...dc].some((m) => m < 0 || m >= 1 << n)) throw new InputError(`Minterms must be between 0 and ${(1 << n) - 1} for ${n} variables.`);
  const vars = ["A", "B", "C", "D", "E", "F"].slice(0, n);
  const sop = qm(ms, dc, n).map((b) => termText(b, vars)).join(" + ") || "0";
  let grid = "";
  if (n === 4 || n === 3 || n === 2) {
    const gray = (k: number) => [0, 1, 3, 2].slice(0, 1 << k);
    const rb = Math.floor(n / 2), cb = n - rb;
    const rows = gray(rb), cols = gray(cb);
    grid = `${vars.slice(0, rb).join("")}\\${vars.slice(rb).join("")}  ` + cols.map((c) => c.toString(2).padStart(cb, "0")).join("  ") + "\n";
    for (const r of rows) {
      grid += `${r.toString(2).padStart(rb, "0").padEnd(rb + cb + 3)}` + cols.map((c) => {
        const m = (r << cb) | c;
        return (ms.includes(m) ? "1" : dc.includes(m) ? "X" : "0").padEnd(cb + 2);
      }).join("") + "\n";
    }
  }
  return { simplified: sop, map: grid.trimEnd() || "map shown for 2–4 variables", variables: vars.join(", ") };
};
export const truthTable: SciCalculator = (v) => {
  const a = parseBool(txt(v, "expr")), e2 = txt(v, "expr2");
  const b = e2 ? parseBool(e2) : null;
  const vars = [...new Set([...a.vars, ...(b ? b.vars : [])])].sort();
  const rows: string[] = [vars.join(" ") + " | F" + (b ? " | G" : "")];
  let trues = 0, same = true;
  for (let m = 0; m < 1 << vars.length; m++) {
    const env: Record<string, boolean> = {};
    vars.forEach((vv, k) => (env[vv] = ((m >> (vars.length - 1 - k)) & 1) === 1));
    const f = evalB(a.node, env), g = b ? evalB(b.node, env) : false;
    if (f) trues++;
    if (b && f !== g) same = false;
    if (m < 64) rows.push(vars.map((vv) => (env[vv] ? "1" : "0").padEnd(vv.length)).join(" ") + " | " + (f ? 1 : 0) + (b ? " | " + (g ? 1 : 0) : ""));
  }
  const total = 1 << vars.length;
  return { kind: trues === total ? 0 : trues === 0 ? 1 : 2, table: rows.join("\n"), equivalent: b ? (same ? 0 : 1) : 2, trueRows: trues };
};
export const TT_KIND = ["Tautology (always true)", "Contradiction (always false)", "Contingency (sometimes true)"];
export const EQUIV = ["Logically equivalent", "Not equivalent", "— (enter a second expression to compare)"];

// ---------- Number theory ----------
const factorize = (n: number) => {
  const f: [number, number][] = [];
  for (let p = 2; p * p <= n; p += p === 2 ? 1 : 2) {
    let e = 0;
    while (n % p === 0) {
      n /= p;
      e++;
    }
    if (e) f.push([p, e]);
  }
  if (n > 1) f.push([n, 1]);
  return f;
};
export const primeFactorization: SciCalculator = (v) => {
  const n = Math.round(pos(v.n, 360));
  if (n < 2 || n > 1e15) throw new InputError("Enter a whole number from 2 to 10¹⁵.");
  const f = factorize(n);
  const nd = f.reduce((acc, [, e]) => acc * (e + 1), 1);
  const sumd = f.reduce((acc, [p, e]) => acc * ((p ** (e + 1) - 1) / (p - 1)), 1);
  return { factorization: f.map(([p, e]) => (e > 1 ? `${p}^${e}` : `${p}`)).join(" × "), isPrime: f.length === 1 && f[0][1] === 1 ? 0 : 1, divisors: nd, sumDivisors: sumd, tree: f.flatMap(([p, e]) => Array(e).fill(p)).join(" × ") };
};
export const PRIME = ["Prime", "Composite"];
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
export const euclidean: SciCalculator = (v) => {
  let a = Math.round(num(v.a, 240)), b = Math.round(num(v.b, 46));
  const a0 = a, b0 = b;
  const rows: string[] = [];
  let [x0, x1, y0, y1] = [1, 0, 0, 1];
  while (b !== 0) {
    const q = Math.floor(a / b), r = a - q * b;
    rows.push(`${a} = ${q} × ${b} + ${r}`);
    [a, b] = [b, r];
    [x0, x1] = [x1, x0 - q * x1];
    [y0, y1] = [y1, y0 - q * y1];
  }
  const g = Math.abs(a);
  return { gcd: g, lcm: g ? Math.abs(a0 * b0) / g : 0, bezout: `${a0}·(${x0 * Math.sign(a)}) + ${b0}·(${y0 * Math.sign(a)}) = ${g}`, steps: rows.join("\n") };
};
const modpow = (b: bigint, e: bigint, m: bigint) => {
  let r = BigInt(1);
  b %= m;
  if (b < 0) b += m;
  while (e > 0) {
    if (e & BigInt(1)) r = (r * b) % m;
    b = (b * b) % m;
    e >>= BigInt(1);
  }
  return r;
};
const big = (x: number, name: string) => {
  if (!Number.isFinite(x) || !Number.isInteger(x)) throw new InputError(`${name} must be a whole number.`);
  return BigInt(Math.round(x));
};
export const modExp: SciCalculator = (v) => {
  const b = big(num(v.b, 4), "Base"), e = big(pos(v.e, 13), "Exponent"), m = big(pos(v.m, 497), "Modulus");
  if (m <= 0) throw new InputError("The modulus must be positive.");
  return { result: modpow(b, e, m).toString(), formula: `${b}^${e} mod ${m}`, method: "Square-and-multiply (fast modular exponentiation)" };
};
const egcd = (a: bigint, b: bigint): [bigint, bigint, bigint] => {
  if (b === BigInt(0)) return [a, BigInt(1), BigInt(0)];
  const [g, x, y] = egcd(b, a % b);
  return [g, y, x - (a / b) * y];
};
export const rsa: SciCalculator = (v) => {
  const p = big(pos(v.p, 61), "p"), q = big(pos(v.q, 53), "q"), e = big(pos(v.e, 17), "e"), m = big(pos(v.msg, 65), "Message");
  const isP = (x: bigint) => {
    if (x < 2) return false;
    for (let d = BigInt(2); d * d <= x; d++) if (x % d === BigInt(0)) return false;
    return true;
  };
  if (!isP(p) || !isP(q)) throw new InputError("p and q must both be prime.");
  const n = p * q, phi = (p - BigInt(1)) * (q - BigInt(1));
  const [g, x] = egcd(e, phi);
  if (g !== BigInt(1)) throw new InputError("e must be coprime to φ(n).");
  const d = ((x % phi) + phi) % phi;
  if (m >= n) throw new InputError("The message must be smaller than n.");
  const c = modpow(m, e, n);
  return { ciphertext: c.toString(), n: n.toString(), phi: phi.toString(), d: d.toString(), decrypted: modpow(c, d, n).toString() };
};
export const totient: SciCalculator = (v) => {
  const n = Math.round(pos(v.n, 36));
  if (n < 1 || n > 1e15) throw new InputError("Enter a whole number from 1 to 10¹⁵.");
  const f = n === 1 ? [] : factorize(n);
  const phi = f.reduce((acc, [p]) => (acc / p) * (p - 1), n);
  return { phi: Math.round(phi), factorization: f.map(([p, e]) => (e > 1 ? `${p}^${e}` : `${p}`)).join(" × ") || "1", formula: `φ(n) = n·Π(1 − 1/p) = ${n}${f.map(([p]) => ` × (1 − 1/${p})`).join("")}` };
};
export const digitalRoot: SciCalculator = (v) => {
  let n = Math.abs(Math.round(num(v.n, 493193)));
  const sumD = (x: number) => String(x).split("").reduce((a, d) => a + Number(d), 0);
  const first = sumD(n);
  let pers = 0;
  while (n >= 10) {
    n = sumD(n);
    pers++;
  }
  return { root: n, persistence: pers, digitSum: first, mod9: `digital root = 1 + (n − 1) mod 9` };
};
export const DISC_OPS = ["a mod n", "Modular inverse of a (mod n)", "Solve a·x ≡ b (mod n)", "gcd & lcm of a and n"];
export const discreteMath: SciCalculator = (v) => {
  const op = pick(v.op, 4), a = Math.round(num(v.a, 17)), n = Math.round(num(v.n, 5)), b = Math.round(num(v.b, 3));
  if (n <= 0) throw new InputError("n must be a positive whole number.");
  const md = (x: number) => ((x % n) + n) % n;
  if (op === 0) return { result: String(md(a)), working: `${a} = ${Math.floor(a / n)} × ${n} + ${md(a)}` };
  if (op === 3) return { result: `gcd = ${gcd(a, n)}, lcm = ${Math.abs(a * n) / gcd(a, n)}`, working: "Euclid's algorithm" };
  const [g, x] = egcd(BigInt(md(a)), BigInt(n));
  if (op === 1) {
    if (g !== BigInt(1)) return { result: "no inverse (a and n aren't coprime)", working: `gcd(${a}, ${n}) = ${g}` };
    const inv = Number(((x % BigInt(n)) + BigInt(n)) % BigInt(n));
    return { result: String(inv), working: `${a} × ${inv} = ${a * inv} ≡ 1 (mod ${n})` };
  }
  const G = Number(g);
  if (b % G !== 0) return { result: "no solution", working: `gcd(${a}, ${n}) = ${G} doesn't divide ${b}` };
  const n2 = n / G;
  const x0 = Number(((x * BigInt(b / G)) % BigInt(n2) + BigInt(n2)) % BigInt(n2));
  return { result: `x ≡ ${x0} (mod ${n2})`, working: `${G} solution${G > 1 ? "s" : ""} mod ${n}: ${Array.from({ length: Math.min(G, 10) }, (_, k) => x0 + k * n2).join(", ")}` };
};

// ---------- Computing ----------
export const BIN_OPS = ["Add", "Subtract", "Multiply", "Divide", "AND", "OR", "XOR"];
export const BASES = ["Binary (base 2)", "Decimal (base 10)", "Hexadecimal (base 16)"];
export const binaryCalc: SciCalculator = (v) => {
  const base = [2, 10, 16][pick(v.base, 3)], op = pick(v.op, 7), bits = Math.min(64, Math.max(4, Math.round(pos(v.bits, 8))));
  const parse = (k: string) => {
    const t = txt(v, k).replace(/[\s_]/g, "").replace(/^0[bx]/i, "");
    const neg = t.startsWith("-");
    const body = neg ? t.slice(1) : t;
    const ok = base === 2 ? /^[01]+$/ : base === 10 ? /^\d+$/ : /^[0-9a-f]+$/i;
    if (!ok.test(body)) throw new InputError(`"${txt(v, k)}" isn't a valid base-${base} number.`);
    const val = BigInt(base === 10 ? body : (base === 2 ? "0b" : "0x") + body);
    return neg ? -val : val;
  };
  const a = parse("a"), b = parse("b");
  let r: bigint, rem = "";
  switch (op) {
    case 0:
      r = a + b;
      break;
    case 1:
      r = a - b;
      break;
    case 2:
      r = a * b;
      break;
    case 3:
      if (b === BigInt(0)) throw new InputError("Can't divide by zero.");
      r = a / b;
      rem = (a % b).toString(2);
      break;
    case 4:
      r = a & b;
      break;
    case 5:
      r = a | b;
      break;
    default:
      r = a ^ b;
  }
  const twos = r < 0 ? ((BigInt(1) << BigInt(bits)) + r).toString(2).padStart(bits, "1") : r.toString(2).padStart(bits, "0");
  return { binary: r.toString(2), decimal: r.toString(10), hex: r.toString(16).toUpperCase(), twos: `${twos.slice(-bits)} (${bits}-bit two's complement)`, remainder: rem || "—" };
};
export const ieee754: SciCalculator = (v) => {
  const x = num(v.x, 0.1);
  const b32 = new DataView(new ArrayBuffer(4)), b64 = new DataView(new ArrayBuffer(8));
  b32.setFloat32(0, x);
  b64.setFloat64(0, x);
  const u32 = b32.getUint32(0), bits32 = u32.toString(2).padStart(32, "0");
  const hi = b64.getUint32(0), lo = b64.getUint32(4), bits64 = hi.toString(2).padStart(32, "0") + lo.toString(2).padStart(32, "0");
  const stored = b32.getFloat32(0);
  return {
    single: `${bits32[0]} ${bits32.slice(1, 9)} ${bits32.slice(9)}`,
    singleHex: "0x" + u32.toString(16).toUpperCase().padStart(8, "0"),
    double: `${bits64[0]} ${bits64.slice(1, 12)} ${bits64.slice(12)}`,
    doubleHex: "0x" + hi.toString(16).toUpperCase().padStart(8, "0") + lo.toString(16).toUpperCase().padStart(8, "0"),
    stored32: stored.toPrecision(12),
    error32: s(stored - x, 6),
  };
};
export const HAMMING_MODE = ["Encode data bits", "Decode / correct a received word"];
export const hamming: SciCalculator = (v) => {
  const mode = pick(v.mode, 2), bitsS = txt(v, "bits").replace(/\s/g, "");
  if (!/^[01]+$/.test(bitsS)) throw new InputError("Enter bits as 0s and 1s.");
  if (mode === 0) {
    const d = bitsS.split("").map(Number);
    let r = 0;
    while (2 ** r < d.length + r + 1) r++;
    const n = d.length + r, code = new Array(n + 1).fill(0);
    let j = 0;
    for (let i = 1; i <= n; i++) if ((i & (i - 1)) !== 0) code[i] = d[j++];
    for (let p = 0; p < r; p++) {
      const pp = 1 << p;
      let x = 0;
      for (let i = 1; i <= n; i++) if (i & pp && i !== pp) x ^= code[i];
      code[pp] = x;
    }
    return { codeword: code.slice(1).join(""), parityBits: r, scheme: `Hamming(${n},${d.length})`, syndrome: "—" };
  }
  const c = [0, ...bitsS.split("").map(Number)], n = c.length - 1;
  let syn = 0;
  for (let i = 1; i <= n; i++) if (c[i]) syn ^= i;
  if (syn && syn <= n) c[syn] ^= 1;
  const data: number[] = [];
  for (let i = 1; i <= n; i++) if ((i & (i - 1)) !== 0) data.push(c[i]);
  return { codeword: syn ? `${c.slice(1).join("")} (bit ${syn} corrected)` : `${c.slice(1).join("")} (no error)`, parityBits: n - data.length, scheme: `data bits: ${data.join("")}`, syndrome: syn };
};
export const CRC_TYPES = ["CRC-32 (zip, Ethernet)", "CRC-16/CCITT-FALSE", "CRC-16/MODBUS", "CRC-8/SMBUS"];
export const crc: SciCalculator = (v) => {
  const t = pick(v.type, 4), hexIn = pick(v.input, 2) === 1, raw = txt(v, "data");
  let bytes: number[];
  if (hexIn) {
    const h = raw.replace(/[\s,]|0x/gi, "");
    if (!/^([0-9a-f]{2})+$/i.test(h)) throw new InputError("Hex input must be an even number of hex digits.");
    bytes = h.match(/../g)!.map((x) => parseInt(x, 16));
  } else bytes = [...new TextEncoder().encode(raw)];
  let c: number;
  if (t === 0) {
    c = 0xffffffff;
    for (const b of bytes) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
    c = (c ^ 0xffffffff) >>> 0;
  } else if (t === 1) {
    c = 0xffff;
    for (const b of bytes) {
      c ^= b << 8;
      for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
    }
  } else if (t === 2) {
    c = 0xffff;
    for (const b of bytes) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xa001 : c >>> 1;
    }
  } else {
    c = 0;
    for (const b of bytes) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff;
    }
  }
  const w = [8, 4, 4, 2][t];
  return { hex: "0x" + c.toString(16).toUpperCase().padStart(w, "0"), decimal: c, bytes: bytes.length };
};
export const CRC_INPUT = ["Text (UTF-8)", "Hex bytes"];
export const COMPLEXITY = ["O(1)", "O(log n)", "O(√n)", "O(n)", "O(n log n)", "O(n²)", "O(n³)", "O(2ⁿ)", "O(n!)"];
const cx = [(n: number) => 1, (n: number) => Math.log2(n), (n: number) => Math.sqrt(n), (n: number) => n, (n: number) => n * Math.log2(n), (n: number) => n * n, (n: number) => n ** 3, (n: number) => 2 ** n, (n: number) => Math.exp(lgamma(n + 1))];
const dur = (sec: number) => (!Number.isFinite(sec) ? "longer than the age of the universe" : sec < 1e-3 ? `${fmt(sec * 1e6, 4)} µs` : sec < 1 ? `${fmt(sec * 1e3, 4)} ms` : sec < 3600 ? `${fmt(sec, 4)} s` : sec < 86400 * 365 ? `${fmt(sec / 3600, 4)} hours` : sec < 4.3e17 ? `${fmt(sec / (86400 * 365), 4)} years` : "longer than the age of the universe");
export const bigO: SciCalculator = (v) => {
  const k = pick(v.cls, 9), n = Math.max(1, pos(v.n, 1000)), ops = pos(v.ops, 1e9) || 1e9;
  const steps = cx[k](n);
  return { steps: Number.isFinite(steps) ? s(steps, 6) : "∞ (too large)", time: dur(steps / ops), comparison: COMPLEXITY.map((name, i) => `${name.padEnd(11)} ${Number.isFinite(cx[i](n)) ? fmt(cx[i](n), 4).padStart(12) : "huge".padStart(12)}  ${dur(cx[i](n) / ops)}`).join("\n") };
};
export const bloom: SciCalculator = (v) => {
  const n = pos(v.n, 1e6), p = pos(v.p, 0.01);
  if (!(p > 0 && p < 1)) throw new InputError("The false-positive rate must be between 0 and 1.");
  const m = Math.ceil((-n * Math.log(p)) / Math.LN2 ** 2), k = Math.max(1, Math.round((m / n) * Math.LN2));
  return { bits: m, bytes: s(m / 8, 8), hashes: k, actualP: s((1 - Math.exp((-k * n) / m)) ** k, 6), bitsPerItem: s(m / n, 6) };
};
export const erasure: SciCalculator = (v) => {
  const k = Math.max(1, Math.round(pos(v.k, 4))), m = Math.max(0, Math.round(pos(v.m, 2))), data = pos(v.data, 100);
  return { efficiency: s((100 * k) / (k + m), 6), raw: s((data * (k + m)) / k, 8), overhead: s((100 * m) / k, 6), tolerance: m, minNodes: k + m, vsReplication: `3× replication would need ${fmt(data * 3)} for 2-failure tolerance` };
};
export const shannon: SciCalculator = (v) => {
  const mode = pick(v.mode, 2), raw = txt(v, "data");
  let p: number[];
  if (mode === 0) {
    const c = listOf(v, "data", 1);
    const t = c.reduce((a, b) => a + b, 0);
    if (!(t > 0)) throw new InputError("Enter positive counts or probabilities.");
    p = c.map((x) => x / t);
  } else {
    if (!raw) throw new InputError("Enter some text.");
    const counts = new Map<string, number>();
    for (const ch of raw) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    p = [...counts.values()].map((c) => c / raw.length);
  }
  const H = -p.filter((x) => x > 0).reduce((acc, x) => acc + x * Math.log2(x), 0);
  const Hmax = Math.log2(p.length);
  return { entropy: s(H, 10), maxEntropy: s(Hmax, 10), efficiency: Hmax ? s((100 * H) / Hmax, 6) : 100, nats: s(H * Math.LN2, 10), symbols: p.length };
};
export const ENTROPY_MODE = ["Counts or probabilities", "Text (character frequencies)"];
export const tfidf: SciCalculator = (v) => {
  const tc = pos(v.tc, 5), terms = pos(v.terms, 100), N = pos(v.N, 10000), df = pos(v.df, 100);
  if (!terms || !N || !df) throw new InputError("Totals and document frequency must be positive.");
  const tf = tc / terms, idf = Math.log(N / df), idfS = Math.log((1 + N) / (1 + df)) + 1;
  return { tfidf: s(tf * idf, 8), tf: s(tf, 8), idf: s(idf, 8), smooth: s(tf * idfS, 8) };
};
export const playfair: SciCalculator = (v) => {
  const key = txt(v, "key").toUpperCase().replace(/[^A-Z]/g, "").replace(/J/g, "I"), dec = pick(v.mode, 2) === 1;
  const seen = new Set<string>(), sq: string[] = [];
  for (const ch of key + "ABCDEFGHIKLMNOPQRSTUVWXYZ") if (!seen.has(ch)) {
    seen.add(ch);
    sq.push(ch);
  }
  const pos_ = (ch: string) => {
    const i = sq.indexOf(ch);
    return [Math.floor(i / 5), i % 5];
  };
  const msg = txt(v, "msg").toUpperCase().replace(/[^A-Z]/g, "").replace(/J/g, "I");
  if (!msg) throw new InputError("Enter a message.");
  const pairs: string[] = [];
  if (dec) for (let i = 0; i < msg.length; i += 2) pairs.push(msg[i] + (msg[i + 1] ?? "X"));
  else {
    let i = 0;
    while (i < msg.length) {
      const a = msg[i], b = msg[i + 1];
      if (!b) {
        pairs.push(a + "X");
        i++;
      } else if (a === b) {
        pairs.push(a + "X");
        i++;
      } else {
        pairs.push(a + b);
        i += 2;
      }
    }
  }
  const sh = dec ? 4 : 1;
  const out = pairs.map(([a, b]) => {
    const [r1, c1] = pos_(a), [r2, c2] = pos_(b);
    if (r1 === r2) return sq[r1 * 5 + ((c1 + sh) % 5)] + sq[r2 * 5 + ((c2 + sh) % 5)];
    if (c1 === c2) return sq[((r1 + sh) % 5) * 5 + c1] + sq[((r2 + sh) % 5) * 5 + c2];
    return sq[r1 * 5 + c2] + sq[r2 * 5 + c1];
  });
  return { result: out.join(" "), square: [0, 1, 2, 3, 4].map((r) => sq.slice(r * 5, r * 5 + 5).join(" ")).join("\n"), pairs: pairs.join(" ") };
};
export const PF_MODE = ["Encrypt", "Decrypt"];
export const setTheory: SciCalculator = (v) => {
  const parse = (k: string) => [...new Set(txt(v, k).split(/[\s,;{}]+/).filter(Boolean))];
  const A = parse("A"), B = parse("B"), U = parse("U");
  const st = (x: string[]) => `{${x.join(", ")}}`;
  const uni = [...new Set([...A, ...B])], inter = A.filter((x) => B.includes(x));
  return {
    union: st(uni), intersection: st(inter), aMinusB: st(A.filter((x) => !B.includes(x))), bMinusA: st(B.filter((x) => !A.includes(x))),
    symmetric: st(uni.filter((x) => !inter.includes(x))),
    complementA: U.length ? st(U.filter((x) => !A.includes(x))) : "enter a universal set U",
    counts: `|A| = ${A.length}, |B| = ${B.length}, |A ∪ B| = ${uni.length}, |A ∩ B| = ${inter.length}, |P(A)| = 2^${A.length} = ${2 ** A.length}, |A × B| = ${A.length * B.length}`,
  };
};
export const induction: SciCalculator = (v) => {
  const term = compileFn(txt(v, "term"), ["k"]), rhs = compileFn(txt(v, "rhs"), ["n"]), N = Math.min(500, Math.max(1, Math.round(pos(v.N, 20))));
  const start = Math.round(num(v.start, 1));
  let sum = 0, ok = true, firstFail = 0;
  const rows: string[] = [];
  for (let n = start; n < start + N; n++) {
    sum += term(n);
    const r = rhs(n);
    const good = Math.abs(sum - r) <= 1e-9 * Math.max(1, Math.abs(r));
    if (!good && ok) {
      ok = false;
      firstFail = n;
    }
    if (n < start + 8) rows.push(`n = ${n}: left = ${fmt(sum, 10)}, right = ${fmt(r, 10)} ${good ? "✓" : "✗"}`);
  }
  return { result: ok ? 0 : 1, base: rows[0] ?? "", checks: rows.join("\n"), failure: ok ? "none" : `first fails at n = ${firstFail}` };
};
export const INDUCT = ["Holds for every n checked — now prove the inductive step", "Formula is false"];

// ---------- Special functions ----------
export const rationalIrrational: SciCalculator = (v) => {
  const raw = txt(v, "x").replace(/\s/g, "");
  const val = evalExpr(raw);
  let verdict = 2, reason = "", frac = "—";
  const sq = raw.match(/^sqrt\((\d+)\)$/i) || raw.match(/^√(\d+)$/);
  if (sq) {
    const n = Number(sq[1]), r = Math.round(Math.sqrt(n));
    verdict = r * r === n ? 0 : 1;
    reason = verdict ? `${n} isn't a perfect square, so √${n} is irrational.` : `${n} = ${r}², so √${n} = ${r}.`;
  } else if (/pi|π|\be\b|phi/i.test(raw) && !/^-?\d/.test(raw.replace(/pi|π|e|phi/gi, ""))) {
    verdict = 1;
    reason = "π, e and φ are irrational, and rational multiples or sums of them stay irrational.";
  } else if (/^-?\d+(\.\d+)?$/.test(raw) || /^-?\d+\/\d+$/.test(raw)) {
    verdict = 0;
    reason = "A terminating decimal or a fraction of integers is rational.";
  } else {
    // continued-fraction test: does a small-denominator fraction match to full precision?
    reason = "Decimal value checked against fractions with denominators up to 10⁶.";
  }
  for (let d = 1; d <= 1e6; d++) {
    const nmr = Math.round(val * d);
    if (Math.abs(nmr / d - val) < 1e-12 * Math.max(1, Math.abs(val))) {
      frac = `${nmr}/${d}`;
      if (verdict === 2) verdict = 0;
      break;
    }
  }
  if (verdict === 2) {
    verdict = 1;
    reason += " No matching fraction was found, so it's (very likely) irrational.";
  }
  return { verdict, value: s(val, 15), fraction: verdict === 0 ? frac : "—", reason };
};
export const RATIONAL = ["Rational", "Irrational"];
export const gammaCalc: SciCalculator = (v) => {
  const x = num(v.x, 4.5);
  if (x <= 0 && Number.isInteger(x)) throw new InputError("Γ(x) is undefined at 0 and negative integers.");
  const g = gammaFn(x);
  return { gamma: s(g, 12), lnGamma: x > 0 ? s(lgamma(x), 12) : "—", factorial: Number.isInteger(x) && x > 0 ? `(${x} − 1)! = ${fmt(g, 12)}` : `x! = Γ(x + 1) = ${fmt(gammaFn(x + 1), 10)}` };
};
export const erfCalc: SciCalculator = (v) => {
  const x = num(v.x, 0.5);
  const e = erf(x);
  const y = Math.max(-0.999999, Math.min(0.999999, x));
  return { erf: s(e, 12), erfc: s(1 - e, 12), inverse: Math.abs(x) < 1 ? s(normInv((y + 1) / 2) / Math.SQRT2, 10) : "— (needs −1 < x < 1)", normal: `P(−x√2 < Z < x√2) = ${fmt(e, 8)}` };
};
export const exactValue: SciCalculator = (v) => {
  const deg = num(v.angle, 30);
  const TABLE: Record<number, [string, string, string]> = {
    0: ["0", "1", "0"], 15: ["(√6 − √2)/4", "(√6 + √2)/4", "2 − √3"], 18: ["(√5 − 1)/4", "√(10 + 2√5)/4", "√(25 − 10√5)/5"], 30: ["1/2", "√3/2", "√3/3"], 36: ["√(10 − 2√5)/4", "(1 + √5)/4", "√(5 − 2√5)"],
    45: ["√2/2", "√2/2", "1"], 54: ["(1 + √5)/4", "√(10 − 2√5)/4", "√(25 + 10√5)/5"], 60: ["√3/2", "1/2", "√3"], 72: ["√(10 + 2√5)/4", "(√5 − 1)/4", "√(5 + 2√5)"], 75: ["(√6 + √2)/4", "(√6 − √2)/4", "2 + √3"], 90: ["1", "0", "undefined"],
  };
  const a = ((deg % 360) + 360) % 360;
  const ref = a <= 90 ? a : a <= 180 ? 180 - a : a <= 270 ? a - 180 : 360 - a;
  const sgn = (f: number) => (f < -1e-12 ? "−" : "");
  const r = (deg * Math.PI) / 180;
  const piFrac = (() => {
    const x = deg / 180;
    for (let d = 1; d <= 360; d++) if (Math.abs(x * d - Math.round(x * d)) < 1e-9) return `${Math.round(x * d) === 1 ? "" : Math.round(x * d) === -1 ? "−" : Math.round(x * d)}π${d === 1 ? "" : "/" + d}`;
    return `${fmt(x, 8)}π`;
  })();
  const row = TABLE[Math.round(ref * 1e6) / 1e6];
  if (!row) return { sin: fmt(Math.sin(r), 12), cos: fmt(Math.cos(r), 12), tan: fmt(Math.tan(r), 12), radians: piFrac, note: "No simple radical form for this angle — decimals shown." };
  const tanU = Math.abs(Math.cos(r)) < 1e-12;
  return { sin: `${sgn(Math.sin(r))}${row[0]}`, cos: `${sgn(Math.cos(r))}${row[1]}`, tan: tanU ? "undefined" : `${sgn(Math.tan(r))}${row[2]}`, radians: piFrac, note: `Reference angle ${fmt(ref)}°.` };
};
export const sigmoid: SciCalculator = (v) => {
  const x = num(v.x, 1), listS = txt(v, "list");
  const sg = 1 / (1 + Math.exp(-x));
  let soft = "—";
  if (listS) {
    const z = listOf(v, "list", 1), m = Math.max(...z), e = z.map((t) => Math.exp(t - m)), S = e.reduce((a, b) => a + b, 0);
    soft = e.map((t) => fmt(t / S, 6)).join(", ");
  }
  return { sigmoid: s(sg, 12), derivative: s(sg * (1 - sg), 12), logit: x > 0 && x < 1 ? s(Math.log(x / (1 - x)), 10) : "— (needs 0 < x < 1)", softmax: soft };
};
export const bessel: SciCalculator = (v) => {
  const n = Math.round(num(v.n, 0)), x = num(v.x, 2.5);
  if (Math.abs(n) > 50) throw new InputError("Use |n| ≤ 50.");
  if (x > 60) throw new InputError("Use x up to 60.");
  const J = (nn: number, xx: number) => {
    let sum = 0;
    for (let k = 0; k < 200; k++) {
      const term = ((-1) ** k * (xx / 2) ** (2 * k + nn)) / Math.exp(lgamma(k + 1) + lgamma(k + nn + 1));
      sum += term;
      if (k > xx && Math.abs(term) < 1e-17 * Math.abs(sum)) break;
    }
    return sum;
  };
  const an = Math.abs(n);
  const Jn = J(an, x) * (n < 0 && an % 2 ? -1 : 1);
  let Yn: number | string = "— (x must be > 0)";
  if (x > 0) {
    const gam = 0.5772156649015329;
    let y0 = (2 / Math.PI) * (Math.log(x / 2) + gam) * J(0, x);
    let h = 0;
    for (let k = 1; k < 200; k++) {
      h += 1 / k;
      y0 -= (2 / Math.PI) * (((-1) ** k * h * (x / 2) ** (2 * k)) / Math.exp(2 * lgamma(k + 1)));
    }
    // Y1 from the Wronskian J1·Y0 − J0·Y1 = 2/(πx)
    const y1 = (J(1, x) * y0 - 2 / (Math.PI * x)) / J(0, x);
    let ym = y0, yc = y1;
    if (an === 0) Yn = y0;
    else {
      for (let k = 1; k < an; k++) {
        const nx = ((2 * k) / x) * yc - ym;
        ym = yc;
        yc = nx;
      }
      Yn = yc * (n < 0 && an % 2 ? -1 : 1);
    }
    if (Math.abs(J(0, x)) < 1e-6 && an >= 1) Yn = "— (x is too close to a zero of J₀ for this method)";
  }
  return { J: s(Jn, 12), Y: typeof Yn === "number" ? s(Yn, 10) : Yn, order: n };
};

export const sciDiscCustomCalculators: Record<string, SciCalculator> = {
  "boolean-algebra-calculator": booleanAlgebra,
  "prime-factorization-calculator": primeFactorization,
  "big-o-calculator": bigO,
  "truth-table-calculator": truthTable,
  "playfair-cipher-calculator": playfair,
  "rational-irrational-calculator": rationalIrrational,
  "gamma-function-calculator": gammaCalc,
  "ieee-754-calculator": ieee754,
  "karnaugh-map-calculator": karnaughMap,
  "erf-calculator": erfCalc,
  "modular-exponentiation-calculator": modExp,
  "rsa-calculator": rsa,
  "exact-value-calculator": exactValue,
  "digital-root-calculator": digitalRoot,
  "hamming-code-calculator": hamming,
  "binary-calculator": binaryCalc,
  "set-theory-calculator": setTheory,
  "erasure-coding-calculator": erasure,
  "mathematical-induction-calculator": induction,
  "shannon-entropy-calculator": shannon,
  "euler-totient-calculator": totient,
  "sigmoid-function-calculator": sigmoid,
  "euclidean-algorithm-calculator": euclidean,
  "discrete-math-calculator": discreteMath,
  "bloom-filter-calculator": bloom,
  "crc-calculator": crc,
  "tf-idf-calculator": tfidf,
  "bessel-function-calculator": bessel,
};
