// One-time (but safe to re-run) batch setup script: creates 8 home value, equity & selling
// tools from the user's real estate list (Real Estate Calculators > Home Value, Equity & Selling).
// See src/lib/calc-engine-re-selling.ts for the math.
//
// HOW TO RUN (after prisma/restructure-real-estate-main-category.ts --apply)
//   npx tsx prisma/create-re-selling-calculators.ts
// or
//   npm run db:create-re-selling-calculators

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

const CAT = "home-value-equity-selling-calculators";

const comp = (i: number, price: number, sqft: number, beds: number, baths: number) => [
  currencyField(`comp${i}Price`, `Comp ${i}: Sale Price`, { default: price, max: 20000000, step: 1000, required: i === 1 }),
  numberField(`comp${i}SqFt`, `Comp ${i}: Square Feet`, { default: sqft, max: 50000, required: false }),
  numberField(`comp${i}Beds`, `Comp ${i}: Bedrooms`, { default: beds, max: 20, required: false }),
  numberField(`comp${i}Baths`, `Comp ${i}: Bathrooms`, { default: baths, max: 20, step: 0.5, required: false }),
  numberField(`comp${i}OtherAdjustment`, `Comp ${i}: Other Adjustment ($, + or −)`, { default: i === 3 ? -5000 : 0, min: -500000, max: 500000, step: 500, required: false }),
];

