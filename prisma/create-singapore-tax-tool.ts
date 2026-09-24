// One-time (but safe to re-run) setup script: creates the "Singapore Tax &
// Salary Calculators" Tool Category (if it doesn't already exist) and the
// Singapore Income Tax Calculator Tool — a single national tool, like
// India, Australia, South Africa, and Pakistan (see
// calc-engine-singapore.ts's header). The math lives in
// `singaporeCustomCalculators["singapore-income-tax-calculator"]` in
// src/lib/calc-engine-singapore.ts — YA 2026 resident brackets and CPF
// Relief.
//
// HOW TO RUN
//   npx tsx prisma/create-singapore-tax-tool.ts
// or
//   npm run db:create-singapore-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "singapore-income-tax-calculator";

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
    where: { slug: "singapore-tax-salary-calculators" },
    update: { name: "Singapore Tax & Salary Calculators" },
    create: {
      name: "Singapore Tax & Salary Calculators",
      slug: "singapore-tax-salary-calculators",
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

  const calcInputs = [
    {
      key: "annualSalary",
      label: "Annual Salary",
      type: "currency",
      unit: "SGD/year",
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
      key: "cpfContribution",
      label: "CPF Contribution (citizens & PRs only — leave at $0 if not applicable)",
      unit: "per payment",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
  ];

  const calcResults = [
    { key: "grossPayPerPeriod", label: "Gross Pay (per payment)", format: "currency", currency: "SGD" },
    { key: "incomeTax", label: "Income Tax (per payment)", format: "currency", currency: "SGD" },
    { key: "cpfContribution", label: "CPF Contribution (per payment)", format: "currency", currency: "SGD" },
    { key: "totalDeductions", label: "Total Deductions (per payment)", format: "currency", currency: "SGD" },
    {
      key: "netPayPerPeriod",
      label: "Your Take-Home Pay (per payment)",
      format: "currency",
      currency: "SGD",
      highlight: true,
    },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency", currency: "SGD" },
  ];

  const instructions =
    "This Singapore income tax calculator works out your income tax and take-home pay for Year of Assessment " +
    "2026 (income earned in 2025), using IRAS's resident individual tax rates.\n\n" +
    "Enter your annual salary and how often you're paid. If you're a Singapore Citizen or Permanent Resident " +
    "who contributes to CPF, add your per-payment employee contribution — it reduces both your taxable income " +
    "(via CPF Relief) and your take-home pay. If you're on an Employment Pass or other work pass, you don't " +
    "contribute to CPF, so leave it at $0.\n\n" +
    "Click Calculate to see a full breakdown, both per payment and for the year. Singapore's tax rates are " +
    "progressive — only the portion of your chargeable income inside a given band is taxed at that band's " +
    "rate, not your whole salary — this calculator applies that correctly at every income level.";

  const assumptions =
    "This calculator uses confirmed Year of Assessment 2026 resident individual tax rates: 0% on the first " +
    "S$20,000 of chargeable income, then eleven more bands from 2% to 23%, topping out at 24% above " +
    "S$1,000,000 — unchanged since the Budget 2023 revision took effect for YA 2024.\n\n" +
    "CPF contribution rates depend on the employee's age band and only apply to Singapore Citizens and " +
    "Permanent Residents — a work pass holder doesn't contribute at all. Rather than assume a rate that would " +
    "be wrong for a meaningful share of visitors, this calculator takes your CPF contribution as a direct " +
    "input; the amount you enter reduces taxable income via CPF Relief, matching how CPF is actually treated " +
    "under Singapore tax law.\n\n" +
    "It doesn't include Singapore's other reliefs (Earned Income Relief, Parent Relief, Course Fees Relief, " +
    "and more) or tax rebates, so treat it as a close estimate rather than an exact Notice of Assessment " +
    "figure — your actual tax bill may be lower once your full relief claims are accounted for.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax practitioner or IRAS directly.";

  const examples =
    "Example: someone earning S$60,000 a year, paid monthly, with no CPF entered (e.g. a work pass holder), " +
    "pays about S$162.50/month in income tax (S$1,950/year), taking home approximately S$4,837.50 per month " +
    "— about S$58,050 for the year.\n\n" +
    "Someone earning S$15,000 a year pays no income tax at all — that's below the S$20,000 tax-free threshold " +
    "— leaving the full S$15,000 as take-home pay (before any CPF contribution).";

  const faq = [
    {
      question: "Why does this calculator ask me to enter my own CPF contribution?",
      answer:
        "CPF contribution rates vary by age band and only apply to Singapore Citizens and Permanent Residents " +
        "— an Employment Pass or other work pass holder doesn't contribute to CPF at all. Rather than assume a " +
        "rate that would be wrong for many visitors, this calculator lets you enter your own known " +
        "contribution for an accurate result.",
    },
    {
      question: "Does my CPF contribution reduce my tax?",
      answer:
        "Yes, via CPF Relief — employee CPF contributions are deducted from assessable income under Singapore " +
        "tax law, so entering an amount here lowers both your calculated income tax and (since it's still " +
        "money leaving your paycheck) your take-home pay.",
    },
    {
      question: "Is there a lower tax rate for non-residents?",
      answer:
        "This calculator uses RESIDENT tax rates, which apply to Singapore Citizens, Permanent Residents, and " +
        "foreigners who work in Singapore for 183 days or more in a calendar year. Non-residents (fewer than " +
        "183 days) are taxed differently — typically a flat rate or resident rates, whichever gives more tax " +
        "— and aren't covered by this calculator.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate using confirmed YA 2026 resident tax rates and CPF Relief treatment. It doesn't " +
        "include other reliefs (Earned Income Relief, Parent Relief, Course Fees Relief, and more), so your " +
        "actual tax bill after filing may be lower.",
    },
  ];

  const toolContent = {
    title: "Singapore Income Tax Calculator",
    description:
      "Work out income tax and take-home pay with this Singapore income tax calculator. Enter your salary and " +
      "CPF contribution to see a full breakdown for Year of Assessment 2026.",
    templateKey: "tool-template-3",
    categoryId: category.id,
    calcType: "custom" as const,
    calcFormula: null,
    calcInputs: JSON.stringify(calcInputs),
    calcResult: JSON.stringify({ label: "Take-Home Pay", unit: "", format: "currency", currency: "SGD" }),
    calcResults: JSON.stringify(calcResults),
    instructions: paragraphsToHtml(instructions),
    examples: paragraphsToHtml(examples),
    assumptions: paragraphsToHtml(assumptions),
    faq: JSON.stringify(faq),
  } satisfies Prisma.ToolUncheckedUpdateInput;

  const seoMetaContent = {
    contentType: "tool",
    metaTitle: "Singapore Income Tax Calculator (YA 2026) — Salary & Take-Home Pay",
    metaDescription:
      "Free Singapore income tax calculator for Year of Assessment 2026. Estimate income tax and take-home " +
      "pay using IRAS's resident tax rates and CPF Relief.",
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
      "Its live URL will be /tools/" + SLUG + ". This is Singapore's only tool for now — no category grid " +
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
