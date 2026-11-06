/**
 * Batch: "Food & Drink Calculators" → Food Nutrition & Calorie Calculators.
 *
 * Data / methods:
 *  - Nutrient values are typical figures from USDA FoodData Central (SR Legacy / FNDDS) and, for
 *    restaurant-style dishes, typical published restaurant portions. Each row is
 *    [label, kcal, protein g, carbs g, fat g, fiber g, sugar g, sodium mg] for the stated serving
 *    (or per 100 g in FOODS_100G). Restaurant recipes vary a lot, so dish values are estimates.
 *  - Daily Values (FDA, 2,000 kcal): fat 78 g, carbs 275 g, fiber 28 g, protein 50 g, sodium 2,300 mg,
 *    vitamin C 90 mg, potassium 4,700 mg, vitamin K 120 µg.
 *  - Alcohol 7 kcal/g (density 0.789); carbohydrate and protein 4 kcal/g; fat 9 kcal/g.
 *  - Nutri-Score (2017 general-food algorithm, per 100 g): negative points energy (>335 kJ steps),
 *    sugars (>4.5 g steps), saturated fat (>1 g steps), sodium (>90 mg steps), 0–10 each; positive
 *    points fruit/veg/nut % (40/60/80 → 1/2/5), fibre (>0.9/1.9/2.8/3.7/4.7 g) and protein
 *    (>1.6/3.2/4.8/6.4/8.0 g), 0–5 each. Protein is not counted when negative ≥ 11 and fruit points < 5.
 *    Grades: A ≤ −1, B 0–2, C 3–10, D 11–18, E ≥ 19.
 *  - Fish mercury (FDA mean ppm, 1990–2012 monitoring); EPA reference dose 0.1 µg/kg body weight/day.
 *  - Ground beef cooked (pan-browned, drained): cooked weight ≈ 72% of raw, keeping all protein and
 *    about 70% of the fat.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-food-nutrition-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pick = (v: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(safeNumber(v))));
const round1 = (n: number) => Math.round(n * 10) / 10;

/** [label, kcal, protein, carbs, fat, fiber, sugar, sodium] */
export type Row = [string, number, number, number, number, number, number, number];

function totals(parts: [Row, number][]) {
  const t = [0, 0, 0, 0, 0, 0, 0];
  for (const [row, q] of parts) for (let i = 0; i < 7; i++) t[i] += (row[i + 1] as number) * q;
  return { calories: Math.round(t[0]), protein: round1(t[1]), carbs: round1(t[2]), fat: round1(t[3]), fiber: round1(t[4]), sugar: round1(t[5]), sodium: Math.round(t[6]) };
}
/** Builder: slots item1..n (dropdown index) and qty1..n (servings). */
function build(v: Record<string, number>, list: Row[], n: number, scale = 1) {
  const parts: [Row, number][] = [];
  for (let i = 1; i <= n; i++) {
    const q = nonNeg(v[`qty${i}`]);
    if (q > 0) parts.push([list[pick(v[`item${i}`], list.length)], q * scale]);
  }
  return totals(parts);
}
const macroPct = (t: { calories: number; protein: number; carbs: number; fat: number }) => {
  const k = t.protein * 4 + t.carbs * 4 + t.fat * 9;
  return { proteinPercentCalories: round1(k > 0 ? ((t.protein * 4) / k) * 100 : 0), carbsPercentCalories: round1(k > 0 ? ((t.carbs * 4) / k) * 100 : 0), fatPercentCalories: round1(k > 0 ? ((t.fat * 9) / k) * 100 : 0) };
};

// ---------- General food database (per 100 g) ----------
export const FOODS_100G: Row[] = [
  ["Chicken breast, cooked", 165, 31, 0, 3.6, 0, 0, 74], ["Chicken thigh, cooked", 209, 26, 0, 10.9, 0, 0, 95], ["Ground beef 85/15, cooked", 250, 26, 0, 15, 0, 0, 72], ["Steak (sirloin), cooked", 220, 29, 0, 11, 0, 0, 60], ["Pork chop, cooked", 210, 28, 0, 10, 0, 0, 60], ["Salmon, cooked", 206, 22, 0, 12, 0, 0, 61], ["Tuna, canned in water", 116, 25.5, 0, 0.8, 0, 0, 247], ["Shrimp, cooked", 99, 24, 0.2, 0.3, 0, 0, 111], ["Egg, whole", 143, 12.6, 0.7, 9.5, 0, 0.4, 142], ["Tofu, firm", 144, 17.3, 2.8, 8.7, 2.3, 0.6, 14], ["Bacon, cooked", 541, 37, 1.4, 42, 0, 0, 1717],
  ["White rice, cooked", 130, 2.7, 28.2, 0.3, 0.4, 0.1, 1], ["Brown rice, cooked", 123, 2.7, 25.6, 1, 1.6, 0.2, 4], ["Pasta, cooked", 158, 5.8, 30.9, 0.9, 1.8, 0.6, 1], ["Quinoa, cooked", 120, 4.4, 21.3, 1.9, 2.8, 0.9, 7], ["Oats, dry", 379, 13.2, 67.7, 6.5, 10.1, 1, 6], ["White bread", 266, 8.9, 49, 3.3, 2.7, 5.7, 490], ["Whole wheat bread", 252, 12.4, 42.7, 3.5, 6, 4.4, 450], ["Flour tortilla", 304, 8.1, 49.9, 8, 3.5, 2.6, 600], ["Corn tortilla", 218, 5.7, 44.6, 2.9, 6.3, 0.9, 45], ["Potato, baked", 93, 2.5, 21, 0.1, 2.2, 1.2, 10], ["Sweet potato, baked", 90, 2, 20.7, 0.2, 3.3, 6.5, 36],
  ["Black beans, cooked", 132, 8.9, 23.7, 0.5, 8.7, 0.3, 1], ["Lentils, cooked", 116, 9, 20, 0.4, 7.9, 1.8, 2], ["Chickpeas, cooked", 164, 8.9, 27.4, 2.6, 7.6, 4.8, 7],
  ["Broccoli, raw", 34, 2.8, 6.6, 0.4, 2.6, 1.7, 33], ["Spinach, raw", 23, 2.9, 3.6, 0.4, 2.2, 0.4, 79], ["Carrots, raw", 41, 0.9, 9.6, 0.2, 2.8, 4.7, 69], ["Tomato, raw", 18, 0.9, 3.9, 0.2, 1.2, 2.6, 5], ["Romaine lettuce", 17, 1.2, 3.3, 0.3, 2.1, 1.2, 8], ["Cucumber", 15, 0.7, 3.6, 0.1, 0.5, 1.7, 2], ["Bell pepper, red", 31, 1, 6, 0.3, 2.1, 4.2, 4], ["Onion", 40, 1.1, 9.3, 0.1, 1.7, 4.2, 4], ["Avocado", 160, 2, 8.5, 14.7, 6.7, 0.7, 7],
  ["Banana", 89, 1.1, 22.8, 0.3, 2.6, 12.2, 1], ["Apple", 52, 0.3, 13.8, 0.2, 2.4, 10.4, 1], ["Strawberries", 32, 0.7, 7.7, 0.3, 2, 4.9, 1], ["Blueberries", 57, 0.7, 14.5, 0.3, 2.4, 10, 1], ["Orange", 47, 0.9, 11.8, 0.1, 2.4, 9.4, 0], ["Grapes", 69, 0.7, 18, 0.2, 0.9, 15.5, 2],
  ["Whole milk", 61, 3.2, 4.8, 3.3, 0, 5, 43], ["2% milk", 50, 3.3, 4.8, 2, 0, 5, 47], ["Greek yogurt, plain nonfat", 59, 10.2, 3.6, 0.4, 0, 3.2, 36], ["Cheddar cheese", 403, 24.9, 1.3, 33.1, 0, 0.5, 621], ["Mozzarella, part-skim", 254, 24.3, 2.8, 15.9, 0, 1.1, 619], ["Butter, salted", 717, 0.9, 0.1, 81.1, 0, 0.1, 643],
  ["Olive oil", 884, 0, 0, 100, 0, 0, 2], ["Peanut butter", 588, 25, 20, 50, 6, 9.2, 430], ["Almonds", 579, 21.2, 21.6, 49.9, 12.5, 4.4, 1], ["Walnuts", 654, 15.2, 13.7, 65.2, 6.7, 2.6, 2], ["Whey protein powder", 400, 80, 8, 5, 0, 4, 250], ["Dark chocolate 70%", 598, 7.8, 45.9, 42.6, 10.9, 24, 20],
  ["Sugar", 387, 0, 100, 0, 0, 100, 1], ["Honey", 304, 0.3, 82.4, 0, 0.2, 82.1, 4], ["All-purpose flour", 364, 10.3, 76.3, 1, 2.7, 0.3, 2], ["Potato chips", 536, 7, 53, 35, 4.4, 0.3, 525], ["Mayonnaise", 680, 1, 0.6, 75, 0, 0.6, 635], ["Ranch dressing", 430, 1, 6, 45, 0, 4, 900], ["Soy sauce", 53, 8.1, 4.9, 0.6, 0.8, 0.4, 5493],
];
function gramsBuild(v: Record<string, number>, n: number) {
  const parts: [Row, number][] = [];
  for (let i = 1; i <= n; i++) {
    const g = nonNeg(v[`grams${i}`]);
    if (g > 0) parts.push([FOODS_100G[pick(v[`food${i}`], FOODS_100G.length)], g / 100]);
  }
  return totals(parts);
}
export const nutrition: CustomCalculator = (v) => {
  const t = gramsBuild(v, 6);
  return { ...t, ...macroPct(t) };
};
export const recipeNutrition: CustomCalculator = (v) => {
  const t = gramsBuild(v, 10);
  const s = Math.max(1, nonNeg(v.servings, 4));
  return { caloriesPerServing: Math.round(t.calories / s), proteinPerServing: round1(t.protein / s), carbsPerServing: round1(t.carbs / s), netCarbsPerServing: round1((t.carbs - t.fiber) / s), fatPerServing: round1(t.fat / s), fiberPerServing: round1(t.fiber / s), sugarPerServing: round1(t.sugar / s), sodiumPerServing: Math.round(t.sodium / s), sodiumDvPercent: round1((t.sodium / s / 2300) * 100), fatDvPercent: round1((t.fat / s / 78) * 100), totalCalories: t.calories };
};

