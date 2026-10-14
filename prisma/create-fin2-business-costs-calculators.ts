// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// finance expansion 2 sub-batch "business-costs". See
// src/lib/calc-engine-fin2-investing.ts for the full list of 9 sub-batches,
// and src/lib/calc-engine-fin2-business-costs.ts for the math. Each tool is filed in
// the Finance Calculators sub-category the user named for it (created on
// first run).
//
// HOW TO RUN
//   npx tsx prisma/create-fin2-business-costs-calculators.ts
// or
//   npm run db:create-fin2-business-costs-calculators

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

const TOOLS: ToolDef[] = [
  {
    slug: "3d-printer-buy-vs-outsource-calculator",
    category: BUSINESS_CATEGORY,
    title: "3D Printer Buy vs Outsource Calculator",
    description: "Compare buying a 3D printer with outsourcing your prints — your cost per print (machine, filament, electricity, upkeep), yearly savings and break-even number of prints.",
    metaTitle: "3D Printer Buy vs Outsource Calculator — Cost per Print",
    metaDescription: "Free 3D printer buy vs outsource calculator. Compare your own cost per print with a print service, see yearly savings and how many prints pay for the printer.",
    calcInputs: [currencyField("printerCost", "Printer Price", { default: 800, max: 1000000, step: 10 }), numberField("lifespanYears", "Years You'll Use It", { default: 3, min: 0.5, max: 20, step: 0.5 }), numberField("printsPerYear", "Prints per Year", { default: 200, min: 1, max: 1000000 }), numberField("gramsPerPrint", "Filament per Print (grams)", { default: 60, max: 100000 }), currencyField("filamentPerKg", "Filament Price per kg", { default: 25, max: 10000, step: 0.5 }), numberField("printHours", "Print Time per Print (hours)", { default: 4, max: 1000, step: 0.5 }), numberField("printerWatts", "Printer Power Draw (watts)", { default: 150, max: 10000 }), currencyField("electricityRate", "Electricity Price per kWh", { default: 0.17, max: 10, step: 0.01 }), currencyField("maintenancePerYear", "Maintenance & Parts per Year", { default: 60, max: 100000, step: 5, required: false }), currencyField("outsourcePrice", "Outsourced Price per Print", { default: 20, max: 100000, step: 0.5 })],
    calcResult: { label: "Own Cost per Print", format: "currency" },
    calcResults: [cur("filamentCostPerPrint", "Filament per Print"), cur("electricityCostPerPrint", "Electricity per Print"), cur("ownCostPerPrint", "Your Cost per Print (all-in)", true), cur("yearlyOwnCost", "Yearly Cost — Own Printer"), cur("yearlyOutsourceCost", "Yearly Cost — Outsourcing"), cur("yearlySavings", "Yearly Savings from Buying"), num("breakEvenPrints", "Prints to Pay Off the Printer")],
    instructions: "Enter the printer's price and how long you'll use it, how many prints a year you need, and the material, time and power each print takes. Compare with a quote from a print service or online bureau.",
    examples: "Example: an $800 printer used for 3 years at 200 prints a year, with 60 g of $25/kg filament and 4 hours at 150 W per print, costs about $3.24 a print all-in versus $20 outsourced — saving $3,353 a year. It pays for itself after 45 prints.",
    assumptions: "The printer is written off evenly over its life. Your time, failed prints (often 5–10%) and post-processing aren't included; add a margin for them. Outsourcing usually wins for occasional, large or industrial-material parts.",
    faq: [
      { question: "How much does a 3D print cost in electricity?", answer: "Very little — a 150 W printer running 4 hours uses 0.6 kWh, about 10 cents." },
      { question: "When should I outsource 3D printing?", answer: "For a few prints a year, very large parts, or materials like nylon, metal or resin your printer can't handle." },
    ],
  },
  {
    slug: "build-vs-buy-calculator",
    category: BUSINESS_CATEGORY,
    title: "Build vs Buy Calculator",
    description: "Compare building software or a capability in-house with buying a ready-made solution — total and present-value cost of each over several years, and when building breaks even.",
    metaTitle: "Build vs Buy Calculator — In-House vs Vendor Cost",
    metaDescription: "Free build vs buy calculator. Compare upfront and yearly costs of building in-house versus buying a SaaS or vendor product, in total and present value.",
    calcInputs: [numberField("years", "Years to Compare", { default: 5, min: 1, max: 30 }), percentField("discountRate", "Discount Rate", { default: 8, max: 50 }), currencyField("buildUpfront", "Build — Upfront Development Cost", { default: 250000, max: 10000000000, step: 1000 }), currencyField("buildAnnual", "Build — Yearly Maintenance & Hosting", { default: 40000, max: 10000000000, step: 1000 }), currencyField("buyUpfront", "Buy — Setup & Integration", { default: 20000, max: 10000000000, step: 1000 }), currencyField("buyAnnual", "Buy — Yearly Licence / Subscription", { default: 70000, max: 10000000000, step: 1000 })],
    calcResult: { label: "Cheaper Option", format: "number" },
    calcResults: [cur("buildTotalCost", "Build — Total Cost"), cur("buyTotalCost", "Buy — Total Cost"), cur("buildPresentCost", "Build — Present Value"), cur("buyPresentCost", "Buy — Present Value"), num("cheaperOption", "Cheaper (1 = Build, 2 = Buy)", true), cur("presentValueSavings", "Present-Value Difference"), num("yearBuildBreaksEven", "Year Building Breaks Even (0 = not within period)")],
    instructions: "Enter the upfront and ongoing costs of each route. Include salaries for the developers who'd build and maintain it, and for buying include integration, training and per-seat fees.",
    examples: "Example: building for $250,000 plus $40,000 a year vs buying for $20,000 plus $70,000 a year over 5 years costs $450,000 vs $370,000 — about $409,708 vs $299,490 in present value, so buying is cheaper. Building would only break even in year 8.",
    assumptions: "Yearly costs are paid at the end of each year and discounted at your rate. Opportunity cost of your team's time, risk of delays and strategic value (owning a differentiating capability) aren't priced in. " + DISCLAIMER,
    faq: [
      { question: "When does building make sense?", answer: "When the capability is core to your competitive advantage, or no product fits your needs well." },
      { question: "What hidden costs does building have?", answer: "Ongoing maintenance, security updates, hosting and the key people who know the system — often 15–25% of the build cost a year." },
    ],
  },
  {
    slug: "business-budget-calculator",
    category: BUSINESS_CATEGORY,
    title: "Business Budget Calculator",
    description: "Build a simple monthly business budget — revenue, cost of goods, operating expenses and tax — to see your operating and net profit, net margin and break-even revenue.",
    metaTitle: "Business Budget Calculator — Monthly Profit & Break-Even",
    metaDescription: "Free business budget calculator. Enter monthly revenue, cost of goods and expenses to see gross, operating and net profit, net margin and break-even sales.",
    calcInputs: [currencyField("monthlyRevenue", "Monthly Revenue", { default: 50000, max: 10000000000, step: 100 }), percentField("cogsPercent", "Cost of Goods Sold (% of revenue)", { default: 40 }), currencyField("rent", "Rent & Facilities", { default: 4000, max: 1000000000, step: 50 }), currencyField("payroll", "Payroll (incl. taxes & benefits)", { default: 18000, max: 1000000000, step: 100 }), currencyField("marketing", "Marketing", { default: 2500, max: 1000000000, step: 50, required: false }), currencyField("utilities", "Utilities & Phone", { default: 800, max: 1000000000, step: 10, required: false }), currencyField("software", "Software & Subscriptions", { default: 600, max: 1000000000, step: 10, required: false }), currencyField("insurance", "Insurance", { default: 500, max: 1000000000, step: 10, required: false }), currencyField("otherExpenses", "Other Expenses", { default: 1500, max: 1000000000, step: 10, required: false }), percentField("taxRate", "Income Tax Rate", { default: 21 })],
    calcResult: { label: "Net Profit (monthly)", format: "currency" },
    calcResults: [cur("grossProfit", "Gross Profit"), cur("operatingExpenses", "Operating Expenses"), cur("operatingProfit", "Operating Profit"), cur("incomeTax", "Income Tax"), cur("netProfit", "Net Profit (monthly)", true), pct("netMargin", "Net Margin"), cur("breakEvenRevenue", "Break-Even Monthly Revenue"), cur("yearlyNetProfit", "Net Profit (yearly)")],
    instructions: "Enter a typical month's revenue and what it costs to make or buy what you sell (as a %), then each fixed expense. Use a pass-through owner's personal rate instead of 21% if your business is an LLC or S corp.",
    examples: "Example: $50,000 of revenue at 40% COGS leaves $30,000 gross profit. $27,900 of expenses leaves $2,100 operating profit and $1,659 after 21% tax — a 3.32% net margin. You break even at $46,500 a month.",
    assumptions: "Tax applies only to a profit; interest, depreciation and owner draws aren't separated out. " + DISCLAIMER,
    faq: [
      { question: "What should a small business budget include?", answer: "Revenue forecast, cost of goods, fixed costs like rent and payroll, variable costs, taxes, and a cash reserve." },
      { question: "What is a good net profit margin?", answer: "Around 10% is healthy for many small businesses; retail runs lower and software and services higher." },
    ],
  },
  {
    slug: "cost-function-calculator",
    category: BUSINESS_CATEGORY,
    title: "Cost Function Calculator",
    description: "Calculate total cost from a cost function TC = FC + vQ (+ cQ²) — total variable cost, average fixed, variable and total cost, and marginal cost at any output.",
    metaTitle: "Cost Function Calculator — Total, Average & Marginal Cost",
    metaDescription: "Free cost function calculator. Find total cost, average fixed cost, average variable cost, average total cost and marginal cost from fixed and variable costs.",
    calcInputs: [currencyField("fixedCost", "Fixed Cost (FC)", { default: 5000, max: 10000000000, step: 1 }), currencyField("variableCost", "Variable Cost per Unit (v)", { default: 12, max: 100000000, step: 0.01 }), numberField("quadraticTerm", "Quadratic Term c (optional, for cQ²)", { default: 0, min: -1000, max: 1000, step: 0.0001, required: false }), numberField("quantity", "Quantity (Q)", { default: 500, max: 10000000000 })],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [cur("totalCost", "Total Cost (TC)", true), cur("totalVariableCost", "Total Variable Cost (TVC)"), cur("averageFixedCost", "Average Fixed Cost (AFC)"), cur("averageVariableCost", "Average Variable Cost (AVC)"), cur("averageTotalCost", "Average Total Cost (ATC)"), cur("marginalCost", "Marginal Cost (MC)")],
    instructions: "Enter fixed costs (rent, salaries, equipment), the variable cost per unit and the quantity. Add a quadratic term if unit costs rise with volume (diminishing returns).",
    examples: "Example: $5,000 fixed cost and $12 per unit at 500 units gives a total cost of $11,000. Average fixed cost is $10, average variable cost $12 and average total cost $22; marginal cost is $12.",
    assumptions: "TC = FC + vQ + cQ²; AFC = FC ÷ Q; AVC = TVC ÷ Q; ATC = TC ÷ Q; MC = v + 2cQ. Average fixed cost always falls as output rises, because the same fixed cost is spread over more units.",
    faq: [
      { question: "What is average fixed cost?", answer: "Fixed cost divided by the number of units — it shrinks as you produce more." },
      { question: "Why is marginal cost different from average cost?", answer: "Marginal cost is the cost of one more unit; average cost includes fixed costs spread over all units." },
    ],
  },
  {
    slug: "cost-of-doing-business-calculator",
    category: BUSINESS_CATEGORY,
    title: "Cost of Doing Business Calculator",
    description: "Calculate your cost of doing business — overhead plus your own pay as a share of revenue — and what it costs to run the business per billable hour and per day.",
    metaTitle: "Cost of Doing Business Calculator — Overhead per Hour",
    metaDescription: "Free cost of doing business calculator. Find your CODB as a % of revenue, cost per billable hour and per workday, so you can price above it.",
    calcInputs: [currencyField("operatingExpenses", "Yearly Operating Expenses (rent, staff, tools, insurance)", { default: 180000, max: 10000000000, step: 100 }), currencyField("ownerSalary", "Your Own Salary", { default: 70000, max: 1000000000, step: 100 }), currencyField("annualRevenue", "Yearly Revenue", { default: 320000, max: 10000000000, step: 100 }), numberField("billableHours", "Billable Hours per Year", { default: 1400, min: 1, max: 100000 }), numberField("workdays", "Workdays per Year", { default: 250, min: 1, max: 366 })],
    calcResult: { label: "Cost per Billable Hour", format: "currency" },
    calcResults: [cur("totalCost", "Total Cost of Doing Business"), pct("costOfDoingBusinessPct", "CODB as % of Revenue"), cur("costPerBillableHour", "Cost per Billable Hour", true), cur("costPerWorkday", "Cost per Workday"), cur("profit", "Profit")],
    instructions: "Add up every yearly cost of running the business except materials you bill directly, plus the salary you need. Billable hours are the hours you can actually charge clients for — usually 60–75% of time worked.",
    examples: "Example: $180,000 of expenses plus a $70,000 salary is $250,000 — 78% of $320,000 revenue. Over 1,400 billable hours that's $178.57 an hour, so you must charge more than that to make a profit.",
    assumptions: "All costs treated as fixed for the year. Trades (plumbers, HVAC, landscapers) often use CODB per billable hour to set hourly rates. " + DISCLAIMER,
    faq: [
      { question: "What's included in cost of doing business?", answer: "Overhead such as rent, admin staff, vehicles, insurance, software and your salary — not materials billed to specific jobs." },
      { question: "How do I set my hourly rate from CODB?", answer: "Add your target profit margin on top: for a 15% net margin, divide CODB per hour by 0.85." },
    ],
  },
  {
    slug: "direct-material-price-variance-calculator",
    category: BUSINESS_CATEGORY,
    title: "Direct Material Price Variance Calculator",
    description: "Calculate the direct material price variance (and quantity variance) — whether you paid more or less than the standard cost for materials — and if it's favorable or unfavorable.",
    metaTitle: "Direct Material Price Variance Calculator — DMPV",
    metaDescription: "Free direct material price variance calculator. Find (AP − SP) × AQ and the material quantity variance, and whether each is favorable or unfavorable.",
    calcInputs: [currencyField("actualPrice", "Actual Price per Unit (AP)", { default: 5.4, max: 1000000, step: 0.01 }), currencyField("standardPrice", "Standard Price per Unit (SP)", { default: 5, max: 1000000, step: 0.01 }), numberField("actualQuantityPurchased", "Actual Quantity Purchased (AQ)", { default: 10000, max: 10000000000 }), numberField("actualQuantityUsed", "Actual Quantity Used (optional)", { default: 0, max: 10000000000, required: false }), numberField("standardQuantityAllowed", "Standard Quantity Allowed (optional)", { default: 0, max: 10000000000, required: false })],
    calcResult: { label: "Price Variance", format: "currency" },
    calcResults: [cur("priceVariance", "Direct Material Price Variance", true), num("priceVarianceType", "Price Variance (1 Favorable, 2 Unfavorable)"), cur("quantityVariance", "Material Quantity Variance"), num("quantityVarianceType", "Quantity Variance (1 Favorable, 2 Unfavorable)"), cur("pricePerUnitDifference", "Price Difference per Unit")],
    instructions: "Enter what you actually paid per unit, the standard (budgeted) price and the quantity bought. Add the quantity used and the standard quantity allowed for actual output to get the quantity (usage) variance too.",
    examples: "Example: buying 10,000 kg at $5.40 instead of the $5.00 standard is a $4,000 unfavorable price variance. Using 9,800 kg when 10,000 kg were allowed would be a $1,000 favorable quantity variance.",
    assumptions: "Price variance = (AP − SP) × AQ purchased; quantity variance = (AQ used − SQ allowed) × SP. Positive = unfavorable (cost above standard), negative = favorable.",
    faq: [
      { question: "What causes an unfavorable price variance?", answer: "Supplier price rises, rush orders, smaller order sizes or buying a higher grade of material." },
      { question: "Who is responsible for the price variance?", answer: "Usually the purchasing department; the quantity variance usually belongs to production." },
    ],
  },
  {
    slug: "price-quantity-calculator",
    category: BUSINESS_CATEGORY,
    title: "Price / Quantity Calculator",
    description: "Solve for total price, unit price or quantity from the other two — and compare the unit price of a second offer or pack size to find the better deal.",
    metaTitle: "Price Quantity Calculator — Total, Unit Price & Quantity",
    metaDescription: "Free price quantity calculator. Find the total price, price per unit or quantity, and compare unit prices between two offers or pack sizes.",
    calcInputs: [dropdown("solveFor", "Solve For", [["Total price", 1], ["Unit price", 2], ["Quantity", 3]], 1), currencyField("totalPrice", "Total Price", { default: 0, max: 10000000000, step: 0.01, required: false }), currencyField("unitPrice", "Unit Price", { default: 2.5, max: 100000000, step: 0.0001, required: false }), numberField("quantity", "Quantity", { default: 12, max: 10000000000, step: 0.001, required: false }), currencyField("compareTotal", "Other Offer — Total Price (optional)", { default: 0, max: 10000000000, step: 0.01, required: false }), numberField("compareQuantity", "Other Offer — Quantity (optional)", { default: 0, max: 10000000000, step: 0.001, required: false })],
    calcResult: { label: "Total Price", format: "currency" },
    calcResults: [cur("totalPrice", "Total Price", true), { key: "unitPrice", label: "Unit Price", format: "currency", decimals: 4 }, num("quantity", "Quantity"), { key: "compareUnitPrice", label: "Other Offer — Unit Price", format: "currency", decimals: 4 }, pct("savingsVsCompare", "This Offer Is Cheaper per Unit by")],
    instructions: "Choose what you want to find and enter the other two values. To compare pack sizes, put the second offer's total price and quantity in the optional fields — a negative saving means the other offer is cheaper.",
    examples: "Example: 12 units at $2.50 cost $30.00. Against a 30-pack for $81 ($2.70 each), this deal is 7.41% cheaper per unit.",
    assumptions: "Total = unit price × quantity. Compare like-for-like units (per ounce, per sheet, per kg).",
    faq: [
      { question: "How do I calculate price per unit?", answer: "Divide the total price by the number of units." },
      { question: "Is the bigger pack always cheaper?", answer: "Not always — supermarkets sometimes price large packs higher per unit, so check the unit price." },
    ],
  },
  {
    slug: "lemonade-stand-calculator",
    category: BUSINESS_CATEGORY,
    title: "Lemonade Stand Calculator",
    description: "Work out the profit from a lemonade stand — revenue, cost per cup, setup costs, profit per cup, hourly earnings and how many cups you need to sell to break even.",
    metaTitle: "Lemonade Stand Calculator — Profit & Break-Even Cups",
    metaDescription: "Free lemonade stand calculator for kids and classrooms. Find revenue, cost per cup, profit, hourly earnings and the cups needed to break even.",
    calcInputs: [numberField("cupsSold", "Cups Sold", { default: 60, max: 100000 }), currencyField("pricePerCup", "Price per Cup", { default: 1.5, max: 100, step: 0.05 }), currencyField("lemonsCostPerCup", "Lemons / Mix per Cup", { default: 0.25, max: 100, step: 0.01 }), currencyField("sugarCostPerCup", "Sugar per Cup", { default: 0.05, max: 100, step: 0.01, required: false }), currencyField("cupCost", "Cup Cost", { default: 0.1, max: 100, step: 0.01, required: false }), currencyField("iceCostPerCup", "Ice per Cup", { default: 0.05, max: 100, step: 0.01, required: false }), currencyField("setupCost", "Setup Cost (stand, sign, pitcher)", { default: 15, max: 100000, step: 0.5, required: false }), numberField("hoursWorked", "Hours Worked", { default: 4, max: 1000, step: 0.5 })],
    calcResult: { label: "Profit", format: "currency" },
    calcResults: [cur("revenue", "Revenue"), cur("costPerCup", "Cost per Cup"), cur("totalCosts", "Total Costs"), cur("profit", "Profit", true), cur("profitPerCup", "Profit per Cup (after setup)"), cur("hourlyEarnings", "Earnings per Hour"), num("breakEvenCups", "Cups to Break Even")],
    instructions: "Enter how many cups you sold (or hope to sell), your price and what each cup costs to make, plus one-off setup costs. It's a great first lesson in revenue, costs and profit.",
    examples: "Example: 60 cups at $1.50 bring in $90. Ingredients cost $0.45 a cup ($27) plus $15 of setup, so profit is $48 — $12 an hour over 4 hours. You break even after 15 cups.",
    assumptions: "Every cup costs the same to make; leftover lemonade isn't counted. Some towns require a permit even for kids' stands — check local rules.",
    faq: [
      { question: "What should I charge for lemonade?", answer: "Most stands charge $0.50–$2 a cup; check your cost per cup and keep the price easy to pay with coins or one bill." },
      { question: "How can a lemonade stand make more money?", answer: "Pick a busy spot and a hot day, offer a bigger cup or cookies, and keep cost per cup low." },
    ],
  },
  {
    slug: "parking-ratio-calculator",
    category: BUSINESS_CATEGORY,
    title: "Parking Ratio Calculator",
    description: "Calculate a building's parking ratio — spaces per 1,000 square feet — and compare it with typical ratios for office, retail, medical, industrial and restaurant property.",
    metaTitle: "Parking Ratio Calculator — Spaces per 1,000 Sq Ft",
    metaDescription: "Free parking ratio calculator for commercial real estate. Get spaces per 1,000 sq ft, square feet per space and how many spaces a typical ratio needs.",
    calcInputs: [numberField("parkingSpaces", "Parking Spaces", { default: 180, max: 1000000 }), numberField("buildingArea", "Building Area (rentable sq ft)", { default: 50000, min: 1, max: 100000000 }), dropdown("propertyType", "Property Type", [["Office (≈4 per 1,000)", 1], ["Retail (≈5)", 2], ["Medical office (≈5)", 3], ["Industrial / warehouse (≈1.5)", 4], ["Restaurant (≈10)", 5], ["Multifamily-style mixed use (≈3)", 6]], 1)],
    calcResult: { label: "Parking Ratio", format: "number" },
    calcResults: [num("spacesPer1000SqFt", "Spaces per 1,000 Sq Ft", true), num("squareFeetPerSpace", "Sq Ft of Building per Space"), num("typicalRatio", "Typical Ratio for This Use"), num("spacesAtTypicalRatio", "Spaces at the Typical Ratio"), num("surplusOrShortfall", "Surplus (+) / Shortfall (−)")],
    instructions: "Enter the number of spaces and the building's rentable area. Tenants, lenders and zoning codes all look at the parking ratio; your local code sets the legal minimum.",
    examples: "Example: 180 spaces for a 50,000 sq ft office is 3.6 spaces per 1,000 sq ft — 20 spaces short of a typical 4/1,000 office ratio.",
    assumptions: "Typical ratios are rough US market norms; suburban sites usually need more parking than urban ones near transit, and many cities have cut or removed parking minimums.",
    faq: [
      { question: "What is a good parking ratio for an office?", answer: "About 3–4 spaces per 1,000 sq ft in the suburbs; call centers and dense offices may need 5–6." },
      { question: "How much space does one parking space take?", answer: "About 300–350 sq ft including drive aisles." },
    ],
  },
  {
    slug: "effective-corporate-tax-rate-calculator",
    category: BUSINESS_CATEGORY,
    title: "Effective Corporate Tax Rate Calculator",
    description: "Calculate a company's effective corporate tax rate — income tax expense as a share of pre-tax income — and compare it with the combined federal and state statutory rate.",
    metaTitle: "Effective Corporate Tax Rate Calculator — vs 21% Statutory",
    metaDescription: "Free effective corporate tax rate calculator. Divide tax expense by pre-tax income and compare with the 21% federal plus state statutory rate and cash tax rate.",
    calcInputs: [numberField("pretaxIncome", "Pre-Tax Income", { unit: "$", default: 2000000, min: -100000000000, max: 100000000000, step: 1 }), numberField("taxExpense", "Income Tax Expense (income statement)", { unit: "$", default: 460000, min: -100000000000, max: 100000000000, step: 1 }), currencyField("cashTaxesPaid", "Cash Taxes Paid (optional)", { default: 0, max: 100000000000, step: 1, required: false }), percentField("stateRate", "State Corporate Tax Rate", { default: 5, max: 15, step: 0.01 })],
    calcResult: { label: "Effective Tax Rate", format: "percentage" },
    calcResults: [pct("effectiveTaxRate", "Effective Tax Rate", true), pct("statutoryRate", "Combined Statutory Rate"), pct("differenceVsStatutory", "Difference vs Statutory"), pct("cashTaxRate", "Cash Tax Rate"), cur("netIncome", "Net Income")],
    instructions: "Take pre-tax income and income tax expense from the income statement (tax expense includes current and deferred tax). Enter the state rate to see the combined statutory rate the company would pay with no credits or deductions.",
    examples: "Example: $460,000 of tax on $2,000,000 of pre-tax income is a 23% effective rate. With a 5% state tax the statutory rate is 24.95% (state tax is deductible federally), so the company pays 1.95 points less.",
    assumptions: "Combined statutory rate = 21% + state × (1 − 21%). Effective rates differ from statutory because of credits (R&D), foreign income, stock compensation and deferred taxes. " + DISCLAIMER,
    faq: [
      { question: "What is the US federal corporate tax rate?", answer: "A flat 21% since 2018 under the Tax Cuts and Jobs Act." },
      { question: "Why do some large companies pay a low effective rate?", answer: "Credits, accelerated depreciation, stock option deductions and lower-taxed foreign profits; the 15% corporate minimum tax now applies to the largest companies." },
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
