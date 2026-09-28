// One-time (but safe to re-run) batch setup script: creates the 13 tools
// of the "Real Estate Calculators" sub-batch F (House Flipping & Rehab). Part of the
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
// See src/lib/calc-engine-realestate-flips.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-realestate-flips-calculators.ts
// or
//   npm run db:create-realestate-flips-calculators

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
    slug: "house-flip-profit-calculator",
    title: "House Flip Profit Calculator",
    description: "Work out the net profit on an all-cash house flip with every cost counted — buying costs, rehab, monthly holding costs over the project and selling costs — plus your margin on the sale.",
    metaTitle: "House Flip Profit Calculator — Net Profit & Margin",
    metaDescription: "Free house flip profit calculator. Count buying costs, rehab, monthly holding and selling costs to find your net flip profit and margin on the sale.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 200000, max: 10000000000, step: 1000 }),
      percentField("buyingCostPercent", "Buying Closing Costs", { default: 2, max: 20, step: 0.25 }),
      currencyField("rehabCost", "Rehab Cost", { default: 55000, max: 1000000000, step: 500 }),
      currencyField("monthlyHoldingCosts", "Monthly Holding Costs (Tax, Insurance, Utilities)", { default: 1200, max: 10000000, step: 50 }),
      numberField("projectMonths", "Project Length", { unit: "months", default: 6, min: 0, max: 60, step: 1 }),
      currencyField("salePrice", "Sale Price", { default: 330000, max: 10000000000, step: 1000 }),
      percentField("sellingCostPercent", "Selling Costs (Commission & Closing)", { default: 8, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Net Profit", format: "currency" },
    calcResults: [
      { key: "netProfit", label: "Net Profit", format: "currency", highlight: true },
      { key: "profitMarginOnSalePercent", label: "Profit Margin on Sale", format: "percentage" },
      { key: "totalCosts", label: "Total Costs", format: "currency" },
      { key: "holdingCosts", label: "Holding Costs", format: "currency" },
      { key: "sellingCosts", label: "Selling Costs", format: "currency" },
    ],
    instructions: "Enter the purchase price and buying costs, the rehab budget, what the house costs you each month while you work on it, how long the project takes, the sale price and selling costs.",
    examples: "Example: buying for $200,000, spending $55,000 on rehab, carrying $1,200 a month for 6 months ($7,200) and selling for $330,000 with $26,400 of selling costs leaves $37,400 of profit — an 11.33% margin on the sale.",
    assumptions: "All-cash purchase; for a financed flip use the Fix and Flip Calculator. Profit is before income tax — flips held under a year are usually taxed as ordinary income. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What profit should a house flip make?", answer: "Many flippers aim for at least 10% to 20% of the sale price, or $25,000 to $30,000 per deal, to cover the risk of surprises and slow sales." }],
  },
  {
    slug: "house-flip-roi-calculator",
    title: "House Flip ROI Calculator",
    description: "Measure the return on a house flip two ways — on your own cash and on the total project cost — and annualize it for how long the flip takes.",
    metaTitle: "House Flip ROI Calculator — Annualized Return",
    metaDescription: "Free house flip ROI calculator. See ROI on your cash and on total project cost, annualized for the length of the flip, plus profit per month.",
    calcInputs: [
      currencyField("netProfit", "Net Profit", { default: 42000, max: 1000000000, step: 500 }),
      currencyField("totalProjectCost", "Total Project Cost", { default: 290000, max: 10000000000, step: 1000 }),
      currencyField("cashInvested", "Your Cash Invested", { default: 90000, max: 10000000000, step: 1000 }),
      numberField("projectMonths", "Project Length", { unit: "months", default: 6, min: 0.5, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "ROI on Your Cash", format: "percentage" },
    calcResults: [
      { key: "roiOnCashPercent", label: "ROI on Your Cash", format: "percentage", highlight: true },
      { key: "annualizedRoiOnCashPercent", label: "Annualized ROI on Your Cash", format: "percentage" },
      { key: "roiOnTotalCostPercent", label: "ROI on Total Project Cost", format: "percentage" },
      { key: "profitPerMonth", label: "Profit per Month of Work", format: "currency" },
    ],
    instructions: "Enter the flip's net profit, the total project cost (purchase, rehab, holding, financing and selling costs), the cash you put in yourself and how many months the flip took from purchase to sale.",
    examples: "Example: $42,000 of profit on a $290,000 project is a 14.48% return on total cost. You put in $90,000, so your cash earned 46.67% in 6 months — 115.11% annualized, or $7,000 for each month of work.",
    assumptions: "Annualized ROI assumes you could repeat the same result back to back. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why annualize flip ROI?", answer: "A 20% return in 4 months is far better than 20% in 12 months. Annualizing lets you compare flips of different lengths, and flips with rentals or stocks." }],
  },
  {
    slug: "house-flip-cost-calculator",
    title: "House Flip Cost Calculator",
    description: "Add up the total cost of a house flip — purchase, closing, rehab with a contingency, holding and financing, and selling — and the cost per square foot.",
    metaTitle: "House Flip Cost Calculator — Total Project Cost",
    metaDescription: "Free house flip cost calculator. Total purchase, closing, rehab plus contingency, holding, financing and selling costs, with cost per square foot.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 180000, max: 10000000000, step: 1000 }),
      currencyField("closingCostsBuy", "Buying Closing Costs", { default: 4500, max: 100000000, step: 250 }),
      currencyField("rehabBudget", "Rehab Budget", { default: 60000, max: 1000000000, step: 500 }),
      percentField("contingencyPercent", "Rehab Contingency", { default: 10, max: 50, step: 1 }),
      currencyField("holdingAndFinancing", "Holding & Financing Costs", { default: 12000, max: 1000000000, step: 250 }),
      currencyField("sellingCosts", "Selling Costs", { default: 24000, max: 1000000000, step: 250 }),
      numberField("squareFeet", "House Size", { unit: "sq ft", default: 1600, min: 1, max: 1000000, step: 10 }),
    ],
    calcResult: { label: "Total Project Cost", format: "currency" },
    calcResults: [
      { key: "totalProjectCost", label: "Total Project Cost", format: "currency", highlight: true },
      { key: "rehabWithContingency", label: "Rehab with Contingency", format: "currency" },
      { key: "costsBeyondPurchasePrice", label: "Costs Beyond the Purchase Price", format: "currency" },
      { key: "costPerSquareFoot", label: "All-In Cost per Sq Ft", format: "currency" },
    ],
    instructions: "Enter each cost of the flip. The contingency is added to the rehab budget for surprises — 10% to 20% is common, more for older houses.",
    examples: "Example: a $180,000 house with $4,500 of closing costs, a $60,000 rehab plus 10% contingency ($66,000), $12,000 of holding and financing and $24,000 of selling costs costs $286,500 in all — $179.06 per square foot on 1,600 sq ft.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What costs do new flippers forget?", answer: "Holding costs (taxes, insurance, utilities, loan interest) that pile up every month, and selling costs — commission, transfer tax and buyer concessions can reach 8% to 10% of the sale price." }],
  },
  {
    slug: "house-flip-budget-calculator",
    title: "House Flip Budget Calculator",
    description: "Build a rehab budget for a flip by area — kitchen, bathrooms, flooring, paint, roof and exterior, systems and permits — plus contingency, with the cost per square foot.",
    metaTitle: "House Flip Budget Calculator — Rehab by Room",
    metaDescription: "Free house flip budget calculator. Budget the kitchen, baths, flooring, paint, roof and systems, add contingency, and see rehab cost per square foot.",
    calcInputs: [
      currencyField("kitchen", "Kitchen", { default: 18000, max: 100000000, step: 500 }),
      currencyField("bathrooms", "Bathrooms", { default: 12000, max: 100000000, step: 500 }),
      currencyField("flooring", "Flooring", { default: 8000, max: 100000000, step: 250 }),
      currencyField("paintAndDrywall", "Paint & Drywall", { default: 6000, max: 100000000, step: 250 }),
      currencyField("roofAndExterior", "Roof & Exterior", { default: 9000, max: 100000000, step: 250 }),
      currencyField("systemsHvacPlumbingElectric", "HVAC, Plumbing & Electrical", { default: 7000, max: 100000000, step: 250 }),
      currencyField("otherAndPermits", "Permits & Other", { default: 4000, max: 100000000, step: 250 }),
      percentField("contingencyPercent", "Contingency", { default: 12, max: 50, step: 1 }),
      numberField("squareFeet", "House Size", { unit: "sq ft", default: 1500, min: 1, max: 1000000, step: 10 }),
    ],
    calcResult: { label: "Total Rehab Budget", format: "currency" },
    calcResults: [
      { key: "totalRehabBudget", label: "Total Rehab Budget", format: "currency", highlight: true },
      { key: "budgetBeforeContingency", label: "Budget Before Contingency", format: "currency" },
      { key: "contingency", label: "Contingency", format: "currency" },
      { key: "rehabPerSquareFoot", label: "Rehab per Sq Ft", format: "currency" },
      { key: "kitchenAndBathSharePercent", label: "Kitchen & Bath Share", format: "percentage" },
    ],
    instructions: "Enter a budget for each part of the rehab from contractor bids or your own estimates, a contingency percentage, and the house size. Enter 0 for anything you won't touch.",
    examples: "Example: $64,000 of planned work plus a 12% contingency ($7,680) is a $71,680 rehab — $47.79 per square foot on 1,500 sq ft. Kitchen and baths take 46.88% of the budget.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Where should a flip budget go first?", answer: "Kitchens and bathrooms sell houses, but fix anything a buyer's inspector would flag — roof, electrical, plumbing, HVAC — before cosmetic upgrades." }],
  },
  {
    slug: "house-flip-break-even-calculator",
    title: "House Flip Break-Even Calculator",
    description: "Find the lowest price you can sell a flip for without losing money, how much cushion your expected sale price gives you, and the most you could pay for a target profit.",
    metaTitle: "House Flip Break-Even Calculator — Min Sale Price",
    metaDescription: "Free house flip break-even calculator. Find the minimum sale price that covers all costs, your cushion, and the max purchase price for a target profit.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 200000, max: 10000000000, step: 1000 }),
      currencyField("otherCosts", "Rehab, Holding & Buying Costs", { default: 75000, max: 10000000000, step: 500 }),
      percentField("sellingCostPercent", "Selling Costs", { default: 8, max: 50, step: 0.25 }),
      currencyField("expectedSalePrice", "Expected Sale Price", { default: 330000, max: 10000000000, step: 1000 }),
      currencyField("targetProfit", "Target Profit", { default: 30000, max: 1000000000, step: 1000 }),
    ],
    calcResult: { label: "Break-Even Sale Price", format: "currency" },
    calcResults: [
      { key: "breakEvenSalePrice", label: "Break-Even Sale Price", format: "currency", highlight: true },
      { key: "cushionBelowExpectedPrice", label: "Cushion Below Expected Price", format: "currency" },
      { key: "maxPurchasePriceForTargetProfit", label: "Max Purchase Price for Target Profit", format: "currency" },
    ],
    instructions: "Enter the purchase price, every other cost except selling (rehab, holding, financing, buying closing costs), selling costs as a percentage, your expected sale price and the profit you want.",
    examples: "Example: $200,000 to buy plus $75,000 of other costs, with 8% selling costs, breaks even at $298,913.04. Selling at $330,000 leaves a $31,086.96 cushion; for a $30,000 profit you could pay up to $198,600.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How big a cushion should a flip have?", answer: "Enough to absorb a price drop of 5% to 10% and a few extra months of holding costs. A thin cushion means one surprise wipes out the profit." }],
  },
  {
    slug: "house-flip-arv-calculator",
    title: "House Flip ARV Calculator",
    description: "Estimate a flip's after-repair value from comparable sales per square foot, then get your maximum offer by the 70% rule and by a target profit.",
    metaTitle: "House Flip ARV Calculator — ARV & Max Offer",
    metaDescription: "Free house flip ARV calculator. Estimate after-repair value from comps, then find your maximum offer by the 70% rule and by your target profit.",
    calcInputs: [
      numberField("subjectSquareFeet", "House Size", { unit: "sq ft", default: 1600, min: 0, max: 1000000, step: 10 }),
      currencyField("compAveragePricePerSqft", "Renovated Comps — Average Price per Sq Ft", { default: 210, max: 100000, step: 1 }),
      currencyField("repairCosts", "Repair Costs", { default: 60000, max: 1000000000, step: 500 }),
      percentField("otherCostsPercentOfArv", "Buying, Holding & Selling Costs (% of ARV)", { default: 12, max: 50, step: 0.5 }),
      currencyField("targetProfit", "Target Profit", { default: 35000, max: 1000000000, step: 1000 }),
    ],
    calcResult: { label: "After-Repair Value", format: "currency" },
    calcResults: [
      { key: "afterRepairValue", label: "After-Repair Value (ARV)", format: "currency", highlight: true },
      { key: "maxOfferAt70PercentRule", label: "Max Offer — 70% Rule", format: "currency" },
      { key: "maxOfferForTargetProfit", label: "Max Offer — Target Profit", format: "currency" },
    ],
    instructions: "Enter the house size and the average price per square foot of recently sold, fully renovated homes nearby. Then enter repairs, your other costs as a share of ARV, and the profit you want.",
    examples: "Example: 1,600 sq ft at $210 per sq ft gives an ARV of $336,000. With $60,000 of repairs, the 70% rule caps your offer at $175,200; working from costs and a $35,000 profit, you could pay up to $200,680.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Which maximum offer should I use?", answer: "The 70% rule is a quick, cautious screen. The target-profit offer uses your real costs. In hot markets flippers often pay above 70%, which leaves less room for error." }],
  },
  {
    slug: "after-repair-value-calculator",
    title: "After Repair Value (ARV) Calculator",
    description: "Estimate a property's after-repair value (ARV) from three renovated comparable sales, using their price per square foot, with a low and high range.",
    metaTitle: "ARV Calculator — After Repair Value from 3 Comps",
    metaDescription: "Free after repair value calculator. Enter three renovated comparable sales to estimate ARV by price per square foot, with a low to high range.",
    calcInputs: [
      numberField("subjectSquareFeet", "Subject Property Size", { unit: "sq ft", default: 1500, min: 0, max: 1000000, step: 10 }),
      currencyField("comp1Price", "Comp 1 — Sale Price", { default: 315000, max: 10000000000, step: 1000 }),
      numberField("comp1SquareFeet", "Comp 1 — Size", { unit: "sq ft", default: 1480, min: 1, max: 1000000, step: 10 }),
      currencyField("comp2Price", "Comp 2 — Sale Price", { default: 332000, max: 10000000000, step: 1000 }),
      numberField("comp2SquareFeet", "Comp 2 — Size", { unit: "sq ft", default: 1560, min: 1, max: 1000000, step: 10 }),
      currencyField("comp3Price", "Comp 3 — Sale Price", { default: 298000, max: 10000000000, step: 1000 }),
      numberField("comp3SquareFeet", "Comp 3 — Size", { unit: "sq ft", default: 1450, min: 1, max: 1000000, step: 10 }),
    ],
    calcResult: { label: "After-Repair Value", format: "currency" },
    calcResults: [
      { key: "afterRepairValue", label: "After-Repair Value (ARV)", format: "currency", highlight: true },
      { key: "averagePricePerSquareFoot", label: "Average Price per Sq Ft", format: "currency" },
      { key: "lowArv", label: "Low ARV", format: "currency" },
      { key: "highArv", label: "High ARV", format: "currency" },
    ],
    instructions: "Enter your property's size and three recently sold homes that are renovated to the standard you plan — similar in size, age and location. The tool applies their average price per square foot to your property.",
    examples: "Example: three renovated comps averaging $210.39 per sq ft put a 1,500 sq ft house's ARV at $315,587.80, within a range of $308,275.86 to $319,256.76.",
    assumptions: "Use sales from the last 3 to 6 months within about a mile. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why use renovated comps for ARV?", answer: "ARV is what the house will sell for after your work. Comparing with unrenovated homes would understate it and make good deals look bad." }],
  },
  {
    slug: "70-percent-rule-house-flipping-calculator",
    title: "70% Rule House Flipping Calculator",
    description: "Apply the 70% rule to a house flip: the maximum allowable offer is 70% of the after-repair value minus repair costs. Adjust the percentage for your market.",
    metaTitle: "70% Rule Calculator — Max Offer on a Flip",
    metaDescription: "Free 70% rule calculator for house flipping. Find the maximum allowable offer from ARV and repair costs, and see if the asking price is too high.",
    calcInputs: [
      currencyField("afterRepairValue", "After-Repair Value (ARV)", { default: 300000, max: 10000000000, step: 1000 }),
      currencyField("repairCosts", "Repair Costs", { default: 50000, max: 1000000000, step: 500 }),
      percentField("rulePercent", "Rule Percentage", { default: 70, max: 100, step: 1 }),
      currencyField("askingPrice", "Seller's Asking Price", { default: 175000, max: 10000000000, step: 1000 }),
    ],
    calcResult: { label: "Maximum Allowable Offer", format: "currency" },
    calcResults: [
      { key: "maximumAllowableOffer", label: "Maximum Allowable Offer", format: "currency", highlight: true },
      { key: "askingPriceAboveOrBelowMao", label: "Asking Price Above (Below) Max Offer", format: "currency" },
      { key: "impliedMarginForCostsAndProfit", label: "Left for Other Costs & Profit", format: "currency" },
    ],
    instructions: "Enter the after-repair value, your repair estimate and the seller's asking price. Keep 70% unless your market or costs call for another figure — some flippers use 65% for expensive rehabs or 75% to 80% in hot markets.",
    examples: "Example: 70% of a $300,000 ARV is $210,000; minus $50,000 of repairs gives a maximum offer of $160,000. The seller wants $175,000 — $15,000 too much. The rule leaves $90,000 for other costs and profit.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why 70%?", answer: "The remaining 30% of ARV covers buying, holding, financing and selling costs (often 10% to 15%) and leaves a profit of around 15% to 20%." }],
  },
  {
    slug: "fix-and-flip-calculator",
    title: "Fix and Flip Calculator",
    description: "Analyze a financed fix-and-flip deal: a loan on the purchase and rehab, interest and points over the project, and your profit and return on the cash you actually put in.",
    metaTitle: "Fix and Flip Calculator — Financed Deal Profit",
    metaDescription: "Free fix and flip calculator. Finance the purchase and rehab, add interest and points, and see net profit and ROI on the cash you actually invest.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 220000, max: 10000000000, step: 1000 }),
      currencyField("rehabCost", "Rehab Cost", { default: 50000, max: 1000000000, step: 500 }),
      currencyField("afterRepairValue", "After-Repair Value (Sale Price)", { default: 360000, max: 10000000000, step: 1000 }),
      percentField("loanPercentOfCost", "Loan (% of Purchase + Rehab)", { default: 85, max: 100, step: 1 }),
      percentField("loanRatePercent", "Loan Interest Rate", { default: 11, max: 30, step: 0.25 }),
      percentField("pointsPercent", "Loan Points", { default: 2, max: 10, step: 0.25 }),
      numberField("projectMonths", "Project Length", { unit: "months", default: 6, min: 0, max: 60, step: 1 }),
      percentField("otherCostsPercentOfArv", "Buying, Holding & Selling Costs (% of ARV)", { default: 10, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Net Profit", format: "currency" },
    calcResults: [
      { key: "netProfit", label: "Net Profit", format: "currency", highlight: true },
      { key: "roiOnCashPercent", label: "ROI on Your Cash", format: "percentage" },
      { key: "cashYouPutIn", label: "Cash You Put In", format: "currency" },
      { key: "financingCost", label: "Financing Cost (Interest + Points)", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
    ],
    instructions: "Enter the purchase price, rehab cost and after-repair value, then the loan terms: how much of purchase plus rehab the lender funds, the rate, points and project length. Other costs cover closing, holding and selling.",
    examples: "Example: a $229,500 loan (85% of $270,000) at 11% plus 2 points costs $17,212.50 over 6 months. Selling at $360,000 after $36,000 of other costs leaves $36,787.50 of profit on $57,712.50 of your cash — a 63.74% return.",
    assumptions: "Interest is charged on the full loan for the whole project; many lenders release rehab money in draws, which lowers interest. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why does financing raise ROI but lower profit?", answer: "Interest and points reduce profit, but you put in far less cash, so the return on your money rises — as long as the flip sells as planned." }],
  },
  {
    slug: "fix-and-flip-loan-calculator",
    title: "Fix and Flip Loan Calculator",
    description: "Size a hard money fix-and-flip loan by loan-to-cost and after-repair-value limits, and see the monthly interest-only payment, points and cash you need to bring.",
    metaTitle: "Fix and Flip Loan Calculator — Hard Money Sizing",
    metaDescription: "Free fix and flip loan calculator. Size a hard money loan by loan-to-cost and ARV limits, with monthly interest, points and cash needed to close.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 200000, max: 10000000000, step: 1000 }),
      currencyField("rehabBudget", "Rehab Budget", { default: 60000, max: 1000000000, step: 500 }),
      currencyField("afterRepairValue", "After-Repair Value (ARV)", { default: 340000, max: 10000000000, step: 1000 }),
      percentField("purchaseLtcPercent", "Purchase Funded (Loan-to-Cost)", { default: 90, max: 100, step: 1 }),
      percentField("rehabFundedPercent", "Rehab Funded", { default: 100, max: 100, step: 5 }),
      percentField("maxArvLtvPercent", "Maximum Loan as % of ARV", { default: 70, max: 100, step: 1 }),
      percentField("interestRatePercent", "Interest Rate", { default: 11, max: 30, step: 0.25 }),
      percentField("pointsPercent", "Points", { default: 2, max: 10, step: 0.25 }),
    ],
    calcResult: { label: "Loan Amount", format: "currency" },
    calcResults: [
      { key: "loanAmount", label: "Loan Amount", format: "currency", highlight: true },
      { key: "monthlyInterestPayment", label: "Monthly Interest-Only Payment", format: "currency" },
      { key: "pointsAtClosing", label: "Points at Closing", format: "currency" },
      { key: "cashNeededForPurchaseAndRehab", label: "Your Cash for Purchase, Rehab & Points", format: "currency" },
      { key: "limitedByArvCap", label: "Loan Cut by ARV Cap", format: "currency" },
    ],
    instructions: "Enter the purchase price, rehab budget and ARV, then the lender's terms: the share of the price and rehab they fund, the ARV cap, rate and points. The loan is the lower of the cost-based amount and the ARV cap.",
    examples: "Example: 90% of a $200,000 price plus 100% of a $60,000 rehab is $240,000, but a 70% ARV cap on $340,000 limits the loan to $238,000 ($2,000 less). Interest is $2,181.67 a month, points are $4,760, and you bring $26,760.",
    assumptions: "Closing costs beyond points and the monthly payments are extra cash you'll need. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What are typical hard money loan terms?", answer: "Often 10% to 13% interest, 1 to 3 points, 6 to 18 month terms, funding up to 85% to 90% of the price and 100% of the rehab, capped at 65% to 75% of ARV." }],
  },
  {
    slug: "fix-and-flip-financing-calculator",
    title: "Fix and Flip Financing Calculator",
    description: "Compare financing a flip with hard money against paying all cash — the cost of the loan, profit, cash needed and ROI either way.",
    metaTitle: "Fix and Flip Financing — Hard Money vs All Cash",
    metaDescription: "Free fix and flip financing calculator. Compare a hard money loan with paying cash: financing cost, profit, cash needed and ROI either way.",
    calcInputs: [
      currencyField("totalProjectCost", "Total Project Cost", { default: 280000, max: 10000000000, step: 1000 }),
      currencyField("expectedProfitBeforeFinancing", "Expected Profit Before Financing", { default: 55000, max: 1000000000, step: 500 }),
      percentField("loanPercentOfCost", "Loan (% of Project Cost)", { default: 80, max: 100, step: 1 }),
      percentField("interestRatePercent", "Interest Rate", { default: 11, max: 30, step: 0.25 }),
      percentField("pointsPercent", "Points", { default: 2, max: 10, step: 0.25 }),
      numberField("projectMonths", "Project Length", { unit: "months", default: 6, min: 0.5, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "ROI with Financing", format: "percentage" },
    calcResults: [
      { key: "roiWithFinancingPercent", label: "ROI with Financing", format: "percentage", highlight: true },
      { key: "roiAllCashPercent", label: "ROI Paying All Cash", format: "percentage" },
      { key: "costOfFinancing", label: "Cost of Financing", format: "currency" },
      { key: "profitWithFinancing", label: "Profit with Financing", format: "currency" },
      { key: "cashNeededWithFinancing", label: "Cash Needed with Financing", format: "currency" },
    ],
    instructions: "Enter the total project cost, the profit you'd make paying cash, and the loan terms you've been offered.",
    examples: "Example: an 80% loan on a $280,000 flip costs $16,800 in interest and points over 6 months, cutting profit to $38,200. But you need only $72,800 of cash, so ROI jumps to 52.47% versus 19.64% paying all cash.",
    assumptions: "Interest-only on the full loan for the whole project. " + GENERAL_DISCLAIMER,
    faq: [{ question: "When is paying cash better?", answer: "When you have only one deal to fund, or the flip might sell slowly — cash has no monthly interest. Financing makes sense when it lets you run several flips at once." }],
  },
  {
    slug: "renovation-cost-calculator",
    title: "Renovation Cost Calculator",
    description: "Estimate what a home renovation will cost from its size and finish level, with design, permits and a contingency, and how much of the cost you may recoup in value.",
    metaTitle: "Renovation Cost Calculator — By Size & Finish",
    metaDescription: "Free renovation cost calculator. Estimate a home remodel from square footage and finish level with permits and contingency, and see cost recouped.",
    calcInputs: [
      numberField("squareFeet", "Area Being Renovated", { unit: "sq ft", default: 400, min: 0, max: 100000, step: 10 }),
      dropdownField("costPerSquareFoot", "Finish Level", 150, [
        { label: "Basic — about $100 per sq ft", value: 100 },
        { label: "Mid-range — about $150 per sq ft", value: 150 },
        { label: "High-end — about $250 per sq ft", value: 250 },
        { label: "Luxury — about $400 per sq ft", value: 400 },
      ]),
      currencyField("permitsAndDesign", "Permits & Design Fees", { default: 3500, max: 10000000, step: 100 }),
      percentField("contingencyPercent", "Contingency", { default: 15, max: 50, step: 1 }),
      currencyField("expectedValueAdded", "Expected Increase in Home Value", { default: 50000, max: 1000000000, step: 1000 }),
    ],
    calcResult: { label: "Total Renovation Cost", format: "currency" },
    calcResults: [
      { key: "totalRenovationCost", label: "Total Renovation Cost", format: "currency", highlight: true },
      { key: "costBeforeContingency", label: "Cost Before Contingency", format: "currency" },
      { key: "contingency", label: "Contingency", format: "currency" },
      { key: "costRecoupedPercent", label: "Cost Recouped in Value", format: "percentage" },
    ],
    instructions: "Enter the area you're renovating, choose a finish level, and add permits and design fees and a contingency for surprises. If you know roughly how much the work will add to your home's value, enter it to see how much you'd recoup.",
    examples: "Example: 400 sq ft at a mid-range $150 per sq ft plus $3,500 of permits and design is $63,500. A 15% contingency ($9,525) brings the total to $73,025. If the work adds $50,000 of value, you recoup 68.47%.",
    assumptions: "Per-square-foot costs vary widely by region and project; kitchens and bathrooms cost far more per foot than bedrooms. Get contractor quotes. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Which renovations recoup the most?", answer: "Smaller, practical projects — garage doors, entry doors, siding and minor kitchen remodels — tend to recoup the most. Big luxury remodels often recoup less than half their cost." }],
  },
  {
    slug: "rehab-cost-calculator",
    title: "Rehab Cost Calculator",
    description: "Estimate an investor rehab from the scope of work — light, medium or heavy per square foot — plus big-ticket items like a roof, HVAC or foundation, and a contingency.",
    metaTitle: "Rehab Cost Calculator — Investor Rehab Estimate",
    metaDescription: "Free rehab cost calculator for investors. Estimate a light, medium or heavy rehab by square foot plus roof, HVAC and foundation work, with contingency.",
    calcInputs: [
      numberField("squareFeet", "House Size", { unit: "sq ft", default: 1400, min: 0, max: 1000000, step: 10 }),
      dropdownField("scopeCostPerSqft", "Rehab Scope", 45, [
        { label: "Light (paint, flooring, fixtures) — about $20 per sq ft", value: 20 },
        { label: "Medium (plus kitchen & baths) — about $45 per sq ft", value: 45 },
        { label: "Heavy (gut rehab) — about $75 per sq ft", value: 75 },
      ]),
      currencyField("roof", "Roof Replacement", { default: 0, max: 10000000, step: 500 }),
      currencyField("hvac", "HVAC System", { default: 7500, max: 10000000, step: 500 }),
      currencyField("foundationOrMajorItems", "Foundation or Other Major Items", { default: 0, max: 10000000, step: 500 }),
      percentField("contingencyPercent", "Contingency", { default: 10, max: 50, step: 1 }),
    ],
    calcResult: { label: "Total Rehab Estimate", format: "currency" },
    calcResults: [
      { key: "totalRehabEstimate", label: "Total Rehab Estimate", format: "currency", highlight: true },
      { key: "generalScopeCost", label: "General Scope Cost", format: "currency" },
      { key: "bigTicketItems", label: "Big-Ticket Items", format: "currency" },
      { key: "allInPerSquareFoot", label: "All-In Cost per Sq Ft", format: "currency" },
    ],
    instructions: "Enter the house size and choose the scope of work, then add any big-ticket items your inspection turned up and a contingency. Enter 0 for items that don't need work.",
    examples: "Example: a medium rehab on 1,400 sq ft at $45 per sq ft is $63,000. Adding a $7,500 HVAC system and a 10% contingency gives $77,550 — $55.39 per square foot all in.",
    assumptions: "Scope costs are rough national averages; labor and material costs vary a lot by market. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How do investors estimate rehab costs quickly?", answer: "Walk the house, pick a scope level per square foot, then add big items separately. Firm up the budget with contractor bids before you close." }],
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
