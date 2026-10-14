// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// finance expansion 3 sub-batch "macro1". See
// src/lib/calc-engine-fin3-derivatives-tax.ts for the full list of 10
// sub-batches, and src/lib/calc-engine-fin3-macro1.ts for the math. Each tool
// is filed in the Finance Calculators sub-category the user named for it
// (created on first run; Retirement Calculators already exists).
//
// HOW TO RUN
//   npx tsx prisma/create-fin3-macro1-calculators.ts
// or
//   npm run db:create-fin3-macro1-calculators

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


const MACROECONOMICS = { name: "Economics Calculators", slug: "economics-calculators" };

const ECON_NOTE = "Textbook macroeconomic relationships for learning and rough estimates — real economies are messier.";

const TOOLS: ToolDef[] = [
  {
    slug: "carry-trade-calculator",
    category: MACROECONOMICS,
    title: "Carry Trade Calculator",
    description: "Calculate the profit or loss of a currency carry trade — borrowing in a low-rate currency to invest in a high-rate one — including the interest differential, leverage and exchange-rate moves.",
    metaTitle: "Carry Trade Calculator — Interest Differential & FX Risk",
    metaDescription: "Free carry trade calculator. See carry income, FX gain or loss, total return on capital with leverage and the break-even currency move.",
    calcInputs: [currencyField("capital", "Your Capital", { default: 10000, max: 1000000000, step: 100 }), numberField("leverage", "Leverage (×)", { default: 5, min: 1, max: 100, step: 0.5 }), percentField("fundingRate", "Interest Rate on Funding Currency (borrow)", { default: 0.5, min: -5, max: 50, step: 0.01 }), percentField("investRate", "Interest Rate on Target Currency (earn)", { default: 4.5, min: -5, max: 100, step: 0.01 }), numberField("holdingMonths", "Holding Period (months)", { default: 12, min: 1, max: 120 }), percentField("fxChange", "Target Currency Move vs Funding Currency", { default: -2, min: -90, max: 500, step: 0.1 })],
    calcResult: { label: "Total Profit", format: "currency" },
    calcResults: [pct("interestDifferential", "Interest Rate Differential"), cur("positionSize", "Position Size"), cur("carryIncome", "Net Interest (Carry)"), cur("fxGainLoss", "Currency Gain / Loss"), cur("totalProfit", "Total Profit", true), pct("returnOnCapital", "Return on Your Capital"), pct("breakEvenFxMove", "Currency Fall That Wipes Out the Carry")],
    instructions: "Enter your capital and leverage, the interest rate you pay on the borrowed (funding) currency and the rate you earn on the target currency, the holding period and how much you expect the target currency to rise (+) or fall (−).",
    examples: "Example: $10,000 at 5× leverage borrows at 0.5% and earns 4.5% for a year — $2,050 of carry. If the target currency falls 2%, the $1,045 FX loss leaves $1,005 profit (10% on capital). A fall of about 3.9% would wipe out the carry.",
    assumptions: "Simple interest over the holding period; the full position plus earned interest is exposed to the currency move. Brokers' swap/rollover rates, spreads and margin calls aren't included. Carry trades can unwind violently (e.g. the yen in August 2024). " + DISCLAIMER,
    faq: [
      { question: "Why is the yen a popular funding currency?", answer: "Japan kept interest rates near zero for decades, so borrowing yen was cheap." },
      { question: "What's the main risk?", answer: "A sudden rise in the funding currency, which can erase years of interest in days, magnified by leverage." },
    ],
  },
  {
    slug: "cobb-douglas-production-function-calculator",
    category: MACROECONOMICS,
    title: "Cobb-Douglas Production Function Calculator",
    description: "Calculate output with the Cobb-Douglas production function Y = A·K^α·L^β, the marginal products of capital and labor, and the returns to scale.",
    metaTitle: "Cobb-Douglas Production Function Calculator",
    metaDescription: "Free Cobb-Douglas calculator. Find output Y = A·K^α·L^β, marginal product of capital and labor, output per worker and returns to scale.",
    calcInputs: [numberField("totalFactorProductivity", "Total Factor Productivity (A)", { default: 1.5, max: 1000000, step: 0.01 }), numberField("capital", "Capital (K)", { default: 400, max: 1000000000000, step: 1 }), numberField("labor", "Labor (L)", { default: 100, max: 1000000000000, step: 1 }), numberField("alpha", "Capital Share α", { default: 0.3, max: 5, step: 0.01 }), numberField("beta", "Labor Share β", { default: 0.7, max: 5, step: 0.01 })],
    calcResult: { label: "Output", format: "number", decimals: 4 },
    calcResults: [num("output", "Output (Y)", true, 4), num("marginalProductOfCapital", "Marginal Product of Capital", false, 4), num("marginalProductOfLabor", "Marginal Product of Labor", false, 4), num("returnsToScaleSum", "α + β", false, 4), num("returnsToScale", "Returns to Scale (1 Increasing, 2 Constant, 3 Decreasing)"), num("outputPerWorker", "Output per Worker", false, 4)],
    instructions: "Enter productivity, the amounts of capital and labor, and the output elasticities α and β. With α + β = 1 (constant returns), doubling both inputs doubles output; α is also capital's share of income.",
    examples: "Example: A = 1.5, K = 400, L = 100, α = 0.3 and β = 0.7 give output of 227.36. An extra unit of labor adds about 1.59 and an extra unit of capital about 0.17.",
    assumptions: "Y = A·K^α·L^β; MPK = αY ÷ K; MPL = βY ÷ L. US data suggest α ≈ 0.3–0.4. " + ECON_NOTE,
    faq: [
      { question: "What does total factor productivity mean?", answer: "Output not explained by capital and labor — technology, skills and efficiency." },
      { question: "Why is constant returns to scale common?", answer: "Doubling every input should roughly double output in a competitive economy, and it fits long-run data well." },
    ],
  },
  {
    slug: "discretionary-income-calculator",
    category: MACROECONOMICS,
    title: "Discretionary Income Calculator",
    description: "Calculate your discretionary income — what's left after taxes and essentials — or the discretionary income used for federal student loan income-driven repayment.",
    metaTitle: "Discretionary Income Calculator — Budget & Student Loans",
    metaDescription: "Free discretionary income calculator. Find money left after taxes and essentials, or your IDR discretionary income from AGI and the poverty guideline.",
    calcInputs: [dropdown("mode", "Calculate For", [["My monthly budget", 1], ["Student loan income-driven repayment", 2]], 1), currencyField("grossIncome", "Gross Monthly Income (budget)", { default: 6000, max: 100000000, step: 50, required: false }), currencyField("taxes", "Monthly Taxes (budget)", { default: 1300, max: 100000000, step: 10, required: false }), currencyField("housing", "Housing (budget)", { default: 1700, max: 100000000, step: 10, required: false }), currencyField("food", "Groceries (budget)", { default: 600, max: 100000000, step: 10, required: false }), currencyField("transport", "Transportation (budget)", { default: 400, max: 100000000, step: 10, required: false }), currencyField("utilitiesInsurance", "Utilities & Insurance (budget)", { default: 450, max: 100000000, step: 10, required: false }), currencyField("minimumDebtPayments", "Minimum Debt Payments (budget)", { default: 300, max: 100000000, step: 10, required: false }), currencyField("agi", "Adjusted Gross Income (IDR)", { default: 55000, max: 100000000, step: 100, required: false }), numberField("familySize", "Family Size (IDR)", { default: 1, min: 1, max: 20, required: false }), dropdown("planMultiple", "IDR Plan Protection (IDR)", [["150% of poverty line (IBR, PAYE)", 150], ["100% (ICR)", 100], ["225% (SAVE — ended)", 225]], 150), currencyField("povertyGuidelineBase", "Poverty Guideline, 1 Person", { default: 15650, max: 1000000, step: 10, required: false }), currencyField("povertyGuidelinePerPerson", "Poverty Guideline, Each Extra Person", { default: 5500, max: 1000000, step: 10, required: false })],
    calcResult: { label: "Discretionary Income", format: "currency" },
    calcResults: [cur("povertyGuideline", "Poverty Guideline (IDR)"), cur("protectedIncome", "Protected Income / Essentials"), cur("yearlyDiscretionaryIncome", "Yearly Discretionary Income"), cur("monthlyDiscretionaryIncome", "Monthly Discretionary Income", true), cur("idrPaymentAt10Pct", "IDR Payment at 10% (monthly)"), pct("shareOfIncome", "Share of Income")],
    instructions: "For a budget, enter monthly income, taxes and essential costs — what's left is yours to spend or save. For student loans, enter AGI and family size; federal income-driven plans protect 100–225% of the poverty guideline and charge 10–20% of the rest.",
    examples: "Example: $6,000 a month minus $1,300 of taxes and $3,450 of essentials leaves $1,250 of discretionary income (21%). For IDR, a single borrower with $55,000 AGI has $31,525 of discretionary income at 150% — a 10% payment of about $263 a month.",
    assumptions: "Default poverty guideline: 2025 HHS figures for the 48 contiguous states ($15,650 + $5,500 per extra person; higher in Alaska and Hawaii) — update to the latest year. The SAVE plan ended after court rulings, and RAP replaces new IDR plans from July 2026. " + ECON_NOTE,
    faq: [
      { question: "What's the difference between disposable and discretionary income?", answer: "Disposable income is after taxes; discretionary income is after taxes and essentials." },
      { question: "How is discretionary income used for student loans?", answer: "IBR and PAYE payments are 10% (or 15% for older IBR loans) of AGI above 150% of the poverty guideline." },
    ],
  },
  {
    slug: "disposable-income-calculator",
    category: MACROECONOMICS,
    title: "Disposable Income Calculator",
    description: "Calculate disposable income — gross income minus income and payroll taxes — and the personal saving and saving rate after consumption spending.",
    metaTitle: "Disposable Income Calculator — After-Tax Income & Saving",
    metaDescription: "Free disposable income calculator. Subtract federal, state and payroll taxes from gross income, then see personal saving and the saving rate.",
    calcInputs: [currencyField("grossIncome", "Gross Yearly Income", { default: 85000, max: 1000000000, step: 100 }), currencyField("federalIncomeTax", "Federal Income Tax", { default: 9500, max: 1000000000, step: 10 }), currencyField("stateLocalTax", "State & Local Income Tax", { default: 3800, max: 1000000000, step: 10, required: false }), currencyField("payrollTax", "Social Security & Medicare", { default: 6503, max: 1000000000, step: 1, required: false }), currencyField("consumption", "Yearly Spending", { default: 55000, max: 1000000000, step: 100, required: false })],
    calcResult: { label: "Disposable Income", format: "currency" },
    calcResults: [cur("totalTaxes", "Total Taxes"), cur("disposableIncome", "Disposable Income", true), cur("monthlyDisposableIncome", "Per Month"), cur("personalSaving", "Personal Saving"), pct("savingRate", "Saving Rate"), pct("taxShareOfIncome", "Taxes as % of Income")],
    instructions: "Enter your gross income and the income and payroll taxes you pay (from your pay stubs or tax return). Add yearly spending to see how much of your disposable income you save.",
    examples: "Example: $85,000 of income minus $19,803 of taxes leaves $65,197 of disposable income. Spending $55,000 means saving $10,197 — a 15.6% saving rate.",
    assumptions: "Disposable personal income = income − personal current taxes (the BEA measure also adds transfer payments). The US personal saving rate has been around 4–5% recently. For take-home pay from salary, use the Take-Home Pay Calculator. " + ECON_NOTE,
    faq: [
      { question: "Is disposable income the same as take-home pay?", answer: "Close — take-home pay also subtracts pre-tax deductions like 401(k) contributions and health premiums." },
      { question: "Why do economists track disposable income?", answer: "It drives consumer spending, the largest part of GDP." },
    ],
  },
  {
    slug: "fisher-equation-calculator",
    category: MACROECONOMICS,
    title: "Fisher Equation Calculator",
    description: "Use the Fisher equation to find the real interest rate, the nominal rate or the inflation rate from the other two — exactly and with the common approximation.",
    metaTitle: "Fisher Equation Calculator — Real vs Nominal Interest Rate",
    metaDescription: "Free Fisher equation calculator. Solve (1 + i) = (1 + r)(1 + π) for the real interest rate, nominal rate or inflation, with the r ≈ i − π approximation.",
    calcInputs: [dropdown("solveFor", "Solve For", [["Real interest rate", 1], ["Nominal interest rate", 2], ["Inflation rate", 3]], 1), percentField("nominalRate", "Nominal Interest Rate", { default: 5, min: -20, max: 200, step: 0.01, required: false }), percentField("realRate", "Real Interest Rate", { default: 2, min: -50, max: 100, step: 0.01, required: false }), percentField("inflation", "Inflation (expected)", { default: 3, min: -20, max: 500, step: 0.01, required: false })],
    calcResult: { label: "Result", format: "percentage" },
    calcResults: [{ key: "nominalRate", label: "Nominal Rate", format: "percentage", decimals: 4 }, { key: "realRate", label: "Real Rate", format: "percentage", decimals: 4, highlight: true }, { key: "inflation", label: "Inflation", format: "percentage", decimals: 4 }, { key: "approximation", label: "Approximation (i ≈ r + π)", format: "percentage", decimals: 4 }],
    instructions: "Pick what to solve for and enter the other two rates. The Fisher effect says nominal rates rise one-for-one with expected inflation, leaving the real rate unchanged.",
    examples: "Example: a 5% nominal rate with 3% inflation is a real rate of 1.9417% — slightly less than the 2% approximation.",
    assumptions: "Exact: (1 + i) = (1 + r)(1 + π); approximation i ≈ r + π works well for low rates. For an investment's real return after fees and taxes, use the Real Rate of Return Calculator. " + ECON_NOTE,
    faq: [
      { question: "What is the real interest rate?", answer: "The return in purchasing power — the nominal rate adjusted for inflation." },
      { question: "Can real rates be negative?", answer: "Yes, when inflation is above the nominal rate, as in 2021–2022." },
    ],
  },
  {
    slug: "gdp-deflator-calculator",
    category: MACROECONOMICS,
    title: "GDP Deflator Calculator",
    description: "Calculate the GDP deflator from nominal and real GDP, or real GDP from nominal GDP and the deflator, and the inflation rate between two years.",
    metaTitle: "GDP Deflator Calculator — Real GDP & Inflation",
    metaDescription: "Free GDP deflator calculator. Find the deflator (nominal ÷ real × 100), convert nominal to real GDP, and measure inflation between two deflators.",
    calcInputs: [dropdown("mode", "Calculate", [["GDP deflator from nominal and real GDP", 1], ["Real GDP from nominal GDP and deflator", 2]], 1), numberField("nominalGdp", "Nominal GDP ($ billions)", { default: 29200, max: 1000000000, step: 0.1 }), numberField("realGdp", "Real GDP ($ billions)", { default: 23500, max: 1000000000, step: 0.1, required: false }), numberField("deflator", "GDP Deflator (base year = 100)", { default: 0, max: 10000, step: 0.001, required: false }), numberField("priorDeflator", "Previous Year's Deflator (optional)", { default: 0, max: 10000, step: 0.001, required: false })],
    calcResult: { label: "GDP Deflator", format: "number" },
    calcResults: [num("gdpDeflator", "GDP Deflator", true), num("realGdp", "Real GDP ($ billions)"), pct("priceLevelChangeSinceBase", "Price Level Change since Base Year"), pct("inflationVsPrior", "Inflation vs Previous Year")],
    instructions: "Enter nominal GDP (current prices) and real GDP (base-year prices) to get the deflator, or switch modes to turn nominal GDP into real GDP with a known deflator.",
    examples: "Example: $29,200 billion of nominal GDP and $23,500 billion of real GDP give a deflator of 124.26 — prices are about 24% above the base year.",
    assumptions: "Deflator = nominal ÷ real × 100; real GDP = nominal ÷ deflator × 100. Unlike the CPI, the deflator covers everything produced domestically, including investment goods and government purchases. " + ECON_NOTE,
    faq: [
      { question: "GDP deflator or CPI?", answer: "The deflator covers all domestic output and changing spending patterns; the CPI tracks a fixed basket of consumer goods, including imports." },
      { question: "What is the US base year?", answer: "The BEA currently uses 2017 = 100 for chained-dollar real GDP." },
    ],
  },
  {
    slug: "gdp-gap-calculator",
    category: MACROECONOMICS,
    title: "GDP Gap Calculator",
    description: "Calculate the GDP (output) gap — the difference between actual and potential GDP — in dollars and percent, and whether it's recessionary or inflationary.",
    metaTitle: "GDP Gap Calculator — Output Gap",
    metaDescription: "Free GDP gap calculator. Compare actual GDP with potential GDP to find the output gap in dollars and percent and whether the economy is overheating.",
    calcInputs: [numberField("actualGdp", "Actual Real GDP", { default: 23000, max: 1000000000, step: 0.1 }), numberField("potentialGdp", "Potential Real GDP", { default: 23400, max: 1000000000, step: 0.1 })],
    calcResult: { label: "Output Gap", format: "percentage" },
    calcResults: [num("outputGap", "Output Gap"), pct("outputGapPct", "Output Gap (% of potential)", true), num("gapType", "Gap (1 Recessionary, 2 None, 3 Inflationary)")],
    instructions: "Enter actual real GDP and potential GDP (the CBO publishes US estimates). A negative gap means the economy is producing below capacity, usually with high unemployment.",
    examples: "Example: actual GDP of 23,000 against potential of 23,400 is a −400 gap, −1.71% — a recessionary gap.",
    assumptions: "Gap = (actual − potential) ÷ potential. Potential GDP can't be observed and estimates are revised. Okun's law links each 1% of gap to about ½ point of unemployment. " + ECON_NOTE,
    faq: [
      { question: "What causes a positive output gap?", answer: "Demand running ahead of capacity — it tends to push up wages and inflation." },
      { question: "How do policymakers close a recessionary gap?", answer: "With lower interest rates or fiscal stimulus to raise demand." },
    ],
  },
  {
    slug: "gini-coefficient-calculator",
    category: MACROECONOMICS,
    title: "Gini Coefficient Calculator",
    description: "Calculate the Gini coefficient of income inequality from up to 10 incomes or from the income shares of five quintiles (the Lorenz curve).",
    metaTitle: "Gini Coefficient Calculator — Income Inequality",
    metaDescription: "Free Gini coefficient calculator. Measure inequality from a list of incomes or quintile income shares, from 0 (perfect equality) to 1.",
    calcInputs: [dropdown("mode", "Data", [["Individual incomes (up to 10)", 1], ["Quintile income shares (%)", 2]], 1), ...Array.from({ length: 10 }, (_, i) => currencyField(`income${i + 1}`, `Income ${i + 1}`, { default: [20000, 35000, 50000, 70000, 125000, 0, 0, 0, 0, 0][i], max: 10000000000, step: 100, required: false })), ...Array.from({ length: 5 }, (_, i) => percentField(`quintile${i + 1}`, `Quintile ${i + 1} Share (${["lowest", "second", "middle", "fourth", "highest"][i]})`, { default: [3, 8, 14, 22, 53][i], step: 0.1, required: false }))],
    calcResult: { label: "Gini Coefficient", format: "number", decimals: 4 },
    calcResults: [num("gini", "Gini Coefficient", true, 4), num("giniIndex", "Gini Index (0–100)"), pct("topShare", "Share Held by the Top Entry / Quintile"), num("valuesUsed", "Values Used")],
    instructions: "Enter up to 10 incomes (a small group, a company's pay or a classroom example) or switch to quintiles and enter the share of total income each fifth of households receives.",
    examples: "Example: incomes of $20k, $35k, $50k, $70k and $125k have a Gini of 0.3267. US quintile shares of about 3%, 8%, 14%, 22% and 53% give about 0.46.",
    assumptions: "List mode: G = Σ|xᵢ − xⱼ| ÷ (2n²μ). Quintile mode: 1 − Σ (Xₖ − Xₖ₋₁)(Yₖ + Yₖ₋₁) from the Lorenz curve, which understates inequality within each fifth. US household Gini ≈ 0.48–0.49 (Census). " + ECON_NOTE,
    faq: [
      { question: "What is a high Gini coefficient?", answer: "Above about 0.4 is considered high; Nordic countries are near 0.25–0.28 after taxes and transfers." },
      { question: "What does a Gini of 0 or 1 mean?", answer: "0 is perfect equality (everyone has the same); 1 is perfect inequality (one person has everything)." },
    ],
  },
  {
    slug: "private-savings-calculator",
    category: MACROECONOMICS,
    title: "Private Savings Calculator",
    description: "Calculate private saving, public (government) saving and national saving from GDP, taxes, consumption, transfers and government spending.",
    metaTitle: "Private Savings Calculator — Public & National Saving",
    metaDescription: "Free private savings calculator. Find private saving (Y − T − C), public saving (T − G) and national saving for an economy.",
    calcInputs: [numberField("gdp", "GDP / Income (Y)", { default: 29000, max: 1000000000, step: 0.1 }), numberField("taxes", "Taxes (T)", { default: 5200, min: -1000000000, max: 1000000000, step: 0.1 }), numberField("consumption", "Consumption (C)", { default: 19800, max: 1000000000, step: 0.1 }), numberField("transfers", "Transfer Payments (TR, optional)", { default: 0, min: -1000000000, max: 1000000000, step: 0.1, required: false }), numberField("governmentSpending", "Government Purchases (G)", { default: 6600, max: 1000000000, step: 0.1 })],
    calcResult: { label: "Private Saving", format: "number" },
    calcResults: [num("privateSaving", "Private Saving (Y − T − C + TR)", true), num("publicSaving", "Public Saving (T − G − TR)"), num("nationalSaving", "National Saving"), pct("privateSavingRate", "Private Saving Rate (of disposable income)")],
    instructions: "Enter national income, taxes, consumption and government purchases in the same units ($ billions). If taxes are already net of transfers, leave transfers at 0.",
    examples: "Example: Y = 29,000, T = 5,200 and C = 19,800 give private saving of 4,000. With G = 6,600, public saving is −1,400 (a deficit), so national saving is 2,600.",
    assumptions: "In a closed economy national saving equals investment: S = I. In an open economy S = I + net exports. " + ECON_NOTE,
    faq: [
      { question: "Why does a budget deficit reduce national saving?", answer: "Public saving (T − G) is negative, offsetting part of what households and firms save." },
      { question: "Does private saving include business saving?", answer: "Yes — retained corporate profits are part of private saving." },
    ],
  },
  {
    slug: "tariff-calculator",
    category: MACROECONOMICS,
    title: "Tariff Calculator",
    description: "Calculate the import duty on goods from a tariff rate — including 2025–2026 Trump tariffs — the landed cost, and how much of the tariff shows up in the retail price.",
    metaTitle: "Tariff Calculator — Import Duty & Trump Tariff Impact",
    metaDescription: "Free tariff calculator. Work out duty owed, landed cost and the consumer price increase from a tariff rate, pass-through share and retail markup.",
    calcInputs: [currencyField("customsValue", "Customs Value of the Goods", { default: 10000, max: 10000000000, step: 1 }), percentField("tariffRate", "Tariff Rate (e.g. reciprocal / Section 232 / 301)", { default: 10, max: 500, step: 0.1 }), percentField("otherDutyRate", "Regular (MFN) Duty Rate", { default: 0, max: 100, step: 0.1, required: false }), currencyField("shippingInsurance", "Shipping & Insurance", { default: 800, max: 1000000000, step: 1, required: false }), currencyField("brokerFees", "Customs Broker & Other Fees", { default: 0, max: 100000000, step: 1, required: false }), percentField("passThroughPercent", "Share of Tariff Passed to Customers", { default: 100, step: 1 }), percentField("retailMarkup", "Retail Markup on Cost", { default: 50, max: 1000, step: 1 })],
    calcResult: { label: "Duty Owed", format: "currency" },
    calcResults: [cur("dutyOwed", "Duty Owed", true), cur("landedCost", "Landed Cost"), pct("landedCostIncrease", "Increase in Landed Cost"), cur("retailPriceBefore", "Retail Price Without Tariff"), cur("retailPriceAfter", "Retail Price With Tariff"), cur("consumerPriceIncrease", "Consumer Price Increase")],
    instructions: "Enter the customs (transaction) value and the tariff rates that apply to your product and country of origin — check the US HTS and current CBP guidance, as rates have changed often since 2025. Then choose how much of the cost you'll pass on and your markup.",
    examples: "Example: $10,000 of goods with a 10% tariff owe $1,000 of duty; with $800 of shipping the landed cost is $11,800. Passing it all on at a 50% markup raises the retail price from $16,200 to $17,700 — $1,500, more than the duty itself.",
    assumptions: "US duty is charged on the customs value (generally excluding international freight); some tariffs stack. Retailers who mark up on landed cost multiply the tariff's effect on shelf prices. Rates, exemptions and court rulings on IEEPA tariffs change frequently. " + DISCLAIMER,
    faq: [
      { question: "Who pays a tariff?", answer: "The US importer pays it to CBP; how much reaches consumers depends on how much the importer and foreign supplier absorb." },
      { question: "Is the tariff charged on shipping costs?", answer: "Generally not in the US — duty is based on the transaction value, usually excluding international freight and insurance." },
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