// ---------- Dish builders (per serving) ----------
export const SALAD: Row[] = [
  ["Romaine / mixed greens (2 cups)", 16, 1.2, 3, 0.3, 2, 1, 8], ["Spinach (2 cups)", 14, 1.7, 2.2, 0.2, 1.3, 0.3, 48], ["Grilled chicken (4 oz)", 187, 35, 0, 4, 0, 0, 84], ["Salmon (4 oz)", 233, 25, 0, 14, 0, 0, 69], ["Shrimp (4 oz)", 112, 27, 0, 0.3, 0, 0, 126], ["Hard-boiled egg (1)", 78, 6.3, 0.6, 5.3, 0, 0.6, 62], ["Tofu (3 oz)", 122, 14.7, 2.4, 7.4, 2, 0.5, 12], ["Chickpeas (½ cup)", 134, 7.3, 22.5, 2.1, 6.2, 4, 6], ["Black beans (½ cup)", 114, 7.6, 20.4, 0.5, 7.5, 0.3, 1], ["Bacon bits (1 tbsp)", 30, 2.3, 0.1, 2.2, 0, 0, 180],
  ["Cheddar, shredded (¼ cup)", 114, 7, 0.4, 9.4, 0, 0.1, 176], ["Feta (¼ cup)", 99, 5.3, 1.5, 8, 0, 1.5, 323], ["Parmesan (2 tbsp)", 42, 3.8, 0.4, 2.8, 0, 0, 150], ["Avocado (½)", 120, 1.5, 6.4, 11, 5, 0.5, 5], ["Croutons (½ cup)", 61, 1.8, 11, 1, 0.8, 1, 105], ["Tortilla strips (¼ cup)", 70, 1, 8, 4, 0.6, 0, 60], ["Walnuts or pecans (2 tbsp)", 95, 2.2, 2, 9.5, 1, 0.4, 0], ["Sunflower seeds (2 tbsp)", 102, 3.6, 3.5, 9, 1.6, 0.5, 1], ["Dried cranberries (2 tbsp)", 46, 0, 12.4, 0.2, 0.8, 10, 0],
  ["Tomatoes (½ cup)", 16, 0.8, 3.5, 0.2, 1.1, 2.4, 4], ["Cucumber (½ cup)", 8, 0.3, 1.9, 0.1, 0.3, 0.9, 1], ["Corn (½ cup)", 66, 2.4, 14.5, 1, 1.6, 2.5, 1],
  ["Ranch dressing (2 tbsp)", 129, 0.4, 1.8, 13.4, 0, 1.4, 270], ["Caesar dressing (2 tbsp)", 160, 0.6, 1, 17, 0, 0.5, 320], ["Balsamic vinaigrette (2 tbsp)", 90, 0, 4, 8, 0, 3, 280], ["Italian dressing (2 tbsp)", 70, 0.1, 3.5, 6, 0, 2.5, 290], ["Blue cheese dressing (2 tbsp)", 145, 1.4, 1.4, 15, 0, 1, 190], ["Honey mustard (2 tbsp)", 140, 0.4, 7, 12, 0, 6, 250], ["Olive oil & vinegar (1 tbsp oil)", 120, 0, 0.2, 13.5, 0, 0.1, 0], ["Light / fat-free dressing (2 tbsp)", 35, 0, 6, 1, 0, 4, 300],
];
export const POKE: Row[] = [
  ["Sushi rice (1 cup)", 240, 4.2, 53, 0.4, 0.6, 4, 260], ["Brown rice (1 cup)", 248, 5.5, 52, 2, 3.2, 0.5, 10], ["Mixed greens (1 cup)", 9, 0.7, 1.7, 0.1, 1, 0.5, 5], ["Cauliflower rice (1 cup)", 27, 2, 5, 0.3, 2.1, 2, 32],
  ["Ahi tuna, raw (4 oz)", 124, 27.6, 0, 0.6, 0, 0, 51], ["Salmon, raw (4 oz)", 236, 23, 0, 15, 0, 0, 67], ["Spicy tuna (4 oz)", 200, 22, 1, 12, 0, 0.5, 250], ["Cooked shrimp (4 oz)", 112, 27, 0, 0.3, 0, 0, 126], ["Tofu (4 oz)", 163, 19.6, 3.2, 9.8, 2.6, 0.7, 16], ["Chicken (4 oz)", 187, 35, 0, 4, 0, 0, 84], ["Imitation crab (2 oz)", 54, 4.3, 8.6, 0.3, 0.3, 3.5, 300],
  ["Edamame (¼ cup shelled)", 47, 4.6, 3.6, 2, 2, 0.8, 2], ["Avocado (¼)", 60, 0.75, 3.2, 5.5, 2.5, 0.2, 3], ["Cucumber (¼ cup)", 4, 0.2, 1, 0, 0.1, 0.4, 0], ["Seaweed salad (¼ cup)", 45, 0.5, 6, 2, 1, 3, 350], ["Mango (¼ cup)", 25, 0.3, 6.2, 0.2, 0.7, 5.6, 0], ["Masago / tobiko (1 tbsp)", 25, 3.5, 0.5, 1, 0, 0, 140], ["Crispy onions (1 tbsp)", 45, 0.5, 3, 3.5, 0, 0, 50], ["Sesame seeds (1 tsp)", 17, 0.5, 0.7, 1.5, 0.4, 0, 0],
  ["Shoyu poke sauce (1 tbsp)", 20, 1.3, 2.5, 0.1, 0.1, 1.5, 700], ["Spicy mayo (1 tbsp)", 90, 0.1, 0.6, 10, 0, 0.4, 110], ["Eel sauce (1 tbsp)", 45, 0.4, 10, 0, 0, 8, 330], ["Ponzu (1 tbsp)", 10, 0.5, 2, 0, 0, 1, 400], ["Sriracha (1 tsp)", 5, 0.1, 1, 0.1, 0.1, 1, 100],
];
export const SMOOTHIE: Row[] = [
  ["Banana (1 medium)", 105, 1.3, 27, 0.4, 3.1, 14.4, 1], ["Frozen strawberries (1 cup)", 52, 0.6, 13.6, 0.2, 3.1, 6.8, 3], ["Blueberries (1 cup)", 84, 1.1, 21, 0.5, 3.6, 14.7, 1], ["Mango chunks (1 cup)", 99, 1.4, 24.7, 0.6, 2.6, 22.5, 2], ["Pineapple (1 cup)", 82, 0.9, 21.6, 0.2, 2.3, 16.3, 2], ["Spinach (1 cup)", 7, 0.9, 1.1, 0.1, 0.7, 0.1, 24], ["Kale (1 cup)", 7, 0.6, 0.9, 0.3, 0.9, 0.2, 11], ["Avocado (¼)", 60, 0.75, 3.2, 5.5, 2.5, 0.2, 3],
  ["Whole milk (1 cup)", 149, 7.7, 11.7, 7.9, 0, 12.3, 105], ["2% milk (1 cup)", 122, 8.1, 11.7, 4.8, 0, 12.3, 115], ["Skim milk (1 cup)", 83, 8.3, 12.2, 0.2, 0, 12.5, 103], ["Almond milk, unsweetened (1 cup)", 37, 1.4, 1.4, 2.7, 0.5, 0, 170], ["Oat milk (1 cup)", 120, 3, 16, 5, 2, 7, 100], ["Orange juice (1 cup)", 112, 1.7, 25.8, 0.5, 0.5, 20.8, 2],
  ["Greek yogurt, plain nonfat (¾ cup)", 100, 17, 6, 0.7, 0, 5, 61], ["Vanilla yogurt (¾ cup)", 150, 8.6, 25, 2.1, 0, 25, 110], ["Whey protein (1 scoop)", 120, 24, 3, 1.5, 0, 1.5, 75], ["Plant protein (1 scoop)", 120, 21, 5, 2, 2, 1, 250], ["Peanut butter (1 tbsp)", 94, 3.6, 3.5, 8, 0.8, 1.5, 73], ["Almond butter (1 tbsp)", 98, 3.4, 3, 8.9, 1.6, 0.7, 1], ["Honey (1 tbsp)", 64, 0.1, 17.3, 0, 0, 17.2, 1], ["Chia seeds (1 tbsp)", 58, 2, 5, 3.7, 4.1, 0, 2], ["Ground flaxseed (1 tbsp)", 37, 1.3, 2, 3, 1.9, 0.1, 2], ["Rolled oats (¼ cup)", 76, 2.6, 13.5, 1.3, 2, 0.2, 1], ["Cocoa powder (1 tbsp)", 12, 1, 3.1, 0.7, 1.8, 0.1, 1], ["Ice (1 cup)", 0, 0, 0, 0, 0, 0, 0],
];
export const ACAI: Row[] = [
  ["Açaí pack, unsweetened (100 g)", 60, 1, 3, 5, 3, 0, 15], ["Açaí pack, sweetened / original (100 g)", 100, 1, 13, 5, 2, 10, 15], ["Banana (½)", 53, 0.65, 13.5, 0.2, 1.55, 7.2, 0.5], ["Frozen berries (½ cup)", 35, 0.5, 8.5, 0.2, 2.3, 5.5, 1], ["Almond milk (½ cup)", 18, 0.7, 0.7, 1.3, 0.25, 0, 85], ["Apple juice (½ cup)", 57, 0.1, 14, 0.2, 0.2, 12, 5],
  ["Granola (¼ cup)", 140, 3, 19, 6, 2, 7, 15], ["Strawberries, sliced (½ cup)", 27, 0.6, 6.4, 0.3, 1.7, 4, 1], ["Blueberries (¼ cup)", 21, 0.3, 5.3, 0.1, 0.9, 3.7, 0], ["Kiwi (1)", 42, 0.8, 10, 0.4, 2.1, 6.2, 2], ["Honey (1 tbsp)", 64, 0.1, 17.3, 0, 0, 17.2, 1], ["Peanut butter (1 tbsp)", 94, 3.6, 3.5, 8, 0.8, 1.5, 73], ["Almond butter (1 tbsp)", 98, 3.4, 3, 8.9, 1.6, 0.7, 1], ["Nutella (1 tbsp)", 100, 1, 11, 6, 0.5, 10.5, 7.5], ["Coconut flakes (1 tbsp)", 33, 0.3, 1.2, 3.2, 0.8, 0.4, 2], ["Chia seeds (1 tbsp)", 58, 2, 5, 3.7, 4.1, 0, 2], ["Cacao nibs (1 tbsp)", 60, 1.4, 3.5, 5, 3.3, 0, 1], ["Protein powder (1 scoop)", 120, 24, 3, 1.5, 0, 1.5, 75],
];
export const SUSHI: Row[] = [
  ["California roll (1 piece)", 43, 1.5, 6.3, 1.2, 0.4, 1, 72], ["Spicy tuna roll (1 piece)", 48, 2.5, 4.5, 2, 0.3, 0.6, 80], ["Philadelphia roll (1 piece)", 53, 2, 5.5, 2.5, 0.2, 0.7, 85], ["Shrimp tempura roll (1 piece)", 63, 1.8, 8, 2.7, 0.4, 1, 110], ["Salmon avocado roll (1 piece)", 50, 2.2, 6, 1.8, 0.6, 0.7, 60], ["Dragon / eel roll (1 piece)", 55, 2, 7, 2, 0.5, 1.5, 110], ["Rainbow roll (1 piece)", 58, 3.2, 6, 2.3, 0.5, 0.8, 90], ["Cucumber or avocado roll (1 piece)", 23, 0.6, 5, 0.3, 0.4, 0.8, 80],
  ["Tuna nigiri (1 piece)", 50, 4.5, 6, 0.3, 0.1, 0.8, 60], ["Salmon nigiri (1 piece)", 60, 3.5, 6, 2, 0.1, 0.8, 60], ["Eel (unagi) nigiri (1 piece)", 70, 3, 8, 3, 0.1, 2.5, 130], ["Shrimp nigiri (1 piece)", 45, 3.5, 6.2, 0.2, 0.1, 0.8, 90], ["Tuna sashimi (1 slice, 1 oz)", 31, 6.9, 0, 0.15, 0, 0, 13], ["Salmon sashimi (1 slice, 1 oz)", 58, 5.8, 0, 3.8, 0, 0, 17],
  ["Edamame (½ cup shelled)", 94, 9.2, 6.9, 4, 4, 1.6, 190], ["Miso soup (1 cup)", 40, 3, 5, 1.3, 1, 1.5, 780], ["Seaweed salad (½ cup)", 70, 1, 10, 3, 2, 6, 700], ["Gyoza (1 piece)", 64, 2.5, 7, 2.8, 0.4, 0.4, 130], ["Soy sauce (1 tbsp)", 9, 1.3, 0.8, 0.1, 0.1, 0.1, 880], ["Spicy mayo (1 tbsp)", 90, 0.1, 0.6, 10, 0, 0.4, 110],
];
export const CHINESE: Row[] = [
  ["General Tso's chicken (1 cup)", 380, 17, 33, 19, 1, 17, 800], ["Orange chicken (1 cup)", 410, 21, 43, 19, 0.5, 16, 680], ["Sesame chicken (1 cup)", 400, 19, 38, 19, 1, 20, 760], ["Sweet and sour chicken (1 cup)", 340, 14, 44, 12, 1, 24, 480], ["Sweet and sour pork (1 cup)", 360, 13, 40, 16, 1, 22, 520], ["Kung pao chicken (1 cup)", 320, 21, 15, 20, 2, 7, 950], ["Chicken and broccoli (1 cup)", 200, 20, 10, 8, 2.5, 4, 780], ["Moo goo gai pan (1 cup)", 220, 18, 12, 11, 2.5, 5, 800], ["Beef and broccoli (1 cup)", 230, 16, 13, 12, 2, 6, 780], ["Mongolian beef (1 cup)", 370, 24, 20, 21, 1, 14, 1100], ["Pepper steak (1 cup)", 220, 18, 10, 12, 1.5, 5, 850], ["Honey walnut shrimp (1 cup)", 470, 15, 38, 29, 1, 19, 500], ["Shrimp with lobster sauce (1 cup)", 240, 22, 10, 12, 0.5, 1.5, 1000], ["Mapo tofu (1 cup)", 300, 16, 10, 22, 1.5, 3, 1000],
  ["Vegetable lo mein (1 cup)", 290, 9, 41, 10, 2.5, 4, 900], ["Chicken lo mein (1 cup)", 330, 17, 36, 13, 2.4, 4, 1000], ["Chicken chow mein (1 cup)", 270, 17, 22, 12, 2.5, 5, 880], ["Chicken fried rice (1 cup)", 340, 13, 42, 12, 1.5, 1.5, 760], ["Vegetable fried rice (1 cup)", 290, 7, 45, 9, 1.6, 1.5, 620], ["Steamed white rice (1 cup)", 205, 4.3, 44.5, 0.4, 0.6, 0.1, 2],
  ["Egg roll (1)", 220, 6, 24, 11, 2, 3, 450], ["Spring roll (1)", 100, 2, 12, 5, 1, 1, 200], ["Crab rangoon (1)", 83, 2.7, 8, 4.3, 0.7, 0.7, 120], ["Pork dumpling, pan-fried (1)", 70, 3, 7, 3, 0.4, 0.5, 150], ["Wonton soup (1 cup)", 70, 5, 8, 2, 0.4, 0.7, 900], ["Hot and sour soup (1 cup)", 90, 6, 10, 3, 0.7, 2, 1000], ["Egg drop soup (1 cup)", 65, 3, 8, 2, 0.5, 0.5, 900],
];
export const INDIAN: Row[] = [
  ["Butter chicken (1 cup)", 440, 30, 12, 30, 2, 7, 880], ["Chicken tikka masala (1 cup)", 400, 28, 14, 26, 2.5, 8, 900], ["Chicken korma (1 cup)", 500, 28, 14, 37, 2.5, 8, 800], ["Chicken vindaloo (1 cup)", 360, 28, 12, 22, 2.5, 5, 900], ["Chicken curry (1 cup)", 330, 27, 10, 20, 2, 4, 800], ["Lamb rogan josh (1 cup)", 420, 30, 10, 29, 2, 5, 850], ["Palak paneer (1 cup)", 320, 14, 12, 25, 4, 4, 700], ["Paneer makhani / tikka masala (1 cup)", 460, 17, 15, 37, 2.5, 8, 850], ["Chana masala (1 cup)", 270, 11, 35, 10, 9.5, 6, 750], ["Dal tadka (1 cup)", 230, 12, 30, 7, 8, 3, 600], ["Dal makhani (1 cup)", 330, 12, 32, 17, 8, 3, 700], ["Aloo gobi (1 cup)", 200, 5, 22, 11, 5, 5, 600],
  ["Chicken biryani (1 cup)", 360, 20, 40, 13, 2, 2, 750], ["Vegetable biryani (1 cup)", 300, 6, 45, 11, 3, 3, 600], ["Basmati rice (1 cup)", 205, 4.3, 45, 0.4, 0.6, 0, 2], ["Jeera rice (1 cup)", 250, 4.5, 45, 5.5, 0.8, 0.2, 350], ["Plain naan (1 piece)", 262, 8.7, 45, 5.1, 2, 3.2, 418], ["Garlic naan (1 piece)", 300, 9, 46, 9, 2, 3, 500], ["Roti / chapati (1)", 120, 3.1, 18, 3.7, 2, 0.3, 119],
  ["Samosa (1)", 260, 4.5, 26, 15, 2.5, 1.5, 420], ["Vegetable pakora (3 pieces)", 225, 5, 21, 14, 3, 2, 330], ["Tandoori chicken (1 leg quarter)", 260, 32, 4, 12, 0.6, 1.5, 700], ["Chicken tikka (6 pieces)", 280, 40, 5, 11, 1, 2, 800], ["Raita (½ cup)", 70, 3.6, 6, 3.5, 0.5, 5, 200], ["Mango lassi (1 cup)", 250, 6.5, 45, 5, 0.5, 43, 100], ["Masala chai (1 cup)", 120, 3.5, 20, 3, 0, 19, 50], ["Gulab jamun (1)", 150, 2, 24, 6, 0.2, 20, 50],
];
export const BURRITO: Row[] = [
  ["Flour tortilla, 13 in (burrito)", 320, 8, 50, 9, 3, 1, 600], ["Flour tortilla, 10 in", 210, 5.5, 35, 5, 2, 1.5, 450], ["White rice, cilantro-lime (4 oz)", 210, 4, 40, 4, 1, 0, 350], ["Brown rice (4 oz)", 210, 4, 36, 6, 2, 0, 190], ["Black beans (4 oz)", 130, 8, 22, 1.5, 7, 2, 210], ["Pinto beans (4 oz)", 130, 8, 21, 1.5, 8, 1, 330],
  ["Chicken (4 oz)", 180, 32, 0, 7, 0, 0, 310], ["Steak (4 oz)", 150, 21, 1, 6, 0, 0, 330], ["Carnitas (4 oz)", 210, 23, 0, 12, 0, 0, 450], ["Barbacoa (4 oz)", 170, 24, 2, 7, 1, 0, 530], ["Ground beef taco meat (4 oz)", 240, 18, 3, 17, 0.5, 1, 450], ["Sofritas / tofu (4 oz)", 150, 8, 9, 10, 3, 5, 560], ["Fajita veggies (2 oz)", 20, 1, 5, 0, 1, 2, 150],
  ["Tomato salsa / pico (4 oz)", 25, 0, 4, 0, 1, 1, 550], ["Roasted corn salsa (4 oz)", 80, 3, 16, 1.5, 3, 4, 330], ["Red chili salsa (2 oz)", 30, 0, 4, 0, 1, 0, 500], ["Sour cream (2 oz)", 110, 2, 2, 9, 0, 2, 30], ["Cheese (1 oz)", 110, 6, 1, 8, 0, 0, 190], ["Guacamole (4 oz)", 230, 2, 8, 22, 6, 1, 370], ["Queso (2 oz)", 120, 5, 4, 9, 0, 2, 330], ["Lettuce (1 oz)", 5, 0, 1, 0, 0.5, 0, 5],
];
export const MEXICAN: Row[] = [
  ["Crunchy beef taco (1)", 170, 8, 13, 10, 3, 1, 300], ["Soft beef taco (1)", 180, 9, 18, 8, 3, 1, 500], ["Soft chicken taco (1)", 170, 12, 16, 6, 1, 1, 450], ["Street taco, carne asada (1)", 150, 10, 13, 6, 2, 1, 250], ["Carnitas taco (1)", 180, 11, 13, 9, 2, 1, 280], ["Al pastor taco (1)", 160, 9, 14, 7, 2, 2, 300], ["Fried fish taco (1)", 230, 10, 22, 12, 2, 2, 400],
  ["Chicken enchilada (1)", 260, 16, 20, 13, 2.5, 3, 650], ["Cheese enchilada (1)", 320, 12, 22, 20, 2.5, 3, 700], ["Cheese quesadilla (10 in, whole)", 680, 30, 50, 40, 3, 3, 1350], ["Chicken quesadilla (10 in, whole)", 780, 48, 52, 42, 3, 3, 1600], ["Bean & cheese burrito (1)", 380, 15, 55, 11, 8, 3, 1000], ["Beef tamale (1)", 285, 11, 25, 16, 2.5, 1, 550], ["Chile relleno (1)", 400, 16, 18, 30, 2.5, 6, 800], ["Tostada (1)", 250, 11, 24, 12, 5, 2, 500], ["Chicken fajitas with 3 tortillas", 700, 48, 64, 27, 6, 8, 1800], ["Steak fajitas with 3 tortillas", 780, 48, 64, 35, 6, 8, 1800], ["Nachos with toppings (1 plate)", 1100, 38, 90, 65, 14, 5, 1800],
  ["Tortilla chips (1 oz, ~10 chips)", 140, 2, 18, 7, 1.5, 0, 120], ["Salsa (¼ cup)", 20, 1, 4, 0, 1, 2, 380], ["Guacamole (¼ cup)", 90, 1, 5, 8, 3.5, 0.5, 150], ["Queso dip (¼ cup)", 120, 4, 4, 9, 0, 2, 500], ["Refried beans (½ cup)", 110, 6.5, 18, 1.5, 6, 0.5, 460], ["Mexican rice (½ cup)", 160, 3, 28, 4, 1, 1, 400], ["Chicken tortilla soup (1 cup)", 210, 12, 18, 10, 3, 3, 900], ["Elote (1 ear)", 260, 6, 24, 17, 2.5, 5, 320],
  ["Churro (1)", 230, 2, 26, 13, 1, 13, 190], ["Sopapilla with honey (1)", 210, 3, 32, 8, 1, 15, 200], ["Margarita (8 oz)", 280, 0, 36, 0, 0, 32, 400], ["Horchata (1 cup)", 200, 1, 40, 4, 0, 30, 60],
];
export const BREAKFAST: Row[] = [
  ["Egg, scrambled with butter (1)", 100, 6.7, 1, 7.5, 0, 0.7, 90], ["Egg, fried (1)", 90, 6.3, 0.4, 6.8, 0, 0.2, 95], ["Egg, boiled or poached (1)", 78, 6.3, 0.6, 5.3, 0, 0.6, 62], ["Bacon (1 slice)", 43, 3, 0.1, 3.3, 0, 0, 137], ["Turkey bacon (1 slice)", 30, 2.4, 0.3, 2, 0, 0.2, 165], ["Sausage link (1)", 82, 4.5, 0.5, 7, 0, 0.3, 200], ["Sausage patty (1)", 100, 5.5, 0.5, 8.5, 0, 0.3, 250],
  ["White toast with butter (1 slice)", 110, 2.7, 13.5, 5, 0.8, 1.5, 170], ["Whole wheat toast, plain (1 slice)", 80, 4, 14, 1, 2, 1.5, 140], ["Pancake, 6 in (1)", 175, 5, 22, 7, 0.7, 5, 330], ["Waffle, 7 in (1)", 220, 6, 25, 11, 0.9, 4, 380], ["Maple syrup (2 tbsp)", 104, 0, 27, 0, 0, 24, 4], ["Butter (1 tbsp)", 102, 0.1, 0, 11.5, 0, 0, 90], ["Bagel, plain (1)", 275, 10.5, 54, 1.4, 2.3, 8.6, 440], ["Cream cheese (2 tbsp)", 99, 1.7, 1.6, 9.8, 0, 1.1, 91], ["Biscuit (1)", 212, 4, 27, 9.5, 0.8, 2, 520], ["Sausage gravy (½ cup)", 180, 5, 10, 13, 0.3, 1, 560], ["Croissant (1)", 231, 4.7, 26, 12, 1.5, 6.4, 270], ["Blueberry muffin (1 bakery)", 420, 6, 57, 19, 1.5, 32, 380],
  ["Oatmeal, made with water (1 cup)", 166, 5.9, 28, 3.6, 4, 0.6, 9], ["Brown sugar (1 tbsp)", 52, 0, 13.4, 0, 0, 13.3, 4], ["Cereal with ½ cup 2% milk (1 cup)", 170, 6, 30, 2.5, 1, 15, 250], ["Greek yogurt, plain (170 g)", 100, 17, 6, 0.7, 0, 5, 61], ["Flavored yogurt (6 oz)", 150, 6, 26, 2.5, 0, 24, 100], ["Banana (1)", 105, 1.3, 27, 0.4, 3.1, 14.4, 1], ["Berries (1 cup)", 70, 1, 17, 0.4, 3.5, 11, 1], ["Orange juice (1 cup)", 112, 1.7, 25.8, 0.5, 0.5, 20.8, 2],
  ["Hash brown patty (1)", 140, 1.3, 15, 9, 1.5, 0, 310], ["Home fries (1 cup)", 230, 3, 29, 12, 3, 1, 450], ["Breakfast burrito (1)", 500, 22, 42, 27, 3, 3, 1100], ["Avocado toast (1 slice)", 200, 5, 20, 12, 7, 2, 200], ["Coffee, black (8 oz)", 2, 0.3, 0, 0, 0, 0, 5], ["Coffee with cream & sugar (8 oz)", 60, 1, 6, 3.5, 0, 6, 15],
];
export const HIBACHI: Row[] = [
  ["Hibachi fried rice (1 cup)", 340, 8, 46, 13, 1, 1, 780], ["Steamed rice (1 cup)", 205, 4.3, 44.5, 0.4, 0.6, 0.1, 2], ["Yakisoba noodles (1 cup)", 300, 9, 45, 9, 2, 6, 900], ["Hibachi vegetables (1 cup)", 110, 3, 12, 6, 3, 5, 500],
  ["Steak (6 oz)", 400, 46, 2, 23, 0, 1, 650], ["Filet mignon (6 oz)", 400, 44, 1, 24, 0, 0, 450], ["Chicken (6 oz)", 300, 48, 3, 10, 0, 2, 700], ["Shrimp (6 oz)", 220, 40, 3, 5, 0, 1, 900], ["Scallops (6 oz)", 220, 30, 10, 6, 0, 1, 900], ["Salmon (6 oz)", 400, 37, 2, 26, 0, 1, 500], ["Lobster tail (1)", 220, 42, 1, 4, 0, 0, 900], ["Tofu (6 oz)", 240, 24, 6, 14, 3, 1, 500],
  ["Yum yum sauce (2 tbsp)", 160, 0, 1, 17, 0, 1, 180], ["Ginger sauce (2 tbsp)", 30, 0.5, 5, 1, 0.3, 3, 500], ["Extra butter (1 tbsp)", 102, 0.1, 0, 11.5, 0, 0, 90], ["Clear onion soup (1 cup)", 30, 1, 4, 1, 0, 1, 900], ["House salad, ginger dressing", 100, 1, 8, 7, 2, 5, 350],
];
export const BIBIMBAP: Row[] = [
  ["Short-grain white rice (1 cup)", 242, 4.4, 53.4, 0.4, 0.6, 0, 0], ["Multigrain / brown rice (1 cup)", 218, 4.5, 46, 1.6, 3.5, 0.7, 2], ["Beef bulgogi (3 oz)", 200, 17, 8, 11, 0.3, 6, 450], ["Spicy pork (3 oz)", 220, 15, 9, 14, 0.5, 7, 500], ["Chicken (3 oz)", 150, 22, 4, 5, 0, 3, 350], ["Tofu (3 oz)", 120, 13, 3, 7, 1.5, 0.5, 10], ["Fried egg (1)", 90, 6.3, 0.4, 6.8, 0, 0.2, 95],
  ["Spinach namul (¼ cup)", 30, 1.5, 2, 2, 1.2, 0.3, 170], ["Bean sprout namul (¼ cup)", 25, 1.5, 2, 1.3, 0.7, 0.5, 150], ["Sautéed carrots (¼ cup)", 25, 0.3, 3, 1.4, 0.9, 1.5, 60], ["Sautéed zucchini (¼ cup)", 20, 0.5, 1.5, 1.3, 0.5, 1, 80], ["Shiitake mushrooms (¼ cup)", 25, 0.7, 3, 1.3, 0.8, 0.8, 150], ["Kimchi (¼ cup)", 6, 0.4, 0.9, 0.2, 0.6, 0.4, 190], ["Gochujang sauce (1 tbsp)", 40, 0.6, 7, 1, 0.4, 5, 330], ["Sesame oil (1 tsp)", 40, 0, 0, 4.5, 0, 0, 0], ["Toasted seaweed strips (1 sheet)", 10, 1, 0.5, 0.4, 0.4, 0, 30],
];
export const COWBOY: Row[] = [
  ["Black beans, canned, drained (15 oz can)", 330, 21, 60, 1.2, 21, 1, 690], ["Black-eyed peas, canned, drained (15 oz can)", 300, 18, 54, 1.5, 12, 4, 800], ["Corn kernels (1 cup)", 125, 4.7, 27, 1.8, 3, 4.5, 5], ["Bell pepper (1 medium)", 37, 1.2, 7.2, 0.4, 2.5, 5, 5], ["Red onion, chopped (½ cup)", 32, 0.9, 7.5, 0.1, 1.4, 3.4, 3], ["Tomatoes (1 cup)", 27, 1.3, 5.8, 0.3, 1.8, 3.9, 7], ["Avocado (1 whole)", 240, 3, 12.8, 22, 10, 1, 10], ["Jalapeño (1)", 4, 0.1, 0.9, 0.1, 0.4, 0.6, 0], ["Cilantro (¼ cup)", 1, 0.1, 0.1, 0, 0.1, 0, 2], ["Feta (¼ cup)", 99, 5.3, 1.5, 8, 0, 1.5, 323],
  ["Olive oil (1 tbsp)", 119, 0, 0, 13.5, 0, 0, 0], ["Red wine vinegar (1 tbsp)", 3, 0, 0, 0, 0, 0, 1], ["Lime juice (1 tbsp)", 4, 0.1, 1.3, 0, 0.1, 0.3, 0], ["Sugar or honey (1 tbsp)", 48, 0, 12.6, 0, 0, 12.6, 0], ["Italian dressing (¼ cup)", 140, 0.2, 7, 12, 0, 5, 580], ["Salt (¼ tsp)", 0, 0, 0, 0, 0, 0, 575],
];
export const SOUP: Row[] = [
  ["Chicken noodle", 75, 4.5, 9, 2.4, 0.8, 1, 700], ["Chicken and rice", 85, 5, 11, 2.5, 0.7, 1, 700], ["Tomato (made with water)", 85, 2, 17, 1, 1.5, 10, 620], ["Cream of tomato (with milk)", 160, 6, 22, 6, 1.5, 15, 700], ["Cream of mushroom (with milk)", 175, 5, 14, 11, 0.5, 5, 770], ["Broccoli cheddar", 290, 11, 15, 21, 2, 4, 950], ["New England clam chowder", 200, 8, 18, 10, 1, 3, 850], ["Manhattan clam chowder", 90, 4, 12, 2.5, 1.5, 4, 600], ["Minestrone", 100, 4, 16, 2.5, 3, 4, 650], ["Lentil", 140, 8, 22, 2.5, 6, 3, 550], ["Split pea with ham", 190, 10, 28, 4.5, 4.5, 6, 900], ["Black bean", 170, 9, 27, 3, 7, 3, 800], ["Vegetable beef", 120, 8, 12, 4, 2, 3, 800], ["Beef stew", 220, 16, 17, 10, 2.5, 4, 750], ["Chili with beans", 260, 15, 25, 11, 7, 4, 1000],
  ["French onion (broth only)", 60, 2, 7, 2.5, 1, 4, 950], ["French onion with bread & cheese", 370, 15, 32, 20, 2, 8, 1300], ["Loaded potato", 260, 8, 22, 15, 2, 3, 800], ["Butternut squash", 140, 2, 20, 6, 3, 7, 500], ["Chicken tortilla", 210, 12, 18, 10, 3, 3, 900], ["Gumbo", 200, 14, 15, 9, 1.5, 2, 850], ["Matzo ball", 110, 5, 13, 3.5, 0.5, 1, 750], ["Wonton", 70, 5, 8, 2, 0.4, 0.7, 900], ["Egg drop", 65, 3, 8, 2, 0.5, 0.5, 900], ["Miso", 40, 3, 5, 1.3, 1, 1.5, 780], ["Gazpacho", 80, 1.5, 9, 4.5, 2, 6, 500],
  ["Pho with beef (full bowl)", 430, 30, 55, 9, 2, 5, 1600], ["Tonkotsu ramen (full bowl)", 700, 30, 80, 28, 4, 6, 2500], ["Instant ramen (1 package)", 380, 8, 52, 14, 2, 2, 1700],
];
export const SOUP_EXTRAS: Row[] = [["None", 0, 0, 0, 0, 0, 0, 0], ["Oyster crackers (½ oz)", 60, 1.3, 10, 1.5, 0.4, 0, 145], ["Saltines (5)", 63, 1.4, 11, 1.4, 0.4, 0.2, 150], ["Shredded cheese (2 tbsp)", 57, 3.5, 0.2, 4.7, 0, 0, 88], ["Sour cream (2 tbsp)", 47, 0.6, 1.1, 4.6, 0, 0.8, 8], ["Bread bowl (1)", 570, 22, 112, 3, 4, 6, 1200], ["Slice of bread with butter", 110, 2.7, 13.5, 5, 0.8, 1.5, 170]];
export const BAKING: Row[] = [
  ["All-purpose flour (1 cup)", 455, 12.9, 95.4, 1.2, 3.4, 0.3, 2], ["Whole wheat flour (1 cup)", 408, 16.4, 86.4, 3, 12.8, 0.5, 2], ["Granulated sugar (1 cup)", 774, 0, 200, 0, 0, 200, 2], ["Brown sugar, packed (1 cup)", 836, 0.3, 216, 0, 0, 213, 60], ["Powdered sugar (1 cup)", 467, 0, 120, 0, 0, 117, 2], ["Butter, unsalted (1 cup / 2 sticks)", 1628, 1.9, 0.1, 184, 0, 0.1, 25], ["Vegetable oil (1 cup)", 1927, 0, 0, 218, 0, 0, 0], ["Large egg (1)", 72, 6.3, 0.4, 4.8, 0, 0.2, 71],
  ["Whole milk (1 cup)", 149, 7.7, 11.7, 7.9, 0, 12.3, 105], ["Buttermilk (1 cup)", 98, 8.1, 11.7, 2.2, 0, 11.7, 257], ["Heavy cream (1 cup)", 814, 6.8, 6.6, 86, 0, 6.6, 64], ["Sour cream (1 cup)", 444, 5.6, 10, 44, 0, 8, 177], ["Cream cheese (8 oz block)", 794, 13.9, 12.6, 78, 0, 9, 710],
  ["Chocolate chips (1 cup)", 805, 7, 106, 50, 10, 91, 18], ["Cocoa powder (½ cup)", 98, 8.4, 24.8, 5.9, 14.3, 0.8, 9], ["Rolled oats (1 cup)", 307, 10.7, 54.8, 5.3, 8.2, 0.8, 5], ["Chopped walnuts (1 cup)", 765, 17.8, 16, 76.3, 7.8, 3, 2], ["Chopped pecans (1 cup)", 753, 10, 15, 78, 10.5, 4.4, 0], ["Honey (1 cup)", 1031, 1, 279, 0, 0.7, 278, 14], ["Maple syrup (1 cup)", 832, 0, 215, 0.2, 0, 191, 38], ["Peanut butter (1 cup)", 1517, 58, 56, 129, 15, 24, 1100],
  ["Mashed banana (1 cup)", 200, 2.4, 51, 0.7, 5.8, 27.5, 2], ["Pumpkin purée (1 cup)", 83, 2.7, 19.8, 0.7, 7.1, 8, 12], ["Sweetened coconut (1 cup)", 466, 2.7, 44.3, 33, 4.2, 40, 244], ["Raisins (1 cup)", 434, 4.5, 115, 0.7, 5.4, 85, 16], ["Vanilla extract (1 tsp)", 12, 0, 0.5, 0, 0, 0.5, 0], ["Baking powder (1 tsp)", 2, 0, 1.3, 0, 0, 0, 487], ["Baking soda (1 tsp)", 0, 0, 0, 0, 0, 0, 1259], ["Salt (1 tsp)", 0, 0, 0, 0, 0, 0, 2325],
];

