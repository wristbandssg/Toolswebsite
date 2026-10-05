// One-time (but safe to re-run) batch setup script: creates the Debt Settlement and Balance Transfer Loan tools
// (14) of the Loan Calculators expansion 5, filed under Finance Calculators > Credit & Debt Calculators.
// See src/lib/calc-engine-credit-debt-settlement-transfer.ts for the math and
// src/lib/calc-engine-loan-startup-business.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-credit-debt-settlement-transfer-calculators.ts
// or
//   npm run db:create-credit-debt-settlement-transfer-calculators

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
    slug: "debt-settlement-loan-calculator",
    title: "Debt Settlement Loan Calculator",
    description: "See what it costs to settle debts for less with a loan: the settlement amount, the debt forgiven, the loan payment, and the tax on forgiven debt.",
    metaTitle: "Debt Settlement Loan Calculator — Settle for Less",
    metaDescription: "Free debt settlement loan calculator. See the settlement amount, forgiven debt, loan payment, interest and tax on the forgiven debt.",
    calcInputs: [
      currencyField("debt", "Debt to Settle", { default: 20000, max: 1000000, step: 100 }),
      percentField("settlementPercent", "Settlement (% of Balance)", { default: 50, max: 100, step: 1 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 15, max: 36, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 84, step: 6 }),
      percentField("taxRatePercent", "Your Tax Rate", { default: 22, max: 60, step: 1, required: false }),
    ],
    calcResult: { label: "Loan Payment", format: "currency" },
    calcResults: [
      { key: "settlementAmount", label: "Settlement Amount", format: "currency" },
      { key: "debtForgiven", label: "Debt Forgiven", format: "currency" },
      { key: "loanPayment", label: "Loan Payment", format: "currency", highlight: true },
      { key: "loanInterest", label: "Loan Interest", format: "currency" },
      { key: "taxOnForgivenDebt", label: "Tax on Forgiven Debt", format: "currency" },
      { key: "totalCostToSettle", label: "Total Cost to Settle", format: "currency" },
    ],
    instructions:
      "Creditors sometimes accept a lump sum for less than the full balance on old or delinquent debts — often " +
      "30%–60%. Enter the debt, the settlement you expect, the loan you'd use to pay it, and your tax rate. Forgiven debt " +
      "of $600 or more is usually reported on Form 1099-C and taxed as income unless you're insolvent.",
    examples:
      "Example: settling $20,000 at 50% means paying $10,000, with $10,000 forgiven. A loan " +
      "for the settlement at 15% over 36 months costs $346.65 a month and $2,479.52 of " +
      "interest; tax on the forgiven debt is about $2,200. Total: $14,679.52.",
    assumptions:
      "Settlement isn't guaranteed and usually follows missed payments, which damage your credit for years. Not tax " +
      "advice. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does debt settlement hurt my credit?",
        answer: "Yes, usually significantly — settled accounts are reported as 'settled for less than owed', and settlement typically follows months of missed payments.",
      },
    ],
  },
  {
    slug: "debt-settlement-loan-payment-calculator",
    title: "Debt Settlement Loan Payment Calculator",
    description: "Estimate the monthly deposit for a debt settlement program: the settlements, the company's fee, and the total you'd pay over the program.",
    metaTitle: "Debt Settlement Program Payment Calculator",
    metaDescription: "Free debt settlement payment calculator. See the monthly program deposit, settlement amounts, program fees and total paid.",
    calcInputs: [
      currencyField("enrolledDebt", "Debt Enrolled in the Program", { default: 25000, max: 1000000, step: 100 }),
      percentField("settlementPercent", "Expected Settlement (% of Debt)", { default: 50, max: 100, step: 1 }),
      percentField("programFeePercent", "Program Fee (% of Enrolled Debt)", { default: 20, max: 50, step: 1 }),
      numberField("months", "Program Length (Months)", { default: 36, min: 6, max: 72, step: 1 }),
    ],
    calcResult: { label: "Monthly Deposit", format: "currency" },
    calcResults: [
      { key: "totalSettlements", label: "Total Paid to Creditors", format: "currency" },
      { key: "programFees", label: "Program Fees", format: "currency" },
      { key: "monthlyDeposit", label: "Monthly Deposit", format: "currency", highlight: true },
      { key: "totalPaid", label: "Total Paid", format: "currency" },
      { key: "shareOfDebtPaid", label: "Share of the Debt You Pay", format: "percentage" },
    ],
    instructions:
      "In a settlement program you stop paying creditors and deposit money each month into an account; the company " +
      "negotiates settlements once enough has built up. Enter the enrolled debt, the expected settlement, the fee " +
      "(often 15%–25% of enrolled debt, charged only after a debt is settled) and the program length.",
    examples:
      "Example: $25,000 enrolled, settled at 50%, means $12,500 to creditors plus " +
      "$5,000 in fees — $17,500 in total, or 70% of the debt. Over 36 months that's a " +
      "$486.11 monthly deposit.",
    assumptions:
      "All debts settle at the same rate; late fees and interest that build up before settlement aren't included; " +
      "tax on forgiven debt is extra. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can a debt settlement company charge fees upfront?",
        answer: "No — under the FTC's Telemarketing Sales Rule, for-profit settlement companies can't collect fees until they've settled a debt and you've made a payment on that settlement.",
      },
    ],
  },
  {
    slug: "debt-settlement-loan-payoff-calculator",
    title: "Debt Settlement Loan Payoff Calculator",
    description: "Compare paying a debt off in full at your current payment with settling it now for less — including the tax on the forgiven amount.",
    metaTitle: "Debt Settlement vs Paying in Full Calculator",
    metaDescription: "Free debt settlement payoff calculator. Compare paying a balance in full with settling it, including interest and tax on forgiven debt.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 15000, max: 1000000, step: 100 }),
      percentField("aprPercent", "APR", { default: 24, max: 40, step: 0.25 }),
      currencyField("monthlyPayment", "What You Can Pay Each Month", { default: 450, max: 100000, step: 5 }),
      percentField("settlementPercent", "Settlement Offer (% of Balance)", { default: 45, max: 100, step: 1 }),
      percentField("taxRatePercent", "Your Tax Rate", { default: 22, max: 60, step: 1, required: false }),
    ],
    calcResult: { label: "Savings With Settlement", format: "currency" },
    calcResults: [
      { key: "monthsToPayInFull", label: "Months to Pay in Full", format: "number" },
      { key: "interestPayingInFull", label: "Interest Paying in Full", format: "currency" },
      { key: "totalPayingInFull", label: "Total Paying in Full", format: "currency" },
      { key: "totalCostToSettle", label: "Settlement + Tax", format: "currency" },
      { key: "savingsWithSettlement", label: "Savings With Settlement", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the balance, its APR, what you can pay monthly, and a settlement offer. The savings in dollars can be " +
      "large, but they come at a real cost to your credit — weigh that, and consider a hardship plan or credit " +
      "counseling first.",
    examples:
      "Example: $15,000 at 24% paid at $450 a month takes 56 months and " +
      "$9,966.26 of interest — $24,966.26 in all. Settling at 45% costs " +
      "$8,565 with tax, saving $16,401.26 — at the cost of your credit.",
    assumptions:
      "Settlement paid as a lump sum today; no further charges on the debt. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a nonprofit debt management plan?",
        answer: "A credit counseling agency negotiates lower interest rates and you repay the full balance over 3–5 years in one payment — less damaging to credit than settlement.",
      },
    ],
  },
  {
    slug: "debt-settlement-loan-interest-calculator",
    title: "Debt Settlement Loan Interest Calculator",
    description: "See how much interest and late fees pile onto unpaid debts while you save up in a settlement program — and whether settling now with a loan costs less.",
    metaTitle: "Debt Settlement Interest — Settle Now vs Save Up",
    metaDescription: "Free debt settlement interest calculator. Compare interest and fees that build while saving with the interest on a loan to settle now.",
    calcInputs: [
      currencyField("debt", "Debt", { default: 20000, max: 1000000, step: 100 }),
      percentField("aprPercent", "Debt APR (Incl. Penalty Rate)", { default: 25, max: 40, step: 0.25 }),
      numberField("monthsSaving", "Months of Saving Before Settling", { default: 12, min: 0, max: 60, step: 1 }),
      currencyField("lateFeesPerMonth", "Late Fees per Month", { default: 80, max: 1000, step: 5, required: false }),
      percentField("settlementPercent", "Settlement (% of Balance)", { default: 50, max: 100, step: 1 }),
      percentField("loanRatePercent", "Loan Rate to Settle Now", { default: 15, max: 36, step: 0.25 }),
      numberField("loanTermMonths", "Loan Term (Months)", { default: 36, min: 6, max: 84, step: 6 }),
    ],
    calcResult: { label: "Savings Settling Now With a Loan", format: "currency" },
    calcResults: [
      { key: "debtAfterSaving", label: "Debt After the Saving Period", format: "currency" },
      { key: "extraSettlementCostFromWaiting", label: "Extra Settlement Cost From Waiting", format: "currency" },
      { key: "loanInterestToSettleNow", label: "Loan Interest to Settle Now", format: "currency" },
      { key: "savingsSettlingNowWithLoan", label: "Savings Settling Now With a Loan", format: "currency", highlight: true },
    ],
    instructions:
      "While you build up savings in a settlement program, unpaid debts keep growing with interest and late fees, so " +
      "the eventual settlement is bigger. Enter the debt and its APR, how long you'd save, monthly late fees, the " +
      "settlement percentage, and a loan you could use to settle now instead. A negative saving means waiting is " +
      "cheaper.",
    examples:
      "Example: $20,000 at 25% plus $80 a month of late fees grows to $26,574.63 over " +
      "12 months, adding $3,287.32 to a 50% settlement. A loan to settle " +
      "now costs $2,479.52 of interest — settling now saves $807.80.",
    assumptions:
      "Creditors accept the same percentage now or later — not guaranteed. Getting a loan with recent missed payments " +
      "can be hard. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do creditors charge interest during debt settlement?",
        answer: "Usually yes — until a settlement is agreed, interest and fees continue, and accounts may be sent to collections.",
      },
    ],
  },
  {
    slug: "debt-settlement-loan-affordability-calculator",
    title: "Debt Settlement Loan Affordability Calculator",
    description: "From the monthly payment you can afford, find the largest settlement loan and how much total debt it could settle.",
    metaTitle: "Debt Settlement Loan Affordability Calculator",
    metaDescription: "Free debt settlement loan affordability calculator. Turn your budget into a max loan and the amount of debt it could settle.",
    calcInputs: [
      currencyField("monthlyBudget", "Monthly Payment You Can Afford", { default: 400, max: 100000, step: 5 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 15, max: 36, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 84, step: 6 }),
      percentField("settlementPercent", "Expected Settlement (% of Debt)", { default: 50, min: 1, max: 100, step: 1 }),
    ],
    calcResult: { label: "Debt You Could Settle", format: "currency" },
    calcResults: [
      { key: "maxLoanAmount", label: "Maximum Loan", format: "currency" },
      { key: "maxDebtYouCanSettle", label: "Debt You Could Settle", format: "currency", highlight: true },
      { key: "totalRepaid", label: "Total Repaid on the Loan", format: "currency" },
    ],
    instructions:
      "Enter your monthly budget, the loan's rate and term, and the settlement percentage you expect. The calculator " +
      "finds the loan your budget repays and divides it by the settlement rate to see how much debt that could clear.",
    examples:
      "Example: $400 a month at 15% over 36 months repays a $11,538.91 loan. At a " +
      "50% settlement, that could settle about $23,077.81 of debt.",
    assumptions:
      "Settlement percentages vary by creditor and how old the debt is. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I negotiate a settlement myself?",
        answer: "Yes — many creditors and collectors negotiate directly. Get any agreement in writing before paying.",
      },
    ],
  },
  {
    slug: "debt-settlement-loan-comparison-calculator",
    title: "Debt Settlement Loan Comparison Calculator",
    description: "Compare a debt settlement program (settlements, fees and tax) with a debt consolidation loan that repays the full balance.",
    metaTitle: "Debt Settlement vs Debt Consolidation Loan Calculator",
    metaDescription: "Free debt settlement comparison calculator. Compare the total cost of a settlement program with a debt consolidation loan.",
    calcInputs: [
      currencyField("debt", "Total Debt", { default: 20000, max: 1000000, step: 100 }),
      percentField("settlementPercent", "Settlement (% of Debt)", { default: 50, max: 100, step: 1 }),
      percentField("programFeePercent", "Settlement Program Fee", { default: 20, max: 50, step: 1 }),
      percentField("taxRatePercent", "Your Tax Rate", { default: 22, max: 60, step: 1, required: false }),
      percentField("consolidationRatePercent", "Consolidation Loan Rate", { default: 13, max: 36, step: 0.25 }),
      numberField("consolidationTermMonths", "Consolidation Loan Term (Months)", { default: 48, min: 6, max: 84, step: 6 }),
      percentField("consolidationFeePercent", "Consolidation Loan Fee", { default: 5, max: 12, step: 0.25, required: false }),
    ],
    calcResult: { label: "Savings With Settlement", format: "currency" },
    calcResults: [
      { key: "settlementTotalCost", label: "Settlement — Total Cost (Incl. Fees & Tax)", format: "currency" },
      { key: "consolidationPayment", label: "Consolidation Loan — Monthly Payment", format: "currency" },
      { key: "consolidationTotalCost", label: "Consolidation Loan — Total Paid", format: "currency" },
      { key: "savingsWithSettlement", label: "Savings With Settlement", format: "currency", highlight: true },
    ],
    instructions:
      "A consolidation loan repays everything you owe at a lower rate and protects your credit if you keep up the " +
      "payments; settlement costs less in dollars but damages credit and isn't guaranteed. Enter both options' terms. " +
      "The consolidation loan is sized so the fee still leaves enough to pay all the debt.",
    examples:
      "Example: settling $20,000 at 50% with a 20% fee and tax costs $16,200. " +
      "A consolidation loan at 13% over 48 months costs $564.79 a " +
      "month and $27,109.89 in total. Settlement saves $10,909.89 — with a lasting credit hit.",
    assumptions:
      "Settlement in a lump; interest and late fees before settlement not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which is better for my credit?",
        answer: "Consolidation, if you make every payment — it can even help by lowering card utilization. Settlement usually lowers scores substantially.",
      },
    ],
  },
  {
    slug: "debt-settlement-loan-eligibility-calculator",
    title: "Debt Settlement Loan Eligibility Calculator",
    description: "Check whether debt settlement fits your situation — enough unsecured debt and real hardship — and whether insolvency would shield forgiven debt from tax.",
    metaTitle: "Debt Settlement Eligibility & Insolvency Calculator",
    metaDescription: "Free debt settlement eligibility calculator. Check program minimums and hardship, and estimate how much forgiven debt insolvency excludes from tax.",
    calcInputs: [
      currencyField("unsecuredDebt", "Unsecured Debt (Cards, Medical, Personal Loans)", { default: 20000, max: 10000000, step: 100 }),
      currencyField("programMinimum", "Program's Minimum Debt", { default: 7500, max: 100000, step: 500 }),
      {
        key: "hardship", label: "Facing Real Financial Hardship?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      currencyField("totalLiabilities", "Everything You Owe (All Debts)", { default: 60000, max: 100000000, step: 1000 }),
      currencyField("totalAssets", "Everything You Own (Fair Market Value)", { default: 45000, max: 100000000, step: 1000 }),
      currencyField("expectedForgiven", "Debt Expected to Be Forgiven", { default: 10000, max: 10000000, step: 100 }),
    ],
    calcResult: { label: "Checks Passed (of 3)", format: "number" },
    calcResults: [
      { key: "insolvencyAmount", label: "Amount You're Insolvent By", format: "currency" },
      { key: "forgivenDebtExcluded", label: "Forgiven Debt Excluded From Tax", format: "currency" },
      { key: "taxableForgivenDebt", label: "Forgiven Debt Still Taxable", format: "currency" },
      { key: "checksPassed", label: "Checks Passed (of 3)", format: "number", highlight: true },
    ],
    instructions:
      "Settlement programs usually want a minimum amount of unsecured debt and real hardship — creditors rarely settle " +
      "with someone who can pay. If your debts exceed your assets just before the debt is forgiven, you're insolvent, " +
      "and forgiven debt up to that amount is excluded from income (claimed on IRS Form 982).",
    examples:
      "Example: $20,000 of unsecured debt meets a $7,500 minimum; with hardship, 3 of 3 checks " +
      "pass. Owing $60,000 against $45,000 of assets makes you insolvent by $15,000, so " +
      "$10,000 of $10,000 forgiven is excluded and $0 remains taxable.",
    assumptions:
      "Assets include retirement accounts and other property at fair market value. Simplified — not tax or legal " +
      "advice. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I consider bankruptcy instead?",
        answer: "If debts are large relative to income, a consultation with a bankruptcy attorney or nonprofit credit counselor can show whether Chapter 7 or 13 would be better.",
      },
    ],
  },
  {
    slug: "balance-transfer-loan-calculator",
    title: "Balance Transfer Loan Calculator",
    description: "See whether moving a card balance to a 0% intro balance transfer card saves money after the transfer fee — paying the same amount each month until it's gone.",
    metaTitle: "Balance Transfer Calculator — Is It Worth It?",
    metaDescription: "Free balance transfer calculator. Compare staying on your card with a 0% balance transfer after the fee and see your total savings.",
    calcInputs: [
      currencyField("balance", "Card Balance to Transfer", { default: 8000, max: 100000, step: 100 }),
      percentField("currentAprPercent", "Current Card APR", { default: 24, max: 40, step: 0.25 }),
      percentField("transferFeePercent", "Balance Transfer Fee", { default: 3, max: 6, step: 0.25 }),
      numberField("promoMonths", "0% Intro Period (Months)", { default: 18, min: 0, max: 24, step: 1 }),
      percentField("postPromoAprPercent", "APR After the Intro Period", { default: 22, max: 40, step: 0.25 }),
      currencyField("monthlyPayment", "What You'll Pay Each Month", { default: 400, max: 100000, step: 5 }),
    ],
    calcResult: { label: "Savings With the Transfer", format: "currency" },
    calcResults: [
      { key: "transferFee", label: "Transfer Fee", format: "currency" },
      { key: "interestIfYouStay", label: "Interest If You Stay", format: "currency" },
      { key: "interestAfterTransfer", label: "Interest After the Transfer", format: "currency" },
      { key: "monthsToPayoffAfterTransfer", label: "Months to Payoff After Transfer", format: "number" },
      { key: "savingsWithTransfer", label: "Savings With the Transfer", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your balance and current APR, the new card's transfer fee, intro period and later APR, and what you'll pay " +
      "each month either way. The fee is added to the new balance. Savings are biggest when you can clear most of the " +
      "balance during the intro period.",
    examples:
      "Example: $8,000 at 24% paid at $400 a month costs $2,318.98 of interest. " +
      "Transferring costs a $240 fee and $36.12 of interest, and it's paid off in " +
      "21 months — saving $2,042.86.",
    assumptions:
      "No new purchases on either card (new purchases may not get 0%); APRs stay the same. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do balance transfers hurt your credit?",
        answer: "Applying adds a hard inquiry and a new account, a small temporary dip. Paying the balance down then lowers utilization, which usually helps.",
      },
    ],
  },
  {
    slug: "balance-transfer-loan-payment-calculator",
    title: "Balance Transfer Loan Payment Calculator",
    description: "Find the monthly payment that clears a transferred balance, including the transfer fee, before the 0% intro period ends.",
    metaTitle: "Balance Transfer Payment Calculator — Clear It in Time",
    metaDescription: "Free balance transfer payment calculator. See the monthly payment needed to pay off a transferred balance before the 0% period ends.",
    calcInputs: [
      currencyField("balance", "Balance Transferred", { default: 6000, max: 100000, step: 100 }),
      percentField("transferFeePercent", "Balance Transfer Fee", { default: 3, max: 6, step: 0.25 }),
      numberField("promoMonths", "0% Intro Period (Months)", { default: 15, min: 1, max: 24, step: 1 }),
    ],
    calcResult: { label: "Payment to Clear It in the Intro Period", format: "currency" },
    calcResults: [
      { key: "transferFee", label: "Transfer Fee", format: "currency" },
      { key: "newCardBalance", label: "New Card Balance", format: "currency" },
      { key: "paymentToClearInPromo", label: "Payment to Clear It in the Intro Period", format: "currency", highlight: true },
      { key: "weeklyEquivalent", label: "Weekly Equivalent", format: "currency" },
    ],
    instructions:
      "Enter the balance you're moving, the fee and the intro period. Divide-and-pay is the simplest plan: make this " +
      "payment every month (set up autopay) and the balance is gone before interest starts.",
    examples:
      "Example: transferring $6,000 with a 3% fee makes the new balance $6,180. Paying " +
      "$412 a month (about $95.08 a week) clears it within 15 months.",
    assumptions:
      "No new purchases; the minimum payment the issuer requires may be lower — pay this instead. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I can't pay it all off during the intro period?",
        answer: "The remaining balance starts accruing interest at the regular APR. You could transfer again, but each move costs another fee.",
      },
    ],
  },
  {
    slug: "balance-transfer-loan-payoff-calculator",
    title: "Balance Transfer Loan Payoff Calculator",
    description: "At the payment you plan to make, see what's left when the 0% period ends, how many months until it's paid off, and the interest you'll pay after.",
    metaTitle: "Balance Transfer Payoff Calculator — After the Intro",
    metaDescription: "Free balance transfer payoff calculator. See the balance when the 0% intro ends, months to payoff and the interest afterward.",
    calcInputs: [
      currencyField("balance", "Balance Transferred", { default: 9000, max: 100000, step: 100 }),
      percentField("transferFeePercent", "Balance Transfer Fee", { default: 3, max: 6, step: 0.25 }),
      numberField("promoMonths", "0% Intro Period (Months)", { default: 18, min: 0, max: 24, step: 1 }),
      percentField("postPromoAprPercent", "APR After the Intro Period", { default: 23, max: 40, step: 0.25 }),
      currencyField("monthlyPayment", "Your Monthly Payment", { default: 350, max: 100000, step: 5 }),
    ],
    calcResult: { label: "Months to Payoff", format: "number" },
    calcResults: [
      { key: "newCardBalance", label: "New Card Balance (With Fee)", format: "currency" },
      { key: "balanceWhenPromoEnds", label: "Balance When the Intro Ends", format: "currency" },
      { key: "monthsToPayoff", label: "Months to Payoff", format: "number", highlight: true },
      { key: "interestAfterPromo", label: "Interest Paid After the Intro", format: "currency" },
    ],
    instructions:
      "Enter the balance, fee, intro length, the APR afterward and what you'll pay each month. If a balance is left " +
      "when the intro ends, consider raising your payment now.",
    examples:
      "Example: $9,000 plus the fee is $9,270. Paying $350 a month leaves $2,970 when " +
      "the 18-month intro ends; at 23% after that, it's paid off in 28 months with " +
      "$303.11 of interest.",
    assumptions:
      "No new purchases; APR stays the same after the intro. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is the intro rate lost if I pay late?",
        answer: "Often yes — many cards end the 0% intro after a late payment and may apply a penalty APR. Autopay helps avoid that.",
      },
    ],
  },
  {
    slug: "balance-transfer-loan-interest-calculator",
    title: "Balance Transfer Loan Interest Calculator",
    description: "Compare the interest a 0% balance transfer avoids during the intro period with its upfront fee, and see the month the transfer pays for itself.",
    metaTitle: "Balance Transfer Interest Calculator — Fee Break-Even",
    metaDescription: "Free balance transfer interest calculator. See interest avoided during the 0% period, net savings after the fee, and the break-even month.",
    calcInputs: [
      currencyField("balance", "Balance", { default: 8000, max: 100000, step: 100 }),
      percentField("currentAprPercent", "Current Card APR", { default: 24, max: 40, step: 0.25 }),
      percentField("transferFeePercent", "Balance Transfer Fee", { default: 3, max: 6, step: 0.25 }),
      numberField("promoMonths", "0% Intro Period (Months)", { default: 18, min: 0, max: 24, step: 1 }),
      currencyField("monthlyPayment", "Your Monthly Payment", { default: 400, max: 100000, step: 5 }),
    ],
    calcResult: { label: "Net Interest Savings", format: "currency" },
    calcResults: [
      { key: "transferFee", label: "Transfer Fee", format: "currency" },
      { key: "interestAvoidedDuringPromo", label: "Interest Avoided During the Intro", format: "currency" },
      { key: "netInterestSavings", label: "Net Interest Savings", format: "currency", highlight: true },
      { key: "breakEvenMonth", label: "Month the Transfer Pays for Itself", format: "number" },
    ],
    instructions:
      "Enter your balance and current APR, the fee, the intro length and your payment. The calculator adds up the " +
      "interest you'd have paid on your current card during those months and compares it with the fee. A break-even " +
      "month of 0 means the fee is never recovered.",
    examples:
      "Example: on $8,000 at 24%, paying $400 a month, you'd pay $2,061.05 " +
      "of interest over 18 months. The transfer fee is $240, so you net $1,821.05; the " +
      "transfer pays for itself in month 2.",
    assumptions:
      "Only the intro period is counted; see the balance transfer calculator for the full payoff comparison. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are there balance transfer cards with no fee?",
        answer: "A few — often from credit unions — but they usually have shorter intro periods. Compare fee vs months of 0%.",
      },
    ],
  },
  {
    slug: "balance-transfer-loan-affordability-calculator",
    title: "Balance Transfer Loan Affordability Calculator",
    description: "Work out how much you can actually move to a new balance transfer card — limited by its credit limit (fee included) and by what you can clear in the intro period.",
    metaTitle: "How Much Can I Balance Transfer? Calculator",
    metaDescription: "Free balance transfer affordability calculator. See the max you can transfer within the credit limit and what your budget clears in time.",
    calcInputs: [
      currencyField("creditLimit", "New Card's Credit Limit", { default: 7500, max: 100000, step: 100 }),
      percentField("transferFeePercent", "Balance Transfer Fee", { default: 3, max: 6, step: 0.25 }),
      numberField("promoMonths", "0% Intro Period (Months)", { default: 18, min: 1, max: 24, step: 1 }),
      currencyField("monthlyBudget", "What You Can Pay Each Month", { default: 350, max: 100000, step: 5 }),
    ],
    calcResult: { label: "Recommended Transfer", format: "currency" },
    calcResults: [
      { key: "maxTransferByLimit", label: "Most That Fits the Limit (With Fee)", format: "currency" },
      { key: "maxYouCanClearInPromo", label: "Most You Can Clear in the Intro", format: "currency" },
      { key: "recommendedTransfer", label: "Recommended Transfer", format: "currency", highlight: true },
      { key: "feeOnRecommended", label: "Fee on That Amount", format: "currency" },
    ],
    instructions:
      "The transfer plus its fee must fit within the new card's limit — and you'll only get the full benefit on what you " +
      "can pay off before the intro ends. Enter the limit, fee, intro length and your monthly budget.",
    examples:
      "Example: a $7,500 limit with a 3% fee lets you move up to $7,281.55. Paying " +
      "$350 a month for 18 months clears about $6,116.50. Transferring $6,116.50 " +
      "(a $183.50 fee) is the sweet spot.",
    assumptions:
      "No new purchases on the card. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I transfer a balance between cards from the same bank?",
        answer: "Usually not — issuers generally don't allow transfers between their own cards.",
      },
    ],
  },
  {
    slug: "balance-transfer-loan-comparison-calculator",
    title: "Balance Transfer Loan Comparison Calculator",
    description: "Compare a 0% balance transfer card with a personal loan for paying off card debt at the same monthly payment — total cost and time to be debt-free.",
    metaTitle: "Balance Transfer vs Personal Loan Calculator",
    metaDescription: "Free balance transfer vs personal loan calculator. Compare total cost and months to payoff at the same monthly payment.",
    calcInputs: [
      currencyField("balance", "Card Debt", { default: 10000, max: 100000, step: 100 }),
      currencyField("monthlyPayment", "What You'll Pay Each Month", { default: 400, max: 100000, step: 5 }),
      percentField("transferFeePercent", "Balance Transfer Fee", { default: 3, max: 6, step: 0.25 }),
      numberField("promoMonths", "0% Intro Period (Months)", { default: 15, min: 0, max: 24, step: 1 }),
      percentField("postPromoAprPercent", "Card APR After the Intro", { default: 24, max: 40, step: 0.25 }),
      percentField("loanRatePercent", "Personal Loan Rate", { default: 12, max: 36, step: 0.25 }),
      percentField("loanFeePercent", "Personal Loan Origination Fee", { default: 5, max: 12, step: 0.25, required: false }),
    ],
    calcResult: { label: "Savings With the Transfer Card", format: "currency" },
    calcResults: [
      { key: "cardTotalCost", label: "Transfer Card — Total Cost", format: "currency" },
      { key: "cardMonthsToPayoff", label: "Transfer Card — Months to Payoff", format: "number" },
      { key: "loanTotalCost", label: "Personal Loan — Total Cost", format: "currency" },
      { key: "loanMonthsToPayoff", label: "Personal Loan — Months to Payoff", format: "number" },
      { key: "savingsWithTransferCard", label: "Savings With the Transfer Card", format: "currency", highlight: true },
    ],
    instructions:
      "Both pay off card debt; the transfer card is usually cheaper if you can clear most of it in the intro period, " +
      "while a personal loan gives a fixed rate and end date. Enter your debt, payment and each option's terms. A " +
      "negative saving means the personal loan is cheaper.",
    examples:
      "Example: $10,000 paid at $400 a month costs $890.38 on a transfer card (28 " +
      "months) vs $2,276.67 with a personal loan at 12% (31 months). The transfer card " +
      "saves $1,386.29.",
    assumptions:
      "The personal loan is sized so its fee still leaves enough to repay the cards; equal monthly payments on both; no " +
      "new card spending. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which is easier to qualify for?",
        answer: "0% transfer cards usually need good credit (around 670+). Personal loans are available across more credit levels, at higher rates for lower scores.",
      },
    ],
  },
  {
    slug: "balance-transfer-loan-eligibility-calculator",
    title: "Balance Transfer Loan Eligibility Calculator",
    description: "Check how likely you are to be approved for a 0% balance transfer card: credit score, credit utilization, and recent credit applications.",
    metaTitle: "Balance Transfer Card Eligibility Calculator",
    metaDescription: "Free balance transfer eligibility calculator. Check credit score, card utilization and recent inquiries against typical approval rules.",
    calcInputs: [
      numberField("creditScore", "Your Credit Score", { default: 690, min: 300, max: 850, step: 1 }),
      currencyField("totalCardBalances", "Total Card Balances", { default: 9000, max: 1000000, step: 100 }),
      currencyField("totalCardLimits", "Total Card Credit Limits", { default: 20000, max: 1000000, step: 100 }),
      numberField("inquiriesLast12Months", "Credit Applications in the Last 12 Months", { default: 1, min: 0, max: 50, step: 1 }),
    ],
    calcResult: { label: "Checks Passed (of 3)", format: "number" },
    calcResults: [
      { key: "creditUtilization", label: "Credit Utilization", format: "percentage" },
      { key: "checksPassed", label: "Checks Passed (of 3)", format: "number", highlight: true },
    ],
    instructions:
      "Issuers look for good credit, manageable balances and not too many recent applications. The three checks: a " +
      "score of 670+; utilization of 50% or less; and no more than 2 applications in the past year. Many issuers offer " +
      "prequalification with a soft check.",
    examples:
      "Example: $9,000 of balances on $20,000 of limits is 45% utilization. With a " +
      "690 score and 1 recent application, 3 of 3 checks pass.",
    assumptions:
      "Typical guidelines; approval and the credit limit you get vary by issuer. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I'm not approved for a balance transfer card?",
        answer: "Consider a debt consolidation loan, a credit union card with a lower ongoing rate, or a nonprofit debt management plan.",
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
