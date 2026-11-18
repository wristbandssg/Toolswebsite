/**
 * Idea build, batch home1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): House & Garden > Concrete & Masonry (7), Deck/Fence/Stairs (13),
 * Framing/Drywall/Insulation (8), Gravel/Soil/Landscaping (7) = 35 tools.
 * Standard references: IRC R311.7 (stair headroom 6 ft 8 in; winder treads ≥ 10 in at the walk line 12 in from the narrow end, ≥ 6 in at
 * any point); IRC R507 deck design load 40 psf live + 10 psf dead; IRC R401.3 lot grading 6 in fall in the first 10 ft (5%);
 * USG rule of thumb ≈ 370 ft of joint tape per 1,000 sq ft of drywall; insulation R per inch: blown fiberglass ≈ 2.5, cellulose ≈ 3.5,
 * EPS ≈ 4, XPS ≈ 5, polyiso ≈ 6, open-cell spray foam ≈ 3.6, closed-cell ≈ 6.5; 1 board foot = 1 sq ft × 1 in; 1 gal = 231 in³;
 * stone densities granite ≈ 165, basalt ≈ 180, limestone ≈ 160, sandstone ≈ 145 lb/ft³. Coverage rates are editable product defaults.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const ceil = (x: number) => Math.ceil(x - 1e-9);
const ft2 = (x: number) => `${nfmt(x, 0)} sq ft`;
const ftin = (inch: number) => `${Math.floor(inch / 12)} ft ${nfmt(inch % 12, 1)} in`;
const waste = (v: Record<string, number>, d = 10) => 1 + p(v, "w", d) / 100;
const pc0 = (x: number) => `${Math.round(x * 100)}%`;

// ---- Concrete & masonry ----
export const exposedAgg: Calc = (v) => {
  const a = need(p(v, "a", 400), "Enter the area (sq ft)."), t = p(v, "t", 4), seed = p(v, "s", 1.25), ret = p(v, "r", 250);
  const cy = (a * t) / 12 / 27 * 1.08;
  return { cy: `${nfmt(cy, 2)} cubic yards of concrete (incl. 8% waste)`, agg: `${nfmt(a * seed, 0)} lb decorative aggregate if seeding (${nfmt(seed, 2)} lb/sq ft) · ${nfmt(ceil(a / ret), 0)} gal surface retarder`, note: "Or order an exposed-aggregate mix from the plant · wash off the surface paste 4–24 hours after placing, then seal after curing" };
};
export const kitchenBlock: Calc = (v) => {
  const L = need(p(v, "l", 20), "Enter total wall length (ft)."), h = p(v, "h", 36), per = p(v, "b", 30), cap = pick(v.c, 2) === 1;
  const courses = ceil(h / 8), perCourse = ceil((L * 12) / 16), blocks = ceil(courses * perCourse * 1.05);
  return { b: `${nfmt(blocks)} standard 8×8×16 in blocks (${courses} courses × ${perCourse}, +5%)`, m: `${nfmt(ceil(blocks / per))} 80-lb bags of mortar (≈ ${nfmt(per, 0)} blocks per bag)${cap ? ` · ${nfmt(L, 0)} ft of countertop or cap` : ""}`, note: `${nfmt(h, 0)} in finished height (counter height is typically 36 in) · fill cores with grout and rebar where needed` };
};
export const sealcoat: Calc = (v) => {
  const a = need(p(v, "a", 1000), "Enter driveway area (sq ft)."), c = p(v, "c", 2), cov = p(v, "cv", 80), pail = p(v, "p", 5);
  const gal = (a * c) / cov;
  return { gal: `${nfmt(gal, 1)} gallons of sealer (${nfmt(ceil(gal / pail))} × ${nfmt(pail, 0)}-gal pails)`, how: `${ft2(a)} × ${c} coats ÷ ${nfmt(cov, 0)} sq ft per gallon per coat`, note: "Check the pail's coverage rate — porous or old asphalt soaks up more · apply above 50 °F with no rain for 24 hours" };
};
export const crackFill: Calc = (v) => {
  const L = need(p(v, "l", 100), "Enter total crack length (ft)."), w = p(v, "w", 0.5), d = p(v, "d", 0.5), t = pick(v.t, 2);
  const in3 = L * 12 * w * d, tube = in3 / 18.2, jug = in3 / 231;
  return { amt: t === 0 ? `${nfmt(ceil(tube * 1.1))} tubes (10.1 oz) of crack filler` : `${nfmt(jug * 1.1, 2)} gallons of pourable crack filler`, how: `${nfmt(L, 0)} ft × ${nfmt(w, 2)} in wide × ${nfmt(d, 2)} in deep = ${nfmt(in3, 0)} in³ (+10%)`, note: "Use foam backer rod in cracks deeper than ½ in so you fill only the top ½ in · clean and dry cracks first" };
};
export const garageEpoxy: Calc = (v) => {
  const a = need(p(v, "a", 480), "Enter floor area (sq ft)."), c = p(v, "c", 2), cov = p(v, "cv", 250), kit = p(v, "k", 2);
  const gal = (a * c) / cov;
  return { gal: `${nfmt(gal, 1)} gallons of epoxy (${nfmt(ceil(gal / kit))} kits of ${nfmt(kit, 1)} gal)`, how: `${ft2(a)} × ${c} coats ÷ ${nfmt(cov, 0)} sq ft per gallon`, note: `A 2-car garage is about 400–500 sq ft · etch or grind the concrete first · ${nfmt(ceil(a / 100), 0)} lb of decorative flakes at ~1 lb per 100 sq ft (light broadcast)` };
};
export const stucco: Calc = (v) => {
  const a = need(p(v, "a", 500), "Enter wall area (sq ft)."), t = p(v, "t", 0.875), y = p(v, "y", 0.7);
  const cf = (a * t) / 12 * 1.1, bags = ceil(cf / y);
  return { b: `${nfmt(bags)} 80-lb bags of stucco mix`, how: `${ft2(a)} × ${nfmt(t, 3)} in = ${nfmt(cf, 1)} cu ft (+10%) at ${nfmt(y, 2)} cu ft per bag`, note: "Three-coat stucco is about ⅞ in (scratch ⅜, brown ⅜, finish ⅛) · one-coat systems are ⅜–½ in · check the bag's yield" };
};
export const parging: Calc = (v) => {
  const L = need(p(v, "l", 120), "Enter wall length (ft)."), h = p(v, "h", 2), t = p(v, "t", 0.5), y = p(v, "y", 0.6);
  const a = L * h, cf = (a * t) / 12 * 1.1;
  return { b: `${nfmt(ceil(cf / y))} 80-lb bags of parging mix`, how: `${ft2(a)} exposed foundation × ${nfmt(t, 2)} in thick = ${nfmt(cf, 1)} cu ft`, note: "Apply in two coats of about ¼ in over damp, clean concrete · use a bonding agent on smooth walls" };
};

// ---- Deck, fence & stairs ----
export const deckScrews: Calc = (v) => {
  const a = need(p(v, "a", 300), "Enter deck area (sq ft)."), bw = p(v, "bw", 5.5) + 0.25, js = p(v, "js", 16), per = p(v, "per", 2);
  const n = ceil(a * (12 / bw) * (12 / js) * per * 1.05);
  return { n: `${nfmt(n)} deck screws`, box: `About ${nfmt(ceil(n / 350))} × 5-lb boxes (≈ 350 per 5 lb for 2½ in screws) — or ${nfmt(ceil(n / 100))} × 100-count hidden clips`, note: `${per} screws at every joist (${nfmt(js, 0)} in on centre) with ${nfmt(bw - 0.25, 2)} in boards · roughly 350 screws per 100 sq ft` };
};
export const deckStain: Calc = (v) => {
  const a = need(p(v, "a", 300), "Enter deck surface area (sq ft)."), rl = p(v, "r", 40), st = p(v, "s", 0), c = p(v, "c", 2), cov = p(v, "cv", 200);
  const rail = rl * 3 * 2, stairs = st * 12, tot = a + rail + stairs, gal = (tot * c) / cov;
  return { gal: `${nfmt(gal, 1)} gallons of stain (${nfmt(ceil(gal))} gal)`, area: `${ft2(tot)} to coat: deck ${ft2(a)} + railings ${ft2(rail)} + stairs ${ft2(stairs)}`, note: `${c} coat${c > 1 ? "s" : ""} at ${nfmt(cov, 0)} sq ft per gallon · rough or weathered wood can need 50% more · semi-transparent stains often need only one coat` };
};
export const compositeVsWood: Calc = (v) => {
  const a = need(p(v, "a", 300), "Enter deck area (sq ft)."), y = Math.max(1, p(v, "y", 25)), wc = p(v, "wc", 30), cc = p(v, "cc", 50), stain = p(v, "sm", 1), si = Math.max(1, p(v, "si", 2)), wl = Math.max(1, p(v, "wl", 15));
  const wood = a * wc * Math.ceil(y / wl) + a * stain * Math.floor(y / si), comp = a * cc + a * 0.1 * y;
  return { w: `Wood: ${money(wood, "$", 0)} over ${nfmt(y, 0)} years (build ${money(a * wc, "$", 0)}${y > wl ? `, rebuilt every ${wl} years` : ""} + staining every ${nfmt(si, 0)} years)`, c: `Composite: ${money(comp, "$", 0)} (build ${money(a * cc, "$", 0)} + cleaning)`, best: comp < wood ? `Composite saves ${money(wood - comp, "$", 0)} over ${nfmt(y, 0)} years` : `Wood is ${money(comp - wood, "$", 0)} cheaper over ${nfmt(y, 0)} years` };
};
export const deckLoad: Calc = (v) => {
  const a = need(p(v, "a", 192), "Enter deck area (sq ft)."), tub = p(v, "t", 0), fp = p(v, "fp", 49);
  const cap = a * 40, ppl = Math.floor(cap / 200 / 1.2);
  return { cap: `${nfmt(cap, 0)} lb live load at the IRC 40 psf design load (+ 10 psf dead load)`, ppl: `≈ ${nfmt(ppl)} people standing evenly spread (allowing for crowding)`, tub: tub > 0 ? `Hot tub: ${nfmt(tub / fp, 0)} psf on its footprint — ${tub / fp > 50 ? "far above 50 psf; needs an engineered frame or its own slab" : "within the design load"}` : "A filled hot tub is often 100+ psf — it needs its own engineered support" };
};
export const pergola: Calc = (v) => {
  const L = need(p(v, "l", 12), "Enter pergola length (ft)."), W = need(p(v, "wd", 10), "Enter pergola width (ft)."), oh = p(v, "o", 1), sp = p(v, "s", 16), ps = p(v, "ps", 6), pspace = p(v, "pp", 10);
  const postsL = Math.max(2, ceil(L / pspace) + 1), posts = postsL * 2, beamLen = L + 2 * oh, rafters = ceil((L * 12) / sp) + 1, rafLen = W + 2 * oh, purl = ceil((W * 12) / 24) + 1;
  return { posts: `${posts} posts (6×6, ${nfmt(ps + 3, 0)} ft long incl. footing) · 2 doubled beams of ${nfmt(beamLen, 1)} ft (4 boards 2×8 or 2×10)`, top: `${rafters} rafters (2×6 or 2×8) at ${nfmt(rafLen, 1)} ft, ${nfmt(sp, 0)} in apart · ${purl} purlins (2×2 or 2×3) at ${nfmt(beamLen, 1)} ft`, note: "Check post footing depth for your frost line and local permit rules for attached pergolas" };
};
export const gazebo: Calc = (v) => {
  const a = need(p(v, "a", 144), "Enter floor area (sq ft)."), t = pick(v.t, 4), inst = p(v, "i", 3000), extra = p(v, "x", 1500);
  const per = [25, 45, 70, 20][t], mat = a * per;
  return { tot: `≈ ${money(mat + inst + extra, "$", 0)} total`, parts: `${["Wood kit", "Vinyl kit", "Custom-built wood", "Metal / hardtop kit"][t]} ${money(mat, "$", 0)} (${money(per, "$", 0)}/sq ft) + install ${money(inst, "$", 0)} + foundation/electrical ${money(extra, "$", 0)}`, note: "Typical ranges only — get quotes; a 12×12 ft gazebo is 144 sq ft" };
};
export const ironFence: Calc = (v) => {
  const L = need(p(v, "l", 150), "Enter fence length (ft)."), pf = p(v, "p", 35), ins = p(v, "i", 15), g = Math.round(p(v, "g", 1)), gp = p(v, "gp", 600);
  const tot = L * (pf + ins) + g * gp;
  return { tot: `≈ ${money(tot, "$", 0)} installed`, parts: `Panels ${money(L * pf, "$", 0)} + installation ${money(L * ins, "$", 0)} + ${g} gate${g === 1 ? "" : "s"} ${money(g * gp, "$", 0)}`, note: `${money(tot / L, "$", 0)} per foot · steel or aluminium "wrought iron" style is cheaper than true wrought iron; enter your quotes` };
};
export const electricFence: Calc = (v) => {
  const per = need(p(v, "p", 1320), "Enter fence perimeter (ft)."), s = Math.max(1, Math.round(p(v, "s", 3))), spool = p(v, "sp", 1320), ps = p(v, "ps", 40);
  const wire = per * s * 1.1;
  return { w: `${nfmt(wire, 0)} ft of wire (${nfmt(ceil(wire / spool))} spools of ${nfmt(spool, 0)} ft)`, posts: `${nfmt(ceil(per / ps) + 1)} posts at ${nfmt(ps, 0)} ft spacing · ${nfmt(ceil((per / ps + 1) * s))} insulators`, note: `${s} strand${s > 1 ? "s" : ""} + 10% for ties and corners · ¼ mile = 1,320 ft · horses: 3 strands; cattle: 2–3; goats and sheep: 4–5` };
};
export const fenceGate: Calc = (v) => {
  const o = need(p(v, "o", 48), "Enter the opening between posts (in)."), h = p(v, "h", 0.5), l = p(v, "l", 0.75), dbl = pick(v.d, 2) === 1;
  const g = o - h - l - (dbl ? 0.5 : 0);
  return { g: dbl ? `Two leaves of ${nfmt(g / 2, 2)} in each` : `Gate width ${nfmt(g, 2)} in (${ftin(g)})`, how: `${nfmt(o, 2)} in opening − ${nfmt(h, 2)} in hinge gap − ${nfmt(l, 2)} in latch gap${dbl ? " − ½ in centre gap" : ""}`, note: g > 48 && !dbl ? "Gates wider than about 4 ft sag — use a double gate, a steel frame or an anti-sag kit" : "Add a diagonal brace running from the bottom hinge side up to the latch side" };
};
export const fenceStain: Calc = (v) => {
  const L = need(p(v, "l", 150), "Enter fence length (ft)."), h = p(v, "h", 6), sides = pick(v.s, 2) === 0 ? 2 : 1, c = p(v, "c", 1), cov = p(v, "cv", 200);
  const a = L * h * sides * 1.1, gal = (a * c) / cov;
  return { gal: `${nfmt(gal, 1)} gallons of stain (${nfmt(ceil(gal))} gal)`, area: `${ft2(a)} (${nfmt(L, 0)} ft × ${nfmt(h, 1)} ft × ${sides} side${sides > 1 ? "s" : ""} + 10% for posts and rails)`, note: `${c} coat${c > 1 ? "s" : ""} at ${nfmt(cov, 0)} sq ft per gallon · rough-sawn boards absorb more · a sprayer uses about 25% more than brushing` };
};
export const headroom: Calc = (v) => {
  const ceilH = need(p(v, "c", 108), "Enter floor-to-floor height (in)."), joist = p(v, "j", 12), rise = p(v, "r", 7.5), run = p(v, "rn", 10), open = p(v, "o", 120);
  const risers = ceil(ceilH / rise), r = ceilH / risers, need0 = 80 + joist;
  const reqOpen = (need0 / r) * run;
  return { ok: open >= reqOpen ? `Opening is long enough — ${ftin(open)} vs ${ftin(reqOpen)} needed` : `Opening too short — needs about ${ftin(reqOpen)} (you have ${ftin(open)})`, how: `${risers} risers of ${nfmt(r, 2)} in · headroom 6 ft 8 in (80 in) + ${nfmt(joist, 1)} in floor/joist depth = ${nfmt(need0, 1)} in vertical clearance`, note: "IRC R311.7.2: minimum 6 ft 8 in headroom measured vertically from the tread nosing line · check local code" };
};
export const winder: Calc = (v) => {
  const n = Math.max(2, Math.round(p(v, "n", 3))), turn = p(v, "t", 90), inner = p(v, "i", 12);
  const ang = (turn / n) * Math.PI / 180, walk = (inner + 12) * ang, narrow = inner * ang;
  return { walk: `${nfmt(walk, 2)} in tread depth at the walk line (12 in from the narrow end)`, ok: walk >= 10 && narrow >= 6 ? "Meets IRC: ≥ 10 in at the walk line and ≥ 6 in at the narrow end" : `Doesn't meet IRC (${walk < 10 ? "walk line under 10 in" : ""}${walk < 10 && narrow < 6 ? " and " : ""}${narrow < 6 ? `narrow end ${nfmt(narrow, 2)} in, under 6 in` : ""}) — increase the inner offset or use fewer winders`, note: `${n} winders over a ${nfmt(turn, 0)}° turn (${nfmt(turn / n, 1)}° each) with the narrow ends ${nfmt(inner, 1)} in from the centre point` };
};
export const handrail: Calc = (v) => {
  const tr = Math.max(1, Math.round(p(v, "t", 13))), run = p(v, "rn", 10.5), rise = p(v, "r", 7.25), ext = pick(v.e, 2) === 1;
  const h = (tr - 1) * run, vv = (tr - 1) * rise, slope = Math.sqrt(h * h + vv * vv), tot = slope + (ext ? 12 + 12 + run : 0);
  return { L: `${ftin(tot)} of handrail (${nfmt(tot / 12, 1)} ft)`, how: `Sloped section ${ftin(slope)} over ${tr - 1} runs${ext ? " + 12 in top and 12 in + one tread depth bottom extensions (ADA / commercial)" : ""}`, note: `Angle ${nfmt((Math.atan(vv / Math.max(h, 1)) * 180) / Math.PI, 1)}° · IRC: handrail 34–38 in above the nosings, continuous from the top riser to the bottom riser` };
};

// ---- Framing, drywall & insulation ----
export const drywallScrews: Calc = (v) => {
  const s = need(p(v, "s", 40), "Enter number of 4×8 sheets."), ceil0 = p(v, "c", 25) / 100, sz = p(v, "sz", 32);
  const n = s * sz * (1 - ceil0) + s * sz * 1.25 * ceil0;
  return { n: `${nfmt(ceil(n), 0)} drywall screws`, lb: `≈ ${nfmt(ceil(n / 320), 0)} lb of 1¼ in coarse-thread screws (~320 per lb)`, note: `About 1 screw per sq ft on walls (16 in centres) and 1¼ per sq ft on ceilings · ${pc0(ceil0)} ceiling sheets` };
};
export const drywallTape: Calc = (v) => {
  const a = need(p(v, "a", 1280), "Enter drywall area (sq ft)."), roll = p(v, "r", 500);
  const ft = a * 0.37;
  return { ft: `${nfmt(ft, 0)} ft of joint tape (${nfmt(ceil(ft / roll))} roll${ceil(ft / roll) === 1 ? "" : "s"} of ${nfmt(roll, 0)} ft)`, mud: `≈ ${nfmt(a * 0.14, 0)} lb of joint compound (${nfmt(ceil((a * 0.14) / 61.7), 0)} × 4.5-gal buckets of all-purpose premix)`, note: "Rule of thumb: 370 ft of tape and 140 lb of compound per 1,000 sq ft · add corner bead for outside corners" };
};
export const sprayFoam: Calc = (v) => {
  const a = need(p(v, "a", 600), "Enter area (sq ft)."), t = need(p(v, "t", 2), "Enter thickness (in)."), cc = pick(v.c, 2) === 0, kit = p(v, "k", 600);
  const bf = a * t * 1.1, r = (cc ? 6.5 : 3.6) * t;
  return { bf: `${nfmt(bf, 0)} board feet (${nfmt(ceil(bf / kit))} kits of ${nfmt(kit, 0)} bf)`, r: `≈ R-${nfmt(r, 1)} at ${nfmt(t, 1)} in of ${cc ? "closed-cell" : "open-cell"} foam`, note: "Board feet = sq ft × inches · kit yields drop in cold conditions · closed-cell is also a vapour and air barrier" };
};
const RIN: [string, number][] = [["EPS (expanded polystyrene)", 4], ["XPS (extruded polystyrene)", 5], ["Polyiso (foil-faced)", 6]];
export const rigidFoam: Calc = (v) => {
  const a = need(p(v, "a", 400), "Enter area (sq ft)."), t = RIN[pick(v.t, 3)], th = p(v, "th", 2), wst = waste(v, 10);
  return { s: `${nfmt(ceil((a * wst) / 32))} sheets of 4×8 ft`, r: `R-${nfmt(t[1] * th, 1)} with ${nfmt(th, 1)} in of ${t[0]} (R-${t[1]} per inch)`, note: `Includes ${pc0(wst - 1)} waste · tape seams and seal edges for an air barrier; exposed foam indoors needs a thermal barrier (e.g. ½ in drywall)` };
};
export const atticInsulation: Calc = (v) => {
  const tR = need(p(v, "r", 49), "Enter the target R-value."), have = p(v, "h", 3), t = pick(v.t, 2), a = need(p(v, "a", 1200), "Enter attic area (sq ft).");
  const rpi = t === 0 ? 2.5 : 3.5, haveR = have * (t === 0 ? 2.5 : 3.2), add = Math.max(0, (tR - haveR) / rpi);
  return { d: `Add about ${nfmt(add, 1)} in of ${t === 0 ? "blown fiberglass" : "blown cellulose"} (total depth ≈ ${nfmt(have + add, 1)} in)`, bags: `${nfmt((a * add) / 12, 0)} cu ft to add over ${ft2(a)} — use the bag label chart for R-${nfmt(tR, 0)} to get the bag count`, note: `Existing ${nfmt(have, 1)} in ≈ R-${nfmt(haveR, 0)} · DOE recommends R-30 to R-60 for attics depending on climate zone · air-seal before adding insulation` };
};
export const windowTrim: Calc = (v) => {
  const w = need(p(v, "w", 36), "Enter window width (in)."), h = need(p(v, "h", 48), "Enter window height (in)."), n = Math.max(1, Math.round(p(v, "n", 8))), tw = p(v, "tw", 3.5), sill = pick(v.s, 2) === 1;
  const per = 2 * (w + h) + 8 * tw + (sill ? w + 2 * tw + 4 : 0), tot = (per * n * 1.1) / 12;
  return { L: `${nfmt(tot, 0)} linear ft of trim (${nfmt(ceil(tot / 8), 0)} × 8 ft lengths)`, per: `${nfmt(per / 12, 1)} ft per window (casing on 4 sides with mitre allowance${sill ? " + stool/apron" : ""})`, note: "Includes 10% waste · buy pieces long enough for each side to avoid joins" };
};
export const basementInsul: Calc = (v) => {
  const P = need(p(v, "p", 140), "Enter basement perimeter (ft)."), h = p(v, "h", 8), m = pick(v.m, 2), th = p(v, "t", 2);
  const a = P * h * 1.05;
  return { amt: m === 0 ? `${nfmt(ceil(a / 32))} sheets of 4×8 ft rigid foam (${nfmt(th, 1)} in XPS ≈ R-${nfmt(th * 5, 0)})` : `${ft2(a)} of R-13 batts + ${nfmt(ceil((P * 12) / 16) + 1)} studs for a 2×4 wall`, a: `${ft2(a)} of foundation wall (incl. 5%)`, note: "DOE recommends R-10 continuous or R-13 cavity insulation for basement walls in most of the US (R-15/R-19 in cold zones) · rigid foam against the concrete controls condensation" };
};
export const steelStud: Calc = (v) => {
  const L = need(p(v, "l", 40), "Enter wall length (ft)."), sp = p(v, "s", 16), op = Math.round(p(v, "o", 2)), h = p(v, "h", 8);
  const studs = ceil((L * 12) / sp) + 1 + op * 2, track = L * 2;
  return { s: `${nfmt(studs)} steel studs (${nfmt(h, 0)} ft) at ${nfmt(sp, 0)} in on centre`, t: `${nfmt(track, 0)} ft of top and bottom track (${nfmt(ceil(track / 10))} × 10 ft lengths)`, note: `${nfmt(studs * 4, 0)} framing screws (pan-head, about 4 per stud) · ${op} opening${op === 1 ? "" : "s"} adds king studs and header track` };
};

// ---- Gravel, soil & landscaping ----
export const rubberMulch: Calc = (v) => {
  const a = need(p(v, "a", 300), "Enter area (sq ft)."), d = p(v, "d", 1.5), bag = p(v, "b", 0.8);
  const cf = (a * d) / 12;
  return { cf: `${nfmt(cf, 1)} cu ft of rubber mulch (${nfmt(ceil(cf / bag))} bags of ${nfmt(bag, 2)} cu ft)`, wt: `≈ ${nfmt(cf * 23, 0)} lb (rubber mulch ≈ 23 lb/cu ft)`, note: d < 3 ? "1.5–2 in is enough for beds — rubber mulch doesn't break down" : "Playgrounds: use the depth required for your fall height (often 6 in) per ASTM F1292 test data" };
};
export const lavaRock: Calc = (v) => {
  const a = need(p(v, "a", 200), "Enter area (sq ft)."), d = p(v, "d", 2), bag = p(v, "b", 0.5);
  const cf = (a * d) / 12;
  return { cf: `${nfmt(cf, 1)} cu ft (${nfmt(cf / 27, 2)} cu yd) of lava rock`, bags: `${nfmt(ceil(cf / bag))} bags of ${nfmt(bag, 2)} cu ft · ≈ ${nfmt((cf * 40) / 2000, 2)} tons (≈ 40 lb/cu ft)`, note: "Lava rock is about half the weight of gravel · lay landscape fabric underneath to stop weeds" };
};
export const edging: Calc = (v) => {
  const L = need(p(v, "l", 120), "Enter total edge length (ft)."), pc = p(v, "pc", 20), st = p(v, "st", 3);
  const tot = L * 1.05;
  return { L: `${nfmt(tot, 0)} ft of edging (${nfmt(ceil(tot / pc))} pieces of ${nfmt(pc, 0)} ft)`, st: `${nfmt(ceil(tot / st) + 1)} anchoring stakes at ${nfmt(st, 0)} ft spacing`, note: "Includes 5% for curves and overlaps · measure curved beds with a garden hose laid along the edge" };
};
export const creekBed: Calc = (v) => {
  const L = need(p(v, "l", 40), "Enter creek length (ft)."), w = p(v, "w", 3), d = p(v, "d", 6), dens = p(v, "t", 1.35);
  const cy = (L * w * d) / 12 / 27, tons = cy * dens;
  return { rock: `${nfmt(cy, 2)} cu yd of river rock (≈ ${nfmt(tons, 2)} tons)`, mix: `Mix sizes: ~50% 2–4 in, 30% 4–8 in cobbles, 20% boulders 12 in+ · ${nfmt(L * (w + 2), 0)} sq ft of landscape fabric`, note: "Dig the channel about 1.5× the rock depth, widest and deepest where water collects, with a gentle fall toward the outlet" };
};
const STONE: [string, number][] = [["Granite", 165], ["Basalt", 180], ["Limestone", 160], ["Sandstone", 145], ["Fieldstone (mixed)", 160]];
export const boulder: Calc = (v) => {
  const L = need(p(v, "l", 3), "Enter length (ft)."), W = need(p(v, "w", 2.5), "Enter width (ft)."), H = need(p(v, "h", 2), "Enter height (ft)."), s = STONE[pick(v.s, STONE.length)];
  const vol = (Math.PI / 6) * L * W * H, lb = vol * s[1];
  return { lb: `≈ ${nfmt(lb, 0)} lb (${nfmt(lb / 2000, 2)} tons)`, how: `${s[0]} at ${s[1]} lb/cu ft × ${nfmt(vol, 1)} cu ft (rounded shape: π/6 × L × W × H)`, note: "Blocky boulders can weigh up to ~90% more than the rounded estimate · anything over ~150 lb needs equipment or a team" };
};
export const grading: Calc = (v) => {
  const d = need(p(v, "d", 10), "Enter distance from the house (ft)."), drop = p(v, "f", 6);
  const pct = drop / 12 / d;
  return { s: `${nfmt(pct * 100, 1)}% slope (${nfmt(drop / d, 2)} in per ft)`, ok: pct >= 0.05 ? "Meets the IRC guide of 6 in fall over the first 10 ft (5%)" : `Below 5% — aim for ${nfmt(0.05 * d * 12, 1)} in of fall over ${nfmt(d, 0)} ft`, note: "Lawns drain well at 1–2% further out; slopes steeper than 3:1 (33%) are hard to mow and may need a retaining wall" };
};
export const xeriscape: Calc = (v) => {
  const a = need(p(v, "a", 2000), "Enter lawn area to convert (sq ft)."), inch = p(v, "i", 1), wk = p(v, "wk", 26), cut = p(v, "c", 70) / 100, price = p(v, "pr", 6);
  const gal = a * inch * 0.623 * wk, saved = gal * cut;
  return { gal: `${nfmt(saved, 0)} gallons of water saved a year`, $: `≈ ${money((saved / 1000) * price, "$", 0)} a year at ${money(price)} per 1,000 gal`, note: `Lawn uses ${nfmt(gal, 0)} gal (${nfmt(inch, 1)} in a week for ${nfmt(wk, 0)} weeks; 1 in on 1 sq ft = 0.623 gal) · many water utilities offer rebates for turf removal` };
};

// ---- registry (generated)
export const ideaHome1CustomCalculators: Record<string, Calc> = {
  "exposed-aggregate-concrete-calculator": exposedAgg,
  "outdoor-kitchen-block-count-calculator": kitchenBlock,
  "asphalt-sealcoating-coverage-calculator": sealcoat,
  "crack-filler-amount-calculator": crackFill,
  "garage-floor-epoxy-coverage-calculator": garageEpoxy,
  "stucco-coverage-calculator": stucco,
  "parging-coverage-calculator": parging,
  "deck-screws-needed-calculator": deckScrews,
  "deck-stain-coverage-calculator": deckStain,
  "composite-vs-wood-deck-cost-calculator": compositeVsWood,
  "deck-load-capacity-calculator": deckLoad,
  "pergola-lumber-calculator": pergola,
  "gazebo-cost-calculator": gazebo,
  "wrought-iron-fence-cost-calculator": ironFence,
  "electric-fence-wire-length-calculator": electricFence,
  "fence-gate-size-calculator": fenceGate,
  "fence-stain-coverage-calculator": fenceStain,
  "stair-headroom-calculator": headroom,
  "winder-stairs-calculator": winder,
  "handrail-length-calculator": handrail,
  "drywall-screws-needed-calculator": drywallScrews,
  "drywall-tape-length-calculator": drywallTape,
  "spray-foam-board-feet-calculator": sprayFoam,
  "rigid-foam-board-insulation-calculator": rigidFoam,
  "attic-insulation-depth-r-value-calculator": atticInsulation,
  "window-trim-length-calculator": windowTrim,
  "basement-wall-insulation-calculator": basementInsul,
  "steel-stud-framing-calculator": steelStud,
  "rubber-mulch-amount-calculator": rubberMulch,
  "lava-rock-amount-calculator": lavaRock,
  "edging-length-landscape-calculator": edging,
  "dry-creek-bed-rock-calculator": creekBed,
  "boulder-weight-calculator": boulder,
  "yard-grading-slope-calculator": grading,
  "xeriscape-water-savings-calculator": xeriscape,
};
