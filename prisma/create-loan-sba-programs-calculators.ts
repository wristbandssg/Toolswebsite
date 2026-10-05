// One-time (but safe to re-run) batch setup script: creates the SBA 7(a) and SBA 504 Loan tools
// (8) of the Loan Calculators expansion 3, filed under Loan Calculators > General Loan Calculators.
// See src/lib/calc-engine-loan-sba-programs.ts for the math and
// src/lib/calc-engine-loan-sba.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-sba-programs-calculators.ts
// or
//   npm run db:create-loan-sba-programs-calculators

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
    slug: "sba-7a-loan-calculator",
    title: "SBA 7(a) Loan Calculator",
    description: "Plan an SBA 7(a) loan for a project that mixes real estate, equipment and working capital: equity injection, loan amount, blended term, guaranty fee and payment.",
    metaTitle: "SBA 7(a) Loan Calculator — Blended Term & Fees",
    metaDescription: "Free SBA 7(a) loan calculator. Combine real estate, equipment and working capital, see the blended term, guaranty fee and monthly payment.",
    calcInputs: [
      currencyField("realEstateAmount", "Real Estate (Purchase or Construction)", { default: 600000, max: 5000000, step: 1000, required: false }),
      currencyField("equipmentAmount", "Equipment", { default: 150000, max: 5000000, step: 1000, required: false }),
      currencyField("workingCapitalAmount", "Working Capital, Inventory & Other", { default: 100000, max: 5000000, step: 1000, required: false }),
      percentField("equityInjectionPercent", "Your Equity Injection", { default: 10, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10.25, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalProjectCost", label: "Total Project Cost", format: "currency" },
      { key: "equityInjection", label: "Your Equity Injection", format: "currency" },
      { key: "loanAmount", label: "SBA 7(a) Loan Amount", format: "currency" },
      { key: "blendedTermYears", label: "Blended Loan Term (Years)", format: "number" },
      { key: "guarantyFee", label: "Upfront SBA Guaranty Fee", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter what the loan will pay for. SBA lets real estate be repaid over up to 25 years and equipment, working " +
      "capital and other uses over up to 10 years. When one 7(a) loan covers several uses, the term is the weighted " +
      "average of those maximums, so the more real estate in the project, the longer the term and the lower the " +
      "payment. Then enter your equity injection (often 10% for a startup or business purchase) and the rate.",
    examples:
      "Example: $600,000 of real estate, $150,000 of equipment and $100,000 of working " +
      "capital make a $850,000 project. After a $85,000 equity injection, the loan is $765,000 " +
      "with a blended term of 20.58 years. At 10.25% the payment is $7,445.35 a month, " +
      "and the guaranty fee is $20,081.25.",
    assumptions:
      "Uses SBA's maximum maturities (25 years for real estate, 10 years for everything else) weighted by amount; " +
      "equipment can sometimes be stretched to its useful life, up to 25 years. Guaranty fee from SBA's FY2026 schedule. " +
      "Fixed rate, equal monthly payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the maximum SBA 7(a) loan?",
        answer: "$5 million. SBA guarantees up to 85% of loans of $150,000 or less and 75% of larger loans, with a maximum guaranteed amount of $3.75 million.",
      },
      {
        question: "Do I need a down payment for an SBA 7(a) loan?",
        answer: "For a startup or a business purchase, SBA generally requires an equity injection of at least 10% of the project. Lenders may ask for more.",
      },
    ],
  },
  {
    slug: "sba-504-loan-calculator",
    title: "SBA 504 Loan Calculator",
    description: "Split a commercial property or equipment project into the SBA 504 structure — bank loan, CDC debenture and your down payment — and see both monthly payments.",
    metaTitle: "SBA 504 Loan Calculator — Bank, CDC & Down Payment",
    metaDescription: "Free SBA 504 loan calculator. Split your project into the 50% bank loan, the CDC/SBA loan and your 10%–20% down payment, with payments.",
    calcInputs: [
      currencyField("projectCost", "Total Project Cost", { default: 2000000, max: 50000000, step: 10000 }),
      {
        key: "borrowerPercent", label: "Your Down Payment", type: "dropdown", required: true, default: 10,
        options: [
          { label: "10% (Standard)", value: 10 },
          { label: "15% (Startup or Special-Purpose Building)", value: 15 },
          { label: "20% (Startup and Special-Purpose)", value: 20 },
        ],
      },
      percentField("bankRatePercent", "Bank Loan Rate", { default: 7.5, max: 20, step: 0.05 }),
      numberField("bankAmortYears", "Bank Loan Amortization (Years)", { default: 25, min: 1, max: 30, step: 1 }),
      percentField("cdcRatePercent", "CDC/SBA Loan Rate (Effective)", { default: 6.25, max: 15, step: 0.05 }),
      {
        key: "cdcTermYears", label: "CDC/SBA Loan Term", type: "dropdown", required: true, default: 25,
        options: [
          { label: "10 Years (Equipment)", value: 10 },
          { label: "20 Years", value: 20 },
          { label: "25 Years", value: 25 },
        ],
      },
      percentField("debentureFeesPercent", "Debenture Fees Added to the CDC Loan", { default: 2.5, max: 5, step: 0.05 }),
    ],
    calcResult: { label: "Total Monthly Payment", format: "currency" },
    calcResults: [
      { key: "downPayment", label: "Your Down Payment", format: "currency" },
      { key: "bankLoan", label: "Bank Loan (50%)", format: "currency" },
      { key: "cdcLoan", label: "CDC/SBA Loan (Including Fees)", format: "currency" },
      { key: "bankMonthlyPayment", label: "Bank Loan Payment", format: "currency" },
      { key: "cdcMonthlyPayment", label: "CDC/SBA Loan Payment", format: "currency" },
      { key: "totalMonthlyPayment", label: "Total Monthly Payment", format: "currency", highlight: true },
    ],
    instructions:
      "SBA 504 loans finance owner-occupied commercial real estate and long-life equipment. A bank lends about 50% of " +
      "the project in first position, a Certified Development Company (CDC) lends the next 30%–40% through an " +
      "SBA-backed debenture at a fixed rate, and you put in the rest. Enter the project cost, your down payment tier, " +
      "both rates, and the CDC loan term. The CDC's one-time fees are usually added to its loan.",
    examples:
      "Example: a $2,000,000 building with 10% down ($200,000) splits into a $1,000,000 bank loan " +
      "and a CDC loan of $820,000 including fees. The bank payment is $7,389.91 and the CDC payment " +
      "$5,409.29, for $12,799.20 a month.",
    assumptions:
      "The bank loan is shown fully amortizing; many have a shorter term with a balloon. The CDC rate should be the " +
      "effective rate including ongoing fees. The CDC portion is capped at $5 million ($5.5 million for small " +
      "manufacturers and energy projects), which isn't applied here. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the SBA 504 down payment only 10%?",
        answer: "Because the CDC's SBA-guaranteed second loan covers up to 40% of the project, the bank only needs to lend 50%, so you can put down as little as 10%.",
      },
    ],
  },
  {
    slug: "sba-504-loan-payment-calculator",
    title: "SBA 504 Loan Payment Calculator",
    description: "Calculate both SBA 504 payments from the loan amounts — the bank loan and the CDC loan with its ongoing annual fees — and the blended rate.",
    metaTitle: "SBA 504 Loan Payment Calculator — With CDC Fees",
    metaDescription: "Free SBA 504 payment calculator. See the bank and CDC payments, the effect of ongoing CDC/SBA fees, and your blended interest rate.",
    calcInputs: [
      currencyField("bankLoan", "Bank Loan Amount", { default: 1000000, max: 50000000, step: 10000 }),
      percentField("bankRatePercent", "Bank Loan Rate", { default: 7.5, max: 20, step: 0.05 }),
      numberField("bankAmortYears", "Bank Loan Amortization (Years)", { default: 25, min: 1, max: 30, step: 1 }),
      currencyField("cdcLoan", "CDC/SBA Loan Amount", { default: 800000, max: 5500000, step: 10000 }),
      percentField("cdcRatePercent", "CDC Debenture Rate", { default: 5.5, max: 15, step: 0.05 }),
      percentField("ongoingFeePercent", "Ongoing Annual CDC & SBA Fees", { default: 0.9, max: 3, step: 0.05 }),
      {
        key: "cdcTermYears", label: "CDC/SBA Loan Term", type: "dropdown", required: true, default: 25,
        options: [
          { label: "10 Years", value: 10 },
          { label: "20 Years", value: 20 },
          { label: "25 Years", value: 25 },
        ],
      },
    ],
    calcResult: { label: "Total Monthly Payment", format: "currency" },
    calcResults: [
      { key: "bankMonthlyPayment", label: "Bank Loan Payment", format: "currency" },
      { key: "cdcPaymentBeforeFees", label: "CDC Payment Before Ongoing Fees", format: "currency" },
      { key: "cdcPaymentWithFees", label: "CDC Payment With Ongoing Fees", format: "currency" },
      { key: "totalMonthlyPayment", label: "Total Monthly Payment", format: "currency", highlight: true },
      { key: "blendedRate", label: "Blended Interest Rate", format: "percentage" },
    ],
    instructions:
      "Enter the bank loan and CDC loan amounts with their rates. The debenture rate is set when SBA sells the bonds " +
      "each month; on top of it you pay ongoing annual fees on the balance — the SBA guarantee fee, the CDC servicing " +
      "fee and a small central servicing fee, together often around 0.8%–1%. Those fees are why the payment is " +
      "higher than the debenture rate alone suggests.",
    examples:
      "Example: a $1,000,000 bank loan at 7.50% over 25 years costs $7,389.91 a " +
      "month. A $800,000 CDC loan at 5.50% would cost $4,912.70, but with 0.90% of " +
      "ongoing fees it's $5,351.78. Total: $12,741.69 a month, at a blended rate of 7.01%.",
    assumptions:
      "Ongoing fees are treated as an addition to the CDC loan's rate. Both loans are shown fully amortizing with " +
      "monthly payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is the SBA 504 rate fixed?",
        answer: "Yes — the CDC/SBA portion has a fixed rate for its whole term. The bank portion may be fixed or variable, set by the bank.",
      },
    ],
  },
  {
    slug: "sba-504-loan-payoff-calculator",
    title: "SBA 504 Loan Payoff Calculator",
    description: "Find the payoff for the CDC/SBA part of a 504 loan, including the debenture prepayment premium that declines over the first 10 years.",
    metaTitle: "SBA 504 Loan Payoff Calculator — Prepayment Premium",
    metaDescription: "Free SBA 504 payoff calculator. See the debenture balance, the declining prepayment premium, your total payoff, and interest avoided.",
    calcInputs: [
      currencyField("debentureAmount", "Original CDC/SBA Loan Amount", { default: 800000, max: 5500000, step: 10000 }),
      percentField("debentureRatePercent", "Debenture Interest Rate", { default: 6, max: 15, step: 0.05 }),
      {
        key: "termYears", label: "Debenture Term", type: "dropdown", required: true, default: 25,
        options: [
          { label: "10 Years", value: 10 },
          { label: "20 Years", value: 20 },
          { label: "25 Years", value: 25 },
        ],
      },
      numberField("monthsPaid", "Payments Already Made (Months)", { default: 48, min: 0, max: 300, step: 1 }),
    ],
    calcResult: { label: "Total Payoff Amount", format: "currency" },
    calcResults: [
      { key: "currentBalance", label: "Current Balance", format: "currency" },
      { key: "prepaymentPremiumPercent", label: "Prepayment Premium Rate", format: "percentage" },
      { key: "prepaymentPremium", label: "Prepayment Premium", format: "currency" },
      { key: "totalPayoff", label: "Total Payoff Amount", format: "currency", highlight: true },
      { key: "interestAvoided", label: "Future Interest Avoided", format: "currency" },
      { key: "netSavings", label: "Net Savings After the Premium", format: "currency" },
    ],
    instructions:
      "Enter the CDC loan amount, its rate and term, and the payments made so far. For 20- and 25-year debentures, " +
      "paying off early in the first 10 years costs a premium that starts at the debenture's interest rate in year 1 " +
      "and falls by a tenth each year. For 10-year debentures it applies in the first 5 years, falling by a fifth each " +
      "year. The bank part of the loan has its own prepayment terms.",
    examples:
      "Example: an $800,000, 25-year debenture at 6% has $737,548.86 left " +
      "after 48 payments. Paying off in year 5 means a 3.60% premium — $26,551.76 " +
      "— for a total payoff of $764,100.61. It avoids $561,362.77 of future interest.",
    assumptions:
      "Assumes the payoff happens in the year shown; in practice debentures are prepaid on set dates, so there can be " +
      "a short wait and extra interest. Ongoing fees aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When does the SBA 504 prepayment penalty end?",
        answer: "After the first half of the term for 10-year debentures (5 years) and after 10 years for 20- and 25-year debentures.",
      },
    ],
  },
  {
    slug: "sba-504-loan-interest-calculator",
    title: "SBA 504 Loan Interest Calculator",
    description: "Estimate interest on both parts of an SBA 504 loan, including the bank loan's balloon when its term is shorter than the CDC loan.",
    metaTitle: "SBA 504 Loan Interest Calculator — Bank & CDC",
    metaDescription: "Free SBA 504 interest calculator. See first-year interest, bank loan interest and balloon, CDC loan interest, and the combined total.",
    calcInputs: [
      currencyField("bankLoan", "Bank Loan Amount", { default: 1000000, max: 50000000, step: 10000 }),
      percentField("bankRatePercent", "Bank Loan Rate", { default: 7.5, max: 20, step: 0.05 }),
      numberField("bankAmortYears", "Bank Loan Amortization (Years)", { default: 25, min: 1, max: 30, step: 1 }),
      numberField("bankTermYears", "Bank Loan Term Before Balloon (Years)", { default: 10, min: 1, max: 30, step: 1 }),
      currencyField("cdcLoan", "CDC/SBA Loan Amount", { default: 820000, max: 5500000, step: 10000 }),
      percentField("cdcRatePercent", "CDC Loan Effective Rate", { default: 6.25, max: 15, step: 0.05 }),
      {
        key: "cdcTermYears", label: "CDC/SBA Loan Term", type: "dropdown", required: true, default: 25,
        options: [
          { label: "10 Years", value: 10 },
          { label: "20 Years", value: 20 },
          { label: "25 Years", value: 25 },
        ],
      },
    ],
    calcResult: { label: "Total Interest", format: "currency" },
    calcResults: [
      { key: "interestFirstYear", label: "Interest in Year 1 (Both Loans)", format: "currency" },
      { key: "bankInterestToBalloon", label: "Bank Loan Interest Until the Balloon", format: "currency" },
      { key: "bankBalloon", label: "Bank Loan Balloon Due", format: "currency" },
      { key: "cdcTotalInterest", label: "CDC Loan Interest (Full Term)", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency", highlight: true },
    ],
    instructions:
      "Bank loans in a 504 package often amortize over 25 years but come due after 10, leaving a balloon you refinance " +
      "or pay off; the CDC loan runs its full term. Enter both loans and the bank's term. If the bank loan is fully " +
      "amortizing, set its term equal to the amortization.",
    examples:
      "Example: a $1,000,000 bank loan at 7.50% on a 25-year schedule costs " +
      "$683,964.52 of interest over 10 years, then leaves a $797,175.11 balloon. The " +
      "$820,000 CDC loan at 6.25% costs $802,786.67 over 25 years. Total interest: " +
      "$1,486,751.19; $125,371.63 of it in year 1.",
    assumptions:
      "Interest after the bank balloon (when you refinance it) isn't included. Fixed rates and monthly payments. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I have to refinance the bank part of a 504 loan?",
        answer: "If its term is shorter than its amortization, yes — the balloon must be refinanced or paid when it's due. The CDC part keeps going.",
      },
    ],
  },
  {
    slug: "sba-504-loan-affordability-calculator",
    title: "SBA 504 Loan Affordability Calculator",
    description: "Find the largest building or equipment project you can buy with an SBA 504 loan — limited by your cash flow and by the cash you have for the down payment.",
    metaTitle: "SBA 504 Loan Affordability Calculator — Max Project",
    metaDescription: "Free SBA 504 affordability calculator. See the largest project your cash flow (DSCR) and down payment cash support under the 504 structure.",
    calcInputs: [
      currencyField("annualCashFlow", "Annual Cash Flow Available for Debt", { default: 300000, max: 50000000, step: 1000 }),
      currencyField("existingAnnualDebtService", "Existing Annual Loan Payments", { default: 40000, max: 50000000, step: 1000, required: false }),
      numberField("minDscr", "Lender's Minimum DSCR", { default: 1.25, min: 1, max: 3, step: 0.05 }),
      currencyField("cashAvailable", "Cash Available for the Down Payment", { default: 250000, max: 50000000, step: 1000 }),
      {
        key: "borrowerPercent", label: "Down Payment Required", type: "dropdown", required: true, default: 10,
        options: [
          { label: "10%", value: 10 },
          { label: "15%", value: 15 },
          { label: "20%", value: 20 },
        ],
      },
      percentField("bankRatePercent", "Bank Loan Rate", { default: 7.5, max: 20, step: 0.05 }),
      percentField("cdcRatePercent", "CDC Loan Effective Rate", { default: 6.25, max: 15, step: 0.05 }),
    ],
    calcResult: { label: "Maximum Project Cost", format: "currency" },
    calcResults: [
      { key: "maxProjectByCashFlow", label: "Maximum Project — Cash Flow Limit", format: "currency" },
      { key: "maxProjectByDownPayment", label: "Maximum Project — Down Payment Limit", format: "currency" },
      { key: "maxProjectCost", label: "Maximum Project Cost", format: "currency", highlight: true },
      { key: "downPaymentAtMax", label: "Down Payment at That Price", format: "currency" },
      { key: "annualPaymentsAtMax", label: "Annual Loan Payments at That Price", format: "currency" },
    ],
    instructions:
      "Enter your business's yearly cash flow, the payments on loans you'll keep, your lender's minimum DSCR, the cash " +
      "you have for the down payment, and the down payment tier. The calculator works out how big a project each " +
      "limit allows under the 50% bank / CDC / down payment split and shows the smaller of the two.",
    examples:
      "Example: $300,000 of cash flow at a 1.25 DSCR, after $40,000 of existing " +
      "payments, supports a project of $2,631,454.27. $250,000 of cash at 10% down allows " +
      "$2,500,000. The lower figure, $2,500,000, is your limit — with $190,009 of " +
      "loan payments a year.",
    assumptions:
      "Both loans are assumed to amortize over 25 years with monthly payments. Closing costs and CDC fees aren't " +
      "included. If the business will save rent by owning, lenders may count that saving in cash flow. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I use rent savings to qualify for a 504 loan?",
        answer: "Often yes — if you're moving from a leased space, lenders typically add back the rent you'll no longer pay when measuring cash flow.",
      },
    ],
  },
  {
    slug: "sba-504-loan-comparison-calculator",
    title: "SBA 504 Loan Comparison Calculator",
    description: "Compare an SBA 504 loan with an SBA 7(a) loan for the same commercial property: fees, monthly payment, and how much you'd save over 10 years.",
    metaTitle: "SBA 504 vs 7(a) Loan Comparison Calculator",
    metaDescription: "Free SBA 504 vs 7(a) calculator. Compare fees and monthly payments for buying commercial property with 10% down under each program.",
    calcInputs: [
      currencyField("projectCost", "Property / Project Cost", { default: 2000000, max: 50000000, step: 10000 }),
      percentField("bankRatePercent", "504 — Bank Loan Rate", { default: 7.5, max: 20, step: 0.05 }),
      percentField("cdcRatePercent", "504 — CDC Loan Effective Rate", { default: 6.25, max: 15, step: 0.05 }),
      percentField("debentureFeesPercent", "504 — Debenture Fees", { default: 2.5, max: 5, step: 0.05 }),
      percentField("sba7aRatePercent", "7(a) Loan Rate", { default: 10, max: 20, step: 0.05 }),
      numberField("termYears", "Term for Both (Years)", { default: 25, min: 1, max: 25, step: 1 }),
    ],
    calcResult: { label: "Monthly Savings With 504", format: "currency" },
    calcResults: [
      { key: "downPayment", label: "Down Payment (10%, Both Programs)", format: "currency" },
      { key: "fees504", label: "504 Debenture Fees (Financed)", format: "currency" },
      { key: "fees7a", label: "7(a) Guaranty Fee (Financed)", format: "currency" },
      { key: "monthlyPayment504", label: "504 Monthly Payment (Both Loans)", format: "currency" },
      { key: "monthlyPayment7a", label: "7(a) Monthly Payment", format: "currency" },
      { key: "monthlySavingsWith504", label: "Monthly Savings With 504", format: "currency", highlight: true },
      { key: "tenYearSavingsWith504", label: "Savings Over the First 10 Years", format: "currency" },
    ],
    instructions:
      "Both programs can buy owner-occupied commercial property with 10% down. The 504 splits the rest into a bank " +
      "loan and a fixed-rate CDC loan; the 7(a) is one loan, usually at a variable rate. Enter the project cost, the " +
      "rates for each, the 504 debenture fees, and a common term. A negative saving means the 7(a) is cheaper.",
    examples:
      "Example: a $2,000,000 building with $200,000 down. The 504 route, with $20,000 of debenture fees, " +
      "costs $12,799.20 a month. A 7(a) at 10% with a $48,125 guaranty fee costs " +
      "$16,793.93. The 504 saves $3,994.72 a month — $479,367 over 10 years.",
    assumptions:
      "Both loans are fully amortizing over the same term at today's rates; the 7(a) rate may change if variable, and " +
      "504 bank loans often have a balloon. The 504 down payment can be 15%–20% for startups or special-purpose " +
      "buildings. 7(a) fee from SBA's FY2026 schedule. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When is a 7(a) better than a 504?",
        answer: "When the project includes working capital or a business purchase (504 can't fund those), when you need it faster, or for smaller projects where 504 fees weigh more.",
      },
    ],
  },
  {
    slug: "sba-504-loan-eligibility-calculator",
    title: "SBA 504 Loan Eligibility Calculator",
    description: "Check the main SBA 504 tests: size (tangible net worth and net income), owner-occupancy of the building, and the job-creation ratio.",
    metaTitle: "SBA 504 Loan Eligibility Calculator — Size & Jobs",
    metaDescription: "Free SBA 504 eligibility calculator. Check tangible net worth, net income, owner-occupancy (51%/60%) and the jobs needed for your loan.",
    calcInputs: [
      currencyField("tangibleNetWorth", "Business Tangible Net Worth", { default: 8000000, max: 100000000, step: 10000 }),
      currencyField("avgNetIncome", "Average Net Income After Tax (Last 2 Years)", { default: 1200000, max: 100000000, step: 10000 }),
      percentField("occupancyPercent", "Share of the Building Your Business Will Use", { default: 60, max: 100, step: 1 }),
      {
        key: "newConstruction", label: "Type of Project", type: "dropdown", required: true, default: 0,
        options: [
          { label: "Existing Building", value: 0 },
          { label: "New Construction", value: 1 },
        ],
      },
      currencyField("debentureAmount", "CDC/SBA Loan Amount", { default: 800000, max: 5500000, step: 10000 }),
      numberField("jobsCreatedOrRetained", "Jobs Created or Retained", { default: 8, min: 0, max: 10000, step: 1 }),
      currencyField("debenturePerJob", "Loan Amount Allowed per Job", { default: 90000, max: 500000, step: 1000 }),
    ],
    calcResult: { label: "Checks Passed (of 4)", format: "number" },
    calcResults: [
      { key: "requiredOccupancy", label: "Required Owner-Occupancy", format: "percentage" },
      { key: "jobsRequired", label: "Jobs Needed for This Loan", format: "number" },
      { key: "maxDebentureByJobs", label: "Largest CDC Loan Your Jobs Support", format: "currency" },
      { key: "checksPassed", label: "Checks Passed (of 4)", format: "number", highlight: true },
    ],
    instructions:
      "Enter the business's tangible net worth and average after-tax net income, how much of the building it will " +
      "occupy, the CDC loan amount, and the jobs the project creates or keeps. The four checks are: tangible net worth " +
      "of $20 million or less; average net income of $6.5 million or less; occupancy of at least 51% of an existing " +
      "building (60% for new construction); and one job for each $90,000 of CDC loan.",
    examples:
      "Example: a business with $8,000,000 of tangible net worth and $1,200,000 of net income will use " +
      "60% of an existing building (minimum 51%). An $800,000 CDC loan needs " +
      "9 jobs; the project creates 8, which supports up to $720,000. " +
      "3 of 4 checks pass.",
    assumptions:
      "Uses SBA's alternative size standard; a business that's over it can still qualify under its industry's size " +
      "standard. Small manufacturers and energy projects have a higher amount per job — enter your figure. Projects " +
      "can also meet a community or public policy goal instead of the jobs test. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I lease out part of a building bought with a 504 loan?",
        answer: "Yes — you can lease up to 49% of an existing building (40% of a new one) to tenants, as long as your business occupies the rest.",
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
