// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// finance expansion 2 sub-batch "business-analysis". See
// src/lib/calc-engine-fin2-investing.ts for the full list of 9 sub-batches,
// and src/lib/calc-engine-fin2-business-analysis.ts for the math. Each tool is filed in
// the Finance Calculators sub-category the user named for it (created on
// first run).
//
// HOW TO RUN
//   npx tsx prisma/create-fin2-business-analysis-calculators.ts
// or
//   npm run db:create-fin2-business-analysis-calculators

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
const BUSINESS_CATEGORY = { name: "Business Finance Calculators", slug: "business-calculators" };
const MICROECONOMICS_CATEGORY = { name: "Microeconomics Calculators", slug: "microeconomics-calculators" };
const INVESTMENT_RETURNS_PLANNING_CATEGORY = { name: "Investment Returns & Planning Calculators", slug: "investment-returns-planning-calculators" };

const TOOLS: ToolDef[] = [
  {
    slug: "additional-funds-needed-calculator",
    category: BUSINESS_CATEGORY,
    title: "Additional Funds Needed Calculator",
    description: "Calculate additional funds needed (AFN) — the outside financing a company needs to support sales growth after spontaneous liabilities and retained earnings.",
    metaTitle: "Additional Funds Needed Calculator — AFN Formula",
    metaDescription: "Free AFN calculator. Use the additional funds needed formula to find how much external financing sales growth requires, after retained earnings.",
    calcInputs: [currencyField("currentSales", "Current Sales (S0)", { default: 5000000, max: 100000000000, step: 1000 }), percentField("salesGrowth", "Expected Sales Growth", { default: 20, min: -100, max: 1000 }), currencyField("salesLinkedAssets", "Assets That Grow with Sales (A*)", { default: 3000000, max: 100000000000, step: 1000 }), currencyField("spontaneousLiabilities", "Spontaneous Liabilities (payables, accruals)", { default: 500000, max: 100000000000, step: 1000 }), percentField("profitMargin", "Net Profit Margin", { default: 6, min: -100 }), percentField("payoutRatio", "Dividend Payout Ratio", { default: 40 })],
    calcResult: { label: "AFN", format: "currency" },
    calcResults: [cur("salesIncrease", "Increase in Sales (ΔS)"), cur("projectedSales", "Next Year's Sales (S1)"), cur("requiredAssetIncrease", "Required Increase in Assets"), cur("spontaneousLiabilityIncrease", "Spontaneous Liability Increase"), cur("addedRetainedEarnings", "Increase in Retained Earnings"), cur("additionalFundsNeeded", "Additional Funds Needed (AFN)", true)],
    instructions: "Enter this year's sales and the growth you expect, the assets that must grow in step with sales (receivables, inventory and — if at full capacity — fixed assets), liabilities that rise automatically with sales, the profit margin and the share of profit paid out as dividends.",
    examples: "Example: sales of $5M growing 20% need $600,000 more assets. Payables add $100,000 and retained earnings $216,000 (6% × $6M × 60%), leaving $284,000 to raise from banks or investors.",
    assumptions: "AFN = (A* ÷ S0)·ΔS − (L* ÷ S0)·ΔS − M·S1·(1 − payout). Assumes assets and spontaneous liabilities grow in proportion to sales. A negative AFN means a surplus. " + DISCLAIMER,
    faq: [
      { question: "What are spontaneous liabilities?", answer: "Liabilities that grow automatically with sales, like accounts payable and accrued wages — not bank loans or bonds." },
      { question: "How can a company reduce AFN?", answer: "Grow more slowly, raise margins, cut the dividend payout or use assets more efficiently." },
    ],
  },
  {
    slug: "evm-calculator",
    category: BUSINESS_CATEGORY,
    title: "EVM Calculator",
    description: "Calculate earned value management (EVM) metrics for a project — planned value, earned value, cost and schedule variance, CPI, SPI, EAC, ETC, VAC and TCPI.",
    metaTitle: "EVM Calculator — Earned Value, CPI, SPI & EAC",
    metaDescription: "Free earned value management calculator. Get PV, EV, CV, SV, CPI, SPI, estimate at completion, estimate to complete, VAC and TCPI for your project.",
    calcInputs: [currencyField("budgetAtCompletion", "Budget at Completion (BAC)", { default: 500000, max: 100000000000, step: 100 }), percentField("plannedPercent", "Planned % Complete (to date)", { default: 50 }), percentField("actualPercent", "Actual % Complete", { default: 40 }), currencyField("actualCost", "Actual Cost to Date (AC)", { default: 220000, max: 100000000000, step: 100 })],
    calcResult: { label: "CPI", format: "number" },
    calcResults: [cur("plannedValue", "Planned Value (PV)"), cur("earnedValue", "Earned Value (EV)"), cur("costVariance", "Cost Variance (CV = EV − AC)"), cur("scheduleVariance", "Schedule Variance (SV = EV − PV)"), num("cpi", "Cost Performance Index (CPI)", true, 4), num("spi", "Schedule Performance Index (SPI)", false, 4), cur("estimateAtCompletion", "Estimate at Completion (EAC)"), cur("estimateToComplete", "Estimate to Complete (ETC)"), cur("varianceAtCompletion", "Variance at Completion (VAC)"), num("tcpi", "To-Complete Performance Index (TCPI)", false, 4)],
    instructions: "Enter the total budget, how much of the work should be done by now according to the plan, how much actually is, and what you've spent. CPI and SPI below 1 mean over budget and behind schedule.",
    examples: "Example: a $500,000 project that should be 50% done is 40% done after spending $220,000. EV = $200,000, so CPI = 0.91 and SPI = 0.80. At this efficiency it will cost $550,000 — $50,000 over budget.",
    assumptions: "EAC = BAC ÷ CPI (assumes current cost performance continues); TCPI = (BAC − EV) ÷ (BAC − AC), the efficiency needed on the remaining work to finish on budget. PMI's PMBOK standard formulas.",
    faq: [
      { question: "What does a CPI of 0.9 mean?", answer: "You're getting 90 cents of planned work for every dollar spent — about 11% over budget." },
      { question: "What is a good SPI?", answer: "1.0 is on schedule; above 1 is ahead. Below about 0.9 usually needs corrective action." },
    ],
  },
  {
    slug: "emv-calculator",
    category: BUSINESS_CATEGORY,
    title: "EMV Calculator",
    description: "Calculate expected monetary value (EMV) for project risk analysis or a decision tree — probability × impact across up to five risks and opportunities.",
    metaTitle: "EMV Calculator — Expected Monetary Value (Risk Analysis)",
    metaDescription: "Free EMV calculator. Multiply each risk or opportunity's probability by its impact to get the expected monetary value for risk analysis and decision trees.",
    calcInputs: Array.from({ length: 5 }, (_, i) => [
      percentField(`probability${i + 1}`, `Outcome ${i + 1} — Probability`, { default: [20, 10, 30, 0, 0][i], step: 1, required: false }),
      numberField(`impact${i + 1}`, `Outcome ${i + 1} — Impact (− cost, + gain)`, { unit: "$", default: [-50000, -120000, 40000, 0, 0][i], min: -100000000000, max: 100000000000, step: 100, required: false }),
    ]).flat(),
    calcResult: { label: "EMV", format: "currency" },
    calcResults: [cur("expectedMonetaryValue", "Expected Monetary Value (EMV)", true), pct("totalProbability", "Total of Probabilities"), cur("bestOutcome", "Best Outcome"), cur("worstOutcome", "Worst Outcome"), num("outcomesCounted", "Outcomes Counted")],
    instructions: "List each risk with its probability and cost as a negative number, and each opportunity with a positive gain. The total EMV is the contingency reserve the risks justify (if negative) or the expected upside.\n\nFor a decision-tree branch, enter every possible outcome of that branch so the probabilities add to 100%.",
    examples: "Example: a 20% chance of a $50,000 delay, 10% chance of a $120,000 supplier failure and 30% chance of a $40,000 saving give an EMV of −$10,000 + −$12,000 + $12,000 = −$10,000 — a $10,000 contingency reserve.",
    assumptions: "EMV = Σ probability × impact (PMBOK quantitative risk analysis). Assumes you're risk-neutral; real decisions may weigh large losses more heavily — see the Expected Utility Calculator.",
    faq: [
      { question: "Why are risks entered as negative numbers?", answer: "So threats and opportunities can be added together: threats reduce value, opportunities increase it." },
      { question: "Do the probabilities need to add up to 100%?", answer: "For independent project risks, no. For a decision-tree branch, the outcomes should cover every possibility and total 100%." },
    ],
  },
  {
    slug: "hhi-calculator",
    category: MICROECONOMICS_CATEGORY,
    title: "HHI Calculator",
    description: "Calculate the Herfindahl-Hirschman Index (HHI) of market concentration from firms' market shares, the four-firm ratio, and the change in HHI from a merger.",
    metaTitle: "HHI Calculator — Herfindahl-Hirschman Index & Merger ΔHHI",
    metaDescription: "Free HHI calculator. Sum squared market shares to measure concentration, get CR4, and check a merger's change in HHI against the 2023 Merger Guidelines.",
    calcInputs: [...Array.from({ length: 10 }, (_, i) => percentField(`share${i + 1}`, `Firm ${i + 1} Market Share`, { default: [30, 25, 20, 15, 10, 0, 0, 0, 0, 0][i], step: 0.1, required: false })), dropdown("mergeFirms1And2", "Test a Merger of Firm 1 and Firm 2?", [["No", 2], ["Yes", 1]], 2)],
    calcResult: { label: "HHI", format: "number" },
    calcResults: [num("hhi", "HHI", true), num("concentration", "Market (1 Unconcentrated, 2 Moderately, 3 Highly Concentrated)"), pct("cr4", "Four-Firm Concentration Ratio (CR4)"), num("mergerDeltaHhi", "Change in HHI from Merger"), num("postMergerHhi", "Post-Merger HHI"), num("presumedAnticompetitive", "Merger Presumed Anticompetitive (1 = yes)"), pct("totalShareEntered", "Total Share Entered")],
    instructions: "Enter each firm's market share in percent (largest first is easiest). Firms you leave at 0 are ignored. To test a merger, put the two merging firms in rows 1 and 2.",
    examples: "Example: shares of 30%, 25%, 20%, 15% and 10% give an HHI of 2,250 — highly concentrated, with a CR4 of 90%. A merger of the top two firms adds 2 × 30 × 25 = 1,500, so it would be presumed to harm competition.",
    assumptions: "HHI = Σ share² (0–10,000). 2023 DOJ/FTC Merger Guidelines: above 1,800 is highly concentrated, and a merger that raises HHI by more than 100 into that range — or creates a firm with over 30% share and a ΔHHI above 100 — is presumed to lessen competition.",
    faq: [
      { question: "What does an HHI of 10,000 mean?", answer: "A pure monopoly — one firm with 100% of the market." },
      { question: "Why square market shares?", answer: "Squaring gives large firms much more weight, so the index rises quickly when a few firms dominate." },
    ],
  },
  {
    slug: "lerner-index-calculator",
    category: MICROECONOMICS_CATEGORY,
    title: "Lerner Index Calculator",
    description: "Calculate the Lerner Index of market power — (price − marginal cost) ÷ price — the markup, the implied price elasticity, and the profit-maximising price from an elasticity.",
    metaTitle: "Lerner Index Calculator — Market Power & Markup",
    metaDescription: "Free Lerner Index calculator. Measure market power from price and marginal cost, see the implied elasticity, and the optimal price given an elasticity.",
    calcInputs: [currencyField("price", "Price", { default: 50, max: 100000000, step: 0.01 }), currencyField("marginalCost", "Marginal Cost", { default: 30, max: 100000000, step: 0.01 }), numberField("elasticity", "Price Elasticity of Demand (optional, e.g. −2.5)", { default: 0, min: -100, max: 0, step: 0.01, required: false })],
    calcResult: { label: "Lerner Index", format: "number", decimals: 4 },
    calcResults: [num("lernerIndex", "Lerner Index", true, 4), pct("markupOverCost", "Markup over Marginal Cost"), num("impliedElasticity", "Implied Elasticity (−1 ÷ L)", false, 4), cur("optimalPriceFromElasticity", "Profit-Maximising Price from Elasticity")],
    instructions: "Enter the price and the marginal cost of one more unit. Optionally enter the demand elasticity (below −1) to see the price a profit-maximising firm would charge.",
    examples: "Example: a $50 price with a $30 marginal cost gives a Lerner Index of 0.40 — a 66.67% markup. That's what a profit-maximiser would charge if demand elasticity were −2.5.",
    assumptions: "L = (P − MC) ÷ P, from 0 (perfect competition, P = MC) to near 1 (strong monopoly power). At the profit-maximising price L = −1 ÷ E, so P* = MC × E ÷ (1 + E).",
    faq: [
      { question: "What is a high Lerner Index?", answer: "Values above about 0.3–0.4 suggest substantial pricing power; competitive industries are close to 0." },
      { question: "Why isn't a high markup always a sign of monopoly?", answer: "Firms with high fixed costs (like software or drugs) need prices well above marginal cost just to break even." },
    ],
  },
  {
    slug: "operating-asset-turnover-calculator",
    category: BUSINESS_CATEGORY,
    title: "Operating Asset Turnover Calculator",
    description: "Calculate operating asset turnover — revenue divided by the assets actually used to run the business — and compare it with total asset turnover.",
    metaTitle: "Operating Asset Turnover Calculator — Asset Efficiency",
    metaDescription: "Free operating asset turnover calculator. Divide revenue by average operating assets (excluding excess cash and investments) vs total asset turnover.",
    calcInputs: [currencyField("revenue", "Revenue", { default: 12000000, max: 1000000000000, step: 1000 }), currencyField("totalAssets", "Total Assets", { default: 9000000, max: 1000000000000, step: 1000 }), currencyField("nonOperatingAssets", "Non-Operating Assets (excess cash, investments)", { default: 1500000, max: 1000000000000, step: 1000, required: false }), currencyField("priorOperatingAssets", "Last Year's Operating Assets (optional, for average)", { default: 0, max: 1000000000000, step: 1000, required: false })],
    calcResult: { label: "Operating Asset Turnover", format: "number" },
    calcResults: [cur("operatingAssets", "Operating Assets"), cur("averageOperatingAssets", "Average Operating Assets"), num("operatingAssetTurnover", "Operating Asset Turnover", true), num("totalAssetTurnover", "Total Asset Turnover"), num("daysToTurnAssets", "Days of Revenue Tied Up in Assets")],
    instructions: "Enter revenue, total assets and the assets that aren't needed to run the business (surplus cash, investment securities, idle property). Add last year's operating assets to use the average.",
    examples: "Example: $12M revenue on $9M of assets, $1.5M of which are non-operating, gives an operating asset turnover of 1.6 versus a total asset turnover of 1.33.",
    assumptions: "Operating asset turnover = revenue ÷ operating assets. Compare companies within the same industry; capital-heavy industries naturally turn their assets more slowly. " + DISCLAIMER,
    faq: [
      { question: "Why exclude non-operating assets?", answer: "Cash piles and investments don't generate sales, so leaving them out shows how efficiently the core business uses its assets." },
      { question: "Is a higher asset turnover better?", answer: "Generally yes — more sales per dollar of assets — but it must be read alongside profit margin (see DuPont analysis)." },
    ],
  },
  {
    slug: "pre-and-post-money-valuation-calculator",
    category: BUSINESS_CATEGORY,
    title: "Pre and Post Money Valuation Calculator",
    description: "Calculate a startup's post-money valuation, investor and founder ownership, price per share and new shares issued — including the effect of a new option pool.",
    metaTitle: "Pre and Post Money Valuation Calculator — Startup Dilution",
    metaDescription: "Free pre and post money valuation calculator. See investor ownership, founder dilution, price per share and how an option pool lowers the pre-money.",
    calcInputs: [currencyField("investment", "Investment Amount", { default: 2000000, max: 100000000000, step: 1000 }), currencyField("preMoneyValuation", "Pre-Money Valuation", { default: 8000000, max: 1000000000000, step: 1000 }), numberField("existingShares", "Existing Fully Diluted Shares", { default: 10000000, min: 1, max: 100000000000 }), percentField("optionPoolPercent", "New Option Pool (% post-money, optional)", { default: 0, max: 50, step: 0.5, required: false })],
    calcResult: { label: "Post-Money Valuation", format: "currency" },
    calcResults: [cur("postMoneyValuation", "Post-Money Valuation", true), pct("investorOwnership", "Investor Ownership"), pct("existingHoldersOwnership", "Existing Holders' Ownership"), pct("optionPoolOwnership", "New Option Pool"), { key: "pricePerShare", label: "Price per Share", format: "currency", decimals: 4 }, num("newSharesIssued", "New Shares Issued to Investors"), cur("effectivePreMoney", "Effective Pre-Money (after pool)")],
    instructions: "Enter the amount being raised, the agreed pre-money valuation and current fully diluted shares. If investors require a new option pool created before the round, enter its size as a share of the post-money company.",
    examples: "Example: raising $2M at an $8M pre-money gives a $10M post-money; investors own 20% at $0.80 a share. A 10% new pool would cut founders to 70%, the price to $0.70 and the effective pre-money to $7M.",
    assumptions: "Post-money = pre-money + investment. When an option pool is created in the pre-money (the usual \"option pool shuffle\"), its dilution falls only on existing holders. SAFEs and convertible notes converting in the round aren't modelled.",
    faq: [
      { question: "What's the difference between pre-money and post-money?", answer: "Pre-money is the company's value before the new cash; post-money adds the investment." },
      { question: "Why does the option pool matter?", answer: "If it's created before the round, it dilutes only founders and existing holders — effectively lowering the pre-money valuation." },
    ],
  },
  {
    slug: "pvgo-calculator",
    category: BUSINESS_CATEGORY,
    title: "PVGO Calculator",
    description: "Calculate the present value of growth opportunities (PVGO) — how much of a stock's price comes from expected future growth rather than current earnings.",
    metaTitle: "PVGO Calculator — Present Value of Growth Opportunities",
    metaDescription: "Free PVGO calculator. Subtract the no-growth value (EPS ÷ cost of equity) from the share price to see how much of the price is paying for growth.",
    calcInputs: [currencyField("sharePrice", "Share Price", { default: 60, max: 10000000, step: 0.01 }), numberField("nextYearEps", "Next Year's EPS", { unit: "$", default: 3, min: -100000, max: 100000, step: 0.01 }), percentField("costOfEquity", "Cost of Equity", { default: 9, max: 50 })],
    calcResult: { label: "PVGO", format: "currency" },
    calcResults: [cur("noGrowthValue", "No-Growth Value (EPS ÷ r)"), cur("pvgo", "PVGO", true), pct("pvgoShareOfPrice", "Share of Price from Growth"), pct("earningsYield", "Earnings Yield")],
    instructions: "Enter the share price, next year's expected earnings per share and the return shareholders require (use the Cost of Equity Calculator if unsure).",
    examples: "Example: a $60 stock earning $3 next year with a 9% cost of equity would be worth $33.33 with no growth, so PVGO is $26.67 — 44% of the price is a bet on growth.",
    assumptions: "PVGO = P − E1 ÷ r, assuming all earnings would be paid out in the no-growth case. A negative PVGO suggests the market expects the company to destroy value with its investments. " + DISCLAIMER,
    faq: [
      { question: "What does a high PVGO mean?", answer: "Investors are paying mostly for future growth — typical of tech and other growth stocks, which makes the price sensitive to growth disappointments." },
      { question: "Can PVGO be negative?", answer: "Yes — when a company reinvests at returns below its cost of capital, growth destroys value." },
    ],
  },
  {
    slug: "expected-utility-calculator",
    category: INVESTMENT_RETURNS_PLANNING_CATEGORY,
    title: "Expected Utility Calculator",
    description: "Calculate the expected utility of a risky choice from its outcomes and probabilities, plus its certainty equivalent and risk premium for your level of risk aversion.",
    metaTitle: "Expected Utility Calculator — Certainty Equivalent",
    metaDescription: "Free expected utility calculator. Use CRRA or log utility to find expected utility, certainty equivalent and risk premium of a gamble or investment.",
    calcInputs: [numberField("riskAversion", "Risk Aversion γ (0 = neutral, 1 = log utility)", { default: 1, min: 0, max: 10, step: 0.1 }), ...Array.from({ length: 4 }, (_, i) => [
      currencyField(`outcome${i + 1}`, `Outcome ${i + 1} — Final Wealth`, { default: [150000, 80000, 0, 0][i], max: 100000000000, step: 100, required: false }),
      percentField(`probability${i + 1}`, `Outcome ${i + 1} — Probability`, { default: [50, 50, 0, 0][i], step: 1, required: false }),
    ]).flat()],
    calcResult: { label: "Certainty Equivalent", format: "currency" },
    calcResults: [cur("expectedValue", "Expected Value"), num("expectedUtility", "Expected Utility", false, 4), cur("certaintyEquivalent", "Certainty Equivalent", true), cur("riskPremium", "Risk Premium"), pct("totalProbability", "Total Probability")],
    instructions: "Enter each possible outcome as total wealth afterwards (not the gain) and its probability. Risk aversion γ describes how much you dislike risk: 0 values only the average, 1 is log utility, 2–4 is common in economics research.",
    examples: "Example: a 50/50 chance of ending with $150,000 or $80,000 has an expected value of $115,000. With log utility the certainty equivalent is about $109,545, so you'd give up about $5,455 to avoid the risk.",
    assumptions: "CRRA utility u(w) = w^(1−γ) ÷ (1 − γ), or ln(w) when γ = 1; certainty equivalent = u⁻¹(expected utility). Probabilities are rescaled if they don't add to 100%.",
    faq: [
      { question: "What is a certainty equivalent?", answer: "The guaranteed amount that feels as good to you as taking the gamble." },
      { question: "Why use utility instead of expected value?", answer: "Losing $50,000 hurts more than gaining $50,000 helps for most people; utility captures that risk aversion." },
    ],
  },
  {
    slug: "nopat-calculator",
    category: BUSINESS_CATEGORY,
    title: "NOPAT Calculator",
    description: "Calculate NOPAT (net operating profit after tax) from EBIT and the tax rate, cross-check it from net income, and get the NOPAT margin.",
    metaTitle: "NOPAT Calculator — Net Operating Profit After Tax",
    metaDescription: "Free NOPAT calculator. Compute net operating profit after tax as EBIT × (1 − tax rate), or from net income plus after-tax interest, and the NOPAT margin.",
    calcInputs: [numberField("ebit", "EBIT (Operating Income)", { unit: "$", default: 1500000, min: -100000000000, max: 100000000000, step: 1 }), percentField("taxRate", "Tax Rate", { default: 25 }), numberField("netIncome", "Net Income (optional, cross-check)", { unit: "$", default: 0, min: -100000000000, max: 100000000000, step: 1, required: false }), currencyField("interestExpense", "Interest Expense (optional)", { default: 0, max: 100000000000, step: 1, required: false }), currencyField("revenue", "Revenue (optional, for margin)", { default: 0, max: 1000000000000, step: 1, required: false })],
    calcResult: { label: "NOPAT", format: "currency" },
    calcResults: [cur("taxOnEbit", "Tax on EBIT"), cur("nopat", "NOPAT", true), cur("nopatFromNetIncome", "NOPAT from Net Income + After-Tax Interest"), pct("nopatMargin", "NOPAT Margin")],
    instructions: "Enter operating income (EBIT) and the tax rate. NOPAT is the profit the business would earn with no debt, so it's the starting point for ROIC, EVA and free cash flow to the firm.",
    examples: "Example: $1.5M EBIT at a 25% tax rate gives NOPAT of $1,125,000. A company with $900,000 net income and $300,000 interest gets the same: $900,000 + $300,000 × 0.75 = $1,125,000.",
    assumptions: "NOPAT = EBIT × (1 − t). Use the marginal or a normalised tax rate; one-off items should be removed from EBIT first. " + DISCLAIMER,
    faq: [
      { question: "How is NOPAT different from net income?", answer: "NOPAT ignores interest (financing), so it compares businesses regardless of how much debt they carry." },
      { question: "Where is NOPAT used?", answer: "In ROIC, economic value added (EVA) and discounted cash flow models." },
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
