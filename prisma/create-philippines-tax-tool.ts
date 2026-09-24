// One-time (but safe to re-run) setup script: creates the "Philippines Tax
// & Salary Calculators" Tool Category (if it doesn't already exist) and the
// Philippines Income Tax Calculator Tool — a single national tool, like
// India, Australia, South Africa, and Pakistan (see
// calc-engine-philippines.ts's header). The math lives in
// `philippinesCustomCalculators["philippines-income-tax-calculator"]` in
// src/lib/calc-engine-philippines.ts — the TRAIN Law graduated tax table
// and mandatory-contributions deduction.
//
// HOW TO RUN
//   npx tsx prisma/create-philippines-tax-tool.ts
// or
//   npm run db:create-philippines-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "philippines-income-tax-calculator";

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
    where: { slug: "philippines-tax-salary-calculators" },
    update: { name: "Philippines Tax & Salary Calculators" },
    create: {
      name: "Philippines Tax & Salary Calculators",
      slug: "philippines-tax-salary-calculators",
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

  const calcInputs = [
    {
      key: "annualSalary",
      label: "Annual Salary",
      type: "currency",
      unit: "PHP/year",
      required: true,
      min: 0,
      max: 50000000,
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
      key: "mandatoryContributions",
      label: "SSS / PhilHealth / Pag-IBIG Contributions",
      unit: "per payment",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
  ];

  const calcResults = [
    { key: "grossPayPerPeriod", label: "Gross Pay (per payment)", format: "currency", currency: "PHP" },
    { key: "incomeTax", label: "Income Tax (per payment)", format: "currency", currency: "PHP" },
    {
      key: "mandatoryContributions",
      label: "SSS/PhilHealth/Pag-IBIG (per payment)",
      format: "currency",
      currency: "PHP",
    },
    { key: "totalDeductions", label: "Total Deductions (per payment)", format: "currency", currency: "PHP" },
    {
      key: "netPayPerPeriod",
      label: "Your Take-Home Pay (per payment)",
      format: "currency",
      currency: "PHP",
      highlight: true,
    },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency", currency: "PHP" },
  ];

  const instructions =
    "This Philippines income tax calculator works out your income tax and take-home pay using the graduated " +
    "tax table under the TRAIN Law, in effect since 1 January 2023.\n\n" +
    "Enter your annual salary and how often you're paid. If you know your combined SSS, PhilHealth, and " +
    "Pag-IBIG contribution per payment, add it — these are excluded from taxable income under Philippine tax " +
    "law, so entering them lowers both your tax and your take-home pay; otherwise leave it at ₱0.\n\n" +
    "Click Calculate to see a full breakdown, both per payment and for the year. The Philippines' tax table is " +
    "progressive — only the portion of your taxable income inside a given band is taxed at that band's rate, " +
    "not your whole salary — this calculator applies that correctly at every income level.";

  const assumptions =
    "This calculator uses the graduated individual income tax table under the TRAIN Law (Section 24(A)(2)(a) " +
    "of the Tax Code, as amended by RA 10963), effective since 1 January 2023 and unchanged since: 0% up to " +
    "₱250,000, then 15%/20%/25%/30% through four more bands, topping out at 35% above ₱8,000,000.\n\n" +
    "SSS, PhilHealth, and Pag-IBIG each have their own bracket-based contribution table with floors and " +
    "ceilings that aren't a flat percentage of salary — rather than approximate all three (which would be " +
    "wrong at the edges of each table), this calculator takes your combined per-payment contribution as a " +
    "direct input.\n\n" +
    "It doesn't account for the 13th month pay exemption (up to ₱90,000), de minimis benefits, or other " +
    "payroll-specific exemptions, so treat it as a close estimate of your regular salary's tax rather than an " +
    "exact payslip figure.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax practitioner or the BIR directly.";

  const examples =
    "Example: someone earning ₱600,000 a year, paid monthly, with no contributions entered, pays about " +
    "₱5,208.33/month in income tax (₱62,500/year), taking home approximately ₱44,791.67 per month — about " +
    "₱537,500 for the year.\n\n" +
    "Someone earning ₱200,000 a year pays no income tax at all — that's below the ₱250,000 tax-free threshold " +
    "— leaving the full ₱200,000 as take-home pay (before any mandatory contributions).";

  const faq = [
    {
      question: "Why doesn't this calculator work out my SSS/PhilHealth/Pag-IBIG contributions for me?",
      answer:
        "Each of the three has its own bracket table with a different floor and ceiling, none of which is a " +
        "flat percentage of salary — approximating them with one formula would give a wrong answer near the " +
        "edges of each table. Enter your combined per-payment amount from your payslip (or an estimate) " +
        "instead for an accurate result.",
    },
    {
      question: "Do these contributions reduce my taxable income?",
      answer:
        "Yes — SSS, PhilHealth, and Pag-IBIG employee contributions are excluded from taxable compensation " +
        "income under Philippine tax law, which is why this calculator subtracts them before computing income " +
        "tax, not just from take-home pay.",
    },
    {
      question: "Is there a provincial or city income tax in the Philippines?",
      answer:
        "No. Income tax on salary is national, collected under the Tax Code and administered by the Bureau of " +
        "Internal Revenue (BIR) — local government units don't levy their own income tax.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate using the confirmed TRAIN Law tax table. It doesn't include the 13th month pay " +
        "exemption or other payroll-specific exemptions, so your actual annual tax (especially around bonus " +
        "season) may differ.",
    },
  ];

  const toolContent = {
    title: "Philippines Income Tax Calculator",
    description:
      "Work out income tax and take-home pay with this Philippines income tax calculator. Enter your salary " +
      "to see a full breakdown under the TRAIN Law tax table.",
    templateKey: "tool-template-3",
    categoryId: category.id,
    calcType: "custom" as const,
    calcFormula: null,
    calcInputs: JSON.stringify(calcInputs),
    calcResult: JSON.stringify({ label: "Take-Home Pay", unit: "", format: "currency", currency: "PHP" }),
    calcResults: JSON.stringify(calcResults),
    instructions: paragraphsToHtml(instructions),
    examples: paragraphsToHtml(examples),
    assumptions: paragraphsToHtml(assumptions),
    faq: JSON.stringify(faq),
  } satisfies Prisma.ToolUncheckedUpdateInput;

  const seoMetaContent = {
    contentType: "tool",
    metaTitle: "Philippines Income Tax Calculator (TRAIN Law) — Salary & Take-Home Pay",
    metaDescription:
      "Free Philippines income tax calculator using the TRAIN Law tax table. Estimate income tax and " +
      "take-home pay after SSS, PhilHealth, and Pag-IBIG contributions.",
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
      "Its live URL will be /tools/" + SLUG + ". This is the Philippines' only tool for now — no category " +
      "grid to link."
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
