// One-time (but safe to re-run) batch setup script: creates the 7 tools
// of the "Retirement Calculators" sub-batch G (Annuities & Portfolio). Part of the
// Retirement Calculators tool-list build-out: 76 tools in the source list, 8
// skipped as duplicates (retirement-calculator, 401k-calculator,
// pension-calculator, social-security-calculator, retirement-withdrawal-
// calculator, ira-calculator and roth-ira-calculator already exist in
// create-finance-retirement-calculators.ts; retirement-savings-goal-
// calculator in create-savings-goals-calculators.ts, now filed here too), 68
// built across 7 sub-batches, all filed under Finance Calculators >
// Retirement Calculators:
//   create-retirement-planning-calculators.ts (10 tools)
//   create-retirement-income-calculators.ts (10 tools)
//   create-retirement-tax-ira-calculators.ts (9 tools)
//   create-retirement-workplace-plans-calculators.ts (9 tools)
//   create-retirement-pension-social-security-calculators.ts (12 tools)
//   create-retirement-fire-timing-calculators.ts (11 tools)
//   create-retirement-portfolio-calculators.ts (7 tools)
//
// See src/lib/calc-engine-retirement-portfolio.ts for the math, the official
// 2026 figures it uses, and how near-namesake tools are differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-retirement-portfolio-calculators.ts
// or
//   npm run db:create-retirement-portfolio-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "retirement-calculators";

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

