/**
 * Shared chemistry helpers for the Science batches: periodic table (IUPAC 2021 abridged standard
 * atomic weights; mass number of the longest-lived isotope for elements without one), a chemical
 * formula parser (nested ( ) [ ] { }, hydrates with · . or *, charges written ^2+ / ^-), an exact
 * equation balancer (rational null space with BigInt), and ground-state electron configurations
 * (Madelung order with the known exceptions).
 */

import { InputError } from "./sci-math-core";

const RAW =
  "H 1.008 Hydrogen|He 4.0026 Helium|Li 6.94 Lithium|Be 9.0122 Beryllium|B 10.81 Boron|C 12.011 Carbon|N 14.007 Nitrogen|O 15.999 Oxygen|F 18.998 Fluorine|Ne 20.180 Neon|" +
  "Na 22.990 Sodium|Mg 24.305 Magnesium|Al 26.982 Aluminium|Si 28.085 Silicon|P 30.974 Phosphorus|S 32.06 Sulfur|Cl 35.45 Chlorine|Ar 39.948 Argon|K 39.098 Potassium|Ca 40.078 Calcium|" +
  "Sc 44.956 Scandium|Ti 47.867 Titanium|V 50.942 Vanadium|Cr 51.996 Chromium|Mn 54.938 Manganese|Fe 55.845 Iron|Co 58.933 Cobalt|Ni 58.693 Nickel|Cu 63.546 Copper|Zn 65.38 Zinc|" +
  "Ga 69.723 Gallium|Ge 72.630 Germanium|As 74.922 Arsenic|Se 78.971 Selenium|Br 79.904 Bromine|Kr 83.798 Krypton|Rb 85.468 Rubidium|Sr 87.62 Strontium|Y 88.906 Yttrium|Zr 91.224 Zirconium|" +
  "Nb 92.906 Niobium|Mo 95.95 Molybdenum|Tc 98 Technetium|Ru 101.07 Ruthenium|Rh 102.91 Rhodium|Pd 106.42 Palladium|Ag 107.87 Silver|Cd 112.41 Cadmium|In 114.82 Indium|Sn 118.71 Tin|" +
  "Sb 121.76 Antimony|Te 127.60 Tellurium|I 126.90 Iodine|Xe 131.29 Xenon|Cs 132.91 Caesium|Ba 137.33 Barium|La 138.91 Lanthanum|Ce 140.12 Cerium|Pr 140.91 Praseodymium|Nd 144.24 Neodymium|" +
  "Pm 145 Promethium|Sm 150.36 Samarium|Eu 151.96 Europium|Gd 157.25 Gadolinium|Tb 158.93 Terbium|Dy 162.50 Dysprosium|Ho 164.93 Holmium|Er 167.26 Erbium|Tm 168.93 Thulium|Yb 173.05 Ytterbium|" +
  "Lu 174.97 Lutetium|Hf 178.49 Hafnium|Ta 180.95 Tantalum|W 183.84 Tungsten|Re 186.21 Rhenium|Os 190.23 Osmium|Ir 192.22 Iridium|Pt 195.08 Platinum|Au 196.97 Gold|Hg 200.59 Mercury|" +
  "Tl 204.38 Thallium|Pb 207.2 Lead|Bi 208.98 Bismuth|Po 209 Polonium|At 210 Astatine|Rn 222 Radon|Fr 223 Francium|Ra 226 Radium|Ac 227 Actinium|Th 232.04 Thorium|" +
  "Pa 231.04 Protactinium|U 238.03 Uranium|Np 237 Neptunium|Pu 244 Plutonium|Am 243 Americium|Cm 247 Curium|Bk 247 Berkelium|Cf 251 Californium|Es 252 Einsteinium|Fm 257 Fermium|" +
  "Md 258 Mendelevium|No 259 Nobelium|Lr 266 Lawrencium|Rf 267 Rutherfordium|Db 268 Dubnium|Sg 269 Seaborgium|Bh 270 Bohrium|Hs 277 Hassium|Mt 278 Meitnerium|Ds 281 Darmstadtium|" +
  "Rg 282 Roentgenium|Cn 285 Copernicium|Nh 286 Nihonium|Fl 289 Flerovium|Mc 290 Moscovium|Lv 293 Livermorium|Ts 294 Tennessine|Og 294 Oganesson";

