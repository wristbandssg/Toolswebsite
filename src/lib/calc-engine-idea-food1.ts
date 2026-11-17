/**
 * Idea build, batch food1 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Food > Baking (20) + Coffee & Drinks (6) = 26 tools.
 * Constants are standard kitchen references: 1 US cup = 236.6 mL = 14.44 in³; yeast fresh : active dry : instant ≈ 1 : 0.4 : 0.33 by
 * weight; butter → oil × 0.75; fondant ⅛ in thick at ≈1.5 g/cm³; fan oven = conventional − 20 °C; ingredient weights per cup follow
 * King Arthur Baking's chart (all-purpose flour 120 g). Coffee extraction yield = TDS × beverage ÷ dose (SCA ideal 18–22%).
 * WHO oral rehydration salts per litre: 2.6 g NaCl, 1.5 g KCl, 2.9 g trisodium citrate, 13.5 g glucose.
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, money, nfmt } from "./trv-core";

const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 0) => `${(x * 100).toFixed(dp)}%`;
const g = (x: number, dp = 0) => `${nfmt(x, dp)} g`;
const CUP_ML = 236.588, IN3_CUP = 14.4375;
const frac = (x: number) => { const w = Math.floor(x + 1e-9), f = x - w, F: [number, string][] = [[0, ""], [0.125, "⅛"], [0.25, "¼"], [0.333, "⅓"], [0.375, "⅜"], [0.5, "½"], [0.625, "⅝"], [0.667, "⅔"], [0.75, "¾"], [0.875, "⅞"], [1, ""]]; let best = F[0]; for (const c of F) if (Math.abs(c[0] - f) < Math.abs(best[0] - f)) best = c; const ww = best[0] === 1 ? w + 1 : w; return `${ww ? ww : ""}${best[1] && ww ? " " : ""}${best[1]}` || "0"; };
const cups = (c: number) => (c >= 0.25 ? `${frac(c)} cup${c > 1.1 ? "s" : ""}` : `${frac(c * 16)} tbsp`);
const cToF = (c: number) => c * 9 / 5 + 32;

// ---- Baking ----
export const recipeScale: Calc = (v) => {
  const s0 = need(p(v, "s0", 4), "Enter original servings."), s1 = need(p(v, "s1", 10), "Enter servings wanted."), f = s1 / s0;
  const items = txt(v, "ing").split(/\n|;/).map((l) => l.trim()).filter(Boolean).slice(0, 30);
  const out = items.map((l) => { const m = l.match(/^(\d+(?:\.\d+)?(?:\s*\/\s*\d+)?)\s*(.*)$/); if (!m) return l; const q = m[1].includes("/") ? m[1].split("/").map(Number).reduce((a, b) => a / b) : Number(m[1]); const x = Math.round(q * f * 100) / 100; return `${nfmt(x, Number.isInteger(x) ? 0 : x < 10 ? 2 : 1)} ${m[2]}`; });
  return { f: `Multiply every ingredient by ${nfmt(f, 3)}`, list: out.length ? out.join(" · ") : "Type ingredients (one per line, amount first) to scale them", tip: f > 2 || f < 0.5 ? "Big changes: scale salt, spices and leavening slightly less, bake in several pans, and expect different baking times" : "Eggs: round to whole eggs or beat and weigh (≈50 g per large egg)" };
};
export const yeastConv: Calc = (v) => {
  const a = need(p(v, "a", 7), "Enter the amount (g)."), from = pick(v.f, 3), F = [1, 0.4, 0.33], fresh = a / F[from];
  return { conv: `Fresh ${g(fresh, 1)} · active dry ${g(fresh * 0.4, 1)} · instant ${g(fresh * 0.33, 1)}`, tsp: `≈ ${nfmt((fresh * 0.4) / 3.1, 2)} tsp active dry · ${nfmt((fresh * 0.33) / 3.1, 2)} tsp instant (1 packet = 7 g = 2¼ tsp)`, note: "Active dry is usually dissolved in warm water (40 °C) first; instant can go straight into the flour; fresh yeast crumbles into the dough" };
};
const panArea = (shape: number, a: number, b: number) => (shape === 0 ? Math.PI * (a / 2) ** 2 : shape === 1 ? a * a : a * b);
export const panConv: Calc = (v) => {
  const s0 = pick(v.s0, 3), a0 = need(p(v, "a0", 9), "Enter the original pan size."), b0 = p(v, "b0", 13), s1 = pick(v.s1, 3), a1 = need(p(v, "a1", 8), "Enter the new pan size."), b1 = p(v, "b1", 8);
  const A0 = panArea(s0, a0, b0), A1 = panArea(s1, a1, b1), f = A1 / A0;
  return { f: `Multiply the recipe by ${nfmt(f, 2)}`, area: `Original pan ${nfmt(A0, 1)} sq in → new pan ${nfmt(A1, 1)} sq in`, tip: f < 1 ? "Smaller pan at the same depth: start checking 5–10 minutes early" : "Larger pan at the same depth: bake a little longer; if the batter gets deeper, lower the oven 25 °F" };
};
export const batterByPan: Calc = (v) => {
  const sh = pick(v.s, 4), a = need(p(v, "a", 8), "Enter the pan size."), b = p(v, "b", 8), d = need(p(v, "d", 2), "Enter pan depth."), fill = p(v, "f", 66) / 100;
  const vol = sh === 3 ? (Math.PI * (a / 2) ** 2 - Math.PI * (b / 2) ** 2) * d : panArea(sh, a, b) * d, bat = (vol * fill) / IN3_CUP;
  return { bat: `${cups(bat)} of batter (${nfmt(bat * CUP_ML, 0)} mL)`, vol: `Pan holds ${nfmt(vol / IN3_CUP, 1)} cups · filled to ${pc(fill)}`, note: `A standard 2-layer cake recipe makes about 5–6 cups of batter · ≈ ${g(bat * 220)} if your batter weighs ~220 g per cup` };
};
export const butterOil: Calc = (v) => {
  const a = need(p(v, "a", 1), "Enter the amount."), dir = pick(v.d, 2), unit = pick(v.u, 2);
  const out = dir === 0 ? a * 0.75 : a / 0.75, gram = unit === 1;
  return { out: dir === 0 ? `${gram ? g(out) : cups(out)} oil for ${gram ? g(a) : cups(a)} butter` : `${gram ? g(out) : cups(out)} butter for ${gram ? g(a) : cups(a)} oil`, why: "Butter is about 80% fat and 16–18% water, so ¾ the amount of oil gives the same fat", tip: "Oil makes cakes moister and softer; keep butter where creaming or flavour matters (cookies, pastry)" };
};
const SUB: [string, number, string][] = [["Honey", 0.75, "reduce other liquid by ¼ cup per cup, add ¼ tsp baking soda, bake 25 °F lower"], ["Maple syrup", 0.75, "reduce liquid by 3 tbsp per cup, bake 25 °F lower"], ["Agave nectar", 0.67, "reduce liquid by ¼ cup per cup, bake 25 °F lower"], ["Coconut sugar", 1, "swap 1:1; slightly drier, caramel flavour"], ["Brown sugar", 1, "swap 1:1 packed; moister, chewier"], ["Erythritol (pure)", 1.33, "about 70% as sweet; can taste cooling"], ["Allulose", 1.33, "about 70% as sweet; browns faster — bake 25 °F lower"], ["1:1 sugar-replacement blend", 1, "use as labelled (monk fruit/erythritol blends)"]];
export const sugarSub: Calc = (v) => {
  const c = need(p(v, "c", 1), "Enter cups of sugar."), s = SUB[pick(v.s, SUB.length)];
  return { amt: `${cups(c * s[1])} ${s[0].toLowerCase()} for ${cups(c)} sugar`, adj: s[2], note: "Sugar also tenderises, browns and holds moisture — replacing more than half of it changes texture" };
};
const EGG: [string, string][] = [["Flax egg", "1 tbsp ground flaxseed + 3 tbsp water, rest 5 min"], ["Chia egg", "1 tbsp chia seeds + 3 tbsp water, rest 10 min"], ["Applesauce", "¼ cup (60 g) unsweetened"], ["Mashed banana", "¼ cup (about ½ banana)"], ["Plain yogurt", "¼ cup (60 g)"], ["Aquafaba", "3 tbsp chickpea liquid (2 tbsp for a white)"], ["Silken tofu", "¼ cup (60 g) blended"], ["Baking soda + vinegar", "1 tsp baking soda + 1 tbsp vinegar, added last"]];
export const eggSub: Calc = (v) => {
  const n = need(p(v, "n", 2), "Enter number of eggs."), s = EGG[pick(v.s, EGG.length)];
  return { per: `Per egg: ${s[1]}`, tot: `For ${nfmt(n)} egg${n > 1 ? "s" : ""}: multiply by ${nfmt(n)}`, note: n > 3 ? "Recipes with more than 3 eggs rely on them for structure — substitutes may not work well" : "Flax and chia suit cookies and muffins; aquafaba whips like egg whites; banana and applesauce add sweetness" };
};
const ING: [string, number][] = [["All-purpose flour", 120], ["Bread flour", 120], ["Whole wheat flour", 113], ["Granulated sugar", 198], ["Brown sugar (packed)", 213], ["Powdered sugar", 113], ["Butter", 227], ["Cocoa powder", 84], ["Rolled oats", 89], ["Almond flour", 96], ["Water / milk", 227], ["Honey", 336]];
export const flourGrams: Calc = (v) => {
  const c = need(p(v, "c", 2), "Enter cups."), i = ING[pick(v.i, ING.length)], gw = c * i[1];
  return { g: `${g(gw)} ${i[0].toLowerCase()}`, oz: `${nfmt(gw / 28.35, 1)} oz · ${nfmt(i[1], 0)} g per cup`, tip: "Spoon flour into the cup and level it — scooping packs it and can add 20–30% more" };
};
const TF: [string, number][] = [["Neapolitan", 0.078], ["New York", 0.085], ["Thin crust", 0.065], ["Pan / Detroit", 0.12], ["Deep dish", 0.16]];
export const pizzaBall: Calc = (v) => {
  const d = need(p(v, "d", 12), "Enter pizza diameter (in)."), n = Math.max(1, Math.round(p(v, "n", 4))), st = pick(v.s, TF.length), hy = p(v, "h", 62) / 100;
  const tf = p(v, "tf", 0) || TF[st][1], ozb = Math.PI * (d / 2) ** 2 * tf, gb = ozb * 28.35, tot = gb * n, flour = tot / (1 + hy + 0.03);
  return { ball: `${g(gb)} per dough ball (${nfmt(ozb, 1)} oz)`, tot: `${g(tot)} total for ${n} pizzas — flour ${g(flour)}, water ${g(flour * hy)}, salt ${g(flour * 0.028, 1)}, yeast ${g(flour * 0.002, 1)}`, note: `${TF[st][0]} thickness factor ${nfmt(tf, 3)} oz per sq in · add ~3% extra for dough stuck to the bowl` };
};
export const pastaDough: Calc = (v) => {
  const n = need(p(v, "n", 4), "Enter servings."), mp = pick(v.m, 2), sty = pick(v.s, 2);
  const per = mp === 0 ? 100 : 70, flour = n * per, eggs = flour / 100;
  return { f: `${g(flour)} flour (“00” or all-purpose${sty === 1 ? " + semolina" : ""})`, e: sty === 0 ? `${nfmt(Math.round(eggs * 2) / 2, 1)} large eggs (≈ ${g(eggs * 55)} beaten egg)` : `${g(flour * 0.5)} warm water (egg-free semolina dough, 50% hydration)`, note: `${mp === 0 ? "100 g" : "70 g"} flour per person as a ${mp === 0 ? "main" : "starter"} · knead 8–10 minutes and rest 30 minutes` };
};
export const pieCrust: Calc = (v) => {
  const d = need(p(v, "d", 9), "Enter pie pan diameter (in)."), dp = p(v, "dp", 1.25), dbl = pick(v.t, 2) === 1, ov = p(v, "o", 1);
  const roll = d + 2 * dp + 2 * ov, f = (roll / 13) ** 2;
  return { roll: `Roll the bottom crust to ${nfmt(roll, 1)} in (${nfmt(roll * 2.54, 0)} cm) across`, dough: `Dough: about ${cups(1.25 * f * (dbl ? 2 : 1))} flour and ${cups(0.5 * f * (dbl ? 2 : 1))} butter (${dbl ? "double" : "single"} crust)`, note: "Scaled from a standard 9-inch crust (1¼ cups flour, ½ cup butter) rolled ⅛ in thick" };
};
export const cookieYield: Calc = (v) => {
  const w = need(p(v, "w", 900), "Enter total dough weight (g)."), c = need(p(v, "c", 45), "Enter dough per cookie (g)."), sh = Math.max(1, Math.round(p(v, "sh", 12)));
  const n = Math.floor(w / c);
  return { n: `${nfmt(n)} cookies`, sheets: `${nfmt(Math.ceil(n / sh))} baking sheets at ${sh} per sheet`, note: `${g(w - n * c)} left over · 45–55 g makes a standard bakery-style cookie; 25–30 g a small one` };
};
export const fondant: Calc = (v) => {
  const sh = pick(v.s, 2), a = need(p(v, "a", 8), "Enter cake size (in)."), h = need(p(v, "h", 4), "Enter cake height (in)."), n = Math.max(1, Math.round(p(v, "n", 1)));
  const roll = a + 2 * h + 1, area = sh === 0 ? Math.PI * (roll / 2) ** 2 : roll * roll, grams = area * 0.125 * 16.387 * 1.5 * n;
  return { amt: `${g(grams)} fondant (${nfmt(grams / 28.35, 0)} oz)`, roll: `Roll to ${nfmt(roll, 0)} in ${sh === 0 ? "circle" : "square"}, ⅛ in thick${n > 1 ? ` · ×${n} cakes` : ""}`, tip: "Buy 10–15% extra for trimming and practice · leftovers keep wrapped airtight for months" };
};
const TEMPER: Record<number, [number, number, number]> = { 0: [48, 27.5, 31.5], 1: [43, 26.5, 29.5], 2: [40, 25.5, 28.5] };
export const temper: Calc = (v) => {
  const t = pick(v.t, 3), [m, c, w] = TEMPER[t], f = pick(v.u, 2) === 1, u = (x: number) => (f ? `${nfmt(cToF(x), 0)} °F` : `${nfmt(x, 1)} °C`), wt = p(v, "w", 500);
  return { steps: `Melt to ${u(m)} → cool to ${u(c)} → rewarm to ${u(w)} and hold`, seed: `Seed method: melt ${g(wt * 0.75)}, stir in ${g(wt * 0.25)} chopped tempered chocolate until it reaches ${u(w)}`, test: "Test: a smear on foil should set glossy and snap in about 5 minutes at room temperature" };
};
const GAN: Record<number, number[]> = { 0: [1, 2, 2.5, 0.5], 1: [2, 2.5, 3, 1], 2: [2.5, 3, 3.5, 1.5] };
export const ganache: Calc = (v) => {
  const ch = pick(v.c, 3), use = pick(v.u, 4), tot = need(p(v, "t", 400), "Enter total ganache weight (g).");
  const r = p(v, "r", 0) || GAN[ch][use], choc = (tot * r) / (r + 1), cream = tot - choc;
  return { amt: `${g(choc)} ${["dark", "milk", "white"][ch]} chocolate + ${g(cream)} cream (${nfmt(r, 2)} : 1)`, how: "Heat cream to a simmer, pour over chopped chocolate, wait 2 minutes, stir from the centre until glossy", note: `${["Drip or glaze", "Frosting or filling", "Truffles (firm)", "Whipped ganache (chill, then whip)"][use]} · starting ratios — adjust for brand and cocoa %` };
};
export const simpleSyrup: Calc = (v) => {
  const s = need(p(v, "s", 200), "Enter sugar (g)."), r = [1, 2, 0.5][pick(v.r, 3)], w = s / r;
  return { mix: `${g(s)} sugar + ${g(w)} water (${r === 1 ? "1:1 simple" : r === 2 ? "2:1 rich" : "1:2 light"})`, brix: `≈ ${nfmt((s / (s + w)) * 100, 0)}° Brix · yields about ${nfmt(w + s * 0.62, 0)} mL`, note: "Rich syrup keeps about 6 months refrigerated, simple about 1 month" };
};
export const jam: Calc = (v) => {
  const fw = need(p(v, "fw", 1000), "Enter prepared fruit weight (g)."), sr = p(v, "sr", 75) / 100, lp = pick(v.p, 3), alt = p(v, "alt", 0);
  const sugar = fw * sr, lemon = (fw / 1000) * 30, set = 104.5 - alt * 0.00295;
  return { sug: `${g(sugar)} sugar for ${g(fw)} fruit (${pc(sr)} of fruit weight)`, add: `${nfmt(lemon, 0)} mL lemon juice${lp === 1 ? " + commercial pectin per packet directions" : lp === 2 ? " + low/no-sugar pectin (sugar can drop to 25–50%)" : ""}`, set: `Setting point ${nfmt(set, 1)} °C (${nfmt(cToF(set), 0)} °F) at ${nfmt(alt, 0)} m — or wrinkle test on a cold plate` };
};
const GAS = [[140, 1], [150, 2], [160, 3], [180, 4], [190, 5], [200, 6], [220, 7], [230, 8], [240, 9]];
export const ovenConv: Calc = (v) => {
  const t = need(p(v, "t", 180), "Enter the temperature."), u = pick(v.u, 2), dir = pick(v.d, 2);
  const c = u === 0 ? t : ((t - 32) * 5) / 9, fan = dir === 0 ? c - 20 : c + 20, gas = GAS.reduce((b, x) => (Math.abs(x[0] - c) < Math.abs(b[0] - c) ? x : b));
  return { fan: dir === 0 ? `${nfmt(fan, 0)} °C fan (${nfmt(cToF(fan), 0)} °F convection)` : `${nfmt(fan, 0)} °C conventional (${nfmt(cToF(fan), 0)} °F)`, from: `${nfmt(c, 0)} °C = ${nfmt(cToF(c), 0)} °F ≈ gas mark ${gas[1]}`, note: "Fan/convection ovens cook about 20 °C (25 °F) hotter — reduce temperature or shorten time by about 10%" };
};
export const bakeTime: Calc = (v) => {
  const t0 = need(p(v, "t0", 30), "Enter the original bake time."), d0 = need(p(v, "d0", 1.5), "Enter original batter depth."), d1 = need(p(v, "d1", 2.5), "Enter new batter depth.");
  const f = d1 / d0, t1 = t0 * (f > 1 ? 1 + (f - 1) * 0.8 : f ** 0.8);
  return { t: `About ${nfmt(t1, 0)} minutes (start checking at ${nfmt(t1 * 0.85, 0)})`, how: `Batter ${nfmt(d0, 2)} in → ${nfmt(d1, 2)} in deep (×${nfmt(f, 2)})`, tip: f > 1.3 ? "Deeper batter: lower the oven 25 °F (15 °C) so the edges don't overbake before the centre sets" : "Done when a skewer comes out clean or the centre reaches 200–210 °F (93–99 °C)" };
};
export const proofTime: Calc = (v) => {
  const t0 = need(p(v, "t0", 90), "Enter the recipe's proof time (min)."), c0 = p(v, "c0", 24), c1 = p(v, "c1", 20), u = pick(v.u, 2);
  const a = u === 1 ? ((c0 - 32) * 5) / 9 : c0, b = u === 1 ? ((c1 - 32) * 5) / 9 : c1, f = Math.pow(2, (a - b) / 8), t1 = t0 * f;
  return { t: `About ${nfmt(t1 / 60, 1)} hours (${nfmt(t1, 0)} min)`, how: `Rule of thumb: rise time roughly doubles for every 8 °C (15 °F) cooler`, tip: b < 10 ? "Fridge retard (2–5 °C): 12–72 hours, for more flavour" : "Watch the dough, not the clock — it's ready when it has roughly doubled and springs back slowly" };
};

// ---- Coffee & drinks ----
export const extraction: Calc = (v) => {
  const tds = need(p(v, "tds", 1.35), "Enter TDS %."), bev = need(p(v, "b", 340), "Enter beverage weight (g)."), dose = need(p(v, "d", 20), "Enter dose (g)."), esp = pick(v.e, 2) === 1;
  const ey = (tds / 100) * bev / dose * 100, lo = 18, hi = 22, tL = esp ? 8 : 1.15, tH = esp ? 12 : 1.45;
  return { ey: `${nfmt(ey, 1)}% extraction yield`, read: ey < lo ? "Under-extracted — grind finer, brew longer or hotter" : ey > hi ? "Over-extracted — grind coarser or shorten brew time" : "In the SCA's ideal 18–22% range", str: `TDS ${nfmt(tds, 2)}% ${tds < tL ? "is weak" : tds > tH ? "is strong" : "is in range"} for ${esp ? "espresso (8–12%)" : "filter (1.15–1.45%)"} · brew ratio 1:${nfmt(bev / dose, 1)}` };
};
const TEA: [string, number, number, string][] = [["Black", 2.5, 95, "3–5 min"], ["Green", 2, 78, "2–3 min"], ["White", 2, 82, "4–5 min"], ["Oolong", 3, 90, "3–5 min"], ["Herbal / tisane", 2.5, 100, "5–7 min"], ["Pu-erh", 4, 98, "3–5 min (rinse first)"]];
export const teaSteep: Calc = (v) => {
  const t = TEA[pick(v.t, TEA.length)], ml = need(p(v, "ml", 500), "Enter water (mL).");
  return { amt: `${g((t[1] * ml) / 250, 1)} tea leaves for ${nfmt(ml)} mL (${nfmt(t[1], 1)} g per 250 mL)`, temp: `${t[2]} °C (${nfmt(cToF(t[2]), 0)} °F) water · steep ${t[3]}`, note: "Use more leaf for iced tea (double strength over ice) · whole-leaf oolong and pu-erh can be re-steeped several times" };
};
export const matcha: Calc = (v) => {
  const s = pick(v.s, 3), n = Math.max(1, Math.round(p(v, "n", 1)));
  const R: [string, number, number, number][] = [["Usucha (thin)", 2, 70, 0], ["Koicha (thick)", 4, 35, 0], ["Matcha latte", 2, 30, 180]];
  const [nm, gr, w, milk] = R[s];
  return { amt: `${g(gr * n, 0)} matcha (${nfmt(gr / 2, 1)} tsp each) + ${nfmt(w * n)} mL water at 75–80 °C${milk ? ` + ${nfmt(milk * n)} mL milk` : ""}`, how: `${nm}: sift the powder, add water, whisk in a quick W/M motion${s === 1 ? " slowly kneading — no foam" : " until frothy"}`, caf: `≈ ${nfmt(gr * 32 * n, 0)} mg caffeine (about 30–35 mg per gram)` };
};
export const shopProfit: Calc = (v) => {
  const pr = need(p(v, "p", 5.5), "Enter the selling price."), bean = p(v, "b", 0.45), milk = p(v, "m", 0.35), cup = p(v, "c", 0.25), syr = p(v, "s", 0.1), lab = p(v, "l", 0.9), ovh = p(v, "o", 0.8), n = p(v, "n", 250), tax = p(v, "t", 0) / 100;
  const net = pr / (1 + tax), cogs = bean + milk + cup + syr, prof = net - cogs - lab - ovh;
  return { prof: `${money(prof)} profit per cup (${pc(prof / net)} margin)`, cost: `Ingredients + cup ${money(cogs)} (${pc(cogs / net)} of price) · labour ${money(lab)} · overhead ${money(ovh)}`, day: `${money(prof * n)} a day at ${nfmt(n)} cups · ${money(prof * n * 30)} a month` };
};
export const electrolyte: Calc = (v) => {
  const L = need(p(v, "l", 1), "Enter litres."), t = pick(v.t, 2);
  if (t === 0) return { mix: `Per ${nfmt(L, 1)} L: ${g(2.6 * L, 1)} table salt, ${g(1.5 * L, 1)} potassium chloride, ${g(2.9 * L, 1)} sodium citrate, ${g(13.5 * L, 1)} glucose`, home: `Kitchen version (WHO/UNICEF): ½ level tsp salt + 6 level tsp sugar per litre of clean water`, note: "For dehydration from diarrhoea, use ready-made ORS packets where possible and seek medical care for infants or severe cases" };
  return { mix: `Per ${nfmt(L, 1)} L: ${g(60 * L)} sugar (6% carbohydrate) + ${g(1.2 * L, 1)} salt (≈ ${nfmt(470 * L, 0)} mg sodium) + optional 200 mL juice for flavour and potassium`, home: "≈ ¼ tsp salt + 4 tbsp sugar per litre", note: "Sports drink strength for exercise over an hour — plain water is enough for shorter sessions" };
};
const JUICE: [string, number, string][] = [["Oranges", 0.45, "≈ 80 mL per orange"], ["Lemons", 0.35, "≈ 45 mL (3 tbsp) per lemon"], ["Limes", 0.35, "≈ 30 mL (2 tbsp) per lime"], ["Grapefruit", 0.5, "≈ 150 mL per grapefruit"], ["Apples (juicer)", 0.6, "≈ 100 mL per apple"], ["Carrots (juicer)", 0.5, "≈ 50 mL per carrot"], ["Pineapple", 0.5, "≈ 500 mL per pineapple"], ["Watermelon", 0.6, "very juicy"]];
export const juiceYield: Calc = (v) => {
  const f = JUICE[pick(v.f, JUICE.length)], w = need(p(v, "w", 2), "Enter fruit weight (kg)."), y = p(v, "y", 0) / 100 || f[1], want = p(v, "want", 0);
  const ml = w * 1000 * y;
  return { ml: `≈ ${nfmt(ml, 0)} mL juice (${nfmt(ml / CUP_ML, 1)} cups) from ${nfmt(w, 2)} kg`, rate: `${f[0]}: about ${pc(y)} yield by weight · ${f[2]}`, need: want > 0 ? `For ${nfmt(want, 0)} mL you need about ${nfmt(want / (1000 * y), 2)} kg` : "Room-temperature fruit rolled firmly before juicing gives more juice" };
};

// ---- registry (generated)
export const ideaFood1CustomCalculators: Record<string, Calc> = {
  "recipe-scaling-calculator": recipeScale,
  "yeast-conversion-fresh-dry-instant-calculator": yeastConv,
  "baking-pan-size-conversion-calculator": panConv,
  "cake-batter-amount-by-pan-calculator": batterByPan,
  "butter-to-oil-conversion-calculator": butterOil,
  "sugar-substitute-conversion-calculator": sugarSub,
  "egg-substitute-amount-calculator": eggSub,
  "flour-cups-to-grams-calculator": flourGrams,
  "pizza-dough-ball-weight-calculator": pizzaBall,
  "pasta-dough-ratio-calculator": pastaDough,
  "pie-crust-size-calculator": pieCrust,
  "cookie-yield-calculator": cookieYield,
  "fondant-amount-calculator": fondant,
  "chocolate-tempering-temperature-calculator": temper,
  "ganache-ratio-calculator": ganache,
  "simple-syrup-ratio-calculator": simpleSyrup,
  "jam-sugar-pectin-ratio-calculator": jam,
  "oven-temperature-conversion-fan-calculator": ovenConv,
  "bake-time-adjustment-pan-size-calculator": bakeTime,
  "proofing-time-temperature-calculator": proofTime,
  "coffee-extraction-yield-tds-calculator": extraction,
  "tea-steeping-ratio-calculator": teaSteep,
  "matcha-ratio-calculator": matcha,
  "coffee-shop-profit-per-cup-calculator": shopProfit,
  "electrolyte-drink-mix-calculator": electrolyte,
  "juice-yield-from-fruit-calculator": juiceYield,
};
