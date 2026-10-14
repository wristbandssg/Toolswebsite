// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// finance expansion 3 sub-batch "derivatives-tax". See
// src/lib/calc-engine-fin3-derivatives-tax.ts for the full list of 10
// sub-batches, and src/lib/calc-engine-fin3-derivatives-tax.ts for the math. Each tool
// is filed in the Finance Calculators sub-category the user named for it
// (created on first run; Retirement Calculators already exists).
//
// HOW TO RUN
//   npx tsx prisma/create-fin3-derivatives-tax-calculators.ts
// or
//   npm run db:create-fin3-derivatives-tax-calculators

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
const STOCK_OPTIONS_CATEGORY = { name: "Stock & Options Calculators", slug: "stock-options-calculators" };
const BOND_FIXED_INCOME_CATEGORY = { name: "Bond & Fixed Income Calculators", slug: "bond-fixed-income-calculators" };
const TAX_CATEGORY = { name: "Tax Calculators", slug: "tax-calculators" };
const CANADA_TAX_SALARY_CATEGORY = { name: "Canada Tax & Salary Calculators", slug: "canada-tax-salary-calculators" };
const SALARY_INCOME_CATEGORY = { name: "Salary & Income Calculators", slug: "salary-income-calculators" };

const FILING = (def: number) => dropdown("filingStatus", "Filing Status", [["Single", 1], ["Married filing jointly", 2], ["Head of household", 3], ["Married filing separately", 4]], def);

