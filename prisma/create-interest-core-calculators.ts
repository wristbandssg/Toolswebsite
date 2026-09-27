// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Interest Calculators" sub-batch A (Compounding Frequency &
// Simple Interest). Part of the Interest_Calculators_Topical_Map_Tool_
// List.xlsx build-out (34 tools total; see calc-engine-interest-core.ts
// header for the 3 skipped duplicates and the other 2 sub-batches —
// create-interest-rates-calculators.ts and create-interest-analysis-
// calculators.ts). Filed under the existing "Interest Calculators"
// category (interest-calculators), which was created empty by
// reparent-tool-categories-under-finance.ts and is populated here for the
// first time.
//
// Skipped as duplicates of tools already built earlier this session:
//   - Simple Interest Calculator    (simple-interest-calculator, Investment batch)
//   - Compound Interest Calculator  (compound-interest-calculator, Investment batch)
//   - APY Calculator                (apy-calculator, Savings batch)
//
// See src/lib/calc-engine-interest-core.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-interest-core-calculators.ts
// or
//   npm run db:create-interest-core-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "interest-calculators";

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

function compoundingFrequencyField(defaultValue = 12) {
  return {
    key: "compoundingFrequency",
    label: "Compounding Frequency",
    type: "dropdown",
    required: true,
    default: defaultValue,
    options: [
      { label: "Daily", value: 365 },
      { label: "Monthly", value: 12 },
      { label: "Quarterly", value: 4 },
      { label: "Semi-Annually", value: 2 },
      { label: "Annually", value: 1 },
    ],
  };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't financial advice. " +
  "Actual rates and terms vary by account and lender — check with your bank or lender for figures specific " +
  "to your situation.";

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
    slug: "interest-calculator",
    title: "Interest Calculator",
    description: "See simple interest and compound interest side by side for the same principal, rate, and term.",
    metaTitle: "Interest Calculator — Free & Instant",
    metaDescription: "Free interest calculator. Enter your principal, rate, term, and compounding frequency to compare simple interest against compound interest.",
    calcInputs: [
      currencyField("principal", "Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 6, max: 30, step: 0.05 }),
      numberField("years", "Term (Years)", { default: 5, min: 1, max: 50, step: 1 }),
      compoundingFrequencyField(12),
    ],
    calcResult: { label: "Compound Ending Balance", format: "currency" },
    calcResults: [
      { key: "simpleInterest", label: "Simple Interest", format: "currency" },
      { key: "simpleEndingBalance", label: "Simple Interest Ending Balance", format: "currency" },
      { key: "compoundInterest", label: "Compound Interest", format: "currency", highlight: true },
      { key: "compoundEndingBalance", label: "Compound Interest Ending Balance", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your principal, annual interest rate, term in years, and how often interest compounds. The result " +
      "shows both the simple-interest and compound-interest outcomes side by side, so you can see exactly how " +
      "much compounding adds over the simple-interest baseline.",
    examples: "Example: $10,000 at 6% for 5 years compounded monthly earns $3,488.50 in compound interest versus $3,000.00 in simple interest — a $488.50 difference from compounding alone.",
    assumptions:
      "Compound interest assumes the rate compounds at the selected frequency with no additional deposits or " +
      "withdrawals. Simple interest is calculated on the original principal only, for the full term. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why show both simple and compound interest?",
        answer: "Comparing them side by side makes it clear how much extra return (or cost, for a loan) comes purely from compounding rather than from the rate itself — the gap grows with a longer term or more frequent compounding.",
      },
      {
        question: "Which one applies to my savings account or loan?",
        answer: "Most savings accounts, CDs, and loans use compound interest. Simple interest is more common for short-term loans or certain bonds. Check your account terms or loan agreement to confirm.",
      },
    ],
  },
  {
    slug: "daily-compound-interest-calculator",
    title: "Daily Compound Interest Calculator",
    description: "Calculate the ending balance and interest earned when interest compounds daily.",
    metaTitle: "Daily Compound Interest Calculator — Free & Instant",
    metaDescription: "Free daily compound interest calculator. Enter your principal, annual rate, and term to see your ending balance with daily compounding.",
    calcInputs: [
      currencyField("principal", "Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 6, max: 30, step: 0.05 }),
      numberField("years", "Term (Years)", { default: 5, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Ending Balance", format: "currency" },
    calcResults: [
      { key: "endingBalance", label: "Ending Balance", format: "currency", highlight: true },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
    ],
    instructions:
      "Enter your principal, annual interest rate, and term in years. Interest is compounded daily (365 times " +
      "a year), which is the most frequent common compounding schedule and produces slightly more interest than " +
      "monthly or quarterly compounding at the same stated rate.",
    examples: "Example: $10,000 at 6% for 5 years compounded daily grows to $13,498.26 — $3,498.26 in interest.",
    assumptions:
      "Assumes a fixed annual rate compounding daily (n = 365) with no additional deposits or withdrawals. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much more does daily compounding earn versus monthly?",
        answer: "The difference is usually small — a few dollars per thousand over several years — since daily compounding (n=365) is close to the mathematical limit of continuous compounding, but it's always slightly more than monthly (n=12) at the same stated rate.",
      },
    ],
  },
  {
    slug: "monthly-compound-interest-calculator",
    title: "Monthly Compound Interest Calculator",
    description: "Calculate the ending balance and interest earned when interest compounds monthly.",
    metaTitle: "Monthly Compound Interest Calculator — Free & Instant",
    metaDescription: "Free monthly compound interest calculator. Enter your principal, annual rate, and term to see your ending balance with monthly compounding.",
    calcInputs: [
      currencyField("principal", "Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 6, max: 30, step: 0.05 }),
      numberField("years", "Term (Years)", { default: 5, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Ending Balance", format: "currency" },
    calcResults: [
      { key: "endingBalance", label: "Ending Balance", format: "currency", highlight: true },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
    ],
    instructions:
      "Enter your principal, annual interest rate, and term in years. Interest is compounded monthly (12 times " +
      "a year) — the most common compounding schedule for savings accounts, CDs, and many loans.",
    examples: "Example: $10,000 at 6% for 5 years compounded monthly grows to $13,488.50 — $3,488.50 in interest.",
    assumptions:
      "Assumes a fixed annual rate compounding monthly (n = 12) with no additional deposits or withdrawals. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is monthly compounding standard?",
        answer: "Yes — most bank savings products and installment loans compound monthly, which is why this is often the default assumption when a rate is quoted without specifying a compounding frequency.",
      },
    ],
  },
  {
    slug: "quarterly-compound-interest-calculator",
    title: "Quarterly Compound Interest Calculator",
    description: "Calculate the ending balance and interest earned when interest compounds quarterly.",
    metaTitle: "Quarterly Compound Interest Calculator — Free & Instant",
    metaDescription: "Free quarterly compound interest calculator. Enter your principal, annual rate, and term to see your ending balance with quarterly compounding.",
    calcInputs: [
      currencyField("principal", "Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 6, max: 30, step: 0.05 }),
      numberField("years", "Term (Years)", { default: 5, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Ending Balance", format: "currency" },
    calcResults: [
      { key: "endingBalance", label: "Ending Balance", format: "currency", highlight: true },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
    ],
    instructions:
      "Enter your principal, annual interest rate, and term in years. Interest is compounded quarterly (4 times " +
      "a year) — common for certain bonds, CDs, and some brokerage cash accounts.",
    examples: "Example: $10,000 at 6% for 5 years compounded quarterly grows to $13,468.55 — $3,468.55 in interest.",
    assumptions:
      "Assumes a fixed annual rate compounding quarterly (n = 4) with no additional deposits or withdrawals. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is quarterly compounding lower than monthly?",
        answer: "Less frequent compounding means interest is added to the balance fewer times per year, so there's less \"interest on interest\" building up — quarterly (n=4) will always earn slightly less than monthly (n=12) at the same stated rate.",
      },
    ],
  },
  {
    slug: "semiannual-compound-interest-calculator",
    title: "Semiannual Compound Interest Calculator",
    description: "Calculate the ending balance and interest earned when interest compounds twice a year.",
    metaTitle: "Semiannual Compound Interest Calculator — Free & Instant",
    metaDescription: "Free semiannual compound interest calculator. Enter your principal, annual rate, and term to see your ending balance with semiannual compounding.",
    calcInputs: [
      currencyField("principal", "Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 6, max: 30, step: 0.05 }),
      numberField("years", "Term (Years)", { default: 5, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Ending Balance", format: "currency" },
    calcResults: [
      { key: "endingBalance", label: "Ending Balance", format: "currency", highlight: true },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
    ],
    instructions:
      "Enter your principal, annual interest rate, and term in years. Interest is compounded semiannually (twice " +
      "a year) — the standard schedule for U.S. Treasury bonds and many corporate bonds.",
    examples: "Example: $10,000 at 6% for 5 years compounded semiannually grows to $13,439.16 — $3,439.16 in interest.",
    assumptions:
      "Assumes a fixed annual rate compounding semiannually (n = 2) with no additional deposits or withdrawals. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Where does semiannual compounding show up?",
        answer: "It's the standard convention for bond coupon payments, including U.S. Treasury and most corporate bonds, even when the bond's stated annual rate is quoted as a single yearly figure.",
      },
    ],
  },
  {
    slug: "annual-compound-interest-calculator",
    title: "Annual Compound Interest Calculator",
    description: "Calculate the ending balance and interest earned when interest compounds once a year.",
    metaTitle: "Annual Compound Interest Calculator — Free & Instant",
    metaDescription: "Free annual compound interest calculator. Enter your principal, annual rate, and term to see your ending balance with annual compounding.",
    calcInputs: [
      currencyField("principal", "Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 6, max: 30, step: 0.05 }),
      numberField("years", "Term (Years)", { default: 5, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Ending Balance", format: "currency" },
    calcResults: [
      { key: "endingBalance", label: "Ending Balance", format: "currency", highlight: true },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
    ],
    instructions:
      "Enter your principal, annual interest rate, and term in years. Interest is compounded annually (once a " +
      "year) — the simplest compounding schedule, and the one that produces the lowest ending balance of any " +
      "compounding frequency at the same stated rate.",
    examples: "Example: $10,000 at 6% for 5 years compounded annually grows to $13,382.26 — $3,382.26 in interest.",
    assumptions:
      "Assumes a fixed annual rate compounding once per year (n = 1) with no additional deposits or withdrawals. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is annual compounding worse for savers?",
        answer: "Yes — for the exact same stated annual rate, more frequent compounding (monthly, daily) always produces a higher ending balance than annual compounding, because interest starts earning its own interest sooner.",
      },
    ],
  },
  {
    slug: "continuous-compound-interest-calculator",
    title: "Continuous Compound Interest Calculator",
    description: "Calculate the ending balance using continuous compounding — the mathematical limit as compounding frequency approaches infinity.",
    metaTitle: "Continuous Compound Interest Calculator — Free & Instant",
    metaDescription: "Free continuous compound interest calculator. Enter your principal, annual rate, and term to see your ending balance with continuous compounding (P·e^rt).",
    calcInputs: [
      currencyField("principal", "Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 6, max: 30, step: 0.05 }),
      numberField("years", "Term (Years)", { default: 5, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Ending Balance", format: "currency" },
    calcResults: [
      { key: "endingBalance", label: "Ending Balance", format: "currency", highlight: true },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
    ],
    instructions:
      "Enter your principal, annual interest rate, and term in years. This tool uses the continuous-compounding " +
      "formula, Balance = Principal × e^(rate × years) — the theoretical limit as compounding frequency " +
      "increases without bound, used in some academic and options-pricing contexts.",
    examples: "Example: $10,000 at 6% for 5 years compounded continuously grows to $13,498.59 — $3,498.59 in interest, just slightly more than daily compounding.",
    assumptions:
      "Assumes a fixed annual rate compounding continuously, using Euler's number (e ≈ 2.71828). No additional " +
      "deposits or withdrawals. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does any real account actually compound continuously?",
        answer: "Not exactly — daily compounding (used by most banks) is already extremely close to the continuous-compounding result. Continuous compounding is mainly a theoretical benchmark used in finance formulas and academic contexts.",
      },
    ],
  },
  {
    slug: "daily-interest-calculator",
    title: "Daily Interest Calculator",
    description: "Calculate simple interest using a daily interest rate and a number of days.",
    metaTitle: "Daily Interest Calculator — Free & Instant",
    metaDescription: "Free daily interest calculator. Enter your principal, daily interest rate, and number of days to see simple interest earned.",
    calcInputs: [
      currencyField("principal", "Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("dailyRatePercent", "Daily Interest Rate", { default: 0.02, max: 5, step: 0.001 }),
      numberField("days", "Number of Days", { default: 365, min: 1, max: 20000, step: 1 }),
    ],
    calcResult: { label: "Interest Earned", format: "currency" },
    calcResults: [
      { key: "interestEarned", label: "Interest Earned", format: "currency", highlight: true },
      { key: "endingBalance", label: "Ending Balance", format: "currency" },
    ],
    instructions:
      "Enter your principal, a daily interest rate, and the number of days. This calculates straightforward " +
      "simple interest (no compounding) using a rate that's already expressed per day, rather than converting " +
      "down from an annual rate.",
    examples: "Example: $10,000 at a 0.02% daily rate for 365 days earns $730.00 in simple interest.",
    assumptions:
      "Simple interest only — interest is not added back to the principal to earn further interest. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "I only have an annual rate — how do I get a daily rate?",
        answer: "Use the Daily Interest Rate Calculator to convert an annual rate into a daily rate first (it also lets you choose a 365- or 360-day basis), then enter that result here.",
      },
    ],
  },
  {
    slug: "monthly-interest-calculator",
    title: "Monthly Interest Calculator",
    description: "Calculate simple interest using a monthly interest rate and a number of months.",
    metaTitle: "Monthly Interest Calculator — Free & Instant",
    metaDescription: "Free monthly interest calculator. Enter your principal, monthly interest rate, and number of months to see simple interest earned.",
    calcInputs: [
      currencyField("principal", "Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("monthlyRatePercent", "Monthly Interest Rate", { default: 0.5, max: 20, step: 0.01 }),
      numberField("months", "Number of Months", { default: 24, min: 1, max: 600, step: 1 }),
    ],
    calcResult: { label: "Interest Earned", format: "currency" },
    calcResults: [
      { key: "interestEarned", label: "Interest Earned", format: "currency", highlight: true },
      { key: "endingBalance", label: "Ending Balance", format: "currency" },
    ],
    instructions:
      "Enter your principal, a monthly interest rate, and the number of months. This calculates straightforward " +
      "simple interest (no compounding) using a rate that's already expressed per month.",
    examples: "Example: $10,000 at a 0.5% monthly rate for 24 months earns $1,200.00 in simple interest.",
    assumptions:
      "Simple interest only — interest is not added back to the principal to earn further interest. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "I only have an annual rate — how do I get a monthly rate?",
        answer: "Use the Monthly Interest Rate Calculator to convert an annual rate into a monthly rate first, then enter that result here.",
      },
    ],
  },
  {
    slug: "annual-interest-calculator",
    title: "Annual Interest Calculator",
    description: "Calculate simple interest using an annual interest rate and a number of years.",
    metaTitle: "Annual Interest Calculator — Free & Instant",
    metaDescription: "Free annual interest calculator. Enter your principal, annual interest rate, and number of years to see simple interest earned.",
    calcInputs: [
      currencyField("principal", "Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 6, max: 30, step: 0.05 }),
      numberField("years", "Number of Years", { default: 5, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Interest Earned", format: "currency" },
    calcResults: [
      { key: "interestEarned", label: "Interest Earned", format: "currency", highlight: true },
      { key: "endingBalance", label: "Ending Balance", format: "currency" },
    ],
    instructions:
      "Enter your principal, annual interest rate, and number of years. This calculates straightforward simple " +
      "interest (no compounding) for the whole term at once.",
    examples: "Example: $10,000 at a 6% annual rate for 5 years earns $3,000.00 in simple interest.",
    assumptions:
      "Simple interest only — interest is not added back to the principal to earn further interest. For a " +
      "compounding version of this same scenario, see the Annual Compound Interest Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the Annual Compound Interest Calculator?",
        answer: "This tool calculates simple interest — a fixed amount each year based only on the original principal. The Annual Compound Interest Calculator instead adds each year's interest back to the balance, so later years earn interest on a growing amount.",
      },
    ],
  },
  {
    slug: "simple-vs-compound-interest-calculator",
    title: "Simple vs Compound Interest Calculator",
    description: "Compare simple interest against annually-compounded interest for the same principal, rate, and term.",
    metaTitle: "Simple vs Compound Interest Calculator — Free & Instant",
    metaDescription: "Free simple vs compound interest calculator. Enter your principal, rate, and term to see the difference between simple and compound interest.",
    calcInputs: [
      currencyField("principal", "Principal", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Annual Interest Rate", { default: 6, max: 30, step: 0.05 }),
      numberField("years", "Term (Years)", { default: 5, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Difference (Compound − Simple)", format: "currency" },
    calcResults: [
      { key: "simpleInterest", label: "Simple Interest", format: "currency" },
      { key: "simpleEndingBalance", label: "Simple Interest Ending Balance", format: "currency" },
      { key: "compoundInterest", label: "Compound Interest (Annual)", format: "currency" },
      { key: "compoundEndingBalance", label: "Compound Interest Ending Balance", format: "currency" },
      { key: "difference", label: "Difference (Compound − Simple)", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your principal, annual interest rate, and term in years. This tool fixes compounding to once a " +
      "year, keeping the comparison focused purely on simple versus compound interest as concepts, rather than " +
      "on compounding frequency (use the general Interest Calculator above if you want to also choose a " +
      "compounding frequency).",
    examples: "Example: $10,000 at 6% for 5 years earns $3,000.00 in simple interest versus $3,382.26 in annually-compounded interest — a $382.26 difference.",
    assumptions:
      "Compound interest here uses annual compounding (n = 1) specifically, for a clean textbook-style " +
      "comparison. No additional deposits or withdrawals. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does compound interest always win?",
        answer: "Because compound interest adds each period's interest back to the balance, so future interest is calculated on a larger amount — the longer the term or the higher the rate, the bigger this gap grows compared to simple interest on the original principal alone.",
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
