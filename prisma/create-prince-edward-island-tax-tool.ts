// One-time (but safe to re-run) setup script: creates the Prince Edward Island Income Tax
// Calculator Tool inside the "Canada Tax & Salary Calculators" category.
// Uses the shared content builder in canada-shared-content.ts — see
// create-ontario-tax-tool.ts's header for why a shared builder is used for
// the 11 provinces/territories whose mechanics are identical (only the
// numbers differ). Math lives in
// `canadaCustomCalculators["prince-edward-island-income-tax-calculator"]` in src/lib/calc-engine-canada.ts.
//
// HOW TO RUN
//   npx tsx prisma/create-prince-edward-island-tax-tool.ts
// or
//   npm run db:create-prince-edward-island-tool

import { PrismaClient, Prisma } from "@prisma/client";
import { buildToolContent, buildSeoMeta, type CanadaProvinceContent } from "./canada-shared-content";

const prisma = new PrismaClient();

const SLUG = "prince-edward-island-income-tax-calculator";

const content: CanadaProvinceContent = {
  slug: SLUG,
  name: "Prince Edward Island",
  adjective: "Prince Edward Island's",
  bracketDescription:
    "9.5% up to $33,928, 13.47% up to $65,820, 16.6% up to $106,890, 17.62% up to $142,250, and 19% above that",
  bpa: 15000,
  lowestRatePercent: "9.5%",
  baseline: {
    grossMonthly: 5000.0,
    federalTaxMonthly: 516.06,
    provincialTaxMonthly: 442.50,
    payrollLabel: "CPP",
    payrollMonthly: 280.15,
    eiMonthly: 81.5,
    totalDeductionsMonthly: 1320.21,
    netMonthly: 3679.79,
    annualNet: 44157.47,
  },
};

async function main() {
  const category = await prisma.toolCategory.upsert({
    where: { slug: "canada-tax-salary-calculators" },
    update: { name: "Canada Tax & Salary Calculators" },
    create: {
      name: "Canada Tax & Salary Calculators",
      slug: "canada-tax-salary-calculators",
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

  const toolContent = { ...buildToolContent(content, category.id) } satisfies Prisma.ToolUncheckedUpdateInput;
  const seoMetaContent = buildSeoMeta(content);

  const existing = await prisma.tool.findUnique({ where: { slug: SLUG } });

  if (existing) {
    await prisma.tool.update({
      where: { slug: SLUG },
      data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
    });
    console.log(`Updated the "${SLUG}" tool's content.`);
  } else {
    await prisma.tool.create({
      data: { slug: SLUG, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
    });
    console.log(`Created the "${SLUG}" tool (status: draft).`);
  }

  console.log(
    "Open it in /admin/tools, review it, then set Status to Published when you're happy with it. Its live " +
      "URL will be /tools/" + SLUG + "."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
