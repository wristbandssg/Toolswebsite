// One-time (but safe to re-run) setup script: creates the Wisconsin Income
// Tax Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category (created by create-nevada-paycheck-tool.ts, or here if that
// hasn't run yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Unlike Nevada, Wisconsin DOES levy a state income tax, so this tool's
// breakdown actually shows a non-zero Wisconsin State Income Tax line. The
// math lives in code, not the database: see
// `customCalculators["wisconsin-tax-calculator"]` in `src/lib/calc-engine.ts`
// for the federal income tax (2026 IRS brackets + standard deduction), FICA
// (Social Security + Medicare), and Wisconsin state income tax (3.5%/4.4%/
// 5.3%/7.65% brackets, with a standard deduction that phases DOWN on a
// sliding scale as income rises — figures sourced from the Wisconsin
// Department of Revenue's 2026 Form 1-ES instructions) calculation. This
// script only wires up the Tool row so the public page has a title, input
// form, and content around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-wisconsin-tax-tool.ts
// or
//   npm run db:create-wisconsin-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "wisconsin-tax-calculator";

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
    { key: "stateIncomeTax", label: "Wisconsin State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Wisconsin income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Wisconsin, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and Wisconsin's state income tax from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and " +
    "extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a full " +
    "breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Wisconsin state income tax, " +
    "total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "Wisconsin taxes income at four rates — 3.5%, 4.4%, 5.3%, and 7.65% — after subtracting a standard " +
    "deduction. Here's the part that catches most people off guard: Wisconsin's standard deduction isn't a flat " +
    "dollar amount like most states use. It's a sliding scale that phases DOWN as your income goes up. For " +
    "Single and Head of Household filers, it starts at a maximum of $13,960 and shrinks by 12 cents for every " +
    "dollar of income above $20,119, reaching exactly $0 once income hits $136,453. For Married Filing Jointly, " +
    "it starts at a maximum of $25,840 and shrinks by roughly 19.8 cents for every dollar above $29,039, " +
    "reaching exactly $0 at $159,690. This calculator applies that exact phase-out formula, not a rough " +
    "approximation — so don't be surprised if your effective standard deduction here is smaller than the flat " +
    "figure you might see quoted elsewhere.\n\n" +
    "Income taxes are calculated in five steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, that same figure determines your sliding-scale Wisconsin standard deduction, " +
    "the standard deduction is subtracted from taxable wages to get Wisconsin taxable income, Wisconsin's " +
    "3.5%/4.4%/5.3%/7.65% bracket rates are applied to that, and federal income tax plus Social Security and " +
    "Medicare are calculated separately alongside it. This calculator is reviewed and updated whenever the IRS " +
    "or the Wisconsin Department of Revenue publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the Wisconsin Department of Revenue's official 2026 Form 1-ES brackets and standard deduction " +
    "phase-out formula for its state figures. It doesn't account for tax credits, itemized deductions, or every " +
    "possible W-4/WT-4 election, so treat it as a close estimate rather than an exact paycheck figure — your " +
    "actual paycheck may vary slightly depending on your employer's payroll system.\n\n" +
    "Wisconsin's standard deduction sliding scale is implemented here using the exact published formula — " +
    "Single/Head of Household: $13,960 maximum, phasing out at 12% of income above $20,119, reaching $0 at " +
    "$136,453; Married Filing Jointly: $25,840 maximum, phasing out at 19.778% of income above $29,039, " +
    "reaching $0 at $159,690 — rather than an approximation, so this part of the calculation should track " +
    "Wisconsin's own tables closely.\n\n" +
    "Married Filing Separately filers are calculated using the Single/Head of Household bracket schedule and " +
    "standard deduction formula in this tool, since Wisconsin's own Married Filing Separately schedule wasn't " +
    "cleanly available separately — treat MFS results here as an approximation.\n\n" +
    "This calculator doesn't model Wisconsin's Married Couple Credit or its other state-specific credits, which " +
    "can reduce a real filer's Wisconsin tax bill below the estimate shown here, particularly for two-earner " +
    "married households.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Wisconsin " +
    "Department of Revenue.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), with " +
    "no pre-tax or post-tax deductions, takes home approximately $2,254.30 per paycheck — about $58,611.88 for " +
    "the year — after federal income tax, Social Security, Medicare, and Wisconsin state income tax of $114.64 " +
    "per paycheck.\n\n" +
    "At $75,000 of income, this filer's sliding-scale Wisconsin standard deduction has already shrunk well " +
    "below its $13,960 maximum — 12% of the roughly $54,881 by which income exceeds the $20,119 phase-out " +
    "start reduces it by about $6,586, leaving a standard deduction of around $7,374. A filer earning less " +
    "would keep more of that deduction; a filer earning more would see it shrink further, disappearing " +
    "entirely once income reaches $136,453.";

  const faq = [
    {
      question: "Does Wisconsin have a state income tax?",
      answer:
        "Yes. Wisconsin taxes income at four rates — 3.5%, 4.4%, 5.3%, and 7.65% — depending on how much of " +
        "your income falls in each bracket, after subtracting Wisconsin's own standard deduction.",
    },
    {
      question: "What are the Wisconsin income tax brackets?",
      answer:
        "For Single and Head of Household filers: 3.5% up to $15,110, 4.4% from $15,110 to $51,950, 5.3% from " +
        "$51,950 to $332,720, and 7.65% above that. For Married Filing Jointly: 3.5% up to $20,150, 4.4% from " +
        "$20,150 to $69,260, 5.3% from $69,260 to $443,630, and 7.65% above that.",
    },
    {
      question: "Why does Wisconsin's standard deduction change based on my income?",
      answer:
        "Unlike most states, Wisconsin doesn't use a flat standard deduction — it uses a sliding scale that " +
        "phases DOWN as your income rises. For Single/Head of Household filers it starts at a maximum of " +
        "$13,960 and shrinks by 12 cents per dollar of income above $20,119, hitting $0 at $136,453. For " +
        "Married Filing Jointly it starts at $25,840 and shrinks by roughly 19.8 cents per dollar above " +
        "$29,039, hitting $0 at $159,690. This calculator applies that exact formula.",
    },
    {
      question: "Does everyone's Wisconsin standard deduction eventually reach $0?",
      answer:
        "Yes, at high enough income. Single/Head of Household filers see it phase out completely at $136,453 " +
        "of income; Married Filing Jointly filers see it phase out completely at $159,690. Above those income " +
        "levels, Wisconsin's bracket rates apply to essentially all of your taxable wages, with no standard " +
        "deduction cushion left.",
    },
    {
      question: "What taxes are actually taken out of a Wisconsin paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and Wisconsin state " +
        "income tax (3.5%–7.65% brackets after your sliding-scale standard deduction).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, Medicare, and Wisconsin state " +
        "income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in Wisconsin?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Wisconsin " +
        "state income tax, and any deductions you enter. Because Wisconsin's standard deduction shrinks as " +
        "income rises, higher earners generally see a bigger share of their income taxed at Wisconsin's higher " +
        "bracket rates than a flat-deduction state would produce.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus the " +
        "Wisconsin Department of Revenue's official 2026 brackets and the exact standard deduction phase-out " +
        "formula. It approximates Married Filing Separately using the Single/Head of Household schedule, and " +
        "doesn't include tax credits (like the Married Couple Credit), itemized deductions, or every W-4/WT-4 " +
        "adjustment — so your actual withholding may differ slightly.",
    },
  ];

  const toolContent = {
    title: "Wisconsin Income Tax Calculator",
    description:
      "This Wisconsin income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Wisconsin, a " +
      "Wisconsin payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax " +
      "calculator for any pay frequency — it accounts for Wisconsin's distinctive sliding-scale standard " +
      "deduction, which phases down as your income rises.",
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
    metaTitle: "Wisconsin Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Wisconsin income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll " +
      "tax (FICA), Wisconsin state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Wisconsin's row in " +
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
