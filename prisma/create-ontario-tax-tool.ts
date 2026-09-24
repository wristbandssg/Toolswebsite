// One-time (but safe to re-run) setup script: creates the "Canada Tax &
// Salary Calculators" Tool Category (if it doesn't already exist) and the
// Ontario Income Tax Calculator Tool. Uses the shared content builder in
// canada-shared-content.ts (see that file's header for why) — the math
// itself lives in `canadaCustomCalculators["ontario-income-tax-calculator"]`
// in src/lib/calc-engine-canada.ts, which also includes Ontario's Surtax
// and Health Premium (unique to Ontario — see that file's comments).
//
// HOW TO RUN
//   npx tsx prisma/create-ontario-tax-tool.ts
// or
//   npm run db:create-ontario-tool

import { PrismaClient, Prisma } from "@prisma/client";
import { buildToolContent, buildSeoMeta, type CanadaProvinceContent } from "./canada-shared-content";

const prisma = new PrismaClient();

const SLUG = "ontario-income-tax-calculator";

const content: CanadaProvinceContent = {
  slug: SLUG,
  name: "Ontario",
  adjective: "Ontario's",
  bracketDescription:
    "5.05% up to $53,891, 9.15% up to $107,785, 11.16% up to $150,000, 12.16% up to $220,000, and 13.16% above that",
  bpa: 12989,
  lowestRatePercent: "5.05%",
  specialNote:
    "Ontario also charges a Surtax — an extra 20% of Ontario tax itself above $5,818, plus a further 16% " +
    "(36% total) above $7,446 — and an Ontario Health Premium, a flat amount from $0 to $900/year based on " +
    "your taxable income, unchanged since 2004. This calculator includes both.",
  baseline: {
    grossMonthly: 5000.0,
    federalTaxMonthly: 516.06,
    provincialTaxMonthly: 218.71,
    extraLine: { label: "Ontario Health Premium (per payment)", monthly: 50.0 },
    payrollLabel: "CPP",
    payrollMonthly: 280.15,
    eiMonthly: 81.5,
    totalDeductionsMonthly: 1146.42,
    netMonthly: 3853.58,
    annualNet: 46243.0,
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
      "Its live URL will be /tools/" + SLUG + ". No \"Other State Calculators\"-style grid to link — the " +
      "Canada Tax & Salary Calculators category page lists every province/territory tool together once " +
      "published."
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
