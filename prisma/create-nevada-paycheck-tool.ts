// One-time (but safe to re-run) setup script: creates the "Tax & Paycheck
// Calculators" Tool Category (if it doesn't already exist) and the Nevada
// tax/paycheck calculator Tool, fully configured — input fields, the
// multi-line breakdown result config, instructions/examples/FAQ, and SEO
// meta.
//
// The actual math for this tool lives in code, not the database: see
// `customCalculators["nevada-tax-calculator"]` in `src/lib/calc-engine.ts`
// for the federal income tax (2026 IRS brackets + standard deduction) and
// FICA (Social Security + Medicare) calculation. This script only wires up
// the Tool row so the public page has a title, input form, and content
// around that calculation.
//
// SLUG RENAME: this tool originally shipped as "nevada-paycheck-calculator"
// and was renamed to "nevada-tax-calculator" for SEO reasons (broader,
// better-matching keyword). Renaming a live row's unique `slug` can't be
// done with a plain upsert-by-slug (upserting by the NEW slug would just
// create a second, duplicate row and leave the old one behind) — so this
// script looks for the row under the OLD slug first and renames it in
// place. Once that's happened once, later runs find it under the NEW slug
// and just update its content, same as a normal upsert.
//
// HOW TO RUN
//   npx tsx prisma/create-nevada-paycheck-tool.ts
// or
//   npm run db:create-nevada-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const OLD_SLUG = "nevada-paycheck-calculator";
const NEW_SLUG = "nevada-tax-calculator";

// Instructions/Examples/Assumptions are now rich-text (HTML) fields — the
// admin edits them with the same Tiptap editor used for Blog posts, and the
// public page renders them with dangerouslySetInnerHTML (see
// ToolContentSections). Content below is still authored as plain
// "\n\n"-separated paragraphs, since that's easier to read/edit here; this
// wraps each paragraph in a <p> tag so it's valid HTML by the time it's
// saved, instead of rendering as one unbroken run-on paragraph.
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
    { key: "stateIncomeTax", label: "Nevada State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Nevada income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Nevada, this tool covers it: it works out federal income " +
    "tax, Social Security, Medicare, and Nevada's state income tax (always zero) from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and " +
    "extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a full " +
    "breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Nevada state income tax " +
    "(always $0 — Nevada has no state income tax), total deductions, and your estimated take-home pay, both per " +
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
    "Nevada has no state income tax and no local income taxes, so that part of the breakdown needs no " +
    "assumptions — it's always $0 for every filer, at every income level, statewide.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the IRS.";

  const examples =
    "Example: a single filer earning $75,000 a year, paid biweekly (26 paychecks/year), with no pre-tax or " +
    "post-tax deductions, takes home approximately $2,368.94 per paycheck — about $61,592.50 for the year — " +
    "after federal income tax, Social Security, and Medicare. Nevada adds no state income tax on top of " +
    "that.\n\n" +
    "Because Nevada has no state income or payroll tax, the only difference between this estimate and a " +
    "paycheck in a state with income tax is that extra state withholding line — everything else (federal " +
    "income tax, Social Security, Medicare) is calculated the same way nationwide.";

  const faq = [
    {
      question: "Does Nevada have a state income tax?",
      answer:
        "No. Nevada is one of a handful of U.S. states with no state income tax, so nothing is withheld from your " +
        "paycheck for state income tax — your take-home pay is reduced only by federal income tax and FICA (Social " +
        "Security and Medicare).",
    },
    {
      question: "What taxes are actually taken out of a Nevada paycheck?",
      answer:
        "Federal income tax (based on your income and filing status), Social Security tax (6.2% up to the annual " +
        "wage base), and Medicare tax (1.45%, plus an extra 0.9% on wages above a threshold that depends on your " +
        "filing status). There's no state or local income tax in Nevada.",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, and Medicare, plus Nevada's " +
        "(zero) state payroll tax, all in the same breakdown.",
    },
    {
      question: "Is there a Nevada salary tax calculator I can use for any pay frequency?",
      answer:
        "Yes — this calculator works as a Nevada salary tax calculator for weekly, biweekly, semi-monthly, " +
        "monthly, or annual pay. Enter your annual salary and choose your pay frequency above, and it recalculates " +
        "federal income tax, Social Security, and Medicare for that schedule automatically.",
    },
    {
      question: "What is my after-tax (take-home) pay in Nevada?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, and any " +
        "deductions you enter. Because Nevada has no state income tax, nothing further is subtracted for state " +
        "tax, so Nevada workers typically keep more of their after-tax pay than workers in states that do tax " +
        "income.",
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
    title: "Income Tax Calculator Nevada",
    description:
      "This Nevada income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Nevada, a " +
      "Nevada payroll tax calculator for federal withholding and FICA, or a salary tax calculator for any pay " +
      "frequency — since Nevada charges no state income tax, more of every paycheck stays with you.",
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
    metaTitle: "Income Tax Calculator Nevada (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Nevada income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll tax " +
      "(FICA), and take-home pay — Nevada has no state income tax.",
    schemaType: "SoftwareApplication",
  };

  const existingByNewSlug = await prisma.tool.findUnique({ where: { slug: NEW_SLUG } });
  const existingByOldSlug = existingByNewSlug
    ? null
    : await prisma.tool.findUnique({ where: { slug: OLD_SLUG } });

  if (existingByNewSlug || existingByOldSlug) {
    // Tool already exists (under either slug) — update it in place. If it's
    // still under the old slug, this is the one-time rename.
    await prisma.tool.update({
      where: { slug: existingByNewSlug ? NEW_SLUG : OLD_SLUG },
      data: {
        slug: NEW_SLUG,
        ...toolContent,
        seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } },
      },
    });
    console.log(
      existingByOldSlug
        ? `Renamed the tool from "${OLD_SLUG}" to "${NEW_SLUG}" and updated its content.`
        : `Updated the "${NEW_SLUG}" tool's content.`
    );
  } else {
    await prisma.tool.create({
      data: {
        slug: NEW_SLUG,
        status: "draft",
        ...toolContent,
        seoMeta: { create: seoMetaContent },
      },
    });
    console.log(`Created the "${NEW_SLUG}" tool (status: draft).`);
  }

  console.log(
    "Open it in /admin/tools, review it, then set Status to Published when you're happy with it. " +
      "Its live URL is now /tools/" + NEW_SLUG + " — any old links to /tools/" + OLD_SLUG + " will 404, " +
      "since Nevada Publish is this recent there shouldn't be meaningful external links to the old URL yet."
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
