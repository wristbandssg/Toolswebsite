// One-time (but safe to re-run) batch setup script: creates 18 restaurant calorie calculators in
// Food & Drink Calculators > Restaurant & Fast Food Nutrition Calculators > Pizza, Sub & Sandwich Nutrition Calculators.
// Each is a meal builder over that chain's published menu calories
// (src/lib/calc-engine-food-rn-pizza.ts); examples and FAQ figures are computed from the menu data.
//
// HOW TO RUN (after prisma/setup-food-drink-category.ts --apply)
//   npx tsx prisma/create-food-rn-pizza-calculators.ts
// or
//   npm run db:create-food-rn-pizza-calculators

import * as E from "../src/lib/calc-engine-food-rn-pizza";

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

const CAT = "pizza-sub-sandwich-nutrition-calculators";
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
  mk({ slug: "subway-calorie-calculator", brand: "Subway", title: "Subway Calorie Calculator", menu: E.MENUS.subway, kind: "6-inch and footlong subs, wraps, salads, chips, cookies and drinks", tip: "Calories are for Subway's standard recipe on its default bread; extra cheese, sauces and double meat add more. A footlong is roughly double a 6-inch." }),
  mk({ slug: "pizza-hut-nutrition-calculator", brand: "Pizza Hut", menu: E.MENUS.pizzahut, kind: "pizza slices by crust and size, breadsticks, wings, pastas and desserts", tip: "Pizza values are per slice. Thin 'n Crispy saves about a third of the calories of Pan pizza; wings are per piece." }),
  mk({ slug: "papa-johns-nutrition-calculator", brand: "Papa John's", menu: E.MENUS.papajohns, kind: "pizza slices, Papadias, wings, breadsticks, garlic sauce and desserts", tip: "Pizza values are per slice; garlic dipping sauce adds about 75 calories per tablespoon." }),
  mk({ slug: "little-caesars-nutrition-calculator", brand: "Little Caesars", menu: E.MENUS.littlecaesars, kind: "pizza slices, Crazy Bread, wings and dipping sauces", tip: "Values are per slice of a large pizza; one stick of Crazy Bread is 100 calories, and the buttery garlic sauce adds 370." }),
  mk({ slug: "jersey-mikes-nutrition-calculator", brand: "Jersey Mike's", menu: E.MENUS.jerseymikes, kind: "subs from mini to giant, fries and chips", tip: "The smallest size listed is Jersey Mike's smallest sub and the largest is the Giant. Ordering 'Mike's Way' adds oil and vinegar to the listed figures." }),
  mk({ slug: "jimmy-johns-nutrition-calculator", brand: "Jimmy John's", menu: E.MENUS.jimmyjohns, kind: "subs, clubs, Slims, Unwiches, Picklewiches, chips and cookies", tip: "Order an Unwich (lettuce wrap) or a Picklewich to cut most of the bread calories; cookies are about 370–410 each." }),
  mk({ slug: "firehouse-subs-nutrition-calculator", brand: "Firehouse Subs", menu: E.MENUS.firehouse, kind: "hot subs, chopped salads, sides and desserts", tip: "The smallest size listed is Firehouse's small sub and the largest is the large; the Chopped Salad with turkey is one of the lightest meals." }),
  mk({ slug: "potbelly-nutrition-calculator", brand: "Potbelly", menu: E.MENUS.potbelly, kind: "sandwiches, Skinny sandwiches, salads, soups, cookies and shakes", tip: "Potbelly 'Skinny' sandwiches use less bread and meat and are about 300–350 calories." }),
  mk({ slug: "panera-nutrition-calculator", brand: "Panera", menu: E.MENUS.panera, kind: "sandwiches, mac & cheese, salads, bagels, pastries and drinks", tip: "A half sandwich is about half of the 'full' figure — enter quantity 0.5. The bread bowl alone is 670 calories before the soup." }),
  mk({ slug: "mcalisters-nutrition-calculator", brand: "McAlister's Deli", menu: E.MENUS.mcalisters, kind: "sandwiches, spuds, salads, soups, sweet tea and desserts", tip: "McAlister's sweet tea is about 150 calories per serving listed; unsweetened tea is calorie-free." }),
  mk({ slug: "schlotzskys-nutrition-calculator", brand: "Schlotzsky's", menu: E.MENUS.schlotzskys, kind: "The Original sandwich, pizzas, salads, soups and cookies", tip: "The Original sandwich ranges from about 390 calories (small) to 1,550 (large)." }),
  mk({ slug: "which-wich-calorie-calculator", brand: "Which Wich", title: "Which Wich Calorie Calculator", menu: E.MENUS.whichwich, kind: "wiches by size, wraps, grinders and shakes", tip: "The smallest size listed is Which Wich's small; mayo, cheese and sauces you mark on the bag can add 100–300 calories." }),
  mk({ slug: "chicken-salad-chick-nutrition-calculator", brand: "Chicken Salad Chick", menu: E.MENUS.chickensaladchick, kind: "chicken salad flavors, sandwiches, sides and snacks", tip: "Chicken salad flavors are per scoop as listed; fruit and broccoli salad are the lightest sides." }),
  mk({ slug: "california-pizza-kitchen-nutrition-calculator", brand: "California Pizza Kitchen", menu: E.MENUS.cpk, kind: "pastas, salads, appetizers and desserts", tip: "CPK pastas and desserts are large — many are over 1,000 calories, so sharing or boxing half is common." }),
  mk({ slug: "newks-nutrition-calculator", brand: "Newk's Eatery", menu: E.MENUS.newks, kind: "sandwiches, salads, whole pizzas, sides and cake slices", tip: "Newk's pizzas are whole pizzas — enter 0.5 for half. Salads with dressing on the side are the lightest meals." }),
  mk({ slug: "mellow-mushroom-nutrition-calculator", brand: "Mellow Mushroom", menu: E.MENUS.mellowmushroom, kind: "pizza slices, calzones, burgers, appetizers, soups and salads", tip: "Pizza values are per slice for the smallest and largest pizza sizes; calzones are 1,200–1,400 calories each." }),
  mk({ slug: "wawa-nutrition-calculator", brand: "Wawa", menu: E.MENUS.wawa, kind: "hoagies and rolls, breakfast sandwiches, soups, mac & cheese, coffee and smoothies", tip: "Build a hoagie from the roll plus fillings if yours is not listed; the Shorti roll is 240 calories and the Classic 350." }),
  mk({ slug: "donatos-nutrition-calculator", brand: "Donatos", menu: E.MENUS.donatos, kind: "subs, wings, breadsticks and salads", tip: "Donatos pizza is not included here because per-slice values were not available; subs and salads are listed with their dressings." }),
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
