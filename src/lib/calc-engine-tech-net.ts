/**
 * Batch: Tech keyword check (15 Nov 2026, Claude outputs/Tech_Keyword_Check.md) — networking & IT,
 * 12 tools for Science > Computer, Network & IT Calculators.
 *
 * Near-namesakes kept apart on purpose:
 *  - subnet-calculator = one IPv4 address + mask → its network. vlsm-calculator = carve one block
 *    into several subnets sized by host count. supernet-calculator = the opposite: many networks →
 *    one summary route. ipv6-subnet-calculator = 128-bit prefixes (BigInt maths).
 *  - uptime-sla-calculator = availability % ↔ allowed downtime (and series/parallel systems). The
 *    existing reliability-calculator does MTBF/FIT, and downtime-cost-calculator does money.
 *  - iops-calculator = RAID performance with write penalty. raid-calculator (existing) = capacity.
 *  - network-latency-calculator = distance/medium/hops → delay; download-time (existing) = file ÷ speed.
 *
 * Methods:
 *  - VoIP: payload = codec bitrate × packet time; + 40 B IP/UDP/RTP; + layer-2 header (Ethernet 18 B,
 *    or 38 B counting preamble and inter-frame gap). G.711 at 20 ms on Ethernet = 87.2 kbps (Cisco).
 *  - PoE power at the switch (PSE) vs at the device (PD): 802.3af 15.4/12.95 W, 802.3at 30/25.5 W,
 *    802.3bt Type 3 60/51 W, Type 4 90/71.3 W. Device watts are scaled by PSE/PD for cable loss.
 *  - Propagation speed: fibre ≈ 204,190 km/s (n ≈ 1.468), copper ≈ 0.66c, radio = c. GEO satellite
 *    adds 2 × 35,786 km each way.
 *  - RAID write penalty: RAID 0 = 1, RAID 1/10 = 2, RAID 5 = 4, RAID 6 = 6, RAID-Z1 = 4, RAID-Z2 = 6.
 *    Functional IOPS = raw × read% + raw × write% ÷ penalty.
 *  - Cron: standard 5-field Vixie cron. When day-of-month and day-of-week are both restricted, a day
 *    matches if EITHER matches. Times are shown in the time zone of the schedule (no DST shift).
 */

import { type TrvCalculator as Calc, InputError, num, pos, pick, txt, r2, nfmt, dayText, dayParts, dateIn } from "./trv-core";

