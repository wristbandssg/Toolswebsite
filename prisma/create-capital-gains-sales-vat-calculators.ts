// One-time (but safe to re-run) batch setup script: creates all 32 of the
// second "Tax Calculators" batch — Capital Gains Tax (11), Sales Tax (11),
// and VAT (10) — filed DIRECTLY under the "Tax Calculators" category,
// alongside its 12 country/state sub-categories and the 30 US-federal
// income/salary tools from create-us-tax-salary-calculators.ts.
//
// See src/lib/calc-engine-capital-gains-sales-vat-calculators.ts for the
// actual math and which of its exported functions each of these 32 slugs
// maps to. Capital Gains Tax is US-federal-only (continuing this
// category's established national-baseline scope); Sales Tax and VAT are
// jurisdiction-agnostic — the visitor supplies their own rate(s), since
// neither has one single national rate to hard-code.
//
// HOW TO RUN
//   npx tsx prisma/create-capital-gains-sales-vat-calculators.ts
// or
//   npm run db:create-capital-gains-sales-vat-tools
//
// Every tool is created with status "draft" (or left as-is if it already
// exists and was published) — review each one in /admin/tools and publish
// when you're happy with it, same as every other calculator on this site.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "tax-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

// ---------------------------------------------------------------------------
// Shared field building blocks
// ---------------------------------------------------------------------------

const filingStatusField = {
  key: "filingStatus",
  label: "Filing Status",
  type: "dropdown",
  required: true,
  default: 0,
  options: [
    { label: "Single", value: 0 },
    { label: "Married Filing Jointly", value: 1 },
    { label: "Married Filing Separately", value: 2 },
    { label: "Head of Household", value: 3 },
  ],
};

const holdingPeriodField = {
  key: "holdingPeriod",
  label: "Holding Period",
  type: "dropdown",
  required: true,
  default: 1,
  options: [
    { label: "Long-term (held more than 1 year)", value: 1 },
    { label: "Short-term (held 1 year or less)", value: 0 },
  ],
};

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
    max: opts.max ?? 1000000,
    step: opts.step ?? 500,
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
    max: opts.max ?? 30,
    step: opts.step ?? 0.1,
  };
}

const otherIncomeField = currencyField("otherIncome", "Your Other Annual Taxable Income", {
  unit: "per year",
  max: 500000,
  step: 500,
});
const gainAmountField = currencyField("gainAmount", "Capital Gain Amount", { max: 1000000, step: 500 });

const capitalGainsResultLines = [
  { key: "capitalGainsTax", label: "Capital Gains Tax", format: "currency" },
  { key: "niit", label: "Net Investment Income Tax (3.8%, if applicable)", format: "currency" },
  { key: "totalTax", label: "Total Tax on This Gain", format: "currency", highlight: true },
  { key: "netProceeds", label: "Net Proceeds After Tax", format: "currency", highlight: true },
  { key: "effectiveRate", label: "Effective Tax Rate on the Gain", format: "percentage" },
];

const CAPITAL_GAINS_ASSUMPTIONS =
  "This calculator uses 2026 IRS federal capital gains brackets, ordinary income brackets, and the standard " +
  "deduction — it's federal-only (no state capital gains tax, which many states do levy on top of this) and " +
  "doesn't account for itemized deductions or every situation (wash sales, Qualified Opportunity Zone " +
  "deferrals, 1031 exchanges, and similar are not modeled). The 3.8% Net Investment Income Tax is estimated " +
  "using your other income plus the gain as a stand-in for Modified AGI, which is close but not identical to " +
  "the IRS's exact MAGI definition.\n\n" +
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. For guidance specific to your situation, consult a qualified tax professional or the IRS.";

