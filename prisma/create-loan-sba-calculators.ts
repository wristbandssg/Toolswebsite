// One-time (but safe to re-run) batch setup script: creates the SBA Loan tools
// (11) of the Loan Calculators expansion 3, filed under Loan Calculators > General Loan Calculators.
// See src/lib/calc-engine-loan-sba.ts for the math and
// src/lib/calc-engine-loan-sba.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-sba-calculators.ts
// or
//   npm run db:create-loan-sba-calculators

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
    slug: "sba-loan-calculator",
    title: "SBA Loan Calculator",
    description: "Estimate an SBA 7(a), SBA Express or SBA Microloan: monthly payment, the guaranteed portion, the upfront SBA guaranty fee, and the total cost.",
    metaTitle: "SBA Loan Calculator — 7(a), Express & Microloan",
    metaDescription: "Free SBA loan calculator. See the monthly payment, SBA guaranty fee, guaranteed portion and total cost for 7(a), Express and Microloans.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 500000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10.5, max: 20, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 25, step: 1 }),
      {
        key: "program", label: "SBA Program", type: "dropdown", required: true, default: 1,
        options: [
          { label: "SBA 7(a) — Standard", value: 1 },
          { label: "SBA Express", value: 2 },
          { label: "SBA Microloan", value: 3 },
        ],
      },
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "programMaximum", label: "Program Maximum Loan", format: "currency" },
      { key: "amountOverProgramMaximum", label: "Amount Over the Program Maximum", format: "currency" },
      { key: "guaranteedAmount", label: "SBA-Guaranteed Portion", format: "currency" },
      { key: "guarantyFee", label: "Upfront SBA Guaranty Fee", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCost", label: "Total Cost (Interest + Guaranty Fee)", format: "currency" },
    ],
    instructions:
      "Choose the SBA program, then enter the loan amount, interest rate and term. SBA 7(a) loans go up to $5 million, " +
      "SBA Express up to $500,000, and SBA Microloans up to $50,000. Terms are usually up to 10 years for working " +
      "capital and equipment and up to 25 years for real estate. The calculator shows how much of the loan SBA " +
      "guarantees and the one-time guaranty fee the lender charges for that guarantee (usually passed on to you).",
    examples:
      "Example: a $500,000 SBA 7(a) loan at 10.50% over 10 years costs $6,746.75 a " +
      "month. SBA guarantees 75% ($375,000), so the upfront guaranty fee is $11,250. Interest over the " +
      "full term is $309,609.98, for a total cost of $320,859.98.",
    assumptions:
      "Guaranty fees follow SBA's FY2026 schedule for loans over 12 months: 2% of the guaranteed portion up to " +
      "$150,000, 3% from $150,001 to $700,000, and 3.5% (3.75% on the guaranteed part above $1 million) for larger " +
      "loans. SBA resets these every October 1, so check the current year's notice. Microloans have no SBA guaranty " +
      "fee. Fixed rate and equal monthly payments are assumed. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is the SBA guaranty fee?",
        answer: "A one-time fee SBA charges the lender for guaranteeing part of your loan. Lenders may pass it on to you, and it can usually be paid from the loan proceeds.",
      },
      {
        question: "Does SBA lend the money directly?",
        answer: "No. Banks, credit unions and other approved lenders make 7(a) and Express loans; SBA guarantees part of each loan. Microloans come from nonprofit intermediaries.",
      },
    ],
  },
  {
    slug: "sba-loan-payment-calculator",
    title: "SBA Loan Payment Calculator",
    description: "Find your SBA 7(a) payment from the prime rate plus the lender's spread — capped at SBA's maximum — with the term set by how you'll use the money.",
    metaTitle: "SBA Loan Payment Calculator — Prime + Spread",
    metaDescription: "Free SBA loan payment calculator. Prime + lender spread capped at SBA's maximum, term by use of proceeds, and the payment if prime rises.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 5000000, step: 1000 }),
      percentField("primeRatePercent", "Prime Rate", { default: 7, max: 15, step: 0.25 }),
      percentField("lenderSpreadPercent", "Lender's Spread Over Prime", { default: 2.75, max: 10, step: 0.25 }),
      {
        key: "useOfProceeds", label: "Use of the Loan", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Working Capital (10 Years)", value: 1 },
          { label: "Equipment (10 Years)", value: 2 },
          { label: "Real Estate (25 Years)", value: 3 },
        ],
      },
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "maxSpreadAllowed", label: "SBA Maximum Spread Over Prime", format: "percentage" },
      { key: "interestRateUsed", label: "Interest Rate Used", format: "percentage" },
      { key: "termYears", label: "Term (Years)", format: "number" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "paymentIfPrimeRises2", label: "Payment If Prime Rises 2 Points", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Most 7(a) loans have a variable rate: the prime rate plus a spread the lender sets. SBA caps that spread by loan " +
      "size, so enter the lender's quoted spread and the calculator uses the lower of the two. The term follows the use " +
      "of the money: up to 10 years for working capital and equipment, up to 25 years for real estate.",
    examples:
      "Example: a $300,000 working-capital loan at prime (7%) plus 2.75% — within " +
      "SBA's 4.50% cap for this size — is 9.75%. Over 10 years the payment is " +
      "$3,923.11 a month. If prime rose 2 points, it would be $4,260.88.",
    assumptions:
      "SBA's maximum variable-rate spreads are prime + 6.5% up to $50,000, + 6% for $50,001–$250,000, + 4.5% for " +
      "$250,001–$350,000, and + 3% above $350,000. Terms shown are the usual maximums; equipment can run longer when its " +
      "useful life allows. The rate-rise line assumes the higher rate applies for the full term. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How often does an SBA variable rate change?",
        answer: "It depends on the note — commonly monthly or quarterly, following the published prime rate. Your payment is then recalculated.",
      },
    ],
  },
  {
    slug: "sba-loan-payoff-calculator",
    title: "SBA Loan Payoff Calculator",
    description: "Find the payoff amount for an SBA loan today, including SBA's prepayment fee on 15-year-plus loans paid off early, and the interest you'll avoid.",
    metaTitle: "SBA Loan Payoff Calculator — Early Payoff & Fee",
    metaDescription: "Free SBA loan payoff calculator. See your balance, SBA's 5%/3%/1% early prepayment fee, the total payoff, and the interest you avoid.",
    calcInputs: [
      currencyField("loanAmount", "Original Loan Amount", { default: 1000000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10, max: 20, step: 0.05 }),
      numberField("termYears", "Original Term (Years)", { default: 25, min: 1, max: 25, step: 1 }),
      numberField("monthsPaid", "Payments Already Made (Months)", { default: 20, min: 0, max: 300, step: 1 }),
    ],
    calcResult: { label: "Total Payoff Amount", format: "currency" },
    calcResults: [
      { key: "currentBalance", label: "Current Balance", format: "currency" },
      { key: "prepaymentFeePercent", label: "SBA Prepayment Fee Rate", format: "percentage" },
      { key: "prepaymentFee", label: "SBA Prepayment Fee", format: "currency" },
      { key: "totalPayoff", label: "Total Payoff Amount", format: "currency", highlight: true },
      { key: "interestAvoided", label: "Future Interest Avoided", format: "currency" },
      { key: "netSavings", label: "Net Savings After the Fee", format: "currency" },
    ],
    instructions:
      "Enter the original loan, rate, term, and how many monthly payments you've made. SBA charges a prepayment fee " +
      "when a loan with a term of 15 years or more is paid off (or 25%+ of it prepaid) in the first three years: 5% " +
      "of the amount prepaid in year 1, 3% in year 2 and 1% in year 3. Shorter loans have no SBA prepayment fee.",
    examples:
      "Example: a $1,000,000, 25-year SBA loan at 10% has $983,671.36 left after " +
      "20 payments. Paying it off in year 2 adds a 3% fee of $29,510.14, so the " +
      "payoff is $1,013,181.50. That avoids $1,560,690.72 of future interest — $1,531,180.58 saved after the fee.",
    assumptions:
      "Assumes a fixed-rate, fully amortizing loan paid on schedule and that the whole balance is paid off. The lender's " +
      "payoff letter will include daily interest to the payoff date. Some lenders also have their own prepayment " +
      "terms. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I avoid the SBA prepayment fee?",
        answer: "Yes — wait until after the third year, or prepay less than 25% of the balance in any one year during the first three years.",
      },
    ],
  },
  {
    slug: "sba-loan-refinance-calculator",
    title: "SBA Loan Refinance Calculator",
    description: "See what refinancing or consolidating business debt into an SBA loan does to your monthly cash flow — and what it costs over the longer term.",
    metaTitle: "SBA Loan Refinance & Debt Consolidation Calculator",
    metaDescription: "Free SBA refinance calculator. Roll existing business debt into an SBA loan and compare the monthly cash flow freed with the extra total cost.",
    calcInputs: [
      currencyField("existingBalance", "Total Balance of the Debt to Refinance", { default: 250000, max: 5000000, step: 1000 }),
      currencyField("existingMonthlyPayment", "Current Total Monthly Payments", { default: 7500, max: 1000000, step: 50 }),
      numberField("remainingMonths", "Months Left on the Current Debt", { default: 40, min: 0, max: 360, step: 1 }),
      percentField("newRatePercent", "SBA Loan Interest Rate", { default: 10.5, max: 20, step: 0.05 }),
      numberField("newTermYears", "SBA Loan Term (Years)", { default: 10, min: 1, max: 25, step: 1 }),
      percentField("closingCostsPercent", "Fees Added to the Loan", { default: 3, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Monthly Cash Flow Freed", format: "currency" },
    calcResults: [
      { key: "newLoanAmount", label: "New SBA Loan Amount", format: "currency" },
      { key: "newMonthlyPayment", label: "New Monthly Payment", format: "currency" },
      { key: "monthlyCashFlowFreed", label: "Monthly Cash Flow Freed", format: "currency", highlight: true },
      { key: "remainingPaymentsCurrent", label: "Remaining Payments — Current Debt", format: "currency" },
      { key: "totalPaymentsNew", label: "Total Payments — SBA Loan", format: "currency" },
      { key: "extraTotalCost", label: "Extra Total Cost of Refinancing", format: "currency" },
    ],
    instructions:
      "SBA 7(a) loans can refinance existing business debt — including several loans, equipment notes, or merchant cash " +
      "advances combined into one — when the new loan improves your cash flow. Enter the total balance and payments of " +
      "the debt you'd replace, the months left on it, and the SBA rate, term and fees (guaranty fee plus closing " +
      "costs). A negative extra cost means the refinance saves money overall as well.",
    examples:
      "Example: $250,000 of business debt costing $7,500 a month for 40 more " +
      "months becomes a $257,500 SBA loan at 10.50% over 10 years. The payment drops to " +
      "$3,474.58, freeing $4,025.42 a month, but total payments rise by $116,949.14.",
    assumptions:
      "Fees are added to the new loan. The current debt's remaining cost is its monthly payment times the months left " +
      "(no prepayment penalties). SBA generally requires the refinance to reduce your payment by at least 10% and the " +
      "existing debt to have been current. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I refinance a merchant cash advance with an SBA loan?",
        answer: "Often yes, if the business qualifies and the refinance improves cash flow. Many businesses use SBA loans to replace expensive short-term financing.",
      },
    ],
  },
  {
    slug: "sba-loan-apr-calculator",
    title: "SBA Loan APR Calculator",
    description: "Turn an SBA 7(a) note rate into an APR: the upfront guaranty fee financed into the loan plus packaging, legal and other closing fees.",
    metaTitle: "SBA Loan APR Calculator — Fees Included",
    metaDescription: "Free SBA loan APR calculator. Add the SBA guaranty fee and closing fees to see the true annual cost of a 7(a) loan above its note rate.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 350000, max: 5000000, step: 1000 }),
      percentField("annualRatePercent", "Note Interest Rate", { default: 10.75, max: 20, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 25, step: 1 }),
      currencyField("closingFees", "Closing Fees Paid (Packaging, Legal, Appraisal)", { default: 5000, max: 200000, step: 100, required: false }),
    ],
    calcResult: { label: "APR", format: "percentage" },
    calcResults: [
      { key: "guarantyFee", label: "SBA Guaranty Fee (Financed)", format: "currency" },
      { key: "amountFinanced", label: "Loan Including the Fee", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "apr", label: "APR", format: "percentage", highlight: true },
      { key: "aprAboveNoteRate", label: "APR Above the Note Rate", format: "percentage" },
    ],
    instructions:
      "Enter the loan amount, the note rate, the term, and any closing fees you pay. The calculator adds the SBA " +
      "guaranty fee to the loan (as most borrowers do), works out the payment, and finds the rate at which that " +
      "payment repays the money you actually receive — the APR.",
    examples:
      "Example: a $350,000, 10-year 7(a) loan at 10.75% carries a $7,875 guaranty fee. " +
      "Financing it makes the loan $357,875 and the payment $4,879.22. With $5,000 of closing " +
      "fees, the APR is 11.65% — 0.90% above the note rate.",
    assumptions:
      "Uses SBA's FY2026 7(a) guaranty fee schedule (75% guaranty above $150,000, 85% at or below). Fixed rate and equal " +
      "monthly payments for the full term. Business loans aren't covered by Truth in Lending, so lenders may not quote " +
      "an APR — this calculates it for comparison. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the APR higher than my SBA rate?",
        answer: "Because you pay interest on the financed guaranty fee and receive less than the loan amount after fees, so the effective rate is higher.",
      },
    ],
  },
  {
    slug: "sba-loan-affordability-calculator",
    title: "SBA Loan Affordability Calculator",
    description: "Find the largest SBA loan your business cash flow supports, using the debt service coverage ratio (DSCR) lenders apply.",
    metaTitle: "SBA Loan Affordability Calculator — Max Loan by DSCR",
    metaDescription: "Free SBA loan affordability calculator. See the maximum SBA loan your cash flow supports at your lender's DSCR and at SBA's 1.15 minimum.",
    calcInputs: [
      currencyField("annualCashFlow", "Annual Cash Flow Available for Debt (EBITDA)", { default: 180000, max: 50000000, step: 1000 }),
      currencyField("existingAnnualDebtService", "Existing Annual Loan Payments", { default: 30000, max: 50000000, step: 1000, required: false }),
      numberField("minDscr", "Lender's Minimum DSCR", { default: 1.25, min: 1, max: 3, step: 0.05 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10.5, max: 20, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 25, step: 1 }),
    ],
    calcResult: { label: "Maximum SBA Loan", format: "currency" },
    calcResults: [
      { key: "maxAnnualDebtService", label: "Maximum New Annual Payments", format: "currency" },
      { key: "maxMonthlyPayment", label: "Maximum New Monthly Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum SBA Loan", format: "currency", highlight: true },
      { key: "maxLoanAtSbaMinimum", label: "Maximum Loan at SBA's 1.15 Minimum", format: "currency" },
    ],
    instructions:
      "Enter your business's yearly cash flow available to pay debt (usually EBITDA after a reasonable owner salary), " +
      "the payments on loans you'll keep, and your lender's minimum DSCR. SBA requires at least 1.15 for 7(a) loans; " +
      "many lenders look for 1.25. Then add the expected rate and term.",
    examples:
      "Example: with $180,000 of cash flow and a 1.25 DSCR, after $30,000 of existing " +
      "payments there's $114,000 a year — $9,500 a month — left for the new loan. At " +
      "10.50% over 10 years that supports a loan of $704,042.70; at SBA's 1.15 floor it would " +
      "be $781,374.63.",
    assumptions:
      "DSCR = cash flow ÷ all annual debt payments. Lenders also weigh collateral, credit, experience and equity, so the " +
      "approved amount may be lower. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What cash flow do SBA lenders use?",
        answer: "Usually EBITDA from tax returns, adjusted for one-time items, minus a fair salary for the owner. For an acquisition, the target business's historical cash flow.",
      },
    ],
  },
  {
    slug: "sba-loan-eligibility-calculator",
    title: "SBA Loan Eligibility Calculator",
    description: "Prequalify for an SBA 7(a) loan: debt service coverage with the new loan, credit score, time in business or equity injection, for-profit status and size.",
    metaTitle: "SBA Loan Eligibility & Prequalification Calculator",
    metaDescription: "Free SBA loan eligibility calculator. Check DSCR with the new loan, credit score, time in business, equity injection and loan size.",
    calcInputs: [
      currencyField("annualCashFlow", "Annual Cash Flow Available for Debt", { default: 150000, max: 50000000, step: 1000 }),
      currencyField("existingAnnualDebtService", "Existing Annual Loan Payments", { default: 20000, max: 50000000, step: 1000, required: false }),
      currencyField("loanAmount", "SBA Loan Amount Requested", { default: 400000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Expected Interest Rate", { default: 10.5, max: 20, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 25, step: 1 }),
      numberField("creditScore", "Owner's Credit Score", { default: 690, min: 300, max: 850, step: 1 }),
      numberField("yearsInBusiness", "Years in Business", { default: 3, min: 0, max: 100, step: 0.5 }),
      percentField("equityInjectionPercent", "Your Equity Injection", { default: 10, max: 100, step: 1, required: false }),
      {
        key: "forProfit", label: "For-Profit U.S. Business?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
    ],
    calcResult: { label: "Checks Passed (of 5)", format: "number" },
    calcResults: [
      { key: "newAnnualPayment", label: "New Loan — Annual Payments", format: "currency" },
      { key: "dscr", label: "DSCR With the New Loan", format: "number" },
      { key: "maxLoanAtMinimumDscr", label: "Maximum Loan at a 1.15 DSCR", format: "currency" },
      { key: "checksPassed", label: "Checks Passed (of 5)", format: "number", highlight: true },
    ],
    instructions:
      "Enter your cash flow, existing loan payments, the loan you want, and the owner details. The five checks are: " +
      "DSCR of at least 1.15 with the new loan; a credit score of 650 or more (a common lender minimum); at least 2 " +
      "years in business, or a 10% equity injection for a startup or purchase; a for-profit U.S. business; and a loan " +
      "of $5 million or less.",
    examples:
      "Example: $150,000 of cash flow and $20,000 of existing payments. A $400,000 loan " +
      "at 10.50% over 10 years adds $64,768.80 a year, for a DSCR of 1.77. With a " +
      "690 score and 3 years in business, 5 of 5 checks pass. The largest loan " +
      "at a 1.15 DSCR is $682,024.59.",
    assumptions:
      "These are the main screens lenders run, not SBA's full eligibility rules — the business must also meet SBA size " +
      "standards, not be in an ineligible industry, and show it can't get credit elsewhere on reasonable terms. " +
      "Lenders set their own credit score minimums. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What credit score do I need for an SBA loan?",
        answer: "SBA has no fixed minimum, but most lenders want 650–680 or higher, and SBA screens smaller 7(a) loans with a FICO SBSS business score.",
      },
    ],
  },
  {
    slug: "sba-loan-interest-calculator",
    title: "SBA Loan Interest Calculator",
    description: "Estimate interest on a variable-rate SBA loan — first-year interest, total interest, and how much more (or less) you'd pay if the prime rate changes.",
    metaTitle: "SBA Loan Interest Calculator — Variable Rate",
    metaDescription: "Free SBA loan interest calculator. See first-year and total interest on a prime-based SBA loan and the effect of a prime rate change.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 500000, max: 5000000, step: 1000 }),
      percentField("primeRatePercent", "Prime Rate Today", { default: 7, max: 15, step: 0.25 }),
      percentField("spreadPercent", "Spread Over Prime", { default: 2.75, max: 6.5, step: 0.25 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 25, step: 1 }),
      percentField("primeChangePercent", "Change in Prime", { default: 1, min: -5, max: 5, step: 0.25 }),
      numberField("changeAfterYears", "Change Happens After (Years)", { default: 2, min: 0, max: 25, step: 1 }),
    ],
    calcResult: { label: "Total Interest With the Rate Change", format: "currency" },
    calcResults: [
      { key: "startingRate", label: "Starting Rate", format: "percentage" },
      { key: "interestFirstYear", label: "Interest in Year 1", format: "currency" },
      { key: "paymentAfterChange", label: "Monthly Payment After the Change", format: "currency" },
      { key: "totalInterestIfUnchanged", label: "Total Interest If Prime Stays the Same", format: "currency" },
      { key: "totalInterestWithChange", label: "Total Interest With the Rate Change", format: "currency", highlight: true },
      { key: "interestDifference", label: "Difference", format: "currency" },
    ],
    instructions:
      "Enter the loan, today's prime rate and your spread, the term, and a prime rate change to test — use a negative " +
      "number for a cut. The calculator keeps today's rate until the change, then recalculates the payment for the rest " +
      "of the term at the new rate.",
    examples:
      "Example: $500,000 at prime (7%) + 2.75% = 9.75% over 10 years " +
      "costs $47,385.61 of interest in year 1 and $284,621.45 in total. If prime rises " +
      "1% after 2 years, the payment becomes $6,769.63 and total interest " +
      "$306,808.79 — $22,187.34 more.",
    assumptions:
      "One rate change, held for the rest of the term; real variable rates move many times. The rate can't fall below " +
      "zero. Monthly compounding. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get a fixed-rate SBA loan?",
        answer: "Yes. Some lenders offer fixed-rate 7(a) loans, with their own SBA maximum rates, and SBA 504 loans have a fixed rate on the SBA portion.",
      },
    ],
  },
  {
    slug: "sba-loan-comparison-calculator",
    title: "SBA Loan Comparison Calculator",
    description: "Compare an SBA loan with a conventional business loan: the SBA loan's longer term lowers the payment, but how does the total cost compare?",
    metaTitle: "SBA Loan vs Conventional Business Loan Calculator",
    metaDescription: "Free SBA loan comparison calculator. Compare monthly payment and total cost of an SBA 7(a) loan vs a shorter conventional bank loan.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 400000, max: 5000000, step: 1000 }),
      percentField("sbaRatePercent", "SBA Loan Rate", { default: 10.5, max: 20, step: 0.05 }),
      numberField("sbaTermYears", "SBA Loan Term (Years)", { default: 10, min: 1, max: 25, step: 1 }),
      percentField("otherRatePercent", "Conventional Loan Rate", { default: 9, max: 30, step: 0.05 }),
      numberField("otherTermYears", "Conventional Loan Term (Years)", { default: 5, min: 1, max: 25, step: 1 }),
      percentField("otherFeePercent", "Conventional Loan Fee", { default: 1, max: 10, step: 0.1, required: false }),
    ],
    calcResult: { label: "Monthly Cash Flow Advantage of SBA", format: "currency" },
    calcResults: [
      { key: "sbaMonthlyPayment", label: "SBA Monthly Payment", format: "currency" },
      { key: "otherMonthlyPayment", label: "Conventional Monthly Payment", format: "currency" },
      { key: "monthlyCashFlowAdvantage", label: "Monthly Cash Flow Advantage of SBA", format: "currency", highlight: true },
      { key: "sbaTotalCost", label: "SBA Total Cost (Interest + Guaranty Fee)", format: "currency" },
      { key: "otherTotalCost", label: "Conventional Total Cost (Interest + Fee)", format: "currency" },
      { key: "totalCostDifference", label: "Extra Total Cost of the SBA Loan", format: "currency" },
    ],
    instructions:
      "Enter the amount you need, the SBA offer's rate and term, and the conventional offer's rate, term and fee. The " +
      "SBA guaranty fee is added automatically. SBA loans often have a longer term, which lowers the monthly payment " +
      "but usually raises the total interest.",
    examples:
      "Example: $400,000 from SBA at 10.50% for 10 years costs $5,397.40 a month; " +
      "a conventional loan at 9% for 5 years costs $8,303.34. The SBA loan " +
      "frees $2,905.94 a month, but its total cost is $256,687.98 vs $102,200.53 — " +
      "$154,487.46 more.",
    assumptions:
      "Both loans are fixed-rate with equal monthly payments; fees are paid upfront. SBA guaranty fee from the FY2026 " +
      "schedule. Collateral and prepayment terms aren't compared. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When is an SBA loan better than a bank loan?",
        answer: "When cash flow matters most, the business is newer, or collateral is limited — the SBA guarantee lets lenders offer longer terms and lower down payments.",
      },
    ],
  },
  {
    slug: "sba-loan-amortization-calculator",
    title: "SBA Loan Amortization Calculator",
    description: "See any year of an SBA loan's amortization schedule: interest and principal paid that year, the balance left, and how much of the loan is repaid.",
    metaTitle: "SBA Loan Amortization Calculator — Any Year",
    metaDescription: "Free SBA loan amortization calculator. See interest and principal for any year of an SBA loan, the remaining balance and percent repaid.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 750000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10, max: 20, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 25, min: 1, max: 25, step: 1 }),
      numberField("yearNumber", "Year to Show", { default: 5, min: 1, max: 25, step: 1 }),
    ],
    calcResult: { label: "Balance at the End of the Year", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "interestPaidInYear", label: "Interest Paid That Year", format: "currency" },
      { key: "principalPaidInYear", label: "Principal Paid That Year", format: "currency" },
      { key: "balanceAfterYear", label: "Balance at the End of the Year", format: "currency", highlight: true },
      { key: "percentRepaid", label: "Share of the Loan Repaid", format: "percentage" },
      { key: "totalInterest", label: "Total Interest Over the Loan", format: "currency" },
    ],
    instructions:
      "Enter the loan, rate and term, then choose a year. The calculator shows that year of the schedule — how much of " +
      "your payments went to interest and to principal — and the balance left at its end. Useful when planning a sale, " +
      "refinance, or prepayment, or for splitting interest on your tax return.",
    examples:
      "Example: a $750,000, 25-year SBA real estate loan at 10% costs $6,815.26 a " +
      "month. In year 5, $71,204.55 goes to interest and only $10,578.52 to principal, " +
      "leaving $706,228.26 — 5.84% of the loan repaid.",
    assumptions:
      "Fixed rate, monthly payments made on schedule, no extra payments. A variable-rate loan's schedule changes when " +
      "the rate does. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is SBA loan interest tax-deductible?",
        answer: "Interest on a loan used for business purposes is generally a deductible business expense, subject to the business interest limits. Ask your tax adviser.",
      },
    ],
  },
  {
    slug: "sba-loan-total-cost-calculator",
    title: "SBA Loan Total Cost Calculator",
    description: "Add up everything an SBA 7(a) loan costs: interest, the SBA guaranty fee, interest on that fee if you finance it, and closing costs.",
    metaTitle: "SBA Loan Total Cost Calculator — Interest & Fees",
    metaDescription: "Free SBA loan total cost calculator. Add interest, the SBA guaranty fee (financed or paid), and closing costs to see the full cost.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 500000, max: 5000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10.5, max: 20, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 25, step: 1 }),
      currencyField("closingCosts", "Closing Costs (Packaging, Legal, Appraisal)", { default: 6000, max: 200000, step: 100, required: false }),
      {
        key: "financeFee", label: "Guaranty Fee", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Added to the Loan", value: 1 },
          { label: "Paid at Closing", value: 0 },
        ],
      },
    ],
    calcResult: { label: "Total Cost of Borrowing", format: "currency" },
    calcResults: [
      { key: "guarantyFee", label: "SBA Guaranty Fee", format: "currency" },
      { key: "interestOnLoan", label: "Interest on the Loan", format: "currency" },
      { key: "interestOnFinancedFee", label: "Interest on the Financed Fee", format: "currency" },
      { key: "closingCosts", label: "Closing Costs", format: "currency" },
      { key: "totalCostOfBorrowing", label: "Total Cost of Borrowing", format: "currency", highlight: true },
      { key: "costPerDollarBorrowed", label: "Cost per $1 Borrowed", format: "currency", decimals: 3 },
    ],
    instructions:
      "Enter the loan amount, rate and term, your closing costs, and whether you'll add the SBA guaranty fee to the loan " +
      "or pay it at closing. Adding it to the loan saves cash today but means paying interest on it for the full term.",
    examples:
      "Example: a $500,000, 10-year SBA loan at 10.50% has $309,609.98 of interest and " +
      "a $11,250 guaranty fee. Financing the fee adds $6,966.22 of interest, and closing costs are " +
      "$6,000. Total cost: $333,826.21, or about $0.67 per dollar borrowed.",
    assumptions:
      "Fixed rate, equal monthly payments, no prepayment. FY2026 SBA 7(a) guaranty fee schedule. Doesn't include costs " +
      "like required life insurance or ongoing lender fees. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What closing costs come with an SBA loan?",
        answer: "Common ones are a packaging fee, legal and filing fees, appraisals, environmental reports for real estate, and business valuations for acquisitions.",
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
