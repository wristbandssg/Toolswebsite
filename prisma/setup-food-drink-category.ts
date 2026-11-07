// Food & Drink Calculators (6 Nov 2026, user request: "Food and Drink Calculator" is the only main
// category for the 375-keyword list, at most 10 sub-categories, at most 5 child sub-categories).
// Keyword check: Claude outputs/Food_Drink_Keyword_Check.md (304 new tools). The 171 restaurant-brand
// nutrition tools were not built, and their empty sub-category + 5 children were deleted at the
// user's request (6 Nov 2026); the user then asked for 20–30 brand tools per child, so they are
// re-added one child at a time as each batch is built.
//   1. Creates the main category and its sub-categories.
//   2. Moves existing party-food, drink and food-pricing tools whose main intent belongs here (their
//      owning create-*.ts scripts read FOOD_MOVES too, so re-running them keeps the tools in place).
//
// HOW TO RUN
//   npx tsx prisma/setup-food-drink-category.ts            (report only)
//   npx tsx prisma/setup-food-drink-category.ts --apply    (make the changes)
// Safe to re-run.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const would = APPLY ? "" : "Would ";

export const FOOD_MAIN = { name: "Food & Drink Calculators", slug: "food-drink-calculators", breadcrumbName: "Food & Drink" };

/** parent = slug of another entry here (child sub-category); omitted = directly under the main category. */
export const FOOD_SUBCATEGORIES: { name: string; slug: string; parent?: string }[] = [
  { name: "Food Nutrition & Calorie Calculators", slug: "food-nutrition-calorie-calculators" },
  { name: "Diet, Macro & Meal Planning Calculators", slug: "diet-macro-meal-planning-calculators" },
  { name: "Cooking Time, Meat & Curing Calculators", slug: "cooking-time-meat-curing-calculators" },
  { name: "Baking & Recipe Calculators", slug: "baking-recipe-calculators" },
  { name: "Party & Event Food Calculators", slug: "party-event-food-calculators" },
  { name: "Coffee, Caffeine & Drink Calculators", slug: "coffee-caffeine-drink-calculators" },
  { name: "Beer & Homebrewing Calculators", slug: "beer-homebrewing-calculators" },
  { name: "Wine, Spirits & Cocktail Calculators", slug: "wine-spirits-cocktail-calculators" },
  { name: "Food Costs, Restaurant Prices & Business Calculators", slug: "food-costs-restaurant-prices-business-calculators" },
  // Restaurant brand calculators (user, 6 Nov 2026: add 20–30 per child). Children are added here only
  // once their tools are built, so no empty category is ever created.
  { name: "Restaurant & Fast Food Nutrition Calculators", slug: "restaurant-fast-food-nutrition-calculators" },
  { name: "Burger, Chicken & Fast Food Nutrition Calculators", slug: "burger-chicken-fast-food-nutrition-calculators", parent: "restaurant-fast-food-nutrition-calculators" },
  { name: "Mexican, Bowl & Salad Restaurant Nutrition Calculators", slug: "mexican-bowl-salad-restaurant-nutrition-calculators", parent: "restaurant-fast-food-nutrition-calculators" },
  { name: "Pizza, Sub & Sandwich Nutrition Calculators", slug: "pizza-sub-sandwich-nutrition-calculators", parent: "restaurant-fast-food-nutrition-calculators" },
  { name: "Coffee, Smoothie & Dessert Shop Nutrition Calculators", slug: "coffee-smoothie-dessert-shop-nutrition-calculators", parent: "restaurant-fast-food-nutrition-calculators" },
  { name: "Sit-Down Restaurant Nutrition Calculators", slug: "sit-down-restaurant-nutrition-calculators", parent: "restaurant-fast-food-nutrition-calculators" },
];

const PARTY = "party-event-food-calculators";
const WINE = "wine-spirits-cocktail-calculators";
const BIZ = "food-costs-restaurant-prices-business-calculators";

