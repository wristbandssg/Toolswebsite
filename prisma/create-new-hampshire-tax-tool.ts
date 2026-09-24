// One-time (but safe to re-run) setup script: creates the New Hampshire
// Income Tax Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category (created by create-nevada-paycheck-tool.ts, or here if that
// hasn't run yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-alabama-tax-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Like Nevada, New Hampshire does NOT levy a state income tax on wages, so
// this tool's breakdown always shows a $0.00 New Hampshire State Income Tax
// line. The math lives in code, not the database: see
// `customCalculators["new-hampshire-tax-calculator"]` in
// `src/lib/calc-engine.ts`, which is a direct alias of the Nevada
// federal+FICA-only calculator (`newHampshireTaxCalculator =
// nevadaTaxCalculator`) — federal income tax (2026 IRS brackets + standard
// deduction) and FICA (Social Security + Medicare) only, per the New
// Hampshire Department of Revenue Administration's confirmation that New
// Hampshire's old Interest & Dividends ("I&D") Tax was fully repealed for
// taxable periods beginning after December 31, 2024. This script only wires
// up the Tool row so the public page has a title, input form, and content
// around that calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-new-hampshire-tax-tool.ts
// or
//   npm run db:create-new-hampshire-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "new-hampshire-tax-calculator";

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
    { key: "stateIncomeTax", label: "New Hampshire State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a New Hampshire income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for New Hampshire, this tool covers it: it works out federal " +
    "income tax, Social Security, and Medicare from your salary, all in one place — and confirms that New " +
    "Hampshire itself adds nothing to that bill.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and extra " +
    "federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a full " +
    "breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, New Hampshire state income tax " +
    "(always $0), total deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "New Hampshire has no state income tax on wages, in the same category as states like Nevada, Alaska, and " +
    "Florida. New Hampshire did, until recently, tax interest and dividend income separately through its " +
    "Interest & Dividends (\"I&D\") Tax, but that tax was fully repealed for taxable periods beginning after " +
    "December 31, 2024 — so as of 2026, New Hampshire has zero state-level income tax of any kind, on wages or " +
    "investment income.\n\n" +
    "Income taxes are calculated in a few steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, federal income tax is calculated from that using the federal standard deduction " +
    "and 2026 IRS brackets, Social Security and Medicare are calculated separately, and New Hampshire's state " +
    "income tax line is set to $0 since the state doesn't tax wages. This calculator is reviewed and updated " +
    "whenever the IRS or the New Hampshire Department of Revenue Administration publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures. It doesn't account for tax credits, itemized deductions, or every possible W-4 election, so treat " +
    "it as a close estimate rather than an exact paycheck figure — your actual paycheck may vary slightly " +
    "depending on your employer's payroll system.\n\n" +
    "New Hampshire's state income tax line is always $0 in this calculator, because New Hampshire doesn't tax " +
    "wage income at the state level. This calculator's New Hampshire figures are computed by the same underlying " +
    "federal-plus-FICA-only calculation used for this series' Nevada calculator.\n\n" +
    "This calculator does not model any New Hampshire tax on interest or dividend income, since that tax (the " +
    "Interest & Dividends Tax) was fully repealed by the state for taxable periods beginning after December 31, " +
    "2024, per the New Hampshire Department of Revenue Administration's official confirmation — it simply no " +
    "longer applies, so there's nothing to model.\n\n" +
    "New Hampshire does levy other state and local taxes not covered by a wage-based paycheck calculator, " +
    "including one of the country's higher property tax burdens and a state Business Profits Tax and Business " +
    "Enterprise Tax on business income — none of which show up in a wage-and-salary withholding estimate like " +
    "this one.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the New Hampshire " +
    "Department of Revenue Administration.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), with " +
    "no pre-tax or post-tax deductions, takes home approximately $2,368.94 per paycheck — about $61,592.50 for " +
    "the year — after federal income tax, Social Security, and Medicare (with $0 New Hampshire state income " +
    "tax).\n\n" +
    "Because New Hampshire has no wage income tax at all — and, as of 2026, no Interest & Dividends Tax either, " +
    "following its full repeal — a New Hampshire worker's take-home pay is determined entirely by federal income " +
    "tax and FICA, making it noticeably higher than the take-home pay of an identical earner in most other " +
    "states.";

  const faq = [
    {
      question: "Does New Hampshire have a state income tax?",
      answer:
        "No. New Hampshire doesn't tax wage or salary income at the state level, and as of 2026 it no longer " +
        "taxes interest or dividend income either, following the full repeal of its old Interest & Dividends " +
        "Tax for taxable periods beginning after December 31, 2024.",
    },
    {
      question: "What are the New Hampshire income tax brackets?",
      answer:
        "There aren't any — New Hampshire has no state income tax on wages, so there's no bracket schedule to " +
        "apply. Your paycheck is reduced only by federal income tax and FICA (Social Security and Medicare).",
    },
    {
      question: "Didn't New Hampshire used to tax interest and dividends?",
      answer:
        "Yes, through its Interest & Dividends (\"I&D\") Tax, but that tax was fully repealed for taxable " +
        "periods beginning after December 31, 2024, per the New Hampshire Department of Revenue Administration. " +
        "As of 2026, New Hampshire has zero state-level income tax of any kind.",
    },
    {
      question: "If there's no state income tax, how does New Hampshire raise revenue?",
      answer:
        "Primarily through property taxes, which are among the higher property tax burdens in the country, plus " +
        "a state Business Profits Tax and Business Enterprise Tax on business income — none of which show up on " +
        "an individual wage-and-salary paycheck.",
    },
    {
      question: "What taxes are actually taken out of a New Hampshire paycheck?",
      answer:
        "Federal income tax and FICA only — Social Security tax (6.2% up to the annual wage base) and Medicare " +
        "tax (1.45%, plus an extra 0.9% on wages above a threshold that depends on your filing status). There's " +
        "no New Hampshire state income tax withholding at all.",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, and " +
        "this calculator includes all of it: federal income tax, Social Security, and Medicare, with New " +
        "Hampshire's state income tax line always shown as $0.",
    },
    {
      question: "What is my after-tax (take-home) pay in New Hampshire?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, and any " +
        "deductions you enter — nothing is withheld for New Hampshire state income tax, since the state doesn't " +
        "levy one on wages.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts. It doesn't " +
        "include tax credits, itemized deductions, or every W-4 adjustment — so your actual withholding may " +
        "differ slightly — but since New Hampshire has no wage income tax, there's no state-tax complexity to " +
        "add uncertainty here.",
    },
  ];

  const toolContent = {
    title: "New Hampshire Income Tax Calculator",
    description:
      "This New Hampshire income tax calculator and paycheck tax calculator shows you, in one place, exactly " +
      "what's withheld from your paycheck and what you take home — including confirming that New Hampshire " +
      "itself levies no state income tax on wages. Use it as a general tax calculator for New Hampshire, a New " +
      "Hampshire payroll tax calculator for federal withholding and FICA, or a salary tax calculator for any pay " +
      "frequency.",
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
    metaTitle: "New Hampshire Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free New Hampshire income tax calculator and paycheck tax calculator. Estimate federal income tax, " +
      "payroll tax (FICA), New Hampshire state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to New Hampshire's row in " +
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
