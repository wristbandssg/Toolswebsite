// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Mortgage Calculators" sub-batch C (Refinance & Loan Programs).
// Last of 3 sub-batches for the Mortgage_Topical_Map_Large_Tool_List.xlsx
// build-out (36 tools total — see create-mortgage-core-calculators.ts and
// create-mortgage-payment-strategies-calculators.ts for the other two).
// Filed under the existing "Mortgage Calculators" category
// (mortgage-calculators).
//
// See src/lib/calc-engine-mortgage-refinance-programs.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-mortgage-refinance-programs-calculators.ts
// or
//   npm run db:create-mortgage-refinance-programs-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "mortgage-calculators";

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
  opts: { required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "percentage",
    unit: "%",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
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
  "This tool provides general estimates for informational purposes only and isn't financial, lending, or tax " +
  "advice. Actual loan terms, rates, fees, and program requirements vary by lender and change over time — check " +
  "with your lender or a tax professional for figures specific to your situation.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "mortgage-refinance-calculator",
    title: "Mortgage Refinance Calculator",
    description: "Compare your current mortgage payment against a new refinance loan's payment and see your lifetime interest savings.",
    metaTitle: "Mortgage Refinance Calculator — Free & Instant",
    metaDescription: "Free mortgage refinance calculator. Compare your current loan against a new rate and term to see your new payment and interest savings.",
    calcInputs: [
      currencyField("currentBalance", "Current Loan Balance", { default: 280000, max: 100000000, step: 1000 }),
      percentField("currentAnnualInterestRate", "Current Interest Rate", { default: 7.5, max: 20, step: 0.05 }),
      numberField("currentRemainingTermYears", "Current Remaining Term (Years)", { default: 25, min: 1, max: 40, step: 1 }),
      percentField("newAnnualInterestRate", "New Interest Rate", { default: 6.25, max: 20, step: 0.05 }),
      numberField("newLoanTermYears", "New Loan Term (Years)", { default: 25, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Monthly Savings", format: "currency" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "newPayment", label: "New Monthly Payment", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency", highlight: true },
      { key: "lifetimeInterestSavings", label: "Lifetime Interest Savings", format: "currency" },
    ],
    instructions:
      "Enter your current loan balance, current rate and remaining term, and the new rate and term you're " +
      "quoted for a refinance. The result shows both payments side by side and your lifetime interest savings " +
      "(or added cost, if the new term is longer).",
    examples: "Example: refinancing a $280,000 balance from 7.5% (25 years remaining) to 6.25% over a new 25-year term drops the payment from $2,069.18 to $1,847.07/month — saving $66,630.31 in lifetime interest.",
    assumptions:
      "This compares payments and lifetime interest only — it doesn't include refinance closing costs, which " +
      "typically run 2-5% of the loan amount. See the Refinance Break-Even Calculator to factor those in against " +
      "your specific planned time in the home. Extending your loan term in a refinance can increase total " +
      "interest even at a lower rate, so compare terms carefully. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does this include refinance closing costs?",
        answer: "No — this compares payments and lifetime interest based on rate and term alone. Refinance closing costs (typically 2-5% of the loan amount) are a real upfront expense — use the Refinance Break-Even Calculator to see how long it takes those costs to pay for themselves through your monthly savings.",
      },
      {
        question: "Can refinancing ever increase my total interest even at a lower rate?",
        answer: "Yes — if you reset the clock to a new 30-year term after already paying down several years of your current loan, you can end up paying more total interest even at a lower rate, since you're financing the balance over more months. Comparing lifetime interest (not just the monthly payment) is important when the new term differs from your remaining current term.",
      },
    ],
  },
  {
    slug: "refinance-break-even-calculator",
    title: "Refinance Break-Even Calculator",
    description: "See how many months until refinance closing costs pay for themselves, and your net savings over your planned time in the home.",
    metaTitle: "Refinance Break-Even Calculator — Free & Instant",
    metaDescription: "Free refinance break-even calculator. Enter your current and new payment plus closing costs to see your break-even point and net savings.",
    calcInputs: [
      currencyField("currentMonthlyPayment", "Current Monthly Payment", { default: 1980, max: 1000000, step: 25 }),
      currencyField("newMonthlyPayment", "New (Refinanced) Monthly Payment", { default: 1725, max: 1000000, step: 25 }),
      currencyField("refinanceClosingCosts", "Refinance Closing Costs", { default: 5000, max: 1000000, step: 100 }),
      numberField("planningToStayYears", "Years You Plan To Stay In This Loan", { default: 5, min: 0.5, max: 40, step: 0.5 }),
    ],
    calcResult: { label: "Net Savings Over Your Planned Horizon", format: "currency" },
    calcResults: [
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "breakEvenMonths", label: "Break-Even (Months)", format: "number" },
      { key: "netSavingsOverHorizon", label: "Net Savings Over Your Planned Horizon", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your current monthly payment and the new payment you're quoted for a refinance (get both directly " +
      "from your current statement and the lender's new quote), the refinance closing costs, and how many years " +
      "you actually plan to keep the loan. The result shows how many months until the closing costs pay for " +
      "themselves, and your net savings over your specific planned horizon.",
    examples: "Example: refinancing from a $1,980 to a $1,725 monthly payment ($255 savings), with $5,000 in closing costs and a 5-year planned stay, breaks even in 20 months — netting $10,300.00 in savings over that 5-year horizon.",
    assumptions:
      "This takes your current and new payments directly (from your statement and lender quote) rather than " +
      "recalculating them from rate and term — see the Mortgage Refinance Calculator if you want to derive both " +
      "payments from scratch first. If you move or refinance again before the break-even point, you may not " +
      "recoup the closing costs. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the Mortgage Refinance Calculator?",
        answer: "The Mortgage Refinance Calculator derives your current and new payments from rate and term inputs and shows lifetime interest savings. This tool instead takes both payments directly (as quoted) and focuses specifically on the break-even decision — how long until closing costs pay for themselves, given how long you actually plan to stay.",
      },
      {
        question: "What if I might sell or refinance again before the break-even point?",
        answer: "If you don't reach the break-even month count, you won't fully recoup the refinance closing costs — a negative net savings result means refinancing likely isn't worth it for your specific planned timeline, even if the new rate is lower.",
      },
    ],
  },
  {
    slug: "cash-out-refinance-calculator",
    title: "Cash-Out Refinance Calculator",
    description: "Calculate your new loan amount, resulting loan-to-value ratio, and new payment when refinancing to take out cash.",
    metaTitle: "Cash-Out Refinance Calculator — Free & Instant",
    metaDescription: "Free cash-out refinance calculator. Enter your home value, current balance, and cash-out amount to see your new loan amount and payment.",
    calcInputs: [
      currencyField("homeValue", "Current Home Value", { default: 450000, max: 100000000, step: 5000 }),
      currencyField("currentLoanBalance", "Current Loan Balance", { default: 220000, max: 100000000, step: 1000 }),
      currencyField("cashOutAmount", "Cash-Out Amount Requested", { default: 50000, max: 10000000, step: 1000 }),
      percentField("newAnnualInterestRate", "New Interest Rate", { default: 6.75, max: 20, step: 0.05 }),
      numberField("newLoanTermYears", "New Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      percentField("maxLtvPercent", "Max LTV Allowed By Lender", { default: 80, max: 100, step: 1 }),
    ],
    calcResult: { label: "New Monthly Payment", format: "currency" },
    calcResults: [
      { key: "newLoanAmount", label: "New Loan Amount", format: "currency" },
      { key: "resultingLtvPercent", label: "Resulting Loan-to-Value Ratio", format: "percentage" },
      { key: "withinLtvLimit", label: "Within Lender's Max LTV (1 = Yes, 0 = No)", format: "number" },
      { key: "newPayment", label: "New Monthly Payment", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your home's current value, your existing loan balance, how much cash you want to take out, the new " +
      "rate and term, and your lender's maximum allowed loan-to-value ratio (commonly 80% for cash-out " +
      "refinances). The result shows your new loan amount, resulting LTV, whether it's within the typical limit, " +
      "and your new monthly payment.",
    examples: "Example: a $450,000 home with a $220,000 balance, cashing out $50,000 at 6.75% over 30 years, results in a $270,000 new loan (60% LTV, within an 80% limit) — a $1,751.21 monthly payment.",
    assumptions:
      "Cash-out refinance LTV limits vary by loan type and lender (conventional loans commonly cap around 80%, " +
      "though other programs differ) — check your specific lender's requirements. This doesn't include closing " +
      "costs, which can be paid upfront or rolled into the new loan amount. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is loan-to-value (LTV) and why does it matter for cash-out refinancing?",
        answer: "LTV is your loan amount as a percentage of your home's value. Lenders cap cash-out refinance LTV (commonly around 80%) to limit their risk — the lower your resulting LTV, the more equity cushion remains in the property, which can also affect your rate and whether PMI applies.",
      },
      {
        question: "What can I use cash-out refinance funds for?",
        answer: "Common uses include home improvements, debt consolidation, or other major expenses — since it's secured by your home, using it to pay off high-interest unsecured debt can lower your overall interest cost, but it also converts that debt into a mortgage obligation secured by your house.",
      },
    ],
  },
  {
    slug: "mortgage-recast-calculator",
    title: "Mortgage Recast Calculator",
    description: "See how a lump-sum payment lowers your monthly payment (keeping the same remaining term) through a mortgage recast.",
    metaTitle: "Mortgage Recast Calculator — Free & Instant",
    metaDescription: "Free mortgage recast calculator. See how a lump-sum principal payment lowers your monthly payment while keeping your term the same.",
    calcInputs: [
      currencyField("currentBalance", "Current Loan Balance", { default: 280000, max: 100000000, step: 1000 }),
      percentField("annualInterestRate", "Annual Interest Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("remainingTermYears", "Remaining Term (Years)", { default: 25, min: 1, max: 40, step: 1 }),
      currencyField("lumpSumPrincipalPayment", "Lump-Sum Principal Payment", { default: 40000, max: 10000000, step: 1000 }),
    ],
    calcResult: { label: "New (Lower) Monthly Payment", format: "currency" },
    calcResults: [
      { key: "oldPayment", label: "Old Monthly Payment", format: "currency" },
      { key: "newBalance", label: "New Balance After Lump Sum", format: "currency" },
      { key: "newPayment", label: "New (Lower) Monthly Payment", format: "currency", highlight: true },
      { key: "monthlySavings", label: "Monthly Payment Reduction", format: "currency" },
    ],
    instructions:
      "Enter your current balance, rate, remaining term, and the lump sum you plan to apply toward principal. A " +
      "recast keeps your SAME remaining term but recalculates a LOWER monthly payment based on the reduced " +
      "balance — the opposite mechanism from making extra payments or a prepayment, which instead shorten your " +
      "term while keeping the payment the same.",
    examples: "Example: a $280,000 balance at 6.5% with 25 years remaining, recast after a $40,000 lump-sum payment, drops the payment from $1,890.58 to $1,620.50/month — a $270.08 monthly reduction, with the term unchanged.",
    assumptions:
      "Not all loans or servicers offer recasting (it's more commonly available on conventional loans, and " +
      "typically excluded for FHA, VA, and USDA loans) — and lenders often charge a small recast fee. Check " +
      "with your specific servicer for eligibility and any fee before counting on this option. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between a recast and refinancing?",
        answer: "A recast keeps your existing loan, rate, and term — it just recalculates your payment based on a lower balance after a lump-sum payment, usually for a small flat fee. Refinancing replaces your loan entirely with a new one, potentially at a different rate and term, but involves a full new loan application and closing costs.",
      },
      {
        question: "How is this different from making extra payments or a prepayment?",
        answer: "Extra payments and one-time prepayments (see the Extra Mortgage Payment and Mortgage Prepayment calculators) keep your payment amount the same and shorten your loan term instead — maximizing interest savings. A recast does the opposite: it lowers your monthly payment while keeping the same payoff date, which helps cash flow rather than total interest saved.",
      },
    ],
  },
  {
    slug: "fha-loan-calculator",
    title: "FHA Loan Calculator",
    description: "Calculate your FHA loan amount, upfront and monthly mortgage insurance premium (MIP), and total monthly payment.",
    metaTitle: "FHA Loan Calculator — Free & Instant",
    metaDescription: "Free FHA loan calculator. Enter your home price and down payment to see your loan amount, MIP costs, and total monthly payment.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 350000, max: 100000000, step: 5000 }),
      percentField("downPaymentPercent", "Down Payment (Min 3.5%)", { default: 3.5, max: 50, step: 0.5 }),
      percentField("annualInterestRate", "Annual Interest Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      percentField("upfrontMipPercent", "Upfront MIP Rate", { default: 1.75, max: 5, step: 0.05 }),
      percentField("annualMipPercent", "Annual MIP Rate", { default: 0.55, max: 3, step: 0.05 }),
    ],
    calcResult: { label: "Total Monthly Payment", format: "currency" },
    calcResults: [
      { key: "loanAmount", label: "Total Loan Amount (Incl. Financed Upfront MIP)", format: "currency" },
      { key: "upfrontMip", label: "Upfront MIP", format: "currency" },
      { key: "monthlyMip", label: "Monthly MIP", format: "currency" },
      { key: "totalMonthlyPayment", label: "Total Monthly Payment (P&I + MIP)", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your home price, down payment (FHA loans allow as little as 3.5% down with qualifying credit), " +
      "interest rate, term, and FHA's mortgage insurance premium (MIP) rates — both an upfront premium (commonly " +
      "financed into the loan) and an ongoing annual premium (paid monthly). The result shows your total loan " +
      "amount, MIP costs, and total monthly payment.",
    examples: "Example: a $350,000 home with 3.5% down, a 6.5% rate over 30 years, 1.75% upfront MIP and 0.55% annual MIP, results in a $343,660.62 total loan amount — a $2,329.68 total monthly payment including $157.51 in monthly MIP.",
    assumptions:
      "FHA MIP rates and rules change periodically and can vary based on loan amount, term, and LTV — check " +
      "current FHA guidelines for exact rates. Unlike conventional PMI, FHA's annual MIP often lasts for the " +
      "life of the loan (if the down payment was under 10%), rather than automatically dropping off at 78% LTV. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is FHA MIP different from conventional PMI?",
        answer: "FHA charges both an upfront premium (typically financed into the loan) AND an ongoing annual premium — and unlike conventional PMI, FHA's annual MIP often continues for the life of the loan if your down payment was under 10%, rather than automatically terminating at 78% LTV.",
      },
      {
        question: "Can I remove FHA MIP later?",
        answer: "If your down payment was 10% or more, annual MIP typically drops off after 11 years. If it was under 10%, MIP generally continues for the life of the loan — many borrowers in that situation eventually refinance into a conventional loan once they have enough equity to avoid mortgage insurance altogether.",
      },
    ],
  },
  {
    slug: "va-loan-calculator",
    title: "VA Loan Calculator",
    description: "Calculate your VA loan amount, funding fee, and monthly payment — VA loans require no monthly mortgage insurance.",
    metaTitle: "VA Loan Calculator — Free & Instant",
    metaDescription: "Free VA loan calculator. Enter your home price and funding fee rate to see your loan amount and monthly payment — no PMI required.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 350000, max: 100000000, step: 5000 }),
      percentField("downPaymentPercent", "Down Payment (VA Allows 0%)", { default: 0, max: 50, step: 0.5 }),
      percentField("annualInterestRate", "Annual Interest Rate", { default: 6.25, max: 20, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      percentField("vaFundingFeePercent", "VA Funding Fee Rate", { default: 2.15, max: 5, step: 0.05 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "loanAmount", label: "Total Loan Amount (Incl. Financed Funding Fee)", format: "currency" },
      { key: "fundingFee", label: "VA Funding Fee", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment (No Monthly PMI)", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your home price, down payment (VA loans allow 0% down for eligible veterans and service members), " +
      "interest rate, term, and the VA funding fee rate (which varies by down payment size, service history, and " +
      "whether it's a first or subsequent use — check your Certificate of Eligibility or lender for your exact " +
      "rate). The result shows your loan amount, funding fee, and monthly payment — notably with NO ongoing " +
      "monthly mortgage insurance, a key VA loan benefit.",
    examples: "Example: a $350,000 home with 0% down at 6.25% over 30 years, with a 2.15% funding fee, results in a $357,525.00 total loan amount — a $2,201.34 monthly payment with no monthly mortgage insurance.",
    assumptions:
      "VA funding fee rates vary based on down payment percentage, whether it's your first use of VA loan " +
      "benefits, and service category — some veterans (such as those receiving VA disability compensation) are " +
      "exempt from the funding fee entirely. Check your Certificate of Eligibility for your exact rate or " +
      "exemption status. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why doesn't a VA loan have monthly PMI?",
        answer: "The VA funding fee (a one-time upfront cost, typically financed into the loan) substitutes for ongoing mortgage insurance — this is a distinctive VA loan benefit compared to FHA (which charges both an upfront AND ongoing premium) or conventional loans with less than 20% down (which charge ongoing PMI).",
      },
      {
        question: "Is everyone required to pay the VA funding fee?",
        answer: "No — veterans receiving VA disability compensation, and some other specific categories, are exempt from the funding fee entirely. The fee rate also varies by down payment size and whether it's your first or a subsequent use of VA loan benefits — check your Certificate of Eligibility for your specific situation.",
      },
    ],
  },
  {
    slug: "usda-loan-calculator",
    title: "USDA Loan Calculator",
    description: "Calculate your USDA loan amount, upfront guarantee fee, and annual fee for eligible rural properties with 0% down.",
    metaTitle: "USDA Loan Calculator — Free & Instant",
    metaDescription: "Free USDA loan calculator. Enter your home price to see your loan amount, guarantee fee, and monthly payment for eligible rural properties.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 300000, max: 100000000, step: 5000 }),
      percentField("downPaymentPercent", "Down Payment (USDA Allows 0%)", { default: 0, max: 50, step: 0.5 }),
      percentField("annualInterestRate", "Annual Interest Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      percentField("upfrontGuaranteeFeePercent", "Upfront Guarantee Fee Rate", { default: 1, max: 5, step: 0.05 }),
      percentField("annualFeePercent", "Annual Fee Rate", { default: 0.35, max: 3, step: 0.05 }),
    ],
    calcResult: { label: "Total Monthly Payment", format: "currency" },
    calcResults: [
      { key: "loanAmount", label: "Total Loan Amount (Incl. Financed Guarantee Fee)", format: "currency" },
      { key: "guaranteeFee", label: "Upfront Guarantee Fee", format: "currency" },
      { key: "monthlyAnnualFee", label: "Monthly Portion of Annual Fee", format: "currency" },
      { key: "totalMonthlyPayment", label: "Total Monthly Payment (P&I + Annual Fee)", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your home price, down payment (USDA loans allow 0% down for eligible rural properties and income " +
      "levels), interest rate, term, and USDA's guarantee fee rates — an upfront fee (commonly financed into the " +
      "loan) and a smaller ongoing annual fee. The result shows your loan amount, fees, and total monthly " +
      "payment.",
    examples: "Example: a $300,000 home with 0% down at 6.5% over 30 years, with a 1% upfront guarantee fee and 0.35% annual fee, results in a $303,000.00 total loan amount — a $2,003.54 total monthly payment.",
    assumptions:
      "USDA loans require the property to be in an eligible rural area (which includes many suburban areas — " +
      "check the USDA's eligibility map) and the borrower's income to fall under program limits, which vary by " +
      "location and household size. Guarantee fee rates can change — check current USDA program rates. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is USDA's fee structure different from FHA's?",
        answer: "Both charge an upfront fee plus an ongoing fee, but the rates differ — USDA's ongoing annual fee (0.35% in current guidelines) is typically lower than FHA's annual MIP (0.55% or more), while USDA also requires no down payment and has property location and income eligibility rules that FHA doesn't.",
      },
      {
        question: "What areas qualify for USDA loans?",
        answer: "USDA loans require the property to be in a USDA-designated eligible rural area — this includes many smaller towns and even some suburban areas outside major cities, not just farmland. Check the USDA's official eligibility map for a specific address, and confirm your household income falls under the program's limits for your area.",
      },
    ],
  },
  {
    slug: "jumbo-mortgage-calculator",
    title: "Jumbo Mortgage Calculator",
    description: "Check whether your loan amount exceeds the conforming loan limit and calculate your jumbo mortgage payment.",
    metaTitle: "Jumbo Mortgage Calculator — Free & Instant",
    metaDescription: "Free jumbo mortgage calculator. See if your loan exceeds the conforming loan limit and calculate your monthly payment.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 1000000, max: 100000000, step: 10000 }),
      currencyField("downPaymentAmount", "Down Payment", { default: 200000, max: 100000000, step: 5000 }),
      percentField("annualInterestRate", "Annual Interest Rate", { default: 7, max: 20, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      currencyField("conformingLoanLimit", "Conforming Loan Limit (Your County)", { default: 766550, max: 5000000, step: 1000 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "isJumbo", label: "Exceeds Conforming Limit (1 = Yes, 0 = No)", format: "number" },
      { key: "amountOverConformingLimit", label: "Amount Over Conforming Limit", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your home price, down payment, interest rate, term, and the conforming loan limit for your specific " +
      "county (this varies by location — high-cost areas have a higher limit than the baseline; check the FHFA's " +
      "published limits for your county). The result shows whether your loan qualifies as jumbo (exceeds the " +
      "conforming limit) and your monthly payment.",
    examples: "Example: a $1,000,000 home with a $200,000 down payment ($800,000 loan) against a $766,550 conforming limit is a jumbo loan, $33,450.00 over the limit — a $5,322.42 monthly payment at 7% over 30 years.",
    assumptions:
      "The conforming loan limit changes annually and varies by county (higher in designated high-cost areas) — " +
      "the default shown is a common baseline figure, but check the FHFA's current published limits for your " +
      "specific county. Jumbo loans often carry stricter qualification requirements and sometimes a rate premium " +
      "compared to conforming loans. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is a conforming loan limit?",
        answer: "It's the maximum loan amount that Fannie Mae and Freddie Mac will purchase or guarantee, set annually by the FHFA and varying by county (higher in designated high-cost areas). A loan above that limit is a \"jumbo\" loan, which isn't eligible for those agencies' backing and typically has its own underwriting standards.",
      },
      {
        question: "Do jumbo loans have different rates than conforming loans?",
        answer: "Not always — the rate relationship between jumbo and conforming loans varies with market conditions, and jumbo loans have sometimes carried lower rates than conforming loans in certain periods. Jumbo loans generally do require stronger credit, larger down payments, and more cash reserves, since they aren't eligible for Fannie Mae/Freddie Mac backing.",
      },
    ],
  },
  {
    slug: "first-time-home-buyer-mortgage-calculator",
    title: "First-Time Home Buyer Mortgage Calculator",
    description: "Calculate the total cash you'll need at closing as a first-time buyer, including a low down payment and seller credits.",
    metaTitle: "First-Time Home Buyer Mortgage Calculator — Free & Instant",
    metaDescription: "Free first-time home buyer mortgage calculator. See your total cash needed at closing including down payment, closing costs, and seller credits.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 300000, max: 100000000, step: 5000 }),
      percentField("downPaymentPercent", "Down Payment %", { default: 3, max: 50, step: 0.5 }),
      percentField("annualInterestRate", "Annual Interest Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      percentField("closingCostPercent", "Estimated Closing Costs (% of Price)", { default: 3, max: 10, step: 0.5 }),
      percentField("sellerCreditPercent", "Seller Credit Toward Closing Costs (% of Price)", { default: 0, max: 6, step: 0.5 }),
    ],
    calcResult: { label: "Total Cash Needed At Closing", format: "currency" },
    calcResults: [
      { key: "downPaymentAmount", label: "Down Payment Amount", format: "currency" },
      { key: "cashNeededAtClosing", label: "Total Cash Needed At Closing", format: "currency", highlight: true },
      { key: "monthlyPayment", label: "Monthly Payment (P&I)", format: "currency" },
    ],
    instructions:
      "Enter your home price, down payment percentage (many first-time buyer programs allow as low as 3%), " +
      "interest rate, term, estimated closing costs, and any seller credit toward closing costs you've " +
      "negotiated. The result focuses on what matters most to a first-time buyer: the total cash you'll actually " +
      "need at closing, alongside your monthly payment.",
    examples: "Example: a $300,000 home with 3% down, a 3% closing cost estimate, and a 1% seller credit needs $15,000.00 in total cash at closing ($9,000.00 down payment plus $9,000.00 closing costs minus $3,000.00 seller credit) — a $1,839.32 monthly payment.",
    assumptions:
      "Closing costs typically range 2-5% of the home price and vary by location and lender — get an exact " +
      "Loan Estimate from your lender rather than relying on this estimate alone. Seller credits toward closing " +
      "costs are negotiated as part of the purchase offer and aren't guaranteed in every transaction. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are there special loan programs for first-time buyers?",
        answer: "Many states and some lenders offer first-time buyer programs with lower down payment requirements, down payment assistance, or reduced mortgage insurance — availability and terms vary widely by location, so check with a local lender or your state's housing finance agency for programs you may qualify for.",
      },
      {
        question: "Can I negotiate a seller credit toward closing costs?",
        answer: "Yes, in many markets buyers can negotiate for the seller to cover some closing costs as part of the purchase offer — this is more common in buyer-favorable markets and less common in highly competitive seller's markets, so it depends heavily on local conditions.",
      },
    ],
  },
  {
    slug: "mortgage-tax-deduction-calculator",
    title: "Mortgage Tax Deduction Calculator",
    description: "Estimate your potential tax savings from deducting mortgage interest and property taxes, if you itemize.",
    metaTitle: "Mortgage Tax Deduction Calculator — Free & Instant",
    metaDescription: "Free mortgage tax deduction calculator. Enter your mortgage interest and property taxes to estimate your potential itemized tax savings.",
    calcInputs: [
      currencyField("annualMortgageInterestPaid", "Annual Mortgage Interest Paid", { default: 15000, max: 10000000, step: 100 }),
      currencyField("propertyTaxesPaid", "Annual Property Taxes Paid", { default: 12000, max: 10000000, step: 100 }),
      percentField("marginalTaxRatePercent", "Your Marginal Federal Tax Rate", { default: 24, max: 50, step: 1 }),
    ],
    calcResult: { label: "Estimated Tax Savings", format: "currency" },
    calcResults: [
      { key: "deductiblePropertyTax", label: "Deductible Property Tax (After SALT Cap)", format: "currency" },
      { key: "totalDeduction", label: "Total Itemized Deduction (Interest + Property Tax)", format: "currency" },
      { key: "estimatedTaxSavings", label: "Estimated Tax Savings", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your annual mortgage interest paid (from your lender's Form 1098), your annual property taxes " +
      "paid, and your marginal federal tax rate (the rate on your last dollar of income). The result estimates " +
      "your potential tax savings from itemizing these deductions, applying the federal $10,000 cap on combined " +
      "state and local tax (SALT) deductions to the property tax portion.",
    examples: "Example: $15,000 in mortgage interest and $12,000 in property taxes (capped at $10,000 deductible under the SALT cap) at a 24% marginal tax rate gives a $25,000.00 total deduction — an estimated $6,000.00 in tax savings.",
    assumptions:
      "This assumes you itemize deductions rather than taking the standard deduction — itemizing is only " +
      "worthwhile if your total itemized deductions exceed the standard deduction for your filing status, which " +
      "many homeowners with smaller mortgages may not exceed. This also assumes the $10,000 SALT cap applies " +
      "only to your property taxes here, though the cap actually covers combined state/local income, sales, and " +
      "property taxes together — if you have other state/local tax deductions, less of your property tax may be " +
      "deductible than shown. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need to itemize to get this deduction?",
        answer: "Yes — mortgage interest and property tax deductions only apply if you itemize deductions on Schedule A rather than taking the standard deduction. Since the standard deduction was significantly increased in 2018, many homeowners (especially those with smaller mortgages) find the standard deduction is actually larger than their itemized total.",
      },
      {
        question: "What is the SALT cap?",
        answer: "The federal SALT (state and local tax) deduction cap limits combined state and local income, sales, and property tax deductions to $10,000 total (for most filing statuses) — this calculator assumes your property tax is the only component competing for that cap, but if you also deduct state income or sales tax, less of your property tax may end up deductible.",
      },
    ],
  },
  {
    slug: "mortgage-comparison-calculator",
    title: "Mortgage Comparison Calculator",
    description: "Compare two complete loan offers side by side — each with its own rate, term, and fees — to see the true total cost difference.",
    metaTitle: "Mortgage Comparison Calculator — Free & Instant",
    metaDescription: "Free mortgage comparison calculator. Compare two loan offers with different rates, terms, and fees to see the total cost difference.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount (Same For Both Offers)", { default: 300000, max: 100000000, step: 1000 }),
      percentField("rateA", "Offer A: Interest Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("termAYears", "Offer A: Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      currencyField("feesA", "Offer A: Fees/Closing Costs", { default: 3000, max: 1000000, step: 100 }),
      percentField("rateB", "Offer B: Interest Rate", { default: 6, max: 20, step: 0.05 }),
      numberField("termBYears", "Offer B: Term (Years)", { default: 15, min: 1, max: 40, step: 1 }),
      currencyField("feesB", "Offer B: Fees/Closing Costs", { default: 4000, max: 1000000, step: 100 }),
    ],
    calcResult: { label: "Total Cost Difference", format: "currency" },
    calcResults: [
      { key: "paymentA", label: "Offer A: Monthly Payment", format: "currency" },
      { key: "paymentB", label: "Offer B: Monthly Payment", format: "currency" },
      { key: "totalCostA", label: "Offer A: Total Cost (Payments + Fees)", format: "currency" },
      { key: "totalCostB", label: "Offer B: Total Cost (Payments + Fees)", format: "currency" },
      { key: "costDifference", label: "Total Cost Difference (A minus B)", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan amount (assumed the same for both offers, as when comparing lenders for the same home " +
      "purchase), then each offer's own rate, term, and fees/closing costs. The result shows each offer's " +
      "monthly payment and total cost (all payments plus fees), so you can compare apples-to-apples even when " +
      "rate, term, and fees all differ between offers.",
    examples: "Example: comparing a $300,000 loan at 6.5%/30-year/$3,000 fees (Offer A, $1,896.20/month) against 6.0%/15-year/$4,000 fees (Offer B, $2,531.57/month) shows Offer A costing $225,950.78 MORE in total over its full term, despite the lower monthly payment — reflecting the much longer payoff period.",
    assumptions:
      "This compares total cost over each offer's own FULL term — if you don't plan to keep the loan that long, " +
      "a shorter-term comparison (or the Fixed-Rate vs ARM or Refinance Break-Even calculators' horizon-based " +
      "approach) may be more relevant. Total cost here is payments plus fees only, not accounting for the time " +
      "value of money or opportunity cost of a higher payment. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why would I compare a 30-year offer against a 15-year offer?",
        answer: "Lenders sometimes present very different structures when competing for your business — a lower rate with a shorter term versus a slightly higher rate with a longer term can look similar month-to-month but produce very different total costs and monthly payment sizes. This tool lets you see both the monthly affordability and true lifetime cost side by side.",
      },
      {
        question: "Should I always pick the lower total cost option?",
        answer: "Not necessarily — a shorter term with lower total cost usually requires a meaningfully higher monthly payment, which may not fit your budget even if it saves money overall. Balance the total cost difference shown here against what monthly payment you can comfortably afford.",
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
