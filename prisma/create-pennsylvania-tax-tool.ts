// One-time (but safe to re-run) setup script: creates the Pennsylvania
// Income Tax Calculator Tool inside the existing "Tax & Paycheck
// Calculators" category (created by create-nevada-paycheck-tool.ts, or here
// if that hasn't run yet) — input fields, the multi-line breakdown result
// config, instructions/examples/FAQ, and SEO meta. Mirrors
// create-alabama-tax-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Like Alabama, Pennsylvania DOES levy a state income tax, so this tool's
// breakdown actually shows a non-zero Pennsylvania State Income Tax line —
// but Pennsylvania's is the simplest model in this whole series: a flat
// 3.07% rate, in effect since 2004, with NO standard deduction and NO
// personal exemption of any kind. The math lives in code, not the
// database: see `customCalculators["pennsylvania-tax-calculator"]` in
// `src/lib/calc-engine.ts` for the federal income tax (2026 IRS brackets +
// standard deduction), FICA (Social Security + Medicare), and Pennsylvania
// flat 3.07% state income tax calculation — figures sourced from the
// Pennsylvania Department of Revenue's official individual income tax rate
// history page. This script only wires up the Tool row so the public page
// has a title, input form, and content around that calculation.
//
// IMPORTANT: this tool covers Pennsylvania STATE tax only. It does not
// include Philadelphia's separate local Wage Tax (or other Pennsylvania
// municipalities'/school districts' local Earned Income Tax) — see the
// prominent callouts in this script's Instructions and Assumptions text.
//
// HOW TO RUN
//   npx tsx prisma/create-pennsylvania-tax-tool.ts
// or
//   npm run db:create-pennsylvania-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "pennsylvania-tax-calculator";

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
    { key: "stateIncomeTax", label: "Pennsylvania State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Pennsylvania income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Pennsylvania, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and Pennsylvania's state income tax from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, select your federal filing status, and add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and extra " +
    "federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a full " +
    "breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Pennsylvania state income tax, " +
    "total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "Pennsylvania's personal income tax is the simplest model in this whole series: a single flat rate of " +
    "3.07%, applied directly to your taxable wages, with no standard deduction and no personal exemption of any " +
    "kind — every dollar of Pennsylvania taxable wages is taxed at the same 3.07% rate, regardless of filing " +
    "status or income level. IMPORTANT: this calculator covers Pennsylvania STATE income tax only — it does NOT " +
    "include Philadelphia's separate local Wage Tax, a substantial additional tax that Philadelphia residents, " +
    "and many people who work in Philadelphia without living there, owe on top of the state's 3.07%. If that " +
    "applies to you, budget for a meaningfully lower real take-home pay than the number shown here.\n\n" +
    "Income taxes here are calculated in three steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Pennsylvania's flat 3.07% rate is applied directly to that figure with no " +
    "deduction or exemption to subtract first, and federal income tax plus Social Security and Medicare are " +
    "calculated separately alongside it. This calculator is reviewed and updated whenever the IRS or the " +
    "Pennsylvania Department of Revenue publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the Pennsylvania Department of Revenue's confirmed flat 3.07% rate — in effect since 2004 — " +
    "for its state figures. It doesn't account for tax credits or every possible W-4 election, so treat it as a " +
    "close estimate rather than an exact paycheck figure — your actual paycheck may vary slightly depending on " +
    "your employer's payroll system.\n\n" +
    "Most importantly: this calculator does NOT include Philadelphia's local Wage Tax, a separate tax charged " +
    "by the City of Philadelphia on top of Pennsylvania's state income tax. If you live in Philadelphia, or " +
    "work there without living there, you owe this local tax in addition to the 3.07% shown here — it is not a " +
    "small add-on, and Philadelphia-area filers should expect their real take-home pay to be lower than this " +
    "calculator's estimate. Many other Pennsylvania municipalities and school districts also levy their own, " +
    "smaller local Earned Income Tax, which likewise isn't modeled here.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Pennsylvania state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This calculator doesn't include a dependents field or a standard deduction/exemption field, because " +
    "Pennsylvania's personal income tax doesn't have either — its flat 3.07% rate applies the same way " +
    "regardless of filing status, income level, or number of dependents.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Pennsylvania " +
    "Department of Revenue.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), with " +
    "no pre-tax or post-tax deductions, takes home approximately $2,280.38 per paycheck — about $59,290.00 for " +
    "the year — after federal income tax, Social Security, Medicare, and Pennsylvania state income tax.\n\n" +
    "Because Pennsylvania's 3.07% rate applies with no standard deduction and no personal exemption, this " +
    "state-only estimate is simple to reproduce by hand: it's just 3.07% of taxable wages. Remember that this " +
    "example excludes Philadelphia's local Wage Tax — a Philadelphia resident or worker earning the same " +
    "$75,000 would take home meaningfully less than the $2,280.38 shown here once that local tax is added.";

  const faq = [
    {
      question: "Does Pennsylvania have a state income tax?",
      answer:
        "Yes. Pennsylvania taxes income at a single flat rate of 3.07%, in effect since 2004, with no standard " +
        "deduction and no personal exemption of any kind.",
    },
    {
      question: "What is the Pennsylvania income tax rate?",
      answer:
        "A flat 3.07% on all taxable wages, regardless of filing status or income level — the same rate for " +
        "everyone.",
    },
    {
      question: "Does Pennsylvania have a standard deduction or personal exemption?",
      answer:
        "No. Unlike most states, Pennsylvania's personal income tax has neither a standard deduction nor a " +
        "personal exemption — the flat 3.07% rate is applied directly to taxable wages.",
    },
    {
      question: "Does this calculator include Philadelphia's Wage Tax?",
      answer:
        "No. This calculator covers Pennsylvania STATE income tax only. Philadelphia charges its own separate " +
        "local Wage Tax on top of the state's 3.07%, which residents and many people who work in Philadelphia " +
        "owe in addition. If that applies to you, your real take-home pay will be lower than this calculator's " +
        "estimate — budget for the Philadelphia Wage Tax separately.",
    },
    {
      question: "What taxes are actually taken out of a Pennsylvania paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and Pennsylvania's flat " +
        "3.07% state income tax — plus, for many Philadelphia-area workers, the separate local Wage Tax this " +
        "calculator doesn't include.",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, Medicare, and Pennsylvania " +
        "state income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in Pennsylvania?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, " +
        "Pennsylvania's flat 3.07% state income tax, and any deductions you enter. Because there's no standard " +
        "deduction or exemption to subtract first, the state-tax portion of this math is simpler here than in " +
        "almost any other state — but remember it excludes Philadelphia's local Wage Tax if that applies to " +
        "you.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus " +
        "Pennsylvania's confirmed flat 3.07% state rate. It doesn't include tax credits, itemized deductions, " +
        "every W-4 adjustment, or any local Pennsylvania taxes such as Philadelphia's Wage Tax — so your actual " +
        "withholding and take-home pay may differ, sometimes substantially if you're subject to a local tax.",
    },
  ];

  const toolContent = {
    title: "Pennsylvania Income Tax Calculator",
    description:
      "This Pennsylvania income tax calculator and paycheck tax calculator shows you, in one place, exactly " +
      "what's withheld from your paycheck and what you take home from Pennsylvania's flat 3.07% state tax. Use " +
      "it as a general tax calculator for Pennsylvania, a Pennsylvania payroll tax calculator for federal " +
      "withholding, FICA, and state tax, or a salary tax calculator for any pay frequency and filing status. " +
      "Note: it covers Pennsylvania state tax only, not Philadelphia's separate local Wage Tax.",
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
    metaTitle: "Pennsylvania Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Pennsylvania income tax calculator and paycheck tax calculator. Estimate federal income tax, " +
      "payroll tax (FICA), Pennsylvania's flat state income tax, and take-home pay. Excludes Philadelphia's " +
      "local Wage Tax.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Pennsylvania's row in " +
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
