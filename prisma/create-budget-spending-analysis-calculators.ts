// One-time (but safe to re-run) batch setup script: creates the Spending Analysis tools
// (7) of the Budget Calculators expansion, filed under Budget Calculators >
// Money-Saving & Spending Calculators (both categories are created on first run).
// See src/lib/calc-engine-budget-spending-analysis.ts for the math and
// src/lib/calc-engine-budget-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-budget-spending-analysis-calculators.ts
// or
//   npm run db:create-budget-spending-analysis-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Budget Calculators", slug: "budget-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Money-Saving & Spending Calculators", slug: "money-saving-calculators" };

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
  "This tool provides general estimates for planning purposes only and isn't financial advice. Your actual " +
  "costs depend on where you live, your prices and your choices — adjust the inputs to your situation.";

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
    slug: "spending-leak-finder-calculator",
    title: "Spending Leak Finder Calculator",
    description: "Add up the small money leaks — bank and late fees, unused subscriptions, impulse buys, delivery fees — and see what they cost each year and could grow to if invested.",
    metaTitle: "Spending Leak Calculator — Find Where Money Goes",
    metaDescription: "Free spending leak finder. Add up fees, unused subscriptions, impulse buys and delivery charges and see the yearly cost and invested value.",
    calcInputs: [
      currencyField("bankFees", "Bank, ATM & Overdraft Fees (Monthly)", { default: 15, max: 10000, step: 1, required: false }),
      currencyField("unusedSubscriptions", "Unused Subscriptions & Memberships", { default: 30, max: 10000, step: 1, required: false }),
      currencyField("lateFees", "Late Fees & Interest", { default: 10, max: 10000, step: 1, required: false }),
      currencyField("impulseBuys", "Impulse Buys", { default: 120, max: 100000, step: 5, required: false }),
      currencyField("deliveryFees", "Delivery & Convenience Fees", { default: 40, max: 10000, step: 1, required: false }),
      currencyField("other", "Other Small Leaks", { default: 25, max: 10000, step: 1, required: false }),
      percentField("returnPercent", "Return If Invested", { default: 7, min: -10, max: 20, step: 0.25 }),
      numberField("years", "Years", { default: 10, min: 0, max: 50, step: 1 }),
    ],
    calcResult: { label: "Yearly Cost of Leaks", format: "currency" },
    calcResults: [
      { key: "monthlyLeaks", label: "Monthly Leaks", format: "currency" },
      { key: "yearlyLeaks", label: "Yearly Cost of Leaks", format: "currency", highlight: true },
      { key: "valueIfInvested", label: "Value If Invested Instead", format: "currency" },
    ],
    instructions:
      "Spending leaks are small, easy-to-miss costs that add up — fees you could avoid, subscriptions you forgot, delivery " +
      "markups and unplanned purchases. Go through last month's statements and total each type.\n\n" +
      "Plugging leaks is often the fastest way to free up money without cutting anything you actually value.",
    examples:
      "Example: fees, forgotten subscriptions, impulse buys and delivery charges add up to $240 a month — $2,880 " +
      "a year. Invested instead at 7%, that could be $41,284.53 in 10 years.",
    assumptions:
      "Leaks stay the same each month. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the easiest leak to fix?",
        answer: "Bank fees and unused subscriptions — switch to a no-fee account, turn on low-balance alerts, and cancel anything you haven't used in a month.",
      },
    ],
  },
  {
    slug: "lifestyle-creep-calculator",
    title: "Lifestyle Creep Calculator",
    description: "See how spending most of every raise adds up: the extra yearly spending, the total over time, and what that money could have grown to if saved.",
    metaTitle: "Lifestyle Creep Calculator — Cost of Spending Raises",
    metaDescription: "Free lifestyle creep calculator. See how spending your raises adds up over the years and what saving them instead could be worth.",
    calcInputs: [
      currencyField("yearlyRaise", "Yearly Raise (After Tax)", { default: 3000, max: 1000000, step: 100 }),
      percentField("sharePercentSpent", "Share of Each Raise You Spend", { default: 70, max: 100, step: 5 }),
      numberField("years", "Years", { default: 10, min: 0, max: 40, step: 1 }),
      percentField("returnPercent", "Return If Saved", { default: 7, min: -10, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Value If Saved Instead", format: "currency" },
    calcResults: [
      { key: "extraSpendingInFinalYear", label: "Extra Spending in the Final Year", format: "currency" },
      { key: "totalExtraSpending", label: "Total Extra Spending", format: "currency" },
      { key: "valueIfSavedInstead", label: "Value If Saved Instead", format: "currency", highlight: true },
      { key: "savedFromRaisesInFinalYear", label: "Saved From Raises in the Final Year", format: "currency" },
    ],
    instructions:
      "Lifestyle creep (or inflation) is when spending rises with income — a nicer car, more takeout, a bigger place — so " +
      "you never feel richer. Each raise compounds: a $3,000 raise this year and another next year means $6,000 more a " +
      "year by year two.\n\n" +
      "A common fix: save at least half of every raise automatically before you get used to it.",
    examples:
      "Example: getting a $3,000 raise every year and spending 70% of each adds $21,000 " +
      "a year of spending by year 10 — $115,500 in total. Saved at 7%, that would be worth " +
      "$153,553.54.",
    assumptions:
      "Raises are the same amount each year and stay in place. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is all lifestyle creep bad?",
        answer: "No — enjoying some of your raise is fine. The goal is to choose deliberately, so your savings rate grows along with your income.",
      },
    ],
  },
  {
    slug: "latte-factor-savings-impact-calculator",
    title: "Latte Factor Savings Impact Calculator",
    description: "See what a small daily habit — coffee, snacks, vending machines — really costs over the years, and what the same money could grow to if invested.",
    metaTitle: "Latte Factor Calculator — Small Daily Spending Impact",
    metaDescription: "Free latte factor calculator. See what a daily coffee or snack habit costs over the years and what it could grow to if invested.",
    calcInputs: [
      currencyField("dailyCost", "Cost per Day", { default: 5.5, max: 1000, step: 0.25 }),
      numberField("daysPerWeek", "Days per Week", { default: 5, min: 0, max: 7, step: 1 }),
      numberField("years", "Years", { default: 30, min: 0, max: 60, step: 1 }),
      percentField("returnPercent", "Return If Invested", { default: 7, min: -10, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Value If Invested", format: "currency" },
    calcResults: [
      { key: "monthlyCost", label: "Monthly Cost", format: "currency" },
      { key: "yearlyCost", label: "Yearly Cost", format: "currency" },
      { key: "totalSpent", label: "Total Spent", format: "currency" },
      { key: "valueIfInvested", label: "Value If Invested", format: "currency", highlight: true },
    ],
    instructions:
      "The \"latte factor\" idea: small daily purchases look harmless but add up, and invested over decades they could " +
      "grow into a large sum. It's not about never buying coffee — it's about knowing the trade-off and choosing what's " +
      "worth it.\n\n" +
      "Enter the daily cost and how often you buy it.",
    examples:
      "Example: a $5.50 habit 5 days a week costs $119.17 a month — $1,430 a year and " +
      "$42,900 over 30 years. Invested at 7%, it would grow to $140,147.73.",
    assumptions:
      "Prices don't rise; invested monthly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Will skipping coffee make me rich?",
        answer: "On its own, rarely — housing, cars and debt matter more. But the habit of noticing small, automatic spending helps across your whole budget.",
      },
    ],
  },
  {
    slug: "opportunity-cost-of-a-purchase-calculator",
    title: "Opportunity Cost of a Purchase Calculator",
    description: "Before a big purchase, see what that money could grow to if invested instead, and how many hours of work it costs you.",
    metaTitle: "Opportunity Cost Calculator — True Cost of a Purchase",
    metaDescription: "Free opportunity cost calculator. See what a purchase's price could grow to if invested, and how many hours of work it costs.",
    calcInputs: [
      currencyField("price", "Purchase Price", { default: 1500, max: 100000000, step: 10 }),
      numberField("years", "Years", { default: 20, min: 0, max: 60, step: 1 }),
      percentField("returnPercent", "Return If Invested", { default: 7, min: -10, max: 20, step: 0.25 }),
      currencyField("hourlyTakeHome", "Your Take-Home Pay per Hour", { default: 25, max: 10000, step: 0.5 }),
    ],
    calcResult: { label: "Opportunity Cost", format: "currency" },
    calcResults: [
      { key: "futureValueIfInvested", label: "Future Value If Invested", format: "currency" },
      { key: "opportunityCost", label: "Opportunity Cost", format: "currency", highlight: true },
      { key: "hoursOfWork", label: "Hours of Work It Costs", format: "number" },
    ],
    instructions:
      "Every purchase has an opportunity cost: the next-best use of the money. Seeing a price as future wealth, or as hours " +
      "you'd work to pay for it, helps separate wants you'll value from impulse buys.\n\n" +
      "For your take-home hourly pay, divide yearly take-home pay by hours worked (about 2,000 for full time), or use the " +
      "true hourly wage calculator.",
    examples:
      "Example: a $1,500 purchase invested at 7% for 20 years would grow to $5,804.53 — an " +
      "opportunity cost of $4,304.53. At $25 an hour, it costs 60 hours of work.",
    assumptions:
      "Single lump sum compounded yearly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does that mean I shouldn't buy anything?",
        answer: "No — money is for living too. The point is to buy what's worth its opportunity cost to you, and skip what isn't.",
      },
    ],
  },
  {
    slug: "cost-per-use-calculator",
    title: "Cost Per Use Calculator",
    description: "Work out the cost per use of clothing, gear or any purchase — including upkeep and resale — and compare a quality item with a cheaper one you'd replace more often.",
    metaTitle: "Cost Per Use Calculator — Cost per Wear",
    metaDescription: "Free cost per use calculator. Find the cost per use or wear of any purchase and compare a quality item with a cheaper one.",
    calcInputs: [
      currencyField("price", "Item Price", { default: 120, max: 10000000, step: 1 }),
      numberField("usesPerWeek", "Uses per Week", { default: 2, min: 0, max: 100, step: 0.5 }),
      numberField("yearsOfUse", "Years It Will Last", { default: 3, min: 0.1, max: 50, step: 0.5 }),
      currencyField("upkeepPerYear", "Upkeep per Year (Cleaning, Repairs)", { default: 0, max: 100000, step: 1, required: false }),
      currencyField("resaleValue", "Resale Value at the End", { default: 0, max: 10000000, step: 1, required: false }),
      currencyField("cheaperPrice", "Cheaper Alternative Price", { default: 50, max: 10000000, step: 1 }),
      numberField("cheaperYears", "Cheaper Alternative Lasts (Years)", { default: 1, min: 0.1, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Cost per Use", format: "currency" },
    calcResults: [
      { key: "totalUses", label: "Total Uses", format: "number" },
      { key: "costPerUse", label: "Cost per Use", format: "currency", highlight: true },
      { key: "cheaperItemCostPerUse", label: "Cheaper Item Cost per Use", format: "currency" },
      { key: "savingsWithBetterItem", label: "Savings With the Better Item", format: "currency" },
    ],
    instructions:
      "Cost per use (or cost per wear) divides what something really costs by how often you'll use it. A $120 pair of " +
      "boots worn twice a week for three years can be cheaper per wear than $50 boots replaced every year. The same idea " +
      "drives a capsule wardrobe: fewer, better pieces worn often.\n\n" +
      "Enter the item and a cheaper alternative to compare.",
    examples:
      "Example: a $120 item used 2 times a week for 3 years is used 312 times — $0.38 " +
      "per use. A $50 version that lasts 1 year costs $0.48 per use, so the better " +
      "item saves $30.",
    assumptions:
      "Same number of uses for both items. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a good cost per wear for clothes?",
        answer: "Many aim for $1 or less per wear for everyday items. Special-occasion pieces will be higher — borrowing or renting may make more sense.",
      },
    ],
  },
  {
    slug: "minimalist-living-budget-calculator",
    title: "Minimalist Living Budget Calculator",
    description: "Estimate the savings from minimalist living — buying less, dropping a storage unit, fewer things to maintain — and what they add up to over time.",
    metaTitle: "Minimalist Living Calculator — Savings From Owning Less",
    metaDescription: "Free minimalist living calculator. Estimate monthly savings from buying less and owning fewer things, and their value over time.",
    calcInputs: [
      currencyField("monthlyShopping", "Monthly Spending on Things (Clothes, Gadgets, Decor)", { default: 600, max: 1000000, step: 25 }),
      percentField("reductionPercent", "How Much You'd Cut It", { default: 50, max: 100, step: 5 }),
      currencyField("storageUnit", "Storage Unit You'd Drop (Monthly)", { default: 0, max: 10000, step: 5, required: false }),
      currencyField("otherSavings", "Other Monthly Savings (Upkeep, Subscriptions)", { default: 50, max: 10000, step: 5, required: false }),
      numberField("years", "Years", { default: 10, min: 0, max: 50, step: 1 }),
      percentField("returnPercent", "Return If Invested", { default: 7, min: -10, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Yearly Savings", format: "currency" },
    calcResults: [
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "yearlySavings", label: "Yearly Savings", format: "currency", highlight: true },
      { key: "valueIfInvested", label: "Value If Invested", format: "currency" },
    ],
    instructions:
      "Minimalism means owning fewer, more intentional things. Financially, it cuts spending on stuff, frees up space " +
      "(sometimes enough to drop a storage unit or live in a smaller home), and reduces upkeep. Selling what you don't use " +
      "can give a one-time boost too.\n\n" +
      "Enter what you spend on things now and how much you'd realistically cut.",
    examples:
      "Example: cutting $600 of monthly spending on things by 50%, plus $50 of other " +
      "savings, saves $350 a month — $4,200 a year, or $60,206.61 in 10 years if invested.",
    assumptions:
      "Savings invested monthly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I start living more minimally?",
        answer: "Declutter one area at a time, wait 30 days before non-essential purchases, and replace only what wears out.",
      },
    ],
  },
  {
    slug: "annual-vs-monthly-subscription-savings-calculator",
    title: "Annual vs Monthly Subscription Savings Calculator",
    description: "Compare paying for a subscription monthly versus annually: the yearly savings, the percentage discount, and how many months you need to use it to come out ahead.",
    metaTitle: "Annual vs Monthly Subscription Calculator — Savings",
    metaDescription: "Free annual vs monthly subscription calculator. See the yearly savings and the months of use needed for an annual plan to pay off.",
    calcInputs: [
      currencyField("monthlyPrice", "Monthly Plan Price", { default: 14.99, max: 10000, step: 0.01 }),
      currencyField("annualPrice", "Annual Plan Price", { default: 149.99, max: 100000, step: 0.01 }),
      numberField("monthsUsed", "Months You'd Actually Use It", { default: 12, min: 0, max: 12, step: 1 }),
    ],
    calcResult: { label: "Savings With the Annual Plan", format: "currency" },
    calcResults: [
      { key: "monthlyPlanYearlyCost", label: "Monthly Plan for 12 Months", format: "currency" },
      { key: "savingsWithAnnualPlan", label: "Savings With the Annual Plan", format: "currency", highlight: true },
      { key: "savingsPercent", label: "Annual Discount", format: "percentage" },
      { key: "breakEvenMonths", label: "Months of Use to Break Even", format: "number" },
    ],
    instructions:
      "Annual plans are usually 15–20% cheaper, but only if you'd keep the service all year. If you'd cancel after a few " +
      "months — or rotate streaming services — paying monthly can be cheaper.\n\n" +
      "Enter both prices and how many months you'd really use it. A negative saving means monthly is cheaper for you.",
    examples:
      "Example: $14.99 a month is $179.88 a year, while the annual plan is $149.99 — a " +
      "16.62% discount, saving $29.89. It pays off if you use it at least 10.01 months.",
    assumptions:
      "No refund if you cancel an annual plan early. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get a refund on an annual subscription?",
        answer: "Policies vary — some give prorated refunds, many don't. Check before you buy, and set a reminder before it renews.",
      },
    ],
  },
];

// Budget Calculators (and its sub-categories) are created on first use, under
// Finance Calculators.
async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  let parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY.slug } });
  if (!parent) {
    const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
    if (!finance) {
      throw new Error(
        `The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
          "then re-run this script."
      );
    }
    console.log(`Creating category "${PARENT_CATEGORY.name}" under "${finance.name}".`);
    parent = await prisma.toolCategory.create({
      data: { name: PARENT_CATEGORY.name, slug: PARENT_CATEGORY.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
    });
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
