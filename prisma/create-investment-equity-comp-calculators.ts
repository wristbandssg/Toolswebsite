// One-time (but safe to re-run) batch setup script: creates the Equity Compensation tools
// (3) of the Investment Calculators expansion, filed under Investment Calculators > Stock & Options Calculators.
// See src/lib/calc-engine-investment-equity-comp.ts for the math and
// src/lib/calc-engine-investment-stocks.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-investment-equity-comp-calculators.ts
// or
//   npm run db:create-investment-equity-comp-calculators

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
  "This tool provides general estimates for informational purposes only and isn't investment or tax advice. " +
  "Equity compensation tax rules are complex — check your plan documents and ask a tax professional.";

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
    slug: "stock-option-vesting-calculator",
    title: "Stock Option Vesting Calculator",
    description: "See how many of your employee stock options have vested after the cliff, what they're worth, what it costs to exercise them, and the tax at exercise for NSOs or the AMT amount for ISOs.",
    metaTitle: "Stock Option Vesting Calculator — Value & Tax (ISO/NSO)",
    metaDescription: "Free stock option vesting calculator. See vested options, their spread value, exercise cost, and the tax or AMT amount for NSOs and ISOs.",
    calcInputs: [
      numberField("optionsGranted", "Options Granted", { default: 10000, min: 0, max: 100000000, step: 100 }),
      currencyField("strikePrice", "Strike (Exercise) Price", { default: 5, max: 100000, step: 0.01 }),
      currencyField("currentValue", "Current Share Value (FMV)", { default: 20, max: 100000, step: 0.01 }),
      numberField("vestingYears", "Vesting Period (Years)", { default: 4, min: 0.25, max: 10, step: 0.25 }),
      numberField("cliffMonths", "Cliff (Months)", { default: 12, min: 0, max: 60, step: 1 }),
      numberField("monthsSinceGrant", "Months Since Grant", { default: 30, min: 0, max: 240, step: 1 }),
      {
        key: "optionType", label: "Option Type", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Incentive Stock Options (ISO)", value: 1 },
          { label: "Non-Qualified Stock Options (NSO)", value: 2 },
        ],
      },
      percentField("taxRatePercent", "Tax Rate on Ordinary Income", { default: 32, max: 60, step: 1 }),
    ],
    calcResult: { label: "Vested Spread Value", format: "currency" },
    calcResults: [
      { key: "vestedOptions", label: "Vested Options", format: "number" },
      { key: "unvestedOptions", label: "Unvested Options", format: "number" },
      { key: "spreadPerShare", label: "Spread per Share", format: "currency" },
      { key: "vestedSpreadValue", label: "Vested Spread Value", format: "currency", highlight: true },
      { key: "exerciseCost", label: "Cost to Exercise Vested Options", format: "currency" },
      { key: "taxIfExercisedNow", label: "Tax at Exercise (NSO)", format: "currency" },
      { key: "amtPreferenceAmount", label: "AMT Preference Amount (ISO)", format: "currency" },
    ],
    instructions:
      "Most option grants vest over four years with a one-year cliff: nothing vests for the first year, then 25% vests at " +
      "once and the rest monthly. The spread — share value minus strike price — is what each vested option is worth.\n\n" +
      "For NSOs, the spread at exercise is ordinary income, with tax withheld. For ISOs, there's no regular tax at exercise, " +
      "but the spread counts toward the alternative minimum tax (AMT); holding the shares 1 year after exercise and 2 years " +
      "after grant turns the whole gain into long-term capital gain.",
    examples:
      "Example: 10,000 options at a $5 strike, 30 months into a 4-year " +
      "schedule, gives 6,250 vested. With shares worth $20, they're worth $93,750 over the " +
      "$31,250 it costs to exercise. As NSOs, exercising now would add about $30,000 of tax.",
    assumptions:
      "Monthly vesting after the cliff; private-company share values come from the latest 409A valuation and may be hard " +
      "to sell. State tax and payroll taxes (on NSOs) are not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens to my options if I leave the company?",
        answer: "Unvested options are usually forfeited, and vested ones must often be exercised within 90 days. Check your plan — some companies allow longer.",
      },
    ],
  },
  {
    slug: "rsu-vesting-calculator",
    title: "RSU Vesting Calculator",
    description: "Calculate your RSU vesting: shares and value per vest, shares withheld for tax at the 22% supplemental rate, and the extra tax you may owe at your actual rate.",
    metaTitle: "RSU Vesting Calculator — Value, Withholding & Tax Due",
    metaDescription: "Free RSU calculator. See shares and value per vest, shares withheld at 22%, net shares, and extra tax you may owe at your marginal rate.",
    calcInputs: [
      numberField("units", "RSUs Granted", { default: 400, min: 0, max: 10000000, step: 1 }),
      currencyField("sharePrice", "Share Price", { default: 150, max: 1000000, step: 0.5 }),
      numberField("vestingYears", "Vesting Period (Years)", { default: 4, min: 0.25, max: 10, step: 0.25 }),
      {
        key: "vestsPerYear", label: "Vesting Frequency", type: "dropdown", required: true, default: 4,
        options: [
          { label: "Quarterly", value: 4 },
          { label: "Monthly", value: 12 },
          { label: "Semi-Annually", value: 2 },
          { label: "Annually", value: 1 },
        ],
      },
      percentField("marginalRatePercent", "Your Marginal Tax Rate (Federal + State)", { default: 35, max: 60, step: 1 }),
      percentField("withholdingPercent", "Withholding Rate", { default: 22, max: 60, step: 1 }),
    ],
    calcResult: { label: "Value per Vest", format: "currency" },
    calcResults: [
      { key: "sharesPerVest", label: "Shares per Vest", format: "number" },
      { key: "valuePerVest", label: "Value per Vest", format: "currency", highlight: true },
      { key: "sharesWithheldPerVest", label: "Shares Withheld for Tax", format: "number" },
      { key: "netSharesPerVest", label: "Net Shares You Receive", format: "number" },
      { key: "yearlyTaxableIncome", label: "Taxable Income per Year", format: "currency" },
      { key: "extraTaxDuePerYear", label: "Extra Tax Due per Year", format: "currency" },
    ],
    instructions:
      "Restricted stock units become shares when they vest, and their full value on the vesting date is taxed as wages. " +
      "Employers usually withhold federal tax at the 22% supplemental rate (37% on supplemental wages above $1 million a " +
      "year) by keeping some shares. If your real tax rate is higher, you'll owe the difference when you file.\n\n" +
      "After vesting, your cost basis is the vesting-date value; later gains or losses are capital gains.",
    examples:
      "Example: 400 RSUs vesting quarterly over 4 years release 25 shares each quarter — " +
      "$3,750 at $150. About 5.50 shares are withheld for tax, leaving 19.50. " +
      "At a 35% rate, you'd owe about $1,950 more each year at tax time.",
    assumptions:
      "Constant share price and even vesting; Social Security and Medicare tax are also withheld and not shown. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I sell my RSUs when they vest?",
        answer: "Holding vested RSUs is the same as buying your employer's stock with that cash. Many advisors suggest selling to diversify, since your job already depends on the company.",
      },
    ],
  },
  {
    slug: "employee-stock-purchase-plan-calculator",
    title: "Employee Stock Purchase Plan Calculator",
    description: "Calculate your ESPP purchase: payroll contributions, the discounted purchase price with a lookback, shares bought, the built-in gain and your return.",
    metaTitle: "ESPP Calculator — Discount, Lookback & Gain",
    metaDescription: "Free ESPP calculator. See your contributions, the discounted price with lookback, shares bought, the built-in gain and your return.",
    calcInputs: [
      currencyField("salary", "Yearly Salary", { default: 100000, max: 10000000, step: 1000 }),
      percentField("contributionPercent", "Contribution (% of Pay)", { default: 10, max: 25, step: 1 }),
      numberField("periodMonths", "Offering Period (Months)", { default: 6, min: 1, max: 27, step: 1 }),
      percentField("discountPercent", "Discount", { default: 15, max: 15, step: 1 }),
      currencyField("startPrice", "Share Price at Offering Start", { default: 50, max: 1000000, step: 0.5 }),
      currencyField("endPrice", "Share Price at Purchase Date", { default: 60, max: 1000000, step: 0.5 }),
      {
        key: "lookback", label: "Lookback Provision?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes — Discount Off the Lower Price", value: 1 },
          { label: "No — Discount Off the Purchase-Date Price", value: 0 },
        ],
      },
    ],
    calcResult: { label: "Built-In Gain", format: "currency" },
    calcResults: [
      { key: "contributions", label: "Your Contributions", format: "currency" },
      { key: "purchasePrice", label: "Purchase Price per Share", format: "currency" },
      { key: "sharesBought", label: "Shares Bought", format: "number" },
      { key: "valueAtPurchase", label: "Value at Purchase", format: "currency" },
      { key: "builtInGain", label: "Built-In Gain", format: "currency", highlight: true },
      { key: "returnOnContributions", label: "Return on Your Money", format: "percentage" },
      { key: "overYearlyLimit", label: "Over the $25,000 Yearly Limit (1 = Yes)", format: "number" },
    ],
    instructions:
      "In a qualified (Section 423) ESPP, you set aside part of each paycheck and the company buys shares for you at the " +
      "end of each offering period, at up to a 15% discount. With a lookback, the discount applies to the lower of the " +
      "price at the start or the end of the period — so a rising stock can give a much bigger gain.\n\n" +
      "You can buy at most $25,000 of stock a year, valued at the offering-start price.",
    examples:
      "Example: putting 10% of a $100,000 salary into a 6-month offering sets aside " +
      "$5,000. With a lookback, the price is 15% off the lower $50: $42.50. You buy " +
      "117 shares worth $7,020 at $60 — an instant $2,047.50 gain, 41.18% " +
      "on your money.",
    assumptions:
      "Gain before tax: the discount is ordinary income when you sell (the amount depends on whether the sale is a " +
      "qualifying disposition — held 2 years from offering start and 1 year from purchase). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I sell ESPP shares right away?",
        answer: "Selling immediately locks in the discount with little risk. Holding for a qualifying disposition can lower the tax, but exposes you to the stock's price swings.",
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
