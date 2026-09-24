// One-time (but safe to re-run) setup script: creates the North Dakota
// Income Tax Calculator Tool inside the existing "Tax & Paycheck
// Calculators" category (created by create-nevada-paycheck-tool.ts, or here
// if that hasn't run yet) — input fields, the multi-line breakdown result
// config, instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Like Alabama, North Dakota DOES levy a state income tax, so this tool's
// breakdown actually shows a non-zero North Dakota State Income Tax line.
// The math lives in code, not the database: see
// `customCalculators["north-dakota-tax-calculator"]` in
// `src/lib/calc-engine.ts` for the federal income tax (2026 IRS brackets +
// standard deduction), FICA (Social Security + Medicare), and North Dakota
// state income tax (a mostly-0% three-tier schedule applied on top of
// federal taxable income, the same federal-taxable-income-as-base
// mechanism used for Montana — figures sourced from the North Dakota
// Office of State Tax Commissioner) calculation. This script only wires up
// the Tool row so the public page has a title, input form, and content
// around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-north-dakota-tax-tool.ts
// or
//   npm run db:create-north-dakota-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "north-dakota-tax-calculator";

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
    { key: "stateIncomeTax", label: "North Dakota State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a North Dakota income tax calculator, a paycheck tax calculator, a payroll " +
    "tax calculator, or just a general tax calculator for North Dakota, this tool covers it: it works out " +
    "federal income tax, Social Security, Medicare, and North Dakota's state income tax from your salary, " +
    "all in one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and " +
    "extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a " +
    "full breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, North Dakota state " +
    "income tax, total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "North Dakota's income tax is unusual in two ways. First, it doesn't have its own separate standard " +
    "deduction — North Dakota uses your federal taxable income (which already has the federal standard " +
    "deduction baked in) directly as its own starting point, the same mechanism used for Montana. Second, " +
    "its three-tier rate schedule is mostly a 0% bracket: for Single filers, the first $49,575 of federal " +
    "taxable income is taxed at 0%, the next portion up to $250,400 at 1.95%, and anything above that at " +
    "2.5% — so a large share of North Dakota filers pay very little state tax at all.\n\n" +
    "Income taxes are calculated in a few steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, that figure is used as a proxy for federal taxable income, North Dakota's " +
    "0%/1.95%/2.5% bracket rates are applied directly to it, and federal income tax plus Social Security and " +
    "Medicare are calculated separately alongside it. This calculator is reviewed and updated whenever the " +
    "IRS or the North Dakota Office of State Tax Commissioner publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the North Dakota Office of State Tax Commissioner's published 2026 bracket thresholds for " +
    "its state figures. It doesn't account for tax credits, itemized deductions, or every possible W-4 " +
    "election, so treat it as a close estimate rather than an exact paycheck figure — your actual paycheck " +
    "may vary slightly depending on your employer's payroll system.\n\n" +
    "North Dakota has NO separate state standard deduction. Instead, it uses federal taxable income as its " +
    "own tax base, meaning the federal standard deduction is effectively already applied before North " +
    "Dakota's bracket rates come into play. This calculator reuses the already-computed federal taxable " +
    "income figure directly, the same approach used for Montana's calculator.\n\n" +
    "North Dakota's three brackets are mostly a 0% zero-bracket: Single filers pay 0% up to $49,575, 1.95% up " +
    "to $250,400, and 2.5% above that; Married Filing Jointly filers pay 0% up to $82,800, 1.95% up to " +
    "$304,850, and 2.5% above.\n\n" +
    "Married Filing Separately is modeled as exactly half of the Married Filing Jointly bracket thresholds, " +
    "and Head of Household uses the Single filer's bracket schedule — both are documented simplifications " +
    "rather than North Dakota's exact published schedules for those statuses.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the North " +
    "Dakota Office of State Tax Commissioner.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), " +
    "with no pre-tax or post-tax deductions, takes home approximately $2,361.95 per paycheck — about " +
    "$61,410.66 for the year — after federal income tax, Social Security, Medicare, and North Dakota state " +
    "income tax.\n\n" +
    "Because North Dakota's zero-bracket extends all the way to $49,575 of federal taxable income for Single " +
    "filers — well above what most of this $75,000 salary's taxable income ends up being once the federal " +
    "standard deduction is applied — only a modest slice of income falls into the 1.95% bracket, keeping the " +
    "overall North Dakota state tax bill one of the lowest of any state with an income tax.";

  const faq = [
    {
      question: "Does North Dakota have a state income tax?",
      answer:
        "Yes, but a very light one. North Dakota uses a three-tier schedule where a large amount of income is " +
        "taxed at 0%, with only 1.95% and 2.5% brackets applying above that — making it one of the " +
        "lowest-tax states among those that levy any income tax at all.",
    },
    {
      question: "What are the North Dakota income tax brackets?",
      answer:
        "For Single filers: 0% up to $49,575 of federal taxable income, 1.95% from $49,575 up to $250,400, " +
        "and 2.5% above $250,400. For Married Filing Jointly: 0% up to $82,800, 1.95% up to $304,850, and " +
        "2.5% above that.",
    },
    {
      question: "What is North Dakota's standard deduction?",
      answer:
        "North Dakota doesn't have its own separate standard deduction. It uses your federal taxable income " +
        "— which already reflects the federal standard deduction — directly as its own starting point, so " +
        "there's no additional state-level deduction to subtract on top of that.",
    },
    {
      question: "Why does North Dakota use federal taxable income instead of its own deduction?",
      answer:
        "North Dakota's tax code is built to start from federal taxable income rather than defining its own " +
        "deduction structure from scratch — the same approach Montana uses. It keeps the state's tax " +
        "calculation simple by piggybacking on the federal calculation you've already done.",
    },
    {
      question: "What taxes are actually taken out of a North Dakota paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and North Dakota state " +
        "income tax (0%/1.95%/2.5% brackets applied to federal taxable income).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, " +
        "and this calculator includes all of it: federal income tax, Social Security, Medicare, and North " +
        "Dakota state income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in North Dakota?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, North " +
        "Dakota state income tax, and any deductions you enter. A single filer earning $75,000 a year, paid " +
        "biweekly with no deductions, takes home approximately $2,361.95 per paycheck — among the highest " +
        "take-home figures of any state modeled in this series, thanks to North Dakota's light state tax.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus the North " +
        "Dakota Office of State Tax Commissioner's published 2026 bracket thresholds. It approximates the " +
        "Married Filing Separately and Head of Household bracket schedules, and doesn't include tax credits " +
        "or every W-4 adjustment — so your actual withholding may differ slightly.",
    },
  ];

  const toolContent = {
    title: "North Dakota Income Tax Calculator",
    description:
      "This North Dakota income tax calculator and paycheck tax calculator shows you, in one place, exactly " +
      "what's withheld from your paycheck and what you take home. Use it as a general tax calculator for " +
      "North Dakota, a North Dakota payroll tax calculator for federal withholding, FICA, and state tax, or " +
      "a salary tax calculator for any pay frequency.",
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
    metaTitle: "North Dakota Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free North Dakota income tax calculator and paycheck tax calculator. Estimate federal income tax, " +
      "payroll tax (FICA), North Dakota state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to North Dakota's row in " +
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
