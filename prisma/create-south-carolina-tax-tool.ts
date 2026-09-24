// One-time (but safe to re-run) setup script: creates the South Carolina
// Income Tax Calculator Tool inside the existing "Tax & Paycheck
// Calculators" category (created by create-nevada-paycheck-tool.ts, or here
// if that hasn't run yet) — input fields, the multi-line breakdown result
// config, instructions/examples/FAQ, and SEO meta. Mirrors
// create-alabama-tax-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Like Alabama, South Carolina DOES levy a state income tax, so this tool's
// breakdown actually shows a non-zero South Carolina State Income Tax
// line. South Carolina is a special case this round: it just overhauled
// its income tax for the 2026 tax year under H.4216 (Act 110), replacing
// its old six-bracket system (which topped out at 6.4%) with a simple
// two-bracket 1.99%/5.21% schedule and a brand-new South Carolina-only
// standard deduction (the SCIAD). The math lives in code, not the
// database: see `customCalculators["south-carolina-tax-calculator"]` in
// `src/lib/calc-engine.ts` for the federal income tax (2026 IRS brackets +
// standard deduction), FICA (Social Security + Medicare), and South
// Carolina state income tax (1.99%/5.21% brackets plus the SCIAD —
// figures sourced from the South Carolina Department of Revenue's own
// H.4216 explainer page) calculation. This script only wires up the Tool
// row so the public page has a title, input form, and content around that
// calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-south-carolina-tax-tool.ts
// or
//   npm run db:create-south-carolina-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "south-carolina-tax-calculator";

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
    { key: "stateIncomeTax", label: "South Carolina State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a South Carolina income tax calculator, a paycheck tax calculator, a payroll " +
    "tax calculator, or just a general tax calculator for South Carolina, this tool covers it: it works out " +
    "federal income tax, Social Security, Medicare, and South Carolina's state income tax from your salary, all " +
    "in one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, select your federal filing status, and add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and extra " +
    "federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a full " +
    "breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, South Carolina state income " +
    "tax, total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "South Carolina overhauled its income tax for 2026 under H.4216 (Act 110), replacing its old six-bracket " +
    "system — which topped out at 6.4% — with a simple two-bracket schedule: 1.99% on taxable income under " +
    "$30,000, and 5.21% above it, with the same $30,000 threshold for every filing status. The law also " +
    "replaced the state's old federal-conformity standard deduction with a brand-new South Carolina-only " +
    "deduction (the SCIAD, or South Carolina Income Adjustment Deduction), which does vary by filing status.\n\n" +
    "Income taxes are calculated in four steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, South Carolina's SCIAD amount (based on your filing status) is subtracted from " +
    "that to get South Carolina taxable income, the 1.99%/5.21% bracket rates are applied to that, and federal " +
    "income tax plus Social Security and Medicare are calculated separately alongside it. This calculator is " +
    "reviewed and updated whenever the IRS or the South Carolina Department of Revenue publish new annual " +
    "figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the South Carolina Department of Revenue's own H.4216 explainer for its state brackets and " +
    "SCIAD standard deduction amounts. It doesn't account for tax credits, itemized deductions, or every " +
    "possible W-4 election, so treat it as a close estimate rather than an exact paycheck figure — your actual " +
    "paycheck may vary slightly depending on your employer's payroll system.\n\n" +
    "South Carolina's H.4216 (Act 110) is a brand-new law for the 2026 tax year, replacing the state's previous " +
    "six-bracket system (which topped out at 6.4%) with the simpler two-bracket schedule and new SCIAD " +
    "deduction used here. H.4216 also allows the SCIAD to be reduced at higher income levels through an " +
    "income-based phase-out; the exact phase-out schedule wasn't cleanly available at the time this calculator " +
    "was built, so it isn't modeled — a high-income South Carolina filer's real state tax could end up somewhat " +
    "higher than this estimate once that phase-out applies.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND South Carolina state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This calculator doesn't include a dependents field, since the SCIAD isn't based on number of dependents. " +
    "South Carolina's $30,000 bracket threshold is also the same dollar amount for every filing status rather " +
    "than being doubled for Married Filing Jointly.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the South " +
    "Carolina Department of Revenue.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), with " +
    "no pre-tax or post-tax deductions, takes home approximately $2,285.87 per paycheck — about $59,432.50 for " +
    "the year — after federal income tax, Social Security, Medicare, and South Carolina state income tax.\n\n" +
    "This reflects South Carolina's brand-new 2026 tax structure under H.4216 (Act 110): a simple 1.99%/5.21% " +
    "two-bracket schedule with a $15,000 SCIAD deduction for single filers, replacing the state's old " +
    "six-bracket system that topped out at 6.4% — a meaningfully simpler, and for most filers lower-tax, " +
    "structure than what South Carolina had before.";

  const faq = [
    {
      question: "Does South Carolina have a state income tax?",
      answer:
        "Yes, but it changed significantly for 2026: South Carolina now taxes income at just two rates, 1.99% " +
        "and 5.21%, under a new law (H.4216 / Act 110) that replaced its old six-bracket system.",
    },
    {
      question: "What are the South Carolina income tax brackets?",
      answer:
        "Under H.4216 (Act 110), effective for the 2026 tax year: 1.99% on taxable income under $30,000, and " +
        "5.21% on taxable income above $30,000 — the same $30,000 threshold applies to every filing status.",
    },
    {
      question: "What is the SCIAD (South Carolina's standard deduction)?",
      answer:
        "H.4216 replaced South Carolina's old federal-conformity standard deduction with a new South Carolina " +
        "Income Adjustment Deduction (SCIAD): $15,000 for Single and Married Filing Separately filers, $22,500 " +
        "for Head of Household filers, and $30,000 for Married Filing Jointly filers.",
    },
    {
      question: "Is South Carolina's new tax law recent?",
      answer:
        "Yes — H.4216 (Act 110) is a brand-new law that took effect for the 2026 tax year, replacing South " +
        "Carolina's previous six-bracket system (which topped out at 6.4%) with the simpler two-bracket " +
        "1.99%/5.21% schedule and the new SCIAD deduction used in this calculator.",
    },
    {
      question: "What taxes are actually taken out of a South Carolina paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and South Carolina state " +
        "income tax (1.99%/5.21% brackets after the SCIAD).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, Medicare, and South Carolina " +
        "state income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in South Carolina?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, South " +
        "Carolina state income tax, and any deductions you enter. Under South Carolina's new 2026 law, most " +
        "filers should see a somewhat higher take-home pay than under the state's old six-bracket system.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus South " +
        "Carolina's new H.4216 (Act 110) brackets and SCIAD deduction amounts. It doesn't model the SCIAD's " +
        "income-based phase-out at higher incomes, tax credits, itemized deductions, or every W-4 adjustment — " +
        "so your actual withholding may differ, especially at higher income levels.",
    },
  ];

  const toolContent = {
    title: "South Carolina Income Tax Calculator",
    description:
      "This South Carolina income tax calculator and paycheck tax calculator shows you, in one place, exactly " +
      "what's withheld from your paycheck and what you take home under South Carolina's new 2026 tax law " +
      "(H.4216 / Act 110). Use it as a general tax calculator for South Carolina, a South Carolina payroll tax " +
      "calculator for federal withholding, FICA, and state tax, or a salary tax calculator for any pay " +
      "frequency and filing status.",
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
    metaTitle: "South Carolina Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free South Carolina income tax calculator and paycheck tax calculator. Estimate federal income tax, " +
      "payroll tax (FICA), South Carolina's new 2026 state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to South Carolina's row in " +
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
