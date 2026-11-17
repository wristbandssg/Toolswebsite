// Idea build, batch food6 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Food > Nutrition & Calories — 54 single-food calorie tools.
// Data: src/lib/calc-engine-idea-food6.ts (USDA FoodData Central typical values; mixed/restaurant dishes are labelled estimates).
// Registry entries are generated from the F list below (tools are built by a helper). Create-only.
// Run: npm run db:create-idea-food6-calculators

import * as E from "../src/lib/calc-engine-idea-food6";
import { q, num, dd, runIdeas, type ToolDef } from "./idea-kit";
import type { TrvCalculator as Calc } from "../src/lib/trv-core";

// [slug, data key / fn name, food name for copy, default row]
export const F: [string, keyof typeof E.D, string, number][] = [
  ["calories-in-banana-calculator", "banana", "Banana", 1], ["calories-in-apple-calculator", "apple", "Apple", 1], ["calories-in-oatmeal-calculator", "oatmeal", "Oatmeal", 1], ["calories-in-pasta-calculator", "pasta", "Pasta", 0],
  ["calories-in-wine-calculator", "wine", "Wine", 0], ["calories-in-vodka-calculator", "vodka", "Vodka", 0], ["calories-in-whiskey-calculator", "whiskey", "Whiskey", 0], ["calories-in-peanut-butter-calculator", "peanutButter", "Peanut Butter", 1],
  ["calories-in-salmon-calculator", "salmon", "Salmon", 0], ["calories-in-shrimp-calculator", "shrimp", "Shrimp", 0], ["calories-in-steak-calculator", "steak", "Steak", 0], ["calories-in-bacon-calculator", "bacon", "Bacon", 0],
  ["calories-in-butter-calculator", "butter", "Butter", 1], ["calories-in-olive-oil-calculator", "oliveOil", "Olive Oil", 1], ["calories-in-yogurt-calculator", "yogurt", "Yogurt", 2], ["calories-in-honey-calculator", "honey", "Honey", 1],
  ["calories-in-dates-fruit-calculator", "dates", "Dates", 0], ["calories-in-mango-calculator", "mango", "Mango", 0], ["calories-in-watermelon-calculator", "watermelon", "Watermelon", 0], ["calories-in-grapes-calculator", "grapes", "Grapes", 0],
  ["calories-in-almonds-calculator", "almonds", "Almonds", 0], ["calories-in-popcorn-calculator", "popcorn", "Popcorn", 0], ["calories-in-chocolate-calculator", "chocolate", "Chocolate", 0], ["calories-in-tortilla-calculator", "tortilla", "Tortillas", 1],
  ["calories-in-bagel-calculator", "bagel", "Bagels", 0], ["calories-in-croissant-calculator", "croissant", "Croissants", 1], ["calories-in-donut-calculator", "donut", "Donuts", 0], ["calories-in-pancakes-calculator", "pancakes", "Pancakes", 1],
  ["calories-in-fried-chicken-calculator", "friedChicken", "Fried Chicken", 0], ["calories-in-french-fries-calculator", "fries", "French Fries", 1], ["calories-in-hummus-calculator", "hummus", "Hummus", 0], ["calories-in-quinoa-calculator", "quinoa", "Quinoa", 0],
  ["calories-in-lentils-calculator", "lentils", "Lentils", 0], ["calories-in-chickpeas-calculator", "chickpeas", "Chickpeas", 0], ["calories-in-sweet-potato-calculator", "sweetPotato", "Sweet Potato", 0], ["calories-in-corn-calculator", "corn", "Corn", 0],
  ["calories-in-soda-calculator", "soda", "Soda", 0], ["calories-in-protein-shake-calculator", "proteinShake", "Protein Shakes", 0], ["calories-in-nasi-lemak-calculator", "nasiLemak", "Nasi Lemak", 0], ["calories-in-ramen-calculator", "ramen", "Ramen", 0],
  ["calories-in-pho-calculator", "pho", "Pho", 0], ["calories-in-kebab-calculator", "kebab", "Kebab", 0], ["calories-in-shawarma-calculator", "shawarma", "Shawarma", 0], ["calories-in-falafel-calculator", "falafel", "Falafel", 0],
  ["calories-in-lasagna-calculator", "lasagna", "Lasagna", 0], ["calories-in-mac-and-cheese-calculator", "macCheese", "Mac and Cheese", 0], ["calories-in-granola-calculator", "granola", "Granola", 0], ["calories-in-kombucha-calculator", "kombucha", "Kombucha", 0],
  ["calories-in-cottage-cheese-calculator", "cottage", "Cottage Cheese", 0], ["calories-in-tofu-calculator", "tofu", "Tofu", 0], ["calories-in-tuna-calculator", "tuna", "Tuna", 0], ["calories-in-turkey-meat-calculator", "turkey", "Turkey", 0],
  ["calories-in-lamb-calculator", "lamb", "Lamb", 0], ["calories-in-goat-meat-calculator", "goat", "Goat Meat", 0],
];

const lc = (s: string) => s.replace(/\s*—\s*estimate/i, "").replace(/^(.)/, (c) => c.toLowerCase());
const TOOLS: ToolDef[] = F.map(([slug, key, name, d]) => {
  const rows = E.D[key], r0 = rows[d], est = rows.some((r) => /estimate/i.test(r[0]));
  const hi = [...rows].sort((a, b) => b[2] - a[2])[0];
  return q({
    slug, title: `Calories in ${name} Calculator`,
    desc: `Find the calories, protein, carbs, fat, fiber, sugar and sodium in ${name.toLowerCase()} — ${rows.slice(0, 3).map((r) => lc(r[0]).split(" (")[0]).join(", ")} and more — for any number of servings.`,
    inputs: [dd("f", "Type and Serving", rows.map((r) => r[0]), d), num("q", "Servings", 1, 0, 1000, 0.25)],
    results: [["kcal", "Calories", "t"], ["mac", "Macros", "t"], ["more", "Fiber, Sugar, Sodium", "t"]],
    fn: (E as unknown as Record<string, Calc>)[key as string], ex: { f: d, q: 1 }, exd: lc(r0[0]),
    how: "Calories and nutrients = per-serving values × number of servings.",
    assume: est ? "Basic foods use USDA FoodData Central values; restaurant and mixed dishes are typical-portion estimates — recipes vary a lot." : "Typical values from USDA FoodData Central — brands vary; check the label when you have one.",
    faq: [[`How many calories in ${lc(r0[0])}?`, `About ${r0[1]} kcal, with ${r0[2]} g protein, ${r0[3]} g carbs and ${r0[4]} g fat.`], [`Which ${name.toLowerCase()} option has the most protein?`, `${hi[0].replace(/\s*—\s*estimate/i, "")} — about ${hi[2]} g.`]],
  });
});

runIdeas([["food-nutrition-calorie-calculators", TOOLS]]).catch((e) => { console.error(e); process.exit(1); });
