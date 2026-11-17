/**
 * Idea build, batch food5 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Food > Nutrition & Calories — category tools,
 * protein, nutrient and label tools = 26 tools.
 * Nutrient values are typical figures from USDA FoodData Central (SR Legacy) per stated serving, rows as
 * [label, kcal, protein g, carbs g, fat g, fiber g, sugar g, sodium mg] (same convention as calc-engine-food-nutrition.ts).
 * Potassium and vitamin C serving values follow the NIH Office of Dietary Supplements fact-sheet tables.
 * FDA Daily Values (2,000 kcal): fat 78 g, saturated fat 20 g, cholesterol 300 mg, sodium 2,300 mg, carbohydrate 275 g, fiber 28 g,
 * added sugars 50 g, protein 50 g, vitamin D 20 µg, calcium 1,300 mg, iron 18 mg, potassium 4,700 mg, vitamin C 90 mg.
 * Energy density bands (Rolls): very low < 0.6, low 0.6–1.5, medium 1.5–4, high > 4 kcal per gram.
 */

import { type TrvCalculator as Calc, InputError, num, pick, nfmt } from "./trv-core";

export type Row = [string, number, number, number, number, number, number, number];
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const g1 = (x: number) => `${nfmt(x, x < 10 ? 1 : 0)} g`;
const day = (k: number) => `${nfmt((k / 2000) * 100, 0)}% of a 2,000 kcal day`;

/** Generic single-food calorie tool: pick a food row and how many servings. */
export const foodTool = (rows: Row[]): Calc => (v) => {
  const r = rows[pick(v.f, rows.length)], q = need(p(v, "q", 1), "Enter number of servings."), k = r[1] * q;
  return { kcal: `${nfmt(k, 0)} kcal — ${r[0]}${q !== 1 ? ` × ${nfmt(q, 2)}` : ""}`, mac: `Protein ${g1(r[2] * q)} · carbs ${g1(r[3] * q)} · fat ${g1(r[4] * q)}`, more: `Fiber ${g1(r[5] * q)} · sugar ${g1(r[6] * q)} · sodium ${nfmt(r[7] * q, 0)} mg · ${day(k)}` };
};
/** Protein-focused variant. */
export const proteinTool = (rows: Row[]): Calc => (v) => {
  const r = rows[pick(v.f, rows.length)], q = need(p(v, "q", 1), "Enter number of servings."), pr = r[2] * q, k = r[1] * q, tgt = p(v, "t", 0);
  return { pr: `${g1(pr)} protein — ${r[0]}${q !== 1 ? ` × ${nfmt(q, 2)}` : ""}`, dens: `${nfmt(k, 0)} kcal · ${nfmt(k ? (r[2] * 100) / r[1] : 0, 1)} g protein per 100 kcal · carbs ${g1(r[3] * q)} · fat ${g1(r[4] * q)}`, tgt: tgt > 0 ? `${nfmt((pr / tgt) * 100, 0)}% of your ${nfmt(tgt, 0)} g target — ${nfmt(Math.ceil((tgt / Math.max(r[2], 0.1)) * 10) / 10, 1)} servings to hit it` : "Daily Value for protein is 50 g; active adults often need 1.2–2 g per kg" };
};

