// One-time (but safe to re-run) setup script: creates the Montana Income Tax
// Calculator Tool inside the existing "Tax & Paycheck Calculators" category
// (created by create-nevada-paycheck-tool.ts, or here if that hasn't run
// yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-alabama-tax-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Like Alabama, Montana DOES levy a state income tax, so this tool's
// breakdown shows a non-zero Montana State Income Tax line. The math lives
// in code, not the database: see `customCalculators["montana-tax-calculator"]`
// in `src/lib/calc-engine.ts` for the federal income tax (2026 IRS brackets +
// standard deduction), FICA (Social Security + Medicare), and Montana state
// income tax (a two-bracket schedule — 4.7% and 5.65% — applied directly to
// federal taxable income, with no separate Montana standard deduction —
// figures sourced from Montana's HB 337 2026 rate cut and the Tax
// Foundation's coverage of Montana's SB 399 tax simplification) calculation.
// This script only wires up the Tool row so the public page has a title,
// input form, and content around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-montana-tax-tool.ts
// or
//   npm run db:create-montana-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "montana-tax-calculator";

// Instructions/Examples/Assumptions are now rich-text (HTML) fields — see
// the matching helper/comment in create-nevada-paycheck-tool.ts.
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
    { key: "stateIncomeTax", label: "Montana State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Montana income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Montana, this tool covers it: it works out federal income " +
    "tax, Social Security, Medicare, and Montana's state income tax from your salary, all in one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and extra " +
    "federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a full " +
    "breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Montana state income tax, " +
    "total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "Montana taxes income at just two rates, 4.7% and 5.65%, under the rate cut enacted by HB 337. Unlike most " +
    "states, Montana doesn't set its own standard deduction — a 2021 tax simplification law folded the federal " +
    "standard deduction directly into Montana's tax base, so this calculator applies Montana's two-bracket " +
    "schedule straight to your federal taxable income.\n\n" +
    "Income taxes are calculated in a few steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, the federal standard deduction for your filing status is subtracted from that to " +
    "get federal (and, since Montana reuses the same base, Montana) taxable income, Montana's 4.7%/5.65% bracket " +
    "schedule is applied to the result, and federal income tax plus Social Security and Medicare are calculated " +
    "separately alongside it. This calculator is reviewed and updated whenever the IRS or the Montana Department " +
    "of Revenue publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and Montana's HB 337 2026 rate schedule for its state figures. It doesn't account for tax credits, " +
    "itemized deductions, or every possible W-4 election, so treat it as a close estimate rather than an exact " +
    "paycheck figure — your actual paycheck may vary slightly depending on your employer's payroll system.\n\n" +
    "Montana doesn't have its own separate standard deduction. Since a 2021 tax simplification law (SB 399, " +
    "effective for the 2024 tax year onward), Montana uses federal taxable income as its own tax base, which the " +
    "Tax Foundation describes as \"automatically incorporating the federal standard deduction.\" This calculator " +
    "reuses the already-computed federal taxable income figure directly, the same mechanism used for this " +
    "series' Colorado calculator.\n\n" +
    "Montana's published brackets are $47,500 (Single/Married Filing Separately/Head of Household) and $95,000 " +
    "(Married Filing Jointly) for the 4.7% threshold. This calculator approximates Montana's Married Filing " +
    "Separately schedule as exactly half of the Married Filing Jointly threshold (which happens to equal the " +
    "Single threshold), and approximates Head of Household using the Single schedule — both are documented " +
    "simplifications rather than Montana's own separately published schedules.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Montana " +
    "Department of Revenue.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), with " +
    "no pre-tax or post-tax deductions, takes home approximately $2,258.30 per paycheck — about $58,715.90 for " +
    "the year — after federal income tax, Social Security, Medicare, and Montana state income tax.\n\n" +
    "Montana's tax structure is one of the simplest in this series: just two brackets, 4.7% and 5.65%, with no " +
    "separate state standard deduction to calculate — Montana simply taxes the same federal taxable income " +
    "figure used for your federal return, with the 5.65% top rate kicking in above $47,500 for single filers or " +
    "$95,000 for joint filers.";

  const faq = [
    {
      question: "Does Montana have a state income tax?",
      answer:
        "Yes. Montana taxes income at two rates, 4.7% and 5.65%, under the rate cut enacted by HB 337 for the " +
        "2026 tax year.",
    },
    {
      question: "What are the Montana income tax brackets?",
      answer:
        "4.7% on taxable income up to $47,500 (Single, Married Filing Separately, or Head of Household) or " +
        "$95,000 (Married Filing Jointly), and 5.65% on taxable income above those thresholds.",
    },
    {
      question: "What is Montana's standard deduction?",
      answer:
        "Montana doesn't have one of its own. A 2021 tax simplification law (SB 399, effective for tax year 2024 " +
        "onward) made federal taxable income Montana's own tax base, which already reflects the federal standard " +
        "deduction — so no separate Montana subtraction is needed.",
    },
    {
      question: "How are Head of Household and Married Filing Separately handled in Montana?",
      answer:
        "This calculator approximates them: Married Filing Separately uses exactly half of the Married Filing " +
        "Jointly threshold (which equals the Single threshold), and Head of Household uses the Single bracket " +
        "schedule. These are documented simplifications rather than Montana's own separately published " +
        "schedules.",
    },
    {
      question: "What taxes are actually taken out of a Montana paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and Montana state income " +
        "tax (4.7% or 5.65%, applied to your federal taxable income).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, Medicare, and Montana state " +
        "income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in Montana?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Montana " +
        "state income tax, and any deductions you enter. Because Montana has only two brackets and no separate " +
        "state standard deduction, its state tax calculation is more straightforward than in most other states.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus Montana's " +
        "HB 337 2026 rate schedule. It approximates Montana's Married Filing Separately and Head of Household " +
        "brackets rather than using Montana's own separately published schedules, and doesn't include tax " +
        "credits, itemized deductions, or every W-4 adjustment — so your actual withholding may differ slightly.",
    },
  ];

  const toolContent = {
    title: "Montana Income Tax Calculator",
    description:
      "This Montana income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Montana, a " +
      "Montana payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax calculator " +
      "for any pay frequency.",
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
    metaTitle: "Montana Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Montana income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll tax " +
      "(FICA), Montana state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Montana's row in " +
      "/admin/state-calculators so it shows up in the \"Other State Calculators\" grid on Nevada's (and any " +
      "other state's) tool page."
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
