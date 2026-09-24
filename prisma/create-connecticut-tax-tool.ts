// One-time (but safe to re-run) setup script: creates the Connecticut
// Income Tax Calculator Tool inside the existing "Tax & Paycheck
// Calculators" category — input fields, the multi-line breakdown result
// config, instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts / create-arizona-tax-tool.ts's structure
// and template (tool-template-3) exactly, per the established pattern.
//
// Connecticut levies a real state income tax: a 7-bracket progressive
// schedule (2% up to 6.99%) after a flat standard deduction. Figures
// sourced from a 2026 bracket aggregator (Single/MFJ thresholds) and a 2026
// payroll standard-deduction table, cross-checked against the Tax
// Foundation's 2026 state income tax rate summary. No dependents field is
// needed — Connecticut's income-based personal tax credit isn't modeled
// (see the simplification note below), so this tool uses the same simple
// input set as Nevada/Arizona/Colorado.
//
// SIMPLIFICATIONS (see the extended comment above `connecticutTaxCalculator`
// in src/lib/calc-engine.ts): Head of Household is approximated with the
// Single bracket schedule; Connecticut's "tax recapture" provision (which
// phases out the benefit of lower brackets for high earners) and its
// separate income-based personal tax credit table are both left out,
// keeping this tool's scope in line with the other state tools rather than
// reproducing every Connecticut-specific high-income adjustment.
//
// The actual math lives in code, not the database: see
// `customCalculators["connecticut-tax-calculator"]` in
// `src/lib/calc-engine.ts`. This script only wires up the Tool row so the
// public page has a title, input form, and content around that
// calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-connecticut-tax-tool.ts
// or
//   npm run db:create-connecticut-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "connecticut-tax-calculator";

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
    { key: "stateIncomeTax", label: "Connecticut State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Connecticut income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Connecticut, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and Connecticut's state income tax from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and " +
    "extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a " +
    "full breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Connecticut state " +
    "income tax, total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "Connecticut taxes income through seven brackets ranging from 2% up to 6.99%, after subtracting a flat " +
    "standard deduction that depends on your filing status.\n\n" +
    "Income taxes are calculated in four steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Connecticut's standard deduction is subtracted from that to get Connecticut " +
    "taxable income, the 2%–6.99% bracket rates are applied to that, and federal income tax plus Social " +
    "Security and Medicare are calculated separately alongside it. This calculator is reviewed and updated " +
    "whenever the IRS or Connecticut's Department of Revenue Services publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and Connecticut's published 2026 brackets and standard deduction for its state figures. It " +
    "doesn't account for tax credits, itemized deductions, or every possible W-4/CT-W4 election, so treat it " +
    "as a close estimate rather than an exact paycheck figure — your actual paycheck may vary slightly " +
    "depending on your employer's payroll system.\n\n" +
    "This calculator's bracket schedule is sourced exactly for Single and Married Filing Jointly; Married " +
    "Filing Separately is derived as exactly half of the Married Filing Jointly thresholds (as Connecticut " +
    "does by law), and Head of Household is approximated using the Single bracket schedule rather than its " +
    "own exact thresholds.\n\n" +
    "Connecticut also has a \"tax recapture\" provision that phases out the benefit of its lower brackets for " +
    "high earners, and a separate income-based personal tax credit table — neither is modeled in this " +
    "calculator, which mainly affects higher incomes.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Connecticut state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or Connecticut's " +
    "Department of Revenue Services.";

  const examples =
    "Example: a single filer earning $75,000 a year, paid biweekly (26 paychecks/year), with no pre-tax or " +
    "post-tax deductions, takes home approximately $2,251.83 per paycheck — about $58,547.50 for the year — " +
    "after federal income tax, Social Security, Medicare, and Connecticut state income tax.\n\n" +
    "Because Connecticut's brackets climb gradually from 2% to 6.99% across a wide range of incomes, most " +
    "filers with a typical salary end up somewhere in the middle brackets rather than at either extreme, " +
    "unlike states with a narrower bracket range.";

  const faq = [
    {
      question: "Does Connecticut have a state income tax?",
      answer:
        "Yes. Connecticut taxes income through seven brackets ranging from 2% up to 6.99%, with the exact " +
        "bracket you fall into depending on your taxable income and filing status.",
    },
    {
      question: "What are the Connecticut income tax brackets?",
      answer:
        "For Single filers: 2% up to $10,000, 4.5% up to $50,000, 5.5% up to $100,000, 6% up to $200,000, 6.5% " +
        "up to $250,000, 6.9% up to $500,000, and 6.99% above that. Married Filing Jointly thresholds are " +
        "roughly double.",
    },
    {
      question: "What is Connecticut's standard deduction?",
      answer:
        "$6,000 for Single and Married Filing Separately filers, $12,000 for Married Filing Jointly, and " +
        "$9,000 for Head of Household, for 2026.",
    },
    {
      question: "What taxes are actually taken out of a Connecticut paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and Connecticut state " +
        "income tax (2%–6.99% brackets).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, " +
        "and this calculator includes all of it: federal income tax, Social Security, Medicare, and " +
        "Connecticut state income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in Connecticut?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, " +
        "Connecticut state income tax, and any deductions you enter.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus " +
        "Connecticut's published 2026 brackets and standard deduction. It doesn't model Connecticut's tax " +
        "recapture provision for high earners or its income-based personal tax credit, and doesn't include " +
        "every W-4/CT-W4 adjustment, so your actual withholding may differ slightly.",
    },
    {
      question: "How do pre-tax deductions affect my paycheck?",
      answer:
        "Pre-tax deductions (like traditional 401(k) contributions or health insurance premiums) are subtracted " +
        "from your wages before federal income tax, FICA, and Connecticut state income tax are all calculated, " +
        "which lowers your total tax — so your take-home pay drops by less than the full deduction amount.",
    },
  ];

  const toolContent = {
    title: "Connecticut Income Tax Calculator",
    description:
      "This Connecticut income tax calculator and paycheck tax calculator shows you, in one place, exactly " +
      "what's withheld from your paycheck and what you take home. Use it as a general tax calculator for " +
      "Connecticut, a Connecticut payroll tax calculator for federal withholding, FICA, and state tax, or a " +
      "salary tax calculator for any pay frequency.",
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
    metaTitle: "Connecticut Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Connecticut income tax calculator and paycheck tax calculator. Estimate federal income tax, " +
      "payroll tax (FICA), Connecticut state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Connecticut's row in " +
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
