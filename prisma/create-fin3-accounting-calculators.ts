// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// finance expansion 3 sub-batch "accounting". See
// src/lib/calc-engine-fin3-derivatives-tax.ts for the full list of 10
// sub-batches, and src/lib/calc-engine-fin3-accounting.ts for the math. Each tool
// is filed in the Finance Calculators sub-category the user named for it
// (created on first run; Retirement Calculators already exists).
//
// HOW TO RUN
//   npx tsx prisma/create-fin3-accounting-calculators.ts
// or
//   npm run db:create-fin3-accounting-calculators

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


const MICROECONOMICS = { name: "Economics Calculators", slug: "economics-calculators" };

const money = (key: string, label: string, def: number, required = true) => numberField(key, label, { unit: "$", default: def, min: -100000000000000, max: 100000000000000, step: 1, required });
const big = (key: string, label: string, def: number, required = true) => currencyField(key, label, { default: def, max: 100000000000000, step: 1, required });

const TOOLS: ToolDef[] = [
  {
    slug: "economic-profit-calculator",
    category: MICROECONOMICS,
    title: "Economic Profit Calculator",
    description: "Calculate accounting profit and economic profit — revenue minus explicit costs, and minus the implicit costs of your time and capital — to see if a business beats its next-best alternative.",
    metaTitle: "Economic Profit Calculator — vs Accounting Profit",
    metaDescription: "Free economic profit calculator. Find accounting profit and economic profit after implicit costs like your forgone salary and return on capital.",
    calcInputs: [big("revenue", "Total Revenue", 250000), big("explicitCosts", "Explicit Costs (wages, rent, materials)", 150000), big("forgoneSalary", "Salary You Gave Up (implicit)", 70000, false), big("capitalInvested", "Your Capital Invested", 100000, false), percentField("alternativeReturn", "Return It Could Earn Elsewhere", { default: 6, max: 50, step: 0.1, required: false })],
    calcResult: { label: "Economic Profit", format: "currency" },
    calcResults: [cur("accountingProfit", "Accounting Profit"), cur("implicitCosts", "Implicit (Opportunity) Costs"), cur("economicProfit", "Economic Profit", true), cur("normalProfit", "Normal Profit (break-even)"), num("verdict", "Result (1 Above normal, 2 Normal, 3 Economic loss)")],
    instructions: "Enter revenue and the costs you actually pay (explicit). Then add implicit costs — the salary you could earn working elsewhere and the return your invested money could earn. Economic profit above zero means the business beats your best alternative.",
    examples: "Example: $250,000 revenue and $150,000 of explicit costs is a $100,000 accounting profit. Subtract a $70,000 salary given up and 6% on $100,000 of capital ($6,000) and economic profit is $24,000.",
    assumptions: "Economic profit = accounting profit − implicit costs; zero economic profit is \"normal profit\". In perfect competition, economic profit is driven to zero in the long run.",
    faq: [
      { question: "Can accounting profit be positive while economic profit is negative?", answer: "Yes — the business makes money, but less than you'd earn with your time and capital elsewhere." },
      { question: "Why is economic profit used in economics?", answer: "It includes opportunity costs, so it shows whether resources are in their best use." },
    ],
  },
  {
    slug: "accrual-ratio-calculator",
    category: MICROECONOMICS,
    title: "Accrual Ratio Calculator",
    description: "Calculate the accrual ratio with the balance-sheet and cash-flow methods to judge earnings quality — how much of profit comes from accruals rather than cash.",
    metaTitle: "Accrual Ratio Calculator — Earnings Quality",
    metaDescription: "Free accrual ratio calculator. Use the balance sheet (change in net operating assets) and cash flow methods to measure how much earnings rely on accruals.",
    calcInputs: [money("netIncome", "Net Income", 5000000), money("operatingCashFlow", "Cash Flow from Operations", 4200000), money("investingCashFlow", "Cash Flow from Investing", -1500000), money("noaBeginning", "Net Operating Assets — Start of Year", 40000000), money("noaEnd", "Net Operating Assets — End of Year", 43000000)],
    calcResult: { label: "Cash-Flow Accrual Ratio", format: "percentage" },
    calcResults: [cur("averageNoa", "Average Net Operating Assets"), pct("balanceSheetAccrualRatio", "Balance-Sheet Accrual Ratio"), pct("cashFlowAccrualRatio", "Cash-Flow Accrual Ratio", true), cur("aggregateAccruals", "Aggregate Accruals (NI − CFO − CFI)")],
    instructions: "Enter net income, operating and investing cash flows, and net operating assets at the start and end of the year (use the Net Operating Assets Calculator). Ratios near zero mean earnings are well backed by cash.",
    examples: "Example: $5M net income with $4.2M operating and −$1.5M investing cash flow gives $2.3M of accruals — a cash-flow accrual ratio of 5.54% on $41.5M average NOA. NOA grew $3M, a balance-sheet ratio of 7.23%.",
    assumptions: "Balance-sheet method: (NOA_end − NOA_start) ÷ average NOA. Cash-flow method: (NI − CFO − CFI) ÷ average NOA (CFA Institute). Research (Sloan, 1996) found high-accrual firms tend to underperform. " + DISCLAIMER,
    faq: [
      { question: "What is a good accrual ratio?", answer: "Close to zero or negative; persistently high positive ratios (above about 10%) can signal aggressive accounting." },
      { question: "Why include investing cash flow?", answer: "Capital spending raises operating assets without hitting earnings, so it's removed to isolate accruals." },
    ],
  },
  {
    slug: "actual-cash-value-calculator",
    category: MICROECONOMICS,
    title: "Actual Cash Value Calculator",
    description: "Calculate the actual cash value (ACV) of a damaged or stolen item for an insurance claim — replacement cost minus depreciation — and your payout after the deductible.",
    metaTitle: "Actual Cash Value Calculator — ACV Insurance Payout",
    metaDescription: "Free actual cash value calculator. Estimate ACV as replacement cost minus depreciation for age, and compare the claim payout with a replacement-cost policy.",
    calcInputs: [currencyField("replacementCost", "Cost to Replace New", { default: 2000, max: 100000000, step: 1 }), numberField("ageYears", "Age of the Item (years)", { default: 4, max: 200, step: 0.5 }), numberField("usefulLifeYears", "Expected Useful Life (years)", { default: 8, min: 0.5, max: 200, step: 0.5 }), percentField("salvageFloorPercent", "Minimum Value (% of new)", { default: 10, step: 1, required: false }), currencyField("deductible", "Deductible", { default: 500, max: 1000000, step: 50, required: false })],
    calcResult: { label: "Actual Cash Value", format: "currency" },
    calcResults: [pct("depreciationPct", "Depreciation"), cur("depreciation", "Depreciation Amount"), cur("actualCashValue", "Actual Cash Value", true), cur("acvPayout", "Payout on an ACV Policy"), cur("replacementCostPayout", "Payout on a Replacement-Cost Policy")],
    instructions: "Enter what it would cost to buy the item new today, its age and how long such items normally last. Insurers use depreciation tables (e.g. TVs 7–8 years, furniture 10–15, roofs 20–30).",
    examples: "Example: a 4-year-old TV that costs $2,000 new with an 8-year life is 50% depreciated, so its ACV is $1,000 — a $500 payout after a $500 deductible, versus $1,500 on a replacement-cost policy.",
    assumptions: "Straight-line depreciation by age, never below the minimum value. Insurers may also adjust for condition. Replacement-cost policies often pay ACV first and the rest once you replace the item. " + DISCLAIMER,
    faq: [
      { question: "What's the difference between ACV and replacement cost?", answer: "ACV subtracts depreciation; replacement cost pays what it costs to buy new, without depreciation." },
      { question: "Can I dispute an ACV estimate?", answer: "Yes — provide receipts, comparable prices and condition evidence, and ask for the depreciation schedule used." },
    ],
  },
  {
    slug: "ebt-calculator",
    category: MICROECONOMICS,
    title: "EBT Calculator",
    description: "Calculate EBT (earnings before tax) from revenue, costs, interest and other income — plus the EBT margin, income tax and net income.",
    metaTitle: "EBT Calculator — Earnings Before Tax",
    metaDescription: "Free EBT calculator. Work out earnings before tax from revenue, COGS, operating expenses and interest, with EBT margin, tax and net income.",
    calcInputs: [big("revenue", "Revenue", 2000000), big("cogs", "Cost of Goods Sold", 1100000), big("operatingExpenses", "Operating Expenses", 500000), big("interestExpense", "Interest Expense", 60000, false), money("otherIncome", "Other Income / (Expense)", 10000, false), percentField("taxRate", "Tax Rate", { default: 21 })],
    calcResult: { label: "EBT", format: "currency" },
    calcResults: [cur("ebit", "EBIT (Operating Income)"), cur("ebt", "Earnings Before Tax (EBT)", true), pct("ebtMargin", "EBT Margin"), cur("incomeTax", "Income Tax"), cur("netIncome", "Net Income")],
    instructions: "Enter revenue, cost of goods sold, operating expenses, interest and any non-operating income. EBT (pre-tax income) sits between EBIT and net income on the income statement.",
    examples: "Example: $2M revenue − $1.1M COGS − $500,000 opex = $400,000 EBIT. Less $60,000 interest plus $10,000 other income gives $350,000 EBT (17.5%), and $276,500 net income after 21% tax.",
    assumptions: "EBT = EBIT − interest + other income. Tax applies only to a positive EBT. For EBIT alone, use the EBIT Calculator. " + DISCLAIMER,
    faq: [
      { question: "Why look at EBT?", answer: "It compares profitability across companies or countries with different tax rates." },
      { question: "Is EBT the same as pre-tax income?", answer: "Yes — earnings before tax, pre-tax income and profit before tax are the same line." },
    ],
  },
  {
    slug: "goodwill-calculator",
    category: MICROECONOMICS,
    title: "Goodwill Calculator",
    description: "Calculate goodwill from a business acquisition — the purchase price above the fair value of identifiable net assets — or a bargain purchase gain if it's negative.",
    metaTitle: "Goodwill Calculator — Acquisition Goodwill",
    metaDescription: "Free goodwill calculator. Subtract the fair value of identifiable assets less liabilities from the purchase price (plus NCI) to find goodwill.",
    calcInputs: [big("purchasePrice", "Purchase Price (consideration paid)", 50000000), big("fairValueAssets", "Fair Value of Identifiable Assets", 60000000), big("fairValueLiabilities", "Fair Value of Liabilities Assumed", 22000000), big("nonControllingInterest", "Non-Controlling Interest (if < 100% bought)", 0, false)],
    calcResult: { label: "Goodwill", format: "currency" },
    calcResults: [cur("netIdentifiableAssets", "Net Identifiable Assets"), cur("goodwill", "Goodwill", true), cur("bargainPurchaseGain", "Bargain Purchase Gain"), pct("goodwillShareOfPrice", "Goodwill as % of Price")],
    instructions: "Enter the price paid and the fair values (not book values) of the target's identifiable assets — including intangibles like customer lists, brands and patents — and liabilities.",
    examples: "Example: paying $50M for a company with $60M of identifiable assets and $22M of liabilities ($38M net) creates $12M of goodwill — 24% of the price.",
    assumptions: "Goodwill = consideration + NCI − fair value of net identifiable assets (ASC 805 / IFRS 3). Goodwill isn't amortized under US GAAP or IFRS for public companies; it's tested yearly for impairment. " + DISCLAIMER,
    faq: [
      { question: "What does goodwill represent?", answer: "The value of things you can't separate and sell — reputation, workforce, synergies and expected growth." },
      { question: "What is a bargain purchase?", answer: "Paying less than the fair value of net assets; the difference is recorded as a gain after a careful re-check." },
    ],
  },
  {
    slug: "retained-earnings-calculator",
    category: MICROECONOMICS,
    title: "Retained Earnings Calculator",
    description: "Calculate ending retained earnings — beginning balance plus net income minus dividends — and the share of profit the company kept.",
    metaTitle: "Retained Earnings Calculator — Ending Balance",
    metaDescription: "Free retained earnings calculator. Add net income to beginning retained earnings and subtract cash and stock dividends to get the ending balance.",
    calcInputs: [money("beginningRetainedEarnings", "Beginning Retained Earnings", 800000), money("netIncome", "Net Income (loss negative)", 250000), big("cashDividends", "Cash Dividends", 60000, false), big("stockDividends", "Stock Dividends", 0, false)],
    calcResult: { label: "Ending Retained Earnings", format: "currency" },
    calcResults: [cur("endingRetainedEarnings", "Ending Retained Earnings", true), cur("changeInRetainedEarnings", "Change During the Period"), pct("retentionRatio", "Share of Profit Retained")],
    instructions: "Enter retained earnings from last period's balance sheet, this period's net income and the dividends declared.",
    examples: "Example: $800,000 + $250,000 net income − $60,000 of dividends = $990,000 of ending retained earnings — 76% of profit kept in the business.",
    assumptions: "Ending RE = beginning RE + net income − dividends (plus or minus prior-period adjustments, not modelled). Negative retained earnings are called an accumulated deficit.",
    faq: [
      { question: "Are retained earnings cash?", answer: "No — they're the cumulative profits kept, which may have been spent on equipment, inventory or debt repayment." },
      { question: "Can retained earnings be negative?", answer: "Yes, after cumulative losses or dividends larger than profits — shown as an accumulated deficit." },
    ],
  },
  {
    slug: "net-debt-calculator",
    category: MICROECONOMICS,
    title: "Net Debt Calculator",
    description: "Calculate a company's net debt — total debt minus cash and liquid investments — and the net debt to EBITDA leverage ratio.",
    metaTitle: "Net Debt Calculator — Net Debt & Net Debt/EBITDA",
    metaDescription: "Free net debt calculator. Add short- and long-term debt and leases, subtract cash and marketable securities, and see net debt to EBITDA.",
    calcInputs: [big("shortTermDebt", "Short-Term Debt", 150000000), big("longTermDebt", "Long-Term Debt", 900000000), big("leaseLiabilities", "Lease Liabilities (optional)", 0, false), big("cash", "Cash & Equivalents", 300000000), big("marketableSecurities", "Marketable Securities", 50000000, false), money("ebitda", "EBITDA (optional)", 400000000, false)],
    calcResult: { label: "Net Debt", format: "currency" },
    calcResults: [cur("totalDebt", "Total Debt"), cur("cashAndEquivalents", "Cash & Liquid Investments"), cur("netDebt", "Net Debt (negative = net cash)", true), num("netDebtToEbitda", "Net Debt ÷ EBITDA")],
    instructions: "Enter all interest-bearing debt and the cash and liquid investments the company could use to repay it. Including leases is common under IFRS 16 and ASC 842.",
    examples: "Example: $1.05B of debt less $350M of cash and securities is $700M of net debt — 1.75× EBITDA of $400M.",
    assumptions: "Net debt = debt (+ leases) − cash − liquid investments. Net debt ÷ EBITDA under about 2–3× is generally considered manageable. Enterprise value = market cap + net debt. " + DISCLAIMER,
    faq: [
      { question: "What does negative net debt mean?", answer: "The company holds more cash than debt — a net cash position." },
      { question: "Why use net debt instead of total debt?", answer: "Cash could repay debt immediately, so net debt shows the real burden." },
    ],
  },
  {
    slug: "productivity-calculator",
    category: MICROECONOMICS,
    title: "Productivity Calculator",
    description: "Calculate labor productivity (output per hour and per worker), multifactor productivity per dollar of inputs, and the change from a previous period.",
    metaTitle: "Productivity Calculator — Labor & Multifactor Productivity",
    metaDescription: "Free productivity calculator. Measure output per labor hour and per worker, multifactor productivity per dollar of input, and productivity growth.",
    calcInputs: [numberField("output", "Output (units or revenue)", { default: 12000, max: 100000000000 }), numberField("laborHours", "Labor Hours", { default: 1600, max: 1000000000 }), numberField("workers", "Number of Workers", { default: 10, max: 100000000 }), currencyField("laborCost", "Labor Cost", { default: 48000, max: 100000000000, step: 1, required: false }), currencyField("materialCost", "Materials Cost", { default: 30000, max: 100000000000, step: 1, required: false }), currencyField("overheadCost", "Overhead / Capital Cost", { default: 12000, max: 100000000000, step: 1, required: false }), numberField("priorOutputPerHour", "Last Period's Output per Hour (optional)", { default: 0, max: 100000000, step: 0.0001, required: false })],
    calcResult: { label: "Output per Hour", format: "number" },
    calcResults: [num("outputPerHour", "Labor Productivity (output per hour)", true, 4), num("outputPerWorker", "Output per Worker"), num("multifactorProductivity", "Multifactor Productivity (output per $ input)", false, 4), pct("changeVsPrior", "Change vs Last Period")],
    instructions: "Enter what was produced (units, or revenue for services), the hours worked and the people involved. Add costs of all inputs for multifactor productivity.",
    examples: "Example: 12,000 units from 1,600 labor hours is 7.5 units per hour, or 1,200 per worker. With $90,000 of total inputs, multifactor productivity is 0.133 units per dollar.",
    assumptions: "Labor productivity = output ÷ hours; multifactor = output ÷ total input cost. Use the same output measure each period; revenue-based measures are affected by price changes.",
    faq: [
      { question: "How is national productivity measured?", answer: "The BLS measures output per hour worked in the nonfarm business sector; US growth averaged about 1.5–2% a year in recent decades." },
      { question: "How can a business raise productivity?", answer: "Better tools and automation, training, removing bottlenecks and reducing rework." },
    ],
  },
  {
    slug: "degree-of-operating-leverage-calculator",
    category: MICROECONOMICS,
    title: "Degree of Operating Leverage Calculator",
    description: "Calculate the degree of operating leverage (DOL) — how much operating profit changes for a 1% change in sales — from sales, variable costs and fixed costs.",
    metaTitle: "Degree of Operating Leverage Calculator — DOL",
    metaDescription: "Free DOL calculator. Divide contribution margin by EBIT to find operating leverage and project how EBIT moves when sales rise or fall.",
    calcInputs: [big("sales", "Sales", 1000000), big("variableCosts", "Variable Costs", 600000), big("fixedCosts", "Fixed Costs", 250000), percentField("salesChangePercent", "Sales Change to Test", { default: 10, min: -100, max: 1000, step: 0.5 })],
    calcResult: { label: "DOL", format: "number", decimals: 4 },
    calcResults: [cur("contributionMargin", "Contribution Margin"), cur("ebit", "EBIT (Operating Income)"), num("dol", "Degree of Operating Leverage", true, 4), pct("ebitChangePercent", "EBIT Change for That Sales Change"), cur("projectedEbit", "Projected EBIT")],
    instructions: "Enter sales and split costs into variable (which rise with sales) and fixed. A DOL of 2.67 means a 10% sales increase lifts operating profit by about 26.7% — and a 10% fall cuts it just as hard.",
    examples: "Example: $1M of sales, $600,000 of variable costs and $250,000 of fixed costs leave $400,000 of contribution margin and $150,000 of EBIT — a DOL of 2.67. A 10% sales rise lifts EBIT to $190,000.",
    assumptions: "DOL = contribution margin ÷ EBIT = %ΔEBIT ÷ %ΔSales at the current sales level; it changes as sales change. High fixed-cost businesses (software, airlines) have high operating leverage. " + DISCLAIMER,
    faq: [
      { question: "Is high operating leverage good?", answer: "It magnifies profits when sales grow but losses when they fall — more reward and more risk." },
      { question: "How is it different from financial leverage?", answer: "Operating leverage comes from fixed operating costs; financial leverage comes from fixed interest on debt." },
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
