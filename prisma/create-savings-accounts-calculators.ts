// One-time (but safe to re-run) batch setup script: creates the 9 tools
// of the "Savings Calculators" sub-batch C (Interest & Account Types). Part of the
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
// See src/lib/calc-engine-savings-accounts.ts for the math and for notes on
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-savings-accounts-calculators.ts
// or
//   npm run db:create-savings-accounts-calculators

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
    slug: "compound-savings-calculator",
    title: "Compound Savings Calculator",
    description: "Compare what the same savings deposit grows to when interest compounds daily, monthly, quarterly or annually — side by side.",
    metaTitle: "Compound Savings Calculator — Compare Compounding",
    metaDescription: "Free compound savings calculator. See one deposit grow with daily, monthly, quarterly and annual compounding side by side, and the difference.",
    calcInputs: [
      currencyField("deposit", "Deposit", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 5, max: 25, step: 0.05 }),
      numberField("years", "Years", { default: 10, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Balance (Daily Compounding)", format: "currency" },
    calcResults: [
      { key: "balanceDaily", label: "Compounded Daily", format: "currency", highlight: true },
      { key: "balanceMonthly", label: "Compounded Monthly", format: "currency" },
      { key: "balanceQuarterly", label: "Compounded Quarterly", format: "currency" },
      { key: "balanceAnnually", label: "Compounded Annually", format: "currency" },
      { key: "dailyVsAnnualExtra", label: "Extra from Daily vs Annual Compounding", format: "currency" },
    ],
    instructions:
      "Enter a deposit, the interest rate the account quotes (not the APY), and the number of years. The tool shows " +
      "what the deposit grows to under each common compounding frequency, so you can see how much the frequency " +
      "really matters.",
    examples:
      "Example: $10,000 at 5% for 10 years grows to $16,486.65 with daily compounding, $16,470.09 monthly, " +
      "$16,436.19 quarterly and $16,288.95 annually. Daily compounding beats annual by $197.70.",
    assumptions:
      "Assumes a single deposit, a fixed quoted rate, and no withdrawals. When comparing real accounts, compare " +
      "their APYs, which already include compounding. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does compounding frequency make a big difference?",
        answer: "Less than most people think. Going from annual to monthly compounding matters a little; going from monthly to daily matters very little. The interest rate itself matters far more.",
      },
    ],
  },
  {
    slug: "simple-interest-savings-calculator",
    title: "Simple Interest Savings Calculator",
    description: "Calculate the interest paid out from a savings deposit when you take the interest as income rather than reinvesting it, and what reinvesting would have added.",
    metaTitle: "Simple Interest Savings Calculator — Interest Paid Out",
    metaDescription: "Free simple interest savings calculator. See the interest paid out each month, quarter or year from a deposit, and what reinvesting would add.",
    calcInputs: [
      currencyField("deposit", "Deposit", { default: 20000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4, max: 25, step: 0.05 }),
      dropdownField("payoutsPerYear", "Interest Paid Out", 12, [
        { label: "Monthly", value: 12 },
        { label: "Quarterly", value: 4 },
        { label: "Annually", value: 1 },
      ]),
      numberField("years", "Years", { default: 5, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Payout per Period", format: "currency" },
    calcResults: [
      { key: "payoutPerPeriod", label: "Interest Paid Out Each Period", format: "currency", highlight: true },
      { key: "totalInterestPaidOut", label: "Total Interest Paid Out", format: "currency" },
      { key: "balanceIfReinvested", label: "Balance If Interest Were Reinvested", format: "currency" },
      { key: "extraFromReinvesting", label: "Extra from Reinvesting", format: "currency" },
    ],
    instructions:
      "Enter your deposit, the interest rate, how often interest is paid out to you, and the number of years. When " +
      "interest is paid out (for example, to your checking account as income), the deposit never grows, so you earn " +
      "simple interest. The tool also shows what you'd have had by leaving the interest in to compound.",
    examples:
      "Example: $20,000 at 4% paid out monthly gives you $66.67 a month — $4,000 over 5 years. Reinvesting it " +
      "instead would grow the account to $24,419.93, which is $419.93 more.",
    assumptions:
      "Assumes a fixed rate and that each payout is taken out of the account. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who takes savings interest as income?",
        answer: "Often retirees living on the interest from a CD or savings deposit. Many banks let you choose to have interest paid to another account instead of added to the balance.",
      },
    ],
  },
  {
    slug: "savings-apy-calculator",
    title: "Savings APY Calculator",
    description: "Work out the APY you actually earned from the interest your bank paid over a period, using the official Truth in Savings formula.",
    metaTitle: "Savings APY Calculator — APY You Actually Earned",
    metaDescription: "Free savings APY calculator. Enter your balance, the interest paid, and the number of days to find the APY you actually earned.",
    calcInputs: [
      currencyField("principal", "Balance (Principal)", { default: 10000, max: 100000000, step: 100 }),
      currencyField("interestEarned", "Interest Paid over the Period", { default: 110, max: 10000000, step: 1 }),
      numberField("daysInTerm", "Days in the Period", { default: 91, min: 1, max: 3650, step: 1 }),
    ],
    calcResult: { label: "APY Earned", format: "percentage" },
    calcResults: [
      { key: "apyEarnedPercent", label: "APY Earned", format: "percentage", highlight: true },
      { key: "simpleAnnualRatePercent", label: "Simple Annual Rate (No Compounding)", format: "percentage" },
      { key: "projectedInterestPerYear", label: "Interest over a Full Year at This APY", format: "currency" },
    ],
    instructions:
      "Look at a bank statement: enter the balance the interest was paid on, the interest you received, and the " +
      "number of days that interest covers (about 30 for a month, 91 for a quarter). The tool annualizes it with " +
      "the same formula US banks must use to advertise APY, so you can check the rate you were promised.",
    examples:
      "Example: $110 of interest on $10,000 over 91 days is an APY of 4.49% (4.4857%). Without compounding it would " +
      "be a 4.41% annual rate. At that APY a full year would pay $448.57.",
    assumptions:
      "Uses the Regulation DD (Truth in Savings) formula: APY = 100 × [(1 + interest ÷ principal)^(365 ÷ days) − 1]. " +
      "Assumes the balance stayed the same over the period. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the APY I earned lower than advertised?",
        answer: "Usually because the rate changed during the period, your balance moved, or part of your balance earned a lower tier rate. Variable-rate savings accounts can change their rate at any time.",
      },
    ],
  },
  {
    slug: "savings-apr-calculator",
    title: "Savings APR Calculator",
    description: "Convert a savings account's advertised APY into its APR (nominal rate) and per-period rate, and see what it pays per month and per year on your balance.",
    metaTitle: "Savings APR Calculator — APY to APR on Savings",
    metaDescription: "Free savings APR calculator. Turn an advertised APY into the nominal APR and periodic rate, plus the interest per month and year on your balance.",
    calcInputs: [
      percentField("apyPercent", "Advertised APY", { default: 4.5, max: 25, step: 0.05 }),
      dropdownField("compoundingPerYear", "Compounding Frequency", 365, [
        { label: "Daily", value: 365 },
        { label: "Monthly", value: 12 },
        { label: "Quarterly", value: 4 },
        { label: "Annually", value: 1 },
      ]),
      currencyField("balance", "Your Balance", { default: 15000, max: 100000000, step: 500 }),
    ],
    calcResult: { label: "APR (Nominal Rate)", format: "percentage" },
    calcResults: [
      { key: "aprPercent", label: "APR (Nominal Annual Rate)", format: "percentage", highlight: true },
      { key: "periodicRatePercent", label: "Rate Charged Each Compounding Period (%)", format: "number" },
      { key: "interestPerMonth", label: "Interest per Month on Your Balance", format: "currency" },
      { key: "interestPerYear", label: "Interest per Year on Your Balance", format: "currency" },
    ],
    instructions:
      "Enter the APY a savings account advertises, how often it compounds (most online banks compound daily), and " +
      "your balance. The tool works out the underlying nominal rate (APR) and the tiny rate applied each day or " +
      "month, then shows the interest in dollars.",
    examples:
      "Example: a 4.5% APY compounded daily comes from an APR of 4.40% (4.402%), or about 0.01206% a day. On " +
      "$15,000 that's roughly $55.12 a month and $675 over a year.",
    assumptions:
      "Assumes the APY stays the same all year. Monthly interest is an average month; actual monthly credits vary " +
      "slightly with the number of days. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between APR and APY on savings?",
        answer: "APR is the simple annual rate before compounding; APY includes the effect of compounding. Savings accounts advertise APY because it's the higher, more complete number — it's what you actually earn in a year.",
      },
    ],
  },
  {
    slug: "savings-account-calculator",
    title: "Savings Account Calculator",
    description: "See what a savings account really earns after its monthly maintenance fee — including the months the fee is waived for keeping a minimum balance.",
    metaTitle: "Savings Account Calculator — Interest After Fees",
    metaDescription: "Free savings account calculator. Include the monthly fee and minimum balance to waive it, and see your balance, fees paid, and net earnings.",
    calcInputs: [
      currencyField("openingBalance", "Opening Balance", { default: 1000, max: 100000000, step: 100 }),
      currencyField("monthlyDeposit", "Monthly Deposit", { default: 100, max: 1000000, step: 25 }),
      percentField("apyPercent", "Account APY", { default: 0.5, max: 25, step: 0.05 }),
      currencyField("monthlyFee", "Monthly Maintenance Fee", { default: 5, max: 100, step: 1 }),
      currencyField("minimumBalanceToWaive", "Minimum Balance to Avoid the Fee", { default: 1500, max: 1000000, step: 100 }),
      numberField("months", "Number of Months", { default: 24, min: 1, max: 600, step: 1 }),
    ],
    calcResult: { label: "Net Earnings", format: "currency" },
    calcResults: [
      { key: "netEarnings", label: "Net Earnings (Interest − Fees)", format: "currency", highlight: true },
      { key: "endingBalance", label: "Ending Balance", format: "currency" },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
      { key: "feesPaid", label: "Fees Paid", format: "currency" },
      { key: "monthsFeeCharged", label: "Months the Fee Was Charged", format: "number" },
    ],
    instructions:
      "Enter your opening balance, monthly deposit, the account's APY, its monthly fee, and the minimum balance " +
      "that gets the fee waived. The tool goes month by month: if the balance at the start of a month is below the " +
      "minimum, the fee is charged. It shows how much interest you earn, how much the fees take back, and the net.",
    examples:
      "Example: opening with $1,000 and adding $100 a month at 0.5% APY, a $5 fee applies until the balance reaches " +
      "$1,500. Over 24 months you'd pay $30 in fees (6 months) but earn only $21.28 in interest — a net loss of $8.72.",
    assumptions:
      "Assumes the fee is waived based on the balance at the start of each month; banks may use the daily or average " +
      "balance instead. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can a savings account lose money?",
        answer: "Yes, if fees are bigger than the interest. With low rates and a small balance, a monthly fee can wipe out every cent of interest. Many online banks charge no monthly fee at all.",
      },
    ],
  },
  {
    slug: "high-yield-savings-calculator",
    title: "High-Yield Savings Calculator",
    description: "Compare a high-yield savings account with a traditional savings account and see how much more you'd earn with the same deposits.",
    metaTitle: "High-Yield Savings Calculator — HYSA vs Regular",
    metaDescription: "Free high-yield savings calculator. Compare a high-yield savings account with a regular one and see the extra interest you'd earn.",
    calcInputs: [
      currencyField("startingBalance", "Starting Balance", { default: 10000, max: 100000000, step: 500 }),
      currencyField("monthlyDeposit", "Monthly Deposit", { default: 200, max: 1000000, step: 25 }),
      percentField("highYieldApyPercent", "High-Yield Account APY", { default: 4.25, max: 25, step: 0.05 }),
      percentField("traditionalApyPercent", "Traditional Account APY", { default: 0.4, max: 25, step: 0.01 }),
      numberField("years", "Years", { default: 5, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Extra Earned", format: "currency" },
    calcResults: [
      { key: "extraEarned", label: "Extra Earned with High-Yield", format: "currency", highlight: true },
      { key: "highYieldBalance", label: "High-Yield Balance", format: "currency" },
      { key: "traditionalBalance", label: "Traditional Balance", format: "currency" },
      { key: "highYieldInterest", label: "High-Yield Interest", format: "currency" },
      { key: "traditionalInterest", label: "Traditional Interest", format: "currency" },
    ],
    instructions:
      "Enter your starting balance, monthly deposit, the high-yield account's APY, your current (traditional) " +
      "account's APY, and the number of years. Both accounts get the same deposits, so the difference is purely " +
      "down to the rate.",
    examples:
      "Example: $10,000 plus $200 a month for 5 years grows to $25,630.31 at 4.25% APY but only $22,320.15 at 0.4%. " +
      "The high-yield account earns $3,310.16 more — $3,630.31 of interest vs $320.15.",
    assumptions:
      "Assumes both rates stay the same. High-yield rates are usually variable and follow central bank rates. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are high-yield savings accounts safe?",
        answer: "At a bank insured by the FDIC (or a credit union insured by the NCUA), deposits are protected up to $250,000 per depositor, per institution, per ownership category — the same as a traditional account.",
      },
    ],
  },
  {
    slug: "money-market-savings-calculator",
    title: "Money Market Savings Calculator",
    description: "Calculate interest on a money market account with tiered rates — one rate up to a balance threshold and a higher rate above it — and the blended rate you earn.",
    metaTitle: "Money Market Savings Calculator — Tiered Rates",
    metaDescription: "Free money market savings calculator. Enter tiered rates and a balance threshold to find your blended rate, monthly interest, and growth.",
    calcInputs: [
      currencyField("balance", "Account Balance", { default: 30000, max: 100000000, step: 500 }),
      currencyField("tierThreshold", "Tier Threshold (Balance Where the Higher Rate Starts)", { default: 25000, max: 100000000, step: 500 }),
      percentField("rateBelowPercent", "Rate on the Balance Up to the Threshold", { default: 2.5, max: 25, step: 0.05 }),
      percentField("rateAbovePercent", "Rate on the Balance Above the Threshold", { default: 4.25, max: 25, step: 0.05 }),
      numberField("years", "Years", { default: 3, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Blended Rate", format: "percentage" },
    calcResults: [
      { key: "blendedRatePercent", label: "Blended Rate on Your Balance", format: "percentage", highlight: true },
      { key: "interestFirstMonth", label: "Interest in the First Month", format: "currency" },
      { key: "balanceAfterPeriod", label: "Balance After the Period", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter your balance, the balance at which the higher tier starts, and the two rates. Each slice of your " +
      "balance earns its own tier's rate, so the tool works out the blended rate on your whole balance and grows it " +
      "month by month — the tier mix shifts as the balance grows.",
    examples:
      "Example: with $30,000, the first $25,000 earns 2.5% and the other $5,000 earns 4.25%, a blended rate of " +
      "2.79%. That's $69.79 in the first month, and the balance grows to $32,674.66 in 3 years ($2,674.66 of " +
      "interest).",
    assumptions:
      "Assumes the \"blended\" tier method, where each portion earns its own rate. Some banks instead pay the tier " +
      "rate on the whole balance once you pass the threshold — check your account terms. Interest is compounded " +
      "monthly and no deposits or withdrawals are assumed. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is a money market account different from a savings account?",
        answer: "It's a type of savings account that often pays tiered rates, may require a higher minimum balance, and sometimes offers checks or a debit card. At a bank or credit union it has the same deposit insurance as a regular savings account.",
      },
    ],
  },
  {
    slug: "cd-savings-calculator",
    title: "Certificate of Deposit (CD) Savings Calculator",
    description: "See what a certificate of deposit (CD) is worth at maturity, and how much you'd lose to the early withdrawal penalty if you cashed it in before the term ends.",
    metaTitle: "CD Savings Calculator — Early Withdrawal Penalty",
    metaDescription: "Free CD savings calculator. See your certificate of deposit's maturity value and what you'd get after the penalty if you withdrew early.",
    calcInputs: [
      currencyField("deposit", "CD Deposit", { default: 10000, max: 100000000, step: 500 }),
      percentField("apyPercent", "CD APY", { default: 4.5, max: 25, step: 0.05 }),
      numberField("termMonths", "CD Term (Months)", { default: 24, min: 1, max: 120, step: 1 }),
      numberField("withdrawAfterMonths", "Withdraw After (Months)", { default: 12, min: 0, max: 120, step: 1 }),
      numberField("penaltyMonthsOfInterest", "Penalty (Months of Interest)", { default: 6, min: 0, max: 36, step: 1 }),
    ],
    calcResult: { label: "Amount Received If Withdrawn Early", format: "currency" },
    calcResults: [
      { key: "amountReceivedIfWithdrawnEarly", label: "Amount Received If Withdrawn Early", format: "currency", highlight: true },
      { key: "valueAtMaturity", label: "Value If Held to Maturity", format: "currency" },
      { key: "interestAccruedAtWithdrawal", label: "Interest Earned by the Withdrawal Date", format: "currency" },
      { key: "earlyWithdrawalPenalty", label: "Early Withdrawal Penalty", format: "currency" },
      { key: "netGainOrLossIfWithdrawnEarly", label: "Net Gain (+) or Loss (−) If Withdrawn Early", format: "currency" },
    ],
    instructions:
      "Enter the CD amount, its APY, its term, when you might need to withdraw, and the penalty from your CD terms " +
      "(usually stated as a number of months of interest). The tool compares holding to maturity with cashing out " +
      "early, and shows whether the penalty would eat into your original deposit.",
    examples:
      "Example: a $10,000, 24-month CD at 4.5% APY is worth $10,920.25 at maturity. Withdrawing after 12 months " +
      "you'd have earned $450, less a 6-month interest penalty of $220.49, so you'd walk away with $10,229.51 — a " +
      "gain of $229.51 instead of $920.25.",
    assumptions:
      "The penalty is worked out as the stated months of interest on the deposit at the CD's rate. Some banks use " +
      "simple interest, or a flat fee, instead. If the penalty exceeds the interest earned, the loss comes out of " +
      "your deposit. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can an early withdrawal penalty cost me part of my deposit?",
        answer: "Yes. If you withdraw very early — before you've earned as much interest as the penalty — the rest of the penalty is taken from your principal. Try setting the withdrawal to 2 or 3 months to see it.",
      },
    ],
  },
  {
    slug: "savings-comparison-calculator",
    title: "Savings Comparison Calculator",
    description: "Compare two savings accounts side by side — each with its own APY, monthly fee and sign-up bonus — and see which leaves you with more.",
    metaTitle: "Savings Comparison Calculator — Compare 2 Accounts",
    metaDescription: "Free savings comparison calculator. Compare two savings accounts' rates, fees and sign-up bonuses over time and see which one earns more.",
    calcInputs: [
      currencyField("startingBalance", "Starting Balance", { default: 5000, max: 100000000, step: 500 }),
      currencyField("monthlyDeposit", "Monthly Deposit", { default: 200, max: 1000000, step: 25 }),
      numberField("years", "Years", { default: 3, min: 1, max: 50, step: 1 }),
      percentField("apyA", "Account A — APY", { default: 4.3, max: 25, step: 0.05 }),
      currencyField("monthlyFeeA", "Account A — Monthly Fee", { default: 0, max: 100, step: 1 }),
      currencyField("bonusA", "Account A — Sign-Up Bonus", { default: 0, max: 10000, step: 25 }),
      percentField("apyB", "Account B — APY", { default: 3.8, max: 25, step: 0.05 }),
      currencyField("monthlyFeeB", "Account B — Monthly Fee", { default: 0, max: 100, step: 1 }),
      currencyField("bonusB", "Account B — Sign-Up Bonus", { default: 200, max: 10000, step: 25 }),
    ],
    calcResult: { label: "Difference (A − B)", format: "currency" },
    calcResults: [
      { key: "differenceAMinusB", label: "Difference: Account A − Account B", format: "currency", highlight: true },
      { key: "balanceA", label: "Account A — Ending Balance", format: "currency" },
      { key: "balanceB", label: "Account B — Ending Balance", format: "currency" },
      { key: "netEarningsA", label: "Account A — Net Earnings (Interest + Bonus − Fees)", format: "currency" },
      { key: "netEarningsB", label: "Account B — Net Earnings (Interest + Bonus − Fees)", format: "currency" },
    ],
    instructions:
      "Enter what you'll deposit, then the APY, monthly fee and any sign-up bonus for each account. Both accounts " +
      "get the same deposits over the same time, so you can see whether a higher rate beats a bonus, or whether a " +
      "fee cancels out a better rate. A positive difference means Account A comes out ahead.",
    examples:
      "Example: $5,000 plus $200 a month for 3 years. Account A pays 4.3% APY with no bonus and ends at $13,334.13. " +
      "Account B pays 3.8% but gives a $200 bonus and ends at $13,422.03 — so B wins by $87.89 over 3 years, even " +
      "with the lower rate.",
    assumptions:
      "Sign-up bonuses are treated as credited on day one (banks usually pay them after you meet the conditions, and " +
      "they may be taxable). Rates are assumed fixed, which variable savings rates aren't. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a sign-up bonus better than a higher rate?",
        answer: "Over a short time and with a smaller balance, often yes. Over longer periods or with a large balance, the higher rate usually wins. Run both for the number of years you actually plan to keep the account.",
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
