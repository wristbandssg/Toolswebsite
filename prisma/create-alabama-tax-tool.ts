// One-time (but safe to re-run) setup script: creates the Alabama Income Tax
// Calculator Tool inside the existing "Tax & Paycheck Calculators" category
// (created by create-nevada-paycheck-tool.ts, or here if that hasn't run
// yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Unlike Nevada, Alabama DOES levy a state income tax, so this tool's
// breakdown actually shows a non-zero Alabama State Income Tax line. The
// math lives in code, not the database: see
// `customCalculators["alabama-tax-calculator"]` in `src/lib/calc-engine.ts`
// for the federal income tax (2026 IRS brackets + standard deduction), FICA
// (Social Security + Medicare), and Alabama state income tax (2%/4%/5%
// brackets, phased standard deduction, personal + dependent exemptions —
// figures sourced from the Alabama Department of Revenue's 2026 withholding
// tax tables) calculation. This script only wires up the Tool row so the
// public page has a title, input form, and content around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-alabama-tax-tool.ts
// or
//   npm run db:create-alabama-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "alabama-tax-calculator";

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
      key: "numberOfDependents",
      label: "Number of Dependents",
      type: "number",
      required: false,
      default: 0,
      min: 0,
      max: 10,
      step: 1,
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
    { key: "stateIncomeTax", label: "Alabama State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for an Alabama income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Alabama, this tool covers it: it works out federal income " +
    "tax, Social Security, Medicare, and Alabama's state income tax from your salary, all in one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, select your federal filing status, and enter how " +
    "many dependents you claim. Add any pre-tax deductions (like 401(k) contributions or health insurance " +
    "premiums), post-tax deductions, and extra federal withholding if they apply to you — otherwise leave them " +
    "at $0. Click Calculate to see a full breakdown: gross pay, federal income tax, Social Security tax, " +
    "Medicare tax, Alabama state income tax, total deductions, and your estimated take-home pay, both per " +
    "paycheck and for the year.\n\n" +
    "Alabama taxes income at 2%, 4%, and 5% depending on how much of it falls in each bracket, after " +
    "subtracting a standard deduction (which shrinks as your income rises), a personal exemption, and an " +
    "exemption for each dependent you claim (which also shrinks at higher income).\n\n" +
    "Income taxes are calculated in five steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, that same figure (used as a proxy for Alabama AGI) determines your standard " +
    "deduction, personal exemption, and dependent exemption amounts, those three are subtracted from taxable " +
    "wages to get Alabama taxable income, Alabama's 2%/4%/5% bracket rates are applied to that, and federal " +
    "income tax plus Social Security and Medicare are calculated separately alongside it. This calculator is " +
    "reviewed and updated whenever the IRS or the Alabama Department of Revenue publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the Alabama Department of Revenue's published 2026 brackets, exemption amounts, and standard " +
    "deduction schedule for its state figures. It doesn't account for tax credits, itemized deductions, or " +
    "every possible W-4/A-4 election, so treat it as a close estimate rather than an exact paycheck figure — " +
    "your actual paycheck may vary slightly depending on your employer's payroll system.\n\n" +
    "Alabama's standard deduction officially steps down in discrete increments as income rises, rather than " +
    "shrinking smoothly — this calculator approximates that step schedule with straight-line interpolation " +
    "between the published income thresholds, which is accurate to within a few dollars rather than exact to " +
    "the cent.\n\n" +
    "The Alabama dependent exemption amount ($1,000 / $500 / $300 per dependent) depends on your income tier; " +
    "this calculator uses your taxable wages (salary minus pre-tax deductions) as that income figure, which is " +
    "a close proxy for Alabama AGI but not always identical to it.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Alabama state income tax alike — some deduction " +
    "types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Alabama " +
    "Department of Revenue.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), with " +
    "no pre-tax or post-tax deductions, takes home approximately $2,233.94 per paycheck — about $58,082.50 for " +
    "the year — after federal income tax, Social Security, Medicare, and Alabama state income tax.\n\n" +
    "Because Alabama's standard deduction shrinks as income rises and its top bracket (5%) starts at just " +
    "$3,000 of taxable income (Single/MFS/Head of Household) or $6,000 (Married Filing Jointly), most Alabama " +
    "filers end up paying close to the full 5% rate on the bulk of their income — the low bracket thresholds " +
    "matter far less here than in states with more gradual tax brackets.";

  const faq = [
    {
      question: "Does Alabama have a state income tax?",
      answer:
        "Yes. Alabama taxes income at 2%, 4%, and 5%, with the bracket thresholds set much lower than most " +
        "states' — so most income ends up taxed at or near the top 5% rate once you're past a modest amount of " +
        "taxable income.",
    },
    {
      question: "What are the Alabama income tax brackets?",
      answer:
        "For Single, Married Filing Separately, and Head of Household filers: 2% on the first $500 of taxable " +
        "income, 4% on the next $2,500 (up to $3,000), and 5% above $3,000. For Married Filing Jointly, the " +
        "thresholds are doubled: 2% up to $1,000, 4% up to $6,000, and 5% above $6,000.",
    },
    {
      question: "What is Alabama's standard deduction?",
      answer:
        "It depends on your filing status and income, and it shrinks as your income rises. At lower incomes it " +
        "starts at $3,000 (Single), $8,500 (Married Filing Jointly), $5,200 (Head of Household), or $4,250 " +
        "(Married Filing Separately), phasing down to a floor of $2,500 (or $5,000 for Married Filing Jointly) " +
        "at higher income levels.",
    },
    {
      question: "What is the Alabama personal exemption?",
      answer:
        "$1,500 for Single and Married Filing Separately filers, and $3,000 for Married Filing Jointly and Head " +
        "of Household filers — subtracted from taxable income before Alabama's bracket rates are applied.",
    },
    {
      question: "How much is the Alabama dependent exemption?",
      answer:
        "It also depends on income: $1,000 per dependent if your income is $50,000 or less, $500 per dependent " +
        "between $50,000 and $100,000, and $300 per dependent above $100,000.",
    },
    {
      question: "What taxes are actually taken out of an Alabama paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and Alabama state income " +
        "tax (2%/4%/5% brackets after your standard deduction and exemptions).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, Medicare, and Alabama state " +
        "income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in Alabama?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Alabama " +
        "state income tax, and any deductions you enter. Because Alabama's brackets top out quickly, most " +
        "filers see close to the full 5% state rate applied once their taxable income clears the standard " +
        "deduction and exemptions.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus the Alabama " +
        "Department of Revenue's published 2026 brackets and exemption amounts. It approximates Alabama's " +
        "standard deduction phase-out with straight-line interpolation rather than reproducing every published " +
        "step, and doesn't include tax credits, itemized deductions, or every W-4/A-4 adjustment — so your " +
        "actual withholding may differ slightly.",
    },
    {
      question: "How do pre-tax deductions affect my paycheck?",
      answer:
        "Pre-tax deductions (like traditional 401(k) contributions or health insurance premiums) are subtracted " +
        "from your wages before federal income tax, FICA, and Alabama state income tax are all calculated, " +
        "which lowers your total tax — so your take-home pay drops by less than the full deduction amount.",
    },
  ];

  const toolContent = {
    title: "Alabama Income Tax Calculator",
    description:
      "This Alabama income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Alabama, an " +
      "Alabama payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax calculator " +
      "for any pay frequency and number of dependents.",
    templateKey: "tool-template-3",
    categoryId: category.id,
    calcType: "custom",
    calcFormula: null,
    calcInputs: JSON.stringify(calcInputs),
    calcResult: JSON.stringify({ label: "Take-Home Pay", unit: "", format: "currency" }),
    calcResults: JSON.stringify(calcResults),
    instructions,
    examples,
    assumptions,
    faq: JSON.stringify(faq),
  } satisfies Prisma.ToolUncheckedUpdateInput;

  const seoMetaContent = {
    contentType: "tool",
    metaTitle: "Alabama Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Alabama income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll tax " +
      "(FICA), Alabama state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Alabama's row in " +
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
