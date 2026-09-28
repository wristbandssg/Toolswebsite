// One-time (but safe to re-run) batch setup script: creates the 8 tools
// of the "Real Estate Calculators" sub-batch K (Short-Term & Vacation Rentals). Part of the
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
// See src/lib/calc-engine-realestate-short-term.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-realestate-short-term-calculators.ts
// or
//   npm run db:create-realestate-short-term-calculators

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
    slug: "short-term-rental-calculator",
    title: "Short-Term Rental Calculator",
    description: "Estimate a short-term rental's yearly revenue and net operating income from its nightly rate, occupancy, average stay, cleaning fees, platform fees and monthly running costs.",
    metaTitle: "Short-Term Rental Calculator — Revenue & NOI",
    metaDescription: "Free short-term rental calculator. Estimate yearly revenue and NOI from nightly rate, occupancy, stay length, cleaning fees, platform fees and costs.",
    calcInputs: [
      currencyField("nightlyRate", "Average Nightly Rate", { default: 180, max: 1000000, step: 5 }),
      percentField("occupancyPercent", "Occupancy Rate", { default: 65, max: 100, step: 1 }),
      numberField("averageStayNights", "Average Stay", { unit: "nights", default: 3, min: 1, max: 365, step: 0.5 }),
      currencyField("cleaningFeeCharged", "Cleaning Fee Charged per Stay", { default: 90, max: 100000, step: 5 }),
      currencyField("cleaningCostPerStay", "Your Cleaning Cost per Stay", { default: 75, max: 100000, step: 5 }),
      percentField("platformFeePercent", "Platform Host Fee", { default: 3, max: 30, step: 0.5 }),
      currencyField("monthlyOperatingCosts", "Monthly Operating Costs (Utilities, Supplies, Tax, Insurance)", { default: 900, max: 10000000, step: 25 }),
    ],
    calcResult: { label: "Yearly Net Operating Income", format: "currency" },
    calcResults: [
      { key: "annualNetOperatingIncome", label: "Yearly Net Operating Income", format: "currency", highlight: true },
      { key: "monthlyNetOperatingIncome", label: "Monthly Net Operating Income", format: "currency" },
      { key: "annualGrossRevenue", label: "Yearly Gross Revenue", format: "currency" },
      { key: "nightsBookedPerYear", label: "Nights Booked per Year", format: "number" },
      { key: "revenuePerAvailableNight", label: "Revenue per Available Night", format: "currency" },
    ],
    instructions: "Enter the average nightly rate and occupancy for similar listings nearby (from market data tools or comparable listings), the typical stay, what you charge and pay for cleaning, the platform's host fee and your monthly running costs.",
    examples: "Example: $180 a night at 65% occupancy is 237.25 nights a year. With cleaning fees, gross revenue is $49,822.50 ($136.50 per available night). After platform fees, cleaning and $900 a month of costs, NOI is $31,596.57 — $2,633.05 a month before any mortgage.",
    assumptions: "Lodging taxes are assumed to be collected from guests and passed on. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What occupancy rate is realistic for a short-term rental?", answer: "Many markets average 50% to 70%. Seasonal and rural areas often run lower, and new listings take a few months to build reviews and bookings." }],
  },
  {
    slug: "airbnb-investment-calculator",
    title: "Airbnb Investment Calculator",
    description: "Decide whether to buy a property to host on Airbnb — cash flow, cash-on-cash return and cap rate, with furnishing and setup costs included in your investment.",
    metaTitle: "Airbnb Investment Calculator — Buy to Host",
    metaDescription: "Free Airbnb investment calculator. See cash flow, cash-on-cash return and cap rate for a property bought to host, including furnishing and setup costs.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 400000, max: 10000000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 20, max: 100, step: 1 }),
      percentField("closingCostPercent", "Closing Costs", { default: 3, max: 10, step: 0.25 }),
      currencyField("furnishingCost", "Furnishing & Setup", { default: 25000, max: 100000000, step: 500 }),
      percentField("interestRatePercent", "Interest Rate", { default: 7, max: 30, step: 0.05 }),
      numberField("loanTermYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      currencyField("annualGrossRevenue", "Yearly Booking Revenue", { default: 72000, max: 1000000000, step: 1000 }),
      percentField("operatingExpensePercent", "Operating Costs (% of Revenue)", { default: 40, max: 100, step: 1 }),
      currencyField("annualTaxesAndInsurance", "Yearly Property Tax & Insurance", { default: 7000, max: 100000000, step: 100 }),
    ],
    calcResult: { label: "Cash-on-Cash Return", format: "percentage" },
    calcResults: [
      { key: "cashOnCashReturnPercent", label: "Cash-on-Cash Return", format: "percentage", highlight: true },
      { key: "annualCashFlow", label: "Yearly Cash Flow", format: "currency" },
      { key: "capRatePercent", label: "Cap Rate (Incl. Furnishing)", format: "percentage" },
      { key: "netOperatingIncome", label: "Net Operating Income", format: "currency" },
      { key: "totalCashInvested", label: "Total Cash Invested", format: "currency" },
    ],
    instructions: "Enter the price, down payment, closing and furnishing costs, and loan terms. For income, enter expected yearly bookings and operating costs as a share of revenue — cleaning, platform and management fees, utilities, supplies and repairs often total 35% to 50%.",
    examples: "Example: $117,000 of cash buys and furnishes a $400,000 home. $72,000 of bookings less 40% of costs and $7,000 of tax and insurance leaves $36,200 of NOI (8.52% cap rate). After the mortgage, cash flow is $10,652.38 — a 9.1% cash-on-cash return.",
    assumptions: "Check local short-term rental rules, permits and HOA restrictions before buying — many cities limit or ban non-owner-occupied rentals. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Do I need a special loan for an Airbnb property?", answer: "Second-home loans require that you use the home yourself. For a pure investment, use an investment property loan or a DSCR loan that counts projected short-term rental income." }],
  },
  {
    slug: "airbnb-profit-calculator",
    title: "Airbnb Profit Calculator",
    description: "Work out an Airbnb host's monthly profit and margin from bookings after platform and management fees, cleaning, supplies, utilities, the mortgage or rent, and other costs.",
    metaTitle: "Airbnb Profit Calculator — Monthly Host Profit",
    metaDescription: "Free Airbnb profit calculator. Subtract platform and management fees, cleaning, supplies, utilities and the mortgage from bookings to see monthly profit.",
    calcInputs: [
      currencyField("monthlyBookingRevenue", "Monthly Booking Revenue", { default: 5500, max: 100000000, step: 100 }),
      percentField("platformFeePercent", "Platform Host Fee", { default: 3, max: 30, step: 0.5 }),
      percentField("managementFeePercent", "Co-Host / Management Fee", { default: 20, max: 50, step: 1 }),
      currencyField("cleaningCosts", "Cleaning Costs", { default: 600, max: 10000000, step: 25 }),
      currencyField("suppliesAndUtilities", "Supplies, Utilities & Internet", { default: 450, max: 10000000, step: 25 }),
      currencyField("mortgageOrRent", "Mortgage or Rent", { default: 2300, max: 10000000, step: 50 }),
      currencyField("otherCosts", "Other Costs (Insurance, Repairs, Software)", { default: 250, max: 10000000, step: 25 }),
    ],
    calcResult: { label: "Monthly Profit", format: "currency" },
    calcResults: [
      { key: "monthlyProfit", label: "Monthly Profit", format: "currency", highlight: true },
      { key: "annualProfit", label: "Yearly Profit", format: "currency" },
      { key: "profitMarginPercent", label: "Profit Margin", format: "percentage" },
      { key: "platformAndManagementFees", label: "Platform & Management Fees", format: "currency" },
    ],
    instructions: "Enter a month's booking revenue and each monthly cost. Enter 0 for management if you host yourself. If you rent the place and sublet it (rental arbitrage), enter your rent instead of a mortgage.",
    examples: "Example: $5,500 of bookings minus $1,265 of platform and management fees, $600 of cleaning, $450 of supplies and utilities, a $2,300 mortgage and $250 of other costs leaves $635 a month — $7,620 a year, an 11.55% margin.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How much do Airbnb hosts make?", answer: "It varies hugely by location and season. Many hosts net 10% to 30% of booking revenue after all costs; those paying for full management keep less." }],
  },
  {
    slug: "airbnb-roi-calculator",
    title: "Airbnb ROI Calculator",
    description: "Compare renting a property on Airbnb with renting it long-term — yearly cash flow and return on cash for each, with the extra furnishing money a short-term rental needs.",
    metaTitle: "Airbnb ROI Calculator — Short-Term vs Long-Term",
    metaDescription: "Free Airbnb ROI calculator. Compare short-term and long-term rental cash flow and return on cash for the same property, including furnishing costs.",
    calcInputs: [
      currencyField("cashInvested", "Cash Invested in Property", { default: 90000, max: 10000000000, step: 1000 }),
      currencyField("furnishingCost", "Furnishing (Short-Term Only)", { default: 20000, max: 100000000, step: 500 }),
      currencyField("annualDebtService", "Yearly Mortgage Payments", { default: 22000, max: 1000000000, step: 500 }),
      currencyField("strAnnualRevenue", "Short-Term: Yearly Revenue", { default: 65000, max: 1000000000, step: 1000 }),
      currencyField("strAnnualExpenses", "Short-Term: Yearly Operating Costs", { default: 28000, max: 1000000000, step: 500 }),
      currencyField("ltrMonthlyRent", "Long-Term: Monthly Rent", { default: 2500, max: 10000000, step: 25 }),
      currencyField("ltrAnnualExpenses", "Long-Term: Yearly Operating Costs", { default: 7500, max: 1000000000, step: 250 }),
    ],
    calcResult: { label: "Extra Cash Flow from Short-Term", format: "currency" },
    calcResults: [
      { key: "extraCashFlowFromShortTerm", label: "Extra Yearly Cash Flow from Short-Term", format: "currency", highlight: true },
      { key: "shortTermAnnualCashFlow", label: "Short-Term Yearly Cash Flow", format: "currency" },
      { key: "longTermAnnualCashFlow", label: "Long-Term Yearly Cash Flow", format: "currency" },
      { key: "shortTermRoiPercent", label: "Short-Term Return on Cash", format: "percentage" },
      { key: "longTermRoiPercent", label: "Long-Term Return on Cash", format: "percentage" },
    ],
    instructions: "Enter the cash you have in the property, the furnishing a short-term rental needs, and your mortgage payments. Then enter the revenue and costs for each strategy — short-term costs include cleaning, supplies, utilities and platform fees.",
    examples: "Example: as a short-term rental the property cash flows $15,000 a year — 13.64% on $110,000 including furnishing. Rented long-term at $2,500 a month, it makes $500 (0.56%). Short-term earns $14,500 more a year.",
    assumptions: "Short-term rentals take far more work, face more regulation and have less predictable income. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is Airbnb always more profitable than long-term renting?", answer: "No. In markets with strict rules, weak tourism or high cleaning costs, a steady long-term tenant can earn nearly as much with much less effort." }],
  },
  {
    slug: "airbnb-occupancy-rate-calculator",
    title: "Airbnb Occupancy Rate Calculator",
    description: "Calculate your Airbnb occupancy rate, average daily rate (ADR) and revenue per available night, plus how many booked nights you need to break even.",
    metaTitle: "Airbnb Occupancy Rate Calculator — ADR & Break-Even",
    metaDescription: "Free Airbnb occupancy rate calculator. Find occupancy, average daily rate, revenue per available night, and the nights you need to break even.",
    calcInputs: [
      numberField("nightsBooked", "Nights Booked", { unit: "nights", default: 21, min: 0, max: 3660, step: 1 }),
      numberField("nightsAvailable", "Nights Available", { unit: "nights", default: 30, min: 1, max: 3660, step: 1 }),
      currencyField("bookingRevenue", "Booking Revenue for the Period", { default: 3900, max: 100000000, step: 50 }),
      currencyField("fixedCostsForPeriod", "Fixed Costs for the Period (Mortgage, Utilities)", { default: 2600, max: 100000000, step: 50 }),
      currencyField("variableCostPerNight", "Variable Cost per Booked Night", { default: 30, max: 100000, step: 1 }),
    ],
    calcResult: { label: "Occupancy Rate", format: "percentage" },
    calcResults: [
      { key: "occupancyRatePercent", label: "Occupancy Rate", format: "percentage", highlight: true },
      { key: "averageDailyRate", label: "Average Daily Rate (ADR)", format: "currency" },
      { key: "revenuePerAvailableNight", label: "Revenue per Available Night", format: "currency" },
      { key: "breakEvenNights", label: "Break-Even Nights (0 = Never)", format: "number" },
      { key: "breakEvenOccupancyPercent", label: "Break-Even Occupancy", format: "percentage" },
    ],
    instructions: "Enter the nights booked and the nights the listing was open (leave out nights you blocked for yourself), the revenue earned, your fixed costs for the period and the costs each booked night adds (cleaning share, supplies, fees).",
    examples: "Example: 21 of 30 nights booked is 70% occupancy. $3,900 of revenue is an ADR of $185.71, or $130 per available night. With $2,600 of fixed costs and $30 per night of variable costs, you break even at 16.7 nights (55.66% occupancy).",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Should I aim for higher occupancy or a higher rate?", answer: "Revenue per available night combines both. A slightly lower rate that fills many more nights often earns more — but every stay adds cleaning costs and wear." }],
  },
  {
    slug: "airbnb-cash-flow-calculator",
    title: "Airbnb Cash Flow Calculator",
    description: "Model an Airbnb's cash flow across peak, shoulder and off seasons — yearly total, the best and worst months, and the cash reserve you need to get through slow months.",
    metaTitle: "Airbnb Cash Flow Calculator — Seasonal Months",
    metaDescription: "Free Airbnb cash flow calculator. Model peak, shoulder and off-season months to see yearly cash flow, best and worst months, and the reserve you need.",
    calcInputs: [
      numberField("peakMonths", "Peak-Season Months", { unit: "months", default: 4, min: 0, max: 12, step: 1 }),
      currencyField("peakMonthlyRevenue", "Peak Monthly Revenue", { default: 7000, max: 100000000, step: 100 }),
      numberField("shoulderMonths", "Shoulder-Season Months", { unit: "months", default: 4, min: 0, max: 12, step: 1 }),
      currencyField("shoulderMonthlyRevenue", "Shoulder Monthly Revenue", { default: 4200, max: 100000000, step: 100 }),
      currencyField("offMonthlyRevenue", "Off-Season Monthly Revenue", { default: 1800, max: 100000000, step: 100 }),
      percentField("variableCostPercent", "Variable Costs (% of Revenue)", { default: 30, max: 100, step: 1 }),
      currencyField("fixedMonthlyCosts", "Fixed Monthly Costs (Mortgage, Tax, Insurance, Utilities)", { default: 2900, max: 100000000, step: 50 }),
    ],
    calcResult: { label: "Yearly Cash Flow", format: "currency" },
    calcResults: [
      { key: "annualCashFlow", label: "Yearly Cash Flow", format: "currency", highlight: true },
      { key: "averageMonthlyCashFlow", label: "Average Monthly Cash Flow", format: "currency" },
      { key: "bestMonthCashFlow", label: "Best Month", format: "currency" },
      { key: "worstMonthCashFlow", label: "Worst Month", format: "currency" },
      { key: "cashReserveForSlowMonths", label: "Cash Reserve for Slow Months", format: "currency" },
    ],
    instructions: "Enter how many months fall in peak and shoulder season (the rest are off-season) and typical monthly revenue in each. Variable costs — cleaning, fees, supplies — rise and fall with bookings; fixed costs don't.",
    examples: "Example: 4 peak months earn $2,000 each after costs and 4 shoulder months $40, but 4 off-season months lose $1,640 each. The year nets only $1,600 ($133.33 a month on average), and you need $6,560 set aside to cover the slow months.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How do hosts handle the off-season?", answer: "Offer monthly stays to traveling workers or students, lower minimum stays, drop rates, or plan owner use then — and keep a reserve from peak months." }],
  },
  {
    slug: "vacation-rental-calculator",
    title: "Vacation Rental Calculator",
    description: "Work out the tax on a vacation home you both use and rent out — the 14-day rule, splitting expenses by rental days, and the limit on deductions when personal use is high.",
    metaTitle: "Vacation Rental Tax Calculator — 14-Day Rule",
    metaDescription: "Free vacation rental calculator. Apply the 14-day rule, split expenses between rental and personal use, and estimate taxable rental income and tax.",
    calcInputs: [
      numberField("daysRented", "Days Rented at Fair Price", { unit: "days", default: 90, min: 0, max: 366, step: 1 }),
      numberField("personalUseDays", "Days of Personal Use", { unit: "days", default: 30, min: 0, max: 366, step: 1 }),
      currencyField("grossRentalIncome", "Gross Rental Income", { default: 22000, max: 1000000000, step: 500 }),
      currencyField("totalAnnualExpenses", "Total Yearly Expenses (Interest, Tax, Utilities, Upkeep, Depreciation)", { default: 24000, max: 1000000000, step: 500 }),
      percentField("marginalRatePercent", "Your Marginal Tax Rate", { default: 24, max: 50, step: 1 }),
    ],
    calcResult: { label: "Taxable Rental Income", format: "currency" },
    calcResults: [
      { key: "taxableRentalIncome", label: "Taxable Rental Income (Loss)", format: "currency", highlight: true },
      { key: "deductibleRentalExpenses", label: "Deductible Rental Expenses", format: "currency" },
      { key: "rentalUsePercent", label: "Rental Share of Use", format: "percentage" },
      { key: "estimatedTaxOnRental", label: "Estimated Tax on Rental", format: "currency" },
      { key: "taxFreeRentalIncome", label: "Tax-Free Rental Income (14-Day Rule)", format: "currency" },
    ],
    instructions: "Enter how many days you rented the home at a fair price, how many days you or family used it, the rent collected and the home's total yearly expenses. Rent it 14 days or less and the income is tax-free. Otherwise expenses are split by days; if personal use is over 14 days (or 10% of rental days), deductions can't exceed rental income.",
    examples: "Example: 90 rental days and 30 personal days make the home 75% rental, so $18,000 of the $24,000 of expenses is deductible. $22,000 of rent leaves $4,000 taxable — about $960 at 24%. Because personal use is high, no loss could be claimed.",
    assumptions: "Simplified: mortgage interest and property tax for the personal-use share may still be deductible as itemized deductions, and the IRS orders deductions in a set sequence. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is the 14-day rule?", answer: "If you rent your home for 14 days or fewer in a year, you don't report the rental income at all — and you can't deduct rental expenses." }],
  },
  {
    slug: "vacation-rental-roi-calculator",
    title: "Vacation Rental ROI Calculator",
    description: "See how much a second home you rent out part-time really costs each year after rental income, and your first-year return including loan paydown and appreciation.",
    metaTitle: "Vacation Rental ROI Calculator — Second Home",
    metaDescription: "Free vacation rental ROI calculator. Find a second home's net yearly cost after rental income, and first-year return with loan paydown and appreciation.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 450000, max: 10000000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 20, max: 100, step: 1 }),
      percentField("interestRatePercent", "Interest Rate", { default: 7, max: 30, step: 0.05 }),
      numberField("loanTermYears", "Loan Term", { unit: "years", default: 30, min: 1, max: 40, step: 1 }),
      currencyField("annualOwnershipCosts", "Yearly Tax, Insurance, HOA & Upkeep", { default: 14000, max: 1000000000, step: 250 }),
      currencyField("annualNetRentalIncome", "Yearly Rental Income After Rental Costs", { default: 30000, max: 1000000000, step: 500 }),
      percentField("appreciationPercent", "Appreciation per Year", { default: 3, min: -20, max: 30, step: 0.1 }),
    ],
    calcResult: { label: "Net Yearly Cost of Owning", format: "currency" },
    calcResults: [
      { key: "netAnnualCostOfOwning", label: "Net Yearly Cost of Owning", format: "currency", highlight: true },
      { key: "rentalIncomeCoversPercent", label: "Share of Costs Covered by Rent", format: "percentage" },
      { key: "firstYearReturnPercent", label: "First-Year Return on Down Payment", format: "percentage" },
      { key: "firstYearTotalGain", label: "First-Year Total Gain", format: "currency" },
      { key: "firstYearPrincipalPaid", label: "Principal Paid in Year 1", format: "currency" },
      { key: "firstYearAppreciation", label: "Appreciation in Year 1", format: "currency" },
    ],
    instructions: "Enter the price, down payment and loan, the yearly costs of owning, and the rental income left after cleaning, management and platform fees. A positive net cost is what you pay out of pocket each year to have the home.",
    examples: "Example: rental income of $30,000 covers 70.19% of a $450,000 second home's costs, leaving $12,741.07 a year out of pocket. Counting $3,656.92 of principal paid and $13,500 of appreciation, the first-year gain is $4,415.85 — 4.91% on the down payment.",
    assumptions: "Appreciation isn't guaranteed and is realized only when you sell. Returns are before tax. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Can a vacation home pay for itself?", answer: "Sometimes, in strong tourist areas with high occupancy. More often rent covers part of the cost, and owners accept a net expense in exchange for their own use and long-term appreciation." }],
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
