// One-time (but safe to re-run) setup script: creates the New Jersey Income
// Tax Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category (created by create-nevada-paycheck-tool.ts, or here if that
// hasn't run yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-alabama-tax-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Like Alabama, New Jersey DOES levy a state income tax, so this tool's
// breakdown shows a non-zero New Jersey State Income Tax line. The math
// lives in code, not the database: see
// `customCalculators["new-jersey-tax-calculator"]` in
// `src/lib/calc-engine.ts` for the federal income tax (2026 IRS brackets +
// standard deduction), FICA (Social Security + Medicare), and New Jersey
// state income tax (seven brackets for Single/Married Filing Separately,
// eight for Married Filing Jointly, from 1.4% up to the 10.75%
// "millionaire's tax," with no standard deduction but a $1,000 personal
// exemption and a $1,500 per-dependent exemption — figures sourced from the
// NJ Division of Taxation's own personal exemptions page) calculation. This
// script only wires up the Tool row so the public page has a title, input
// form, and content around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-new-jersey-tax-tool.ts
// or
//   npm run db:create-new-jersey-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "new-jersey-tax-calculator";

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
    { key: "stateIncomeTax", label: "New Jersey State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a New Jersey income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for New Jersey, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and New Jersey's state income tax from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, select your federal filing status, and enter how " +
    "many dependents you claim. Add any pre-tax deductions (like 401(k) contributions or health insurance " +
    "premiums), post-tax deductions, and extra federal withholding if they apply to you — otherwise leave them " +
    "at $0. Click Calculate to see a full breakdown: gross pay, federal income tax, Social Security tax, " +
    "Medicare tax, New Jersey state income tax, total deductions, and your estimated take-home pay, both per " +
    "paycheck and for the year.\n\n" +
    "New Jersey taxes income across seven brackets for Single and Married Filing Separately filers (eight for " +
    "Married Filing Jointly), running from 1.4% up to a top rate of 10.75% — New Jersey's well-known " +
    "\"millionaire's tax,\" which starts at $1,000,000 of taxable income. Unlike most states, New Jersey has no " +
    "standard deduction at all; instead, it offers a flat $1,000 personal exemption (doubled to $2,000 for " +
    "Married Filing Jointly, one exemption per spouse) plus a $1,500 exemption for each dependent you claim.\n\n" +
    "Income taxes are calculated in a few steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, your personal exemption and dependent exemptions are subtracted from that to get " +
    "New Jersey taxable income, New Jersey's bracket schedule (1.4% to 10.75%) is applied to the result, and " +
    "federal income tax plus Social Security and Medicare are calculated separately alongside it. This " +
    "calculator is reviewed and updated whenever the IRS or the New Jersey Division of Taxation publish new " +
    "annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the New Jersey Division of Taxation's published bracket schedule and personal exemption " +
    "amounts for its state figures. It doesn't account for tax credits, itemized deductions, or every possible " +
    "W-4 election, so treat it as a close estimate rather than an exact paycheck figure — your actual paycheck " +
    "may vary slightly depending on your employer's payroll system.\n\n" +
    "New Jersey has no standard deduction of any kind. Instead, this calculator applies a $1,000 personal " +
    "exemption (or $2,000 for Married Filing Jointly, reflecting one exemption per spouse) plus a $1,500 " +
    "exemption for each dependent claimed, directly from the New Jersey Division of Taxation's own exemptions " +
    "page.\n\n" +
    "New Jersey's Head of Household and Married Filing Separately brackets are approximated here using the " +
    "Single bracket schedule — a documented simplification. New Jersey's own Married Filing Separately " +
    "thresholds closely match the Single schedule in the lower brackets, and Head of Household isn't separately " +
    "scheduled in the sources used for this calculator.\n\n" +
    "This calculator doesn't model New Jersey's additional exemptions for being 65 or older, blind or disabled, " +
    "or having a dependent attending college — all of which would reduce a real filer's New Jersey taxable " +
    "income below what this estimate shows.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the New Jersey " +
    "Division of Taxation.";

  const examples =
    "Example: a married couple filing jointly with three dependents, earning $120,000 a year, paid biweekly (26 " +
    "paychecks/year), with no pre-tax or post-tax deductions, takes home approximately $3,741.63 per paycheck — " +
    "about $97,282.45 for the year — after federal income tax, Social Security, Medicare, and New Jersey state " +
    "income tax. The same $120,000 Married Filing Jointly household with zero dependents instead pays about " +
    "$144.09 per paycheck in New Jersey state income tax, compared to $134.52 with three dependents — showing " +
    "how each dependent's $1,500 exemption chips away at New Jersey taxable income.\n\n" +
    "For comparison, a single filer with no dependents earning $75,000 a year on the same biweekly schedule, " +
    "with no deductions, takes home approximately $2,269.03 per paycheck — about $58,994.80 for the year. " +
    "Because New Jersey has no standard deduction and relies entirely on its flat-dollar personal and dependent " +
    "exemptions, claiming more dependents has a direct, easy-to-see effect on your New Jersey taxable income " +
    "that's simpler to trace than a state with a sliding-scale deduction.";

  const faq = [
    {
      question: "Does New Jersey have a state income tax?",
      answer:
        "Yes. New Jersey taxes income across seven brackets for Single and Married Filing Separately filers " +
        "(eight for Married Filing Jointly), from 1.4% up to a top rate of 10.75% on income above $1,000,000 — " +
        "New Jersey's \"millionaire's tax.\"",
    },
    {
      question: "What are the New Jersey income tax brackets?",
      answer:
        "For Single/Married Filing Separately/Head of Household: 1.4% to $20,000, 1.75% to $35,000, 3.5% to " +
        "$40,000, 5.525% to $75,000, 6.37% to $500,000, 8.97% to $1,000,000, and 10.75% above. For Married " +
        "Filing Jointly: 1.4% to $20,000, 1.75% to $50,000, 2.45% to $70,000, 3.5% to $80,000, 5.525% to " +
        "$150,000, 6.37% to $500,000, 8.97% to $1,000,000, and 10.75% above.",
    },
    {
      question: "What is New Jersey's standard deduction?",
      answer:
        "New Jersey doesn't have one. Instead, it offers a $1,000 personal exemption (doubled to $2,000 for " +
        "Married Filing Jointly, one exemption per spouse), plus a $1,500 exemption for each dependent you " +
        "claim.",
    },
    {
      question: "How does claiming dependents affect my New Jersey taxes?",
      answer:
        "Each dependent you claim is worth a $1,500 exemption, subtracted directly from your New Jersey taxable " +
        "income before the bracket rates are applied — so more dependents means a smaller New Jersey tax bill, " +
        "all else being equal.",
    },
    {
      question: "What taxes are actually taken out of a New Jersey paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and New Jersey state " +
        "income tax (1.4% to 10.75% across seven or eight brackets, after your personal and dependent " +
        "exemptions).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, Medicare, and New Jersey state " +
        "income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in New Jersey?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, New Jersey " +
        "state income tax, and any deductions you enter. Because New Jersey has no standard deduction, its " +
        "personal and dependent exemptions do all the work of reducing your taxable income before the bracket " +
        "rates apply.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus New Jersey's " +
        "published bracket schedule and personal/dependent exemption amounts. It approximates New Jersey's Head " +
        "of Household and Married Filing Separately brackets using the Single schedule, doesn't model additional " +
        "exemptions for age 65+, blindness/disability, or a dependent in college, and doesn't include tax " +
        "credits or every W-4 adjustment — so your actual withholding may differ slightly.",
    },
  ];

  const toolContent = {
    title: "New Jersey Income Tax Calculator",
    description:
      "This New Jersey income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for New Jersey, a " +
      "New Jersey payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax " +
      "calculator for any pay frequency and number of dependents.",
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
    metaTitle: "New Jersey Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free New Jersey income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll " +
      "tax (FICA), New Jersey state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to New Jersey's row in " +
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
