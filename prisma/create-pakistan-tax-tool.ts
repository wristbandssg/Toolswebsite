// One-time (but safe to re-run) setup script: creates the "Pakistan Tax &
// Salary Calculators" Tool Category (if it doesn't already exist) and the
// Pakistan Income Tax Calculator Tool — a single national tool, like India,
// Australia, and South Africa, since Pakistan's provinces don't levy income
// tax on salary (see calc-engine-pakistan.ts's header). The math lives in
// `pakistanCustomCalculators["pakistan-income-tax-calculator"]` in
// src/lib/calc-engine-pakistan.ts — FY 2026-27 (Finance Act 2026) slabs,
// confirmed via fbr.gov.pk's Budget 2026-27 salient features.
//
// HOW TO RUN
//   npx tsx prisma/create-pakistan-tax-tool.ts
// or
//   npm run db:create-pakistan-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "pakistan-income-tax-calculator";

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
    where: { slug: "pakistan-tax-salary-calculators" },
    update: { name: "Pakistan Tax & Salary Calculators" },
    create: {
      name: "Pakistan Tax & Salary Calculators",
      slug: "pakistan-tax-salary-calculators",
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

  const calcInputs = [
    {
      key: "annualSalary",
      label: "Annual Salary",
      type: "currency",
      unit: "PKR/year",
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
      key: "otherDeductions",
      label: "Other Deductions (e.g. Provident Fund, loan installments)",
      unit: "per payment",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
  ];

  const calcResults = [
    { key: "grossPayPerPeriod", label: "Gross Pay (per payment)", format: "currency", currency: "PKR" },
    { key: "incomeTax", label: "Income Tax (per payment)", format: "currency", currency: "PKR" },
    { key: "otherDeductions", label: "Other Deductions (per payment)", format: "currency", currency: "PKR" },
    { key: "totalDeductions", label: "Total Deductions (per payment)", format: "currency", currency: "PKR" },
    {
      key: "netPayPerPeriod",
      label: "Your Take-Home Pay (per payment)",
      format: "currency",
      currency: "PKR",
      highlight: true,
    },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency", currency: "PKR" },
  ];

  const instructions =
    "This Pakistan income tax calculator works out your income tax and take-home pay for the FY 2026-27 tax " +
    "year (1 July 2026 – 30 June 2027), using the salary tax slabs introduced in the Finance Act 2026.\n\n" +
    "Enter your annual salary and how often you're paid. If you have other regular deductions — such as a " +
    "Provident Fund contribution or a loan installment — add the per-payment amount so it's reflected in your " +
    "take-home pay; otherwise leave it at Rs 0.\n\n" +
    "Click Calculate to see a full breakdown, both per payment and for the year. Pakistan's income tax slabs are " +
    "progressive: only the portion of your salary that falls inside a given band is taxed at that band's rate, " +
    "not your whole salary — this calculator applies that correctly at every income level.";

  const assumptions =
    "This calculator uses the FY 2026-27 salaried-individual slabs from the Finance Act 2026, confirmed via the " +
    "Federal Board of Revenue's (fbr.gov.pk) Budget 2026-27 salient features and cross-checked against " +
    "published post-budget slab tables: 0% up to Rs 600,000, then seven more bands (1%, 11%, 20%, 25%, 29%, " +
    "32%, 35%) topping out at 35% above Rs 7,000,000 — raised from Rs 4,100,000 the prior tax year. The 9% " +
    "surcharge that used to apply above Rs 10,000,000 of taxable income has been fully abolished for FY " +
    "2026-27.\n\n" +
    "Unlike some other countries' calculators on this site, this one doesn't reduce taxable income for a " +
    "Provident Fund contribution or similar — Pakistan's Income Tax Ordinance, 2001 doesn't give salaried " +
    "individuals a standard deduction the way a 401(k)/EPF does elsewhere, so the 0% band up to Rs 600,000 is " +
    "the effective tax-free allowance. Any amount entered under \"Other Deductions\" reduces your take-home pay " +
    "only, not the income your tax is calculated on.\n\n" +
    "It doesn't account for tax credits some taxpayers may qualify for (such as Voluntary Pension System " +
    "contributions under Section 63), Zakat deductions, or withholding tax adjustments specific to your " +
    "employer's payroll, so treat it as a close estimate rather than an exact payslip figure.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax practitioner or the FBR directly.";

  const examples =
    "Example: someone earning Rs 1,500,000 a year, paid monthly, with no other deductions, pays about " +
    "Rs 3,250/month in income tax (Rs 39,000/year) and takes home approximately Rs 121,750 per month — about " +
    "Rs 1,461,000 for the year.\n\n" +
    "Someone earning Rs 500,000 a year pays no income tax at all — that's below the Rs 600,000 tax-free " +
    "threshold — leaving the full Rs 500,000 as take-home pay.\n\n" +
    "Someone earning Rs 3,600,000 a year (Rs 300,000/month), paid monthly, pays about Rs 34,666.67/month in " +
    "income tax (Rs 416,000/year), taking home roughly Rs 265,333.33 per month — about Rs 3,184,000 for the " +
    "year.";

  const faq = [
    {
      question: "What changed for FY 2026-27?",
      answer:
        "The Finance Act 2026 restructured the salary tax slabs, adding intermediate bands and raising the " +
        "threshold for the top 35% rate from Rs 4,100,000 to Rs 7,000,000. It also fully abolished the 9% " +
        "surcharge that previously applied on top of income tax for taxable income above Rs 10,000,000.",
    },
    {
      question: "Is there a provincial income tax on salary in Pakistan?",
      answer:
        "No. Income tax on salary is federal-only, collected under the Income Tax Ordinance, 2001 and " +
        "administered by the FBR — provinces tax agricultural income and services separately, not salary " +
        "income, so this calculator doesn't need a province selector.",
    },
    {
      question: "Why doesn't my Provident Fund contribution reduce my tax?",
      answer:
        "Unlike a 401(k) in the US or EPF treatment under some tax credit schemes in other countries, a " +
        "standard Provident Fund contribution doesn't reduce a salaried individual's taxable income under " +
        "Pakistan's Income Tax Ordinance. It still lowers your take-home pay, which is why it's included under " +
        "\"Other Deductions\" — it's just not subtracted before income tax is calculated.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate using the confirmed FY 2026-27 slabs from the Finance Act 2026. It doesn't include " +
        "tax credits like Voluntary Pension System contributions, Zakat deductions, or employer-specific " +
        "withholding tax adjustments, so your actual payslip may differ slightly.",
    },
  ];

  const toolContent = {
    title: "Pakistan Income Tax Calculator",
    description:
      "Work out income tax and take-home pay with this Pakistan income tax calculator. Enter your salary to " +
      "see a full breakdown for the FY 2026-27 tax year under the Finance Act 2026.",
    templateKey: "tool-template-3",
    categoryId: category.id,
    calcType: "custom" as const,
    calcFormula: null,
    calcInputs: JSON.stringify(calcInputs),
    calcResult: JSON.stringify({ label: "Take-Home Pay", unit: "", format: "currency", currency: "PKR" }),
    calcResults: JSON.stringify(calcResults),
    instructions: paragraphsToHtml(instructions),
    examples: paragraphsToHtml(examples),
    assumptions: paragraphsToHtml(assumptions),
    faq: JSON.stringify(faq),
  } satisfies Prisma.ToolUncheckedUpdateInput;

  const seoMetaContent = {
    contentType: "tool",
    metaTitle: "Pakistan Income Tax Calculator (FY 2026-27) — Salary & Take-Home Pay",
    metaDescription:
      "Free Pakistan income tax calculator for the FY 2026-27 tax year. Estimate income tax and take-home pay " +
      "using the Finance Act 2026 salary tax slabs.",
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
      "Its live URL will be /tools/" + SLUG + ". This is Pakistan's only tool for now — no category grid " +
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
