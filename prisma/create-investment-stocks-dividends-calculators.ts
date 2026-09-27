// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// the "Investment Calculators" sub-batch C (Stocks, Dividends & Portfolio
// Growth). Part of the Investment Calculators tool-list build-out — see
// create-investment-returns-calculators.ts for the full batch context and
// the 6 skipped duplicates.
//
// See src/lib/calc-engine-investment-stocks-dividends.ts for the math and
// for notes on how these tools are deliberately differentiated from the
// existing stock-profit-calculator, dividend-calculator, and the Tax
// category's capital-gains-cost-basis-calculator.
//
// HOW TO RUN
//   npx tsx prisma/create-investment-stocks-dividends-calculators.ts
// or
//   npm run db:create-investment-stocks-dividends-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "investment-calculators";

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
  "This tool provides general estimates for informational purposes only and isn't financial or investment " +
  "advice. Past returns don't guarantee future results — consider speaking with a licensed financial " +
  "professional about your own situation.";

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
    slug: "stock-loss-calculator",
    title: "Stock Loss Calculator",
    description: "Calculate how much you've lost on a stock, the percentage loss, and the percentage gain needed just to get back to even.",
    metaTitle: "Stock Loss Calculator — Free & Instant",
    metaDescription: "Free stock loss calculator. See your dollar and percentage loss on a stock and the percentage gain it needs to get you back to break-even.",
    calcInputs: [
      numberField("shares", "Number of Shares", { default: 200, min: 0, max: 10000000, step: 1 }),
      currencyField("buyPrice", "Buy Price Per Share", { default: 45, max: 1000000, step: 0.01 }),
      currencyField("currentPrice", "Current Price Per Share", { default: 36, max: 1000000, step: 0.01 }),
      currencyField("buyCommission", "Buy Commission", { default: 5, max: 10000, step: 1 }),
      currencyField("sellCommission", "Sell Commission (If You Sold Now)", { default: 5, max: 10000, step: 1 }),
    ],
    calcResult: { label: "Loss", format: "currency" },
    calcResults: [
      { key: "loss", label: "Loss If Sold Now", format: "currency", highlight: true },
      { key: "lossPercent", label: "Loss", format: "percentage" },
      { key: "currentValue", label: "Current Market Value", format: "currency" },
      { key: "gainNeededToRecoverPercent", label: "Gain Needed to Break Even", format: "percentage" },
    ],
    instructions:
      "Enter how many shares you own, what you paid per share, today's price, and your buy and sell commissions. " +
      "The tool shows what you'd lose if you sold today, and how much the price has to rise from here just to get " +
      "your money back. A negative loss means the position is actually in profit.",
    examples:
      "Example: 200 shares bought at $45 and now trading at $36, with $5 commissions each way, is a $1,810 loss " +
      "(20.10%). The price needs to rise 25.14% from $36 just to break even.",
    assumptions:
      "Dividends received aren't included, and taxes aren't considered — a realized loss may be tax-deductible " +
      "depending on where you live. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the gain needed bigger than the loss?",
        answer: "Because the recovery starts from a smaller amount. A 20% drop takes $100 to $80, and $80 needs to rise 25% to get back to $100. A 50% loss needs a 100% gain to recover.",
      },
    ],
  },
  {
    slug: "stock-average-price-calculator",
    title: "Stock Average Price Calculator",
    description: "Calculate your average price per share across up to 4 purchases of the same stock, and your gain or loss at today's price.",
    metaTitle: "Stock Average Price Calculator — Free & Instant",
    metaDescription: "Free stock average price calculator. Enter up to 4 purchases to find your average cost per share and your unrealized gain or loss today.",
    calcInputs: [
      numberField("purchase1Shares", "Purchase 1 — Shares", { default: 100, max: 10000000, step: 1 }),
      currencyField("purchase1Price", "Purchase 1 — Price Per Share", { default: 50, max: 1000000, step: 0.01 }),
      numberField("purchase2Shares", "Purchase 2 — Shares", { default: 50, max: 10000000, step: 1 }),
      currencyField("purchase2Price", "Purchase 2 — Price Per Share", { default: 42, max: 1000000, step: 0.01 }),
      numberField("purchase3Shares", "Purchase 3 — Shares", { default: 75, max: 10000000, step: 1 }),
      currencyField("purchase3Price", "Purchase 3 — Price Per Share", { default: 38, max: 1000000, step: 0.01 }),
      numberField("purchase4Shares", "Purchase 4 — Shares", { default: 0, max: 10000000, step: 1 }),
      currencyField("purchase4Price", "Purchase 4 — Price Per Share", { default: 0, max: 1000000, step: 0.01 }),
      currencyField("currentPrice", "Current Price Per Share (Optional)", { default: 45, max: 1000000, step: 0.01 }),
    ],
    calcResult: { label: "Average Price Per Share", format: "currency" },
    calcResults: [
      { key: "averagePrice", label: "Average Price Per Share", format: "currency", highlight: true },
      { key: "totalShares", label: "Total Shares", format: "number" },
      { key: "totalCost", label: "Total Cost", format: "currency" },
      { key: "unrealizedGainLoss", label: "Unrealized Gain (+) or Loss (−) at Current Price", format: "currency" },
    ],
    instructions:
      "Enter the number of shares and the price per share for each time you bought the stock — leave unused rows " +
      "at 0. The tool weights each price by the number of shares bought at it to find your true average cost. " +
      "Add today's price to see your gain or loss on the whole position.",
    examples:
      "Example: 100 shares at $50, 50 at $42, and 75 at $38 is 225 shares costing $9,950 — an average of $44.22 per " +
      "share. At $45 the position is up $175.",
    assumptions:
      "Commissions aren't included in the average — use the Stock Cost Basis Calculator if you want fees " +
      "included and to work out the basis of a partial sale. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why isn't the average just the average of the prices?",
        answer: "Because you bought different numbers of shares at each price. The prices $50, $42, and $38 average $43.33, but since you bought the most shares at $50, your real average is higher, at $44.22.",
      },
    ],
  },
  {
    slug: "stock-cost-basis-calculator",
    title: "Stock Cost Basis Calculator",
    description: "Work out the cost basis of shares you sell from multiple purchase lots, using FIFO, LIFO, or average cost, including fees.",
    metaTitle: "Stock Cost Basis Calculator — FIFO, LIFO & Average",
    metaDescription: "Free stock cost basis calculator. Find the basis of shares sold from several lots using FIFO, LIFO, or average cost, with fees included.",
    calcInputs: [
      numberField("lot1Shares", "Lot 1 (Oldest) — Shares", { default: 100, max: 10000000, step: 1 }),
      currencyField("lot1Price", "Lot 1 — Price Per Share", { default: 40, max: 1000000, step: 0.01 }),
      currencyField("lot1Fees", "Lot 1 — Fees", { default: 5, max: 10000, step: 1 }),
      numberField("lot2Shares", "Lot 2 — Shares", { default: 50, max: 10000000, step: 1 }),
      currencyField("lot2Price", "Lot 2 — Price Per Share", { default: 55, max: 1000000, step: 0.01 }),
      currencyField("lot2Fees", "Lot 2 — Fees", { default: 5, max: 10000, step: 1 }),
      numberField("lot3Shares", "Lot 3 (Newest) — Shares", { default: 50, max: 10000000, step: 1 }),
      currencyField("lot3Price", "Lot 3 — Price Per Share", { default: 48, max: 1000000, step: 0.01 }),
      currencyField("lot3Fees", "Lot 3 — Fees", { default: 5, max: 10000, step: 1 }),
      numberField("sharesSold", "Shares Sold", { default: 120, max: 10000000, step: 1 }),
      currencyField("salePrice", "Sale Price Per Share", { default: 60, max: 1000000, step: 0.01 }),
      currencyField("saleFees", "Sale Fees", { default: 5, max: 10000, step: 1 }),
      {
        key: "method", label: "Lot Selection Method", type: "dropdown", required: true, default: 1,
        options: [
          { label: "FIFO (First In, First Out)", value: 1 },
          { label: "LIFO (Last In, First Out)", value: 2 },
          { label: "Average Cost", value: 3 },
        ],
      },
    ],
    calcResult: { label: "Cost Basis of Shares Sold", format: "currency" },
    calcResults: [
      { key: "costBasisOfSharesSold", label: "Cost Basis of Shares Sold", format: "currency", highlight: true },
      { key: "realizedGainLoss", label: "Realized Gain (+) or Loss (−)", format: "currency" },
      { key: "remainingShares", label: "Shares Remaining", format: "number" },
      { key: "remainingCostBasis", label: "Cost Basis of Remaining Shares", format: "currency" },
    ],
    instructions:
      "Enter up to three purchase lots from oldest to newest — shares, price per share, and the fees you paid — " +
      "then the number of shares you sold, the sale price, and the sale fees. Choose which shares count as sold: " +
      "FIFO uses the oldest first, LIFO uses the newest first, and Average Cost uses the average of all lots. " +
      "Leave unused lots at 0.",
    examples:
      "Example: with lots of 100 shares at $40, 50 at $55, and 50 at $48 ($5 fees each), selling 120 shares at $60 " +
      "has a cost basis of $5,107 under FIFO (a $2,088 gain), $5,961 under LIFO (a $1,234 gain), or $5,499 under " +
      "Average Cost (a $1,696 gain).",
    assumptions:
      "Fees are added to each lot's cost, and sale fees are subtracted from proceeds. This tool calculates cost " +
      "basis and gain only — it doesn't calculate tax. Which methods you're allowed to use depends on your " +
      "country and account type; for example, average cost is usually only allowed for mutual funds in the US. " +
      "For the tax on the gain, see the Capital Gains Cost Basis Calculator under Tax Calculators. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which method gives the lowest tax?",
        answer: "Whichever method matches your highest-cost shares to the sale produces the smallest gain. In this example LIFO does, because the newer lots were bought at higher prices — but short-term gains are often taxed more heavily, so the lowest gain isn't always the lowest tax.",
      },
    ],
  },
  {
    slug: "stock-break-even-calculator",
    title: "Stock Break-Even Calculator",
    description: "Find the share price you need to sell at to cover your purchase cost, commissions, and selling fees — plus the price for a target profit.",
    metaTitle: "Stock Break-Even Calculator — Free & Instant",
    metaDescription: "Free stock break-even calculator. Find the sell price that covers your cost, commissions, and fees, and the price needed for your target profit.",
    calcInputs: [
      numberField("shares", "Number of Shares", { default: 100, min: 1, max: 10000000, step: 1 }),
      currencyField("buyPrice", "Buy Price Per Share", { default: 25, max: 1000000, step: 0.01 }),
      currencyField("buyCommission", "Buy Commission", { default: 5, max: 10000, step: 1 }),
      currencyField("sellCommission", "Sell Commission", { default: 5, max: 10000, step: 1 }),
      percentField("sellFeePercent", "Other Selling Fees (% of Sale)", { default: 0.1, max: 10, step: 0.01 }),
      percentField("targetProfitPercent", "Target Profit", { default: 10, max: 1000, step: 1 }),
    ],
    calcResult: { label: "Break-Even Price", format: "currency" },
    calcResults: [
      { key: "breakEvenPrice", label: "Break-Even Sell Price", format: "currency", highlight: true },
      { key: "priceIncreaseNeededPercent", label: "Price Rise Needed to Break Even", format: "percentage" },
      { key: "targetPrice", label: "Sell Price for Target Profit", format: "currency" },
    ],
    instructions:
      "Enter the number of shares, your buy price, your buy and sell commissions, any selling fees charged as a " +
      "percentage of the sale (such as exchange, stamp, or currency-conversion fees), and the profit you're aiming " +
      "for. The tool finds the price where you'd walk away with exactly what you put in, and the price that " +
      "delivers your target profit after all costs.",
    examples:
      "Example: 100 shares bought at $25 with $5 commissions each way and a 0.1% selling fee break even at $25.13 " +
      "per share (a 0.50% rise). A 10% profit needs a sale price of $27.63.",
    assumptions:
      "The target profit is measured on your total cost, including the buy commission. Taxes and dividends " +
      "aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why isn't break-even just my buy price?",
        answer: "Because you pay costs on the way in and on the way out. Selling at your buy price still leaves you down by both commissions and any selling fees.",
      },
    ],
  },
  {
    slug: "stock-investment-calculator",
    title: "Stock Investment Calculator",
    description: "Find how many shares a set amount of money buys, the cash left over, and what the position would be worth at a target price.",
    metaTitle: "Stock Investment Calculator — Free & Instant",
    metaDescription: "Free stock investment calculator. See how many shares your budget buys, the cash left over, and your profit if the stock reaches a target price.",
    calcInputs: [
      currencyField("investmentAmount", "Amount to Invest", { default: 5000, step: 100 }),
      currencyField("sharePrice", "Share Price", { default: 137.5, max: 1000000, step: 0.01 }),
      currencyField("commission", "Commission", { default: 0, max: 10000, step: 1 }),
      {
        key: "allowFractional", label: "Share Type", type: "dropdown", required: true, default: 0,
        options: [
          { label: "Whole Shares Only", value: 0 },
          { label: "Fractional Shares Allowed", value: 1 },
        ],
      },
      currencyField("targetPrice", "Target Price", { default: 160, max: 1000000, step: 0.01 }),
    ],
    calcResult: { label: "Shares Purchased", format: "number" },
    calcResults: [
      { key: "sharesPurchased", label: "Shares You Can Buy", format: "number", highlight: true },
      { key: "totalCost", label: "Total Cost", format: "currency" },
      { key: "leftoverCash", label: "Cash Left Over", format: "currency" },
      { key: "valueAtTargetPrice", label: "Value at Target Price", format: "currency" },
      { key: "profitAtTargetPrice", label: "Profit at Target Price", format: "currency" },
    ],
    instructions:
      "Enter how much you want to invest, the current share price, any commission, whether your broker allows " +
      "fractional shares, and a price you think the stock could reach. The tool shows how many shares you can " +
      "buy, how much cash is left over, and what you'd make if the stock hits your target.",
    examples:
      "Example: $5,000 buys 36 whole shares at $137.50, costing $4,950 and leaving $50. If the stock reaches $160, " +
      "those shares are worth $5,760 — an $810 profit.",
    assumptions:
      "Fractional shares are rounded down to 4 decimal places. The profit at the target price doesn't include a " +
      "sell commission, dividends, or taxes. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I use fractional shares?",
        answer: "If your broker offers them, fractional shares let you invest your whole budget, even in high-priced stocks, instead of leaving cash unused.",
      },
    ],
  },
  {
    slug: "dividend-yield-calculator",
    title: "Dividend Yield Calculator",
    description: "Calculate a stock's current dividend yield and your personal yield on cost from its per-payment dividend and payment frequency.",
    metaTitle: "Dividend Yield Calculator — Free & Instant",
    metaDescription: "Free dividend yield calculator. Enter the dividend per payment and how often it's paid to get the current yield and your yield on cost.",
    calcInputs: [
      currencyField("dividendPerPayment", "Dividend Per Payment (Per Share)", { default: 0.62, max: 10000, step: 0.01 }),
      {
        key: "paymentsPerYear", label: "Payment Frequency", type: "dropdown", required: true, default: 4,
        options: [
          { label: "Monthly", value: 12 },
          { label: "Quarterly", value: 4 },
          { label: "Semi-Annually", value: 2 },
          { label: "Annually", value: 1 },
        ],
      },
      currencyField("currentPrice", "Current Share Price", { default: 85, max: 1000000, step: 0.01 }),
      currencyField("purchasePrice", "Your Purchase Price (Optional)", { default: 60, max: 1000000, step: 0.01 }),
    ],
    calcResult: { label: "Current Dividend Yield", format: "percentage" },
    calcResults: [
      { key: "currentYieldPercent", label: "Current Dividend Yield", format: "percentage", highlight: true },
      { key: "yieldOnCostPercent", label: "Your Yield on Cost", format: "percentage" },
      { key: "annualDividendPerShare", label: "Annual Dividend Per Share", format: "currency" },
    ],
    instructions:
      "Enter the dividend paid per share each time, how often it's paid, and the current share price. Add the " +
      "price you originally paid to also see your yield on cost — the income you now earn as a percentage of " +
      "what you invested.",
    examples:
      "Example: a $0.62 quarterly dividend is $2.48 a year. At a $85 share price that's a 2.92% current yield; if " +
      "you bought at $60, your yield on cost is 4.13%.",
    assumptions:
      "Assumes the current dividend continues at the same rate for a full year (a \"forward\" yield). Special or " +
      "one-off dividends shouldn't be included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the Dividend Calculator?",
        answer: "The Dividend Calculator focuses on your total dividend income from the shares you hold. This tool focuses on yield: it works from the per-payment amount and frequency shown on most dividend announcements, and adds yield on cost.",
      },
      {
        question: "Is a high dividend yield always good?",
        answer: "Not necessarily. A yield can be high because the share price has fallen sharply, sometimes on worries that the dividend will be cut. Check whether the company's earnings comfortably cover the dividend.",
      },
    ],
  },
  {
    slug: "dividend-reinvestment-calculator",
    title: "Dividend Reinvestment Calculator",
    description: "Compare reinvesting your dividends (DRIP) with taking them as cash, and see how many shares you end up with.",
    metaTitle: "Dividend Reinvestment Calculator (DRIP) — Free",
    metaDescription: "Free dividend reinvestment (DRIP) calculator. Compare reinvesting dividends with taking cash, and see your ending value and share count.",
    calcInputs: [
      currencyField("initialInvestment", "Initial Investment", { default: 10000, step: 500 }),
      currencyField("sharePrice", "Current Share Price", { default: 50, max: 1000000, step: 0.01 }),
      percentField("dividendYieldPercent", "Dividend Yield", { default: 3.5, max: 30, step: 0.1 }),
      {
        key: "paymentsPerYear", label: "Dividend Frequency", type: "dropdown", required: true, default: 4,
        options: [
          { label: "Monthly", value: 12 },
          { label: "Quarterly", value: 4 },
          { label: "Semi-Annually", value: 2 },
          { label: "Annually", value: 1 },
        ],
      },
      percentField("annualPriceGrowthPercent", "Expected Share Price Growth Per Year", { default: 5, min: -30, max: 50, step: 0.1 }),
      numberField("years", "Years", { default: 20, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Ending Value With DRIP", format: "currency" },
    calcResults: [
      { key: "endingValueWithDrip", label: "Ending Value — Dividends Reinvested", format: "currency", highlight: true },
      { key: "endingValueWithoutDrip", label: "Ending Value — Dividends Taken as Cash", format: "currency" },
      { key: "dripAdvantage", label: "Extra Value From Reinvesting", format: "currency" },
      { key: "endingShares", label: "Shares Owned With DRIP", format: "number" },
    ],
    instructions:
      "Enter your starting investment, the share price, the dividend yield, how often dividends are paid, how " +
      "much you expect the share price to grow each year, and how many years you'll hold. The tool follows two " +
      "versions of the same investment: one that uses every dividend to buy more shares, and one that takes " +
      "dividends as cash.",
    examples:
      "Example: $10,000 in a $50 stock yielding 3.5% (paid quarterly) with 5% yearly price growth is worth " +
      "$53,268.42 after 20 years with dividends reinvested — 401.53 shares — versus $38,465.51 (shares plus cash " +
      "collected) without, a $14,802.90 difference.",
    assumptions:
      "The yield stays constant, so the dividend per share grows at the same rate as the share price. Cash " +
      "dividends are simply added up and don't earn interest. Reinvestment happens at the price on the payment " +
      "date, with no fees; taxes on dividends aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are reinvested dividends still taxed?",
        answer: "In a regular taxable account, usually yes — in most countries dividends are taxable in the year they're paid, even if you reinvest them. In tax-advantaged retirement accounts they generally aren't taxed when paid.",
      },
    ],
  },
  {
    slug: "dividend-growth-calculator",
    title: "Dividend Growth Calculator",
    description: "Project how a growing dividend increases your yearly income, your total dividends received, and your future yield on cost.",
    metaTitle: "Dividend Growth Calculator — Free & Instant",
    metaDescription: "Free dividend growth calculator. Project your future annual dividend income, total dividends received, and future yield on cost.",
    calcInputs: [
      numberField("shares", "Number of Shares", { default: 500, max: 10000000, step: 1 }),
      currencyField("currentAnnualDividend", "Current Annual Dividend Per Share", { default: 2, max: 10000, step: 0.01 }),
      percentField("dividendGrowthPercent", "Dividend Growth Rate Per Year", { default: 6, min: -50, max: 50, step: 0.1 }),
      numberField("years", "Years Ahead", { default: 10, min: 1, max: 60, step: 1 }),
      currencyField("purchasePrice", "Your Purchase Price Per Share (Optional)", { default: 50, max: 1000000, step: 0.01 }),
    ],
    calcResult: { label: "Annual Dividend Income in Final Year", format: "currency" },
    calcResults: [
      { key: "annualIncomeInYearN", label: "Annual Dividend Income in Final Year", format: "currency", highlight: true },
      { key: "dividendPerShareInYearN", label: "Dividend Per Share in Final Year", format: "currency" },
      { key: "cumulativeDividendIncome", label: "Total Dividends Received Over the Period", format: "currency" },
      { key: "yieldOnCostInYearNPercent", label: "Yield on Cost in Final Year", format: "percentage" },
    ],
    instructions:
      "Enter how many shares you own, the current yearly dividend per share, how fast you expect the dividend to " +
      "grow, how many years ahead to look, and (optionally) what you paid per share. The tool shows your yearly " +
      "dividend income at the end of the period, the total received along the way, and your yield on cost by " +
      "then.",
    examples:
      "Example: 500 shares paying $2.00 a year, with the dividend growing 6% a year, pay $1,790.85 in year 10 " +
      "($3.58 per share). You'd receive $13,971.64 in total over the 10 years, and on a $50 purchase price your " +
      "yield on cost reaches 7.16%.",
    assumptions:
      "The dividend grows by the same percentage each year, starting next year. Dividends are taken as cash, not " +
      "reinvested (see the Dividend Reinvestment Calculator for that), and your share count stays the same. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a realistic dividend growth rate?",
        answer: "It varies a lot by company. Established dividend growers have often raised payouts by around 5–10% a year, but past increases don't guarantee future ones, and dividends can be cut.",
      },
    ],
  },
  {
    slug: "portfolio-growth-calculator",
    title: "Portfolio Growth Calculator",
    description: "Project a portfolio of stocks, bonds, and cash — each growing at its own rate — and see how your allocation drifts over time.",
    metaTitle: "Portfolio Growth Calculator — Free & Instant",
    metaDescription: "Free portfolio growth calculator. Project stocks, bonds, and cash at their own return rates to see total growth and how your allocation drifts.",
    calcInputs: [
      currencyField("stocksValue", "Stocks — Current Value", { default: 60000, step: 1000 }),
      percentField("stocksReturn", "Stocks — Expected Annual Return", { default: 8, min: -30, max: 30, step: 0.1 }),
      currencyField("bondsValue", "Bonds — Current Value", { default: 30000, step: 1000 }),
      percentField("bondsReturn", "Bonds — Expected Annual Return", { default: 4, min: -30, max: 30, step: 0.1 }),
      currencyField("cashValue", "Cash — Current Value", { default: 10000, step: 1000 }),
      percentField("cashReturn", "Cash — Expected Annual Return", { default: 2, min: -30, max: 30, step: 0.1 }),
      numberField("years", "Years", { default: 15, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Ending Portfolio Value", format: "currency" },
    calcResults: [
      { key: "endingTotal", label: "Ending Portfolio Value", format: "currency", highlight: true },
      { key: "endingStocks", label: "Stocks", format: "currency" },
      { key: "endingBonds", label: "Bonds", format: "currency" },
      { key: "endingCash", label: "Cash", format: "currency" },
      { key: "blendedAnnualReturnPercent", label: "Blended Annual Return", format: "percentage" },
      { key: "endingStockAllocationPercent", label: "Stocks as % of Portfolio at End", format: "percentage" },
    ],
    instructions:
      "Enter the current value and expected yearly return for each part of your portfolio, and the number of " +
      "years. Each part grows at its own rate with no rebalancing, so the tool shows both the total value and " +
      "how your mix shifts over time — usually toward whatever grows fastest.",
    examples:
      "Example: $60,000 in stocks at 8%, $30,000 in bonds at 4%, and $10,000 in cash at 2% grows to $257,817.14 " +
      "in 15 years — a blended 6.52% a year. Stocks drift from 60% to 73.82% of the portfolio.",
    assumptions:
      "Each asset class grows at a steady rate compounded once a year, with no deposits, withdrawals, fees, or " +
      "taxes. Use the Portfolio Rebalancing Calculator to see the trades that would bring the mix back to " +
      "target. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does my allocation change on its own?",
        answer: "Because the parts grow at different speeds. Over time the fastest-growing part — usually stocks — makes up more of the portfolio, which also makes the portfolio riskier than you originally planned.",
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
