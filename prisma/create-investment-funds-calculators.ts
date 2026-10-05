// One-time (but safe to re-run) batch setup script: creates the Fund & ETF tools
// (6) of the Investment Calculators expansion, filed under Investment Calculators > Fund & ETF Calculators.
// See src/lib/calc-engine-investment-funds.ts for the math and
// src/lib/calc-engine-investment-stocks.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-investment-funds-calculators.ts
// or
//   npm run db:create-investment-funds-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "investment-calculators";
const CATEGORY = { name: "Fund & ETF Calculators", slug: "fund-etf-calculators" };

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
  "This tool provides general estimates for informational purposes only and isn't investment, tax or legal " +
  "advice. Investing involves risk, including loss of principal — check the security's documents or ask a " +
  "financial professional.";

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
    slug: "mutual-fund-calculator",
    title: "Mutual Fund Calculator",
    description: "Project a mutual fund investment — lump sum plus monthly contributions — after the expense ratio and any sales load, and see what those costs take from your returns.",
    metaTitle: "Mutual Fund Calculator — Growth After Fees & Loads",
    metaDescription: "Free mutual fund calculator. Project a lump sum and monthly investments after the expense ratio and sales load, and see the cost of fees.",
    calcInputs: [
      currencyField("initial", "Initial Investment", { default: 10000, max: 1000000000, step: 100 }),
      currencyField("monthly", "Monthly Investment", { default: 500, max: 10000000, step: 50, required: false }),
      percentField("grossReturnPercent", "Expected Return Before Fees", { default: 8, min: -20, max: 30, step: 0.25 }),
      percentField("expenseRatioPercent", "Expense Ratio", { default: 0.75, max: 5, step: 0.01 }),
      percentField("frontLoadPercent", "Front-End Sales Load", { default: 0, max: 8.5, step: 0.25, required: false }),
      numberField("years", "Years", { default: 20, min: 0, max: 60, step: 1 }),
    ],
    calcResult: { label: "Fund Value", format: "currency" },
    calcResults: [
      { key: "totalInvested", label: "Total Invested", format: "currency" },
      { key: "loadPaid", label: "Sales Load Paid", format: "currency" },
      { key: "fundValue", label: "Fund Value", format: "currency", highlight: true },
      { key: "totalGrowth", label: "Total Growth", format: "currency" },
      { key: "costOfFeesAndLoad", label: "Cost of Fees and Load", format: "currency" },
    ],
    instructions:
      "Enter what you'll invest, the fund's expected return before costs, its expense ratio and any front-end load (Class " +
      "A shares often charge up to 5.75%, reduced at breakpoints). The cost of fees includes the growth those fees would " +
      "have earned.\n\n" +
      "This works for any type of fund — index, sector, ESG or infrastructure funds — just use that fund's expected return " +
      "and costs.",
    examples:
      "Example: $10,000 plus $500 a month for 20 years — $130,000 in all — at 8% before " +
      "a 0.75% expense ratio grows to $303,159.99. The fees cost $29,779.59 over that time.",
    assumptions:
      "Steady returns, monthly investing; the load applies to every purchase. Taxes on distributions in a taxable account " +
      "are not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a good expense ratio?",
        answer: "Broad index funds charge under 0.10%; actively managed stock funds average around 0.6%. Every 0.5% in fees can cost tens of thousands over decades.",
      },
    ],
  },
  {
    slug: "etf-investment-calculator",
    title: "ETF Investment Calculator",
    description: "Project an ETF or index fund investment and compare it with the same money in a higher-cost fund, to see how much the lower expense ratio adds up to.",
    metaTitle: "ETF Investment Calculator — Index Fund Growth & Fees",
    metaDescription: "Free ETF calculator. Project growth in a low-cost ETF or index fund and compare it with a higher-cost fund over time.",
    calcInputs: [
      currencyField("initial", "Initial Investment", { default: 10000, max: 1000000000, step: 100 }),
      currencyField("monthly", "Monthly Investment", { default: 500, max: 10000000, step: 50, required: false }),
      percentField("returnPercent", "Expected Return Before Fees", { default: 8, min: -20, max: 30, step: 0.25 }),
      percentField("etfExpensePercent", "ETF Expense Ratio", { default: 0.05, max: 3, step: 0.01 }),
      percentField("fundExpensePercent", "Higher-Cost Fund Expense Ratio", { default: 0.75, max: 3, step: 0.01 }),
      numberField("years", "Years", { default: 20, min: 0, max: 60, step: 1 }),
    ],
    calcResult: { label: "ETF Value", format: "currency" },
    calcResults: [
      { key: "totalInvested", label: "Total Invested", format: "currency" },
      { key: "etfValue", label: "ETF Value", format: "currency", highlight: true },
      { key: "higherCostFundValue", label: "Higher-Cost Fund Value", format: "currency" },
      { key: "etfAdvantage", label: "ETF Advantage", format: "currency" },
      { key: "etfFeesCost", label: "Total Cost of ETF Fees", format: "currency" },
    ],
    instructions:
      "Index ETFs and index mutual funds track a market index at very low cost. ETFs trade like stocks during the day and " +
      "are usually more tax-efficient in taxable accounts.\n\n" +
      "Enter your plan and both expense ratios. The same return before fees is assumed for both, which is fair for funds " +
      "tracking the same market.",
    examples:
      "Example: $10,000 plus $500 a month for 20 years at 8% grows to $330,856.75 in an ETF " +
      "charging 0.05%, versus $303,159.99 in a fund charging 0.75% — $27,696.76 " +
      "more.",
    assumptions:
      "Steady returns, monthly investing; trading costs, bid-ask spreads and taxes not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "ETF or index mutual fund?",
        answer: "For the same index and cost, results are nearly identical. ETFs suit any brokerage and taxable accounts; mutual funds make automatic investing in exact dollar amounts easy.",
      },
    ],
  },
  {
    slug: "target-date-fund-calculator",
    title: "Target-Date Fund Calculator",
    description: "Project a target-date retirement fund: how its stock-bond mix shifts as you near retirement, the expected return now, and your balance at the target date.",
    metaTitle: "Target-Date Fund Calculator — Glide Path & Balance",
    metaDescription: "Free target-date fund calculator. See how the stock-bond glide path shifts toward retirement and project your balance at the target date.",
    calcInputs: [
      numberField("currentAge", "Current Age", { default: 35, min: 0, max: 100, step: 1 }),
      numberField("retirementAge", "Retirement (Target) Age", { default: 65, min: 0, max: 100, step: 1 }),
      currencyField("balance", "Current Balance", { default: 50000, max: 1000000000, step: 1000, required: false }),
      currencyField("monthly", "Monthly Contribution", { default: 600, max: 1000000, step: 50 }),
      percentField("stockReturnPercent", "Expected Stock Return", { default: 8, min: -10, max: 20, step: 0.25 }),
      percentField("bondReturnPercent", "Expected Bond Return", { default: 4, min: -10, max: 15, step: 0.25 }),
      percentField("expenseRatioPercent", "Fund Expense Ratio", { default: 0.12, max: 2, step: 0.01 }),
    ],
    calcResult: { label: "Balance at Target Date", format: "currency" },
    calcResults: [
      { key: "stockShareNow", label: "Stocks Today", format: "percentage" },
      { key: "stockShareAtTarget", label: "Stocks at Target Date", format: "percentage" },
      { key: "expectedReturnNow", label: "Expected Return Now (After Fees)", format: "percentage" },
      { key: "totalContributions", label: "Total Contributions", format: "currency" },
      { key: "balanceAtTargetDate", label: "Balance at Target Date", format: "currency", highlight: true },
    ],
    instructions:
      "A target-date fund (e.g., \"2055 Fund\") holds a mix of stock and bond funds that automatically becomes more " +
      "conservative as the target year approaches — its glide path. This calculator uses a typical path: about 90% stocks " +
      "when retirement is 25 or more years away, falling to 50% at the target date.\n\n" +
      "Funds differ: some keep shifting for years after the target date. Check your fund's glide path.",
    examples:
      "Example: at 35, with $50,000 saved and $600 a month, a target-date fund holds 90% " +
      "stocks for an expected 7.48% return, shifting to 50% by 65. The balance " +
      "reaches about $1,023,743.82.",
    assumptions:
      "Steady stock and bond returns; the mix is reset yearly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I hold only a target-date fund?",
        answer: "Yes — it's designed as a one-fund portfolio. Adding other funds can upset its mix.",
      },
    ],
  },
  {
    slug: "closed-end-fund-investment-calculator",
    title: "Closed-End Fund Investment Calculator",
    description: "Analyze a closed-end fund: its discount or premium to NAV, the distribution rate on price and on NAV, your income, and the gain if the discount narrows.",
    metaTitle: "Closed-End Fund Calculator — Discount & Distribution",
    metaDescription: "Free closed-end fund calculator. See the discount or premium to NAV, distribution rates, income, and the gain if the discount narrows.",
    calcInputs: [
      currencyField("nav", "Net Asset Value (NAV) per Share", { default: 20, max: 1000000, step: 0.01 }),
      currencyField("price", "Market Price per Share", { default: 18, max: 1000000, step: 0.01 }),
      currencyField("distributionPerShare", "Yearly Distribution per Share", { default: 1.6, max: 100000, step: 0.01 }),
      numberField("shares", "Shares", { default: 500, min: 0, max: 100000000, step: 1 }),
      percentField("targetDiscountPercent", "Discount If It Narrows To", { default: 5, min: -50, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Distribution Rate on Price", format: "percentage" },
    calcResults: [
      { key: "premiumOrDiscount", label: "Premium (+) or Discount (−) to NAV", format: "percentage" },
      { key: "distributionRateOnPrice", label: "Distribution Rate on Price", format: "percentage", highlight: true },
      { key: "distributionRateOnNav", label: "Distribution Rate on NAV", format: "percentage" },
      { key: "yearlyIncome", label: "Yearly Income", format: "currency" },
      { key: "priceIfDiscountChanges", label: "Price If the Discount Changes", format: "currency" },
      { key: "gainIfDiscountChanges", label: "Gain If the Discount Changes", format: "currency" },
    ],
    instructions:
      "Closed-end funds issue a fixed number of shares that trade on an exchange, so their price can be below (a discount) " +
      "or above (a premium) the value of the holdings (NAV). Buying at a discount boosts your yield, and you gain extra if " +
      "the discount narrows. Many use leverage and pay high distributions — part of which may be return of capital.\n\n" +
      "Enter a target discount (negative for a premium) to see the effect of a change.",
    examples:
      "Example: a fund with a $20 NAV trading at $18 is at a -10% discount. Its $1.60 " +
      "distribution yields 8.89% on price (8% on NAV), paying $800 a year on " +
      "500 shares. If the discount narrows to 5%, you'd gain $500.",
    assumptions:
      "NAV stays the same; distributions are steady. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a high distribution rate always good?",
        answer: "Not if it's funded by returning your own capital and NAV keeps falling. Check the fund's Section 19 notices for the source of distributions.",
      },
    ],
  },
  {
    slug: "fund-of-funds-investment-calculator",
    title: "Fund of Funds Investment Calculator",
    description: "See what the two layers of fees in a fund of funds cost: the combined fee, your value after it, and how much more you'd have holding the underlying funds directly.",
    metaTitle: "Fund of Funds Calculator — Layered Fees Cost",
    metaDescription: "Free fund of funds calculator. See the combined fee of a fund of funds and how much the extra layer costs compared with the underlying funds.",
    calcInputs: [
      currencyField("investment", "Amount Invested", { default: 100000, max: 1000000000, step: 1000 }),
      percentField("grossReturnPercent", "Expected Return Before Fees", { default: 7, min: -20, max: 30, step: 0.25 }),
      percentField("underlyingFeePercent", "Underlying Funds' Fees", { default: 0.6, max: 5, step: 0.05 }),
      percentField("fofFeePercent", "Fund of Funds' Own Fee", { default: 0.5, max: 5, step: 0.05 }),
      numberField("years", "Years", { default: 15, min: 0, max: 60, step: 1 }),
    ],
    calcResult: { label: "Cost of the Extra Layer", format: "currency" },
    calcResults: [
      { key: "combinedFee", label: "Combined Yearly Fee", format: "percentage" },
      { key: "valueWithFundOfFunds", label: "Value in the Fund of Funds", format: "currency" },
      { key: "valueWithUnderlyingFundsOnly", label: "Value Holding the Funds Directly", format: "currency" },
      { key: "costOfExtraLayer", label: "Cost of the Extra Layer", format: "currency", highlight: true },
    ],
    instructions:
      "A fund of funds invests in other funds — target-date funds, multi-asset funds and hedge fund or private equity " +
      "funds of funds work this way. You pay the underlying funds' fees plus the fund of funds' own fee, which buys " +
      "diversification, access or professional selection.\n\n" +
      "Enter both fee layers. For hedge fund or private equity funds of funds, add the performance fees too, or use those " +
      "calculators.",
    examples:
      "Example: $100,000 at 7% before fees, with 0.60% underlying and 0.50% " +
      "top-layer fees (a 1.10% total), grows to $236,286.77 in 15 years — $17,298.73 less " +
      "than holding the funds directly.",
    assumptions:
      "Steady returns; fees taken yearly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are funds of funds worth the extra fee?",
        answer: "For access to hard-to-reach managers or a hands-off diversified mix, maybe. For plain stock and bond index exposure, holding the funds yourself is usually cheaper.",
      },
    ],
  },
  {
    slug: "leveraged-etf-investment-calculator",
    title: "Leveraged ETF Investment Calculator",
    description: "Estimate a leveraged or inverse ETF's return over time, including the volatility decay from daily rebalancing — compared with simply multiplying the index return.",
    metaTitle: "Leveraged ETF Calculator — Volatility Decay (2x, 3x, −1x)",
    metaDescription: "Free leveraged ETF calculator. Estimate 2x, 3x or inverse ETF returns over time, including volatility decay and fees.",
    calcInputs: [
      {
        key: "leverage", label: "ETF Type", type: "dropdown", required: true, default: 2,
        options: [
          { label: "3x Leveraged", value: 3 },
          { label: "2x Leveraged", value: 2 },
          { label: "−1x Inverse", value: -1 },
          { label: "−2x Inverse", value: -2 },
          { label: "−3x Inverse", value: -3 },
        ],
      },
      currencyField("investment", "Amount Invested", { default: 10000, max: 1000000000, step: 100 }),
      percentField("indexReturnPercent", "Index Return Over the Period", { default: 10, min: -90, max: 200, step: 1 }),
      percentField("volatilityPercent", "Index Volatility (Yearly)", { default: 20, max: 100, step: 1 }),
      numberField("years", "Holding Period (Years)", { default: 1, min: 0, max: 10, step: 0.25 }),
      percentField("expenseRatioPercent", "Expense Ratio", { default: 0.95, max: 3, step: 0.01 }),
    ],
    calcResult: { label: "Expected Return", format: "percentage" },
    calcResults: [
      { key: "simpleMultipleReturn", label: "Leverage × Index Return", format: "percentage" },
      { key: "expectedReturn", label: "Expected Return", format: "percentage", highlight: true },
      { key: "volatilityDrag", label: "Volatility Decay (Points)", format: "number" },
      { key: "valueAfterPeriod", label: "Value After the Period", format: "currency" },
    ],
    instructions:
      "Leveraged and inverse ETFs aim for a multiple of the index's daily return. Over longer periods, daily resetting " +
      "makes results drift from \"leverage × index return\": choppy markets erode value (volatility decay), while steady " +
      "trends can help.\n\n" +
      "Enter the index return you expect over your holding period and its volatility (the S&P 500 averages around 15–20%; " +
      "the Nasdaq-100 more). The estimate assumes random daily moves.",
    examples:
      "Example: if the index gains 10% in a year with 20% volatility, a 2x ETF is expected to " +
      "return about 15.15% after fees — not 20% — turning $10,000 into $11,515.11.",
    assumptions:
      "Lognormal daily returns with constant volatility; real paths vary. These funds are designed for short-term trading. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can an inverse ETF lose money even if the market falls?",
        answer: "Over longer periods, yes — if the market is volatile on the way down, decay can offset the gains.",
      },
    ],
  },
];

async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY_SLUG } });
  if (!parent) {
    throw new Error(
      `The "${PARENT_CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
        "then re-run this script."
    );
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