const dish = (list: Row[], n: number) => (v: Record<string, number>) => { const t = build(v, list, n); return { ...t, ...macroPct(t) }; };
export const salad: CustomCalculator = dish(SALAD, 8);
export const poke: CustomCalculator = dish(POKE, 8);
export const smoothie: CustomCalculator = dish(SMOOTHIE, 6);
export const acai: CustomCalculator = dish(ACAI, 7);
export const sushi: CustomCalculator = dish(SUSHI, 6);
export const chinese: CustomCalculator = dish(CHINESE, 5);
export const indian: CustomCalculator = dish(INDIAN, 5);
export const burrito: CustomCalculator = dish(BURRITO, 10);
export const mexican: CustomCalculator = dish(MEXICAN, 5);
export const breakfast: CustomCalculator = dish(BREAKFAST, 6);
export const hibachi: CustomCalculator = dish(HIBACHI, 6);
export const bibimbap: CustomCalculator = dish(BIBIMBAP, 9);
export const cowboyCaviar: CustomCalculator = (v) => {
  const t = build(v, COWBOY, 12);
  const s = Math.max(1, nonNeg(v.servings, 8));
  return { caloriesPerServing: Math.round(t.calories / s), proteinPerServing: round1(t.protein / s), carbsPerServing: round1(t.carbs / s), fatPerServing: round1(t.fat / s), fiberPerServing: round1(t.fiber / s), sugarPerServing: round1(t.sugar / s), sodiumPerServing: Math.round(t.sodium / s), totalCalories: t.calories };
};
export const bakingCalories: CustomCalculator = (v) => {
  const t = build(v, BAKING, 10);
  const p = Math.max(1, nonNeg(v.pieces, 24));
  return { caloriesPerPiece: Math.round(t.calories / p), proteinPerPiece: round1(t.protein / p), carbsPerPiece: round1(t.carbs / p), fatPerPiece: round1(t.fat / p), sugarPerPiece: round1(t.sugar / p), sodiumPerPiece: Math.round(t.sodium / p), totalCalories: t.calories };
};
export const soup: CustomCalculator = (v) => {
  const size = [1, 1.5, 2][pick(v.size, 3)];
  const row = SOUP[pick(v.soup, SOUP.length)];
  const bowl = row[0].includes("bowl") || row[0].includes("package") ? 1 : size;
  const extra = SOUP_EXTRAS[pick(v.extra, SOUP_EXTRAS.length)];
  const t = totals([[row, bowl * nonNeg(v.servings, 1)], [extra, nonNeg(v.extraQty, 1)]]);
  return { ...t, sodiumDvPercent: round1((t.sodium / 2300) * 100) };
};

