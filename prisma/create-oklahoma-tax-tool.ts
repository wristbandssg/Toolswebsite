// One-time (but safe to re-run) setup script: creates the Oklahoma Income Tax
// Calculator Tool inside the existing "Tax & Paycheck Calculators" category
// (created by create-nevada-paycheck-tool.ts, or here if that hasn't run
// yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-alabama-tax-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Like Alabama, Oklahoma DOES levy a state income tax, so this tool's
// breakdown actually shows a non-zero Oklahoma State Income Tax line. The
// math lives in code, not the database: see
// `customCalculators["oklahoma-tax-calculator"]` in `src/lib/calc-engine.ts`
// for the federal income tax (2026 IRS brackets + standard deduction), FICA
// (Social Security + Medicare), and Oklahoma state income tax (0%/2.5%/3.5%/
// 4.5% brackets, grouped Single+MFS vs. MFJ+Head of Household, plus a flat
// standard deduction by filing status — figures sourced from the Oklahoma
// Tax Commission's published 2026 brackets and standard deduction amounts)
// calculation. This script only wires up the Tool row so the public page
// has a title, input form, and content around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-oklahoma-tax-tool.ts
// or
//   npm run db:create-oklahoma-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "oklahoma-tax-calculator";

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
    { key: "stateIncomeTax", label: "Oklahoma State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for an Oklahoma income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Oklahoma, this tool covers it: it works out federal income " +
    "tax, Social Security, Medicare, and Oklahoma's state income tax from your salary, all in one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, select your federal filing status, and add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and extra " +
    "federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a full " +
    "breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Oklahoma state income tax, " +
    "total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "Oklahoma taxes income across four brackets running from 0% to 4.5%, but with an unusual twist: instead of " +
    "the usual four filing-status columns, Oklahoma groups Single and Married Filing Separately filers under one " +
    "bracket schedule, and groups Married Filing Jointly and Head of Household filers under a second, wider " +
    "schedule. A flat Oklahoma standard deduction, which does vary by filing status, is subtracted from taxable " +
    "wages before those brackets apply.\n\n" +
    "Income taxes are calculated in four steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Oklahoma's standard deduction (based on your filing status) is subtracted from " +
    "that to get Oklahoma taxable income, the appropriate 0%/2.5%/3.5%/4.5% bracket schedule is applied " +
    "depending on whether you're Single/Married Filing Separately or Married Filing Jointly/Head of Household, " +
    "and federal income tax plus Social Security and Medicare are calculated separately alongside it. This " +
    "calculator is reviewed and updated whenever the IRS or the Oklahoma Tax Commission publish new annual " +
    "figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the Oklahoma Tax Commission's published 2026 brackets and standard deduction amounts for its " +
    "state figures. It doesn't account for tax credits, itemized deductions, or every possible W-4 election, so " +
    "treat it as a close estimate rather than an exact paycheck figure — your actual paycheck may vary slightly " +
    "depending on your employer's payroll system.\n\n" +
    "Oklahoma's bracket structure genuinely groups Single filers together with Married Filing Separately filers " +
    "under one schedule, and groups Married Filing Jointly together with Head of Household under a second, " +
    "wider schedule — this isn't a simplification made for this calculator, it's how Oklahoma's statute is " +
    "actually written, confirmed directly from the Oklahoma Tax Commission's published tables.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Oklahoma state income tax alike — some deduction " +
    "types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This calculator doesn't include a dependents field, since Oklahoma's standard deduction and bracket " +
    "schedule don't vary by number of dependents claimed. It also doesn't model any Oklahoma tax credits, such " +
    "as the sales tax relief credit for lower-income households, which aren't part of standard paycheck " +
    "withholding.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Oklahoma Tax " +
    "Commission.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), with " +
    "no pre-tax or post-tax deductions, takes home approximately $2,258.38 per paycheck — about $58,718.00 for " +
    "the year — after federal income tax, Social Security, Medicare, and Oklahoma state income tax.\n\n" +
    "Because Oklahoma groups Single filers with Married Filing Separately filers under one bracket schedule and " +
    "groups Married Filing Jointly with Head of Household under a separate, wider one, two people with the same " +
    "income can see meaningfully different Oklahoma tax depending on which of those two schedules their filing " +
    "status falls under — it's worth double-checking which group your status belongs to.";

  const faq = [
    {
      question: "Does Oklahoma have a state income tax?",
      answer:
        "Yes. Oklahoma taxes income across four brackets from 0% to 4.5%, with the bracket amounts depending on " +
        "which of two filing-status groups you fall into.",
    },
    {
      question: "What are the Oklahoma income tax brackets?",
      answer:
        "For Single and Married Filing Separately filers: 0% on the first $3,750 of taxable income, 2.5% on the " +
        "next $1,150 (up to $4,900), 3.5% on the next $2,300 (up to $7,200), and 4.5% above $7,200. For Married " +
        "Filing Jointly and Head of Household filers: 0% up to $7,500, 2.5% up to $9,800, 3.5% up to $14,400, " +
        "and 4.5% above $14,400.",
    },
    {
      question: "What is Oklahoma's standard deduction?",
      answer:
        "$6,350 for Single and Married Filing Separately filers, $12,700 for Married Filing Jointly filers, and " +
        "$9,350 for Head of Household filers.",
    },
    {
      question: "Why does Oklahoma group filing statuses differently from other states?",
      answer:
        "Most states give each of the four filing statuses its own bracket schedule, or at least separate Single " +
        "from Married Filing Jointly. Oklahoma instead pairs Single with Married Filing Separately under one " +
        "schedule, and pairs Married Filing Jointly with Head of Household under a second, wider one — an " +
        "unusual structure, but it's how Oklahoma's tax code is actually written, not an approximation used by " +
        "this calculator.",
    },
    {
      question: "What taxes are actually taken out of an Oklahoma paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and Oklahoma state income " +
        "tax (0%/2.5%/3.5%/4.5% brackets after your standard deduction).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, Medicare, and Oklahoma state " +
        "income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in Oklahoma?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Oklahoma " +
        "state income tax, and any deductions you enter. Because Oklahoma's top 4.5% bracket starts at a " +
        "relatively low income level, most filers end up paying close to the top rate on the bulk of their " +
        "income once they're past the 0% bracket.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus the Oklahoma " +
        "Tax Commission's published 2026 brackets and standard deduction figures. It doesn't include tax " +
        "credits, itemized deductions, or every W-4 adjustment, so your actual withholding may differ slightly.",
    },
  ];

  const toolContent = {
    title: "Oklahoma Income Tax Calculator",
    description:
      "This Oklahoma income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Oklahoma, an " +
      "Oklahoma payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax calculator " +
      "for any pay frequency and filing status.",
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
    metaTitle: "Oklahoma Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Oklahoma income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll " +
      "tax (FICA), Oklahoma state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Oklahoma's row in " +
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
