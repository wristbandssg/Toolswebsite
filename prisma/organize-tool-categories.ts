// Organizes every tool category into the user's final taxonomy (27 Sep
// 2026) and removes any category that isn't part of it:
//
//   Finance Calculators (main category)
//     +- Loan Calculators
//     +- Mortgage Calculators
//     +- Interest Calculators
//     +- Investment Calculators
//     +- Savings Calculators
//     +- Retirement Calculators
//     +- Tax Calculators
//     |    +- the 12 country/state tax categories (UK, Canada, US states =
//     |       "Tax & Paycheck Calculators", ...) — kept as a third level
//     |       because Tax holds ~950 tools (the user chose this, "Plan B")
//     +- Credit & Debt Calculators
//     +- Salary & Income Calculators
//     +- Business Finance Calculators
//     +- Real Estate Calculators
//     +- Currency & Exchange Calculators
//     +- Budget & Personal Finance Calculators   (new, empty for now)
//     +- Insurance Calculators                   (new, empty for now)
//     +- Auto & Car Calculators                  (new, empty for now)
//     +- Crypto Calculators                      (new, empty for now)
//   Math Calculators (main category, new — home of percentage-calculator)
//   Health & Fitness Calculators (main category, new, empty for now)
//   Date & Time Calculators (main category, new, empty for now)
//   Unit Conversion Calculators (main category, new, empty for now)
//
// The "new, empty for now" categories were added at the user's request as
// homes for future tool batches. Empty categories are hidden from public
// category pages until they have a published tool (see
// src/app/(site)/tools/category/[slug]/page.tsx).
//
// Plus two tool moves the user asked for: business-loan-calculator from
// Business Finance to Loan Calculators, and the original sample
// percentage-calculator (filed directly under Finance) to Math Calculators.
//
// SAFE BY DEFAULT
//   npm run db:organize-categories            -> REPORT ONLY, changes nothing
//   npm run db:organize-categories -- --apply -> makes the changes
// With --apply, a full backup of every category and every tool's category
// is written to prisma/backups/ first, so the previous state can be
// restored by hand if anything looks wrong.
//
// What it will NOT do on its own: guess where a tool from an unknown
// category belongs. Any category outside the taxonomy that still holds
// tools (e.g. one created by hand in /admin) is left in place and listed in
// the report, so the user can decide. Only EMPTY unknown categories are
// deleted. Menu links pointing at a deleted category page are listed too.
//
// Tool URLs (/tools/<slug>) don't include the category, so moving a tool
// never changes its link. A deleted category's own page
// (/tools/category/<slug>) does disappear — the report lists those slugs
// so redirects can be added.

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");

const FINANCE_SLUGS = ["finance-calculators", "finance"]; // first match wins
const FINANCE_NAME = "Finance Calculators";

const FINANCE_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "Loan Calculators", slug: "loan-calculators" },
  { name: "Mortgage Calculators", slug: "mortgage-calculators" },
  { name: "Interest Calculators", slug: "interest-calculators" },
  { name: "Investment Calculators", slug: "investment-calculators" },
  { name: "Savings Calculators", slug: "savings-calculators" },
  { name: "Retirement Calculators", slug: "retirement-calculators" },
  { name: "Tax Calculators", slug: "tax-calculators" },
  { name: "Credit & Debt Calculators", slug: "credit-debt-calculators" },
  { name: "Salary & Income Calculators", slug: "salary-income-calculators" },
  { name: "Business Finance Calculators", slug: "business-finance-calculators" },
  { name: "Real Estate Calculators", slug: "real-estate-calculators" },
  { name: "Currency & Exchange Calculators", slug: "currency-exchange-calculators" },
  { name: "Budget & Personal Finance Calculators", slug: "budget-personal-finance-calculators" },
  { name: "Insurance Calculators", slug: "insurance-calculators" },
  { name: "Auto & Car Calculators", slug: "auto-car-calculators" },
  { name: "Crypto Calculators", slug: "crypto-calculators" },
];

