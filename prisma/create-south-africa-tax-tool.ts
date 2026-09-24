// One-time (but safe to re-run) setup script: creates the "South Africa
// Tax & Salary Calculators" Tool Category (if it doesn't already exist)
// and the South Africa Income Tax Calculator Tool — a single national
// tool, like India and Australia, since South Africa's provinces have no
// income tax of their own (see calc-engine-southafrica.ts's header). The
// math lives in
// `southAfricaCustomCalculators["south-africa-income-tax-calculator"]` in
// src/lib/calc-engine-southafrica.ts — SARS brackets, the age-based
// Primary/Secondary/Tertiary rebate stack, and UIF (capped at 1% of a
// R17,712/month ceiling).
//
// HOW TO RUN
//   npx tsx prisma/create-south-africa-tax-tool.ts
// or
//   npm run db:create-south-africa-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "south-africa-income-tax-calculator";

// Instructions/Examples/Assumptions are rich-text (HTML) fields — see the
// matching helper/comment in create-nevada-paycheck-tool.ts.
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
    where: { slug: "south-africa-tax-salary-calculators" },
    update: { name: "South Africa Tax & Salary Calculators" },
    create: {
      name: "South Africa Tax & Salary Calculators",
      slug: "south-africa-tax-salary-calculators",
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

  const calcInputs = [
    {
      key: "annualSalary",
      label: "Annual Salary",
      type: "currency",
      unit: "ZAR/year",
      required: true,
      min: 0,
      max: 3000000,
    },
    {
      key: "ageBand",
      label: "Age",
      type: "dropdown",
      required: true,
      default: 0,
      options: [
        { label: "Under 65", value: 0 },
        { label: "65 to 74", value: 65 },
        { label: "75 and older", value: 75 },
      ],
    },
    {
      key: "payFrequency",
      label: "Pay Frequency",
      type: "dropdown",
      required: true,
      default: 12,
      options: [
        { label: "Monthly (12 payments/year)", value: 12 },
        { label: "Weekly (52 payments/year)", value: 52 },
        { label: "Annually (1 payment/year)", value: 1 },
      ],
    },
    {
      key: "preTaxDeductions",
      label: "Pre-Tax Deductions (e.g. retirement annuity, pension fund)",
      unit: "per payment",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
    {
      key: "postTaxDeductions",
      label: "Post-Tax Deductions",
      unit: "per payment",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
  ];

  const calcResults = [
    { key: "grossPayPerPeriod", label: "Gross Pay (per payment)", format: "currency", currency: "ZAR" },
    { key: "incomeTax", label: "Income Tax after Rebate (per payment)", format: "currency", currency: "ZAR" },
    { key: "uif", label: "UIF Contribution (per payment)", format: "currency", currency: "ZAR" },
    { key: "totalDeductions", label: "Total Deductions (per payment)", format: "currency", currency: "ZAR" },
    {
      key: "netPayPerPeriod",
      label: "Your Take-Home Pay (per payment)",
      format: "currency",
      currency: "ZAR",
      highlight: true,
    },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency", currency: "ZAR" },
  ];

  const instructions =
    "This South Africa income tax calculator works out your income tax (after your SARS rebate), UIF " +
    "contribution, and take-home pay for the 2026/2027 tax year (1 March 2026 – 28 February 2027).\n\n" +
    "Enter your annual salary, your age band (this determines which SARS rebates apply — see below), and how " +
    "often you're paid. Add any pre-tax deductions (such as retirement annuity or pension fund contributions, " +
    "which reduce your taxable income) and post-tax deductions if they apply — otherwise leave them at R0.\n\n" +
    "Click Calculate to see a full breakdown, both per payment and for the year. SARS rebates work differently " +
    "from a tax-free threshold: they're a CREDIT subtracted from the tax your bracket produces, not an amount " +
    "subtracted from your income beforehand — and they stack by age. Everyone gets the Primary rebate; if " +
    "you're 65 or older you also get the Secondary rebate on top of it; if you're 75 or older you get the " +
    "Tertiary rebate on top of both. This calculator applies the right combination automatically based on the " +
    "age band you choose.";

  const assumptions =
    "This calculator uses confirmed 2026/2027 tax year figures: SARS brackets from 18% (up to R245,100) to 45% " +
    "(above R1,878,600), the Primary rebate (R17,820, everyone), Secondary rebate (R9,765, age 65+, on top of " +
    "Primary), and Tertiary rebate (R3,249, age 75+, on top of both) — together producing the R99,000 / " +
    "R153,250 / R171,300 tax thresholds SARS publishes for each age group. UIF is calculated at 1% of " +
    "remuneration, capped at a R17,712/month earnings ceiling, so contributions top out at R177.12/month " +
    "regardless of how much more you earn above that.\n\n" +
    "It doesn't account for the Employment Tax Incentive, medical scheme fees tax credits, other SARS tax " +
    "credits, or every possible payroll deduction, so treat it as a close estimate rather than an exact payslip " +
    "figure — your actual take-home pay may vary depending on your personal tax situation and your employer's " +
    "payroll system.\n\n" +
    "Pre-tax deductions you enter (like retirement annuity or pension fund contributions) are assumed to reduce " +
    "taxable income but not the remuneration UIF is calculated on, matching how retirement contributions are " +
    "typically treated for PAYE purposes.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax practitioner or SARS directly.";

  const examples =
    "Example: someone under 65 earning R350,000 a year, paid monthly, with no other deductions, takes home " +
    "approximately R24,525.21 per month — about R294,302.56 for the year — after income tax (R4,464.33/month) " +
    "and the capped UIF contribution (R177.12/month, since R350,000/year is above the UIF earnings ceiling).\n\n" +
    "Someone under 65 earning R90,000 a year pays no income tax at all — 18% of R90,000 is less than the " +
    "R17,820 Primary rebate, so the rebate fully offsets it, leaving only a R900/year UIF contribution and " +
    "R89,100 in annual take-home pay.\n\n" +
    "Someone aged 65 to 74 earning R200,000 a year gets both the Primary and Secondary rebates (R27,585 " +
    "combined), bringing take-home pay to about R15,798.75 per month, roughly R189,585 for the year.";

  const faq = [
    {
      question: "Why isn't the rebate just a tax-free income threshold?",
      answer:
        "SARS rebates are a CREDIT subtracted from the tax your bracket produces, not an amount subtracted from " +
        "your income first. The well-known R99,000 / R153,250 / R171,300 \"tax thresholds\" for each age group " +
        "are just where 18% of that income happens to equal the applicable rebate — this calculator applies the " +
        "rebate itself, which works correctly at every income level, not just at the threshold.",
    },
    {
      question: "How do the Secondary and Tertiary rebates work?",
      answer:
        "They stack on top of the Primary rebate by age, not replace it. Everyone gets the R17,820 Primary " +
        "rebate; taxpayers 65 or older ALSO get the R9,765 Secondary rebate; taxpayers 75 or older get the " +
        "R3,249 Tertiary rebate as well — so a 75-year-old's total rebate is all three added together " +
        "(R30,834).",
    },
    {
      question: "What is UIF and why is it capped?",
      answer:
        "The Unemployment Insurance Fund — 1% of your remuneration, matched by your employer, providing " +
        "unemployment and related benefits. It's capped at a R17,712/month earnings ceiling, so once you earn " +
        "more than that in a month, your UIF contribution stays flat at R177.12 rather than continuing to grow.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using confirmed 2026/2027 SARS brackets, rebates, and UIF figures. It doesn't " +
        "include the Employment Tax Incentive, medical scheme fees tax credits, or every possible payroll " +
        "deduction, so your actual payslip may differ slightly.",
    },
    {
      question: "How do pre-tax deductions affect my take-home pay?",
      answer:
        "Pre-tax deductions (like retirement annuity or pension fund contributions) are subtracted from your " +
        "pay before income tax is calculated, which lowers your tax — so your take-home pay drops by less than " +
        "the full deduction amount.",
    },
  ];

  const toolContent = {
    title: "South Africa Income Tax Calculator",
    description:
      "Work out income tax, UIF, and take-home pay with this South Africa income tax calculator. Enter your " +
      "salary and age to see a full breakdown for the 2026/2027 tax year.",
    templateKey: "tool-template-3",
    categoryId: category.id,
    calcType: "custom" as const,
    calcFormula: null,
    calcInputs: JSON.stringify(calcInputs),
    calcResult: JSON.stringify({ label: "Take-Home Pay", unit: "", format: "currency", currency: "ZAR" }),
    calcResults: JSON.stringify(calcResults),
    instructions: paragraphsToHtml(instructions),
    examples: paragraphsToHtml(examples),
    assumptions: paragraphsToHtml(assumptions),
    faq: JSON.stringify(faq),
  } satisfies Prisma.ToolUncheckedUpdateInput;

  const seoMetaContent = {
    contentType: "tool",
    metaTitle: "South Africa Income Tax Calculator (2026/2027) — Salary & Take-Home Pay",
    metaDescription:
      "Free South Africa income tax calculator for the 2026/2027 tax year. Estimate income tax, UIF, and " +
      "take-home pay using SARS brackets and rebates.",
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
      "Its live URL will be /tools/" + SLUG + ". This is South Africa's only tool for now — no category grid " +
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
