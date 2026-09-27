// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Loan Calculators" sub-batch C (Payoff, Refinance & Loan
// Structures). Part of the Loan Calculators tool-list build-out — see
// create-loan-core-calculators.ts for the full batch context and the
// skipped duplicate.
//
// See src/lib/calc-engine-loan-payoff-refinance.ts for the math and for
// notes on how the payoff and refinance clusters are deliberately
// differentiated from each other and from the existing mortgage tools.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-payoff-refinance-calculators.ts
// or
//   npm run db:create-loan-payoff-refinance-calculators

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
    slug: "loan-payoff-calculator",
    title: "Loan Payoff Calculator",
    description: "Find the monthly payment needed to pay off a loan by your target date, and how much interest that saves.",
    metaTitle: "Loan Payoff Calculator — Pay Off by a Target Date",
    metaDescription: "Free loan payoff calculator. Choose when you want to be debt-free to see the monthly payment needed and the interest you'd save.",
    calcInputs: [
      currencyField("balance", "Current Loan Balance", { default: 18000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 8, max: 40, step: 0.05 }),
      currencyField("currentPayment", "Current Monthly Payment", { default: 400, max: 1000000, step: 25 }),
      numberField("targetMonths", "Pay It Off In (Months)", { default: 24, min: 1, max: 480, step: 1 }),
    ],
    calcResult: { label: "Required Monthly Payment", format: "currency" },
    calcResults: [
      { key: "requiredPayment", label: "Monthly Payment Needed", format: "currency", highlight: true },
      { key: "extraPerMonth", label: "Extra Compared With Your Current Payment", format: "currency" },
      { key: "interestWithCurrentPayment", label: "Interest at Your Current Payment", format: "currency" },
      { key: "interestWithTargetPayment", label: "Interest at the New Payment", format: "currency" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "Enter what you owe, the interest rate, your current monthly payment, and how many months from now you want " +
      "the loan gone. The tool finds the payment that clears it on that date and compares the interest with " +
      "keeping your current payment. If your current payment doesn't cover the monthly interest, its interest " +
      "and savings figures show 0.",
    examples:
      "Example: to clear an $18,000 balance at 8% in 24 months, you'd pay $814.09 a month — $414.09 more than your " +
      "current $400. Interest falls from $3,472.04 to $1,538.19, saving $1,933.85.",
    assumptions:
      "Assumes a fixed rate charged monthly and no prepayment penalty. Check that your lender applies extra money " +
      "to principal rather than to future payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the Extra Loan Payment Calculator?",
        answer: "This tool starts from a payoff date and tells you the payment needed. The Extra Loan Payment Calculator starts from a set extra amount and tells you how much sooner you'll finish.",
      },
    ],
  },
  {
    slug: "extra-loan-payment-calculator",
    title: "Extra Loan Payment Calculator",
    description: "See how many months and how much interest you save by adding a fixed extra amount to your loan payment every month.",
    metaTitle: "Extra Loan Payment Calculator — Free & Instant",
    metaDescription: "Free extra loan payment calculator. See how much time and interest you save by adding an extra amount to your monthly loan payment.",
    calcInputs: [
      currencyField("balance", "Current Loan Balance", { default: 20000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 7, max: 40, step: 0.05 }),
      currencyField("monthlyPayment", "Regular Monthly Payment", { default: 400, max: 1000000, step: 25 }),
      currencyField("extraMonthly", "Extra Payment Each Month", { default: 100, max: 1000000, step: 25 }),
    ],
    calcResult: { label: "Interest Saved", format: "currency" },
    calcResults: [
      { key: "monthsWithoutExtra", label: "Months Left Without Extra", format: "number" },
      { key: "monthsWithExtra", label: "Months Left With Extra", format: "number" },
      { key: "monthsSaved", label: "Months Saved", format: "number" },
      { key: "interestSaved", label: "Interest Saved", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your current balance, interest rate, regular monthly payment, and the extra amount you'd add each " +
      "month. The tool pays the loan down both ways and shows how many months sooner you'd finish and how much " +
      "interest you'd avoid. If your regular payment doesn't cover the interest, the results show 0.",
    examples:
      "Example: a $20,000 balance at 7% with a $400 payment takes 60 months to clear. Adding $100 a month cuts it " +
      "to 46 months — 14 months sooner — and saves $874.11 in interest.",
    assumptions:
      "Assumes the extra goes entirely to principal each month and there's no prepayment penalty. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is it better to pay extra or invest the money?",
        answer: "Paying extra earns a guaranteed return equal to the loan's rate. If the rate is high (such as a personal loan or card), paying it down usually wins; if it's low, investing may come out ahead, with more risk.",
      },
    ],
  },
  {
    slug: "early-loan-payoff-calculator",
    title: "Early Loan Payoff Calculator",
    description: "Find out whether paying off your whole loan today saves money once any prepayment penalty is taken into account.",
    metaTitle: "Early Loan Payoff Calculator — With Penalty",
    metaDescription: "Free early loan payoff calculator. See the cost of paying off your loan today, including any prepayment penalty, against the interest you'd avoid.",
    calcInputs: [
      currencyField("balance", "Current Loan Balance", { default: 12000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 9, max: 40, step: 0.05 }),
      currencyField("monthlyPayment", "Current Monthly Payment", { default: 380, max: 1000000, step: 25 }),
      percentField("prepaymentPenaltyPercent", "Prepayment Penalty (% of Balance)", { default: 2, max: 10, step: 0.25 }),
    ],
    calcResult: { label: "Net Savings", format: "currency" },
    calcResults: [
      { key: "payoffCostToday", label: "Cost to Pay Off Today", format: "currency" },
      { key: "penaltyAmount", label: "Prepayment Penalty", format: "currency" },
      { key: "interestAvoided", label: "Future Interest Avoided", format: "currency" },
      { key: "netSavings", label: "Net Savings From Paying Off Now", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your balance, interest rate, current monthly payment, and the prepayment penalty in your loan " +
      "agreement (0 if there isn't one). The tool compares the penalty with all the interest you'd otherwise pay " +
      "by keeping the loan to the end. A positive net saving means paying off early comes out ahead. If your " +
      "payment doesn't cover the interest, the interest and savings figures show 0.",
    examples:
      "Example: paying off a $12,000 balance at 9% ($380 a month) today costs $12,240 with a 2% penalty. It avoids " +
      "$1,746.21 of future interest, for a net saving of $1,506.21.",
    assumptions:
      "Treats the penalty as a flat % of the balance. Some penalties are a set number of months' interest or " +
      "shrink over time — check your agreement. Doesn't account for what the cash could earn elsewhere. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When doesn't early payoff make sense?",
        answer: "When the penalty is larger than the interest left (common near the end of a loan), or when using your savings would leave you without an emergency fund.",
      },
    ],
  },
  {
    slug: "loan-prepayment-calculator",
    title: "Loan Prepayment Calculator",
    description: "Make a one-time partial prepayment and compare the two options: keep the payment and finish sooner, or keep the end date and pay less each month.",
    metaTitle: "Loan Prepayment Calculator — Reduce Term or EMI",
    metaDescription: "Free loan prepayment calculator. See whether a lump-sum prepayment saves more by shortening your term or by lowering your monthly payment.",
    calcInputs: [
      currencyField("balance", "Current Loan Balance", { default: 40000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 9, max: 40, step: 0.05 }),
      numberField("remainingMonths", "Months Remaining", { default: 48, min: 1, max: 480, step: 1 }),
      currencyField("prepaymentAmount", "One-Time Prepayment", { default: 8000, max: 10000000, step: 500 }),
    ],
    calcResult: { label: "Interest Saved (Reduce Term)", format: "currency" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "newTermMonthsIfReduceTerm", label: "Option 1: Keep Payment — Months Left", format: "number" },
      { key: "interestSavedIfReduceTerm", label: "Option 1: Keep Payment — Interest Saved", format: "currency", highlight: true },
      { key: "newPaymentIfReducePayment", label: "Option 2: Keep End Date — New Payment", format: "currency" },
      { key: "interestSavedIfReducePayment", label: "Option 2: Keep End Date — Interest Saved", format: "currency" },
    ],
    instructions:
      "Enter your balance, interest rate, months remaining, and the lump sum you want to prepay (for example, a " +
      "bonus). Most lenders let you use a prepayment in one of two ways: keep paying the same amount and finish " +
      "early, or keep the same end date with a lower payment. The tool shows both side by side.",
    examples:
      "Example: prepaying $8,000 on a $40,000 balance at 9% with 48 months left ($995.40 a month): keeping the " +
      "payment finishes in 37 months and saves $3,024.80 in interest; keeping the end date lowers the payment to " +
      "$796.32 and saves $1,555.86.",
    assumptions:
      "Assumes the prepayment goes fully to principal, with no prepayment charge. Keeping the payment always " +
      "saves more interest; lowering the payment frees up monthly cash. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which option should I choose?",
        answer: "If the monthly payment is comfortable, keeping it (and shortening the term) saves the most interest. If money is tight each month, lowering the payment gives you breathing room while still saving some interest.",
      },
    ],
  },
  {
    slug: "loan-refinance-calculator",
    title: "Loan Refinance Calculator",
    description: "See how your monthly payment changes if you refinance your loan at a new rate and term.",
    metaTitle: "Loan Refinance Calculator — New Monthly Payment",
    metaDescription: "Free loan refinance calculator. Compare your current loan payment with the payment at a new rate and term to see your monthly savings.",
    calcInputs: [
      currencyField("currentBalance", "Current Loan Balance", { default: 20000, max: 10000000, step: 500 }),
      percentField("currentRatePercent", "Current Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("remainingMonths", "Months Left on Current Loan", { default: 48, min: 1, max: 480, step: 1 }),
      percentField("newRatePercent", "New Interest Rate", { default: 7, max: 40, step: 0.05 }),
      numberField("newTermMonths", "New Loan Term (Months)", { default: 48, min: 1, max: 480, step: 1 }),
    ],
    calcResult: { label: "Monthly Savings", format: "currency" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "newPayment", label: "New Monthly Payment", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency", highlight: true },
      { key: "newTotalInterest", label: "Total Interest on the New Loan", format: "currency" },
    ],
    instructions:
      "Enter your current balance, rate, and months left, then the new rate and term you've been offered. The " +
      "tool compares the two monthly payments. To see the full lifetime cost including fees — and whether a " +
      "longer term wipes out the savings — use the Loan Refinance Savings Calculator.",
    examples:
      "Example: refinancing a $20,000 balance from 11% to 7%, keeping 48 months, lowers the payment from $516.91 " +
      "to $478.92 — $37.99 a month — with $2,988.39 of interest on the new loan.",
    assumptions:
      "Assumes the new loan exactly pays off the current balance, with fees paid separately. The current payment " +
      "is recalculated from your balance, rate, and months left, so it may differ slightly from your statement. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When is refinancing worth it?",
        answer: "Usually when you can get a meaningfully lower rate without stretching the term much, and the fees are small enough to recover quickly.",
      },
    ],
  },
  {
    slug: "loan-refinance-savings-calculator",
    title: "Loan Refinance Savings Calculator",
    description: "Compare the full remaining cost of your current loan with the lifetime cost of a refinance, including fees and any longer term.",
    metaTitle: "Loan Refinance Savings Calculator — Lifetime Cost",
    metaDescription: "Free loan refinance savings calculator. See if refinancing really saves money over the life of the loan once fees and a longer term are counted.",
    calcInputs: [
      currencyField("currentBalance", "Current Loan Balance", { default: 20000, max: 10000000, step: 500 }),
      percentField("currentRatePercent", "Current Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("remainingMonths", "Months Left on Current Loan", { default: 36, min: 1, max: 480, step: 1 }),
      percentField("newRatePercent", "New Interest Rate", { default: 8, max: 40, step: 0.05 }),
      numberField("newTermMonths", "New Loan Term (Months)", { default: 60, min: 1, max: 480, step: 1 }),
      currencyField("refinanceFees", "Refinance Fees", { default: 400, max: 100000, step: 25 }),
      {
        key: "feesRolledIn", label: "How Fees Are Paid", type: "dropdown", required: true, default: 0,
        options: [
          { label: "Paid Upfront", value: 0 },
          { label: "Added to the New Loan", value: 1 },
        ],
      },
    ],
    calcResult: { label: "Net Lifetime Savings", format: "currency" },
    calcResults: [
      { key: "remainingCostCurrent", label: "Remaining Payments — Current Loan", format: "currency" },
      { key: "totalCostNew", label: "Total Cost — New Loan (Incl. Fees)", format: "currency" },
      { key: "netLifetimeSavings", label: "Net Lifetime Savings (− Means It Costs More)", format: "currency", highlight: true },
      { key: "monthlyCashFlowSavings", label: "Monthly Payment Reduction", format: "currency" },
    ],
    instructions:
      "Enter your current loan's balance, rate, and months left, then the new rate, new term, and refinance fees, " +
      "and whether you'd pay the fees upfront or add them to the loan. The tool adds up everything you'd pay " +
      "under each option. A negative saving means the refinance costs more overall, even if the monthly payment " +
      "is lower.",
    examples:
      "Example: refinancing $20,000 from 11% with 36 months left into a 60-month loan at 8% with $400 of fees cuts " +
      "the payment by $249.25 a month — but you'd pay $24,731.67 in total versus $23,571.88, costing $1,159.80 " +
      "more over the life of the loan.",
    assumptions:
      "Compares total cash paid, ignoring what the monthly savings could earn if invested. Assumes no prepayment " +
      "penalty on the current loan. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can a lower rate cost more?",
        answer: "By stretching the term. Paying interest for 60 months instead of 36 can outweigh a lower rate, especially once fees are added. Keeping the new term close to your remaining term avoids this.",
      },
    ],
  },
  {
    slug: "loan-break-even-calculator",
    title: "Loan Break-Even Calculator",
    description: "Compare a lower-rate loan with an upfront fee against a higher-rate loan with little or no fee, and find the month the fee pays for itself.",
    metaTitle: "Loan Break-Even Calculator — Fee vs Lower Rate",
    metaDescription: "Free loan break-even calculator. Find when paying a fee for a lower rate pays off, and which offer is cheaper for as long as you'll keep the loan.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 20000, max: 10000000, step: 500 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 1, max: 480, step: 1 }),
      percentField("offerARatePercent", "Offer A — Interest Rate", { default: 9, max: 40, step: 0.05 }),
      currencyField("offerAFee", "Offer A — Upfront Fee", { default: 0, max: 100000, step: 25 }),
      percentField("offerBRatePercent", "Offer B — Interest Rate", { default: 7.5, max: 40, step: 0.05 }),
      currencyField("offerBFee", "Offer B — Upfront Fee", { default: 600, max: 100000, step: 25 }),
      numberField("monthsYouKeepLoan", "Months You Expect to Keep the Loan", { default: 60, min: 1, max: 480, step: 1 }),
    ],
    calcResult: { label: "Break-Even Month", format: "number" },
    calcResults: [
      { key: "paymentA", label: "Offer A — Monthly Payment", format: "currency" },
      { key: "paymentB", label: "Offer B — Monthly Payment", format: "currency" },
      { key: "breakEvenMonth", label: "Month Offer B Becomes Cheaper (0 = Never)", format: "number", highlight: true },
      { key: "savingsWithBAtYourHorizon", label: "Savings With Offer B Over Your Time Frame", format: "currency" },
    ],
    instructions:
      "Enter the loan amount and term, then each offer's rate and upfront fee — typically one has a lower rate " +
      "but a fee, the other a higher rate and no fee. Add how long you expect to keep the loan before paying it " +
      "off or selling what it paid for. The tool finds the month the lower rate has saved enough to cover its " +
      "fee, counting what you'd still owe if you paid off early.",
    examples:
      "Example: on $20,000 over 60 months, Offer A at 9% with no fee costs $415.17 a month; Offer B at 7.5% with a " +
      "$600 fee costs $400.76. Offer B pulls ahead in month 29, and over the full 60 months it saves $264.49.",
    assumptions:
      "The cost of each offer at any month = its fee + payments made + balance still owed. A negative saving " +
      "means Offer A is cheaper over your time frame. Refinancing an existing loan? Use the Loan Refinance " +
      "Savings Calculator instead (or the Refinance Break-Even Calculator for a mortgage). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does paying off early matter?",
        answer: "A fee is paid on day one, but the lower rate saves money a little each month. If you repay the loan before the break-even month, you've paid the fee without getting enough of the savings back.",
      },
    ],
  },
  {
    slug: "balloon-loan-calculator",
    title: "Balloon Loan Calculator",
    description: "Calculate the monthly payment on a loan with a large final balloon payment, set as a percentage of the loan.",
    metaTitle: "Balloon Loan Calculator — Payment & Final Balloon",
    metaDescription: "Free balloon loan calculator. Set the final balloon as a % of the loan to see your lower monthly payment, the balloon due, and total interest.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 30000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 7, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 1, max: 480, step: 1 }),
      percentField("balloonPercent", "Balloon Payment (% of Loan)", { default: 30, max: 90, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "balloonPayment", label: "Balloon Due at the End", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "paymentWithoutBalloon", label: "Payment Without a Balloon", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, interest rate, term, and the size of the final balloon payment as a percentage of " +
      "the loan (car finance often calls this the residual or guaranteed future value). The tool shows the lower " +
      "monthly payment, the lump sum due at the end, and how the payment compares with a normal loan.",
    examples:
      "Example: a $30,000 loan at 7% over 48 months with a 30% balloon costs $555.37 a month, then a $9,000 " +
      "balloon at the end — versus $718.39 a month with no balloon. Total interest is $5,657.81.",
    assumptions:
      "The balloon is a fixed amount due with the final month. Because less of the loan is repaid along the way, " +
      "total interest is higher than on a normal loan. For home loans, see the Balloon Mortgage Calculator. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens if I can't pay the balloon?",
        answer: "You'd normally need to refinance it, sell the asset (for example, trade in the car), or negotiate with the lender. Plan how you'll cover it before signing.",
      },
    ],
  },
  {
    slug: "interest-only-loan-calculator",
    title: "Interest-Only Loan Calculator",
    description: "Calculate payments on a loan with an interest-only period followed by full repayments, and the jump when repayments start.",
    metaTitle: "Interest-Only Loan Calculator — Free & Instant",
    metaDescription: "Free interest-only loan calculator. See the interest-only payment, the higher payment once repayments begin, and the extra interest it costs.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 100000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 8, max: 40, step: 0.05 }),
      numberField("interestOnlyMonths", "Interest-Only Period (Months)", { default: 24, min: 0, max: 240, step: 1 }),
      numberField("totalTermMonths", "Total Loan Term (Months)", { default: 120, min: 2, max: 480, step: 1 }),
    ],
    calcResult: { label: "Payment After Interest-Only Period", format: "currency" },
    calcResults: [
      { key: "interestOnlyPayment", label: "Interest-Only Payment", format: "currency" },
      { key: "amortizingPaymentAfter", label: "Payment Once Repayments Begin", format: "currency", highlight: true },
      { key: "paymentIncrease", label: "Payment Increase", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "extraInterestVsFullyAmortizing", label: "Extra Interest vs a Normal Loan", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, rate, the length of the interest-only period, and the total term. During the " +
      "interest-only period you pay just the interest and the balance doesn't fall; afterwards the full balance " +
      "is repaid over the remaining months, so the payment jumps. The tool shows both payments and the extra " +
      "interest compared with repaying from day one.",
    examples:
      "Example: $100,000 at 8% with 24 interest-only months in a 120-month term costs $666.67 a month at first, " +
      "then $1,413.67 — a $747 jump. Total interest is $51,712.12, $6,119.01 more than a normal 120-month loan.",
    assumptions:
      "Assumes a fixed rate and that the interest-only period is shorter than the total term. For home loans, see " +
      "the Interest-Only Mortgage Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who uses interest-only loans?",
        answer: "Mainly businesses, property investors, and construction or bridge borrowers who expect income or a sale later. They keep early payments low but cost more overall and carry payment-shock risk.",
      },
    ],
  },
  {
    slug: "loan-comparison-calculator",
    title: "Loan Comparison Calculator",
    description: "Compare two loan offers side by side — each with its own rate, term, and fees — on monthly payment and total cost.",
    metaTitle: "Loan Comparison Calculator — Compare Two Loans",
    metaDescription: "Free loan comparison calculator. Compare two loan offers with different rates, terms, and fees to see which has the lower payment and total cost.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 20000, max: 10000000, step: 500 }),
      percentField("offerARatePercent", "Loan A — Interest Rate", { default: 8.5, max: 40, step: 0.05 }),
      numberField("offerATermMonths", "Loan A — Term (Months)", { default: 60, min: 1, max: 480, step: 1 }),
      currencyField("offerAFees", "Loan A — Fees", { default: 0, max: 100000, step: 25 }),
      percentField("offerBRatePercent", "Loan B — Interest Rate", { default: 7.9, max: 40, step: 0.05 }),
      numberField("offerBTermMonths", "Loan B — Term (Months)", { default: 72, min: 1, max: 480, step: 1 }),
      currencyField("offerBFees", "Loan B — Fees", { default: 400, max: 100000, step: 25 }),
    ],
    calcResult: { label: "Cost Difference (A − B)", format: "currency" },
    calcResults: [
      { key: "paymentA", label: "Loan A — Monthly Payment", format: "currency" },
      { key: "paymentB", label: "Loan B — Monthly Payment", format: "currency" },
      { key: "totalCostA", label: "Loan A — Total Interest + Fees", format: "currency" },
      { key: "totalCostB", label: "Loan B — Total Interest + Fees", format: "currency" },
      { key: "costDifference", label: "Cost Difference (+ B Cheaper, − A Cheaper)", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the amount you need, then each offer's interest rate, term, and total fees. The tool shows each " +
      "monthly payment and the total cost of borrowing (interest plus fees). A positive difference means Loan B is " +
      "cheaper overall; a negative one means Loan A is.",
    examples:
      "Example: for $20,000, Loan A at 8.5% over 60 months with no fees costs $410.33 a month and $4,619.84 in " +
      "total. Loan B at 7.9% over 72 months with $400 of fees costs only $349.69 a month but $5,577.61 in total — " +
      "Loan A is $957.78 cheaper despite the higher rate.",
    assumptions:
      "Fees are added to the cost, not financed. Compares total cash cost only — not flexibility, penalties, or " +
      "what lower payments could earn elsewhere. For a fee-versus-rate break-even over time, use the Loan " +
      "Break-Even Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I pick the lowest payment or the lowest total cost?",
        answer: "The lowest total cost saves the most money; the lowest payment is easier on your monthly budget. A longer term usually lowers the payment but raises the total cost.",
      },
    ],
  },
  {
    slug: "fixed-vs-variable-rate-loan-calculator",
    title: "Fixed vs Variable Rate Loan Calculator",
    description: "Compare a fixed-rate loan with a variable-rate loan whose rate rises or falls each year up to a cap.",
    metaTitle: "Fixed vs Variable Rate Loan Calculator",
    metaDescription: "Free fixed vs variable rate loan calculator. Model a variable rate that changes each year up to a cap and compare payments and interest with a fixed rate.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 50000, max: 10000000, step: 500 }),
      numberField("termYears", "Loan Term (Years)", { default: 5, min: 1, max: 30, step: 1 }),
      percentField("fixedRatePercent", "Fixed Rate", { default: 8, max: 40, step: 0.05 }),
      percentField("variableStartRatePercent", "Variable Rate — Starting Rate", { default: 6.5, max: 40, step: 0.05 }),
      percentField("yearlyRateChangePercent", "Variable Rate — Change Each Year", { default: 0.75, min: -5, max: 5, step: 0.05 }),
      percentField("rateCapPercent", "Variable Rate — Cap", { default: 12, max: 40, step: 0.25 }),
    ],
    calcResult: { label: "Interest Difference (Fixed − Variable)", format: "currency" },
    calcResults: [
      { key: "fixedPayment", label: "Fixed — Monthly Payment", format: "currency" },
      { key: "fixedTotalInterest", label: "Fixed — Total Interest", format: "currency" },
      { key: "variableFirstPayment", label: "Variable — First-Year Payment", format: "currency" },
      { key: "variableFinalYearPayment", label: "Variable — Final-Year Payment", format: "currency" },
      { key: "variableTotalInterest", label: "Variable — Total Interest", format: "currency" },
      { key: "fixedMinusVariableInterest", label: "Interest Difference (+ Variable Cheaper, − Fixed Cheaper)", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan amount and term, the fixed rate on offer, and a scenario for the variable rate: its starting " +
      "rate, how much you think it will change each year (use a negative number for falling rates), and its cap. " +
      "The tool recalculates the variable payment each year and compares total interest with the fixed loan. Try " +
      "several scenarios — nobody knows future rates.",
    examples:
      "Example: $50,000 over 5 years at a fixed 8% costs $1,013.82 a month and $10,829.18 in interest. A variable " +
      "loan starting at 6.5% and rising 0.75% a year starts at $978.31, reaches $1,015.32 in year 5, and costs " +
      "$10,015 in interest — $814.18 less in this scenario.",
    assumptions:
      "The variable rate changes once a year by the same step, never below 0% or above the cap, and the payment " +
      "is recalculated over the remaining term each time. Real variable rates follow a benchmark and change " +
      "unpredictably. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why take a variable rate at all?",
        answer: "It usually starts lower than a fixed rate, and if rates stay flat or fall you'll pay less. The trade-off is uncertainty: if rates rise quickly, you could pay more than the fixed rate would have cost.",
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
