// One-time (but safe to re-run) setup script: creates the Quebec Income Tax
// Calculator Tool inside the "Canada Tax & Salary Calculators" category
// (created by create-ontario-tax-tool.ts, or here if that hasn't run yet).
// Uses the shared content builder in canada-shared-content.ts. The math
// lives in `canadaCustomCalculators["quebec-income-tax-calculator"]` in
// src/lib/calc-engine-canada.ts — Quebec is fully self-contained there
// (its own brackets/BPA, QPP instead of CPP, QPIP, a reduced EI rate, and
// a 16.5% federal abatement — see that file's comments).
//
// HOW TO RUN
//   npx tsx prisma/create-quebec-tax-tool.ts
// or
//   npm run db:create-quebec-tool

import { PrismaClient, Prisma } from "@prisma/client";
import { buildToolContent, buildSeoMeta, type CanadaProvinceContent } from "./canada-shared-content";

const prisma = new PrismaClient();

const SLUG = "quebec-income-tax-calculator";

const content: CanadaProvinceContent = {
  slug: SLUG,
  name: "Quebec",
  adjective: "Quebec's",
  bracketDescription: "14% up to $54,345, 19% up to $108,680, 24% up to $132,245, and 25.75% above that",
  bpa: 18952,
  lowestRatePercent: "14%",
  specialNote:
    "Quebec administers its own tax system separately from the rest of Canada: residents get a 16.5% federal " +
    "tax abatement (a flat reduction of federal tax otherwise payable), pay into the Quebec Pension Plan (QPP) " +
    "instead of CPP, pay the Quebec Parental Insurance Plan (QPIP) premium, and pay EI at a reduced rate since " +
    "QPIP covers parental leave separately. This calculator handles all of that automatically.",
  baseline: {
    grossMonthly: 5000.0,
    federalTaxMonthly: 430.91,
    provincialTaxMonthly: 502.46,
    payrollLabel: "QPP",
    payrollMonthly: 296.63,
    secondPayrollLabel: "QPIP",
    secondPayrollMonthly: 21.5,
    eiMonthly: 65.0,
    totalDeductionsMonthly: 1316.49,
    netMonthly: 3683.51,
    annualNet: 44202.1,
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

  const toolContent = {
    ...buildToolContent(content, category.id),
  } satisfies Prisma.ToolUncheckedUpdateInput;

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
    "Open it in /admin/tools, review it, then set Status to Published when you're happy with it. " +
      "Its live URL will be /tools/" + SLUG + "."
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
