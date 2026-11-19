/**
 * Batch: Tech keyword check (15 Nov 2026) — number bases, AI tokens & cloud cost, 8 tools for
 * Science > Computer, Network & IT Calculators.
 *
 * Near-namesakes kept apart on purpose:
 *  - programmer-calculator = convert ONE number between bases. hex-calculator = arithmetic on two
 *    hex numbers. bitwise-calculator = AND/OR/XOR/shift logic. twos-complement-calculator = signed
 *    numbers at a fixed bit width. The existing binary-calculator does binary arithmetic.
 *  - llm-token-calculator = how many tokens a text is. ai-api-cost-calculator = what tokens cost.
 *
 * Methods / data:
 *  - Token estimate: English averages ≈ 4 characters or ≈ 0.75 words per token (OpenAI and Anthropic
 *    guidance); the estimate is the mean of the two, and newer tokenizers can use up to ~35% more.
 *  - Claude API list prices (Anthropic, cached 3 Nov 2026), $ per million input / output tokens:
 *    Fable 5.2 8 / 40, Opus 5.5 4 / 20, Sonnet 5.5 2 / 10, Haiku 5.5 0.10 / 0.50. Other providers:
 *    the user enters their own rates (prices change often).
 *  - AWS Lambda (us-east-1): $0.20 per million requests; $0.0000166667 per GB-second (x86) or
 *    $0.0000133334 (Arm); free tier 1 M requests + 400,000 GB-s a month.
 *  - Website carbon: Sustainable Web Design model v3 — 0.81 kWh per GB transferred; 75% new visitors,
 *    25% returning loading 2% of the page; split data centre 15% / network 14% / devices 52% /
 *    production 19%; grid 442 g CO₂e/kWh, renewable 50 g/kWh for the data-centre share.
 */

import { type TrvCalculator as Calc, InputError, pos, pick, txt, r2, nfmt, money } from "./trv-core";

// ------------------------------------------------------------------ number parsing (BigInt)
function parseBig(raw: string, base: number): bigint {
  let s = raw.trim().replace(/[_\s,]/g, "").toLowerCase();
  let neg = false;
  if (s.startsWith("-")) { neg = true; s = s.slice(1); }
  if (s.startsWith("0x")) { base = 16; s = s.slice(2); } else if (s.startsWith("0b")) { base = 2; s = s.slice(2); } else if (s.startsWith("0o")) { base = 8; s = s.slice(2); }
  if (base === 16 && s.endsWith("h")) s = s.slice(0, -1);
  const digits = "0123456789abcdef".slice(0, base);
  if (!s || [...s].some((c) => !digits.includes(c))) throw new InputError(`"${raw}" isn't a valid base-${base} number.`);
  let n = BigInt(0);
  for (const c of s) n = n * BigInt(base) + BigInt(digits.indexOf(c));
  return neg ? -n : n;
}
const group = (s: string, n: number, sep = " ") => s.replace(new RegExp(`\\B(?=(.{${n}})+$)`, "g"), sep);
function baseText(n: bigint, base: number, grp = 0) {
  const neg = n < BigInt(0);
  const s = (neg ? -n : n).toString(base).toUpperCase();
  return (neg ? "−" : "") + (grp ? group(s, grp) : s);
}
const asNumber = (n: bigint) => (n >= BigInt(-Number.MAX_SAFE_INTEGER) && n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : NaN);

// ------------------------------------------------------------------ programmer (base converter)
export const BASES: [string, number][] = [["Decimal (base 10)", 10], ["Hexadecimal (base 16)", 16], ["Binary (base 2)", 2], ["Octal (base 8)", 8]];
export const programmer: Calc = (v) => {
  const n = parseBig(txt(v, "value"), BASES[pick(v.from, 4)][1]);
  const a = asNumber(n);
  const ascii = a >= 32 && a < 127 ? `'${String.fromCharCode(a)}'` : a >= 0 && a <= 0x10ffff && a > 127 ? `U+${a.toString(16).toUpperCase().padStart(4, "0")} '${String.fromCodePoint(a)}'` : "—";
  const bits = n === BigInt(0) ? 1 : (n < BigInt(0) ? -n : n).toString(2).length;
  return { dec: baseText(n, 10).replace(/\B(?=(\d{3})+(?!\d))/g, ","), hex: baseText(n, 16, 4), bin: baseText(n, 2, 4), oct: baseText(n, 8), bits, bytes: Math.ceil(bits / 8), ascii };
};

