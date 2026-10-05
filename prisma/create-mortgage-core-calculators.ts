// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Mortgage Calculators" sub-batch A (Core Basics). Part of the
// Mortgage_Topical_Map_Large_Tool_List.xlsx build-out (36 tools total,
// split into 3 sub-batches — see create-mortgage-payment-strategies-
// calculators.ts and create-mortgage-refinance-programs-calculators.ts for
// the other two). Filed under the existing "Mortgage Calculators" category
// (mortgage-calculators), which was created empty by
// reparent-tool-categories-under-finance.ts and is populated here for the
// first time.
//
// See src/lib/calc-engine-mortgage-core.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-mortgage-core-calculators.ts
// or
//   npm run db:create-mortgage-core-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Re-pointed 5 Oct 2026: Mortgage Calculators was split into 5 sub-categories
// (see organize-tool-categories.ts). Each tool is filed in one of them; a
// missing sub-category is created under Mortgage Calculators.
const PARENT_CATEGORY_SLUG = "mortgage-calculators";
const SUBCATEGORY_NAMES: Record<string, string> = {
  "mortgage-payment-type-calculators": "Mortgage Payment & Type Calculators",
  "mortgage-cost-insurance-calculators": "Mortgage Cost & Insurance Calculators",
};
const TOOL_CATEGORY: Record<string, string> = {
  "mortgage-calculator": "mortgage-payment-type-calculators",
  "mortgage-interest-calculator": "mortgage-payment-type-calculators",
  "home-loan-calculator": "mortgage-payment-type-calculators",
  "mortgage-amortization-calculator": "mortgage-payment-type-calculators",
  "mortgage-apr-calculator": "mortgage-cost-insurance-calculators",
  "mortgage-points-calculator": "mortgage-cost-insurance-calculators",
  "mortgage-discount-points-break-even-calculator": "mortgage-cost-insurance-calculators",
  "private-mortgage-insurance-pmi-calculator": "mortgage-cost-insurance-calculators",
  "loan-to-value-ltv-calculator": "mortgage-cost-insurance-calculators",
  "debt-to-income-dti-mortgage-calculator": "mortgage-payment-type-calculators",
  "mortgage-payoff-calculator": "mortgage-payment-type-calculators",
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
    slug: "mortgage-calculator",
    title: "Mortgage Calculator",
    description: "Calculate your basic monthly principal & interest mortgage payment from home price, down payment, rate, and term.",
    metaTitle: "Mortgage Calculator — Free & Instant",
    metaDescription: "Free mortgage calculator. Enter your home price, down payment, interest rate, and loan term to see your monthly payment and total interest.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 400000, max: 100000000, step: 5000 }),
      currencyField("downPaymentAmount", "Down Payment", { default: 80000, max: 100000000, step: 1000 }),
      percentField("annualInterestRate", "Annual Interest Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment (P&I)", format: "currency" },
    calcResults: [
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment (Principal & Interest)", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest Over Loan Term", format: "currency" },
      { key: "totalPaid", label: "Total Paid Over Loan Term", format: "currency" },
    ],
    instructions:
      "Enter the home price, your down payment, the annual interest rate, and the loan term. The result shows " +
      "your basic monthly principal & interest payment — this is a quick estimate that doesn't include property " +
      "taxes, homeowners insurance, or HOA fees (see the Mortgage Payment Calculator in Real Estate Calculators " +
      "for a full PITI breakdown that includes those).",
    examples: "Example: a $400,000 home with an $80,000 down payment, a $320,000 loan at 6.5% over 30 years, has a monthly principal & interest payment of $2,022.62 — $408,142.36 in total interest over the life of the loan.",
    assumptions:
      "This is a fixed-rate, fully amortizing loan calculation showing principal & interest only. Your actual " +
      "monthly housing payment will typically be higher once property taxes, homeowners insurance, PMI (if " +
      "applicable), and HOA dues are added. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why doesn't this include taxes and insurance?",
        answer: "This tool is scoped to the core principal & interest payment only, for a quick rate/term comparison. For a full monthly payment estimate including property taxes, homeowners insurance, and HOA fees, use the Mortgage Payment Calculator under Real Estate Calculators.",
      },
      {
        question: "How does a larger down payment affect my payment?",
        answer: "A larger down payment reduces your loan amount directly, which lowers both your monthly payment and total interest paid — it can also help you avoid PMI if it gets your loan-to-value ratio to 80% or below.",
      },
    ],
  },
  {
    slug: "mortgage-interest-calculator",
    title: "Mortgage Interest Calculator",
    description: "See how much of your mortgage payment goes to interest versus principal, and your total interest over the life of the loan.",
    metaTitle: "Mortgage Interest Calculator — Free & Instant",
    metaDescription: "Free mortgage interest calculator. Enter your loan amount, rate, and term to see your first payment's interest/principal split and total interest.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 320000, max: 100000000, step: 1000 }),
      percentField("annualInterestRate", "Annual Interest Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Total Interest Paid", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment (Principal & Interest)", format: "currency" },
      { key: "firstMonthInterest", label: "Interest Portion of First Payment", format: "currency" },
      { key: "firstMonthPrincipal", label: "Principal Portion of First Payment", format: "currency" },
      { key: "totalInterestPaid", label: "Total Interest Paid Over Loan Term", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your loan amount, interest rate, and term. The result breaks down how much of your very first " +
      "monthly payment goes to interest versus principal (early payments are interest-heavy on an amortizing " +
      "loan), and shows the total interest you'll pay if you keep the loan for its full term.",
    examples: "Example: a $320,000 loan at 6.5% over 30 years has a $2,022.62 monthly payment — $1,733.33 of the first payment is interest and only $289.28 goes to principal, with $408,142.36 in total interest over the full term.",
    assumptions:
      "This assumes a standard fixed-rate, fully amortizing loan with no extra payments. The interest/principal " +
      "split shifts toward principal with every payment as the balance declines — the first payment shown here " +
      "has the highest interest portion of any payment in the loan's life. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is so much of my early payments interest?",
        answer: "Interest is calculated on your current outstanding balance, which is highest at the start of the loan — as you pay down principal, less interest accrues each month and a growing share of your fixed payment goes to principal instead. This is normal for any fixed-rate amortizing loan.",
      },
      {
        question: "How can I pay less total interest?",
        answer: "Making extra principal payments, choosing a shorter loan term, or securing a lower interest rate (through a better credit profile, larger down payment, or points) all reduce total interest paid — see the Extra Mortgage Payment Calculator and Mortgage Points Calculator for more.",
      },
    ],
  },
  {
    slug: "home-loan-calculator",
    title: "Home Loan Calculator",
    description: "Calculate your home loan payment and total cost including an origination fee, based on the loan amount directly.",
    metaTitle: "Home Loan Calculator — Free & Instant",
    metaDescription: "Free home loan calculator. Enter your loan amount, rate, term, and origination fee to see your payment and total cost.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 250000, max: 100000000, step: 1000 }),
      percentField("annualInterestRate", "Annual Interest Rate", { default: 7, max: 20, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      percentField("originationFeePercent", "Origination Fee (% of Loan)", { default: 1, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCostIncludingFee", label: "Total Cost (Loan + Interest + Fee)", format: "currency" },
    ],
    instructions:
      "Enter your loan amount directly (rather than home price minus down payment), the interest rate, term, " +
      "and the lender's origination fee (a common upfront charge, often 0.5%-1% of the loan amount). The result " +
      "shows your monthly payment and the true total cost of the loan including that fee.",
    examples: "Example: a $250,000 loan at 7% over 30 years with a 1% ($2,500.00) origination fee has a $1,663.26 monthly payment — a total cost of $601,272.25 including interest and the fee.",
    assumptions:
      "This models a single origination fee paid upfront (not financed into the loan balance) — check whether " +
      "your lender rolls fees into the loan amount instead, which would change your effective loan amount and " +
      "payment. Other closing costs (title, appraisal, etc.) aren't included here — see the Closing Cost " +
      "Calculator for those. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is an origination fee?",
        answer: "An origination fee is a charge from your lender for processing the loan, commonly expressed as a percentage of the loan amount (often 0.5%-1%, though it varies by lender). It's typically paid at closing alongside other closing costs.",
      },
      {
        question: "How is this different from the Mortgage Calculator?",
        answer: "The Mortgage Calculator starts from home price minus a down payment. This tool starts from the loan amount directly and adds an origination fee to show the loan's true total cost — useful when you already know your exact loan amount from a lender quote.",
      },
    ],
  },
  {
    slug: "mortgage-amortization-calculator",
    title: "Mortgage Amortization Calculator",
    description: "See how much principal and interest you'll pay in a specific year of your mortgage, and your remaining balance at year-end.",
    metaTitle: "Mortgage Amortization Calculator — Free & Instant",
    metaDescription: "Free mortgage amortization calculator. Enter your loan details and a year number to see that year's principal/interest breakdown and remaining balance.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 100000000, step: 1000 }),
      percentField("annualInterestRate", "Annual Interest Rate", { default: 6, max: 20, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      numberField("yearNumber", "Year Number To Analyze", { default: 1, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Remaining Balance At Year-End", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "principalPaidThisYear", label: "Principal Paid This Year", format: "currency" },
      { key: "interestPaidThisYear", label: "Interest Paid This Year", format: "currency" },
      { key: "remainingBalanceEnd", label: "Remaining Balance At Year-End", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your loan amount, interest rate, term, and the specific year of the loan you want to analyze (year " +
      "1 is your first 12 payments). The result shows how much of that year's payments went to principal versus " +
      "interest, and your remaining balance at the end of that year.",
    examples: "Example: a $300,000 loan at 6% over 30 years pays $3,684.04 in principal and $17,899.78 in interest during year 1 — leaving a $296,315.96 remaining balance at the end of that year.",
    assumptions:
      "This assumes a standard fixed-rate, fully amortizing loan with no extra payments and no missed payments. " +
      "Requesting a year number beyond the loan term returns the balance at full payoff (zero). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does the principal paid increase in later years?",
        answer: "Because your monthly payment is fixed but the interest portion shrinks as your balance declines, a growing share of each fixed payment goes to principal in later years — this is standard for any fixed-rate amortizing loan.",
      },
      {
        question: "Can I see a month-by-month breakdown instead of a full year?",
        answer: "This tool summarizes a full year at a time. For your lender's official month-by-month amortization schedule, check your loan servicer's online portal, which typically provides a complete payment-by-payment table.",
      },
    ],
  },
  {
    slug: "mortgage-apr-calculator",
    title: "Mortgage APR Calculator",
    description: "Calculate the effective Annual Percentage Rate (APR) of a mortgage after accounting for points and fees.",
    metaTitle: "Mortgage APR Calculator — Free & Instant",
    metaDescription: "Free mortgage APR calculator. Enter your note rate, points, and fees to see the effective APR that accounts for upfront loan costs.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 100000000, step: 1000 }),
      percentField("noteRatePercent", "Note (Interest) Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      percentField("pointsPercent", "Discount Points (% of Loan)", { default: 1, max: 10, step: 0.1 }),
      currencyField("otherFees", "Other Upfront Fees", { default: 1500, max: 1000000, step: 50 }),
    ],
    calcResult: { label: "Effective APR", format: "percentage" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment (Based On Note Rate)", format: "currency" },
      { key: "netProceeds", label: "Net Loan Proceeds (After Points & Fees)", format: "currency" },
      { key: "aprPercent", label: "Effective APR", format: "percentage", highlight: true },
    ],
    instructions:
      "Enter your loan amount, note (interest) rate, term, points, and other upfront fees. The result calculates " +
      "the effective APR — a rate that reflects your actual borrowing cost once points and fees are factored in, " +
      "always equal to or higher than the note rate. This mirrors the standard methodology used on U.S. " +
      "Truth-in-Lending disclosures.",
    examples: "Example: a $300,000 loan at a 6.5% note rate with 1 point and $1,500 in other fees has an effective APR of 6.6459% — higher than the 6.5% note rate because of the upfront costs.",
    assumptions:
      "APR calculates the rate that would produce your actual monthly payment if it were applied to your net " +
      "loan proceeds (loan amount minus points and fees) instead of the full loan amount — since there's no " +
      "closed-form formula for this, the result is found through iterative approximation and should match your " +
      "lender's disclosed APR closely, though exact methodology can vary slightly by lender. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between the note rate and APR?",
        answer: "The note rate is used to calculate your actual monthly payment. APR is a broader measure that also factors in points and certain other upfront fees, expressing your total borrowing cost as an equivalent annual rate — which is why APR is normally higher than the note rate, and useful for comparing loan offers with different fee structures.",
      },
      {
        question: "Why might two loans have the same note rate but different APRs?",
        answer: "Because APR accounts for points and fees, not just the note rate — a loan with more points or higher upfront fees will show a higher APR than an otherwise identical loan with fewer fees, even though both have the same monthly payment based on the note rate.",
      },
    ],
  },
  {
    slug: "mortgage-points-calculator",
    title: "Mortgage Points Calculator",
    description: "Calculate the cost of buying mortgage discount points, your new payment, and how many months until they pay for themselves.",
    metaTitle: "Mortgage Points Calculator — Free & Instant",
    metaDescription: "Free mortgage points calculator. Compare your rate with and without points to see the cost, monthly savings, and break-even point.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 100000000, step: 1000 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      percentField("rateWithoutPoints", "Interest Rate Without Points", { default: 7, max: 20, step: 0.05 }),
      percentField("rateWithPoints", "Interest Rate With Points", { default: 6.5, max: 20, step: 0.05 }),
      numberField("pointsPurchased", "Points Purchased", { default: 2, min: 0, max: 10, step: 0.125 }),
    ],
    calcResult: { label: "Break-Even Months", format: "number" },
    calcResults: [
      { key: "pointsCost", label: "Cost of Points", format: "currency" },
      { key: "paymentWithoutPoints", label: "Payment Without Points", format: "currency" },
      { key: "paymentWithPoints", label: "Payment With Points", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "breakEvenMonths", label: "Break-Even (Months)", format: "number", highlight: true },
      { key: "totalSavingsFullTerm", label: "Total Savings If Held Full Term", format: "currency" },
    ],
    instructions:
      "Enter your loan amount and term, plus the interest rate your lender quotes without points and the lower " +
      "rate you'd get by buying points (each point typically costs 1% of the loan amount). The result shows the " +
      "cost of the points, your new payment and monthly savings, how many months until the points pay for " +
      "themselves, and your total savings if you keep the loan for its full term.",
    examples: "Example: on a $300,000 loan over 30 years, buying 2 points to go from 7.0% to 6.5% costs $6,000.00 and saves $99.70/month — a 61-month break-even, with $29,893.23 in total savings if held for the full 30-year term.",
    assumptions:
      "This compares the two rates as quoted — actual point pricing and the exact rate reduction per point vary " +
      "by lender and market conditions. Buying points is generally worth it only if you plan to keep the loan " +
      "past the break-even point shown — see the Mortgage Discount Points Break-Even Calculator if you have a " +
      "specific number of years in mind rather than the full term. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is a mortgage point?",
        answer: "A discount point is an upfront fee, typically 1% of your loan amount, paid to your lender in exchange for a lower interest rate — how much the rate drops per point varies by lender and market conditions, so get an exact quote rather than assuming a fixed reduction.",
      },
      {
        question: "Should I buy points?",
        answer: "It depends mainly on how long you plan to keep the loan — buying points generally makes sense if you'll keep the loan well past the break-even month count shown here, and makes less sense if you might sell or refinance sooner.",
      },
    ],
  },
  {
    slug: "mortgage-discount-points-break-even-calculator",
    title: "Mortgage Discount Points Break-Even Calculator",
    description: "See whether buying mortgage points is a net win or net loss for the specific number of years you plan to keep the loan.",
    metaTitle: "Mortgage Discount Points Break-Even Calculator — Free & Instant",
    metaDescription: "Free mortgage discount points break-even calculator. Compare total cost with and without points over your planned years in the home.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 300000, max: 100000000, step: 1000 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
      percentField("rateWithoutPoints", "Interest Rate Without Points", { default: 7, max: 20, step: 0.05 }),
      percentField("rateWithPoints", "Interest Rate With Points", { default: 6.5, max: 20, step: 0.05 }),
      currencyField("pointsCostDollar", "Cost of Points (Dollar Amount)", { default: 6000, max: 1000000, step: 100 }),
      numberField("plannedYearsInHome", "Planned Years In This Home/Loan", { default: 5, min: 0.5, max: 40, step: 0.5 }),
    ],
    calcResult: { label: "Net Savings Over Your Planned Horizon", format: "currency" },
    calcResults: [
      { key: "netSavingsOverHorizon", label: "Net Savings Over Your Planned Horizon", format: "currency", highlight: true },
      { key: "breakEvenMonths", label: "Break-Even (Months)", format: "number" },
      { key: "totalCostWithoutPoints", label: "Total Cost Without Points (Over Horizon)", format: "currency" },
      { key: "totalCostWithPoints", label: "Total Cost With Points (Over Horizon)", format: "currency" },
    ],
    instructions:
      "Enter your loan amount, term, the rate with and without points, the dollar cost of the points (from your " +
      "lender's quote), and how many years you actually plan to keep this loan (not necessarily the full term — " +
      "many people sell or refinance sooner). The result compares your total cost with and without points over " +
      "exactly that horizon, showing whether points are a net win or net loss for your specific plans.",
    examples: "Example: on a $300,000 loan over 30 years, buying points for $6,000 to go from 7.0% to 6.5%, planning to keep the loan just 5 years, results in a net loss of about $17.80 over that horizon — the break-even point (61 months) falls just past the 5-year mark, making it a virtual wash.",
    assumptions:
      "Unlike a generic break-even month count, this tool directly compares total cost over your own stated " +
      "horizon — if your planned years in the home fall short of the break-even point, buying points shows as a " +
      "net loss even though it would eventually pay off if you kept the loan longer. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the Mortgage Points Calculator?",
        answer: "The Mortgage Points Calculator shows a generic break-even month count and total savings if held to the full loan term. This tool instead asks how long you actually plan to keep the loan and directly compares total cost with vs. without points over that specific horizon — a more decision-relevant answer if you don't expect to keep the loan for its full term.",
      },
      {
        question: "What if my result is negative?",
        answer: "A negative net savings means buying points would cost you more than it saves over your planned horizon — in that case, keeping the higher rate (and not paying for points) is likely the better financial choice for your specific timeline.",
      },
    ],
  },
  {
    slug: "private-mortgage-insurance-pmi-calculator",
    title: "Private Mortgage Insurance (PMI) Calculator",
    description: "Estimate your monthly PMI cost and roughly how long until you can request its removal based on your loan-to-value ratio.",
    metaTitle: "PMI Calculator — Free & Instant",
    metaDescription: "Free PMI (Private Mortgage Insurance) calculator. Enter your home price, loan amount, and PMI rate to see your monthly cost and removal timeline.",
    calcInputs: [
      currencyField("homePrice", "Home Price / Appraised Value", { default: 400000, max: 100000000, step: 5000 }),
      currencyField("loanAmount", "Loan Amount", { default: 380000, max: 100000000, step: 1000 }),
      percentField("pmiRatePercent", "Annual PMI Rate", { default: 0.75, max: 5, step: 0.05 }),
      percentField("annualInterestRate", "Annual Interest Rate (for removal estimate)", { default: 6.5, max: 20, step: 0.05 }),
      numberField("loanTermYears", "Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Monthly PMI Cost", format: "currency" },
    calcResults: [
      { key: "ltvPercent", label: "Loan-to-Value (LTV) Ratio", format: "percentage" },
      { key: "monthlyPmi", label: "Monthly PMI Cost", format: "currency", highlight: true },
      { key: "annualPmi", label: "Annual PMI Cost", format: "currency" },
      { key: "monthsUntilPmiRemoval", label: "Estimated Months Until 78% LTV (PMI Removal Eligibility)", format: "number" },
    ],
    instructions:
      "Enter your home price, loan amount, your lender's annual PMI rate (check your loan estimate or closing " +
      "disclosure), and your interest rate and term (used to estimate when your balance reaches 78% of the " +
      "original home value). The result shows your monthly and annual PMI cost, and roughly how many months " +
      "until you're scheduled to reach 78% LTV, the point at which lenders are generally required to " +
      "automatically remove PMI on a standard amortization schedule.",
    examples: "Example: a $400,000 home with a $380,000 loan (95% LTV) and a 0.75% annual PMI rate costs $237.50/month — with PMI eligible for automatic removal in about 135 months (roughly 11.25 years) at 6.5% interest.",
    assumptions:
      "This estimates automatic PMI termination based on the ORIGINAL amortization schedule reaching 78% of the " +
      "original property value — you can often request PMI removal earlier (typically at 80% LTV) by asking " +
      "your servicer, especially if your home has appreciated or you've made extra principal payments, which " +
      "isn't modeled in this baseline estimate. PMI requirements and rates vary by loan type and lender. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When can I get PMI removed?",
        answer: "By federal law (the Homeowners Protection Act), lenders must generally automatically terminate PMI once your balance is scheduled to reach 78% of the original property value. You can typically REQUEST removal earlier once you reach 80% LTV, especially if you've made extra payments or your home has appreciated — contact your loan servicer to ask.",
      },
      {
        question: "How can I avoid PMI in the first place?",
        answer: "PMI is typically required whenever your down payment is below 20% (LTV above 80%) on a conventional loan. Making a 20%+ down payment avoids it entirely, though some loan programs (like VA loans) don't require PMI regardless of down payment — see the VA Loan Calculator.",
      },
    ],
  },
  {
    slug: "loan-to-value-ltv-calculator",
    title: "Loan-to-Value (LTV) Calculator",
    description: "Calculate your loan-to-value ratio and see whether PMI is likely required based on your loan amount and property value.",
    metaTitle: "Loan-to-Value (LTV) Calculator — Free & Instant",
    metaDescription: "Free loan-to-value (LTV) calculator. Enter your loan amount and appraised value to see your LTV ratio and implied down payment.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 380000, max: 100000000, step: 1000 }),
      currencyField("appraisedValue", "Appraised / Home Value", { default: 400000, max: 100000000, step: 1000 }),
    ],
    calcResult: { label: "Loan-to-Value Ratio", format: "percentage" },
    calcResults: [
      { key: "ltvPercent", label: "Loan-to-Value (LTV) Ratio", format: "percentage", highlight: true },
      { key: "impliedDownPaymentPercent", label: "Implied Down Payment / Equity %", format: "percentage" },
      { key: "pmiLikelyRequired", label: "PMI Likely Required (1 = Yes, 0 = No)", format: "number" },
    ],
    instructions:
      "Enter your loan amount and the property's appraised or estimated current value. The result shows your " +
      "loan-to-value (LTV) ratio, your implied equity/down payment percentage, and a flag for whether PMI is " +
      "typically required (conventional loans generally require PMI above 80% LTV).",
    examples: "Example: a $380,000 loan on a $400,000 property has a 95% LTV — a 5% implied down payment/equity — meaning PMI would likely be required (above the common 80% threshold).",
    assumptions:
      "80% LTV is the commonly cited threshold for conventional loan PMI requirements — other loan types (FHA, " +
      "VA, USDA) have their own separate mortgage insurance or guarantee fee rules regardless of LTV. This " +
      "calculator uses your property value as entered; a formal appraisal may differ. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What LTV do I need to avoid PMI?",
        answer: "On a conventional loan, an LTV of 80% or below (a down payment or existing equity of 20%+) generally avoids PMI. Refinancing or paying down your balance to reach that threshold can let you request PMI removal even if you originally financed with a lower down payment.",
      },
      {
        question: "Does LTV matter for refinancing too?",
        answer: "Yes — LTV affects refinance eligibility and rate too, not just PMI. A lower LTV (more equity) generally qualifies you for better refinance rates and terms, while a very high LTV may limit which refinance programs are available to you.",
      },
    ],
  },
  {
    slug: "debt-to-income-dti-mortgage-calculator",
    title: "Debt-to-Income (DTI) Mortgage Calculator",
    description: "Calculate your front-end and back-end debt-to-income ratios for mortgage qualification, and your remaining debt capacity.",
    metaTitle: "DTI Mortgage Calculator — Free & Instant",
    metaDescription: "Free debt-to-income (DTI) mortgage calculator. Enter your income, housing payment, and other debts to see your DTI ratios and remaining capacity.",
    calcInputs: [
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 8000, max: 10000000, step: 100 }),
      currencyField("monthlyHousingPayment", "Proposed Monthly Housing Payment (PITI)", { default: 1800, max: 1000000, step: 25 }),
      currencyField("otherMonthlyDebtPayments", "Other Monthly Debt Payments", { default: 500, max: 1000000, step: 25 }),
      percentField("maxBackEndDtiPercent", "Max Back-End DTI Threshold", { default: 43, max: 60, step: 1 }),
    ],
    calcResult: { label: "Back-End DTI Ratio", format: "percentage" },
    calcResults: [
      { key: "frontEndDtiPercent", label: "Front-End DTI Ratio (Housing Only)", format: "percentage" },
      { key: "backEndDtiPercent", label: "Back-End DTI Ratio (Housing + Other Debt)", format: "percentage", highlight: true },
      { key: "maxAdditionalDebtCapacity", label: "Remaining Monthly Debt Capacity at Threshold", format: "currency" },
    ],
    instructions:
      "Enter your gross (pre-tax) monthly income, your proposed total monthly housing payment (principal, " +
      "interest, taxes, and insurance — PITI), your other monthly debt payments (car loans, credit cards, " +
      "student loans, etc.), and the maximum back-end DTI threshold you're targeting (43% is a commonly cited " +
      "qualified-mortgage benchmark, though specific loan programs vary). The result shows your front-end and " +
      "back-end DTI ratios and how much additional monthly debt you could take on before hitting your threshold.",
    examples: "Example: $8,000 gross monthly income with an $1,800 proposed housing payment and $500 in other debt has a 22.5% front-end DTI and a 28.75% back-end DTI — with $1,140.00 of additional monthly debt capacity remaining before hitting a 43% back-end threshold.",
    assumptions:
      "43% back-end DTI is a commonly cited qualified-mortgage guideline, but actual lender requirements vary " +
      "significantly by loan program, credit profile, and compensating factors (reserves, down payment size) — " +
      "some programs allow higher DTI with strong compensating factors, others require lower. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between front-end and back-end DTI?",
        answer: "Front-end DTI counts only your proposed housing payment against your income. Back-end DTI adds in all your other monthly debt obligations too (car loans, credit cards, student loans, etc.) — lenders typically weigh back-end DTI more heavily since it reflects your total debt burden.",
      },
      {
        question: "What DTI do I need to qualify for a mortgage?",
        answer: "It varies by loan program — many conventional loans cap back-end DTI around 45-50% with strong compensating factors, while some government-backed programs (FHA, VA) can be more flexible. A lower DTI generally improves your approval odds and the rate you're offered, regardless of the specific cap.",
      },
    ],
  },
  {
    slug: "mortgage-payoff-calculator",
    title: "Mortgage Payoff Calculator",
    description: "See how many months and years remain to pay off your mortgage at your current balance, rate, and monthly payment.",
    metaTitle: "Mortgage Payoff Calculator — Free & Instant",
    metaDescription: "Free mortgage payoff calculator. Enter your current balance, rate, and monthly payment to see how long until your mortgage is paid off.",
    calcInputs: [
      currencyField("currentBalance", "Current Mortgage Balance", { default: 250000, max: 100000000, step: 1000 }),
      percentField("annualInterestRate", "Annual Interest Rate", { default: 6, max: 20, step: 0.05 }),
      currencyField("monthlyPayment", "Current Monthly Payment (Principal & Interest)", { default: 1800, max: 1000000, step: 25 }),
    ],
    calcResult: { label: "Time Until Payoff", format: "number" },
    calcResults: [
      { key: "monthsToPayoff", label: "Months Until Payoff", format: "number" },
      { key: "yearsToPayoff", label: "Years Until Payoff", format: "number", highlight: true },
      { key: "totalInterestPaid", label: "Remaining Total Interest", format: "currency" },
    ],
    instructions:
      "Enter your current mortgage balance, interest rate, and the fixed monthly payment you're making (whether " +
      "or not it matches your original scheduled payment — enter whatever you're actually paying now, including " +
      "any extra you've been adding). The result shows how many months and years remain until the loan is fully " +
      "paid off at that payment level, and the remaining interest you'll pay.",
    examples: "Example: a $250,000 balance at 6% with an $1,800/month payment pays off in 238 months (19.83 years) — with $177,891.60 in remaining total interest.",
    assumptions:
      "This assumes your monthly payment amount and interest rate stay constant for the remainder of the loan. " +
      "If your entered payment doesn't cover the monthly interest, payoff is never reached — the tool caps its " +
      "projection at 50 years (600 months) in that case. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the Extra Mortgage Payment Calculator?",
        answer: "This tool answers a single-scenario question: given the payment you're actually making right now, how long until it's paid off? The Extra Mortgage Payment Calculator instead compares two scenarios side by side — your baseline schedule versus adding a specific extra amount — to show the time and interest you'd save.",
      },
      {
        question: "What if my result shows the maximum 600 months?",
        answer: "That means your entered monthly payment doesn't fully cover the interest accruing at your rate, so the balance never reaches zero in this simplified model — double-check that your payment amount and rate are entered correctly, since a normal amortizing mortgage payment always covers at least the interest.",
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, filed under the Mortgage Calculators sub-categories.`);
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
