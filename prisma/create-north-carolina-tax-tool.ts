// One-time (but safe to re-run) setup script: creates the North Carolina
// Income Tax Calculator Tool inside the existing "Tax & Paycheck
// Calculators" category (created by create-nevada-paycheck-tool.ts, or here
// if that hasn't run yet) — input fields, the multi-line breakdown result
// config, instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Like Alabama, North Carolina DOES levy a state income tax, so this tool's
// breakdown actually shows a non-zero North Carolina State Income Tax line.
// The math lives in code, not the database: see
// `customCalculators["north-carolina-tax-calculator"]` in
// `src/lib/calc-engine.ts` for the federal income tax (2026 IRS brackets +
// standard deduction), FICA (Social Security + Medicare), and North
// Carolina state income tax (flat 3.99% rate, statutory 2025/2026 standard
// deduction figures — sourced from the North Carolina Department of
// Revenue) calculation. This script only wires up the Tool row so the
// public page has a title, input form, and content around that
// calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-north-carolina-tax-tool.ts
// or
//   npm run db:create-north-carolina-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "north-carolina-tax-calculator";

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
    { key: "stateIncomeTax", label: "North Carolina State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a North Carolina income tax calculator, a paycheck tax calculator, a payroll " +
    "tax calculator, or just a general tax calculator for North Carolina, this tool covers it: it works out " +
    "federal income tax, Social Security, Medicare, and North Carolina's state income tax from your salary, " +
    "all in one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and " +
    "extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a " +
    "full breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, North Carolina state " +
    "income tax, total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "North Carolina keeps things simple with a single flat rate: 3.99% on all taxable income, regardless of " +
    "how much you earn, after subtracting a standard deduction that's set by statute. Unlike most states, " +
    "North Carolina's standard deduction amounts are fixed by law for both the 2025 and 2026 tax years " +
    "rather than being adjusted for inflation every year.\n\n" +
    "Income taxes are calculated in a few steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, North Carolina's statutory standard deduction is subtracted from that to get " +
    "North Carolina taxable income, the flat 3.99% rate is applied to the result, and federal income tax plus " +
    "Social Security and Medicare are calculated separately alongside it. This calculator is reviewed and " +
    "updated whenever the IRS or the North Carolina Department of Revenue publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and North Carolina's published 2025/2026 flat rate and standard deduction for its state " +
    "figures. It doesn't account for tax credits, itemized deductions, or every possible W-4/NC-4 election, " +
    "so treat it as a close estimate rather than an exact paycheck figure — your actual paycheck may vary " +
    "slightly depending on your employer's payroll system.\n\n" +
    "North Carolina's standard deduction is fixed by statute at $12,750 for Single filers, $25,500 for " +
    "Married Filing Jointly filers, $12,750 for Married Filing Separately filers, and $19,125 for Head of " +
    "Household filers — for both the 2025 and 2026 tax years, unlike most states where the standard " +
    "deduction is adjusted for inflation annually.\n\n" +
    "NOT modeled: North Carolina reduces a Married Filing Separately spouse's standard deduction to $0 if the " +
    "other spouse itemizes deductions instead of taking the standard deduction — a real but uncommon edge " +
    "case that this calculator doesn't account for.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND North Carolina state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the North " +
    "Carolina Department of Revenue.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), " +
    "with no pre-tax or post-tax deductions, takes home approximately $2,273.41 per paycheck — about " +
    "$59,108.72 for the year — after federal income tax, Social Security, Medicare, and North Carolina state " +
    "income tax.\n\n" +
    "Because North Carolina uses a single flat 3.99% rate rather than graduated brackets, the math is " +
    "refreshingly simple: once you subtract the standard deduction, every remaining dollar of North Carolina " +
    "taxable income is taxed at the exact same rate, whether you earn $40,000 or $400,000 a year.";

  const faq = [
    {
      question: "Does North Carolina have a state income tax?",
      answer:
        "Yes. North Carolina taxes income at a single flat rate of 3.99%, applied to all taxable income after " +
        "your standard deduction is subtracted — there are no graduated brackets.",
    },
    {
      question: "What are the North Carolina income tax brackets?",
      answer:
        "North Carolina doesn't have brackets — it uses one flat rate, 3.99%, that applies to all taxable " +
        "income for every filer, regardless of income level or filing status.",
    },
    {
      question: "What is North Carolina's standard deduction?",
      answer:
        "$12,750 for Single filers, $25,500 for Married Filing Jointly filers, $12,750 for Married Filing " +
        "Separately filers, and $19,125 for Head of Household filers. These amounts are fixed by statute for " +
        "both 2025 and 2026, not adjusted for inflation annually like most states.",
    },
    {
      question: "Why doesn't North Carolina's standard deduction change every year like other states?",
      answer:
        "North Carolina sets its standard deduction amounts directly in state law rather than tying them to " +
        "an inflation formula, so the same figures apply for both the 2025 and 2026 tax years until the " +
        "legislature changes them again.",
    },
    {
      question: "What taxes are actually taken out of a North Carolina paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and North Carolina " +
        "state income tax (a flat 3.99% after your standard deduction).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, " +
        "and this calculator includes all of it: federal income tax, Social Security, Medicare, and North " +
        "Carolina state income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in North Carolina?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, North " +
        "Carolina state income tax, and any deductions you enter. A single filer earning $75,000 a year, paid " +
        "biweekly with no deductions, takes home approximately $2,273.41 per paycheck.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus North " +
        "Carolina's statutory flat rate and standard deduction figures for 2025/2026. It doesn't model the " +
        "Married Filing Separately standard-deduction reduction that applies when the other spouse itemizes, " +
        "and doesn't include tax credits, itemized deductions, or every W-4/NC-4 adjustment — so your actual " +
        "withholding may differ slightly.",
    },
  ];

  const toolContent = {
    title: "North Carolina Income Tax Calculator",
    description:
      "This North Carolina income tax calculator and paycheck tax calculator shows you, in one place, " +
      "exactly what's withheld from your paycheck and what you take home. Use it as a general tax calculator " +
      "for North Carolina, a North Carolina payroll tax calculator for federal withholding, FICA, and state " +
      "tax, or a salary tax calculator for any pay frequency.",
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
    metaTitle: "North Carolina Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free North Carolina income tax calculator and paycheck tax calculator. Estimate federal income tax, " +
      "payroll tax (FICA), North Carolina state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to North Carolina's row in " +
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