// ---------- Single-food and formula calculators ----------
export const BEER_STYLES: [string, number, number][] = [["Light beer", 4.2, 6.6], ["Lager / pilsner", 5, 12], ["Wheat / hefeweizen", 5.2, 15], ["Pale ale", 5.5, 15], ["IPA", 6.5, 18], ["Double IPA", 8.5, 24], ["Stout / porter", 6, 20], ["Belgian tripel / strong", 9, 22], ["Hard seltzer", 5, 2], ["Non-alcoholic beer", 0.5, 14], ["Custom", 0, 0]];
export const beerCalories: CustomCalculator = (v) => {
  const [, abvD, carbsD] = BEER_STYLES[pick(v.style, BEER_STYLES.length)];
  const custom = pick(v.style, BEER_STYLES.length) === BEER_STYLES.length - 1;
  const abv = custom ? nonNeg(v.abv) : abvD;
  const oz = nonNeg(v.ounces, 12);
  const carbs = (custom ? nonNeg(v.carbsPer12) : carbsD) * (oz / 12);
  const alcG = oz * 29.5735 * (abv / 100) * 0.789;
  const kcal = alcG * 7 + carbs * 4;
  const n = nonNeg(v.drinks, 1);
  return { caloriesPerDrink: Math.round(kcal), totalCalories: Math.round(kcal * n), carbsPerDrink: round1(carbs), alcoholGramsPerDrink: round1(alcG), standardDrinks: round2((alcG / 14) * n), minutesWalkingToBurn: Math.round((kcal * n) / 4.5) };
};

