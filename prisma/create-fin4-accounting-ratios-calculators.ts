// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// finance expansion 4 sub-batch "accounting-ratios". See
// src/lib/calc-engine-fin4-india-uk.ts for the full list of 3 sub-batches,
// and src/lib/calc-engine-fin4-accounting-ratios.ts for the math. Each tool is filed in
// the Finance Calculators sub-category the user named for it (created on
// first run if new).
//
// HOW TO RUN
//   npx tsx prisma/create-fin4-accounting-ratios-calculators.ts
// or
//   npm run db:create-fin4-accounting-ratios-calculators

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


const TAX_SALARY = { name: "Tax & Salary Calculators", slug: "tax-salary-calculators" };
const GENERAL_INVESTMENT = { name: "General Investment Calculators", slug: "general-investment-calculators" };
const INVESTMENT_DEPRECIATION = { name: "Investment & Depreciation Calculators", slug: "investment-depreciation-calculators" };
const PERSONAL_FINANCE = { name: "Personal Finance Calculators", slug: "personal-finance-calculators" };
const BUSINESS_RATIOS = { name: "Business & Financial Ratios", slug: "business-financial-ratios" };

const big = (key: string, label: string, def: number, required = true) => currencyField(key, label, { default: def, max: 100000000000000, step: 1, required });
const money = (key: string, label: string, def: number, required = true) => numberField(key, label, { unit: "$", default: def, min: -100000000000000, max: 100000000000000, step: 0.01, required });

