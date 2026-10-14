// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// the finance sub-batch "Valuation & Time Value of Money". See
// src/lib/calc-engine-fin-valuation.ts for the full list of 5 sub-batches
// and the math. Each tool is filed in the Finance Calculators sub-category
// the user named for it (created on first run).
//
// HOW TO RUN
//   npx tsx prisma/create-fin-valuation-calculators.ts
// or
//   npm run db:create-fin-valuation-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const FINANCE_SLUGS = ["finance-calculators", "finance"];
const BUSINESS_RATIOS = { name: "Business & Financial Ratios", slug: "business-financial-ratios" };
const INVESTMENT_DEPRECIATION = { name: "Investment & Depreciation Calculators", slug: "investment-depreciation-calculators" };
const FINANCIAL = { name: "Financial Calculators", slug: "financial-calculators" };
const ADDITIONAL_FINANCIAL = { name: "Additional Financial Calculators", slug: "additional-financial-calculators" };

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

const cashFlowFields = (defaults: number[]) =>
  Array.from({ length: 10 }, (_, i) =>
    numberField(`cf${i + 1}`, `Cash Flow Year ${i + 1}`, { unit: "$", default: defaults[i] ?? 0, min: -1000000000, max: 1000000000, step: 100, required: false })
  );

const TOOLS: ToolDef[] = [
  {
    slug: "wacc-calculator",
    category: BUSINESS_RATIOS,
    title: "WACC Calculator",
    description: "Calculate a company's weighted average cost of capital (WACC) from the market value of equity, debt and preferred stock, their costs and the tax rate.",
    metaTitle: "WACC Calculator — Weighted Average Cost of Capital",
    metaDescription: "Free WACC calculator. Weight the cost of equity, after-tax cost of debt and preferred stock by market value to get the weighted average cost of capital.",
    calcInputs: [
      currencyField("equityValue", "Market Value of Equity", { default: 600000000, max: 10000000000000, step: 1000000 }),
      currencyField("debtValue", "Market Value of Debt", { default: 400000000, max: 10000000000000, step: 1000000 }),
      percentField("costOfEquity", "Cost of Equity", { default: 10, max: 100 }),
      percentField("costOfDebt", "Pre-Tax Cost of Debt", { default: 6, max: 100 }),
      percentField("taxRate", "Corporate Tax Rate", { default: 21 }),
      currencyField("preferredValue", "Market Value of Preferred Stock (optional)", { default: 0, max: 10000000000000, step: 1000000, required: false }),
      percentField("costOfPreferred", "Cost of Preferred Stock (optional)", { default: 0, required: false }),
    ],
    calcResult: { label: "WACC", format: "percentage" },
    calcResults: [cur("totalCapital", "Total Capital (V)"), pct("equityWeight", "Equity Weight (E/V)"), pct("debtWeight", "Debt Weight (D/V)"), pct("preferredWeight", "Preferred Weight (P/V)"), pct("afterTaxCostOfDebt", "After-Tax Cost of Debt"), pct("wacc", "WACC", true)],
    instructions:
      "Enter the market value of the company's equity (share price × shares outstanding) and debt, the cost of each, and the tax rate. Add preferred stock only if the company has it.\n\n" +
      "WACC is the average return the company must earn to satisfy all its investors, so it is the usual discount rate for a DCF valuation or for judging new projects.",
    examples: "Example: $600M of equity costing 10% and $400M of debt at 6% with a 21% tax rate. The after-tax cost of debt is 4.74%, so WACC = 60% × 10% + 40% × 4.74% = 7.90%.",
    assumptions: "WACC = E/V × Re + P/V × Rp + D/V × Rd × (1 − T). Market values are better than book values. Interest is assumed fully tax-deductible; the US federal corporate rate is 21% before state tax. " + DISCLAIMER,
    faq: [
      { question: "Why is debt cheaper than equity?", answer: "Lenders are paid first and interest is tax-deductible, so the after-tax cost of debt is almost always below the cost of equity." },
      { question: "What is a good WACC?", answer: "Lower is better. Large, stable companies are often around 6–9%; small or risky companies can be 12% or more." },
    ],
  },
  {
    slug: "cost-of-equity-calculator",
    category: BUSINESS_RATIOS,
    title: "Cost of Equity Calculator",
    description: "Calculate the cost of equity with the CAPM (risk-free rate, beta and market return) or the dividend growth model, and compare both.",
    metaTitle: "Cost of Equity Calculator — CAPM & Dividend Growth Model",
    metaDescription: "Free cost of equity calculator. Use CAPM (rf + β × market risk premium) or the Gordon dividend growth model to find shareholders' required return.",
    calcInputs: [
      dropdown("method", "Headline Method", [["CAPM", 1], ["Dividend growth model", 2]], 1),
      percentField("riskFreeRate", "Risk-Free Rate (e.g. 10-yr Treasury)", { default: 4.2, max: 30, step: 0.01 }),
      numberField("beta", "Beta (β)", { default: 1.2, min: -5, max: 5, step: 0.01 }),
      percentField("marketReturn", "Expected Market Return", { default: 10, max: 50, step: 0.1 }),
      currencyField("sharePrice", "Current Share Price", { default: 50, max: 1000000, step: 0.01 }),
      currencyField("annualDividend", "Current Annual Dividend per Share", { default: 2, max: 100000, step: 0.01 }),
      percentField("dividendGrowth", "Dividend Growth Rate", { default: 5, min: -50, max: 50, step: 0.1 }),
    ],
    calcResult: { label: "Cost of Equity", format: "percentage" },
    calcResults: [pct("marketRiskPremium", "Market Risk Premium"), pct("capmCostOfEquity", "Cost of Equity — CAPM"), cur("nextYearDividend", "Next Year's Dividend (D1)"), pct("ddmCostOfEquity", "Cost of Equity — Dividend Growth"), pct("costOfEquity", "Cost of Equity", true)],
    instructions:
      "For CAPM, enter the risk-free rate, the stock's beta and the expected market return. For the dividend growth model, enter the share price, this year's dividend and the dividend growth rate you expect to last.\n\n" +
      "Both answers are shown; pick the headline method you trust more. Many analysts average the two.",
    examples: "Example: risk-free 4.2%, beta 1.2, market 10% → CAPM = 4.2% + 1.2 × 5.8% = 11.16%. A $50 stock paying $2.00 that grows 5% a year gives $2.10 ÷ $50 + 5% = 9.20%.",
    assumptions: "CAPM: Re = rf + β(rm − rf). Gordon model: Re = D0(1 + g) ÷ P0 + g, which only suits steady dividend payers with growth below the cost of equity. " + DISCLAIMER,
    faq: [
      { question: "Which risk-free rate should I use?", answer: "Usually the 10-year government bond yield in the same currency as the company's cash flows." },
      { question: "Can I use the dividend model for a company that pays no dividend?", answer: "No — use CAPM instead." },
    ],
  },
  {
    slug: "beta-calculator",
    category: BUSINESS_RATIOS,
    title: "Beta Calculator",
    description: "Calculate a stock's beta against the market from paired period returns, plus alpha, correlation and R-squared.",
    metaTitle: "Beta Calculator — Stock Beta from Returns",
    metaDescription: "Free beta calculator. Enter up to 12 periods of stock and market returns to get beta (covariance ÷ variance), alpha, correlation and R².",
    calcInputs: [
      numberField("periods", "Number of Periods Used (2–12)", { default: 6, min: 2, max: 12 }),
      ...Array.from({ length: 12 }, (_, i) => [
        numberField(`stock${i + 1}`, `Stock Return, Period ${i + 1}`, { unit: "%", default: [2.5, -1.8, 3.9, 1.2, -0.6, 4.1][i] ?? 0, min: -100, max: 1000, step: 0.1, required: false }),
        numberField(`market${i + 1}`, `Market Return, Period ${i + 1}`, { unit: "%", default: [1.8, -1.2, 2.6, 0.9, -0.3, 2.8][i] ?? 0, min: -100, max: 1000, step: 0.1, required: false }),
      ]).flat(),
    ],
    calcResult: { label: "Beta", format: "number", decimals: 4 },
    calcResults: [num("beta", "Beta (β)", true, 4), num("alpha", "Alpha per Period (%)", false, 4), num("correlation", "Correlation", false, 4), pct("rSquared", "R-Squared"), pct("averageStockReturn", "Average Stock Return"), pct("averageMarketReturn", "Average Market Return")],
    instructions:
      "Enter matching period returns (for example monthly) for the stock and for a market index such as the S&P 500, then set how many periods you filled in. Use the same dates for both.\n\n" +
      "A beta of 1 moves with the market; above 1 swings more, below 1 swings less, and a negative beta tends to move against it.",
    examples: "Example: with the six default months the stock moved about 1.5 times as much as the market, so beta ≈ 1.49 and the correlation is very high (0.999).",
    assumptions: "Beta = covariance(stock, market) ÷ variance(market) using sample statistics; alpha = average stock return − β × average market return. Data providers usually use 36–60 monthly returns, so a few periods give only a rough estimate. " + DISCLAIMER,
    faq: [
      { question: "What does a beta of 1.5 mean?", answer: "When the market rises or falls 1%, the stock has tended to move about 1.5% in the same direction." },
      { question: "Why is my beta different from Yahoo Finance?", answer: "Sites use different time spans, return intervals and indexes. Use the same settings to compare." },
    ],
  },
  {
    slug: "earnings-per-share-calculator",
    category: INVESTMENT_DEPRECIATION,
    title: "Earnings Per Share Calculator",
    description: "Calculate basic and diluted earnings per share (EPS) from net income, preferred dividends and shares, plus the P/E ratio and earnings yield.",
    metaTitle: "Earnings Per Share Calculator — Basic & Diluted EPS",
    metaDescription: "Free EPS calculator. Get basic and diluted earnings per share from net income, preferred dividends and share count, plus P/E ratio and earnings yield.",
    calcInputs: [
      numberField("netIncome", "Net Income", { unit: "$", default: 5000000, min: -1000000000000, max: 1000000000000, step: 1000 }),
      currencyField("preferredDividends", "Preferred Dividends", { default: 200000, max: 1000000000000, step: 1000, required: false }),
      numberField("weightedShares", "Weighted Average Common Shares", { default: 2000000, max: 100000000000, step: 1000 }),
      numberField("dilutiveShares", "Dilutive Shares (options, convertibles)", { default: 0, max: 100000000000, step: 1000, required: false }),
      currencyField("sharePrice", "Share Price (optional, for P/E)", { default: 36, max: 1000000, step: 0.01, required: false }),
    ],
    calcResult: { label: "Basic EPS", format: "currency" },
    calcResults: [cur("earningsToCommon", "Earnings Available to Common"), cur("basicEps", "Basic EPS", true), cur("dilutedEps", "Diluted EPS"), num("peRatio", "P/E Ratio"), pct("earningsYield", "Earnings Yield")],
    instructions:
      "Enter net income for the period and any preferred dividends, then the weighted average number of common shares. Add dilutive shares (in-the-money options, warrants, convertibles) to see diluted EPS, and the share price for P/E.",
    examples: "Example: $5,000,000 net income, $200,000 preferred dividends and 2,000,000 shares give basic EPS of $2.40. At a $36 share price the P/E is 15 and the earnings yield is 6.67%.",
    assumptions: "Basic EPS = (net income − preferred dividends) ÷ weighted average shares. Diluted EPS adds dilutive shares to the denominator (a simplification of the treasury-stock method). " + DISCLAIMER,
    faq: [
      { question: "Why use the weighted average share count?", answer: "Shares outstanding change during the year through buybacks and issues; weighting matches shares to the time they were outstanding." },
      { question: "Is higher EPS always better?", answer: "Growth in EPS is good, but compare companies with P/E, because EPS depends on how many shares exist." },
    ],
  },
  {
    slug: "npv-calculator",
    category: INVESTMENT_DEPRECIATION,
    title: "NPV Calculator",
    description: "Calculate the net present value (NPV) of an investment from its upfront cost, a discount rate and up to 10 years of cash flows, plus the profitability index and discounted payback.",
    metaTitle: "NPV Calculator — Net Present Value of Cash Flows",
    metaDescription: "Free NPV calculator. Discount up to 10 years of cash flows to find net present value, profitability index and discounted payback period.",
    calcInputs: [percentField("discountRate", "Discount Rate", { default: 8, max: 100 }), currencyField("initialInvestment", "Initial Investment", { default: 50000, max: 10000000000, step: 100 }), ...cashFlowFields([12000, 14000, 15000, 15000, 12000])],
    calcResult: { label: "NPV", format: "currency" },
    calcResults: [cur("presentValueOfCashFlows", "Present Value of Cash Flows"), cur("npv", "Net Present Value (NPV)", true), num("profitabilityIndex", "Profitability Index"), num("discountedPaybackYears", "Discounted Payback (Years, 0 = never)"), num("accept", "Accept? (1 = NPV positive)")],
    instructions:
      "Enter the upfront cost, your required return (discount rate — often the WACC) and the net cash flow you expect each year. Leave unused years at 0; enter a negative number for a year with a net outflow.\n\n" +
      "A positive NPV means the project earns more than your required return.",
    examples: "Example: $50,000 invested at an 8% discount rate with inflows of $12,000, $14,000, $15,000, $15,000 and $12,000 has a present value of about $54,214 and an NPV of about $4,214 — worth doing.",
    assumptions: "NPV = −investment + Σ CFt ÷ (1 + r)^t, with cash flows at the end of each year. " + DISCLAIMER,
    faq: [
      { question: "What discount rate should I use?", answer: "Your cost of capital or the return you could get elsewhere at similar risk." },
      { question: "NPV or IRR?", answer: "NPV shows the dollar value added and is the safer rule when choosing between projects; IRR shows the rate of return." },
    ],
  },
  {
    slug: "discounted-cash-flow-calculator",
    category: INVESTMENT_DEPRECIATION,
    title: "Discounted Cash Flow Calculator",
    description: "Value a company with a DCF model — project free cash flow over 5 or 10 years, add a terminal value and get enterprise value, equity value and intrinsic value per share.",
    metaTitle: "DCF Calculator — Discounted Cash Flow Valuation",
    metaDescription: "Free discounted cash flow calculator. Project free cash flow, add a terminal value and find enterprise value, equity value and intrinsic value per share.",
    calcInputs: [
      numberField("freeCashFlow", "Current Free Cash Flow ($ millions)", { default: 100, min: -1000000, max: 1000000, step: 1 }),
      percentField("growth1to5", "FCF Growth, Years 1–5", { default: 10, min: -50, max: 100 }),
      percentField("growth6to10", "FCF Growth, Years 6–10", { default: 5, min: -50, max: 100 }),
      percentField("terminalGrowth", "Terminal Growth Rate", { default: 2.5, min: -5, max: 10 }),
      percentField("discountRate", "Discount Rate (WACC)", { default: 9, max: 50 }),
      dropdown("years", "Projection Period", [["10 years", 10], ["5 years", 5]], 10),
      numberField("netDebt", "Net Debt ($ millions; negative = net cash)", { default: 200, min: -1000000, max: 1000000, step: 1 }),
      numberField("sharesOutstanding", "Shares Outstanding (millions)", { default: 50, max: 1000000, step: 0.1 }),
      currencyField("currentPrice", "Current Share Price (optional)", { default: 38, max: 1000000, step: 0.01, required: false }),
    ],
    calcResult: { label: "Intrinsic Value per Share", format: "currency" },
    calcResults: [num("finalYearFcf", "Final-Year FCF ($M)"), num("pvOfProjectedFcf", "PV of Projected FCF ($M)"), num("terminalValue", "Terminal Value ($M)"), num("pvOfTerminalValue", "PV of Terminal Value ($M)"), num("enterpriseValue", "Enterprise Value ($M)"), num("equityValue", "Equity Value ($M)"), cur("valuePerShare", "Intrinsic Value per Share", true), pct("upsidePct", "Upside vs Current Price"), pct("terminalShareOfValue", "Terminal Value Share of EV")],
    instructions:
      "Enter the company's latest free cash flow (operating cash flow minus capital spending), the growth you expect in two stages, a long-run terminal growth rate (near inflation) and your discount rate.\n\n" +
      "Net debt is debt minus cash; it is subtracted from enterprise value to get the value that belongs to shareholders.",
    examples: "Example: $100M FCF growing 10% for 5 years and 5% for 5 more, a 2.5% terminal rate and 9% WACC give an enterprise value of about $2,352M. Less $200M net debt over 50M shares, that's about $43.03 a share — 13% above a $38 price.",
    assumptions: "Terminal value = final FCF × (1 + g) ÷ (WACC − g) (Gordon growth); cash flows are discounted from year-end. The terminal rate must be below the discount rate. Small input changes move the result a lot — test a range. " + DISCLAIMER,
    faq: [
      { question: "Why is most of the value in the terminal value?", answer: "Cash flows after the projection period continue forever; that is normal, but it makes the terminal growth and discount rate the key assumptions." },
      { question: "How is DCF different from NPV?", answer: "NPV checks a project's listed cash flows against its cost; a DCF valuation projects a business's cash flows forever to estimate what it is worth." },
    ],
  },
  {
    slug: "irr-calculator",
    category: ADDITIONAL_FINANCIAL,
    title: "IRR Calculator",
    description: "Calculate the internal rate of return (IRR) of an investment from its upfront cost and up to 10 years of cash flows, plus MIRR and the cash multiple.",
    metaTitle: "IRR Calculator — Internal Rate of Return & MIRR",
    metaDescription: "Free IRR calculator. Find the internal rate of return and modified IRR (MIRR) of an investment from its upfront cost and yearly cash flows.",
    calcInputs: [currencyField("initialInvestment", "Initial Investment", { default: 100000, max: 10000000000, step: 100 }), ...cashFlowFields([25000, 30000, 35000, 30000, 25000]), percentField("financeRate", "Finance Rate (for MIRR)", { default: 8, max: 100 }), percentField("reinvestRate", "Reinvestment Rate (for MIRR)", { default: 8, max: 100 })],
    calcResult: { label: "IRR", format: "percentage" },
    calcResults: [pct("irr", "Internal Rate of Return (IRR)", true), num("irrFound", "IRR Found (1 = yes)"), pct("mirr", "Modified IRR (MIRR)"), cur("totalCashReturned", "Total Cash Returned"), num("moneyMultiple", "Cash Multiple (×)"), num("periods", "Years Counted")],
    instructions:
      "Enter what you invest today and the net cash flow each year (negative if you put more money in). IRR is the yearly return at which the investment's NPV is exactly zero.\n\n" +
      "MIRR fixes IRR's assumption that cash is reinvested at the IRR itself: inflows are reinvested at your reinvestment rate and outflows are financed at your finance rate.",
    examples: "Example: $100,000 returning $25,000, $30,000, $35,000, $30,000 and $25,000 has an IRR of about 13.75% and an MIRR of about 11.2% at an 8% reinvestment rate. It returns 1.45× the money.",
    assumptions: "Year-end cash flows. When the cash flows change sign more than once there can be several IRRs; this tool reports the lowest one between −99% and 1,000%. " + DISCLAIMER,
    faq: [
      { question: "What is a good IRR?", answer: "One above your cost of capital or hurdle rate. Private equity often targets 15–25%." },
      { question: "Why does MIRR come out lower than IRR?", answer: "Reinvesting at a realistic rate rather than the IRR itself usually lowers the result for good projects." },
    ],
  },
  {
    slug: "future-value-of-annuity-calculator",
    category: INVESTMENT_DEPRECIATION,
    title: "Future Value of Annuity Calculator",
    description: "Calculate the future value of a series of equal payments (an ordinary annuity or annuity due), the interest earned and the annuity's present value.",
    metaTitle: "Future Value of Annuity Calculator — Ordinary & Due",
    metaDescription: "Free future value of annuity calculator. Find what equal regular payments grow to, for an ordinary annuity or annuity due, plus interest and present value.",
    calcInputs: [
      currencyField("payment", "Payment per Period", { default: 500, max: 10000000, step: 10 }),
      percentField("annualRate", "Annual Interest Rate", { default: 7, max: 50 }),
      numberField("years", "Years", { default: 20, max: 100, step: 1 }),
      dropdown("paymentsPerYear", "Payment Frequency", [["Monthly", 12], ["Quarterly", 4], ["Semi-annually", 2], ["Annually", 1], ["Bi-weekly", 26], ["Weekly", 52]], 12),
      dropdown("annuityType", "Payment Timing", [["End of period (ordinary annuity)", 1], ["Start of period (annuity due)", 2]], 1),
    ],
    calcResult: { label: "Future Value", format: "currency" },
    calcResults: [cur("futureValue", "Future Value", true), cur("totalPayments", "Total Payments"), cur("interestEarned", "Interest Earned"), cur("presentValue", "Present Value of the Annuity"), num("numberOfPayments", "Number of Payments")],
    instructions: "Enter the regular payment, the annual interest rate, how many years and how often you pay. Choose annuity due if each payment is made at the start of the period (like rent or many savings plans).",
    examples: "Example: $500 a month for 20 years at 7% grows to about $260,463 — $120,000 paid in and $140,463 of interest. The same stream is worth $64,491 today.",
    assumptions: "FV = P × ((1 + i)^n − 1) ÷ i, multiplied by (1 + i) for an annuity due, where i is the annual rate ÷ payments per year (interest compounds as often as you pay). " + DISCLAIMER,
    faq: [
      { question: "What's the difference between an ordinary annuity and an annuity due?", answer: "An annuity due pays at the start of each period, so every payment earns one extra period of interest." },
      { question: "How is this different from a future value calculator?", answer: "A future value calculator grows one lump sum; this one grows a series of equal payments." },
    ],
  },
  {
    slug: "finance-calculator",
    category: FINANCIAL,
    title: "Finance Calculator",
    description: "A time-value-of-money (TVM) finance calculator: solve for future value, present value, payment, number of years or interest rate for savings or loans.",
    metaTitle: "Finance Calculator — TVM Solver (FV, PV, PMT, N, I/Y)",
    metaDescription: "Free finance calculator. Solve any time value of money problem — future value, present value, payment, years or interest rate — for savings or loans.",
    calcInputs: [
      dropdown("solveFor", "Solve For", [["Future value (FV)", 1], ["Present value (PV)", 2], ["Payment (PMT)", 3], ["Number of years (N)", 4], ["Interest rate (I/Y)", 5]], 1),
      dropdown("mode", "Type", [["Saving / investing (payments add)", 1], ["Borrowing / loan (payments reduce balance)", 2]], 1),
      currencyField("presentValue", "Present Value (starting amount or loan)", { default: 10000, max: 1000000000, step: 100, required: false }),
      currencyField("payment", "Payment per Period", { default: 200, max: 100000000, step: 10, required: false }),
      currencyField("futureValue", "Future Value (target or ending balance)", { default: 0, max: 1000000000, step: 100, required: false }),
      percentField("annualRate", "Annual Interest Rate", { default: 6, max: 100, step: 0.01, required: false }),
      numberField("years", "Number of Years", { default: 10, max: 100, step: 0.5, required: false }),
      dropdown("periodsPerYear", "Payments & Compounding per Year", [["Monthly", 12], ["Quarterly", 4], ["Semi-annually", 2], ["Annually", 1], ["Bi-weekly", 26], ["Weekly", 52]], 12),
      dropdown("timing", "Payment Timing", [["End of period", 1], ["Start of period", 2]], 1),
    ],
    calcResult: { label: "Answer", format: "number" },
    calcResults: [num("solvedValue", "Answer (the value you solved for)", true), num("found", "Solution Found (1 = yes)"), cur("futureValue", "Future Value"), cur("presentValue", "Present Value"), cur("payment", "Payment per Period"), num("years", "Years"), pct("annualRate", "Annual Interest Rate"), cur("totalPayments", "Total Payments"), cur("totalInterest", "Total Interest")],
    instructions:
      "Pick what to solve for, then fill in the other four values — the field you solve for is ignored. Choose Saving for deposits that grow a balance, or Borrowing for a loan you pay down (set Future Value to 0 to pay it off completely).\n\n" +
      "This works like the TVM keys on a financial calculator (N, I/Y, PV, PMT, FV), without having to type amounts as negative numbers.",
    examples: "Example: $10,000 plus $200 a month at 6% for 10 years grows to $50,969.84. Borrowing $25,000 at 6% over 5 years, solve for payment: $483.32 a month.",
    assumptions: "FV = PV(1 + i)^n ± PMT × ((1 + i)^n − 1) ÷ i (× (1 + i) for start-of-period payments), with i = annual rate ÷ periods per year. N and I/Y are solved numerically. " + DISCLAIMER,
    faq: [
      { question: "What is the time value of money?", answer: "Money today is worth more than the same amount later because it can earn interest in the meantime." },
      { question: "Why does it say no solution was found?", answer: "The inputs can't meet — for example, a loan payment smaller than the monthly interest never pays off the balance." },
    ],
  },
  {
    slug: "opportunity-cost-calculator",
    category: BUSINESS_RATIOS,
    title: "Opportunity Cost Calculator",
    description: "Calculate the opportunity cost of a decision — the return of the best alternative you give up — from dollar returns or from two rates of return over time.",
    metaTitle: "Opportunity Cost Calculator — Cost of the Option Forgone",
    metaDescription: "Free opportunity cost calculator. Compare the option you chose with the best alternative and see the value you give up, in dollars and percent.",
    calcInputs: [
      dropdown("mode", "Compare By", [["Expected dollar returns", 1], ["Rates of return over time", 2]], 1),
      numberField("chosenReturn", "Return of the Chosen Option", { unit: "$", default: 50000, min: -1000000000, max: 1000000000, step: 100, required: false }),
      numberField("alternativeReturn", "Return of the Best Alternative", { unit: "$", default: 65000, min: -1000000000, max: 1000000000, step: 100, required: false }),
      currencyField("amount", "Amount Invested (rate mode)", { default: 10000, max: 1000000000, step: 100, required: false }),
      percentField("chosenRate", "Chosen Option's Annual Return (rate mode)", { default: 4, min: -50, max: 100, required: false }),
      percentField("alternativeRate", "Alternative's Annual Return (rate mode)", { default: 8, min: -50, max: 100, required: false }),
      numberField("years", "Years (rate mode)", { default: 10, max: 100, required: false }),
    ],
    calcResult: { label: "Opportunity Cost", format: "currency" },
    calcResults: [cur("chosenValue", "Chosen Option's Value"), cur("alternativeValue", "Best Alternative's Value"), cur("opportunityCost", "Opportunity Cost", true), pct("opportunityCostPct", "Opportunity Cost (%)"), num("betterChoice", "Better Choice (1 = chosen, 2 = alternative)")],
    instructions:
      "Opportunity cost is what you give up by choosing one option over the next best one. Enter the expected return of each option in dollars — or, in rate mode, an amount, two annual returns and the number of years.\n\n" +
      "A positive opportunity cost means the alternative would have paid more; a negative one means your choice was the better option.",
    examples: "Example: a project expected to earn $50,000 instead of one earning $65,000 has an opportunity cost of $15,000 (30%). In rate mode, $10,000 at 4% instead of 8% for 10 years gives up $6,786.",
    assumptions: "Opportunity cost = return of best alternative − return of chosen option. Compare options of similar risk; returns are compounded yearly in rate mode. To weigh a purchase against investing the money, use the Opportunity Cost of a Purchase Calculator. " + DISCLAIMER,
    faq: [
      { question: "Is opportunity cost a real cost?", answer: "It isn't paid in cash, but economists count it because it is value you give up — it's an implicit cost." },
      { question: "What is the opportunity cost of going to college?", answer: "Tuition plus the wages you could have earned working instead." },
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
