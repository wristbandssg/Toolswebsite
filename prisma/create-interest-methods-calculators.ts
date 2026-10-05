// One-time (but safe to re-run) batch setup script: creates the Interest Method tools
// (9) of the Interest Calculators expansion, filed under Interest Calculators.
// See src/lib/calc-engine-interest-methods.ts for the math and
// src/lib/calc-engine-interest-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-interest-methods-calculators.ts
// or
//   npm run db:create-interest-methods-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY = { name: "Interest Calculators", slug: "interest-calculators" };

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
  "This tool provides general estimates for informational purposes only and isn't financial advice. Actual " +
  "rates, fees and terms vary by bank, lender and account — check your agreement for exact figures.";

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
    slug: "overdraft-interest-calculator",
    title: "Overdraft Interest Calculator",
    description: "Work out what an overdraft really costs: interest for the days you're overdrawn plus overdraft and extended fees, shown as an effective annual rate.",
    metaTitle: "Overdraft Interest Calculator — Fees & True Cost",
    metaDescription: "Free overdraft interest calculator. Add up interest and overdraft fees for the days you're overdrawn and see the effective annual rate.",
    calcInputs: [
      currencyField("overdrawnAmount", "Amount Overdrawn", { default: 500, max: 1000000, step: 10 }),
      numberField("days", "Days Overdrawn", { default: 14, min: 0, max: 365, step: 1 }),
      percentField("annualRatePercent", "Overdraft Interest Rate (Yearly)", { default: 18, max: 60, step: 0.5, required: false }),
      currencyField("feePerItem", "Overdraft Fee per Item", { default: 35, max: 1000, step: 1, required: false }),
      numberField("items", "Number of Items Charged", { default: 1, min: 0, max: 50, step: 1, required: false }),
      currencyField("extendedFee", "Extended or Daily Overdraft Fees", { default: 0, max: 10000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "interest", label: "Interest", format: "currency" },
      { key: "fees", label: "Fees", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
      { key: "effectiveApr", label: "Effective Annual Rate", format: "percentage" },
    ],
    instructions:
      "Banks charge for overdrafts in two ways: interest on the overdrawn balance (common with UK arranged overdrafts and " +
      "overdraft lines of credit) and flat fees per item that overdraws the account (common in the US, often $25–$35, with " +
      "some banks adding a fee if you stay overdrawn for several days).\n\n" +
      "Enter how much and how long you were overdrawn, plus whatever your bank charges. The effective annual rate shows " +
      "the cost as if it were a loan.",
    examples:
      "Example: being $500 overdrawn for 14 days at 18% costs $3.45 of interest. " +
      "With a $35 overdraft fee, the total is $38.45 — an effective annual rate of 200.50%.",
    assumptions:
      "Interest is simple, on the full overdrawn amount for every day. Fees vary widely, and many banks now offer " +
      "no-fee overdraft or low-balance alerts. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I avoid overdraft fees?",
        answer: "Opt out of overdraft coverage for card purchases, link a savings account for automatic transfers, set low-balance alerts, or choose a bank with no overdraft fees.",
      },
    ],
  },
  {
    slug: "accrued-interest-calculator",
    title: "Accrued Interest Calculator",
    description: "Calculate interest that has built up but not been paid yet, using 30/360, Actual/360 or Actual/365 — and a bond's dirty price including accrued interest.",
    metaTitle: "Accrued Interest Calculator — 30/360 & Actual/365",
    metaDescription: "Free accrued interest calculator. Find interest built up over any number of days with 30/360, Actual/360 or Actual/365, plus a bond's dirty price.",
    calcInputs: [
      currencyField("principal", "Principal or Bond Face Value", { default: 10000, max: 1000000000, step: 100 }),
      percentField("annualRatePercent", "Annual Interest or Coupon Rate", { default: 5, max: 30, step: 0.05 }),
      numberField("days", "Days of Interest", { default: 75, min: 0, max: 3650, step: 1 }),
      {
        key: "dayCount", label: "Day-Count Convention", type: "dropdown", required: true, default: 1,
        options: [
          { label: "30/360 (Corporate & Municipal Bonds)", value: 1 },
          { label: "Actual/360 (Money Market, Many Loans)", value: 2 },
          { label: "Actual/365", value: 3 },
        ],
      },
      percentField("cleanPricePercent", "Bond Clean Price (% of Face)", { default: 98.5, max: 200, step: 0.125, required: false }),
    ],
    calcResult: { label: "Accrued Interest", format: "currency" },
    calcResults: [
      { key: "dailyInterest", label: "Interest per Day", format: "currency" },
      { key: "accruedInterest", label: "Accrued Interest", format: "currency", highlight: true },
      { key: "cleanPrice", label: "Clean Price", format: "currency" },
      { key: "dirtyPrice", label: "Dirty Price (Clean + Accrued)", format: "currency" },
    ],
    instructions:
      "Accrued interest is interest earned or owed since the last payment date. For a loan, it's what you'd owe in interest " +
      "if you paid it off today. For a bond, the buyer pays the seller the interest accrued since the last coupon, on top of " +
      "the quoted (clean) price.\n\n" +
      "Enter the amount, rate and number of days, and choose the day-count convention. Under 30/360, every month counts " +
      "as 30 days — count the days that way. US Treasuries use Actual/Actual (close to Actual/365).",
    examples:
      "Example: a $10,000 bond with a 5% coupon, 75 days after its last payment, has " +
      "$104.17 of accrued interest under 30/360. At a clean price of 98.50% of face, the buyer pays " +
      "$9,954.17.",
    assumptions:
      "Simple interest from the last payment date. For semi-annual coupons, a full period is 180 days under 30/360. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is accrued interest taxable?",
        answer: "For a bond buyer, the accrued interest paid to the seller reduces the interest you report for that first coupon. The seller reports it as interest income.",
      },
    ],
  },
  {
    slug: "deferred-interest-calculator",
    title: "Deferred Interest Calculator",
    description: "See what happens when a \"no interest if paid in full\" promotion ends with a balance left: the back-dated interest charged, the payment that avoids it, and how a true 0% promotion compares.",
    metaTitle: "Deferred Interest Calculator — Promo & Store Cards",
    metaDescription: "Free deferred interest calculator. See the back-dated interest charged if a promo balance isn't paid in full, and the payment that avoids it.",
    calcInputs: [
      currencyField("purchaseAmount", "Purchase Amount", { default: 2400, max: 1000000, step: 50 }),
      numberField("promoMonths", "Promotional Period (Months)", { default: 12, min: 1, max: 60, step: 1 }),
      percentField("aprPercent", "Card APR After the Promotion", { default: 29.99, max: 40, step: 0.01 }),
      currencyField("monthlyPayment", "Your Monthly Payment", { default: 150, max: 100000, step: 10 }),
      {
        key: "promoType", label: "Promotion Type", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Deferred Interest (\"No Interest If Paid in Full\")", value: 1 },
          { label: "True 0% APR Promotion", value: 2 },
        ],
      },
    ],
    calcResult: { label: "Interest Charged at Promo End", format: "currency" },
    calcResults: [
      { key: "balanceAtPromoEnd", label: "Balance at Promo End", format: "currency" },
      { key: "interestChargedAtPromoEnd", label: "Interest Charged at Promo End", format: "currency", highlight: true },
      { key: "balanceAfterCharge", label: "Balance After Interest Is Added", format: "currency" },
      { key: "paymentToClearInTime", label: "Monthly Payment to Clear It in Time", format: "currency" },
      { key: "interestThatBuiltUp", label: "Interest That Built Up During the Promo", format: "currency" },
    ],
    instructions:
      "Store cards and medical or retail financing often offer \"no interest if paid in full within 12 months.\" That's " +
      "deferred interest: interest builds up from the purchase date, and if any balance is left when the promotion ends — " +
      "even $1 — all of it is charged at once. A true 0% APR promotion (common on general credit cards) only charges " +
      "interest on what's left from then on.\n\n" +
      "Enter the purchase, the promotion and your payment. Switch the promotion type to compare.",
    examples:
      "Example: a $2,400 purchase on a 12-month deferred-interest plan, paying $150 a " +
      "month, still has $600 owing at the end. At 29.99%, $472.34 of back-dated " +
      "interest is added, so you owe $1,072.34. Paying $200 a month would have avoided it.",
    assumptions:
      "Interest builds up monthly on the balance at the card's APR; the card's actual daily-balance method gives a slightly " +
      "different figure. Minimum payments are usually too low to clear the balance in time. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I avoid deferred interest?",
        answer: "Divide the purchase by the number of promo months and pay at least that each month, finishing a month early to be safe. Payments above the minimum usually go to the promo balance last if you have other balances, so check how yours are applied.",
      },
    ],
  },
  {
    slug: "negative-amortization-interest-calculator",
    title: "Negative Amortization Interest Calculator",
    description: "See how a balance grows when your payment doesn't cover the interest: the monthly shortfall, the unpaid interest added, and when the balance hits the loan's cap and the payment resets.",
    metaTitle: "Negative Amortization Calculator — Balance Growth",
    metaDescription: "Free negative amortization calculator. See the interest shortfall, how much your balance grows, and when it reaches the cap that resets payments.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 250000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7, max: 30, step: 0.125 }),
      currencyField("monthlyPayment", "Monthly Payment", { default: 1200, max: 1000000, step: 10 }),
      numberField("months", "Months at This Payment", { default: 60, min: 0, max: 360, step: 1 }),
      percentField("capPercent", "Balance Cap (% of Original)", { default: 110, min: 100, max: 150, step: 5 }),
    ],
    calcResult: { label: "Balance After the Period", format: "currency" },
    calcResults: [
      { key: "firstMonthInterest", label: "First Month's Interest", format: "currency" },
      { key: "monthlyShortfall", label: "Monthly Interest Shortfall", format: "currency" },
      { key: "balanceAfterPeriod", label: "Balance After the Period", format: "currency", highlight: true },
      { key: "unpaidInterestAdded", label: "Unpaid Interest Added", format: "currency" },
      { key: "monthsUntilCapReached", label: "Months Until the Cap Is Reached", format: "number" },
    ],
    instructions:
      "Negative amortization happens when your payment is less than the interest due, so the unpaid interest is added to " +
      "what you owe. It occurs with payment-option ARMs, graduated payment mortgages, some income-driven student loan plans " +
      "and deferred loans.\n\n" +
      "Loans that allow it usually cap the balance at 110–125% of the original amount; once it's reached, the loan recasts " +
      "and the payment jumps to fully pay it off. Enter your balance, rate, payment and how long you'll pay that amount.",
    examples:
      "Example: a $250,000 balance at 7% charges $1,458.33 of interest in the first month, so " +
      "a $1,200 payment leaves a $258.33 shortfall. After 60 months the balance has grown to " +
      "$268,494.83, with $18,494.83 of unpaid interest added. A 110% cap would be reached in " +
      "month 77.",
    assumptions:
      "Fixed rate and payment; unpaid interest is added monthly and itself earns interest. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are negative amortization mortgages still allowed?",
        answer: "They can't be qualified mortgages under US rules, so they're rare today, but some non-QM, commercial and reverse-style loans still allow balances to grow.",
      },
    ],
  },
  {
    slug: "weighted-average-interest-rate-calculator",
    title: "Weighted Average Interest Rate Calculator",
    description: "Find the weighted average interest rate across up to five debts or accounts, plus the total interest they cost each month and year.",
    metaTitle: "Weighted Average Interest Rate Calculator",
    metaDescription: "Free weighted average interest rate calculator. Combine up to five balances and rates to find your average rate and total yearly interest.",
    calcInputs: [
      currencyField("balance1", "Balance 1", { default: 12000, max: 100000000, step: 100 }),
      percentField("rate1Percent", "Rate 1", { default: 4.5, max: 40, step: 0.01 }),
      currencyField("balance2", "Balance 2", { default: 8500, max: 100000000, step: 100, required: false }),
      percentField("rate2Percent", "Rate 2", { default: 6.8, max: 40, step: 0.01, required: false }),
      currencyField("balance3", "Balance 3", { default: 3000, max: 100000000, step: 100, required: false }),
      percentField("rate3Percent", "Rate 3", { default: 22.9, max: 40, step: 0.01, required: false }),
      currencyField("balance4", "Balance 4", { default: 0, max: 100000000, step: 100, required: false }),
      percentField("rate4Percent", "Rate 4", { default: 0, max: 40, step: 0.01, required: false }),
      currencyField("balance5", "Balance 5", { default: 0, max: 100000000, step: 100, required: false }),
      percentField("rate5Percent", "Rate 5", { default: 0, max: 40, step: 0.01, required: false }),
    ],
    calcResult: { label: "Weighted Average Rate", format: "percentage" },
    calcResults: [
      { key: "totalBalance", label: "Total Balance", format: "currency" },
      { key: "weightedAverageRate", label: "Weighted Average Rate", format: "percentage", highlight: true },
      { key: "annualInterest", label: "Interest per Year", format: "currency" },
      { key: "monthlyInterest", label: "Interest per Month", format: "currency" },
    ],
    instructions:
      "A weighted average gives each rate weight by its balance, so a large low-rate loan counts more than a small high-rate " +
      "card. Use it to judge a consolidation offer — a new loan only saves interest if its rate is below your weighted " +
      "average — or to summarize a portfolio of deposits or bonds.\n\n" +
      "Enter up to five balances and rates; leave unused rows at zero.",
    examples:
      "Example: $12,000 at 4.50%, $8,500 at 6.80% and $3,000 at 22.90% total " +
      "$23,500 with a weighted average rate of 7.68% — about $1,805 of interest a year, or " +
      "$150.42 a month.",
    assumptions:
      "Interest per year is the simple yearly interest on today's balances. Federal student loan consolidation rounds the " +
      "weighted average up to the next 1/8% — see the student loan consolidation calculator. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why not just average the rates?",
        answer: "A simple average treats a $500 balance the same as a $50,000 one. The weighted average reflects what you actually pay.",
      },
    ],
  },
  {
    slug: "tiered-interest-rate-calculator",
    title: "Tiered Interest Rate Calculator",
    description: "Calculate interest on a tiered savings or checking account, where different balance levels earn different rates — blended (each slice at its rate) or whole-balance tiers.",
    metaTitle: "Tiered Interest Rate Calculator — Blended vs Whole",
    metaDescription: "Free tiered interest rate calculator. See yearly and monthly interest and the effective rate on a tiered account, blended or whole-balance.",
    calcInputs: [
      currencyField("balance", "Account Balance", { default: 40000, max: 100000000, step: 100 }),
      currencyField("tier1Limit", "Tier 1 Up To", { default: 10000, max: 100000000, step: 1000 }),
      percentField("tier1RatePercent", "Tier 1 Rate", { default: 0.5, max: 20, step: 0.05 }),
      currencyField("tier2Limit", "Tier 2 Up To", { default: 50000, max: 100000000, step: 1000 }),
      percentField("tier2RatePercent", "Tier 2 Rate", { default: 2, max: 20, step: 0.05 }),
      percentField("tier3RatePercent", "Tier 3 Rate (Above Tier 2)", { default: 3.5, max: 20, step: 0.05 }),
      {
        key: "method", label: "How Tiers Apply", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Blended — Each Slice Earns Its Tier's Rate", value: 1 },
          { label: "Whole Balance Earns the Rate of Its Tier", value: 2 },
        ],
      },
    ],
    calcResult: { label: "Interest per Year", format: "currency" },
    calcResults: [
      { key: "annualInterest", label: "Interest per Year", format: "currency", highlight: true },
      { key: "monthlyInterest", label: "Interest per Month", format: "currency" },
      { key: "effectiveRate", label: "Effective Rate on Whole Balance", format: "percentage" },
    ],
    instructions:
      "Tiered accounts pay different rates for different balance levels. With blended tiers, each slice of the balance " +
      "earns its own rate, so the effective rate is lower than the top tier. With whole-balance tiers, your entire balance " +
      "earns the rate of the tier it falls in. The account terms say which method applies.\n\n" +
      "Enter your balance and the tier limits and rates. Some high-yield checking accounts pay a top rate only up to a cap " +
      "and very little above it — enter that as a lower tier 3 rate.",
    examples:
      "Example: $40,000 in a blended account paying 0.50% up to $10,000, 2% up to " +
      "$50,000 and 3.50% above earns $650 a year — an effective rate of 1.63%.",
    assumptions:
      "Constant balance for a year, simple interest; daily compounding adds a little more. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a tiered account better than a flat-rate one?",
        answer: "Compare the effective rate at your balance. A flat-rate high-yield account often beats a tiered one unless your balance sits in the top tier.",
      },
    ],
  },
  {
    slug: "variable-interest-rate-calculator",
    title: "Variable Interest Rate Calculator",
    description: "Project a variable-rate loan tied to an index such as the prime rate or SOFR: the rate (index + margin), how the payment changes as the index moves, and the effect of rate caps.",
    metaTitle: "Variable Rate Calculator — Prime & SOFR + Margin",
    metaDescription: "Free variable interest rate calculator. Model a prime- or SOFR-based loan: index plus margin, yearly resets, caps, payments and total interest.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 200000, max: 100000000, step: 1000 }),
      numberField("termYears", "Loan Term (Years)", { default: 15, min: 1, max: 30, step: 1 }),
      percentField("indexRatePercent", "Index Rate Today (Prime, SOFR, etc.)", { default: 6.75, max: 20, step: 0.05 }),
      percentField("marginPercent", "Margin Over the Index", { default: 1, min: -5, max: 10, step: 0.125 }),
      percentField("changePerYearPercent", "Expected Index Change per Year", { default: 0.25, min: -3, max: 3, step: 0.05 }),
      percentField("periodicCapPercent", "Cap per Adjustment", { default: 2, max: 10, step: 0.25 }),
      percentField("lifetimeCapPercent", "Lifetime Cap Above Start Rate", { default: 5, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Total Interest", format: "currency" },
    calcResults: [
      { key: "startingRate", label: "Starting Rate", format: "percentage" },
      { key: "firstPayment", label: "First Monthly Payment", format: "currency" },
      { key: "finalRate", label: "Rate in the Final Year", format: "percentage" },
      { key: "finalYearPayment", label: "Payment in the Final Year", format: "currency" },
      { key: "highestPayment", label: "Highest Payment", format: "currency" },
      { key: "rateCeiling", label: "Highest Rate Allowed", format: "percentage" },
      { key: "totalInterest", label: "Total Interest", format: "currency", highlight: true },
    ],
    instructions:
      "Variable-rate loans charge an index plus a fixed margin. HELOCs, credit cards and many business loans use the prime " +
      "rate; commercial loans and most new adjustable-rate mortgages use SOFR. When the index changes, so does your rate — " +
      "within any caps in the loan.\n\n" +
      "Enter the index, your margin, and how you expect the index to move each year (negative if it falls). The rate resets " +
      "once a year and the payment is recalculated over the remaining term.",
    examples:
      "Example: $200,000 over 15 years at the index (6.75%) plus 1% starts at " +
      "7.75%, a $1,882.55 payment. If the index rises 0.25% a year, the rate reaches " +
      "11.25% and the payment $2,109.59 by the final year — $164,414.07 of interest in all.",
    assumptions:
      "One reset a year; the index follows a straight-line path, which real rates never do — try several scenarios. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between the prime rate and SOFR?",
        answer: "Prime is the rate banks charge their best customers, usually the federal funds rate plus 3 points. SOFR is the overnight rate on loans backed by Treasuries, and is typically a few points lower than prime, so SOFR-based loans carry bigger margins.",
      },
    ],
  },
  {
    slug: "add-on-interest-calculator",
    title: "Add-On Interest Calculator",
    description: "Calculate an add-on interest loan, where interest is charged on the full amount for the whole term: total interest, monthly payment and the true APR.",
    metaTitle: "Add-On Interest Calculator — Payment & True APR",
    metaDescription: "Free add-on interest calculator. See the interest, monthly payment and true APR of an add-on loan compared with a normal amortizing loan.",
    calcInputs: [
      currencyField("principal", "Amount Borrowed", { default: 15000, max: 10000000, step: 100 }),
      percentField("addOnRatePercent", "Add-On Rate (Yearly)", { default: 6, max: 50, step: 0.05 }),
      numberField("termMonths", "Term (Months)", { default: 48, min: 1, max: 120, step: 1 }),
    ],
    calcResult: { label: "True APR", format: "percentage" },
    calcResults: [
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalRepaid", label: "Total Repaid", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "trueApr", label: "True APR", format: "percentage", highlight: true },
      { key: "amortizingInterestAtSameRate", label: "Interest on a Normal Loan at the Same Rate", format: "currency" },
    ],
    instructions:
      "With add-on interest, the lender multiplies the full amount borrowed by the rate and the number of years, adds that " +
      "to the principal, and divides by the number of payments. Because you pay interest on money you've already repaid, " +
      "the true APR is nearly double the quoted add-on rate. Some buy-here-pay-here car loans, installment loans and loans " +
      "outside the US still use it.\n\n" +
      "US lenders must disclose the APR; compare that, not the add-on rate.",
    examples:
      "Example: borrowing $15,000 at a 6% add-on rate for 48 months adds $3,600 of " +
      "interest, so you repay $18,600 at $387.50 a month. The true APR is 10.97%; a normal loan at " +
      "6% would cost only $1,909.22.",
    assumptions:
      "Equal monthly payments; fees not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does paying an add-on loan off early save interest?",
        answer: "Less than you'd expect: the interest is pre-computed, and early payoff rebates are often figured with the Rule of 78s, which favors the lender. See the Rule of 78s calculator.",
      },
    ],
  },
  {
    slug: "bank-discount-interest-calculator",
    title: "Bank Discount Interest Calculator",
    description: "Calculate a discount loan or note, where interest is taken out up front: the cash you receive, the effective interest rate, and the face amount needed to receive a set sum.",
    metaTitle: "Bank Discount Interest Calculator — Proceeds & Rate",
    metaDescription: "Free bank discount calculator. See the interest deducted up front, the cash you receive, the effective rate, and the face amount you'd need.",
    calcInputs: [
      currencyField("faceAmount", "Face Amount (Repaid at Maturity)", { default: 10000, max: 100000000, step: 100 }),
      percentField("discountRatePercent", "Discount Rate (Yearly)", { default: 9, max: 50, step: 0.05 }),
      numberField("termMonths", "Term (Months)", { default: 12, min: 1, max: 120, step: 1 }),
    ],
    calcResult: { label: "Effective Interest Rate", format: "percentage" },
    calcResults: [
      { key: "interestDeducted", label: "Interest Deducted Up Front", format: "currency" },
      { key: "proceedsReceived", label: "Cash You Receive", format: "currency" },
      { key: "amountRepaid", label: "Amount You Repay", format: "currency" },
      { key: "effectiveRate", label: "Effective Interest Rate", format: "percentage", highlight: true },
      { key: "faceNeededForProceeds", label: "Note Size Needed to Get the Face Amount in Cash", format: "currency" },
    ],
    instructions:
      "With the bank discount method, the lender deducts the interest from the loan when it's made. You receive less than " +
      "the face amount but repay all of it at maturity, so the effective rate on the cash you actually get is higher than " +
      "the stated discount rate. The same method is used to quote Treasury bills and commercial paper.\n\n" +
      "Enter the face amount, the discount rate and the term. The last result shows how large a note you'd need to end up " +
      "with the face amount in cash.",
    examples:
      "Example: a $10,000 note at a 9% discount for 12 months has $900 " +
      "taken off up front, so you receive $9,100 and repay $10,000 — an effective rate of " +
      "9.89%. To receive $10,000 in cash, you'd need a $10,989.01 note.",
    assumptions:
      "Simple discount over the term; the effective rate is simple, not compounded. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the effective rate higher than the discount rate?",
        answer: "The discount rate is applied to the face amount, but you only get the smaller proceeds. Interest as a share of the money you actually receive is therefore higher.",
      },
    ],
  },
];

async function ensureCategory() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY.slug}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, then re-run this script.`
    );
  }
  return category;
}

async function main() {
  const category = await ensureCategory();

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
