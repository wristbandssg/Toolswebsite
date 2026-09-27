// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Loan Calculators" sub-batch A (Payment & Cost). Part of the Loan
// Calculators tool-list build-out: 54 tools in the source list, 1 skipped
// as a duplicate (business-loan-calculator, which already exists under
// Business Finance, since moved into Loan Calculators), 53 built across 5 sub-batches, all
// filed under Finance Calculators > Loan Calculators:
//   create-loan-core-calculators.ts (this file, 11 tools)
//   create-loan-solve-calculators.ts (10 tools)
//   create-loan-payoff-refinance-calculators.ts (11 tools)
//   create-loan-types-calculators.ts (10 tools)
//   create-loan-business-student-calculators.ts (11 tools)
//
// See src/lib/calc-engine-loan-core.ts for the math and for notes on how
// the many payment-formula tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-core-calculators.ts
// or
//   npm run db:create-loan-core-calculators

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
    slug: "loan-calculator",
    title: "Loan Calculator",
    description: "Calculate the monthly payment, total interest, and total cost of any fixed-rate loan from the amount, interest rate, and term.",
    metaTitle: "Loan Calculator — Free Monthly Payment Calculator",
    metaDescription: "Free loan calculator. Enter the loan amount, interest rate, and term in years to see your monthly payment, total interest, and total repaid.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 25000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 7.5, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 5, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalPaid", label: "Total Repaid", format: "currency" },
    ],
    instructions:
      "Enter how much you want to borrow, the annual interest rate, and the number of years to repay. The tool " +
      "works out the fixed monthly payment that pays the loan off exactly on time, and how much of what you repay " +
      "is interest. This is the general, all-purpose loan calculator; the other tools in this category cover " +
      "specific situations such as different payment frequencies, fees, or extra payments.",
    examples:
      "Example: a $25,000 loan at 7.5% over 5 years costs $500.95 a month. You'd repay $30,056.92 in total, " +
      "$5,056.92 of it interest.",
    assumptions:
      "Assumes a fixed rate, equal monthly payments, and interest charged monthly on the remaining balance. Fees, " +
      "insurance, and taxes aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is the monthly payment calculated?",
        answer: "It uses the standard amortization formula: payment = loan × r ÷ (1 − (1 + r)^−n), where r is the monthly rate (annual rate ÷ 12) and n is the number of monthly payments.",
      },
    ],
  },
  {
    slug: "loan-payment-calculator",
    title: "Loan Payment Calculator",
    description: "Calculate your loan payment for weekly, every-two-weeks, twice-monthly, monthly, quarterly, or annual repayment schedules.",
    metaTitle: "Loan Payment Calculator — Weekly to Annual",
    metaDescription: "Free loan payment calculator. Find your payment on any schedule — weekly, biweekly, semi-monthly, monthly, quarterly, or yearly — and the total interest.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 20000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 8, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 4, min: 1, max: 40, step: 1 }),
      {
        key: "paymentsPerYear", label: "Payment Frequency", type: "dropdown", required: true, default: 26,
        options: [
          { label: "Weekly (52 a year)", value: 52 },
          { label: "Every Two Weeks (26 a year)", value: 26 },
          { label: "Twice a Month (24 a year)", value: 24 },
          { label: "Monthly (12 a year)", value: 12 },
          { label: "Quarterly (4 a year)", value: 4 },
          { label: "Annually (1 a year)", value: 1 },
        ],
      },
    ],
    calcResult: { label: "Payment Per Period", format: "currency" },
    calcResults: [
      { key: "paymentPerPeriod", label: "Payment Each Period", format: "currency", highlight: true },
      { key: "numberOfPayments", label: "Number of Payments", format: "number" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalPaid", label: "Total Repaid", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, annual interest rate, and term in years, then choose how often you'll pay — for " +
      "example, every two weeks to match your paychecks. The tool shows the payment for that schedule, the number " +
      "of payments, and the total interest.",
    examples:
      "Example: $20,000 at 8% over 4 years, paid every two weeks, is 104 payments of $225.01, with $3,400.87 in " +
      "total interest.",
    assumptions:
      "Interest is charged each period at the annual rate divided by the number of payments per year. Some " +
      "lenders still charge interest monthly even if you pay more often — check how yours works. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does paying every two weeks save interest?",
        answer: "A little, because each payment reduces the balance sooner. Bigger savings come from \"biweekly\" plans that add up to 13 monthly payments a year instead of 12 — which is effectively an extra payment each year.",
      },
    ],
  },
  {
    slug: "monthly-loan-payment-calculator",
    title: "Monthly Loan Payment Calculator",
    description: "Find your total monthly loan payment — principal and interest plus any monthly add-ons — with the term entered in months.",
    metaTitle: "Monthly Loan Payment Calculator — Free & Instant",
    metaDescription: "Free monthly loan payment calculator. Enter the term in months and any monthly add-ons to see your full payment and how month 1 splits.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 9, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 1, max: 480, step: 1 }),
      currencyField("monthlyAddOns", "Monthly Add-Ons (Insurance, Fees)", { default: 25, max: 10000, step: 5 }),
    ],
    calcResult: { label: "Total Monthly Payment", format: "currency" },
    calcResults: [
      { key: "principalAndInterest", label: "Principal & Interest", format: "currency" },
      { key: "totalMonthlyPayment", label: "Total Monthly Payment", format: "currency", highlight: true },
      { key: "firstMonthInterest", label: "Month 1 — Interest", format: "currency" },
      { key: "firstMonthPrincipal", label: "Month 1 — Principal", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, annual interest rate, and the term in months (as most lenders quote it, such as 36, " +
      "48, or 60 months). Add any fixed monthly extras charged with the loan, like payment protection insurance " +
      "or an account fee. The tool shows the full amount that leaves your account each month and how the first " +
      "payment splits between interest and paying down the loan.",
    examples:
      "Example: $15,000 at 9% over 48 months is $373.28 a month in principal and interest, or $398.28 with $25 of " +
      "monthly add-ons. In month 1, $112.50 goes to interest and $260.78 to the balance.",
    assumptions:
      "Assumes a fixed rate with interest charged monthly on the remaining balance. Add-ons are a flat monthly " +
      "amount that doesn't reduce the loan. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does so much of my first payment go to interest?",
        answer: "Interest is charged on the balance you still owe, which is highest at the start. As the balance falls, the interest part of each payment shrinks and more goes to the loan itself.",
      },
    ],
  },
  {
    slug: "emi-calculator",
    title: "EMI Calculator",
    description: "Calculate the EMI (equated monthly instalment) on a loan in rupees, with total interest, total payment, and the interest share.",
    metaTitle: "EMI Calculator — Loan EMI in Rupees (₹)",
    metaDescription: "Free EMI calculator. Enter loan amount in rupees, interest rate, and tenure in months to get your EMI, total interest, and total amount payable.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { unit: "₹", default: 1000000, max: 1000000000, step: 10000 }),
      percentField("annualRatePercent", "Interest Rate (% per annum)", { default: 10.5, max: 40, step: 0.05 }),
      numberField("tenureMonths", "Loan Tenure (Months)", { default: 60, min: 1, max: 360, step: 1 }),
    ],
    calcResult: { label: "EMI", format: "currency", currency: "INR" },
    calcResults: [
      { key: "emi", label: "Monthly EMI", format: "currency", currency: "INR", highlight: true },
      { key: "totalInterest", label: "Total Interest Payable", format: "currency", currency: "INR" },
      { key: "totalPayment", label: "Total Payment (Principal + Interest)", format: "currency", currency: "INR" },
      { key: "interestSharePercent", label: "Interest as % of Total Payment", format: "percentage", currency: "INR" },
    ],
    instructions:
      "Enter the loan amount in rupees, the annual interest rate, and the tenure in months (for example, 60 " +
      "months for 5 years). The tool calculates your EMI — the fixed amount paid every month — along with the " +
      "total interest and the share of your total payment that goes to interest.",
    examples:
      "Example: a ₹10,00,000 loan at 10.5% for 60 months has an EMI of ₹21,493.90. You'd pay ₹12,89,634.02 in " +
      "total, of which ₹2,89,634.02 (22.46%) is interest.",
    assumptions:
      "Uses the standard reducing-balance EMI formula: EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1), with r = annual " +
      "rate ÷ 12. Processing fees, GST, and insurance aren't included — see the Business Loan EMI Calculator for " +
      "a version with processing fee and GST. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is EMI the same as a monthly loan payment?",
        answer: "Yes. EMI is the term used in India and some other countries; it's calculated exactly like a monthly payment on a reducing-balance loan.",
      },
      {
        question: "Is a flat rate the same as a reducing-balance rate?",
        answer: "No. A flat rate charges interest on the original amount for the whole tenure and is much more expensive than the same number on a reducing balance. This calculator uses reducing balance; see the Simple Interest Loan Calculator to compare the two.",
      },
    ],
  },
  {
    slug: "installment-loan-calculator",
    title: "Installment Loan Calculator",
    description: "Calculate the installment amount for financing a purchase — the price less your down payment, repaid in a set number of monthly installments.",
    metaTitle: "Installment Loan Calculator — Free & Instant",
    metaDescription: "Free installment loan calculator. Enter the purchase price, down payment, rate, and number of installments to see each payment and the total cost.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 3000, max: 10000000, step: 100 }),
      currencyField("downPayment", "Down Payment", { default: 500, max: 10000000, step: 50 }),
      percentField("annualRatePercent", "Interest Rate (APR)", { default: 12, max: 40, step: 0.05 }),
      numberField("numberOfInstallments", "Number of Monthly Installments", { default: 24, min: 1, max: 120, step: 1 }),
    ],
    calcResult: { label: "Installment Amount", format: "currency" },
    calcResults: [
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "installmentAmount", label: "Each Monthly Installment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCost", label: "Total Cost (Down Payment + Installments)", format: "currency" },
    ],
    instructions:
      "Enter the price of what you're buying (furniture, electronics, a repair, and so on), your down payment, the " +
      "interest rate, and how many monthly installments you'll pay. For a 0% promotion, enter 0 for the rate. The " +
      "tool shows each installment and what the item really costs you in total.",
    examples:
      "Example: a $3,000 purchase with $500 down, financed at 12% over 24 installments, costs $117.68 a month. " +
      "You'd pay $3,324.41 in total — $324.41 more than the price.",
    assumptions:
      "Assumes a fixed rate charged monthly on the remaining balance. Some store-card \"deferred interest\" " +
      "offers charge all the back interest if the balance isn't cleared by the promo end date — this tool doesn't " +
      "model that. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What counts as an installment loan?",
        answer: "Any loan repaid in a fixed number of scheduled payments — car loans, personal loans, and point-of-sale financing are all installment loans. Credit cards, by contrast, are revolving credit.",
      },
    ],
  },
  {
    slug: "loan-repayment-calculator",
    title: "Loan Repayment Calculator",
    description: "Compare the two ways a loan can be repaid — equal installments (amortizing) or equal principal (declining payments) — and the interest each costs.",
    metaTitle: "Loan Repayment Calculator — Compare Repayment Types",
    metaDescription: "Free loan repayment calculator. Compare equal monthly installments with equal-principal repayment to see payments and total interest for each.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 50000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 8, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 5, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Interest Saved With Equal Principal", format: "currency" },
    calcResults: [
      { key: "amortizingPayment", label: "Equal Installments — Monthly Payment", format: "currency" },
      { key: "amortizingTotalInterest", label: "Equal Installments — Total Interest", format: "currency" },
      { key: "equalPrincipalFirstPayment", label: "Equal Principal — First Payment", format: "currency" },
      { key: "equalPrincipalLastPayment", label: "Equal Principal — Last Payment", format: "currency" },
      { key: "equalPrincipalTotalInterest", label: "Equal Principal — Total Interest", format: "currency" },
      { key: "interestSavedWithEqualPrincipal", label: "Interest Saved With Equal Principal", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan amount, interest rate, and term. The tool compares the two common repayment structures. " +
      "Equal installments keep the same payment every month. Equal principal repays the same slice of the loan " +
      "each month plus interest on what's left, so payments start higher and fall over time — and total interest " +
      "is lower because the balance shrinks faster.",
    examples:
      "Example: $50,000 at 8% over 5 years costs $1,013.82 a month with equal installments ($10,829.18 interest). " +
      "With equal principal, payments fall from $1,166.67 to $838.89 and total interest is $10,166.67 — $662.52 " +
      "less.",
    assumptions:
      "Both structures use the same fixed rate charged monthly on the remaining balance. Equal-principal " +
      "repayment is more common for business, agricultural, and some international loans; most consumer loans " +
      "use equal installments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which repayment type should I choose?",
        answer: "Equal installments are easier to budget for. Equal principal costs less overall but needs a bigger payment at the start, so it suits borrowers who can afford more now and expect less spare cash later.",
      },
    ],
  },
  {
    slug: "amortization-calculator",
    title: "Amortization Calculator",
    description: "See how a loan pays down over time: the year-1 split between interest and principal, and the balance left at the end of each year.",
    metaTitle: "Amortization Calculator — Loan Balance by Year",
    metaDescription: "Free amortization calculator. See your monthly payment, how year 1 splits between interest and principal, and your loan balance at the end of years 1–5.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 30000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 6.5, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 5, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "year1Interest", label: "Year 1 — Interest Paid", format: "currency" },
      { key: "year1Principal", label: "Year 1 — Principal Paid", format: "currency" },
      { key: "balanceEndYear1", label: "Balance — End of Year 1", format: "currency" },
      { key: "balanceEndYear2", label: "Balance — End of Year 2", format: "currency" },
      { key: "balanceEndYear3", label: "Balance — End of Year 3", format: "currency" },
      { key: "balanceEndYear4", label: "Balance — End of Year 4", format: "currency" },
      { key: "balanceEndYear5", label: "Balance — End of Year 5", format: "currency" },
      { key: "totalInterest", label: "Total Interest Over the Loan", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, interest rate, and term. The tool shows your fixed monthly payment, how much of your " +
      "first year's payments went to interest versus the loan itself, and the balance left at the end of each of " +
      "the first five years — useful for car, personal, and business loans. For home loans, use the Mortgage " +
      "Amortization Calculator.",
    examples:
      "Example: $30,000 at 6.5% over 5 years costs $586.98 a month. In year 1, $1,795.47 goes to interest and " +
      "$5,248.34 to principal, leaving $24,751.66. The balance falls to $13,176.97 after year 3 and $0 after year " +
      "5, with $5,219.07 of interest in total.",
    assumptions:
      "Assumes a fixed rate with equal monthly payments and no extra payments. For loans shorter than five years, " +
      "later year-end balances show $0. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What does amortization mean?",
        answer: "It's the process of paying off a loan with regular payments that cover both interest and principal, so the balance reaches zero at the end of the term. Early payments are mostly interest; later payments are mostly principal.",
      },
    ],
  },
  {
    slug: "loan-interest-calculator",
    title: "Loan Interest Calculator",
    description: "Find out how much interest a loan will cost — in total, in the first month and first year, and per dollar borrowed.",
    metaTitle: "Loan Interest Calculator — Free & Instant",
    metaDescription: "Free loan interest calculator. See the total interest on a loan, the interest in the first month and year, and how much each dollar borrowed costs.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 20000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 9, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 5, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Total Interest", format: "currency" },
    calcResults: [
      { key: "totalInterest", label: "Total Interest", format: "currency", highlight: true },
      { key: "firstMonthInterest", label: "Interest in the First Month", format: "currency" },
      { key: "firstYearInterest", label: "Interest in the First Year", format: "currency" },
      { key: "interestPerDollarBorrowed", label: "Interest Per $1 Borrowed", format: "number" },
    ],
    instructions:
      "Enter the loan amount, annual interest rate, and term. Rather than focusing on the payment, this tool " +
      "focuses on the cost of borrowing: the total interest you'll pay, how much is charged in the first month " +
      "and first year, and how many cents of interest each dollar you borrow costs.",
    examples:
      "Example: a $20,000 loan at 9% over 5 years costs $4,910.03 in interest — about 25 cents for every dollar " +
      "borrowed. $150 is charged in the first month and $1,665.40 in the first year.",
    assumptions:
      "Assumes a fixed rate with equal monthly payments and interest charged monthly on the remaining balance. " +
      "Fees aren't included — use the Total Loan Cost Calculator to add them. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I pay less interest?",
        answer: "Borrow less, choose a shorter term, get a lower rate, or pay extra toward the principal whenever you can. A shorter term raises the monthly payment but usually cuts total interest sharply.",
      },
    ],
  },
  {
    slug: "total-loan-cost-calculator",
    title: "Total Loan Cost Calculator",
    description: "Add up the full cost of borrowing — interest plus origination fees, upfront charges, and monthly fees.",
    metaTitle: "Total Loan Cost Calculator — Interest + Fees",
    metaDescription: "Free total loan cost calculator. Add interest, origination fees, upfront charges, and monthly fees to see the true total cost of borrowing.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 20000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 9, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 5, min: 1, max: 40, step: 1 }),
      percentField("originationFeePercent", "Origination Fee (% of Loan)", { default: 3, max: 15, step: 0.25 }),
      currencyField("otherUpfrontFees", "Other Upfront Fees", { default: 150, max: 100000, step: 25 }),
      currencyField("monthlyFees", "Monthly Fees", { default: 0, max: 10000, step: 5 }),
    ],
    calcResult: { label: "Total Cost of Borrowing", format: "currency" },
    calcResults: [
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalFees", label: "Total Fees", format: "currency" },
      { key: "totalCostOfBorrowing", label: "Total Cost of Borrowing", format: "currency", highlight: true },
      { key: "totalAmountRepaid", label: "Total Paid (Payments + Fees)", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, interest rate, and term, then every fee the lender charges: an origination fee as a " +
      "percentage of the loan, any other one-off fees (application, documentation, and so on), and any monthly " +
      "account fee. The tool adds them all to the interest to show what the loan really costs.",
    examples:
      "Example: a $20,000 loan at 9% over 5 years has $4,910.03 in interest. Add a 3% origination fee and $150 of " +
      "other fees ($750 in total) and the full cost of borrowing is $5,660.03.",
    assumptions:
      "Fees are added to the cost, not to the loan balance, and don't earn interest. If your lender deducts the " +
      "origination fee from the money you receive, see the Loan APR Calculator for the effect on your true rate. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why compare total cost rather than the rate?",
        answer: "Two loans with the same rate can cost very different amounts once fees are included. Total cost (or APR) is the fairer way to compare offers.",
      },
    ],
  },
  {
    slug: "simple-interest-loan-calculator",
    title: "Simple Interest Loan Calculator",
    description: "Calculate a flat (add-on) simple interest loan, compare it with the same rate on a declining balance, and see its true APR.",
    metaTitle: "Simple Interest Loan Calculator — Flat vs Reducing",
    metaDescription: "Free simple interest loan calculator. Calculate flat-rate interest, compare it with a reducing-balance loan at the same rate, and see its true APR.",
    calcInputs: [
      currencyField("principal", "Loan Amount", { default: 10000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Stated Interest Rate (Annual)", { default: 6, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 1, max: 360, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment (Flat Interest)", format: "currency" },
    calcResults: [
      { key: "flatMonthlyPayment", label: "Monthly Payment (Flat Interest)", format: "currency", highlight: true },
      { key: "flatTotalInterest", label: "Total Interest — Flat", format: "currency" },
      { key: "decliningBalanceTotalInterest", label: "Total Interest — Same Rate on Declining Balance", format: "currency" },
      { key: "flatLoanTrueAprPercent", label: "True APR of the Flat-Rate Loan", format: "percentage" },
    ],
    instructions:
      "Enter the loan amount, the stated annual rate, and the term in months. With flat (add-on) simple interest, " +
      "interest is loan × rate × years, charged on the full original amount for the whole term and split evenly " +
      "across the payments. The tool compares that with charging the same rate on the balance you still owe, and " +
      "works out the flat loan's real annual rate (APR).",
    examples:
      "Example: $10,000 at a 6% flat rate over 36 months costs $1,800 in interest — $327.78 a month. The same 6% " +
      "on a declining balance would cost only $951.90. The flat loan's true APR is 11.08%.",
    assumptions:
      "Flat interest = principal × annual rate × (months ÷ 12). The true APR is the declining-balance rate that " +
      "produces the same monthly payment. Many US \"simple interest\" car and personal loans actually charge " +
      "interest on the declining balance — check your agreement. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the flat rate so much more expensive?",
        answer: "Because you keep paying interest on money you've already repaid. By the last month you owe almost nothing, but a flat-rate loan still charges interest on the full original amount — which is why its true APR is almost double the stated rate.",
      },
    ],
  },
  {
    slug: "compound-interest-loan-calculator",
    title: "Compound Interest Loan Calculator",
    description: "See how much you'll owe on a loan with no payments — such as a deferred or accruing loan — when interest compounds.",
    metaTitle: "Compound Interest Loan Calculator — Free",
    metaDescription: "Free compound interest loan calculator. See how much a deferred or unpaid loan grows when interest compounds, versus simple interest.",
    calcInputs: [
      currencyField("principal", "Amount Borrowed", { default: 10000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 8, max: 40, step: 0.05 }),
      {
        key: "compoundingFrequency", label: "Compounding Frequency", type: "dropdown", required: true, default: 12,
        options: [
          { label: "Daily", value: 365 },
          { label: "Monthly", value: 12 },
          { label: "Quarterly", value: 4 },
          { label: "Semi-Annually", value: 2 },
          { label: "Annually", value: 1 },
        ],
      },
      numberField("years", "Years With No Payments", { default: 3, min: 0.5, max: 30, step: 0.5 }),
    ],
    calcResult: { label: "Amount Owed", format: "currency" },
    calcResults: [
      { key: "amountOwed", label: "Amount Owed at the End", format: "currency", highlight: true },
      { key: "compoundInterest", label: "Interest Added (Compound)", format: "currency" },
      { key: "simpleInterestSamePeriod", label: "Interest If It Were Simple", format: "currency" },
      { key: "extraFromCompounding", label: "Extra Cost From Compounding", format: "currency" },
    ],
    instructions:
      "Enter the amount borrowed, the interest rate, how often interest compounds, and how long the loan goes " +
      "without payments (for example, a deferment period or a loan repaid in one lump sum at the end). The tool " +
      "shows how much you'll owe, and how much extra compounding adds compared with simple interest.",
    examples:
      "Example: $10,000 at 8% compounded monthly with no payments for 3 years grows to $12,702.37 — $2,702.37 of " +
      "interest, $302.37 more than simple interest would add.",
    assumptions:
      "Assumes no payments at all during the period, so unpaid interest is added to the balance and itself " +
      "charged interest. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which loans compound like this?",
        answer: "Loans in deferment or forbearance where interest is capitalized, some private student loans, payday-style rollovers, and any loan repaid as a single lump sum at maturity. Regular amortizing loans don't compound this way as long as payments are made on time.",
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