export type Element = { z: number; sym: string; mass: number; name: string };
export const ELEMENTS: Element[] = RAW.split("|").map((r, i) => {
  const [sym, m, name] = r.split(" ");
  return { z: i + 1, sym, mass: Number(m), name };
});
const BY_SYM = new Map(ELEMENTS.map((e) => [e.sym, e]));
const BY_NAME = new Map(ELEMENTS.map((e) => [e.name.toLowerCase(), e]));
BY_NAME.set("aluminum", BY_SYM.get("Al")!);
BY_NAME.set("cesium", BY_SYM.get("Cs")!);
BY_NAME.set("sulphur", BY_SYM.get("S")!);

/** Find an element by symbol, name or atomic number. */
export function findElement(q: string): Element {
  const t = q.trim();
  if (/^\d+$/.test(t)) {
    const e = ELEMENTS[Number(t) - 1];
    if (e) return e;
  }
  const e = BY_SYM.get(t) ?? BY_SYM.get(t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()) ?? BY_NAME.get(t.toLowerCase());
  if (!e) throw new InputError(`Unknown element "${t}". Use a symbol (Fe), a name (iron) or an atomic number (26).`);
  return e;
}

export type Composition = { counts: Map<string, number>; charge: number };

/** Parse a formula like Ca(OH)2, CuSO4·5H2O, [Fe(CN)6]^3-, (NH4)3PO4. */
export function parseFormula(src: string): Composition {
  let f = src.replace(/\s+/g, "").replace(/[·•∙*]/g, ".");
  let charge = 0;
  const cm = f.match(/\^(\d*)([+-])$/) ?? f.match(/\{(\d*)([+-])\}$/);
  if (cm) {
    charge = (cm[1] ? Number(cm[1]) : 1) * (cm[2] === "+" ? 1 : -1);
    f = f.slice(0, cm.index);
  }
  if (!f) throw new InputError("Enter a chemical formula.");
  const parts = f.split(".");
  const total = new Map<string, number>();
  for (let pi = 0; pi < parts.length; pi++) {
    let p = parts[pi];
    let mult = 1;
    if (pi > 0) {
      const lead = p.match(/^(\d+(?:\.\d+)?)/);
      if (lead) {
        mult = Number(lead[1]);
        p = p.slice(lead[1].length);
      }
    }
    let i = 0;
    const group = (): Map<string, number> => {
      const m = new Map<string, number>();
      while (i < p.length) {
        const ch = p[i];
        if (ch === "(" || ch === "[" || ch === "{") {
          i++;
          const inner = group();
          const close = p[i];
          if (!close || !")]}".includes(close)) throw new InputError(`Unbalanced brackets in "${src}".`);
          i++;
          const n = readNum();
          inner.forEach((c, el) => m.set(el, (m.get(el) ?? 0) + c * n));
        } else if (ch === ")" || ch === "]" || ch === "}") return m;
        else if (/[A-Z]/.test(ch)) {
          let sym = ch;
          i++;
          if (i < p.length && /[a-z]/.test(p[i])) sym += p[i++];
          if (!BY_SYM.has(sym)) throw new InputError(`Unknown element symbol "${sym}" in "${src}". Symbols are case-sensitive (Co is cobalt, CO is carbon monoxide).`);
          const n = readNum();
          m.set(sym, (m.get(sym) ?? 0) + n);
        } else throw new InputError(`Unexpected character "${ch}" in "${src}".`);
      }
      return m;
    };
    const readNum = () => {
      const mm = p.slice(i).match(/^\d+(?:\.\d+)?/);
      if (!mm) return 1;
      i += mm[0].length;
      return Number(mm[0]);
    };
    const g = group();
    if (i < p.length) throw new InputError(`Unbalanced brackets in "${src}".`);
    g.forEach((c, el) => total.set(el, (total.get(el) ?? 0) + c * mult));
  }
  if (!total.size) throw new InputError("Enter a chemical formula.");
  return { counts: total, charge };
}

