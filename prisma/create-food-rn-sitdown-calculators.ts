// One-time (but safe to re-run) batch setup script: creates 17 restaurant calorie calculators in
// Food & Drink Calculators > Restaurant & Fast Food Nutrition Calculators > Sit-Down Restaurant Nutrition Calculators.
// Each is a meal builder over that chain's published menu calories
// (src/lib/calc-engine-food-rn-sitdown.ts); examples and FAQ figures are computed from the menu data.
//
// HOW TO RUN (after prisma/setup-food-drink-category.ts --apply)
//   npx tsx prisma/create-food-rn-sitdown-calculators.ts
// or
//   npm run db:create-food-rn-sitdown-calculators

import * as E from "../src/lib/calc-engine-food-rn-sitdown";

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

const CAT = "sit-down-restaurant-nutrition-calculators";
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
  mk({ slug: "applebees-nutrition-calculator", brand: "Applebee's", menu: E.MENUS.applebees, kind: "burgers, steaks, chicken, pastas, ribs, appetizers, salads, sides and desserts", tip: "Entrée figures follow Applebee's standard recipe and sides; swapping fries for steamed broccoli or garlicky green beans saves 200+ calories." }),
  mk({ slug: "chilis-nutrition-calculator", brand: "Chili's", menu: E.MENUS.chilis, kind: "burgers, fajitas, ribs, Crispers, steaks, salads, appetizers and desserts", tip: "Many Chili's plates include fries and sauces; the Classic Sirloin and Shrimp Fajitas are among the lighter entrées." }),
  mk({ slug: "olive-garden-nutrition-calculator", brand: "Olive Garden", menu: E.MENUS.olivegarden, kind: "breadsticks, salad, soups, pastas, chicken dishes, appetizers and desserts", tip: "Each breadstick is 140 calories and the house salad 70–150, so the 'unlimited' starters add up — count each one you eat." }),
  mk({ slug: "texas-roadhouse-nutrition-calculator", brand: "Texas Roadhouse", menu: E.MENUS.texasroadhouse, kind: "steaks by size, ribs, chicken, appetizers, sides and desserts", tip: "The smallest and largest sizes are the steak cut weights Texas Roadhouse offers; the rolls with cinnamon butter are extra, so add them separately if you know your count." }),
  mk({ slug: "ihop-nutrition-calculator", brand: "IHOP", menu: E.MENUS.ihop, kind: "pancakes, crepes, waffles, omelettes, combos, burgers and sides", tip: "Pancake figures exclude syrup; the smallest buttermilk stack is a short stack and the largest a full stack." }),
  mk({ slug: "dennys-nutrition-calculator", brand: "Denny's", menu: E.MENUS.dennys, kind: "Grand Slams, pancakes, skillets, burgers, sandwiches, dinners and desserts", tip: "The Original Grand Slam figure excludes eggs — add them as you order them. Skillets are among the lighter breakfasts." }),
  mk({ slug: "cracker-barrel-nutrition-calculator", brand: "Cracker Barrel", menu: E.MENUS.crackerbarrel, kind: "breakfasts, pancakes, chicken n' dumplins, meatloaf, fried chicken, sides and desserts", tip: "Biscuits are 160 each; country sides like sweet potato casserole are about 190–210." }),
  mk({ slug: "outback-nutrition-calculator", brand: "Outback Steakhouse", menu: E.MENUS.outback, kind: "steaks, ribs, chicken, seafood, bread, sides and desserts", tip: "A Bloomin' Onion is about 1,950 calories for the whole appetizer — enter 0.25 for a quarter if you share it." }),
  mk({ slug: "longhorn-nutrition-calculator", brand: "LongHorn Steakhouse", menu: E.MENUS.longhorn, kind: "steaks, chicken, seafood, appetizers, sides and desserts", tip: "Flo's Filet and Redrock Grilled Shrimp are the lightest entrées; desserts are 640–1,100." }),
  mk({ slug: "red-robin-nutrition-calculator", brand: "Red Robin", menu: E.MENUS.redrobin, kind: "gourmet burgers, chicken sandwiches, salads, appetizers, Bottomless Steak Fries and shakes", tip: "Steak fries are 370 per basket and they're bottomless — count every refill. The Wedge Burger (lettuce bun) is about 430." }),
  mk({ slug: "waffle-house-nutrition-calculator", brand: "Waffle House", menu: E.MENUS.wafflehouse, kind: "waffles, hashbrowns, eggs, bacon, sausage, sandwiches and steak-and-egg plates", tip: "Hashbrowns range from a regular order to a large 'scattered, smothered and covered' style; toppings like cheese and onions add more." }),
  mk({ slug: "red-lobster-nutrition-calculator", brand: "Red Lobster", menu: E.MENUS.redlobster, kind: "shrimp, lobster, crab, fish, appetizers, Cheddar Bay Biscuits and sides", tip: "Each Cheddar Bay Biscuit is 160 calories; grilled and steamed seafood (snow crab, garlic shrimp) are far lighter than fried platters." }),
  mk({ slug: "p-f-changs-nutrition-calculator", brand: "P.F. Chang's", menu: E.MENUS.pfchangs, kind: "lettuce wraps, dumplings, Mongolian beef, orange peel chicken, fried rice, lo mein and desserts", tip: "Many P.F. Chang's dishes are made to share; enter 0.5 for half a plate. Steamed dumplings are the lightest starter." }),
  mk({ slug: "first-watch-nutrition-calculator", brand: "First Watch", menu: E.MENUS.firstwatch, kind: "breakfast plates, pancakes, omelets, hashes, bowls, sandwiches and fresh juices", tip: "Egg-white omelets and the Sunrise Granola Bowl are the lightest; hashes and Tri-Fectas are 1,000+." }),
  mk({ slug: "ruby-tuesday-nutrition-calculator", brand: "Ruby Tuesday", menu: E.MENUS.rubytuesday, kind: "steaks, chicken, ribs, burgers, sides, salad-bar toppings and desserts", tip: "Grilled chicken and the petite sirloin are under 400 calories; burgers are 1,000+ with fries." }),
  mk({ slug: "bob-evans-nutrition-calculator", brand: "Bob Evans", menu: E.MENUS.bobevans, kind: "breakfasts, hotcakes, biscuits & gravy, dinners, sides and bakery", tip: "Hotcake platters are over 1,000 calories; a Country Biscuit Breakfast or Western Omelet is lighter." }),
  mk({ slug: "perkins-nutrition-calculator", brand: "Perkins", menu: E.MENUS.perkins, kind: "pancakes, omelets, French toast, muffins, pies, burgers and dinners", tip: "Perkins muffins are 630–700 calories each; pie slices 400–700." }),
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
