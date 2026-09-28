// One-time (but safe to re-run) batch setup script: creates the 9 tools
// of the "Real Estate Calculators" sub-batch H (Selling & Real Estate Tax). Part of the
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
// See src/lib/calc-engine-realestate-selling-tax.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-realestate-selling-tax-calculators.ts
// or
//   npm run db:create-realestate-selling-tax-calculators

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
    slug: "cost-to-sell-a-house-calculator",
    title: "Cost to Sell a House Calculator",
    description: "Add up everything it costs to sell a house — agent commission, closing costs, repairs and staging, concessions to the buyer and moving — in dollars and as a share of the price.",
    metaTitle: "Cost to Sell a House Calculator — All Selling Costs",
    metaDescription: "Free cost to sell a house calculator. Total commission, closing costs, repairs, staging, buyer concessions and moving as dollars and % of the price.",
    calcInputs: [
      currencyField("salePrice", "Expected Sale Price", { default: 450000, max: 10000000000, step: 1000 }),
      percentField("commissionPercent", "Agent Commission (Total)", { default: 5.5, max: 10, step: 0.25 }),
      percentField("closingCostPercent", "Seller Closing Costs", { default: 1.5, max: 10, step: 0.25 }),
      currencyField("repairsAndStaging", "Repairs, Prep & Staging", { default: 5000, max: 100000000, step: 250 }),
      currencyField("sellerConcessions", "Concessions to the Buyer", { default: 3000, max: 100000000, step: 250 }),
      currencyField("movingCosts", "Moving Costs", { default: 2500, max: 10000000, step: 100 }),
    ],
    calcResult: { label: "Total Cost to Sell", format: "currency" },
    calcResults: [
      { key: "totalCostToSell", label: "Total Cost to Sell", format: "currency", highlight: true },
      { key: "costPercentOfSalePrice", label: "Cost as % of Sale Price", format: "percentage" },
      { key: "agentCommission", label: "Agent Commission", format: "currency" },
      { key: "closingCosts", label: "Closing Costs", format: "currency" },
      { key: "otherSellingCosts", label: "Repairs, Concessions & Moving", format: "currency" },
    ],
    instructions: "Enter the price you expect to get, the total commission you'll pay, seller closing costs (transfer tax, title, escrow), and what you'll spend getting the house ready, on buyer concessions and on moving.",
    examples: "Example: selling for $450,000 with 5.5% commission ($24,750), 1.5% closing costs ($6,750) and $10,500 of repairs, concessions and moving costs $42,000 — 9.33% of the price.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How much does it cost to sell a house?", answer: "Often 8% to 10% of the price once commission, closing costs, prep and moving are counted. Selling without an agent saves commission but usually means doing the marketing and negotiating yourself." }],
  },
  {
    slug: "real-estate-commission-calculator",
    title: "Real Estate Commission Calculator",
    description: "Split a real estate commission between the listing and buyer's brokerages, see what the listing agent takes home after the brokerage split, and what a flat-fee listing would save.",
    metaTitle: "Real Estate Commission Calculator — Splits & Savings",
    metaDescription: "Free real estate commission calculator. Split the commission between brokerages, see the agent's take-home pay, and what a flat-fee listing would save.",
    calcInputs: [
      currencyField("salePrice", "Sale Price", { default: 400000, max: 10000000000, step: 1000 }),
      percentField("totalCommissionPercent", "Total Commission", { default: 5.5, max: 10, step: 0.25 }),
      percentField("listingSideSharePercent", "Listing Brokerage's Share", { default: 50, max: 100, step: 5 }),
      percentField("agentSplitPercent", "Listing Agent's Split with Brokerage", { default: 70, max: 100, step: 5 }),
      currencyField("flatFeeListing", "Flat-Fee Listing Price (Alternative)", { default: 5000, max: 10000000, step: 250 }),
    ],
    calcResult: { label: "Total Commission", format: "currency" },
    calcResults: [
      { key: "totalCommission", label: "Total Commission", format: "currency", highlight: true },
      { key: "listingSideCommission", label: "Listing Brokerage", format: "currency" },
      { key: "buyerSideCommission", label: "Buyer's Brokerage", format: "currency" },
      { key: "listingAgentTakeHome", label: "Listing Agent's Take-Home", format: "currency" },
      { key: "savingsWithFlatFeeListing", label: "Savings with a Flat-Fee Listing", format: "currency" },
    ],
    instructions: "Enter the sale price and total commission, how it's split between the two sides, and the listing agent's split with their brokerage. The flat-fee comparison assumes you'd still pay the buyer's agent the same.",
    examples: "Example: 5.5% of $400,000 is $22,000 — $11,000 to each side. The listing agent keeps 70% of their side ($7,700). A $5,000 flat-fee listing, still paying the buyer's agent, would save $6,000.",
    assumptions: "Commissions are negotiable. Since August 2024, buyers sign agreements with their own agents, and sellers aren't required to offer buyer-agent pay. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is the real estate commission still 6%?", answer: "There's no standard rate. Total commissions have commonly been 5% to 6%, and since the 2024 NAR settlement more sellers and buyers negotiate each side separately." }],
  },
  {
    slug: "seller-closing-cost-calculator",
    title: "Seller Closing Cost Calculator",
    description: "Estimate a home seller's closing costs line by line — commission, transfer tax, owner's title insurance, escrow and attorney fees, prorated property tax and HOA fees.",
    metaTitle: "Seller Closing Cost Calculator — Itemized Costs",
    metaDescription: "Free seller closing cost calculator. Itemize commission, transfer tax, owner's title policy, escrow, prorated tax and HOA fees for a home sale.",
    calcInputs: [
      currencyField("salePrice", "Sale Price", { default: 420000, max: 10000000000, step: 1000 }),
      percentField("commissionPercent", "Agent Commission", { default: 5.5, max: 10, step: 0.25 }),
      percentField("transferTaxPercent", "Transfer Tax", { default: 0.4, max: 5, step: 0.05 }),
      currencyField("ownerTitleInsurance", "Owner's Title Insurance", { default: 1800, max: 10000000, step: 50 }),
      currencyField("escrowAndAttorneyFees", "Escrow & Attorney Fees", { default: 1500, max: 10000000, step: 50 }),
      currencyField("proratedPropertyTax", "Prorated Property Tax Owed", { default: 2100, max: 10000000, step: 50 }),
      currencyField("hoaAndOtherFees", "HOA Transfer & Other Fees", { default: 600, max: 10000000, step: 50 }),
    ],
    calcResult: { label: "Total Seller Closing Costs", format: "currency" },
    calcResults: [
      { key: "totalSellerClosingCosts", label: "Total Seller Closing Costs", format: "currency", highlight: true },
      { key: "closingCostsPercentOfPrice", label: "As % of Sale Price", format: "percentage" },
      { key: "agentCommission", label: "Agent Commission", format: "currency" },
      { key: "costsExcludingCommission", label: "Costs Excluding Commission", format: "currency" },
      { key: "transferTax", label: "Transfer Tax", format: "currency" },
    ],
    instructions: "Enter the sale price and each seller cost. Whether the seller pays transfer tax and the owner's title policy depends on your state and your contract; prorated property tax is the share you owe for the months you owned the home this year.",
    examples: "Example: on a $420,000 sale, $23,100 of commission and $7,680 of other costs (including $1,680 of transfer tax) total $30,780 — 7.33% of the price.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What closing costs does a seller usually pay?", answer: "Commission, transfer tax in many states, the owner's title policy in many areas, their share of escrow or attorney fees, prorated property tax and HOA transfer fees." }],
  },
  {
    slug: "net-proceeds-from-home-sale-calculator",
    title: "Net Proceeds from Home Sale Calculator",
    description: "Find the cash you'll walk away with after selling your home — the sale price minus the mortgage payoff, other liens, commission, closing costs, repairs and concessions.",
    metaTitle: "Home Sale Net Proceeds Calculator — Cash You Keep",
    metaDescription: "Free net proceeds from home sale calculator. Subtract the mortgage payoff, liens, commission, closing costs and concessions to see the cash you keep.",
    calcInputs: [
      currencyField("salePrice", "Sale Price", { default: 500000, max: 10000000000, step: 1000 }),
      currencyField("mortgagePayoff", "Mortgage Payoff", { default: 260000, max: 10000000000, step: 1000 }),
      currencyField("otherLiens", "HELOC & Other Liens", { default: 0, max: 10000000000, step: 1000 }),
      percentField("commissionPercent", "Agent Commission", { default: 5.5, max: 10, step: 0.25 }),
      percentField("closingCostPercent", "Seller Closing Costs", { default: 1.5, max: 10, step: 0.25 }),
      currencyField("repairsAndConcessions", "Repairs & Concessions", { default: 4000, max: 100000000, step: 250 }),
    ],
    calcResult: { label: "Net Proceeds", format: "currency" },
    calcResults: [
      { key: "netProceeds", label: "Net Proceeds", format: "currency", highlight: true },
      { key: "totalSellingCosts", label: "Total Selling Costs", format: "currency" },
      { key: "equityBeforeSelling", label: "Equity Before Selling Costs", format: "currency" },
      { key: "netProceedsPercentOfPrice", label: "Net Proceeds as % of Price", format: "percentage" },
    ],
    instructions: "Enter the expected price, your mortgage payoff amount (ask your lender — it includes interest to the payoff date), any other loans on the home, and the costs of selling.",
    examples: "Example: selling for $500,000 with a $260,000 mortgage gives $240,000 of equity. After $39,000 of commission, closing costs, repairs and concessions, you'd receive $201,000 — 40.2% of the price.",
    assumptions: "Proceeds are before any capital gains tax — see the Home Sale Profit Calculator. " + GENERAL_DISCLAIMER,
    faq: [{ question: "When do I get the money from a home sale?", answer: "Usually on closing day or within a day or two, by wire or check from the title or escrow company once the deed is recorded." }],
  },
  {
    slug: "home-sale-profit-calculator",
    title: "Home Sale Profit Calculator",
    description: "Work out your profit on selling your home over what you paid plus improvements, apply the Section 121 exclusion ($250,000 single, $500,000 married), and estimate any tax.",
    metaTitle: "Home Sale Profit Calculator — Gain & $250k Exclusion",
    metaDescription: "Free home sale profit calculator. Find your gain over purchase price and improvements, apply the $250,000/$500,000 exclusion and estimate the tax.",
    calcInputs: [
      currencyField("salePrice", "Sale Price", { default: 650000, max: 10000000000, step: 1000 }),
      currencyField("purchasePrice", "Original Purchase Price", { default: 300000, max: 10000000000, step: 1000 }),
      currencyField("buyingClosingCosts", "Closing Costs When You Bought", { default: 6000, max: 100000000, step: 250 }),
      currencyField("improvements", "Capital Improvements", { default: 40000, max: 1000000000, step: 500 }),
      percentField("sellingCostPercent", "Selling Costs", { default: 6, max: 20, step: 0.25 }),
      dropdownField("filingStatus", "Filing Status", 1, [
        { label: "Single — $250,000 exclusion", value: 1 },
        { label: "Married filing jointly — $500,000 exclusion", value: 2 },
      ]),
      numberField("yearsOwnedAndLivedIn", "Years Owned & Lived In (Last 5)", { unit: "years", default: 8, min: 0, max: 100, step: 0.5 }),
      percentField("capitalGainsRatePercent", "Your Capital Gains Tax Rate", { default: 15, max: 40, step: 1 }),
    ],
    calcResult: { label: "Profit on Sale", format: "currency" },
    calcResults: [
      { key: "profitOnSale", label: "Profit on Sale", format: "currency", highlight: true },
      { key: "exclusionApplied", label: "Exclusion Applied", format: "currency" },
      { key: "taxableGain", label: "Taxable Gain", format: "currency" },
      { key: "estimatedTax", label: "Estimated Federal Tax", format: "currency" },
      { key: "profitAfterTax", label: "Profit After Tax", format: "currency" },
    ],
    instructions: "Enter the sale price, what you paid and your buying closing costs, capital improvements (additions, new roof — not repairs), selling costs, your filing status and how long you've owned and lived in the home. The exclusion needs at least 2 of the last 5 years.",
    examples: "Example: selling for $650,000 after paying $300,000 plus $46,000 of closing costs and improvements, less 6% selling costs, is a $265,000 profit. A single filer excludes $250,000, leaving $15,000 taxable — about $2,250 of tax at 15%.",
    assumptions: "Long-term capital gains rates for 2026 are 0%, 15% or 20% by income, plus 3.8% net investment income tax at higher incomes. A partial exclusion may apply if you moved early for work, health or other qualifying reasons. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Do I pay tax when I sell my house?", answer: "Usually not, if you owned and lived in it for 2 of the last 5 years and your gain is under $250,000 ($500,000 for married couples). Only gain above that is taxed." }],
  },
  {
    slug: "capital-gains-on-property-calculator",
    title: "Capital Gains on Property Calculator",
    description: "Estimate the capital gains tax on selling a main home, second home or investment property — with the home-sale exclusion and depreciation recapture where they apply, plus state tax.",
    metaTitle: "Property Capital Gains Tax Calculator — By Type",
    metaDescription: "Free capital gains on property calculator. Estimate tax on selling a main home, second home or rental, with the exclusion, depreciation recapture and state tax.",
    calcInputs: [
      dropdownField("propertyType", "Property Type", 3, [
        { label: "Main home", value: 1 },
        { label: "Second home / vacation home", value: 2 },
        { label: "Investment or rental property", value: 3 },
      ]),
      currencyField("salePrice", "Net Sale Price (After Selling Costs)", { default: 550000, max: 10000000000, step: 1000 }),
      currencyField("purchasePrice", "Purchase Price", { default: 350000, max: 10000000000, step: 1000 }),
      currencyField("improvementsAndCosts", "Improvements & Buying Costs", { default: 45000, max: 1000000000, step: 500 }),
      currencyField("depreciationTaken", "Depreciation Taken (Rental Only)", { default: 60000, max: 1000000000, step: 500 }),
      currencyField("exclusionAvailable", "Home-Sale Exclusion (Main Home Only)", { default: 250000, max: 500000, step: 250000 }),
      percentField("capitalGainsRatePercent", "Long-Term Capital Gains Rate", { default: 15, max: 40, step: 1 }),
      percentField("ordinaryRatePercent", "Your Ordinary Income Tax Rate", { default: 24, max: 40, step: 1 }),
      percentField("stateTaxRatePercent", "State Tax Rate on Gains", { default: 5, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Total Tax", format: "currency" },
    calcResults: [
      { key: "totalTax", label: "Total Tax", format: "currency", highlight: true },
      { key: "totalGain", label: "Total Gain", format: "currency" },
      { key: "taxableGain", label: "Taxable Gain", format: "currency" },
      { key: "depreciationRecaptureTax", label: "Depreciation Recapture Tax", format: "currency" },
      { key: "federalTax", label: "Federal Tax", format: "currency" },
      { key: "stateTax", label: "State Tax", format: "currency" },
    ],
    instructions: "Choose the property type, then enter the sale price after selling costs, what you paid, and improvements and buying costs. For a rental, enter the depreciation you've taken; for a main home, the exclusion you qualify for ($250,000 single, $500,000 married). Depreciation is taxed at your ordinary rate but no more than 25%.",
    examples: "Example: a rental bought for $350,000 with $45,000 of improvements and $60,000 of depreciation has a $335,000 adjusted basis, so selling for $550,000 is a $215,000 gain. Recapture tax on $60,000 at 24% is $14,400; with 15% on the rest, federal tax is $37,650. State tax of $10,750 brings the total to $48,400.",
    assumptions: "Assumes you held the property more than a year. Doesn't include the 3.8% net investment income tax. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Can I avoid capital gains tax on a rental?", answer: "A 1031 exchange into another investment property defers it. Converting a rental into your main home can qualify part of the gain for the exclusion, but depreciation is still taxed." }],
  },
  {
    slug: "1031-exchange-calculator",
    title: "1031 Exchange Calculator",
    description: "Estimate how much tax a 1031 exchange defers — the realized gain, taxable boot from cash you keep or debt you shed, the deferred gain and the replacement property's basis.",
    metaTitle: "1031 Exchange Calculator — Boot & Deferred Gain",
    metaDescription: "Free 1031 exchange calculator. Estimate realized gain, taxable boot from cash or mortgage relief, tax deferred and the new property's cost basis.",
    calcInputs: [
      currencyField("salePrice", "Relinquished Property Sale Price", { default: 600000, max: 10000000000, step: 1000 }),
      currencyField("adjustedBasis", "Adjusted Basis (After Depreciation)", { default: 320000, max: 10000000000, step: 1000 }),
      currencyField("sellingCosts", "Selling Costs", { default: 36000, max: 1000000000, step: 500 }),
      currencyField("oldMortgagePaidOff", "Mortgage Paid Off at Sale", { default: 200000, max: 10000000000, step: 1000 }),
      currencyField("replacementPrice", "Replacement Property Price", { default: 750000, max: 10000000000, step: 1000 }),
      currencyField("newMortgage", "New Mortgage on Replacement", { default: 400000, max: 10000000000, step: 1000 }),
      currencyField("cashKept", "Cash You Keep (Not Reinvested)", { default: 20000, max: 10000000000, step: 500 }),
      percentField("taxRatePercent", "Combined Tax Rate on Gain", { default: 20, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Tax Deferred", format: "currency" },
    calcResults: [
      { key: "taxDeferred", label: "Tax Deferred", format: "currency", highlight: true },
      { key: "realizedGain", label: "Realized Gain", format: "currency" },
      { key: "taxableBoot", label: "Taxable Boot", format: "currency" },
      { key: "taxDueNow", label: "Tax Due Now", format: "currency" },
      { key: "deferredGain", label: "Deferred Gain", format: "currency" },
      { key: "newPropertyBasis", label: "Replacement Property Basis", format: "currency" },
    ],
    instructions: "Enter the sale price, adjusted basis and selling costs of the property you're selling and its mortgage payoff, then the replacement property's price and new loan, and any cash you'll keep. Boot — cash kept, or a smaller mortgage than the one paid off — is taxed now.",
    examples: "Example: selling for $600,000 with a $320,000 basis and $36,000 of costs realizes a $244,000 gain. Keeping $20,000 of cash makes $20,000 taxable ($4,000 of tax); $224,000 is deferred, saving $44,800 now. The new property's basis is $526,000.",
    assumptions: "You must name replacement property within 45 days and close within 180 days, using a qualified intermediary. Simplified: extra cash you add can offset mortgage boot. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Does a 1031 exchange eliminate the tax?", answer: "No — it defers it by carrying the old basis into the new property. The tax is due when you finally sell without exchanging, unless heirs inherit with a stepped-up basis." }],
  },
  {
    slug: "real-estate-investment-tax-calculator",
    title: "Real Estate Investment Tax Calculator",
    description: "Estimate the yearly income tax on a rental property — rent minus expenses, mortgage interest and depreciation — and how much of a loss you can deduct under the $25,000 passive-loss allowance.",
    metaTitle: "Rental Property Tax Calculator — Passive Loss Rules",
    metaDescription: "Free real estate investment tax calculator. Find taxable rental income after depreciation and interest, and how much loss the $25,000 allowance lets you deduct.",
    calcInputs: [
      currencyField("annualRentalIncome", "Yearly Rental Income", { default: 24000, max: 1000000000, step: 500 }),
      currencyField("operatingExpenses", "Yearly Operating Expenses", { default: 8000, max: 1000000000, step: 250 }),
      currencyField("mortgageInterest", "Yearly Mortgage Interest", { default: 13000, max: 1000000000, step: 250 }),
      currencyField("buildingBasis", "Building Basis (Excluding Land)", { default: 275000, max: 10000000000, step: 1000 }),
      currencyField("magi", "Modified Adjusted Gross Income (MAGI)", { default: 120000, max: 100000000, step: 1000 }),
      percentField("marginalRatePercent", "Your Marginal Tax Rate", { default: 22, max: 50, step: 1 }),
    ],
    calcResult: { label: "Taxable Rental Income", format: "currency" },
    calcResults: [
      { key: "taxableRentalIncome", label: "Taxable Rental Income (Loss)", format: "currency", highlight: true },
      { key: "annualDepreciation", label: "Depreciation Deduction", format: "currency" },
      { key: "taxOnRentalIncome", label: "Tax on Rental Income", format: "currency" },
      { key: "lossDeductibleThisYear", label: "Loss Deductible This Year", format: "currency" },
      { key: "suspendedLossCarriedForward", label: "Suspended Loss Carried Forward", format: "currency" },
      { key: "taxSavingsFromLoss", label: "Tax Savings from Loss", format: "currency" },
    ],
    instructions: "Enter the yearly rent, operating expenses, mortgage interest (not principal), the building's basis without land, your MAGI and your tax rate. If you actively manage the rental, up to $25,000 of losses can offset other income, reduced by half of MAGI above $100,000 and gone at $150,000.",
    examples: "Example: $24,000 of rent minus $8,000 of expenses, $13,000 of interest and $10,000 of depreciation is a -$7,000 tax loss. With a MAGI of $120,000 the allowance is $15,000, so the full $7,000 is deductible, saving $1,540 at 22%.",
    assumptions: "Assumes active participation and residential depreciation over 27.5 years. Real estate professionals follow different rules. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What happens to rental losses I can't deduct?", answer: "They're suspended and carried forward. You can use them against future rental profits, or deduct them in full when you sell the property." }],
  },
  {
    slug: "property-tax-deduction-calculator",
    title: "Property Tax Deduction Calculator",
    description: "See how much of your property tax you can deduct in 2026 under the $40,400 SALT cap — reduced for incomes over $505,000 — and whether itemizing beats the standard deduction.",
    metaTitle: "Property Tax Deduction Calculator — 2026 SALT Cap",
    metaDescription: "Free property tax deduction calculator for 2026. Apply the $40,400 SALT cap and its phase-out, and see if itemizing beats the standard deduction.",
    calcInputs: [
      currencyField("annualPropertyTax", "Yearly Property Tax", { default: 9000, max: 100000000, step: 100 }),
      currencyField("stateAndLocalIncomeTax", "State & Local Income (or Sales) Tax", { default: 12000, max: 100000000, step: 100 }),
      dropdownField("filingStatus", "Filing Status", 2, [
        { label: "Single", value: 1 },
        { label: "Married filing jointly", value: 2 },
      ]),
      currencyField("magi", "Modified Adjusted Gross Income (MAGI)", { default: 250000, max: 100000000, step: 1000 }),
      currencyField("otherItemizedDeductions", "Other Itemized Deductions (Mortgage Interest, Charity)", { default: 14000, max: 100000000, step: 100 }),
      percentField("marginalRatePercent", "Your Marginal Tax Rate", { default: 24, max: 50, step: 1 }),
    ],
    calcResult: { label: "SALT Deduction", format: "currency" },
    calcResults: [
      { key: "saltDeduction", label: "SALT Deduction", format: "currency", highlight: true },
      { key: "saltCap", label: "Your SALT Cap", format: "currency" },
      { key: "totalItemizedDeductions", label: "Total Itemized Deductions", format: "currency" },
      { key: "standardDeduction", label: "Standard Deduction", format: "currency" },
      { key: "deductionAboveStandard", label: "Itemized Above Standard", format: "currency" },
      { key: "taxSavingsFromItemizing", label: "Extra Tax Savings from Itemizing", format: "currency" },
    ],
    instructions: "Enter your yearly property tax, state and local income tax, filing status, MAGI, other itemized deductions and your tax rate. Property tax counts toward the state and local tax (SALT) cap together with income tax.",
    examples: "Example: $9,000 of property tax and $12,000 of state income tax give a $21,000 SALT deduction — under the $40,400 cap. With $14,000 of other deductions, itemizing totals $35,000, beating the $32,200 joint standard deduction by $2,800 and saving $672.",
    assumptions: "Uses 2026 figures: the SALT cap is $40,400, reduced by 30% of MAGI over $505,000 but not below $10,000 (married filing separately is half). Standard deduction: $16,100 single, $32,200 joint. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Can I deduct property tax if I take the standard deduction?", answer: "No. Property tax is only deductible if you itemize, so it helps only when your itemized deductions are larger than the standard deduction." }],
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
