// One-time (but safe to re-run) batch setup script: creates the 7 tools of
// the "Investment Calculators" batch. Sixth of 8 new topic batches built
// from Finance_Calculators_Topical_SEO_Master.xlsx. Filed under the
// existing "Investment Calculators" category (investment-calculators),
// created empty by reparent-tool-categories-under-finance.ts and
// populated here for the first time.
//
// See src/lib/calc-engine-finance-investment.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-finance-investment-calculators.ts
// or
//   npm run db:create-finance-investment-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Re-pointed 5 Oct 2026: Investment Calculators was split into 5 sub-categories
// (see organize-tool-categories.ts). Each tool is filed in one of them; a
// missing sub-category is created under Investment Calculators.
const PARENT_CATEGORY_SLUG = "investment-calculators";
const SUBCATEGORY_NAMES: Record<string, string> = {
  "investment-returns-planning-calculators": "Investment Returns & Planning Calculators",
  "stock-options-calculators": "Stock & Options Calculators",
};
const TOOL_CATEGORY: Record<string, string> = {
  "investment-calculator": "investment-returns-planning-calculators",
  "compound-interest-calculator": "investment-returns-planning-calculators",
  "simple-interest-calculator": "investment-returns-planning-calculators",
  "cagr-calculator": "investment-returns-planning-calculators",
  "dividend-calculator": "stock-options-calculators",
  "stock-profit-calculator": "stock-options-calculators",
  "dollar-cost-averaging-calculator": "investment-returns-planning-calculators",
};

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
    max: opts.max ?? 50,
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
    max: opts.max ?? 100,
    step: opts.step ?? 1,
  };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't investment advice. Past " +
  "performance and assumed rates of return don't guarantee future results — actual investment returns vary and " +
  "can be negative. Consult a qualified financial advisor for guidance specific to your situation.";

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
    slug: "investment-calculator",
    title: "Investment Calculator",
    description: "Project the future value of an investment, combining an initial lump sum with regular monthly contributions.",
    metaTitle: "Investment Calculator — Free & Instant",
    metaDescription: "Free investment calculator. Enter your initial investment, monthly contribution, expected return, and time horizon to see your projected future value.",
    calcInputs: [
      currencyField("initialInvestment", "Initial Investment", { default: 5000, max: 100000000, step: 500 }),
      currencyField("monthlyContribution", "Monthly Contribution", { required: false, default: 200, max: 1000000, step: 25 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 7, max: 30, step: 0.5 }),
      numberField("yearsToGrow", "Years to Grow", { default: 20, max: 60, step: 1 }),
    ],
    calcResult: { label: "Future Value", format: "currency" },
    calcResults: [
      { key: "futureValue", label: "Future Value", format: "currency", highlight: true },
      { key: "totalContributions", label: "Total Contributions (yours)", format: "currency" },
      { key: "totalGrowth", label: "Total Growth (investment earnings)", format: "currency" },
    ],
    instructions:
      "Enter your initial investment, how much you plan to contribute each month, your expected annual return, " +
      "and how many years you plan to invest. The result projects the future value of your investment, " +
      "separating out how much of it came from your own contributions versus investment growth.",
    examples: "Example: a $5,000 initial investment with $200 added monthly, growing at an expected 7% annual return over 20 years, projects to about $124,379.03 — with $53,000 of that being your own contributions and $71,379.03 from investment growth.",
    assumptions:
      "This assumes a constant annual return applied monthly and contributions made consistently every month " +
      "for the full period — real investment returns vary year to year (sometimes significantly, including " +
      "negative years), so actual results will differ from this smooth projection. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What return rate should I use?",
        answer: "This depends entirely on your investment mix and risk tolerance — a diversified stock portfolio has historically averaged higher long-term returns than bonds or cash, but with much more year-to-year variability. There's no single \"correct\" number to enter; try a range of rates to see how sensitive your projection is.",
      },
      {
        question: "Does this account for taxes or fees?",
        answer: "No — this shows gross investment growth before any taxes on gains/dividends or investment fees (like fund expense ratios), which would reduce your actual net return below what's shown here.",
      },
    ],
  },
  {
    slug: "compound-interest-calculator",
    title: "Compound Interest Calculator",
    description: "Calculate the future value of a lump sum with compound interest, at your choice of compounding frequency.",
    metaTitle: "Compound Interest Calculator — Free & Instant",
    metaDescription: "Free compound interest calculator. Enter your principal, rate, compounding frequency, and time to see your future value and total interest.",
    calcInputs: [
      currencyField("principal", "Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 6, max: 30, step: 0.1 }),
      { key: "compoundingFrequency", label: "Compounding Frequency", type: "dropdown", required: true, default: 12, options: [
        { label: "Annually", value: 1 },
        { label: "Semi-Annually", value: 2 },
        { label: "Quarterly", value: 4 },
        { label: "Monthly", value: 12 },
        { label: "Daily", value: 365 },
      ] },
      numberField("years", "Years", { default: 10, max: 60, step: 1 }),
    ],
    calcResult: { label: "Future Value", format: "currency" },
    calcResults: [
      { key: "futureValue", label: "Future Value", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest Earned", format: "currency" },
    ],
    instructions:
      "Enter your principal (starting amount), annual interest rate, how often interest compounds, and the " +
      "number of years. The result shows the future value and total interest earned — more frequent compounding " +
      "(daily vs. annually) produces a slightly higher return at the same stated annual rate.",
    examples: "Example: a $10,000 principal at 6% annual interest, compounded monthly for 10 years, grows to about $18,193.97 — $8,193.97 in total interest.",
    assumptions: "This is a lump-sum calculation with no additional contributions — for an investment that also adds regular contributions over time, see this site's Investment Calculator instead. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does compounding frequency make a big difference?",
        answer: "It has a real but usually modest effect at typical rates — daily compounding grows slightly faster than annual compounding at the same stated rate, with the difference growing larger at higher rates and longer time periods.",
      },
      {
        question: "How is this different from the Investment Calculator?",
        answer: "This tool models a single lump sum with no further contributions. The Investment Calculator adds a regular monthly contribution on top of an initial amount, which is a more realistic model for ongoing retirement or brokerage account investing.",
      },
    ],
  },
  {
    slug: "simple-interest-calculator",
    title: "Simple Interest Calculator",
    description: "Calculate simple interest — interest calculated only on the original principal, not compounded.",
    metaTitle: "Simple Interest Calculator — Free & Instant",
    metaDescription: "Free simple interest calculator. Enter your principal, rate, and time to see your simple interest and total amount.",
    calcInputs: [
      currencyField("principal", "Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 5, max: 30, step: 0.1 }),
      numberField("years", "Years", { default: 3, max: 60, step: 1 }),
    ],
    calcResult: { label: "Total Amount", format: "currency" },
    calcResults: [
      { key: "interest", label: "Simple Interest", format: "currency" },
      { key: "totalAmount", label: "Total Amount", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your principal, annual interest rate, and time period in years. Simple interest is calculated ONLY " +
      "on the original principal (unlike compound interest, which also earns interest on previously accumulated " +
      "interest) — the result shows the interest earned and the total amount.",
    examples: "Example: a $10,000 principal at 5% simple interest for 3 years earns $1,500 in interest — an $11,500 total amount.",
    assumptions: "Simple interest is used for some loans and short-term instruments, but most savings accounts, CDs, and investments actually compound — see this site's Compound Interest Calculator for that comparison. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between simple and compound interest?",
        answer: "Simple interest is calculated only on the original principal every period. Compound interest is calculated on the principal PLUS any interest already earned, so it grows faster over time — the longer the time period, the bigger the gap between the two.",
      },
      {
        question: "Where is simple interest actually used?",
        answer: "Some short-term loans, certain bonds, and a few specific financial instruments use simple interest — but most everyday savings accounts, CDs, and investment accounts compound instead, so check which applies to your specific product.",
      },
    ],
  },
  {
    slug: "cagr-calculator",
    title: "CAGR Calculator",
    description: "Calculate the compound annual growth rate (CAGR) of an investment from its beginning value, ending value, and time period.",
    metaTitle: "CAGR Calculator — Free & Instant",
    metaDescription: "Free CAGR calculator. Enter your beginning value, ending value, and number of years to see your compound annual growth rate.",
    calcInputs: [
      currencyField("beginningValue", "Beginning Value", { default: 10000, max: 100000000, step: 500 }),
      currencyField("endingValue", "Ending Value", { default: 18000, max: 100000000, step: 500 }),
      numberField("years", "Number of Years", { default: 5, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "CAGR", format: "percentage" },
    calcResults: [],
    instructions:
      "Enter the beginning value, ending value, and the number of years between them. CAGR (compound annual " +
      "growth rate) smooths out the actual year-to-year ups and downs into a single steady annual rate that " +
      "would produce the same overall result — useful for comparing investments held over different lengths " +
      "of time.",
    examples: "Example: an investment that grows from $10,000 to $18,000 over 5 years has a CAGR of about 12.47%.",
    assumptions:
      "CAGR is a smoothed, hypothetical steady rate — it doesn't reflect the actual volatility along the way " +
      "(an investment could have had a great year and a terrible year that still averages out to the same " +
      "CAGR as one with smooth, consistent growth). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why use CAGR instead of just total percentage growth?",
        answer: "Total growth percentage doesn't account for how long it took — CAGR converts any growth over any time period into an equivalent steady ANNUAL rate, making it possible to fairly compare investments held for different lengths of time.",
      },
      {
        question: "Does CAGR show the real year-to-year volatility?",
        answer: "No — CAGR is a smoothed average. Two investments with the same CAGR could have had very different paths getting there, one smooth and steady, another with sharp swings up and down.",
      },
    ],
  },
  {
    slug: "dividend-calculator",
    title: "Dividend Calculator",
    description: "Calculate your total annual dividend income and dividend yield from your shares and dividend per share.",
    metaTitle: "Dividend Calculator — Free & Instant",
    metaDescription: "Free dividend calculator. Enter your share price, number of shares, and dividend per share to see your total dividend income and yield.",
    calcInputs: [
      currencyField("sharePrice", "Share Price", { default: 50, max: 1000000, step: 0.5 }),
      numberField("numberOfShares", "Number of Shares", { default: 200, max: 10000000, step: 1 }),
      currencyField("annualDividendPerShare", "Annual Dividend Per Share", { default: 2, max: 10000, step: 0.05 }),
    ],
    calcResult: { label: "Total Annual Dividend", format: "currency" },
    calcResults: [
      { key: "totalAnnualDividend", label: "Total Annual Dividend", format: "currency", highlight: true },
      { key: "dividendYieldPercent", label: "Dividend Yield", format: "percentage" },
      { key: "totalInvestmentValue", label: "Total Investment Value", format: "currency" },
    ],
    instructions:
      "Enter the current share price, how many shares you own (or plan to buy), and the annual dividend paid " +
      "per share. The result shows your total annual dividend income, the dividend yield (annual dividend as a " +
      "percentage of share price), and your total investment value.",
    examples: "Example: 200 shares at a $50 share price paying a $2 annual dividend per share gives $400 in total annual dividend income — a 4% dividend yield, on a $10,000 total investment.",
    assumptions:
      "This assumes the dividend per share stays constant — real dividends are often increased (or occasionally " +
      "cut) over time by the company's board, and this doesn't account for dividend reinvestment, which would " +
      "compound your share count and future dividend income over time. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a good dividend yield?",
        answer: "It varies by sector and market conditions — many broad market indexes yield somewhere around 1-2%, while dividend-focused stocks and funds often target 3-6% or higher, sometimes signaling higher risk. Compare against similar investments rather than a universal benchmark.",
      },
      {
        question: "Does this include dividend reinvestment?",
        answer: "No — this shows a single year's dividend income at your current share count. If you reinvest dividends to buy more shares, your share count (and future dividend income) would grow faster than shown here.",
      },
    ],
  },
  {
    slug: "stock-profit-calculator",
    title: "Stock Profit Calculator",
    description: "Calculate your profit or loss on a stock trade from your number of shares, buy price, sell price, and commission.",
    metaTitle: "Stock Profit Calculator — Free & Instant",
    metaDescription: "Free stock profit calculator. Enter your shares, buy price, sell price, and commission to see your total profit and return percentage.",
    calcInputs: [
      numberField("numberOfShares", "Number of Shares", { default: 100, max: 10000000, step: 1 }),
      currencyField("buyPrice", "Buy Price Per Share", { default: 50, max: 1000000, step: 0.5 }),
      currencyField("sellPrice", "Sell Price Per Share", { default: 65, max: 1000000, step: 0.5 }),
      currencyField("commissionPerTrade", "Commission Per Trade (buy or sell)", { required: false, default: 10, max: 10000, step: 1 }),
    ],
    calcResult: { label: "Profit", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Total Cost (buy)", format: "currency" },
      { key: "totalProceeds", label: "Total Proceeds (sell)", format: "currency" },
      { key: "profit", label: "Profit", format: "currency", highlight: true },
      { key: "profitPercent", label: "Return", format: "percentage" },
    ],
    instructions:
      "Enter the number of shares, your buy price and sell price per share, and any commission you paid per " +
      "trade (enter the SAME commission amount here — it will be applied to both the buy and the sell). The " +
      "result shows your total cost, total proceeds, profit, and return percentage.",
    examples: "Example: 100 shares bought at $50 and sold at $65, with a $10 commission on each trade, costs $5,010 total and returns $6,490 in proceeds — a $1,480 profit, a 29.54% return.",
    assumptions:
      "This doesn't include any tax on capital gains, which applies separately depending on your holding period " +
      "and jurisdiction — see this site's Capital Gains Tax Calculator for that figure. It also assumes the " +
      "same commission amount for both the buy and sell trade. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does this include capital gains tax?",
        answer: "No — this shows your pre-tax trading profit only. Capital gains tax applies separately based on your holding period (short-term vs. long-term) and tax situation — see this site's Capital Gains Tax Calculator for that estimate.",
      },
      {
        question: "What if my buy and sell commissions were different amounts?",
        answer: "Calculate manually by adjusting the total cost and total proceeds separately, or run this twice with each commission and combine the results — this simple version assumes one commission amount applied to both trades.",
      },
    ],
  },
  {
    slug: "dollar-cost-averaging-calculator",
    title: "Dollar Cost Averaging Calculator",
    description: "Simulate investing a fixed amount at regular intervals as the price changes, to see your average cost per share and return.",
    metaTitle: "Dollar Cost Averaging Calculator — Free & Instant",
    metaDescription: "Free dollar cost averaging (DCA) calculator. Enter your investment per period, number of periods, and starting/ending price to see your average cost and return.",
    calcInputs: [
      currencyField("investmentPerPeriod", "Investment Per Period", { default: 500, max: 1000000, step: 25 }),
      numberField("numberOfPeriods", "Number of Periods", { default: 12, max: 240, step: 1 }),
      currencyField("startingPrice", "Starting Price Per Share", { default: 20, max: 1000000, step: 0.5 }),
      currencyField("endingPrice", "Ending Price Per Share", { default: 30, max: 1000000, step: 0.5 }),
    ],
    calcResult: { label: "Average Cost Per Share", format: "currency" },
    calcResults: [
      { key: "totalInvested", label: "Total Invested", format: "currency" },
      { key: "totalShares", label: "Total Shares Accumulated", format: "number" },
      { key: "averageCostPerShare", label: "Average Cost Per Share", format: "currency", highlight: true },
      { key: "currentValue", label: "Current Value (at ending price)", format: "currency" },
      { key: "totalReturnPercent", label: "Total Return", format: "percentage" },
    ],
    instructions:
      "Enter how much you invest each period, how many periods you invest for, and the share price at the " +
      "start and end of that stretch (this calculator models the price moving in a straight line between the " +
      "two, buying more shares when the price is lower and fewer when it's higher — the core mechanism behind " +
      "dollar cost averaging). The result shows your total invested, shares accumulated, average cost per " +
      "share, current value, and total return.",
    examples: "Example: investing $500 a month for 12 months, with the price moving from $20 to $30 over that time, accumulates about 243.89 shares at an average cost of $24.60 per share — a $7,316.75 current value on $6,000 invested, a 21.95% total return.",
    assumptions:
      "Real share prices don't move in a straight line — this is a simplified illustration of the dollar cost " +
      "averaging mechanism (buying more shares at lower prices, fewer at higher prices) rather than a forecast " +
      "of any specific investment's actual path. Real DCA results depend entirely on the actual price path taken " +
      "along the way, not just the start and end points. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does DCA lower your average cost compared to a lump sum at a random price?",
        answer: "Because a fixed dollar amount automatically buys MORE shares when the price is low and FEWER shares when the price is high — over time this tends to pull your average cost per share below a simple average of the prices, since more shares were bought at the cheaper prices.",
      },
      {
        question: "Does this reflect a real investment's actual price path?",
        answer: "No — this assumes a straight-line move from your starting to ending price as a simplified illustration. A real investment's price could have moved very differently along the way (with more or fewer dips to buy into), which would change your actual average cost and return.",
      },
    ],
  },
];

async function main() {
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY_SLUG } });
  if (!parent) {
    throw new Error(
      `The "${PARENT_CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
        "then re-run this script."
    );
  }
  const categoryIds = new Map<string, string>();
  for (const [slug, name] of Object.entries(SUBCATEGORY_NAMES)) {
    const existing = await prisma.toolCategory.findUnique({ where: { slug } });
    if (!existing) console.log(`Creating sub-category "${name}" under "${parent.name}".`);
    const category =
      existing ??
      (await prisma.toolCategory.create({
        data: { name, slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
      }));
    categoryIds.set(slug, category.id);
  }

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: categoryIds.get(TOOL_CATEGORY[def.slug])!,
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, filed under the Investment Calculators sub-categories.`);
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
