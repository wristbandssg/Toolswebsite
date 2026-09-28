// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Real Estate Calculators" sub-batch C (Property Value, Appreciation & Depreciation). Part of the
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
// See src/lib/calc-engine-realestate-value-appreciation.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-realestate-value-appreciation-calculators.ts
// or
//   npm run db:create-realestate-value-appreciation-calculators

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

function dropdownField(key: string, label: string, defaultValue: number, options: { label: string; value: number }[]) {
  return { key, label, type: "dropdown", required: true, default: defaultValue, options };
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
    slug: "property-value-calculator",
    title: "Property Value Calculator",
    description: "Estimate what a home or property is worth from three comparable sales — their price per square foot applied to your property's size — with a low-to-high range.",
    metaTitle: "Property Value Calculator — Estimate from Comps",
    metaDescription: "Free property value calculator. Enter three recent comparable sales to estimate your home's value from price per square foot, with a low and high range.",
    calcInputs: [
      numberField("subjectSquareFeet", "Your Property's Size", { unit: "sq ft", default: 1800, min: 0, max: 1000000, step: 10 }),
      currencyField("comp1Price", "Comparable 1 — Sale Price", { default: 360000, max: 10000000000, step: 1000 }),
      numberField("comp1SquareFeet", "Comparable 1 — Size", { unit: "sq ft", default: 1750, min: 1, max: 1000000, step: 10 }),
      currencyField("comp2Price", "Comparable 2 — Sale Price", { default: 395000, max: 10000000000, step: 1000 }),
      numberField("comp2SquareFeet", "Comparable 2 — Size", { unit: "sq ft", default: 1950, min: 1, max: 1000000, step: 10 }),
      currencyField("comp3Price", "Comparable 3 — Sale Price", { default: 342000, max: 10000000000, step: 1000 }),
      numberField("comp3SquareFeet", "Comparable 3 — Size", { unit: "sq ft", default: 1700, min: 1, max: 1000000, step: 10 }),
      percentField("adjustmentPercent", "Condition / Feature Adjustment", { default: 0, min: -50, max: 50, step: 1 }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "averagePricePerSquareFoot", label: "Average Price per Sq Ft", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter your property's living area and three similar homes that sold recently nearby — ideally within a mile and the last six months. Use the adjustment to add or subtract a percentage if your home is in better or worse condition, or has a feature the comps lack.",
    examples: "Example: the three comps sold for an average of $203.15 per square foot. Applied to an 1,800 sq ft home that's an estimated value of $365,672.92, within a range of $362,117.65 to $370,285.71.",
    assumptions: "A simple price-per-square-foot comparison; appraisers also adjust for lot size, bedrooms, age, garage and location. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How accurate is a comps-based estimate?", answer: "With truly similar, recent sales it's often within 5% to 10%. A professional appraisal or a broker's price opinion is more precise." }],
  },
  {
    slug: "investment-property-value-calculator",
    title: "Investment Property Value Calculator",
    description: "Work out the most you should pay for an investment property to earn your target cash-on-cash return, given its net operating income and your loan terms.",
    metaTitle: "Investment Property Value Calculator — Max Price",
    metaDescription: "Free investment property value calculator. Find the highest price you can pay and still hit your target cash-on-cash return with your loan terms.",
    calcInputs: [
      currencyField("annualNoi", "Net Operating Income (Yearly)", { default: 20000, max: 1000000000, step: 500 }),
      percentField("targetCashOnCashPercent", "Target Cash-on-Cash Return", { default: 8, max: 50, step: 0.25 }),
      percentField("downPaymentPercent", "Down Payment", { default: 25, max: 100, step: 1 }),
      percentField("closingCostPercent", "Closing Costs (% of Price)", { default: 3, max: 20, step: 0.25 }),
      percentField("interestRatePercent", "Interest Rate", { default: 7, max: 30, step: 0.05 }),
      numberField("loanYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Maximum Purchase Price", format: "currency" },
    calcResults: [
      { key: "maxPurchasePrice", label: "Maximum Purchase Price", format: "currency", highlight: true },
      { key: "cashNeeded", label: "Cash Needed (Down + Closing)", format: "currency" },
      { key: "annualCashFlowAtThatPrice", label: "Yearly Cash Flow at That Price", format: "currency" },
      { key: "capRateAtThatPricePercent", label: "Cap Rate at That Price", format: "percentage" },
    ],
    instructions: "Enter the property's yearly net operating income (rent after vacancy and operating expenses), the cash-on-cash return you want, and your financing. The tool solves for the price where cash flow ÷ cash invested equals your target.",
    examples: "Example: a property with $20,000 of NOI, bought with 25% down at 7%, hits an 8% cash-on-cash return at a price of $243,080.64. You'd put in $68,062.58 and collect $5,445.01 a year — an 8.23% cap rate.",
    assumptions: "Loan is a fixed-rate mortgage on the rest of the price. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why does the maximum price fall when rates rise?", answer: "A higher rate means a bigger mortgage payment on every dollar borrowed, so less of the NOI is left as cash flow — you must pay less to keep the same return." }],
  },
  {
    slug: "income-approach-property-value-calculator",
    title: "Income Approach Property Value Calculator",
    description: "Value an income property the way appraisers do with the income approach: net operating income divided by the market cap rate — with values at a cap rate half a point higher and lower.",
    metaTitle: "Income Approach Calculator — Value from NOI & Cap",
    metaDescription: "Free income approach property value calculator. Divide NOI by the market cap rate to value a rental, and see how the value shifts with the cap rate.",
    calcInputs: [
      currencyField("grossAnnualRent", "Gross Yearly Rent", { default: 120000, max: 10000000000, step: 1000 }),
      percentField("vacancyPercent", "Vacancy Rate", { default: 5, max: 100, step: 0.5 }),
      currencyField("operatingExpenses", "Yearly Operating Expenses", { default: 42000, max: 10000000000, step: 500 }),
      percentField("marketCapRatePercent", "Market Cap Rate", { default: 6.5, min: 0.5, max: 30, step: 0.05 }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "netOperatingIncome", label: "Net Operating Income", format: "currency" },
      { key: "valueIfCapRateHalfPointHigher", label: "Value if Cap Rate Is 0.5 Points Higher", format: "currency" },
      { key: "valueIfCapRateHalfPointLower", label: "Value if Cap Rate Is 0.5 Points Lower", format: "currency" },
    ],
    instructions: "Enter the gross yearly rent, a vacancy rate, the yearly operating expenses and the cap rate similar properties are selling at. Brokers and appraisers can tell you the local market cap rate.",
    examples: "Example: $120,000 of rent less 5% vacancy and $42,000 of expenses is $72,000 of NOI. At a 6.5% cap rate the property is worth $1,107,692.31 — $1,028,571.43 at 7% and $1,200,000 at 6%.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why does a small cap rate change move value so much?", answer: "Value is NOI divided by the cap rate, so a half-point change on a 6.5% cap rate shifts value by around 7% to 8%. That's why rising interest rates can quickly lower property values." }],
  },
  {
    slug: "property-appreciation-calculator",
    title: "Property Appreciation Calculator",
    description: "Project what a property will be worth in the future at a yearly appreciation rate, how much value it gains, and its value five years from now.",
    metaTitle: "Property Appreciation Calculator — Future Value",
    metaDescription: "Free property appreciation calculator. Project your home or property's future value at a yearly growth rate and see the total appreciation gained.",
    calcInputs: [
      currencyField("currentValue", "Current Property Value", { default: 350000, max: 10000000000, step: 1000 }),
      percentField("annualAppreciationPercent", "Yearly Appreciation Rate", { default: 4, min: -20, max: 30, step: 0.1 }),
      numberField("years", "Years", { unit: "years", default: 10, min: 0, max: 100, step: 1 }),
    ],
    calcResult: { label: "Future Value", format: "currency" },
    calcResults: [
      { key: "futureValue", label: "Future Value", format: "currency", highlight: true },
      { key: "totalAppreciation", label: "Total Appreciation", format: "currency" },
      { key: "totalGrowthPercent", label: "Total Growth", format: "percentage" },
      { key: "valueAfter5Years", label: "Value After 5 Years", format: "currency" },
    ],
    instructions: "Enter today's value, an expected yearly appreciation rate and how many years ahead to look. U.S. home prices have risen about 4% a year on average over the long run, but local markets vary a lot.",
    examples: "Example: a $350,000 home growing 4% a year is worth $425,828.52 after 5 years and $518,085.50 after 10 — a gain of $168,085.50 (48.02%).",
    assumptions: "Assumes a steady compound rate; real prices rise and fall. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What appreciation rate should I use?", answer: "3% to 4% is a common long-run planning figure in the U.S. Look at your area's history, and test a lower rate to be safe." }],
  },
  {
    slug: "real-estate-appreciation-calculator",
    title: "Real Estate Appreciation Calculator",
    description: "Find the yearly appreciation rate a property actually earned between purchase and today — and the real rate after inflation.",
    metaTitle: "Real Estate Appreciation Rate Calculator — Past",
    metaDescription: "Free real estate appreciation calculator. See the yearly rate your property grew at since you bought it, total gain, and real growth after inflation.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 250000, max: 10000000000, step: 1000 }),
      currencyField("currentValue", "Current Value", { default: 380000, max: 10000000000, step: 1000 }),
      numberField("yearsOwned", "Years Owned", { unit: "years", default: 8, min: 0.1, max: 100, step: 0.5 }),
      percentField("inflationPercent", "Average Inflation Over That Time", { default: 3, min: -10, max: 50, step: 0.1 }),
    ],
    calcResult: { label: "Yearly Appreciation Rate", format: "percentage" },
    calcResults: [
      { key: "annualAppreciationPercent", label: "Yearly Appreciation Rate", format: "percentage", highlight: true },
      { key: "totalAppreciation", label: "Total Appreciation", format: "currency" },
      { key: "totalGrowthPercent", label: "Total Growth", format: "percentage" },
      { key: "realAnnualAppreciationPercent", label: "Real Yearly Rate (After Inflation)", format: "percentage" },
    ],
    instructions: "Enter what you paid, what the property is worth now, how many years you've owned it, and the average inflation rate over that time.",
    examples: "Example: a home bought for $250,000 and worth $380,000 after 8 years gained $130,000 (52%) — a compound rate of 5.37% a year, or 2.3% a year after 3% inflation.",
    assumptions: "Doesn't count improvements you made — subtract them from the current value to see market appreciation alone. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why is the yearly rate lower than total growth ÷ years?", answer: "Growth compounds: each year's gain builds on a higher value. 52% over 8 years is 6.5% a year simple, but only 5.37% compounded." }],
  },
  {
    slug: "property-depreciation-calculator",
    title: "Property Depreciation Calculator",
    description: "Calculate the yearly tax depreciation on a residential rental over 27.5 years — the depreciable basis without land, the prorated first year and the tax it saves.",
    metaTitle: "Property Depreciation Calculator — 27.5-Year Rental",
    metaDescription: "Free property depreciation calculator for rentals. Find the basis without land, yearly and first-year depreciation over 27.5 years, and the tax saved.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price (Incl. Closing Costs)", { default: 350000, max: 10000000000, step: 1000 }),
      currencyField("landValue", "Land Value", { default: 70000, max: 10000000000, step: 1000 }),
      currencyField("capitalImprovements", "Capital Improvements", { default: 15000, max: 1000000000, step: 500 }),
      numberField("monthPlacedInService", "Month Placed in Service (1–12)", { default: 7, min: 1, max: 12, step: 1 }),
      percentField("marginalTaxRatePercent", "Your Marginal Tax Rate", { default: 24, max: 60, step: 1 }),
    ],
    calcResult: { label: "Yearly Depreciation", format: "currency" },
    calcResults: [
      { key: "annualDepreciation", label: "Yearly Depreciation", format: "currency", highlight: true },
      { key: "firstYearDepreciation", label: "First-Year Depreciation", format: "currency" },
      { key: "depreciableBasis", label: "Depreciable Basis", format: "currency" },
      { key: "annualTaxSavings", label: "Yearly Tax Savings", format: "currency" },
    ],
    instructions: "Enter the price plus closing costs, the land value (from your tax assessment — land isn't depreciated), capital improvements, the month the rental was ready for tenants and your marginal tax rate.",
    examples: "Example: a $350,000 rental with $70,000 of land and $15,000 of improvements has a $295,000 basis, giving $10,727.27 of depreciation a year. Placed in service in July, year one gets $4,916.67. At a 24% rate the full-year deduction saves $2,574.55.",
    assumptions: "Uses the IRS mid-month convention for residential rental property (27.5 years). Depreciation is recaptured when you sell. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Can I choose not to depreciate my rental?", answer: "Not really — when you sell, the IRS taxes recapture on the depreciation you were allowed to take, whether you claimed it or not." }],
  },
  {
    slug: "real-estate-depreciation-calculator",
    title: "Real Estate Depreciation Calculator",
    description: "Depreciate residential (27.5-year) or commercial (39-year) property, see total depreciation over your holding period, the tax it saved, and the recapture tax due when you sell.",
    metaTitle: "Real Estate Depreciation Calculator — 27.5 or 39 Yr",
    metaDescription: "Free real estate depreciation calculator. Residential 27.5-year or commercial 39-year depreciation, tax saved while you own, and recapture tax on sale.",
    calcInputs: [
      currencyField("buildingBasis", "Building Basis (Excluding Land)", { default: 800000, max: 10000000000, step: 1000 }),
      dropdownField("recoveryYears", "Property Type", 39, [
        { label: "Commercial / non-residential (39 years)", value: 39 },
        { label: "Residential rental (27.5 years)", value: 27.5 },
      ]),
      numberField("yearsHeld", "Years You'll Hold It", { unit: "years", default: 10, min: 0, max: 100, step: 1 }),
      percentField("ordinaryTaxRatePercent", "Your Marginal Tax Rate", { default: 32, max: 60, step: 1 }),
    ],
    calcResult: { label: "Yearly Depreciation", format: "currency" },
    calcResults: [
      { key: "annualDepreciation", label: "Yearly Depreciation", format: "currency", highlight: true },
      { key: "accumulatedDepreciation", label: "Total Depreciation Over Hold", format: "currency" },
      { key: "taxSavedWhileHeld", label: "Tax Saved While You Own", format: "currency" },
      { key: "recaptureTaxIfSold", label: "Recapture Tax When You Sell", format: "currency" },
      { key: "remainingBasis", label: "Remaining Building Basis", format: "currency" },
    ],
    instructions: "Enter the building's cost basis without land, choose residential or commercial, and enter how long you'll hold it and your tax rate. Depreciation recaptured on sale is taxed at your rate, but no more than 25%.",
    examples: "Example: an $800,000 commercial building depreciates $20,512.82 a year. Over 10 years that's $205,128.21, saving $65,641.03 at a 32% rate — but selling triggers $51,282.05 of recapture tax at 25%, leaving a $594,871.79 basis.",
    assumptions: "Uses full years of straight-line depreciation. Cost segregation and bonus depreciation can speed deductions up. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How can I avoid depreciation recapture?", answer: "A 1031 exchange into another investment property defers it, and heirs who inherit the property get a stepped-up basis that wipes it out." }],
  },
  {
    slug: "rental-property-appreciation-calculator",
    title: "Rental Property Appreciation Calculator",
    description: "Project how a rental's value and rent both grow over time, and how the yield on your original purchase price climbs as rents rise.",
    metaTitle: "Rental Appreciation Calculator — Value & Rent Growth",
    metaDescription: "Free rental property appreciation calculator. Project future value and rent, and see how the yield on your original price rises as rents grow.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 300000, max: 10000000000, step: 1000 }),
      currencyField("monthlyRent", "Current Monthly Rent", { default: 2200, max: 10000000, step: 25 }),
      percentField("valueGrowthPercent", "Value Growth per Year", { default: 3.5, min: -20, max: 30, step: 0.1 }),
      percentField("rentGrowthPercent", "Rent Growth per Year", { default: 3, min: -20, max: 30, step: 0.1 }),
      numberField("years", "Years", { unit: "years", default: 10, min: 0, max: 100, step: 1 }),
    ],
    calcResult: { label: "Future Property Value", format: "currency" },
    calcResults: [
      { key: "futurePropertyValue", label: "Future Property Value", format: "currency", highlight: true },
      { key: "futureMonthlyRent", label: "Future Monthly Rent", format: "currency" },
      { key: "grossYieldOnOriginalCostPercent", label: "Gross Yield on Original Price", format: "percentage" },
      { key: "grossYieldOnFutureValuePercent", label: "Gross Yield on Future Value", format: "percentage" },
    ],
    instructions: "Enter what you paid, today's rent, and how fast you expect value and rent to grow each year.",
    examples: "Example: a $300,000 rental at $2,200 a month, growing 3.5% in value and 3% in rent, is worth $423,179.63 in 10 years with rent of $2,956.62. That rent is an 11.83% gross yield on your original price, or 8.38% on the new value.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why does yield on cost keep rising?", answer: "Your purchase price is fixed, but rent keeps growing — so each year the rent is a bigger percentage of what you paid. It's one reason long-term holds reward investors." }],
  },
  {
    slug: "rental-property-future-value-calculator",
    title: "Rental Property Future Value Calculator",
    description: "Project the total wealth a rental builds over the years — equity from appreciation and loan paydown plus all the cash flow collected along the way.",
    metaTitle: "Rental Property Future Value — Wealth Over Time",
    metaDescription: "Free rental property future value calculator. Project equity from appreciation and loan paydown plus total cash flow to see the wealth a rental builds.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 300000, max: 10000000000, step: 1000 }),
      currencyField("loanAmount", "Loan Amount", { default: 240000, max: 10000000000, step: 1000 }),
      percentField("interestRatePercent", "Interest Rate", { default: 7, max: 30, step: 0.05 }),
      numberField("loanYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      currencyField("firstYearCashFlow", "First-Year Cash Flow", { default: 3000, max: 100000000, step: 100 }),
      percentField("cashFlowGrowthPercent", "Cash Flow Growth per Year", { default: 3, min: -20, max: 30, step: 0.5 }),
      percentField("appreciationPercent", "Appreciation per Year", { default: 3.5, min: -20, max: 30, step: 0.1 }),
      numberField("years", "Years to Project", { unit: "years", default: 10, min: 0, max: 50, step: 1 }),
    ],
    calcResult: { label: "Total Wealth Created", format: "currency" },
    calcResults: [
      { key: "totalWealthCreated", label: "Total Wealth Created", format: "currency", highlight: true },
      { key: "equity", label: "Equity", format: "currency" },
      { key: "propertyValue", label: "Property Value", format: "currency" },
      { key: "loanBalance", label: "Loan Balance", format: "currency" },
      { key: "cashFlowCollected", label: "Cash Flow Collected", format: "currency" },
    ],
    instructions: "Enter the purchase price, your loan, the first year's cash flow and how fast it grows, an appreciation rate, and how many years ahead to look.",
    examples: "Example: in 10 years a $300,000 rental growing 3.5% a year is worth $423,179.63. With the loan down to $205,949.72, equity is $217,229.91; add $34,391.64 of cash flow and the rental has built $251,621.55.",
    assumptions: "Equity is before selling costs and tax. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Does total wealth include my down payment?", answer: "Yes — equity includes the down payment you put in. Subtract your starting cash to see the gain alone." }],
  },
  {
    slug: "property-equity-growth-calculator",
    title: "Property Equity Growth Calculator",
    description: "See how your equity in a home or property grows over 5 and 10 years, and how much comes from your down payment, paying down the loan, and appreciation.",
    metaTitle: "Property Equity Growth Calculator — 5 & 10 Years",
    metaDescription: "Free property equity growth calculator. See equity after 5 and 10 years and how much comes from your down payment, loan paydown and appreciation.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 400000, max: 10000000000, step: 1000 }),
      currencyField("downPayment", "Down Payment", { default: 80000, max: 10000000000, step: 1000 }),
      percentField("interestRatePercent", "Interest Rate", { default: 6.5, max: 30, step: 0.05 }),
      numberField("loanYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      percentField("appreciationPercent", "Appreciation per Year", { default: 3, min: -20, max: 30, step: 0.1 }),
    ],
    calcResult: { label: "Equity After 10 Years", format: "currency" },
    calcResults: [
      { key: "equityAfter10Years", label: "Equity After 10 Years", format: "currency", highlight: true },
      { key: "equityAfter5Years", label: "Equity After 5 Years", format: "currency" },
      { key: "fromDownPayment", label: "From Down Payment", format: "currency" },
      { key: "fromLoanPaydown10Years", label: "From Loan Paydown (10 Years)", format: "currency" },
      { key: "fromAppreciation10Years", label: "From Appreciation (10 Years)", format: "currency" },
    ],
    instructions: "Enter the purchase price, your down payment, the loan's rate and term, and an expected appreciation rate.",
    examples: "Example: $80,000 down on a $400,000 home at 6.5% grows to $164,154.50 of equity in 5 years and $266,282.95 in 10 — $48,716.40 from paying down the loan and $137,566.55 from 3% appreciation.",
    assumptions: "Assumes regular payments with no extra principal. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why is loan paydown slow at first?", answer: "Early mortgage payments are mostly interest. The principal share grows every month, so equity from paydown speeds up later in the loan." }],
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