/** Chicken per 100 g: [label, raw kcal, raw protein, raw fat, cooked kcal, cooked protein, cooked fat]. */
export const CHICKEN_CUTS: [string, number, number, number, number, number, number][] = [
  ["Breast, skinless", 120, 22.5, 2.6, 165, 31, 3.6], ["Breast, with skin", 172, 20.9, 9.3, 197, 29.8, 7.8], ["Thigh, skinless", 121, 19.7, 4.1, 209, 26, 10.9], ["Thigh, with skin", 221, 16.5, 16.6, 229, 23.3, 14.7], ["Drumstick, skinless", 119, 20.6, 3.7, 172, 28.3, 5.7], ["Wing, with skin", 191, 17.5, 12.9, 290, 26.9, 19.5], ["Ground chicken", 143, 17.4, 8.1, 189, 23.3, 10.9],
];
export const chickenProtein: CustomCalculator = (v) => {
  const c = CHICKEN_CUTS[pick(v.cut, CHICKEN_CUTS.length)];
  const g = nonNeg(v.weight) * [28.3495, 1, 453.592][pick(v.weightUnit, 3)] / 100;
  const cooked = pick(v.state, 2) === 1;
  const [k, p, f] = cooked ? [c[4], c[5], c[6]] : [c[1], c[2], c[3]];
  return { protein: round1(p * g), calories: Math.round(k * g), fat: round1(f * g), proteinPer100g: p, proteinPerOz: round1(p * 0.283495), caloriesFromProteinPercent: round1(k > 0 ? ((p * 4) / k) * 100 : 0) };
};

