// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Real Estate Calculators" sub-batch B (Rental Yields & Ratios). Part of the
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
// See src/lib/calc-engine-realestate-rental-ratios.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-realestate-rental-ratios-calculators.ts
// or
//   npm run db:create-realestate-rental-ratios-calculators

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
    slug: "rental-yield-calculator",
    title: "Rental Yield Calculator",
    description: "Compare a rental's gross and net yield on what you paid with its yield on what the property is worth today — to see whether your equity is still working hard.",
    metaTitle: "Rental Yield Calculator — Yield on Cost vs Value",
    metaDescription: "Free rental yield calculator. See gross and net rental yield on your purchase price and on today's value, to judge if your equity is still earning well.",
    calcInputs: [
      currencyField("annualRent", "Yearly Rent", { default: 21600, max: 1000000000, step: 100 }),
      currencyField("annualExpenses", "Yearly Operating Expenses", { default: 6000, max: 1000000000, step: 100 }),
      currencyField("purchasePrice", "Purchase Price", { default: 250000, max: 10000000000, step: 1000 }),
      currencyField("currentValue", "Current Market Value", { default: 320000, max: 10000000000, step: 1000 }),
    ],
    calcResult: { label: "Net Yield on Cost", format: "percentage" },
    calcResults: [
      { key: "netYieldOnCostPercent", label: "Net Yield on Purchase Price", format: "percentage", highlight: true },
      { key: "netYieldOnCurrentValuePercent", label: "Net Yield on Current Value", format: "percentage" },
      { key: "grossYieldOnCostPercent", label: "Gross Yield on Purchase Price", format: "percentage" },
      { key: "grossYieldOnCurrentValuePercent", label: "Gross Yield on Current Value", format: "percentage" },
    ],
    instructions: "Enter the yearly rent, the yearly operating expenses (not the mortgage), what you paid for the property, and what it's worth now.",
    examples: "Example: $21,600 of rent and $6,000 of expenses on a $250,000 purchase is a 6.24% net yield (8.64% gross). On today's $320,000 value, the same rent is only a 4.88% net yield (6.75% gross).",
    assumptions: "Yields are before mortgage costs and income tax. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why look at yield on current value?", answer: "It shows what your equity earns today. If the yield on value has fallen a lot, you might earn more by refinancing, selling, or exchanging into a higher-yielding property." }],
  },
  {
    slug: "gross-rental-yield-calculator",
    title: "Gross Rental Yield Calculator",
    description: "Calculate gross rental yield — yearly rent as a percentage of the property price — plus the highest price to pay, or the rent you'd need, to hit your target yield.",
    metaTitle: "Gross Rental Yield Calculator — Rent vs Price",
    metaDescription: "Free gross rental yield calculator. Yearly rent as a % of price, plus the maximum price to pay or the rent needed to reach your target gross yield.",
    calcInputs: [
      currencyField("monthlyRent", "Monthly Rent", { default: 1800, max: 10000000, step: 25 }),
      currencyField("propertyPrice", "Property Price", { default: 280000, max: 10000000000, step: 1000 }),
      percentField("targetYieldPercent", "Target Gross Yield", { default: 8, max: 50, step: 0.25 }),
    ],
    calcResult: { label: "Gross Rental Yield", format: "percentage" },
    calcResults: [
      { key: "grossRentalYieldPercent", label: "Gross Rental Yield", format: "percentage", highlight: true },
      { key: "annualRent", label: "Yearly Rent", format: "currency" },
      { key: "maxPriceForTargetYield", label: "Max Price for Target Yield", format: "currency" },
      { key: "rentNeededForTargetYield", label: "Monthly Rent Needed for Target Yield", format: "currency" },
    ],
    instructions: "Enter the monthly rent, the asking price and the gross yield you want. Gross yield ignores expenses, so it's best for quickly comparing listings.",
    examples: "Example: $1,800 a month is $21,600 a year — a 7.71% gross yield on a $280,000 property. To hit 8% you'd pay no more than $270,000, or need rent of $1,866.67 a month.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is a good gross rental yield?", answer: "Many investors look for 7% to 10% gross. Expenses typically eat 35% to 50% of rent, so a low gross yield leaves little net return." }],
  },
  {
    slug: "net-rental-yield-calculator",
    title: "Net Rental Yield Calculator",
    description: "Calculate net rental yield — rent after vacancy and operating expenses, as a percentage of the total purchase cost including buying costs.",
    metaTitle: "Net Rental Yield Calculator — After Costs",
    metaDescription: "Free net rental yield calculator. Rent after vacancy and expenses as a % of the full purchase cost including buying costs — the real yield on a rental.",
    calcInputs: [
      currencyField("annualRent", "Yearly Rent", { default: 24000, max: 1000000000, step: 100 }),
      percentField("vacancyPercent", "Vacancy Rate", { default: 5, max: 100, step: 0.5 }),
      currencyField("annualExpenses", "Yearly Operating Expenses", { default: 7500, max: 1000000000, step: 100 }),
      currencyField("purchasePrice", "Purchase Price", { default: 280000, max: 10000000000, step: 1000 }),
      currencyField("buyingCosts", "Buying Costs (Closing, Fees, Taxes)", { default: 12000, max: 1000000000, step: 500 }),
    ],
    calcResult: { label: "Net Rental Yield", format: "percentage" },
    calcResults: [
      { key: "netRentalYieldPercent", label: "Net Rental Yield", format: "percentage", highlight: true },
      { key: "netAnnualIncome", label: "Net Yearly Income", format: "currency" },
      { key: "totalPurchaseCost", label: "Total Purchase Cost", format: "currency" },
      { key: "grossYieldPercent", label: "Gross Yield on Total Cost", format: "percentage" },
    ],
    instructions: "Enter the yearly rent, a vacancy rate, yearly operating expenses (tax, insurance, repairs, management — not the mortgage), the price and your buying costs.",
    examples: "Example: $24,000 of rent less 5% vacancy and $7,500 of expenses leaves $15,300. On a total cost of $292,000 that's a 5.24% net yield, against 8.22% gross.",
    assumptions: "Net yield is before mortgage costs and income tax. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Gross vs net rental yield — which matters more?", answer: "Net yield. Two properties with the same gross yield can have very different net yields once taxes, insurance, HOA fees and repairs are counted." }],
  },
  {
    slug: "rent-increase-calculator",
    title: "Rent Increase Calculator",
    description: "Work out a new rent after a percentage increase, the extra per month and year, how it compares with a local rent-increase cap, and the real increase after inflation.",
    metaTitle: "Rent Increase Calculator — New Rent & Cap Check",
    metaDescription: "Free rent increase calculator. Find the new rent, the extra per month and year, room left under a rent cap, and the real increase after inflation.",
    calcInputs: [
      currencyField("currentRent", "Current Monthly Rent", { default: 1650, max: 10000000, step: 25 }),
      percentField("increasePercent", "Rent Increase", { default: 5, max: 100, step: 0.5 }),
      percentField("legalCapPercent", "Local Increase Cap (If Any)", { default: 7, max: 100, step: 0.5 }),
      percentField("inflationPercent", "Inflation Rate", { default: 3, min: -10, max: 50, step: 0.1 }),
    ],
    calcResult: { label: "New Monthly Rent", format: "currency" },
    calcResults: [
      { key: "newMonthlyRent", label: "New Monthly Rent", format: "currency", highlight: true },
      { key: "increasePerMonth", label: "Increase per Month", format: "currency" },
      { key: "increasePerYear", label: "Increase per Year", format: "currency" },
      { key: "roomUnderCapPercent", label: "Room Under the Cap (Negative = Over)", format: "percentage" },
      { key: "realIncreaseAfterInflationPercent", label: "Real Increase After Inflation", format: "percentage" },
    ],
    instructions: "Enter the current rent and the percentage increase. If your city or state caps yearly increases, enter the cap to check you're within it. Inflation shows whether the increase keeps up with rising costs.",
    examples: "Example: a 5% increase on $1,650 makes rent $1,732.50 — $82.50 more a month and $990 a year. That's 2 points under a 7% cap, and with 3% inflation the real increase is 1.94%.",
    assumptions: "Rent-control rules differ widely — some caps are tied to inflation, and many exempt newer buildings. Check your local law and give the notice it requires. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How much can a landlord raise rent?", answer: "Where there's no rent control, there is usually no set limit, but notice rules apply. States such as California and Oregon cap yearly increases for many buildings." }],
  },
  {
    slug: "rental-affordability-calculator",
    title: "Rental Affordability Calculator",
    description: "Find how much rent you can afford from your monthly income, using the 30% rule and a debt-aware check that keeps rent plus debt payments within 40% of income, after utilities.",
    metaTitle: "Rental Affordability Calculator — Rent I Can Afford",
    metaDescription: "Free rental affordability calculator. Find the rent you can afford from your income with the 30% rule, your debts and utilities, plus the 3× income test.",
    calcInputs: [
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 5500, max: 10000000, step: 100 }),
      currencyField("monthlyDebtPayments", "Monthly Debt Payments", { default: 450, max: 10000000, step: 25 }),
      percentField("rentSharePercent", "Share of Income for Housing", { default: 30, max: 100, step: 1 }),
      currencyField("utilitiesEstimate", "Monthly Utilities You'd Pay", { default: 150, max: 1000000, step: 10 }),
    ],
    calcResult: { label: "Maximum Affordable Rent", format: "currency" },
    calcResults: [
      { key: "maxAffordableRent", label: "Maximum Affordable Rent", format: "currency", highlight: true },
      { key: "rentByPercentRule", label: "Housing Budget by % Rule", format: "currency" },
      { key: "rentWithDebtsConsidered", label: "Housing Budget After Debts (40% Rule)", format: "currency" },
      { key: "annualIncomeNeededFor3xRule", label: "Yearly Income Landlords Want (3× Rent)", format: "currency" },
    ],
    instructions: "Enter your income before tax, your monthly debt payments (car, student loans, card minimums), the share of income you're willing to spend on housing, and the utilities you'd pay. The tool takes the lower of the two budgets and subtracts utilities.",
    examples: "Example: 30% of $5,500 is $1,650, and the debt check allows $1,750, so your housing budget is $1,650. After $150 of utilities, look for rent of about $1,500 — landlords using the 3× rule want $54,000 of yearly income for that.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Is the 30% rule still realistic?", answer: "In expensive cities many renters pay more. It's a guide, not a law — what matters is that rent leaves room for savings and other bills." }],
  },
  {
    slug: "rent-to-income-ratio-calculator",
    title: "Rent-to-Income Ratio Calculator",
    description: "For landlords and renters: check a rent-to-income ratio, the income multiple of rent, and the monthly income needed to meet a 2.5×, 3× or other requirement.",
    metaTitle: "Rent-to-Income Ratio Calculator — 3× Rent Check",
    metaDescription: "Free rent-to-income ratio calculator. See the ratio, the income multiple of rent, and the income an applicant needs to meet a 3× rent requirement.",
    calcInputs: [
      currencyField("monthlyRent", "Monthly Rent", { default: 1800, max: 10000000, step: 25 }),
      currencyField("applicantMonthlyIncome", "Applicant's Gross Monthly Income", { default: 5000, max: 100000000, step: 100 }),
      numberField("requiredMultiple", "Required Income Multiple", { unit: "× rent", default: 3, min: 0, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Rent-to-Income Ratio", format: "percentage" },
    calcResults: [
      { key: "rentToIncomeRatioPercent", label: "Rent-to-Income Ratio", format: "percentage", highlight: true },
      { key: "incomeMultipleOfRent", label: "Income as a Multiple of Rent", format: "number" },
      { key: "monthlyIncomeRequired", label: "Monthly Income Required", format: "currency" },
      { key: "incomeShortfallOrSurplus", label: "Income Surplus (Shortfall)", format: "currency" },
    ],
    instructions: "Enter the rent, the applicant's monthly income before tax (combined, if several people are on the lease) and the income multiple the landlord requires.",
    examples: "Example: $1,800 rent on $5,000 of income is a 36% rent-to-income ratio — income is 2.78 times rent. A 3× requirement needs $5,400 a month, so the applicant is $400 short.",
    assumptions: "Screening rules must follow fair-housing and local laws; some places limit income requirements or require counting housing vouchers. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why do landlords ask for 3 times the rent?", answer: "An income of 3× rent means rent takes about 33% of gross income, leaving room for other bills — a simple way to judge whether rent will be paid reliably." }],
  },
  {
    slug: "rent-to-value-ratio-calculator",
    title: "Rent-to-Value Ratio Calculator",
    description: "Calculate the rent-to-value ratio — monthly rent as a percentage of the property's value — and check it against the 1% rule or your own target.",
    metaTitle: "Rent-to-Value Ratio Calculator — 1% Rule Check",
    metaDescription: "Free rent-to-value ratio calculator. Monthly rent as a % of property value, checked against the 1% rule, with the rent needed to hit your target.",
    calcInputs: [
      currencyField("monthlyRent", "Monthly Rent", { default: 2100, max: 10000000, step: 25 }),
      currencyField("propertyValue", "Property Value", { default: 240000, max: 10000000000, step: 1000 }),
      percentField("targetRatioPercent", "Target Ratio", { default: 1, max: 10, step: 0.05 }),
    ],
    calcResult: { label: "Rent-to-Value Ratio", format: "percentage" },
    calcResults: [
      { key: "rentToValueRatioPercent", label: "Rent-to-Value Ratio", format: "percentage", highlight: true },
      { key: "rentNeededForTarget", label: "Monthly Rent Needed for Target", format: "currency" },
      { key: "rentGapToTarget", label: "Rent Gap to Target", format: "currency" },
    ],
    instructions: "Enter the monthly rent and the property's current value (or price). The 1% rule says monthly rent should be at least 1% of value for a rental to cash flow.",
    examples: "Example: $2,100 of rent on a $240,000 property is a rent-to-value ratio of 0.88%. The 1% rule needs $2,400, so rent is $300 a month short.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Is the 1% rule still useful?", answer: "As a quick filter, yes. In high-priced markets few properties meet it, so investors there look at full cash flow instead." }],
  },
  {
    slug: "rent-to-price-ratio-calculator",
    title: "Rent-to-Price Ratio Calculator",
    description: "Check a deal's rent-to-price ratio on your all-in cost — purchase price plus repairs — and find the most you can pay for the property to hit your target ratio.",
    metaTitle: "Rent-to-Price Ratio Calculator — All-In Cost",
    metaDescription: "Free rent-to-price ratio calculator. Divide rent by purchase price plus repairs and find the most you can offer to still meet your target ratio.",
    calcInputs: [
      currencyField("monthlyRent", "Expected Monthly Rent", { default: 1500, max: 10000000, step: 25 }),
      currencyField("purchasePrice", "Purchase Price", { default: 130000, max: 10000000000, step: 1000 }),
      currencyField("repairCosts", "Repair Costs", { default: 20000, max: 1000000000, step: 500 }),
      percentField("targetRatioPercent", "Target Ratio", { default: 1, max: 10, step: 0.05 }),
    ],
    calcResult: { label: "Rent-to-Price Ratio", format: "percentage" },
    calcResults: [
      { key: "rentToPriceRatioPercent", label: "Rent-to-Price Ratio (All-In)", format: "percentage", highlight: true },
      { key: "allInCost", label: "All-In Cost", format: "currency" },
      { key: "maxAllInCostForTarget", label: "Max All-In Cost for Target", format: "currency" },
      { key: "maxPurchasePriceForTarget", label: "Max Purchase Price for Target", format: "currency" },
    ],
    instructions: "Enter the rent you expect, the purchase price, the repairs needed before renting, and your target ratio. The tool works back from the rent to the most you can offer.",
    examples: "Example: $1,500 of rent on a $130,000 house needing $20,000 of repairs is exactly 1% of the $150,000 all-in cost — so $130,000 is your maximum offer at a 1% target.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why include repairs in the ratio?", answer: "Repairs are money you invest before rent starts. A cheap house that needs a lot of work can look like a great ratio on price but a poor one on total cost." }],
  },
  {
    slug: "price-to-rent-ratio-calculator",
    title: "Price-to-Rent Ratio Calculator",
    description: "Calculate the price-to-rent ratio — home price divided by a year's rent for a similar home — to see whether buying or renting looks better in your area.",
    metaTitle: "Price-to-Rent Ratio Calculator — Buy or Rent?",
    metaDescription: "Free price-to-rent ratio calculator. Divide a home's price by a year of rent to see whether your market favors buying or renting, plus key benchmarks.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 420000, max: 10000000000, step: 1000 }),
      currencyField("monthlyRent", "Monthly Rent for a Similar Home", { default: 2100, max: 10000000, step: 25 }),
    ],
    calcResult: { label: "Price-to-Rent Ratio", format: "number" },
    calcResults: [
      { key: "priceToRentRatio", label: "Price-to-Rent Ratio", format: "number", highlight: true },
      { key: "annualRent", label: "Yearly Rent", format: "currency" },
      { key: "priceAtRatioOf15", label: "Price at a Ratio of 15 (Favors Buying)", format: "currency" },
      { key: "monthlyRentAtRatioOf20", label: "Rent at a Ratio of 20 (Favors Renting)", format: "currency" },
    ],
    instructions: "Enter a home's price and the monthly rent for a comparable home nearby. As a rule of thumb, a ratio of 15 or less favors buying, 16 to 20 is in between, and 21 or more favors renting.",
    examples: "Example: a $420,000 home that would rent for $2,100 a month ($25,200 a year) has a price-to-rent ratio of 16.67 — in the middle zone. At a ratio of 15 the home would cost $378,000.",
    assumptions: "A market-level signal; it ignores interest rates, taxes and how long you'll stay. Use the Rent vs Own Calculator for your own numbers. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is the price-to-rent ratio the same as the gross rent multiplier?", answer: "They're the same formula — price ÷ yearly rent. Homebuyers call it price-to-rent; investors call it the gross rent multiplier." }],
  },
  {
    slug: "gross-rent-multiplier-calculator",
    title: "Gross Rent Multiplier (GRM) Calculator",
    description: "Calculate a property's gross rent multiplier, compare it with the market GRM to estimate value, and see whether the asking price is above or below it.",
    metaTitle: "GRM Calculator — Gross Rent Multiplier & Value",
    metaDescription: "Free gross rent multiplier calculator. Find GRM from price and yearly rent, estimate value at the market GRM, and see if the asking price is too high.",
    calcInputs: [
      currencyField("propertyPrice", "Property Price", { default: 600000, max: 10000000000, step: 1000 }),
      currencyField("grossAnnualRent", "Gross Yearly Rent", { default: 72000, max: 1000000000, step: 500 }),
      numberField("marketGrm", "Market GRM (Similar Properties)", { default: 9, min: 0, max: 100, step: 0.1 }),
    ],
    calcResult: { label: "Gross Rent Multiplier", format: "number" },
    calcResults: [
      { key: "grossRentMultiplier", label: "Gross Rent Multiplier", format: "number", highlight: true },
      { key: "valueAtMarketGrm", label: "Value at Market GRM", format: "currency" },
      { key: "priceAboveOrBelowMarketValue", label: "Price Above (Below) Market Value", format: "currency" },
      { key: "grossYieldPercent", label: "Gross Yield", format: "percentage" },
    ],
    instructions: "Enter the price, the property's gross yearly rent, and the typical GRM of similar properties that sold recently nearby. A lower GRM means you pay less for each dollar of rent.",
    examples: "Example: a $600,000 building renting for $72,000 a year has a GRM of 8.33 (a 12% gross yield). At a market GRM of 9 it would be worth $648,000, so the price is $48,000 below market.",
    assumptions: "GRM ignores expenses and vacancy, so compare only similar properties. " + GENERAL_DISCLAIMER,
    faq: [{ question: "GRM vs cap rate — what's the difference?", answer: "GRM uses gross rent; cap rate uses net operating income after expenses. GRM is quicker, cap rate is more accurate." }],
  },
  {
    slug: "rental-property-payback-period-calculator",
    title: "Rental Property Payback Period Calculator",
    description: "Find how many years a rental's cash flow takes to pay back the cash you invested, with cash flow growing each year as rents rise.",
    metaTitle: "Rental Payback Period Calculator — Years to Recoup",
    metaDescription: "Free rental property payback period calculator. See how many years rising cash flow takes to repay your down payment, closing costs and repairs.",
    calcInputs: [
      currencyField("cashInvested", "Total Cash Invested", { default: 75000, max: 1000000000, step: 1000 }),
      currencyField("firstYearCashFlow", "First-Year Cash Flow", { default: 6000, max: 100000000, step: 100 }),
      percentField("cashFlowGrowthPercent", "Cash Flow Growth per Year", { default: 3, min: -20, max: 30, step: 0.5 }),
    ],
    calcResult: { label: "Payback Period", format: "number" },
    calcResults: [
      { key: "paybackYears", label: "Payback Period in Years (0 = Never)", format: "number", highlight: true },
      { key: "paybackIfCashFlowFlat", label: "Payback if Cash Flow Stays Flat (Years)", format: "number" },
      { key: "firstYearCashOnCashPercent", label: "First-Year Cash-on-Cash Return", format: "percentage" },
    ],
    instructions: "Enter all the cash you put in (down payment, closing costs, repairs), the first year's cash flow after the mortgage, and how fast you expect cash flow to grow as rents rise.",
    examples: "Example: $75,000 invested and $6,000 of first-year cash flow (8% cash-on-cash) growing 3% a year pays back in 10.77 years, against 12.5 years if cash flow never grew.",
    assumptions: "Ignores appreciation, loan paydown and tax. Payback is capped at 100 years. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is payback period a good way to judge a rental?", answer: "It's a simple risk check — how long your cash is exposed — but it ignores equity growth. Use it alongside cash-on-cash and total return." }],
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
