/**
 * Idea build, batch food4 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Food > Party & Event Food (10) + Wine, Spirits & Cocktails (13) = 23 tools.
 * Party quantities are common catering rules of thumb. Proof: US proof = 2 × ABV, UK (Sikes) proof = 1.75 × ABV.
 * Wine bottle names: piccolo 187.5 mL, demi 375, standard 750, magnum 1.5 L, double magnum / Jeroboam 3 L, Rehoboam 4.5 L,
 * Methuselah 6 L, Salmanazar 9 L, Balthazar 12 L, Nebuchadnezzar 15 L. Sake (Japan labelling rules): Honjozo ≤ 70% polishing ratio,
 * Ginjo ≤ 60%, Daiginjo ≤ 50%. Angels' share ≈ 2% a year in Scotland, 3–5% in Kentucky, up to 10%+ in hot climates.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 0) => `${(x * 100).toFixed(dp)}%`;
const ceil = (x: number) => Math.ceil(x - 1e-9);
const OZ = 29.5735;

// ---- Party & event food ----
export const wings: Calc = (v) => {
  const n = need(p(v, "n", 20), "Enter number of guests."), r = pick(v.r, 3), big = pick(v.b, 2) === 1;
  const per = [4, 8, 12][r] * (big ? 1.25 : 1), tot = ceil(n * per);
  return { tot: `${nfmt(tot)} wings (${nfmt(per, 0)} per guest)`, lb: `≈ ${nfmt(tot / 10, 1)} lb of party wings (flats and drums, about 10 per lb)`, sauce: `About ${nfmt(tot / 25, 1)} cups of sauce · ${nfmt(ceil(n / 4), 0)} cups ranch or blue cheese · ${nfmt(ceil(n * 0.25), 0)} lb celery and carrots` };
};
export const cheeseBoard: Calc = (v) => {
  const n = need(p(v, "n", 12), "Enter number of guests."), r = pick(v.r, 2), types = Math.max(3, Math.min(7, Math.round(n / 4) + 2));
  const ch = n * (r === 0 ? 1.5 : 3.5), meat = n * (r === 0 ? 1.5 : 2.5);
  return { ch: `${nfmt(ch, 0)} oz cheese (${nfmt(ch / 16, 1)} lb) · ${types} cheeses of ~${nfmt(ch / types, 0)} oz each`, extra: `${nfmt(meat, 0)} oz cured meats · ${nfmt(ceil(n / 8), 0)} boxes crackers or 1 baguette per 8 guests · ${nfmt(n * 2, 0)} oz fruit, nuts and olives`, tip: r === 0 ? "Appetiser portion: 1–2 oz cheese per person" : "Main-course board: 3–4 oz cheese per person · take cheese out 30–60 minutes before serving" };
};
export const punch: Calc = (v) => {
  const n = need(p(v, "n", 30), "Enter number of guests."), h = p(v, "h", 3), cup = p(v, "c", 6), alc = pick(v.a, 2) === 1;
  const cups = n * (h <= 1 ? 2 : 2 + (h - 1)), oz = cups * cup, gal = oz / 128;
  const base = alc ? `${nfmt(gal * 0.3, 2)} gal juice · ${nfmt(gal * 0.3, 2)} gal sparkling (soda or wine) · ${nfmt(gal * 0.2, 2)} gal spirit (rum, vodka or brandy) · ${nfmt(gal * 0.2, 2)} gal ice ring / water` : `${nfmt(gal * 0.5, 2)} gal fruit juice · ${nfmt(gal * 0.35, 2)} gal ginger ale or lemon-lime soda · ${nfmt(gal * 0.15, 2)} gal sherbet or ice ring`;
  return { tot: `${nfmt(gal, 1)} gallons of punch (${nfmt(cups, 0)} ${nfmt(cup, 0)}-oz cups)`, mix: base, note: `About 2 cups per guest for the first hour and 1 per hour after · a standard punch bowl holds 1.5–2.5 gallons${alc ? " · keep a non-alcoholic option" : ""}` };
};
export const tableware: Calc = (v) => {
  const n = need(p(v, "n", 50), "Enter number of guests."), meal = pick(v.m, 2) === 0, h = p(v, "h", 3), extra = p(v, "x", 10) / 100;
  const f = 1 + extra, plates = n * (meal ? 2 : 1.5) * f, cups = n * (h + 1) * f, nap = n * 3 * f, cut = n * (meal ? 2 : 1) * f;
  return { pl: `${nfmt(ceil(plates))} plates (${meal ? "dinner + dessert" : "small plates"}) · ${nfmt(ceil(cups))} cups`, more: `${nfmt(ceil(nap))} napkins · ${nfmt(ceil(cut))} sets of cutlery · ${nfmt(ceil((n * (h + 1)) / 2))} lb ice for drinks`, note: `Includes ${pc(extra)} extra · about one cup per guest per hour plus one` };
};
export const champagne: Calc = (v) => {
  const n = need(p(v, "n", 100), "Enter number of guests."), pour = pick(v.p, 2), pct0 = p(v, "t", 90) / 100, price = p(v, "pr", 0);
  const per = pour === 0 ? 6 : 8, bottles = ceil((n * pct0) / per);
  return { b: `${nfmt(bottles)} bottles of sparkling wine for the toast`, how: `${nfmt(n * pct0, 0)} toasting guests ÷ ${per} pours of ${pour === 0 ? "4 oz" : "3 oz"} per 750 mL bottle`, cost: price > 0 ? `${money(bottles * price, "$", 0)} at ${money(price)} a bottle` : "A magnum (1.5 L) equals two bottles" };
};
export const coffeeCrowd: Calc = (v) => {
  const n = need(p(v, "n", 40), "Enter number of guests."), per = p(v, "c", 1.5), sz = p(v, "s", 8);
  const cups = n * per, oz = cups * sz, grams = (oz * OZ / 1000) * 60;
  return { tot: `${nfmt(cups, 0)} cups of coffee (${nfmt(oz / 128, 1)} gallons)`, beans: `${nfmt(grams, 0)} g ground coffee (${nfmt(grams / 453.6, 1)} lb) at 60 g per litre`, extra: `${nfmt(ceil(cups * 0.6), 0)} oz milk or creamer · ${nfmt(ceil(cups), 0)} sugar packets · a 100-cup urn makes 5 gallons` };
};
export const cupcakes: Calc = (v) => {
  const n = need(p(v, "n", 40), "Enter number of guests."), kids = pick(v.k, 2) === 1, other = pick(v.o, 2) === 1, batch = p(v, "b", 24);
  const per = (kids ? 1.5 : 1.25) * (other ? 0.75 : 1), tot = ceil(n * per * 1.1);
  return { tot: `${nfmt(tot)} cupcakes`, batch: `${nfmt(ceil(tot / batch))} batches of ${nfmt(batch, 0)} · about ${nfmt(tot * 2.5, 0)} tbsp (${nfmt((tot * 2.5) / 16, 1)} cups) frosting`, note: `${nfmt(per, 2)} per guest + 10% extra${other ? " (fewer because other desserts are served)" : ""}` };
};
export const crawfish: Calc = (v) => {
  const n = need(p(v, "n", 20), "Enter number of guests."), app = pick(v.a, 3), lb = [2.5, 4, 5][app] * n;
  return { lb: `${nfmt(lb, 0)} lb live crawfish (${nfmt(lb / 35, 1)} sacks of ~35 lb)`, extras: `${nfmt(ceil(n / 2), 0)} lb small potatoes · ${nfmt(ceil(n * 1.5), 0)} half-ears of corn · ${nfmt(ceil(n / 4), 0)} onions · ${nfmt(ceil(n / 5), 0)} heads garlic · ${nfmt(ceil(n / 5), 0)} lemons`, season: `≈ ${nfmt(lb / 8, 1)} lb boil seasoning (check your brand's ratio) · ${nfmt(ceil(lb / 35) * 10, 0)}+ gallons of water per sack-size pot` };
};
export const lobster: Calc = (v) => {
  const n = need(p(v, "n", 6), "Enter number of guests."), sz = p(v, "s", 1.5), app = pick(v.a, 2) === 1, price = p(v, "pr", 0);
  const each = app ? 0.5 : 1, tot = ceil(n * each);
  return { tot: `${nfmt(tot)} lobsters of ${nfmt(sz, 2)} lb (${nfmt(tot * sz, 1)} lb live)`, meat: `≈ ${nfmt(tot * sz * 0.25 * 16, 0)} oz meat (about 25% of live weight)`, cook: `Boil ${nfmt(sz <= 1.25 ? 12 : sz <= 1.5 ? 14 : sz <= 2 ? 16 : 20, 0)} minutes in salted water (or steam ~2 min longer)${price > 0 ? ` · cost ${money(tot * sz * price, "$", 0)}` : ""}` };
};
export const potluck: Calc = (v) => {
  const n = need(p(v, "n", 30), "Enter number of guests."), serves = p(v, "s", 10);
  const dishes = Math.max(5, ceil(n / serves) + 1), cats: [string, number][] = [["Main dishes", 0.3], ["Sides", 0.25], ["Salads", 0.15], ["Desserts", 0.2], ["Drinks / bread", 0.1]];
  const cnt = cats.map(([, f]) => Math.max(1, Math.round(dishes * f))), tot = cnt.reduce((a, b) => a + b, 0);
  return { d: `${nfmt(tot)} dishes needed for ${nfmt(n)} guests`, split: cats.map(([c], i) => `${c} ${cnt[i]}`).join(" · "), note: `Assumes each dish serves about ${nfmt(serves, 0)} · ask for serving spoons and labels for allergens` };
};

// ---- Wine, spirits & cocktails ----
export const proofAbv: Calc = (v) => {
  const x = need(p(v, "x", 80), "Enter the value."), from = pick(v.f, 3);
  const abv = from === 0 ? x / 2 : from === 1 ? x / 1.75 : x;
  return { abv: `${nfmt(abv, 1)}% ABV`, proof: `${nfmt(abv * 2, 1)} US proof · ${nfmt(abv * 1.75, 1)} UK (Sikes) proof`, note: abv > 95.6 ? "Above 95.6% isn't possible by ordinary distillation (azeotrope)" : abv >= 40 ? "Standard spirits are 40% ABV (80 proof)" : "Liqueurs are usually 15–30% ABV" };
};
export const infusion: Calc = (v) => {
  const ml = need(p(v, "ml", 750), "Enter spirit volume (mL)."), t = pick(v.t, 5);
  const I: [string, number, string][] = [["Fresh fruit (berries, citrus, pineapple)", 0.5, "3–7 days"], ["Dried fruit", 0.25, "5–10 days"], ["Fresh herbs (mint, basil)", 0.03, "1–3 days"], ["Whole spices (cinnamon, vanilla)", 0.01, "2–7 days"], ["Hot peppers", 0.05, "4–24 hours — taste often"]];
  const [nm, r, time] = I[t];
  return { amt: `${nfmt(ml * r, 0)} g ${nm.split(" (")[0].toLowerCase()} for ${nfmt(ml, 0)} mL spirit`, time: `Steep ${time} in a sealed jar, out of sunlight, shaking daily`, note: "Use a neutral 40% spirit (vodka) or match flavours (rum + pineapple, bourbon + cherry) · strain and filter, then store cool" };
};
export const winePairing: Calc = (v) => {
  const g = need(p(v, "g", 8), "Enter guests."), c = Math.max(1, Math.round(p(v, "c", 5))), pour = p(v, "p", 3), price = p(v, "pr", 0);
  const oz = g * c * pour, bottles = ceil(oz / 25.36);
  return { b: `${nfmt(bottles)} bottles for ${nfmt(c)} courses`, how: `${nfmt(pour, 1)} oz pours × ${nfmt(c)} courses × ${nfmt(g)} guests = ${nfmt(oz, 0)} oz (750 mL = 25.4 oz)`, note: `${nfmt(c * pour, 1)} oz per guest (≈ ${nfmt((c * pour) / 5, 1)} standard glasses)${price > 0 ? ` · ${money(bottles * price, "$", 0)} at ${money(price)} a bottle` : ""} · one bottle per wine pairs best for 8 guests` };
};
const BOT: [string, number][] = [["Piccolo / split", 0.1875], ["Demi / half", 0.375], ["Standard", 0.75], ["Magnum", 1.5], ["Double magnum / Jeroboam", 3], ["Rehoboam", 4.5], ["Methuselah / Imperial", 6], ["Salmanazar", 9], ["Balthazar", 12], ["Nebuchadnezzar", 15]];
export const bottleSizes: Calc = (v) => {
  const b = BOT[pick(v.b, BOT.length)], n = Math.max(1, Math.round(p(v, "n", 1)));
  const L = b[1] * n;
  return { vol: `${nfmt(L, 3)} L (${nfmt((L * 1000) / OZ, 1)} oz) — ${nfmt(L / 0.75, 2)} standard bottles`, glass: `≈ ${nfmt((L * 1000) / 150, 0)} glasses of 5 oz (150 mL)`, note: `${b[0]} · Jeroboam is 3 L for Champagne but 4.5 L in Bordeaux · large formats age more slowly` };
};
const AGE: [string, number, number][] = [["Bordeaux / Cabernet blend (top)", 8, 25], ["Napa Cabernet Sauvignon", 5, 15], ["Barolo / Barbaresco", 10, 25], ["Burgundy / Pinot Noir", 3, 12], ["Rioja Reserva / Gran Reserva", 5, 20], ["Syrah / Shiraz", 4, 15], ["Zinfandel / Malbec", 2, 8], ["White Burgundy / Chardonnay", 2, 8], ["Riesling (Spätlese and up)", 3, 20], ["Sauvignon Blanc / Pinot Grigio", 0, 3], ["Vintage Champagne", 5, 20], ["Vintage Port", 15, 50]];
export const agingWindow: Calc = (v) => {
  const w = AGE[pick(v.w, AGE.length)], vin = need(p(v, "y", 2018), "Enter the vintage year."), now = new Date().getUTCFullYear(), q2 = pick(v.q, 3);
  const adj = [-0.3, 0, 0.3][q2], a = Math.round(vin + w[1] * (1 + adj)), b = Math.round(vin + w[2] * (1 + adj));
  return { win: `Drink ${a}–${b}`, now: now < a ? `Too young — wait about ${a - now} more years` : now <= b ? "In its drinking window now" : "Past its typical peak — drink soon", note: `${w[0]}, typical window ${w[1]}–${w[2]} years from vintage, adjusted for ${["a lighter", "an average", "a top"][q2]} vintage/producer · storage at 12–14 °C matters most` };
};
export const cellar: Calc = (v) => {
  const w = need(p(v, "w", 48), "Enter rack width (in)."), h = need(p(v, "h", 84), "Enter rack height (in)."), d = need(p(v, "d", 14), "Enter rack depth (in)."), sz = pick(v.s, 2), walls = Math.max(1, Math.round(p(v, "n", 1)));
  const dia = sz === 0 ? 3.5 : 4, len = sz === 0 ? 12 : 13, cols = Math.floor(w / dia), rows = Math.floor(h / dia), deep = Math.max(1, Math.floor(d / len));
  const b = cols * rows * deep * walls;
  return { b: `${nfmt(b)} bottles`, how: `${cols} across × ${rows} high × ${deep} deep${walls > 1 ? ` × ${walls} racks` : ""} at ${dia} in per bottle`, note: sz === 0 ? "Bordeaux-style bottles · Burgundy and Champagne bottles are wider, so capacity drops 15–25%" : "Burgundy / Champagne size bottles" };
};
export const sangria: Calc = (v) => {
  const n = need(p(v, "n", 12), "Enter number of guests."), gl = p(v, "g", 2), red = pick(v.t, 2) === 0;
  const oz = n * gl * 6, bottles = ceil((oz * 0.6) / 25.36);
  return { wine: `${nfmt(bottles)} bottles ${red ? "red" : "white or rosé"} wine (${nfmt(oz / 128, 1)} gal total sangria)`, mix: `Per bottle: ¼ cup brandy, ½ cup orange juice, 2 tbsp sugar or simple syrup, 1 orange + 1 apple diced, 1 cup sparkling water just before serving`, note: `${nfmt(gl, 0)} six-oz glasses per guest · chill at least 2 hours (up to overnight) for the fruit to infuse` };
};
export const margarita: Calc = (v) => {
  const n = need(p(v, "n", 8), "Enter number of drinks."), sz = p(v, "s", 4), st = pick(v.t, 2);
  const parts = st === 0 ? [2, 1, 1, 0] : [2, 0, 1, 0.5], tot = parts.reduce((a, b) => a + b, 0), oz = n * sz * 0.8, unit = oz / tot;
  const fmt = (x: number) => `${nfmt(x * unit, 1)} oz (${nfmt((x * unit) / 8, 2)} cups)`;
  return { mix: st === 0 ? `Tequila ${fmt(2)} · orange liqueur ${fmt(1)} · fresh lime juice ${fmt(1)}` : `Tequila ${fmt(2)} · lime juice ${fmt(1)} · agave syrup ${fmt(0.5)} (Tommy's style)`, tot: `${nfmt(oz, 0)} oz before ice (${nfmt(n, 0)} drinks of ${nfmt(sz, 1)} oz with ~20% dilution)`, note: "Stir with ice for 30 seconds or shake per pitcher-glass · salt rims and lime wedges for garnish" };
};
export const mocktail: Calc = (v) => {
  const n = need(p(v, "n", 20), "Enter number of drinks."), sz = p(v, "s", 8), a = p(v, "a", 3), b = p(v, "b", 2), c = p(v, "c", 1), d = p(v, "d", 0);
  const tot = a + b + c + d; if (!tot) throw new InputError("Enter at least one part.");
  const oz = n * sz * 0.85, u = oz / tot;
  return { mix: `Base ${nfmt(a * u, 0)} oz · second ingredient ${nfmt(b * u, 0)} oz · sweet/sour ${nfmt(c * u, 0)} oz${d ? ` · fizz ${nfmt(d * u, 0)} oz (add last)` : ""}`, tot: `${nfmt(oz / 128, 2)} gallons for ${nfmt(n)} drinks of ${nfmt(sz, 0)} oz (15% left for ice)`, note: "Batch everything except carbonated mixers; add those just before serving" };
};
export const distill: Calc = (v) => {
  const L = need(p(v, "l", 20), "Enter wash volume (L)."), abv = need(p(v, "a", 10), "Enter wash ABV (%).") / 100, out = need(p(v, "o", 40), "Enter collected ABV (%).") / 100, eff = p(v, "e", 85) / 100, cut = p(v, "c", 15) / 100;
  const pure = L * abv, kept = pure * eff * (1 - cut), vol = kept / out;
  return { vol: `≈ ${nfmt(vol, 2)} L of spirit at ${pc(out)} ABV`, how: `${nfmt(pure, 2)} L pure alcohol in the wash × ${pc(eff)} recovery × ${pc(1 - cut)} after heads/tails cuts`, note: "For licensed distillers and education — distilling alcohol at home without a permit is illegal in the US and many other countries" };
};
export const moonshineMash: Calc = (v) => {
  const L = need(p(v, "l", 25), "Enter wash volume (L)."), abv = need(p(v, "a", 10), "Enter target wash ABV (%)."), grainPts = p(v, "gp", 0);
  const sg = 1 + abv / 131.25, pts = (sg - 1) * 1000 * L - grainPts * L, kg = Math.max(0, pts / 384);
  return { kg: `${nfmt(kg, 2)} kg sugar (${nfmt(kg * 2.2046, 1)} lb) for ${nfmt(L, 1)} L`, og: `Target starting gravity ${sg.toFixed(3)} for ≈ ${nfmt(abv, 1)}% ABV fermented dry${grainPts ? ` (grain supplies ${nfmt(grainPts, 0)} points)` : ""}`, note: "Sugar ≈ 384 gravity points per kg per litre · for licensed producers and fermentation education — home distillation is illegal in many countries" };
};
export const angelsShare: Calc = (v) => {
  const L = need(p(v, "l", 200), "Enter barrel volume (L)."), y = need(p(v, "y", 8), "Enter years."), r = p(v, "r", 3) / 100;
  const left = L * Math.pow(1 - r, y);
  return { left: `${nfmt(left, 1)} L left after ${nfmt(y, 1)} years (${pc(left / L)} of the fill)`, lost: `${nfmt(L - left, 1)} L lost to evaporation at ${pc(r, 1)} a year`, note: "Scotland ≈ 2% a year; Kentucky 3–5%; hot climates (India, Taiwan) up to 10–12% — ABV may rise or fall depending on humidity" };
};
export const sakePolish: Calc = (v) => {
  const r = need(p(v, "r", 50), "Enter the polishing ratio (%)."), added = pick(v.a, 2) === 1;
  const grade = r <= 50 ? (added ? "Daiginjo" : "Junmai Daiginjo") : r <= 60 ? (added ? "Ginjo" : "Junmai Ginjo") : r <= 70 ? (added ? "Honjozo" : "Junmai") : added ? "Futsushu (table sake)" : "Junmai";
  return { g: `${grade}`, how: `Seimaibuai ${nfmt(r, 0)}% — ${nfmt(100 - r, 0)}% of each rice grain was polished away`, note: "Ginjo ≤ 60%, Daiginjo ≤ 50%, Honjozo ≤ 70%; Junmai (no added alcohol) has no minimum since 2004 · lower ratios are usually lighter and more aromatic" };
};

// ---- registry (generated)
export const ideaFood4CustomCalculators: Record<string, Calc> = {
  "wings-per-person-calculator": wings,
  "cheese-board-amount-calculator": cheeseBoard,
  "punch-bowl-recipe-calculator": punch,
  "cups-plates-napkins-count-calculator": tableware,
  "champagne-toast-bottles-calculator": champagne,
  "coffee-for-crowd-calculator": coffeeCrowd,
  "cupcakes-per-guest-calculator": cupcakes,
  "crawfish-boil-per-person-calculator": crawfish,
  "lobster-per-person-calculator": lobster,
  "potluck-sign-up-split-calculator": potluck,
  "proof-to-abv-calculator": proofAbv,
  "infused-liquor-ratio-calculator": infusion,
  "wine-pairing-serving-size-calculator": winePairing,
  "wine-bottle-sizes-calculator": bottleSizes,
  "wine-aging-window-calculator": agingWindow,
  "wine-cellar-bottle-capacity-calculator": cellar,
  "sangria-batch-calculator": sangria,
  "margarita-pitcher-calculator": margarita,
  "mocktail-batch-ratio-calculator": mocktail,
  "distillation-yield-calculator": distill,
  "moonshine-mash-sugar-calculator": moonshineMash,
  "barrel-aging-angels-share-calculator": angelsShare,
  "sake-polishing-ratio-calculator": sakePolish,
};