const CAPITAL_GAINS_FAQ_BASICS = [
  {
    question: "Does this include state capital gains tax?",
    answer:
      "No — this is a federal-only calculator. Most states also tax capital gains (often as ordinary income), " +
      "so your total tax bill including state tax will typically be higher than this federal-only estimate.",
  },
  {
    question: "What is the Net Investment Income Tax?",
    answer:
      "An additional 3.8% federal tax on investment income (including capital gains) for higher-income filers — " +
      "above $200,000 Modified AGI for Single/Head of Household, $250,000 for Married Filing Jointly, or " +
      "$125,000 for Married Filing Separately. This calculator estimates it automatically when it applies.",
  },
];

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

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
  // ---------------------------------------------------------------------
  // Capital Gains Tax family
  // ---------------------------------------------------------------------
  {
    slug: "capital-gains-tax-calculator",
    title: "Capital Gains Tax Calculator",
    description:
      "Estimate your 2026 US federal capital gains tax on an investment sale — long-term or short-term — " +
      "including the Net Investment Income Tax where it applies.",
    metaTitle: "Capital Gains Tax Calculator (2026) — Federal Estimate",
    metaDescription:
      "Free capital gains tax calculator using 2026 IRS brackets. Estimate federal tax on a long-term or " +
      "short-term capital gain, including the 3.8% Net Investment Income Tax.",
    calcInputs: [otherIncomeField, gainAmountField, holdingPeriodField, filingStatusField],
    calcResult: { label: "Total Tax on This Gain", format: "currency" },
    calcResults: capitalGainsResultLines,
    instructions:
      "Enter your other annual taxable income, the size of the capital gain, whether you held the asset long-term " +
      "(more than a year) or short-term (a year or less), and your filing status. Long-term gains get their own " +
      "preferential federal rates (0%, 15%, or 20%), while short-term gains are taxed as ordinary income at your " +
      "regular bracket rates — both stack on top of your other income rather than starting from $0.\n\n" +
      "This calculator also estimates the 3.8% Net Investment Income Tax, which can apply on top of the capital " +
      "gains tax itself once your income crosses a threshold, so you get one combined federal tax figure for the " +
      "sale.",
    examples:
      "Example: a Single filer with $90,000 in other income sells a long-term investment for a $30,000 gain. " +
      "That gain stacks on top of their other income and lands entirely in the 15% long-term bracket, producing " +
      "about $4,500 in capital gains tax with no Net Investment Income Tax owed (their income is below the " +
      "$200,000 threshold).",
    assumptions: CAPITAL_GAINS_ASSUMPTIONS,
    faq: [
      {
        question: "What's the difference between long-term and short-term capital gains?",
        answer:
          "Long-term means you held the asset for more than one year before selling — it gets preferential " +
          "federal rates of 0%, 15%, or 20%. Short-term means one year or less, and it's taxed as ordinary " +
          "income at your regular bracket rate, which is usually higher.",
      },
      ...CAPITAL_GAINS_FAQ_BASICS,
    ],
  },
  {
    slug: "long-term-capital-gains-calculator",
    title: "Long Term Capital Gains Calculator",
    description:
      "Calculate your 2026 federal tax on a long-term capital gain (assets held more than a year) using the " +
      "preferential 0%/15%/20% federal rates.",
    metaTitle: "Long Term Capital Gains Calculator (2026) — 0%/15%/20%",
    metaDescription:
      "Free long-term capital gains calculator. Estimate 2026 federal tax at the preferential 0%, 15%, or 20% " +
      "rates on an asset held more than a year.",
    calcInputs: [otherIncomeField, gainAmountField, filingStatusField],
    calcResult: { label: "Total Tax on This Gain", format: "currency" },
    calcResults: capitalGainsResultLines,
    instructions:
      "Built specifically for gains on assets held more than a year, which qualify for the federal government's " +
      "preferential long-term capital gains rates — 0%, 15%, or 20% — rather than ordinary income tax rates. " +
      "Enter your other taxable income, the size of the long-term gain, and your filing status to see which " +
      "rate (or mix of rates) applies and your total tax.\n\n" +
      "Because the gain stacks on top of your other income, it can span more than one rate — for example, part " +
      "of a large gain taxed at 15% and the rest at 20% once your total income crosses the higher threshold. " +
      "This calculator handles that automatically.",
    examples:
      "Example: a Married Filing Jointly couple with $180,000 in other income and a $50,000 long-term gain has " +
      "the entire gain fall in the 15% bracket, for about $7,500 in federal capital gains tax.",
    assumptions: CAPITAL_GAINS_ASSUMPTIONS,
    faq: [
      {
        question: "Can part of my long-term gain be taxed at 0%?",
        answer:
          "Yes — if your taxable income (including the gain) stays under the 0% bracket threshold ($49,450 " +
          "Single, $98,900 Married Filing Jointly for 2026), that portion of the gain is federally tax-free. " +
          "This is common for lower-income years or retirees managing withdrawals carefully.",
      },
      ...CAPITAL_GAINS_FAQ_BASICS,
    ],
  },
  {
    slug: "short-term-capital-gains-calculator",
    title: "Short Term Capital Gains Calculator",
    description:
      "Calculate your 2026 federal tax on a short-term capital gain (assets held one year or less), taxed as " +
      "ordinary income at your regular bracket rate.",
    metaTitle: "Short Term Capital Gains Calculator (2026) — Ordinary Rates",
    metaDescription:
      "Free short-term capital gains calculator. Estimate 2026 federal tax on an asset held one year or less, " +
      "taxed at your ordinary income tax rate.",
    calcInputs: [otherIncomeField, gainAmountField, filingStatusField],
    calcResult: { label: "Total Tax on This Gain", format: "currency" },
    calcResults: capitalGainsResultLines,
    instructions:
      "Built specifically for gains on assets held one year or less, which don't qualify for the preferential " +
      "long-term rates — the IRS taxes short-term gains as ordinary income, at whatever bracket your total " +
      "income lands in. Enter your other taxable income, the size of the short-term gain, and your filing " +
      "status to see the actual extra tax it creates.\n\n" +
      "Because the gain stacks on top of your other income, it's taxed starting at your existing marginal " +
      "bracket, not from the lowest rate — often a real surprise for first-time traders comparing this to the " +
      "lower long-term rates.",
    examples:
      "Example: a Single filer with $70,000 in other income and a $10,000 short-term gain (held under a year) " +
      "has that gain taxed entirely at the 22% bracket, for about $2,200 in federal tax — noticeably more than " +
      "the same gain would owe if it had qualified as long-term.",
    assumptions: CAPITAL_GAINS_ASSUMPTIONS,
    faq: [
      {
        question: "Why is short-term capital gains tax so much higher than long-term?",
        answer:
          "Congress intentionally taxes short-term (held a year or less) gains at ordinary income rates — up to " +
          "37% — to encourage longer holding periods, while long-term gains get preferential 0%/15%/20% rates. " +
          "Holding an asset even a few extra days past the one-year mark can meaningfully lower the tax owed.",
      },
      ...CAPITAL_GAINS_FAQ_BASICS,
    ],
  },
  {
    slug: "stock-capital-gains-calculator",
    title: "Stock Capital Gains Calculator",
    description:
      "Estimate 2026 federal capital gains tax on a stock sale — long-term or short-term — including the Net " +
      "Investment Income Tax where it applies.",
    metaTitle: "Stock Capital Gains Calculator (2026) — Federal Tax Estimate",
    metaDescription:
      "Free stock capital gains calculator. Estimate 2026 federal tax on selling stock, long-term or " +
      "short-term, using current IRS rates.",
    calcInputs: [otherIncomeField, gainAmountField, holdingPeriodField, filingStatusField],
    calcResult: { label: "Total Tax on This Gain", format: "currency" },
    calcResults: capitalGainsResultLines,
    instructions:
      "Built for stock (and ETF/mutual fund) sales specifically: enter your other taxable income, the profit " +
      "from the stock sale, whether you held the shares long-term (more than a year) or short-term (a year or " +
      "less), and your filing status. This estimates the federal capital gains tax owed, plus the 3.8% Net " +
      "Investment Income Tax if your income is high enough to trigger it.\n\n" +
      "Useful before selling to estimate the after-tax proceeds you'll actually walk away with, or when " +
      "deciding whether to wait a bit longer to qualify for the lower long-term rate.",
    examples:
      "Example: a Single filer with $110,000 in other income sells stock held for two years with a $25,000 " +
      "gain — the entire gain falls in the 15% long-term bracket, for about $3,750 in federal capital gains " +
      "tax and no Net Investment Income Tax.",
    assumptions:
      CAPITAL_GAINS_ASSUMPTIONS +
      "\n\nThis calculator treats the entire gain as a single sale — it doesn't handle wash sale rules " +
      "(disallowing a loss if you buy a substantially identical security within 30 days) or specific-lot cost " +
      "basis selection.",
    faq: [
      {
        question: "Does selling and rebuying the same stock quickly affect my taxes?",
        answer:
          "Selling at a LOSS and buying a substantially identical security within 30 days before or after " +
          "triggers the \"wash sale\" rule, which disallows the loss for tax purposes. This calculator doesn't " +
          "model wash sales — it assumes the gain or loss you enter is fully recognized.",
      },
      ...CAPITAL_GAINS_FAQ_BASICS,
    ],
  },
  {
    slug: "crypto-capital-gains-calculator",
    title: "Crypto Capital Gains Calculator",
    description:
      "Estimate 2026 federal capital gains tax on cryptocurrency sales or trades — long-term or short-term — " +
      "the same way the IRS taxes any other property sale.",
    metaTitle: "Crypto Capital Gains Calculator (2026) — Federal Tax Estimate",
    metaDescription:
      "Free crypto capital gains calculator. Estimate 2026 federal tax on cryptocurrency gains, long-term or " +
      "short-term, using current IRS rates.",
    calcInputs: [otherIncomeField, gainAmountField, holdingPeriodField, filingStatusField],
    calcResult: { label: "Total Tax on This Gain", format: "currency" },
    calcResults: capitalGainsResultLines,
    instructions:
      "The IRS treats cryptocurrency as property, not currency, so selling, trading, or spending crypto at a " +
      "gain triggers capital gains tax the same way selling stock would. Enter your other taxable income, the " +
      "gain from your crypto activity, whether you held it long-term (more than a year) or short-term (a year " +
      "or less), and your filing status to estimate the federal tax owed.\n\n" +
      "This applies to selling crypto for cash, trading one cryptocurrency for another, and using crypto to buy " +
      "goods or services — each is generally a taxable event on any gain since you acquired it.",
    examples:
      "Example: a Single filer with $60,000 in other income has a $15,000 gain from crypto held less than a " +
      "year (short-term) — the gain is taxed as ordinary income, spanning the 12% and 22% brackets, for about " +
      "$2,650 in federal tax.",
    assumptions:
      CAPITAL_GAINS_ASSUMPTIONS +
      "\n\nThis calculator assumes you already know your total gain (proceeds minus your cost basis, including " +
      "any transaction fees) across your crypto activity for the period — it doesn't calculate cost basis " +
      "across multiple trades or handle specific accounting methods (FIFO, LIFO, specific identification).",
    faq: [
      {
        question: "Is trading one crypto for another a taxable event?",
        answer:
          "Yes — the IRS treats a crypto-to-crypto trade as a sale of the first asset (at its fair market value " +
          "at the time of the trade) followed by a purchase of the second, so any gain on the asset you traded " +
          "away is taxable, even though you never converted to cash.",
      },
      ...CAPITAL_GAINS_FAQ_BASICS,
    ],
  },
  {
    slug: "real-estate-capital-gains-calculator",
    title: "Real Estate Capital Gains Calculator",
    description:
      "Estimate 2026 federal capital gains tax on a real estate sale, including the Section 121 primary " +
      "residence exclusion (up to $250,000/$500,000 tax-free) where it applies.",
    metaTitle: "Real Estate Capital Gains Calculator (2026) — Home Sale Exclusion",
    metaDescription:
      "Free real estate capital gains calculator. Estimate 2026 federal tax on a home or property sale, " +
      "including the Section 121 primary residence exclusion.",
    calcInputs: [
      otherIncomeField,
      gainAmountField,
      holdingPeriodField,
      {
        key: "claimHomeSaleExclusion",
        label: "Claim Primary Residence Exclusion?",
        type: "dropdown",
        required: true,
        default: 0,
        options: [
          { label: "No — investment property or doesn't qualify", value: 0 },
          { label: "Yes — this was my primary residence (owned & lived in 2 of last 5 years)", value: 1 },
        ],
      },
      filingStatusField,
    ],
    calcResult: { label: "Total Tax on This Gain", format: "currency" },
    calcResults: [
      { key: "exclusionApplied", label: "Section 121 Exclusion Applied", format: "currency" },
      { key: "taxableGain", label: "Taxable Gain (After Exclusion)", format: "currency" },
      { key: "capitalGainsTax", label: "Capital Gains Tax", format: "currency" },
      { key: "niit", label: "Net Investment Income Tax (3.8%, if applicable)", format: "currency" },
      { key: "totalTax", label: "Total Tax on This Sale", format: "currency", highlight: true },
      { key: "netProceeds", label: "Net Proceeds After Tax", format: "currency", highlight: true },
      { key: "effectiveRate", label: "Effective Tax Rate on the Gain", format: "percentage" },
    ],
    instructions:
      "Enter your other taxable income, the total gain on the property (sale price minus your adjusted cost " +
      "basis, including improvements), whether you held it long-term or short-term, and whether it qualifies " +
      "for the Section 121 primary residence exclusion (you owned and lived in it as your main home for at " +
      "least 2 of the last 5 years). If it qualifies, up to $250,000 of gain ($500,000 for Married Filing " +
      "Jointly) is excluded from federal tax entirely before the remaining gain is taxed.\n\n" +
      "This is the single biggest tax break most homeowners will ever use, so getting it right matters — this " +
      "calculator applies it automatically when you select Yes.",
    examples:
      "Example: a Married Filing Jointly couple sells their primary residence for a $420,000 gain after owning " +
      "and living in it for 5 years. The full $500,000 MFJ exclusion covers the entire gain, leaving $0 in " +
      "taxable gain and $0 in federal capital gains tax.",
    assumptions:
      CAPITAL_GAINS_ASSUMPTIONS +
      "\n\nThe Section 121 exclusion ($250,000 Single/Married Filing Separately/Head of Household, $500,000 " +
      "Married Filing Jointly) requires owning AND living in the property as your main home for at least 2 of " +
      "the 5 years before the sale, and generally can't be used more than once every 2 years — this calculator " +
      "assumes you've confirmed you're eligible when you select Yes, and doesn't check the ownership/use tests " +
      "itself.",
    faq: [
      {
        question: "How much of my home sale gain is tax-free?",
        answer:
          "Up to $250,000 for a Single, Married Filing Separately, or Head of Household filer, or $500,000 for " +
          "Married Filing Jointly, as long as you owned and lived in the home as your primary residence for at " +
          "least 2 of the 5 years before the sale.",
      },
      {
        question: "Does this exclusion apply to a rental or investment property?",
        answer:
          "No — the Section 121 exclusion is only for a primary residence. Use the Rental Property Capital " +
          "Gains Calculator on this site instead for investment or rental property, which has its own rules " +
          "around depreciation recapture rather than a home-sale exclusion.",
      },
      ...CAPITAL_GAINS_FAQ_BASICS,
    ],
  },
  {
    slug: "rental-property-capital-gains-calculator",
    title: "Rental Property Capital Gains Calculator",
    description:
      "Estimate 2026 federal capital gains tax on selling rental or investment property, including " +
      "depreciation recapture taxed at up to 25%.",
    metaTitle: "Rental Property Capital Gains Calculator (2026) — Depreciation Recapture",
    metaDescription:
      "Free rental property capital gains calculator. Estimate 2026 federal tax on selling investment property, " +
      "including depreciation recapture at up to 25%.",
    calcInputs: [
      otherIncomeField,
      currencyField("totalGain", "Total Capital Gain", { max: 1000000, step: 500 }),
      currencyField("depreciationRecapture", "Depreciation Recapture Amount (Unrecaptured Section 1250 Gain)", {
        max: 500000,
        step: 500,
      }),
      filingStatusField,
    ],
    calcResult: { label: "Total Tax on This Sale", format: "currency" },
    calcResults: [
      { key: "recaptureAmount", label: "Depreciation Recapture Amount", format: "currency" },
      { key: "recaptureTax", label: "Tax on Depreciation Recapture (up to 25%)", format: "currency" },
      { key: "remainingGainTax", label: "Tax on Remaining Gain (Long-Term Rates)", format: "currency" },
      { key: "niit", label: "Net Investment Income Tax (3.8%, if applicable)", format: "currency" },
      { key: "totalTax", label: "Total Tax on This Sale", format: "currency", highlight: true },
      { key: "netProceeds", label: "Net Proceeds After Tax", format: "currency", highlight: true },
    ],
    instructions:
      "Selling a rental or investment property involves a wrinkle a primary residence sale doesn't: any " +
      "depreciation you claimed while renting it out has to be \"recaptured\" and taxed at ordinary rates " +
      "(capped at a 25% maximum), with only the REMAINING gain taxed at the usual preferential long-term rates. " +
      "Enter your other taxable income, the total gain on the sale, the amount of depreciation you claimed over " +
      "the years (your tax preparer or prior returns will have this figure), and your filing status.\n\n" +
      "This calculator splits the gain into its recapture portion and its remaining long-term portion " +
      "automatically, taxing each correctly rather than applying one blended rate.",
    examples:
      "Example: a Single filer with $90,000 in other income sells a rental property for a $120,000 total gain, " +
      "of which $40,000 is depreciation recapture. The recapture portion is taxed at ordinary rates capped at " +
      "25% (about $8,964), and the remaining $80,000 of gain is taxed at long-term rates (about $12,000), plus " +
      "$380 in Net Investment Income Tax — a combined federal tax of roughly $21,344.",
    assumptions:
      CAPITAL_GAINS_ASSUMPTIONS +
      "\n\nDepreciation recapture (\"unrecaptured Section 1250 gain\") is taxed at your ordinary marginal rate, " +
      "but never higher than 25% — this calculator applies that cap automatically. It doesn't model a 1031 " +
      "like-kind exchange (which can defer this tax entirely if you reinvest in another property) or passive " +
      "activity loss carryforwards you may be able to use against the gain.",
    faq: [
      {
        question: "What is depreciation recapture?",
        answer:
          "While you owned the rental property, you likely deducted depreciation against your rental income " +
          "each year. When you sell, the IRS \"recaptures\" that benefit by taxing an amount equal to the " +
          "depreciation you claimed at ordinary rates (capped at 25%), rather than letting all of it enjoy the " +
          "lower long-term capital gains rate.",
      },
      {
        question: "Can I avoid this tax with a 1031 exchange?",
        answer:
          "Often yes — a 1031 like-kind exchange lets you defer both the capital gains tax and the depreciation " +
          "recapture tax by reinvesting the proceeds into another qualifying investment property, though the " +
          "rules are strict on timing and structure. This calculator doesn't model a 1031 exchange; consult a " +
          "tax professional if you're considering one.",
      },
      ...CAPITAL_GAINS_FAQ_BASICS,
    ],
  },
  {
    slug: "inherited-asset-capital-gains-calculator",
    title: "Inherited Asset Capital Gains Calculator",
    description:
      "Estimate 2026 federal capital gains tax on selling an inherited asset, using its stepped-up basis (fair " +
      "market value at date of death) — always taxed as long-term.",
    metaTitle: "Inherited Asset Capital Gains Calculator (2026) — Stepped-Up Basis",
    metaDescription:
      "Free inherited asset capital gains calculator. Estimate 2026 federal tax using stepped-up basis — " +
      "inherited assets are always treated as long-term gains.",
    calcInputs: [
      currencyField("salePrice", "Sale Price", { max: 2000000, step: 1000 }),
      currencyField("steppedUpBasis", "Stepped-Up Basis (Fair Market Value at Date of Death)", {
        max: 2000000,
        step: 1000,
      }),
      otherIncomeField,
      filingStatusField,
    ],
    calcResult: { label: "Total Tax on This Sale", format: "currency" },
    calcResults: [
      { key: "gainAmount", label: "Capital Gain (Sale Price − Stepped-Up Basis)", format: "currency" },
      { key: "capitalGainsTax", label: "Capital Gains Tax", format: "currency" },
      { key: "niit", label: "Net Investment Income Tax (3.8%, if applicable)", format: "currency" },
      { key: "totalTax", label: "Total Tax on This Sale", format: "currency", highlight: true },
      { key: "netProceeds", label: "Net Proceeds After Tax", format: "currency", highlight: true },
    ],
    instructions:
      "Inherited assets get a major tax break: their cost basis is \"stepped up\" to the fair market value on " +
      "the date the original owner died, rather than what that person originally paid — often erasing most or " +
      "all of the gain that built up during their lifetime. Enter the sale price, the stepped-up basis (an " +
      "appraisal or estate valuation at the date of death, which the estate's executor or an appraiser can " +
      "provide), your other taxable income, and your filing status.\n\n" +
      "Gains on inherited property are ALWAYS treated as long-term for tax purposes, no matter how briefly you " +
      "actually held it before selling — this calculator applies the preferential long-term rates automatically.",
    examples:
      "Example: someone inherits a property valued at $300,000 (its stepped-up basis) at the date of death and " +
      "sells it a few months later for $310,000, with $80,000 in other taxable income filing Single. The " +
      "taxable gain is just $10,000 — the appreciation during the original owner's lifetime isn't taxed at all — " +
      "for about $1,500 in federal capital gains tax.",
    assumptions:
      CAPITAL_GAINS_ASSUMPTIONS +
      "\n\nThis calculator assumes you already have a reliable stepped-up basis figure (typically from an estate " +
      "appraisal or the executor's records) — it doesn't calculate that valuation itself. It also doesn't model " +
      "estate tax, which is a separate matter from the capital gains tax covered here.",
    faq: [
      {
        question: "What is 'stepped-up basis'?",
        answer:
          "When you inherit an asset, its cost basis for tax purposes resets to its fair market value on the " +
          "date the original owner died — not what they originally paid. This often wipes out most of the " +
          "taxable gain if you sell soon after inheriting.",
      },
      {
        question: "Is an inherited asset always taxed as long-term, even if I sell it right away?",
        answer:
          "Yes — by law, inherited property automatically qualifies for long-term capital gains treatment " +
          "regardless of how long you personally held it before selling.",
      },
      ...CAPITAL_GAINS_FAQ_BASICS.slice(0, 1),
    ],
  },
  {
    slug: "gifted-asset-capital-gains-calculator",
    title: "Gifted Asset Capital Gains Calculator",
    description:
      "Estimate 2026 federal capital gains tax on selling a gifted asset, using the donor's original (carryover) " +
      "cost basis and holding period.",
    metaTitle: "Gifted Asset Capital Gains Calculator (2026) — Carryover Basis",
    metaDescription:
      "Free gifted asset capital gains calculator. Estimate 2026 federal tax using the donor's carryover cost " +
      "basis and holding period.",
    calcInputs: [
      currencyField("salePrice", "Sale Price", { max: 2000000, step: 1000 }),
      currencyField("donorBasis", "Donor's Original Cost Basis", { max: 2000000, step: 1000 }),
      otherIncomeField,
      holdingPeriodField,
      filingStatusField,
    ],
    calcResult: { label: "Total Tax on This Sale", format: "currency" },
    calcResults: [
      { key: "gainAmount", label: "Capital Gain (Sale Price − Donor's Basis)", format: "currency" },
      { key: "capitalGainsTax", label: "Capital Gains Tax", format: "currency" },
      { key: "niit", label: "Net Investment Income Tax (3.8%, if applicable)", format: "currency" },
      { key: "totalTax", label: "Total Tax on This Sale", format: "currency", highlight: true },
      { key: "netProceeds", label: "Net Proceeds After Tax", format: "currency", highlight: true },
    ],
    instructions:
      "Unlike an inherited asset, a GIFTED asset doesn't get a basis step-up — you generally take over the " +
      "donor's original (\"carryover\") cost basis and their original holding period. Enter the sale price, the " +
      "donor's original cost basis (what they paid, plus any improvements), your other taxable income, whether " +
      "the combined holding period (donor's plus yours) is long-term or short-term, and your filing status.\n\n" +
      "This matters a lot for tax planning: a gift of a highly appreciated asset passes along the embedded gain, " +
      "while the same asset left as an inheritance would get a fresh, stepped-up basis instead.",
    examples:
      "Example: someone receives a gift of stock the donor originally bought for $20,000 (their basis), held for " +
      "several years before and after the gift (long-term), and sells it for $50,000 with $75,000 in other " +
      "taxable income, filing Single. The $30,000 gain falls in the 15% long-term bracket, for about $4,500 in " +
      "federal capital gains tax.",
    assumptions:
      CAPITAL_GAINS_ASSUMPTIONS +
      "\n\nThis calculator uses the general carryover basis rule, which applies when the asset's value has gone " +
      "up since the donor acquired it. If the asset had LOST value before the gift, special basis rules apply " +
      "for calculating a loss that this calculator doesn't separately model — consult a tax professional for a " +
      "gifted asset that was worth less than the donor's basis at the time of the gift.",
    faq: [
      {
        question: "What basis do I use for a gifted asset?",
        answer:
          "Generally, the donor's original cost basis carries over to you (\"carryover basis\"), along with " +
          "their original holding period — so if they bought it years ago, your holding period for long-term " +
          "treatment includes that time, not just how long you've personally owned it.",
      },
      {
        question: "Is a gifted asset different from an inherited one for tax purposes?",
        answer:
          "Yes, significantly — a gift carries over the donor's original basis (so their embedded gain becomes " +
          "yours), while an inherited asset gets a fresh, stepped-up basis to fair market value at death, which " +
          "can eliminate most or all of the built-up gain. See the Inherited Asset Capital Gains Calculator on " +
          "this site for that case.",
      },
      ...CAPITAL_GAINS_FAQ_BASICS.slice(0, 1),
    ],
  },
  {
    slug: "capital-gains-cost-basis-calculator",
    title: "Capital Gains Cost Basis Calculator",
    description:
      "Work out your adjusted cost basis and resulting capital gain (or loss) from your purchase price, fees, " +
      "improvements, and selling costs.",
    metaTitle: "Capital Gains Cost Basis Calculator — Adjusted Basis & Gain",
    metaDescription:
      "Free cost basis calculator. Find your adjusted cost basis and capital gain or loss from purchase price, " +
      "fees, improvements, and selling costs.",
    calcInputs: [
      currencyField("purchasePrice", "Original Purchase Price", { max: 2000000, step: 1000 }),
      currencyField("purchaseFees", "Purchase Fees/Commissions", { max: 100000, step: 100, required: false }),
      currencyField("improvements", "Improvements/Capital Additions", { max: 500000, step: 500, required: false }),
      currencyField("salePrice", "Sale Price", { max: 2000000, step: 1000 }),
      currencyField("sellingCosts", "Selling Costs/Commissions", { max: 100000, step: 100, required: false }),
    ],
    calcResult: { label: "Capital Gain", format: "currency" },
    calcResults: [
      { key: "adjustedCostBasis", label: "Adjusted Cost Basis", format: "currency" },
      { key: "netSaleProceeds", label: "Net Sale Proceeds (After Selling Costs)", format: "currency" },
      { key: "capitalGain", label: "Capital Gain (or Loss)", format: "currency", highlight: true },
    ],
    instructions:
      "Before you can calculate any capital gains TAX, you need an accurate gain figure — and that starts with " +
      "your adjusted cost basis, which is usually more than just what you originally paid. Enter your original " +
      "purchase price, any fees or commissions paid to buy it, improvements or capital additions you've made " +
      "since (for real estate especially — a new roof or addition adds to basis, routine repairs don't), the " +
      "sale price, and any selling costs or commissions.\n\n" +
      "This calculator adds fees and improvements to your purchase price to get your adjusted cost basis, " +
      "subtracts selling costs from your sale price to get net proceeds, and shows the resulting gain (or loss) " +
      "— the number every other capital gains calculator on this site actually taxes.",
    examples:
      "Example: a property bought for $300,000 with $5,000 in purchase fees and $40,000 in capital improvements " +
      "has an adjusted cost basis of $345,000. Sold for $420,000 with $25,000 in selling costs, net proceeds are " +
      "$395,000 — a capital gain of $50,000, well below the naive $120,000 (sale price minus purchase price) " +
      "someone might assume without accounting for basis adjustments.",
    assumptions:
      "This calculator performs straightforward addition and subtraction — it doesn't apply any tax rates, so " +
      "there's no capital gains bracket or filing status involved here. It's a general-purpose basis calculator " +
      "that applies to any asset type (real estate, stocks, or other property); some asset types have additional " +
      "basis adjustment rules (like depreciation reducing real estate basis) that this simplified version doesn't " +
      "include.\n\n" +
      "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
      "advice. For guidance specific to your situation, consult a qualified tax professional or the IRS.",
    faq: [
      {
        question: "Why isn't my cost basis just what I paid for the asset?",
        answer:
          "Your basis is adjusted upward by purchase fees/commissions and, for real estate, capital improvements " +
          "(not routine repairs) — and your net proceeds are reduced by selling costs. Skipping these adjustments " +
          "overstates your taxable gain.",
      },
      {
        question: "What counts as a capital improvement versus a repair?",
        answer:
          "A capital improvement adds value or extends the asset's life (a new roof, an addition, a major " +
          "renovation) and increases your basis. A routine repair (fixing a leak, repainting) maintains the " +
          "asset and doesn't add to basis.",
      },
      {
        question: "What do I do with the gain figure this calculator gives me?",
        answer:
          "Plug it into the Capital Gains Tax Calculator (or the Long Term/Short Term/Stock/Crypto/Real Estate " +
          "variants on this site) as your \"gain amount\" to estimate the actual tax owed on it.",
      },
    ],
  },
  {
    slug: "capital-gains-rate-calculator",
    title: "Capital Gains Rate Calculator",
    description:
      "Find which 2026 federal long-term capital gains rate (0%, 15%, or 20%) applies to you, based on your " +
      "other taxable income and filing status.",
    metaTitle: "Capital Gains Rate Calculator (2026) — Find Your LTCG Rate",
    metaDescription:
      "Free capital gains rate calculator. Find your 2026 federal long-term capital gains rate (0%, 15%, or " +
      "20%) and how much room is left before it increases.",
    calcInputs: [otherIncomeField, filingStatusField],
    calcResult: { label: "Your Long-Term Capital Gains Rate", format: "percentage" },
    calcResults: [
      { key: "yourLtcgRate", label: "Your Long-Term Capital Gains Rate", format: "percentage", highlight: true },
      { key: "roomAtThisRate", label: "Room Left Before the Rate Increases", format: "currency" },
    ],
    instructions:
      "Enter your other taxable income (before adding any capital gain) and your filing status to instantly see " +
      "which of the three 2026 long-term capital gains rates — 0%, 15%, or 20% — the FIRST dollar of a long-term " +
      "gain would be taxed at. This is genuinely useful on its own, separate from calculating tax on a specific " +
      "gain amount, for planning when to sell.\n\n" +
      "The result also shows how much more taxable income (including any gain) you could add before crossing " +
      "into the next, higher rate — handy for timing a sale to stay in a lower bracket, or for tax-loss/gain " +
      "harvesting decisions near year-end.",
    examples:
      "Example: a Single filer with $40,000 in other taxable income has a starting long-term capital gains rate " +
      "of 0%, with about $25,550 of room (gains up to that amount would stay entirely tax-free) before crossing " +
      "into the 15% bracket.",
    assumptions: CAPITAL_GAINS_ASSUMPTIONS,
    faq: [
      {
        question: "Is my capital gains rate the same as my income tax bracket?",
        answer:
          "No — long-term capital gains have their own separate rate schedule (0%/15%/20%) that doesn't match " +
          "the ordinary income brackets (10% through 37%), though both are based on the same taxable income " +
          "figure. It's common to be in, say, the 22% ordinary bracket while your long-term gains are taxed at " +
          "15%.",
      },
      ...CAPITAL_GAINS_FAQ_BASICS,
    ],
  },

  // ---------------------------------------------------------------------
  // Sales Tax family
  // ---------------------------------------------------------------------
  ...buildSalesTaxTools(),

  // ---------------------------------------------------------------------
  // VAT family
  // ---------------------------------------------------------------------
  ...buildVatTools(),
];

