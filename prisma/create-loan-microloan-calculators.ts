// One-time (but safe to re-run) batch setup script: creates the Microloan tools
// (7) of the Loan Calculators expansion 3, filed under Loan Calculators > General Loan Calculators.
// See src/lib/calc-engine-loan-microloan.ts for the math and
// src/lib/calc-engine-loan-sba.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-microloan-calculators.ts
// or
//   npm run db:create-loan-microloan-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "loan-calculators";
const CATEGORY = { name: "General Loan Calculators", slug: "general-loan-calculators" };

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

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't financial advice. " +
  "Actual rates, fees, and terms depend on the lender and your credit profile — check your loan agreement " +
  "or ask your lender for exact figures.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "microloan-calculator",
    title: "Microloan Calculator",
    description: "Estimate a small business microloan: monthly payment, total interest, total cost with the upfront fee, and the APR.",
    metaTitle: "Microloan Calculator — Payment, Cost & APR",
    metaDescription: "Free microloan calculator. See the monthly payment, interest, total cost with fees, and APR for an SBA or nonprofit microloan.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 25000, max: 50000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 30, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 1, max: 72, step: 1 }),
      currencyField("upfrontFee", "Upfront Fees", { default: 500, max: 5000, step: 50, required: false }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCost", label: "Total Cost (Interest + Fees)", format: "currency" },
      { key: "apr", label: "APR (Including Fees)", format: "percentage" },
    ],
    instructions:
      "Enter the amount, rate, term in months and any upfront fees (packaging or closing fees). SBA Microloans go up " +
      "to $50,000 with terms of up to 6 years and are made by nonprofit lenders, who often add free business coaching. " +
      "Rates usually run higher than bank loans but far below most online lenders.",
    examples:
      "Example: a $25,000 microloan at 9% over 48 months costs $622.13 a month " +
      "and $4,862.05 in interest. With $500 of fees, the total cost is $5,362.05 and the APR is 10.06%.",
    assumptions:
      "Fixed rate, equal monthly payments, fees paid at closing. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who offers microloans?",
        answer: "SBA-approved nonprofit intermediaries, community development financial institutions (CDFIs), and other mission-driven lenders. Some platforms offer 0% crowdfunded microloans.",
      },
    ],
  },
  {
    slug: "microloan-payment-calculator",
    title: "Microloan Payment Calculator",
    description: "Find the weekly, every-two-weeks or monthly payment on a microloan — many microlenders collect small, frequent payments.",
    metaTitle: "Microloan Payment Calculator — Weekly or Monthly",
    metaDescription: "Free microloan payment calculator. See the weekly, biweekly or monthly payment, the number of payments, and total interest.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 5000, max: 50000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 12, min: 1, max: 72, step: 1 }),
      {
        key: "paymentsPerYear", label: "Payment Frequency", type: "dropdown", required: true, default: 52,
        options: [
          { label: "Weekly", value: 52 },
          { label: "Every Two Weeks", value: 26 },
          { label: "Monthly", value: 12 },
        ],
      },
    ],
    calcResult: { label: "Payment per Period", format: "currency" },
    calcResults: [
      { key: "numberOfPayments", label: "Number of Payments", format: "number" },
      { key: "paymentPerPeriod", label: "Payment per Period", format: "currency", highlight: true },
      { key: "monthlyEquivalent", label: "Monthly Equivalent", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the loan, rate and term, then choose how often you'll pay. Smaller, more frequent payments match daily " +
      "sales better for many small businesses and slightly reduce total interest because the balance falls sooner.",
    examples:
      "Example: $5,000 at 12% over 12 months with weekly payments is 52 " +
      "payments of $102.15 — about $442.65 a month — and $311.76 of interest.",
    assumptions:
      "Interest is charged per payment period at the annual rate divided by the payments per year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do weekly payments save money?",
        answer: "A little, if the rate is the same — you pay down the balance sooner. The main benefit is matching payments to steady weekly income.",
      },
    ],
  },
  {
    slug: "microloan-payoff-calculator",
    title: "Microloan Payoff Calculator",
    description: "See how much sooner you'll pay off a microloan — and how much interest you'll save — by adding a little extra to each monthly payment.",
    metaTitle: "Microloan Payoff Calculator — Extra Payments",
    metaDescription: "Free microloan payoff calculator. Add an extra amount each month and see your new payoff time and the interest you save.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 30000, max: 50000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10, max: 30, step: 0.25 }),
      numberField("remainingMonths", "Months Left", { default: 60, min: 1, max: 72, step: 1 }),
      currencyField("extraMonthly", "Extra Payment Each Month", { default: 200, max: 10000, step: 10 }),
    ],
    calcResult: { label: "Months to Payoff", format: "number" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "newPayment", label: "New Monthly Payment", format: "currency" },
      { key: "monthsToPayoff", label: "Months to Payoff", format: "number", highlight: true },
      { key: "monthsSaved", label: "Months Saved", format: "number" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "Enter your balance, rate, months left and the extra you can add each month — for example, from a good sales " +
      "month. Most microloans have no prepayment penalty, but check your note.",
    examples:
      "Example: $30,000 at 10% with 60 months left costs $637.41 a month. " +
      "Paying $837.41 instead clears it in 43 months — 17 sooner — saving $2,463.20.",
    assumptions:
      "Fixed rate; extra goes straight to principal. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I pay off a microloan early?",
        answer: "If there's no prepayment penalty and you have spare cash after keeping a reserve, it saves interest. Keep enough working capital to run the business.",
      },
    ],
  },
  {
    slug: "microloan-interest-calculator",
    title: "Microloan Interest Calculator",
    description: "Convert a flat microloan interest rate — charged on the full amount for the whole term — into the true declining-balance APR.",
    metaTitle: "Microloan Interest Calculator — Flat Rate to APR",
    metaDescription: "Free microloan interest calculator. See flat-rate interest, the payment, and the real APR, which is nearly double the flat rate.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 2000, max: 50000, step: 100 }),
      percentField("flatRatePercent", "Flat Interest Rate (per Year)", { default: 15, max: 60, step: 0.5 }),
      numberField("termMonths", "Loan Term (Months)", { default: 12, min: 1, max: 72, step: 1 }),
    ],
    calcResult: { label: "Equivalent APR", format: "percentage" },
    calcResults: [
      { key: "flatInterest", label: "Interest Charged (Flat)", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "totalRepaid", label: "Total Repaid", format: "currency" },
      { key: "equivalentApr", label: "Equivalent APR", format: "percentage", highlight: true },
    ],
    instructions:
      "Some microfinance lenders quote a flat rate: interest is charged on the original amount for the whole term, even " +
      "though you repay part of it every month. Enter the amount, flat rate and term to see the interest, the payment, " +
      "and the declining-balance APR you can compare with other loans.",
    examples:
      "Example: $2,000 at a 15% flat rate for 12 months costs $300 of interest " +
      "and $191.67 a month. Because you repay as you go, the real APR is 26.62%.",
    assumptions:
      "Equal monthly payments; no fees. Fees would push the APR higher. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is a flat rate misleading?",
        answer: "You pay interest on money you've already repaid. On a 12-month loan, a flat rate works out to nearly double as an APR.",
      },
    ],
  },
  {
    slug: "microloan-affordability-calculator",
    title: "Microloan Affordability Calculator",
    description: "Find how big a microloan your business can afford from its monthly profit and the share you're willing to put toward repayment.",
    metaTitle: "Microloan Affordability Calculator — Max Loan",
    metaDescription: "Free microloan affordability calculator. Turn monthly profit into a safe maximum payment and loan amount, within the $50,000 SBA limit.",
    calcInputs: [
      currencyField("monthlyProfit", "Average Monthly Business Profit", { default: 3000, max: 1000000, step: 100 }),
      percentField("sharePercent", "Share of Profit for Loan Payments", { default: 20, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 30, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 1, max: 72, step: 1 }),
    ],
    calcResult: { label: "Maximum Microloan", format: "currency" },
    calcResults: [
      { key: "maxMonthlyPayment", label: "Maximum Monthly Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan From Your Profit", format: "currency" },
      { key: "maxLoanWithinSbaLimit", label: "Maximum Microloan", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your average monthly profit after expenses and owner pay, the share of it you can safely commit to loan " +
      "payments (keeping a cushion for slow months), and the expected rate and term. The result is capped at the " +
      "$50,000 SBA Microloan limit.",
    examples:
      "Example: $3,000 a month of profit with 20% set aside allows $600 a month. At " +
      "9% over 60 months, that supports a microloan of $28,904.02.",
    assumptions:
      "Fixed rate, equal monthly payments. Lenders also look at credit, collateral and your business plan. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can a startup get a microloan?",
        answer: "Yes — microlenders often fund startups with little history, using a business plan, projections and the owner's credit instead.",
      },
    ],
  },
  {
    slug: "microloan-comparison-calculator",
    title: "Microloan Comparison Calculator",
    description: "Compare a microloan with putting the same amount on a business credit card and paying it off at the same monthly payment.",
    metaTitle: "Microloan vs Business Credit Card Calculator",
    metaDescription: "Free microloan comparison calculator. Compare the cost and payoff time of a microloan vs a business credit card at the same payment.",
    calcInputs: [
      currencyField("amount", "Amount Needed", { default: 15000, max: 50000, step: 100 }),
      percentField("microRatePercent", "Microloan Rate", { default: 9, max: 30, step: 0.25 }),
      numberField("microTermMonths", "Microloan Term (Months)", { default: 36, min: 1, max: 72, step: 1 }),
      currencyField("microFee", "Microloan Fees", { default: 300, max: 5000, step: 50, required: false }),
      percentField("cardAprPercent", "Credit Card APR", { default: 24, max: 40, step: 0.25 }),
    ],
    calcResult: { label: "Savings With the Microloan", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment (Both)", format: "currency" },
      { key: "microloanTotalCost", label: "Microloan Total Cost", format: "currency" },
      { key: "cardMonthsToRepay", label: "Credit Card — Months to Repay", format: "number" },
      { key: "cardTotalInterest", label: "Credit Card — Total Interest", format: "currency" },
      { key: "savingsWithMicroloan", label: "Savings With the Microloan", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the amount, the microloan's rate, term and fees, and your card's APR. The calculator pays the card down " +
      "at the same monthly payment as the microloan, so you can compare like for like.",
    examples:
      "Example: $15,000 as a microloan at 9% over 36 months costs $477 a " +
      "month and $2,471.86 in total. At 24% on a card, the same payment takes " +
      "51 months and $8,880.18 of interest — the microloan saves $6,408.32.",
    assumptions:
      "The card balance gets no new charges and its APR doesn't change; no annual fee. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When is a business credit card better?",
        answer: "For small amounts you can repay within a 0% intro period or the grace period. For longer-term needs, a microloan is usually cheaper.",
      },
    ],
  },
  {
    slug: "microloan-eligibility-calculator",
    title: "Microloan Eligibility Calculator",
    description: "Check whether a microloan fits: within the SBA Microloan amount and term limits, an affordable share of cash flow, and your lender's credit score minimum.",
    metaTitle: "Microloan Eligibility Calculator — Quick Check",
    metaDescription: "Free microloan eligibility calculator. Check the amount and term limits, payment-to-cash-flow and credit score for an SBA microloan.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 20000, max: 100000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10, max: 30, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 1, max: 120, step: 1 }),
      currencyField("monthlyCashFlow", "Monthly Business Cash Flow", { default: 2500, max: 1000000, step: 100 }),
      percentField("maxSharePercent", "Maximum Payment as Share of Cash Flow", { default: 25, min: 1, max: 100, step: 1 }),
      numberField("creditScore", "Your Credit Score", { default: 620, min: 300, max: 850, step: 1 }),
      numberField("minScore", "Lender's Minimum Score", { default: 575, min: 300, max: 850, step: 1 }),
    ],
    calcResult: { label: "Checks Passed (of 4)", format: "number" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "paymentShareOfCashFlow", label: "Payment as Share of Cash Flow", format: "percentage" },
      { key: "maxLoanAtThatShare", label: "Largest Loan Within That Share", format: "currency" },
      { key: "checksPassed", label: "Checks Passed (of 4)", format: "number", highlight: true },
    ],
    instructions:
      "Enter the loan you want, its rate and term, your monthly cash flow and a payment limit, plus your credit score " +
      "and your lender's minimum. The four checks: $50,000 or less; 72 months or less; payment within your cash flow " +
      "limit; and score at or above the lender's minimum. Microlenders are often flexible on credit if the business " +
      "plan is strong.",
    examples:
      "Example: $20,000 at 10% over 48 months costs $507.25 a month — " +
      "20.29% of $2,500 of cash flow. With a 620 score, 4 of 4 " +
      "checks pass. Keeping payments within 25% allows up to $24,642.60.",
    assumptions:
      "Limits are those of the SBA Microloan program; other microlenders may differ. Lenders set their own credit " +
      "standards, often working with scores in the 500s–600s. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do microloans need collateral?",
        answer: "Most SBA microlenders ask for some collateral and a personal guarantee, but requirements are lighter than for bank loans.",
      },
    ],
  },
];

async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY_SLUG } });
  if (!parent) {
    throw new Error(
      `The "${PARENT_CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
        "then re-run this script."
    );
  }
  console.log(`Creating sub-category "${CATEGORY.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory();

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
