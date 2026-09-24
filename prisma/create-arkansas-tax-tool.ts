// One-time (but safe to re-run) setup script: creates the Arkansas Income
// Tax Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts / create-alabama-tax-tool.ts's structure
// and template (tool-template-3) exactly, per the established pattern.
//
// Arkansas DOES levy a state income tax: a graduated 5-bracket schedule
// (0% / 2% / 3% / 3.4% / 3.9%) on income after a flat standard deduction,
// then a small per-exemption personal tax credit subtracted from the
// computed tax itself (not from income) — closer in shape to Alabama's
// bracket-plus-exemption model than to Arizona's single flat rate, so this
// tool keeps Alabama's "Number of Dependents" input field. Figures sourced
// from the Arkansas Department of Finance and Administration's 2026
// withholding tax tables (dfa.arkansas.gov) and cross-checked against a
// 2026 payroll-tax-table vendor's published breakdown. See the extended
// comment above `arkansasTaxCalculator` in src/lib/calc-engine.ts for the
// exact figures and the one documented simplification (this calculator
// always uses the standard graduated schedule; Arkansas itself swaps to a
// second, simplified table above $94,700 of net income to avoid a
// bracket-edge cliff, which this tool approximates rather than models
// exactly — the same estimate-grade spirit as Alabama's standard-deduction
// interpolation).
//
// The actual math lives in code, not the database: see
// `customCalculators["arkansas-tax-calculator"]` in
// `src/lib/calc-engine.ts`. This script only wires up the Tool row so the
// public page has a title, input form, and content around that
// calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-arkansas-tax-tool.ts
// or
//   npm run db:create-arkansas-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "arkansas-tax-calculator";

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
    { key: "stateIncomeTax", label: "Arkansas State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for an Arkansas income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Arkansas, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and Arkansas's state income tax from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, select your federal filing status, and enter how " +
    "many dependents you claim. Add any pre-tax deductions (like 401(k) contributions or health insurance " +
    "premiums), post-tax deductions, and extra federal withholding if they apply to you — otherwise leave them " +
    "at $0. Click Calculate to see a full breakdown: gross pay, federal income tax, Social Security tax, " +
    "Medicare tax, Arkansas state income tax, total deductions, and your estimated take-home pay, both per " +
    "paycheck and for the year.\n\n" +
    "Arkansas taxes income through five brackets — 0%, 2%, 3%, 3.4%, and 3.9% — after subtracting a standard " +
    "deduction, then subtracts a small personal tax credit ($29 for you, another $29 if you're filing jointly, " +
    "and $29 per dependent) directly from that computed tax.\n\n" +
    "Income taxes are calculated in five steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Arkansas's standard deduction is subtracted from that to get Arkansas taxable " +
    "income, the 0%/2%/3%/3.4%/3.9% bracket rates are applied to that, the $29-per-exemption personal tax " +
    "credit is subtracted from the result, and federal income tax plus Social Security and Medicare are " +
    "calculated separately alongside it. This calculator is reviewed and updated whenever the IRS or the " +
    "Arkansas Department of Finance and Administration publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the Arkansas Department of Finance and Administration's published 2026 brackets, standard " +
    "deduction, and personal tax credit for its state figures. It doesn't account for tax credits beyond the " +
    "personal exemption credit, itemized deductions, or every possible W-4/AR4EC election, so treat it as a " +
    "close estimate rather than an exact paycheck figure — your actual paycheck may vary slightly depending on " +
    "your employer's payroll system.\n\n" +
    "Arkansas applies a second, simplified rate table to net income above $94,700 to avoid a sharp jump at that " +
    "threshold — this calculator applies its standard graduated 0%/2%/3%/3.4%/3.9% schedule at every income " +
    "level instead of modeling that swap, which is accurate for the large majority of filers and only diverges " +
    "slightly for higher earners. It also doesn't model Arkansas's separate low-income tax table credit, which " +
    "applies only at very low incomes.\n\n" +
    "The Arkansas personal tax credit ($29 per exemption) is applied for you, for your spouse if you select " +
    "Married Filing Jointly, and for each dependent you enter — Married Filing Separately is treated as one " +
    "exemption (your own), same as Single and Head of Household.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Arkansas state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Arkansas " +
    "Department of Finance and Administration.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), " +
    "with no pre-tax or post-tax deductions, takes home approximately $2,277.42 per paycheck — about " +
    "$59,212.83 for the year — after federal income tax, Social Security, Medicare, and Arkansas state income " +
    "tax.\n\n" +
    "Because Arkansas's brackets top out at a modest $26,400 of taxable income, most Arkansas filers with a " +
    "typical full-time salary end up paying close to the full 3.9% top rate on the bulk of their income, offset " +
    "only slightly by the small $29-per-exemption personal tax credit.";

  const faq = [
    {
      question: "Does Arkansas have a state income tax?",
      answer:
        "Yes. Arkansas taxes income through five brackets — 0%, 2%, 3%, 3.4%, and 3.9% — with the top rate " +
        "starting at just $26,400 of taxable income, so most filers with a typical salary pay close to that top " +
        "rate on most of their earnings.",
    },
    {
      question: "What are the Arkansas income tax brackets?",
      answer:
        "0% on the first $5,600 of taxable income, 2% on the next $5,600 (up to $11,200), 3% on the next $4,800 " +
        "(up to $16,000), 3.4% on the next $10,400 (up to $26,400), and 3.9% on everything above $26,400. These " +
        "thresholds are the same regardless of filing status.",
    },
    {
      question: "What is Arkansas's standard deduction?",
      answer:
        "$2,470 per person for 2026 — so $2,470 for Single, Married Filing Separately, and Head of Household " +
        "filers, and $4,940 (two people's worth) for Married Filing Jointly.",
    },
    {
      question: "What is the Arkansas personal tax credit?",
      answer:
        "$29 per exemption, subtracted directly from your computed Arkansas tax (not from your taxable income) " +
        "— one exemption for yourself, another if you're filing jointly with a spouse, and one more for each " +
        "dependent you claim.",
    },
    {
      question: "What taxes are actually taken out of an Arkansas paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and Arkansas state " +
        "income tax (0%–3.9% brackets, after the standard deduction and personal tax credit).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, Medicare, and Arkansas state " +
        "income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in Arkansas?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Arkansas " +
        "state income tax, and any deductions you enter. Because Arkansas's top bracket starts at a relatively " +
        "low income level, most filers see close to the full 3.9% state rate applied to the majority of their " +
        "earnings.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus Arkansas's " +
        "published 2026 brackets, standard deduction, and personal tax credit. It applies Arkansas's standard " +
        "graduated schedule at every income level rather than modeling the state's separate simplified table " +
        "for net income above $94,700, and doesn't include every possible credit or W-4/AR4EC adjustment — so " +
        "your actual withholding may differ slightly, especially at higher incomes.",
    },
    {
      question: "How do pre-tax deductions affect my paycheck?",
      answer:
        "Pre-tax deductions (like traditional 401(k) contributions or health insurance premiums) are subtracted " +
        "from your wages before federal income tax, FICA, and Arkansas state income tax are all calculated, " +
        "which lowers your total tax — so your take-home pay drops by less than the full deduction amount.",
    },
  ];

  const toolContent = {
    title: "Arkansas Income Tax Calculator",
    description:
      "This Arkansas income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Arkansas, an " +
      "Arkansas payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax calculator " +
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
    metaTitle: "Arkansas Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Arkansas income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll " +
      "tax (FICA), Arkansas state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Arkansas's row in " +
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