// ---- Category tables (per serving) ----
export const ALC: Row[] = [["Regular beer (12 oz)", 153, 1.6, 12.6, 0, 0, 0, 14], ["Light beer (12 oz)", 103, 0.9, 5.8, 0, 0, 0.3, 14], ["Red wine (5 oz)", 125, 0.1, 3.8, 0, 0, 0.9, 6], ["White wine (5 oz)", 121, 0.1, 3.8, 0, 0, 1.4, 7], ["Sparkling wine (4 oz)", 96, 0.3, 1.8, 0, 0, 0.6, 6], ["Vodka, gin, rum or whiskey, 80 proof (1.5 oz)", 97, 0, 0, 0, 0, 0, 0], ["Hard seltzer (12 oz)", 100, 0, 2, 0, 0, 1, 10], ["Hard cider (12 oz)", 190, 0, 21, 0, 0, 20, 10]];
export const FRUIT: Row[] = [["Apple, medium (182 g)", 95, 0.5, 25.1, 0.3, 4.4, 18.9, 2], ["Banana, medium (118 g)", 105, 1.3, 27, 0.4, 3.1, 14.4, 1], ["Orange, medium (131 g)", 62, 1.2, 15.4, 0.2, 3.1, 12.2, 0], ["Pear, medium (178 g)", 101, 0.6, 27.1, 0.3, 5.5, 17.4, 2], ["Strawberries (1 cup, 152 g)", 49, 1, 11.7, 0.5, 3, 7.4, 2], ["Blueberries (1 cup, 148 g)", 84, 1.1, 21.4, 0.5, 3.6, 14.7, 1], ["Grapes (1 cup, 151 g)", 104, 1.1, 27.3, 0.2, 1.4, 23.4, 3], ["Mango (1 cup, 165 g)", 99, 1.4, 24.7, 0.6, 2.6, 22.5, 2], ["Pineapple (1 cup, 165 g)", 82, 0.9, 21.6, 0.2, 2.3, 16.3, 2], ["Watermelon (1 cup, 152 g)", 46, 0.9, 11.5, 0.2, 0.6, 9.4, 2]];
export const NUTS: Row[] = [["Almonds (1 oz, 28 g)", 164, 6, 6.1, 14.2, 3.5, 1.2, 0], ["Walnuts (1 oz)", 185, 4.3, 3.9, 18.5, 1.9, 0.7, 1], ["Cashews (1 oz)", 157, 5.2, 8.6, 12.4, 0.9, 1.7, 3], ["Peanuts (1 oz)", 161, 7.3, 4.6, 14, 2.4, 1.3, 5], ["Pistachios (1 oz)", 159, 5.7, 7.7, 12.8, 3, 2.2, 0], ["Pecans (1 oz)", 196, 2.6, 3.9, 20.4, 2.7, 1.1, 0], ["Macadamia nuts (1 oz)", 204, 2.2, 3.9, 21.5, 2.4, 1.3, 1], ["Hazelnuts (1 oz)", 178, 4.2, 4.7, 17.2, 2.7, 1.2, 0], ["Brazil nuts (1 oz)", 187, 4.1, 3.3, 19, 2.1, 0.7, 1]];
export const CHEESE: Row[] = [["Cheddar (1 oz)", 114, 7, 0.4, 9.4, 0, 0.1, 176], ["Mozzarella, part-skim (1 oz)", 72, 6.9, 0.8, 4.5, 0, 0.3, 175], ["Parmesan, hard (1 oz)", 111, 10.1, 0.9, 7.3, 0, 0.2, 454], ["Swiss (1 oz)", 111, 7.6, 1.5, 8.8, 0, 0.4, 53], ["Feta (1 oz)", 75, 4, 1.2, 6, 0, 1.1, 260], ["Brie (1 oz)", 95, 5.9, 0.1, 7.9, 0, 0.1, 178], ["Goat cheese, soft (1 oz)", 75, 5.3, 0, 6, 0, 0, 130], ["Cream cheese (1 oz)", 99, 1.7, 1.6, 9.8, 0, 0.9, 90]];
export const EGGS: Row[] = [["Large egg, whole (50 g)", 72, 6.3, 0.4, 4.8, 0, 0.2, 71], ["Medium egg (44 g)", 63, 5.5, 0.3, 4.2, 0, 0.2, 62], ["Extra-large egg (56 g)", 80, 7, 0.4, 5.3, 0, 0.2, 79], ["Egg white, large", 17, 3.6, 0.2, 0.1, 0, 0.2, 55], ["Egg yolk, large", 55, 2.7, 0.6, 4.5, 0, 0.1, 8], ["Hard-boiled large egg", 78, 6.3, 0.6, 5.3, 0, 0.6, 62], ["Fried large egg (in butter)", 90, 6.3, 0.4, 6.8, 0, 0.2, 95]];
export const BREAD: Row[] = [["White bread (1 slice, 28 g)", 75, 2.6, 14.1, 0.9, 0.7, 1.5, 135], ["Whole wheat bread (1 slice, 32 g)", 81, 4, 13.8, 1.1, 1.9, 1.4, 146], ["Rye bread (1 slice, 32 g)", 83, 2.7, 15.5, 1.1, 1.9, 1.2, 211], ["Sourdough (1 medium slice, 50 g)", 135, 5.5, 26, 0.9, 1.1, 1.2, 300], ["Pita, white (6.5 in)", 165, 5.5, 33.4, 0.7, 1.3, 0.8, 322], ["English muffin", 134, 4.4, 26.2, 1, 2, 2, 246], ["Hamburger bun", 120, 4, 21, 1.9, 0.9, 3, 206]];
export const CEREAL: Row[] = [["Corn flakes (1 cup, 28 g)", 100, 2, 24, 0.1, 0.8, 3, 200], ["Toasted oat O's (1 cup, 28 g)", 104, 3.6, 20.6, 1.8, 2.8, 1.2, 136], ["Bran flakes (¾ cup, 30 g)", 96, 2.9, 24, 0.7, 5, 5, 210], ["Frosted corn flakes (¾ cup, 29 g)", 110, 1, 27, 0, 0, 10, 140], ["Shredded wheat (2 biscuits, 47 g)", 160, 5, 37, 1, 6, 0, 0], ["Puffed rice (1 cup, 14 g)", 56, 0.9, 12.6, 0.1, 0.2, 0, 0]];
export const MILK: Row[] = [["Whole milk (1 cup)", 149, 7.7, 11.7, 7.9, 0, 12.3, 105], ["2% milk (1 cup)", 122, 8.1, 11.7, 4.8, 0, 12.3, 115], ["1% milk (1 cup)", 102, 8.2, 12.2, 2.4, 0, 12.7, 107], ["Skim milk (1 cup)", 83, 8.3, 12.2, 0.2, 0, 12.5, 103], ["Chocolate milk, low-fat (1 cup)", 158, 8.1, 26, 2.5, 1, 24, 150], ["Unsweetened almond milk (1 cup)", 35, 1, 1, 2.5, 0.5, 0, 170], ["Unsweetened soy milk (1 cup)", 80, 7, 4, 4, 1, 1, 90], ["Oat milk, original (1 cup)", 120, 3, 16, 5, 2, 7, 100]];
export const OILS: Row[] = [["Olive oil (1 tbsp)", 119, 0, 0, 13.5, 0, 0, 0], ["Canola oil (1 tbsp)", 124, 0, 0, 14, 0, 0, 0], ["Vegetable / soybean oil (1 tbsp)", 120, 0, 0, 13.6, 0, 0, 0], ["Avocado oil (1 tbsp)", 124, 0, 0, 14, 0, 0, 0], ["Coconut oil (1 tbsp)", 121, 0, 0, 13.5, 0, 0, 0], ["Sesame oil (1 tbsp)", 120, 0, 0, 13.6, 0, 0, 0], ["Butter (1 tbsp)", 102, 0.1, 0, 11.5, 0, 0, 91], ["Ghee (1 tbsp)", 112, 0, 0, 12.7, 0, 0, 0]];
export const FISH: Row[] = [["Salmon, Atlantic farmed, cooked (3 oz)", 175, 18.8, 0, 10.5, 0, 0, 52], ["Salmon, sockeye, cooked (3 oz)", 133, 22.5, 0, 4.7, 0, 0, 78], ["Cod, cooked (3 oz)", 89, 19.4, 0, 0.7, 0, 0, 66], ["Tilapia, cooked (3 oz)", 109, 22.2, 0, 2.3, 0, 0, 48], ["Tuna, canned in water (3 oz)", 99, 21.7, 0, 0.7, 0, 0, 287], ["Rainbow trout, cooked (3 oz)", 128, 19.5, 0, 5, 0, 0, 48], ["Atlantic mackerel, cooked (3 oz)", 223, 20.3, 0, 15.1, 0, 0, 71], ["Sardines, canned in oil (3 oz)", 177, 21, 0, 9.7, 0, 0, 261]];
export const PORK: Row[] = [["Pork tenderloin, roasted (3 oz)", 122, 22.2, 0, 3, 0, 0, 48], ["Pork loin chop, cooked (3 oz)", 180, 24, 0, 8.5, 0, 0, 50], ["Pork shoulder, roasted (3 oz)", 230, 20, 0, 16, 0, 0, 60], ["Pork spare ribs, cooked (3 oz)", 337, 24.7, 0, 25.8, 0, 0, 79], ["Ham, cured (3 oz)", 139, 17.6, 1.3, 7.1, 0, 0, 1000], ["Pork sausage link, cooked (1 link, 25 g)", 88, 4.7, 0.4, 7.5, 0, 0.3, 207]];
export const POTATO: Row[] = [["Baked russet, medium with skin (173 g)", 161, 4.3, 36.6, 0.2, 3.8, 2, 17], ["Boiled potato, medium (150 g)", 130, 2.9, 30, 0.2, 2.7, 1.3, 8], ["Mashed with milk & butter (1 cup)", 237, 4, 35, 9, 3.2, 3, 666], ["Potato chips (1 oz)", 152, 2, 15, 10, 1.2, 0.1, 148], ["French fries, restaurant medium (117 g)", 365, 4, 48, 17, 4.4, 0.3, 246]];
export const CANDY: Row[] = [["Milk chocolate bar (1.55 oz)", 235, 3.4, 26, 13, 1.5, 22.6, 35], ["Jelly beans (10 large, 28 g)", 104, 0, 26.2, 0, 0, 19.3, 13], ["Hard candy (1 piece, 6 g)", 24, 0, 5.9, 0, 0, 3.8, 2], ["Marshmallow (1 large)", 23, 0.1, 5.9, 0, 0, 4.1, 6], ["Caramel (1 piece, 10 g)", 38, 0.5, 7.7, 0.8, 0, 6.5, 25], ["Gummy candy (1 oz)", 100, 2, 22, 0, 0, 14, 10]];
export const SNACK: Row[] = [["Potato chips (1 oz)", 152, 2, 15, 10, 1.2, 0.1, 148], ["Tortilla chips (1 oz)", 138, 2, 18, 7, 1.5, 0.3, 119], ["Pretzels (1 oz)", 108, 2.9, 22.5, 0.8, 0.9, 0.7, 352], ["Saltine crackers (5)", 63, 1.4, 11, 1.4, 0.4, 0.2, 141], ["Cheese puffs (1 oz)", 157, 2, 15, 10, 0.3, 1, 290], ["Rice cake, plain (1)", 35, 0.7, 7.3, 0.3, 0.4, 0.1, 29], ["Microwave popcorn, butter (3 cups popped)", 130, 2.3, 14, 7.6, 2.5, 0.2, 230]];
export const BEANS: Row[] = [["Black beans, cooked (1 cup)", 227, 15.2, 40.8, 0.9, 15, 0.6, 2], ["Kidney beans, cooked (1 cup)", 225, 15.3, 40.4, 0.9, 13.1, 0.6, 2], ["Chickpeas, cooked (1 cup)", 269, 14.5, 45, 4.2, 12.5, 7.9, 11], ["Lentils, cooked (1 cup)", 230, 17.9, 39.9, 0.8, 15.6, 3.6, 4], ["Pinto beans, cooked (1 cup)", 245, 15.4, 44.8, 1.1, 15.4, 0.6, 2], ["Navy beans, cooked (1 cup)", 255, 15, 47.4, 1.1, 19.1, 0.6, 0], ["Split peas, cooked (1 cup)", 231, 16.4, 41.4, 0.8, 16.3, 5.7, 4], ["Edamame, shelled (1 cup)", 188, 18.4, 13.8, 8.1, 8, 3.4, 9], ["Soybeans, cooked (1 cup)", 296, 31.3, 14.4, 15.4, 10.3, 5.2, 2]];
export const TOFU: Row[] = [["Firm tofu (½ cup, 126 g)", 181, 21.8, 3.5, 11, 2.9, 0.8, 18], ["Extra-firm tofu (3 oz)", 90, 10, 2, 5, 1, 0.5, 10], ["Silken tofu, soft (3 oz)", 47, 4.1, 2.5, 2.3, 0.1, 1.1, 4], ["Tempeh (3 oz)", 162, 17.3, 7.9, 9.2, 0, 0, 8], ["Seitan (3 oz)", 110, 21, 4, 1.5, 1, 0, 300], ["Edamame, shelled (½ cup)", 94, 9.2, 6.9, 4, 4, 1.7, 5]];
export const THANKS: Row[] = [["Roast turkey, white and dark with skin (4 oz)", 230, 32, 0, 10, 0, 0, 80], ["Bread stuffing (½ cup)", 178, 3.2, 21.7, 8.6, 2.9, 1.7, 543], ["Mashed potatoes with milk & butter (½ cup)", 119, 2, 17.5, 4.5, 1.6, 1.5, 333], ["Turkey gravy (¼ cup)", 31, 1.6, 3, 1.3, 0.2, 0, 344], ["Cranberry sauce, canned (¼ cup)", 105, 0.2, 27, 0.1, 0.7, 26, 20], ["Green bean casserole (½ cup)", 160, 3, 12, 11, 2, 3, 500], ["Sweet potato casserole (½ cup)", 250, 3, 40, 9, 3, 25, 150], ["Dinner roll (1)", 84, 2.4, 14.1, 2, 0.9, 1.4, 146], ["Buttered corn (½ cup)", 90, 2.5, 15.5, 3, 2, 3, 40], ["Pumpkin pie (⅛ of 9 in)", 323, 7, 41, 14.4, 2.7, 23, 349], ["Pecan pie (⅛ of 9 in)", 503, 6, 64, 27, 3, 31, 320], ["Apple pie (⅛ of 9 in)", 411, 3.7, 57.5, 19.4, 2.4, 25, 327], ["Whipped cream (2 tbsp)", 15, 0.2, 0.8, 1.3, 0, 0.8, 8], ["Red wine (5 oz)", 125, 0.1, 3.8, 0, 0, 0.9, 6]];

