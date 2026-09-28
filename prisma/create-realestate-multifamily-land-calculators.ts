// One-time (but safe to re-run) batch setup script: creates the 9 tools
// of the "Real Estate Calculators" sub-batch J (Multifamily, Land & Development). Part of the
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
// See src/lib/calc-engine-realestate-multifamily-land.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-realestate-multifamily-land-calculators.ts
// or
//   npm run db:create-realestate-multifamily-land-calculators

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
    slug: "multifamily-property-calculator",
    title: "Multifamily Property Calculator",
    description: "Size up an apartment building or multifamily property from its unit mix — gross rent, price per door, average rent per unit and gross rent multiplier.",
    metaTitle: "Multifamily Property Calculator — Price per Door",
    metaDescription: "Free multifamily property calculator. Enter the unit mix and rents to get gross rent, price per door, average rent per unit and the gross rent multiplier.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 1800000, max: 100000000000, step: 10000 }),
      numberField("unitsTypeA", "Unit Type A — Number of Units", { default: 12, min: 0, max: 10000, step: 1 }),
      currencyField("rentTypeA", "Unit Type A — Monthly Rent", { default: 1200, max: 1000000, step: 25 }),
      numberField("unitsTypeB", "Unit Type B — Number of Units", { default: 8, min: 0, max: 10000, step: 1 }),
      currencyField("rentTypeB", "Unit Type B — Monthly Rent", { default: 1500, max: 1000000, step: 25 }),
      currencyField("otherMonthlyIncome", "Other Monthly Income (Laundry, Parking)", { default: 600, max: 100000000, step: 50 }),
    ],
    calcResult: { label: "Gross Yearly Rent", format: "currency" },
    calcResults: [
      { key: "grossAnnualRent", label: "Gross Yearly Rent", format: "currency", highlight: true },
      { key: "pricePerDoor", label: "Price per Door (Unit)", format: "currency" },
      { key: "averageRentPerUnit", label: "Average Rent per Unit", format: "currency" },
      { key: "grossRentMultiplier", label: "Gross Rent Multiplier", format: "number" },
      { key: "totalUnits", label: "Total Units", format: "number" },
    ],
    instructions: "Enter the price and the building's unit mix — for example one-bedrooms as type A and two-bedrooms as type B — with their monthly rents, plus other monthly income.",
    examples: "Example: 12 units at $1,200 and 8 at $1,500, plus $600 of other income, bring in $324,000 a year. At $1,800,000 that's $90,000 per door, an average rent of $1,320 and a gross rent multiplier of 5.56.",
    assumptions: "Gross figures ignore vacancy and expenses — use the Multifamily Cap Rate and Cash Flow Calculators for net returns. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What does price per door tell me?", answer: "It's a quick way to compare apartment buildings of different sizes. Compare it with recent sales of similar buildings, adjusting for unit size and condition." }],
  },
  {
    slug: "multifamily-cap-rate-calculator",
    title: "Multifamily Cap Rate Calculator",
    description: "Find a multifamily property's cap rate from per-unit rent and per-unit expenses, NOI per unit, and how much value a rent increase would add at that cap rate.",
    metaTitle: "Multifamily Cap Rate Calculator — Per-Unit NOI",
    metaDescription: "Free multifamily cap rate calculator. Use per-unit rent and expenses to find NOI, cap rate and NOI per unit, plus the value a rent increase adds.",
    calcInputs: [
      numberField("numberOfUnits", "Number of Units", { default: 24, min: 0, max: 100000, step: 1 }),
      currencyField("averageMonthlyRent", "Average Monthly Rent per Unit", { default: 1300, max: 1000000, step: 25 }),
      percentField("vacancyPercent", "Vacancy Rate", { default: 6, max: 100, step: 0.5 }),
      currencyField("annualExpensesPerUnit", "Yearly Operating Expenses per Unit", { default: 6500, max: 10000000, step: 100 }),
      currencyField("purchasePrice", "Purchase Price", { default: 2900000, max: 100000000000, step: 10000 }),
      currencyField("plannedRentIncrease", "Planned Rent Increase per Unit (Monthly)", { default: 100, max: 100000, step: 10 }),
    ],
    calcResult: { label: "Cap Rate", format: "percentage" },
    calcResults: [
      { key: "capRatePercent", label: "Cap Rate", format: "percentage", highlight: true },
      { key: "netOperatingIncome", label: "Net Operating Income", format: "currency" },
      { key: "noiPerUnit", label: "NOI per Unit", format: "currency" },
      { key: "valueAddedByRentIncrease", label: "Value Added by Rent Increase", format: "currency" },
    ],
    instructions: "Enter the number of units, average rent, vacancy, yearly operating expenses per unit (typically $4,000 to $8,000) and the price. The rent increase shows how raising rents lifts the building's value at the same cap rate.",
    examples: "Example: 24 units at $1,300 with 6% vacancy and $6,500 of expenses per unit produce $195,936 of NOI ($8,164 per unit) — a 6.76% cap rate on $2,900,000. Raising rents $100 a unit would add about $400,685.94 of value.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why do small rent increases add so much value?", answer: "Multifamily property is valued on NOI divided by the cap rate. At a 6.76% cap rate, each extra $1 of yearly NOI adds nearly $15 of value." }],
  },
  {
    slug: "multifamily-cash-flow-calculator",
    title: "Multifamily Cash Flow Calculator",
    description: "Calculate an apartment building's cash flow after the mortgage and capital reserves — for the whole property and per door — with its debt service coverage ratio.",
    metaTitle: "Multifamily Cash Flow Calculator — Per Door",
    metaDescription: "Free multifamily cash flow calculator. Find monthly and yearly cash flow after the mortgage and capex reserves, cash flow per door, and DSCR.",
    calcInputs: [
      numberField("numberOfUnits", "Number of Units", { default: 16, min: 1, max: 100000, step: 1 }),
      currencyField("averageMonthlyRent", "Average Monthly Rent per Unit", { default: 1250, max: 1000000, step: 25 }),
      percentField("vacancyPercent", "Vacancy Rate", { default: 5, max: 100, step: 0.5 }),
      percentField("operatingExpenseRatioPercent", "Operating Expense Ratio", { default: 45, max: 100, step: 1 }),
      currencyField("capexReservePerUnitAnnual", "Capital Reserve per Unit (Yearly)", { default: 300, max: 1000000, step: 25 }),
      currencyField("loanAmount", "Loan Amount", { default: 1200000, max: 100000000000, step: 10000 }),
      percentField("interestRatePercent", "Interest Rate", { default: 6.75, max: 30, step: 0.05 }),
      numberField("amortizationYears", "Amortization", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Monthly Cash Flow", format: "currency" },
    calcResults: [
      { key: "monthlyCashFlow", label: "Monthly Cash Flow", format: "currency", highlight: true },
      { key: "monthlyCashFlowPerDoor", label: "Monthly Cash Flow per Door", format: "currency" },
      { key: "annualCashFlow", label: "Yearly Cash Flow", format: "currency" },
      { key: "netOperatingIncome", label: "Net Operating Income", format: "currency" },
      { key: "dscr", label: "DSCR", format: "number" },
    ],
    instructions: "Enter the units, average rent and vacancy, operating expenses as a share of collected rent (40% to 50% is common for apartments), a yearly capital reserve per unit, and your loan.",
    examples: "Example: 16 units at $1,250 with 5% vacancy and a 45% expense ratio give $125,400 of NOI. After the mortgage and $300 per unit of reserves, cash flow is $27,201.87 a year — $2,266.82 a month, or $141.68 per door — with a 1.34 DSCR.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is good cash flow per door?", answer: "Many small multifamily investors aim for $100 to $200 per unit per month after all expenses, reserves and the mortgage." }],
  },
  {
    slug: "multifamily-roi-calculator",
    title: "Multifamily ROI Calculator",
    description: "Measure the return on a multifamily value-add plan — renovating units to raise rents — including the added NOI, the value it creates at the cap rate, and the payback period.",
    metaTitle: "Multifamily ROI Calculator — Value-Add Renovations",
    metaDescription: "Free multifamily ROI calculator for value-add. See the return on unit renovations, added NOI, value created at the cap rate and payback period.",
    calcInputs: [
      numberField("unitsRenovated", "Units Renovated", { default: 20, min: 0, max: 100000, step: 1 }),
      currencyField("renovationCostPerUnit", "Renovation Cost per Unit", { default: 12000, max: 10000000, step: 500 }),
      currencyField("rentIncreasePerUnit", "Rent Increase per Unit (Monthly)", { default: 175, max: 100000, step: 5 }),
      percentField("capRatePercent", "Market Cap Rate", { default: 6.5, min: 0.5, max: 30, step: 0.05 }),
      percentField("extraExpensePercent", "Share of Extra Rent Lost to Vacancy & Costs", { default: 5, max: 100, step: 1 }),
    ],
    calcResult: { label: "Return on Renovation", format: "percentage" },
    calcResults: [
      { key: "returnOnRenovationPercent", label: "Return on Renovation (Yearly)", format: "percentage", highlight: true },
      { key: "addedAnnualNoi", label: "Added Yearly NOI", format: "currency" },
      { key: "valueCreated", label: "Value Created", format: "currency" },
      { key: "equityCreatedAfterCost", label: "Equity Created After Cost", format: "currency" },
      { key: "paybackYears", label: "Payback Period (Years)", format: "number" },
    ],
    instructions: "Enter how many units you'll renovate, the cost per unit, the rent increase you expect after renovation, the market cap rate, and the share of the extra rent lost to vacancy and higher costs.",
    examples: "Example: renovating 20 units for $12,000 each ($240,000) to add $175 a month in rent brings $39,900 of extra NOI a year — a 16.63% return that pays back in 6.02 years. At a 6.5% cap rate that creates $613,846.15 of value, or $373,846.15 after the cost.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What return should a value-add renovation earn?", answer: "Many operators look for at least 15% to 20% a year on renovation money, so the value created comfortably exceeds the cost and risk." }],
  },
  {
    slug: "apartment-investment-calculator",
    title: "Apartment Investment Calculator",
    description: "Estimate your returns as a limited partner in an apartment syndication — yearly distributions, a preferred return, the profit split at sale, and your equity multiple.",
    metaTitle: "Apartment Syndication Calculator — LP Returns",
    metaDescription: "Free apartment investment calculator for syndications. Estimate LP distributions, preferred return, profit split at sale, equity multiple and yearly return.",
    calcInputs: [
      currencyField("investment", "Your Investment", { default: 100000, max: 10000000000, step: 5000 }),
      percentField("preferredReturnPercent", "Preferred Return", { default: 7, max: 30, step: 0.5 }),
      percentField("annualCashYieldPercent", "Yearly Cash Distributions", { default: 6, max: 30, step: 0.5 }),
      numberField("holdYears", "Holding Period", { unit: "years", default: 5, min: 1, max: 20, step: 1 }),
      numberField("saleProfitMultiple", "Your Share of Sale Proceeds (× Investment)", { default: 1.6, min: 0, max: 10, step: 0.05 }),
      percentField("lpSplitPercent", "LP Share of Profit Above Preferred Return", { default: 70, max: 100, step: 5 }),
    ],
    calcResult: { label: "Equity Multiple", format: "number" },
    calcResults: [
      { key: "equityMultiple", label: "Equity Multiple", format: "number", highlight: true },
      { key: "totalReturnedToYou", label: "Total Returned to You", format: "currency" },
      { key: "totalProfit", label: "Total Profit", format: "currency" },
      { key: "annualizedReturnPercent", label: "Annualized Return", format: "percentage" },
      { key: "cashDistributionsDuringHold", label: "Cash Distributions During Hold", format: "currency" },
    ],
    instructions: "Enter your investment and the deal's terms from the offering: the preferred return, expected yearly distributions, hold period, what your share of the sale proceeds is projected to be, and the LP/GP profit split. At sale you get your capital back first, then any unpaid preferred return, then your share of the rest.",
    examples: "Example: $100,000 paying 6% a year collects $30,000 over 5 years. At sale, 1.6× proceeds return your capital, the $5,000 of unpaid preferred return, and 70% of the remaining $55,000. You get $173,500 in total — a 1.74 equity multiple and about 11.65% a year.",
    assumptions: "Simplified waterfall; real deals may add GP catch-up, fees and several hurdles. Returns are before tax. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is a preferred return?", answer: "A return (often 6% to 8% a year) that limited partners receive before the sponsor shares in the profits. It's a priority, not a guarantee." }],
  },
  {
    slug: "real-estate-development-calculator",
    title: "Real Estate Development Calculator",
    description: "Work out a development's residual land value — what a developer can afford to pay for the land after build costs, soft costs, financing, selling costs and a target profit.",
    metaTitle: "Real Estate Development Calculator — Land Value",
    metaDescription: "Free real estate development calculator. Find residual land value from sale values, build, soft, finance and selling costs and a target profit.",
    calcInputs: [
      numberField("numberOfUnits", "Number of Units", { default: 10, min: 0, max: 100000, step: 1 }),
      currencyField("salePricePerUnit", "Sale Price per Unit", { default: 450000, max: 1000000000, step: 5000 }),
      currencyField("buildCostPerUnit", "Hard Build Cost per Unit", { default: 260000, max: 1000000000, step: 5000 }),
      percentField("softCostPercent", "Soft Costs (% of Build Cost)", { default: 15, max: 100, step: 1 }),
      percentField("financingCostPercent", "Financing Costs (% of Build Costs)", { default: 6, max: 50, step: 0.5 }),
      percentField("sellingCostPercent", "Selling Costs (% of Sales)", { default: 5, max: 20, step: 0.5 }),
      percentField("targetProfitPercentOfGdv", "Target Profit (% of Sales)", { default: 15, max: 50, step: 1 }),
    ],
    calcResult: { label: "Residual Land Value", format: "currency" },
    calcResults: [
      { key: "residualLandValue", label: "Residual Land Value", format: "currency", highlight: true },
      { key: "landValuePerUnit", label: "Land Value per Unit", format: "currency" },
      { key: "grossDevelopmentValue", label: "Gross Development Value", format: "currency" },
      { key: "totalDevelopmentCosts", label: "Development Costs (Excl. Land)", format: "currency" },
      { key: "targetProfit", label: "Target Profit", format: "currency" },
    ],
    instructions: "Enter how many units you'll build and their expected sale price, the hard build cost per unit, soft costs (design, permits, fees), financing and selling costs, and your target profit. What's left is the most you can pay for the land.",
    examples: "Example: 10 units selling for $450,000 each is a $4,500,000 gross development value. Take away $3,394,400 of building, soft, finance and selling costs and a $675,000 profit, and you can pay up to $430,600 for the land — $43,060 per unit.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is residual land value?", answer: "The value left for the land after all development costs and the developer's profit are paid from the finished project's value. Developers use it to set their land offers." }],
  },
  {
    slug: "land-investment-calculator",
    title: "Land Investment Calculator",
    description: "Project the return on buying and holding land — purchase and closing costs, yearly property tax and other carrying costs, and the net profit and annual return when you sell.",
    metaTitle: "Land Investment Calculator — Hold & Sell Return",
    metaDescription: "Free land investment calculator. Add purchase, closing and yearly carrying costs, then see net profit, total return and annual return when you sell.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 120000, max: 10000000000, step: 1000 }),
      currencyField("closingCosts", "Closing Costs", { default: 3000, max: 100000000, step: 250 }),
      currencyField("annualPropertyTax", "Yearly Property Tax", { default: 1500, max: 100000000, step: 100 }),
      currencyField("otherAnnualCarryingCosts", "Other Yearly Costs (Insurance, Upkeep)", { default: 800, max: 100000000, step: 100 }),
      numberField("holdYears", "Years Held", { unit: "years", default: 5, min: 0.5, max: 100, step: 0.5 }),
      currencyField("expectedSalePrice", "Expected Sale Price", { default: 185000, max: 10000000000, step: 1000 }),
      percentField("sellingCostPercent", "Selling Costs", { default: 8, max: 20, step: 0.5 }),
    ],
    calcResult: { label: "Net Profit", format: "currency" },
    calcResults: [
      { key: "netProfit", label: "Net Profit", format: "currency", highlight: true },
      { key: "annualizedReturnPercent", label: "Annualized Return", format: "percentage" },
      { key: "totalReturnPercent", label: "Total Return", format: "percentage" },
      { key: "totalInvested", label: "Total Invested", format: "currency" },
      { key: "totalCarryingCosts", label: "Total Carrying Costs", format: "currency" },
    ],
    instructions: "Enter the price and closing costs, the yearly property tax and other costs of holding the land, how long you'll hold it, the price you expect to sell for and your selling costs.",
    examples: "Example: $120,000 of land held 5 years costs $134,500 including closing and $11,500 of carrying costs. Selling for $185,000 less 8% leaves $35,700 of profit — 26.54% in total, but only 4.82% a year.",
    assumptions: "All-cash purchase; land produces no income unless you lease it. Returns are before tax. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is land a good investment?", answer: "It can be when growth is heading its way, but it earns no rent while you wait and is often harder to sell or finance than a house. Carrying costs quietly eat into returns." }],
  },
  {
    slug: "land-value-calculator",
    title: "Land Value Calculator",
    description: "Estimate what a piece of land is worth from three comparable land sales per acre, adjusted for location and for access and utilities.",
    metaTitle: "Land Value Calculator — Price per Acre from Comps",
    metaDescription: "Free land value calculator. Average three comparable land sales per acre, adjust for location, access and utilities, and estimate your land's value.",
    calcInputs: [
      numberField("acres", "Size of Your Land", { unit: "acres", default: 5, min: 0, max: 1000000, step: 0.25 }),
      currencyField("comp1PricePerAcre", "Comparable 1 — Price per Acre", { default: 22000, max: 1000000000, step: 500 }),
      currencyField("comp2PricePerAcre", "Comparable 2 — Price per Acre", { default: 26000, max: 1000000000, step: 500 }),
      currencyField("comp3PricePerAcre", "Comparable 3 — Price per Acre", { default: 24000, max: 1000000000, step: 500 }),
      percentField("locationAdjustmentPercent", "Location Adjustment", { default: 5, min: -50, max: 50, step: 1 }),
      percentField("accessAndUtilitiesAdjustmentPercent", "Access & Utilities Adjustment", { default: -10, min: -50, max: 50, step: 1 }),
    ],
    calcResult: { label: "Estimated Land Value", format: "currency" },
    calcResults: [
      { key: "estimatedLandValue", label: "Estimated Land Value", format: "currency", highlight: true },
      { key: "adjustedPricePerAcre", label: "Adjusted Price per Acre", format: "currency" },
      { key: "averageCompPricePerAcre", label: "Average Comparable Price per Acre", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter your land's size and the price per acre of three similar parcels that sold recently. Adjust up or down for a better or worse location, and for road access, utilities, zoning or slope compared with the comps.",
    examples: "Example: comps averaging $24,000 an acre, adjusted +5% for location and -10% for no utilities, give $22,800 an acre. Five acres are worth about $114,000, in a range of $104,500 to $123,500.",
    assumptions: "Land prices vary with zoning, frontage, soil and buildability; small parcels often sell for more per acre than large ones. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What makes land more valuable?", answer: "Road access, utilities at the lot line, zoning that allows building, good soil and drainage, and being in the path of growth. Landlocked or unbuildable land sells at a big discount." }],
  },
  {
    slug: "property-development-profit-calculator",
    title: "Property Development Profit Calculator",
    description: "Calculate a development project's profit, profit on cost and margin on gross development value (GDV) from land, construction, professional fees, finance, contingency and selling costs.",
    metaTitle: "Development Profit Calculator — Profit on Cost & GDV",
    metaDescription: "Free property development profit calculator. Find profit, profit on cost and profit on GDV after land, build, fees, finance, contingency and selling costs.",
    calcInputs: [
      currencyField("grossDevelopmentValue", "Gross Development Value (Total Sales)", { default: 3200000, max: 100000000000, step: 10000 }),
      currencyField("landCost", "Land Cost", { default: 600000, max: 100000000000, step: 10000 }),
      currencyField("constructionCost", "Construction Cost", { default: 1700000, max: 100000000000, step: 10000 }),
      percentField("professionalFeesPercent", "Professional Fees (% of Construction)", { default: 10, max: 50, step: 0.5 }),
      currencyField("financeCosts", "Finance Costs", { default: 150000, max: 10000000000, step: 1000 }),
      percentField("sellingCostPercent", "Selling Costs (% of GDV)", { default: 3, max: 20, step: 0.5 }),
      percentField("contingencyPercent", "Contingency (% of Construction)", { default: 5, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Development Profit", format: "currency" },
    calcResults: [
      { key: "developmentProfit", label: "Development Profit", format: "currency", highlight: true },
      { key: "profitOnCostPercent", label: "Profit on Cost", format: "percentage" },
      { key: "profitOnGdvPercent", label: "Profit on GDV", format: "percentage" },
      { key: "totalDevelopmentCost", label: "Total Development Cost", format: "currency" },
    ],
    instructions: "Enter the total expected sales value of the finished project, the land and construction costs, professional fees (architects, engineers), finance costs, selling costs and a contingency.",
    examples: "Example: a project selling for $3,200,000 that costs $2,801,000 in total makes $399,000 of profit — 14.24% on cost and 12.47% of GDV.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What profit margin do developers target?", answer: "Commonly 15% to 20% of GDV, or 20% to 25% on cost, for residential projects. Lenders often won't fund projects with thinner margins." }],
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
