// One-time (but safe to re-run) batch setup script: creates the Net Worth & Cost of Living tools
// (5) of the Budget Calculators expansion, filed under Budget Calculators >
// Net Worth & Cost of Living Calculators (both categories are created on first run).
// See src/lib/calc-engine-budget-net-worth-col.ts for the math and
// src/lib/calc-engine-budget-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-budget-net-worth-col-calculators.ts
// or
//   npm run db:create-budget-net-worth-col-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Budget Calculators", slug: "budget-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Net Worth & Cost of Living Calculators", slug: "net-worth-cost-of-living-calculators" };

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
    slug: "personal-net-worth-calculator",
    title: "Personal Net Worth Calculator",
    description: "Calculate your net worth — everything you own minus everything you owe — plus your debt-to-asset ratio and liquid net worth.",
    metaTitle: "Net Worth Calculator — Assets, Debts & Debt-to-Asset",
    metaDescription: "Free personal net worth calculator. Add up assets and debts to find your net worth, debt-to-asset ratio and liquid net worth.",
    calcInputs: [
      currencyField("cash", "Cash & Savings", { default: 15000, max: 1000000000, step: 500 }),
      currencyField("investments", "Investments (Taxable)", { default: 60000, max: 1000000000, step: 500, required: false }),
      currencyField("retirement", "Retirement Accounts", { default: 120000, max: 1000000000, step: 500, required: false }),
      currencyField("home", "Home Value", { default: 400000, max: 1000000000, step: 5000, required: false }),
      currencyField("vehicles", "Vehicles", { default: 25000, max: 100000000, step: 500, required: false }),
      currencyField("otherAssets", "Other Assets", { default: 10000, max: 1000000000, step: 500, required: false }),
      currencyField("mortgage", "Mortgage Balance", { default: 280000, max: 1000000000, step: 5000, required: false }),
      currencyField("carLoans", "Car Loans", { default: 12000, max: 100000000, step: 500, required: false }),
      currencyField("studentLoans", "Student Loans", { default: 20000, max: 100000000, step: 500, required: false }),
      currencyField("creditCards", "Credit Card Balances", { default: 4000, max: 100000000, step: 100, required: false }),
      currencyField("otherDebts", "Other Debts", { default: 0, max: 1000000000, step: 500, required: false }),
    ],
    calcResult: { label: "Net Worth", format: "currency" },
    calcResults: [
      { key: "totalAssets", label: "Total Assets", format: "currency" },
      { key: "totalLiabilities", label: "Total Liabilities", format: "currency" },
      { key: "netWorth", label: "Net Worth", format: "currency", highlight: true },
      { key: "debtToAssetRatio", label: "Debt-to-Asset Ratio", format: "percentage" },
      { key: "liquidNetWorth", label: "Liquid Net Worth", format: "currency" },
    ],
    instructions:
      "Net worth is the clearest single measure of financial progress. List what you own at today's value — use a recent " +
      "estimate for your home and the private-party value for cars — and every debt balance.\n\n" +
      "The debt-to-asset ratio shows how much of what you own is financed; falling over time is a good sign. Liquid net " +
      "worth leaves out your home, cars and retirement accounts — money you could reach quickly.",
    examples:
      "Example: $630,000 of assets and $316,000 of debts give a net worth of $314,000. Debts equal " +
      "50.16% of assets, and liquid net worth is $71,000.",
    assumptions:
      "Retirement balances before tax. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How often should I calculate my net worth?",
        answer: "Once or twice a year is enough to see the trend; monthly tracking can make you react to normal market swings.",
      },
    ],
  },
  {
    slug: "financial-health-score-calculator",
    title: "Financial Health Score Calculator",
    description: "Get a 0–100 financial health score from your savings rate, emergency fund, debt load, retirement savings for your age, and credit score.",
    metaTitle: "Financial Health Score Calculator — Check Your Finances",
    metaDescription: "Free financial health score calculator. Score your savings rate, emergency fund, debt, retirement savings and credit from 0 to 100.",
    calcInputs: [
      currencyField("income", "Monthly Take-Home Pay", { default: 6000, max: 10000000, step: 50 }),
      currencyField("expenses", "Monthly Spending", { default: 4500, max: 10000000, step: 50 }),
      currencyField("emergencySavings", "Emergency Savings", { default: 15000, max: 100000000, step: 500 }),
      currencyField("debtPayments", "Monthly Debt Payments (Excl. Mortgage)", { default: 900, max: 1000000, step: 25, required: false }),
      currencyField("retirementSavings", "Retirement Savings", { default: 80000, max: 1000000000, step: 1000 }),
      currencyField("yearlySalary", "Yearly Gross Salary", { default: 85000, max: 100000000, step: 1000 }),
      numberField("age", "Age", { default: 35, min: 18, max: 100, step: 1 }),
      numberField("creditScore", "Credit Score", { default: 720, min: 300, max: 850, step: 1 }),
    ],
    calcResult: { label: "Financial Health Score (0–100)", format: "number" },
    calcResults: [
      { key: "savingsRatePercent", label: "Savings Rate", format: "percentage" },
      { key: "emergencyMonths", label: "Emergency Fund (Months)", format: "number" },
      { key: "debtToIncomePercent", label: "Debt Payments as % of Income", format: "percentage" },
      { key: "retirementMultiple", label: "Retirement Savings (× Salary)", format: "number" },
      { key: "retirementTargetMultiple", label: "Target for Your Age (× Salary)", format: "number" },
      { key: "financialHealthScore", label: "Financial Health Score (0–100)", format: "number", highlight: true },
    ],
    instructions:
      "Each of five areas is worth up to 20 points: saving at least 20% of take-home pay, six months of expenses in an " +
      "emergency fund, debt payments below 10% of income (zero points at 36%), retirement savings on track for your age " +
      "(a common rule: 1× salary by 30, 3× by 40, 6× by 50, 8× by 60, 10× by 67), and a credit score of 800 or more.\n\n" +
      "Use the score to spot your weakest area; it's a rule-of-thumb check, not an official rating.",
    examples:
      "Example: saving 25% of income with 3.33 months of emergency savings, debt payments at " +
      "15% of income and retirement savings of 0.94× salary (target 2× at " +
      "35) gives a score of 69 out of 100.",
    assumptions:
      "Linear scoring within each area. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a good financial health score?",
        answer: "80 or more suggests strong habits across the board; below 50 points to one or two areas — often emergency savings or retirement — worth focusing on.",
      },
    ],
  },
  {
    slug: "cost-of-living-comparison-calculator",
    title: "Cost of Living Comparison Calculator",
    description: "Compare the cost of living between two cities or countries: the salary you'd need in the new place to keep your lifestyle, how a job offer compares, and the rent difference.",
    metaTitle: "Cost of Living Comparison Calculator — Salary Needed",
    metaDescription: "Free cost of living calculator. See the salary needed in a new city or country, how a job offer compares, and the difference in rent.",
    calcInputs: [
      currencyField("salary", "Current Salary", { default: 75000, max: 100000000, step: 1000 }),
      numberField("currentIndex", "Current City Cost-of-Living Index", { default: 100, min: 1, max: 1000, step: 1 }),
      numberField("newIndex", "New City Cost-of-Living Index", { default: 125, min: 1, max: 1000, step: 1 }),
      currencyField("offeredSalary", "Salary Offered in the New City", { default: 90000, max: 100000000, step: 1000, required: false }),
      currencyField("currentRent", "Current Rent", { default: 1600, max: 1000000, step: 25, required: false }),
      currencyField("newRent", "Rent in the New City", { default: 2300, max: 1000000, step: 25, required: false }),
    ],
    calcResult: { label: "Equivalent Salary", format: "currency" },
    calcResults: [
      { key: "equivalentSalary", label: "Equivalent Salary", format: "currency", highlight: true },
      { key: "raiseNeededPercent", label: "Raise Needed", format: "percentage" },
      { key: "offerVsEquivalent", label: "Offer vs Equivalent Salary", format: "currency" },
      { key: "monthlyRentDifference", label: "Monthly Rent Difference", format: "currency" },
      { key: "yearlyRentDifference", label: "Yearly Rent Difference", format: "currency" },
    ],
    instructions:
      "Cost-of-living indexes (from sources such as the Council for Community and Economic Research, Numbeo or BEA regional " +
      "price parities) compare prices between places — 100 is average. The equivalent salary is what you'd need to keep " +
      "the same standard of living. For a move abroad, use an international index and convert the result to local " +
      "currency.\n\n" +
      "Housing drives most of the difference, so the rent comparison is shown separately. Taxes also differ by state and " +
      "country.",
    examples:
      "Example: moving from an index of 100 to 125 means $75,000 would need to become $93,750 — a " +
      "25% raise. A $90,000 offer falls $3,750 short, and rent rises $700 " +
      "a month.",
    assumptions:
      "Overall index applies to your whole budget; taxes not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does my experience differ from the index?",
        answer: "Indexes reflect an average household's spending. If you rent while most locals own, or don't need a car, your real difference can be larger or smaller.",
      },
    ],
  },
  {
    slug: "cost-of-living-adjustment-calculator",
    title: "Cost of Living Adjustment Calculator",
    description: "See what a cost-of-living adjustment (COLA) does to your pay, pension or Social Security, and whether it keeps up with actual inflation.",
    metaTitle: "COLA Calculator — Cost of Living Adjustment Raise",
    metaDescription: "Free COLA calculator. See your new pay or benefit after a cost-of-living adjustment and whether it keeps up with inflation.",
    calcInputs: [
      currencyField("currentPay", "Current Yearly Pay or Benefit", { default: 60000, max: 100000000, step: 500 }),
      percentField("colaPercent", "COLA", { default: 2.8, min: -5, max: 20, step: 0.1 }),
      percentField("inflationPercent", "Your Actual Inflation", { default: 3, min: -5, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "New Pay", format: "currency" },
    calcResults: [
      { key: "newPay", label: "New Pay", format: "currency", highlight: true },
      { key: "yearlyIncrease", label: "Yearly Increase", format: "currency" },
      { key: "monthlyIncrease", label: "Monthly Increase", format: "currency" },
      { key: "realChangePercent", label: "Real Change After Inflation", format: "percentage" },
      { key: "payNeededToKeepUp", label: "Pay Needed to Keep Up", format: "currency" },
    ],
    instructions:
      "A cost-of-living adjustment raises pay or benefits to offset inflation. Social Security's COLA is based on the " +
      "CPI-W (2.8% for 2026); many pensions and union contracts have their own. Compare it with the inflation you actually " +
      "face — a negative real change means your buying power fell.\n\n" +
      "For Social Security, enter your yearly benefit (monthly × 12).",
    examples:
      "Example: a 2.80% COLA raises $60,000 to $61,680 — $140 more a month. With 3% " +
      "inflation, that's a real change of -0.19%; keeping up fully would take $61,800.",
    assumptions:
      "Before tax; Medicare premium increases can absorb part of a Social Security COLA. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a COLA the same as a raise?",
        answer: "A COLA only keeps pace with prices; a merit raise increases your real income. A COLA below inflation is effectively a pay cut.",
      },
    ],
  },
  {
    slug: "living-wage-calculator",
    title: "Living Wage Calculator",
    description: "Work out the income and hourly wage a household needs to cover basic costs — housing, food, childcare, transportation and health care — compared with the minimum wage.",
    metaTitle: "Living Wage Calculator — Hourly Wage to Cover Basics",
    metaDescription: "Free living wage calculator. Find the pre-tax income and hourly wage needed to cover basic household costs, compared with the minimum wage.",
    calcInputs: [
      currencyField("housing", "Housing per Month", { default: 1400, max: 1000000, step: 25 }),
      currencyField("food", "Food per Month", { default: 650, max: 1000000, step: 25 }),
      currencyField("childcare", "Childcare per Month", { default: 800, max: 1000000, step: 25, required: false }),
      currencyField("transportation", "Transportation per Month", { default: 450, max: 1000000, step: 25 }),
      currencyField("health", "Health Care per Month", { default: 400, max: 1000000, step: 25 }),
      currencyField("other", "Other Necessities per Month", { default: 400, max: 1000000, step: 25 }),
      percentField("taxPercent", "Taxes (% of Gross Pay)", { default: 15, max: 60, step: 1 }),
      numberField("workingAdults", "Working Adults", { default: 1, min: 1, max: 4, step: 1 }),
      currencyField("minimumWage", "Local Minimum Wage", { default: 15, max: 100, step: 0.25 }),
    ],
    calcResult: { label: "Living Wage per Hour", format: "currency" },
    calcResults: [
      { key: "yearlyCostsAfterTax", label: "Yearly Basic Costs", format: "currency" },
      { key: "preTaxIncomeNeeded", label: "Pre-Tax Income Needed", format: "currency" },
      { key: "livingWagePerHour", label: "Living Wage per Hour (per Working Adult)", format: "currency", highlight: true },
      { key: "gapVsMinimumWage", label: "Above the Minimum Wage by", format: "currency" },
    ],
    instructions:
      "A living wage covers a household's basic needs without public assistance — unlike the minimum wage ($7.25 federally, " +
      "higher in many states and cities). Enter bare-bones monthly costs for your area; MIT's Living Wage Calculator " +
      "publishes typical figures by county and family type.\n\n" +
      "The hourly figure assumes full-time work (2,080 hours a year) for each working adult.",
    examples:
      "Example: basic costs of $49,200 a year need $57,882.35 before tax — $27.83 an hour for " +
      "one full-time worker, $12.83 more than a $15 minimum wage.",
    assumptions:
      "No savings or discretionary spending included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a living wage the same everywhere?",
        answer: "No — housing and childcare costs make it vary widely by county, and it rises with each child in the household.",
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
