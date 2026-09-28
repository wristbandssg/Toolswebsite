// One-time (but safe to re-run) batch setup script: creates the 9 tools
// of the "Retirement Calculators" sub-batch D (Workplace Plans). Part of the
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
// See src/lib/calc-engine-retirement-workplace-plans.ts for the math, the official
// 2026 figures it uses, and how near-namesake tools are differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-retirement-workplace-plans-calculators.ts
// or
//   npm run db:create-retirement-workplace-plans-calculators

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
    slug: "401k-contribution-calculator",
    title: "401(k) Contribution Calculator",
    description: "See your 2026 401(k) contribution per year and per paycheck, your IRS limit with catch-ups, the percentage needed to max out, and the tax it saves.",
    metaTitle: "401(k) Contribution Calculator (2026) — Max Out?",
    metaDescription: "Free 2026 401(k) contribution calculator. See your contribution per paycheck, your IRS limit with catch-up, and the % of pay needed to max out.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 85000, max: 10000000, step: 1000 }),
      percentField("contributionPercent", "Your Contribution (% of Pay)", { default: 10, max: 100, step: 0.5 }),
      numberField("age", "Your Age at the End of 2026", { default: 45, min: 18, max: 100, step: 1 }),
      dropdownField("payPeriods", "How Often You're Paid", 26, [
        { label: "Weekly (52)", value: 52 },
        { label: "Every Two Weeks (26)", value: 26 },
        { label: "Twice a Month (24)", value: 24 },
        { label: "Monthly (12)", value: 12 },
      ]),
      percentField("marginalRatePercent", "Your Tax Bracket", { default: 22, max: 40, step: 1 }),
    ],
    calcResult: { label: "Your Annual Contribution", format: "currency" },
    calcResults: [
      { key: "yourAnnualContribution", label: "Your 2026 Contribution", format: "currency", highlight: true },
      { key: "perPaycheck", label: "Per Paycheck", format: "currency" },
      { key: "yourLimitFor2026", label: "Your 2026 IRS Limit", format: "currency" },
      { key: "percentNeededToMaxOut", label: "% of Pay Needed to Max Out", format: "percentage" },
      { key: "roomLeftUnderLimit", label: "Room Left Under the Limit", format: "currency" },
      { key: "taxSavedNow", label: "Tax Saved Now (Pre-Tax 401(k))", format: "currency" },
    ],
    instructions:
      "Enter your salary, the percentage you contribute, your age at the end of 2026, how often you're paid, and your tax " +
      "bracket. The tool caps your contribution at your 2026 IRS limit — $24,500, plus an $8,000 catch-up from age 50, or " +
      "an $11,250 catch-up instead if you turn 60–63 in 2026 — and shows what percentage of pay would max it out.",
    examples:
      "Example: contributing 10% of $85,000 is $8,500 a year, or $326.92 per biweekly paycheck. At 45 the limit is $24,500, " +
      "so you'd need 28.82% of pay to max out and have $16,000 of room left. In the 22% bracket, pre-tax contributions save " +
      "$1,870 of federal tax this year.",
    assumptions:
      "2026 limits from the IRS: $24,500 elective deferrals; catch-up $8,000 at 50+, $11,250 at ages 60–63. Employer " +
      "contributions don't count toward your personal limit. Roth 401(k) contributions share the same limit but don't " +
      "cut this year's tax. Under SECURE 2.0, people whose prior-year FICA wages were above $150,000 generally must make " +
      "catch-up contributions as Roth. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is the 401(k) limit for 2026?",
        answer: "$24,500 for employee contributions. People 50 and over can add $8,000, and those turning 60, 61, 62 or 63 in 2026 can add $11,250 instead.",
      },
    ],
  },
  {
    slug: "401k-growth-calculator",
    title: "401(k) Growth Calculator",
    description: "Project your 401(k) with auto-escalation — your contribution rate rising 1% a year to a cap — plus pay raises, employer contributions and plan fees.",
    metaTitle: "401(k) Growth Calculator — Auto-Escalation & Fees",
    metaDescription: "Free 401(k) growth calculator. Project your balance as your contribution rate rises each year, with pay raises, employer money and plan fees.",
    calcInputs: [
      currencyField("currentBalance", "Current 401(k) Balance", { default: 30000, max: 100000000, step: 1000 }),
      currencyField("annualSalary", "Annual Salary", { default: 70000, max: 10000000, step: 1000 }),
      percentField("startPercent", "Your Contribution Now (% of Pay)", { default: 6, max: 100, step: 0.5 }),
      percentField("escalationPercent", "Automatic Increase Each Year", { default: 1, max: 10, step: 0.5 }),
      percentField("maxPercent", "Stop Increasing At", { default: 15, max: 100, step: 0.5 }),
      percentField("employerPercent", "Employer Contribution (% of Pay)", { default: 4, max: 50, step: 0.5 }),
      percentField("salaryGrowthPercent", "Yearly Pay Raise", { default: 3, max: 15, step: 0.25 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 7, max: 20, step: 0.25 }),
      percentField("feePercent", "Plan Fees per Year", { default: 0.5, max: 3, step: 0.05 }),
      numberField("years", "Years Until Retirement", { default: 30, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Projected Balance", format: "currency" },
    calcResults: [
      { key: "projectedBalance", label: "Projected 401(k) Balance", format: "currency", highlight: true },
      { key: "yourContributions", label: "Your Contributions", format: "currency" },
      { key: "employerContributions", label: "Employer Contributions", format: "currency" },
      { key: "finalContributionPercent", label: "Your Contribution Rate at the End", format: "percentage" },
      { key: "finalSalary", label: "Final Salary", format: "currency" },
    ],
    instructions:
      "Enter your balance, salary and current contribution rate, then how much it rises automatically each year and the " +
      "rate where the increases stop — many plans offer this \"auto-escalation\". Add your employer's contribution, pay " +
      "raises, expected return and plan fees. The tool projects your balance year by year.",
    examples:
      "Example: $30,000 today on a $70,000 salary, contributing 6% and rising 1% a year to 15%, with a 4% employer " +
      "contribution, 3% raises, 7% returns and 0.5% fees, grows to $1,707,410.34 in 30 years. You'd put in $465,384.68 " +
      "and your employer $133,211.16.",
    assumptions:
      "Contributions are monthly; rates and salary step up once a year. Fees are subtracted from the return. Future IRS " +
      "limits aren't applied — they rise over time, but very high earners could hit them. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is 401(k) auto-escalation?",
        answer: "A plan feature that raises your contribution rate automatically — usually by 1% a year — until it reaches a cap. It's an easy way to save more without having to decide each year.",
      },
    ],
  },
  {
    slug: "401k-match-calculator",
    title: "401(k) Match Calculator",
    description: "Calculate your employer's 401(k) match under a two-tier formula (like 100% of the first 3% plus 50% of the next 2%) and the match you're leaving unclaimed.",
    metaTitle: "401(k) Match Calculator — Two-Tier Match Formula",
    metaDescription: "Free 401(k) match calculator. Work out your employer match with a two-tier formula and see how much free money you're leaving on the table.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 75000, max: 10000000, step: 1000 }),
      percentField("yourPercent", "Your Contribution (% of Pay)", { default: 4, max: 100, step: 0.5 }),
      percentField("tier1MatchPercent", "Tier 1: Employer Matches This %", { default: 100, max: 200, step: 5 }),
      percentField("tier1UpToPercent", "Tier 1: Of Your First … % of Pay", { default: 3, max: 20, step: 0.5 }),
      percentField("tier2MatchPercent", "Tier 2: Employer Matches This %", { default: 50, max: 200, step: 5 }),
      percentField("tier2NextPercent", "Tier 2: Of the Next … % of Pay", { default: 2, max: 20, step: 0.5 }),
    ],
    calcResult: { label: "Employer Match per Year", format: "currency" },
    calcResults: [
      { key: "employerMatchPerYear", label: "Employer Match per Year", format: "currency", highlight: true },
      { key: "matchAsPercentOfSalary", label: "Match as % of Salary", format: "percentage" },
      { key: "contributeThisMuchForFullMatchPercent", label: "Contribute This % for the Full Match", format: "percentage" },
      { key: "maximumPossibleMatch", label: "Maximum Possible Match", format: "currency" },
      { key: "matchLeftUnclaimed", label: "Match You're Leaving Unclaimed", format: "currency" },
    ],
    instructions:
      "Enter your salary and contribution rate, then your employer's match formula. A common \"safe harbor\" formula is " +
      "100% of the first 3% of pay plus 50% of the next 2%; for a single-tier match (say 50% of the first 6%), set tier 2 " +
      "to 0. The tool shows your match and how much more you'd get by contributing enough for the full amount.",
    examples:
      "Example: on $75,000, contributing 4% under a 100%-of-3% plus 50%-of-next-2% formula gets you a $2,625 match (3.5% " +
      "of pay). Contributing 5% would earn the full $3,000 — you're leaving $375 a year unclaimed.",
    assumptions:
      "The match is worked out on your yearly pay (capped at the 2026 compensation limit of $360,000). Some employers match " +
      "per paycheck, so front-loading contributions can miss matches without a \"true-up\". Matches may vest over time. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I always contribute enough to get the full match?",
        answer: "In most cases, yes — a match is an instant return on your money. Even with debt to pay off, capturing the full match is usually the first priority.",
      },
    ],
  },
  {
    slug: "401k-withdrawal-calculator",
    title: "401(k) Withdrawal Calculator",
    description: "See what you'd keep from a 401(k) withdrawal after tax, state tax and the 10% early penalty — including the Rule of 55 and the mandatory 20% withholding.",
    metaTitle: "401(k) Withdrawal Calculator — Rule of 55 & Tax",
    metaDescription: "Free 401(k) withdrawal calculator. See tax, the 10% early penalty, the Rule of 55 exception and 20% withholding on a 401(k) withdrawal.",
    calcInputs: [
      currencyField("amount", "Amount to Withdraw", { default: 30000, max: 10000000, step: 500 }),
      numberField("age", "Your Age", { default: 56, min: 18, max: 100, step: 0.5 }),
      dropdownField("leftJobAt55OrLater", "Did You Leave This Employer in or After the Year You Turned 55?", 1, [
        { label: "Yes (Rule of 55 applies)", value: 1 },
        { label: "No / Still Working There", value: 0 },
      ]),
      percentField("federalRatePercent", "Federal Tax Bracket", { default: 22, max: 40, step: 1 }),
      percentField("stateRatePercent", "State Income Tax Rate", { default: 5, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Amount You Keep", format: "currency" },
    calcResults: [
      { key: "amountYouKeep", label: "Amount You Keep (After All Tax)", format: "currency", highlight: true },
      { key: "earlyWithdrawalPenalty", label: "10% Early Withdrawal Penalty", format: "currency" },
      { key: "federalTax", label: "Federal Income Tax", format: "currency" },
      { key: "stateTax", label: "State Income Tax", format: "currency" },
      { key: "federalWithheldUpFront", label: "20% Federal Withholding Taken Up Front", format: "currency" },
      { key: "federalOwedAtTaxTime", label: "More Federal Tax Due (+) or Refund (−) at Tax Time", format: "currency" },
    ],
    instructions:
      "Enter the amount, your age, whether you left the employer that sponsors this 401(k) in or after the year you turned " +
      "55, and your tax rates. Before 59½ there's usually a 10% penalty — but the Rule of 55 waives it for the plan of a " +
      "job you left at 55 or later. Plans must withhold 20% for federal tax up front; the tool shows whether you'll owe " +
      "more or get some back when you file.",
    examples:
      "Example: a 56-year-old who left their job at 55 withdraws $30,000. No penalty applies; federal tax is $6,600 and " +
      "state tax $1,500, so they keep $21,900. The plan withholds $6,000 up front, leaving $600 more to pay at tax time.",
    assumptions:
      "Uses flat rates. The Rule of 55 applies only to the plan of the employer you left (not IRAs or earlier jobs' " +
      "plans); for public safety workers it's age 50. Rolling the money to an IRA first would lose the Rule of 55. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is the Rule of 55?",
        answer: "If you leave your job in or after the year you turn 55, you can withdraw from that employer's 401(k) without the 10% early-withdrawal penalty. Regular income tax still applies.",
      },
    ],
  },
  {
    slug: "401k-rollover-calculator",
    title: "401(k) Rollover Calculator",
    description: "Compare your options for an old 401(k): leave it, roll it into a lower-cost IRA, or cash it out — and see what each is worth.",
    metaTitle: "401(k) Rollover Calculator — Roll Over or Leave It?",
    metaDescription: "Free 401(k) rollover calculator. Compare leaving an old 401(k), rolling it to a lower-fee IRA, or cashing out after tax and penalty.",
    calcInputs: [
      currencyField("balance", "Old 401(k) Balance", { default: 80000, max: 100000000, step: 1000 }),
      numberField("years", "Years Until You Need It", { default: 20, min: 0, max: 60, step: 1 }),
      percentField("annualReturnPercent", "Expected Annual Return (Before Fees)", { default: 7, max: 20, step: 0.25 }),
      percentField("oldPlanFeePercent", "Old Plan's Total Fees per Year", { default: 0.9, max: 3, step: 0.05 }),
      percentField("iraFeePercent", "IRA's Total Fees per Year", { default: 0.2, max: 3, step: 0.05 }),
      numberField("age", "Your Age", { default: 40, min: 18, max: 100, step: 0.5 }),
      percentField("taxRatePercent", "Federal Tax Bracket (If Cashing Out)", { default: 24, max: 40, step: 1 }),
      percentField("stateRatePercent", "State Tax Rate (If Cashing Out)", { default: 5, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Rollover Advantage", format: "currency" },
    calcResults: [
      { key: "rolloverAdvantage", label: "Extra from Rolling Over (vs Leaving It)", format: "currency", highlight: true },
      { key: "rolloverToIraValue", label: "Roll Over to IRA — Future Value", format: "currency" },
      { key: "leaveInOldPlanValue", label: "Leave in Old Plan — Future Value", format: "currency" },
      { key: "cashOutNowAfterTaxAndPenalty", label: "Cash Out Now — What You'd Get", format: "currency" },
      { key: "costOfCashingOut", label: "Lost to Tax and Penalty If Cashing Out", format: "currency" },
    ],
    instructions:
      "Enter the old 401(k) balance, the years until you'll need it, the expected return, and the total yearly fees of the " +
      "old plan and of an IRA you'd move it to. For comparison, enter your age and tax rates to see the cost of cashing " +
      "out instead.",
    examples:
      "Example: $80,000 left for 20 years at 7% grows to $261,455.43 with 0.9% fees, or $298,205.08 in an IRA charging " +
      "0.2% — $36,749.65 more. Cashing out at 40 would leave just $48,800 after 24% federal tax, 5% state tax and the 10% " +
      "penalty.",
    assumptions:
      "A direct (trustee-to-trustee) rollover is tax-free. Returns before fees are the same in both accounts. Reasons to " +
      "keep a 401(k) include the Rule of 55, stronger creditor protection in some states, and institutional-priced funds. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I roll my old 401(k) into an IRA?",
        answer: "Often, if the IRA has lower fees and better investment choices. Moving it into a new employer's 401(k) is another option. Cashing out is usually the costliest choice.",
      },
    ],
  },
  {
    slug: "403b-calculator",
    title: "403(b) Calculator",
    description: "Find your 2026 403(b) contribution limit — including the special 15-year catch-up for long-serving employees — and project your balance.",
    metaTitle: "403(b) Calculator (2026) — Limits & 15-Year Catch-Up",
    metaDescription: "Free 2026 403(b) calculator. Find your contribution limit with the age-50 and 15-year catch-ups and project your 403(b) balance at retirement.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 65000, max: 10000000, step: 1000 }),
      percentField("contributionPercent", "Your Contribution (% of Pay)", { default: 12, max: 100, step: 0.5 }),
      numberField("age", "Your Age at the End of 2026", { default: 52, min: 18, max: 100, step: 1 }),
      numberField("yearsOfService", "Years with This Employer", { default: 16, min: 0, max: 60, step: 1 }),
      currencyField("fifteenYearCatchUpUsed", "15-Year Catch-Up Already Used (Lifetime)", { default: 0, max: 15000, step: 500 }),
      currencyField("currentBalance", "Current 403(b) Balance", { default: 90000, max: 100000000, step: 1000 }),
      numberField("yearsToRetirement", "Years Until Retirement", { default: 13, min: 0, max: 60, step: 1 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 6, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Your 2026 Limit", format: "currency" },
    calcResults: [
      { key: "yourLimitFor2026", label: "Your 2026 Contribution Limit", format: "currency", highlight: true },
      { key: "fifteenYearCatchUpAvailable", label: "15-Year Catch-Up Available This Year", format: "currency" },
      { key: "yourAnnualContribution", label: "Your Planned Contribution", format: "currency" },
      { key: "projectedBalance", label: "Projected Balance at Retirement", format: "currency" },
    ],
    instructions:
      "403(b) plans are for employees of schools, hospitals, churches and other non-profits. Enter your salary, " +
      "contribution rate, age, years with your employer and any 15-year catch-up used before. With 15+ years of service " +
      "at an eligible organization you may add up to $3,000 a year (up to $15,000 in your lifetime) on top of the regular " +
      "limit and the age-50 catch-up.",
    examples:
      "Example: a 52-year-old with 16 years' service has a 2026 limit of $35,500: $24,500 + $3,000 (15-year catch-up) + " +
      "$8,000 (age 50+). Contributing 12% of $65,000 ($7,800 a year) to a $90,000 balance at 6% grows to $348,992.06 in " +
      "13 years.",
    assumptions:
      "The 15-year catch-up has an extra test (your past contributions must average under $5,000 a year) that the tool " +
      "doesn't check; your plan must also offer it. Ages 60–63 use the $11,250 catch-up instead of $8,000. Contributions " +
      "are assumed level. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a 403(b) the same as a 401(k)?",
        answer: "They work alike and share the same $24,500 limit for 2026. The 403(b) is for non-profit and public-school employers, and some 403(b) plans allow the extra 15-year catch-up.",
      },
    ],
  },
  {
    slug: "457b-calculator",
    title: "457(b) Calculator",
    description: "Find your 2026 457(b) limit — including the special catch-up of up to double the limit in the final three years before retirement — and project your balance.",
    metaTitle: "457(b) Calculator (2026) — Special Catch-Up",
    metaDescription: "Free 2026 457(b) calculator. Find your limit with the final-3-years special catch-up or age-50 catch-up and project your 457(b) balance.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 90000, max: 10000000, step: 1000 }),
      percentField("contributionPercent", "Your Contribution (% of Pay)", { default: 30, max: 100, step: 0.5 }),
      numberField("age", "Your Age at the End of 2026", { default: 58, min: 18, max: 100, step: 1 }),
      dropdownField("inFinalThreeYears", "In the 3 Years Before Your Plan's Normal Retirement Age?", 1, [
        { label: "Yes", value: 1 },
        { label: "No", value: 0 },
      ]),
      currencyField("underusedPriorLimits", "Unused Limits from Earlier Years", { default: 40000, max: 1000000, step: 1000 }),
      currencyField("currentBalance", "Current 457(b) Balance", { default: 120000, max: 100000000, step: 1000 }),
      numberField("yearsToRetirement", "Years Until Retirement", { default: 3, min: 0, max: 60, step: 1 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 6, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Your 2026 Limit", format: "currency" },
    calcResults: [
      { key: "yourLimitFor2026", label: "Your 2026 Contribution Limit", format: "currency", highlight: true },
      { key: "extraRoomFromSpecialCatchUp", label: "Extra Room from the Special Catch-Up", format: "currency" },
      { key: "yourAnnualContribution", label: "Your Planned Contribution", format: "currency" },
      { key: "projectedBalance", label: "Projected Balance at Retirement", format: "currency" },
    ],
    instructions:
      "457(b) plans are offered mainly by state and local governments. Enter your salary, contribution rate and age. If " +
      "you're in the three years before your plan's normal retirement age, enter how much of past years' limits you didn't " +
      "use: the special catch-up lets you contribute up to twice the regular limit. You can't use it together with the " +
      "age-50 catch-up in the same year — the tool uses whichever gives the higher limit.",
    examples:
      "Example: a 58-year-old in the final three years with $40,000 of unused past limits can contribute up to $49,000 " +
      "in 2026 — $16,500 more than the $32,500 age-based limit. Contributing 30% of $90,000 ($27,000) for 3 years on a " +
      "$120,000 balance at 6% gives $232,107.90.",
    assumptions:
      "For governmental 457(b) plans. The 457(b) limit is separate from a 401(k) or 403(b), so you may be able to " +
      "contribute to both. Withdrawals after you leave the employer have no 10% early penalty. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I contribute to a 457(b) and a 403(b) at the same time?",
        answer: "Yes — the 457(b) has its own separate limit, so an employee with both plans could contribute $24,500 to each in 2026 (plus eligible catch-ups).",
      },
    ],
  },
  {
    slug: "sep-ira-calculator",
    title: "SEP IRA Calculator",
    description: "Calculate your maximum 2026 SEP IRA contribution as a self-employed person (from net profit after self-employment tax) or as an employee of your own company.",
    metaTitle: "SEP IRA Calculator (2026) — Self-Employed Limit",
    metaDescription: "Free 2026 SEP IRA calculator. Find your max contribution from self-employment net profit or W-2 wages, and the tax it could save.",
    calcInputs: [
      dropdownField("businessType", "How You're Paid", 1, [
        { label: "Self-employed (sole proprietor, single-member LLC)", value: 1 },
        { label: "W-2 wages from my own corporation", value: 2 },
      ]),
      currencyField("income", "Net Profit (Self-Employed) or W-2 Wages", { default: 120000, max: 10000000, step: 1000 }),
      percentField("marginalRatePercent", "Your Tax Bracket", { default: 24, max: 40, step: 1 }),
    ],
    calcResult: { label: "Max SEP Contribution", format: "currency" },
    calcResults: [
      { key: "maxSepContribution", label: "Maximum 2026 SEP IRA Contribution", format: "currency", highlight: true },
      { key: "shareOfIncomePercent", label: "As % of Your Income", format: "percentage" },
      { key: "taxSaved", label: "Federal Tax Saved", format: "currency" },
      { key: "halfSelfEmploymentTaxDeduction", label: "Half of Self-Employment Tax (Deducted First)", format: "currency" },
    ],
    instructions:
      "Choose how you're paid and enter your net profit (Schedule C) or W-2 wages. For the self-employed, the contribution " +
      "is based on profit minus half of your self-employment tax, which works out to about 20% of net profit. For W-2 wages " +
      "from your own corporation, it's 25% of wages. Either way, 2026 contributions are capped at $72,000.",
    examples:
      "Example: $120,000 of self-employment profit means about $16,955 of self-employment tax, half of which ($8,477.73) is " +
      "deducted first. The maximum SEP contribution is $22,304.45 — 18.59% of profit — saving $5,353.07 at 24%.",
    assumptions:
      "2026 figures: $72,000 contribution cap, $360,000 compensation limit, $184,500 Social Security wage base for SE tax. " +
      "If you have employees, you must contribute the same percentage for eligible employees. The 0.9% additional " +
      "Medicare tax isn't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is it 20% and not 25% for self-employed people?",
        answer: "The law says 25% of compensation, but for the self-employed \"compensation\" is profit after the SEP contribution itself. Working that out gives an effective 20% of net profit after half of self-employment tax.",
      },
    ],
  },
  {
    slug: "simple-ira-calculator",
    title: "SIMPLE IRA Calculator",
    description: "Calculate your 2026 SIMPLE IRA contributions — your salary deferral within the IRS limit plus your employer's 3% match or 2% contribution.",
    metaTitle: "SIMPLE IRA Calculator (2026) — Limit & Employer Match",
    metaDescription: "Free 2026 SIMPLE IRA calculator. See your deferral limit with catch-up and your employer's 3% match or 2% non-elective contribution.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 60000, max: 10000000, step: 1000 }),
      percentField("deferralPercent", "Your Deferral (% of Pay)", { default: 8, max: 100, step: 0.5 }),
      numberField("age", "Your Age at the End of 2026", { default: 55, min: 18, max: 100, step: 1 }),
      dropdownField("employerOption", "Employer Contribution Type", 1, [
        { label: "Match up to 3% of pay", value: 1 },
        { label: "2% of pay for everyone (non-elective)", value: 2 },
      ]),
    ],
    calcResult: { label: "Total Contribution", format: "currency" },
    calcResults: [
      { key: "totalAnnualContribution", label: "Total 2026 Contribution (You + Employer)", format: "currency", highlight: true },
      { key: "yourContribution", label: "Your Deferral", format: "currency" },
      { key: "employerContribution", label: "Employer Contribution", format: "currency" },
      { key: "yourLimitFor2026", label: "Your 2026 Deferral Limit", format: "currency" },
      { key: "perBiweeklyPaycheck", label: "Your Deferral per Biweekly Paycheck", format: "currency" },
    ],
    instructions:
      "SIMPLE IRAs are for small employers (usually 100 or fewer employees). Enter your salary, deferral rate and age, and " +
      "choose your employer's formula: a dollar-for-dollar match of up to 3% of your pay, or a flat 2% of pay for every " +
      "eligible employee whether or not they contribute.",
    examples:
      "Example: a 55-year-old deferring 8% of $60,000 puts in $4,800 (limit $21,000 with the catch-up). The employer's 3% " +
      "match adds $1,800, for $6,600 in total — $184.62 per biweekly paycheck from you.",
    assumptions:
      "2026 IRS limits: $17,000 deferral; catch-up $4,000 at 50+, $5,250 at ages 60–63. Employers with 25 or fewer " +
      "employees may allow a higher $18,100 limit. The 2% option uses pay up to $360,000. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between a SIMPLE IRA and a 401(k)?",
        answer: "A SIMPLE IRA is cheaper and easier for small businesses to run, but has a lower contribution limit ($17,000 vs $24,500 in 2026) and requires an employer contribution.",
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
