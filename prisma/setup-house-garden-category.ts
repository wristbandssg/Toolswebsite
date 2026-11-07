// House & Garden Calculators (7 Nov 2026, user request: "house and garden calculator" is the only
// main category for the ~6,200-keyword list, sent in 5 parts). Keyword check:
// Claude outputs/House_Garden_Keyword_Check.md (391 new tools, 199 existing tools moved in).
//   1. Creates the main category and its 10 sub-categories.
//   2. Moves existing homeowner / DIY tools in from Shopping > Home Improvement Cost & Sizing,
//      Business & Industrial (concrete, landscaping, construction materials, energy) and Real Estate
//      (cost to build, additions, renovation). Their owning create-*.ts scripts read HG_MOVES too, so
//      re-running them keeps the tools in place.
//
// HOW TO RUN
//   npx tsx prisma/setup-house-garden-category.ts            (report only)
//   npx tsx prisma/setup-house-garden-category.ts --apply    (make the changes)
// Safe to re-run.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const would = APPLY ? "" : "Would ";

export const HG_MAIN = { name: "House & Garden Calculators", slug: "house-garden-calculators", breadcrumbName: "House & Garden" };

export const CON = "concrete-masonry-paving-calculators";
export const LAND = "gravel-soil-landscaping-calculators";
export const GARD = "lawn-garden-tree-calculators";
export const ROOF = "roofing-gutter-calculators";
export const DECK = "deck-fence-stair-calculators";
export const FRAME = "framing-drywall-insulation-siding-calculators";
export const FLOOR = "flooring-tile-paint-interior-calculators";
export const HVAC = "hvac-plumbing-electrical-calculators";
export const POOL = "pool-pond-water-calculators";
export const HOME = "home-building-remodel-cleaning-cost-calculators";

export const HG_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "Concrete, Masonry & Paving Calculators", slug: CON },
  { name: "Gravel, Soil & Landscaping Calculators", slug: LAND },
  { name: "Lawn, Garden & Tree Calculators", slug: GARD },
  { name: "Roofing & Gutter Calculators", slug: ROOF },
  { name: "Deck, Fence & Stair Calculators", slug: DECK },
  { name: "Framing, Drywall, Insulation & Siding Calculators", slug: FRAME },
  { name: "Flooring, Tile, Paint & Interior Calculators", slug: FLOOR },
  { name: "HVAC, Plumbing & Electrical Calculators", slug: HVAC },
  { name: "Pool, Pond & Water Calculators", slug: POOL },
  { name: "Home Building, Remodel & Cleaning Cost Calculators", slug: HOME },
];