/** Existing tools that move in: slug → sub-category slug. Owning scripts import this map. */
export const FOOD_MOVES: Record<string, string> = {
  "meat-per-person-calculator": PARTY,
  "cake-size-calculator": PARTY,
  "catering-cost-calculator": PARTY,
  "charcuterie-board-calculator": PARTY,
  "halloween-candy-calculator": PARTY,
  "thanksgiving-food-calculator": PARTY,
  "turkey-size-calculator": PARTY,
  "party-ice-calculator": PARTY,
  "wedding-cake-cost-calculator": PARTY,
  "party-drinks-calculator": WINE,
  "wedding-alcohol-calculator": WINE,
  "keg-calculator": WINE,
  "beer-abv-calculator": "beer-homebrewing-calculators",
  "coffee-cost-calculator": "coffee-caffeine-drink-calculators",
  "fountain-drink-cost-calculator": "coffee-caffeine-drink-calculators",
  "recipe-cost-calculator": BIZ,
  "food-cost-calculator": BIZ,
  "menu-pricing-calculator": BIZ,
  "cocktail-pricing-calculator": BIZ,
  "liquor-pricing-calculator": BIZ,
  "beer-pricing-calculator": BIZ,
  "wine-pricing-calculator": BIZ,
  "cake-pricing-calculator": BIZ,
  "cookie-pricing-calculator": BIZ,
  "cupcake-pricing-calculator": BIZ,
  "cost-per-meal-calculator": BIZ,
  "restaurant-labor-cost-calculator": BIZ,
};

/** For owning create-*.ts scripts: the moved-to category id for a slug, if it has been moved. */
export async function foodMovedCategoryId(client: PrismaClient, slug: string): Promise<string | undefined> {
  const target = FOOD_MOVES[slug];
  if (!target) return undefined;
  const cat = await client.toolCategory.findUnique({ where: { slug: target }, select: { id: true } });
  return cat?.id;
}

async function main() {
  console.log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  let main = await prisma.toolCategory.findUnique({ where: { slug: FOOD_MAIN.slug } });
  if (!main) {
    console.log(`${would}create main category "${FOOD_MAIN.name}"`);
    if (APPLY) main = await prisma.toolCategory.create({ data: { ...FOOD_MAIN, parentId: null, templateKey: "category-template-1", viewStyle: "grid" } });
  }
  const subIds = new Map<string, string>();
  for (const sub of FOOD_SUBCATEGORIES) {
    const parentId = sub.parent ? subIds.get(sub.parent) : main?.id;
    let found = await prisma.toolCategory.findUnique({ where: { slug: sub.slug } });
    if (!found) {
      console.log(`${would}create "${sub.name}"`);
      if (APPLY) found = await prisma.toolCategory.create({ data: { name: sub.name, slug: sub.slug, parentId: parentId!, templateKey: "category-template-1", viewStyle: "grid" } });
    } else if (found.parentId !== parentId || found.name !== sub.name) {
      console.log(`${would}move "${found.name}" under Food & Drink as "${sub.name}"`);
      if (APPLY) found = await prisma.toolCategory.update({ where: { id: found.id }, data: { name: sub.name, parentId: parentId! } });
    }
    if (found) subIds.set(sub.slug, found.id);
  }
  for (const [slug, subSlug] of Object.entries(FOOD_MOVES)) {
    const tool = await prisma.tool.findUnique({ where: { slug }, select: { id: true, title: true, categoryId: true } });
    if (!tool) {
      console.log(`  (skip) ${slug} not found`);
      continue;
    }
    const target = subIds.get(subSlug);
    if (target && tool.categoryId === target) continue;
    console.log(`${would}move "${tool.title}" → ${subSlug}`);
    if (APPLY && target) await prisma.tool.update({ where: { id: tool.id }, data: { categoryId: target } });
  }
}

// Only run when executed directly (owning create-*.ts scripts import FOOD_MOVES from here).
if (process.argv[1]?.replace(/\\/g, "/").endsWith("setup-food-drink-category.ts")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
