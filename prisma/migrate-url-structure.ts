// One-time move to the new public URL structure (src/lib/urls.ts):
//   /tools/category/{x} → /{main}/ or /{main}/{x}/
//   /tools/{calculator} → /{main}/{calculator}/
//   /pages/{page}       → /{page}/
// and a trailing slash on every public URL.
//
// 1. Renames the one category whose slug clashed with a calculator
//    ("interest-rate-calculator"), keeping a 301 from its old URL.
// 2. Rewrites every internal link stored in the database (menus, blog posts,
//    calculator text, category articles, page sections, site settings,
//    author bios) to its final new URL — the same answer the live redirects
//    give, so no link goes through a redirect.
//
// Run AFTER the new code is live:   npx tsx prisma/migrate-url-structure.ts
// Preview without writing anything: npx tsx prisma/migrate-url-structure.ts --dry-run
import { PrismaClient } from "@prisma/client";
import { clearRedirectCache } from "../src/lib/public-redirects";
import { rewriteStoredLinks } from "../src/lib/link-rewrite";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry-run");

async function renameClashingCategory() {
  const OLD = "interest-rate-calculator";
  const NEW = "interest-rate-calculators";
  const category = await prisma.toolCategory.findUnique({ where: { slug: OLD } });
  const tool = await prisma.tool.findUnique({ where: { slug: OLD }, select: { id: true } });
  if (!category || !tool) {
    console.log("1. Category/calculator slug clash: none left.");
    return;
  }
  console.log(`1. Renaming category "${category.name}" (${OLD}) → "Interest Rate Calculators" (${NEW}).`);
  if (DRY) return;
  await prisma.toolCategory.update({ where: { id: category.id }, data: { slug: NEW, name: "Interest Rate Calculators" } });
  // Its old URL, /tools/category/interest-rate-calculator, would otherwise find nothing.
  const parent = category.parentId ? await prisma.toolCategory.findUnique({ where: { id: category.parentId } }) : null;
  const toPath = parent ? `/${parent.slug}/${NEW}/` : `/${NEW}/`;
  await prisma.redirect.upsert({
    where: { fromPath: `/tools/category/${OLD}` },
    create: { fromPath: `/tools/category/${OLD}`, toPath, type: "permanent" },
    update: { toPath },
  });
  clearRedirectCache();
}

async function main() {
  console.log(DRY ? "DRY RUN — nothing is written.\n" : "Migrating…\n");
  await renameClashingCategory();

  console.log("2. Rewriting stored links:");
  const stats = await rewriteStoredLinks({ dryRun: DRY });
  for (const m of stats.perModel) console.log(`  ${m.label}: ${m.changed} of ${m.total} changed`);
  console.log(`\n${stats.linksChanged} links in ${stats.fieldsChanged} fields ${DRY ? "would change" : "changed"}. Examples:`);
  for (const [from, to] of stats.examples) console.log(`  ${from}  →  ${to}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
