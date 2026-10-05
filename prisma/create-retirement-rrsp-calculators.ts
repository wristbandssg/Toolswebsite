// One-time (but safe to re-run) batch setup script: creates the RRSP tools
// (1) of the Interest Calculators expansion, filed under Retirement Calculators.
// See src/lib/calc-engine-retirement-rrsp.ts for the math and
// src/lib/calc-engine-interest-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-retirement-rrsp-calculators.ts
// or
//   npm run db:create-retirement-rrsp-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY = { name: "Retirement Calculators", slug: "retirement-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function currencyField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 100000000,
    step: opts.step ?? 100,
  };
}

function percentField(
  key: string,
  label: string,
  opts: { required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "percentage",
    unit: "%",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 100,
    step: opts.step ?? 0.1,
  };
}

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "number",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 1000000,
    step: opts.step ?? 1,
  };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't financial or tax advice. " +
  "Contribution limits and tax rules change — check your Notice of Assessment or CRA My Account for your " +
  "exact room.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "rrsp-calculator",
    title: "RRSP Interest Calculator",
    description: "Project a Canadian RRSP: your 2026 contribution room, the tax refund each contribution earns, tax-deferred growth, and what the savings are worth after tax when you withdraw.",
    metaTitle: "RRSP Calculator — Room, Tax Refund & Growth (C$)",
    metaDescription: "Free RRSP calculator. See your 2026 contribution room, yearly tax refund, how your RRSP grows, and its after-tax value in retirement.",
    calcInputs: [
      currencyField("earnedIncome", "Last Year's Earned Income", { unit: "C$", default: 80000, max: 10000000, step: 1000 }),
      currencyField("yearlyContribution", "Contribution per Year", { unit: "C$", default: 10000, max: 1000000, step: 500 }),
      currencyField("unusedRoom", "Unused Room Carried Forward", { unit: "C$", default: 0, max: 10000000, step: 500, required: false }),
      currencyField("currentBalance", "Current RRSP Balance", { unit: "C$", default: 30000, max: 100000000, step: 500, required: false }),
      percentField("returnPercent", "Interest or Return per Year", { default: 5, min: -10, max: 20, step: 0.25 }),
      numberField("years", "Years Until Retirement", { default: 25, min: 0, max: 60, step: 1 }),
      percentField("marginalTaxPercent", "Marginal Tax Rate Now", { default: 30, max: 60, step: 1 }),
      percentField("retirementTaxPercent", "Tax Rate When Withdrawn", { default: 20, max: 60, step: 1 }),
      currencyField("dollarLimit", "RRSP Dollar Limit", { unit: "C$", default: 33810, max: 100000, step: 10 }),
    ],
    calcResult: { label: "RRSP Value at Retirement", format: "currency", currency: "CAD" },
    calcResults: [
      { key: "newContributionRoom", label: "New Contribution Room", format: "currency", currency: "CAD" },
      { key: "contributionAllowed", label: "Contribution Allowed", format: "currency", currency: "CAD" },
      { key: "taxRefundPerYear", label: "Tax Refund per Year", format: "currency", currency: "CAD" },
      { key: "totalTaxRefunds", label: "Total Tax Refunds", format: "currency", currency: "CAD" },
      { key: "rrspValue", label: "RRSP Value at Retirement", format: "currency", currency: "CAD", highlight: true },
      { key: "afterTaxValueWhenWithdrawn", label: "After-Tax Value When Withdrawn", format: "currency", currency: "CAD" },
    ],
    instructions:
      "A Registered Retirement Savings Plan (RRSP) gives you a tax deduction for contributions, and the money grows " +
      "tax-deferred until you withdraw it, when it's taxed as income. Each year's new room is 18% of the previous year's " +
      "earned income, up to $33,810 for 2026, minus any pension adjustment; unused room carries forward. Your exact room is " +
      "on your Notice of Assessment.\n\n" +
      "The RRSP pays off most when your tax rate in retirement is lower than now. You must convert it to a RRIF or annuity " +
      "by the end of the year you turn 71.",
    examples:
      "Example: with C$80,000 of earned income, you get C$14,400 of new room. Contributing " +
      "C$10,000 a year at a 30% marginal rate gives a C$3,000 refund each year. " +
      "Starting from C$30,000 and earning 5% for 25 years, the RRSP grows to C$602,725.19 — " +
      "C$482,180.15 after tax at 20%.",
    assumptions:
      "Same contribution, room and returns every year; the refund isn't reinvested (investing it in a TFSA boosts the " +
      "benefit). Over-contributions above a $2,000 buffer are taxed 1% a month. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I use my RRSP before retirement?",
        answer: "Yes, through the Home Buyers' Plan (up to $60,000 for a first home) or the Lifelong Learning Plan, which you repay over time. Other withdrawals are taxed and lose the contribution room.",
      },
    ],
  },
];

async function ensureCategory() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY.slug}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, then re-run this script.`
    );
  }
  return category;
}

async function main() {
  const category = await ensureCategory();

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(def.calcInputs),
      calcResult: JSON.stringify(def.calcResult),
      calcResults: JSON.stringify(def.calcResults),
      instructions: paragraphsToHtml(def.instructions),
      examples: paragraphsToHtml(def.examples),
      assumptions: paragraphsToHtml(def.assumptions),
      faq: JSON.stringify(def.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: def.metaTitle,
      metaDescription: def.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.tool.update({
        where: { slug: def.slug },
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      updated++;
    } else {
      await prisma.tool.create({
        data: { slug: def.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all filed under "${category.name}".`);
  console.log(
    "New tools are created with status Draft — open them in /admin/tools, review, and set Status to Published " +
      "when you're happy with each one."
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
