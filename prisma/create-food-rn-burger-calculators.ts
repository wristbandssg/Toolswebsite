// One-time (but safe to re-run) batch setup script: creates 28 restaurant calorie calculators in
// Food & Drink Calculators > Restaurant & Fast Food Nutrition Calculators > Burger, Chicken & Fast
// Food Nutrition Calculators. Each is a meal builder over that chain's published menu calories
// (src/lib/calc-engine-food-rn-burger.ts); examples and FAQ figures are computed from the menu data.
//
// HOW TO RUN (after prisma/setup-food-drink-category.ts --apply)
//   npx tsx prisma/create-food-rn-burger-calculators.ts
// or
//   npm run db:create-food-rn-burger-calculators

import * as E from "../src/lib/calc-engine-food-rn-burger";

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

const CAT = "burger-chicken-fast-food-nutrition-calculators";
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
  mk({ slug: "mcdonalds-nutrition-calculator", brand: "McDonald's", menu: E.MENUS.mcdonalds, kind: "burgers, McNuggets, breakfast items, fries, desserts and drinks", tip: "To cut calories, choose a hamburger or McChicken over a Big Mac or Quarter Pounder, get small fries, and swap soda for Diet Coke or water." }),
  mk({ slug: "chick-fil-a-nutrition-calculator", brand: "Chick-fil-A", menu: E.MENUS.chickfila, kind: "sandwiches, nuggets, breakfast, sides, sauces and shakes", tip: "Grilled sandwiches and grilled nuggets are the lightest entrées; sauces add 45–140 calories each, and milkshakes can add 700." }),
  mk({ slug: "wendys-nutrition-calculator", brand: "Wendy's", menu: E.MENUS.wendys, kind: "burgers, chicken, breakfast, fries, baked potatoes and drinks", tip: "A Jr. Cheeseburger or grilled chicken sandwich with apple slices keeps a Wendy's meal under 500 calories." }),
  mk({ slug: "burger-king-nutrition-calculator", brand: "Burger King", menu: E.MENUS.burgerking, kind: "Whoppers, burgers, chicken, breakfast, sides and shakes", tip: "A regular hamburger or cheeseburger has about a third of the calories of a Double Whopper." }),
  mk({ slug: "kfc-nutrition-calculator", brand: "KFC", menu: E.MENUS.kfc, kind: "Original Recipe, Extra Crispy and grilled pieces, tenders, bowls and sides", tip: "Kentucky Grilled and Original Recipe pieces are much lighter than Extra Crispy; corn on the cob is the lowest-calorie side." }),
  mk({ slug: "popeyes-nutrition-calculator", brand: "Popeyes", menu: E.MENUS.popeyes, kind: "chicken sandwiches, bone-in chicken, tenders, seafood, biscuits and sides", tip: "Blackened tenders are the lightest Popeyes entrée at 170 calories for three; a biscuit adds 260." }),
  mk({ slug: "in-n-out-nutrition-calculator", brand: "In-N-Out", menu: E.MENUS.innout, kind: "burgers, fries, shakes and drinks", tip: "Order a burger 'protein style' (wrapped in lettuce) to save about 150 calories; the smallest sizes listed are the lettuce-wrapped versions where In-N-Out gives a range." }),
  mk({ slug: "five-guys-nutrition-calculator", brand: "Five Guys", menu: E.MENUS.fiveguys, kind: "burgers, hot dogs, sandwiches, fries and toppings", tip: "Five Guys portions are big: a regular fries is about 950 calories, so a little fries or sharing one saves the most. Add each topping separately with the 'Add …' items." }),
  mk({ slug: "wingstop-nutrition-calculator", brand: "Wingstop", menu: E.MENUS.wingstop, kind: "classic and boneless wings by flavor, tenders, fries, dips and drinks", tip: "Wing calories are per serving as Wingstop lists them; dry rubs (lemon pepper, Cajun) and hot sauces are lighter than garlic parmesan, and a ranch dip adds over 300 calories." }),
  mk({ slug: "buffalo-wild-wings-nutrition-calculator", brand: "Buffalo Wild Wings", menu: E.MENUS.bww, kind: "traditional and boneless wings, burgers, sandwiches, appetizers and sides", tip: "Traditional (bone-in) wings are lower in calories than boneless; appetizers like cheese curds and fried pickles can top 900 calories." }),
  mk({ slug: "culvers-nutrition-calculator", brand: "Culver's", menu: E.MENUS.culvers, kind: "ButterBurgers, chicken, cheese curds, fries, frozen custard and Concrete Mixers", tip: "A single ButterBurger is under 400 calories; cheese curds and large Concrete Mixers are the big extras." }),
  mk({ slug: "arbys-nutrition-calculator", brand: "Arby's", menu: E.MENUS.arbys, kind: "roast beef, Beef 'n Cheddar, chicken, curly fries and shakes", tip: "The Classic Roast Beef and roast beef slider are among Arby's lighter sandwiches." }),
  mk({ slug: "whataburger-nutrition-calculator", brand: "Whataburger", menu: E.MENUS.whataburger, kind: "burgers, chicken, breakfast taquitos, fries and shakes", tip: "A Whataburger Jr. or a grilled chicken sandwich saves 200–500 calories over a Double Meat Whataburger." }),
  mk({ slug: "sonic-nutrition-calculator", brand: "Sonic", menu: E.MENUS.sonic, kind: "burgers, Coneys, chicken, tots, Blasts, shakes, slushes and limeades", tip: "Drinks and Blasts add up fast at Sonic — a large Oreo Blast is about 1,300 calories." }),
  mk({ slug: "raising-canes-nutrition-calculator", brand: "Raising Cane's", menu: E.MENUS.canes, kind: "chicken fingers, combos, Cane's sauce, fries, Texas toast and drinks", tip: "Build your own box with individual fingers (130 calories each) to see where the calories come from; each Cane's sauce adds 190." }),
  mk({ slug: "jack-in-the-box-nutrition-calculator", brand: "Jack in the Box", menu: E.MENUS.jackinthebox, kind: "burgers, tacos, chicken, egg rolls, fries, breakfast and shakes", tip: "Two tacos are under 400 calories; shakes start at about 700." }),
  mk({ slug: "hardees-nutrition-calculator", brand: "Hardee's", menu: E.MENUS.hardees, kind: "Thickburgers, chicken, biscuits, breakfast platters and sides", tip: "Hardee's biscuits are 500–700 calories; a plain biscuit with a side of mashed potatoes is far lighter." }),
  mk({ slug: "carls-jr-nutrition-calculator", brand: "Carl's Jr.", menu: E.MENUS.carlsjr, kind: "Famous Star, Western Bacon, chicken, sides, breakfast and shakes", tip: "The Charbroiled BBQ Chicken Sandwich is one of the lightest Carl's Jr. sandwiches at about 390 calories." }),
  mk({ slug: "zaxbys-nutrition-calculator", brand: "Zaxby's", menu: E.MENUS.zaxbys, kind: "Chicken Fingerz, wings, sandwiches, Zalads and sides", tip: "Meals ('plates') include fries, Texas toast and sauce — add them separately here to see their share; Zax Sauce is 180 calories." }),
  mk({ slug: "shake-shack-calorie-calculator", brand: "Shake Shack", title: "Shake Shack Calorie Calculator", menu: E.MENUS.shakeshack, kind: "burgers, Chick'n Shack, hot dogs, fries, shakes and custard", tip: "A single ShackBurger is about 530 calories; shakes add 680–890." }),
  mk({ slug: "daves-hot-chicken-calories-calculator", brand: "Dave's Hot Chicken", title: "Dave's Hot Chicken Calories Calculator", menu: E.MENUS.daves, kind: "tenders, sliders, combos, fries, mac & cheese and shakes", tip: "Calories vary a little with heat level; the smallest and largest figures cover the range Dave's publishes." }),
  mk({ slug: "portillos-nutrition-calculator", brand: "Portillo's", menu: E.MENUS.portillos, kind: "Italian beef, hot dogs, Polish sausage, burgers, salads, fries and chocolate cake", tip: "A Chicago-style hot dog with everything is about 340 calories; the chocolate cake shake can reach 1,490." }),
  mk({ slug: "white-castle-nutrition-calculator", brand: "White Castle", menu: E.MENUS.whitecastle, kind: "sliders, chicken rings, fries, onion rings, breakfast sliders and shakes", tip: "Most sliders are 140–300 calories, so it is easy to count: a sack of 4 Original Sliders is 560." }),
  mk({ slug: "bojangles-calorie-calculator", brand: "Bojangles", title: "Bojangles Calorie Calculator", menu: E.MENUS.bojangles, kind: "bone-in chicken, tenders, biscuits, sandwiches and Southern sides", tip: "Green beans (20 calories) and dirty rice are the lightest Bojangles sides; biscuits start at 310." }),
  mk({ slug: "el-pollo-loco-nutrition-calculator", brand: "El Pollo Loco", menu: E.MENUS.elpolloloco, kind: "fire-grilled chicken, bowls, burritos, tacos, quesadillas and sides", tip: "Fire-grilled chicken breast is only 220 calories; overstuffed quesadillas are 900–1,150." }),
  mk({ slug: "steak-and-shake-nutrition-calculator", brand: "Steak 'n Shake", menu: E.MENUS.steaknshake, kind: "steakburgers, chili, fries, milkshakes and breakfast", tip: "A single steakburger is about 320 calories; Chili Mac and the 7 X 7 are over 1,000." }),
  mk({ slug: "checkers-nutrition-calculator", brand: "Checkers", menu: E.MENUS.checkers, kind: "Big Buford, burgers, chicken, wings, Famous Seasoned Fries and shakes", tip: "The Checker Burger (320 calories) and chicken nuggets (250) are the lightest choices." }),
  mk({ slug: "fast-food-nutrition-calculator", brand: "Fast Food", title: "Fast Food Nutrition Calculator", menu: E.FAST_FOOD_MENU, kind: "signature items from 27 burger and chicken chains", tip: "Use it to compare chains side by side — for a full single-chain menu, use that chain's own calculator in this category." }),
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