/** Existing tools that move in: slug → sub-category slug. Owning scripts import this map. */
export const HG_MOVES: Record<string, string> = {
  // HOME
  "renovation-cost-calculator": HOME,
  "door-size-calculator": HOME,
  "garage-door-size-calculator": HOME,
  "garage-size-calculator": HOME,
  "storage-shed-size-calculator": HOME,
  "garage-door-spring-size-calculator": HOME,
  "hail-damage-repair-cost-calculator": HOME,
  "kitchen-remodel-cost-calculator": HOME,
  "bathroom-remodel-cost-calculator": HOME,
  "shower-remodel-cost-calculator": HOME,
  "kitchen-island-cost-calculator": HOME,
  "frameless-shower-door-cost-calculator": HOME,
  "outdoor-kitchen-cost-calculator": HOME,
  "home-addition-cost-calculator": HOME,
  "barndominium-cost-calculator": HOME,
  "garage-cost-calculator": HOME,
  "garage-door-cost-calculator": HOME,
  "carport-cost-calculator": HOME,
  "shed-cost-calculator": HOME,
  "pole-barn-cost-calculator": HOME,
  "tiny-house-cost-calculator": HOME,
  "adu-cost-calculator": HOME,
  "basement-finishing-cost-calculator": HOME,
  "wheelchair-ramp-cost-calculator": HOME,
  "chimney-repair-cost-calculator": HOME,
  "window-replacement-cost-calculator": HOME,
  "window-screen-replacement-cost-calculator": HOME,
  "home-window-tint-cost-calculator": HOME,
  "blinds-cost-calculator": HOME,
  "shutters-cost-calculator": HOME,
  "curtain-cost-calculator": HOME,
  "glass-price-calculator": HOME,
  "bifold-door-cost-calculator": HOME,
  "sliding-door-cost-calculator": HOME,
  "house-cleaning-cost-calculator": HOME,
  "move-out-cleaning-cost-calculator": HOME,
  "carpet-cleaning-cost-calculator": HOME,
  "pressure-washing-cost-calculator": HOME,
  "window-cleaning-cost-calculator": HOME,
  "strip-and-wax-cost-calculator": HOME,
  "cost-to-build-calculator": HOME,
  "texas-cost-to-build-a-house-calculator": HOME,
  "cost-to-build-a-house-in-michigan-calculator": HOME,
  "cost-to-build-a-house-in-mn-calculator": HOME,
  "cost-to-build-a-house-in-pa-calculator": HOME,
  "cost-to-build-a-house-in-florida-calculator": HOME,
  "cost-to-build-a-house-in-nc-calculator": HOME,
  "demolition-cost-calculator": HOME,
  "dumpster-size-calculator": HOME,
  // FLOOR
  "office-furniture-cost-calculator": FLOOR,
  "curtain-size-calculator": FLOOR,
  "rug-size-calculator": FLOOR,
  "dining-table-size-calculator": FLOOR,
  "tablecloth-size-calculator": FLOOR,
  "sofa-size-calculator": FLOOR,
  "coffee-table-size-calculator": FLOOR,
  "furniture-to-room-size-calculator": FLOOR,
  "mattress-size-calculator": FLOOR,
  "bar-stool-height-calculator": FLOOR,
  "mirror-size-calculator": FLOOR,
  "chandelier-size-calculator": FLOOR,
  "wall-art-size-calculator": FLOOR,
  "gallery-wall-calculator": FLOOR,
  "picture-hanging-height-calculator": FLOOR,
  "frame-size-calculator": FLOOR,
  "blind-size-calculator": FLOOR,
  "kitchen-island-size-calculator": FLOOR,
  "interior-painting-cost-calculator": FLOOR,
  "exterior-painting-cost-calculator": FLOOR,
  "popcorn-ceiling-removal-cost-calculator": FLOOR,
  "wallpaper-cost-calculator": FLOOR,
  "tile-cost-calculator": FLOOR,
  "flooring-cost-calculator": FLOOR,
  "laminate-flooring-cost-calculator": FLOOR,
  "hardwood-floor-cost-calculator": FLOOR,
  "vinyl-plank-flooring-cost-calculator": FLOOR,
  "epoxy-floor-cost-calculator": FLOOR,
  "floor-refinishing-cost-calculator": FLOOR,
  "carpet-cost-calculator": FLOOR,
  "cabinet-refacing-cost-calculator": FLOOR,
  "cabinet-painting-refinishing-cost-calculator": FLOOR,
  "cabinet-cost-calculator": FLOOR,
  "countertop-cost-calculator": FLOOR,
  "quartz-countertop-cost-calculator": FLOOR,
  "granite-countertop-cost-calculator": FLOOR,
  "epoxy-countertop-cost-calculator": FLOOR,
  "backsplash-cost-calculator": FLOOR,
  "grout-calculator": FLOOR,
  "drop-ceiling-calculator": FLOOR,
  "epoxy-calculator": FLOOR,
  // HVAC
  "ceiling-fan-size-calculator": HVAC,
  "range-hood-size-calculator": HVAC,
  "recessed-lighting-spacing-calculator": HVAC,
  "lumens-calculator": HVAC,
  "septic-tank-size-calculator": HVAC,
  "well-pump-size-calculator": HVAC,
  "pressure-tank-size-calculator": HVAC,
  "expansion-tank-size-calculator": HVAC,
  "sump-pump-size-calculator": HVAC,
  "water-heater-size-calculator": HVAC,
  "tankless-water-heater-size-calculator": HVAC,
  "water-softener-size-calculator": HVAC,
  "btu-calculator": HVAC,
  "ac-size-calculator": HVAC,
  "mini-split-size-calculator": HVAC,
  "heat-pump-size-calculator": HVAC,
  "furnace-size-calculator": HVAC,
  "space-heater-size-calculator": HVAC,
  "wood-stove-size-calculator": HVAC,
  "dehumidifier-size-calculator": HVAC,
  "humidifier-size-calculator": HVAC,
  "air-purifier-size-calculator": HVAC,
  "whole-house-generator-cost-calculator": HVAC,
  "electrician-cost-calculator": HVAC,
  "solar-panel-cost-calculator": HVAC,
  "electrical-load-calculator": HVAC,
  "generator-size-calculator": HVAC,
  "propane-usage-calculator": HVAC,
  "heat-pump-vs-furnace-calculator": HVAC,
  "oil-vs-gas-heating-cost-calculator": HVAC,
  // DECK
  "fire-pit-size-calculator": DECK,
  "shade-sail-calculator": DECK,
  "fence-cost-calculator": DECK,
  "deck-cost-calculator": DECK,
  "retaining-wall-cost-calculator": DECK,
  "pergola-cost-calculator": DECK,
  "dock-cost-calculator": DECK,
  "deck-calculator": DECK,
  "fence-calculator": DECK,
  "bison-pedestal-calculator": DECK,
  // POOL
  "pool-size-calculator": POOL,
  "pool-pump-size-calculator": POOL,
  "pool-filter-size-calculator": POOL,
  "pool-heater-size-calculator": POOL,
  "pool-cost-calculator": POOL,
  "pool-screen-enclosure-cost-calculator": POOL,
  "pool-cover-cost-calculator": POOL,
  "pool-liner-cost-calculator": POOL,
  "hot-tub-cost-calculator": POOL,
  // ROOF
  "roof-replacement-cost-calculator": ROOF,
  "gutter-cost-calculator": ROOF,
  "gutter-guard-cost-calculator": ROOF,
  "gutter-coil-calculator": ROOF,
  // LAND
  "asphalt-millings-calculator": LAND,
  "rip-rap-calculator": LAND,
  "landscaping-cost-calculator": LAND,
  "artificial-turf-cost-calculator": LAND,
  "gravel-calculator": LAND,
  "road-base-calculator": LAND,
  "sand-calculator": LAND,
  "topsoil-calculator": LAND,
  "mulch-calculator": LAND,
  "pine-straw-calculator": LAND,
  "excavation-cost-calculator": LAND,
  "stump-grinding-cost-calculator": LAND,
  "hydroseeding-calculator": LAND,
  "cubic-yard-calculator": LAND,
  "bulk-material-calculator": LAND,
  "brush-removal-cost-calculator": LAND,
  // FRAME
  "siding-cost-calculator": FRAME,
  "drywall-cost-calculator": FRAME,
  "insulation-cost-calculator": FRAME,
  "board-foot-calculator": FRAME,
  "lumber-calculator": FRAME,
  "framing-calculator": FRAME,
  "log-weight-calculator": FRAME,
  "shiplap-calculator": FRAME,
  "sealant-calculator": FRAME,
  "material-estimator-calculator": FRAME,
  "blown-in-insulation-calculator": FRAME,
  "r-value-calculator": FRAME,
  "spray-foam-calculator": FRAME,
  "vapor-barrier-cost-calculator": FRAME,
  "beam-span-calculator": FRAME,
  "5-cut-calculator": FRAME,
  // CON
  "concrete-price-calculator": CON,
  "concrete-stain-cost-calculator": CON,
  "patio-cost-calculator": CON,
  "paver-cost-calculator": CON,
  "concrete-calculator": CON,
  "concrete-footing-calculator": CON,
  "post-hole-concrete-calculator": CON,
  "quikrete-calculator": CON,
  "self-leveling-concrete-calculator": CON,
  "monolithic-slab-calculator": CON,
  "concrete-steps-calculator": CON,
  "concrete-sidewalk-calculator": CON,
  "concrete-wall-calculator": CON,
  "concrete-driveway-calculator": CON,
  "foundation-cost-calculator": CON,
  "rebar-calculator": CON,
  "concrete-curing-time-calculator": CON,
  "cement-calculator": CON,
  "concrete-block-calculator": CON,
  "brick-calculator": CON,
  "mortar-calculator": CON,
  "block-fill-calculator": CON,
  "icf-calculator": CON,
  "asphalt-calculator": CON,
  "cold-patch-asphalt-calculator": CON,
  "sealcoat-calculator": CON,
  // GARD
  "sprinkler-system-cost-calculator": GARD,
};

