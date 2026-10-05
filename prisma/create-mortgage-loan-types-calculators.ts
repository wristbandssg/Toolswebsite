// One-time (but safe to re-run) batch setup script: creates the Mortgage Type tools
// (10) of the Mortgage Calculators expansion, filed under
// Mortgage Calculators > Mortgage Payment & Type Calculators. See src/lib/calc-engine-mortgage-loan-types.ts for the math and
// src/lib/calc-engine-mortgage-loan-types.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-mortgage-loan-types-calculators.ts
// or
//   npm run db:create-mortgage-loan-types-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "mortgage-calculators";
const CATEGORY = { name: "Mortgage Payment & Type Calculators", slug: "mortgage-payment-type-calculators" };

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
    slug: "conventional-mortgage-calculator",
    title: "Conventional Mortgage Calculator",
    description: "Calculate a conventional (non-government) mortgage payment with PMI, taxes and insurance, check it against the 2026 conforming loan limit, and see when PMI ends.",
    metaTitle: "Conventional Mortgage Calculator — PITI, PMI & Limit",
    metaDescription: "Free conventional mortgage calculator. See your full monthly payment with PMI, taxes and insurance, when PMI ends, and the conforming limit check.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 400000, max: 10000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 0.5 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.5, max: 15, step: 0.125 }),
      numberField("termYears", "Loan Term (Years)", { default: 30, min: 10, max: 30, step: 5 }),
      percentField("pmiRatePercent", "PMI Rate (Yearly, % of Loan)", { default: 0.5, max: 3, step: 0.05, required: false }),
      currencyField("annualTaxes", "Property Taxes per Year", { default: 4800, max: 200000, step: 100, required: false }),
      currencyField("annualInsurance", "Homeowners Insurance per Year", { default: 1800, max: 100000, step: 50, required: false }),
      currencyField("conformingLimit", "Conforming Loan Limit (Your County)", { default: 832750, max: 5000000, step: 1000 }),
    ],
    calcResult: { label: "Total Monthly Payment", format: "currency" },
    calcResults: [
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "withinConformingLimit", label: "Within Conforming Limit (1 = Yes, 0 = No)", format: "number" },
      { key: "principalAndInterest", label: "Principal & Interest", format: "currency" },
      { key: "monthlyPmi", label: "Monthly PMI", format: "currency" },
      { key: "monthsUntilPmiEnds", label: "Months Until PMI Ends (78% LTV)", format: "number" },
      { key: "totalMonthlyPayment", label: "Total Monthly Payment", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the price, your down payment, the rate and term, and your yearly taxes and insurance. Conventional loans " +
      "need as little as 3% down, but with less than 20% down you pay private mortgage insurance (PMI) until the balance " +
      "falls to 78% of the original value, when it ends automatically.\n\n" +
      "The 2026 conforming limit for a one-unit home is $832,750 in most counties (higher in high-cost areas). A loan above " +
      "your county's limit is a jumbo loan — see the jumbo mortgage calculator.",
    examples:
      "Example: a $400,000 home with 10% down needs a $360,000 loan. At 6.50% " +
      "over 30 years, principal and interest is $2,275.44, plus $150 of PMI and the taxes " +
      "and insurance — $2,975.44 a month. PMI drops off after about 109 months.",
    assumptions:
      "PMI is a flat yearly percentage of the original loan; the actual rate depends on your credit score and down payment. " +
      "PMI ending is based on the original amortization schedule, without extra payments or a new appraisal. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between a conventional and an FHA loan?",
        answer: "Conventional loans aren't backed by the government. They usually cost less for borrowers with good credit, and PMI can be removed, while FHA mortgage insurance typically lasts the life of the loan if you put down less than 10%.",
      },
      {
        question: "Can I remove PMI earlier?",
        answer: "Yes. You can ask the lender to cancel it once the balance reaches 80% of the original value, or sooner with a new appraisal if your home has gained value.",
      },
    ],
  },
  {
    slug: "graduated-payment-mortgage-calculator",
    title: "Graduated Payment Mortgage Calculator",
    description: "See how a graduated payment mortgage (GPM) starts with a low payment that rises each year, how much the balance grows from negative amortization, and the extra interest it costs.",
    metaTitle: "Graduated Payment Mortgage Calculator — GPM Payments",
    metaDescription: "Free graduated payment mortgage calculator. See the starting and final payment, the negative amortization, and extra interest vs a level payment.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.5, max: 15, step: 0.125 }),
      numberField("termYears", "Loan Term (Years)", { default: 30, min: 5, max: 40, step: 1 }),
      percentField("increasePercent", "Payment Increase per Year", { default: 7.5, max: 15, step: 0.5 }),
      numberField("increaseYears", "Years of Increases", { default: 5, min: 0, max: 10, step: 1 }),
    ],
    calcResult: { label: "First-Year Payment", format: "currency" },
    calcResults: [
      { key: "firstPayment", label: "First-Year Payment", format: "currency", highlight: true },
      { key: "finalPayment", label: "Payment After Increases End", format: "currency" },
      { key: "levelPaymentForComparison", label: "Level Payment (Standard Loan)", format: "currency" },
      { key: "peakBalance", label: "Highest Balance", format: "currency" },
      { key: "negativeAmortization", label: "Balance Growth (Negative Amortization)", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "extraInterestVsLevel", label: "Extra Interest vs Level Payment", format: "currency" },
    ],
    instructions:
      "A GPM keeps your early payments low by raising them by a set percentage every year for a few years, then holding " +
      "them flat. The FHA Section 245 plan most often uses 7.5% a year for 5 years. Early payments don't cover all the " +
      "interest, so the unpaid part is added to the balance (negative amortization).\n\n" +
      "Enter the loan, rate, term and the increase schedule. The calculator finds the starting payment that pays the loan " +
      "off exactly on time.",
    examples:
      "Example: a $300,000 GPM at 6.50% over 30 years, rising 7.50% a year for " +
      "5 years, starts at $1,411.25 a month — versus $1,896.20 for a standard loan — " +
      "and levels off at $2,026.03. The balance peaks at $304,359.46, and the loan costs $23,541.88 " +
      "more interest.",
    assumptions:
      "Fixed rate; payments rise once a year on the loan's anniversary. FHA limits how high the balance can grow relative " +
      "to the home's value, so not every schedule is available. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who is a graduated payment mortgage for?",
        answer: "Buyers who expect their income to rise steadily — for example, early in a career — and want a lower payment now. If your income doesn't grow, the rising payment can become a strain.",
      },
    ],
  },
  {
    slug: "physician-mortgage-loan-calculator",
    title: "Physician Mortgage Loan Calculator",
    description: "Compare a physician (doctor) mortgage with little or no down payment and no PMI against a conventional loan with 5% down and PMI — monthly payment and cash kept up front.",
    metaTitle: "Physician Mortgage Loan Calculator — vs Conventional",
    metaDescription: "Free physician mortgage calculator. Compare a 0%-down doctor loan with no PMI against a conventional loan with PMI: payment and cash kept.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 650000, max: 10000000, step: 5000 }),
      percentField("physicianDownPercent", "Physician Loan Down Payment", { default: 0, max: 20, step: 1, required: false }),
      percentField("physicianRatePercent", "Physician Loan Rate", { default: 6.75, max: 15, step: 0.125 }),
      percentField("conventionalDownPercent", "Conventional Loan Down Payment", { default: 5, max: 50, step: 1 }),
      percentField("conventionalRatePercent", "Conventional Loan Rate", { default: 6.625, max: 15, step: 0.125 }),
      percentField("pmiRatePercent", "Conventional PMI Rate (Yearly)", { default: 0.6, max: 3, step: 0.05, required: false }),
      numberField("termYears", "Loan Term (Years)", { default: 30, min: 10, max: 30, step: 5 }),
    ],
    calcResult: { label: "Physician Loan Payment", format: "currency" },
    calcResults: [
      { key: "physicianLoanAmount", label: "Physician Loan Amount", format: "currency" },
      { key: "physicianPayment", label: "Physician Loan Payment", format: "currency", highlight: true },
      { key: "conventionalPmi", label: "Conventional Loan PMI", format: "currency" },
      { key: "conventionalPayment", label: "Conventional Payment (With PMI)", format: "currency" },
      { key: "monthlyDifference", label: "Monthly Difference", format: "currency" },
      { key: "cashKeptUpFront", label: "Cash Kept Up Front", format: "currency" },
    ],
    instructions:
      "Physician (doctor) loans are offered by some banks to doctors, dentists and often other medical professionals, " +
      "including residents. They allow 0–10% down without PMI and usually leave out deferred student loans from your " +
      "debt-to-income ratio, or count them at a low payment. The rate is often a little higher than a conventional loan's.\n\n" +
      "Enter both offers to see which costs less each month and how much cash the physician loan lets you keep. A positive " +
      "difference means the physician loan payment is lower.",
    examples:
      "Example: on a $650,000 home, a 0%-down physician loan of $650,000 at 6.75% costs " +
      "$4,215.89 a month. A conventional loan with 5% down at 6.63% " +
      "costs $4,262.67 including $308.75 of PMI — so the physician loan is $46.78 a " +
      "month cheaper and keeps $32,500 in your pocket.",
    assumptions:
      "Principal and interest plus PMI only; taxes and insurance are the same for both loans. Conventional PMI applies above " +
      "80% loan-to-value. Physician loan limits and eligible professions vary by bank. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get a physician loan as a resident?",
        answer: "Often yes. Many lenders accept a signed employment contract for a job starting within 60–90 days as proof of income.",
      },
    ],
  },
  {
    slug: "assumable-mortgage-calculator",
    title: "Assumable Mortgage Calculator",
    description: "See what you'd pay to take over a seller's low-rate FHA, VA or USDA mortgage — the equity gap, any second loan to cover it, and your savings versus a new mortgage at today's rate.",
    metaTitle: "Assumable Mortgage Calculator — Equity Gap & Savings",
    metaDescription: "Free assumable mortgage calculator. See the equity gap, the second loan to cover it, and your monthly savings vs a new mortgage at today's rate.",
    calcInputs: [
      currencyField("homePrice", "Purchase Price", { default: 400000, max: 10000000, step: 1000 }),
      currencyField("assumedBalance", "Seller's Loan Balance", { default: 280000, max: 10000000, step: 1000 }),
      percentField("assumedRatePercent", "Seller's Interest Rate", { default: 3, max: 15, step: 0.125 }),
      numberField("remainingYears", "Years Left on Seller's Loan", { default: 25, min: 1, max: 30, step: 1 }),
      currencyField("cashAvailable", "Your Cash Toward the Gap", { default: 60000, max: 10000000, step: 1000 }),
      percentField("secondRatePercent", "Second Loan Rate", { default: 8.5, max: 20, step: 0.125 }),
      numberField("secondTermYears", "Second Loan Term (Years)", { default: 20, min: 1, max: 30, step: 1 }),
      percentField("marketRatePercent", "Today's Mortgage Rate", { default: 6.5, max: 15, step: 0.125 }),
    ],
    calcResult: { label: "Monthly Savings", format: "currency" },
    calcResults: [
      { key: "equityGap", label: "Equity Gap (Price − Balance)", format: "currency" },
      { key: "secondLoanNeeded", label: "Second Loan Needed", format: "currency" },
      { key: "assumedLoanPayment", label: "Assumed Loan Payment", format: "currency" },
      { key: "secondLoanPayment", label: "Second Loan Payment", format: "currency" },
      { key: "totalPaymentIfAssumed", label: "Total Payment If You Assume", format: "currency" },
      { key: "newMortgagePayment", label: "New 30-Year Mortgage Payment", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency", highlight: true },
    ],
    instructions:
      "FHA, VA and USDA loans can be taken over (assumed) by a qualified buyer, keeping the seller's rate, balance and " +
      "remaining term. The catch is the gap between the price and the balance, which you pay in cash or with a second loan " +
      "at a higher rate.\n\n" +
      "Enter the deal and today's mortgage rate. The comparison assumes you'd put the same cash down on a new 30-year loan.",
    examples:
      "Example: buying at $400,000 and assuming a $280,000 balance at 3% leaves a " +
      "$120,000 gap. With $60,000 of cash, you borrow $60,000 at 8.50%. Payments " +
      "total $1,848.49 ($1,327.79 + $520.69), versus $2,149.03 for a new " +
      "loan at 6.50% — saving $300.55 a month.",
    assumptions:
      "Principal and interest only. VA assumptions carry a 0.5% funding fee and FHA/USDA assumptions a processing fee; " +
      "not included. A VA seller's entitlement stays tied to the loan unless the buyer is a veteran who substitutes theirs. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are conventional loans assumable?",
        answer: "Generally not — most have a due-on-sale clause. Assumable loans are mainly FHA, VA and USDA loans, plus some adjustable-rate loans.",
      },
    ],
  },
  {
    slug: "blanket-mortgage-calculator",
    title: "Blanket Mortgage Calculator",
    description: "Estimate a blanket mortgage covering several properties: the loan at the lender's LTV, the monthly payment, and the release price to sell each property off the loan.",
    metaTitle: "Blanket Mortgage Calculator — Loan & Release Prices",
    metaDescription: "Free blanket mortgage calculator. See the loan on several properties, the monthly payment, and the release price to sell each one off the loan.",
    calcInputs: [
      currencyField("property1Value", "Property 1 Value", { default: 350000, max: 100000000, step: 1000 }),
      currencyField("property2Value", "Property 2 Value", { default: 275000, max: 100000000, step: 1000, required: false }),
      currencyField("property3Value", "Property 3 Value", { default: 425000, max: 100000000, step: 1000, required: false }),
      percentField("ltvPercent", "Lender's Loan-to-Value", { default: 75, max: 90, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.5, max: 20, step: 0.125 }),
      numberField("amortizationYears", "Amortization (Years)", { default: 25, min: 1, max: 30, step: 1 }),
      percentField("releasePercent", "Release Price (% of Allocated Loan)", { default: 120, min: 100, max: 150, step: 5 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalPropertyValue", label: "Total Property Value", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "releasePriceProperty1", label: "Release Price — Property 1", format: "currency" },
      { key: "releasePriceProperty2", label: "Release Price — Property 2", format: "currency" },
      { key: "releasePriceProperty3", label: "Release Price — Property 3", format: "currency" },
    ],
    instructions:
      "A blanket mortgage finances several properties with one loan — common for investors, builders and developers. A " +
      "release clause lets you sell one property and remove it from the loan by paying down a set amount, usually 110–125% " +
      "of the loan amount allocated to it.\n\n" +
      "Enter up to three property values (leave unused ones at zero), the lender's LTV, rate and amortization.",
    examples:
      "Example: three properties worth $1,050,000 at 75% LTV support a $787,500 loan, costing " +
      "$5,819.56 a month at 7.50% over 25 years. With a 120% release " +
      "clause, selling property 1 means paying down $315,000.",
    assumptions:
      "The loan is allocated to each property in proportion to its value. Many blanket loans are commercial loans with " +
      "shorter terms and a balloon payment. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the release price more than the allocated loan?",
        answer: "So the loan's balance falls faster than the collateral, protecting the lender as the best properties are sold first.",
      },
    ],
  },
  {
    slug: "non-qm-mortgage-calculator",
    title: "Non-QM Mortgage Calculator",
    description: "Estimate how much you can borrow with a non-QM bank statement, portfolio or low-doc mortgage, using your average deposits instead of tax returns to find your qualifying income and maximum home price.",
    metaTitle: "Non-QM Mortgage Calculator — Bank Statement Loan",
    metaDescription: "Free non-QM mortgage calculator. Use average bank deposits to estimate qualifying income, maximum loan and home price for a bank statement loan.",
    calcInputs: [
      currencyField("avgMonthlyDeposits", "Average Monthly Business Deposits", { default: 15000, max: 10000000, step: 100 }),
      percentField("expenseFactorPercent", "Expense Factor", { default: 50, max: 90, step: 5 }),
      currencyField("monthlyDebts", "Other Monthly Debt Payments", { default: 600, max: 1000000, step: 50, required: false }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 50, max: 60, step: 1 }),
      currencyField("taxesInsurance", "Monthly Taxes & Insurance", { default: 650, max: 100000, step: 25 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.75, max: 15, step: 0.125 }),
      percentField("downPaymentPercent", "Down Payment", { default: 15, max: 50, step: 1 }),
    ],
    calcResult: { label: "Maximum Home Price", format: "currency" },
    calcResults: [
      { key: "qualifyingIncome", label: "Qualifying Monthly Income", format: "currency" },
      { key: "maxHousingPayment", label: "Maximum Housing Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency" },
      { key: "maxHomePrice", label: "Maximum Home Price", format: "currency", highlight: true },
    ],
    instructions:
      "Non-QM (non-qualified mortgage) loans serve borrowers who don't fit standard rules — often self-employed people " +
      "whose tax returns show little income after write-offs. Portfolio lenders, who keep loans on their own books, offer " +
      "many of them. The most common is the bank statement loan: the lender averages 12 or 24 months of deposits and applies " +
      "an expense factor (often 50% for business accounts) to estimate income.\n\n" +
      "\"No-doc\" loans in the old sense no longer exist; today's low-doc options include bank statement, asset-depletion " +
      "and DSCR (rental income) loans. Expect rates roughly 1–2% above conventional and 10–20% down.",
    examples:
      "Example: average deposits of $15,000 with a 50% expense factor give " +
      "$7,500 of qualifying income. At a 50% DTI limit, after $600 of other debts, " +
      "you can spend $3,150 on housing — enough for a $348,961.09 loan at 7.75% and a " +
      "$410,542.46 home with 15% down.",
    assumptions:
      "30-year fixed rate; housing payment includes principal, interest, taxes and insurance. Lenders also set minimum " +
      "credit scores, reserves and loan limits. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a non-QM loan the same as a subprime loan?",
        answer: "No. Most non-QM borrowers have good credit and income that's simply documented differently. Lenders still have to verify you can repay.",
      },
    ],
  },
  {
    slug: "seller-financed-mortgage-calculator",
    title: "Seller-Financed Mortgage Calculator",
    description: "Work out an owner-financed home sale: the buyer's monthly payment, the balloon payment due, and what the seller collects in interest and in total.",
    metaTitle: "Seller-Financed Mortgage Calculator — Balloon & Payment",
    metaDescription: "Free seller financing calculator. See the buyer's payment, the balloon due at the end, and the seller's interest income and total received.",
    calcInputs: [
      currencyField("salePrice", "Sale Price", { default: 300000, max: 10000000, step: 1000 }),
      currencyField("downPayment", "Down Payment", { default: 30000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.5, max: 20, step: 0.125 }),
      numberField("amortizationYears", "Amortization (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      numberField("balloonYears", "Balloon Due After (Years, 0 = None)", { default: 5, min: 0, max: 30, step: 1, required: false }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "amountFinanced", label: "Amount Financed by Seller", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "balloonPayment", label: "Balloon Payment", format: "currency" },
      { key: "interestPaidBeforeBalloon", label: "Interest Paid Before Balloon", format: "currency" },
      { key: "sellerTotalReceived", label: "Seller's Total Received", format: "currency" },
    ],
    instructions:
      "In seller (owner) financing, the seller acts as the lender: the buyer pays the seller each month under a promissory " +
      "note secured by the home. Most deals amortize over 15–30 years but require the balance to be paid off in a balloon " +
      "after 3–10 years, usually by refinancing with a bank.\n\n" +
      "Enter the price, down payment, rate, amortization and when the balloon is due (0 if the loan fully amortizes).",
    examples:
      "Example: a $300,000 sale with $30,000 down leaves $270,000 financed. At 7.50% over " +
      "30 years, the payment is $1,887.88. After 5 years, the buyer owes a " +
      "$255,467.08 balloon, having paid $98,739.83 of interest; the seller receives " +
      "$398,739.83 in all.",
    assumptions:
      "Fixed rate and monthly payments. If the seller still has a mortgage, its due-on-sale clause may prevent seller " +
      "financing. Dodd-Frank rules can apply to sellers who finance more than one sale a year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens if the buyer can't pay the balloon?",
        answer: "The buyer must refinance, sell, or negotiate an extension with the seller. Otherwise the seller can foreclose, just like a bank.",
      },
    ],
  },
  {
    slug: "rent-to-own-mortgage-calculator",
    title: "Rent-to-Own Mortgage Calculator",
    description: "See what a rent-to-own (lease-option) deal adds up to: the option fee and rent credits, the mortgage you'll need at the end, its payment, and your equity if the home gains value.",
    metaTitle: "Rent-to-Own Calculator — Credits, Mortgage & Equity",
    metaDescription: "Free rent-to-own calculator. Add up the option fee and rent credits and see the mortgage you'll need at the end and your equity on day one.",
    calcInputs: [
      currencyField("purchasePrice", "Agreed Purchase Price", { default: 300000, max: 10000000, step: 1000 }),
      currencyField("optionFee", "Option Fee", { default: 9000, max: 1000000, step: 500 }),
      currencyField("monthlyRent", "Monthly Rent", { default: 2200, max: 100000, step: 50 }),
      currencyField("monthlyRentCredit", "Rent Credit per Month", { default: 300, max: 100000, step: 25, required: false }),
      numberField("leaseYears", "Lease Length (Years)", { default: 3, min: 0, max: 10, step: 0.5 }),
      percentField("appreciationPercent", "Home Value Growth per Year", { default: 4, min: -10, max: 20, step: 0.5 }),
      percentField("annualRatePercent", "Mortgage Rate at Purchase", { default: 6.5, max: 15, step: 0.125 }),
    ],
    calcResult: { label: "Mortgage Needed", format: "currency" },
    calcResults: [
      { key: "totalCredits", label: "Option Fee + Rent Credits", format: "currency" },
      { key: "creditAsPercentOfPrice", label: "Credits as % of Price", format: "percentage" },
      { key: "mortgageNeeded", label: "Mortgage Needed", format: "currency", highlight: true },
      { key: "mortgagePayment", label: "Mortgage Payment (30 Years)", format: "currency" },
      { key: "marketValueAtPurchase", label: "Market Value at Purchase", format: "currency" },
      { key: "equityAtPurchase", label: "Equity at Purchase", format: "currency" },
      { key: "totalRentPaid", label: "Total Rent Paid", format: "currency" },
    ],
    instructions:
      "In a lease-option, you pay an upfront option fee for the right to buy at a set price later, and part of each " +
      "month's rent is credited toward the purchase. At the end, you need a mortgage for the price minus those credits.\n\n" +
      "Enter the terms. If the credits reach 3–5% of the price, many lenders count them toward the down payment. If you " +
      "don't buy, you usually lose the option fee and the credits.",
    examples:
      "Example: a $9,000 option fee plus $300 a month of rent credit for 3 years add up to " +
      "$19,800 — 6.60% of the $300,000 price. You'd need a $280,200 mortgage " +
      "($1,771.05 a month at 6.50%). If the home is worth $337,459.20 by then, you start " +
      "with $57,259.20 of equity.",
    assumptions:
      "Rent credit can't exceed the rent. Lenders may only count the part of the rent above market rent as a credit. " +
      "Principal and interest only. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is rent-to-own a good idea?",
        answer: "It can help if you need time to build credit or savings, but read the contract carefully — who pays repairs, what happens if you can't get a mortgage, and whether the seller's own mortgage is current.",
      },
    ],
  },
  {
    slug: "foreign-national-mortgage-calculator",
    title: "Foreign National Mortgage Calculator",
    description: "Estimate a US mortgage for a non-resident buyer: the larger down payment, the payment with taxes and insurance, the cash reserves lenders require, and the payment in your home currency.",
    metaTitle: "Foreign National Mortgage Calculator — US Home Loan",
    metaDescription: "Free foreign national mortgage calculator. See the down payment, monthly payment, required reserves and total cash for a US home as a non-resident.",
    calcInputs: [
      currencyField("homePrice", "Home Price (US$)", { default: 500000, max: 50000000, step: 5000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 30, max: 100, step: 5 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.75, max: 15, step: 0.125 }),
      numberField("termYears", "Loan Term (Years)", { default: 30, min: 5, max: 30, step: 5 }),
      percentField("closingCostsPercent", "Closing Costs (% of Price)", { default: 3, max: 10, step: 0.5 }),
      numberField("reserveMonths", "Reserves Required (Months of Payments)", { default: 12, min: 0, max: 36, step: 1 }),
      currencyField("annualTaxesInsurance", "Taxes & Insurance per Year", { default: 8400, max: 1000000, step: 100 }),
      numberField("exchangeRate", "Exchange Rate (Your Currency per US$1)", { default: 1, min: 0, max: 100000, step: 0.0001 }),
    ],
    calcResult: { label: "Total Cash Needed", format: "currency" },
    calcResults: [
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment (With Taxes & Insurance)", format: "currency" },
      { key: "reservesRequired", label: "Reserves Required", format: "currency" },
      { key: "totalCashNeeded", label: "Total Cash Needed", format: "currency", highlight: true },
      { key: "monthlyPaymentHomeCurrency", label: "Monthly Payment in Your Currency", format: "number" },
    ],
    instructions:
      "Foreign national loans let buyers without US residency or credit history finance a US home, usually a second home " +
      "or investment property. Expect 25–40% down, a rate premium, and 6–12 months of payments in reserve, often held in a " +
      "US account.\n\n" +
      "Enter the price and terms, plus your exchange rate to see the payment in your own currency (leave 1 for US dollars).",
    examples:
      "Example: a $500,000 home with 30% down needs a $150,000 down payment and a $350,000 " +
      "loan. At 7.75% the payment with taxes and insurance is $3,207.44. Add closing costs and " +
      "12 months of reserves ($38,489.31) and you need $203,489.31 in total.",
    assumptions:
      "Reserves are counted as months of the full payment. Exchange rates move, so payments in your currency will change. " +
      "When you sell, FIRPTA withholding of up to 15% of the price may apply. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can a foreign national get a US mortgage without a Social Security number?",
        answer: "Yes. Foreign national lenders accept a passport and visa (or none, for some programs), foreign credit references and bank statements.",
      },
    ],
  },
  {
    slug: "piggyback-loan-calculator",
    title: "Piggyback Loan Calculator",
    description: "Compare an 80/10/10 piggyback loan — a first mortgage plus a second loan — against one larger mortgage with PMI, over the years you'll keep the home.",
    metaTitle: "Piggyback Loan Calculator — 80/10/10 vs PMI",
    metaDescription: "Free piggyback loan calculator. Compare an 80/10/10 first and second mortgage with one loan and PMI: monthly payment and total cost over time.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 450000, max: 10000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 20, step: 1 }),
      percentField("firstRatePercent", "First Mortgage Rate (80%)", { default: 6.5, max: 15, step: 0.125 }),
      percentField("secondRatePercent", "Second Loan Rate", { default: 8.5, max: 20, step: 0.125 }),
      numberField("secondTermYears", "Second Loan Term (Years)", { default: 15, min: 5, max: 30, step: 1 }),
      percentField("singleRatePercent", "Single Loan Rate", { default: 6.5, max: 15, step: 0.125 }),
      percentField("pmiRatePercent", "PMI Rate (Yearly)", { default: 0.5, max: 3, step: 0.05 }),
      numberField("yearsKept", "Years You'll Keep the Loan", { default: 7, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "Piggyback Savings", format: "currency" },
    calcResults: [
      { key: "firstLoan", label: "First Mortgage", format: "currency" },
      { key: "secondLoan", label: "Second Loan", format: "currency" },
      { key: "piggybackPayment", label: "Piggyback Monthly Payment", format: "currency" },
      { key: "singleLoanPaymentWithPmi", label: "Single Loan Payment With PMI", format: "currency" },
      { key: "piggybackInterestCost", label: "Piggyback Interest Over Period", format: "currency" },
      { key: "singleLoanInterestAndPmi", label: "Single Loan Interest + PMI Over Period", format: "currency" },
      { key: "piggybackSavings", label: "Piggyback Savings", format: "currency", highlight: true },
    ],
    instructions:
      "A piggyback loan splits the financing into a first mortgage for 80% of the price and a second loan (or HELOC) for the " +
      "rest of the gap, so there's no PMI. The second loan has a higher rate and is paid off faster.\n\n" +
      "Enter both options and how long you'll keep the loan. A positive saving means the piggyback costs less over that " +
      "time; a negative one means the single loan with PMI is cheaper.",
    examples:
      "Example: on a $450,000 home with 10% down, the piggyback is a $360,000 first mortgage plus a " +
      "$45,000 second loan at 8.50%, costing $2,718.58 a month versus $2,728.63 " +
      "for one loan with PMI. Over 7 years, the piggyback costs $179,648.95 in interest against " +
      "$190,390.33 — saving $10,741.38.",
    assumptions:
      "Both loans are fixed-rate and amortizing; the first is 30 years. PMI ends when the single loan reaches 78% of the " +
      "price. Closing costs for the second loan are not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can a piggyback help avoid a jumbo loan?",
        answer: "Yes. An 80/10/10 or 80/15/5 structure can keep the first mortgage under the conforming limit when one loan would be a jumbo.",
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