// ------------------------------------------------------------------ hex arithmetic
export const HEX_OPS = ["Add (+)", "Subtract (−)", "Multiply (×)", "Divide (÷, whole number)", "Remainder (mod)", "AND", "OR", "XOR"];
export const hexCalc: Calc = (v) => {
  const a = parseBig(txt(v, "a"), 16), b = parseBig(txt(v, "b"), 16);
  const op = pick(v.op, HEX_OPS.length);
  if ((op === 3 || op === 4) && b === BigInt(0)) throw new InputError("Can't divide by zero.");
  const r = [a + b, a - b, a * b, a / b, a % b, a & b, a | b, a ^ b][op];
  return { hex: baseText(r, 16), dec: baseText(r, 10).replace(/\B(?=(\d{3})+(?!\d))/g, ","), bin: baseText(r, 2, 4), aDec: baseText(a, 10), bDec: baseText(b, 10), eq: `${baseText(a, 16)} ${["+", "−", "×", "÷", "mod", "AND", "OR", "XOR"][op]} ${baseText(b, 16)} = ${baseText(r, 16)}` };
};

// ------------------------------------------------------------------ two's complement
export const WIDTHS = [4, 8, 16, 32, 64];
export const TC_MODES = ["Decimal → two's complement binary", "Binary/hex pattern → signed decimal"];
export const twosComplement: Calc = (v) => {
  const w = WIDTHS[pick(v.width, WIDTHS.length)];
  const W = BigInt(w), full = BigInt(1) << W, half = full >> BigInt(1);
  const mode = pick(v.mode, 2);
  let val: bigint, pat: bigint;
  if (mode === 0) {
    val = parseBig(txt(v, "value"), 10);
    if (val < -half || val >= half) throw new InputError(`A signed ${w}-bit number must be from −${half} to ${half - BigInt(1)}.`);
    pat = val < BigInt(0) ? full + val : val;
  } else {
    const raw = txt(v, "value");
    pat = parseBig(raw, /^0x/i.test(raw) ? 16 : 2);
    if (pat < BigInt(0) || pat >= full) throw new InputError(`That pattern is wider than ${w} bits.`);
    val = pat >= half ? pat - full : pat;
  }
  const bin = pat.toString(2).padStart(w, "0");
  const ones = val < BigInt(0) ? (pat - BigInt(1)).toString(2).padStart(w, "0") : bin;
  const unsigned = pat.toString(10);
  return { binary: group(bin, 4), decimal: val.toString(), hex: `0x${pat.toString(16).toUpperCase().padStart(w / 4, "0")}`, ones: val < BigInt(0) ? group(ones, 4) : `${group(bin, 4)} (same as two's for positive numbers)`, unsigned, range: `−${half} to ${half - BigInt(1)} (signed), 0 to ${full - BigInt(1)} (unsigned)`, how: val < BigInt(0) ? `Invert the bits of ${-val} (${group((-val).toString(2).padStart(w, "0"), 4)}) and add 1` : "Positive: the bit pattern is just the binary number" };
};

// ------------------------------------------------------------------ bitwise
export const BIT_OPS = ["A AND B", "A OR B", "A XOR B", "NOT A", "A NAND B", "A NOR B", "A << B (shift left)", "A >> B (shift right)"];
export const bitwise: Calc = (v) => {
  const w = WIDTHS[pick(v.width, WIDTHS.length)];
  const mask = (BigInt(1) << BigInt(w)) - BigInt(1);
  const read = (k: string) => { const raw = txt(v, k); const n = parseBig(raw, 10); return n < BigInt(0) ? (n + (BigInt(1) << BigInt(w))) & mask : n & mask; };
  const a = read("a"), b = read("b");
  const op = pick(v.op, BIT_OPS.length);
  if (op >= 6 && b > BigInt(w)) throw new InputError(`Shift by at most ${w} bits.`);
  const r = [a & b, a | b, a ^ b, ~a & mask, ~(a & b) & mask, ~(a | b) & mask, (a << b) & mask, a >> b][op];
  const bin = (x: bigint) => group(x.toString(2).padStart(w, "0"), 4);
  return { dec: r.toString(), hex: `0x${r.toString(16).toUpperCase()}`, bin: bin(r), aBin: bin(a), bBin: op === 3 ? "—" : bin(b), signed: (r >= BigInt(1) << BigInt(w - 1) ? r - (BigInt(1) << BigInt(w)) : r).toString() };
};

// ------------------------------------------------------------------ LLM tokens
export const llmTokens: Calc = (v) => {
  const s = txt(v, "text");
  let chars = s.length, words = s.split(/\s+/).filter(Boolean).length;
  if (pos(v.words) > 0) { words = Math.round(pos(v.words)); chars = Math.round(words * 5.7); }
  if (!words && !chars) throw new InputError("Paste some text, or enter a word count.");
  const tok = Math.round((chars / 4 + words / 0.75) / 2);
  const maxCtx = pos(v.context, 200000);
  return { tokens: tok, range: `${nfmt(Math.round(tok * 0.85))} – ${nfmt(Math.round(tok * 1.35))} depending on the model's tokenizer`, words, chars, pages: r2(words / 500), fits: maxCtx > 0 ? `${r2((tok / maxCtx) * 100)}% of a ${nfmt(maxCtx)}-token context window` : "—", perToken: r2(chars / Math.max(1, tok)) };
};