const TOOLS: ToolDef[] = [
  {
    slug: "round-to-nearest-dollar-or-cent-calculator",
    category: TAX_SALARY,
    title: "Round to Nearest Dollar or Cent",
    description: "Round a money amount to the nearest cent, dime, dollar, $5, $10 or $100 — or always up or down — and see the difference.",
    metaTitle: "Round to Nearest Dollar or Cent — Money Rounding",
    metaDescription: "Free money rounding calculator. Round any amount to the nearest cent, dollar, $5, $10 or $100, or round up or down, and see the rounding difference.",
    calcInputs: [money("amount", "Amount", 1234.5678), dropdown("roundTo", "Round To", [["Nearest cent ($0.01)", 1], ["Nearest dime ($0.10)", 2], ["Nearest dollar", 3], ["Nearest $5", 4], ["Nearest $10", 5], ["Nearest $100", 6]], 3), dropdown("direction", "Direction", [["Nearest (half up)", 1], ["Always up", 2], ["Always down", 3]], 1)],
    calcResult: { label: "Rounded Amount", format: "currency" },
    calcResults: [cur("roundedAmount", "Rounded Amount", true), cur("difference", "Difference (+ up / − down)")],
    instructions: "Enter the amount and choose the increment and direction. Tax forms let you round to whole dollars (drop under 50 cents, round 50 cents and up); invoices use the nearest cent.",
    examples: "Example: $1,234.5678 rounds to $1,235 to the nearest dollar (43 cents up), to $1,234.57 to the nearest cent, and down to $1,230 to the $10.",
    assumptions: "Half amounts round up (away from zero for positive numbers). Banks sometimes use \"banker's rounding\" (half to even) for interest calculations.",
    faq: [
      { question: "Can I round to whole dollars on my tax return?", answer: "Yes — the IRS allows whole-dollar rounding if you do it consistently for every amount on the return." },
      { question: "How do I round to the nearest cent?", answer: "Look at the third decimal: 5 or more rounds the second decimal up, less than 5 leaves it." },
    ],
  },
  {
    slug: "future-value-of-cash-flows-calculator",
    category: GENERAL_INVESTMENT,
    title: "Future Value of Cash Flows Calculator",
    description: "Calculate the future value of uneven cash flows — different deposits each year — grown at an interest rate to a chosen year, plus their present value.",
    metaTitle: "Future Value of Cash Flows Calculator — Uneven Deposits",
    metaDescription: "Free future value of cash flows calculator. Grow uneven yearly deposits to a future date at your rate, with total deposited, interest and present value.",
    calcInputs: [percentField("rate", "Interest Rate per Year", { default: 6, min: -50, max: 100, step: 0.01 }), numberField("horizonYears", "Value at End of Year", { default: 5, min: 1, max: 10 }), currencyField("initialDeposit", "Deposit Today (year 0)", { default: 0, max: 1000000000, step: 1, required: false }), ...Array.from({ length: 10 }, (_, i) => money(`cf${i + 1}`, `Cash Flow at End of Year ${i + 1}`, [1000, 2000, 1500, 3000, 2500, 0, 0, 0, 0, 0][i], false))],
    calcResult: { label: "Future Value", format: "currency" },
    calcResults: [cur("futureValue", "Future Value", true), cur("totalDeposited", "Total Deposited"), cur("interestEarned", "Interest Earned"), cur("presentValue", "Present Value Today")],
    instructions: "Enter the rate, the year you want the value at, and each year's cash flow (withdrawals as negative numbers). Cash flows after the chosen year are ignored.",
    examples: "Example: deposits of $1,000, $2,000, $1,500, $3,000 and $2,500 at the end of years 1–5 grow to about $11,010 at 6% — $10,000 deposited and $1,010 of interest. That stream is worth about $8,227 today.",
    assumptions: "FV = Σ CFₜ × (1 + r)^(N − t), with cash flows at year-end. For equal payments, use the Future Value of Annuity Calculator; for present values of uneven flows, use the NPV Calculator.",
    faq: [
      { question: "Why is the last deposit's growth zero?", answer: "A deposit made at the end of the final year has no time to earn interest before that date." },
      { question: "Can I include withdrawals?", answer: "Yes — enter them as negative cash flows." },
    ],
  },
  {
    slug: "units-of-production-depreciation-calculator",
    category: INVESTMENT_DEPRECIATION,
    title: "Units of Production Depreciation Calculator",
    description: "Calculate depreciation by units of production (activity method) — based on units made, hours run or miles driven — with the rate per unit, accumulated depreciation and book value.",
    metaTitle: "Units of Production Depreciation — Activity Method",
    metaDescription: "Free units of production depreciation calculator. Depreciate an asset by units, machine hours or miles: rate per unit, this period's expense and book value.",
    calcInputs: [currencyField("cost", "Asset Cost", { default: 60000, max: 10000000000, step: 100 }), currencyField("salvageValue", "Salvage Value", { default: 5000, max: 10000000000, step: 100, required: false }), numberField("totalUnits", "Total Expected Units / Hours / Miles over Its Life", { default: 200000, min: 1, max: 100000000000 }), numberField("unitsThisPeriod", "Units Used This Period", { default: 30000, max: 100000000000 }), numberField("unitsUsedBefore", "Units Used in Earlier Periods", { default: 0, max: 100000000000, required: false })],
    calcResult: { label: "Depreciation This Period", format: "currency" },
    calcResults: [{ key: "depreciationPerUnit", label: "Depreciation per Unit", format: "currency", decimals: 4 }, cur("depreciationThisPeriod", "Depreciation This Period", true), cur("accumulatedDepreciation", "Accumulated Depreciation"), cur("bookValue", "Book Value"), num("unitsRemaining", "Units Remaining")],
    instructions: "Enter the asset's cost, salvage value and total expected output (units, machine hours or miles), then how much it was used this period and before. Suits assets that wear out with use — machinery, vehicles, aircraft.",
    examples: "Example: a $60,000 machine with $5,000 salvage expected to make 200,000 units depreciates $0.275 a unit. Making 30,000 units this year gives $8,250 of depreciation and a $51,750 book value.",
    assumptions: "Rate = (cost − salvage) ÷ total units; depreciation stops at salvage value. Accepted under US GAAP and IFRS but not for US tax (use MACRS). Other methods: Depreciation Calculator (straight-line, declining balance, SYD, fixed and variable declining balance). " + DISCLAIMER,
    faq: [
      { question: "Is the activity method the same as units of production?", answer: "Yes — the activity can be units produced, hours used or miles driven." },
      { question: "What if actual use exceeds the estimate?", answer: "Depreciation stops at salvage value; revise the estimate prospectively if it changes." },
    ],
  },
  {
    slug: "adding-machine-calculator",
    category: PERSONAL_FINANCE,
    title: "Adding Machine Calculator",
    description: "An online adding machine (10-key) — add up to 20 amounts, including negatives, to get the total, count, average, largest and smallest, with optional tax.",
    metaTitle: "Adding Machine Calculator — Online 10-Key Tape",
    metaDescription: "Free online adding machine. Add and subtract up to 20 amounts like a 10-key calculator tape, with total, count, average and total including tax.",
    calcInputs: [...Array.from({ length: 20 }, (_, i) => money(`entry${i + 1}`, `Entry ${i + 1}`, [125.5, 89.99, -20, 45.25, 310, 0][i] ?? 0, false)), percentField("taxRate", "Sales Tax on the Total (optional)", { default: 0, max: 50, step: 0.001, required: false })],
    calcResult: { label: "Total", format: "currency" },
    calcResults: [cur("total", "Total", true), num("entries", "Entries"), cur("average", "Average Entry"), cur("largest", "Largest"), cur("smallest", "Smallest"), cur("totalWithTax", "Total with Tax")],
    instructions: "Type each amount into its own line — use a minus sign for subtractions, refunds or credits. Empty lines are ignored.",
    examples: "Example: $125.50 + $89.99 − $20.00 + $45.25 + $310.00 = $550.74 over 5 entries, an average of $110.15.",
    assumptions: "Totals are rounded to cents. Handy for receipts, expense reports and adding up a list of figures without a spreadsheet.",
    faq: [
      { question: "What's a 10-key calculator?", answer: "An adding machine keypad (0–9) used by bookkeepers for fast data entry; this tool totals entries the same way." },
      { question: "Can I subtract amounts?", answer: "Yes — enter them with a minus sign." },
    ],
  },
  {
    slug: "checkbook-balance-calculator",
    category: PERSONAL_FINANCE,
    title: "Checkbook Balance Calculator",
    description: "Balance your checkbook — start from your balance, add deposits and subtract checks, card payments and fees to get the running and ending balance, and spot an overdraft.",
    metaTitle: "Checkbook Balance Calculator — Running Balance",
    metaDescription: "Free checkbook balance calculator. Enter your starting balance and up to 10 deposits and payments to see your running total, ending balance and lowest point.",
    calcInputs: [money("startingBalance", "Starting Balance", 1500), ...Array.from({ length: 10 }, (_, i) => money(`transaction${i + 1}`, `Transaction ${i + 1} (+ deposit / − payment)`, [-85.4, -1200, 2350, -64.99, -310.25, 0][i] ?? 0, false))],
    calcResult: { label: "Ending Balance", format: "currency" },
    calcResults: [cur("totalDeposits", "Total Deposits"), cur("totalWithdrawals", "Total Payments & Withdrawals"), cur("endingBalance", "Ending Balance", true), cur("lowestRunningBalance", "Lowest Running Balance"), num("overdrawn", "Went Overdrawn (1 = yes)")],
    instructions: "Enter your starting balance, then each transaction in date order — deposits as positive numbers, checks, debit card payments and fees as negative. The lowest running balance shows whether you'd have been overdrawn along the way.",
    examples: "Example: starting with $1,500, paying $85.40 and $1,200 rent, depositing a $2,350 paycheck and paying $64.99 and $310.25 leaves $2,189.36. The balance dipped to $214.60 before payday.",
    assumptions: "Transactions are applied in the order entered. To match your register to the bank statement, use the Bank Reconciliation Calculator.",
    faq: [
      { question: "Why balance a checkbook?", answer: "To know what you can really spend, avoid overdraft fees and catch errors or fraud." },
      { question: "Should I include pending transactions?", answer: "Yes — record them when you make them, even if the bank hasn't cleared them yet." },
    ],
  },
  {
    slug: "stock-ratios-calculator",
    category: BUSINESS_RATIOS,
    title: "Stock Ratios Calculator",
    description: "Calculate the main stock valuation ratios at once — P/E, earnings yield, dividend yield, payout ratio, price-to-book and price-to-sales.",
    metaTitle: "Stock Ratios Calculator — P/E, Yield, P/B & P/S",
    metaDescription: "Free stock ratios calculator. Get P/E, earnings yield, dividend yield, payout ratio, price-to-book and price-to-sales from per-share figures.",
    calcInputs: [currencyField("sharePrice", "Share Price", { default: 60, max: 10000000, step: 0.01 }), money("eps", "Earnings per Share", 4), currencyField("dividendsPerShare", "Dividends per Share", { default: 1.5, max: 100000, step: 0.01, required: false }), money("bookValuePerShare", "Book Value per Share", 25, false), currencyField("salesPerShare", "Sales per Share", { default: 40, max: 10000000, step: 0.01, required: false })],
    calcResult: { label: "P/E Ratio", format: "number" },
    calcResults: [num("peRatio", "P/E Ratio", true), pct("earningsYield", "Earnings Yield"), pct("dividendYield", "Dividend Yield"), pct("payoutRatio", "Payout Ratio"), num("priceToBook", "Price-to-Book"), num("priceToSales", "Price-to-Sales")],
    instructions: "Enter the share price and per-share figures from the latest annual or trailing-twelve-month results. Each ratio also has its own detailed calculator.",
    examples: "Example: a $60 stock earning $4, paying $1.50, with $25 book value and $40 sales per share has a P/E of 15, earnings yield 6.67%, dividend yield 2.5%, payout 37.5%, P/B 2.4 and P/S 1.5.",
    assumptions: "Ratios aren't meaningful with negative earnings or book value (shown as 0). Compare against peers and the company's own history. " + DISCLAIMER,
    faq: [
      { question: "Which stock ratio is most important?", answer: "None alone — P/E for earnings, P/B for asset-heavy firms, P/S for unprofitable growers, and yield for income investors." },
      { question: "What is earnings yield?", answer: "EPS ÷ price — the inverse of P/E, useful for comparing stocks with bond yields." },
    ],
  },
  {
    slug: "liquidity-ratios-calculator",
    category: BUSINESS_RATIOS,
    title: "Liquidity Ratios Calculator",
    description: "Calculate a company's liquidity ratios at once — current ratio, quick (acid-test) ratio, cash ratio, operating cash flow ratio and working capital.",
    metaTitle: "Liquidity Ratios Calculator — Current, Quick & Cash Ratio",
    metaDescription: "Free liquidity ratios calculator. Get the current ratio, quick ratio, cash ratio, operating cash flow ratio and working capital from the balance sheet.",
    calcInputs: [big("currentAssets", "Current Assets", 500000), big("inventory", "Inventory", 150000, false), big("prepaidExpenses", "Prepaid Expenses", 10000, false), big("cashAndSecurities", "Cash & Marketable Securities", 120000), big("currentLiabilities", "Current Liabilities", 250000), money("operatingCashFlow", "Operating Cash Flow (year)", 180000, false)],
    calcResult: { label: "Current Ratio", format: "number" },
    calcResults: [num("currentRatio", "Current Ratio", true), num("quickRatio", "Quick (Acid-Test) Ratio"), num("cashRatio", "Cash Ratio"), num("operatingCashFlowRatio", "Operating Cash Flow Ratio"), cur("workingCapital", "Working Capital")],
    instructions: "Enter figures from the balance sheet and the cash flow statement. Each ratio is a stricter test of whether short-term obligations can be paid.",
    examples: "Example: $500,000 of current assets against $250,000 of liabilities is a current ratio of 2.0. Excluding $150,000 of inventory and $10,000 of prepaids, the quick ratio is 1.36; cash alone covers 0.48 of liabilities.",
    assumptions: "Quick ratio = (current assets − inventory − prepaids) ÷ current liabilities. A current ratio of 1.5–2 and a quick ratio near 1 are common benchmarks but vary by industry. " + DISCLAIMER,
    faq: [
      { question: "Why exclude inventory from the quick ratio?", answer: "Inventory may take time to sell or sell at a discount, so it isn't immediately available cash." },
      { question: "Can a current ratio be too high?", answer: "Yes — it can mean idle cash or excess inventory that could be put to better use." },
    ],
  },
  {
    slug: "debt-ratios-calculator",
    category: BUSINESS_RATIOS,
    title: "Debt Ratios Calculator",
    description: "Calculate a company's debt and solvency ratios at once — debt ratio, debt-to-equity, equity ratio, interest coverage, debt-to-EBITDA and debt service coverage.",
    metaTitle: "Debt Ratios Calculator — Leverage & Coverage Ratios",
    metaDescription: "Free debt ratios calculator. Get the debt ratio, debt-to-equity, equity ratio, interest coverage, debt-to-EBITDA and DSCR in one place.",
    calcInputs: [big("totalAssets", "Total Assets", 1000000), big("totalLiabilities", "Total Liabilities", 550000), big("totalDebt", "Interest-Bearing Debt", 400000), money("shareholdersEquity", "Shareholders' Equity", 450000), money("ebit", "EBIT", 150000), big("interestExpense", "Interest Expense", 25000), money("ebitda", "EBITDA", 190000, false), big("annualDebtService", "Annual Debt Service (principal + interest)", 80000, false)],
    calcResult: { label: "Debt Ratio", format: "percentage" },
    calcResults: [pct("debtRatio", "Debt Ratio (liabilities ÷ assets)", true), num("debtToEquity", "Debt-to-Equity"), pct("equityRatio", "Equity Ratio"), num("interestCoverage", "Interest Coverage (× EBIT)"), num("debtToEbitda", "Debt ÷ EBITDA"), num("debtServiceCoverage", "Debt Service Coverage (EBITDA ÷ debt service)")],
    instructions: "Enter balance-sheet totals and income-statement figures for the same period. Leverage ratios show how much is borrowed; coverage ratios show how easily it's serviced.",
    examples: "Example: $550,000 of liabilities on $1M of assets is a 55% debt ratio; $400,000 of debt is 0.89× equity and 2.11× EBITDA. EBIT covers interest 6 times and EBITDA covers debt service 2.38 times.",
    assumptions: "DSCR here uses EBITDA; lenders to property investors use net operating income instead (see the DSCR Calculator). Typical bank covenants: debt ÷ EBITDA under 3–4×, interest coverage above 2–3×. " + DISCLAIMER,
    faq: [
      { question: "What is a healthy debt ratio?", answer: "Below about 0.5–0.6 for most companies; utilities and banks run higher." },
      { question: "Why look at coverage as well as leverage?", answer: "A company can carry lots of debt safely if its earnings cover the payments comfortably." },
    ],
  },
  {
    slug: "profitability-ratios-calculator",
    category: BUSINESS_RATIOS,
    title: "Profitability Ratios Calculator",
    description: "Calculate a company's profitability ratios at once — gross margin, operating margin, net margin, return on assets (ROA) and return on equity (ROE).",
    metaTitle: "Profitability Ratios Calculator — Margins, ROA & ROE",
    metaDescription: "Free profitability ratios calculator. Get gross, operating and net profit margins plus return on assets and return on equity from one set of figures.",
    calcInputs: [big("revenue", "Revenue", 2000000), big("cogs", "Cost of Goods Sold", 1200000), money("operatingIncome", "Operating Income", 300000), money("netIncome", "Net Income", 200000), big("totalAssets", "Total Assets (average)", 1600000), money("shareholdersEquity", "Shareholders' Equity (average)", 800000)],
    calcResult: { label: "Net Margin", format: "percentage" },
    calcResults: [pct("grossMargin", "Gross Margin"), pct("operatingMargin", "Operating Margin"), pct("netMargin", "Net Profit Margin", true), pct("returnOnAssets", "Return on Assets (ROA)"), pct("returnOnEquity", "Return on Equity (ROE)")],
    instructions: "Enter a year's income-statement figures and average assets and equity. Margins show how much of each sales dollar is kept; returns show how well the company uses its resources.",
    examples: "Example: $2M of revenue with $1.2M COGS, $300,000 operating income and $200,000 net income gives margins of 40%, 15% and 10%. On $1.6M of assets and $800,000 of equity, ROA is 12.5% and ROE 25%.",
    assumptions: "Use average balance-sheet figures for the year where possible. For a breakdown of what drives ROE, use the DuPont Analysis Calculator. " + DISCLAIMER,
    faq: [
      { question: "What is a good net profit margin?", answer: "It varies widely: grocers earn 1–3%, software companies 20%+. Compare within the industry." },
      { question: "Why can ROE be much higher than ROA?", answer: "Debt — ROE spreads profit over a smaller equity base, so leverage raises it." },
    ],
  },
  {
    slug: "operations-ratios-calculator",
    category: BUSINESS_RATIOS,
    title: "Operations Ratios Calculator",
    description: "Calculate a company's efficiency (operating) ratios at once — asset turnover, inventory, receivables and payables turnover, the matching days and the cash conversion cycle.",
    metaTitle: "Operations Ratios Calculator — Turnover & Efficiency",
    metaDescription: "Free operations (efficiency) ratios calculator. Get asset turnover, inventory, receivables and payables turnover, DIO, DSO, DPO and cash conversion cycle.",
    calcInputs: [big("revenue", "Revenue", 2000000), big("cogs", "Cost of Goods Sold", 1200000), big("averageTotalAssets", "Average Total Assets", 1600000), big("averageInventory", "Average Inventory", 200000), big("averageReceivables", "Average Accounts Receivable", 250000), big("averagePayables", "Average Accounts Payable", 150000)],
    calcResult: { label: "Cash Conversion Cycle", format: "number" },
    calcResults: [num("assetTurnover", "Asset Turnover"), num("inventoryTurnover", "Inventory Turnover"), num("daysInventoryOutstanding", "Days Inventory Outstanding"), num("receivablesTurnover", "Receivables Turnover"), num("daysSalesOutstanding", "Days Sales Outstanding"), num("payablesTurnover", "Payables Turnover"), num("daysPayableOutstanding", "Days Payable Outstanding"), num("cashConversionCycle", "Cash Conversion Cycle (days)", true)],
    instructions: "Enter a year's revenue and cost of goods sold, and average balances (start + end ÷ 2) for assets, inventory, receivables and payables.",
    examples: "Example: inventory turns 6 times (61 days), receivables 8 times (46 days) and payables 8 times (46 days), so cash is tied up for about 61 days; assets turn 1.25 times a year.",
    assumptions: "Inventory and payables turnover use COGS; receivables turnover uses revenue; days = 365 ÷ turnover; CCC = DIO + DSO − DPO. " + DISCLAIMER,
    faq: [
      { question: "What is a good cash conversion cycle?", answer: "Shorter is better; some retailers have negative cycles because they're paid before paying suppliers." },
      { question: "Why use averages?", answer: "Balances change during the year; averages match them to a full year of sales or costs." },
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
