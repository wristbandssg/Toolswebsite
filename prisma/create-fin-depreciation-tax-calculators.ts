// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// the finance sub-batch "Depreciation, Prices, Fees & Conversions". See
// src/lib/calc-engine-fin-valuation.ts for the full list of 5 sub-batches,
// and src/lib/calc-engine-fin-depreciation-tax.ts for the math.
// Each tool is filed in the Finance Calculators sub-category the user named
// for it (created on first run).
//
// HOW TO RUN
//   npx tsx prisma/create-fin-depreciation-tax-calculators.ts
// or
//   npm run db:create-fin-depreciation-tax-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const FINANCE_SLUGS = ["finance-calculators", "finance"];

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
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

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "This tool gives estimates for learning and planning only and isn't financial, investment or tax advice. Results depend entirely on your inputs — check important decisions with a qualified professional.";

interface ToolDef {
  slug: string;
  category: { name: string; slug: string };
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const num = (key: string, label: string, highlight = false, decimals?: number) => ({ key, label, format: "number", ...(decimals !== undefined ? { decimals } : {}), ...(highlight ? { highlight: true } : {}) });
const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });


// Tool categories follow the 14 Oct 2026 consolidation of the Finance sub-categories
// (see prisma/consolidate-finance-subcategories.ts).
const BUSINESS_CATEGORY = { name: "Finance Calculators", slug: "finance-calculators" };
const CAR_BUYING_SELLING_CATEGORY = { name: "Car Buying & Selling Calculators", slug: "car-buying-selling-calculators" };
const HOUSEHOLD_FAMILY_EXPENSE_CATEGORY = { name: "Household & Family Expense Calculators", slug: "household-family-expense-calculators" };
const INVESTMENT_RETURNS_PLANNING_CATEGORY = { name: "Investment Returns & Planning Calculators", slug: "investment-returns-planning-calculators" };
const FUND_ETF_CATEGORY = { name: "Fund & ETF Calculators", slug: "fund-etf-calculators" };
const REAL_ESTATE_CATEGORY = { name: "Real Estate Calculators", slug: "real-estate-calculators" };
const INTEREST_RATE_CATEGORY = { name: "Interest Rate Calculators", slug: "interest-rate-calculators" };

const inr = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", currency: "INR", ...(highlight ? { highlight: true } : {}) });

