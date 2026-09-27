// One-time (but safe to re-run) batch setup script: creates the 3 tools of
// the "Currency & Exchange Calculators" batch. Fifth of 8 new topic
// batches built from Finance_Calculators_Topical_SEO_Master.xlsx. Filed
// under the existing "Currency & Exchange Calculators" category
// (currency-exchange-calculators), created empty by
// reparent-tool-categories-under-finance.ts and populated here for the
// first time.
//
// See src/lib/calc-engine-finance-currency.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-finance-currency-calculators.ts
// or
//   npm run db:create-finance-currency-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "currency-exchange-calculators";

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
  opts: { required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "percentage",
    unit: "%",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
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
  "advice. Foreign exchange trading carries significant risk of loss and isn't suitable for every investor.";

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
    slug: "currency-converter",
    title: "Currency Converter",
    description: "Convert an amount from one currency to another using an exchange rate you enter.",
    metaTitle: "Currency Converter — Free & Instant",
    metaDescription: "Free currency converter. Enter an amount and exchange rate to see the converted amount and inverse rate.",
    calcInputs: [
      currencyField("amount", "Amount", { default: 1000, max: 1000000000, step: 10 }),
      { key: "exchangeRate", label: "Exchange Rate (units of target currency per 1 unit of source)", type: "number", required: true, default: 1.08, min: 0.000001, max: 1000, step: 0.0001 },
    ],
    calcResult: { label: "Converted Amount", format: "currency" },
    calcResults: [
      { key: "convertedAmount", label: "Converted Amount", format: "currency", highlight: true },
      { key: "inverseRate", label: "Inverse Rate", format: "number" },
    ],
    instructions:
      "Enter the amount you want to convert and today's exchange rate (units of the target currency you get " +
      "for 1 unit of the source currency — check a current rate from your bank, card issuer, or a financial " +
      "news source, since this tool doesn't pull a live rate itself). The result shows the converted amount and " +
      "the inverse rate (useful for converting back the other direction).",
    examples: "Example: converting 1,000 units at an exchange rate of 1.08 gives 1,080.00 in the target currency — an inverse rate of about 0.925926.",
    assumptions:
      "This calculator does NOT fetch a live exchange rate — enter the current rate yourself from a trusted " +
      "source. Exchange rates change constantly, and the rate your bank or card issuer actually applies often " +
      "includes a markup over the wholesale \"mid-market\" rate quoted by financial news sources. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why doesn't this show a live exchange rate?",
        answer: "This site doesn't connect to a live currency data feed — enter the current rate yourself from your bank, card issuer, or a financial news source, and this tool handles the conversion math and inverse rate for you.",
      },
      {
        question: "Why is my bank's rate different from the rate I see online?",
        answer: "Banks and card issuers typically apply a markup over the wholesale \"mid-market\" exchange rate quoted by financial news sources — this is a common (and often significant) source of cost on international transactions.",
      },
    ],
  },
  {
    slug: "forex-profit-loss-calculator",
    title: "Forex Profit/Loss Calculator",
    description: "Calculate the profit or loss on a forex trade from your position size, entry price, exit price, and trade direction.",
    metaTitle: "Forex Profit/Loss Calculator — Free & Instant",
    metaDescription: "Free forex profit/loss calculator. Enter your position size, entry and exit price, and direction to see your trade's profit or loss.",
    calcInputs: [
      numberField("positionSizeUnits", "Position Size (units of base currency)", { default: 10000, max: 100000000, step: 1000 }),
      { key: "entryPrice", label: "Entry Price", type: "number", required: true, default: 1.1, min: 0.000001, max: 1000, step: 0.0001 },
      { key: "exitPrice", label: "Exit Price", type: "number", required: true, default: 1.105, min: 0, max: 1000, step: 0.0001 },
      { key: "tradeDirection", label: "Trade Direction", type: "dropdown", required: true, default: 1, options: [
        { label: "Long (Buy)", value: 1 },
        { label: "Short (Sell)", value: -1 },
      ] },
    ],
    calcResult: { label: "Profit / Loss", format: "currency" },
    calcResults: [
      { key: "profitLoss", label: "Profit / Loss", format: "currency", highlight: true },
      { key: "profitLossPercent", label: "Profit / Loss (% of notional value)", format: "percentage" },
    ],
    instructions:
      "Enter your position size (in units of the base currency — e.g. 10,000 units of a currency pair), your " +
      "entry and exit price, and whether the trade was Long (you bought, profiting if price rises) or Short " +
      "(you sold, profiting if price falls). The result shows your profit or loss in the quote currency, and as " +
      "a percentage of the position's notional value.",
    examples: "Example: a Long position of 10,000 units entered at 1.1000 and exited at 1.1050 earns a $50.00 profit — about a 0.45% return on notional value.",
    assumptions:
      "This calculates raw price-movement profit/loss only — it doesn't include spread, commission, swap/rollover " +
      "fees, or leverage-related margin calls, all of which affect a real trade's actual return. Profit/loss is " +
      "shown in the quote currency (the second currency in the pair). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between Long and Short?",
        answer: "A Long position profits when the price rises (you bought low, hoping to sell high). A Short position profits when the price falls (you sold first, hoping to buy back lower) — select whichever matches your actual trade.",
      },
      {
        question: "Does this include spread or commission?",
        answer: "No — this shows raw profit/loss from the price movement only. Your broker's spread, commission, and any overnight swap/rollover fees would reduce your actual realized profit (or increase a loss) beyond what's shown here.",
      },
    ],
  },
  {
    slug: "forex-position-size-calculator",
    title: "Forex Position Size Calculator",
    description: "Calculate the position size that keeps your risk per trade within your target percentage of account balance.",
    metaTitle: "Forex Position Size Calculator — Free & Instant",
    metaDescription: "Free forex position size calculator. Enter your account balance, risk percentage, and stop-loss distance to see your safe position size.",
    calcInputs: [
      currencyField("accountBalance", "Account Balance", { default: 10000, max: 100000000, step: 100 }),
      percentField("riskPercent", "Risk Per Trade (% of account)", { default: 2, max: 20, step: 0.25 }),
      numberField("stopLossPips", "Stop-Loss Distance (pips)", { default: 50, max: 10000, step: 1 }),
      currencyField("pipValuePerStandardLot", "Pip Value Per Standard Lot", { default: 10, max: 1000, step: 0.5 }),
    ],
    calcResult: { label: "Position Size (Units)", format: "number" },
    calcResults: [
      { key: "riskAmount", label: "Dollar Risk This Trade", format: "currency" },
      { key: "positionSizeInLots", label: "Position Size (Standard Lots)", format: "number" },
      { key: "positionSizeUnits", label: "Position Size (Units)", format: "number", highlight: true },
    ],
    instructions:
      "Enter your account balance, the percentage of it you're willing to risk on this one trade (many traders " +
      "use 1-2%), your stop-loss distance in pips, and the pip value per standard lot for the pair you're " +
      "trading (commonly around $10 for a standard 100,000-unit lot on many USD-quoted pairs, but this varies " +
      "by pair and account currency — check your broker's specification). The result shows your dollar risk and " +
      "the position size (in lots and units) that keeps your loss at that stop-loss distance equal to your " +
      "target risk amount.",
    examples: "Example: a $10,000 account risking 2% ($200) per trade, with a 50-pip stop-loss and a $10 pip value per standard lot, supports a position size of 0.4 standard lots — 40,000 units.",
    assumptions:
      "Pip value varies by currency pair and account currency — the default $10 per standard lot is a common " +
      "approximation for many USD-quoted major pairs, but check your specific broker and pair for an exact " +
      "figure. This also doesn't account for leverage limits or margin requirements your broker may impose " +
      "separately from your own risk management. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is position sizing based on risk rather than a fixed lot size?",
        answer: "Because a fixed lot size exposes you to wildly different dollar risk depending on your stop-loss distance — risk-based position sizing keeps your MAXIMUM LOSS on any single trade consistent (as a percentage of your account) regardless of how wide or tight your stop is.",
      },
      {
        question: "What risk percentage should I use?",
        answer: "Many traders and risk-management guides commonly suggest 1-2% of account balance per trade, so that a string of losses doesn't rapidly deplete the account — but your own risk tolerance and trading strategy should guide the exact figure.",
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