// ------------------------------------------------------------------ AI API cost
export const AI_MODELS: [string, number, number][] = [["Claude Opus 5.5 ($4 / $20)", 4, 20], ["Claude Sonnet 5.5 ($2 / $10)", 2, 10], ["Claude Haiku 5.5 ($0.10 / $0.50)", 0.1, 0.5], ["Claude Fable 5.2 ($8 / $40)", 8, 40], ["Custom — enter prices below (OpenAI, Gemini, others)", 0, 0]];
export const aiApiCost: Calc = (v) => {
  const mi = pick(v.model, AI_MODELS.length);
  let [, pin, pout] = AI_MODELS[mi];
  if (mi === AI_MODELS.length - 1 || pos(v.customIn) > 0 || pos(v.customOut) > 0) { pin = pos(v.customIn); pout = pos(v.customOut); }
  if (pin <= 0 && pout <= 0) throw new InputError("Enter the price per million input and output tokens for your model.");
  const tin = pos(v.inTok, 2000), tout = pos(v.outTok, 500), req = pos(v.requests, 1000);
  const cached = Math.min(100, pos(v.cached, 0)) / 100;
  const cacheRead = 0.1;
  const inCost = (tin * ((1 - cached) * pin + cached * pin * cacheRead)) / 1e6;
  const outCost = (tout * pout) / 1e6;
  const per = inCost + outCost;
  const batch = pick(v.batch, 2) === 1 ? 0.5 : 1;
  const monthly = per * req * 30 * batch;
  return { monthly: r2(monthly), per: money(per * batch, "$", 5), daily: r2(per * req * batch), yearly: r2(monthly * 12), inShare: per > 0 ? r2((inCost / per) * 100) : 0, rates: `$${pin} input / $${pout} output per million tokens${cached ? `, cached input at ${cacheRead * 100}%` : ""}${batch < 1 ? ", batch −50%" : ""}`, perThousand: r2(per * 1000 * batch) };
};
export const awsLambda: Calc = (v) => {
  const req = pos(v.requests, 5e6), ms = pos(v.ms, 120), mb = Math.min(10240, Math.max(128, pos(v.memory, 512)));
  const rate = pick(v.arch, 2) === 1 ? 0.0000133334 : 0.0000166667;
  const free = pick(v.free, 2) === 0;
  const gbs = req * (ms / 1000) * (mb / 1024);
  const billGbs = Math.max(0, gbs - (free ? 400000 : 0)), billReq = Math.max(0, req - (free ? 1e6 : 0));
  const compute = billGbs * rate, reqCost = (billReq / 1e6) * 0.2;
  const total = compute + reqCost;
  return { total: r2(total), compute: r2(compute), reqCost: r2(reqCost), gbs: Math.round(gbs), perMillion: req > 0 ? r2((total / req) * 1e6) : 0, yearly: r2(total * 12), note: free ? "After the always-free tier (1 M requests + 400,000 GB-s per month)" : "Without the free tier" };
};

// ------------------------------------------------------------------ website carbon (SWD v3)
export const websiteCarbon: Calc = (v) => {
  const mb = pos(v.mb, 2), views = pos(v.views, 10000), green = pick(v.green, 2) === 1;
  if (mb <= 0) throw new InputError("Enter the page size in MB (check it in your browser's developer tools → Network).");
  const gb = (mb * 1e6) / 1e9;
  const eff = gb * (0.75 + 0.25 * 0.02);
  const kwh = eff * 0.81;
  const grid = 442;
  const g = kwh * (green ? 0.15 * 50 + 0.85 * grid : grid);
  const yearKg = (g * views * 12) / 1000;
  return { perView: Math.round(g * 1000) / 1000, yearly: r2(yearKg), kwhYear: r2(kwh * views * 12), trees: r2(yearKg / 21.8), driving: `${nfmt((yearKg * 1000) / 170, 0)} km in an average petrol car`, kettle: `${nfmt((kwh * views * 12) / 0.11, 0)} kettles boiled` };
};

export const techDevCustomCalculators: Record<string, Calc> = {
  "programmer-calculator": programmer,
  "hex-calculator": hexCalc,
  "twos-complement-calculator": twosComplement,
  "bitwise-calculator": bitwise,
  "llm-token-calculator": llmTokens,
  "ai-api-cost-calculator": aiApiCost,
  "aws-lambda-cost-calculator": awsLambda,
  "website-carbon-calculator": websiteCarbon,
};
