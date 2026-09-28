// One-time (but safe to re-run) batch setup script: creates the 12 tools
// of the "Business Finance Calculators" sub-batch G (Liquidity & Cash Flow). Part of
// the Business Finance tool-list build-out: 108 tools in the source list, 17
// skipped as duplicates (9 in create-finance-business-calculators.ts, 8
// business-loan tools in create-loan-business-student-calculators.ts), 91
// built across 11 sub-batches — all under Finance Calculators > Business
// Finance Calculators except create-business-loans-calculators.ts (Loan
// Calculators):
//   create-business-profit-calculators.ts (10 tools)
//   create-business-breakeven-margin-calculators.ts (8 tools)
//   create-business-pricing-calculators.ts (7 tools)
//   create-business-revenue-calculators.ts (11 tools)
//   create-business-costs-calculators.ts (7 tools)
//   create-business-unit-returns-calculators.ts (9 tools)
//   create-business-liquidity-cash-calculators.ts (12 tools)
//   create-business-loans-calculators.ts (4 tools)
//   create-business-inventory-receivables-calculators.ts (9 tools)
//   create-business-valuation-calculators.ts (8 tools)
//   create-business-growth-variance-calculators.ts (6 tools)
//
// See src/lib/calc-engine-business-liquidity-cash.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-business-liquidity-cash-calculators.ts
// or
//   npm run db:create-business-liquidity-cash-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "business-finance-calculators";

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
  "This tool provides general estimates for informational purposes only and isn't financial, accounting, tax " +
  "or legal advice. Results depend on the figures you enter — check them against your own accounts, or ask an " +
  "accountant or financial adviser before making business decisions.";

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
    slug: "working-capital-calculator",
    title: "Working Capital Calculator",
    description: "Calculate working capital from an itemized list of current assets and current liabilities, plus the current ratio.",
    metaTitle: "Working Capital Calculator — Assets vs Liabilities",
    metaDescription: "Free working capital calculator. Enter cash, receivables, inventory, payables and short-term debt to find working capital and the current ratio.",
    calcInputs: [
      currencyField("cash", "Cash", { default: 60000, max: 100000000000, step: 1000 }),
      currencyField("accountsReceivable", "Accounts Receivable", { default: 85000, max: 100000000000, step: 1000 }),
      currencyField("inventory", "Inventory", { default: 70000, max: 100000000000, step: 1000 }),
      currencyField("otherCurrentAssets", "Other Current Assets", { default: 10000, max: 100000000000, step: 1000 }),
      currencyField("accountsPayable", "Accounts Payable", { default: 65000, max: 100000000000, step: 1000 }),
      currencyField("shortTermDebt", "Short-Term Debt (Due Within a Year)", { default: 40000, max: 100000000000, step: 1000 }),
      currencyField("otherCurrentLiabilities", "Other Current Liabilities", { default: 20000, max: 100000000000, step: 1000 }),
    ],
    calcResult: { label: "Working Capital", format: "currency" },
    calcResults: [
      { key: "workingCapital", label: "Working Capital", format: "currency", highlight: true },
      { key: "currentAssets", label: "Current Assets", format: "currency" },
      { key: "currentLiabilities", label: "Current Liabilities", format: "currency" },
      { key: "currentRatio", label: "Current Ratio", format: "number" },
    ],
    instructions: "Enter each current asset (cash or things turning into cash within a year) and each current liability (bills due within a year) from your balance sheet. Positive working capital means you can cover short-term obligations.",
    examples: "Example: $225,000 of current assets against $125,000 of current liabilities is $100,000 of working capital — a current ratio of 1.8.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Can working capital be negative?", answer: "Yes — current liabilities exceed current assets. That can signal cash trouble, though some businesses (like supermarkets paid in cash before they pay suppliers) run that way deliberately." }],
  },
  {
    slug: "working-capital-ratio-calculator",
    title: "Working Capital Ratio Calculator",
    description: "Find your working capital ratio, working capital as a share of revenue, and the extra current assets needed to reach a target ratio.",
    metaTitle: "Working Capital Ratio Calculator — With Target",
    metaDescription: "Free working capital ratio calculator. See your ratio, working capital as a % of revenue, and the current assets needed to hit a target ratio.",
    calcInputs: [
      currencyField("currentAssets", "Current Assets", { default: 225000, max: 100000000000, step: 1000 }),
      currencyField("currentLiabilities", "Current Liabilities", { default: 150000, max: 100000000000, step: 1000 }),
      currencyField("annualRevenue", "Annual Revenue", { default: 900000, max: 100000000000, step: 10000 }),
      numberField("targetRatio", "Target Ratio (e.g. from a Lender)", { default: 2, min: 0, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Working Capital Ratio", format: "number" },
    calcResults: [
      { key: "workingCapitalRatio", label: "Working Capital Ratio", format: "number", highlight: true },
      { key: "workingCapital", label: "Working Capital", format: "currency" },
      { key: "workingCapitalPercentOfRevenue", label: "Working Capital as % of Revenue", format: "percentage" },
      { key: "extraCurrentAssetsForTarget", label: "Extra Current Assets Needed for Target", format: "currency" },
    ],
    instructions: "Enter current assets, current liabilities, annual revenue and a target ratio. The ratio shows how many dollars of short-term assets back each dollar of short-term obligations; as a % of revenue, it shows how much cash your operations tie up.",
    examples: "Example: $225,000 against $150,000 is a ratio of 1.5 and $75,000 of working capital — 8.33% of revenue. Reaching 2.0 would need $75,000 more in current assets.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is a good working capital ratio?", answer: "Generally 1.2 to 2.0. Below 1 may mean trouble paying bills; well above 2 can mean cash or inventory sitting idle." }],
  },
  {
    slug: "current-ratio-calculator",
    title: "Current Ratio Calculator",
    description: "Calculate your current ratio, and see how it changes if you use cash to pay down some current liabilities — a common move before a lender review.",
    metaTitle: "Current Ratio Calculator — Before and After Paydown",
    metaDescription: "Free current ratio calculator. Find your current ratio and how it changes if you use cash to pay down part of your current liabilities.",
    calcInputs: [
      currencyField("currentAssets", "Current Assets", { default: 180000, max: 100000000000, step: 1000 }),
      currencyField("currentLiabilities", "Current Liabilities", { default: 150000, max: 100000000000, step: 1000 }),
      currencyField("cashUsedToPayLiabilities", "Cash Used to Pay Down Liabilities", { default: 50000, max: 100000000000, step: 1000 }),
    ],
    calcResult: { label: "Current Ratio", format: "number" },
    calcResults: [
      { key: "currentRatio", label: "Current Ratio Now", format: "number", highlight: true },
      { key: "currentRatioAfterPaydown", label: "Current Ratio After Paydown", format: "number" },
      { key: "workingCapital", label: "Working Capital", format: "currency" },
    ],
    instructions: "Enter current assets and liabilities, and an amount of cash you could use to pay liabilities early. When the ratio is above 1, paying down liabilities with cash raises it (working capital stays the same).",
    examples: "Example: $180,000 against $150,000 is a current ratio of 1.2. Paying $50,000 of liabilities with cash lifts it to 1.3 ($130,000 ÷ $100,000).",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How is the current ratio calculated?", answer: "Current assets ÷ current liabilities. Lenders often want at least 1.2–1.5 in loan covenants." }],
  },
  {
    slug: "quick-ratio-calculator",
    title: "Quick Ratio Calculator",
    description: "Calculate the quick ratio (acid test) — cash, marketable securities and receivables against current liabilities — leaving out inventory.",
    metaTitle: "Quick Ratio Calculator — Acid-Test Ratio",
    metaDescription: "Free quick ratio calculator. Find the acid-test ratio from cash, securities and receivables vs current liabilities, excluding inventory.",
    calcInputs: [
      currencyField("cash", "Cash", { default: 40000, max: 100000000000, step: 1000 }),
      currencyField("marketableSecurities", "Marketable Securities", { default: 15000, max: 100000000000, step: 1000 }),
      currencyField("accountsReceivable", "Accounts Receivable", { default: 65000, max: 100000000000, step: 1000 }),
      currencyField("inventory", "Inventory (for Comparison)", { default: 90000, max: 100000000000, step: 1000 }),
      currencyField("currentLiabilities", "Current Liabilities", { default: 110000, max: 100000000000, step: 1000 }),
    ],
    calcResult: { label: "Quick Ratio", format: "number" },
    calcResults: [
      { key: "quickRatio", label: "Quick Ratio", format: "number", highlight: true },
      { key: "quickAssets", label: "Quick Assets", format: "currency" },
      { key: "currentRatioIncludingInventory", label: "Ratio Including Inventory", format: "number" },
      { key: "shortfallToReach1", label: "Quick Assets Short of 1.0", format: "currency" },
    ],
    instructions: "Enter cash, marketable securities, receivables and current liabilities. Inventory is left out because it can take a while to sell — the quick ratio asks whether you could pay your bills without selling stock.",
    examples: "Example: $120,000 of quick assets against $110,000 of liabilities is a quick ratio of 1.09. Counting inventory it would be 1.91.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What's a good quick ratio?", answer: "1.0 or above means you could cover current liabilities without selling inventory. Below 1 relies on stock sales or new cash." }],
  },
  {
    slug: "cash-ratio-calculator",
    title: "Cash Ratio Calculator",
    description: "Calculate the cash ratio — the strictest liquidity test — and how many days of operating expenses your cash would cover.",
    metaTitle: "Cash Ratio Calculator — With Days of Cash",
    metaDescription: "Free cash ratio calculator. Find your cash ratio against current liabilities and how many days of operating expenses your cash covers.",
    calcInputs: [
      currencyField("cashAndEquivalents", "Cash and Cash Equivalents", { default: 55000, max: 100000000000, step: 1000 }),
      currencyField("currentLiabilities", "Current Liabilities", { default: 125000, max: 100000000000, step: 1000 }),
      currencyField("annualOperatingExpenses", "Annual Operating Expenses (Cash)", { default: 730000, max: 100000000000, step: 10000 }),
    ],
    calcResult: { label: "Cash Ratio", format: "number" },
    calcResults: [
      { key: "cashRatio", label: "Cash Ratio", format: "number", highlight: true },
      { key: "daysOfCashOnHand", label: "Days of Cash on Hand", format: "number" },
      { key: "cashShortOfLiabilities", label: "Cash Short of Current Liabilities", format: "currency" },
    ],
    instructions: "Enter cash and near-cash investments, current liabilities, and yearly cash operating expenses. The cash ratio counts only cash; days of cash on hand shows how long you could run with no money coming in.",
    examples: "Example: $55,000 of cash against $125,000 of liabilities is a 0.44 cash ratio. With $730,000 of yearly expenses ($2,000 a day), that's 27.5 days of cash.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Is a cash ratio below 1 bad?", answer: "Not necessarily — few healthy businesses keep enough cash to pay every current bill at once. 0.5 to 1 is common; watch days of cash on hand too." }],
  },
  {
    slug: "cash-conversion-cycle-calculator",
    title: "Cash Conversion Cycle Calculator",
    description: "Calculate the cash conversion cycle from inventory, receivable and payable days, and how much cash the cycle ties up.",
    metaTitle: "Cash Conversion Cycle Calculator — CCC Days",
    metaDescription: "Free cash conversion cycle calculator. Find your CCC from inventory, sales and payable days, and the cash tied up in your operating cycle.",
    calcInputs: [
      numberField("daysInventoryOutstanding", "Days Inventory Outstanding (DIO)", { default: 55, min: 0, max: 1000, step: 1 }),
      numberField("daysSalesOutstanding", "Days Sales Outstanding (DSO)", { default: 40, min: 0, max: 1000, step: 1 }),
      numberField("daysPayableOutstanding", "Days Payable Outstanding (DPO)", { default: 35, min: 0, max: 1000, step: 1 }),
      currencyField("annualRevenue", "Annual Revenue", { default: 1460000, max: 100000000000, step: 10000 }),
    ],
    calcResult: { label: "Cash Conversion Cycle", format: "number" },
    calcResults: [
      { key: "cashConversionCycleDays", label: "Cash Conversion Cycle (Days)", format: "number", highlight: true },
      { key: "operatingCycleDays", label: "Operating Cycle (Days)", format: "number" },
      { key: "cashTiedUpInCycle", label: "Cash Tied Up in the Cycle", format: "currency" },
      { key: "cashFreedPerDayCut", label: "Cash Freed per Day Cut from the Cycle", format: "currency" },
    ],
    instructions: "Enter how long stock sits before it sells (DIO), how long customers take to pay (DSO), and how long you take to pay suppliers (DPO) — the Inventory Days, DSO and DPO calculators work these out. CCC = DIO + DSO − DPO: the days your cash is tied up.",
    examples: "Example: 55 + 40 − 35 = a 60-day cycle. On $1.46 million of revenue ($4,000 a day), that ties up about $240,000 — and every day you cut frees $4,000.",
    assumptions: "Cash tied up is estimated from daily revenue. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How can I shorten the cash conversion cycle?", answer: "Sell inventory faster, collect from customers sooner, and — within your supplier terms — pay suppliers later." }],
  },
  {
    slug: "operating-cash-flow-calculator",
    title: "Operating Cash Flow Calculator",
    description: "Calculate operating cash flow with the indirect method — net income plus non-cash items, adjusted for changes in working capital.",
    metaTitle: "Operating Cash Flow Calculator — Indirect Method",
    metaDescription: "Free operating cash flow calculator. Start from net income, add depreciation and non-cash items, and adjust for working capital changes.",
    calcInputs: [
      currencyField("netIncome", "Net Income", { default: 90000, max: 100000000000, step: 1000 }),
      currencyField("depreciationAmortization", "Depreciation and Amortization", { default: 25000, max: 100000000000, step: 1000 }),
      currencyField("otherNonCashItems", "Other Non-Cash Items (e.g. Stock Pay)", { default: 5000, max: 100000000000, step: 500 }),
      currencyField("increaseInReceivables", "Increase in Receivables (− if Down)", { default: 12000, max: 100000000000, step: 500 }),
      currencyField("increaseInInventory", "Increase in Inventory (− if Down)", { default: 8000, max: 100000000000, step: 500 }),
      currencyField("increaseInPayables", "Increase in Payables (− if Down)", { default: 6000, max: 100000000000, step: 500 }),
    ],
    calcResult: { label: "Operating Cash Flow", format: "currency" },
    calcResults: [
      { key: "operatingCashFlow", label: "Operating Cash Flow", format: "currency", highlight: true },
      { key: "nonCashAddBacks", label: "Non-Cash Add-Backs", format: "currency" },
      { key: "workingCapitalEffect", label: "Working Capital Effect", format: "currency" },
      { key: "cashConversionOfProfitPercent", label: "Cash Flow as % of Net Income", format: "percentage" },
    ],
    instructions: "Start from net income, add back expenses that didn't use cash (depreciation, amortization, stock compensation), then adjust for working capital: more receivables or inventory uses cash; more payables frees it.",
    examples: "Example: $90,000 of net income plus $30,000 of non-cash items, less $14,000 of working capital build-up (receivables +$12,000, inventory +$8,000, payables +$6,000), is $106,000 of operating cash flow — 117.78% of profit.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why is operating cash flow different from profit?", answer: "Profit includes non-cash items and sales not yet collected; cash flow counts only money actually moving in and out." }],
  },
  {
    slug: "free-cash-flow-calculator",
    title: "Free Cash Flow Calculator",
    description: "Calculate free cash flow — operating cash flow minus capital spending — with the FCF margin and free cash flow per share.",
    metaTitle: "Free Cash Flow Calculator — FCF, Margin & per Share",
    metaDescription: "Free free cash flow calculator. Subtract capital spending from operating cash flow to find FCF, the FCF margin and free cash flow per share.",
    calcInputs: [
      currencyField("operatingCashFlow", "Operating Cash Flow", { default: 180000, max: 100000000000, step: 1000 }),
      currencyField("capitalExpenditures", "Capital Expenditures (Capex)", { default: 60000, max: 100000000000, step: 1000 }),
      currencyField("revenue", "Revenue", { default: 1200000, max: 100000000000, step: 10000 }),
      numberField("sharesOutstanding", "Shares Outstanding (Optional)", { default: 100000, min: 0, max: 100000000000, step: 1000 }),
    ],
    calcResult: { label: "Free Cash Flow", format: "currency" },
    calcResults: [
      { key: "freeCashFlow", label: "Free Cash Flow", format: "currency", highlight: true },
      { key: "freeCashFlowMarginPercent", label: "Free Cash Flow Margin", format: "percentage" },
      { key: "freeCashFlowPerShare", label: "Free Cash Flow per Share", format: "currency" },
      { key: "capexShareOfOperatingCashPercent", label: "Capex as a Share of Operating Cash", format: "percentage" },
    ],
    instructions: "Enter operating cash flow and capital spending (equipment, buildings, software) from the cash flow statement, plus revenue and shares if you have them. Free cash flow is the cash left to repay debt, pay dividends or reinvest.",
    examples: "Example: $180,000 of operating cash flow less $60,000 of capex leaves $120,000 of free cash flow — a 10% margin, or $1.20 per share.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why do investors focus on free cash flow?", answer: "It's harder to flatter than earnings and shows the cash a business truly generates after keeping itself running." }],
  },
  {
    slug: "cash-burn-rate-calculator",
    title: "Cash Burn Rate Calculator",
    description: "Calculate your gross and net cash burn rate per month and year, and how long your cash will last.",
    metaTitle: "Cash Burn Rate Calculator — Gross & Net Burn",
    metaDescription: "Free cash burn rate calculator. Find your gross and net monthly burn from spending and revenue, and how many months of runway you have.",
    calcInputs: [
      currencyField("monthlyOperatingExpenses", "Monthly Spending", { default: 85000, max: 100000000000, step: 1000 }),
      currencyField("monthlyRevenue", "Monthly Revenue (Cash In)", { default: 30000, max: 100000000000, step: 1000 }),
      currencyField("cashBalance", "Cash in the Bank", { default: 900000, max: 100000000000, step: 10000 }),
    ],
    calcResult: { label: "Net Burn per Month", format: "currency" },
    calcResults: [
      { key: "netBurnPerMonth", label: "Net Burn per Month", format: "currency", highlight: true },
      { key: "grossBurnPerMonth", label: "Gross Burn per Month", format: "currency" },
      { key: "netBurnPerYear", label: "Net Burn per Year", format: "currency" },
      { key: "runwayMonths", label: "Runway (Months, 0 = Not Burning)", format: "number" },
    ],
    instructions: "Enter what the business spends and brings in each month, and its cash balance. Gross burn is total spending; net burn is spending minus revenue — the amount the bank balance actually falls each month.",
    examples: "Example: spending $85,000 a month with $30,000 of revenue is a $55,000 net burn ($660,000 a year). $900,000 in the bank lasts 16.36 months.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What's the difference between gross and net burn?", answer: "Gross burn is everything you spend each month; net burn subtracts incoming revenue. Runway is based on net burn." }],
  },
  {
    slug: "cash-runway-calculator",
    title: "Cash Runway Calculator",
    description: "Find how many months of cash runway you have, how much longer a burn cut would give you, and the runway before you hit a safety buffer.",
    metaTitle: "Cash Runway Calculator — Months of Runway",
    metaDescription: "Free cash runway calculator. See months of runway from cash and burn, how much a cost cut extends it, and runway before a minimum cash buffer.",
    calcInputs: [
      currencyField("cashBalance", "Cash in the Bank", { default: 750000, max: 100000000000, step: 10000 }),
      currencyField("monthlyNetBurn", "Monthly Net Burn", { default: 60000, max: 100000000000, step: 1000 }),
      percentField("burnCutPercent", "Cut Burn By", { default: 20, max: 100, step: 5 }),
      currencyField("minimumCashBuffer", "Minimum Cash Buffer to Keep", { default: 100000, max: 100000000000, step: 10000 }),
    ],
    calcResult: { label: "Runway", format: "number" },
    calcResults: [
      { key: "runwayMonths", label: "Runway Now (Months)", format: "number", highlight: true },
      { key: "runwayAfterBurnCut", label: "Runway After the Cut (Months)", format: "number" },
      { key: "runwayBeforeHittingBuffer", label: "Months Before Hitting Your Buffer", format: "number" },
      { key: "monthlySavingsFromCut", label: "Monthly Savings from the Cut", format: "currency" },
    ],
    instructions: "Enter your cash, monthly net burn, a percentage cut you're considering, and a minimum cash buffer. Startups usually start raising money or cutting costs with 6–12 months of runway left.",
    examples: "Example: $750,000 burning $60,000 a month lasts 12.5 months. Cutting burn 20% (saving $12,000 a month) stretches it to 15.63 months; keeping a $100,000 buffer, you have 10.83 months before touching it.",
    assumptions: "Assumes steady burn; 0 means no burn. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How much runway should a startup have?", answer: "Many investors suggest 18–24 months after raising, since raising the next round can take 6 months or more." }],
  },
  {
    slug: "cash-flow-forecast-calculator",
    title: "Cash Flow Forecast Calculator",
    description: "Forecast your cash balance over the next 12 months with growing inflows and outflows, and spot the lowest point and any month you'd run out.",
    metaTitle: "Cash Flow Forecast Calculator — 12 Months",
    metaDescription: "Free cash flow forecast calculator. Project 12 months of cash with growing inflows and outflows, and find your lowest balance and cash-out month.",
    calcInputs: [
      currencyField("startingCash", "Starting Cash", { default: 50000, max: 100000000000, step: 1000 }),
      currencyField("monthlyInflows", "Monthly Cash In (Month 1)", { default: 40000, max: 100000000000, step: 1000 }),
      currencyField("monthlyOutflows", "Monthly Cash Out (Month 1)", { default: 44000, max: 100000000000, step: 1000 }),
      percentField("inflowGrowthPercent", "Monthly Growth in Cash In", { default: 2, min: -50, max: 100, step: 0.5 }),
      percentField("outflowGrowthPercent", "Monthly Growth in Cash Out", { default: 1, min: -50, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Cash After 12 Months", format: "currency" },
    calcResults: [
      { key: "cashAfter12Months", label: "Cash After 12 Months", format: "currency", highlight: true },
      { key: "lowestCashBalance", label: "Lowest Cash Balance", format: "currency" },
      { key: "monthOfLowestBalance", label: "Month of Lowest Balance", format: "number" },
      { key: "monthCashRunsOut", label: "Month Cash Runs Out (0 = Never)", format: "number" },
      { key: "netCashFlowOver12Months", label: "Net Cash Flow over 12 Months", format: "currency" },
    ],
    instructions: "Enter your cash today, next month's expected cash in and out, and how fast each grows per month. The tool runs 12 months forward so you can see a squeeze coming and plan a credit line or cost cuts in time.",
    examples: "Example: starting with $50,000, with $40,000 in and $44,000 out growing 2% and 1% a month, cash dips to $27,651.49 in month 10 before recovering to $28,453.46 at month 12 — never running out.",
    assumptions: "Growth is steady month to month; real cash flow is lumpier. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why forecast cash flow if I'm profitable?", answer: "Profitable businesses still run out of cash — for example when customers pay slowly or stock builds up. A forecast shows the timing." }],
  },
  {
    slug: "cash-flow-break-even-calculator",
    title: "Cash Flow Break-Even Calculator",
    description: "Find the monthly revenue that stops a growing business burning cash, how many months until you reach it, and whether your cash lasts that long.",
    metaTitle: "Cash Flow Break-Even Calculator — When Cash Stops",
    metaDescription: "Free cash flow break-even calculator. Find the revenue that ends your cash burn, the months until you reach it, and whether your cash will last.",
    calcInputs: [
      currencyField("monthlyFixedCashCosts", "Monthly Fixed Cash Costs", { default: 45000, max: 100000000000, step: 1000 }),
      percentField("grossMarginPercent", "Gross Margin", { default: 60, min: 0.1, max: 100, step: 1 }),
      currencyField("currentMonthlyRevenue", "Current Monthly Revenue", { default: 50000, max: 100000000000, step: 1000 }),
      percentField("monthlyRevenueGrowthPercent", "Monthly Revenue Growth", { default: 5, max: 100, step: 0.5 }),
      currencyField("cashBalance", "Cash in the Bank", { default: 200000, max: 100000000000, step: 10000 }),
    ],
    calcResult: { label: "Months to Cash Break-Even", format: "number" },
    calcResults: [
      { key: "monthsToCashFlowBreakEven", label: "Months to Cash-Flow Break-Even", format: "number", highlight: true },
      { key: "revenueNeededToBreakEven", label: "Monthly Revenue Needed", format: "currency" },
      { key: "cashBurnedBeforeBreakEven", label: "Cash Burned Before Breaking Even", format: "currency" },
      { key: "cashLeftAtBreakEven", label: "Cash Left at Break-Even (− = Run Out First)", format: "currency" },
    ],
    instructions: "Enter your monthly fixed cash costs, gross margin, current revenue, monthly growth and cash balance. The revenue needed is fixed costs ÷ gross margin; the tool then grows revenue month by month until it gets there.",
    examples: "Example: $45,000 of fixed costs at a 60% margin needs $75,000 a month. Growing 5% a month from $50,000 gets there in 9 months, burning $74,203.07 on the way — leaving $125,796.93 of your $200,000.",
    assumptions: "1,200 months means not reachable at this growth rate. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is cash-flow break-even the same as profit break-even?", answer: "Close, but cash break-even leaves out non-cash costs like depreciation and depends on the timing of payments." }],
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
