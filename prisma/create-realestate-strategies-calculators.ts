// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Real Estate Calculators" sub-batch E (Investment Strategies & Comparisons). Part of the
// Real Estate tool-list build-out: 121 tools in the source list, 9 skipped as
// duplicates (8 already in Real Estate Calculators, plus
// property-tax-calculator in Tax Calculators), 112 built across 11
// sub-batches — all under Finance Calculators > Real Estate Calculators:
//   create-realestate-rental-income-calculators.ts (12 tools)
//   create-realestate-rental-ratios-calculators.ts (11 tools)
//   create-realestate-value-appreciation-calculators.ts (10 tools)
//   create-realestate-returns-equity-debt-calculators.ts (10 tools)
//   create-realestate-strategies-calculators.ts (11 tools)
//   create-realestate-flips-calculators.ts (13 tools)
//   create-realestate-homebuying-calculators.ts (10 tools)
//   create-realestate-selling-tax-calculators.ts (9 tools)
//   create-realestate-mortgage-commercial-calculators.ts (9 tools)
//   create-realestate-multifamily-land-calculators.ts (9 tools)
//   create-realestate-short-term-calculators.ts (8 tools)
//
// See src/lib/calc-engine-realestate-strategies.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-realestate-strategies-calculators.ts
// or
//   npm run db:create-realestate-strategies-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "real-estate-calculators";

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
  "This tool provides general estimates for informational purposes only and isn't financial, investment, tax " +
  "or legal advice. Property prices, rents, costs, loan terms and tax rules vary by location and change over " +
  "time — check the figures with a lender, tax professional or real estate adviser before you buy, sell or invest.";

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
    slug: "capitalization-rate-vs-cash-on-cash-calculator",
    title: "Capitalization Rate vs Cash-on-Cash Calculator",
    description: "Compare a property's cap rate with your cash-on-cash return after financing, and see whether the loan boosts your return (positive leverage) or drags it down.",
    metaTitle: "Cap Rate vs Cash-on-Cash Calculator — Leverage",
    metaDescription: "Free cap rate vs cash-on-cash calculator. Compare the unlevered cap rate with your return after the mortgage to see if leverage helps or hurts.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 400000, max: 10000000000, step: 1000 }),
      currencyField("annualNoi", "Net Operating Income (Yearly)", { default: 28000, max: 1000000000, step: 500 }),
      percentField("downPaymentPercent", "Down Payment", { default: 25, min: 1, max: 100, step: 1 }),
      percentField("interestRatePercent", "Interest Rate", { default: 7, max: 30, step: 0.05 }),
      numberField("loanYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Cash-on-Cash Return", format: "percentage" },
    calcResults: [
      { key: "cashOnCashPercent", label: "Cash-on-Cash Return", format: "percentage", highlight: true },
      { key: "capRatePercent", label: "Cap Rate", format: "percentage" },
      { key: "leverageEffectPercent", label: "Leverage Effect (Points)", format: "percentage" },
      { key: "loanConstantPercent", label: "Loan Constant", format: "percentage" },
    ],
    instructions: "Enter the price, the property's yearly NOI and your loan terms. Leverage helps only when the cap rate is higher than the loan constant — the yearly payment as a percentage of the loan.",
    examples: "Example: $28,000 of NOI on a $400,000 property is a 7% cap rate. With 25% down at 7% interest the loan constant is 7.98% — more than the cap rate — so cash-on-cash falls to 4.05%, a leverage effect of -2.95 points.",
    assumptions: "Cash invested is the down payment only; add closing costs for a stricter figure. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is negative leverage?", answer: "When borrowing costs more (as a yearly percentage) than the property earns, the loan lowers your cash return. It's common when interest rates are above cap rates." }],
  },
  {
    slug: "cap-rate-vs-roi-calculator",
    title: "Cap Rate vs ROI Calculator",
    description: "See how a property's cap rate compares with your full first-year ROI once you add loan paydown and appreciation to cash flow — and with cash-flow-only return.",
    metaTitle: "Cap Rate vs ROI Calculator — Full Year-1 Return",
    metaDescription: "Free cap rate vs ROI calculator. Compare the cap rate with first-year ROI including cash flow, loan paydown and appreciation on the cash you put in.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 350000, max: 10000000000, step: 1000 }),
      currencyField("annualNoi", "Net Operating Income (Yearly)", { default: 24500, max: 1000000000, step: 500 }),
      percentField("downPaymentPercent", "Down Payment", { default: 25, min: 1, max: 100, step: 1 }),
      percentField("interestRatePercent", "Interest Rate", { default: 7, max: 30, step: 0.05 }),
      numberField("loanYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      percentField("appreciationPercent", "Appreciation per Year", { default: 3, min: -20, max: 30, step: 0.1 }),
    ],
    calcResult: { label: "Total First-Year ROI", format: "percentage" },
    calcResults: [
      { key: "totalRoiYear1Percent", label: "Total First-Year ROI", format: "percentage", highlight: true },
      { key: "capRatePercent", label: "Cap Rate", format: "percentage" },
      { key: "cashFlowOnlyRoiPercent", label: "Cash Flow Only ROI", format: "percentage" },
      { key: "totalReturnYear1", label: "Total Return (Year 1)", format: "currency" },
    ],
    instructions: "Enter the price, the yearly NOI, your loan terms and an appreciation rate. The cap rate describes the property; ROI describes your return on the cash you invested.",
    examples: "Example: $24,500 of NOI on a $350,000 property is a 7% cap rate. After the mortgage, cash flow alone returns 4.05% on the down payment — but adding loan paydown and 3% appreciation lifts the total to $16,709.47, a 19.1% first-year ROI.",
    assumptions: "Cash invested is the down payment. Appreciation is unrealized until you sell. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Should I buy based on cap rate or ROI?", answer: "Use cap rate to compare properties and price, and ROI to judge your own deal with your financing. A good deal usually looks reasonable on both." }],
  },
  {
    slug: "property-investment-comparison-calculator",
    title: "Property Investment Comparison Calculator",
    description: "Compare two investment properties side by side with the same financing — cap rate, monthly cash flow and cash-on-cash return — to see which deal is stronger.",
    metaTitle: "Property Comparison Calculator — Deal A vs Deal B",
    metaDescription: "Free property investment comparison calculator. Put two rentals side by side with the same loan terms and compare cap rate, cash flow and cash-on-cash.",
    calcInputs: [
      currencyField("priceA", "Property A — Price", { default: 250000, max: 10000000000, step: 1000 }),
      currencyField("rentA", "Property A — Monthly Rent", { default: 2100, max: 10000000, step: 25 }),
      currencyField("expensesA", "Property A — Monthly Operating Expenses", { default: 700, max: 10000000, step: 25 }),
      currencyField("priceB", "Property B — Price", { default: 380000, max: 10000000000, step: 1000 }),
      currencyField("rentB", "Property B — Monthly Rent", { default: 2900, max: 10000000, step: 25 }),
      currencyField("expensesB", "Property B — Monthly Operating Expenses", { default: 950, max: 10000000, step: 25 }),
      percentField("downPaymentPercent", "Down Payment (Both)", { default: 25, min: 1, max: 100, step: 1 }),
      percentField("closingCostPercent", "Closing Costs (Both)", { default: 3, max: 20, step: 0.25 }),
      percentField("interestRatePercent", "Interest Rate (Both, 30-Year)", { default: 7, max: 30, step: 0.05 }),
    ],
    calcResult: { label: "Cash-on-Cash Difference (A − B)", format: "percentage" },
    calcResults: [
      { key: "cashOnCashDifferenceAMinusB", label: "Cash-on-Cash Difference (A − B, Points)", format: "percentage", highlight: true },
      { key: "cashOnCashA", label: "Property A — Cash-on-Cash", format: "percentage" },
      { key: "cashOnCashB", label: "Property B — Cash-on-Cash", format: "percentage" },
      { key: "capRateA", label: "Property A — Cap Rate", format: "percentage" },
      { key: "capRateB", label: "Property B — Cap Rate", format: "percentage" },
      { key: "monthlyCashFlowA", label: "Property A — Monthly Cash Flow", format: "currency" },
      { key: "monthlyCashFlowB", label: "Property B — Monthly Cash Flow", format: "currency" },
    ],
    instructions: "Enter each property's price, monthly rent and monthly operating expenses (tax, insurance, repairs, management — not the mortgage). Both use the same down payment, closing costs and a 30-year loan, so the comparison is fair.",
    examples: "Example: Property A ($250,000, $2,100 rent) cash flows $152.56 a month — a 2.62% cash-on-cash return and 6.72% cap rate. Property B ($380,000, $2,900 rent) cash flows only $53.89 (0.61%, 6.16% cap), so A wins by 2.01 points.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What else should I compare besides returns?", answer: "Location, the property's age and condition, tenant demand, likely appreciation and how much work it needs. A slightly lower return on a newer property can carry less risk." }],
  },
  {
    slug: "multiple-property-investment-calculator",
    title: "Multiple Property Investment Calculator",
    description: "Track a portfolio of up to three rental properties: total cash flow, total equity, blended cash-on-cash return and overall loan-to-value.",
    metaTitle: "Rental Portfolio Calculator — Up to 3 Properties",
    metaDescription: "Free multiple property investment calculator. Combine up to three rentals to see total cash flow, total equity, blended cash-on-cash return and LTV.",
    calcInputs: [
      currencyField("property1Value", "Property 1 — Value", { default: 300000, max: 10000000000, step: 1000 }),
      currencyField("property1LoanBalance", "Property 1 — Loan Balance", { default: 210000, max: 10000000000, step: 1000 }),
      currencyField("property1AnnualCashFlow", "Property 1 — Yearly Cash Flow", { default: 4200, max: 1000000000, step: 100 }),
      currencyField("property1CashInvested", "Property 1 — Cash Invested", { default: 70000, max: 10000000000, step: 1000 }),
      currencyField("property2Value", "Property 2 — Value", { default: 250000, max: 10000000000, step: 1000 }),
      currencyField("property2LoanBalance", "Property 2 — Loan Balance", { default: 150000, max: 10000000000, step: 1000 }),
      currencyField("property2AnnualCashFlow", "Property 2 — Yearly Cash Flow", { default: 5400, max: 1000000000, step: 100 }),
      currencyField("property2CashInvested", "Property 2 — Cash Invested", { default: 65000, max: 10000000000, step: 1000 }),
      currencyField("property3Value", "Property 3 — Value", { default: 400000, max: 10000000000, step: 1000 }),
      currencyField("property3LoanBalance", "Property 3 — Loan Balance", { default: 300000, max: 10000000000, step: 1000 }),
      currencyField("property3AnnualCashFlow", "Property 3 — Yearly Cash Flow", { default: 3000, max: 1000000000, step: 100 }),
      currencyField("property3CashInvested", "Property 3 — Cash Invested", { default: 105000, max: 10000000000, step: 1000 }),
    ],
    calcResult: { label: "Total Yearly Cash Flow", format: "currency" },
    calcResults: [
      { key: "totalAnnualCashFlow", label: "Total Yearly Cash Flow", format: "currency", highlight: true },
      { key: "monthlyCashFlow", label: "Total Monthly Cash Flow", format: "currency" },
      { key: "totalEquity", label: "Total Equity", format: "currency" },
      { key: "blendedCashOnCashPercent", label: "Blended Cash-on-Cash Return", format: "percentage" },
      { key: "portfolioLtvPercent", label: "Portfolio Loan-to-Value", format: "percentage" },
    ],
    instructions: "For each property enter its current value, loan balance, yearly cash flow after the mortgage and the cash you originally put in. Enter zeros for any property you don't have.",
    examples: "Example: three rentals worth $950,000 with $660,000 of loans hold $290,000 of equity (69.47% LTV). Together they cash flow $12,600 a year ($1,050 a month) on $240,000 invested — a blended 5.25% cash-on-cash return.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why look at the portfolio instead of each property?", answer: "A weak property can hide inside a strong portfolio. Totals show your overall risk and income; compare each property's numbers too, to spot one worth selling or improving." }],
  },
  {
    slug: "property-investment-calculator",
    title: "Property Investment Calculator",
    description: "See the 10-year picture of a rental property investment: total return, equity built, cash flow collected and the equity multiple on your cash.",
    metaTitle: "Property Investment Calculator — 10-Year Return",
    metaDescription: "Free property investment calculator. See 10-year total return, equity, cash flow and equity multiple for a rental bought with a 30-year mortgage.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 350000, max: 10000000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 25, max: 100, step: 1 }),
      currencyField("closingCosts", "Closing Costs", { default: 10000, max: 1000000000, step: 500 }),
      currencyField("monthlyRent", "Monthly Rent", { default: 2600, max: 10000000, step: 25 }),
      currencyField("monthlyExpenses", "Monthly Operating Expenses", { default: 850, max: 10000000, step: 25 }),
      percentField("interestRatePercent", "Interest Rate (30-Year)", { default: 7, max: 30, step: 0.05 }),
      percentField("appreciationPercent", "Appreciation per Year", { default: 3, min: -20, max: 30, step: 0.1 }),
      percentField("rentGrowthPercent", "Rent & Expense Growth per Year", { default: 3, min: -20, max: 30, step: 0.5 }),
    ],
    calcResult: { label: "10-Year Total Return", format: "currency" },
    calcResults: [
      { key: "tenYearTotalReturn", label: "10-Year Total Return", format: "currency", highlight: true },
      { key: "equityAfter10Years", label: "Equity After 10 Years", format: "currency" },
      { key: "cashFlowOver10Years", label: "Cash Flow Over 10 Years", format: "currency" },
      { key: "equityMultiple", label: "Equity Multiple", format: "number" },
      { key: "year1MonthlyCashFlow", label: "Year 1 Monthly Cash Flow", format: "currency" },
    ],
    instructions: "Enter the price, down payment, closing costs, rent and operating expenses, the mortgage rate, and how fast you expect value and rent to grow.",
    examples: "Example: a $350,000 rental with 25% down barely breaks even in year one ($3.58 a month), but rising rents bring $31,171.18 of cash flow over 10 years. With equity of $245,113.23, the total return is $178,784.41 — an equity multiple of 2.83.",
    assumptions: "Equity is before selling costs and tax. Rent and expenses grow at the same rate. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is a rental with almost no cash flow a bad investment?", answer: "Not always — equity growth can make the total return strong. But thin cash flow leaves no cushion for vacancies or repairs, so it carries more risk." }],
  },
  {
    slug: "buy-and-hold-real-estate-calculator",
    title: "Buy and Hold Real Estate Calculator",
    description: "Project a long-term buy-and-hold rental over 20 years or more — equity, value, future rent, cash flow at the end, and total cash collected along the way.",
    metaTitle: "Buy and Hold Calculator — Long-Term Rental Outlook",
    metaDescription: "Free buy and hold real estate calculator. Project equity, value, future rent and cash flow for a rental held 20+ years on a 30-year mortgage.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 300000, max: 10000000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 20, max: 100, step: 1 }),
      percentField("interestRatePercent", "Interest Rate (30-Year)", { default: 7, max: 30, step: 0.05 }),
      currencyField("monthlyRent", "Monthly Rent Today", { default: 2300, max: 10000000, step: 25 }),
      currencyField("monthlyExpenses", "Monthly Operating Expenses Today", { default: 750, max: 10000000, step: 25 }),
      percentField("appreciationPercent", "Appreciation per Year", { default: 3, min: -20, max: 30, step: 0.1 }),
      percentField("rentGrowthPercent", "Rent & Expense Growth per Year", { default: 3, min: -20, max: 30, step: 0.5 }),
      numberField("holdYears", "Years Held", { unit: "years", default: 20, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Equity at End of Hold", format: "currency" },
    calcResults: [
      { key: "equityAtEndOfHold", label: "Equity at End of Hold", format: "currency", highlight: true },
      { key: "propertyValueThen", label: "Property Value Then", format: "currency" },
      { key: "monthlyRentThen", label: "Monthly Rent Then", format: "currency" },
      { key: "monthlyCashFlowThen", label: "Monthly Cash Flow Then", format: "currency" },
      { key: "totalCashFlowCollected", label: "Total Cash Flow Collected", format: "currency" },
    ],
    instructions: "Enter the price, down payment and rate, today's rent and operating expenses, growth rates and how many years you'll hold. After 30 years the mortgage is paid off and cash flow jumps.",
    examples: "Example: a $300,000 rental held 20 years at 3% growth is worth $541,833.37 with $404,313.18 of equity. Rent reaches $4,154.06 a month, monthly cash flow $1,202.75, and you'd have collected $116,574.73 along the way.",
    assumptions: "The fixed mortgage payment doesn't grow; rent and expenses do. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why does buy and hold work so well over time?", answer: "Rents rise with inflation but the mortgage payment stays fixed, so cash flow widens each year — while tenants pay down the loan and the property appreciates." }],
  },
  {
    slug: "brrrr-calculator",
    title: "BRRRR Calculator",
    description: "Run the numbers on a BRRRR deal — Buy, Rehab, Rent, Refinance, Repeat — to see how much of your cash comes back at refinance and the return on any cash left in.",
    metaTitle: "BRRRR Calculator — Cash Left In & Return",
    metaDescription: "Free BRRRR calculator. See the all-in cost, refinance loan, equity and cash left in the deal after a cash-out refinance, plus your return on it.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 150000, max: 10000000000, step: 1000 }),
      currencyField("rehabCost", "Rehab Cost", { default: 45000, max: 1000000000, step: 500 }),
      currencyField("purchaseAndHoldingCosts", "Closing & Holding Costs", { default: 12000, max: 1000000000, step: 500 }),
      currencyField("afterRepairValue", "After-Repair Value (ARV)", { default: 260000, max: 10000000000, step: 1000 }),
      percentField("refinanceLtvPercent", "Refinance LTV", { default: 75, max: 100, step: 1 }),
      currencyField("refinanceCosts", "Refinance Closing Costs", { default: 5000, max: 1000000000, step: 250 }),
      currencyField("annualCashFlowAfterRefi", "Yearly Cash Flow After Refinance", { default: 2400, max: 1000000000, step: 100 }),
    ],
    calcResult: { label: "Cash Left in the Deal", format: "currency" },
    calcResults: [
      { key: "cashLeftInDeal", label: "Cash Left in the Deal (Negative = Cash Out)", format: "currency", highlight: true },
      { key: "totalAllInCost", label: "All-In Cost", format: "currency" },
      { key: "newLoanAmount", label: "Refinance Loan Amount", format: "currency" },
      { key: "equityAfterRefinance", label: "Equity After Refinance", format: "currency" },
      { key: "cashOnCashOnCashLeftPercent", label: "Cash-on-Cash on Cash Left (0 = None Left)", format: "percentage" },
    ],
    instructions: "Enter the purchase price, rehab budget, closing and holding costs, the after-repair value, the lender's refinance LTV and refinance costs, and the cash flow you expect after refinancing.",
    examples: "Example: $207,000 all-in on a house worth $260,000 after repairs. A 75% refinance gives a $195,000 loan, so after $5,000 of refinance costs only $17,000 of your cash stays in the deal — and $2,400 a year of cash flow is a 14.12% return on it, with $65,000 of equity.",
    assumptions: "Many lenders require 6 to 12 months of ownership before a cash-out refinance on the appraised value. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What makes a good BRRRR deal?", answer: "Buying and rehabbing for 75% or less of the ARV, so a 75% refinance returns most or all of your cash — while the rent still covers the new, larger mortgage." }],
  },
  {
    slug: "brrrr-refinance-calculator",
    title: "BRRRR Refinance Calculator",
    description: "For the refinance step of BRRRR: the new loan on the after-repair value, the cash-out you receive after paying off the purchase loan and closing costs, and the new payment.",
    metaTitle: "BRRRR Refinance Calculator — Cash-Out Amount",
    metaDescription: "Free BRRRR refinance calculator. Find the new loan on ARV, cash-out after paying off your purchase loan and costs, the new payment and equity left.",
    calcInputs: [
      currencyField("afterRepairValue", "After-Repair Value (Appraisal)", { default: 260000, max: 10000000000, step: 1000 }),
      percentField("refinanceLtvPercent", "Refinance LTV", { default: 75, max: 100, step: 1 }),
      currencyField("existingLoanPayoff", "Existing Loan Payoff (Hard Money, HELOC)", { default: 150000, max: 10000000000, step: 1000 }),
      currencyField("refinanceClosingCosts", "Refinance Closing Costs", { default: 5500, max: 1000000000, step: 250 }),
      percentField("newRatePercent", "New Loan Rate", { default: 7.5, max: 30, step: 0.05 }),
      numberField("newLoanYears", "New Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Cash Out to You", format: "currency" },
    calcResults: [
      { key: "cashOutToYou", label: "Cash Out to You", format: "currency", highlight: true },
      { key: "newLoanAmount", label: "New Loan Amount", format: "currency" },
      { key: "newMonthlyPayment", label: "New Monthly Payment (P&I)", format: "currency" },
      { key: "equityLeftInProperty", label: "Equity Left in Property", format: "currency" },
    ],
    instructions: "Enter the appraised value after repairs, the lender's cash-out LTV, what you owe on the loan used to buy and rehab, the refinance closing costs and the new loan's terms.",
    examples: "Example: a 75% refinance on a $260,000 appraisal is a $195,000 loan. After paying off $150,000 and $5,500 of costs, you get $39,500 back. The new payment is $1,363.47 a month and $65,000 of equity stays in the property.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Is cash-out refinance money taxable?", answer: "No — it's borrowed money, not income. But the bigger loan raises your payment, so check the rent still covers it." }],
  },
  {
    slug: "brrrr-cash-flow-calculator",
    title: "BRRRR Cash Flow Calculator",
    description: "Check whether a BRRRR rental still cash flows after the refinance — rent minus the new mortgage, taxes, insurance and reserves — and its DSCR.",
    metaTitle: "BRRRR Cash Flow Calculator — After the Refinance",
    metaDescription: "Free BRRRR cash flow calculator. See monthly and yearly cash flow after a cash-out refinance, with the new payment, reserves and DSCR.",
    calcInputs: [
      currencyField("monthlyRent", "Monthly Rent", { default: 2100, max: 10000000, step: 25 }),
      currencyField("newLoanAmount", "New Loan Amount", { default: 195000, max: 10000000000, step: 1000 }),
      percentField("newRatePercent", "New Loan Rate", { default: 7.5, max: 30, step: 0.05 }),
      numberField("newLoanYears", "New Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      currencyField("monthlyTaxInsurance", "Monthly Taxes & Insurance", { default: 320, max: 10000000, step: 10 }),
      percentField("reservesPercent", "Reserves for Vacancy, Repairs, Capex & Management", { default: 20, max: 100, step: 1 }),
    ],
    calcResult: { label: "Monthly Cash Flow", format: "currency" },
    calcResults: [
      { key: "monthlyCashFlow", label: "Monthly Cash Flow", format: "currency", highlight: true },
      { key: "annualCashFlow", label: "Yearly Cash Flow", format: "currency" },
      { key: "newMonthlyPrincipalAndInterest", label: "New Monthly P&I", format: "currency" },
      { key: "monthlyReserves", label: "Monthly Reserves", format: "currency" },
      { key: "dscr", label: "DSCR (Rent ÷ PITI)", format: "number" },
    ],
    instructions: "Enter the rent, the refinanced loan and its terms, monthly taxes and insurance, and the share of rent you set aside for vacancy, repairs, capital expenses and management.",
    examples: "Example: $2,100 rent against a $1,363.47 payment, $320 of tax and insurance and $420 of reserves leaves -$3.47 a month (-$41.62 a year). The DSCR is 1.25, so a lender may approve it, but it's break-even — a smaller cash-out would help.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What if cash flow is negative after the refinance?", answer: "Take less cash out, look for a lower rate, raise rent to market, or cut costs. Pulling out all your cash isn't worth it if the property then loses money every month." }],
  },
  {
    slug: "buy-vs-rent-calculator",
    title: "Buy vs Rent Calculator",
    description: "Use the 5% rule to compare renting with buying: the yearly unrecoverable costs of owning — property tax, maintenance and the cost of your money — against the rent for a similar home.",
    metaTitle: "Buy vs Rent Calculator — The 5% Rule",
    metaDescription: "Free buy vs rent calculator using the 5% rule. Compare property tax, maintenance and cost of capital with rent to see which is cheaper each month.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 500000, max: 10000000000, step: 1000 }),
      percentField("propertyTaxPercent", "Property Tax Rate", { default: 1.1, max: 10, step: 0.05 }),
      percentField("maintenancePercent", "Maintenance (% of Value)", { default: 1, max: 10, step: 0.1 }),
      percentField("costOfCapitalPercent", "Cost of Capital (Mortgage & Lost Returns)", { default: 3, max: 20, step: 0.1 }),
      currencyField("monthlyRentForSimilarHome", "Rent for a Similar Home", { default: 2300, max: 10000000, step: 25 }),
    ],
    calcResult: { label: "Break-Even Monthly Rent", format: "currency" },
    calcResults: [
      { key: "breakEvenMonthlyRent", label: "Break-Even Monthly Rent", format: "currency", highlight: true },
      { key: "monthlySavingIfRenting", label: "Monthly Saving if Renting (Negative = Buying Cheaper)", format: "currency" },
      { key: "yearlyUnrecoverableCostOfOwning", label: "Yearly Unrecoverable Cost of Owning", format: "currency" },
      { key: "unrecoverableCostPercent", label: "Unrecoverable Cost Rate", format: "percentage" },
    ],
    instructions: "Enter the home's price, its property tax rate, a maintenance estimate, and your cost of capital (a blend of your mortgage rate and what your down payment could earn invested — about 3% is typical). If rent for a similar home is below the break-even rent, renting is cheaper.",
    examples: "Example: on a $500,000 home, 1.1% tax, 1% maintenance and a 3% cost of capital add up to 5.1% — $25,500 a year, or $2,125 a month. Rent for a similar home is $2,300, so buying is $175 a month cheaper (-$175).",
    assumptions: "The 5% rule compares only costs you never get back; it ignores appreciation and buying and selling costs. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is the 5% rule?", answer: "Popularized by Canadian portfolio manager Ben Felix, it says the unrecoverable costs of owning run about 5% of the home's value a year. Multiply the price by 5% and divide by 12 — if you can rent for less, renting is cheaper." }],
  },
  {
    slug: "rent-vs-own-calculator",
    title: "Rent vs Own Calculator",
    description: "Compare your net worth after years of owning a home versus renting and investing the difference — including the down payment you'd otherwise invest.",
    metaTitle: "Rent vs Own Calculator — Net Worth Comparison",
    metaDescription: "Free rent vs own calculator. Compare home equity after owning with the investments a renter builds from the down payment and monthly savings.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 450000, max: 10000000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 20, max: 100, step: 1 }),
      percentField("interestRatePercent", "Mortgage Rate (30-Year)", { default: 6.5, max: 30, step: 0.05 }),
      currencyField("ownerMonthlyExtraCosts", "Owner's Monthly Tax, Insurance & Upkeep", { default: 900, max: 10000000, step: 25 }),
      currencyField("monthlyRent", "Monthly Rent", { default: 2400, max: 10000000, step: 25 }),
      percentField("appreciationPercent", "Home Appreciation per Year", { default: 3, min: -20, max: 30, step: 0.1 }),
      percentField("investmentReturnPercent", "Investment Return per Year", { default: 6, min: -20, max: 30, step: 0.1 }),
      percentField("rentGrowthPercent", "Rent & Cost Growth per Year", { default: 3, min: -20, max: 30, step: 0.5 }),
      numberField("years", "Years", { unit: "years", default: 10, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Owning Advantage", format: "currency" },
    calcResults: [
      { key: "owningAdvantage", label: "Owning Advantage (Negative = Renting Wins)", format: "currency", highlight: true },
      { key: "ownerNetWorth", label: "Owner's Home Equity", format: "currency" },
      { key: "renterNetWorth", label: "Renter's Investments", format: "currency" },
      { key: "ownerMonthlyCostYear1", label: "Owner's Monthly Cost (Year 1)", format: "currency" },
    ],
    instructions: "Enter the home price, down payment and rate, the owner's monthly tax, insurance and upkeep, the rent for a similar home, and growth and return rates. The renter invests the down payment and, each month, whatever owning would have cost beyond the rent.",
    examples: "Example: owning a $450,000 home costs $3,175.44 a month in year one against $2,400 of rent. After 10 years the owner has $299,568.32 of equity and the renter $258,911.04 invested, so owning comes out $40,657.27 ahead.",
    assumptions: "Ignores buying and selling costs, taxes on investment gains and the mortgage-interest deduction. " + GENERAL_DISCLAIMER,
    faq: [{ question: "When does renting beat owning?", answer: "When you'll move within a few years, when home prices are high compared with rents, or when investments grow much faster than home values." }],
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
