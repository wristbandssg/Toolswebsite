// One-time (but safe to re-run) setup script: creates the Georgia Income
// Tax Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts / create-arizona-tax-tool.ts's structure
// and template (tool-template-3) exactly, per the established pattern.
//
// Georgia levies a flat 4.99% state income tax after a flat standard
// deduction. Sourced from the Georgia Department of Revenue's "Important
// Tax Updates" page (dor.georgia.gov). No dependents field is needed —
// Georgia's current flat-tax law doesn't add a separate per-dependent
// exemption on top of the standard deduction, so this tool uses the same
// simple input set as Arizona/Colorado.
//
// The actual math lives in code, not the database: see
// `customCalculators["georgia-tax-calculator"]` in `src/lib/calc-engine.ts`.
// This script only wires up the Tool row so the public page has a title,
// input form, and content around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-georgia-tax-tool.ts
// or
//   npm run db:create-georgia-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "georgia-tax-calculator";

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
    { key: "annualSalary", label: "Annual Salary", type: "currency", unit: "USD/year", required: true, min: 0, max: 300000, step: 1000 },
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
    { key: "preTaxDeductions", label: "Pre-Tax Deductions", unit: "per paycheck", type: "currency", required: false, default: 0, min: 0 },
    { key: "postTaxDeductions", label: "Post-Tax Deductions", unit: "per paycheck", type: "currency", required: false, default: 0, min: 0 },
    { key: "extraWithholding", label: "Extra Withholding", unit: "per paycheck", type: "currency", required: false, default: 0, min: 0 },
  ];

  const calcResults = [
    { key: "grossPayPerPeriod", label: "Gross Pay (per paycheck)", format: "currency" },
    { key: "federalIncomeTax", label: "Federal Income Tax (per paycheck)", format: "currency" },
    { key: "socialSecurityTax", label: "Social Security Tax (per paycheck)", format: "currency" },
    { key: "medicareTax", label: "Medicare Tax (per paycheck)", format: "currency" },
    { key: "stateIncomeTax", label: "Georgia State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Georgia income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Georgia, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and Georgia's flat state income tax from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and " +
    "extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a " +
    "full breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Georgia state income " +
    "tax, total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "Georgia taxes income at a single flat rate of 4.99% — there are no brackets to climb through, so the same " +
    "rate applies to every dollar of Georgia taxable income once the standard deduction is subtracted.\n\n" +
    "Income taxes are calculated in four steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Georgia's standard deduction is subtracted from that to get Georgia taxable " +
    "income, the flat 4.99% rate is applied to that, and federal income tax plus Social Security and Medicare " +
    "are calculated separately alongside it. This calculator is reviewed and updated whenever the IRS or the " +
    "Georgia Department of Revenue publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the Georgia Department of Revenue's published flat 4.99% rate and standard deduction for its " +
    "state figures. It doesn't account for tax credits, itemized deductions, or every possible W-4/G-4 " +
    "election, so treat it as a close estimate rather than an exact paycheck figure — your actual paycheck may " +
    "vary slightly depending on your employer's payroll system.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Georgia state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Georgia " +
    "Department of Revenue.";

  const examples =
    "Example: a single filer earning $75,000 a year, paid biweekly (26 paychecks/year), with no pre-tax or " +
    "post-tax deductions, takes home approximately $2,253.79 per paycheck — about $58,598.50 for the year — " +
    "after federal income tax, Social Security, Medicare, and Georgia's flat 4.99% state income tax.\n\n" +
    "Because Georgia's rate is flat, the state tax math is simple once the standard deduction is subtracted: " +
    "Georgia state income tax is always exactly 4.99% of taxable wages minus the standard deduction for your " +
    "filing status — there's no bracket schedule to walk through.";

  const faq = [
    { question: "Does Georgia have a state income tax?", answer: "Yes, but a simple one: Georgia taxes all income at a single flat rate of 4.99%, with no brackets." },
    { question: "What is Georgia's income tax rate?", answer: "A flat 4.99% on Georgia taxable income (income after the standard deduction), for every filing status." },
    { question: "What is Georgia's standard deduction?", answer: "$15,000 for Single, Married Filing Separately, and Head of Household filers, and $30,000 for Married Filing Jointly, for 2026." },
    { question: "What taxes are actually taken out of a Georgia paycheck?", answer: "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus an extra 0.9% on higher wages), and Georgia's flat 4.99% state income tax." },
    { question: "Is this a payroll tax calculator too, not just income tax?", answer: "Yes — this calculator includes federal income tax, Social Security, Medicare, and Georgia state income tax, all in the same breakdown." },
    { question: "What is my after-tax (take-home) pay in Georgia?", answer: "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Georgia's flat 4.99% state income tax, and any deductions you enter." },
    { question: "How accurate is this calculator?", answer: "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus Georgia's published flat rate and standard deduction. It doesn't include every possible credit or W-4/G-4 adjustment, so your actual withholding may differ slightly." },
    { question: "How do pre-tax deductions affect my paycheck?", answer: "Pre-tax deductions (like traditional 401(k) contributions or health insurance premiums) are subtracted from your wages before federal income tax, FICA, and Georgia state income tax are all calculated, which lowers your total tax." },
  ];

  const toolContent = {
    title: "Georgia Income Tax Calculator",
    description:
      "This Georgia income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Georgia, a " +
      "Georgia payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax calculator " +
      "for any pay frequency — Georgia's flat 4.99% state income tax makes the math simple.",
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
    metaTitle: "Georgia Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Georgia income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll " +
      "tax (FICA), Georgia's flat 4.99% state income tax, and take-home pay.",
    schemaType: "SoftwareApplication",
  };

  const existing = await prisma.tool.findUnique({ where: { slug: SLUG } });

  if (existing) {
    await prisma.tool.update({
      where: { slug: SLUG },
      data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
    });
    console.log(`Updated the "${SLUG}" tool's content.`);
  } else {
    await prisma.tool.create({
      data: { slug: SLUG, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
    });
    console.log(`Created the "${SLUG}" tool (status: draft).`);
  }

  console.log(
    "Open it in /admin/tools, review it, then set Status to Published when you're happy with it. " +
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Georgia's row in " +
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
