/**
 * Batch: big generic keyword check (16 Nov 2026) — ten Arts & Entertainment > Tarot, Astrology &
 * Fun tools: gematria, D&D point buy, D&D hit points, D&D encounter XP, K/D ratio, Minecraft
 * stacks, Minecraft circle, Korean age, half birthday and US flag dimensions.
 *
 * Near-namesakes kept apart on purpose:
 *  - gematria = letter-value sums of a word in several ciphers (English ordinal/reduction/reverse/
 *    ×6, "Jewish" Latin table, Hebrew, Greek). vowels-numerology (existing) = Pythagorean vowel sum.
 *  - dnd-point-buy / dnd-hp / dnd-encounter-xp = three different 5e rules (ability-score budget,
 *    class hit dice, DMG encounter budget). dnd-dpr (existing) = damage per round.
 *  - minecraft-stack = items ↔ stacks/shulkers/chests; minecraft-circle = block layout of a
 *    circle; minecraft-xp / minecraft-nether-portal (existing) do XP levels and coordinates.
 *  - korean-age = East Asian age reckoning; age-calculator (existing) = international age.
 *  - half-birthday = birthday + 6 months; age-calculator shows only the next full birthday.
 *  - flag-dimensions = US flag proportions (Executive Order 10834).
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, nfmt, sig, dayText, dateIn, dayParts, dayNum } from "./trv-core";

const today = () => Math.floor(Date.now() / 86400000);
const show = (x: number, s = 4) => (Number.isFinite(x) ? nfmt(sig(x, s), 6).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") : "—");
const pl = (n: number, w: string) => `${nfmt(n)} ${w}${n === 1 ? "" : "s"}`;

// ------------------------------------------------------------------ gematria
const JEW: Record<string, number> = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, k: 10, l: 20, m: 30, n: 40, o: 50, p: 60, q: 70, r: 80, s: 90, t: 100, u: 200, x: 300, y: 400, z: 500, j: 600, v: 700, w: 900 };
const HEB: Record<string, number> = { "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9, "י": 10, "כ": 20, "ך": 20, "ל": 30, "מ": 40, "ם": 40, "נ": 50, "ן": 50, "ס": 60, "ע": 70, "פ": 80, "ף": 80, "צ": 90, "ץ": 90, "ק": 100, "ר": 200, "ש": 300, "ת": 400 };
const GRK: Record<string, number> = { "α": 1, "β": 2, "γ": 3, "δ": 4, "ε": 5, "ϛ": 6, "ζ": 7, "η": 8, "θ": 9, "ι": 10, "κ": 20, "λ": 30, "μ": 40, "ν": 50, "ξ": 60, "ο": 70, "π": 80, "ϙ": 90, "ρ": 100, "σ": 200, "ς": 200, "τ": 300, "υ": 400, "φ": 500, "χ": 600, "ψ": 700, "ω": 800 };
export const gematria: Calc = (v) => {
  const raw = txt(v, "word");
  if (!raw) throw new InputError("Type a word, name or phrase.");
  const s = raw.normalize("NFD").replace(/[̀-֑ͯ-ׇ]/g, "").toLowerCase();
  const latin = [...s].filter((c) => c >= "a" && c <= "z");
  const ord = latin.reduce((a, c) => a + c.charCodeAt(0) - 96, 0);
  const red = latin.reduce((a, c) => a + (((c.charCodeAt(0) - 97) % 9) + 1), 0);
  const rev = latin.reduce((a, c) => a + 123 - c.charCodeAt(0), 0);
  const jew = latin.reduce((a, c) => a + (JEW[c] ?? 0), 0);
  const heb = [...s].reduce((a, c) => a + (HEB[c] ?? 0), 0), grk = [...s].reduce((a, c) => a + (GRK[c] ?? 0), 0);
  const dig = (n: number) => { while (n > 9) n = String(n).split("").reduce((a, d) => a + Number(d), 0); return n; };
  return {
    ordinal: latin.length ? `${ord}` : "— (no English letters)",
    reduction: latin.length ? `${red} (root ${dig(red)})` : "—",
    reverse: latin.length ? `${rev}` : "—",
    english: latin.length ? `${ord * 6}` : "—",
    jewish: latin.length ? `${jew}` : "—",
    hebrew: heb ? `${heb}` : "— (type Hebrew letters, e.g. חי = 18)",
    greek: grk ? `${grk}` : "— (type Greek letters for isopsephy)",
    letters: `${latin.length || [...s].filter((c) => HEB[c] || GRK[c]).length} letters counted`,
  };
};

// ------------------------------------------------------------------ D&D point buy
const PB_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const AB = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const mod = (x: number) => Math.floor((x - 10) / 2);
const sm = (x: number) => (x >= 0 ? `+${x}` : `−${-x}`);
export const dndPointBuy: Calc = (v) => {
  const budget = Math.round(num(v.budget, 27));
  const base = AB.map((a) => Math.round(num(v[a.toLowerCase()], 8)));
  const bon = AB.map((a) => Math.round(num(v[`b${a.toLowerCase()}`], 0)));
  base.forEach((b, i) => { if (b < 8 || b > 15) throw new InputError(`${AB[i]}: point-buy scores must be 8–15 before bonuses.`); });
  const spent = base.reduce((a, b) => a + PB_COST[b], 0), left = budget - spent;
  const fin = base.map((b, i) => b + bon[i]);
  return {
    left: left >= 0 ? `${left} of ${budget} points left` : `Over budget by ${-left} points`,
    spent: `${spent} points spent`,
    scores: fin.map((x, i) => `${AB[i]} ${x} (${sm(mod(x))})`).join(", "),
    total: `Modifier total ${sm(fin.reduce((a, x) => a + mod(x), 0))}`,
    costs: "Cost: 8 = 0, 9 = 1, 10 = 2, 11 = 3, 12 = 4, 13 = 5, 14 = 7, 15 = 9",
  };
};

// ------------------------------------------------------------------ D&D HP
export const HP_CLASSES: [string, number][] = [["Barbarian (d12)", 12], ["Fighter (d10)", 10], ["Paladin (d10)", 10], ["Ranger (d10)", 10], ["Artificer (d8)", 8], ["Bard (d8)", 8], ["Cleric (d8)", 8], ["Druid (d8)", 8], ["Monk (d8)", 8], ["Rogue (d8)", 8], ["Warlock (d8)", 8], ["Sorcerer (d6)", 6], ["Wizard (d6)", 6]];
export const HP_CLASS_LABELS = HP_CLASSES.map((c) => c[0]);
export const HP_METHODS = ["Fixed average after level 1 (PHB)", "Maximum every level"];
export const dndHp: Calc = (v) => {
  const [name, die] = HP_CLASSES[pick(v.cls, HP_CLASSES.length)], lvl = Math.round(num(v.level, 5)), con = Math.round(num(v.con, 14)), extra = num(v.extra, 0), maxAll = pick(v.method, 2) === 1;
  if (lvl < 1 || lvl > 20) throw new InputError("Level must be 1–20.");
  if (con < 1 || con > 30) throw new InputError("Constitution score must be 1–30.");
  const cm = mod(con), avg = die / 2 + 1;
  const hp = Math.max(lvl, die + cm + (lvl - 1) * ((maxAll ? die : avg) + cm) + extra * lvl);
  const lo = Math.max(lvl, die + cm + (lvl - 1) * (1 + cm) + extra * lvl), hi = die * lvl + cm * lvl + extra * lvl;
  return {
    hp: `${hp} hit points`,
    per: `Level 1: ${die} + ${cm} CON = ${die + cm}; each later level: ${maxAll ? die : avg} + ${cm} = ${(maxAll ? die : avg) + cm}${extra ? ` (+${extra} per level from feats/race)` : ""}`,
    range: `If rolled: ${lo}–${hi}`,
    dice: `${lvl}d${die} hit dice (${name})`,
    con: `CON ${con} → modifier ${sm(cm)}`,
  };
};

// ------------------------------------------------------------------ D&D encounter XP
const TH = [[25, 50, 75, 100], [50, 100, 150, 200], [75, 150, 225, 400], [125, 250, 375, 500], [250, 500, 750, 1100], [300, 600, 900, 1400], [350, 750, 1100, 1700], [450, 900, 1400, 2100], [550, 1100, 1600, 2400], [600, 1200, 1900, 2800], [800, 1600, 2400, 3600], [1000, 2000, 3000, 4500], [1100, 2200, 3400, 5100], [1250, 2500, 3800, 5700], [1400, 2800, 4300, 6400], [1600, 3200, 4800, 7200], [2000, 3900, 5900, 8800], [2100, 4200, 6300, 9500], [2400, 4900, 7300, 10900], [2800, 5700, 8500, 12700]];
export const CR: [string, number][] = [["None", 0], ["CR 0", 10], ["CR 1/8", 25], ["CR 1/4", 50], ["CR 1/2", 100], ...[200, 450, 700, 1100, 1800, 2300, 2900, 3900, 5000, 5900, 7200, 8400, 10000, 11500, 13000, 15000, 18000, 20000, 22000, 25000, 33000, 41000, 50000, 62000, 75000, 90000, 105000, 120000, 135000, 155000].map((x, i) => [`CR ${i + 1}`, x] as [string, number])];
export const CR_LABELS = CR.map((c) => c[0]);
const MULTS = [0.5, 1, 1.5, 2, 2.5, 3, 4];
export const dndEncounter: Calc = (v) => {
  const size = Math.round(num(v.party, 4)), lvl = Math.round(num(v.level, 5));
  if (size < 1 || size > 12) throw new InputError("Party size must be 1–12.");
  if (lvl < 1 || lvl > 20) throw new InputError("Character level must be 1–20.");
  let xp = 0, count = 0;
  for (const g of [1, 2, 3]) { const n = Math.max(0, Math.round(num(v[`n${g}`], 0))), c = CR[pick(v[`cr${g}`], CR.length)]; if (n && c[1]) { xp += n * c[1]; count += n; } }
  if (!count) throw new InputError("Add at least one monster (count and CR).");
  let mi = count === 1 ? 1 : count === 2 ? 2 : count <= 6 ? 3 : count <= 10 ? 4 : count <= 14 ? 5 : 6;
  if (size < 3) mi = Math.min(6, mi + 1); else if (size >= 6) mi = Math.max(0, mi - 1);
  const adj = xp * MULTS[mi], t = TH[lvl - 1].map((x) => x * size);
  const diff = adj >= t[3] ? "Deadly" : adj >= t[2] ? "Hard" : adj >= t[1] ? "Medium" : adj >= t[0] ? "Easy" : "Trivial (below Easy)";
  return {
    difficulty: diff,
    adjusted: `${nfmt(adj)} adjusted XP (× ${MULTS[mi]} for ${pl(count, "monster")})`,
    base: `${nfmt(xp)} XP total — ${nfmt(Math.floor(xp / size))} XP each for ${pl(size, "player")}`,
    thresholds: `Easy ${nfmt(t[0])} · Medium ${nfmt(t[1])} · Hard ${nfmt(t[2])} · Deadly ${nfmt(t[3])}`,
    rule: "Dungeon Master's Guide (2014) encounter-building rules",
  };
};

// ------------------------------------------------------------------ K/D ratio
export const kdRatio: Calc = (v) => {
  const k = Math.max(0, num(v.kills, 150)), d = Math.max(0, num(v.deaths, 100)), a = Math.max(0, num(v.assists, 60)), tgt = num(v.target, 2);
  const dd = d || 1, kd = k / dd, kda = (k + a) / dd, need = tgt > 0 ? Math.max(0, Math.ceil(tgt * d - k)) : 0;
  return {
    kd: show(kd, 3),
    kda: `${show(kda, 3)} ((K + A) ÷ D)`,
    kdaHalf: `${show((k + a / 2) / dd, 3)} ((K + A/2) ÷ D, used by some shooters)`,
    need: tgt > 0 ? (kd >= tgt ? `Already at ${show(tgt)} K/D or better` : `${nfmt(need)} more kills without dying to reach ${show(tgt)} K/D`) : "—",
    rate: k + d > 0 ? `You win ${show((k / (k + d)) * 100, 3)}% of your fights` : "—",
  };
};

// ------------------------------------------------------------------ Minecraft stacks
export const MC_STACK = ["64 (most blocks and items)", "16 (eggs, snowballs, signs, ender pearls)", "1 (tools, armour, potions)"];
const MC_N = [64, 16, 1];
export const minecraftStack: Calc = (v) => {
  const items = Math.round(num(v.items, 1000)), s = MC_N[pick(v.stack, 3)];
  if (items < 0) throw new InputError("Enter how many items you have.");
  const stacks = Math.floor(items / s), rem = items % s, slots = Math.ceil(items / s);
  return {
    stacks: `${pl(stacks, "stack")}${rem ? ` + ${rem}` : ""}`,
    slots: `${pl(slots, "inventory slot")}`,
    shulker: `${show(slots / 27, 4)} shulker boxes (27 slots each)`,
    chest: `${show(slots / 27, 4)} single chests or ${show(slots / 54, 4)} double chests`,
    inventory: `${show(slots / 36, 4)} full inventories (36 slots)`,
    shulkerChest: `${show(items / (s * 27 * 54), 4)} double chests full of full shulker boxes`,
  };
};

// ------------------------------------------------------------------ Minecraft circle
export const MCC_MODES = ["Filled circle", "Outline only (1 block thick)"];
export const minecraftCircle: Calc = (v) => {
  const d = Math.round(num(v.diameter, 15)), outline = pick(v.mode, 2) === 1;
  if (d < 3 || d > 301) throw new InputError("Diameter must be 3–301 blocks.");
  const c = (d - 1) / 2, r = d / 2;
  const fill = (x: number, y: number) => x >= 0 && y >= 0 && x < d && y < d && (x - c) ** 2 + (y - c) ** 2 <= r * r;
  let filled = 0, ring = 0;
  const rows: number[] = [];
  for (let y = 0; y < d; y++) {
    let w = 0;
    for (let x = 0; x < d; x++) if (fill(x, y)) { filled++; w++; if (!fill(x + 1, y) || !fill(x - 1, y) || !fill(x, y + 1) || !fill(x, y - 1)) ring++; }
    rows.push(w);
  }
  const half = rows.slice(0, Math.ceil(d / 2));
  return {
    blocks: outline ? `${nfmt(ring)} blocks (outline)` : `${nfmt(filled)} blocks (filled)`,
    rows: `Row widths from the top edge to the middle: ${half.join(", ")} (mirror for the bottom half)`,
    both: `Filled ${nfmt(filled)}, outline ${nfmt(ring)}`,
    stacks: `${show((outline ? ring : filled) / 64, 4)} stacks of 64`,
    sphere: `A sphere this wide is about ${nfmt(Math.round((4 / 3) * Math.PI * r ** 3))} blocks solid`,
  };
};

// ------------------------------------------------------------------ Korean age
export const koreanAge: Calc = (v) => {
  const b = dateIn(v, "birth", 11323), now = dateIn(v, "asof", today());
  if (b > now) throw new InputError("The birth date is after the 'as of' date.");
  const B = dayParts(b), N = dayParts(now);
  let intl = N.y - B.y; if (N.m < B.m || (N.m === B.m && N.d < B.d)) intl -= 1;
  return {
    korean: `${N.y - B.y + 1} (traditional Korean age, "se")`,
    international: `${intl} (international age — the official age in South Korea since June 2023)`,
    year: `${N.y - B.y} (year age, used for school entry, drinking and military service)`,
    chinese: `${N.y - B.y + 1} (Chinese xūsuì, approximate — it adds a year at Lunar New Year, not 1 January)`,
    next: `Traditional Korean age goes up by 1 on 1 January ${N.y + 1}`,
  };
};

// ------------------------------------------------------------------ half birthday
const addMonths = (day: number, n: number) => { const p = dayParts(day); const t = p.m - 1 + n, y = p.y + Math.floor(t / 12), m = (((t % 12) + 12) % 12) + 1; const dim = new Date(Date.UTC(y, m, 0)).getUTCDate(); return dayNum(y, m, Math.min(p.d, dim)); };
export const halfBirthday: Calc = (v) => {
  const b = dateIn(v, "birth", 11323), now = dateIn(v, "asof", today());
  if (b > now) throw new InputError("The birth date is after the 'as of' date.");
  let k = 1; while (addMonths(b, 12 * (k - 1) + 6) < now) k++;
  const next = addMonths(b, 12 * (k - 1) + 6), age = k - 1;
  const B = dayParts(b);
  return {
    next: dayText(next),
    until: next === now ? "Today! 🎉" : `${pl(next - now, "day")} away`,
    age: `You'll be ${age}½`,
    rule: `6 months after the ${B.d}${B.d % 10 === 1 && B.d !== 11 ? "st" : B.d % 10 === 2 && B.d !== 12 ? "nd" : B.d % 10 === 3 && B.d !== 13 ? "rd" : "th"} of the month${B.d > 28 ? " (moved to the last day of shorter months)" : ""}`,
    days: `Exactly 182.5 days after a birthday: ${dayText(Math.round(addMonths(b, 12 * age) + 182.5))}`,
  };
};

// ------------------------------------------------------------------ US flag dimensions
export const FL_UNITS = ["inches", "feet", "cm"];
export const flagDimensions: Calc = (v) => {
  const A = num(v.hoist, 36), u = FL_UNITS[pick(v.unit, 3)];
  if (!(A > 0)) throw new InputError("Enter the flag's height (hoist).");
  const f = (k: number) => `${show(A * k, 4)} ${u}`;
  return {
    fly: f(1.9),
    stripe: `${f(1 / 13)} each (13 stripes: 7 red, 6 white)`,
    union: `${f(7 / 13)} tall × ${f(0.76)} wide (covers the top 7 stripes)`,
    star: `${f(0.0616)} diameter (50 stars)`,
    spacing: `Rows ${f(0.054)} apart vertically, stars ${f(0.063)} apart horizontally`,
    ratio: "Official ratio 1 : 1.9 (Executive Order 10834). Store-bought 3×5 ft flags use 1 : 1.67.",
  };
};

export const bigFunCustomCalculators: Record<string, Calc> = {
  "gematria-calculator": gematria,
  "dnd-point-buy-calculator": dndPointBuy,
  "dnd-hp-calculator": dndHp,
  "dnd-encounter-xp-calculator": dndEncounter,
  "kd-ratio-calculator": kdRatio,
  "minecraft-stack-calculator": minecraftStack,
  "minecraft-circle-calculator": minecraftCircle,
  "korean-age-calculator": koreanAge,
  "half-birthday-calculator": halfBirthday,
  "flag-dimensions-calculator": flagDimensions,
};
