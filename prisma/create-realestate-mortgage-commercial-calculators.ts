// One-time (but safe to re-run) batch setup script: creates the 9 tools
// of the "Real Estate Calculators" sub-batch I (Real Estate Mortgages & Commercial Property). Part of the
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
// See src/lib/calc-engine-realestate-mortgage-commercial.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-realestate-mortgage-commercial-calculators.ts
// or
//   npm run db:create-realestate-mortgage-commercial-calculators

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
    slug: "real-estate-mortgage-calculator",
    title: "Real Estate Mortgage Calculator",
    description: "Calculate a home's full monthly mortgage payment — principal, interest, property tax and insurance — with PMI added automatically under 20% down, and the month PMI drops off.",
    metaTitle: "Real Estate Mortgage Calculator — PITI with PMI",
    metaDescription: "Free real estate mortgage calculator. Get the full PITI payment with automatic PMI under 20% down, when PMI ends at 78% LTV, and total PMI paid.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 425000, max: 10000000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 0.5 }),
      percentField("interestRatePercent", "Interest Rate", { default: 6.5, max: 30, step: 0.05 }),
      numberField("loanTermYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      percentField("propertyTaxRatePercent", "Property Tax Rate", { default: 1.1, max: 10, step: 0.05 }),
      currencyField("annualInsurance", "Yearly Homeowners Insurance", { default: 1800, max: 10000000, step: 50 }),
      percentField("pmiRatePercent", "PMI Rate (Yearly)", { default: 0.6, max: 5, step: 0.05 }),
    ],
    calcResult: { label: "Total Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalMonthlyPayment", label: "Total Monthly Payment", format: "currency", highlight: true },
      { key: "monthlyPrincipalAndInterest", label: "Principal & Interest", format: "currency" },
      { key: "monthlyTaxesAndInsurance", label: "Property Tax & Insurance", format: "currency" },
      { key: "monthlyPmi", label: "PMI", format: "currency" },
      { key: "monthsUntilPmiDrops", label: "Months Until PMI Ends", format: "number" },
      { key: "totalPmiPaid", label: "Total PMI Paid", format: "currency" },
    ],
    instructions: "Enter the price, down payment, rate and term, the property tax rate and yearly insurance. With less than 20% down, PMI is added until the scheduled balance reaches 78% of the original price, when lenders must cancel it.",
    examples: "Example: 10% down on a $425,000 home at 6.5% is $2,417.66 of principal and interest, $539.58 of tax and insurance and $191.25 of PMI — $3,148.49 a month. PMI ends after 109 months, costing $20,846.25 in total.",
    assumptions: "You can ask to cancel PMI earlier at 80% LTV, or sooner if the home has appreciated (with a new appraisal). FHA mortgage insurance works differently. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How can I get rid of PMI sooner?", answer: "Make extra principal payments to reach 80% of the original value and ask your lender to cancel it, or request a new appraisal if your home's value has risen." }],
  },
  {
    slug: "investment-property-mortgage-calculator",
    title: "Investment Property Mortgage Calculator",
    description: "Price a mortgage on an investment property — the higher investor rate, the extra it costs versus an owner-occupied loan, the full PITIA payment and the rent a DSCR lender would want.",
    metaTitle: "Investment Property Mortgage Calculator — Rates",
    metaDescription: "Free investment property mortgage calculator. See the investor rate premium, what it costs each month, the full PITIA payment and rent needed at 1.25 DSCR.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 350000, max: 10000000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 25, max: 100, step: 1 }),
      percentField("ownerOccupiedRatePercent", "Owner-Occupied Rate (For Comparison)", { default: 6.5, max: 30, step: 0.05 }),
      percentField("investorRatePremiumPercent", "Investor Rate Premium", { default: 0.75, max: 5, step: 0.125 }),
      numberField("loanTermYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      currencyField("monthlyTaxesInsuranceHoa", "Monthly Taxes, Insurance & HOA", { default: 550, max: 10000000, step: 10 }),
    ],
    calcResult: { label: "Monthly PITIA", format: "currency" },
    calcResults: [
      { key: "monthlyPitia", label: "Monthly PITIA", format: "currency", highlight: true },
      { key: "monthlyPrincipalAndInterest", label: "Principal & Interest", format: "currency" },
      { key: "investorRate", label: "Investor Rate", format: "percentage" },
      { key: "extraCostPerMonthVsOwnerRate", label: "Extra Cost vs Owner-Occupied Rate", format: "currency" },
      { key: "rentNeededForDscr125", label: "Rent Needed for 1.25 DSCR", format: "currency" },
      { key: "downPaymentAmount", label: "Down Payment", format: "currency" },
    ],
    instructions: "Enter the price and down payment — most lenders want 15% to 25% down on investment property — the owner-occupied rate, the investor premium you're quoted, and the monthly taxes, insurance and HOA.",
    examples: "Example: 25% down ($87,500) on a $350,000 rental at 7.25% (6.5% plus a 0.75 premium) is $1,790.71 a month, $131.53 more than at the owner rate. With $550 of taxes and insurance, PITIA is $2,340.71; a DSCR lender wanting rent at 125% of that needs $2,925.89.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why are investment property rates higher?", answer: "Lenders see more risk — owners stop paying on rentals before their own homes — so rates typically run 0.5 to 1 point higher, with bigger down payments required." }],
  },
  {
    slug: "rental-property-mortgage-calculator",
    title: "Rental Property Mortgage Calculator",
    description: "See how a lender counts a rental's income toward your mortgage — typically 75% of the rent — whether it covers the payment, and the rent coverage ratio.",
    metaTitle: "Rental Property Mortgage Calculator — Rent Income",
    metaDescription: "Free rental property mortgage calculator. See the payment, the 75% of rent lenders count as income, net rental income for qualifying and rent coverage.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 320000, max: 10000000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 20, max: 100, step: 1 }),
      percentField("interestRatePercent", "Interest Rate", { default: 7.25, max: 30, step: 0.05 }),
      numberField("loanTermYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      currencyField("monthlyTaxesAndInsurance", "Monthly Taxes & Insurance", { default: 480, max: 10000000, step: 10 }),
      currencyField("expectedMonthlyRent", "Expected Monthly Rent", { default: 2600, max: 10000000, step: 25 }),
      percentField("rentCountedPercent", "Share of Rent the Lender Counts", { default: 75, max: 100, step: 5 }),
    ],
    calcResult: { label: "Net Rental Income for Qualifying", format: "currency" },
    calcResults: [
      { key: "netRentalIncomeForQualifying", label: "Net Rental Income for Qualifying", format: "currency", highlight: true },
      { key: "monthlyPitia", label: "Monthly PITIA", format: "currency" },
      { key: "rentCountedAsIncome", label: "Rent Counted as Income", format: "currency" },
      { key: "rentCoverageRatio", label: "Rent Coverage Ratio (Rent ÷ PITIA)", format: "number" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
    ],
    instructions: "Enter the price, down payment and loan terms, monthly taxes and insurance, and the market rent (from a lease or the appraiser's rent schedule). Conventional lenders usually count 75% of rent to allow for vacancy and upkeep.",
    examples: "Example: a $256,000 loan on a $320,000 rental has a PITIA of $2,226.37. The lender counts 75% of $2,600 rent — $1,950 — so the property adds -$276.37 a month to your debts, even though rent covers the payment 1.17 times.",
    assumptions: "A negative figure is added to your monthly debts when the lender works out your debt-to-income ratio. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why do lenders only count 75% of rent?", answer: "The other 25% allows for vacancy, repairs and management. Fannie Mae and Freddie Mac guidelines use this rule for rental income on conventional loans." }],
  },
  {
    slug: "commercial-property-loan-calculator",
    title: "Commercial Property Loan Calculator",
    description: "Size a commercial real estate loan the way lenders do — the lower of the loan-to-value limit and the debt service coverage (DSCR) limit — with the payment and equity required.",
    metaTitle: "Commercial Property Loan Calculator — LTV & DSCR",
    metaDescription: "Free commercial property loan calculator. Find the max loan as the lower of the LTV and DSCR limits, the monthly payment and the equity you need.",
    calcInputs: [
      currencyField("propertyValue", "Property Value", { default: 2000000, max: 100000000000, step: 10000 }),
      currencyField("netOperatingIncome", "Net Operating Income (Yearly)", { default: 150000, max: 10000000000, step: 1000 }),
      percentField("maxLtvPercent", "Maximum LTV", { default: 75, max: 100, step: 1 }),
      numberField("minDscr", "Minimum DSCR", { default: 1.25, min: 0.5, max: 5, step: 0.05 }),
      percentField("interestRatePercent", "Interest Rate", { default: 7, max: 30, step: 0.05 }),
      numberField("amortizationYears", "Amortization", { unit: "years", default: 25, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Maximum Loan", format: "currency" },
    calcResults: [
      { key: "maxLoanAmount", label: "Maximum Loan", format: "currency", highlight: true },
      { key: "loanLimitByLtv", label: "Limit by LTV", format: "currency" },
      { key: "loanLimitByDscr", label: "Limit by DSCR", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "equityRequired", label: "Equity Required", format: "currency" },
      { key: "resultingDscr", label: "Resulting DSCR", format: "number" },
    ],
    instructions: "Enter the property's value and yearly NOI, and the lender's terms: maximum LTV, minimum DSCR, rate and amortization. Commercial loans often amortize over 20 to 30 years with a 5 to 10 year term.",
    examples: "Example: 75% of a $2,000,000 property allows $1,500,000, but $150,000 of NOI at a 1.25 DSCR supports only $1,414,869.03 at 7% over 25 years. That's the loan — $10,000 a month — leaving $585,130.97 of equity to bring.",
    assumptions: "Closing costs and reserves are extra. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why is my commercial loan smaller than the LTV allows?", answer: "When rates are high, the DSCR test usually binds first — the property's income can't cover a bigger payment with the cushion the lender wants." }],
  },
  {
    slug: "commercial-real-estate-calculator",
    title: "Commercial Real Estate Calculator",
    description: "Analyze a commercial building from its rent per square foot — effective income after vacancy, net operating income, cap rate, and price and NOI per square foot.",
    metaTitle: "Commercial Real Estate Calculator — NOI & Cap Rate",
    metaDescription: "Free commercial real estate calculator. From rent per square foot, vacancy and expenses, get NOI, cap rate, price per square foot and NOI per square foot.",
    calcInputs: [
      numberField("rentableSquareFeet", "Rentable Area", { unit: "sq ft", default: 12000, min: 0, max: 100000000, step: 100 }),
      currencyField("annualRentPerSqft", "Yearly Rent per Sq Ft", { default: 24, max: 100000, step: 0.5 }),
      percentField("vacancyPercent", "Vacancy Rate", { default: 8, max: 100, step: 0.5 }),
      currencyField("operatingExpensesPerSqft", "Yearly Operating Expenses per Sq Ft", { default: 8, max: 100000, step: 0.25 }),
      currencyField("purchasePrice", "Purchase Price", { default: 2400000, max: 100000000000, step: 10000 }),
    ],
    calcResult: { label: "Net Operating Income", format: "currency" },
    calcResults: [
      { key: "netOperatingIncome", label: "Net Operating Income", format: "currency", highlight: true },
      { key: "capRatePercent", label: "Cap Rate", format: "percentage" },
      { key: "effectiveGrossIncome", label: "Effective Gross Income", format: "currency" },
      { key: "pricePerSquareFoot", label: "Price per Sq Ft", format: "currency" },
      { key: "noiPerSquareFoot", label: "NOI per Sq Ft", format: "currency" },
    ],
    instructions: "Enter the rentable area, the yearly rent per square foot, a vacancy rate, operating expenses per square foot that the landlord pays, and the price.",
    examples: "Example: 12,000 sq ft at $24 per foot with 8% vacancy brings in $264,960. After $8 per foot of expenses, NOI is $168,960 ($14.08 per foot) — a 7.04% cap rate at $200 per square foot.",
    assumptions: "Commercial rent is often quoted per square foot per year. Check whether leases are gross, modified gross or NNN — under NNN, tenants cover most expenses. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why value commercial property per square foot?", answer: "Buildings differ in size and layout, so price and NOI per square foot let you compare them fairly with recent sales and rents nearby." }],
  },
  {
    slug: "commercial-cap-rate-calculator",
    title: "Commercial Cap Rate Calculator",
    description: "Calculate a commercial property's cap rate, compare it with the market cap rate to see if the price is fair, and measure its spread over the 10-year Treasury yield.",
    metaTitle: "Commercial Cap Rate Calculator — vs Market & 10-Yr",
    metaDescription: "Free commercial cap rate calculator. Find the cap rate, value at the market cap rate, and the spread over the 10-year Treasury to judge the price.",
    calcInputs: [
      currencyField("netOperatingIncome", "Net Operating Income (Yearly)", { default: 180000, max: 10000000000, step: 1000 }),
      currencyField("purchasePrice", "Purchase Price", { default: 2600000, max: 100000000000, step: 10000 }),
      percentField("marketCapRatePercent", "Market Cap Rate", { default: 7.5, min: 0.5, max: 30, step: 0.05 }),
      percentField("tenYearTreasuryPercent", "10-Year Treasury Yield", { default: 4.2, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "Cap Rate", format: "percentage" },
    calcResults: [
      { key: "capRatePercent", label: "Cap Rate", format: "percentage", highlight: true },
      { key: "valueAtMarketCapRate", label: "Value at Market Cap Rate", format: "currency" },
      { key: "priceAboveOrBelowMarketValue", label: "Price Above (Below) Market Value", format: "currency" },
      { key: "spreadOverTreasuryPercent", label: "Spread over 10-Year Treasury (Points)", format: "percentage" },
    ],
    instructions: "Enter the property's yearly NOI and price, the cap rate similar properties trade at (from a broker or market report) and the current 10-year Treasury yield.",
    examples: "Example: $180,000 of NOI on a $2,600,000 price is a 6.92% cap rate — 2.72 points over a 4.2% Treasury. At the 7.5% market cap rate the property is worth $2,400,000, so the price is $200,000 too high.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why compare cap rates with the 10-year Treasury?", answer: "Treasuries are the low-risk alternative. The spread is the extra yield you get for owning property. A thin spread means you're not paid much for the risk and effort." }],
  },
  {
    slug: "commercial-property-roi-calculator",
    title: "Commercial Property ROI Calculator",
    description: "Project the return on a commercial property held for several years, with yearly rent escalations, financing and a sale at an exit cap rate — total profit, ROI and annualized return.",
    metaTitle: "Commercial Property ROI Calculator — Hold & Sell",
    metaDescription: "Free commercial property ROI calculator. Project cash flow with rent escalations, sell at an exit cap rate, and see total profit and annualized ROI.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 2000000, max: 100000000000, step: 10000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 30, max: 100, step: 1 }),
      percentField("closingCostPercent", "Closing Costs", { default: 2, max: 10, step: 0.25 }),
      percentField("interestRatePercent", "Interest Rate", { default: 7, max: 30, step: 0.05 }),
      numberField("amortizationYears", "Amortization", { unit: "years", default: 25, min: 1, max: 40, step: 1 }),
      currencyField("firstYearNoi", "First-Year NOI", { default: 150000, max: 10000000000, step: 1000 }),
      percentField("annualRentEscalationPercent", "Yearly Rent Escalation", { default: 3, min: -10, max: 20, step: 0.25 }),
      numberField("holdYears", "Holding Period", { unit: "years", default: 7, min: 1, max: 30, step: 1 }),
      percentField("exitCapRatePercent", "Exit Cap Rate", { default: 7.5, min: 0.5, max: 30, step: 0.05 }),
      percentField("sellingCostPercent", "Selling Costs", { default: 3, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Annualized ROI", format: "percentage" },
    calcResults: [
      { key: "annualizedRoiPercent", label: "Annualized ROI", format: "percentage", highlight: true },
      { key: "totalProfit", label: "Total Profit", format: "currency" },
      { key: "totalRoiPercent", label: "Total ROI", format: "percentage" },
      { key: "salePrice", label: "Sale Price at Exit Cap Rate", format: "currency" },
      { key: "cumulativeCashFlow", label: "Cash Flow Collected", format: "currency" },
      { key: "cashInvested", label: "Cash Invested", format: "currency" },
    ],
    instructions: "Enter the price, down payment, closing costs and loan, the first year's NOI and yearly rent escalations, how long you'll hold, and the cap rate you expect at sale. The sale price is the next year's NOI divided by the exit cap rate.",
    examples: "Example: $640,000 invested in a $2,000,000 property with 3% escalations collects $318,196.99 of cash flow over 7 years, then sells for $2,459,747.73 at a 7.5% cap. Profit is $850,800.67 — 132.94% in total, or 12.84% a year.",
    assumptions: "Annualized ROI treats all money as returned at the end, so it's slightly below the true IRR. Returns are before tax. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why use an exit cap rate higher than today's?", answer: "Buildings age and markets change, so investors often assume a cap rate 0.25 to 0.5 points higher at sale to stay cautious." }],
  },
  {
    slug: "commercial-property-cash-flow-calculator",
    title: "Commercial Property Cash Flow Calculator",
    description: "Work out a commercial property's cash flow under a triple-net (NNN) lease, where tenants reimburse taxes, insurance and common-area costs, or a gross lease where you pay them.",
    metaTitle: "Commercial Cash Flow Calculator — NNN vs Gross",
    metaDescription: "Free commercial property cash flow calculator. Compare NNN and gross leases: tenant reimbursements, NOI, cash flow after debt service and DSCR.",
    calcInputs: [
      currencyField("annualBaseRent", "Yearly Base Rent", { default: 240000, max: 10000000000, step: 1000 }),
      dropdownField("leaseType", "Lease Type", 1, [
        { label: "Triple net (NNN) — tenants reimburse taxes, insurance & CAM", value: 1 },
        { label: "Gross — landlord pays them", value: 2 },
      ]),
      currencyField("propertyTaxesInsuranceCam", "Yearly Taxes, Insurance & CAM", { default: 60000, max: 10000000000, step: 500 }),
      currencyField("nonRecoverableExpenses", "Non-Recoverable Expenses (Reserves, Mgmt)", { default: 12000, max: 10000000000, step: 500 }),
      percentField("vacancyPercent", "Vacancy Rate", { default: 5, max: 100, step: 0.5 }),
      currencyField("annualDebtService", "Yearly Loan Payments", { default: 130000, max: 10000000000, step: 1000 }),
    ],
    calcResult: { label: "Yearly Cash Flow", format: "currency" },
    calcResults: [
      { key: "annualCashFlow", label: "Yearly Cash Flow", format: "currency", highlight: true },
      { key: "monthlyCashFlow", label: "Monthly Cash Flow", format: "currency" },
      { key: "netOperatingIncome", label: "Net Operating Income", format: "currency" },
      { key: "tenantReimbursements", label: "Tenant Reimbursements", format: "currency" },
      { key: "dscr", label: "DSCR", format: "number" },
    ],
    instructions: "Enter the base rent, choose the lease type, then the yearly taxes, insurance and common-area maintenance (CAM), expenses tenants never reimburse, a vacancy rate and your loan payments. Vacant space doesn't reimburse its share.",
    examples: "Example: $240,000 of base rent under NNN leases at 5% vacancy brings $57,000 of reimbursements toward $60,000 of pass-through costs. After $12,000 of other expenses NOI is $213,000, and after $130,000 of loan payments cash flow is $83,000 ($6,916.67 a month) — a 1.64 DSCR.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why do investors like NNN leases?", answer: "Tenants pay the rising costs of taxes, insurance and maintenance, so the landlord's income is steadier and less work to manage." }],
  },
  {
    slug: "commercial-loan-dscr-calculator",
    title: "Commercial Loan DSCR Calculator",
    description: "Calculate the debt service coverage ratio on a commercial loan and stress-test it — how far NOI can fall before breaching the lender's minimum, and the DSCR if the rate rises at refinance.",
    metaTitle: "Commercial DSCR Calculator — With Stress Tests",
    metaDescription: "Free commercial loan DSCR calculator. Find DSCR, how far NOI can fall before hitting the lender's minimum, and DSCR after a rate increase.",
    calcInputs: [
      currencyField("netOperatingIncome", "Net Operating Income (Yearly)", { default: 175000, max: 10000000000, step: 1000 }),
      currencyField("loanAmount", "Loan Amount", { default: 1500000, max: 100000000000, step: 10000 }),
      percentField("interestRatePercent", "Interest Rate", { default: 7, max: 30, step: 0.05 }),
      numberField("amortizationYears", "Amortization", { unit: "years", default: 25, min: 1, max: 40, step: 1 }),
      numberField("lenderMinDscr", "Lender's Minimum DSCR", { default: 1.25, min: 0.5, max: 5, step: 0.05 }),
      percentField("rateShockPercent", "Rate Increase to Test", { default: 2, max: 10, step: 0.25 }),
    ],
    calcResult: { label: "DSCR", format: "number" },
    calcResults: [
      { key: "dscr", label: "Debt Service Coverage Ratio", format: "number", highlight: true },
      { key: "annualDebtService", label: "Yearly Debt Service", format: "currency" },
      { key: "noiCanFallByPercent", label: "NOI Can Fall Before Breach", format: "percentage" },
      { key: "minimumNoiRequired", label: "Minimum NOI Required", format: "currency" },
      { key: "dscrAfterRateShock", label: "DSCR After Rate Increase", format: "number" },
    ],
    instructions: "Enter the property's yearly NOI, the loan amount, rate and amortization, the lender's minimum DSCR (often 1.20 to 1.35) and a rate increase to test, such as the rate you might face at refinance.",
    examples: "Example: $175,000 of NOI against $127,220.26 of yearly payments on a $1,500,000 loan is a DSCR of 1.38. NOI could fall 9.13% (to $159,025.32) before breaching 1.25, and a 2-point rate rise would drop DSCR to 1.16.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What happens if DSCR falls below the covenant?", answer: "The loan may be in technical default. Lenders can require a cash deposit, sweep excess cash flow, or ask you to pay the loan down until the ratio recovers." }],
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
