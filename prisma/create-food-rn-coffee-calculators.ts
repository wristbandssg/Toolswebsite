// One-time (but safe to re-run) batch setup script: creates 10 restaurant calorie calculators in
// Food & Drink Calculators > Restaurant & Fast Food Nutrition Calculators > Coffee, Smoothie & Dessert Shop Nutrition Calculators.
// Each is a meal builder over that chain's published menu calories
// (src/lib/calc-engine-food-rn-coffee.ts); examples and FAQ figures are computed from the menu data.
//
// HOW TO RUN (after prisma/setup-food-drink-category.ts --apply)
//   npx tsx prisma/create-food-rn-coffee-calculators.ts
// or
//   npm run db:create-food-rn-coffee-calculators

import * as E from "../src/lib/calc-engine-food-rn-coffee";

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(key: string, label: string, opts: { unit?: string; default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "number", unit: opts.unit, required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const CAT = "coffee-smoothie-dessert-shop-nutrition-calculators";
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const RESULTS = [
  { key: "totalCalories", label: "Meal Calories", format: "number", highlight: true },
  { key: "percentOfDailyCalories", label: "Share of Your Daily Calories (%)", format: "number" },
  { key: "caloriesLeftToday", label: "Calories Left Today", format: "number" },
  { key: "walkingMinutesToBurn", label: "Minutes of Brisk Walking to Burn It", format: "number" },
  { key: "runningMinutesToBurn", label: "Minutes of Running to Burn It", format: "number" },
  { key: "items", label: "Items in the Meal", format: "number" },
  { key: "biggestItemCalories", label: "Highest-Calorie Item (kcal)", format: "number" },
];

/** First index whose name matches, else fallback. */
const find = (menu: E.MenuItem[], re: RegExp, fallback = 0) => {
  const i = menu.findIndex(([n]) => re.test(n));
  return i >= 0 ? i : fallback;
};

interface Brand { slug: string; brand: string; menu: E.MenuItem[]; title?: string; kind: string; tip: string }
function mk(b: Brand): ToolDef {
  const m = b.menu;
  const main = 0;
  const side = find(m, /fries|tots|rings|side|potato|biscuit|slaw|rice|chips/i, 1);
  const drink = find(m, /coke|coca|cola|tea|lemonade|shake|dr pepper|juice|limeade|slush/i, m.length - 1);
  const slots = [[main, 1], [side, 1], [drink, drink === main || drink === side ? 0 : 1], [find(m, /sauce|dip|dressing|cookie|pie|sundae|brownie|cone/i, 2), 0], [3 % m.length, 0], [4 % m.length, 0], [5 % m.length, 0], [6 % m.length, 0]];
  const inputs = [...slots.flatMap(([idx, q], i) => [dropdown(`item${i + 1}`, `Menu Item ${i + 1}`, m.map(([n, c], j) => [`${n} — ${c} cal`, j] as [string, number]), idx), numberField(`qty${i + 1}`, `Item ${i + 1} — How Many`, { default: q, max: 20, step: 1 })]), numberField("dailyTarget", "Your Daily Calorie Target", { default: 2000, min: 800, max: 6000, step: 50 })];
  const ex: Record<string, number> = { dailyTarget: 2000 };
  slots.forEach(([idx, q], i) => { ex[`item${i + 1}`] = idx; ex[`qty${i + 1}`] = q; });
  const o = E.mealCalories(m)(ex) as Record<string, number>;
  const sorted = [...m].filter(([, c]) => c > 0).sort((a, b2) => a[1] - b2[1]);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  const title = b.title ?? `${b.brand} Nutrition Calculator`;
  const desc = `Build a ${b.brand} meal and count the calories — ${m.slice(0, 3).map(([n]) => n).join(", ")} and ${m.length - 3}+ more ${b.kind} — with your daily calorie share and the exercise needed to burn it off.`;
  return {
    slug: b.slug,
    title: `${title} (Meal Calorie Counter)`,
    description: desc,
    metaTitle: `${title} — ${b.brand} Calories by Menu Item`.slice(0, 70),
    metaDescription: desc.length > 158 ? `${desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : desc,
    calcInputs: inputs,
    calcResult: { label: "Meal Calories", format: "number" },
    calcResults: RESULTS,
    instructions: paragraphsToHtml(`Pick up to eight ${b.brand} menu items and how many of each. The calories shown next to each item are ${b.brand}'s published US figures; where a chain sells several sizes, the smallest and largest sizes are listed.\n\n${b.tip}`),
    examples: paragraphsToHtml(`Example: ${m[slots[0][0]][0]}, ${m[slots[1][0]][0]}${slots[2][1] ? ` and ${m[slots[2][0]][0]}` : ""} come to ${fmt(o.totalCalories)} calories — ${o.percentOfDailyCalories}% of a 2,000-calorie day, or about ${o.walkingMinutesToBurn} minutes of brisk walking.`),
    assumptions: paragraphsToHtml(`Calories per item are ${b.brand}'s published US nutrition figures as collected in November 2026; recipes, portions and regional menus change, so check ${b.brand}'s own nutrition information for the latest values and for protein, carbs, fat, sodium and allergens. Exercise times are for a 155 lb adult (brisk walking ≈ 4.5 kcal/min, running ≈ 11 kcal/min).\n\nThis calculator is independent and is not affiliated with or endorsed by ${b.brand}.`),
    faq: [
      { question: `How many calories are in a ${b.brand} ${m[0][0]}?`, answer: `${fmt(m[0][1])} calories, based on ${b.brand}'s published nutrition information.` },
      { question: `What is the lowest-calorie item on this ${b.brand} list?`, answer: `${lowest[0]}, at ${fmt(lowest[1])} calories (zero-calorie drinks aside).` },
      { question: `What is the highest-calorie item on this ${b.brand} list?`, answer: `${highest[0]}, at ${fmt(highest[1])} calories.` },
    ],
  };
}

const TOOLS: ToolDef[] = [
  mk({ slug: "starbucks-calorie-calculator", brand: "Starbucks", title: "Starbucks Calorie Calculator", menu: E.MENUS.starbucks, kind: "lattes, macchiatos, mochas, Frappuccinos, refreshers, breakfast sandwiches and bakery items", tip: "For drinks, the smallest size listed is a Short or Tall and the largest a Venti, made with Starbucks' standard 2% milk and whipped cream where the recipe includes it. Asking for nonfat milk or no whip saves 30–120 calories." }),
  mk({ slug: "dunkin-calorie-calculator", brand: "Dunkin'", title: "Dunkin' Calorie Calculator", menu: E.MENUS.dunkin, kind: "donuts, Munchkins, Wake-Up Wraps, breakfast sandwiches, hash browns and Coolattas", tip: "Wake-Up Wraps are the lightest breakfast at 180–290 calories; each Munchkin is 60–70." }),
  mk({ slug: "tim-hortons-calories-calculator", brand: "Tim Hortons", title: "Tim Hortons Calories Calculator", menu: E.MENUS.timhortons, kind: "Iced Capps, lattes, donuts, Timbits, bagels, breakfast sandwiches and soups", tip: "An Iced Capp made with cream is one of the higher-calorie drinks; each Timbit is 70–80 calories." }),
  mk({ slug: "caribou-nutrition-calculator", brand: "Caribou Coffee", menu: E.MENUS.caribou, kind: "mochas, lattes, coolers, cold press, bagels, breakfast and bakery items", tip: "Cold Press coffee is about 5 calories; blended Coolers and Caramel High Rises are the big ones, 280–830." }),
  mk({ slug: "tropical-smoothie-nutrition-calculator", brand: "Tropical Smoothie Cafe", menu: E.MENUS.tropicalsmoothie, kind: "smoothies, bowls, toasted flatbreads, wraps and quesadillas", tip: "Smoothies are the standard 24 oz size. Asking for no added sugar (turbinado) lowers most smoothies by roughly 100 calories." }),
  mk({ slug: "smoothie-king-nutrition-calculator", brand: "Smoothie King", menu: E.MENUS.smoothieking, kind: "Be Well Blends smoothies from smallest to largest cup", tip: "The smallest size listed is the 20 oz cup and the largest the 40 oz; a 32 oz is about midway." }),
  mk({ slug: "jamba-juice-nutrition-calculator", brand: "Jamba", menu: E.MENUS.jamba, kind: "smoothies, bowls and fresh juices", tip: "The smallest size listed is a small smoothie and the largest a large; bowls are about 330–580 calories." }),
  mk({ slug: "dairy-queen-nutrition-calculator", brand: "Dairy Queen", menu: E.MENUS.dairyqueen, kind: "Blizzards, cones, Dilly Bars, sundaes, shakes, burgers, chicken strips and fries", tip: "Blizzard sizes range from mini to large; a small cone (160) or a Dilly Bar (about 220) is the lightest treat." }),
  mk({ slug: "baskin-robbins-nutrition-calculator", brand: "Baskin-Robbins", menu: E.MENUS.baskinrobbins, kind: "ice cream flavors by scoop, cones, sundaes and milkshakes", tip: "Flavor values are per scoop (kids and regular sizes); add a cone separately — a cake cone is only 25 calories, a sprinkle cone 310." }),
  mk({ slug: "cold-stone-calorie-calculator", brand: "Cold Stone Creamery", title: "Cold Stone Calorie Calculator", menu: E.MENUS.coldstone, kind: "signature creations, ice cream flavors, mix-ins, cones and shakes", tip: "Sizes run from Like It (smallest) to Gotta Have It (largest). Build your own creation from an ice cream, mix-ins and a cone or bowl." }),
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-food-drink-category.ts --apply" first.`);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: cat.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(def.calcInputs),
      calcResult: JSON.stringify(def.calcResult),
      calcResults: JSON.stringify(def.calcResults),
      instructions: def.instructions,
      examples: def.examples,
      assumptions: def.assumptions,
      faq: JSON.stringify(def.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: def.metaTitle,
      metaDescription: def.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.tool.update({
        where: { slug: def.slug },
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      updated++;
    } else {
      // Published straight away (user, 6 Nov 2026: no tool should stay Draft).
      await prisma.tool.create({
        data: { slug: def.slug, status: "published", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all published.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