// Kept under Tax Calculators when they exist; never created empty (a
// country only gets a category once it has tools).
const TAX_COUNTRY_SLUGS = [
  "australia-tax-salary-calculators",
  "canada-tax-salary-calculators",
  "hong-kong-tax-salary-calculators",
  "india-tax-salary-calculators",
  "malaysia-tax-salary-calculators",
  "new-zealand-tax-salary-calculators",
  "pakistan-tax-salary-calculators",
  "philippines-tax-salary-calculators",
  "singapore-tax-salary-calculators",
  "south-africa-tax-salary-calculators",
  "tax-paycheck-calculators",
  "uk-tax-salary-calculators",
];

// Top-level categories besides Finance Calculators.
const OTHER_MAIN_CATEGORIES: { name: string; slug: string }[] = [
  { name: "Math Calculators", slug: "math-calculators" },
  { name: "Health & Fitness Calculators", slug: "health-fitness-calculators" },
  { name: "Date & Time Calculators", slug: "date-time-calculators" },
  { name: "Unit Conversion Calculators", slug: "unit-conversion-calculators" },
];

// tool slug -> category slug it must end up in.
const TOOL_MOVES: Record<string, string> = {
  "business-loan-calculator": "loan-calculators",
  "percentage-calculator": "math-calculators",
};

type Cat = { id: string; name: string; slug: string; parentId: string | null };
type ToolRow = { id: string; slug: string; title: string; categoryId: string | null };

// The subset of the Prisma client this script uses, so it can also be run
// against an in-memory stand-in for testing.
type Db = Pick<PrismaClient, "toolCategory" | "tool" | "seoMeta" | "menu">;

