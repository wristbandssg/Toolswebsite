/**
 * Idea build, batch agri1 (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Business & Industrial > Agriculture & Livestock, part 1 (37 tools).
 * Grain shrink: water shrink = (Mi − Mf)/(100 − Mf) + handling shrink. Heart girth (lb) ≈ girth²·length/300
 * (cattle), pig ≈ girth²·length/400. Gestation: cow 283 d, sheep 147, horse 340, goat 150.
 * 1 animal unit = 1,000 lb cow eating ≈ 26 lb dry matter/day (780 lb/month AUM).
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt, dayText, dateIn } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const TODAY = () => Math.floor(Date.now() / 86400000);

export const npkBlend: Calc = (v) => {
  const n = p(v, "n", 150), pp = p(v, "p", 60), k = p(v, "k", 90), acres = p(v, "acres", 40);
  const urea = n / 0.46, map = pp / 0.52, mapN = map * 0.11, potash = k / 0.6, ureaAdj = Math.max(0, (n - mapN) / 0.46);
  return { blend: `${nfmt(ureaAdj)} lb urea + ${nfmt(map)} lb MAP + ${nfmt(potash)} lb potash per acre`, total: `${nfmt(ureaAdj + map + potash)} lb product per acre · ${nfmt(((ureaAdj + map + potash) * acres) / 2000, 1)} tons for ${acres} acres`, note: `Urea alone would need ${nfmt(urea)} lb; MAP supplies ${nfmt(mapN)} lb of the N` };
};
export const plantPop: Calc = (v) => {
  const row = need(p(v, "row", 30), "Enter row spacing."), seed = need(p(v, "seed", 6.3), "Enter seed spacing."), emerge = p(v, "em", 95) / 100;
  const pop = (43560 * 144) / (row * seed);
  return { pop: `${nfmt(pop * emerge)} plants per acre`, seeds: `${nfmt(pop)} seeds per acre planted`, ha: `${nfmt(pop * emerge * 2.471)} plants per hectare` };
};
export const wheatYield: Calc = (v) => {
  const heads = p(v, "heads", 50), kernels = p(v, "k", 25), kpp = p(v, "kpp", 15000);
  const yieldBu = (heads * kernels * 43560) / (kpp * 60);
  return { yield: `${yieldBu.toFixed(1)} bu/acre`, t: `${((yieldBu * 60) / 2204.6 * 2.471).toFixed(2)} t/ha`, note: `${heads} heads per ft², ${kernels} kernels per head, ${nfmt(kpp)} kernels per lb` };
};
const GM = [15.5, 13, 13.5, 14];
export const grainShrink: Calc = (v) => {
  const g = pick(v.g, 4), w = p(v, "w", 1000), mi = p(v, "mi", 22), mf = num(v.mf, GM[g]), hs = p(v, "hs", 0.5) / 100;
  if (mi <= mf) return { shrink: "No drying shrink — grain is at or below target moisture", net: `${nfmt(w)} bushels`, factor: "—" };
  const s = (mi - mf) / (100 - mf) + hs;
  return { shrink: `${(s * 100).toFixed(2)}% shrink`, net: `${nfmt(w * (1 - s))} dry bushels from ${nfmt(w)} wet`, factor: `${(((mi - mf) / (100 - mf)) * 100 / (mi - mf)).toFixed(3)}% per point of moisture + ${(hs * 100).toFixed(1)}% handling` };
};
const BALE_W = [50, 1000, 900, 1400];
export const baleWeight: Calc = (v) => {
  const b = pick(v.b, 4), moist = p(v, "m", 15) / 100, n = p(v, "n", 100);
  const wt = BALE_W[b] * (1 + (moist - 0.15));
  return { w: `${nfmt(wt)} lb per bale`, dm: `${nfmt(wt * (1 - moist))} lb dry matter`, tons: `${nfmt((wt * n) / 2000, 1)} tons for ${n} bales` };
};
export const hayWinter: Calc = (v) => {
  const head = p(v, "head", 30), wt = p(v, "wt", 1200), days = p(v, "days", 150), waste = p(v, "waste", 15) / 100, bale = need(p(v, "bale", 1200), "Enter bale weight.");
  const lb = head * wt * 0.025 * days * (1 + waste);
  return { tons: `${nfmt(lb / 2000, 1)} tons of hay`, bales: `${Math.ceil(lb / bale)} bales of ${nfmt(bale)} lb`, day: `${nfmt(head * wt * 0.025)} lb a day (2.5% of body weight)` };
};
export const silagePile: Calc = (v) => {
  const l = p(v, "l", 150), w = p(v, "w", 40), h = p(v, "h", 12), dens = p(v, "dens", 44), dm = p(v, "dm", 35) / 100;
  const vol = l * w * h * 0.6, tons = (vol * dens) / 2000;
  return { tons: `${nfmt(tons)} tons as-fed`, dm: `${nfmt(tons * dm)} tons dry matter`, vol: `${nfmt(vol)} ft³ (60% shape factor for a sloped pile)` };
};
export const stockingRate: Calc = (v) => {
  const acres = p(v, "acres", 100), forage = p(v, "forage", 3000), util = p(v, "util", 50) / 100, wt = p(v, "wt", 1200), days = need(p(v, "days", 180), "Enter grazing days.");
  const avail = acres * forage * util, au = wt / 1000, perHead = au * 26 * days;
  return { head: `${Math.floor(avail / perHead)} head for ${days} days`, au: `${(au).toFixed(2)} AU per animal · ${nfmt(avail / (26 * 30))} AUMs available`, acres: `${(acres / Math.max(Math.floor(avail / perHead), 1)).toFixed(1)} acres per head` };
};
export const heartGirth: Calc = (v) => {
  const g = need(p(v, "g", 72), "Enter heart girth."), l = need(p(v, "l", 66), "Enter body length.");
  const lb = (g * g * l) / 300;
  return { w: `${nfmt(lb)} lb`, kg: `${nfmt(lb * 0.4536)} kg`, note: "Measure girth just behind the front legs and length from shoulder point to pin bone; ±5–10%" };
};
export const adg: Calc = (v) => {
  const w1 = p(v, "w1", 550), w2 = p(v, "w2", 850), days = need(p(v, "days", 150), "Enter days on feed."), target = p(v, "t", 1300);
  const g = (w2 - w1) / days;
  return { adg: `${g.toFixed(2)} lb per day`, toTarget: g > 0 ? `${Math.ceil((target - w2) / g)} more days to reach ${nfmt(target)} lb` : "—", kg: `${(g * 0.4536).toFixed(2)} kg/day` };
};
export const fcr: Calc = (v) => {
  const feed = need(p(v, "feed", 1800), "Enter feed eaten."), gain = need(p(v, "gain", 300), "Enter weight gained."), price = p(v, "price", 0.12);
  const r = feed / gain;
  return { fcr: `${r.toFixed(2)} : 1`, cost: `${$(r * price)} feed cost per lb of gain`, eff: `${((gain / feed) * 100).toFixed(1)}% feed efficiency (gain ÷ feed)` };
};
export const ration: Calc = (v) => {
  const wt = p(v, "wt", 900), dmi = p(v, "dmi", 2.5) / 100, hayDm = p(v, "hdm", 88) / 100, grainDm = p(v, "gdm", 86) / 100, grainPct = p(v, "gp", 40) / 100;
  const dm = wt * dmi, grain = (dm * grainPct) / grainDm, hay = (dm * (1 - grainPct)) / hayDm;
  return { ration: `${hay.toFixed(1)} lb hay + ${grain.toFixed(1)} lb grain per day (as fed)`, dm: `${dm.toFixed(1)} lb dry matter (${(dmi * 100).toFixed(1)}% of body weight)`, note: `${(grainPct * 100).toFixed(0)}% concentrate on a dry-matter basis` };
};
export const pigTape: Calc = (v) => {
  const g = need(p(v, "g", 45), "Enter heart girth."), l = need(p(v, "l", 42), "Enter length.");
  const lb = (g * g * l) / 400;
  return { w: `${nfmt(lb)} lb`, kg: `${nfmt(lb * 0.4536)} kg`, note: "Length from between the ears to the base of the tail; add 7 lb under 150 lb" };
};
const gest = (days: number, label: string): Calc => (v) => {
  const bred = dateIn(v, "date", TODAY() - 60), due = bred + days;
  return { due: dayText(due), window: `${dayText(due - 7)} – ${dayText(due + 7)}`, note: `${days}-day average ${label} gestation`, left: `${due - TODAY()} days from today` };
};
export const sheepGest = gest(147, "sheep");
export const cowGest = gest(283, "cattle");
export const horseGest = gest(340, "horse");
export const eggProfit: Calc = (v) => {
  const hens = p(v, "hens", 50), rate = p(v, "rate", 75) / 100, price = p(v, "price", 5), feed = p(v, "feed", 0.25), fp = p(v, "fp", 0.25), other = p(v, "other", 30);
  const doz = (hens * rate * 30) / 12, rev = doz * price, cost = hens * fp * 30 * feed * 4 + other;
  return { profit: `${$(rev - cost)} a month`, doz: `${nfmt(doz, 1)} dozen eggs a month`, cost: `${$(cost / Math.max(doz, 1))} cost per dozen` };
};
export const broilerFeed: Calc = (v) => {
  const birds = p(v, "birds", 100), wt = p(v, "wt", 6), fcr0 = p(v, "fcr", 2), price = p(v, "price", 0.3), chick = p(v, "chick", 1.5), proc = p(v, "proc", 4), mort = p(v, "mort", 5) / 100;
  const feed = birds * wt * fcr0, live = birds * (1 - mort), cost = feed * price + birds * chick + live * proc;
  return { cost: $(cost), per: `${$(cost / live)} per bird · ${$(cost / (live * wt * 0.72))} per lb dressed`, feed: `${nfmt(feed)} lb feed` };
};
export const BIRD = ["Chicken (21 days)", "Duck (28)", "Muscovy duck (35)", "Goose (30)", "Turkey (28)", "Quail (17)", "Guinea fowl (27)"];
const INC = [21, 28, 35, 30, 28, 17, 27];
export const hatchDate: Calc = (v) => {
  const b = pick(v.b, INC.length), set = dateIn(v, "date", TODAY()), d = INC[b];
  return { hatch: dayText(set + d), lockdown: `Lockdown (stop turning, raise humidity) on ${dayText(set + d - 3)}`, candle: `Candle on ${dayText(set + 7)} and ${dayText(set + Math.round(d * 0.66))}` };
};
export const dairyProfit: Calc = (v) => {
  const cows = p(v, "cows", 100), milk = p(v, "milk", 75), price = p(v, "price", 20), feed = p(v, "feed", 9), other = p(v, "other", 5);
  const cwt = (cows * milk * 30) / 100, rev = cwt * price, cost = cows * (feed + other) * 30;
  return { profit: `${$(rev - cost, 0)} a month`, iofc: `${$(milk / 100 * price - feed)} income over feed cost per cow per day`, cwt: `${nfmt(cwt)} cwt a month` };
};
export const irrigation: Calc = (v) => {
  const et = p(v, "et", 0.3), kc = p(v, "kc", 1.15), rain = p(v, "rain", 0.05), eff = Math.max(0.1, p(v, "eff", 85) / 100), acres = p(v, "acres", 125);
  const net = Math.max(0, et * kc - rain), gross = net / eff, gpm = (gross * acres * 27154) / 1440;
  return { inches: `${gross.toFixed(3)} in/day gross`, gpm: `${nfmt(gpm)} gpm continuous for ${acres} acres`, week: `${(gross * 7).toFixed(2)} in/week (${nfmt(gross * 7 * acres * 27154)} gallons)` };
};
export const pivotAcres: Calc = (v) => {
  const r = need(p(v, "r", 1300), "Enter pivot length."), arc = Math.min(360, p(v, "arc", 360)), corner = pick(v.c, 2);
  const ac = (Math.PI * r * r * arc) / 360 / 43560;
  return { acres: `${ac.toFixed(1)} irrigated acres`, field: `${((4 * r * r) / 43560).toFixed(1)} acres in the square field`, corner: corner ? `+ about ${((4 * r * r) / 43560 - (Math.PI * r * r) / 43560).toFixed(1)} acres with a corner arm` : "Corners not irrigated" };
};
const MN: [number, number, number][] = [[24, 10, 21], [36, 25, 22], [11, 7, 10], [56, 55, 45], [12, 5, 9]];
export const manureValue: Calc = (v) => {
  const m = pick(v.m, 5), qty = p(v, "q", 10), pn = p(v, "pn", 0.55), pp = p(v, "pp", 0.6), pk = p(v, "pk", 0.4), avail = p(v, "a", 50) / 100;
  const [n, ph, k] = MN[m], val = qty * (n * avail * pn + ph * pp + k * pk);
  return { value: `${$(val)} fertiliser value`, per: `${$(val / Math.max(qty, 1))} per unit`, nutrients: `${nfmt(qty * n * avail)} lb available N · ${nfmt(qty * ph)} lb P₂O₅ · ${nfmt(qty * k)} lb K₂O` };
};
export const cropIns: Calc = (v) => {
  const aph = p(v, "aph", 180), cov = p(v, "cov", 75) / 100, price = p(v, "price", 4.6), harvest = p(v, "hp", 4.2), actual = p(v, "act", 140), acres = p(v, "acres", 500);
  const guarantee = aph * cov * Math.max(price, harvest), rev = actual * harvest, ind = Math.max(0, guarantee - rev);
  return { g: `${$(guarantee)} per acre revenue guarantee`, pay: `${$(ind)} per acre indemnity (${$(ind * acres, 0)} total)`, rev: `${$(rev)} actual revenue per acre` };
};
export const landRent: Calc = (v) => {
  const value = p(v, "val", 9000), rate = p(v, "rate", 3) / 100, yieldBu = p(v, "y", 190), price = p(v, "pr", 4.5), share = p(v, "sh", 30) / 100;
  return { rent: `${$(value * rate)} per acre (land value × ${(rate * 100).toFixed(1)}%)`, share: `${$(yieldBu * price * share)} per acre crop-share equivalent`, gross: `${((100 * value * rate) / (yieldBu * price)).toFixed(1)}% of gross revenue` };
};
export const tractorFuel: Calc = (v) => {
  const hp = p(v, "hp", 200), load = p(v, "load", 60) / 100, hrs = p(v, "hrs", 300), price = p(v, "price", 3.8);
  const gph = hp * 0.06 * (load / 0.6) * 0.73;
  return { gph: `${gph.toFixed(1)} gal/hour`, year: `${nfmt(gph * hrs)} gallons a year (${$(gph * hrs * price, 0)})`, note: "Rule of thumb: 0.044 gal per max PTO hp-hour at average loads" };
};
export const fieldCapacity: Calc = (v) => {
  const w = need(p(v, "w", 30), "Enter implement width."), mph = need(p(v, "mph", 5), "Enter speed."), eff = p(v, "eff", 80) / 100, acres = p(v, "acres", 160);
  const ac = (w * mph * eff) / 8.25;
  return { ach: `${ac.toFixed(2)} acres per hour`, time: `${(acres / ac).toFixed(1)} hours for ${acres} acres`, theo: `${((w * mph) / 8.25).toFixed(2)} ac/h theoretical` };
};
export const honeyYield: Calc = (v) => {
  const hives = p(v, "hives", 10), lbs = p(v, "lb", 40), leave = p(v, "leave", 60), price = p(v, "price", 10);
  const harvest = Math.max(0, lbs) * hives;
  return { lb: `${nfmt(harvest)} lb surplus honey`, value: `${$(harvest * price, 0)} at ${$(price)}/lb`, note: `Leave about ${leave} lb per hive for winter (cold climates)`, jars: `${nfmt(harvest)} one-pound jars` };
};
export const aquaponics: Calc = (v) => {
  const fishLb = p(v, "fish", 50), feed = p(v, "feed", 1.5) / 100, ratio = p(v, "ratio", 60);
  const g = fishLb * 453.6 * feed, area = g / ratio;
  return { area: `${area.toFixed(1)} m² of grow bed (${(area * 10.764).toFixed(0)} ft²)`, feed: `${nfmt(g)} g of feed a day`, tank: `${nfmt(fishLb * 8)} gallons of fish tank at 1 lb per 8 gal` };
};
export const greenhouseBtu: Calc = (v) => {
  const area = p(v, "area", 2000), u = p(v, "u", 0.7), dt = p(v, "dt", 40), hrs = p(v, "hrs", 12);
  const btu = area * u * dt * 1.2;
  return { btu: `${nfmt(btu)} BTU/hour heater`, therm: `${nfmt((btu * hrs) / 100000, 1)} therms a day of propane/gas at design temperature`, note: "Surface area of glazing × U-value × temperature difference + 20% for infiltration" };
};
export const hydroNutrient: Calc = (v) => {
  const gal = need(p(v, "gal", 50), "Enter reservoir size."), dose = p(v, "dose", 2), ec = p(v, "ec", 1.8);
  return { dose: `${(gal * dose).toFixed(1)} ml (or tsp) of each part`, ppm: `${nfmt(ec * 500)} ppm (500 scale) / ${nfmt(ec * 700)} ppm (700 scale) target`, note: `EC ${ec} mS/cm; adjust pH to 5.5–6.5 after mixing` };
};
const WATER = [15, 35, 12, 2, 4, 9];
export const troughNeed: Calc = (v) => {
  const a = pick(v.a, 6), n = p(v, "n", 30), heat = 1 + Math.max(0, p(v, "t", 80) - 70) * 0.02;
  const gal = WATER[a] * n * heat;
  return { gal: `${nfmt(gal)} gallons a day`, week: `${nfmt(gal * 7)} gallons a week`, note: `${WATER[a]} gal per head per day, +2% per °F above 70` };
};
export const fenceWire: Calc = (v) => {
  const acres = p(v, "acres", 40), strands = p(v, "s", 4), roll = need(p(v, "roll", 1320), "Enter roll length."), post = p(v, "post", 12);
  const side = Math.sqrt(acres * 43560), perim = 4 * side;
  return { wire: `${nfmt(perim * strands)} ft of wire (${Math.ceil((perim * strands) / roll)} rolls)`, perim: `${nfmt(perim)} ft perimeter for a square field`, posts: `${Math.ceil(perim / post)} line posts at ${post} ft` };
};
export const cornDrying: Calc = (v) => {
  const bu = p(v, "bu", 50000), mi = p(v, "mi", 22), mf = p(v, "mf", 15), lpg = p(v, "lpg", 0.02), price = p(v, "pr", 1.8), elec = p(v, "e", 0.01);
  const pts = Math.max(0, mi - mf), gal = bu * pts * lpg;
  return { cost: `${$(gal * price + bu * pts * elec, 0)} total`, per: `${$((gal * price) / bu + pts * elec, 3)} per bushel`, gal: `${nfmt(gal)} gallons of propane for ${pts.toFixed(1)} points removed` };
};
export const seedCost: Calc = (v) => {
  const rate = p(v, "rate", 34000), seeds = need(p(v, "bag", 80000), "Enter seeds per bag."), price = p(v, "price", 300), acres = p(v, "acres", 500);
  const perAc = (rate / seeds) * price;
  return { per: `${$(perAc)} per acre`, total: `${$(perAc * acres, 0)} for ${acres} acres`, bags: `${Math.ceil((rate * acres) / seeds)} bags` };
};
export const orchard: Calc = (v) => {
  const row = need(p(v, "row", 20), "Enter row spacing."), tree = need(p(v, "tree", 15), "Enter tree spacing."), acres = p(v, "acres", 5), pat = pick(v.pat, 2);
  const per = (43560 / (row * tree)) * (pat ? 1.155 : 1);
  return { per: `${nfmt(per)} trees per acre`, total: `${nfmt(per * acres)} trees for ${acres} acres`, ha: `${nfmt(per * 2.471)} per hectare` };
};
export const vineCount: Calc = (v) => {
  const row = need(p(v, "row", 8), "Enter row spacing."), vine = need(p(v, "vine", 5), "Enter vine spacing."), acres = p(v, "acres", 10), tons = p(v, "t", 4);
  const per = 43560 / (row * vine);
  return { per: `${nfmt(per)} vines per acre`, total: `${nfmt(per * acres)} vines`, wine: `${nfmt(tons * acres * 150)} gallons of wine at ${tons} t/acre (≈150 gal/ton)` };
};

// ---- registry (generated)
export const ideaAgri1CustomCalculators: Record<string, Calc> = {
  "fertilizer-npk-blend-calculator": npkBlend,
  "plant-population-per-acre-calculator": plantPop,
  "wheat-yield-estimate-calculator": wheatYield,
  "grain-moisture-shrink-calculator": grainShrink,
  "hay-bale-weight-calculator": baleWeight,
  "hay-needed-for-winter-calculator": hayWinter,
  "silage-pile-volume-calculator": silagePile,
  "stocking-rate-animal-unit-calculator": stockingRate,
  "cattle-weight-by-heart-girth-calculator": heartGirth,
  "cattle-average-daily-gain-calculator": adg,
  "feed-conversion-ratio-calculator": fcr,
  "cattle-feed-ration-calculator": ration,
  "pig-weight-tape-calculator": pigTape,
  "sheep-gestation-date-calculator": sheepGest,
  "cow-gestation-due-date-calculator": cowGest,
  "horse-foaling-date-calculator": horseGest,
  "chicken-egg-production-profit-calculator": eggProfit,
  "broiler-feed-cost-calculator": broilerFeed,
  "incubation-hatch-date-calculator": hatchDate,
  "milk-yield-dairy-profit-calculator": dairyProfit,
  "irrigation-water-requirement-calculator": irrigation,
  "center-pivot-acreage-calculator": pivotAcres,
  "manure-nutrient-value-calculator": manureValue,
  "crop-insurance-revenue-guarantee-calculator": cropIns,
  "farm-land-rent-per-acre-calculator": landRent,
  "tractor-fuel-consumption-calculator": tractorFuel,
  "field-capacity-acres-per-hour-calculator": fieldCapacity,
  "beehive-honey-yield-calculator": honeyYield,
  "aquaponics-fish-to-plant-ratio-calculator": aquaponics,
  "greenhouse-heating-btu-calculator": greenhouseBtu,
  "hydroponic-nutrient-solution-calculator": hydroNutrient,
  "water-trough-livestock-need-calculator": troughNeed,
  "fence-wire-for-pasture-calculator": fenceWire,
  "corn-drying-cost-calculator": cornDrying,
  "seed-cost-per-acre-calculator": seedCost,
  "orchard-tree-spacing-per-acre-calculator": orchard,
  "vineyard-vine-count-calculator": vineCount,
};
