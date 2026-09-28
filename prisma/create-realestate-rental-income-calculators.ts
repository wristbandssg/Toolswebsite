// One-time (but safe to re-run) batch setup script: creates the 12 tools
// of the "Real Estate Calculators" sub-batch A (Rental Income, Cash Flow & Expenses). Part of the
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
// See src/lib/calc-engine-realestate-rental-income.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-realestate-rental-income-calculators.ts
// or
//   npm run db:create-realestate-rental-income-calculators

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
    slug: "rental-income-calculator",
    title: "Rental Income Calculator",
    description: "Add up the rent from every unit plus other income like parking or laundry, subtract vacancy, and see the rental income you can realistically expect each month and year.",
    metaTitle: "Rental Income Calculator — Monthly & Yearly Rent",
    metaDescription: "Free rental income calculator. Total rent from all units plus other income, minus vacancy, to see realistic monthly and yearly rental income.",
    calcInputs: [
      numberField("units", "Number of Units", { default: 4, min: 1, max: 10000, step: 1 }),
      currencyField("monthlyRentPerUnit", "Monthly Rent per Unit", { default: 1400, max: 1000000, step: 25 }),
      currencyField("otherMonthlyIncome", "Other Monthly Income (Parking, Laundry, Fees)", { default: 250, max: 10000000, step: 25 }),
      percentField("vacancyPercent", "Vacancy Rate", { default: 5, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Effective Rental Income (Yearly)", format: "currency" },
    calcResults: [
      { key: "effectiveGrossIncomeYearly", label: "Effective Rental Income (Yearly)", format: "currency", highlight: true },
      { key: "effectiveIncomePerMonth", label: "Effective Rental Income (Monthly)", format: "currency" },
      { key: "grossPotentialIncomeYearly", label: "Gross Potential Income (Fully Rented)", format: "currency" },
      { key: "vacancyLossYearly", label: "Rent Lost to Vacancy (Yearly)", format: "currency" },
    ],
    instructions: "Enter how many units you rent out, the average monthly rent per unit, any other monthly income the property earns, and an expected vacancy rate. Vacancy is applied to the rent, not to the other income.",
    examples: "Example: 4 units at $1,400 a month plus $250 of other income is $70,200 a year fully rented. A 5% vacancy rate costs $3,360 of rent, leaving $66,840 a year — $5,570 a month.",
    assumptions: "Assumes every unit rents for the average rent you enter. Operating costs and the mortgage are not deducted — use the Rental Cash Flow Calculator for that. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What vacancy rate should I use?", answer: "5% to 8% is a common planning figure for residential rentals — roughly two to four weeks empty per unit each year. Use your local market's rate if you know it." }],
  },
  {
    slug: "rental-cash-flow-calculator",
    title: "Rental Cash Flow Calculator",
    description: "Work out a rental property's monthly cash flow: rent after vacancy, minus the mortgage, taxes, insurance and a percentage set aside for repairs, capital expenses and management.",
    metaTitle: "Rental Cash Flow Calculator — Monthly Cash Flow",
    metaDescription: "Free rental cash flow calculator. Rent minus vacancy, mortgage, taxes, insurance, repairs, capex and management to find your real monthly cash flow.",
    calcInputs: [
      currencyField("monthlyRent", "Monthly Rent", { default: 2200, max: 10000000, step: 25 }),
      percentField("vacancyPercent", "Vacancy Rate", { default: 5, max: 100, step: 0.5 }),
      currencyField("loanAmount", "Loan Amount", { default: 240000, max: 1000000000, step: 1000 }),
      percentField("interestRatePercent", "Interest Rate", { default: 7, max: 30, step: 0.05 }),
      numberField("loanYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      currencyField("monthlyPropertyTax", "Monthly Property Tax", { default: 250, max: 1000000, step: 10 }),
      currencyField("monthlyInsurance", "Monthly Insurance", { default: 110, max: 1000000, step: 10 }),
      currencyField("monthlyHoaAndUtilities", "Monthly HOA & Owner-Paid Utilities", { default: 0, max: 1000000, step: 10 }),
      percentField("repairsPercent", "Repairs (% of Rent)", { default: 5, max: 100, step: 0.5 }),
      percentField("capexPercent", "Capital Expenses (% of Rent)", { default: 5, max: 100, step: 0.5 }),
      percentField("managementPercent", "Property Management (% of Rent)", { default: 8, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Monthly Cash Flow", format: "currency" },
    calcResults: [
      { key: "monthlyCashFlow", label: "Monthly Cash Flow", format: "currency", highlight: true },
      { key: "yearlyCashFlow", label: "Yearly Cash Flow", format: "currency" },
      { key: "monthlyMortgagePayment", label: "Monthly Mortgage Payment (P&I)", format: "currency" },
      { key: "monthlyOperatingExpenses", label: "Monthly Operating Expenses", format: "currency" },
      { key: "expensesShareOfRentPercent", label: "Operating Expenses as % of Rent", format: "percentage" },
    ],
    instructions: "Enter the rent, vacancy rate and your loan details, then the fixed monthly costs (tax, insurance, HOA, utilities you pay). Repairs, capital expenses (roof, HVAC, appliances) and management are set aside as a percentage of the rent.",
    examples: "Example: $2,200 rent with 5% vacancy brings in $2,090. The $240,000 loan at 7% costs $1,596.73 a month and operating expenses are $756 (34.36% of rent), so cash flow is -$262.73 a month (-$3,152.71 a year).",
    assumptions: "Mortgage payment is principal and interest on a fixed-rate loan. Income tax and depreciation are not included. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why include capital expenses if nothing is broken?", answer: "Roofs, water heaters and HVAC systems wear out. Setting aside 5% to 10% of rent each month spreads those big bills over time so they don't wipe out a year's cash flow." }],
  },
  {
    slug: "rental-property-roi-calculator",
    title: "Rental Property ROI Calculator",
    description: "Measure a rental's first-year return on your cash — not just cash flow, but also the loan principal your tenants pay down and the property's appreciation.",
    metaTitle: "Rental Property ROI Calculator — Total Year-1 Return",
    metaDescription: "Free rental property ROI calculator. Combine cash flow, loan paydown and appreciation to see the total first-year return on the cash you invested.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 300000, max: 1000000000, step: 1000 }),
      currencyField("cashInvested", "Total Cash Invested", { default: 72000, max: 1000000000, step: 1000 }),
      currencyField("loanAmount", "Loan Amount", { default: 240000, max: 1000000000, step: 1000 }),
      percentField("interestRatePercent", "Interest Rate", { default: 7, max: 30, step: 0.05 }),
      numberField("loanYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      currencyField("annualCashFlow", "Annual Cash Flow (After Mortgage)", { default: 3600, max: 100000000, step: 100 }),
      percentField("appreciationPercent", "Expected Appreciation per Year", { default: 3, min: -20, max: 30, step: 0.1 }),
    ],
    calcResult: { label: "Total First-Year ROI", format: "percentage" },
    calcResults: [
      { key: "totalRoiPercent", label: "Total First-Year ROI", format: "percentage", highlight: true },
      { key: "totalReturnYear1", label: "Total Return (Year 1)", format: "currency" },
      { key: "cashFlowReturnPercent", label: "Cash Flow Return Only", format: "percentage" },
      { key: "loanPaydownYear1", label: "Loan Principal Paid Down", format: "currency" },
      { key: "appreciationYear1", label: "Appreciation", format: "currency" },
    ],
    instructions: "Enter the price, the total cash you put in (down payment, closing costs, repairs), your loan, the yearly cash flow after the mortgage and an expected appreciation rate. The tool adds the three sources of return and divides by your cash.",
    examples: "Example: on a $300,000 rental with $72,000 invested, $3,600 of cash flow is a 5% return. Add $2,437.94 of loan paydown and $9,000 of appreciation and the total first-year return is $15,037.94 — 20.89% on your cash.",
    assumptions: "Loan paydown and appreciation are paper gains until you sell or refinance. Tax benefits such as depreciation are not included. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is a 20% ROI on a rental realistic?", answer: "With leverage and steady appreciation it can be in good years, but appreciation isn't guaranteed. Judge a deal mainly on its cash flow and treat appreciation as a bonus." }],
  },
  {
    slug: "cash-on-cash-return-calculator",
    title: "Cash-on-Cash Return Calculator",
    description: "Find the cash-on-cash return on a rental: yearly pre-tax cash flow divided by every dollar you put in — down payment, closing costs and repairs — and how long it takes to get your cash back.",
    metaTitle: "Cash-on-Cash Return Calculator for Rental Property",
    metaDescription: "Free cash-on-cash return calculator. Divide yearly cash flow by your down payment, closing costs and repairs to see your return and payback time.",
    calcInputs: [
      currencyField("annualPreTaxCashFlow", "Annual Pre-Tax Cash Flow", { default: 4800, max: 100000000, step: 100 }),
      currencyField("downPayment", "Down Payment", { default: 60000, max: 1000000000, step: 1000 }),
      currencyField("closingCosts", "Closing Costs", { default: 7500, max: 100000000, step: 100 }),
      currencyField("repairsAndSetup", "Repairs & Setup Costs", { default: 4500, max: 100000000, step: 100 }),
    ],
    calcResult: { label: "Cash-on-Cash Return", format: "percentage" },
    calcResults: [
      { key: "cashOnCashReturnPercent", label: "Cash-on-Cash Return", format: "percentage", highlight: true },
      { key: "totalCashInvested", label: "Total Cash Invested", format: "currency" },
      { key: "monthlyCashFlow", label: "Monthly Cash Flow", format: "currency" },
      { key: "yearsToRecoverCash", label: "Years to Get Your Cash Back (0 = Never)", format: "number" },
    ],
    instructions: "Enter the property's yearly cash flow after all expenses and the mortgage, then the cash you paid to buy it: down payment, closing costs and any repairs or furnishing before the first tenant.",
    examples: "Example: $4,800 a year of cash flow ($400 a month) on $72,000 of cash invested ($60,000 down, $7,500 closing, $4,500 repairs) is a 6.67% cash-on-cash return. At that pace you'd get your cash back in 15 years.",
    assumptions: "Uses pre-tax cash flow and ignores appreciation and loan paydown. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is a good cash-on-cash return?", answer: "Many rental investors aim for 8% to 12%. In expensive markets 4% to 6% is common, with investors relying more on appreciation." }],
  },
  {
    slug: "net-operating-income-calculator",
    title: "Net Operating Income (NOI) Calculator",
    description: "Calculate a property's net operating income: rental and other income after vacancy, minus operating expenses like taxes, insurance, repairs and management — before any mortgage payment.",
    metaTitle: "NOI Calculator — Net Operating Income for Property",
    metaDescription: "Free net operating income calculator. Take rent and other income, subtract vacancy and operating expenses, and get NOI and NOI margin for any property.",
    calcInputs: [
      currencyField("grossRentalIncome", "Gross Rental Income (Yearly)", { default: 96000, max: 10000000000, step: 1000 }),
      currencyField("otherIncome", "Other Income (Yearly)", { default: 3000, max: 1000000000, step: 100 }),
      percentField("vacancyPercent", "Vacancy & Credit Loss", { default: 6, max: 100, step: 0.5 }),
      currencyField("propertyTaxes", "Property Taxes", { default: 9000, max: 1000000000, step: 100 }),
      currencyField("insurance", "Insurance", { default: 3500, max: 1000000000, step: 100 }),
      currencyField("repairsMaintenance", "Repairs & Maintenance", { default: 6000, max: 1000000000, step: 100 }),
      currencyField("management", "Property Management", { default: 7500, max: 1000000000, step: 100 }),
      currencyField("utilitiesAndOther", "Utilities & Other Expenses", { default: 4000, max: 1000000000, step: 100 }),
    ],
    calcResult: { label: "Net Operating Income", format: "currency" },
    calcResults: [
      { key: "netOperatingIncome", label: "Net Operating Income (NOI)", format: "currency", highlight: true },
      { key: "effectiveGrossIncome", label: "Effective Gross Income", format: "currency" },
      { key: "totalOperatingExpenses", label: "Total Operating Expenses", format: "currency" },
      { key: "noiMarginPercent", label: "NOI Margin", format: "percentage" },
    ],
    instructions: "Enter the yearly rent the property would earn fully occupied, any other income, and a vacancy and credit-loss rate. Then enter each yearly operating expense. Don't include mortgage payments, depreciation or big one-off improvements — they aren't operating expenses.",
    examples: "Example: $96,000 of rent less 6% vacancy plus $3,000 of other income is $93,240 of effective income. Subtracting $30,000 of expenses gives NOI of $63,240 — a 67.82% NOI margin.",
    assumptions: "Vacancy is applied to rental income only. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why doesn't NOI include the mortgage?", answer: "NOI measures how the property itself performs, whatever way it's financed. That's why it's used for cap rates and valuations. Subtract the mortgage from NOI to get cash flow." }],
  },
  {
    slug: "operating-expense-ratio-calculator",
    title: "Operating Expense Ratio Calculator",
    description: "Find a property's operating expense ratio (OER) — operating expenses as a share of effective gross income — and how much you'd need to cut to reach a target ratio.",
    metaTitle: "Operating Expense Ratio (OER) Calculator — Property",
    metaDescription: "Free operating expense ratio calculator. See what share of a property's income goes to operating expenses and the savings needed to hit a target OER.",
    calcInputs: [
      currencyField("effectiveGrossIncome", "Effective Gross Income (Yearly)", { default: 90000, max: 10000000000, step: 1000 }),
      currencyField("operatingExpenses", "Operating Expenses (Yearly)", { default: 36000, max: 10000000000, step: 500 }),
      percentField("targetRatioPercent", "Target Expense Ratio", { default: 35, max: 100, step: 1 }),
    ],
    calcResult: { label: "Operating Expense Ratio", format: "percentage" },
    calcResults: [
      { key: "operatingExpenseRatioPercent", label: "Operating Expense Ratio", format: "percentage", highlight: true },
      { key: "netOperatingIncome", label: "Net Operating Income", format: "currency" },
      { key: "expensesAtTargetRatio", label: "Expenses at Target Ratio", format: "currency" },
      { key: "savingsNeededForTarget", label: "Yearly Savings Needed for Target", format: "currency" },
    ],
    instructions: "Enter the property's effective gross income (rent after vacancy plus other income), its yearly operating expenses, and the expense ratio you'd like to reach.",
    examples: "Example: $36,000 of expenses on $90,000 of income is a 40% operating expense ratio, leaving $54,000 of NOI. To reach 35% you'd need expenses of $31,500 — $4,500 a year less.",
    assumptions: "Operating expenses exclude mortgage payments, depreciation and capital improvements. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is a normal operating expense ratio?", answer: "Residential rentals often run 35% to 45%, and older buildings or those where the owner pays utilities run higher. Compare against similar properties in your area." }],
  },
  {
    slug: "vacancy-rate-calculator",
    title: "Vacancy Rate Calculator",
    description: "Calculate the vacancy rate and occupancy rate of a rental property or building from the number of units and the total days units sat empty.",
    metaTitle: "Vacancy Rate Calculator — Occupancy for Rentals",
    metaDescription: "Free vacancy rate calculator. Enter units and total vacant days to find your vacancy rate, occupancy rate and the average days each unit sat empty.",
    calcInputs: [
      numberField("units", "Number of Units", { default: 10, min: 1, max: 100000, step: 1 }),
      numberField("daysInPeriod", "Days in Period", { unit: "days", default: 365, min: 1, max: 3660, step: 1 }),
      numberField("totalVacantUnitDays", "Total Vacant Days (All Units)", { unit: "days", default: 240, min: 0, max: 10000000, step: 1 }),
    ],
    calcResult: { label: "Vacancy Rate", format: "percentage" },
    calcResults: [
      { key: "vacancyRatePercent", label: "Vacancy Rate", format: "percentage", highlight: true },
      { key: "occupancyRatePercent", label: "Occupancy Rate", format: "percentage" },
      { key: "averageVacantDaysPerUnit", label: "Average Vacant Days per Unit", format: "number" },
      { key: "totalUnitDaysAvailable", label: "Total Unit-Days Available", format: "number" },
    ],
    instructions: "Enter how many units you have, the length of the period (365 for a year), and the total number of days units were empty — add up the empty days of every unit.",
    examples: "Example: 10 units over 365 days gives 3,650 unit-days. With 240 vacant days in total the vacancy rate is 6.58% and occupancy is 93.42% — each unit sat empty 24 days on average.",
    assumptions: "Measures physical vacancy by days; it doesn't count tenants who don't pay (economic vacancy). " + GENERAL_DISCLAIMER,
    faq: [{ question: "How do I lower my vacancy rate?", answer: "Price rent at market, start marketing before the current tenant leaves, keep units in good shape, and renew good tenants with fair increases — turnover is the biggest source of vacancy." }],
  },
  {
    slug: "rental-vacancy-loss-calculator",
    title: "Rental Vacancy Loss Calculator",
    description: "See what vacancy really costs a landlord each year: the rent lost while a unit sits empty plus the cleaning, repairs and advertising every tenant turnover brings.",
    metaTitle: "Rental Vacancy Loss Calculator — Cost of Turnover",
    metaDescription: "Free rental vacancy loss calculator. Add lost rent and turnover costs to see what empty months really cost you each year, and your effective vacancy rate.",
    calcInputs: [
      currencyField("monthlyRent", "Monthly Rent", { default: 1800, max: 10000000, step: 25 }),
      numberField("turnoversPerYear", "Tenant Turnovers per Year", { default: 1, min: 0, max: 50, step: 0.5 }),
      numberField("vacantDaysPerTurnover", "Vacant Days per Turnover", { unit: "days", default: 30, min: 0, max: 365, step: 1 }),
      currencyField("turnoverCostEach", "Cost per Turnover (Cleaning, Repairs, Ads)", { default: 1200, max: 10000000, step: 50 }),
    ],
    calcResult: { label: "Total Vacancy Cost per Year", format: "currency" },
    calcResults: [
      { key: "totalVacancyCostPerYear", label: "Total Vacancy Cost per Year", format: "currency", highlight: true },
      { key: "rentLostPerYear", label: "Rent Lost per Year", format: "currency" },
      { key: "turnoverCostsPerYear", label: "Turnover Costs per Year", format: "currency" },
      { key: "effectiveVacancyRatePercent", label: "Cost as % of Yearly Rent", format: "percentage" },
    ],
    instructions: "Enter the monthly rent, how many times a year a tenant moves out, how many days the unit sits empty each time, and what each turnover costs you to clean, repair and advertise.",
    examples: "Example: one 30-day vacancy on an $1,800 rental loses $1,775.34 of rent. Add $1,200 of turnover costs and the total is $2,975.34 a year — 13.77% of the year's rent.",
    assumptions: "Daily rent is monthly rent × 12 ÷ 365. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is it worth lowering rent to keep a tenant?", answer: "Often, yes. If a turnover costs about a month and a half of rent, a small discount to renew a good tenant is usually cheaper than finding a new one." }],
  },
  {
    slug: "property-management-fee-calculator",
    title: "Property Management Fee Calculator",
    description: "Estimate what a property manager will really cost per year — the monthly management percentage plus leasing fees for new tenants and other charges — and the effective rate of your rent.",
    metaTitle: "Property Management Fee Calculator — Yearly Cost",
    metaDescription: "Free property management fee calculator. Add the monthly fee, leasing fees and other charges to see a manager's full yearly cost and effective rate.",
    calcInputs: [
      currencyField("monthlyRent", "Monthly Rent", { default: 2000, max: 10000000, step: 25 }),
      percentField("managementFeePercent", "Monthly Management Fee", { default: 9, max: 50, step: 0.5 }),
      percentField("leasingFeePercentOfMonth", "Leasing Fee (% of One Month's Rent)", { default: 50, max: 200, step: 5 }),
      numberField("newLeasesPerYear", "New Leases per Year", { default: 1, min: 0, max: 50, step: 0.5 }),
      currencyField("otherFeesPerYear", "Other Fees per Year (Renewals, Inspections)", { default: 200, max: 1000000, step: 25 }),
    ],
    calcResult: { label: "Total Management Cost per Year", format: "currency" },
    calcResults: [
      { key: "totalManagementCostPerYear", label: "Total Management Cost per Year", format: "currency", highlight: true },
      { key: "monthlyManagementFee", label: "Monthly Management Fee", format: "currency" },
      { key: "leasingFeesPerYear", label: "Leasing Fees per Year", format: "currency" },
      { key: "effectiveRateOfRentPercent", label: "Effective Rate (% of Yearly Rent)", format: "percentage" },
    ],
    instructions: "Enter the monthly rent and the manager's fee structure from their agreement: the monthly percentage, the leasing fee for placing a new tenant, how often you expect a new lease, and any other yearly fees.",
    examples: "Example: 9% of $2,000 rent is $180 a month. Add a leasing fee of half a month's rent ($1,000) once a year and $200 of other fees, and management costs $3,360 a year — an effective 14% of rent.",
    assumptions: "Assumes the fee is charged on the full rent every month. Some managers charge only on rent collected. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What do property managers usually charge?", answer: "Commonly 8% to 12% of monthly rent, plus a leasing fee of 50% to 100% of one month's rent for each new tenant. Read the agreement for renewal, maintenance markup and eviction fees." }],
  },
  {
    slug: "rental-expense-calculator",
    title: "Rental Expense Calculator",
    description: "Build a yearly expense budget for a rental property — taxes, insurance, repairs, capital reserves, management and utilities — and see what share of the rent it takes.",
    metaTitle: "Rental Expense Calculator — Yearly Landlord Budget",
    metaDescription: "Free rental expense calculator. Total a rental's yearly taxes, insurance, repairs, reserves and management, and see the share of rent they take.",
    calcInputs: [
      currencyField("propertyTax", "Property Tax", { default: 3600, max: 100000000, step: 100 }),
      currencyField("insurance", "Insurance", { default: 1500, max: 100000000, step: 100 }),
      currencyField("repairs", "Repairs & Maintenance", { default: 1800, max: 100000000, step: 100 }),
      currencyField("capitalReserves", "Capital Reserves (Roof, HVAC, Appliances)", { default: 1800, max: 100000000, step: 100 }),
      currencyField("management", "Property Management", { default: 2200, max: 100000000, step: 100 }),
      currencyField("utilitiesHoaOther", "Utilities, HOA & Other", { default: 900, max: 100000000, step: 100 }),
      currencyField("annualRent", "Yearly Rent", { default: 26400, max: 1000000000, step: 100 }),
    ],
    calcResult: { label: "Total Yearly Expenses", format: "currency" },
    calcResults: [
      { key: "totalYearlyExpenses", label: "Total Yearly Expenses", format: "currency", highlight: true },
      { key: "monthlyExpenses", label: "Monthly Expenses", format: "currency" },
      { key: "expensesShareOfRentPercent", label: "Expenses as % of Rent", format: "percentage" },
      { key: "incomeLeftBeforeMortgage", label: "Rent Left Before Mortgage", format: "currency" },
    ],
    instructions: "Enter each yearly expense for the rental and the yearly rent. The tool totals the budget, shows it per month, and shows what's left to cover the mortgage.",
    examples: "Example: $11,800 of yearly expenses ($983.33 a month) on $26,400 of rent is 44.7% of rent, leaving $14,600 a year for the mortgage and cash flow.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is the 50% rule for rentals?", answer: "A rule of thumb that operating expenses (not the mortgage) will take about half of the rent over time. It's a quick screen — a real budget like this one is more accurate." }],
  },
  {
    slug: "rental-property-profit-calculator",
    title: "Rental Property Profit Calculator",
    description: "See a rental's taxable profit or loss for the year — rent minus operating costs, first-year mortgage interest and depreciation — next to the actual cash it puts in your pocket.",
    metaTitle: "Rental Property Profit Calculator — Taxable Profit",
    metaDescription: "Free rental property profit calculator. Subtract expenses, mortgage interest and 27.5-year depreciation to see taxable rental profit vs real cash flow.",
    calcInputs: [
      currencyField("annualRent", "Yearly Rent Collected", { default: 30000, max: 1000000000, step: 100 }),
      currencyField("operatingExpenses", "Yearly Operating Expenses", { default: 10000, max: 1000000000, step: 100 }),
      currencyField("loanAmount", "Loan Amount", { default: 240000, max: 1000000000, step: 1000 }),
      percentField("interestRatePercent", "Interest Rate", { default: 7, max: 30, step: 0.05 }),
      numberField("loanYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      currencyField("buildingValue", "Building Value (Excluding Land)", { default: 240000, max: 1000000000, step: 1000 }),
    ],
    calcResult: { label: "Taxable Rental Profit", format: "currency" },
    calcResults: [
      { key: "taxableRentalProfit", label: "Taxable Rental Profit (Loss)", format: "currency", highlight: true },
      { key: "cashFlowAfterMortgage", label: "Cash Flow After Mortgage", format: "currency" },
      { key: "mortgageInterestYear1", label: "Mortgage Interest (Year 1)", format: "currency" },
      { key: "depreciationDeduction", label: "Depreciation Deduction", format: "currency" },
    ],
    instructions: "Enter the yearly rent, operating expenses and loan details, and the value of the building without the land (land can't be depreciated). Only the interest part of the mortgage is deductible; the building is depreciated over 27.5 years.",
    examples: "Example: $30,000 of rent less $10,000 of expenses, $16,722.77 of first-year interest and $8,727.27 of depreciation is a taxable loss of -$5,450.04 — even though the property puts $839.29 of cash in your pocket.",
    assumptions: "Uses full-year straight-line depreciation over 27.5 years. Whether a rental loss can reduce other income depends on passive-activity rules. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How can a rental show a loss but still make money?", answer: "Depreciation is a deduction you don't pay cash for. It can turn positive cash flow into a tax loss — though depreciation is recaptured and taxed when you sell." }],
  },
  {
    slug: "rental-property-break-even-calculator",
    title: "Rental Property Break-Even Calculator",
    description: "Find a rental's break-even occupancy — the share of units that must be rented to cover operating expenses and the mortgage — and the lowest rent per unit that still breaks even.",
    metaTitle: "Rental Break-Even Calculator — Occupancy & Rent",
    metaDescription: "Free rental property break-even calculator. Find the occupancy and rent per unit needed to cover operating expenses and debt service each year.",
    calcInputs: [
      currencyField("grossPotentialRent", "Gross Potential Rent (Yearly, Fully Rented)", { default: 48000, max: 10000000000, step: 500 }),
      currencyField("operatingExpenses", "Yearly Operating Expenses", { default: 16000, max: 10000000000, step: 500 }),
      currencyField("annualDebtService", "Yearly Mortgage Payments", { default: 22000, max: 10000000000, step: 500 }),
      numberField("units", "Number of Units", { default: 2, min: 1, max: 100000, step: 1 }),
    ],
    calcResult: { label: "Break-Even Occupancy", format: "percentage" },
    calcResults: [
      { key: "breakEvenOccupancyPercent", label: "Break-Even Occupancy", format: "percentage", highlight: true },
      { key: "breakEvenRentPerUnitPerMonth", label: "Break-Even Rent per Unit (Monthly)", format: "currency" },
      { key: "cushionAtFullOccupancy", label: "Cash Cushion at Full Occupancy (Yearly)", format: "currency" },
    ],
    instructions: "Enter the rent the property would earn fully rented for a year, its yearly operating expenses and mortgage payments, and the number of units.",
    examples: "Example: $16,000 of expenses and $22,000 of mortgage payments need 79.17% of the $48,000 potential rent. Across 2 units that's $1,583.33 per unit a month; fully rented, you'd have a $10,000 cushion.",
    assumptions: "Break-even here means zero cash flow before income tax. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What break-even occupancy is safe?", answer: "Lenders and investors often like to see 85% or lower, so the property still covers its bills if a unit sits empty for a while." }],
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
