// One-time (but safe to re-run) batch setup script: creates 11 restaurant calorie calculators in
// Food & Drink Calculators > Restaurant & Fast Food Nutrition Calculators > Mexican, Bowl & Salad Restaurant Nutrition Calculators.
// Each is a meal builder over that chain's published menu calories
// (src/lib/calc-engine-food-rn-bowl.ts); examples and FAQ figures are computed from the menu data.
//
// HOW TO RUN (after prisma/setup-food-drink-category.ts --apply)
//   npx tsx prisma/create-food-rn-bowl-calculators.ts
// or
//   npm run db:create-food-rn-bowl-calculators

import * as E from "../src/lib/calc-engine-food-rn-bowl";

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

const CAT = "mexican-bowl-salad-restaurant-nutrition-calculators";
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
  mk({ slug: "chipotle-nutrition-calculator", brand: "Chipotle", menu: E.MENUS.chipotle, kind: "burrito and bowl ingredients — tortilla, rice, beans, proteins, salsas, toppings, chips and drinks", tip: "Build it the way you order: one line per ingredient. A bowl skips the 320-calorie tortilla; chips are 570 calories, and guacamole adds 150. Double meat counts as quantity 2." }),
  mk({ slug: "taco-bell-nutrition-calculator", brand: "Taco Bell", menu: E.MENUS.tacobell, kind: "tacos, burritos, Crunchwraps, quesadillas, bowls, Nacho Fries and desserts", tip: "Crunchy and soft tacos are 170–210 calories each; ordering 'fresco style' (pico instead of cheese and sauces) lowers them further." }),
  mk({ slug: "qdoba-calorie-calculator", brand: "Qdoba", title: "Qdoba Calorie Calculator", menu: E.MENUS.qdoba, kind: "build-your-own components — tortillas, rice, beans, proteins, queso, guac and salsas — plus signature bowls", tip: "Qdoba includes queso and guac at no extra charge, but each adds 90–190 calories; pico and salsa roja are 10–20." }),
  mk({ slug: "cava-nutrition-calculator", brand: "CAVA", menu: E.MENUS.cava, kind: "bases, proteins, dips and spreads, toppings, dressings and signature bowls", tip: "A salad or greens-and-grains base saves 100–350 calories over RightRice or a pita; dips like hummus and tzatziki are only 25–30 per serving." }),
  mk({ slug: "panda-express-calorie-calculator", brand: "Panda Express", title: "Panda Express Calorie Calculator", menu: E.MENUS.panda, kind: "entrées, chow mein, fried rice, sides, appetizers and drinks", tip: "A plate is one side plus two entrées. Choosing Super Greens (90) instead of chow mein or fried rice (510–520) saves over 400 calories; Broccoli Beef is the lightest entrée." }),
  mk({ slug: "sweetgreen-calorie-calculator", brand: "Sweetgreen", title: "Sweetgreen Calorie Calculator", menu: E.MENUS.sweetgreen, kind: "signature salads and warm bowls, bases, grains and proteins", tip: "Signature bowls already include their dressing; for a custom bowl, add a base, a grain and a protein from the list." }),
  mk({ slug: "del-taco-nutrition-calculator", brand: "Del Taco", menu: E.MENUS.deltaco, kind: "tacos, burritos, quesadillas, nachos, fries, breakfast and shakes", tip: "Value tacos and chicken al carbon tacos are 130–150 calories; Epic burritos and loaded fries can top 800." }),
  mk({ slug: "noodles-and-company-nutrition-calculator", brand: "Noodles & Company", menu: E.MENUS.noodles, kind: "mac & cheese, pastas, noodle bowls, salads and soups", tip: "Regular bowls are roughly double the small size; Japanese Pan Noodles and Penne Rosa are among the lighter choices." }),
  mk({ slug: "cafe-rio-nutrition-calculator", brand: "Cafe Rio", menu: E.MENUS.caferio, kind: "burrito, taco and salad components, chips and desserts", tip: "Cafe Rio portions are large: the burrito tortilla alone is over 400 calories, so a salad or tacos with corn tortillas saves the most." }),
  mk({ slug: "pei-wei-nutrition-calculator", brand: "Pei Wei", menu: E.MENUS.peiwei, kind: "wok entrées, noodles, fried rice, bowls and appetizers", tip: "Entrée calories include the dish on its own; noodle dishes and fried rice are 1,000+ calories, so sharing is common." }),
  mk({ slug: "freebird-nutrition-calculator", brand: "Freebirds", menu: E.MENUS.freebirds, kind: "burritos, bowls, queso, guacamole, chips and taco and nacho components", tip: "The Lite Chicken Bowl is under 300 calories; queso and chips add 200–450." }),
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
