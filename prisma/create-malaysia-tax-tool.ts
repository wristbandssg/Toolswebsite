// One-time (but safe to re-run) setup script: creates the "Malaysia Tax &
// Salary Calculators" Tool Category (if it doesn't already exist) and the
// Malaysia Income Tax Calculator Tool — a single national tool, like India,
// Australia, South Africa, and Pakistan (see calc-engine-malaysia.ts's
// header). The math lives in
// `malaysiaCustomCalculators["malaysia-income-tax-calculator"]` in
// src/lib/calc-engine-malaysia.ts — YA 2025 resident brackets, Individual
// Relief, and EPF relief.
//
// HOW TO RUN
//   npx tsx prisma/create-malaysia-tax-tool.ts
// or
//   npm run db:create-malaysia-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "malaysia-income-tax-calculator";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

async function main() {
  const category = await prisma.toolCategory.upsert({
    where: { slug: "malaysia-tax-salary-calculators" },
    update: { name: "Malaysia Tax & Salary Calculators" },
    create: {
      name: "Malaysia Tax & Salary Calculators",
      slug: "malaysia-tax-salary-calculators",
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

  const calcInputs = [
    {
      key: "annualSalary",
      label: "Annual Salary",
      type: "currency",
      unit: "MYR/year",
      required: true,
      min: 0,
      max: 5000000,
    },
    {
      key: "payFrequency",
      label: "Pay Frequency",
      type: "dropdown",
      required: true,
      default: 12,
      options: [
        { label: "Monthly (12 payments/year)", value: 12 },
        { label: "Annually (1 payment/year)", value: 1 },
      ],
    },
    {
      key: "epfContribution",
      label: "EPF / KWSP Contribution",
      unit: "per payment",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
  ];

  const calcResults = [
    { key: "grossPayPerPeriod", label: "Gross Pay (per payment)", format: "currency", currency: "MYR" },
    { key: "incomeTax", label: "Income Tax (per payment)", format: "currency", currency: "MYR" },
    { key: "epfContribution", label: "EPF Contribution (per payment)", format: "currency", currency: "MYR" },
    { key: "totalDeductions", label: "Total Deductions (per payment)", format: "currency", currency: "MYR" },
    {
      key: "netPayPerPeriod",
      label: "Your Take-Home Pay (per payment)",
      format: "currency",
      currency: "MYR",
      highlight: true,
    },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency", currency: "MYR" },
  ];

  const instructions =
    "This Malaysia income tax calculator works out your income tax and take-home pay for Year of Assessment " +
    "2025 (income earned in the 2025 calendar year), using LHDN's resident individual tax rates.\n\n" +
    "Enter your annual salary and how often you're paid. If you have an EPF (KWSP) contribution, add the " +
    "per-payment amount — it reduces your taxable income up to the relief cap AND your take-home pay; " +
    "otherwise leave it at RM0.\n\n" +
    "Click Calculate to see a full breakdown, both per payment and for the year. Malaysia's tax bands are " +
    "progressive — only the portion of your chargeable income inside a given band is taxed at that band's " +
    "rate, not your whole salary — this calculator applies that correctly at every income level.";

  const assumptions =
    "This calculator uses confirmed YA 2025 resident individual tax bands, from 0% (up to RM5,000 of " +
    "chargeable income) through nine more bands up to 30% (above RM2,000,000). It applies the Individual " +
    "Relief of RM9,000, which every resident taxpayer gets automatically, plus EPF relief on the amount you " +
    "enter, capped at RM7,000/year (in reality this cap is shared with life insurance premiums in one combined " +
    "relief category — this calculator treats it as EPF-only for simplicity).\n\n" +
    "It doesn't include Malaysia's many other individual reliefs (spouse, children, medical, lifestyle, SSPN, " +
    "and more), SOCSO/EIS contributions, or tax rebates, so treat it as a close estimate rather than an exact " +
    "Form BE/B figure — your actual liability may be lower once your full relief claims are accounted for.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax practitioner or LHDN directly.";

  const examples =
    "Example: someone earning RM80,000 a year, paid monthly, with no EPF entered, pays about RM324.17/month " +
    "in income tax (RM3,890/year), taking home approximately RM6,342.50 per month — about RM76,110 for the " +
    "year.\n\n" +
    "The same RM80,000/year earner who enters an EPF contribution of RM733.33/month (a typical 11% employee " +
    "rate) pays less tax — about RM253.33/month (RM3,040/year), since RM7,000 of that EPF is deductible — " +
    "though take-home pay is lower overall once the full EPF contribution itself is subtracted, at about " +
    "RM5,680.00 per month.";

  const faq = [
    {
      question: "Why does adding my EPF contribution lower my tax but also lower my take-home pay?",
      answer:
        "Both are true at once. EPF relief (capped at RM7,000/year) reduces the income your tax is calculated " +
        "on, so your tax bill goes down. But the full EPF amount is still money going into your retirement " +
        "account rather than your pocket, so it also reduces take-home pay — just by less than it would " +
        "without the tax saving.",
    },
    {
      question: "What is the Individual Relief?",
      answer:
        "A flat RM9,000 relief every Malaysian resident taxpayer gets automatically for themselves, before any " +
        "other reliefs — this calculator applies it without needing you to enter anything.",
    },
    {
      question: "Does this include SOCSO or EIS deductions?",
      answer:
        "No — SOCSO and EIS are relatively small, capped contributions with their own bracket tables. This " +
        "calculator focuses on income tax and EPF, the two figures that affect the largest share of a " +
        "salaried Malaysian's take-home pay.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate using confirmed YA 2025 tax bands and the Individual and EPF reliefs. It doesn't " +
        "include Malaysia's many other reliefs (spouse, children, medical, lifestyle, and more) or SOCSO/EIS, " +
        "so your actual tax bill after filing may be lower.",
    },
  ];

  const toolContent = {
    title: "Malaysia Income Tax Calculator",
    description:
      "Work out income tax and take-home pay with this Malaysia income tax calculator. Enter your salary and " +
      "EPF contribution to see a full breakdown for Year of Assessment 2025.",
    templateKey: "tool-template-3",
    categoryId: category.id,
    calcType: "custom" as const,
    calcFormula: null,
    calcInputs: JSON.stringify(calcInputs),
    calcResult: JSON.stringify({ label: "Take-Home Pay", unit: "", format: "currency", currency: "MYR" }),
    calcResults: JSON.stringify(calcResults),
    instructions: paragraphsToHtml(instructions),
    examples: paragraphsToHtml(examples),
    assumptions: paragraphsToHtml(assumptions),
    faq: JSON.stringify(faq),
  } satisfies Prisma.ToolUncheckedUpdateInput;

  const seoMetaContent = {
    contentType: "tool",
    metaTitle: "Malaysia Income Tax Calculator (YA 2025) — Salary & Take-Home Pay",
    metaDescription:
      "Free Malaysia income tax calculator for Year of Assessment 2025. Estimate income tax and take-home pay " +
      "using LHDN's resident tax bands and EPF relief.",
    schemaType: "SoftwareApplication",
  };

  const existing = await prisma.tool.findUnique({ where: { slug: SLUG } });

  if (existing) {
    await prisma.tool.update({
      where: { slug: SLUG },
      data: {
        ...toolContent,
        seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } },
      },
    });
    console.log(`Updated the "${SLUG}" tool's content.`);
  } else {
    await prisma.tool.create({
      data: {
        slug: SLUG,
        status: "draft",
        ...toolContent,
        seoMeta: { create: seoMetaContent },
      },
    });
    console.log(`Created the "${SLUG}" tool (status: draft).`);
  }

  console.log(
    "Open it in /admin/tools, review it, then set Status to Published when you're happy with it. " +
      "Its live URL will be /tools/" + SLUG + ". This is Malaysia's only tool for now — no category grid " +
      "to link."
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
