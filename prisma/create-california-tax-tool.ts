// One-time (but safe to re-run) setup script: creates the California Income
// Tax Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts / create-alabama-tax-tool.ts's structure
// and template (tool-template-3) exactly, per the established pattern.
//
// California is the most involved state tool so far: a real 9-bracket
// progressive schedule (1%–13.3%, the top rate already including the 1%
// Mental Health Services Tax above $1,000,000) PLUS a separate, mandatory
// State Disability Insurance (SDI) payroll withholding — a real line on
// every California paycheck, distinct from income tax, so it gets its own
// breakdown line here rather than being folded into state income tax.
// Figures sourced from the EDD's 2026 SDI page (edd.ca.gov — flat 1.3%,
// no wage cap since 2024) and the NFC's official 2026 California
// withholding bulletin (standard deduction, personal exemption credit),
// cross-checked against a 2026 bracket aggregator for the exact bracket
// thresholds. See the extended comment above `californiaTaxCalculator` in
// src/lib/calc-engine.ts for the exact figures and the two documented
// simplifications (Married Filing Separately/Head of Household approximated
// with the Single bracket schedule; every exemption uses the smaller
// personal credit amount rather than California's separate, larger
// dependent credit).
//
// The actual math lives in code, not the database: see
// `customCalculators["california-tax-calculator"]` in
// `src/lib/calc-engine.ts`. This script only wires up the Tool row so the
// public page has a title, input form, and content around that
// calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-california-tax-tool.ts
// or
//   npm run db:create-california-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "california-tax-calculator";

