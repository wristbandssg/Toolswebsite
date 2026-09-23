// One-time (but safe to re-run) setup script: creates the "Tax & Paycheck
// Calculators" Tool Category (if it doesn't already exist) and the Nevada
// Paycheck Calculator Tool, fully configured — input fields, the multi-line
// breakdown result config, instructions/examples/FAQ, and SEO meta.
//
// The actual math for this tool lives in code, not the database: see
// `customCalculators["nevada-paycheck-calculator"]` in
// `src/lib/calc-engine.ts` for the federal income tax (2026 IRS brackets +
// standard deduction) and FICA (Social Security + Medicare) calculation.
// This script only wires up the Tool row so the public page has a title,
// input form, and content around that calculation.
//
// Uses `upsert`, so running it again just updates the content to match this
// file rather than erroring or creating a duplicate.
//
// HOW TO RUN
//   npx tsx prisma/create-nevada-paycheck-tool.ts
// or
//   npm run db:create-nevada-tool

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const category = await prisma.toolCategory.upsert({
    where: { slug: "tax-paycheck-calculators" },
    update: { name: "Tax & Paycheck Calculators" },
    create: {
      name: "Tax & Paycheck Calculators",
      slug: "tax-paycheck-calculators",
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

  const calcInputs = [
    {
      key: "annualSalary",
      label: "Annual Gross Salary",
      type: "currency",
      unit: "USD/year",
      required: true,
      min: 0,
    },
    {
      key: "payFrequency",
      label: "Pay Frequency",
      type: "dropdown",
      required: true,
      default: 26,
      options: [
        { label: "Weekly (52 paychecks/year)", value: 52 },
        { label: "Biweekly (26 paychecks/year)", value: 26 },
        { label: "Semi-Monthly (24 paychecks/year)", value: 24 },
        { label: "Monthly (12 paychecks/year)", value: 12 },
        { label: "Annually (1 payment/year)", value: 1 },
      ],
    },
    {
      key: "filingStatus",
      label: "Filing Status",
      type: "dropdown",
      required: true,
      default: 0,
      options: [
        { label: "Single", value: 0 },
        { label: "Married Filing Jointly", value: 1 },
        { label: "Married Filing Separately", value: 2 },
        { label: "Head of Household", value: 3 },
      ],
    },
    {
      key: "preTaxDeductions",
      label: "Pre-Tax Deductions",
      unit: "per paycheck",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
    {
      key: "postTaxDeductions",
      label: "Post-Tax Deductions",
      unit: "per paycheck",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
    {
      key: "extraWithholding",
      label: "Extra Federal Withholding",
      unit: "per paycheck",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
  ];

  const calcResults = [
    { key: "grossPayPerPeriod", label: "Gross Pay (per paycheck)", format: "currency" },
    { key: "federalIncomeTax", label: "Federal Income Tax (per paycheck)", format: "currency" },
    { key: "socialSecurityTax", label: "Social Security Tax (per paycheck)", format: "currency" },
    { key: "medicareTax", label: "Medicare Tax (per paycheck)", format: "currency" },
    { key: "stateIncomeTax", label: "Nevada State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "This tool works as a Nevada paycheck calculator, Nevada income tax calculator, Nevada state tax " +
    "calculator, Nevada salary tax calculator, and Nevada after-tax calculator all in one — it shows " +
    "exactly what's taken out of your salary and what you take home. " +
    "Enter your annual gross salary, choose how often you're paid, and select your federal filing status. " +
    "Add any pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, " +
    "and extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a " +
    "full breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Nevada state income tax " +
    "(always $0 — Nevada has no state income tax), and your estimated take-home pay, both per paycheck and for " +
    "the year. This is an estimate based on 2026 IRS federal tax brackets and the standard deduction — it doesn't " +
    "account for tax credits (such as the Child Tax Credit), itemized deductions, or every possible W-4 election. " +
    "Your actual paycheck may vary slightly depending on your employer's payroll system.";

  const examples =
    "Example: a single filer earning $75,000 a year, paid biweekly (26 paychecks/year), with no pre-tax or " +
    "post-tax deductions, takes home approximately $2,368.94 per paycheck — about $61,592.50 for the year — " +
    "after federal income tax, Social Security, and Medicare. Nevada adds no state income tax on top of that.";

  const faq = [
    {
      question: "Does Nevada have a state income tax?",
      answer:
        "No. Nevada is one of a handful of U.S. states with no state income tax, so nothing is withheld from your " +
        "paycheck for state income tax — your take-home pay is reduced only by federal income tax and FICA (Social " +
        "Security and Medicare).",
    },
    {
      question: "What taxes are actually taken out of a Nevada paycheck?",
      answer:
        "Federal income tax (based on your income and filing status), Social Security tax (6.2% up to the annual " +
        "wage base), and Medicare tax (1.45%, plus an extra 0.9% on wages above a threshold that depends on your " +
        "filing status). There's no state or local income tax in Nevada.",
    },
    {
      question: "Is there a Nevada salary tax calculator I can use for any pay frequency?",
      answer:
        "Yes — this calculator works as a Nevada salary tax calculator for weekly, biweekly, semi-monthly, " +
        "monthly, or annual pay. Enter your annual salary and choose your pay frequency above, and it recalculates " +
        "federal income tax, Social Security, and Medicare for that schedule automatically.",
    },
    {
      question: "What is my after-tax (take-home) pay in Nevada?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, and any " +
        "deductions you enter. Because Nevada has no state income tax, nothing further is subtracted for state " +
        "tax, so Nevada workers typically keep more of their after-tax pay than workers in states that do tax " +
        "income.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using the 2026 IRS federal tax brackets and standard deduction amounts. It doesn't " +
        "include tax credits (like the Child Tax Credit), itemized deductions, or every W-4 adjustment, so your " +
        "actual withholding may differ slightly.",
    },
    {
      question: "What is the Social Security wage base for 2026?",
      answer:
        "$184,500. Social Security tax (6.2%) only applies up to that amount of wages in a year — any income " +
        "above it isn't taxed for Social Security (though it's still subject to Medicare tax).",
    },
    {
      question: "What is the Additional Medicare Tax?",
      answer:
        "An extra 0.9% Medicare tax on wages above $200,000 for Single, Head of Household, and Married Filing " +
        "Separately filers, or $250,000 for Married Filing Jointly. There's no employer match for this portion.",
    },
    {
      question: "How do pre-tax deductions affect my paycheck?",
      answer:
        "Pre-tax deductions (like traditional 401(k) contributions or health insurance premiums) are subtracted " +
        "from your wages before federal income tax and FICA are calculated, which lowers your total tax — so your " +
        "take-home pay drops by less than the full deduction amount.",
    },
  ];

  await prisma.tool.upsert({
    where: { slug: "nevada-paycheck-calculator" },
    update: {
      title: "Nevada Paycheck Calculator",
      description:
        "Free Nevada paycheck and income tax calculator — estimate your salary tax, state tax, and after-tax " +
        "take-home pay. Nevada has no state income tax, so more of your paycheck stays with you.",
      templateKey: "tool-template-3",
      categoryId: category.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(calcInputs),
      calcResult: JSON.stringify({ label: "Take-Home Pay", unit: "", format: "currency" }),
      calcResults: JSON.stringify(calcResults),
      instructions,
      examples,
      faq: JSON.stringify(faq),
      seoMeta: {
        upsert: {
          create: {
            contentType: "tool",
            metaTitle: "Nevada Paycheck & Income Tax Calculator (2026) — Take-Home Pay",
            metaDescription:
              "Free Nevada paycheck and income tax calculator. Estimate your salary tax, state tax, and " +
              "after-tax take-home pay — Nevada has no state income tax.",
            schemaType: "SoftwareApplication",
          },
          update: {
            metaTitle: "Nevada Paycheck & Income Tax Calculator (2026) — Take-Home Pay",
            metaDescription:
              "Free Nevada paycheck and income tax calculator. Estimate your salary tax, state tax, and " +
              "after-tax take-home pay — Nevada has no state income tax.",
            schemaType: "SoftwareApplication",
          },
        },
      },
    },
    create: {
      slug: "nevada-paycheck-calculator",
      title: "Nevada Paycheck Calculator",
      description:
        "Free Nevada paycheck and income tax calculator — estimate your salary tax, state tax, and after-tax " +
        "take-home pay. Nevada has no state income tax, so more of your paycheck stays with you.",
      templateKey: "tool-template-3",
      status: "draft",
      categoryId: category.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(calcInputs),
      calcResult: JSON.stringify({ label: "Take-Home Pay", unit: "", format: "currency" }),
      calcResults: JSON.stringify(calcResults),
      instructions,
      examples,
      faq: JSON.stringify(faq),
      seoMeta: {
        create: {
          contentType: "tool",
          metaTitle: "Nevada Paycheck & Income Tax Calculator (2026) — Take-Home Pay",
          metaDescription:
            "Free Nevada paycheck and income tax calculator. Estimate your salary tax, state tax, and " +
            "after-tax take-home pay — Nevada has no state income tax.",
          schemaType: "SoftwareApplication",
        },
      },
    },
  });

  console.log(
    "Done. Created/updated the 'Nevada Paycheck Calculator' tool (status: draft) under " +
      "'Tax & Paycheck Calculators'. Open it in /admin/tools, review it, then set Status to " +
      "Published when you're happy with it."
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
