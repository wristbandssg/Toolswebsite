// One-time (but safe to re-run) batch setup script: creates the Tax-Advantaged Savings Account tools
// (3) of the Interest Calculators expansion, filed under Savings Calculators.
// See src/lib/calc-engine-savings-tax-advantaged.ts for the math and
// src/lib/calc-engine-interest-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-savings-tax-advantaged-calculators.ts
// or
//   npm run db:create-savings-tax-advantaged-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY = { name: "Savings Calculators", slug: "savings-calculators" };

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
  "Contribution limits, allowances and tax rules change — check with the IRS, HMRC or CRA, or a tax " +
  "professional, for your situation.";

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
    slug: "health-savings-account-calculator",
    title: "Health Savings Account Calculator",
    description: "Estimate your HSA: the 2026 contribution limit, how much tax you save each year, and how the account grows with investment returns after paying medical costs.",
    metaTitle: "HSA Calculator — 2026 Limits, Tax Savings & Growth",
    metaDescription: "Free HSA calculator. See the 2026 contribution limit, your yearly tax savings, and how your health savings account grows over time.",
    calcInputs: [
      {
        key: "coverage", label: "HDHP Coverage", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Self-Only ($4,400 Limit)", value: 1 },
          { label: "Family ($8,750 Limit)", value: 2 },
        ],
      },
      {
        key: "age55Plus", label: "Age 55 or Older?", type: "dropdown", required: true, default: 0,
        options: [
          { label: "No", value: 0 },
          { label: "Yes (+$1,000 Catch-Up)", value: 1 },
        ],
      },
      currencyField("plannedContribution", "Your Planned Contribution per Year", { default: 4400, max: 20000, step: 100 }),
      currencyField("employerContribution", "Employer Contribution per Year", { default: 0, max: 20000, step: 100, required: false }),
      currencyField("currentBalance", "Current HSA Balance", { default: 2000, max: 10000000, step: 100, required: false }),
      percentField("returnPercent", "Interest or Investment Return", { default: 5, min: -10, max: 20, step: 0.25 }),
      numberField("years", "Years", { default: 20, min: 0, max: 50, step: 1 }),
      percentField("taxRatePercent", "Federal + State Income Tax Rate", { default: 22, max: 60, step: 1 }),
      {
        key: "viaPayroll", label: "Contribute Through Payroll?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes (Also Saves 7.65% FICA)", value: 1 },
          { label: "No — Deduct on My Tax Return", value: 0 },
        ],
      },
      currencyField("yearlyMedicalSpending", "Medical Costs Paid From HSA per Year", { default: 1000, max: 100000, step: 100, required: false }),
    ],
    calcResult: { label: "HSA Balance After the Years", format: "currency" },
    calcResults: [
      { key: "contributionLimit", label: "2026 Contribution Limit", format: "currency" },
      { key: "yourAllowedContribution", label: "Your Contribution (Within the Limit)", format: "currency" },
      { key: "taxSavedPerYear", label: "Tax Saved per Year", format: "currency" },
      { key: "totalTaxSaved", label: "Total Tax Saved", format: "currency" },
      { key: "balanceAfterYears", label: "HSA Balance After the Years", format: "currency", highlight: true },
    ],
    instructions:
      "A health savings account (HSA), available with a high-deductible health plan, is triple tax-advantaged: " +
      "contributions are tax-deductible (or pre-tax through payroll, which also skips Social Security and Medicare tax), " +
      "growth is tax-free, and withdrawals for qualified medical expenses are tax-free. For 2026 you can put in $4,400 " +
      "(self-only) or $8,750 (family), plus $1,000 at 55 or older; employer contributions count toward the limit.\n\n" +
      "Unused money rolls over every year. After 65, you can withdraw for any purpose, paying income tax like a traditional " +
      "IRA.",
    examples:
      "Example: contributing $4,400 a year through payroll at a 22% tax rate saves " +
      "$1,304.60 of tax each year. Earning 5% and spending $1,000 a year on medical " +
      "costs, the HSA grows to $123,352.05 after 20 years.",
    assumptions:
      "Contributions and spending happen at the start of each year; limits stay at 2026 levels. California and New Jersey " +
      "tax HSA contributions and growth. Non-medical withdrawals before 65 owe tax plus a 20% penalty. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I invest my HSA or keep it in cash?",
        answer: "Many people keep enough cash to cover their deductible and invest the rest for long-term growth, paying current medical bills out of pocket and saving the receipts to reimburse themselves later.",
      },
    ],
  },
  {
    slug: "cash-isa-interest-calculator",
    title: "Cash ISA Interest Calculator",
    description: "See how much tax-free interest a UK Cash ISA earns, within the £20,000 yearly allowance, and how much tax you'd pay on the same savings in a normal account.",
    metaTitle: "Cash ISA Calculator — Tax-Free Interest (£)",
    metaDescription: "Free Cash ISA calculator. See your ISA balance and tax-free interest, and the tax you'd pay in a normal savings account above your allowance.",
    calcInputs: [
      currencyField("initialDeposit", "Initial Deposit", { unit: "£", default: 10000, max: 10000000, step: 100 }),
      currencyField("monthlyDeposit", "Monthly Deposit", { unit: "£", default: 500, max: 100000, step: 50, required: false }),
      percentField("aerPercent", "Interest Rate (AER)", { default: 4.2, max: 15, step: 0.05 }),
      numberField("years", "Years", { default: 5, min: 0, max: 40, step: 1 }),
      {
        key: "taxBand", label: "Your Income Tax Band", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Basic Rate (20%, £1,000 Allowance)", value: 1 },
          { label: "Higher Rate (40%, £500 Allowance)", value: 2 },
          { label: "Additional Rate (45%, No Allowance)", value: 3 },
        ],
      },
      currencyField("allowance", "ISA Allowance per Tax Year", { unit: "£", default: 20000, max: 100000, step: 1000 }),
    ],
    calcResult: { label: "ISA Balance", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "totalDeposited", label: "Total Deposited", format: "currency", currency: "GBP" },
      { key: "isaBalance", label: "ISA Balance", format: "currency", currency: "GBP", highlight: true },
      { key: "isaInterest", label: "Tax-Free Interest", format: "currency", currency: "GBP" },
      { key: "taxableAccountBalance", label: "Same Savings in a Taxable Account", format: "currency", currency: "GBP" },
      { key: "taxSaved", label: "Tax You'd Pay Outside an ISA", format: "currency", currency: "GBP" },
    ],
    instructions:
      "Interest in a Cash ISA is free of UK income tax. You can pay in up to £20,000 a tax year across all your ISAs. " +
      "Outside an ISA, interest above your Personal Savings Allowance — £1,000 for basic-rate, £500 for higher-rate and " +
      "nothing for additional-rate taxpayers — is taxed at your rate.\n\n" +
      "The Government has announced that from April 2027 the Cash ISA limit falls to £12,000 for savers under 65 (the " +
      "overall £20,000 allowance stays). Change the allowance field to see the effect.",
    examples:
      "Example: £10,000 plus £500 a month at 4.20% for 5 years — £40,000 deposited — grows " +
      "to £45,649.67 in a Cash ISA, all tax-free. A higher-rate taxpayer would pay £1,236.90 of tax on the same savings in " +
      "a normal account.",
    assumptions:
      "Fixed AER, interest added monthly; deposits above the allowance are skipped. Assumes no other savings interest uses " +
      "your Personal Savings Allowance; the starting rate for savings isn't modeled. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I move money between ISAs?",
        answer: "Yes — use your provider's ISA transfer service rather than withdrawing, or the money loses its ISA status (unless the ISA is flexible).",
      },
    ],
  },
  {
    slug: "tfsa-interest-calculator",
    title: "TFSA Interest Calculator",
    description: "Project a Canadian Tax-Free Savings Account: tax-free growth on your contributions, compared with a taxable account, and a check against your contribution room.",
    metaTitle: "TFSA Calculator — Tax-Free Growth & Room (C$)",
    metaDescription: "Free TFSA calculator. See your Tax-Free Savings Account's growth, the tax saved vs a taxable account, and any over-contribution.",
    calcInputs: [
      currencyField("currentBalance", "Current TFSA Balance", { unit: "C$", default: 20000, max: 10000000, step: 500, required: false }),
      currencyField("yearlyContribution", "Contribution per Year", { unit: "C$", default: 7000, max: 200000, step: 500 }),
      percentField("returnPercent", "Interest or Return per Year", { default: 4, min: -10, max: 20, step: 0.25 }),
      numberField("years", "Years", { default: 15, min: 0, max: 60, step: 1 }),
      percentField("marginalTaxPercent", "Your Marginal Tax Rate", { default: 30, max: 60, step: 1 }),
      currencyField("contributionRoom", "Your Contribution Room This Year", { unit: "C$", default: 7000, max: 200000, step: 500 }),
    ],
    calcResult: { label: "TFSA Value", format: "currency", currency: "CAD" },
    calcResults: [
      { key: "totalContributed", label: "Total Contributed (Incl. Current Balance)", format: "currency", currency: "CAD" },
      { key: "tfsaValue", label: "TFSA Value", format: "currency", currency: "CAD", highlight: true },
      { key: "tfsaGrowth", label: "Tax-Free Growth", format: "currency", currency: "CAD" },
      { key: "taxableAccountValue", label: "Same Savings in a Taxable Account", format: "currency", currency: "CAD" },
      { key: "taxSaved", label: "Advantage of the TFSA", format: "currency", currency: "CAD" },
      { key: "overContributionThisYear", label: "Over-Contribution This Year", format: "currency", currency: "CAD" },
    ],
    instructions:
      "Interest, dividends and gains in a TFSA are never taxed, and withdrawals are tax-free. The 2026 limit is $7,000; " +
      "unused room carries forward, so someone who has been eligible (18+ and resident) since 2009 has $109,000 of total " +
      "room. Withdrawals are added back to your room the next calendar year. Check your exact room in CRA My Account.\n\n" +
      "Over-contributions are taxed at 1% a month. Enter your contributions, expected return and marginal tax rate.",
    examples:
      "Example: starting with C$20,000 and adding C$7,000 a year for 15 years at 4%, a TFSA " +
      "grows to C$181,790.59. In a taxable account at a 30% marginal rate, the same savings reach " +
      "C$162,156.77 — the TFSA is C$19,633.81 ahead.",
    assumptions:
      "Contributions at the start of each year; returns fully taxed as interest in the taxable account (capital gains and " +
      "Canadian dividends are taxed less). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "TFSA or RRSP?",
        answer: "If your tax rate will be lower in retirement than now, an RRSP usually wins; if it'll be the same or higher, a TFSA does. See the RRSP calculator.",
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
