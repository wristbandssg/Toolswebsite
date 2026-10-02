// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the Loan Calculators expansion sub-batch 2 (Medical & Dental Loans),
// filed under Finance Calculators > Loan Calculators > Personal Loan
// Calculators. See src/lib/calc-engine-loan-medical-dental.ts for the math
// and src/lib/calc-engine-loan-debt-consolidation.ts for the full batch
// context.
//
// If the "Personal Loan Calculators" sub-category doesn't exist yet, it is
// created under Loan Calculators.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-medical-dental-calculators.ts
// or
//   npm run db:create-loan-medical-dental-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "loan-calculators";
const CATEGORY = { name: "Personal Loan Calculators", slug: "personal-loan-calculators" };

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
    slug: "medical-loan-calculator",
    title: "Medical Loan Calculator",
    description: "Work out your share of a medical bill after insurance and HSA/FSA money, then see the monthly payment and interest if you finance the rest.",
    metaTitle: "Medical Loan Calculator — After Insurance & HSA",
    metaDescription: "Free medical loan calculator. Apply your deductible, coinsurance and out-of-pocket max, subtract HSA funds, and see the payment on the rest.",
    calcInputs: [
      currencyField("billAmount", "Total Medical Bill", { default: 12000, max: 10000000, step: 100 }),
      currencyField("deductibleRemaining", "Deductible Left to Meet", { default: 1500, max: 100000, step: 50, required: false }),
      percentField("coinsurancePercent", "Your Coinsurance Share", { default: 20, max: 100, step: 1 }),
      currencyField("outOfPocketMaxRemaining", "Out-of-Pocket Maximum Left (0 = None)", { default: 5000, max: 1000000, step: 100, required: false }),
      currencyField("hsaFunds", "HSA / FSA / Savings to Use", { default: 0, max: 1000000, step: 50, required: false }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 10, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 3, max: 84, step: 3 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "insurancePays", label: "Insurance Pays", format: "currency" },
      { key: "yourShare", label: "Your Share of the Bill", format: "currency" },
      { key: "amountToFinance", label: "Amount to Finance", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the total bill, how much of your deductible is still unmet, your coinsurance percentage (the share you " +
      "pay after the deductible), and how much of your out-of-pocket maximum is left. Add any HSA, FSA, or savings " +
      "you'll put toward it, and the loan's rate and term.\n\n" +
      "The tool applies the deductible first, then coinsurance on the rest, caps your share at the out-of-pocket " +
      "maximum, and finances what's left after your savings. If you have no insurance, set coinsurance to 100% and " +
      "the deductible and maximum to 0.",
    examples:
      "Example: on a $12,000 bill with $1,500 of deductible left and 20% coinsurance, you owe $1,500 + 20% of " +
      "$10,500 = $3,600, and insurance pays $8,400. Financing $3,600 at 10% over 24 months costs $166.12 a month " +
      "and $386.92 in interest.",
    assumptions:
      "Assumes the service is covered and in-network. Copays, non-covered services, and balance billing aren't " +
      "included. Always ask the provider for an itemised bill and whether a discount or interest-free payment plan " +
      "is available before borrowing. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I take a loan or ask the hospital for a payment plan?",
        answer: "Ask first. Many hospitals offer interest-free payment plans, and non-profit hospitals must have financial assistance policies that can reduce or remove the bill if your income qualifies.",
      },
      {
        question: "What is an out-of-pocket maximum?",
        answer: "The most you pay for covered, in-network care in a plan year. Once you reach it, insurance pays 100% of covered costs for the rest of that year.",
      },
    ],
  },
  {
    slug: "medical-loan-payment-calculator",
    title: "Medical Loan Payment Calculator",
    description: "See the monthly payment on a medical loan over 12, 24, 36, and 60 months side by side, and how much interest the shortest and longest terms cost.",
    metaTitle: "Medical Loan Payment Calculator — Compare Terms",
    metaDescription: "Free medical loan payment calculator. Compare monthly payments over 12, 24, 36 and 60 months and the interest cost of short vs long terms.",
    calcInputs: [
      currencyField("loanAmount", "Amount to Borrow", { default: 8000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 40, step: 0.05 }),
    ],
    calcResult: { label: "Payment Over 24 Months", format: "currency" },
    calcResults: [
      { key: "payment12", label: "Payment Over 12 Months", format: "currency" },
      { key: "payment24", label: "Payment Over 24 Months", format: "currency", highlight: true },
      { key: "payment36", label: "Payment Over 36 Months", format: "currency" },
      { key: "payment60", label: "Payment Over 60 Months", format: "currency" },
      { key: "interest12", label: "Total Interest Over 12 Months", format: "currency" },
      { key: "interest60", label: "Total Interest Over 60 Months", format: "currency" },
    ],
    instructions:
      "Enter how much you need to borrow for the medical cost and the interest rate you've been offered. The tool " +
      "shows the monthly payment for four common medical loan terms at once, so you can pick the shortest term " +
      "whose payment fits your budget.",
    examples:
      "Example: $8,000 at 11% costs $707.05 a month over 12 months, $372.86 over 24, $261.91 over 36, and $173.94 " +
      "over 60. The 12-month term costs $484.64 in interest; the 60-month term costs $2,436.36 — about five times " +
      "as much.",
    assumptions:
      "Assumes a fixed rate and equal monthly payments with no fees. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which term should I choose?",
        answer: "The shortest one you can comfortably afford. A longer term lowers the payment but you pay interest for longer, so the total cost rises.",
      },
    ],
  },
  {
    slug: "medical-loan-payoff-calculator",
    title: "Medical Loan Payoff Calculator",
    description: "See how many months are left on your medical loan, how much an extra payment saves, and what payment would clear it by your target date.",
    metaTitle: "Medical Loan Payoff Calculator — Free",
    metaDescription: "Free medical loan payoff calculator. See months left, interest saved by paying extra, and the payment needed to clear the loan by a target date.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 6000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.05 }),
      currencyField("monthlyPayment", "Current Monthly Payment", { default: 200, max: 100000, step: 10 }),
      currencyField("extraMonthly", "Extra Monthly Payment", { default: 50, max: 100000, step: 10, required: false }),
      numberField("targetMonths", "Target Months to Pay Off", { default: 18, min: 1, max: 120, step: 1 }),
    ],
    calcResult: { label: "Months With Extra Payment", format: "number", unit: "months" },
    calcResults: [
      { key: "monthsLeft", label: "Months Left at Current Payment", format: "number", unit: "months" },
      { key: "monthsWithExtra", label: "Months With Extra Payment", format: "number", unit: "months", highlight: true },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
      { key: "paymentForTarget", label: "Payment Needed for Target Date", format: "currency" },
    ],
    instructions:
      "Enter your current balance, rate, and monthly payment, any extra you could add each month, and the number of " +
      "months in which you'd like to be finished. The tool shows your current payoff time, the faster time with the " +
      "extra payment, the interest that saves, and the exact payment that would hit your target.",
    examples:
      "Example: $6,000 at 12% paid at $200 a month takes 36 months. Adding $50 a month cuts it to 28 months and " +
      "saves $273.77 in interest. To be finished in 18 months you'd need to pay $365.89 a month.",
    assumptions:
      "Assumes a fixed rate, extra payments going straight to principal, and no prepayment penalty. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I negotiate a medical bill I've already financed?",
        answer: "Once a lender has paid the provider, the debt is with the lender, so the bill itself usually can't be renegotiated. That's why it's worth asking for discounts and financial assistance before financing.",
      },
    ],
  },
  {
    slug: "medical-loan-interest-calculator",
    title: "Medical Loan Interest Calculator",
    description: "Find the total interest on a medical loan, how much is charged in the first year and per day, and interest as a share of the bill.",
    metaTitle: "Medical Loan Interest Calculator — Free",
    metaDescription: "Free medical loan interest calculator. See total and first-year interest, daily interest, and how much interest adds to your medical bill.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 10000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 14, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 3, max: 84, step: 3 }),
    ],
    calcResult: { label: "Total Interest", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency", highlight: true },
      { key: "year1Interest", label: "Interest in Year 1", format: "currency" },
      { key: "dailyInterestAtStart", label: "Daily Interest at the Start", format: "currency" },
      { key: "interestPercentOfBill", label: "Interest Added to the Bill", format: "percentage" },
    ],
    instructions:
      "Enter the loan amount, interest rate, and term. The tool shows the total interest you'll pay, how much of it " +
      "falls in the first year, what the loan costs per day at the start, and how much interest adds on top of the " +
      "medical bill as a percentage.",
    examples:
      "Example: a $10,000 medical loan at 14% over 36 months costs $341.78 a month. Interest totals $2,303.95 — " +
      "23.04% on top of the bill — with $1,219.74 of it in the first year. At the start, interest runs at about " +
      "$3.84 a day.",
    assumptions:
      "Assumes a fixed rate and equal monthly payments. Daily interest = balance × rate ÷ 365. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is more interest charged in the first year?",
        answer: "Interest is charged on the outstanding balance, which is highest at the start. As you pay it down, each month's interest gets smaller.",
      },
    ],
  },
  {
    slug: "medical-loan-affordability-calculator",
    title: "Medical Loan Affordability Calculator",
    description: "Find the largest medical loan your monthly budget supports, and the biggest bill you could cover once savings, your deductible and coinsurance are counted.",
    metaTitle: "Medical Loan Affordability Calculator — Free",
    metaDescription: "Free medical loan affordability calculator. Turn your monthly budget into a maximum loan and the largest medical bill you could cover.",
    calcInputs: [
      currencyField("monthlyBudget", "Monthly Payment You Can Afford", { default: 250, max: 100000, step: 10 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 3, max: 84, step: 3 }),
      currencyField("savings", "Savings / HSA You Can Put In", { default: 1000, max: 1000000, step: 50, required: false }),
      currencyField("deductibleRemaining", "Deductible Left to Meet", { default: 1500, max: 100000, step: 50, required: false }),
      percentField("coinsurancePercent", "Your Coinsurance Share (100% if Uninsured)", { default: 20, max: 100, step: 1 }),
    ],
    calcResult: { label: "Maximum Loan Amount", format: "currency" },
    calcResults: [
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency", highlight: true },
      { key: "maxOutOfPocket", label: "Most You Can Pay (Loan + Savings)", format: "currency" },
      { key: "maxBillCovered", label: "Largest Total Bill You Could Cover", format: "currency" },
      { key: "totalInterest", label: "Interest on the Maximum Loan", format: "currency" },
    ],
    instructions:
      "Enter the monthly payment you can afford, the rate and term, any savings or HSA money you can add, the " +
      "deductible you still have to meet, and your coinsurance share.\n\n" +
      "The tool finds the loan your budget repays, adds your savings to get the most you can pay out of pocket, " +
      "then works backwards through the deductible and coinsurance to the largest total bill that leaves your share " +
      "within reach. If you're uninsured, set coinsurance to 100%.",
    examples:
      "Example: $250 a month at 12% over 36 months repays a $7,526.88 loan. With $1,000 of savings you can pay " +
      "$8,526.88. With $1,500 of deductible left and 20% coinsurance, that covers your share of a bill up to " +
      "$36,634.38.",
    assumptions:
      "Ignores your out-of-pocket maximum, which would cap your share on very large bills. Assumes covered, " +
      "in-network care. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I ask for a lower medical bill?",
        answer: "Ask for an itemised bill, check it for errors, ask about the self-pay or prompt-pay discount, and apply for the hospital's financial assistance programme if your income is limited.",
      },
    ],
  },
  {
    slug: "medical-loan-comparison-calculator",
    title: "Medical Loan Comparison Calculator",
    description: "Compare three ways to pay a medical bill over time: the provider's 0% payment plan, a personal medical loan, and a deferred-interest medical credit card.",
    metaTitle: "Medical Loan Comparison Calculator — Plan vs Loan vs Card",
    metaDescription: "Free calculator comparing a hospital payment plan, a medical loan and a deferred-interest medical credit card. See payments and interest risk.",
    calcInputs: [
      currencyField("billAmount", "Amount to Pay Over Time", { default: 6000, max: 1000000, step: 100 }),
      numberField("planMonths", "Provider Payment Plan (Months, 0%)", { default: 12, min: 1, max: 60, step: 1 }),
      percentField("loanRatePercent", "Medical Loan Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("loanTermMonths", "Medical Loan Term (Months)", { default: 24, min: 3, max: 84, step: 3 }),
      numberField("cardPromoMonths", "Card's No-Interest Promo (Months)", { default: 12, min: 0, max: 60, step: 1 }),
      percentField("cardAprPercent", "Card APR", { default: 26.99, max: 40, step: 0.01 }),
      currencyField("cardMonthlyPayment", "What You'd Pay on the Card Monthly", { default: 400, max: 100000, step: 10 }),
    ],
    calcResult: { label: "Card Deferred Interest Charged", format: "currency" },
    calcResults: [
      { key: "planPayment", label: "Payment Plan — Monthly Payment", format: "currency" },
      { key: "loanPayment", label: "Loan — Monthly Payment", format: "currency" },
      { key: "loanInterest", label: "Loan — Total Interest", format: "currency" },
      { key: "cardBalanceAtPromoEnd", label: "Card — Balance Left When Promo Ends", format: "currency" },
      { key: "cardDeferredInterest", label: "Card — Deferred Interest Charged", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the amount, the provider's interest-free payment plan length (if offered), the medical loan's rate and " +
      "term, and the medical credit card's promo length, APR, and the monthly amount you'd actually pay on it.\n\n" +
      "Many medical credit cards use deferred interest: if any balance is left when the promo ends, interest is " +
      "charged back to the start on the whole balance. The tool shows whether your planned payment clears the card " +
      "in time — and the back-interest if it doesn't.",
    examples:
      "Example: for $6,000, a 12-month 0% provider plan costs $500 a month. A 24-month loan at 12% costs $282.44 a " +
      "month and $778.58 in interest. On a card with 12 months' promo at 26.99%, paying $400 a month leaves $1,200 " +
      "at the end of the promo — triggering $1,025.62 of deferred interest.",
    assumptions:
      "Deferred interest is estimated on the running balance at the card's APR for each promo month. Real cards " +
      "calculate it daily and may require minimum payments that differ from your planned amount. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between 0% APR and deferred interest?",
        answer: "With a true 0% APR, no interest is charged during the promo, even if a balance remains. With deferred interest, interest is quietly tracked and charged all at once if you haven't paid in full by the end.",
      },
    ],
  },
  {
    slug: "medical-loan-eligibility-calculator",
    title: "Medical Loan Eligibility Calculator",
    description: "Check a medical loan application against a lender's guidelines: your debt-to-income ratio with the new payment, credit score margin, and income margin.",
    metaTitle: "Medical Loan Eligibility Calculator — Free",
    metaDescription: "Free medical loan eligibility calculator. Check DTI with the new payment, your credit score margin and income vs a lender's minimums.",
    calcInputs: [
      numberField("creditScore", "Your Credit Score", { default: 650, min: 300, max: 850, step: 1 }),
      numberField("lenderMinScore", "Lender's Minimum Score", { default: 600, min: 300, max: 850, step: 1 }),
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 4000, max: 1000000, step: 100 }),
      currencyField("lenderMinIncome", "Lender's Minimum Monthly Income", { default: 2000, max: 1000000, step: 100, required: false }),
      currencyField("monthlyDebtPayments", "Current Monthly Debt Payments (Incl. Rent)", { default: 1200, max: 100000, step: 25 }),
      currencyField("loanAmount", "Loan Amount", { default: 7000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Expected Rate", { default: 15, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 3, max: 84, step: 3 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 45, max: 60, step: 1 }),
    ],
    calcResult: { label: "DTI With New Loan", format: "percentage" },
    calcResults: [
      { key: "newPayment", label: "New Loan Payment", format: "currency" },
      { key: "dtiAfterPercent", label: "DTI With New Loan", format: "percentage", highlight: true },
      { key: "dtiHeadroomPercent", label: "Room Under the DTI Limit", format: "percentage" },
      { key: "scoreMargin", label: "Points Above Minimum Score", format: "number" },
      { key: "incomeMargin", label: "Income Above Lender Minimum", format: "currency" },
    ],
    instructions:
      "Enter your credit score, gross monthly income, current monthly debt payments (rent or mortgage plus other " +
      "loans and minimum card payments), the loan you want, and the lender's minimum score, minimum income, and " +
      "maximum DTI if you know them.\n\n" +
      "Any negative result shows where you fall short of that lender's guidelines.",
    examples:
      "Example: a $7,000 loan at 15% over 36 months costs $242.66 a month. On $4,000 of income with $1,200 of " +
      "existing payments, DTI becomes 36.07% — 8.93 points under a 45% limit. A 650 score is 50 points above a 600 " +
      "minimum, and income is $2,000 above the lender's minimum.",
    assumptions:
      "A guideline check only — lenders decide on their own criteria, including credit history and employment. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get a medical loan with bad credit?",
        answer: "Some lenders accept lower scores, often at much higher rates or with a co-signer. Before borrowing at a high rate, ask the provider about an interest-free payment plan or financial assistance.",
      },
    ],
  },
  {
    slug: "dental-loan-calculator",
    title: "Dental Loan Calculator",
    description: "Work out what dental insurance pays (up to its annual maximum), what's left after your down payment, and the monthly payment to finance the rest.",
    metaTitle: "Dental Loan Calculator — After Insurance Annual Max",
    metaDescription: "Free dental loan calculator. Apply your plan's coverage % and annual maximum, subtract a down payment, and see the payment on the rest.",
    calcInputs: [
      currencyField("treatmentCost", "Treatment Cost", { default: 6000, max: 1000000, step: 100 }),
      percentField("coveragePercent", "Insurance Coverage for This Treatment", { default: 50, max: 100, step: 5 }),
      currencyField("annualMaxRemaining", "Annual Maximum Left This Year", { default: 1500, max: 100000, step: 50 }),
      currencyField("downPayment", "Down Payment", { default: 500, max: 1000000, step: 50, required: false }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 3, max: 84, step: 3 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "insurancePays", label: "Insurance Pays", format: "currency" },
      { key: "yourShare", label: "Your Share", format: "currency" },
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the treatment cost, the percentage your dental plan covers for it (often 80% for basic work and 50% " +
      "for major work such as crowns or bridges), and how much of your plan's annual maximum is left. Add any down " +
      "payment and the loan's rate and term.\n\n" +
      "Dental plans stop paying once the annual maximum is used up, so on big treatments the maximum — not the " +
      "coverage percentage — usually limits what insurance pays.",
    examples:
      "Example: a $6,000 treatment covered at 50% would mean $3,000 from insurance, but only $1,500 of the annual " +
      "maximum is left, so you owe $4,500. After a $500 down payment, financing $4,000 at 12% over 24 months costs " +
      "$188.29 a month and $519.05 in interest.",
    assumptions:
      "Ignores your dental deductible and any waiting periods. Implants and cosmetic work are often not covered. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is a dental annual maximum?",
        answer: "The most your dental plan pays in a plan year, commonly $1,000–$2,000. Anything above it is yours to pay, which is why large treatments are often financed.",
      },
    ],
  },
  {
    slug: "dental-loan-payment-calculator",
    title: "Dental Loan Payment Calculator",
    description: "Compare the loan payment for doing dental treatment in one plan year with splitting it across two years so two insurance annual maximums apply.",
    metaTitle: "Dental Loan Payment Calculator — 1 vs 2 Plan Years",
    metaDescription: "Free dental loan payment calculator. See how splitting treatment across two insurance years cuts the amount financed and your monthly payment.",
    calcInputs: [
      currencyField("treatmentCost", "Total Treatment Cost", { default: 8000, max: 1000000, step: 100 }),
      percentField("coveragePercent", "Insurance Coverage", { default: 50, max: 100, step: 5 }),
      currencyField("annualMax", "Plan's Annual Maximum", { default: 1500, max: 100000, step: 50 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 3, max: 84, step: 3 }),
    ],
    calcResult: { label: "Monthly Saving From Splitting", format: "currency" },
    calcResults: [
      { key: "oneYearFinanced", label: "One Year — Amount Financed", format: "currency" },
      { key: "oneYearPayment", label: "One Year — Monthly Payment", format: "currency" },
      { key: "splitFinanced", label: "Two Years — Amount Financed", format: "currency" },
      { key: "splitPayment", label: "Two Years — Monthly Payment", format: "currency" },
      { key: "monthlySavingFromSplit", label: "Monthly Saving From Splitting", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the total treatment cost, your plan's coverage percentage and annual maximum, and the loan's rate and " +
      "term. The tool compares financing everything after one year's maximum with splitting the work evenly across " +
      "two plan years (for example, starting in December and finishing in January), so the plan pays up to its " +
      "maximum twice.",
    examples:
      "Example: $8,000 of treatment at 50% coverage with a $1,500 maximum leaves $6,500 to finance in one year — " +
      "$305.98 a month at 12% over 24 months. Split across two years, insurance pays $3,000, leaving $5,000 and a " +
      "$235.37 payment — $70.61 a month less.",
    assumptions:
      "Assumes the treatment can safely be staged — ask your dentist — and that your plan year resets on the " +
      "date you expect. Both amounts are shown financed over the same term for a like-for-like comparison. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does my plan year always start in January?",
        answer: "Not always — some plans renew on the policy's anniversary date. Check your plan documents or ask your insurer before scheduling work around it.",
      },
    ],
  },
  {
    slug: "dental-loan-cost-calculator",
    title: "Dental Loan Cost Calculator",
    description: "Find the full cost of financing dental work — interest and fees — and compare it with the discount many dentists give for paying in cash.",
    metaTitle: "Dental Loan Cost Calculator — Loan vs Cash Discount",
    metaDescription: "Free dental loan cost calculator. Add up interest and fees, and compare the total with paying the dentist's discounted cash price.",
    calcInputs: [
      currencyField("treatmentCost", "Treatment Cost (Your Share)", { default: 5000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 14, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 3, max: 84, step: 3 }),
      percentField("originationFeePercent", "Origination Fee", { default: 0, max: 12, step: 0.25, required: false }),
      percentField("cashDiscountPercent", "Dentist's Cash Discount", { default: 5, max: 30, step: 0.5, required: false }),
    ],
    calcResult: { label: "Extra Cost of Financing", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "totalPaidWithLoan", label: "Total Paid With the Loan", format: "currency" },
      { key: "cashPrice", label: "Cash Price After Discount", format: "currency" },
      { key: "extraCostOfFinancing", label: "Extra Cost of Financing", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your share of the treatment cost, the loan's rate, term, and origination fee, and any discount the " +
      "practice gives for paying upfront. The tool totals every payment on the loan and compares it with the cash " +
      "price — the difference is what financing really costs you.",
    examples:
      "Example: financing $5,000 at 14% over 36 months costs $170.89 a month — $6,151.97 in total, including " +
      "$1,151.97 of interest. With a 5% cash discount the price would be $4,750, so financing costs $1,401.97 more.",
    assumptions:
      "The origination fee is assumed to be deducted from the loan, so the loan is grossed up to cover the full " +
      "treatment cost. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do dentists really give cash discounts?",
        answer: "Many do, especially for large treatments paid upfront, because it saves them card and financing fees. It never hurts to ask.",
      },
    ],
  },
  {
    slug: "dental-loan-payoff-calculator",
    title: "Dental Loan Payoff Calculator",
    description: "On a deferred-interest dental card or plan, find the monthly payment that clears the balance before the promo ends — and the back-interest if you pay less.",
    metaTitle: "Dental Loan Payoff Calculator — Beat Deferred Interest",
    metaDescription: "Free dental loan payoff calculator. Find the payment that clears a deferred-interest promo in time and the interest charged if you fall short.",
    calcInputs: [
      currencyField("balance", "Amount Financed", { default: 4000, max: 1000000, step: 100 }),
      numberField("promoMonths", "No-Interest Promo (Months)", { default: 12, min: 1, max: 60, step: 1 }),
      percentField("cardAprPercent", "APR If the Promo Is Missed", { default: 26.99, max: 40, step: 0.01 }),
      currencyField("plannedMonthlyPayment", "What You Plan to Pay Monthly", { default: 300, max: 100000, step: 10 }),
    ],
    calcResult: { label: "Payment to Clear the Promo", format: "currency" },
    calcResults: [
      { key: "paymentToClearPromo", label: "Payment to Clear the Promo", format: "currency", highlight: true },
      { key: "balanceAtPromoEnd", label: "Balance Left at Promo End (Your Plan)", format: "currency" },
      { key: "deferredInterestCharged", label: "Deferred Interest Charged", format: "currency" },
      { key: "totalOwedAfterPromo", label: "Total Owed After the Promo", format: "currency" },
    ],
    instructions:
      "Enter the amount financed on a dental credit card or deferred-interest plan, the length of the no-interest " +
      "promo, the APR that applies if you miss it, and what you plan to pay each month.\n\n" +
      "The tool shows the payment that clears the balance just in time. If your planned payment is lower, it shows " +
      "the balance left and the deferred interest that would be added in one go.",
    examples:
      "Example: $4,000 on a 12-month promo needs $333.33 a month to clear in time. Paying $300 leaves $400 at the " +
      "end, and $634.26 of deferred interest at 26.99% is added — you'd then owe $1,034.26.",
    assumptions:
      "Back-interest is estimated on the running balance for each promo month. Card minimum payments are usually " +
      "too low to clear a promo — set up your own payment. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I avoid deferred interest?",
        answer: "Divide the balance by the promo months (or a month fewer, for safety), pay at least that every month, and make sure no balance is left on the promo's last day.",
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
