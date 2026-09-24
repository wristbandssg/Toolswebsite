// One-time (but safe to re-run) setup script: creates the Massachusetts
// Income Tax Calculator Tool inside the existing "Tax & Paycheck
// Calculators" category — input fields, the multi-line breakdown result
// config, instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts / create-alabama-tax-tool.ts's structure
// and template (tool-template-3) exactly, per the established pattern.
//
// Massachusetts levies a flat 5% state income tax, PLUS a "Millionaire's
// Tax": an additional 4% surtax on taxable income above $1,107,750 for
// 2026. Massachusetts has no separate standard deduction — instead it uses
// a personal exemption ($4,400 Single/MFS, $6,800 HoH, $8,800 MFJ) plus
// $1,000 per dependent, so this tool keeps the "Number of Dependents" input
// field. Sourced from mass.gov's official Massachusetts tax rates page and
// a Massachusetts personal-exemption explainer.
//
// The actual math lives in code, not the database: see
// `customCalculators["massachusetts-tax-calculator"]` in
// `src/lib/calc-engine.ts`. This script only wires up the Tool row so the
// public page has a title, input form, and content around that
// calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-massachusetts-tax-tool.ts
// or
//   npm run db:create-massachusetts-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "massachusetts-tax-calculator";

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
    { key: "stateIncomeTax", label: "Massachusetts State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Massachusetts income tax calculator, a paycheck tax calculator, a payroll " +
    "tax calculator, or just a general tax calculator for Massachusetts, this tool covers it: it works out " +
    "federal income tax, Social Security, Medicare, and Massachusetts's state income tax from your salary, " +
    "all in one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, select your federal filing status, and enter " +
    "how many dependents you claim. Add any pre-tax deductions (like 401(k) contributions or health " +
    "insurance premiums), post-tax deductions, and extra federal withholding if they apply to you — " +
    "otherwise leave them at $0. Click Calculate to see a full breakdown: gross pay, federal income tax, " +
    "Social Security tax, Medicare tax, Massachusetts state income tax, total deductions, and your " +
    "estimated take-home pay, both per paycheck and for the year.\n\n" +
    "Massachusetts taxes most income at a flat 5% rate, subtracting a personal exemption for yourself, your " +
    "spouse (if filing jointly), and each dependent first. High earners also pay an additional 4% " +
    "\"Millionaire's Tax\" surtax on taxable income above $1,107,750 for 2026.\n\n" +
    "Income taxes are calculated in four steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Massachusetts's personal exemptions are subtracted from that to get " +
    "Massachusetts taxable income, the flat 5% rate (plus the 4% surtax above $1,107,750, if applicable) is " +
    "applied to that, and federal income tax plus Social Security and Medicare are calculated separately " +
    "alongside it. This calculator is reviewed and updated whenever the IRS or the Massachusetts Department " +
    "of Revenue publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the Massachusetts Department of Revenue's published flat 5% rate, 4% surtax threshold, and " +
    "personal exemption amounts for its state figures. It doesn't account for tax credits, itemized " +
    "deductions, or every possible W-4/M-4 election, so treat it as a close estimate rather than an exact " +
    "paycheck figure — your actual paycheck may vary slightly depending on your employer's payroll " +
    "system.\n\n" +
    "This calculator's salary field caps at $300,000/year, like every other state calculator on this site, " +
    "so the 4% Millionaire's Tax surtax (which only applies above $1,107,750) won't actually trigger for a " +
    "typical user here — it's included in the underlying calculation for completeness rather than because " +
    "it usually matters.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Massachusetts state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the " +
    "Massachusetts Department of Revenue.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), " +
    "with no pre-tax or post-tax deductions, takes home approximately $2,233.17 per paycheck — about " +
    "$58,062.50 for the year — after federal income tax, Social Security, Medicare, and Massachusetts's flat " +
    "5% state income tax.\n\n" +
    "Because Massachusetts's personal exemption ($4,400 for a single filer) is smaller than most states' " +
    "standard deductions, more of a typical salary ends up subject to the flat 5% rate — each additional " +
    "dependent claimed shelters another $1,000.";

  const faq = [
    { question: "Does Massachusetts have a state income tax?", answer: "Yes — a flat 5% rate on most income, plus an additional 4% surtax (the \"Millionaire's Tax\") on taxable income above $1,107,750 for 2026." },
    { question: "What is Massachusetts's income tax rate?", answer: "A flat 5% on Massachusetts taxable income, plus 4% more (9% total) on any amount above $1,107,750." },
    { question: "Does Massachusetts have a standard deduction?", answer: "No — instead Massachusetts uses a personal exemption ($4,400 Single/MFS, $6,800 Head of Household, $8,800 Married Filing Jointly), plus $1,000 per dependent." },
    { question: "What is the Massachusetts Millionaire's Tax?", answer: "An extra 4% surtax on taxable income above $1,107,750 for 2026, on top of the regular 5% flat rate — so income above that threshold is effectively taxed at 9%." },
    { question: "What taxes are actually taken out of a Massachusetts paycheck?", answer: "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus an extra 0.9% on higher wages), and Massachusetts's flat 5% state income tax (plus the surtax for very high earners)." },
    { question: "Is this a payroll tax calculator too, not just income tax?", answer: "Yes — this calculator includes federal income tax, Social Security, Medicare, and Massachusetts state income tax, all in the same breakdown." },
    { question: "What is my after-tax (take-home) pay in Massachusetts?", answer: "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Massachusetts state income tax, and any deductions you enter." },
    { question: "How accurate is this calculator?", answer: "It's an estimate, using 2026 IRS federal tax brackets plus Massachusetts's published flat rate, surtax threshold, and personal exemption amounts. It doesn't include every possible credit or W-4/M-4 adjustment, so your actual withholding may differ slightly." },
  ];

  const toolContent = {
    title: "Massachusetts Income Tax Calculator",
    description:
      "This Massachusetts income tax calculator and paycheck tax calculator shows you, in one place, exactly " +
      "what's withheld from your paycheck and what you take home. Use it as a general tax calculator for " +
      "Massachusetts, a Massachusetts payroll tax calculator for federal withholding, FICA, and state tax, " +
      "or a salary tax calculator for any pay frequency and number of dependents.",
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
    metaTitle: "Massachusetts Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Massachusetts income tax calculator and paycheck tax calculator. Estimate federal income tax, " +
      "payroll tax (FICA), Massachusetts's flat 5% state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Massachusetts's row in " +
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