export const alcohol = foodTool(ALC), fruit = foodTool(FRUIT), nuts = foodTool(NUTS), cheese = foodTool(CHEESE), eggs = foodTool(EGGS), bread = foodTool(BREAD), cereal = foodTool(CEREAL), milk = foodTool(MILK), oils = foodTool(OILS), fish = foodTool(FISH), pork = foodTool(PORK), potatoes = foodTool(POTATO), candy = foodTool(CANDY), snacks = foodTool(SNACK);
export const proteinEggs = proteinTool(EGGS), proteinFish = proteinTool(FISH), proteinBeans = proteinTool(BEANS), proteinTofu = proteinTool(TOFU);

export const thanksgiving: Calc = (v) => {
  let k = 0, pr = 0, c = 0, f = 0, na = 0; const used: string[] = [];
  for (let i = 1; i <= 8; i++) { const q = p(v, `q${i}`, 0); if (q > 0) { const r = THANKS[pick(v[`f${i}`], THANKS.length)]; k += r[1] * q; pr += r[2] * q; c += r[3] * q; f += r[4] * q; na += r[7] * q; used.push(`${r[0].split(" (")[0]}${q !== 1 ? ` ×${nfmt(q, 1)}` : ""}`); } }
  if (!used.length) throw new InputError("Add at least one dish.");
  return { kcal: `${nfmt(k, 0)} kcal for your Thanksgiving plate`, mac: `Protein ${g1(pr)} · carbs ${g1(c)} · fat ${g1(f)} · sodium ${nfmt(na, 0)} mg`, note: `${day(k)} · walking it off at a brisk pace takes about ${nfmt(k / 5, 0)} minutes · ${used.join(", ")}` };
};

