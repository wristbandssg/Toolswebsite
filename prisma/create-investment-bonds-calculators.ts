// One-time (but safe to re-run) batch setup script: creates the Bond tools
// (7) of the Interest Calculators expansion, filed under Investment Calculators.
// See src/lib/calc-engine-investment-bonds.ts for the math and
// src/lib/calc-engine-interest-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-investment-bonds-calculators.ts
// or
//   npm run db:create-investment-bonds-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Re-pointed 5 Oct 2026: Investment Calculators was split into 5 sub-categories
// (see organize-tool-categories.ts); this script creates its sub-category if missing.
const PARENT_CATEGORY_SLUG = "investment-calculators";
const CATEGORY = { name: "Bond & Fixed Income Calculators", slug: "bond-fixed-income-calculators" };

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
  "Bond prices, yields and Treasury rates change — check current quotes and TreasuryDirect before you " +
  "invest.";

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
    slug: "bond-interest-calculator",
    title: "Bond Interest Calculator",
    description: "Calculate the interest (coupon) a bond pays: each payment, per year and to maturity, plus the current yield based on the price you paid.",
    metaTitle: "Bond Interest Calculator — Coupon Payments & Yield",
    metaDescription: "Free bond interest calculator. See each coupon payment, yearly and total interest to maturity, and the current yield at your purchase price.",
    calcInputs: [
      currencyField("faceValue", "Face (Par) Value", { default: 10000, max: 1000000000, step: 1000 }),
      percentField("couponPercent", "Coupon Rate", { default: 5, max: 25, step: 0.125 }),
      {
        key: "paymentsPerYear", label: "Payments per Year", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Semi-Annual (Most Bonds)", value: 2 },
          { label: "Annual", value: 1 },
          { label: "Quarterly", value: 4 },
          { label: "Monthly", value: 12 },
        ],
      },
      numberField("yearsToMaturity", "Years to Maturity", { default: 10, min: 0, max: 100, step: 0.5 }),
      percentField("pricePercent", "Price Paid (% of Face)", { default: 97, max: 200, step: 0.125 }),
    ],
    calcResult: { label: "Interest per Year", format: "currency" },
    calcResults: [
      { key: "interestPerPayment", label: "Interest per Payment", format: "currency" },
      { key: "interestPerYear", label: "Interest per Year", format: "currency", highlight: true },
      { key: "totalInterestToMaturity", label: "Total Interest to Maturity", format: "currency" },
      { key: "pricePaid", label: "Price Paid", format: "currency" },
      { key: "currentYield", label: "Current Yield", format: "percentage" },
    ],
    instructions:
      "A bond's coupon rate is fixed on its face value, so the interest in dollars never changes, whatever you paid for it. " +
      "Most US bonds pay twice a year. The current yield divides the yearly interest by the price, so it's higher when you " +
      "buy below face value.\n\n" +
      "To include the gain or loss when the bond matures at face value, use the bond yield to maturity calculator.",
    examples:
      "Example: a $10,000 bond with a 5% coupon pays $250 twice a year — $500 a " +
      "year and $5,000 over 10 years. Bought at 97% of face ($9,700), its " +
      "current yield is 5.15%.",
    assumptions:
      "Fixed-rate bond held to maturity with no default. Bonds bought between coupon dates also involve accrued interest — " +
      "see the accrued interest calculator. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is bond interest taxable?",
        answer: "Corporate bond interest is fully taxable. Treasury interest is exempt from state and local tax, and most municipal bond interest is exempt from federal tax.",
      },
    ],
  },
  {
    slug: "treasury-bill-calculator",
    title: "Treasury Bill Calculator",
    description: "Calculate a US Treasury bill's price from its discount rate, the interest you earn at maturity, and its investment yield for comparison with CDs and savings accounts.",
    metaTitle: "Treasury Bill Calculator — T-Bill Price & Yield",
    metaDescription: "Free T-bill calculator. Find a Treasury bill's price from the discount rate, the interest earned, and the investment yield to compare with CDs.",
    calcInputs: [
      currencyField("faceValue", "Face Value", { default: 10000, max: 1000000000, step: 100 }),
      percentField("discountRatePercent", "Discount Rate (High Rate at Auction)", { default: 3.9, max: 20, step: 0.005 }),
      {
        key: "days", label: "Term", type: "dropdown", required: true, default: 182,
        options: [
          { label: "4 Weeks (28 Days)", value: 28 },
          { label: "8 Weeks (56 Days)", value: 56 },
          { label: "13 Weeks (91 Days)", value: 91 },
          { label: "17 Weeks (119 Days)", value: 119 },
          { label: "26 Weeks (182 Days)", value: 182 },
          { label: "52 Weeks (364 Days)", value: 364 },
        ],
      },
    ],
    calcResult: { label: "Investment Yield", format: "percentage" },
    calcResults: [
      { key: "purchasePrice", label: "Purchase Price", format: "currency" },
      { key: "interestEarned", label: "Interest Earned at Maturity", format: "currency" },
      { key: "investmentYield", label: "Investment Yield", format: "percentage", highlight: true },
      { key: "pricePer100", label: "Price per $100", format: "number" },
    ],
    instructions:
      "T-bills don't pay interest along the way; you buy them below face value and receive the full face value at " +
      "maturity. Treasury quotes the discount rate, which uses a 360-day year and divides by face value, so it understates " +
      "your return. The investment yield (bond-equivalent yield) uses 365 days and the price you paid — use that to compare " +
      "with CDs and savings rates.\n\n" +
      "Buy at auction through TreasuryDirect or a brokerage. Results are for the discount rate you enter.",
    examples:
      "Example: a $10,000 26-week T-bill at a 3.90% discount rate costs $9,802.83 and pays " +
      "$197.17 more at maturity — an investment yield of 4.03%.",
    assumptions:
      "Held to maturity. T-bill interest is subject to federal income tax but exempt from state and local tax, which can " +
      "make it worth more than a CD at the same yield in high-tax states. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the investment yield higher than the discount rate?",
        answer: "The discount rate divides the interest by the face value and uses a 360-day year; the investment yield divides by the lower price you actually paid and uses 365 days.",
      },
    ],
  },
  {
    slug: "bond-yield-to-maturity-calculator",
    title: "Bond Yield to Maturity Calculator",
    description: "Calculate a bond's yield to maturity (YTM) — the total yearly return if you buy at today's price and hold to maturity — plus the current yield and total return.",
    metaTitle: "Yield to Maturity Calculator — Bond YTM",
    metaDescription: "Free bond yield to maturity calculator. Find a bond's YTM and current yield from its price, coupon and maturity, plus the total return if held.",
    calcInputs: [
      currencyField("price", "Bond Price", { default: 950, max: 100000000, step: 1 }),
      currencyField("faceValue", "Face (Par) Value", { default: 1000, max: 100000000, step: 100 }),
      percentField("couponPercent", "Coupon Rate", { default: 5, max: 25, step: 0.125 }),
      numberField("yearsToMaturity", "Years to Maturity", { default: 8, min: 0.25, max: 100, step: 0.25 }),
      {
        key: "paymentsPerYear", label: "Payments per Year", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Semi-Annual", value: 2 },
          { label: "Annual", value: 1 },
          { label: "Quarterly", value: 4 },
          { label: "Monthly", value: 12 },
        ],
      },
    ],
    calcResult: { label: "Yield to Maturity", format: "percentage" },
    calcResults: [
      { key: "yieldToMaturity", label: "Yield to Maturity", format: "percentage", highlight: true },
      { key: "currentYield", label: "Current Yield", format: "percentage" },
      { key: "totalCouponIncome", label: "Total Coupon Income", format: "currency" },
      { key: "gainOrLossAtMaturity", label: "Gain or Loss at Maturity", format: "currency" },
      { key: "totalReturnIfHeld", label: "Total Return If Held", format: "currency" },
    ],
    instructions:
      "Yield to maturity is the discount rate that makes the present value of all the bond's coupons and its face value " +
      "equal to its price. It combines the coupon income with the gain (if you buy below par) or loss (above par) at " +
      "maturity, so it's the best single number for comparing bonds.\n\n" +
      "Enter the price as a dollar amount for the face value shown (a quote of 95 on a $1,000 bond is $950).",
    examples:
      "Example: a $1,000 bond with a 5% coupon and 8 years left, bought for $950, has a " +
      "yield to maturity of 5.79% and a current yield of 5.26%. Held to maturity it pays " +
      "$400 of coupons plus a $50 gain.",
    assumptions:
      "Coupons are reinvested at the YTM (the standard assumption), no default, and the price excludes accrued interest. " +
      "Callable bonds also have a yield to call, which may be lower. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does a bond's price fall when yields rise?",
        answer: "Its coupon is fixed, so when new bonds pay more, the old bond's price drops until its yield matches. See the interest rate sensitivity calculator for how much.",
      },
    ],
  },
  {
    slug: "interest-rate-sensitivity-calculator",
    title: "Interest Rate Sensitivity Calculator",
    description: "Measure how much a bond's price changes when interest rates move: Macaulay and modified duration, convexity, and the new price for a rise or fall in yields.",
    metaTitle: "Interest Rate Sensitivity Calculator — Bond Duration",
    metaDescription: "Free interest rate sensitivity calculator. Find a bond's duration and convexity and how much its price changes when rates rise or fall.",
    calcInputs: [
      currencyField("faceValue", "Face (Par) Value", { default: 1000, max: 100000000, step: 100 }),
      percentField("couponPercent", "Coupon Rate", { default: 4, max: 25, step: 0.125 }),
      percentField("yieldPercent", "Current Yield to Maturity", { default: 4.5, max: 25, step: 0.05 }),
      numberField("yearsToMaturity", "Years to Maturity", { default: 10, min: 0.25, max: 100, step: 0.25 }),
      {
        key: "paymentsPerYear", label: "Payments per Year", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Semi-Annual", value: 2 },
          { label: "Annual", value: 1 },
          { label: "Quarterly", value: 4 },
          { label: "Monthly", value: 12 },
        ],
      },
      numberField("changeBps", "Yield Change (Basis Points, − for a Fall)", { default: 100, min: -1000, max: 1000, step: 25 }),
    ],
    calcResult: { label: "Price Change", format: "currency" },
    calcResults: [
      { key: "currentPrice", label: "Current Price", format: "currency" },
      { key: "macaulayDuration", label: "Macaulay Duration (Years)", format: "number" },
      { key: "modifiedDuration", label: "Modified Duration", format: "number" },
      { key: "convexity", label: "Convexity", format: "number" },
      { key: "estimatedPriceChangePercent", label: "Estimated Price Change (%)", format: "percentage" },
      { key: "newPrice", label: "New Price", format: "currency" },
      { key: "priceChange", label: "Price Change", format: "currency", highlight: true },
    ],
    instructions:
      "Duration measures interest rate risk. Modified duration is roughly the percentage a bond's price changes for a 1 " +
      "percentage point (100 basis point) move in yields — a duration of 8 means about an 8% drop if yields rise 1 point. " +
      "Convexity corrects the estimate for larger moves. Longer maturities and lower coupons mean higher duration.\n\n" +
      "Enter the bond and a yield change; the new price is recalculated exactly at the new yield.",
    examples:
      "Example: a $1,000 bond with a 4% coupon, 10 years to maturity and a 4.50% " +
      "yield is priced at $960.09, with a modified duration of 8.12. If yields rise 100 basis " +
      "points, the price falls to $885.80 — a -$74.30 change (-7.73% estimated).",
    assumptions:
      "Parallel yield change, priced on a coupon date; the same idea applies to bond funds using their stated duration. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does duration matter if I hold to maturity?",
        answer: "Less — you'll still get face value back. But duration shows how much your bond's market value (and a bond fund's price) swings meanwhile.",
      },
    ],
  },
  {
    slug: "sukuk-profit-rate-calculator",
    title: "Sukuk Profit Rate Calculator",
    description: "Calculate the profit distributions from a sukuk (Islamic bond): each payment, per year and to maturity, and the yield on the price you paid.",
    metaTitle: "Sukuk Profit Rate Calculator — Payments & Yield",
    metaDescription: "Free sukuk calculator. See the periodic profit distributions, total profit to maturity, and the yield on the price you paid for a sukuk.",
    calcInputs: [
      currencyField("faceValue", "Face (Nominal) Value", { default: 10000, max: 1000000000, step: 1000 }),
      percentField("profitRatePercent", "Expected Profit Rate", { default: 5.5, max: 25, step: 0.05 }),
      {
        key: "paymentsPerYear", label: "Distributions per Year", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Semi-Annual", value: 2 },
          { label: "Quarterly", value: 4 },
          { label: "Monthly", value: 12 },
          { label: "Annual", value: 1 },
        ],
      },
      numberField("yearsToMaturity", "Years to Maturity", { default: 5, min: 0.25, max: 50, step: 0.25 }),
      percentField("pricePercent", "Price Paid (% of Face)", { default: 99, max: 200, step: 0.125 }),
    ],
    calcResult: { label: "Yield on Price Paid", format: "percentage" },
    calcResults: [
      { key: "profitPerDistribution", label: "Profit per Distribution", format: "currency" },
      { key: "profitPerYear", label: "Profit per Year", format: "currency" },
      { key: "totalProfitToMaturity", label: "Total Profit to Maturity", format: "currency" },
      { key: "pricePaid", label: "Price Paid", format: "currency" },
      { key: "yieldOnPricePaid", label: "Yield on Price Paid", format: "percentage", highlight: true },
    ],
    instructions:
      "Sukuk are Sharia-compliant certificates giving holders a share in an underlying asset or venture. Instead of interest, " +
      "they distribute profit — rental income in ijara sukuk, or a share of business profit in mudaraba and musharaka " +
      "sukuk — usually at an expected rate paid semi-annually, with the face value returned at maturity.\n\n" +
      "Enter the sukuk's terms and the price paid; the yield includes any gain or loss at maturity.",
    examples:
      "Example: a $10,000 sukuk with a 5.50% expected profit rate distributes $275 twice a " +
      "year — $2,750 over 5 years. Bought at 99% of face, the yield on the price " +
      "paid is 5.73%.",
    assumptions:
      "Distributions are paid as expected and the face value is repaid at maturity; profit on asset-based sukuk depends on " +
      "the underlying assets' performance. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is a sukuk different from a conventional bond?",
        answer: "A bond is a debt paying interest; a sukuk represents ownership in assets and pays from the income they generate. In practice, many sukuk behave much like bonds for investors.",
      },
    ],
  },
  {
    slug: "series-i-bond-calculator",
    title: "Series I Bond Calculator",
    description: "Estimate the value of a US Series I savings bond: the composite rate from the fixed rate and inflation, interest earned, and the 3-month penalty if you cash out before 5 years.",
    metaTitle: "I Bond Calculator — Composite Rate & Value",
    metaDescription: "Free I bond calculator. Find the composite rate from the fixed rate and inflation, your bond's value, interest earned and any early penalty.",
    calcInputs: [
      currencyField("amount", "Purchase Amount", { default: 10000, max: 15000, step: 25 }),
      percentField("fixedRatePercent", "Fixed Rate", { default: 0.9, max: 5, step: 0.05 }),
      percentField("semiannualInflationPercent", "Semiannual Inflation Rate", { default: 1.5, min: -5, max: 10, step: 0.01 }),
      numberField("yearsHeld", "Years Held", { default: 5, min: 0, max: 30, step: 0.5 }),
    ],
    calcResult: { label: "Value If Cashed Now", format: "currency" },
    calcResults: [
      { key: "compositeRate", label: "Composite Rate", format: "percentage" },
      { key: "bondValue", label: "Bond Value", format: "currency" },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
      { key: "earlyRedemptionPenalty", label: "Early Redemption Penalty", format: "currency" },
      { key: "valueIfCashedNow", label: "Value If Cashed Now", format: "currency", highlight: true },
    ],
    instructions:
      "I bonds earn a composite rate: a fixed rate that lasts the life of the bond plus an inflation rate reset every May " +
      "and November. Composite = fixed + (2 × semiannual inflation) + (fixed × semiannual inflation); it can't go below " +
      "zero. Look up the current rates on TreasuryDirect.\n\n" +
      "You can buy up to $10,000 a year electronically (plus up to $5,000 in paper bonds from a tax refund). You can't cash " +
      "out in the first year, and before 5 years you lose the last 3 months of interest. I bonds earn interest for 30 years.",
    examples:
      "Example: $10,000 of I bonds with a 0.90% fixed rate and 1.50% semiannual inflation " +
      "earn a 3.91% composite rate. After 5 years the bond is worth $12,138.35 — $2,138.35 of " +
      "interest.",
    assumptions:
      "The inflation rate stays the same for the whole period (it changes every 6 months) and interest compounds " +
      "semiannually. Interest is exempt from state and local tax and can be federal tax-free for qualified education costs. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When should I cash an I bond?",
        answer: "After 5 years there's no penalty. If its fixed rate is low and other safe investments pay more after tax, cashing out may make sense; bonds with high fixed rates are usually worth keeping.",
      },
    ],
  },
  {
    slug: "series-ee-bond-calculator",
    title: "Series EE Bond Calculator",
    description: "Estimate the value of a US Series EE savings bond: growth at its fixed rate, Treasury's guarantee to double in 20 years, and the penalty for cashing out before 5 years.",
    metaTitle: "EE Bond Calculator — Savings Bond Value",
    metaDescription: "Free savings bond calculator for Series EE bonds. See the bond's value, interest earned and its guaranteed doubling after 20 years.",
    calcInputs: [
      currencyField("amount", "Purchase Amount", { default: 10000, max: 10000, step: 25 }),
      percentField("fixedRatePercent", "Fixed Rate", { default: 2.5, max: 10, step: 0.05 }),
      numberField("yearsHeld", "Years Held", { default: 20, min: 0, max: 30, step: 0.5 }),
    ],
    calcResult: { label: "Value If Cashed Now", format: "currency" },
    calcResults: [
      { key: "bondValue", label: "Bond Value", format: "currency" },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
      { key: "earlyRedemptionPenalty", label: "Early Redemption Penalty", format: "currency" },
      { key: "valueIfCashedNow", label: "Value If Cashed Now", format: "currency", highlight: true },
      { key: "valueAt20Years", label: "Value at 20 Years (Guaranteed Double)", format: "currency" },
      { key: "rateIfHeld20Years", label: "Effective Rate If Held 20 Years", format: "percentage" },
    ],
    instructions:
      "Series EE bonds earn a fixed rate set when you buy, and Treasury guarantees they'll be worth at least double the " +
      "purchase price after 20 years — about 3.5% a year. If the fixed rate is lower, Treasury makes up the difference at " +
      "the 20-year mark, so most of the value comes from holding the full 20 years. They keep earning for 30 years.\n\n" +
      "Buy up to $10,000 a year on TreasuryDirect. The same early-cash-out rules as I bonds apply. For old paper bonds, " +
      "use Treasury's Savings Bond Calculator with the serial number.",
    examples:
      "Example: $10,000 of EE bonds at a 2.50% fixed rate held 20 years are guaranteed to reach " +
      "$20,000 — $10,000 of interest, an effective 3.53% a year.",
    assumptions:
      "Interest compounds semiannually at the fixed rate. Interest is exempt from state and local tax and can be federal " +
      "tax-free for qualified education costs. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I keep an EE bond for the full 20 years?",
        answer: "Usually, if you can. Cashing out before 20 years forfeits the doubling, leaving only the low fixed rate.",
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
