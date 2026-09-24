// One-time (but safe to re-run) setup script: creates the Vermont Income
// Tax Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category (created by create-nevada-paycheck-tool.ts, or here if that
// hasn't run yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Unlike Nevada, Vermont DOES levy a state income tax, so this tool's
// breakdown actually shows a non-zero Vermont State Income Tax line. The
// math lives in code, not the database: see
// `customCalculators["vermont-tax-calculator"]` in `src/lib/calc-engine.ts`
// for the federal income tax (2026 IRS brackets + standard deduction), FICA
// (Social Security + Medicare), and Vermont state income tax (3.35%/6.6%/
// 7.6%/8.75% brackets and Vermont's own standard deduction — figures
// sourced from the Vermont Department of Taxes' 2026 VT Tax Tables)
// calculation. This script only wires up the Tool row so the public page
// has a title, input form, and content around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-vermont-tax-tool.ts
// or
//   npm run db:create-vermont-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "vermont-tax-calculator";

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
    { key: "stateIncomeTax", label: "Vermont State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Vermont income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Vermont, this tool covers it: it works out federal income " +
    "tax, Social Security, Medicare, and Vermont's state income tax from your salary, all in one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and " +
    "extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a full " +
    "breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Vermont state income tax, " +
    "total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "Vermont taxes income at four rates — 3.35%, 6.6%, 7.6%, and 8.75% — depending on how much of it falls in " +
    "each bracket, after subtracting Vermont's own standard deduction. Vermont's standard deduction is set by " +
    "the state itself rather than tied to the federal amount, and it's notably smaller than the federal " +
    "standard deduction: $6,500 for Single filers and $13,050 for Married Filing Jointly.\n\n" +
    "Income taxes are calculated in five steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Vermont's own standard deduction (based on your filing status) is subtracted " +
    "from that to get Vermont taxable income, Vermont's 3.35%/6.6%/7.6%/8.75% bracket rates are applied to " +
    "that, and federal income tax plus Social Security and Medicare are calculated separately alongside it, " +
    "using the federal standard deduction rather than Vermont's. This calculator is reviewed and updated " +
    "whenever the IRS or the Vermont Department of Taxes publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the Vermont Department of Taxes' 2026 VT Tax Tables for its state brackets and standard " +
    "deduction. It doesn't account for tax credits, itemized deductions, or every possible W-4/W-4VT election, " +
    "so treat it as a close estimate rather than an exact paycheck figure — your actual paycheck may vary " +
    "slightly depending on your employer's payroll system.\n\n" +
    "Married Filing Separately in Vermont is calculated here as exactly half of the Married Filing Jointly " +
    "bracket thresholds and standard deduction, which is how Vermont's own tables derive it. Head of Household " +
    "uses the Single bracket schedule and standard deduction in this calculator, since Vermont's exact Head of " +
    "Household figures weren't cleanly available separately — treat Head of Household results here as an " +
    "approximation.\n\n" +
    "This calculator doesn't model Vermont's own Child Tax Credit, which can reduce a real filer's Vermont tax " +
    "bill below the estimate shown here for households with qualifying children.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Vermont state income tax alike — some deduction " +
    "types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Vermont " +
    "Department of Taxes.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), with " +
    "no pre-tax or post-tax deductions, takes home approximately $2,254.93 per paycheck — about $58,628.25 for " +
    "the year — after federal income tax, Social Security, Medicare, and Vermont state income tax of $114.01 " +
    "per paycheck.\n\n" +
    "Because Vermont's standard deduction ($6,500 for Single filers) is noticeably smaller than the federal " +
    "standard deduction, more of a Vermont filer's income is exposed to Vermont's bracket rates than to the " +
    "federal ones — and at $75,000, this filer's Vermont taxable income of $68,500 already reaches into " +
    "Vermont's second bracket (6.6%), rather than staying in the lowest 3.35% bracket.";

  const faq = [
    {
      question: "Does Vermont have a state income tax?",
      answer:
        "Yes. Vermont taxes income at four rates — 3.35%, 6.6%, 7.6%, and 8.75% — depending on how much of your " +
        "income falls in each bracket, after subtracting Vermont's own standard deduction.",
    },
    {
      question: "What are the Vermont income tax brackets?",
      answer:
        "For Single filers: 3.35% up to $47,900, 6.6% from $47,900 to $116,000, 7.6% from $116,000 to $242,000, " +
        "and 8.75% above that. For Married Filing Jointly: 3.35% up to $79,950, 6.6% from $79,950 to $193,300, " +
        "7.6% from $193,300 to $294,600, and 8.75% above that.",
    },
    {
      question: "What is Vermont's standard deduction?",
      answer:
        "$6,500 for Single filers and $13,050 for Married Filing Jointly, set independently by the state rather " +
        "than tied to the federal standard deduction — and noticeably smaller than the federal amount, so more " +
        "of your income is exposed to Vermont's own bracket rates.",
    },
    {
      question: "How is the Vermont standard deduction calculated for other filing statuses?",
      answer:
        "Married Filing Separately is exactly half of the Married Filing Jointly amounts (both the brackets and " +
        "the standard deduction). Head of Household is approximated in this calculator using the Single " +
        "schedule and standard deduction, since Vermont's exact Head of Household figures weren't cleanly " +
        "available.",
    },
    {
      question: "What taxes are actually taken out of a Vermont paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and Vermont state income " +
        "tax (3.35%–8.75% brackets after Vermont's own standard deduction).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, Medicare, and Vermont state " +
        "income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in Vermont?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Vermont " +
        "state income tax, and any deductions you enter. Because Vermont's standard deduction is smaller than " +
        "the federal one, Vermont taxable income tends to be higher than federal taxable income for the same " +
        "salary.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus Vermont's " +
        "2026 VT Tax Tables brackets and standard deduction. It approximates Head of Household using the Single " +
        "schedule, doesn't model Vermont's Child Tax Credit, and doesn't include itemized deductions or every " +
        "W-4/W-4VT adjustment — so your actual withholding may differ slightly.",
    },
  ];

  const toolContent = {
    title: "Vermont Income Tax Calculator",
    description:
      "This Vermont income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Vermont, a " +
      "Vermont payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax calculator " +
      "for any pay frequency — it uses Vermont's own bracket rates and its own, smaller-than-federal standard " +
      "deduction.",
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
    metaTitle: "Vermont Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Vermont income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll tax " +
      "(FICA), Vermont state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Vermont's row in " +
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
