// One-time (but safe to re-run) setup script: creates the Nova Scotia Income Tax
// Calculator Tool inside the "Canada Tax & Salary Calculators" category.
// Uses the shared content builder in canada-shared-content.ts — see
// create-ontario-tax-tool.ts's header for why a shared builder is used for
// the 11 provinces/territories whose mechanics are identical (only the
// numbers differ). Math lives in
// `canadaCustomCalculators["nova-scotia-income-tax-calculator"]` in src/lib/calc-engine-canada.ts.
//
// HOW TO RUN
//   npx tsx prisma/create-nova-scotia-tax-tool.ts
// or
//   npm run db:create-nova-scotia-tool

import { PrismaClient, Prisma } from "@prisma/client";
import { buildToolContent, buildSeoMeta, type CanadaProvinceContent } from "./canada-shared-content";

const prisma = new PrismaClient();

const SLUG = "nova-scotia-income-tax-calculator";

const content: CanadaProvinceContent = {
  slug: SLUG,
  name: "Nova Scotia",
  adjective: "Nova Scotia's",
  bracketDescription:
    "8.79% up to $30,995, 14.95% up to $61,991, 16.67% up to $97,417, 17.5% up to $157,124, and 21% above that",
  bpa: 11932,
  lowestRatePercent: "8.79%",
  baseline: {
    grossMonthly: 5000.0,
    federalTaxMonthly: 516.06,
    provincialTaxMonthly: 500.99,
    payrollLabel: "CPP",
    payrollMonthly: 280.15,
    eiMonthly: 81.5,
    totalDeductionsMonthly: 1378.70,
    netMonthly: 3621.30,
    annualNet: 43455.64,
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
