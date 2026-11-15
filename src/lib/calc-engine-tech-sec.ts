/**
 * Batch: Tech keyword check (15 Nov 2026) — security & developer tools, 8 tools for Science >
 * Computer, Network & IT Calculators.
 *
 * Near-namesakes kept apart on purpose:
 *  - cvss-3-1-calculator (FIRST CVSS v3.1 equations) vs cvss-4-calculator (CVSS v4.0 MacroVector
 *    lookup + interpolation). Different metrics and different scores for the same flaw.
 *  - hash-calculator = MD5/SHA family digests of text. The existing crc-calculator does CRC
 *    checksums and is not rebuilt.
 *  - password-entropy-calculator = strength of a password (entropy bits, crack time). The existing
 *    combination-calculator is generic nCr maths.
 *
 * Methods:
 *  - CVSS v3.1 specification (FIRST): ISS = 1 − (1−C)(1−I)(1−A); impact 6.42·ISS (S:U) or
 *    7.52(ISS−0.029) − 3.25(ISS−0.02)^15 (S:C); exploitability 8.22·AV·AC·PR·UI; Roundup per
 *    Appendix A. Temporal = Roundup(Base × E × RL × RC).
 *  - CVSS v4.0: FIRST reference implementation (cvss_score.js, BSD-2) — MacroVector EQ1–EQ6, the
 *    270-entry lookup in cvss4-lookup.ts, max-severity depths and mean proportional distance.
 *  - Password entropy = length × log₂(character pool); average crack time = pool^length ÷ 2 ÷ rate.
 *  - SMS: GSM 03.38 7-bit alphabet (extension characters count 2): 160 per single message, 153 per
 *    part when concatenated; anything else forces UCS-2: 70 single, 67 per part (UTF-16 units).
 */

import { createHash } from "node:crypto";
import { type TrvCalculator as Calc, InputError, num, pick, txt, nfmt, dayText, parseClock, dateIn } from "./trv-core";
import { CVSS4_LOOKUP } from "./cvss4-lookup";

const sevOf = (s: number) => (s === 0 ? "None" : s < 4 ? "Low" : s < 7 ? "Medium" : s < 9 ? "High" : "Critical");

function parseVector(raw: string, prefix: RegExp) {
  const parts = raw.trim().replace(prefix, "").split("/").filter(Boolean);
  const out: Record<string, string> = {};
  for (const p of parts) {
    const [k, val] = p.split(":");
    if (!k || val === undefined) throw new InputError(`"${p}" isn't a metric — the vector looks like AV:N/AC:L/…`);
    out[k.toUpperCase()] = val.toUpperCase();
  }
  return out;
}

