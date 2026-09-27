// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Loan Calculators" sub-batch B (Solve for Amount, Term, Rate &
// Balance). Part of the Loan Calculators tool-list build-out — see
// create-loan-core-calculators.ts for the full batch context and the
// skipped duplicate.
//
// See src/lib/calc-engine-loan-solve.ts for the math and for notes on how
// these near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-solve-calculators.ts
// or
//   npm run db:create-loan-solve-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "loan-calculators";

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
    slug: "loan-amount-calculator",
    title: "Loan Amount Calculator",
    description: "Work out how much you can borrow for a monthly payment you're comfortable with, at a given rate and term.",
    metaTitle: "Loan Amount Calculator — How Much Can I Borrow?",
    metaDescription: "Free loan amount calculator. Enter the monthly payment you can afford, the interest rate, and term to see how much you can borrow.",
    calcInputs: [
      currencyField("monthlyPayment", "Monthly Payment You Can Afford", { default: 500, max: 1000000, step: 25 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 7, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 5, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Loan Amount", format: "currency" },
    calcResults: [
      { key: "loanAmount", label: "Loan Amount You Can Borrow", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalPaid", label: "Total Repaid", format: "currency" },
    ],
    instructions:
      "Start from your budget: enter the most you want to pay each month, the interest rate you expect, and the " +
      "term. The tool works backwards to the largest loan that payment will fully repay. To base the limit on your " +
      "income instead, use the Loan Affordability Calculator.",
    examples:
      "Example: $500 a month at 7% for 5 years supports a loan of $25,251. You'd repay $30,000 in total, $4,749 of " +
      "it interest.",
    assumptions:
      "Assumes a fixed rate and equal monthly payments. Lenders also look at your income, credit, and existing " +
      "debts, so the amount you're offered may differ. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I borrow more for the same payment?",
        answer: "A lower rate or a longer term both raise the loan a payment can support — but a longer term also means paying interest for longer, so the total cost rises.",
      },
    ],
  },
  {
    slug: "loan-principal-calculator",
    title: "Loan Principal Calculator",
    description: "See how much of any specific loan payment goes to principal versus interest, and how much principal you've repaid by then.",
    metaTitle: "Loan Principal Calculator — Principal vs Interest",
    metaDescription: "Free loan principal calculator. Pick any payment number to see how much goes to principal and interest and how much principal you've repaid so far.",
    calcInputs: [
      currencyField("loanAmount", "Original Loan Amount", { default: 20000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 8, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 5, min: 1, max: 40, step: 1 }),
      numberField("paymentNumber", "Payment Number to Look At", { default: 12, min: 1, max: 480, step: 1 }),
    ],
    calcResult: { label: "Principal in This Payment", format: "currency" },
    calcResults: [
      { key: "principalInPayment", label: "Principal in This Payment", format: "currency", highlight: true },
      { key: "interestInPayment", label: "Interest in This Payment", format: "currency" },
      { key: "cumulativePrincipalPaid", label: "Total Principal Repaid So Far", format: "currency" },
      { key: "balanceAfterPayment", label: "Balance After This Payment", format: "currency" },
    ],
    instructions:
      "Enter the original loan amount, rate, and term, then the payment number you want to look at — for " +
      "example, 12 for the last payment of the first year. The tool breaks that payment into principal and " +
      "interest and shows how much of the loan you've paid off by that point.",
    examples:
      "Example: on a $20,000 loan at 8% over 5 years, payment 12 is $292.83 principal and $112.69 interest. By " +
      "then you've repaid $3,388.80 of principal, leaving $16,611.20.",
    assumptions:
      "Assumes a fixed rate, equal monthly payments made on time, and no extra payments. Payment numbers beyond " +
      "the end of the term show the final payment. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does the principal part grow over time?",
        answer: "The payment stays the same, but interest is charged on a shrinking balance, so each month a little less goes to interest and a little more pays down the loan.",
      },
    ],
  },
  {
    slug: "loan-term-calculator",
    title: "Loan Term Calculator",
    description: "Find out how long it will take to repay a loan with the monthly payment you choose.",
    metaTitle: "Loan Term Calculator — How Long to Pay Off?",
    metaDescription: "Free loan term calculator. Enter the loan amount, interest rate, and your monthly payment to see how many months and years it takes to repay.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 8, max: 40, step: 0.05 }),
      currencyField("monthlyPayment", "Monthly Payment", { default: 400, max: 1000000, step: 25 }),
    ],
    calcResult: { label: "Months to Repay", format: "number" },
    calcResults: [
      { key: "monthsToRepay", label: "Months to Repay", format: "number", highlight: true },
      { key: "yearsToRepay", label: "Years to Repay", format: "number" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "interestOnlyPayment", label: "Payment Must Be More Than", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, the interest rate, and the payment you plan to make each month. The tool calculates " +
      "how many months it takes to repay, counting the smaller final payment, and the total interest. Your " +
      "payment must be more than the first month's interest — shown in the last line — or the loan never gets " +
      "paid off, and the results show 0.",
    examples:
      "Example: $15,000 at 8% repaid at $400 a month takes 44 months (about 3.61 years), with $2,318.67 of total " +
      "interest. Any payment must be more than $100 a month just to cover the interest.",
    assumptions:
      "Assumes a fixed rate charged monthly and the same payment every month, with the last payment reduced to " +
      "whatever is left. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does a small payment increase save so much time?",
        answer: "Everything above the monthly interest goes straight to the balance. If interest is $100, raising a $400 payment to $500 lifts the amount paying down the loan from $300 to $400 — a third more.",
      },
    ],
  },
  {
    slug: "loan-rate-calculator",
    title: "Loan Rate Calculator",
    description: "Work out the interest rate a lender is actually charging from the loan amount, the monthly payment, and the number of payments.",
    metaTitle: "Loan Rate Calculator — Find Your Interest Rate",
    metaDescription: "Free loan rate calculator. Enter the loan amount, monthly payment, and term to find the annual interest rate the payment implies.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 20000, max: 10000000, step: 500 }),
      currencyField("monthlyPayment", "Monthly Payment", { default: 420, max: 1000000, step: 5 }),
      numberField("termMonths", "Number of Monthly Payments", { default: 60, min: 1, max: 480, step: 1 }),
    ],
    calcResult: { label: "Annual Interest Rate", format: "percentage" },
    calcResults: [
      { key: "annualRatePercent", label: "Annual Interest Rate", format: "percentage", highlight: true },
      { key: "monthlyRatePercent", label: "Monthly Rate", format: "percentage" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the amount borrowed, the monthly payment you've been quoted, and how many payments there are. The " +
      "tool finds the annual interest rate that makes those payments repay exactly that loan — handy when a " +
      "dealer or lender quotes only a payment. If the payments add up to no more than the loan, the rate shows 0.",
    examples:
      "Example: a $20,000 loan repaid at $420 a month for 60 months carries an interest rate of about 9.50% a year " +
      "(0.79% a month), with $5,200 of total interest.",
    assumptions:
      "Assumes equal monthly payments on a standard amortizing loan with no balloon. The rate is found by " +
      "numerical search, since there's no direct formula for it. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is this the same as the APR?",
        answer: "Only if there are no fees. If the lender charges fees, use the Loan APR Calculator, which counts them to find the true annual cost.",
      },
    ],
  },
  {
    slug: "loan-apr-calculator",
    title: "Loan APR Calculator",
    description: "Calculate a loan's true APR by including origination and other fees, not just the stated interest rate.",
    metaTitle: "Loan APR Calculator — True Rate With Fees",
    metaDescription: "Free loan APR calculator. Include origination and other fees to find the true annual percentage rate (APR) of a loan, not just its interest rate.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 20000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Stated Interest Rate", { default: 8, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 1, max: 480, step: 1 }),
      percentField("originationFeePercent", "Origination Fee (% of Loan)", { default: 2, max: 15, step: 0.25 }),
      currencyField("otherFees", "Other Upfront Fees", { default: 300, max: 100000, step: 25 }),
    ],
    calcResult: { label: "APR", format: "percentage" },
    calcResults: [
      { key: "aprPercent", label: "APR", format: "percentage", highlight: true },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "totalFees", label: "Total Fees", format: "currency" },
      { key: "amountReceived", label: "Money You Actually Receive", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, the stated interest rate, the term in months, the origination fee as a percentage, " +
      "and any other upfront fees. Your payment is based on the full loan, but you only receive the loan minus " +
      "fees — the APR is the rate that reflects that.",
    examples:
      "Example: a $20,000 loan at 8% over 60 months costs $405.53 a month. With a 2% origination fee plus $300 of " +
      "other fees, you receive $19,300, so the APR is 9.52%.",
    assumptions:
      "Calculated the way US Truth in Lending APRs are: the rate at which the payments repay only the money you " +
      "actually received. Rules on which fees count vary by country and loan type. The APR Calculator under " +
      "Interest Calculators converts periodic rates and doesn't include fees. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is APR higher than the interest rate?",
        answer: "Because fees mean you receive less money but still repay the full loan with interest. The APR spreads that fee cost over the loan's life as an annual rate, which makes offers with different fees comparable.",
      },
    ],
  },
  {
    slug: "loan-affordability-calculator",
    title: "Loan Affordability Calculator",
    description: "Find the largest loan payment and loan amount your income supports, based on a debt-to-income (DTI) limit.",
    metaTitle: "Loan Affordability Calculator — By Income & DTI",
    metaDescription: "Free loan affordability calculator. Use your income, existing debts, and a debt-to-income limit to find the maximum loan payment and amount.",
    calcInputs: [
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 6000, max: 1000000, step: 100 }),
      currencyField("existingMonthlyDebt", "Existing Monthly Debt Payments", { default: 500, max: 1000000, step: 25 }),
      percentField("maxDtiPercent", "Maximum Debt-to-Income Ratio", { default: 36, max: 60, step: 1 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 8, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 5, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Maximum Loan Amount", format: "currency" },
    calcResults: [
      { key: "maxMonthlyPayment", label: "Maximum New Monthly Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency", highlight: true },
      { key: "totalInterestAtMax", label: "Total Interest at That Amount", format: "currency" },
    ],
    instructions:
      "Enter your gross (before-tax) monthly income, your current monthly debt payments (car, cards, student " +
      "loans, and so on), the highest debt-to-income ratio you want to stay under, and the loan's rate and term. " +
      "The tool finds the new payment that keeps you within that limit and the loan amount it supports.",
    examples:
      "Example: with $6,000 of monthly income, $500 of existing debt payments, and a 36% DTI limit, you can add a " +
      "payment of up to $1,660 — enough for a loan of about $81,868.60 at 8% over 5 years.",
    assumptions:
      "36% is a common guideline, but lenders set their own limits. This is a maximum, not a recommendation — " +
      "leave room for savings and everyday costs. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is debt-to-income ratio?",
        answer: "It's your total monthly debt payments divided by your gross monthly income. Lenders use it to judge whether you can take on a new payment; see the Debt-to-Income Ratio Calculator for more detail.",
      },
    ],
  },
  {
    slug: "loan-eligibility-calculator",
    title: "Loan Eligibility Calculator",
    description: "Check whether a specific loan fits a lender's debt-to-income limit, and how much room you'd have left.",
    metaTitle: "Loan Eligibility Calculator — Will I Qualify?",
    metaDescription: "Free loan eligibility calculator. Check your debt-to-income ratio with a requested loan against the lender's limit and see your remaining headroom.",
    calcInputs: [
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 5000, max: 1000000, step: 100 }),
      currencyField("existingMonthlyDebt", "Existing Monthly Debt Payments", { default: 600, max: 1000000, step: 25 }),
      currencyField("requestedAmount", "Loan Amount You Want", { default: 25000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Expected Interest Rate", { default: 9, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 5, min: 1, max: 40, step: 1 }),
      {
        key: "dtiLimitPercent", label: "Lender's DTI Limit (Illustrative, by Credit Profile)", type: "dropdown", required: true, default: 40,
        options: [
          { label: "Excellent Credit — 45%", value: 45 },
          { label: "Good Credit — 40%", value: 40 },
          { label: "Fair Credit — 36%", value: 36 },
          { label: "Poor Credit — 30%", value: 30 },
        ],
      },
    ],
    calcResult: { label: "Payment Headroom", format: "currency" },
    calcResults: [
      { key: "newMonthlyPayment", label: "Payment on the Loan You Want", format: "currency" },
      { key: "dtiAfterLoanPercent", label: "Your DTI With This Loan", format: "percentage" },
      { key: "dtiLimitPercent", label: "Lender's DTI Limit", format: "percentage" },
      { key: "paymentHeadroom", label: "Monthly Headroom (+ Within Limit, − Over)", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your gross monthly income, existing debt payments, the loan you'd like, its expected rate and term, " +
      "and your credit profile. The tool calculates the new payment and your debt-to-income ratio with it, then " +
      "compares that with a typical limit for that credit profile. A positive headroom means you're within the " +
      "limit; a negative one shows how far over you are.",
    examples:
      "Example: $5,000 of monthly income with $600 of existing payments, asking for $25,000 at 9% over 5 years, " +
      "adds a $518.96 payment and brings your DTI to 22.38%. Against a 40% limit, you'd still have $881.04 a " +
      "month of headroom.",
    assumptions:
      "The DTI limits by credit profile are illustrative round numbers, not any lender's actual rules — lenders " +
      "also weigh credit score, employment, and collateral, and some use net income. Passing this check doesn't " +
      "guarantee approval. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if my headroom is negative?",
        answer: "Try a smaller amount, a longer term (lower payment), or pay down existing debts first. Use the Loan Affordability Calculator to find the largest loan that fits.",
      },
    ],
  },
  {
    slug: "loan-balance-calculator",
    title: "Loan Balance Calculator",
    description: "Find out how much you still owe on a loan after a given number of payments, and how much principal and interest you've paid.",
    metaTitle: "Loan Balance Calculator — What Do I Still Owe?",
    metaDescription: "Free loan balance calculator. Enter your original loan terms and payments made to see your remaining balance and the principal and interest paid.",
    calcInputs: [
      currencyField("loanAmount", "Original Loan Amount", { default: 25000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 7, max: 40, step: 0.05 }),
      numberField("termYears", "Original Term (Years)", { default: 5, min: 1, max: 40, step: 1 }),
      numberField("paymentsMade", "Monthly Payments Made So Far", { default: 24, min: 0, max: 480, step: 1 }),
    ],
    calcResult: { label: "Remaining Balance", format: "currency" },
    calcResults: [
      { key: "remainingBalance", label: "Remaining Balance", format: "currency", highlight: true },
      { key: "principalPaid", label: "Principal Paid So Far", format: "currency" },
      { key: "interestPaid", label: "Interest Paid So Far", format: "currency" },
      { key: "percentPaidOff", label: "Share of Loan Paid Off", format: "percentage" },
    ],
    instructions:
      "Enter the original loan amount, interest rate, and term, and how many monthly payments you've made. The " +
      "tool shows what you still owe and splits what you've paid so far into principal and interest. If you " +
      "don't know the original terms, use the Remaining Loan Balance Calculator instead.",
    examples:
      "Example: after 24 payments on a $25,000, 5-year loan at 7%, you still owe $16,032.27. You've paid off " +
      "$8,967.73 of principal (35.87%) and $2,912.99 in interest.",
    assumptions:
      "Assumes every payment was the regular scheduled amount, made on time, with no extra payments. Your " +
      "lender's payoff figure may differ slightly because of daily interest. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why have I paid off less than 40% after 40% of the term?",
        answer: "Early payments are weighted toward interest, so the balance falls slowly at first and faster toward the end.",
      },
    ],
  },
  {
    slug: "remaining-loan-balance-calculator",
    title: "Remaining Loan Balance Calculator",
    description: "Estimate what you still owe using only your current monthly payment, interest rate, and the number of payments left.",
    metaTitle: "Remaining Loan Balance Calculator — Free",
    metaDescription: "Free remaining loan balance calculator. Estimate your balance from just your monthly payment, interest rate, and number of payments left.",
    calcInputs: [
      currencyField("monthlyPayment", "Current Monthly Payment", { default: 450, max: 1000000, step: 5 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 7.5, max: 40, step: 0.05 }),
      numberField("remainingPayments", "Payments Left", { default: 30, min: 0, max: 480, step: 1 }),
    ],
    calcResult: { label: "Remaining Balance", format: "currency" },
    calcResults: [
      { key: "remainingBalance", label: "Estimated Remaining Balance", format: "currency", highlight: true },
      { key: "remainingInterest", label: "Interest Still to Pay", format: "currency" },
      { key: "totalRemainingPayments", label: "Total of Remaining Payments", format: "currency" },
    ],
    instructions:
      "Enter your monthly payment, the loan's interest rate, and how many payments you have left — all found on " +
      "a recent statement. The tool works out the balance those remaining payments will clear, without needing " +
      "the original loan amount or start date.",
    examples:
      "Example: 30 payments of $450 left on a 7.5% loan means a remaining balance of about $12,275.06. The " +
      "remaining payments total $13,500, so $1,224.94 of that is interest you'd avoid by paying off today.",
    assumptions:
      "Assumes a standard fixed-rate amortizing loan with no balloon payment. Your lender's exact payoff amount " +
      "will also include interest accrued since your last payment. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the Loan Balance Calculator?",
        answer: "The Loan Balance Calculator works forward from the original loan amount and term. This one works backward from what you pay now and how many payments are left — useful when you don't have the original paperwork.",
      },
    ],
  },
  {
    slug: "loan-maturity-calculator",
    title: "Loan Maturity Calculator",
    description: "See how many payments and years are left until your loan matures, how far through the term you are, and the payments still scheduled.",
    metaTitle: "Loan Maturity Calculator — Time Left on a Loan",
    metaDescription: "Free loan maturity calculator. See the payments and years left until your loan matures, the share of the term elapsed, and payments still due.",
    calcInputs: [
      numberField("termMonths", "Original Term (Months)", { default: 60, min: 1, max: 480, step: 1 }),
      numberField("paymentsMade", "Payments Made So Far", { default: 22, min: 0, max: 480, step: 1 }),
      currencyField("monthlyPayment", "Monthly Payment", { default: 450, max: 1000000, step: 5 }),
    ],
    calcResult: { label: "Payments Remaining", format: "number" },
    calcResults: [
      { key: "paymentsRemaining", label: "Payments Until Maturity", format: "number", highlight: true },
      { key: "yearsToMaturity", label: "Years Until Maturity", format: "number" },
      { key: "percentOfTermElapsed", label: "Share of Term Completed", format: "percentage" },
      { key: "remainingScheduledPayments", label: "Scheduled Payments Still Due", format: "currency" },
    ],
    instructions:
      "Enter the loan's original term in months, how many payments you've made, and your monthly payment. The " +
      "tool shows how long until the loan matures (the date the final payment is due), how far through the term " +
      "you are, and the total of the payments still scheduled. Count forward the number of months shown from " +
      "your most recent payment to find your maturity month.",
    examples:
      "Example: 22 payments into a 60-month loan, you have 38 payments (about 3.17 years) left, you're 36.67% of " +
      "the way through, and $17,100 of $450 payments is still scheduled.",
    assumptions:
      "Assumes regular monthly payments with none missed or made early. Extra payments can bring the actual payoff " +
      "date forward, but the contractual maturity date stays the same unless the loan is modified. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between maturity and payoff?",
        answer: "Maturity is the date the final scheduled payment is due under the contract. Payoff is when you actually clear the balance, which can be earlier if you pay extra.",
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
