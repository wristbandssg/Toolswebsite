// Second Finance clean-up (14 Oct 2026, user request):
//   1. Every tool in "Business Finance Calculators" (business-calculators) moves
//      straight into the Finance Calculators main category, and the Business
//      Finance sub-category is deleted.
//   2. The two economics sub-categories become one: Microeconomics' tools move
//      into Macroeconomics, which is renamed "Economics Calculators"
//      (economics-calculators), and Microeconomics is deleted.
//
// The create-business-*, create-finance-business and create-fin* scripts now
// file into these places, so re-running them won't recreate what's removed.
//
// HOW TO RUN
//   npx tsx prisma/flatten-business-finance-and-merge-economics.ts            (report only)
//   npx tsx prisma/flatten-business-finance-and-merge-economics.ts --apply    (make the changes)
//
// In apply mode the full records of the affected categories (including their
// page content and SEO meta) and each affected tool's category are written to
// prisma/backups/ first. Safe to re-run.

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const FINANCE_SLUG = "finance-calculators";
const BUSINESS_SLUG = "business-calculators";
const MICRO_SLUG = "microeconomics-calculators";
const MACRO_SLUG = "macroeconomics-calculators";
const ECONOMICS = { name: "Economics Calculators", slug: "economics-calculators" };

async function main() {
  console.log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  const finance = await prisma.toolCategory.findUnique({ where: { slug: FINANCE_SLUG } });
  if (!finance) throw new Error(`"${FINANCE_SLUG}" doesn't exist.`);
  const business = await prisma.toolCategory.findUnique({ where: { slug: BUSINESS_SLUG }, include: { seoMeta: true } });
  const micro = await prisma.toolCategory.findUnique({ where: { slug: MICRO_SLUG }, include: { seoMeta: true } });
  const economics =
    (await prisma.toolCategory.findUnique({ where: { slug: ECONOMICS.slug }, include: { seoMeta: true } })) ??
    (await prisma.toolCategory.findUnique({ where: { slug: MACRO_SLUG }, include: { seoMeta: true } }));
  if (!economics) throw new Error(`Neither "${ECONOMICS.slug}" nor "${MACRO_SLUG}" exists.`);

  const sourceIds = [business?.id, micro?.id].filter((x): x is string => Boolean(x));
  const tools = await prisma.tool.findMany({ where: { categoryId: { in: sourceIds } }, select: { id: true, slug: true, categoryId: true } });

  if (APPLY) {
    const dir = path.join(__dirname, "backups");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `finance-flatten-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(file, JSON.stringify({ categories: [business, micro, economics].filter(Boolean), tools }, null, 2));
    console.log(`Backup written: ${file}`);
  }

  // 1. Business Finance -> Finance Calculators main category.
  if (business) {
    const ids = tools.filter((t) => t.categoryId === business.id).map((t) => t.id);
    const children = await prisma.toolCategory.count({ where: { parentId: business.id } });
    if (children) throw new Error(`"${business.name}" has ${children} sub-categories — move them first.`);
    if (APPLY) {
      await prisma.tool.updateMany({ where: { id: { in: ids } }, data: { categoryId: finance.id } });
      await prisma.seoMeta.deleteMany({ where: { toolCategoryId: business.id } });
      await prisma.toolCategory.delete({ where: { id: business.id } });
    }
    console.log(`${APPLY ? "Moved" : "Would move"} ${ids.length} tool(s) from "${business.name}" to "${finance.name}" and ${APPLY ? "deleted" : "delete"} it.`);
  } else console.log(`"${BUSINESS_SLUG}" is already gone.`);

  // 2. Microeconomics + Macroeconomics -> Economics Calculators.
  if (economics.slug !== ECONOMICS.slug || economics.name !== ECONOMICS.name) {
    if (APPLY) await prisma.toolCategory.update({ where: { id: economics.id }, data: { name: ECONOMICS.name, slug: ECONOMICS.slug } });
    console.log(`${APPLY ? "Renamed" : "Would rename"} "${economics.name}" to "${ECONOMICS.name}" (/${ECONOMICS.slug}).`);
  }
  if (micro) {
    const ids = tools.filter((t) => t.categoryId === micro.id).map((t) => t.id);
    if (APPLY) {
      await prisma.tool.updateMany({ where: { id: { in: ids } }, data: { categoryId: economics.id } });
      await prisma.seoMeta.deleteMany({ where: { toolCategoryId: micro.id } });
      await prisma.toolCategory.delete({ where: { id: micro.id } });
    }
    console.log(`${APPLY ? "Moved" : "Would move"} ${ids.length} tool(s) from "${micro.name}" to "${ECONOMICS.name}" and ${APPLY ? "deleted" : "delete"} it.`);
  } else console.log(`"${MICRO_SLUG}" is already gone.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
