// One-time (but safe to re-run) batch setup script: creates all 30 of the
// US-federal "Tax Calculators" tools (Income Tax family + Salary Tax
// family), filed DIRECTLY under the "Tax Calculators" category — the same
// category that already holds 12 country/state sub-categories (Australia,
// Canada, ..., UK, and the 50-state "Tax & Paycheck Calculators" group; see
// prisma/reparent-tool-categories-under-finance.ts). A category can now
// hold both sub-categories and its own tools at once — see the updated
// /tools/category/[slug] page — so these 30 sit alongside those 12 rather
// than needing a category of their own.
//
// These are a NATIONAL-BASELINE complement to the 50 state calculators in
// calc-engine-us.ts: federal income tax + FICA only, no state tax line, for
// a visitor who wants a quick federal-only answer without picking a state.
//
// One script for all 30 (rather than 30 separate files, like every other
// country/state calculator) because most of them are thin SEO/framing
// variants sharing one of a small number of underlying calculations — see
// src/lib/calc-engine-us-tax-salary-calculators.ts for the actual math and
// which of its 14 exported functions each of these 30 slugs maps to.
//
// HOW TO RUN
//   npx tsx prisma/create-us-tax-salary-calculators.ts
// or
//   npm run db:create-us-tax-salary-tools
//
// Every tool is created with status "draft" (or left as-is if it already
// exists and was published) — review each one in /admin/tools and publish
// when you're happy with it, same as every other calculator on this site.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "tax-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

// ---------------------------------------------------------------------------
// Shared field building blocks
// ---------------------------------------------------------------------------

const filingStatusField = {
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
};

const payFrequencyField = {
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
};

function currencyField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 500000,
    step: opts.step ?? 500,
  };
}

const preTaxField = currencyField("preTaxDeductions", "Pre-Tax Deductions", {
  unit: "per paycheck",
  required: false,
});
const postTaxField = currencyField("postTaxDeductions", "Post-Tax Deductions", {
  unit: "per paycheck",
  required: false,
});
const extraWithholdingField = currencyField("extraWithholding", "Extra Withholding", {
  unit: "per paycheck",
  required: false,
});