export const molarMassOf = (c: Composition) => {
  let m = 0;
  c.counts.forEach((n, el) => (m += n * BY_SYM.get(el)!.mass));
  return m;
};
export const formulaMass = (src: string) => molarMassOf(parseFormula(src));
export const elementMass = (sym: string) => BY_SYM.get(sym)!.mass;

// ---------- exact balancing ----------
type Q = [bigint, bigint];
const B0 = BigInt(0), B1 = BigInt(1);
const gcd = (a: bigint, b: bigint): bigint => {
  a = a < B0 ? -a : a;
  b = b < B0 ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
};
const norm = ([n, d]: Q): Q => {
  if (d < B0) [n, d] = [-n, -d];
  const g = gcd(n, d) || B1;
  return [n / g, d / g];
};
const sub = (a: Q, b: Q): Q => norm([a[0] * b[1] - b[0] * a[1], a[1] * b[1]]);
const mul = (a: Q, b: Q): Q => norm([a[0] * b[0], a[1] * b[1]]);
const div = (a: Q, b: Q): Q => norm([a[0] * b[1], a[1] * b[0]]);

export type Balanced = { coeffs: number[]; reactants: string[]; products: string[]; text: string; elements: string[] };
export function balanceEquation(eq: string): Balanced {
  const cleaned = eq.replace(/\^(\d*)([+-])/g, (_m, n, sgn) => `^${n}${sgn === "+" ? "P" : "M"}`);
  const sides = cleaned.split(/=|→|->|⟶|<=>|⇌/).map((x) => x.trim()).filter(Boolean);
  if (sides.length !== 2) throw new InputError("Write the equation with one arrow or = sign, e.g. H2 + O2 = H2O.");
  const restore = (x: string) => x.replace(/\^(\d*)P/g, "^$1+").replace(/\^(\d*)M/g, "^$1-");
  const strip = (x: string) => x.replace(/^\d+\s*/, "").trim();
  const reactants = sides[0].split("+").map((x) => strip(restore(x))).filter(Boolean);
  const products = sides[1].split("+").map((x) => strip(restore(x))).filter(Boolean);
  if (!reactants.length || !products.length) throw new InputError("Both sides need at least one species.");
  const species = [...reactants, ...products];
  if (species.length > 14) throw new InputError("Up to 14 species.");
  const comps = species.map(parseFormula);
  const els = Array.from(new Set(comps.flatMap((c) => Array.from(c.counts.keys()))));
  const rows: Q[][] = els.map((el) => comps.map((c, j) => [BigInt(Math.round((c.counts.get(el) ?? 0) * 1000)) * (j < reactants.length ? B1 : -B1), B1] as Q));
  if (comps.some((c) => c.charge)) rows.push(comps.map((c, j) => [BigInt(c.charge * 1000) * (j < reactants.length ? B1 : -B1), B1] as Q));
  const n = species.length, M = rows.map((r) => r.map(norm));
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < n && r < M.length; c++) {
    const p = M.findIndex((row, i) => i >= r && row[c][0] !== B0);
    if (p < 0) continue;
    [M[r], M[p]] = [M[p], M[r]];
    const pv = M[r][c];
    M[r] = M[r].map((x) => div(x, pv));
    for (let i = 0; i < M.length; i++) if (i !== r && M[i][c][0] !== B0) {
      const f = M[i][c];
      M[i] = M[i].map((x, k) => sub(x, mul(f, M[r][k])));
    }
    pivots.push(c);
    r++;
  }
  const free = Array.from({ length: n }, (_, i) => i).filter((i) => !pivots.includes(i));
  if (free.length === 0) throw new InputError("This equation can't be balanced — check the formulas (an element may appear on only one side).");
  if (free.length > 1) throw new InputError("This equation has more than one independent balance (it combines separate reactions). Split it into separate equations.");
  const fc = free[0], x: Q[] = Array.from({ length: n }, () => [B0, B1] as Q);
  x[fc] = [B1, B1];
  pivots.forEach((pc, i) => (x[pc] = norm([-M[i][fc][0], M[i][fc][1]])));
  let l = B1;
  for (const [, d] of x) l = (l * d) / gcd(l, d);
  let ints = x.map(([nn, d]) => (nn * l) / d);
  let g = B0;
  for (const v of ints) g = gcd(g, v);
  ints = ints.map((v) => v / (g || B1));
  if (ints.every((v) => v <= B0)) ints = ints.map((v) => -v);
  if (ints.some((v) => v <= B0)) throw new InputError("No balance with all-positive coefficients — a species may be on the wrong side.");
  const coeffs = ints.map(Number);
  const show = (arr: string[], off: number) => arr.map((sp, i) => `${coeffs[off + i] === 1 ? "" : coeffs[off + i] + " "}${sp}`).join(" + ");
  return { coeffs, reactants, products, text: `${show(reactants, 0)} → ${show(products, reactants.length)}`, elements: els };
}

