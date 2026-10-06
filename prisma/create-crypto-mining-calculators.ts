// One-time (but safe to re-run) batch setup script: creates the Mining tools
// (4) of the Crypto Calculators expansion, filed under Crypto
// Calculators > Crypto Staking, DeFi & Mining Calculators (both categories are created on first run).
// See src/lib/calc-engine-crypto-mining.ts for the math and
// src/lib/calc-engine-crypto-trading.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-crypto-mining-calculators.ts
// or
//   npm run db:create-crypto-mining-calculators

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
    slug: "crypto-mining-profitability-calculator",
    title: "Crypto Mining Profitability Calculator",
    description: "Calculate Bitcoin mining profit from your hashrate, power use and electricity rate — revenue, pool fee, electricity cost, rig break-even days and the break-even power price.",
    metaTitle: "Crypto Mining Profitability Calculator — Bitcoin Mining",
    metaDescription: "Free mining profitability calculator. Find daily mining profit, electricity cost, pool fees and rig break-even time.",
    calcInputs: [
      numberField("hashrateThs", "Your Hashrate (TH/s)", { default: 200, min: 0, max: 1000000, step: 1 }),
      numberField("powerWatts", "Power Draw (Watts)", { default: 3500, min: 0, max: 10000000, step: 50 }),
      currencyField("electricityRate", "Electricity Rate per kWh", { default: 0.06, max: 2, step: 0.005 }),
      numberField("networkHashrateEhs", "Network Hashrate (EH/s)", { default: 650, min: 1, max: 100000, step: 10 }),
      numberField("blockReward", "Block Subsidy (Coins)", { default: 3.125, min: 0, max: 100, step: 0.001 }),
      numberField("feesPerBlock", "Transaction Fees per Block (Coins)", { default: 0.05, min: 0, max: 10, step: 0.01 }),
      currencyField("coinPrice", "Bitcoin Price", { default: 60000, max: 10000000, step: 100 }),
      percentField("poolFeePercent", "Mining Pool Fee", { default: 2, max: 10, step: 0.25 }),
      currencyField("rigCost", "Mining Rig Cost", { default: 4000, max: 10000000, step: 100 }),
    ],
    calcResult: { label: "Daily Profit", format: "currency" },
    calcResults: [
      { key: "dailyCoinsMined", label: "Coins Mined per Day", format: "number", decimals: 8 },
      { key: "dailyRevenue", label: "Daily Revenue", format: "currency" },
      { key: "dailyPoolFee", label: "Daily Pool Fee", format: "currency" },
      { key: "dailyElectricityCost", label: "Daily Electricity Cost", format: "currency" },
      { key: "dailyProfit", label: "Daily Profit", format: "currency", highlight: true },
      { key: "monthlyProfit", label: "Monthly Profit", format: "currency" },
      { key: "breakEvenDays", label: "Days to Pay Off the Rig", format: "number" },
      { key: "breakEvenElectricityRate", label: "Break-Even Electricity Rate per kWh", format: "currency", decimals: 3 },
      { key: "efficiencyJPerTh", label: "Efficiency (J/TH)", format: "number" },
    ],
    instructions:
      "Your share of mining rewards equals your share of the network's total hashrate. About 144 Bitcoin blocks are mined " +
      "a day, each paying the block subsidy (3.125 BTC since the April 2024 halving) plus transaction fees. Pools smooth " +
      "your payouts for a fee, and electricity is usually the biggest cost.\n\n" +
      "Network hashrate keeps rising, so the same rig earns less over time — the break-even estimate is optimistic.",
    examples:
      "Example: a 200 TH/s miner drawing 3,500 W earns about $8.27 a day and pays $5.04 for power at " +
      "$0.06/kWh, for $3.23 of daily profit. It pays off a $4,000 rig in about 1,237.70 days if nothing changes.",
    assumptions:
      "Constant network hashrate, price and fees. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What electricity price makes Bitcoin mining profitable?",
        answer: "It depends on your machine's efficiency — the break-even rate above shows the most you could pay per kWh before losing money.",
      },
    ],
  },
  {
    slug: "bitcoin-halving-impact-calculator",
    title: "Bitcoin Halving Impact Calculator",
    description: "See how the next Bitcoin halving affects a miner's revenue and profit, and the Bitcoin price needed to break even afterward.",
    metaTitle: "Bitcoin Halving Calculator — Impact on Mining Profit",
    metaDescription: "Free Bitcoin halving calculator. See how halving the block reward changes mining revenue, profit and break-even price.",
    calcInputs: [
      numberField("monthlyCoins", "Bitcoin Mined per Month", { default: 0.004, min: 0, max: 100000, step: 0.0001 }),
      currencyField("coinPrice", "Bitcoin Price", { default: 60000, max: 10000000, step: 100 }),
      currencyField("monthlyCosts", "Monthly Electricity & Hosting Costs", { default: 150, max: 100000000, step: 10 }),
      percentField("feeSharePercent", "Transaction Fees as Share of Rewards", { default: 2, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Monthly Profit After Halving", format: "currency" },
    calcResults: [
      { key: "monthlyRevenueNow", label: "Monthly Revenue Now", format: "currency" },
      { key: "monthlyCoinsAfterHalving", label: "Bitcoin Mined per Month After", format: "number", decimals: 8 },
      { key: "monthlyRevenueAfterHalving", label: "Monthly Revenue After Halving", format: "currency" },
      { key: "monthlyProfitNow", label: "Monthly Profit Now", format: "currency" },
      { key: "monthlyProfitAfterHalving", label: "Monthly Profit After Halving", format: "currency", highlight: true },
      { key: "breakEvenPriceAfterHalving", label: "Break-Even Bitcoin Price After Halving", format: "currency" },
    ],
    instructions:
      "About every four years (every 210,000 blocks) the Bitcoin block subsidy halves. The next halving, expected in " +
      "2028, cuts it from 3.125 to 1.5625 BTC. Transaction fees aren't affected, so the bigger their share of rewards, " +
      "the smaller the hit.\n\n" +
      "Historically, less efficient miners shut down after halvings, which lowers network difficulty and partly " +
      "offsets the cut for those who remain.",
    examples:
      "Example: mining 0.004 BTC a month, revenue drops from $240 to $122.40 after the halving. With " +
      "$150 of costs, Bitcoin would need to reach $73,529.41 to break even.",
    assumptions:
      "Same hashrate share and costs after the halving. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does the halving raise Bitcoin's price?",
        answer: "It cuts new supply, and past halvings were followed by price rises, but many other factors drive the price — nothing is guaranteed.",
      },
    ],
  },
  {
    slug: "asic-vs-gpu-mining-calculator",
    title: "ASIC vs GPU Mining Calculator",
    description: "Compare an ASIC miner with a GPU mining rig: daily profit after electricity, payback time, and the net result over time including resale value.",
    metaTitle: "ASIC vs GPU Mining Calculator — Which Rig Pays Off",
    metaDescription: "Free ASIC vs GPU mining calculator. Compare daily profit, payback and net result including resale value.",
    calcInputs: [
      currencyField("electricityRate", "Electricity Rate per kWh", { default: 0.06, max: 2, step: 0.005 }),
      numberField("months", "Months", { default: 24, min: 1, max: 120, step: 1 }),
      currencyField("asicCost", "ASIC Cost", { default: 4000, max: 1000000, step: 100 }),
      currencyField("asicDailyRevenue", "ASIC Daily Revenue", { default: 9, max: 100000, step: 0.25 }),
      numberField("asicPowerWatts", "ASIC Power (Watts)", { default: 3500, min: 0, max: 100000, step: 50 }),
      percentField("asicResalePercent", "ASIC Resale Value at the End", { default: 20, max: 100, step: 5 }),
      currencyField("gpuCost", "GPU Rig Cost", { default: 3000, max: 1000000, step: 100 }),
      currencyField("gpuDailyRevenue", "GPU Rig Daily Revenue", { default: 2.5, max: 100000, step: 0.25 }),
      numberField("gpuPowerWatts", "GPU Rig Power (Watts)", { default: 1200, min: 0, max: 100000, step: 50 }),
      percentField("gpuResalePercent", "GPU Resale Value at the End", { default: 50, max: 100, step: 5 }),
    ],
    calcResult: { label: "ASIC Advantage", format: "currency" },
    calcResults: [
      { key: "asicDailyProfit", label: "ASIC Daily Profit", format: "currency" },
      { key: "gpuDailyProfit", label: "GPU Daily Profit", format: "currency" },
      { key: "asicNetResult", label: "ASIC Net Result (incl. Resale)", format: "currency" },
      { key: "gpuNetResult", label: "GPU Net Result (incl. Resale)", format: "currency" },
      { key: "asicPaybackDays", label: "ASIC Payback (Days)", format: "number" },
      { key: "gpuPaybackDays", label: "GPU Payback (Days)", format: "number" },
      { key: "asicAdvantage", label: "ASIC Advantage", format: "currency", highlight: true },
    ],
    instructions:
      "ASICs are built for one algorithm (such as Bitcoin's SHA-256) and are far more efficient at it, but lose value " +
      "quickly as newer models arrive. GPUs can mine various smaller coins and keep resale value for gaming or AI, but " +
      "GPU mining earns little since Ethereum moved to proof of stake.\n\n" +
      "Enter each machine's current daily revenue from a mining calculator or pool. A negative net result means the rig " +
      "wouldn't pay for itself in the period.",
    examples:
      "Example: over 24 months, the ASIC makes $3.96 a day and the GPU rig $0.77. Counting resale, the ASIC ends at " +
      "-$306.98 and the GPU rig at -$936.01 — the ASIC is $629.03 better.",
    assumptions:
      "Constant revenue and electricity price. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I mine Bitcoin with a GPU?",
        answer: "Technically yes, but GPUs are so much less efficient than ASICs that it's unprofitable.",
      },
    ],
  },
  {
    slug: "cloud-mining-contract-calculator",
    title: "Cloud Mining Contract Calculator",
    description: "Check whether a cloud mining contract can pay off: coins mined as difficulty rises, daily maintenance fees, and profit or loss versus the contract price.",
    metaTitle: "Cloud Mining Calculator — Is a Mining Contract Worth It",
    metaDescription: "Free cloud mining calculator. Estimate coins mined, maintenance fees and profit or loss on a cloud mining contract.",
    calcInputs: [
      currencyField("contractPrice", "Contract Price", { default: 1000, max: 100000000, step: 50 }),
      numberField("hashrateThs", "Hashrate Bought (TH/s)", { default: 50, min: 0, max: 1000000, step: 1 }),
      numberField("days", "Contract Length (Days)", { default: 365, min: 1, max: 3650, step: 1 }),
      currencyField("feePerThDay", "Maintenance Fee per TH/s per Day", { default: 0.03, max: 10, step: 0.005 }),
      currencyField("coinPrice", "Bitcoin Price", { default: 60000, max: 10000000, step: 100 }),
      numberField("networkHashrateEhs", "Network Hashrate (EH/s)", { default: 650, min: 1, max: 100000, step: 10 }),
      numberField("blockReward", "Block Subsidy (Coins)", { default: 3.125, min: 0, max: 100, step: 0.001 }),
      percentField("difficultyGrowthMonthlyPercent", "Difficulty Growth per Month", { default: 2, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Profit or Loss", format: "currency" },
    calcResults: [
      { key: "firstDayRevenue", label: "First-Day Revenue", format: "currency" },
      { key: "dailyMaintenanceFee", label: "Daily Maintenance Fee", format: "currency" },
      { key: "netCoinsMined", label: "Net Coins Mined", format: "number", decimals: 8 },
      { key: "totalMaintenanceFees", label: "Total Maintenance Fees", format: "currency" },
      { key: "netValueMined", label: "Net Value Mined", format: "currency" },
      { key: "profitOrLoss", label: "Profit or Loss", format: "currency", highlight: true },
      { key: "roiPercent", label: "Return on Contract", format: "percentage" },
    ],
    instructions:
      "Cloud mining sells you hashrate in someone else's mining farm for a fixed period. You receive your share of coins " +
      "minus a daily maintenance (electricity) fee. As network difficulty rises, the same hashrate mines fewer coins, " +
      "and if fees exceed revenue the contract typically pauses or ends.\n\n" +
      "Many cloud mining offers lose money or are outright Ponzi schemes promising fixed returns. Check who operates the " +
      "farm and run the numbers before buying.",
    examples:
      "Example: a $1,000 contract for 50 TH/s starts at $2.08 a day of revenue but pays $1.50 in fees. As " +
      "difficulty grows 2% a month, it mines $127.51 net — a -$872.49 result.",
    assumptions:
      "Constant price; transaction fees and pool fees ignored. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I spot a cloud mining scam?",
        answer: "Guaranteed daily returns, referral-driven payouts, no verifiable mining facility, and pressure to reinvest are classic warning signs.",
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
