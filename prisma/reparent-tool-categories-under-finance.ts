// One-time (but safe to re-run) migration: builds out the full Finance
// Calculators taxonomy —
//
//   Finance Calculators (root, no tools filed directly under it)
//     +- Loan Calculators
//     +- Mortgage Calculators
//     +- Investment Calculators
//     +- Interest Calculators
//     +- Savings Calculators
//     +- Retirement Calculators
//     +- Tax Calculators
//     |    +- Australia Tax & Salary Calculators
//     |    +- Canada Tax & Salary Calculators
//     |    +- Hong Kong Tax & Salary Calculators
//     |    +- India Tax & Salary Calculators
//     |    +- Malaysia Tax & Salary Calculators
//     |    +- New Zealand Tax & Salary Calculators
//     |    +- Pakistan Tax & Salary Calculators
//     |    +- Philippines Tax & Salary Calculators
//     |    +- Singapore Tax & Salary Calculators
//     |    +- South Africa Tax & Salary Calculators
//     |    +- Tax & Paycheck Calculators (the US states)
//     |    +- UK Tax & Salary Calculators
//     +- Credit & Debt Calculators
//     +- Salary & Income Calculators
//     +- Business Finance Calculators
//     +- Real Estate Calculators
//     +- Currency & Exchange Calculators
//
// Every existing TOOL keeps its current category exactly as-is (a Pakistan
// tool is still filed under "Pakistan Tax & Salary Calculators" — this
// script only moves CATEGORIES around, three levels deep now instead of
// two: Finance Calculators -> Tax Calculators -> country/state category ->
// tool. The 11 topic categories other than Tax Calculators are created
// empty and ready for tools to be filed under them directly, whenever
// there are tools that belong there.
//
// This supersedes the earlier version of this script, which only nested
// everything ONE level deep directly under Finance Calculators (including
// the 12 country/state tax categories). Running this version moves those
// 12 one level further in, under the new "Tax Calculators" category — it
// finds each one by its known slug, so it works no matter which state
// they're currently in (still top-level, or already filed directly under
// Finance Calculators from an earlier run of the old script).
//
// WHY THIS WORKS WITHOUT A SCHEMA CHANGE
// ---------------------------------------
// ToolCategory.parentId already supports arbitrary nesting depth — the
// only thing that changed alongside this script is that the admin API
// (src/app/api/tool-categories/route.ts and .../[id]/route.ts) no longer
// artificially restricts nesting to one level; it now only rejects an edit
// that would create a CYCLE. See the ToolCategory.parentId comment in
// schema.prisma, and the matching change in
// src/components/admin/ToolCategoriesManager.tsx, which can now render and
// edit a category tree of any depth (a "Parent Category" dropdown on every
// row, not just top-level ones).
//
// Safe to run more than once — every step is an upsert or a "skip if
// already correct" check.
//
// HOW TO RUN
//   npx tsx prisma/reparent-tool-categories-under-finance.ts
// or
//   npm run db:setup-finance-categories

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FINANCE_NAME = "Finance Calculators";
const FINANCE_SLUGS = ["finance", "finance-calculators"];

// The 12 topic-level sub-categories that go directly under Finance
// Calculators. "Tax Calculators" is the one that gets its own children
// (the country/state categories) below — every other entry here is
// created empty, ready for tools to be filed under it later.
const TOPIC_CATEGORIES: { name: string; slug: string }[] = [
  { name: "Loan Calculators", slug: "loan-calculators" },
  { name: "Mortgage Calculators", slug: "mortgage-calculators" },
  { name: "Investment Calculators", slug: "investment-calculators" },
  { name: "Interest Calculators", slug: "interest-calculators" },
  { name: "Savings Calculators", slug: "savings-calculators" },
  { name: "Retirement Calculators", slug: "retirement-calculators" },
  { name: "Tax Calculators", slug: "tax-calculators" },
  { name: "Credit & Debt Calculators", slug: "credit-debt-calculators" },
  { name: "Salary & Income Calculators", slug: "salary-income-calculators" },
  { name: "Business Finance Calculators", slug: "business-finance-calculators" },
  { name: "Real Estate Calculators", slug: "real-estate-calculators" },
  { name: "Currency & Exchange Calculators", slug: "currency-exchange-calculators" },
];