// Instructions/Examples/Assumptions are rich-text (HTML) fields — see the
// matching helper/comment in create-nevada-paycheck-tool.ts.
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
    { key: "stateIncomeTax", label: "California State Income Tax", format: "currency" },
    { key: "stateDisabilityInsurance", label: "California SDI (State Disability Insurance)", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a California income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for California, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, California's state income tax, and California's State Disability " +
    "Insurance (SDI) withholding from your salary, all in one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, select your federal filing status, and enter how " +
    "many dependents you claim. Add any pre-tax deductions (like 401(k) contributions or health insurance " +
    "premiums), post-tax deductions, and extra federal withholding if they apply to you — otherwise leave them " +
    "at $0. Click Calculate to see a full breakdown: gross pay, federal income tax, Social Security tax, " +
    "Medicare tax, California state income tax, California SDI, total deductions, and your estimated take-home " +
    "pay, both per paycheck and for the year.\n\n" +
    "California taxes income through nine brackets ranging from 1% up to 13.3% (the top rate already includes " +
    "an extra 1% Mental Health Services Tax on taxable income over $1,000,000), after subtracting a standard " +
    "deduction and a small personal exemption credit. On top of that, California is one of the few states that " +
    "withholds a separate State Disability Insurance (SDI) tax from every paycheck — currently a flat 1.3% of " +
    "wages, with no wage cap.\n\n" +
    "Income taxes are calculated in five steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, California's standard deduction is subtracted from that to get California " +
    "taxable income, the 1%–13.3% bracket rates are applied to that, a $168.30-per-exemption personal credit " +
    "is subtracted from the result, and SDI (1.3% of the same wage base) plus federal income tax, Social " +
    "Security, and Medicare are calculated separately alongside it. This calculator is reviewed and updated " +
    "whenever the IRS, the California Franchise Tax Board, or the EDD publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the California Franchise Tax Board's published 2026 brackets, standard deduction, and " +
    "personal exemption credit, plus the EDD's published 2026 SDI rate, for its state figures. It doesn't " +
    "account for tax credits beyond the personal exemption credit, itemized deductions, or every possible " +
    "W-4/DE-4 election, so treat it as a close estimate rather than an exact paycheck figure — your actual " +
    "paycheck may vary slightly depending on your employer's payroll system.\n\n" +
    "This calculator's bracket schedule is sourced exactly for Single and Married Filing Jointly. Married " +
    "Filing Separately and Head of Household are approximated using the Single bracket schedule rather than " +
    "their own exact thresholds — a close estimate, not exact to the dollar.\n\n" +
    "Every exemption (yourself, your spouse if filing jointly, and each dependent) uses California's smaller " +
    "$168.30 personal exemption credit in this calculator. California actually provides a separate, larger " +
    "credit specifically for dependents, which isn't modeled here.\n\n" +
    "California SDI is applied to the same wage base as federal income tax, FICA, and state income tax in this " +
    "calculator — reduced by any pre-tax deductions you enter, consistent with how this calculator treats " +
    "pre-tax deductions across the board.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional, the California " +
    "Franchise Tax Board, or the EDD.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), " +
    "with no pre-tax or post-tax deductions, takes home approximately $2,225.32 per paycheck — about " +
    "$57,858.23 for the year — after federal income tax, Social Security, Medicare, California state income " +
    "tax ($106.13/paycheck), and California SDI ($37.50/paycheck).\n\n" +
    "Because California's brackets are unusually wide at lower and middle incomes but climb steeply at higher " +
    "ones, and SDI applies to every dollar of wages with no cap, California's combined state withholding " +
    "(income tax plus SDI) tends to be noticeably higher than most other states for high earners, even though " +
    "it starts out relatively modest for lower incomes.";

  const faq = [
    {
      question: "Does California have a state income tax?",
      answer:
        "Yes — California has one of the highest top state income tax rates in the country, with nine brackets " +
        "ranging from 1% up to 13.3% (the top rate includes an extra 1% Mental Health Services Tax on taxable " +
        "income over $1,000,000).",
    },
    {
      question: "What is California SDI (State Disability Insurance)?",
      answer:
        "A separate payroll tax, distinct from income tax, that funds California's short-term disability and " +
        "paid family leave programs. It's a flat 1.3% of your wages in 2026, and — unlike Social Security — " +
        "there's no wage cap, so it applies to every dollar you earn.",
    },
    {
      question: "What are the California income tax brackets?",
      answer:
        "For Single filers: 1% up to $11,079, 2% up to $26,264, 4% up to $41,452, 6% up to $57,542, 8% up to " +
        "$72,724, 9.3% up to $371,479, 10.3% up to $445,771, 11.3% up to $742,953, 12.3% up to $1,000,000, and " +
        "13.3% above that (including the Mental Health Services Tax). Married Filing Jointly thresholds are " +
        "roughly double.",
    },
    {
      question: "What is California's standard deduction?",
      answer:
        "$5,706 for Single and Married Filing Separately filers, and $11,412 for Married Filing Jointly and " +
        "Head of Household filers, for 2026.",
    },
    {
      question: "What taxes are actually taken out of a California paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on higher wages), California state income tax (1%–13.3% brackets), and California SDI " +
        "(1.3% of all wages, no cap).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — this calculator includes federal income tax, Social Security, Medicare, California state income " +
        "tax, and California SDI, all in the same breakdown, so it covers everything typically withheld from a " +
        "California paycheck.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets, California's published 2026 brackets and " +
        "standard deduction, and the EDD's published 2026 SDI rate. It approximates Married Filing Separately " +
        "and Head of Household using the Single bracket schedule and uses a single personal exemption credit " +
        "amount for every exemption rather than California's separate, larger dependent credit — so your " +
        "actual withholding may differ slightly.",
    },
    {
      question: "How do pre-tax deductions affect my paycheck?",
      answer:
        "Pre-tax deductions (like traditional 401(k) contributions or health insurance premiums) are subtracted " +
        "from your wages before federal income tax, FICA, California state income tax, and California SDI are " +
        "all calculated, which lowers your total tax — so your take-home pay drops by less than the full " +
        "deduction amount.",
    },
  ];

  const toolContent = {
    title: "California Income Tax Calculator",
    description:
      "This California income tax calculator and paycheck tax calculator shows you, in one place, exactly " +
      "what's withheld from your paycheck and what you take home. Use it as a general tax calculator for " +
      "California, a California payroll tax calculator for federal withholding, FICA, state tax, and SDI, or a " +
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
    metaTitle: "California Income Tax Calculator (2026) — Paycheck, Payroll Tax & SDI",
    metaDescription:
      "Free California income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll " +
      "tax (FICA), California state income tax, SDI, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to California's row in " +
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
