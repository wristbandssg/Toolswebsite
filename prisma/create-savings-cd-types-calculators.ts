// One-time (but safe to re-run) batch setup script: creates the CD Type tools
// (6) of the Interest Calculators expansion, filed under Savings Calculators.
// See src/lib/calc-engine-savings-cd-types.ts for the math and
// src/lib/calc-engine-interest-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-savings-cd-types-calculators.ts
// or
//   npm run db:create-savings-cd-types-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY = { name: "Savings Calculators", slug: "savings-calculators" };

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
  "This tool provides general estimates for informational purposes only and isn't financial advice. Bank and " +
  "brokerage CD rates, penalties and terms vary and change over time — check the CD's disclosure for exact " +
  "figures.";

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
    slug: "cd-laddering-calculator",
    title: "CD Laddering Calculator",
    description: "Build a CD ladder: split your savings across CDs maturing each year, see the first-year interest and what the ladder is worth at the end, compared with one long CD or rolling 1-year CDs.",
    metaTitle: "CD Ladder Calculator — Rungs, Interest & Value",
    metaDescription: "Free CD ladder calculator. Split savings into yearly CD rungs and compare the ladder's value with one long CD or rolling 1-year CDs.",
    calcInputs: [
      currencyField("amount", "Amount to Invest", { default: 25000, max: 100000000, step: 500 }),
      numberField("rungs", "Number of Rungs (Years)", { default: 5, min: 1, max: 10, step: 1 }),
      percentField("oneYearApyPercent", "1-Year CD APY", { default: 4, max: 20, step: 0.05 }),
      percentField("longestApyPercent", "Longest CD APY", { default: 3.75, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "Ladder Value at the End", format: "currency" },
    calcResults: [
      { key: "amountPerRung", label: "Amount per Rung", format: "currency" },
      { key: "averageStartingApy", label: "Average Starting APY", format: "percentage" },
      { key: "firstYearInterest", label: "First-Year Interest", format: "currency" },
      { key: "valueAfterLadder", label: "Ladder Value at the End", format: "currency", highlight: true },
      { key: "valueAllInLongestCd", label: "Value If All in the Longest CD", format: "currency" },
      { key: "valueRollingOneYearCds", label: "Value Rolling 1-Year CDs (Same Rate)", format: "currency" },
    ],
    instructions:
      "A CD ladder splits your money into CDs with staggered maturities — for a 5-rung ladder, 1, 2, 3, 4 and 5 years. " +
      "Each year one CD matures, giving you access to cash, and you reinvest it in a new longest-term CD. After the first " +
      "cycle, every rung earns the long-term rate but one still matures every year.\n\n" +
      "Enter the amount, the number of rungs and the shortest and longest rates; rates in between are interpolated.",
    examples:
      "Example: $25,000 in a 5-rung ladder puts $5,000 in each CD, from 4% for 1 year to " +
      "3.75% for the longest. That earns $968.75 in the first year, and the ladder is worth " +
      "$30,124.97 at the end, versus $30,052.50 all in the longest CD.",
    assumptions:
      "Maturing rungs are reinvested at today's longest rate and interest stays in the CDs. Rolling 1-year CDs assumes the " +
      "1-year rate never changes, which it will. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why build a CD ladder?",
        answer: "It balances access to your money with higher long-term rates, and spreads the risk of locking everything in just before rates rise.",
      },
    ],
  },
  {
    slug: "cd-early-withdrawal-penalty-calculator",
    title: "CD Early Withdrawal Penalty Calculator",
    description: "See what breaking a CD early costs: interest earned, the penalty, what you walk away with and the effective APY — and how a no-penalty CD would have compared.",
    metaTitle: "CD Early Withdrawal Penalty Calculator — Net Interest",
    metaDescription: "Free CD early withdrawal penalty calculator. See the penalty, net interest and effective APY, and compare with a no-penalty CD.",
    calcInputs: [
      currencyField("deposit", "CD Deposit", { default: 20000, max: 100000000, step: 500 }),
      percentField("apyPercent", "CD APY", { default: 4.5, max: 20, step: 0.05 }),
      numberField("monthsHeld", "Months Before Withdrawal", { default: 8, min: 0, max: 120, step: 1 }),
      numberField("penaltyMonths", "Penalty (Months of Interest)", { default: 6, min: 0, max: 36, step: 1 }),
      percentField("noPenaltyApyPercent", "No-Penalty CD APY", { default: 3.9, max: 20, step: 0.05, required: false }),
    ],
    calcResult: { label: "Net Interest", format: "currency" },
    calcResults: [
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
      { key: "penalty", label: "Early Withdrawal Penalty", format: "currency" },
      { key: "netInterest", label: "Net Interest", format: "currency", highlight: true },
      { key: "amountYouReceive", label: "Amount You Receive", format: "currency" },
      { key: "effectiveApy", label: "Effective APY", format: "percentage" },
      { key: "noPenaltyCdInterest", label: "No-Penalty CD Interest (Same Time)", format: "currency" },
      { key: "noPenaltyCdAdvantage", label: "No-Penalty CD Advantage", format: "currency" },
    ],
    instructions:
      "Most CDs charge a penalty of a set number of months' interest if you withdraw before maturity — commonly 3 months " +
      "for terms under a year, 6 months for 1–5 years and 12 months or more for longer terms. If the penalty is bigger than " +
      "the interest earned, it comes out of your principal.\n\n" +
      "A no-penalty CD pays a slightly lower rate but lets you withdraw after the first week with no penalty. Enter your " +
      "CD and how long you held it.",
    examples:
      "Example: $20,000 at 4.50% withdrawn after 8 months earns $595.59, but a " +
      "6-month penalty costs $450, leaving $145.59 — an effective APY of 1.09%. A " +
      "no-penalty CD at 3.90% would have earned $516.68.",
    assumptions:
      "Interest compounds monthly at the APY; the penalty is simple interest at the CD rate on the full deposit. Check your " +
      "CD's disclosure for the exact formula. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I avoid the penalty?",
        answer: "Banks usually waive it on the death or legal incompetence of the owner, and IRA CDs may allow penalty-free required minimum distributions. Some let you withdraw just the interest.",
      },
    ],
  },
  {
    slug: "callable-cd-calculator",
    title: "Callable CD Calculator",
    description: "Weigh a callable CD's higher rate against the risk the bank calls it early: interest if held, interest if called and reinvested at a lower rate, versus a non-callable CD.",
    metaTitle: "Callable CD Calculator — Call Risk vs Higher Rate",
    metaDescription: "Free callable CD calculator. Compare interest if the CD is held or called early and reinvested, against a non-callable CD.",
    calcInputs: [
      currencyField("deposit", "Deposit", { default: 50000, max: 100000000, step: 500 }),
      percentField("callableApyPercent", "Callable CD APY", { default: 5, max: 20, step: 0.05 }),
      numberField("termYears", "Term (Years)", { default: 5, min: 0.5, max: 20, step: 0.5 }),
      numberField("callAfterYears", "Called After (Years)", { default: 1, min: 0, max: 20, step: 0.5 }),
      percentField("reinvestApyPercent", "Rate You'd Reinvest At If Called", { default: 3.5, max: 20, step: 0.05 }),
      percentField("nonCallableApyPercent", "Non-Callable CD APY", { default: 4.25, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "Interest If Called", format: "currency" },
    calcResults: [
      { key: "interestIfHeldToMaturity", label: "Interest If Held to Maturity", format: "currency" },
      { key: "interestIfCalled", label: "Interest If Called", format: "currency", highlight: true },
      { key: "nonCallableInterest", label: "Non-Callable CD Interest", format: "currency" },
      { key: "advantageIfNotCalled", label: "Gain vs Non-Callable If Not Called", format: "currency" },
      { key: "costIfCalled", label: "Loss vs Non-Callable If Called", format: "currency" },
    ],
    instructions:
      "A callable CD pays a higher rate, but the bank can end it early — after a call-protection period — and return your " +
      "money. Banks call CDs when rates fall, which is exactly when you can't reinvest at the same rate. Callable CDs are " +
      "mostly sold through brokerages.\n\n" +
      "Enter the callable and non-callable rates and a call scenario. If the loss if called is positive, the non-callable " +
      "CD would have earned more in that case.",
    examples:
      "Example: $50,000 in a 5-year callable CD at 5% earns $13,814.08 if held. " +
      "If it's called after 1 year and you reinvest at 3.50%, you earn $10,244.96 — " +
      "$1,322.37 less than the $11,567.33 from a non-callable CD at 4.25%.",
    assumptions:
      "Interest compounds at the APY and stays invested. Brokered callable CDs usually pay interest out instead of " +
      "compounding. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a callable CD FDIC-insured?",
        answer: "Yes, if it's issued by an FDIC-insured bank, up to $250,000 per depositor per bank. The call feature doesn't change that.",
      },
    ],
  },
  {
    slug: "step-up-cd-calculator",
    title: "Step-Up CD Calculator",
    description: "Calculate a step-up CD whose rate rises on a set schedule: the blended APY over the term, total interest, and whether it beats a fixed-rate CD.",
    metaTitle: "Step-Up CD Calculator — Blended APY vs Fixed CD",
    metaDescription: "Free step-up CD calculator. See the blended APY and total interest of a CD with scheduled rate increases, compared with a fixed CD.",
    calcInputs: [
      currencyField("deposit", "Deposit", { default: 10000, max: 100000000, step: 500 }),
      percentField("startingApyPercent", "Starting APY", { default: 3.5, max: 20, step: 0.05 }),
      percentField("stepPercent", "Increase per Step", { default: 0.25, min: -2, max: 5, step: 0.05 }),
      numberField("stepEveryMonths", "Step Every (Months)", { default: 12, min: 1, max: 60, step: 1 }),
      numberField("termMonths", "Term (Months)", { default: 48, min: 1, max: 120, step: 1 }),
      percentField("fixedApyPercent", "Fixed CD APY (Same Term)", { default: 3.8, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "Blended APY", format: "percentage" },
    calcResults: [
      { key: "finalApy", label: "Final APY", format: "percentage" },
      { key: "blendedApy", label: "Blended APY", format: "percentage", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "fixedCdInterest", label: "Fixed CD Interest", format: "currency" },
      { key: "stepUpAdvantage", label: "Step-Up Advantage", format: "currency" },
    ],
    instructions:
      "A step-up CD starts at a lower rate that increases on a fixed schedule, such as every year. The advertised rate is " +
      "often the final, highest one; what matters is the blended APY over the whole term. Compare that with a fixed CD of " +
      "the same term.\n\n" +
      "A negative advantage means the fixed CD earns more. Some step-up CDs let you withdraw penalty-free at each step.",
    examples:
      "Example: $10,000 in a 48-month step-up CD starting at 3.50% and rising 0.25% " +
      "every 12 months ends at 4.25%, for a blended APY of 3.87% and $1,642.28 of " +
      "interest — $33.42 more than a fixed CD at 3.80%.",
    assumptions:
      "Interest compounds monthly and stays in the CD. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Step-up or bump-up CD?",
        answer: "A step-up CD's increases are guaranteed and scheduled. A bump-up CD lets you request a higher rate once (or twice) if the bank's rates rise — see the bump-up CD calculator.",
      },
    ],
  },
  {
    slug: "bump-up-cd-calculator",
    title: "Bump-Up CD Calculator",
    description: "See what a bump-up CD earns if you raise its rate once when bank rates rise — compared with never bumping and with a regular CD at a higher starting rate.",
    metaTitle: "Bump-Up CD Calculator — Interest With a Rate Bump",
    metaDescription: "Free bump-up CD calculator. See interest with and without a one-time rate bump, and compare with a regular CD's higher fixed rate.",
    calcInputs: [
      currencyField("deposit", "Deposit", { default: 10000, max: 100000000, step: 500 }),
      percentField("startingApyPercent", "Starting APY", { default: 3.75, max: 20, step: 0.05 }),
      numberField("termMonths", "Term (Months)", { default: 36, min: 1, max: 120, step: 1 }),
      numberField("bumpMonth", "Month You Bump the Rate", { default: 12, min: 0, max: 120, step: 1 }),
      percentField("newApyPercent", "New APY After the Bump", { default: 4.5, max: 20, step: 0.05 }),
      percentField("regularApyPercent", "Regular CD APY (Same Term)", { default: 4, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "Interest With the Bump", format: "currency" },
    calcResults: [
      { key: "interestWithBump", label: "Interest With the Bump", format: "currency", highlight: true },
      { key: "interestWithoutBump", label: "Interest Without a Bump", format: "currency" },
      { key: "regularCdInterest", label: "Regular CD Interest", format: "currency" },
      { key: "gainFromBump", label: "Gain From the Bump", format: "currency" },
      { key: "advantageVsRegularCd", label: "Advantage vs Regular CD", format: "currency" },
    ],
    instructions:
      "A bump-up (or raise-your-rate) CD lets you switch once — sometimes twice — to the bank's current rate for that term " +
      "if it rises. In exchange it usually starts lower than a regular CD. It pays off only if rates rise enough, early " +
      "enough.\n\n" +
      "Enter the rates and when you'd bump. If rates don't rise, set the new rate equal to the starting rate.",
    examples:
      "Example: $10,000 in a 36-month bump-up CD at 3.75%, bumped to 4.50% in month " +
      "12, earns $1,329.76 — $162.04 more than without the bump and $81.12 more " +
      "than a regular CD at 4%.",
    assumptions:
      "Interest compounds at the APY and stays in the CD; the bump applies for the rest of the term. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When should I use my bump?",
        answer: "There's no way to know the top. Many savers bump after a meaningful increase, especially in the first half of the term, since a late bump has little time to pay off.",
      },
    ],
  },
  {
    slug: "brokered-cd-calculator",
    title: "Brokered CD Calculator",
    description: "Calculate a brokered CD bought through a brokerage: interest paid to your cash account, total interest if held, and the market value if you sell before maturity after rates change.",
    metaTitle: "Brokered CD Calculator — Interest & Market Value",
    metaDescription: "Free brokered CD calculator. See interest payments, total interest if held, and what the CD would sell for before maturity if rates change.",
    calcInputs: [
      currencyField("faceValue", "Face Value", { default: 25000, max: 100000000, step: 1000 }),
      percentField("couponPercent", "CD Rate (Coupon)", { default: 4.3, max: 20, step: 0.05 }),
      {
        key: "paymentsPerYear", label: "Interest Paid", type: "dropdown", required: true, default: 12,
        options: [
          { label: "Monthly", value: 12 },
          { label: "Quarterly", value: 4 },
          { label: "Semi-Annually", value: 2 },
          { label: "Annually / At Maturity", value: 1 },
        ],
      },
      numberField("termYears", "Term (Years)", { default: 3, min: 0.25, max: 20, step: 0.25 }),
      numberField("yearsUntilSale", "Years Until You Sell (If Early)", { default: 1, min: 0, max: 20, step: 0.25 }),
      percentField("marketRatePercent", "Market Rate When You Sell", { default: 5, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "Market Value If Sold", format: "currency" },
    calcResults: [
      { key: "interestPerPayment", label: "Interest per Payment", format: "currency" },
      { key: "interestPerYear", label: "Interest per Year", format: "currency" },
      { key: "totalInterestIfHeld", label: "Total Interest If Held", format: "currency" },
      { key: "marketValueIfSold", label: "Market Value If Sold", format: "currency", highlight: true },
      { key: "gainOrLossOnSale", label: "Gain or Loss on Sale", format: "currency" },
    ],
    instructions:
      "Brokered CDs are issued by banks but bought through a brokerage account. They pay simple interest to your cash " +
      "account (no compounding), and you can't withdraw early from the bank — instead you sell on the secondary market. If " +
      "rates have risen, the CD sells for less than face value; if they've fallen, for more.\n\n" +
      "Enter the CD, and a sale scenario to see its market value.",
    examples:
      "Example: a $25,000 brokered CD at 4.30% pays $89.58 a month — $3,225 over " +
      "3 years. If you sell after 1 year when similar CDs pay 5%, it's worth about " +
      "$24,667.59, a -$332.41 change.",
    assumptions:
      "Market value is the present value of remaining interest and principal at the market rate; brokers' bids are usually " +
      "a bit lower, and you may pay a commission. FDIC insurance covers up to $250,000 per issuing bank. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why buy a brokered CD instead of a bank CD?",
        answer: "You can compare and buy CDs from many banks in one account, spread money across banks for FDIC coverage, and sometimes get higher rates.",
      },
    ],
  },
];

async function ensureCategory() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY.slug}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, then re-run this script.`
    );
  }
  return category;
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
