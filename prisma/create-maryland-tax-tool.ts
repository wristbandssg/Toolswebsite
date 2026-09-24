// One-time (but safe to re-run) setup script: creates the Maryland Income
// Tax Calculator Tool inside the existing "Tax & Paycheck Calculators"
// category — input fields, the multi-line breakdown result config,
// instructions/examples/FAQ, and SEO meta. Mirrors
// create-nevada-paycheck-tool.ts / create-alabama-tax-tool.ts's structure
// and template (tool-template-3) exactly, per the established pattern.
//
// Maryland taxes income through a 10-bracket progressive STATE schedule
// (2% up to 6.5%), sourced exactly for all four filing statuses: Maryland
// groups Single with Married Filing Separately (one schedule) and Married
// Filing Jointly with Head of Household (a wider schedule) — confirmed
// directly from the Maryland Comptroller's own tax alert, not an
// approximation. PLUS a standard deduction and a $3,200-per-exemption
// personal exemption (self, spouse if MFJ, each dependent) — so this tool
// keeps the "Number of Dependents" input field. IMPORTANT: this is the
// STATE tax only — Maryland also levies a mandatory county/Baltimore City
// "piggyback" local income tax (roughly 2.25%-3.30% depending on where you
// live) that is NOT modeled here, the same scope limitation as Indiana's
// county tax, documented explicitly in the Assumptions text below. Sourced
// from the Maryland Comptroller's official tax alert PDF and 2026
// withholding tax facts sheet (marylandcomptroller.gov).
//
// The actual math lives in code, not the database: see
// `customCalculators["maryland-tax-calculator"]` in
// `src/lib/calc-engine.ts`. This script only wires up the Tool row so the
// public page has a title, input form, and content around that
// calculation.
//
// HOW TO RUN
//   npx tsx prisma/create-maryland-tax-tool.ts
// or
//   npm run db:create-maryland-tool

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "maryland-tax-calculator";

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
    { key: "annualSalary", label: "Annual Salary", type: "currency", unit: "USD/year", required: true, min: 0, max: 300000, step: 1000 },
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
    { key: "numberOfDependents", label: "Number of Dependents", type: "number", required: false, default: 0, min: 0, max: 10, step: 1 },
    { key: "preTaxDeductions", label: "Pre-Tax Deductions", unit: "per paycheck", type: "currency", required: false, default: 0, min: 0 },
    { key: "postTaxDeductions", label: "Post-Tax Deductions", unit: "per paycheck", type: "currency", required: false, default: 0, min: 0 },
    { key: "extraWithholding", label: "Extra Withholding", unit: "per paycheck", type: "currency", required: false, default: 0, min: 0 },
  ];

  const calcResults = [
    { key: "grossPayPerPeriod", label: "Gross Pay (per paycheck)", format: "currency" },
    { key: "federalIncomeTax", label: "Federal Income Tax (per paycheck)", format: "currency" },
    { key: "socialSecurityTax", label: "Social Security Tax (per paycheck)", format: "currency" },
    { key: "medicareTax", label: "Medicare Tax (per paycheck)", format: "currency" },
    { key: "stateIncomeTax", label: "Maryland State Income Tax", format: "currency" },
    { key: "totalDeductions", label: "Total Taxes & Deductions (per paycheck)", format: "currency" },
    { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
    { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
  ];

  const instructions =
    "Whether you're looking for a Maryland income tax calculator, a paycheck tax calculator, a payroll tax " +
    "calculator, or just a general tax calculator for Maryland, this tool covers it: it works out federal " +
    "income tax, Social Security, Medicare, and Maryland's STATE income tax from your salary, all in one " +
    "place.\n\n" +
    "Enter your annual salary, choose how often you're paid, select your federal filing status, and enter " +
    "how many dependents you claim. Add any pre-tax deductions (like 401(k) contributions or health " +
    "insurance premiums), post-tax deductions, and extra federal withholding if they apply to you — " +
    "otherwise leave them at $0. Click Calculate to see a full breakdown: gross pay, federal income tax, " +
    "Social Security tax, Medicare tax, Maryland state income tax, total deductions, and your estimated " +
    "take-home pay, both per paycheck and for the year.\n\n" +
    "Maryland taxes income through ten brackets — 2% up to 6.5% — after subtracting a standard deduction and " +
    "a $3,200 personal exemption for yourself, your spouse (if filing jointly), and each dependent. " +
    "Maryland also levies a mandatory county or Baltimore City \"piggyback\" local income tax on top of the " +
    "state tax shown here — see the note below.\n\n" +
    "Income taxes are calculated in four steps: taxable wages are worked out by subtracting your pre-tax " +
    "deductions from gross pay, Maryland's standard deduction and personal exemptions are subtracted from " +
    "that to get Maryland taxable income, the 2%-6.5% state brackets are applied to that, and federal income " +
    "tax plus Social Security and Medicare are calculated separately alongside it. This calculator is " +
    "reviewed and updated whenever the IRS or the Maryland Comptroller publish new annual figures.";

  const assumptions =
    "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction for its federal " +
    "figures, and the Maryland Comptroller's published 2026 state brackets, standard deduction, and personal " +
    "exemption for its state figures. It doesn't account for tax credits, itemized deductions, or every " +
    "possible W-4/MW507 election, so treat it as a close estimate rather than an exact paycheck figure — " +
    "your actual paycheck may vary slightly depending on your employer's payroll system.\n\n" +
    "IMPORTANT: this calculator shows Maryland STATE income tax only. Every Maryland county (and Baltimore " +
    "City) also levies its own mandatory \"piggyback\" local income tax on top of the state tax — typically " +
    "2.25% to 3.30% depending on where you live — which is NOT included in the figures above, since it " +
    "varies by county and this is a statewide calculator (the same scope limitation as Indiana's county " +
    "tax). Your actual total tax will be higher than shown here once your county's local tax is added.\n\n" +
    "Maryland's $3,200 personal exemption also phases out for higher earners (above $100,000 of federal " +
    "adjusted gross income); this calculator applies the full exemption at every income level rather than " +
    "modeling that phase-out.\n\n" +
    "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are " +
    "assumed to reduce wages for federal income tax, FICA, AND Maryland state income tax alike — some " +
    "deduction types only reduce some of these, which this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified tax professional or the Maryland " +
    "Comptroller.";

  const examples =
    "Example: a single filer with no dependents earning $75,000 a year, paid biweekly (26 paychecks/year), " +
    "with no pre-tax or post-tax deductions, takes home approximately $2,245.91 per paycheck — about " +
    "$58,393.63 for the year — after federal income tax, Social Security, Medicare, and Maryland STATE " +
    "income tax (before any county piggyback tax, which isn't modeled here — see the note above).\n\n" +
    "Because Maryland's county piggyback tax is mandatory and can add another 2.25% to 3.30% on top of the " +
    "state brackets shown here, your actual take-home pay will typically be somewhat lower than this " +
    "calculator's estimate — check your county's rate for the full picture.";

  const faq = [
    { question: "Does Maryland have a state income tax?", answer: "Yes — Maryland taxes income through ten brackets ranging from 2% to 6.5%, plus a mandatory local (county) income tax on top." },
    { question: "Does this calculator include Maryland's county tax?", answer: "No — this calculator shows Maryland STATE income tax only. Every Maryland county and Baltimore City also levies its own local \"piggyback\" tax (roughly 2.25%-3.30%), which isn't modeled here since it varies by where you live." },
    { question: "What is Maryland's state income tax rate?", answer: "It ranges from 2% on the first $1,000 of taxable income up to 6.5% on income over $1,000,000 (Single/MFS) or $1,200,000 (MFJ/HoH), across ten brackets." },
    { question: "What is Maryland's standard deduction?", answer: "$3,350 for Single and Married Filing Separately filers, and $6,700 for Married Filing Jointly and Head of Household, for 2025 and beyond." },
    { question: "What is Maryland's personal exemption?", answer: "$3,200 per exemption — one for yourself, one more if filing jointly, and one for each dependent — though it phases out above $100,000 of federal adjusted gross income (not modeled in this calculator)." },
    { question: "What taxes are actually taken out of a Maryland paycheck?", answer: "Federal income tax, Social Security tax (6.2% up to the annual wage base), Medicare tax (1.45%, plus an extra 0.9% on higher wages), Maryland state income tax, and a county/city local income tax not shown here." },
    { question: "What is my after-tax (take-home) pay in Maryland?", answer: "Your after-tax pay is your gross salary minus federal income tax, Social Security, Medicare, Maryland state income tax, your county's local tax (not included here), and any deductions you enter." },
    { question: "How accurate is this calculator?", answer: "It's an estimate of Maryland STATE tax only, using 2026 IRS federal tax brackets plus Maryland's published state brackets, standard deduction, and personal exemption. It excludes county/local tax and the exemption phase-out, so your actual withholding will differ." },
  ];

  const toolContent = {
    title: "Maryland Income Tax Calculator",
    description:
      "This Maryland income tax calculator and paycheck tax calculator shows you, in one place, exactly " +
      "what's withheld from your paycheck and what you take home. Use it as a general tax calculator for " +
      "Maryland, a Maryland payroll tax calculator for federal withholding, FICA, and STATE tax, or a salary " +
      "tax calculator for any pay frequency and number of dependents — note this tool covers Maryland's " +
      "state tax only, not county local tax.",
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
    metaTitle: "Maryland Income Tax Calculator (2026) — Paycheck & Payroll Tax",
    metaDescription:
      "Free Maryland income tax calculator and paycheck tax calculator. Estimate federal income tax, payroll " +
      "tax (FICA), Maryland state income tax, and take-home pay.",
    schemaType: "SoftwareApplication",
  };

  const existing = await prisma.tool.findUnique({ where: { slug: SLUG } });

  if (existing) {
    await prisma.tool.update({
      where: { slug: SLUG },
      data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
    });
    console.log(`Updated the "${SLUG}" tool's content.`);
  } else {
    await prisma.tool.create({
      data: { slug: SLUG, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
    });
    console.log(`Created the "${SLUG}" tool (status: draft).`);
  }

  console.log(
    "Open it in /admin/tools, review it, then set Status to Published when you're happy with it. " +
      "Its live URL will be /tools/" + SLUG + ". Once published, link it to Maryland's row in " +
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
