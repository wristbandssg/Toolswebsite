// One-time (but safe to re-run) setup script: creates the Nebraska Income Tax
// Calculator Tool inside the existing "Tax & Paycheck Calculators" category
// (created by create-nevada-paycheck-tool.ts, or here if that hasn't run
// yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-alabama-tax-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Like Alabama, Nebraska DOES levy a state income tax, so this tool's
// breakdown shows a non-zero Nebraska State Income Tax line. The math lives
// in code, not the database: see `customCalculators["nebraska-tax-calculator"]`
// in `src/lib/calc-engine.ts` for the federal income tax (2026 IRS brackets +
// standard deduction), FICA (Social Security + Medicare), and Nebraska state
// income tax (three brackets — 2.46%/3.51%/4.55% — with Nebraska's own
// standard deduction — figures sourced from the Nebraska Department of
// Revenue's 2026 income tax withholding tables) calculation. This script
// only wires up the Tool row so the public page has a title, input form, and
// content around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-nebraska-tax-tool.ts
// or
//   npm run db:create-nebraska-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "nebraska-tax-calculator";

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
    { key: "stateIncomeTax", label: "Nebraska State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Nebraska income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Nebraska, this tool covers it: it works out federal income " +
    "tax, Social Security, Medicare, and Nebraska's state income tax from your salary, all in one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and extra " +
    "federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a full " +
    "breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Nebraska state income tax, " +
    "total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "Nebraska taxes income across three brackets — 2.46%, 3.51%, and 4.55% — with the bracket thresholds roughly " +
    "doubled for joint filers, and applies its own standard deduction before running your income through those " +
    "brackets.\n\n" +
    "Income taxes are calculated in a few steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Nebraska's standard deduction for your filing status is subtracted from that to " +
    "get Nebraska taxable income, Nebraska's 2.46%/3.51%/4.55% bracket schedule is applied to the result, and " +
    "federal income tax plus Social Security and Medicare are calculated separately alongside it. This " +
    "calculator is reviewed and updated whenever the IRS or the Nebraska Department of Revenue publish new " +
    "annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the Nebraska Department of Revenue's published 2026 income tax withholding tables for its " +
    "state figures. It doesn't account for tax credits, itemized deductions, or every possible W-4 election, so " +
    "treat it as a close estimate rather than an exact paycheck figure — your actual paycheck may vary slightly " +
    "depending on your employer's payroll system.\n\n" +
    "Nebraska's standard deduction for 2026 is $8,600 for Single filers, $17,200 for Married Filing Jointly, " +
    "$8,600 for Married Filing Separately, and $12,600 for Head of Household, applied directly with no phase-out " +
    "or interpolation.\n\n" +
    "Nebraska's Married Filing Separately bracket thresholds are derived here as exactly half of the Married " +
    "Filing Jointly thresholds, and Head of Household uses the Single bracket schedule — both are documented " +
    "simplifications, since exact separately published Head of Household brackets weren't cleanly sourced.\n\n" +
    "This calculator doesn't model Nebraska's small nonrefundable child and dependent care credit, since it's a " +
    "flat-dollar credit rather than part of the bracket/deduction structure modeled here — a filer who qualifies " +
    "for it would owe somewhat less Nebraska tax than this estimate shows.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Nebraska " +
    "Department of Revenue.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), with " +
    "no pre-tax or post-tax deductions, takes home approximately $2,264.31 per paycheck — about $58,872.17 for " +
    "the year — after federal income tax, Social Security, Medicare, and Nebraska state income tax.\n\n" +
    "Nebraska's top bracket (4.55%) starts at a relatively modest $24,760 of taxable income for single filers " +
    "(or $49,530 for joint filers), so most Nebraska filers with a typical full-time salary end up paying that " +
    "top marginal rate on a substantial share of their income, even though the lower 2.46% and 3.51% brackets " +
    "keep the overall effective rate meaningfully below 4.55%.";

  const faq = [
    {
      question: "Does Nebraska have a state income tax?",
      answer:
        "Yes. Nebraska taxes income across three brackets — 2.46%, 3.51%, and 4.55% — with thresholds that " +
        "roughly double for Married Filing Jointly compared to Single filers.",
    },
    {
      question: "What are the Nebraska income tax brackets?",
      answer:
        "For Single filers: 2.46% up to $4,130, 3.51% up to $24,760, and 4.55% above $24,760. For Married Filing " +
        "Jointly: 2.46% up to $8,250, 3.51% up to $49,530, and 4.55% above $49,530.",
    },
    {
      question: "What is Nebraska's standard deduction?",
      answer:
        "For 2026: $8,600 for Single filers, $17,200 for Married Filing Jointly, $8,600 for Married Filing " +
        "Separately, and $12,600 for Head of Household.",
    },
    {
      question: "How are Head of Household and Married Filing Separately handled in Nebraska?",
      answer:
        "This calculator derives Married Filing Separately's bracket thresholds as exactly half of Married " +
        "Filing Jointly's, and uses the Single bracket schedule for Head of Household — documented " +
        "simplifications, since Head of Household brackets weren't cleanly sourced separately.",
    },
    {
      question: "What taxes are actually taken out of a Nebraska paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and Nebraska state income " +
        "tax (2.46% to 4.55% across three brackets, after the standard deduction).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, Medicare, and Nebraska state " +
        "income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in Nebraska?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Nebraska " +
        "state income tax, and any deductions you enter. Because Nebraska's top bracket starts at a relatively " +
        "low income level, most filers end up paying close to the 4.55% top rate on a meaningful share of their " +
        "earnings.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus Nebraska's " +
        "2026 brackets and standard deduction. It approximates Nebraska's Married Filing Separately and Head of " +
        "Household brackets, doesn't model Nebraska's small dependent care credit, and doesn't include itemized " +
        "deductions or every W-4 adjustment — so your actual withholding may differ slightly.",
    },
  ];

  const toolContent = {
    title: "Nebraska Income Tax Calculator",
    description:
      "This Nebraska income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Nebraska, a " +
      "Nebraska payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax calculator " +
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
    metaTitle: "Nebraska Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Nebraska income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll tax " +
      "(FICA), Nebraska state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Nebraska's row in " +
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
