// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Interest Calculators" sub-batch C (Fixed Rate Instances,
// Contributions/Withdrawals & Growth Analysis). Part of the
// Interest_Calculators_Topical_Map_Tool_List.xlsx build-out — see
// create-interest-core-calculators.ts for the full batch context and the
// 3 skipped duplicates. This is the last of the 3 sub-batches (34 tools
// total in the source file; 31 built across all 3 sub-batches).
//
// See src/lib/calc-engine-interest-analysis.ts for the math and for
// notes on how the contribution/deposit/withdrawal cluster and the
// interest-earned/accumulation/growth/comparison cluster are each
// deliberately differentiated from one another.
//
// HOW TO RUN
//   npx tsx prisma/create-interest-analysis-calculators.ts
// or
//   npm run db:create-interest-analysis-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "interest-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

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
    max: opts.max ?? 100000000,
    step: opts.step ?? 100,
  };
}

function percentField(
  key: string,
  label: string,
  opts: { required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "percentage",
    unit: "%",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 100,
    step: opts.step ?? 0.1,
  };
}

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "number",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 1000000,
    step: opts.step ?? 1,
  };
}

function compoundingFrequencyField(defaultValue = 12) {
  return {
    key: "compoundingFrequency",
    label: "Compounding Frequency",
    type: "dropdown",
    required: true,
    default: defaultValue,
    options: [
      { label: "Daily", value: 365 },
      { label: "Monthly", value: 12 },
      { label: "Quarterly", value: 4 },
      { label: "Semi-Annually", value: 2 },
      { label: "Annually", value: 1 },
    ],
  };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't financial advice. " +
  "Actual rates and terms vary by account and lender — check with your bank or lender for figures specific " +
  "to your situation.";

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

const TOOLS: ToolDef[] = [
  {
    slug: "daily-interest-rate-calculator",
    title: "Daily Interest Rate Calculator",
    description: "Convert an annual interest rate into a daily rate, using either a 365- or 360-day convention.",
    metaTitle: "Daily Interest Rate Calculator — Free & Instant",
    metaDescription: "Free daily interest rate calculator. Enter your annual rate and day-count convention to find the equivalent daily rate.",
    calcInputs: [
      percentField("annualRatePercent", "Annual Interest Rate", { default: 7, max: 50, step: 0.05 }),
      {
        key: "dayCountBasis", label: "Day-Count Convention", type: "dropdown", required: true, default: 365,
        options: [
          { label: "Actual/365", value: 365 },
          { label: "Actual/360", value: 360 },
        ],
      },
    ],
    calcResult: { label: "Daily Interest Rate", format: "percentage" },
    calcResults: [],
    instructions:
      "Enter the annual interest rate and choose a day-count convention. Actual/365 divides by 365 days and is " +
      "common for many consumer accounts; Actual/360 divides by 360 days and is common in commercial lending — " +
      "it produces a very slightly higher daily rate for the same annual rate.",
    examples: "Example: a 7% annual rate works out to about 0.0192% per day on an Actual/365 basis, or about 0.0194% per day on an Actual/360 basis.",
    assumptions:
      "Simple division of the annual rate by the chosen day-count basis — this is the nominal daily rate, not " +
      "an effective one. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why would a lender use a 360-day year?",
        answer: "The Actual/360 convention is a long-standing commercial lending practice that effectively charges interest for 5-6 more \"days\" worth of rate each year than Actual/365 would, slightly increasing the effective cost for the same stated annual rate — always check your loan documents to see which convention applies.",
      },
    ],
  },
  {
    slug: "monthly-interest-rate-calculator",
    title: "Monthly Interest Rate Calculator",
    description: "Convert an annual percentage rate (APR) into the equivalent monthly periodic rate.",
    metaTitle: "Monthly Interest Rate Calculator — Free & Instant",
    metaDescription: "Free monthly interest rate calculator. Enter your annual interest rate (APR) to find the equivalent monthly periodic rate.",
    calcInputs: [
      percentField("annualRatePercent", "Annual Interest Rate (APR)", { default: 6, max: 50, step: 0.05 }),
    ],
    calcResult: { label: "Monthly Interest Rate", format: "percentage" },
    calcResults: [],
    instructions:
      "Enter the annual percentage rate (APR). This divides it by 12 to find the nominal monthly periodic rate " +
      "— the rate typically applied each billing cycle on a monthly-compounding loan or account.",
    examples: "Example: a 6% APR works out to a 0.5% monthly periodic rate.",
    assumptions:
      "Simple division of APR by 12 — this is the nominal monthly rate, not an effective one. For any other " +
      "number of periods per year, use the general Periodic Interest Rate Calculator instead. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is this the same as the Periodic Interest Rate Calculator?",
        answer: "This tool is a simplified, monthly-only version with no extra inputs — the Periodic Interest Rate Calculator (under Rate Conversions) does the same division but lets you choose any number of periods per year, not just 12.",
      },
    ],
  },
  {
    slug: "compound-interest-with-contributions-calculator",
    title: "Compound Interest with Contributions Calculator",
    description: "Calculate the future value of a lump sum plus regular contributions, with a selectable compounding frequency and contribution timing.",
    metaTitle: "Compound Interest with Contributions Calculator — Free & Instant",
    metaDescription: "Free compound interest with contributions calculator. Enter your starting balance, rate, compounding frequency, and regular contribution to see your future value.",
    calcInputs: [
      currencyField("principal", "Starting Balance", { default: 5000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 6, max: 30, step: 0.05 }),
      compoundingFrequencyField(12),
      currencyField("contributionAmount", "Contribution Per Period", { default: 200, max: 1000000, step: 25 }),
      numberField("years", "Term (Years)", { default: 10, min: 1, max: 50, step: 1 }),
      {
        key: "contributionTiming", label: "Contribution Timing", type: "dropdown", required: true, default: 0,
        options: [
          { label: "End of Period", value: 0 },
          { label: "Beginning of Period", value: 1 },
        ],
      },
    ],
    calcResult: { label: "Ending Balance", format: "currency" },
    calcResults: [
      { key: "endingBalance", label: "Ending Balance", format: "currency", highlight: true },
      { key: "totalContributions", label: "Total Contributed (Starting Balance + Contributions)", format: "currency" },
      { key: "totalInterest", label: "Total Interest Earned", format: "currency" },
    ],
    instructions:
      "Enter your starting balance, annual rate, compounding frequency, how much you'll contribute each " +
      "compounding period, the term in years, and whether contributions happen at the start or end of each " +
      "period. This is the general, fully-flexible version — see the Compound Interest with Monthly " +
      "Contributions Calculator for a simpler, fixed-monthly version with no extra choices to make.",
    examples: "Example: a $5,000 starting balance at 6% compounded monthly, with $200 contributed at the end of each month for 10 years, grows to $41,872.85 — $19,000.00 of that from contributions and the rest from interest.",
    assumptions:
      "Contributions are assumed to occur at the same frequency as compounding. Beginning-of-period " +
      "contributions earn one extra period of interest compared to end-of-period contributions. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does contribution timing really make a difference?",
        answer: "Yes, though usually a modest one — contributing at the beginning of each period means that period's contribution earns interest immediately, so beginning-of-period contributions always produce a slightly higher ending balance than end-of-period contributions, all else equal.",
      },
    ],
  },
  {
    slug: "compound-interest-with-monthly-contributions-calculator",
    title: "Compound Interest with Monthly Contributions Calculator",
    description: "Calculate the future value of a lump sum plus fixed monthly contributions, compounded monthly.",
    metaTitle: "Compound Interest with Monthly Contributions Calculator — Free & Instant",
    metaDescription: "Free compound interest with monthly contributions calculator. Enter your starting balance, rate, and monthly contribution to see your future value.",
    calcInputs: [
      currencyField("principal", "Starting Balance", { default: 5000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 6, max: 30, step: 0.05 }),
      currencyField("monthlyContribution", "Monthly Contribution", { default: 200, max: 1000000, step: 25 }),
      numberField("years", "Term (Years)", { default: 10, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Ending Balance", format: "currency" },
    calcResults: [
      { key: "endingBalance", label: "Ending Balance", format: "currency", highlight: true },
      { key: "totalContributions", label: "Total Contributed (Starting Balance + Contributions)", format: "currency" },
      { key: "totalInterest", label: "Total Interest Earned", format: "currency" },
    ],
    instructions:
      "Enter your starting balance, annual interest rate, fixed monthly contribution, and term in years. This " +
      "simplified version fixes compounding to monthly and contributions to the end of each month — the most " +
      "common real-world scenario — with no extra dropdowns to configure.",
    examples: "Example: a $5,000 starting balance at 6%, with $200 added every month for 10 years, grows to $41,872.85.",
    assumptions:
      "Fixed to monthly compounding with end-of-month contributions. For control over compounding frequency and " +
      "contribution timing, use the general Compound Interest with Contributions Calculator instead. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the general Contributions calculator?",
        answer: "This tool is the simplified, single most common case — monthly compounding with monthly, end-of-period contributions and no extra settings. The Compound Interest with Contributions Calculator lets you choose a different compounding frequency and contribution timing.",
      },
    ],
  },
  {
    slug: "compound-interest-with-regular-deposits-calculator",
    title: "Compound Interest with Regular Deposits Calculator",
    description: "Calculate your ending balance from a starting amount plus a set number of regular deposits, with a breakdown of deposits versus interest earned.",
    metaTitle: "Compound Interest with Regular Deposits Calculator — Free & Instant",
    metaDescription: "Free compound interest with regular deposits calculator. Enter your starting balance, deposit amount, frequency, and number of deposits to see your ending balance, total deposited, and interest earned.",
    calcInputs: [
      currencyField("startingBalance", "Starting Balance", { default: 1000, max: 100000000, step: 500 }),
      currencyField("depositAmount", "Deposit Amount", { default: 150, max: 1000000, step: 10 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 5, max: 30, step: 0.05 }),
      {
        key: "depositsPerYear", label: "Deposit Frequency", type: "dropdown", required: true, default: 12,
        options: [
          { label: "Weekly", value: 52 },
          { label: "Biweekly", value: 26 },
          { label: "Monthly", value: 12 },
          { label: "Quarterly", value: 4 },
          { label: "Annually", value: 1 },
        ],
      },
      numberField("numberOfDeposits", "Number of Deposits", { default: 60, min: 1, max: 3650, step: 1 }),
    ],
    calcResult: { label: "Ending Balance", format: "currency" },
    calcResults: [
      { key: "endingBalance", label: "Ending Balance", format: "currency", highlight: true },
      { key: "totalDeposited", label: "Total Deposited", format: "currency" },
      { key: "totalInterest", label: "Total Interest Earned", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your starting balance, the amount of each deposit, your annual rate, how often you'll deposit, and " +
      "the total number of deposits you plan to make. Unlike the contribution calculators above (which are " +
      "entered in years), this tool is entered directly in number of deposits, and headlines how much of your " +
      "ending balance came from deposits versus interest.",
    examples: "Example: a $1,000 starting balance plus 60 monthly deposits of $150 at 5% grows to $11,484.27 — $10,000.00 deposited and $1,484.27 from interest.",
    assumptions:
      "Compounding frequency is matched to the deposit frequency you select. Deposits are assumed to occur at " +
      "the end of each period. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why enter number of deposits instead of years?",
        answer: "It's often more natural to think in terms of \"I'll make 60 biweekly deposits\" than to convert that into years first — this tool does that conversion internally so you can plan directly around your deposit schedule.",
      },
    ],
  },
  {
    slug: "compound-interest-with-withdrawals-calculator",
    title: "Compound Interest with Withdrawals Calculator",
    description: "Calculate how a balance draws down over time when you make regular withdrawals while it continues to earn interest.",
    metaTitle: "Compound Interest with Withdrawals Calculator — Free & Instant",
    metaDescription: "Free compound interest with withdrawals calculator. Enter your starting balance, rate, and monthly withdrawal to see your ending balance and when (if ever) it's depleted.",
    calcInputs: [
      currencyField("principal", "Starting Balance", { default: 100000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 5, max: 30, step: 0.05 }),
      currencyField("monthlyWithdrawal", "Monthly Withdrawal", { default: 500, max: 1000000, step: 25 }),
      numberField("years", "Term (Years)", { default: 10, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Ending Balance", format: "currency" },
    calcResults: [
      { key: "endingBalance", label: "Ending Balance", format: "currency", highlight: true },
      { key: "totalWithdrawn", label: "Total Withdrawn", format: "currency" },
      { key: "totalInterestEarned", label: "Total Interest Earned", format: "currency" },
      { key: "monthsUntilDepleted", label: "Months Until Depleted (0 = not depleted in this term)", format: "number" },
    ],
    instructions:
      "Enter your starting balance, annual interest rate, fixed monthly withdrawal, and term in years. This is " +
      "the mirror image of the contribution/deposit calculators above: instead of adding money each month, " +
      "you're taking it out, while the remaining balance keeps earning interest. If withdrawals outpace interest " +
      "and growth, the balance can reach zero before your term ends — the result shows exactly when.",
    examples: "Example: a $100,000 balance at 5%, withdrawing $500 a month for 10 years, ends with $87,059.81 remaining — the balance is never depleted since interest earned outpaces withdrawals.",
    assumptions:
      "Assumes monthly compounding and a fixed monthly withdrawal amount that doesn't change over time. The " +
      "projection is capped at 100 years (1,200 months) if the balance is never depleted. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens if my withdrawals are too high?",
        answer: "If your monthly withdrawal exceeds what the balance earns in interest, the balance will decline every month and eventually reach zero — the Months Until Depleted result tells you exactly how many months that takes, so you can adjust your withdrawal amount if it depletes sooner than you'd like.",
      },
    ],
  },
  {
    slug: "interest-earned-calculator",
    title: "Interest Earned Calculator",
    description: "Calculate exactly how much interest a balance will earn — isolating the interest amount rather than just the ending balance.",
    metaTitle: "Interest Earned Calculator — Free & Instant",
    metaDescription: "Free interest earned calculator. Enter your principal, rate, compounding frequency, and term to see exactly how much interest you'll earn.",
    calcInputs: [
      currencyField("principal", "Principal", { default: 20000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 6, max: 30, step: 0.05 }),
      compoundingFrequencyField(4),
      numberField("years", "Term (Years)", { default: 8, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Interest Earned", format: "currency" },
    calcResults: [
      { key: "interestEarned", label: "Interest Earned", format: "currency", highlight: true },
      { key: "endingBalance", label: "Ending Balance", format: "currency" },
    ],
    instructions:
      "Enter your principal, annual rate, compounding frequency, and term in years. Where most compound-interest " +
      "tools headline the ending balance, this one puts the interest earned front and center — useful when what " +
      "you actually want to know is the dollar amount of growth, not the total balance.",
    examples: "Example: $20,000 at 6% compounded quarterly for 8 years earns $12,206.49 in interest, ending with a $32,206.49 balance.",
    assumptions:
      "Standard compound interest with no additional deposits or withdrawals. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from a regular compound interest calculator?",
        answer: "The math is the same standard compound-interest formula — the difference is purely in presentation: this tool leads with the interest earned as the headline result, rather than the ending balance.",
      },
    ],
  },
  {
    slug: "interest-accumulation-calculator",
    title: "Interest Accumulation Calculator",
    description: "See a year-by-year schedule of how a balance accumulates over 10 years of compound interest.",
    metaTitle: "Interest Accumulation Calculator — Free & Instant",
    metaDescription: "Free interest accumulation calculator. Enter your principal, rate, and compounding frequency to see a year-by-year balance schedule over 10 years.",
    calcInputs: [
      currencyField("principal", "Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 5, max: 30, step: 0.05 }),
      compoundingFrequencyField(12),
    ],
    calcResult: { label: "Balance After 10 Years", format: "currency" },
    calcResults: [
      { key: "balanceYear1", label: "Balance — Year 1", format: "currency" },
      { key: "balanceYear2", label: "Balance — Year 2", format: "currency" },
      { key: "balanceYear3", label: "Balance — Year 3", format: "currency" },
      { key: "balanceYear4", label: "Balance — Year 4", format: "currency" },
      { key: "balanceYear5", label: "Balance — Year 5", format: "currency" },
      { key: "balanceYear6", label: "Balance — Year 6", format: "currency" },
      { key: "balanceYear7", label: "Balance — Year 7", format: "currency" },
      { key: "balanceYear8", label: "Balance — Year 8", format: "currency" },
      { key: "balanceYear9", label: "Balance — Year 9", format: "currency" },
      { key: "balanceYear10", label: "Balance — Year 10", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your principal, annual rate, and compounding frequency. Unlike a single-ending-balance calculator, " +
      "this tool shows the running balance at the end of each of the next 10 years, so you can see exactly how " +
      "the accumulation accelerates year over year.",
    examples: "Example: $10,000 at 5% compounded monthly reaches $10,511.62 after year 1, growing to $16,470.09 by year 10.",
    assumptions:
      "Shows a fixed 10-year schedule regardless of any particular target term, with no additional deposits or " +
      "withdrawals. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the schedule always 10 years?",
        answer: "A fixed 10-year window keeps the year-by-year breakdown a manageable, consistent size to display — if you need a balance at a different single point in time instead of the full schedule, the Interest Earned Calculator or Interest Calculator let you enter any term directly.",
      },
    ],
  },
  {
    slug: "interest-growth-calculator",
    title: "Interest Growth Calculator",
    description: "See how much a balance will grow in percentage terms, as a growth multiple, and how long it would take to double.",
    metaTitle: "Interest Growth Calculator — Free & Instant",
    metaDescription: "Free interest growth calculator. Enter your principal, rate, compounding frequency, and term to see total growth percentage, growth multiple, and doubling time.",
    calcInputs: [
      currencyField("principal", "Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 6, max: 30, step: 0.05 }),
      compoundingFrequencyField(12),
      numberField("years", "Term (Years)", { default: 15, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Growth Multiple", format: "number" },
    calcResults: [
      { key: "endingBalance", label: "Ending Balance", format: "currency" },
      { key: "totalGrowthPercent", label: "Total Growth", format: "percentage" },
      { key: "growthMultiple", label: "Growth Multiple (× Original)", format: "number", highlight: true },
      { key: "doublingTimeYears", label: "Time to Double (Years)", format: "number" },
    ],
    instructions:
      "Enter your principal, annual rate, compounding frequency, and term in years. Rather than focusing on the " +
      "dollar amount, this tool reports growth-rate metrics: the total percentage growth, how many times over " +
      "your money multiplies, and — independent of your chosen term — how long it would take to double at that " +
      "same effective rate.",
    examples: "Example: $10,000 at 6% compounded monthly for 15 years grows 145.41%, a 2.4541× multiple, and would double in about 11.58 years at that rate.",
    assumptions:
      "Doubling time is calculated from the effective annual rate implied by your chosen nominal rate and " +
      "compounding frequency, independent of the term you enter. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is this the same as the Rule of 72?",
        answer: "The Rule of 72 is a quick mental-math approximation (72 ÷ rate). This tool instead calculates the exact doubling time using the actual compound-interest formula, which is more precise, especially at higher rates where the Rule of 72 approximation gets less accurate.",
      },
    ],
  },
  {
    slug: "interest-comparison-calculator",
    title: "Interest Comparison Calculator",
    description: "Compare two different interest scenarios — different principals, rates, or compounding frequencies — side by side over the same term.",
    metaTitle: "Interest Comparison Calculator — Free & Instant",
    metaDescription: "Free interest comparison calculator. Enter two different principal, rate, and compounding scenarios to compare their ending balances side by side.",
    calcInputs: [
      currencyField("principalA", "Scenario A — Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("rateAPercent", "Scenario A — Annual Rate", { default: 5, max: 30, step: 0.05 }),
      compoundingFrequencyField(12),
      currencyField("principalB", "Scenario B — Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("rateBPercent", "Scenario B — Annual Rate", { default: 5.5, max: 30, step: 0.05 }),
      { key: "compoundingB", label: "Scenario B — Compounding Frequency", type: "dropdown", required: true, default: 1, options: [
        { label: "Daily", value: 365 },
        { label: "Monthly", value: 12 },
        { label: "Quarterly", value: 4 },
        { label: "Semi-Annually", value: 2 },
        { label: "Annually", value: 1 },
      ] },
      numberField("years", "Term (Years, applies to both)", { default: 10, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Difference (B − A)", format: "currency" },
    calcResults: [
      { key: "endingBalanceA", label: "Scenario A — Ending Balance", format: "currency" },
      { key: "endingBalanceB", label: "Scenario B — Ending Balance", format: "currency" },
      { key: "difference", label: "Difference (B − A)", format: "currency", highlight: true },
    ],
    instructions:
      "Enter two independent scenarios — each with its own principal, annual rate, and compounding frequency — " +
      "over the same term in years. The result shows both ending balances and the difference, so you can " +
      "directly compare two accounts, offers, or rate/compounding combinations.",
    examples: "Example: $10,000 at 5% compounded monthly for 10 years ends at $16,470.09, versus $10,000 at 5.5% compounded annually ending at $17,081.44 — Scenario B ends $611.35 higher, despite compounding less often, because its stated rate is higher.",
    assumptions:
      "Both scenarios use standard compound interest with no additional deposits or withdrawals, over the same " +
      "shared term. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why might a less-frequently-compounded scenario still win?",
        answer: "Compounding frequency matters, but the stated rate usually matters more — a meaningfully higher rate compounded only annually can easily out-earn a lower rate compounded daily, which is exactly the kind of comparison this tool is built to check.",
      },
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
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      updated++;
    } else {
      await prisma.tool.create({
        data: { slug: def.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
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
