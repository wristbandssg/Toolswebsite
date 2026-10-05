// One-time (but safe to re-run) batch setup script: creates the Stock tools
// (7) of the Investment Calculators expansion, filed under Investment Calculators > Stock & Options Calculators.
// See src/lib/calc-engine-investment-stocks.ts for the math and
// src/lib/calc-engine-investment-stocks.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-investment-stocks-calculators.ts
// or
//   npm run db:create-investment-stocks-calculators

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
    slug: "growth-stock-investment-calculator",
    title: "Growth Stock Investment Calculator",
    description: "Project a growth stock's future price from earnings growth and a future P/E, and see the expected yearly return, PEG ratio and what your investment could be worth.",
    metaTitle: "Growth Stock Calculator — Future Price, Return & PEG",
    metaDescription: "Free growth stock calculator. Project future EPS and price from earnings growth and P/E, and see the expected return and PEG ratio.",
    calcInputs: [
      currencyField("price", "Current Share Price", { default: 150, max: 1000000, step: 1 }),
      currencyField("eps", "Earnings per Share (EPS)", { default: 5, max: 100000, step: 0.1 }),
      percentField("growthPercent", "Expected EPS Growth per Year", { default: 15, min: -50, max: 100, step: 0.5 }),
      numberField("years", "Years", { default: 5, min: 1, max: 30, step: 1 }),
      numberField("futurePe", "P/E Ratio at the End", { default: 25, min: 0, max: 200, step: 0.5 }),
      currencyField("investment", "Amount Invested", { default: 10000, max: 100000000, step: 100 }),
    ],
    calcResult: { label: "Expected Yearly Return", format: "percentage" },
    calcResults: [
      { key: "currentPe", label: "Current P/E", format: "number" },
      { key: "pegRatio", label: "PEG Ratio", format: "number" },
      { key: "futureEps", label: "Future EPS", format: "currency" },
      { key: "futurePrice", label: "Future Share Price", format: "currency" },
      { key: "expectedYearlyReturn", label: "Expected Yearly Return", format: "percentage", highlight: true },
      { key: "investmentValue", label: "Investment Value at the End", format: "currency" },
    ],
    instructions:
      "Growth stocks are priced for future earnings. This calculator grows today's EPS at your expected rate, applies the " +
      "P/E you think the market will pay at the end, and works out the yearly return that implies. P/E ratios often shrink " +
      "as growth slows, so try a lower ending P/E than today's.\n\n" +
      "The PEG ratio (P/E divided by growth) helps compare growth stocks: around 1 is often seen as fair, above 2 as " +
      "expensive.",
    examples:
      "Example: a $150 stock earning $5 a share trades at 30 times earnings. If EPS grows 15% a " +
      "year for 5 years to $10.06 and the market pays 25 times earnings, the price reaches " +
      "$251.42 — a 10.88% yearly return, turning $10,000 into $16,761.31.",
    assumptions:
      "No dividends; growth is steady. Real results depend heavily on the growth and P/E you assume — small changes make a " +
      "big difference. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What growth rate should I use?",
        answer: "Analysts' long-term estimates are a starting point, but sustained growth above 20% a year is rare. Try a conservative and an optimistic case.",
      },
    ],
  },
  {
    slug: "value-stock-investment-calculator",
    title: "Value Stock Investment Calculator",
    description: "Estimate a value stock's intrinsic value with Benjamin Graham's formula and the Graham number, and see your margin of safety at today's price.",
    metaTitle: "Value Stock Calculator — Graham Number & Intrinsic Value",
    metaDescription: "Free value stock calculator. Find intrinsic value with Graham's formula and the Graham number, plus P/E, P/B and your margin of safety.",
    calcInputs: [
      currencyField("price", "Current Share Price", { default: 70, max: 1000000, step: 0.5 }),
      currencyField("eps", "Earnings per Share (EPS)", { default: 6, max: 100000, step: 0.1 }),
      currencyField("bookValuePerShare", "Book Value per Share", { default: 40, max: 1000000, step: 0.5 }),
      percentField("growthPercent", "Expected Growth (Next 7–10 Years)", { default: 5, max: 30, step: 0.5 }),
      percentField("bondYieldPercent", "AAA Corporate Bond Yield", { default: 5, min: 0.1, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "Margin of Safety", format: "percentage" },
    calcResults: [
      { key: "peRatio", label: "P/E Ratio", format: "number" },
      { key: "priceToBook", label: "Price-to-Book", format: "number" },
      { key: "grahamFormulaValue", label: "Graham Formula Value", format: "currency" },
      { key: "grahamNumber", label: "Graham Number", format: "currency" },
      { key: "marginOfSafety", label: "Margin of Safety", format: "percentage", highlight: true },
    ],
    instructions:
      "Value investors buy stocks trading below their intrinsic value. Graham's revised formula values a stock at EPS × " +
      "(8.5 + 2 × growth) × 4.4 ÷ the AAA corporate bond yield. The Graham number, √(22.5 × EPS × book value per share), is " +
      "the most a defensive investor should pay (P/E 15 and P/B 1.5).\n\n" +
      "The margin of safety compares the price with the lower of the two values; Graham wanted at least a third.",
    examples:
      "Example: a $70 stock with $6 of EPS and $40 of book value trades at a P/E of 11.67 and " +
      "P/B of 1.75. Graham's formula gives $97.68 and the Graham number $73.48, so the margin " +
      "of safety is 4.74%.",
    assumptions:
      "Uses trailing EPS. These are rules of thumb for stable, profitable companies; they don't suit banks, early-stage or " +
      "loss-making firms. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a value trap?",
        answer: "A stock that looks cheap because its business is shrinking. Check that earnings and book value are stable or growing before relying on these numbers.",
      },
    ],
  },
  {
    slug: "preferred-stock-investment-calculator",
    title: "Preferred Stock Investment Calculator",
    description: "Calculate a preferred stock's dividend, current yield, yield to call and after-tax yield, plus your yearly income from the shares.",
    metaTitle: "Preferred Stock Calculator — Yield & Yield to Call",
    metaDescription: "Free preferred stock calculator. See the dividend, current yield, yield to call, after-tax yield and yearly income from preferred shares.",
    calcInputs: [
      currencyField("parValue", "Par Value", { default: 25, max: 100000, step: 1 }),
      percentField("dividendRatePercent", "Dividend Rate (% of Par)", { default: 6, max: 20, step: 0.05 }),
      currencyField("price", "Current Price", { default: 24, max: 100000, step: 0.05 }),
      currencyField("callPrice", "Call Price", { default: 25, max: 100000, step: 0.05 }),
      numberField("yearsToCall", "Years Until Callable", { default: 3, min: 0.25, max: 30, step: 0.25 }),
      percentField("taxRatePercent", "Tax Rate on Dividends", { default: 15, max: 50, step: 1 }),
      numberField("shares", "Shares", { default: 400, min: 0, max: 10000000, step: 1 }),
    ],
    calcResult: { label: "Current Yield", format: "percentage" },
    calcResults: [
      { key: "annualDividend", label: "Annual Dividend per Share", format: "currency" },
      { key: "currentYield", label: "Current Yield", format: "percentage", highlight: true },
      { key: "yieldToCall", label: "Yield to Call", format: "percentage" },
      { key: "afterTaxYield", label: "After-Tax Yield", format: "percentage" },
      { key: "yearlyIncome", label: "Yearly Income", format: "currency" },
    ],
    instructions:
      "Preferred stocks pay a fixed dividend — a percentage of par value, usually $25 — before common shareholders get " +
      "anything. Most can be called (redeemed) at par after a set date. If you buy below par and it's called, you gain; " +
      "above par, you lose — so look at the yield to call as well as the current yield.\n\n" +
      "Many preferred dividends are qualified (taxed at 0/15/20%), but some, like those from REITs and trust preferreds, " +
      "are taxed as ordinary income.",
    examples:
      "Example: a $25 preferred paying 6% earns $1.50 a year. At $24, the current " +
      "yield is 6.25% and the yield to call in 3 years is 7.50%. 400 shares pay " +
      "$600 a year — 5.31% after a 15% tax.",
    assumptions:
      "Quarterly dividends paid in full; yield to call assumes the issuer calls on the first call date. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are preferred dividends guaranteed?",
        answer: "No. The company can suspend them; cumulative preferreds must catch up on missed dividends before common shareholders are paid, non-cumulative ones don't.",
      },
    ],
  },
  {
    slug: "ipo-investment-calculator",
    title: "IPO Investment Calculator",
    description: "Estimate an IPO investment: the shares you're likely to be allotted, the first-day (listing) gain, and the return a year later from the offer price or the first-day close.",
    metaTitle: "IPO Investment Calculator — Allotment & Listing Gain",
    metaDescription: "Free IPO calculator. See shares allotted, the first-day listing gain, and the one-year return from the offer price or the first-day close.",
    calcInputs: [
      numberField("sharesApplied", "Shares Applied For", { default: 500, min: 0, max: 10000000, step: 1 }),
      percentField("allocationPercent", "Share of Application Allotted", { default: 20, max: 100, step: 1 }),
      currencyField("offerPrice", "IPO Offer Price", { default: 20, max: 100000, step: 0.5 }),
      currencyField("firstDayClose", "First-Day Closing Price", { default: 26, max: 100000, step: 0.5 }),
      currencyField("priceAfterYear", "Price After One Year", { default: 24, max: 100000, step: 0.5 }),
    ],
    calcResult: { label: "First-Day Gain", format: "currency" },
    calcResults: [
      { key: "sharesAllotted", label: "Shares Allotted", format: "number" },
      { key: "amountInvested", label: "Amount Invested", format: "currency" },
      { key: "firstDayGain", label: "First-Day Gain", format: "currency", highlight: true },
      { key: "firstDayReturn", label: "First-Day Return", format: "percentage" },
      { key: "oneYearReturnFromOffer", label: "1-Year Return From Offer Price", format: "percentage" },
      { key: "oneYearReturnIfBoughtAtClose", label: "1-Year Return If Bought at First-Day Close", format: "percentage" },
    ],
    instructions:
      "Popular IPOs are oversubscribed, so you usually get only part of the shares you ask for at the offer price — or " +
      "none. Most investors can only buy once trading opens, often well above the offer price after the first-day \"pop.\"\n\n" +
      "Enter your application, the expected allotment and prices to compare buying at the offer price with buying on the " +
      "first day. Insiders' lock-up period usually ends 90–180 days after the IPO, which can pressure the price.",
    examples:
      "Example: applying for 500 shares at $20 with a 20% allotment gets you " +
      "100 shares for $2,000. A first-day close of $26 is a $600 gain " +
      "(30%). A year later at $24, you're up 20% — but someone who bought at " +
      "the first-day close is down.",
    assumptions:
      "No fees or taxes. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do IPOs usually make money?",
        answer: "Studies find IPOs on average lag the market over the following years, even after a strong first day. Getting shares at the offer price makes the biggest difference.",
      },
    ],
  },
  {
    slug: "international-stock-investment-calculator",
    title: "International Stock Investment Calculator",
    description: "See your return in US dollars from international or emerging market stocks: local price return, the currency move, and dividends after foreign tax withholding.",
    metaTitle: "International Stock Calculator — Currency & Return",
    metaDescription: "Free international stock calculator. Combine local returns, currency moves and dividends after foreign withholding to see your return in dollars.",
    calcInputs: [
      currencyField("investment", "Amount Invested", { default: 10000, max: 100000000, step: 100 }),
      percentField("localReturnPercent", "Price Return in Local Currency (per Year)", { default: 6, min: -50, max: 50, step: 0.25 }),
      percentField("currencyChangePercent", "Local Currency vs Dollar (per Year)", { default: 1, min: -30, max: 30, step: 0.25 }),
      percentField("dividendYieldPercent", "Dividend Yield", { default: 3, max: 20, step: 0.1 }),
      percentField("withholdingPercent", "Foreign Dividend Withholding Tax", { default: 15, max: 50, step: 1 }),
      numberField("years", "Years", { default: 10, min: 0, max: 50, step: 1 }),
    ],
    calcResult: { label: "Value After the Years", format: "currency" },
    calcResults: [
      { key: "priceReturnInUsd", label: "Price Return in Dollars (per Year)", format: "percentage" },
      { key: "totalYearlyReturnInUsd", label: "Total Return in Dollars (per Year)", format: "percentage" },
      { key: "valueAfterYears", label: "Value After the Years", format: "currency", highlight: true },
      { key: "foreignTaxWithheld", label: "Foreign Tax Withheld", format: "currency" },
    ],
    instructions:
      "When you own foreign stocks, your return in dollars depends on both the stock and the currency: if the stock rises " +
      "6% and its currency gains 1% against the dollar, you earn about 7%. A falling currency works against you. Emerging " +
      "markets add higher growth potential and bigger swings.\n\n" +
      "Many countries withhold tax on dividends (often 15% under US treaties). In a taxable account you can usually claim " +
      "it back as a foreign tax credit; in an IRA you can't.",
    examples:
      "Example: $10,000 in international stocks rising 6% a year locally while the currency gains " +
      "1% earns 7.06% in dollars, or 9.64% with dividends. After " +
      "10 years it's worth $25,090.66, with $711.82 of foreign tax withheld along the way.",
    assumptions:
      "Steady yearly returns and currency moves, dividends reinvested; fund expenses are not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I hedge currency risk?",
        answer: "Currency-hedged funds remove the currency effect for a small cost. Over long periods currency moves tend to even out, and unhedged exposure adds diversification.",
      },
    ],
  },
  {
    slug: "rights-issue-calculator",
    title: "Rights Issue Calculator",
    description: "Work out a rights issue: the new shares you're entitled to, the cost to take them up, the theoretical ex-rights price, and what your rights are worth if you sell them.",
    metaTitle: "Rights Issue Calculator — TERP & Value of Rights",
    metaDescription: "Free rights issue calculator. Find your entitlement, the cost to take up, the theoretical ex-rights price and the value of your rights.",
    calcInputs: [
      numberField("sharesHeld", "Shares You Hold", { default: 1000, min: 0, max: 100000000, step: 1 }),
      numberField("newPerHeld", "New Shares Offered…", { default: 1, min: 0, max: 100, step: 1 }),
      numberField("heldPerNew", "…For Every Shares Held", { default: 4, min: 1, max: 100, step: 1 }),
      currencyField("marketPrice", "Share Price Before the Issue", { default: 50, max: 1000000, step: 0.5 }),
      currencyField("subscriptionPrice", "Subscription Price", { default: 40, max: 1000000, step: 0.5 }),
    ],
    calcResult: { label: "Theoretical Ex-Rights Price", format: "currency" },
    calcResults: [
      { key: "newSharesEntitled", label: "New Shares You're Entitled To", format: "number" },
      { key: "costToTakeUp", label: "Cost to Take Up", format: "currency" },
      { key: "theoreticalExRightsPrice", label: "Theoretical Ex-Rights Price", format: "currency", highlight: true },
      { key: "valuePerRight", label: "Value of the Right per New Share", format: "currency" },
      { key: "valueOfYourRights", label: "Value of Your Rights", format: "currency" },
      { key: "holdingValueIfYouDoNothing", label: "Your Shares' Value After (If You Do Nothing)", format: "currency" },
    ],
    instructions:
      "In a rights issue, a company offers existing shareholders new shares at a discount, in proportion to what they own " +
      "(for example, 1 new share for every 4 held). Because new shares are issued cheaply, the share price is expected to " +
      "fall to the theoretical ex-rights price (TERP).\n\n" +
      "You can take up your rights, sell them (if they're tradable) or let them lapse. Doing nothing leaves you worse off by " +
      "the value of the rights, so it's rarely the best choice.",
    examples:
      "Example: holding 1,000 shares in a 1-for-4 issue at $40 entitles you to 250 new " +
      "shares, costing $10,000. With the shares at $50, the TERP is $48, so each " +
      "right is worth $8 — $2,000 in total if you sell them instead.",
    assumptions:
      "The market prices the shares exactly at the TERP; in practice prices move with news and demand. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do companies do rights issues?",
        answer: "To raise money from existing shareholders without diluting them if they take up their rights — often to pay down debt or fund growth.",
      },
    ],
  },
  {
    slug: "spinoff-stock-calculator",
    title: "Spinoff Stock Calculator",
    description: "Split your cost basis between the parent company and the spun-off shares after a spinoff, using their market values, to report gains correctly when you sell.",
    metaTitle: "Spinoff Stock Calculator — Cost Basis Allocation",
    metaDescription: "Free spinoff calculator. Divide your original cost basis between parent and spinoff shares by market value, in total and per share.",
    calcInputs: [
      numberField("parentShares", "Parent Shares You Own", { default: 100, min: 0, max: 100000000, step: 1 }),
      currencyField("originalBasis", "Original Cost Basis (Total)", { default: 10000, max: 1000000000, step: 100 }),
      currencyField("parentPrice", "Parent Price After the Spinoff", { default: 80, max: 1000000, step: 0.5 }),
      numberField("spinRatio", "Spinoff Shares per Parent Share", { default: 0.5, min: 0, max: 100, step: 0.01 }),
      currencyField("spinPrice", "Spinoff Share Price", { default: 40, max: 1000000, step: 0.5 }),
    ],
    calcResult: { label: "Spinoff Cost Basis", format: "currency" },
    calcResults: [
      { key: "spinoffSharesReceived", label: "Spinoff Shares Received", format: "number" },
      { key: "parentBasisPercent", label: "Basis Kept by Parent", format: "percentage" },
      { key: "parentNewBasis", label: "Parent New Cost Basis", format: "currency" },
      { key: "spinoffBasis", label: "Spinoff Cost Basis", format: "currency", highlight: true },
      { key: "parentBasisPerShare", label: "Parent Basis per Share", format: "currency" },
      { key: "spinoffBasisPerShare", label: "Spinoff Basis per Share", format: "currency" },
    ],
    instructions:
      "A tax-free spinoff doesn't create income, but your original cost basis must be divided between the parent and the " +
      "new company, in proportion to their market values just after the spinoff. The company publishes the exact " +
      "percentages (on IRS Form 8937), and your broker usually applies them.\n\n" +
      "Enter your shares and basis, the distribution ratio and both prices (usually the first day's regular-way prices).",
    examples:
      "Example: 100 parent shares with a $10,000 basis receive 50 spinoff shares. At " +
      "$80 and $40, the parent keeps 80% of the basis ($8,000) and the spinoff " +
      "gets $2,000 — $40 a share.",
    assumptions:
      "Tax-free spinoff; cash paid for fractional shares is taxable and not modeled. Your holding period carries over to the " +
      "spinoff shares. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Where do I find the official allocation?",
        answer: "In the company's Form 8937 (Report of Organizational Actions Affecting Basis), on its investor relations website.",
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
