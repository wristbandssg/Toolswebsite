/**
 * Idea build, batch home3 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): House & Garden > Lawn/Garden/Trees (19), Pool/Pond/Water (4),
 * Roofing & Gutters (7), HVAC/Plumbing/Electrical (9), Remodel & Home Costs (6) = 45 tools.
 * References: 1 in of water on 1 sq ft = 0.623 gal; Scribner formula rule BF = (0.79D² − 2D − 4) × L/16; square-foot gardening densities
 * (Bartholomew); attic ventilation 1 sq ft NFA per 150 sq ft (1/300 with balanced intake/exhaust) split ~50/50; chimney 3-2-10 rule;
 * NEC continuous-load rule (circuit ≥ 125% of charger amps) and NEC 210.52 receptacle spacing (no point on a wall > 6 ft from an outlet,
 * kitchen counters ≤ 24 in); AHAM 2/3 rule for air-purifier CADR; DOE ≈ 1% heating savings per °F of 8-hour setback; WaterSense flows
 * (shower 2.0 gpm, toilet 1.28 gpf, faucet 1.5 gpm). Costs and product rates are editable typical defaults.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt, dateIn, dayText } from "./trv-core";

const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const ceil = (x: number) => Math.ceil(x - 1e-9);
const ft2 = (x: number) => `${nfmt(x, 0)} sq ft`;
const $0 = (x: number) => money(x, "$", 0);
const pc = (x: number, dp = 0) => `${(x * 100).toFixed(dp)}%`;
const today = () => Math.floor(Date.now() / 86400000);

// ---- Lawn, garden & trees ----
const LIME = [30, 45, 60, 80, 100];
export const lime: Calc = (v) => {
  const a = need(p(v, "a", 5000), "Enter lawn area (sq ft)."), ph = p(v, "p", 5.5), tgt = p(v, "t", 6.5), s = pick(v.s, 5);
  const up = Math.max(0, tgt - ph), per = up * LIME[s], lb = (per * a) / 1000;
  return { lb: up ? `${nfmt(lb, 0)} lb of ground limestone (${nfmt(ceil(lb / 40))} × 40 lb bags)` : "No lime needed — pH is already at or above target", rate: `${nfmt(per, 0)} lb per 1,000 sq ft to raise pH ${nfmt(up, 1)} units on ${["sand", "sandy loam", "loam", "clay loam", "clay"][s]}`, note: per > 50 ? "Apply no more than ~50 lb per 1,000 sq ft at a time — split into spring and fall applications" : "Retest soil in 6–12 months · a soil test gives the exact rate" };
};
export const waterTime: Calc = (v) => {
  const inch = p(v, "i", 1), rate = need(p(v, "r", 0.5), "Enter sprinkler output (in per hour)."), days = Math.max(1, Math.round(p(v, "d", 2)));
  const min = (inch / rate) * 60;
  return { t: `${nfmt(min / days, 0)} minutes per watering, ${days}× a week`, tot: `${nfmt(min, 0)} minutes a week for ${nfmt(inch, 2)} in`, note: "Measure output with tuna cans for 15 minutes × 4 · water deeply and early in the morning; clay soils may need two shorter cycles" };
};
export const sprinklerSpacing: Calc = (v) => {
  const r = need(p(v, "r", 15), "Enter sprinkler throw radius (ft)."), L = p(v, "l", 60), W = p(v, "w", 30), tri = pick(v.t, 2) === 1;
  const rowSp = tri ? r * 0.866 : r, heads = (Math.floor(L / r) + 1) * (Math.floor(W / rowSp) + 1);
  return { sp: `Space heads ${nfmt(r, 0)} ft apart (head-to-head)${tri ? `, rows ${nfmt(rowSp, 1)} ft apart in a triangle` : ""}`, n: `≈ ${heads} heads for ${nfmt(L, 0)} × ${nfmt(W, 0)} ft`, note: "Head-to-head coverage (each head throws to the next) gives even watering · don't mix rotors and sprays on one zone" };
};
export const mowTime: Calc = (v) => {
  const a = need(p(v, "a", 0.5), "Enter lawn size (acres)."), w = need(p(v, "w", 42), "Enter deck width (in)."), mph = p(v, "s", 3.5), eff = p(v, "e", 75) / 100;
  const acph = ((w / 12) * mph * 5280 * eff) / 43560, h = a / acph;
  return { t: `≈ ${nfmt(h * 60, 0)} minutes (${nfmt(acph, 2)} acres per hour)`, how: `${nfmt(w, 0)} in deck at ${nfmt(mph, 1)} mph with ${pc(eff)} efficiency (turns and overlap)`, note: "Push mowers ~2.5 mph, riding mowers 3–5 mph, zero-turns 5–8 mph" };
};
export const weedMix: Calc = (v) => {
  const r = need(p(v, "r", 2.5), "Enter label rate (fl oz per gallon)."), g = need(p(v, "g", 2), "Enter sprayer size (gal).");
  const oz = r * g;
  return { oz: `${nfmt(oz, 1)} fl oz concentrate (${nfmt(oz * 29.57, 0)} mL ≈ ${nfmt(oz * 2, 1)} tbsp) in ${nfmt(g, 1)} gal of water`, how: `${nfmt(r, 2)} fl oz per gallon × ${nfmt(g, 1)} gal`, note: "The label is the law — use the rate for your target weeds, wear gloves, and avoid spraying in wind or before rain" };
};
const SFG: [string, number][] = [["Tomato (staked)", 1], ["Pepper", 1], ["Broccoli / cabbage / cauliflower", 1], ["Cucumber (trellised)", 2], ["Lettuce (leaf)", 4], ["Swiss chard / kale", 4], ["Bush beans", 9], ["Spinach", 9], ["Beets", 9], ["Peas (trellised)", 8], ["Carrots", 16], ["Radishes", 16], ["Onions", 16]];
export const sfg: Calc = (v) => {
  const c = SFG[pick(v.c, SFG.length)], sq = Math.max(1, Math.round(p(v, "s", 4)));
  return { n: `${nfmt(c[1] * sq)} plants of ${c[0].toLowerCase()} in ${sq} square${sq > 1 ? "s" : ""}`, per: `${c[1]} per 1 × 1 ft square (${c[1] === 1 ? "one per square" : `${Math.sqrt(c[1]) % 1 ? "spread evenly" : `${Math.sqrt(c[1])} × ${Math.sqrt(c[1])} grid`}`})`, note: "Square-foot gardening densities · a 4 × 4 ft bed has 16 squares; vining crops need a trellis on the north side" };
};
export const gardenSize: Calc = (v) => {
  const n = need(p(v, "n", 4), "Enter people."), goal = pick(v.g, 3), per = [100, 200, 300][goal];
  return { a: `≈ ${ft2(n * per)} of garden (${nfmt(n * per / 43560, 3)} acres)`, how: `${per} sq ft per person for ${["fresh summer eating", "fresh eating + some preserving", "most vegetables for the year"][goal]}`, note: "Start smaller than you think — 100–200 sq ft is plenty for a first season · raised beds 4 ft wide are easiest to reach" };
};
const FROST: [string, number, string][] = [["Peas (direct sow)", -42, "outdoors"], ["Onions / leeks (sets)", -28, "outdoors"], ["Lettuce & spinach (direct sow)", -28, "outdoors"], ["Potatoes", -14, "outdoors"], ["Carrots & beets (direct sow)", -21, "outdoors"], ["Broccoli & cabbage (transplant)", -14, "outdoors"], ["Beans (direct sow)", 7, "outdoors"], ["Squash & cucumbers", 10, "outdoors"], ["Tomatoes (transplant)", 14, "outdoors"], ["Peppers & eggplant (transplant)", 21, "outdoors"], ["Tomato seeds indoors", -49, "indoors"], ["Pepper seeds indoors", -63, "indoors"]];
export const frostPlant: Calc = (v) => {
  const lf = dateIn(v, "d", today() + 120), c = FROST[pick(v.c, FROST.length)];
  return { d: `${c[2] === "indoors" ? "Start indoors" : "Plant outdoors"} around ${dayText(lf + c[1])}`, how: `${c[0]}: ${Math.abs(c[1] / 7)} week${Math.abs(c[1]) === 7 ? "" : "s"} ${c[1] < 0 ? "before" : "after"} your last frost (${dayText(lf)})`, note: "Find your average last frost date from your local extension office · warm-season crops need soil above about 60 °F" };
};
export const harvestDate: Calc = (v) => {
  const d = dateIn(v, "d", today()), dtm = need(p(v, "m", 75), "Enter days to maturity."), tr = pick(v.t, 2) === 1;
  const h = d + dtm;
  return { d: `First harvest around ${dayText(h)}`, w: `Window ${dayText(h - Math.round(dtm * 0.1))} – ${dayText(h + Math.round(dtm * 0.15))}`, note: tr ? "Days to maturity on transplant tags count from transplanting" : "For crops usually transplanted (tomatoes, peppers), seed-packet days often count from transplant — add 6–8 weeks if sowing direct" };
};
const YLD: [string, number][] = [["Tomato (indeterminate)", 12], ["Tomato (determinate)", 6], ["Pepper (bell)", 3], ["Zucchini / summer squash", 8], ["Cucumber", 6], ["Pole beans", 1.5], ["Bush beans", 0.5], ["Potato (per plant)", 2], ["Winter squash", 8], ["Eggplant", 4]];
export const gardenYield: Calc = (v) => {
  const c = YLD[pick(v.c, YLD.length)], n = need(p(v, "n", 6), "Enter number of plants."), pr = p(v, "p", 0);
  return { lb: `≈ ${nfmt(c[1] * n, 0)} lb from ${nfmt(n)} plants (${nfmt(c[1], 1)} lb each)`, val: pr > 0 ? `Worth about ${$0(c[1] * n * pr)} at ${money(pr)} per lb` : "Typical yields for a healthy home-garden season", note: "Yield varies widely with variety, sun, water and season length — treat as a rough planning number" };
};
export const tomatoPlants: Calc = (v) => {
  const n = need(p(v, "n", 4), "Enter people."), g = pick(v.g, 3);
  const per = [2, 4, 8][g], plants = ceil(n * per);
  return { n: `${nfmt(plants)} tomato plants`, why: `${per} per person for ${["fresh eating", "fresh eating + some sauce", "canning and freezing"][g]}`, note: `About ${ft2(plants * 4)} of bed space at 2 × 2 ft per staked plant · mix early, slicing and paste varieties` };
};
export const plantWater: Calc = (v) => {
  const a = need(p(v, "a", 100), "Enter bed area (sq ft)."), inch = p(v, "i", 1), rain = p(v, "r", 0.3), hot = pick(v.h, 2) === 1;
  const net = Math.max(0, inch * (hot ? 1.5 : 1) - rain), gal = a * net * 0.623;
  return { gal: `${nfmt(gal, 0)} gallons a week`, how: `${nfmt(net, 2)} in of supplemental water over ${ft2(a)} (1 in = 0.623 gal per sq ft)`, note: "Most vegetables need about 1 in a week, more in hot, windy weather · containers may need water daily" };
};
export const rainBarrel: Calc = (v) => {
  const a = need(p(v, "a", 1000), "Enter roof area feeding the downspout (sq ft)."), r = p(v, "r", 1), e = p(v, "e", 90) / 100, b = p(v, "b", 55);
  const gal = a * r * 0.623 * e;
  return { gal: `${nfmt(gal, 0)} gallons from ${nfmt(r, 2)} in of rain`, b: `Fills ${nfmt(gal / b, 1)} × ${nfmt(b, 0)}-gal barrels — add an overflow`, note: "About 600 gallons per inch of rain per 1,000 sq ft of roof · check local rules on rainwater collection" };
};
export const scribner: Calc = (v) => {
  const d = need(p(v, "d", 16), "Enter small-end diameter inside bark (in)."), L = need(p(v, "l", 16), "Enter log length (ft)."), pr = p(v, "p", 0);
  const bf = Math.max(0, (0.79 * d * d - 2 * d - 4) * (L / 16));
  return { bf: `≈ ${nfmt(bf, 0)} board feet (Scribner)`, val: pr > 0 ? `Worth ≈ ${$0((bf / 1000) * pr)} at ${$0(pr)} per MBF` : "Board feet = (0.79 D² − 2D − 4) × L/16", note: "Mills may use Doyle or International ¼ in rules, which give different numbers · scale at the small end inside the bark" };
};
export const bulbDepth: Calc = (v) => {
  const h = need(p(v, "h", 2), "Enter bulb height (in)."), w = p(v, "w", 1.5), sand = pick(v.s, 2) === 1;
  const d = h * (sand ? 3 : 2.5);
  return { d: `Plant ${nfmt(d, 1)} in deep (to the base of the bulb)`, sp: `Space ${nfmt(w * 3, 1)} in apart (about 3× bulb width)`, note: "Rule: 2–3 times the bulb's height, deeper in light soil · pointed end up; plant spring bulbs in fall before the ground freezes" };
};
export const growLight: Calc = (v) => {
  const a = need(p(v, "a", 16), "Enter grow area (sq ft)."), st = pick(v.s, 4), ppf = p(v, "f", 1000), hrs = p(v, "h", 16);
  const ppfd = [300, 500, 800, 150][st], m2 = a * 0.0929, need0 = ppfd * m2, dli = (ppfd * hrs * 3600) / 1e6;
  return { ppf: `${nfmt(need0, 0)} µmol/s of light needed (${nfmt(ppfd, 0)} PPFD over ${nfmt(m2, 2)} m²)`, n: `${nfmt(ceil(need0 / ppf))} fixture${ceil(need0 / ppf) > 1 ? "s" : ""} of ${nfmt(ppf, 0)} µmol/s PPF`, note: `Daily light integral ≈ ${nfmt(dli, 1)} mol/m²/day at ${nfmt(hrs, 0)} h · ${["seedlings", "vegetative growth", "flowering / fruiting", "leafy greens & herbs"][st]} target` };
};
const CN: [string, number][] = [["Grass clippings", 20], ["Food scraps", 15], ["Coffee grounds", 20], ["Cow manure", 20], ["Chicken manure", 7], ["Dry leaves", 60], ["Straw", 80], ["Cardboard", 350], ["Wood chips", 400], ["Sawdust", 500]];
export const compostCn: Calc = (v) => {
  let N = 0, C = 0; const used: string[] = [];
  for (let i = 1; i <= 4; i++) { const w = p(v, `w${i}`, i <= 2 ? 1 : 0); if (w > 0) { const m = CN[pick(v[`m${i}`], CN.length)]; N += w / (m[1] + 1); C += (w * m[1]) / (m[1] + 1); used.push(`${m[0]} (${m[1]}:1) ×${nfmt(w, 1)}`); } }
  if (!N) throw new InputError("Add at least one material.");
  const r = C / N;
  return { r: `Mix C:N ≈ ${nfmt(r, 0)}:1`, read: r < 20 ? "Too much nitrogen (greens) — add browns to stop odours" : r > 40 ? "Too much carbon (browns) — add greens to heat it up" : "In the 25–30:1 sweet spot (20–40 works)", note: `${used.join(" · ")} · by weight; simplified (assumes similar dry matter)` };
};
export const wormBin: Calc = (v) => {
  const f = need(p(v, "f", 3.5), "Enter food scraps per week (lb).");
  const worms = (f / 7) * 2, sq = f;
  return { w: `≈ ${nfmt(worms, 1)} lb of red wigglers (≈ ${nfmt(worms * 1000, 0)} worms)`, b: `Bin surface ≈ ${nfmt(sq, 1)} sq ft, 8–12 in deep`, note: "Rule: 1 sq ft per lb of scraps a week; worms eat about half their weight a day · no meat, dairy or oily food" };
};
const FT: [string, number][] = [["Apple — dwarf", 75], ["Apple — semi-dwarf", 250], ["Apple — standard", 450], ["Peach", 150], ["Pear", 250], ["Cherry (sweet)", 60], ["Plum", 80], ["Citrus (orange)", 150]];
export const fruitYield: Calc = (v) => {
  const t = FT[pick(v.t, FT.length)], n = need(p(v, "n", 3), "Enter number of trees."), mat = p(v, "m", 100) / 100;
  return { lb: `≈ ${nfmt(t[1] * n * mat, 0)} lb of fruit a year`, per: `${nfmt(t[1] * mat, 0)} lb per ${t[0].toLowerCase()} tree at ${pc(mat)} of mature yield`, note: "Typical mature yields — young trees bear little for 2–6 years; pruning, pollination and weather matter a lot" };
};

// ---- Pool, pond & water ----
export const pondFish: Calc = (v) => {
  const g = need(p(v, "g", 1500), "Enter pond volume (gal)."), k = pick(v.k, 2) === 0;
  const n = k ? Math.floor(g / 250) : Math.floor(g / 20);
  return { n: `About ${nfmt(n)} ${k ? "adult koi" : "goldfish"} maximum`, rule: k ? "Koi: about 250 gallons per adult koi (they grow 24 in+)" : "Goldfish: about 20 gallons per fish (1 in of fish per 10 gal when young)", note: "Stock lightly and add fish slowly — filtration, aeration and depth (koi need 3 ft+) matter more than any rule" };
};
export const wellFlow: Calc = (v) => {
  const g = need(p(v, "g", 5), "Enter bucket size (gal)."), s = need(p(v, "s", 40), "Enter seconds to fill.");
  const gpm = (g / s) * 60;
  return { gpm: `${nfmt(gpm, 1)} gallons per minute`, read: gpm >= 10 ? "Plenty for most homes (6–12 gpm peak demand)" : gpm >= 6 ? "Adequate for a typical home" : "Low — a pressure tank or storage tank helps meet peak demand", note: `${nfmt(gpm * 60, 0)} gal an hour · test at the pressure tank with other fixtures off; a full well yield test takes hours` };
};
export const waterTank: Calc = (v) => {
  const ppl = need(p(v, "n", 4), "Enter people."), use = p(v, "u", 80), d = p(v, "d", 3), fire = p(v, "f", 0);
  const g = ppl * use * d + fire;
  return { g: `${nfmt(g, 0)} gallon tank (${nfmt(g * 3.785, 0)} L)`, how: `${nfmt(ppl)} people × ${nfmt(use, 0)} gal a day × ${nfmt(d, 1)} days${fire ? ` + ${nfmt(fire, 0)} gal reserve` : ""}`, note: "US average is about 80 gal per person per day indoors and out; emergency drinking water is 1 gal per person per day" };
};
export const householdWater: Calc = (v) => {
  const sh = p(v, "s", 8), sr = p(v, "sr", 2), fl = p(v, "f", 5), gpf = p(v, "g", 1.28), lo = p(v, "l", 1), lg = p(v, "lg", 20), dw = p(v, "d", 1), fm = p(v, "fm", 10), n = Math.max(1, p(v, "n", 4)), price = p(v, "pr", 6);
  const day = n * (sh * sr + fl * gpf + fm * 1.5) + lo * lg + dw * 4, yr = day * 365;
  return { day: `${nfmt(day, 0)} gallons a day (${nfmt(day / n, 0)} per person)`, yr: `${nfmt(yr, 0)} gal a year ≈ ${$0((yr / 1000) * price)} at ${money(price)} per 1,000 gal`, note: "WaterSense fixtures: shower 2.0 gpm, toilet 1.28 gpf, faucet 1.5 gpm · old toilets use 3.5 gpf or more" };
};

// ---- Roofing & gutters ----
export const underlayRoof: Calc = (v) => {
  const a = need(p(v, "a", 2000), "Enter roof area (sq ft)."), t = pick(v.t, 3), w = 1 + p(v, "w", 10) / 100;
  const cov = [1000, 400, 200][t];
  return { r: `${nfmt(ceil((a * w) / cov))} rolls of ${["synthetic underlayment (~10 squares)", "#15 felt (~4 squares)", "#30 felt (~2 squares)"][t]}`, a: `${ft2(a * w)} including overlaps (+${nfmt((w - 1) * 100, 0)}%)`, note: "Add ice & water shield at eaves (at least 24 in inside the wall line in cold climates), valleys and penetrations" };
};
export const dripEdge: Calc = (v) => {
  const e = p(v, "e", 80), r = p(v, "r", 60), pc0 = p(v, "p", 10);
  const L = (e + r) * 1.1;
  return { n: `${nfmt(ceil(L / pc0))} pieces of drip edge (${nfmt(pc0, 0)} ft)`, L: `${nfmt(L, 0)} ft for ${nfmt(e, 0)} ft of eaves + ${nfmt(r, 0)} ft of rakes (+10% for overlaps)`, note: "At eaves, drip edge goes under the underlayment; on rakes, over it · overlap pieces 2 in" };
};
export const ridgeCap: Calc = (v) => {
  const L = need(p(v, "l", 60), "Enter ridge + hip length (ft)."), b = p(v, "b", 25);
  return { n: `${nfmt(ceil((L * 1.1) / b))} bundles of hip & ridge cap shingles`, how: `${nfmt(L, 0)} ft (+10%) ÷ ${nfmt(b, 0)} linear ft per bundle`, note: "Coverage per bundle varies by product (about 20–33 ft) — check the wrapper · ridge vents need cap shingles too" };
};
export const ventNfa: Calc = (v) => {
  const a = need(p(v, "a", 1500), "Enter attic floor area (sq ft)."), bal = pick(v.b, 2) === 1, ex = p(v, "x", 18), it = p(v, "i", 9);
  const nfa = (a / (bal ? 300 : 150)) * 144, half = nfa / 2;
  return { nfa: `${nfmt(nfa, 0)} sq in of net free area (${nfmt(nfa / 144, 1)} sq ft)`, split: `${nfmt(half, 0)} sq in intake + ${nfmt(half, 0)} sq in exhaust → ${nfmt(half / ex, 0)} ft of ridge vent (${nfmt(ex, 0)} sq in/ft) and ${nfmt(half / it, 0)} ft of soffit vent (${nfmt(it, 0)} sq in/ft)`, note: `${bal ? "1/300 rule (balanced vents or vapour retarder)" : "1/150 rule"} · keep intake at least equal to exhaust; don't mix ridge vents with gable or powered vents` };
};
export const downspouts: Calc = (v) => {
  const a = need(p(v, "a", 2000), "Enter roof area (sq ft)."), g = p(v, "g", 120), sz = pick(v.s, 2), heavy = pick(v.h, 2) === 1;
  const per = (sz === 0 ? 600 : 1200) * (heavy ? 0.7 : 1), n = Math.max(ceil(a / per), ceil(g / 40));
  return { n: `${n} downspouts`, how: `Roof ${ft2(a)} ÷ ${nfmt(per, 0)} sq ft per ${sz === 0 ? "2×3" : "3×4"} in downspout, and at least one per 40 ft of gutter`, note: "Put downspouts at corners and low points · extend outlets 4–6 ft from the foundation" };
};
export const roofRunoff: Calc = (v) => {
  const a = need(p(v, "a", 2000), "Enter roof area (sq ft)."), r = p(v, "r", 1), ann = p(v, "y", 40);
  return { g: `${nfmt(a * r * 0.623, 0)} gallons from ${nfmt(r, 2)} in of rain`, y: `≈ ${nfmt(a * ann * 0.623 * 0.9, 0)} gallons a year from ${nfmt(ann, 0)} in of annual rainfall (90% capture)`, note: "Use the roof's footprint (plan) area, not the sloped area" };
};
const LIFE: [string, number][] = [["3-tab asphalt shingles", 20], ["Architectural asphalt shingles", 28], ["Metal (standing seam)", 50], ["Wood shakes", 30], ["Clay / concrete tile", 50], ["Slate", 90], ["EPDM / TPO flat roof", 25]];
export const roofLife: Calc = (v) => {
  const m = LIFE[pick(v.m, LIFE.length)], age = p(v, "a", 12), cl = pick(v.c, 3), f = [1, 0.85, 0.75][cl];
  const life = m[1] * f, left = life - age;
  return { left: left > 0 ? `About ${nfmt(left, 0)} years left` : "Past its expected life — get an inspection", life: `${m[0]}: ~${nfmt(life, 0)} years expected (${["mild", "hot / sunny", "harsh (hail, freeze-thaw, coastal)"][cl]} climate)`, note: "Signs it's time: curling or missing shingles, granules in gutters, leaks, daylight through boards" };
};

// ---- HVAC, plumbing & electrical ----
export const cadr: Calc = (v) => {
  const a = need(p(v, "a", 300), "Enter room area (sq ft)."), h = p(v, "h", 8), c = p(v, "c", 200);
  const need0 = ((a * h) / 8) * (2 / 3), ach = (c * 60) / (a * h);
  return { c: `Look for a CADR of at least ${nfmt(need0, 0)} cfm`, ach: `A ${nfmt(c, 0)} CADR purifier gives ${nfmt(ach, 1)} air changes per hour here (aim for 4–5 for allergies)`, note: "AHAM 2/3 rule: CADR ≥ ⅔ of the room's floor area (8 ft ceilings) · use the smoke CADR for the lowest of the three" };
};
export const afue: Calc = (v) => {
  const cost = need(p(v, "c", 1500), "Enter yearly heating cost."), o = need(p(v, "o", 80), "Enter old AFUE (%)."), n = need(p(v, "n", 96), "Enter new AFUE (%)."), up = p(v, "u", 4000);
  const save = cost * (1 - o / n);
  return { s: `${$0(save)} a year saved`, pb: up > 0 ? `Upgrade pays back in ${nfmt(up / Math.max(save, 1), 1)} years` : "—", note: `${nfmt(o, 0)}% → ${nfmt(n, 0)}% AFUE · new cost ${$0(cost - save)} a year` };
};
export const setback: Calc = (v) => {
  const d = p(v, "d", 8), h = p(v, "h", 8), cost = p(v, "c", 1500), cool = p(v, "cc", 800);
  const pct = Math.min(0.15, (d * 0.01 * h) / 8);
  return { s: `≈ ${$0((cost + cool) * pct)} a year (${pc(pct, 1)} of heating & cooling)`, how: `${nfmt(d, 0)} °F setback for ${nfmt(h, 0)} hours a day ≈ 1% per degree per 8 hours (DOE)`, note: "A smart or programmable thermostat automates it · heat pumps do better with small setbacks" };
};
const FUEL: [string, number, string][] = [["Natural gas", 100000, "therm"], ["Propane", 91500, "gal"], ["Heating oil", 138500, "gal"], ["Electric resistance", 3412, "kWh"], ["Heat pump (COP 3)", 3412 * 3, "kWh"]];
export const hddCost: Calc = (v) => {
  const load = need(p(v, "l", 40000), "Enter design heat loss (BTU/h)."), dt = need(p(v, "t", 65), "Enter design temperature difference (°F)."), hdd = need(p(v, "d", 5000), "Enter heating degree days."), f = FUEL[pick(v.f, FUEL.length)], eff = p(v, "e", 95) / 100 || 1, pr = p(v, "p", 1.5);
  const btu = (load / dt) * 24 * hdd, units = btu / (f[1] * (pick(v.f, FUEL.length) >= 3 ? 1 : eff));
  return { c: `≈ ${$0(units * pr)} a year to heat`, u: `${nfmt(units, 0)} ${f[2]}s of ${f[0].toLowerCase()} (${nfmt(btu / 1e6, 1)} million BTU)`, note: `${nfmt(hdd, 0)} HDD (base 65 °F) · find yours from weather data · heat loss from a Manual J or your contractor` };
};
export const whCost: Calc = (v) => {
  const g = need(p(v, "g", 64), "Enter hot water use (gal/day)."), dt = p(v, "t", 70), t = pick(v.ty, 4), ef = p(v, "e", 0) / 100, pr = p(v, "p", 0.16);
  const def = [0.92, 0.62, 0.9, 3.5][t], e = ef || def, btu = g * 8.34 * dt * 365, unit = t === 1 || t === 2 ? 100000 : 3412;
  const units = btu / (unit * e);
  return { c: `≈ ${$0(units * pr)} a year`, u: `${nfmt(units, 0)} ${unit === 3412 ? "kWh" : "therms"} for ${nfmt(g, 0)} gal a day heated ${nfmt(dt, 0)} °F (${["electric tank", "gas tank", "gas tankless", "heat pump"][t]}, efficiency ${nfmt(e, 2)})`, note: "Average US household uses about 64 gal of hot water a day · enter your electricity ($/kWh) or gas ($/therm) price" };
};
export const outlets: Calc = (v) => {
  const w = need(p(v, "w", 48), "Enter usable wall length (ft, excluding doors)."), c = p(v, "c", 0);
  const wall = Math.max(1, ceil(w / 12)), ctr = c > 0 ? Math.max(1, ceil(c / 4)) : 0;
  return { n: `At least ${wall + ctr} outlets${ctr ? ` (${wall} on walls + ${ctr} on counters)` : ""}`, how: "NEC 210.52: no point along a wall more than 6 ft from an outlet (≈ one per 12 ft); kitchen counters: no point more than 24 in away (≈ one per 4 ft)", note: "Walls 2 ft or wider need an outlet · kitchens, baths and outdoor outlets need GFCI; most new circuits need AFCI" };
};
export const batteryBackup: Calc = (v) => {
  const w = need(p(v, "w", 1500), "Enter essential load (W)."), h = need(p(v, "h", 12), "Enter hours of backup."), dod = p(v, "d", 90) / 100 || 0.9, ef = p(v, "e", 90) / 100 || 0.9, unit = p(v, "u", 13.5), peak = p(v, "pk", 5000);
  const kwh = (w * h) / 1000 / dod / ef;
  return { k: `${nfmt(kwh, 1)} kWh of battery`, n: `${nfmt(ceil(kwh / unit))} battery unit${ceil(kwh / unit) > 1 ? "s" : ""} of ${nfmt(unit, 1)} kWh · inverter ≥ ${nfmt(peak / 1000, 1)} kW for start-up surges`, note: `${nfmt(w, 0)} W average for ${nfmt(h, 0)} h, ${pc(dod)} usable depth, ${pc(ef)} inverter efficiency · a fridge, lights, internet and furnace fan is about 1–2 kW` };
};
const EVW: [number, string][] = [[30, "10 AWG copper"], [40, "8 AWG copper"], [50, "6 AWG copper"], [60, "6 AWG copper (75 °C) / 4 AWG"], [70, "4 AWG copper"], [80, "4 AWG copper (75 °C) / 3 AWG"], [100, "3 AWG copper (75 °C) / 2 AWG"]];
export const evCircuit: Calc = (v) => {
  const a = need(p(v, "a", 40), "Enter charger output (A)."), vlt = p(v, "v", 240), mi = p(v, "m", 3.5);
  const br = a * 1.25, std = [15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 125].find((x) => x >= br) ?? 125, wire = EVW.find((x) => x[0] >= std)?.[1] ?? "consult an electrician";
  const kw = (a * vlt) / 1000;
  return { br: `${std} A breaker (125% of ${nfmt(a, 0)} A continuous load)`, wire: `Typical wire: ${wire} for a ${std} A circuit`, rate: `${nfmt(kw, 1)} kW ≈ ${nfmt(kw * mi, 0)} miles of range per hour at ${nfmt(mi, 1)} mi/kWh · have a licensed electrician check panel capacity` };
};
export const chimney: Calc = (v) => {
  const pitch = p(v, "p", 6), dist = p(v, "d", 3), within = p(v, "w", 10);
  const ridgeRise = Math.min(dist, within) * (pitch / 12), need0 = Math.max(3, ridgeRise + 2);
  return { h: `Chimney top at least ${nfmt(need0, 1)} ft above the roof where it exits`, how: `3-2-10 rule: ≥ 3 ft above the penetration and ≥ 2 ft higher than any roof within 10 ft (roof rises ${nfmt(ridgeRise, 1)} ft over ${nfmt(Math.min(dist, within), 1)} ft at ${nfmt(pitch, 0)}/12)`, note: "Check the stove or flue maker's instructions — they may require more height for good draft" };
};

// ---- Remodel & home costs ----
const rng = (x: number) => `${$0(x * 0.8)}–${$0(x * 1.25)}`;
export const atticConv: Calc = (v) => {
  const a = need(p(v, "a", 400), "Enter attic floor area (sq ft)."), r = p(v, "r", 60), st = pick(v.s, 2) === 1 ? 4000 : 0, bath = pick(v.b, 2) === 1 ? 15000 : 0, dorm = Math.round(p(v, "d", 0)) * 15000;
  const tot = a * r + st + bath + dorm;
  return { c: `≈ ${$0(tot)} (range ${rng(tot)})`, parts: `Finishing ${$0(a * r)} (${money(r)}/sq ft)${st ? " + stairs $4,000" : ""}${bath ? " + bathroom $15,000" : ""}${dorm ? ` + dormers ${$0(dorm)}` : ""}`, note: "Code needs ≥ 7 ft ceiling over half the floor area, a legal stair and egress window · enter local quotes" };
};
export const leadPaint: Calc = (v) => {
  const a = need(p(v, "a", 1000), "Enter painted surface area (sq ft)."), m = pick(v.m, 3), test = p(v, "t", 400);
  const r = [3, 12, 15][m], tot = a * r + test;
  return { c: `≈ ${$0(tot)} (range ${rng(tot)})`, how: `${["Encapsulation", "Removal (abatement)", "Enclosure / component replacement"][m]} at about ${money(r)}/sq ft + inspection ${$0(test)}`, note: "Homes built before 1978 may have lead paint · in the US, renovation that disturbs it needs an EPA RRP-certified contractor" };
};
export const termite: Calc = (v) => {
  const m = pick(v.m, 3), lf = p(v, "l", 200), sq = p(v, "a", 2000), plan = p(v, "y", 300);
  const c = m === 0 ? lf * 8 : m === 1 ? 1500 : sq * 2.5;
  return { c: `≈ ${$0(c)} upfront (range ${rng(c)})`, how: [`Liquid barrier around ${nfmt(lf, 0)} ft of foundation (~$8/ft)`, "Bait station system (install)", `Tent fumigation for drywood termites (~$2.50/sq ft × ${ft2(sq)})`][m], note: `Plus about ${$0(plan)} a year for monitoring/renewal warranties · typical ranges only — get 2–3 inspections` };
};
export const handyman: Calc = (v) => {
  const h = need(p(v, "h", 4), "Enter hours."), r = p(v, "r", 75), t = p(v, "t", 50), mat = p(v, "m", 100), min = p(v, "mn", 150);
  const lab = Math.max(min, h * r);
  return { c: `≈ ${$0(lab + t + mat)} total`, parts: `Labour ${$0(lab)} (${nfmt(h, 1)} h × ${money(r)}/h${h * r < min ? `, minimum charge ${$0(min)}` : ""}) + trip fee ${$0(t)} + materials ${$0(mat)}`, note: "Typical US handyman rates are about $50–$100 an hour · bundle small jobs into one visit" };
};
export const maint1pct: Calc = (v) => {
  const val = need(p(v, "v", 400000), "Enter home value."), sq = p(v, "s", 2000), age = p(v, "a", 25);
  const one = val * 0.01, sqft = sq * 1, adj = age > 30 ? 1.5 : age > 15 ? 1.2 : 1;
  return { b: `${$0(one * adj)} a year (${$0((one * adj) / 12)} a month)`, how: `1% rule ${$0(one)}${adj > 1 ? ` × ${adj} for a ${nfmt(age, 0)}-year-old home` : ""} · square-foot rule ${$0(sqft)} ($1 per sq ft)`, note: "Budget for big-ticket items too: roof, HVAC, water heater, exterior paint · unused money rolls into a home repair fund" };
};
export const theater: Calc = (v) => {
  const items = ["pr", "sc", "av", "sp", "se", "ac", "li", "co"].map((k, i) => p(v, k, [1500, 400, 800, 1200, 2000, 600, 300, 2500][i]));
  const tot = items.reduce((a, b) => a + b, 0);
  return { c: `≈ ${$0(tot)} total`, parts: `Display/projector ${$0(items[0])} · screen ${$0(items[1])} · AV receiver ${$0(items[2])} · speakers ${$0(items[3])} · seating ${$0(items[4])} · acoustic panels ${$0(items[5])} · lighting ${$0(items[6])} · construction/wiring ${$0(items[7])}`, note: "Enter your own prices · biggest gains come from room light control and speaker placement, not the priciest gear" };
};
export const accessible: Calc = (v) => {
  const ramp = p(v, "r", 20), doors = Math.round(p(v, "d", 3)), shower = pick(v.s, 2) === 1, bars = Math.round(p(v, "g", 4)), lift = pick(v.l, 2) === 1, kit = pick(v.k, 2) === 1;
  const c = ramp * 200 + doors * 1000 + (shower ? 10000 : 0) + bars * 250 + (lift ? 12000 : 0) + (kit ? 15000 : 0);
  return { c: `≈ ${$0(c)} (range ${rng(c)})`, parts: `Ramp ${$0(ramp * 200)} (${nfmt(ramp, 0)} ft) · ${doors} widened doors ${$0(doors * 1000)}${shower ? " · roll-in shower $10,000" : ""} · ${bars} grab bars ${$0(bars * 250)}${lift ? " · stair lift $12,000" : ""}${kit ? " · kitchen changes $15,000" : ""}`, note: "ADA ramp slope 1:12 (1 ft of ramp per inch of rise) · ask about Medicaid waivers, VA grants and state home-modification programs" };
};

// ---- registry (generated)
export const ideaHome3CustomCalculators: Record<string, Calc> = {
  "lawn-lime-amount-calculator": lime,
  "lawn-watering-time-calculator": waterTime,
  "sprinkler-head-spacing-calculator": sprinklerSpacing,
  "lawn-mowing-time-calculator": mowTime,
  "weed-killer-mix-ratio-calculator": weedMix,
  "square-foot-gardening-plants-calculator": sfg,
  "vegetable-garden-size-for-family-calculator": gardenSize,
  "last-frost-planting-date-calculator": frostPlant,
  "days-to-harvest-calculator": harvestDate,
  "garden-yield-per-plant-calculator": gardenYield,
  "tomato-plants-per-person-calculator": tomatoPlants,
  "plant-water-needs-calculator": plantWater,
  "rain-barrel-collection-calculator": rainBarrel,
  "log-board-feet-scribner-calculator": scribner,
  "bulb-planting-depth-calculator": bulbDepth,
  "grow-light-coverage-calculator": growLight,
  "compost-c-to-n-ratio-calculator": compostCn,
  "worm-bin-size-calculator": wormBin,
  "fruit-tree-yield-calculator": fruitYield,
  "pond-fish-stocking-calculator": pondFish,
  "well-water-flow-rate-calculator": wellFlow,
  "water-tank-size-calculator": waterTank,
  "water-usage-household-calculator": householdWater,
  "roof-underlayment-rolls-calculator": underlayRoof,
  "drip-edge-length-calculator": dripEdge,
  "ridge-cap-shingles-calculator": ridgeCap,
  "roof-vent-nfa-calculator": ventNfa,
  "downspout-count-calculator": downspouts,
  "roof-runoff-volume-calculator": roofRunoff,
  "roof-lifespan-remaining-calculator": roofLife,
  "air-purifier-cadr-room-size-calculator": cadr,
  "afue-furnace-savings-calculator": afue,
  "thermostat-setback-savings-calculator": setback,
  "heating-degree-days-cost-calculator": hddCost,
  "water-heater-operating-cost-calculator": whCost,
  "outlet-count-per-room-calculator": outlets,
  "whole-house-battery-backup-size-calculator": batteryBackup,
  "ev-charger-circuit-size-calculator": evCircuit,
  "chimney-height-draft-calculator": chimney,
  "attic-conversion-cost-calculator": atticConv,
  "lead-paint-removal-cost-calculator": leadPaint,
  "termite-treatment-cost-calculator": termite,
  "handyman-hourly-cost-calculator": handyman,
  "home-maintenance-budget-1-percent-rule-calculator": maint1pct,
  "home-theater-build-cost-calculator": theater,
  "wheelchair-accessible-remodel-cost-calculator": accessible,
};
