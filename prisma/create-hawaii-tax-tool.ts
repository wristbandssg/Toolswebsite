// One-time (but safe to re-run) setup script: creates the Hawaii Income Tax
// Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts / create-arizona-tax-tool.ts's structure
// and template (tool-template-3) exactly, per the established pattern.
//
// Hawaii levies the widest bracket schedule of any state tool in this
// project: 12 brackets from 1.4% up to 11%, after a flat standard
// deduction. Figures sourced from a 2026 bracket aggregator (exact
// Single/Married Filing Jointly thresholds) and Hawaii's own 2024 tax
// reform legislation (HB2404 CD1, capitol.hawaii.gov) for the standard
// deduction amounts effective for 2026. See the extended comment above
// `hawaiiTaxCalculator` in src/lib/calc-engine.ts for the exact figures and
// documented simplifications (Married Filing Separately derived as half of
// Married Filing Jointly; Head of Household approximated with the Single
// schedule; Hawaii's separate personal exemption not modeled). No
// dependents field is needed for the same reason.
//
// The actual math lives in code, not the database: see
// `customCalculators["hawaii-tax-calculator"]` in `src/lib/calc-engine.ts`.
// This script only wires up the Tool row so the public page has a title,
// input form, and content around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-hawaii-tax-tool.ts
// or
//   npm run db:create-hawaii-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "hawaii-tax-calculator";

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
    { key: "stateIncomeTax", label: "Hawaii State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Hawaii income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Hawaii, this tool covers it: it works out federal income " +
    "tax, Social Security, Medicare, and Hawaii's state income tax from your salary, all in one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and " +
    "extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a " +
    "full breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Hawaii state income " +
    "tax, total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "Hawaii taxes income through twelve brackets — the widest bracket schedule of any state — ranging from " +
    "1.4% up to 11%, after subtracting a standard deduction that Hawaii significantly increased as part of its " +
    "2024 tax reform.\n\n" +
    "Income taxes are calculated in four steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Hawaii's standard deduction is subtracted from that to get Hawaii taxable " +
    "income, the 1.4%–11% bracket rates are applied to that, and federal income tax plus Social Security and " +
    "Medicare are calculated separately alongside it. This calculator is reviewed and updated whenever the IRS " +
    "or the Hawaii Department of Taxation publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and Hawaii's published 2026 brackets and standard deduction (from Hawaii's 2024 tax reform " +
    "legislation) for its state figures. It doesn't account for tax credits, itemized deductions, or every " +
    "possible W-4/HW-4 election, so treat it as a close estimate rather than an exact paycheck figure — your " +
    "actual paycheck may vary slightly depending on your employer's payroll system.\n\n" +
    "This calculator's bracket schedule is sourced exactly for Single and Married Filing Jointly. Married " +
    "Filing Separately is derived as exactly half of the Married Filing Jointly thresholds, and Head of " +
    "Household is approximated using the Single bracket schedule rather than its own exact thresholds.\n\n" +
    "Hawaii's pre-2024-reform system also included a separate personal exemption on top of the standard " +
    "deduction; this calculator doesn't model that, since the 2024 reform substantially restructured Hawaii's " +
    "deduction system around the larger standard deduction figures used here.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Hawaii state income tax alike — some deduction " +
    "types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Hawaii " +
    "Department of Taxation.";

  const examples =
    "Example: a single filer earning $75,000 a year, paid biweekly (26 paychecks/year), with no pre-tax or " +
    "post-tax deductions, takes home approximately $2,215.74 per paycheck — about $57,609.30 for the year — " +
    "after federal income tax, Social Security, Medicare, and Hawaii state income tax.\n\n" +
    "Because Hawaii's brackets are narrow and numerous at the lower and middle end — climbing from 1.4% to " +
    "7.6% within the first $125,000 of Single taxable income alone — most Hawaii filers with a typical salary " +
    "move through several brackets rather than settling into just one or two.";

  const faq = [
    { question: "Does Hawaii have a state income tax?", answer: "Yes — Hawaii has one of the most detailed bracket structures in the country, with twelve brackets ranging from 1.4% up to 11%." },
    { question: "What are the Hawaii income tax brackets?", answer: "For Single filers: 1.4% up to $9,600, 3.2% up to $14,400, 5.5% up to $19,200, 6.4% up to $24,000, 6.8% up to $36,000, 7.2% up to $48,000, 7.6% up to $125,000, 7.9% up to $175,000, 8.25% up to $225,000, 9% up to $275,000, 10% up to $325,000, and 11% above that. Married Filing Jointly thresholds are roughly double." },
    { question: "What is Hawaii's standard deduction?", answer: "$8,000 for Single and Married Filing Separately filers, $16,000 for Married Filing Jointly, and $12,000 for Head of Household, for 2026 — significantly increased under Hawaii's 2024 tax reform." },
    { question: "What taxes are actually taken out of a Hawaii paycheck?", answer: "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus an extra 0.9% on higher wages), and Hawaii state income tax (1.4%–11% brackets)." },
    { question: "Is this a payroll tax calculator too, not just income tax?", answer: "Yes — this calculator includes federal income tax, Social Security, Medicare, and Hawaii state income tax, all in the same breakdown." },
    { question: "What is my after-tax (take-home) pay in Hawaii?", answer: "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Hawaii state income tax, and any deductions you enter." },
    { question: "How accurate is this calculator?", answer: "It's an estimate, using 2026 IRS federal tax brackets plus Hawaii's published 2026 brackets and standard deduction. It approximates Married Filing Separately and Head of Household from the sourced Single/Married Filing Jointly schedules and doesn't model Hawaii's older personal exemption, so your actual withholding may differ slightly." },
    { question: "How do pre-tax deductions affect my paycheck?", answer: "Pre-tax deductions (like traditional 401(k) contributions or health insurance premiums) are subtracted from your wages before federal income tax, FICA, and Hawaii state income tax are all calculated, which lowers your total tax." },
  ];

  const toolContent = {
    title: "Hawaii Income Tax Calculator",
    description:
      "This Hawaii income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Hawaii, a " +
      "Hawaii payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax calculator " +
      "for any pay frequency.",
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
    metaTitle: "Hawaii Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Hawaii income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll tax " +
      "(FICA), Hawaii state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Hawaii's row in " +
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
