// One-time (but safe to re-run) setup script: creates the Rhode Island
// Income Tax Calculator Tool inside the existing "Tax & Paycheck
// Calculators" category (created by create-nevada-paycheck-tool.ts, or here
// if that hasn't run yet) — input fields, the multi-line breakdown result
// config, instructions/examples/FAQ, and SEO meta. Mirrors
// create-alabama-tax-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Like Alabama, Rhode Island DOES levy a state income tax, so this tool's
// breakdown actually shows a non-zero Rhode Island State Income Tax line.
// The math lives in code, not the database: see
// `customCalculators["rhode-island-tax-calculator"]` in
// `src/lib/calc-engine.ts` for the federal income tax (2026 IRS brackets +
// standard deduction), FICA (Social Security + Medicare), and Rhode Island
// state income tax (3.75%/4.75%/5.99% brackets, using the same dollar
// thresholds for every filing status, plus a standard deduction that does
// vary by filing status — figures sourced from the Rhode Island Division
// of Taxation's own official 2026 inflation-adjustment bulletin)
// calculation. This script only wires up the Tool row so the public page
// has a title, input form, and content around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-rhode-island-tax-tool.ts
// or
//   npm run db:create-rhode-island-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "rhode-island-tax-calculator";

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
    { key: "stateIncomeTax", label: "Rhode Island State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Rhode Island income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Rhode Island, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and Rhode Island's state income tax from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, select your federal filing status, and add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and extra " +
    "federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a full " +
    "breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Rhode Island state income tax, " +
    "total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "Rhode Island taxes income across three brackets — 3.75%, 4.75%, and 5.99% — using the same dollar " +
    "thresholds for every filing status rather than doubling them for Married Filing Jointly, after subtracting " +
    "a standard deduction that does vary by filing status.\n\n" +
    "Income taxes are calculated in four steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Rhode Island's standard deduction (based on your filing status) is subtracted " +
    "from that to get Rhode Island taxable income, the 3.75%/4.75%/5.99% bracket rates are applied to that, and " +
    "federal income tax plus Social Security and Medicare are calculated separately alongside it. This " +
    "calculator is reviewed and updated whenever the IRS or the Rhode Island Division of Taxation publish new " +
    "annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the Rhode Island Division of Taxation's own official 2026 inflation-adjustment bulletin for " +
    "its state brackets and standard deduction amounts. It doesn't account for tax credits, itemized " +
    "deductions, or every possible W-4 election, so treat it as a close estimate rather than an exact paycheck " +
    "figure — your actual paycheck may vary slightly depending on your employer's payroll system.\n\n" +
    "Rhode Island's bracket thresholds are genuinely the same dollar amounts for every filing status — " +
    "including Married Filing Jointly — rather than being doubled the way many other states' brackets are. " +
    "This is confirmed directly from the Rhode Island Division of Taxation's own official 2026 " +
    "inflation-adjustment bulletin, not an approximation used by this calculator.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Rhode Island state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This calculator doesn't include a dependents field, and it doesn't model any Rhode Island tax credits, " +
    "such as the earned income credit, which aren't part of standard paycheck withholding.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Rhode Island " +
    "Division of Taxation.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), with " +
    "no pre-tax or post-tax deductions, takes home approximately $2,276.92 per paycheck — about $59,200.00 for " +
    "the year — after federal income tax, Social Security, Medicare, and Rhode Island state income tax.\n\n" +
    "Because Rhode Island uses the same bracket thresholds for every filing status rather than doubling them for " +
    "Married Filing Jointly, a married couple filing jointly reaches Rhode Island's higher 4.75% and 5.99% " +
    "brackets at the same combined income level as a single filer would — unlike most other states with " +
    "graduated brackets.";

  const faq = [
    {
      question: "Does Rhode Island have a state income tax?",
      answer:
        "Yes. Rhode Island taxes income across three brackets: 3.75%, 4.75%, and 5.99%.",
    },
    {
      question: "What are the Rhode Island income tax brackets?",
      answer:
        "3.75% on the first $82,050 of taxable income, 4.75% on the next portion up to $186,450, and 5.99% " +
        "above $186,450 — and these thresholds are the same dollar amounts for every filing status, including " +
        "Married Filing Jointly.",
    },
    {
      question: "What is Rhode Island's standard deduction?",
      answer:
        "$11,200 for Single and Married Filing Separately filers, $22,400 for Married Filing Jointly filers, " +
        "and $16,800 for Head of Household filers.",
    },
    {
      question: "Are Rhode Island's tax brackets the same for every filing status?",
      answer:
        "Yes — unlike most states, which double their bracket thresholds for Married Filing Jointly filers, " +
        "Rhode Island uses the exact same $82,050 and $186,450 thresholds for every filing status. This is " +
        "confirmed directly from the Rhode Island Division of Taxation's own official bulletin, not an " +
        "approximation.",
    },
    {
      question: "What taxes are actually taken out of a Rhode Island paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and Rhode Island state " +
        "income tax (3.75%/4.75%/5.99% brackets after your standard deduction).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, Medicare, and Rhode Island " +
        "state income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in Rhode Island?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Rhode " +
        "Island state income tax, and any deductions you enter. Because Rhode Island's bracket thresholds don't " +
        "change with filing status, a married couple's combined income moves through the brackets at the same " +
        "pace as a single filer's would.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus the Rhode " +
        "Island Division of Taxation's own official 2026 brackets and standard deduction figures. It doesn't " +
        "include tax credits, itemized deductions, or every W-4 adjustment, so your actual withholding may " +
        "differ slightly.",
    },
  ];

  const toolContent = {
    title: "Rhode Island Income Tax Calculator",
    description:
      "This Rhode Island income tax calculator and paycheck tax calculator shows you, in one place, exactly " +
      "what's withheld from your paycheck and what you take home. Use it as a general tax calculator for Rhode " +
      "Island, a Rhode Island payroll tax calculator for federal withholding, FICA, and state tax, or a salary " +
      "tax calculator for any pay frequency and filing status.",
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
    metaTitle: "Rhode Island Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Rhode Island income tax calculator and paycheck tax calculator. Estimate federal income tax, " +
      "payroll tax (FICA), Rhode Island state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Rhode Island's row in " +
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