/** Sub-categories emptied by the moves (deleted when empty). */
const EMPTIED = ["home-improvement-cost-sizing-calculators", "landscaping-aggregate-paving-calculators"];

/** For owning create-*.ts scripts: the moved-to category id for a slug, if it has been moved. */
export async function hgMovedCategoryId(client: PrismaClient, slug: string): Promise<string | undefined> {
  const target = HG_MOVES[slug];
  if (!target) return undefined;
  const cat = await client.toolCategory.findUnique({ where: { slug: target }, select: { id: true } });
  return cat?.id;
}

async function main() {
  console.log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  let main = await prisma.toolCategory.findUnique({ where: { slug: HG_MAIN.slug } });
  if (!main) {
    console.log(`${would}create main category "${HG_MAIN.name}"`);
    if (APPLY) main = await prisma.toolCategory.create({ data: { ...HG_MAIN, parentId: null, templateKey: "category-template-1", viewStyle: "grid" } });
  }
  const subIds = new Map<string, string>();
  for (const sub of HG_SUBCATEGORIES) {
    let found = await prisma.toolCategory.findUnique({ where: { slug: sub.slug } });
    if (!found) {
      console.log(`${would}create "${sub.name}"`);
      if (APPLY) found = await prisma.toolCategory.create({ data: { ...sub, parentId: main!.id, templateKey: "category-template-1", viewStyle: "grid" } });
    }
    if (found) subIds.set(sub.slug, found.id);
  }
  let moved = 0;
  for (const [slug, subSlug] of Object.entries(HG_MOVES)) {
    const tool = await prisma.tool.findUnique({ where: { slug }, select: { id: true, title: true, categoryId: true } });
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
  // Every tool has moved out of these two sub-categories, so remove them once they are empty.
  for (const slug of EMPTIED) {
    const c = await prisma.toolCategory.findUnique({ where: { slug }, include: { _count: { select: { tools: true, children: true } } } });
    if (!c || c._count.tools > 0 || c._count.children > 0) continue;
    console.log(`${would}delete the empty "${c.name}" category`);
    if (APPLY) await prisma.toolCategory.delete({ where: { id: c.id } });
  }
}

// Only run when executed directly (owning create-*.ts scripts import HG_MOVES from here).
if (process.argv[1]?.replace(/\\/g, "/").endsWith("setup-house-garden-category.ts")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