// ------------------------------------------------------------------ IPv4 helpers
export function parseIp(s: string): number {
  const p = s.trim().split(".");
  if (p.length !== 4) throw new InputError(`"${s}" isn't an IPv4 address — use four numbers like 192.168.1.10.`);
  let n = 0;
  for (const part of p) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) throw new InputError(`"${s}" isn't a valid IPv4 address — each part must be 0–255.`);
    n = n * 256 + Number(part);
  }
  return n;
}
export const ipText = (n: number) => [24, 16, 8, 0].map((s) => Math.floor(n / 2 ** s) % 256).join(".");
const maskOf = (p: number) => (p === 0 ? 0 : (2 ** 32 - 2 ** (32 - p)));
/** "24", "/24" or "255.255.255.0" → prefix length. */
export function parsePrefix(s: string): number {
  const t = s.trim().replace(/^\//, "");
  if (/^\d{1,2}$/.test(t)) {
    const p = Number(t);
    if (p > 32) throw new InputError("A CIDR prefix must be 0–32.");
    return p;
  }
  const m = parseIp(t);
  for (let p = 0; p <= 32; p++) if (maskOf(p) === m) return p;
  throw new InputError(`"${s}" isn't a valid subnet mask — the 1 bits must be continuous (e.g. 255.255.255.0).`);
}
/** "10.0.0.5/24" or address + separate mask. */
function ipAndPrefix(a: string, m: string): [number, number] {
  if (a.includes("/")) { const [ip, p] = a.split("/"); return [parseIp(ip), parsePrefix(p)]; }
  if (!m.trim()) throw new InputError("Enter a subnet mask or CIDR prefix (e.g. 24 or 255.255.255.0), or type the address as 192.168.1.10/24.");
  return [parseIp(a), parsePrefix(m)];
}
const netOf = (ip: number, p: number) => ip - (ip % 2 ** (32 - p));
const bin32 = (n: number) => n.toString(2).padStart(32, "0").replace(/(.{8})(?!$)/g, "$1.");
function ipClass(ip: number) {
  const a = Math.floor(ip / 2 ** 24);
  return a < 128 ? "A" : a < 192 ? "B" : a < 224 ? "C" : a < 240 ? "D (multicast)" : "E (reserved)";
}
function ipType(ip: number) {
  const inR = (net: string, p: number) => netOf(ip, p) === parseIp(net);
  if (inR("10.0.0.0", 8) || inR("172.16.0.0", 12) || inR("192.168.0.0", 16)) return "Private (RFC 1918)";
  if (inR("127.0.0.0", 8)) return "Loopback";
  if (inR("169.254.0.0", 16)) return "Link-local (APIPA)";
  if (inR("100.64.0.0", 10)) return "Carrier-grade NAT (RFC 6598)";
  if (inR("224.0.0.0", 4)) return "Multicast";
  if (inR("240.0.0.0", 4)) return "Reserved";
  return "Public";
}
function hostRange(net: number, p: number) {
  const size = 2 ** (32 - p);
  const bc = net + size - 1;
  if (p === 32) return { first: net, last: net, usable: 1, bc };
  if (p === 31) return { first: net, last: bc, usable: 2, bc };
  return { first: net + 1, last: bc - 1, usable: size - 2, bc };
}

export const subnet: Calc = (v) => {
  const [ip, p] = ipAndPrefix(txt(v, "ip"), txt(v, "mask"));
  const net = netOf(ip, p);
  const h = hostRange(net, p);
  const mask = maskOf(p);
  return {
    network: `${ipText(net)}/${p}`, range: `${ipText(h.first)} – ${ipText(h.last)}`, broadcast: p >= 31 ? "none (/31 and /32 have no broadcast)" : ipText(h.bc),
    usable: h.usable, total: 2 ** (32 - p), mask: ipText(mask), wildcard: ipText(2 ** 32 - 1 - mask), cidr: `/${p}`,
    cls: ipClass(ip), type: ipType(ip), binary: bin32(mask), ipBinary: bin32(ip),
  };
};

// ------------------------------------------------------------------ VLSM
export const vlsm: Calc = (v) => {
  const raw = txt(v, "network");
  if (!raw.includes("/")) throw new InputError("Enter the starting block with its prefix, e.g. 192.168.1.0/24.");
  const [ip, p] = ipAndPrefix(raw, "");
  const base = netOf(ip, p), end = base + 2 ** (32 - p);
  const needs = txt(v, "hosts").split(/[\s,;]+/).filter(Boolean).map((x) => {
    const n = Number(x);
    if (!Number.isInteger(n) || n < 1) throw new InputError(`"${x}" isn't a host count — use whole numbers like 50, 20, 10.`);
    return n;
  });
  if (!needs.length) throw new InputError("Enter at least one host count.");
  const order = needs.map((n, i) => ({ n, i })).sort((a, b) => b.n - a.n);
  let cur = base;
  const lines: string[] = [];
  let used = 0;
  for (const { n, i } of order) {
    let q = 32;
    while (q > 0 && 2 ** (32 - q) - 2 < n) q--;
    const size = 2 ** (32 - q);
    if (cur % size) cur += size - (cur % size);
    if (cur + size > end) throw new InputError(`Not enough room: subnet ${i + 1} (${n} hosts) doesn't fit in ${ipText(base)}/${p}. Use a bigger block.`);
    lines.push(`Subnet ${i + 1} (${n} hosts): ${ipText(cur)}/${q} — hosts ${ipText(cur + 1)}–${ipText(cur + size - 2)}, broadcast ${ipText(cur + size - 1)}, ${size - 2} usable`);
    cur += size;
    used += size;
  }
  const total = 2 ** (32 - p);
  return { table: lines.join("\n"), used, free: total - used, pctUsed: r2((used / total) * 100), next: cur < end ? `${ipText(cur)}` : "none — the block is full", count: needs.length };
};

// ------------------------------------------------------------------ Supernet / route summary
export const supernet: Calc = (v) => {
  const items = txt(v, "networks").split(/[\s,;]+/).filter(Boolean);
  if (items.length < 2) throw new InputError("Enter at least two networks, e.g. 192.168.0.0/24, 192.168.1.0/24.");
  const nets = items.map((s) => {
    const [a, pp] = s.split("/");
    const p = pp === undefined ? 32 : parsePrefix(pp);
    const n = netOf(parseIp(a), p);
    return { lo: n, hi: n + 2 ** (32 - p) - 1, p };
  });
  const lo = Math.min(...nets.map((n) => n.lo)), hi = Math.max(...nets.map((n) => n.hi));
  let p = 32;
  while (p > 0 && netOf(lo, p) + 2 ** (32 - p) - 1 < hi) p--;
  while (p > 0 && netOf(lo, p) !== netOf(hi, p)) p--;
  const sNet = netOf(lo, p), size = 2 ** (32 - p);
  const covered = nets.reduce((s, n) => s + (n.hi - n.lo + 1), 0);
  const exact = covered === size && new Set(nets.map((n) => n.lo)).size === nets.length;
  return { summary: `${ipText(sNet)}/${p}`, mask: ipText(maskOf(p)), range: `${ipText(sNet)} – ${ipText(sNet + size - 1)}`, addresses: size, exact: exact ? "Yes — the summary covers exactly these networks" : `No — it also covers ${nfmt(size - covered)} address(es) you didn't list`, count: nets.length };
};

// ------------------------------------------------------------------ IPv6
function parseIp6(s: string): bigint {
  let t = s.trim().toLowerCase();
  if (!/^[0-9a-f:.]+$/.test(t)) throw new InputError(`"${s}" isn't an IPv6 address.`);
  if (t.includes(".")) {
    const i = t.lastIndexOf(":");
    const v4 = parseIp(t.slice(i + 1));
    t = `${t.slice(0, i)}:${Math.floor(v4 / 65536).toString(16)}:${(v4 % 65536).toString(16)}`;
  }
  const dbl = t.split("::");
  if (dbl.length > 2) throw new InputError("An IPv6 address can only contain one \"::\".");
  const head = dbl[0] ? dbl[0].split(":") : [];
  const tail = dbl.length === 2 && dbl[1] ? dbl[1].split(":") : [];
  const fill = dbl.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0 || (dbl.length === 1 && head.length !== 8)) throw new InputError(`"${s}" must have 8 groups (or use :: to skip zeros).`);
  const groups = [...head, ...Array(fill).fill("0"), ...tail];
  let n = BigInt(0);
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) throw new InputError(`"${g}" isn't a valid IPv6 group (1–4 hex digits).`);
    n = n * BigInt(65536) + BigInt(parseInt(g, 16));
  }
  return n;
}
function ip6Full(n: bigint) {
  const g: string[] = [];
  for (let i = 0; i < 8; i++) { g.unshift((n % BigInt(65536)).toString(16).padStart(4, "0")); n /= BigInt(65536); }
  return g.join(":");
}
function ip6Short(n: bigint) {
  const g = ip6Full(n).split(":").map((x) => x.replace(/^0+(?=.)/, ""));
  let best = -1, len = 0;
  for (let i = 0; i < 8; ) {
    if (g[i] === "0") { let j = i; while (j < 8 && g[j] === "0") j++; if (j - i > len && j - i > 1) { best = i; len = j - i; } i = j; } else i++;
  }
  if (best < 0) return g.join(":");
  return `${g.slice(0, best).join(":")}::${g.slice(best + len).join(":")}`;
}
const big2 = (e: number) => BigInt(2) ** BigInt(e);
const bigText = (b: bigint) => {
  const s = b.toString();
  return s.length > 15 ? `${s.slice(0, 1)}.${s.slice(1, 4)} × 10^${s.length - 1} (${s.replace(/\B(?=(\d{3})+(?!\d))/g, ",")})` : s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
export const ipv6Subnet: Calc = (v) => {
  const raw = txt(v, "ip");
  const [a, pp] = raw.includes("/") ? raw.split("/") : [raw, txt(v, "prefix")];
  const p = Number(String(pp).replace("/", ""));
  if (!Number.isInteger(p) || p < 0 || p > 128) throw new InputError("Enter an IPv6 prefix length from 0 to 128 (e.g. 64).");
  const ip = parseIp6(a);
  const size = big2(128 - p);
  const net = ip - (ip % size);
  const last = net + size - BigInt(1);
  const sub = Math.round(pos(v.newPrefix, 64));
  const subnets = sub >= p && sub <= 128 ? bigText(big2(sub - p)) : "— (new prefix must be ≥ the current one)";
  const type = ip6Full(ip).startsWith("fe8") || ip6Full(ip).startsWith("fe9") || ip6Full(ip).startsWith("fea") || ip6Full(ip).startsWith("feb") ? "Link-local (fe80::/10)" : ip6Full(ip).startsWith("fc") || ip6Full(ip).startsWith("fd") ? "Unique local (fc00::/7)" : ip6Full(ip).startsWith("2") || ip6Full(ip).startsWith("3") ? "Global unicast (2000::/3)" : ip6Full(ip).startsWith("ff") ? "Multicast (ff00::/8)" : ip === BigInt(1) ? "Loopback (::1)" : "Other / reserved";
  return { network: `${ip6Short(net)}/${p}`, first: ip6Short(net), last: ip6Short(last), addresses: bigText(size), subnets, expanded: ip6Full(ip), compressed: ip6Short(ip), type };
};

// ------------------------------------------------------------------ chmod
const RWX = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];
export const chmod: Calc = (v) => {
  const s = txt(v, "mode").replace(/^-/, "");
  let special = 0, d: number[];
  if (/^[0-7]{3,4}$/.test(s)) {
    const ds = s.split("").map(Number);
    if (ds.length === 4) special = ds.shift()!;
    d = ds;
  } else if (/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(s)) {
    d = [0, 3, 6].map((i) => (s[i] === "r" ? 4 : 0) + (s[i + 1] === "w" ? 2 : 0) + (/[xst]/.test(s[i + 2]) ? 1 : 0));
    special = (/[sS]/.test(s[2]) ? 4 : 0) + (/[sS]/.test(s[5]) ? 2 : 0) + (/[tT]/.test(s[8]) ? 1 : 0);
  } else throw new InputError("Enter an octal mode like 755 or 4755, or a symbolic one like rwxr-xr-x.");
  const sym = d.map((x) => RWX[x].split(""));
  if (special & 4) sym[0][2] = sym[0][2] === "x" ? "s" : "S";
  if (special & 2) sym[1][2] = sym[1][2] === "x" ? "s" : "S";
  if (special & 1) sym[2][2] = sym[2][2] === "x" ? "t" : "T";
  const who = ["Owner", "Group", "Others"].map((w, i) => `${w}: ${[d[i] & 4 ? "read" : "", d[i] & 2 ? "write" : "", d[i] & 1 ? "execute" : ""].filter(Boolean).join(", ") || "no access"}`).join("\n");
  const octal = `${special ? special : ""}${d.join("")}`;
  const um = txt(v, "umask");
  let umaskText = "—";
  if (um) {
    if (!/^0?[0-7]{3}$/.test(um)) throw new InputError("A umask is 3 octal digits, like 022 or 0077.");
    const u = um.slice(-3).split("").map(Number);
    umaskText = `files ${u.map((x) => 6 & ~x).join("")} (${u.map((x) => RWX[6 & ~x]).join("")}), folders ${u.map((x) => 7 & ~x).join("")} (${u.map((x) => RWX[7 & ~x]).join("")})`;
  }
  return { octal, symbolic: sym.map((x) => x.join("")).join(""), command: `chmod ${octal} filename`, who, special: [special & 4 ? "setuid" : "", special & 2 ? "setgid" : "", special & 1 ? "sticky bit" : ""].filter(Boolean).join(", ") || "none", umask: umaskText };
};

