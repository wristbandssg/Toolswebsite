// One-time (but safe to re-run) batch setup script: creates the Gratuity tools
// (1) of the Interest Calculators expansion, filed under Salary & Income Calculators.
// See src/lib/calc-engine-salary-gratuity.ts for the math and
// src/lib/calc-engine-interest-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-salary-gratuity-calculators.ts
// or
//   npm run db:create-salary-gratuity-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY = { name: "Salary & Income Calculators", slug: "salary-income-calculators" };

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
  "This tool provides general estimates for informational purposes only and isn't legal or tax advice. Your " +
  "employer's gratuity policy and the law decide the final amount — check with HR or a tax professional.";

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
    slug: "gratuity-calculator",
    title: "Gratuity Calculator",
    description: "Calculate the gratuity you'll receive when you leave a job in India, under the Payment of Gratuity Act or otherwise, and how much of it is tax-free.",
    metaTitle: "Gratuity Calculator — Amount & Tax-Free Limit (₹)",
    metaDescription: "Free gratuity calculator for India. Find your gratuity from last salary and years of service, and the tax-free portion up to ₹20 lakh.",
    calcInputs: [
      currencyField("monthlySalary", "Last Monthly Basic Pay + DA", { unit: "₹", default: 50000, max: 10000000, step: 500 }),
      numberField("years", "Completed Years of Service", { default: 10, min: 0, max: 50, step: 1 }),
      numberField("extraMonths", "Extra Months Beyond Completed Years", { default: 7, min: 0, max: 11, step: 1, required: false }),
      {
        key: "covered", label: "Employer Covered by the Gratuity Act?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes (10+ Employees)", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      currencyField("exemptLimit", "Tax-Free Limit", { unit: "₹", default: 2000000, max: 100000000, step: 100000 }),
    ],
    calcResult: { label: "Gratuity Amount", format: "currency", currency: "INR" },
    calcResults: [
      { key: "yearsCounted", label: "Years Counted", format: "number", currency: "INR" },
      { key: "gratuityAmount", label: "Gratuity Amount", format: "currency", currency: "INR", highlight: true },
      { key: "taxFreePortion", label: "Tax-Free Portion", format: "currency", currency: "INR" },
      { key: "taxablePortion", label: "Taxable Portion", format: "currency", currency: "INR" },
      { key: "eligibleAfterFiveYears", label: "5 Years' Service Completed (1 = Yes)", format: "number", currency: "INR" },
    ],
    instructions:
      "Gratuity is a lump sum your employer pays when you resign, retire or are laid off after at least 5 years of " +
      "continuous service (the 5-year rule doesn't apply on death or disablement). For employers covered by the Payment " +
      "of Gratuity Act, it's 15 days' salary for each year of service, using a 26-day month: 15 × last salary × years ÷ " +
      "26. A final part year of more than 6 months counts as a full year.\n\n" +
      "For employers not covered by the Act, it's usually half a month's salary per completed year (15 × salary × years ÷ " +
      "30). Salary means basic pay plus dearness allowance.",
    examples:
      "Example: with a last basic + DA of ₹50,000 and 10 years and 7 months of service, " +
      "11 years count. Gratuity is 15 × ₹50,000 × 11 ÷ 26 = ₹3,17,307.69, all of it " +
      "tax-free.",
    assumptions:
      "Private-sector employee; government employees' gratuity is fully tax-exempt. The ₹20 lakh limit applies to all " +
      "gratuity received in your career. Some courts have counted 4 years and 240 days as 5 years. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is gratuity paid if I resign before 5 years?",
        answer: "Generally no, under the Act — unless your employer's policy is more generous. It's paid regardless of service on death or disablement.",
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
