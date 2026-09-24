// One-time (but safe to re-run) setup script: creates the Colorado Income
// Tax Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts / create-arizona-tax-tool.ts's structure
// and template (tool-template-3) exactly, per the established pattern.
//
// Colorado levies a flat 4.4% state income tax, but with a distinctive tax
// base: Colorado does NOT define its own standard deduction. Instead,
// Colorado taxable income starts from FEDERAL taxable income (already after
// the federal standard deduction), and the flat rate applies directly to
// that. Confirmed via the Tax Foundation's 2026 Colorado summary
// (taxfoundation.org/location/colorado/ — flat 4.4%) and a CPA explainer of
// how the Colorado tax base is built from federal taxable income. Because
// there's no separate Colorado deduction or bracket table to model, this
// tool uses the same simple input set as Nevada/Alaska/Florida (no
// "Number of Dependents" field).
//
// SIMPLIFICATION: Colorado requires certain high earners (federal AGI above
// $300,000) to add back part of their federal deduction — not modeled here,
// since it mostly affects incomes above this tool's $300,000 salary input
// ceiling anyway. See the extended comment above `coloradoTaxCalculator` in
// src/lib/calc-engine.ts.
//
// The actual math lives in code, not the database: see
// `customCalculators["colorado-tax-calculator"]` in
// `src/lib/calc-engine.ts`. This script only wires up the Tool row so the
// public page has a title, input form, and content around that
// calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-colorado-tax-tool.ts
// or
//   npm run db:create-colorado-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "colorado-tax-calculator";

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
      label: "Annual Salary",
      type: "currency",
      unit: "USD/year",
      required: true,
      min: 0,
      max: 300000,
      step: 1000,
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
      label: "Extra Withholding",
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
    { key: "stateIncomeTax", label: "Colorado State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Colorado income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Colorado, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and Colorado's flat state income tax from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and " +
    "extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a " +
    "full breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Colorado state income " +
    "tax, total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "Colorado taxes income at a single flat rate of 4.4% — but unlike most states, Colorado doesn't define its " +
    "own standard deduction. Instead, it starts from your federal taxable income (which already reflects the " +
    "federal standard deduction) and applies the 4.4% rate directly to that.\n\n" +
    "Income taxes are calculated in three steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, the federal standard deduction is subtracted from that to get federal (and, " +
    "for Colorado, state) taxable income, and then federal bracket rates and Colorado's flat 4.4% rate are " +
    "each applied to that same taxable income figure, alongside Social Security and Medicare calculated " +
    "separately. This calculator is reviewed and updated whenever the IRS or the Colorado Department of " +
    "Revenue publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and applies Colorado's flat 4.4% rate to that same federal taxable income figure for its state " +
    "figures, matching how Colorado's own tax base is built. It doesn't account for tax credits, itemized " +
    "deductions, or every possible W-4/DR 0004 election, so treat it as a close estimate rather than an exact " +
    "paycheck figure — your actual paycheck may vary slightly depending on your employer's payroll system.\n\n" +
    "Colorado requires taxpayers with federal adjusted gross income above $300,000 to add back part of their " +
    "federal standard or itemized deduction when computing Colorado taxable income — this calculator doesn't " +
    "model that add-back, which mainly affects incomes above this tool's $300,000 salary input ceiling.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Colorado state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Colorado " +
    "Department of Revenue.";

  const examples =
    "Example: a single filer earning $75,000 a year, paid biweekly (26 paychecks/year), with no pre-tax or " +
    "post-tax deductions, takes home approximately $2,269.27 per paycheck — about $59,000.90 for the year — " +
    "after federal income tax, Social Security, Medicare, and Colorado's flat 4.4% state income tax.\n\n" +
    "Because Colorado applies its flat rate to federal taxable income rather than defining a separate state " +
    "deduction, the state tax line moves in lockstep with your federal taxable income — there's no separate " +
    "Colorado-specific deduction math to work through.";

  const faq = [
    {
      question: "Does Colorado have a state income tax?",
      answer:
        "Yes, but a simple one: Colorado taxes all income at a single flat rate of 4.4%, applied to your " +
        "federal taxable income rather than a separately defined Colorado taxable income.",
    },
    {
      question: "What is Colorado's income tax rate?",
      answer:
        "A flat 4.4% for 2026, for every filing status — Single, Married Filing Jointly, Married Filing " +
        "Separately, and Head of Household all pay the same rate on the same tax base.",
    },
    {
      question: "Does Colorado have its own standard deduction?",
      answer:
        "No. Colorado starts from your federal taxable income — which already reflects the federal standard " +
        "deduction (or your itemized deductions) — and applies its flat 4.4% rate directly to that figure, " +
        "with some adjustments for certain items and, for very high earners, a deduction add-back.",
    },
    {
      question: "What taxes are actually taken out of a Colorado paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and Colorado's flat " +
        "4.4% state income tax.",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, " +
        "and this calculator includes all of it: federal income tax, Social Security, Medicare, and Colorado " +
        "state income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in Colorado?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, " +
        "Colorado's flat 4.4% state income tax, and any deductions you enter.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus Colorado's " +
        "published flat 4.4% rate. It doesn't model the high-income deduction add-back that applies above " +
        "$300,000 of federal AGI, and doesn't include every possible credit or W-4/DR 0004 adjustment, so your " +
        "actual withholding may differ slightly.",
    },
    {
      question: "How do pre-tax deductions affect my paycheck?",
      answer:
        "Pre-tax deductions (like traditional 401(k) contributions or health insurance premiums) are subtracted " +
        "from your wages before federal income tax, FICA, and Colorado state income tax are all calculated, " +
        "which lowers your total tax — so your take-home pay drops by less than the full deduction amount.",
    },
  ];

  const toolContent = {
    title: "Colorado Income Tax Calculator",
    description:
      "This Colorado income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Colorado, a " +
      "Colorado payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax " +
      "calculator for any pay frequency — Colorado's flat 4.4% state income tax makes the math simple.",
    templateKey: "tool-template-3",
    categoryId: category.id,
    calcType: "custom",
    calcFormula: null,
    calcInputs: JSON.stringify(calcInputs),
    calcResult: JSON.stringify({ label: "Take-Home Pay", unit: "", format: "currency" }),
    calcResults: JSON.stringify(calcResults),
    instructions: paragraphsToHtml(instructions),
    examples: paragraphsToHtml(examples),
    assumptions: paragraphsToHtml(assumptions),
    faq: JSON.stringify(faq),
  } satisfies Prisma.ToolUncheckedUpdateInput;

  const seoMetaContent = {
    contentType: "tool",
    metaTitle: "Colorado Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Colorado income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll " +
      "tax (FICA), Colorado's flat 4.4% state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Colorado's row in " +
      "/admin/state-calculators so it shows up in the \"Other State Calculators\" grid on other states' tool " +
      "pages."
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
