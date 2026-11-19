/**
 * Idea build, batch agri2 (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Business & Industrial > Agriculture & Livestock, part 2 (37 tools).
 * Test weights: corn 56 lb/bu, soybeans/wheat 60, barley 48, oats 32. Dressing %: beef ≈ 62%,
 * hogs ≈ 72%; retail cuts ≈ 65% of hanging weight. Maple sap: Rule of 86 (gallons = 86 ÷ °Brix).
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };

export const potashRate: Calc = (v) => {
  const k2o = p(v, "k", 120), acres = p(v, "acres", 80), price = p(v, "price", 380);
  const lb = k2o / 0.6;
  return { rate: `${nfmt(lb)} lb potash (0-0-60) per acre`, tons: `${((lb * acres) / 2000).toFixed(1)} tons for ${acres} acres`, cost: `${$((lb / 2000) * price)} per acre at ${$(price, 0)}/ton` };
};
export const PFERT = ["MAP 11-52-0", "DAP 18-46-0", "Triple super 0-46-0"];
const PF: [number, number][] = [[0.11, 0.52], [0.18, 0.46], [0, 0.46]];
export const phosRate: Calc = (v) => {
  const p2o5 = p(v, "p", 60), f = pick(v.f, 3), acres = p(v, "acres", 80), price = p(v, "price", 750);
  const [n, ph] = PF[f], lb = p2o5 / ph;
  return { rate: `${nfmt(lb)} lb ${PFERT[f]} per acre`, n: `Also supplies ${nfmt(lb * n)} lb N per acre`, cost: `${$((lb / 2000) * price)} per acre · ${((lb * acres) / 2000).toFixed(1)} tons total` };
};
export const fertCost: Calc = (v) => {
  const n = p(v, "n", 170), pp = p(v, "p", 60), k = p(v, "k", 80), pn = p(v, "pn", 0.55), ppp = p(v, "pp", 0.72), pk = p(v, "pk", 0.38), app = p(v, "app", 12), acres = p(v, "acres", 500);
  const per = n * pn + pp * ppp + k * pk + app;
  return { per: `${$(per)} per acre`, total: `${$(per * acres, 0)} for ${acres} acres`, split: `N ${$(n * pn)} · P ${$(pp * ppp)} · K ${$(k * pk)} · application ${$(app)}` };
};
export const cropProfit: Calc = (v) => {
  const y = p(v, "y", 200), price = p(v, "pr", 4.5), seed = p(v, "seed", 120), fert = p(v, "fert", 160), chem = p(v, "chem", 60), mach = p(v, "mach", 110), land = p(v, "land", 250), other = p(v, "oth", 80), ins = p(v, "ins", 25);
  const rev = y * price, cost = seed + fert + chem + mach + land + other + ins;
  return { profit: `${$(rev - cost)} per acre`, be: `Break-even ${$(cost / Math.max(y, 1))}/bu or ${(cost / Math.max(price, 0.01)).toFixed(1)} bu/acre`, rev: `${$(rev)} revenue − ${$(cost)} costs` };
};
export const breakEvenYield: Calc = (v) => {
  const cost = p(v, "cost", 800), price = need(p(v, "pr", 4.5), "Enter crop price."), y = p(v, "y", 200);
  return { be: `${(cost / price).toFixed(1)} bu/acre to break even`, margin: `${(y - cost / price).toFixed(1)} bu/acre above break-even at ${y} bu`, price: `${$(cost / Math.max(y, 1))}/bu break-even price at ${y} bu` };
};
export const grainStorage: Calc = (v) => {
  const bu = p(v, "bu", 30000), months = p(v, "m", 6), rate = p(v, "rate", 7) / 100, price = p(v, "pr", 4.2), shrink = p(v, "sh", 0.5) / 100, comm = p(v, "comm", 0.035), own = pick(v.own, 2);
  const interest = bu * price * rate * (months / 12), loss = bu * price * shrink, fee = own ? 0 : bu * comm * months;
  const per = (interest + loss + fee) / bu;
  return { per: `${$(per, 3)} per bushel to store ${months} months`, total: `${$(interest + loss + fee, 0)} total`, need: `Price must rise ${$(per, 3)}/bu to beat selling now` };
};
export const STORE = ["Commercial elevator", "On-farm bin"];
export const basis: Calc = (v) => {
  const cash = p(v, "cash", 4.15), fut = need(p(v, "fut", 4.45), "Enter futures price."), hist = num(v.hist, -0.25);
  const b = cash - fut;
  return { basis: `${b >= 0 ? "+" : ""}${b.toFixed(2)} (${b >= 0 ? "over" : "under"} futures)`, vs: b > hist ? `Stronger than the ${hist.toFixed(2)} average — good time to price cash` : "Weaker than average — consider storing or a basis contract", note: "Basis = local cash − nearby futures" };
};
export const hogFeed: Calc = (v) => {
  const pigs = p(v, "pigs", 100), start = p(v, "s", 50), end = p(v, "e", 280), fcr0 = p(v, "fcr", 2.8), price = p(v, "pr", 0.14);
  const feed = pigs * (end - start) * fcr0;
  return { cost: $(feed * price, 0), per: `${$((end - start) * fcr0 * price)} per pig · ${$(fcr0 * price)} per lb of gain`, feed: `${nfmt(feed / 2000, 1)} tons of feed` };
};
export const lambWean: Calc = (v) => {
  const birth = p(v, "b", 10), adg0 = p(v, "adg", 0.6), days = p(v, "d", 60), type = pick(v.t, 3);
  const adj = [1, 0.85, 0.75][type], w = birth + adg0 * days * adj;
  return { w: `${w.toFixed(1)} lb weaning weight`, adj: `${(adj * 100).toFixed(0)}% factor for ${["single", "twin", "triplet"][type]}`, kg: `${(w * 0.4536).toFixed(1)} kg` };
};
export const goatFeed: Calc = (v) => {
  const n = p(v, "n", 10), wt = p(v, "wt", 120), dmi = p(v, "dmi", 3.5) / 100, grain = p(v, "g", 0.5);
  const hay = n * wt * dmi / 0.9;
  return { hay: `${hay.toFixed(1)} lb hay a day for the herd`, grain: `${(n * grain).toFixed(1)} lb grain a day`, month: `${nfmt((hay * 30) / 2000, 2)} tons of hay a month` };
};
export const dairyIntake: Calc = (v) => {
  const wt = p(v, "wt", 1400), milk = p(v, "milk", 80), dim = p(v, "dim", 120);
  const dmi = (0.0185 * wt + 0.305 * milk * 0.95) * (1 - Math.exp(-0.192 * (dim / 7 + 3.67)));
  return { dmi: `${dmi.toFixed(1)} lb dry matter a day`, asfed: `${(dmi / 0.5).toFixed(0)} lb as-fed at 50% DM TMR`, pct: `${((100 * dmi) / wt).toFixed(2)}% of body weight` };
};
export const calfMilk: Calc = (v) => {
  const wt = p(v, "wt", 90), pct0 = p(v, "pct", 12) / 100, solids = p(v, "sol", 12.5) / 100, days = p(v, "d", 56), bag = need(p(v, "bag", 50), "Enter bag weight.");
  const lbLiquid = wt * pct0, powder = lbLiquid * solids;
  return { daily: `${(lbLiquid / 8.6).toFixed(2)} gallons a day (${powder.toFixed(2)} lb powder)`, total: `${Math.ceil((powder * days) / bag)} bags of ${bag} lb for ${days} days`, feeds: `${(lbLiquid / 8.6 / 2).toFixed(2)} gal per feeding, twice daily` };
};
export const hangingBeef: Calc = (v) => {
  const live = need(p(v, "live", 1300), "Enter live weight."), dress = p(v, "dr", 62) / 100;
  const hang = live * dress;
  return { hang: `${nfmt(hang)} lb hanging weight`, cuts: `${nfmt(hang * 0.65)} lb take-home cuts (≈65% of hanging)`, quarter: `${nfmt(hang / 4)} lb hanging per quarter` };
};
export const beefYield: Calc = (v) => {
  const live = need(p(v, "live", 1300), "Enter live weight."), dress = p(v, "dr", 62) / 100, cut = p(v, "cut", 65) / 100, bone = pick(v.bone, 2);
  const take = live * dress * cut * (bone ? 0.92 : 1);
  return { take: `${nfmt(take)} lb of packaged beef`, steaks: `≈ ${nfmt(take * 0.3)} lb steaks · ${nfmt(take * 0.25)} lb roasts · ${nfmt(take * 0.4)} lb ground beef`, freezer: `${(take / 35).toFixed(1)} ft³ of freezer space (35 lb per ft³)` };
};
export const hangingPig: Calc = (v) => {
  const live = need(p(v, "live", 270), "Enter live weight."), dress = p(v, "dr", 72) / 100;
  const hang = live * dress;
  return { hang: `${nfmt(hang)} lb hanging weight`, cuts: `${nfmt(hang * 0.75)} lb of pork cuts`, half: `${nfmt(hang / 2)} lb per half hog` };
};
export const freezerBeef: Calc = (v) => {
  const hang = need(p(v, "hang", 750), "Enter hanging weight."), price = p(v, "pr", 4.5), proc = p(v, "proc", 1), kill = p(v, "kill", 100), yieldP = p(v, "y", 65) / 100, share = pick(v.share, 4);
  const frac = [1, 0.5, 0.25, 0.125][share], h = hang * frac, cost = h * (price + proc) + kill * frac, take = h * yieldP;
  return { per: `${$(cost / take)} per lb of take-home beef`, total: `${$(cost)} for ${["a whole", "a half", "a quarter", "an eighth"][share]}`, take: `${nfmt(take)} lb take-home` };
};
export const turkeyCost: Calc = (v) => {
  const n = p(v, "n", 25), poult = p(v, "pt", 8), feed = p(v, "f", 80), fp = p(v, "fp", 0.32), proc = p(v, "proc", 10), price = p(v, "pr", 4.5), wt = p(v, "wt", 20);
  const cost = n * (poult + feed * fp + proc), rev = n * 0.95 * wt * price;
  return { cost: `${$(cost / n)} per bird (${$(cost, 0)} total)`, profit: `${$(rev - cost, 0)} profit at ${$(price)}/lb dressed`, lb: `${$(cost / (n * 0.95 * wt))} cost per lb` };
};
const eggsFor = (rateDefault: number, label: string): Calc => (v) => {
  const n = p(v, "n", 20), rate = p(v, "rate", rateDefault) / 100, price = p(v, "pr", 7), feed = p(v, "f", 0.3), fp = p(v, "fp", 0.28);
  const eggs = n * rate * 365, doz = eggs / 12, cost = n * feed * fp * 365;
  return { eggs: `${nfmt(eggs)} ${label} eggs a year`, doz: `${nfmt(doz)} dozen · ${$(doz * price - cost, 0)} profit`, cost: `${$(cost / Math.max(doz, 1))} feed cost per dozen` };
};
export const duckEggs = eggsFor(80, "duck");
export const quailEggs = eggsFor(85, "quail");
export const rabbitMeat: Calc = (v) => {
  const does = p(v, "d", 4), litters = p(v, "l", 5), kits = p(v, "k", 7), surv = p(v, "s", 85) / 100, fryer = p(v, "w", 5), dress = p(v, "dr", 55) / 100;
  const fryers = does * litters * kits * surv, meat = fryers * fryer * dress;
  return { meat: `${nfmt(meat)} lb of meat a year`, fryers: `${nfmt(fryers)} fryers`, week: `${(meat / 52).toFixed(1)} lb a week` };
};
export const fishDensity: Calc = (v) => {
  const vol = need(p(v, "vol", 1000), "Enter tank or pond volume."), dens = p(v, "dens", 40), size = need(p(v, "size", 1), "Enter harvest size.");
  const kg = (vol / 1000) * dens;
  return { fish: `${nfmt(kg / (size * 0.4536))} fish at ${size} lb harvest size`, kg: `${nfmt(kg)} kg final biomass`, note: `${dens} kg per m³ (tilapia RAS 40–60, ponds ≈ 1–2)` };
};
export const mushroomYield: Calc = (v) => {
  const kg = p(v, "kg", 100), be = p(v, "be", 75) / 100, flushes = p(v, "fl", 3), price = p(v, "pr", 12);
  const fresh = kg * be, perFlush = fresh / Math.max(flushes, 1);
  return { yield: `${nfmt(fresh, 1)} kg fresh mushrooms`, value: `${$(fresh * 2.2046 * price, 0)} at ${$(price)}/lb`, flush: `${perFlush.toFixed(1)} kg per flush over ${flushes} flushes` };
};
export const microgreens: Calc = (v) => {
  const trays = p(v, "t", 50), yieldOz = p(v, "y", 8), price = p(v, "pr", 3), seed = p(v, "seed", 1.5), soil = p(v, "soil", 0.75), cycles = p(v, "c", 4);
  const rev = trays * yieldOz * price * cycles, cost = trays * (seed + soil) * cycles;
  return { profit: `${$(rev - cost, 0)} a month`, rev: `${$(rev, 0)} revenue from ${nfmt(trays * cycles)} trays`, tray: `${$(yieldOz * price - seed - soil)} profit per tray` };
};
export const hempYield: Calc = (v) => {
  const t = pick(v.t, 3), acres = p(v, "a", 10), y = p(v, "y", [1500, 900, 6000][t]), price = p(v, "pr", [3, 0.6, 0.12][t]), cost = p(v, "c", [6000, 500, 400][t]);
  return { yield: `${nfmt(y * acres)} lb total (${nfmt(y)} lb/acre)`, profit: `${$((y * price - cost) * acres, 0)} profit`, per: `${$(y * price - cost)} per acre` };
};
export const mapleSyrup: Calc = (v) => {
  const brix = need(p(v, "b", 2), "Enter sap sugar content."), sap = p(v, "sap", 400), taps = p(v, "taps", 50);
  const ratio = 86 / brix;
  return { ratio: `${ratio.toFixed(1)} gallons of sap per gallon of syrup (Rule of 86)`, syrup: `${(sap / ratio).toFixed(1)} gallons of syrup from ${nfmt(sap)} gal of sap`, taps: `${(taps * 10 / ratio).toFixed(1)} gallons from ${taps} taps at 10 gal of sap each` };
};
export const xmasTree: Calc = (v) => {
  const acres = p(v, "a", 5), per = p(v, "per", 1200), years = need(p(v, "y", 7), "Enter years to harvest."), price = p(v, "pr", 70), cost = p(v, "c", 14), surv = p(v, "s", 80) / 100;
  const trees = acres * per * surv, rev = trees * price, tot = acres * per * cost;
  return { profit: `${$(rev - tot, 0)} per rotation`, year: `${$((rev - tot) / years, 0)} a year over ${years} years`, trees: `${nfmt(trees)} saleable trees` };
};
export const farmDepreciation: Calc = (v) => {
  const cost = p(v, "cost", 250000), salvage = p(v, "sv", 50000), life = Math.max(1, Math.round(p(v, "life", 10))), m = pick(v.m, 2), year = Math.max(1, Math.min(life, Math.round(p(v, "yr", 1))));
  if (m === 0) { const d = (cost - salvage) / life; return { dep: `${$(d, 0)} per year`, book: `${$(cost - d * year, 0)} book value after year ${year}`, note: "Straight-line" }; }
  let book = cost, d = 0; for (let i = 1; i <= year; i++) { d = Math.min(book - salvage, (book * 1.5) / life); book -= d; }
  return { dep: `${$(d, 0)} in year ${year}`, book: `${$(book, 0)} book value after year ${year}`, note: "150% declining balance (MACRS-style for farm property)" };
};
export const OPS = ["Planting", "Combining (corn)", "Combining (soybeans)", "Spraying", "Chisel plowing", "Disking", "Baling (per bale, round)", "Grain hauling (per bu, local)"];
const RATES = [24, 38, 34, 9, 22, 18, 13, 0.18];
export const customRates: Calc = (v) => {
  const o = pick(v.o, OPS.length), qty = p(v, "q", 200), adj = 1 + num(v.adj, 0) / 100, r = RATES[o] * adj;
  return { rate: `${$(r)} per ${o === 6 ? "bale" : o === 7 ? "bushel" : "acre"}`, total: `${$(r * qty, 0)} for ${nfmt(qty)}`, note: "Typical Midwest US custom rates — check your state's annual survey" };
};
const TW = [56, 60, 60, 48, 32, 56];
export const truckBushels: Calc = (v) => {
  const g = pick(v.g, 6), net = need(p(v, "net", 50000), "Enter net load weight (lb)."), l = p(v, "l", 0);
  return { bu: `${nfmt(net / TW[g], 1)} bushels`, check: l ? `Box volume ${nfmt(l * 0.8036, 0)} bu struck at 0.8036 bu/ft³` : "Enter box ft³ to check volume", t: `${(net / 2204.6).toFixed(2)} tonnes` };
};
export const buToTons: Calc = (v) => {
  const g = pick(v.g, 6), x = p(v, "x", 1000), mode = pick(v.mode, 2), tw = TW[g];
  return mode === 0 ? { out: `${((x * tw) / 2000).toFixed(2)} short tons`, metric: `${((x * tw) / 2204.6).toFixed(2)} metric tonnes`, note: `${tw} lb per bushel` } : { out: `${nfmt((x * 2000) / tw, 1)} bushels`, metric: `${nfmt((x * 2204.6) / tw, 1)} bushels per metric tonne basis`, note: `${tw} lb per bushel` };
};
export const hayPrice: Calc = (v) => {
  const price = p(v, "pr", 6), wt = need(p(v, "w", 50), "Enter bale weight."), mode = pick(v.mode, 2);
  const ton = mode === 0 ? (price * 2000) / wt : price, perBale = mode === 0 ? price : (price * wt) / 2000;
  return { ton: `${$(ton)} per ton`, bale: `${$(perBale)} per ${wt} lb bale`, lb: `${$(ton / 2000, 3)} per lb` };
};
export const roundVsSquare: Calc = (v) => {
  const rp = p(v, "rp", 55), rw = need(p(v, "rw", 900), "Enter round bale weight."), rwaste = p(v, "rwa", 15) / 100, sp = p(v, "sp", 7), sw = need(p(v, "sw", 50), "Enter square bale weight."), swaste = p(v, "swa", 5) / 100;
  const r = rp / (rw * (1 - rwaste)) * 2000, s = sp / (sw * (1 - swaste)) * 2000;
  return { r: `Round: ${$(r)} per ton eaten`, s: `Square: ${$(s)} per ton eaten`, best: r < s ? `Rounds are ${$(s - r)}/ton cheaper after waste` : `Squares are ${$(r - s)}/ton cheaper after waste` };
};
export const rotation: Calc = (v) => {
  const paddocks = Math.max(2, Math.round(p(v, "pad", 8))), rest = p(v, "rest", 30);
  const graze = rest / (paddocks - 1);
  return { graze: `${graze.toFixed(1)} days in each paddock`, cycle: `${(graze * paddocks).toFixed(0)}-day full rotation`, note: `Each paddock rests ${rest} days; add paddocks to graze shorter and rest longer` };
};
export const tankDays: Calc = (v) => {
  const gal = need(p(v, "gal", 300), "Enter tank size."), head = need(p(v, "head", 20), "Enter number of animals."), per = need(p(v, "per", 15), "Enter gallons per head per day.");
  const days = gal / (head * per);
  return { days: `${days.toFixed(1)} days`, hours: `${(days * 24).toFixed(0)} hours`, refill: `Refill ${nfmt(head * per)} gallons a day` };
};
const BA = [40, 80, 144, 15, 8, 4];
export const barnSize: Calc = (v) => {
  const a = pick(v.a, 6), n = p(v, "n", 20), extra = p(v, "x", 25) / 100;
  const ft = n * BA[a] * (1 + extra), side = Math.sqrt(ft / 2);
  return { area: `${nfmt(ft)} ft²`, dims: `About ${Math.ceil(side * 2)} × ${Math.ceil(side)} ft`, note: `${BA[a]} ft² per animal + ${(extra * 100).toFixed(0)}% for alleys, feed and storage` };
};
const STALL = [[10, 10], [12, 12], [12, 14], [14, 16]];
export const horseStall: Calc = (v) => {
  const h = pick(v.h, 4), n = Math.max(1, Math.round(p(v, "n", 6))), aisle = p(v, "a", 12);
  const [w, l] = STALL[h];
  return { stall: `${w} × ${l} ft per stall`, barn: `${n} stalls on two sides: about ${Math.ceil(n / 2) * w} × ${2 * l + aisle} ft`, height: "Ceiling at least 10–12 ft; doors 4 ft wide × 8 ft tall" };
};
export const SYRUP = ["1:1 spring (stimulate)", "2:1 fall (winter stores)"];
export const beeSyrup: Calc = (v) => {
  const t = pick(v.t, 2), gal = p(v, "gal", 2), hives = p(v, "h", 5);
  const sugarPerGal = t === 0 ? 8.3 : 11.5, waterPerGal = t === 0 ? 0.5 : 0.36;
  return { sugar: `${nfmt(sugarPerGal * gal * hives, 1)} lb sugar`, water: `${(waterPerGal * gal * hives).toFixed(1)} gallons of water`, note: `${gal} gal of ${SYRUP[t]} syrup per hive × ${hives} hives` };
};
const PR = [2, 1, 3, 1, 3, 1, 1, 1];
export const pollination: Calc = (v) => {
  const c = pick(v.c, PR.length), acres = p(v, "a", 40), fee = p(v, "fee", 200);
  const hives = Math.ceil(acres * PR[c]);
  return { hives: `${hives} hives`, cost: `${$(hives * fee, 0)} rental at ${$(fee, 0)} per hive`, note: `${PR[c]} strong hive(s) per acre recommended` };
};

// ---- registry (generated)
export const ideaAgri2CustomCalculators: Record<string, Calc> = {
  "potash-application-rate-calculator": potashRate,
  "phosphorus-application-rate-calculator": phosRate,
  "fertilizer-cost-per-acre-calculator": fertCost,
  "crop-profit-per-acre-calculator": cropProfit,
  "break-even-yield-calculator": breakEvenYield,
  "grain-storage-cost-calculator": grainStorage,
  "grain-marketing-basis-calculator": basis,
  "hog-feed-cost-calculator": hogFeed,
  "lamb-weaning-weight-calculator": lambWean,
  "goat-feed-amount-calculator": goatFeed,
  "dairy-cow-feed-intake-calculator": dairyIntake,
  "calf-milk-replacer-calculator": calfMilk,
  "cattle-hanging-weight-calculator": hangingBeef,
  "beef-yield-from-live-weight-calculator": beefYield,
  "pig-hanging-weight-calculator": hangingPig,
  "freezer-beef-cost-per-pound-calculator": freezerBeef,
  "turkey-raising-cost-calculator": turkeyCost,
  "duck-egg-production-calculator": duckEggs,
  "quail-egg-production-calculator": quailEggs,
  "rabbit-meat-production-calculator": rabbitMeat,
  "fish-farm-stocking-density-calculator": fishDensity,
  "mushroom-farm-yield-calculator": mushroomYield,
  "microgreens-profit-calculator": microgreens,
  "hemp-yield-per-acre-calculator": hempYield,
  "maple-syrup-sap-to-syrup-calculator": mapleSyrup,
  "christmas-tree-farm-profit-calculator": xmasTree,
  "farm-equipment-depreciation-calculator": farmDepreciation,
  "custom-farming-rates-calculator": customRates,
  "grain-truck-bushels-calculator": truckBushels,
  "bushels-to-tons-calculator": buToTons,
  "hay-price-per-ton-calculator": hayPrice,
  "round-bale-vs-square-bale-cost-calculator": roundVsSquare,
  "pasture-rotation-days-calculator": rotation,
  "livestock-water-tank-days-calculator": tankDays,
  "barn-size-for-animals-calculator": barnSize,
  "horse-stall-size-calculator": horseStall,
  "bee-colony-feeding-sugar-syrup-calculator": beeSyrup,
  "beehives-per-acre-pollination-calculator": pollination,
};