// ------------------------------------------------------------------ cron
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DOW_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function cronField(f: string, lo: number, hi: number, names: string[] = [], nameBase = 0): { set: Set<number>; star: boolean } {
  const set = new Set<number>();
  const val = (x: string) => {
    const i = names.indexOf(x.toUpperCase());
    const n = i >= 0 ? i + nameBase : Number(x);
    if (!Number.isInteger(n) || n < lo || n > (hi === 6 ? 7 : hi)) throw new InputError(`"${x}" is out of range in "${f}" (allowed ${lo}–${hi}).`);
    return hi === 6 && n === 7 ? 0 : n;
  };
  for (const part of f.split(",")) {
    const [rng, stepS] = part.split("/");
    const step = stepS === undefined ? 1 : Number(stepS);
    if (!Number.isInteger(step) || step < 1) throw new InputError(`Bad step "/${stepS}" in "${f}".`);
    let a: number, b: number;
    if (rng === "*") { a = lo; b = hi; } else if (rng.includes("-")) { const [x, y] = rng.split("-"); a = val(x); b = val(y); if (hi === 6 && y === "7") b = 7; } else { a = val(rng); b = stepS === undefined ? a : hi; }
    for (let x = a; x <= b; x += step) set.add(hi === 6 && x === 7 ? 0 : x);
  }
  return { set, star: f === "*" || f === "?" };
}
const MACROS: Record<string, string> = { "@yearly": "0 0 1 1 *", "@annually": "0 0 1 1 *", "@monthly": "0 0 1 * *", "@weekly": "0 0 * * 0", "@daily": "0 0 * * *", "@midnight": "0 0 * * *", "@hourly": "0 * * * *" };
export function parseCron(expr: string) {
  const e = MACROS[expr.trim().toLowerCase()] ?? expr.trim();
  const f = e.replace(/\?/g, "*").split(/\s+/);
  if (f.length !== 5) throw new InputError("A cron expression has 5 fields: minute hour day-of-month month day-of-week (e.g. */15 9-17 * * 1-5).");
  return { f, min: cronField(f[0], 0, 59), hour: cronField(f[1], 0, 23), dom: cronField(f[2], 1, 31), mon: cronField(f[3], 1, 12, MON, 1), dow: cronField(f[4], 0, 6, DOW, 0) };
}
const two = (n: number) => String(n).padStart(2, "0");
function listText(set: Set<number>, fmt: (n: number) => string) { return [...set].sort((a, b) => a - b).map(fmt).join(", "); }
export const cronExpression: Calc = (v) => {
  const c = parseCron(txt(v, "expr"));
  const [fm, fh] = c.f;
  let time: string;
  if (c.min.set.size === 1 && c.hour.set.size === 1) time = `at ${two([...c.hour.set][0])}:${two([...c.min.set][0])}`;
  else if (c.min.star && c.hour.star) time = "every minute";
  else if (/^\*\/\d+$/.test(fm) && c.hour.star) time = `every ${fm.slice(2)} minutes`;
  else if (/^\*\/\d+$/.test(fm)) time = `every ${fm.slice(2)} minutes, during hour(s) ${listText(c.hour.set, two)}`;
  else if (c.hour.star) time = `at minute ${listText(c.min.set, String)} of every hour`;
  else if (c.min.set.size === 1) time = `at minute ${[...c.min.set][0]} past hour(s) ${listText(c.hour.set, two)}${/^\*\/\d+$/.test(fh) ? ` (every ${fh.slice(2)} hours)` : ""}`;
  else time = `at minute(s) ${listText(c.min.set, String)} of hour(s) ${listText(c.hour.set, two)}`;
  const parts = [time];
  if (!c.dom.star) parts.push(`on day ${listText(c.dom.set, String)} of the month`);
  if (!c.dow.star) parts.push(`${c.dom.star ? "on" : "or on"} ${listText(c.dow.set, (n) => DOW_FULL[n])}`);
  if (!c.mon.star) parts.push(`in ${listText(c.mon.set, (n) => MON_FULL[n - 1])}`);
  // next runs
  const start = dateIn(v, "start", Math.floor(Date.now() / 86400000));
  const runs: string[] = [];
  for (let d = start; d < start + 366 * 8 && runs.length < 5; d++) {
    const { m, d: dd } = dayParts(d);
    if (!c.mon.set.has(m)) continue;
    const dow = ((d % 7) + 7 + 4) % 7;
    const domOk = c.dom.set.has(dd), dowOk = c.dow.set.has(dow);
    const dayOk = c.dom.star && c.dow.star ? true : c.dom.star ? dowOk : c.dow.star ? domOk : domOk || dowOk;
    if (!dayOk) continue;
    for (const h of [...c.hour.set].sort((a, b) => a - b)) {
      for (const mi of [...c.min.set].sort((a, b) => a - b)) {
        runs.push(`${dayText(d)} ${two(h)}:${two(mi)}`);
        if (runs.length >= 5) break;
      }
      if (runs.length >= 5) break;
    }
  }
  const perDay = c.min.set.size * c.hour.set.size;
  return { plain: parts.join(", ").replace(/^./, (x) => x.toUpperCase()), next: runs.join("\n") || "never (no matching date in the next 8 years)", perDay, fields: `minute: ${c.f[0]} | hour: ${c.f[1]} | day of month: ${c.f[2]} | month: ${c.f[3]} | day of week: ${c.f[4]}` };
};
export const networkLatency: Calc = (v) => {
  const km = pos(v.km), med = pick(v.medium, 4);
  const speed = [204190, 0.66 * 299792.458, 299792.458, 299792.458][med];
  const path = km + (med === 3 ? 2 * 35786 : 0);
  const prop = (path / speed) * 1000;
  const mbps = pos(v.mbps, 100), bytes = pos(v.packet, 1500), hops = Math.round(pos(v.hops, 0)), perHop = pos(v.hopMs, 0);
  if (mbps <= 0) throw new InputError("Enter a link speed above 0 Mbps.");
  const ser = (bytes * 8) / (mbps * 1e6) * 1000 * (hops + 1);
  const oneWay = prop + ser + hops * perHop;
  const rtt = 2 * oneWay;
  const bdp = (mbps * 1e6 * (rtt / 1000)) / 8;
  const win = pos(v.window, 64) * 1024;
  const maxTcp = rtt > 0 ? Math.min(mbps, (win * 8) / (rtt / 1000) / 1e6) : mbps;
  return { rtt: r2(rtt), oneWay: r2(oneWay), prop: r2(prop), ser: r2(ser), queue: r2(hops * perHop), bdp: `${nfmt(bdp / 1024, 1)} KB — the TCP window needed to fill the link`, tcp: r2(maxTcp) };
};

