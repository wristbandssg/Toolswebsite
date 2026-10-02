// One-time (but safe to re-run) batch setup script: creates the 12 tools
// of the Loan Calculators expansion sub-batch 1 (Debt Consolidation Loans),
// filed under Finance Calculators > Loan Calculators > Personal Loan
// Calculators. See src/lib/calc-engine-loan-debt-consolidation.ts for the
// math, the skipped duplicates, and the other 9 sub-batches.
//
// If the "Personal Loan Calculators" sub-category doesn't exist yet, it is
// created under Loan Calculators.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-debt-consolidation-calculators.ts
// or
//   npm run db:create-loan-debt-consolidation-calculators

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
    slug: "debt-consolidation-loan-payment-calculator",
    title: "Debt Consolidation Loan Payment Calculator",
    description: "Add up the debts you want to combine, see how big the loan must be after the origination fee, and compare the new monthly payment with what you pay now.",
    metaTitle: "Debt Consolidation Loan Payment Calculator — Free",
    metaDescription: "Free debt consolidation loan payment calculator. Combine up to 3 debts, include the origination fee, and see your new monthly payment vs today.",
    calcInputs: [
      currencyField("debt1", "Debt 1 Balance", { default: 8000, max: 1000000, step: 100 }),
      currencyField("debt2", "Debt 2 Balance", { default: 5000, max: 1000000, step: 100, required: false }),
      currencyField("debt3", "Debt 3 Balance", { default: 3000, max: 1000000, step: 100, required: false }),
      currencyField("currentMonthlyPayments", "What You Pay on These Debts Each Month", { default: 650, max: 100000, step: 10 }),
      percentField("annualRatePercent", "Consolidation Loan Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 120, step: 6 }),
      percentField("originationFeePercent", "Origination Fee", { default: 5, max: 12, step: 0.25 }),
    ],
    calcResult: { label: "New Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalDebt", label: "Total Debt to Pay Off", format: "currency" },
      { key: "loanAmount", label: "Loan Amount Needed (After Fee)", format: "currency" },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "monthlyPayment", label: "New Monthly Payment", format: "currency", highlight: true },
      { key: "monthlyPaymentChange", label: "Monthly Payment Reduction", format: "currency" },
    ],
    instructions:
      "Enter the balances of up to three debts you want to combine (credit cards, store cards, other loans), " +
      "what you currently pay on them each month in total, and the rate, term, and origination fee of the " +
      "consolidation loan.\n\n" +
      "Most lenders take the origination fee out of the money they send you, so the tool works out how much you " +
      "need to borrow for the cash to still clear every debt. A negative reduction means the new payment is higher " +
      "than what you pay now.",
    examples:
      "Example: debts of $8,000, $5,000 and $3,000 add up to $16,000. With a 5% origination fee you need to borrow " +
      "$16,842.11 (the fee is $842.11). At 12% over 48 months the new payment is $443.52 — $206.48 a month less " +
      "than the $650 you pay today.",
    assumptions:
      "Assumes a fixed-rate loan with equal monthly payments and the fee deducted from the proceeds. A lower " +
      "monthly payment can still cost more overall if the term is much longer — check the total cost too. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do I need to borrow more than I owe?",
        answer: "Because the origination fee is usually deducted from the loan before the money reaches you. To end up with enough cash to pay every debt, the loan has to be grossed up: debt ÷ (1 − fee %).",
      },
      {
        question: "Is a lower monthly payment always better?",
        answer: "Not always. Stretching the term lowers the payment but can increase the total interest. Use the Debt Consolidation Loan Total Cost Calculator to see the full picture.",
      },
    ],
  },
  {
    slug: "debt-consolidation-loan-payoff-calculator",
    title: "Debt Consolidation Loan Payoff Calculator",
    description: "See how many months sooner you'd be debt-free with a consolidation loan (and an optional extra payment) than by keeping your current payments.",
    metaTitle: "Debt Consolidation Loan Payoff Calculator — Debt-Free Date",
    metaDescription: "Free debt consolidation payoff calculator. Compare months to debt-free and interest paid with a consolidation loan vs your current payments.",
    calcInputs: [
      currencyField("totalDebt", "Total Debt to Consolidate", { default: 20000, max: 1000000, step: 250 }),
      percentField("currentAprPercent", "Average APR on Current Debts", { default: 22, max: 40, step: 0.1 }),
      currencyField("currentMonthlyPayment", "What You Pay Each Month Now", { default: 600, max: 100000, step: 10 }),
      percentField("loanRatePercent", "Consolidation Loan Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("loanTermMonths", "Loan Term (Months)", { default: 48, min: 6, max: 120, step: 6 }),
      currencyField("extraMonthly", "Extra Payment on the Loan Each Month", { default: 50, max: 100000, step: 10, required: false }),
    ],
    calcResult: { label: "Months Sooner", format: "number", unit: "months" },
    calcResults: [
      { key: "monthsToPayoffNow", label: "Months to Debt-Free Now", format: "number", unit: "months" },
      { key: "loanPayment", label: "Loan's Required Payment", format: "currency" },
      { key: "monthsToPayoffWithLoan", label: "Months to Debt-Free With Loan", format: "number", unit: "months" },
      { key: "monthsSooner", label: "Months Sooner", format: "number", unit: "months", highlight: true },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "Enter your total debt, its average APR, and what you pay on it each month now. Then enter the consolidation " +
      "loan's rate and term, plus any extra you plan to pay on top of the loan's payment.\n\n" +
      "The tool runs both paths month by month and shows how much sooner you'd be debt-free and how much interest " +
      "you'd avoid. If your current payment doesn't cover the monthly interest, the debt would never be paid off " +
      "on the current path and the comparison shows 0.",
    examples:
      "Example: $20,000 at 22% paid at $600 a month takes 52 months. A 48-month loan at 11% has a $516.91 payment; " +
      "adding $50 a month pays it off in 43 months — 9 months sooner, saving $6,920.92 in interest.",
    assumptions:
      "Treats your current debts as one balance at their average APR with a fixed payment, and assumes no new " +
      "charges are added. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the biggest risk with consolidation?",
        answer: "Running the cards back up after they're cleared. If new balances build up, you end up with the loan and new card debt at the same time.",
      },
    ],
  },
  {
    slug: "debt-consolidation-loan-refinance-calculator",
    title: "Debt Consolidation Loan Refinance Calculator",
    description: "Check whether refinancing an existing debt consolidation loan saves money once the new lender's fee and any prepayment penalty are built in.",
    metaTitle: "Debt Consolidation Loan Refinance Calculator",
    metaDescription: "Free calculator to refinance a debt consolidation loan. See the new payment, net savings after fees and penalties, and your break-even month.",
    calcInputs: [
      currencyField("currentBalance", "Current Loan Balance", { default: 15000, max: 1000000, step: 250 }),
      percentField("currentRatePercent", "Current Interest Rate", { default: 16, max: 40, step: 0.05 }),
      numberField("remainingMonths", "Months Left on Current Loan", { default: 36, min: 1, max: 120, step: 1 }),
      percentField("newRatePercent", "New Interest Rate", { default: 10, max: 40, step: 0.05 }),
      numberField("newTermMonths", "New Loan Term (Months)", { default: 36, min: 6, max: 120, step: 6 }),
      percentField("newFeePercent", "New Loan Origination Fee", { default: 3, max: 12, step: 0.25 }),
      currencyField("prepaymentPenalty", "Prepayment Penalty on Current Loan", { default: 0, max: 100000, step: 25, required: false }),
    ],
    calcResult: { label: "Net Savings", format: "currency" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "newLoanAmount", label: "New Loan Amount (Fee Built In)", format: "currency" },
      { key: "newPayment", label: "New Monthly Payment", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "netSavings", label: "Net Savings Over Both Loans", format: "currency", highlight: true },
      { key: "breakEvenMonths", label: "Break-Even Month", format: "number", unit: "months" },
    ],
    instructions:
      "Enter your current loan's balance, rate, and months left, then the new loan's rate, term, and origination " +
      "fee, plus any prepayment penalty your current lender charges.\n\n" +
      "The new loan is sized so that, after its fee is deducted, it still pays off the old balance and penalty. " +
      "Net savings compares everything you'd pay on each loan from today; the break-even month is how long the " +
      "monthly savings take to cover the fee and penalty.",
    examples:
      "Example: $15,000 left at 16% over 36 months costs $527.36 a month. Refinancing at 10% for 36 months with a 3% " +
      "fee means a $15,463.92 loan and a $498.98 payment — $28.38 a month less, $1,021.62 saved overall, breaking " +
      "even in month 17.",
    assumptions:
      "Assumes fixed rates and equal monthly payments on both loans. Choosing a longer new term lowers the payment " +
      "but can turn net savings negative. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When does refinancing not make sense?",
        answer: "When you're close to the end of the current loan, when the rate drop is small, or when fees and penalties take longer to recover than the months you have left.",
      },
    ],
  },
  {
    slug: "debt-consolidation-loan-apr-calculator",
    title: "Debt Consolidation Loan APR Calculator",
    description: "Find the true APR of a debt consolidation loan once the origination fee is counted, and compare it with the card APR you're paying now.",
    metaTitle: "Debt Consolidation Loan APR Calculator — True Cost",
    metaDescription: "Free debt consolidation loan APR calculator. Include the origination fee to find the real APR and see how far below your card APR it is.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 20000, max: 1000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 120, step: 6 }),
      percentField("originationFeePercent", "Origination Fee", { default: 6, max: 12, step: 0.25 }),
      percentField("currentCardAprPercent", "APR on Your Current Cards", { default: 22, max: 40, step: 0.1 }),
    ],
    calcResult: { label: "True APR", format: "percentage" },
    calcResults: [
      { key: "aprPercent", label: "True APR (Fee Included)", format: "percentage", highlight: true },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "cashReceived", label: "Cash You Actually Receive", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "aprBelowCardsPercent", label: "Points Below Your Card APR", format: "percentage" },
    ],
    instructions:
      "Enter the loan amount, the quoted interest rate, the term, the origination fee, and the APR on the cards " +
      "you want to pay off. The tool finds the APR — the rate that makes the cash you receive equal to the " +
      "payments you'll make — which is the fair number to compare against your cards.",
    examples:
      "Example: a $20,000, 48-month loan at 11% with a 6% fee sends you $18,800 but you still repay $516.91 a " +
      "month on the full $20,000. The true APR is 14.34% — still 7.66 points below a 22% card APR.",
    assumptions:
      "Assumes the fee is deducted from the proceeds and there are no other charges. US lenders must state the " +
      "APR in the loan disclosure; use it to double-check this estimate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the APR higher than the interest rate?",
        answer: "Because you pay interest on the full loan, fee included, but only receive the amount after the fee. The APR spreads that fee over the life of the loan.",
      },
    ],
  },
  {
    slug: "debt-consolidation-loan-affordability-calculator",
    title: "Debt Consolidation Loan Affordability Calculator",
    description: "Work out the largest debt consolidation loan your income supports under a debt-to-income limit, and how much of your debt it would cover.",
    metaTitle: "Debt Consolidation Loan Affordability Calculator",
    metaDescription: "Free debt consolidation affordability calculator. Find the biggest loan your income allows under a DTI limit and see how much debt it covers.",
    calcInputs: [
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 6000, max: 1000000, step: 100 }),
      currencyField("housingPayment", "Rent or Mortgage Payment", { default: 1500, max: 100000, step: 50 }),
      currencyField("otherDebtPayments", "Other Debt Payments Not Being Consolidated", { default: 300, max: 100000, step: 25, required: false }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 40, max: 60, step: 1 }),
      percentField("annualRatePercent", "Expected Loan Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 120, step: 6 }),
      currencyField("debtToConsolidate", "Debt You Want to Consolidate", { default: 30000, max: 1000000, step: 250 }),
    ],
    calcResult: { label: "Maximum Loan Amount", format: "currency" },
    calcResults: [
      { key: "maxMonthlyPayment", label: "Maximum Loan Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency", highlight: true },
      { key: "debtCoveredPercent", label: "Share of Your Debt Covered", format: "percentage" },
      { key: "shortfall", label: "Debt Left Over", format: "currency" },
    ],
    instructions:
      "Enter your gross (before-tax) monthly income, your housing payment, any debt payments you're keeping, the " +
      "lender's maximum debt-to-income (DTI) ratio, and the rate and term you expect.\n\n" +
      "Because the debts you consolidate are paid off, their old payments drop out — the new loan payment can use " +
      "all the room left under the DTI limit. The tool turns that payment into a loan amount and compares it with " +
      "your debt.",
    examples:
      "Example: on $6,000 a month with a 40% DTI limit, $1,500 rent and $300 of other debt, the loan payment can be " +
      "up to $600. At 12% over 60 months that supports $26,973.02 — 89.91% of $30,000 of debt, leaving $3,026.98 " +
      "to pay another way.",
    assumptions:
      "DTI limits vary by lender, commonly 35%–50% for personal loans. Lenders also look at credit score and " +
      "history. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What counts toward DTI?",
        answer: "Rent or mortgage, car loans, student loans, minimum card payments, and other loan payments — divided by your gross monthly income. Living costs like groceries and utilities aren't included.",
      },
    ],
  },
  {
    slug: "debt-consolidation-loan-eligibility-calculator",
    title: "Debt Consolidation Loan Eligibility Calculator",
    description: "Check your debt-to-income ratio before and after consolidating, and how your credit score compares with a lender's minimum.",
    metaTitle: "Debt Consolidation Loan Eligibility Calculator",
    metaDescription: "Free debt consolidation loan eligibility calculator. See your DTI before and after the loan and your credit score margin over a lender's minimum.",
    calcInputs: [
      numberField("creditScore", "Your Credit Score", { default: 680, min: 300, max: 850, step: 1 }),
      numberField("lenderMinScore", "Lender's Minimum Score", { default: 640, min: 300, max: 850, step: 1 }),
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 5500, max: 1000000, step: 100 }),
      currencyField("housingPayment", "Rent or Mortgage Payment", { default: 1400, max: 100000, step: 50 }),
      currencyField("paymentsBeingConsolidated", "Payments on Debts Being Consolidated", { default: 700, max: 100000, step: 10 }),
      currencyField("otherDebtPayments", "Other Debt Payments You'll Keep", { default: 0, max: 100000, step: 25, required: false }),
      currencyField("loanAmount", "Loan Amount", { default: 18000, max: 1000000, step: 250 }),
      percentField("annualRatePercent", "Expected Loan Rate", { default: 13, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 12, max: 120, step: 6 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 40, max: 60, step: 1 }),
    ],
    calcResult: { label: "DTI After Consolidating", format: "percentage" },
    calcResults: [
      { key: "newPayment", label: "New Loan Payment", format: "currency" },
      { key: "dtiBeforePercent", label: "DTI Today", format: "percentage" },
      { key: "dtiAfterPercent", label: "DTI After Consolidating", format: "percentage", highlight: true },
      { key: "dtiHeadroomPercent", label: "Room Under the DTI Limit", format: "percentage" },
      { key: "scoreMargin", label: "Points Above Minimum Score", format: "number" },
    ],
    instructions:
      "Enter your credit score and the lender's published minimum, your gross monthly income, housing payment, the " +
      "payments on the debts you'll consolidate, any debts you're keeping, and the loan you're applying for.\n\n" +
      "The tool replaces the consolidated payments with the new loan payment and recalculates your DTI. A negative " +
      "room under the limit or a negative score margin means you're unlikely to meet that lender's guidelines.",
    examples:
      "Example: on $5,500 a month, $1,400 rent plus $700 of card payments gives a 38.18% DTI. An $18,000 loan at 13% " +
      "over 48 months costs $482.89, so DTI falls to 34.23% — 5.77 points under a 40% limit. A 680 score is 40 " +
      "points above a 640 minimum.",
    assumptions:
      "This is a guideline check, not an approval. Lenders also weigh credit history, employment, and recent " +
      "applications, and some count the debts until they're actually paid off. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Will checking eligibility hurt my credit score?",
        answer: "This calculator doesn't touch your credit at all. Many lenders also offer prequalification with a soft credit check, which doesn't affect your score — only a full application uses a hard check.",
      },
    ],
  },
  {
    slug: "debt-consolidation-loan-interest-calculator",
    title: "Debt Consolidation Loan Interest Calculator",
    description: "Compare the interest your debts cost each month today with the first month of a consolidation loan, and see the loan's total interest.",
    metaTitle: "Debt Consolidation Loan Interest Calculator — Free",
    metaDescription: "Free debt consolidation loan interest calculator. See your monthly interest today vs the loan, total loan interest, and interest per dollar.",
    calcInputs: [
      currencyField("totalDebt", "Total Debt to Consolidate", { default: 20000, max: 1000000, step: 250 }),
      percentField("currentAprPercent", "Average APR on Current Debts", { default: 22, max: 40, step: 0.1 }),
      percentField("loanRatePercent", "Consolidation Loan Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 120, step: 6 }),
    ],
    calcResult: { label: "Monthly Interest Drop", format: "currency" },
    calcResults: [
      { key: "currentMonthlyInterest", label: "Interest You Pay Each Month Now", format: "currency" },
      { key: "loanFirstMonthInterest", label: "Interest in Loan's First Month", format: "currency" },
      { key: "monthlyInterestDrop", label: "Monthly Interest Drop", format: "currency", highlight: true },
      { key: "loanTotalInterest", label: "Total Interest Over the Loan", format: "currency" },
      { key: "interestPerDollar", label: "Interest per $1 Borrowed", format: "number", decimals: 3 },
    ],
    instructions:
      "Enter your total debt, its average APR, and the rate and term of the consolidation loan. The tool shows how " +
      "much interest your debts add every month right now, how much the loan charges in its first month, and the " +
      "loan's total interest over its life.",
    examples:
      "Example: $20,000 at 22% adds $366.67 of interest a month. At 11% the loan's first month charges $183.33 — " +
      "$183.33 a month less. Over 48 months the loan's interest totals $4,811.70, about $0.241 per dollar borrowed.",
    assumptions:
      "Monthly interest = balance × APR ÷ 12. Card interest is often compounded daily, so actual charges can be a " +
      "little higher. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does the loan's interest go down each month?",
        answer: "Each payment reduces the balance, and interest is charged only on what's left — so less of each later payment goes to interest and more to the debt itself.",
      },
    ],
  },
  {
    slug: "debt-consolidation-loan-early-payoff-calculator",
    title: "Debt Consolidation Loan Early Payoff Calculator",
    description: "Part-way through your consolidation loan? See what a lump sum and an extra monthly payment would save, net of any prepayment penalty.",
    metaTitle: "Debt Consolidation Loan Early Payoff Calculator",
    metaDescription: "Free early payoff calculator for debt consolidation loans. Add a lump sum or extra monthly payment and see months and interest saved.",
    calcInputs: [
      currencyField("loanAmount", "Original Loan Amount", { default: 20000, max: 1000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Original Term (Months)", { default: 60, min: 6, max: 120, step: 6 }),
      numberField("monthsPaid", "Payments Already Made", { default: 12, min: 0, max: 120, step: 1 }),
      currencyField("lumpSum", "Lump Sum Payment Now", { default: 3000, max: 1000000, step: 100, required: false }),
      currencyField("extraMonthly", "Extra Monthly Payment", { default: 100, max: 100000, step: 10, required: false }),
      percentField("prepaymentPenaltyPercent", "Prepayment Penalty (% of Lump Sum)", { default: 0, max: 10, step: 0.25, required: false }),
    ],
    calcResult: { label: "Net Savings", format: "currency" },
    calcResults: [
      { key: "currentBalance", label: "Balance Today", format: "currency" },
      { key: "newMonthsLeft", label: "Months Left After Prepaying", format: "number", unit: "months" },
      { key: "monthsSaved", label: "Months Saved", format: "number", unit: "months" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
      { key: "prepaymentPenalty", label: "Prepayment Penalty", format: "currency" },
      { key: "netSavings", label: "Net Savings", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the original loan amount, rate, and term, how many payments you've made, and the lump sum and/or extra " +
      "monthly amount you want to pay. If your loan charges a prepayment penalty, enter it as a percentage of the " +
      "amount prepaid.\n\n" +
      "The tool finds today's balance, applies the lump sum, then pays the regular payment plus the extra until the " +
      "loan is gone.",
    examples:
      "Example: a $20,000, 60-month loan at 12% has $16,894.20 left after 12 payments. Paying $3,000 now and $100 " +
      "extra a month clears it in 30 more months instead of 48 — 18 months sooner, saving $2,234.63 in interest.",
    assumptions:
      "Assumes extra payments go straight to principal, which most personal loans allow. Most US personal loans " +
      "have no prepayment penalty — check your agreement. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a lump sum or an extra monthly payment better?",
        answer: "Money paid earlier saves more interest, so a lump sum now beats the same total spread over later months. Extra monthly payments are easier to sustain if you don't have savings to spare.",
      },
    ],
  },
  {
    slug: "debt-consolidation-loan-comparison-calculator",
    title: "Debt Consolidation Loan Comparison Calculator",
    description: "Compare a debt consolidation loan with a 0% balance transfer credit card, paying the same amount each month, to see which costs less.",
    metaTitle: "Debt Consolidation Loan vs Balance Transfer Calculator",
    metaDescription: "Free comparison calculator: debt consolidation loan vs 0% balance transfer card. See total cost and payoff time for each at the same payment.",
    calcInputs: [
      currencyField("totalDebt", "Total Debt", { default: 12000, max: 1000000, step: 250 }),
      percentField("loanRatePercent", "Consolidation Loan Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("loanTermMonths", "Loan Term (Months)", { default: 36, min: 6, max: 120, step: 6 }),
      percentField("loanFeePercent", "Loan Origination Fee", { default: 0, max: 12, step: 0.25, required: false }),
      percentField("transferFeePercent", "Balance Transfer Fee", { default: 3, max: 10, step: 0.25 }),
      numberField("promoMonths", "0% Promo Period (Months)", { default: 18, min: 0, max: 24, step: 1 }),
      percentField("cardAprPercent", "Card APR After the Promo", { default: 24, max: 40, step: 0.1 }),
    ],
    calcResult: { label: "Loan Cost Minus Card Cost", format: "currency" },
    calcResults: [
      { key: "loanPayment", label: "Monthly Payment (Both Options)", format: "currency" },
      { key: "loanTotalCost", label: "Loan — Interest + Fee", format: "currency" },
      { key: "cardTotalCost", label: "Card — Transfer Fee + Interest", format: "currency" },
      { key: "cardMonthsToPayoff", label: "Card — Months to Pay Off", format: "number", unit: "months" },
      { key: "loanCostMinusCardCost", label: "Loan Cost Minus Card Cost", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your total debt, the consolidation loan's rate, term, and fee, and the balance transfer card's " +
      "transfer fee, 0% promo length, and normal APR.\n\n" +
      "To compare fairly, the card is paid at the same monthly amount as the loan. A positive result means the " +
      "card is cheaper by that amount; a negative result means the loan is cheaper.",
    examples:
      "Example: $12,000 on a 36-month loan at 12% costs $398.57 a month and $2,348.58 in interest. Paying the same " +
      "$398.57 on a card with a 3% fee and 18 months at 0% (then 24%) costs $1,241.21 and takes 34 months — the " +
      "card is $1,107.37 cheaper.",
    assumptions:
      "Assumes the full balance is approved for transfer, no new purchases go on the card, and payments are never " +
      "late (a late payment can end the 0% rate). The loan fee is deducted from proceeds. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When is a loan better than a balance transfer?",
        answer: "When the debt is too large to clear before the promo ends, when your credit limit won't cover the full balance, or when you want a fixed end date and a fixed payment.",
      },
    ],
  },
  {
    slug: "debt-consolidation-loan-amortization-calculator",
    title: "Debt Consolidation Loan Amortization Calculator",
    description: "See how your debt consolidation loan pays down: year-one interest and principal, the balance after years 1–3, and the month you're halfway.",
    metaTitle: "Debt Consolidation Loan Amortization Calculator",
    metaDescription: "Free debt consolidation loan amortization calculator. See year-one interest vs principal, balances after 1–3 years, and when you're halfway.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 25000, max: 1000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 120, step: 6 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "year1Interest", label: "Interest Paid in Year 1", format: "currency" },
      { key: "year1Principal", label: "Debt Paid Off in Year 1", format: "currency" },
      { key: "balanceAfterYear1", label: "Balance After Year 1", format: "currency" },
      { key: "balanceAfterYear2", label: "Balance After Year 2", format: "currency" },
      { key: "balanceAfterYear3", label: "Balance After Year 3", format: "currency" },
      { key: "firstPaymentInterestPercent", label: "Interest Share of First Payment", format: "percentage" },
      { key: "halfwayMonth", label: "Month the Balance Is Halved", format: "number" },
    ],
    instructions:
      "Enter the loan amount, interest rate, and term. The tool steps through the amortization schedule and " +
      "summarises it: how much of year one's payments went to interest vs paying down debt, what you'll still owe " +
      "after each of the first three years, and the month your balance first falls to half the loan.",
    examples:
      "Example: a $25,000 loan at 12% over 60 months costs $556.11 a month. In year one you pay $2,791.08 of " +
      "interest and $3,882.26 of debt, leaving $21,117.74. After year three you owe $11,813.69. Interest is 44.96% " +
      "of the first payment, and the balance is halved in month 35 — well past the midpoint of the term.",
    assumptions:
      "Assumes a fixed rate, equal monthly payments, and payments made on time. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does it take more than half the term to pay off half the loan?",
        answer: "Early payments carry more interest because the balance is highest, so less goes to the debt itself. The principal share grows as the balance falls.",
      },
    ],
  },
  {
    slug: "debt-consolidation-loan-prequalification-calculator",
    title: "Debt Consolidation Loan Prequalification Calculator",
    description: "Turn a prequalified APR range into a payment and interest range, and check whether the worst case still fits your monthly budget.",
    metaTitle: "Debt Consolidation Loan Prequalification Calculator",
    metaDescription: "Free prequalification calculator for debt consolidation loans. See payments and interest at the low and high end of your quoted APR range.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 1000000, step: 250 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 12, max: 120, step: 6 }),
      percentField("aprLowPercent", "Lowest APR Quoted", { default: 9, max: 40, step: 0.05 }),
      percentField("aprHighPercent", "Highest APR Quoted", { default: 24, max: 40, step: 0.05 }),
      currencyField("monthlyBudget", "Monthly Budget for the Payment", { default: 450, max: 100000, step: 10 }),
    ],
    calcResult: { label: "Budget Left at Highest APR", format: "currency" },
    calcResults: [
      { key: "paymentAtLowApr", label: "Payment at Lowest APR", format: "currency" },
      { key: "paymentAtHighApr", label: "Payment at Highest APR", format: "currency" },
      { key: "interestAtLowApr", label: "Total Interest at Lowest APR", format: "currency" },
      { key: "interestAtHighApr", label: "Total Interest at Highest APR", format: "currency" },
      { key: "budgetLeftAtHighApr", label: "Budget Left at Highest APR", format: "currency", highlight: true },
    ],
    instructions:
      "Prequalification gives you an APR range based on a soft credit check, not a final rate. Enter the amount, " +
      "term, the lowest and highest APR you were shown, and the most you can pay each month. The tool shows the " +
      "best and worst case, and whether the worst case still fits your budget (a negative number means it doesn't).",
    examples:
      "Example: $15,000 over 48 months prequalified at 9%–24% costs between $373.28 and $489.03 a month, with total " +
      "interest between $2,917.23 and $8,473.32. With a $450 budget, the worst case is $39.03 a month over.",
    assumptions:
      "Your final APR is set after a full application and hard credit check. Treat the APR as including any fee. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does prequalifying affect my credit score?",
        answer: "No — prequalification uses a soft inquiry, which isn't visible to other lenders and doesn't change your score. The hard inquiry comes only when you formally apply.",
      },
    ],
  },
  {
    slug: "debt-consolidation-loan-total-cost-calculator",
    title: "Debt Consolidation Loan Total Cost Calculator",
    description: "Add up the full cost of a debt consolidation loan — interest, origination fee, and monthly add-ons — and compare it with paying your debts as you do now.",
    metaTitle: "Debt Consolidation Loan Total Cost Calculator",
    metaDescription: "Free calculator for the total cost of a debt consolidation loan: interest, fees, and add-ons vs the interest you'd pay on your current path.",
    calcInputs: [
      currencyField("totalDebt", "Total Debt to Consolidate", { default: 20000, max: 1000000, step: 250 }),
      percentField("loanRatePercent", "Consolidation Loan Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 120, step: 6 }),
      percentField("originationFeePercent", "Origination Fee", { default: 5, max: 12, step: 0.25 }),
      currencyField("monthlyAddOns", "Monthly Add-Ons (e.g. Credit Insurance)", { default: 0, max: 10000, step: 5, required: false }),
      percentField("currentAprPercent", "Average APR on Current Debts", { default: 22, max: 40, step: 0.1 }),
      currencyField("currentMonthlyPayment", "What You Pay Each Month Now", { default: 600, max: 100000, step: 10 }),
    ],
    calcResult: { label: "Savings vs Current Path", format: "currency" },
    calcResults: [
      { key: "totalInterest", label: "Loan Interest", format: "currency" },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "addOnCosts", label: "Add-On Costs", format: "currency" },
      { key: "loanTotalCost", label: "Total Cost of the Loan", format: "currency" },
      { key: "currentPathInterest", label: "Interest on Your Current Path", format: "currency" },
      { key: "savingsVsCurrentPath", label: "Savings vs Current Path", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the debt you'll consolidate, the loan's rate, term, origination fee, and any monthly add-ons such as " +
      "optional credit insurance. Then enter your current average APR and monthly payment.\n\n" +
      "The tool adds up everything the loan costs beyond the debt itself and compares it with the interest you'd " +
      "pay by carrying on as you are.",
    examples:
      "Example: consolidating $20,000 at 11% over 48 months with a 5% fee means borrowing $21,052.63. Interest is " +
      "$5,064.95 and the fee $1,052.63 — $6,117.58 in total. Paying $600 a month at 22% would cost $11,192.20 in " +
      "interest, so the loan saves $5,074.62.",
    assumptions:
      "Assumes the fee is deducted from the proceeds and no new debt is added to the old accounts. If your current " +
      "payment doesn't cover the interest, the current path never ends and the comparison shows 0. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I buy credit insurance on the loan?",
        answer: "It's optional and adds to the cost. Compare it with term life or disability cover you may already have before adding it.",
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
