// One-time (but safe to re-run) batch setup script: creates the Startup Business Loan tools
// (11) of the Loan Calculators expansion 5, filed under Loan Calculators > General Loan Calculators.
// See src/lib/calc-engine-loan-startup-business.ts for the math and
// src/lib/calc-engine-loan-startup-business.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-startup-business-calculators.ts
// or
//   npm run db:create-loan-startup-business-calculators

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
    slug: "startup-business-loan-calculator",
    title: "Startup Business Loan Calculator",
    description: "Work out how much to borrow to start a business: launch costs plus months of operating runway, less your own cash — with the monthly payment and interest.",
    metaTitle: "Startup Business Loan Calculator — How Much to Borrow",
    metaDescription: "Free startup business loan calculator. Add launch costs and months of runway, subtract your cash, and see the loan, payment and interest.",
    calcInputs: [
      currencyField("startupCosts", "One-Time Startup Costs (Equipment, Build-Out, Inventory…)", { default: 120000, max: 10000000, step: 1000 }),
      currencyField("monthlyBurn", "Monthly Operating Costs Before Break-Even", { default: 8000, max: 1000000, step: 100, required: false }),
      numberField("runwayMonths", "Months of Runway to Fund", { default: 6, min: 0, max: 36, step: 1 }),
      percentField("ownerEquityPercent", "Your Own Cash (% of the Total)", { default: 20, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 7, min: 1, max: 25, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalFundingNeeded", label: "Total Funding Needed", format: "currency" },
      { key: "ownerEquity", label: "Your Cash", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "List what it costs to open the doors, then add enough to cover operating costs until the business breaks even — " +
      "running out of cash in the first months is one of the most common reasons startups fail. Enter the share you'll " +
      "put in yourself (lenders usually want 10%–30%), and the loan's rate and term.",
    examples:
      "Example: $120,000 of startup costs plus 6 months of $8,000 in operating costs means " +
      "$168,000 in total. With 20% of your own cash ($33,600), you borrow " +
      "$134,400: at 11% over 7 years that's $2,301.26 a month and " +
      "$58,905.46 of interest.",
    assumptions:
      "Fixed rate, equal monthly payments starting right away. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Where can a startup get a business loan?",
        answer: "SBA 7(a) and microloans, community lenders (CDFIs), credit unions, equipment financing, and online lenders. Most require a personal guarantee and a solid business plan.",
      },
    ],
  },
  {
    slug: "startup-business-loan-payment-calculator",
    title: "Startup Business Loan Payment Calculator",
    description: "See when your growing profit will cover the loan payment — and how much cash you need to set aside to make the payments until then.",
    metaTitle: "Startup Loan Payment Calculator — Profit Ramp-Up",
    metaDescription: "Free startup business loan payment calculator. See when profit covers the payment and the cash reserve you need until it does.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 100000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 7, min: 1, max: 25, step: 1 }),
      currencyField("startingProfit", "Monthly Profit in Month 1", { default: 0, max: 1000000, step: 100, required: false }),
      currencyField("profitGrowth", "Profit Growth per Month", { default: 400, max: 1000000, step: 50 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "monthsUntilProfitCoversPayment", label: "Months Until Profit Covers the Payment", format: "number" },
      { key: "cashReserveNeeded", label: "Cash Reserve Needed Until Then", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "A new business rarely earns enough to cover a loan payment from day one. Enter the loan terms, your expected " +
      "profit in the first month (often zero or negative), and how much it grows each month. The calculator finds when " +
      "profit catches up with the payment and how much cash you need to bridge the gap.",
    examples:
      "Example: $100,000 at 11% over 7 years costs $1,712.24 a month. If profit starts " +
      "at $0 and grows $400 a month, it covers the payment after 5 " +
      "months — keep at least $4,561.22 in reserve to make the payments until then.",
    assumptions:
      "Profit grows by the same amount each month. Some lenders offer interest-only months at the start, which lowers " +
      "the reserve needed. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I defer payments on a startup loan?",
        answer: "Some lenders, including some SBA lenders, allow interest-only or deferred payments for the first months. Interest still builds, so total cost rises.",
      },
    ],
  },
  {
    slug: "startup-business-loan-payoff-calculator",
    title: "Startup Business Loan Payoff Calculator",
    description: "See how putting extra toward your startup loan each month shortens it and cuts the interest you pay.",
    metaTitle: "Startup Business Loan Payoff Calculator",
    metaDescription: "Free startup business loan payoff calculator. Add an extra payment each month and see your new payoff time and interest saved.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 80000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("remainingMonths", "Months Left", { default: 60, min: 1, max: 300, step: 1 }),
      currencyField("extraMonthly", "Extra Payment Each Month", { default: 500, max: 1000000, step: 50 }),
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
      "Enter your balance, rate, months left and an extra monthly amount. Before paying extra, make sure the business " +
      "keeps a few months of expenses in cash, and check for prepayment penalties (common on some online loans).",
    examples:
      "Example: $80,000 at 12% with 60 months left costs $1,779.56 a month. " +
      "Paying $2,279.56 clears it in 44 months — 16 sooner — saving $7,747.49.",
    assumptions:
      "Fixed rate, simple-interest loan, no prepayment penalty. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does paying off a business loan early help my business credit?",
        answer: "Paying on time is what builds credit; paying off early mainly saves interest and frees future cash flow.",
      },
    ],
  },
  {
    slug: "startup-business-loan-refinance-calculator",
    title: "Startup Business Loan Refinance Calculator",
    description: "Replace expensive early financing — business credit cards or high-rate online loans — with a cheaper, longer term loan, and see the monthly and total savings.",
    metaTitle: "Startup Loan Refinance & Consolidation Calculator",
    metaDescription: "Free startup loan refinance calculator. Roll high-rate startup debt into a cheaper loan and see monthly savings and total interest saved.",
    calcInputs: [
      currencyField("balance", "Balance of the Debt to Refinance", { default: 60000, max: 10000000, step: 500 }),
      percentField("currentRatePercent", "Current Rate (APR)", { default: 30, max: 100, step: 0.25 }),
      numberField("remainingMonths", "Months Left on It", { default: 24, min: 1, max: 300, step: 1 }),
      percentField("newRatePercent", "New Loan Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("newTermMonths", "New Loan Term (Months)", { default: 48, min: 6, max: 300, step: 6 }),
      percentField("feePercent", "Fees Added to the New Loan", { default: 3, max: 10, step: 0.1, required: false }),
    ],
    calcResult: { label: "Monthly Savings", format: "currency" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "newLoanAmount", label: "New Loan Amount", format: "currency" },
      { key: "newPayment", label: "New Monthly Payment", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency", highlight: true },
      { key: "totalCostSavings", label: "Total Interest & Fees Saved", format: "currency" },
    ],
    instructions:
      "Many startups launch on credit cards or short online loans, then refinance once they have a year or two of " +
      "revenue. Enter the total balance to refinance (several debts can be combined), its rate and months left, and " +
      "the new loan's rate, term and fees. A negative total saving means the longer term costs more overall despite " +
      "the lower payment.",
    examples:
      "Example: $60,000 at 30% with 24 months left costs $3,354.77 a month. " +
      "Refinancing into a $61,800 loan at 11% over 48 months costs $1,597.25 — " +
      "$1,757.52 less each month and $3,846.30 less in total.",
    assumptions:
      "The current debt is treated as an amortizing loan; credit card minimum payments would make it last longer. " +
      "No prepayment penalty on the old debt. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When can a startup refinance its debt?",
        answer: "Often after 1–2 years of revenue and on-time payments. SBA 7(a) loans can refinance qualifying business debt if it improves cash flow.",
      },
    ],
  },
  {
    slug: "startup-business-loan-apr-calculator",
    title: "Startup Business Loan APR Calculator",
    description: "Turn a startup loan's interest rate and fees into a true APR based on the cash you actually receive.",
    metaTitle: "Startup Business Loan APR Calculator — With Fees",
    metaDescription: "Free startup business loan APR calculator. Add origination and other fees to the rate and see the true annual cost of the loan.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 75000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 6, max: 300, step: 6 }),
      percentField("originationPercent", "Origination Fee", { default: 3, max: 15, step: 0.1, required: false }),
      currencyField("otherFees", "Other Fees (Underwriting, Packaging…)", { default: 500, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "APR", format: "percentage" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "totalFees", label: "Total Fees", format: "currency" },
      { key: "cashReceived", label: "Cash You Receive", format: "currency" },
      { key: "apr", label: "APR", format: "percentage", highlight: true },
    ],
    instructions:
      "Business lenders don't always quote an APR, and fees taken from the loan raise its true cost. Enter the loan, " +
      "rate, term and fees. The APR is the rate at which your payments repay the cash you actually get.",
    examples:
      "Example: a $75,000 loan at 12% over 60 months costs $1,668.33 a month. With " +
      "$2,750 of fees you receive $72,250, so the APR is 13.66%.",
    assumptions:
      "Fees are deducted from the proceeds; fixed rate, equal monthly payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does APR matter more for short loans?",
        answer: "The same fee is spread over fewer months, so it adds more to the yearly cost. A 3% fee on a 1-year loan raises the APR far more than on a 7-year loan.",
      },
    ],
  },
  {
    slug: "startup-business-loan-affordability-calculator",
    title: "Startup Business Loan Affordability Calculator",
    description: "Lenders judge a startup on its projected cash flow and on the owner's personal finances. See the loan each one supports and the safer lower figure.",
    metaTitle: "Startup Business Loan Affordability Calculator",
    metaDescription: "Free startup loan affordability calculator. See the max loan from projected business cash flow and from your personal DTI.",
    calcInputs: [
      currencyField("projectedCashFlow", "Projected Monthly Cash Flow Before Loan Payments", { default: 3000, max: 10000000, step: 100 }),
      numberField("minDscr", "Lender's Minimum DSCR", { default: 1.25, min: 1, max: 3, step: 0.05 }),
      currencyField("personalIncome", "Your Gross Monthly Personal Income", { default: 7000, max: 1000000, step: 100 }),
      currencyField("personalDebts", "Your Monthly Personal Debt Payments", { default: 1500, max: 1000000, step: 50, required: false }),
      percentField("maxDtiPercent", "Maximum Personal DTI", { default: 43, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 7, min: 1, max: 25, step: 1 }),
    ],
    calcResult: { label: "Conservative Maximum Loan", format: "currency" },
    calcResults: [
      { key: "maxPaymentByBusiness", label: "Max Payment From Business Cash Flow", format: "currency" },
      { key: "maxLoanByBusiness", label: "Max Loan — Business Cash Flow", format: "currency" },
      { key: "maxPaymentByPersonalDti", label: "Max Payment From Your Personal Budget", format: "currency" },
      { key: "maxLoanByPersonalDti", label: "Max Loan — Personal DTI", format: "currency" },
      { key: "conservativeMaxLoan", label: "Conservative Maximum Loan", format: "currency", highlight: true },
    ],
    instructions:
      "With no track record, lenders lean on your projections and on you — most startup loans need a personal " +
      "guarantee. Enter projected monthly cash flow and the lender's DSCR, then your personal income, debts and the " +
      "lender's DTI limit. The lower of the two maximums is a safer target.",
    examples:
      "Example: $3,000 of projected cash flow at a 1.25 DSCR supports $2,400 a month — a " +
      "$140,166.97 loan at 11% over 7 years. Your personal budget leaves " +
      "$1,510 a month, enough for $88,188.38. The conservative maximum is $88,188.38.",
    assumptions:
      "Projections are uncertain — lenders often discount them. Fixed rate, equal monthly payments. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need a personal guarantee for a startup loan?",
        answer: "Almost always. SBA loans require one from owners of 20% or more, and most banks and online lenders require one for new businesses.",
      },
    ],
  },
  {
    slug: "startup-business-loan-eligibility-calculator",
    title: "Startup Business Loan Eligibility Calculator",
    description: "Prequalify for a startup loan: check your credit score, your cash injection, how much collateral covers the loan, and your industry experience.",
    metaTitle: "Startup Business Loan Eligibility & Prequalification",
    metaDescription: "Free startup business loan eligibility calculator. Check credit score, cash injection, collateral coverage and industry experience.",
    calcInputs: [
      currencyField("projectCost", "Total Project Cost", { default: 150000, max: 10000000, step: 1000 }),
      currencyField("loanAmount", "Loan Amount Requested", { default: 120000, max: 10000000, step: 1000 }),
      numberField("creditScore", "Your Credit Score", { default: 690, min: 300, max: 850, step: 1 }),
      currencyField("collateralValue", "Collateral Available (Equipment, Real Estate…)", { default: 70000, max: 10000000, step: 1000, required: false }),
      numberField("experienceYears", "Years of Experience in This Industry", { default: 3, min: 0, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "Checks Passed (of 4)", format: "number" },
    calcResults: [
      { key: "ownerCashInjection", label: "Your Cash Injection", format: "currency" },
      { key: "cashInjectionPercent", label: "Cash Injection (% of Project)", format: "percentage" },
      { key: "collateralCoveragePercent", label: "Collateral Coverage of the Loan", format: "percentage" },
      { key: "checksPassed", label: "Checks Passed (of 4)", format: "number", highlight: true },
    ],
    instructions:
      "Enter the project cost, the loan you want, your credit score, the collateral you can pledge, and your experience. " +
      "The four checks use common startup lender guidelines: a 680+ score; at least 10% of the project from your own " +
      "cash; collateral worth at least half the loan; and 2+ years of relevant experience. Lenders weigh these together " +
      "with your business plan.",
    examples:
      "Example: a $150,000 project with a $120,000 loan means a $30,000 cash injection " +
      "(20%). $70,000 of collateral covers 58.33% of the loan. With a " +
      "690 score and 3 years' experience, 4 of 4 checks pass.",
    assumptions:
      "Guidelines vary by lender; SBA lenders can't decline solely for lack of collateral. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get a startup loan with no collateral?",
        answer: "Yes, sometimes — SBA microloans, some online lenders and CDFIs lend unsecured, usually for smaller amounts or at higher rates.",
      },
    ],
  },
  {
    slug: "startup-business-loan-interest-calculator",
    title: "Startup Business Loan Interest Calculator",
    description: "Calculate interest on a startup loan — first-year and total — and its real cost after the business deducts it from taxable profit.",
    metaTitle: "Startup Business Loan Interest Calculator — After Tax",
    metaDescription: "Free startup loan interest calculator. See year-one and total interest, the tax saving from deducting it, and after-tax interest.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 100000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 84, min: 6, max: 300, step: 6 }),
      percentField("taxRatePercent", "Business Tax Rate", { default: 25, max: 70, step: 1 }),
    ],
    calcResult: { label: "After-Tax Interest", format: "currency" },
    calcResults: [
      { key: "interestFirstYear", label: "Interest in Year 1", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "taxSavings", label: "Tax Savings", format: "currency" },
      { key: "afterTaxInterest", label: "After-Tax Interest", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan, rate, term and your combined tax rate. Business loan interest is generally deductible, so its " +
      "real cost is lower once the business is profitable. In loss years there may be no immediate tax saving.",
    examples:
      "Example: $100,000 at 11% over 84 months costs $10,503.66 of interest in year " +
      "1 and $43,828.47 in total. At a 25% tax rate, deducting it saves $10,957.12, leaving " +
      "$32,871.35 after tax.",
    assumptions:
      "Assumes the business has taxable profit to deduct against; no discounting of future savings. Not tax advice. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I deduct startup costs too?",
        answer: "Generally you can deduct up to $5,000 of startup costs in the first year (reduced if they exceed $50,000) and amortize the rest over 15 years. Loan interest is deducted separately.",
      },
    ],
  },
  {
    slug: "startup-business-loan-comparison-calculator",
    title: "Startup Business Loan Comparison Calculator",
    description: "Compare a slower, cheaper bank or SBA-style startup loan with a fast online loan — monthly payment and total cost side by side.",
    metaTitle: "Startup Business Loan Comparison Calculator",
    metaDescription: "Free startup loan comparison calculator. Compare a bank or SBA-style loan with an online lender by payment and total cost.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 75000, max: 10000000, step: 500 }),
      percentField("rateAPercent", "Offer A (Bank / SBA) — Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termAMonths", "Offer A — Term (Months)", { default: 84, min: 6, max: 300, step: 6 }),
      percentField("feeAPercent", "Offer A — Fees", { default: 3, max: 15, step: 0.1, required: false }),
      percentField("rateBPercent", "Offer B (Online) — Rate", { default: 28, max: 80, step: 0.05 }),
      numberField("termBMonths", "Offer B — Term (Months)", { default: 36, min: 6, max: 300, step: 6 }),
      percentField("feeBPercent", "Offer B — Fees", { default: 4, max: 15, step: 0.1, required: false }),
    ],
    calcResult: { label: "Savings With Offer A", format: "currency" },
    calcResults: [
      { key: "paymentA", label: "Offer A — Monthly Payment", format: "currency" },
      { key: "paymentB", label: "Offer B — Monthly Payment", format: "currency" },
      { key: "totalCostA", label: "Offer A — Total Cost", format: "currency" },
      { key: "totalCostB", label: "Offer B — Total Cost", format: "currency" },
      { key: "savingsWithA", label: "Savings With Offer A", format: "currency", highlight: true },
    ],
    instructions:
      "Bank and SBA loans take weeks and more paperwork but cost less; online lenders fund in days at higher rates and " +
      "shorter terms. Enter both offers. A negative saving means Offer B is cheaper.",
    examples:
      "Example: $75,000 from Offer A at 11% over 84 months costs $1,284.18 a month and " +
      "$35,121.35 in total. Offer B at 28% over 36 months costs $3,102.27 a month and " +
      "$39,681.69. Offer A saves $4,560.34.",
    assumptions:
      "Fixed rates, equal monthly payments, fees paid upfront. Daily or weekly payment loans cost more than shown. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a fast online loan ever worth it?",
        answer: "When speed truly matters — a time-limited opportunity — and the return beats the cost. Plan to refinance into cheaper debt once you can.",
      },
    ],
  },
  {
    slug: "startup-business-loan-amortization-calculator",
    title: "Startup Business Loan Amortization Calculator",
    description: "See any year of a startup loan's schedule: how much of your payments went to interest and principal, and the balance left.",
    metaTitle: "Startup Business Loan Amortization Calculator",
    metaDescription: "Free startup business loan amortization calculator. See interest, principal and the remaining balance for any year of the loan.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 100000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 7, min: 1, max: 25, step: 1 }),
      numberField("yearNumber", "Year to Show", { default: 2, min: 1, max: 25, step: 1 }),
    ],
    calcResult: { label: "Balance at Year End", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "interestPaidInYear", label: "Interest Paid That Year", format: "currency" },
      { key: "principalPaidInYear", label: "Principal Paid That Year", format: "currency" },
      { key: "balanceAfterYear", label: "Balance at Year End", format: "currency", highlight: true },
      { key: "percentRepaid", label: "Share of the Loan Repaid", format: "percentage" },
    ],
    instructions:
      "Enter the loan, rate and term, and the year you want to see. Useful for your bookkeeping (interest is an " +
      "expense; principal isn't) and for planning a refinance once the business is established.",
    examples:
      "Example: a $100,000, 7-year loan at 11% costs $1,712.24 a month. In year " +
      "2, $9,341.47 goes to interest and $11,205.46 to principal, leaving " +
      "$78,751.28 — 21.25% repaid.",
    assumptions:
      "Fixed rate, payments on schedule, no extra payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I record loan payments in my books?",
        answer: "Split each payment: the interest part is an expense; the principal part reduces the loan liability. Your lender's statement shows the split.",
      },
    ],
  },
  {
    slug: "startup-business-loan-total-cost-calculator",
    title: "Startup Business Loan Total Cost Calculator",
    description: "Add up everything a startup loan costs — interest, origination fee, any guarantee fee and closing costs — and the cost per dollar borrowed.",
    metaTitle: "Startup Business Loan Total Cost Calculator",
    metaDescription: "Free startup loan total cost calculator. Add interest, origination, guarantee fees and closing costs to see the full cost of borrowing.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 100000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 84, min: 6, max: 300, step: 6 }),
      percentField("originationPercent", "Origination Fee", { default: 3, max: 15, step: 0.1, required: false }),
      percentField("guaranteeFeePercent", "Guarantee Fee (e.g. SBA)", { default: 2, max: 5, step: 0.05, required: false }),
      currencyField("closingCosts", "Closing Costs (Legal, Filing, Appraisal)", { default: 1500, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Total Cost of Borrowing", format: "currency" },
    calcResults: [
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "guaranteeFee", label: "Guarantee Fee", format: "currency" },
      { key: "closingCosts", label: "Closing Costs", format: "currency" },
      { key: "totalCostOfBorrowing", label: "Total Cost of Borrowing", format: "currency", highlight: true },
      { key: "costPerDollarBorrowed", label: "Cost per $1 Borrowed", format: "currency", decimals: 3 },
    ],
    instructions:
      "Enter the loan terms and every fee you'll pay. A guarantee fee applies to SBA-backed loans (charged on the " +
      "guaranteed portion — enter it as a share of the loan). The total is what the loan costs you beyond paying back " +
      "the amount borrowed.",
    examples:
      "Example: $100,000 at 11% over 84 months costs $43,828.47 of interest. Adding a " +
      "$3,000 origination fee, a $2,000 guarantee fee and $1,500 of closing costs brings the " +
      "total to $50,328.47 — $0.50 per dollar borrowed.",
    assumptions:
      "Fixed rate, held to term, fees paid upfront. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a reasonable total cost for a startup loan?",
        answer: "It depends on rate and term; compare the cost per dollar across offers with the same term to see which is cheapest.",
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