// ------------------------------------------------------------------ VoIP bandwidth
export const CODECS: [string, number, number][] = [["G.711 (64 kbps)", 64, 20], ["G.729 (8 kbps)", 8, 20], ["G.722 (64 kbps, HD voice)", 64, 20], ["G.726 (32 kbps)", 32, 20], ["iLBC (15.2 kbps)", 15.2, 20], ["Opus (24 kbps, typical)", 24, 20], ["GSM 06.10 (13 kbps)", 13, 20]];
export const L2 = ["Ethernet (18 bytes)", "Ethernet incl. preamble & gap (38 bytes)", "Wi-Fi 802.11 (≈ 34 bytes)", "None — IP only", "PPPoE over Ethernet (26 bytes)"];
const L2B = [18, 38, 34, 0, 26];
export const voipBandwidth: Calc = (v) => {
  const [, kbps] = CODECS[pick(v.codec, CODECS.length)];
  const ptime = pos(v.ptime, 20);
  if (ptime <= 0) throw new InputError("Packet time must be above 0 ms (20 ms is standard).");
  const calls = Math.max(1, Math.round(pos(v.calls, 1)));
  const payload = (kbps * 1000 * (ptime / 1000)) / 8;
  const pps = 1000 / ptime;
  const ipHdr = 40, l2 = L2B[pick(v.l2, L2B.length)];
  const perCall = ((payload + ipHdr + l2) * 8 * pps) / 1000;
  return { perCall: r2(perCall), total: r2(perCall * calls), totalMbps: r2((perCall * calls) / 1000), payload: r2(payload), pps: r2(pps), overhead: r2(((ipHdr + l2) / (payload + ipHdr + l2)) * 100), both: `${nfmt(perCall * calls, 1)} kbps in each direction (calls are full-duplex)` };
};

