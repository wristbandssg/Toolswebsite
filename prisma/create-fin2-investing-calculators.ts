// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// finance expansion 2 sub-batch "investing". See
// src/lib/calc-engine-fin2-investing.ts for the full list of 9 sub-batches,
// and src/lib/calc-engine-fin2-investing.ts for the math. Each tool is filed in
// the Finance Calculators sub-category the user named for it (created on
// first run).
//
// HOW TO RUN
//   npx tsx prisma/create-fin2-investing-calculators.ts
// or
//   npm run db:create-fin2-investing-calculators

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


const FINANCIAL_INVESTMENT = { name: "Financial & Investment", slug: "financial-investment-calculators" };
const GENERAL_INVESTMENT = { name: "General Investment Calculators", slug: "general-investment-calculators" };
const EQUITY_INVESTMENT = { name: "Equity Investment Calculators", slug: "equity-investment-calculators" };

const inrField = (key: string, label: string, def: number, max = 1000000000, step = 500) => ({ key, label, type: "currency", unit: "INR", required: true, default: def, min: 0, max, step });
const inr = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", currency: "INR", ...(highlight ? { highlight: true } : {}) });

const TOOLS: ToolDef[] = [
  {
    slug: "ppf-calculator",
    category: FINANCIAL_INVESTMENT,
    title: "PPF Calculator",
    description: "Calculate the maturity value of your Public Provident Fund (PPF) account — total deposits, interest earned and maturity amount over 15 years or more.",
    metaTitle: "PPF Calculator — Public Provident Fund Maturity Value",
    metaDescription: "Free PPF calculator. Enter your yearly deposit and the PPF interest rate (7.1%) to see the maturity amount and interest after 15, 20 or 25 years.",
    calcInputs: [inrField("yearlyDeposit", "Yearly Deposit (₹500 – ₹1,50,000)", 150000, 150000, 500), percentField("interestRate", "PPF Interest Rate", { default: 7.1, max: 15, step: 0.1 }), dropdown("years", "Investment Period", [["15 years (maturity)", 15], ["20 years (1 extension)", 20], ["25 years (2 extensions)", 25], ["30 years (3 extensions)", 30]], 15)],
    calcResult: { label: "Maturity Value", format: "currency", currency: "INR" },
    calcResults: [inr("investedAmount", "Total Deposits"), inr("totalInterest", "Total Interest"), inr("maturityValue", "Maturity Value", true), num("years", "Years")],
    instructions: "Enter how much you deposit each financial year and the current PPF rate. The account matures after 15 years and can be extended in blocks of 5 years with fresh deposits.\n\nDeposit before 5 April each year so the whole amount earns interest for the full year.",
    examples: "Example: ₹1,50,000 a year for 15 years at 7.1% grows to ₹40,68,209 — ₹22,50,000 deposited and ₹18,18,209 of tax-free interest.",
    assumptions: "Interest is compounded yearly on the full deposit made by 5 April. The Government of India sets the PPF rate each quarter (7.1% since April 2020); the result assumes it stays the same. Deposits qualify for Section 80C under the old tax regime, and interest and maturity are tax-free (EEE). " + DISCLAIMER,
    faq: [
      { question: "What is the maximum PPF deposit?", answer: "₹1,50,000 per financial year, and at least ₹500 to keep the account active." },
      { question: "Can I withdraw from PPF before 15 years?", answer: "Partial withdrawals are allowed from the 7th financial year, and loans from the 3rd to the 6th year." },
    ],
  },
  {
    slug: "swp-calculator",
    category: FINANCIAL_INVESTMENT,
    title: "SWP Calculator",
    description: "Calculate a systematic withdrawal plan (SWP) — how much you withdraw, what's left at the end, and the most you can withdraw each month so your corpus lasts.",
    metaTitle: "SWP Calculator — Systematic Withdrawal Plan",
    metaDescription: "Free SWP calculator. See your total withdrawals and final corpus value from a mutual fund SWP, and the largest monthly withdrawal your money can support.",
    calcInputs: [inrField("totalInvestment", "Total Investment", 1000000, 1000000000, 10000), inrField("monthlyWithdrawal", "Monthly Withdrawal", 10000, 10000000, 500), percentField("expectedReturn", "Expected Return per Year", { default: 8, max: 30 }), numberField("years", "Withdrawal Period (years)", { default: 10, min: 1, max: 50 })],
    calcResult: { label: "Final Value", format: "currency", currency: "INR" },
    calcResults: [inr("totalWithdrawn", "Total Withdrawn"), inr("finalValue", "Final Value", true), num("monthsLasted", "Months the Money Lasts"), inr("maxSustainableWithdrawal", "Max Monthly Withdrawal for This Period")],
    instructions: "Enter your lump-sum investment, the amount you want each month and the return you expect. The calculator shows what remains at the end — and if the money runs out early, in which month.\n\nThe last line is the highest monthly withdrawal that uses up the corpus exactly over your chosen period.",
    examples: "Example: ₹10,00,000 earning 8% a year with ₹10,000 withdrawn monthly for 10 years pays out ₹12,00,000 and still leaves ₹3,90,180. You could withdraw up to ₹12,133 a month for 10 years.",
    assumptions: "Returns are compounded monthly (annual rate ÷ 12) and each withdrawal is taken at the end of the month. Capital gains tax on redeemed units and exit loads aren't deducted; real fund returns vary. " + DISCLAIMER,
    faq: [
      { question: "Is SWP better than a fixed deposit for monthly income?", answer: "An SWP from a debt or hybrid fund can be more tax-efficient, because only the gains in each withdrawal are taxed, but returns aren't guaranteed." },
      { question: "What is a safe SWP rate?", answer: "Withdrawing about 4–6% of the corpus a year usually lets an equity-heavy fund last decades." },
    ],
  },
  {
    slug: "lumpsum-calculator",
    category: FINANCIAL_INVESTMENT,
    title: "Lumpsum Calculator",
    description: "Calculate what a one-time (lump sum) mutual fund investment grows to — estimated returns, total value and its worth in today's money.",
    metaTitle: "Lumpsum Calculator — One-Time Mutual Fund Investment",
    metaDescription: "Free lumpsum calculator. See what a one-time investment grows to at your expected return, the gains, and the value after inflation.",
    calcInputs: [inrField("investment", "Total Investment", 100000, 1000000000, 1000), percentField("expectedReturn", "Expected Return per Year", { default: 12, max: 50 }), numberField("years", "Time Period (years)", { default: 10, min: 1, max: 50 }), percentField("inflation", "Inflation (for today's value)", { default: 6, max: 20, required: false })],
    calcResult: { label: "Total Value", format: "currency", currency: "INR" },
    calcResults: [inr("investedAmount", "Invested Amount"), inr("estimatedReturns", "Estimated Returns"), inr("totalValue", "Total Value", true), inr("valueInTodaysMoney", "Value in Today's Money"), num("multiple", "Money Multiplied (×)")],
    instructions: "Enter the amount you invest once, the yearly return you expect and how long you'll stay invested. Use a lower return for debt funds and a higher one for equity funds held for the long term.",
    examples: "Example: ₹1,00,000 invested for 10 years at 12% grows to ₹3,10,585 — ₹2,10,585 of gains. With 6% inflation that's worth about ₹1,73,429 in today's money.",
    assumptions: "FV = P × (1 + r)^n with yearly compounding, the method Indian fund-house lumpsum calculators use. Taxes, exit loads and expense ratios aren't deducted. " + DISCLAIMER,
    faq: [
      { question: "Lumpsum or SIP — which is better?", answer: "A lump sum earns more when markets rise steadily after you invest; a SIP spreads your entry over time and lowers timing risk." },
      { question: "How long does money take to double at 12%?", answer: "About 6 years (72 ÷ 12, the rule of 72)." },
    ],
  },
  {
    slug: "bitcoin-etf-calculator",
    category: GENERAL_INVESTMENT,
    title: "Bitcoin ETF Calculator",
    description: "Estimate the value of a spot bitcoin ETF investment from a future bitcoin price, after the fund's expense ratio — and compare it with buying bitcoin directly.",
    metaTitle: "Bitcoin ETF Calculator — Returns After Fees",
    metaDescription: "Free bitcoin ETF calculator. Project a spot BTC ETF investment at a future bitcoin price, net of the expense ratio, versus buying BTC directly.",
    calcInputs: [currencyField("investment", "Amount Invested", { default: 10000, max: 1000000000, step: 100 }), currencyField("btcPriceNow", "Bitcoin Price Today", { default: 100000, max: 100000000, step: 100 }), currencyField("btcPriceFuture", "Expected Future Bitcoin Price", { default: 150000, max: 100000000, step: 100 }), percentField("expenseRatio", "ETF Expense Ratio", { default: 0.25, max: 5, step: 0.01 }), numberField("years", "Years Held", { default: 3, max: 50, step: 0.5 }), percentField("directBuyFee", "Fee to Buy BTC Directly (for comparison)", { default: 1.5, max: 10, step: 0.01, required: false })],
    calcResult: { label: "ETF Value", format: "currency" },
    calcResults: [pct("btcPriceChange", "Bitcoin Price Change"), cur("etfValue", "ETF Value", true), cur("etfGain", "Gain or Loss"), cur("feesPaid", "Expense-Ratio Cost"), cur("directBtcValue", "Value if Bought BTC Directly"), cur("etfMinusDirect", "ETF minus Direct")],
    instructions: "Enter what you invest, today's bitcoin price and the price you expect when you sell. Spot bitcoin ETFs track the price minus a small yearly expense ratio (about 0.15–0.25% for most US funds).",
    examples: "Example: $10,000 in a 0.25% fund while bitcoin rises from $100,000 to $150,000 over 3 years is worth about $14,888. Buying BTC directly with a 1.5% fee would give $14,775.",
    assumptions: "The ETF tracks bitcoin exactly apart from the expense ratio, taken as a yearly percentage of assets. Brokerage commissions, bid-ask spreads, premiums/discounts to NAV and taxes are ignored. Bitcoin is highly volatile — this is a scenario, not a forecast. " + DISCLAIMER,
    faq: [
      { question: "Do bitcoin ETFs hold real bitcoin?", answer: "Spot ETFs, approved in the US in January 2024, hold bitcoin with a custodian; futures ETFs hold futures contracts instead." },
      { question: "ETF or buying bitcoin directly?", answer: "An ETF is simpler and fits in IRAs and brokerage accounts; owning BTC directly avoids the yearly fee and lets you self-custody." },
    ],
  },
  {
    slug: "nav-calculator",
    category: EQUITY_INVESTMENT,
    title: "NAV Calculator",
    description: "Calculate a fund's net asset value (NAV) per unit or share from its assets, liabilities and units outstanding, and its premium or discount to the market price.",
    metaTitle: "NAV Calculator — Net Asset Value per Share",
    metaDescription: "Free NAV calculator. Find net asset value per unit for a mutual fund, ETF or closed-end fund, and its premium or discount to the market price.",
    calcInputs: [currencyField("totalAssets", "Total Assets (market value)", { default: 105000000, max: 1000000000000, step: 1000 }), currencyField("totalLiabilities", "Total Liabilities", { default: 5000000, max: 1000000000000, step: 1000 }), numberField("unitsOutstanding", "Units / Shares Outstanding", { default: 4000000, min: 1, max: 100000000000 }), currencyField("marketPrice", "Market Price (optional, ETFs/CEFs)", { default: 0, max: 1000000, step: 0.01, required: false })],
    calcResult: { label: "NAV per Unit", format: "currency" },
    calcResults: [cur("netAssets", "Net Assets"), { key: "navPerUnit", label: "NAV per Unit", format: "currency", decimals: 4, highlight: true }, pct("premiumDiscount", "Premium (+) / Discount (−) to NAV")],
    instructions: "Enter the fund's total assets at market value, everything it owes (including accrued fees) and the number of units or shares. For an ETF or closed-end fund, add its trading price to see whether it trades at a premium or a discount.",
    examples: "Example: $105 million of assets, $5 million of liabilities and 4 million units give a NAV of $25.00 per unit. A market price of $24 would be a 4% discount.",
    assumptions: "NAV = (assets − liabilities) ÷ units outstanding, usually struck once a day at market close. " + DISCLAIMER,
    faq: [
      { question: "Is a lower NAV a cheaper fund?", answer: "No — NAV depends on when the fund started and its unit count; what matters is returns and costs." },
      { question: "Why do closed-end funds trade at a discount?", answer: "Their shares trade on an exchange with a fixed supply, so price follows demand and can differ widely from NAV." },
    ],
  },
  {
    slug: "free-float-calculator",
    category: EQUITY_INVESTMENT,
    title: "Free Float Calculator",
    description: "Calculate a company's free float — the shares available for public trading after promoter, insider, government and strategic holdings — and its free-float market cap.",
    metaTitle: "Free Float Calculator — Float Shares & Float Market Cap",
    metaDescription: "Free float calculator. Subtract promoter, insider and strategic holdings from shares outstanding to get free float shares, float % and float market cap.",
    calcInputs: [numberField("sharesOutstanding", "Shares Outstanding", { default: 100000000, max: 100000000000 }), numberField("promoterShares", "Promoter / Founder Holdings", { default: 45000000, max: 100000000000, required: false }), numberField("insiderShares", "Insider & Employee Locked Shares", { default: 5000000, max: 100000000000, required: false }), numberField("governmentShares", "Government Holdings", { default: 0, max: 100000000000, required: false }), numberField("strategicShares", "Strategic / Cross Holdings", { default: 0, max: 100000000000, required: false }), currencyField("sharePrice", "Share Price", { default: 25, max: 1000000, step: 0.01 })],
    calcResult: { label: "Free Float %", format: "percentage" },
    calcResults: [num("restrictedShares", "Restricted Shares"), num("freeFloatShares", "Free Float Shares"), pct("freeFloatPct", "Free Float %", true), cur("marketCap", "Total Market Cap"), cur("freeFloatMarketCap", "Free-Float Market Cap")],
    instructions: "Enter total shares outstanding and the blocks of shares that rarely trade. Index providers such as S&P, MSCI and NSE weight companies by free-float market cap.",
    examples: "Example: 100 million shares with 45 million held by promoters and 5 million locked up by insiders leaves a 50% free float — $1.25 billion of a $2.5 billion market cap.",
    assumptions: "Each index provider has its own rules for which holdings count as restricted. " + DISCLAIMER,
    faq: [
      { question: "Why does free float matter?", answer: "A low float means fewer shares trade, so the price can swing more, and index funds buy less of the stock." },
      { question: "What's the minimum public shareholding in India?", answer: "SEBI requires listed companies to keep at least 25% public shareholding." },
    ],
  },
  {
    slug: "market-capitalization-calculator",
    category: EQUITY_INVESTMENT,
    title: "Market Capitalization Calculator",
    description: "Calculate a company's market capitalization from shares outstanding and share price, and see whether it's a mega, large, mid, small, micro or nano cap.",
    metaTitle: "Market Cap Calculator — Market Capitalization & Size",
    metaDescription: "Free market capitalization calculator. Multiply shares outstanding by share price and classify the company from mega cap to nano cap.",
    calcInputs: [numberField("sharesOutstanding", "Shares Outstanding", { default: 2500000000, max: 100000000000000 }), currencyField("sharePrice", "Share Price", { default: 80, max: 10000000, step: 0.01 })],
    calcResult: { label: "Market Cap", format: "currency" },
    calcResults: [cur("marketCap", "Market Capitalization", true), num("marketCapBillions", "Market Cap ($ billions)"), num("sizeClass", "Size (1 Mega, 2 Large, 3 Mid, 4 Small, 5 Micro, 6 Nano)")],
    instructions: "Enter the number of shares outstanding (from the latest 10-Q or a quote page) and the current share price.",
    examples: "Example: 2.5 billion shares at $80 = a $200 billion market cap — a mega cap.",
    assumptions: "Size bands commonly used in the US: mega ≥ $200B, large $10–200B, mid $2–10B, small $300M–2B, micro $50–300M, nano < $50M. Market cap measures equity only; enterprise value adds debt and subtracts cash. " + DISCLAIMER,
    faq: [
      { question: "Is market cap the same as company value?", answer: "It's the value of the equity. To value the whole business, use enterprise value." },
      { question: "Does a stock split change market cap?", answer: "No — the share count rises and the price falls by the same ratio." },
    ],
  },
  {
    slug: "stock-split-calculator",
    category: EQUITY_INVESTMENT,
    title: "Stock Split Calculator",
    description: "Calculate your shares and the share price after a forward or reverse stock split, including cash paid for fractional shares.",
    metaTitle: "Stock Split Calculator — Shares & Price After a Split",
    metaDescription: "Free stock split calculator. See how many shares you'll own and the new price after a 2-for-1, 4-for-1, 10-for-1 or reverse split, with cash in lieu.",
    calcInputs: [numberField("sharesOwned", "Shares Owned Before the Split", { default: 150, max: 1000000000, step: 0.0001 }), currencyField("priceBeforeSplit", "Share Price Before the Split", { default: 600, max: 10000000, step: 0.01 }), numberField("newShares", "Split Ratio — New Shares", { default: 4, min: 1, max: 1000 }), numberField("oldShares", "Split Ratio — For Every Old Shares", { default: 1, min: 1, max: 1000 })],
    calcResult: { label: "Shares After Split", format: "number" },
    calcResults: [num("splitRatio", "Split Multiplier", false, 4), num("sharesAfterSplit", "Whole Shares After Split", true), cur("priceAfterSplit", "Price After Split"), cur("cashInLieu", "Cash for Fractional Shares"), cur("positionValue", "Position Value (unchanged)")],
    instructions: "Enter your shares and price, then the split ratio: a 4-for-1 split is 4 new for 1 old; a 1-for-10 reverse split is 1 new for 10 old.",
    examples: "Example: 150 shares at $600 in a 4-for-1 split become 600 shares at $150 — still worth $90,000. In a 1-for-10 reverse split, 155 shares become 15 shares plus cash for the half share.",
    assumptions: "Brokers pay cash for fractional shares in most splits at the post-split price; some keep fractional shares instead. A split doesn't change the value of your holding or your total cost basis. " + DISCLAIMER,
    faq: [
      { question: "Is a stock split good for investors?", answer: "It doesn't change value, but a lower share price can make the stock easier to buy and is often a sign of management confidence." },
      { question: "Why do companies do reverse splits?", answer: "Usually to lift a low share price above an exchange's minimum listing price." },
    ],
  },
  {
    slug: "carried-interest-calculator",
    category: EQUITY_INVESTMENT,
    title: "Carried Interest Calculator",
    description: "Calculate a private equity or venture fund manager's carried interest after the hurdle rate, with or without a GP catch-up, and the investors' net return.",
    metaTitle: "Carried Interest Calculator — PE Carry & Hurdle Rate",
    metaDescription: "Free carried interest calculator. Work out GP carry after an 8% preferred return with or without catch-up, plus LP profit and net multiple.",
    calcInputs: [currencyField("capitalInvested", "Capital Invested by LPs", { default: 100000000, max: 100000000000, step: 100000 }), currencyField("totalProceeds", "Total Proceeds Returned", { default: 250000000, max: 1000000000000, step: 100000 }), percentField("hurdleRate", "Hurdle (Preferred Return) per Year", { default: 8, max: 30 }), numberField("years", "Years Capital Was Invested", { default: 6, max: 30, step: 0.5 }), percentField("carryPercent", "Carry Percentage", { default: 20, max: 50 }), dropdown("catchUp", "GP Catch-Up", [["Full (100%) catch-up", 1], ["No catch-up", 2]], 1)],
    calcResult: { label: "GP Carry", format: "currency" },
    calcResults: [cur("totalProfit", "Total Profit"), cur("preferredReturn", "LP Preferred Return"), cur("gpCarry", "GP Carried Interest", true), cur("lpProfit", "LP Net Profit"), num("lpMultiple", "LP Net Multiple (×)"), pct("effectiveCarryPct", "Carry as % of Profit")],
    instructions: "Enter what investors put in, what the fund returned, the hurdle rate and how long the money was invested. With a full catch-up, once the hurdle is met the GP receives profits until it has its full carry share of all profit.",
    examples: "Example: a $100M fund returning $250M after 6 years has $150M of profit. The 8% hurdle is $58.7M, and with a full catch-up the GP earns the full 20% carry — $30M — leaving LPs 2.2× their money.",
    assumptions: "A European (whole-fund) waterfall: capital back first, then a compounded preferred return, then catch-up and carry. Management fees, recycling and GP commitment aren't modelled. " + DISCLAIMER,
    faq: [
      { question: "How is carried interest taxed in the US?", answer: "As long-term capital gains when the underlying assets are held more than three years (Section 1061)." },
      { question: "What's 2 and 20?", answer: "A 2% yearly management fee plus 20% carried interest — the classic fund fee structure." },
    ],
  },
  {
    slug: "moving-average-calculator",
    category: GENERAL_INVESTMENT,
    title: "Moving Average Calculator",
    description: "Calculate the simple (SMA) and exponential (EMA) moving average of a stock or any data series, and whether the latest price is above or below it.",
    metaTitle: "Moving Average Calculator — SMA & EMA",
    metaDescription: "Free moving average calculator. Enter up to 12 prices to get the simple and exponential moving average and see if the price is above or below the trend.",
    calcInputs: [dropdown("period", "Moving Average Period", [["3", 3], ["4", 4], ["5", 5], ["6", 6], ["8", 8], ["10", 10], ["12", 12]], 5), ...Array.from({ length: 12 }, (_, i) => currencyField(`price${i + 1}`, `Price ${i + 1} (oldest first)`, { default: [100, 102, 101, 104, 107, 106, 109, 111, 0, 0, 0, 0][i], max: 10000000, step: 0.01, required: false }))],
    calcResult: { label: "SMA", format: "currency" },
    calcResults: [cur("sma", "Simple Moving Average (SMA)", true), cur("previousSma", "Previous SMA"), cur("ema", "Exponential Moving Average (EMA)"), cur("latestPrice", "Latest Price"), pct("priceVsSma", "Latest Price vs SMA"), num("trend", "Price Is (1 Above SMA, 2 Below)"), num("pricesUsed", "Prices Entered")],
    instructions: "Enter closing prices in date order, oldest first, and choose the period. You need at least as many prices as the period. For a 50- or 200-day average use a spreadsheet; this tool suits short averages and learning how they work.",
    examples: "Example: closes of 100, 102, 101, 104, 107, 106, 109 and 111 give a 5-period SMA of 107.40 and an EMA of 107.39. The latest price is 3.35% above the SMA — an uptrend.",
    assumptions: "SMA = average of the last n prices. EMA starts from the first n-period SMA and then weights each new price by α = 2 ÷ (n + 1), so it reacts faster. " + DISCLAIMER,
    faq: [
      { question: "SMA or EMA — which is better?", answer: "EMA reacts faster to new prices; SMA is smoother and less prone to false signals." },
      { question: "What is a golden cross?", answer: "When the 50-day moving average rises above the 200-day — traditionally seen as a bullish signal." },
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