const TOOLS: ToolDef[] = [
  {
    slug: "black-scholes-calculator",
    category: STOCK_OPTIONS_CATEGORY,
    title: "Black Scholes Calculator",
    description: "Price European call and put options with the Black-Scholes model, and get the Greeks — delta, gamma, vega, theta and rho.",
    metaTitle: "Black Scholes Calculator — Option Price & Greeks",
    metaDescription: "Free Black-Scholes calculator. Price European calls and puts from stock price, strike, time, volatility and rates, with delta, gamma, vega, theta and rho.",
    calcInputs: [currencyField("stockPrice", "Stock Price (S)", { default: 100, max: 10000000, step: 0.01 }), currencyField("strikePrice", "Strike Price (K)", { default: 105, max: 10000000, step: 0.01 }), numberField("daysToExpiry", "Days to Expiration", { default: 90, min: 1, max: 3650 }), percentField("volatility", "Implied Volatility (annual)", { default: 25, max: 500, step: 0.1 }), percentField("riskFreeRate", "Risk-Free Rate", { default: 4, min: -5, max: 30, step: 0.01 }), percentField("dividendYield", "Dividend Yield", { default: 0, max: 30, step: 0.01, required: false })],
    calcResult: { label: "Call Price", format: "currency" },
    calcResults: [cur("callPrice", "Call Option Price", true), cur("putPrice", "Put Option Price"), num("callDelta", "Call Delta", false, 4), num("putDelta", "Put Delta", false, 4), num("gamma", "Gamma", false, 4), num("vegaPerPoint", "Vega (per 1 vol point)", false, 4), num("callThetaPerDay", "Call Theta (per day)", false, 4), num("callRhoPerPoint", "Call Rho (per 1% rate)", false, 4), num("d1", "d1", false, 4), num("d2", "d2", false, 4)],
    instructions: "Enter the stock price, strike, days until expiry, implied volatility and the risk-free rate (a Treasury bill yield for the same term). Add the dividend yield for dividend-paying stocks.\n\nThe Greeks show how the price changes: delta per $1 move in the stock, vega per 1 point of volatility, theta per calendar day.",
    examples: "Example: a $100 stock, $105 strike, 90 days, 25% volatility and a 4% risk-free rate give a call worth $3.31 and a put worth $7.28. The call's delta is 0.40, so it gains about 40 cents per $1 rise in the stock.",
    assumptions: "Black-Scholes-Merton for European options: constant volatility and rates, lognormal prices, continuous dividend yield, no transaction costs. American options that may be exercised early (especially puts and calls before dividends) can be worth more. " + DISCLAIMER,
    faq: [
      { question: "Can I use Black-Scholes for American options?", answer: "It's a close approximation for American calls on non-dividend stocks; for puts and dividend payers use a binomial model." },
      { question: "Where do I get implied volatility?", answer: "From your broker's option chain — it's the volatility that makes the model match the market price." },
    ],
  },
  {
    slug: "forward-rate-calculator",
    category: BOND_FIXED_INCOME_CATEGORY,
    title: "Forward Rate Calculator",
    description: "Calculate the implied forward interest rate between two future dates from today's spot rates — the rate the yield curve locks in for a future period.",
    metaTitle: "Forward Rate Calculator — Implied Forward Interest Rate",
    metaDescription: "Free forward rate calculator. Find the implied forward rate between two maturities from spot rates, with annual and continuous compounding.",
    calcInputs: [percentField("shortRate", "Spot Rate — Shorter Maturity", { default: 4, min: -5, max: 50, step: 0.01 }), numberField("shortYears", "Shorter Maturity (years)", { default: 1, min: 0, max: 50, step: 0.25 }), percentField("longRate", "Spot Rate — Longer Maturity", { default: 4.5, min: -5, max: 50, step: 0.01 }), numberField("longYears", "Longer Maturity (years)", { default: 2, min: 0.25, max: 100, step: 0.25 })],
    calcResult: { label: "Forward Rate", format: "percentage" },
    calcResults: [{ key: "forwardRate", label: "Implied Forward Rate (annual compounding)", format: "percentage", decimals: 4, highlight: true }, { key: "continuousForwardRate", label: "Forward Rate (continuous compounding)", format: "percentage", decimals: 4 }, num("forwardPeriodYears", "Forward Period (years)")],
    instructions: "Enter the spot rate (zero-coupon yield) for a shorter and a longer maturity. The forward rate is the rate for the period between them that makes investing short and rolling over equal to investing long.",
    examples: "Example: a 1-year rate of 4% and a 2-year rate of 4.5% imply a 1-year rate one year from now of about 5.00%: 1.045² ÷ 1.04 = 1.0500.",
    assumptions: "Forward = ((1 + r₂)^t₂ ÷ (1 + r₁)^t₁)^(1 ÷ (t₂ − t₁)) − 1. Uses zero-coupon (spot) rates; par yields need bootstrapping first. The expectations theory says forwards predict future rates, but in practice they include a term premium. " + DISCLAIMER,
    faq: [
      { question: "What does an upward-sloping curve imply?", answer: "Forward rates above today's spot rates — the market prices higher short rates later or a term premium." },
      { question: "What is a forward rate agreement?", answer: "A contract that locks in an interest rate for a future period, priced off these forward rates." },
    ],
  },
  {
    slug: "options-spread-calculator",
    category: STOCK_OPTIONS_CATEGORY,
    title: "Options Spread Calculator",
    description: "Calculate the max profit, max loss, breakeven and P/L of a vertical options spread — bull call, bear put, bull put or bear call.",
    metaTitle: "Options Spread Calculator — Vertical Spread P/L",
    metaDescription: "Free options spread calculator. Net debit or credit, max profit, max loss, breakeven and P/L at expiry for bull call, bear put, bull put and bear call spreads.",
    calcInputs: [dropdown("spreadType", "Spread", [["Bull call spread (debit)", 1], ["Bear put spread (debit)", 2], ["Bull put spread (credit)", 3], ["Bear call spread (credit)", 4]], 1), currencyField("lowerStrike", "Lower Strike", { default: 100, max: 10000000, step: 0.5 }), currencyField("higherStrike", "Higher Strike", { default: 110, max: 10000000, step: 0.5 }), currencyField("lowerPremium", "Premium of Lower-Strike Option", { default: 6, max: 1000000, step: 0.01 }), currencyField("higherPremium", "Premium of Higher-Strike Option", { default: 2.5, max: 1000000, step: 0.01 }), numberField("contracts", "Contracts (100 shares each)", { default: 1, min: 1, max: 100000 }), currencyField("priceAtExpiry", "Stock Price at Expiration", { default: 108, max: 10000000, step: 0.01 })],
    calcResult: { label: "Max Profit", format: "currency" },
    calcResults: [cur("netPremium", "Net Debit (+) / Credit (−)"), cur("maxProfit", "Maximum Profit", true), cur("maxLoss", "Maximum Loss"), cur("breakeven", "Breakeven Price"), cur("profitAtExpiry", "Profit / Loss at That Price"), num("riskRewardRatio", "Risk ÷ Reward")],
    instructions: "Choose the spread, then enter both strikes and each option's premium (call premiums for call spreads, put premiums for put spreads). Debit spreads pay to open; credit spreads collect premium and risk the width minus the credit.",
    examples: "Example: buying the $100 call for $6.00 and selling the $110 call for $2.50 costs $350. Max profit is $650, max loss $350, and breakeven $103.50; at $108 at expiry the spread makes $450.",
    assumptions: "Both options share the same expiry and are held to expiration; commissions and early assignment aren't included. " + DISCLAIMER,
    faq: [
      { question: "Why trade a spread instead of a single option?", answer: "Selling the second option cuts the cost and the break-even, in exchange for capping the profit." },
      { question: "Debit or credit spread?", answer: "Debit spreads profit from a move in your direction; credit spreads profit as long as the price stays on the right side of the short strike." },
    ],
  },
  {
    slug: "put-call-parity-calculator",
    category: STOCK_OPTIONS_CATEGORY,
    title: "Put-Call Parity Calculator",
    description: "Check put-call parity for European options — the implied call and put prices from the stock, strike, rate and time — and spot any mispricing.",
    metaTitle: "Put-Call Parity Calculator — Implied Call & Put Prices",
    metaDescription: "Free put-call parity calculator. Use C + K·e^(−rT) = P + S to find the implied call or put price and whether the quoted options are mispriced.",
    calcInputs: [currencyField("stockPrice", "Stock Price (S)", { default: 50, max: 10000000, step: 0.01 }), currencyField("strikePrice", "Strike Price (K)", { default: 50, max: 10000000, step: 0.01 }), numberField("daysToExpiry", "Days to Expiration", { default: 180, min: 1, max: 3650 }), percentField("riskFreeRate", "Risk-Free Rate", { default: 4, min: -5, max: 30, step: 0.01 }), percentField("dividendYield", "Dividend Yield", { default: 0, max: 30, step: 0.01, required: false }), currencyField("callPrice", "Quoted Call Price", { default: 4.2, max: 1000000, step: 0.01 }), currencyField("putPrice", "Quoted Put Price", { default: 3.5, max: 1000000, step: 0.01 })],
    calcResult: { label: "Parity Gap", format: "currency" },
    calcResults: [cur("presentValueOfStrike", "Present Value of Strike"), cur("impliedCallPrice", "Implied Call (from the put)"), cur("impliedPutPrice", "Implied Put (from the call)"), cur("parityGap", "Parity Gap (C + PV(K) − P − S)", true), num("mispricing", "Mispricing (0 None, 1 Call rich, 2 Put rich)")],
    instructions: "Enter the stock price, strike, days to expiry, risk-free rate and the market prices of a call and put with the same strike and expiry. A gap away from zero suggests one side is mispriced (before costs).",
    examples: "Example: with the stock and strike at $50, 180 days and 4%, the strike is worth $49.02 today. A $4.20 call implies a $3.22 put, so a $3.50 put is about 28 cents rich.",
    assumptions: "C + K·e^(−rT) = P + S·e^(−qT) holds exactly for European options with no arbitrage. Bid-ask spreads, borrowing costs and early exercise on American options create a band where no arbitrage is possible. " + DISCLAIMER,
    faq: [
      { question: "What is put-call parity used for?", answer: "To check option prices, build synthetic positions (stock = call − put + bond) and find arbitrage." },
      { question: "Does it work for American options?", answer: "Only approximately — early exercise turns the equation into a range rather than an equality." },
    ],
  },
  {
    slug: "amt-calculator",
    category: TAX_CATEGORY,
    title: "AMT Calculator",
    description: "Estimate the 2026 alternative minimum tax (AMT) — AMTI, exemption and phase-out, tentative minimum tax — and whether you owe AMT on top of regular tax, including from ISO exercises.",
    metaTitle: "AMT Calculator 2026 — Alternative Minimum Tax",
    metaDescription: "Free 2026 AMT calculator. Add back the standard deduction, SALT and ISO bargain element to find AMTI, the exemption and whether you owe alternative minimum tax.",
    calcInputs: [FILING(1), currencyField("taxableIncome", "Regular Taxable Income", { default: 250000, max: 100000000, step: 100 }), dropdown("tookStandardDeduction", "Did You Take the Standard Deduction?", [["No (itemized)", 2], ["Yes", 1]], 2), currencyField("saltDeduction", "State & Local Taxes Deducted (if itemizing)", { default: 0, max: 10000000, step: 100, required: false }), currencyField("isoBargainElement", "ISO Bargain Element (exercised & held)", { default: 120000, max: 100000000, step: 100, required: false }), currencyField("privateActivityBondInterest", "Private Activity Bond Interest", { default: 0, max: 10000000, step: 10, required: false }), numberField("otherAdjustments", "Other AMT Adjustments", { unit: "$", default: 0, min: -100000000, max: 100000000, step: 100, required: false })],
    calcResult: { label: "AMT Owed", format: "currency" },
    calcResults: [cur("amti", "Alternative Minimum Taxable Income"), cur("exemption", "AMT Exemption (after phase-out)"), cur("amtBase", "AMT Base"), cur("tentativeMinimumTax", "Tentative Minimum Tax"), cur("regularTax", "Regular Income Tax"), cur("amtOwed", "AMT Owed", true), cur("totalTax", "Total Federal Income Tax")],
    instructions: "Enter your regular taxable income and the items AMT adds back — most often state and local taxes for itemizers and the spread on incentive stock options you exercised and kept past year-end. You pay AMT only when tentative minimum tax is higher than regular tax.",
    examples: "Example: a single filer with $250,000 of taxable income who exercises ISOs with a $120,000 spread has AMTI of $370,000. After the $90,100 exemption, tentative minimum tax is $73,482 against $56,456 of regular tax — $17,026 of AMT.",
    assumptions: "2026 (Rev. Proc. 2025-32 / OBBBA): exemption $90,100 single & HoH, $140,200 joint, $70,100 separate; phase-out 50¢ per $1 over $500,000 ($1,000,000 joint); 26% up to $244,500 of AMT base ($122,250 MFS), 28% above. Regular tax uses 2026 ordinary brackets; capital gains rates and the AMT credit carryforward aren't modelled. " + DISCLAIMER,
    faq: [
      { question: "Who pays AMT in 2026?", answer: "Mainly people with large ISO exercises, very high SALT deductions or big private activity bond interest; the higher exemption keeps most others out." },
      { question: "Do I get AMT back later?", answer: "AMT from timing items like ISOs creates a minimum tax credit you can use in later years when regular tax is higher." },
    ],
  },
  {
    slug: "child-tax-credit-calculator",
    category: TAX_CATEGORY,
    title: "Child Tax Credit Calculator",
    description: "Calculate your 2026 Child Tax Credit — $2,200 per qualifying child, the refundable additional child tax credit up to $1,700, the $500 credit for other dependents and the income phase-out.",
    metaTitle: "Child Tax Credit Calculator 2026 — CTC & Refundable ACTC",
    metaDescription: "Free 2026 child tax credit calculator. $2,200 per child, the refundable ACTC up to $1,700, the $500 other-dependent credit and the phase-out above $200k/$400k.",
    calcInputs: [FILING(2), numberField("qualifyingChildren", "Children Under 17 (with SSN)", { default: 2, max: 20 }), numberField("otherDependents", "Other Dependents", { default: 0, max: 20, required: false }), currencyField("agi", "Adjusted Gross Income", { default: 90000, max: 100000000, step: 100 }), currencyField("earnedIncome", "Earned Income", { default: 90000, max: 100000000, step: 100 }), currencyField("taxBeforeCredits", "Income Tax Before Credits", { default: 6000, max: 100000000, step: 10 })],
    calcResult: { label: "Total Benefit", format: "currency" },
    calcResults: [cur("creditBeforePhaseOut", "Credit Before Phase-Out"), cur("phaseOutReduction", "Phase-Out Reduction"), cur("totalCreditAllowed", "Credit Allowed"), cur("nonrefundableUsed", "Used Against Your Tax"), cur("refundableActc", "Refundable (Additional Child Tax Credit)"), cur("totalBenefit", "Total Benefit", true)],
    instructions: "Enter qualifying children (under 17 at year-end with a Social Security number), other dependents, your AGI, earned income and income tax before credits. Credit beyond your tax can be refunded up to $1,700 per child.",
    examples: "Example: a married couple with two children and $90,000 AGI gets $4,400. With $6,000 of tax before credits, all $4,400 reduces their tax. With only $2,000 of tax, $2,000 would offset tax and $2,400 would be refunded.",
    assumptions: "2026 rules (OBBBA, inflation-indexed): $2,200 per child; refundable ACTC up to $1,700 per child, limited to 15% of earned income above $2,500; $500 for other dependents (not refundable); reduced $50 per $1,000 of modified AGI above $200,000 ($400,000 joint). At least one parent needs an SSN. " + DISCLAIMER,
    faq: [
      { question: "Is the child tax credit $2,200 in 2026?", answer: "Yes — the One Big Beautiful Bill Act set it at $2,200 from 2025 and indexes it for inflation after that." },
      { question: "Can I get the credit with no tax owed?", answer: "Partly — the refundable portion is paid out based on 15% of earned income over $2,500, up to $1,700 per child." },
    ],
  },
  {
    slug: "magi-calculator",
    category: TAX_CATEGORY,
    title: "MAGI Calculator",
    description: "Calculate your modified adjusted gross income (MAGI) for Roth IRA eligibility, ACA health-insurance subsidies or Medicare IRMAA, and how much you can put in a Roth IRA in 2026.",
    metaTitle: "MAGI Calculator 2026 — Roth IRA, ACA & IRMAA",
    metaDescription: "Free MAGI calculator. Add back the right items to your AGI for Roth IRA limits, ACA premium tax credits or Medicare IRMAA, and see your 2026 Roth contribution.",
    calcInputs: [dropdown("purpose", "MAGI For", [["Roth IRA eligibility", 1], ["ACA premium tax credit", 2], ["Medicare IRMAA", 3]], 1), dropdown("filingStatus", "Filing Status", [["Single / head of household", 1], ["Married filing jointly", 2]], 1), currencyField("agi", "Adjusted Gross Income (Form 1040 line 11)", { default: 150000, max: 100000000, step: 100 }), currencyField("taxExemptInterest", "Tax-Exempt Interest", { default: 0, max: 100000000, step: 10, required: false }), currencyField("foreignIncomeExcluded", "Excluded Foreign Earned Income", { default: 0, max: 100000000, step: 100, required: false }), currencyField("untaxedSocialSecurity", "Non-Taxable Social Security (ACA)", { default: 0, max: 1000000, step: 10, required: false }), currencyField("iraDeduction", "Traditional IRA Deduction (Roth)", { default: 0, max: 100000, step: 10, required: false }), currencyField("studentLoanInterest", "Student Loan Interest Deducted (Roth)", { default: 0, max: 2500, step: 10, required: false }), currencyField("rothConversionIncome", "Roth Conversion Income Included in AGI", { default: 0, max: 100000000, step: 100, required: false }), currencyField("contributionLimit", "Your Roth IRA Limit", { default: 7500, max: 100000, step: 100, required: false })],
    calcResult: { label: "MAGI", format: "currency" },
    calcResults: [cur("magi", "Modified AGI", true), cur("addBacks", "Total Added Back"), pct("rothAllowedPct", "Roth Contribution Allowed (%)"), cur("rothAllowedContribution", "Allowed Roth Contribution")],
    instructions: "Choose what the MAGI is for — each program adds back different items — then enter your AGI and the items that apply. For Roth IRAs, conversion income is excluded from MAGI.",
    examples: "Example: a single filer with $150,000 AGI and no add-backs has a Roth MAGI of $150,000 — below the $153,000 phase-out start, so the full $7,500 can go into a Roth IRA. At $160,500 only half ($3,750) would be allowed.",
    assumptions: "2026 Roth IRA phase-out: $153,000–$168,000 single/HoH, $242,000–$252,000 joint; the reduced limit is rounded up to $10. IRA limit $7,500 ($8,600 at 50+). ACA MAGI = AGI + tax-exempt interest + non-taxable Social Security + excluded foreign income. IRMAA uses MAGI from two years earlier. " + DISCLAIMER,
    faq: [
      { question: "Is MAGI the same as AGI?", answer: "Often nearly — but each program adds back specific items, so your MAGI can differ for Roth, ACA and Medicare." },
      { question: "What if my MAGI is too high for a Roth IRA?", answer: "You can make a non-deductible traditional IRA contribution and convert it (a \"backdoor Roth\")." },
    ],
  },
  {
    slug: "lottery-tax-calculator",
    category: TAX_CATEGORY,
    title: "Lottery Tax Calculator",
    description: "Calculate the federal and state tax on lottery or gambling winnings — the 24% withholding, the actual tax at your 2026 bracket, any extra owed and your take-home.",
    metaTitle: "Lottery Tax Calculator — Taxes on Winnings (2026)",
    metaDescription: "Free lottery tax calculator. See the 24% federal withholding, the real 2026 bracket tax on your winnings, state tax and how much you keep.",
    calcInputs: [currencyField("prize", "Prize / Winnings", { default: 100000, max: 10000000000, step: 100 }), currencyField("otherTaxableIncome", "Your Other Taxable Income", { default: 60000, max: 100000000, step: 100 }), FILING(1), percentField("stateTaxRate", "State Tax Rate on Winnings", { default: 5, max: 15, step: 0.01 })],
    calcResult: { label: "Take-Home", format: "currency" },
    calcResults: [cur("federalWithholding", "Federal Withholding (24%)"), cur("federalTax", "Actual Federal Tax"), cur("additionalFederalOwed", "Extra Owed at Filing (− = refund)"), cur("stateTax", "State Tax"), cur("totalTax", "Total Tax"), cur("takeHome", "Take-Home", true), pct("effectiveTaxRate", "Effective Tax Rate")],
    instructions: "Enter the prize and your other taxable income for the year (after deductions). The lottery withholds 24% for federal tax on prizes over $5,000, but your real tax depends on your bracket — big prizes are mostly taxed at 35–37%.",
    examples: "Example: a single filer with $60,000 of other income wins $100,000. The lottery withholds $24,000, but the actual federal tax is $23,086 — a $914 refund at filing. With 5% state tax, take-home is $71,914.",
    assumptions: "2026 federal brackets; the prize is added on top of other taxable income. States range from 0% (e.g. California and Florida don't tax lottery prizes) to about 11%; some cities also tax them. Gambling losses are deductible only if you itemize, and from 2026 only up to 90% of losses. " + DISCLAIMER,
    faq: [
      { question: "Why do I owe more than the 24% withheld?", answer: "Withholding is a flat 24%, but large prizes push income into the 32–37% brackets." },
      { question: "Which states don't tax lottery winnings?", answer: "California, Delaware, Florida, New Hampshire, South Dakota, Tennessee, Texas, Washington and Wyoming, among others." },
    ],
  },
  {
    slug: "gst-qst-calculator",
    category: CANADA_TAX_SALARY_CATEGORY,
    title: "GST/QST Calculator",
    description: "Add or remove Québec sales taxes — 5% federal GST and 9.975% QST (14.975% combined) — from any price.",
    metaTitle: "GST/QST Calculator — Québec Sales Tax 14.975%",
    metaDescription: "Free GST/QST calculator for Québec. Add 5% GST and 9.975% QST to a price, or extract both taxes from a tax-included total.",
    calcInputs: [{ key: "amount", label: "Amount", type: "currency", unit: "CAD", required: true, default: 100, min: 0, max: 1000000000, step: 0.01 }, dropdown("mode", "Calculation", [["Add taxes to a price", 1], ["Remove taxes from a total", 2]], 1)],
    calcResult: { label: "Total with Tax", format: "currency", currency: "CAD" },
    calcResults: [{ key: "amountBeforeTax", label: "Amount Before Tax", format: "currency", currency: "CAD" }, { key: "gst", label: "GST (5%)", format: "currency", currency: "CAD" }, { key: "qst", label: "QST (9.975%)", format: "currency", currency: "CAD" }, { key: "totalTax", label: "Total Tax", format: "currency", currency: "CAD" }, { key: "totalWithTax", label: "Total with Tax", format: "currency", currency: "CAD", highlight: true }],
    instructions: "Enter a price before tax to add GST and QST, or a tax-included total to see how much of it is tax.",
    examples: "Example: a $100 item costs $114.98 in Québec — $5.00 GST plus $9.98 QST. A $114.98 receipt contains $14.98 of tax.",
    assumptions: "Since 2013 QST is calculated on the price before GST (not on GST), so the combined rate is 14.975%. Other provinces use HST or PST — see the Canada HST and PST calculators. " + DISCLAIMER,
    faq: [
      { question: "What is the QST rate?", answer: "9.975% on most goods and services in Québec, on top of the 5% GST." },
      { question: "Do I need to register for QST?", answer: "Businesses with more than $30,000 of taxable sales in four consecutive quarters must register with Revenu Québec." },
    ],
  },
  {
    slug: "future-salary-calculator",
    category: SALARY_INCOME_CATEGORY,
    title: "Future Salary Calculator",
    description: "Project your salary years from now with annual raises, see what it's worth in today's dollars after inflation, and how much you'll earn in total along the way.",
    metaTitle: "Future Salary Calculator — Salary Growth with Raises",
    metaDescription: "Free future salary calculator. Project your pay after years of raises, its real value after inflation, and your total earnings over the period.",
    calcInputs: [currencyField("currentSalary", "Current Salary", { default: 60000, max: 100000000, step: 100 }), percentField("annualRaise", "Average Yearly Raise", { default: 3, min: -50, max: 100, step: 0.1 }), numberField("years", "Years from Now", { default: 10, min: 1, max: 60 }), percentField("inflation", "Expected Inflation", { default: 2.5, min: -10, max: 50, step: 0.1 })],
    calcResult: { label: "Future Salary", format: "currency" },
    calcResults: [cur("futureSalary", "Future Salary", true), cur("futureSalaryTodaysDollars", "In Today's Dollars"), cur("totalIncrease", "Increase in Pay"), pct("realGrowthPct", "Real Growth after Inflation"), cur("totalEarnedOverPeriod", "Total Earned over the Period")],
    instructions: "Enter your salary, the average raise you expect each year and how many years ahead to look. Compare with inflation to see whether your pay is really growing.",
    examples: "Example: $60,000 rising 3% a year is $80,635 in 10 years. With 2.5% inflation that's worth $62,992 today — only about 5% more buying power. You'd earn $708,468 over the 10 years.",
    assumptions: "Raises compound once a year; promotions, job changes and bonuses aren't included. US average merit raises have run about 3–4% in recent years. " + DISCLAIMER,
    faq: [
      { question: "What is a normal yearly raise?", answer: "About 3–4% in the US; switching jobs often brings larger jumps." },
      { question: "How do I know if my raise beats inflation?", answer: "Compare it with the CPI rate — the Salary Increase Calculator shows the real change for one year." },
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
