// One-time (but safe to re-run) batch setup script: creates the Staking, DeFi & Yield tools
// (10) of the Crypto Calculators expansion, filed under Crypto
// Calculators > Crypto Staking, DeFi & Mining Calculators (both categories are created on first run).
// See src/lib/calc-engine-crypto-staking-defi.ts for the math and
// src/lib/calc-engine-crypto-trading.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-crypto-staking-defi-calculators.ts
// or
//   npm run db:create-crypto-staking-defi-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Crypto Calculators", slug: "crypto-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Crypto Staking, DeFi & Mining Calculators", slug: "crypto-staking-defi-mining-calculators" };

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
    slug: "crypto-staking-reward-calculator",
    title: "Crypto Staking Reward Calculator",
    description: "Calculate crypto staking rewards for Ethereum, Solana, Cardano and other proof-of-stake coins after validator commission, with compounding and a future price.",
    metaTitle: "Crypto Staking Calculator — Staking Rewards & APY",
    metaDescription: "Free crypto staking calculator. Estimate staking rewards and APY after validator commission, with compounding and price changes.",
    calcInputs: [
      numberField("stakedCoins", "Coins Staked", { default: 10, min: 0, max: 1000000000, step: 0.1 }),
      currencyField("coinPrice", "Coin Price Today", { default: 3500, max: 10000000, step: 0.01 }),
      percentField("aprPercent", "Staking APR", { default: 4, max: 100, step: 0.1 }),
      percentField("commissionPercent", "Validator Commission", { default: 5, max: 100, step: 1 }),
      {
        key: "compounding", label: "Rewards Restaked", type: "dropdown", required: true, default: 1,
        options: [
          { label: "No (Simple)", value: 1 },
          { label: "Monthly", value: 2 },
          { label: "Daily", value: 3 },
        ],
      },
      numberField("years", "Years", { default: 1, min: 0, max: 50, step: 0.5 }),
      numberField("priceChangePercent", "Coin Price Change by Then (%)", { default: 0, min: -100, max: 10000, step: 5 }),
    ],
    calcResult: { label: "Reward Value", format: "currency" },
    calcResults: [
      { key: "netAprPercent", label: "Net APR After Commission", format: "percentage" },
      { key: "apyPercent", label: "APY", format: "percentage" },
      { key: "rewardCoins", label: "Reward Coins", format: "number", decimals: 8 },
      { key: "rewardValue", label: "Reward Value", format: "currency", highlight: true },
      { key: "totalValue", label: "Total Staked Value", format: "currency" },
      { key: "averageMonthlyReward", label: "Average Monthly Reward", format: "currency" },
    ],
    instructions:
      "Staking locks coins to help secure a proof-of-stake network in return for new coins. Rewards are quoted as an APR; " +
      "validators keep a commission, and restaking rewards turns APR into a higher APY. Your dollar return also depends " +
      "on the coin's price, which can fall more than you earn.\n\n" +
      "Some networks have unbonding periods when you can't sell. In the US, staking rewards are taxed as income when received.",
    examples:
      "Example: staking 10 coins at 4% with a 5% commission earns 0.38 coins a year — $1,330 at " +
      "$3,500.",
    assumptions:
      "Constant APR and commission; price change applied at the end. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I lose staked coins?",
        answer: "Delegators can lose a small share if their validator is slashed for misbehavior, and the coin's price can fall.",
      },
    ],
  },
  {
    slug: "crypto-validator-revenue-calculator",
    title: "Crypto Validator and Node Operator Revenue Calculator",
    description: "Estimate the yearly revenue of running a proof-of-stake validator or node — own-stake rewards, commission on delegated stake, server costs and slashing risk.",
    metaTitle: "Validator Revenue Calculator — Node Operator Profit",
    metaDescription: "Free validator and node operator calculator. Estimate staking rewards, commission, server costs and slashing risk.",
    calcInputs: [
      numberField("selfStakeCoins", "Your Own Stake (Coins)", { default: 32, min: 0, max: 100000000, step: 1 }),
      currencyField("coinPrice", "Coin Price", { default: 3500, max: 10000000, step: 0.01 }),
      percentField("rewardAprPercent", "Network Reward APR", { default: 3.5, max: 100, step: 0.1 }),
      percentField("uptimePercent", "Uptime / Effectiveness", { default: 99, max: 100, step: 0.5 }),
      numberField("delegatedCoins", "Stake Delegated to You (Coins)", { default: 0, min: 0, max: 1000000000, step: 1, required: false }),
      percentField("commissionPercent", "Your Commission on Delegators' Rewards", { default: 10, max: 100, step: 1 }),
      currencyField("serverCostMonthly", "Server & Hosting Cost per Month", { default: 100, max: 100000, step: 5 }),
      percentField("slashingRiskPercent", "Expected Slashing Loss per Year (% of Stake)", { default: 0.1, max: 100, step: 0.05 }),
    ],
    calcResult: { label: "Net Yearly Revenue", format: "currency" },
    calcResults: [
      { key: "selfStakeValue", label: "Value of Your Stake", format: "currency" },
      { key: "ownStakeRewards", label: "Rewards on Your Stake", format: "currency" },
      { key: "commissionIncome", label: "Commission Income", format: "currency" },
      { key: "yearlyCosts", label: "Yearly Costs", format: "currency" },
      { key: "expectedSlashingLoss", label: "Expected Slashing Loss", format: "currency" },
      { key: "netYearlyRevenue", label: "Net Yearly Revenue", format: "currency", highlight: true },
      { key: "netAprOnStake", label: "Net APR on Your Stake", format: "percentage" },
    ],
    instructions:
      "Running your own validator (for example 32 ETH on Ethereum) keeps all the rewards but adds server costs, the " +
      "need for near-perfect uptime, and slashing risk if the node misbehaves. On networks with delegation, operators " +
      "also earn a commission on stake others delegate to them.\n\n" +
      "Missed duties reduce rewards; serious faults such as double-signing are slashed.",
    examples:
      "Example: a 32-coin validator worth $112,000 earning 3.50% with 99% uptime makes $3,880.80; " +
      "after $1,200 of server costs and expected slashing, it nets $2,568.80 — 2.29% on stake.",
    assumptions:
      "Constant rewards and price; hardware bought upfront not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need 32 ETH to stake?",
        answer: "To run a solo Ethereum validator, yes; with less you can use a pool, an exchange or liquid staking.",
      },
    ],
  },
  {
    slug: "liquid-staking-return-calculator",
    title: "Liquid Staking Return Calculator",
    description: "Estimate the return from liquid staking — staking rewards after the protocol fee plus extra DeFi yield on the liquid staking token — versus staking directly.",
    metaTitle: "Liquid Staking Calculator — LST Returns vs Native Staking",
    metaDescription: "Free liquid staking calculator. Estimate liquid staking token returns after protocol fees plus DeFi yield vs native staking.",
    calcInputs: [
      currencyField("amount", "Amount Staked", { default: 10000, max: 1000000000, step: 100 }),
      percentField("stakingAprPercent", "Underlying Staking APR", { default: 3.5, max: 50, step: 0.1 }),
      percentField("protocolFeePercent", "Protocol Fee (Share of Rewards)", { default: 10, max: 50, step: 1 }),
      percentField("defiYieldPercent", "Extra DeFi Yield on the Token", { default: 2, max: 100, step: 0.25, required: false }),
      percentField("exitDiscountPercent", "Discount If You Sell the Token Early", { default: 0.2, max: 20, step: 0.05, required: false }),
      numberField("years", "Years", { default: 1, min: 0, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Earnings", format: "currency" },
    calcResults: [
      { key: "netStakingApr", label: "Staking APR After Fee", format: "percentage" },
      { key: "combinedApr", label: "Combined APR", format: "percentage" },
      { key: "valueAfterYears", label: "Value After the Years", format: "currency" },
      { key: "earnings", label: "Earnings", format: "currency", highlight: true },
      { key: "advantageVsNativeStaking", label: "Advantage vs Native Staking", format: "currency" },
      { key: "costToExitAtDiscount", label: "Cost to Exit at a Discount", format: "currency" },
    ],
    instructions:
      "Liquid staking protocols stake your coins and give you a token (such as stETH or rETH) that earns the staking " +
      "rewards and can be traded or used in DeFi. The protocol keeps a share of rewards. Using the token in DeFi adds " +
      "yield — and smart-contract risk.\n\n" +
      "You can exit instantly by selling the token, sometimes slightly below the value of the staked coins.",
    examples:
      "Example: liquid staking $10,000 at 3.50% with a 10% fee yields 3.15%; adding 2% of DeFi " +
      "yield makes 5.15% — $515 a year.",
    assumptions:
      "Yields compound yearly and stay constant. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is liquid staking riskier than regular staking?",
        answer: "It adds smart-contract and depeg risk on top of the network's own staking risks.",
      },
    ],
  },
  {
    slug: "crypto-restaking-return-calculator",
    title: "Crypto Restaking Return Calculator",
    description: "Estimate the return from restaking staked ETH to secure extra services: base staking plus restaking rewards, less operator fees and expected slashing losses.",
    metaTitle: "Crypto Restaking Calculator — Rewards vs Slashing Risk",
    metaDescription: "Free restaking calculator. Estimate extra restaking yield after operator fees and the expected loss from slashing.",
    calcInputs: [
      currencyField("stakeValue", "Value Restaked", { default: 10000, max: 1000000000, step: 100 }),
      percentField("baseAprPercent", "Base Staking APR", { default: 3.5, max: 50, step: 0.1 }),
      percentField("restakingAprPercent", "Extra Restaking APR", { default: 2.5, max: 100, step: 0.25 }),
      percentField("operatorFeePercent", "Operator Fee on Restaking Rewards", { default: 10, max: 100, step: 1 }),
      percentField("slashingChancePercent", "Chance of a Slashing Event per Year", { default: 1, max: 100, step: 0.5 }),
      percentField("slashingLossPercent", "Stake Lost If Slashed", { default: 5, max: 100, step: 1 }),
    ],
    calcResult: { label: "Net Expected Return", format: "currency" },
    calcResults: [
      { key: "baseStakingRewards", label: "Base Staking Rewards", format: "currency" },
      { key: "restakingRewards", label: "Restaking Rewards After Fee", format: "currency" },
      { key: "expectedSlashingLoss", label: "Expected Slashing Loss", format: "currency" },
      { key: "netExpectedReturn", label: "Net Expected Return", format: "currency", highlight: true },
      { key: "netExpectedApr", label: "Net Expected APR", format: "percentage" },
      { key: "extraVsPlainStaking", label: "Extra vs Plain Staking", format: "currency" },
    ],
    instructions:
      "Restaking reuses staked ETH (or liquid staking tokens) to secure additional services, earning extra rewards — " +
      "often paid in points or new tokens of uncertain value. In return, the stake can be slashed if an operator " +
      "misbehaves on any of those services.\n\n" +
      "Expected slashing loss = chance of slashing × share lost. Real risks are hard to estimate for new protocols.",
    examples:
      "Example: restaking $10,000 earns $350 of base staking and $225 of restaking rewards. After an expected " +
      "$5 slashing loss, it nets $570 (5.70%).",
    assumptions:
      "Rewards valued at face value; one slashing event at most per year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is slashing?",
        answer: "A penalty that destroys part of a validator's stake when it breaks the network's rules, such as signing conflicting messages.",
      },
    ],
  },
  {
    slug: "yield-farming-apy-calculator",
    title: "Yield Farming APY Calculator",
    description: "Convert a yield farm's APR to APY with compounding (or an auto-compounding yield aggregator), after performance fees and changes in the reward token's price.",
    metaTitle: "Yield Farming APY Calculator — APR to APY & Aggregators",
    metaDescription: "Free yield farming calculator. Convert farm APR to APY with compounding, aggregator fees and reward token price changes.",
    calcInputs: [
      currencyField("deposit", "Amount Deposited", { default: 10000, max: 1000000000, step: 100 }),
      percentField("aprPercent", "Farm APR", { default: 20, max: 10000, step: 1 }),
      {
        key: "compounding", label: "Compounding", type: "dropdown", required: true, default: 3,
        options: [
          { label: "None (Claim Rewards Only)", value: 1 },
          { label: "Monthly", value: 2 },
          { label: "Daily (Auto-Compounding Aggregator)", value: 3 },
        ],
      },
      percentField("performanceFeePercent", "Aggregator Performance Fee", { default: 10, max: 50, step: 1, required: false }),
      numberField("rewardTokenChangePercent", "Reward Token Price Change (%)", { default: 0, min: -100, max: 10000, step: 5 }),
      numberField("days", "Days Farming", { default: 365, min: 0, max: 3650, step: 1 }),
    ],
    calcResult: { label: "Earnings", format: "currency" },
    calcResults: [
      { key: "aprAfterFees", label: "APR After Fees", format: "percentage" },
      { key: "apyPercent", label: "APY", format: "percentage" },
      { key: "earnings", label: "Earnings", format: "currency", highlight: true },
      { key: "endingValue", label: "Ending Value", format: "currency" },
    ],
    instructions:
      "Yield farms quote APR; compounding the rewards back in turns it into a higher APY. Yield aggregators compound " +
      "automatically and spread the gas cost, in exchange for a performance fee. High farm APRs often come from newly " +
      "issued reward tokens whose price tends to fall as they're sold.\n\n" +
      "Farming in liquidity pools also carries impermanent loss — see the Liquidity Pool Return calculator.",
    examples:
      "Example: a 20% farm with a 10% fee and daily auto-compounding is 19.72% APY — $1,971.64 on $10,000 over a year.",
    assumptions:
      "Constant APR; price change applied to earnings only. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do farm APRs drop so fast?",
        answer: "As more money joins a farm, the fixed rewards are shared among more deposits, and reward token prices often fall.",
      },
    ],
  },
  {
    slug: "liquidity-pool-return-calculator",
    title: "Liquidity Pool Return Calculator",
    description: "Estimate the return from providing liquidity to a 50/50 crypto pool — trading fees and rewards minus impermanent loss — compared with simply holding the two tokens.",
    metaTitle: "Liquidity Pool Return Calculator — Fees vs Impermanent Loss",
    metaDescription: "Free liquidity pool calculator. Estimate LP returns from fees and rewards minus impermanent loss vs just holding.",
    calcInputs: [
      currencyField("deposit", "Amount Deposited", { default: 10000, max: 1000000000, step: 100 }),
      percentField("feeAprPercent", "Trading Fee APR", { default: 15, max: 1000, step: 0.5 }),
      percentField("rewardsAprPercent", "Reward Token APR", { default: 5, max: 1000, step: 0.5, required: false }),
      numberField("priceChangeAPercent", "Token A Price Change (%)", { default: 50, min: -100, max: 10000, step: 5 }),
      numberField("priceChangeBPercent", "Token B Price Change (%)", { default: 0, min: -100, max: 10000, step: 5 }),
      numberField("days", "Days in the Pool", { default: 365, min: 0, max: 3650, step: 1 }),
    ],
    calcResult: { label: "Result vs Holding", format: "currency" },
    calcResults: [
      { key: "holdValue", label: "Value If Just Held", format: "currency" },
      { key: "impermanentLossPercent", label: "Impermanent Loss", format: "percentage" },
      { key: "impermanentLossValue", label: "Impermanent Loss", format: "currency" },
      { key: "feeAndRewardIncome", label: "Fee & Reward Income", format: "currency" },
      { key: "liquidityPositionValue", label: "Liquidity Position Value", format: "currency" },
      { key: "resultVsHolding", label: "Result vs Holding", format: "currency", highlight: true },
    ],
    instructions:
      "Liquidity providers deposit two tokens in equal value and earn a share of trading fees. When the tokens' prices " +
      "move apart, the pool rebalances and you end up with less than if you'd held them — impermanent loss. Providing " +
      "liquidity pays off when fees and rewards exceed that loss.\n\n" +
      "Concentrated-liquidity pools earn more fees but suffer larger impermanent loss when prices leave your range.",
    examples:
      "Example: $10,000 in a pool where token A rises 50% suffers -2.02% impermanent loss, but $2,000 of " +
      "fees and rewards leaves you $1,747.45 ahead of holding.",
    assumptions:
      "Standard 50/50 constant-product pool; fees earned on the initial deposit. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is it called impermanent?",
        answer: "The loss disappears if prices return to where they were when you deposited — it becomes permanent when you withdraw.",
      },
    ],
  },
  {
    slug: "impermanent-loss-calculator",
    title: "Impermanent Loss Calculator",
    description: "Calculate impermanent loss in a 50/50 liquidity pool when the two tokens' prices change, in percent and dollars, versus holding them.",
    metaTitle: "Impermanent Loss Calculator — Liquidity Pool IL",
    metaDescription: "Free impermanent loss calculator. See the loss vs holding in a 50/50 liquidity pool for any price change of the two tokens.",
    calcInputs: [
      currencyField("deposit", "Amount Deposited", { default: 10000, max: 1000000000, step: 100 }),
      numberField("priceChangeAPercent", "Token A Price Change (%)", { default: 100, min: -100, max: 10000, step: 5 }),
      numberField("priceChangeBPercent", "Token B Price Change (%)", { default: 0, min: -100, max: 10000, step: 5 }),
    ],
    calcResult: { label: "Impermanent Loss", format: "percentage" },
    calcResults: [
      { key: "impermanentLossPercent", label: "Impermanent Loss", format: "percentage", highlight: true },
      { key: "holdValue", label: "Value If Just Held", format: "currency" },
      { key: "poolValue", label: "Value in the Pool", format: "currency" },
      { key: "lossVsHolding", label: "Loss vs Holding", format: "currency" },
    ],
    instructions:
      "Impermanent loss depends only on how far the two prices move relative to each other: a 2× move loses about 5.7%, " +
      "3× about 13.4% and 5× about 25.5% versus holding. Pairs that move together, such as two stablecoins, have little IL.\n\n" +
      "IL = 2√r ÷ (1 + r) − 1, where r is the change in the price ratio. Trading fees are not included here.",
    examples:
      "Example: if token A doubles (100%) and token B is flat, $10,000 in the pool is worth $14,142.14 versus $15,000 held — " +
      "-5.72% or $857.86.",
    assumptions:
      "50/50 constant-product pool, before fees. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does impermanent loss happen if both prices fall?",
        answer: "Only if they fall by different amounts — IL depends on the change in their ratio, not the direction.",
      },
    ],
  },
  {
    slug: "crypto-lending-interest-calculator",
    title: "Crypto Lending Interest Calculator",
    description: "Estimate the interest you earn by lending crypto on a lending platform or DeFi protocol, with compounding, platform fees and a future coin price.",
    metaTitle: "Crypto Lending Interest Calculator — Earn Interest on Crypto",
    metaDescription: "Free crypto lending calculator. Estimate interest from lending crypto with compounding, fees and coin price changes.",
    calcInputs: [
      currencyField("amount", "Value Lent", { default: 10000, max: 1000000000, step: 100 }),
      percentField("aprPercent", "Lending APR", { default: 5, max: 100, step: 0.1 }),
      {
        key: "compounding", label: "Interest Paid / Compounded", type: "dropdown", required: true, default: 3,
        options: [
          { label: "Not Compounded", value: 1 },
          { label: "Monthly", value: 2 },
          { label: "Daily", value: 3 },
        ],
      },
      percentField("platformFeePercent", "Platform Fee (Share of Interest)", { default: 0, max: 50, step: 1, required: false }),
      numberField("years", "Years", { default: 1, min: 0, max: 50, step: 0.5 }),
      numberField("priceChangePercent", "Coin Price Change by Then (%)", { default: 0, min: -100, max: 10000, step: 5 }),
    ],
    calcResult: { label: "Interest at Future Price", format: "currency" },
    calcResults: [
      { key: "apyPercent", label: "APY", format: "percentage" },
      { key: "interestAtTodaysPrice", label: "Interest at Today's Price", format: "currency" },
      { key: "interestAtFuturePrice", label: "Interest at Future Price", format: "currency", highlight: true },
      { key: "endingValue", label: "Ending Value", format: "currency" },
    ],
    instructions:
      "Lending protocols such as Aave and Compound pay variable interest set by borrowing demand; centralized platforms " +
      "set their own rates. Interest is usually paid in the coin you lend, so its dollar value moves with the price.\n\n" +
      "Several large centralized lenders collapsed in 2022, freezing customers' funds. Crypto deposits aren't FDIC-insured.",
    examples:
      "Example: lending $10,000 of crypto at 5% compounded daily (5.13% APY) earns $512.67 over 1 year.",
    assumptions:
      "Constant rate; price change applied at the end. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is interest from crypto lending taxable?",
        answer: "Yes — in the US it's ordinary income at its value when received.",
      },
    ],
  },
  {
    slug: "stablecoin-yield-calculator",
    title: "Stablecoin Yield Calculator",
    description: "Compare stablecoin yields — flexible savings, fixed-term crypto deposits and a bank savings account — over the same period.",
    metaTitle: "Stablecoin Yield Calculator — Flexible vs Fixed-Term",
    metaDescription: "Free stablecoin yield calculator. Compare flexible and fixed-term stablecoin earnings with a bank savings account.",
    calcInputs: [
      currencyField("amount", "Stablecoins Deposited", { default: 10000, max: 1000000000, step: 100 }),
      percentField("flexibleAprPercent", "Flexible Savings APR", { default: 4, max: 50, step: 0.1 }),
      percentField("fixedAprPercent", "Fixed-Term APR", { default: 6, max: 50, step: 0.1 }),
      numberField("termDays", "Fixed Term (Days)", { default: 90, min: 1, max: 1095, step: 1 }),
      percentField("bankApyPercent", "Bank Savings APY", { default: 3.8, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "Fixed-Term Earnings", format: "currency" },
    calcResults: [
      { key: "flexibleEarnings", label: "Flexible Savings Earnings", format: "currency" },
      { key: "fixedTermEarnings", label: "Fixed-Term Earnings", format: "currency", highlight: true },
      { key: "bankSavingsEarnings", label: "Bank Savings Earnings", format: "currency" },
      { key: "fixedTermExtraVsFlexible", label: "Fixed-Term Extra vs Flexible", format: "currency" },
      { key: "fixedTermExtraVsBank", label: "Fixed-Term Extra vs Bank", format: "currency" },
    ],
    instructions:
      "Exchanges and DeFi protocols pay interest on stablecoins such as USDC and USDT. Flexible products let you withdraw " +
      "any time; fixed-term deposits pay more but lock your coins. Yields come from lending to traders and borrowers, so " +
      "they change with market demand.\n\n" +
      "Unlike a bank account, stablecoin deposits aren't FDIC-insured, and stablecoins can lose their peg.",
    examples:
      "Example: over 90 days, $10,000 earns $147.95 in a 6% fixed-term product, $99.11 in flexible savings " +
      "and $92.39 in a bank at 3.80%.",
    assumptions:
      "Flexible compounds daily; fixed-term pays simple interest at maturity. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I withdraw a fixed-term deposit early?",
        answer: "Often not, or only by giving up the interest — check the product's terms.",
      },
    ],
  },
  {
    slug: "crypto-airdrop-value-calculator",
    title: "Crypto Airdrop Value Calculator",
    description: "Estimate what a crypto airdrop is worth: tokens unlocked now, income tax on their value, gas to claim, and the value if the price drops after launch.",
    metaTitle: "Crypto Airdrop Value Calculator — Value & Tax",
    metaDescription: "Free crypto airdrop calculator. Estimate airdrop value, unlocked tokens, income tax and the value after a price drop.",
    calcInputs: [
      numberField("tokens", "Tokens Received", { default: 1000, min: 0, max: 1000000000000, step: 10 }),
      currencyField("tokenPrice", "Token Price at Claim", { default: 0.85, max: 1000000, step: 0.01 }),
      percentField("unlockedPercent", "Share Unlocked Now", { default: 25, max: 100, step: 5 }),
      currencyField("claimGas", "Gas Fee to Claim", { default: 10, max: 10000, step: 1, required: false }),
      percentField("taxRatePercent", "Income Tax Rate", { default: 24, max: 60, step: 1 }),
      numberField("priceChangePercent", "Price Change After Launch (%)", { default: -30, min: -100, max: 10000, step: 5 }),
    ],
    calcResult: { label: "Net Value Now", format: "currency" },
    calcResults: [
      { key: "totalValueAtClaim", label: "Total Value at Claim", format: "currency" },
      { key: "unlockedValue", label: "Unlocked Value", format: "currency" },
      { key: "incomeTaxOnUnlocked", label: "Income Tax on Unlocked Tokens", format: "currency" },
      { key: "netValueNow", label: "Net Value Now", format: "currency", highlight: true },
      { key: "totalValueAfterPriceChange", label: "Total Value After Price Change", format: "currency" },
    ],
    instructions:
      "Airdrops give free tokens to early users of a protocol. Often only part unlocks at launch, with the rest vesting " +
      "over months. Many airdropped tokens fall sharply after launch as recipients sell.\n\n" +
      "In the US, airdropped tokens are ordinary income at their market value when you gain control of them, and that " +
      "value becomes your cost basis. Beware of fake airdrop sites that drain wallets.",
    examples:
      "Example: 1,000 tokens at $0.85 are worth $850; the 25% unlocked now is $212.50, or $151.50 after " +
      "tax and gas. If the price drops 30%, the whole airdrop is worth $595.",
    assumptions:
      "Tax on unlocked tokens at their claim value; locked tokens taxed when they unlock. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I have to pay tax on an airdrop I never sold?",
        answer: "In the US, yes — the income arises when you receive and control the tokens, even if you hold them.",
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
