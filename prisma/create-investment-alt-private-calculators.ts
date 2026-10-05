// One-time (but safe to re-run) batch setup script: creates the Private & Alternative Investment tools
// (5) of the Investment Calculators expansion, filed under Investment Calculators > Alternative Investment Calculators.
// See src/lib/calc-engine-investment-alt-private.ts for the math and
// src/lib/calc-engine-investment-stocks.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-investment-alt-private-calculators.ts
// or
//   npm run db:create-investment-alt-private-calculators

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
    slug: "hedge-fund-investment-calculator",
    title: "Hedge Fund Investment Calculator",
    description: "See what hedge fund fees do to your returns: the \"2 and 20\" management and performance fees, a hurdle rate and high-water mark — net value versus gross.",
    metaTitle: "Hedge Fund Calculator — 2 and 20 Fees & Net Return",
    metaDescription: "Free hedge fund calculator. See how management and performance fees, hurdles and high-water marks turn gross returns into net returns.",
    calcInputs: [
      currencyField("investment", "Amount Invested", { default: 1000000, max: 10000000000, step: 10000 }),
      percentField("grossReturnPercent", "Gross Return per Year", { default: 12, min: -50, max: 100, step: 0.5 }),
      percentField("managementFeePercent", "Management Fee", { default: 2, max: 5, step: 0.25 }),
      percentField("performanceFeePercent", "Performance Fee", { default: 20, max: 50, step: 1 }),
      percentField("hurdlePercent", "Hurdle Rate", { default: 0, max: 20, step: 0.5, required: false }),
      numberField("years", "Years", { default: 5, min: 0, max: 30, step: 1 }),
    ],
    calcResult: { label: "Net Value", format: "currency" },
    calcResults: [
      { key: "grossValue", label: "Value Before Fees", format: "currency" },
      { key: "netValue", label: "Net Value", format: "currency", highlight: true },
      { key: "totalFees", label: "Total Fees", format: "currency" },
      { key: "netYearlyReturn", label: "Net Yearly Return", format: "percentage" },
      { key: "feesShareOfGrossGain", label: "Fees as % of Gross Gain", format: "percentage" },
    ],
    instructions:
      "Hedge funds traditionally charge \"2 and 20\": a 2% yearly management fee on assets plus 20% of profits. Many now " +
      "charge less (about 1.5 and 17 on average). A hurdle rate means performance fees apply only to returns above it, and " +
      "a high-water mark means no performance fee is charged until past losses are recovered.\n\n" +
      "Enter the fund's terms and an expected gross return. Hedge funds are generally open only to accredited investors.",
    examples:
      "Example: $1,000,000 earning 12% a year before fees would grow to $1,762,341.68 in 5 years. " +
      "After a 2% management fee and 20% performance fee, you'd have $1,469,328.08 — a " +
      "8% net return, with 38.44% of the gross gain going to fees.",
    assumptions:
      "Fees charged yearly; the management fee on start-of-year assets; steady returns. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do hedge funds beat the market after fees?",
        answer: "On average, hedge funds have trailed a simple stock-bond mix after fees over the past two decades, though some managers do much better — and some much worse.",
      },
    ],
  },
  {
    slug: "private-equity-investment-calculator",
    title: "Private Equity Investment Calculator",
    description: "Turn a private equity fund's gross multiple into your net result after management fees and carried interest over the preferred return — net multiple (MOIC) and IRR.",
    metaTitle: "Private Equity Calculator — Net MOIC, IRR & Carry",
    metaDescription: "Free private equity calculator. See how management fees and carried interest turn a fund's gross multiple into your net MOIC and IRR.",
    calcInputs: [
      currencyField("commitment", "Commitment (Invested)", { default: 1000000, max: 10000000000, step: 10000 }),
      numberField("grossMultiple", "Gross Multiple (MOIC)", { default: 2, min: 0, max: 20, step: 0.05 }),
      numberField("years", "Holding Period (Years)", { default: 6, min: 0.5, max: 20, step: 0.5 }),
      percentField("managementFeePercent", "Management Fee (per Year)", { default: 2, max: 5, step: 0.25 }),
      percentField("carryPercent", "Carried Interest", { default: 20, max: 50, step: 1 }),
      percentField("preferredReturnPercent", "Preferred Return (Hurdle)", { default: 8, max: 20, step: 0.5 }),
    ],
    calcResult: { label: "Net IRR", format: "percentage" },
    calcResults: [
      { key: "grossProceeds", label: "Gross Proceeds", format: "currency" },
      { key: "managementFees", label: "Management Fees", format: "currency" },
      { key: "carriedInterest", label: "Carried Interest", format: "currency" },
      { key: "netProceeds", label: "Net Proceeds", format: "currency" },
      { key: "netMultiple", label: "Net Multiple (MOIC)", format: "number" },
      { key: "grossIrr", label: "Gross IRR", format: "percentage" },
      { key: "netIrr", label: "Net IRR", format: "percentage", highlight: true },
    ],
    instructions:
      "Private equity funds report a gross multiple on invested capital (MOIC), but investors pay a yearly management fee " +
      "(often 2% of commitments) and carried interest — usually 20% of profits once the fund beats a preferred return " +
      "(typically 8%), with a catch-up so the manager ends up with 20% of all profit.\n\n" +
      "Enter the fund's expected gross multiple and terms. Capital is assumed to be invested at the start and returned at " +
      "the end, a simplification of real capital calls and distributions.",
    examples:
      "Example: $1,000,000 returning 2x gross over 6 years is $2,000,000. After $120,000 " +
      "of fees and $176,000 of carry, you get $1,704,000 — a 1.70x net multiple, or 9.29% a year " +
      "versus 12.25% gross.",
    assumptions:
      "Single investment and single distribution; full catch-up on carry. Real funds' IRRs depend on the timing of cash " +
      "flows. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "MOIC or IRR — which matters more?",
        answer: "Both. MOIC shows how much your money grew; IRR shows how fast. A 2x return over 3 years is far better than 2x over 10 years.",
      },
    ],
  },
  {
    slug: "venture-capital-investment-calculator",
    title: "Venture Capital Investment Calculator",
    description: "Model a venture or angel investment: your ownership at entry, dilution from later funding rounds, what you'd receive at an exit, and the probability-weighted value.",
    metaTitle: "Venture Capital & Angel Investment Calculator",
    metaDescription: "Free venture capital calculator. See your startup ownership, dilution from later rounds, exit proceeds and the probability-weighted value.",
    calcInputs: [
      currencyField("investment", "Amount Invested", { default: 50000, max: 1000000000, step: 1000 }),
      currencyField("preMoney", "Pre-Money Valuation", { default: 4000000, max: 100000000000, step: 100000 }),
      percentField("dilutionPerRoundPercent", "Dilution per Later Round", { default: 20, max: 90, step: 1 }),
      numberField("laterRounds", "Later Funding Rounds", { default: 3, min: 0, max: 10, step: 1 }),
      currencyField("exitValuation", "Exit Valuation", { default: 200000000, max: 1000000000000, step: 1000000 }),
      percentField("successChancePercent", "Chance of Reaching That Exit", { default: 10, max: 100, step: 1 }),
    ],
    calcResult: { label: "Proceeds If It Exits", format: "currency" },
    calcResults: [
      { key: "postMoneyValuation", label: "Post-Money Valuation", format: "currency" },
      { key: "ownershipAtEntry", label: "Ownership at Entry", format: "percentage" },
      { key: "ownershipAtExit", label: "Ownership at Exit (After Dilution)", format: "percentage" },
      { key: "proceedsIfExit", label: "Proceeds If It Exits", format: "currency", highlight: true },
      { key: "multipleIfExit", label: "Multiple If It Exits", format: "number" },
      { key: "probabilityWeightedValue", label: "Probability-Weighted Value", format: "currency" },
    ],
    instructions:
      "When you invest in a startup — as an angel or through a venture fund — you buy a share of the company at its " +
      "post-money valuation (pre-money + new money). Each later round issues new shares, diluting you, often by 15–25%. " +
      "Most startups fail, so returns come from a few big exits.\n\n" +
      "Enter the deal and an exit scenario. The probability-weighted value shows what the bet is worth on average.",
    examples:
      "Example: $50,000 at a $4,000,000 pre-money valuation buys 1.23% of the company. After 3 " +
      "rounds of 20% dilution you own 0.63%, worth $1,264,197.53 at a $200,000,000 exit " +
      "(25.28x). With a 10% chance, that's $126,419.75 on average.",
    assumptions:
      "Common-stock economics; liquidation preferences, pro-rata follow-ons and SAFE/convertible note terms are not " +
      "modeled. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How many startups should an angel invest in?",
        answer: "Many angels aim for 20 or more, because a single winner usually has to cover the many losses.",
      },
    ],
  },
  {
    slug: "crowdfunding-investment-calculator",
    title: "Crowdfunding Investment Calculator",
    description: "Find how much you can invest in Reg CF equity crowdfunding in 12 months, and the expected outcome of a portfolio of startup investments.",
    metaTitle: "Crowdfunding Investment Calculator — Reg CF Limit",
    metaDescription: "Free crowdfunding investment calculator. See your Reg CF 12-month investment limit and the expected outcome of a startup portfolio.",
    calcInputs: [
      currencyField("annualIncome", "Annual Income", { default: 80000, max: 100000000, step: 1000 }),
      currencyField("netWorth", "Net Worth (Excluding Home)", { default: 150000, max: 10000000000, step: 1000 }),
      {
        key: "accredited", label: "Accredited Investor?", type: "dropdown", required: true, default: 0,
        options: [
          { label: "No", value: 0 },
          { label: "Yes (No Limit)", value: 1 },
        ],
      },
      currencyField("plannedInvestment", "Total You Plan to Invest (12 Months)", { default: 3000, max: 10000000, step: 100 }),
      percentField("failurePercent", "Share of Startups That Fail", { default: 70, max: 100, step: 5 }),
      numberField("winnerMultiple", "Average Multiple on the Survivors", { default: 3, min: 0, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "12-Month Investment Limit", format: "currency" },
    calcResults: [
      { key: "twelveMonthLimit", label: "12-Month Investment Limit (0 = No Limit)", format: "currency", highlight: true },
      { key: "withinLimit", label: "Plan Within the Limit (1 = Yes)", format: "number" },
      { key: "expectedMultiple", label: "Expected Portfolio Multiple", format: "number" },
      { key: "expectedValue", label: "Expected Value", format: "currency" },
      { key: "expectedGainOrLoss", label: "Expected Gain or Loss", format: "currency" },
    ],
    instructions:
      "Regulation Crowdfunding lets anyone invest in startups through SEC-registered portals such as Wefunder or " +
      "StartEngine, within a 12-month limit across all offerings: if your income or net worth is under $124,000, the greater " +
      "of $2,500 or 5% of the greater of the two; if both are $124,000 or more, 10% of the greater, up to $124,000. " +
      "Accredited investors have no limit.\n\n" +
      "Shares are hard to sell, usually for at least a year. The portfolio estimate shows why diversification matters.",
    examples:
      "Example: with $80,000 of income and $150,000 of net worth, you can invest up to $7,500 in 12 " +
      "months. Spreading $3,000 across startups where 70% fail and the rest return 3x " +
      "gives an expected 0.90x — about $2,700.",
    assumptions:
      "Net worth excludes your primary home. Outcomes are illustrative; startup returns are highly uneven. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I sell crowdfunding shares?",
        answer: "Generally not for the first year, and afterwards there's rarely a market. Plan to hold until the company is acquired or goes public — or fails.",
      },
    ],
  },
  {
    slug: "peer-to-peer-lending-investment-calculator",
    title: "Peer-to-Peer Lending Investment Calculator",
    description: "Estimate your real return from P2P lending: interest earned minus the platform's servicing fee and losses from borrower defaults, before and after tax.",
    metaTitle: "P2P Lending Investment Calculator — Net Return",
    metaDescription: "Free peer-to-peer lending calculator. Estimate your net return after servicing fees and defaults, after tax, and your balance over time.",
    calcInputs: [
      currencyField("investment", "Amount Invested", { default: 10000, max: 100000000, step: 100 }),
      percentField("interestRatePercent", "Average Interest Rate on Loans", { default: 11, max: 40, step: 0.25 }),
      percentField("serviceFeePercent", "Servicing Fee", { default: 1, max: 5, step: 0.1 }),
      percentField("defaultRatePercent", "Yearly Default Rate", { default: 4, max: 50, step: 0.25 }),
      percentField("recoveryPercent", "Recovered From Defaults", { default: 10, max: 100, step: 5 }),
      numberField("years", "Years", { default: 3, min: 0, max: 30, step: 1 }),
      percentField("taxRatePercent", "Your Tax Rate", { default: 24, max: 50, step: 1, required: false }),
    ],
    calcResult: { label: "Net Yearly Return", format: "percentage" },
    calcResults: [
      { key: "lossesFromDefaults", label: "Losses From Defaults (per Year)", format: "percentage" },
      { key: "netYearlyReturn", label: "Net Yearly Return", format: "percentage", highlight: true },
      { key: "afterTaxYearlyReturn", label: "After-Tax Yearly Return", format: "percentage" },
      { key: "valueAfterYears", label: "Value After the Years", format: "currency" },
      { key: "totalEarned", label: "Total Earned", format: "currency" },
    ],
    instructions:
      "On peer-to-peer lending platforms, you fund slices of personal or small business loans and earn the interest. The " +
      "quoted rate isn't your return: platforms charge a servicing fee (often around 1%), and some borrowers default. " +
      "Riskier loan grades pay more but default more.\n\n" +
      "Enter the average rate, fee and expected default and recovery rates. Interest is taxed as ordinary income.",
    examples:
      "Example: loans paying 11% with a 1% fee and 4% defaults " +
      "(10% recovered) return 6.40% a year, or 4.86% after tax. $10,000 grows " +
      "to $12,045.50 in 3 years with payments reinvested.",
    assumptions:
      "Steady rates and defaults; payments reinvested. Losses from defaults can usually offset income (check how your " +
      "platform reports them). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is P2P lending safe?",
        answer: "Notes aren't FDIC-insured, defaults rise in recessions, and you usually can't cash out early. Spread money across many small loans to limit the damage from any one default.",
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
