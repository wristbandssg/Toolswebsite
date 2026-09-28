// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Retirement Calculators" sub-batch F (FIRE & Retirement Timing). Part of the
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
// See src/lib/calc-engine-retirement-fire-timing.ts for the math, the official
// 2026 figures it uses, and how near-namesake tools are differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-retirement-fire-timing-calculators.ts
// or
//   npm run db:create-retirement-fire-timing-calculators

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

const REAL_RETURN_NOTE =
  "Uses a real (after-inflation) return, so all figures are in today's money. Returns are steady; real markets vary. ";

const TOOLS: ToolDef[] = [
  {
    slug: "fire-calculator",
    title: "FIRE Calculator",
    description: "Find out when you could reach financial independence and retire early (FIRE) — your savings rate, FIRE number, and the years and age you'd get there.",
    metaTitle: "FIRE Calculator — When Can I Retire Early?",
    metaDescription: "Free FIRE calculator. From your income, spending and investments, see your savings rate, FIRE number, and the age you reach financial independence.",
    calcInputs: [
      numberField("currentAge", "Current Age", { default: 30, min: 16, max: 80, step: 1 }),
      currencyField("annualIncome", "Yearly Take-Home Income", { default: 90000, max: 10000000, step: 1000 }),
      currencyField("annualExpenses", "Yearly Spending", { default: 45000, max: 10000000, step: 1000 }),
      currencyField("currentInvestments", "Current Investments", { default: 60000, max: 100000000, step: 1000 }),
      percentField("realReturnPercent", "Real Return (After Inflation)", { default: 5, max: 15, step: 0.25 }),
      percentField("withdrawalRatePercent", "Withdrawal Rate", { default: 4, min: 1, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Years to FI", format: "number" },
    calcResults: [
      { key: "yearsToFinancialIndependence", label: "Years to Financial Independence", format: "number", highlight: true },
      { key: "ageAtFinancialIndependence", label: "Age at Financial Independence", format: "number" },
      { key: "fireNumber", label: "Your FIRE Number", format: "currency" },
      { key: "savingsRatePercent", label: "Savings Rate", format: "percentage" },
      { key: "annualSavings", label: "Yearly Savings", format: "currency" },
    ],
    instructions:
      "Enter your age, yearly take-home pay and spending, what you've already invested, a real (after-inflation) return, " +
      "and a withdrawal rate. Your FIRE number is your spending divided by the withdrawal rate (25x spending at 4%). " +
      "Everything you don't spend is invested, and the tool counts how long until your investments reach that number.",
    examples:
      "Example: a 30-year-old taking home $90,000 and spending $45,000 saves 50%. At a 4% withdrawal rate the FIRE number " +
      "is $1,125,000. With $60,000 invested and a 5% real return, they'd reach it in 15.07 years — at about 45.",
    assumptions:
      REAL_RETURN_NOTE + "Savings are invested monthly. Your savings rate matters more than your income: it both " +
      "grows your investments and lowers the number you need. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What does FIRE mean?",
        answer: "Financial Independence, Retire Early — a movement built around a high savings rate so that investments can cover your living costs long before a traditional retirement age.",
      },
    ],
  },
  {
    slug: "fire-number-calculator",
    title: "FIRE Number Calculator",
    description: "Calculate your FIRE number — the investments you need to retire early — including health insurance before Medicare and tax on your withdrawals.",
    metaTitle: "FIRE Number Calculator — Incl. Healthcare & Tax",
    metaDescription: "Free FIRE number calculator. Find the investments needed to retire early, including pre-Medicare health insurance and tax on withdrawals.",
    calcInputs: [
      currencyField("annualExpenses", "Yearly Living Expenses", { default: 50000, max: 10000000, step: 1000 }),
      currencyField("healthInsuranceAnnual", "Health Insurance per Year (Before Medicare)", { default: 9000, max: 1000000, step: 500 }),
      percentField("withdrawalTaxRatePercent", "Tax on Withdrawals", { default: 10, max: 50, step: 1 }),
      percentField("withdrawalRatePercent", "Withdrawal Rate", { default: 4, min: 1, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "FIRE Number", format: "currency" },
    calcResults: [
      { key: "fireNumber", label: "Your FIRE Number", format: "currency", highlight: true },
      { key: "grossAnnualWithdrawal", label: "Yearly Withdrawal Needed (Before Tax)", format: "currency" },
      { key: "simpleFireNumber", label: "Simple FIRE Number (Expenses Only)", format: "currency" },
      { key: "extraForHealthcareAndTax", label: "Extra Needed for Healthcare and Tax", format: "currency" },
      { key: "multipleOfExpenses", label: "Multiple of Living Expenses", format: "number" },
    ],
    instructions:
      "Enter your yearly living costs, what health insurance will cost before you qualify for Medicare at 65, the " +
      "average tax rate on your withdrawals, and your withdrawal rate. Many FIRE plans forget these two items — the tool " +
      "grosses up your withdrawal to cover them and compares the result with the simple \"25 times spending\" figure.",
    examples:
      "Example: $50,000 of expenses plus $9,000 of health insurance, with 10% tax on withdrawals, means withdrawing " +
      "$65,555.56 a year. At 4% the FIRE number is $1,638,888.89 — $388,888.89 more than the simple $1,250,000 figure, or " +
      "32.78 times expenses.",
    assumptions:
      "Health insurance and tax are treated as permanent; in reality Medicare lowers health costs from 65, and much of an " +
      "early retiree's withdrawals can be taxed lightly with planning. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do early retirees get health insurance?",
        answer: "Usually through the ACA marketplace (where premium credits depend on income), a spouse's employer plan, COBRA for up to 18 months, or a health-sharing arrangement.",
      },
    ],
  },
  {
    slug: "coast-fire-calculator",
    title: "Coast FIRE Calculator",
    description: "Find your Coast FIRE number — the amount invested today that grows into your full retirement target by itself — and whether you've already reached it.",
    metaTitle: "Coast FIRE Calculator — Have You Hit Coast FI?",
    metaDescription: "Free Coast FIRE calculator. Find how much you need invested now to coast to retirement with no more saving, and whether you're there yet.",
    calcInputs: [
      numberField("currentAge", "Current Age", { default: 32, min: 16, max: 80, step: 1 }),
      numberField("retirementAge", "Retirement Age", { default: 65, min: 30, max: 90, step: 1 }),
      currencyField("annualExpenses", "Yearly Spending in Retirement (Today's Money)", { default: 50000, max: 10000000, step: 1000 }),
      percentField("withdrawalRatePercent", "Withdrawal Rate", { default: 4, min: 1, max: 10, step: 0.1 }),
      percentField("realReturnPercent", "Real Return (After Inflation)", { default: 5, max: 15, step: 0.25 }),
      currencyField("currentInvestments", "Current Retirement Investments", { default: 150000, max: 100000000, step: 1000 }),
    ],
    calcResult: { label: "Coast FIRE Number", format: "currency" },
    calcResults: [
      { key: "coastFireNumberToday", label: "Coast FIRE Number Today", format: "currency", highlight: true },
      { key: "aheadOrBehindCoastNumber", label: "Ahead (+) or Behind (−) Coast FIRE", format: "currency" },
      { key: "fireNumberAtRetirement", label: "FIRE Number at Retirement (Today's Money)", format: "currency" },
      { key: "ageYourBalanceAloneReachesFire", label: "Age Your Balance Alone Reaches FIRE", format: "number" },
    ],
    instructions:
      "Enter your age, the age you'd retire, the yearly spending you'll need then (in today's money), your withdrawal " +
      "rate, a real return, and what you've already invested. Once your investments reach the Coast FIRE number, you " +
      "could stop saving for retirement entirely — you'd only need to earn enough to cover today's bills — and still hit " +
      "your target on time.",
    examples:
      "Example: at 32, planning to retire at 65 on $50,000 a year, your FIRE number is $1,250,000. At a 5% real return, " +
      "$249,840.67 invested today would coast there. With $150,000 you're $99,840.67 short; left alone, your balance would " +
      "reach the target at about 75.",
    assumptions:
      REAL_RETURN_NOTE + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is Coast FIRE?",
        answer: "The point where your retirement savings are large enough to grow into a full retirement fund on their own. After that you can \"coast\" — covering current costs without saving more for retirement.",
      },
    ],
  },
  {
    slug: "barista-fire-calculator",
    title: "Barista FIRE Calculator",
    description: "Calculate your Barista FIRE number — the smaller amount you need when part-time work covers some of your spending — and how much sooner you'd get there.",
    metaTitle: "Barista FIRE Calculator — Semi-Retire Sooner",
    metaDescription: "Free Barista FIRE calculator. See the smaller nest egg needed when part-time income covers some spending, and how much sooner you can stop full-time work.",
    calcInputs: [
      currencyField("annualExpenses", "Yearly Spending", { default: 50000, max: 10000000, step: 1000 }),
      currencyField("partTimeIncome", "Part-Time Income per Year", { default: 20000, max: 10000000, step: 1000 }),
      percentField("withdrawalRatePercent", "Withdrawal Rate", { default: 4, min: 1, max: 10, step: 0.1 }),
      currencyField("currentInvestments", "Current Investments", { default: 200000, max: 100000000, step: 1000 }),
      currencyField("annualSavings", "Yearly Savings (While Working Full-Time)", { default: 30000, max: 10000000, step: 1000 }),
      percentField("realReturnPercent", "Real Return (After Inflation)", { default: 5, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Barista FIRE Number", format: "currency" },
    calcResults: [
      { key: "baristaFireNumber", label: "Barista FIRE Number", format: "currency", highlight: true },
      { key: "fullFireNumber", label: "Full FIRE Number", format: "currency" },
      { key: "lessYouNeedToSave", label: "Less You Need to Save", format: "currency" },
      { key: "yearsToBaristaFire", label: "Years to Barista FIRE", format: "number" },
      { key: "yearsToFullFire", label: "Years to Full FIRE", format: "number" },
    ],
    instructions:
      "Enter your yearly spending and the income you'd earn from part-time or lower-stress work — the classic example is a " +
      "coffee shop job that also brings health insurance. Your investments only need to cover the difference, so the " +
      "target is much smaller. Add your investments, yearly savings and a real return to compare timelines.",
    examples:
      "Example: spending $50,000 with $20,000 from part-time work, your investments need to cover $30,000 — a Barista FIRE " +
      "number of $750,000 instead of $1,250,000. From $200,000, saving $30,000 a year at 5%, you'd get there in 10.58 " +
      "years rather than 16.99.",
    assumptions:
      REAL_RETURN_NOTE + "Part-time income is assumed to keep pace with inflation. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is it called Barista FIRE?",
        answer: "From the idea of leaving a demanding career for a part-time job — like working at a coffee chain that offers health benefits — while investments cover the rest of your costs.",
      },
    ],
  },
  {
    slug: "lean-fire-calculator",
    title: "Lean FIRE Calculator",
    description: "Compare Lean FIRE — retiring early on a minimal budget — with FIRE on your regular budget, and see how many years a leaner lifestyle saves.",
    metaTitle: "Lean FIRE Calculator — Retire Early on Less",
    metaDescription: "Free Lean FIRE calculator. Compare a lean budget with your regular budget and see how many years sooner a lean lifestyle gets you to FIRE.",
    calcInputs: [
      currencyField("regularExpenses", "Regular Yearly Budget", { default: 55000, max: 10000000, step: 1000 }),
      currencyField("leanExpenses", "Lean Yearly Budget", { default: 35000, max: 10000000, step: 1000 }),
      currencyField("currentInvestments", "Current Investments", { default: 100000, max: 100000000, step: 1000 }),
      currencyField("annualSavings", "Yearly Savings", { default: 35000, max: 10000000, step: 1000 }),
      percentField("realReturnPercent", "Real Return (After Inflation)", { default: 5, max: 15, step: 0.25 }),
      percentField("withdrawalRatePercent", "Withdrawal Rate", { default: 4, min: 1, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Lean FIRE Number", format: "currency" },
    calcResults: [
      { key: "leanFireNumber", label: "Lean FIRE Number", format: "currency", highlight: true },
      { key: "yearsToLeanFire", label: "Years to Lean FIRE", format: "number" },
      { key: "regularFireNumber", label: "Regular FIRE Number", format: "currency" },
      { key: "yearsToRegularFire", label: "Years to Regular FIRE", format: "number" },
      { key: "yearsSavedByGoingLean", label: "Years Saved by Going Lean", format: "number" },
    ],
    instructions:
      "Enter your regular yearly budget and a lean one — just the essentials, often $40,000 a year or less. Add your " +
      "investments, yearly savings, a real return and your withdrawal rate. The tool shows both targets and how much " +
      "sooner the lean budget gets you there.",
    examples:
      "Example: a $35,000 lean budget needs $875,000 at 4%, against $1,375,000 for a $55,000 regular budget. From $100,000, " +
      "saving $35,000 a year at 5%, lean FIRE takes 13.69 years and regular FIRE 19.29 — going lean saves 5.6 years.",
    assumptions:
      REAL_RETURN_NOTE + "A lean budget leaves little room for surprises, so some Lean FIRE plans use a lower withdrawal " +
      "rate or keep some part-time income. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is Lean FIRE?",
        answer: "Reaching financial independence on a minimal, frugal budget — covering essentials but few luxuries — which needs a smaller portfolio and gets you there sooner.",
      },
    ],
  },
  {
    slug: "fat-fire-calculator",
    title: "Fat FIRE Calculator",
    description: "Plan Fat FIRE — early retirement on a generous budget — with a more cautious withdrawal rate, and find the yearly saving needed to get there by a target date.",
    metaTitle: "Fat FIRE Calculator — Retire Early in Comfort",
    metaDescription: "Free Fat FIRE calculator. Find the nest egg for a generous early-retirement budget at a cautious withdrawal rate and the savings to reach it.",
    calcInputs: [
      currencyField("fatExpenses", "Yearly Budget in Retirement", { default: 120000, max: 10000000, step: 1000 }),
      percentField("withdrawalRatePercent", "Withdrawal Rate", { default: 3.5, min: 1, max: 10, step: 0.1 }),
      currencyField("currentInvestments", "Current Investments", { default: 500000, max: 100000000, step: 5000 }),
      currencyField("annualSavings", "Yearly Savings", { default: 80000, max: 10000000, step: 1000 }),
      percentField("realReturnPercent", "Real Return (After Inflation)", { default: 5, max: 15, step: 0.25 }),
      numberField("targetYears", "Years You Want to Get There In", { default: 15, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Fat FIRE Number", format: "currency" },
    calcResults: [
      { key: "fatFireNumber", label: "Fat FIRE Number", format: "currency", highlight: true },
      { key: "yearsToFatFire", label: "Years to Fat FIRE at Your Savings", format: "number" },
      { key: "annualSavingsForTargetYears", label: "Yearly Savings Needed for Your Target Date", format: "currency" },
      { key: "extraVsFourPercentRule", label: "Extra Compared with the 4% Rule", format: "currency" },
    ],
    instructions:
      "Enter your generous yearly retirement budget, a withdrawal rate (early retirees often use 3–3.5% because their " +
      "money must last 40+ years), your investments, yearly savings and a real return. Then enter how many years you'd " +
      "like to take; the tool shows the yearly saving needed to hit that date.",
    examples:
      "Example: a $120,000 budget at 3.5% needs $3,428,571.43 — $428,571.43 more than the 4% rule would suggest. From " +
      "$500,000 saving $80,000 a year at 5%, it takes 17.69 years; to get there in 15 you'd need to save $108,257.65 a year.",
    assumptions:
      REAL_RETURN_NOTE + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What counts as Fat FIRE?",
        answer: "There's no official line, but it usually means retiring early with a budget of $100,000 a year or more — enough for travel, a larger home, and few trade-offs.",
      },
    ],
  },
  {
    slug: "retirement-break-even-calculator",
    title: "Retirement Break-Even Calculator",
    description: "Compare retiring earlier on a smaller income with retiring later on a larger one, and find the age when waiting pays off.",
    metaTitle: "Retirement Break-Even Calculator — Earlier or Later?",
    metaDescription: "Free retirement break-even calculator. Compare retiring earlier on less income with later on more, and find the age where waiting pays off.",
    calcInputs: [
      numberField("earlierAge", "Earlier Retirement Age", { default: 62, min: 40, max: 80, step: 1 }),
      currencyField("earlierAnnualIncome", "Yearly Retirement Income If You Retire Earlier", { default: 30000, max: 10000000, step: 1000 }),
      numberField("laterAge", "Later Retirement Age", { default: 65, min: 40, max: 85, step: 1 }),
      currencyField("laterAnnualIncome", "Yearly Retirement Income If You Retire Later", { default: 40000, max: 10000000, step: 1000 }),
    ],
    calcResult: { label: "Break-Even Age", format: "number" },
    calcResults: [
      { key: "breakEvenAge", label: "Break-Even Age (0 = Never)", format: "number", highlight: true },
      { key: "incomeGivenUpByWaiting", label: "Retirement Income Given Up by Waiting", format: "currency" },
      { key: "extraIncomePerYearByWaiting", label: "Extra Income per Year by Waiting", format: "currency" },
      { key: "totalBy85Earlier", label: "Total Received by 85 — Retire Earlier", format: "currency" },
      { key: "totalBy85Later", label: "Total Received by 85 — Retire Later", format: "currency" },
    ],
    instructions:
      "Enter two retirement ages and the yearly retirement income each would give you — for example a pension that's " +
      "reduced for retiring early, or a combination of pension and savings. The tool finds the age when the larger, later " +
      "income has made up for the years of income you gave up by waiting.",
    examples:
      "Example: retiring at 62 on $30,000 a year versus 65 on $40,000. Waiting gives up $90,000 but adds $10,000 a year, so " +
      "it breaks even at 74. By 85 the later choice has paid $800,000 against $690,000.",
    assumptions:
      "Compares retirement income only — not the extra salary you'd earn by working longer, which makes waiting look " +
      "better still. Ignores inflation and investment returns. For Social Security specifically, use the Social Security " +
      "Break-Even Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is working a few more years worth it?",
        answer: "Often, financially: you keep earning, keep saving, delay withdrawals, and may get a bigger pension or Social Security benefit. Whether it's worth it also depends on health and how much you value the time.",
      },
    ],
  },
  {
    slug: "early-retirement-calculator",
    title: "Early Retirement Calculator",
    description: "Plan the \"bridge\" years of early retirement — whether your taxable savings can cover spending and health insurance until retirement accounts open at 59½.",
    metaTitle: "Early Retirement Calculator — Bridge to 59½",
    metaDescription: "Free early retirement calculator. See if taxable savings can cover spending and health insurance until you can use retirement accounts at 59½.",
    calcInputs: [
      numberField("retirementAge", "Early Retirement Age", { default: 50, min: 30, max: 59, step: 1 }),
      currencyField("annualExpenses", "Yearly Spending", { default: 50000, max: 10000000, step: 1000 }),
      currencyField("healthInsuranceAnnual", "Health Insurance per Year (Before Medicare)", { default: 10000, max: 1000000, step: 500 }),
      currencyField("taxableSavings", "Taxable Savings (Brokerage, Cash)", { default: 500000, max: 100000000, step: 5000 }),
      currencyField("retirementAccounts", "Retirement Accounts (401(k), IRA)", { default: 600000, max: 100000000, step: 5000 }),
      percentField("realReturnPercent", "Real Return (After Inflation)", { default: 5, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Taxable Savings Left at 59½", format: "currency" },
    calcResults: [
      { key: "taxableSavingsLeftAt59AndHalf", label: "Taxable Savings Left at 59½ (− = Shortfall)", format: "currency", highlight: true },
      { key: "bridgeYears", label: "Bridge Years to 59½", format: "number" },
      { key: "ageTaxableSavingsRunOut", label: "Age Taxable Savings Run Out (0 = They Last)", format: "number" },
      { key: "retirementAccountsAt59AndHalf", label: "Retirement Accounts at 59½ (Untouched)", format: "currency" },
      { key: "yearsUntilMedicareAt65", label: "Years Until Medicare at 65", format: "number" },
    ],
    instructions:
      "Enter your early retirement age, yearly spending, health insurance cost until Medicare, and your savings split into " +
      "taxable accounts and retirement accounts. Retirement accounts usually charge a 10% penalty before 59½, so the " +
      "bridge years are paid from taxable savings while the retirement accounts keep growing.",
    examples:
      "Example: retiring at 50 on $50,000 a year plus $10,000 of health insurance, $500,000 of taxable savings covers the " +
      "9.5 bridge years with $71,180.91 to spare. Meanwhile $600,000 in retirement accounts grows to $953,783.03 by 59½. " +
      "Medicare is still 15 years away.",
    assumptions:
      REAL_RETURN_NOTE + "Ways to reach retirement money early include the Rule of 55, 72(t) equal payments, and a Roth " +
      "conversion ladder (each conversion can be withdrawn penalty-free after 5 years). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do early retirees get money out of a 401(k) before 59½?",
        answer: "Common routes are the Rule of 55 (for a job left at 55+), 72(t) substantially equal periodic payments, and a Roth conversion ladder. Each has rules to follow carefully.",
      },
    ],
  },
  {
    slug: "retirement-date-calculator",
    title: "Retirement Date Calculator",
    description: "Count down to retirement — the months, years, weeks, paychecks and workdays left until you reach your retirement age.",
    metaTitle: "Retirement Date Calculator — Countdown to Retire",
    metaDescription: "Free retirement date calculator. Count the months, years, weeks, paychecks and workdays left until you reach your retirement age.",
    calcInputs: [
      numberField("currentAgeYears", "Current Age — Years", { default: 48, min: 0, max: 100, step: 1 }),
      numberField("currentAgeExtraMonths", "Current Age — Plus Months", { default: 4, min: 0, max: 11, step: 1 }),
      numberField("retirementAgeYears", "Retirement Age — Years", { default: 65, min: 0, max: 100, step: 1 }),
      numberField("retirementAgeExtraMonths", "Retirement Age — Plus Months", { default: 0, min: 0, max: 11, step: 1 }),
    ],
    calcResult: { label: "Months Until Retirement", format: "number" },
    calcResults: [
      { key: "monthsUntilRetirement", label: "Months Until Retirement", format: "number", highlight: true },
      { key: "yearsUntilRetirement", label: "Years Until Retirement", format: "number" },
      { key: "weeksLeft", label: "Weeks Left", format: "number" },
      { key: "biweeklyPaychecksLeft", label: "Biweekly Paychecks Left", format: "number" },
      { key: "workdaysLeft", label: "Workdays Left (Approx.)", format: "number" },
    ],
    instructions:
      "Enter your current age in years and months, and the age you plan to retire. The tool shows the time left in months, " +
      "years and weeks — plus roughly how many paychecks and workdays that is, to help you plan (or count down).",
    examples:
      "Example: at 48 years and 4 months, planning to retire at 65, you have 200 months (16.67 years) to go — about 867 " +
      "weeks, 433 biweekly paychecks and 4,167 workdays.",
    assumptions:
      "Workdays assume about 250 a year (weekdays minus holidays), before vacation. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the best age to retire?",
        answer: "There's no single answer. Key ages in the US are 55 (Rule of 55), 59½ (penalty-free retirement account access), 62 (earliest Social Security), 65 (Medicare) and 67 (full Social Security for most people).",
      },
    ],
  },
  {
    slug: "years-to-retirement-calculator",
    title: "Years to Retirement Calculator",
    description: "Find out how many years it will take for your savings to reach your retirement target, and the age you'll be when you get there.",
    metaTitle: "Years to Retirement Calculator — Reach Your Target",
    metaDescription: "Free years to retirement calculator. See how many years until your savings reach your retirement target and the age you'll be then.",
    calcInputs: [
      numberField("currentAge", "Current Age", { default: 38, min: 16, max: 90, step: 1 }),
      currencyField("currentSavings", "Current Retirement Savings", { default: 120000, max: 100000000, step: 1000 }),
      currencyField("annualContribution", "Yearly Contribution", { default: 18000, max: 10000000, step: 500 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 6, max: 20, step: 0.25 }),
      currencyField("targetNestEgg", "Retirement Savings Target", { default: 1200000, max: 100000000, step: 10000 }),
    ],
    calcResult: { label: "Years to Target", format: "number" },
    calcResults: [
      { key: "yearsToReachTarget", label: "Years to Reach Your Target (100 = 100+)", format: "number", highlight: true },
      { key: "ageWhenYouReachIt", label: "Your Age When You Reach It", format: "number" },
      { key: "totalYouContribute", label: "Total You'll Contribute", format: "currency" },
    ],
    instructions:
      "Enter your age, current savings, how much you add each year, your expected return and your target. The tool finds " +
      "how long until your savings reach the target. Try raising your contribution to see how many years it takes off.",
    examples:
      "Example: at 38 with $120,000, adding $18,000 a year at 6%, you'd reach $1,200,000 in 21.61 years — at about 59.61 — " +
      "contributing $388,965.24 along the way.",
    assumptions:
      "Contributions are spread monthly; the return is steady and nominal (not inflation-adjusted), so set the target in " +
      "future dollars. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I pick a retirement savings target?",
        answer: "A common approach is 25 times the yearly income your savings must provide (the 4% rule). The Retirement Nest Egg and Retirement Savings Goal calculators help you work it out.",
      },
    ],
  },
  {
    slug: "life-expectancy-retirement-calculator",
    title: "Life Expectancy Retirement Calculator",
    description: "Estimate your life expectancy from the IRS life table and how many years of retirement — and how much spending — your plan should cover.",
    metaTitle: "Life Expectancy Retirement Calculator — Plan Years",
    metaDescription: "Free life expectancy retirement calculator. Estimate how long you'll live from the IRS table and the retirement years and spending to plan for.",
    calcInputs: [
      numberField("currentAge", "Current Age", { default: 55, min: 0, max: 110, step: 1 }),
      numberField("retirementAge", "Retirement Age", { default: 65, min: 30, max: 100, step: 1 }),
      currencyField("annualSpending", "Yearly Spending in Retirement", { default: 50000, max: 10000000, step: 1000 }),
      numberField("extraYearsBuffer", "Extra Years to Plan For (Safety Margin)", { default: 5, min: 0, max: 30, step: 1 }),
    ],
    calcResult: { label: "Expected Age", format: "number" },
    calcResults: [
      { key: "expectedAge", label: "Life Expectancy (Age)", format: "number", highlight: true },
      { key: "yearsRemaining", label: "Expected Years Remaining", format: "number" },
      { key: "planToAge", label: "Age to Plan To (with Safety Margin)", format: "number" },
      { key: "retirementYearsToFund", label: "Retirement Years to Fund", format: "number" },
      { key: "totalSpendingToFund", label: "Total Spending to Fund", format: "currency" },
    ],
    instructions:
      "Enter your age, planned retirement age, yearly retirement spending, and a safety margin of extra years. Life " +
      "expectancy comes from the IRS Single Life Table (the one used for inherited IRAs), which gives the average years " +
      "remaining at each age. Because about half of people outlive the average, adding a few extra years is sensible.",
    examples:
      "Example: at 55 the IRS table gives 31.6 more years, a life expectancy of 86.6. Adding 5 years, plan to 91.6 — that's " +
      "26.6 years of retirement from 65, or $1,330,000 of spending at $50,000 a year.",
    assumptions:
      "The IRS table is unisex and based on population averages; your health, sex and family history matter. Total " +
      "spending is in today's money with no growth or inflation. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why plan beyond my life expectancy?",
        answer: "Life expectancy is an average — roughly half of people live longer. Planning a few years past it lowers the risk of running out of money.",
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
