// One-time (but safe to re-run) setup script: creates the Ohio Income Tax
// Calculator Tool inside the existing "Tax & Paycheck Calculators" category
// (created by create-nevada-paycheck-tool.ts, or here if that hasn't run
// yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Like Alabama, Ohio DOES levy a state income tax, so this tool's breakdown
// actually shows a non-zero Ohio State Income Tax line. The math lives in
// code, not the database: see `customCalculators["ohio-tax-calculator"]` in
// `src/lib/calc-engine.ts` for the federal income tax (2026 IRS brackets +
// standard deduction), FICA (Social Security + Medicare), and Ohio state
// income tax (a two-tier, mostly-0% schedule applied directly to taxable
// wages, using the same $26,050 zero-bracket threshold for every filing
// status) calculation. This script only wires up the Tool row so the
// public page has a title, input form, and content around that
// calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-ohio-tax-tool.ts
// or
//   npm run db:create-ohio-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "ohio-tax-calculator";

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
    { key: "stateIncomeTax", label: "Ohio State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for an Ohio income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Ohio, this tool covers it: it works out federal income " +
    "tax, Social Security, Medicare, and Ohio's state income tax from your salary, all in one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and " +
    "extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a " +
    "full breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Ohio state income tax, " +
    "total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "Ohio's state income tax uses a simple two-tier schedule that's mostly a 0% bracket: the first $26,050 of " +
    "Ohio taxable income is taxed at 0%, and everything above that is taxed at a flat 2.75%. Unlike most " +
    "states, this $26,050 threshold is the SAME for every filing status — it isn't doubled for Married " +
    "Filing Jointly filers the way many states' brackets are.\n\n" +
    "Income taxes are calculated in a few steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Ohio's $26,050 zero-bracket threshold is applied directly to that figure " +
    "(rather than to federal taxable income, which is a different mechanism than states like Montana or North " +
    "Dakota use), the 2.75% rate is applied to anything above it, and federal income tax plus Social Security " +
    "and Medicare are calculated separately alongside it. This calculator is reviewed and updated whenever " +
    "the IRS or the Ohio Department of Taxation publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and Ohio's published 2026 two-tier rate schedule for its state figures. It doesn't account for " +
    "tax credits, itemized deductions, or every possible W-4/IT 4 election, so treat it as a close estimate " +
    "rather than an exact paycheck figure — your actual paycheck may vary slightly depending on your " +
    "employer's payroll system.\n\n" +
    "Ohio has no separate standard deduction as such — the $26,050 zero-bracket serves that role, and it " +
    "applies to the SAME dollar amount for every filing status rather than being doubled for Married Filing " +
    "Jointly filers. This calculator applies that $26,050 threshold directly to your taxable wages (gross pay " +
    "minus pre-tax deductions), not to your federal taxable income — a distinct mechanism from the " +
    "federal-taxable-income-as-base approach used for Montana and North Dakota.\n\n" +
    "Above the $26,050 zero-bracket, Ohio applies a single flat rate of 2.75% to all remaining taxable income, " +
    "with no further brackets.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Ohio state income tax alike — some deduction " +
    "types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Ohio " +
    "Department of Taxation.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), " +
    "with no pre-tax or post-tax deductions, takes home approximately $2,317.17 per paycheck — about " +
    "$60,246.38 for the year — after federal income tax, Social Security, Medicare, and Ohio state income " +
    "tax.\n\n" +
    "Because Ohio's zero-bracket applies to the same $26,050 threshold for every filing status — rather than " +
    "doubling for Married Filing Jointly filers the way many states' brackets do — Married couples don't get " +
    "the same proportional break that a wider MFJ threshold would provide elsewhere; only income above " +
    "$26,050 is taxed at all, and only at a single flat 2.75% rate from there.";

  const faq = [
    {
      question: "Does Ohio have a state income tax?",
      answer:
        "Yes, but a light one. Ohio uses a two-tier schedule: 0% on the first $26,050 of Ohio taxable income, " +
        "then a flat 2.75% on everything above that.",
    },
    {
      question: "What are the Ohio income tax brackets?",
      answer:
        "Just two: 0% up to $26,050 of Ohio taxable income, and 2.75% above $26,050. This $26,050 threshold " +
        "is the same for every filing status — Single, Married Filing Jointly, Married Filing Separately, and " +
        "Head of Household all use the identical dollar amount.",
    },
    {
      question: "What is Ohio's standard deduction?",
      answer:
        "Ohio doesn't have a separate standard deduction. Instead, the first $26,050 of Ohio taxable income " +
        "is simply taxed at 0%, which functions similarly to a standard deduction but is applied as a " +
        "zero-rate bracket rather than a subtraction before the brackets are applied.",
    },
    {
      question: "Why doesn't Ohio's $26,050 threshold double for married couples?",
      answer:
        "Unlike many states that double their lowest bracket threshold for Married Filing Jointly filers, " +
        "Ohio applies the same $26,050 zero-bracket amount to every filing status. It's a deliberate feature " +
        "of Ohio's tax schedule, not an approximation used by this calculator.",
    },
    {
      question: "What taxes are actually taken out of an Ohio paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and Ohio state income " +
        "tax (0% up to $26,050, then a flat 2.75% above that).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, " +
        "and this calculator includes all of it: federal income tax, Social Security, Medicare, and Ohio " +
        "state income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in Ohio?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Ohio " +
        "state income tax, and any deductions you enter. A single filer earning $75,000 a year, paid biweekly " +
        "with no deductions, takes home approximately $2,317.17 per paycheck.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus Ohio's " +
        "published 2026 two-tier rate schedule and $26,050 zero-bracket threshold. It doesn't include tax " +
        "credits, itemized deductions, or every W-4/IT 4 adjustment — so your actual withholding may differ " +
        "slightly.",
    },
  ];

  const toolContent = {
    title: "Ohio Income Tax Calculator",
    description:
      "This Ohio income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Ohio, an " +
      "Ohio payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax calculator " +
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
    metaTitle: "Ohio Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Ohio income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll tax " +
      "(FICA), Ohio state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Ohio's row in " +
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
