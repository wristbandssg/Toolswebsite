// One-time (but safe to re-run) batch setup script: creates the Tokens & Market Analysis tools
// (9) of the Crypto Calculators expansion, filed under Crypto
// Calculators > Crypto Market, Tax & Security Calculators (both categories are created on first run).
// See src/lib/calc-engine-crypto-market.ts for the math and
// src/lib/calc-engine-crypto-trading.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-crypto-market-calculators.ts
// or
//   npm run db:create-crypto-market-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Crypto Calculators", slug: "crypto-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Crypto Market, Tax & Security Calculators", slug: "crypto-market-tax-security-calculators" };

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
  "This tool provides general estimates for informational purposes only and isn't financial, investment or " +
  "tax advice. Crypto assets are highly volatile and can lose all their value; fees, rates and rules vary by " +
  "platform, network and country — check current figures before you act.";

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
    slug: "token-vesting-schedule-calculator",
    title: "Token Vesting Schedule Calculator",
    description: "Work out how many tokens are unlocked at any month of a vesting schedule — TGE unlock, cliff and linear vesting — and their value.",
    metaTitle: "Token Vesting Schedule Calculator — Cliff & Unlocks",
    metaDescription: "Free token vesting calculator. See unlocked and locked tokens at any month with TGE unlock, cliff and linear vesting.",
    calcInputs: [
      numberField("totalTokens", "Total Token Allocation", { default: 100000, min: 0, max: 1000000000000, step: 100 }),
      currencyField("tokenPrice", "Token Price", { default: 0.5, max: 1000000, step: 0.01 }),
      percentField("tgeUnlockPercent", "Unlocked at Launch (TGE)", { default: 10, max: 100, step: 1 }),
      numberField("cliffMonths", "Cliff (Months)", { default: 12, min: 0, max: 120, step: 1 }),
      numberField("vestingMonths", "Linear Vesting After the Cliff (Months)", { default: 36, min: 1, max: 240, step: 1 }),
      numberField("monthsElapsed", "Months Since Launch", { default: 18, min: 0, max: 360, step: 1 }),
    ],
    calcResult: { label: "Unlocked Tokens", format: "number" },
    calcResults: [
      { key: "unlockedTokens", label: "Unlocked Tokens", format: "number", highlight: true },
      { key: "unlockedPercent", label: "Unlocked", format: "percentage" },
      { key: "unlockedValue", label: "Unlocked Value", format: "currency" },
      { key: "lockedTokens", label: "Still Locked", format: "number" },
      { key: "monthlyUnlockAfterCliff", label: "Tokens Unlocked per Month After Cliff", format: "number" },
      { key: "fullyVestedAtMonth", label: "Fully Vested at Month", format: "number" },
    ],
    instructions:
      "Team, investor and grant tokens usually vest over time: part may unlock at the token generation event (TGE), " +
      "nothing more unlocks until the cliff, then the rest unlocks in equal monthly amounts.\n\n" +
      "Large scheduled unlocks add selling pressure — traders watch unlock calendars closely.",
    examples:
      "Example: of 100,000 tokens with a 10% TGE unlock, a 12-month cliff and 36 months of vesting, " +
      "25,000 (25%) are unlocked after 18 months — worth $12,500.",
    assumptions:
      "Linear monthly vesting starting at the end of the cliff. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are vested tokens taxed?",
        answer: "Tokens received as pay are generally income when they vest or when you gain control of them, at their value then.",
      },
    ],
  },
  {
    slug: "token-inflation-burn-calculator",
    title: "Token Inflation and Burn Calculator",
    description: "Project a token's supply from its yearly emission (inflation) and burn rate, and what supply changes alone do to its price at the same market cap.",
    metaTitle: "Token Inflation & Burn Calculator — Supply & Price",
    metaDescription: "Free token inflation calculator. Project supply from emissions and burns and the price impact at a constant market cap.",
    calcInputs: [
      numberField("supply", "Circulating Supply", { default: 1000000000, min: 0, max: 1e15, step: 1000000 }),
      percentField("emissionPercent", "Yearly Emission (Inflation)", { default: 5, max: 1000, step: 0.1 }),
      percentField("burnPercent", "Yearly Burn", { default: 2, max: 100, step: 0.1 }),
      numberField("years", "Years", { default: 3, min: 0, max: 100, step: 1 }),
      currencyField("price", "Token Price Today", { default: 1, max: 1000000, step: 0.01 }),
    ],
    calcResult: { label: "Price at the Same Market Cap", format: "currency" },
    calcResults: [
      { key: "netInflationPercent", label: "Net Yearly Supply Change", format: "percentage" },
      { key: "supplyAfterYears", label: "Supply After the Years", format: "number" },
      { key: "tokensBurned", label: "Tokens Burned", format: "number" },
      { key: "priceAtSameMarketCap", label: "Price at the Same Market Cap", format: "currency", highlight: true, decimals: 4 },
      { key: "priceChangeFromSupplyPercent", label: "Price Change from Supply Alone", format: "percentage" },
    ],
    instructions:
      "New tokens issued as staking or mining rewards dilute existing holders; tokens burned (destroyed, often from " +
      "fees) shrink supply. If the total market value stays the same, price moves opposite to supply.\n\n" +
      "Burns only raise the price if demand holds — supply is just one side of the equation.",
    examples:
      "Example: with 5% yearly emission and a 2% burn, supply grows 3% a year to 1,092,727,000 in " +
      "3 years. At the same market cap, a $1 token would be worth $0.92.",
    assumptions:
      "Constant rates compounding yearly; market cap unchanged. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a deflationary token a good investment?",
        answer: "Falling supply helps only if people keep wanting the token — many burn-focused tokens have still lost value.",
      },
    ],
  },
  {
    slug: "crypto-market-cap-comparison-calculator",
    title: "Crypto Market Cap Comparison Calculator",
    description: "See what a coin's price would be if it reached another coin's market cap, the multiple from today, and its share (dominance) of the total crypto market.",
    metaTitle: "Crypto Market Cap Calculator — Price at Another Cap",
    metaDescription: "Free market cap comparison calculator. Find a coin's price at a target market cap and its crypto market dominance.",
    calcInputs: [
      currencyField("price", "Coin Price Today", { default: 0.5, max: 10000000, step: 0.0001 }),
      numberField("circulatingSupply", "Circulating Supply", { default: 35000000000, min: 0, max: 1e15, step: 1000000 }),
      currencyField("targetMarketCap", "Target Market Cap (e.g., Ethereum's)", { default: 1200000000000, max: 1e15, step: 1000000000 }),
      currencyField("totalMarketCap", "Total Crypto Market Cap", { default: 2400000000000, max: 1e15, step: 10000000000 }),
    ],
    calcResult: { label: "Price at the Target Market Cap", format: "currency" },
    calcResults: [
      { key: "currentMarketCap", label: "Current Market Cap", format: "currency" },
      { key: "priceAtTargetMarketCap", label: "Price at the Target Market Cap", format: "currency", highlight: true, decimals: 4 },
      { key: "multipleFromToday", label: "Multiple from Today (x)", format: "number" },
      { key: "currentDominancePercent", label: "Current Market Dominance", format: "percentage" },
      { key: "dominanceAtTargetPercent", label: "Dominance at the Target Cap", format: "percentage" },
    ],
    instructions:
      "Market cap = price × circulating supply. Comparing caps is more meaningful than comparing prices: a coin with a " +
      "huge supply can't reach a high price without an enormous market cap. Dominance is a coin's share of the whole " +
      "crypto market — Bitcoin dominance is widely watched.\n\n" +
      "Fully diluted value (all future tokens) can be much larger than today's market cap.",
    examples:
      "Example: a $0.50 coin with 35,000,000,000 tokens has a $17,500,000,000 market cap. At a $1,200,000,000,000 cap it would trade at " +
      "$34.29 — 68.57x today.",
    assumptions:
      "Supply unchanged; the rest of the market stays the same size. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is Bitcoin dominance?",
        answer: "Bitcoin's market cap as a share of all crypto. Falling dominance often accompanies an \"altcoin season.\"",
      },
    ],
  },
  {
    slug: "dao-governance-token-value-calculator",
    title: "DAO Governance Token Value Calculator",
    description: "Value your DAO governance tokens: holding value, voting power, your share of the treasury and the price-to-treasury ratio, plus the tokens needed for quorum.",
    metaTitle: "DAO Governance Token Calculator — Voting Power & Treasury",
    metaDescription: "Free DAO governance token calculator. Find voting power, treasury value per token and quorum requirements.",
    calcInputs: [
      numberField("tokensHeld", "Tokens You Hold", { default: 5000, min: 0, max: 1e12, step: 100 }),
      numberField("totalSupply", "Total Token Supply", { default: 100000000, min: 1, max: 1e15, step: 1000000 }),
      currencyField("tokenPrice", "Token Price", { default: 2, max: 1000000, step: 0.01 }),
      currencyField("treasuryValue", "DAO Treasury Value", { default: 500000000, max: 1e13, step: 1000000 }),
      percentField("quorumPercent", "Quorum (% of Supply)", { default: 4, max: 100, step: 0.5 }),
      percentField("turnoutPercent", "Typical Voting Turnout (% of Supply)", { default: 10, max: 100, step: 1 }),
    ],
    calcResult: { label: "Holding Value", format: "currency" },
    calcResults: [
      { key: "holdingValue", label: "Holding Value", format: "currency", highlight: true },
      { key: "votingPowerPercent", label: "Voting Power (% of Supply)", format: "percentage", decimals: 4 },
      { key: "treasuryPerToken", label: "Treasury per Token", format: "currency", decimals: 4 },
      { key: "yourTreasuryShare", label: "Your Share of the Treasury", format: "currency" },
      { key: "priceToTreasuryRatio", label: "Price-to-Treasury Ratio", format: "number" },
      { key: "tokensNeededForQuorum", label: "Tokens Needed for Quorum", format: "number" },
      { key: "shareOfTypicalVotePercent", label: "Your Share of a Typical Vote", format: "percentage", decimals: 4 },
    ],
    instructions:
      "Governance tokens let holders vote on a DAO's proposals and treasury. A price-to-treasury ratio below 1 means the " +
      "market values the token below the treasury it governs — though holders usually have no direct claim on that " +
      "treasury.\n\n" +
      "Because turnout is often low, a modest holding can carry more weight in a typical vote than its share of supply.",
    examples:
      "Example: 5,000 tokens at $2 are worth $10,000. With a $500,000,000 treasury, each token is backed by $5 — " +
      "a price-to-treasury ratio of 0.40.",
    assumptions:
      "Treasury valued at face value; delegated votes ignored. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I redeem governance tokens for treasury assets?",
        answer: "Usually not — only if the DAO has a redemption mechanism or votes to distribute its treasury.",
      },
    ],
  },
  {
    slug: "crypto-index-fund-return-calculator",
    title: "Crypto Index Fund Return Calculator",
    description: "Estimate a crypto index fund's return from its holdings and weights, compare market-cap weighting with equal weighting, and see the effect of the expense ratio.",
    metaTitle: "Crypto Index Fund Calculator — Weighting & Fees",
    metaDescription: "Free crypto index fund calculator. Compare market-cap and equal-weighted returns and the impact of fund fees.",
    calcInputs: [
      currencyField("investment", "Amount Invested", { default: 10000, max: 1000000000, step: 100 }),
      numberField("years", "Years", { default: 1, min: 0, max: 50, step: 1 }),
      percentField("expenseRatioPercent", "Expense Ratio", { default: 2.5, max: 10, step: 0.05 }),
      percentField("weight1", "Asset 1 Weight (e.g., BTC)", { default: 60, max: 100, step: 1 }),
      numberField("return1", "Asset 1 Return (%)", { default: 50, min: -100, max: 100000, step: 5 }),
      percentField("weight2", "Asset 2 Weight (e.g., ETH)", { default: 25, max: 100, step: 1 }),
      numberField("return2", "Asset 2 Return (%)", { default: 80, min: -100, max: 100000, step: 5 }),
      percentField("weight3", "Asset 3 Weight", { default: 10, max: 100, step: 1 }),
      numberField("return3", "Asset 3 Return (%)", { default: 120, min: -100, max: 100000, step: 5 }),
      percentField("weight4", "Asset 4 Weight", { default: 5, max: 100, step: 1 }),
      numberField("return4", "Asset 4 Return (%)", { default: -20, min: -100, max: 100000, step: 5 }),
    ],
    calcResult: { label: "Market-Cap Weighted Value After Fees", format: "currency" },
    calcResults: [
      { key: "capWeightedReturnPercent", label: "Market-Cap Weighted Return", format: "percentage" },
      { key: "equalWeightedReturnPercent", label: "Equal-Weighted Return", format: "percentage" },
      { key: "capWeightedValueAfterFees", label: "Market-Cap Weighted Value After Fees", format: "currency", highlight: true },
      { key: "equalWeightedValueAfterFees", label: "Equal-Weighted Value After Fees", format: "currency" },
      { key: "feesPaidApprox", label: "Fees Paid (Approx.)", format: "currency" },
      { key: "weightingDifference", label: "Market-Cap vs Equal Weighting", format: "currency" },
    ],
    instructions:
      "Crypto index funds hold a basket of coins, usually weighted by market cap — so Bitcoin and Ethereum dominate. " +
      "Equal weighting gives smaller coins more influence, which helps in altcoin rallies and hurts when they lag. Crypto " +
      "index products often charge 1–2.5% a year.\n\n" +
      "Weights are rescaled if they don't add up to 100%.",
    examples:
      "Example: with the weights shown, the index returns 61% versus 57.50% equal-weighted. After a " +
      "2.50% fee, $10,000 grows to $15,697.50.",
    assumptions:
      "Returns for the whole period; no rebalancing during it; fee taken from the ending value. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are spot Bitcoin ETFs cheaper than crypto index funds?",
        answer: "Usually — single-asset spot ETFs often charge under 0.3% a year, far less than many multi-coin index products.",
      },
    ],
  },
  {
    slug: "crypto-diversification-score-calculator",
    title: "Crypto Portfolio Diversification Score Calculator",
    description: "Score how diversified your crypto portfolio is from up to six holdings — concentration index, effective number of holdings and largest position.",
    metaTitle: "Crypto Diversification Calculator — Portfolio Score",
    metaDescription: "Free crypto diversification calculator. Score portfolio concentration, effective holdings and your largest position.",
    calcInputs: [
      currencyField("value1", "Holding 1 Value", { default: 7000, max: 1e12, step: 100 }),
      currencyField("value2", "Holding 2 Value", { default: 3000, max: 1e12, step: 100 }),
      currencyField("value3", "Holding 3 Value", { default: 2000, max: 1e12, step: 100 }),
      currencyField("value4", "Holding 4 Value", { default: 1000, max: 1e12, step: 100, required: false }),
      currencyField("value5", "Holding 5 Value", { default: 500, max: 1e12, step: 100, required: false }),
      currencyField("value6", "Holding 6 Value", { default: 500, max: 1e12, step: 100, required: false }),
    ],
    calcResult: { label: "Diversification Score (0–100)", format: "number" },
    calcResults: [
      { key: "totalValue", label: "Total Value", format: "currency" },
      { key: "largestHoldingPercent", label: "Largest Holding", format: "percentage" },
      { key: "topTwoPercent", label: "Top Two Holdings", format: "percentage" },
      { key: "concentrationIndex", label: "Concentration Index (HHI)", format: "number", decimals: 4 },
      { key: "effectiveNumberOfHoldings", label: "Effective Number of Holdings", format: "number" },
      { key: "diversificationScore", label: "Diversification Score (0–100)", format: "number", highlight: true },
    ],
    instructions:
      "The concentration index (Herfindahl) adds up each holding's share squared: 1 means everything in one coin. Its " +
      "inverse is the effective number of equal-sized holdings. The score rises as money spreads more evenly.\n\n" +
      "Crypto assets tend to move together, so even a diversified crypto portfolio is still a concentrated bet on crypto.",
    examples:
      "Example: a $14,000 portfolio with 50% in one coin behaves like 3.09 equal holdings, for a score of " +
      "67.60.",
    assumptions:
      "Measures concentration only, not correlation. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do stablecoins count toward diversification?",
        answer: "They lower concentration and volatility, but they're cash-like and carry their own issuer and depeg risks.",
      },
    ],
  },
  {
    slug: "crypto-return-comparison-calculator",
    title: "Crypto vs Stocks vs Gold Return Comparison Calculator",
    description: "Compare how the same investment would grow in Bitcoin, altcoins, stocks and gold at the yearly returns you expect — including altcoin season scenarios.",
    metaTitle: "Crypto vs Stocks vs Gold Calculator — Return Comparison",
    metaDescription: "Free calculator comparing Bitcoin, altcoins, stocks and gold returns on the same investment over time.",
    calcInputs: [
      currencyField("investment", "Amount Invested", { default: 10000, max: 1000000000, step: 100 }),
      numberField("years", "Years", { default: 5, min: 0, max: 50, step: 1 }),
      numberField("bitcoinReturn", "Bitcoin Yearly Return (%)", { default: 30, min: -100, max: 1000, step: 1 }),
      numberField("altcoinReturn", "Altcoin Basket Yearly Return (%)", { default: 15, min: -100, max: 1000, step: 1 }),
      numberField("stocksReturn", "Stocks Yearly Return (%)", { default: 10, min: -100, max: 1000, step: 1 }),
      numberField("goldReturn", "Gold Yearly Return (%)", { default: 6, min: -100, max: 1000, step: 1 }),
    ],
    calcResult: { label: "Best Ending Value", format: "currency" },
    calcResults: [
      { key: "bitcoinValue", label: "Bitcoin", format: "currency" },
      { key: "altcoinValue", label: "Altcoins", format: "currency" },
      { key: "stocksValue", label: "Stocks", format: "currency" },
      { key: "goldValue", label: "Gold", format: "currency" },
      { key: "bestValue", label: "Best Ending Value", format: "currency", highlight: true },
      { key: "bitcoinVsStocks", label: "Bitcoin vs Stocks", format: "currency" },
      { key: "altcoinsVsBitcoin", label: "Altcoins vs Bitcoin", format: "currency" },
    ],
    instructions:
      "Enter the average yearly return you expect from each asset to compare where the same money could end up. " +
      "Crypto's past returns have been far higher than stocks or gold — and far more volatile, with drops of 70% or more. " +
      "In an \"altcoin season\" altcoins beat Bitcoin; in most other periods they've lagged.\n\n" +
      "Average returns hide the ride: try a bad year in your assumptions to stress-test.",
    examples:
      "Example: $10,000 for 5 years grows to $37,129.30 at 30% a year in Bitcoin, $16,105.10 in stocks at 10% " +
      "and $13,382.26 in gold at 6%.",
    assumptions:
      "Constant yearly returns; fees and taxes not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is Bitcoin \"digital gold\"?",
        answer: "Some investors treat it that way, but its price has been much more volatile than gold and often moves with stocks.",
      },
    ],
  },
  {
    slug: "crypto-stock-correlation-calculator",
    title: "Crypto Correlation to Stock Market Calculator",
    description: "Measure how closely a crypto asset moves with the stock market from six months of returns — correlation, R-squared and beta.",
    metaTitle: "Crypto Correlation Calculator — Bitcoin vs Stocks",
    metaDescription: "Free crypto correlation calculator. Find the correlation, R-squared and beta between crypto and stock returns.",
    calcInputs: [
      numberField("crypto1", "Crypto Return — Month 1 (%)", { default: 5, min: -100, max: 1000, step: 0.5 }),
      numberField("stock1", "Stock Return — Month 1 (%)", { default: 3, min: -100, max: 1000, step: 0.5 }),
      numberField("crypto2", "Crypto Return — Month 2 (%)", { default: -8, min: -100, max: 1000, step: 0.5 }),
      numberField("stock2", "Stock Return — Month 2 (%)", { default: -2, min: -100, max: 1000, step: 0.5 }),
      numberField("crypto3", "Crypto Return — Month 3 (%)", { default: 12, min: -100, max: 1000, step: 0.5 }),
      numberField("stock3", "Stock Return — Month 3 (%)", { default: 1, min: -100, max: 1000, step: 0.5 }),
      numberField("crypto4", "Crypto Return — Month 4 (%)", { default: -3, min: -100, max: 1000, step: 0.5 }),
      numberField("stock4", "Stock Return — Month 4 (%)", { default: 2, min: -100, max: 1000, step: 0.5 }),
      numberField("crypto5", "Crypto Return — Month 5 (%)", { default: 9, min: -100, max: 1000, step: 0.5 }),
      numberField("stock5", "Stock Return — Month 5 (%)", { default: 1, min: -100, max: 1000, step: 0.5 }),
      numberField("crypto6", "Crypto Return — Month 6 (%)", { default: -6, min: -100, max: 1000, step: 0.5 }),
      numberField("stock6", "Stock Return — Month 6 (%)", { default: -3, min: -100, max: 1000, step: 0.5 }),
    ],
    calcResult: { label: "Correlation", format: "number" },
    calcResults: [
      { key: "correlation", label: "Correlation", format: "number", highlight: true, decimals: 4 },
      { key: "rSquared", label: "R-Squared", format: "number", decimals: 4 },
      { key: "cryptoAverageReturn", label: "Crypto Average Monthly Return", format: "percentage" },
      { key: "stockAverageReturn", label: "Stock Average Monthly Return", format: "percentage" },
      { key: "betaToStocks", label: "Beta to Stocks", format: "number" },
    ],
    instructions:
      "Correlation runs from −1 (opposite moves) to +1 (moving together). Bitcoin's correlation with stocks has varied a " +
      "lot, rising during periods of market stress. Beta shows how much the crypto asset moves for each 1% move in stocks.\n\n" +
      "Six months is a small sample — use as many months as you can find for a reliable figure.",
    examples:
      "Example: with the sample returns shown, crypto's correlation with stocks is 0.63, and its beta of 2.23 means it moved about " +
      "2.23x as much as stocks.",
    assumptions:
      "Pearson correlation of simple monthly returns. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does crypto diversify a stock portfolio?",
        answer: "Only when its correlation with stocks is low — and that relationship has changed over time.",
      },
    ],
  },
  {
    slug: "crypto-volatility-comparison-calculator",
    title: "Crypto Volatility Comparison Calculator",
    description: "Compare the volatility of a crypto asset with stocks or another asset — annualized volatility and the typical monthly and yearly swing on your investment.",
    metaTitle: "Crypto Volatility Calculator — Compare with Stocks",
    metaDescription: "Free crypto volatility calculator. Annualize daily volatility and compare typical price swings with stocks or other assets.",
    calcInputs: [
      percentField("dailyVolA", "Asset A Daily Volatility (e.g., Bitcoin)", { default: 3.5, max: 50, step: 0.1 }),
      numberField("tradingDaysA", "Asset A Trading Days per Year", { default: 365, min: 1, max: 366, step: 1 }),
      percentField("dailyVolB", "Asset B Daily Volatility (e.g., S&P 500)", { default: 1.1, max: 50, step: 0.1 }),
      numberField("tradingDaysB", "Asset B Trading Days per Year", { default: 252, min: 1, max: 366, step: 1 }),
      currencyField("investment", "Amount Invested", { default: 10000, max: 1000000000, step: 100 }),
    ],
    calcResult: { label: "Volatility Ratio (A ÷ B)", format: "number" },
    calcResults: [
      { key: "annualVolatilityA", label: "Asset A Annual Volatility", format: "percentage" },
      { key: "annualVolatilityB", label: "Asset B Annual Volatility", format: "percentage" },
      { key: "volatilityRatio", label: "Volatility Ratio (A ÷ B)", format: "number", highlight: true },
      { key: "typicalMonthlyMoveA", label: "Typical Monthly Swing — A", format: "currency" },
      { key: "typicalMonthlyMoveB", label: "Typical Monthly Swing — B", format: "currency" },
      { key: "typicalYearlyMoveA", label: "Typical Yearly Swing — A", format: "currency" },
      { key: "typicalYearlyMoveB", label: "Typical Yearly Swing — B", format: "currency" },
    ],
    instructions:
      "Volatility is the standard deviation of returns. Daily volatility scales to a year by the square root of trading " +
      "days — crypto trades every day, stocks about 252 days. A one-standard-deviation swing happens roughly two years " +
      "in three; bigger moves are common in crypto.\n\n" +
      "Measure daily volatility from recent price data or use an exchange's volatility index.",
    examples:
      "Example: 3.50% daily volatility becomes 66.87% a year — 3.83x a stock index at 17.46%. On $10,000, a " +
      "typical yearly swing is $6,686.74 versus $1,746.20.",
    assumptions:
      "Returns independent from day to day. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is Bitcoin getting less volatile?",
        answer: "Its volatility has generally trended lower as the market has grown, but it remains several times that of major stock indexes.",
      },
    ],
  },
];

// Crypto Calculators (and its sub-categories) are created on first use, under
// Finance Calculators.
async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  let parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY.slug } });
  if (!parent) {
    const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
    if (!finance) {
      throw new Error(
        `The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
          "then re-run this script."
      );
    }
    console.log(`Creating category "${PARENT_CATEGORY.name}" under "${finance.name}".`);
    parent = await prisma.toolCategory.create({
      data: { name: PARENT_CATEGORY.name, slug: PARENT_CATEGORY.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  console.log(`Creating sub-category "${CATEGORY.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory();

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
