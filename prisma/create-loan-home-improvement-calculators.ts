// One-time (but safe to re-run) batch setup script: creates the 13 tools
// of the Loan Calculators expansion sub-batch 4 (Home Improvement Loans),
// filed under Finance Calculators > Loan Calculators > Home Improvement
// Loan Calculators. See src/lib/calc-engine-loan-home-improvement.ts for
// the math and src/lib/calc-engine-loan-debt-consolidation.ts for the full
// batch context.
//
// If the "Home Improvement Loan Calculators" sub-category doesn't exist
// yet, it is created under Loan Calculators.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-home-improvement-calculators.ts
// or
//   npm run db:create-loan-home-improvement-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "loan-calculators";
const CATEGORY = { name: "Home Improvement Loan Calculators", slug: "home-improvement-loan-calculators" };

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
    slug: "home-improvement-loan-calculator",
    title: "Home Improvement Loan Calculator",
    description: "Add a contingency buffer to your project cost, subtract the cash you have, and see the loan amount, monthly payment, and interest for your home improvement.",
    metaTitle: "Home Improvement Loan Calculator — Free & Instant",
    metaDescription: "Free home improvement loan calculator. Add a contingency buffer to your project cost, subtract cash on hand, and see your loan and payment.",
    calcInputs: [
      currencyField("projectCost", "Project Cost (Quotes)", { default: 40000, max: 10000000, step: 500 }),
      percentField("contingencyPercent", "Contingency Buffer", { default: 10, max: 50, step: 1, required: false }),
      currencyField("cashOnHand", "Cash You'll Put In", { default: 10000, max: 10000000, step: 250, required: false }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 9, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 84, min: 12, max: 240, step: 12 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "contingency", label: "Contingency Buffer", format: "currency" },
      { key: "totalBudget", label: "Total Project Budget", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the total from your contractor quotes, a contingency percentage for surprises (10%–20% is common, more " +
      "for older homes), the cash you'll contribute, and the loan's rate and term. The tool borrows enough to cover " +
      "the full budget including the buffer, so an overrun doesn't leave you scrambling for money mid-project.",
    examples:
      "Example: a $40,000 project plus a 10% ($4,000) contingency makes a $44,000 budget. Putting in $10,000 of cash " +
      "leaves a $34,000 loan — $547.03 a month at 9% over 84 months, with $11,950.41 of interest.",
    assumptions:
      "Assumes a fixed-rate loan drawn in full at the start. If you don't use the contingency, you can repay it " +
      "early to save interest. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What kinds of loans can pay for home improvements?",
        answer: "Unsecured personal loans (fast, no home equity needed), home equity loans and HELOCs (usually cheaper but secured on your home), cash-out refinancing, contractor financing, and government-backed renovation mortgages such as FHA 203(k).",
      },
    ],
  },
  {
    slug: "home-improvement-loan-payment-calculator",
    title: "Home Improvement Loan Payment Calculator",
    description: "See your monthly home improvement loan payment and how much sooner you'd finish — and how much interest you'd save — by paying half of it every two weeks.",
    metaTitle: "Home Improvement Loan Payment Calculator — Biweekly",
    metaDescription: "Free home improvement loan payment calculator. Compare monthly vs biweekly payments, months to payoff, and interest saved.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 30000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "biweeklyPayment", label: "Biweekly Payment (Half Monthly)", format: "currency" },
      { key: "monthsMonthly", label: "Months to Pay Off — Monthly", format: "number", unit: "months" },
      { key: "monthsBiweekly", label: "Months to Pay Off — Biweekly", format: "number", unit: "months" },
      { key: "interestSavedBiweekly", label: "Interest Saved Paying Biweekly", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, interest rate, and term. The tool shows the regular monthly payment, then what happens " +
      "if you pay half of it every two weeks. Because there are 26 two-week periods in a year, that adds up to 13 " +
      "monthly payments a year instead of 12, so the loan ends early.",
    examples:
      "Example: $30,000 at 9% over 10 years costs $380.03 a month. Paying $190.01 every two weeks instead clears it " +
      "in about 106 months instead of 120, saving $2,118.74 in interest.",
    assumptions:
      "Assumes the lender applies each biweekly payment when received and charges interest per two-week period. " +
      "Some lenders hold half-payments until a full payment arrives — then the savings come only from the 13th " +
      "payment. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get the same benefit without biweekly payments?",
        answer: "Yes — paying an extra 1/12 of your payment each month (or one extra payment a year) has nearly the same effect and works with any lender.",
      },
    ],
  },
  {
    slug: "home-improvement-loan-payoff-calculator",
    title: "Home Improvement Loan Payoff Calculator",
    description: "See when your home improvement loan will be paid off with and without an extra payment, and how many years of use the improvement has left once it's paid for.",
    metaTitle: "Home Improvement Loan Payoff Calculator — Free",
    metaDescription: "Free home improvement loan payoff calculator. See months to payoff with an extra payment and how long the improvement lasts after it's paid off.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 25000, max: 10000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10, max: 40, step: 0.05 }),
      currencyField("monthlyPayment", "Current Monthly Payment", { default: 350, max: 100000, step: 10 }),
      currencyField("extraMonthly", "Extra Monthly Payment", { default: 100, max: 100000, step: 10, required: false }),
      numberField("improvementLifeYears", "Expected Life of the Improvement (Years)", { default: 15, min: 0, max: 100, step: 1 }),
    ],
    calcResult: { label: "Months to Payoff With Extra", format: "number", unit: "months" },
    calcResults: [
      { key: "monthsLeft", label: "Months Left at Current Payment", format: "number", unit: "months" },
      { key: "monthsWithExtra", label: "Months to Payoff With Extra", format: "number", unit: "months", highlight: true },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
      { key: "yearsOfUseAfterPayoff", label: "Years of Use Left After Payoff", format: "number", unit: "years" },
    ],
    instructions:
      "Enter your balance, rate, and payment, any extra you can add, and roughly how long the improvement will last " +
      "(for example, 15–20 years for a kitchen or roof, 10–15 for a water heater or HVAC system). A good rule is " +
      "to finish paying for an improvement well before it needs replacing. A negative number means you'd still be " +
      "paying after it wears out.",
    examples:
      "Example: $25,000 at 10% paid at $350 a month takes 109 months. Adding $100 a month cuts it to 75 months and " +
      "saves $4,434.25 in interest — leaving about 8.75 years of use from a 15-year improvement once it's paid for.",
    assumptions:
      "Lifespans are rough guides — quality, climate, and maintenance all matter. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I pay off a home improvement loan early?",
        answer: "If the rate is higher than you'd earn on savings and you have an emergency fund, extra payments are a guaranteed return equal to the loan's rate. Check for prepayment penalties first.",
      },
    ],
  },
  {
    slug: "home-improvement-loan-refinance-calculator",
    title: "Home Improvement Loan Refinance Calculator",
    description: "See whether refinancing your home improvement loan at a lower rate — for example, into a home equity loan — saves money after closing costs.",
    metaTitle: "Home Improvement Loan Refinance Calculator",
    metaDescription: "Free home improvement loan refinance calculator. Compare payments, net savings after closing costs, and the break-even month.",
    calcInputs: [
      currencyField("currentBalance", "Current Loan Balance", { default: 30000, max: 10000000, step: 250 }),
      percentField("currentRatePercent", "Current Interest Rate", { default: 13, max: 40, step: 0.05 }),
      numberField("remainingMonths", "Months Left on Current Loan", { default: 60, min: 1, max: 360, step: 1 }),
      percentField("newRatePercent", "New Interest Rate", { default: 8.5, max: 40, step: 0.05 }),
      numberField("newTermMonths", "New Loan Term (Months)", { default: 60, min: 12, max: 360, step: 12 }),
      currencyField("closingCosts", "Closing Costs / Fees (Paid Upfront)", { default: 750, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Net Savings", format: "currency" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "newPayment", label: "New Monthly Payment", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "netSavings", label: "Net Savings After Costs", format: "currency", highlight: true },
      { key: "breakEvenMonths", label: "Break-Even Month", format: "number", unit: "months" },
    ],
    instructions:
      "Enter your current balance, rate, and months left, then the new rate, term, and any closing costs or fees you " +
      "pay upfront. Net savings compares everything you'd pay from today on each loan, minus the costs; the " +
      "break-even month is when the monthly savings have paid those costs back.",
    examples:
      "Example: $30,000 at 13% with 60 months left costs $682.59 a month. Refinancing at 8.5% over 60 months drops " +
      "it to $615.50 — $67.10 a month less. After $750 of closing costs you save $3,275.78, breaking even in month 12.",
    assumptions:
      "Assumes costs are paid upfront and no prepayment penalty on the current loan. Moving from an unsecured loan " +
      "to a home equity loan puts your home up as security. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is a home equity loan usually cheaper?",
        answer: "It's secured by your home, so the lender's risk is lower. The trade-off is that the lender can foreclose if you don't repay.",
      },
    ],
  },
  {
    slug: "home-improvement-loan-apr-calculator",
    title: "Home Improvement Loan APR Calculator",
    description: "Find the APR of a home improvement or home equity loan once discount points and closing costs are included.",
    metaTitle: "Home Improvement Loan APR Calculator — Points & Fees",
    metaDescription: "Free home improvement loan APR calculator. Include discount points and closing costs to find the true APR and the cash you actually receive.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 50000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 15, min: 1, max: 30, step: 1 }),
      percentField("pointsPercent", "Discount Points / Origination (% of Loan)", { default: 1, max: 10, step: 0.125, required: false }),
      currencyField("closingCosts", "Other Closing Costs ($)", { default: 1000, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "APR", format: "percentage" },
    calcResults: [
      { key: "aprPercent", label: "APR", format: "percentage", highlight: true },
      { key: "upfrontCosts", label: "Total Upfront Costs", format: "currency" },
      { key: "amountReceived", label: "Amount You Actually Receive", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "aprAboveRate", label: "APR Above the Interest Rate", format: "percentage" },
    ],
    instructions:
      "Enter the loan amount, interest rate, and term, any points or origination charge as a percentage of the loan, " +
      "and other closing costs in dollars (appraisal, title, recording). The APR treats those costs as part of the " +
      "price of borrowing, spread over the whole term — use it to compare offers with different fee structures.",
    examples:
      "Example: a $50,000, 15-year loan at 8% costs $477.83 a month. With 1 point ($500) and $1,000 of closing costs, " +
      "you effectively receive $48,500, so the APR is 8.51% — 0.51 points above the rate.",
    assumptions:
      "Assumes all costs are paid at closing and the loan runs its full term. If you repay early, upfront costs " +
      "make the effective rate higher than the APR. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are discount points worth paying?",
        answer: "Points lower the rate in exchange for cash upfront. They pay off only if you keep the loan long enough for the lower payments to recover the cost.",
      },
    ],
  },
  {
    slug: "home-improvement-loan-affordability-calculator",
    title: "Home Improvement Loan Affordability Calculator",
    description: "Find the most you can borrow for a home improvement — the lower of what your home equity allows and what your monthly budget can repay.",
    metaTitle: "Home Improvement Loan Affordability Calculator",
    metaDescription: "Free home improvement loan affordability calculator. Find your limit from home equity (CLTV) and your payment budget, whichever is lower.",
    calcInputs: [
      currencyField("homeValue", "Home's Current Value", { default: 400000, max: 100000000, step: 5000 }),
      currencyField("mortgageBalance", "Mortgage Balance", { default: 250000, max: 100000000, step: 5000, required: false }),
      percentField("maxCltvPercent", "Lender's Maximum CLTV", { default: 85, max: 100, step: 1 }),
      currencyField("monthlyBudget", "Monthly Payment You Can Afford", { default: 500, max: 100000, step: 25 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 15, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "Maximum Loan Amount", format: "currency" },
    calcResults: [
      { key: "equityLimit", label: "Limit From Home Equity", format: "currency" },
      { key: "budgetLimit", label: "Limit From Your Budget", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency", highlight: true },
      { key: "cltvAfterPercent", label: "CLTV After Borrowing", format: "percentage" },
    ],
    instructions:
      "Enter your home's value, your mortgage balance, the lender's maximum combined loan-to-value (CLTV — often 80%–90% " +
      "for home equity loans), the monthly payment you can afford, and the rate and term.\n\n" +
      "The equity limit is the value × CLTV minus your mortgage; the budget limit is the loan your payment can " +
      "repay. You can borrow up to the lower of the two.",
    examples:
      "Example: on a $400,000 home with a $250,000 mortgage and an 85% CLTV cap, equity allows $90,000. A $500 payment " +
      "at 8.5% over 15 years repays $50,774.85, so that's your limit — leaving CLTV at 75.19%.",
    assumptions:
      "The lender will use its own appraisal. Unsecured personal loans ignore equity and rely on income and credit " +
      "instead — use only the budget limit for those. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is CLTV?",
        answer: "Combined loan-to-value: all loans secured by your home (mortgage plus the new loan) divided by the home's value. Lenders cap it so you keep some equity as a cushion.",
      },
    ],
  },
  {
    slug: "home-improvement-loan-eligibility-calculator",
    title: "Home Improvement Loan Eligibility Calculator",
    description: "Check a home equity–based home improvement loan against the three main tests: combined loan-to-value, debt-to-income, and credit score.",
    metaTitle: "Home Improvement Loan Eligibility Calculator — Free",
    metaDescription: "Free home improvement loan eligibility calculator. Check your CLTV, DTI and credit score against a home equity lender's limits.",
    calcInputs: [
      currencyField("homeValue", "Home's Current Value", { default: 350000, max: 100000000, step: 5000 }),
      currencyField("mortgageBalance", "Mortgage Balance", { default: 220000, max: 100000000, step: 5000, required: false }),
      currencyField("loanAmount", "Loan Amount Requested", { default: 50000, max: 10000000, step: 500 }),
      percentField("maxCltvPercent", "Lender's Maximum CLTV", { default: 85, max: 100, step: 1 }),
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 8000, max: 1000000, step: 100 }),
      currencyField("monthlyDebtPayments", "Current Monthly Debts (Incl. Mortgage)", { default: 2200, max: 100000, step: 25 }),
      percentField("annualRatePercent", "Expected Rate", { default: 8.5, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 15, min: 1, max: 30, step: 1 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 43, max: 60, step: 1 }),
      numberField("creditScore", "Your Credit Score", { default: 700, min: 300, max: 850, step: 1 }),
      numberField("lenderMinScore", "Lender's Minimum Score", { default: 680, min: 300, max: 850, step: 1 }),
    ],
    calcResult: { label: "CLTV", format: "percentage" },
    calcResults: [
      { key: "cltvPercent", label: "CLTV", format: "percentage", highlight: true },
      { key: "cltvHeadroomPercent", label: "Room Under CLTV Limit", format: "percentage" },
      { key: "newPayment", label: "New Loan Payment", format: "currency" },
      { key: "dtiAfterPercent", label: "DTI With New Loan", format: "percentage" },
      { key: "dtiHeadroomPercent", label: "Room Under DTI Limit", format: "percentage" },
      { key: "scoreMargin", label: "Points Above Minimum Score", format: "number" },
    ],
    instructions:
      "Enter your home value, mortgage balance, and the loan you want, your gross income and current monthly debts, " +
      "and the lender's limits. The tool runs the three checks home equity lenders typically use. A negative room " +
      "or margin flags the test you'd fail.",
    examples:
      "Example: borrowing $50,000 against a $350,000 home with $220,000 owed puts CLTV at 77.14% — 7.86 points under " +
      "85%. The $492.37 payment takes DTI on $8,000 of income from $2,200 of debts to 33.65%, 9.35 under 43%. A 700 " +
      "score is 20 points above a 680 minimum.",
    assumptions:
      "Guideline check only; lenders also verify income, employment, and the property's condition and value. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get a home improvement loan without equity?",
        answer: "Yes — an unsecured personal loan doesn't need equity, and FHA Title I and 203(k) programmes can also help. Those rely more on income and credit.",
      },
    ],
  },
  {
    slug: "home-improvement-loan-interest-calculator",
    title: "Home Improvement Loan Interest Calculator",
    description: "Find the total and first-year interest on a home improvement loan, and the after-tax cost if the interest is deductible as home equity debt.",
    metaTitle: "Home Improvement Loan Interest Calculator — After Tax",
    metaDescription: "Free home improvement loan interest calculator. See total and year-one interest and the after-tax cost if home equity interest is deductible.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 50000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 15, min: 1, max: 30, step: 1 }),
      {
        key: "deductible", label: "Is the Interest Tax-Deductible?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes — Secured on the Home and I Itemize", value: 1 },
          { label: "No — Unsecured Loan or Standard Deduction", value: 0 },
        ],
      },
      percentField("marginalTaxPercent", "Your Marginal Tax Rate", { default: 22, max: 60, step: 1 }),
    ],
    calcResult: { label: "After-Tax Interest", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "year1Interest", label: "Interest in Year 1", format: "currency" },
      { key: "year1TaxSaving", label: "Year 1 Tax Saving", format: "currency" },
      { key: "afterTaxInterest", label: "After-Tax Interest", format: "currency", highlight: true },
      { key: "afterTaxRatePercent", label: "After-Tax Interest Rate", format: "percentage" },
    ],
    instructions:
      "Enter the loan amount, rate, and term, choose whether the interest is deductible, and enter your marginal " +
      "(top) tax rate.\n\n" +
      "In the US, interest on a home equity loan or HELOC can be deducted when the money is used to buy, build, or " +
      "substantially improve the home that secures it — but only if you itemize deductions and stay within the " +
      "mortgage debt limit. Interest on unsecured personal loans isn't deductible.",
    examples:
      "Example: $50,000 at 8.5% over 15 years costs $492.37 a month and $38,626.56 in interest, $4,183.84 of it in " +
      "year one. If deductible at a 22% tax rate, year one saves $920.44, the after-tax interest is $30,128.72, and " +
      "the after-tax rate is 6.63%.",
    assumptions:
      "Simplified: assumes you itemize every year and the full interest is deductible at the same marginal rate. " +
      "State taxes and the standard deduction can change the benefit — ask a tax professional. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does a HELOC used for a new kitchen qualify?",
        answer: "Generally yes — a kitchen remodel is a substantial improvement. Routine repairs and maintenance usually don't count, and using the money for anything else (like paying off cards) makes that part non-deductible.",
      },
    ],
  },
  {
    slug: "home-improvement-loan-early-payoff-calculator",
    title: "Home Improvement Loan Early Payoff Calculator",
    description: "Set a target date to be done with your home improvement loan and find the higher payment — and the extra each month — needed to get there, plus the interest saved.",
    metaTitle: "Home Improvement Loan Early Payoff Calculator",
    metaDescription: "Free early payoff calculator for home improvement loans. Find the payment needed to finish by your target year and the interest you'll save.",
    calcInputs: [
      currencyField("loanAmount", "Original Loan Amount", { default: 40000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 40, step: 0.05 }),
      numberField("termYears", "Original Term (Years)", { default: 15, min: 1, max: 30, step: 1 }),
      numberField("yearsPaid", "Years Already Paid", { default: 3, min: 0, max: 30, step: 0.5 }),
      numberField("targetYearsLeft", "Years Until You Want It Paid Off", { default: 5, min: 0.5, max: 30, step: 0.5 }),
    ],
    calcResult: { label: "Extra Payment per Month", format: "currency" },
    calcResults: [
      { key: "currentBalance", label: "Balance Today", format: "currency" },
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "newPaymentNeeded", label: "Payment Needed for Target", format: "currency" },
      { key: "extraPerMonth", label: "Extra Payment per Month", format: "currency", highlight: true },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "Enter the original loan amount, rate, and term, how many years you've been paying, and how many more years " +
      "you're willing to pay. The tool finds today's balance and the payment that clears it by your target — for " +
      "example, before you plan to sell, retire, or start the next project.",
    examples:
      "Example: a $40,000, 15-year loan at 9% costs $405.71 a month. After 3 years you owe $35,649.88. To finish in 5 " +
      "more years instead of 12, pay $740.03 a month — $334.33 extra — and save $14,019.78 in interest.",
    assumptions:
      "Assumes extra payments go to principal with no prepayment penalty. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I have to pay off a home equity loan when I sell?",
        answer: "Yes. Any loan secured by the home is repaid from the sale proceeds at closing, so paying it down beforehand simply means more cash from the sale isn't needed for it.",
      },
    ],
  },
  {
    slug: "home-improvement-loan-comparison-calculator",
    title: "Home Improvement Loan Comparison Calculator",
    description: "Compare paying for a home improvement with an unsecured personal loan or a home equity loan: payments, total cost, and the difference.",
    metaTitle: "Home Improvement Loan Comparison — Personal vs Equity",
    metaDescription: "Free calculator comparing a personal loan with a home equity loan for home improvements. See payments, total cost and which is cheaper.",
    calcInputs: [
      currencyField("amount", "Amount Needed", { default: 40000, max: 10000000, step: 500 }),
      percentField("personalRatePercent", "Personal Loan Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("personalTermMonths", "Personal Loan Term (Months)", { default: 84, min: 12, max: 144, step: 12 }),
      percentField("personalFeePercent", "Personal Loan Origination Fee", { default: 3, max: 12, step: 0.25, required: false }),
      percentField("equityRatePercent", "Home Equity Loan Rate", { default: 8.5, max: 40, step: 0.05 }),
      numberField("equityTermYears", "Home Equity Loan Term (Years)", { default: 10, min: 1, max: 30, step: 1 }),
      currencyField("equityClosingCosts", "Home Equity Closing Costs", { default: 1500, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Home Equity Loan Saves", format: "currency" },
    calcResults: [
      { key: "personalPayment", label: "Personal Loan — Monthly Payment", format: "currency" },
      { key: "personalTotalCost", label: "Personal Loan — Interest + Fee", format: "currency" },
      { key: "equityPayment", label: "Home Equity — Monthly Payment", format: "currency" },
      { key: "equityTotalCost", label: "Home Equity — Interest + Closing Costs", format: "currency" },
      { key: "equitySavings", label: "Home Equity Loan Saves", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the amount you need, the personal loan's rate, term, and origination fee, and the home equity loan's " +
      "rate, term, and closing costs. A negative saving means the personal loan is cheaper overall.\n\n" +
      "Watch the terms: a home equity loan's lower rate can be cancelled out if it runs years longer.",
    examples:
      "Example: $40,000 on a 7-year personal loan at 12% with a 3% fee costs $727.95 a month and $21,147.61 in total. " +
      "A 10-year home equity loan at 8.5% costs $495.94 a month and $21,013.13 with $1,500 of closing costs — only " +
      "$134.48 cheaper, because it runs three years longer. Try a 7-year equity term to see the gap widen.",
    assumptions:
      "The personal loan fee is deducted from proceeds (the loan is grossed up); equity closing costs are paid in " +
      "cash. Ignores any tax deduction on home equity interest. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which is faster to get?",
        answer: "Personal loans often fund within days. Home equity loans need an appraisal and closing, typically two to six weeks.",
      },
    ],
  },
  {
    slug: "home-improvement-loan-amortization-calculator",
    title: "Home Improvement Loan Amortization Calculator",
    description: "See how a home improvement loan pays down over time: balance after 1, 3, and 5 years and how much of the first five years' payments went to interest.",
    metaTitle: "Home Improvement Loan Amortization Calculator",
    metaDescription: "Free home improvement loan amortization calculator. See balances after 1, 3 and 5 years and five-year interest vs principal.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 50000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 15, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "balanceAfterYear1", label: "Balance After Year 1", format: "currency" },
      { key: "balanceAfterYear3", label: "Balance After Year 3", format: "currency" },
      { key: "balanceAfterYear5", label: "Balance After Year 5", format: "currency" },
      { key: "interestFirst5Years", label: "Interest Paid in First 5 Years", format: "currency" },
      { key: "principalFirst5Years", label: "Debt Paid Off in First 5 Years", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, rate, and term in years. The tool walks through the amortization schedule and shows " +
      "what you'd still owe after 1, 3, and 5 years — useful if you might sell or refinance — and how the first five " +
      "years of payments split between interest and paying down the loan.",
    examples:
      "Example: $50,000 at 8.5% over 15 years costs $492.37 a month. You'd owe $48,275.40 after one year, $44,355.42 " +
      "after three, and $39,711.82 after five. Of the first five years' payments, $19,254.01 is interest and only " +
      "$10,288.18 pays down the loan.",
    assumptions:
      "Assumes a fixed rate and equal monthly payments. HELOCs often charge interest only during the draw period, " +
      "so their balances fall more slowly at first. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is so little of my loan paid off in the first years?",
        answer: "Interest is charged on the outstanding balance, which is highest at the start. On longer terms, early payments are mostly interest; the principal share grows over time.",
      },
    ],
  },
  {
    slug: "home-improvement-loan-prequalification-calculator",
    title: "Home Improvement Loan Prequalification Calculator",
    description: "Check whether a prequalified amount plus your cash covers the project budget, and see the payment across the prequalified APR range.",
    metaTitle: "Home Improvement Loan Prequalification Calculator",
    metaDescription: "Free calculator for home improvement loan prequalification. See if your offer plus cash covers the project and the payment range.",
    calcInputs: [
      currencyField("projectBudget", "Project Budget", { default: 45000, max: 10000000, step: 500 }),
      currencyField("cashOnHand", "Cash You'll Put In", { default: 5000, max: 10000000, step: 250, required: false }),
      currencyField("prequalifiedAmount", "Prequalified Loan Amount", { default: 35000, max: 10000000, step: 500 }),
      percentField("aprLowPercent", "Lowest APR Quoted", { default: 8, max: 40, step: 0.05 }),
      percentField("aprHighPercent", "Highest APR Quoted", { default: 16, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 84, min: 12, max: 240, step: 12 }),
    ],
    calcResult: { label: "Funding Gap", format: "currency" },
    calcResults: [
      { key: "amountNeeded", label: "Amount You Need to Borrow", format: "currency" },
      { key: "fundingGap", label: "Funding Gap", format: "currency", highlight: true },
      { key: "budgetCoveredPercent", label: "Share of Budget Covered", format: "percentage" },
      { key: "paymentAtLowApr", label: "Payment at Lowest APR", format: "currency" },
      { key: "paymentAtHighApr", label: "Payment at Highest APR", format: "currency" },
    ],
    instructions:
      "Enter your project budget, the cash you'll put in, the amount you were prequalified for, the APR range shown, " +
      "and the term. The tool shows how much you need to borrow, any gap the prequalified amount leaves, and the " +
      "payment at both ends of the APR range on the amount you can actually borrow.",
    examples:
      "Example: a $45,000 project with $5,000 of cash needs $40,000. A $35,000 prequalification leaves a $5,000 gap " +
      "and covers 88.89% of the budget. Over 84 months the $35,000 costs $545.52 a month at 8% or $695.17 at 16%.",
    assumptions:
      "Prequalification is an estimate from a soft credit check; the final amount and rate come after a full " +
      "application. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I close a funding gap?",
        answer: "Scale back or phase the project, add more cash, ask the contractor about a payment schedule, or compare lenders — a home equity loan may offer more if you have equity.",
      },
    ],
  },
  {
    slug: "home-improvement-loan-total-cost-calculator",
    title: "Home Improvement Loan Total Cost Calculator",
    description: "Add interest and fees to your project cost, then subtract the value the improvement adds to your home to see its real net cost.",
    metaTitle: "Home Improvement Loan Total Cost Calculator",
    metaDescription: "Free home improvement loan total cost calculator. Add interest and fees, subtract the value added to your home, and see the real net cost.",
    calcInputs: [
      currencyField("projectCost", "Project Cost", { default: 40000, max: 10000000, step: 500 }),
      currencyField("cashDown", "Cash You'll Put In", { default: 5000, max: 10000000, step: 250, required: false }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 10, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 84, min: 12, max: 240, step: 12 }),
      currencyField("loanFees", "Loan Fees ($)", { default: 500, max: 100000, step: 50, required: false }),
      percentField("valueRecoupPercent", "Share of Cost Recouped in Home Value", { default: 70, max: 200, step: 1 }),
    ],
    calcResult: { label: "Net Cost After Value Added", format: "currency" },
    calcResults: [
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCostWithFinancing", label: "Total Cost With Financing", format: "currency" },
      { key: "valueAdded", label: "Value Added to Your Home", format: "currency" },
      { key: "netCostAfterValue", label: "Net Cost After Value Added", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the project cost, your cash contribution, the loan's rate, term, and fees, and the share of the cost " +
      "you expect to get back in your home's value. Industry cost-vs-value studies often put this between about 50% " +
      "and 100% depending on the project — a local agent can give a better estimate.",
    examples:
      "Example: a $40,000 project with $5,000 down means a $35,000 loan. At 10% over 84 months interest is " +
      "$13,807.48, so with $500 of fees the project costs $54,307.48. If it adds 70% of its cost ($28,000) to your " +
      "home's value, the net cost is $26,307.48.",
    assumptions:
      "Value added is only realised when you sell, and depends on your local market. The tool doesn't discount " +
      "future values or include tax effects. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which improvements recoup the most?",
        answer: "Smaller, practical projects like garage doors, entry doors, and siding replacement often recoup the highest share of their cost; large luxury remodels usually recoup the least.",
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
