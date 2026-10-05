// One-time (but safe to re-run) batch setup script: creates the Annuity tools
// (1) of the Investment Calculators expansion, filed under Retirement Calculators.
// See src/lib/calc-engine-retirement-annuity.ts for the math and
// src/lib/calc-engine-investment-stocks.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-retirement-annuity-calculators.ts
// or
//   npm run db:create-retirement-annuity-calculators

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
  "This tool provides general estimates for informational purposes only and isn't investment or tax advice. " +
  "Annuity rates, surrender charges and terms vary by insurer — read the contract and check the insurer's " +
  "financial strength rating.";

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
    slug: "annuity-investment-calculator",
    title: "Annuity Investment Calculator",
    description: "Project a fixed deferred annuity (MYGA): tax-deferred growth at the guaranteed rate, its after-tax value compared with a taxable CD, and the monthly income if you annuitize it.",
    metaTitle: "Annuity Investment Calculator — MYGA Growth & Income",
    metaDescription: "Free annuity investment calculator. Project a fixed annuity's tax-deferred growth, compare it with a taxable CD, and see monthly income if annuitized.",
    calcInputs: [
      currencyField("premium", "Premium (Amount Invested)", { default: 100000, max: 100000000, step: 1000 }),
      percentField("guaranteedRatePercent", "Guaranteed Rate", { default: 5.25, max: 15, step: 0.05 }),
      numberField("years", "Guarantee Period (Years)", { default: 7, min: 0, max: 30, step: 1 }),
      percentField("taxRatePercent", "Your Tax Rate", { default: 24, max: 50, step: 1 }),
      percentField("cdRatePercent", "Taxable CD Rate (for Comparison)", { default: 4.75, max: 15, step: 0.05 }),
      numberField("payoutYears", "Income Period If Annuitized (Years)", { default: 20, min: 1, max: 50, step: 1 }),
      percentField("payoutRatePercent", "Interest Rate During Payout", { default: 4.5, max: 15, step: 0.05 }),
    ],
    calcResult: { label: "Annuity Value", format: "currency" },
    calcResults: [
      { key: "annuityValue", label: "Annuity Value", format: "currency", highlight: true },
      { key: "interestEarned", label: "Interest Earned (Tax-Deferred)", format: "currency" },
      { key: "afterTaxIfCashedOut", label: "After-Tax Value If Cashed Out", format: "currency" },
      { key: "taxableCdAfterTax", label: "Taxable CD After Tax", format: "currency" },
      { key: "advantageOverCd", label: "Advantage Over the CD", format: "currency" },
      { key: "monthlyIncomeIfAnnuitized", label: "Monthly Income If Annuitized", format: "currency" },
    ],
    instructions:
      "A multi-year guaranteed annuity (MYGA) from an insurer pays a fixed rate for a set period, like a CD, but the " +
      "interest isn't taxed until you withdraw it. At the end you can cash out, roll it into another annuity, or annuitize " +
      "it into a stream of payments.\n\n" +
      "Withdrawals beyond the free amount (often 10% a year) during the surrender period carry surrender charges, and " +
      "earnings withdrawn before age 59½ owe a 10% tax penalty. Annuities are backed by the insurer and your state's " +
      "guaranty association, not the FDIC.",
    examples:
      "Example: $100,000 in a 7-year MYGA at 5.25% grows to $143,072.03. Cashed out and taxed at " +
      "24%, that's $132,734.74, versus $128,177.48 from a CD at 4.75% taxed every " +
      "year. Annuitized over 20 years, it pays about $905.14 a month.",
    assumptions:
      "Interest compounds yearly; annuitized payments are a fixed period certain, not lifetime income (see the annuity " +
      "retirement income calculator for lifetime payouts). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Fixed annuity or CD?",
        answer: "A MYGA often pays more and defers tax, which helps if you're in a high bracket now. A CD is FDIC-insured and more flexible. Both lock your money up for the term.",
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
