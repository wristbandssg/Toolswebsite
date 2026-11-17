/**
 * Idea build, batch food2 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Food > Homebrewing (9) + Cooking & Curing (18) = 27 tools.
 * Brewing: °Plato ≈ 259 − 259/SG; pitch rate 0.75 (ale) / 1.5 (lager) million cells per mL per °P; hydrometer correction (60 °F)
 *  = SG × f(t)/f(cal), f(t) = 1.00130346 − 1.34722124e-4 t + 2.04052596e-6 t² − 2.32820948e-9 t³ (°F); refractometer FG via
 *  Terrill's cubic with a 1.04 wort correction factor; ABV = (OG − FG) × 131.25; honey ≈ 35 and sucrose ≈ 46 gravity points per
 *  lb per gallon (292 and 384 points per kg per litre).
 * Food safety: USDA safe minimums — beef/pork/lamb/veal steaks, chops, roasts and fish 145 °F (63 °C) + 3 min rest; ground meat
 *  160 °F (71 °C); poultry 165 °F (74 °C). USDA canning altitude rules: water bath +5/10/15/20 min above 1,000/3,000/6,000/8,000 ft;
 *  pressure canning weighted gauge 10 psi (≤ 1,000 ft) or 15 psi; dial gauge 11/12/13/14/15 psi by 2,000-ft band.
 * Cooking times are typical guidance; always confirm doneness with a thermometer.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const g = (x: number, dp = 0) => `${nfmt(x, dp)} g`;
const sg3 = (x: number) => x.toFixed(3);
const hm = (min: number) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`; };
const fC = (f: number) => `${Math.round(f)} °F (${Math.round(((f - 32) * 5) / 9)} °C)`;
const plato = (sg: number) => 259 - 259 / sg;

// ---- Homebrewing ----
export const pitchRate: Calc = (v) => {
  const og = need(p(v, "og", 1.05), "Enter original gravity."), L = need(p(v, "l", 20), "Enter batch volume (L)."), t = pick(v.t, 3), cpg = p(v, "dg", 10), via = p(v, "via", 90) / 100;
  const rate = [0.75, 1.5, 1][t], cells = rate * L * 1000 * plato(og) / 1000;
  return { cells: `${nfmt(cells, 0)} billion cells needed`, packs: `≈ ${nfmt(cells / (100 * via), 1)} liquid packs (100 B each at ${pc(via, 0)} viability) · or ${g(cells / cpg, 0)} dry yeast at ${nfmt(cpg, 0)} B/g`, note: `${["Ale", "Lager", "Hybrid"][t]} rate ${rate} M cells/mL/°P at ${nfmt(plato(og), 1)} °P · make a starter for higher-gravity or lager pitches` };
};
const hf = (t: number) => 1.00130346 - 1.34722124e-4 * t + 2.04052596e-6 * t * t - 2.32820948e-9 * t * t * t;
export const hydroCorr: Calc = (v) => {
  const sg = need(p(v, "sg", 1.05), "Enter the hydrometer reading."), u = pick(v.u, 2), tt = p(v, "t", u ? 30 : 86), ct = p(v, "c", u ? 15.6 : 60);
  const tf = u ? tt * 9 / 5 + 32 : tt, cf = u ? ct * 9 / 5 + 32 : ct, corr = sg * hf(tf) / hf(cf);
  return { sg: `${sg3(corr)} corrected gravity`, diff: `${corr >= sg ? "+" : "−"}${nfmt(Math.abs(corr - sg) * 1000, 1)} points vs the ${sg3(sg)} reading at ${nfmt(tt, 1)}°`, note: `Hydrometer calibrated at ${nfmt(ct, 1)}° · readings above ~120 °F (49 °C) are unreliable — cool a sample first` };
};
export const refracCorr: Calc = (v) => {
  const ob = need(p(v, "ob", 12.4), "Enter original Brix."), fb = need(p(v, "fb", 6.2), "Enter final Brix reading."), wcf = p(v, "w", 1.04) || 1.04;
  const OB = ob / wcf, FB = fb / wcf, og = 1 + OB / (258.6 - (OB / 258.2) * 227.1);
  const fg = 1 - 0.0044993 * OB + 0.011774 * FB + 0.00027581 * OB * OB - 0.0012717 * FB * FB - 0.0000072800 * OB ** 3 + 0.000063293 * FB ** 3;
  return { fg: `${sg3(fg)} final gravity`, abv: `${nfmt((og - fg) * 131.25, 1)}% ABV (OG ${sg3(og)})`, note: `Corrected for alcohol with Terrill's formula and a ${nfmt(wcf, 2)} wort correction factor · the uncorrected reading would suggest ${sg3(1 + FB / (258.6 - (FB / 258.2) * 227.1))}` };
};
export const boilOff: Calc = (v) => {
  const pre = need(p(v, "pre", 28), "Enter pre-boil volume (L)."), mins = p(v, "t", 60), rate = p(v, "r", 4), pg = p(v, "pg", 1.044);
  const post = Math.max(0.1, pre - rate * mins / 60), og = 1 + (pg - 1) * pre / post;
  return { post: `${nfmt(post, 1)} L after the boil (${nfmt(pre - post, 1)} L boiled off)`, og: `Gravity ${sg3(pg)} → ${sg3(og)} as the wort concentrates`, note: `Boil-off ${nfmt(rate, 1)} L/h (${pc(rate / pre)} of volume an hour) · wort also shrinks about 4% as it cools` };
};
export const meadHoney: Calc = (v) => {
  const L = need(p(v, "l", 19), "Enter batch volume (L)."), og = need(p(v, "og", 1.1), "Enter target original gravity."), fg = p(v, "fg", 1.01);
  const kg = (og - 1) * 1000 * L / 292;
  return { kg: `${nfmt(kg, 2)} kg honey (${nfmt(kg * 2.2046, 1)} lb) for ${nfmt(L, 1)} L`, abv: `≈ ${nfmt((og - fg) * 131.25, 1)}% ABV if it finishes at ${sg3(fg)}`, note: "Honey adds ~35 gravity points per lb per gallon · use staggered yeast nutrient (e.g. TOSNA) for a clean ferment" };
};
export const ciderAbv: Calc = (v) => {
  const og = need(p(v, "og", 1.05), "Enter original gravity."), fg = p(v, "fg", 1), L = p(v, "l", 19), tg = p(v, "tg", 0);
  const abv = (og - fg) * 131.25, add = tg > og ? ((tg - og) * 1000 * L) / 384 : 0;
  return { abv: `${nfmt(abv, 1)}% ABV`, add: add ? `Add ${nfmt(add, 2)} kg sugar to reach ${sg3(tg)} (≈ ${nfmt((tg - fg) * 131.25, 1)}% ABV)` : "Most apple juice starts at 1.045–1.055 (about 6–7% ABV dry)", note: fg < 1.002 ? "Fermented dry — backsweeten with non-fermentable sweetener or stabilise first" : "Residual sweetness — bottle only after gravity is stable for 3 days" };
};
export const kombucha: Calc = (v) => {
  const L = need(p(v, "l", 4), "Enter batch volume (L)."), s = p(v, "s", 50), st = p(v, "st", 10) / 100;
  return { mix: `${g(s * L)} sugar · ${nfmt(L * 2, 0)} tea bags (≈ ${g(L * 4.5)} loose black or green tea) · ${nfmt(L * st * 1000, 0)} mL starter liquid + SCOBY`, steps: "Steep tea in a quarter of the water, dissolve sugar, top up with cool water, add starter when below 30 °C", note: `First ferment 7–14 days at 22–26 °C · keep pH below 4.2 (${pc(st, 0)} starter helps) · second ferment with fruit 2–4 days for fizz` };
};
export const chaptal: Calc = (v) => {
  const L = need(p(v, "l", 23), "Enter must volume (L)."), cur = need(p(v, "c", 1.075), "Enter current gravity."), tg = need(p(v, "t", 1.09), "Enter target gravity.");
  if (tg <= cur) return { add: "No sugar needed — the must already reaches the target", pa: `Potential alcohol ≈ ${nfmt((cur - 0.996) * 131.25, 1)}% (fermenting to ≈ 0.996)`, note: "—" };
  const kg = ((tg - cur) * 1000 * L) / 384;
  return { add: `${nfmt(kg, 2)} kg sugar (${g((kg * 1000) / L)} per litre)`, pa: `Potential alcohol ${nfmt((cur - 0.996) * 131.25, 1)}% → ${nfmt((tg - 0.996) * 131.25, 1)}% (fermenting to ≈ 0.996)`, note: "Dissolve sugar in some must before adding · chaptalisation is restricted or banned for commercial wine in some regions" };
};
export const pintCost: Calc = (v) => {
  const ing = p(v, "i", 45), oth = p(v, "o", 8), L = need(p(v, "l", 19), "Enter packaged volume (L)."), uk = pick(v.u, 2) === 1, pr = p(v, "pr", 7);
  const pint = uk ? 0.568 : 0.473, n = L / pint, c = (ing + oth) / n;
  return { c: `${money(c)} per pint`, n: `${nfmt(n, 0)} ${uk ? "UK" : "US"} pints from ${nfmt(L, 1)} L · ${money((ing + oth) / (L / 0.355))} per 12 oz bottle`, save: pr > 0 ? `Saves ${money(pr - c)} a pint vs ${money(pr)} at the bar — ${money((pr - c) * n)} for the batch` : "Add the bar price to compare" };
};

// ---- Cooking times ----
const DONE: [string, number, number][] = [["Rare", 115, 125], ["Medium-rare", 120, 130], ["Medium", 130, 140], ["Medium-well", 140, 150], ["Well done", 150, 160]];
export const primeRib: Calc = (v) => {
  const lb = need(p(v, "w", 8), "Enter roast weight (lb)."), d = pick(v.d, 5), m = pick(v.m, 2), [nm, pull, fin] = DONE[d];
  const mpl = m === 0 ? [13, 15, 17, 19, 21][d] : [28, 32, 36, 40, 44][d], t = lb * mpl;
  return { t: `About ${hm(t)} at ${m === 0 ? "325 °F" : "225–250 °F (then sear at 500 °F)"}`, temp: `${nm}: pull at ${fC(pull)}, rests up to ${fC(fin)}`, rest: `Rest ${Math.round(Math.min(30, Math.max(15, lb * 2.5)))} minutes tented · ≈ ${nfmt(Math.max(1, lb / 1.5), 0)}–${nfmt(lb / 1, 0)} servings (bone-in)` };
};
export const roastChicken: Calc = (v) => {
  const lb = need(p(v, "w", 4.5), "Enter chicken weight (lb)."), t = pick(v.t, 3), st = pick(v.s, 2) === 1;
  const [temp, mpl, base] = [[350, 20, 15], [400, 16, 10], [425, 13, 10]][t], min = lb * mpl + base + (st ? 15 : 0);
  return { t: `About ${hm(min)} at ${temp} °F`, temp: `Done at ${fC(165)} in the thickest part of the thigh and breast`, rest: `Rest 10–15 minutes · ${st ? "stuffing must also reach 165 °F" : "spatchcocking cuts time by about a third"}` };
};
const SV: [string, number[], string][] = [["Beef steak", [52, 55, 60, 63, 68], "1–4 h"], ["Pork chop", [57, 60, 63, 66, 70], "1–4 h"], ["Chicken breast", [60, 63, 65, 66, 68], "1.5–4 h"], ["Salmon", [45, 50, 52, 55, 58], "40–60 min"], ["Eggs (in shell)", [63, 63, 64, 65, 70], "45–60 min"]];
export const sousVide: Calc = (v) => {
  const f = SV[pick(v.f, SV.length)], d = pick(v.d, 5), th = p(v, "th", 1.25), c = f[1][d];
  const extra = th > 1.5 ? ` · ${nfmt(th, 2)} in thick: allow ${th > 2 ? "3–5 h" : "2–4 h"}` : "";
  return { t: `${c} °C (${nfmt(c * 9 / 5 + 32, 0)} °F) for ${f[2]}${extra}`, lvl: `${f[0]} · ${["rare / soft", "medium-rare", "medium", "medium-well", "well done / firm"][d]}`, note: c < 54.5 && f[0] !== "Salmon" ? "Below 54.5 °C (130 °F): keep cooks under about 2.5 hours for safety" : "Pat dry and sear 30–60 seconds a side after cooking · chicken at 60–65 °C is safe once held long enough (pasteurised)" };
};
export const airFryer: Calc = (v) => {
  const t = need(p(v, "t", 400), "Enter oven temperature."), u = pick(v.u, 2), m = need(p(v, "m", 30), "Enter oven time (min).");
  const nt = u === 0 ? t - 25 : t - 15, nm = m * 0.8;
  return { t: `${nfmt(nt, 0)} ${u === 0 ? "°F" : "°C"} for about ${nfmt(nm, 0)} minutes`, how: `Oven ${nfmt(t, 0)}° for ${nfmt(m, 0)} min → 25 °F (15 °C) lower and ~20% less time`, tip: "Don't overcrowd the basket, shake or flip halfway, and check a few minutes early" };
};
const IP: [string, number, string, string][] = [["Chicken breasts (fresh)", 7, "min", "natural release 5 min"], ["Chicken breasts (frozen)", 11, "min", "natural release 5 min"], ["Whole chicken (per lb)", 6, "min/lb", "natural release 15 min"], ["Beef chuck roast (per lb)", 15, "min/lb", "natural release 15 min"], ["Pork shoulder chunks", 45, "min", "natural release 15 min"], ["White rice (1:1 water)", 4, "min", "natural release 10 min"], ["Brown rice (1:1.25)", 22, "min", "natural release 10 min"], ["Black beans (unsoaked)", 30, "min", "natural release 20 min"], ["Hard-boiled eggs", 5, "min", "5 min natural, 5 min ice bath"], ["Potato cubes", 5, "min", "quick release"]];
export const instantPot: Calc = (v) => {
  const f = IP[pick(v.f, IP.length)], lb = p(v, "w", 3), alt = p(v, "alt", 0);
  const base = f[2] === "min/lb" ? f[1] * lb : f[1], adj = alt > 3000 ? base * (1 + Math.floor((alt - 2000) / 1000) * 0.05) : base;
  return { t: `${nfmt(adj, 0)} minutes at high pressure${f[2] === "min/lb" ? ` (${f[1]} min per lb × ${nfmt(lb, 1)} lb)` : ""}`, rel: `Then ${f[3]} · add ~10–15 minutes to come up to pressure`, note: alt > 3000 ? "Altitude: add about 5% cooking time per 1,000 ft above 2,000 ft" : "Always use at least the minimum liquid your cooker requires (usually 1 cup)" };
};
export const slowCooker: Calc = (v) => {
  const m = need(p(v, "m", 45), "Enter the oven or stovetop time (min).");
  const r = m <= 30 ? ["1–2 h", "4–6 h"] : m <= 60 ? ["3–4 h", "6–8 h"] : m <= 180 ? ["4–6 h", "8–12 h"] : ["6–8 h", "10–12 h"];
  return { t: `HIGH ${r[0]} or LOW ${r[1]}`, liq: "Cut the liquid by about a third to a half — slow cookers don't evaporate", tip: "Add dairy, delicate vegetables and fresh herbs in the last 30–60 minutes; brown meat first for flavour" };
};
export const microwave: Calc = (v) => {
  const t = need(p(v, "t", 3), "Enter the package time (min)."), w0 = need(p(v, "w0", 1100), "Enter the package wattage."), w1 = need(p(v, "w1", 800), "Enter your microwave wattage.");
  const t1 = t * w0 / w1;
  return { t: `${Math.floor(t1)} min ${Math.round((t1 % 1) * 60)} s`, how: `${nfmt(t, 2)} min × ${nfmt(w0, 0)} W ÷ ${nfmt(w1, 0)} W`, tip: "Stir or rotate halfway, and let food stand 1–2 minutes — reheated leftovers should reach 165 °F (74 °C)" };
};
export const eggBoil: Calc = (v) => {
  const d = pick(v.d, 4), sz = pick(v.s, 3), cold = pick(v.c, 2) === 0, alt = p(v, "alt", 0);
  const base = [6, 7.5, 10, 12][d] + [-1, 0, 1][sz] + (cold ? 0 : -1) + Math.floor(alt / 1000) * 0.5;
  return { t: `${nfmt(base, 1)} minutes in boiling water`, lvl: `${["Soft (runny yolk)", "Jammy (just-set yolk)", "Hard (firm, creamy)", "Hard (fully set)"][d]} · ${["medium", "large", "extra-large"][sz]} egg${cold ? " from the fridge" : " at room temperature"}`, tip: `Lower eggs into gently boiling water, then move to ice water for 2 minutes to stop cooking${alt >= 1000 ? " · water boils cooler at altitude, so allow extra time" : ""}` };
};
export const pastaServing: Calc = (v) => {
  const n = need(p(v, "n", 4), "Enter servings."), t = pick(v.t, 3), sz = pick(v.s, 2);
  const per = [[100, 60], [140, 85], [90, 55]][t][sz], tot = per * n, water = Math.max(3, (tot / 100) * 1);
  return { amt: `${g(tot)} ${["dried pasta", "fresh pasta", "dried long pasta (spaghetti)"][t]} (${g(per)} each)`, water: `${nfmt(water, 1)} L water + ${g(water * 10)} salt (1%)`, note: `${sz === 0 ? "Main course" : "Side / starter"} portions · dried pasta roughly doubles in weight when cooked` };
};
export const jerkyMarinade: Calc = (v) => {
  const kg = need(p(v, "kg", 1), "Enter meat weight (kg)."), cure = pick(v.c, 2) === 1;
  return { mar: `Soy sauce ${nfmt(120 * kg, 0)} mL · Worcestershire ${nfmt(60 * kg, 0)} mL · brown sugar ${g(30 * kg)} · black pepper ${g(4 * kg)} · garlic powder ${g(4 * kg)} · onion powder ${g(4 * kg)}${cure ? ` · Prague powder #1 ${g(2.5 * kg, 1)} (0.25%)` : ""}`, yld: `≈ ${g(kg * 400)} finished jerky (about 40% of raw weight)`, safe: "USDA: heat meat to 160 °F (poultry 165 °F) before or after drying at 130–140 °F · slice lean meat ¼ in thick against the grain · marinate 6–24 h" };
};
export const dryAge: Calc = (v) => {
  const w = need(p(v, "w", 8), "Enter starting weight."), d = need(p(v, "d", 35), "Enter days aged."), lr = p(v, "lr", 0.5) / 100, tr = p(v, "tr", 12) / 100, cost = p(v, "c", 0);
  const loss = Math.min(0.35, lr * d), after = w * (1 - loss), fin = after * (1 - tr);
  return { fin: `≈ ${nfmt(fin, 2)} usable (from ${nfmt(w, 2)})`, loss: `Moisture loss ≈ ${pc(loss, 0)} over ${nfmt(d, 0)} days + ${pc(tr, 0)} trim of the dried crust`, cost: cost > 0 ? `True cost ${money((w * cost) / fin)} per unit of trimmed meat (vs ${money(cost)} raw)` : "Typical loss is about 0.4–0.6% a day — weigh before and after for your setup" };
};
export const canning: Calc = (v) => {
  const ft = p(v, "a", 0) * (pick(v.u, 2) === 1 ? 3.28084 : 1), m = pick(v.m, 3), base = p(v, "t", 10);
  if (m === 0) { const add = ft <= 1000 ? 0 : ft <= 3000 ? 5 : ft <= 6000 ? 10 : ft <= 8000 ? 15 : 20; return { t: `${nfmt(base + add, 0)} minutes in a boiling-water bath`, how: `Recipe time ${nfmt(base, 0)} min + ${add} min for ${nfmt(ft, 0)} ft`, note: "USDA adjustment for most recipes — check your tested recipe; some use different increments" }; }
  const psi = m === 1 ? (ft <= 1000 ? 10 : 15) : ft <= 2000 ? 11 : ft <= 4000 ? 12 : ft <= 6000 ? 13 : ft <= 8000 ? 14 : 15;
  return { t: `${psi} psi for the recipe's full time (${nfmt(base, 0)} min)`, how: `${m === 1 ? "Weighted" : "Dial"} gauge at ${nfmt(ft, 0)} ft`, note: "Pressure canning is required for low-acid foods (vegetables, meats, beans) · have dial gauges tested yearly" };
};
export const fermentSalt: Calc = (v) => {
  const w = need(p(v, "w", 1000), "Enter weight (g)."), t = pick(v.t, 2), pct = p(v, "p", t === 0 ? 2 : 3.5) / 100;
  const salt = t === 0 ? w * pct : (w * pct) / (1 - pct);
  return { salt: `${g(salt, 1)} salt`, how: t === 0 ? `${pc(pct)} of ${g(w)} vegetables (dry-salting, e.g. sauerkraut, kimchi)` : `${pc(pct)} brine for ${g(w)} water (salt ÷ (water + salt))`, note: "Use non-iodised salt · 2–2.5% for kraut, 3.5–5% brine for cucumbers and whole vegetables · keep everything under the brine" };
};
export const pickleBrine: Calc = (v) => {
  const c = need(p(v, "c", 4), "Enter total brine needed (cups)."), r = [0.5, 0.67, 1][pick(v.r, 3)];
  const vin = c * r, w = c - vin, ml = (x: number) => `${nfmt(x * 236.6, 0)} mL`;
  return { mix: `${nfmt(vin, 2)} cups vinegar (${ml(vin)}) + ${nfmt(w, 2)} cups water (${ml(w)})`, add: `${nfmt(c, 1)} tbsp kosher salt + ${nfmt(c, 1)}–${nfmt(c * 2, 1)} tbsp sugar (optional)`, note: r < 0.5 ? "—" : "Use vinegar labelled 5% acidity · for shelf-stable canned pickles keep at least half vinegar and follow a tested recipe" };
};
export const fryOil: Calc = (v) => {
  const dia = need(p(v, "d", 10), "Enter pot diameter (in)."), depth = p(v, "dp", 3), pot = p(v, "ph", 6);
  const L = Math.PI * (dia / 2) ** 2 * depth * 0.016387;
  return { L: `${nfmt(L, 2)} L oil (${nfmt(L / 0.9464, 2)} qt)`, how: `${nfmt(depth, 1)} in deep in a ${nfmt(dia, 1)} in pot`, safe: depth > pot / 2 ? "Too full — keep oil below half the pot's height so it can bubble up safely" : "Leave at least half the pot empty · heat to 350–375 °F (175–190 °C) and keep a lid nearby" };
};
export const pellets: Calc = (v) => {
  const t = pick(v.t, 4), h = need(p(v, "h", 10), "Enter cook time (hours)."), cold = pick(v.c, 2) === 1, bag = p(v, "b", 20);
  const r = [1, 1.5, 2, 3][t] * (cold ? 1.5 : 1), lb = r * h;
  return { lb: `≈ ${nfmt(lb, 1)} lb pellets (${nfmt(lb * 0.4536, 1)} kg)`, rate: `${nfmt(r, 1)} lb/h at ${["225 °F", "275 °F", "350 °F", "450 °F"][t]}${cold ? " in cold or windy weather" : ""}`, bags: `${nfmt(lb / bag, 2)} of a ${nfmt(bag, 0)} lb bag · fill the hopper with extra to avoid flame-outs` };
};
export const charcoal: Calc = (v) => {
  const m = pick(v.m, 4), sz = pick(v.s, 3), h = p(v, "h", 8);
  const full = [70, 100, 140][sz], amt = m === 0 ? full : m === 1 ? full * 0.75 : m === 2 ? full * 0.5 : 20 + h * 12;
  return { n: `≈ ${nfmt(amt, 0)} briquettes (${nfmt(amt / 18, 1)} lb)`, how: `${["Hot direct (searing)", "Medium heat", "Low / indirect", `Low & slow (minion method, ${nfmt(h, 0)} h)`][m]} on a ${["small (18 in)", "standard (22 in kettle)", "large (26 in+)"][sz]} grill`, tip: m === 3 ? "Light about 20 briquettes and pour onto unlit coals; add wood chunks for smoke" : "A full chimney starter holds about 100 standard briquettes · ready when covered in grey ash (15–20 min)" };
};
const REST: [string, number, number][] = [["Beef / pork / lamb steaks or chops", 145, 3], ["Beef / pork / lamb roast", 145, 15], ["Ground meat (burgers, meatloaf)", 160, 0], ["Poultry (whole or pieces)", 165, 10], ["Fish and shellfish", 145, 0], ["Fresh ham (raw)", 145, 3], ["Precooked ham (reheating)", 140, 0]];
export const restTime: Calc = (v) => {
  const r = REST[pick(v.f, REST.length)], lb = p(v, "w", 0);
  const rest = r[2] === 15 && lb > 0 ? Math.min(30, Math.max(15, lb * 3)) : r[2];
  return { temp: `Safe minimum ${fC(r[1])}`, rest: rest ? `Rest ${nfmt(rest, 0)} minutes before carving (USDA minimum 3 min for whole cuts)` : "No rest required for safety — eat promptly", carry: rest >= 10 ? "Large roasts rise another 5–10 °F while resting — pull them early for your preferred doneness" : "Thin cuts rise only a few degrees while resting" };
};

// ---- registry (generated)
export const ideaFood2CustomCalculators: Record<string, Calc> = {
  "yeast-pitch-rate-calculator": pitchRate,
  "hydrometer-temperature-correction-calculator": hydroCorr,
  "refractometer-alcohol-correction-calculator": refracCorr,
  "boil-off-rate-calculator": boilOff,
  "mead-honey-amount-calculator": meadHoney,
  "hard-cider-abv-calculator": ciderAbv,
  "kombucha-sugar-ratio-calculator": kombucha,
  "wine-must-sugar-chaptalization-calculator": chaptal,
  "batch-cost-per-pint-calculator": pintCost,
  "prime-rib-cooking-time-calculator": primeRib,
  "roast-chicken-cooking-time-calculator": roastChicken,
  "sous-vide-time-temperature-calculator": sousVide,
  "air-fryer-conversion-calculator": airFryer,
  "instant-pot-cooking-time-calculator": instantPot,
  "slow-cooker-conversion-calculator": slowCooker,
  "microwave-wattage-time-calculator": microwave,
  "egg-boiling-time-calculator": eggBoil,
  "pasta-serving-amount-calculator": pastaServing,
  "jerky-marinade-calculator": jerkyMarinade,
  "dry-aging-weight-loss-calculator": dryAge,
  "canning-processing-time-altitude-calculator": canning,
  "fermentation-salt-percentage-calculator": fermentSalt,
  "pickling-brine-ratio-calculator": pickleBrine,
  "deep-fry-oil-amount-calculator": fryOil,
  "smoker-wood-pellet-usage-calculator": pellets,
  "charcoal-amount-for-grilling-calculator": charcoal,
  "food-safe-resting-time-calculator": restTime,
};
