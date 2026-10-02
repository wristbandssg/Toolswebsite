// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Loan Calculators" sub-batch D (Loan Types, Personal & Auto
// Loans). Part of the Loan Calculators tool-list build-out — see
// create-loan-core-calculators.ts for the full batch context and the
// skipped duplicate.
//
// See src/lib/calc-engine-loan-types.ts for the math and for notes on what
// each product-specific tool models beyond the general payment formula.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-types-calculators.ts
// or
//   npm run db:create-loan-types-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Re-pointed 2 Oct 2026: Loan Calculators was split into 5 sub-categories
// (see organize-tool-categories.ts), and these tools now live in
// Loan Calculators > General Loan Calculators, except the personal, auto and
// short-term tools, which go to their own sub-categories.
const CATEGORY_SLUG = "general-loan-calculators";
const CATEGORY_OVERRIDES: Record<string, string> = {
  "short-term-loan-calculator": "short-term-loan-calculators",
  "personal-loan-calculator": "personal-loan-calculators",
  "personal-loan-refinance-calculator": "personal-loan-calculators",
  "personal-loan-extra-payment-calculator": "personal-loan-calculators",
  "personal-loan-apr-calculator": "personal-loan-calculators",
  "auto-loan-calculator": "auto-vehicle-loan-calculators",
  "auto-loan-payoff-calculator": "auto-vehicle-loan-calculators",
  "auto-loan-refinance-calculator": "auto-vehicle-loan-calculators",
};

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
    slug: "secured-vs-unsecured-loan-calculator",
    title: "Secured vs Unsecured Loan Calculator",
    description: "Compare a secured loan (backed by collateral) with an unsecured loan on payment and total cost, and see your loan-to-collateral ratio.",
    metaTitle: "Secured vs Unsecured Loan Calculator — Free",
    metaDescription: "Free secured vs unsecured loan calculator. Compare payments and total cost with and without collateral, and see your loan-to-collateral ratio.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 10000000, step: 500 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 1, max: 480, step: 1 }),
      percentField("securedRatePercent", "Secured Loan Rate", { default: 7, max: 40, step: 0.05 }),
      percentField("unsecuredRatePercent", "Unsecured Loan Rate", { default: 12, max: 40, step: 0.05 }),
      currencyField("securedFees", "Extra Fees to Secure (Valuation, Lien)", { default: 200, max: 100000, step: 25 }),
      currencyField("collateralValue", "Value of Collateral", { default: 25000, max: 100000000, step: 500 }),
    ],
    calcResult: { label: "Savings With Secured Loan", format: "currency" },
    calcResults: [
      { key: "securedPayment", label: "Secured — Monthly Payment", format: "currency" },
      { key: "unsecuredPayment", label: "Unsecured — Monthly Payment", format: "currency" },
      { key: "securedTotalCost", label: "Secured — Interest + Fees", format: "currency" },
      { key: "unsecuredTotalCost", label: "Unsecured — Total Interest", format: "currency" },
      { key: "savingsWithSecured", label: "Savings With Secured Loan", format: "currency", highlight: true },
      { key: "loanToCollateralPercent", label: "Loan-to-Collateral Ratio", format: "percentage" },
    ],
    instructions:
      "Enter the amount and term, the rate you've been offered with collateral (such as a car, savings, or " +
      "property) and without it, any extra fees for securing the loan, and the collateral's value. The tool shows " +
      "what the lower rate saves you, net of fees, and how much of the collateral's value the loan uses.",
    examples:
      "Example: borrowing $15,000 over 48 months at 7% secured costs $359.19 a month, versus $395.01 at 12% " +
      "unsecured. Even after $200 of fees, securing it saves $1,519.07. Against a $25,000 car, the loan is 60% of " +
      "its value.",
    assumptions:
      "Securing a loan means the lender can take the collateral if you don't repay — the savings come with that " +
      "risk. Lenders usually cap the loan-to-collateral ratio. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why are secured loans cheaper?",
        answer: "Because the lender can recover its money by taking and selling the collateral if you default, so it charges less for the risk.",
      },
    ],
  },
  {
    slug: "short-term-loan-calculator",
    title: "Short-Term Loan Calculator",
    description: "Turn the flat fee on a short-term loan (such as a payday or cash-advance loan) into an APR, and see what rollovers cost.",
    metaTitle: "Short-Term Loan Calculator — True APR of a Fee",
    metaDescription: "Free short-term loan calculator. Convert the flat fee on a payday or short-term loan into an APR and see the cost of rolling it over.",
    calcInputs: [
      currencyField("loanAmount", "Amount Borrowed", { default: 500, max: 100000, step: 50 }),
      numberField("termDays", "Loan Length (Days)", { default: 14, min: 1, max: 365, step: 1 }),
      currencyField("financeCharge", "Fee / Finance Charge", { default: 75, max: 100000, step: 5 }),
      numberField("rollovers", "Number of Rollovers", { default: 2, min: 0, max: 24, step: 1 }),
    ],
    calcResult: { label: "APR", format: "percentage" },
    calcResults: [
      { key: "aprPercent", label: "APR", format: "percentage", highlight: true },
      { key: "totalRepayment", label: "Total Repayment (No Rollovers)", format: "currency" },
      { key: "costPer100Borrowed", label: "Fee Per $100 Borrowed", format: "currency" },
      { key: "totalFeesWithRollovers", label: "Total Fees Including Rollovers", format: "currency" },
    ],
    instructions:
      "Enter the amount you'd borrow, how many days until it's due, the fee the lender charges, and how many " +
      "times you might roll it over (extend it by paying the fee again). The tool converts the fee into an annual " +
      "percentage rate so you can compare it fairly with other credit.",
    examples:
      "Example: a $500, 14-day loan with a $75 fee costs $15 per $100 borrowed — an APR of 391.07%. Rolling it over " +
      "twice brings the total fees to $225 while you still owe the $500.",
    assumptions:
      "APR = fee ÷ amount × (365 ÷ days). Each rollover is assumed to charge the same fee again without reducing " +
      "what you owe. Rules and fee caps vary by state and country. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What are cheaper alternatives?",
        answer: "Credit union payday-alternative loans, a paycheck advance from your employer, a small personal loan, or a payment plan with the bill's provider usually cost far less.",
      },
    ],
  },
  {
    slug: "long-term-loan-calculator",
    title: "Long-Term Loan Calculator",
    description: "See the monthly payment and total interest on a long-term loan, and how much you'd save by paying it off 5 years sooner.",
    metaTitle: "Long-Term Loan Calculator — Free & Instant",
    metaDescription: "Free long-term loan calculator. See the payment and total interest on a long loan, and how much a term 5 years shorter would save.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 40000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 7, max: 40, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 6, max: 40, step: 1 }),
    ],
    calcResult: { label: "Interest Saved With 5 Years Shorter", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "interestShareOfPaymentsPercent", label: "Interest as % of Everything You Pay", format: "percentage" },
      { key: "shorterTermPayment", label: "Payment If 5 Years Shorter", format: "currency" },
      { key: "interestSavedWithShorterTerm", label: "Interest Saved With 5 Years Shorter", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan amount, rate, and a term of 6 years or more. The tool shows the monthly payment and total " +
      "interest, then the same loan 5 years shorter, so you can see what the long term costs in exchange for the " +
      "lower payment.",
    examples:
      "Example: $40,000 at 7% over 10 years costs $464.43 a month and $15,732.07 in interest — 28.23% of everything " +
      "you pay. Over 5 years the payment would be $792.05, saving $8,209.19 in interest.",
    assumptions:
      "Assumes a fixed rate over the whole term. In practice, lenders often charge a higher rate for longer " +
      "terms, which would widen the gap. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a longer loan ever the better choice?",
        answer: "It can be, if the lower payment keeps your budget safe or frees money for something with a higher return. You can also take the longer term and make extra payments when you can, keeping flexibility while cutting interest.",
      },
    ],
  },
  {
    slug: "personal-loan-calculator",
    title: "Personal Loan Calculator",
    description: "Find how much to borrow on a personal loan so you still receive the cash you need after the origination fee, plus the payment and total cost.",
    metaTitle: "Personal Loan Calculator — With Origination Fee",
    metaDescription: "Free personal loan calculator. Find the loan amount to request so an origination fee still leaves the cash you need, plus your payment and cost.",
    calcInputs: [
      currencyField("cashNeeded", "Cash You Need", { default: 10000, max: 1000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 11, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 120, step: 6 }),
      percentField("originationFeePercent", "Origination Fee", { default: 5, max: 12, step: 0.25 }),
      {
        key: "feeHandling", label: "How the Fee Is Charged", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Deducted From the Loan (Most Common)", value: 1 },
          { label: "Added to the Loan Balance", value: 2 },
        ],
      },
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "loanAmountToRequest", label: "Loan Amount to Request", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCost", label: "Total Cost (Interest + Fee)", format: "currency" },
    ],
    instructions:
      "Enter the amount of cash you actually need, the rate and term you've been offered, and the origination " +
      "fee. Many personal-loan lenders take the fee out of the loan before paying it to you, so borrowing exactly " +
      "what you need leaves you short. The tool works out the amount to apply for, the monthly payment, and the " +
      "total cost.",
    examples:
      "Example: to receive $10,000 from a loan with a 5% fee taken out, apply for $10,526.32. At 11% over 36 months " +
      "that's $344.62 a month, with $1,879.93 of interest plus the $526.32 fee — $2,406.25 in total.",
    assumptions:
      "Assumes a fixed rate and equal monthly payments. When the fee is deducted, you borrow cash ÷ (1 − fee %); " +
      "when it's added, the fee (fee % × cash) is added to the balance. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a typical origination fee?",
        answer: "Personal-loan origination fees commonly range from 0% to about 10%, depending on the lender and your credit. Some lenders charge none, so compare APRs rather than rates alone.",
      },
    ],
  },
  {
    slug: "personal-loan-refinance-calculator",
    title: "Personal Loan Refinance Calculator",
    description: "See if refinancing a personal loan saves money when the new lender's origination fee is built into the new loan.",
    metaTitle: "Personal Loan Refinance Calculator — Free",
    metaDescription: "Free personal loan refinance calculator. Compare your current payment with a new loan whose origination fee is built in, and see the net savings.",
    calcInputs: [
      currencyField("currentBalance", "Current Loan Balance", { default: 12000, max: 1000000, step: 500 }),
      percentField("currentRatePercent", "Current Interest Rate", { default: 18, max: 40, step: 0.05 }),
      numberField("remainingMonths", "Months Left on Current Loan", { default: 36, min: 1, max: 120, step: 1 }),
      percentField("newRatePercent", "New Interest Rate", { default: 10, max: 40, step: 0.05 }),
      numberField("newTermMonths", "New Loan Term (Months)", { default: 36, min: 6, max: 120, step: 6 }),
      percentField("newOriginationFeePercent", "New Loan's Origination Fee", { default: 4, max: 12, step: 0.25 }),
    ],
    calcResult: { label: "Net Savings", format: "currency" },
    calcResults: [
      { key: "newLoanAmount", label: "New Loan Needed (Incl. Fee)", format: "currency" },
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "newPayment", label: "New Monthly Payment", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "netSavings", label: "Net Savings Over the Loan", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your current balance, rate, and months left, then the new rate, term, and origination fee. Because " +
      "the new lender deducts its fee, the new loan has to be slightly larger than your balance to pay it off in " +
      "full. The tool accounts for that and compares everything you'd pay under each loan.",
    examples:
      "Example: refinancing a $12,000 balance at 18% (36 months left) into a 10% loan with a 4% fee means " +
      "borrowing $12,500. The payment drops from $433.83 to $403.34, saving $1,097.60 over 36 months even after " +
      "the fee.",
    assumptions:
      "Assumes no prepayment penalty on the current loan and equal monthly payments on both. A longer new term " +
      "lowers the payment but can reduce or erase the savings. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can refinancing hurt my credit?",
        answer: "Applying usually causes a small, temporary dip from the hard credit check, and a new account lowers your average account age. Paying the new loan on time generally outweighs this over time.",
      },
    ],
  },
  {
    slug: "personal-loan-extra-payment-calculator",
    title: "Personal Loan Extra Payment Calculator",
    description: "See how extra monthly payments plus a yearly lump sum, such as a bonus or tax refund, shorten a personal loan and cut its interest.",
    metaTitle: "Personal Loan Extra Payment Calculator — Free",
    metaDescription: "Free personal loan extra payment calculator. Add a monthly extra and a yearly lump sum to see how many months and how much interest you save.",
    calcInputs: [
      currencyField("loanAmount", "Original Loan Amount", { default: 15000, max: 1000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 120, step: 6 }),
      currencyField("extraMonthly", "Extra Each Month", { default: 50, max: 100000, step: 10 }),
      currencyField("extraYearly", "Extra Once a Year (Bonus, Tax Refund)", { default: 500, max: 1000000, step: 50 }),
    ],
    calcResult: { label: "Interest Saved", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Regular Monthly Payment", format: "currency" },
      { key: "newPayoffMonths", label: "New Payoff Time (Months)", format: "number" },
      { key: "monthsSaved", label: "Months Saved", format: "number" },
      { key: "interestSaved", label: "Interest Saved", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the original loan amount, rate, and term from your loan agreement, then any extra you'll add each " +
      "month and any lump sum you'll pay once a year (at the end of every 12th month). The tool runs the loan from " +
      "the start with those extras and shows how much sooner it's paid off.",
    examples:
      "Example: a $15,000 personal loan at 12% over 48 months costs $395.01 a month. Adding $50 a month plus $500 " +
      "each year pays it off in 38 months — 10 months early — and saves $838.89 in interest.",
    assumptions:
      "Assumes extras start from the first month and go fully to principal, with no prepayment penalty (most US " +
      "personal loans have none, but check). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the Extra Loan Payment Calculator?",
        answer: "The Extra Loan Payment Calculator starts from today's balance with a single monthly extra. This tool starts from the original loan and adds a yearly lump sum too — a common way to pay off personal loans early.",
      },
    ],
  },
  {
    slug: "personal-loan-apr-calculator",
    title: "Personal Loan APR Calculator",
    description: "Compare two personal loan offers by true APR, counting each one's origination fee, to see which is really cheaper.",
    metaTitle: "Personal Loan APR Calculator — Compare Offers",
    metaDescription: "Free personal loan APR calculator. Compare two offers with different rates and origination fees on true APR and monthly payment.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 10000, max: 1000000, step: 500 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 120, step: 6 }),
      percentField("offerARatePercent", "Offer A — Interest Rate", { default: 9.5, max: 40, step: 0.05 }),
      percentField("offerAFeePercent", "Offer A — Origination Fee", { default: 6, max: 12, step: 0.25 }),
      percentField("offerBRatePercent", "Offer B — Interest Rate", { default: 11, max: 40, step: 0.05 }),
      percentField("offerBFeePercent", "Offer B — Origination Fee", { default: 0, max: 12, step: 0.25 }),
    ],
    calcResult: { label: "APR Difference (A − B)", format: "percentage" },
    calcResults: [
      { key: "aprA", label: "Offer A — APR", format: "percentage" },
      { key: "aprB", label: "Offer B — APR", format: "percentage" },
      { key: "paymentA", label: "Offer A — Monthly Payment", format: "currency" },
      { key: "paymentB", label: "Offer B — Monthly Payment", format: "currency" },
      { key: "aprDifference", label: "APR Difference (+ B Cheaper, − A Cheaper)", format: "percentage", highlight: true },
    ],
    instructions:
      "Enter the loan amount and term, then each offer's interest rate and origination fee. The fee is taken out " +
      "of the money you receive, so an offer with a low rate but a big fee can cost more than one with a higher " +
      "rate and no fee. The tool converts each to an APR so they can be compared directly.",
    examples:
      "Example: for $10,000 over 36 months, Offer A at 9.5% with a 6% fee has the lower payment ($320.33 vs " +
      "$327.39), but its APR is 13.79% — 2.79 points higher than Offer B's 11% with no fee.",
    assumptions:
      "Assumes the origination fee is deducted from the loan proceeds and both loans have equal monthly " +
      "payments. For a single loan with a mix of percentage and dollar fees, use the Loan APR Calculator. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does the lower-rate offer have a lower payment but a higher APR?",
        answer: "The payment is based on the full loan, so a lower rate always means a lower payment. But with a 6% fee you receive only $9,400 while repaying $10,000 plus interest — the APR captures that hidden cost.",
      },
    ],
  },
  {
    slug: "auto-loan-calculator",
    title: "Auto Loan Calculator",
    description: "Calculate your car loan payment from the vehicle price, trade-in, sales tax, dealer fees, and down payment.",
    metaTitle: "Auto Loan Calculator — Car Payment With Tax & Trade-In",
    metaDescription: "Free auto loan calculator. Include the car price, trade-in and payoff, sales tax, fees, and down payment to see your amount financed and car payment.",
    calcInputs: [
      currencyField("vehiclePrice", "Vehicle Price", { default: 32000, max: 1000000, step: 500 }),
      currencyField("downPayment", "Down Payment", { default: 4000, max: 1000000, step: 250 }),
      currencyField("tradeInValue", "Trade-In Value", { default: 6000, max: 1000000, step: 250 }),
      currencyField("tradeInOwed", "Amount Still Owed on Trade-In", { default: 2000, max: 1000000, step: 250 }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 6, max: 15, step: 0.05 }),
      currencyField("fees", "Dealer, Title & Registration Fees", { default: 800, max: 100000, step: 50 }),
      percentField("annualRatePercent", "Interest Rate (APR)", { default: 6.5, max: 30, step: 0.05 }),
      {
        key: "termMonths", label: "Loan Term", type: "dropdown", required: true, default: 60,
        options: [
          { label: "36 Months", value: 36 },
          { label: "48 Months", value: 48 },
          { label: "60 Months", value: 60 },
          { label: "72 Months", value: 72 },
          { label: "84 Months", value: 84 },
        ],
      },
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "salesTax", label: "Sales Tax", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCost", label: "Total Cost (Down Payment + All Payments)", format: "currency" },
    ],
    instructions:
      "Enter the car's price, your down payment, your trade-in's value and anything you still owe on it, your " +
      "sales tax rate, and the dealer, title, and registration fees, then the rate and term. The tool builds up " +
      "the amount you'll actually finance and calculates the monthly payment.",
    examples:
      "Example: a $32,000 car with $4,000 down and a $6,000 trade-in (with $2,000 still owed), 6% sales tax ($1,560), " +
      "and $800 of fees means financing $26,360. At 6.5% for 60 months that's $515.76 a month and $4,585.82 of " +
      "interest.",
    assumptions:
      "Sales tax is charged on the price minus the trade-in value, as in most US states — some states tax the " +
      "full price, and a few have no sales tax. Any amount owed on the trade-in is added to the new loan. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I owe more on my trade-in than it's worth?",
        answer: "That's negative equity: the difference is rolled into the new loan, raising your payment and leaving you owing more than the new car is worth. Paying it down first, or keeping the car longer, avoids this.",
      },
    ],
  },
  {
    slug: "auto-loan-payoff-calculator",
    title: "Auto Loan Payoff Calculator",
    description: "Estimate your car loan payoff amount today, including daily (per-diem) interest since your last payment, and the interest you'd avoid.",
    metaTitle: "Auto Loan Payoff Calculator — Payoff Amount Today",
    metaDescription: "Free auto loan payoff calculator. Estimate today's payoff amount with per-diem interest, and see how much interest paying off your car loan now avoids.",
    calcInputs: [
      currencyField("currentBalance", "Balance After Last Payment", { default: 14500, max: 1000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate (APR)", { default: 6.9, max: 30, step: 0.05 }),
      numberField("daysSinceLastPayment", "Days Since Last Payment", { default: 12, min: 0, max: 60, step: 1 }),
      currencyField("monthlyPayment", "Monthly Payment", { default: 420, max: 100000, step: 10 }),
    ],
    calcResult: { label: "Payoff Amount", format: "currency" },
    calcResults: [
      { key: "payoffAmount", label: "Estimated Payoff Amount Today", format: "currency", highlight: true },
      { key: "perDiemInterest", label: "Daily (Per-Diem) Interest", format: "currency" },
      { key: "monthsRemainingIfKept", label: "Months Left If You Keep Paying", format: "number" },
      { key: "interestAvoidedByPayingOff", label: "Interest Avoided by Paying Off Now", format: "currency" },
    ],
    instructions:
      "Enter your balance after your last payment, the loan's APR, how many days have passed since that payment, " +
      "and your monthly payment. Car loans usually charge interest daily, so the payoff amount grows a little each " +
      "day — the tool adds that per-diem interest and compares paying off now with continuing your payments. If " +
      "your payment doesn't cover the interest, the last two results show 0.",
    examples:
      "Example: a $14,500 balance at 6.9%, 12 days after the last payment, accrues $2.74 a day, for a payoff of " +
      "$14,532.89. Keeping the $420 payment would take 39 more months; paying off now avoids about $1,677.26 of " +
      "interest.",
    assumptions:
      "Per-diem interest = balance × APR ÷ 365. This is an estimate — always get an official payoff quote from your " +
      "lender, which is good until a specific date. The months remaining assume monthly interest from today. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is my payoff amount higher than my balance?",
        answer: "Your statement balance doesn't include the interest that has built up since your last payment. The payoff amount adds that daily interest up to the day the lender receives your money.",
      },
    ],
  },
  {
    slug: "auto-loan-refinance-calculator",
    title: "Auto Loan Refinance Calculator",
    description: "See how much refinancing your car loan could save, and check your loan-to-value ratio before you apply.",
    metaTitle: "Auto Loan Refinance Calculator — Free & Instant",
    metaDescription: "Free auto loan refinance calculator. Compare your car payment at a new rate, see the net savings after fees, and check your loan-to-value ratio.",
    calcInputs: [
      currencyField("currentBalance", "Current Loan Balance", { default: 18000, max: 1000000, step: 250 }),
      percentField("currentRatePercent", "Current Interest Rate", { default: 9, max: 30, step: 0.05 }),
      numberField("remainingMonths", "Months Left on Current Loan", { default: 48, min: 1, max: 96, step: 1 }),
      currencyField("carValue", "Car's Current Value", { default: 16000, max: 1000000, step: 250 }),
      percentField("newRatePercent", "New Interest Rate", { default: 6, max: 30, step: 0.05 }),
      numberField("newTermMonths", "New Loan Term (Months)", { default: 48, min: 12, max: 96, step: 6 }),
      currencyField("refinanceFees", "Refinance & Title Fees", { default: 150, max: 10000, step: 25 }),
    ],
    calcResult: { label: "Net Savings", format: "currency" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "newPayment", label: "New Monthly Payment", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "netSavings", label: "Net Savings After Fees", format: "currency", highlight: true },
      { key: "loanToValuePercent", label: "Loan-to-Value Ratio", format: "percentage" },
    ],
    instructions:
      "Enter your current balance, rate, and months left, your car's current market value, and the new rate, " +
      "term, and fees. The tool compares payments and total cost, and shows your loan-to-value (LTV) ratio — the " +
      "balance as a percentage of the car's value. Many lenders won't refinance, or charge more, if LTV is well " +
      "over 100%.",
    examples:
      "Example: refinancing an $18,000 balance from 9% to 6% over 48 months lowers the payment from $447.93 to " +
      "$422.73 and saves $1,059.61 after $150 of fees. With the car worth $16,000, LTV is 112.50% — above 100%, " +
      "which some lenders won't accept.",
    assumptions:
      "Assumes fees are paid upfront, not added to the loan, and no prepayment penalty on the current loan. The " +
      "car's value is your estimate — lenders use their own valuation guides. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I'm underwater on my car loan?",
        answer: "If you owe more than the car is worth (LTV over 100%), you may need to pay the balance down first, look for lenders that accept higher LTVs, or wait until the loan catches up with the car's value.",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
        "then re-run this script."
    );
  }

  const overrideIds = new Map<string, string>();
  for (const slug of new Set(Object.values(CATEGORY_OVERRIDES))) {
    const override = await prisma.toolCategory.findUnique({ where: { slug } });
    if (!override) {
      throw new Error(
        `The "${slug}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, then re-run this script.`
      );
    }
    overrideIds.set(slug, override.id);
  }

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const overrideSlug = CATEGORY_OVERRIDES[def.slug];
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: overrideSlug ? overrideIds.get(overrideSlug)! : category.id,
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated (filed under "${category.name}" and its sibling loan sub-categories).`);
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