// ---------------------------------------------------------------------------
// Sales Tax + VAT tool builders — these two families are each internally
// very repetitive (the same forward/reverse math with different framing),
// so they're generated from a small table rather than written out fully by
// hand like the Capital Gains tools above, whose math genuinely differs
// tool to tool.
// ---------------------------------------------------------------------------

function buildSalesTaxTools(): ToolDef[] {
  const priceField = currencyField("price", "Price", { max: 100000, step: 10 });
  const taxRateField = percentField("taxRate", "Sales Tax Rate", { max: 15, step: 0.05, default: 7 });

  function inputs(defaultIncludesTax: 0 | 1) {
    return [
      priceField,
      taxRateField,
      {
        key: "priceIncludesTax",
        label: "This Price...",
        type: "dropdown",
        required: true,
        default: defaultIncludesTax,
        options: [
          { label: "...does NOT include tax yet (add tax)", value: 0 },
          { label: "...already includes tax (extract tax)", value: 1 },
        ],
      },
    ];
  }

  function results(highlightTotal: boolean) {
    return [
      { key: "preTaxPrice", label: "Price Before Tax", format: "currency", highlight: !highlightTotal },
      { key: "taxAmount", label: "Sales Tax Amount", format: "currency" },
      { key: "totalPrice", label: "Total Price (With Tax)", format: "currency", highlight: highlightTotal },
    ];
  }

  const SALES_TAX_ASSUMPTIONS =
    "US sales tax has no single national rate — it's set by state, and often layered with county, city, and " +
    "special district rates on top, so this calculator asks for the rate directly rather than assuming one. " +
    "Look up your combined local rate from your state's Department of Revenue (or a recent receipt) for an " +
    "accurate result — for a rate built up from multiple layers (state + county + city), see the City, County, " +
    "or Combined Sales Tax Calculators on this site instead.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice.";

  const SALES_TAX_FAQ = [
    {
      question: "Why do I have to enter the tax rate myself?",
      answer:
        "Because US sales tax varies by state, county, and city — there's no single national rate to hard-code. " +
        "Check your state's Department of Revenue website or a recent receipt for your area's exact combined " +
        "rate.",
    },
    {
      question: "What's the difference between a tax-exclusive and tax-inclusive price?",
      answer:
        "A tax-exclusive price doesn't yet have sales tax added (like most US price tags) — tax gets added at " +
        "checkout. A tax-inclusive price already has tax built in (common in some receipts or all-in pricing) — " +
        "this calculator can work either direction.",
    },
  ];

  const defs: (Omit<ToolDef, "assumptions" | "faq"> & { assumptions?: string; faq?: ToolDef["faq"] })[] = [
    {
      slug: "sales-tax-calculator",
      title: "Sales Tax Calculator",
      description: "Calculate sales tax and the total price on a purchase — enter the price and your local tax rate.",
      metaTitle: "Sales Tax Calculator — Free & Instant",
      metaDescription: "Free sales tax calculator. Enter a price and your local sales tax rate to find the tax amount and total price.",
      calcInputs: inputs(0),
      calcResult: { label: "Total Price", format: "currency" },
      calcResults: results(true),
      instructions:
        "Enter a price and your local sales tax rate (state plus any county/city/district rates combined), then " +
        "click Calculate. This tool adds sales tax to a pre-tax price to show the tax amount and the final total " +
        "you'd actually pay at checkout.\n\n" +
        "Don't know your combined local rate? Check a recent receipt from the same area, or look it up on your " +
        "state's Department of Revenue website — rates vary block to block in some places once city and special " +
        "district taxes are layered on.",
      examples: "Example: a $85 item with an 8.25% combined sales tax rate has $7.01 in sales tax, for a total of $92.01.",
    },
    {
      slug: "reverse-sales-tax-calculator",
      title: "Reverse Sales Tax Calculator",
      description: "Work backward from a tax-inclusive total to find the pre-tax price and the exact tax amount.",
      metaTitle: "Reverse Sales Tax Calculator — Extract Tax From a Total",
      metaDescription: "Free reverse sales tax calculator. Enter a total price and tax rate to find the pre-tax price and tax amount.",
      calcInputs: inputs(1),
      calcResult: { label: "Price Before Tax", format: "currency" },
      calcResults: results(false),
      instructions:
        "Have a total (tax-inclusive) price and need to know what it was before tax? Enter the total and the " +
        "sales tax rate, and this calculator extracts the tax amount to show you the original pre-tax price.\n\n" +
        "Useful for bookkeeping, expense reports, or figuring out an item's actual price when all you have is a " +
        "receipt showing the final charged amount.",
      examples: "Example: a $108 total with an 8% sales tax rate breaks down to an $100.00 pre-tax price and $8.00 in tax.",
    },
    {
      slug: "sales-tax-inclusive-calculator",
      title: "Sales Tax Inclusive Calculator",
      description: "Break a tax-inclusive price down into its pre-tax amount and the sales tax portion.",
      metaTitle: "Sales Tax Inclusive Calculator — Break Down a Total",
      metaDescription: "Free sales tax inclusive calculator. Break a tax-inclusive price into its pre-tax amount and the tax portion.",
      calcInputs: inputs(1),
      calcResult: { label: "Price Before Tax", format: "currency" },
      calcResults: results(false),
      instructions:
        "When a price already includes sales tax (common with some all-in pricing or receipts), enter that total " +
        "and the tax rate to see the breakdown: how much was the actual item price, and how much was tax.\n\n" +
        "This is the same math as extracting tax from a total — useful whenever you're given a final number and " +
        "need to see what's baked into it.",
      examples: "Example: a $53.50 tax-inclusive price at a 7% rate breaks down to a $50.00 pre-tax price and $3.50 in tax.",
    },
    {
      slug: "sales-tax-exclusive-calculator",
      title: "Sales Tax Exclusive Calculator",
      description: "Add sales tax to a pre-tax (exclusive) price to find the tax amount and final total.",
      metaTitle: "Sales Tax Exclusive Calculator — Add Tax to a Price",
      metaDescription: "Free sales tax exclusive calculator. Add sales tax to a pre-tax price to find the tax amount and total.",
      calcInputs: inputs(0),
      calcResult: { label: "Total Price", format: "currency" },
      calcResults: results(true),
      instructions:
        "For a price that doesn't yet include tax (the standard way most US price tags work), enter the price " +
        "and your local sales tax rate to see the tax amount and the final total you'd pay.\n\n" +
        "This is the most common sales tax calculation — adding tax on top of a listed price — shown with a full " +
        "breakdown rather than just the final number.",
      examples: "Example: a $220 pre-tax price at a 6.5% sales tax rate adds $14.30 in tax, for a total of $234.30.",
    },
    {
      slug: "pre-tax-price-calculator",
      title: "Pre-Tax Price Calculator",
      description: "Find the pre-tax price of an item from its tax-inclusive total and the sales tax rate.",
      metaTitle: "Pre-Tax Price Calculator — Find the Price Before Tax",
      metaDescription: "Free pre-tax price calculator. Find an item's price before sales tax from its total price and tax rate.",
      calcInputs: inputs(1),
      calcResult: { label: "Price Before Tax", format: "currency" },
      calcResults: results(false),
      instructions:
        "Enter the total (after-tax) price you paid and the sales tax rate that applied, and this calculator " +
        "works backward to find the pre-tax price — the number before sales tax was added.\n\n" +
        "Handy for comparing prices across stores or regions with different tax rates on an apples-to-apples, " +
        "before-tax basis.",
      examples: "Example: a $64.80 total price at an 8% sales tax rate has a pre-tax price of $60.00.",
    },
    {
      slug: "post-tax-price-calculator",
      title: "Post-Tax Price Calculator",
      description: "Find the final price you'll pay after sales tax, from a pre-tax price and your local tax rate.",
      metaTitle: "Post-Tax Price Calculator — Find the Total Price",
      metaDescription: "Free post-tax price calculator. Find the total price after sales tax from a pre-tax price and tax rate.",
      calcInputs: inputs(0),
      calcResult: { label: "Total Price", format: "currency" },
      calcResults: results(true),
      instructions:
        "Enter a pre-tax price and your local sales tax rate to see exactly what you'll pay at checkout, tax " +
        "included.\n\n" +
        "Useful for budgeting a purchase in advance, since sticker prices in the US almost never include tax up " +
        "front.",
      examples: "Example: a $150 pre-tax price at a 9% sales tax rate has a post-tax total of $163.50.",
    },
    {
      slug: "use-tax-calculator",
      title: "Use Tax Calculator",
      description: "Calculate use tax owed on a purchase where sales tax wasn't collected by the seller.",
      metaTitle: "Use Tax Calculator — Tax on Untaxed Purchases",
      metaDescription: "Free use tax calculator. Estimate use tax owed on out-of-state or online purchases where sales tax wasn't collected.",
      calcInputs: inputs(0),
      calcResult: { label: "Use Tax Owed", format: "currency" },
      calcResults: [
        { key: "preTaxPrice", label: "Purchase Price", format: "currency" },
        { key: "taxAmount", label: "Use Tax Owed", format: "currency", highlight: true },
        { key: "totalPrice", label: "Total Cost (Price + Use Tax)", format: "currency" },
      ],
      instructions:
        "Use tax is the counterpart to sales tax: when you buy something from an out-of-state or online seller " +
        "that doesn't collect your state's sales tax, you generally still owe the equivalent as \"use tax,\" " +
        "usually reported on your state income tax return. Enter the purchase price and your state's use tax " +
        "rate (normally the same as your sales tax rate) to see what's owed.\n\n" +
        "This applies most often to online purchases from smaller retailers, out-of-state furniture or vehicle " +
        "purchases, and similar cases where sales tax wasn't charged at the register.",
      examples: "Example: a $500 online purchase with no sales tax collected, in a state with a 6% use tax rate, owes $30.00 in use tax.",
      assumptions:
        "Use tax rates generally match your state's sales tax rate, though this varies by state and sometimes by " +
        "item type — check your state's Department of Revenue for your exact rate and reporting requirements " +
        "(often filed with your annual state income tax return).\n\n" +
        "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
        "advice.",
      faq: [
        {
          question: "What is use tax?",
          answer:
            "Use tax is owed on a taxable purchase when the seller didn't collect sales tax — often an " +
            "out-of-state or online purchase. It's generally the same rate as your state's sales tax, and most " +
            "states expect you to self-report and pay it, commonly on your state income tax return.",
        },
        {
          question: "Do I really have to pay this myself?",
          answer:
            "Technically, yes, in states that levy a use tax (most do) — though enforcement for small personal " +
            "purchases is inconsistent. Larger purchases (vehicles, boats, big furniture orders) are more " +
            "commonly tracked and enforced.",
        },
      ],
    },
    {
      slug: "consumer-use-tax-calculator",
      title: "Consumer Use Tax Calculator",
      description: "Calculate consumer use tax owed on personal purchases where sales tax wasn't collected.",
      metaTitle: "Consumer Use Tax Calculator — Personal Purchase Tax",
      metaDescription: "Free consumer use tax calculator. Estimate use tax on personal purchases where sales tax wasn't collected at checkout.",
      calcInputs: inputs(0),
      calcResult: { label: "Use Tax Owed", format: "currency" },
      calcResults: [
        { key: "preTaxPrice", label: "Purchase Price", format: "currency" },
        { key: "taxAmount", label: "Consumer Use Tax Owed", format: "currency", highlight: true },
        { key: "totalPrice", label: "Total Cost (Price + Use Tax)", format: "currency" },
      ],
      instructions:
        "\"Consumer\" use tax specifically covers personal (non-business) purchases where sales tax wasn't " +
        "collected — as opposed to a business's use tax obligations on its own purchases. Enter the purchase " +
        "price and your state's use tax rate to see what's owed on a personal item.\n\n" +
        "Many states include a line for this on the individual income tax return specifically for online and " +
        "out-of-state purchases made during the year.",
      examples: "Example: a $1,200 out-of-state furniture purchase with no sales tax collected, in a state with a 7% use tax rate, owes $84.00 in consumer use tax.",
      assumptions:
        "Use tax rates generally match your state's sales tax rate, though this varies by state — check your " +
        "state's Department of Revenue for your exact rate and how to report it on your individual return.\n\n" +
        "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
        "advice.",
      faq: [
        {
          question: "How is consumer use tax different from business use tax?",
          answer:
            "They're the same tax concept (tax owed when sales tax wasn't collected), just reported differently: " +
            "consumers typically report it on their individual income tax return, while businesses report it " +
            "separately as part of their regular sales/use tax filings.",
        },
        {
          question: "Which purchases commonly trigger consumer use tax?",
          answer:
            "Online purchases from retailers that don't collect your state's sales tax, out-of-state furniture " +
            "or big-ticket purchases picked up in person, and mail-order purchases are the most common triggers.",
        },
      ],
    },
  ];

  const cityCounty = [
    {
      slug: "city-sales-tax-calculator",
      title: "City Sales Tax Calculator",
      description: "Combine your state and city sales tax rates into one total, then calculate the tax and final price.",
      metaTitle: "City Sales Tax Calculator — Combined State + City Rate",
      metaDescription: "Free city sales tax calculator. Combine state and city sales tax rates to find the total tax and price.",
      fields: [
        { key: "stateRate", label: "State Sales Tax Rate" },
        { key: "rateB", label: "City Sales Tax Rate" },
      ],
      instructions:
        "Many cities add their own sales tax on top of the state rate. Enter a price, your state's sales tax " +
        "rate, and your city's additional rate — this calculator combines them into one effective rate and shows " +
        "the tax amount and total price.\n\n" +
        "Look up your city's specific added rate from your state's Department of Revenue if you're not sure of " +
        "the exact figure — city rates can vary even between neighboring cities in the same state.",
      examples: "Example: a $200 purchase with a 6% state rate plus a 2.5% city rate combines to an 8.5% total, for $17.00 in tax and a $217.00 total.",
    },
    {
      slug: "county-sales-tax-calculator",
      title: "County Sales Tax Calculator",
      description: "Combine your state and county sales tax rates into one total, then calculate the tax and final price.",
      metaTitle: "County Sales Tax Calculator — Combined State + County Rate",
      metaDescription: "Free county sales tax calculator. Combine state and county sales tax rates to find the total tax and price.",
      fields: [
        { key: "stateRate", label: "State Sales Tax Rate" },
        { key: "rateB", label: "County Sales Tax Rate" },
      ],
      instructions:
        "Counties frequently add their own sales tax on top of the state rate. Enter a price, your state's sales " +
        "tax rate, and your county's additional rate — this calculator combines them into one effective rate and " +
        "shows the tax amount and total price.\n\n" +
        "Your county tax collector's office or state Department of Revenue will have your exact county rate if " +
        "you're unsure.",
      examples: "Example: a $350 purchase with a 5.5% state rate plus a 1.75% county rate combines to a 7.25% total, for $25.38 in tax and a $375.38 total.",
    },
    {
      slug: "combined-sales-tax-calculator",
      title: "Combined Sales Tax Calculator",
      description: "Combine state, county, city, and special district sales tax rates into one total tax calculation.",
      metaTitle: "Combined Sales Tax Calculator — All Rate Layers in One",
      metaDescription: "Free combined sales tax calculator. Add state, county, city, and special district rates for a full local sales tax total.",
      fields: [
        { key: "stateRate", label: "State Sales Tax Rate" },
        { key: "rateB", label: "County Sales Tax Rate" },
        { key: "rateC", label: "City Sales Tax Rate", optional: true },
        { key: "rateD", label: "Special District Sales Tax Rate", optional: true },
      ],
      instructions:
        "Some purchases stack up to four layers of sales tax: state, county, city, and special district (transit, " +
        "stadium, or other local district taxes). Enter a price and each rate layer that applies to you — leave " +
        "city or special district blank (0%) if they don't apply — and this calculator sums them into one " +
        "combined rate.\n\n" +
        "This is the most complete version of this site's sales tax calculators, for anywhere the local rate is " +
        "built from several separate pieces.",
      examples: "Example: a $400 purchase with a 6.25% state rate, 1% county rate, 1% city rate, and 0.25% special district rate combines to an 8.5% total, for $34.00 in tax and a $434.00 total.",
    },
  ];

  const generated: ToolDef[] = defs.map((d) => ({
    ...d,
    assumptions: d.assumptions ?? SALES_TAX_ASSUMPTIONS,
    faq: d.faq ?? SALES_TAX_FAQ,
  }));

  for (const cc of cityCounty) {
    generated.push({
      slug: cc.slug,
      title: cc.title,
      description: cc.description,
      metaTitle: cc.metaTitle,
      metaDescription: cc.metaDescription,
      calcInputs: [
        priceField,
        ...cc.fields.map((f) =>
          percentField(f.key, f.label, { max: 12, step: 0.05, default: 0, required: !("optional" in f && f.optional) })
        ),
      ],
      calcResult: { label: "Total Price", format: "currency" },
      calcResults: [
        { key: "combinedRatePercent", label: "Combined Sales Tax Rate", format: "percentage" },
        { key: "taxAmount", label: "Sales Tax Amount", format: "currency" },
        { key: "totalPrice", label: "Total Price (With Tax)", format: "currency", highlight: true },
      ],
      instructions: cc.instructions,
      examples: cc.examples,
      assumptions: SALES_TAX_ASSUMPTIONS,
      faq: SALES_TAX_FAQ,
    });
  }

  return generated;
}

