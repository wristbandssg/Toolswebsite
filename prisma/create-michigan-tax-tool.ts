// One-time (but safe to re-run) setup script: creates the Michigan Income
// Tax Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts / create-alabama-tax-tool.ts's structure
// and template (tool-template-3) exactly, per the established pattern.
//
// Michigan levies a flat 4.25% state income tax for 2026 (the Treasury
// confirmed the rate stays at 4.25% — the statutory revenue trigger for a
// rate cut wasn't met this year), applied after a $5,900-per-exemption
// personal exemption (self, spouse if filing jointly, each dependent).
// Michigan has no separate standard deduction, so this tool keeps the
// "Number of Dependents" input field. Sourced from the Michigan Department
// of Treasury's official 2026 rate announcement and 2026 withholding guide
// (michigan.gov).
//
// The actual math lives in code, not the database: see
// `customCalculators["michigan-tax-calculator"]` in
// `src/lib/calc-engine.ts`. This script only wires up the Tool row so the
// public page has a title, input form, and content around that
// calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-michigan-tax-tool.ts
// or
//   npm run db:create-michigan-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "michigan-tax-calculator";

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
    { key: "stateIncomeTax", label: "Michigan State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Michigan income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Michigan, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and Michigan's flat state income tax from your salary, all in " +
    "one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, select your federal filing status, and enter " +
    "how many dependents you claim. Add any pre-tax deductions (like 401(k) contributions or health " +
    "insurance premiums), post-tax deductions, and extra federal withholding if they apply to you — " +
    "otherwise leave them at $0. Click Calculate to see a full breakdown: gross pay, federal income tax, " +
    "Social Security tax, Medicare tax, Michigan state income tax, total deductions, and your estimated " +
    "take-home pay, both per paycheck and for the year.\n\n" +
    "Michigan taxes income at a single flat rate of 4.25% — the Michigan Department of Treasury confirmed " +
    "the rate stays at 4.25% for 2026 — applied after subtracting a $5,900 personal exemption for yourself, " +
    "your spouse (if filing jointly), and each dependent.\n\n" +
    "Income taxes are calculated in four steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Michigan's personal exemptions are subtracted from that to get Michigan " +
    "taxable income, the flat 4.25% rate is applied to that, and federal income tax plus Social Security and " +
    "Medicare are calculated separately alongside it. This calculator is reviewed and updated whenever the " +
    "IRS or the Michigan Department of Treasury publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the Michigan Department of Treasury's published flat 4.25% rate and $5,900 personal " +
    "exemption amount for its state figures. It doesn't account for tax credits, itemized deductions, or " +
    "every possible W-4/MI-W4 election, so treat it as a close estimate rather than an exact paycheck figure " +
    "— your actual paycheck may vary slightly depending on your employer's payroll system.\n\n" +
    "Michigan has no separate standard deduction — the personal exemption is the only subtraction before the " +
    "flat rate applies, and it's applied once for you, once more if you select Married Filing Jointly, and " +
    "once for each dependent you enter. This calculator also doesn't model Michigan's local city income " +
    "taxes (such as Detroit's), which apply only to residents or workers in specific cities.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Michigan state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Michigan " +
    "Department of Treasury.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), " +
    "with no pre-tax or post-tax deductions, takes home approximately $2,255.99 per paycheck — about " +
    "$58,655.75 for the year — after federal income tax, Social Security, Medicare, and Michigan's flat " +
    "4.25% state income tax.\n\n" +
    "Because Michigan's personal exemption ($5,900 per person) is larger than several other flat-tax " +
    "states' equivalent amounts, each additional dependent claimed noticeably lowers the taxable amount " +
    "before the flat 4.25% rate applies.";

  const faq = [
    { question: "Does Michigan have a state income tax?", answer: "Yes, but a simple one: Michigan taxes all income at a single flat rate of 4.25%, with no brackets." },
    { question: "What is Michigan's income tax rate?", answer: "A flat 4.25% on Michigan taxable income (income after personal exemptions), for every filing status, confirmed for 2026." },
    { question: "Does Michigan have a standard deduction?", answer: "No. Instead, Michigan subtracts a $5,900-per-exemption personal exemption (yourself, your spouse if filing jointly, and each dependent) before applying the flat rate." },
    { question: "What taxes are actually taken out of a Michigan paycheck?", answer: "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus an extra 0.9% on higher wages), and Michigan's flat 4.25% state income tax." },
    { question: "Is this a payroll tax calculator too, not just income tax?", answer: "Yes — this calculator includes federal income tax, Social Security, Medicare, and Michigan state income tax, all in the same breakdown." },
    { question: "What is my after-tax (take-home) pay in Michigan?", answer: "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Michigan's flat 4.25% state income tax, and any deductions you enter — not counting any local city income tax, which this calculator doesn't include." },
    { question: "How accurate is this calculator?", answer: "It's an estimate, using 2026 IRS federal tax brackets plus Michigan's published flat rate and personal exemption amount. It doesn't include every possible credit, local city tax, or W-4/MI-W4 adjustment, so your actual withholding may differ slightly." },
    { question: "How do pre-tax deductions affect my paycheck?", answer: "Pre-tax deductions (like traditional 401(k) contributions or health insurance premiums) are subtracted from your wages before federal income tax, FICA, and Michigan state income tax are all calculated, which lowers your total tax." },
  ];

  const toolContent = {
    title: "Michigan Income Tax Calculator",
    description:
      "This Michigan income tax calculator and paycheck tax calculator shows you, in one place, exactly " +
      "what's withheld from your paycheck and what you take home. Use it as a general tax calculator for " +
      "Michigan, a Michigan payroll tax calculator for federal withholding, FICA, and state tax, or a salary " +
      "tax calculator for any pay frequency and number of dependents — Michigan's flat 4.25% state income " +
      "tax makes the math simple.",
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
    metaTitle: "Michigan Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Michigan income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll " +
      "tax (FICA), Michigan's flat 4.25% state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Michigan's row in " +
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
