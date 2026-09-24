// One-time (but safe to re-run) setup script: creates the Maine Income Tax
// Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts / create-alabama-tax-tool.ts's structure
// and template (tool-template-3) exactly, per the established pattern.
//
// Maine taxes income through a 3-bracket progressive schedule (5.8% /
// 6.75% / 7.15%), sourced exactly for Single, Married Filing Jointly, and
// Head of Household from Maine Revenue Services' 2026 rate schedule
// announcement; Married Filing Separately is derived as exactly half of
// MFJ's thresholds (Maine law sets it that way). PLUS a $5,300 personal
// exemption for the filer, one more if filing jointly, and one per
// dependent — so this tool keeps the "Number of Dependents" input field
// (like Alabama/Arkansas/California). Sourced from a Thomson Reuters
// summary of Maine Revenue Services' official 2026 announcement.
//
// The actual math lives in code, not the database: see
// `customCalculators["maine-tax-calculator"]` in `src/lib/calc-engine.ts`.
// This script only wires up the Tool row so the public page has a title,
// input form, and content around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-maine-tax-tool.ts
// or
//   npm run db:create-maine-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "maine-tax-calculator";

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
    { key: "stateIncomeTax", label: "Maine State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Maine income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Maine, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and Maine's state income tax from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, select your federal filing status, and enter " +
    "how many dependents you claim. Add any pre-tax deductions (like 401(k) contributions or health " +
    "insurance premiums), post-tax deductions, and extra federal withholding if they apply to you — " +
    "otherwise leave them at $0. Click Calculate to see a full breakdown: gross pay, federal income tax, " +
    "Social Security tax, Medicare tax, Maine state income tax, total deductions, and your estimated " +
    "take-home pay, both per paycheck and for the year.\n\n" +
    "Maine taxes income through three brackets — 5.8%, 6.75%, and 7.15% — after subtracting a standard " +
    "deduction and a $5,300 personal exemption for yourself, your spouse (if filing jointly), and each " +
    "dependent.\n\n" +
    "Income taxes are calculated in four steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Maine's standard deduction and personal exemptions are subtracted from that " +
    "to get Maine taxable income, the 5.8%/6.75%/7.15% brackets are applied to that, and federal income tax " +
    "plus Social Security and Medicare are calculated separately alongside it. This calculator is reviewed " +
    "and updated whenever the IRS or Maine Revenue Services publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and Maine Revenue Services' published 2026 rate schedule, standard deduction, and personal " +
    "exemption for its state figures. It doesn't account for tax credits, itemized deductions, or every " +
    "possible W-4/W-4ME election, so treat it as a close estimate rather than an exact paycheck figure — " +
    "your actual paycheck may vary slightly depending on your employer's payroll system.\n\n" +
    "Married Filing Separately brackets and standard deduction are calculated as exactly half of Married " +
    "Filing Jointly's amounts, per Maine law — the same approach used for federal Married Filing Separately " +
    "brackets in this calculator.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Maine state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or Maine Revenue " +
    "Services.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), " +
    "with no pre-tax or post-tax deductions, takes home approximately $2,237.72 per paycheck — about " +
    "$58,180.80 for the year — after federal income tax, Social Security, Medicare, and Maine state income " +
    "tax.\n\n" +
    "Because Maine's brackets climb from 5.8% to 7.15% fairly quickly, and its standard deduction and " +
    "personal exemption together shelter a meaningful amount of income first, each additional dependent " +
    "claimed noticeably lowers the taxable amount.";

  const faq = [
    { question: "Does Maine have a state income tax?", answer: "Yes — Maine taxes income through three brackets: 5.8%, 6.75%, and 7.15%, after subtracting a standard deduction and personal exemptions." },
    { question: "What is Maine's income tax rate?", answer: "5.8% up to $27,400 of taxable income (Single) or $54,850 (Married Filing Jointly), 6.75% on the next portion, and 7.15% above $64,850 (Single) or $129,750 (Married Filing Jointly)." },
    { question: "What is Maine's standard deduction?", answer: "$15,300 for Single and Married Filing Separately, $30,600 for Married Filing Jointly, and $22,950 for Head of Household, for 2026." },
    { question: "What is Maine's personal exemption?", answer: "$5,300 per exemption — one for yourself, one more if filing jointly, and one for each dependent you claim." },
    { question: "What taxes are actually taken out of a Maine paycheck?", answer: "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus an extra 0.9% on higher wages), and Maine's state income tax." },
    { question: "Is this a payroll tax calculator too, not just income tax?", answer: "Yes — this calculator includes federal income tax, Social Security, Medicare, and Maine state income tax, all in the same breakdown." },
    { question: "What is my after-tax (take-home) pay in Maine?", answer: "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Maine state income tax, and any deductions you enter." },
    { question: "How accurate is this calculator?", answer: "It's an estimate, using 2026 IRS federal tax brackets plus Maine's published rate schedule, standard deduction, and personal exemption. It doesn't include every possible credit or W-4/W-4ME adjustment, so your actual withholding may differ slightly." },
  ];

  const toolContent = {
    title: "Maine Income Tax Calculator",
    description:
      "This Maine income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Maine, a " +
      "Maine payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax calculator " +
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
    metaTitle: "Maine Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Maine income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll " +
      "tax (FICA), Maine state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Maine's row in " +
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
