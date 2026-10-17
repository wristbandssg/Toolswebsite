// Real Estate restructure (17 Oct 2026, user request: "Real Estate
// Calculators" is the main category, at most 10 sub-categories, existing
// tools moved — not rebuilt — when they fit):
//   1. real-estate-calculators leaves Finance and becomes a main category.
//   2. Its 10 sub-categories (prisma/real-estate-structure.ts) are created;
//      Mortgage Calculators (with its children) moves under it from Finance.
//   3. Mortgage Cost & Insurance merges into Mortgage Payment, Type & Cost,
//      and a 5th child, Mortgage Calculators by State, City & Country, is
//      added.
//   4. Every tool listed in REAL_ESTATE_TOOL_CATEGORY moves to its new
//      sub-category (the 125 tools that sat directly in Real Estate, the 50
//      state property tax + 29 state transfer tax tools from Tax & Paycheck,
//      the property/rental tax tools from Tax, title and landlord insurance,
//      the timeshare loan family, barndominium and home addition cost).
//
// Moved categories and tools keep their slugs, so public-redirects.ts (rule 3)
// already sends their old URLs to the new ones. The one deleted category gets
// a 301 row.
//
// HOW TO RUN
//   npx tsx prisma/restructure-real-estate-main-category.ts            (report only)
//   npx tsx prisma/restructure-real-estate-main-category.ts --apply    (make the changes)
//
// In apply mode, the affected categories and every moved tool's old category
// are written to prisma/backups/ first. Safe to re-run.

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import {
  MERGED_MORTGAGE_CHILD,
  MORTGAGE_CHILDREN,
  REAL_ESTATE_MAIN,
  REAL_ESTATE_SUBCATEGORIES,
  REAL_ESTATE_TOOL_CATEGORY,
} from "./real-estate-structure";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const would = APPLY ? "" : "Would ";

async function ensure(name: string, slug: string, parentId: string | null) {
  const found = await prisma.toolCategory.findUnique({ where: { slug } });
  if (found) {
    if (found.parentId !== parentId || found.name !== name) {
      console.log(`${would}set "${found.name}" -> name "${name}", parent ${parentId ?? "(main)"}`);
      if (APPLY) return prisma.toolCategory.update({ where: { id: found.id }, data: { name, parentId } });
    }
    return found;
  }
  console.log(`${would}create "${name}" (${slug})`);
  if (!APPLY) return { id: `new:${slug}`, slug, name, parentId };
  return prisma.toolCategory.create({ data: { name, slug, parentId, templateKey: "category-template-1", viewStyle: "grid" } });
}

async function main() {
  console.log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  const main = await prisma.toolCategory.findUnique({ where: { slug: REAL_ESTATE_MAIN.slug } });
  if (!main) throw new Error(`"${REAL_ESTATE_MAIN.slug}" doesn't exist.`);

  const mergeFrom = await prisma.toolCategory.findUnique({ where: { slug: MERGED_MORTGAGE_CHILD.from }, include: { seoMeta: true } });
  const toolSlugs = Object.keys(REAL_ESTATE_TOOL_CATEGORY);
  const tools = await prisma.tool.findMany({
    where: { OR: [{ slug: { in: toolSlugs } }, { categoryId: main.id }, ...(mergeFrom ? [{ categoryId: mergeFrom.id }] : [])] },
    select: { id: true, slug: true, categoryId: true },
  });

  if (APPLY) {
    const dir = path.join(__dirname, "backups");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `real-estate-restructure-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    const cats = await prisma.toolCategory.findMany({
      where: { slug: { in: [REAL_ESTATE_MAIN.slug, MERGED_MORTGAGE_CHILD.from, ...REAL_ESTATE_SUBCATEGORIES.map((s) => s.slug), ...MORTGAGE_CHILDREN.map((s) => s.slug)] } },
      include: { seoMeta: true },
    });
    fs.writeFileSync(file, JSON.stringify({ categories: cats, tools }, null, 2));
    console.log(`Backup written: ${file}`);
  }

  // 1. Main category.
  if (main.parentId || main.breadcrumbName !== REAL_ESTATE_MAIN.breadcrumbName) {
    console.log(`${would}make "${main.name}" a main category`);
    if (APPLY) await prisma.toolCategory.update({ where: { id: main.id }, data: { parentId: null, breadcrumbName: REAL_ESTATE_MAIN.breadcrumbName } });
  }

  // 2. Sub-categories and Mortgage's children.
  const ids = new Map<string, string>();
  for (const sub of REAL_ESTATE_SUBCATEGORIES) ids.set(sub.slug, (await ensure(sub.name, sub.slug, main.id)).id);
  const mortgageId = ids.get("mortgage-calculators")!;
  for (const child of MORTGAGE_CHILDREN) ids.set(child.slug, (await ensure(child.name, child.slug, mortgageId)).id);

  // 3. Merge Mortgage Cost & Insurance.
  if (mergeFrom) {
    const into = ids.get(MERGED_MORTGAGE_CHILD.into)!;
    const mine = tools.filter((t) => t.categoryId === mergeFrom.id);
    console.log(`${would}move ${mine.length} tool(s) from "${mergeFrom.name}" into Mortgage Payment, Type & Cost and delete it`);
    if (APPLY) {
      await prisma.tool.updateMany({ where: { categoryId: mergeFrom.id }, data: { categoryId: into } });
      await prisma.seoMeta.deleteMany({ where: { toolCategoryId: mergeFrom.id } });
      await prisma.toolCategory.delete({ where: { id: mergeFrom.id } });
      const from = `/finance-calculators/${MERGED_MORTGAGE_CHILD.from}`;
      const to = `/${REAL_ESTATE_MAIN.slug}/${MERGED_MORTGAGE_CHILD.into}/`;
      for (const key of [from, `/${REAL_ESTATE_MAIN.slug}/${MERGED_MORTGAGE_CHILD.from}`]) {
        await prisma.redirect.upsert({ where: { fromPath: key }, update: { toPath: to }, create: { fromPath: key, toPath: to } });
      }
    }
  }

  // 4. Tool moves.
  let moved = 0;
  const leftovers: string[] = [];
  for (const t of tools) {
    const target = REAL_ESTATE_TOOL_CATEGORY[t.slug];
    if (!target) {
      if (t.categoryId === main.id) leftovers.push(t.slug);
      continue;
    }
    const id = ids.get(target)!;
    if (t.categoryId === id) continue;
    moved++;
    if (APPLY) await prisma.tool.update({ where: { id: t.id }, data: { categoryId: id } });
  }
  const missing = toolSlugs.filter((s) => !tools.some((t) => t.slug === s));
  console.log(`${would}move ${moved} tool(s) into the Real Estate sub-categories.`);
  if (missing.length) console.log(`Not in the database (skipped): ${missing.join(", ")}`);
  if (leftovers.length) console.log(`Still directly in Real Estate (not in the map): ${leftovers.join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
