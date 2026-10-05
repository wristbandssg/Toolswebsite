// One-time (but safe to re-run) batch setup script: creates the Real Asset tools
// (6) of the Investment Calculators expansion, filed under Investment Calculators > Alternative Investment Calculators.
// See src/lib/calc-engine-investment-alt-real-assets.ts for the math and
// src/lib/calc-engine-investment-stocks.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-investment-alt-real-assets-calculators.ts
// or
//   npm run db:create-investment-alt-real-assets-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "investment-calculators";
const CATEGORY = { name: "Alternative Investment Calculators", slug: "alternative-investment-calculators" };

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
    slug: "reit-calculator",
    title: "REIT Calculator",
    description: "Analyze a real estate investment trust (REIT): dividend yield, price-to-FFO, how much of its cash flow it pays out, and your income and total return over time.",
    metaTitle: "REIT Calculator — Dividend Yield, P/FFO & Return",
    metaDescription: "Free REIT calculator. See a REIT's dividend yield, price-to-FFO and payout ratio, plus your dividend income and total return over time.",
    calcInputs: [
      currencyField("price", "Share Price", { default: 50, max: 100000, step: 0.5 }),
      currencyField("dividendPerShare", "Yearly Dividend per Share", { default: 2.4, max: 10000, step: 0.05 }),
      currencyField("ffoPerShare", "FFO (or AFFO) per Share", { default: 3.5, max: 10000, step: 0.05 }),
      numberField("shares", "Shares", { default: 200, min: 0, max: 100000000, step: 1 }),
      percentField("dividendGrowthPercent", "Dividend Growth per Year", { default: 3, min: -20, max: 20, step: 0.25 }),
      percentField("priceGrowthPercent", "Share Price Growth per Year", { default: 2, min: -20, max: 20, step: 0.25 }),
      numberField("years", "Years", { default: 10, min: 0, max: 50, step: 1 }),
    ],
    calcResult: { label: "Dividend Yield", format: "percentage" },
    calcResults: [
      { key: "dividendYield", label: "Dividend Yield", format: "percentage", highlight: true },
      { key: "priceToFfo", label: "Price to FFO", format: "number" },
      { key: "payoutOfFfo", label: "Dividend as % of FFO", format: "percentage" },
      { key: "yearlyIncome", label: "Yearly Dividend Income", format: "currency" },
      { key: "totalDividends", label: "Total Dividends Over the Years", format: "currency" },
      { key: "totalReturn", label: "Total Return (Dividends + Price Gain)", format: "currency" },
    ],
    instructions:
      "REITs own income-producing property and must pay out at least 90% of taxable income as dividends, so they're " +
      "valued on cash flow rather than earnings. FFO (funds from operations) adds back property depreciation to net " +
      "income; price-to-FFO works like a P/E ratio. A dividend well below FFO leaves room for growth and safety.\n\n" +
      "Most REIT dividends are taxed as ordinary income, though individuals can generally deduct 20% of them (Section 199A).",
    examples:
      "Example: a $50 REIT paying $2.40 yields 4.80% and trades at 14.29 times FFO, paying out " +
      "68.57% of its FFO. 200 shares earn $480 a year; with 3% dividend growth, " +
      "that's $5,502.66 over 10 years and a $7,692.61 total return.",
    assumptions:
      "Dividends taken as cash (not reinvested); steady growth. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are REITs good in an IRA?",
        answer: "Often yes — their mostly ordinary-income dividends are taxed at higher rates than qualified dividends, so sheltering them can save tax.",
      },
    ],
  },
  {
    slug: "gold-investment-calculator",
    title: "Gold Investment Calculator",
    description: "Project a gold or silver investment: ounces bought after the dealer premium, value after storage or fund fees and the selling spread, and the after-tax return.",
    metaTitle: "Gold Investment Calculator — Gold & Silver Returns",
    metaDescription: "Free gold investment calculator. See ounces bought, value after fees and spreads, collectibles tax and the after-tax return for gold or silver.",
    calcInputs: [
      currencyField("amount", "Amount Invested", { default: 10000, max: 1000000000, step: 100 }),
      currencyField("spotPrice", "Spot Price per Ounce (Today)", { default: 3500, max: 100000, step: 1 }),
      percentField("premiumPercent", "Dealer Premium Over Spot", { default: 4, max: 30, step: 0.5 }),
      percentField("yearlyFeePercent", "Storage or Fund Fee per Year", { default: 0.4, max: 3, step: 0.05, required: false }),
      percentField("priceGrowthPercent", "Expected Price Growth per Year", { default: 5, min: -20, max: 30, step: 0.25 }),
      numberField("years", "Years", { default: 10, min: 0, max: 50, step: 1 }),
      percentField("sellSpreadPercent", "Discount to Spot When You Sell", { default: 2, max: 20, step: 0.5, required: false }),
      percentField("taxRatePercent", "Tax Rate on the Gain", { default: 28, max: 50, step: 1 }),
    ],
    calcResult: { label: "Sale Proceeds", format: "currency" },
    calcResults: [
      { key: "ouncesBought", label: "Ounces Bought", format: "number", decimals: 3 },
      { key: "futurePricePerOunce", label: "Future Spot Price", format: "currency" },
      { key: "saleProceeds", label: "Sale Proceeds", format: "currency", highlight: true },
      { key: "gainBeforeTax", label: "Gain Before Tax", format: "currency" },
      { key: "tax", label: "Tax", format: "currency" },
      { key: "afterTaxYearlyReturn", label: "After-Tax Yearly Return", format: "percentage" },
    ],
    instructions:
      "Enter today's spot price for gold or silver and the premium your dealer charges (coins cost more over spot than " +
      "large bars; silver premiums are usually higher than gold's). For an ETF, set the premium to 0 and the yearly fee to " +
      "its expense ratio; for vault storage, use the storage fee.\n\n" +
      "Physical metals and most metal ETFs are collectibles for US tax: long-term gains are taxed at your ordinary rate, " +
      "capped at 28%.",
    examples:
      "Example: $10,000 at a $3,500 spot price with a 4% premium buys 2.75 ounces. If the price " +
      "grows 5% a year to $5,701.13 in 10 years, selling brings $14,746.17 after fees " +
      "and the spread — a 2.98% yearly return after tax.",
    assumptions:
      "Steady price growth (gold is volatile and pays no income); fees reduce the ounces held. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Physical gold or a gold ETF?",
        answer: "ETFs are cheap and easy to trade; physical coins and bars avoid fund risk but cost more to buy, store, insure and sell.",
      },
    ],
  },
  {
    slug: "art-collectibles-investment-calculator",
    title: "Art and Collectibles Investment Calculator",
    description: "See the real return on art, wine, watches or other collectibles after the buyer's premium, storage and insurance, the seller's commission and the collectibles tax.",
    metaTitle: "Art & Collectibles Investment Calculator — Net Return",
    metaDescription: "Free art and collectibles calculator. See your return on art, wine or collectibles after auction premiums, storage, commissions and tax.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase (Hammer) Price", { default: 20000, max: 1000000000, step: 500 }),
      percentField("buyerPremiumPercent", "Buyer's Premium", { default: 25, max: 40, step: 1, required: false }),
      percentField("appreciationPercent", "Appreciation per Year", { default: 6, min: -20, max: 30, step: 0.25 }),
      numberField("years", "Years Held", { default: 10, min: 0, max: 50, step: 1 }),
      percentField("yearlyCostPercent", "Storage & Insurance per Year (% of Value)", { default: 1, max: 10, step: 0.25, required: false }),
      percentField("sellCommissionPercent", "Seller's Commission", { default: 15, max: 40, step: 1 }),
      percentField("taxRatePercent", "Tax Rate on the Gain", { default: 28, max: 50, step: 1 }),
    ],
    calcResult: { label: "Profit After All Costs", format: "currency" },
    calcResults: [
      { key: "totalPurchaseCost", label: "Total Purchase Cost", format: "currency" },
      { key: "salePrice", label: "Sale Price", format: "currency" },
      { key: "netSaleProceeds", label: "Net Sale Proceeds", format: "currency" },
      { key: "holdingCosts", label: "Storage & Insurance", format: "currency" },
      { key: "tax", label: "Tax", format: "currency" },
      { key: "profitAfterAllCosts", label: "Profit After All Costs", format: "currency", highlight: true },
      { key: "afterTaxYearlyReturn", label: "After-Tax Yearly Return", format: "percentage" },
    ],
    instructions:
      "Collectibles can appreciate, but transaction costs are steep: auction houses charge buyers a premium (often 20–28% " +
      "on top of the hammer price) and sellers a commission, and you pay to store and insure the piece. For wine, add " +
      "bonded storage. Long-term gains on collectibles are taxed at up to 28%.\n\n" +
      "Enter your costs and an appreciation rate to see what's left.",
    examples:
      "Example: buying at $20,000 with a 25% buyer's premium costs $25,000. If it gains " +
      "6% a year and sells for $35,816.95 after 10 years, you net $30,444.41. After " +
      "$2,636.16 of storage and insurance and $1,524.44 of tax, the profit is only $1,283.82.",
    assumptions:
      "Steady appreciation; the tax is on the sale proceeds less the purchase cost (storage isn't deductible for most " +
      "individuals). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What about fractional art platforms?",
        answer: "They lower the minimum, but charge yearly management fees and a share of profits, and resale can be limited — enter those as yearly costs and commission.",
      },
    ],
  },
  {
    slug: "farmland-investment-calculator",
    title: "Farmland Investment Calculator",
    description: "Estimate a farmland investment: cash rent income after property taxes, the cash yield, land appreciation and the total return over time.",
    metaTitle: "Farmland Investment Calculator — Rent Yield & Return",
    metaDescription: "Free farmland investment calculator. See cash rent income, cash yield, land appreciation and total return on farmland.",
    calcInputs: [
      numberField("acres", "Acres", { default: 100, min: 0, max: 1000000, step: 1 }),
      currencyField("pricePerAcre", "Price per Acre", { default: 8000, max: 1000000, step: 100 }),
      currencyField("cashRentPerAcre", "Cash Rent per Acre per Year", { default: 250, max: 10000, step: 5 }),
      currencyField("costsPerAcre", "Property Tax & Costs per Acre per Year", { default: 30, max: 10000, step: 1, required: false }),
      percentField("appreciationPercent", "Land Appreciation per Year", { default: 4, min: -20, max: 20, step: 0.25 }),
      numberField("years", "Years", { default: 10, min: 0, max: 50, step: 1 }),
    ],
    calcResult: { label: "Total Return", format: "currency" },
    calcResults: [
      { key: "investment", label: "Investment", format: "currency" },
      { key: "netIncomePerYear", label: "Net Rent Income per Year", format: "currency" },
      { key: "cashYield", label: "Cash Yield", format: "percentage" },
      { key: "landValueAfterYears", label: "Land Value After the Years", format: "currency" },
      { key: "totalReturn", label: "Total Return", format: "currency", highlight: true },
      { key: "yearlyTotalReturn", label: "Approximate Yearly Return", format: "percentage" },
    ],
    instructions:
      "Farmland returns come from two sources: rent paid by the farmer (cash rent typically yields 2–4% of land value) and " +
      "the land's appreciation, which has historically been steady. USDA publishes average land values and cash rents by " +
      "state.\n\n" +
      "Enter the land, rent and costs. Farmland can also be owned through platforms or farmland REITs.",
    examples:
      "Example: 100 acres at $8,000 an acre cost $800,000. Renting for $250 an acre, less " +
      "$30 of costs, brings $22,000 a year — a 2.75% cash yield. With 4% " +
      "appreciation, the land is worth $1,184,195.43 after 10 years: a $604,195.43 total return.",
    assumptions:
      "Rent and costs stay level; rent not reinvested. Buying and selling costs not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why invest in farmland?",
        answer: "It has had low volatility, tended to keep pace with inflation, and moved independently of stocks — but it's illiquid and returns vary by region and crop prices.",
      },
    ],
  },
  {
    slug: "timberland-investment-calculator",
    title: "Timberland Investment Calculator",
    description: "Estimate a timberland investment: timber value growing as trees grow and timber prices change, land appreciation, management costs and the yearly return.",
    metaTitle: "Timberland Investment Calculator — Growth & Return",
    metaDescription: "Free timberland calculator. Project timber value from tree growth and prices, plus land appreciation and costs, and see your yearly return.",
    calcInputs: [
      numberField("acres", "Acres", { default: 500, min: 0, max: 10000000, step: 10 }),
      currencyField("pricePerAcre", "Price per Acre", { default: 2500, max: 1000000, step: 50 }),
      percentField("timberSharePercent", "Share of Price That Is Timber", { default: 40, max: 100, step: 5 }),
      percentField("biologicalGrowthPercent", "Timber Volume Growth per Year", { default: 5, max: 20, step: 0.25 }),
      percentField("timberPriceChangePercent", "Timber Price Change per Year", { default: 1, min: -10, max: 10, step: 0.25 }),
      percentField("landAppreciationPercent", "Land Appreciation per Year", { default: 2, min: -10, max: 10, step: 0.25 }),
      currencyField("costPerAcre", "Management Costs per Acre per Year", { default: 10, max: 1000, step: 1, required: false }),
      numberField("years", "Years", { default: 15, min: 0, max: 60, step: 1 }),
    ],
    calcResult: { label: "Yearly Return", format: "percentage" },
    calcResults: [
      { key: "investment", label: "Investment", format: "currency" },
      { key: "timberValueAtEnd", label: "Timber Value at the End", format: "currency" },
      { key: "landValueAtEnd", label: "Land Value at the End", format: "currency" },
      { key: "totalCosts", label: "Total Management Costs", format: "currency" },
      { key: "netValueAtEnd", label: "Net Value at the End", format: "currency" },
      { key: "yearlyReturn", label: "Yearly Return", format: "percentage", highlight: true },
    ],
    instructions:
      "Timberland grows in value as the trees grow — biological growth of a few percent a year, regardless of markets — " +
      "plus changes in timber prices and in the land's value. Owners can delay harvests when prices are low.\n\n" +
      "Enter how much of the price is standing timber versus bare land, and growth assumptions for each.",
    examples:
      "Example: 500 acres at $2,500 cost $1,250,000. With 5% tree growth and " +
      "1% price gains, the timber is worth $1,206,785.54 after 15 years, and the land " +
      "$1,009,401.25. After $75,000 of costs, that's a 3.65% yearly return.",
    assumptions:
      "Harvest and sale at the end; steady growth. Timber sale gains can qualify for capital gains treatment. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can small investors buy timberland?",
        answer: "Mostly through timber REITs or funds, since direct tracts usually cost hundreds of thousands of dollars or more.",
      },
    ],
  },
  {
    slug: "oil-gas-investment-calculator",
    title: "Oil and Gas Investment Calculator",
    description: "Estimate a direct oil and gas investment: the first-year deduction for intangible drilling costs, production income as the well declines, depletion, after-tax cash flow and payback.",
    metaTitle: "Oil and Gas Investment Calculator — IDC Deduction",
    metaDescription: "Free oil and gas investment calculator. See the IDC tax deduction, declining production income, depletion, after-tax cash flow and payback.",
    calcInputs: [
      currencyField("investment", "Amount Invested", { default: 50000, max: 1000000000, step: 1000 }),
      percentField("idcPercent", "Intangible Drilling Costs (% of Investment)", { default: 70, max: 100, step: 5 }),
      percentField("taxRatePercent", "Your Tax Rate", { default: 37, max: 50, step: 1 }),
      currencyField("firstYearIncome", "First-Year Production Income", { default: 15000, max: 100000000, step: 500 }),
      percentField("declinePercent", "Production Decline per Year", { default: 25, max: 90, step: 1 }),
      numberField("years", "Years", { default: 10, min: 1, max: 40, step: 1 }),
      percentField("depletionPercent", "Depletion Allowance", { default: 15, max: 15, step: 1 }),
    ],
    calcResult: { label: "Net After-Tax Profit", format: "currency" },
    calcResults: [
      { key: "firstYearDeduction", label: "First-Year Deduction", format: "currency" },
      { key: "firstYearTaxSavings", label: "First-Year Tax Savings", format: "currency" },
      { key: "totalProductionIncome", label: "Total Production Income", format: "currency" },
      { key: "afterTaxCashFlow", label: "After-Tax Cash Flow", format: "currency" },
      { key: "netAfterTaxProfit", label: "Net After-Tax Profit", format: "currency", highlight: true },
      { key: "paybackYear", label: "Payback Year (After Tax)", format: "number" },
    ],
    instructions:
      "Direct working-interest investments in oil and gas wells have unusual tax benefits: intangible drilling costs " +
      "(labor, chemicals, mud — often 60–80% of the cost) can be deducted in the first year, even against wages, and the " +
      "rest (equipment) is depreciated over 7 years. Small producers and royalty owners can also exclude 15% of gross income " +
      "through percentage depletion.\n\n" +
      "Production falls quickly — often 20–40% a year — so enter a realistic decline.",
    examples:
      "Example: investing $50,000 with 70% intangible drilling costs gives a $37,142.86 first-year " +
      "deduction, saving $13,742.86 at 37%. Production starting at $15,000 and declining " +
      "25% a year pays $56,621.19 over 10 years, for a $7,313.83 after-tax profit.",
    assumptions:
      "Straight-line equipment depreciation over 7 years; the deduction is used against other income. Dry holes, oil " +
      "price swings and operating costs can change results sharply. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are oil and gas partnerships risky?",
        answer: "Yes — wells can be dry or decline faster than expected, prices swing widely, and interests are hard to sell. They're typically for accredited investors.",
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
