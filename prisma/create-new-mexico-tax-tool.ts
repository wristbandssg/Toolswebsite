// One-time (but safe to re-run) setup script: creates the New Mexico Income
// Tax Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category (created by create-nevada-paycheck-tool.ts, or here if that
// hasn't run yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Like Alabama, New Mexico DOES levy a state income tax, so this tool's
// breakdown actually shows a non-zero New Mexico State Income Tax line. The
// math lives in code, not the database: see
// `customCalculators["new-mexico-tax-calculator"]` in
// `src/lib/calc-engine.ts` for the federal income tax (2026 IRS brackets +
// standard deduction), FICA (Social Security + Medicare), and New Mexico
// state income tax (1.5%–5.9% brackets, federal-matching standard
// deduction — figures sourced from the Tax Foundation's 2026 state
// comparison table) calculation. This script only wires up the Tool row so
// the public page has a title, input form, and content around that
// calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-new-mexico-tax-tool.ts
// or
//   npm run db:create-new-mexico-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "new-mexico-tax-calculator";

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
    { key: "stateIncomeTax", label: "New Mexico State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a New Mexico income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for New Mexico, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and New Mexico's state income tax from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and " +
    "extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a " +
    "full breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, New Mexico state " +
    "income tax, total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "New Mexico taxes income across six brackets ranging from 1.5% up to 5.9%, applied to your taxable income " +
    "after subtracting a standard deduction. For Single filers, the brackets run $0–5,500 (1.5%), " +
    "$5,500–16,500 (3.2%), $16,500–33,500 (4.3%), $33,500–66,500 (4.7%), $66,500–210,000 (4.9%), and above " +
    "$210,000 (5.9%); Married Filing Jointly filers see roughly similar thresholds through the middle " +
    "brackets, widening out at the top.\n\n" +
    "Income taxes are calculated in a few steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, New Mexico's standard deduction (which matches the federal standard " +
    "deduction amount) is subtracted from that to get New Mexico taxable income, New Mexico's 1.5%–5.9% " +
    "bracket rates are applied to the result, and federal income tax plus Social Security and Medicare are " +
    "calculated separately alongside it. This calculator is reviewed and updated whenever the IRS or the New " +
    "Mexico Taxation and Revenue Department publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and New Mexico's published 2026 bracket schedule and standard deduction for its state figures. " +
    "It doesn't account for tax credits, itemized deductions, or every possible W-4 election, so treat it as " +
    "a close estimate rather than an exact paycheck figure — your actual paycheck may vary slightly depending " +
    "on your employer's payroll system.\n\n" +
    "New Mexico's standard deduction matches the federal amount exactly: $16,100 for Single and Married " +
    "Filing Separately filers, $32,200 for Married Filing Jointly filers, and $24,150 for Head of Household " +
    "filers, for 2026.\n\n" +
    "Married Filing Separately is modeled as exactly half of the Married Filing Jointly bracket thresholds, " +
    "and Head of Household uses the Single filer's bracket schedule — both are documented simplifications " +
    "rather than New Mexico's exact published schedules for those statuses.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND New Mexico state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the New Mexico " +
    "Taxation and Revenue Department.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), " +
    "with no pre-tax or post-tax deductions, takes home approximately $2,278.20 per paycheck — about " +
    "$59,233.20 for the year — after federal income tax, Social Security, Medicare, and New Mexico state " +
    "income tax.\n\n" +
    "Because New Mexico's standard deduction matches the federal amount and its six brackets spread income " +
    "gradually from 1.5% up to 5.9%, New Mexico's overall tax burden lands in a moderate middle range " +
    "compared to many other states — noticeably lower than high-tax states but with more brackets (and a " +
    "gentler climb) than states that jump straight from 0% to a flat rate.";

  const faq = [
    {
      question: "Does New Mexico have a state income tax?",
      answer:
        "Yes. New Mexico taxes income across six brackets ranging from 1.5% at the lowest bracket up to 5.9% " +
        "at the highest, applied after your standard deduction is subtracted.",
    },
    {
      question: "What are the New Mexico income tax brackets?",
      answer:
        "For Single filers: 1.5% on the first $5,500 of taxable income, 3.2% from $5,500–$16,500, 4.3% from " +
        "$16,500–$33,500, 4.7% from $33,500–$66,500, 4.9% from $66,500–$210,000, and 5.9% above $210,000. For " +
        "Married Filing Jointly, the thresholds are: 1.5% to $8,000, 3.2% to $25,000, 4.3% to $50,000, 4.7% to " +
        "$100,000, 4.9% to $315,000, and 5.9% above that.",
    },
    {
      question: "What is New Mexico's standard deduction?",
      answer:
        "It matches the federal standard deduction exactly: $16,100 for Single and Married Filing Separately " +
        "filers, $32,200 for Married Filing Jointly filers, and $24,150 for Head of Household filers, for 2026.",
    },
    {
      question: "Does New Mexico have a personal or dependent exemption?",
      answer:
        "This calculator doesn't model a separate New Mexico personal or dependent exemption on top of the " +
        "standard deduction — New Mexico's state income tax is calculated from taxable income after the " +
        "standard deduction, using the bracket schedule above.",
    },
    {
      question: "What taxes are actually taken out of a New Mexico paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and New Mexico state " +
        "income tax (1.5%–5.9% brackets after your standard deduction).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, Medicare, and New Mexico " +
        "state income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in New Mexico?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, New " +
        "Mexico state income tax, and any deductions you enter. A single filer earning $75,000 a year, paid " +
        "biweekly with no deductions, takes home approximately $2,278.20 per paycheck.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus New " +
        "Mexico's published 2026 bracket schedule and standard deduction. It approximates the Married Filing " +
        "Separately and Head of Household bracket schedules rather than reproducing New Mexico's exact " +
        "published figures for those statuses, and doesn't include tax credits, itemized deductions, or every " +
        "W-4 adjustment — so your actual withholding may differ slightly.",
    },
  ];

  const toolContent = {
    title: "New Mexico Income Tax Calculator",
    description:
      "This New Mexico income tax calculator and paycheck tax calculator shows you, in one place, exactly " +
      "what's withheld from your paycheck and what you take home. Use it as a general tax calculator for New " +
      "Mexico, a New Mexico payroll tax calculator for federal withholding, FICA, and state tax, or a salary " +
      "tax calculator for any pay frequency.",
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
    metaTitle: "New Mexico Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free New Mexico income tax calculator and paycheck tax calculator. Estimate federal income tax, " +
      "payroll tax (FICA), New Mexico state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to New Mexico's row in " +
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
