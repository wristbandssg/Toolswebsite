// One-time (but safe to re-run) batch setup script: creates the Trading tools
// (5) of the Investment Calculators expansion, filed under Investment Calculators > Stock & Options Calculators.
// See src/lib/calc-engine-investment-trading.ts for the math and
// src/lib/calc-engine-investment-stocks.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-investment-trading-calculators.ts
// or
//   npm run db:create-investment-trading-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "investment-calculators";
const CATEGORY = { name: "Stock & Options Calculators", slug: "stock-options-calculators" };

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
    slug: "options-trading-calculator",
    title: "Options Trading Calculator",
    description: "Calculate profit or loss at expiration for buying or selling calls and puts (and warrants): breakeven price, maximum loss and return on the premium.",
    metaTitle: "Options Profit Calculator — Calls, Puts & Breakeven",
    metaDescription: "Free options trading calculator. See profit or loss at expiration, the breakeven price, max loss and return for long or short calls and puts.",
    calcInputs: [
      {
        key: "strategy", label: "Position", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Buy a Call (Long Call)", value: 1 },
          { label: "Buy a Put (Long Put)", value: 2 },
          { label: "Sell a Call (Short Call)", value: 3 },
          { label: "Sell a Put (Short Put)", value: 4 },
        ],
      },
      currencyField("strike", "Strike Price", { default: 100, max: 1000000, step: 0.5 }),
      currencyField("premium", "Premium per Share", { default: 4, max: 100000, step: 0.05 }),
      numberField("contracts", "Contracts", { default: 2, min: 0, max: 100000, step: 1 }),
      numberField("sharesPerContract", "Shares per Contract", { default: 100, min: 1, max: 10000, step: 1 }),
      currencyField("priceAtExpiration", "Stock Price at Expiration", { default: 110, max: 1000000, step: 0.5 }),
    ],
    calcResult: { label: "Profit or Loss", format: "currency" },
    calcResults: [
      { key: "premiumPaidOrReceived", label: "Premium Paid or Received", format: "currency" },
      { key: "breakevenPrice", label: "Breakeven Price", format: "currency" },
      { key: "profitOrLoss", label: "Profit or Loss", format: "currency", highlight: true },
      { key: "returnOnPremium", label: "Return on Premium", format: "percentage" },
      { key: "maxLoss", label: "Maximum Loss (0 = Unlimited for Short Calls)", format: "currency" },
    ],
    instructions:
      "A call gives the right to buy at the strike price; a put, the right to sell. Buyers pay a premium and can lose only " +
      "that; sellers collect the premium but take on the obligation — unlimited risk for an uncovered short call. Each US " +
      "stock option contract covers 100 shares.\n\n" +
      "Enter the position and a stock price at expiration. Warrants work like long-dated calls; set the shares per " +
      "contract to the warrant's conversion ratio.",
    examples:
      "Example: buying 2 call contracts with a $100 strike for $4 a share costs $800. " +
      "The breakeven is $104. If the stock is at $110 at expiration, the profit is $1,200 — " +
      "a 150% return on the premium.",
    assumptions:
      "Value at expiration only, before commissions; before expiration an option also has time value. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens if my option expires in the money?",
        answer: "Most brokers automatically exercise options that are at least $0.01 in the money. Make sure you have the cash or shares, or close the position before expiration.",
      },
    ],
  },
  {
    slug: "covered-call-options-calculator",
    title: "Covered Call Options Calculator",
    description: "Calculate covered call returns: premium income, return if the shares aren't called and if they are, annualized returns and your downside breakeven.",
    metaTitle: "Covered Call Calculator — Premium & Annualized Return",
    metaDescription: "Free covered call calculator. See premium income, returns if called or not, annualized returns and the downside breakeven on your shares.",
    calcInputs: [
      numberField("shares", "Shares Owned", { default: 100, min: 0, max: 10000000, step: 100 }),
      currencyField("stockPrice", "Current Stock Price", { default: 50, max: 1000000, step: 0.5 }),
      currencyField("strike", "Call Strike Price", { default: 55, max: 1000000, step: 0.5 }),
      currencyField("premium", "Premium per Share", { default: 1, max: 100000, step: 0.05 }),
      numberField("days", "Days to Expiration", { default: 30, min: 1, max: 1000, step: 1 }),
    ],
    calcResult: { label: "Return If Not Called", format: "percentage" },
    calcResults: [
      { key: "premiumIncome", label: "Premium Income", format: "currency" },
      { key: "returnIfNotCalled", label: "Return If Not Called", format: "percentage", highlight: true },
      { key: "returnIfCalled", label: "Return If Called", format: "percentage" },
      { key: "annualizedIfNotCalled", label: "Annualized If Not Called", format: "percentage" },
      { key: "annualizedIfCalled", label: "Annualized If Called", format: "percentage" },
      { key: "downsideBreakeven", label: "Downside Breakeven", format: "currency" },
    ],
    instructions:
      "In a covered call, you own the shares and sell a call against them, collecting the premium. If the stock stays " +
      "below the strike, you keep the shares and the premium; if it rises above, your shares are called away at the " +
      "strike, capping your gain. The premium cushions a fall only slightly.\n\n" +
      "Returns are figured on the current stock price.",
    examples:
      "Example: selling a $55 call on 100 shares at $50 for $1 a share brings in $100 " +
      "— 2% in 30 days (24.33% annualized). If the shares are called, you also gain up " +
      "to the strike, for 12%. You're protected down to $49.",
    assumptions:
      "Held to expiration; commissions and dividends not included. Annualized figures assume you can repeat the trade, " +
      "which isn't guaranteed. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the main risk of covered calls?",
        answer: "You keep the full downside of owning the stock but give up gains above the strike. In a strong rally you'll underperform simply holding the shares.",
      },
    ],
  },
  {
    slug: "futures-trading-calculator",
    title: "Futures Trading Calculator",
    description: "Calculate futures and commodity trade profit or loss, the contract's notional value, margin required, leverage and return on margin.",
    metaTitle: "Futures Trading Calculator — Profit, Margin & Leverage",
    metaDescription: "Free futures calculator. See profit or loss, notional value, margin, leverage and return on margin for commodity and index futures.",
    calcInputs: [
      {
        key: "side", label: "Position", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Long (Buy)", value: 1 },
          { label: "Short (Sell)", value: 2 },
        ],
      },
      numberField("contracts", "Contracts", { default: 2, min: 0, max: 100000, step: 1 }),
      numberField("contractSize", "Contract Size (Units per Contract)", { default: 1000, min: 0, max: 10000000, step: 1 }),
      currencyField("entryPrice", "Entry Price per Unit", { default: 75, max: 10000000, step: 0.01 }),
      currencyField("exitPrice", "Exit Price per Unit", { default: 78, max: 10000000, step: 0.01 }),
      currencyField("marginPerContract", "Initial Margin per Contract", { default: 6000, max: 10000000, step: 100 }),
      currencyField("commissionPerContract", "Commission per Contract (Each Side)", { default: 5, max: 1000, step: 0.5, required: false }),
    ],
    calcResult: { label: "Profit or Loss", format: "currency" },
    calcResults: [
      { key: "notionalValue", label: "Notional Value", format: "currency" },
      { key: "marginRequired", label: "Margin Required", format: "currency" },
      { key: "leverage", label: "Leverage (Times)", format: "number" },
      { key: "profitOrLoss", label: "Profit or Loss", format: "currency", highlight: true },
      { key: "returnOnMargin", label: "Return on Margin", format: "percentage" },
      { key: "valuePerOnePointMove", label: "Value of a $1 Price Move", format: "currency" },
    ],
    instructions:
      "A futures contract is an agreement to buy or sell a set quantity of a commodity, index or currency at a future " +
      "date. You only post margin — a fraction of the contract's value — so gains and losses are leveraged and settled " +
      "daily. If your account falls below maintenance margin, you must add money.\n\n" +
      "Enter the contract size from the exchange's specifications (e.g., crude oil 1,000 barrels, gold 100 ounces, E-mini " +
      "S&P 500 $50 × the index).",
    examples:
      "Example: going long 2 crude oil contracts of 1,000 barrels at $75 controls $150,000 " +
      "with $12,000 of margin — 12.50 times leverage. Selling at $78 makes $5,980 after " +
      "commissions, a 49.83% return on margin.",
    assumptions:
      "Margin set by the exchange and broker changes with volatility; fees beyond commission are not included. US futures " +
      "gains are taxed 60% long-term, 40% short-term. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I lose more than my margin?",
        answer: "Yes. Futures losses aren't limited to the margin posted — a large move can leave you owing your broker more.",
      },
    ],
  },
  {
    slug: "margin-account-calculator",
    title: "Margin Account Calculator",
    description: "See what buying stock on margin does: the loan, interest cost, the price that triggers a margin call, and your return with and without margin.",
    metaTitle: "Margin Account Calculator — Margin Call & Interest",
    metaDescription: "Free margin account calculator. See your margin loan, interest cost, margin call price, and leveraged return compared with no margin.",
    calcInputs: [
      currencyField("purchaseAmount", "Total Purchase", { default: 20000, max: 1000000000, step: 100 }),
      currencyField("ownCash", "Your Own Cash", { default: 10000, max: 1000000000, step: 100 }),
      currencyField("buyPrice", "Buy Price per Share", { default: 50, max: 1000000, step: 0.5 }),
      currencyField("sellPrice", "Sell Price per Share", { default: 60, max: 1000000, step: 0.5 }),
      percentField("marginRatePercent", "Margin Interest Rate", { default: 11, max: 20, step: 0.25 }),
      numberField("months", "Months Held", { default: 6, min: 0, max: 120, step: 1 }),
      percentField("maintenancePercent", "Maintenance Requirement", { default: 25, max: 99, step: 1 }),
    ],
    calcResult: { label: "Margin Call Price", format: "currency" },
    calcResults: [
      { key: "marginLoan", label: "Margin Loan", format: "currency" },
      { key: "sharesBought", label: "Shares Bought", format: "number" },
      { key: "marginInterest", label: "Margin Interest", format: "currency" },
      { key: "marginCallPrice", label: "Margin Call Price", format: "currency", highlight: true },
      { key: "profitWithMargin", label: "Profit With Margin (After Interest)", format: "currency" },
      { key: "returnWithMargin", label: "Return on Your Cash", format: "percentage" },
      { key: "returnWithoutMargin", label: "Return Without Margin", format: "percentage" },
    ],
    instructions:
      "A margin account lets you borrow from your broker to buy more stock, using your holdings as collateral. Under Reg T " +
      "you can borrow up to 50% of the purchase. If your equity falls below the maintenance requirement (at least 25%, often " +
      "30% or more), you get a margin call and must add cash or sell.\n\n" +
      "Margin magnifies both gains and losses, and you pay interest on the loan.",
    examples:
      "Example: buying $20,000 of stock at $50 with $10,000 of your own money borrows $10,000. Over " +
      "6 months at 11%, interest is $550. Selling at $60 returns " +
      "34.50% on your cash versus 20% without margin. A drop to $33.33 would trigger a " +
      "margin call.",
    assumptions:
      "Simple interest on a constant loan; commissions and dividends not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is margin interest tax-deductible?",
        answer: "It can be, as investment interest expense, if you itemize — limited to your net investment income for the year.",
      },
    ],
  },
  {
    slug: "short-selling-investment-calculator",
    title: "Short Selling Investment Calculator",
    description: "Calculate profit or loss on a short sale after the stock borrow fee and dividends you owe, the return on your margin, and the price that would wipe out your margin.",
    metaTitle: "Short Selling Calculator — Profit, Borrow Fee & Risk",
    metaDescription: "Free short selling calculator. See short sale profit after borrow fees and dividends, return on margin, and the price that wipes out your margin.",
    calcInputs: [
      numberField("shares", "Shares Shorted", { default: 100, min: 0, max: 10000000, step: 1 }),
      currencyField("shortPrice", "Short Sale Price", { default: 50, max: 1000000, step: 0.5 }),
      currencyField("coverPrice", "Buy-Back (Cover) Price", { default: 40, max: 1000000, step: 0.5 }),
      percentField("borrowFeePercent", "Borrow Fee (Yearly)", { default: 3, max: 200, step: 0.25 }),
      numberField("days", "Days Held", { default: 60, min: 0, max: 3650, step: 1 }),
      currencyField("dividendsPerShare", "Dividends Paid While Short (per Share)", { default: 0.5, max: 10000, step: 0.05, required: false }),
      percentField("marginPercent", "Margin Posted (% of Proceeds)", { default: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Profit or Loss", format: "currency" },
    calcResults: [
      { key: "shortProceeds", label: "Short Sale Proceeds", format: "currency" },
      { key: "borrowFee", label: "Borrow Fee", format: "currency" },
      { key: "dividendsOwed", label: "Dividends Owed to Lender", format: "currency" },
      { key: "profitOrLoss", label: "Profit or Loss", format: "currency", highlight: true },
      { key: "returnOnMargin", label: "Return on Margin", format: "percentage" },
      { key: "priceThatWipesOutMargin", label: "Price That Wipes Out Your Margin", format: "currency" },
    ],
    instructions:
      "Short selling means borrowing shares, selling them, and buying them back later — profiting if the price falls. You " +
      "pay a borrow fee (low for most stocks, very high for hard-to-borrow ones) and any dividends paid while you're short. " +
      "Because a price can rise without limit, losses are theoretically unlimited.\n\n" +
      "Enter the trade; the last result shows how far the price could rise before your posted margin is gone.",
    examples:
      "Example: shorting 100 shares at $50 brings in $5,000. Covering at $40 after " +
      "60 days, less a $24.66 borrow fee and $50 of dividends, makes $925.34 — " +
      "37.01% on your margin. A rise to $75 would wipe out the margin.",
    assumptions:
      "Borrow fee charged daily on the original proceeds; commissions and margin interest not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a short squeeze?",
        answer: "When a heavily shorted stock rises, short sellers rush to buy shares to cover, pushing the price higher still and magnifying their losses.",
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
