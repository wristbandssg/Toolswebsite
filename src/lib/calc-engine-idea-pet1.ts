/**
 * Idea build, batch pet1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Pets > Aquarium, Reptile & Small Pet (20),
 * Pet Age, Growth & Breeding (9), Pet Food, Care & Cost (12) = 41 tools.
 * Guidelines used (all shown as editable rules of thumb): 1 inch of adult fish per gallon; filter turnover 4–10× per hour; CO₂ (ppm) =
 * 3 × dKH × 10^(7 − pH); EI-style ppm from salt fractions (KNO₃ NO₃ 61.3%, KH₂PO₄ PO₄ 69.8%, K₂SO₄ K 44.9%, MgSO₄·7H₂O Mg 9.86%);
 * reef dosing chemistry (NaHCO₃ 0.030 g/L per dKH, CaCl₂·2H₂O 3.67 mg/L per ppm Ca, MgCl₂·6H₂O 8.37 mg/L per ppm Mg); 35 ppt ≈ SG 1.0264;
 * House Rabbit Society diet (pellets ¼ cup per 5 lb, greens ≥ 1 packed cup per 2 lb, unlimited hay); RWAF 3 × 2 × 1 m rabbit space;
 * Humane Society guinea-pig minimum 7.5 ft² (10.5 ft² recommended for two); hamster 450 in² minimum / 775 in² (≈ 100 × 50 cm) recommended;
 * snake prey 10–15% of body weight; gestation: Syrian hamster ~16 d, dwarf 18–21 d, alpaca ~342 d, llama ~350 d; cat oestrus ~7 days
 * recurring every 2–3 weeks in season; tooth-eruption ages from veterinary dental charts. Prices are editable typical US defaults.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, dateIn, dayText } from "./trv-core";
import { fmt } from "./sci-math-core";

const f = (x: number) => fmt(Math.abs(x) < 1e-12 ? 0 : x, 4);
const $ = (x: number) => money(x, "$", 0);
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const Z = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const today = () => Math.floor(Date.now() / 86400000);
const GAL = 3.78541;
const vol = (v: Record<string, number>, k = "g", d = 40) => { const x = P(v, k, d, "Tank volume"); return pick(v.vu, 2) === 0 ? x : x / GAL; };

// ---- Aquarium ----
export const waterChange: Calc = (v) => {
  const g = vol(v), pc = Math.min(100, Z(v, "p", 25)) / 100, n0 = Z(v, "n", 40), tgt = Z(v, "t", 20), wk = Math.max(1, num(v.w, 1));
  const ch = g * pc, weeks = n0 > tgt && pc > 0 ? Math.ceil(Math.log(tgt / n0) / Math.log(1 - pc)) : 0;
  return { v: `Change ${f(ch)} gallons (${f(ch * GAL)} L) — ${f(pc * 100)}%`, n: n0 > tgt ? `Nitrate ${f(n0)} → ${f(n0 * (1 - pc))} ppm after one change · ${weeks} changes to reach ${f(tgt)} ppm` : `Nitrate already at or below ${f(tgt)} ppm`, note: `${f(ch * (52 / wk))} gallons a year at one change every ${f(wk)} week${wk > 1 ? "s" : ""} · match temperature and dechlorinate new water` };
};
export const stocking: Calc = (v) => {
  const g = vol(v), inch = Z(v, "i", 30), filt = Math.max(0.5, num(v.f, 1)), plants = pick(v.p, 2) === 1 ? 1.1 : 1, cap = g * filt * plants;
  return { s: `${f((inch / cap) * 100)}% stocked (${f(inch)} of ~${f(cap)} inches)`, r: inch <= cap ? `Room for about ${f(cap - inch)} more inches of adult fish` : `Over by ${f(inch - cap)} inches — rehome fish, upgrade the filter or the tank`, note: "1 inch of adult fish per gallon is a rough guide for small, slim fish only — big or messy fish (goldfish, cichlids) need far more · check compatibility and adult sizes" };
};
export const filterFlow: Calc = (v) => {
  const g = vol(v), t = [4, 6, 10][pick(v.t, 3)], head = Z(v, "h", 0);
  const gph = g * t;
  return { f: `Filter rated about ${f(gph)} GPH (${f(gph * GAL)} L/h)`, r: `${t}× turnover per hour for ${f(g)} gallons${head ? ` · add ~${f(head * 10)}% for ${f(head)} ft of head on a canister/sump` : ""}`, note: "Rated flow drops with media and head height · planted and betta tanks prefer gentler flow; reef tanks often run 10–20×+ total flow" };
};
export const lighting: Calc = (v) => {
  const g = vol(v), t = pick(v.t, 3), lpg = [10, 25, 45][t], wpg = [1, 2, 3.5][t], eff = P(v, "e", 100, "Fixture efficacy");
  return { l: `Aim for about ${f(g * lpg)} lumens (${f(lpg)} per gallon)`, w: `≈ ${f((g * lpg) / eff)} W of LED at ${f(eff)} lm/W (old ${f(wpg)} W/gal fluorescent rule: ${f(g * wpg)} W)`, note: `${["Fish only / low-light plants", "Medium-light plants", "High-light plants (needs CO₂)"][t]} · run lights 6–8 hours a day to limit algae · PAR is the better measure for plants and corals` };
};
export const co2: Calc = (v) => {
  const kh = P(v, "k", 4, "KH"), ph = num(v.p, 6.8), c = 3 * kh * 10 ** (7 - ph);
  return { c: `CO₂ ≈ ${f(c)} ppm`, r: c < 15 ? "Low — plants may be CO₂-limited" : c <= 35 ? "Good range for planted tanks (≈ 20–30 ppm)" : "High — watch fish for gasping at the surface", note: "CO₂ = 3 × dKH × 10^(7 − pH) · only valid when carbonates are the only buffer · a 4 dKH drop checker turns green at ~30 ppm" };
};
export const ferts: Calc = (v) => {
  const L = vol(v) * GAL, kno3 = Z(v, "n", 2), kh2 = Z(v, "p", 0.5), k2 = Z(v, "k", 1), mg = Z(v, "m", 0);
  const NO3 = (kno3 * 0.613 * 1000) / L, PO4 = (kh2 * 0.698 * 1000) / L, K = ((kno3 * 0.387 + kh2 * 0.287 + k2 * 0.449) * 1000) / L, Mg = (mg * 0.0986 * 1000) / L;
  return { p: `Adds NO₃ ${f(NO3)} ppm · PO₄ ${f(PO4)} ppm · K ${f(K)} ppm${mg ? ` · Mg ${f(Mg)} ppm` : ""}`, d: `Per dose in ${f(L)} L: KNO₃ ${f(kno3)} g, KH₂PO₄ ${f(kh2)} g, K₂SO₄ ${f(k2)} g${mg ? `, MgSO₄·7H₂O ${f(mg)} g` : ""}`, note: "Estimative Index targets roughly NO₃ 5–30, PO₄ 1–3, K 10–30 ppm a week with a 50% weekly water change · dose to your plants and test" };
};
export const salinity: Calc = (v) => {
  const m = pick(v.m, 2), x = P(v, "x", m === 0 ? 1.025 : 35, "Value"), L = vol(v) * GAL;
  const ppt = m === 0 ? ((x - 1) / 0.0264) * 35 : x, sg = 1 + (ppt / 35) * 0.0264, saltKg = (ppt / 1000) * L * 1.025;
  return { s: `${f(ppt)} ppt ≈ SG ${sg.toFixed(4)} (at 25 °C)`, r: ppt >= 33 && ppt <= 36 ? "In the usual reef range (35 ppt / SG 1.026)" : ppt < 33 ? "Low for a reef tank" : "High — top up with fresh RO/DI water", note: `About ${f(saltKg)} kg of salt mix for ${f(L)} L at this salinity · approximate SG–ppt conversion; calibrate refractometers with 35 ppt fluid` };
};
const reefDose = (name: string, unit: string, perL: number, salt: string, safe: string): Calc => (v) => {
  const L = vol(v) * GAL, cur = num(v.c, name === "alk" ? 7 : name === "ca" ? 380 : 1250), tgt = num(v.t, name === "alk" ? 8.5 : name === "ca" ? 430 : 1350), d = Math.max(1, num(v.d, 3));
  if (tgt <= cur) return { d: "Already at or above target", s: "No dose needed", note: safe };
  const g = (tgt - cur) * L * perL;
  return { d: `Add ${f(g)} g of ${salt} in total`, s: `Raises ${unit} by ${f(tgt - cur)} · split over ${f(d)} days: ${f(g / d)} g per day`, note: safe };
};
export const reefAlk = reefDose("alk", "dKH", 0.03, "baking soda (NaHCO₃)", "Raise alkalinity by no more than ~1 dKH per day · baked soda (Na₂CO₃) is stronger — use 0.019 g/L per dKH · dissolve in RO water and dose slowly into high flow");
export const reefCa = reefDose("ca", "ppm Ca", 0.00367, "calcium chloride dihydrate (CaCl₂·2H₂O)", "Raise calcium by no more than ~20 ppm a day · keep alkalinity in balance · target ≈ 400–450 ppm");
export const reefMg = reefDose("mg", "ppm Mg", 0.00837, "magnesium chloride hexahydrate (MgCl₂·6H₂O)", "Raise magnesium by no more than ~100 ppm a day · many reefers mix MgCl₂ with MgSO₄ to avoid sulfate depletion · target ≈ 1,300–1,400 ppm");
export const aquaPower: Calc = (v) => {
  const items: [string, number, number][] = [["heater", Z(v, "h", 150), Z(v, "hh", 8)], ["filter", Z(v, "f", 15), 24], ["lights", Z(v, "l", 40), Z(v, "lh", 8)], ["pumps & other", Z(v, "p", 10), 24]], rate = Z(v, "r", 0.17);
  const kwh = items.reduce((s, [, w, h]) => s + (w * h * 365) / 1000, 0);
  return { c: `${$(kwh * rate)} a year (${money((kwh * rate) / 12, "$", 2)} a month)`, k: `${f(kwh)} kWh a year: ${items.map(([n, w, h]) => `${n} ${f((w * h * 365) / 1000)}`).join(" · ")}`, note: "Heaters run only part of the time — enter average hours on (more in cold rooms) · a lid cuts heater use a lot" };
};
// ---- Reptiles ----
const ENCL = [["Leopard gecko", 36, 18, 18], ["Crested gecko", 18, 18, 24], ["Bearded dragon", 48, 24, 24], ["Blue-tongued skink", 48, 24, 24], ["Ball python", 48, 24, 24], ["Corn snake", 48, 24, 24], ["Custom snake (by length)", 0, 0, 0]] as const;
export const reptileEnc: Calc = (v) => {
  const s = pick(v.s, ENCL.length), [name, l0, w0, h0] = ENCL[s], len = Z(v, "l", 48), arb = pick(v.a, 2) === 1;
  const [L, W, H] = l0 ? [l0, w0, h0] : [len, len / 2, arb ? len : len / 2], gal = (L * W * H) / 231;
  return { e: `${name}: at least ${f(L)} × ${f(W)} × ${f(H)} in (${f(L * 2.54)} × ${f(W * 2.54)} × ${f(H * 2.54)} cm)`, v: `≈ ${f(gal)} gallons of space · floor ${f((L * W) / 144)} ft²`, note: l0 ? "Common modern hobby minimum for one adult — bigger is better, with a heat gradient and hides at both ends" : `Rule of thumb: enclosure length ≥ the snake's length, width and height ≥ half (height ≥ full length for arboreal species)` };
};
export const beardie: Calc = (v) => {
  const m = Z(v, "a", 4), stage = m < 3 ? 0 : m < 6 ? 1 : m < 12 ? 2 : 3, plan = [["2–3 times a day", "25–50", 80], ["1–2 times a day", "25–45", 70], ["once a day", "15–25", 50], ["2–3 times a week", "10–20 per feeding", 20]][stage] as [string, string, number];
  return { f: `Insects ${plan[0]} — about ${plan[1]} (as many as eaten in 10–15 minutes)`, d: `Diet ≈ ${plan[2]}% insects / ${100 - plan[2]}% leafy greens and vegetables`, note: `${f(m)} months old · offer fresh greens daily · dust insects with calcium (most feedings) and a multivitamin (1–2× a week) · insects no bigger than the space between the eyes · guideline only` };
};
export const snakePrey: Calc = (v) => {
  const w = P(v, "w", 1200, "Snake weight"), girth = Z(v, "g", 0), age = pick(v.a, 3);
  return { p: `Prey of about ${f(w * 0.1)}–${f(w * 0.15)} g (10–15% of body weight)`, w: girth ? `No wider than ${f(girth)}–${f(girth * 1.25)} cm (1–1.25× the snake's widest point)` : "Prey should be no wider than the widest part of the snake", note: `Feed every ${["5–7 days (hatchling)", "7–10 days (juvenile)", "10–14 days (adult; large adult pythons 2–4 weeks)"][age]} · weigh monthly and adjust · frozen-thawed prey is safest` };
};
export const leo: Calc = (v) => {
  const L = P(v, "l", 8, "Length (in)"), age = pick(v.a, 3), n = Math.round(L * 2);
  return { f: `About ${n} appropriately sized insects per feeding`, s: `Feed ${["every day (juvenile, under 6 months)", "every other day (6–12 months)", "2–3 times a week (adult)"][age]}`, note: "Rule of thumb: ~2 insects per inch of gecko · insects no longer than the space between the eyes · dust with calcium + D3 and gut-load insects · watch the tail for condition" };
};
export const tortoiseEnc: Calc = (v) => {
  const s = P(v, "s", 8, "Shell length"), a = P(v, "a", 10, "Length multiple"), b = P(v, "b", 5, "Width multiple"), n = Math.max(1, Math.round(num(v.n, 1))), extra = 1 + (n - 1) * 0.5;
  const L = s * a * Math.sqrt(extra), W = s * b * Math.sqrt(extra);
  return { e: `At least ${f(L)} × ${f(W)} in (${f(L * 2.54)} × ${f(W * 2.54)} cm) for ${n} tortoise${n > 1 ? "s" : ""}`, a: `Floor area ${f((L * W) / 144)} ft²`, note: `Rule of thumb ${f(a)}× shell length by ${f(b)}× shell width-equivalent, +50% area per extra tortoise · outdoor pens and tortoise tables beat glass tanks · plan for adult size` };
};
// ---- Small pets ----
export const hamsterCage: Calc = (v) => {
  const L = P(v, "l", 32, "Length"), W = P(v, "w", 17, "Width"), cm = pick(v.u, 2) === 1, a = cm ? (L * W) / 6.4516 : L * W;
  return { a: `${f(a)} in² of floor (${f(a * 6.4516)} cm²)`, r: a >= 775 ? "Meets the 775 in² (≈ 100 × 50 cm) recommendation" : a >= 450 ? "Meets the 450 in² minimum but not the 775 in² recommendation" : "Below the 450 in² minimum — too small", note: "Unbroken floor space counts most · Syrians need a 10–12 in wheel (dwarfs 8 in) and 6+ in of bedding to burrow · most pet-store cages are too small" };
};
export const guineaCage: Calc = (v) => {
  const L = P(v, "l", 30, "Length (in)"), W = P(v, "w", 50, "Width (in)"), n = Math.max(1, Math.round(num(v.n, 2))), a = (L * W) / 144;
  const min = n <= 2 ? 7.5 : n === 3 ? 10.5 : 13, rec = n === 1 ? 7.5 : n === 2 ? 10.5 : n === 3 ? 13 : 13 + (n - 4) * 2.5;
  return { a: `${f(a)} ft² of floor`, r: a >= rec ? `Meets the recommended ${f(rec)} ft² for ${n}` : a >= min ? `Meets the ${f(min)} ft² minimum, below the ${f(rec)} ft² recommendation` : `Too small — at least ${f(min)} ft² for ${n}`, note: "Guinea pigs are social — keep at least two · a 2 × 4 C&C grid cage (≈ 10.5 ft²) suits a pair · Humane Society minimum 7.5 ft²" };
};
export const rabbitSpace: Calc = (v) => {
  const L = P(v, "l", 6, "Length"), W = P(v, "w", 2, "Width"), H = P(v, "h", 2, "Height"), m = pick(v.u, 2) === 0 ? 0.3048 : 1, a = L * W * m * m, ht = H * m;
  return { a: `${f(a)} m² (${f(a / 0.092903)} ft²) of floor, ${f(ht)} m tall`, r: a >= 6 && ht >= 1 ? "Meets the RWAF 3 × 2 × 1 m total-space guideline" : `Below the RWAF guideline of 3 × 2 × 1 m (10 × 6 × 3 ft) total space for a pair — ${f(6 - a)} m² short`, note: "A hutch is only shelter — it should open into a run so rabbits can hop, stand up and run · keep rabbits in pairs" };
};
export const rabbitFood: Calc = (v) => {
  const w = P(v, "w", 5, "Weight"), lb = pick(v.u, 2) === 0 ? w : w * 2.20462, young = pick(v.a, 2) === 0;
  return { p: young ? "Pellets: unlimited alfalfa pellets until ~7 months, then cut back" : `Pellets: about ${f(lb / 20)} cup (≈ ${f((lb / 20) * 140)} g) a day`, g: `Leafy greens: at least ${f(lb / 2)} packed cups a day · hay: unlimited (about a body-sized pile)`, note: "House Rabbit Society guideline: ¼ cup pellets per 5 lb, ≥ 1 packed cup greens per 2 lb · treats (fruit) ≤ 1–2 tbsp per 5 lb · fresh water always" };
};
// ---- Age, growth & breeding ----
export const catHeat: Calc = (v) => {
  const s = dateIn(v, "d", today()), len = P(v, "l", 7, "Heat length"), gap = P(v, "g", 14, "Gap"), n = 4, cyc: string[] = [];
  for (let i = 0; i < n; i++) { const a = s + i * (len + gap); cyc.push(`${dayText(a)} – ${dayText(a + len - 1)}`); }
  return { n: `Next heat ≈ ${dayText(s + len + gap)}`, c: `Projected heats: ${cyc.join(" · ")}`, note: "Cats are induced ovulators: unmated queens usually cycle every 2–3 weeks through the breeding season (longer days) · heat lasts ~7 days (2–19) · spaying stops cycles" };
};
export const weaning: Calc = (v) => {
  const b = dateIn(v, "d", today() - 14), plan = [[21, "Start offering a gruel of puppy food soaked in water or milk replacer"], [28, "Gruel 3–4 times a day; mother nurses less"], [35, "Thicker mash; puppies eat more solids"], [42, "Mostly solid food, softened"], [49, "Dry or lightly moistened puppy food; nursing nearly stopped"], [56, "Fully weaned — earliest age to go to new homes (8 weeks)"]] as const;
  const next = plan.find(([d]) => b + d >= today());
  return { s: plan.map(([d, t]) => `${dayText(b + d)} (wk ${d / 7}): ${t}`).join(" · "), n: next ? `Next step ${dayText(b + next[0])}` : "Weaning should be complete", note: "Typical timeline — large litters, small breeds and weak puppies may need longer · ask your vet about deworming (from 2 weeks) and first vaccines (6–8 weeks)" };
};
const teeth = (kind: "kitten" | "puppy"): Calc => (v) => {
  const s = pick(v.s, 7);
  const K = [["No teeth yet", "Under 2 weeks"], ["Baby incisors coming in", "2–3 weeks"], ["Baby canines visible", "3–4 weeks"], ["Baby premolars coming in", "4–6 weeks"], ["All 26 baby teeth", "6 weeks – 3 months"], ["Adult incisors replacing baby ones", "3½–4 months"], ["Adult canines and molars in", "5–7 months (30 adult teeth by ~7 months)"]];
  const Pp = [["No teeth yet", "Under 3 weeks"], ["Baby incisors coming in", "3–4 weeks"], ["Baby canines visible", "3–5 weeks"], ["Baby premolars coming in", "4–6 weeks"], ["All 28 baby teeth", "6–8 weeks to 3 months"], ["Adult incisors replacing baby ones", "3–5 months"], ["Adult canines and molars in", "4–7 months (42 adult teeth by ~7 months)"]];
  const [desc, age] = (kind === "kitten" ? K : Pp)[s];
  return { a: `Estimated age: ${age}`, d: desc, note: `Based on typical ${kind === "kitten" ? "feline" : "canine"} tooth-eruption ages — breed and individual variation is normal · a vet can estimate more precisely` };
};
export const kittenTeeth = teeth("kitten");
export const puppyTeeth = teeth("puppy");
const gest = (days: number, lo: number, hi: number, name: string, tip: string): Calc => (v) => {
  const d = dateIn(v, "d", today()), dd = Math.round(num(v.g, days)) || days, due = d + dd;
  return { d: `Due ≈ ${dayText(due)}`, r: `Window ${dayText(d + lo)} – ${dayText(d + hi)} · ${due >= today() ? `${due - today()} days to go` : "past due"}`, note: `${name}: ~${dd} days (range ${lo}–${hi}) · ${tip}` };
};
export const hamsterGest: Calc = (v) => { const t = pick(v.t, 3), d = [16, 20, 21][t], lo = [15, 18, 19][t], hi = [18, 21, 22][t]; return gest(d, lo, hi, ["Syrian hamster", "Dwarf hamster (Campbell/winter white)", "Roborovski hamster"][t], "Don't disturb the nest for 10–14 days after birth; separate the male")({ ...v, g: num(v.g, 0) || d }); };
export const alpacaGest = gest(342, 335, 360, "Alpaca", "Most crias arrive in daylight; females are usually re-bred 2–3 weeks after birthing");
export const llamaGest = gest(350, 330, 360, "Llama", "Watch for udder fill and restlessness in the last 2–3 weeks");
export const breedBiz: Calc = (v) => {
  const l = Z(v, "l", 2), pups = Z(v, "p", 6), price = Z(v, "s", 1500), sold = Math.min(100, Z(v, "x", 85)) / 100, cpl = Z(v, "c", 3500), fixed = Z(v, "f", 6000);
  const rev = l * pups * sold * price, cost = l * cpl + fixed, pr = rev - cost;
  return { p: `${$(pr)} a year ${pr >= 0 ? "profit" : "loss"}`, d: `Revenue ${$(rev)} (${f(l * pups * sold)} sold) − litter costs ${$(l * cpl)} − fixed ${$(fixed)}`, note: `Break-even price ${$(cost / Math.max(1, l * pups * sold))} per animal · litter costs: stud fee, health testing, vet, C-sections, food, vaccines, registration · check local licensing laws` };
};
export const studFee: Calc = (v) => {
  const fee = Z(v, "f", 1500), n = Z(v, "n", 6), price = Z(v, "p", 1800), pick0 = pick(v.k, 2) === 1, costs = Z(v, "c", 2500);
  const rev = pick0 ? (n - 1) * price : n * price, net = rev - (pick0 ? 0 : fee) - costs;
  return { n: `Dam owner nets ≈ ${$(net)} from the litter`, d: `${pick0 ? `Pick-of-litter instead of a ${$(fee)} fee (worth ~${$(price)})` : `Stud fee ${$(fee)}`} · ${f(pick0 ? n - 1 : n)} puppies sold at ${$(price)} · other costs ${$(costs)}`, note: `Stud fee = ${f((fee / Math.max(1, price)) * 100)}% of one puppy's price · many contracts guarantee a repeat breeding if no pregnancy` };
};
// ---- Food, care & cost ----
export const wetDry: Calc = (v) => {
  const kcal = P(v, "k", 250, "Daily calories"), wc = P(v, "a", 1.5, "Wet can price"), wk = P(v, "b", 85, "kcal per can"), db = P(v, "c", 25, "Dry bag price"), dkg = P(v, "d", 3.6, "Bag kcal (thousands)"), mix = Math.min(100, Z(v, "m", 0)) / 100;
  const wet = (kcal / wk) * wc, dry = (kcal / (dkg * 1000)) * db, both = wet * mix + dry * (1 - mix);
  return { c: `Wet ${$(wet * 365)}/yr · dry ${$(dry * 365)}/yr${mix ? ` · your ${f(mix * 100)}% wet mix ${$(both * 365)}/yr` : ""}`, d: `Per day: wet ${money(wet, "$", 2)}, dry ${money(dry, "$", 2)} for ${f(kcal)} kcal`, note: "Compare by calories, not weight · wet food adds water to the diet, which many vets like for cats · a typical 4 kg adult indoor cat needs ~200–250 kcal/day" };
};
export const litterCost: Calc = (v) => {
  const n = Math.max(1, Math.round(num(v.n, 1))), lbm = P(v, "l", 20, "Litter per cat per month (lb)"), price = P(v, "p", 0.6, "Price per lb"), liners = Z(v, "x", 0);
  const yr = n * lbm * 12 * price + liners * 12;
  return { c: `${$(yr)} a year (${money(yr / 12, "$", 2)} a month)`, a: `${f(n * lbm * 12)} lb of litter a year for ${n} cat${n > 1 ? "s" : ""}`, note: "Clumping clay is cheapest per lb; pine, wheat and silica cost more but weigh less · one box per cat plus one" };
};
export const grooming: Calc = (v) => {
  const s = pick(v.s, 4), base = [50, 70, 95, 130][s], n = Math.max(1, num(v.n, 6)), tip = Z(v, "t", 15) / 100, add = Z(v, "a", 0), diy = Z(v, "d", 150);
  const per = (base + add) * (1 + tip), yr = per * n;
  return { c: `${$(yr)} a year (${$(per)} a visit incl. tip)`, d: `${["Small", "Medium", "Large", "Giant"][s]} dog full groom ≈ ${$(base)} × ${f(n)} visits${add ? ` + ${$(add)} extras` : ""}`, note: `DIY clippers and tools ≈ ${$(diy)} up front · typical US prices — doodles, matted coats and mobile groomers cost more` };
};
const careCost = (label: string, unitLabel: string, note: string): Calc => (v) => {
  const rate = P(v, "r", 50, "Rate"), n = Z(v, "n", 10), dogs = Math.max(1, Math.round(num(v.d, 1))), multi = Z(v, "m", 25) / 100, extra = Z(v, "x", 0);
  const per = rate * (1 + (dogs - 1) * (1 - multi)), tot = per * n + extra;
  return { c: `${$(tot)} total`, d: `${f(n)} ${unitLabel} × ${$(per)}${dogs > 1 ? ` for ${dogs} dogs (${f(multi * 100)}% multi-dog discount)` : ""}${extra ? ` + ${$(extra)} extras` : ""}`, note: `${label} · ${note}` };
};
export const boarding = careCost("Boarding kennel", "nights", "US kennels often charge $40–$75 a night; holidays cost more · ask about vaccine requirements (rabies, DHPP, Bordetella)");
export const daycare = careCost("Doggy daycare", "days", "Typical US day rates $25–$45; packages of 10–20 days and monthly plans cut the per-day price");
export const training: Calc = (v) => {
  const g = Z(v, "g", 6), gp = Z(v, "a", 30), p = Z(v, "p", 3), pp = Z(v, "b", 100), bt = Z(v, "c", 0), extra = Z(v, "x", 50);
  const tot = g * gp + p * pp + bt + extra;
  return { c: `${$(tot)} total training cost`, d: `Group classes ${f(g)} × ${$(gp)} · private ${f(p)} × ${$(pp)}${bt ? ` · board-and-train ${$(bt)}` : ""} · supplies ${$(extra)}`, note: "Group classes are the cheapest way to start · look for force-free certified trainers (CPDT-KA, KPA) · board-and-train often runs $1,500–$4,000+" };
};
export const vetYear: Calc = (v) => {
  const items: [string, number][] = [["exam", Z(v, "e", 70)], ["vaccines", Z(v, "v", 100)], ["parasite prevention", Z(v, "p", 300)], ["dental cleaning", Z(v, "d", 0)], ["lab work", Z(v, "l", 0)], ["emergency fund", Z(v, "x", 300)], ["insurance", Z(v, "i", 0) * 12]];
  const tot = items.reduce((s, [, x]) => s + x, 0);
  return { c: `${$(tot)} a year (${$(tot / 12)} a month)`, d: items.filter(([, x]) => x > 0).map(([n, x]) => `${n} ${$(x)}`).join(" · "), note: "Typical US routine-care costs — senior pets and large breeds cost more · an emergency visit can be $1,000–$5,000, so keep a fund or insurance" };
};
export const spay: Calc = (v) => {
  const sp = pick(v.s, 2), sx = pick(v.x, 2), cl = pick(v.c, 3), w = Z(v, "w", 40);
  const base = sp === 0 ? (sx === 0 ? 300 : 200) : sx === 0 ? 150 : 100, mult = [1, 0.35, 2][cl], sz = sp === 0 && w > 50 ? 1.25 : 1, pre = Z(v, "p", 0);
  return { c: `≈ ${$(base * mult * sz + pre)}`, d: `${["Dog", "Cat"][sp]} ${["spay (female)", "neuter (male)"][sx]} at a ${["private vet", "low-cost clinic", "specialty/large-breed hospital"][cl]}${pre ? ` + ${$(pre)} pre-op bloodwork` : ""}`, note: "Rough US averages — prices vary widely by region, size and whether the pet is in heat or pregnant · many shelters and nonprofits offer vouchers" };
};
export const vaxCost: Calc = (v) => {
  const sp = pick(v.s, 2), puppy = pick(v.a, 2) === 0, core = Z(v, "c", 30), rab = Z(v, "r", 25), non = Z(v, "n", 30), exam = Z(v, "e", 60);
  const shots = sp === 0 ? (puppy ? 3 : 1) : puppy ? 3 : 1, nonN = sp === 0 ? (puppy ? 2 : 2) : 1;
  const tot = shots * core + rab + nonN * non + (puppy ? 3 : 1) * exam;
  return { c: `≈ ${$(tot)} ${puppy ? "for the first-year series" : "a year"}`, d: `${shots} core combo shot${shots > 1 ? "s" : ""} (${sp === 0 ? "DHPP" : "FVRCP"}) · rabies · ${nonN} lifestyle vaccine${nonN > 1 ? "s" : ""} (${sp === 0 ? "e.g. Bordetella, leptospirosis" : "e.g. FeLV"}) · ${puppy ? 3 : 1} exam${puppy ? "s" : ""}`, note: `${puppy ? `${sp === 0 ? "Puppies" : "Kittens"} usually get boosters every 3–4 weeks from 6–8 weeks to 16 weeks` : "Adult boosters are often every 1–3 years"} · your vet sets the actual schedule · prices are editable averages` };
};
export const dogBed: Calc = (v) => {
  const L = P(v, "l", 30, "Nose-to-tail length"), H = Z(v, "h", 22), curl = pick(v.c, 2) === 0, add = 8;
  const len = L + add, wid = curl ? len : (H + add) * 0.9 + 6;
  return { b: `Bed at least ${f(len)} × ${f(Math.max(wid, len * 0.7))} in (${f(len * 2.54)} × ${f(Math.max(wid, len * 0.7) * 2.54)} cm)`, s: len <= 24 ? "Small" : len <= 30 ? "Medium" : len <= 36 ? "Large" : len <= 42 ? "X-Large" : "XX-Large / jumbo", note: `${curl ? "Curls up: a round or square bolster bed works" : "Sprawls out: choose a rectangular mattress bed"} · measure nose to base of tail while lying, add 6–12 in · older dogs benefit from orthopaedic foam` };
};
export const collar: Calc = (v) => {
  const n = P(v, "n", 14, "Neck size"), cm = pick(v.u, 2) === 1, w = Z(v, "w", 40), add = cm ? 5 : 2, c = n + add;
  const width = w < 10 ? "⅜–½ in (10–12 mm)" : w < 30 ? "¾ in (20 mm)" : w < 70 ? "1 in (25 mm)" : "1½ in (38 mm)+";
  return { c: `Collar size ≈ ${f(c)} ${cm ? "cm" : "in"} (adjustable ${f(c - add / 2)}–${f(c + add)})`, w: `Suggested width ${width} for a ${f(w)} lb dog`, note: "Neck + 2 in (5 cm) · two fingers should fit under the collar · check puppies' collars weekly as they grow" };
};
export const lifetime: Calc = (v) => {
  const yrs = P(v, "y", 12, "Lifespan"), first = Z(v, "f", 1500), food = Z(v, "a", 600), vet = Z(v, "b", 700), ins = Z(v, "i", 0) * 12, groom = Z(v, "g", 300), board = Z(v, "c", 400), supplies = Z(v, "s", 250), inf = Z(v, "x", 3) / 100;
  let tot = first; for (let k = 0; k < yrs; k++) tot += (food + vet + ins + groom + board + supplies) * (1 + inf) ** k;
  return { c: `≈ ${$(tot)} over ${f(yrs)} years`, y: `${$(food + vet + ins + groom + board + supplies)} a year in today's money + ${$(first)} first-year setup`, note: `Grows ${f(inf * 100)}% a year for inflation · add end-of-life care (often $1,000–$5,000) and any big surgeries` };
};

// ---- registry (generated)
export const ideaPet1CustomCalculators: Record<string, Calc> = {
  "aquarium-water-change-volume-calculator": waterChange,
  "aquarium-fish-stocking-inches-per-gallon-calculator": stocking,
  "aquarium-filter-flow-rate-calculator": filterFlow,
  "aquarium-lighting-watts-per-gallon-calculator": lighting,
  "aquarium-co2-drop-checker-calculator": co2,
  "aquarium-fertilizer-dosing-calculator": ferts,
  "reef-tank-salinity-calculator": salinity,
  "reef-alkalinity-dosing-calculator": reefAlk,
  "reef-calcium-dosing-calculator": reefCa,
  "reef-magnesium-dosing-calculator": reefMg,
  "aquarium-electricity-cost-calculator": aquaPower,
  "reptile-enclosure-size-calculator": reptileEnc,
  "bearded-dragon-feeding-calculator": beardie,
  "snake-feeding-prey-size-calculator": snakePrey,
  "leopard-gecko-feeding-calculator": leo,
  "tortoise-enclosure-size-calculator": tortoiseEnc,
  "hamster-cage-size-calculator": hamsterCage,
  "guinea-pig-cage-size-calculator": guineaCage,
  "rabbit-hutch-size-calculator": rabbitSpace,
  "rabbit-food-amount-calculator": rabbitFood,
  "cat-heat-cycle-calculator": catHeat,
  "puppy-weaning-schedule-calculator": weaning,
  "kitten-age-by-teeth-calculator": kittenTeeth,
  "puppy-age-by-teeth-calculator": puppyTeeth,
  "hamster-gestation-calculator": hamsterGest,
  "alpaca-gestation-calculator": alpacaGest,
  "llama-gestation-calculator": llamaGest,
  "breeding-business-profit-calculator": breedBiz,
  "stud-fee-return-calculator": studFee,
  "wet-vs-dry-cat-food-cost-calculator": wetDry,
  "cat-litter-cost-per-year-calculator": litterCost,
  "dog-grooming-cost-calculator": grooming,
  "dog-boarding-cost-calculator": boarding,
  "doggy-daycare-cost-calculator": daycare,
  "dog-training-cost-calculator": training,
  "vet-bills-per-year-calculator": vetYear,
  "spay-neuter-cost-calculator": spay,
  "pet-vaccination-schedule-cost-calculator": vaxCost,
  "dog-bed-size-calculator": dogBed,
  "dog-collar-size-calculator": collar,
  "pet-lifetime-cost-calculator": lifetime,
};
