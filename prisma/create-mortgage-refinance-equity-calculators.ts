// One-time (but safe to re-run) batch setup script: creates the Refinance & Home Equity tools
// (10) of the Mortgage Calculators expansion, filed under
// Mortgage Calculators > Refinance & Home Equity Calculators. See src/lib/calc-engine-mortgage-refinance-equity.ts for the math and
// src/lib/calc-engine-mortgage-loan-types.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-mortgage-refinance-equity-calculators.ts
// or
//   npm run db:create-mortgage-refinance-equity-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "mortgage-calculators";
const CATEGORY = { name: "Refinance & Home Equity Calculators", slug: "refinance-home-equity-calculators" };

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
    slug: "heloc-calculator",
    title: "HELOC Calculator",
    description: "Estimate your home equity line of credit: the credit line at the lender's CLTV limit, the interest-only payment while you draw, and the higher payment once repayment begins.",
    metaTitle: "HELOC Calculator — Credit Line & Monthly Payment",
    metaDescription: "Free HELOC calculator. See your credit line, the interest-only draw payment, the repayment payment that follows, and the total interest.",
    calcInputs: [
      currencyField("homeValue", "Home Value", { default: 450000, max: 10000000, step: 1000 }),
      currencyField("mortgageBalance", "Mortgage Balance", { default: 250000, max: 10000000, step: 1000 }),
      percentField("maxCltvPercent", "Lender's Maximum CLTV", { default: 85, max: 100, step: 1 }),
      currencyField("drawAmount", "Amount You'll Draw", { default: 60000, max: 5000000, step: 1000 }),
      percentField("annualRatePercent", "HELOC Rate", { default: 8.25, max: 20, step: 0.125 }),
      numberField("drawYears", "Draw Period (Years)", { default: 10, min: 0, max: 15, step: 1 }),
      numberField("repayYears", "Repayment Period (Years)", { default: 20, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "Repayment-Period Payment", format: "currency" },
    calcResults: [
      { key: "creditLine", label: "Available Credit Line", format: "currency" },
      { key: "amountUsed", label: "Amount Drawn", format: "currency" },
      { key: "drawPeriodPayment", label: "Draw-Period Payment (Interest Only)", format: "currency" },
      { key: "repaymentPeriodPayment", label: "Repayment-Period Payment", format: "currency", highlight: true },
      { key: "paymentIncrease", label: "Payment Increase at Repayment", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "A HELOC is a revolving credit line secured by your home. Lenders usually allow your mortgage plus the line to reach " +
      "80–90% of the home's value (CLTV). During the draw period you can borrow and pay interest only; then the balance " +
      "is repaid with principal and interest, which raises the payment.\n\n" +
      "Enter your home value, mortgage balance, how much you'll draw, the rate and the two periods.",
    examples:
      "Example: a $450,000 home with a $250,000 mortgage at 85% CLTV supports a $132,500 " +
      "line. Drawing $60,000 at 8.25% costs $412.50 a month interest-only, rising to " +
      "$511.24 when repayment starts — $98.74 more. Total interest: $112,197.45.",
    assumptions:
      "The full amount is drawn at the start and the rate stays the same; HELOC rates are usually variable (prime plus a " +
      "margin) and change with the market. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is HELOC interest tax-deductible?",
        answer: "Only if the money is used to buy, build or substantially improve the home that secures it, within the overall mortgage interest limits.",
      },
    ],
  },
  {
    slug: "home-equity-loan-calculator",
    title: "Home Equity Loan Calculator",
    description: "See how much you can borrow with a fixed-rate home equity loan at the lender's CLTV limit, your monthly payment, total interest and your new combined loan-to-value.",
    metaTitle: "Home Equity Loan Calculator — Amount & Payment",
    metaDescription: "Free home equity loan calculator. See the most you can borrow, your fixed monthly payment, total interest and your new combined LTV.",
    calcInputs: [
      currencyField("homeValue", "Home Value", { default: 450000, max: 10000000, step: 1000 }),
      currencyField("mortgageBalance", "Mortgage Balance", { default: 250000, max: 10000000, step: 1000 }),
      percentField("maxCltvPercent", "Lender's Maximum CLTV", { default: 85, max: 100, step: 1 }),
      currencyField("amountWanted", "Amount You Want", { default: 50000, max: 5000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 20, step: 0.125 }),
      numberField("termYears", "Loan Term (Years)", { default: 15, min: 5, max: 30, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "maxLoanAmount", label: "Most You Can Borrow", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "newCltvPercent", label: "New Combined LTV", format: "percentage" },
    ],
    instructions:
      "A home equity loan (second mortgage) pays you a lump sum and is repaid in fixed monthly payments. Enter your home's " +
      "value, what you owe, the lender's CLTV limit, and the amount, rate and term. If you ask for more than the limit " +
      "allows, the calculator uses the maximum.",
    examples:
      "Example: with a $450,000 home and $250,000 owed, an 85% CLTV limit lets you borrow up to " +
      "$132,500. A $50,000 loan at 8.50% over 15 years costs $492.37 a " +
      "month and $38,626.56 of interest, bringing your CLTV to 66.67%.",
    assumptions:
      "Fixed rate; closing costs, often 2–5% of the loan, are not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Home equity loan or cash-out refinance?",
        answer: "If your first mortgage has a low rate, a home equity loan leaves it untouched. A cash-out refinance can make sense when current rates are lower than your mortgage rate.",
      },
    ],
  },
  {
    slug: "home-equity-line-vs-loan-calculator",
    title: "Home Equity Line vs Loan Calculator",
    description: "Compare borrowing the same amount with a fixed-rate home equity loan or a HELOC — monthly payments in each phase and the total cost including closing costs.",
    metaTitle: "HELOC vs Home Equity Loan Calculator — Total Cost",
    metaDescription: "Free HELOC vs home equity loan calculator. Compare payments and the total cost of a fixed home equity loan and an interest-only HELOC.",
    calcInputs: [
      currencyField("amount", "Amount to Borrow", { default: 50000, max: 5000000, step: 1000 }),
      percentField("loanRatePercent", "Home Equity Loan Rate", { default: 8.5, max: 20, step: 0.125 }),
      numberField("loanTermYears", "Home Equity Loan Term (Years)", { default: 15, min: 5, max: 30, step: 1 }),
      currencyField("loanClosingCosts", "Home Equity Loan Closing Costs", { default: 1000, max: 100000, step: 100, required: false }),
      percentField("helocRatePercent", "HELOC Rate (Average Expected)", { default: 8, max: 20, step: 0.125 }),
      numberField("drawYears", "HELOC Draw Period (Years)", { default: 10, min: 0, max: 15, step: 1 }),
      numberField("repayYears", "HELOC Repayment Period (Years)", { default: 20, min: 1, max: 30, step: 1 }),
      currencyField("helocClosingCosts", "HELOC Closing Costs", { default: 500, max: 100000, step: 100, required: false }),
    ],
    calcResult: { label: "HELOC Extra Cost", format: "currency" },
    calcResults: [
      { key: "homeEquityLoanPayment", label: "Home Equity Loan Payment", format: "currency" },
      { key: "helocDrawPayment", label: "HELOC Draw-Period Payment", format: "currency" },
      { key: "helocRepaymentPayment", label: "HELOC Repayment Payment", format: "currency" },
      { key: "homeEquityLoanTotalCost", label: "Home Equity Loan Total Cost", format: "currency" },
      { key: "helocTotalCost", label: "HELOC Total Cost", format: "currency" },
      { key: "helocExtraCost", label: "HELOC Extra Cost", format: "currency", highlight: true },
    ],
    instructions:
      "Both use your home's equity. A home equity loan gives a lump sum at a fixed rate with a fixed payment. A HELOC " +
      "has a lower payment at first (interest only during the draw period) and a variable rate, but if you only make the " +
      "minimum, you pay interest for much longer.\n\n" +
      "Enter both offers. A positive extra cost means the HELOC costs more in total if you make only the minimum " +
      "payments; paying it down early narrows the gap.",
    examples:
      "Example: borrowing $50,000 with a home equity loan at 8.50% over 15 years costs " +
      "$492.37 a month and $39,626.56 in total. A HELOC at 8% costs " +
      "$333.33 a month for 10 years, then $418.22, and $90,872.81 in total — " +
      "$51,246.25 more.",
    assumptions:
      "The whole HELOC amount is drawn at the start and the HELOC rate is an average over its life. Total cost is interest " +
      "plus closing costs. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When is a HELOC better?",
        answer: "When you need money in stages (like a renovation), want flexibility, or will repay quickly. A home equity loan suits a one-time expense you want to repay on a fixed schedule.",
      },
    ],
  },
  {
    slug: "reverse-mortgage-calculator",
    title: "Reverse Mortgage Calculator",
    description: "Estimate a HECM reverse mortgage: your principal limit, upfront costs, how much is left after paying off your mortgage, and how the loan balance and your equity change over time.",
    metaTitle: "Reverse Mortgage Calculator — HECM Proceeds & Equity",
    metaDescription: "Free reverse mortgage calculator. Estimate HECM proceeds after costs and mortgage payoff, and how the balance and your equity grow over time.",
    calcInputs: [
      currencyField("homeValue", "Home Value", { default: 450000, max: 10000000, step: 1000 }),
      percentField("principalLimitFactorPercent", "Principal Limit Factor (From Lender)", { default: 42, max: 80, step: 0.5 }),
      currencyField("existingMortgage", "Existing Mortgage Balance", { default: 60000, max: 5000000, step: 1000, required: false }),
      currencyField("otherClosingCosts", "Other Closing Costs", { default: 3500, max: 100000, step: 100, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 7, max: 15, step: 0.125 }),
      numberField("years", "Years From Now", { default: 10, min: 0, max: 40, step: 1 }),
      percentField("appreciationPercent", "Home Value Growth per Year", { default: 3, min: -10, max: 15, step: 0.5 }),
      currencyField("lendingLimit", "HECM Lending Limit", { default: 1249125, max: 5000000, step: 1000 }),
    ],
    calcResult: { label: "Available to You", format: "currency" },
    calcResults: [
      { key: "principalLimit", label: "Principal Limit", format: "currency" },
      { key: "upfrontCosts", label: "Upfront Costs (MIP, Origination, Other)", format: "currency" },
      { key: "existingMortgagePayoff", label: "Existing Mortgage Paid Off", format: "currency" },
      { key: "availableToYou", label: "Available to You", format: "currency", highlight: true },
      { key: "balanceAfterYears", label: "Loan Balance After the Years Entered", format: "currency" },
      { key: "homeValueAfterYears", label: "Home Value After the Years Entered", format: "currency" },
      { key: "equityLeftAfterYears", label: "Equity Left", format: "currency" },
    ],
    instructions:
      "A Home Equity Conversion Mortgage (HECM) lets homeowners aged 62 and older borrow against their home with no monthly " +
      "payment; the loan is repaid when you sell, move out or pass away. How much you can borrow — the principal limit — is " +
      "a percentage (the principal limit factor) of the home's value or the HECM limit, whichever is lower. The factor rises " +
      "with the youngest borrower's age and falls as rates rise; a lender or HUD's tables give the exact figure.\n\n" +
      "The calculator subtracts the 2% upfront mortgage insurance premium, the origination fee and other costs, then pays " +
      "off your existing mortgage. It shows the balance growing on the amount used (no further draws).",
    examples:
      "Example: a $450,000 home with a 42% factor gives a $189,000 principal limit. " +
      "After $18,500 of costs and paying off the $60,000 mortgage, $110,500 is available. " +
      "After 10 years the balance has grown to $165,797.07, while the home is worth $604,762.37 — " +
      "leaving $438,965.30 of equity.",
    assumptions:
      "2026 HECM limit $1,249,125. Origination is 2% of the first $200,000 and 1% above, minimum $2,500, maximum $6,000. The " +
      "balance grows at the interest rate plus 0.5% annual mortgage insurance. Federal rules limit first-year draws to 60% of " +
      "the principal limit unless more is needed to pay off existing debts. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I lose my home with a reverse mortgage?",
        answer: "You must live in the home and keep paying property taxes, insurance and upkeep. Falling behind on those can trigger repayment.",
      },
      {
        question: "What if the loan grows larger than the home's value?",
        answer: "A HECM is non-recourse: you or your heirs never owe more than the home sells for (or 95% of its appraised value if heirs keep it). FHA insurance covers the rest.",
      },
    ],
  },
  {
    slug: "fha-streamline-refinance-calculator",
    title: "FHA Streamline Refinance Calculator",
    description: "Estimate an FHA streamline refinance: your upfront MIP refund, the new loan amount, the new payment with MIP, and whether you pass FHA's net tangible benefit test.",
    metaTitle: "FHA Streamline Refinance Calculator — MIP Refund",
    metaDescription: "Free FHA streamline refinance calculator. See your UFMIP refund, new loan and payment, monthly savings, and the 0.5% net tangible benefit test.",
    calcInputs: [
      currencyField("currentBalance", "Current Loan Balance", { default: 280000, max: 5000000, step: 1000 }),
      percentField("currentRatePercent", "Current Rate", { default: 7.25, max: 15, step: 0.125 }),
      percentField("currentMipPercent", "Current Annual MIP", { default: 0.55, max: 2, step: 0.05 }),
      numberField("remainingYears", "Years Left on Current Loan", { default: 28, min: 1, max: 30, step: 1 }),
      currencyField("originalUfmip", "Upfront MIP Paid on Current Loan", { default: 5000, max: 100000, step: 100, required: false }),
      numberField("monthsSinceClosing", "Months Since Current Loan Closed", { default: 24, min: 0, max: 360, step: 1 }),
      percentField("newRatePercent", "New Rate", { default: 6.25, max: 15, step: 0.125 }),
      percentField("newMipPercent", "New Annual MIP", { default: 0.55, max: 2, step: 0.05 }),
    ],
    calcResult: { label: "Monthly Savings", format: "currency" },
    calcResults: [
      { key: "ufmipRefund", label: "Upfront MIP Refund", format: "currency" },
      { key: "newUpfrontMip", label: "New Upfront MIP (1.75%)", format: "currency" },
      { key: "newLoanAmount", label: "New Loan Amount", format: "currency" },
      { key: "currentPayment", label: "Current Payment (P&I + MIP)", format: "currency" },
      { key: "newPayment", label: "New Payment (P&I + MIP)", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency", highlight: true },
      { key: "combinedRateDrop", label: "Combined Rate Drop (Rate + MIP, Points)", format: "number" },
      { key: "meetsBenefitTest", label: "Meets Net Tangible Benefit (1 = Yes)", format: "number" },
    ],
    instructions:
      "An FHA streamline refinance replaces an FHA loan with a new one at a lower rate, with no appraisal or income check. " +
      "You need at least 210 days and six payments since closing. FHA requires a net tangible benefit: for a fixed-to-fixed " +
      "refinance, the new rate plus annual MIP must be at least 0.5 percentage points below the current one.\n\n" +
      "If you refinance within 3 years, part of the upfront MIP you paid is refunded and credited to the new loan's upfront " +
      "MIP: 80% in the first month, falling 2 points a month to 10% in month 36.",
    examples:
      "Example: refinancing a $280,000 FHA loan at 7.25% after 24 months earns a " +
      "$1,700 refund against the $4,900 new upfront MIP, for a $283,200 loan. At " +
      "6.25%, the payment falls from $2,077.57 to $1,873.51 — saving $204.06 a month.",
    assumptions:
      "New loan is 30 years. Closing costs can't be financed in a streamline (pay them in cash or take a slightly higher " +
      "rate with lender credits). The MIP rates shown apply to most loans; yours depend on loan size, LTV and when the loan " +
      "was endorsed. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does an FHA streamline need an appraisal?",
        answer: "No. The non-credit-qualifying streamline uses the original value, so it works even if your home has lost value.",
      },
    ],
  },
  {
    slug: "va-irrrl-refinance-calculator",
    title: "VA IRRRL Refinance Calculator",
    description: "Estimate a VA Interest Rate Reduction Refinance Loan: the 0.5% funding fee, the new loan with costs rolled in, your monthly savings and whether you recoup the costs within 36 months.",
    metaTitle: "VA IRRRL Calculator — Savings & 36-Month Recoupment",
    metaDescription: "Free VA IRRRL calculator. See the funding fee, new loan and payment, monthly savings, and whether the costs are recouped within 36 months.",
    calcInputs: [
      currencyField("currentBalance", "Current Loan Balance", { default: 300000, max: 5000000, step: 1000 }),
      percentField("currentRatePercent", "Current Rate", { default: 7, max: 15, step: 0.125 }),
      numberField("remainingYears", "Years Left on Current Loan", { default: 27, min: 1, max: 30, step: 1 }),
      percentField("newRatePercent", "New Rate", { default: 6, max: 15, step: 0.125 }),
      numberField("newTermYears", "New Loan Term (Years)", { default: 30, min: 10, max: 30, step: 5 }),
      currencyField("closingCosts", "Closing Costs (Rolled In)", { default: 4000, max: 100000, step: 100, required: false }),
      {
        key: "fundingFeeExempt", label: "Exempt From the Funding Fee?", type: "dropdown", required: true, default: 0,
        options: [
          { label: "No — Pay the 0.5% Funding Fee", value: 0 },
          { label: "Yes — Service-Connected Disability or Other Exemption", value: 1 },
        ],
      },
    ],
    calcResult: { label: "Monthly Savings", format: "currency" },
    calcResults: [
      { key: "fundingFee", label: "VA Funding Fee", format: "currency" },
      { key: "newLoanAmount", label: "New Loan Amount", format: "currency" },
      { key: "currentPayment", label: "Current Payment", format: "currency" },
      { key: "newPayment", label: "New Payment", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency", highlight: true },
      { key: "recoupMonths", label: "Months to Recoup Costs", format: "number" },
      { key: "meetsRecoupTest", label: "Meets VA Tests (1 = Yes)", format: "number" },
    ],
    instructions:
      "A VA IRRRL (\"streamline\") refinances a VA loan into a new VA loan at a lower rate, usually with no appraisal or " +
      "income documentation. VA requires the closing costs (including the funding fee) to be recouped through the monthly " +
      "savings within 36 months, and a fixed-to-fixed refinance must lower the rate by at least 0.5 percentage points.\n\n" +
      "Enter your current loan and the new offer. The funding fee is 0.5% unless you're exempt.",
    examples:
      "Example: refinancing $300,000 from 7% to 6% adds a $1,500 funding " +
      "fee and $4,000 of costs, for a $305,500 loan. The payment drops from $2,063.44 to " +
      "$1,831.63 — $231.82 a month — so the costs are recouped in about 23.73 months.",
    assumptions:
      "Principal and interest only; taxes and insurance don't change. The recoupment test here divides all costs by the " +
      "monthly savings. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I have to live in the home for a VA IRRRL?",
        answer: "No. You only need to certify that you lived there at some point, so a former home now rented out can still qualify.",
      },
    ],
  },
  {
    slug: "usda-streamline-refinance-calculator",
    title: "USDA Streamline Refinance Calculator",
    description: "Estimate a USDA Streamlined-Assist refinance: the 1% upfront guarantee fee, the new loan, your new payment with the annual fee, and whether you meet the $50 payment reduction rule.",
    metaTitle: "USDA Streamline Refinance Calculator — $50 Test",
    metaDescription: "Free USDA streamline refinance calculator. See the 1% guarantee fee, new loan and payment, and whether your payment drops by at least $50.",
    calcInputs: [
      currencyField("currentBalance", "Current Loan Balance", { default: 220000, max: 5000000, step: 1000 }),
      percentField("currentRatePercent", "Current Rate", { default: 7, max: 15, step: 0.125 }),
      numberField("remainingYears", "Years Left on Current Loan", { default: 27, min: 1, max: 30, step: 1 }),
      percentField("newRatePercent", "New Rate", { default: 6.125, max: 15, step: 0.125 }),
      currencyField("closingCosts", "Closing Costs (Financed)", { default: 3000, max: 100000, step: 100, required: false }),
      percentField("annualFeePercent", "Annual Fee", { default: 0.35, max: 1, step: 0.05 }),
      currencyField("monthlyTaxesInsurance", "Monthly Taxes & Insurance", { default: 400, max: 100000, step: 25, required: false }),
    ],
    calcResult: { label: "Monthly Savings", format: "currency" },
    calcResults: [
      { key: "upfrontGuaranteeFee", label: "Upfront Guarantee Fee (1%)", format: "currency" },
      { key: "newLoanAmount", label: "New Loan Amount", format: "currency" },
      { key: "currentPayment", label: "Current Payment (PITI + Fee)", format: "currency" },
      { key: "newPayment", label: "New Payment (PITI + Fee)", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency", highlight: true },
      { key: "meetsFiftyDollarTest", label: "Payment Drops by $50+ (1 = Yes)", format: "number" },
    ],
    instructions:
      "USDA's Streamlined-Assist refinance lets you refinance a USDA loan with no appraisal or new credit review, if you've " +
      "paid on time for the last 12 months. The new payment, including principal, interest, taxes, insurance and the annual " +
      "fee, must be at least $50 a month lower.\n\n" +
      "The 1% upfront guarantee fee and closing costs can be added to the new loan.",
    examples:
      "Example: refinancing $220,000 from 7% to 6.13%, with $3,000 of costs " +
      "and a $2,230 guarantee fee financed, gives a $225,230 loan. The full payment falls from " +
      "$1,977.36 to $1,834.21 — saving $143.15, well over the $50 minimum.",
    assumptions:
      "New loan is 30 years at a fixed rate. The annual fee is charged on the loan balance. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I still need to meet USDA income limits to refinance?",
        answer: "Yes. Household income must be within the area's USDA limit, though the streamlined-assist option doesn't require a new debt-to-income check.",
      },
    ],
  },
  {
    slug: "cash-in-refinance-calculator",
    title: "Cash-In Refinance Calculator",
    description: "See what you gain by bringing cash to a refinance to lower your balance: a lower LTV, no more PMI, a better rate — and the return on the cash you put in.",
    metaTitle: "Cash-In Refinance Calculator — Savings & Return",
    metaDescription: "Free cash-in refinance calculator. See your new LTV, payment and monthly savings, the return on the cash you put in, and the break-even month.",
    calcInputs: [
      currencyField("homeValue", "Home Value", { default: 400000, max: 10000000, step: 1000 }),
      currencyField("currentBalance", "Current Loan Balance", { default: 350000, max: 10000000, step: 1000 }),
      percentField("currentRatePercent", "Current Rate", { default: 7.25, max: 15, step: 0.125 }),
      numberField("remainingYears", "Years Left on Current Loan", { default: 28, min: 1, max: 30, step: 1 }),
      currencyField("currentPmi", "Current Monthly PMI", { default: 175, max: 10000, step: 5, required: false }),
      currencyField("cashIn", "Cash You'll Put In", { default: 30000, max: 10000000, step: 1000 }),
      percentField("newRatePercent", "New Rate", { default: 6.25, max: 15, step: 0.125 }),
      numberField("newTermYears", "New Loan Term (Years)", { default: 30, min: 10, max: 30, step: 5 }),
      currencyField("closingCosts", "Closing Costs", { default: 4000, max: 100000, step: 100, required: false }),
    ],
    calcResult: { label: "Monthly Savings", format: "currency" },
    calcResults: [
      { key: "newLoanAmount", label: "New Loan Amount", format: "currency" },
      { key: "newLtvPercent", label: "New Loan-to-Value", format: "percentage" },
      { key: "currentPayment", label: "Current Payment (P&I + PMI)", format: "currency" },
      { key: "newPayment", label: "New Payment", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency", highlight: true },
      { key: "returnOnCashPercent", label: "Yearly Return on Cash Put In", format: "percentage" },
      { key: "breakEvenMonths", label: "Months to Recover Closing Costs", format: "number" },
    ],
    instructions:
      "In a cash-in refinance you pay down the balance as part of the refinance. Getting to 80% loan-to-value drops PMI, and " +
      "a lower LTV can also earn a better rate. Enter your current loan, how much cash you'll add, and the new offer.\n\n" +
      "The yearly return compares the payment savings with the cash plus closing costs — useful for comparing with what " +
      "that cash could earn elsewhere.",
    examples:
      "Example: putting $30,000 into a refinance of a $350,000 loan on a $400,000 home leaves $320,000 " +
      "at 80% LTV, so PMI ends. At 6.25%, the payment drops from $2,611.55 to $1,970.30 " +
      "— $641.25 a month, a 22.63% yearly return on the cash and costs.",
    assumptions:
      "PMI continues on the new loan only if its LTV is above 80%. Principal, interest and PMI only. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a cash-in refinance better than a recast?",
        answer: "A recast keeps your rate and just lowers the payment. A cash-in refinance also changes the rate, so it wins when rates have fallen; otherwise a recast is cheaper. See the mortgage recasting vs refinancing calculator.",
      },
    ],
  },
  {
    slug: "no-closing-cost-refinance-calculator",
    title: "No-Closing-Cost Refinance Calculator",
    description: "Compare a no-closing-cost refinance at a higher rate against paying the closing costs for a lower rate — total cost over the years you'll keep the loan, and the break-even month.",
    metaTitle: "No-Closing-Cost Refinance Calculator — Break-Even",
    metaDescription: "Free no-closing-cost refinance calculator. Compare a higher rate with no costs against paying costs for a lower rate, with the break-even month.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 10000000, step: 1000 }),
      percentField("rateWithCostsPercent", "Rate If You Pay Closing Costs", { default: 6.125, max: 15, step: 0.125 }),
      currencyField("closingCosts", "Closing Costs", { default: 6000, max: 100000, step: 100 }),
      percentField("noCostRatePercent", "No-Closing-Cost Rate", { default: 6.5, max: 15, step: 0.125 }),
      numberField("termYears", "Loan Term (Years)", { default: 30, min: 10, max: 30, step: 5 }),
      numberField("yearsKept", "Years You'll Keep the Loan", { default: 5, min: 0, max: 30, step: 1 }),
    ],
    calcResult: { label: "No-Closing-Cost Savings", format: "currency" },
    calcResults: [
      { key: "paymentPayingCosts", label: "Payment If You Pay Costs", format: "currency" },
      { key: "paymentNoClosingCost", label: "No-Closing-Cost Payment", format: "currency" },
      { key: "costPayingCosts", label: "Cost Paying Closing Costs (Interest + Costs)", format: "currency" },
      { key: "costNoClosingCost", label: "Cost With No Closing Costs (Interest)", format: "currency" },
      { key: "noClosingCostSavings", label: "No-Closing-Cost Savings", format: "currency", highlight: true },
      { key: "breakEvenMonths", label: "Break-Even Month for Paying Costs", format: "number" },
    ],
    instructions:
      "With a no-closing-cost refinance, the lender covers your closing costs in exchange for a higher rate (lender credits). " +
      "It costs less if you sell or refinance again before the break-even month, and more if you keep the loan longer.\n\n" +
      "Enter both rates, the closing costs and how long you'll keep the loan. A positive saving means no-closing-cost wins.",
    examples:
      "Example: on $300,000, paying $6,000 of costs gets 6.13% ($1,822.83 a month), " +
      "while no costs means 6.50% ($1,896.20). Over 5 years the no-cost option costs " +
      "$94,605.18 against $94,960.75 — saving $355.57. Paying the costs only wins after " +
      "month 64.",
    assumptions:
      "Cost counts interest paid plus closing costs; principal paid is the same in both and ignored. Some \"no-cost\" loans " +
      "add the costs to the balance instead of raising the rate — that's not modeled. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a no-closing-cost refinance really free?",
        answer: "No — you pay through a higher rate. It's a good deal when you expect rates to fall again or plan to move within a few years.",
      },
    ],
  },
  {
    slug: "mortgage-recasting-vs-refinancing-calculator",
    title: "Mortgage Recasting vs Refinancing Calculator",
    description: "Put the same lump sum toward a mortgage recast or a refinance and compare the new payments and the total interest plus fees of each.",
    metaTitle: "Mortgage Recast vs Refinance Calculator — Compare",
    metaDescription: "Free recast vs refinance calculator. Apply a lump sum either way and compare the new monthly payment and total interest plus fees.",
    calcInputs: [
      currencyField("currentBalance", "Current Loan Balance", { default: 300000, max: 10000000, step: 1000 }),
      percentField("currentRatePercent", "Current Rate", { default: 7, max: 15, step: 0.125 }),
      numberField("remainingYears", "Years Left", { default: 25, min: 1, max: 30, step: 1 }),
      currencyField("lumpSum", "Lump Sum to Pay Down", { default: 50000, max: 10000000, step: 1000 }),
      currencyField("recastFee", "Recast Fee", { default: 250, max: 5000, step: 50, required: false }),
      percentField("refiRatePercent", "Refinance Rate", { default: 6.25, max: 15, step: 0.125 }),
      numberField("refiTermYears", "Refinance Term (Years)", { default: 25, min: 10, max: 30, step: 1 }),
      currencyField("refiClosingCosts", "Refinance Closing Costs", { default: 5000, max: 100000, step: 100, required: false }),
    ],
    calcResult: { label: "Refinance Savings", format: "currency" },
    calcResults: [
      { key: "currentPayment", label: "Current Payment", format: "currency" },
      { key: "recastPayment", label: "Payment After Recast", format: "currency" },
      { key: "refinancePayment", label: "Payment After Refinance", format: "currency" },
      { key: "recastTotalCost", label: "Recast: Interest + Fee", format: "currency" },
      { key: "refinanceTotalCost", label: "Refinance: Interest + Costs", format: "currency" },
      { key: "refinanceSavings", label: "Refinance Savings", format: "currency", highlight: true },
    ],
    instructions:
      "A recast keeps your loan and rate: you pay a lump sum and the lender recalculates the payment over the remaining " +
      "term, for a small fee (often $150–$500). A refinance replaces the loan at a new rate but has full closing costs. " +
      "Government loans (FHA, VA, USDA) usually can't be recast.\n\n" +
      "Enter your loan, the lump sum and the refinance offer. A positive saving means the refinance costs less over the life " +
      "of the loan; a negative one means the recast does.",
    examples:
      "Example: putting $50,000 toward a $300,000 loan at 7%, a recast lowers the payment from " +
      "$2,120.34 to $1,766.95. Refinancing the rest at 6.25% over 25 years gives " +
      "$1,649.17. Total interest plus fees is $280,334.40 for the recast and $249,752.03 for the " +
      "refinance — the refinance saves $30,582.36.",
    assumptions:
      "Both options are kept to the end of their terms; a different refinance term changes the comparison. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When does a recast beat a refinance?",
        answer: "When current rates are about the same as or higher than your rate, or when you're near the end of the loan and refinance costs wouldn't pay off.",
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
