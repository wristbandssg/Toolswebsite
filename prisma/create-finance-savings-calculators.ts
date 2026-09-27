// One-time (but safe to re-run) batch setup script: creates the 5 tools of
// the "Savings Calculators" batch. Last of 8 new topic batches built from
// Finance_Calculators_Topical_SEO_Master.xlsx. Filed under the existing
// "Savings Calculators" category (savings-calculators), created empty by
// reparent-tool-categories-under-finance.ts and populated here for the
// first time.
//
// See src/lib/calc-engine-finance-savings.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-finance-savings-calculators.ts
// or
//   npm run db:create-finance-savings-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "savings-calculators";

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
  "This tool provides general estimates for informational purposes only and isn't financial advice. Actual " +
  "bank and credit union rates vary and change over time — check your institution's current rate.";

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
  {
    slug: "savings-calculator",
    title: "Savings Calculator",
    description: "Project how much a savings account will grow with an initial deposit, regular monthly deposits, and an interest rate.",
    metaTitle: "Savings Calculator — Free & Instant",
    metaDescription: "Free savings calculator. Enter your initial deposit, monthly deposit, and interest rate to see your projected savings balance.",
    calcInputs: [
      currencyField("initialDeposit", "Initial Deposit", { default: 5000, max: 100000000, step: 100 }),
      currencyField("monthlyDeposit", "Monthly Deposit", { default: 200, max: 1000000, step: 25 }),
      percentField("annualInterestRatePercent", "Annual Interest Rate (APY)", { default: 4, max: 20, step: 0.05 }),
      numberField("years", "Years", { default: 5, min: 0, max: 60, step: 1 }),
    ],
    calcResult: { label: "Projected Balance", format: "currency" },
    calcResults: [
      { key: "futureValue", label: "Projected Balance", format: "currency", highlight: true },
      { key: "totalContributions", label: "Total Deposits", format: "currency" },
      { key: "totalInterest", label: "Total Interest Earned", format: "currency" },
    ],
    instructions:
      "Enter your initial deposit, how much you plan to deposit each month, your account's annual interest " +
      "rate (APY), and the number of years you plan to save. The result projects your balance, split out by " +
      "how much came from your own deposits versus interest earned, assuming monthly compounding.",
    examples: "Example: a $5,000 initial deposit plus $200/month for 5 years at a 4% APY grows to $19,364.78 — $17,000.00 from deposits and $2,364.78 from interest.",
    assumptions:
      "This assumes a constant monthly deposit and a constant interest rate compounded monthly — real savings " +
      "account rates are variable and can change at any time, and many people adjust how much they deposit over " +
      "time. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between this and the Investment Calculator?",
        answer: "This tool is designed around a typical bank savings account — a fixed, published interest rate (APY) with essentially no risk to principal. The Investment Calculator is meant for market-based investments (like a brokerage account), where the \"expected return\" reflects historical or projected market performance rather than a guaranteed bank rate, and carries real risk of loss.",
      },
      {
        question: "Does this account for compounding frequency other than monthly?",
        answer: "This tool compounds monthly, which is common for many savings accounts. If your bank compounds daily, your actual growth may be very slightly higher than shown here — the CD Calculator lets you choose a compounding frequency explicitly if you need that precision.",
      },
    ],
  },
  {
    slug: "emergency-fund-calculator",
    title: "Emergency Fund Calculator",
    description: "Calculate your emergency fund target based on your monthly expenses, and how many months it will take to reach it.",
    metaTitle: "Emergency Fund Calculator — Free & Instant",
    metaDescription: "Free emergency fund calculator. Enter your monthly expenses and current savings to see your emergency fund target and how long it will take to reach it.",
    calcInputs: [
      currencyField("monthlyExpenses", "Monthly Essential Expenses", { default: 3000, max: 1000000, step: 50 }),
      numberField("monthsOfCoverage", "Months of Coverage Desired", { default: 6, min: 1, max: 24, step: 1 }),
      currencyField("currentSavings", "Current Emergency Savings", { default: 5000, max: 100000000, step: 100 }),
      currencyField("monthlyContribution", "Monthly Contribution Toward Goal", { default: 300, max: 1000000, step: 25 }),
    ],
    calcResult: { label: "Emergency Fund Target", format: "currency" },
    calcResults: [
      { key: "targetAmount", label: "Emergency Fund Target", format: "currency", highlight: true },
      { key: "amountStillNeeded", label: "Amount Still Needed", format: "currency" },
      { key: "monthsToGoal", label: "Months To Reach Goal", format: "number" },
    ],
    instructions:
      "Enter your monthly essential expenses (rent/mortgage, utilities, food, insurance, minimum debt payments " +
      "— the costs you'd need to cover even without income), how many months of coverage you want (3-6 months " +
      "is a commonly cited range, though your own job stability and dependents may call for more or less), your " +
      "current emergency savings, and how much you can contribute monthly. The result shows your target amount, " +
      "how much more you need, and how many months it will take at your current contribution rate.",
    examples: "Example: $3,000/month expenses with 6 months of desired coverage sets an $18,000.00 target — with $5,000.00 already saved, $13,000.00 is still needed, reachable in 44 months at $300.00/month.",
    assumptions:
      "This is a simple linear savings projection — it doesn't include any interest earned on the growing " +
      "balance (a reasonable simplification for a short-term goal, since emergency funds are typically kept in " +
      "easily accessible, low-yield accounts rather than invested). It also doesn't account for you needing to " +
      "dip into the fund before reaching your goal. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How many months of expenses should I save?",
        answer: "3-6 months of essential expenses is a commonly cited general guideline, but your own circumstances matter — those with variable income, dependents, or less job security often aim higher (6-12 months), while dual-income households with very stable jobs sometimes aim lower.",
      },
      {
        question: "Should I include all my expenses, or just essential ones?",
        answer: "Most guidance focuses on essential expenses only — housing, utilities, food, insurance, minimum debt payments, and other costs you couldn't easily cut in a real emergency — rather than discretionary spending like entertainment or dining out, which you'd likely reduce anyway if income stopped.",
      },
    ],
  },
  {
    slug: "savings-goal-calculator",
    title: "Savings Goal Calculator",
    description: "Calculate the monthly deposit needed to reach a specific savings goal by a target date.",
    metaTitle: "Savings Goal Calculator — Free & Instant",
    metaDescription: "Free savings goal calculator. Enter your goal amount, current savings, and timeline to see the monthly deposit needed to reach it.",
    calcInputs: [
      currencyField("goalAmount", "Savings Goal Amount", { default: 20000, max: 100000000, step: 500 }),
      currencyField("currentSavings", "Current Savings Toward Goal", { default: 2000, max: 100000000, step: 100 }),
      numberField("monthsToGoal", "Months Until Goal Date", { default: 24, min: 1, max: 600, step: 1 }),
      percentField("annualInterestRatePercent", "Annual Interest Rate (APY)", { default: 3, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "Required Monthly Deposit", format: "currency" },
    calcResults: [
      { key: "requiredMonthlyDeposit", label: "Required Monthly Deposit", format: "currency", highlight: true },
      { key: "totalDeposits", label: "Total Deposits Over The Period", format: "currency" },
    ],
    instructions:
      "Enter your savings goal amount, how much you've already saved toward it, how many months until your " +
      "target date, and the annual interest rate (APY) your savings will earn along the way. The result shows " +
      "the fixed monthly deposit needed to reach your goal exactly on time.",
    examples: "Example: a $20,000 goal with $2,000 already saved, 24 months to go, earning 3% APY, requires a $723.66 monthly deposit.",
    assumptions:
      "This solves for a constant monthly deposit assuming a constant interest rate compounded monthly — if " +
      "your rate changes or you miss a deposit, you'll need to adjust the plan. If your current savings alone " +
      "(with growth) will already exceed your goal by the target date, the required monthly deposit shown is " +
      "$0.00. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if the required monthly deposit shows $0.00?",
        answer: "That means your current savings, left to grow at the entered interest rate, are already projected to reach (or exceed) your goal by the target date without any additional deposits.",
      },
      {
        question: "How is this different from the Savings Calculator?",
        answer: "The Savings Calculator projects a future balance from deposits you specify. This tool works in the opposite direction — you specify the goal and timeline, and it solves for the monthly deposit you'd need to get there.",
      },
    ],
  },
  {
    slug: "cd-calculator",
    title: "CD Calculator",
    description: "Calculate the maturity value and interest earned on a certificate of deposit (CD).",
    metaTitle: "CD Calculator — Free & Instant",
    metaDescription: "Free CD (certificate of deposit) calculator. Enter your deposit amount, APY, and term to see your maturity value and interest earned.",
    calcInputs: [
      currencyField("depositAmount", "Deposit Amount", { default: 10000, max: 100000000, step: 500 }),
      percentField("apyPercent", "APY (Annual Percentage Yield)", { default: 4.5, max: 20, step: 0.05 }),
      numberField("termMonths", "Term (Months)", { default: 12, min: 1, max: 120, step: 1 }),
      { key: "compoundingFrequency", label: "Compounding Frequency", type: "dropdown", required: true, default: 12, options: [
        { label: "Daily", value: 365 },
        { label: "Monthly", value: 12 },
        { label: "Quarterly", value: 4 },
        { label: "Annually", value: 1 },
      ] },
    ],
    calcResult: { label: "Maturity Value", format: "currency" },
    calcResults: [
      { key: "futureValue", label: "Maturity Value", format: "currency", highlight: true },
      { key: "interestEarned", label: "Total Interest Earned", format: "currency" },
    ],
    instructions:
      "Enter your deposit amount, the CD's APY, its term in months, and its compounding frequency (check your " +
      "CD's disclosure — monthly and daily are both common). The result shows the value at maturity and the " +
      "total interest earned over the term.",
    examples: "Example: a $10,000 deposit at a 4.5% APY for a 12-month term, compounded monthly, matures to $10,459.40 — $459.40 in interest earned.",
    assumptions:
      "This assumes the CD's rate stays fixed for the entire term (typical for most standard CDs) and that no " +
      "funds are withdrawn early. Early withdrawal from a CD typically incurs a penalty (often a forfeiture of " +
      "some months of interest) not modeled here — check your CD's specific terms. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens if I withdraw from a CD early?",
        answer: "Most CDs charge an early withdrawal penalty, commonly a forfeiture of a certain number of months' worth of interest — the exact penalty varies by institution and CD term, so check your specific CD's disclosure documents. This calculator assumes the CD is held to maturity.",
      },
      {
        question: "Does compounding frequency make a big difference?",
        answer: "For a given APY, compounding frequency actually makes little practical difference — APY (unlike APR) is already defined as the effective annual rate after compounding, so a 4.5% APY compounded daily versus monthly produces nearly identical results over a typical CD term.",
      },
    ],
  },
  {
    slug: "apy-calculator",
    title: "APY Calculator",
    description: "Convert a stated nominal interest rate and compounding frequency into its effective Annual Percentage Yield (APY).",
    metaTitle: "APY Calculator — Free & Instant",
    metaDescription: "Free APY calculator. Enter a nominal interest rate and compounding frequency to see the effective Annual Percentage Yield.",
    calcInputs: [
      percentField("nominalRatePercent", "Nominal Interest Rate (APR)", { default: 5, max: 30, step: 0.05 }),
      { key: "compoundingFrequency", label: "Compounding Frequency", type: "dropdown", required: true, default: 12, options: [
        { label: "Daily", value: 365 },
        { label: "Monthly", value: 12 },
        { label: "Quarterly", value: 4 },
        { label: "Semi-Annually", value: 2 },
        { label: "Annually", value: 1 },
      ] },
      currencyField("depositAmount", "Illustrative Deposit Amount", { default: 10000, max: 100000000, step: 500 }),
    ],
    calcResult: { label: "Effective APY", format: "percentage" },
    calcResults: [
      { key: "apyPercent", label: "Effective APY", format: "percentage", highlight: true },
      { key: "annualInterestOnDeposit", label: "Illustrative Annual Interest", format: "currency" },
    ],
    instructions:
      "Enter the nominal interest rate (sometimes shown as APR — the stated rate before accounting for " +
      "compounding) and how often interest compounds. The result shows the effective Annual Percentage Yield " +
      "(APY) — the rate that accounts for compounding, which is always equal to or higher than the nominal rate " +
      "— along with an illustrative dollar interest amount on the deposit you enter.",
    examples: "Example: a 5% nominal rate compounded monthly has an effective APY of 5.1162% — on a $10,000 deposit, that's about $511.62 in interest over a year.",
    assumptions:
      "APY is the standard way banks are required to disclose deposit account yields, precisely because it " +
      "makes rates with different compounding frequencies directly comparable — a higher nominal rate compounded " +
      "less often can sometimes yield less than a lower nominal rate compounded more often. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between APR and APY?",
        answer: "APR (nominal rate) is the stated annual rate before accounting for compounding. APY (effective annual yield) accounts for how often that rate compounds within the year, so it's always equal to or slightly higher than the APR — APY is the figure banks are generally required to disclose for savings products since it allows an apples-to-apples comparison.",
      },
      {
        question: "Why does compounding frequency increase my effective rate?",
        answer: "Because more frequent compounding means interest starts earning interest on itself sooner within the year — daily compounding earns slightly more than monthly, which earns slightly more than quarterly, for the same nominal rate, though the practical difference is usually small.",
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
