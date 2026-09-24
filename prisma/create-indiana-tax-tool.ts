// One-time (but safe to re-run) setup script: creates the Indiana Income
// Tax Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts / create-alabama-tax-tool.ts's structure
// and template (tool-template-3) exactly, per the established pattern.
//
// Indiana levies a flat 2.95% state income tax, with no separate standard
// deduction — instead, a $1,000-per-exemption personal exemption (self,
// spouse if filing jointly, and each dependent) is subtracted, PLUS an
// extra $1,500 additional exemption for each dependent (so each dependent
// is worth $2,500 total). Sourced from the NFC's official 2026 Indiana
// state withholding bulletin. Note: Indiana counties also levy their own
// local income tax on top of the state rate — not modeled here, since it
// varies by county and is out of scope for a single statewide calculator
// (documented in the Assumptions section). Because the exemption count
// depends on dependents, this tool keeps the "Number of Dependents" input
// field.
//
// The actual math lives in code, not the database: see
// `customCalculators["indiana-tax-calculator"]` in `src/lib/calc-engine.ts`.
// This script only wires up the Tool row so the public page has a title,
// input form, and content around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-indiana-tax-tool.ts
// or
//   npm run db:create-indiana-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "indiana-tax-calculator";

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
    { key: "stateIncomeTax", label: "Indiana State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for an Indiana income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Indiana, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and Indiana's flat state income tax from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, select your federal filing status, and enter how " +
    "many dependents you claim. Add any pre-tax deductions (like 401(k) contributions or health insurance " +
    "premiums), post-tax deductions, and extra federal withholding if they apply to you — otherwise leave " +
    "them at $0. Click Calculate to see a full breakdown: gross pay, federal income tax, Social Security tax, " +
    "Medicare tax, Indiana state income tax, total deductions, and your estimated take-home pay, both per " +
    "paycheck and for the year.\n\n" +
    "Indiana taxes income at a single flat rate of 2.95% — one of the lowest state income tax rates in the " +
    "country. Instead of a standard deduction, Indiana subtracts a $1,000 personal exemption for yourself, " +
    "another if you're filing jointly, and $1,000 plus an extra $1,500 for each dependent, before applying " +
    "the flat rate.\n\n" +
    "Income taxes are calculated in four steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Indiana's exemptions are subtracted from that to get Indiana taxable income, " +
    "the flat 2.95% rate is applied to that, and federal income tax plus Social Security and Medicare are " +
    "calculated separately alongside it. This calculator is reviewed and updated whenever the IRS or the " +
    "Indiana Department of Revenue publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the Indiana Department of Revenue's published flat 2.95% rate and exemption amounts for its " +
    "state figures. It doesn't account for tax credits, itemized deductions, or every possible W-4/WH-4 " +
    "election, so treat it as a close estimate rather than an exact paycheck figure — your actual paycheck may " +
    "vary slightly depending on your employer's payroll system.\n\n" +
    "Indiana counties also levy their own local income tax on top of the state's 2.95% rate — the rate varies " +
    "by county (roughly 0.5% to 3%), so it isn't included in this statewide calculator; your actual take-home " +
    "pay will be somewhat lower once your county's local tax is factored in.\n\n" +
    "Each dependent is worth $2,500 in this calculator ($1,000 personal exemption plus $1,500 additional " +
    "dependent exemption), while you and your spouse (if filing jointly) are each worth $1,000.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Indiana state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Indiana " +
    "Department of Revenue.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), " +
    "with no pre-tax or post-tax deductions, takes home approximately $2,284.98 per paycheck — about " +
    "$59,409.50 for the year — after federal income tax, Social Security, Medicare, and Indiana state income " +
    "tax (not including any county tax).\n\n" +
    "Because Indiana's state rate is one of the lowest in the country at just 2.95%, and each dependent shaves " +
    "$2,500 off Indiana taxable income, Indiana's state-level withholding tends to be modest compared to most " +
    "other states — though the county tax that most Indiana residents also pay isn't reflected in this " +
    "figure.";

  const faq = [
    { question: "Does Indiana have a state income tax?", answer: "Yes, but a simple one: Indiana taxes all income at a single flat rate of 2.95%, one of the lowest state rates in the country, plus a local county income tax that varies by where you live." },
    { question: "What is Indiana's income tax rate?", answer: "A flat 2.95% state rate for 2026, for every filing status. Indiana counties also levy their own local income tax on top of this, typically ranging from about 0.5% to 3% depending on the county." },
    { question: "Does Indiana have a standard deduction?", answer: "No. Instead, Indiana subtracts a $1,000 personal exemption per person (yourself, your spouse if filing jointly) and $2,500 per dependent ($1,000 plus a $1,500 additional dependent exemption), before applying the flat rate." },
    { question: "Does this calculator include Indiana's county income tax?", answer: "No — county rates vary across Indiana's 92 counties, so this calculator covers the statewide 2.95% rate only. Your actual Indiana paycheck will have additional local tax withheld based on your county." },
    { question: "What taxes are actually taken out of an Indiana paycheck?", answer: "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus an extra 0.9% on higher wages), Indiana's flat 2.95% state income tax, and a county income tax that varies by where you live." },
    { question: "Is this a payroll tax calculator too, not just income tax?", answer: "Yes — this calculator includes federal income tax, Social Security, Medicare, and Indiana state income tax, all in the same breakdown." },
    { question: "How accurate is this calculator?", answer: "It's an estimate, using 2026 IRS federal tax brackets plus Indiana's published flat rate and exemption amounts. It doesn't include county income tax, every possible credit, or every W-4/WH-4 adjustment, so your actual withholding may differ." },
    { question: "How do pre-tax deductions affect my paycheck?", answer: "Pre-tax deductions (like traditional 401(k) contributions or health insurance premiums) are subtracted from your wages before federal income tax, FICA, and Indiana state income tax are all calculated, which lowers your total tax." },
  ];

  const toolContent = {
    title: "Indiana Income Tax Calculator",
    description:
      "This Indiana income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Indiana, an " +
      "Indiana payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax calculator " +
      "for any pay frequency and number of dependents.",
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
    metaTitle: "Indiana Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Indiana income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll " +
      "tax (FICA), Indiana's flat 2.95% state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Indiana's row in " +
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
