// One-time (but safe to re-run) batch setup script: creates the 6 tools
// of the "Savings Calculators" sub-batch F (Goal Planning & Tracking). Part of the
// Savings Calculators tool-list build-out: 60 tools in the source list, 3
// skipped as duplicates (savings-calculator, savings-goal-calculator and
// emergency-fund-calculator already exist in
// create-finance-savings-calculators.ts), 57 built across 6 sub-batches, all
// filed under Finance Calculators > Savings Calculators:
//   create-savings-core-calculators.ts (9 tools)
//   create-savings-schedules-calculators.ts (11 tools)
//   create-savings-accounts-calculators.ts (9 tools)
//   create-savings-withdrawals-emergency-calculators.ts (11 tools)
//   create-savings-goals-calculators.ts (11 tools)
//   create-savings-goal-planning-calculators.ts (6 tools)
//
// See src/lib/calc-engine-savings-goal-planning.ts for the math and for notes on
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-savings-goal-planning-calculators.ts
// or
//   npm run db:create-savings-goal-planning-calculators

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
  "This tool provides general estimates for informational purposes only and isn't financial advice. Actual " +
  "bank and credit union rates vary and change over time — check your institution's current rate and terms.";

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
    slug: "savings-contribution-calculator",
    title: "Savings Contribution Calculator",
    description: "Find the regular contribution needed to reach a savings target — weekly, every two weeks, monthly, quarterly or yearly — with interest included.",
    metaTitle: "Savings Contribution Calculator — Any Frequency",
    metaDescription: "Free savings contribution calculator. Find how much to save weekly, biweekly, monthly, quarterly or yearly to reach your savings target.",
    calcInputs: [
      currencyField("targetAmount", "Savings Target", { default: 20000, max: 100000000, step: 500 }),
      currencyField("currentSavings", "Current Savings", { default: 2000, max: 100000000, step: 500 }),
      numberField("years", "Years to Reach It", { default: 4, min: 1, max: 60, step: 1 }),
      percentField("apyPercent", "Savings APY", { default: 4, max: 25, step: 0.05 }),
      dropdownField("depositsPerYear", "How Often You Contribute", 26, [
        { label: "Weekly (52 a year)", value: 52 },
        { label: "Every Two Weeks (26 a year)", value: 26 },
        { label: "Monthly (12 a year)", value: 12 },
        { label: "Quarterly (4 a year)", value: 4 },
        { label: "Yearly (1 a year)", value: 1 },
      ]),
    ],
    calcResult: { label: "Contribution per Period", format: "currency" },
    calcResults: [
      { key: "depositPerPeriod", label: "Contribution Each Period", format: "currency", highlight: true },
      { key: "numberOfDeposits", label: "Number of Contributions", format: "number" },
      { key: "totalDeposits", label: "Total Contributions", format: "currency" },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
    ],
    instructions:
      "Enter your target, what you've saved so far, the number of years, your savings APY, and how often you'll " +
      "contribute — for example, every two weeks to match your paycheck. The tool works out the contribution for " +
      "that schedule.",
    examples:
      "Example: to grow $2,000 into $20,000 in 4 years at 4% APY, contribute $156.96 every two weeks — 104 " +
      "contributions totaling $16,323.50. Interest makes up the other $1,676.50.",
    assumptions:
      "Contributions are made at the end of each period, and the APY is converted to an equivalent rate for that " +
      "period. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does contributing more often help?",
        answer: "Slightly, because money goes in sooner and earns interest for longer. The bigger benefit is practical — smaller, more frequent amounts that line up with payday are easier to stick to.",
      },
    ],
  },
  {
    slug: "savings-time-calculator",
    title: "Savings Time Calculator",
    description: "Find out how long it will take to reach a savings target from your current balance and monthly deposits, with interest.",
    metaTitle: "Savings Time Calculator — How Long to Save",
    metaDescription: "Free savings time calculator. See how many months and years it takes to reach your savings target with monthly deposits and interest.",
    calcInputs: [
      currencyField("targetAmount", "Savings Target", { default: 15000, max: 100000000, step: 500 }),
      currencyField("currentSavings", "Current Savings", { default: 3000, max: 100000000, step: 500 }),
      currencyField("monthlyDeposit", "Monthly Deposit", { default: 400, max: 1000000, step: 25 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4, max: 25, step: 0.05 }),
    ],
    calcResult: { label: "Months Needed", format: "number" },
    calcResults: [
      { key: "monthsNeeded", label: "Months Needed (1,200 = 100+ Years)", format: "number", highlight: true },
      { key: "yearsNeeded", label: "Years Needed", format: "number" },
      { key: "totalDeposited", label: "Total You Deposit (incl. Current Savings)", format: "currency" },
      { key: "balanceWhenReached", label: "Balance When You Reach It", format: "currency" },
    ],
    instructions:
      "Enter your target, what you've saved so far, how much you'll deposit each month, and your interest rate. The " +
      "tool counts the months until your balance first reaches the target. Try raising the monthly deposit to see " +
      "how much sooner you'd get there.",
    examples:
      "Example: starting from $3,000 and adding $400 a month at 4%, you'd reach $15,000 in 28 months (2.33 years). " +
      "You'd have deposited $14,200 and your balance would be $15,011.84.",
    assumptions:
      "Deposits are made at the end of each month and interest is compounded monthly at a fixed rate. The answer is " +
      "rounded up to whole months. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the fastest way to reach my goal sooner?",
        answer: "Raise the monthly deposit. At savings account rates, interest helps a little, but how much you put in each month matters far more over a few years.",
      },
    ],
  },
  {
    slug: "savings-target-date-calculator",
    title: "Savings Target Date Calculator",
    description: "Check whether you'll hit your savings target by a set date — see your projected balance on that date, any shortfall, and the extra monthly saving to fix it.",
    metaTitle: "Savings Target Date Calculator — On Track?",
    metaDescription: "Free savings target date calculator. See if you'll reach your savings goal by your deadline and how much more to save each month if not.",
    calcInputs: [
      currencyField("targetAmount", "Savings Target", { default: 12000, max: 100000000, step: 500 }),
      numberField("monthsUntilDate", "Months Until Your Target Date", { default: 18, min: 1, max: 600, step: 1 }),
      currencyField("currentSavings", "Current Savings", { default: 2500, max: 100000000, step: 500 }),
      currencyField("monthlyDeposit", "Monthly Deposit", { default: 450, max: 1000000, step: 25 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4, max: 25, step: 0.05 }),
    ],
    calcResult: { label: "Surplus or Shortfall", format: "currency" },
    calcResults: [
      { key: "surplusOrShortfall", label: "Surplus (+) or Shortfall (−) on the Date", format: "currency", highlight: true },
      { key: "projectedBalanceOnDate", label: "Projected Balance on the Date", format: "currency" },
      { key: "extraMonthlyNeeded", label: "Extra per Month Needed to Hit the Target", format: "currency" },
      { key: "monthsEarlyOrLate", label: "Months Early (+) or Late (−)", format: "number" },
    ],
    instructions:
      "Enter your target, the number of months until the date you need it, what you've saved, your monthly deposit, " +
      "and your interest rate. The tool projects your balance on that date. If you'd fall short, it shows the extra " +
      "you'd need to add each month, and how many months late you'd be at your current pace.",
    examples:
      "Example: with $2,500 saved and $450 a month at 4%, you'd have $10,987.96 in 18 months — $1,012.04 short of " +
      "$12,000. Adding $54.65 a month closes the gap; otherwise you'd get there 3 months late.",
    assumptions:
      "Deposits are made at the end of each month and interest is compounded monthly at a fixed rate. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I turn a date into months?",
        answer: "Count the months from now until the date — for example, from March to next September is 18 months.",
      },
    ],
  },
  {
    slug: "savings-goal-progress-calculator",
    title: "Savings Goal Progress Calculator",
    description: "Check your progress part-way through a savings goal — percent complete vs time gone, whether you're ahead or behind plan, and what to save from now on.",
    metaTitle: "Savings Goal Progress Calculator — Am I on Track?",
    metaDescription: "Free savings goal progress calculator. See your percent complete, whether you're ahead or behind plan, and the new monthly amount needed.",
    calcInputs: [
      currencyField("goalAmount", "Savings Goal", { default: 10000, max: 100000000, step: 500 }),
      currencyField("savedSoFar", "Saved So Far", { default: 3800, max: 100000000, step: 100 }),
      numberField("monthsElapsed", "Months Since You Started", { default: 8, min: 0, max: 600, step: 1 }),
      numberField("totalMonthsPlanned", "Total Months Planned", { default: 20, min: 1, max: 600, step: 1 }),
    ],
    calcResult: { label: "Percent Complete", format: "percentage" },
    calcResults: [
      { key: "percentComplete", label: "Percent Complete", format: "percentage", highlight: true },
      { key: "percentOfTimeElapsed", label: "Percent of Time Gone", format: "percentage" },
      { key: "aheadOrBehindPlan", label: "Ahead (+) or Behind (−) Plan", format: "currency" },
      { key: "monthlyNeededFromNow", label: "Monthly Saving Needed from Now", format: "currency" },
      { key: "stillToSave", label: "Still to Save", format: "currency" },
    ],
    instructions:
      "Enter your goal, what you've saved so far, how many months ago you started, and how many months you gave " +
      "yourself in total. The tool compares your progress with an even plan — the same amount each month — and " +
      "works out the new monthly amount needed to finish on time.",
    examples:
      "Example: $3,800 saved toward $10,000 is 38% done, but 8 of 20 months (40%) have gone. An even plan would " +
      "have you at $4,000, so you're $200 behind. Saving $516.67 a month for the last 12 months gets you there on " +
      "time.",
    assumptions:
      "Measures progress against an even, straight-line plan and ignores interest. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I'm behind on my savings goal?",
        answer: "You can raise the monthly amount (shown above), push the deadline back, or lower the goal. Automating a transfer on payday is the most reliable way to stay on track.",
      },
    ],
  },
  {
    slug: "savings-goal-contribution-calculator",
    title: "Savings Goal Contribution Calculator",
    description: "Split one monthly savings budget across up to three goals, each with its own target and deadline, and see whether your budget covers them all.",
    metaTitle: "Savings Goal Contribution Calculator — Multiple Goals",
    metaDescription: "Free savings goal contribution calculator. Split your monthly savings across up to three goals with their own deadlines and check your budget.",
    calcInputs: [
      currencyField("monthlyBudget", "Monthly Savings Budget", { default: 900, max: 10000000, step: 25 }),
      currencyField("goal1Amount", "Goal 1 — Target", { default: 3000, max: 100000000, step: 100 }),
      currencyField("goal1Saved", "Goal 1 — Saved So Far", { default: 500, max: 100000000, step: 100 }),
      numberField("goal1Months", "Goal 1 — Months Left", { default: 10, min: 1, max: 600, step: 1 }),
      currencyField("goal2Amount", "Goal 2 — Target", { default: 6000, max: 100000000, step: 100 }),
      currencyField("goal2Saved", "Goal 2 — Saved So Far", { default: 1000, max: 100000000, step: 100 }),
      numberField("goal2Months", "Goal 2 — Months Left", { default: 24, min: 1, max: 600, step: 1 }),
      currencyField("goal3Amount", "Goal 3 — Target", { default: 1500, max: 100000000, step: 100 }),
      currencyField("goal3Saved", "Goal 3 — Saved So Far", { default: 0, max: 100000000, step: 100 }),
      numberField("goal3Months", "Goal 3 — Months Left", { default: 6, min: 1, max: 600, step: 1 }),
    ],
    calcResult: { label: "Total Monthly Needed", format: "currency" },
    calcResults: [
      { key: "totalMonthlyNeeded", label: "Total Needed per Month", format: "currency", highlight: true },
      { key: "goal1Monthly", label: "Goal 1 per Month", format: "currency" },
      { key: "goal2Monthly", label: "Goal 2 per Month", format: "currency" },
      { key: "goal3Monthly", label: "Goal 3 per Month", format: "currency" },
      { key: "budgetLeftOverOrShort", label: "Budget Left Over (+) or Short (−)", format: "currency" },
    ],
    instructions:
      "Enter how much you can save each month in total, then up to three goals — each with its target, what's " +
      "already saved, and months left. For fewer goals, set the unused goal's target to 0. The tool shows the " +
      "monthly amount for each goal and whether your budget covers them all.",
    examples:
      "Example: with a $900 monthly budget, Goal 1 ($3,000, $500 saved, 10 months) needs $250 a month, Goal 2 " +
      "($6,000, $1,000 saved, 24 months) needs $208.33, and Goal 3 ($1,500, 6 months) needs $250. That's $708.33 in " +
      "total, leaving $191.67 of your budget spare.",
    assumptions:
      "Each goal gets an equal amount each month until its deadline; interest is ignored. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if my budget doesn't cover every goal?",
        answer: "Put urgent or essential goals (like an emergency fund) first, give later goals more time, or trim the targets. Separate savings accounts for each goal make progress easy to track.",
      },
    ],
  },
  {
    slug: "savings-goal-timeline-calculator",
    title: "Savings Goal Timeline Calculator",
    description: "Map out your savings goal timeline — how many months until you pass 25%, 50%, 75% and 100% of your goal.",
    metaTitle: "Savings Goal Timeline Calculator — Milestones",
    metaDescription: "Free savings goal timeline calculator. See how many months until you reach 25%, 50%, 75% and 100% of your savings goal.",
    calcInputs: [
      currencyField("goalAmount", "Savings Goal", { default: 20000, max: 100000000, step: 500 }),
      currencyField("currentSavings", "Current Savings", { default: 1000, max: 100000000, step: 100 }),
      currencyField("monthlyDeposit", "Monthly Deposit", { default: 500, max: 1000000, step: 25 }),
      percentField("apyPercent", "Savings APY", { default: 4, max: 25, step: 0.05 }),
    ],
    calcResult: { label: "Months to 100%", format: "number" },
    calcResults: [
      { key: "monthsTo100Percent", label: "Months to 100% (Goal Reached)", format: "number", highlight: true },
      { key: "monthsTo25Percent", label: "Months to 25%", format: "number" },
      { key: "monthsTo50Percent", label: "Months to 50%", format: "number" },
      { key: "monthsTo75Percent", label: "Months to 75%", format: "number" },
    ],
    instructions:
      "Enter your goal, what you've saved so far, your monthly deposit, and your savings APY. The tool shows how " +
      "many months from now you'll pass each quarter of the way — handy milestones to celebrate or check against. " +
      "A milestone you've already passed shows 0; 1,200 means 100 years or more.",
    examples:
      "Example: saving toward $20,000 from $1,000 with $500 a month at 4% APY, you pass 25% in 8 months, 50% in 18 " +
      "months, 75% in 27 months, and reach the goal in 36 months.",
    assumptions:
      "Deposits are made at the end of each month and months are rounded up. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why aren't the milestones evenly spaced?",
        answer: "Two things shift them. Money you've already saved gives you a head start toward the first milestone, and as the balance grows it earns more interest each month, so later milestones come a little faster.",
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
