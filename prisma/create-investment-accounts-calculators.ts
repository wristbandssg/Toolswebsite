// One-time (but safe to re-run) batch setup script: creates the Investment Account tools
// (2) of the Investment Calculators expansion, filed under Investment Calculators > Investment Returns & Planning Calculators.
// See src/lib/calc-engine-investment-accounts.ts for the math and
// src/lib/calc-engine-investment-stocks.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-investment-accounts-calculators.ts
// or
//   npm run db:create-investment-accounts-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "investment-calculators";
const CATEGORY = { name: "Investment Returns & Planning Calculators", slug: "investment-returns-planning-calculators" };

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
  "Tax rules and thresholds change — check IRS guidance or ask a tax professional.";

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
    slug: "custodial-investment-account-calculator",
    title: "Custodial Investment Account Calculator",
    description: "Project a UTMA/UGMA custodial account for a child: growth until they take control, the child's unearned income and kiddie tax, and gifts above the yearly gift tax exclusion.",
    metaTitle: "Custodial Account Calculator — UTMA/UGMA & Kiddie Tax",
    metaDescription: "Free custodial account calculator. Project a UTMA or UGMA account's growth, the child's investment income and kiddie tax, and gift limits.",
    calcInputs: [
      currencyField("initial", "Initial Deposit", { default: 5000, max: 100000000, step: 100 }),
      currencyField("yearlyContribution", "Contribution per Year", { default: 3000, max: 10000000, step: 100 }),
      percentField("returnPercent", "Expected Return per Year", { default: 7, min: -20, max: 20, step: 0.25 }),
      numberField("years", "Years Until the Child Takes Control", { default: 15, min: 0, max: 25, step: 1 }),
      percentField("incomeYieldPercent", "Dividends & Interest (% of Balance)", { default: 2, max: 10, step: 0.25 }),
      percentField("childRatePercent", "Child's Tax Rate", { default: 10, max: 40, step: 1 }),
      percentField("parentRatePercent", "Parents' Tax Rate", { default: 24, max: 40, step: 1 }),
      currencyField("threshold", "Kiddie Tax Threshold Step", { default: 1350, max: 10000, step: 50 }),
      currencyField("giftExclusion", "Gift Tax Exclusion per Giver", { default: 19000, max: 100000, step: 1000 }),
    ],
    calcResult: { label: "Value When the Child Takes Control", format: "currency" },
    calcResults: [
      { key: "totalContributed", label: "Total Contributed", format: "currency" },
      { key: "valueAtMajority", label: "Value When the Child Takes Control", format: "currency", highlight: true },
      { key: "growth", label: "Investment Growth", format: "currency" },
      { key: "firstYearUnearnedIncome", label: "First-Year Investment Income", format: "currency" },
      { key: "finalYearUnearnedIncome", label: "Final-Year Investment Income", format: "currency" },
      { key: "finalYearKiddieTax", label: "Final-Year Tax on That Income", format: "currency" },
      { key: "totalKiddieTax", label: "Total Tax Over the Years", format: "currency" },
      { key: "firstYearContributionOverGiftExclusion", label: "First-Year Gift Above the Exclusion", format: "currency" },
    ],
    instructions:
      "A custodial account (UTMA or UGMA) holds investments for a minor; the gift is irrevocable, and the child takes " +
      "control at 18 or 21 (up to 25 in some states). The child's investment income is taxed under the kiddie tax: the " +
      "first $1,350 is tax-free, the next $1,350 is taxed at the child's rate, and anything above $2,700 at the parents' " +
      "rate.\n\n" +
      "Each giver can give $19,000 a year (2026) without filing a gift tax return. Custodial assets count heavily against " +
      "financial aid — a custodial 529 plan counts less.",
    examples:
      "Example: $5,000 plus $3,000 a year for 15 years at 7% grows to $94,459.32 — " +
      "$44,459.32 of growth on $50,000 contributed. By the final year the account earns $1,765.59 of " +
      "dividends and interest, costing $41.56 in tax.",
    assumptions:
      "Contributions at the start of each year; dividends and interest reinvested; capital gains taxed only when sold " +
      "(not modeled). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Custodial account or 529 plan?",
        answer: "A 529 grows tax-free for education and the parent keeps control; a custodial account can be used for anything that benefits the child, but it becomes theirs at the age of majority.",
      },
    ],
  },
  {
    slug: "taxable-brokerage-account-calculator",
    title: "Taxable Brokerage Account Calculator",
    description: "Project a taxable brokerage account with tax on dividends each year and capital gains tax when you sell, and see the tax drag compared with a tax-free account.",
    metaTitle: "Taxable Brokerage Account Calculator — Tax Drag",
    metaDescription: "Free taxable brokerage calculator. Project growth with yearly dividend tax and capital gains tax at sale, and compare with a tax-free account.",
    calcInputs: [
      currencyField("initial", "Initial Investment", { default: 50000, max: 1000000000, step: 1000 }),
      currencyField("monthly", "Monthly Investment", { default: 1000, max: 10000000, step: 50, required: false }),
      percentField("totalReturnPercent", "Total Return per Year", { default: 8, min: -20, max: 30, step: 0.25 }),
      percentField("dividendYieldPercent", "Dividend Yield", { default: 2, max: 15, step: 0.1 }),
      percentField("dividendTaxPercent", "Tax Rate on Dividends", { default: 15, max: 50, step: 1 }),
      percentField("capitalGainsTaxPercent", "Capital Gains Tax Rate at Sale", { default: 15, max: 50, step: 1 }),
      numberField("years", "Years", { default: 20, min: 0, max: 60, step: 1 }),
    ],
    calcResult: { label: "After-Tax Value", format: "currency" },
    calcResults: [
      { key: "totalContributed", label: "Total Contributed", format: "currency" },
      { key: "valueBeforeSale", label: "Value Before Selling", format: "currency" },
      { key: "taxOnDividends", label: "Tax Paid on Dividends", format: "currency" },
      { key: "taxAtSale", label: "Capital Gains Tax at Sale", format: "currency" },
      { key: "afterTaxValue", label: "After-Tax Value", format: "currency", highlight: true },
      { key: "taxFreeAccountValue", label: "Same Savings in a Tax-Free Account", format: "currency" },
      { key: "totalTaxDrag", label: "Total Tax Drag", format: "currency" },
    ],
    instructions:
      "In a regular (taxable) brokerage account, dividends are taxed every year — qualified dividends at 0%, 15% or 20% — " +
      "and gains are taxed when you sell. Holding low-turnover index funds and selling only when needed keeps the tax drag " +
      "small. A Roth IRA or HSA avoids it entirely, within contribution limits.\n\n" +
      "Enter your plan and tax rates. Reinvested after-tax dividends add to your cost basis, so they aren't taxed twice.",
    examples:
      "Example: $50,000 plus $1,000 a month for 20 years at 8% grows to $792,573.16, after " +
      "$19,580.77 of dividend tax along the way. Selling everything costs $58,742.32 of capital gains tax, leaving " +
      "$733,830.84 — $92,292.08 less than in a tax-free account.",
    assumptions:
      "Contributions at the start of each year; all dividends qualified; no selling until the end. State taxes and the 3.8% " +
      "net investment income tax are not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why use a taxable account at all?",
        answer: "No contribution limits and no withdrawal rules — you can use the money anytime. Many people use it after maxing out retirement accounts.",
      },
    ],
  },
];

async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY_SLUG } });
  if (!parent) {
    throw new Error(
      `The "${PARENT_CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
        "then re-run this script."
    );
  }
  console.log(`Creating sub-category "${CATEGORY.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
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
