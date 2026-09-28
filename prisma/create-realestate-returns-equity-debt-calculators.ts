// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Real Estate Calculators" sub-batch D (Returns, Equity & Debt Metrics). Part of the
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
// See src/lib/calc-engine-realestate-returns-equity-debt.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-realestate-returns-equity-debt-calculators.ts
// or
//   npm run db:create-realestate-returns-equity-debt-calculators

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
    slug: "real-estate-investment-return-calculator",
    title: "Real Estate Investment Return Calculator",
    description: "Measure the full return on a real estate investment from purchase to sale — internal rate of return (IRR), equity multiple and total profit from cash flow plus sale proceeds.",
    metaTitle: "Real Estate IRR Calculator — Investment Return",
    metaDescription: "Free real estate investment return calculator. Get IRR, equity multiple and total profit from yearly cash flow plus sale proceeds over your holding period.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 400000, max: 10000000000, step: 1000 }),
      currencyField("cashInvested", "Total Cash Invested", { default: 110000, max: 10000000000, step: 1000 }),
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 10000000000, step: 1000 }),
      percentField("interestRatePercent", "Interest Rate", { default: 7, max: 30, step: 0.05 }),
      numberField("loanYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      currencyField("firstYearCashFlow", "First-Year Cash Flow", { default: 5000, max: 1000000000, step: 100 }),
      percentField("cashFlowGrowthPercent", "Cash Flow Growth per Year", { default: 3, min: -20, max: 30, step: 0.5 }),
      percentField("appreciationPercent", "Appreciation per Year", { default: 3.5, min: -20, max: 30, step: 0.1 }),
      numberField("holdYears", "Holding Period", { unit: "years", default: 7, min: 1, max: 50, step: 1 }),
      percentField("sellingCostPercent", "Selling Costs", { default: 6, max: 20, step: 0.5 }),
    ],
    calcResult: { label: "IRR", format: "percentage" },
    calcResults: [
      { key: "irrPercent", label: "Internal Rate of Return (IRR)", format: "percentage", highlight: true },
      { key: "equityMultiple", label: "Equity Multiple", format: "number" },
      { key: "totalProfit", label: "Total Profit", format: "currency" },
      { key: "netSaleProceeds", label: "Net Sale Proceeds (After Loan Payoff)", format: "currency" },
      { key: "cashFlowCollected", label: "Cash Flow Collected", format: "currency" },
    ],
    instructions: "Enter the price, the cash you invested and your loan, the first year's cash flow and how it grows, an appreciation rate, how long you'll hold, and selling costs. The tool builds the yearly cash flows, adds the sale at the end, and solves for IRR.",
    examples: "Example: $110,000 invested in a $400,000 property held 7 years collects $38,312.31 of cash flow and $204,934.76 from the sale after paying off the loan. That's $133,247.07 of profit — an equity multiple of 2.21 and an IRR of 13.16%.",
    assumptions: "Returns are before income tax. " + GENERAL_DISCLAIMER,
    faq: [{ question: "IRR vs equity multiple — which should I use?", answer: "Use both. The equity multiple shows how much your money grows; IRR adds timing, so money returned sooner scores higher." }],
  },
  {
    slug: "real-estate-cash-flow-calculator",
    title: "Real Estate Cash Flow Calculator",
    description: "Project a rental property's cash flow over the next five years, with rents and operating expenses growing at different rates and a fixed mortgage payment.",
    metaTitle: "Real Estate Cash Flow Calculator — 5-Year Outlook",
    metaDescription: "Free real estate cash flow calculator. Project five years of rental cash flow with rent and expenses growing at their own rates against a fixed mortgage.",
    calcInputs: [
      currencyField("grossAnnualRent", "Gross Yearly Rent", { default: 36000, max: 10000000000, step: 500 }),
      percentField("vacancyPercent", "Vacancy Rate", { default: 5, max: 100, step: 0.5 }),
      currencyField("operatingExpenses", "Yearly Operating Expenses", { default: 12000, max: 10000000000, step: 500 }),
      currencyField("annualDebtService", "Yearly Mortgage Payments", { default: 18000, max: 10000000000, step: 500 }),
      percentField("rentGrowthPercent", "Rent Growth per Year", { default: 3, min: -20, max: 30, step: 0.5 }),
      percentField("expenseGrowthPercent", "Expense Growth per Year", { default: 4, min: -20, max: 30, step: 0.5 }),
    ],
    calcResult: { label: "Five-Year Cash Flow Total", format: "currency" },
    calcResults: [
      { key: "fiveYearCashFlowTotal", label: "Five-Year Cash Flow Total", format: "currency", highlight: true },
      { key: "year1CashFlow", label: "Year 1 Cash Flow", format: "currency" },
      { key: "year5CashFlow", label: "Year 5 Cash Flow", format: "currency" },
      { key: "year1Noi", label: "Year 1 Net Operating Income", format: "currency" },
    ],
    instructions: "Enter the gross yearly rent, a vacancy rate, yearly operating expenses and mortgage payments, and how fast you expect rent and expenses to grow. Taxes and insurance often rise faster than rent, so set them separately.",
    examples: "Example: $36,000 of rent less 5% vacancy and $12,000 of expenses gives $22,200 of NOI; after $18,000 of mortgage payments year 1 cash flow is $4,200. With rent up 3% and expenses 4% a year, year 5 reaches $6,454.10 and five years total $26,576.57.",
    assumptions: "The mortgage payment is fixed. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why project cash flow instead of using one year?", answer: "Fixed mortgage payments mean cash flow usually grows as rents rise — but fast-rising taxes or insurance can squeeze it. A projection shows which way it's heading." }],
  },
  {
    slug: "real-estate-profit-calculator",
    title: "Real Estate Profit Calculator",
    description: "Work out your total profit on a property you've sold or plan to sell — the gain on sale after buying costs, improvements and selling costs, plus the cash flow it earned while you owned it.",
    metaTitle: "Real Estate Profit Calculator — Gain on Sale",
    metaDescription: "Free real estate profit calculator. Find profit on a property sale after buying, improvement and selling costs, plus the rental cash flow collected.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 300000, max: 10000000000, step: 1000 }),
      currencyField("buyingCosts", "Buying Costs", { default: 9000, max: 1000000000, step: 500 }),
      currencyField("improvements", "Improvements", { default: 25000, max: 1000000000, step: 500 }),
      currencyField("salePrice", "Sale Price", { default: 410000, max: 10000000000, step: 1000 }),
      percentField("sellingCostPercent", "Selling Costs", { default: 7, max: 20, step: 0.5 }),
      currencyField("totalCashFlowCollected", "Total Cash Flow Collected While Owned", { default: 18000, max: 1000000000, step: 500 }),
    ],
    calcResult: { label: "Total Profit", format: "currency" },
    calcResults: [
      { key: "totalProfit", label: "Total Profit", format: "currency", highlight: true },
      { key: "profitFromSale", label: "Profit from Sale", format: "currency" },
      { key: "sellingCosts", label: "Selling Costs", format: "currency" },
      { key: "totalInvestedInProperty", label: "Total Invested in Property", format: "currency" },
      { key: "returnOnTotalCostPercent", label: "Return on Total Cost", format: "percentage" },
    ],
    instructions: "Enter what you paid, your buying costs and improvements, the sale price and selling costs (commission and closing), and the total rental cash flow you collected. Enter 0 for cash flow if it was your home.",
    examples: "Example: a $300,000 property with $9,000 of buying costs and $25,000 of improvements ($334,000 in total) sells for $410,000 less $28,700 of selling costs — a $47,300 gain. Add $18,000 of cash flow for $65,300 of profit, 19.55% on total cost.",
    assumptions: "Profit is before income tax and ignores any mortgage — see the Real Estate Investment Return Calculator for leveraged returns. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Are improvements added to my cost?", answer: "Yes. Capital improvements such as a new roof or addition raise your cost basis, which lowers your taxable gain. Routine repairs don't count." }],
  },
  {
    slug: "real-estate-break-even-calculator",
    title: "Real Estate Break-Even Calculator",
    description: "Find the price you'd need to sell a property for just to cover buying and selling costs, how much it must appreciate, and how many years that takes.",
    metaTitle: "Real Estate Break-Even Calculator — Sale Price",
    metaDescription: "Free real estate break-even calculator. See the sale price that covers buying and selling costs, the appreciation needed, and years to break even.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 350000, max: 10000000000, step: 1000 }),
      percentField("buyingCostPercent", "Buying Costs", { default: 3, max: 20, step: 0.25 }),
      percentField("sellingCostPercent", "Selling Costs", { default: 7, max: 50, step: 0.25 }),
      percentField("appreciationPercent", "Expected Appreciation per Year", { default: 3, min: -20, max: 30, step: 0.1 }),
    ],
    calcResult: { label: "Break-Even Sale Price", format: "currency" },
    calcResults: [
      { key: "breakEvenSalePrice", label: "Break-Even Sale Price", format: "currency", highlight: true },
      { key: "appreciationNeededPercent", label: "Appreciation Needed", format: "percentage" },
      { key: "yearsToBreakEven", label: "Years to Break Even (0 = Never)", format: "number" },
      { key: "totalTransactionCosts", label: "Total Buying & Selling Costs", format: "currency" },
    ],
    instructions: "Enter the purchase price, buying costs (closing costs, loan fees) and selling costs (commission, transfer tax) as percentages, plus the appreciation rate you expect.",
    examples: "Example: buying a $350,000 home with 3% buying costs and selling with 7% costs, you'd need $387,634.41 to break even — 10.75% appreciation, or about 3.46 years at 3% a year. The two transactions cost $37,634.41.",
    assumptions: "Ignores mortgage interest, rent saved and upkeep — it only covers transaction costs. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why is it risky to sell a home soon after buying?", answer: "Buying and selling costs together often reach 8% to 10% of the price. Unless prices rise quickly, selling within two or three years can mean a loss." }],
  },
  {
    slug: "real-estate-payback-period-calculator",
    title: "Real Estate Payback Period Calculator",
    description: "Find how long it takes to earn back the cash you invested in a rental when you count both cash flow and the loan principal your tenants pay down.",
    metaTitle: "Real Estate Payback Calculator — With Loan Paydown",
    metaDescription: "Free real estate payback period calculator. See how many years cash flow plus loan principal paydown take to earn back the cash you invested.",
    calcInputs: [
      currencyField("cashInvested", "Total Cash Invested", { default: 80000, max: 10000000000, step: 1000 }),
      currencyField("annualCashFlow", "Yearly Cash Flow", { default: 4000, max: 1000000000, step: 100 }),
      currencyField("loanAmount", "Loan Amount", { default: 280000, max: 10000000000, step: 1000 }),
      percentField("interestRatePercent", "Interest Rate", { default: 7, max: 30, step: 0.05 }),
      numberField("loanYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Payback Period (With Loan Paydown)", format: "number" },
    calcResults: [
      { key: "paybackYearsWithLoanPaydown", label: "Payback with Loan Paydown, Years (0 = Over 100)", format: "number", highlight: true },
      { key: "paybackYearsCashFlowOnly", label: "Payback from Cash Flow Only (Years)", format: "number" },
      { key: "loanPaydownYear1", label: "Loan Paid Down in Year 1", format: "currency" },
    ],
    instructions: "Enter the cash you put in, the property's yearly cash flow after the mortgage, and your loan details. Principal paydown grows every year, so counting it shortens the payback period.",
    examples: "Example: $80,000 invested with $4,000 of yearly cash flow takes 20 years to pay back from cash flow alone. Adding the principal paid down on a $280,000 loan at 7% — $2,844.27 in year one and rising — cuts it to 10.03 years.",
    assumptions: "Assumes steady cash flow; appreciation isn't counted. Principal paydown is only realized when you sell or refinance. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Should loan paydown count toward payback?", answer: "It's real wealth, but you can't spend it until you sell or refinance. Look at both numbers — cash flow only shows how long your cash is truly at risk." }],
  },
  {
    slug: "real-estate-equity-calculator",
    title: "Real Estate Equity Calculator",
    description: "Add up the equity across up to three properties you own, your portfolio's overall loan-to-value, and how much equity you could borrow against at a lender's maximum LTV.",
    metaTitle: "Real Estate Equity Calculator — Portfolio Equity",
    metaDescription: "Free real estate equity calculator. Total the equity in up to three properties, see portfolio loan-to-value, and how much equity you could borrow.",
    calcInputs: [
      currencyField("property1Value", "Property 1 — Value", { default: 450000, max: 10000000000, step: 1000 }),
      currencyField("property1LoanBalance", "Property 1 — Loan Balance", { default: 280000, max: 10000000000, step: 1000 }),
      currencyField("property2Value", "Property 2 — Value", { default: 300000, max: 10000000000, step: 1000 }),
      currencyField("property2LoanBalance", "Property 2 — Loan Balance", { default: 150000, max: 10000000000, step: 1000 }),
      currencyField("property3Value", "Property 3 — Value (0 if None)", { default: 0, max: 10000000000, step: 1000 }),
      currencyField("property3LoanBalance", "Property 3 — Loan Balance", { default: 0, max: 10000000000, step: 1000 }),
      percentField("maxLtvPercent", "Lender's Maximum LTV", { default: 75, max: 100, step: 1 }),
    ],
    calcResult: { label: "Total Equity", format: "currency" },
    calcResults: [
      { key: "totalEquity", label: "Total Equity", format: "currency", highlight: true },
      { key: "totalValue", label: "Total Property Value", format: "currency" },
      { key: "portfolioLtvPercent", label: "Portfolio Loan-to-Value", format: "percentage" },
      { key: "equityAvailableToBorrow", label: "Equity Available to Borrow", format: "currency" },
    ],
    instructions: "Enter each property's current value and what you still owe on it. Set the maximum loan-to-value a lender would allow for a cash-out refinance or equity loan — often 70% to 80% for investment property.",
    examples: "Example: properties worth $450,000 and $300,000 with $430,000 of loans hold $320,000 of equity at a 57.33% LTV. A lender allowing 75% would let you borrow up to $132,500 more.",
    assumptions: "Borrowing capacity also depends on your income, credit and each lender's rules. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How do investors use equity to buy more property?", answer: "Through a cash-out refinance, a HELOC on a primary home, or a portfolio loan — then use the cash as a down payment on the next property." }],
  },
  {
    slug: "home-equity-calculator",
    title: "Home Equity Calculator",
    description: "See how much equity you have in your home and how much you could borrow with a home equity loan or HELOC at a lender's combined loan-to-value (CLTV) limit.",
    metaTitle: "Home Equity Calculator — How Much Can I Borrow?",
    metaDescription: "Free home equity calculator. Find your home equity, equity percentage and how much you could borrow with a HELOC or home equity loan at the CLTV limit.",
    calcInputs: [
      currencyField("homeValue", "Current Home Value", { default: 500000, max: 10000000000, step: 1000 }),
      currencyField("mortgageBalance", "Mortgage Balance", { default: 280000, max: 10000000000, step: 1000 }),
      currencyField("otherLiens", "Other Loans Against the Home", { default: 0, max: 10000000000, step: 1000 }),
      percentField("lenderMaxCltvPercent", "Lender's Maximum CLTV", { default: 85, max: 100, step: 1 }),
    ],
    calcResult: { label: "Home Equity", format: "currency" },
    calcResults: [
      { key: "homeEquity", label: "Home Equity", format: "currency", highlight: true },
      { key: "equityPercent", label: "Equity as % of Value", format: "percentage" },
      { key: "maxHelocOrHomeEquityLoan", label: "Max HELOC or Home Equity Loan", format: "currency" },
      { key: "currentCltvPercent", label: "Current Combined LTV", format: "percentage" },
    ],
    instructions: "Enter your home's current value, your mortgage balance and any other loans secured by the home. Most lenders let total borrowing reach 80% to 85% of the home's value.",
    examples: "Example: a $500,000 home with a $280,000 mortgage has $220,000 of equity (44%). At an 85% CLTV limit you could borrow up to $145,000 with a HELOC or home equity loan.",
    assumptions: "Approval also depends on your credit, income and an appraisal. " + GENERAL_DISCLAIMER,
    faq: [{ question: "HELOC or home equity loan?", answer: "A home equity loan is a lump sum at a fixed rate — good for one big expense. A HELOC is a credit line with a variable rate that you draw as needed." }],
  },
  {
    slug: "loan-to-value-real-estate-calculator",
    title: "Loan-to-Value (LTV) Real Estate Calculator",
    description: "Check the loan-to-value ratio on a property purchase the way lenders do — on the lower of the price or appraisal — plus the maximum loan and cash you'd need.",
    metaTitle: "Real Estate LTV Calculator — Price vs Appraisal",
    metaDescription: "Free real estate loan-to-value calculator. Find LTV on the lower of price or appraisal, the max loan a lender allows, and the cash you'll need to close.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 320000, max: 10000000000, step: 1000 }),
      currencyField("appraisedValue", "Appraised Value", { default: 310000, max: 10000000000, step: 1000 }),
      currencyField("loanAmountRequested", "Loan Amount Requested", { default: 240000, max: 10000000000, step: 1000 }),
      percentField("lenderMaxLtvPercent", "Lender's Maximum LTV", { default: 75, max: 100, step: 1 }),
    ],
    calcResult: { label: "Loan-to-Value Ratio", format: "percentage" },
    calcResults: [
      { key: "ltvPercent", label: "Loan-to-Value Ratio", format: "percentage", highlight: true },
      { key: "maxLoanAllowed", label: "Maximum Loan Allowed", format: "currency" },
      { key: "cashNeededAtMaxLoan", label: "Cash Needed at Max Loan", format: "currency" },
      { key: "requestedOverMax", label: "Requested Loan Over the Limit", format: "currency" },
    ],
    instructions: "Enter the price, the appraisal, the loan you want and the lender's LTV limit. If the appraisal comes in low, lenders use it instead of the price, so you need more cash.",
    examples: "Example: a $320,000 purchase appraises at $310,000. A $240,000 loan is 77.42% LTV on the appraisal — over a 75% limit. The lender will lend $232,500, so you'd need $87,500 in cash, and your request is $7,500 too high.",
    assumptions: "Closing costs are extra. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What happens if the appraisal is lower than the price?", answer: "You can bring more cash, renegotiate the price, challenge the appraisal, or walk away if your contract has an appraisal contingency." }],
  },
  {
    slug: "dscr-real-estate-calculator",
    title: "DSCR Real Estate Calculator",
    description: "Calculate the debt service coverage ratio for a DSCR investor loan — rent divided by the full payment (PITIA) — the largest loan the rent supports, and the rent needed to qualify.",
    metaTitle: "DSCR Loan Calculator — Rental Property Qualifying",
    metaDescription: "Free DSCR calculator for investor loans. Divide rent by PITIA to get DSCR, and find the largest loan the rent supports and the rent needed to qualify.",
    calcInputs: [
      currencyField("monthlyRent", "Monthly Rent", { default: 2600, max: 10000000, step: 25 }),
      currencyField("loanAmount", "Loan Amount", { default: 280000, max: 10000000000, step: 1000 }),
      percentField("interestRatePercent", "Interest Rate", { default: 7.75, max: 30, step: 0.05 }),
      numberField("loanYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      currencyField("monthlyTaxInsuranceHoa", "Monthly Taxes, Insurance & HOA", { default: 450, max: 10000000, step: 10 }),
      numberField("requiredDscr", "Lender's Minimum DSCR", { default: 1.1, min: 0.1, max: 5, step: 0.05 }),
    ],
    calcResult: { label: "DSCR", format: "number" },
    calcResults: [
      { key: "dscr", label: "Debt Service Coverage Ratio", format: "number", highlight: true },
      { key: "monthlyPitia", label: "Monthly PITIA", format: "currency" },
      { key: "maxLoanAtRequiredDscr", label: "Max Loan at Required DSCR", format: "currency" },
      { key: "rentNeededForRequiredDscr", label: "Rent Needed at This Loan", format: "currency" },
    ],
    instructions: "Enter the property's market rent, the loan you want, its rate and term, and the monthly taxes, insurance and HOA dues. DSCR loans qualify on the property's rent instead of your personal income.",
    examples: "Example: $2,600 of rent against a $2,455.95 PITIA payment is a DSCR of 1.06 — below a 1.1 minimum. You'd need rent of $2,701.55, or a loan of about $267,113.85 instead of $280,000.",
    assumptions: "Many DSCR lenders use rent ÷ PITIA as here; some use NOI ÷ debt service. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What DSCR do lenders require?", answer: "Often 1.0 to 1.25. Some lenders accept lower ratios with a bigger down payment or a higher rate." }],
  },
  {
    slug: "debt-yield-calculator",
    title: "Debt Yield Calculator",
    description: "Calculate a commercial property's debt yield — net operating income divided by the loan amount — plus the largest loan and the NOI needed at a lender's minimum debt yield.",
    metaTitle: "Debt Yield Calculator — Commercial Loan Sizing",
    metaDescription: "Free debt yield calculator. Divide NOI by the loan amount, and find the largest loan and the NOI needed to meet a lender's minimum debt yield.",
    calcInputs: [
      currencyField("netOperatingIncome", "Net Operating Income (Yearly)", { default: 150000, max: 10000000000, step: 1000 }),
      currencyField("loanAmount", "Loan Amount", { default: 1400000, max: 100000000000, step: 10000 }),
      percentField("minimumDebtYieldPercent", "Lender's Minimum Debt Yield", { default: 10, min: 0.5, max: 50, step: 0.25 }),
    ],
    calcResult: { label: "Debt Yield", format: "percentage" },
    calcResults: [
      { key: "debtYieldPercent", label: "Debt Yield", format: "percentage", highlight: true },
      { key: "maxLoanAtMinimumDebtYield", label: "Max Loan at Minimum Debt Yield", format: "currency" },
      { key: "noiNeededForThisLoan", label: "NOI Needed for This Loan", format: "currency" },
    ],
    instructions: "Enter the property's yearly NOI, the loan amount, and the lender's minimum debt yield (commonly 8% to 10%). Debt yield ignores interest rate and amortization, so lenders use it as a simple risk check.",
    examples: "Example: $150,000 of NOI on a $1,400,000 loan is a 10.71% debt yield. At a 10% minimum, the largest loan would be $1,500,000, and this loan needs at least $140,000 of NOI.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why do lenders use debt yield?", answer: "It shows the return the lender would earn if it had to take the property back. Unlike DSCR and LTV, it can't be flattered by low rates or a high appraisal." }],
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