const paycheckResultLines = [
  { key: "grossPayPerPeriod", label: "Gross Pay (per paycheck)", format: "currency" },
  { key: "federalIncomeTax", label: "Federal Income Tax (per paycheck)", format: "currency" },
  { key: "socialSecurityTax", label: "Social Security Tax (per paycheck)", format: "currency" },
  { key: "medicareTax", label: "Medicare Tax (per paycheck)", format: "currency" },
  { key: "totalDeductions", label: "Total Taxes Withheld (per paycheck)", format: "currency" },
  { key: "netPayPerPeriod", label: "Your Take-Home Pay (per paycheck)", format: "currency", highlight: true },
  { key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency" },
];

// ---------------------------------------------------------------------------
// Reusable assumptions / FAQ blocks — used verbatim (or with light,
// programmatic word-swaps) by every tool that shares the same underlying
// engine, since the underlying math, limitations, and sourcing really ARE
// identical from one to the next. Per-tool instructions/examples still vary
// tool to tool so each page reads as its own thing, not a copy-paste.
// ---------------------------------------------------------------------------

const FEDERAL_ONLY_ASSUMPTIONS =
  "This calculator uses 2026 IRS federal tax brackets and the federal standard deduction — it doesn't include " +
  "state or local income tax, so if you live somewhere that taxes income, your actual take-home number will be " +
  "lower than this federal-only estimate. It also doesn't account for itemized deductions, tax credits (like the " +
  "Child Tax Credit), or every possible W-4 election, so treat the result as a close planning estimate rather " +
  "than an exact figure.\n\n" +
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. For guidance specific to your situation, consult a qualified tax professional or the IRS.";

const PAYCHECK_ASSUMPTIONS =
  "This calculator uses 2026 IRS federal tax brackets, the federal standard deduction, and the 2026 Social " +
  "Security wage base for its federal income tax and FICA figures. It's a federal-only, national-baseline " +
  "estimate — it doesn't include any state or local income tax, so if you live in a state that taxes income " +
  "your real paycheck will show an extra deduction this tool doesn't. It also doesn't account for tax credits, " +
  "itemized deductions, or every W-4 election.\n\n" +
  "Pre-tax deductions you enter (like traditional 401(k) contributions or health insurance premiums) are assumed " +
  "to reduce wages for federal income tax AND FICA alike, which is the common case for a cafeteria-plan/Section " +
  "125-style deduction.\n\n" +
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. For guidance specific to your situation, consult a qualified tax professional or the IRS.";

const FEDERAL_FAQ_BASICS = [
  {
    question: "Does this include state income tax?",
    answer:
      "No — this is a federal-only calculator. It covers federal income tax and FICA (Social Security and " +
      "Medicare), the same way for every state. If you want a state-specific number too, this site also has a " +
      "dedicated calculator for each state under Tax Calculators.",
  },
  {
    question: "What tax year does this use?",
    answer:
      "2026 — the current IRS federal income tax brackets, standard deduction amounts, and Social Security wage " +
      "base. It's reviewed and updated whenever the IRS publishes new annual figures.",
  },
  {
    question: "How accurate is this calculator?",
    answer:
      "It's a close estimate using the federal standard deduction only — no itemizing, no tax credits like the " +
      "Child Tax Credit, and no state or local tax. Your actual return or paycheck may differ slightly depending " +
      "on your full financial picture.",
  },
];

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const incomeTaxInputs = (label = "Annual Gross Income") => [
  currencyField("grossIncome", label, { unit: "per year", max: 1000000, step: 1000 }),
  filingStatusField,
];

const incomeTaxResultLines = [
  { key: "standardDeduction", label: "Standard Deduction", format: "currency" },
  { key: "taxableIncome", label: "Taxable Income", format: "currency" },
  { key: "federalTax", label: "Federal Income Tax Owed", format: "currency", highlight: true },
  { key: "effectiveRate", label: "Effective Tax Rate", format: "percentage" },
  { key: "marginalRate", label: "Marginal Tax Rate (Top Bracket)", format: "percentage" },
  { key: "afterTaxIncome", label: "Income After Federal Tax", format: "currency" },
];

const TOOLS: ToolDef[] = [
  // ---------------------------------------------------------------------
  // Income Tax family
  // ---------------------------------------------------------------------
  {
    slug: "income-tax-calculator",
    title: "Income Tax Calculator",
    description:
      "Estimate your 2026 US federal income tax from your annual gross income and filing status — see your " +
      "taxable income, tax owed, effective rate, and take-home amount in one breakdown.",
    metaTitle: "Income Tax Calculator (2026) — Free US Federal Tax Estimate",
    metaDescription:
      "Free income tax calculator using 2026 IRS federal brackets and the standard deduction. Enter your income " +
      "and filing status to see your taxable income, tax owed, and effective tax rate.",
    calcInputs: incomeTaxInputs(),
    calcResult: { label: "Federal Income Tax", format: "currency" },
    calcResults: incomeTaxResultLines,
    instructions:
      "Enter your annual gross income and choose your federal filing status, then click Calculate. This tool " +
      "applies the 2026 IRS standard deduction to find your taxable income, then runs that through the current " +
      "seven federal tax brackets to work out your total federal income tax, your effective tax rate (tax " +
      "divided by gross income), and your marginal rate (the rate on your last dollar earned).\n\n" +
      "It's a general-purpose federal income tax calculator — use it for a quick planning estimate before filing, " +
      "to compare how a raise or bonus affects your tax bill, or just to understand how the bracket system " +
      "actually works.",
    examples:
      "Example: a single filer with $85,000 in gross income has a 2026 standard deduction of $16,100, leaving " +
      "$68,900 in taxable income. Running that through the brackets gives a federal tax bill of roughly $9,870 — " +
      "an effective rate of about 11.6%, even though their marginal (top) bracket is 22%.",
    assumptions: FEDERAL_ONLY_ASSUMPTIONS,
    faq: [
      {
        question: "What's the difference between my marginal rate and my effective rate?",
        answer:
          "Your marginal rate is the tax rate on your LAST dollar of income — the top bracket you reach. Your " +
          "effective rate is your total tax divided by your total income, which is always lower, since only the " +
          "income inside each bracket is taxed at that bracket's rate.",
      },
      {
        question: "Does this use the standard deduction or itemized deductions?",
        answer:
          "The standard deduction only ($16,100 Single/MFS, $32,200 Married Filing Jointly, $24,150 Head of " +
          "Household for 2026). If you itemize, your actual taxable income and tax owed may be lower than this " +
          "estimate.",
      },
      ...FEDERAL_FAQ_BASICS,
    ],
  },
  {
    slug: "individual-income-tax-calculator",
    title: "Individual Income Tax Calculator",
    description:
      "Calculate your 2026 individual federal income tax liability from your gross income and filing status, " +
      "with a full breakdown of taxable income, tax owed, and effective rate.",
    metaTitle: "Individual Income Tax Calculator (2026) — US Federal Tax",
    metaDescription:
      "Estimate your individual federal income tax for 2026 using current IRS brackets and the standard " +
      "deduction. See taxable income, tax owed, and your effective and marginal rates.",
    calcInputs: incomeTaxInputs(),
    calcResult: { label: "Federal Income Tax", format: "currency" },
    calcResults: incomeTaxResultLines,
    instructions:
      "This individual income tax calculator is built for a single tax filer working out their own federal tax " +
      "liability — enter your annual gross income and filing status, and it applies the 2026 standard deduction " +
      "and current IRS bracket rates to show exactly what you'd owe.\n\n" +
      "The breakdown separates your taxable income (after the standard deduction) from your final tax bill, and " +
      "shows both your effective rate (what you actually pay as a share of gross income) and your marginal rate " +
      "(the bracket your next dollar would fall into) side by side.",
    examples:
      "Example: an individual filing Head of Household with $60,000 in gross income gets a $24,150 standard " +
      "deduction, leaving $35,850 in taxable income and a federal tax bill of about $3,948 — an effective rate " +
      "close to 6.6%.",
    assumptions: FEDERAL_ONLY_ASSUMPTIONS,
    faq: [
      {
        question: "Is this the same as a 'how much tax will I pay' calculator?",
        answer:
          "Yes — it answers exactly that question for federal income tax, using your gross income and filing " +
          "status to walk through the standard deduction and current brackets to a final number.",
      },
      {
        question: "Can I use this if I have multiple income sources?",
        answer:
          "Yes — just add up all your taxable income sources (wages, freelance income, interest, etc.) into one " +
          "gross income figure. For a more detailed look at how a specific extra income source affects your tax, " +
          "this site also has dedicated Rental, Investment, and Foreign Income Tax Calculators.",
      },
      ...FEDERAL_FAQ_BASICS,
    ],
  },
  {
    slug: "personal-income-tax-calculator",
    title: "Personal Income Tax Calculator",
    description:
      "Free personal income tax calculator for 2026 — enter your annual income and filing status to estimate " +
      "your US federal tax bill, taxable income, and effective tax rate.",
    metaTitle: "Personal Income Tax Calculator (2026) — Free US Estimate",
    metaDescription:
      "Calculate your personal federal income tax for 2026 in seconds. Uses current IRS brackets and the " +
      "standard deduction to estimate your tax bill and effective rate.",
    calcInputs: incomeTaxInputs(),
    calcResult: { label: "Federal Income Tax", format: "currency" },
    calcResults: incomeTaxResultLines,
    instructions:
      "Plug in your annual personal income and filing status to get a fast estimate of your 2026 federal income " +
      "tax. This calculator applies the current standard deduction first, then runs the remaining taxable income " +
      "through the seven federal brackets to arrive at your total tax owed.\n\n" +
      "It's designed for quick personal planning — checking how much of a raise you'll actually keep, comparing " +
      "filing statuses, or just getting a sense of your tax picture before you sit down to file.",
    examples:
      "Example: a Married Filing Jointly couple with $150,000 in combined gross income has a $32,200 standard " +
      "deduction, leaving $117,800 in taxable income and a federal tax bill of roughly $15,340 — an effective " +
      "rate of about 10.2%.",
    assumptions: FEDERAL_ONLY_ASSUMPTIONS,
    faq: [
      {
        question: "Does filing status really change my tax bill this much?",
        answer:
          "Yes — filing status changes both your standard deduction and where each bracket starts. Married " +
          "Filing Jointly brackets are roughly double Single brackets, so the same combined income is usually " +
          "taxed at a lower effective rate filing jointly than two people would pay filing separately.",
      },
      {
        question: "Should I use this or the Taxable Income Calculator?",
        answer:
          "Use this one for your full tax bill (income, deduction, and tax owed in one step). The Taxable Income " +
          "Calculator on this site is for when you only need the taxable-income figure itself, without the tax " +
          "calculation.",
      },
      ...FEDERAL_FAQ_BASICS,
    ],
  },
  {
    slug: "retirement-income-tax-calculator",
    title: "Retirement Income Tax Calculator",
    description:
      "Estimate federal income tax on your retirement income — pension, 401(k)/IRA withdrawals, and other " +
      "taxable retirement income — using 2026 IRS brackets and the standard deduction.",
    metaTitle: "Retirement Income Tax Calculator (2026) — 401(k) & Pension Tax",
    metaDescription:
      "Free retirement income tax calculator. Estimate 2026 federal tax on pension and 401(k)/IRA withdrawal " +
      "income using current IRS brackets and the standard deduction.",
    calcInputs: incomeTaxInputs("Annual Taxable Retirement Income"),
    calcResult: { label: "Federal Income Tax", format: "currency" },
    calcResults: incomeTaxResultLines,
    instructions:
      "Enter your total annual taxable retirement income — pension payments, 401(k) or traditional IRA " +
      "withdrawals, annuity income, and any other retirement income that's subject to federal tax — along with " +
      "your filing status, to estimate the federal income tax due on it.\n\n" +
      "This uses the same standard deduction and bracket math as working income, since retirement withdrawals " +
      "are generally taxed as ordinary income at the federal level. If part of your income is Social Security, " +
      "enter only the portion you already know is taxable (Social Security has its own, separate taxability " +
      "rules this calculator doesn't compute).",
    examples:
      "Example: a retiree filing Single with $45,000 in taxable pension and 401(k) withdrawal income has a " +
      "$16,100 standard deduction, leaving $28,900 in taxable income and a federal tax bill of about $3,220.",
    assumptions:
      FEDERAL_ONLY_ASSUMPTIONS +
      "\n\nThis calculator does not compute how much of your Social Security benefit is taxable — that depends " +
      "on a separate 'provisional income' formula — so if you receive Social Security, only include the portion " +
      "of it you already know is taxable (or leave it out and treat this as pension/401(k)/IRA income only).",
    faq: [
      {
        question: "Is my 401(k) or IRA withdrawal taxed as regular income?",
        answer:
          "Traditional 401(k) and IRA withdrawals are generally taxed as ordinary income at your regular federal " +
          "rates, which is what this calculator estimates. Roth 401(k)/IRA withdrawals are typically tax-free and " +
          "shouldn't be included.",
      },
      {
        question: "Does this calculate tax on my Social Security benefits?",
        answer:
          "No — Social Security taxability depends on a separate income-based formula. Enter only the taxable " +
          "portion of your Social Security if you already know it, or leave it out entirely.",
      },
      ...FEDERAL_FAQ_BASICS,
    ],
  },

  // ---------------------------------------------------------------------
  // Self-employment family
  // ---------------------------------------------------------------------
  {
    slug: "business-income-tax-calculator",
    title: "Business Income Tax Calculator",
    description:
      "Estimate federal tax on your sole proprietorship or self-employment business income for 2026, including " +
      "self-employment tax (Social Security + Medicare) and federal income tax.",
    metaTitle: "Business Income Tax Calculator (2026) — Self-Employment Tax",
    metaDescription:
      "Free business income tax calculator for sole proprietors and self-employed filers. Estimates 2026 " +
      "self-employment tax and federal income tax together.",
    calcInputs: [
      currencyField("netBusinessIncome", "Net Business Income", { unit: "per year", max: 500000, step: 500 }),
      currencyField("otherIncome", "Other Taxable Income", { unit: "per year", max: 500000, step: 500, required: false }),
      filingStatusField,
    ],
    calcResult: { label: "Total Federal Tax", format: "currency" },
    calcResults: [
      { key: "selfEmploymentTax", label: "Self-Employment Tax (Social Security + Medicare)", format: "currency" },
      { key: "halfSeTaxDeduction", label: "Deductible Half of SE Tax", format: "currency" },
      { key: "federalIncomeTax", label: "Federal Income Tax", format: "currency" },
      { key: "totalFederalTax", label: "Total Federal Tax Owed", format: "currency", highlight: true },
      { key: "afterTaxIncome", label: "Income After Federal Tax", format: "currency" },
    ],
    instructions:
      "Enter your net business income (revenue minus business expenses, before tax), any other taxable income, " +
      "and your filing status. This calculator works out self-employment tax first — the 15.3% combined Social " +
      "Security and Medicare tax a sole proprietor pays instead of the employee/employer split a W-2 job would " +
      "have — applied to 92.35% of net business income, then adds federal income tax on top (after deducting " +
      "half the self-employment tax and the standard deduction, exactly as the IRS requires).\n\n" +
      "Use this for a sole proprietorship, single-member LLC, or any self-employment income reported on Schedule " +
      "C, to see your full federal tax picture — not just income tax — in one place.",
    examples:
      "Example: a sole proprietor with $80,000 in net business income and no other income, filing Single, owes " +
      "about $11,304 in self-employment tax and roughly $7,527 in federal income tax after the SE tax deduction " +
      "and standard deduction — a combined federal tax bill of about $18,830.",
    assumptions:
      FEDERAL_ONLY_ASSUMPTIONS +
      "\n\nSelf-employment tax is calculated as 12.4% Social Security (up to the 2026 wage base) plus 2.9% " +
      "Medicare (no cap), applied to 92.35% of net business income, with half of that SE tax deducted before " +
      "computing federal income tax — the standard IRC §1401/§164(f) mechanics. It doesn't account for quarterly " +
      "estimated tax penalties, the Qualified Business Income deduction, or business tax credits.",
    faq: [
      {
        question: "What is self-employment tax?",
        answer:
          "It's the Social Security and Medicare tax self-employed people pay directly (12.4% + 2.9% = 15.3% " +
          "combined), since there's no employer to split it with the way there is on a W-2 paycheck.",
      },
      {
        question: "Can I deduct any of my self-employment tax?",
        answer:
          "Yes — half of your self-employment tax is deductible from your income before federal income tax is " +
          "calculated. This calculator applies that deduction automatically.",
      },
      {
        question: "Does this include the Qualified Business Income (QBI) deduction?",
        answer:
          "No — this is a simplified estimate covering self-employment tax and standard-deduction federal income " +
          "tax only. The QBI deduction could lower your actual federal income tax further depending on your " +
          "situation.",
      },
      ...FEDERAL_FAQ_BASICS.slice(0, 2),
    ],
  },
  {
    slug: "freelancer-income-tax-calculator",
    title: "Freelancer Income Tax Calculator",
    description:
      "Estimate federal tax on your freelance or contract income for 2026, including self-employment tax and " +
      "federal income tax — built for freelancers and independent contractors.",
    metaTitle: "Freelancer Income Tax Calculator (2026) — 1099 Tax Estimate",
    metaDescription:
      "Free freelancer tax calculator for 1099 contractors. Estimates 2026 self-employment tax and federal " +
      "income tax on your freelance income together.",
    calcInputs: [
      currencyField("netBusinessIncome", "Net Freelance Income", { unit: "per year", max: 500000, step: 500 }),
      currencyField("otherIncome", "Other Taxable Income", { unit: "per year", max: 500000, step: 500, required: false }),
      filingStatusField,
    ],
    calcResult: { label: "Total Federal Tax", format: "currency" },
    calcResults: [
      { key: "selfEmploymentTax", label: "Self-Employment Tax (Social Security + Medicare)", format: "currency" },
      { key: "halfSeTaxDeduction", label: "Deductible Half of SE Tax", format: "currency" },
      { key: "federalIncomeTax", label: "Federal Income Tax", format: "currency" },
      { key: "totalFederalTax", label: "Total Federal Tax Owed", format: "currency", highlight: true },
      { key: "afterTaxIncome", label: "Income After Federal Tax", format: "currency" },
    ],
    instructions:
      "Built specifically for freelancers and independent contractors paid on a 1099: enter your net freelance " +
      "income (what's left after business expenses), any other taxable income, and your filing status. This " +
      "calculator estimates both halves of your tax bill that a freelancer has to plan for — self-employment tax " +
      "(the 15.3% Social Security and Medicare tax that doesn't get withheld automatically the way a W-2 job's " +
      "does) and federal income tax.\n\n" +
      "Because nothing is withheld from 1099 income automatically, freelancers typically need to set aside money " +
      "for quarterly estimated taxes — this total is a good starting point for figuring out how much.",
    examples:
      "Example: a freelance designer earning $65,000 in net freelance income, filing Single with no other " +
      "income, owes roughly $9,185 in self-employment tax and about $5,069 in federal income tax — a combined " +
      "total close to $14,253, or about 21.9% of net income.",
    assumptions:
      FEDERAL_ONLY_ASSUMPTIONS +
      "\n\nSelf-employment tax is calculated as 12.4% Social Security (up to the 2026 wage base) plus 2.9% " +
      "Medicare (no cap), applied to 92.35% of net freelance income, with half of that SE tax deducted before " +
      "computing federal income tax. It doesn't calculate quarterly estimated tax due dates or safe-harbor " +
      "amounts, and doesn't include the Qualified Business Income deduction.",
    faq: [
      {
        question: "Do freelancers really pay more tax than W-2 employees?",
        answer:
          "Not more overall, but it feels that way because a freelancer pays both the employee AND employer " +
          "share of Social Security and Medicare (self-employment tax), where a W-2 employer normally covers " +
          "half automatically.",
      },
      {
        question: "How much should I set aside for taxes as a freelancer?",
        answer:
          "This calculator's Total Federal Tax Owed figure is a solid starting point — many freelancers set " +
          "aside 25–30% of net income to cover federal tax comfortably, then adjust based on their actual bracket " +
          "and any state tax.",
      },
      {
        question: "Do I need to pay quarterly estimated taxes?",
        answer:
          "Generally yes, if you expect to owe $1,000 or more in federal tax for the year and nothing is being " +
          "withheld — which is the case for most freelance income. This calculator doesn't compute the quarterly " +
          "due dates, but the total tax figure is what you're working from.",
      },
      ...FEDERAL_FAQ_BASICS.slice(0, 2),
    ],
  },

  // ---------------------------------------------------------------------
  // Incremental-income family
  // ---------------------------------------------------------------------
  {
    slug: "rental-income-tax-calculator",
    title: "Rental Income Tax Calculator",
    description:
      "See how much extra federal tax your rental income adds on top of your other income, using 2026 IRS " +
      "brackets — since rental income stacks on top of what you already earn.",
    metaTitle: "Rental Income Tax Calculator (2026) — Extra Tax on Rental Income",
    metaDescription:
      "Free rental income tax calculator. Estimate the additional 2026 federal tax your rental income adds, " +
      "based on your other income and filing status.",
    calcInputs: [
      currencyField("otherIncome", "Your Other Annual Taxable Income", { unit: "per year", max: 500000, step: 500 }),
      currencyField("additionalIncome", "Annual Rental Income (Net)", { unit: "per year", max: 300000, step: 500 }),
      filingStatusField,
    ],
    calcResult: { label: "Additional Federal Tax", format: "currency" },
    calcResults: [
      { key: "taxWithoutAdditionalIncome", label: "Federal Tax Without Rental Income", format: "currency" },
      { key: "taxWithAdditionalIncome", label: "Federal Tax With Rental Income", format: "currency" },
      { key: "additionalFederalTax", label: "Additional Federal Tax From Rental Income", format: "currency", highlight: true },
      { key: "effectiveRateOnAdditional", label: "Effective Rate on Rental Income", format: "percentage" },
      { key: "netAdditionalIncome", label: "Rental Income After Federal Tax", format: "currency" },
    ],
    instructions:
      "Enter your other annual taxable income (wages, self-employment income, etc.) and your net rental income — " +
      "rent collected minus deductible rental expenses like mortgage interest, property tax, insurance, repairs, " +
      "and depreciation. Because federal tax is progressive, rental income doesn't get taxed starting from $0 — " +
      "it stacks on top of what you already earn, so this calculator shows the actual EXTRA federal tax it " +
      "creates, not a standalone tax bill.\n\n" +
      "This is the number landlords actually want: how much of that rental income will really end up in your " +
      "pocket after federal tax, given your existing tax situation.",
    examples:
      "Example: a Single filer with $90,000 in other income and $15,000 in net rental income sees their federal " +
      "tax rise by about $3,300 because of the rental income — an effective rate of 22% on that rental income " +
      "specifically, since it's taxed at their marginal bracket.",
    assumptions:
      FEDERAL_ONLY_ASSUMPTIONS +
      "\n\nThis calculator assumes your rental income is already net of deductible expenses and taxed as " +
      "ordinary income at your marginal rate — it doesn't model passive activity loss limits, depreciation " +
      "recapture, or the Qualified Business Income deduction some rental activities may qualify for.",
    faq: [
      {
        question: "Is rental income taxed differently from a paycheck?",
        answer:
          "For federal income tax purposes, net rental income is generally taxed as ordinary income at your " +
          "regular marginal rate, the same brackets that apply to wages — though it isn't subject to Social " +
          "Security or Medicare tax the way wages are.",
      },
      {
        question: "Why does this show 'additional' tax instead of a total tax bill?",
        answer:
          "Because rental income is almost always added on top of other income you already have — the useful " +
          "number is how much EXTRA tax it causes, which depends on what bracket your other income already put " +
          "you in. That's what this calculator isolates.",
      },
      ...FEDERAL_FAQ_BASICS.slice(0, 2),
    ],
  },
  {
    slug: "foreign-income-tax-calculator",
    title: "Foreign Income Tax Calculator",
    description:
      "Estimate the additional US federal tax your foreign-earned income adds on top of your other income, " +
      "using 2026 IRS brackets — a starting point before applying any foreign income exclusions or credits.",
    metaTitle: "Foreign Income Tax Calculator (2026) — US Tax on Foreign Income",
    metaDescription:
      "Free foreign income tax calculator. Estimate additional 2026 US federal tax on foreign-earned income " +
      "before applying the Foreign Earned Income Exclusion or Foreign Tax Credit.",
    calcInputs: [
      currencyField("otherIncome", "Your Other Annual US Taxable Income", { unit: "per year", max: 500000, step: 500 }),
      currencyField("additionalIncome", "Annual Foreign-Earned Income (Taxable Portion)", { unit: "per year", max: 300000, step: 500 }),
      filingStatusField,
    ],
    calcResult: { label: "Additional Federal Tax", format: "currency" },
    calcResults: [
      { key: "taxWithoutAdditionalIncome", label: "Federal Tax Without Foreign Income", format: "currency" },
      { key: "taxWithAdditionalIncome", label: "Federal Tax With Foreign Income", format: "currency" },
      { key: "additionalFederalTax", label: "Additional Federal Tax From Foreign Income", format: "currency", highlight: true },
      { key: "effectiveRateOnAdditional", label: "Effective Rate on Foreign Income", format: "percentage" },
      { key: "netAdditionalIncome", label: "Foreign Income After Federal Tax", format: "currency" },
    ],
    instructions:
      "US citizens and resident aliens are generally taxed on worldwide income, so foreign-earned income can add " +
      "to your US federal tax bill just like domestic income. Enter your other US taxable income and the taxable " +
      "portion of your foreign-earned income (after any exclusion or credit you plan to claim, if you already " +
      "know that figure), and this calculator shows the additional federal tax it creates, since it stacks on " +
      "top of your other income at your marginal rate.\n\n" +
      "If you haven't yet figured out your Foreign Earned Income Exclusion or Foreign Tax Credit, enter your " +
      "full foreign income to see the tax impact before those breaks, as a worst-case starting point.",
    examples:
      "Example: a Single filer with $70,000 in US income and $40,000 in additional taxable foreign-earned income " +
      "sees their federal tax rise by roughly $8,800 because of the foreign income — worth comparing against " +
      "what the Foreign Earned Income Exclusion or Foreign Tax Credit could save.",
    assumptions:
      FEDERAL_ONLY_ASSUMPTIONS +
      "\n\nThis calculator does not apply the Foreign Earned Income Exclusion, Foreign Housing Exclusion, or " +
      "Foreign Tax Credit automatically — those can significantly reduce or eliminate US tax on foreign income " +
      "depending on your situation, so enter your income net of any exclusion/credit you already know applies, " +
      "or treat this as a before-those-breaks estimate.",
    faq: [
      {
        question: "Do I owe US tax on income I earn abroad?",
        answer:
          "Generally yes — US citizens and resident aliens are taxed on worldwide income regardless of where " +
          "they live or work, though the Foreign Earned Income Exclusion and Foreign Tax Credit can reduce or " +
          "eliminate the US tax owed on foreign income.",
      },
      {
        question: "Does this calculator apply the Foreign Earned Income Exclusion?",
        answer:
          "No — it shows the tax impact of the foreign income you enter as-is. Enter the amount net of any " +
          "exclusion you already plan to claim for a more realistic result.",
      },
      ...FEDERAL_FAQ_BASICS.slice(0, 2),
    ],
  },
  {
    slug: "investment-income-tax-calculator",
    title: "Investment Income Tax Calculator",
    description:
      "Estimate the additional federal tax your investment income (interest, dividends, capital gains) adds on " +
      "top of your other income for 2026.",
    metaTitle: "Investment Income Tax Calculator (2026) — Tax on Interest & Gains",
    metaDescription:
      "Free investment income tax calculator. Estimate additional 2026 federal tax on interest, dividend, and " +
      "capital gains income based on your other income and filing status.",
    calcInputs: [
      currencyField("otherIncome", "Your Other Annual Taxable Income", { unit: "per year", max: 500000, step: 500 }),
      currencyField("additionalIncome", "Annual Investment Income", { unit: "per year", max: 300000, step: 500 }),
      filingStatusField,
    ],
    calcResult: { label: "Additional Federal Tax", format: "currency" },
    calcResults: [
      { key: "taxWithoutAdditionalIncome", label: "Federal Tax Without Investment Income", format: "currency" },
      { key: "taxWithAdditionalIncome", label: "Federal Tax With Investment Income", format: "currency" },
      { key: "additionalFederalTax", label: "Additional Federal Tax From Investment Income", format: "currency", highlight: true },
      { key: "effectiveRateOnAdditional", label: "Effective Rate on Investment Income", format: "percentage" },
      { key: "netAdditionalIncome", label: "Investment Income After Federal Tax", format: "currency" },
    ],
    instructions:
      "Enter your other annual taxable income and your investment income (interest, ordinary/non-qualified " +
      "dividends, and short-term capital gains all count as ordinary income for this estimate) to see how much " +
      "extra federal tax it adds. Because investment income stacks on top of your other income, it's generally " +
      "taxed starting at your existing marginal rate rather than from $0.\n\n" +
      "Note that this calculator treats all investment income as taxed at ordinary rates for simplicity — " +
      "qualified dividends and long-term capital gains are actually taxed at lower preferential federal rates " +
      "(0%, 15%, or 20% depending on income), so if most of your investment income is long-term gains or " +
      "qualified dividends, your real tax will likely be lower than this estimate.",
    examples:
      "Example: a Single filer with $100,000 in other income and $20,000 in ordinary investment income (interest " +
      "and non-qualified dividends) sees their federal tax rise by about $4,400 — an effective rate of 22% on " +
      "that investment income at their marginal bracket.",
    assumptions:
      FEDERAL_ONLY_ASSUMPTIONS +
      "\n\nThis calculator treats all investment income as ordinary income taxed at your marginal federal rate. " +
      "It does NOT apply the preferential 0%/15%/20% federal rates that actually apply to qualified dividends " +
      "and long-term capital gains, and doesn't include the Net Investment Income Tax (an additional 3.8% that " +
      "can apply at higher incomes) — so for investment income made up mostly of long-term gains or qualified " +
      "dividends, treat this as a conservative (higher-than-actual) estimate.",
    faq: [
      {
        question: "Are capital gains taxed the same as regular income?",
        answer:
          "Short-term capital gains (assets held a year or less) are taxed as ordinary income, same as wages. " +
          "Long-term capital gains and qualified dividends get preferential federal rates (0%, 15%, or 20%) that " +
          "this calculator doesn't model — so it may overstate tax on long-term gains specifically.",
      },
      {
        question: "What is the Net Investment Income Tax?",
        answer:
          "An additional 3.8% federal tax on investment income for higher-income filers (above $200,000 Single / " +
          "$250,000 Married Filing Jointly modified AGI). This calculator doesn't include it, so high earners " +
          "with significant investment income may owe more than this estimate shows.",
      },
      ...FEDERAL_FAQ_BASICS.slice(0, 2),
    ],
  },

  // ---------------------------------------------------------------------
  // Single-purpose lookups
  // ---------------------------------------------------------------------
  {
    slug: "taxable-income-calculator",
    title: "Taxable Income Calculator",
    description:
      "Find your 2026 federal taxable income — gross income minus adjustments and the standard deduction — " +
      "without calculating the tax itself.",
    metaTitle: "Taxable Income Calculator (2026) — Find Your Taxable Income",
    metaDescription:
      "Free taxable income calculator. Find your 2026 federal taxable income after adjustments and the standard " +
      "deduction, based on your gross income and filing status.",
    calcInputs: [
      currencyField("grossIncome", "Annual Gross Income", { unit: "per year", max: 1000000, step: 1000 }),
      currencyField("otherAdjustments", "Other Above-the-Line Adjustments", { unit: "per year", max: 100000, step: 100, required: false }),
      filingStatusField,
    ],
    calcResult: { label: "Taxable Income", format: "currency" },
    calcResults: [
      { key: "adjustedGrossIncome", label: "Adjusted Gross Income", format: "currency" },
      { key: "standardDeduction", label: "Standard Deduction", format: "currency" },
      { key: "taxableIncome", label: "Taxable Income", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your gross income, any above-the-line adjustments (like traditional IRA contributions, student loan " +
      "interest, or half of self-employment tax, if you already know that figure), and your filing status. This " +
      "calculator subtracts your adjustments to get your Adjusted Gross Income, then subtracts the 2026 federal " +
      "standard deduction to give you your final taxable income — the number your actual tax is calculated on.\n\n" +
      "This tool stops at taxable income on purpose (it doesn't calculate the tax owed) — use the Tax Liability " +
      "Calculator on this site next if you want to carry that taxable income figure through to a final tax bill.",
    examples:
      "Example: a Single filer with $95,000 in gross income and $3,000 in above-the-line adjustments has an " +
      "Adjusted Gross Income of $92,000; after the $16,100 standard deduction, taxable income comes to $75,900.",
    assumptions:
      FEDERAL_ONLY_ASSUMPTIONS +
      "\n\nThis calculator uses the standard deduction only, not itemized deductions — if you itemize, your real " +
      "taxable income may be different from this estimate.",
    faq: [
      {
        question: "What's the difference between gross income and taxable income?",
        answer:
          "Gross income is everything you earn before any deductions. Taxable income is what's left after " +
          "above-the-line adjustments and either the standard deduction or itemized deductions — it's the number " +
          "your actual tax bracket calculations use.",
      },
      {
        question: "Does this calculate my tax owed too?",
        answer:
          "No — this tool is focused on finding taxable income specifically. Use the Tax Liability Calculator or " +
          "Income Tax Calculator on this site to go from taxable income to an actual tax bill.",
      },
      ...FEDERAL_FAQ_BASICS.slice(0, 2),
    ],
  },
  {
    slug: "tax-liability-calculator",
    title: "Tax Liability Calculator",
    description:
      "Calculate your 2026 federal tax liability directly from your taxable income — see the exact tax owed, " +
      "marginal rate, and effective rate.",
    metaTitle: "Tax Liability Calculator (2026) — Federal Tax Owed",
    metaDescription:
      "Free tax liability calculator. Enter your 2026 taxable income and filing status to see your exact federal " +
      "tax owed, marginal rate, and effective rate.",
    calcInputs: [
      currencyField("taxableIncome", "Taxable Income", { unit: "per year", max: 1000000, step: 1000 }),
      filingStatusField,
    ],
    calcResult: { label: "Federal Tax Liability", format: "currency" },
    calcResults: [
      { key: "federalTax", label: "Federal Tax Liability", format: "currency", highlight: true },
      { key: "marginalRate", label: "Marginal Tax Rate", format: "percentage" },
      { key: "effectiveRate", label: "Effective Tax Rate", format: "percentage" },
      { key: "afterTaxIncome", label: "Income After Federal Tax", format: "currency" },
    ],
    instructions:
      "If you already know your taxable income — for example, from the Taxable Income Calculator on this site, " +
      "or from a prior year's return — enter it directly here along with your filing status to see your exact " +
      "2026 federal tax liability, skipping the standard deduction step.\n\n" +
      "This runs your taxable income through the current seven federal brackets and shows the total tax owed, " +
      "your marginal rate (the bracket your last dollar falls into), and your effective rate (tax owed as a " +
      "share of taxable income).",
    examples:
      "Example: $75,900 of taxable income for a Single filer produces a federal tax liability of about $11,410 — " +
      "a marginal rate of 22% but an effective rate of roughly 15.0%.",
    assumptions: FEDERAL_ONLY_ASSUMPTIONS,
    faq: [
      {
        question: "What's the difference between this and the Income Tax Calculator?",
        answer:
          "The Income Tax Calculator starts from gross income and subtracts the standard deduction for you. This " +
          "calculator starts from taxable income directly — useful if you already know that figure and just want " +
          "the tax owed on it.",
      },
      {
        question: "Is tax liability the same as what I'll owe when I file?",
        answer:
          "It's your federal income tax before subtracting anything already withheld or paid in estimated taxes " +
          "during the year — see the Tax Refund Calculator on this site if you want to compare liability against " +
          "what's already been withheld.",
      },
      ...FEDERAL_FAQ_BASICS.slice(0, 2),
    ],
  },
  {
    slug: "tax-refund-calculator",
    title: "Tax Refund Calculator",
    description:
      "Estimate your 2026 federal tax refund (or amount owed) by comparing your actual tax liability against " +
      "how much federal tax has already been withheld.",
    metaTitle: "Tax Refund Calculator (2026) — Estimate Your Refund",
    metaDescription:
      "Free tax refund calculator. Compare your 2026 federal tax liability against tax already withheld to " +
      "estimate your refund or amount owed.",
    calcInputs: [
      currencyField("grossIncome", "Annual Gross Income", { unit: "per year", max: 1000000, step: 1000 }),
      currencyField("federalTaxWithheld", "Federal Tax Already Withheld/Paid", { unit: "per year", max: 200000, step: 100 }),
      filingStatusField,
    ],
    calcResult: { label: "Estimated Refund", format: "currency" },
    calcResults: [
      { key: "taxableIncome", label: "Taxable Income", format: "currency" },
      { key: "actualTaxOwed", label: "Actual Federal Tax Owed", format: "currency" },
      { key: "federalTaxWithheld", label: "Federal Tax Withheld/Paid", format: "currency" },
      { key: "refundAmount", label: "Estimated Refund", format: "currency", highlight: true },
      { key: "amountOwed", label: "Estimated Amount Still Owed", format: "currency" },
    ],
    instructions:
      "Enter your annual gross income, your filing status, and how much federal income tax has already been " +
      "withheld from your paychecks (or paid via estimated taxes) this year — usually found on your final pay " +
      "stub or by adding up your quarterly estimated payments. This calculator works out your actual federal tax " +
      "liability using the 2026 standard deduction and brackets, then compares it to what's already been paid.\n\n" +
      "If you've paid in more than you owe, the difference shows as your estimated refund. If you've paid in " +
      "less, it shows as an estimated amount still owed.",
    examples:
      "Example: a Single filer with $70,000 in gross income and $9,500 already withheld has an actual tax " +
      "liability of about $6,570 — meaning an estimated refund of roughly $2,930.",
    assumptions:
      FEDERAL_ONLY_ASSUMPTIONS +
      "\n\nThis compares only federal income tax withheld/paid against federal income tax owed — it doesn't " +
      "include refundable credits (like the Earned Income Tax Credit or Child Tax Credit) that could increase an " +
      "actual refund beyond this estimate.",
    faq: [
      {
        question: "Where do I find how much federal tax was withheld?",
        answer:
          "Your final pay stub of the year usually shows year-to-date federal income tax withheld. If you're " +
          "self-employed, add up your quarterly estimated tax payments instead.",
      },
      {
        question: "Why might my actual refund differ from this estimate?",
        answer:
          "This calculator doesn't include tax credits (like the Child Tax Credit or Earned Income Tax Credit), " +
          "itemized deductions, or state tax refunds/liabilities — any of those could change your actual refund " +
          "in either direction.",
      },
      ...FEDERAL_FAQ_BASICS.slice(0, 2),
    ],
  },
  {
    slug: "tax-bracket-calculator",
    title: "Tax Bracket Calculator",
    description:
      "Find which 2026 federal tax bracket you're in from your taxable income and filing status, plus your " +
      "effective rate and how much room is left in your current bracket.",
    metaTitle: "Tax Bracket Calculator (2026) — Find Your Federal Tax Bracket",
    metaDescription:
      "Free tax bracket calculator. Find your 2026 federal marginal tax bracket, effective tax rate, and how " +
      "much income fits in your current bracket.",
    calcInputs: [
      currencyField("taxableIncome", "Taxable Income", { unit: "per year", max: 1000000, step: 1000 }),
      filingStatusField,
    ],
    calcResult: { label: "Marginal Tax Bracket", format: "percentage" },
    calcResults: [
      { key: "marginalRate", label: "Your Marginal Tax Bracket", format: "percentage", highlight: true },
      { key: "federalTax", label: "Federal Tax at This Income", format: "currency" },
      { key: "effectiveRate", label: "Effective Tax Rate", format: "percentage" },
      { key: "roomInBracket", label: "Room Left in Current Bracket", format: "currency" },
    ],
    instructions:
      "Enter your taxable income and filing status to instantly see which of the seven 2026 federal tax brackets " +
      "(10%, 12%, 22%, 24%, 32%, 35%, or 37%) your income falls into. This is your MARGINAL rate — the rate that " +
      "applies to your next dollar of income, not your whole income.\n\n" +
      "The result also shows how much more taxable income you could earn before crossing into the next bracket, " +
      "which is handy for planning things like a year-end bonus, a Roth conversion, or extra freelance work " +
      "without accidentally jumping a full bracket.",
    examples:
      "Example: $150,000 of taxable income for a Married Filing Jointly couple falls in the 22% bracket (which " +
      "runs from $100,800 to $211,400 for MFJ in 2026), with about $61,400 of room left before reaching the 24% " +
      "bracket.",
    assumptions: FEDERAL_ONLY_ASSUMPTIONS,
    faq: [
      {
        question: "Does being in a higher bracket mean ALL my income is taxed at that rate?",
        answer:
          "No — this is the most common tax misconception. Only the income WITHIN each bracket is taxed at that " +
          "bracket's rate; income in lower brackets is still taxed at those lower rates. That's why your marginal " +
          "rate is always higher than your effective (overall) rate.",
      },
      {
        question: "What are the 2026 federal tax brackets?",
        answer:
          "10%, 12%, 22%, 24%, 32%, 35%, and 37%, with the dollar thresholds for each depending on your filing " +
          "status. This calculator applies the exact 2026 thresholds for whichever status you select.",
      },
      ...FEDERAL_FAQ_BASICS.slice(0, 2),
    ],
  },
  {
    slug: "effective-tax-rate-calculator",
    title: "Effective Tax Rate Calculator",
    description:
      "Calculate your true effective federal tax rate for 2026 — your total tax as a percentage of your gross " +
      "income — alongside your marginal bracket for comparison.",
    metaTitle: "Effective Tax Rate Calculator (2026) — Your Real Tax Rate",
    metaDescription:
      "Free effective tax rate calculator. Find your real 2026 federal tax rate (total tax ÷ gross income), not " +
      "just your marginal bracket.",
    calcInputs: incomeTaxInputs(),
    calcResult: { label: "Effective Tax Rate", format: "percentage" },
    calcResults: [
      { key: "federalTax", label: "Federal Tax Owed", format: "currency" },
      { key: "effectiveRate", label: "Your Effective Tax Rate", format: "percentage", highlight: true },
      { key: "marginalRate", label: "Your Marginal Tax Bracket", format: "percentage" },
      { key: "afterTaxIncome", label: "Income After Federal Tax", format: "currency" },
    ],
    instructions:
      "Enter your annual gross income and filing status to see your effective federal tax rate — the single " +
      "most useful number for understanding your real tax burden, since it's your total federal tax divided by " +
      "your total gross income, rather than just the rate on your last dollar earned.\n\n" +
      "The result also shows your marginal bracket next to it, so you can see clearly why the two numbers are " +
      "different (and usually far apart) — a common source of confusion when people say they're \"in the 32% " +
      "bracket\" but are actually paying a much lower share of their income overall.",
    examples:
      "Example: a Single filer earning $200,000 has a marginal rate of 24%, but after running the full income " +
      "through every lower bracket first, their effective federal tax rate comes out to roughly 18.4%.",
    assumptions: FEDERAL_ONLY_ASSUMPTIONS,
    faq: [
      {
        question: "Why is my effective rate so much lower than my tax bracket?",
        answer:
          "Because only the portion of your income inside each bracket is taxed at that bracket's rate — the " +
          "first dollars are taxed at 10%, the next chunk at 12%, and so on, only reaching your top bracket for " +
          "income above that bracket's threshold. Your effective rate blends all of that together.",
      },
      {
        question: "Is effective tax rate the same as average tax rate?",
        answer:
          "Yes, those two terms are used interchangeably — both mean total tax paid divided by total income.",
      },
      ...FEDERAL_FAQ_BASICS.slice(0, 2),
    ],
  },

  // ---------------------------------------------------------------------
  // Salary Tax family — core paycheck engine (8 tools)
  // ---------------------------------------------------------------------
  {
    slug: "salary-tax-calculator",
    title: "Salary Tax Calculator",
    description:
      "Calculate federal income tax, Social Security, and Medicare on your salary for 2026 — see your take-home " +
      "pay for any pay frequency.",
    metaTitle: "Salary Tax Calculator (2026) — Federal Paycheck Estimate",
    metaDescription:
      "Free salary tax calculator. Estimate 2026 federal income tax, Social Security, Medicare, and take-home " +
      "pay for any pay frequency.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { unit: "USD/year", max: 400000, step: 1000 }),
      payFrequencyField,
      filingStatusField,
      preTaxField,
      postTaxField,
      extraWithholdingField,
    ],
    calcResult: { label: "Take-Home Pay", format: "currency" },
    calcResults: paycheckResultLines,
    instructions:
      "Enter your annual salary, how often you're paid, and your federal filing status, then add any pre-tax " +
      "deductions (like 401(k) contributions or health insurance premiums), post-tax deductions, and extra " +
      "federal withholding if they apply — otherwise leave them at $0. This national-baseline salary tax " +
      "calculator works out federal income tax, Social Security, and Medicare from your salary, showing a full " +
      "breakdown per paycheck and for the year.\n\n" +
      "Because it's federal-only, it's a good quick comparison tool across states — pair it with this site's " +
      "state-specific calculators under Tax Calculators for a number that includes your state's own income tax.",
    examples:
      "Example: a single filer earning $75,000 a year, paid biweekly (26 paychecks/year), with no other " +
      "deductions, takes home approximately $2,368.94 per paycheck in federal-only terms — about $61,592.50 for " +
      "the year — before any state income tax.",
    assumptions: PAYCHECK_ASSUMPTIONS,
    faq: FEDERAL_FAQ_BASICS,
  },
  {
    slug: "take-home-pay-calculator",
    title: "Take Home Pay Calculator",
    description:
      "See exactly how much of your salary you'll actually take home in 2026 after federal income tax, Social " +
      "Security, and Medicare.",
    metaTitle: "Take Home Pay Calculator (2026) — Net Pay Estimate",
    metaDescription:
      "Free take home pay calculator. See your 2026 net pay after federal income tax, Social Security, and " +
      "Medicare for any salary and pay frequency.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { unit: "USD/year", max: 400000, step: 1000 }),
      payFrequencyField,
      filingStatusField,
      preTaxField,
      postTaxField,
      extraWithholdingField,
    ],
    calcResult: { label: "Take-Home Pay", format: "currency" },
    calcResults: paycheckResultLines,
    instructions:
      "This take-home pay calculator answers the question most people actually have: \"what do I really get to " +
      "keep?\" Enter your annual salary, pay frequency, and filing status, along with any pre-tax or post-tax " +
      "deductions, to see your net pay per paycheck and for the full year after federal income tax, Social " +
      "Security, and Medicare are taken out.\n\n" +
      "The breakdown shows every line that's subtracted along the way, so you can see exactly where the " +
      "difference between your salary and your take-home pay comes from.",
    examples:
      "Example: a $95,000 salary paid monthly (12 paychecks/year), Married Filing Jointly with no other " +
      "deductions, takes home about $6,724 per month, or roughly $80,693 for the year, federal-only.",
    assumptions: PAYCHECK_ASSUMPTIONS,
    faq: FEDERAL_FAQ_BASICS,
  },
  {
    slug: "net-salary-calculator",
    title: "Net Salary Calculator",
    description:
      "Calculate your net salary (after federal income tax, Social Security, and Medicare) for 2026 from your " +
      "gross annual pay.",
    metaTitle: "Net Salary Calculator (2026) — Gross to Net Pay",
    metaDescription:
      "Free net salary calculator. Convert your 2026 gross annual salary to net (after-tax) pay using current " +
      "federal tax and FICA rates.",
    calcInputs: [
      currencyField("annualSalary", "Annual Gross Salary", { unit: "USD/year", max: 400000, step: 1000 }),
      payFrequencyField,
      filingStatusField,
      preTaxField,
      postTaxField,
      extraWithholdingField,
    ],
    calcResult: { label: "Net Salary", format: "currency" },
    calcResults: paycheckResultLines,
    instructions:
      "Enter your gross annual salary, pay frequency, and filing status to convert it into net salary — what's " +
      "left after federal income tax, Social Security, and Medicare. Add any pre-tax deductions (like retirement " +
      "contributions), post-tax deductions, and extra withholding for a more precise result.\n\n" +
      "The breakdown separates each tax so you can see exactly how gross becomes net, per paycheck and for the " +
      "full year.",
    examples:
      "Example: a $60,000 gross salary paid weekly (52 paychecks/year), Single filer with no deductions, " +
      "converts to a net salary of about $969 per week, or roughly $50,390 for the year, federal-only.",
    assumptions: PAYCHECK_ASSUMPTIONS,
    faq: FEDERAL_FAQ_BASICS,
  },
  {
    slug: "annual-salary-tax-calculator",
    title: "Annual Salary Tax Calculator",
    description:
      "Calculate the total federal income tax, Social Security, and Medicare owed on your annual salary for " +
      "2026, plus your full-year take-home pay.",
    metaTitle: "Annual Salary Tax Calculator (2026) — Yearly Tax Estimate",
    metaDescription:
      "Free annual salary tax calculator. Estimate your total 2026 federal tax and take-home pay for the year " +
      "from your annual salary.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { unit: "USD/year", max: 400000, step: 1000 }),
      payFrequencyField,
      filingStatusField,
      preTaxField,
      postTaxField,
      extraWithholdingField,
    ],
    calcResult: { label: "Annual Take-Home Pay", format: "currency" },
    calcResults: paycheckResultLines,
    instructions:
      "Enter your annual salary and filing status to see the full-year totals: federal income tax, Social " +
      "Security, Medicare, and your annual take-home pay. Choose your pay frequency too, so the per-paycheck " +
      "figures line up with however you're actually paid, alongside the annual summary.\n\n" +
      "This is the calculator to use when you're thinking in yearly terms — comparing job offers, planning an " +
      "annual budget, or just wanting the big-picture number rather than a per-paycheck breakdown.",
    examples:
      "Example: a $110,000 annual salary, Head of Household filer with no other deductions, comes to roughly " +
      "$89,797 in annual take-home pay after federal income tax, Social Security, and Medicare.",
    assumptions: PAYCHECK_ASSUMPTIONS,
    faq: FEDERAL_FAQ_BASICS,
  },
  {
    slug: "paycheck-tax-calculator",
    title: "Paycheck Tax Calculator",
    description:
      "Calculate exactly how much tax comes out of each paycheck in 2026 — federal income tax, Social Security, " +
      "and Medicare — for any pay frequency.",
    metaTitle: "Paycheck Tax Calculator (2026) — Per-Paycheck Tax Breakdown",
    metaDescription:
      "Free paycheck tax calculator. See exactly how much federal tax, Social Security, and Medicare come out of " +
      "each 2026 paycheck.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { unit: "USD/year", max: 400000, step: 1000 }),
      payFrequencyField,
      filingStatusField,
      preTaxField,
      postTaxField,
      extraWithholdingField,
    ],
    calcResult: { label: "Take-Home Pay Per Paycheck", format: "currency" },
    calcResults: paycheckResultLines,
    instructions:
      "Enter your annual salary, how often you're paid, and your filing status to see a per-paycheck breakdown " +
      "of every tax that's withheld: federal income tax, Social Security, and Medicare. Add pre-tax deductions, " +
      "post-tax deductions, or extra withholding if any of those apply to your actual paycheck.\n\n" +
      "Useful for double-checking your pay stub, or for working out what a new job's paycheck will actually look " +
      "like before your first one arrives.",
    examples:
      "Example: a $52,000 salary paid semi-monthly (24 paychecks/year), Single filer with no deductions, has " +
      "about $335 in federal income tax and FICA withheld per paycheck, leaving roughly $1,832 take-home.",
    assumptions: PAYCHECK_ASSUMPTIONS,
    faq: FEDERAL_FAQ_BASICS,
  },
  {
    slug: "payroll-tax-calculator",
    title: "Payroll Tax Calculator",
    description:
      "Calculate 2026 federal payroll taxes — Social Security, Medicare, and federal income tax withholding — " +
      "on your salary.",
    metaTitle: "Payroll Tax Calculator (2026) — Social Security & Medicare",
    metaDescription:
      "Free payroll tax calculator. Estimate 2026 Social Security, Medicare, and federal income tax withholding " +
      "on your salary.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { unit: "USD/year", max: 400000, step: 1000 }),
      payFrequencyField,
      filingStatusField,
      preTaxField,
      postTaxField,
      extraWithholdingField,
    ],
    calcResult: { label: "Total Payroll Tax", format: "currency" },
    calcResults: [
      { key: "grossPayPerPeriod", label: "Gross Pay (per paycheck)", format: "currency" },
      { key: "socialSecurityTax", label: "Social Security Tax (6.2%, per paycheck)", format: "currency", highlight: true },
      { key: "medicareTax", label: "Medicare Tax (1.45%+, per paycheck)", format: "currency", highlight: true },
      { key: "federalIncomeTax", label: "Federal Income Tax Withholding (per paycheck)", format: "currency" },
      { key: "totalDeductions", label: "Total Taxes Withheld (per paycheck)", format: "currency" },
      { key: "netPayPerPeriod", label: "Take-Home Pay (per paycheck)", format: "currency" },
    ],
    instructions:
      "\"Payroll tax\" covers Social Security and Medicare (FICA) as well as federal income tax withholding — " +
      "enter your annual salary, pay frequency, and filing status to see all of it broken out per paycheck: 6.2% " +
      "Social Security (up to the annual wage base), 1.45%+ Medicare, and federal income tax withholding.\n\n" +
      "This is the calculator to reach for when you specifically want to see the FICA lines (Social Security and " +
      "Medicare) highlighted separately from income tax withholding, rather than just a single take-home number.",
    examples:
      "Example: a $75,000 salary paid biweekly (26 paychecks/year) has about $178.85 withheld for Social " +
      "Security and $41.83 for Medicare per paycheck — $220.67 in FICA payroll tax alone, before federal income " +
      "tax withholding.",
    assumptions: PAYCHECK_ASSUMPTIONS,
    faq: [
      {
        question: "What's included in 'payroll tax'?",
        answer:
          "Payroll tax most commonly refers to FICA — Social Security (6.2%) and Medicare (1.45%, plus an extra " +
          "0.9% above a threshold) — though federal income tax withholding is also taken from each paycheck " +
          "alongside it, which this calculator shows too.",
      },
      {
        question: "Is there a cap on Social Security tax?",
        answer:
          "Yes — Social Security tax (6.2%) only applies up to the annual wage base ($184,500 for 2026). Income " +
          "above that isn't subject to Social Security tax, though it's still subject to Medicare tax.",
      },
      ...FEDERAL_FAQ_BASICS.slice(0, 2),
    ],
  },
  {
    slug: "salary-withholding-calculator",
    title: "Salary Withholding Calculator",
    description:
      "See exactly how much is withheld from your salary for 2026 federal income tax, Social Security, and " +
      "Medicare, plus your resulting take-home pay.",
    metaTitle: "Salary Withholding Calculator (2026) — Federal Withholding Estimate",
    metaDescription:
      "Free salary withholding calculator. Estimate total 2026 federal tax withholding from your salary, " +
      "including income tax, Social Security, and Medicare.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { unit: "USD/year", max: 400000, step: 1000 }),
      payFrequencyField,
      filingStatusField,
      preTaxField,
      postTaxField,
      extraWithholdingField,
    ],
    calcResult: { label: "Total Withholding", format: "currency" },
    calcResults: paycheckResultLines,
    instructions:
      "Enter your annual salary, pay frequency, and filing status to see your total federal withholding per " +
      "paycheck — federal income tax plus Social Security and Medicare — and how that compares to your " +
      "take-home pay. Add extra withholding if you (or your W-4) already specify an additional flat amount to be " +
      "withheld each paycheck.\n\n" +
      "This is useful for checking whether your current withholding lines up with what you'd expect, or for " +
      "planning how much extra to withhold to avoid owing money at tax time.",
    examples:
      "Example: an $80,000 salary paid biweekly (26 paychecks/year), Single filer with $50 in extra withholding " +
      "per paycheck, has total withholding of roughly $623 per paycheck between federal income tax, Social " +
      "Security, Medicare, and the extra amount.",
    assumptions: PAYCHECK_ASSUMPTIONS,
    faq: FEDERAL_FAQ_BASICS,
  },
  {
    slug: "salary-after-tax-calculator",
    title: "Salary After Tax Calculator",
    description:
      "Find out what your salary looks like after federal income tax, Social Security, and Medicare for 2026 — " +
      "per paycheck and for the year.",
    metaTitle: "Salary After Tax Calculator (2026) — After-Tax Pay Estimate",
    metaDescription:
      "Free salary after tax calculator. See your 2026 after-tax salary per paycheck and for the year, after " +
      "federal income tax, Social Security, and Medicare.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary (Before Tax)", { unit: "USD/year", max: 400000, step: 1000 }),
      payFrequencyField,
      filingStatusField,
      preTaxField,
      postTaxField,
      extraWithholdingField,
    ],
    calcResult: { label: "Salary After Tax", format: "currency" },
    calcResults: paycheckResultLines,
    instructions:
      "Enter your before-tax annual salary, pay frequency, and filing status to see your salary after tax — " +
      "federal income tax, Social Security, and Medicare all subtracted — shown per paycheck and for the full " +
      "year. Add any pre-tax or post-tax deductions that apply to your actual paycheck for a closer estimate.\n\n" +
      "A good quick check when comparing a job offer's stated salary against what will actually land in your " +
      "bank account.",
    examples:
      "Example: a $105,000 salary before tax, paid monthly (12 paychecks/year), Married Filing Jointly with no " +
      "other deductions, comes to roughly $7,394 per month after tax, or about $88,728 for the year, federal-only.",
    assumptions: PAYCHECK_ASSUMPTIONS,
    faq: FEDERAL_FAQ_BASICS,
  },

  // ---------------------------------------------------------------------
  // Gross Salary Calculator (reverse)
  // ---------------------------------------------------------------------
  {
    slug: "gross-salary-calculator",
    title: "Gross Salary Calculator",
    description:
      "Work backward from the take-home pay you want to the gross (before-tax) annual salary you'd need in " +
      "2026, after federal income tax, Social Security, and Medicare.",
    metaTitle: "Gross Salary Calculator (2026) — Net to Gross Pay",
    metaDescription:
      "Free gross salary calculator. Find the gross annual salary needed to reach your desired 2026 take-home " +
      "pay, after federal tax and FICA.",
    calcInputs: [
      currencyField("desiredNetPay", "Desired Take-Home Pay", { unit: "per paycheck", max: 20000, step: 100 }),
      payFrequencyField,
      filingStatusField,
      preTaxField,
      postTaxField,
    ],
    calcResult: { label: "Required Annual Gross Salary", format: "currency" },
    calcResults: [
      { key: "requiredAnnualGross", label: "Required Annual Gross Salary", format: "currency", highlight: true },
      { key: "requiredGrossPerPeriod", label: "Required Gross Pay (per paycheck)", format: "currency" },
      { key: "federalIncomeTax", label: "Federal Income Tax (per paycheck)", format: "currency" },
      { key: "socialSecurityTax", label: "Social Security Tax (per paycheck)", format: "currency" },
      { key: "medicareTax", label: "Medicare Tax (per paycheck)", format: "currency" },
      { key: "netPayPerPeriod", label: "Resulting Take-Home Pay (per paycheck)", format: "currency" },
    ],
    instructions:
      "This is the reverse of a normal salary calculator: instead of starting from your salary and finding your " +
      "take-home pay, start from the take-home pay you WANT per paycheck, and this calculator works out the " +
      "gross (before-tax) annual salary that would produce it, after federal income tax, Social Security, and " +
      "Medicare.\n\n" +
      "Enter your desired net pay per paycheck, how often you'd be paid, and your filing status, plus any pre-tax " +
      "or post-tax deductions you expect. Useful when negotiating a job offer around a target take-home number, " +
      "or figuring out what salary to ask for.",
    examples:
      "Example: wanting $3,000 take-home pay per paycheck, paid biweekly (26 paychecks/year), filing Single with " +
      "no deductions, requires a gross annual salary of roughly $98,323.",
    assumptions: PAYCHECK_ASSUMPTIONS,
    faq: [
      {
        question: "Why isn't this just a simple multiplication?",
        answer:
          "Because federal tax is progressive (higher earnings are taxed at higher rates) and FICA has its own " +
          "rules (a Social Security wage base cap, an Additional Medicare threshold), gross-to-net isn't a flat " +
          "percentage — this calculator solves for the exact gross salary iteratively rather than guessing.",
      },
      {
        question: "Does this account for state income tax?",
        answer:
          "No — this is a federal-only estimate. If you live in a state with income tax, you'd need a higher " +
          "gross salary than this result to reach the same take-home pay.",
      },
      ...FEDERAL_FAQ_BASICS.slice(0, 2),
    ],
  },

  // ---------------------------------------------------------------------
  // Period-salary variants
  // ---------------------------------------------------------------------
  {
    slug: "monthly-salary-tax-calculator",
    title: "Monthly Salary Tax Calculator",
    description:
      "Calculate federal income tax, Social Security, and Medicare on your monthly salary for 2026, paid 12 " +
      "times a year.",
    metaTitle: "Monthly Salary Tax Calculator (2026) — Monthly Paycheck Tax",
    metaDescription:
      "Free monthly salary tax calculator. Estimate 2026 federal tax and take-home pay from your monthly salary, " +
      "paid 12 times a year.",
    calcInputs: [
      currencyField("periodSalary", "Monthly Salary", { unit: "per month", max: 30000, step: 100 }),
      filingStatusField,
      preTaxField,
      postTaxField,
      extraWithholdingField,
    ],
    calcResult: { label: "Monthly Take-Home Pay", format: "currency" },
    calcResults: paycheckResultLines,
    instructions:
      "Enter your monthly salary (assuming 12 paychecks a year) and your filing status to see federal income " +
      "tax, Social Security, and Medicare withheld each month, and your monthly take-home pay. Add pre-tax or " +
      "post-tax deductions if they apply to your paycheck.\n\n" +
      "Built specifically for monthly pay schedules, so you don't need to convert an annual figure yourself — " +
      "just enter what you're actually paid each month.",
    examples:
      "Example: a $6,500 monthly salary, Single filer with no deductions, has about $1,191 in federal income tax " +
      "and FICA withheld each month, leaving roughly $5,309 take-home.",
    assumptions: PAYCHECK_ASSUMPTIONS,
    faq: FEDERAL_FAQ_BASICS,
  },
  {
    slug: "weekly-salary-tax-calculator",
    title: "Weekly Salary Tax Calculator",
    description:
      "Calculate federal income tax, Social Security, and Medicare on your weekly salary for 2026, paid 52 " +
      "times a year.",
    metaTitle: "Weekly Salary Tax Calculator (2026) — Weekly Paycheck Tax",
    metaDescription:
      "Free weekly salary tax calculator. Estimate 2026 federal tax and take-home pay from your weekly salary, " +
      "paid 52 times a year.",
    calcInputs: [
      currencyField("periodSalary", "Weekly Salary", { unit: "per week", max: 8000, step: 25 }),
      filingStatusField,
      preTaxField,
      postTaxField,
      extraWithholdingField,
    ],
    calcResult: { label: "Weekly Take-Home Pay", format: "currency" },
    calcResults: paycheckResultLines,
    instructions:
      "Enter your weekly salary (assuming 52 paychecks a year) and your filing status to see federal income tax, " +
      "Social Security, and Medicare withheld each week, and your weekly take-home pay. Add pre-tax or post-tax " +
      "deductions if they apply.\n\n" +
      "Built specifically for weekly pay schedules — common for hourly and blue-collar jobs — so the numbers " +
      "match your actual pay stub frequency without any conversion.",
    examples:
      "Example: a $1,500 weekly salary, Married Filing Jointly with no deductions, has about $211 in federal " +
      "income tax and FICA withheld each week, leaving roughly $1,289 take-home.",
    assumptions: PAYCHECK_ASSUMPTIONS,
    faq: FEDERAL_FAQ_BASICS,
  },
  {
    slug: "biweekly-salary-tax-calculator",
    title: "Biweekly Salary Tax Calculator",
    description:
      "Calculate federal income tax, Social Security, and Medicare on your biweekly salary for 2026, paid 26 " +
      "times a year.",
    metaTitle: "Biweekly Salary Tax Calculator (2026) — Biweekly Paycheck Tax",
    metaDescription:
      "Free biweekly salary tax calculator. Estimate 2026 federal tax and take-home pay from your biweekly " +
      "salary, paid 26 times a year.",
    calcInputs: [
      currencyField("periodSalary", "Biweekly Salary", { unit: "per paycheck", max: 15000, step: 50 }),
      filingStatusField,
      preTaxField,
      postTaxField,
      extraWithholdingField,
    ],
    calcResult: { label: "Biweekly Take-Home Pay", format: "currency" },
    calcResults: paycheckResultLines,
    instructions:
      "Enter your biweekly salary (assuming 26 paychecks a year, the most common US pay schedule) and your " +
      "filing status to see federal income tax, Social Security, and Medicare withheld each pay period, and your " +
      "biweekly take-home pay. Add pre-tax or post-tax deductions if they apply.\n\n" +
      "Built specifically for biweekly pay schedules, so the figures line up directly with your actual pay stub.",
    examples:
      "Example: a $2,884.62 biweekly salary (equivalent to $75,000/year), Single filer with no deductions, has " +
      "about $516 in federal income tax and FICA withheld per paycheck, leaving roughly $2,369 take-home.",
    assumptions: PAYCHECK_ASSUMPTIONS,
    faq: FEDERAL_FAQ_BASICS,
  },

  // ---------------------------------------------------------------------
  // Supplemental wage family
  // ---------------------------------------------------------------------
  {
    slug: "bonus-tax-calculator",
    title: "Bonus Tax Calculator",
    description:
      "See how much federal tax is withheld from your bonus for 2026 using the IRS's flat 22% supplemental wage " +
      "rate, plus FICA — and what you actually take home.",
    metaTitle: "Bonus Tax Calculator (2026) — 22% Supplemental Withholding",
    metaDescription:
      "Free bonus tax calculator using the 2026 IRS flat 22% supplemental wage withholding rate. See your net " +
      "bonus after federal tax and FICA.",
    calcInputs: [
      currencyField("supplementalAmount", "Bonus Amount", { unit: "one-time", max: 500000, step: 500 }),
      currencyField("priorYtdSupplemental", "Other Supplemental Wages Already Paid This Year", {
        unit: "year-to-date",
        max: 2000000,
        step: 1000,
        required: false,
      }),
      filingStatusField,
    ],
    calcResult: { label: "Net Bonus", format: "currency" },
    calcResults: [
      { key: "grossAmount", label: "Gross Bonus Amount", format: "currency" },
      { key: "federalWithholding", label: "Federal Withholding (22% flat rate)", format: "currency" },
      { key: "socialSecurityTax", label: "Social Security Tax", format: "currency" },
      { key: "medicareTax", label: "Medicare Tax", format: "currency" },
      { key: "totalWithholding", label: "Total Withholding", format: "currency" },
      { key: "netAmount", label: "Net Bonus (Take-Home)", format: "currency", highlight: true },
    ],
    instructions:
      "Bonuses are \"supplemental wages\" under IRS rules and are commonly withheld at a flat 22% federal rate, " +
      "separate from your regular paycheck's bracket-based withholding — enter your bonus amount and filing " +
      "status to see exactly what's withheld and what you take home.\n\n" +
      "If you've already received other supplemental wages (bonuses, commissions) earlier in the year, enter the " +
      "year-to-date total — the IRS requires a 37% flat rate on supplemental wages above $1,000,000 in a " +
      "calendar year, and this calculator applies that automatically once your total crosses that threshold.",
    examples:
      "Example: a $5,000 bonus for a Single filer with no other supplemental wages this year has $1,100 withheld " +
      "at the 22% flat federal rate, plus about $382 in Social Security and Medicare — a net bonus of roughly " +
      "$3,518.",
    assumptions:
      FEDERAL_ONLY_ASSUMPTIONS +
      "\n\nThis uses the IRS's mandatory flat-rate method for supplemental wages (22% up to $1,000,000 of " +
      "supplemental wages in the year, 37% above that), which is what most employers actually use for bonuses. " +
      "Some employers instead use the aggregate method (combining the bonus with a regular paycheck and " +
      "withholding based on the total), which can produce a different withholding amount — though your final tax " +
      "liability for the year is the same either way once you file.",
    faq: [
      {
        question: "Why is my bonus taxed at a flat 22%?",
        answer:
          "The IRS treats bonuses as \"supplemental wages\" and allows employers to withhold a flat 22% federal " +
          "rate on them (37% above $1 million of supplemental wages in a year), rather than the graduated rates " +
          "used for regular paychecks. This is withholding, not your final tax rate — you may get some of it " +
          "back (or owe more) when you file.",
      },
      {
        question: "Will I get back the difference if 22% is more than my actual tax rate?",
        answer:
          "Possibly — the 22% flat rate is withholding, not your final tax bill. If your overall marginal rate " +
          "for the year is lower than 22%, you'll typically get the difference back as part of your refund when " +
          "you file.",
      },
      ...FEDERAL_FAQ_BASICS.slice(0, 2),
    ],
  },
  {
    slug: "commission-tax-calculator",
    title: "Commission Tax Calculator",
    description:
      "See how much federal tax is withheld from your commission for 2026 using the IRS's flat 22% supplemental " +
      "wage rate, plus FICA — and what you actually take home.",
    metaTitle: "Commission Tax Calculator (2026) — 22% Supplemental Withholding",
    metaDescription:
      "Free commission tax calculator using the 2026 IRS flat 22% supplemental wage withholding rate. See your " +
      "net commission after federal tax and FICA.",
    calcInputs: [
      currencyField("supplementalAmount", "Commission Amount", { unit: "one-time", max: 500000, step: 500 }),
      currencyField("priorYtdSupplemental", "Other Supplemental Wages Already Paid This Year", {
        unit: "year-to-date",
        max: 2000000,
        step: 1000,
        required: false,
      }),
      filingStatusField,
    ],
    calcResult: { label: "Net Commission", format: "currency" },
    calcResults: [
      { key: "grossAmount", label: "Gross Commission Amount", format: "currency" },
      { key: "federalWithholding", label: "Federal Withholding (22% flat rate)", format: "currency" },
      { key: "socialSecurityTax", label: "Social Security Tax", format: "currency" },
      { key: "medicareTax", label: "Medicare Tax", format: "currency" },
      { key: "totalWithholding", label: "Total Withholding", format: "currency" },
      { key: "netAmount", label: "Net Commission (Take-Home)", format: "currency", highlight: true },
    ],
    instructions:
      "Like bonuses, commission payments are \"supplemental wages\" under IRS rules and are commonly withheld at " +
      "a flat 22% federal rate — enter your commission amount and filing status to see exactly what's withheld " +
      "and what you take home.\n\n" +
      "If you've already received other supplemental wages (commissions, bonuses) earlier this year, enter the " +
      "year-to-date total so this calculator can apply the 37% rate the IRS requires above $1,000,000 of " +
      "supplemental wages in a calendar year.",
    examples:
      "Example: a $3,000 commission payment for a Head of Household filer with no other supplemental wages this " +
      "year has $660 withheld at the 22% flat federal rate, plus about $230 in Social Security and Medicare — a " +
      "net commission of roughly $2,111.",
    assumptions:
      FEDERAL_ONLY_ASSUMPTIONS +
      "\n\nThis uses the IRS's mandatory flat-rate method for supplemental wages (22% up to $1,000,000 of " +
      "supplemental wages in the year, 37% above that). Some employers instead fold commission into a regular " +
      "paycheck and withhold using the aggregate method, which can produce a different withholding amount — " +
      "though your final tax liability for the year is the same either way once you file.",
    faq: [
      {
        question: "Is commission taxed differently than a regular paycheck?",
        answer:
          "For withholding purposes, yes — commission is typically treated as a supplemental wage and withheld " +
          "at a flat 22% federal rate rather than the graduated brackets used for regular pay. Your actual tax " +
          "liability for the year, once everything is combined at filing time, doesn't depend on how it was " +
          "withheld.",
      },
      {
        question: "Does commission count toward Social Security and Medicare too?",
        answer:
          "Yes — commission is still wages for FICA purposes, so Social Security (up to the wage base) and " +
          "Medicare both apply, which this calculator includes alongside the federal withholding estimate.",
      },
      ...FEDERAL_FAQ_BASICS.slice(0, 2),
    ],
  },

  // ---------------------------------------------------------------------
  // Overtime
  // ---------------------------------------------------------------------
  {
    slug: "overtime-tax-calculator",
    title: "Overtime Tax Calculator",
    description:
      "See how much federal tax your overtime pay adds for 2026 — overtime hours at 1.5x your hourly rate, " +
      "taxed at your marginal rate on top of your regular pay.",
    metaTitle: "Overtime Tax Calculator (2026) — Tax on Overtime Pay",
    metaDescription:
      "Free overtime tax calculator. See your overtime pay at time-and-a-half and the additional 2026 federal " +
      "tax it adds on top of your regular wages.",
    calcInputs: [
      currencyField("hourlyRate", "Hourly Rate", { unit: "per hour", max: 200, step: 0.5 }),
      { key: "regularHours", label: "Regular Hours (this week)", type: "number", unit: "hours", required: true, default: 40, min: 0, max: 40, step: 1 },
      { key: "overtimeHours", label: "Overtime Hours (this week)", type: "number", unit: "hours", required: true, default: 5, min: 0, max: 80, step: 1 },
      filingStatusField,
    ],
    calcResult: { label: "Overtime Take-Home Pay", format: "currency" },
    calcResults: [
      { key: "regularWeeklyPay", label: "Regular Weekly Pay", format: "currency" },
      { key: "overtimeWeeklyPay", label: "Overtime Weekly Pay (1.5x rate)", format: "currency" },
      { key: "overtimeTaxWithheld", label: "Extra Tax From Overtime", format: "currency" },
      { key: "overtimeNetPay", label: "Overtime Pay After Tax", format: "currency", highlight: true },
      { key: "totalNetWeeklyPay", label: "Total Weekly Take-Home Pay", format: "currency" },
    ],
    instructions:
      "Enter your hourly rate, your regular hours for the week (up to 40), and how many overtime hours you " +
      "worked, along with your filing status. This calculator pays your overtime hours at time-and-a-half (1.5x " +
      "your hourly rate), as required by federal law for non-exempt employees, then works out the EXTRA federal " +
      "income tax and FICA that overtime pay specifically adds on top of your regular weekly pay.\n\n" +
      "Because overtime pay stacks on top of your regular pay for the week, it's taxed starting at whatever " +
      "bracket your regular pay already put you in — this calculator isolates exactly how much of the overtime " +
      "pay you actually get to keep.",
    examples:
      "Example: a $25/hour worker with 40 regular hours and 8 overtime hours in a week earns $1,000 in regular " +
      "pay and $300 in overtime pay (at $37.50/hour); the overtime specifically adds about $61 in extra federal " +
      "tax and FICA, leaving roughly $239 of the overtime pay as take-home.",
    assumptions:
      FEDERAL_ONLY_ASSUMPTIONS +
      "\n\nThis calculator treats overtime pay as regular wages for withholding purposes (annualized weekly pay " +
      "through the standard federal brackets), which is the common approach — it doesn't apply the flat " +
      "supplemental-wage rate some employers use for overtime paid as a separate check.",
    faq: [
      {
        question: "Is overtime pay taxed at a higher rate than regular pay?",
        answer:
          "Not at a different RATE exactly — but because it stacks on top of your regular pay for the week, it's " +
          "taxed starting at your existing marginal bracket rather than from the lowest bracket, which can make " +
          "it feel like it's taxed more heavily even though the tax rules are the same.",
      },
      {
        question: "Is time-and-a-half required for all overtime?",
        answer:
          "Under federal law (the Fair Labor Standards Act), non-exempt employees must be paid at least 1.5x " +
          "their regular rate for hours worked beyond 40 in a week, which is what this calculator uses.",
      },
      ...FEDERAL_FAQ_BASICS.slice(0, 2),
    ],
  },

  // ---------------------------------------------------------------------
  // Second job
  // ---------------------------------------------------------------------
  {
    slug: "second-job-tax-calculator",
    title: "Second Job Tax Calculator",
    description:
      "Find out what tax rate really applies to a second job's income for 2026 — since it stacks on top of your " +
      "primary job's income at your existing marginal bracket.",
    metaTitle: "Second Job Tax Calculator (2026) — Tax Rate on Extra Income",
    metaDescription:
      "Free second job tax calculator. Find the real marginal tax rate and take-home pay for a second job's " +
      "income in 2026, on top of your primary job.",
    calcInputs: [
      currencyField("primaryAnnualIncome", "Primary Job Annual Income", { unit: "per year", max: 500000, step: 1000 }),
      currencyField("secondJobAnnualIncome", "Second Job Annual Income", { unit: "per year", max: 200000, step: 500 }),
      filingStatusField,
    ],
    calcResult: { label: "Net Second Job Income", format: "currency" },
    calcResults: [
      { key: "marginalRateOnSecondJob", label: "Marginal Rate on Second Job Income", format: "percentage", highlight: true },
      { key: "additionalFederalTax", label: "Additional Federal Income Tax", format: "currency" },
      { key: "socialSecurityTax", label: "Social Security Tax on Second Job", format: "currency" },
      { key: "medicareTax", label: "Medicare Tax on Second Job", format: "currency" },
      { key: "totalSecondJobTax", label: "Total Tax on Second Job Income", format: "currency" },
      { key: "netSecondJobIncome", label: "Second Job Income After Tax", format: "currency", highlight: true },
    ],
    instructions:
      "Thinking about taking a second job or side gig? Enter your primary job's annual income, the second job's " +
      "expected annual income, and your filing status. Because federal tax is progressive on your TOTAL income, " +
      "the second job's earnings don't start being taxed from $0 again — they stack on top of your primary " +
      "income, starting at whatever marginal bracket your primary job already put you in.\n\n" +
      "This calculator shows that real marginal rate, the actual extra federal tax and FICA the second job adds, " +
      "and — most usefully — what you'd actually take home from the second job after tax.",
    examples:
      "Example: someone earning $70,000 at their primary job (Single filer) who takes a second job paying " +
      "$15,000 a year sees that second income taxed starting at the 22% federal bracket, with about $4,448 in " +
      "combined tax between federal income tax and FICA — leaving roughly $10,553 of the second job's income as " +
      "actual take-home pay.",
    assumptions:
      FEDERAL_ONLY_ASSUMPTIONS +
      "\n\nThis assumes both jobs are W-2 employment (not self-employment) and that the standard deduction is " +
      "already fully used against your primary job's income, so the second job's income is taxed starting at " +
      "your primary job's marginal rate — the common real-world outcome, though your actual W-4 withholding at " +
      "each job individually may not reflect this automatically (many people under-withhold on a second job for " +
      "exactly this reason, and owe at tax time as a result).",
    faq: [
      {
        question: "Why does my second job seem to be taxed at a higher rate?",
        answer:
          "It's not a special \"second job tax\" — it's that your second job's income stacks on top of your " +
          "first job's income, so it's taxed starting at the bracket your first job already reached, not from " +
          "the lowest bracket. This is exactly what this calculator shows.",
      },
      {
        question: "Should I adjust my W-4 for a second job?",
        answer:
          "Often yes — many people under-withhold when they have two jobs because each employer's payroll system " +
          "calculates withholding as if it were their only job. The IRS W-4 form has a specific multiple-jobs " +
          "worksheet/checkbox to correct for this; this calculator can help you see roughly how much more should " +
          "be withheld.",
      },
      ...FEDERAL_FAQ_BASICS.slice(0, 2),
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:setup-finance-categories" first, ` +
        "then re-run this script."
    );
  }

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(def.calcInputs),
      calcResult: JSON.stringify(def.calcResult),
      calcResults: JSON.stringify(def.calcResults),
      instructions: paragraphsToHtml(def.instructions),
      examples: paragraphsToHtml(def.examples),
      assumptions: paragraphsToHtml(def.assumptions),
      faq: JSON.stringify(def.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: def.metaTitle,
      metaDescription: def.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.tool.update({
        where: { slug: def.slug },
        data: {
          ...toolContent,
          seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } },
        },
      });
      updated++;
    } else {
      await prisma.tool.create({
        data: {
          slug: def.slug,
          status: "draft",
          ...toolContent,
          seoMeta: { create: seoMetaContent },
        },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all filed under "${category.name}".`);
  console.log(
    "New tools are created with status Draft — open them in /admin/tools, review, and set Status to Published " +
      "when you're happy with each one."
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
