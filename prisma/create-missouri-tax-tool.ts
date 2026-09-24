// One-time (but safe to re-run) setup script: creates the Missouri Income Tax
// Calculator Tool inside the existing "Tax & Paycheck Calculators" category
// (created by create-nevada-paycheck-tool.ts, or here if that hasn't run
// yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-alabama-tax-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Like Alabama, Missouri DOES levy a state income tax, so this tool's
// breakdown shows a non-zero Missouri State Income Tax line. The math lives
// in code, not the database: see `customCalculators["missouri-tax-calculator"]`
// in `src/lib/calc-engine.ts` for the federal income tax (2026 IRS brackets +
// standard deduction), FICA (Social Security + Medicare), and Missouri state
// income tax (eight brackets from 0% to 4.7%, using a standard deduction
// equal to the federal amount — figures sourced from the Missouri
// Department of Revenue's 2026 withholding formula/tables and the Tax
// Foundation's 2026 state income tax rates table) calculation. This script
// only wires up the Tool row so the public page has a title, input form, and
// content around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-missouri-tax-tool.ts
// or
//   npm run db:create-missouri-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "missouri-tax-calculator";

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
    { key: "stateIncomeTax", label: "Missouri State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Missouri income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Missouri, this tool covers it: it works out federal income " +
    "tax, Social Security, Medicare, and Missouri's state income tax from your salary, all in one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and extra " +
    "federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a full " +
    "breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Missouri state income tax, " +
    "total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "Missouri taxes income across eight brackets, from 0% up through a top rate of 4.7%, using the same dollar " +
    "thresholds for every filing status rather than doubling them for joint filers. Missouri's standard " +
    "deduction is set equal to the federal standard deduction, so this calculator applies that same figure " +
    "before running your Missouri taxable income through the state's bracket schedule.\n\n" +
    "Income taxes are calculated in a few steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, the federal standard deduction for your filing status is subtracted from that to " +
    "get Missouri taxable income, Missouri's eight-bracket schedule (0% to 4.7%) is applied to the result, and " +
    "federal income tax plus Social Security and Medicare are calculated separately alongside it. This " +
    "calculator is reviewed and updated whenever the IRS or the Missouri Department of Revenue publish new " +
    "annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the Missouri Department of Revenue's published 2026 withholding formula and brackets for its " +
    "state figures. It doesn't account for tax credits, itemized deductions, or every possible W-4 election, so " +
    "treat it as a close estimate rather than an exact paycheck figure — your actual paycheck may vary slightly " +
    "depending on your employer's payroll system.\n\n" +
    "Missouri's standard deduction is set equal to the federal standard deduction ($16,100 Single/Married Filing " +
    "Separately, $32,200 Married Filing Jointly, $24,150 Head of Household for 2026), confirmed via the Tax " +
    "Foundation's 2026 state comparison table, and this calculator applies it directly with no interpolation or " +
    "phase-out needed.\n\n" +
    "Missouri allows a deduction for a portion of federal income tax actually paid, which phases out at higher " +
    "incomes and is capped by statute. That deduction isn't modeled here because it requires iterative, " +
    "income-capped logic — leaving it out means this calculator will somewhat overstate a real Missouri filer's " +
    "state tax compared to what they'd actually owe.\n\n" +
    "Missouri's bracket thresholds are unusual in that they're identical for every filing status — this " +
    "calculator applies the same eight-bracket dollar schedule whether you're Single, Married Filing Jointly, " +
    "Married Filing Separately, or Head of Household, which matches how Missouri actually structures its tax " +
    "law.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Missouri " +
    "Department of Revenue.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), with " +
    "no pre-tax or post-tax deductions, takes home approximately $2,269.42 per paycheck — about $59,004.83 for " +
    "the year — after federal income tax, Social Security, Medicare, and Missouri state income tax.\n\n" +
    "Because Missouri's eight brackets top out at just $9,436 of taxable income with the same thresholds for " +
    "every filing status, most Missouri filers with taxable income above that level end up paying the top 4.7% " +
    "marginal rate on the bulk of their income, even though the early brackets keep the overall effective rate " +
    "well below 4.7%.";

  const faq = [
    {
      question: "Does Missouri have a state income tax?",
      answer:
        "Yes. Missouri taxes income across eight brackets, from 0% up to a top rate of 4.7%, with the bracket " +
        "thresholds set the same for every filing status.",
    },
    {
      question: "What are the Missouri income tax brackets?",
      answer:
        "For 2026: 0% on taxable income up to $1,348, 2% up to $2,696, 2.5% up to $4,044, 3% up to $5,392, 3.5% " +
        "up to $6,740, 4% up to $8,088, 4.5% up to $9,436, and 4.7% on taxable income above $9,436 — the same " +
        "thresholds apply whether you're Single, Married Filing Jointly, Married Filing Separately, or Head of " +
        "Household.",
    },
    {
      question: "What is Missouri's standard deduction?",
      answer:
        "It's set equal to the federal standard deduction: $16,100 for Single and Married Filing Separately " +
        "filers, $32,200 for Married Filing Jointly, and $24,150 for Head of Household, for the 2026 tax year.",
    },
    {
      question: "Are Missouri's tax brackets different for different filing statuses?",
      answer:
        "No — unlike most states, Missouri uses the exact same dollar thresholds for every filing status. The " +
        "brackets aren't doubled for Married Filing Jointly the way they are in many other states, so joint " +
        "filers pass through the brackets at the same dollar amounts as single filers.",
    },
    {
      question: "What taxes are actually taken out of a Missouri paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and Missouri state income " +
        "tax (0% to 4.7% across eight brackets, after the standard deduction).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, Medicare, and Missouri state " +
        "income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in Missouri?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Missouri " +
        "state income tax, and any deductions you enter. Because Missouri's top bracket starts at a relatively " +
        "low $9,436 of taxable income, most filers end up paying close to the 4.7% top rate on a large share of " +
        "their earnings.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus Missouri's " +
        "2026 bracket schedule and standard deduction. It doesn't model Missouri's deduction for federal income " +
        "tax actually paid (which is income-capped and phases out), tax credits, itemized deductions, or every " +
        "W-4 adjustment — so your actual withholding may differ, generally in your favor.",
    },
  ];

  const toolContent = {
    title: "Missouri Income Tax Calculator",
    description:
      "This Missouri income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Missouri, a " +
      "Missouri payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax calculator " +
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
    metaTitle: "Missouri Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Missouri income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll tax " +
      "(FICA), Missouri state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Missouri's row in " +
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
