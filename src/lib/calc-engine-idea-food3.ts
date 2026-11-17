/**
 * Idea build, batch food3 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Food > Diet & Meal Planning (15) + Food Costs (9) = 24 tools.
 * Energy: Mifflin-St Jeor BMR × activity factor. Nutrient references: WHO free sugars < 10% of energy (ideally < 5%); AHA added sugar
 * ≤ 36 g men / 25 g women; sodium < 2,300 mg (US Dietary Guidelines), WHO < 2,000 mg, AHA ideal 1,500 mg; salt = sodium × 2.54;
 * EPA+DHA 250–500 mg a day; ALA adequate intake 1.6 g men / 1.1 g women; iron RDA (NIH ODS) 8 mg men & women 51+, 18 mg women 19–50,
 * 27 mg pregnancy, vegetarians × 1.8; calcium RDA 1,000 mg (19–50, men to 70), 1,200 mg (women 51+, everyone 71+), 1,300 mg (9–18).
 * Zone block = 7 g protein + 9 g carbohydrate + 1.5 g fat. Carb choice = 15 g carbohydrate. DASH servings: NHLBI eating plan.
 * Leucine ≈ 2.5–3 g per meal to maximise muscle protein synthesis.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 0) => `${(x * 100).toFixed(dp)}%`;
const g = (x: number, dp = 0) => `${nfmt(x, dp)} g`;
const kc = (x: number) => `${nfmt(Math.round(x / 10) * 10, 0)} kcal`;
const ACT = [1.2, 1.375, 1.55, 1.725, 1.9];
const body = (v: Record<string, number>) => {
  const m = pick(v.sx, 2) === 0, kg = need(p(v, "kg", 75), "Enter your weight (kg)."), cm = need(p(v, "cm", 175), "Enter your height (cm)."), age = need(p(v, "age", 35), "Enter your age."), act = ACT[pick(v.act, 5)];
  const bmr = 10 * kg + 6.25 * cm - 5 * age + (m ? 5 : -161);
  return { m, kg, bmr, tdee: bmr * act };
};
const macro = (kcal: number, pP: number, cP: number, fP: number) => `Protein ${g((kcal * pP) / 4)} · carbs ${g((kcal * cP) / 4)} · fat ${g((kcal * fP) / 9)}`;

// ---- Diet & meal planning ----
export const omad: Calc = (v) => {
  const b = body(v), def = p(v, "d", 400), kcal = Math.max(b.m ? 1500 : 1200, b.tdee - def), prot = Math.max(b.kg * 1.6, (kcal * 0.3) / 4);
  return { kcal: `${kc(kcal)} in your one meal`, mac: `Protein ${g(prot)} · carbs ${g((kcal - prot * 4 - kcal * 0.3) / 4)} · fat ${g((kcal * 0.3) / 9)}`, note: `Maintenance ≈ ${kc(b.tdee)} · eating ${nfmt(prot, 0)} g protein in one sitting is hard — prioritise it first${kcal === (b.m ? 1500 : 1200) ? " · floored at a safe minimum" : ""}` };
};
export const refeed: Calc = (v) => {
  const b = body(v), up = p(v, "u", 15) / 100, kcal = b.tdee * (1 + up), prot = b.kg * 1.8, fat = b.kg * 0.6, carb = (kcal - prot * 4 - fat * 9) / 4;
  return { kcal: `${kc(kcal)} on refeed day (${pc(up)} above maintenance ${kc(b.tdee)})`, mac: `Carbs ${g(carb)} · protein ${g(prot)} · fat ${g(fat)} (keep fat low)`, note: "Usually 1 day every 1–2 weeks during a long diet · expect a temporary water-weight bump from glycogen" };
};
export const dietBreak: Calc = (v) => {
  const b = body(v), w = Math.max(1, Math.round(p(v, "w", 2)));
  return { kcal: `${kc(b.tdee)} a day for ${w} week${w > 1 ? "s" : ""} (maintenance at your current weight)`, mac: macro(b.tdee, 0.25, 0.45, 0.3), note: "A 1–2 week break every 8–12 weeks of dieting can ease hunger and fatigue · weigh daily and expect +0.5–1.5 kg of water/glycogen" };
};
export const sugarLimit: Calc = (v) => {
  const kcal = need(p(v, "k", 2000), "Enter daily calories."), m = pick(v.sx, 2) === 0, eaten = p(v, "e", 0);
  const who10 = (kcal * 0.1) / 4, who5 = (kcal * 0.05) / 4, aha = m ? 36 : 25;
  return { lim: `${g(who10)} free sugars max (WHO 10% of energy) · ${g(who5)} ideal (5%)`, aha: `AHA added-sugar limit: ${g(aha)} (${nfmt(aha / 4, 0)} tsp) for ${m ? "men" : "women"}`, you: eaten > 0 ? `${g(eaten)} eaten = ${pc((eaten * 4) / kcal, 1)} of calories — ${eaten <= aha ? "within" : "over"} the AHA limit` : "1 tsp sugar ≈ 4 g · a 12 oz can of cola has about 39 g" };
};
export const sodiumLimit: Calc = (v) => {
  const eaten = p(v, "e", 3400), unit = pick(v.u, 2);
  const na = unit === 0 ? eaten : (eaten * 1000) / 2.54;
  return { lim: "Limit 2,300 mg sodium a day (US Dietary Guidelines) · WHO under 2,000 mg · AHA ideal 1,500 mg", you: `${nfmt(na, 0)} mg sodium = ${nfmt((na * 2.54) / 1000, 1)} g salt — ${na <= 1500 ? "at the ideal level" : na <= 2300 ? "within the limit" : `${nfmt(na - 2300, 0)} mg over the limit`}`, tip: "1 tsp salt ≈ 2,300 mg sodium · about 70% of sodium comes from packaged and restaurant food" };
};
export const omega3: Calc = (v) => {
  const m = pick(v.sx, 2) === 0, fish = p(v, "f", 1), sup = p(v, "s", 0);
  const fromFish = fish * 1500 / 7, tot = fromFish + sup;
  return { epa: `${nfmt(tot, 0)} mg EPA+DHA a day from ${nfmt(fish, 1)} fatty-fish servings a week${sup ? ` + ${nfmt(sup, 0)} mg supplement` : ""} — target 250–500 mg`, ala: `ALA (plant omega-3) adequate intake: ${m ? "1.6" : "1.1"} g a day — ≈ 1 tbsp ground flaxseed has 2.4 g`, note: tot < 250 ? "Below the general target — 2 servings of fatty fish a week (salmon, sardines, mackerel) meets it" : "Meets the general recommendation for healthy adults" };
};
export const ironIntake: Calc = (v) => {
  const a = p(v, "a", 30), f = pick(v.sx, 2) === 1, preg = pick(v.pg, 2) === 1, veg = pick(v.vg, 2) === 1;
  let rda = a < 9 ? 10 : a < 14 ? 8 : a < 19 ? (f ? 15 : 11) : f && a < 51 ? 18 : 8;
  if (preg) rda = 27;
  const need0 = veg ? rda * 1.8 : rda;
  return { rda: `${nfmt(need0, 1)} mg iron a day${veg ? ` (${rda} mg × 1.8 for vegetarians/vegans)` : ""}`, src: "Heme iron (meat, fish) absorbs best; pair plant iron (beans, lentils, spinach, fortified cereal) with vitamin C", note: "Tea and coffee with meals reduce absorption · upper limit 45 mg a day for adults unless prescribed" };
};
export const calciumIntake: Calc = (v) => {
  const a = p(v, "a", 40), f = pick(v.sx, 2) === 1, eaten = p(v, "e", 600);
  const rda = a < 4 ? 700 : a < 9 ? 1000 : a < 19 ? 1300 : a < 51 ? 1000 : a < 71 ? (f ? 1200 : 1000) : 1200;
  return { rda: `${nfmt(rda, 0)} mg calcium a day`, you: `You get ≈ ${nfmt(eaten, 0)} mg — ${eaten >= rda ? "meets the RDA" : `${nfmt(rda - eaten, 0)} mg short (≈ ${nfmt((rda - eaten) / 300, 1)} cups of milk or fortified soy milk)`}`, note: "1 cup milk or yogurt ≈ 300 mg · absorption is best in doses of 500 mg or less · vitamin D helps absorption" };
};
const LEU: [string, number][] = [["Whey protein", 0.11], ["Milk / casein", 0.095], ["Eggs", 0.086], ["Beef", 0.08], ["Chicken", 0.075], ["Soy protein", 0.08], ["Pea protein", 0.084], ["Wheat / seitan", 0.068]];
export const leucine: Calc = (v) => {
  const s = LEU[pick(v.s, LEU.length)], t = p(v, "t", 2.5), age = p(v, "a", 35), tt = age >= 60 ? Math.max(t, 3) : t;
  return { prot: `${g(tt / s[1])} protein per meal from ${s[0].toLowerCase()}`, how: `${nfmt(tt, 1)} g leucine ÷ ${pc(s[1], 1)} leucine content`, note: age >= 60 ? "Older adults respond less to protein — aim for about 3 g leucine (30–40 g protein) per meal" : "Spread protein over 3–4 meals of 20–40 g to support muscle growth" };
};
export const veganProtein: Calc = (v) => {
  const kg = need(p(v, "kg", 70), "Enter your weight (kg)."), gk = p(v, "gk", 1.2), tot = kg * gk * 1.1;
  const L = tot * 0.4, G = tot * 0.25, S = tot * 0.25, N = tot * 0.1;
  return { tot: `${g(tot)} protein a day (${nfmt(gk, 1)} g/kg + 10% for plant digestibility)`, mix: `Legumes ${g(L)} protein ≈ ${g((L / 9) * 100)} cooked lentils/beans · soy ${g(S)} ≈ ${g((S / 15) * 100)} firm tofu · grains ${g(G)} ≈ ${g((G / 4.4) * 100)} cooked quinoa/whole grains · nuts/seeds ${g(N)} ≈ ${g((N / 20) * 100)}`, note: "Legumes supply lysine and grains supply methionine — you don't need to combine them at every meal, just across the day" };
};
export const paleo: Calc = (v) => {
  const b = body(v), goal = pick(v.gl, 3), kcal = b.tdee * [0.8, 1, 1.1][goal];
  return { kcal: `${kc(kcal)} a day`, mac: macro(kcal, 0.3, 0.3, 0.4), note: "Paleo split ≈ 30% protein, 30% carbs (fruit, vegetables, tubers), 40% fat · no grains, legumes or dairy" };
};
export const zone: Calc = (v) => {
  const lbm = need(p(v, "lbm", 120), "Enter lean body mass (lb)."), af = [0.5, 0.6, 0.7, 0.8, 0.9][pick(v.a, 5)], meals = Math.max(1, Math.round(p(v, "m", 3))), snacks = Math.round(p(v, "s", 2));
  const prot = lbm * af, blocks = Math.round(prot / 7), perMeal = Math.max(1, Math.floor((blocks - snacks) / meals));
  return { b: `${blocks} Zone blocks a day`, mac: `${g(blocks * 7)} protein · ${g(blocks * 9)} carbs · ${g(blocks * 1.5, 1)} fat (≈ ${kc(blocks * 91)} at about 91 kcal per block)`, split: `${perMeal} blocks per meal × ${meals} + ${snacks} one-block snacks (${blocks - perMeal * meals - snacks >= 0 ? blocks - perMeal * meals - snacks : 0} spare)` };
};
const DASH: Record<number, string[]> = { 0: ["6", "3–4", "4", "2–3", "≤ 3–4 oz", "3 a week", "2", "≤ 3 a week"], 1: ["6–8", "4–5", "4–5", "2–3", "≤ 6 oz", "4–5 a week", "2–3", "≤ 5 a week"], 2: ["10–11", "5–6", "5–6", "3", "≤ 6 oz", "1 a day", "3", "≤ 2 a day"], 3: ["12–13", "6", "6", "3–4", "6–9 oz", "1 a day", "4", "≤ 2 a day"] };
export const dash: Calc = (v) => {
  const lvl = pick(v.k, 4), d = DASH[lvl];
  return { serv: `Grains ${d[0]} · vegetables ${d[1]} · fruit ${d[2]} · low-fat dairy ${d[3]} servings a day`, more: `Lean meat, poultry, fish ${d[4]} a day · nuts, seeds, legumes ${d[5]} · fats & oils ${d[6]} a day · sweets ${d[7]}`, note: `${["1,600", "2,000", "2,600", "3,100"][lvl]} kcal plan · sodium 2,300 mg a day (1,500 mg for a bigger blood-pressure benefit)` };
};
export const carbExchange: Calc = (v) => {
  const c = p(v, "c", 45), m = Math.max(1, Math.round(p(v, "m", 3))), sn = p(v, "sn", 15);
  return { ch: `${nfmt(c / 15, 1)} carb choices per meal (${g(c)} carbs)`, day: `${g(c * m + sn)} a day = ${nfmt((c * m + sn) / 15, 1)} choices (${m} meals + ${g(sn)} snacks)`, note: "1 carb choice = 15 g carbohydrate (1 slice bread, ⅓ cup rice, 1 small fruit) · many adults use 45–60 g per meal — follow your diabetes care team's plan" };
};
export const mealPrep: Calc = (v) => {
  const w = need(p(v, "w", 2400), "Enter total cooked weight (g)."), n = need(p(v, "n", 6), "Enter number of containers."), kcal = p(v, "k", 3600), pr = p(v, "pr", 240), cb = p(v, "cb", 300), ft = p(v, "ft", 120), cost = p(v, "c", 0);
  return { por: `${g(w / n)} per container`, mac: `${kc(kcal / n)} · protein ${g(pr / n)} · carbs ${g(cb / n)} · fat ${g(ft / n)} each`, cost: cost > 0 ? `${money(cost / n)} per meal` : "Refrigerate up to 3–4 days; freeze the rest" };
};

// ---- Food costs ----
export const primeCost: Calc = (v) => {
  const s = need(p(v, "s", 80000), "Enter sales."), c = p(v, "c", 24000), l = p(v, "l", 25000), t = p(v, "t", 4000);
  const pcst = c + l + t, r = pcst / s;
  return { pc: `${money(pcst, "$", 0)} prime cost = ${pc(r, 1)} of sales`, parts: `Food & beverage cost ${pc(c / s, 1)} · labour incl. taxes & benefits ${pc((l + t) / s, 1)}`, read: r <= 0.6 ? "Healthy — at or under the 60% benchmark" : r <= 0.65 ? "Acceptable for full-service (60–65%)" : "High — over 65% leaves little for rent and profit" };
};
export const tableTurn: Calc = (v) => {
  const parties = p(v, "p", 120), tables = need(p(v, "t", 25), "Enter number of tables."), hrs = need(p(v, "h", 4), "Enter shift length (hours)."), chk = p(v, "c", 70);
  const turns = parties / tables, mins = (hrs * 60) / Math.max(turns, 0.01);
  return { t: `${nfmt(turns, 2)} table turns per shift`, time: `Average table time ≈ ${nfmt(mins, 0)} minutes`, rev: `Sales ≈ ${money(parties * chk, "$", 0)} · one extra turn adds ${money(tables * chk, "$", 0)}` };
};
export const revpash: Calc = (v) => {
  const r = need(p(v, "r", 12000), "Enter revenue for the period."), s = need(p(v, "s", 80), "Enter seats."), h = need(p(v, "h", 10), "Enter open hours.");
  const x = r / (s * h);
  return { x: `${money(x)} RevPASH`, how: `${money(r, "$", 0)} ÷ (${nfmt(s)} seats × ${nfmt(h)} hours)`, tip: "Raise RevPASH with faster turns in peak hours, higher check averages, or smaller tables matching party sizes" };
};
export const kegProfit: Calc = (v) => {
  const k = [15.5, 7.75, 5.16, 13.2][pick(v.k, 4)], pour = need(p(v, "o", 16), "Enter pour size (oz)."), price = p(v, "p", 7), cost = p(v, "c", 180), loss = p(v, "l", 8) / 100;
  const pours = (k * 128 * (1 - loss)) / pour, rev = pours * price, prof = rev - cost;
  return { prof: `${money(prof, "$", 0)} profit per keg`, pours: `${nfmt(pours, 0)} pours of ${nfmt(pour, 0)} oz (after ${pc(loss)} foam and waste) · revenue ${money(rev, "$", 0)}`, cost: `Pour cost ${pc(cost / Math.max(rev, 1), 1)} · ${money(cost / pours)} per pour` };
};
export const foodTruck: Calc = (v) => {
  const d = p(v, "d", 20), cust = p(v, "cu", 120), tk = p(v, "t", 14), cogs = p(v, "cg", 30) / 100, lab = p(v, "l", 6000), fuel = p(v, "f", 900), com = p(v, "cm", 800), oth = p(v, "o", 1200), fee = p(v, "fe", 3) / 100;
  const rev = d * cust * tk, prof = rev * (1 - cogs - fee) - lab - fuel - com - oth;
  return { prof: `${money(prof, "$", 0)} profit a month (${pc(prof / Math.max(rev, 1), 1)} margin)`, rev: `Revenue ${money(rev, "$", 0)} from ${nfmt(d * cust, 0)} orders · food cost ${money(rev * cogs, "$", 0)}`, be: `Break-even ≈ ${nfmt((lab + fuel + com + oth) / (tk * (1 - cogs - fee)) / Math.max(d, 1), 0)} customers a day` };
};
export const yieldPct: Calc = (v) => {
  const ap = need(p(v, "ap", 10), "Enter as-purchased weight."), ep = p(v, "ep", 7.2), c = p(v, "c", 4.5), need0 = p(v, "n", 0);
  const y = ep / ap;
  return { y: `${pc(y, 1)} yield`, cost: `Edible-portion cost ${money(c / Math.max(y, 0.0001))} per unit (vs ${money(c)} as purchased)`, buy: need0 > 0 ? `To get ${nfmt(need0, 2)} usable, buy ${nfmt(need0 / y, 2)}` : `Trim and waste ${nfmt(ap - ep, 2)} (${pc(1 - y, 1)})` };
};
export const tipPool: Calc = (v) => {
  const pool = need(p(v, "p", 1200), "Enter the total tip pool."), roles: [string, number, number][] = [["Servers", p(v, "h1", 60), p(v, "w1", 1)], ["Bartenders", p(v, "h2", 25), p(v, "w2", 1)], ["Bussers / runners", p(v, "h3", 30), p(v, "w3", 0.5)], ["Hosts", p(v, "h4", 15), p(v, "w4", 0.3)]];
  const pts = roles.reduce((s, [, h, w]) => s + h * w, 0); if (!pts) throw new InputError("Enter hours for at least one role.");
  const per = pool / pts;
  return { rate: `${money(per)} per weighted hour`, split: roles.filter(([, h]) => h > 0).map(([n, h, w]) => `${n} ${money(h * w * per, "$", 0)} (${money(w * per)}/h)`).join(" · "), note: "US rule: managers and supervisors can't share in the tip pool (FLSA)" };
};
export const deliveryApp: Calc = (v) => {
  const o = need(p(v, "o", 35), "Enter average order value."), c = p(v, "c", 25) / 100, f = p(v, "f", 3) / 100, pr = p(v, "pr", 0), fc = p(v, "fc", 30) / 100, pk = p(v, "pk", 1);
  const fees = o * (c + f) + pr, net = o - fees, prof = net - o * fc - pk;
  return { net: `${money(net)} kept per order (${pc(net / o, 1)})`, fees: `App commission and fees ${money(fees)} · food ${money(o * fc)} · packaging ${money(pk)}`, mk: `Profit before labour and rent ${money(prof)} · a ${pc(c / (1 - c - f), 0)} menu markup on the app offsets the commission` };
};
export const cottage: Calc = (v) => {
  const u = p(v, "u", 200), pr = p(v, "p", 12), ing = p(v, "i", 3.5), pk = p(v, "pk", 0.8), fees = p(v, "f", 150), mk = p(v, "m", 120), hrs = p(v, "h", 40);
  const rev = u * pr, prof = rev - u * (ing + pk) - fees - mk;
  return { prof: `${money(prof, "$", 0)} profit a month`, unit: `${money(pr - ing - pk)} margin per item · revenue ${money(rev, "$", 0)}`, hr: hrs > 0 ? `${money(prof / hrs)} per hour of your time · check your state's cottage food sales cap and labelling rules` : "Check your state's cottage food sales cap and labelling rules" };
};

// ---- registry (generated)
export const ideaFood3CustomCalculators: Record<string, Calc> = {
  "omad-calorie-plan-calculator": omad,
  "refeed-day-calories-calculator": refeed,
  "diet-break-calories-calculator": dietBreak,
  "sugar-intake-limit-calculator": sugarLimit,
  "sodium-intake-limit-calculator": sodiumLimit,
  "omega-3-intake-calculator": omega3,
  "iron-intake-calculator": ironIntake,
  "calcium-intake-calculator": calciumIntake,
  "leucine-threshold-calculator": leucine,
  "vegan-protein-combination-calculator": veganProtein,
  "paleo-macro-calculator": paleo,
  "zone-diet-blocks-calculator": zone,
  "dash-diet-servings-calculator": dash,
  "diabetic-carb-exchange-calculator": carbExchange,
  "meal-prep-portion-calculator": mealPrep,
  "prime-cost-restaurant-calculator": primeCost,
  "restaurant-table-turnover-calculator": tableTurn,
  "revenue-per-available-seat-hour-calculator": revpash,
  "beer-keg-profit-calculator": kegProfit,
  "food-truck-profit-calculator": foodTruck,
  "yield-percentage-food-prep-calculator": yieldPct,
  "restaurant-tip-pool-split-calculator": tipPool,
  "delivery-app-commission-cost-calculator": deliveryApp,
  "cottage-food-business-profit-calculator": cottage,
};
