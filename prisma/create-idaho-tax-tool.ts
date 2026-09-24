// One-time (but safe to re-run) setup script: creates the Idaho Income Tax
// Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts / create-arizona-tax-tool.ts's structure
// and template (tool-template-3) exactly, per the established pattern.
//
// Idaho levies a flat 5.3% state income tax after a flat deduction floor.
// Sourced from the Idaho State Tax Commission's individual income tax rate
// schedule (tax.idaho.gov) — the most recently published figures at the
// time this tool was built were for 2025 ($4,811 Single / $9,622 Married);
// Idaho adjusts this floor for inflation annually, so it's worth checking
// for a small update once official 2026 figures are published (documented
// in the Assumptions section below). No dependents field is needed —
// Idaho's flat-tax system doesn't add a separate per-dependent exemption on
// top of this floor, so this tool uses the same simple input set as
// Georgia/Colorado.
//
// The actual math lives in code, not the database: see
// `customCalculators["idaho-tax-calculator"]` in `src/lib/calc-engine.ts`.
// This script only wires up the Tool row so the public page has a title,
// input form, and content around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-idaho-tax-tool.ts
// or
//   npm run db:create-idaho-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "idaho-tax-calculator";

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
    { key: "stateIncomeTax", label: "Idaho State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for an Idaho income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Idaho, this tool covers it: it works out federal income " +
    "tax, Social Security, Medicare, and Idaho's flat state income tax from your salary, all in one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and " +
    "extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a " +
    "full breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Idaho state income tax, " +
    "total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "Idaho taxes income at a single flat rate of 5.3% on taxable income above a deduction floor — there are no " +
    "brackets to climb through once you're above that floor.\n\n" +
    "Income taxes are calculated in four steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Idaho's deduction floor is subtracted from that to get Idaho taxable income, " +
    "the flat 5.3% rate is applied to that, and federal income tax plus Social Security and Medicare are " +
    "calculated separately alongside it. This calculator is reviewed and updated whenever the IRS or the Idaho " +
    "State Tax Commission publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the Idaho State Tax Commission's published flat 5.3% rate for its state figures. It doesn't " +
    "account for tax credits, itemized deductions, or every possible W-4/ID W-4 election, so treat it as a " +
    "close estimate rather than an exact paycheck figure — your actual paycheck may vary slightly depending on " +
    "your employer's payroll system.\n\n" +
    "This calculator's Idaho deduction floor uses the most recently published figures at the time it was built " +
    "($4,811 Single/Married Filing Separately/Head of Household, $9,622 Married Filing Jointly) — Idaho " +
    "adjusts this floor for inflation each year, so it's worth checking for a small update once official 2026 " +
    "figures are published.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Idaho state income tax alike — some deduction " +
    "types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Idaho State " +
    "Tax Commission.";

  const examples =
    "Example: a single filer earning $75,000 a year, paid biweekly (26 paychecks/year), with no pre-tax or " +
    "post-tax deductions, takes home approximately $2,225.86 per paycheck — about $57,872.48 for the year — " +
    "after federal income tax, Social Security, Medicare, and Idaho's flat 5.3% state income tax.\n\n" +
    "Because Idaho's deduction floor is relatively small compared to its federal counterpart, most of a " +
    "typical salary ends up subject to the flat 5.3% rate — the floor mainly shelters the first few thousand " +
    "dollars of income.";

  const faq = [
    { question: "Does Idaho have a state income tax?", answer: "Yes, but a simple one: Idaho taxes income above a small deduction floor at a single flat rate of 5.3%, with no brackets." },
    { question: "What is Idaho's income tax rate?", answer: "A flat 5.3% on Idaho taxable income (income above the deduction floor), for every filing status." },
    { question: "What is Idaho's standard deduction or deduction floor?", answer: "The most recently published figures are $4,811 for Single, Married Filing Separately, and Head of Household filers, and $9,622 for Married Filing Jointly — adjusted for inflation annually by the Idaho State Tax Commission." },
    { question: "What taxes are actually taken out of an Idaho paycheck?", answer: "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus an extra 0.9% on higher wages), and Idaho's flat 5.3% state income tax." },
    { question: "Is this a payroll tax calculator too, not just income tax?", answer: "Yes — this calculator includes federal income tax, Social Security, Medicare, and Idaho state income tax, all in the same breakdown." },
    { question: "What is my after-tax (take-home) pay in Idaho?", answer: "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Idaho's flat 5.3% state income tax, and any deductions you enter." },
    { question: "How accurate is this calculator?", answer: "It's an estimate, using 2026 IRS federal tax brackets plus Idaho's published flat rate and the most recently available deduction floor figures. It doesn't include every possible credit or W-4/ID W-4 adjustment, so your actual withholding may differ slightly." },
    { question: "How do pre-tax deductions affect my paycheck?", answer: "Pre-tax deductions (like traditional 401(k) contributions or health insurance premiums) are subtracted from your wages before federal income tax, FICA, and Idaho state income tax are all calculated, which lowers your total tax." },
  ];

  const toolContent = {
    title: "Idaho Income Tax Calculator",
    description:
      "This Idaho income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Idaho, an " +
      "Idaho payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax calculator " +
      "for any pay frequency — Idaho's flat 5.3% state income tax makes the math simple.",
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
    metaTitle: "Idaho Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Idaho income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll tax " +
      "(FICA), Idaho's flat 5.3% state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Idaho's row in " +
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
