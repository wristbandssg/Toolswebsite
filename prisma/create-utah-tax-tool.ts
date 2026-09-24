// One-time (but safe to re-run) setup script: creates the Utah Income Tax
// Calculator Tool inside the existing "Tax & Paycheck Calculators" category
// (created by create-nevada-paycheck-tool.ts, or here if that hasn't run
// yet) — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-alabama-tax-tool.ts's structure and template (tool-template-3)
// exactly, per request — same design, different state.
//
// Unlike Nevada, Utah DOES levy a state income tax, so this tool's
// breakdown actually shows a non-zero Utah State Income Tax line. The math
// lives in code, not the database: see
// `customCalculators["utah-tax-calculator"]` in `src/lib/calc-engine.ts`
// for the federal income tax (2026 IRS brackets + standard deduction), FICA
// (Social Security + Medicare), and Utah state income tax (a single flat
// 4.45% rate applied directly to taxable wages, used as a federal-AGI
// proxy, with NO Utah standard deduction or personal exemption subtracted
// first — figures sourced from an EY tax alert on Utah's 2026 rate cut and
// Utah's own TC-40 return instructions) calculation. This script only wires
// up the Tool row so the public page has a title, input form, and content
// around that calculation.
//
// Unlike Alabama, Utah has no dependent-based exemption of any kind, so
// this tool's calcInputs omit the "numberOfDependents" field entirely.
//
// HOW TO RUN
//   npx tsx prisma/create-utah-tax-tool.ts
// or
//   npm run db:create-utah-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "utah-tax-calculator";

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
    { key: "stateIncomeTax", label: "Utah State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Utah income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Utah, this tool covers it: it works out federal income " +
    "tax, Social Security, Medicare, and Utah's state income tax from your salary, all in one place.\n\n" +
    "Enter your annual salary, choose how often you're paid, and select your federal filing status. Add any " +
    "pre-tax deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and " +
    "extra federal withholding if they apply to you — otherwise leave them at $0. Click Calculate to see a full " +
    "breakdown: gross pay, federal income tax, Social Security tax, Medicare tax, Utah state income tax, total " +
    "deductions, and your estimated take-home pay, both per paycheck and for the year.\n\n" +
    "Utah taxes income at a single flat rate of 4.45% for 2026 — its sixth consecutive annual rate cut, down " +
    "from 4.5% in 2025. But the important thing to understand about Utah's system isn't the rate, it's the " +
    "base: Utah's own tax return starts from your FEDERAL ADJUSTED GROSS INCOME (AGI), not your federal taxable " +
    "income, and Utah applies NO standard deduction and NO personal exemption of its own on top of that. That " +
    "makes Utah's state taxable base meaningfully wider than most other states', which typically subtract a " +
    "state-level standard deduction before applying their rate.\n\n" +
    "Income taxes are calculated in four steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, that figure is used directly (as a proxy for federal AGI) for Utah's flat 4.45% " +
    "rate with nothing further subtracted, federal income tax is calculated separately using the 2026 IRS " +
    "brackets and federal standard deduction, and Social Security and Medicare are calculated separately " +
    "alongside it. This calculator is reviewed and updated whenever the IRS or the Utah State Tax Commission " +
    "publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and Utah's flat 4.45% rate for 2026 (per an EY tax alert on the enacting legislation) for its " +
    "state figures. It doesn't account for tax credits, itemized deductions, or every possible W-4 election, so " +
    "treat it as a close estimate rather than an exact paycheck figure — your actual paycheck may vary slightly " +
    "depending on your employer's payroll system.\n\n" +
    "IMPORTANT: Utah's state tax base is wider than most states' modeled on this site. Utah's TC-40 return " +
    "starts from federal adjusted gross income, not federal taxable income, and Utah subtracts NO standard " +
    "deduction and NO personal exemption at the state level at all. This calculator reflects that by applying " +
    "the 4.45% rate directly to your taxable wages (salary minus pre-tax deductions, used as an AGI proxy) — " +
    "it does NOT subtract a Utah standard deduction, because Utah doesn't have one.\n\n" +
    "NOT MODELED: Utah offsets its wide, deduction-free tax base with a nonrefundable \"Taxpayer Tax Credit,\" " +
    "worth roughly 6% of a federal-exemption-equivalent amount and phased out gradually as income rises above a " +
    "threshold that depends on filing status. It functions similarly to a standard deduction for low-to-middle " +
    "earners, but its exact base isn't cleanly defined after the federal Tax Cuts and Jobs Act eliminated " +
    "personal exemptions, so it isn't modeled here. As a result, a real Utah filer's actual state tax bill will " +
    "typically be somewhat LOWER than this calculator's estimate — especially at lower and middle incomes, " +
    "where the credit is largest relative to income.\n\n" +
    "This calculator has no \"Number of Dependents\" field, because Utah's Taxpayer Tax Credit (the only place " +
    "dependents would matter) isn't modeled — see above.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Utah State " +
    "Tax Commission.";

  const examples =
    "Example: a single filer earning $75,000 a year, paid biweekly (26 paychecks/year), with no pre-tax or " +
    "post-tax deductions, takes home approximately $2,240.58 per paycheck — about $58,255.00 for the year — " +
    "after federal income tax, Social Security, Medicare, and Utah state income tax.\n\n" +
    "Because Utah has no state standard deduction, its flat 4.45% rate applies to essentially all of your " +
    "taxable wages rather than to a smaller taxable-income figure — but remember that this estimate leaves out " +
    "Utah's Taxpayer Tax Credit, so an actual Utah filer in this situation would likely owe somewhat less than " +
    "the $128.37 per paycheck shown here.";

  const faq = [
    {
      question: "Does Utah have a state income tax?",
      answer:
        "Yes. Utah taxes income at a single flat rate of 4.45% for 2026, applied to a base that starts from " +
        "federal adjusted gross income rather than federal taxable income.",
    },
    {
      question: "What is Utah's income tax rate?",
      answer:
        "A flat 4.45% for 2026 — the same rate for every filing status and every income level. This is Utah's " +
        "sixth consecutive annual rate cut, down from 4.5% in 2025, effective retroactively to January 1, 2026.",
    },
    {
      question: "What is Utah's standard deduction?",
      answer:
        "Utah doesn't have one. Unlike most states with an income tax, Utah applies its flat rate directly to a " +
        "base built from federal adjusted gross income, with no state-level standard deduction and no personal " +
        "exemption subtracted first.",
    },
    {
      question: "Does Utah have any credit similar to a standard deduction?",
      answer:
        "Yes — Utah's nonrefundable \"Taxpayer Tax Credit\" approximates the value of a standard deduction for " +
        "low-to-middle earners, phasing out as income rises. It isn't modeled in this calculator, so real Utah " +
        "filers typically owe somewhat less than this tool's estimate, especially at lower and middle incomes.",
    },
    {
      question: "What taxes are actually taken out of a Utah paycheck?",
      answer:
        "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus " +
        "an extra 0.9% on wages above a threshold that depends on your filing status), and Utah state income " +
        "tax (a flat 4.45% of a federal-AGI-based amount).",
    },
    {
      question: "Is this a payroll tax calculator too, not just income tax?",
      answer:
        "Yes — \"payroll tax\" covers Social Security and Medicare (FICA) as well as income tax withholding, " +
        "and this calculator includes all of it: federal income tax, Social Security, Medicare, and Utah state " +
        "income tax, all in the same breakdown.",
    },
    {
      question: "What is my after-tax (take-home) pay in Utah?",
      answer:
        "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Utah " +
        "state income tax, and any deductions you enter. Because this calculator doesn't model Utah's Taxpayer " +
        "Tax Credit, your actual take-home pay in Utah may be a bit higher than this estimate shows.",
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using 2026 IRS federal tax brackets and standard deduction amounts, plus Utah's flat " +
        "4.45% rate applied to a federal-AGI-based figure. It doesn't include Utah's Taxpayer Tax Credit, " +
        "itemized deductions, or every W-4/TC-40 adjustment, so your actual withholding — and your actual Utah " +
        "tax bill — will typically be somewhat lower than shown here.",
    },
  ];

  const toolContent = {
    title: "Utah Income Tax Calculator",
    description:
      "This Utah income tax calculator and paycheck tax calculator shows you, in one place, exactly what's " +
      "withheld from your paycheck and what you take home. Use it as a general tax calculator for Utah, a Utah " +
      "payroll tax calculator for federal withholding, FICA, and state tax, or a salary tax calculator for any " +
      "pay frequency.",
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
    metaTitle: "Utah Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Utah income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll tax " +
      "(FICA), Utah's flat state income tax, and take-home pay.",
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
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Utah's row in " +
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
