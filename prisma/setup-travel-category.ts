// Travel Calculators (10 Nov 2026, user's 1,090-keyword travel list; the brief named the main
// category "Sensitivity calculator", the report proposed "Travel Calculators" and the user said
// "tool make koro"). Keyword check: Claude outputs/Travel_Keyword_Check.md (184 new tools).
//   1. Creates the main category and its 7 sub-categories (no child sub-categories).
//   2. Moves 7 existing travel tools in. Their owning create-*.ts scripts read TRV_MOVES too, so
//      re-running them keeps the tools in place.
//
// HOW TO RUN
//   npx tsx prisma/setup-travel-category.ts            (report only)
//   npx tsx prisma/setup-travel-category.ts --apply    (make the changes)
// Safe to re-run.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const would = APPLY ? "" : "Would ";

export const TRV_MAIN = { name: "Travel Calculators", slug: "travel-calculators", breadcrumbName: "Travel" };

export const TRV_DIST = "distance-route-travel-time-calculators";
export const TRV_FLIGHT = "flight-baggage-airfare-calculators";
export const TRV_MILES = "airline-miles-hotel-points-calculators";
export const TRV_TOLL = "toll-calculators";
export const TRV_TAXI = "taxi-rideshare-fare-calculators";
export const TRV_RAIL = "train-metro-rail-pass-calculators";
export const TRV_TRIP = "trip-cost-theme-park-cruise-calculators";

export const TRV_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "Distance, Route & Travel Time Calculators", slug: TRV_DIST },
  { name: "Flight, Baggage & Airfare Calculators", slug: TRV_FLIGHT },
  { name: "Airline Miles, Hotel Points & Rewards Calculators", slug: TRV_MILES },
  { name: "Toll Calculators", slug: TRV_TOLL },
  { name: "Taxi & Rideshare Fare Calculators", slug: TRV_TAXI },
  { name: "Train, Metro & Rail Pass Calculators", slug: TRV_RAIL },
  { name: "Trip Cost, Theme Park & Cruise Calculators", slug: TRV_TRIP },
];

/** Existing tools that move in: slug → sub-category slug. Owning scripts import this map. */
export const TRV_MOVES: Record<string, string> = {
  "eu261-flight-compensation-calculator": TRV_FLIGHT,
  "toll-cost-calculator": TRV_TOLL,
  "schengen-90-180-calculator": TRV_DIST,
  "disney-dining-plan-calculator": TRV_TRIP,
  "carnival-drink-package-calculator": TRV_TRIP,
  "road-trip-budget-calculator": TRV_TRIP,
  "airport-parking-vs-rideshare-calculator": TRV_TAXI,
};

/** For owning create-*.ts scripts: the moved-to category id for a slug, if it has been moved. */
export async function trvMovedCategoryId(client: PrismaClient, slug: string): Promise<string | undefined> {
  const target = TRV_MOVES[slug];
  if (!target) return undefined;
  const cat = await client.toolCategory.findUnique({ where: { slug: target }, select: { id: true } });
  return cat?.id;
}

async function main() {
  console.log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  let main = await prisma.toolCategory.findUnique({ where: { slug: TRV_MAIN.slug } });
  if (!main) {
    console.log(`${would}create main category "${TRV_MAIN.name}"`);
    if (APPLY) main = await prisma.toolCategory.create({ data: { ...TRV_MAIN, parentId: null, templateKey: "category-template-1", viewStyle: "grid" } });
  }
  const subIds = new Map<string, string>();
  for (const sub of TRV_SUBCATEGORIES) {
    let found = await prisma.toolCategory.findUnique({ where: { slug: sub.slug } });
    if (!found) {
      console.log(`${would}create "${sub.name}"`);
      if (APPLY) found = await prisma.toolCategory.create({ data: { ...sub, parentId: main!.id, templateKey: "category-template-1", viewStyle: "grid" } });
    }
    if (found) subIds.set(sub.slug, found.id);
  }
  let moved = 0;
  for (const [slug, subSlug] of Object.entries(TRV_MOVES)) {
    const tool = await prisma.tool.findUnique({ where: { slug }, select: { id: true, categoryId: true } });
    if (!tool) {
      console.log(`  (skip) ${slug} not found`);
      continue;
    }
    const target = subIds.get(subSlug);
    if (target && tool.categoryId === target) continue;
    moved++;
    if (APPLY && target) await prisma.tool.update({ where: { id: tool.id }, data: { categoryId: target } });
  }
  console.log(`${would}move ${moved} tool(s)`);
}

// Only run when executed directly (owning create-*.ts scripts import TRV_MOVES from here).
if (process.argv[1]?.replace(/\\/g, "/").endsWith("setup-travel-category.ts")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