export const BEEF_LEAN: [string, number, number][] = [["70/30", 14.4, 30], ["75/25", 15.8, 25], ["80/20", 17.2, 20], ["85/15", 18.6, 15], ["90/10", 20, 10], ["93/7", 21, 7], ["95/5", 21.4, 5], ["97/3", 22, 3]];
export const groundBeefProtein: CustomCalculator = (v) => {
  const [, pRaw, fRaw] = BEEF_LEAN[pick(v.lean, BEEF_LEAN.length)];
  const g = nonNeg(v.weight) * [28.3495, 1, 453.592][pick(v.weightUnit, 3)];
  const cooked = pick(v.state, 2) === 1;
  // Raw weight that gives this cooked weight; cooked keeps all protein and ~70% of the fat.
  const rawG = cooked ? g / 0.72 : g;
  const protein = (pRaw * rawG) / 100;
  const fat = ((fRaw * rawG) / 100) * (cooked ? 0.7 : 1);
  const kcal = protein * 4 + fat * 9;
  return { protein: round1(protein), calories: Math.round(kcal), fat: round1(fat), proteinPer4oz: round1((protein / g) * 113.4), caloriesPer4oz: Math.round((kcal / g) * 113.4), rawWeightGrams: Math.round(rawG) };
};

export const pizzaNutrition: CustomCalculator = (v) => {
  const sizeF = [0.68, 0.74, 1, 0.87][pick(v.size, 4)];
  const crustF = [0.75, 1, 1.25, 1.35][pick(v.crust, 4)];
  const top = [[0, 0, 0, 0, 0], [40, 2, 0, 3.5, 140], [50, 2.5, 0.5, 4.2, 150], [10, 0.5, 2, 0.2, 30], [110, 6, 1, 9, 400], [60, 3, 3, 4, 200]][pick(v.toppings, 6)];
  const base = [285 * crustF, 12, 36 * crustF, 10 * crustF, 640];
  const n = nonNeg(v.slices, 2);
  const kcal = (base[0] + top[0]) * sizeF;
  return { caloriesPerSlice: Math.round(kcal), totalCalories: Math.round(kcal * n), proteinTotal: round1((base[1] + top[1]) * sizeF * n), carbsTotal: round1((base[2] + top[2]) * sizeF * n), fatTotal: round1((base[3] + top[3]) * sizeF * n), sodiumTotal: Math.round((base[4] + top[4]) * sizeF * n) };
};

