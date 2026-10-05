// One-time (but safe to re-run) batch setup script: creates the Interest Rate tools
// (9) of the Interest Calculators expansion, filed under Interest Calculators.
// See src/lib/calc-engine-interest-rate-tools.ts for the math and
// src/lib/calc-engine-interest-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-interest-rate-tools-calculators.ts
// or
//   npm run db:create-interest-rate-tools-calculators

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
  "This tool provides general estimates for informational purposes only and isn't financial, legal or tax " +
  "advice. Actual rates, fees and terms vary — check your agreement or ask a professional for exact figures.";

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
    slug: "rule-of-78s-interest-calculator",
    title: "Rule of 78s Interest Calculator",
    description: "See how the Rule of 78s front-loads interest on a pre-computed loan: interest charged after any month, the extra cost versus normal amortization, your rebate and the payoff amount.",
    metaTitle: "Rule of 78s Calculator — Payoff & Interest Rebate",
    metaDescription: "Free Rule of 78s calculator. See interest earned under the Rule of 78s vs actuarial, the unearned interest rebate and your early payoff amount.",
    calcInputs: [
      currencyField("principal", "Amount Borrowed", { default: 10000, max: 10000000, step: 100 }),
      percentField("aprPercent", "APR", { default: 12, max: 50, step: 0.05 }),
      numberField("termMonths", "Term (Months)", { default: 36, min: 1, max: 120, step: 1 }),
      numberField("monthsPaid", "Payments Made Before Payoff", { default: 12, min: 0, max: 120, step: 1 }),
    ],
    calcResult: { label: "Payoff Amount", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "totalFinanceCharge", label: "Total Finance Charge", format: "currency" },
      { key: "interestEarnedRuleOf78s", label: "Interest Charged (Rule of 78s)", format: "currency" },
      { key: "interestEarnedActuarial", label: "Interest Charged (Actuarial)", format: "currency" },
      { key: "extraCostOfRuleOf78s", label: "Extra Cost of the Rule of 78s", format: "currency" },
      { key: "rebateOfUnearnedInterest", label: "Rebate of Unearned Interest", format: "currency" },
      { key: "payoffAmount", label: "Payoff Amount", format: "currency", highlight: true },
    ],
    instructions:
      "On a pre-computed loan, all the interest is added at the start. If you pay off early, the lender rebates the " +
      "\"unearned\" part. The Rule of 78s decides how much has been earned: in a 12-month loan, month 1 earns 12/78 of the " +
      "interest (1 + 2 + … + 12 = 78), month 2 earns 11/78, and so on — so more interest counts as earned early on than " +
      "under normal (actuarial) amortization.\n\n" +
      "Enter the loan and the number of payments made. US federal law bans the Rule of 78s on consumer loans longer than " +
      "61 months, and many states ban it altogether.",
    examples:
      "Example: $10,000 at 12% over 36 months carries a $1,957.15 finance charge. After " +
      "12 payments, the Rule of 78s counts $1,075.55 as earned, versus $1,041.56 " +
      "under normal amortization — $33.99 more. You get a $881.60 rebate and pay off " +
      "$7,089.83.",
    assumptions:
      "The finance charge is the interest on an equal-payment loan at the APR; fees and prepayment penalties are not " +
      "included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is the Rule of 78s still used?",
        answer: "Rarely, mostly on short-term consumer and some auto loans where state law allows it. Check your contract for \"Rule of 78s\" or \"sum of the digits.\"",
      },
    ],
  },
  {
    slug: "break-even-interest-rate-calculator",
    title: "Break-Even Interest Rate Calculator",
    description: "Find the rate you'd need when a short-term deposit matures to match locking in a longer term now — so you can choose between a short and a long CD or bond.",
    metaTitle: "Break-Even Interest Rate Calculator — Short vs Long",
    metaDescription: "Free break-even interest rate calculator. Find the reinvestment rate at which a short CD rolled over matches a longer CD locked in today.",
    calcInputs: [
      currencyField("amount", "Amount", { default: 10000, max: 100000000, step: 100 }),
      percentField("shortRatePercent", "Short-Term Rate (APY)", { default: 4.25, max: 20, step: 0.05 }),
      numberField("shortYears", "Short Term (Years)", { default: 1, min: 0.25, max: 10, step: 0.25 }),
      percentField("longRatePercent", "Long-Term Rate (APY)", { default: 3.9, max: 20, step: 0.05 }),
      numberField("longYears", "Long Term (Years)", { default: 3, min: 0.5, max: 30, step: 0.25 }),
    ],
    calcResult: { label: "Break-Even Reinvestment Rate", format: "percentage" },
    calcResults: [
      { key: "longTermValue", label: "Value of the Long Term at Its End", format: "currency" },
      { key: "shortTermValue", label: "Value of the Short Term at Its End", format: "currency" },
      { key: "breakEvenReinvestmentRate", label: "Break-Even Reinvestment Rate", format: "percentage", highlight: true },
      { key: "changeNeeded", label: "Change From Today's Short Rate (Points)", format: "number" },
    ],
    instructions:
      "When short-term rates are higher than long-term rates (an inverted yield curve), a short CD pays more now but you " +
      "must reinvest later at an unknown rate. The break-even rate is what you'd need to earn from the end of the short " +
      "term to the end of the long term for both choices to end equal.\n\n" +
      "If you think rates will be above the break-even when the short term ends, go short; if below, lock in the longer " +
      "term.",
    examples:
      "Example: $10,000 in a 3-year CD at 3.90% grows to $11,216.22. A 1-year CD at " +
      "4.25% grows to $10,425; to catch up, you'd need to reinvest at 3.73% for " +
      "the remaining years — -0.52 points from today's short rate.",
    assumptions:
      "Annual compounding at APY; no taxes or early withdrawal penalties. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does this work for bonds and Treasuries too?",
        answer: "Yes — use the yields for the two maturities. It's the same idea as the forward rate implied by the yield curve.",
      },
    ],
  },
  {
    slug: "interest-rate-spread-calculator",
    title: "Interest Rate Spread Calculator",
    description: "Calculate the spread between what you earn on loans or investments and what you pay for funding, in percent and basis points, plus net interest income and net interest margin.",
    metaTitle: "Interest Rate Spread Calculator — NIM & Basis Points",
    metaDescription: "Free interest rate spread calculator. See the spread in basis points, net interest income and net interest margin for a bank, lender or portfolio.",
    calcInputs: [
      percentField("earningRatePercent", "Rate Earned (Loans or Assets)", { default: 7.25, min: -5, max: 50, step: 0.05 }),
      percentField("fundingRatePercent", "Rate Paid (Deposits or Funding)", { default: 3.5, min: -5, max: 50, step: 0.05 }),
      currencyField("earningAssets", "Earning Assets", { default: 1000000, max: 100000000000, step: 1000 }),
      currencyField("fundingAmount", "Interest-Bearing Funding", { default: 900000, max: 100000000000, step: 1000 }),
    ],
    calcResult: { label: "Net Interest Margin", format: "percentage" },
    calcResults: [
      { key: "spreadPercent", label: "Spread (%)", format: "percentage" },
      { key: "spreadBasisPoints", label: "Spread (Basis Points)", format: "number" },
      { key: "interestIncome", label: "Interest Income per Year", format: "currency" },
      { key: "interestCost", label: "Interest Cost per Year", format: "currency" },
      { key: "netInterestIncome", label: "Net Interest Income", format: "currency" },
      { key: "netInterestMargin", label: "Net Interest Margin", format: "percentage", highlight: true },
    ],
    instructions:
      "The interest rate spread is the difference between the rate earned on loans or investments and the rate paid to " +
      "fund them. Net interest margin (NIM) divides the net interest income by earning assets, so it also reflects how much " +
      "of the funding is free (like non-interest checking or equity). US banks' NIM averages around 3%.\n\n" +
      "You can also use the spread for any two rates — a corporate bond yield over a Treasury, a loan rate over SOFR, or a " +
      "card APR over the prime rate.",
    examples:
      "Example: earning 7.25% on $1,000,000 while paying 3.50% on $900,000 is a " +
      "375-basis-point spread. Interest income of $72,500 less $31,500 of cost leaves " +
      "$41,000 — a net interest margin of 4.10%.",
    assumptions:
      "Yearly figures on average balances; fees and credit losses are not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a basis point?",
        answer: "One hundredth of a percentage point: 0.01%. A spread of 3.75% is 375 basis points.",
      },
    ],
  },
  {
    slug: "prepaid-interest-calculator",
    title: "Prepaid Interest Calculator",
    description: "Estimate the prepaid (per-diem) interest due at a mortgage closing — from the closing date to the end of the month — and how the closing date changes it.",
    metaTitle: "Prepaid Interest Calculator — Mortgage Per-Diem",
    metaDescription: "Free prepaid interest calculator. See the daily interest on your mortgage and the prepaid interest due at closing for any closing date.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 350000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.5, max: 20, step: 0.125 }),
      numberField("closingDay", "Closing Day of the Month", { default: 18, min: 1, max: 31, step: 1 }),
      numberField("daysInMonth", "Days in That Month", { default: 30, min: 28, max: 31, step: 1 }),
      {
        key: "yearBasis", label: "Lender's Year Basis", type: "dropdown", required: true, default: 365,
        options: [
          { label: "365 Days", value: 365 },
          { label: "360 Days", value: 360 },
        ],
      },
    ],
    calcResult: { label: "Prepaid Interest", format: "currency" },
    calcResults: [
      { key: "dailyInterest", label: "Daily (Per-Diem) Interest", format: "currency" },
      { key: "daysOfPrepaidInterest", label: "Days of Prepaid Interest", format: "number" },
      { key: "prepaidInterest", label: "Prepaid Interest", format: "currency", highlight: true },
      { key: "prepaidIfClosingOnFirst", label: "If You Closed on the 1st", format: "currency" },
      { key: "prepaidIfClosingOnLastDay", label: "If You Closed on the Last Day", format: "currency" },
    ],
    instructions:
      "Mortgage interest is paid in arrears, so your first payment is due on the first of the month after next. To cover " +
      "the days from closing to the end of the closing month, you prepay interest at closing. Closing late in the month " +
      "means less prepaid interest (but not a lower total cost — you just start paying sooner).\n\n" +
      "Enter the loan, rate and closing date. The closing day counts as a day of interest.",
    examples:
      "Example: a $350,000 loan at 6.50% costs $62.33 a day. Closing on day 18 of a " +
      "30-day month means 13 days of prepaid interest — $810.27 due at closing, " +
      "versus $1,869.86 if you closed on the 1st.",
    assumptions:
      "Simple daily interest on the full loan. The Loan Estimate lists this as \"prepaid interest\" in section F. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is prepaid interest tax-deductible?",
        answer: "Yes, as mortgage interest for the year paid, if you itemize. It appears on your Form 1098.",
      },
    ],
  },
  {
    slug: "interest-rate-cap-calculator",
    title: "Interest Rate Cap Calculator",
    description: "See how an interest rate cap protects a floating-rate loan: the payout when the index is above the strike, the premium, and your all-in rate with and without the cap.",
    metaTitle: "Interest Rate Cap Calculator — Payout & All-In Rate",
    metaDescription: "Free interest rate cap calculator. See the cap payout, premium cost, and your all-in rate with and without a cap on a floating-rate loan.",
    calcInputs: [
      currencyField("notional", "Notional (Loan) Amount", { default: 10000000, max: 10000000000, step: 100000 }),
      percentField("strikePercent", "Cap Strike Rate", { default: 4.5, max: 20, step: 0.125 }),
      percentField("indexRatePercent", "Index Rate (e.g., SOFR)", { default: 5.25, max: 20, step: 0.05 }),
      percentField("spreadPercent", "Loan Spread Over the Index", { default: 2.5, max: 10, step: 0.05 }),
      percentField("premiumPercent", "Cap Premium (% of Notional)", { default: 1.2, max: 20, step: 0.05 }),
      numberField("termYears", "Cap Term (Years)", { default: 3, min: 0.25, max: 10, step: 0.25 }),
    ],
    calcResult: { label: "All-In Rate With Cap", format: "percentage" },
    calcResults: [
      { key: "quarterlyPayout", label: "Cap Payout per Quarter", format: "currency" },
      { key: "yearlyPayout", label: "Cap Payout per Year", format: "currency" },
      { key: "capPremium", label: "Cap Premium (Upfront)", format: "currency" },
      { key: "rateWithoutCap", label: "Rate Without the Cap", format: "percentage" },
      { key: "allInRateWithCap", label: "All-In Rate With Cap", format: "percentage", highlight: true },
      { key: "maximumAllInRate", label: "Highest All-In Rate With Cap", format: "percentage" },
      { key: "yearlySavingsAfterPremium", label: "Yearly Savings After Premium", format: "currency" },
    ],
    instructions:
      "A rate cap is an option a borrower buys: whenever the index (usually SOFR) is above the strike on a reset date, the " +
      "cap seller pays the difference on the notional amount. Your floating-rate payment is effectively limited to the " +
      "strike plus your loan spread. Lenders often require caps on floating-rate commercial real estate loans.\n\n" +
      "Enter the loan, strike, today's index, the spread and the premium quoted. The premium is spread evenly over the term " +
      "to show an all-in rate.",
    examples:
      "Example: a $10,000,000 cap with a 4.50% strike pays $18,750 a quarter while SOFR is " +
      "5.25%. With a 2.50% spread, your rate would be 7.75%; with the cap and its " +
      "$120,000 premium spread over 3 years, it's 7.40%.",
    assumptions:
      "Quarterly resets on the full notional; the index stays where entered. Premiums change with rate volatility and the " +
      "strike chosen. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is a cap different from a swap?",
        answer: "A swap fixes your rate, so you lose if rates fall. A cap only limits the upside — you keep the benefit of lower rates — but you pay a premium up front.",
      },
    ],
  },
  {
    slug: "interest-rate-collar-calculator",
    title: "Interest Rate Collar Calculator",
    description: "See how an interest rate collar keeps a floating rate between a floor and a cap: your all-in rate, the lowest and highest it can be, and what's paid or received each quarter.",
    metaTitle: "Interest Rate Collar Calculator — Cap & Floor",
    metaDescription: "Free interest rate collar calculator. See your all-in rate between the floor and cap, the rate range, and quarterly cap and floor payments.",
    calcInputs: [
      currencyField("notional", "Notional (Loan) Amount", { default: 10000000, max: 10000000000, step: 100000 }),
      percentField("capStrikePercent", "Cap Strike Rate", { default: 5.5, max: 20, step: 0.125 }),
      percentField("floorStrikePercent", "Floor Strike Rate", { default: 3, max: 20, step: 0.125 }),
      percentField("indexRatePercent", "Index Rate (e.g., SOFR)", { default: 2.5, max: 20, step: 0.05 }),
      percentField("spreadPercent", "Loan Spread Over the Index", { default: 2.5, max: 10, step: 0.05 }),
      percentField("netPremiumPercent", "Net Premium (% of Notional, 0 = Zero-Cost)", { default: 0, min: -5, max: 10, step: 0.05, required: false }),
    ],
    calcResult: { label: "All-In Rate", format: "percentage" },
    calcResults: [
      { key: "effectiveIndexRate", label: "Effective Index Rate", format: "percentage" },
      { key: "allInRate", label: "All-In Rate", format: "percentage", highlight: true },
      { key: "lowestAllInRate", label: "Lowest Possible Rate (Floor)", format: "percentage" },
      { key: "highestAllInRate", label: "Highest Possible Rate (Cap)", format: "percentage" },
      { key: "quarterlyCapPayout", label: "Cap Payout to You per Quarter", format: "currency" },
      { key: "quarterlyFloorPayment", label: "Floor Payment by You per Quarter", format: "currency" },
      { key: "netPremium", label: "Net Premium", format: "currency" },
    ],
    instructions:
      "A collar combines buying a cap with selling a floor. The cap pays you when the index rises above the cap strike; the " +
      "floor makes you pay when the index falls below the floor strike. The floor's premium pays for the cap's, often " +
      "making a \"zero-cost collar\". Your rate stays within a band.\n\n" +
      "On its own, a floor is what a lender or investor buys to protect income when rates fall — the floor payment shown " +
      "here is what they would receive.",
    examples:
      "Example: a 3%–5.50% collar on $10,000,000 with a 2.50% spread keeps your rate " +
      "between 5.50% and 8%. With SOFR at 2.50%, below the floor, you pay " +
      "$12,500 a quarter, so your all-in rate is 5.50%.",
    assumptions:
      "Quarterly resets on the full notional; the index stays where entered. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why choose a collar over a cap?",
        answer: "To avoid paying a cap premium. You give up the benefit of rates falling below the floor in exchange.",
      },
    ],
  },
  {
    slug: "escrow-account-interest-calculator",
    title: "Escrow Account Interest Calculator",
    description: "Estimate the interest your mortgage lender owes you on your escrow account in states that require it, based on your yearly escrow payments and the required rate.",
    metaTitle: "Escrow Account Interest Calculator — State-Required",
    metaDescription: "Free escrow account interest calculator. Estimate your average escrow balance and the interest a lender must pay in states that require it.",
    calcInputs: [
      currencyField("annualDisbursements", "Yearly Taxes & Insurance Paid From Escrow", { default: 7200, max: 1000000, step: 100 }),
      numberField("cushionMonths", "Cushion (Months, Max 2)", { default: 2, min: 0, max: 2, step: 1 }),
      percentField("requiredRatePercent", "Required Interest Rate", { default: 2, max: 10, step: 0.05 }),
      numberField("years", "Years", { default: 5, min: 0, max: 30, step: 1 }),
    ],
    calcResult: { label: "Interest per Year", format: "currency" },
    calcResults: [
      { key: "averageEscrowBalance", label: "Average Escrow Balance", format: "currency" },
      { key: "interestPerYear", label: "Interest per Year", format: "currency", highlight: true },
      { key: "interestOverPeriod", label: "Interest Over the Period", format: "currency" },
    ],
    instructions:
      "A number of states — including California, New York, Massachusetts, Connecticut, Maryland, Minnesota, Oregon, Rhode " +
      "Island, Utah, Vermont and Wisconsin — require lenders to pay interest on mortgage escrow accounts, often around 2% " +
      "or a rate tied to savings rates. Check your state's rule; national banks may not have to follow it.\n\n" +
      "Escrow balances rise as monthly deposits build and drop when bills are paid, so the average is roughly half the " +
      "yearly amount plus the cushion.",
    examples:
      "Example: with $7,200 a year paid from escrow and a 2-month cushion, the average balance " +
      "is about $4,800. At 2%, that earns $96 a year — " +
      "$480 over 5 years.",
    assumptions:
      "Average balance approximation; the lender credits interest on actual daily or monthly balances. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do some lenders not pay escrow interest?",
        answer: "There's no federal requirement, and a 2024 Supreme Court ruling allowed courts to decide case by case whether state escrow-interest laws apply to national banks.",
      },
    ],
  },
  {
    slug: "trust-account-interest-calculator",
    title: "Trust Account Interest Calculator",
    description: "Project the interest a trust earns, the trustee's fees, how much income is distributed to beneficiaries, and the balance left after a number of years.",
    metaTitle: "Trust Account Interest Calculator — Income & Fees",
    metaDescription: "Free trust account interest calculator. See interest earned, trustee fees, income distributed to beneficiaries and the trust balance over time.",
    calcInputs: [
      currencyField("balance", "Trust Balance", { default: 500000, max: 10000000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate Earned", { default: 4.5, max: 20, step: 0.05 }),
      percentField("trusteeFeePercent", "Trustee Fee (% of Balance per Year)", { default: 1, max: 5, step: 0.05, required: false }),
      percentField("distributePercent", "Share of Net Income Distributed", { default: 100, max: 100, step: 5 }),
      numberField("years", "Years", { default: 10, min: 0, max: 50, step: 1 }),
    ],
    calcResult: { label: "Total Distributed", format: "currency" },
    calcResults: [
      { key: "firstYearInterest", label: "First-Year Interest", format: "currency" },
      { key: "firstYearNetIncome", label: "First-Year Net Income After Fees", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalTrusteeFees", label: "Total Trustee Fees", format: "currency" },
      { key: "totalDistributed", label: "Total Distributed", format: "currency", highlight: true },
      { key: "balanceAtEnd", label: "Trust Balance at the End", format: "currency" },
    ],
    instructions:
      "Many trusts pay their net income — interest less trustee and other fees — to income beneficiaries and keep the " +
      "principal for remainder beneficiaries. Income that isn't distributed is added to principal. Professional trustees " +
      "commonly charge about 0.5–1.5% of assets a year.\n\n" +
      "Enter the trust's balance, rate, fee and how much of the net income is paid out. For lawyers' IOLTA accounts, the " +
      "interest goes to the state bar foundation rather than the client.",
    examples:
      "Example: a $500,000 trust earning 4.50% makes $22,500 in the first year; after a " +
      "1% fee, $17,500 is left. Paying out all net income for 10 years distributes " +
      "$175,000 and leaves $500,000 in the trust.",
    assumptions:
      "Interest and fees are figured yearly on the start-of-year balance; taxes on trust income are not included (trusts " +
      "reach the top tax bracket at a low income, so distributing income is often more tax-efficient). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who pays tax on trust interest?",
        answer: "Distributed income is generally taxed to the beneficiaries (reported on a Schedule K-1); income kept in the trust is taxed to the trust.",
      },
    ],
  },
  {
    slug: "islamic-profit-rate-calculator",
    title: "Islamic Profit Rate Calculator",
    description: "Calculate a murabaha (cost-plus) Islamic financing: the profit added to the cost price, the selling price, your monthly installment and the equivalent APR.",
    metaTitle: "Islamic Profit Rate Calculator — Murabaha Financing",
    metaDescription: "Free Islamic profit rate calculator. See the murabaha profit, selling price, monthly installment and the equivalent APR of Islamic financing.",
    calcInputs: [
      currencyField("costPrice", "Cost Price of the Asset", { default: 30000, max: 100000000, step: 100 }),
      currencyField("downPayment", "Down Payment", { default: 3000, max: 100000000, step: 100, required: false }),
      percentField("profitRatePercent", "Profit Rate (Flat, per Year)", { default: 5, max: 30, step: 0.05 }),
      numberField("termMonths", "Term (Months)", { default: 60, min: 1, max: 360, step: 1 }),
    ],
    calcResult: { label: "Monthly Installment", format: "currency" },
    calcResults: [
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "totalProfit", label: "Total Profit", format: "currency" },
      { key: "sellingPrice", label: "Selling Price (Cost + Profit)", format: "currency" },
      { key: "monthlyInstallment", label: "Monthly Installment", format: "currency", highlight: true },
      { key: "equivalentApr", label: "Equivalent APR", format: "percentage" },
    ],
    instructions:
      "Islamic finance avoids interest (riba). In murabaha, the bank buys the asset and sells it to you at cost plus an " +
      "agreed profit, paid in installments. The profit is fixed at the start, usually as a flat yearly rate on the amount " +
      "financed, so it doesn't fall as you pay down the balance.\n\n" +
      "Because of that, the equivalent APR is higher than the quoted profit rate — compare offers (Islamic or conventional) " +
      "on that figure. Ijara (leasing) and diminishing musharaka home financing work differently.",
    examples:
      "Example: financing $27,000 of a $30,000 car at a 5% profit rate for 60 " +
      "months adds $6,750 of profit, for a $36,750 selling price. The installment is $562.50 a " +
      "month — an equivalent APR of 9.15%.",
    assumptions:
      "Flat profit on the amount financed; fees and takaful are not included. Some banks quote a reducing-balance profit " +
      "rate instead, which works like an APR. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is murabaha the same as an interest-bearing loan?",
        answer: "The payments can look similar, but the bank must own the asset before selling it to you and the profit can't increase if you pay late (late charges usually go to charity).",
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
