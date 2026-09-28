// One-time (but safe to re-run) batch setup script: creates the 12 tools
// of the "Retirement Calculators" sub-batch E (Pensions & Social Security). Part of the
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
// See src/lib/calc-engine-retirement-pension-social-security.ts for the math, the official
// 2026 figures it uses, and how near-namesake tools are differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-retirement-pension-social-security-calculators.ts
// or
//   npm run db:create-retirement-pension-social-security-calculators

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
    slug: "pension-income-calculator",
    title: "Pension Income Calculator",
    description: "Compare pension payout options — single life versus joint-and-survivor at 50% or 100% — and see what a surviving spouse would receive.",
    metaTitle: "Pension Income Calculator — Payout Options Compared",
    metaDescription: "Free pension income calculator. Compare single-life and joint-and-survivor pension options and what your spouse would get after you die.",
    calcInputs: [
      currencyField("singleLifeMonthly", "Single-Life Monthly Pension", { default: 3000, max: 1000000, step: 50 }),
      percentField("js50ReductionPercent", "Reduction for 50% Joint & Survivor", { default: 7, max: 50, step: 0.5 }),
      percentField("js100ReductionPercent", "Reduction for 100% Joint & Survivor", { default: 13, max: 50, step: 0.5 }),
      percentField("taxRatePercent", "Your Tax Rate on the Pension", { default: 15, max: 60, step: 1 }),
    ],
    calcResult: { label: "Single-Life Monthly", format: "currency" },
    calcResults: [
      { key: "singleLifeMonthly", label: "Single Life — Monthly (Stops at Your Death)", format: "currency", highlight: true },
      { key: "jointSurvivor50Monthly", label: "50% Joint & Survivor — Monthly While You're Alive", format: "currency" },
      { key: "survivorGetsUnder50Option", label: "50% Option — Your Spouse Gets After Your Death", format: "currency" },
      { key: "jointSurvivor100Monthly", label: "100% Joint & Survivor — Monthly for Both Lives", format: "currency" },
      { key: "singleLifeAfterTaxMonthly", label: "Single Life — Monthly After Tax", format: "currency" },
    ],
    instructions:
      "Enter the single-life pension your plan quotes and the reductions it applies for the joint-and-survivor options — " +
      "your plan's benefit statement or election packet lists these. A single-life pension pays the most but stops when " +
      "you die; joint-and-survivor options pay less so that your spouse keeps receiving income afterward.",
    examples:
      "Example: a $3,000 single-life pension becomes $2,790 a month under a 50% joint-and-survivor option (7% less), with " +
      "your spouse getting $1,395 after your death. The 100% option pays $2,610 for as long as either of you lives.",
    assumptions:
      "Reductions vary by plan and by both spouses' ages — use the figures from your own plan. Private pensions under " +
      "ERISA require spousal consent to waive the survivor benefit. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which pension option should a married couple choose?",
        answer: "It depends on your health, ages, and other income. If your spouse would struggle without your pension, a survivor option is valuable insurance. Single life can make sense if your spouse has plenty of other income.",
      },
    ],
  },
  {
    slug: "pension-lump-sum-vs-annuity-calculator",
    title: "Pension Lump Sum vs Annuity Calculator",
    description: "Decide between a pension lump sum and monthly payments: see the monthly pension's value in today's money and the investment return it implies.",
    metaTitle: "Pension Lump Sum vs Annuity Calculator — Which Wins?",
    metaDescription: "Free pension lump sum vs annuity calculator. Compare a lump-sum offer with monthly pension payments and the return you'd need to beat them.",
    calcInputs: [
      currencyField("lumpSumOffer", "Lump Sum Offered", { default: 400000, max: 100000000, step: 5000 }),
      currencyField("monthlyPension", "Monthly Pension Offered", { default: 2400, max: 1000000, step: 50 }),
      numberField("yearsOfPayments", "Years You Expect to Receive It", { default: 22, min: 1, max: 60, step: 1 }),
      percentField("discountRatePercent", "Return You Could Earn on the Lump Sum", { default: 5, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Pension Value Today", format: "currency" },
    calcResults: [
      { key: "pensionValueToday", label: "Monthly Pension's Value Today", format: "currency", highlight: true },
      { key: "pensionMinusLumpSum", label: "Pension Value Minus Lump Sum", format: "currency" },
      { key: "impliedReturnPercent", label: "Return the Pension Is Equivalent To", format: "percentage" },
      { key: "yearsToCollectTheLumpSum", label: "Years of Payments to Equal the Lump Sum", format: "number" },
      { key: "totalPensionPayments", label: "Total Pension Payments", format: "currency" },
    ],
    instructions:
      "Enter the lump sum and the monthly pension you've been offered, how many years you expect to collect (your life " +
      "expectancy), and the return you think you could earn investing the lump sum. If the pension's value today is " +
      "bigger than the lump sum, the pension is the better deal at that return. The implied return is what you'd need to " +
      "earn on the lump sum just to match the pension.",
    examples:
      "Example: a $400,000 lump sum versus $2,400 a month for 22 years. At a 5% return the pension is worth $383,827.58 " +
      "today — $16,172.42 less than the lump sum. The pension is equivalent to a 4.55% return, and it takes 13.89 years of " +
      "payments to add up to the lump sum.",
    assumptions:
      "The pension is fixed (no cost-of-living raises) and paid for exactly the years entered. A pension also removes the " +
      "risk of outliving your money, which this comparison doesn't value. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a pension lump sum or annuity better?",
        answer: "The monthly pension wins if you live a long time or wouldn't invest the lump sum well; the lump sum wins if your health is poor, you can invest it at a higher return, or you want to leave money to heirs.",
      },
    ],
  },
  {
    slug: "pension-present-value-calculator",
    title: "Pension Present Value Calculator",
    description: "Value a pension in today's money — including one that starts years from now and rises with a cost-of-living adjustment.",
    metaTitle: "Pension Present Value Calculator — Deferred & COLA",
    metaDescription: "Free pension present value calculator. Value a deferred pension with cost-of-living raises in today's money and at the date payments start.",
    calcInputs: [
      currencyField("monthlyPension", "Monthly Pension (First Year)", { default: 2000, max: 1000000, step: 50 }),
      numberField("yearsUntilStart", "Years Until Payments Start", { default: 10, min: 0, max: 50, step: 1 }),
      numberField("yearsOfPayments", "Years of Payments", { default: 25, min: 1, max: 60, step: 1 }),
      percentField("colaPercent", "Yearly Cost-of-Living Raise", { default: 2, max: 10, step: 0.25 }),
      percentField("discountRatePercent", "Discount Rate", { default: 5, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Present Value Today", format: "currency" },
    calcResults: [
      { key: "presentValueToday", label: "Present Value Today", format: "currency", highlight: true },
      { key: "valueWhenPaymentsStart", label: "Value When Payments Start", format: "currency" },
      { key: "totalPaymentsReceived", label: "Total Payments Received", format: "currency" },
      { key: "finalMonthlyPayment", label: "Monthly Payment in the Final Year", format: "currency" },
    ],
    instructions:
      "Enter the monthly pension, how many years until it starts, how many years it will be paid, any yearly " +
      "cost-of-living raise, and a discount rate (the return you could earn elsewhere). The tool adds up every future " +
      "payment, discounted back to today — useful for comparing a pension with other assets, or in divorce and " +
      "financial planning.",
    examples:
      "Example: $2,000 a month starting in 10 years, paid for 25 years with 2% yearly raises, adds up to $768,727.19 of " +
      "payments. Discounted at 5%, it's worth $416,680.40 when payments start and $252,992.10 today.",
    assumptions:
      "Payments are made monthly and raised once a year. The discount rate strongly affects the result; pension " +
      "actuaries use rates tied to high-quality bond yields. Mortality isn't modeled — payments are assumed for exactly " +
      "the years entered. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What discount rate should I use?",
        answer: "A rate close to what safe, long-term bonds pay is common, since a pension is a fairly secure promise. A higher rate gives a lower value.",
      },
    ],
  },
  {
    slug: "pension-commutation-calculator",
    title: "Pension Commutation Calculator",
    description: "Work out a tax-free lump sum from commuting part of a UK defined-benefit pension, using your scheme's commutation factor, and how long it takes to break even.",
    metaTitle: "Pension Commutation Calculator — UK Lump Sum",
    metaDescription: "Free UK pension commutation calculator. See the tax-free lump sum from giving up some pension at your scheme's factor, and the break-even point.",
    calcInputs: [
      currencyField("annualPension", "Full Annual Pension", { unit: "£", default: 20000, max: 1000000, step: 500 }),
      percentField("pensionGivenUpPercent", "Share of Pension to Give Up", { default: 20, max: 100, step: 1 }),
      numberField("commutationFactor", "Commutation Factor (Lump Sum per £1 of Pension)", { default: 12, min: 1, max: 40, step: 0.5 }),
      percentField("taxRatePercent", "Your Income Tax Rate on the Pension", { default: 20, max: 60, step: 1 }),
    ],
    calcResult: { label: "Tax-Free Lump Sum", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "taxFreeLumpSum", label: "Tax-Free Lump Sum", format: "currency", currency: "GBP", highlight: true },
      { key: "reducedAnnualPension", label: "Reduced Annual Pension", format: "currency", currency: "GBP" },
      { key: "pensionGivenUpPerYear", label: "Pension Given Up per Year", format: "currency", currency: "GBP" },
      { key: "yearsToBreakEvenAfterTax", label: "Years to Break Even (After Tax)", format: "number", currency: "GBP" },
    ],
    instructions:
      "Enter your full annual pension, the share you'd give up, and your scheme's commutation factor — the lump sum paid " +
      "for each £1 a year of pension given up (12 is common in UK public-sector schemes). Because the lump sum is " +
      "tax-free while the pension is taxable, the tool compares the lump sum with the after-tax pension you'd give up.",
    examples:
      "Example: giving up 20% of a £20,000 pension (£4,000 a year) at a factor of 12 gives a £48,000 tax-free lump sum " +
      "and leaves £16,000 a year. As a basic-rate (20%) taxpayer you give up £3,200 a year after tax, so it takes 15 " +
      "years to break even.",
    assumptions:
      "Tax-free cash is generally capped at 25% of the pension's value and by the Lump Sum Allowance (£268,275 for most " +
      "people). Pensions usually rise with inflation, which makes break-even take longer than shown. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is commuting my pension a good deal?",
        answer: "A factor of 12 is often less than the pension is really worth, especially for an inflation-linked pension and someone in good health. It can suit people who need cash now, have shorter life expectancy, or want to clear debt.",
      },
    ],
  },
  {
    slug: "social-security-benefit-calculator",
    title: "Social Security Benefit Calculator",
    description: "Estimate your Social Security retirement benefit (PIA) from your average earnings using the official 2026 benefit formula and bend points.",
    metaTitle: "Social Security Benefit Calculator (2026) — PIA",
    metaDescription: "Free 2026 Social Security benefit calculator. Estimate your monthly benefit at full retirement age, 62 and 70 from your average earnings.",
    calcInputs: [
      currencyField("averageAnnualEarnings", "Average Yearly Earnings (Today's Dollars)", { default: 65000, max: 1000000, step: 1000 }),
      numberField("yearsWorked", "Years Worked", { default: 35, min: 0, max: 50, step: 1 }),
    ],
    calcResult: { label: "Monthly Benefit at FRA", format: "currency" },
    calcResults: [
      { key: "monthlyBenefitAtFullRetirementAge", label: "Monthly Benefit at Full Retirement Age", format: "currency", highlight: true },
      { key: "averageIndexedMonthlyEarnings", label: "Average Indexed Monthly Earnings (AIME)", format: "currency" },
      { key: "monthlyBenefitAt62", label: "At 62 (If Full Retirement Age Is 67)", format: "currency" },
      { key: "monthlyBenefitAt70", label: "At 70 (If Full Retirement Age Is 67)", format: "currency" },
      { key: "earningsReplacedPercent", label: "Share of Earnings Replaced", format: "percentage" },
    ],
    instructions:
      "Enter your average yearly earnings over your working life, in today's dollars, and how many years you've worked. " +
      "Social Security averages your highest 35 years (fewer years count as zeros), converts that to a monthly figure " +
      "(AIME), and applies its formula: 90% of the first $1,286, 32% up to $7,749, and 15% above that.",
    examples:
      "Example: averaging $65,000 a year for 35 years gives an AIME of $5,416 and a full-retirement-age benefit of $2,479 " +
      "a month — about 45.77% of earnings. Claiming at 62 would pay $1,735.30; waiting to 70, $3,073.96.",
    assumptions:
      "Uses the 2026 bend points for people first eligible (turning 62) in 2026 and caps earnings at the $184,500 taxable " +
      "maximum. It's an estimate — SSA indexes each year's actual earnings. Your my Social Security account at ssa.gov has " +
      "your personal estimate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is my Social Security benefit calculated?",
        answer: "SSA indexes your past earnings to wage growth, averages your top 35 years into a monthly amount (AIME), then applies a formula that replaces a higher share of lower earnings. The result is your Primary Insurance Amount (PIA) — your benefit at full retirement age.",
      },
    ],
  },
  {
    slug: "social-security-retirement-age-calculator",
    title: "Social Security Retirement Age Calculator",
    description: "Find your Social Security full retirement age from your birth year, and what percentage of your full benefit you'd get by claiming at 62 or at 70.",
    metaTitle: "Social Security Retirement Age Calculator — FRA",
    metaDescription: "Free Social Security full retirement age calculator. Enter your birth year to see your FRA and your benefit at 62 and 70 as a % of full.",
    calcInputs: [
      numberField("birthYear", "Year You Were Born", { default: 1962, min: 1943, max: 2010, step: 1 }),
    ],
    calcResult: { label: "Full Retirement Age", format: "number" },
    calcResults: [
      { key: "fullRetirementAgeYears", label: "Full Retirement Age — Years", format: "number", highlight: true },
      { key: "fullRetirementAgeExtraMonths", label: "Full Retirement Age — Plus Months", format: "number" },
      { key: "monthsEarlyIfClaimAt62", label: "Months Early If You Claim at 62", format: "number" },
      { key: "benefitAt62PercentOfFull", label: "Benefit at 62 (% of Full)", format: "percentage" },
      { key: "benefitAt70PercentOfFull", label: "Benefit at 70 (% of Full)", format: "percentage" },
    ],
    instructions:
      "Enter the year you were born. Your full retirement age (FRA) is 66 if you were born 1943–1954, rises by 2 months a " +
      "year for 1955–1959, and is 67 for anyone born in 1960 or later. The tool also shows how much claiming at the " +
      "earliest age (62) cuts your benefit, and how much waiting to 70 raises it.",
    examples:
      "Example: born in 1962, your full retirement age is 67. Claiming at 62 is 60 months early and pays 70% of your full " +
      "benefit; waiting to 70 pays 124%.",
    assumptions:
      "If you were born on January 1, use the previous year. Early claiming cuts benefits by 5/9 of 1% for each of the first " +
      "36 months and 5/12 of 1% for each extra month; delaying adds 2/3 of 1% a month (8% a year) up to 70. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is my full retirement age if I was born in 1960 or later?",
        answer: "67. Born in 1959 it's 66 and 10 months; each earlier year back to 1955 is 2 months less, down to 66 for people born 1943–1954.",
      },
    ],
  },
  {
    slug: "social-security-early-retirement-calculator",
    title: "Social Security Early Retirement Calculator",
    description: "Calculate your Social Security benefit if you claim before full retirement age — to the exact month — and how much less you'll get each year.",
    metaTitle: "Social Security Early Retirement Calculator — Reduction",
    metaDescription: "Free Social Security early retirement calculator. See your reduced benefit for claiming before full retirement age, month by month.",
    calcInputs: [
      currencyField("pia", "Your Benefit at Full Retirement Age (PIA)", { default: 2200, max: 10000, step: 10 }),
      numberField("birthYear", "Year You Were Born", { default: 1964, min: 1943, max: 2010, step: 1 }),
      numberField("claimAgeYears", "Claiming Age — Years", { default: 63, min: 62, max: 70, step: 1 }),
      numberField("claimAgeExtraMonths", "Claiming Age — Plus Months", { default: 6, min: 0, max: 11, step: 1 }),
    ],
    calcResult: { label: "Monthly Benefit", format: "currency" },
    calcResults: [
      { key: "monthlyBenefit", label: "Monthly Benefit If You Claim Then", format: "currency", highlight: true },
      { key: "reductionPercent", label: "Reduction from Your Full Benefit", format: "percentage" },
      { key: "monthsBeforeFullRetirementAge", label: "Months Before Full Retirement Age", format: "number" },
      { key: "lessPerYearThanAtFullAge", label: "Less per Year Than at Full Age", format: "currency" },
    ],
    instructions:
      "Enter your benefit at full retirement age (your PIA, shown on your Social Security statement), your birth year, and " +
      "the age — years and months — you're thinking of claiming. The reduction is permanent: 5/9 of 1% for each of the " +
      "first 36 months before full retirement age, and 5/12 of 1% for each month beyond that.",
    examples:
      "Example: with a $2,200 PIA and a full retirement age of 67, claiming at 63 and 6 months is 42 months early — a 22.5% " +
      "cut. You'd get $1,705 a month, $5,940 a year less than waiting until 67.",
    assumptions:
      "Benefits are rounded down to the whole dollar, as SSA does. If you claim at or after full retirement age, see the " +
      "Delayed Retirement Calculator. Working while claiming early may also trigger the earnings test. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is it ever smart to claim Social Security early?",
        answer: "It can be if you need the income, have health issues that shorten life expectancy, or are the lower earner in a couple where the higher earner delays. Otherwise waiting usually pays more over a long life.",
      },
    ],
  },
  {
    slug: "social-security-delayed-retirement-calculator",
    title: "Social Security Delayed Retirement Calculator",
    description: "See how much delayed retirement credits raise your Social Security if you claim after full retirement age, and the age at which waiting pays off.",
    metaTitle: "Social Security Delayed Retirement Calculator — to 70",
    metaDescription: "Free Social Security delayed retirement calculator. See the 8%-a-year delayed credits for claiming after FRA and your break-even age.",
    calcInputs: [
      currencyField("pia", "Your Benefit at Full Retirement Age (PIA)", { default: 2200, max: 10000, step: 10 }),
      numberField("birthYear", "Year You Were Born", { default: 1964, min: 1943, max: 2010, step: 1 }),
      numberField("claimAgeYears", "Claiming Age — Years", { default: 70, min: 62, max: 70, step: 1 }),
      numberField("claimAgeExtraMonths", "Claiming Age — Plus Months", { default: 0, min: 0, max: 11, step: 1 }),
    ],
    calcResult: { label: "Monthly Benefit", format: "currency" },
    calcResults: [
      { key: "monthlyBenefit", label: "Monthly Benefit If You Claim Then", format: "currency", highlight: true },
      { key: "delayedCreditPercent", label: "Delayed Retirement Credits", format: "percentage" },
      { key: "extraPerYearVsFullAge", label: "Extra per Year vs Claiming at Full Age", format: "currency" },
      { key: "breakEvenAge", label: "Age When Waiting Pays Off", format: "number" },
    ],
    instructions:
      "Enter your benefit at full retirement age, your birth year, and the age you plan to claim after full retirement " +
      "age (up to 70 — there are no credits after that). You earn 2/3 of 1% for every month you wait, 8% a year. The " +
      "break-even age is when the bigger checks have made up for the ones you skipped.",
    examples:
      "Example: with a $2,200 PIA and full retirement age of 67, waiting until 70 adds 24% — $2,728 a month, or $6,336 a " +
      "year more. You'd skip 36 checks of $2,200, which the extra $528 a month repays by age 82.5.",
    assumptions:
      "Ignores cost-of-living adjustments and investment returns on money not received. Delayed credits don't apply to " +
      "spousal benefits, but do increase a surviving spouse's benefit. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I wait until 70 to claim Social Security?",
        answer: "If you're healthy and can afford to wait, delaying often pays more over a long life and gives a larger inflation-protected income — and a bigger survivor benefit for a spouse.",
      },
    ],
  },
  {
    slug: "social-security-break-even-calculator",
    title: "Social Security Break-Even Calculator",
    description: "Compare two Social Security claiming ages and find the break-even age when the later, larger benefit catches up — with lifetime totals at 80 and 90.",
    metaTitle: "Social Security Break-Even Calculator — 62 vs 70",
    metaDescription: "Free Social Security break-even calculator. Compare claiming early vs later, see total benefits at 80 and 90, and the break-even age.",
    calcInputs: [
      numberField("earlyAge", "Earlier Claiming Age", { default: 62, min: 62, max: 70, step: 1 }),
      currencyField("earlyMonthly", "Monthly Benefit at Earlier Age", { default: 1540, max: 10000, step: 10 }),
      numberField("laterAge", "Later Claiming Age", { default: 70, min: 62, max: 70, step: 1 }),
      currencyField("laterMonthly", "Monthly Benefit at Later Age", { default: 2728, max: 10000, step: 10 }),
      percentField("colaPercent", "Yearly Cost-of-Living Adjustment", { default: 0, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Break-Even Age", format: "number" },
    calcResults: [
      { key: "breakEvenAge", label: "Break-Even Age (0 = Never Before 100)", format: "number", highlight: true },
      { key: "totalByAge80Early", label: "Total by Age 80 — Earlier Claim", format: "currency" },
      { key: "totalByAge80Later", label: "Total by Age 80 — Later Claim", format: "currency" },
      { key: "totalByAge90Early", label: "Total by Age 90 — Earlier Claim", format: "currency" },
      { key: "totalByAge90Later", label: "Total by Age 90 — Later Claim", format: "currency" },
    ],
    instructions:
      "Enter two claiming ages and the monthly benefit at each — your Social Security statement or the Early and Delayed " +
      "Retirement calculators give these. The tool adds up the checks from each choice month by month and finds the age " +
      "when the later choice has paid out more in total. If you expect to live past that age, waiting pays more.",
    examples:
      "Example: $1,540 a month from 62 versus $2,728 a month from 70. By 80 the earlier choice is slightly ahead ($332,640 " +
      "vs $327,360); the later choice catches up at about 80.42, and by 90 it's ahead $654,720 to $517,440.",
    assumptions:
      "Both choices get the same yearly COLA (0% shows today's dollars). Ignores taxes and what you could earn by " +
      "investing early checks. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is the typical Social Security break-even age?",
        answer: "Comparing 62 with 70, it's usually around age 80 to 81. Comparing full retirement age with 70, it's usually around 82 to 83.",
      },
    ],
  },
  {
    slug: "social-security-spousal-benefits-calculator",
    title: "Social Security Spousal Benefits Calculator",
    description: "Estimate a spouse's Social Security — their own benefit plus any spousal top-up of up to 50% of the worker's full benefit — at any claiming age.",
    metaTitle: "Social Security Spousal Benefits Calculator — Up to 50%",
    metaDescription: "Free Social Security spousal benefits calculator. See a spouse's own benefit plus the spousal top-up (up to 50%) at their claiming age.",
    calcInputs: [
      currencyField("workerPia", "Worker's Benefit at Full Retirement Age", { default: 3000, max: 10000, step: 10 }),
      currencyField("spouseOwnPia", "Spouse's Own Benefit at Full Retirement Age", { default: 800, max: 10000, step: 10 }),
      numberField("spouseBirthYear", "Spouse's Birth Year", { default: 1963, min: 1943, max: 2010, step: 1 }),
      numberField("spouseClaimAgeYears", "Spouse's Claiming Age — Years", { default: 67, min: 62, max: 70, step: 1 }),
      numberField("spouseClaimAgeExtraMonths", "Spouse's Claiming Age — Plus Months", { default: 0, min: 0, max: 11, step: 1 }),
    ],
    calcResult: { label: "Spouse's Total Monthly", format: "currency" },
    calcResults: [
      { key: "spouseTotalMonthly", label: "Spouse's Total Monthly Benefit", format: "currency", highlight: true },
      { key: "spouseOwnBenefit", label: "From Their Own Work Record", format: "currency" },
      { key: "spousalTopUp", label: "Spousal Top-Up", format: "currency" },
      { key: "maxSpousalAtFullAge", label: "Maximum at Full Retirement Age", format: "currency" },
      { key: "householdMonthlyWithWorkerAtFullAge", label: "Household Total (Worker at Full Benefit)", format: "currency" },
    ],
    instructions:
      "Enter the worker's full-retirement-age benefit, the spouse's own benefit from their own work (0 if none), the " +
      "spouse's birth year, and when they'll claim. A spouse gets their own benefit plus a top-up so the total can reach " +
      "half of the worker's full benefit. Claiming early reduces both parts; delaying past full retirement age raises " +
      "only the spouse's own part — the spousal top-up has no delayed credits.",
    examples:
      "Example: a worker's full benefit is $3,000 and the spouse's own is $800. Claiming at full retirement age (67), the " +
      "spouse gets their $800 plus a $700 top-up — $1,500, half the worker's benefit — for a household total of $4,500.",
    assumptions:
      "The worker must have filed for benefits for the spouse to get the top-up. Early spousal reductions are 25/36 of 1% " +
      "a month for the first 36 months and 5/12 of 1% after. Divorced spouses married 10+ years may also qualify. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can a spouse get half of the worker's Social Security?",
        answer: "Up to half of the worker's full-retirement-age benefit, if the spouse claims at their own full retirement age. It doesn't reduce the worker's own benefit.",
      },
    ],
  },
  {
    slug: "social-security-earnings-test-calculator",
    title: "Social Security Earnings Test Calculator",
    description: "See how much of your Social Security is withheld in 2026 if you work while claiming before full retirement age, under the retirement earnings test.",
    metaTitle: "Social Security Earnings Test Calculator (2026)",
    metaDescription: "Free 2026 Social Security earnings test calculator. See how much of your benefit is withheld if you work while claiming before full retirement age.",
    calcInputs: [
      currencyField("monthlyBenefit", "Your Monthly Benefit", { default: 1800, max: 10000, step: 10 }),
      currencyField("expectedEarnings", "Expected 2026 Earnings from Work", { default: 40000, max: 10000000, step: 500 }),
      dropdownField("stage", "Your Situation in 2026", 1, [
        { label: "Under full retirement age all year", value: 1 },
        { label: "Reaching full retirement age in 2026 (earnings before that month)", value: 2 },
      ]),
      numberField("monthsOfBenefitsThisYear", "Months of Benefits Due This Year (Before FRA)", { default: 12, min: 1, max: 12, step: 1 }),
    ],
    calcResult: { label: "Amount Withheld", format: "currency" },
    calcResults: [
      { key: "amountWithheld", label: "Benefits Withheld in 2026", format: "currency", highlight: true },
      { key: "earningsOverLimit", label: "Earnings over the Limit", format: "currency" },
      { key: "monthlyChecksHeldBack", label: "Monthly Checks Held Back", format: "number" },
      { key: "benefitsStillPaidThisYear", label: "Benefits Still Paid This Year", format: "currency" },
      { key: "earningsLimit", label: "2026 Earnings Limit", format: "currency" },
    ],
    instructions:
      "Enter your monthly benefit, what you expect to earn from work in 2026, and whether you're under full retirement age " +
      "all year or reach it this year. Under FRA all year, $1 is withheld for every $2 earned over $24,480. In the year you " +
      "reach FRA, $1 is withheld for every $3 over $65,160, counting only earnings before the month you reach it.",
    examples:
      "Example: with an $1,800 monthly benefit and $40,000 of earnings, you're $15,520 over the $24,480 limit, so $7,760 " +
      "is withheld. SSA holds back your first 5 checks, and you'd still receive $12,600 this year.",
    assumptions:
      "Only wages and self-employment income count — not pensions, investment income or other benefits. Withheld " +
      "benefits aren't lost: at full retirement age your benefit is recalculated upward to credit the months withheld. " +
      "Once you reach FRA there's no limit. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I lose the benefits withheld by the earnings test?",
        answer: "No. SSA recalculates your monthly benefit at full retirement age to account for months it withheld, so you get the money back over time as higher checks.",
      },
    ],
  },
  {
    slug: "social-security-lifetime-benefits-calculator",
    title: "Social Security Lifetime Benefits Calculator",
    description: "Estimate the total Social Security you'll collect over your lifetime — with yearly cost-of-living raises — in future dollars and in today's money.",
    metaTitle: "Social Security Lifetime Benefits Calculator — Total",
    metaDescription: "Free Social Security lifetime benefits calculator. Total the benefits you'll collect to your life expectancy, with COLAs, in today's money too.",
    calcInputs: [
      currencyField("monthlyBenefit", "Monthly Benefit When You Claim", { default: 2200, max: 10000, step: 10 }),
      numberField("claimAge", "Claiming Age", { default: 67, min: 62, max: 70, step: 1 }),
      numberField("lifeExpectancyAge", "Age You Expect to Live To", { default: 88, min: 62, max: 110, step: 1 }),
      percentField("colaPercent", "Yearly Cost-of-Living Adjustment", { default: 2.5, max: 10, step: 0.1 }),
      percentField("inflationPercent", "Inflation Rate", { default: 2.5, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Lifetime Benefits", format: "currency" },
    calcResults: [
      { key: "lifetimeBenefitsFutureDollars", label: "Total Lifetime Benefits", format: "currency", highlight: true },
      { key: "lifetimeBenefitsTodaysMoney", label: "In Today's Money", format: "currency" },
      { key: "yearsCollecting", label: "Years Collecting", format: "number" },
      { key: "finalMonthlyBenefit", label: "Monthly Benefit in the Final Year", format: "currency" },
    ],
    instructions:
      "Enter your monthly benefit when you start, the age you'll claim, how long you expect to live, and the yearly " +
      "cost-of-living adjustment (COLA) and inflation you expect. The tool adds up every monthly check, raised by the COLA " +
      "each year, and also shows the total in today's money.",
    examples:
      "Example: $2,200 a month from 67 to 88, rising 2.5% a year, adds up to $717,638.43 over 21 years; the final checks " +
      "are $3,604.96. With 2.5% inflation that's $554,400 in today's money.",
    assumptions:
      "COLAs are applied once a year. When the COLA equals inflation, the today's-money total is simply the monthly " +
      "benefit × months. Before tax. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How long should I assume I'll collect Social Security?",
        answer: "A 67-year-old today can expect to live into their mid-80s on average, and many live well into their 90s. Try a few ages to see the range.",
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