// ------------------------------------------------------------------ PoE budget
export const POE_STD: [string, number, number][] = [["802.3af PoE (Type 1)", 15.4, 12.95], ["802.3at PoE+ (Type 2)", 30, 25.5], ["802.3bt PoE++ Type 3", 60, 51], ["802.3bt PoE++ Type 4", 90, 71.3]];
export const poe: Calc = (v) => {
  const devs = txt(v, "devices").split(/[\s,;]+/).filter(Boolean).map((x) => { const n = Number(x); if (!Number.isFinite(n) || n < 0) throw new InputError(`"${x}" isn't a wattage.`); return n; });
  if (!devs.length) throw new InputError("Enter the power each device draws in watts, separated by commas.");
  const [name, pse, pd] = POE_STD[pick(v.std, POE_STD.length)];
  const budget = pos(v.budget, 370);
  const over = devs.filter((w) => w > pd).length;
  const psePower = devs.reduce((s, w) => s + Math.min(w, pd) * (pse / pd), 0);
  const left = budget - psePower;
  return { load: r2(psePower), left: r2(left), used: budget > 0 ? r2((psePower / budget) * 100) : 0, verdict: over ? `${over} device(s) need more than ${pd} W — use a higher PoE standard` : left >= 0 ? "Fits the switch budget" : "Over budget — use a bigger PoE budget or move devices", devices: devs.length, deviceTotal: r2(devs.reduce((s, w) => s + w, 0)), perPort: `${name}: up to ${pse} W per port at the switch, ${pd} W at the device` };
};

