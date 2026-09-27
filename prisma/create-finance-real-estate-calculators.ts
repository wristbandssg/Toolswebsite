// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// the "Real Estate Calculators" batch. Fourth of 8 new topic batches built
// from Finance_Calculators_Topical_SEO_Master.xlsx. Filed under the
// existing "Real Estate Calculators" category (real-estate-calculators),
// created empty by reparent-tool-categories-under-finance.ts and populated
// here for the first time — including the mortgage-flavored tools, which
// stay in this category rather than the separate "Mortgage Calculators"
// shell, per the source file's own Cluster grouping (confirmed with the
// user rather than split across categories).
//
// See src/lib/calc-engine-finance-real-estate.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-finance-real-estate-calculators.ts
// or
//   npm run db:create-finance-real-estate-calculators

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
    step: opts.step ?? 500,
  };
}

function percentField(
  key: string,
  label: string,
  opts: { required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "percentage",
    unit: "%",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 40,
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
    max: opts.max ?? 100,
    step: opts.step ?? 1,
  };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. Actual costs, rates, and closing charges vary by lender, location, and property — confirm exact " +
  "figures with your lender, agent, or a qualified professional.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "mortgage-payment-calculator",
    title: "Mortgage Payment Calculator",
    description: "Calculate your full monthly mortgage payment — principal, interest, property tax, insurance, and HOA.",
    metaTitle: "Mortgage Payment Calculator — Free & Instant",
    metaDescription: "Free mortgage payment calculator. Enter your home price, down payment, rate, and term to see your full monthly payment including taxes and insurance.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 400000, max: 20000000, step: 1000 }),
      currencyField("downPaymentAmount", "Down Payment", { default: 80000, max: 20000000, step: 1000 }),
      percentField("annualInterestRate", "Annual Interest Rate (APR)", { default: 6.5, max: 15, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, max: 40, step: 1 }),
      currencyField("annualPropertyTax", "Annual Property Tax", { required: false, default: 4800, max: 500000, step: 100 }),
      currencyField("annualHomeInsurance", "Annual Home Insurance", { required: false, default: 1500, max: 100000, step: 50 }),
      currencyField("monthlyHoa", "Monthly HOA Fee", { required: false, default: 0, max: 5000, step: 25 }),
    ],
    calcResult: { label: "Total Monthly Payment", format: "currency" },
    calcResults: [
      { key: "principalAndInterest", label: "Principal & Interest", format: "currency" },
      { key: "monthlyPropertyTax", label: "Monthly Property Tax", format: "currency" },
      { key: "monthlyInsurance", label: "Monthly Insurance", format: "currency" },
      { key: "totalMonthlyPayment", label: "Total Monthly Payment (PITI + HOA)", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your home price, down payment, interest rate, and loan term, plus your estimated annual property " +
      "tax, annual home insurance, and monthly HOA fee if any. The result breaks down your principal & interest " +
      "payment and combines it with taxes, insurance, and HOA into your total monthly payment (often called " +
      "PITI: Principal, Interest, Taxes, Insurance).",
    examples: "Example: a $400,000 home with an $80,000 down payment (a $320,000 loan), 6.5% APR, 30-year term, $4,800 annual property tax, and $1,500 annual insurance comes to about $2,022.62 in principal & interest — a $2,547.62 total monthly payment.",
    assumptions: "This assumes a fixed-rate, fully amortizing loan. Property tax and insurance are entered as annual estimates you supply — actual amounts depend on your specific property and location, and often change over time. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What does PITI stand for?",
        answer: "Principal, Interest, Taxes, Insurance — the four components most lenders bundle into a single monthly mortgage payment, often collected via an escrow account.",
      },
      {
        question: "Does this include private mortgage insurance (PMI)?",
        answer: "No — PMI (typically required when your down payment is below 20%) isn't included here. If it applies to you, add its estimated monthly cost to the property tax or insurance fields as an approximation.",
      },
    ],
  },
  {
    slug: "mortgage-affordability-calculator",
    title: "Mortgage Affordability Calculator",
    description: "Find the maximum home price you can likely afford, based on your income, existing debt, and target debt-to-income ratio.",
    metaTitle: "Mortgage Affordability Calculator — Free & Instant",
    metaDescription: "Free mortgage affordability calculator. Enter your income, debts, and target DTI to see your maximum affordable loan amount and home price.",
    calcInputs: [
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 8000, max: 1000000, step: 100 }),
      currencyField("monthlyDebtPayments", "Existing Monthly Debt Payments", { required: false, default: 500, max: 100000, step: 50 }),
      currencyField("downPaymentAmount", "Down Payment", { default: 80000, max: 20000000, step: 1000 }),
      percentField("annualInterestRate", "Annual Interest Rate (APR)", { default: 6.5, max: 15, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, max: 40, step: 1 }),
      percentField("maxDtiPercent", "Target Debt-to-Income Ratio", { default: 36, max: 50, step: 1 }),
    ],
    calcResult: { label: "Max Affordable Home Price", format: "currency" },
    calcResults: [
      { key: "maxMonthlyPayment", label: "Max Monthly Housing Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Max Loan Amount", format: "currency" },
      { key: "maxHomePrice", label: "Max Affordable Home Price", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your gross monthly income, existing monthly debt payments (car loans, student loans, minimum " +
      "credit card payments), your planned down payment, an interest rate and term, and your target " +
      "debt-to-income ratio (36% is a common conservative benchmark; some lenders allow up to 43-50% for " +
      "well-qualified borrowers). The result shows the maximum monthly housing payment, loan amount, and home " +
      "price this supports.",
    examples: "Example: $8,000 in gross monthly income, $500 in existing debt, an $80,000 down payment, 6.5% APR, a 30-year term, and a 36% target DTI supports up to about $2,380 a month toward housing — a $376,541.75 max loan amount, or a $456,541.75 max home price.",
    assumptions: "This estimates principal & interest only against your target DTI — it doesn't separately add property tax, insurance, or HOA into the DTI calculation, which some lenders do include. Lender-specific requirements (credit score, reserves, loan program) can also affect your actual approved amount beyond this estimate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What DTI ratio should I use?",
        answer: "36% is a commonly cited conservative benchmark, while some loan programs allow front-end or back-end DTI up to 43-50% for well-qualified borrowers. Try a few values here to see how it changes your affordability range.",
      },
      {
        question: "Does this guarantee loan approval?",
        answer: "No — this is an estimate based on income and target DTI only. Actual mortgage approval also depends on credit score, employment history, cash reserves, and the specific lender's guidelines.",
      },
    ],
  },
  {
    slug: "cap-rate-calculator",
    title: "Cap Rate Calculator",
    description: "Calculate the capitalization rate (cap rate) of an investment property from its net operating income and value — independent of financing.",
    metaTitle: "Cap Rate Calculator — Free & Instant",
    metaDescription: "Free cap rate calculator. Enter your property value, rental income, and operating expenses to see your net operating income and cap rate.",
    calcInputs: [
      currencyField("propertyValue", "Property Value", { default: 250000, max: 100000000, step: 1000 }),
      currencyField("annualRentalIncome", "Annual Rental Income", { default: 24000, max: 100000000, step: 500 }),
      currencyField("annualOperatingExpenses", "Annual Operating Expenses", { default: 8000, max: 100000000, step: 500 }),
    ],
    calcResult: { label: "Cap Rate", format: "percentage" },
    calcResults: [
      { key: "netOperatingIncome", label: "Net Operating Income (NOI)", format: "currency" },
      { key: "capRatePercent", label: "Cap Rate", format: "percentage", highlight: true },
    ],
    instructions:
      "Enter the property's value, its annual rental income, and its annual operating expenses (property " +
      "management, maintenance, property tax, insurance, HOA — everything except mortgage payments). The result " +
      "shows net operating income (NOI) and cap rate — a measure of return that deliberately ignores financing, " +
      "so it can be used to compare properties bought with cash, a mortgage, or any other financing structure.",
    examples: "Example: a $250,000 property with $24,000 in annual rental income and $8,000 in annual operating expenses gives a $16,000 NOI — a 6.4% cap rate.",
    assumptions:
      "Cap rate deliberately EXCLUDES mortgage payments (financing costs), which is what makes it useful for " +
      "comparing properties regardless of how they're financed. For a return figure that DOES include your " +
      "specific financing and cash invested, see this site's Rental Property Calculator or Real Estate ROI " +
      "Calculator instead. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's considered a good cap rate?",
        answer: "It varies significantly by market and property type — many investors look for 4-10%, with lower cap rates common in high-demand, low-risk markets and higher cap rates in higher-risk or higher-yield markets. Compare against similar properties in the same area rather than a universal number.",
      },
      {
        question: "Why doesn't this include my mortgage payment?",
        answer: "Cap rate is designed to measure a property's return independent of how it's financed, so it can fairly compare an all-cash purchase against a leveraged one. For a return figure that reflects YOUR specific financing, see this site's Rental Property Calculator (monthly cash flow) or Real Estate ROI Calculator (total return including appreciation).",
      },
    ],
  },
  {
    slug: "real-estate-roi-calculator",
    title: "Real Estate ROI Calculator",
    description: "Calculate total return on a real estate investment, combining cash flow and appreciation over your holding period.",
    metaTitle: "Real Estate ROI Calculator — Free & Instant",
    metaDescription: "Free real estate ROI calculator. Enter your cash invested, annual cash flow, appreciation rate, and holding period to see your total and cash-on-cash return.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 250000, max: 100000000, step: 1000 }),
      currencyField("totalCashInvested", "Total Cash Invested (down payment + closing costs)", { default: 50000, max: 100000000, step: 500 }),
      currencyField("annualCashFlow", "Annual Cash Flow (rent minus all expenses)", { required: false, default: 6000, max: 10000000, step: 100 }),
      percentField("annualAppreciationPercent", "Expected Annual Appreciation", { default: 3, max: 20, step: 0.1 }),
      numberField("holdingPeriodYears", "Holding Period (Years)", { default: 5, max: 50, step: 1 }),
    ],
    calcResult: { label: "Total ROI", format: "percentage" },
    calcResults: [
      { key: "equityGain", label: "Equity Gain From Appreciation", format: "currency" },
      { key: "totalGain", label: "Total Gain (appreciation + cash flow)", format: "currency" },
      { key: "totalRoiPercent", label: "Total ROI (over full holding period)", format: "percentage", highlight: true },
      { key: "cashOnCashReturnPercent", label: "Cash-on-Cash Return (annual)", format: "percentage" },
    ],
    instructions:
      "Enter the purchase price, your total cash invested (down payment plus closing costs), your annual cash " +
      "flow from rent after all expenses, your expected annual appreciation rate, and how many years you plan " +
      "to hold the property. The result shows your equity gain from appreciation, total gain combining " +
      "appreciation and cash flow, total ROI over the whole holding period, and annual cash-on-cash return.",
    examples: "Example: a $250,000 property with $50,000 cash invested, $6,000 in annual cash flow, 3% annual appreciation, held for 5 years, gains about $39,818.52 in equity from appreciation — a $69,818.52 total gain, or a 139.64% total ROI (12% annual cash-on-cash return).",
    assumptions:
      "This doesn't account for selling costs if you eventually sell (see this site's House Flipping Calculator " +
      "for a tool that does), and it assumes a steady appreciation rate and constant annual cash flow, which " +
      "real properties rarely deliver exactly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between total ROI and cash-on-cash return?",
        answer: "Cash-on-cash return measures only the annual cash flow against your cash invested (a yearly figure). Total ROI combines that cash flow with equity gained from appreciation over your ENTIRE holding period — it's a cumulative, not annual, figure.",
      },
      {
        question: "How is this different from Cap Rate?",
        answer: "Cap rate ignores financing and appreciation entirely, comparing NOI to property value. This tool is built around YOUR actual cash invested and includes appreciation over your specific holding period, making it a more personalized return figure.",
      },
    ],
  },
  {
    slug: "house-flipping-calculator",
    title: "House Flipping Calculator",
    description: "Calculate the profit and ROI on a house flip, from purchase price, renovation cost, holding costs, and selling price.",
    metaTitle: "House Flipping Calculator — Free & Instant",
    metaDescription: "Free house flipping calculator. Enter your purchase price, renovation cost, holding costs, and expected selling price to see your net profit and ROI.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 200000, max: 100000000, step: 1000 }),
      currencyField("renovationCost", "Renovation Cost", { default: 40000, max: 10000000, step: 500 }),
      currencyField("holdingCosts", "Holding Costs (loan interest, utilities, insurance during the flip)", { required: false, default: 8000, max: 1000000, step: 500 }),
      currencyField("sellingPrice", "Expected Selling Price", { default: 300000, max: 100000000, step: 1000 }),
      percentField("sellingCostsPercent", "Selling Costs (agent fees, closing costs)", { default: 6, max: 20, step: 0.5 }),
    ],
    calcResult: { label: "Net Profit", format: "currency" },
    calcResults: [
      { key: "totalInvestment", label: "Total Investment", format: "currency" },
      { key: "sellingCosts", label: "Selling Costs", format: "currency" },
      { key: "netProfit", label: "Net Profit", format: "currency", highlight: true },
      { key: "roiPercent", label: "ROI", format: "percentage" },
    ],
    instructions:
      "Enter your purchase price, renovation budget, holding costs (loan interest, utilities, insurance, and " +
      "similar costs during the time you own the property), expected selling price, and estimated selling costs " +
      "(agent commission and closing costs, commonly 6-10% combined). The result shows total investment, " +
      "selling costs, net profit, and ROI on the flip.",
    examples: "Example: a $200,000 purchase, $40,000 renovation, $8,000 holding costs, and a $300,000 selling price at 6% selling costs gives $18,000 in selling costs and a $34,000 net profit — a 13.71% ROI.",
    assumptions:
      "Selling costs (agent commission, transfer taxes, closing costs) are entered as a single combined " +
      "percentage — actual costs vary by location and negotiated commission rates. This also doesn't include " +
      "the value of your own time spent managing the project. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a typical selling costs percentage?",
        answer: "Real estate agent commissions plus closing costs commonly total somewhere around 6-10% of the selling price, though this varies by location and negotiated rates — check with a local agent for your market's typical figure.",
      },
      {
        question: "What should I include in holding costs?",
        answer: "Loan interest (if the purchase or renovation was financed), property taxes, insurance, utilities, and any other carrying cost during the period between purchase and sale — these add up quickly on flips that take longer than expected.",
      },
    ],
  },
  {
    slug: "rent-vs-buy-calculator",
    title: "Rent vs Buy Calculator",
    description: "Compare the total cost of renting against buying a home over your expected time in the property.",
    metaTitle: "Rent vs Buy Calculator — Free & Instant",
    metaDescription: "Free rent vs buy calculator. Compare your total cost of renting against buying, accounting for equity and appreciation, over your expected holding period.",
    calcInputs: [
      currencyField("monthlyRent", "Monthly Rent", { default: 1800, max: 100000, step: 50 }),
      percentField("rentIncreasePercent", "Expected Annual Rent Increase", { required: false, default: 3, max: 20, step: 0.5 }),
      currencyField("homePrice", "Home Price", { default: 350000, max: 20000000, step: 1000 }),
      currencyField("downPaymentAmount", "Down Payment", { default: 70000, max: 20000000, step: 1000 }),
      percentField("annualInterestRate", "Annual Interest Rate (APR)", { default: 6.5, max: 15, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, max: 40, step: 1 }),
      currencyField("annualPropertyTax", "Annual Property Tax", { required: false, default: 4200, max: 500000, step: 100 }),
      currencyField("annualHomeInsurance", "Annual Home Insurance", { required: false, default: 1400, max: 100000, step: 50 }),
      currencyField("monthlyHoa", "Monthly HOA Fee", { required: false, default: 0, max: 5000, step: 25 }),
      percentField("homeAppreciationPercent", "Expected Annual Home Appreciation", { default: 3, max: 20, step: 0.1 }),
      numberField("yearsToStay", "Years You Plan to Stay", { default: 7, max: 40, step: 1 }),
    ],
    calcResult: { label: "Net Advantage of Buying", format: "currency" },
    calcResults: [
      { key: "totalRentCost", label: "Total Cost of Renting", format: "currency" },
      { key: "netCostOfBuying", label: "Net Cost of Buying (after equity/appreciation)", format: "currency" },
      { key: "netAdvantageOfBuying", label: "Net Advantage of Buying (positive = buying wins)", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your monthly rent and expected annual rent increase, your home purchase details (price, down " +
      "payment, rate, term, taxes, insurance, HOA), expected annual home appreciation, and how many years you " +
      "plan to stay. The result compares the total cost of renting against the NET cost of buying (your total " +
      "payments minus the equity and appreciation you'd have built by the end) — a positive \"net advantage of " +
      "buying\" means buying comes out ahead over that time frame.",
    examples: "Example: $1,800/month rent (3% annual increases) versus a $350,000 home with a $70,000 down payment, 6.5% APR, 30-year term, over 7 years: renting costs about $165,509.18 total, while buying's net cost (after equity and appreciation) comes to about $80,572.03 — a $84,937.15 net advantage for buying.",
    assumptions:
      "This doesn't include selling costs if you eventually sell the home (see this site's House Flipping " +
      "Calculator or Closing Cost Calculator for those figures), maintenance costs (often estimated at 1-2% of " +
      "home value per year), or the investment return you'd have earned by investing the rent-vs-buy cash " +
      "difference elsewhere. The break-even point between renting and buying is highly sensitive to how long you " +
      "stay — buying generally looks better the longer you stay, due to upfront closing costs being spread over " +
      "more years. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does buying usually look better the longer I stay?",
        answer: "Upfront costs (closing costs, and the fact that early mortgage payments are mostly interest rather than equity) are spread over more years the longer you stay, while rent has no equivalent one-time cost — so buying's relative advantage typically grows with a longer holding period.",
      },
      {
        question: "Does this include home maintenance costs?",
        answer: "No — ongoing maintenance (commonly estimated at 1-2% of home value per year) isn't included here, which would reduce buying's net advantage somewhat. Consider adding an estimate manually to your own comparison.",
      },
    ],
  },
  {
    slug: "down-payment-calculator",
    title: "Down Payment Calculator",
    description: "Calculate your down payment amount and resulting loan amount from a home price and down payment percentage.",
    metaTitle: "Down Payment Calculator — Free & Instant",
    metaDescription: "Free down payment calculator. Enter your home price and down payment percentage to see your down payment amount and loan amount.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 350000, max: 20000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment Percentage", { default: 20, max: 100, step: 1 }),
    ],
    calcResult: { label: "Down Payment Amount", format: "currency" },
    calcResults: [
      { key: "downPaymentAmount", label: "Down Payment Amount", format: "currency", highlight: true },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
    ],
    instructions:
      "Enter the home price and your target down payment percentage. The result shows the dollar amount you'd " +
      "need to put down and the resulting loan amount.",
    examples: "Example: a $350,000 home with a 20% down payment requires $70,000 down — a $280,000 loan amount.",
    assumptions:
      "20% is a common benchmark that avoids private mortgage insurance (PMI) on a conventional loan, but many " +
      "loan programs allow much lower down payments (some as low as 0-3.5%) — a lower down payment typically " +
      "means a larger loan, a higher monthly payment, and often added mortgage insurance. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need a 20% down payment to buy a home?",
        answer: "No — many loan programs allow much less (conventional loans can go as low as 3%, FHA loans around 3.5%, and VA/USDA loans sometimes 0% for eligible borrowers). 20% is mainly notable because it avoids private mortgage insurance (PMI) on a conventional loan.",
      },
      {
        question: "What happens if I put down less than 20%?",
        answer: "On most conventional loans, you'll likely pay for private mortgage insurance (PMI) until you reach 20% equity, which adds to your monthly payment — factor this into your budget if you're planning a smaller down payment.",
      },
    ],
  },
  {
    slug: "closing-cost-calculator",
    title: "Closing Cost Calculator",
    description: "Estimate closing costs on a home purchase as a percentage of the home price.",
    metaTitle: "Closing Cost Calculator — Free & Instant",
    metaDescription: "Free closing cost calculator. Enter your home price to see an estimated closing cost range and total.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 350000, max: 20000000, step: 1000 }),
      percentField("closingCostPercent", "Estimated Closing Cost Percentage", { default: 3, max: 10, step: 0.25 }),
    ],
    calcResult: { label: "Estimated Closing Costs", format: "currency" },
    calcResults: [
      { key: "estimatedClosingCosts", label: "Estimated Closing Costs (at your %)", format: "currency", highlight: true },
      { key: "lowEstimate", label: "Low Estimate (2% of price)", format: "currency" },
      { key: "highEstimate", label: "High Estimate (5% of price)", format: "currency" },
    ],
    instructions:
      "Enter the home price and your estimated closing cost percentage (closing costs typically run 2-5% of " +
      "the home price, covering loan origination fees, appraisal, title insurance, attorney fees, recording " +
      "fees, and more). The result shows your estimate at that percentage, plus the typical low and high range " +
      "for comparison.",
    examples: "Example: a $350,000 home at an estimated 3% closing cost rate comes to $10,500 in closing costs — with a typical range of $7,000 (2%) to $17,500 (5%).",
    assumptions:
      "Closing costs vary significantly by location, lender, and loan type — some states and lenders run " +
      "notably higher or lower than the common 2-5% range. This is a rough percentage-based estimate, not an " +
      "itemized breakdown of specific fees (which your lender's Loan Estimate document will show once you " +
      "apply). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's typically included in closing costs?",
        answer: "Common items include loan origination fees, appraisal fees, title search and title insurance, attorney fees, recording fees, prepaid property tax and insurance (into escrow), and sometimes points paid to lower your interest rate.",
      },
      {
        question: "Can closing costs be negotiated or rolled into the loan?",
        answer: "Sometimes — you can ask the seller to cover some closing costs (a \"seller credit\"), and some loan programs allow certain costs to be rolled into the loan amount rather than paid upfront, though this increases what you finance and pay interest on.",
      },
    ],
  },
  {
    slug: "rental-property-calculator",
    title: "Rental Property Calculator",
    description: "Calculate the monthly cash flow and cash-on-cash return of a rental property, accounting for your specific mortgage financing.",
    metaTitle: "Rental Property Calculator — Free & Instant",
    metaDescription: "Free rental property calculator. Enter your purchase details, rent, and expenses to see your monthly cash flow and cash-on-cash return.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 250000, max: 100000000, step: 1000 }),
      currencyField("downPaymentAmount", "Down Payment", { default: 50000, max: 100000000, step: 500 }),
      currencyField("monthlyRent", "Monthly Rent", { default: 2200, max: 1000000, step: 50 }),
      currencyField("monthlyExpenses", "Monthly Operating Expenses (management, maintenance, tax, insurance, HOA)", { required: false, default: 500, max: 1000000, step: 25 }),
      percentField("annualInterestRate", "Annual Interest Rate (APR)", { default: 6.5, max: 15, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, max: 40, step: 1 }),
    ],
    calcResult: { label: "Monthly Cash Flow", format: "currency" },
    calcResults: [
      { key: "monthlyMortgagePayment", label: "Monthly Mortgage Payment", format: "currency" },
      { key: "monthlyCashFlow", label: "Monthly Cash Flow", format: "currency", highlight: true },
      { key: "annualCashFlow", label: "Annual Cash Flow", format: "currency" },
      { key: "cashOnCashReturnPercent", label: "Cash-on-Cash Return", format: "percentage" },
    ],
    instructions:
      "Enter your purchase price, down payment, monthly rent, monthly operating expenses (property management, " +
      "maintenance, property tax, insurance, HOA — everything except the mortgage), and your loan's rate and " +
      "term. The result shows your monthly mortgage payment, monthly and annual cash flow after financing, and " +
      "your cash-on-cash return (annual cash flow as a percentage of your cash invested).",
    examples: "Example: a $250,000 property with a $50,000 down payment, $2,200 monthly rent, $500 monthly expenses, 6.5% APR, and a 30-year term comes to about $1,264.14 in monthly mortgage payment, leaving $435.86 in monthly cash flow — $5,230.37 a year, a 10.46% cash-on-cash return.",
    assumptions:
      "This assumes full occupancy with no vacancy — a real rental typically has some vacancy period between " +
      "tenants that would reduce actual cash flow below this estimate. It also doesn't include appreciation " +
      "(see this site's Real Estate ROI Calculator for a figure that does) or a cap rate figure independent of " +
      "financing (see this site's Cap Rate Calculator). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I include a vacancy allowance?",
        answer: "This calculator assumes full occupancy — for a more conservative estimate, add an allowance (commonly 5-8% of rent) to your monthly expenses to account for periods between tenants.",
      },
      {
        question: "How is this different from Cap Rate?",
        answer: "Cap rate ignores your specific financing entirely (NOI divided by property value). This tool builds in YOUR actual mortgage payment, showing the cash flow you'd actually see after your specific loan — a more personal, financing-aware figure.",
      },
    ],
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
