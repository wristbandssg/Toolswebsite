// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Real Estate Calculators" sub-batch G (Home Buying & Ownership Costs). Part of the
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
// See src/lib/calc-engine-realestate-homebuying.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-realestate-homebuying-calculators.ts
// or
//   npm run db:create-realestate-homebuying-calculators

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
    slug: "home-affordability-calculator",
    title: "Home Affordability Calculator",
    description: "Find the most house you can afford using the lender 28/36 rule — including property tax, homeowners insurance and HOA dues — from your income, debts and down payment.",
    metaTitle: "Home Affordability Calculator — 28/36 Rule Price",
    metaDescription: "Free home affordability calculator. Use the 28/36 rule with taxes, insurance and HOA to find the highest home price your income and debts support.",
    calcInputs: [
      currencyField("annualIncome", "Gross Yearly Income", { default: 110000, max: 100000000, step: 1000 }),
      currencyField("monthlyDebts", "Monthly Debt Payments", { default: 500, max: 10000000, step: 25 }),
      currencyField("downPayment", "Down Payment", { default: 50000, max: 10000000000, step: 1000 }),
      percentField("interestRatePercent", "Mortgage Rate", { default: 6.5, max: 30, step: 0.05 }),
      numberField("loanTermYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      percentField("propertyTaxRatePercent", "Property Tax Rate", { default: 1.1, max: 10, step: 0.05 }),
      currencyField("monthlyInsurance", "Monthly Homeowners Insurance", { default: 150, max: 1000000, step: 10 }),
      currencyField("monthlyHoa", "Monthly HOA Dues", { default: 0, max: 1000000, step: 10 }),
    ],
    calcResult: { label: "Maximum Home Price", format: "currency" },
    calcResults: [
      { key: "maxHomePrice", label: "Maximum Home Price", format: "currency", highlight: true },
      { key: "maxMonthlyHousingPayment", label: "Maximum Monthly Housing Payment", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPrincipalAndInterest", label: "Monthly Principal & Interest", format: "currency" },
      { key: "monthlyPropertyTax", label: "Monthly Property Tax", format: "currency" },
    ],
    instructions: "Enter your income before tax, your monthly debt payments (car, student loans, credit card minimums), your down payment and loan terms, and the local property tax rate, insurance and HOA dues. Housing costs are capped at 28% of income, and housing plus debts at 36%.",
    examples: "Example: on $110,000 a year with $500 of monthly debts, the 28% limit allows $2,566.67 a month for housing. With $50,000 down at 6.5%, that buys a home of about $377,583.21 — a $327,583.21 loan at $2,070.55 a month, plus $346.12 of tax and $150 of insurance.",
    assumptions: "Excludes PMI, which applies with less than 20% down. Lenders' limits vary, and FHA and VA loans can allow higher ratios. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is the 28/36 rule?", answer: "A lender guideline: housing costs (mortgage, tax, insurance, HOA) should be no more than 28% of gross monthly income, and all debt payments including housing no more than 36%." }],
  },
  {
    slug: "home-price-affordability-calculator",
    title: "Home Price Affordability Calculator",
    description: "Check whether a specific home price fits your finances — its price-to-income ratio, the cash you need up front against your savings, and the payment's share of your income.",
    metaTitle: "Can I Afford This House? — Home Price Check",
    metaDescription: "Free home price affordability calculator. Test a specific price against your income and savings: price-to-income ratio, cash needed and payment share.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 400000, max: 10000000000, step: 1000 }),
      currencyField("annualIncome", "Gross Yearly Income", { default: 100000, max: 100000000, step: 1000 }),
      currencyField("savings", "Savings Available", { default: 70000, max: 10000000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 1 }),
      percentField("closingCostPercent", "Closing Costs", { default: 3, max: 10, step: 0.25 }),
      percentField("interestRatePercent", "Mortgage Rate", { default: 6.5, max: 30, step: 0.05 }),
      numberField("loanTermYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Price-to-Income Ratio", format: "number" },
    calcResults: [
      { key: "priceToIncomeRatio", label: "Price-to-Income Ratio", format: "number", highlight: true },
      { key: "cashNeededUpFront", label: "Cash Needed Up Front", format: "currency" },
      { key: "savingsLeftOrShortfall", label: "Savings Left (Shortfall)", format: "currency" },
      { key: "monthlyPrincipalAndInterest", label: "Monthly Principal & Interest", format: "currency" },
      { key: "paymentShareOfIncomePercent", label: "Payment as % of Income", format: "percentage" },
    ],
    instructions: "Enter the price of the home you're looking at, your yearly income and savings, and your planned down payment, closing costs and loan terms.",
    examples: "Example: a $400,000 home on a $100,000 income is a price-to-income ratio of 4. With 10% down and 3% closing costs you need $52,000, leaving $18,000 of savings. The $2,275.44 monthly payment takes 27.31% of income.",
    assumptions: "The payment shown is principal and interest only; add taxes, insurance and any PMI. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What price-to-income ratio is affordable?", answer: "A traditional guide is 2.5 to 3 times income. With today's prices many buyers go to 4 or 5 — workable with low debts and a solid down payment, but tighter." }],
  },
  {
    slug: "home-down-payment-calculator",
    title: "Home Down Payment Calculator",
    description: "See what a 3%, 5%, 10% or 20% down payment means for a home — the cash needed, the loan, the monthly payment and PMI — and how much more it takes to reach 20%.",
    metaTitle: "Home Down Payment Calculator — 3% to 20% Down",
    metaDescription: "Free home down payment calculator. See the cash, loan, payment and PMI for any down payment percentage, and the extra needed to reach 20% down.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 380000, max: 10000000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 0.5 }),
      percentField("interestRatePercent", "Mortgage Rate", { default: 6.5, max: 30, step: 0.05 }),
      numberField("loanTermYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      percentField("pmiRatePercent", "PMI Rate (Yearly, Under 20% Down)", { default: 0.6, max: 5, step: 0.05 }),
    ],
    calcResult: { label: "Down Payment", format: "currency" },
    calcResults: [
      { key: "downPaymentAmount", label: "Down Payment", format: "currency", highlight: true },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPrincipalAndInterest", label: "Monthly Principal & Interest", format: "currency" },
      { key: "monthlyPmi", label: "Monthly PMI", format: "currency" },
      { key: "extraCashToReach20Percent", label: "Extra Cash to Reach 20% Down", format: "currency" },
    ],
    instructions: "Enter the home price and try different down payment percentages. PMI is added automatically when you put down less than 20%; its rate depends mainly on your credit score.",
    examples: "Example: 10% down on a $380,000 home is $38,000, leaving a $342,000 loan at $2,161.67 a month plus $171 of PMI. Another $38,000 would reach 20% down and remove PMI.",
    assumptions: "Taxes and insurance are extra. FHA loans charge mortgage insurance differently. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Do I need 20% down to buy a home?", answer: "No. Conventional loans allow 3% to 5% down and FHA 3.5%, and VA and USDA loans can need nothing down. Under 20% usually means paying mortgage insurance." }],
  },
  {
    slug: "home-closing-cost-calculator",
    title: "Home Closing Cost Calculator",
    description: "Estimate a homebuyer's closing costs line by line — lender origination, appraisal and inspection, title and escrow, transfer taxes and prepaids — as dollars and a share of the price.",
    metaTitle: "Home Closing Cost Calculator — Buyer's Itemized",
    metaDescription: "Free home closing cost calculator. Itemize lender fees, appraisal, title, escrow, transfer taxes and prepaids to estimate a buyer's closing costs.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 350000, max: 10000000000, step: 1000 }),
      currencyField("loanAmount", "Loan Amount", { default: 315000, max: 10000000000, step: 1000 }),
      percentField("originationPercent", "Loan Origination Fee", { default: 1, max: 5, step: 0.125 }),
      currencyField("appraisalAndInspection", "Appraisal & Inspection", { default: 1100, max: 1000000, step: 50 }),
      currencyField("titleAndEscrow", "Title Insurance & Escrow Fees", { default: 2400, max: 10000000, step: 50 }),
      percentField("transferAndRecordingPercent", "Transfer Tax & Recording", { default: 0.4, max: 5, step: 0.05 }),
      currencyField("prepaidsAndEscrow", "Prepaid Interest, Tax & Insurance", { default: 3500, max: 10000000, step: 100 }),
      currencyField("otherFees", "Other Fees", { default: 800, max: 10000000, step: 50 }),
    ],
    calcResult: { label: "Total Closing Costs", format: "currency" },
    calcResults: [
      { key: "totalClosingCosts", label: "Total Closing Costs", format: "currency", highlight: true },
      { key: "closingCostsPercentOfPrice", label: "Closing Costs as % of Price", format: "percentage" },
      { key: "lenderFees", label: "Lender Origination Fee", format: "currency" },
      { key: "transferTaxesAndRecording", label: "Transfer Tax & Recording", format: "currency" },
      { key: "closingCostsExcludingPrepaids", label: "Closing Costs Excluding Prepaids", format: "currency" },
    ],
    instructions: "Enter the price and loan amount, then each cost from your Loan Estimate. Prepaids — the first year of insurance, a few months of property tax for escrow, and interest to the end of the month — are money you'd pay anyway, but they're due at closing.",
    examples: "Example: on a $350,000 home with a $315,000 loan, a 1% origination fee ($3,150), $1,400 of transfer and recording, $3,500 of prepaids and other fees add up to $12,350 — 3.53% of the price, or $8,850 without prepaids.",
    assumptions: "Who pays transfer tax differs by state and contract. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How much are closing costs for a buyer?", answer: "Usually 2% to 5% of the price. You can lower them by comparing lenders, shopping for title services where allowed, or negotiating seller credits." }],
  },
  {
    slug: "homeowners-insurance-calculator",
    title: "Homeowners Insurance Calculator",
    description: "Estimate your homeowners insurance premium from dwelling coverage and a rate per $1,000, with a higher-deductible discount, extra coverage and a bundling discount.",
    metaTitle: "Homeowners Insurance Calculator — Premium Estimate",
    metaDescription: "Free homeowners insurance calculator. Estimate your yearly and monthly premium from dwelling coverage, rate per $1,000, deductible and discounts.",
    calcInputs: [
      currencyField("dwellingCoverage", "Dwelling Coverage (Rebuild Cost)", { default: 300000, max: 10000000000, step: 5000 }),
      currencyField("ratePerThousand", "Rate per $1,000 of Coverage", { default: 5, max: 100, step: 0.25 }),
      percentField("deductibleDiscountPercent", "Higher-Deductible Discount", { default: 5, max: 50, step: 1 }),
      currencyField("extraCoverageAnnual", "Extra Coverage (Flood, Riders) per Year", { default: 250, max: 1000000, step: 25 }),
      percentField("bundleDiscountPercent", "Bundle / Other Discounts", { default: 10, max: 50, step: 1 }),
    ],
    calcResult: { label: "Yearly Premium", format: "currency" },
    calcResults: [
      { key: "annualPremium", label: "Yearly Premium", format: "currency", highlight: true },
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency" },
      { key: "basePremium", label: "Base Premium Before Discounts", format: "currency" },
      { key: "totalDiscounts", label: "Total Discounts", format: "currency" },
    ],
    instructions: "Enter the cost to rebuild your home (not its market value), a rate per $1,000 of coverage for your area, and any discounts. Rates are higher where hurricanes, wildfires or hail are common.",
    examples: "Example: $300,000 of coverage at $5 per $1,000 is $1,500. A 5% deductible discount, $250 of extra coverage and a 10% bundling discount give a premium of $1,507.50 a year — $125.63 a month, saving $242.50.",
    assumptions: "A planning estimate; actual premiums depend on your insurer, claims history, credit and the home's features. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why insure for rebuild cost, not market value?", answer: "Market value includes the land, which doesn't need rebuilding. Rebuild cost is what it takes to replace the structure at today's construction prices." }],
  },
  {
    slug: "hoa-fee-calculator",
    title: "HOA Fee Calculator",
    description: "See what HOA dues will cost you over the years as they rise, including any special assessment, and what share of your monthly housing payment they take.",
    metaTitle: "HOA Fee Calculator — Total Dues Over Time",
    metaDescription: "Free HOA fee calculator. Project HOA dues with yearly increases and special assessments, and see their share of your monthly housing payment.",
    calcInputs: [
      currencyField("monthlyHoaFee", "Monthly HOA Fee", { default: 350, max: 1000000, step: 10 }),
      percentField("annualIncreasePercent", "Yearly Increase", { default: 4, min: -10, max: 30, step: 0.5 }),
      numberField("years", "Years", { unit: "years", default: 10, min: 0, max: 50, step: 1 }),
      currencyField("specialAssessment", "Expected Special Assessments", { default: 0, max: 10000000, step: 500 }),
      currencyField("monthlyMortgagePayment", "Monthly Mortgage Payment", { default: 2200, max: 10000000, step: 50 }),
    ],
    calcResult: { label: "Total HOA Cost", format: "currency" },
    calcResults: [
      { key: "totalHoaCostOverPeriod", label: "Total HOA Cost Over the Period", format: "currency", highlight: true },
      { key: "monthlyFeeAtEndOfPeriod", label: "Monthly Fee at End of Period", format: "currency" },
      { key: "annualHoaCostNow", label: "Yearly HOA Cost Now", format: "currency" },
      { key: "hoaShareOfHousingPaymentPercent", label: "HOA Share of Housing Payment", format: "percentage" },
    ],
    instructions: "Enter the current monthly HOA fee, how much it tends to rise each year (ask for the HOA's fee history), how many years to look ahead, any known special assessments and your mortgage payment.",
    examples: "Example: a $350 HOA fee ($4,200 a year) rising 4% a year costs $50,425.65 over 10 years and reaches $518.09 a month. Today it's 13.73% of a housing payment that includes a $2,200 mortgage.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What should I check before buying in an HOA?", answer: "The fee history, the reserve study and how well the reserves are funded, any planned special assessments, and the rules on rentals, pets and renovations." }],
  },
  {
    slug: "property-maintenance-cost-calculator",
    title: "Property Maintenance Cost Calculator",
    description: "Estimate yearly home maintenance using the 1% rule and the $1-per-square-foot rule, adjusted for the home's age, and the amount to set aside each month.",
    metaTitle: "Home Maintenance Cost Calculator — Yearly Budget",
    metaDescription: "Free property maintenance cost calculator. Blend the 1% rule and $1 per square foot rule, adjust for the home's age, and see the monthly set-aside.",
    calcInputs: [
      currencyField("homeValue", "Home Value", { default: 400000, max: 10000000000, step: 1000 }),
      numberField("squareFeet", "Home Size", { unit: "sq ft", default: 2000, min: 0, max: 1000000, step: 10 }),
      numberField("homeAgeYears", "Home Age", { unit: "years", default: 25, min: 0, max: 300, step: 1 }),
    ],
    calcResult: { label: "Estimated Yearly Maintenance", format: "currency" },
    calcResults: [
      { key: "estimatedAnnualMaintenance", label: "Estimated Yearly Maintenance", format: "currency", highlight: true },
      { key: "monthlySetAside", label: "Monthly Set-Aside", format: "currency" },
      { key: "onePercentRule", label: "1% Rule Estimate", format: "currency" },
      { key: "dollarPerSquareFootRule", label: "$1 per Sq Ft Estimate", format: "currency" },
    ],
    instructions: "Enter the home's value, size and age. The estimate averages the 1% rule and the $1-per-square-foot rule, then adds 25% for homes 10 to 29 years old and 50% for homes 30 years or older.",
    examples: "Example: a 25-year-old, 2,000 sq ft home worth $400,000 gets $4,000 by the 1% rule and $2,000 by the square-foot rule. Their $3,000 average plus 25% for age is $3,750 a year — set aside $312.50 a month.",
    assumptions: "Averages over time — some years cost little, others bring a roof or furnace. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is 1% a year enough for maintenance?", answer: "For newer homes, often yes. Older homes, homes in harsh climates, and homes with pools or big yards usually need 2% or more." }],
  },
  {
    slug: "homeownership-cost-calculator",
    title: "Homeownership Cost Calculator",
    description: "Add up the true monthly cost of owning a home — mortgage, property tax, insurance, PMI, HOA dues, maintenance and utilities — not just the mortgage payment.",
    metaTitle: "Homeownership Cost Calculator — True Monthly Cost",
    metaDescription: "Free homeownership cost calculator. Add mortgage, tax, insurance, PMI, HOA, maintenance and utilities to see the true monthly and yearly cost to own.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 400000, max: 10000000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 1 }),
      percentField("interestRatePercent", "Mortgage Rate", { default: 6.5, max: 30, step: 0.05 }),
      numberField("loanTermYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      percentField("propertyTaxRatePercent", "Property Tax Rate", { default: 1.1, max: 10, step: 0.05 }),
      currencyField("annualInsurance", "Yearly Homeowners Insurance", { default: 1800, max: 10000000, step: 50 }),
      currencyField("monthlyHoa", "Monthly HOA Dues", { default: 0, max: 1000000, step: 10 }),
      percentField("maintenancePercent", "Maintenance (% of Value per Year)", { default: 1, max: 10, step: 0.1 }),
      currencyField("monthlyUtilities", "Monthly Utilities", { default: 300, max: 1000000, step: 10 }),
      percentField("pmiRatePercent", "PMI Rate (Under 20% Down)", { default: 0.6, max: 5, step: 0.05 }),
    ],
    calcResult: { label: "Total Monthly Cost", format: "currency" },
    calcResults: [
      { key: "totalMonthlyCost", label: "Total Monthly Cost", format: "currency", highlight: true },
      { key: "monthlyPrincipalAndInterest", label: "Principal & Interest", format: "currency" },
      { key: "monthlyTaxesAndInsurance", label: "Property Tax & Insurance", format: "currency" },
      { key: "monthlyPmi", label: "PMI", format: "currency" },
      { key: "monthlyMaintenance", label: "Maintenance", format: "currency" },
      { key: "annualCostOfOwning", label: "Yearly Cost of Owning", format: "currency" },
    ],
    instructions: "Enter the price, down payment and loan, then the ongoing costs: property tax rate, insurance, HOA dues, a maintenance budget, utilities and the PMI rate if you put down less than 20%.",
    examples: "Example: a $400,000 home with 10% down costs $2,275.44 a month in principal and interest, but add $516.67 of tax and insurance, $180 of PMI, $333.33 of maintenance and $300 of utilities and the true cost is $3,605.44 a month — $43,265.34 a year.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How much more than the mortgage does owning cost?", answer: "Often 30% to 60% more once tax, insurance, maintenance and utilities are added. Budget for the full cost, not just the payment the lender quotes." }],
  },
  {
    slug: "total-cost-of-homeownership-calculator",
    title: "Total Cost of Homeownership Calculator",
    description: "Find what owning a home really costs over the years — everything you pay out, minus the equity you'd walk away with if you sold — as a net cost per month.",
    metaTitle: "Total Cost of Homeownership — Net Cost Over Years",
    metaDescription: "Free total cost of homeownership calculator. Add every cost over the years, subtract the equity you'd get when selling, and see the net monthly cost.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 400000, max: 10000000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 20, max: 100, step: 1 }),
      percentField("closingCostPercent", "Closing Costs", { default: 3, max: 10, step: 0.25 }),
      percentField("interestRatePercent", "Mortgage Rate", { default: 6.5, max: 30, step: 0.05 }),
      numberField("loanTermYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      currencyField("annualTaxInsuranceHoa", "Yearly Tax, Insurance & HOA", { default: 6200, max: 100000000, step: 100 }),
      percentField("maintenancePercent", "Maintenance (% of Price per Year)", { default: 1, max: 10, step: 0.1 }),
      percentField("costGrowthPercent", "Cost Growth per Year", { default: 3, min: -10, max: 30, step: 0.5 }),
      percentField("appreciationPercent", "Home Appreciation per Year", { default: 3, min: -20, max: 30, step: 0.1 }),
      numberField("yearsOwned", "Years Owned", { unit: "years", default: 10, min: 1, max: 40, step: 1 }),
      percentField("sellingCostPercent", "Selling Costs", { default: 6, max: 20, step: 0.5 }),
    ],
    calcResult: { label: "Net Cost of Owning", format: "currency" },
    calcResults: [
      { key: "netCostOfOwning", label: "Net Cost of Owning", format: "currency", highlight: true },
      { key: "netCostPerMonth", label: "Net Cost per Month", format: "currency" },
      { key: "totalOutOfPocket", label: "Total Paid Out", format: "currency" },
      { key: "equityIfSold", label: "Equity if Sold (After Selling Costs)", format: "currency" },
      { key: "interestPaid", label: "Mortgage Interest Paid", format: "currency" },
    ],
    instructions: "Enter the price, down payment, closing costs and loan, yearly tax, insurance and HOA, a maintenance budget, growth rates, how long you'll own the home and the cost of selling it.",
    examples: "Example: over 10 years you'd pay out $451,645.69 on a $400,000 home — including $193,997.73 of interest. Selling then would return $234,028.95 of equity, so the net cost of owning is $217,616.74, or $1,813.47 a month.",
    assumptions: "Ignores tax deductions and what the down payment could have earned invested. Compare the monthly net cost with rent. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why subtract equity from the cost?", answer: "Part of every payment builds equity you get back when you sell. What's left after that — interest, taxes, insurance, upkeep and transaction costs — is the real price of living there." }],
  },
  {
    slug: "buyer-closing-cost-calculator",
    title: "Buyer Closing Cost Calculator",
    description: "Work out the cash you need to bring to closing as a homebuyer — down payment plus closing costs, minus your earnest money deposit, seller credits and lender credits.",
    metaTitle: "Buyer Cash to Close Calculator — Closing Day Cash",
    metaDescription: "Free buyer closing cost calculator. Add down payment and closing costs, subtract earnest money and seller or lender credits to find your cash to close.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 360000, max: 10000000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 0.5 }),
      percentField("closingCostPercent", "Closing Costs", { default: 3, max: 10, step: 0.25 }),
      currencyField("earnestMoneyDeposit", "Earnest Money Already Paid", { default: 5000, max: 1000000000, step: 500 }),
      currencyField("sellerCredits", "Seller Credits", { default: 4000, max: 1000000000, step: 500 }),
      currencyField("lenderCredits", "Lender Credits", { default: 0, max: 1000000000, step: 250 }),
    ],
    calcResult: { label: "Cash to Close", format: "currency" },
    calcResults: [
      { key: "cashToClose", label: "Cash to Close", format: "currency", highlight: true },
      { key: "downPaymentAmount", label: "Down Payment", format: "currency" },
      { key: "closingCosts", label: "Closing Costs", format: "currency" },
      { key: "totalCreditsAndDeposits", label: "Credits & Deposit Applied", format: "currency" },
      { key: "totalCashForPurchase", label: "Total Cash for the Purchase", format: "currency" },
    ],
    instructions: "Enter the price, your down payment and closing costs, the earnest money you already paid (it counts toward what you owe), and any credits from the seller or lender.",
    examples: "Example: 10% down on a $360,000 home ($36,000) plus $10,800 of closing costs, minus a $5,000 deposit and $4,000 of seller credits, means bringing $37,800 to closing — $42,800 in total with the deposit.",
    assumptions: "Your Closing Disclosure, received at least three business days before closing, shows the exact figure. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How do I pay the cash to close?", answer: "Usually by wire transfer or cashier's check. Always confirm wiring instructions by phone with your title or escrow company — wire fraud targeting homebuyers is common." }],
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