// ---- Nutrient tools ----
const SUG: [string, number][] = [["Cola", 39 / 12], ["Lemon-lime soda", 38 / 12], ["Ginger ale", 32 / 12], ["Root beer", 43 / 12], ["Sports drink", 34 / 20], ["Energy drink", 27 / 8.4], ["Sweet tea", 2.2], ["Orange juice", 21 / 8], ["Apple juice", 24 / 8], ["Chocolate milk", 24 / 8]];
export const sugarDrinks: Calc = (v) => {
  const d = SUG[pick(v.d, SUG.length)], oz = need(p(v, "oz", 12), "Enter drink size (oz)."), n = p(v, "n", 1), gr = d[1] * oz * n;
  return { tsp: `${nfmt(gr / 4, 1)} teaspoons of sugar (${g1(gr)})`, cmp: `${nfmt((gr / 50) * 100, 0)}% of the 50 g Daily Value for added sugars · AHA limit 25 g (women) / 36 g (men)`, note: `${d[0]}, ${nfmt(oz, 0)} oz${n !== 1 ? ` × ${nfmt(n, 1)}` : ""} · 1 teaspoon ≈ 4 g · juice and milk sugars are natural but still count toward totals` };
};
const CHOL: [string, number][] = [["Egg, large", 186], ["Shrimp, cooked (3 oz)", 161], ["Beef liver, pan-fried (3 oz)", 324], ["Lobster, cooked (3 oz)", 124], ["Ground beef 85% lean, cooked (3 oz)", 75], ["Chicken breast, roasted (3 oz)", 72], ["Salmon, Atlantic farmed, cooked (3 oz)", 54], ["Butter (1 tbsp)", 31], ["Cheddar cheese (1 oz)", 28], ["Ice cream, vanilla (½ cup)", 29], ["Whole milk (1 cup)", 24], ["Bacon, cooked (3 slices)", 26]];
export const cholesterol: Calc = (v) => {
  let tot = 0; const used: string[] = [];
  for (let i = 1; i <= 5; i++) { const q = p(v, `q${i}`, i === 1 ? 2 : 0); if (q > 0) { const r = CHOL[pick(v[`f${i}`], CHOL.length)]; tot += r[1] * q; used.push(`${r[0]} ×${nfmt(q, 1)}`); } }
  return { tot: `${nfmt(tot, 0)} mg dietary cholesterol`, dv: `${nfmt((tot / 300) * 100, 0)}% of the 300 mg Daily Value`, note: `${used.join(" · ") || "Add foods"} · current guidelines say keep it as low as practical; saturated fat raises blood cholesterol more than dietary cholesterol does` };
};
const K: [string, number][] = [["Dried apricots (½ cup)", 755], ["Lentils, cooked (1 cup)", 731], ["Acorn squash, cooked (1 cup)", 644], ["Prunes (½ cup)", 635], ["Raisins (½ cup)", 618], ["Potato, baked, flesh only (1 medium)", 610], ["Kidney beans, cooked (1 cup)", 607], ["Orange juice (1 cup)", 496], ["Soybeans, cooked (½ cup)", 443], ["Banana (1 medium)", 422], ["Milk, 1% (1 cup)", 366], ["Spinach, raw (2 cups)", 334], ["Chicken breast, cooked (3 oz)", 332], ["Salmon, Atlantic farmed, cooked (3 oz)", 326], ["Beef top sirloin, cooked (3 oz)", 315], ["Tomato, raw (1 medium)", 292], ["Soy milk (1 cup)", 287], ["Coffee, brewed (1 cup)", 116]];
export const potassium: Calc = (v) => {
  let tot = 0; const used: string[] = []; const f = pick(v.sx, 2) === 1, ai = f ? 2600 : 3400;
  for (let i = 1; i <= 6; i++) { const q = p(v, `q${i}`, i === 1 ? 1 : 0); if (q > 0) { const r = K[pick(v[`f${i}`], K.length)]; tot += r[1] * q; used.push(`${r[0]} ×${nfmt(q, 1)}`); } }
  return { tot: `${nfmt(tot, 0)} mg potassium`, ai: `${nfmt((tot / ai) * 100, 0)}% of the ${nfmt(ai, 0)} mg adequate intake for adult ${f ? "women" : "men"} · ${nfmt((tot / 4700) * 100, 0)}% of the 4,700 mg Daily Value`, note: `${used.join(" · ") || "Add foods"} · people with kidney disease or on certain blood-pressure drugs may need to limit potassium` };
};
const VC: [string, number][] = [["Red bell pepper, raw (½ cup)", 95], ["Orange juice (¾ cup)", 93], ["Orange (1 medium)", 70], ["Grapefruit juice (¾ cup)", 70], ["Kiwifruit (1 medium)", 64], ["Green bell pepper, raw (½ cup)", 60], ["Broccoli, cooked (½ cup)", 51], ["Strawberries (½ cup)", 49], ["Brussels sprouts, cooked (½ cup)", 48], ["Grapefruit (½ medium)", 39], ["Broccoli, raw (½ cup)", 39], ["Tomato juice (¾ cup)", 33], ["Cantaloupe (½ cup)", 29], ["Cabbage, cooked (½ cup)", 28], ["Cauliflower, raw (½ cup)", 26], ["Potato, baked (1 medium)", 17], ["Tomato, raw (1 medium)", 17], ["Spinach, cooked (½ cup)", 9]];
export const vitaminC: Calc = (v) => {
  let tot = 0; const used: string[] = []; const f = pick(v.sx, 2) === 1, sm = pick(v.sm, 2) === 1, rda = (f ? 75 : 90) + (sm ? 35 : 0);
  for (let i = 1; i <= 6; i++) { const q = p(v, `q${i}`, i === 1 ? 1 : 0); if (q > 0) { const r = VC[pick(v[`f${i}`], VC.length)]; tot += r[1] * q; used.push(`${r[0]} ×${nfmt(q, 1)}`); } }
  return { tot: `${nfmt(tot, 0)} mg vitamin C`, rda: `${nfmt((tot / rda) * 100, 0)}% of your ${rda} mg RDA (${f ? "women 75" : "men 90"} mg${sm ? " + 35 mg for smokers" : ""})`, note: `${used.join(" · ") || "Add foods"} · upper limit 2,000 mg a day; cooking and storage reduce vitamin C` };
};
export const energyDensity: Calc = (v) => {
  const k = p(v, "k", 250), w = need(p(v, "w", 100), "Enter serving weight (g)."), ed = k / w;
  const band = ed < 0.6 ? "Very low (eat freely — most fruit, vegetables, broth soups)" : ed < 1.5 ? "Low (fruit, starchy veg, lean protein, legumes, low-fat dairy)" : ed < 4 ? "Medium (meat, cheese, bread, pizza — watch portions)" : "High (chips, nuts, oils, chocolate, pastries — small portions)";
  return { ed: `${nfmt(ed, 2)} kcal per gram`, band, tip: `Swapping 100 g of this for a 1.0 kcal/g food saves ${nfmt(Math.max(0, (ed - 1) * 100), 0)} kcal · water and fibre lower energy density, fat raises it` };
};
const DV: [string, number, string][] = [["fat", 78, "g"], ["sf", 20, "g"], ["ch", 300, "mg"], ["na", 2300, "mg"], ["cb", 275, "g"], ["fb", 28, "g"], ["as", 50, "g"], ["pr", 50, "g"], ["ca", 1300, "mg"], ["fe", 18, "mg"], ["k", 4700, "mg"]];
const DVN: Record<string, string> = { fat: "Total fat", sf: "Saturated fat", ch: "Cholesterol", na: "Sodium", cb: "Total carbohydrate", fb: "Dietary fiber", as: "Added sugars", pr: "Protein", ca: "Calcium", fe: "Iron", k: "Potassium" };
export const labelDv: Calc = (v) => {
  const out = DV.map(([k, d, u]) => [k, p(v, k, 0), d, u] as [string, number, number, string]).filter(([, x]) => x > 0);
  if (!out.length) throw new InputError("Enter at least one nutrient amount.");
  const lo = out.filter(([k, x, d]) => ["fat", "sf", "ch", "na", "as"].includes(k) && (x / d) * 100 >= 20).map(([k]) => DVN[k]);
  return { dv: out.map(([k, x, d, u]) => `${DVN[k]} ${nfmt(x, 1)} ${u} = ${nfmt((x / d) * 100, 0)}%`).join(" · "), high: lo.length ? `High (20%+) in: ${lo.join(", ")} — nutrients to limit` : "Not high (20%+) in fat, saturated fat, cholesterol, sodium or added sugars", rule: "5/20 rule: 5% DV or less is low, 20% or more is high (FDA 2,000 kcal Daily Values)" };
};
const YLD: [string, number][] = [["Ground beef", 0.72], ["Steak", 0.75], ["Beef roast", 0.7], ["Chicken breast, boneless", 0.75], ["Chicken thigh, boneless", 0.72], ["Whole chicken (meat from bone-in)", 0.55], ["Pork chop, boneless", 0.75], ["Pork shoulder (pulled)", 0.6], ["Bacon", 0.33], ["Salmon fillet", 0.8], ["Shrimp, peeled", 0.8]];
export const rawCooked: Calc = (v) => {
  const m = YLD[pick(v.m, YLD.length)], w = need(p(v, "w", 454), "Enter the weight."), dir = pick(v.d, 2), y = (p(v, "y", 0) || m[1] * 100) / 100;
  const out = dir === 0 ? w * y : w / y;
  return { w: dir === 0 ? `≈ ${nfmt(out, 0)} cooked from ${nfmt(w, 0)} raw` : `≈ ${nfmt(out, 0)} raw for ${nfmt(w, 0)} cooked`, y: `${m[0]}: about ${nfmt(y * 100, 0)}% yield (moisture and fat lost in cooking)`, tip: "Nutrition labels are usually for raw weight — log what you weighed, or convert with this factor · same units in and out (g, oz or lb)" };
};

