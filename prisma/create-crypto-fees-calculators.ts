// One-time (but safe to re-run) batch setup script: creates the Network & Exchange Fees tools
// (6) of the Crypto Calculators expansion, filed under Crypto
// Calculators > Crypto Fees, Payments & Loans Calculators (both categories are created on first run).
// See src/lib/calc-engine-crypto-fees.ts for the math and
// src/lib/calc-engine-crypto-trading.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-crypto-fees-calculators.ts
// or
//   npm run db:create-crypto-fees-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Crypto Calculators", slug: "crypto-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Crypto Fees, Payments & Loans Calculators", slug: "crypto-fees-payments-loans-calculators" };

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
    slug: "crypto-gas-fee-calculator",
    title: "Crypto Gas Fee Calculator",
    description: "Calculate Ethereum and EVM gas fees from gas units and gas price in gwei — in ETH and dollars — and your monthly gas spend.",
    metaTitle: "Crypto Gas Fee Calculator — Gwei to ETH and USD",
    metaDescription: "Free gas fee calculator. Convert gas units and gwei to the transaction fee in ETH and dollars, and estimate monthly gas costs.",
    calcInputs: [
      numberField("gasUnits", "Gas Units (21,000 = ETH Transfer)", { default: 21000, min: 0, max: 30000000, step: 1000 }),
      numberField("baseFeeGwei", "Base Fee (Gwei)", { default: 10, min: 0, max: 5000, step: 0.5 }),
      numberField("priorityFeeGwei", "Priority Fee / Tip (Gwei)", { default: 1, min: 0, max: 1000, step: 0.1 }),
      currencyField("ethPrice", "ETH Price", { default: 3500, max: 1000000, step: 1 }),
      numberField("txPerMonth", "Transactions per Month", { default: 10, min: 0, max: 100000, step: 1 }),
    ],
    calcResult: { label: "Fee in Dollars", format: "currency" },
    calcResults: [
      { key: "gasPriceGwei", label: "Gas Price (Gwei)", format: "number" },
      { key: "feeInEth", label: "Fee in ETH", format: "number", decimals: 8 },
      { key: "feeInDollars", label: "Fee in Dollars", format: "currency", highlight: true },
      { key: "monthlyGasCost", label: "Monthly Gas Cost", format: "currency" },
    ],
    instructions:
      "Every Ethereum transaction uses gas: a simple ETH transfer uses 21,000 units, a token transfer about 50,000–65,000 " +
      "and a DEX swap often 120,000–200,000. You pay gas units × (base fee + priority fee), priced in gwei (one billionth " +
      "of an ETH). Base fees rise and fall with network demand.\n\n" +
      "Layer-2 networks such as Arbitrum, Optimism and Base usually cost a small fraction of mainnet fees.",
    examples:
      "Example: an ETH transfer (21,000 gas) at 11 gwei costs 0.000231 ETH — about $0.81 with ETH at $3,500.",
    assumptions:
      "Fee charged on all gas units at the entered price. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I get charged gas if a transaction fails?",
        answer: "Yes — the gas used up to the point of failure is still paid, because validators did the work.",
      },
    ],
  },
  {
    slug: "crypto-swap-fee-calculator",
    title: "Crypto Swap Fee Calculator",
    description: "Find the real cost of a token swap on a decentralized exchange — pool fee, price impact, aggregator fee and gas — and the minimum you'll receive at your slippage tolerance.",
    metaTitle: "Crypto Swap Fee Calculator — DEX Fees & Slippage",
    metaDescription: "Free crypto swap fee calculator. Add DEX pool fees, price impact and gas, and see the minimum received at your slippage setting.",
    calcInputs: [
      currencyField("swapAmount", "Swap Amount", { default: 5000, max: 1000000000, step: 50 }),
      percentField("poolFeePercent", "Pool Fee Tier", { default: 0.3, max: 5, step: 0.01 }),
      percentField("priceImpactPercent", "Price Impact", { default: 0.2, max: 50, step: 0.05 }),
      percentField("aggregatorFeePercent", "Aggregator / Interface Fee", { default: 0, max: 5, step: 0.05, required: false }),
      currencyField("gasUsd", "Gas Fee", { default: 5, max: 10000, step: 0.5 }),
      percentField("slippageTolerancePercent", "Slippage Tolerance", { default: 0.5, max: 50, step: 0.1 }),
    ],
    calcResult: { label: "Total Swap Cost", format: "currency" },
    calcResults: [
      { key: "poolFee", label: "Pool Fee", format: "currency" },
      { key: "priceImpactCost", label: "Price Impact Cost", format: "currency" },
      { key: "totalSwapCost", label: "Total Swap Cost", format: "currency", highlight: true },
      { key: "costPercent", label: "Cost as % of Swap", format: "percentage" },
      { key: "expectedValueReceived", label: "Expected Value Received", format: "currency" },
      { key: "minimumReceived", label: "Minimum Received at Your Tolerance", format: "currency" },
    ],
    instructions:
      "A DEX swap costs more than the pool fee: price impact (how far your trade moves the pool's price), any interface " +
      "or aggregator fee, and network gas. Your slippage tolerance sets the worst price you'll accept — the swap fails " +
      "rather than fill below it.\n\n" +
      "Big swaps in small pools have high price impact; aggregators split orders across pools to reduce it.",
    examples:
      "Example: swapping $5,000 through a 0.30% pool with 0.20% price impact and $5 gas costs " +
      "$30 (0.60%). With 0.50% tolerance you'll receive at least $4,950.13.",
    assumptions:
      "Gas paid separately in the network's token. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I set a high slippage tolerance?",
        answer: "Only when necessary — a high tolerance invites front-running (sandwich) bots to take the difference.",
      },
    ],
  },
  {
    slug: "crypto-withdrawal-fee-calculator",
    title: "Crypto Withdrawal Fee Calculator",
    description: "Calculate exchange withdrawal fees as a share of what you withdraw, your yearly cost, and how much a cheaper network could save.",
    metaTitle: "Crypto Withdrawal Fee Calculator — Exchange Fees",
    metaDescription: "Free crypto withdrawal fee calculator. See withdrawal fees as a percentage, yearly cost and savings from cheaper networks.",
    calcInputs: [
      currencyField("amount", "Amount per Withdrawal", { default: 500, max: 100000000, step: 10 }),
      currencyField("flatFee", "Flat Withdrawal Fee", { default: 5, max: 1000, step: 0.1 }),
      percentField("percentFee", "Percentage Fee", { default: 0, max: 10, step: 0.05, required: false }),
      numberField("withdrawalsPerYear", "Withdrawals per Year", { default: 12, min: 0, max: 1000, step: 1 }),
      currencyField("altNetworkFee", "Fee on a Cheaper Network (e.g., Layer 2)", { default: 0.5, max: 1000, step: 0.1 }),
    ],
    calcResult: { label: "Yearly Withdrawal Fees", format: "currency" },
    calcResults: [
      { key: "feePerWithdrawal", label: "Fee per Withdrawal", format: "currency" },
      { key: "feePercent", label: "Fee as % of Withdrawal", format: "percentage" },
      { key: "amountReceived", label: "Amount Received", format: "currency" },
      { key: "yearlyFees", label: "Yearly Withdrawal Fees", format: "currency", highlight: true },
      { key: "amountForFeeUnder1Percent", label: "Withdrawal Size for Fees Under 1%", format: "currency" },
      { key: "yearlySavingsOnCheaperNetwork", label: "Yearly Savings on a Cheaper Network", format: "currency" },
    ],
    instructions:
      "Exchanges usually charge a flat fee per withdrawal that depends on the coin and network, so small withdrawals " +
      "lose a bigger share. Choosing a cheaper network (such as a layer 2 or a different chain for stablecoins) and " +
      "withdrawing less often cuts the cost.\n\n" +
      "Always send on a network your receiving wallet supports — the wrong network can mean lost funds.",
    examples:
      "Example: withdrawing $500 with a $5 fee costs 1% each time — $60 a year for 12 " +
      "withdrawals. A cheaper network would save $54.",
    assumptions:
      "Fees in dollar terms at today's price. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why are Bitcoin withdrawal fees higher than some other coins?",
        answer: "On-chain Bitcoin fees depend on network demand; exchanges pass them on, sometimes with a margin. Lightning withdrawals cost far less.",
      },
    ],
  },
  {
    slug: "crypto-bridging-fee-calculator",
    title: "Crypto Bridging Fee Calculator",
    description: "Calculate the cost of bridging crypto between blockchains — bridge fee, gas on both chains, wrapping fees and any wrapped token discount to its underlying coin.",
    metaTitle: "Crypto Bridge Fee Calculator — Cross-Chain & Wrapped Tokens",
    metaDescription: "Free crypto bridging fee calculator. Add bridge fees, gas on both chains and wrapped-token costs to see what you receive.",
    calcInputs: [
      currencyField("amount", "Amount to Bridge", { default: 2000, max: 1000000000, step: 50 }),
      percentField("bridgeFeePercent", "Bridge Fee", { default: 0.1, max: 5, step: 0.01 }),
      currencyField("sourceGasUsd", "Gas on the Source Chain", { default: 8, max: 10000, step: 0.5 }),
      currencyField("destinationGasUsd", "Gas on the Destination Chain", { default: 0.5, max: 10000, step: 0.1 }),
      percentField("wrapFeePercent", "Wrap / Unwrap Fee", { default: 0, max: 5, step: 0.01, required: false }),
      percentField("pegDiscountPercent", "Wrapped Token Discount to Underlying", { default: 0, max: 50, step: 0.1, required: false }),
    ],
    calcResult: { label: "Total Fees", format: "currency" },
    calcResults: [
      { key: "totalFees", label: "Total Fees", format: "currency", highlight: true },
      { key: "feePercent", label: "Fees as % of Amount", format: "percentage" },
      { key: "amountReceived", label: "Amount Received", format: "currency" },
      { key: "valueAfterPegDiscount", label: "Value After Any Peg Discount", format: "currency" },
    ],
    instructions:
      "Bridges move tokens between blockchains, usually by locking them on one chain and issuing a wrapped version on the " +
      "other (such as WBTC for Bitcoin on Ethereum). You pay the bridge's fee plus gas on each chain; some wrapped tokens " +
      "carry minting or redemption fees and can trade slightly below the coin they represent.\n\n" +
      "Bridges have been frequent targets of large hacks — the wrapped token is only as safe as the bridge behind it.",
    examples:
      "Example: bridging $2,000 with a 0.10% fee and gas on both chains costs $10.50 (0.53%), leaving $1,989.50.",
    assumptions:
      "Fees as entered; time-sensitive price moves ignored. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is a wrapped token?",
        answer: "A token on one blockchain that represents a coin from another, backed 1:1 by coins held by a custodian or a bridge contract.",
      },
    ],
  },
  {
    slug: "crypto-atm-fee-calculator",
    title: "Crypto ATM Fee Calculator",
    description: "See how much a Bitcoin or crypto ATM really charges — percentage markup plus flat fee — and how it compares with buying on an exchange.",
    metaTitle: "Crypto ATM Fee Calculator — Bitcoin ATM Cost",
    metaDescription: "Free Bitcoin ATM fee calculator. See the real fee on a crypto ATM purchase and compare it with buying on an exchange.",
    calcInputs: [
      currencyField("cashAmount", "Cash Inserted", { default: 500, max: 100000, step: 20 }),
      percentField("atmFeePercent", "ATM Fee / Markup", { default: 12, max: 50, step: 0.5 }),
      currencyField("flatFee", "Flat Transaction Fee", { default: 3, max: 100, step: 0.5, required: false }),
      percentField("exchangeFeePercent", "Exchange Fee (Alternative)", { default: 1.5, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "ATM Fees", format: "currency" },
    calcResults: [
      { key: "atmFees", label: "ATM Fees", format: "currency", highlight: true },
      { key: "cryptoValueReceived", label: "Crypto Value Received", format: "currency" },
      { key: "effectiveFeePercent", label: "Effective Fee", format: "percentage" },
      { key: "exchangeCost", label: "Cost on an Exchange", format: "currency" },
      { key: "extraCostVsExchange", label: "Extra Cost of the ATM", format: "currency" },
    ],
    instructions:
      "Crypto ATMs typically charge 7–20% over the market price, often hidden in the exchange rate, plus a flat fee. " +
      "Exchanges and brokerage apps usually cost 0.5–2%.\n\n" +
      "Crypto ATMs are widely used in scams: no government agency, utility, bank or police department will ever ask you " +
      "to pay with a crypto ATM. If someone does, it's a scam.",
    examples:
      "Example: putting $500 into a crypto ATM with a 12% markup and $3 fee buys only $437 of " +
      "crypto — $55.50 more than buying on an exchange.",
    assumptions:
      "Markup applied to the cash amount. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get money back from a crypto ATM transaction?",
        answer: "Rarely — transactions are generally irreversible. If you were scammed, report it to the ATM operator, police and the FTC right away.",
      },
    ],
  },
  {
    slug: "crypto-p2p-otc-trade-calculator",
    title: "Crypto P2P and OTC Trade Calculator",
    description: "Calculate the premium you pay (or discount you accept) on a peer-to-peer or OTC desk crypto trade versus the market price, and compare it with trading on an exchange.",
    metaTitle: "Crypto P2P & OTC Trade Calculator — Premium vs Market",
    metaDescription: "Free crypto P2P and OTC calculator. Find the premium vs market price on a P2P or OTC trade and compare with an exchange.",
    calcInputs: [
      currencyField("tradeAmount", "Trade Amount", { default: 250000, max: 10000000000, step: 1000 }),
      currencyField("marketPrice", "Market Price", { default: 60000, max: 10000000, step: 0.01 }),
      currencyField("quotedPrice", "Quoted Price (P2P or OTC)", { default: 60300, max: 10000000, step: 0.01 }),
      {
        key: "side", label: "You Are", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Buying", value: 1 },
          { label: "Selling", value: 2 },
        ],
      },
      percentField("platformFeePercent", "Platform / Escrow Fee", { default: 0, max: 5, step: 0.05, required: false }),
      percentField("exchangeCostPercent", "Exchange Fee + Slippage for the Same Trade", { default: 0.6, max: 10, step: 0.05 }),
    ],
    calcResult: { label: "Total Cost vs Market", format: "currency" },
    calcResults: [
      { key: "coins", label: "Coins", format: "number", decimals: 8 },
      { key: "premiumPercent", label: "Premium vs Market", format: "percentage" },
      { key: "totalCostVsMarket", label: "Total Cost vs Market", format: "currency", highlight: true },
      { key: "exchangeEquivalentCost", label: "Cost on an Exchange", format: "currency" },
      { key: "savingsVsExchange", label: "Savings vs Exchange", format: "currency" },
    ],
    instructions:
      "Peer-to-peer platforms match buyers and sellers directly, often with local payment methods and escrow; prices " +
      "include a premium or discount set by the counterparty. OTC desks quote a single price for large trades so the " +
      "order doesn't move the exchange market.\n\n" +
      "For large orders, an OTC quote can beat an exchange once slippage is counted. Use escrow and verified " +
      "counterparties to avoid fraud.",
    examples:
      "Example: buying $250,000 at $60,300 when the market is $60,000 is a 0.50% premium — $1,243.78. " +
      "The same trade on an exchange would cost about $1,500 in fees and slippage.",
    assumptions:
      "Exchange cost as a flat share of the trade. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is the minimum for an OTC desk?",
        answer: "Many desks start around $50,000–$100,000 per trade, though some brokers accept smaller orders.",
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