// ---------- electron configuration ----------
const ORDER = ["1s", "2s", "2p", "3s", "3p", "4s", "3d", "4p", "5s", "4d", "5p", "6s", "4f", "5d", "6p", "7s", "5f", "6d", "7p"];
const CAP: Record<string, number> = { s: 2, p: 6, d: 10, f: 14 };
const EXC: Record<number, [string, number][]> = {
  24: [["4s", -1], ["3d", 1]], 29: [["4s", -1], ["3d", 1]], 41: [["5s", -1], ["4d", 1]], 42: [["5s", -1], ["4d", 1]], 44: [["5s", -1], ["4d", 1]], 45: [["5s", -1], ["4d", 1]],
  46: [["5s", -2], ["4d", 2]], 47: [["5s", -1], ["4d", 1]], 57: [["4f", -1], ["5d", 1]], 58: [["4f", -1], ["5d", 1]], 64: [["4f", -1], ["5d", 1]], 78: [["6s", -1], ["5d", 1]],
  79: [["6s", -1], ["5d", 1]], 89: [["5f", -1], ["6d", 1]], 90: [["5f", -2], ["6d", 2]], 91: [["5f", -1], ["6d", 1]], 92: [["5f", -1], ["6d", 1]], 93: [["5f", -1], ["6d", 1]],
  96: [["5f", -1], ["6d", 1]], 103: [["6d", -1], ["7p", 1]],
};
const NOBLE = [2, 10, 18, 36, 54, 86];
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (n: number) => String(n).split("").map((d) => SUP[Number(d)]).join("");
export function electronConfig(z: number) {
  const occ = new Map<string, number>();
  let left = z;
  for (const o of ORDER) {
    if (!left) break;
    const k = Math.min(CAP[o[1]], left);
    occ.set(o, k);
    left -= k;
  }
  for (const [o, d] of EXC[z] ?? []) occ.set(o, (occ.get(o) ?? 0) + d);
  const sorted = Array.from(occ.entries()).filter(([, k]) => k > 0).sort((a, b) => Number(a[0][0]) - Number(b[0][0]) || "spdf".indexOf(a[0][1]) - "spdf".indexOf(b[0][1]));
  const full = sorted.map(([o, k]) => `${o}${sup(k)}`).join(" ");
  const core = [...NOBLE].reverse().find((n) => n < z);
  let short = full;
  if (core) {
    const coreSet = new Set(electronConfig(core).orbitals.map(([o]) => o));
    const coreOcc = new Map(electronConfig(core).orbitals);
    const rest = sorted.filter(([o, k]) => !(coreSet.has(o) && coreOcc.get(o) === k));
    short = `[${ELEMENTS[core - 1].sym}] ` + rest.map(([o, k]) => `${o}${sup(k)}`).join(" ");
  }
  const maxN = Math.max(...sorted.map(([o]) => Number(o[0])));
  const valence = sorted.filter(([o]) => Number(o[0]) === maxN).reduce((t, [, k]) => t + k, 0);
  let unpaired = 0;
  for (const [o, k] of sorted) {
    const orbs = CAP[o[1]] / 2;
    unpaired += k <= orbs ? k : 2 * orbs - k;
  }
  return { full, short: short.trim(), orbitals: sorted, valence, unpaired };
}