// ------------------------------------------------------------------ uptime / SLA
function dur(sec: number) {
  if (sec < 1) return `${(sec * 1000).toFixed(0)} ms`;
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = Math.round(sec % 60);
  return [d ? `${d} d` : "", h ? `${h} h` : "", m ? `${m} min` : "", s || (!d && !h && !m) ? `${s} s` : ""].filter(Boolean).join(" ");
}
export const uptimeSla: Calc = (v) => {
  const a = num(v.sla, 99.9);
  if (a <= 0 || a > 100) throw new InputError("Enter an availability between 0 and 100%.");
  const down = 1 - a / 100;
  const Y = 365.25 * 86400;
  const nines = down > 0 ? -Math.log10(down) : Infinity;
  const actualMin = pos(v.actual, 0);
  const actual = 100 - (actualMin * 60) / (Y / 12) * 100;
  const comps = txt(v, "comps").split(/[\s,;]+/).filter(Boolean).map((x) => { const n = Number(x.replace("%", "")); if (!(n > 0 && n <= 100)) throw new InputError(`"${x}" isn't a percentage.`); return n / 100; });
  const series = comps.length ? comps.reduce((p, x) => p * x, 1) * 100 : NaN;
  const parallel = comps.length ? (1 - comps.reduce((p, x) => p * (1 - x), 1)) * 100 : NaN;
  return {
    year: dur(down * Y), month: dur((down * Y) / 12), week: dur(down * 7 * 86400), day: dur(down * 86400), quarter: dur((down * Y) / 4),
    nines: Number.isFinite(nines) ? r2(nines) : "∞ (100%)",
    actual: actualMin > 0 ? `${actual.toFixed(4)}% — ${actual >= a ? "SLA met" : "SLA missed"}` : "—",
    series: comps.length ? `${series.toFixed(4)}% (all parts must work)` : "—",
    parallel: comps.length ? `${parallel.toFixed(6)}% (any one part is enough)` : "—",
  };
};