const TAX_CALCULATORS_SLUG = "tax-calculators";

// The country/state tax categories created by the earlier
// create-<country>-tax-tool.ts / create-<state>-tax-tool.ts scripts — these
// move under "Tax Calculators" regardless of where they currently sit.
const COUNTRY_TAX_CATEGORY_SLUGS = [
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

async function main() {
  // 1. Finance Calculators — the root.
  let finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
  if (!finance) {
    finance = await prisma.toolCategory.findFirst({
      where: { name: { equals: FINANCE_NAME, mode: "insensitive" } },
    });
  }
  if (!finance) {
    finance = await prisma.toolCategory.create({
      data: {
        name: FINANCE_NAME,
        slug: "finance-calculators",
        templateKey: "category-template-1",
        viewStyle: "grid",
      },
    });
    console.log(`Created the "${FINANCE_NAME}" category (it didn't exist yet).`);
  } else {
    console.log(`Using existing "${finance.name}" category (slug: ${finance.slug}) as the root.`);
  }
  if (finance.parentId) {
    finance = await prisma.toolCategory.update({ where: { id: finance.id }, data: { parentId: null } });
    console.log(`"${finance.name}" had its own parent — promoted it back to top-level.`);
  }

  // 2. The 12 topic sub-categories directly under Finance Calculators.
  const topicIdBySlug = new Map<string, string>();
  for (const topic of TOPIC_CATEGORIES) {
    const cat = await prisma.toolCategory.upsert({
      where: { slug: topic.slug },
      update: { name: topic.name, parentId: finance.id },
      create: {
        name: topic.name,
        slug: topic.slug,
        parentId: finance.id,
        templateKey: "category-template-1",
        viewStyle: "grid",
      },
    });
    topicIdBySlug.set(topic.slug, cat.id);
    console.log(`- "${cat.name}" is ready under "${finance.name}"`);
  }

  // 3. The 12 existing country/state tax categories move one level further
  // in, under "Tax Calculators" specifically (one of the topics above).
  const taxCalculatorsId = topicIdBySlug.get(TAX_CALCULATORS_SLUG);
  if (!taxCalculatorsId) {
    throw new Error('"Tax Calculators" wasn\'t created — this should never happen, aborting.');
  }
  let movedCountryCats = 0;
  let alreadyCorrect = 0;
  for (const slug of COUNTRY_TAX_CATEGORY_SLUGS) {
    const cat = await prisma.toolCategory.findUnique({ where: { slug } });
    if (!cat) {
      console.warn(`- skipped "${slug}": no category with this slug exists yet (its tool hasn't been created).`);
      continue;
    }
    if (cat.parentId === taxCalculatorsId) {
      alreadyCorrect++;
      continue;
    }
    await prisma.toolCategory.update({ where: { id: cat.id }, data: { parentId: taxCalculatorsId } });
    movedCountryCats++;
    console.log(`- moved "${cat.name}" under "Tax Calculators"`);
  }

  console.log(
    `\nDone. "${finance.name}" now has ${TOPIC_CATEGORIES.length} topic sub-categories. ` +
      `${movedCountryCats} country/state tax categor${movedCountryCats === 1 ? "y" : "ies"} moved under ` +
      `"Tax Calculators" (${alreadyCorrect} were already there).`
  );
  console.log(
    "Open /admin/tools/categories to see the full tree. Every existing tool keeps its current category — only " +
      "the category tree around it changed. The 11 topic categories other than Tax Calculators are empty for " +
      "now; file tools under them from each tool's Edit page whenever you're ready."
  );
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
