// One-time (but safe to re-run) setup script: creates the Alaska Income Tax
// Calculator Tool inside the existing "Tax & Paycheck Calculators" category
// (created by create-nevada-paycheck-tool.ts, or here if that hasn't run
// yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, same (simpler) input set, different
// state.
//
// Like Nevada, Alaska levies NO state income tax — confirmed via the Tax
// Foundation's 2026 Alaska state tax summary (taxfoundation.org/location/
// alaska/): "Alaska does not levy a state individual income tax." Alaska
// also has no state sales tax and no estate/inheritance tax; it funds most
// of its budget from oil & gas severance taxes instead (which also fund the
// Permanent Fund Dividend) — not part of an income-tax calculator's scope,
// so left out of the tool itself, same as Nevada's page leaves out gaming
// tax, etc.
//
// Because the state math is identical to Nevada's (always $0), this script
// intentionally stays as simple as Nevada's — no dependents field, no
// exemption logic — rather than carrying over Alabama's extra complexity
// where it isn't needed. The actual math lives in code, not the database:
// see `customCalculators["alaska-tax-calculator"]` in
// `src/lib/calc-engine.ts` (an alias of the Nevada function — see the
// comment there) for the federal income tax (2026 IRS brackets + standard
// deduction) and FICA (Social Security + Medicare) calculation. This script
// only wires up the Tool row so the public page has a title, input form,
// and content around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-alaska-tax-tool.ts
// or
//   npm run db:create-alaska-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "alaska-tax-calculator";

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
    { key: "stateIncomeTax", label: "Alaska State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for an Alaska income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Alaska, this tool covers it: it works out federal income " +
    "tax, Social Security, Medicare, and Alaska's state income tax (always zero) from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and " +
    "extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a full " +
    "breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Alaska state income tax " +
    "(always $0 — Alaska has no state income tax), total deductions, and your estimated take-home pay, both per " +
    "paycheck and for the year.\n\n" +
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
    "Alaska has no state income tax and no local income taxes, so that part of the breakdown needs no " +
    "assumptions — it's always $0 for every filer, at every income level, statewide. (Alaska also has no state " +
    "sales tax, though some municipalities charge their own local sales tax — that's separate from this " +
    "calculator's scope.)\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the IRS.";

  const examples =
    "Example: a single filer earning $75,000 a year, paid biweekly (26 paychecks/year), with no pre-tax or " +
    "post-tax deductions, takes home approximately $2,368.94 per paycheck — about $61,592.50 for the year — " +
    "after federal income tax, Social Security, and Medicare. Alaska adds no state income tax on top of " +
    "that.\n\n" +
    "Because Alaska has no state income or payroll tax, the only difference between this estimate and a " +
    "paycheck in a state with income tax is that extra state withholding line — everything else (federal " +
    "income tax, Social Security, Medicare) is calculated the same way nationwide.";

  const faq = [
    {
      question: "Does Alaska have a state income tax?",
      answer:
        "No. Alaska is one of a handful of U.S. states with no state income tax, so nothing is withheld from your " +
        "paycheck for state income tax — your take-home pay is reduced only by federal income tax and FICA (Social " +
        "Security and Medicare).",
    },
    {
      question: "What taxes are actually taken out of an Alaska paycheck?",
      answer:
        "Federal income tax (based on your income and filing status), Social Security tax (6.2% up to the annual " +
        "wage base), and Medicare tax (1.45%, plus an extra 0.9% on wages above a threshold that depends on your " +
        "filing status). There's no state or local income tax in Alaska.",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, and Medicare, plus Alaska's " +
        "(zero) state payroll tax, all in the same breakdown.",
    },
    {
      question: "Is there an Alaska salary tax calculator I can use for any pay frequency?",
      answer:
        "Yes — this calculator works as an Alaska salary tax calculator for weekly, biweekly, semi-monthly, " +
        "monthly, or annual pay. Enter your annual salary and choose your pay frequency above, and it recalculates " +
        "federal income tax, Social Security, and Medicare for that schedule automatically.",
    },
    {
      question: "What is my after-tax (take-home) pay in Alaska?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, and any " +
        "deductions you enter. Because Alaska has no state income tax, nothing further is subtracted for state " +
        "tax, so Alaska workers typically keep more of their after-tax pay than workers in states that do tax " +
        "income.",
    },
    {
      question: "Does Alaska have a state sales tax too?",
      answer:
        "No statewide sales tax, though some Alaska municipalities and boroughs levy their own local sales tax. " +
        "This calculator covers income tax and payroll tax only, not sales tax.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using the 2026 IRS federal tax brackets and standard deduction amounts. It doesn't " +
        "include tax credits (like the Child Tax Credit), itemized deductions, or every W-4 adjustment, so your " +
        "actual withholding may differ slightly.",
    },
    {
      question: "What is the Social Security wage base for 2026?",
      answer:
        "$184,500. Social Security tax (6.2%) only applies up to that amount of wages in a year — any income " +
        "above it isn't taxed for Social Security (though it's still subject to Medicare tax).",
    },
    {
      question: "What is the Additional Medicare Tax?",
      answer:
        "An extra 0.9% Medicare tax on wages above $200,000 for Single, Head of Household, and Married Filing " +
        "Separately filers, or $250,000 for Married Filing Jointly. There's no employer match for this portion.",
    },
    {
      question: "How do pre-tax deductions affect my paycheck?",
      answer:
        "Pre-tax deductions (like traditional 401(k) contributions or health insurance premiums) are subtracted " +
        "from your wages before federal income tax and FICA are calculated, which lowers your total tax — so your " +
        "take-home pay drops by less than the full deduction amount.",
    },
  ];

  const toolContent = {
    title: "Alaska Income Tax Calculator",
    description:
      "This Alaska income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Alaska, an " +
      "Alaska payroll tax calculator for federal withholding and FICA, or a salary tax calculator for any pay " +
      "frequency — since Alaska charges no state income tax, more of every paycheck stays with you.",
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
    metaTitle: "Alaska Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Alaska income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll tax " +
      "(FICA), and take-home pay — Alaska has no state income tax.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Alaska's row in " +
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