function dropdownField(key: string, label: string, defaultValue: number, options: { label: string; value: number }[]) {
  return { key, label, type: "dropdown", required: true, default: defaultValue, options };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't financial, tax or legal " +
  "advice. Returns aren't guaranteed, and tax rules, contribution limits and benefit rules change — check " +
  "IRS.gov, SSA.gov or your plan provider, or ask a qualified adviser, before acting.";

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
    slug: "annuity-retirement-income-calculator",
    title: "Annuity Retirement Income Calculator",
    description: "Estimate the monthly retirement income an annuity purchase could pay for a set number of years, its payout rate, and the total you'd receive.",
    metaTitle: "Annuity Retirement Income Calculator — Monthly Payout",
    metaDescription: "Free annuity retirement income calculator. See the monthly income a premium could buy for a set period, the payout rate and the total received.",
    calcInputs: [
      currencyField("premium", "Amount Used to Buy the Annuity", { default: 200000, max: 100000000, step: 5000 }),
      numberField("payoutYears", "Years of Payments", { default: 20, min: 1, max: 50, step: 1 }),
      percentField("interestRatePercent", "Interest Rate Credited", { default: 5, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Monthly Income", format: "currency" },
    calcResults: [
      { key: "monthlyIncome", label: "Monthly Income", format: "currency", highlight: true },
      { key: "annualIncome", label: "Yearly Income", format: "currency" },
      { key: "payoutRatePercent", label: "Payout Rate (Yearly Income ÷ Premium)", format: "percentage" },
      { key: "totalReceived", label: "Total Received", format: "currency" },
      { key: "interestEarned", label: "Interest Included in Payments", format: "currency" },
    ],
    instructions:
      "Enter the amount you'd put into the annuity, how many years you want it to pay, and the interest rate it credits. " +
      "The tool works out the level monthly payment that pays out the premium plus interest over that period — the way a " +
      "\"period certain\" immediate annuity works. Lifetime annuities price payments using life expectancy as well.",
    examples:
      "Example: $200,000 paid out over 20 years at 5% gives $1,319.91 a month ($15,838.94 a year) — a 7.92% payout rate. " +
      "You'd receive $316,778.75 in total, $116,778.75 of it interest.",
    assumptions:
      "Payments are fixed with no inflation increases, and there are no fees. Real annuity quotes depend on the insurer, " +
      "your age, and any riders. Annuities are backed by the insurer, and by state guaranty associations up to limits. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between payout rate and interest rate?",
        answer: "The payout rate includes the return of your own money. A 7.92% payout on a 20-year annuity doesn't mean a 7.92% return — much of each payment is your premium coming back.",
      },
    ],
  },
  {
    slug: "guaranteed-income-calculator",
    title: "Guaranteed Income Calculator",
    description: "See how much of your essential retirement spending is covered by guaranteed income, and the annuity premium it would take to cover the rest.",
    metaTitle: "Guaranteed Income Calculator — Income Floor",
    metaDescription: "Free guaranteed income calculator. See how much of your essential retirement spending Social Security and pensions cover, and the annuity to fill the gap.",
    calcInputs: [
      currencyField("essentialMonthlyExpenses", "Essential Monthly Expenses", { default: 4500, max: 1000000, step: 50 }),
      currencyField("socialSecurityMonthly", "Social Security per Month", { default: 2500, max: 100000, step: 50 }),
      currencyField("pensionMonthly", "Pension per Month", { default: 600, max: 100000, step: 50 }),
      currencyField("annuityMonthly", "Existing Annuity Income per Month", { default: 0, max: 100000, step: 50 }),
      percentField("annuityPayoutRatePercent", "Annuity Payout Rate You Could Get", { default: 7, min: 1, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "Essentials Covered", format: "percentage" },
    calcResults: [
      { key: "essentialsCoveredPercent", label: "Essential Spending Covered", format: "percentage", highlight: true },
      { key: "guaranteedMonthlyIncome", label: "Guaranteed Monthly Income", format: "currency" },
      { key: "monthlyGap", label: "Monthly Gap in Essentials", format: "currency" },
      { key: "annuityPremiumToCloseGap", label: "Annuity Premium to Close the Gap", format: "currency" },
    ],
    instructions:
      "Enter only your essential monthly costs — housing, food, healthcare, utilities, insurance — and your guaranteed " +
      "income sources. Many planners suggest covering essentials with guaranteed income (an \"income floor\") and paying " +
      "for extras from investments. The tool shows your coverage and what an annuity would cost to fill any gap, using a " +
      "payout rate from an insurer quote.",
    examples:
      "Example: $4,500 of essentials against $2,500 of Social Security and a $600 pension is 68.89% covered, leaving a " +
      "$1,400 monthly gap. At a 7% payout rate, an annuity costing $240,000 would close it.",
    assumptions:
      "Payout rates depend on your age, sex, interest rates and the annuity type; get real quotes. Social Security rises " +
      "with inflation, but most annuities don't unless you buy an inflation rider. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is a retirement income floor?",
        answer: "Guaranteed income — Social Security, pensions, annuities — that covers your essential spending no matter what markets do. Investments then pay for wants rather than needs.",
      },
    ],
  },
  {
    slug: "retirement-portfolio-calculator",
    title: "Retirement Portfolio Calculator",
    description: "See the expected return of your retirement portfolio's stock, bond and cash mix, and what's left after years of withdrawals.",
    metaTitle: "Retirement Portfolio Calculator — Mix & Withdrawals",
    metaDescription: "Free retirement portfolio calculator. Find your stock/bond/cash mix's expected return and the balance left after years of withdrawals.",
    calcInputs: [
      currencyField("balance", "Portfolio Balance", { default: 800000, max: 100000000, step: 5000 }),
      percentField("stockPercent", "Stocks", { default: 50, max: 100, step: 5 }),
      percentField("bondPercent", "Bonds", { default: 40, max: 100, step: 5 }),
      percentField("stockReturnPercent", "Expected Stock Return", { default: 7, max: 20, step: 0.25 }),
      percentField("bondReturnPercent", "Expected Bond Return", { default: 4, max: 15, step: 0.25 }),
      percentField("cashReturnPercent", "Expected Cash Return", { default: 3, max: 10, step: 0.25 }),
      currencyField("annualWithdrawal", "Yearly Withdrawal", { default: 40000, max: 10000000, step: 1000 }),
      numberField("years", "Years", { default: 25, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Balance After Period", format: "currency" },
    calcResults: [
      { key: "balanceAfterPeriod", label: "Balance Left After the Period", format: "currency", highlight: true },
      { key: "expectedReturnPercent", label: "Portfolio Expected Return", format: "percentage" },
      { key: "cashPercent", label: "Cash (the Rest)", format: "percentage" },
      { key: "totalWithdrawn", label: "Total Withdrawn", format: "currency" },
      { key: "yearMoneyRunsOut", label: "Year Money Runs Out (0 = It Lasts)", format: "number" },
    ],
    instructions:
      "Enter your portfolio balance and how it's split between stocks and bonds (the rest is cash). Add the return you " +
      "expect from each and the amount you'll withdraw every year. The tool weights the returns into one expected " +
      "portfolio return and runs your withdrawals forward.",
    examples:
      "Example: $800,000 in 50% stocks, 40% bonds and 10% cash, at 7%, 4% and 3%, has an expected return of 5.4%. " +
      "Withdrawing $40,000 a year for 25 years ($1,000,000 in total) still leaves $852,463.15.",
    assumptions:
      "Withdrawals come out at the start of each year and don't rise with inflation. Real portfolios swing from year to " +
      "year — see the Sequence of Returns Calculator. Rebalancing is assumed. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a typical retirement portfolio mix?",
        answer: "Many retirees hold 40–60% in stocks for growth, with the rest in bonds and cash for stability and near-term spending. The right mix depends on your other income and comfort with ups and downs.",
      },
    ],
  },
  {
    slug: "retirement-asset-allocation-calculator",
    title: "Retirement Asset Allocation Calculator",
    description: "Get an age-based stock and bond split for your retirement savings using the 100, 110 or 120 minus age rule, and see how it shifts over the next 10 years.",
    metaTitle: "Retirement Asset Allocation Calculator — By Age",
    metaDescription: "Free retirement asset allocation calculator. Use the 100/110/120 minus age rule to split your savings between stocks and bonds.",
    calcInputs: [
      numberField("age", "Your Age", { default: 55, min: 18, max: 100, step: 1 }),
      currencyField("balance", "Retirement Savings", { default: 400000, max: 100000000, step: 5000 }),
      dropdownField("ruleBase", "Risk Level (Rule Used)", 110, [
        { label: "Cautious — 100 minus age", value: 100 },
        { label: "Moderate — 110 minus age", value: 110 },
        { label: "Growth — 120 minus age", value: 120 },
      ]),
    ],
    calcResult: { label: "Stocks", format: "percentage" },
    calcResults: [
      { key: "stockPercent", label: "Stocks", format: "percentage", highlight: true },
      { key: "bondPercent", label: "Bonds and Cash", format: "percentage" },
      { key: "amountInStocks", label: "Amount in Stocks", format: "currency" },
      { key: "amountInBonds", label: "Amount in Bonds and Cash", format: "currency" },
      { key: "stockPercentIn10Years", label: "Stocks in 10 Years", format: "percentage" },
    ],
    instructions:
      "Enter your age and savings and choose a risk level. The classic rule of thumb holds your age in bonds (100 minus " +
      "age in stocks); because people live longer now, many use 110 or 120 minus age for more growth. The tool splits " +
      "your savings and shows how the mix shifts toward bonds over the next 10 years — a simple \"glide path\".",
    examples:
      "Example: at 55 with $400,000, the 110-minus-age rule puts 55% ($220,000) in stocks and 45% ($180,000) in bonds and " +
      "cash. In 10 years it would be 45% stocks.",
    assumptions:
      "A rule of thumb, not personal advice. Target-date funds follow a similar glide path automatically. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why hold more bonds as I get older?",
        answer: "Closer to and during retirement you have less time to recover from a stock market fall, and you're drawing money out. Bonds and cash steady the portfolio and fund near-term spending.",
      },
    ],
  },
  {
    slug: "retirement-investment-return-calculator",
    title: "Retirement Investment Return Calculator",
    description: "Find the investment return you need to reach your retirement savings target — before and after inflation.",
    metaTitle: "Retirement Investment Return Calculator — Needed",
    metaDescription: "Free retirement investment return calculator. Find the annual return needed to reach your retirement target, before and after inflation.",
    calcInputs: [
      currencyField("currentSavings", "Current Retirement Savings", { default: 150000, max: 100000000, step: 1000 }),
      currencyField("monthlyContribution", "Monthly Contribution", { default: 1000, max: 1000000, step: 50 }),
      numberField("years", "Years Until Retirement", { default: 20, min: 1, max: 60, step: 1 }),
      currencyField("targetNestEgg", "Retirement Savings Target", { default: 1000000, max: 100000000, step: 10000 }),
      percentField("inflationPercent", "Inflation Rate", { default: 2.5, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Required Annual Return", format: "percentage" },
    calcResults: [
      { key: "requiredAnnualReturnPercent", label: "Annual Return Needed", format: "percentage", highlight: true },
      { key: "requiredRealReturnPercent", label: "Return Needed After Inflation", format: "percentage" },
      { key: "totalYouContribute", label: "Total You Contribute (incl. Current Savings)", format: "currency" },
      { key: "growthNeeded", label: "Growth Needed on Top", format: "currency" },
    ],
    instructions:
      "Enter your savings, monthly contribution, years until retirement, and your target. The tool finds the yearly " +
      "return your investments must average to get there, and the same return after inflation — a useful reality check: " +
      "if it's well above what a balanced portfolio has historically earned, the plan needs more saving or more time.",
    examples:
      "Example: growing $150,000 plus $1,000 a month into $1,000,000 in 20 years takes a 6.45% average annual return — " +
      "3.85% after 2.5% inflation. You'd contribute $390,000, so growth must supply $610,000.",
    assumptions:
      "Contributions are monthly and the return is a steady annual average. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What return is realistic for a retirement portfolio?",
        answer: "Over long periods a balanced stock-and-bond portfolio has returned roughly 5–7% a year before inflation, with large swings. Planning around a modest figure is safer.",
      },
    ],
  },
  {
    slug: "retirement-fee-impact-calculator",
    title: "Retirement Fee Impact Calculator",
    description: "See how investment fees shrink your retirement savings — and how much yearly retirement income that costs you.",
    metaTitle: "Retirement Fee Impact Calculator — Lost Income",
    metaDescription: "Free retirement fee impact calculator. See how much fees cut your retirement balance and the yearly retirement income they cost you.",
    calcInputs: [
      currencyField("currentBalance", "Current Retirement Balance", { default: 100000, max: 100000000, step: 1000 }),
      currencyField("annualContribution", "Yearly Contribution", { default: 12000, max: 10000000, step: 500 }),
      numberField("years", "Years Until Retirement", { default: 25, min: 1, max: 60, step: 1 }),
      percentField("annualReturnPercent", "Expected Return Before Fees", { default: 7, max: 20, step: 0.25 }),
      percentField("feePercent", "Total Yearly Fees (Fund + Advisory)", { default: 1, max: 5, step: 0.05 }),
      percentField("withdrawalRatePercent", "Withdrawal Rate in Retirement", { default: 4, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Cost of Fees", format: "currency" },
    calcResults: [
      { key: "costOfFees", label: "Cost of Fees by Retirement", format: "currency", highlight: true },
      { key: "retirementIncomeLostPerYear", label: "Retirement Income Lost Every Year", format: "currency" },
      { key: "balanceWithFees", label: "Balance with Fees", format: "currency" },
      { key: "balanceWithoutFees", label: "Balance Without Fees", format: "currency" },
      { key: "shareOfBalanceLostPercent", label: "Share of Balance Lost to Fees", format: "percentage" },
    ],
    instructions:
      "Enter your balance, yearly contribution, years to retirement, expected return before fees, and your total yearly " +
      "fees — fund expense ratios plus any advisory or plan fee. The tool compares your balance with and without fees, " +
      "then turns the difference into the yearly retirement income it would have paid.",
    examples:
      "Example: $100,000 plus $12,000 a year for 25 years at 7% grows to $1,301,731.72 without fees but $1,087,561.22 with " +
      "1% fees — $214,170.50 (16.45%) lost. At a 4% withdrawal rate that's $8,566.82 less income every year of retirement.",
    assumptions:
      "Fees are taken as a percentage of the balance each year; contributions are made yearly. Fees usually continue in " +
      "retirement too. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a reasonable fee for retirement investments?",
        answer: "Broad index funds often charge well under 0.2% a year. Paying 1% or more in combined fund and advisory fees can cost a sixth or more of your final balance over a career.",
      },
    ],
  },
  {
    slug: "retirement-sequence-of-returns-calculator",
    title: "Retirement Sequence of Returns Calculator",
    description: "See why the order of investment returns matters in retirement: the same average return with a market crash early versus late.",
    metaTitle: "Sequence of Returns Calculator — Crash Early vs Late",
    metaDescription: "Free sequence of returns risk calculator. Compare the same average return with a market crash early vs late in retirement while withdrawing.",
    calcInputs: [
      currencyField("balance", "Savings at Retirement", { default: 1000000, max: 100000000, step: 10000 }),
      currencyField("annualWithdrawal", "First-Year Withdrawal", { default: 45000, max: 10000000, step: 1000 }),
      percentField("inflationPercent", "Yearly Withdrawal Increase (Inflation)", { default: 2.5, max: 15, step: 0.1 }),
      numberField("years", "Years of Retirement", { default: 30, min: 3, max: 60, step: 1 }),
      percentField("averageReturnPercent", "Average Annual Return", { default: 6, max: 20, step: 0.25 }),
      percentField("crashReturnPercent", "Return in Each of Two Crash Years", { default: -20, min: -90, max: 0, step: 1 }),
    ],
    calcResult: { label: "Ending Balance (Crash Early)", format: "currency" },
    calcResults: [
      { key: "endingBalanceCrashEarly", label: "Ending Balance — Crash in Years 1–2", format: "currency", highlight: true },
      { key: "endingBalanceCrashLate", label: "Ending Balance — Crash in the Last 2 Years", format: "currency" },
      { key: "endingBalanceSteadyReturns", label: "Ending Balance — Steady Returns", format: "currency" },
      { key: "costOfEarlyCrashVsLate", label: "Cost of the Crash Coming Early", format: "currency" },
      { key: "yearMoneyRunsOutCrashEarly", label: "Year Money Runs Out if Crash Is Early (0 = Lasts)", format: "number" },
    ],
    instructions:
      "Enter your savings, first-year withdrawal (rising with inflation), years of retirement, an average return, and how " +
      "bad two crash years are. All three scenarios have exactly the same average return over the whole period — only " +
      "the ORDER changes. Because you're withdrawing money, losses early on hurt far more: you sell low and have less " +
      "left to recover.",
    examples:
      "Example: $1,000,000, withdrawing $45,000 rising 2.5% a year for 30 years, averaging 6%. With two −20% years at the " +
      "end you finish with $1,767,117.50; with steady returns, $774,618.16. With the same crash at the start, the money " +
      "runs out in year 21.",
    assumptions:
      "The non-crash years' return is set so every scenario averages the same compound return. Withdrawals are taken at " +
      "the start of each year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I protect against sequence of returns risk?",
        answer: "Keep 1–3 years of spending in cash or short-term bonds, be willing to trim withdrawals after a bad year, delay Social Security to lean on guaranteed income, or annuitize part of your savings.",
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
