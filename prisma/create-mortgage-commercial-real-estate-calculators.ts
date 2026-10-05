// One-time (but safe to re-run) batch setup script: creates the Commercial Real Estate Loan tools
// (8) of the Loan Calculators expansion 3, filed under Finance Calculators > Mortgage Calculators.
// See src/lib/calc-engine-mortgage-commercial-real-estate.ts for the math and
// src/lib/calc-engine-loan-sba.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-mortgage-commercial-real-estate-calculators.ts
// or
//   npm run db:create-mortgage-commercial-real-estate-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Re-pointed 5 Oct 2026: Mortgage Calculators was split into 5 sub-categories
// (see organize-tool-categories.ts); this script creates its sub-category if missing.
const PARENT_CATEGORY_SLUG = "mortgage-calculators";
const CATEGORY = { name: "Property & Construction Mortgage Calculators", slug: "property-construction-mortgage-calculators" };

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
    slug: "commercial-real-estate-loan-payment-calculator",
    title: "Commercial Real Estate Loan Payment Calculator",
    description: "Calculate commercial mortgage payments with an interest-only period, the amortizing payment after it, annual debt service, and the balloon due at maturity.",
    metaTitle: "Commercial Real Estate Loan Payment Calculator",
    metaDescription: "Free commercial real estate loan payment calculator. See interest-only and amortizing payments, annual debt service and the balloon.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 2000000, max: 500000000, step: 10000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.75, max: 20, step: 0.05 }),
      numberField("termYears", "Loan Term Until Balloon (Years)", { default: 10, min: 1, max: 30, step: 1 }),
      numberField("ioYears", "Interest-Only Period (Years)", { default: 2, min: 0, max: 10, step: 1 }),
      numberField("amortYears", "Amortization (Years)", { default: 25, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "Amortizing Monthly Payment", format: "currency" },
    calcResults: [
      { key: "interestOnlyPayment", label: "Interest-Only Monthly Payment", format: "currency" },
      { key: "amortizingPayment", label: "Amortizing Monthly Payment", format: "currency", highlight: true },
      { key: "annualDebtService", label: "Annual Debt Service (Amortizing)", format: "currency" },
      { key: "balloonAtMaturity", label: "Balloon Due at Maturity", format: "currency" },
    ],
    instructions:
      "Commercial mortgages are usually set up as a term (often 5, 7 or 10 years) with payments based on a longer " +
      "amortization (20–30 years), so a balloon is due at the end. Some start with interest-only years. Enter the loan, " +
      "rate, term, interest-only years and amortization.",
    examples:
      "Example: a $2,000,000 loan at 6.75% costs $11,250 a month for 2 " +
      "interest-only years, then $13,818.23 on a 25-year schedule ($165,818.77 a year). " +
      "At the end of the 10-year term, a $1,674,274.24 balloon is due.",
    assumptions:
      "Fixed rate. After the interest-only period, payments follow the full amortization schedule starting from the " +
      "original balance. Rates on commercial loans are often quoted as a spread over Treasury or SOFR. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do commercial loans have balloon payments?",
        answer: "Lenders prefer shorter terms so they can reprice or exit, while a long amortization keeps payments affordable. The balloon is usually refinanced or paid from a sale.",
      },
    ],
  },
  {
    slug: "commercial-real-estate-loan-payoff-calculator",
    title: "Commercial Real Estate Loan Payoff Calculator",
    description: "Estimate the payoff on a commercial mortgage, including a step-down (5-4-3-2-1 or 3-2-1) or yield maintenance prepayment penalty.",
    metaTitle: "Commercial Loan Payoff — Prepayment Penalty Calculator",
    metaDescription: "Free commercial real estate loan payoff calculator. See your balance plus a step-down or yield maintenance prepayment penalty.",
    calcInputs: [
      currencyField("loanAmount", "Original Loan Amount", { default: 2000000, max: 500000000, step: 10000 }),
      percentField("annualRatePercent", "Note Rate", { default: 6.75, max: 20, step: 0.05 }),
      numberField("amortYears", "Amortization (Years)", { default: 25, min: 1, max: 30, step: 1 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 30, step: 1 }),
      numberField("yearsPaid", "Years Since the Loan Closed", { default: 3, min: 0, max: 30, step: 1 }),
      {
        key: "penaltyType", label: "Prepayment Penalty", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Step-Down 5-4-3-2-1", value: 1 },
          { label: "Step-Down 3-2-1", value: 2 },
          { label: "Yield Maintenance", value: 3 },
          { label: "None", value: 0 },
        ],
      },
      percentField("treasuryRatePercent", "Treasury Yield (for Yield Maintenance)", { default: 4.25, max: 15, step: 0.05, required: false }),
    ],
    calcResult: { label: "Total Payoff Amount", format: "currency" },
    calcResults: [
      { key: "currentBalance", label: "Current Balance", format: "currency" },
      { key: "prepaymentPenaltyPercent", label: "Penalty as Share of Balance", format: "percentage" },
      { key: "prepaymentPenalty", label: "Prepayment Penalty", format: "currency" },
      { key: "totalPayoff", label: "Total Payoff Amount", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan, its schedule, how many full years have passed, and the penalty type in your note. A step-down " +
      "penalty is a percentage of the balance that falls each year (5% in year 1 down to 1% in year 5). Yield " +
      "maintenance makes up the lender's lost interest: the gap between your rate and the Treasury yield, paid on the " +
      "balance for the months left in the term, in today's dollars.",
    examples:
      "Example: a $2,000,000 loan at 6.75% on a 25-year schedule has $1,897,834.41 left " +
      "after 3 years. Paying it off in year 4 under a 5-4-3-2-1 step-down costs a 2% " +
      "penalty — $37,956.69 — for a total payoff of $1,935,791.10.",
    assumptions:
      "Yield maintenance is simplified (monthly, discounted at the Treasury yield, no minimum penalty); real formulas " +
      "vary by lender and many add a 1% floor. CMBS loans often use defeasance instead. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between yield maintenance and defeasance?",
        answer: "Yield maintenance pays the lender cash for its lost interest. Defeasance replaces the loan's collateral with Treasury bonds that make the remaining payments — common in CMBS loans.",
      },
    ],
  },
  {
    slug: "commercial-real-estate-loan-refinance-calculator",
    title: "Commercial Real Estate Loan Refinance Calculator",
    description: "Size a commercial refinance or debt consolidation by the lower of the LTV and DSCR limits, and see the cash-out, new payment and new DSCR.",
    metaTitle: "Commercial Real Estate Refinance Calculator — Cash-Out",
    metaDescription: "Free commercial real estate refinance calculator. Size the new loan by LTV and DSCR and see cash-out, new payment and DSCR.",
    calcInputs: [
      currencyField("propertyValue", "Current Property Value", { default: 3500000, max: 1000000000, step: 10000 }),
      currencyField("currentBalance", "Balance of Loans to Pay Off", { default: 1600000, max: 1000000000, step: 10000 }),
      currencyField("noi", "Net Operating Income (Annual)", { default: 260000, max: 100000000, step: 1000 }),
      percentField("newRatePercent", "New Loan Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("amortYears", "New Loan Amortization (Years)", { default: 25, min: 1, max: 30, step: 1 }),
      percentField("maxLtvPercent", "Lender's Maximum LTV", { default: 75, max: 100, step: 1 }),
      numberField("minDscr", "Lender's Minimum DSCR", { default: 1.25, min: 1, max: 3, step: 0.05 }),
      percentField("closingCostsPercent", "Closing Costs", { default: 1.5, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Cash Out After Payoff and Costs", format: "currency" },
    calcResults: [
      { key: "maxLoanByLtv", label: "Maximum Loan by LTV", format: "currency" },
      { key: "maxLoanByDscr", label: "Maximum Loan by DSCR", format: "currency" },
      { key: "newLoanAmount", label: "New Loan Amount", format: "currency" },
      { key: "cashOut", label: "Cash Out After Payoff and Costs", format: "currency", highlight: true },
      { key: "newMonthlyPayment", label: "New Monthly Payment", format: "currency" },
      { key: "newDscr", label: "New DSCR", format: "number" },
    ],
    instructions:
      "Enter today's property value, the balance of all loans you'd pay off (for a consolidation, add them up), the " +
      "property's NOI, and the new loan's terms and limits. Lenders lend the lower of the LTV limit and the amount the " +
      "NOI can support at their DSCR. A negative cash-out means you'd need to bring cash to close.",
    examples:
      "Example: a $3,500,000 property with $260,000 of NOI. At 75% LTV the limit is $2,625,000, but " +
      "a 1.25 DSCR at 6.50% caps it at $2,567,113.37. Paying off $1,600,000 and costs leaves " +
      "$928,606.67 of cash out, with a $17,333.33 payment and a DSCR of 1.25.",
    assumptions:
      "Prepayment penalties on the old loan aren't included — check them with the payoff calculator. Fixed rate, " +
      "fully amortizing payment used for DSCR. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I consolidate several commercial property loans into one?",
        answer: "Yes — a blanket or portfolio loan can refinance several properties at once, secured by all of them. The same LTV and DSCR tests apply to the combined numbers.",
      },
    ],
  },
  {
    slug: "commercial-real-estate-loan-apr-calculator",
    title: "Commercial Real Estate Loan APR Calculator",
    description: "Find the true annual cost of a commercial mortgage: origination points and closing costs spread over the loan term, with the balloon included.",
    metaTitle: "Commercial Real Estate Loan APR Calculator",
    metaDescription: "Free commercial real estate loan APR calculator. Add points and closing costs to see the effective rate over the term, with the balloon.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 2000000, max: 500000000, step: 10000 }),
      percentField("annualRatePercent", "Note Rate", { default: 6.75, max: 20, step: 0.05 }),
      numberField("amortYears", "Amortization (Years)", { default: 25, min: 1, max: 30, step: 1 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 30, step: 1 }),
      percentField("pointsPercent", "Origination Points", { default: 1, max: 5, step: 0.125 }),
      currencyField("otherClosingCosts", "Other Lender & Closing Costs", { default: 15000, max: 10000000, step: 500, required: false }),
    ],
    calcResult: { label: "APR", format: "percentage" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "balloonAtMaturity", label: "Balloon at Maturity", format: "currency" },
      { key: "upfrontCosts", label: "Points + Closing Costs", format: "currency" },
      { key: "apr", label: "APR", format: "percentage", highlight: true },
    ],
    instructions:
      "Enter the loan, note rate, amortization, term, points and other costs you pay to get the loan. The APR is the " +
      "rate at which the payments and the balloon repay the money you actually receive after those costs. A shorter " +
      "term spreads the same costs over fewer years, so the APR rises.",
    examples:
      "Example: a $2,000,000 loan at 6.75% on a 25-year schedule costs $13,818.23 a " +
      "month and leaves a $1,561,541.73 balloon after 10 years. With $35,000 of points and costs, " +
      "the APR is 7.02%.",
    assumptions:
      "Assumes the loan runs to maturity and the balloon is paid then. Costs paid at closing; monthly compounding. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do commercial lenders have to quote an APR?",
        answer: "No — commercial loans aren't covered by the Truth in Lending Act. Calculating it yourself is the easiest way to compare term sheets with different fees.",
      },
    ],
  },
  {
    slug: "commercial-real-estate-loan-interest-calculator",
    title: "Commercial Real Estate Loan Interest Calculator",
    description: "See how much interest a commercial mortgage costs over its term, how little principal you repay before the balloon, and year-one interest.",
    metaTitle: "Commercial Real Estate Loan Interest Calculator",
    metaDescription: "Free commercial real estate loan interest calculator. See interest over the term, year-one interest, principal repaid, and the balloon.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 2000000, max: 500000000, step: 10000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.75, max: 20, step: 0.05 }),
      numberField("amortYears", "Amortization (Years)", { default: 25, min: 1, max: 30, step: 1 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "Total Interest Over the Term", format: "currency" },
    calcResults: [
      { key: "interestFirstYear", label: "Interest in Year 1", format: "currency" },
      { key: "totalInterestOverTerm", label: "Total Interest Over the Term", format: "currency", highlight: true },
      { key: "principalRepaidOverTerm", label: "Principal Repaid Over the Term", format: "currency" },
      { key: "balloonAtMaturity", label: "Balloon at Maturity", format: "currency" },
    ],
    instructions:
      "Enter the loan, rate, amortization and term. On a long amortization, most of each payment in the early years is " +
      "interest, so only a small part of the loan is repaid before the balloon. Interest on a commercial property " +
      "loan is generally deductible against the property's income.",
    examples:
      "Example: $2,000,000 at 6.75% on a 25-year schedule costs $134,028.44 of " +
      "interest in year 1 and $1,219,729.39 over 10 years, while only $438,458.27 of " +
      "principal is repaid — leaving a $1,561,541.73 balloon.",
    assumptions:
      "Fixed rate, monthly payments, no interest-only period. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is interest calculated on commercial loans?",
        answer: "Many use 'actual/360' — a 365-day year's interest at a rate quoted on 360 days — which costs slightly more than the simple monthly math shown here.",
      },
    ],
  },
  {
    slug: "commercial-real-estate-loan-comparison-calculator",
    title: "Commercial Real Estate Loan Comparison Calculator",
    description: "Compare two commercial mortgage term sheets — rate, amortization and points — by monthly payment, balloon, and total cost over the term.",
    metaTitle: "Commercial Real Estate Loan Comparison Calculator",
    metaDescription: "Free commercial loan comparison calculator. Compare two term sheets by payment, balloon, and total cost including points.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 2000000, max: 500000000, step: 10000 }),
      numberField("termYears", "Loan Term for Both (Years)", { default: 10, min: 1, max: 30, step: 1 }),
      percentField("rateAPercent", "Offer A — Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("amortAYears", "Offer A — Amortization (Years)", { default: 25, min: 1, max: 30, step: 1 }),
      percentField("pointsAPercent", "Offer A — Points", { default: 0.5, max: 5, step: 0.125, required: false }),
      percentField("rateBPercent", "Offer B — Rate", { default: 6.1, max: 20, step: 0.05 }),
      numberField("amortBYears", "Offer B — Amortization (Years)", { default: 30, min: 1, max: 30, step: 1 }),
      percentField("pointsBPercent", "Offer B — Points", { default: 1.5, max: 5, step: 0.125, required: false }),
    ],
    calcResult: { label: "Savings With Offer B", format: "currency" },
    calcResults: [
      { key: "paymentA", label: "Offer A — Monthly Payment", format: "currency" },
      { key: "paymentB", label: "Offer B — Monthly Payment", format: "currency" },
      { key: "balloonA", label: "Offer A — Balloon", format: "currency" },
      { key: "balloonB", label: "Offer B — Balloon", format: "currency" },
      { key: "costA", label: "Offer A — Interest + Points", format: "currency" },
      { key: "costB", label: "Offer B — Interest + Points", format: "currency" },
      { key: "savingsWithB", label: "Savings With Offer B", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan and term, then each offer's rate, amortization and points — for example a bank loan vs a life " +
      "insurance company or CMBS loan. A longer amortization lowers the payment but leaves a bigger balloon. A " +
      "negative saving means Offer A is cheaper. Also compare prepayment terms, recourse and reserves, which aren't " +
      "priced here.",
    examples:
      "Example: $2,000,000 for 10 years. Offer A (6.50%, 25-year amortization, " +
      "0.50% points) costs $13,504.14 a month and $1,180,724.38, with a $1,550,227.19 balloon. Offer B " +
      "(6.10%, 30 years, 1.50% points) costs $12,119.90 and $1,162,550.49, with a $1,678,163.01 " +
      "balloon — saving $18,173.88.",
    assumptions:
      "Both loans run the full term at fixed rates; cost is interest plus points. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between recourse and non-recourse loans?",
        answer: "With recourse, the lender can pursue you personally if the property doesn't cover the debt. Non-recourse loans (common with CMBS and life companies) limit the lender to the property, except for 'bad boy' carve-outs.",
      },
    ],
  },
  {
    slug: "commercial-real-estate-loan-amortization-calculator",
    title: "Commercial Real Estate Loan Amortization Calculator",
    description: "See any year of a commercial mortgage schedule: interest and principal paid, the balance left, the property's value and the loan-to-value at year end.",
    metaTitle: "Commercial Real Estate Loan Amortization Calculator",
    metaDescription: "Free commercial loan amortization calculator. See interest, principal and balance for any year, plus property value and LTV at that point.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 2000000, max: 500000000, step: 10000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.75, max: 20, step: 0.05 }),
      numberField("amortYears", "Amortization (Years)", { default: 25, min: 1, max: 30, step: 1 }),
      numberField("yearNumber", "Year to Show", { default: 5, min: 1, max: 30, step: 1 }),
      currencyField("propertyValue", "Property Value Today", { default: 2800000, max: 1000000000, step: 10000 }),
      percentField("appreciationPercent", "Value Change per Year", { default: 2, min: -10, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Balance at Year End", format: "currency" },
    calcResults: [
      { key: "interestPaidInYear", label: "Interest Paid That Year", format: "currency" },
      { key: "principalPaidInYear", label: "Principal Paid That Year", format: "currency" },
      { key: "balanceAtYearEnd", label: "Balance at Year End", format: "currency", highlight: true },
      { key: "propertyValueAtYearEnd", label: "Property Value at Year End", format: "currency" },
      { key: "ltvAtYearEnd", label: "Loan-to-Value at Year End", format: "percentage" },
    ],
    instructions:
      "Enter the loan, rate and amortization, the year you want to look at, and the property's value with an expected " +
      "yearly change. Watching LTV over time shows when you'll have enough equity to refinance on better terms — or " +
      "whether a falling value could make the balloon hard to refinance.",
    examples:
      "Example: $2,000,000 at 6.75% over 25 years. In year 5, $124,206.06 " +
      "goes to interest and $41,612.70 to principal, leaving $1,817,317.80. If the $2,800,000 " +
      "property grows 2% a year to $3,091,426.25, the LTV is 58.79%.",
    assumptions:
      "Fixed rate, monthly payments from day one (no interest-only period). Property value is an estimate. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What LTV do lenders want at refinance?",
        answer: "Commonly 65%–75% for commercial property, along with a DSCR of about 1.20–1.35 depending on the property type.",
      },
    ],
  },
  {
    slug: "commercial-real-estate-loan-total-cost-calculator",
    title: "Commercial Real Estate Loan Total Cost Calculator",
    description: "Add up the full cost of a commercial mortgage over its term: interest, origination points, third-party costs and any exit fee on the balloon.",
    metaTitle: "Commercial Real Estate Loan Total Cost Calculator",
    metaDescription: "Free commercial real estate loan cost calculator. Add interest, points, appraisal, legal and environmental costs and exit fees.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 2000000, max: 500000000, step: 10000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.75, max: 20, step: 0.05 }),
      numberField("amortYears", "Amortization (Years)", { default: 25, min: 1, max: 30, step: 1 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 30, step: 1 }),
      percentField("pointsPercent", "Origination Points", { default: 1, max: 5, step: 0.125 }),
      currencyField("thirdPartyCosts", "Appraisal, Environmental, Legal & Title", { default: 25000, max: 10000000, step: 500, required: false }),
      percentField("exitFeePercent", "Exit Fee on the Balloon", { default: 0, max: 5, step: 0.25, required: false }),
    ],
    calcResult: { label: "Total Cost of Borrowing", format: "currency" },
    calcResults: [
      { key: "interestOverTerm", label: "Interest Over the Term", format: "currency" },
      { key: "originationPoints", label: "Origination Points", format: "currency" },
      { key: "thirdPartyCosts", label: "Third-Party Costs", format: "currency" },
      { key: "exitFee", label: "Exit Fee", format: "currency" },
      { key: "totalCostOfBorrowing", label: "Total Cost of Borrowing", format: "currency", highlight: true },
      { key: "costPerYear", label: "Average Cost per Year", format: "currency" },
    ],
    instructions:
      "Enter the loan terms, the points, the third-party reports and legal fees you'll pay, and any exit fee charged " +
      "when the loan is repaid (more common on bridge and debt-fund loans). Use the total to compare offers and to " +
      "budget the property's financing cost.",
    examples:
      "Example: a $2,000,000, 10-year loan at 6.75% costs $1,219,729.39 of interest. " +
      "Adding $20,000 of points and $25,000 of third-party costs brings the total to " +
      "$1,264,729.39 — about $126,472.94 a year.",
    assumptions:
      "Fixed rate, loan held to maturity, no prepayment penalty. Ongoing costs like reserves, servicing and annual " +
      "inspections aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What closing costs come with a commercial mortgage?",
        answer: "Typically an appraisal, a Phase I environmental report, a property condition report, a survey, title insurance, and legal fees for both you and the lender.",
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