export async function organizeToolCategories(prisma: Db, APPLY: boolean, log: (s?: string) => void = (s = "") => console.log(s)) {
  const would = APPLY ? "" : "[would] ";
  log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  log();

  let cats: Cat[] = await prisma.toolCategory.findMany({ select: { id: true, name: true, slug: true, parentId: true } });
  const tools: ToolRow[] = await prisma.tool.findMany({ select: { id: true, slug: true, title: true, categoryId: true } });

  if (APPLY) {
    const dir = path.join(__dirname, "backups");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `tool-categories-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(file, JSON.stringify({ categories: cats, tools }, null, 2));
    log(`Backup written: ${file}`);
    log();
  }

  // Placeholder ids for categories that only exist after a real create, so
  // report mode can still show the full outcome.
  let fakeId = 0;
  const bySlug = () => new Map(cats.map((c) => [c.slug, c]));

  async function ensureCategory(name: string, slug: string, parentId: string | null): Promise<Cat> {
    const existing = bySlug().get(slug);
    if (!existing) {
      log(`${would}CREATE category "${name}" (${slug})`);
      const created: Cat = APPLY
        ? await prisma.toolCategory.create({
            data: { name, slug, parentId, templateKey: "category-template-1", viewStyle: "grid" },
            select: { id: true, name: true, slug: true, parentId: true },
          })
        : { id: `new-${++fakeId}`, name, slug, parentId };
      cats.push(created);
      return created;
    }
    const data: { name?: string; parentId?: string | null } = {};
    if (existing.name !== name) data.name = name;
    if (existing.parentId !== parentId) data.parentId = parentId;
    if (Object.keys(data).length > 0) {
      const changes = [
        data.name !== undefined ? `rename "${existing.name}" -> "${name}"` : "",
        data.parentId !== undefined ? "move to correct parent" : "",
      ].filter(Boolean);
      log(`${would}UPDATE category ${slug}: ${changes.join(", ")}`);
      if (APPLY) await prisma.toolCategory.update({ where: { id: existing.id }, data });
      Object.assign(existing, data);
    }
    return existing;
  }

  // 1. Main categories and their sub-categories.
  const financeExisting = FINANCE_SLUGS.map((s) => bySlug().get(s)).find(Boolean);
  const finance = await ensureCategory(FINANCE_NAME, financeExisting?.slug ?? "finance-calculators", null);
  const otherMains: Cat[] = [];
  for (const main of OTHER_MAIN_CATEGORIES) otherMains.push(await ensureCategory(main.name, main.slug, null));
  const subBySlug = new Map<string, Cat>();
  for (const sub of FINANCE_SUBCATEGORIES) subBySlug.set(sub.slug, await ensureCategory(sub.name, sub.slug, finance.id));
  const tax = subBySlug.get("tax-calculators")!;
  for (const slug of TAX_COUNTRY_SLUGS) {
    const c = bySlug().get(slug);
    if (c) await ensureCategory(c.name, slug, tax.id);
  }

  // 2. The requested tool moves.
  for (const [toolSlug, catSlug] of Object.entries(TOOL_MOVES)) {
    const tool = tools.find((t) => t.slug === toolSlug);
    const target = bySlug().get(catSlug)!;
    if (!tool) {
      log(`(tool ${toolSlug} not in the database — nothing to move)`);
      continue;
    }
    if (tool.categoryId === target.id) continue;
    const from = cats.find((c) => c.id === tool.categoryId)?.name ?? "no category";
    log(`${would}MOVE tool "${tool.title}" from "${from}" to "${target.name}"`);
    if (APPLY) await prisma.tool.update({ where: { id: tool.id }, data: { categoryId: target.id } });
    tool.categoryId = target.id;
  }

  // 3. Everything else must already sit in an allowed category.
  const allowed = new Set<string>([finance.id, ...otherMains.map((c) => c.id), ...[...subBySlug.values()].map((c) => c.id)]);
  for (const slug of TAX_COUNTRY_SLUGS) {
    const c = bySlug().get(slug);
    if (c) allowed.add(c.id);
  }
  const unplaced = tools.filter((t) => !t.categoryId || !allowed.has(t.categoryId) || t.categoryId === finance.id);

  // 4. Delete every category outside the taxonomy that ends up empty
  //    (children first, repeating until nothing more can go).
  const deleted: Cat[] = [];
  const keptUnknown: Cat[] = [];
  let progress = true;
  while (progress) {
    progress = false;
    for (const c of cats.filter((c) => !allowed.has(c.id))) {
      const hasTools = tools.some((t) => t.categoryId === c.id);
      const hasChildren = cats.some((k) => k.parentId === c.id);
      if (hasTools || hasChildren) continue;
      log(`${would}DELETE category "${c.name}" (${c.slug})`);
      if (APPLY) {
        await prisma.seoMeta.deleteMany({ where: { toolCategoryId: c.id } });
        await prisma.toolCategory.delete({ where: { id: c.id } });
      }
      deleted.push(c);
      cats = cats.filter((k) => k.id !== c.id);
      progress = true;
    }
  }
  for (const c of cats.filter((c) => !allowed.has(c.id))) keptUnknown.push(c);

  // 5. Report.
  log();
  log("=== RESULT ===");
  const count = (id: string) => tools.filter((t) => t.categoryId === id).length;
  const printTree = (c: Cat, depth: number) => {
    log(`${"  ".repeat(depth)}- ${c.name} (${c.slug}) — ${count(c.id)} tool(s) directly`);
    for (const k of cats.filter((k) => k.parentId === c.id).sort((a, b) => a.name.localeCompare(b.name))) printTree(k, depth + 1);
  };
  for (const root of cats.filter((c) => !c.parentId).sort((a, b) => a.name.localeCompare(b.name))) printTree(root, 0);
  log();
  log(`Total tools: ${tools.length}`);

  if (unplaced.length > 0) {
    log();
    log(`NEEDS A DECISION — ${unplaced.length} tool(s) not in a known category (left where they are):`);
    for (const t of unplaced) log(`  - ${t.slug} (in: ${cats.find((c) => c.id === t.categoryId)?.slug ?? "no category"})`);
  }
  if (keptUnknown.length > 0) {
    log();
    log("NEEDS A DECISION — categories outside the new structure that still hold tools or sub-categories (kept):");
    for (const c of keptUnknown) log(`  - ${c.name} (${c.slug}) — ${count(c.id)} tool(s)`);
  }
  if (deleted.length > 0) {
    log();
    log("Deleted category pages (add redirects for these URLs):");
    for (const c of deleted) log(`  /tools/category/${c.slug}`);
    const menus = await prisma.menu.findMany({ select: { location: true, structure: true } });
    for (const m of menus) {
      for (const c of deleted) {
        if (m.structure.includes(`/tools/category/${c.slug}`)) log(`  ! The "${m.location}" menu links to /tools/category/${c.slug} — update it in the Menu Builder.`);
      }
    }
  }
  log();
  log(APPLY ? "Done — changes applied." : "Report only — nothing was changed. Run again with --apply to make these changes.");
}

if (process.argv[1]?.includes("organize-tool-categories")) {
  const prisma = new PrismaClient();
  organizeToolCategories(prisma, APPLY)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
