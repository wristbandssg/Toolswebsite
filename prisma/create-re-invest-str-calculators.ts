// One-time (but safe to re-run) batch setup script: creates 5 rental investing tools
// (Real Estate Calculators > Rental Property & Investment) and 6 short-term rental tools
// (Real Estate Calculators > Short-Term Rental & Airbnb) from the user's real estate list.
// See src/lib/calc-engine-re-invest-str.ts for the math.
//
// HOW TO RUN (after prisma/restructure-real-estate-main-category.ts --apply)
//   npx tsx prisma/create-re-invest-str-calculators.ts
// or
//   npm run db:create-re-invest-str-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

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
  return { key, label, type: "number", unit: opts.unit, required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
  title: string;
  category: string;
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

const YN = (key: string, label: string, def: number) => dropdown(key, label, [["No", 0], ["Yes", 1]], def);

const INVEST = "rental-property-investment-calculators";
const STR = "short-term-rental-airbnb-calculators";

const strInputs = (o: { nightly: number; occ: number; cleaningFee: number; cleaningCost: number; supplies: number; utilities: number }) => [
  currencyField("nightlyRate", "Average Nightly Rate", { default: o.nightly, max: 10000 }),
  percentField("occupancyRate", "Occupancy", { default: o.occ, max: 100, step: 1 }),
  numberField("averageStayNights", "Average Stay (Nights)", { default: 3, min: 1, max: 30, step: 0.5 }),
  currencyField("cleaningFeeCharged", "Cleaning Fee Charged per Stay", { default: o.cleaningFee, max: 1000, required: false }),
  percentField("platformFeePercent", "Platform Host Fee", { default: 3, max: 20, step: 0.5 }),
  percentField("strManagementPercent", "Co-Host / Management Fee", { default: 0, max: 40, step: 1, required: false }),
  currencyField("cleaningCostPerStay", "Your Cleaning Cost per Stay", { default: o.cleaningCost, max: 1000, required: false }),
  currencyField("suppliesPerStay", "Supplies & Restocking per Stay", { default: o.supplies, max: 500, required: false }),
  currencyField("strUtilities", "Monthly Utilities, Internet & Subscriptions", { default: o.utilities, max: 5000, required: false }),
];

const TOOLS: ToolDef[] = [
  {
    slug: "real-estate-wholesale-calculator",
    title: "Real Estate Wholesale Calculator",
    category: INVEST,
    description: "Work out the maximum offer to make a seller when wholesaling a property — the end buyer's price under the 70% rule, your assignment fee, and the profit left for the investor who buys your contract.",
    metaTitle: "Real Estate Wholesale Calculator — MAO & Assignment Fee",
    metaDescription: "Free wholesale real estate calculator. Find your maximum allowable offer, the end buyer's price, your assignment fee and the buyer's profit.",
    calcInputs: [
      currencyField("arv", "After Repair Value (ARV)", { default: 300000, max: 20000000, step: 1000 }),
      currencyField("repairCosts", "Estimated Repair Costs", { default: 45000, max: 5000000, step: 500 }),
      percentField("buyerRulePercent", "End Buyer's Rule (% of ARV)", { default: 70, min: 50, max: 90, step: 1 }),
      currencyField("assignmentFee", "Your Assignment Fee", { default: 10000, max: 500000, step: 500 }),
      currencyField("yourClosingCosts", "Your Costs (Marketing, EMD Risk, Title)", { default: 1500, max: 100000, step: 100, required: false }),
      percentField("buyerCostsPercent", "End Buyer's Holding & Selling Costs (% of ARV)", { default: 10, max: 25, step: 0.5, required: false }),
    ],
    calcResult: { label: "Max Offer to Seller", format: "currency" },
    calcResults: [
      { key: "maxOfferToSeller", label: "Maximum Offer to the Seller", format: "currency", highlight: true },
      { key: "endBuyerPrice", label: "Price to the End Buyer", format: "currency" },
      { key: "yourAssignmentFee", label: "Your Assignment Fee", format: "currency" },
      { key: "endBuyerProfit", label: "End Buyer's Estimated Profit", format: "currency" },
      { key: "maoPercentOfArv", label: "Your Offer as % of ARV", format: "percentage" },
    ],
    instructions: "Enter the ARV from recent renovated comps and a realistic repair estimate. Set the rule your cash buyers use (70% is common; hot markets accept 75–80%), then your assignment fee and costs.",
    examples: "Example: with a $300,000 ARV and $45,000 of repairs, a buyer using the 70% rule pays up to $165,000. Taking a $10,000 assignment fee and $1,500 of costs, the most you should offer the seller is $153,500.00 — about 51% of ARV — leaving the end buyer about $60,000 of profit.",
    assumptions: "Maximum offer = ARV × buyer's rule − repairs − your fee and costs. Some states regulate wholesaling (for example requiring a license or disclosure for repeated assignments) — check your state's rules. Many end buyers won't close above the 70–75% rule after repairs.",
    faq: [
      { question: "How do you calculate a wholesale offer?", answer: "Take the after repair value × 70% (or your buyers' rule), subtract repairs, then subtract your assignment fee." },
      { question: "How much do wholesalers make per deal?", answer: "Assignment fees are commonly $5,000–$20,000, depending on the spread the deal allows." },
    ],
  },
  {
    slug: "landlord-rent-calculator",
    title: "Landlord Rent Calculator",
    category: INVEST,
    description: "Decide how much rent to charge for your rental — the break-even rent that covers every cost, the rent that hits your cash-flow goal, the 1% rule and market rent from comparable rents per square foot.",
    metaTitle: "Landlord Rent Calculator — How Much Rent Should I Charge?",
    metaDescription: "Free landlord rent calculator. Find your break-even rent, the rent for your target cash flow, the 1% rule and market rent per square foot.",
    calcInputs: [
      currencyField("propertyValue", "Property Value", { default: 250000, max: 20000000, step: 1000 }),
      currencyField("mortgagePayment", "Mortgage Payment (P&I)", { default: 1300, max: 50000 }),
      currencyField("monthlyTaxInsurance", "Monthly Property Tax + Insurance", { default: 350, max: 20000 }),
      currencyField("monthlyHoa", "Monthly HOA", { default: 0, max: 5000, required: false }),
      currencyField("ownerPaidUtilities", "Owner-Paid Utilities", { default: 50, max: 3000, required: false }),
      percentField("vacancyRate", "Vacancy", { default: 5, max: 30, step: 1 }),
      percentField("managementPercent", "Property Management", { default: 8, max: 15, step: 0.5 }),
      percentField("maintenancePercent", "Repairs & Maintenance (% of Rent)", { default: 5, max: 20, step: 1 }),
      percentField("capexPercent", "CapEx Reserve (% of Rent)", { default: 5, max: 20, step: 1 }),
      currencyField("targetCashFlow", "Target Monthly Cash Flow", { default: 200, max: 20000 }),
      numberField("squareFeet", "Square Feet", { default: 1400, max: 20000 }),
      currencyField("marketRentPerSqFt", "Comparable Rent per Sq Ft per Month", { default: 1.55, max: 20, step: 0.01 }),
    ],
    calcResult: { label: "Rent for Target Cash Flow", format: "currency" },
    calcResults: [
      { key: "targetRent", label: "Rent for Your Target Cash Flow", format: "currency", highlight: true },
      { key: "breakEvenRent", label: "Break-Even Rent", format: "currency" },
      { key: "onePercentRuleRent", label: "1% Rule Rent", format: "currency" },
      { key: "marketRent", label: "Market Rent from Comps", format: "currency" },
      { key: "cashFlowAtMarketRent", label: "Cash Flow at Market Rent", format: "currency" },
    ],
    instructions: "Enter your costs — mortgage, taxes and insurance, HOA and any utilities you pay — and the percentage costs that scale with rent. Add your cash-flow goal and comparable rents per square foot from local listings.",
    examples: "Example: $1,700 of fixed costs plus 23% for vacancy, management, repairs and capex means you break even at $2,207.79 and need $2,467.53 for $200 of cash flow. Comps at $1.55/sq ft put market rent at $2,170 for 1,400 sq ft — slightly below break-even, so the deal is tight at today's rents.",
    assumptions: "Percentage costs are taken from gross rent. Market rent is the ceiling: pricing above comps usually means longer vacancy. Rent increases are limited in rent-controlled areas and by some state laws. The 1% rule is a quick screen, not a price.",
    faq: [
      { question: "How do landlords decide how much rent to charge?", answer: "Start with comparable rents for similar units nearby, then check the rent covers all costs plus a cash-flow cushion." },
      { question: "What is the 1% rule for rent?", answer: "A screening rule that monthly rent should be about 1% of the purchase price — $2,500 for a $250,000 home." },
    ],
  },
  {
    slug: "house-hacking-calculator",
    title: "House Hacking Calculator",
    category: INVEST,
    description: "Run the numbers on house hacking — buy a 2–4 unit property (or rent out rooms), live in one, and let tenants pay most of the mortgage. See your net housing cost, savings vs renting and cash flow after you move out.",
    metaTitle: "House Hacking Calculator — Duplex, Triplex & Room Rental",
    metaDescription: "Free house hacking calculator. See your net housing cost living in one unit and renting the rest, savings vs renting and cash flow when you move out.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 450000, max: 10000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment (FHA 3.5% on 1–4 Units)", { default: 3.5, max: 100, step: 0.5 }),
      percentField("interestRate", "Interest Rate", { default: 6.5, max: 15, step: 0.125 }),
      dropdown("loanTerm", "Loan Term", [["30 Years", 30], ["15 Years", 15]], 30),
      percentField("mortgageInsuranceRate", "Mortgage Insurance Rate (MIP/PMI)", { default: 0.55, max: 2, step: 0.05 }),
      percentField("propertyTaxRate", "Property Tax Rate", { default: 1.2, max: 5, step: 0.01 }),
      currencyField("annualInsurance", "Insurance per Year", { default: 2400, max: 30000, step: 50 }),
      currencyField("rentFromOtherUnits", "Rent from the Other Units / Rooms", { default: 2400, max: 50000 }),
      currencyField("rentForYourUnit", "Market Rent for Your Unit (After You Move)", { default: 1300, max: 20000 }),
      percentField("vacancyRate", "Vacancy", { default: 5, max: 30, step: 1 }),
      percentField("maintenancePercent", "Maintenance & CapEx (% of Rent)", { default: 8, max: 25, step: 1 }),
      currencyField("ownerPaidUtilities", "Owner-Paid Utilities", { default: 150, max: 3000, required: false }),
      currencyField("currentRent", "What You Pay in Rent Now", { default: 1800, max: 20000 }),
    ],
    calcResult: { label: "Your Net Housing Cost", format: "currency" },
    calcResults: [
      { key: "yourNetHousingCost", label: "Your Net Monthly Housing Cost", format: "currency", highlight: true },
      { key: "savingsVsRenting", label: "Savings vs Your Current Rent", format: "currency" },
      { key: "totalMonthlyPayment", label: "Total Monthly Payment (PITI + MI)", format: "currency" },
      { key: "rentalIncomeAfterVacancy", label: "Rental Income After Vacancy", format: "currency" },
      { key: "cashFlowAfterYouMoveOut", label: "Cash Flow After You Move Out", format: "currency" },
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "rentCoversPayment", label: "Rent Covers This Much of the Payment", format: "percentage" },
    ],
    instructions: "Enter the price and your owner-occupied loan terms (FHA allows 3.5% down on 2–4 units; conventional allows 5%). Add the rent from the units or rooms you'll rent out, the market rent for your own unit, and what you pay in rent today.",
    examples: "Example: a $450,000 duplex with 3.5% down costs $3,593.79 a month. $2,400 of rent from the other side ($2,280 after vacancy) brings your net housing cost to $1,759.79 — a little less than your $1,800 rent today while building equity. After you move out, rents don't quite cover costs at today's rates (−$524.79).",
    assumptions: "FHA and conventional lenders can count 75% of the other units' projected rent toward qualifying. FHA requires you to live in the property for at least a year; 3–4 unit FHA loans must pass a self-sufficiency test. Maintenance is figured on the full rent of all units.",
    faq: [
      { question: "What is house hacking?", answer: "Buying a small multifamily home (or a home with spare rooms), living in part of it and renting the rest to offset your mortgage." },
      { question: "Can I use an FHA loan to house hack?", answer: "Yes — FHA allows 3.5% down on 2–4 unit properties if you live in one of the units." },
    ],
  },
  {
    slug: "irr-real-estate-calculator",
    title: "IRR Real Estate Calculator",
    category: INVEST,
    description: "Calculate the internal rate of return (IRR) on a real estate investment — yearly cash flow after debt service, NOI growth and a sale at an exit cap rate — with the unlevered IRR, equity multiple and cash-on-cash return.",
    metaTitle: "IRR Real Estate Calculator — Levered & Unlevered IRR",
    metaDescription: "Free real estate IRR calculator. Find the levered and unlevered IRR, equity multiple and cash-on-cash return from NOI, financing and an exit cap rate.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 500000, max: 500000000, step: 1000 }),
      currencyField("closingCosts", "Closing & Acquisition Costs", { default: 15000, max: 10000000, step: 500 }),
      percentField("downPaymentPercent", "Down Payment", { default: 25, max: 100, step: 1 }),
      percentField("interestRate", "Loan Rate", { default: 7, max: 15, step: 0.125 }),
      numberField("loanTerm", "Amortization (Years)", { default: 30, min: 5, max: 40 }),
      currencyField("yearOneNoi", "Year 1 Net Operating Income", { default: 35000, max: 50000000, step: 100 }),
      percentField("noiGrowth", "NOI Growth per Year", { default: 3, max: 15, step: 0.25 }),
      numberField("holdYears", "Hold Period (Years)", { default: 5, min: 1, max: 30 }),
      percentField("exitCapRate", "Exit Cap Rate", { default: 6.5, min: 2, max: 15, step: 0.05 }),
      percentField("sellingCostPercent", "Selling Costs", { default: 6, max: 10, step: 0.5 }),
    ],
    calcResult: { label: "Levered IRR", format: "percentage" },
    calcResults: [
      { key: "leveredIrr", label: "Levered IRR (on Your Equity)", format: "percentage", highlight: true },
      { key: "unleveredIrr", label: "Unlevered IRR (All Cash)", format: "percentage" },
      { key: "equityMultiple", label: "Equity Multiple", format: "number", decimals: 2 },
      { key: "totalProfit", label: "Total Profit", format: "currency" },
      { key: "yearOneCashOnCash", label: "Year 1 Cash-on-Cash Return", format: "percentage" },
      { key: "equityInvested", label: "Equity Invested", format: "currency" },
    ],
    instructions: "Enter the price, closing costs and financing, then year-1 NOI (rent minus operating expenses, before debt service) and how fast you expect it to grow. Choose how long you'll hold and the cap rate a buyer would pay when you sell.",
    examples: "Example: a $500,000 property bought with 25% down at 7%, with $35,000 of NOI growing 3% a year and sold after 5 years at a 6.5% cap rate, has a levered IRR of 14.9% (9.5% unlevered) and a 1.93× equity multiple on $140,000 invested.",
    assumptions: "Sale price = next year's NOI ÷ exit cap rate. Cash flows are yearly and before income taxes; the loan is paid off from the sale. IRR is the discount rate that makes the net present value of all cash flows zero. Small changes in the exit cap rate move IRR a lot — test a higher one.",
    faq: [
      { question: "What is a good IRR for real estate?", answer: "Often 8–12% for stabilized core-plus deals and 15–20%+ for value-add or development, depending on risk." },
      { question: "What's the difference between IRR and cash-on-cash return?", answer: "Cash-on-cash looks at one year's cash flow; IRR counts every year's cash flow and the sale, and the timing of each." },
    ],
  },
  {
    slug: "buy-to-let-mortgage-calculator",
    title: "Buy to Let Mortgage Calculator",
    category: INVEST,
    description: "See how much you can borrow on a UK buy-to-let mortgage — the lender's 125% or 145% rental cover test at a stress rate, the LTV limit, the rent needed for the loan you want, the interest-only payment and stamp duty with the 5% surcharge.",
    metaTitle: "Buy to Let Mortgage Calculator UK — Rent Cover (ICR)",
    metaDescription: "Free buy to let mortgage calculator. Find the max loan from rent at 125%/145% ICR, the rent you need, interest-only payments and SDLT with the 5% surcharge.",
    calcInputs: [
      numberField("propertyPrice", "Property Price", { unit: "£", default: 250000, max: 20000000, step: 1000 }),
      numberField("monthlyRent", "Expected Monthly Rent", { unit: "£", default: 1200, max: 100000, step: 25 }),
      dropdown("higherRateTaxpayer", "Interest Cover Ratio", [["125% (Basic-Rate Taxpayer or Limited Company)", 0], ["145% (Higher / Additional-Rate Taxpayer)", 1]], 1),
      percentField("stressRate", "Lender's Stress Rate", { default: 5.5, max: 12, step: 0.05 }),
      percentField("interestRate", "Actual Mortgage Rate", { default: 4.75, max: 12, step: 0.05 }),
      percentField("maxLtv", "Maximum Loan-to-Value", { default: 75, max: 85, step: 5 }),
      numberField("loanWanted", "Loan You Want (0 = Max LTV)", { unit: "£", default: 0, max: 20000000, step: 1000, required: false }),
      YN("companyOrAdditional", "Additional Property / Company Purchase (5% SDLT Surcharge)", 1),
    ],
    calcResult: { label: "Maximum Loan", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "maxLoan", label: "Maximum Loan", format: "currency", currency: "GBP", highlight: true },
      { key: "maxLoanFromRent", label: "Max Loan the Rent Supports", format: "currency", currency: "GBP" },
      { key: "maxLoanFromLtv", label: "Max Loan by LTV", format: "currency", currency: "GBP" },
      { key: "rentNeededForLoan", label: "Rent Needed for the Loan You Want", format: "currency", currency: "GBP" },
      { key: "interestOnlyPayment", label: "Monthly Interest-Only Payment", format: "currency", currency: "GBP" },
      { key: "depositNeeded", label: "Deposit Needed", format: "currency", currency: "GBP" },
      { key: "stampDuty", label: "Stamp Duty (England & NI)", format: "currency", currency: "GBP" },
    ],
    instructions: "Enter the price and the rent a letting agent expects. Pick the interest cover ratio — 145% for higher-rate taxpayers buying personally, 125% for basic-rate taxpayers and limited companies at most lenders — and the lender's stress rate. Enter a target loan to see the rent you'd need.",
    examples: "Example: a £250,000 flat renting for £1,200 a month, tested at 145% and 5.5%, supports a loan of about £180,564 — below the £187,500 that 75% LTV would allow — so you'd need a deposit of about £69,436. To borrow the full £187,500 the rent would need to be about £1,246.09. Stamp duty with the 5% surcharge is £15,000.00.",
    assumptions: "Lenders test rent ≥ ICR × loan × stress rate (often the higher of 5.5% or the pay rate + 2%; 5-year fixes may be stressed at the pay rate). SDLT uses England & NI rates from 1 April 2025 plus the 5% higher-rates surcharge (from 31 October 2024); Scotland and Wales have their own taxes. Most BTL mortgages are interest-only.",
    faq: [
      { question: "How much can I borrow on a buy-to-let mortgage?", answer: "Usually the lower of 75% of the price and the loan your rent covers at 125–145% of interest at a stress rate." },
      { question: "How much rent do I need for a buy-to-let mortgage?", answer: "Roughly loan × stress rate × 125% (or 145%) ÷ 12 — about £1,246 a month for £187,500 at 5.5% and 145%." },
    ],
  },
  {
    slug: "airbnb-mortgage-calculator",
    title: "Airbnb Mortgage Calculator",
    category: STR,
    description: "Check whether a short-term rental qualifies for an Airbnb (DSCR) mortgage — lender-adjusted STR revenue vs the full payment, the DSCR, the largest loan it supports and your cash flow after expenses.",
    metaTitle: "Airbnb Mortgage Calculator — DSCR Loan for Short-Term Rentals",
    metaDescription: "Free Airbnb mortgage calculator. See the DSCR on a short-term rental loan, whether it qualifies, the max loan and monthly cash flow.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 450000, max: 20000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 25, max: 100, step: 1 }),
      percentField("interestRate", "DSCR Loan Rate", { default: 7.75, max: 15, step: 0.125 }),
      dropdown("loanTerm", "Loan Term", [["30 Years", 30], ["40 Years (Interest-Only Options Vary)", 40]], 30),
      currencyField("monthlyTaxes", "Monthly Property Tax", { default: 450, max: 20000 }),
      currencyField("monthlyInsurance", "Monthly STR Insurance", { default: 250, max: 10000 }),
      currencyField("monthlyHoa", "Monthly HOA", { default: 0, max: 5000, required: false }),
      currencyField("projectedRevenue", "Projected Yearly STR Revenue (AirDNA / History)", { default: 72000, max: 5000000, step: 500 }),
      percentField("lenderHaircut", "Share of Revenue the Lender Counts", { default: 80, max: 100, step: 5 }),
      numberField("targetDscr", "Lender's Minimum DSCR", { default: 1, min: 0.75, max: 1.5, step: 0.05 }),
      percentField("operatingExpensePercent", "Your Operating Expenses (% of Revenue)", { default: 35, max: 70, step: 1 }),
    ],
    calcResult: { label: "DSCR", format: "number" },
    calcResults: [
      { key: "dscr", label: "Debt Service Coverage Ratio", format: "number", decimals: 2, highlight: true },
      { key: "monthlyPitia", label: "Monthly PITIA", format: "currency" },
      { key: "qualifyingMonthlyIncome", label: "Qualifying Monthly STR Income", format: "currency" },
      { key: "meetsTargetDscr", label: "Meets Lender DSCR? (1 = Yes)", format: "number" },
      { key: "maxLoanAtTargetDscr", label: "Max Loan at the Lender's DSCR", format: "currency" },
      { key: "monthlyCashFlow", label: "Your Monthly Cash Flow After Expenses", format: "currency" },
    ],
    instructions: "Enter the price, down payment and DSCR loan terms, plus monthly taxes, STR insurance and HOA. For income, use the property's booking history or an AirDNA-style projection, and the share your lender counts (many use 75–80%).",
    examples: "Example: a $450,000 STR with 25% down at 7.75% has a $3,117.89 PITIA. $72,000 of projected revenue counted at 80% is $4,800 a month, a DSCR of 1.54 — it qualifies, and could support a loan of about $572,300 at a 1.0 DSCR. After 35% operating costs, cash flow is about $782 a month.",
    assumptions: "DSCR = qualifying rent ÷ PITIA (principal, interest, taxes, insurance and HOA). Lenders typically need 20–25% down, a 660–700+ credit score, 1.0–1.25 DSCR and reserves, and check local STR rules. Operating expenses (cleaning, supplies, utilities, platform fees) aren't in the DSCR but affect your real cash flow.",
    faq: [
      { question: "Can you get a mortgage based on Airbnb income?", answer: "Yes — DSCR lenders qualify the property on projected or actual short-term rental income instead of your personal income." },
      { question: "What DSCR do I need for an Airbnb loan?", answer: "Usually 1.0–1.25, with some lenders going lower for higher rates or bigger down payments." },
    ],
  },
  {
    slug: "airbnb-price-calculator",
    title: "Airbnb Price Calculator",
    category: STR,
    description: "Set your Airbnb nightly price — the rate you need to cover your mortgage or rent, utilities, cleaning and host fees and still hit your profit goal, plus your break-even rate and the price guests see per stay.",
    metaTitle: "Airbnb Price Calculator — What Should I Charge per Night?",
    metaDescription: "Free Airbnb price calculator. Find the nightly rate for your target profit, your break-even rate and the guest price per stay after fees and cleaning.",
    calcInputs: [
      currencyField("monthlyFixedCosts", "Monthly Fixed Costs (Mortgage/Rent, Utilities, Insurance)", { default: 2800, max: 100000 }),
      currencyField("targetMonthlyProfit", "Target Monthly Profit", { default: 1000, max: 100000 }),
      percentField("occupancyRate", "Expected Occupancy", { default: 65, max: 100, step: 1 }),
      numberField("averageStayNights", "Average Stay (Nights)", { default: 3, min: 1, max: 30, step: 0.5 }),
      percentField("hostFeePercent", "Airbnb Host Fee (3% Split or 15.5% Host-Only)", { default: 3, max: 20, step: 0.5 }),
      currencyField("cleaningFeeCharged", "Cleaning Fee Charged per Stay", { default: 100, max: 1000 }),
      currencyField("cleaningCostPerStay", "Your Cleaning Cost per Stay", { default: 80, max: 1000 }),
      currencyField("suppliesPerStay", "Supplies per Stay", { default: 15, max: 500, required: false }),
    ],
    calcResult: { label: "Nightly Rate Needed", format: "currency" },
    calcResults: [
      { key: "nightlyRateNeeded", label: "Nightly Rate for Your Profit Goal", format: "currency", highlight: true },
      { key: "breakEvenNightlyRate", label: "Break-Even Nightly Rate", format: "currency" },
      { key: "bookedNightsPerMonth", label: "Booked Nights per Month", format: "number", decimals: 1 },
      { key: "staysPerMonth", label: "Stays per Month", format: "number", decimals: 1 },
      { key: "guestPricePerStay", label: "Price per Average Stay (Before Guest Fees & Taxes)", format: "currency" },
      { key: "monthlyGrossRevenue", label: "Monthly Gross Revenue", format: "currency" },
    ],
    instructions: "Enter your monthly fixed costs, the profit you want, the occupancy you expect and your average stay. Choose your host fee — 3% with the split fee, or about 15.5% if you're on host-only fees — and your cleaning fee and costs.",
    examples: "Example: $2,800 of monthly costs, a $1,000 profit goal, 65% occupancy and 3-night stays need about $197.46 a night (break-even about $145.32) with a $100 cleaning fee — about $692 for an average stay.",
    assumptions: "Booked nights = 30.4 × occupancy; stays = nights ÷ average stay. The host fee comes off the nightly rate and cleaning fee. Guest service fees and occupancy taxes are added on top for guests and aren't your revenue. Check comparable listings — the market sets the ceiling, and dynamic pricing usually beats a flat rate.",
    faq: [
      { question: "How do I price my Airbnb?", answer: "Work out the rate that covers your costs at realistic occupancy, then compare with similar listings nearby and adjust by season and day of week." },
      { question: "What is the Airbnb host fee?", answer: "About 3% under the split-fee model, or around 15.5% when the host pays the whole fee." },
    ],
  },
  {
    slug: "airbnb-tax-calculator",
    title: "Airbnb Tax Calculator",
    category: STR,
    description: "Understand Airbnb taxes — the lodging and occupancy taxes on bookings, income tax on your rental profit, the 14-day tax-free rule, personal-use limits and self-employment tax when you provide hotel-like services.",
    metaTitle: "Airbnb Tax Calculator — Understanding Airbnb Taxes",
    metaDescription: "Free Airbnb tax calculator. Estimate occupancy taxes, income tax on rental profit, the 14-day rule and self-employment tax on short-term rentals.",
    calcInputs: [
      currencyField("grossRentalIncome", "Gross Rental Income (Year)", { default: 50000, max: 5000000, step: 100 }),
      numberField("rentalDays", "Days Rented", { default: 220, max: 366 }),
      numberField("personalDays", "Days of Personal Use", { default: 10, max: 366, required: false }),
      percentField("stateLodgingTax", "State Lodging / Sales Tax", { default: 6, max: 15, step: 0.25, required: false }),
      percentField("localLodgingTax", "Local Occupancy Tax", { default: 5, max: 15, step: 0.25, required: false }),
      currencyField("expenses", "Operating Expenses (Cleaning, Fees, Utilities, Interest, Tax)", { default: 22000, max: 5000000, step: 100 }),
      currencyField("depreciation", "Depreciation", { default: 9000, max: 1000000, step: 100, required: false }),
      YN("substantialServices", "You Provide Hotel-Like Services (Meals, Daily Cleaning)", 0),
      percentField("marginalTaxRate", "Your Federal Marginal Tax Rate", { default: 22, max: 37, step: 1 }),
    ],
    calcResult: { label: "Total Income Tax", format: "currency" },
    calcResults: [
      { key: "totalTax", label: "Income & Self-Employment Tax", format: "currency", highlight: true },
      { key: "lodgingTaxes", label: "Lodging / Occupancy Taxes on Bookings", format: "currency" },
      { key: "taxableRentalProfit", label: "Taxable Rental Profit", format: "currency" },
      { key: "incomeTax", label: "Federal Income Tax", format: "currency" },
      { key: "selfEmploymentTax", label: "Self-Employment Tax", format: "currency" },
      { key: "afterTaxProfit", label: "Profit After Income Tax", format: "currency" },
      { key: "fourteenDayRuleApplies", label: "Rented 14 Days or Less — Tax-Free? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter the year's gross rental income, the days rented and days you used the place yourself. Add your state and local lodging tax rates, your operating expenses and depreciation, and your federal tax bracket. Mark hotel-like services if you provide them.",
    examples: "Example: $50,000 of income over 220 nights with $22,000 of expenses and $9,000 of depreciation leaves $19,000 of taxable profit — $4,180.00 of federal tax at 22%. Booking guests also paid about $5,500 of lodging taxes, which Airbnb collects and remits in many areas.",
    assumptions: "Renting 14 days or less a year is tax-free (IRC §280A). With personal use over 14 days or 10% of rental days, expenses are split by use and losses are limited. Short-term rentals with average stays of 7 days or less aren't 'rental activities' for passive-loss rules, and substantial services make it a business subject to self-employment tax. State income tax isn't included.",
    faq: [
      { question: "Do I have to pay taxes on Airbnb income?", answer: "Yes, unless you rent the home 14 days or less in the year. Profit is taxed as ordinary income." },
      { question: "Does Airbnb collect occupancy taxes?", answer: "In many states and cities it collects and remits them for you; elsewhere you must register and pay them yourself." },
    ],
  },
  {
    slug: "midterm-rental-calculator",
    title: "Midterm Rental Calculator",
    category: STR,
    description: "Compare a furnished midterm rental (30+ day stays for travel nurses, relocations and insurance housing) with a long-term lease — revenue, costs, cash flow and the occupancy you need to come out ahead.",
    metaTitle: "Midterm Rental Calculator — Furnished 30-Day Rental vs Long-Term",
    metaDescription: "Free midterm rental calculator. Compare a furnished 30+ day rental with a long-term lease and find the break-even occupancy.",
    calcInputs: [
      currencyField("monthlyFurnishedRent", "Monthly Furnished Rent", { default: 3600, max: 50000 }),
      percentField("occupancyRate", "Occupancy", { default: 85, max: 100, step: 1 }),
      numberField("averageStayMonths", "Average Stay (Months)", { default: 3, min: 1, max: 12, step: 0.5 }),
      currencyField("utilities", "Monthly Utilities & Internet (You Pay)", { default: 250, max: 5000 }),
      currencyField("platformFeesPerYear", "Listing / Platform Fees per Year", { default: 189, max: 10000 }),
      currencyField("turnoverCost", "Cleaning & Turnover Cost per Stay", { default: 250, max: 5000 }),
      currencyField("furnishingCost", "Furnishing Cost", { default: 12000, max: 200000, step: 100 }),
      numberField("furnishingLifeMonths", "Furnishing Life (Months)", { default: 60, min: 6, max: 240 }),
      percentField("managementPercent", "Management Fee", { default: 0, max: 30, step: 1, required: false }),
      currencyField("mortgageAndCarry", "Mortgage, Tax, Insurance & HOA per Month", { default: 1900, max: 50000 }),
      currencyField("longTermRent", "Long-Term Unfurnished Rent", { default: 2300, max: 50000 }),
      percentField("longTermVacancy", "Long-Term Vacancy", { default: 5, max: 30, step: 1 }),
    ],
    calcResult: { label: "Midterm Advantage", format: "currency" },
    calcResults: [
      { key: "midTermAdvantage", label: "Midterm Rental Earns More By (Monthly)", format: "currency", highlight: true },
      { key: "midTermCashFlow", label: "Midterm Monthly Cash Flow", format: "currency" },
      { key: "longTermCashFlow", label: "Long-Term Monthly Cash Flow", format: "currency" },
      { key: "monthlyRevenue", label: "Midterm Monthly Revenue", format: "currency" },
      { key: "monthlyOperatingCosts", label: "Midterm Operating Costs", format: "currency" },
      { key: "occupancyToMatchLongTerm", label: "Occupancy Needed to Match Long-Term", format: "percentage" },
    ],
    instructions: "Enter the furnished monthly rent you'd charge, expected occupancy and average stay, and the costs you take on — utilities, listing fees, turnover cleaning and furnishing. Then the long-term rent you'd get unfurnished and your monthly carrying costs.",
    examples: "Example: a $3,600 furnished unit at 85% occupancy earns $3,060 a month; after $537 of utilities, fees, turnovers and furniture wear and $1,900 of carrying costs, it cash-flows $623.42 vs $285.00 as a $2,300 long-term rental — $338.42 more. It needs about 75% occupancy to match.",
    assumptions: "Midterm stays of 30+ days usually avoid short-term rental bans and hotel taxes and are treated as tenancies in many states (check local landlord-tenant law). Furnished rents often run 20–50% above unfurnished. Furnishing cost is spread over its useful life.",
    faq: [
      { question: "What is a midterm rental?", answer: "A furnished rental for 1–6 months, popular with travel nurses, relocating workers and families displaced by insurance claims." },
      { question: "Are midterm rentals more profitable than long-term rentals?", answer: "Often 20–40% more revenue, but with more vacancy, turnover and furnishing costs to manage." },
    ],
  },
  {
    slug: "rental-arbitrage-calculator",
    title: "Rental Arbitrage Calculator",
    category: STR,
    description: "Analyze Airbnb rental arbitrage — lease an apartment and host it as a short-term rental: monthly profit after rent and hosting costs, payback on setup costs, yearly return and break-even occupancy.",
    metaTitle: "Rental Arbitrage Calculator — Airbnb Arbitrage Profit",
    metaDescription: "Free rental arbitrage calculator. See Airbnb arbitrage profit, setup payback, ROI and the break-even occupancy on a leased unit.",
    calcInputs: [
      currencyField("monthlyLeaseRent", "Monthly Lease Rent", { default: 2000, max: 50000 }),
      currencyField("monthlyInsurance", "Monthly STR Liability Insurance", { default: 40, max: 2000, required: false }),
      ...strInputs({ nightly: 160, occ: 70, cleaningFee: 90, cleaningCost: 80, supplies: 15, utilities: 300 }),
      currencyField("furnishingCost", "Furniture & Setup", { default: 12000, max: 200000, step: 100 }),
      currencyField("securityDeposit", "Security Deposit & First Month", { default: 2000, max: 50000, step: 100, required: false }),
      currencyField("otherSetupCosts", "Permits, Photos & Other Setup", { default: 2000, max: 50000, step: 100, required: false }),
    ],
    calcResult: { label: "Monthly Profit", format: "currency" },
    calcResults: [
      { key: "monthlyProfit", label: "Monthly Profit", format: "currency", highlight: true },
      { key: "monthlyRevenue", label: "Monthly Revenue", format: "currency" },
      { key: "setupCost", label: "Total Setup Cost", format: "currency" },
      { key: "paybackMonths", label: "Months to Pay Back Setup", format: "number", decimals: 1 },
      { key: "yearlyReturnOnSetup", label: "Yearly Return on Setup Cost", format: "percentage" },
      { key: "breakEvenOccupancy", label: "Break-Even Occupancy", format: "percentage" },
    ],
    instructions: "Enter the lease rent, your nightly rate, occupancy, average stay and hosting costs, then the cash you'll put in to set the unit up. Only proceed with a landlord who allows subletting as a short-term rental in writing.",
    examples: "Example: leasing a unit for $2,000 and hosting it at $160 a night with 70% occupancy earns about $4,045 a month; after fees, cleaning, utilities and insurance, profit is about $909.82. $16,000 of setup pays back in about 17.6 months — and occupancy must stay above about 50% to break even.",
    assumptions: "You carry the lease whether or not guests book, so the break-even occupancy is your real risk measure. Many cities require STR permits or limit non-owner-occupied short-term rentals; leases usually forbid subletting without consent. Seasonal swings can make some months negative.",
    faq: [
      { question: "Is Airbnb rental arbitrage legal?", answer: "Only with your landlord's written permission and where local short-term rental rules allow it." },
      { question: "How much can you make with rental arbitrage?", answer: "Often a few hundred to a couple of thousand dollars a month per unit, but profit is very sensitive to occupancy." },
    ],
  },
  {
    slug: "rent-vs-airbnb-calculator",
    title: "Rent vs Airbnb Calculator",
    category: STR,
    description: "Decide whether to rent your property long-term or list it on Airbnb — monthly cash flow both ways after vacancy, management, cleaning, utilities, furnishing and fees, and the occupancy Airbnb needs to win.",
    metaTitle: "Rent vs Airbnb Calculator — Long-Term vs Short-Term Rental",
    metaDescription: "Free rent vs Airbnb calculator. Compare long-term rental and Airbnb cash flow and find the occupancy a short-term rental needs to come out ahead.",
    calcInputs: [
      currencyField("mortgageAndCarry", "Mortgage, Tax, Insurance & HOA per Month", { default: 2200, max: 50000 }),
      currencyField("longTermRent", "Long-Term Monthly Rent", { default: 2600, max: 50000 }),
      percentField("longTermVacancy", "Long-Term Vacancy", { default: 5, max: 30, step: 1 }),
      percentField("ltrManagementPercent", "Long-Term Management Fee", { default: 8, max: 15, step: 0.5, required: false }),
      currencyField("ltrMaintenance", "Long-Term Repairs per Month", { default: 150, max: 5000, required: false }),
      ...strInputs({ nightly: 190, occ: 65, cleaningFee: 100, cleaningCost: 90, supplies: 20, utilities: 350 }),
      currencyField("furnishingCost", "Furnishing Cost (Spread over 5 Years)", { default: 15000, max: 200000, step: 100 }),
    ],
    calcResult: { label: "Airbnb Advantage", format: "currency" },
    calcResults: [
      { key: "airbnbAdvantage", label: "Airbnb Earns More By (Monthly)", format: "currency", highlight: true },
      { key: "shortTermCashFlow", label: "Airbnb Monthly Cash Flow", format: "currency" },
      { key: "longTermCashFlow", label: "Long-Term Monthly Cash Flow", format: "currency" },
      { key: "shortTermRevenue", label: "Airbnb Monthly Revenue", format: "currency" },
      { key: "occupancyToMatchLongTerm", label: "Occupancy Needed to Match Long-Term", format: "percentage" },
    ],
    instructions: "Enter your monthly carrying costs, then the long-term rent with vacancy, management and repairs. For Airbnb, enter a realistic nightly rate and occupancy from comparable listings, your fees, cleaning and utilities, and the cost of furnishing.",
    examples: "Example: with $2,200 of carrying costs, a $2,600 long-term rent cash-flows −$77.60 a month. As an Airbnb at $190 a night and 65% occupancy it earns about $4,415 and cash-flows about $758 — $835.69 more. Airbnb only needs about 50% occupancy to match the long-term rent.",
    assumptions: "Airbnb utilities, supplies and cleaning are on you; furniture is spread over 60 months. Short-term rentals take more time (or a 15–25% co-host fee), face local permit rules and occupancy taxes, and swing with the seasons; long-term rentals are steadier. Taxes on the income aren't included.",
    faq: [
      { question: "Is Airbnb more profitable than renting long-term?", answer: "Often in tourist and business-travel areas with occupancy above 50–60%, but it costs more time and money to run." },
      { question: "What occupancy does an Airbnb need?", answer: "Enough to beat long-term rent after cleaning, utilities and fees — this calculator shows that break-even occupancy." },
    ],
  },
];

async function main() {
  const categoryIds = new Map<string, string>();
  for (const slug of new Set(TOOLS.map((t) => t.category))) {
    const c = await prisma.toolCategory.findUnique({ where: { slug } });
    if (!c) throw new Error(`The "${slug}" category doesn't exist — run "npx tsx prisma/restructure-real-estate-main-category.ts --apply" first.`);
    categoryIds.set(slug, c.id);
  }

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: categoryIds.get(def.category)!,
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
  console.log("New tools are created with status Draft — review them in /admin/tools and publish when ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
