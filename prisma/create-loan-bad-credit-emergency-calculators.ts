// One-time (but safe to re-run) batch setup script: creates the Bad Credit and Emergency Loan tools
// (14) of the Loan Calculators expansion 5, filed under Loan Calculators > Short-Term & High-Cost Loan Calculators.
// See src/lib/calc-engine-loan-bad-credit-emergency.ts for the math and
// src/lib/calc-engine-loan-startup-business.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-bad-credit-emergency-calculators.ts
// or
//   npm run db:create-loan-bad-credit-emergency-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "loan-calculators";
const CATEGORY = { name: "Short-Term & High-Cost Loan Calculators", slug: "short-term-loan-calculators" };

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
    slug: "bad-credit-loan-calculator",
    title: "Bad Credit Loan Calculator",
    description: "Estimate a personal loan for bad or fair credit: the cash you get after the origination fee, the monthly payment, total cost and the real APR.",
    metaTitle: "Bad Credit Loan Calculator — Payment, Cost & APR",
    metaDescription: "Free bad credit loan calculator. See the cash after fees, monthly payment, total cost and true APR of a loan for low credit scores.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 5000, max: 50000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 29.99, max: 36, step: 0.01 }),
      percentField("originationFeePercent", "Origination Fee", { default: 8, max: 12, step: 0.25, required: false }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 72, step: 6 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "cashReceived", label: "Cash You Receive", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCost", label: "Total Cost (Interest + Fee)", format: "currency" },
      { key: "apr", label: "APR", format: "percentage" },
    ],
    instructions:
      "Loans for bad credit (roughly scores below 630) usually carry rates near the 36% cap many states and consumer " +
      "advocates use, plus an origination fee taken from the loan. Enter the amount, rate, fee and term. Be wary of " +
      "lenders advertising 'no credit check' — they often charge far more.",
    examples:
      "Example: a $5,000 loan at 29.99% with an 8% fee pays out $4,600. " +
      "Over 36 months the payment is $212.23; interest is $2,640.30 and the total cost " +
      "$3,040.30, an APR of 36.58%.",
    assumptions:
      "Fee deducted from the proceeds; fixed rate, equal monthly payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get a personal loan with a 550 credit score?",
        answer: "Some lenders approve scores in the 500s, usually with higher rates, smaller amounts or a requirement for steady income. A co-signer or collateral can help a lot.",
      },
    ],
  },
  {
    slug: "bad-credit-loan-payment-calculator",
    title: "Bad Credit Loan Payment Calculator",
    description: "Compare your payment on a bad credit loan alone with what it could be if you add a co-signer or secure the loan with collateral.",
    metaTitle: "Bad Credit Loan Payment — Alone, Co-Signer or Secured",
    metaDescription: "Free bad credit loan payment calculator. Compare the payment alone, with a co-signer, or secured, and how much each option saves.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 5000, max: 50000, step: 100 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 72, step: 6 }),
      percentField("aloneRatePercent", "Rate on Your Own", { default: 32, max: 36, step: 0.25 }),
      percentField("cosignerRatePercent", "Rate With a Co-Signer", { default: 16, max: 36, step: 0.25 }),
      percentField("securedRatePercent", "Rate if Secured (Savings or Vehicle)", { default: 12, max: 36, step: 0.25 }),
    ],
    calcResult: { label: "Payment on Your Own", format: "currency" },
    calcResults: [
      { key: "paymentAlone", label: "Payment on Your Own", format: "currency", highlight: true },
      { key: "paymentWithCosigner", label: "Payment With a Co-Signer", format: "currency" },
      { key: "paymentSecured", label: "Payment if Secured", format: "currency" },
      { key: "savingsWithCosigner", label: "Total Saved With a Co-Signer", format: "currency" },
      { key: "savingsSecured", label: "Total Saved if Secured", format: "currency" },
    ],
    instructions:
      "With poor credit, a co-signer with good credit or collateral (savings, a CD or a paid-off car) can cut your " +
      "rate sharply. Enter the loan, term and the rates you're quoted for each option.",
    examples:
      "Example: $5,000 over 36 months costs $217.77 a month at 32% on your own, " +
      "$175.79 with a co-signer at 16%, or $166.07 secured at " +
      "12% — saving $1,511.53 or $1,861.22 over the loan.",
    assumptions:
      "Fixed rates and equal monthly payments; fees not included. A co-signer is fully responsible if you don't pay. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What does a co-signer risk?",
        answer: "Everything you do — they owe the full debt if you miss payments, and late payments hurt their credit too.",
      },
    ],
  },
  {
    slug: "bad-credit-loan-payoff-calculator",
    title: "Bad Credit Loan Payoff Calculator",
    description: "See how even a small extra payment each month shortens a high-rate bad credit loan and how much interest it saves.",
    metaTitle: "Bad Credit Loan Payoff Calculator — Extra Payments",
    metaDescription: "Free bad credit loan payoff calculator. Add an extra amount each month and see your new payoff time and interest saved.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 4000, max: 50000, step: 50 }),
      percentField("annualRatePercent", "Interest Rate", { default: 30, max: 36, step: 0.25 }),
      numberField("remainingMonths", "Months Left", { default: 30, min: 1, max: 72, step: 1 }),
      currencyField("extraMonthly", "Extra Payment Each Month", { default: 50, max: 5000, step: 5 }),
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
      "At high rates, extra payments save a lot. Enter your balance, rate, months left and the extra you can add. " +
      "After 6–12 months of on-time payments your score may improve enough to refinance at a lower rate.",
    examples:
      "Example: $4,000 at 30% with 30 months left costs $191.11 a month. " +
      "Paying $241.11 clears it in 22 months — 8 sooner — saving $501.74.",
    assumptions:
      "Fixed rate, no prepayment penalty (check your contract). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Will paying off a bad credit loan early raise my score?",
        answer: "On-time payments help most. Paying it off closes the account, which can cause a small, temporary dip, but lowers your debt — usually a net positive.",
      },
    ],
  },
  {
    slug: "bad-credit-loan-interest-calculator",
    title: "Bad Credit Loan Interest Calculator",
    description: "Compare the interest on a bad credit installment loan with a 'no credit check' loan for the same amount — and see how much the no-check option really costs.",
    metaTitle: "Bad Credit vs No Credit Check Loan Interest Calculator",
    metaDescription: "Free bad credit loan interest calculator. Compare a bad credit installment loan with a no-credit-check loan's interest and payment.",
    calcInputs: [
      currencyField("amount", "Amount Borrowed", { default: 1500, max: 50000, step: 50 }),
      numberField("termMonths", "Loan Term (Months)", { default: 12, min: 1, max: 60, step: 1 }),
      percentField("badCreditAprPercent", "Bad Credit Loan APR", { default: 35.99, max: 100, step: 0.01 }),
      percentField("noCheckAprPercent", "No-Credit-Check Loan APR", { default: 160, max: 700, step: 1 }),
    ],
    calcResult: { label: "Savings With the Bad Credit Loan", format: "currency" },
    calcResults: [
      { key: "badCreditLoanInterest", label: "Bad Credit Loan — Interest", format: "currency" },
      { key: "noCreditCheckInterest", label: "No-Credit-Check Loan — Interest", format: "currency" },
      { key: "savingsWithBadCreditLoan", label: "Savings With the Bad Credit Loan", format: "currency", highlight: true },
      { key: "badCreditPayment", label: "Bad Credit Loan — Monthly Payment", format: "currency" },
      { key: "noCreditCheckPayment", label: "No-Credit-Check Loan — Monthly Payment", format: "currency" },
    ],
    instructions:
      "'No credit check' lenders skip the credit pull but make up for the risk with very high APRs — often 100% to " +
      "400% or more. Lenders that do check credit, even for low scores, usually cost far less. Enter the amount, term " +
      "and both APRs.",
    examples:
      "Example: borrowing $1,500 for 12 months costs $308.23 of interest at 35.99% " +
      "($150.69 a month), but $1,587.59 at 160% ($257.30 a month) — " +
      "$1,279.36 more for skipping the credit check.",
    assumptions:
      "Both as fixed-payment installment loans; fees not included. Some states cap rates and ban very high-cost loans. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are no-credit-check loans legal?",
        answer: "In many states, yes, but rules vary — some cap interest at 36% or less, which effectively bans them. Check your state's regulator.",
      },
    ],
  },
  {
    slug: "bad-credit-loan-affordability-calculator",
    title: "Bad Credit Loan Affordability Calculator",
    description: "Find the largest bad credit loan your monthly budget can safely repay — and how much cash you'd actually get after the fee.",
    metaTitle: "Bad Credit Loan Affordability Calculator",
    metaDescription: "Free bad credit loan affordability calculator. Turn your monthly budget into a max loan and see the cash you'd receive after fees.",
    calcInputs: [
      currencyField("monthlyBudget", "Monthly Payment You Can Afford", { default: 200, max: 10000, step: 5 }),
      percentField("annualRatePercent", "Interest Rate", { default: 30, max: 36, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 72, step: 6 }),
      percentField("originationFeePercent", "Origination Fee", { default: 8, max: 12, step: 0.25, required: false }),
    ],
    calcResult: { label: "Maximum Loan Amount", format: "currency" },
    calcResults: [
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency", highlight: true },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "cashYouReceive", label: "Cash You'd Receive", format: "currency" },
      { key: "totalRepaid", label: "Total You'd Repay", format: "currency" },
    ],
    instructions:
      "Start from what you can pay each month without missing other bills — a missed payment makes bad credit worse. " +
      "Enter that budget, the rate, the term and the fee.",
    examples:
      "Example: $200 a month at 30% over 36 months repays a $4,711.25 loan. After " +
      "a $376.90 fee you'd receive $4,334.35, and you'd repay $7,200 in total.",
    assumptions:
      "Fixed rate, equal payments, fee deducted from proceeds. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a longer term better with bad credit?",
        answer: "It lowers the payment but costs much more interest at high rates. Choose the shortest term you can reliably afford.",
      },
    ],
  },
  {
    slug: "bad-credit-loan-comparison-calculator",
    title: "Bad Credit Loan Comparison Calculator",
    description: "Compare a bad credit installment loan with rolling over a payday loan every two weeks for the same number of months.",
    metaTitle: "Bad Credit Installment Loan vs Payday Loan Calculator",
    metaDescription: "Free bad credit loan comparison calculator. Compare an installment loan with repeatedly rolling over a payday loan for the same time.",
    calcInputs: [
      currencyField("amount", "Amount Needed", { default: 1000, max: 10000, step: 50 }),
      numberField("months", "Months You'll Need It", { default: 6, min: 1, max: 24, step: 1 }),
      percentField("installmentAprPercent", "Installment Loan APR", { default: 35.99, max: 100, step: 0.01 }),
      currencyField("paydayFeePer100", "Payday Fee per $100 per Two Weeks", { default: 15, max: 50, step: 1 }),
    ],
    calcResult: { label: "Savings With the Installment Loan", format: "currency" },
    calcResults: [
      { key: "installmentInterest", label: "Installment Loan — Interest", format: "currency" },
      { key: "paydayFees", label: "Payday Loan — Fees If Rolled Over", format: "currency" },
      { key: "paydayApr", label: "Payday Loan APR", format: "percentage" },
      { key: "savingsWithInstallment", label: "Savings With the Installment Loan", format: "currency", highlight: true },
    ],
    instructions:
      "Payday loans are due in full in about two weeks; many borrowers can't repay and roll them over, paying the fee " +
      "again each time. Enter the amount, how many months you'll need it, the installment loan's APR and the payday " +
      "fee per $100.",
    examples:
      "Example: $1,000 for 6 months costs $107.55 as an installment loan at " +
      "35.99%. Rolling over a payday loan at $15 per $100 every two weeks — a " +
      "390% APR — costs $1,950, so the installment loan saves $1,842.45.",
    assumptions:
      "The payday principal is never paid down during rollovers; about 26 two-week periods a year. Some states limit " +
      "rollovers. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What are payday alternative loans (PALs)?",
        answer: "Small loans from federal credit unions with APRs capped at 28%, terms of 1–12 months and an application fee of no more than $20 — far cheaper than payday loans.",
      },
    ],
  },
  {
    slug: "bad-credit-loan-eligibility-calculator",
    title: "Bad Credit Loan Eligibility Calculator",
    description: "Check the screens bad credit lenders commonly use: a minimum score, steady income, debt-to-income with the new payment, and no recent bankruptcy.",
    metaTitle: "Bad Credit Loan Eligibility Calculator",
    metaDescription: "Free bad credit loan eligibility calculator. Check credit score, income, DTI with the new payment and recent bankruptcy.",
    calcInputs: [
      numberField("creditScore", "Your Credit Score", { default: 570, min: 300, max: 850, step: 1 }),
      currencyField("monthlyIncome", "Gross Monthly Income", { default: 2800, max: 1000000, step: 50 }),
      currencyField("monthlyDebts", "Existing Monthly Debt Payments", { default: 600, max: 100000, step: 10, required: false }),
      currencyField("loanAmount", "Loan Amount", { default: 3000, max: 50000, step: 100 }),
      percentField("annualRatePercent", "Expected Interest Rate", { default: 32, max: 36, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 6, max: 72, step: 6 }),
      {
        key: "recentBankruptcy", label: "Bankruptcy in the Last 12 Months?", type: "dropdown", required: true, default: 0,
        options: [
          { label: "No", value: 0 },
          { label: "Yes", value: 1 },
        ],
      },
    ],
    calcResult: { label: "Checks Passed (of 4)", format: "number" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "dtiWithLoan", label: "Debt-to-Income With the Loan", format: "percentage" },
      { key: "checksPassed", label: "Checks Passed (of 4)", format: "number", highlight: true },
    ],
    instructions:
      "Enter your score, income, debts and the loan you want. The four checks: a score of 560+; income of at least " +
      "$1,200 a month; DTI of 50% or less with the new payment; and no bankruptcy in the past year. Lenders vary — " +
      "these are common subprime guidelines.",
    examples:
      "Example: a $3,000 loan at 32% over 24 months costs $170.84, bringing your " +
      "DTI to 27.53%. With a 570 score and $2,800 of income, 4 of 4 checks pass.",
    assumptions:
      "Typical guidelines; lenders also verify income and bank history. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Where can I get a loan with bad credit?",
        answer: "Credit unions (including payday alternative loans), online lenders that work with fair credit, secured loans, or a loan with a co-signer.",
      },
    ],
  },
  {
    slug: "emergency-loan-calculator",
    title: "Emergency Loan Calculator",
    description: "Cover an unexpected bill: subtract what your emergency fund can pay, gross up for the loan fee, and see the amount to borrow and the monthly payment.",
    metaTitle: "Emergency Loan Calculator — How Much to Borrow",
    metaDescription: "Free emergency loan calculator. Subtract your emergency fund, add the loan fee, and see the amount to borrow and the monthly payment.",
    calcInputs: [
      currencyField("emergencyCost", "Emergency Expense", { default: 3000, max: 100000, step: 50 }),
      currencyField("emergencyFund", "Savings You Can Use", { default: 800, max: 100000, step: 50, required: false }),
      percentField("originationFeePercent", "Origination Fee", { default: 5, max: 12, step: 0.25, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 24, max: 36, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 12, min: 3, max: 60, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "amountNeeded", label: "Amount You Need", format: "currency" },
      { key: "loanToRequest", label: "Loan to Request (After the Fee)", format: "currency" },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the cost of the emergency — a car repair, medical bill, urgent travel — and the savings you can put in. " +
      "If the lender takes a fee from the loan, borrow a bit more so you still have enough. Then enter the rate and " +
      "term.",
    examples:
      "Example: a $3,000 bill less $800 of savings leaves $2,200 to cover. With a " +
      "5% fee, request $2,315.79. At 24% over 12 months that's " +
      "$218.98 a month and $311.97 of interest.",
    assumptions:
      "Fee deducted from the loan; fixed rate, equal payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What are cheaper alternatives to an emergency loan?",
        answer: "Asking the hospital or repair shop for a payment plan, a credit union payday alternative loan, an employer advance, or a 0% card if you can repay in time.",
      },
    ],
  },
  {
    slug: "emergency-loan-payment-calculator",
    title: "Emergency Loan Payment Calculator",
    description: "Compare a standard loan with a same-day funded loan: the payment for each and how much extra you pay for getting the money today.",
    metaTitle: "Emergency Loan Payment — Same-Day vs Standard Funding",
    metaDescription: "Free emergency loan payment calculator. Compare same-day funding with standard funding and see the extra cost of speed.",
    calcInputs: [
      currencyField("amount", "Loan Amount", { default: 2000, max: 100000, step: 50 }),
      numberField("termMonths", "Loan Term (Months)", { default: 12, min: 1, max: 60, step: 1 }),
      percentField("standardRatePercent", "Standard Loan Rate (Funds in a Few Days)", { default: 18, max: 36, step: 0.25 }),
      percentField("sameDayRatePercent", "Same-Day Loan Rate", { default: 30, max: 100, step: 0.25 }),
      currencyField("expediteFee", "Same-Day Funding Fee", { default: 50, max: 1000, step: 5, required: false }),
    ],
    calcResult: { label: "Extra Cost of Same-Day Money", format: "currency" },
    calcResults: [
      { key: "standardPayment", label: "Standard — Monthly Payment", format: "currency" },
      { key: "sameDayPayment", label: "Same-Day — Monthly Payment", format: "currency" },
      { key: "standardTotalCost", label: "Standard — Total Cost", format: "currency" },
      { key: "sameDayTotalCost", label: "Same-Day — Total Cost", format: "currency" },
      { key: "extraCostOfSameDay", label: "Extra Cost of Same-Day Money", format: "currency", highlight: true },
    ],
    instructions:
      "Lenders that fund the same day often charge higher rates or a fee for instant transfer. Enter the amount, " +
      "term, both rates and the fee. If the bill can wait a few days, the standard loan may save real money.",
    examples:
      "Example: $2,000 over 12 months costs $183.36 a month at 18% " +
      "($200.32 in total). The same-day loan at 30% plus a $50 fee costs " +
      "$194.97 a month ($389.69) — $189.37 more for speed.",
    assumptions:
      "Fixed rates, equal payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How fast can I get an emergency loan?",
        answer: "Some online lenders fund the same or next business day after approval; banks and credit unions may take a few days, or less if you're already a customer.",
      },
    ],
  },
  {
    slug: "emergency-loan-payoff-calculator",
    title: "Emergency Loan Payoff Calculator",
    description: "See how a lump sum and a little extra each month pay off your emergency loan faster and save interest.",
    metaTitle: "Emergency Loan Payoff Calculator — Pay It Off Early",
    metaDescription: "Free emergency loan payoff calculator. Add a lump sum and extra monthly payments to see your new payoff time and interest saved.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 2500, max: 100000, step: 50 }),
      percentField("annualRatePercent", "Interest Rate", { default: 24, max: 36, step: 0.25 }),
      numberField("remainingMonths", "Months Left", { default: 12, min: 1, max: 60, step: 1 }),
      currencyField("extraMonthly", "Extra Payment Each Month", { default: 50, max: 10000, step: 5, required: false }),
      currencyField("lumpSum", "Lump Sum Now (e.g. Insurance Payout)", { default: 500, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Months to Payoff", format: "number" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "monthsToPayoff", label: "Months to Payoff", format: "number", highlight: true },
      { key: "monthsSaved", label: "Months Saved", format: "number" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "Enter your balance, rate and months left, any lump sum (an insurance payout or reimbursement for the " +
      "emergency) and an extra monthly amount.",
    examples:
      "Example: $2,500 at 24% with 12 months left costs $236.40 a month. A " +
      "$500 lump sum plus $50 extra a month clears it in 8 months — 4 " +
      "sooner — saving $160.43.",
    assumptions:
      "Fixed rate, no prepayment penalty; lump sum paid today. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I rebuild my emergency fund or pay off the loan first?",
        answer: "Many people do both: keep a small cushion (say $500–$1,000) so a new surprise doesn't mean another loan, then put the rest toward the debt.",
      },
    ],
  },
  {
    slug: "emergency-loan-interest-calculator",
    title: "Emergency Loan Interest Calculator",
    description: "See how much interest an emergency loan costs per day and in total — and how much you save repaying it in 6 months instead of 12.",
    metaTitle: "Emergency Loan Interest Calculator — Shorter Term Savings",
    metaDescription: "Free emergency loan interest calculator. See interest per day and the total over a short vs long term to choose the cheapest.",
    calcInputs: [
      currencyField("amount", "Loan Amount", { default: 2000, max: 100000, step: 50 }),
      percentField("aprPercent", "APR", { default: 28, max: 100, step: 0.25 }),
      numberField("shortMonths", "Shorter Term (Months)", { default: 6, min: 1, max: 60, step: 1 }),
      numberField("longMonths", "Longer Term (Months)", { default: 12, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Savings With the Shorter Term", format: "currency" },
    calcResults: [
      { key: "interestPerDayAtStart", label: "Interest per Day at the Start", format: "currency" },
      { key: "interestShortTerm", label: "Interest — Shorter Term", format: "currency" },
      { key: "interestLongTerm", label: "Interest — Longer Term", format: "currency" },
      { key: "savingsWithShorterTerm", label: "Savings With the Shorter Term", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan, its APR and two terms to compare. At high rates every extra month adds noticeably to the cost, " +
      "so choose the shortest term whose payment you can manage.",
    examples:
      "Example: $2,000 at 28% costs about $1.53 a day at first. Repaying over 6 months " +
      "costs $166.47; over 12 months, $316.14 — the shorter term saves $149.67.",
    assumptions:
      "Fixed APR, equal monthly payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is daily interest useful to know?",
        answer: "It shows the cost of waiting — every day the balance stays unpaid adds roughly that amount.",
      },
    ],
  },
  {
    slug: "emergency-loan-affordability-calculator",
    title: "Emergency Loan Affordability Calculator",
    description: "Use what's left of your income after regular bills to find how big an emergency loan you can actually repay.",
    metaTitle: "Emergency Loan Affordability Calculator",
    metaDescription: "Free emergency loan affordability calculator. See how much you can borrow based on what's left after your monthly bills.",
    calcInputs: [
      currencyField("monthlyIncome", "Monthly Take-Home Pay", { default: 3500, max: 1000000, step: 50 }),
      currencyField("monthlyBills", "Monthly Bills and Living Costs", { default: 3000, max: 1000000, step: 50 }),
      percentField("aprPercent", "APR", { default: 24, max: 100, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 12, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Maximum Emergency Loan", format: "currency" },
    calcResults: [
      { key: "leftoverEachMonth", label: "Left Over Each Month", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Emergency Loan", format: "currency", highlight: true },
      { key: "totalInterestAtMax", label: "Interest at That Amount", format: "currency" },
    ],
    instructions:
      "Enter your take-home pay and everything you must pay each month. What's left is the most a loan payment can " +
      "be. Borrowing more risks missed bills — consider trimming spending or a longer term if it falls short.",
    examples:
      "Example: $3,500 of take-home pay minus $3,000 of bills leaves $500 a month. At " +
      "24% over 12 months, that repays an emergency loan of up to $5,287.67, with " +
      "$712.33 of interest.",
    assumptions:
      "Uses all leftover money for the payment — leave a cushion if you can. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I can't afford any loan payment?",
        answer: "Ask the creditor for a hardship plan, look into local assistance programs or 211, and avoid high-cost loans that can trap you in rollovers.",
      },
    ],
  },
  {
    slug: "emergency-loan-comparison-calculator",
    title: "Emergency Loan Comparison Calculator",
    description: "Compare three ways to cover an emergency: a personal loan, a credit card cash advance, or a loan from your 401(k).",
    metaTitle: "Emergency Loan vs Cash Advance vs 401(k) Loan",
    metaDescription: "Free emergency loan comparison calculator. Compare a personal loan, a credit card cash advance and a 401(k) loan by total cost.",
    calcInputs: [
      currencyField("amount", "Amount Needed", { default: 3000, max: 100000, step: 50 }),
      numberField("months", "Months to Repay", { default: 12, min: 1, max: 60, step: 1 }),
      percentField("loanAprPercent", "Personal Loan APR", { default: 24, max: 36, step: 0.25 }),
      percentField("loanFeePercent", "Personal Loan Fee", { default: 5, max: 12, step: 0.25, required: false }),
      percentField("cashAdvanceAprPercent", "Cash Advance APR", { default: 29.99, max: 40, step: 0.01 }),
      percentField("cashAdvanceFeePercent", "Cash Advance Fee", { default: 5, max: 10, step: 0.25, required: false }),
      percentField("lostReturnPercent", "Investment Return Missed (401(k))", { default: 7, max: 20, step: 0.25, required: false }),
    ],
    calcResult: { label: "Savings: Personal Loan vs Cash Advance", format: "currency" },
    calcResults: [
      { key: "personalLoanCost", label: "Personal Loan — Cost", format: "currency" },
      { key: "cashAdvanceCost", label: "Cash Advance — Cost", format: "currency" },
      { key: "retirementLoanCost", label: "401(k) Loan — Missed Growth", format: "currency" },
      { key: "savingsLoanVsCashAdvance", label: "Savings: Personal Loan vs Cash Advance", format: "currency", highlight: true },
    ],
    instructions:
      "Cash advances usually have a higher APR than purchases, an upfront fee and no grace period. A 401(k) loan's " +
      "interest goes back into your own account, so its main cost is the growth your money misses while it's out — " +
      "plus the risk of having to repay quickly if you leave your job. Enter the amount, months and each option's terms.",
    examples:
      "Example: $3,000 repaid over 12 months costs $554.15 as a personal loan, $659.36 as a " +
      "cash advance, or about $105 of missed growth as a 401(k) loan. The personal loan saves " +
      "$105.21 over the cash advance.",
    assumptions:
      "Cash advance repaid in equal payments; 401(k) loan missed growth estimated on the average balance; taxes and " +
      "plan fees not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens to a 401(k) loan if I leave my job?",
        answer: "The balance is often due by your tax filing deadline for that year; if not repaid it's treated as a withdrawal, with income tax and possibly a 10% penalty.",
      },
    ],
  },
  {
    slug: "emergency-loan-eligibility-calculator",
    title: "Emergency Loan Eligibility Calculator",
    description: "Check whether you're likely to qualify for a fast emergency loan: credit score, income, debt-to-income with the payment, and a bank account for same-day deposit.",
    metaTitle: "Emergency Loan Eligibility Calculator",
    metaDescription: "Free emergency loan eligibility calculator. Check credit score, income, DTI with the payment and a bank account for fast funding.",
    calcInputs: [
      numberField("creditScore", "Your Credit Score", { default: 620, min: 300, max: 850, step: 1 }),
      currencyField("monthlyIncome", "Gross Monthly Income", { default: 3200, max: 1000000, step: 50 }),
      currencyField("monthlyDebts", "Existing Monthly Debt Payments", { default: 700, max: 100000, step: 10, required: false }),
      currencyField("loanAmount", "Loan Amount", { default: 2000, max: 100000, step: 50 }),
      percentField("aprPercent", "Expected APR", { default: 24, max: 100, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 12, min: 1, max: 60, step: 1 }),
      {
        key: "hasDebitAccount", label: "Checking Account With a Debit Card?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
    ],
    calcResult: { label: "Checks Passed (of 4)", format: "number" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "dtiWithLoan", label: "Debt-to-Income With the Loan", format: "percentage" },
      { key: "checksPassed", label: "Checks Passed (of 4)", format: "number", highlight: true },
    ],
    instructions:
      "Enter your score, income, debts, the loan you need and whether you have a checking account with a debit card " +
      "(needed for most same-day deposits). The four checks: a score of 600+; income of at least $1,500 a month; DTI " +
      "of 40% or less with the payment; and a debit-card bank account.",
    examples:
      "Example: a $2,000 emergency loan at 24% over 12 months costs $189.12, bringing " +
      "DTI to 27.78%. With a 620 score and $3,200 of income, 4 of 4 checks pass.",
    assumptions:
      "Typical guidelines for fast-funding personal loans; lenders vary. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get an emergency loan without a bank account?",
        answer: "It's harder — some lenders pay by check or prepaid card, and pawn loans need no account, but options and costs are worse.",
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