export const COFFEE_DRINKS: [string, number, number][] = [["Latte", 0.8, 0], ["Cappuccino", 0.55, 0], ["Flat white", 0.6, 0], ["Mocha (with chocolate sauce)", 0.65, 100], ["Caramel macchiato", 0.75, 40], ["Americano", 0, 0], ["Drip coffee", 0, 0], ["Cold brew", 0, 0], ["Frappuccino-style blended", 0.45, 150], ["Chai latte", 0.5, 120]];
export const MILKS: [string, number, number, number, number][] = [["Whole milk", 18.6, 1, 1, 1.5], ["2% milk", 15.25, 1, 0.6, 1.5], ["Skim milk", 10.4, 1, 0, 1.5], ["Oat milk", 17.5, 0.4, 0.75, 0.9], ["Almond milk (unsweetened)", 4.6, 0.2, 0.35, 0], ["Soy milk", 13, 1, 0.55, 1], ["Coconut milk (beverage)", 9, 0.1, 0.6, 0.8], ["Half-and-half", 39, 0.9, 3.5, 1.3]];
export const coffeeCalories: CustomCalculator = (v) => {
  const [, milkShare, extra] = COFFEE_DRINKS[pick(v.drink, COFFEE_DRINKS.length)];
  const oz = [8, 12, 16, 20, 24][pick(v.size, 5)];
  const [, kcalOz, proteinOz, fatOz, sugarOz] = MILKS[pick(v.milk, MILKS.length)];
  const milkOz = oz * milkShare + nonNeg(v.splashOz);
  const syrup = nonNeg(v.syrupPumps) * 20;
  const whip = pick(v.whip, 2) === 1 ? 80 : 0;
  const sizeF = oz / 16;
  const kcal = milkOz * kcalOz + syrup + whip + extra * sizeF + nonNeg(v.sugarPackets) * 16;
  return { calories: Math.round(kcal), sugarGrams: round1(milkOz * sugarOz + nonNeg(v.syrupPumps) * 5 + nonNeg(v.sugarPackets) * 4 + (extra * sizeF) / 5.5 + (whip ? 2 : 0)), fatGrams: round1(milkOz * fatOz + (whip ? 8 : 0) + (extra * sizeF) / 40), proteinGrams: round1(milkOz * proteinOz), milkOunces: round1(milkOz), caloriesFromAddOns: Math.round(syrup + whip + nonNeg(v.sugarPackets) * 16) };
};

export const bubbleTea: CustomCalculator = (v) => {
  const sizeF = [1, 1.5, 0.75][pick(v.size, 3)];
  const sugarLevel = [0, 0.25, 0.5, 0.75, 1, 1.2][pick(v.sweetness, 6)];
  const flavor = pick(v.flavor, 5); // milk tea, matcha, taro, fruit/green tea, brown-sugar
  const flavorKcal = [0, 15, 80, 20, 0][flavor];
  const flavorSugar = [0, 2, 10, 3, 0][flavor];
  const syrupG = (flavor === 4 ? 60 : 50) * sugarLevel;
  const milk = pick(v.milk, 5); // none, whole milk, non-dairy creamer, oat milk, half and half mix
  const milkKcal = [0, 75, 120, 60, 85][milk];
  const milkSugar = [0, 6, 5, 4, 5.5][milk];
  const t = pick(v.topping, 6);
  const servings = nonNeg(v.toppingServings, 1);
  const toppingKcal = [0, 135, 70, 100, 70, 45][t] * servings;
  const toppingSugar = [0, 10, 15, 14, 16, 8][t] * servings;
  const sugar = (syrupG + flavorSugar + milkSugar) * sizeF + toppingSugar;
  const kcal = (flavorKcal + syrupG * 4 + milkKcal) * sizeF + toppingKcal;
  return { calories: Math.round(kcal), sugarGrams: round1(sugar), caloriesFromToppings: Math.round(toppingKcal), caloriesFromSugar: Math.round(syrupG * 4 * sizeF), teaspoonsOfSugar: round1(sugar / 4.2), sugarDailyLimitPercent: round1((sugar / 50) * 100) };
};

/** Juice per 8 oz: kcal, protein, carbs, fat, fiber, sugar, sodium, vitamin C mg, potassium mg. */
export const JUICES: [string, number, number, number, number, number, number, number, number, number][] = [
  ["Orange juice", 112, 1.7, 25.8, 0.5, 0.5, 20.8, 2, 124, 496], ["Apple juice", 114, 0.2, 28, 0.3, 0.5, 24, 10, 2, 250], ["Grape juice", 152, 1.4, 37.4, 0.3, 0.5, 35.9, 13, 0.3, 263], ["Cranberry juice cocktail", 137, 0, 34, 0.3, 0, 30, 5, 107, 46], ["Cranberry juice, 100% unsweetened", 116, 1, 31, 0.3, 0.3, 31, 5, 23, 195], ["Pineapple juice", 133, 0.9, 32.2, 0.3, 0.5, 25, 5, 25, 325], ["Grapefruit juice", 96, 1.2, 22.7, 0.2, 0.2, 22.5, 2, 72, 400], ["Pomegranate juice", 134, 0.4, 32.7, 0.7, 0.2, 31.5, 22, 0.2, 533], ["Prune juice", 182, 1.6, 44.7, 0.1, 2.6, 42, 10, 10, 707],
  ["Tomato juice", 41, 1.9, 8.6, 0.7, 1, 6, 650, 45, 556], ["Vegetable juice (V8-style)", 45, 2, 10, 0, 2, 7, 620, 60, 470], ["Carrot juice", 94, 2.2, 21.9, 0.4, 1.9, 9.2, 156, 20, 689], ["Celery juice", 42, 2, 9, 0.4, 1.5, 6, 215, 7, 625], ["Beet juice", 110, 3, 24, 0, 1, 22, 190, 7, 450], ["Green juice (kale, celery, cucumber, apple)", 90, 3, 20, 0.5, 1, 15, 150, 60, 600], ["Coconut water", 46, 1.7, 8.9, 0.5, 2.6, 6.3, 252, 5.8, 600], ["Lemonade", 99, 0.2, 26, 0.1, 0.2, 25, 7, 7, 37],
];
export const juiceNutrition: CustomCalculator = (v) => {
  const j = JUICES[pick(v.juice, JUICES.length)];
  const f = nonNeg(v.ounces, 8) / 8;
  return { calories: Math.round(j[1] * f), sugarGrams: round1(j[6] * f), carbsGrams: round1(j[3] * f), vitaminCMg: round1(j[8] * f), vitaminCDvPercent: Math.round(((j[8] * f) / 90) * 100), potassiumMg: Math.round(j[9] * f), sodiumMg: Math.round(j[7] * f), teaspoonsOfSugar: round1((j[6] * f) / 4.2) };
};

export const AVOCADO_SIZES: [string, number][] = [["Small Hass (≈ 100 g flesh)", 100], ["Medium Hass (≈ 136 g flesh)", 136], ["Large Hass (≈ 200 g flesh)", 200], ["Florida / green-skin (≈ 300 g flesh)", 300]];
export const avocado: CustomCalculator = (v) => {
  const florida = pick(v.size, AVOCADO_SIZES.length) === 3;
  const g = pick(v.mode, 2) === 1 ? nonNeg(v.grams) : AVOCADO_SIZES[pick(v.size, AVOCADO_SIZES.length)][1] * nonNeg(v.count, 1);
  const per = florida ? [120, 2.2, 7.8, 10.1, 5.6, 2.4, 351] : [160, 2, 8.5, 14.7, 6.7, 0.7, 485];
  const k = g / 100;
  return { calories: Math.round(per[0] * k), fat: round1(per[3] * k), fiber: round1(per[4] * k), carbs: round1(per[2] * k), netCarbs: round1((per[2] - per[4]) * k), protein: round1(per[1] * k), potassiumMg: Math.round(per[6] * k), grams: Math.round(g) };
};

