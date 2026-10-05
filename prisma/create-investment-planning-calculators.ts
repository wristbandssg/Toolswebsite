// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Investment Calculators" sub-batch B (Growth, Goals & Time
// Value). Part of the Investment Calculators tool-list build-out — see
// create-investment-returns-calculators.ts for the full batch context and
// the 6 skipped duplicates.
//
// See src/lib/calc-engine-investment-planning.ts for the math and for
// notes on how these tools are deliberately differentiated from the
// existing investment-calculator and the Interest Calculators' compound/
// contribution tools.
//
// HOW TO RUN
//   npx tsx prisma/create-investment-planning-calculators.ts
// or
//   npm run db:create-investment-planning-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Re-pointed 5 Oct 2026: Investment Calculators was split into 5 sub-categories
// (see organize-tool-categories.ts). Each tool is filed in one of them; a
// missing sub-category is created under Investment Calculators.
const PARENT_CATEGORY_SLUG = "investment-calculators";
const SUBCATEGORY_NAMES: Record<string, string> = {
  "investment-returns-planning-calculators": "Investment Returns & Planning Calculators",
};
const TOOL_CATEGORY: Record<string, string> = {
  "compound-investment-calculator": "investment-returns-planning-calculators",
  "investment-growth-calculator": "investment-returns-planning-calculators",
  "investment-goal-calculator": "investment-returns-planning-calculators",
  "investment-contribution-calculator": "investment-returns-planning-calculators",
  "investment-time-horizon-calculator": "investment-returns-planning-calculators",
  "investment-future-value-calculator": "investment-returns-planning-calculators",
  "investment-present-value-calculator": "investment-returns-planning-calculators",
  "lump-sum-vs-dollar-cost-averaging-calculator": "investment-returns-planning-calculators",
  "rule-of-72-calculator": "investment-returns-planning-calculators",
  "investment-doubling-time-calculator": "investment-returns-planning-calculators",
};

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
  "This tool provides general estimates for informational purposes only and isn't financial or investment " +
  "advice. Past returns don't guarantee future results — consider speaking with a licensed financial " +
  "professional about your own situation.";

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
    slug: "compound-investment-calculator",
    title: "Compound Investment Calculator",
    description: "Project how an investment grows with monthly contributions that increase by a set percentage every year.",
    metaTitle: "Compound Investment Calculator — Free & Instant",
    metaDescription: "Free compound investment calculator. Project growth from a starting amount plus monthly contributions that rise each year with your income.",
    calcInputs: [
      currencyField("initialInvestment", "Initial Investment", { default: 10000, step: 500 }),
      currencyField("monthlyContribution", "Monthly Contribution (Year 1)", { default: 300, max: 1000000, step: 25 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 7, min: -20, max: 30, step: 0.1 }),
      percentField("annualIncreasePercent", "Yearly Increase in Contributions", { default: 3, max: 30, step: 0.5 }),
      numberField("years", "Years to Invest", { default: 20, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Ending Balance", format: "currency" },
    calcResults: [
      { key: "endingBalance", label: "Ending Balance", format: "currency", highlight: true },
      { key: "totalContributed", label: "Total Contributed", format: "currency" },
      { key: "totalGrowth", label: "Investment Growth", format: "currency" },
    ],
    instructions:
      "Enter what you're starting with, how much you'll invest each month in the first year, your expected annual " +
      "return, and how much you plan to raise your monthly contribution each year (for example, in line with pay " +
      "rises). Enter 0% for a flat contribution. The tool compounds monthly and shows how much of the final " +
      "balance came from your own money versus investment growth.",
    examples:
      "Example: $10,000 plus $300 a month, raised 3% each year, at a 7% return for 20 years grows to $236,660.56 — " +
      "$106,733.35 contributed and $129,927.22 from growth.",
    assumptions:
      "Returns are applied monthly at 1/12 of the annual rate, contributions are made at the end of each month, " +
      "and the contribution steps up once a year. Real returns vary from year to year; fees and taxes aren't " +
      "included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the Investment Calculator?",
        answer: "The Investment Calculator uses the same monthly contribution for every year. This tool lets your contribution grow each year, which is closer to how most people actually invest as their income rises.",
      },
    ],
  },
  {
    slug: "investment-growth-calculator",
    title: "Investment Growth Calculator",
    description: "See how a one-time investment grows at a steady annual return, with milestone values every 5 years up to 30 years.",
    metaTitle: "Investment Growth Calculator — Free & Instant",
    metaDescription: "Free investment growth calculator. See what a one-time investment could be worth in 5, 10, 15, 20, 25, and 30 years at your expected return.",
    calcInputs: [
      currencyField("initialInvestment", "One-Time Investment", { default: 25000, step: 500 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 7, min: -20, max: 30, step: 0.1 }),
    ],
    calcResult: { label: "Value After 30 Years", format: "currency" },
    calcResults: [
      { key: "valueYear5", label: "Value After 5 Years", format: "currency" },
      { key: "valueYear10", label: "Value After 10 Years", format: "currency" },
      { key: "valueYear15", label: "Value After 15 Years", format: "currency" },
      { key: "valueYear20", label: "Value After 20 Years", format: "currency" },
      { key: "valueYear25", label: "Value After 25 Years", format: "currency" },
      { key: "valueYear30", label: "Value After 30 Years", format: "currency", highlight: true },
    ],
    instructions:
      "Enter a one-time amount and the average annual return you expect. Instead of a single answer, the tool " +
      "shows what the investment would be worth at 5-year milestones up to 30 years, so you can see how growth " +
      "speeds up over longer periods.",
    examples:
      "Example: $25,000 growing 7% a year becomes $35,063.79 after 5 years, $49,178.78 after 10, $96,742.11 after " +
      "20, and $190,306.38 after 30.",
    assumptions:
      "Assumes a steady return compounded once a year, with no further deposits, withdrawals, fees, or taxes. " +
      "Real investments rise and fall, so actual values will differ. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does the value grow faster in later years?",
        answer: "Because each year's growth is earned on everything before it, including earlier growth. At 7% the investment roughly doubles every 10 years, so the last 10 years add more money than the first 20 combined.",
      },
    ],
  },
  {
    slug: "investment-goal-calculator",
    title: "Investment Goal Calculator",
    description: "Check whether your current savings and monthly investing will reach your goal, and how much more per month you'd need if not.",
    metaTitle: "Investment Goal Calculator — Am I on Track?",
    metaDescription: "Free investment goal calculator. See if your savings and monthly investing will reach your goal, and the extra monthly amount needed to close any gap.",
    calcInputs: [
      currencyField("goalAmount", "Investment Goal", { default: 750000, step: 5000 }),
      currencyField("currentSavings", "Current Savings Invested", { default: 50000, step: 1000 }),
      currencyField("monthlyContribution", "Current Monthly Contribution", { default: 800, max: 1000000, step: 25 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 7, min: -20, max: 30, step: 0.1 }),
      numberField("years", "Years Until Goal", { default: 20, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Surplus / Shortfall", format: "currency" },
    calcResults: [
      { key: "projectedValue", label: "Projected Value", format: "currency" },
      { key: "surplusOrShortfall", label: "Surplus (+) or Shortfall (−)", format: "currency", highlight: true },
      { key: "extraMonthlyNeeded", label: "Extra Monthly Contribution Needed", format: "currency" },
    ],
    instructions:
      "Enter your goal, what you already have invested, what you currently invest each month, your expected " +
      "return, and how many years you have. The tool projects where your current plan will get you. A negative " +
      "result is a shortfall, and the tool shows how much extra you'd need to invest each month to close it; a " +
      "positive result means you're ahead of plan.",
    examples:
      "Example: $50,000 invested plus $800 a month at 7% for 20 years projects to $618,678.27 — $131,321.73 short " +
      "of a $750,000 goal. Investing an extra $252.09 a month would close the gap.",
    assumptions:
      "Returns are compounded monthly at 1/12 of the annual rate, and contributions are made at the end of each " +
      "month. The goal is in future dollars — raise it to allow for inflation if your goal is in today's money. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I'm already ahead?",
        answer: "Then the surplus shows as a positive number and the extra monthly amount is $0. You could reach your goal sooner, invest less, or take a little less risk.",
      },
    ],
  },
  {
    slug: "investment-contribution-calculator",
    title: "Investment Contribution Calculator",
    description: "Work out how much you need to invest each week, fortnight, month, quarter, or year to reach a target amount.",
    metaTitle: "Investment Contribution Calculator — Free & Instant",
    metaDescription: "Free investment contribution calculator. Find how much to invest per week, fortnight, month, quarter, or year to reach your target amount.",
    calcInputs: [
      currencyField("targetAmount", "Target Amount", { default: 250000, step: 5000 }),
      currencyField("currentBalance", "Current Balance", { default: 20000, step: 1000 }),
      numberField("years", "Years to Reach Target", { default: 15, min: 1, max: 60, step: 1 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 7, min: -20, max: 30, step: 0.1 }),
      {
        key: "contributionsPerYear", label: "How Often You'll Contribute", type: "dropdown", required: true, default: 26,
        options: [
          { label: "Weekly", value: 52 },
          { label: "Every Two Weeks", value: 26 },
          { label: "Monthly", value: 12 },
          { label: "Quarterly", value: 4 },
          { label: "Annually", value: 1 },
        ],
      },
    ],
    calcResult: { label: "Contribution Per Period", format: "currency" },
    calcResults: [
      { key: "contributionPerPeriod", label: "Contribution Needed Each Period", format: "currency", highlight: true },
      { key: "annualContributionTotal", label: "Total Per Year", format: "currency" },
      { key: "totalContributions", label: "Total Contributions Over All Years", format: "currency" },
      { key: "growthFromReturns", label: "Growth From Returns", format: "currency" },
    ],
    instructions:
      "Enter your target, what you already have, how many years you have, your expected annual return, and how " +
      "often you'll invest — for example, every payday. The tool finds the amount you need to put in each time. " +
      "Contributing more often means each deposit is smaller and starts working sooner.",
    examples:
      "Example: to grow $20,000 into $250,000 in 15 years at a 7% annual return, you'd need to invest $288.58 " +
      "every two weeks ($7,503.21 a year). You'd put in $112,548.13 in total, with $117,451.87 coming from growth.",
    assumptions:
      "The per-period return is set so it compounds to exactly your annual return, whatever the contribution " +
      "frequency — so changing frequency changes only when money goes in, not the return you assume. " +
      "Contributions are made at the end of each period. If your current balance alone will reach the target, " +
      "the contribution shows as $0. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the Investment Goal Calculator?",
        answer: "The Goal Calculator checks whether your existing plan is on track. This tool starts from scratch and tells you the exact contribution needed, at whatever frequency matches your pay schedule.",
      },
    ],
  },
  {
    slug: "investment-time-horizon-calculator",
    title: "Investment Time Horizon Calculator",
    description: "Find out how many years it will take for your investments to reach a target amount with regular monthly contributions.",
    metaTitle: "Investment Time Horizon Calculator — Free",
    metaDescription: "Free investment time horizon calculator. See how many years and months it will take to reach your target with your current savings and monthly investing.",
    calcInputs: [
      currencyField("currentValue", "Current Investment Value", { default: 30000, step: 1000 }),
      currencyField("monthlyContribution", "Monthly Contribution", { default: 500, max: 1000000, step: 25 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 7, max: 30, step: 0.1 }),
      currencyField("targetValue", "Target Amount", { default: 300000, step: 5000 }),
    ],
    calcResult: { label: "Years Needed", format: "number" },
    calcResults: [
      { key: "yearsNeeded", label: "Years Needed", format: "number", highlight: true },
      { key: "monthsNeeded", label: "Months Needed (Rounded Up)", format: "number" },
      { key: "totalContributed", label: "Total You'll Have Put In", format: "currency" },
    ],
    instructions:
      "Enter what your investments are worth now, how much you add each month, your expected annual return, and " +
      "the amount you want to reach. The tool works out how long it will take, in years and in whole months.",
    examples:
      "Example: $30,000 invested plus $500 a month at 7% reaches $300,000 in about 17.25 years (207 months), with " +
      "$133,500 of your own money put in.",
    assumptions:
      "Returns are compounded monthly at 1/12 of the annual rate, with contributions at the end of each month. If " +
      "the target is already reached, the result is 0. If it can never be reached (no balance and no " +
      "contributions), the result also shows 0. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What shortens the time horizon most?",
        answer: "Early on, a bigger monthly contribution usually helps most. Later, once the balance is large, the return rate matters more because growth is being earned on a much larger amount.",
      },
    ],
  },
  {
    slug: "investment-future-value-calculator",
    title: "Investment Future Value Calculator",
    description: "Calculate the future value of a lump sum plus regular payments, at any payment frequency, with start- or end-of-period timing.",
    metaTitle: "Investment Future Value Calculator — Free (FV)",
    metaDescription: "Free investment future value calculator. Find the FV of a lump sum plus regular payments at any frequency, with the two parts shown separately.",
    calcInputs: [
      currencyField("presentValue", "Present Value (Lump Sum Today)", { default: 10000, step: 500 }),
      currencyField("paymentPerPeriod", "Payment Each Period", { default: 250, max: 1000000, step: 25 }),
      percentField("annualRatePercent", "Annual Rate of Return", { default: 6, min: -20, max: 30, step: 0.1 }),
      {
        key: "periodsPerYear", label: "Payment & Compounding Frequency", type: "dropdown", required: true, default: 12,
        options: [
          { label: "Weekly", value: 52 },
          { label: "Every Two Weeks", value: 26 },
          { label: "Monthly", value: 12 },
          { label: "Quarterly", value: 4 },
          { label: "Semi-Annually", value: 2 },
          { label: "Annually", value: 1 },
        ],
      },
      numberField("years", "Number of Years", { default: 15, min: 1, max: 60, step: 1 }),
      {
        key: "paymentTiming", label: "Payment Timing", type: "dropdown", required: true, default: 0,
        options: [
          { label: "End of Each Period", value: 0 },
          { label: "Start of Each Period", value: 1 },
        ],
      },
    ],
    calcResult: { label: "Future Value", format: "currency" },
    calcResults: [
      { key: "futureValue", label: "Future Value", format: "currency", highlight: true },
      { key: "fvOfPresentValue", label: "From the Lump Sum", format: "currency" },
      { key: "fvOfPayments", label: "From the Regular Payments", format: "currency" },
      { key: "totalPaid", label: "Total Amount Paid In", format: "currency" },
    ],
    instructions:
      "Enter the amount you're investing today, the regular payment you'll add, the annual rate of return, how " +
      "often payments are made (compounding is set to match), the number of years, and whether payments are made " +
      "at the start or end of each period. The result shows the total future value, split into the part that " +
      "comes from today's lump sum and the part that comes from your payments.",
    examples:
      "Example: $10,000 today plus $250 at the end of every month at 6% for 15 years has a future value of " +
      "$97,245.61 — $24,540.94 from the lump sum and $72,704.68 from the payments — on $55,000 paid in.",
    assumptions:
      "Uses the standard time-value-of-money formulas: lump sum × (1 + i)^n plus payment × ((1 + i)^n − 1) ÷ i, " +
      "multiplied by (1 + i) for start-of-period payments, where i is the annual rate ÷ periods per year. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between start- and end-of-period payments?",
        answer: "A payment at the start of a period (an \"annuity due\") earns one extra period of growth compared with a payment at the end (an \"ordinary annuity\"), so it always ends slightly higher.",
      },
    ],
  },
  {
    slug: "investment-present-value-calculator",
    title: "Investment Present Value Calculator",
    description: "Find what a future amount — and a stream of yearly payments — is worth in today's money at your chosen discount rate.",
    metaTitle: "Investment Present Value Calculator — Free (PV)",
    metaDescription: "Free present value calculator. Discount a future lump sum and a series of yearly payments back to today's value at your chosen rate of return.",
    calcInputs: [
      currencyField("futureValue", "Future Lump Sum", { default: 100000, step: 1000 }),
      currencyField("annualPayment", "Yearly Payment Received (Optional)", { default: 5000, max: 10000000, step: 100 }),
      percentField("discountRatePercent", "Discount Rate (Required Return)", { default: 6, max: 30, step: 0.1 }),
      numberField("years", "Number of Years", { default: 10, min: 1, max: 100, step: 1 }),
    ],
    calcResult: { label: "Present Value", format: "currency" },
    calcResults: [
      { key: "presentValue", label: "Present Value", format: "currency", highlight: true },
      { key: "pvOfFutureValue", label: "Present Value of the Lump Sum", format: "currency" },
      { key: "pvOfPayments", label: "Present Value of the Yearly Payments", format: "currency" },
      { key: "totalDiscount", label: "Total Discount (Future Amounts − Present Value)", format: "currency" },
    ],
    instructions:
      "Enter an amount you'll receive in the future, any yearly payment you'll receive along the way (enter $0 " +
      "if none), the rate of return you could earn elsewhere, and the number of years. The tool tells you what " +
      "all of that is worth today — the most you should pay now to receive it.",
    examples:
      "Example: $100,000 in 10 years plus $5,000 a year in the meantime, discounted at 6%, is worth $92,639.91 " +
      "today — $55,839.48 for the lump sum and $36,800.44 for the payments.",
    assumptions:
      "Discounts once a year, with yearly payments received at the end of each year. The discount rate should be " +
      "the return you could reasonably earn on an investment of similar risk. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I choose a discount rate?",
        answer: "Use the return you'd expect from your next-best investment with similar risk. A higher rate means future money is worth less today, so the present value falls.",
      },
    ],
  },
  {
    slug: "lump-sum-vs-dollar-cost-averaging-calculator",
    title: "Lump Sum vs Dollar-Cost Averaging Calculator",
    description: "Compare investing a sum all at once with spreading it out over several months, with uninvested cash earning interest meanwhile.",
    metaTitle: "Lump Sum vs Dollar-Cost Averaging Calculator",
    metaDescription: "Free lump sum vs dollar-cost averaging calculator. Compare investing everything now with spreading it over months while idle cash earns interest.",
    calcInputs: [
      currencyField("amount", "Amount to Invest", { default: 60000, step: 1000 }),
      numberField("months", "Months to Spread It Over (DCA)", { default: 12, min: 1, max: 60, step: 1 }),
      percentField("expectedReturnPercent", "Expected Annual Market Return", { default: 8, min: -50, max: 50, step: 0.1 }),
      percentField("cashYieldPercent", "Interest on Cash Waiting to Be Invested", { default: 4, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "Lump Sum Advantage", format: "currency" },
    calcResults: [
      { key: "lumpSumValue", label: "Lump Sum — Value at End", format: "currency" },
      { key: "dcaValue", label: "Dollar-Cost Averaging — Value at End", format: "currency" },
      { key: "difference", label: "Lump Sum Advantage (+) or DCA Advantage (−)", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the amount you have to invest, how many months you'd spread it over if you invested gradually, the " +
      "annual return you expect from the market, and the interest the waiting cash would earn (for example, in a " +
      "high-yield savings account). The tool compares both approaches at the end of the spreading period. Try a " +
      "negative market return to see when spreading it out comes out ahead.",
    examples:
      "Example: $60,000 invested at once at an 8% expected return is worth $64,800 after 12 months. Investing " +
      "$5,000 a month instead, with waiting cash earning 4%, ends at $63,677.22 — the lump sum is $1,122.78 ahead.",
    assumptions:
      "Assumes the market rises (or falls) smoothly at the expected return, and that dollar-cost averaging " +
      "invests an equal amount at the start of each month. Real markets move unevenly, which is exactly the risk " +
      "dollar-cost averaging is meant to soften, so the actual result could go either way. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "If lump sum usually wins, why would anyone dollar-cost average?",
        answer: "Because it lowers the regret of investing everything just before a fall. Markets rise more often than they fall, so lump sum wins on average — but dollar-cost averaging can be easier to stick with emotionally.",
      },
    ],
  },
  {
    slug: "rule-of-72-calculator",
    title: "Rule of 72 Calculator",
    description: "Estimate how long it takes an investment to double with the Rule of 72, and compare it with the Rules of 70 and 69.3 and the exact answer.",
    metaTitle: "Rule of 72 Calculator — Free & Instant",
    metaDescription: "Free Rule of 72 calculator. Estimate how many years it takes money to double, and compare the Rule of 72, 70, and 69.3 with the exact answer.",
    calcInputs: [
      percentField("annualReturnPercent", "Annual Rate of Return", { default: 8, min: 0.1, max: 100, step: 0.1 }),
    ],
    calcResult: { label: "Years to Double (Rule of 72)", format: "number" },
    calcResults: [
      { key: "ruleOf72Years", label: "Rule of 72 Estimate (Years)", format: "number", highlight: true },
      { key: "ruleOf70Years", label: "Rule of 70 Estimate (Years)", format: "number" },
      { key: "ruleOf69Years", label: "Rule of 69.3 Estimate (Years)", format: "number" },
      { key: "exactYears", label: "Exact Doubling Time (Years)", format: "number" },
      { key: "ruleOf72ErrorYears", label: "Rule of 72 Error (Years)", format: "number" },
    ],
    instructions:
      "Enter an annual rate of return. The Rule of 72 divides 72 by the rate to estimate how many years it takes " +
      "money to double. The tool also shows the Rule of 70 and Rule of 69.3 versions, the exact answer, and how " +
      "far off the Rule of 72 is at your rate.",
    examples:
      "Example: at 8% a year, the Rule of 72 says money doubles in 9 years. The exact answer is 9.01 years, so the " +
      "shortcut is off by just −0.01 years.",
    assumptions:
      "The exact answer assumes growth compounded once a year: ln(2) ÷ ln(1 + rate). The Rule of 72 is most " +
      "accurate at rates around 6–10%; the Rule of 69.3 is closer for continuous compounding. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why 72?",
        answer: "72 is close to the precise figure (about 69.3, adjusted upward for yearly compounding) and divides evenly by many common rates — 2, 3, 4, 6, 8, 9, and 12 — which makes it easy to use in your head.",
      },
    ],
  },
  {
    slug: "investment-doubling-time-calculator",
    title: "Investment Doubling Time Calculator",
    description: "Calculate exactly how long your investment takes to double or triple, and how much sooner it doubles if you keep adding money monthly.",
    metaTitle: "Investment Doubling Time Calculator — Free",
    metaDescription: "Free investment doubling time calculator. See exactly how long your money takes to double or triple, with and without monthly contributions.",
    calcInputs: [
      currencyField("initialInvestment", "Starting Investment", { default: 10000, step: 500 }),
      currencyField("monthlyContribution", "Monthly Contribution", { default: 200, max: 1000000, step: 25 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 7, max: 50, step: 0.1 }),
    ],
    calcResult: { label: "Years to Double", format: "number" },
    calcResults: [
      { key: "doublingYears", label: "Years to Double (No Contributions)", format: "number", highlight: true },
      { key: "doublingYearsWithContributions", label: "Years to Double (With Monthly Contributions)", format: "number" },
      { key: "triplingYears", label: "Years to Triple (No Contributions)", format: "number" },
    ],
    instructions:
      "Enter your starting amount, any amount you'll add each month, and your expected annual return. The tool " +
      "calculates the exact time for the starting amount to double and triple on growth alone, and how quickly " +
      "your balance reaches double the starting amount when you keep contributing.",
    examples:
      "Example: $10,000 at 7% compounded monthly doubles in 9.93 years and triples in 15.74 years on its own. " +
      "Adding $200 a month gets the balance to $20,000 in just 2.92 years.",
    assumptions:
      "Returns are compounded monthly at 1/12 of the annual rate, with contributions at the end of each month. " +
      "At a 0% return, only the contributions can double the balance. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the Rule of 72 Calculator?",
        answer: "The Rule of 72 is a quick estimate for yearly compounding. This tool gives exact figures for monthly compounding, adds tripling time, and shows the effect of ongoing contributions.",
      },
    ],
  },
];

async function main() {
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY_SLUG } });
  if (!parent) {
    throw new Error(
      `The "${PARENT_CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
        "then re-run this script."
    );
  }
  const categoryIds = new Map<string, string>();
  for (const [slug, name] of Object.entries(SUBCATEGORY_NAMES)) {
    const existing = await prisma.toolCategory.findUnique({ where: { slug } });
    if (!existing) console.log(`Creating sub-category "${name}" under "${parent.name}".`);
    const category =
      existing ??
      (await prisma.toolCategory.create({
        data: { name, slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
      }));
    categoryIds.set(slug, category.id);
  }

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: categoryIds.get(TOOL_CATEGORY[def.slug])!,
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, filed under the Investment Calculators sub-categories.`);
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
