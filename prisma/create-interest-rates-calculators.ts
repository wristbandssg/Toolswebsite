// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Interest Calculators" sub-batch B (Rate Conversions — APR/APY/
// Nominal/Effective). Part of the Interest_Calculators_Topical_Map_Tool_
// List.xlsx build-out — see create-interest-core-calculators.ts for the
// full batch context and the 3 skipped duplicates.
//
// See src/lib/calc-engine-interest-rates.ts for the math and for notes
// on how these tools are deliberately differentiated from the
// pre-existing APY Calculator (Savings batch).
//
// HOW TO RUN
//   npx tsx prisma/create-interest-rates-calculators.ts
// or
//   npm run db:create-interest-rates-calculators

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
  "This tool provides general estimates for informational purposes only and isn't financial advice. " +
  "Actual rates and disclosure conventions vary by account, lender, and jurisdiction — check with your bank " +
  "or lender for figures specific to your situation.";

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
    slug: "interest-rate-calculator",
    title: "Interest Rate Calculator",
    description: "Solve for the simple interest rate given a principal, interest amount, and time period.",
    metaTitle: "Interest Rate Calculator — Free & Instant",
    metaDescription: "Free interest rate calculator. Enter your principal, interest amount, and time period to solve for the simple interest rate.",
    calcInputs: [
      currencyField("principal", "Principal", { default: 10000, max: 100000000, step: 500 }),
      currencyField("interestAmount", "Interest Amount", { default: 3000, max: 100000000, step: 50 }),
      numberField("years", "Time Period (Years)", { default: 5, min: 0.1, max: 50, step: 0.1 }),
    ],
    calcResult: { label: "Interest Rate", format: "percentage" },
    calcResults: [],
    instructions:
      "Enter the principal amount, the total interest amount, and the time period in years. This solves the " +
      "simple interest formula backward for the rate — useful when you know how much interest was charged or " +
      "earned but not the rate itself.",
    examples: "Example: $10,000 principal that earned $3,000 in interest over 5 years implies a 6% simple annual interest rate.",
    assumptions:
      "Assumes simple interest (no compounding) spread evenly over the time period. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if my interest was compounded, not simple?",
        answer: "This solver assumes simple interest. If the interest compounded, the true underlying rate will be somewhat lower than this result, since compounding produces more total interest for the same rate — check the Interest Calculator for a side-by-side comparison of the two methods.",
      },
    ],
  },
  {
    slug: "effective-interest-rate-calculator",
    title: "Effective Interest Rate Calculator",
    description: "Convert a nominal interest rate into its effective annual rate for any number of compounding periods per year.",
    metaTitle: "Effective Interest Rate Calculator — Free & Instant",
    metaDescription: "Free effective interest rate calculator. Enter a nominal rate and any number of compounding periods per year to find the effective annual rate.",
    calcInputs: [
      percentField("nominalRatePercent", "Nominal Interest Rate", { default: 6, max: 50, step: 0.05 }),
      numberField("periodsPerYear", "Compounding Periods Per Year", { default: 12, min: 1, max: 365, step: 1 }),
    ],
    calcResult: { label: "Effective Annual Rate", format: "percentage" },
    calcResults: [],
    instructions:
      "Enter the nominal (stated) annual interest rate and the number of times it compounds per year — any " +
      "whole number, not just the standard monthly/quarterly/annual options, so you can model unusual " +
      "compounding schedules (e.g., 26 for biweekly, 52 for weekly).",
    examples: "Example: a 6% nominal rate compounding 52 times a year (weekly) has an effective annual rate of about 6.1800%.",
    assumptions:
      "Uses the standard effective-rate formula (1 + nominal/n)^n − 1, where n is the number of compounding " +
      "periods you enter. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the APY Calculator?",
        answer: "The APY Calculator (under Savings Calculators) offers a fixed dropdown of standard frequencies plus an illustrative deposit amount. This tool accepts any number of compounding periods per year for more flexible, general-purpose rate conversions.",
      },
    ],
  },
  {
    slug: "nominal-interest-rate-calculator",
    title: "Nominal Interest Rate Calculator",
    description: "Convert an effective annual interest rate back into its nominal rate for any number of compounding periods per year.",
    metaTitle: "Nominal Interest Rate Calculator — Free & Instant",
    metaDescription: "Free nominal interest rate calculator. Enter an effective annual rate and any number of compounding periods per year to find the nominal rate.",
    calcInputs: [
      percentField("effectiveRatePercent", "Effective Annual Rate", { default: 6.18, max: 50, step: 0.01 }),
      numberField("periodsPerYear", "Compounding Periods Per Year", { default: 12, min: 1, max: 365, step: 1 }),
    ],
    calcResult: { label: "Nominal Interest Rate", format: "percentage" },
    calcResults: [],
    instructions:
      "Enter the effective annual rate (EAR/APY) you want to match and the number of compounding periods per " +
      "year. This solves for the nominal (stated) rate that would produce that effective rate.",
    examples: "Example: to achieve a 6.1800% effective annual rate with 52 compounding periods a year, you'd need a nominal rate of about 6.0000%.",
    assumptions:
      "This is the algebraic inverse of the effective-rate formula: nominal = n × ((1 + EAR)^(1/n) − 1). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When would I need this instead of the Effective Interest Rate Calculator?",
        answer: "Use this when you already know the effective/annual yield you're targeting or comparing against, and need to find the equivalent stated (nominal) rate — for example, to compare a disclosed APY against a competing product's nominal rate.",
      },
    ],
  },
  {
    slug: "nominal-to-effective-interest-rate-calculator",
    title: "Nominal to Effective Interest Rate Calculator",
    description: "See a nominal interest rate's effective annual rate under five standard compounding frequencies at once.",
    metaTitle: "Nominal to Effective Interest Rate Calculator — Free & Instant",
    metaDescription: "Free nominal to effective interest rate calculator. Enter a nominal rate to compare its effective annual rate under annual, semiannual, quarterly, monthly, daily, and continuous compounding.",
    calcInputs: [
      percentField("nominalRatePercent", "Nominal Interest Rate", { default: 6, max: 50, step: 0.05 }),
    ],
    calcResult: { label: "Effective Rate (Monthly Compounding)", format: "percentage" },
    calcResults: [
      { key: "effectiveAnnual", label: "Effective Rate (Annual Compounding)", format: "percentage" },
      { key: "effectiveSemiannual", label: "Effective Rate (Semiannual Compounding)", format: "percentage" },
      { key: "effectiveQuarterly", label: "Effective Rate (Quarterly Compounding)", format: "percentage" },
      { key: "effectiveMonthly", label: "Effective Rate (Monthly Compounding)", format: "percentage", highlight: true },
      { key: "effectiveDaily", label: "Effective Rate (Daily Compounding)", format: "percentage" },
      { key: "effectiveContinuous", label: "Effective Rate (Continuous Compounding)", format: "percentage" },
    ],
    instructions:
      "Enter a single nominal interest rate. Unlike the single-frequency Effective Interest Rate Calculator, " +
      "this tool instantly shows the effective annual rate that same nominal rate would produce under six " +
      "different standard compounding schedules at once, so you can see how much compounding frequency alone " +
      "changes the outcome.",
    examples: "Example: a 6% nominal rate produces effective annual rates ranging from 6.0000% (annual compounding) up to about 6.1837% (continuous compounding).",
    assumptions:
      "Each column uses the standard effective-rate formula at its own fixed compounding frequency. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do all these effective rates differ if the nominal rate is the same?",
        answer: "More frequent compounding means interest is added to the balance more often within the year, so each additional dollar of interest starts earning its own interest sooner — the effective rate rises (though by a shrinking amount) as compounding frequency increases, up to the continuous-compounding limit.",
      },
    ],
  },
  {
    slug: "effective-to-nominal-interest-rate-calculator",
    title: "Effective to Nominal Interest Rate Calculator",
    description: "See the nominal interest rate needed to reach a target effective annual rate under five standard compounding frequencies at once.",
    metaTitle: "Effective to Nominal Interest Rate Calculator — Free & Instant",
    metaDescription: "Free effective to nominal interest rate calculator. Enter a target effective annual rate to compare the nominal rate required under annual, semiannual, quarterly, monthly, daily, and continuous compounding.",
    calcInputs: [
      percentField("effectiveRatePercent", "Target Effective Annual Rate", { default: 6, max: 50, step: 0.05 }),
    ],
    calcResult: { label: "Nominal Rate (Monthly Compounding)", format: "percentage" },
    calcResults: [
      { key: "nominalIfAnnual", label: "Nominal Rate (Annual Compounding)", format: "percentage" },
      { key: "nominalIfSemiannual", label: "Nominal Rate (Semiannual Compounding)", format: "percentage" },
      { key: "nominalIfQuarterly", label: "Nominal Rate (Quarterly Compounding)", format: "percentage" },
      { key: "nominalIfMonthly", label: "Nominal Rate (Monthly Compounding)", format: "percentage", highlight: true },
      { key: "nominalIfDaily", label: "Nominal Rate (Daily Compounding)", format: "percentage" },
      { key: "nominalIfContinuous", label: "Nominal Rate (Continuous Compounding)", format: "percentage" },
    ],
    instructions:
      "Enter the effective annual rate you're targeting. This tool shows the nominal (stated) rate that would be " +
      "required to hit that same effective rate under six different standard compounding schedules — the " +
      "reverse of the Nominal to Effective Interest Rate Calculator.",
    examples: "Example: to reach a 6% effective annual rate, you'd need a nominal rate of about 6.0000% with annual compounding, but only about 5.8291% with daily compounding.",
    assumptions:
      "Each column uses the algebraic inverse of the effective-rate formula at its own fixed compounding " +
      "frequency. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does the required nominal rate go down as compounding gets more frequent?",
        answer: "More frequent compounding does more of the work of growing your money on its own, so a lower stated rate is needed to reach the same effective annual result — this is the same relationship as the Nominal to Effective Interest Rate Calculator, just solved in the opposite direction.",
      },
    ],
  },
  {
    slug: "apr-calculator",
    title: "APR Calculator",
    description: "Convert a periodic interest rate into its nominal annual percentage rate (APR).",
    metaTitle: "APR Calculator — Free & Instant",
    metaDescription: "Free APR calculator. Enter a periodic interest rate and the number of periods per year to find the nominal APR.",
    calcInputs: [
      percentField("periodicRatePercent", "Periodic Interest Rate", { default: 0.5, max: 20, step: 0.01 }),
      numberField("periodsPerYear", "Periods Per Year", { default: 12, min: 1, max: 365, step: 1 }),
    ],
    calcResult: { label: "APR", format: "percentage" },
    calcResults: [],
    instructions:
      "Enter the interest rate charged per period (for example, per month) and how many of those periods occur " +
      "in a year. The APR is simply the periodic rate multiplied by the number of periods — the standard way " +
      "lenders convert a periodic rate into a quotable annual rate.",
    examples: "Example: a 0.5% monthly periodic rate over 12 periods a year works out to a 6% APR.",
    assumptions:
      "APR here is the simple (nominal) annualized rate — it does not itself account for compounding. See the " +
      "APR to APY Calculator to convert this into an effective yield. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is APR the same as APY?",
        answer: "No — APR is the simple annualized rate (periodic rate × number of periods) and doesn't account for compounding within the year. APY (or EAR) does account for compounding and is always equal to or higher than the APR at the same periodic rate.",
      },
    ],
  },
  {
    slug: "apr-to-apy-calculator",
    title: "APR to APY Calculator",
    description: "Convert a credit card or loan APR into its effective APY, using the standard daily-compounding convention.",
    metaTitle: "APR to APY Calculator — Free & Instant",
    metaDescription: "Free APR to APY calculator. Enter your APR to see the effective APY using standard daily compounding.",
    calcInputs: [
      percentField("aprPercent", "APR", { default: 18, max: 50, step: 0.01 }),
    ],
    calcResult: { label: "APY", format: "percentage" },
    calcResults: [],
    instructions:
      "Enter the APR (annual percentage rate). This tool converts it to the effective APY using daily " +
      "compounding (365 periods a year) — the convention most commonly used for credit cards and many " +
      "revolving lines of credit.",
    examples: "Example: an 18% APR compounded daily has an effective APY of about 19.7164%.",
    assumptions:
      "Fixed to daily compounding (n = 365). For a general-purpose conversion with any number of compounding " +
      "periods, use the Effective Interest Rate Calculator instead. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is APY always higher than APR here?",
        answer: "Because compounding daily means interest is calculated on interest already added earlier in the year, so the effective yield (APY) ends up higher than the simple stated rate (APR) — the gap grows with a higher APR.",
      },
    ],
  },
  {
    slug: "apy-to-apr-calculator",
    title: "APY to APR Calculator",
    description: "Convert an effective APY back into its nominal APR, using the standard daily-compounding convention.",
    metaTitle: "APY to APR Calculator — Free & Instant",
    metaDescription: "Free APY to APR calculator. Enter your APY to see the nominal APR using standard daily compounding.",
    calcInputs: [
      percentField("apyPercent", "APY", { default: 19.72, max: 60, step: 0.01 }),
    ],
    calcResult: { label: "APR", format: "percentage" },
    calcResults: [],
    instructions:
      "Enter the APY (annual percentage yield). This tool converts it back to the nominal APR using daily " +
      "compounding (365 periods a year) — the reverse of the APR to APY Calculator.",
    examples: "Example: a 19.7164% APY under daily compounding corresponds to an 18% nominal APR.",
    assumptions:
      "Fixed to daily compounding (n = 365), matching the APR to APY Calculator above. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When would I need to go from APY back to APR?",
        answer: "This is useful when you're quoted an effective yield (APY) and want to compare it against a rate quoted as APR, or when working backward from a disclosed yield to estimate the underlying stated rate.",
      },
    ],
  },
  {
    slug: "periodic-interest-rate-calculator",
    title: "Periodic Interest Rate Calculator",
    description: "Convert an annual percentage rate (APR) into the interest rate charged per period, for any number of periods per year.",
    metaTitle: "Periodic Interest Rate Calculator — Free & Instant",
    metaDescription: "Free periodic interest rate calculator. Enter your APR and the number of periods per year to find the interest rate charged per period.",
    calcInputs: [
      percentField("aprPercent", "APR", { default: 12, max: 50, step: 0.01 }),
      numberField("periodsPerYear", "Periods Per Year", { default: 12, min: 1, max: 365, step: 1 }),
    ],
    calcResult: { label: "Periodic Interest Rate", format: "percentage" },
    calcResults: [],
    instructions:
      "Enter the APR and the number of periods per year (for example, 12 for monthly billing cycles). This is " +
      "the reverse of the APR Calculator — it divides the APR by the number of periods to find the rate applied " +
      "each period.",
    examples: "Example: a 12% APR divided across 12 periods a year (monthly) works out to a 1% periodic rate.",
    assumptions:
      "Simple division of APR by the number of periods per year — this is the nominal periodic rate, not an " +
      "effective one. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is this the same as a monthly interest rate?",
        answer: "When periods per year is set to 12, yes — but this tool works for any billing or compounding frequency, not just monthly, which is why periods per year is a free input rather than fixed.",
      },
    ],
  },
  {
    slug: "annualized-interest-rate-calculator",
    title: "Annualized Interest Rate Calculator",
    description: "Convert a return earned over any holding period into an annualized (yearly-equivalent) interest rate.",
    metaTitle: "Annualized Interest Rate Calculator — Free & Instant",
    metaDescription: "Free annualized interest rate calculator. Enter a return and the number of days it was held to find the equivalent annualized rate.",
    calcInputs: [
      percentField("periodReturnPercent", "Return Earned Over Holding Period", { default: 2, min: -99, max: 100, step: 0.01 }),
      numberField("holdingPeriodDays", "Holding Period (Days)", { default: 90, min: 1, max: 3650, step: 1 }),
    ],
    calcResult: { label: "Annualized Interest Rate", format: "percentage" },
    calcResults: [],
    instructions:
      "Enter the percentage return you earned (or were charged) over a specific holding period, and the number " +
      "of days in that period. This scales the return up (or down) to what it would be equivalent to over a " +
      "full year, compounding at that same rate.",
    examples: "Example: a 2% return earned over a 90-day holding period annualizes to about 8.3624% per year.",
    assumptions:
      "Uses (1 + period return)^(365 / holding period days) − 1, which assumes the same rate of return would " +
      "compound consistently for the rest of the year. Short holding periods can produce large annualized " +
      "figures that a single short-term result shouldn't be assumed to sustain. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the annualized rate so much higher than the period return?",
        answer: "Annualizing scales a short-term result up to a full year assuming it compounds repeatedly at the same pace — this is standard for comparing returns across different holding periods, but a strong short-term return rarely continues at the same rate for a full year, so treat the annualized figure as illustrative rather than a forecast.",
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
