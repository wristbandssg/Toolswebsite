// One-time (but safe to re-run) setup script: creates the Washington Income
// Tax Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category (created by create-nevada-paycheck-tool.ts, or here if that
// hasn't run yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Like Nevada, Washington levies NO state income tax on wages, so this
// tool's breakdown always shows a $0 Washington State Income Tax line. The
// math lives in code, not the database: see
// `customCalculators["washington-tax-calculator"]` in `src/lib/calc-engine.ts`
// for the federal income tax (2026 IRS brackets + standard deduction) and
// FICA (Social Security + Medicare) calculation. This script only wires up
// the Tool row so the public page has a title, input form, and content
// around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-washington-tax-tool.ts
// or
//   npm run db:create-washington-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "washington-tax-calculator";

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
    { key: "stateIncomeTax", label: "Washington State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Washington income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Washington, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and Washington's state income tax (always zero on wages) from your " +
    "salary, all in one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and " +
    "extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a full " +
    "breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Washington state income tax " +
    "(always $0 — Washington doesn't tax wages), total deductions, and your estimated take-home pay, both per " +
    "paycheck and for the year.\n\n" +
    "Washington is one of nine U.S. states with no state income tax on wages, so this calculator's state tax " +
    "line stays at zero for every filer, at every income level, regardless of filing status or where in " +
    "Washington you live. Washington does fund its government differently than most states — notably through a " +
    "relatively high state sales tax and, for very high earners, a state capital gains tax — but neither of " +
    "those is a tax on wage income, so neither shows up in a paycheck calculation.\n\n" +
    "Income taxes are calculated in four steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, the federal standard deduction is subtracted from that to get taxable income, " +
    "the 2026 IRS bracket rates are applied to that taxable income, and Social Security and Medicare are " +
    "calculated separately on taxable wages before the standard deduction. This calculator is reviewed and " +
    "updated whenever the IRS publishes new annual brackets, deduction amounts, or wage bases.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the standard deduction for its federal income tax " +
    "and payroll tax (FICA) figures. It doesn't account for tax credits (such as the Child Tax Credit), " +
    "itemized deductions, or every possible W-4 election, so treat it as a close estimate rather than an exact " +
    "paycheck figure — your actual paycheck may vary slightly depending on your employer's payroll system.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax AND FICA alike, which is the common case for a " +
    "cafeteria-plan/Section 125-style deduction — some deduction types only reduce one or the other, which this " +
    "calculator doesn't distinguish between.\n\n" +
    "Washington has no state income tax on wages and no local income taxes, so that part of the breakdown needs " +
    "no assumptions — it's always $0 for every filer, at every income level, statewide.\n\n" +
    "This calculator only covers wage income and doesn't model Washington's separate state capital gains tax, " +
    "which applies to long-term capital gains above an annual threshold for high earners — that's a different " +
    "tax from the wage withholding this tool estimates, and it isn't part of a regular paycheck.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the IRS.";

  const examples =
    "Example: a single filer earning $75,000 a year, paid biweekly (26 paychecks/year), with no pre-tax or " +
    "post-tax deductions, takes home approximately $2,368.94 per paycheck — about $61,592.50 for the year — " +
    "after federal income tax, Social Security, and Medicare. Washington adds no state income tax on top of " +
    "that.\n\n" +
    "Because Washington has no state income or payroll tax, the only difference between this estimate and a " +
    "paycheck in a state with income tax is that extra state withholding line — everything else (federal " +
    "income tax, Social Security, Medicare) is calculated the same way nationwide. Washington workers keep the " +
    "same take-home pay for a given salary and filing status no matter which city or county they work in, since " +
    "there's no local income tax layered on top either.";

  const faq = [
    {
      question: "Does Washington have a state income tax?",
      answer:
        "No. Washington is one of nine U.S. states with no state income tax on wages, so nothing is withheld " +
        "from your paycheck for state income tax — your take-home pay is reduced only by federal income tax and " +
        "FICA (Social Security and Medicare).",
    },
    {
      question: "Why doesn't Washington have an income tax?",
      answer:
        "Washington's state constitution has long been interpreted to restrict a graduated income tax, and the " +
        "state has instead relied more heavily on other revenue sources, particularly a relatively high state " +
        "sales tax. Washington does levy a separate state capital gains tax on high earners, but that's not a " +
        "tax on wages and doesn't affect a paycheck.",
    },
    {
      question: "What taxes ARE taken out of a Washington paycheck?",
      answer:
        "Federal income tax (based on your income and filing status), Social Security tax (6.2% up to the " +
        "annual wage base), and Medicare tax (1.45%, plus an extra 0.9% on wages above a threshold that depends " +
        "on your filing status). There's no state or local income tax in Washington.",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, and Medicare, plus " +
        "Washington's (zero) state payroll tax, all in the same breakdown.",
    },
    {
      question: "Is there a Washington salary tax calculator I can use for any pay frequency?",
      answer:
        "Yes — this calculator works as a Washington salary tax calculator for weekly, biweekly, semi-monthly, " +
        "monthly, or annual pay. Enter your annual salary and choose your pay frequency above, and it " +
        "recalculates federal income tax, Social Security, and Medicare for that schedule automatically.",
    },
    {
      question: "What is my take-home pay in Washington?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, and any " +
        "deductions you enter. Because Washington has no state income tax on wages, nothing further is " +
        "subtracted for state tax, so Washington workers typically keep more of their gross pay than workers in " +
        "states that do tax wage income.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using the 2026 IRS federal tax brackets and standard deduction amounts. It doesn't " +
        "include tax credits (like the Child Tax Credit), itemized deductions, or every W-4 adjustment, so your " +
        "actual withholding may differ slightly.",
    },
    {
      question: "Does this calculator include Washington's capital gains tax?",
      answer:
        "No. This is a wage paycheck calculator, and Washington's state capital gains tax applies only to " +
        "long-term capital gains above an annual threshold for high earners — it's a separate tax filed on its " +
        "own, not something withheld from a regular paycheck.",
    },
  ];

  const toolContent = {
    title: "Washington Income Tax Calculator",
    description:
      "This Washington income tax calculator and paycheck tax calculator shows you, in one place, exactly " +
      "what's withheld from your paycheck and what you take home. Use it as a general tax calculator for " +
      "Washington, a Washington payroll tax calculator for federal withholding and FICA, or a salary tax " +
      "calculator for any pay frequency — since Washington charges no state income tax on wages, more of every " +
      "paycheck stays with you.",
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
    metaTitle: "Washington Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Washington income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll " +
      "tax (FICA), and take-home pay — Washington has no state income tax on wages.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Washington's row in " +
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
