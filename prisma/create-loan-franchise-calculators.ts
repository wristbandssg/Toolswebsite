// One-time (but safe to re-run) batch setup script: creates the Franchise Loan tools
// (7) of the Loan Calculators expansion 3, filed under Loan Calculators > General Loan Calculators.
// See src/lib/calc-engine-loan-franchise.ts for the math and
// src/lib/calc-engine-loan-sba.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-franchise-calculators.ts
// or
//   npm run db:create-loan-franchise-calculators

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
    slug: "franchise-loan-calculator",
    title: "Franchise Loan Calculator",
    description: "Add up a franchise's initial investment — franchise fee, build-out, equipment and working capital — and see the cash you need, the loan, and the monthly payment.",
    metaTitle: "Franchise Loan Calculator — Investment & Payment",
    metaDescription: "Free franchise loan calculator. Total your franchise fee, build-out, equipment and working capital, then see your equity, loan and payment.",
    calcInputs: [
      currencyField("franchiseFee", "Initial Franchise Fee", { default: 40000, max: 1000000, step: 1000 }),
      currencyField("buildOut", "Build-Out / Real Estate Improvements", { default: 250000, max: 10000000, step: 1000, required: false }),
      currencyField("equipment", "Equipment, Signage & Opening Inventory", { default: 120000, max: 10000000, step: 1000, required: false }),
      currencyField("workingCapital", "Working Capital (First Months)", { default: 60000, max: 10000000, step: 1000, required: false }),
      percentField("equityPercent", "Your Cash Injection", { default: 20, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10.5, max: 25, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 25, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalInvestment", label: "Total Initial Investment", format: "currency" },
      { key: "equityRequired", label: "Your Cash Injection", format: "currency" },
      { key: "loanAmount", label: "Franchise Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Use the estimated initial investment table in the franchise's Franchise Disclosure Document (Item 7) to fill in " +
      "the costs. Lenders usually want 10%–30% of the total from your own cash, then lend the rest — often as an SBA " +
      "7(a) loan for franchises listed in SBA's Franchise Directory.",
    examples:
      "Example: a $40,000 franchise fee, $250,000 of build-out, $120,000 of equipment and $60,000 " +
      "of working capital total $470,000. With 20% down ($94,000), you borrow " +
      "$376,000. At 10.50% over 10 years, that's $5,073.56 a month.",
    assumptions:
      "Fixed rate and equal monthly payments. Real Item 7 ranges are wide — use the high end to be safe. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I use an SBA loan to buy a franchise?",
        answer: "Yes, if the brand is in SBA's Franchise Directory. SBA 7(a) loans are among the most common ways franchisees finance a new unit.",
      },
    ],
  },
  {
    slug: "franchise-loan-payment-calculator",
    title: "Franchise Loan Payment Calculator",
    description: "See your full monthly obligation as a franchisee: the loan payment plus the royalty and advertising fund fees, as a share of revenue.",
    metaTitle: "Franchise Loan Payment Calculator — With Royalties",
    metaDescription: "Free franchise loan payment calculator. Add royalty and ad fund fees to your loan payment and see the total as a share of revenue.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 350000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10.5, max: 25, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 25, step: 1 }),
      currencyField("monthlyRevenue", "Expected Monthly Revenue", { default: 80000, max: 10000000, step: 1000 }),
      percentField("royaltyPercent", "Royalty Fee (% of Revenue)", { default: 6, max: 20, step: 0.25 }),
      percentField("adFundPercent", "Advertising Fund (% of Revenue)", { default: 2, max: 10, step: 0.25, required: false }),
    ],
    calcResult: { label: "Total Monthly Obligations", format: "currency" },
    calcResults: [
      { key: "loanPayment", label: "Loan Payment", format: "currency" },
      { key: "royaltyFee", label: "Royalty Fee", format: "currency" },
      { key: "adFundFee", label: "Advertising Fund Fee", format: "currency" },
      { key: "totalMonthlyObligations", label: "Total Monthly Obligations", format: "currency", highlight: true },
      { key: "shareOfRevenue", label: "Share of Revenue", format: "percentage" },
    ],
    instructions:
      "Enter your loan details, expected monthly revenue, and the royalty and ad fund rates from the franchise " +
      "agreement. Royalties and ad fund fees are paid on sales — before costs — so they must be covered even in a slow " +
      "month, just like the loan payment.",
    examples:
      "Example: a $350,000 loan at 10.50% over 10 years costs $4,722.72 a month. On " +
      "$80,000 of sales, a 6% royalty is $4,800 and a 2% ad fund is " +
      "$1,600. Together that's $11,122.72 a month — 13.90% of revenue.",
    assumptions:
      "Royalties as a flat percentage of revenue; some brands charge a fixed monthly fee or tiered rates instead. " +
      "Technology and other fees aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a typical franchise royalty?",
        answer: "Often 4%–8% of gross sales, plus 1%–4% for the brand's advertising fund.",
      },
    ],
  },
  {
    slug: "franchise-loan-payoff-calculator",
    title: "Franchise Loan Payoff Calculator",
    description: "See how fast you'd pay off a franchise loan by putting a share of each month's profit toward extra principal — and the interest you'd save.",
    metaTitle: "Franchise Loan Payoff Calculator — Pay From Profit",
    metaDescription: "Free franchise loan payoff calculator. Put a share of monthly profit toward the loan and see your new payoff date and interest saved.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10, max: 25, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 25, step: 1 }),
      currencyField("monthlyProfit", "Monthly Profit After the Loan Payment", { default: 8000, max: 10000000, step: 100 }),
      percentField("sharePercent", "Share of Profit for Extra Payments", { default: 25, max: 100, step: 1 }),
    ],
    calcResult: { label: "Months to Payoff", format: "number" },
    calcResults: [
      { key: "regularPayment", label: "Regular Monthly Payment", format: "currency" },
      { key: "extraPayment", label: "Extra Payment Each Month", format: "currency" },
      { key: "monthsToPayoff", label: "Months to Payoff", format: "number", highlight: true },
      { key: "yearsSaved", label: "Years Saved", format: "number" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "Enter the loan, rate and term, your monthly profit after all costs and the loan payment, and the share you'd put " +
      "toward the loan. Paying it down faster can free cash for a second unit sooner — but keep a reserve; SBA loans of " +
      "15+ years charge a fee for big prepayments in the first three years.",
    examples:
      "Example: a $300,000 loan at 10% over 10 years costs $3,964.52 a month. " +
      "Adding 25% of $8,000 in profit — $2,000 — pays it off in 66 months, " +
      "4.50 years early, saving $85,288.39.",
    assumptions:
      "Profit stays the same every month and the extra goes straight to principal. Fixed rate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I pay off a franchise loan or open another unit?",
        answer: "Compare the loan's after-tax rate with the return you'd expect on a new unit. Paying debt is a guaranteed return; expansion is riskier but can grow faster.",
      },
    ],
  },
  {
    slug: "franchise-loan-interest-calculator",
    title: "Franchise Loan Interest Calculator",
    description: "Calculate interest on a franchise loan with interest-only payments while your unit is built and ramps up, then regular payments — and what the ramp-up costs.",
    metaTitle: "Franchise Loan Interest Calculator — Interest-Only Start",
    metaDescription: "Free franchise loan interest calculator. See interest-only payments during ramp-up, the payment afterward, and the extra interest it costs.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 400000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10.5, max: 25, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 25, step: 1 }),
      numberField("interestOnlyMonths", "Interest-Only Months", { default: 6, min: 0, max: 24, step: 1 }),
    ],
    calcResult: { label: "Total Interest", format: "currency" },
    calcResults: [
      { key: "interestOnlyPayment", label: "Interest-Only Payment", format: "currency" },
      { key: "paymentAfterRampUp", label: "Payment After Ramp-Up", format: "currency" },
      { key: "interestDuringRampUp", label: "Interest During Ramp-Up", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency", highlight: true },
      { key: "extraInterestFromRampUp", label: "Extra Interest From the Interest-Only Period", format: "currency" },
    ],
    instructions:
      "New franchise units can take months to build and reach steady sales, so lenders often allow interest-only " +
      "payments at the start. Enter the loan, rate, total term and interest-only months. The rest of the term repays " +
      "the full balance, so the later payment is a little higher.",
    examples:
      "Example: $400,000 at 10.50% over 10 years with 6 interest-only months " +
      "costs $3,500 a month at first, then $5,559.12. Total interest is $254,739.64 — " +
      "$7,051.65 more than paying from day one.",
    assumptions:
      "Fixed rate; the interest-only months are part of the total term. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How long does a new franchise take to break even?",
        answer: "It varies widely by brand — often 6 to 24 months. Item 19 of the FDD (financial performance) and existing franchisees are the best sources.",
      },
    ],
  },
  {
    slug: "franchise-loan-affordability-calculator",
    title: "Franchise Loan Affordability Calculator",
    description: "Estimate how big a franchise loan the unit's expected revenue can support after royalties, ad fund fees and your own salary.",
    metaTitle: "Franchise Loan Affordability Calculator — Max Loan",
    metaDescription: "Free franchise loan affordability calculator. Turn expected revenue, margin, royalties and owner pay into a maximum loan at your DSCR.",
    calcInputs: [
      currencyField("annualRevenue", "Expected Annual Revenue", { default: 1000000, max: 100000000, step: 10000 }),
      percentField("marginPercent", "Operating Margin Before Franchise Fees", { default: 20, max: 100, step: 0.5 }),
      percentField("feesPercent", "Royalty + Ad Fund (% of Revenue)", { default: 8, max: 30, step: 0.25 }),
      currencyField("ownerSalary", "Your Salary From the Business", { default: 60000, max: 10000000, step: 1000, required: false }),
      numberField("minDscr", "Lender's Minimum DSCR", { default: 1.25, min: 1, max: 3, step: 0.05 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10.5, max: 25, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 25, step: 1 }),
    ],
    calcResult: { label: "Maximum Loan Amount", format: "currency" },
    calcResults: [
      { key: "franchisorFees", label: "Royalty + Ad Fund per Year", format: "currency" },
      { key: "cashFlowForDebt", label: "Cash Flow Available for Debt", format: "currency" },
      { key: "maxAnnualPayments", label: "Maximum Annual Loan Payments", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency", highlight: true },
    ],
    instructions:
      "Use the franchise's Item 19 figures or similar units for revenue and margin (the margin before royalties and " +
      "loan payments). Enter the royalty and ad fund rates, the salary you need to draw, and the lender's DSCR. The " +
      "calculator finds the cash flow left to repay a loan and the loan it supports.",
    examples:
      "Example: $1,000,000 of revenue at a 20% margin, less $80,000 of royalties and ad fund " +
      "and a $60,000 salary, leaves $60,000 for debt. At a 1.25 DSCR you can pay $48,000 " +
      "a year — a loan of $296,439.03 at 10.50% over 10 years.",
    assumptions:
      "Revenue and margin are steady-state; first-year results are usually lower. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Where can I find a franchise's revenue figures?",
        answer: "Item 19 of the Franchise Disclosure Document, if the franchisor makes a financial performance representation. Talking to current franchisees helps too.",
      },
    ],
  },
  {
    slug: "franchise-loan-comparison-calculator",
    title: "Franchise Loan Comparison Calculator",
    description: "Compare two ways to finance a franchise — for example an SBA loan and a franchisor-arranged or equipment lender loan — by payment and total cost.",
    metaTitle: "Franchise Loan Comparison Calculator — Two Offers",
    metaDescription: "Free franchise loan comparison calculator. Compare two franchise financing offers by monthly payment, fees and total cost.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 10000000, step: 1000 }),
      percentField("rateAPercent", "Offer A — Rate", { default: 10.5, max: 25, step: 0.05 }),
      numberField("termAYears", "Offer A — Term (Years)", { default: 10, min: 1, max: 25, step: 1 }),
      percentField("feeAPercent", "Offer A — Fees", { default: 3, max: 10, step: 0.1, required: false }),
      percentField("rateBPercent", "Offer B — Rate", { default: 8.9, max: 25, step: 0.05 }),
      numberField("termBYears", "Offer B — Term (Years)", { default: 7, min: 1, max: 25, step: 1 }),
      percentField("feeBPercent", "Offer B — Fees", { default: 1, max: 10, step: 0.1, required: false }),
    ],
    calcResult: { label: "Total Savings With Offer B", format: "currency" },
    calcResults: [
      { key: "paymentA", label: "Offer A — Monthly Payment", format: "currency" },
      { key: "paymentB", label: "Offer B — Monthly Payment", format: "currency" },
      { key: "totalCostA", label: "Offer A — Total Cost", format: "currency" },
      { key: "totalCostB", label: "Offer B — Total Cost", format: "currency" },
      { key: "savingsWithB", label: "Total Savings With Offer B", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the amount and each offer's rate, term and fees (for an SBA loan, include the guaranty fee). A shorter " +
      "term usually costs less in total but needs a higher payment — make sure the unit's cash flow can carry it. A " +
      "negative saving means Offer A is cheaper.",
    examples:
      "Example: $300,000 under Offer A (10.50%, 10 years, 3% fees) costs $4,048.05 a " +
      "month and $194,765.99 in total. Offer B (8.90%, 7 years, 1% fees) costs " +
      "$4,811.51 a month and $107,167.04 — saving $87,598.95, but with a higher payment.",
    assumptions:
      "Fixed rates, equal monthly payments, fees paid upfront. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do franchisors lend money directly?",
        answer: "Some finance part of the franchise fee or equipment, and many have preferred lenders who know the brand. Always compare with an independent offer.",
      },
    ],
  },
  {
    slug: "franchise-loan-eligibility-calculator",
    title: "Franchise Loan Eligibility Calculator",
    description: "Check whether you meet a franchise's liquid capital and net worth minimums, can cover the lender's cash injection, and have a strong enough credit score.",
    metaTitle: "Franchise Loan Eligibility Calculator — Quick Check",
    metaDescription: "Free franchise loan eligibility calculator. Check liquid capital, net worth, the cash injection and credit score against typical rules.",
    calcInputs: [
      currencyField("liquidCapital", "Your Liquid Capital (Cash & Investments)", { default: 150000, max: 100000000, step: 1000 }),
      currencyField("requiredLiquid", "Franchisor's Minimum Liquid Capital", { default: 125000, max: 100000000, step: 1000 }),
      currencyField("netWorth", "Your Net Worth", { default: 450000, max: 100000000, step: 1000 }),
      currencyField("requiredNetWorth", "Franchisor's Minimum Net Worth", { default: 500000, max: 100000000, step: 1000 }),
      currencyField("totalInvestment", "Total Initial Investment", { default: 500000, max: 100000000, step: 1000 }),
      percentField("equityPercent", "Lender's Required Cash Injection", { default: 20, max: 100, step: 1 }),
      numberField("creditScore", "Your Credit Score", { default: 700, min: 300, max: 850, step: 1 }),
    ],
    calcResult: { label: "Checks Passed (of 4)", format: "number" },
    calcResults: [
      { key: "liquidCapitalSurplus", label: "Liquid Capital Above (Below) the Minimum", format: "currency" },
      { key: "netWorthSurplus", label: "Net Worth Above (Below) the Minimum", format: "currency" },
      { key: "equityInjectionNeeded", label: "Cash Injection Needed", format: "currency" },
      { key: "checksPassed", label: "Checks Passed (of 4)", format: "number", highlight: true },
    ],
    instructions:
      "Franchisors set minimum liquid capital and net worth for new owners, and lenders want a cash injection and good " +
      "credit. Enter your figures and the brand's minimums. The four checks: liquid capital at or above the minimum; " +
      "net worth at or above the minimum; enough liquid capital for the cash injection; and a credit score of 680+, a " +
      "common franchise lender benchmark. A negative surplus is a shortfall.",
    examples:
      "Example: $150,000 of liquid capital is $25,000 above the $125,000 minimum, but " +
      "$450,000 of net worth is $50,000 short of $500,000. A $500,000 investment needs a " +
      "$100,000 cash injection. 3 of 4 checks pass.",
    assumptions:
      "Franchisors and lenders also weigh management experience, the location and your business plan. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I use retirement savings to buy a franchise?",
        answer: "Yes, through a Rollover as Business Startup (ROBS) arrangement, which some franchisees use for the cash injection. It has strict IRS rules — get professional advice.",
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
