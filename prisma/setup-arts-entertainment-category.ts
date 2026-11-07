// Arts & Entertainment Calculators (7 Nov 2026, user request: "Arts & Entertainment Calculator" is the
// only main category for the 120-keyword list; the user then asked for at least 20 tools per
// sub-category, so the groups were merged into 3). Keyword check:
// Claude outputs/Arts_Entertainment_Keyword_Check.md (82 new tools).
//   1. Creates the main category and its 3 sub-categories.
//   2. Moves existing art, photography, instrument, audio and creator-income tools whose main intent
//      belongs here (their owning create-*.ts scripts read ARTS_MOVES too, so re-running them keeps
//      the tools in place).
//
// HOW TO RUN
//   npx tsx prisma/setup-arts-entertainment-category.ts            (report only)
//   npx tsx prisma/setup-arts-entertainment-category.ts --apply    (make the changes)
// Safe to re-run.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const would = APPLY ? "" : "Would ";

export const ARTS_MAIN = { name: "Arts & Entertainment Calculators", slug: "arts-entertainment-calculators", breadcrumbName: "Arts & Entertainment" };

const MUSIC = "music-theory-instrument-audio-calculators";
const CREATIVE = "art-film-creator-income-calculators";
const MYSTIC = "tarot-astrology-fun-calculators";

export const ARTS_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "Music Theory, Instrument & Audio Calculators", slug: MUSIC },
  { name: "Art, Film & Creator Income Calculators", slug: CREATIVE },
  { name: "Tarot, Astrology & Fun Calculators", slug: MYSTIC },
];

/** Existing tools that move in: slug → sub-category slug. Owning scripts import this map. */
export const ARTS_MOVES: Record<string, string> = {
  "guitar-value-calculator": MUSIC,
  "piano-value-calculator": MUSIC,
  "audio-delay-calculator": MUSIC,
  "decibel-calculator": MUSIC,
  "speaker-wattage-calculator": MUSIC,
  "commission-price-calculator": CREATIVE,
  "painting-price-calculator": CREATIVE,
  "art-print-price-calculator": CREATIVE,
  "photography-pricing-calculator": CREATIVE,
  "photography-exposure-calculator": CREATIVE,
  "youtube-revenue-calculator": CREATIVE,
  "streaming-cost-calculator": MYSTIC,
};

/** For owning create-*.ts scripts: the moved-to category id for a slug, if it has been moved. */
export async function artsMovedCategoryId(client: PrismaClient, slug: string): Promise<string | undefined> {
  const target = ARTS_MOVES[slug];
  if (!target) return undefined;
  const cat = await client.toolCategory.findUnique({ where: { slug: target }, select: { id: true } });
  return cat?.id;
}

async function main() {
  console.log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  let main = await prisma.toolCategory.findUnique({ where: { slug: ARTS_MAIN.slug } });
  if (!main) {
    console.log(`${would}create main category "${ARTS_MAIN.name}"`);
    if (APPLY) main = await prisma.toolCategory.create({ data: { ...ARTS_MAIN, parentId: null, templateKey: "category-template-1", viewStyle: "grid" } });
  }
  const subIds = new Map<string, string>();
  for (const sub of ARTS_SUBCATEGORIES) {
    let found = await prisma.toolCategory.findUnique({ where: { slug: sub.slug } });
    if (!found) {
      console.log(`${would}create "${sub.name}"`);
      if (APPLY) found = await prisma.toolCategory.create({ data: { ...sub, parentId: main!.id, templateKey: "category-template-1", viewStyle: "grid" } });
    } else if (!main || found.parentId !== main.id || found.name !== sub.name) {
      console.log(`${would}move "${found.name}" under Arts & Entertainment as "${sub.name}"`);
      if (APPLY) found = await prisma.toolCategory.update({ where: { id: found.id }, data: { name: sub.name, parentId: main!.id } });
    }
    if (found) subIds.set(sub.slug, found.id);
  }
  for (const [slug, subSlug] of Object.entries(ARTS_MOVES)) {
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

// Only run when executed directly (owning create-*.ts scripts import ARTS_MOVES from here).
if (process.argv[1]?.replace(/\\/g, "/").endsWith("setup-arts-entertainment-category.ts")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
