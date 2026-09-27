// One-time (but safe to re-run) batch setup script: creates the 7 tools of
// the "Retirement Calculators" batch. Sixth of 8 new topic batches built
// from Finance_Calculators_Topical_SEO_Master.xlsx. Filed under the
// existing "Retirement Calculators" category (retirement-calculators),
// created empty by reparent-tool-categories-under-finance.ts and populated
// here for the first time.
//
// See src/lib/calc-engine-finance-retirement.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-finance-retirement-calculators.ts
// or
//   npm run db:create-finance-retirement-calculators

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
  "This tool provides general estimates for informational purposes only and isn't financial, tax, or " +
  "retirement advice. Actual results depend on factors this simplified model doesn't capture — consider " +
  "speaking with a qualified financial advisor for guidance specific to your situation.";

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
    slug: "retirement-calculator",
    title: "Retirement Calculator",
    description: "Project your retirement savings at retirement age and estimate the monthly income they could support.",
    metaTitle: "Retirement Calculator — Free & Instant",
    metaDescription: "Free retirement calculator. Enter your age, savings, and monthly contribution to see your projected retirement savings and estimated monthly income.",
    calcInputs: [
      numberField("currentAge", "Current Age", { default: 30, min: 18, max: 100, step: 1 }),
      numberField("retirementAge", "Retirement Age", { default: 65, min: 18, max: 100, step: 1 }),
      currencyField("currentSavings", "Current Retirement Savings", { default: 20000, max: 100000000, step: 500 }),
      currencyField("monthlyContribution", "Monthly Contribution", { default: 500, max: 1000000, step: 25 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 7, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "Projected Savings At Retirement", format: "currency" },
    calcResults: [
      { key: "projectedSavings", label: "Projected Savings At Retirement", format: "currency", highlight: true },
      { key: "totalContributions", label: "Total Contributions (Savings + Monthly)", format: "currency" },
      { key: "estimatedMonthlyIncome", label: "Estimated Sustainable Monthly Income (4% Rule)", format: "currency" },
    ],
    instructions:
      "Enter your current age, the age you plan to retire, your current retirement savings, how much you " +
      "contribute each month, and the annual return you expect your investments to earn. The result projects " +
      "your total savings at retirement and estimates a sustainable monthly income using the commonly cited " +
      "\"4% rule\" (withdrawing 4% of your balance in the first year of retirement, adjusting for inflation " +
      "thereafter, is a widely referenced starting point for a sustainable withdrawal rate).",
    examples: "Example: starting at age 30 with $20,000 saved, contributing $500/month until retiring at 65, and earning 7% annually, projects to $1,130,650.34 at retirement ($230,000.00 of that from contributions) — supporting an estimated $3,768.83/month under the 4% rule.",
    assumptions:
      "This assumes a constant monthly contribution and a constant annual return compounded monthly — real " +
      "returns vary year to year, and most people increase contributions over time as income grows. The 4% " +
      "rule is a commonly cited guideline, not a guarantee, and its suitability depends on your time horizon, " +
      "spending flexibility, and market conditions in retirement. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is the 4% rule?",
        answer: "The 4% rule is a commonly cited retirement-planning guideline suggesting that withdrawing 4% of your portfolio in your first year of retirement (and adjusting that dollar amount for inflation in later years) has historically had a good chance of lasting 30 years — it's a starting point for discussion, not a guarantee for any individual situation.",
      },
      {
        question: "Does this account for inflation?",
        answer: "No — this projects nominal (non-inflation-adjusted) future dollars using your entered return rate. If you want to think in today's purchasing power, you can enter an \"inflation-adjusted\" (real) return rate instead of a nominal one.",
      },
    ],
  },
  {
    slug: "401k-calculator",
    title: "401(k) Calculator",
    description: "Project your 401(k) balance at retirement, including your employer's matching contribution.",
    metaTitle: "401(k) Calculator — Free & Instant",
    metaDescription: "Free 401(k) calculator. Enter your salary, contribution rate, and employer match to see your projected 401(k) balance at retirement.",
    calcInputs: [
      currencyField("currentBalance", "Current 401(k) Balance", { default: 15000, max: 100000000, step: 500 }),
      currencyField("annualSalary", "Annual Salary", { default: 70000, max: 10000000, step: 1000 }),
      percentField("employeeContributionPercent", "Your Contribution (% of Salary)", { default: 6, max: 100, step: 0.5 }),
      percentField("employerMatchPercent", "Employer Match Rate (% of your contribution)", { default: 50, max: 200, step: 5 }),
      percentField("employerMatchLimitPercent", "Employer Match Limit (% of salary)", { default: 6, max: 100, step: 0.5 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 7, max: 20, step: 0.1 }),
      numberField("yearsToGrow", "Years Until Retirement", { default: 30, min: 0, max: 60, step: 1 }),
    ],
    calcResult: { label: "Projected 401(k) Balance", format: "currency" },
    calcResults: [
      { key: "futureValue", label: "Projected 401(k) Balance", format: "currency", highlight: true },
      { key: "totalEmployeeContributions", label: "Total Your Contributions", format: "currency" },
      { key: "totalEmployerMatch", label: "Total Employer Match", format: "currency" },
      { key: "totalContributions", label: "Total Contributions (You + Employer)", format: "currency" },
    ],
    instructions:
      "Enter your current 401(k) balance, annual salary, the percentage of salary you contribute, your " +
      "employer's match rate (how much of your contribution they match — e.g. 50% means they add 50 cents per " +
      "dollar you contribute), the match limit (the percentage of salary up to which they'll match, since " +
      "employer matches are almost always capped), your expected annual return, and years until retirement. The " +
      "result projects your balance at retirement, split out by who contributed what.",
    examples: "Example: a $15,000 balance, $70,000 salary, contributing 6% with a 50% employer match up to 6% of salary, earning 7% annually over 30 years, projects to $762,232.23 — $126,000.00 from your own contributions and $63,000.00 from employer match.",
    assumptions:
      "Employer match is calculated only on the portion of your contribution up to the match limit percentage " +
      "of salary — contributing beyond that limit doesn't earn additional match. This assumes a constant salary " +
      "and contribution rate over the whole period; real 401(k)s usually see rising salaries, occasional " +
      "contribution-rate changes, and vesting schedules on employer contributions (unvested employer " +
      "contributions may not be yours to keep if you leave before vesting). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How does the employer match limit work?",
        answer: "Most employers only match contributions up to a certain percentage of your salary — for example, \"50% match up to 6% of salary\" means if you contribute at least 6%, the employer adds 3% of your salary (50% of that 6%); contributing more than 6% doesn't earn any additional match.",
      },
      {
        question: "Is employer match immediately mine to keep?",
        answer: "Not always — many employers use a vesting schedule, meaning you only fully own the employer match after a certain number of years of service. Your own contributions are always 100% yours immediately. Check your plan documents for your specific vesting schedule.",
      },
    ],
  },
  {
    slug: "ira-calculator",
    title: "IRA Calculator",
    description: "Project the future value of a Traditional IRA, including an estimate of its after-tax value at withdrawal.",
    metaTitle: "IRA Calculator — Free & Instant",
    metaDescription: "Free Traditional IRA calculator. Enter your balance and annual contribution to see your projected balance and estimated after-tax value.",
    calcInputs: [
      currencyField("currentBalance", "Current IRA Balance", { default: 10000, max: 100000000, step: 500 }),
      currencyField("annualContribution", "Annual Contribution", { default: 6000, max: 100000, step: 100 }),
      numberField("yearsToGrow", "Years Until Withdrawal", { default: 25, min: 0, max: 60, step: 1 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 6, max: 20, step: 0.1 }),
      percentField("retirementTaxRatePercent", "Estimated Tax Rate At Withdrawal", { default: 22, max: 50, step: 1 }),
    ],
    calcResult: { label: "Projected Balance (Before Tax)", format: "currency" },
    calcResults: [
      { key: "futureValueBeforeTax", label: "Projected Balance (Before Tax)", format: "currency", highlight: true },
      { key: "estimatedAfterTaxValue", label: "Estimated After-Tax Value At Withdrawal", format: "currency" },
      { key: "totalContributions", label: "Total Contributions", format: "currency" },
    ],
    instructions:
      "Enter your current Traditional IRA balance, how much you contribute each year (the IRS sets an annual " +
      "contribution limit that changes periodically — check the current limit for your situation), years until " +
      "you plan to withdraw, your expected annual return, and the tax rate you estimate you'll pay on " +
      "withdrawals. Traditional IRA contributions are typically tax-deductible now, but withdrawals in " +
      "retirement are taxed as ordinary income — this tool estimates that after-tax value.",
    examples: "Example: a $10,000 balance contributing $6,000/year for 25 years at 6% annually projects to $372,105.78 before tax — an estimated $290,242.51 after a 22% withdrawal tax rate.",
    assumptions:
      "This assumes a constant annual contribution and annual return, and a single flat tax rate applied to the " +
      "entire balance at withdrawal — in reality, Traditional IRA withdrawals are taxed at your ordinary income " +
      "tax rate in the year withdrawn, which can vary based on your total income that year and may span " +
      "multiple tax brackets. Early withdrawals before age 59½ may also incur an additional penalty not modeled " +
      "here. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the Roth IRA Calculator?",
        answer: "A Traditional IRA is typically funded with pre-tax (deductible) contributions and taxed as ordinary income when withdrawn — this tool estimates that after-tax value. A Roth IRA is funded with after-tax contributions, but qualified withdrawals are tax-free, so the Roth IRA Calculator doesn't need a withdrawal-tax adjustment.",
      },
      {
        question: "Does this account for annual IRA contribution limits?",
        answer: "No — this tool doesn't enforce IRS contribution limits, since they change periodically and can differ by age (a higher \"catch-up\" limit often applies once you reach a certain age). Enter whatever annual contribution amount fits your actual plan, checking current IRS limits separately.",
      },
    ],
  },
  {
    slug: "roth-ira-calculator",
    title: "Roth IRA Calculator",
    description: "Project the future value of a Roth IRA, funded with after-tax contributions that grow and withdraw tax-free.",
    metaTitle: "Roth IRA Calculator — Free & Instant",
    metaDescription: "Free Roth IRA calculator. Enter your balance and annual contribution to see your projected tax-free balance at retirement.",
    calcInputs: [
      currencyField("currentBalance", "Current Roth IRA Balance", { default: 10000, max: 100000000, step: 500 }),
      currencyField("annualContribution", "Annual Contribution", { default: 6000, max: 100000, step: 100 }),
      numberField("yearsToGrow", "Years Until Withdrawal", { default: 25, min: 0, max: 60, step: 1 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 6, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "Projected Tax-Free Balance", format: "currency" },
    calcResults: [
      { key: "futureValue", label: "Projected Tax-Free Balance", format: "currency", highlight: true },
      { key: "totalContributions", label: "Total Contributions", format: "currency" },
      { key: "totalGrowth", label: "Total Investment Growth", format: "currency" },
    ],
    instructions:
      "Enter your current Roth IRA balance, how much you contribute each year (the IRS sets an annual " +
      "contribution limit that changes periodically, and Roth eligibility phases out above certain income levels " +
      "— check current rules for your situation), years until withdrawal, and your expected annual return. " +
      "Because Roth IRA contributions are made with after-tax money, qualified withdrawals in retirement are " +
      "entirely tax-free — the projected balance below is already the amount available to spend.",
    examples: "Example: a $10,000 balance contributing $6,000/year for 25 years at 6% annually projects to $372,105.78 tax-free — $160,000.00 from contributions and $212,105.78 from tax-free investment growth.",
    assumptions:
      "This assumes a constant annual contribution and annual return, and that withdrawals are \"qualified\" " +
      "(tax-free and penalty-free) — Roth IRA withdrawals generally need the account to have been open at least " +
      "5 years and the owner to be 59½ or older (with some exceptions) to be fully qualified; non-qualified " +
      "withdrawals of earnings can be taxed and penalized. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the IRA Calculator?",
        answer: "The IRA Calculator models a Traditional IRA, where contributions are typically tax-deductible now but withdrawals are taxed as ordinary income later — so that tool estimates an after-tax withdrawal value. A Roth IRA is funded with after-tax money, so qualified withdrawals are tax-free and no withdrawal-tax adjustment is needed here.",
      },
      {
        question: "Are there income limits on Roth IRA contributions?",
        answer: "Yes — the IRS phases out Roth IRA contribution eligibility above certain modified adjusted gross income (MAGI) levels, which change periodically and depend on filing status. This calculator doesn't check eligibility — confirm your own eligibility against current IRS rules.",
      },
    ],
  },
  {
    slug: "pension-calculator",
    title: "Pension Calculator",
    description: "Estimate your annual and monthly pension benefit from a defined-benefit plan using your salary, years of service, and accrual rate.",
    metaTitle: "Pension Calculator — Free & Instant",
    metaDescription: "Free pension calculator. Enter your average final salary, years of service, and accrual rate to estimate your annual and monthly pension benefit.",
    calcInputs: [
      currencyField("averageFinalSalary", "Average Final Salary", { default: 80000, max: 10000000, step: 1000 }),
      numberField("yearsOfService", "Years of Service", { default: 25, min: 0, max: 60, step: 1 }),
      percentField("accrualRatePercent", "Accrual Rate (per year of service)", { default: 1.5, max: 3, step: 0.05 }),
    ],
    calcResult: { label: "Estimated Annual Pension", format: "currency" },
    calcResults: [
      { key: "annualPension", label: "Estimated Annual Pension", format: "currency", highlight: true },
      { key: "monthlyPension", label: "Estimated Monthly Pension", format: "currency" },
    ],
    instructions:
      "Enter your average final salary (many plans use an average of your final 3-5 years of salary rather than " +
      "your single last year), your total years of service, and your plan's accrual rate (the percentage of " +
      "salary earned per year of service — check your specific plan documents, since this commonly ranges from " +
      "about 1% to 2.5%). The result estimates your annual and monthly pension benefit using the standard " +
      "defined-benefit formula: average final salary × years of service × accrual rate.",
    examples: "Example: an $80,000 average final salary, 25 years of service, and a 1.5% accrual rate estimates a $30,000.00 annual pension — $2,500.00 per month.",
    assumptions:
      "This uses the standard simplified defined-benefit pension formula, but real plans often include additional " +
      "provisions this doesn't model — early-retirement reductions, cost-of-living adjustments, survivor-benefit " +
      "elections (which typically reduce the monthly amount in exchange for continuing payments to a spouse), " +
      "and plan-specific caps or minimums. Check your plan's official benefit statement for a precise figure. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is an accrual rate?",
        answer: "The accrual rate is the percentage of your average final salary that you earn as annual pension benefit for each year of service — for example, a 1.5% accrual rate with 25 years of service earns 1.5% × 25 = 37.5% of your average final salary as your annual pension.",
      },
      {
        question: "Does this account for survivor benefits or cost-of-living adjustments?",
        answer: "No — this shows the basic defined-benefit formula only. Electing a survivor benefit (so payments continue to a spouse after your death) typically reduces the monthly amount, and some plans include cost-of-living adjustments over time. Check your plan's official documents for how these apply to you.",
      },
    ],
  },
  {
    slug: "social-security-calculator",
    title: "Social Security Calculator",
    description: "Estimate how claiming Social Security earlier or later than your full retirement age adjusts your monthly benefit.",
    metaTitle: "Social Security Calculator — Free & Instant",
    metaDescription: "Free Social Security calculator. Enter your estimated benefit and claiming age to see how early or delayed claiming adjusts your monthly benefit.",
    calcInputs: [
      currencyField("estimatedMonthlyBenefitAtFRA", "Estimated Monthly Benefit at Full Retirement Age", { default: 2000, max: 100000, step: 50 }),
      numberField("fullRetirementAge", "Your Full Retirement Age (FRA)", { default: 67, min: 65, max: 67, step: 1 }),
      numberField("claimingAge", "Age You Plan To Claim", { default: 67, min: 62, max: 70, step: 1 }),
    ],
    calcResult: { label: "Adjusted Monthly Benefit", format: "currency" },
    calcResults: [
      { key: "adjustedMonthlyBenefit", label: "Adjusted Monthly Benefit", format: "currency", highlight: true },
      { key: "annualBenefit", label: "Adjusted Annual Benefit", format: "currency" },
      { key: "percentAdjustment", label: "Adjustment vs. Full Retirement Age Benefit", format: "percentage" },
    ],
    instructions:
      "Enter your estimated monthly benefit at full retirement age (get this figure from your Social Security " +
      "statement at ssa.gov — this tool doesn't look it up for you), your full retirement age (65-67 depending " +
      "on your birth year — check your statement), and the age you plan to start claiming (as early as 62 or as " +
      "late as 70). The result applies the published Social Security early-claiming reduction or delayed-claiming " +
      "increase to estimate your adjusted benefit.",
    examples: "Example: an estimated $2,000.00/month benefit at a full retirement age of 67, claimed early at age 62, is reduced by 30% to $1,400.00/month — $16,800.00/year.",
    assumptions:
      "This applies the published Social Security Administration adjustment formula: benefits claimed before " +
      "full retirement age (FRA) are reduced by 5/9 of 1% per month for the first 36 months early and 5/12 of 1% " +
      "per month beyond that; benefits claimed after FRA (up to age 70) increase by 2/3 of 1% per month (8% per " +
      "year) of delayed retirement credit. This doesn't account for cost-of-living adjustments, spousal or " +
      "survivor benefits, the earnings test if you continue working while claiming before FRA, or any future " +
      "changes to Social Security rules. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Where do I find my estimated benefit at full retirement age?",
        answer: "Create or log in to a \"my Social Security\" account at ssa.gov to see your personalized benefit estimate at full retirement age, based on your actual earnings history — this calculator doesn't have access to your earnings record, so you'll need to enter that estimate yourself.",
      },
      {
        question: "Why does claiming early reduce my benefit so much?",
        answer: "Social Security's reduction for early claiming is designed so that, on average across a typical life expectancy, total lifetime benefits are roughly similar whether you claim early (more months of smaller payments) or later (fewer months of larger payments) — the exact best choice for you depends on your health, other income, and life expectancy.",
      },
    ],
  },
  {
    slug: "retirement-withdrawal-calculator",
    title: "Retirement Withdrawal Calculator",
    description: "See how long your retirement savings will last at a fixed monthly withdrawal amount and expected return.",
    metaTitle: "Retirement Withdrawal Calculator — Free & Instant",
    metaDescription: "Free retirement withdrawal calculator. Enter your savings, monthly withdrawal, and expected return to see how many years your savings will last.",
    calcInputs: [
      currencyField("currentSavings", "Current Retirement Savings", { default: 500000, max: 100000000, step: 1000 }),
      currencyField("monthlyWithdrawal", "Monthly Withdrawal Amount", { default: 3000, max: 1000000, step: 50 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 5, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "Years Your Savings Will Last", format: "number" },
    calcResults: [
      { key: "yearsLasting", label: "Years Your Savings Will Last", format: "number", highlight: true },
      { key: "monthsLasting", label: "Months Your Savings Will Last", format: "number" },
      { key: "totalWithdrawn", label: "Total Amount Withdrawn", format: "currency" },
    ],
    instructions:
      "Enter your current retirement savings, the fixed amount you plan to withdraw each month, and the annual " +
      "return you expect your remaining balance to earn while you draw it down. The result shows how many " +
      "months and years your savings will last before running out (capped at 50 years, since a withdrawal rate " +
      "that low relative to your return may sustain the balance indefinitely).",
    examples: "Example: $500,000.00 in savings, withdrawing $3,000.00/month, earning 5% annually on the remaining balance, lasts 286 months (23.83 years) — a total of $858,000.00 withdrawn.",
    assumptions:
      "This assumes a fixed monthly withdrawal amount (not adjusted for inflation) and a constant annual return " +
      "compounded monthly on the remaining balance — real returns vary year to year, and many retirees adjust " +
      "withdrawals over time for inflation or market performance. If your monthly withdrawal is small enough " +
      "relative to your expected return, your balance may never actually run out — this tool caps its " +
      "projection at 50 years (600 months) in that case. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if my result shows the maximum 600 months?",
        answer: "That means your withdrawal amount is low enough relative to your expected return that your balance is still growing (or holding steady) even after 50 years of withdrawals in this simplified model — in practice this suggests your withdrawal rate may be sustainable indefinitely, though real-world returns and inflation will vary.",
      },
      {
        question: "Does this adjust withdrawals for inflation?",
        answer: "No — this assumes the same fixed dollar withdrawal every month. In retirement, many people increase their withdrawal amount over time to keep pace with inflation, which would shorten how long a given balance lasts compared to this fixed-withdrawal estimate.",
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
