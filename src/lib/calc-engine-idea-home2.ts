/**
 * Idea build, batch home2 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): House & Garden > Flooring, Tile, Paint & Interior = 21 tools.
 * References: shower pan slope ¼ in per ft to the drain (plumbing codes); recessed lighting rule of thumb spacing ≈ ceiling height ÷ 2;
 * shelf deflection δ = 5wL⁴ / (384EI), I = b·t³/12 (simply supported, uniform load); stiffness E (psi): pine ≈ 1.24 M, red oak ≈ 1.82 M,
 * maple ≈ 1.83 M, birch plywood ≈ 1.2 M, MDF ≈ 0.4 M, particleboard ≈ 0.35 M; "acceptable" sag ≈ 0.02 in per ft of span (Sagulator).
 * Paint, primer and pad coverage are editable product defaults.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const ceil = (x: number) => Math.ceil(x - 1e-9);
const ft2 = (x: number) => `${nfmt(x, 0)} sq ft`;
const ftin = (inch: number) => `${Math.floor(inch / 12)} ft ${nfmt(inch % 12, 1)} in`;
const gal = (sqft: number, cov: number) => { const g = sqft / cov; return g < 0.75 ? `${nfmt(Math.ceil(g * 4), 0)} quart${Math.ceil(g * 4) > 1 ? "s" : ""}` : `${nfmt(g, 1)} gallons (${nfmt(ceil(g), 0)} gal)`; };

export const carpetPad: Calc = (v) => {
  const a = need(p(v, "a", 360), "Enter room area (sq ft)."), roll = p(v, "r", 30), w = 1 + p(v, "w", 10) / 100;
  const sy = (a * w) / 9;
  return { sy: `${nfmt(sy, 1)} sq yd of carpet padding (${ft2(a * w)})`, rolls: `${nfmt(ceil(sy / roll))} rolls of ${nfmt(roll, 0)} sq yd`, note: "Pad is laid wall to wall without overlaps — less waste than carpet · 7/16 in, 6–8 lb density suits most residential carpet" };
};
export const underlay: Calc = (v) => {
  const a = need(p(v, "a", 400), "Enter floor area (sq ft)."), roll = p(v, "r", 100), w = 1 + p(v, "w", 10) / 100;
  return { r: `${nfmt(ceil((a * w) / roll))} rolls of ${nfmt(roll, 0)} sq ft underlayment`, a: `${ft2(a * w)} including ${nfmt((w - 1) * 100, 0)}% for overlap and trimming`, note: "Over concrete use underlayment with a vapour barrier (or 6-mil poly) · skip it if your plank has attached padding unless the maker allows both" };
};
export const transitions: Calc = (v) => {
  const n = Math.max(1, Math.round(p(v, "n", 4))), w = p(v, "w", 36), len = p(v, "l", 72);
  const per = Math.floor(len / w) || 1;
  return { s: `${nfmt(ceil(n / per))} transition strips of ${nfmt(len, 0)} in`, how: `${n} doorways × ${nfmt(w, 0)} in — each ${nfmt(len, 0)} in strip covers ${per} doorway${per > 1 ? "s" : ""}`, note: "Choose T-molding (same height), reducer (to a lower floor), threshold (to carpet) or end cap (to a door or slider)" };
};
export const quarterRound: Calc = (v) => {
  const P = need(p(v, "p", 60), "Enter room perimeter (ft)."), doors = p(v, "d", 3), dw = p(v, "dw", 3), pc = p(v, "pc", 8);
  const L = Math.max(0, P - doors * dw) * 1.1;
  return { L: `${nfmt(L, 0)} linear ft of quarter round (${nfmt(ceil(L / pc))} × ${nfmt(pc, 0)} ft pieces)`, nails: `≈ ${nfmt(ceil(L / 1.33), 0)} finish nails (every 16 in) · ${nfmt(Math.max(4, ceil(P / 12)), 0)} inside/outside corners to cope or mitre`, note: "Includes 10% waste · nail into the baseboard, not the floor, so floating floors can move" };
};
export const mosaic: Calc = (v) => {
  const a = need(p(v, "a", 40), "Enter area to tile (sq ft)."), s = p(v, "s", 12), w = 1 + p(v, "w", 15) / 100;
  const sheet = (s * s) / 144;
  return { n: `${nfmt(ceil((a * w) / sheet))} mosaic sheets`, how: `${ft2(a)} + ${nfmt((w - 1) * 100, 0)}% ÷ ${nfmt(sheet, 2)} sq ft per ${nfmt(s, 1)} in sheet`, note: "Many \"12 in\" sheets are really 11¾ in (0.96 sq ft) — check the box · buy extra from the same lot for repairs" };
};
export const showerPan: Calc = (v) => {
  const d = need(p(v, "d", 36), "Enter the longest distance from drain to wall (in)."), base = p(v, "b", 0.75), sl = p(v, "s", 0.25);
  const rise = (d / 12) * sl, wall = base + rise;
  return { t: `Mortar bed ${nfmt(wall, 2)} in thick at the wall, ${nfmt(base, 2)} in at the drain`, how: `${nfmt(d, 0)} in = ${nfmt(d / 12, 2)} ft × ${nfmt(sl, 3)} in per ft = ${nfmt(rise, 2)} in of fall`, note: "Minimum ¼ in per ft slope to the drain · mark a level line around the walls at the wall thickness before floating the pan" };
};
export const heatedFloor: Calc = (v) => {
  const a = need(p(v, "a", 60), "Enter room area (sq ft)."), fx = p(v, "f", 18), clr = p(v, "c", 6), wpsf = p(v, "w", 12), volt = pick(v.v, 2) === 0 ? 120 : 240;
  const heat = Math.max(0, a - fx - clr), W = heat * wpsf;
  return { a: `${ft2(heat)} heated area — choose a mat or cable kit close to (not over) this size`, power: `${nfmt(W, 0)} W · ${nfmt(W / volt, 1)} A at ${volt} V${W / volt > 12 ? " — needs a dedicated circuit; over 15 A may need 240 V" : " (fits a 15 A GFCI circuit)"}`, note: `Excludes ${ft2(fx)} under vanity, toilet and tub and ${ft2(clr)} of edge clearance · never cut a heating mat's wire` };
};
export const primer: Calc = (v) => {
  const a = need(p(v, "a", 400), "Enter wall area (sq ft)."), s = pick(v.s, 4), c = p(v, "c", 1);
  const cov = [300, 250, 200, 225][s];
  return { amt: `${gal(a * c, cov)} of primer`, how: `${ft2(a)} × ${c} coat${c > 1 ? "s" : ""} ÷ ${cov} sq ft per gallon (${["new drywall (PVA)", "previously painted / colour change", "bare wood or stains (stain-blocking)", "masonry or stucco"][s]})`, note: "Tinting primer toward the topcoat colour can save a coat of paint · subtract large windows and doors from the wall area" };
};
export const trimPaint: Calc = (v) => {
  const bb = p(v, "bb", 120), bw = p(v, "bw", 5), cas = p(v, "cs", 100), cw = p(v, "cw", 3.5), doors = Math.round(p(v, "d", 6)), c = p(v, "c", 2), cov = p(v, "cv", 350);
  const a = (bb * bw) / 12 + (cas * cw) / 12 + doors * 40;
  return { amt: `${gal(a * c, cov)} of trim paint`, a: `${ft2(a)}: baseboard ${ft2((bb * bw) / 12)}, casing ${ft2((cas * cw) / 12)}, ${doors} doors (both sides) ${ft2(doors * 40)}`, note: `${c} coats · semi-gloss or satin enamel resists scuffs · a gallon often does all the trim in an average home` };
};
export const cabinetPaint: Calc = (v) => {
  const d = Math.round(p(v, "d", 20)), dr = Math.round(p(v, "dr", 10)), box = p(v, "b", 60), c = p(v, "c", 2), cov = p(v, "cv", 350);
  const a = d * 3.5 * 2 + dr * 1.5 * 2 + box;
  return { amt: `${gal(a * c, cov)} of cabinet paint + ${gal(a, 300)} of bonding primer`, a: `${ft2(a)}: ${d} doors (both sides), ${dr} drawer fronts, ${ft2(box)} of frames and end panels`, note: "Degrease, scuff-sand and prime with a bonding primer · urethane-modified alkyd or waterborne enamel levels best" };
};
const SHEEN: [string, number, string][] = [["Flat / matte", 400, "hides flaws, least washable — ceilings, low-traffic rooms"], ["Eggshell", 400, "soft sheen, wipeable — living rooms, bedrooms"], ["Satin", 375, "more durable — hallways, kids' rooms, kitchens"], ["Semi-gloss", 350, "scrubbable — trim, doors, bathrooms"], ["Gloss", 325, "hardest, shows flaws — trim and cabinets"]];
export const sheen: Calc = (v) => {
  const a = need(p(v, "a", 400), "Enter wall area (sq ft)."), s = SHEEN[pick(v.s, SHEEN.length)], c = p(v, "c", 2), tex = pick(v.t, 2) === 1;
  const cov = s[1] * (tex ? 0.8 : 1);
  return { amt: `${gal(a * c, cov)} of ${s[0].toLowerCase()} paint`, how: `${ft2(a)} × ${c} coats ÷ ${nfmt(cov, 0)} sq ft per gallon${tex ? " (textured surface −20%)" : ""}`, use: `${s[0]}: ${s[2]} · check the can — coverage varies more by brand and colour than by sheen` };
};
export const paintLabor: Calc = (v) => {
  const L = need(p(v, "l", 12), "Enter room length (ft)."), W = need(p(v, "w", 12), "Enter room width (ft)."), H = p(v, "h", 8), rate = p(v, "r", 2.5), ceilOn = pick(v.c, 2) === 1, trim = p(v, "t", 150), mat = p(v, "m", 80);
  const walls = 2 * (L + W) * H * 0.9, cl = ceilOn ? L * W : 0, labor = (walls + cl) * rate + trim;
  return { tot: `≈ ${money(labor + mat, "$", 0)} for the room`, parts: `Labour ${money(labor, "$", 0)} (${ft2(walls + cl)} at ${money(rate)}/sq ft + trim ${money(trim, "$", 0)}) + paint and supplies ${money(mat, "$", 0)}`, note: "Typical US labour is about $2–$6 per sq ft of wall · enter local quotes; prep, repairs and colour changes add cost" };
};
export const wainscot: Calc = (v) => {
  const L = need(p(v, "l", 40), "Enter wall length to cover (ft)."), h = need(p(v, "h", 36), "Enter wainscot height (in)."), sw = p(v, "sw", 48), sh = p(v, "sh", 96);
  const per = Math.max(1, Math.floor(sh / h)), strips = ceil((L * 12) / sw), sheets = ceil((strips / per) * 1.1);
  return { s: `${nfmt(sheets)} sheets of ${nfmt(sw / 12, 0)}×${nfmt(sh / 12, 0)} ft panelling`, how: `${per} strips of ${nfmt(h, 0)} in from each sheet · ${strips} strips for ${nfmt(L, 0)} ft (+10%)`, trim: `${nfmt(L * 1.1, 0)} ft of chair rail/cap and ${nfmt(L * 1.1, 0)} ft of baseboard · classic heights: 32–36 in, or about ⅓ of the wall` };
};
export const shiplap: Calc = (v) => {
  const L = need(p(v, "l", 12), "Enter wall width (ft)."), H = need(p(v, "h", 8), "Enter wall height (ft)."), exp = need(p(v, "e", 5.125), "Enter board exposure (in)."), bl = p(v, "bl", 8), sub = p(v, "s", 0);
  const a = Math.max(0, L * H - sub), lf = ((a * 12) / exp) * 1.1;
  return { lf: `${nfmt(lf, 0)} linear ft of shiplap (${nfmt(ceil(lf / bl))} boards of ${nfmt(bl, 0)} ft)`, rows: `${nfmt(ceil((H * 12) / exp))} rows high · ${ft2(a)} to cover (+10%)`, note: "Exposure is the visible face width after overlap (e.g. 5⅛ in for a 1×6 nickel-gap board) · nail into studs, stagger the joints" };
};
export const curtainRod: Calc = (v) => {
  const w = need(p(v, "w", 48), "Enter window width incl. trim (in)."), ext = p(v, "e", 10), ht = p(v, "h", 84), full = p(v, "f", 2);
  const rod = w + 2 * ext, panelW = (rod * full) / 2;
  return { rod: `${nfmt(rod, 0)} in rod (${ftin(rod)})`, cur: `Curtains: total width ${nfmt(rod * full, 0)} in (2 panels of ~${nfmt(panelW, 0)} in) · length ${nfmt(ht - 0.5, 1)} in to just kiss the floor`, note: `Extending ${nfmt(ext, 0)} in each side lets curtains clear the glass · mount the rod 4–6 in above the frame or halfway to the ceiling` };
};
export const recessed: Calc = (v) => {
  const L = need(p(v, "l", 16), "Enter room length (ft)."), W = need(p(v, "w", 14), "Enter room width (ft)."), H = p(v, "h", 8), r = pick(v.r, 3), lm = p(v, "lm", 650);
  const sp = H / 2, nx = Math.max(1, Math.round(L / sp)), ny = Math.max(1, Math.round(W / sp)), lpsf = [20, 50, 30][r], need0 = L * W * lpsf;
  return { n: `${nx * ny} lights (${nx} × ${ny} grid, about ${nfmt(sp, 1)} ft apart)`, edge: `Start about ${nfmt(sp / 2, 1)} ft from the walls · ${nfmt((nx * ny * lm), 0)} lumens vs ${nfmt(need0, 0)} recommended`, note: `${["Living / bedroom", "Kitchen / workspace", "Bathroom"][r]} target ≈ ${lpsf} lumens per sq ft · ${nx * ny * lm < need0 ? "add lights or use brighter fixtures" : "meets the target"}; use dimmers for flexibility` };
};
export const mirrorSize: Calc = (v) => {
  const vw = need(p(v, "v", 36), "Enter vanity width (in)."), sinks = pick(v.s, 2), fh = p(v, "f", 40), ceilH = p(v, "c", 96);
  const mw = sinks === 0 ? vw - 4 : (vw - 6) / 2, mh = Math.min(40, ceilH - fh - 10 - 6);
  return { w: sinks === 0 ? `Mirror about ${nfmt(mw, 0)} in wide (2 in narrower than the vanity each side)` : `Two mirrors about ${nfmt(mw, 0)} in wide, one centred over each sink`, h: `Height about ${nfmt(Math.max(24, mh), 0)} in · bottom edge ${nfmt(fh + 6, 0)}–${nfmt(fh + 10, 0)} in from the floor (5–10 in above the faucet)`, note: "Keep the mirror centre near eye level (about 60–65 in) and leave room for wall sconces either side" };
};
export const closet: Calc = (v) => {
  const w = need(p(v, "w", 8), "Enter closet back-wall width (ft)."), sideD = p(v, "d", 2), sides = pick(v.s, 2) === 1, dbl = p(v, "dh", 50) / 100, shelves = Math.round(p(v, "sh", 1));
  const wall = w + (sides ? 2 * sideD : 0), rodL = wall * (1 + dbl), shelfL = wall * shelves + wall * dbl;
  return { rod: `${nfmt(rodL, 1)} ft of hanging rod (${pcs(dbl)} double-hang at 40 in and 80 in, rest single at 66 in)`, sh: `${nfmt(shelfL, 1)} ft of shelving (${shelves} full-length shelf${shelves > 1 ? "s" : ""} + shelf over the double-hang)`, note: "Allow about 2.5 ft of rod per person for long items · shelves 12–16 in deep, rods 12 in from the back wall" };
};
const pcs = (x: number) => `${Math.round(x * 100)}%`;
const WOOD: [string, number][] = [["Pine", 1240000], ["Red oak", 1820000], ["Maple", 1830000], ["Birch plywood", 1200000], ["MDF", 400000], ["Particleboard", 350000]];
export const shelfSag: Calc = (v) => {
  const L = need(p(v, "l", 30), "Enter span between supports (in)."), b = need(p(v, "d", 10), "Enter shelf depth (in)."), t = need(p(v, "t", 0.75), "Enter thickness (in)."), m = WOOD[pick(v.m, WOOD.length)], lpf = p(v, "w", 20);
  const I = (b * t ** 3) / 12, w = lpf / 12, sag = (5 * w * L ** 4) / (384 * m[1] * I), ok = 0.02 * (L / 12);
  return { s: `${nfmt(sag, 3)} in sag at mid-span`, ok: sag <= ok ? `Acceptable — under the ${nfmt(ok, 3)} in guide (0.02 in per ft)` : `Too much — over ${nfmt(ok, 3)} in; shorten the span, use thicker stock or add a front edge strip`, note: `${m[0]} (E ≈ ${nfmt(m[1] / 1e6, 2)} million psi) carrying ${nfmt(lpf, 0)} lb per ft (books ≈ 20 lb/ft) · wood also creeps over time — design conservatively` };
};
export const cabinets: Calc = (v) => {
  const run = need(p(v, "r", 20), "Enter total wall run (ft)."), app = p(v, "a", 6), ups = pick(v.u, 2) === 0, win = p(v, "w", 3), avg = p(v, "s", 30), cost = p(v, "c", 0);
  const baseFt = Math.max(0, run - app), wallFt = ups ? Math.max(0, run - win - 2.5) : 0, nb = ceil((baseFt * 12) / avg), nw = ceil((wallFt * 12) / avg);
  return { n: `${nb} base cabinets${ups ? ` + ${nw} wall cabinets` : ""} (about ${nfmt(avg, 0)} in wide)`, lf: `${nfmt(baseFt, 1)} linear ft of base${ups ? ` · ${nfmt(wallFt, 1)} ft of uppers (minus window and range hood)` : ""}`, cost: cost > 0 ? `≈ ${money((baseFt + wallFt) * cost, "$", 0)} at ${money(cost)} per linear ft` : "Stock cabinets come in 3 in width steps from 9 to 48 in; leave filler strips at walls" };
};
export const countertop: Calc = (v) => {
  const s1 = p(v, "l1", 120) * p(v, "d1", 25.5), s2 = p(v, "l2", 72) * p(v, "d2", 25.5), isl = p(v, "l3", 0) * p(v, "d3", 0), bs = pick(v.b, 2) === 1 ? (p(v, "l1", 120) + p(v, "l2", 72)) * 4 : 0, price = p(v, "pr", 0);
  const sq = (s1 + s2 + isl + bs) / 144;
  return { a: `${nfmt(sq, 1)} sq ft of countertop${bs ? " (incl. 4 in backsplash)" : ""}`, slab: `About ${nfmt(ceil((sq * 1.15) / 45), 0)} slab${ceil((sq * 1.15) / 45) > 1 ? "s" : ""} (≈ 45 sq ft each, +15% for seams and cut-outs)`, cost: price > 0 ? `≈ ${money(sq * price, "$", 0)} at ${money(price)} per sq ft installed` : "Standard counter depth is 25½ in (with 1½ in overhang); islands often 36–42 in deep" };
};

// ---- registry (generated)
export const ideaHome2CustomCalculators: Record<string, Calc> = {
  "carpet-padding-calculator": carpetPad,
  "floor-underlayment-rolls-calculator": underlay,
  "floor-transition-strips-calculator": transitions,
  "quarter-round-length-calculator": quarterRound,
  "mosaic-tile-sheets-calculator": mosaic,
  "shower-pan-slope-calculator": showerPan,
  "heated-floor-mat-size-calculator": heatedFloor,
  "primer-coverage-calculator": primer,
  "trim-paint-amount-calculator": trimPaint,
  "cabinet-paint-amount-calculator": cabinetPaint,
  "paint-sheen-coverage-calculator": sheen,
  "painting-labor-cost-per-room-calculator": paintLabor,
  "wainscoting-panels-calculator": wainscot,
  "shiplap-boards-calculator": shiplap,
  "curtain-rod-length-calculator": curtainRod,
  "recessed-light-count-calculator": recessed,
  "mirror-size-above-vanity-calculator": mirrorSize,
  "closet-shelving-length-calculator": closet,
  "bookshelf-sag-span-calculator": shelfSag,
  "kitchen-cabinet-count-calculator": cabinets,
  "countertop-square-feet-calculator": countertop,
};
