// One-time (but safe to re-run) batch setup script: creates the Bond Type tools
// (6) of the Investment Calculators expansion, filed under Investment Calculators > Bond & Fixed Income Calculators.
// See src/lib/calc-engine-investment-bond-types.ts for the math and
// src/lib/calc-engine-investment-stocks.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-investment-bond-types-calculators.ts
// or
//   npm run db:create-investment-bond-types-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

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
  "Bond prices and yields change daily — check current quotes and the bond's offering documents.";

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
    slug: "municipal-bond-investment-calculator",
    title: "Municipal Bond Investment Calculator",
    description: "Find a municipal bond's tax-equivalent yield and compare its after-tax income with a taxable bond, for in-state or out-of-state munis.",
    metaTitle: "Municipal Bond Calculator — Tax-Equivalent Yield",
    metaDescription: "Free municipal bond calculator. See the tax-equivalent yield of a muni and compare its after-tax income with a taxable bond.",
    calcInputs: [
      currencyField("investment", "Amount Invested", { default: 50000, max: 1000000000, step: 1000 }),
      percentField("muniYieldPercent", "Municipal Bond Yield", { default: 3.5, max: 15, step: 0.05 }),
      percentField("federalRatePercent", "Federal Tax Bracket", { default: 32, max: 50, step: 1 }),
      percentField("stateRatePercent", "State Tax Rate", { default: 5, max: 15, step: 0.25, required: false }),
      {
        key: "inState", label: "Issued in Your State?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes — Free of Federal and State Tax", value: 1 },
          { label: "No — Free of Federal Tax Only", value: 0 },
        ],
      },
      percentField("taxableYieldPercent", "Taxable Bond Yield (for Comparison)", { default: 5, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "Tax-Equivalent Yield", format: "percentage" },
    calcResults: [
      { key: "taxEquivalentYield", label: "Tax-Equivalent Yield", format: "percentage", highlight: true },
      { key: "yearlyIncome", label: "Yearly Interest", format: "currency" },
      { key: "afterTaxIncomeMuni", label: "After-Tax Income (Muni)", format: "currency" },
      { key: "afterTaxIncomeTaxableBond", label: "After-Tax Income (Taxable Bond)", format: "currency" },
      { key: "muniAdvantagePerYear", label: "Muni Advantage per Year", format: "currency" },
    ],
    instructions:
      "Interest on most municipal bonds is free of federal income tax, and of state tax too if you live in the issuing " +
      "state. The tax-equivalent yield is what a taxable bond would have to pay to match the muni after tax — the higher " +
      "your bracket, the more munis are worth.\n\n" +
      "Enter the muni's yield, your tax rates and a taxable yield to compare. A negative advantage means the taxable bond " +
      "pays more after tax.",
    examples:
      "Example: a 3.50% in-state muni is worth the same as a 5.42% taxable bond for someone in the " +
      "32% bracket with 5% state tax. On $50,000, it pays $1,750 after " +
      "tax versus $1,615 from a 5% taxable bond — $135 more.",
    assumptions:
      "Bought at par; the 3.8% net investment income tax and AMT on private-activity munis are not included. Muni interest " +
      "can make more of your Social Security taxable. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are munis worth it in a low tax bracket?",
        answer: "Usually not — in the 10–12% brackets a taxable bond or CD often pays more after tax. Munis shine for high earners in high-tax states.",
      },
    ],
  },
  {
    slug: "zero-coupon-bond-investment-calculator",
    title: "Zero-Coupon Bond Investment Calculator",
    description: "Calculate a zero-coupon bond's price from its yield, the interest it accrues to maturity, and the yearly \"phantom\" income you're taxed on in a taxable account.",
    metaTitle: "Zero-Coupon Bond Calculator — Price & Phantom Income",
    metaDescription: "Free zero-coupon bond calculator. Find the price from the yield, the total interest at maturity, and the taxable phantom income each year.",
    calcInputs: [
      currencyField("faceValue", "Face Value at Maturity", { default: 10000, max: 1000000000, step: 1000 }),
      percentField("yieldPercent", "Yield to Maturity", { default: 4.5, max: 20, step: 0.05 }),
      numberField("years", "Years to Maturity", { default: 10, min: 0, max: 40, step: 0.5 }),
      percentField("taxRatePercent", "Your Tax Rate", { default: 24, max: 50, step: 1, required: false }),
    ],
    calcResult: { label: "Purchase Price", format: "currency" },
    calcResults: [
      { key: "purchasePrice", label: "Purchase Price", format: "currency", highlight: true },
      { key: "priceAsPercentOfFace", label: "Price as % of Face", format: "percentage" },
      { key: "totalInterest", label: "Total Interest to Maturity", format: "currency" },
      { key: "firstYearPhantomIncome", label: "First-Year Phantom Income", format: "currency" },
      { key: "firstYearTaxOnPhantomIncome", label: "First-Year Tax on Phantom Income", format: "currency" },
    ],
    instructions:
      "Zero-coupon bonds — such as Treasury STRIPS — pay no interest along the way. You buy them at a deep discount and get " +
      "the full face value at maturity; the difference is your interest. They lock in a yield with no reinvestment risk, " +
      "but their prices swing more than regular bonds when rates move.\n\n" +
      "The IRS taxes the yearly accretion (original issue discount) as income even though you receive no cash, so many " +
      "investors hold zeros in IRAs.",
    examples:
      "Example: a $10,000 zero-coupon bond maturing in 10 years at a 4.50% yield costs $6,408.16 " +
      "(64.08% of face) and earns $3,591.84 by maturity. In a taxable account, the first year adds " +
      "$291.61 of phantom income — about $69.99 of tax.",
    assumptions:
      "Semiannual compounding (the market convention); phantom income grows each year as the bond accretes. Zero-coupon " +
      "munis' accretion is generally tax-free. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What are zero-coupon bonds good for?",
        answer: "Funding a known future cost — tuition, a retirement year — because you know exactly what you'll have on the maturity date.",
      },
    ],
  },
  {
    slug: "convertible-bond-investment-calculator",
    title: "Convertible Bond Investment Calculator",
    description: "Analyze a convertible bond: conversion price and value, the conversion premium you're paying, the stock price to break even, and how long the income advantage takes to repay the premium.",
    metaTitle: "Convertible Bond Calculator — Conversion Value & Premium",
    metaDescription: "Free convertible bond calculator. Find the conversion price and value, conversion premium, breakeven stock price and premium payback period.",
    calcInputs: [
      currencyField("faceValue", "Face Value", { default: 1000, max: 1000000, step: 100 }),
      currencyField("bondPrice", "Bond Price", { default: 1050, max: 10000000, step: 1 }),
      numberField("conversionRatio", "Conversion Ratio (Shares per Bond)", { default: 20, min: 0, max: 100000, step: 0.01 }),
      currencyField("stockPrice", "Current Stock Price", { default: 45, max: 1000000, step: 0.5 }),
      percentField("couponPercent", "Coupon Rate", { default: 3, max: 20, step: 0.05 }),
      percentField("dividendYieldPercent", "Stock Dividend Yield", { default: 1, max: 20, step: 0.1, required: false }),
    ],
    calcResult: { label: "Conversion Premium", format: "percentage" },
    calcResults: [
      { key: "conversionPrice", label: "Conversion Price per Share", format: "currency" },
      { key: "conversionValue", label: "Conversion Value", format: "currency" },
      { key: "conversionPremium", label: "Conversion Premium ($)", format: "currency" },
      { key: "conversionPremiumPercent", label: "Conversion Premium", format: "percentage", highlight: true },
      { key: "stockPriceToBreakEven", label: "Stock Price to Break Even", format: "currency" },
      { key: "premiumPaybackYears", label: "Years to Repay the Premium From Income", format: "number" },
    ],
    instructions:
      "A convertible bond pays interest like a bond but can be swapped for a fixed number of shares (the conversion ratio). " +
      "Its conversion value is what those shares are worth now; the conversion premium is how much more you pay for the " +
      "bond than for the shares. In return you get the coupon and a bond floor if the stock falls.\n\n" +
      "The payback period compares the premium with the bond's extra income over the stock's dividends.",
    examples:
      "Example: a $1,000 bond convertible into 20 shares has a $50 conversion price. With the " +
      "stock at $45, the conversion value is $900, so paying $1,050 is a 16.67% " +
      "premium. The stock must reach $52.50 to break even; the coupon repays the premium in about " +
      "7.14 years.",
    assumptions:
      "Ignores accrued interest, call provisions and credit risk. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do companies issue convertibles?",
        answer: "They pay a lower coupon than ordinary bonds because investors value the conversion option — and conversion can turn the debt into equity later.",
      },
    ],
  },
  {
    slug: "callable-bond-investment-calculator",
    title: "Callable Bond Investment Calculator",
    description: "Calculate yield to call and yield to maturity for a callable bond — or yield to put for a puttable bond — and see which yield you can really count on.",
    metaTitle: "Callable Bond Calculator — Yield to Call & Yield to Worst",
    metaDescription: "Free callable bond calculator. Find yield to call, yield to maturity and yield to worst — or yield to put for a puttable bond.",
    calcInputs: [
      {
        key: "bondType", label: "Bond Type", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Callable (Issuer Can Redeem Early)", value: 1 },
          { label: "Puttable (You Can Sell Back Early)", value: 2 },
        ],
      },
      currencyField("price", "Bond Price", { default: 1030, max: 10000000, step: 1 }),
      currencyField("faceValue", "Face Value", { default: 1000, max: 10000000, step: 100 }),
      percentField("couponPercent", "Coupon Rate", { default: 6, max: 25, step: 0.125 }),
      numberField("yearsToMaturity", "Years to Maturity", { default: 10, min: 0.5, max: 100, step: 0.5 }),
      currencyField("exercisePrice", "Call or Put Price", { default: 1000, max: 10000000, step: 1 }),
      numberField("yearsToExercise", "Years to First Call or Put Date", { default: 3, min: 0.5, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Yield You Can Count On", format: "percentage" },
    calcResults: [
      { key: "yieldToMaturity", label: "Yield to Maturity", format: "percentage" },
      { key: "yieldToCallOrPut", label: "Yield to Call or Put", format: "percentage" },
      { key: "relevantYield", label: "Yield You Can Count On", format: "percentage", highlight: true },
      { key: "currentYield", label: "Current Yield", format: "percentage" },
    ],
    instructions:
      "A callable bond can be redeemed by the issuer at the call price — usually when rates fall, ending your high coupon " +
      "early. So the yield you can count on is the lower of yield to call and yield to maturity (\"yield to worst\"). A " +
      "puttable bond gives you the right to sell it back at the put price, so you get the better of the two.\n\n" +
      "Bonds trading above par are especially likely to be called.",
    examples:
      "Example: a 6% callable bond bought at $1,030 yields 5.60% if held 10 years, " +
      "but only 4.91% if called at $1,000 in 3 years — so plan on 4.91%.",
    assumptions:
      "Semiannual coupons; uses the first call or put date only. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does a callable bond pay more?",
        answer: "Investors demand extra yield for giving the issuer the option to refinance when rates drop — the risk that you'll have to reinvest at lower rates.",
      },
    ],
  },
  {
    slug: "tips-investment-calculator",
    title: "TIPS Investment Calculator",
    description: "Project a Treasury Inflation-Protected Security (TIPS): the inflation-adjusted principal, coupons on the rising principal, total return, and the tax on phantom inflation income.",
    metaTitle: "TIPS Calculator — Inflation-Adjusted Principal & Return",
    metaDescription: "Free TIPS calculator. See your inflation-adjusted principal, coupons, total return and the tax on yearly inflation adjustments.",
    calcInputs: [
      currencyField("investment", "Amount Invested (at Par)", { default: 10000, max: 1000000000, step: 100 }),
      percentField("realCouponPercent", "Real Yield / Coupon", { default: 1.8, max: 10, step: 0.05 }),
      percentField("inflationPercent", "Expected Inflation per Year", { default: 2.5, min: -5, max: 20, step: 0.1 }),
      numberField("years", "Years to Maturity", { default: 10, min: 0, max: 30, step: 1 }),
      percentField("taxRatePercent", "Federal Tax Rate", { default: 24, max: 50, step: 1, required: false }),
    ],
    calcResult: { label: "Total Return", format: "currency" },
    calcResults: [
      { key: "adjustedPrincipal", label: "Inflation-Adjusted Principal", format: "currency" },
      { key: "principalRepaid", label: "Principal Repaid at Maturity", format: "currency" },
      { key: "totalCoupons", label: "Total Coupons", format: "currency" },
      { key: "totalReturn", label: "Total Return", format: "currency", highlight: true },
      { key: "approximateNominalYield", label: "Approximate Nominal Yield", format: "percentage" },
      { key: "firstYearPhantomIncome", label: "First-Year Inflation Adjustment (Taxable)", format: "currency" },
      { key: "firstYearTaxOnPhantomIncome", label: "First-Year Tax on It", format: "currency" },
    ],
    instructions:
      "TIPS protect against inflation: the principal rises with the Consumer Price Index, and the fixed real coupon is " +
      "paid on that growing principal every six months. At maturity you get the adjusted principal or the original amount, " +
      "whichever is higher.\n\n" +
      "Compare the real yield with a regular Treasury's yield: the difference is the breakeven inflation rate. In a taxable " +
      "account, each year's principal increase is taxed as income although you don't receive it until maturity.",
    examples:
      "Example: $10,000 in 10-year TIPS with a 1.80% real yield and 2.50% inflation grows " +
      "to $12,800.85 of principal and pays $2,054.34 of coupons — a $4,855.19 return, about " +
      "4.34% a year in nominal terms.",
    assumptions:
      "Bought at par; steady inflation. TIPS interest and adjustments are exempt from state and local tax. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "TIPS or I bonds?",
        answer: "I bonds have a $10,000 yearly limit and no price swings; TIPS have no limit and trade daily, so their prices can fall before maturity.",
      },
    ],
  },
  {
    slug: "structured-note-investment-calculator",
    title: "Structured Note Investment Calculator",
    description: "See what a buffered or capped structured note pays at maturity for any index return — participation, cap and downside buffer — compared with owning the index.",
    metaTitle: "Structured Note Calculator — Cap, Buffer & Payoff",
    metaDescription: "Free structured note calculator. See the payoff at maturity with participation, cap and downside buffer, compared with owning the index.",
    calcInputs: [
      currencyField("investment", "Amount Invested", { default: 10000, max: 1000000000, step: 1000 }),
      percentField("indexReturnPercent", "Index Return Over the Term", { default: 25, min: -100, max: 300, step: 1 }),
      percentField("participationPercent", "Upside Participation", { default: 100, max: 300, step: 5 }),
      percentField("capPercent", "Maximum Return (Cap)", { default: 40, max: 300, step: 1 }),
      percentField("bufferPercent", "Downside Buffer", { default: 10, max: 100, step: 1 }),
      numberField("termYears", "Term (Years)", { default: 5, min: 0.25, max: 20, step: 0.25 }),
      percentField("dividendYieldPercent", "Index Dividend Yield (Given Up)", { default: 1.5, max: 10, step: 0.1, required: false }),
    ],
    calcResult: { label: "Value at Maturity", format: "currency" },
    calcResults: [
      { key: "noteReturn", label: "Note Return", format: "percentage" },
      { key: "valueAtMaturity", label: "Value at Maturity", format: "currency", highlight: true },
      { key: "annualizedReturn", label: "Annualized Return", format: "percentage" },
      { key: "indexTotalReturnWithDividends", label: "Index Return With Dividends", format: "percentage" },
      { key: "noteVsIndex", label: "Note vs Owning the Index", format: "currency" },
    ],
    instructions:
      "Structured notes are bank-issued debt whose payoff is linked to an index. A typical buffered note gives you the " +
      "index's gain (times a participation rate) up to a cap, absorbs the first part of any loss (the buffer), and passes " +
      "on losses beyond it. You don't receive the index's dividends, and you depend on the issuing bank's credit.\n\n" +
      "Try several index returns — up, flat and down — to see where the note helps and where it hurts.",
    examples:
      "Example: if the index rises 25% over 5 years, a note with 100% participation, " +
      "a 40% cap and a 10% buffer returns 25%, so $10,000 becomes $12,500. " +
      "Owning the index with dividends would have returned 34.66%.",
    assumptions:
      "Held to maturity; the issuer doesn't default. Notes are hard to sell early and often carry embedded fees. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are structured notes FDIC-insured?",
        answer: "No (except market-linked CDs). They're unsecured debt of the issuing bank — if it fails, you could lose your money regardless of the index.",
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