function buildVatTools(): ToolDef[] {
  const priceField = currencyField("price", "Price", { max: 100000, step: 10 });
  const vatRateField = percentField("vatRate", "VAT Rate", { max: 27, step: 0.5, default: 20 });

  function inputs(defaultIncludesVat: 0 | 1) {
    return [
      priceField,
      vatRateField,
      {
        key: "priceIncludesVat",
        label: "This Price...",
        type: "dropdown",
        required: true,
        default: defaultIncludesVat,
        options: [
          { label: "...does NOT include VAT yet (add VAT)", value: 0 },
          { label: "...already includes VAT (extract VAT)", value: 1 },
        ],
      },
    ];
  }

  function results(highlightGross: boolean) {
    return [
      { key: "netPrice", label: "Net Price (Before VAT)", format: "currency", highlight: !highlightGross },
      { key: "vatAmount", label: "VAT Amount", format: "currency" },
      { key: "grossPrice", label: "Gross Price (With VAT)", format: "currency", highlight: highlightGross },
    ];
  }

  const VAT_ASSUMPTIONS =
    "VAT rates and rules vary by country (20% in the UK, 19% in Germany, 21% in the Netherlands, and so on, " +
    "often with reduced rates for certain goods), so this calculator asks for the rate directly rather than " +
    "assuming one country's system. Confirm your country's current standard (and any applicable reduced) VAT " +
    "rate with its tax authority for an exact figure.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice.";

  const VAT_FAQ = [
    {
      question: "Why do I have to enter the VAT rate myself?",
      answer:
        "Because VAT rates differ by country — 20% in the UK, 19% in Germany, 21% in the Netherlands, and so on, " +
        "often with reduced rates for specific goods and services. Check your country's tax authority for the " +
        "current standard rate.",
    },
    {
      question: "What's the difference between VAT-inclusive and VAT-exclusive pricing?",
      answer:
        "A VAT-exclusive price doesn't yet have VAT added (common in B2B pricing) — VAT is added afterward. A " +
        "VAT-inclusive price already has VAT built in (the norm for consumer retail pricing in most VAT " +
        "countries) — this calculator works either direction.",
    },
  ];

  const defs: (Omit<ToolDef, "assumptions" | "faq"> & { assumptions?: string; faq?: ToolDef["faq"] })[] = [
    {
      slug: "vat-calculator",
      title: "VAT Calculator",
      description: "Calculate VAT and the gross price on a purchase — enter the net price and your country's VAT rate.",
      metaTitle: "VAT Calculator — Free & Instant",
      metaDescription: "Free VAT calculator. Enter a net price and VAT rate to find the VAT amount and gross (VAT-inclusive) price.",
      calcInputs: inputs(0),
      calcResult: { label: "Gross Price", format: "currency" },
      calcResults: results(true),
      instructions:
        "Enter a net (VAT-exclusive) price and your country's VAT rate, then click Calculate. This tool adds " +
        "VAT to the net price to show the VAT amount and the gross (VAT-inclusive) price.\n\n" +
        "Works for any country's VAT system — just enter the applicable rate, whether that's the UK's 20%, " +
        "an EU country's standard or reduced rate, or any other VAT jurisdiction's rate.",
      examples: "Example: a £150 net price at the UK's 20% VAT rate adds £30.00 in VAT, for a gross price of £180.00.",
    },
    {
      slug: "vat-exclusive-calculator",
      title: "VAT Exclusive Calculator",
      description: "Add VAT to a net (VAT-exclusive) price to find the VAT amount and gross total.",
      metaTitle: "VAT Exclusive Calculator — Add VAT to a Net Price",
      metaDescription: "Free VAT exclusive calculator. Add VAT to a net price to find the VAT amount and gross (VAT-inclusive) total.",
      calcInputs: inputs(0),
      calcResult: { label: "Gross Price", format: "currency" },
      calcResults: results(true),
      instructions:
        "For a price quoted without VAT (common in B2B and wholesale pricing), enter the net price and VAT rate " +
        "to see the VAT amount and the final gross price a VAT-registered or consumer buyer would actually pay.\n\n" +
        "This is the standard forward VAT calculation — net price plus VAT equals gross price.",
      examples: "Example: a €500 net price at a 19% VAT rate adds €95.00 in VAT, for a gross price of €595.00.",
    },
    {
      slug: "output-vat-calculator",
      title: "Output VAT Calculator",
      description: "Calculate the output VAT (VAT charged on your sales) from a net sale price and VAT rate.",
      metaTitle: "Output VAT Calculator — VAT Charged on Sales",
      metaDescription: "Free output VAT calculator. Calculate output VAT charged on a sale from the net price and VAT rate.",
      calcInputs: inputs(0),
      calcResult: { label: "Output VAT", format: "currency" },
      calcResults: [
        { key: "netPrice", label: "Net Sale Price", format: "currency" },
        { key: "vatAmount", label: "Output VAT (Charged on This Sale)", format: "currency", highlight: true },
        { key: "grossPrice", label: "Gross Sale Price (Invoiced Amount)", format: "currency" },
      ],
      instructions:
        "\"Output VAT\" is the VAT a VAT-registered business charges its customers on sales — the VAT it collects " +
        "on behalf of the tax authority. Enter your net sale price and VAT rate to calculate the output VAT for " +
        "that sale and the total (gross) amount to invoice.\n\n" +
        "Pair this with the Input VAT Calculator on this site, then the VAT Payable Calculator to work out what " +
        "you actually owe the tax authority for a period (output VAT minus input VAT).",
      examples: "Example: a £2,000 net sale at a 20% VAT rate has £400.00 in output VAT, for a £2,400.00 gross invoice.",
    },
    {
      slug: "reverse-vat-calculator",
      title: "Reverse VAT Calculator",
      description: "Work backward from a VAT-inclusive (gross) price to find the net price and the exact VAT amount.",
      metaTitle: "Reverse VAT Calculator — Extract VAT From a Total",
      metaDescription: "Free reverse VAT calculator. Enter a gross price and VAT rate to find the net price and VAT amount.",
      calcInputs: inputs(1),
      calcResult: { label: "Net Price", format: "currency" },
      calcResults: results(false),
      instructions:
        "Have a gross (VAT-inclusive) price and need to know the net amount and the VAT portion? Enter the gross " +
        "price and VAT rate, and this calculator extracts the VAT to show you the underlying net price.\n\n" +
        "Useful for bookkeeping, reclaiming input VAT, or working out an item's true pre-VAT cost from a receipt " +
        "that only shows the final price.",
      examples: "Example: a €119 gross price at a 19% VAT rate breaks down to a €100.00 net price and €19.00 in VAT.",
    },
    {
      slug: "vat-inclusive-calculator",
      title: "VAT Inclusive Calculator",
      description: "Break a VAT-inclusive price down into its net amount and the VAT portion.",
      metaTitle: "VAT Inclusive Calculator — Break Down a Gross Price",
      metaDescription: "Free VAT inclusive calculator. Break a VAT-inclusive price into its net amount and the VAT portion.",
      calcInputs: inputs(1),
      calcResult: { label: "Net Price", format: "currency" },
      calcResults: results(false),
      instructions:
        "When a price already includes VAT (the standard for consumer retail pricing in most VAT countries), " +
        "enter that gross price and the VAT rate to see the breakdown: the net price and the VAT amount baked " +
        "into it.\n\n" +
        "This is the same math as extracting VAT from a gross total — useful whenever you're given a final price " +
        "and need to see what's included.",
      examples: "Example: a £96 VAT-inclusive price at a 20% VAT rate breaks down to an £80.00 net price and £16.00 in VAT.",
    },
    {
      slug: "input-vat-calculator",
      title: "Input VAT Calculator",
      description: "Calculate the input VAT (VAT paid on your purchases) from a gross purchase price and VAT rate.",
      metaTitle: "Input VAT Calculator — VAT Paid on Purchases",
      metaDescription: "Free input VAT calculator. Calculate input VAT paid on a purchase from the gross price and VAT rate — reclaimable for VAT-registered businesses.",
      calcInputs: inputs(1),
      calcResult: { label: "Input VAT", format: "currency" },
      calcResults: [
        { key: "netPrice", label: "Net Purchase Price", format: "currency" },
        { key: "vatAmount", label: "Input VAT (Paid on This Purchase)", format: "currency", highlight: true },
        { key: "grossPrice", label: "Gross Purchase Price (What You Paid)", format: "currency" },
      ],
      instructions:
        "\"Input VAT\" is the VAT a business pays on its own purchases — which a VAT-registered business can " +
        "generally reclaim against the output VAT it charges customers. Enter the gross (VAT-inclusive) purchase " +
        "price and VAT rate to extract the input VAT amount and the underlying net cost.\n\n" +
        "Pair this with the Output VAT Calculator on this site, then the VAT Payable Calculator to work out your " +
        "net VAT position for a period.",
      examples: "Example: a £1,200 gross purchase at a 20% VAT rate has £200.00 in input VAT, on a £1,000.00 net cost.",
    },
    {
      slug: "vat-payable-calculator",
      title: "VAT Payable Calculator",
      description: "Calculate VAT payable to the tax authority — output VAT collected on sales minus input VAT paid on purchases.",
      metaTitle: "VAT Payable Calculator — Net VAT Owed or Refund Due",
      metaDescription: "Free VAT payable calculator. Find your net VAT owed (or refund due) from output VAT collected minus input VAT paid.",
      calcInputs: [
        currencyField("outputVat", "Output VAT (Collected on Sales)", { max: 500000, step: 100 }),
        currencyField("inputVat", "Input VAT (Paid on Purchases)", { max: 500000, step: 100 }),
      ],
      calcResult: { label: "VAT Payable", format: "currency" },
      calcResults: [
        { key: "outputVat", label: "Output VAT (Collected)", format: "currency" },
        { key: "inputVat", label: "Input VAT (Paid, Reclaimable)", format: "currency" },
        { key: "vatPayable", label: "VAT Payable to Tax Authority", format: "currency", highlight: true },
        { key: "vatRefundDue", label: "VAT Refund Due (If Input Exceeds Output)", format: "currency", highlight: true },
      ],
      instructions:
        "For a VAT-registered business, the amount owed to the tax authority each period is simply the VAT " +
        "collected from customers (output VAT) minus the VAT already paid on business purchases (input VAT). " +
        "Enter both figures — from the Output VAT and Input VAT Calculators on this site, or straight from your " +
        "own sales and purchase records — to see your net position.\n\n" +
        "If input VAT exceeds output VAT for the period (common for a business making large capital purchases), " +
        "the result shows a refund due instead of an amount owed.",
      examples: "Example: a business with £8,000 in output VAT collected and £5,500 in input VAT paid this period owes £2,500.00 in VAT payable, with no refund due.",
      assumptions: VAT_ASSUMPTIONS,
      faq: [
        {
          question: "What if my input VAT is higher than my output VAT?",
          answer:
            "Then you're due a VAT refund rather than owing anything — this is common for businesses with large " +
            "purchases (equipment, inventory buildup) in a given period. This calculator shows the refund amount " +
            "when that happens.",
        },
        ...VAT_FAQ.slice(0, 1),
      ],
    },
    {
      slug: "vat-refund-calculator",
      title: "VAT Refund Calculator",
      description: "Estimate your tourist VAT refund on a purchase, after the refund service's handling fee.",
      metaTitle: "VAT Refund Calculator — Tourist Tax-Free Shopping",
      metaDescription: "Free VAT refund calculator for tourists. Estimate your net VAT refund on a purchase after the refund service's handling fee.",
      calcInputs: [
        currencyField("grossPurchaseAmount", "Purchase Amount (VAT Included)", { max: 50000, step: 10 }),
        vatRateField,
        percentField("refundServiceFee", "Refund Service Handling Fee", { max: 50, step: 1, default: 15, required: false }),
      ],
      calcResult: { label: "Net Refund", format: "currency" },
      calcResults: [
        { key: "vatAmount", label: "Total VAT Included in Purchase", format: "currency" },
        { key: "serviceFeeDeducted", label: "Refund Service Handling Fee", format: "currency" },
        { key: "netRefund", label: "Net Refund You'll Receive", format: "currency", highlight: true },
      ],
      instructions:
        "Many countries let visiting tourists reclaim VAT paid on purchases they're taking home, but the refund " +
        "services that process this (airport kiosks, in-store refund partners) typically deduct a handling fee " +
        "before paying out. Enter your purchase amount (VAT included), the VAT rate, and the refund service's " +
        "fee percentage (often 10–20%, check your specific refund provider) to see your actual net refund.\n\n" +
        "This is meaningfully less than the full VAT amount once the handling fee is factored in — a common " +
        "surprise for first-time tax-free shoppers expecting the full VAT back.",
      examples: "Example: a €1,000 purchase at a 20% VAT rate includes €166.67 in VAT; with a 15% refund service fee, the net refund comes to about €141.67.",
      assumptions:
        VAT_ASSUMPTIONS +
        "\n\nRefund service fees vary significantly by provider and country — this calculator uses whatever fee " +
        "percentage you enter, so check your specific refund service's published rate for an accurate result. " +
        "Some countries also have minimum purchase thresholds to qualify for a VAT refund at all, which this " +
        "calculator doesn't check.",
      faq: [
        {
          question: "Why don't I get the full VAT amount back?",
          answer:
            "Tourist VAT refund services (airport kiosks, in-store partners) charge a handling fee for processing " +
            "the refund — commonly 10–20% of the VAT amount — which is deducted before you receive your payout.",
        },
        {
          question: "Is there a minimum purchase amount to qualify for a VAT refund?",
          answer:
            "Often yes — many countries set a minimum spend per store or per receipt to qualify for tourist VAT " +
            "refunds. This varies by country, so check the specific requirements before shopping if a refund is " +
            "part of your plan.",
        },
      ],
    },
    {
      slug: "vat-rate-calculator",
      title: "VAT Rate Calculator",
      description: "Work out the effective VAT rate applied to a purchase from its net and gross prices.",
      metaTitle: "VAT Rate Calculator — Find the Rate From Two Prices",
      metaDescription: "Free VAT rate calculator. Find the effective VAT rate applied to a purchase from its net and gross prices.",
      calcInputs: [
        currencyField("netPrice", "Price Before VAT", { max: 100000, step: 10 }),
        currencyField("grossPrice", "Price After VAT", { max: 100000, step: 10 }),
      ],
      calcResult: { label: "Effective VAT Rate", format: "percentage" },
      calcResults: [
        { key: "vatAmount", label: "VAT Amount", format: "currency" },
        { key: "effectiveVatRate", label: "Effective VAT Rate", format: "percentage", highlight: true },
      ],
      instructions:
        "If you know both the net (before VAT) and gross (after VAT) price of something but not the rate itself, " +
        "enter both prices and this calculator works out the exact VAT rate that was applied.\n\n" +
        "Useful for figuring out which country's rate (or which reduced-rate category) applied to a purchase " +
        "when it isn't stated directly on a receipt or invoice.",
      examples: "Example: a net price of $200 and a gross price of $242 reflects a 21% effective VAT rate, with $42.00 in VAT.",
      assumptions: VAT_ASSUMPTIONS,
      faq: VAT_FAQ,
    },
    {
      slug: "vat-registration-threshold-calculator",
      title: "VAT Registration Threshold Calculator",
      description: "Check whether your annual taxable turnover requires VAT registration, based on your country's threshold.",
      metaTitle: "VAT Registration Threshold Calculator — Do You Need to Register?",
      metaDescription: "Free VAT registration threshold calculator. Check if your business turnover requires VAT registration based on your country's threshold.",
      calcInputs: [
        currencyField("annualTaxableTurnover", "Your Annual Taxable Turnover", { max: 5000000, step: 1000 }),
        currencyField("registrationThreshold", "Your Country's VAT Registration Threshold", { max: 500000, step: 1000 }),
      ],
      calcResult: { label: "Registration Required (1 = Yes, 0 = No)", format: "number" },
      calcResults: [
        { key: "mustRegister", label: "Registration Required? (1 = Yes, 0 = No)", format: "number", highlight: true },
        { key: "amountOverThreshold", label: "Amount Over the Threshold", format: "currency" },
        { key: "amountUntilThreshold", label: "Amount Until You'd Hit the Threshold", format: "currency" },
      ],
      instructions:
        "Most countries require a business to register for VAT once its taxable turnover crosses a threshold — " +
        "but that threshold varies enormously by country (the UK's is very different from most EU countries', " +
        "for example), so enter your own country's current threshold along with your annual taxable turnover to " +
        "check where you stand.\n\n" +
        "The result shows whether you've crossed the threshold and by how much, or how much more turnover you " +
        "could have before you would.",
      examples: "Example: a business with £95,000 in annual taxable turnover against a £90,000 threshold has crossed it by £5,000 and would need to register.",
      assumptions:
        VAT_ASSUMPTIONS +
        "\n\nVAT registration rules can involve more than a simple turnover threshold (rolling 12-month tests, " +
        "voluntary registration below the threshold, different rules for non-resident sellers) — this calculator " +
        "checks only the basic threshold comparison, so confirm the full requirements with your country's tax " +
        "authority.",
      faq: [
        {
          question: "What happens if I go over the VAT registration threshold?",
          answer:
            "You're generally required to register for VAT with your country's tax authority, after which you " +
            "must charge VAT on your sales (output VAT) and can reclaim VAT on your business purchases (input " +
            "VAT). Deadlines and exact obligations vary by country.",
        },
        {
          question: "Can I register for VAT voluntarily before reaching the threshold?",
          answer:
            "In many countries, yes — voluntary registration below the threshold can make sense if you want to " +
            "reclaim input VAT on business purchases, though it also means charging VAT on your own sales. Check " +
            "your country's specific rules.",
        },
      ],
    },
  ];

  return defs.map((d) => ({
    ...d,
    assumptions: d.assumptions ?? VAT_ASSUMPTIONS,
    faq: d.faq ?? VAT_FAQ,
  }));
}

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
        data: {
          ...toolContent,
          seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } },
        },
      });
      updated++;
    } else {
      await prisma.tool.create({
        data: {
          slug: def.slug,
          status: "draft",
          ...toolContent,
          seoMeta: { create: seoMetaContent },
        },
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