// ------------------------------------------------------------------ IOPS
export const DRIVES: [string, number][] = [["7,200 rpm HDD (≈ 80 IOPS)", 80], ["10,000 rpm HDD (≈ 140 IOPS)", 140], ["15,000 rpm HDD (≈ 180 IOPS)", 180], ["SATA SSD (≈ 50,000 IOPS)", 50000], ["NVMe SSD (≈ 300,000 IOPS)", 300000], ["Custom (enter below)", 0]];
export const RAID_LV: [string, number][] = [["RAID 0", 1], ["RAID 1", 2], ["RAID 10", 2], ["RAID 5", 4], ["RAID 6", 6], ["RAID-Z1 (ZFS)", 4], ["RAID-Z2 (ZFS)", 6], ["RAID-Z3 (ZFS)", 8]];
export const iops: Calc = (v) => {
  const n = Math.max(1, Math.round(pos(v.drives, 4)));
  const di = pick(v.drive, DRIVES.length);
  const per = di === DRIVES.length - 1 ? pos(v.custom, 0) : DRIVES[di][1];
  if (per <= 0) throw new InputError("Enter the IOPS of one drive.");
  const [lv, pen] = RAID_LV[pick(v.raid, RAID_LV.length)];
  const rd = Math.min(100, pos(v.read, 70)) / 100;
  const raw = n * per;
  const eff = raw * rd + (raw * (1 - rd)) / pen;
  const bs = pos(v.block, 4);
  return { eff: Math.round(eff), raw: Math.round(raw), reads: Math.round(eff * rd), writes: Math.round(eff * (1 - rd)), mbps: r2((eff * bs) / 1024), penalty: `${lv}: write penalty ${pen}`, need: pos(v.target) > 0 ? `${Math.ceil(pos(v.target) / (per * (rd + (1 - rd) / pen)))} drives for ${nfmt(pos(v.target))} IOPS` : "—" };
};