// ---- registry (generated)
export const ideaFood5CustomCalculators: Record<string, Calc> = {
  "calories-in-alcohol-drinks-calculator": alcohol,
  "calories-in-fruit-calculator": fruit,
  "calories-in-nuts-calculator": nuts,
  "calories-in-cheese-calculator": cheese,
  "calories-in-eggs-calculator": eggs,
  "calories-in-bread-calculator": bread,
  "calories-in-cereal-calculator": cereal,
  "calories-in-milk-calculator": milk,
  "calories-in-oils-calculator": oils,
  "calories-in-fish-calculator": fish,
  "calories-in-pork-calculator": pork,
  "calories-in-potatoes-calculator": potatoes,
  "calories-in-candy-calculator": candy,
  "calories-in-snacks-calculator": snacks,
  "protein-in-eggs-calculator": proteinEggs,
  "protein-in-fish-calculator": proteinFish,
  "protein-in-beans-calculator": proteinBeans,
  "protein-in-tofu-calculator": proteinTofu,
  "thanksgiving-dinner-calories-calculator": thanksgiving,
  "sugar-in-drinks-teaspoons-calculator": sugarDrinks,
  "cholesterol-in-food-calculator": cholesterol,
  "potassium-in-food-calculator": potassium,
  "vitamin-c-in-food-calculator": vitaminC,
  "food-energy-density-calculator": energyDensity,
  "nutrition-label-daily-value-percent-calculator": labelDv,
  "raw-to-cooked-meat-weight-calculator": rawCooked,
};