// ------------------------------------------------------------------ CVSS 3.1
const W31: Record<string, Record<string, number>> = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 }, AC: { L: 0.77, H: 0.44 }, UI: { N: 0.85, R: 0.62 },
  C: { H: 0.56, L: 0.22, N: 0 }, I: { H: 0.56, L: 0.22, N: 0 }, A: { H: 0.56, L: 0.22, N: 0 },
  E: { X: 1, H: 1, F: 0.97, P: 0.94, U: 0.91 }, RL: { X: 1, U: 1, W: 0.97, T: 0.96, O: 0.95 }, RC: { X: 1, C: 1, R: 0.96, U: 0.92 },
};
export function roundup31(x: number) {
  const i = Math.round(x * 100000);
  return i % 10000 === 0 ? i / 100000 : (Math.floor(i / 10000) + 1) / 10;
}
export function cvss31Score(vec: string) {
  const m = parseVector(vec, /^CVSS:3\.[01]\//i);
  for (const k of ["AV", "AC", "PR", "UI", "S", "C", "I", "A"]) if (!m[k]) throw new InputError(`The vector is missing ${k}. A full base vector is AV:_/AC:_/PR:_/UI:_/S:_/C:_/I:_/A:_.`);
  const w = (k: string) => { const x = W31[k]?.[m[k] ?? "X"]; if (x === undefined) throw new InputError(`"${k}:${m[k]}" isn't a valid CVSS 3.1 value.`); return x; };
  const changed = m.S === "C";
  if (m.S !== "C" && m.S !== "U") throw new InputError("Scope (S) must be U or C.");
  const pr = ({ N: 0.85, L: changed ? 0.68 : 0.62, H: changed ? 0.5 : 0.27 } as Record<string, number>)[m.PR];
  if (pr === undefined) throw new InputError(`"PR:${m.PR}" isn't valid — use N, L or H.`);
  const iss = 1 - (1 - w("C")) * (1 - w("I")) * (1 - w("A"));
  const impact = changed ? 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15 : 6.42 * iss;
  const expl = 8.22 * w("AV") * w("AC") * pr * w("UI");
  const base = impact <= 0 ? 0 : roundup31(Math.min((changed ? 1.08 : 1) * (impact + expl), 10));
  const temporal = roundup31(base * w("E") * w("RL") * w("RC"));
  return { base, temporal, impact: Math.max(0, Math.round(impact * 10) / 10), expl: Math.round(expl * 10) / 10, hasTemporal: ["E", "RL", "RC"].some((k) => m[k] && m[k] !== "X") };
}
export const cvss31: Calc = (v) => {
  const s = cvss31Score(txt(v, "vector"));
  return { base: s.base, severity: sevOf(s.base), temporal: s.hasTemporal ? `${s.temporal} (${sevOf(s.temporal)})` : "— (add E:, RL:, RC: to the vector)", impact: s.impact, expl: s.expl };
};

// ------------------------------------------------------------------ CVSS 4.0 (FIRST reference algorithm)
const LV: Record<string, Record<string, number>> = {
  AV: { N: 0, A: 0.1, L: 0.2, P: 0.3 }, PR: { N: 0, L: 0.1, H: 0.2 }, UI: { N: 0, P: 0.1, A: 0.2 }, AC: { L: 0, H: 0.1 }, AT: { N: 0, P: 0.1 },
  VC: { H: 0, L: 0.1, N: 0.2 }, VI: { H: 0, L: 0.1, N: 0.2 }, VA: { H: 0, L: 0.1, N: 0.2 }, SC: { H: 0.1, L: 0.2, N: 0.3 },
  SI: { S: 0, H: 0.1, L: 0.2, N: 0.3 }, SA: { S: 0, H: 0.1, L: 0.2, N: 0.3 }, CR: { H: 0, M: 0.1, L: 0.2 }, IR: { H: 0, M: 0.1, L: 0.2 }, AR: { H: 0, M: 0.1, L: 0.2 },
};
const MAX_COMPOSED: Record<string, Record<string, string[] | Record<string, string[]>>> = {
  eq1: { 0: ["AV:N/PR:N/UI:N/"], 1: ["AV:A/PR:N/UI:N/", "AV:N/PR:L/UI:N/", "AV:N/PR:N/UI:P/"], 2: ["AV:P/PR:N/UI:N/", "AV:A/PR:L/UI:P/"] },
  eq2: { 0: ["AC:L/AT:N/"], 1: ["AC:H/AT:N/", "AC:L/AT:P/"] },
  eq3: { 0: { 0: ["VC:H/VI:H/VA:H/CR:H/IR:H/AR:H/"], 1: ["VC:H/VI:H/VA:L/CR:M/IR:M/AR:H/", "VC:H/VI:H/VA:H/CR:M/IR:M/AR:M/"] }, 1: { 0: ["VC:L/VI:H/VA:H/CR:H/IR:H/AR:H/", "VC:H/VI:L/VA:H/CR:H/IR:H/AR:H/"], 1: ["VC:L/VI:H/VA:L/CR:H/IR:M/AR:H/", "VC:L/VI:H/VA:H/CR:H/IR:M/AR:M/", "VC:H/VI:L/VA:H/CR:M/IR:H/AR:M/", "VC:H/VI:L/VA:L/CR:M/IR:H/AR:H/", "VC:L/VI:L/VA:H/CR:H/IR:H/AR:M/"] }, 2: { 1: ["VC:L/VI:L/VA:L/CR:H/IR:H/AR:H/"] } },
  eq4: { 0: ["SC:H/SI:S/SA:S/"], 1: ["SC:H/SI:H/SA:H/"], 2: ["SC:L/SI:L/SA:L/"] },
  eq5: { 0: ["E:A/"], 1: ["E:P/"], 2: ["E:U/"] },
};
const MAX_SEV: Record<string, Record<string, number | Record<string, number>>> = { eq1: { 0: 1, 1: 4, 2: 5 }, eq2: { 0: 1, 1: 2 }, eq3eq6: { 0: { 0: 7, 1: 6 }, 1: { 0: 8, 1: 8 }, 2: { 1: 10 } }, eq4: { 0: 6, 1: 5, 2: 4 } };
const BASE4 = ["AV", "AC", "AT", "PR", "UI", "VC", "VI", "VA", "SC", "SI", "SA"];
const VALID4: Record<string, string[]> = { AV: ["N", "A", "L", "P"], AC: ["L", "H"], AT: ["N", "P"], PR: ["N", "L", "H"], UI: ["N", "P", "A"], VC: ["H", "L", "N"], VI: ["H", "L", "N"], VA: ["H", "L", "N"], SC: ["H", "L", "N"], SI: ["H", "L", "N"], SA: ["H", "L", "N"], E: ["X", "A", "P", "U"], CR: ["X", "H", "M", "L"], IR: ["X", "H", "M", "L"], AR: ["X", "H", "M", "L"] };
export function cvss4Score(vec: string) {
  const sel = parseVector(vec, /^CVSS:4\.0\//i);
  for (const k of BASE4) if (!sel[k]) throw new InputError(`The vector is missing ${k}. A CVSS 4.0 base vector has AV, AC, AT, PR, UI, VC, VI, VA, SC, SI and SA.`);
  for (const [k, val] of Object.entries(sel)) if (VALID4[k] && !VALID4[k].includes(val)) throw new InputError(`"${k}:${val}" isn't a valid CVSS 4.0 value.`);
  const m = (k: string): string => {
    const s = sel[k] ?? "X";
    if (k === "E" && s === "X") return "A";
    if ((k === "CR" || k === "IR" || k === "AR") && s === "X") return "H";
    const mod = sel[`M${k}`];
    if (mod && mod !== "X") return mod;
    return s;
  };
  if (["VC", "VI", "VA", "SC", "SI", "SA"].every((k) => m(k) === "N")) return { score: 0, macro: "—" };
  const eq1 = m("AV") === "N" && m("PR") === "N" && m("UI") === "N" ? 0 : (m("AV") === "N" || m("PR") === "N" || m("UI") === "N") && m("AV") !== "P" ? 1 : 2;
  const eq2 = m("AC") === "L" && m("AT") === "N" ? 0 : 1;
  const eq3 = m("VC") === "H" && m("VI") === "H" ? 0 : m("VC") === "H" || m("VI") === "H" || m("VA") === "H" ? 1 : 2;
  const eq4 = m("MSI") === "S" || m("MSA") === "S" ? 0 : m("SC") === "H" || m("SI") === "H" || m("SA") === "H" ? 1 : 2;
  const eq5 = m("E") === "A" ? 0 : m("E") === "P" ? 1 : 2;
  const eq6 = (m("CR") === "H" && m("VC") === "H") || (m("IR") === "H" && m("VI") === "H") || (m("AR") === "H" && m("VA") === "H") ? 0 : 1;
  const macro = `${eq1}${eq2}${eq3}${eq4}${eq5}${eq6}`;
  const look = (k: string) => CVSS4_LOOKUP[k] ?? NaN;
  let value = look(macro);
  const s1 = look(`${eq1 + 1}${eq2}${eq3}${eq4}${eq5}${eq6}`), s2 = look(`${eq1}${eq2 + 1}${eq3}${eq4}${eq5}${eq6}`);
  let s36: number;
  if (eq3 === 0 && eq6 === 0) { const l = look(`${eq1}${eq2}${eq3}${eq4}${eq5}${eq6 + 1}`), r = look(`${eq1}${eq2}${eq3 + 1}${eq4}${eq5}${eq6}`); s36 = l > r ? l : r; }
  else if (eq3 === 1 && eq6 === 0) s36 = look(`${eq1}${eq2}${eq3}${eq4}${eq5}${eq6 + 1}`);
  else if (eq3 === 2 && eq6 === 1) s36 = look(`${eq1}${eq2}${eq3 + 1}${eq4}${eq5}${eq6 + 1}`);
  else s36 = look(`${eq1}${eq2}${eq3 + 1}${eq4}${eq5}${eq6}`);
  const s4 = look(`${eq1}${eq2}${eq3}${eq4 + 1}${eq5}${eq6}`), s5 = look(`${eq1}${eq2}${eq3}${eq4}${eq5 + 1}${eq6}`);
  const mx = (eq: string, i: number) => MAX_COMPOSED[eq][i] as string[];
  const e36 = (MAX_COMPOSED.eq3[eq3] as Record<string, string[]>)[eq6];
  const vectors: string[] = [];
  for (const a of mx("eq1", eq1)) for (const b of mx("eq2", eq2)) for (const c of e36) for (const d of mx("eq4", eq4)) for (const e of mx("eq5", eq5)) vectors.push(a + b + c + d + e);
  const ext = (k: string, s: string) => { const i = s.indexOf(`${k}:`); return s.slice(i + k.length + 1).split("/")[0]; };
  const keys = ["AV", "PR", "UI", "AC", "AT", "VC", "VI", "VA", "SC", "SI", "SA", "CR", "IR", "AR"];
  let d: Record<string, number> = {};
  for (const vct of vectors) {
    d = {};
    for (const k of keys) d[k] = LV[k][m(k)] - LV[k][ext(k, vct)];
    if (!Object.values(d).some((x) => x < 0)) break;
  }
  const cur1 = d.AV + d.PR + d.UI, cur2 = d.AC + d.AT, cur36 = d.VC + d.VI + d.VA + d.CR + d.IR + d.AR, cur4 = d.SC + d.SI + d.SA;
  const step = 0.1;
  const ms1 = (MAX_SEV.eq1[eq1] as number) * step, ms2 = (MAX_SEV.eq2[eq2] as number) * step, ms36 = ((MAX_SEV.eq3eq6[eq3] as Record<string, number>)[eq6]) * step, ms4 = (MAX_SEV.eq4[eq4] as number) * step;
  let n = 0, total = 0;
  const add = (avail: number, cur: number, ms: number) => { if (!Number.isNaN(avail)) { n++; total += avail * (cur / ms); } };
  add(value - s1, cur1, ms1); add(value - s2, cur2, ms2); add(value - s36, cur36, ms36); add(value - s4, cur4, ms4);
  if (!Number.isNaN(value - s5)) n++;
  const mean = n ? total / n : 0;
  value = Math.min(10, Math.max(0, value - mean));
  return { score: Math.round(value * 10) / 10, macro };
}
export const cvss4: Calc = (v) => {
  const s = cvss4Score(txt(v, "vector"));
  const sel = parseVector(txt(v, "vector"), /^CVSS:4\.0\//i);
  const kind = Object.keys(sel).some((k) => k.startsWith("M") || ["CR", "IR", "AR"].includes(k)) ? "CVSS-BTE (environmental)" : sel.E && sel.E !== "X" ? "CVSS-BT (base + threat)" : "CVSS-B (base)";
  return { score: s.score, severity: sevOf(s.score), macro: s.macro, kind };
};

// ------------------------------------------------------------------ password entropy
export const RATES: [string, number][] = [["Online attack, rate-limited (100 guesses/s)", 100], ["Online attack, no limit (10,000/s)", 1e4], ["Offline, slow hash e.g. bcrypt (100,000/s)", 1e5], ["Offline, fast hash on one GPU (10 billion/s)", 1e10], ["Offline, GPU cluster (1 trillion/s)", 1e12]];
const COMMON = ["password", "123456", "12345678", "123456789", "qwerty", "abc123", "111111", "letmein", "welcome", "iloveyou", "admin", "monkey", "dragon", "football", "baseball", "sunshine", "princess", "password1", "123123", "000000"];
function timeText(sec: number) {
  if (!Number.isFinite(sec) || sec > 3.15e7 * 1e12) return "longer than the age of the universe";
  const units: [string, number][] = [["years", 3.156e7], ["days", 86400], ["hours", 3600], ["minutes", 60], ["seconds", 1]];
  for (const [u, s] of units) if (sec >= s) { const x = sec / s; return `${x >= 1e6 ? x.toExponential(2) : nfmt(x, x < 10 ? 1 : 0)} ${u}`; }
  return "instantly";
}
export const passwordEntropy: Calc = (v) => {
  const pw = txt(v, "password");
  let len = pw.length, pool = 0;
  if (pw) {
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/[0-9]/.test(pw)) pool += 10;
    if (/[^a-zA-Z0-9 ]/.test(pw)) pool += 33;
    if (/ /.test(pw)) pool += 1;
  } else {
    len = Math.round(num(v.length, 12));
    pool = Math.round(num(v.pool, 94));
  }
  if (len < 1 || pool < 2) throw new InputError("Type a password, or clear it and enter a length and character-set size.");
  const bits = len * Math.log2(pool);
  const rate = RATES[pick(v.rate, RATES.length)][1];
  const avg = 2 ** (bits - 1) / rate;
  const common = pw && COMMON.includes(pw.toLowerCase().replace(/[!@#$1]+$/, "")) ? "Warning: this is one of the most common passwords and would be guessed instantly" : "";
  const strength = common ? "Very weak" : bits < 28 ? "Very weak" : bits < 36 ? "Weak" : bits < 60 ? "Fair" : bits < 80 ? "Strong" : "Very strong";
  return { bits: Math.round(bits * 10) / 10, strength, crack: common ? "instantly (dictionary)" : timeText(avg), combos: bits > 60 ? `2^${bits.toFixed(1)} ≈ ${(2 ** bits).toExponential(2)}` : nfmt(Math.round(pool ** len)), pool, length: len, note: common || "Assumes the password is random. Words, names and keyboard patterns are much weaker than this." };
};

// ------------------------------------------------------------------ hash
export const hashCalc: Calc = (v) => {
  const s = txt(v, "text");
  const h = (alg: string) => createHash(alg).update(s, "utf8").digest("hex");
  const sha256 = h("sha256");
  return { sha256, md5: h("md5"), sha1: h("sha1"), sha512: h("sha512"), sha384: h("sha384"), bytes: Buffer.byteLength(s, "utf8"), upper: sha256.toUpperCase() };
};

// ------------------------------------------------------------------ unix timestamp
export const TS_MODES = ["Timestamp → date", "Date → timestamp"];
export const unixTimestamp: Calc = (v) => {
  const mode = pick(v.mode, 2);
  const off = num(v.offset, 0);
  let ms: number;
  if (mode === 0) {
    const raw = txt(v, "ts").replace(/[,_\s]/g, "");
    if (!/^-?\d+(\.\d+)?$/.test(raw)) throw new InputError("Enter a Unix timestamp in seconds (10 digits) or milliseconds (13 digits).");
    const n = Number(raw);
    ms = raw.replace("-", "").split(".")[0].length >= 12 ? n : n * 1000;
  } else {
    const day = dateIn(v, "date", 20408);
    ms = (day * 1440 + parseClock(txt(v, "time") || "00:00") - off * 60) * 60000;
  }
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) throw new InputError("That timestamp is out of range.");
  const sec = Math.floor(ms / 1000);
  const local = new Date(ms + off * 3600000);
  const two = (x: number) => String(x).padStart(2, "0");
  const hm = (x: Date) => `${two(x.getUTCHours())}:${two(x.getUTCMinutes())}:${two(x.getUTCSeconds())}`;
  const sign = off >= 0 ? "+" : "−";
  return {
    seconds: String(sec), utc: `${dayText(Math.floor(ms / 86400000))} ${hm(d)} UTC`, local: `${dayText(Math.floor((ms + off * 3600000) / 86400000))} ${hm(local)} (UTC${sign}${Math.abs(off)})`,
    iso: d.toISOString().replace(".000Z", "Z"), millis: String(Math.round(ms)), discord: `<t:${sec}:F>  (short: <t:${sec}:f>, relative: <t:${sec}:R>)`,
    y2038: sec > 2147483647 ? "After 19 Jan 2038 — too big for a signed 32-bit time_t" : "Fits in a signed 32-bit time_t",
  };
};

// ------------------------------------------------------------------ Discord permissions
const DPERMS: [string, number][] = [["CREATE_INSTANT_INVITE", 0], ["KICK_MEMBERS", 1], ["BAN_MEMBERS", 2], ["ADMINISTRATOR", 3], ["MANAGE_CHANNELS", 4], ["MANAGE_GUILD", 5], ["ADD_REACTIONS", 6], ["VIEW_AUDIT_LOG", 7], ["PRIORITY_SPEAKER", 8], ["STREAM", 9], ["VIEW_CHANNEL", 10], ["SEND_MESSAGES", 11], ["SEND_TTS_MESSAGES", 12], ["MANAGE_MESSAGES", 13], ["EMBED_LINKS", 14], ["ATTACH_FILES", 15], ["READ_MESSAGE_HISTORY", 16], ["MENTION_EVERYONE", 17], ["USE_EXTERNAL_EMOJIS", 18], ["VIEW_GUILD_INSIGHTS", 19], ["CONNECT", 20], ["SPEAK", 21], ["MUTE_MEMBERS", 22], ["DEAFEN_MEMBERS", 23], ["MOVE_MEMBERS", 24], ["USE_VAD", 25], ["CHANGE_NICKNAME", 26], ["MANAGE_NICKNAMES", 27], ["MANAGE_ROLES", 28], ["MANAGE_WEBHOOKS", 29], ["MANAGE_GUILD_EXPRESSIONS", 30], ["USE_APPLICATION_COMMANDS", 31], ["REQUEST_TO_SPEAK", 32], ["MANAGE_EVENTS", 33], ["MANAGE_THREADS", 34], ["CREATE_PUBLIC_THREADS", 35], ["CREATE_PRIVATE_THREADS", 36], ["USE_EXTERNAL_STICKERS", 37], ["SEND_MESSAGES_IN_THREADS", 38], ["USE_EMBEDDED_ACTIVITIES", 39], ["MODERATE_MEMBERS", 40], ["VIEW_CREATOR_MONETIZATION_ANALYTICS", 41], ["USE_SOUNDBOARD", 42], ["CREATE_GUILD_EXPRESSIONS", 43], ["CREATE_EVENTS", 44], ["USE_EXTERNAL_SOUNDS", 45], ["SEND_VOICE_MESSAGES", 46], ["SEND_POLLS", 49], ["USE_EXTERNAL_APPS", 50]];
const nice = (s: string) => s.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
export const discordPermissions: Calc = (v) => {
  const raw = txt(v, "perms");
  let val = BigInt(0);
  if (/^\d+$/.test(raw)) val = BigInt(raw);
  else {
    for (const part of raw.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)) {
      const key = part.toUpperCase().replace(/[\s-]+/g, "_");
      const hit = DPERMS.find(([n]) => n === key) ?? DPERMS.find(([n]) => n.includes(key));
      if (!hit) throw new InputError(`"${part}" isn't a Discord permission name (e.g. Send Messages, View Channel, Manage Roles).`);
      val |= BigInt(1) << BigInt(hit[1]);
    }
  }
  const names = DPERMS.filter(([, b]) => (val >> BigInt(b)) & BigInt(1)).map(([n]) => nice(n));
  const admin = (val >> BigInt(3)) & BigInt(1);
  return { value: val.toString(), list: names.join(", ") || "none", count: names.length, hex: `0x${val.toString(16)}`, invite: `https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot&permissions=${val.toString()}`, note: admin ? "Administrator grants every permission and bypasses channel overrides — avoid it for bots" : "—" };
};

// ------------------------------------------------------------------ SMS segments
const GSM_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€\f";
export const smsSegments: Calc = (v) => {
  const s = txt(v, "text");
  if (!s) throw new InputError("Type or paste the message.");
  const chars = [...s];
  const non = chars.filter((c) => !GSM_BASIC.includes(c) && !GSM_EXT.includes(c));
  const gsm = non.length === 0;
  const units = gsm ? chars.reduce((n, c) => n + (GSM_EXT.includes(c) ? 2 : 1), 0) : s.length;
  const single = gsm ? 160 : 70, part = gsm ? 153 : 67;
  const segs = units <= single ? 1 : Math.ceil(units / part);
  const cap = segs === 1 ? single : segs * part;
  return { segments: segs, encoding: gsm ? "GSM-7 (standard)" : "UCS-2 / Unicode", units, chars: chars.length, left: cap - units, perPart: segs === 1 ? `${single} per message` : `${part} per part (${single} if it fits in one)`, culprits: non.length ? `Characters forcing Unicode: ${[...new Set(non)].slice(0, 15).join(" ")}` : "—" };
};

// ------------------------------------------------------------------ infix / postfix / prefix
export const FIX_MODES = ["Infix → postfix & prefix", "Postfix → infix & value", "Prefix → infix & value"];
const PREC: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2, "^": 3 };
function tokens(s: string) {
  const t = s.match(/\d+(\.\d+)?|[A-Za-z_]\w*|[-+*/%^()]/g);
  if (!t || t.join("") !== s.replace(/\s+/g, "")) throw new InputError("Use numbers, letters and the operators + − * / % ^ with brackets.");
  return t;
}
const isOp = (t: string) => t in PREC;
function apply(op: string, a: number, b: number) { return op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : op === "/" ? a / b : op === "%" ? a % b : a ** b; }
export const infixPostfix: Calc = (v) => {
  const mode = pick(v.mode, 3);
  const tk = tokens(txt(v, "expr"));
  let postfix: string[];
  const steps: string[] = [];
  if (mode === 0) {
    const out: string[] = [], st: string[] = [];
    for (const t of tk) {
      if (isOp(t)) { while (st.length && isOp(st[st.length - 1]) && (PREC[st[st.length - 1]] > PREC[t] || (PREC[st[st.length - 1]] === PREC[t] && t !== "^"))) out.push(st.pop()!); st.push(t); }
      else if (t === "(") st.push(t);
      else if (t === ")") { while (st.length && st[st.length - 1] !== "(") out.push(st.pop()!); if (!st.length) throw new InputError("Unmatched )."); st.pop(); }
      else out.push(t);
      if (steps.length < 25) steps.push(`${t.padEnd(4)} stack [${st.join(" ")}]  output ${out.join(" ")}`);
    }
    while (st.length) { const o = st.pop()!; if (o === "(") throw new InputError("Unmatched (."); out.push(o); }
    postfix = out;
  } else {
    const list = mode === 2 ? [...tk].reverse() : tk;
    const st: string[][] = [];
    for (const t of list) {
      if (isOp(t)) { if (st.length < 2) throw new InputError("Not enough operands for an operator."); const b = st.pop()!, a = st.pop()!; st.push(mode === 2 ? [...b, ...a, t] : [...a, ...b, t]); }
      else if (t === "(" || t === ")") throw new InputError("Postfix and prefix don't use brackets.");
      else st.push([t]);
    }
    if (st.length !== 1) throw new InputError("Too many operands — check the expression.");
    postfix = st[0];
  }
  // build infix, prefix and value from postfix
  const st: { s: string; p: number; pre: string; val: number }[] = [];
  for (const t of postfix) {
    if (isOp(t)) {
      if (st.length < 2) throw new InputError("Not enough operands for an operator.");
      const b = st.pop()!, a = st.pop()!;
      const wrap = (x: typeof a, right: boolean) => (x.p < PREC[t] || (right && x.p === PREC[t] && t !== "^") || (!right && t === "^" && x.p === PREC[t]) ? `(${x.s})` : x.s);
      st.push({ s: `${wrap(a, false)} ${t} ${wrap(b, true)}`, p: PREC[t], pre: `${t} ${a.pre} ${b.pre}`, val: apply(t, a.val, b.val) });
    } else st.push({ s: t, p: 9, pre: t, val: /^\d/.test(t) ? Number(t) : NaN });
  }
  if (st.length !== 1) throw new InputError("The expression doesn't reduce to one value — check for a missing operator.");
  const r = st[0];
  return { postfix: postfix.join(" "), prefix: r.pre, infix: r.s, value: Number.isFinite(r.val) ? String(Number(r.val.toPrecision(12))) : "— (has letters)", steps: mode === 0 ? steps.join("\n") : "—" };
};

export const techSecCustomCalculators: Record<string, Calc> = {
  "cvss-3-1-calculator": cvss31,
  "cvss-4-calculator": cvss4,
  "password-entropy-calculator": passwordEntropy,
  "hash-calculator": hashCalc,
  "unix-timestamp-calculator": unixTimestamp,
  "discord-permissions-calculator": discordPermissions,
  "sms-segment-calculator": smsSegments,
  "infix-postfix-calculator": infixPostfix,
};
