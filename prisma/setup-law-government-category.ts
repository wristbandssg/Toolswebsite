// Law & Government Calculators (18 Oct 2026, user request: "Law Government
// calculators" is the only main category for the 1,528-keyword list, at most
// 10 sub-categories). Hybrid state policy agreed with the user: separate
// state pages only where the state has its own law / formula / fee table;
// otherwise one tool with a state selector.
//   1. Creates the main category and its 10 sub-categories.
//   2. Moves existing tools whose main intent belongs here (their owning
//      create-*.ts scripts point at the new sub-categories too, so re-running
//      them keeps the tools in place).
//
// HOW TO RUN
//   npx tsx prisma/setup-law-government-category.ts            (report only)
//   npx tsx prisma/setup-law-government-category.ts --apply    (make the changes)
// Safe to re-run.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const would = APPLY ? "" : "Would ";

export const LAW_GOV_MAIN = { name: "Law & Government Calculators", slug: "law-government-calculators", breadcrumbName: "Law & Government" };

export const LAW_GOV_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "Military & Veterans Calculators", slug: "military-veterans-calculators" },
  { name: "Child Support Calculators", slug: "child-support-calculators" },
  { name: "Alimony, Divorce & Probate Calculators", slug: "alimony-divorce-probate-calculators" },
  { name: "Employment & Wage Law Calculators", slug: "employment-wage-law-calculators" },
  { name: "Unemployment, Workers' Comp & Paid Leave Calculators", slug: "unemployment-workers-comp-leave-calculators" },
  { name: "Government Benefits Calculators", slug: "government-benefits-calculators" },
  { name: "Personal Injury & Settlement Calculators", slug: "personal-injury-settlement-calculators" },
  { name: "Court, Criminal & Legal Fee Calculators", slug: "court-criminal-legal-fee-calculators" },
  { name: "Immigration & Visa Calculators", slug: "immigration-visa-calculators" },
  { name: "Government Fees & Public Finance Calculators", slug: "government-fees-public-finance-calculators" },
];

/** Existing tools that move in: slug → sub-category slug. */
export const LAW_GOV_MOVES: Record<string, string> = {
  "va-disability-calculator": "military-veterans-calculators",
  "selling-leave-days-calculator": "military-veterans-calculators",
  "army-acft-calculator": "military-veterans-calculators",
  "army-apft-calculator": "military-veterans-calculators",
  "marine-pft-calculator": "military-veterans-calculators",
  "navy-prt-calculator": "military-veterans-calculators",
  "air-force-pt-test-calculator": "military-veterans-calculators",
  "navy-body-fat-calculator": "military-veterans-calculators",
  "unemployment-benefit-calculator": "unemployment-workers-comp-leave-calculators",
  "post-judgment-interest-calculator": "court-criminal-legal-fee-calculators",
  "stimulus-check-calculator": "government-benefits-calculators",
};

async function main() {
  console.log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  let main = await prisma.toolCategory.findUnique({ where: { slug: LAW_GOV_MAIN.slug } });
  if (!main) {
    console.log(`${would}create main category "${LAW_GOV_MAIN.name}"`);
    if (APPLY) main = await prisma.toolCategory.create({ data: { ...LAW_GOV_MAIN, parentId: null, templateKey: "category-template-1", viewStyle: "grid" } });
  }
  const subIds = new Map<string, string>();
  for (const sub of LAW_GOV_SUBCATEGORIES) {
    let found = await prisma.toolCategory.findUnique({ where: { slug: sub.slug } });
    if (!found) {
      console.log(`${would}create "${sub.name}"`);
      if (APPLY) found = await prisma.toolCategory.create({ data: { ...sub, parentId: main!.id, templateKey: "category-template-1", viewStyle: "grid" } });
    } else if (!main || found.parentId !== main.id || found.name !== sub.name) {
      console.log(`${would}move "${found.name}" under Law & Government as "${sub.name}"`);
      if (APPLY) found = await prisma.toolCategory.update({ where: { id: found.id }, data: { name: sub.name, parentId: main!.id } });
    }
    if (found) subIds.set(sub.slug, found.id);
  }
  for (const [slug, subSlug] of Object.entries(LAW_GOV_MOVES)) {
    const tool = await prisma.tool.findUnique({ where: { slug }, select: { id: true, title: true, categoryId: true } });
    if (!tool) {
      console.log(`  (skip) ${slug} not found`);
      continue;
    }
    const target = subIds.get(subSlug);
    if (target && tool.categoryId === target) continue;
    console.log(`${would}move "${tool.title}" → ${subSlug}`);
    if (APPLY && target) await prisma.tool.update({ where: { id: tool.id }, data: { categoryId: target } });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