const TOOLS: ToolDef[] = [
  {
    slug: "home-appraisal-calculator",
    title: "Home Appraisal Calculator",
    category: CAT,
    description: "Estimate what your home will appraise for the way appraisers do it — adjust three comparable sales for size, bedrooms, bathrooms and other differences, then average them. Works as a comparative market analysis (CMA) too.",
    metaTitle: "Home Appraisal Calculator — Comparable Sales Estimate",
    metaDescription: "Free home appraisal calculator. Adjust three comparable sales for size, bedrooms, bathrooms and features to estimate your home's appraised value (CMA).",
    calcInputs: [
      numberField("subjectSqFt", "Your Home: Square Feet", { default: 2000, min: 100, max: 50000 }),
      numberField("subjectBeds", "Your Home: Bedrooms", { default: 3, max: 20 }),
      numberField("subjectBaths", "Your Home: Bathrooms", { default: 2, max: 20, step: 0.5 }),
      currencyField("perSqFtAdjustment", "Adjustment per Square Foot of Difference", { default: 100, max: 1000 }),
      currencyField("perBedroomAdjustment", "Adjustment per Bedroom", { default: 10000, max: 200000, step: 500 }),
      currencyField("perBathAdjustment", "Adjustment per Bathroom", { default: 7500, max: 100000, step: 500 }),
      ...comp(1, 410000, 2100, 3, 2),
      ...comp(2, 395000, 1900, 3, 2.5),
      ...comp(3, 420000, 2050, 4, 2),
    ],
    calcResult: { label: "Estimated Appraised Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Appraised Value", format: "currency", highlight: true },
      { key: "lowAdjustedComp", label: "Lowest Adjusted Comp", format: "currency" },
      { key: "highAdjustedComp", label: "Highest Adjusted Comp", format: "currency" },
      { key: "valuePerSqFt", label: "Value per Square Foot", format: "currency" },
      { key: "comp1Adjusted", label: "Comp 1 Adjusted", format: "currency" },
      { key: "comp2Adjusted", label: "Comp 2 Adjusted", format: "currency" },
      { key: "comp3Adjusted", label: "Comp 3 Adjusted", format: "currency" },
    ],
    instructions: "Enter your home's size, bedrooms and bathrooms. Add three recent nearby sales of similar homes (ideally sold in the last 3–6 months within a mile). Set the market's adjustment values — what an extra square foot, bedroom or bathroom adds — and use 'Other Adjustment' for things like a pool, garage, lot or condition (positive if your home is better).",
    examples: "Example: for a 2,000 sq ft, 3-bed, 2-bath home, a 2,100 sq ft comp at $410,000 adjusts to $400,000 (−100 sq ft × $100), a 1,900 sq ft 2.5-bath comp at $395,000 to $401,250, and a 4-bed comp at $420,000 with a better kitchen to $400,000. The estimate is $400,416.67.",
    assumptions: "Comps are adjusted toward your home: a comp that is bigger or better is adjusted down, smaller or worse up. Equal weighting is used; appraisers give the closest comps more weight. Adjustment values vary by market — a per-square-foot adjustment is usually well below the area's average price per square foot. A licensed appraiser's report is the final word.",
    faq: [
      { question: "How do appraisers value a home?", answer: "Mostly with the sales comparison approach: recent nearby sales adjusted for differences in size, rooms, condition and features." },
      { question: "What is a CMA?", answer: "A comparative market analysis — an agent's estimate of value from comparable sales, using the same method as this calculator." },
    ],
  },
  {
    slug: "assessed-value-vs-market-value-calculator",
    title: "Assessed Value vs Market Value Calculator",
    category: CAT,
    description: "Compare your property's assessed value with its market value — the assessment ratio, how much you may be over-assessed and the property tax it costs you each year, so you know if an appeal is worth it.",
    metaTitle: "Assessed Value vs Market Value Calculator — Tax Appeal Check",
    metaDescription: "Free assessed value vs market value calculator. Find your assessment ratio, over-assessment and the yearly property tax you may be overpaying.",
    calcInputs: [
      currencyField("marketValue", "Market Value (Recent Appraisal or Comps)", { default: 350000, max: 20000000, step: 1000 }),
      currencyField("assessedValue", "Assessed Value on Your Notice", { default: 400000, max: 20000000, step: 1000 }),
      percentField("legalRatio", "Legal Assessment Ratio in Your Area", { default: 100, max: 100, step: 0.5 }),
      numberField("millRate", "Tax Rate (Mills per $1,000 of Assessed Value)", { default: 20, max: 200, step: 0.01 }),
    ],
    calcResult: { label: "Yearly Tax Overpaid", format: "currency" },
    calcResults: [
      { key: "yearlyTaxOverpaid", label: "Yearly Tax You May Be Overpaying", format: "currency", highlight: true },
      { key: "actualAssessmentRatio", label: "Your Actual Assessment Ratio", format: "percentage" },
      { key: "fairAssessedValue", label: "Fair Assessed Value", format: "currency" },
      { key: "overAssessment", label: "Over-Assessment (Negative = Under)", format: "currency" },
      { key: "currentTax", label: "Current Property Tax", format: "currency" },
      { key: "taxAtFairAssessment", label: "Tax at the Fair Assessment", format: "currency" },
      { key: "worthAppealing", label: "Over-Assessed by 5%+? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter what your home would sell for and the assessed value on your notice. Enter the legal assessment ratio (100% in many places, 70% in Connecticut and 33⅓% in Illinois outside Cook County — check yours) and the mill rate from your tax bill.",
    examples: "Example: a home worth $350,000 assessed at $400,000 in a 100% area has a 114.29% ratio — $50,000 over. At 20 mills, that costs $1,000.00 a year in extra tax, so an appeal is worth looking at.",
    assumptions: "Mills are dollars of tax per $1,000 of assessed value (20 mills = 2%). Exemptions such as a homestead exemption lower the taxable value further and aren't included. Most areas give you 30–90 days after the notice to appeal; evidence from 3–5 recent comparable sales carries the most weight.",
    faq: [
      { question: "What is the difference between assessed value and market value?", answer: "Market value is what the home would sell for; assessed value is what the local assessor uses to calculate tax, often a set percentage of market value." },
      { question: "When should I appeal my property tax assessment?", answer: "When your assessment ratio is clearly above the legal ratio — say 5% or more — and you have comparable sales to prove it." },
    ],
  },
  {
    slug: "divorce-buyout-calculator",
    title: "Divorce Buyout Calculator",
    category: CAT,
    description: "Work out how much it costs to buy out your spouse's share of the house in a divorce — home equity, each spouse's share with separate-property credits, and the refinance loan and payment needed.",
    metaTitle: "Divorce Buyout Calculator — House Buyout & Refinance",
    metaDescription: "Free divorce buyout calculator. Find the buyout amount for your spouse's share of home equity, the new refinance loan and the monthly payment.",
    calcInputs: [
      currencyField("homeValue", "Home Value", { default: 500000, max: 20000000, step: 1000 }),
      currencyField("mortgageBalance", "Mortgage Balance", { default: 250000, max: 20000000, step: 1000 }),
      YN("deductSellingCosts", "Deduct Hypothetical Selling Costs from Equity", 0),
      percentField("sellingCostPercent", "Selling Costs (If Deducted)", { default: 6, max: 12, step: 0.5, required: false }),
      percentField("leavingSharePercent", "Leaving Spouse's Share of Marital Equity", { default: 50, max: 100, step: 1 }),
      currencyField("leavingSpouseCredit", "Leaving Spouse's Separate-Property Credit", { default: 0, max: 5000000, step: 500, required: false }),
      currencyField("stayingSpouseCredit", "Staying Spouse's Separate-Property Credit", { default: 0, max: 5000000, step: 500, required: false }),
      currencyField("refinanceCosts", "Refinance Closing Costs (Rolled In)", { default: 5000, max: 100000, step: 100, required: false }),
      percentField("newRate", "New Mortgage Rate", { default: 6.5, max: 15, step: 0.125 }),
      dropdown("newTerm", "New Loan Term", [["30 Years", 30], ["20 Years", 20], ["15 Years", 15]], 30),
    ],
    calcResult: { label: "Buyout Amount", format: "currency" },
    calcResults: [
      { key: "buyoutAmount", label: "Buyout Owed to the Leaving Spouse", format: "currency", highlight: true },
      { key: "totalEquity", label: "Total Home Equity", format: "currency" },
      { key: "maritalEquity", label: "Marital Equity (After Credits)", format: "currency" },
      { key: "newLoanAmount", label: "New Loan to Pay Off Mortgage + Buyout", format: "currency" },
      { key: "newMonthlyPayment", label: "New Monthly Payment (P&I)", format: "currency" },
      { key: "newLoanToValue", label: "New Loan-to-Value", format: "percentage" },
    ],
    instructions: "Enter the home's value (an appraisal both sides accept is best) and the mortgage balance. Enter the leaving spouse's share — 50% in community property states, often different in equitable distribution states — and any separate-property credits, such as a down payment from one spouse's pre-marriage savings.",
    examples: "Example: a $500,000 home with a $250,000 mortgage has $250,000 of equity. A 50% buyout is $125,000.00. Refinancing the mortgage plus the buyout and $5,000 of costs means a $380,000 loan — $2,401.86 a month at 6.5% — at 76% loan-to-value.",
    assumptions: "Separate-property credits are taken out of equity first and returned to the spouse who contributed them; the rest is split by the share you enter. Cash-out refinance limits (often 80% LTV conventional) can cap the buyout; Fannie Mae allows an 'equity buyout' as a limited cash-out refi when the agreement requires it. The divorce agreement or court order decides the actual split.",
    faq: [
      { question: "How do you calculate a house buyout in a divorce?", answer: "Take the home's value, subtract the mortgage (and any agreed costs and credits), then pay the leaving spouse their share of that equity." },
      { question: "Do I have to refinance to buy out my spouse?", answer: "Usually yes — to remove their name from the loan and get the cash. Some loans allow an assumption with lender approval." },
    ],
  },
  {
    slug: "cash-offer-calculator",
    title: "Cash Offer Calculator",
    category: CAT,
    description: "Compare a cash or iBuyer offer on your home with listing it — service fees and repair deductions vs agent commission, closing costs, repairs, prep and holding costs — to see which nets you more.",
    metaTitle: "Cash Offer Calculator — Cash Offer vs Listing Your Home",
    metaDescription: "Free cash offer calculator. Compare a cash or iBuyer offer with an open-market sale after fees, repairs, commission and holding costs.",
    calcInputs: [
      currencyField("marketPrice", "Expected Sale Price on the Market", { default: 400000, max: 20000000, step: 1000 }),
      currencyField("mortgageBalance", "Mortgage Balance", { default: 200000, max: 20000000, step: 1000, required: false }),
      percentField("commissionPercent", "Agent Commission (Listing)", { default: 5.5, max: 10, step: 0.25 }),
      percentField("closingCostPercent", "Seller Closing Costs (Listing)", { default: 1.5, max: 5, step: 0.25 }),
      currencyField("repairsAndConcessions", "Repairs & Buyer Concessions (Listing)", { default: 5000, max: 500000, step: 500, required: false }),
      currencyField("prepCosts", "Staging, Cleaning & Prep (Listing)", { default: 3000, max: 100000, step: 100, required: false }),
      currencyField("monthlyHoldingCost", "Monthly Holding Cost (Mortgage, Tax, Utilities)", { default: 2500, max: 50000, step: 50, required: false }),
      numberField("monthsToSell", "Months to Sell and Close (Listing)", { default: 3, max: 24, step: 0.5, required: false }),
      currencyField("cashOfferAmount", "Cash Offer Amount", { default: 370000, max: 20000000, step: 1000 }),
      percentField("serviceFeePercent", "Cash Buyer Service Fee", { default: 5, max: 15, step: 0.25, required: false }),
      currencyField("cashRepairDeduction", "Repair Deduction from Cash Offer", { default: 8000, max: 500000, step: 500, required: false }),
      percentField("cashClosingPercent", "Seller Closing Costs (Cash Sale)", { default: 1, max: 5, step: 0.25, required: false }),
    ],
    calcResult: { label: "Listing Nets More By", format: "currency" },
    calcResults: [
      { key: "listingNetsMore", label: "Listing Nets More By (Negative = Cash Wins)", format: "currency", highlight: true },
      { key: "netFromListing", label: "Your Net from Listing", format: "currency" },
      { key: "netFromCashOffer", label: "Your Net from the Cash Offer", format: "currency" },
      { key: "cashOfferPercentOfMarket", label: "Cash Offer as % of Market Price", format: "percentage" },
      { key: "effectiveCostOfCash", label: "Total Cost of the Cash Sale (% of Market)", format: "percentage" },
    ],
    instructions: "Enter what the home would likely sell for on the market and your mortgage balance. Fill in listing costs — commission, closing costs, repairs, prep and the months of carrying costs. Then enter the cash offer with any service fee and repair deduction.",
    examples: "Example: listing a $400,000 home nets $156,500.00 after a $200,000 mortgage, 7% in commission and closing costs, $8,000 of repairs and prep, and three months of $2,500 holding costs. A $370,000 cash offer with a 5% fee and an $8,000 repair deduction nets $139,800.00 — listing wins by $16,700.00.",
    assumptions: "Cash buyers trade a lower net for speed and certainty: no showings, no financing risk and a closing in days. iBuyer fees commonly run 5–8% plus repair deductions after inspection. Commission is negotiable and has been more visible since the 2024 NAR settlement.",
    faq: [
      { question: "Is a cash offer on a house worth it?", answer: "When speed or certainty matters more than price — the cash net is often 5–15% below an open-market sale after all costs." },
      { question: "How much less is a cash offer?", answer: "Investor offers are often 70–85% of market value; iBuyers closer to market value but with fees and repair deductions." },
    ],
  },
  {
    slug: "buying-and-selling-home-calculator",
    title: "Buying and Selling Home Calculator",
    category: CAT,
    description: "Plan selling your home and buying the next one — net sale proceeds, the down payment it gives you, your new loan and payment, the cost of carrying two homes and the cash you'd need to buy before you sell.",
    metaTitle: "Buying and Selling Home Calculator — Sell & Buy at Once",
    metaDescription: "Free buying and selling a home calculator. See your sale proceeds, new down payment and mortgage, overlap costs and the cash needed to buy first.",
    calcInputs: [
      currencyField("currentValue", "Current Home Sale Price", { default: 400000, max: 20000000, step: 1000 }),
      currencyField("currentBalance", "Current Mortgage Balance", { default: 220000, max: 20000000, step: 1000 }),
      percentField("sellingCostPercent", "Selling Costs", { default: 7, max: 12, step: 0.5 }),
      currencyField("newPrice", "New Home Price", { default: 550000, max: 20000000, step: 1000 }),
      percentField("buyingCostPercent", "Buying Closing Costs", { default: 3, max: 8, step: 0.25 }),
      currencyField("cashReserve", "Cash to Keep in Reserve", { default: 10000, max: 1000000, step: 500, required: false }),
      currencyField("extraSavings", "Extra Savings Toward the Down Payment", { default: 0, max: 5000000, step: 500, required: false }),
      percentField("newRate", "New Mortgage Rate", { default: 6.5, max: 15, step: 0.125 }),
      dropdown("newTerm", "New Loan Term", [["30 Years", 30], ["20 Years", 20], ["15 Years", 15]], 30),
      currencyField("currentMonthlyPayment", "Current Monthly Housing Payment", { default: 1600, max: 50000, required: false }),
      numberField("overlapMonths", "Months You'd Own Both Homes", { default: 2, max: 24, step: 0.5, required: false }),
    ],
    calcResult: { label: "New Monthly Payment", format: "currency" },
    calcResults: [
      { key: "newMonthlyPayment", label: "New Monthly Payment (P&I)", format: "currency", highlight: true },
      { key: "netSaleProceeds", label: "Net Proceeds from Your Sale", format: "currency" },
      { key: "downPaymentAvailable", label: "Down Payment Available", format: "currency" },
      { key: "downPaymentPercent", label: "Down Payment %", format: "percentage" },
      { key: "newLoanAmount", label: "New Loan Amount", format: "currency" },
      { key: "overlapCost", label: "Cost of Owning Both Homes", format: "currency" },
      { key: "cashNeededToBuyFirst", label: "Cash Needed to Buy Before Selling", format: "currency" },
    ],
    instructions: "Enter your expected sale price, mortgage balance and selling costs, then the new home's price and closing costs. Decide how much cash to keep in reserve. If you might own both homes for a while, add your current payment and the months of overlap.",
    examples: "Example: selling for $400,000 with $220,000 owed and 7% costs leaves $152,000.00. After $16,500 of buying costs and a $10,000 reserve, $125,500.00 goes down on a $550,000 home (22.8%), so the new loan is $424,500 and the payment $2,683.13. Two months of overlap costs $3,200.00.",
    assumptions: "To buy first you need the down payment and closing costs before your sale closes — from savings, a HELOC on your current home, a bridge loan or a home sale contingency. Lenders count both payments in your DTI unless the current home is under contract. The 20% down mark avoids PMI on a conventional loan.",
    faq: [
      { question: "Should I sell my house before buying another?", answer: "Selling first removes the risk of two mortgages but may mean a short-term rental; buying first is easier to plan but needs cash or a bridge loan." },
      { question: "Can I use the equity from my house to buy another?", answer: "Yes — through a sale, a HELOC, or a bridge loan that's repaid when your home sells." },
    ],
  },
  {
    slug: "cash-for-keys-calculator",
    title: "Cash for Keys Calculator",
    category: CAT,
    description: "Decide whether to offer a tenant cash for keys instead of filing an eviction — compare legal fees, court costs, lost rent and damage risk with the payment and the faster move-out.",
    metaTitle: "Cash for Keys Calculator — Cash for Keys vs Eviction Cost",
    metaDescription: "Free cash for keys calculator. Compare paying a tenant to leave with the full cost of an eviction and find the most you should offer.",
    calcInputs: [
      currencyField("monthlyRent", "Monthly Rent", { default: 1800, max: 50000, step: 25 }),
      currencyField("legalFees", "Attorney Fees for an Eviction", { default: 1500, max: 50000, step: 50 }),
      currencyField("courtCosts", "Filing, Service & Court Costs", { default: 400, max: 10000, step: 25 }),
      numberField("evictionMonths", "Months Until Possession via Eviction", { default: 3, max: 24, step: 0.5 }),
      currencyField("expectedDamage", "Expected Damage / Cleanup After Eviction", { default: 2000, max: 100000, step: 100, required: false }),
      currencyField("lockoutCosts", "Lockout, Storage & Lock Change", { default: 300, max: 10000, step: 25, required: false }),
      currencyField("cashOffer", "Cash for Keys Offer", { default: 2500, max: 100000, step: 100 }),
      numberField("vacateMonths", "Months Until Tenant Leaves with the Deal", { default: 1, max: 12, step: 0.5 }),
    ],
    calcResult: { label: "Savings vs Eviction", format: "currency" },
    calcResults: [
      { key: "savingsVsEviction", label: "Cash for Keys Saves", format: "currency", highlight: true },
      { key: "totalEvictionCost", label: "Total Cost of an Eviction", format: "currency" },
      { key: "totalCashForKeysCost", label: "Total Cost of Cash for Keys", format: "currency" },
      { key: "maxSensibleOffer", label: "Most You Should Offer", format: "currency" },
      { key: "lostRentDuringEviction", label: "Rent Lost During an Eviction", format: "currency" },
    ],
    instructions: "Enter the rent and what an eviction would cost in your area: legal fees, court costs, how many months until you get possession, and likely damage. Then enter the cash you'd offer and how soon the tenant would leave.",
    examples: "Example: a $1,800/month eviction taking 3 months costs $9,600.00 with fees and damage. A $2,500 cash for keys deal with a 1-month move-out costs $4,300.00 — saving $5,300.00. Anything up to $7,800.00 still beats evicting.",
    assumptions: "Get the agreement in writing: move-out date, the unit left broom-clean and empty, keys returned, and payment only at the walkthrough. Unpaid rent is usually waived. Eviction timelines vary widely by state and court backlog. This isn't legal advice.",
    faq: [
      { question: "How much should I offer for cash for keys?", answer: "Often one month's rent or a moving-cost amount — and always less than your realistic eviction cost." },
      { question: "Is cash for keys legal?", answer: "Yes, it's a voluntary agreement. Put it in writing and pay only after the tenant has moved out." },
    ],
  },
  {
    slug: "rent-vs-sell-calculator",
    title: "Rent vs Sell Calculator",
    category: CAT,
    description: "Decide whether to rent out your home or sell it — rental cash flow and appreciation vs selling now and investing the proceeds, with the home-sale tax exclusion, depreciation recapture and capital gains.",
    metaTitle: "Rent vs Sell Calculator — Rent Out Your House or Sell?",
    metaDescription: "Free rent vs sell calculator. Compare renting out your home with selling and investing, including cash flow, the $250k/$500k exclusion and recapture.",
    calcInputs: [
      currencyField("homeValue", "Home Value Today", { default: 450000, max: 20000000, step: 1000 }),
      currencyField("costBasis", "Cost Basis (Price Paid + Improvements)", { default: 300000, max: 20000000, step: 1000 }),
      currencyField("mortgageBalance", "Mortgage Balance", { default: 250000, max: 20000000, step: 1000 }),
      percentField("mortgageRate", "Mortgage Rate", { default: 3.5, max: 15, step: 0.125 }),
      numberField("remainingYears", "Years Left on Mortgage", { default: 24, min: 1, max: 40 }),
      currencyField("monthlyRent", "Expected Monthly Rent", { default: 2600, max: 100000, step: 25 }),
      percentField("vacancyRate", "Vacancy", { default: 5, max: 50, step: 1 }),
      currencyField("monthlyCosts", "Monthly Tax, Insurance, HOA & Repairs", { default: 650, max: 50000, step: 10 }),
      percentField("managementPercent", "Property Management (% of Rent)", { default: 8, max: 20, step: 0.5, required: false }),
      percentField("appreciationRate", "Home Price Growth per Year", { default: 3.5, max: 15, step: 0.25 }),
      numberField("yearsToRent", "Years You'd Rent It Out", { default: 5, min: 1, max: 30 }),
      percentField("sellingCostPercent", "Selling Costs", { default: 7, max: 12, step: 0.5 }),
      YN("married", "Married Filing Jointly ($500,000 Exclusion)", 1),
      percentField("capitalGainsRate", "Capital Gains Tax Rate", { default: 15, max: 40, step: 1 }),
      percentField("investmentReturn", "Return on Sale Proceeds If You Sell", { default: 6, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Renting Out Comes Out Ahead By", format: "currency" },
    calcResults: [
      { key: "keepingAndRentingGains", label: "Renting Comes Out Ahead By (Negative = Sell)", format: "currency", highlight: true },
      { key: "wealthIfYouRent", label: "Wealth If You Rent, Then Sell", format: "currency" },
      { key: "wealthIfYouSellNow", label: "Wealth If You Sell Now and Invest", format: "currency" },
      { key: "netProceedsToday", label: "Net Proceeds If You Sell Today", format: "currency" },
      { key: "monthlyCashFlow", label: "Monthly Rental Cash Flow", format: "currency" },
      { key: "taxIfSoldLater", label: "Tax When You Sell Later", format: "currency" },
      { key: "taxIfSoldNow", label: "Tax If You Sell Now", format: "currency" },
    ],
    instructions: "Enter the home's value, what you paid plus improvements, and your mortgage. Add the rent you'd get, vacancy, monthly costs and management. Choose how long you'd rent it out, your expected appreciation and the return you'd earn investing the sale proceeds instead.",
    examples: "Example: a $450,000 home with a $250,000 mortgage at 3.5% renting for $2,600 cash-flows about $328 a month. After 5 years of renting and selling, you'd have about $262,600 (after $40,466 of tax, since the exclusion is lost) vs about $225,500 by selling now and investing at 6% — renting wins by about $37,100.",
    assumptions: "The home-sale exclusion ($250,000 single / $500,000 married) needs 2 of the last 5 years as your home, so it's lost after more than 3 years of renting. Rental depreciation (27.5 years on 80% of basis) is recaptured at up to 25% when you sell. Cash flow isn't reinvested, and income tax on rental profit isn't modeled. A 1031 exchange can defer tax if you stay invested in real estate.",
    faq: [
      { question: "Is it better to rent out or sell my house?", answer: "Renting usually wins with a low mortgage rate, strong rent and steady appreciation; selling wins when cash flow is thin or you'd lose a large tax-free gain." },
      { question: "Do I lose the capital gains exclusion if I rent my house out?", answer: "Only if you rent it more than about 3 years before selling, because you need 2 of the last 5 years as your main home." },
    ],
  },
  {
    slug: "part-exchange-house-calculator",
    title: "Part Exchange House Calculator",
    category: CAT,
    description: "Compare a UK house builder's part exchange offer with selling on the open market — agent fees with VAT, conveyancing, holding costs and the discount part exchange usually involves.",
    metaTitle: "Part Exchange House Calculator — Part Exchange vs Selling",
    metaDescription: "Free part exchange calculator (UK). Compare a builder's part exchange offer with an open-market sale after estate agent fees, VAT, conveyancing and holding costs.",
    calcInputs: [
      numberField("marketValue", "Open-Market Value of Your Home", { unit: "£", default: 300000, max: 10000000, step: 1000 }),
      percentField("pxOfferPercent", "Part Exchange Offer (% of Market Value)", { default: 92, min: 50, max: 105, step: 0.5 }),
      percentField("agentFeePercent", "Estate Agent Fee (Before VAT)", { default: 1.2, max: 5, step: 0.05 }),
      numberField("conveyancing", "Conveyancing / Legal Fees", { unit: "£", default: 1500, max: 20000, step: 50 }),
      numberField("otherSaleCosts", "Other Sale Costs (EPC, Removals Timing)", { unit: "£", default: 500, max: 20000, step: 50, required: false }),
      numberField("monthlyHoldingCost", "Monthly Holding Cost While Selling", { unit: "£", default: 900, max: 20000, step: 10, required: false }),
      numberField("monthsToSell", "Months to Sell on the Open Market", { default: 4, max: 24, step: 0.5, required: false }),
      YN("builderPaysFees", "Builder Pays Your Legal Fees on Part Exchange", 1),
    ],
    calcResult: { label: "Open Market Nets More By", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "openMarketNetsMore", label: "Open Market Nets More By (Negative = PX Wins)", format: "currency", currency: "GBP", highlight: true },
      { key: "netViaPartExchange", label: "Net via Part Exchange", format: "currency", currency: "GBP" },
      { key: "netViaOpenMarket", label: "Net via Open-Market Sale", format: "currency", currency: "GBP" },
      { key: "partExchangeOffer", label: "Part Exchange Offer", format: "currency", currency: "GBP" },
      { key: "discountToMarketValue", label: "Discount to Market Value", format: "percentage" },
      { key: "agentFeeWithVat", label: "Estate Agent Fee incl. VAT", format: "currency", currency: "GBP" },
    ],
    instructions: "Enter your home's open-market value (from two or three agent valuations), the builder's part exchange offer as a percentage of that value, and your likely costs of selling yourself — agent fee, conveyancing and the months of mortgage and bills while you wait.",
    examples: "Example: a £300,000 home with a 92% part exchange offer nets £276,000.00. Selling yourself costs £4,320.00 in agent fees with VAT, £2,000 of legal and other costs and four months at £900 — netting £290,080.00, so the open market is £14,080.00 better, in exchange for more time and chain risk.",
    assumptions: "Part exchange offers are typically 85–95% of market value, based on independent valuations; builders usually cover agent fees and often legal fees. You save time and avoid a chain. Stamp duty on the new home is due on the full new-home price either way. Holding costs are only a cost if you'd otherwise be paying two homes or renting.",
    faq: [
      { question: "Is part exchange a good deal?", answer: "It's convenient and chain-free, but you usually accept 5–15% below market value. Compare the net figures, not just the offer." },
      { question: "How is a part exchange offer calculated?", answer: "Builders get two or three independent valuations and offer a percentage of the realistic quick-sale price." },
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