// ------------------------------------------------------------------ byte / data size
export const BYTE_UNITS: [string, number][] = [["bit (b)", 1 / 8], ["byte (B)", 1], ["kilobyte (KB, 1000 B)", 1e3], ["megabyte (MB)", 1e6], ["gigabyte (GB)", 1e9], ["terabyte (TB)", 1e12], ["petabyte (PB)", 1e15], ["kibibyte (KiB, 1024 B)", 1024], ["mebibyte (MiB)", 1024 ** 2], ["gibibyte (GiB)", 1024 ** 3], ["tebibyte (TiB)", 1024 ** 4], ["pebibyte (PiB)", 1024 ** 5], ["kilobit (Kb)", 125], ["megabit (Mb)", 125000], ["gigabit (Gb)", 1.25e8]];
const g = (x: number) => (x === 0 ? "0" : Math.abs(x) >= 1e15 || Math.abs(x) < 1e-6 ? x.toExponential(4) : nfmt(Number(x.toPrecision(10)), x < 1 ? 8 : 4).replace(/\.?0+$/, ""));
export const byteCalc: Calc = (v) => {
  const val = num(v.value, 1);
  const bytes = val * BYTE_UNITS[pick(v.unit, BYTE_UNITS.length)][1];
  const at = (i: number) => g(bytes / BYTE_UNITS[i][1]);
  return {
    bytes: g(bytes), bits: g(bytes * 8),
    decimal: `${at(2)} KB | ${at(3)} MB | ${at(4)} GB | ${at(5)} TB | ${at(6)} PB`,
    binary: `${at(7)} KiB | ${at(8)} MiB | ${at(9)} GiB | ${at(10)} TiB | ${at(11)} PiB`,
    bitsLine: `${at(12)} Kb | ${at(13)} Mb | ${at(14)} Gb`,
    drive: `A drive sold as ${at(4)} GB shows as ${at(9)} GiB in Windows`,
  };
};

export const techNetCustomCalculators: Record<string, Calc> = {
  "subnet-calculator": subnet,
  "vlsm-calculator": vlsm,
  "supernet-calculator": supernet,
  "ipv6-subnet-calculator": ipv6Subnet,
  "chmod-calculator": chmod,
  "cron-expression-calculator": cronExpression,
  "network-latency-calculator": networkLatency,
  "voip-bandwidth-calculator": voipBandwidth,
  "poe-calculator": poe,
  "uptime-sla-calculator": uptimeSla,
  "iops-calculator": iops,
  "byte-calculator": byteCalc,
};
