// One-time (but safe to re-run) setup script: creates the New York Income
// Tax Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category (created by create-nevada-paycheck-tool.ts, or here if that
// hasn't run yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Like Alabama, New York DOES levy a state income tax, so this tool's
// breakdown actually shows a non-zero New York State Income Tax line. The
// math lives in code, not the database: see
// `customCalculators["new-york-tax-calculator"]` in `src/lib/calc-engine.ts`
// for the federal income tax (2026 IRS brackets + standard deduction), FICA
// (Social Security + Medicare), and New York STATE income tax (nine
// brackets from 3.9% to 10.9%, plus New York's own standard deduction
// figures) calculation. This script only wires up the Tool row so the
// public page has a title, input form, and content around that calculation.
//
// IMPORTANT: this tool models NEW YORK STATE tax only. It does NOT include
// New York City or Yonkers local income tax — see the Instructions and
// Assumptions content below for the explicit scope note.
//
// HOW TO RUN
//   npx tsx prisma/create-new-york-tax-tool.ts
// or
//   npm run db:create-new-york-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "new-york-tax-calculator";

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
    { key: "stateIncomeTax", label: "New York State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a New York income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for New York, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and New York's STATE income tax from your salary, all in one " +
    "place. IMPORTANT: this calculator covers New York STATE tax only — it does NOT include New York City or " +
    "Yonkers local income tax. If you live or work in NYC or Yonkers, your real take-home pay will be lower " +
    "than this tool shows, because those cities levy their own additional income tax on top of the state tax " +
    "calculated here.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and " +
    "extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a " +
    "full breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, New York state income " +
    "tax, total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "New York taxes income across nine brackets, the widest range modeled so far, running from 3.9% at the " +
    "bottom up to 10.9% at the very top (which only applies above $25,000,000 of taxable income). For Single " +
    "filers the brackets run $0–8,500 (3.9%), $8,500–11,700 (4.4%), $11,700–13,900 (5.15%), $13,900–80,650 " +
    "(5.4%), $80,650–215,400 (5.9%), $215,400–1,077,550 (6.85%), $1,077,550–5,000,000 (9.65%), " +
    "$5,000,000–25,000,000 (10.3%), and above that 10.9%; Married Filing Jointly thresholds roughly double " +
    "through the upper-middle brackets, using the same rates.\n\n" +
    "Income taxes are calculated in a few steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, New York's standard deduction is subtracted from that to get New York taxable " +
    "income, New York's nine bracket rates are applied to the result, and federal income tax plus Social " +
    "Security and Medicare are calculated separately alongside it. This calculator is reviewed and updated " +
    "whenever the IRS or the New York State Department of Taxation and Finance publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and New York's published 2026 bracket schedule and standard deduction for its STATE figures. It " +
    "doesn't account for tax credits, itemized deductions, or every possible W-4/IT-2104 election, so treat it " +
    "as a close estimate rather than an exact paycheck figure — your actual paycheck may vary slightly " +
    "depending on your employer's payroll system.\n\n" +
    "SCOPE NOTE — read this if you live or work in New York City or Yonkers: this calculator models New York " +
    "STATE income tax only. New York City and Yonkers each levy their own additional local income tax on top " +
    "of state tax, and NEITHER is included in the figures this tool produces. This is the same kind of scope " +
    "limitation as Indiana's county income tax or Maryland's county piggyback tax on earlier calculators in " +
    "this series — if you're subject to NYC or Yonkers tax, your real take-home pay will be meaningfully lower " +
    "than what's shown here.\n\n" +
    "New York's standard deduction is: $8,000 for Single filers, $16,050 for Married Filing Jointly filers, " +
    "$8,000 for Married Filing Separately filers, and $11,200 for Head of Household filers, for 2026.\n\n" +
    "Married Filing Separately is modeled as exactly half of the Married Filing Jointly bracket thresholds and " +
    "uses the Single filer's standard deduction; Head of Household uses the Single filer's bracket schedule " +
    "along with its own $11,200 standard deduction — these are documented simplifications rather than New " +
    "York's exact published figures for those statuses.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice, and it does not estimate New York City or Yonkers local income tax. For guidance specific to your " +
    "situation, consult a qualified tax professional or the New York State Department of Taxation and Finance.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), " +
    "with no pre-tax or post-tax deductions, takes home approximately $2,236.13 per paycheck — about " +
    "$58,139.50 for the year — after federal income tax, Social Security, Medicare, and New York STATE income " +
    "tax. Remember: this figure does not include NYC or Yonkers local tax — a filer who lives or works in " +
    "either city would take home less than this.\n\n" +
    "Because New York's nine-bracket schedule climbs steeply at higher incomes — reaching 6.85% above roughly " +
    "$215,000 and topping out at 10.9% above $25,000,000 — New York's state tax burden stays relatively modest " +
    "for many middle-income filers but rises sharply for high earners compared to most other states.";

  const faq = [
    {
      question: "Does New York have a state income tax?",
      answer:
        "Yes. New York taxes income across nine brackets ranging from 3.9% at the lowest bracket up to 10.9% " +
        "at the highest (above $25,000,000 of taxable income), applied after your standard deduction.",
    },
    {
      question: "What are the New York income tax brackets?",
      answer:
        "For Single filers: 3.9% up to $8,500, 4.4% up to $11,700, 5.15% up to $13,900, 5.4% up to $80,650, " +
        "5.9% up to $215,400, 6.85% up to $1,077,550, 9.65% up to $5,000,000, 10.3% up to $25,000,000, and " +
        "10.9% above that. Married Filing Jointly thresholds roughly double through the upper-middle brackets " +
        "(for example, $0–17,150 at 3.9% and $17,150–23,600 at 4.4%), using the same rates.",
    },
    {
      question: "What is New York's standard deduction?",
      answer:
        "$8,000 for Single filers, $16,050 for Married Filing Jointly filers, $8,000 for Married Filing " +
        "Separately filers, and $11,200 for Head of Household filers, for 2026.",
    },
    {
      question: "Does this calculator include New York City or Yonkers tax?",
      answer:
        "No — this calculator models New York STATE income tax only. New York City and Yonkers both levy " +
        "their own separate local income tax on top of the state tax shown here, and neither is included. If " +
        "you live or work in NYC or Yonkers, your actual take-home pay will be lower than this tool's " +
        "estimate.",
    },
    {
      question: "What taxes are actually taken out of a New York paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and New York STATE " +
        "income tax (3.9%–10.9% brackets after your standard deduction) — plus New York City or Yonkers local " +
        "tax if that applies to you, which this calculator does not estimate.",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, " +
        "and this calculator includes all of it for the state level: federal income tax, Social Security, " +
        "Medicare, and New York state income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in New York?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, New " +
        "York STATE income tax, and any deductions you enter — plus NYC or Yonkers local tax if it applies, " +
        "which isn't included here. A single filer earning $75,000 a year, paid biweekly with no deductions " +
        "and outside NYC/Yonkers, takes home approximately $2,236.13 per paycheck.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus New " +
        "York's published 2026 state bracket schedule and standard deduction. It approximates the Married " +
        "Filing Separately and Head of Household bracket schedules, does not include tax credits, itemized " +
        "deductions, or every W-4/IT-2104 adjustment, and — importantly — does not estimate New York City or " +
        "Yonkers local income tax, so your actual withholding may differ, sometimes significantly if you're " +
        "subject to city tax.",
    },
  ];

  const toolContent = {
    title: "New York Income Tax Calculator",
    description:
      "This New York income tax calculator and paycheck tax calculator shows you, in one place, exactly " +
      "what's withheld from your paycheck and what you take home. It covers New York STATE tax only — NOT New " +
      "York City or Yonkers local income tax. Use it as a general tax calculator for New York, a New York " +
      "payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax calculator for " +
      "any pay frequency.",
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
    metaTitle: "New York Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free New York income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll " +
      "tax (FICA), New York STATE income tax, and take-home pay. Does not include NYC or Yonkers local tax.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to New York's row in " +
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
