// Shopping clean-up (15 Oct 2026, user request: Shopping Calculators must have
// exactly 10 sub-categories, each with 10+ tools):
//   "Boat Calculators" (boat-calculators) and "Buying Costs Calculators"
//   (buying-costs-calculators) are folded into "Vehicle, Resale & Collectibles
//   Calculators" (vehicle-resale-collectibles-calculators). Their tools move,
//   the two sub-categories are deleted, and their URLs (plus any published
//   tool URLs) get 301s to the new locations.
//
// create-shopping-boats-calculators.ts and create-shopping-buying-costs-
// calculators.ts now file into the vehicle sub-category, so re-running them
// won't recreate what's removed.
//
// HOW TO RUN
//   npx tsx prisma/merge-shopping-boat-buying-into-vehicle.ts            (report only)
//   npx tsx prisma/merge-shopping-boat-buying-into-vehicle.ts --apply    (make the changes)
//
// In apply mode the full records of the affected categories (including their
// page content and SEO meta) and each affected tool's category are written to
// prisma/backups/ first. Safe to re-run.

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const MAIN_SLUG = "shopping-calculators";
const TARGET_SLUG = "vehicle-resale-collectibles-calculators";
const SOURCE_SLUGS = ["boat-calculators", "buying-costs-calculators"];

const href = (sub: string) => `/${MAIN_SLUG}/${sub}/`;

async function main() {
  console.log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  const target = await prisma.toolCategory.findUnique({ where: { slug: TARGET_SLUG } });
  if (!target) throw new Error(`"${TARGET_SLUG}" doesn't exist — run the create-shopping-veh-* scripts first.`);
  const sources = await prisma.toolCategory.findMany({ where: { slug: { in: SOURCE_SLUGS } }, include: { seoMeta: true } });
  if (!sources.length) {
    console.log("Both source sub-categories are already gone.");
    return;
  }
  const tools = await prisma.tool.findMany({
    where: { categoryId: { in: sources.map((s) => s.id) } },
    select: { id: true, slug: true, status: true, categoryId: true },
  });

  if (APPLY) {
    const dir = path.join(__dirname, "backups");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `shopping-merge-boat-buying-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(file, JSON.stringify({ categories: sources, tools }, null, 2));
    console.log(`Backup written: ${file}`);
  }

  const redirects: [string, string][] = [];
  for (const src of sources) {
    const children = await prisma.toolCategory.count({ where: { parentId: src.id } });
    if (children) throw new Error(`"${src.name}" has ${children} sub-categories — move them first.`);
    const mine = tools.filter((t) => t.categoryId === src.id);
    redirects.push([href(src.slug), href(TARGET_SLUG)]);
    for (const t of mine) if (t.status === "published") redirects.push([href(src.slug) + t.slug + "/", href(TARGET_SLUG) + t.slug + "/"]);
    if (APPLY) {
      await prisma.tool.updateMany({ where: { id: { in: mine.map((t) => t.id) } }, data: { categoryId: target.id } });
      await prisma.seoMeta.deleteMany({ where: { toolCategoryId: src.id } });
      await prisma.toolCategory.delete({ where: { id: src.id } });
    }
    console.log(`${APPLY ? "Moved" : "Would move"} ${mine.length} tool(s) from "${src.name}" to "${target.name}" and ${APPLY ? "deleted" : "delete"} it.`);
  }

  // 301s, stored the way the admin stores them: lowercase, no trailing slash.
  for (const [from, to] of redirects) {
    const key = from.toLowerCase().replace(/\/+$/, "");
    if (APPLY) await prisma.redirect.upsert({ where: { fromPath: key }, update: { toPath: to }, create: { fromPath: key, toPath: to } });
    console.log(`  ${APPLY ? "Redirect" : "Would redirect"} ${key} -> ${to}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
