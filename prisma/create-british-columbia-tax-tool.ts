// One-time (but safe to re-run) setup script: creates the British Columbia
// Income Tax Calculator Tool inside the "Canada Tax & Salary Calculators"
// category. Uses the shared content builder in canada-shared-content.ts —
// see create-ontario-tax-tool.ts's header for why a shared builder is used
// for the 11 provinces/territories whose mechanics are identical (only the
// numbers differ). Math lives in
// `canadaCustomCalculators["british-columbia-income-tax-calculator"]` in
// src/lib/calc-engine-canada.ts.
//
// HOW TO RUN
//   npx tsx prisma/create-british-columbia-tax-tool.ts
// or
//   npm run db:create-british-columbia-tool

import { PrismaClient, Prisma } from "@prisma/client";
import { buildToolContent, buildSeoMeta, type CanadaProvinceContent } from "./canada-shared-content";

const prisma = new PrismaClient();

const SLUG = "british-columbia-income-tax-calculator";

const content: CanadaProvinceContent = {
  slug: SLUG,
  name: "British Columbia",
  adjective: "British Columbia's",
  bracketDescription:
    "5.06% up to $50,363, 7.70% up to $100,728, 10.50% up to $115,648, 12.29% up to $140,430, 14.70% up to " +
    "$190,405, 16.80% up to $265,545, and 20.50% above that",
  bpa: 13216,
  lowestRatePercent: "5.06%",
  baseline: {
    grossMonthly: 5000.0,
    federalTaxMonthly: 516.06,
    provincialTaxMonthly: 218.47,
    payrollLabel: "CPP",
    payrollMonthly: 280.15,
    eiMonthly: 81.5,
    totalDeductionsMonthly: 1096.18,
    netMonthly: 3903.82,
    annualNet: 46845.84,
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
