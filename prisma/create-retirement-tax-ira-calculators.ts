// One-time (but safe to re-run) batch setup script: creates the 9 tools
// of the "Retirement Calculators" sub-batch C (Retirement Tax, RMDs & IRAs). Part of the
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
// See src/lib/calc-engine-retirement-tax-ira.ts for the math, the official
// 2026 figures it uses, and how near-namesake tools are differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-retirement-tax-ira-calculators.ts
// or
//   npm run db:create-retirement-tax-ira-calculators

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

const FILING_STATUS_OPTIONS = [
  { label: "Single (or Head of Household)", value: 1 },
  { label: "Married Filing Jointly", value: 2 },
];

const TOOLS: ToolDef[] = [
  {
    slug: "retirement-tax-calculator",
    title: "Retirement Tax Calculator",
    description: "Estimate your 2026 federal income tax in retirement — including how much of your Social Security is taxed, the extra 65+ standard deduction and the new $6,000 senior deduction.",
    metaTitle: "Retirement Tax Calculator (2026) — Incl. Social Security",
    metaDescription: "Free 2026 retirement tax calculator. Estimate federal tax on Social Security, pensions and IRA withdrawals with the 65+ and $6,000 senior deductions.",
    calcInputs: [
      dropdownField("filingStatus", "Filing Status", 2, FILING_STATUS_OPTIONS),
      numberField("peopleAge65Plus", "People on the Return Aged 65+", { default: 2, min: 0, max: 2, step: 1 }),
      currencyField("socialSecurityAnnual", "Social Security Benefits per Year", { default: 42000, max: 1000000, step: 500 }),
      currencyField("pensionAndIraIncome", "Pension, 401(k) and IRA Withdrawals per Year", { default: 50000, max: 10000000, step: 1000 }),
      currencyField("otherTaxableIncome", "Other Taxable Income (Interest, Wages)", { default: 5000, max: 10000000, step: 500 }),
      currencyField("taxExemptInterest", "Tax-Exempt Interest (e.g. Municipal Bonds)", { default: 0, max: 10000000, step: 500 }),
    ],
    calcResult: { label: "Federal Income Tax", format: "currency" },
    calcResults: [
      { key: "federalIncomeTax", label: "Estimated 2026 Federal Income Tax", format: "currency", highlight: true },
      { key: "taxableSocialSecurity", label: "Taxable Part of Social Security", format: "currency" },
      { key: "totalDeductions", label: "Total Deductions (Standard + 65+ + Senior)", format: "currency" },
      { key: "taxableIncome", label: "Taxable Income", format: "currency" },
      { key: "effectiveRateOnAllIncomePercent", label: "Effective Rate on All Income", format: "percentage" },
      { key: "marginalRatePercent", label: "Marginal Tax Bracket", format: "percentage" },
    ],
    instructions:
      "Choose your filing status and how many people on the return are 65 or older. Enter your yearly Social Security " +
      "benefits, taxable pension and retirement-account withdrawals, other taxable income, and any tax-exempt interest. " +
      "The tool works out how much Social Security is taxable (up to 85%), applies the 2026 standard deduction plus the " +
      "extra amount for age 65+ and the temporary $6,000 senior deduction, and runs the 2026 tax brackets.",
    examples:
      "Example: a married couple, both 65+, with $42,000 of Social Security, $50,000 of pension and IRA income and $5,000 of " +
      "interest. $33,200 of their Social Security is taxable. Deductions total $47,500 ($32,200 standard + $3,300 age 65+ + " +
      "$12,000 senior), leaving $40,700 taxable. Federal tax is about $4,388 — 4.52% of all their income, in the 12% bracket.",
    assumptions:
      "2026 figures from IRS Rev. Proc. 2025-32 and the One Big Beautiful Bill Act: standard deduction $16,100 single / " +
      "$32,200 joint; extra $2,050 (single) or $1,650 (each married person) at 65+; senior deduction $6,000 per person " +
      "aged 65+ for 2025–2028, reduced by 6% of income over $75,000 ($150,000 joint). Social Security taxation uses the " +
      "$25,000/$34,000 (single) and $32,000/$44,000 (joint) thresholds. Adjusted gross income is used as a stand-in for " +
      "modified AGI. Ignores capital gains rates, credits and state tax. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much of my Social Security is taxable?",
        answer: "It depends on your \"provisional income\" — other income plus half your benefits. Below $25,000 (single) or $32,000 (joint), none is taxed; above that, up to 50% and then up to 85% becomes taxable. It's never more than 85%.",
      },
      {
        question: "What is the $6,000 senior deduction?",
        answer: "A temporary deduction for 2025 through 2028 for people aged 65 or older: up to $6,000 each, on top of the standard deduction. It shrinks by 6 cents per dollar of income above $75,000 ($150,000 for joint filers).",
      },
    ],
  },
  {
    slug: "retirement-tax-bracket-calculator",
    title: "Retirement Tax Bracket Calculator",
    description: "Find your 2026 federal tax bracket and how much more income — such as an IRA withdrawal or Roth conversion — fits before you reach the next bracket.",
    metaTitle: "Retirement Tax Bracket Calculator (2026) — Room Left",
    metaDescription: "Free 2026 retirement tax bracket calculator. See your bracket and how much more IRA withdrawal or Roth conversion fits before the next bracket.",
    calcInputs: [
      dropdownField("filingStatus", "Filing Status", 2, FILING_STATUS_OPTIONS),
      currencyField("taxableIncome", "Taxable Income (After Deductions)", { default: 90000, max: 10000000, step: 1000 }),
    ],
    calcResult: { label: "Marginal Bracket", format: "percentage" },
    calcResults: [
      { key: "marginalRatePercent", label: "Your 2026 Tax Bracket", format: "percentage", highlight: true },
      { key: "roomLeftInBracket", label: "Room Left Before the Next Bracket", format: "currency" },
      { key: "nextBracketRatePercent", label: "Next Bracket", format: "percentage" },
      { key: "federalTax", label: "Federal Tax on This Income", format: "currency" },
      { key: "effectiveRatePercent", label: "Effective Rate on Taxable Income", format: "percentage" },
    ],
    instructions:
      "Choose your filing status and enter your taxable income — income after deductions (on Form 1040, the \"taxable " +
      "income\" line). The tool shows your 2026 bracket and exactly how much more income you could add in that same " +
      "bracket. Retirees use this to size IRA withdrawals or Roth conversions so they \"fill up\" a low bracket without " +
      "spilling into the next.",
    examples:
      "Example: a married couple with $90,000 of taxable income is in the 12% bracket, with $10,800 of room before the 22% " +
      "bracket starts. Their federal tax is $10,304, an effective 11.45%.",
    assumptions:
      "Uses the 2026 ordinary income brackets from IRS Rev. Proc. 2025-32. Long-term capital gains and qualified dividends " +
      "are taxed on a separate schedule. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does moving into a higher bracket tax all my income more?",
        answer: "No. Only the dollars above each bracket's threshold are taxed at the higher rate — the rest keeps its lower rate.",
      },
    ],
  },
  {
    slug: "roth-conversion-calculator",
    title: "Roth Conversion Calculator",
    description: "Compare converting traditional IRA money to a Roth now — paying tax today — with leaving it and paying tax later, and find the break-even future tax rate.",
    metaTitle: "Roth Conversion Calculator — Convert or Not?",
    metaDescription: "Free Roth conversion calculator. Compare paying tax now to convert with paying tax later, and find the future tax rate where converting breaks even.",
    calcInputs: [
      currencyField("conversionAmount", "Amount to Convert", { default: 50000, max: 10000000, step: 1000 }),
      percentField("currentTaxRatePercent", "Tax Rate on the Conversion Now", { default: 22, max: 60, step: 1 }),
      percentField("futureTaxRatePercent", "Expected Tax Rate on Withdrawals Later", { default: 24, max: 60, step: 1 }),
      numberField("years", "Years Until You Withdraw", { default: 20, min: 0, max: 60, step: 1 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 6, max: 20, step: 0.25 }),
      percentField("sideFundTaxDragPercent", "Tax Drag on Money Kept Outside (If Not Converting)", { default: 15, max: 60, step: 1 }),
    ],
    calcResult: { label: "Conversion Advantage", format: "currency" },
    calcResults: [
      { key: "conversionAdvantage", label: "Advantage of Converting (+) or Not (−)", format: "currency", highlight: true },
      { key: "taxDueNow", label: "Tax Due Now on the Conversion", format: "currency" },
      { key: "rothValueAfterTax", label: "Convert — Value Later (Tax-Free)", format: "currency" },
      { key: "traditionalValueAfterTax", label: "Don't Convert — Value Later After Tax", format: "currency" },
      { key: "breakEvenFutureTaxRatePercent", label: "Break-Even Future Tax Rate", format: "percentage" },
    ],
    instructions:
      "Enter the amount you're thinking of converting, your tax rate on it this year, the rate you expect when you'd " +
      "withdraw later, the years until then, and your expected return. The tool assumes you pay the conversion tax from " +
      "other savings. If you don't convert, that money stays invested outside, slowed by tax on its growth (the \"tax " +
      "drag\"). If your future rate is above the break-even rate, converting comes out ahead.",
    examples:
      "Example: converting $50,000 at 22% costs $11,000 of tax now. After 20 years at 6%, the Roth is worth $160,356.77 " +
      "tax-free. Not converting leaves $151,618.41 after 24% tax plus the invested $11,000 — so converting wins by " +
      "$8,738.36. It breaks even at a future rate of 18.55%.",
    assumptions:
      "Assumes the conversion tax is paid from money outside the IRA, the same return inside and outside, and no " +
      "early-withdrawal penalty. Converting raises this year's income, which can affect Medicare premiums (IRMAA) and " +
      "Social Security taxation. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When does a Roth conversion make sense?",
        answer: "Usually when your tax rate now is lower than you expect it to be later — for example in early retirement before Social Security and RMDs start — and when you can pay the tax from money outside the IRA.",
      },
    ],
  },
  {
    slug: "rmd-calculator",
    title: "Required Minimum Distribution (RMD) Calculator",
    description: "Calculate your required minimum distribution (RMD) from an IRA or 401(k) for this year using the IRS Uniform Lifetime Table, plus an estimate for next year.",
    metaTitle: "RMD Calculator — Required Minimum Distribution",
    metaDescription: "Free RMD calculator. Work out this year's required minimum distribution from your IRA or 401(k) with the IRS Uniform Lifetime Table.",
    calcInputs: [
      numberField("age", "Your Age at the End of This Year", { default: 75, min: 70, max: 120, step: 1 }),
      currencyField("priorYearEndBalance", "Account Balance on December 31 Last Year", { default: 500000, max: 100000000, step: 1000 }),
      percentField("annualReturnPercent", "Expected Return (for Next Year's Estimate)", { default: 5, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Required Minimum Distribution", format: "currency" },
    calcResults: [
      { key: "requiredMinimumDistribution", label: "This Year's RMD", format: "currency", highlight: true },
      { key: "distributionPeriod", label: "IRS Distribution Period (Divisor)", format: "number" },
      { key: "rmdPercentOfBalance", label: "RMD as % of Balance", format: "percentage" },
      { key: "estimatedNextYearRmd", label: "Estimated RMD Next Year", format: "currency" },
      { key: "monthlyIfSpreadEvenly", label: "Monthly If Taken in 12 Payments", format: "currency" },
    ],
    instructions:
      "Enter the age you'll be at the end of this year and your account's balance on December 31 of last year. The RMD is " +
      "that balance divided by the IRS distribution period for your age. RMDs start at 73 (75 if you were born in 1960 or " +
      "later), so below 73 the result is $0. Calculate each IRA separately; you may take the combined IRA total from any " +
      "of them, but each 401(k) must pay its own.",
    examples:
      "Example: at 75 with $500,000 at the end of last year, the divisor is 24.6, so the RMD is $20,325.20 — 4.07% of the " +
      "balance, or $1,693.77 a month. If the rest earns 5%, next year's RMD would be about $21,251.42.",
    assumptions:
      "Uses the Uniform Lifetime Table (Treas. Reg. §1.401(a)(9)-9). If your spouse is your sole beneficiary and more than " +
      "10 years younger, a different (joint) table gives a smaller RMD. Missing an RMD triggers a 25% excise tax (10% if " +
      "corrected quickly). Roth IRAs have no RMDs for the owner. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When do I have to take my first RMD?",
        answer: "By April 1 of the year after you turn 73 (75 if born in 1960 or later). Every later RMD is due by December 31. Delaying the first one means taking two in the same year.",
      },
    ],
  },
  {
    slug: "inherited-ira-rmd-calculator",
    title: "Inherited IRA RMD Calculator",
    description: "Work out the required distribution from an inherited IRA — under the life-expectancy rule or the SECURE Act 10-year rule — and the pace needed to empty it on time.",
    metaTitle: "Inherited IRA RMD Calculator — 10-Year Rule",
    metaDescription: "Free inherited IRA RMD calculator. Find this year's required distribution under the 10-year rule or life-expectancy rule, and years left.",
    calcInputs: [
      currencyField("priorYearEndBalance", "Inherited IRA Balance on December 31 Last Year", { default: 200000, max: 100000000, step: 1000 }),
      numberField("ageInFirstYear", "Your Age in the Year After the Owner Died", { default: 50, min: 0, max: 120, step: 1 }),
      numberField("yearNumber", "Which Year After Death Is This? (1 = First)", { default: 3, min: 1, max: 60, step: 1 }),
      dropdownField("rule", "Rule That Applies to You", 2, [
        { label: "Life expectancy (spouse, minor child, disabled, or not 10+ years younger)", value: 1 },
        { label: "10-year rule — owner had started RMDs (yearly RMDs required)", value: 2 },
        { label: "10-year rule — owner died before RMDs began (no yearly RMDs)", value: 3 },
      ]),
    ],
    calcResult: { label: "Required Distribution This Year", format: "currency" },
    calcResults: [
      { key: "requiredDistributionThisYear", label: "Required Distribution This Year", format: "currency", highlight: true },
      { key: "lifeExpectancyFactor", label: "Life Expectancy Factor Used", format: "number" },
      { key: "yearsLeftToEmptyAccount", label: "Years Left to Empty the Account (Incl. This One)", format: "number" },
      { key: "evenWithdrawalToEmptyOnTime", label: "Even Yearly Withdrawal to Empty It in Time", format: "currency" },
    ],
    instructions:
      "Enter last year's closing balance, your age in the first year after the original owner died, which year after the " +
      "death this is, and the rule that applies. Most non-spouse beneficiaries of deaths from 2020 on must empty the " +
      "account by the end of the 10th year; if the owner had already started RMDs, you must also take a yearly minimum in " +
      "years 1–9. Eligible designated beneficiaries can instead stretch withdrawals over their life expectancy.",
    examples:
      "Example: a beneficiary who was 50 in the first year after death, now in year 3 under the 10-year rule with yearly " +
      "RMDs, uses a factor of 34.2 (36.2 − 2). On $200,000 the required distribution is $5,847.95. With 8 years left, " +
      "taking $25,000 a year would empty it evenly.",
    assumptions:
      "Uses the IRS Single Life Table with the non-recalculating method (the first-year factor, minus 1 each year). A " +
      "surviving spouse has extra options, such as treating the IRA as their own. Rules for deaths before 2020 differ. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is the 10-year rule for inherited IRAs?",
        answer: "Under the SECURE Act, most non-spouse beneficiaries who inherit from someone who died in 2020 or later must withdraw the whole account by December 31 of the 10th year after the death.",
      },
    ],
  },
  {
    slug: "traditional-ira-calculator",
    title: "Traditional IRA Calculator",
    description: "Find out how much of your 2026 traditional IRA contribution is tax-deductible, based on your income, filing status and workplace retirement plan coverage.",
    metaTitle: "Traditional IRA Calculator (2026) — Deduction Limit",
    metaDescription: "Free 2026 traditional IRA calculator. See how much of your IRA contribution is tax-deductible with your income and workplace plan coverage.",
    calcInputs: [
      dropdownField("filingStatus", "Filing Status", 1, FILING_STATUS_OPTIONS),
      dropdownField("coverage", "Workplace Retirement Plan", 1, [
        { label: "Neither of us has one", value: 0 },
        { label: "I'm covered by a plan at work", value: 1 },
        { label: "Only my spouse is covered", value: 2 },
      ]),
      currencyField("magi", "Modified Adjusted Gross Income (MAGI)", { default: 85000, max: 10000000, step: 1000 }),
      numberField("age", "Your Age", { default: 45, min: 18, max: 100, step: 1 }),
      currencyField("plannedContribution", "Planned Contribution", { default: 7500, max: 10000, step: 100 }),
      currencyField("earnedIncome", "Your Earned Income (Wages, Self-Employment)", { default: 85000, max: 10000000, step: 1000 }),
      percentField("marginalRatePercent", "Your Tax Bracket", { default: 22, max: 40, step: 1 }),
    ],
    calcResult: { label: "Deductible Amount", format: "currency" },
    calcResults: [
      { key: "deductibleAmount", label: "Deductible Contribution", format: "currency", highlight: true },
      { key: "maxContribution", label: "Your 2026 Contribution Limit", format: "currency" },
      { key: "nonDeductibleAmount", label: "Non-Deductible Part", format: "currency" },
      { key: "taxSavingsThisYear", label: "Tax Saved This Year", format: "currency" },
    ],
    instructions:
      "Choose your filing status and whether you or your spouse has a retirement plan at work, then enter your MAGI, age, " +
      "planned contribution, earned income and tax bracket. If neither of you has a workplace plan, the whole " +
      "contribution is deductible. If one of you does, the deduction shrinks — and eventually disappears — as income " +
      "rises through the 2026 phase-out range.",
    examples:
      "Example: a single 45-year-old covered by a work plan, with $85,000 MAGI, is $4,000 into the $81,000–$91,000 " +
      "phase-out. Of a $7,500 contribution, $4,500 is deductible and $3,000 isn't. At 22%, the deduction saves $990.",
    assumptions:
      "2026 limits (IRS): $7,500, plus $1,100 at 50+, never more than earned income. Deduction phase-outs: $81,000–$91,000 " +
      "single and $129,000–$149,000 joint if you're covered; $242,000–$252,000 if only your spouse is covered. Partial " +
      "deductions round up to the next $10 with a $200 minimum. Report non-deductible contributions on Form 8606. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I still contribute if my deduction is phased out?",
        answer: "Yes. Anyone with earned income can contribute to a traditional IRA — the part you can't deduct is \"non-deductible\" and grows tax-deferred. Some people then convert it to a Roth (the \"backdoor Roth\").",
      },
    ],
  },
  {
    slug: "ira-contribution-calculator",
    title: "IRA Contribution Calculator",
    description: "See how much you can contribute to a Roth IRA and a traditional IRA in 2026 at your income, age and filing status.",
    metaTitle: "IRA Contribution Calculator (2026) — Roth Limit",
    metaDescription: "Free 2026 IRA contribution calculator. Find your maximum Roth IRA contribution at your income and how much can go to a traditional IRA instead.",
    calcInputs: [
      dropdownField("filingStatus", "Filing Status", 1, FILING_STATUS_OPTIONS),
      currencyField("magi", "Modified Adjusted Gross Income (MAGI)", { default: 160000, max: 10000000, step: 1000 }),
      numberField("age", "Your Age", { default: 52, min: 18, max: 100, step: 1 }),
      currencyField("earnedIncome", "Your Earned Income", { default: 160000, max: 10000000, step: 1000 }),
    ],
    calcResult: { label: "Max Roth Contribution", format: "currency" },
    calcResults: [
      { key: "maxRothContribution", label: "Maximum Roth IRA Contribution", format: "currency", highlight: true },
      { key: "maxTotalIraContribution", label: "Maximum Total IRA Contribution", format: "currency" },
      { key: "remainderForTraditionalIra", label: "Remainder You Can Put in a Traditional IRA", format: "currency" },
      { key: "rothLimitReducedByPercent", label: "Roth Limit Reduced By", format: "percentage" },
    ],
    instructions:
      "Choose your filing status and enter your MAGI, age and earned income. Your total IRA limit for 2026 is shared across " +
      "all your IRAs. Roth IRA eligibility phases out at higher incomes; whatever you can't put in a Roth can still go into " +
      "a traditional IRA.",
    examples:
      "Example: a single 52-year-old with $160,000 MAGI has a total limit of $8,600 ($7,500 + $1,100 catch-up). Being " +
      "$7,000 into the $153,000–$168,000 Roth phase-out, they can put $4,590 in a Roth and the other $4,010 in a " +
      "traditional IRA.",
    assumptions:
      "2026 IRS figures: IRA limit $7,500 plus $1,100 catch-up at 50+; Roth phase-out $153,000–$168,000 single and " +
      "$242,000–$252,000 joint. Reduced limits round up to the next $10, minimum $200. Married filing separately (not " +
      "shown) phases out at $0–$10,000. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I earn too much for a Roth IRA?",
        answer: "You can make a non-deductible traditional IRA contribution and convert it to a Roth — the \"backdoor Roth\". Watch the pro-rata rule if you have other pre-tax IRA money.",
      },
    ],
  },
  {
    slug: "ira-growth-calculator",
    title: "IRA Growth Calculator",
    description: "Project your IRA if you contribute every year until retirement — with the age-50 catch-up added automatically — and see how much comes from growth.",
    metaTitle: "IRA Growth Calculator — Max Out Every Year",
    metaDescription: "Free IRA growth calculator. Project an IRA with yearly contributions and the age-50 catch-up, and see your balance at retirement and total growth.",
    calcInputs: [
      numberField("currentAge", "Current Age", { default: 35, min: 18, max: 80, step: 1 }),
      numberField("retirementAge", "Retirement Age", { default: 65, min: 40, max: 85, step: 1 }),
      currencyField("currentBalance", "Current IRA Balance", { default: 20000, max: 100000000, step: 500 }),
      currencyField("annualContribution", "Yearly Contribution", { default: 7500, max: 10000, step: 100 }),
      dropdownField("addCatchUp", "Add the $1,100 Catch-Up from Age 50", 1, [
        { label: "Yes", value: 1 },
        { label: "No", value: 0 },
      ]),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 6, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Balance at Retirement", format: "currency" },
    calcResults: [
      { key: "balanceAtRetirement", label: "IRA Balance at Retirement", format: "currency", highlight: true },
      { key: "totalContributed", label: "Total Contributed", format: "currency" },
      { key: "investmentGrowth", label: "Investment Growth", format: "currency" },
      { key: "catchUpContributionsTotal", label: "Of Which Catch-Up Contributions", format: "currency" },
    ],
    instructions:
      "Enter your age, retirement age, current IRA balance, how much you'll contribute each year (the 2026 limit is " +
      "$7,500), and your expected return. Choose whether to add the $1,100 catch-up contribution allowed from age 50. " +
      "The tool adds one contribution a year and shows how much of the final balance is growth.",
    examples:
      "Example: starting at 35 with $20,000 and contributing $7,500 a year (plus $1,100 from 50) at 6% gives " +
      "$733,409.79 at 65. You contribute $241,500 — including $16,500 of catch-ups — and growth adds $471,909.79.",
    assumptions:
      "Contributions stay at today's amounts (the IRS raises the limit with inflation over time) and are added at the end " +
      "of each year. Returns are steady. Works for traditional and Roth IRAs alike; the tax treatment differs. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Traditional or Roth — which grows more?",
        answer: "Both grow the same inside the account. The difference is tax: traditional contributions may be deductible now but withdrawals are taxed; Roth contributions aren't deductible but qualified withdrawals are tax-free.",
      },
    ],
  },
  {
    slug: "ira-withdrawal-calculator",
    title: "IRA Withdrawal Calculator",
    description: "See how much of an IRA withdrawal you'd keep after federal and state tax and the 10% early-withdrawal penalty — for a traditional or a Roth IRA.",
    metaTitle: "IRA Withdrawal Calculator — Tax & Early Penalty",
    metaDescription: "Free IRA withdrawal calculator. See tax, state tax and the 10% early penalty on a traditional or Roth IRA withdrawal, and what you'd keep.",
    calcInputs: [
      dropdownField("accountType", "Account Type", 1, [
        { label: "Traditional IRA", value: 1 },
        { label: "Roth IRA", value: 2 },
      ]),
      currencyField("amount", "Amount to Withdraw", { default: 20000, max: 10000000, step: 500 }),
      numberField("age", "Your Age", { default: 52, min: 18, max: 100, step: 0.5 }),
      currencyField("rothContributionBasis", "Roth Only: Total Contributions You've Made", { default: 15000, max: 10000000, step: 500 }),
      percentField("federalRatePercent", "Federal Tax Bracket", { default: 22, max: 40, step: 1 }),
      percentField("stateRatePercent", "State Income Tax Rate", { default: 5, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Amount You Keep", format: "currency" },
    calcResults: [
      { key: "amountYouKeep", label: "Amount You Keep", format: "currency", highlight: true },
      { key: "federalTax", label: "Federal Income Tax", format: "currency" },
      { key: "stateTax", label: "State Income Tax", format: "currency" },
      { key: "earlyWithdrawalPenalty", label: "10% Early Withdrawal Penalty", format: "currency" },
      { key: "totalCostPercent", label: "Total Cost as % of Withdrawal", format: "percentage" },
    ],
    instructions:
      "Choose the account type and enter the amount, your age, and your federal and state tax rates. For a Roth IRA, also " +
      "enter the total you've contributed over the years — those contributions always come out first, tax- and " +
      "penalty-free. Before age 59½, taxable amounts usually also owe a 10% penalty.",
    examples:
      "Example: a 52-year-old taking $20,000 from a traditional IRA pays $4,400 federal tax, $1,000 state tax and a $2,000 " +
      "penalty, keeping $12,600 — a 37% cost. From a Roth with $15,000 of contributions, only the $5,000 of earnings would " +
      "be taxed and penalized.",
    assumptions:
      "Uses flat rates on the withdrawal. After 59½, Roth withdrawals are assumed qualified (account open 5+ years). Some " +
      "exceptions waive the 10% penalty — for example first-home purchases (up to $10,000), higher education, and certain " +
      "medical costs. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I take out Roth IRA contributions early?",
        answer: "Yes. Your regular Roth contributions can be withdrawn at any time, for any reason, with no tax or penalty. Only the earnings are restricted before 59½.",
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
