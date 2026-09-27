// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Mortgage Calculators" sub-batch B (Payment Strategies & Term
// Comparison). Part of the Mortgage_Topical_Map_Large_Tool_List.xlsx
// build-out (36 tools total, split into 3 sub-batches — see
// create-mortgage-core-calculators.ts and create-mortgage-refinance-
// programs-calculators.ts for the other two). Filed under the existing
// "Mortgage Calculators" category (mortgage-calculators).
//
// See src/lib/calc-engine-mortgage-payment-strategies.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-mortgage-payment-strategies-calculators.ts
// or
//   npm run db:create-mortgage-payment-strategies-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "mortgage-calculators";

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
  "This tool provides general estimates for informational purposes only and isn't financial or lending advice. " +
  "Actual loan terms, rates, and requirements vary by lender — check with your mortgage lender for figures " +
  "specific to your situation.";

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
    slug: "extra-mortgage-payment-calculator",
    title: "Extra Mortgage Payment Calculator",
    description: "See how much time and interest you'd save by adding a fixed extra amount to every monthly mortgage payment.",
    metaTitle: "Extra Mortgage Payment Calculator — Free & Instant",
    metaDescription: "Free extra mortgage payment calculator. Enter your loan details and an extra monthly amount to see months and interest saved.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 100000000, step: 1000 }),
      percentField("annualInterestRate", "Annual Interest Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      currencyField("extraMonthlyPayment", "Extra Monthly Payment", { default: 200, max: 1000000, step: 25 }),
    ],
    calcResult: { label: "Interest Saved", format: "currency" },
    calcResults: [
      { key: "baselinePayment", label: "Baseline Scheduled Payment", format: "currency" },
      { key: "monthsSaved", label: "Months Saved Off Loan Term", format: "number" },
      { key: "interestSaved", label: "Total Interest Saved", format: "currency", highlight: true },
      { key: "newPayoffMonths", label: "New Payoff Time (Months)", format: "number" },
    ],
    instructions:
      "Enter your loan amount, interest rate, term, and a fixed extra amount you plan to add to every monthly " +
      "payment going forward. The result compares this to your original scheduled payoff, showing how many " +
      "months you'll shave off and how much interest you'll save.",
    examples: "Example: a $300,000 loan at 6.5% over 30 years, with an extra $200 added to every monthly payment, saves 83 months (nearly 7 years) and $103,448.79 in interest.",
    assumptions:
      "This assumes the extra amount is applied consistently every month for the entire remaining loan, with no " +
      "missed payments. Confirm with your servicer that extra payments are applied directly to principal (some " +
      "servicers require you to specify this, otherwise extra amounts may be held as a future payment credit " +
      "instead). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the Mortgage Prepayment Calculator?",
        answer: "This tool models a recurring extra amount added to every monthly payment going forward. The Mortgage Prepayment Calculator instead models a single one-time lump-sum payment applied at a specific month — useful for a bonus, inheritance, or other windfall rather than an ongoing budget change.",
      },
      {
        question: "Do I need to tell my lender about extra payments?",
        answer: "Most servicers require you to specify that an extra amount should go toward principal — otherwise it may sit as a credit applied to your next regular payment instead of reducing your balance early. Check your servicer's specific process for principal-only payments.",
      },
    ],
  },
  {
    slug: "mortgage-prepayment-calculator",
    title: "Mortgage Prepayment Calculator",
    description: "See how a one-time lump-sum payment toward your mortgage principal shortens your payoff time and reduces total interest.",
    metaTitle: "Mortgage Prepayment Calculator — Free & Instant",
    metaDescription: "Free mortgage prepayment calculator. Enter a one-time lump-sum payment to see how it shortens your payoff time and saves interest.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 100000000, step: 1000 }),
      percentField("annualInterestRate", "Annual Interest Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      currencyField("lumpSumPrepayment", "One-Time Lump-Sum Prepayment", { default: 20000, max: 10000000, step: 500 }),
      numberField("prepaymentMonth", "Month Prepayment Is Applied", { default: 12, min: 1, max: 480, step: 1 }),
    ],
    calcResult: { label: "Interest Saved vs. Baseline", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Regular Monthly Payment", format: "currency" },
      { key: "monthsToPayoff", label: "New Total Months To Payoff", format: "number" },
      { key: "totalInterestPaid", label: "Total Interest Paid", format: "currency" },
      { key: "interestSavedVsBaseline", label: "Interest Saved vs. Baseline", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your loan amount, interest rate, term, the one-time lump-sum amount you plan to apply toward " +
      "principal, and which month you'll make that payment. The result shows your new total payoff time and how " +
      "much interest you'll save compared to sticking with the original schedule.",
    examples: "Example: a $300,000 loan at 6.5% over 30 years, with a one-time $20,000 lump-sum prepayment applied at month 12, pays off in 302 months instead of 360 — saving $91,623.42 in interest.",
    assumptions:
      "This assumes your regular monthly payment amount stays the same after the lump sum is applied (shortening " +
      "the loan) rather than being recalculated to a lower payment over the original term — confirm with your " +
      "servicer which approach they apply by default, since some offer a choice. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I shorten my loan term or lower my payment after a lump sum?",
        answer: "This calculator assumes you keep making the same payment amount, which shortens your loan term and maximizes interest savings. Some servicers instead offer to recalculate a lower monthly payment over the original remaining term — that option saves less interest overall but reduces your required monthly payment, which may matter more if cash flow is a concern.",
      },
      {
        question: "Is there a prepayment penalty on mortgages?",
        answer: "Most conventional mortgages originated in recent years don't carry prepayment penalties, but some loan types or older loans might — check your loan documents or ask your servicer before making a large lump-sum payment.",
      },
    ],
  },
  {
    slug: "biweekly-mortgage-payment-calculator",
    title: "Biweekly Mortgage Payment Calculator",
    description: "See the time and interest saved by paying half your mortgage payment every two weeks instead of once a month.",
    metaTitle: "Biweekly Mortgage Payment Calculator — Free & Instant",
    metaDescription: "Free biweekly mortgage payment calculator. See how switching to biweekly payments shortens your loan and saves interest.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 100000000, step: 1000 }),
      percentField("annualInterestRate", "Annual Interest Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Interest Saved", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Standard Monthly Payment", format: "currency" },
      { key: "biweeklyPayment", label: "Biweekly Payment (Half of Monthly)", format: "currency" },
      { key: "yearsToPayoff", label: "New Payoff Time (Years)", format: "number" },
      { key: "interestSaved", label: "Total Interest Saved", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your loan amount, interest rate, and term. The result shows what your payment would be if split in " +
      "half and paid every two weeks (26 half-payments per year — one more full payment per year than a standard " +
      "monthly schedule), along with the resulting payoff time and interest savings.",
    examples: "Example: a $300,000 loan at 6.5% over 30 years pays off in about 24.17 years on a biweekly schedule instead of 30 — saving $87,256.29 in interest.",
    assumptions:
      "This models the standard biweekly-payment effect (equivalent to one extra monthly payment per year) as an " +
      "accelerated monthly schedule — the actual savings depend on your specific servicer's biweekly program " +
      "structure. Some servicers charge a setup or ongoing fee for biweekly programs, or simply hold payments " +
      "until a full month's worth accumulates (which doesn't accelerate payoff at all) — confirm your servicer's " +
      "exact program details, or consider making one extra payment yourself once a year to get the same effect " +
      "without a third-party program. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does paying biweekly save money?",
        answer: "Because there are 26 two-week periods in a year, paying half your monthly payment every two weeks results in the equivalent of 13 full monthly payments per year instead of 12 — that extra payment goes entirely toward principal, accelerating payoff and reducing total interest.",
      },
      {
        question: "Should I use my bank's official biweekly payment program?",
        answer: "Some banks charge setup or transaction fees for formal biweekly programs, and some simply hold your biweekly payments until a full month accumulates (providing no acceleration at all). You can often achieve the identical result for free by simply making one extra full payment yourself once a year, or dividing that extra amount across your 12 regular payments — check your servicer's specific program before signing up.",
      },
    ],
  },
  {
    slug: "15-year-vs-30-year-mortgage-calculator",
    title: "15-Year vs 30-Year Mortgage Calculator",
    description: "Compare monthly payments and lifetime interest between a 15-year and a 30-year mortgage at their own market rates.",
    metaTitle: "15-Year vs 30-Year Mortgage Calculator — Free & Instant",
    metaDescription: "Free 15-year vs 30-year mortgage calculator. Compare monthly payment and total interest between the two most common loan terms.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 100000000, step: 1000 }),
      percentField("rate15Year", "15-Year Interest Rate", { default: 5.75, max: 20, step: 0.05 }),
      percentField("rate30Year", "30-Year Interest Rate", { default: 6.5, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "Lifetime Interest Savings With 15-Year", format: "currency" },
    calcResults: [
      { key: "payment15Year", label: "15-Year Monthly Payment", format: "currency" },
      { key: "payment30Year", label: "30-Year Monthly Payment", format: "currency" },
      { key: "monthlyDifference", label: "Monthly Payment Difference", format: "currency" },
      { key: "lifetimeInterestSavingsWith15", label: "Lifetime Interest Savings With 15-Year", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your loan amount and the interest rate quoted for each term (15-year mortgages typically carry a " +
      "lower rate than 30-year, since lenders take on less risk over a shorter period — get both quotes from " +
      "your lender). The result compares monthly payment and total lifetime interest for each option.",
    examples: "Example: a $300,000 loan at 5.75% over 15 years has a $2,491.23 monthly payment, versus $1,896.20 at 6.5% over 30 years — a $595.03 higher monthly payment for the 15-year option, but $234,212.02 less in lifetime interest.",
    assumptions:
      "This compares the two options as quoted — actual rates for each term vary by lender and market conditions " +
      "at the time you apply. The 15-year option requires a meaningfully higher monthly payment in exchange for " +
      "large interest savings and faster equity building; the right choice depends on your budget and " +
      "priorities, not just the numbers. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the 15-year rate usually lower than the 30-year rate?",
        answer: "Lenders generally offer a lower rate on shorter-term loans because they carry less long-term interest-rate risk for the lender, and borrowers pay down the balance faster — both years-based comparisons (15-year and 30-year) are compared here at their own separately quoted market rates rather than assuming a fixed spread.",
      },
      {
        question: "Should I always choose 15 years over 30 if I can afford the payment?",
        answer: "Not necessarily — a 30-year loan gives you more monthly cash-flow flexibility, and you can voluntarily pay extra toward a 30-year loan (see the Extra Mortgage Payment Calculator) to capture much of the same interest savings while keeping the lower required payment as a safety net.",
      },
    ],
  },
  {
    slug: "mortgage-term-comparison-calculator",
    title: "Mortgage Term Comparison Calculator",
    description: "Compare monthly payment and total interest between any two loan terms you choose, at the same interest rate.",
    metaTitle: "Mortgage Term Comparison Calculator — Free & Instant",
    metaDescription: "Free mortgage term comparison calculator. Compare any two loan terms (like 20 vs 30 years) at the same interest rate.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 100000000, step: 1000 }),
      percentField("annualInterestRate", "Annual Interest Rate (Same For Both)", { default: 6.5, max: 20, step: 0.05 }),
      numberField("termAYears", "Term A (Years)", { default: 20, min: 1, max: 40, step: 1 }),
      numberField("termBYears", "Term B (Years)", { default: 30, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Interest Difference", format: "currency" },
    calcResults: [
      { key: "paymentA", label: "Term A Monthly Payment", format: "currency" },
      { key: "paymentB", label: "Term B Monthly Payment", format: "currency" },
      { key: "monthlyDifference", label: "Monthly Payment Difference", format: "currency" },
      { key: "interestDifference", label: "Lifetime Interest Difference", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your loan amount, a single interest rate to apply to both, and any two loan terms you want to " +
      "compare (not limited to the common 15-vs-30 pairing — try 10, 20, or 25 years too). The result isolates " +
      "the pure effect of loan length on payment and lifetime interest, holding the rate constant.",
    examples: "Example: a $300,000 loan at 6.5% has a $2,236.72 monthly payment over 20 years versus $1,896.20 over 30 years — a $340.52 difference, with $145,820.81 less lifetime interest on the 20-year term.",
    assumptions:
      "This uses the SAME interest rate for both terms, isolating the effect of term length alone — in reality, " +
      "different loan terms are often priced with different rates by lenders (shorter terms typically get lower " +
      "rates). If you have separate rate quotes for each term, use the 15-Year vs 30-Year Mortgage Calculator " +
      "instead, which takes two independent rate inputs. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the 15-Year vs 30-Year Mortgage Calculator?",
        answer: "The 15-Year vs 30-Year Mortgage Calculator is scoped specifically to that common pairing and takes a separate interest rate for each term (reflecting how lenders usually price them differently). This tool lets you compare ANY two terms you choose, using a single shared rate — useful for isolating the pure effect of term length, or comparing less common pairings like 10 vs 20 years.",
      },
      {
        question: "Why would I choose a term other than 15 or 30 years?",
        answer: "Some lenders offer terms like 10, 20, or 25 years, which can be a middle-ground choice — a meaningfully lower total interest than 30 years without the much higher monthly payment jump of a full 15-year term.",
      },
    ],
  },
  {
    slug: "fixed-rate-mortgage-calculator",
    title: "Fixed-Rate Mortgage Calculator",
    description: "Calculate your fixed-rate mortgage payment and see how front-loaded your interest is in the first 5 years.",
    metaTitle: "Fixed-Rate Mortgage Calculator — Free & Instant",
    metaDescription: "Free fixed-rate mortgage calculator. See your monthly payment and how much of your lifetime interest is paid in just the first 5 years.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 100000000, step: 1000 }),
      percentField("annualInterestRate", "Fixed Annual Interest Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment (Fixed For Entire Term)", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Lifetime Interest", format: "currency" },
      { key: "interestPaidFirst5Years", label: "Interest Paid In First 5 Years", format: "currency" },
      { key: "percentOfTotalInterestFirst5Years", label: "% of Lifetime Interest Paid In First 5 Years", format: "percentage" },
    ],
    instructions:
      "Enter your loan amount, fixed interest rate, and term. Beyond the basic monthly payment, this tool " +
      "highlights how front-loaded interest is on a fixed-rate loan — showing exactly how much interest you'll " +
      "pay in just the first 5 years and what share of your LIFETIME interest that represents.",
    examples: "Example: a $300,000 loan at 6.5% over 30 years has a $1,896.20 monthly payment that never changes — but $94,605.18 of your total $382,633.47 in lifetime interest (about 24.72%) is paid in just the first 5 years.",
    assumptions:
      "On a fixed-rate loan, your rate and payment never change for the entire term — this tool's front-loaded " +
      "interest breakdown illustrates why paying down a mortgage early (via extra payments) is most impactful " +
      "in the early years, when the largest share of each payment is still interest. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is so much interest paid in just the first 5 years?",
        answer: "Interest accrues on your outstanding balance, which is at its highest in the early years of the loan — as you pay down principal over time, less interest accrues each month, so a fixed-rate loan naturally front-loads interest into its early years even though your payment amount never changes.",
      },
      {
        question: "Does a fixed rate mean my total housing payment never changes?",
        answer: "No — your principal & interest payment is fixed for the life of the loan, but your TOTAL housing payment can still change if it includes property taxes or homeowners insurance (which can rise over time) escrowed into your payment, or PMI that later drops off. See the Mortgage Payment Calculator under Real Estate Calculators for a full PITI breakdown.",
      },
    ],
  },
  {
    slug: "adjustable-rate-mortgage-arm-calculator",
    title: "Adjustable-Rate Mortgage (ARM) Calculator",
    description: "Estimate your ARM's initial payment and how it changes after the introductory fixed-rate period ends.",
    metaTitle: "ARM Calculator — Free & Instant",
    metaDescription: "Free adjustable-rate mortgage (ARM) calculator. Estimate your initial payment and how it changes when the rate resets.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 100000000, step: 1000 }),
      percentField("initialRatePercent", "Initial (Introductory) Rate", { default: 5.5, max: 20, step: 0.05 }),
      numberField("initialFixedPeriodYears", "Initial Fixed Period (Years)", { default: 5, min: 1, max: 10, step: 1 }),
      numberField("loanTermYears", "Total Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      percentField("expectedRateAfterAdjustment", "Your Estimated Rate After Adjustment", { default: 7, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "New Monthly Payment After Reset", format: "currency" },
    calcResults: [
      { key: "initialMonthlyPayment", label: "Initial Monthly Payment", format: "currency" },
      { key: "balanceAtRateReset", label: "Remaining Balance At Rate Reset", format: "currency" },
      { key: "newMonthlyPaymentAfterReset", label: "New Monthly Payment After Reset", format: "currency", highlight: true },
      { key: "monthlyPaymentChange", label: "Payment Change At Reset", format: "currency" },
    ],
    instructions:
      "Enter your loan amount, the introductory rate and how many years it lasts (e.g. a 5/1 ARM has a 5-year " +
      "initial period), your total loan term, and your own estimate of what the rate will adjust to afterward " +
      "(this site doesn't pull live rate index data, so use a conservative estimate from current market trends " +
      "or your loan's rate caps). The result shows your initial payment, the balance remaining when the rate " +
      "resets, and your new estimated payment afterward.",
    examples: "Example: a $300,000 ARM with a 5.5% initial rate for 5 years, over a 30-year term, resetting to an estimated 7%, has a $1,703.37 initial payment rising to $1,960.48 after the reset — a $257.11 increase.",
    assumptions:
      "The rate after adjustment is YOUR OWN ESTIMATE, not a live index projection — actual ARM resets are tied " +
      "to a published rate index plus a margin, subject to rate caps that limit how much the rate can change at " +
      "each adjustment and over the loan's life. Check your specific ARM's index, margin, and cap structure " +
      "(initial cap, periodic cap, lifetime cap) for a more precise picture. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What does \"5/1 ARM\" mean?",
        answer: "The first number is the initial fixed-rate period in years (5, in this example), and the second number is how often the rate can adjust afterward, in years (every 1 year, here). So a 5/1 ARM has a fixed rate for 5 years, then can adjust annually after that.",
      },
      {
        question: "What are rate caps on an ARM?",
        answer: "Most ARMs have caps limiting how much the rate can increase at the first adjustment, at each subsequent adjustment, and over the life of the loan — these caps limit your worst-case payment shock, so check your specific loan's cap structure rather than assuming an unlimited rate increase is possible.",
      },
    ],
  },
  {
    slug: "fixed-rate-vs-arm-calculator",
    title: "Fixed-Rate vs ARM Calculator",
    description: "Compare the total cost of a fixed-rate mortgage against an ARM over the specific number of years you plan to keep the loan.",
    metaTitle: "Fixed-Rate vs ARM Calculator — Free & Instant",
    metaDescription: "Free fixed-rate vs ARM calculator. Compare total cost of a fixed mortgage against an adjustable-rate mortgage over your planned horizon.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 100000000, step: 1000 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      percentField("fixedRatePercent", "Fixed-Rate Mortgage Rate", { default: 6.5, max: 20, step: 0.05 }),
      percentField("armInitialRatePercent", "ARM Initial Rate", { default: 5.5, max: 20, step: 0.05 }),
      numberField("armInitialFixedPeriodYears", "ARM Initial Fixed Period (Years)", { default: 5, min: 1, max: 10, step: 1 }),
      percentField("armExpectedRateAfterAdjustment", "ARM Estimated Rate After Adjustment", { default: 7, max: 20, step: 0.05 }),
      numberField("comparisonHorizonYears", "Your Planned Years In This Loan", { default: 7, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Net Difference (Positive = ARM Cheaper)", format: "currency" },
    calcResults: [
      { key: "totalCostFixed", label: "Total Cost — Fixed-Rate (Over Horizon)", format: "currency" },
      { key: "totalCostArm", label: "Total Cost — ARM (Over Horizon)", format: "currency" },
      { key: "netDifference", label: "Net Difference (Positive = ARM Cheaper)", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your loan amount and term, the fixed-rate option's rate, the ARM's initial rate and fixed period, " +
      "your own estimate of the ARM's rate after adjustment, and how many years you actually plan to keep this " +
      "loan. The result compares TOTAL cost between the two options over exactly that horizon — not the full " +
      "loan term — since many borrowers sell or refinance well before then.",
    examples: "Example: a $300,000, 30-year loan comparing a 6.5% fixed rate against a 5.5% ARM (5-year initial period, estimated 7% after reset), over a 7-year planned horizon, shows the ARM costing about $10,027.68 less over that period.",
    assumptions:
      "This compares total payments only, not risk — an ARM's payment could rise MORE than your estimate after " +
      "reset (up to its rate caps), which this tool doesn't stress-test. A fixed rate carries payment certainty " +
      "an ARM doesn't, which has its own value beyond the numbers shown here. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does my planned time in the loan matter so much?",
        answer: "An ARM's lower initial rate saves money during its fixed period, but if you keep it long past the reset and rates rise as estimated, that advantage can shrink or reverse. Comparing total cost over your ACTUAL planned horizon (rather than the full term) gives a more realistic picture than either extreme.",
      },
      {
        question: "What if the ARM rate after adjustment ends up different from my estimate?",
        answer: "This tool uses your own estimate since no live rate index is pulled — try running the comparison again with a higher or lower estimated reset rate to see how sensitive the result is to that assumption, especially if your planned horizon extends past the ARM's initial fixed period.",
      },
    ],
  },
  {
    slug: "interest-only-mortgage-calculator",
    title: "Interest-Only Mortgage Calculator",
    description: "Calculate your payment during an interest-only period and how much it jumps once the loan begins amortizing.",
    metaTitle: "Interest-Only Mortgage Calculator — Free & Instant",
    metaDescription: "Free interest-only mortgage calculator. See your interest-only payment and how much higher it becomes once principal payments begin.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 100000000, step: 1000 }),
      percentField("annualInterestRate", "Annual Interest Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("interestOnlyPeriodYears", "Interest-Only Period (Years)", { default: 10, min: 1, max: 15, step: 1 }),
      numberField("loanTermYears", "Total Loan Term (Years)", { default: 30, min: 2, max: 40, step: 1 }),
    ],
    calcResult: { label: "Payment After Interest-Only Period", format: "currency" },
    calcResults: [
      { key: "monthlyPaymentDuringIO", label: "Monthly Payment During Interest-Only Period", format: "currency" },
      { key: "monthlyPaymentAfterIO", label: "Monthly Payment After Interest-Only Period", format: "currency", highlight: true },
      { key: "paymentIncreaseAmount", label: "Payment Increase At End of Interest-Only Period", format: "currency" },
    ],
    instructions:
      "Enter your loan amount, interest rate, how many years the interest-only period lasts, and your total loan " +
      "term. During the interest-only period, your payment covers interest only — the balance doesn't decrease. " +
      "The result shows that payment, and your new (higher) payment once the loan switches to fully amortizing " +
      "over the remaining term.",
    examples: "Example: a $300,000 loan at 6.5% with a 10-year interest-only period on a 30-year total term has a $1,625.00 interest-only payment, jumping to $2,236.72 once amortization begins — a $611.72 increase.",
    assumptions:
      "This assumes the loan balance stays exactly at the original amount throughout the interest-only period " +
      "(since no principal is paid down) and then fully amortizes over the remaining term at the same rate. Real " +
      "interest-only loans sometimes have a rate that can adjust, which would change the payment further — check " +
      "your specific loan terms. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why would someone choose an interest-only mortgage?",
        answer: "Interest-only loans offer a lower initial payment, which can appeal to borrowers expecting rising income, planning to sell or refinance before the interest-only period ends, or wanting to invest the payment difference elsewhere — but they build no equity through payments during that period and face a significant payment jump afterward.",
      },
      {
        question: "What happens to my balance during the interest-only period?",
        answer: "It stays exactly the same — none of your payment goes toward principal, so you build equity only through market appreciation (if any) during that period, not through paying down the loan.",
      },
    ],
  },
  {
    slug: "balloon-mortgage-calculator",
    title: "Balloon Mortgage Calculator",
    description: "Calculate your monthly payment and the lump-sum balloon payment due at the end of a balloon mortgage's term.",
    metaTitle: "Balloon Mortgage Calculator — Free & Instant",
    metaDescription: "Free balloon mortgage calculator. See your low monthly payment and the large balloon payment due when the loan term ends.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 100000000, step: 1000 }),
      percentField("annualInterestRate", "Annual Interest Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("amortizationYears", "Amortization Schedule (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      numberField("balloonDueYears", "Balloon Due (Years)", { default: 7, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "Balloon Payment Due", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "balloonPaymentDue", label: "Balloon Payment Due", format: "currency", highlight: true },
      { key: "totalPaidBeforeBalloon", label: "Total Regular Payments Before Balloon", format: "currency" },
    ],
    instructions:
      "Enter your loan amount, interest rate, the long amortization schedule used to compute your (lower) " +
      "monthly payment, and the shorter number of years until the full remaining balance becomes due in one " +
      "lump sum. The result shows your monthly payment and exactly how large that final balloon payment will " +
      "be.",
    examples: "Example: a $300,000 loan at 6.5% amortized over 30 years, with the balance due in full after 7 years, has a $1,896.20 monthly payment — and a $271,248.73 balloon payment due at year 7.",
    assumptions:
      "A balloon mortgage uses a long amortization schedule to keep the monthly payment low, but requires the " +
      "entire remaining balance to be paid off (typically through refinancing or sale) at the balloon date — " +
      "make sure you have a concrete plan for that payment well before it comes due, since failing to refinance " +
      "or sell in time can put you at risk of default. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens if I can't pay the balloon payment?",
        answer: "You'd typically need to refinance into a new loan or sell the property before the balloon date — if neither is possible when the balance comes due, you risk default, so balloon loans are generally suited only to borrowers with a clear, concrete exit plan (like a planned sale or expected refinance) well before the due date.",
      },
      {
        question: "Why would someone choose a balloon mortgage?",
        answer: "The long amortization schedule keeps monthly payments lower than a fully amortizing loan of the same shorter length — this can appeal to borrowers who expect to sell, refinance, or have a large sum available before the balloon date, but it carries real risk if those plans don't materialize.",
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
