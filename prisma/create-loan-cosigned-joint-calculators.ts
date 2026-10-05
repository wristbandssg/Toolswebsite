// One-time (but safe to re-run) batch setup script: creates the 14 tools
// of the Loan Calculators expansion 2, sub-batch 5 (Cosigned & Joint Loans),
// filed under Finance Calculators > Loan Calculators > General Loan Calculators. See src/lib/calc-engine-loan-cosigned-joint.ts for
// the math and src/lib/calc-engine-loan-life-events.ts for the full batch
// context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-cosigned-joint-calculators.ts
// or
//   npm run db:create-loan-cosigned-joint-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "loan-calculators";
const CATEGORY = { name: "General Loan Calculators", slug: "general-loan-calculators" };

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
    slug: "cosigned-loan-calculator",
    title: "Cosigned Loan Calculator",
    description: "See how much more you could borrow — and at what rate — when a cosigner's income and debts are counted alongside yours.",
    metaTitle: "Cosigned Loan Calculator — Borrowing Power With a Cosigner",
    metaDescription: "Free cosigned loan calculator. Compare the largest loan you can get alone with the amount and rate available with a cosigner.",
    calcInputs: [
      currencyField("borrowerIncome", "Your Gross Monthly Income", { default: 3200, max: 1000000, step: 100 }),
      currencyField("borrowerDebts", "Your Monthly Debt Payments", { default: 900, max: 1000000, step: 25 }),
      currencyField("cosignerIncome", "Cosigner's Gross Monthly Income", { default: 7000, max: 1000000, step: 100 }),
      currencyField("cosignerDebts", "Cosigner's Monthly Debt Payments", { default: 2000, max: 1000000, step: 25 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 40, max: 60, step: 1 }),
      percentField("rateAlonePercent", "Rate Offered to You Alone", { default: 22, max: 40, step: 0.05 }),
      percentField("rateCosignedPercent", "Rate With the Cosigner", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 120, step: 6 }),
    ],
    calcResult: { label: "Extra Borrowing Power", format: "currency" },
    calcResults: [
      { key: "maxPaymentAlone", label: "Alone — Maximum Payment", format: "currency" },
      { key: "maxLoanAlone", label: "Alone — Maximum Loan", format: "currency" },
      { key: "maxPaymentWithCosigner", label: "With Cosigner — Maximum Payment", format: "currency" },
      { key: "maxLoanWithCosigner", label: "With Cosigner — Maximum Loan", format: "currency" },
      { key: "extraBorrowingPower", label: "Extra Borrowing Power", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your income and monthly debts, the cosigner's income and debts, the lender's DTI limit, the rate you'd " +
      "get on your own and with the cosigner, and the term. Many lenders count both people's income and debts when " +
      "there's a cosigner, and price the loan on the stronger credit profile.",
    examples:
      "Example: on $3,200 a month with $900 of debts and a 40% DTI limit, you can afford $380 a month — a $12,061.16 " +
      "loan at 22% over 48 months. With a cosigner earning $7,000 with $2,000 of debts, the room grows to $1,180 a " +
      "month and the rate falls to 12%, supporting $44,809.27 — $32,748.11 more.",
    assumptions:
      "Lenders differ in how they count a cosigner's income. Borrowing the maximum isn't the same as being able to " +
      "afford it. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What does a cosigner agree to?",
        answer: "To repay the full loan if you don't. Late payments appear on both credit reports, and the lender can pursue the cosigner without first chasing you in many states.",
      },
    ],
  },
  {
    slug: "cosigned-loan-payment-calculator",
    title: "Cosigned Loan Payment Calculator",
    description: "For a cosigner: see the monthly payment you're guaranteeing, how it changes your own debt-to-income ratio, and what you'd owe if the borrower stopped paying.",
    metaTitle: "Cosigned Loan Payment Calculator — Cosigner's Risk",
    metaDescription: "Free cosigned loan payment calculator for cosigners. See the payment you guarantee, your DTI with it, and the balance you'd owe if payments stop.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 10000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 360, step: 6 }),
      currencyField("cosignerIncome", "Cosigner's Gross Monthly Income", { default: 7000, max: 1000000, step: 100 }),
      currencyField("cosignerDebts", "Cosigner's Own Monthly Debts", { default: 2000, max: 1000000, step: 25 }),
      numberField("monthsBeforeMissed", "If the Borrower Stops Paying After (Months)", { default: 18, min: 0, max: 360, step: 1 }),
    ],
    calcResult: { label: "Balance If Payments Stop", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment You're Guaranteeing", format: "currency" },
      { key: "cosignerDtiBefore", label: "Your DTI Now", format: "percentage" },
      { key: "cosignerDtiAfter", label: "Your DTI With the Loan Counted", format: "percentage" },
      { key: "balanceIfPaymentsStop", label: "Balance If Payments Stop", format: "currency", highlight: true },
      { key: "paymentsLeftForCosigner", label: "Payments You'd Have Left to Make", format: "number" },
    ],
    instructions:
      "If you're asked to cosign, enter the loan's amount, rate, and term, your own income and monthly debts, and a " +
      "point at which the borrower might stop paying. Lenders usually count a cosigned loan's payment in YOUR " +
      "debt-to-income ratio when you apply for credit yourself.",
    examples:
      "Example: cosigning a $15,000 loan at 12% over 48 months means guaranteeing $395.01 a month. On $7,000 of income " +
      "with $2,000 of debts, your DTI rises from 28.57% to 34.21%. If the borrower stopped after 18 months, you'd owe " +
      "$10,194.24 — 30 more payments.",
    assumptions:
      "Ignores late fees and collection costs, which can add to what's owed. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I limit my risk as a cosigner?",
        answer: "Ask the lender to notify you of missed payments, get online access to the account, keep enough savings to cover a few payments, and ask whether the loan offers cosigner release.",
      },
    ],
  },
  {
    slug: "cosigned-loan-payoff-calculator",
    title: "Cosigned Loan Payoff Calculator",
    description: "See the balance when a cosigner can be released after a run of on-time payments, and how extra payments pay the loan off sooner.",
    metaTitle: "Cosigned Loan Payoff Calculator — Cosigner Release",
    metaDescription: "Free cosigned loan payoff calculator. See the balance at cosigner release and how extra payments shorten the loan and cut interest.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 20000, max: 10000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 6, max: 360, step: 6 }),
      numberField("paymentsForRelease", "On-Time Payments Needed for Release", { default: 24, min: 0, max: 120, step: 1 }),
      currencyField("extraMonthly", "Extra Monthly Payment", { default: 100, max: 100000, step: 10, required: false }),
    ],
    calcResult: { label: "Balance at Cosigner Release", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "balanceAtRelease", label: "Balance at Cosigner Release", format: "currency", highlight: true },
      { key: "monthsToPayoffWithExtra", label: "Months to Pay Off With Extra", format: "number", unit: "months" },
      { key: "interestSavedWithExtra", label: "Interest Saved With Extra", format: "currency" },
    ],
    instructions:
      "Some lenders (especially private student lenders) release a cosigner after a set number of consecutive on-time " +
      "payments — often 12 to 48 — if the borrower then qualifies alone. Enter the loan, rate, term, the payments " +
      "needed for release, and any extra the borrower can pay. Refinancing into the borrower's name alone is the other " +
      "way to free a cosigner.",
    examples:
      "Example: a $20,000 loan at 10% over 60 months costs $424.94 a month. After 24 on-time payments, $13,169.44 would " +
      "still be owed when the cosigner is released. Paying $100 extra ends the loan in 47 months and saves $1,333.80.",
    assumptions:
      "Release usually also requires a credit check of the borrower. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does cosigner release happen automatically?",
        answer: "Usually not — the borrower has to apply once eligible. Keep a record of payments and check the lender's rules early.",
      },
    ],
  },
  {
    slug: "cosigned-loan-interest-calculator",
    title: "Cosigned Loan Interest Calculator",
    description: "Compare the interest you'd pay on a loan at the rate offered to you alone with the lower rate a cosigner could get you.",
    metaTitle: "Cosigned Loan Interest Calculator — Interest Saved",
    metaDescription: "Free cosigned loan interest calculator. Compare payments and total interest at your own rate and at the lower cosigned rate.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 10000000, step: 250 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 360, step: 6 }),
      percentField("rateAlonePercent", "Rate Offered to You Alone", { default: 22, max: 40, step: 0.05 }),
      percentField("rateCosignedPercent", "Rate With a Cosigner", { default: 12, max: 40, step: 0.05 }),
    ],
    calcResult: { label: "Interest Saved", format: "currency" },
    calcResults: [
      { key: "paymentAlone", label: "Alone — Monthly Payment", format: "currency" },
      { key: "paymentCosigned", label: "Cosigned — Monthly Payment", format: "currency" },
      { key: "interestAlone", label: "Alone — Total Interest", format: "currency" },
      { key: "interestCosigned", label: "Cosigned — Total Interest", format: "currency" },
      { key: "interestSaved", label: "Interest Saved", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan amount and term, the rate you were offered alone, and the rate offered with a cosigner. The gap " +
      "shows what the cosigner's credit is worth to you — and the risk they take on to save it.",
    examples:
      "Example: $15,000 over 48 months at 22% costs $472.59 a month and $7,684.38 of interest. With a cosigner at 12%, " +
      "it's $395.01 a month and $3,960.36 — $3,724.01 saved.",
    assumptions:
      "Assumes fixed rates and no fees. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are there ways to get a lower rate without a cosigner?",
        answer: "A secured loan (backed by savings or a car), a credit union loan, a smaller amount, or a few months of building credit first can all lower the rate.",
      },
    ],
  },
  {
    slug: "cosigned-loan-affordability-calculator",
    title: "Cosigned Loan Affordability Calculator",
    description: "For a would-be cosigner: find the largest payment and loan you could guarantee while keeping your own debt-to-income ratio under a limit.",
    metaTitle: "Cosigned Loan Affordability Calculator — For Cosigners",
    metaDescription: "Free calculator for cosigners. Find the largest payment and loan you can guarantee while staying under a DTI limit.",
    calcInputs: [
      currencyField("cosignerIncome", "Your Gross Monthly Income", { default: 7000, max: 1000000, step: 100 }),
      currencyField("cosignerDebts", "Your Monthly Debt Payments", { default: 2000, max: 1000000, step: 25 }),
      percentField("maxDtiPercent", "DTI Limit You Want to Stay Under", { default: 43, max: 60, step: 1 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 360, step: 6 }),
    ],
    calcResult: { label: "Largest Loan to Cosign", format: "currency" },
    calcResults: [
      { key: "cosignerDtiNow", label: "Your DTI Now", format: "percentage" },
      { key: "maxPaymentToGuarantee", label: "Largest Payment to Guarantee", format: "currency" },
      { key: "maxLoanToCosign", label: "Largest Loan to Cosign", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your own income and debts, the DTI limit you want to protect (lenders often use 36%–43% for mortgages), and " +
      "the loan's rate and term. Because the cosigned payment counts against you, cosigning can stop you qualifying for " +
      "your own mortgage or car loan later — this shows how much room you really have.",
    examples:
      "Example: on $7,000 a month with $2,000 of debts (28.57% DTI) and a 43% limit, you could guarantee up to $1,010 a " +
      "month — a $38,353.70 loan at 12% over 48 months.",
    assumptions:
      "A planning limit, not advice to cosign that much. Only cosign an amount you could afford to repay yourself. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Will cosigning affect my credit score?",
        answer: "The loan appears on your credit report, so it affects your debts and, if payments are missed, your payment history. On-time payments don't usually raise your score much.",
      },
    ],
  },
  {
    slug: "cosigned-loan-comparison-calculator",
    title: "Cosigned Loan Comparison Calculator",
    description: "Compare three ways to borrow with weak credit: on your own, with a cosigner, or with a loan secured by your savings.",
    metaTitle: "Cosigned Loan Comparison — Alone vs Cosigner vs Secured",
    metaDescription: "Free comparison calculator: borrow alone, with a cosigner, or with a savings-secured loan. See interest and the secured loan's net cost.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 10000, max: 10000000, step: 250 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 120, step: 6 }),
      percentField("rateAlonePercent", "Rate on Your Own", { default: 24, max: 40, step: 0.05 }),
      percentField("rateCosignedPercent", "Rate With a Cosigner", { default: 12, max: 40, step: 0.05 }),
      percentField("rateSecuredPercent", "Savings-Secured Loan Rate", { default: 8, max: 40, step: 0.05 }),
      percentField("savingsApyPercent", "Savings Account APY", { default: 4, max: 15, step: 0.05 }),
    ],
    calcResult: { label: "Secured Loan Net Cost", format: "currency" },
    calcResults: [
      { key: "interestAlone", label: "On Your Own — Interest", format: "currency" },
      { key: "interestCosigned", label: "With Cosigner — Interest", format: "currency" },
      { key: "interestSecured", label: "Savings-Secured — Interest", format: "currency" },
      { key: "savingsInterestEarned", label: "Savings-Secured — Interest Your Savings Earn", format: "currency" },
      { key: "securedNetCost", label: "Secured Loan Net Cost", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the amount, term, and the rates for each option. A savings-secured (share-secured) loan uses your own " +
      "savings as collateral: they stay in the account earning interest, so the real cost is the loan interest minus " +
      "what the savings earn. It only works if you have the savings, but it doesn't put anyone else at risk.",
    examples:
      "Example: $10,000 over 36 months costs $4,123.83 of interest alone at 24%, or $1,957.15 with a cosigner at 12%. A " +
      "savings-secured loan at 8% costs $1,281.09, while the pledged savings earn $1,248.64 at 4% — a net cost of just " +
      "$32.45.",
    assumptions:
      "Savings interest compounds yearly at the stated APY. Credit unions often price share-secured loans a few points " +
      "above the savings rate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why borrow against my own savings?",
        answer: "It builds credit history at a very low net cost, keeps your savings intact, and avoids asking someone to cosign.",
      },
    ],
  },
  {
    slug: "cosigned-loan-eligibility-calculator",
    title: "Cosigned Loan Eligibility Calculator",
    description: "Check a cosigned loan application from both sides: the borrower's and the cosigner's debt-to-income ratios and credit scores against a lender's limits.",
    metaTitle: "Cosigned Loan Eligibility Calculator — Free",
    metaDescription: "Free cosigned loan eligibility calculator. Check the borrower's and cosigner's DTI and credit scores against a lender's guidelines.",
    calcInputs: [
      numberField("borrowerScore", "Borrower's Credit Score", { default: 600, min: 300, max: 850, step: 1 }),
      numberField("cosignerScore", "Cosigner's Credit Score", { default: 740, min: 300, max: 850, step: 1 }),
      numberField("lenderMinScore", "Lender's Minimum Score", { default: 660, min: 300, max: 850, step: 1 }),
      currencyField("borrowerIncome", "Borrower's Gross Monthly Income", { default: 3200, max: 1000000, step: 100 }),
      currencyField("borrowerDebts", "Borrower's Monthly Debts", { default: 900, max: 1000000, step: 25 }),
      currencyField("cosignerIncome", "Cosigner's Gross Monthly Income", { default: 7000, max: 1000000, step: 100 }),
      currencyField("cosignerDebts", "Cosigner's Monthly Debts", { default: 2000, max: 1000000, step: 25 }),
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 10000000, step: 250 }),
      percentField("annualRatePercent", "Expected Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 360, step: 6 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 40, max: 60, step: 1 }),
    ],
    calcResult: { label: "Cosigner's DTI With the Loan", format: "percentage" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "borrowerDtiPercent", label: "Borrower's DTI With the Loan", format: "percentage" },
      { key: "cosignerDtiPercent", label: "Cosigner's DTI With the Loan", format: "percentage", highlight: true },
      { key: "cosignerDtiHeadroom", label: "Cosigner's Room Under DTI Limit", format: "percentage" },
      { key: "borrowerScoreMargin", label: "Borrower — Points Above Minimum", format: "number" },
      { key: "cosignerScoreMargin", label: "Cosigner — Points Above Minimum", format: "number" },
    ],
    instructions:
      "Enter both people's credit scores, incomes, and debts, the loan, and the lender's limits. A lender typically " +
      "needs the cosigner to qualify on their own — score above the minimum and DTI under the limit with this payment " +
      "added — even when the borrower falls short. Negative numbers show where each person misses a guideline.",
    examples:
      "Example: a $15,000 loan at 12% over 48 months costs $395.01. The borrower's DTI would be 40.47% and their 600 " +
      "score is 60 below a 660 minimum, so they'd struggle alone. The cosigner's DTI with the loan is 34.21%, 5.79 " +
      "under 40%, and their 740 score is 80 above the minimum.",
    assumptions:
      "Lenders apply their own rules for cosigned applications. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can anyone be a cosigner?",
        answer: "Usually a cosigner needs good credit, steady income, and enough room in their own budget. Some lenders require them to be a family member or US resident.",
      },
    ],
  },
  {
    slug: "joint-loan-calculator",
    title: "Joint Loan Calculator",
    description: "Compare how much each person could borrow alone with how much you could borrow together on a joint loan.",
    metaTitle: "Joint Loan Calculator — Borrowing Power Together",
    metaDescription: "Free joint loan calculator. Compare each person's maximum loan alone with the maximum joint loan using combined income and debts.",
    calcInputs: [
      currencyField("income1", "Person 1 Gross Monthly Income", { default: 5000, max: 1000000, step: 100 }),
      currencyField("income2", "Person 2 Gross Monthly Income", { default: 4000, max: 1000000, step: 100 }),
      currencyField("debts1", "Person 1 Monthly Debts", { default: 1200, max: 1000000, step: 25 }),
      currencyField("debts2", "Person 2 Monthly Debts", { default: 600, max: 1000000, step: 25 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 40, max: 60, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 6, max: 360, step: 6 }),
    ],
    calcResult: { label: "Maximum Joint Loan", format: "currency" },
    calcResults: [
      { key: "maxLoanPerson1", label: "Person 1 Alone — Maximum Loan", format: "currency" },
      { key: "maxLoanPerson2", label: "Person 2 Alone — Maximum Loan", format: "currency" },
      { key: "maxLoanJoint", label: "Maximum Joint Loan", format: "currency", highlight: true },
      { key: "extraVsHigherAlone", label: "Extra vs the Higher Single Amount", format: "currency" },
    ],
    instructions:
      "Enter each person's gross income and monthly debts, the lender's DTI limit, and the rate and term. On a joint " +
      "loan, the lender adds both incomes and both sets of debts, so you can usually borrow more than either of you " +
      "could alone — and both of you are fully responsible for all of it.",
    examples:
      "Example: with a 40% DTI limit at 11% over 60 months, person 1 ($5,000 income, $1,200 debts) could borrow " +
      "$36,794.43 alone and person 2 ($4,000, $600) $45,993.03. Together they could borrow $82,787.46 — $36,794.43 more " +
      "than the higher single amount.",
    assumptions:
      "Assumes both qualify at the same rate; lenders often price a joint loan on the lower credit score. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between a joint loan and a cosigned loan?",
        answer: "Joint borrowers both get the money and share ownership of whatever it buys. A cosigner only guarantees the debt and usually has no claim on the money or the item.",
      },
    ],
  },
  {
    slug: "joint-loan-payment-calculator",
    title: "Joint Loan Payment Calculator",
    description: "Split a joint loan's monthly payment by an agreed share, and check whether one person could afford the full payment alone if they had to.",
    metaTitle: "Joint Loan Payment Calculator — Split the Payment",
    metaDescription: "Free joint loan payment calculator. Split the payment by an agreed share and see one person's DTI if they had to pay it all.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 25000, max: 10000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 6, max: 360, step: 6 }),
      percentField("person1SharePercent", "Person 1's Share of the Payment", { default: 60, max: 100, step: 5 }),
      currencyField("person1Income", "Person 1 Gross Monthly Income", { default: 5000, max: 1000000, step: 100 }),
      currencyField("person1Debts", "Person 1 Other Monthly Debts", { default: 1200, max: 1000000, step: 25 }),
    ],
    calcResult: { label: "Person 1's Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "person1Payment", label: "Person 1's Payment", format: "currency", highlight: true },
      { key: "person2Payment", label: "Person 2's Payment", format: "currency" },
      { key: "person1DtiIfPayingAll", label: "Person 1's DTI If Paying It All", format: "percentage" },
    ],
    instructions:
      "Enter the loan, rate, and term, the share person 1 will pay, and person 1's income and other debts. Each joint " +
      "borrower is legally liable for the whole payment, so the last line checks whether person 1 could carry it alone " +
      "if the other stopped paying.",
    examples:
      "Example: a $25,000 joint loan at 11% over 60 months costs $543.56 a month. A 60/40 split means $326.14 and $217.42. " +
      "If person 1 had to pay it all, their DTI would be 34.87%.",
    assumptions:
      "How you split payments is a private agreement — the lender can collect the full amount from either borrower. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should we split payments by income?",
        answer: "Splitting in proportion to income is a common way to make it fair. Put the agreement in writing, especially if you aren't married.",
      },
    ],
  },
  {
    slug: "joint-loan-payoff-calculator",
    title: "Joint Loan Payoff Calculator",
    description: "If one partner takes over a joint loan — after a breakup or divorce, say — see the payoff balance, each person's half, and the new payment if one refinances alone.",
    metaTitle: "Joint Loan Payoff Calculator — One Partner Takes Over",
    metaDescription: "Free joint loan payoff calculator. See the payoff balance, each half, and the payment and DTI if one partner refinances the loan alone.",
    calcInputs: [
      currencyField("loanAmount", "Original Loan Amount", { default: 25000, max: 10000000, step: 250 }),
      percentField("annualRatePercent", "Current Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termMonths", "Original Term (Months)", { default: 60, min: 6, max: 360, step: 6 }),
      numberField("monthsPaid", "Payments Already Made", { default: 24, min: 0, max: 360, step: 1 }),
      percentField("newRatePercent", "Rate on a Solo Refinance", { default: 13, max: 40, step: 0.05 }),
      currencyField("keeperIncome", "Gross Monthly Income of the Person Keeping It", { default: 5000, max: 1000000, step: 100 }),
      currencyField("keeperDebts", "Their Other Monthly Debts", { default: 1200, max: 1000000, step: 25 }),
    ],
    calcResult: { label: "Solo Refinance Payment", format: "currency" },
    calcResults: [
      { key: "payoffBalanceNow", label: "Payoff Balance Now", format: "currency" },
      { key: "halfOfBalance", label: "Half of the Balance", format: "currency" },
      { key: "currentPayment", label: "Current Joint Payment", format: "currency" },
      { key: "soloRefinancePayment", label: "Solo Refinance Payment", format: "currency", highlight: true },
      { key: "keeperDtiAfter", label: "Their DTI After Refinancing", format: "percentage" },
    ],
    instructions:
      "A lender won't usually remove one name from a joint loan — the person keeping it normally refinances into their " +
      "own name, which pays off the joint loan. Enter the original loan, rate, term, and payments made, the rate the " +
      "keeper could get alone, and their income and debts. The new loan runs for the months that were left.",
    examples:
      "Example: a $25,000, 60-month joint loan at 11% ($543.56 a month) has $16,602.99 left after 24 payments — $8,301.49 " +
      "each. Refinancing alone at 13% over the remaining 36 months costs $559.42 a month, putting the keeper's DTI at " +
      "35.19%.",
    assumptions:
      "A divorce decree assigning the debt to one person doesn't bind the lender — until refinanced, both remain " +
      "liable. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if neither of us can refinance alone?",
        answer: "Options include selling what the loan paid for, paying it off from shared assets, or keeping the joint loan with a written agreement on who pays.",
      },
    ],
  },
  {
    slug: "joint-loan-interest-calculator",
    title: "Joint Loan Interest Calculator",
    description: "Find the total and first-year interest on a joint loan and how it divides between two borrowers according to their share.",
    metaTitle: "Joint Loan Interest Calculator — Split by Share",
    metaDescription: "Free joint loan interest calculator. See total and first-year interest and each borrower's share of it.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 25000, max: 10000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 6, max: 360, step: 6 }),
      percentField("person1SharePercent", "Person 1's Share", { default: 60, max: 100, step: 5 }),
    ],
    calcResult: { label: "Total Interest", format: "currency" },
    calcResults: [
      { key: "totalInterest", label: "Total Interest", format: "currency", highlight: true },
      { key: "person1Interest", label: "Person 1's Share of Interest", format: "currency" },
      { key: "person2Interest", label: "Person 2's Share of Interest", format: "currency" },
      { key: "year1Interest", label: "Interest in Year 1", format: "currency" },
      { key: "year1Person1", label: "Person 1's Share in Year 1", format: "currency" },
    ],
    instructions:
      "Enter the loan, rate, term, and person 1's share. The tool divides the interest in the same proportion — " +
      "useful for keeping fair records, or where loan interest is tax-deductible (such as a joint mortgage or student " +
      "loan) and each person claims only what they actually paid.",
    examples:
      "Example: a $25,000 loan at 11% over 60 months costs $7,613.63 of interest. With a 60/40 split, person 1's share is " +
      "$4,568.18 and person 2's $3,045.45. Year-one interest is $2,553.86, of which person 1 pays $1,532.31.",
    assumptions:
      "Tax rules on who can deduct interest on a jointly owned debt vary — ask a tax adviser. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who gets the tax form for interest paid?",
        answer: "Lenders often issue one form in the primary borrower's name. Keep your own records of who paid what.",
      },
    ],
  },
  {
    slug: "joint-loan-affordability-calculator",
    title: "Joint Loan Affordability Calculator",
    description: "Start from what each person can comfortably put toward a payment and find the joint loan those combined contributions can repay.",
    metaTitle: "Joint Loan Affordability Calculator — Free",
    metaDescription: "Free joint loan affordability calculator. Add what each borrower can pay monthly and find the largest joint loan it repays.",
    calcInputs: [
      currencyField("contribution1", "Person 1 Can Pay Monthly", { default: 400, max: 1000000, step: 10 }),
      currencyField("contribution2", "Person 2 Can Pay Monthly", { default: 300, max: 1000000, step: 10 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 6, max: 360, step: 6 }),
    ],
    calcResult: { label: "Maximum Joint Loan", format: "currency" },
    calcResults: [
      { key: "combinedPayment", label: "Combined Monthly Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Joint Loan", format: "currency", highlight: true },
      { key: "person1SharePercent", label: "Person 1's Share", format: "percentage" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter how much each of you can comfortably pay every month and the loan's rate and term. This is based on your " +
      "own budgets rather than the lender's limit — use the Joint Loan Calculator to see what a lender might allow.",
    examples:
      "Example: $400 plus $300 makes $700 a month. At 11% over 60 months that repays a $32,195.12 joint loan, with " +
      "$9,804.88 of interest. Person 1 covers 57.14% of the payment.",
    assumptions:
      "Assumes the contributions stay the same for the whole term. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if one of us loses income?",
        answer: "The full payment is still due. Before borrowing jointly, make sure either of you could cover the payment alone for a few months.",
      },
    ],
  },
  {
    slug: "joint-loan-comparison-calculator",
    title: "Joint Loan Comparison Calculator",
    description: "Compare one joint loan for the full amount with each person taking a separate loan for half at their own rate.",
    metaTitle: "Joint Loan Comparison — Joint vs Two Separate Loans",
    metaDescription: "Free calculator comparing a joint loan with two separate loans at each person's own rate: payments, interest and savings.",
    calcInputs: [
      currencyField("amount", "Total Amount Needed", { default: 30000, max: 10000000, step: 250 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 6, max: 360, step: 6 }),
      percentField("jointRatePercent", "Joint Loan Rate", { default: 10, max: 40, step: 0.05 }),
      percentField("rate1Percent", "Person 1's Rate Alone", { default: 11, max: 40, step: 0.05 }),
      percentField("rate2Percent", "Person 2's Rate Alone", { default: 16, max: 40, step: 0.05 }),
    ],
    calcResult: { label: "Joint Loan Saves", format: "currency" },
    calcResults: [
      { key: "jointPayment", label: "Joint — Monthly Payment", format: "currency" },
      { key: "separatePaymentsTotal", label: "Separate — Combined Monthly Payments", format: "currency" },
      { key: "jointInterest", label: "Joint — Total Interest", format: "currency" },
      { key: "separateInterest", label: "Separate — Total Interest", format: "currency" },
      { key: "jointSaves", label: "Joint Loan Saves", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the total you need, the term, the rate on a joint loan, and the rate each of you would get alone for half " +
      "the amount. Separate loans keep your finances independent; a joint loan can win a better rate — but ties you " +
      "together. A negative saving means separate loans are cheaper.",
    examples:
      "Example: $30,000 over 60 months as a joint loan at 10% costs $637.41 a month and $8,244.68 of interest. Two " +
      "$15,000 loans at 11% and 16% cost $690.91 a month together and $11,454.43 of interest — the joint loan saves " +
      "$3,209.75.",
    assumptions:
      "Assumes both separate loans have the same term. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When are separate loans better?",
        answer: "When you want to keep finances independent, aren't sure about the long-term relationship, or one person's credit would raise the joint rate.",
      },
    ],
  },
  {
    slug: "joint-loan-eligibility-calculator",
    title: "Joint Loan Eligibility Calculator",
    description: "Check a joint application: each person's DTI if they applied alone, the joint DTI, and how the lower of your two credit scores compares with the lender's minimum.",
    metaTitle: "Joint Loan Eligibility Calculator — Free",
    metaDescription: "Free joint loan eligibility calculator. Compare each applicant's DTI alone with the joint DTI and check the lower credit score.",
    calcInputs: [
      numberField("score1", "Person 1 Credit Score", { default: 720, min: 300, max: 850, step: 1 }),
      numberField("score2", "Person 2 Credit Score", { default: 640, min: 300, max: 850, step: 1 }),
      numberField("lenderMinScore", "Lender's Minimum Score", { default: 660, min: 300, max: 850, step: 1 }),
      currencyField("income1", "Person 1 Gross Monthly Income", { default: 5000, max: 1000000, step: 100 }),
      currencyField("income2", "Person 2 Gross Monthly Income", { default: 4000, max: 1000000, step: 100 }),
      currencyField("debts1", "Person 1 Monthly Debts", { default: 1200, max: 1000000, step: 25 }),
      currencyField("debts2", "Person 2 Monthly Debts", { default: 600, max: 1000000, step: 25 }),
      currencyField("loanAmount", "Loan Amount", { default: 30000, max: 10000000, step: 250 }),
      percentField("annualRatePercent", "Expected Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 6, max: 360, step: 6 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 40, max: 60, step: 1 }),
    ],
    calcResult: { label: "Joint DTI", format: "percentage" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "person1AloneDti", label: "Person 1 Alone — DTI", format: "percentage" },
      { key: "person2AloneDti", label: "Person 2 Alone — DTI", format: "percentage" },
      { key: "jointDti", label: "Joint DTI", format: "percentage", highlight: true },
      { key: "jointDtiHeadroom", label: "Joint — Room Under DTI Limit", format: "percentage" },
      { key: "lowerScoreMargin", label: "Lower Score — Points Above Minimum", format: "number" },
      { key: "scoreGap", label: "Gap Between Your Scores", format: "number" },
    ],
    instructions:
      "Enter both credit scores, incomes, and debts, the loan, and the lender's limits. Joint applications pool income, " +
      "which usually lowers DTI — but many lenders use the lower credit score, so a big gap between your scores can " +
      "cost you a better rate or even approval. If the lower score is below the minimum, the stronger applicant may do " +
      "better applying alone or with a cosigner.",
    examples:
      "Example: a $30,000 loan at 11% over 60 months costs $652.27. Alone, person 1's DTI would be 37.05% and person 2's " +
      "31.31%; jointly it's 27.25%, 12.75 under 40%. But the lower score, 640, is 20 below a 660 minimum, with an 80-point " +
      "gap between you.",
    assumptions:
      "Lenders differ — some average scores or use the primary applicant's. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does applying jointly affect both credit reports?",
        answer: "Yes. Both of you get a hard inquiry, and the loan and its payment history appear on both reports for its whole life.",
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