const TOOLS: ToolDef[] = [
  {
    slug: "macrs-depreciation-calculator",
    category: BUSINESS_CATEGORY,
    title: "MACRS Depreciation Calculator",
    description: "Calculate MACRS tax depreciation for 3-, 5-, 7-, 10-, 15- and 20-year business property using the IRS half-year tables, with Section 179 and bonus depreciation.",
    metaTitle: "MACRS Depreciation Calculator — IRS Tables, 179 & Bonus",
    metaDescription: "Free MACRS depreciation calculator. Get each year's deduction from the IRS half-year tables for 3–20 year property, after Section 179 and bonus depreciation.",
    calcInputs: [
      currencyField("cost", "Cost of the Asset (basis)", { default: 50000, max: 1000000000, step: 100 }),
      dropdown("recoveryPeriod", "Property Class", [["3-year (tractor units, some tools)", 3], ["5-year (cars, computers, office equipment)", 5], ["7-year (furniture, machinery)", 7], ["10-year (boats, fruit trees)", 10], ["15-year (land improvements, QIP)", 15], ["20-year (farm buildings)", 20]], 5),
      numberField("year", "Tax Year to Show", { default: 1, min: 1, max: 21 }),
      currencyField("section179", "Section 179 Deduction (optional)", { default: 0, max: 1000000000, step: 100, required: false }),
      percentField("bonusPercent", "Bonus Depreciation (optional)", { default: 0, step: 1, required: false }),
    ],
    calcResult: { label: "Depreciation This Year", format: "currency" },
    calcResults: [cur("macrsBasis", "Basis Depreciated Under MACRS"), cur("bonusDepreciation", "Bonus Depreciation"), num("depreciationRate", "MACRS Rate This Year (%)", false, 3), cur("depreciationThisYear", "Depreciation This Year", true), cur("firstYearDeduction", "Total First-Year Deduction"), cur("accumulatedDepreciation", "Accumulated Depreciation"), cur("remainingBasis", "Remaining Basis"), num("taxYears", "Tax Years in Schedule")],
    instructions:
      "Enter the asset's cost and its MACRS property class, then the tax year you want to see (year 1 is the year it was placed in service). Section 179 and bonus depreciation are taken first, and MACRS applies to the basis left over.\n\n" +
      "Under the half-year convention a 5-year asset is depreciated over 6 tax years, because only half a year is allowed in the first and last years.",
    examples: "Example: a $50,000 5-year asset with no bonus depreciation gives $10,000 (20%) in year 1, $16,000 (32%) in year 2 and $9,600 (19.2%) in year 3.",
    assumptions: "Rates are IRS Publication 946 Table A-1 (GDS, 200% or 150% declining balance switching to straight line, half-year convention). The mid-quarter convention applies if over 40% of the year's assets are placed in service in the last quarter — not modelled here. Since July 2025, 100% bonus depreciation is permanent for qualifying property acquired after 19 Jan 2025. For rental buildings (27.5/39 years) use the Property Depreciation Calculator. " + DISCLAIMER,
    faq: [
      { question: "What does MACRS stand for?", answer: "Modified Accelerated Cost Recovery System — the US tax depreciation method for most business property placed in service after 1986." },
      { question: "Should I take bonus depreciation?", answer: "It front-loads the deduction into year one, which helps most when your tax rate is high now. You can elect out by class of property." },
    ],
  },
  {
    slug: "depreciation-calculator",
    category: BUSINESS_CATEGORY,
    title: "Depreciation Calculator",
    description: "Calculate asset depreciation by straight-line, double-declining, 150% declining, fixed or variable declining balance, or sum-of-the-years'-digits — yearly expense, accumulated depreciation and book value.",
    metaTitle: "Depreciation Calculator — Straight-Line, DDB & SYD",
    metaDescription: "Free depreciation calculator. Compare straight-line, double-declining, 150% declining balance and sum-of-years'-digits depreciation and book value by year.",
    calcInputs: [
      currencyField("cost", "Asset Cost", { default: 20000, max: 1000000000, step: 100 }),
      currencyField("salvageValue", "Salvage Value", { default: 2000, max: 1000000000, step: 100, required: false }),
      numberField("usefulLife", "Useful Life (years)", { default: 5, min: 1, max: 50 }),
      dropdown("method", "Method", [["Straight-line", 1], ["Double-declining balance (200%)", 2], ["150% declining balance", 3], ["Sum-of-the-years' digits", 4], ["Fixed declining balance (Excel DB)", 5], ["Variable declining balance (DDB switching to straight-line)", 6]], 1),
      numberField("year", "Year to Show", { default: 1, min: 1, max: 50 }),
    ],
    calcResult: { label: "Depreciation This Year", format: "currency" },
    calcResults: [cur("depreciableBase", "Depreciable Base (Cost − Salvage)"), cur("depreciationThisYear", "Depreciation This Year", true), cur("firstYearDepreciation", "First-Year Depreciation"), cur("accumulatedDepreciation", "Accumulated Depreciation"), cur("bookValueEndOfYear", "Book Value at Year End"), pct("rateOfCost", "This Year as % of Cost")],
    instructions:
      "Enter what the asset cost, what you expect it to be worth at the end (salvage value) and its useful life. Choose a method and the year to look at.\n\n" +
      "Straight-line spreads the cost evenly. Declining-balance and sum-of-the-years'-digits methods are accelerated — bigger expenses early, smaller later.",
    examples: "Example: a $20,000 machine with a $2,000 salvage value over 5 years depreciates $3,600 a year straight-line. With double-declining balance, year 1 is $8,000 (40% of $20,000).",
    assumptions: "Declining-balance methods apply rate ÷ life to the opening book value, never go below salvage value, and take whatever is left in the final year. Fixed declining balance uses the rate 1 − (salvage ÷ cost)^(1 ÷ life); variable declining balance switches from 200% to straight-line when that is larger, like Excel's VDB. Full-year convention (no partial first year). For US tax returns use the MACRS Depreciation Calculator. " + DISCLAIMER,
    faq: [
      { question: "Which depreciation method is best?", answer: "Straight-line is simplest and most common for financial statements; accelerated methods suit assets that lose value fastest when new." },
      { question: "Is salvage value used in double-declining balance?", answer: "Not in the rate, but depreciation stops once book value reaches salvage value." },
    ],
  },
  {
    slug: "out-the-door-price-calculator",
    category: CAR_BUYING_SELLING_CATEGORY,
    title: "Out The Door Price Calculator",
    description: "Calculate a car's out-the-door price — the sale price plus sales tax, doc fee, title, registration and add-ons, less discounts, rebates and your trade-in.",
    metaTitle: "Out The Door Price Calculator — Car OTD Price",
    metaDescription: "Free out-the-door price calculator for cars. Add sales tax, dealer fees, title and registration, subtract discounts, rebates and trade-in to see the real total.",
    calcInputs: [
      currencyField("vehiclePrice", "Vehicle Price (MSRP or agreed)", { default: 35000, max: 10000000, step: 100 }),
      currencyField("dealerDiscount", "Dealer Discount", { default: 1500, max: 10000000, step: 100, required: false }),
      currencyField("addOns", "Dealer Add-Ons & Accessories", { default: 800, max: 1000000, step: 50, required: false }),
      currencyField("docFee", "Documentation (Doc) Fee", { default: 499, max: 100000, step: 1, required: false }),
      percentField("salesTaxRate", "Sales Tax Rate", { default: 7, max: 20, step: 0.01 }),
      currencyField("tradeInValue", "Trade-In Value", { default: 0, max: 10000000, step: 100, required: false }),
      currencyField("tradeInPayoff", "Loan Owed on Trade-In", { default: 0, max: 10000000, step: 100, required: false }),
      dropdown("tradeInTaxCredit", "Trade-In Reduces Sales Tax?", [["Yes (most states)", 1], ["No", 2]], 1),
      currencyField("titleRegistration", "Title & Registration", { default: 450, max: 100000, step: 10, required: false }),
      currencyField("otherFees", "Other Fees", { default: 0, max: 100000, step: 10, required: false }),
      currencyField("rebate", "Manufacturer Rebate", { default: 0, max: 1000000, step: 100, required: false }),
      currencyField("downPayment", "Cash Down Payment", { default: 0, max: 10000000, step: 100, required: false }),
    ],
    calcResult: { label: "Out-the-Door Price", format: "currency" },
    calcResults: [cur("taxableAmount", "Taxable Amount"), cur("salesTax", "Sales Tax"), cur("feesTotal", "Doc, Title & Other Fees"), cur("outTheDoorPrice", "Out-the-Door Price", true), cur("tradeInEquity", "Trade-In Equity"), cur("amountToPayOrFinance", "Amount to Pay or Finance"), pct("overStickerPct", "OTD vs Vehicle Price")],
    instructions:
      "Enter the negotiated price, the dealer's add-ons and fees, your sales tax rate and any trade-in. Ask the dealer for an itemised out-the-door quote and compare it line by line.\n\n" +
      "The amount to pay or finance subtracts your trade-in equity and down payment from the out-the-door price.",
    examples: "Example: a $35,000 car with a $1,500 discount, $800 of add-ons, a $499 doc fee, 7% tax and $450 title and registration comes to $37,684.93 out the door — 7.67% above the price.",
    assumptions: "Sales tax is charged on price − discount + add-ons + doc fee, less the trade-in where your state allows it; rebates are subtracted after tax (some states tax before rebates). Fees vary widely by state and dealer. " + DISCLAIMER,
    faq: [
      { question: "What does out the door mean?", answer: "The total you pay to drive the car away — price, taxes and every fee — before financing." },
      { question: "Can I negotiate the doc fee?", answer: "Some states cap it; elsewhere you can ask the dealer to lower the price by the same amount." },
    ],
  },
  {
    slug: "paypal-fee-calculator",
    category: BUSINESS_CATEGORY,
    title: "PayPal Fee Calculator",
    description: "Calculate PayPal fees on a payment, the amount you'll receive, and how much to ask for so you get a set amount after fees.",
    metaTitle: "PayPal Fee Calculator — Fees, Net & Amount to Ask",
    metaDescription: "Free PayPal fee calculator. See the fee on goods & services, card or international payments, what you receive, and how much to invoice to net your target.",
    calcInputs: [
      currencyField("amount", "Payment Amount", { default: 100, max: 100000000, step: 0.01 }),
      dropdown("transactionType", "Payment Type", [["Goods & services / Checkout (3.49% + $0.49)", 1], ["Friends & family paid by card (2.90% + $0.30)", 2], ["Advanced card processing (2.89% + $0.49)", 3], ["Custom rate", 4]], 1),
      dropdown("international", "Payment From Another Country?", [["No", 2], ["Yes (+1.50%)", 1]], 2),
      percentField("customPercent", "Custom Percentage Fee", { default: 3.49, max: 20, step: 0.01, required: false }),
      currencyField("customFixed", "Custom Fixed Fee", { default: 0.49, max: 100, step: 0.01, required: false }),
    ],
    calcResult: { label: "PayPal Fee", format: "currency" },
    calcResults: [pct("feeRate", "Percentage Fee Applied"), cur("fee", "PayPal Fee", true), cur("youReceive", "You Receive"), pct("effectiveFeePct", "Effective Fee"), cur("amountToAsk", "Amount to Ask to Receive This Amount"), cur("feeOnAsk", "Fee on That Amount")],
    instructions:
      "Enter the payment and pick the type. The calculator shows the fee and what lands in your account — and, in reverse, how much to charge if you need the entered amount after fees.\n\n" +
      "Choose Custom if your account has a different rate, a non-US fixed fee, or a micropayment plan.",
    examples: "Example: a $100 goods-and-services payment costs $3.98 in fees, so you receive $96.02. To receive a full $100 you'd ask for $104.12.",
    assumptions: "US PayPal merchant rates as published for 2025–2026: 3.49% + $0.49 commercial, 2.90% + $0.30 for card-funded personal payments, 2.89% + $0.49 advanced card processing, +1.50% for international payments. Currency conversion adds a separate spread. PayPal changes fees — check its fee page. " + DISCLAIMER,
    faq: [
      { question: "Is sending money to friends free?", answer: "Yes within the US from a PayPal balance or bank account; paying with a card adds 2.90% + $0.30." },
      { question: "Can I pass the fee to the buyer?", answer: "PayPal's terms and some state laws restrict surcharges; many sellers build the fee into their price instead." },
    ],
  },
  {
    slug: "water-bill-calculator",
    category: HOUSEHOLD_FAMILY_EXPENSE_CATEGORY,
    title: "Water Bill Calculator",
    description: "Estimate your water and sewer bill from your usage (or household size), your utility's rates and base charges — per bill, per month and per year.",
    metaTitle: "Water Bill Calculator — Water & Sewer Cost Estimate",
    metaDescription: "Free water bill calculator. Estimate water and sewer charges from gallons or CCF used, rates and base fees, or from household size, per bill, month and year.",
    calcInputs: [
      numberField("usage", "Water Used This Bill (0 = estimate)", { default: 0, max: 10000000, step: 0.1, required: false }),
      dropdown("unit", "Usage & Rate Unit", [["Thousand gallons", 1], ["CCF / HCF (748 gallons)", 2]], 1),
      numberField("people", "People in Household (for estimate)", { default: 3, max: 50 }),
      dropdown("billingMonths", "Billing Period", [["Monthly", 1], ["Every 2 months", 2], ["Quarterly", 3]], 1),
      currencyField("waterRate", "Water Rate per Unit", { default: 6.5, max: 1000, step: 0.01 }),
      currencyField("sewerRate", "Sewer Rate per Unit", { default: 9, max: 1000, step: 0.01, required: false }),
      currencyField("waterBase", "Water Base Charge per Month", { default: 20, max: 10000, step: 0.5, required: false }),
      currencyField("sewerBase", "Sewer Base Charge per Month", { default: 15, max: 10000, step: 0.5, required: false }),
      percentField("taxesFeesPct", "Taxes & Surcharges", { default: 0, max: 50, required: false }),
    ],
    calcResult: { label: "Total Bill", format: "currency" },
    calcResults: [num("usageUnits", "Usage (Billing Units)"), num("gallonsUsed", "Gallons Used"), cur("waterCharge", "Water Charge"), cur("sewerCharge", "Sewer Charge"), cur("taxesAndFees", "Taxes & Surcharges"), cur("totalBill", "Total Bill", true), cur("monthlyCost", "Cost per Month"), cur("annualCost", "Cost per Year"), { key: "costPerGallon", label: "Cost per Gallon", format: "currency", decimals: 4 }],
    instructions:
      "Copy the usage, rates and base charges from your last bill — most utilities bill in thousands of gallons or in CCF (hundred cubic feet). Leave usage at 0 to estimate it from the number of people at home.\n\n" +
      "Sewer is often billed on the water you use (or your winter average), so it can be the bigger half of the bill.",
    examples: "Example: a 3-person home uses about 7,480 gallons a month. At $6.50 water and $9 sewer per 1,000 gallons plus $35 of base charges, that's about $150.92 a month, or $1,811 a year.",
    assumptions: "Flat volume rates — many utilities use rising tiers, so enter your average rate. The usage estimate is 82 gallons a person a day (USGS indoor average). " + DISCLAIMER,
    faq: [
      { question: "What is a CCF?", answer: "One hundred cubic feet of water, which is about 748 gallons." },
      { question: "What's an average water bill?", answer: "US households typically pay roughly $70–$150 a month for water and sewer together, depending on the city and usage." },
    ],
  },
  {
    slug: "inflation-calculator",
    category: INVESTMENT_RETURNS_PLANNING_CATEGORY,
    title: "Inflation Calculator",
    description: "Calculate what money from any year since 1913 is worth today using US CPI data, or project future prices at an inflation rate — plus the change in buying power.",
    metaTitle: "Inflation Calculator — Value of Money & Buying Power",
    metaDescription: "Free inflation calculator. Adjust dollars between any years from 1913 to 2026 with US CPI data, or by an inflation rate, and see purchasing power lost.",
    calcInputs: [
      currencyField("amount", "Amount", { default: 100, max: 1000000000, step: 1 }),
      dropdown("mode", "Method", [["Historical US CPI (by year)", 1], ["Average inflation rate", 2]], 1),
      numberField("startYear", "From Year (CPI mode)", { default: 2000, min: 1913, max: 2026, required: false }),
      numberField("endYear", "To Year (CPI mode)", { default: 2026, min: 1913, max: 2026, required: false }),
      percentField("inflationRate", "Inflation Rate per Year (rate mode)", { default: 3, min: -20, max: 100, required: false }),
      numberField("years", "Number of Years (rate mode)", { default: 10, max: 200, required: false }),
    ],
    calcResult: { label: "Inflation-Adjusted Value", format: "currency" },
    calcResults: [cur("adjustedValue", "Equivalent Value", true), pct("cumulativeInflation", "Cumulative Inflation"), pct("averageAnnualInflation", "Average Inflation per Year"), cur("purchasingPower", "Buying Power of the Amount (in start-year dollars)"), pct("purchasingPowerChange", "Change in Buying Power"), num("years", "Years")],
    instructions:
      "In CPI mode enter an amount and two years: the result is what that amount in the first year is worth in the second (put the later year first to go backwards). In rate mode enter an inflation rate and a number of years to project a future price.\n\n" +
      "Buying power shows the other side: what your money buys after inflation, in the starting year's dollars.",
    examples: "Example: $100 in 2000 has the same buying power as about $192.60 in 2026 — prices rose 92.6%, about 2.55% a year. Put the other way, $100 in 2026 buys what $51.92 bought in 2000.",
    assumptions: "US CPI-U (all items, all urban consumers) annual averages from the Bureau of Labor Statistics, 1913–2025; 2026 uses the January–August average. Rate mode compounds yearly. Your personal inflation depends on what you buy. " + DISCLAIMER,
    faq: [
      { question: "What is buying power?", answer: "How much a sum of money can buy. Inflation reduces it — $100 buys fewer goods each year prices rise." },
      { question: "What inflation rate should I use for planning?", answer: "The Federal Reserve targets 2%; the long-run US average since 1913 is about 3%." },
    ],
  },
  {
    slug: "sip-calculator",
    category: FUND_ETF_CATEGORY,
    title: "SIP Calculator",
    description: "Calculate the maturity value of a monthly SIP (systematic investment plan) in mutual funds — invested amount, estimated returns and total value, with an optional yearly step-up.",
    metaTitle: "SIP Calculator — Mutual Fund SIP Returns with Step-Up",
    metaDescription: "Free SIP calculator. See what a monthly mutual fund SIP grows to — amount invested, estimated returns and maturity value — with an optional annual step-up.",
    calcInputs: [
      { key: "monthlyInvestment", label: "Monthly SIP Amount", type: "currency", unit: "INR", required: true, default: 5000, min: 0, max: 10000000, step: 500 },
      percentField("expectedReturn", "Expected Return per Year", { default: 12, max: 50 }),
      numberField("years", "Investment Period (years)", { default: 10, min: 1, max: 50 }),
      percentField("annualStepUp", "Annual Step-Up (optional)", { default: 0, max: 50, step: 1, required: false }),
    ],
    calcResult: { label: "Total Value", format: "currency", currency: "INR" },
    calcResults: [inr("investedAmount", "Invested Amount"), inr("estimatedReturns", "Estimated Returns"), inr("totalValue", "Total Value", true), inr("finalMonthlySip", "Monthly SIP in Final Year"), num("wealthGainedMultiple", "Total Value ÷ Invested (×)")],
    instructions:
      "Enter how much you invest every month, the yearly return you expect and how many years you'll keep investing. Add a step-up if you plan to raise the SIP each year as your income grows.\n\n" +
      "Equity funds have historically returned roughly 10–14% a year in India over long periods, but returns aren't guaranteed.",
    examples: "Example: ₹5,000 a month for 10 years at 12% grows to about ₹11,61,695 — ₹6,00,000 invested and ₹5,61,695 of returns.",
    assumptions: "FV = P × ((1 + i)^n − 1) ÷ i × (1 + i), with i = annual return ÷ 12 and each instalment invested at the start of the month (the method used by most Indian fund houses). A step-up raises the SIP once every 12 months. Taxes, exit loads and expense ratios aren't deducted. " + DISCLAIMER,
    faq: [
      { question: "What is a SIP?", answer: "A systematic investment plan: a fixed amount invested in a mutual fund every month, which averages your purchase cost over time." },
      { question: "SIP or lump sum?", answer: "A lump sum earns more if markets rise steadily; a SIP lowers the risk of investing everything at a peak and suits monthly income." },
    ],
  },
  {
    slug: "price-per-square-foot-calculator",
    category: REAL_ESTATE_CATEGORY,
    title: "Price Per Square Foot Calculator",
    description: "Calculate the price per square foot (and per square metre) of a home, property or rental, and compare it with nearby homes to estimate value.",
    metaTitle: "Price Per Square Foot Calculator — Home Value per Sq Ft",
    metaDescription: "Free price per square foot calculator. Divide price by area, convert to price per m², and compare with comparable homes to estimate a property's value.",
    calcInputs: [
      currencyField("price", "Price", { default: 450000, max: 10000000000, step: 1000 }),
      numberField("area", "Area", { default: 2000, max: 100000000, step: 10 }),
      dropdown("areaUnit", "Area Unit", [["Square feet", 1], ["Square metres", 2]], 1),
      currencyField("comparablePricePerSqFt", "Comparable Homes' Price per Sq Ft (optional)", { default: 0, max: 1000000, step: 1, required: false }),
    ],
    calcResult: { label: "Price per Sq Ft", format: "currency" },
    calcResults: [num("areaSqFt", "Area (sq ft)"), cur("pricePerSqFt", "Price per Square Foot", true), cur("pricePerSqM", "Price per Square Metre"), cur("valueAtComparableRate", "Value at Comparable Rate"), pct("differenceVsComparable", "Difference vs Comparables")],
    instructions: "Enter the price and the finished living area. Add the average price per square foot of similar recently sold homes nearby to see what this home would be worth at that rate and how much above or below it is priced.",
    examples: "Example: a $450,000 home with 2,000 sq ft costs $225 per square foot ($2,421.88 per m²). If nearby homes sold for $240 per sq ft, it would be worth $480,000 at that rate — it's priced 6.25% below.",
    assumptions: "1 m² = 10.7639 sq ft. Use the same measure for every home (usually heated living area, excluding garages and basements). Price per square foot ignores lot size, condition and location, so treat it as a rough comparison. " + DISCLAIMER,
    faq: [
      { question: "Why do smaller homes cost more per square foot?", answer: "Kitchens, bathrooms and land cost much the same in any size home, so those costs are spread over fewer square feet." },
      { question: "Is a lower price per square foot always a better deal?", answer: "Not necessarily — it may reflect location, age or needed repairs." },
    ],
  },
  {
    slug: "million-to-billion-converter",
    category: BUSINESS_CATEGORY,
    title: "Million to Billion Converter",
    description: "Convert any number between thousands, lakhs, millions, crores, billions and trillions — for example, how many millions are in a billion.",
    metaTitle: "Million to Billion Converter — Lakh, Crore, Trillion",
    metaDescription: "Free million to billion converter. Convert numbers between thousand, lakh, million, crore, billion and trillion instantly, with the full number written out.",
    calcInputs: [numberField("value", "Value", { default: 1500, min: -1000000000000, max: 1000000000000, step: 0.01 }), dropdown("fromUnit", "Unit", [["Ones", 1], ["Thousand", 2], ["Lakh (100,000)", 3], ["Million", 4], ["Crore (10 million)", 5], ["Billion", 6], ["Trillion", 7]], 4)],
    calcResult: { label: "In Billions", format: "number" },
    calcResults: [num("fullNumber", "Full Number", false, 2), num("thousands", "Thousands", false, 6), num("lakhs", "Lakhs", false, 6), num("millions", "Millions", false, 6), num("crores", "Crores", false, 6), num("billions", "Billions", true, 6), num("trillions", "Trillions", false, 9)],
    instructions: "Enter a number and choose its unit. Every other unit is shown at once — useful for reading company revenue, government budgets or salaries quoted in lakhs and crores.",
    examples: "Example: 1,500 million = 1.5 billion = 150 crore = 15,000 lakh = 1,500,000,000.",
    assumptions: "Short-scale (US/modern UK) billion = 1,000 million; lakh = 100,000 and crore = 10,000,000 (Indian numbering). Some older European usage calls 10^12 a billion.",
    faq: [
      { question: "How many millions are in a billion?", answer: "1,000 millions make one billion." },
      { question: "How many crores are in a billion?", answer: "100 crore make one billion." },
    ],
  },
  {
    slug: "basis-point-calculator",
    category: INTEREST_RATE_CATEGORY,
    title: "Basis Point Calculator",
    description: "Convert basis points (bps) to percent and decimal, see a rate after a change of N basis points, and the dollar value of the change on an amount.",
    metaTitle: "Basis Point Calculator — BPS to Percent & Dollar Value",
    metaDescription: "Free basis point calculator. Convert bps to percent and decimal, apply a rate change in basis points and see what it's worth in dollars on a loan or portfolio.",
    calcInputs: [numberField("basisPoints", "Basis Points (bps)", { default: 25, min: -100000, max: 100000, step: 1 }), percentField("baseRate", "Starting Rate", { default: 4.5, min: -10, max: 100, step: 0.01 }), currencyField("amount", "Amount (loan or investment)", { default: 100000, max: 100000000000, step: 1000, required: false })],
    calcResult: { label: "Percent", format: "percentage" },
    calcResults: [{ key: "percent", label: "As a Percent", format: "percentage", decimals: 4 }, num("decimal", "As a Decimal", false, 6), { key: "newRate", label: "New Rate", format: "percentage", decimals: 4, highlight: true }, pct("relativeChange", "Relative Change in the Rate"), cur("yearlyDollarImpact", "Yearly Dollar Impact on Amount"), cur("valuePerBasisPoint", "Value of 1 bp per Year")],
    instructions: "Enter the basis points and, optionally, the starting rate and an amount. One basis point is 0.01%, so 100 bps = 1%. Use a negative number for a cut.",
    examples: "Example: a 25 bp Fed hike is 0.25%, taking a 4.50% rate to 4.75% — a 5.56% relative increase. On $100,000 it's $250 a year, or $10 per basis point.",
    assumptions: "1 bp = 0.01% = 0.0001. The dollar impact is simple yearly interest on the amount and ignores compounding and loan amortisation.",
    faq: [
      { question: "Why use basis points instead of percent?", answer: "They remove confusion: a rise from 5% to 5.5% is 50 bps, while \"up 10%\" could mean 5.5% or 15%." },
      { question: "How many basis points is 1%?", answer: "100 basis points." },
    ],
  },
];

// Every sub-category here hangs directly under Finance Calculators and is
// created on first use.
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
  if (!finance) throw new Error(`The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first.`);
  console.log(`Creating sub-category "${cat.name}" under "${finance.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const category = await ensureCategory(def.category);
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
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
