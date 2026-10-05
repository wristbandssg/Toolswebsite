// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the Loan Calculators expansion 2, sub-batch 8 (Line of Credit & Credit Builder Loans),
// filed under Finance Calculators > Credit & Debt Calculators. See src/lib/calc-engine-credit-line-builder.ts for
// the math and src/lib/calc-engine-loan-life-events.ts for the full batch
// context.
//
// HOW TO RUN
//   npx tsx prisma/create-credit-line-builder-calculators.ts
// or
//   npm run db:create-credit-line-builder-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY = { name: "Credit & Debt Calculators", slug: "credit-debt-calculators" };

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
    slug: "line-of-credit-calculator",
    title: "Line of Credit Calculator",
    description: "See the interest-only payment on a line of credit during the draw period, the higher payment once repayment starts, and the total interest.",
    metaTitle: "Line of Credit Calculator — Draw & Repayment Payments",
    metaDescription: "Free line of credit calculator. See interest-only payments in the draw period, the repayment payment, the jump between them, and total interest.",
    calcInputs: [
      currencyField("creditLimit", "Credit Limit", { default: 25000, max: 10000000, step: 500 }),
      currencyField("balance", "Amount Drawn (Balance)", { default: 15000, max: 10000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9.5, max: 36, step: 0.05 }),
      numberField("drawYears", "Interest-Only Draw Period (Years)", { default: 5, min: 0, max: 15, step: 1 }),
      numberField("repayYears", "Repayment Period (Years)", { default: 10, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "Payment Jump at Repayment", format: "currency" },
    calcResults: [
      { key: "availableCredit", label: "Credit Still Available", format: "currency" },
      { key: "interestOnlyPayment", label: "Interest-Only Payment (Draw Period)", format: "currency" },
      { key: "repaymentPeriodPayment", label: "Repayment Period Payment", format: "currency" },
      { key: "paymentJump", label: "Payment Jump at Repayment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest (Both Periods)", format: "currency" },
    ],
    instructions:
      "A line of credit — personal, home equity (HELOC), or business — lets you borrow up to a limit and pay interest " +
      "only on what you use. Many have a draw period with interest-only payments, then a repayment period in which " +
      "principal must be repaid. Enter the limit, your balance, the rate, and the length of each period.",
    examples:
      "Example: $15,000 drawn on a $25,000 line at 9.5% costs $118.75 a month interest-only for 5 years. When repayment " +
      "starts, the payment over 10 years is $194.10 — $75.35 more — and total interest over both periods is $15,416.56.",
    assumptions:
      "Assumes the balance and rate stay the same. Most lines of credit have variable rates that move with the prime " +
      "rate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a personal line of credit different from a HELOC?",
        answer: "A personal line is usually unsecured with a higher rate and smaller limit; a HELOC is secured by your home, so it's cheaper but puts the home at risk. The payment maths is the same.",
      },
    ],
  },
  {
    slug: "line-of-credit-payment-calculator",
    title: "Line of Credit Payment Calculator",
    description: "Compare the minimum payment on a line of credit under the three common rules: interest only, a percentage of the balance, or interest plus 1%.",
    metaTitle: "Line of Credit Payment Calculator — Minimum Payments",
    metaDescription: "Free line of credit payment calculator. Compare interest-only, percentage-of-balance and interest-plus-1% minimum payments.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 10000, max: 10000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10, max: 36, step: 0.05 }),
      percentField("minPercent", "Minimum Payment (% of Balance)", { default: 2, max: 10, step: 0.25 }),
      currencyField("minFloor", "Minimum Payment Floor", { default: 25, max: 1000, step: 5 }),
    ],
    calcResult: { label: "Payment at % of Balance", format: "currency" },
    calcResults: [
      { key: "interestOnlyPayment", label: "Interest-Only Payment", format: "currency" },
      { key: "percentOfBalancePayment", label: "Payment at % of Balance", format: "currency", highlight: true },
      { key: "interestPlusOnePercentPayment", label: "Interest + 1% of Balance", format: "currency" },
      { key: "principalPaidByPercentRule", label: "Principal Repaid by the % Rule", format: "currency" },
    ],
    instructions:
      "Your line of credit agreement says how the minimum payment is worked out. Enter the balance, rate, and the " +
      "percentage and dollar floor from your agreement. The tool shows all three common rules so you can see how much " +
      "of the payment actually reduces what you owe.",
    examples:
      "Example: on a $10,000 balance at 10%, interest-only is $83.33 a month, 2% of the balance is $200 (repaying $116.67 " +
      "of principal), and interest plus 1% is $183.33.",
    assumptions:
      "Interest is estimated monthly; lenders usually charge on the average daily balance. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does paying only interest keep me in debt?",
        answer: "Because none of it reduces the balance — you'd pay the same interest every month forever. Paying even a little more each month starts to bring the balance down.",
      },
    ],
  },
  {
    slug: "line-of-credit-payoff-calculator",
    title: "Line of Credit Payoff Calculator",
    description: "See how long it takes to pay off a line of credit when you keep drawing on it each month, and how much sooner — and cheaper — it is if you stop.",
    metaTitle: "Line of Credit Payoff Calculator — With New Draws",
    metaDescription: "Free line of credit payoff calculator. See months to payoff and interest while still drawing each month, and the savings from stopping.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 12000, max: 10000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 36, step: 0.05 }),
      currencyField("monthlyPayment", "Monthly Payment", { default: 400, max: 100000, step: 10 }),
      currencyField("monthlyNewDraws", "New Draws Each Month", { default: 100, max: 100000, step: 10, required: false }),
    ],
    calcResult: { label: "Months to Pay Off", format: "number", unit: "months" },
    calcResults: [
      { key: "monthsToPayoff", label: "Months to Pay Off", format: "number", unit: "months", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "monthsIfYouStopDrawing", label: "Months If You Stop Drawing", format: "number", unit: "months" },
      { key: "interestSavedByStopping", label: "Interest Saved by Stopping", format: "currency" },
    ],
    instructions:
      "Enter your balance, rate, monthly payment, and how much you still draw each month on average. Because a line " +
      "of credit is revolving, new draws add to the balance as you pay it down. If the payment doesn't cover the " +
      "interest plus new draws, the balance never falls and the tool shows 0.",
    examples:
      "Example: $12,000 at 11% paid at $400 a month while drawing $100 a month takes 51 months and $3,016.94 of interest. " +
      "Stopping the draws clears it in 36 months and saves $919.64.",
    assumptions:
      "Assumes a fixed rate and the same draws every month. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I close the line once it's paid off?",
        answer: "Keeping it open with a zero balance can help your credit utilisation and gives you a safety net, but some lines charge annual fees — and an open line can tempt you to borrow again.",
      },
    ],
  },
  {
    slug: "line-of-credit-interest-calculator",
    title: "Line of Credit Interest Calculator",
    description: "Work out one billing cycle's interest on a line of credit from the average daily balance, with a draw and a payment made part-way through the cycle.",
    metaTitle: "Line of Credit Interest Calculator — Daily Balance",
    metaDescription: "Free line of credit interest calculator. Find the average daily balance and the interest for a billing cycle with a draw and a payment.",
    calcInputs: [
      currencyField("startBalance", "Balance at the Start of the Cycle", { default: 5000, max: 10000000, step: 100 }),
      currencyField("drawAmount", "New Draw", { default: 3000, max: 10000000, step: 100, required: false }),
      numberField("drawDay", "Day of the Draw", { default: 10, min: 1, max: 31, step: 1 }),
      currencyField("paymentAmount", "Payment", { default: 1000, max: 10000000, step: 50, required: false }),
      numberField("paymentDay", "Day of the Payment", { default: 20, min: 1, max: 31, step: 1 }),
      percentField("annualRatePercent", "Interest Rate (APR)", { default: 10.5, max: 36, step: 0.05 }),
      numberField("cycleDays", "Days in the Billing Cycle", { default: 30, min: 28, max: 31, step: 1 }),
    ],
    calcResult: { label: "Interest This Cycle", format: "currency" },
    calcResults: [
      { key: "averageDailyBalance", label: "Average Daily Balance", format: "currency" },
      { key: "dailyRatePercent", label: "Daily Interest Rate", format: "percentage", decimals: 4 },
      { key: "cycleInterest", label: "Interest This Cycle", format: "currency", highlight: true },
      { key: "endingBalance", label: "Balance at the End of the Cycle", format: "currency" },
    ],
    instructions:
      "Lines of credit usually charge interest on the average daily balance: the balance each day, averaged over the " +
      "billing cycle, times the daily rate (APR ÷ 365) times the days in the cycle. Enter the starting balance, a draw " +
      "and a payment with the days they happen, the APR, and the cycle length. Paying earlier in the cycle and drawing " +
      "later both lower the interest.",
    examples:
      "Example: starting at $5,000, drawing $3,000 on day 10 and paying $1,000 on day 20 of a 30-day cycle gives an " +
      "average daily balance of $6,733.33. At 10.5% APR (0.0288% a day) the cycle's interest is $58.11, ending at " +
      "$7,058.11.",
    assumptions:
      "The draw and payment count from the day they post. Some lenders compound daily, which adds a few cents. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does paying mid-cycle really save interest?",
        answer: "Yes — every day the balance is lower reduces the average daily balance, so paying as soon as you can (rather than on the due date) trims interest.",
      },
    ],
  },
  {
    slug: "line-of-credit-affordability-calculator",
    title: "Line of Credit Affordability Calculator",
    description: "Find the largest line of credit balance your monthly budget can carry — either paying interest only, or fully repaying it over a set number of years.",
    metaTitle: "Line of Credit Affordability Calculator — Free",
    metaDescription: "Free line of credit affordability calculator. See the largest balance your budget can carry interest-only or fully repay over a set term.",
    calcInputs: [
      currencyField("monthlyBudget", "Monthly Payment You Can Afford", { default: 300, max: 1000000, step: 10 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9.5, max: 36, step: 0.05 }),
      numberField("repayYears", "Years to Repay It in Full", { default: 5, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "Largest Balance Repaid in Full", format: "currency" },
    calcResults: [
      { key: "maxBalanceRepaidInTerm", label: "Largest Balance Repaid in Full", format: "currency", highlight: true },
      { key: "maxBalanceInterestOnly", label: "Largest Balance Interest-Only", format: "currency" },
      { key: "interestOnRepayableBalance", label: "Interest on That Balance", format: "currency" },
    ],
    instructions:
      "Enter what you can pay each month, the rate, and how many years you'd want to be debt-free in. The tool shows " +
      "the balance your budget can actually repay, and the much larger balance it could only cover interest on — a " +
      "reminder that interest-only payments never reduce the debt.",
    examples:
      "Example: $300 a month at 9.5% repays a balance of up to $14,284.45 over 5 years (with $3,715.55 of interest). Paying " +
      "interest only, the same $300 covers a $37,894.74 balance — but would never pay it off.",
    assumptions:
      "Variable rates can rise, which lowers both figures. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much of my credit limit should I use?",
        answer: "For your credit score, keeping balances low relative to limits (often under 30%) helps. For your budget, borrow only what you can repay on a plan.",
      },
    ],
  },
  {
    slug: "line-of-credit-comparison-calculator",
    title: "Line of Credit Comparison Calculator",
    description: "For a project paid in stages, compare drawing on a line of credit as you go with taking the full amount upfront as a lump-sum loan.",
    metaTitle: "Line of Credit vs Loan Calculator — Staged Spending",
    metaDescription: "Free calculator comparing a line of credit drawn as you go with a lump-sum loan for a project paid in stages.",
    calcInputs: [
      currencyField("amountNeeded", "Total Amount Needed", { default: 20000, max: 10000000, step: 500 }),
      numberField("drawMonths", "Months Over Which You'll Spend It", { default: 12, min: 1, max: 60, step: 1 }),
      percentField("locRatePercent", "Line of Credit Rate", { default: 9.5, max: 36, step: 0.05 }),
      currencyField("locAnnualFee", "Line of Credit Annual Fee", { default: 50, max: 10000, step: 5, required: false }),
      percentField("loanRatePercent", "Lump-Sum Loan Rate", { default: 9, max: 36, step: 0.05 }),
      numberField("repayMonths", "Months to Repay After Spending", { default: 36, min: 1, max: 360, step: 1 }),
    ],
    calcResult: { label: "Line of Credit Saves", format: "currency" },
    calcResults: [
      { key: "lineOfCreditCost", label: "Line of Credit — Interest + Fees", format: "currency" },
      { key: "lumpSumLoanCost", label: "Lump-Sum Loan — Interest", format: "currency" },
      { key: "lineOfCreditSaves", label: "Line of Credit Saves", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the total you need, how many months you'll spend it over (for example, a renovation paid in stages), the " +
      "line's rate and annual fee, the loan's rate, and how long you'll take to repay once the spending ends. With a " +
      "line you pay interest only on what you've drawn; with a loan you pay interest on the whole amount from day one. " +
      "A negative saving means the loan is cheaper.",
    examples:
      "Example: spending $20,000 over 12 months then repaying over 36, a line at 9.5% with a $50 annual fee costs " +
      "$4,292.89. A lump-sum loan at 9% costs $4,695.81 because you pay interest on all $20,000 while you spend it — the " +
      "line saves $402.92.",
    assumptions:
      "Assumes equal monthly spending and that the loan's unused money isn't earning interest meanwhile. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When is a loan better than a line of credit?",
        answer: "When you need all the money at once, want a fixed rate and payment, or the loan's rate is much lower than the line's.",
      },
    ],
  },
  {
    slug: "line-of-credit-eligibility-calculator",
    title: "Line of Credit Eligibility Calculator",
    description: "Check a line of credit application the way many lenders do: DTI using an assumed payment on the full limit, the largest limit that fits, and your credit score.",
    metaTitle: "Line of Credit Eligibility Calculator — Free",
    metaDescription: "Free line of credit eligibility calculator. Check DTI with the lender's assumed payment on the full limit and the largest limit you could get.",
    calcInputs: [
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 6000, max: 10000000, step: 100 }),
      currencyField("monthlyDebts", "Current Monthly Debt Payments", { default: 1500, max: 1000000, step: 25 }),
      currencyField("requestedLimit", "Credit Limit Requested", { default: 20000, max: 10000000, step: 500 }),
      percentField("assumedPaymentPercent", "Payment Lender Assumes (% of Limit)", { default: 3, max: 10, step: 0.25 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 43, max: 60, step: 1 }),
      numberField("creditScore", "Your Credit Score", { default: 700, min: 300, max: 850, step: 1 }),
      numberField("lenderMinScore", "Lender's Minimum Score", { default: 680, min: 300, max: 850, step: 1 }),
    ],
    calcResult: { label: "DTI With the Line", format: "percentage" },
    calcResults: [
      { key: "assumedPayment", label: "Payment the Lender Assumes", format: "currency" },
      { key: "dtiPercent", label: "DTI With the Line", format: "percentage", highlight: true },
      { key: "dtiHeadroomPercent", label: "Room Under DTI Limit", format: "percentage" },
      { key: "largestLimitUnderDti", label: "Largest Limit Under the DTI Limit", format: "currency" },
      { key: "scoreMargin", label: "Points Above Minimum Score", format: "number" },
    ],
    instructions:
      "Because you could draw the whole limit at any time, many lenders work out your DTI as if the line were fully " +
      "used, with a payment of a few percent of the limit. Enter your income and debts, the limit you want, the payment " +
      "percentage the lender assumes, its DTI limit, and your credit score.",
    examples:
      "Example: a $20,000 line with a 3% assumed payment adds $600 a month. On $6,000 of income with $1,500 of debts, DTI " +
      "is 35%, 8 points under 43%. The largest limit that fits is $36,000. A 700 score is 20 above 680.",
    assumptions:
      "Lenders use different assumptions; HELOC lenders also check home equity. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does an unused line of credit hurt my mortgage application?",
        answer: "It can — some mortgage lenders count a payment on the full limit even with a zero balance. Consider lowering unused limits before applying.",
      },
    ],
  },
  {
    slug: "credit-builder-loan-calculator",
    title: "Credit Builder Loan Calculator",
    description: "See what a credit builder loan costs: the monthly payment, what you pay in total, what you get back when the held savings are released, and the net cost per month of credit history.",
    metaTitle: "Credit Builder Loan Calculator — True Cost",
    metaDescription: "Free credit builder loan calculator. See the payment, total paid, the savings you get back, and the net cost of building credit history.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount (Held in Savings)", { default: 1000, max: 100000, step: 50 }),
      percentField("aprPercent", "APR", { default: 15.9, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 12, min: 3, max: 48, step: 3 }),
      currencyField("fees", "Fees (Admin / Setup)", { default: 9, max: 1000, step: 1, required: false }),
      percentField("savingsApyPercent", "Interest Earned on Held Savings (APY)", { default: 0.5, max: 10, step: 0.05, required: false }),
    ],
    calcResult: { label: "Net Cost", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "totalPaid", label: "Total Paid (Incl. Fees)", format: "currency" },
      { key: "amountYouGetBack", label: "Amount You Get Back", format: "currency" },
      { key: "netCost", label: "Net Cost", format: "currency", highlight: true },
      { key: "costPerMonthOfHistory", label: "Cost per Month of History", format: "currency" },
    ],
    instructions:
      "With a credit builder loan, the lender holds the loan amount in a savings account or CD while you make monthly " +
      "payments. Each on-time payment is reported to the credit bureaus, and when the loan is repaid you get the " +
      "money (and any interest it earned). Enter the amount, APR, term, fees, and the savings rate.",
    examples:
      "Example: a $1,000, 12-month builder loan at 15.9% costs $90.68 a month. With a $9 fee you pay $1,097.20 and get " +
      "back $1,005 — a net cost of $92.20, or about $7.68 for each month of payment history.",
    assumptions:
      "Late payments are reported too and can hurt your credit. Check that the lender reports to all three bureaus. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who should use a credit builder loan?",
        answer: "People with no credit history or a damaged one who can comfortably afford the payment. It doesn't give you money upfront — it's a way to build history and savings at the same time.",
      },
    ],
  },
  {
    slug: "credit-builder-loan-payment-calculator",
    title: "Credit Builder Loan Payment Calculator",
    description: "Start from what you can pay each month and find the credit builder loan size that fits, what it costs, and the savings you'll have at the end.",
    metaTitle: "Credit Builder Loan Payment Calculator — Free",
    metaDescription: "Free credit builder loan payment calculator. Turn a monthly budget into a loan size, interest cost and the savings released at the end.",
    calcInputs: [
      currencyField("monthlyBudget", "Monthly Payment You Can Afford", { default: 50, max: 10000, step: 5 }),
      percentField("aprPercent", "APR", { default: 15.9, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 12, min: 3, max: 48, step: 3 }),
    ],
    calcResult: { label: "Loan Size That Fits", format: "currency" },
    calcResults: [
      { key: "loanAmount", label: "Loan Size That Fits", format: "currency", highlight: true },
      { key: "totalPaid", label: "Total You'll Pay", format: "currency" },
      { key: "interestCost", label: "Interest Cost", format: "currency" },
      { key: "savedAtTheEnd", label: "Savings Released at the End", format: "currency" },
    ],
    instructions:
      "Enter a monthly payment you can make every month without fail, plus the APR and term. A smaller loan you never " +
      "miss builds credit better than a bigger one you struggle with — the amount matters far less than on-time " +
      "payments.",
    examples:
      "Example: $50 a month at 15.9% for 12 months supports a $551.37 loan. You'll pay $600 in total — $48.63 of interest " +
      "— and get $551.37 back at the end.",
    assumptions:
      "Ignores fees and the small interest earned on the held savings. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Where can I get a credit builder loan?",
        answer: "Credit unions, community banks, and some online lenders offer them, often in amounts from a few hundred to a couple of thousand dollars.",
      },
    ],
  },
  {
    slug: "credit-builder-loan-cost-calculator",
    title: "Credit Builder Loan Cost Calculator",
    description: "Compare the cost of building credit with a credit builder loan versus a secured credit card paid in full each month.",
    metaTitle: "Credit Builder Loan vs Secured Card Calculator",
    metaDescription: "Free calculator comparing a credit builder loan with a secured credit card: cost, cash tied up, and savings built.",
    calcInputs: [
      currencyField("loanAmount", "Credit Builder Loan Amount", { default: 1000, max: 100000, step: 50 }),
      percentField("aprPercent", "Credit Builder APR", { default: 15.9, max: 36, step: 0.05 }),
      numberField("termMonths", "Months of Credit Building", { default: 12, min: 3, max: 48, step: 3 }),
      currencyField("loanFees", "Credit Builder Fees", { default: 9, max: 1000, step: 1, required: false }),
      currencyField("cardAnnualFee", "Secured Card Annual Fee", { default: 29, max: 1000, step: 1, required: false }),
      currencyField("cardDeposit", "Secured Card Deposit", { default: 300, max: 100000, step: 50 }),
    ],
    calcResult: { label: "Secured Card Saves", format: "currency" },
    calcResults: [
      { key: "creditBuilderCost", label: "Credit Builder — Interest + Fees", format: "currency" },
      { key: "securedCardCost", label: "Secured Card — Fees (Paid in Full)", format: "currency" },
      { key: "securedCardSaves", label: "Secured Card Saves", format: "currency", highlight: true },
      { key: "cashTiedUpInCard", label: "Cash Tied Up in the Card Deposit", format: "currency" },
      { key: "savingsBuiltByLoan", label: "Savings Built by the Loan", format: "currency" },
    ],
    instructions:
      "Enter the credit builder loan's amount, APR, term, and fees, and a secured card's annual fee and deposit. A " +
      "secured card costs nothing in interest if you pay the statement in full every month, but needs a deposit " +
      "upfront; a credit builder loan needs no deposit and leaves you with savings, but charges interest. Using both " +
      "builds two types of credit.",
    examples:
      "Example: a $1,000 12-month builder loan at 15.9% with a $9 fee costs $97.20; a secured card with a $29 annual fee " +
      "costs $29 if paid in full — $68.20 less — but ties up a $300 deposit. The loan, meanwhile, builds $1,000 of " +
      "savings.",
    assumptions:
      "Assumes the card is paid in full every month; carrying a balance adds interest at the card's APR. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get my secured card deposit back?",
        answer: "Yes — when you close the card in good standing or the issuer upgrades you to an unsecured card.",
      },
    ],
  },
  {
    slug: "credit-builder-loan-payoff-calculator",
    title: "Credit Builder Loan Payoff Calculator",
    description: "See what paying off a credit builder loan early saves in interest, and how many months of payment history you'd give up by doing it.",
    metaTitle: "Credit Builder Loan Payoff Calculator — Pay Early?",
    metaDescription: "Free credit builder loan payoff calculator. See the payoff amount, interest saved by paying early, and months of credit history given up.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 1000, max: 100000, step: 50 }),
      percentField("aprPercent", "APR", { default: 15.9, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 3, max: 48, step: 3 }),
      numberField("payoffMonth", "Pay Off After This Many Payments", { default: 12, min: 0, max: 48, step: 1 }),
    ],
    calcResult: { label: "Interest Saved", format: "currency" },
    calcResults: [
      { key: "payoffAmount", label: "Payoff Amount", format: "currency" },
      { key: "interestIfKeptToTerm", label: "Interest If Kept to the End", format: "currency" },
      { key: "interestIfPaidOffEarly", label: "Interest If Paid Off Early", format: "currency" },
      { key: "interestSaved", label: "Interest Saved", format: "currency", highlight: true },
      { key: "monthsOfHistoryGivenUp", label: "Months of Payment History Given Up", format: "number" },
    ],
    instructions:
      "Enter the loan amount, APR, term, and when you'd pay it off. Paying early saves interest and releases your " +
      "savings sooner, but the account closes — so you stop adding on-time payments to your history. Some people pay " +
      "off early once they've built enough history to qualify for better credit.",
    examples:
      "Example: a $1,000, 24-month loan at 15.9% costs $173.97 of interest if kept to term. Paying it off after 12 " +
      "payments ($539.41 payoff) means $126.39 of interest — $47.58 saved — but 12 fewer months of reported payments.",
    assumptions:
      "Some lenders don't allow early payoff of credit builder loans or charge a fee. A closed account in good " +
      "standing usually stays on your report for years. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Will paying off early hurt my score?",
        answer: "Usually only slightly, if at all. The on-time history you've built stays on your report; you just stop adding to it from this account.",
      },
    ],
  },
];

async function ensureCategory() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY.slug}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, then re-run this script.`
    );
  }
  return category;
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
