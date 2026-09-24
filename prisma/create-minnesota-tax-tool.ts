// One-time (but safe to re-run) setup script: creates the Minnesota Income
// Tax Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts / create-alabama-tax-tool.ts's structure
// and template (tool-template-3) exactly, per the established pattern.
//
// Minnesota taxes income through a 4-bracket progressive schedule (5.35% /
// 6.80% / 7.85% / 9.85%), sourced EXACTLY for all four filing statuses
// (Single, Married Filing Jointly, Married Filing Separately, and Head of
// Household each have their own published thresholds — no approximation
// needed) directly from the Minnesota Department of Revenue's official
// December 2025 press release announcing 2026 figures. PLUS a standard
// deduction and a $5,300-per-dependent exemption (Minnesota only grants
// this exemption for dependents, not for the filer or spouse), so this
// tool keeps the "Number of Dependents" input field.
//
// The actual math lives in code, not the database: see
// `customCalculators["minnesota-tax-calculator"]` in
// `src/lib/calc-engine.ts`. This script only wires up the Tool row so the
// public page has a title, input form, and content around that
// calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-minnesota-tax-tool.ts
// or
//   npm run db:create-minnesota-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "minnesota-tax-calculator";

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
    { key: "numberOfDependents", label: "Number of Dependents", type: "number", required: false, default: 0, min: 0, max: 10, step: 1 },
    { key: "preTaxDeductions", label: "Pre-Tax Deductions", unit: "per paycheck", type: "currency", required: false, default: 0, min: 0 },
    { key: "postTaxDeductions", label: "Post-Tax Deductions", unit: "per paycheck", type: "currency", required: false, default: 0, min: 0 },
    { key: "extraWithholding", label: "Extra Withholding", unit: "per paycheck", type: "currency", required: false, default: 0, min: 0 },
  ];

  const calcResults = [
    { key: "grossPayPerPeriod", label: "Gross Pay (per paycheck)", format: "currency" },
    { key: "federalIncomeTax", label: "Federal Income Tax (per paycheck)", format: "currency" },
    { key: "socialSecurityTax", label: "Social Security Tax (per paycheck)", format: "currency" },
    { key: "medicareTax", label: "Medicare Tax (per paycheck)", format: "currency" },
    { key: "stateIncomeTax", label: "Minnesota State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Minnesota income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Minnesota, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and Minnesota's state income tax from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, select your federal filing status, and enter " +
    "how many dependents you claim. Add any pre-tax deductions (like 401(k) contributions or health " +
    "insurance premiums), post-tax deductions, and extra federal withholding if they apply to you — " +
    "otherwise leave them at $0. Click Calculate to see a full breakdown: gross pay, federal income tax, " +
    "Social Security tax, Medicare tax, Minnesota state income tax, total deductions, and your estimated " +
    "take-home pay, both per paycheck and for the year.\n\n" +
    "Minnesota taxes income through four brackets — 5.35%, 6.80%, 7.85%, and 9.85% — after subtracting a " +
    "standard deduction and $5,300 for each dependent you claim.\n\n" +
    "Income taxes are calculated in four steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Minnesota's standard deduction and dependent exemptions are subtracted from " +
    "that to get Minnesota taxable income, the 5.35%-9.85% brackets are applied to that, and federal income " +
    "tax plus Social Security and Medicare are calculated separately alongside it. This calculator is " +
    "reviewed and updated whenever the IRS or the Minnesota Department of Revenue publish new annual " +
    "figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the Minnesota Department of Revenue's published 2026 brackets, standard deduction, and " +
    "dependent exemption for its state figures — sourced exactly for all four filing statuses from the " +
    "Department's official December 2025 press release, with no bracket approximation needed. It doesn't " +
    "account for tax credits, itemized deductions, or every possible W-4/W-4MN election, so treat it as a " +
    "close estimate rather than an exact paycheck figure — your actual paycheck may vary slightly depending " +
    "on your employer's payroll system.\n\n" +
    "Minnesota, unlike most states in this calculator series, only grants its per-exemption amount for " +
    "dependents — there's no separate exemption for the filer or spouse, consistent with Minnesota not " +
    "restoring the personal exemption the federal government suspended in 2018.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Minnesota state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Minnesota " +
    "Department of Revenue.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), " +
    "with no pre-tax or post-tax deductions, takes home approximately $2,231.38 per paycheck — about " +
    "$58,015.90 for the year — after federal income tax, Social Security, Medicare, and Minnesota state " +
    "income tax.\n\n" +
    "Because Minnesota's brackets run all the way up to 9.85% — one of the higher top rates among states " +
    "with an income tax — a family claiming several dependents sees a proportionally larger benefit from the " +
    "$5,300-per-dependent exemption than in most flat-tax states.";

  const faq = [
    { question: "Does Minnesota have a state income tax?", answer: "Yes — Minnesota taxes income through four brackets ranging from 5.35% to 9.85%." },
    { question: "What is Minnesota's income tax rate?", answer: "5.35% up to $33,310 of taxable income (Single), rising through 6.80% and 7.85%, up to 9.85% on income above $203,150 (Single) or $337,930 (Married Filing Jointly), for 2026." },
    { question: "What is Minnesota's standard deduction?", answer: "$15,300 for Single and Married Filing Separately, $30,600 for Married Filing Jointly, and $23,000 for Head of Household, for 2026." },
    { question: "Does Minnesota have a personal exemption?", answer: "Only for dependents — $5,300 per dependent claimed. There's no separate exemption for the filer or spouse." },
    { question: "What taxes are actually taken out of a Minnesota paycheck?", answer: "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus an extra 0.9% on higher wages), and Minnesota's state income tax." },
    { question: "Is this a payroll tax calculator too, not just income tax?", answer: "Yes — this calculator includes federal income tax, Social Security, Medicare, and Minnesota state income tax, all in the same breakdown." },
    { question: "What is my after-tax (take-home) pay in Minnesota?", answer: "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Minnesota state income tax, and any deductions you enter." },
    { question: "How accurate is this calculator?", answer: "It's an estimate, using 2026 IRS federal tax brackets plus Minnesota's published brackets, standard deduction, and dependent exemption. It doesn't include every possible credit or W-4/W-4MN adjustment, so your actual withholding may differ slightly." },
  ];

  const toolContent = {
    title: "Minnesota Income Tax Calculator",
    description:
      "This Minnesota income tax calculator and paycheck tax calculator shows you, in one place, exactly " +
      "what's withheld from your paycheck and what you take home. Use it as a general tax calculator for " +
      "Minnesota, a Minnesota payroll tax calculator for federal withholding, FICA, and state tax, or a " +
      "salary tax calculator for any pay frequency and number of dependents.",
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
    metaTitle: "Minnesota Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Minnesota income tax calculator and paycheck tax calculator. Estimate federal income tax, " +
      "payroll tax (FICA), Minnesota state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Minnesota's row in " +
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
