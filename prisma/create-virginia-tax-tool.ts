// One-time (but safe to re-run) setup script: creates the Virginia Income
// Tax Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category (created by create-nevada-paycheck-tool.ts, or here if that
// hasn't run yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-alabama-tax-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Unlike Nevada, Virginia DOES levy a state income tax, so this tool's
// breakdown actually shows a non-zero Virginia State Income Tax line. The
// math lives in code, not the database: see
// `customCalculators["virginia-tax-calculator"]` in `src/lib/calc-engine.ts`
// for the federal income tax (2026 IRS brackets + standard deduction), FICA
// (Social Security + Medicare), and Virginia state income tax (2%/3%/5%/
// 5.75% brackets — with the SAME dollar thresholds for every filing status,
// not doubled for Married Filing Jointly — plus Virginia's standard
// deduction and $930 personal/dependent exemptions — figures sourced from
// Virginia Tax's own published exemptions and standard deduction figures)
// calculation. This script only wires up the Tool row so the public page
// has a title, input form, and content around that calculation.
//
// Like Alabama, Virginia keeps the "numberOfDependents" input field, since
// Virginia's $930-per-dependent exemption depends on it.
//
// HOW TO RUN
//   npx tsx prisma/create-virginia-tax-tool.ts
// or
//   npm run db:create-virginia-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "virginia-tax-calculator";

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
    { key: "stateIncomeTax", label: "Virginia State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Virginia income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Virginia, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and Virginia's state income tax from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, select your federal filing status, and enter how " +
    "many dependents you claim. Add any pre-tax deductions (like 401(k) contributions or health insurance " +
    "premiums), post-tax deductions, and extra federal withholding if they apply to you — otherwise leave them " +
    "at $0. Click Calculate to see a full breakdown: gross pay, federal income tax, Social Security tax, " +
    "Medicare tax, Virginia state income tax, total deductions, and your estimated take-home pay, both per " +
    "paycheck and for the year.\n\n" +
    "Virginia taxes income at 2%, 3%, 5%, and 5.75%, after subtracting a standard deduction and a $930 " +
    "exemption for each personal exemption and dependent you claim. Virginia's bracket thresholds are notably " +
    "low and, unusually, don't change by filing status: the top 5.75% rate starts at just $17,000 of taxable " +
    "income whether you file Single, Married Filing Jointly, or any other status — so most full-time Virginia " +
    "workers end up paying close to the full top rate on the bulk of their income.\n\n" +
    "Income taxes are calculated in five steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Virginia's standard deduction and your $930-per-exemption personal and " +
    "dependent exemptions are subtracted from that to get Virginia taxable income, Virginia's 2%/3%/5%/5.75% " +
    "bracket rates are applied to that, and federal income tax plus Social Security and Medicare are calculated " +
    "separately alongside it. This calculator is reviewed and updated whenever the IRS or Virginia Tax publish " +
    "new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and Virginia Tax's own published 2025–2026 brackets, standard deduction, and exemption amounts " +
    "for its state figures. It doesn't account for tax credits, itemized deductions, or every possible W-4/VA-4 " +
    "election, so treat it as a close estimate rather than an exact paycheck figure — your actual paycheck may " +
    "vary slightly depending on your employer's payroll system.\n\n" +
    "Virginia's standard deduction is $8,750 for Single and Married Filing Separately filers and $17,500 for " +
    "Married Filing Jointly filers. These elevated amounts are legislated through the 2026 tax year and could " +
    "change afterward without further legislative action — worth knowing if you're relying on this calculator " +
    "for planning beyond 2026. Head of Household filers aren't separately scheduled in Virginia's own " +
    "instructions, so this calculator uses the Single standard deduction amount ($8,750) for Head of Household " +
    "as well, as a documented simplification.\n\n" +
    "Virginia's exemptions are each worth $930: one personal exemption (claimed twice for Married Filing " +
    "Jointly — once per spouse), plus $930 for every dependent you enter in the \"Number of Dependents\" field. " +
    "This calculator does not model Virginia's additional $800 exemption for filers who are age 65 or older or " +
    "blind, since that isn't captured by any of this tool's inputs — a filer who qualifies for it will owe " +
    "somewhat less than shown here.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Virginia state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or Virginia Tax.";

  const examples =
    "Example: a Married Filing Jointly couple with 2 dependents earning $120,000 a year combined, paid biweekly " +
    "(26 paychecks/year), with no pre-tax or post-tax deductions, takes home approximately $3,667.60 per " +
    "paycheck — about $95,357.65 for the year — after federal income tax, Social Security, Medicare, and " +
    "Virginia state income tax of $208.55 per paycheck. For comparison, the same couple with 0 dependents would " +
    "pay a slightly higher $212.67 per paycheck in Virginia state income tax — each dependent's $930 exemption " +
    "makes a modest but real difference.\n\n" +
    "Because Virginia's top 5.75% bracket starts at just $17,000 of taxable income for every filing status " +
    "alike — not doubled for joint filers — most Virginia households end up paying close to the full top rate " +
    "on most of their income, regardless of how the $17,000 threshold compares with a Single filer's.";

  const faq = [
    {
      question: "Does Virginia have a state income tax?",
      answer:
        "Yes. Virginia taxes income at 2%, 3%, 5%, and 5.75%, with bracket thresholds that don't change by " +
        "filing status — so most full-time workers, whatever their filing status, end up taxed at or near the " +
        "top 5.75% rate on the bulk of their income.",
    },
    {
      question: "What are the Virginia income tax brackets?",
      answer:
        "2% on the first $3,000 of taxable income, 3% on the next $2,000 (up to $5,000), 5% on the next " +
        "$12,000 (up to $17,000), and 5.75% above $17,000. Unusually, these same dollar thresholds apply to " +
        "every filing status — they aren't doubled for Married Filing Jointly.",
    },
    {
      question: "What is Virginia's standard deduction?",
      answer:
        "$8,750 for Single, Married Filing Separately, and (as a simplification, since Virginia doesn't " +
        "separately schedule it) Head of Household filers, and $17,500 for Married Filing Jointly filers. " +
        "These amounts are legislated through the 2026 tax year.",
    },
    {
      question: "What is the Virginia personal and dependent exemption?",
      answer:
        "$930 per exemption — claimed once for most filers, twice for Married Filing Jointly (one per spouse), " +
        "plus another $930 for each dependent you claim. Virginia also offers an additional $800 exemption for " +
        "filers who are 65 or older or blind, which this calculator doesn't model.",
    },
    {
      question: "What taxes are actually taken out of a Virginia paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and Virginia state " +
        "income tax (2%/3%/5%/5.75% brackets after your standard deduction and exemptions).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, " +
        "and this calculator includes all of it: federal income tax, Social Security, Medicare, and Virginia " +
        "state income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in Virginia?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Virginia " +
        "state income tax, and any deductions you enter. Because Virginia's brackets top out at just $17,000 " +
        "of taxable income, most filers see close to the full 5.75% state rate applied once their taxable " +
        "income clears the standard deduction and exemptions.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus Virginia " +
        "Tax's own published 2025–2026 brackets, standard deduction, and $930 exemption amounts. It doesn't " +
        "include Virginia's additional $800 age-65-or-blind exemption, tax credits, itemized deductions, or " +
        "every W-4/VA-4 adjustment, so your actual withholding may differ slightly.",
    },
  ];

  const toolContent = {
    title: "Virginia Income Tax Calculator",
    description:
      "This Virginia income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Virginia, a " +
      "Virginia payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax calculator " +
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
    metaTitle: "Virginia Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Virginia income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll " +
      "tax (FICA), Virginia state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Virginia's row in " +
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