/** Brassica per 100 g raw: kcal, protein, carbs, fiber, vitamin C mg, vitamin K µg, grams per raw cup. */
export const BRASSICAS: [string, number, number, number, number, number, number, number][] = [
  ["Broccoli", 34, 2.8, 6.6, 2.6, 89, 102, 91], ["Cauliflower", 25, 1.9, 5, 2, 48, 15.5, 107], ["Green cabbage", 25, 1.3, 5.8, 2.5, 36.6, 76, 89], ["Red cabbage", 31, 1.4, 7.4, 2.1, 57, 38, 89], ["Kale", 35, 2.9, 4.4, 4.1, 93, 390, 21], ["Brussels sprouts", 43, 3.4, 9, 3.8, 85, 177, 88], ["Bok choy", 13, 1.5, 2.2, 1, 45, 46, 70], ["Collard greens", 32, 3, 5.4, 4, 35, 437, 36], ["Arugula", 25, 2.6, 3.7, 1.6, 15, 109, 20], ["Kohlrabi", 27, 1.7, 6.2, 3.6, 62, 0.1, 135],
];
export const brassica: CustomCalculator = (v) => {
  const b = BRASSICAS[pick(v.veg, BRASSICAS.length)];
  const cooked = pick(v.state, 2) === 1;
  // Cooked cups hold about 1.7× the raw weight; boiling leaches about 40% of vitamin C.
  const g = pick(v.unit, 2) === 1 ? nonNeg(v.amount) : nonNeg(v.amount) * b[7] * (cooked ? 1.7 : 1);
  const k = g / 100;
  return { calories: Math.round(b[1] * k), fiber: round1(b[4] * k), protein: round1(b[2] * k), carbs: round1(b[3] * k), vitaminCMg: round1(b[5] * k * (cooked ? 0.6 : 1)), vitaminKMcg: Math.round(b[6] * k), grams: Math.round(g) };
};

export const EGGPLANT_SIZES: [string, number][] = [["Small (≈ 300 g)", 300], ["Medium (≈ 450 g)", 450], ["Large (≈ 550 g)", 550], ["Japanese / Chinese (≈ 150 g)", 150]];
export const aubergine: CustomCalculator = (v) => {
  const g = pick(v.mode, 2) === 1 ? nonNeg(v.grams) : EGGPLANT_SIZES[pick(v.size, EGGPLANT_SIZES.length)][1] * nonNeg(v.count, 1) * 0.92;
  const method = pick(v.method, 4);
  const oilTbsp = method === 3 ? (g / 100) * 1.1 : method === 2 ? nonNeg(v.oilTbsp) : 0; // frying absorbs ≈ 15 g oil per 100 g
  const k = g / 100;
  const kcal = 25 * k + oilTbsp * 119;
  return { calories: Math.round(kcal), fiber: round1(3 * k), carbs: round1(5.9 * k), fat: round1(0.2 * k + oilTbsp * 13.5), protein: round1(1 * k), potassiumMg: Math.round(229 * k), caloriesFromOil: Math.round(oilTbsp * 119), grams: Math.round(g) };
};

/** Rice per 100 g cooked: kcal, protein, carbs, fat, fiber, sodium; grams per cooked cup; dry→cooked factor. */
export const RICES: [string, number, number, number, number, number, number, number, number][] = [
  ["White long-grain", 130, 2.7, 28.2, 0.3, 0.4, 1, 158, 3], ["Jasmine", 129, 2.7, 28, 0.3, 0.4, 1, 158, 3], ["Basmati", 121, 3.5, 25.2, 0.4, 0.4, 1, 163, 3], ["Brown", 123, 2.7, 25.6, 1, 1.6, 4, 195, 2.6], ["Wild", 101, 4, 21.3, 0.3, 1.8, 3, 164, 3.3], ["Sushi rice (seasoned)", 150, 2.4, 33, 0.3, 0.4, 200, 175, 2.6], ["Fried rice", 174, 4.7, 24, 6.3, 0.9, 400, 137, 1],
];
export const riceCalories: CustomCalculator = (v) => {
  const r = RICES[pick(v.rice, RICES.length)];
  const mode = pick(v.mode, 3);
  const g = mode === 0 ? nonNeg(v.amount) * r[7] : mode === 1 ? nonNeg(v.amount) : nonNeg(v.amount) * 185 * r[8];
  const k = g / 100;
  return { calories: Math.round(r[1] * k), carbs: round1(r[3] * k), protein: round1(r[2] * k), fat: round1(r[4] * k), fiber: round1(r[5] * k), sodiumMg: Math.round(r[6] * k), cookedGrams: Math.round(g), cookedCups: round2(g / r[7]) };
};

const steps = (x: number, thresholds: number[]) => thresholds.filter((t) => x > t).length;
export const foodHealthScore: CustomCalculator = (v) => {
  const kj = nonNeg(v.calories) * 4.184;
  const energy = steps(kj, [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350]);
  const sugar = steps(nonNeg(v.sugar), [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45]);
  const sat = steps(nonNeg(v.saturatedFat), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const sodium = steps(nonNeg(v.sodium), [90, 180, 270, 360, 450, 540, 630, 720, 810, 900]);
  const negative = energy + sugar + sat + sodium;
  const fvn = nonNeg(v.fruitVegPercent);
  const fruit = fvn > 80 ? 5 : fvn > 60 ? 2 : fvn > 40 ? 1 : 0;
  const fiber = steps(nonNeg(v.fiber), [0.9, 1.9, 2.8, 3.7, 4.7]);
  const protein = steps(nonNeg(v.protein), [1.6, 3.2, 4.8, 6.4, 8.0]);
  const positive = fruit + fiber + (negative >= 11 && fruit < 5 ? 0 : protein);
  const score = negative - positive;
  const grade = score <= -1 ? 1 : score <= 2 ? 2 : score <= 10 ? 3 : score <= 18 ? 4 : 5;
  return { nutriScoreGrade: grade, score, negativePoints: negative, positivePoints: positive, healthScore100: Math.round(Math.max(0, Math.min(100, ((40 - score) / 55) * 100))), proteinCounted: negative >= 11 && fruit < 5 ? 0 : 1 };
};

/** FDA mean mercury (ppm = µg/g) and FDA/EPA advice group (1 best, 2 good, 3 avoid). */
export const FISH: [string, number, number][] = [
  ["Salmon (fresh/frozen)", 0.022, 1], ["Shrimp", 0.009, 1], ["Tilapia", 0.013, 1], ["Sardines", 0.013, 1], ["Anchovies", 0.017, 1], ["Catfish", 0.024, 1], ["Pollock", 0.031, 1], ["Scallops", 0.003, 1], ["Crab", 0.065, 1], ["Trout (freshwater)", 0.071, 1], ["Herring", 0.078, 1], ["Atlantic mackerel", 0.05, 1], ["Cod", 0.111, 1], ["Lobster (American)", 0.107, 1], ["Canned light tuna", 0.126, 1],
  ["Snapper", 0.166, 2], ["Mahi-mahi", 0.178, 2], ["Halibut", 0.241, 2], ["Albacore (white) tuna, canned", 0.35, 2], ["Yellowfin tuna", 0.354, 2], ["Chilean sea bass", 0.354, 2], ["Grouper", 0.448, 2],
  ["Marlin", 0.485, 3], ["Orange roughy", 0.571, 3], ["Bigeye tuna", 0.689, 3], ["King mackerel", 0.73, 3], ["Shark", 0.979, 3], ["Swordfish", 0.995, 3], ["Tilefish (Gulf of Mexico)", 1.123, 3],
];
export const fishMercury: CustomCalculator = (v) => {
  const [, ppm, group] = FISH[pick(v.fish, FISH.length)];
  const kg = pick(v.weightUnit, 2) === 1 ? nonNeg(v.weight) : nonNeg(v.weight) * 0.453592;
  const weeklyUg = nonNeg(v.ouncesPerWeek) * 28.3495 * ppm;
  const limit = 0.1 * kg * 7;
  return { mercuryMcgPerWeek: round1(weeklyUg), weeklyLimitMcg: round1(limit), percentOfLimit: round1(limit > 0 ? (weeklyUg / limit) * 100 : 0), maxOuncesPerWeek: round1(ppm > 0 ? limit / (28.3495 * ppm) : 0), mercuryPpm: ppm, fdaGroup: group };
};

export const foodNutritionCustomCalculators: Record<string, CustomCalculator> = {
  "nutrition-calculator": nutrition,
  "recipe-nutrition-calculator": recipeNutrition,
  "beer-calorie-calculator": beerCalories,
  "salad-calories-calculator": salad,
  "poke-bowl-calorie-calculator": poke,
  "smoothie-calorie-calculator": smoothie,
  "sushi-calorie-calculator": sushi,
  "chicken-protein-calculator": chickenProtein,
  "pizza-nutrition-calculator": pizzaNutrition,
  "coffee-calorie-calculator": coffeeCalories,
  "chinese-food-calories-calculator": chinese,
  "indian-food-calorie-calculator": indian,
  "burrito-calorie-calculator": burrito,
  "juice-nutrition-calculator": juiceNutrition,
  "bubble-tea-calorie-calculator": bubbleTea,
  "baking-calorie-calculator": bakingCalories,
  "acai-bowl-calories-calculator": acai,
  "avocado-nutrition-calculator": avocado,
  "ground-beef-protein-calculator": groundBeefProtein,
  "brassica-calories-calculator": brassica,
  "food-health-score-calculator": foodHealthScore,
  "fish-mercury-calculator": fishMercury,
  "breakfast-calories-calculator": breakfast,
  "cowboy-caviar-nutrition-calculator": cowboyCaviar,
  "hibachi-calories-calculator": hibachi,
  "bibimbap-nutrition-calculator": bibimbap,
  "mexican-food-nutrition-calculator": mexican,
  "rice-calorie-calculator": riceCalories,
  "soup-calorie-calculator": soup,
  "aubergine-nutrition-calculator": aubergine,
};
