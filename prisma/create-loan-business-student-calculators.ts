// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Loan Calculators" sub-batch E (Business & Student Loans). Part
// of the Loan Calculators tool-list build-out — see
// create-loan-core-calculators.ts for the full batch context. This is the
// last of the 5 sub-batches (54 tools in the source list; 53 built across
// all 5). The one skipped duplicate, business-loan-calculator, already
// existed under Business Finance and has since been moved into Loan
// Calculators (see organize-tool-categories.ts).
//
// See src/lib/calc-engine-loan-business-student.ts for the math and for
// notes on what each business/student tool models beyond the general
// payment formula.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-business-student-calculators.ts
// or
//   npm run db:create-loan-business-student-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Re-pointed 2 Oct 2026: Loan Calculators was split into 5 sub-categories
// (see organize-tool-categories.ts), and these tools now live in
// Loan Calculators > General Loan Calculators.
const CATEGORY_SLUG = "general-loan-calculators";

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
  "This tool provides general estimates for informational purposes only and isn't financial advice. " +
  "Actual rates, fees, and terms depend on the lender and your credit profile — check your loan agreement " +
  "or ask your lender for exact figures.";

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
    slug: "business-loan-payment-calculator",
    title: "Business Loan Payment Calculator",
    description: "Calculate business loan payments on a daily, weekly, every-two-weeks, or monthly schedule, and the funding you receive after fees.",
    metaTitle: "Business Loan Payment Calculator — Daily to Monthly",
    metaDescription: "Free business loan payment calculator. See daily, weekly, biweekly, or monthly payments on a business loan and your net funding after fees.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 100000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 10, max: 60, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 1, max: 360, step: 1 }),
      {
        key: "paymentsPerYear", label: "Repayment Schedule", type: "dropdown", required: true, default: 52,
        options: [
          { label: "Daily (Business Days)", value: 252 },
          { label: "Weekly", value: 52 },
          { label: "Every Two Weeks", value: 26 },
          { label: "Monthly", value: 12 },
        ],
      },
      percentField("originationFeePercent", "Origination Fee", { default: 3, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Payment Per Period", format: "currency" },
    calcResults: [
      { key: "paymentPerPeriod", label: "Payment Each Period", format: "currency", highlight: true },
      { key: "numberOfPayments", label: "Number of Payments", format: "number" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "netFundingReceived", label: "Funding Received After Fee", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, interest rate, term in months, how often the lender collects repayments (many " +
      "online business lenders debit daily or weekly), and any origination fee. The tool shows the payment on " +
      "that schedule, the total interest, and the cash that actually reaches your business account.",
    examples:
      "Example: a $100,000 business loan at 10% over 24 months, repaid weekly, is 104 payments of $1,061.82, with " +
      "$10,428.91 of interest. A 3% origination fee means $97,000 is actually funded.",
    assumptions:
      "Interest is charged each period at the annual rate ÷ payments per year; daily repayment assumes 252 " +
      "business days a year. For a plain monthly payment, the Business Loan Calculator under Business Finance " +
      "also works. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do some business lenders take daily payments?",
        answer: "Frequent automatic debits lower the lender's risk and match businesses with daily card sales. Budget carefully — daily payments can strain cash flow in slow weeks.",
      },
    ],
  },
  {
    slug: "business-loan-interest-calculator",
    title: "Business Loan Interest Calculator",
    description: "Calculate the interest on a business loan and its real cost after the business tax deduction for interest.",
    metaTitle: "Business Loan Interest Calculator — After Tax",
    metaDescription: "Free business loan interest calculator. See total interest, first-year interest, and the after-tax cost of a business loan once interest is deducted.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 150000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 9, max: 60, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 5, min: 1, max: 30, step: 1 }),
      percentField("taxRatePercent", "Business Tax Rate", { default: 21, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "After-Tax Interest Cost", format: "currency" },
    calcResults: [
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "afterTaxInterestCost", label: "After-Tax Interest Cost", format: "currency", highlight: true },
      { key: "firstYearInterest", label: "First-Year Interest", format: "currency" },
      { key: "firstYearTaxSavings", label: "First-Year Tax Savings", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, rate, term, and your business's tax rate (for example, 21% for a US C corporation, " +
      "or your marginal rate for a pass-through business). Business loan interest is generally tax-deductible, so " +
      "the tool shows both the total interest and what it really costs after that deduction.",
    examples:
      "Example: a $150,000 loan at 9% over 5 years ($3,113.75 a month) has $36,825.20 of interest. At a 21% tax " +
      "rate, its after-tax cost is $29,091.91. In the first year, $12,490.54 of interest cuts your tax by about " +
      "$2,623.01.",
    assumptions:
      "Assumes all the interest is deductible at the rate entered. Deduction limits (such as the US business " +
      "interest limitation for larger businesses), losses, and state taxes can change this — ask your " +
      "accountant. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is the whole loan payment tax-deductible?",
        answer: "No. Generally only the interest part is deductible as a business expense; repaying principal isn't. What you buy with the loan may be deductible or depreciable separately.",
      },
    ],
  },
  {
    slug: "business-loan-payoff-calculator",
    title: "Business Loan Payoff Calculator",
    description: "See whether paying off a business loan early saves money under a tiered prepayment penalty (such as 5%/3%/1%), a flat penalty, or none.",
    metaTitle: "Business Loan Payoff Calculator — Prepayment Penalty",
    metaDescription: "Free business loan payoff calculator. Compare the prepayment penalty — tiered 5/3/1, flat, or none — with the interest you'd avoid by paying off early.",
    calcInputs: [
      currencyField("balance", "Current Loan Balance", { default: 80000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 8, max: 60, step: 0.05 }),
      numberField("remainingMonths", "Months Left on the Loan", { default: 60, min: 1, max: 360, step: 1 }),
      numberField("loanAgeYears", "Years Since the Loan Started", { default: 1.5, min: 0, max: 30, step: 0.5 }),
      {
        key: "penaltySchedule", label: "Prepayment Penalty Type", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Tiered: 5% Year 1, 3% Year 2, 1% Year 3", value: 1 },
          { label: "Flat % of Balance", value: 2 },
          { label: "No Penalty", value: 3 },
        ],
      },
      percentField("flatPenaltyPercent", "Flat Penalty (If Chosen Above)", { default: 0, max: 10, step: 0.25 }),
    ],
    calcResult: { label: "Net Savings", format: "currency" },
    calcResults: [
      { key: "penaltyPercent", label: "Penalty Rate That Applies", format: "percentage" },
      { key: "penaltyAmount", label: "Prepayment Penalty", format: "currency" },
      { key: "payoffAmount", label: "Total to Pay Off Now", format: "currency" },
      { key: "interestAvoided", label: "Future Interest Avoided", format: "currency" },
      { key: "netSavings", label: "Net Savings From Paying Off Now", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your balance, rate, months left, and how long ago the loan started, then choose the prepayment " +
      "penalty in your agreement. The tiered option follows the 5%/3%/1% schedule used by SBA 7(a) loans, which " +
      "falls each year and disappears after year 3. The tool compares the penalty with the interest you'd avoid.",
    examples:
      "Example: paying off an $80,000 balance at 8% with 60 months left, 1.5 years into a loan with a 5/3/1 " +
      "penalty, means a 3% penalty ($2,400) — $82,400 in total. It avoids $17,326.69 of interest, a net saving of " +
      "$14,926.69.",
    assumptions:
      "Assumes regular monthly payments for the remaining term. Under actual SBA rules the tiered fee applies " +
      "only to loans of 15 years or more when you prepay 25% or more in a year; other lenders use their own " +
      "terms, so check your agreement. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I wait for the penalty to drop?",
        answer: "Compare the penalty saved by waiting with the interest you'd pay in the meantime. Near a tier change, waiting a few weeks can save more than the extra interest costs.",
      },
    ],
  },
  {
    slug: "business-loan-apr-calculator",
    title: "Business Loan APR Calculator",
    description: "Convert a factor rate on a merchant cash advance or short-term business loan into its true APR.",
    metaTitle: "Business Loan APR Calculator — Factor Rate to APR",
    metaDescription: "Free business loan APR calculator. Convert a factor rate on a short-term business loan or merchant cash advance into its true annual percentage rate.",
    calcInputs: [
      currencyField("advanceAmount", "Amount Funded", { default: 50000, max: 10000000, step: 1000 }),
      numberField("factorRate", "Factor Rate (e.g. 1.3)", { default: 1.3, min: 1, max: 2, step: 0.01 }),
      numberField("termMonths", "Repayment Term (Months)", { default: 9, min: 1, max: 36, step: 1 }),
      {
        key: "paymentsPerYear", label: "Repayment Schedule", type: "dropdown", required: true, default: 252,
        options: [
          { label: "Daily (Business Days)", value: 252 },
          { label: "Weekly", value: 52 },
          { label: "Monthly", value: 12 },
        ],
      },
      percentField("originationFeePercent", "Origination Fee", { default: 2, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "APR", format: "percentage" },
    calcResults: [
      { key: "aprPercent", label: "True APR", format: "percentage", highlight: true },
      { key: "totalRepayment", label: "Total Repayment", format: "currency" },
      { key: "paymentPerPeriod", label: "Payment Each Period", format: "currency" },
      { key: "totalFinancingCost", label: "Total Cost of Financing", format: "currency" },
    ],
    instructions:
      "Enter the amount funded, the factor rate, the repayment term, how often payments are taken, and any " +
      "origination fee. A factor rate sets a flat total to repay (amount × factor), no matter how fast you repay " +
      "it — so a 1.3 factor over 9 months costs far more than 30% a year. The tool converts it into an APR you can " +
      "compare with other loans.",
    examples:
      "Example: $50,000 at a 1.3 factor rate means repaying $65,000 in daily payments of $343.92 over 9 months. " +
      "With a 2% fee, the total cost is $16,000 and the APR is about 78.93%.",
    assumptions:
      "Assumes fixed, equal payments over the term, with the fee deducted from the funding. Merchant cash " +
      "advances repaid as a % of card sales have no fixed term, so their real APR depends on how quickly you " +
      "repay. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the APR so much higher than the factor rate suggests?",
        answer: "The factor is charged on the full amount for the whole term, but you start repaying immediately, so on average you hold much less than the full amount. Paying a flat 30% on a shrinking balance over 9 months works out to a far higher annual rate.",
      },
    ],
  },
  {
    slug: "business-loan-affordability-calculator",
    title: "Business Loan Affordability Calculator",
    description: "Find the largest business loan your cash flow supports, using the debt service coverage ratio (DSCR) lenders require.",
    metaTitle: "Business Loan Affordability Calculator — DSCR",
    metaDescription: "Free business loan affordability calculator. Use your net operating income and a lender's DSCR requirement to find the maximum loan you can take on.",
    calcInputs: [
      currencyField("annualNetOperatingIncome", "Annual Net Operating Income (EBITDA)", { default: 240000, max: 100000000, step: 5000 }),
      currencyField("existingAnnualDebtService", "Existing Annual Debt Payments", { default: 60000, max: 100000000, step: 1000 }),
      numberField("requiredDscr", "Lender's Required DSCR", { default: 1.25, min: 1, max: 3, step: 0.05 }),
      percentField("annualRatePercent", "New Loan Interest Rate", { default: 9, max: 60, step: 0.05 }),
      numberField("termYears", "New Loan Term (Years)", { default: 10, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "Maximum Loan Amount", format: "currency" },
    calcResults: [
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency", highlight: true },
      { key: "maxAnnualDebtService", label: "Maximum New Annual Payments", format: "currency" },
      { key: "maxMonthlyPayment", label: "Maximum New Monthly Payment", format: "currency" },
      { key: "currentDscr", label: "Your Current DSCR (Before New Loan)", format: "number" },
    ],
    instructions:
      "Enter your business's yearly net operating income (roughly, earnings before interest, taxes, depreciation, " +
      "and amortization), what you already pay each year on existing debt, the minimum debt service coverage " +
      "ratio the lender requires (often 1.20–1.35), and the new loan's rate and term. The tool finds the largest " +
      "new payment — and loan — that keeps you at that ratio.",
    examples:
      "Example: $240,000 of operating income, $60,000 of existing debt payments, and a 1.25 DSCR requirement leave " +
      "room for $132,000 a year ($11,000 a month) of new payments — a loan of about $868,358.62 at 9% over 10 " +
      "years. Your current DSCR is 4.",
    assumptions:
      "DSCR = net operating income ÷ total annual debt payments. Lenders also look at collateral, credit, time " +
      "in business, and how they calculate income, so treat this as an upper estimate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What does a DSCR of 1.25 mean?",
        answer: "That the business earns $1.25 for every $1 of debt payments due — a 25% cushion. Below 1.0, income doesn't cover the payments at all.",
      },
    ],
  },
  {
    slug: "business-loan-emi-calculator",
    title: "Business Loan EMI Calculator",
    description: "Calculate the EMI on a business loan in rupees, including the processing fee plus GST, the net amount disbursed, and the total cost.",
    metaTitle: "Business Loan EMI Calculator — With Fee & GST (₹)",
    metaDescription: "Free business loan EMI calculator. Get your EMI in rupees plus the processing fee with 18% GST, the net amount disbursed, and the total cost of the loan.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { unit: "₹", default: 2000000, max: 1000000000, step: 10000 }),
      percentField("annualRatePercent", "Interest Rate (% per annum)", { default: 14, max: 40, step: 0.05 }),
      numberField("tenureMonths", "Loan Tenure (Months)", { default: 36, min: 1, max: 180, step: 1 }),
      percentField("processingFeePercent", "Processing Fee", { default: 2, max: 5, step: 0.25 }),
      percentField("gstPercent", "GST on Processing Fee", { default: 18, max: 28, step: 1 }),
    ],
    calcResult: { label: "EMI", format: "currency", currency: "INR" },
    calcResults: [
      { key: "emi", label: "Monthly EMI", format: "currency", currency: "INR", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency", currency: "INR" },
      { key: "processingFeeWithGst", label: "Processing Fee + GST", format: "currency", currency: "INR" },
      { key: "netDisbursal", label: "Net Amount Disbursed", format: "currency", currency: "INR" },
      { key: "totalCostOfLoan", label: "Total Cost (Interest + Fee + GST)", format: "currency", currency: "INR" },
    ],
    instructions:
      "Enter the business loan amount in rupees, the interest rate, tenure in months, the lender's processing fee " +
      "percentage, and GST on that fee (18% in India). Lenders usually deduct the fee and GST before disbursing, " +
      "so the tool shows your EMI, the money that actually reaches your account, and the full cost of the loan.",
    examples:
      "Example: a ₹20,00,000 business loan at 14% for 36 months has an EMI of ₹68,355.26 and ₹4,60,789.34 of " +
      "interest. A 2% processing fee plus 18% GST is ₹47,200, so ₹19,52,800 is disbursed and the total cost is " +
      "₹5,07,989.34.",
    assumptions:
      "Uses the standard reducing-balance EMI formula. Some lenders also charge documentation fees, insurance, or " +
      "foreclosure charges not included here. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can the processing fee's GST be claimed back?",
        answer: "A GST-registered business can usually claim input tax credit on the GST charged on the processing fee, reducing the real cost. Check with your accountant.",
      },
    ],
  },
  {
    slug: "working-capital-loan-calculator",
    title: "Working Capital Loan Calculator",
    description: "Estimate how much working capital your business needs from its cash conversion cycle, and what financing it with a loan costs.",
    metaTitle: "Working Capital Loan Calculator — Free & Instant",
    metaDescription: "Free working capital loan calculator. Size your working capital need from receivable, inventory, and payable days, and see the interest cost of financing it.",
    calcInputs: [
      currencyField("annualRevenue", "Annual Revenue", { default: 1200000, max: 1000000000, step: 10000 }),
      currencyField("annualCogs", "Annual Cost of Goods Sold", { default: 720000, max: 1000000000, step: 10000 }),
      numberField("daysSalesOutstanding", "Days to Collect From Customers (DSO)", { default: 45, min: 0, max: 365, step: 1 }),
      numberField("daysInventoryOutstanding", "Days Inventory Is Held (DIO)", { default: 60, min: 0, max: 365, step: 1 }),
      numberField("daysPayablesOutstanding", "Days to Pay Suppliers (DPO)", { default: 30, min: 0, max: 365, step: 1 }),
      percentField("annualRatePercent", "Working Capital Loan Rate", { default: 10, max: 60, step: 0.05 }),
    ],
    calcResult: { label: "Working Capital Needed", format: "currency" },
    calcResults: [
      { key: "workingCapitalNeeded", label: "Working Capital Needed", format: "currency", highlight: true },
      { key: "cashConversionCycleDays", label: "Cash Conversion Cycle (Days)", format: "number" },
      { key: "annualInterestCost", label: "Yearly Interest to Finance It", format: "currency" },
      { key: "monthlyInterestCost", label: "Monthly Interest to Finance It", format: "currency" },
    ],
    instructions:
      "Enter your annual revenue and cost of goods sold, how many days customers take to pay you, how many days " +
      "stock sits before it's sold, and how many days you take to pay suppliers, plus the loan rate. The tool adds " +
      "up the cash tied up in receivables and inventory, subtracts what suppliers are effectively lending you, " +
      "and shows the interest cost of borrowing the gap.",
    examples:
      "Example: $1.2 million of revenue, $720,000 of cost of goods, 45 days to collect, 60 days of inventory, and " +
      "30 days to pay suppliers gives a 75-day cash cycle and about $207,123.29 of working capital needed — " +
      "$20,712.33 a year in interest at 10%.",
    assumptions:
      "Receivables = revenue ÷ 365 × DSO; inventory = COGS ÷ 365 × DIO; payables = COGS ÷ 365 × DPO. Assumes the " +
      "full amount is borrowed all year; with a revolving line of credit you'd pay interest only on what you " +
      "draw. Seasonal businesses need more at peak times. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I need less working capital?",
        answer: "Collect from customers faster, hold less inventory, or negotiate longer supplier terms. Each day cut from the cash conversion cycle frees up cash and reduces how much you need to borrow.",
      },
    ],
  },
  {
    slug: "equipment-loan-calculator",
    title: "Equipment Loan Calculator",
    description: "Calculate the monthly payment on an equipment loan and the yearly cost of owning the equipment after its resale value.",
    metaTitle: "Equipment Loan Calculator — Free & Instant",
    metaDescription: "Free equipment loan calculator. See your equipment financing payment, total interest, and yearly cost of ownership after resale value.",
    calcInputs: [
      currencyField("equipmentCost", "Equipment Cost", { default: 80000, max: 100000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 20, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 7.5, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 6, max: 120, step: 6 }),
      numberField("usefulLifeYears", "Useful Life of Equipment (Years)", { default: 7, min: 1, max: 40, step: 1 }),
      currencyField("salvageValue", "Expected Resale Value at End of Life", { default: 10000, max: 100000000, step: 500 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "annualCostOfOwnership", label: "Yearly Cost of Ownership", format: "currency" },
    ],
    instructions:
      "Enter the equipment's price, your down payment percentage, the loan rate and term, how many years you " +
      "expect to use the equipment, and what you think you could sell it for at the end. The tool shows the loan " +
      "payment, and spreads the full cost (price plus interest, minus resale value) across the equipment's " +
      "working life, so you can compare it with the income it will produce.",
    examples:
      "Example: $80,000 of equipment with 20% down, financed at 7.5% over 60 months, costs $1,282.43 a month and " +
      "$12,945.72 in interest. Used for 7 years and sold for $10,000, it costs about $11,849.39 a year to own.",
    assumptions:
      "Cost of ownership = (price + interest − resale value) ÷ useful life, ignoring maintenance, insurance, and " +
      "tax benefits such as depreciation or Section 179 deductions, which can lower the real cost. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do equipment loans often have lower rates?",
        answer: "The equipment itself usually secures the loan, so the lender can repossess and sell it if payments stop — lowering the lender's risk.",
      },
    ],
  },
  {
    slug: "student-loan-calculator",
    title: "Student Loan Calculator",
    description: "Estimate your student loan balance when repayment starts — including interest during school and the grace period — and your monthly payment.",
    metaTitle: "Student Loan Calculator — Payment After Graduation",
    metaDescription: "Free student loan calculator. See your balance after school and the grace period, your monthly payment, and total interest, subsidized or unsubsidized.",
    calcInputs: [
      currencyField("amountPerYear", "Amount Borrowed Each Year", { default: 10000, max: 1000000, step: 500 }),
      numberField("yearsInSchool", "Years in School", { default: 4, min: 1, max: 10, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.5, max: 20, step: 0.05 }),
      {
        key: "interestHandling", label: "Interest While in School", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Unsubsidized — Builds Up and Is Added to the Loan", value: 1 },
          { label: "Subsidized — Government Pays It", value: 2 },
          { label: "I Pay It While in School", value: 3 },
        ],
      },
      numberField("graceMonths", "Grace Period (Months)", { default: 6, min: 0, max: 12, step: 1 }),
      numberField("repaymentYears", "Repayment Term (Years)", { default: 10, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "balanceAtRepayment", label: "Balance When Repayment Starts", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "interestBeforeRepayment", label: "Interest During School & Grace", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalPaid", label: "Total Paid", format: "currency" },
    ],
    instructions:
      "Enter how much you borrow each school year, how many years you'll be in school, the interest rate, how " +
      "interest is handled while you study, the grace period before payments start (6 months for most US federal " +
      "loans), and the repayment term (10 years on the standard plan). The tool shows what you'll owe when " +
      "repayment begins and your monthly payment.",
    examples:
      "Example: borrowing $10,000 a year for 4 years at 6.5% unsubsidized adds $7,800 of interest during school " +
      "and grace, so you start repayment owing $47,800. Over 10 years that's $542.76 a month and $25,131.12 of " +
      "interest in total.",
    assumptions:
      "Each year's loan is paid out at the start of the school year. Interest builds up as simple interest and, " +
      "for unsubsidized loans, is added to the balance when repayment starts. Rates differ by loan year and type " +
      "— federal loan rates are reset each July. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I pay the interest while I'm in school?",
        answer: "If you can, yes. Paying it stops it from being added to your balance, so you don't end up paying interest on interest — in this example it lowers the monthly payment from $542.76 to $454.19.",
      },
    ],
  },
  {
    slug: "student-loan-payoff-calculator",
    title: "Student Loan Payoff Calculator",
    description: "See how fast your student loan will be paid off at your chosen payment, compared with the standard 10-year plan.",
    metaTitle: "Student Loan Payoff Calculator — vs 10-Year Plan",
    metaDescription: "Free student loan payoff calculator. See how many months your payment takes to clear your student loans and the interest saved against the 10-year plan.",
    calcInputs: [
      currencyField("balance", "Current Student Loan Balance", { default: 35000, max: 1000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6, max: 20, step: 0.05 }),
      currencyField("monthlyPayment", "Your Monthly Payment", { default: 500, max: 100000, step: 25 }),
    ],
    calcResult: { label: "Interest Saved vs 10-Year Plan", format: "currency" },
    calcResults: [
      { key: "monthsToPayoff", label: "Months to Pay Off at Your Payment", format: "number" },
      { key: "totalInterest", label: "Total Interest at Your Payment", format: "currency" },
      { key: "standard10YearPayment", label: "Standard 10-Year Plan Payment", format: "currency" },
      { key: "standard10YearInterest", label: "Standard 10-Year Plan Interest", format: "currency" },
      { key: "interestSavedVsStandard", label: "Interest Saved vs 10-Year Plan", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your total student loan balance, its interest rate (use the weighted average if you have several " +
      "loans), and the monthly payment you plan to make. The tool shows how long you'll take to pay it off and " +
      "compares the interest with the standard 10-year repayment plan. A negative saving means you're paying " +
      "less than the standard plan and will pay more interest. If your payment doesn't cover the interest, the " +
      "results show 0.",
    examples:
      "Example: a $35,000 balance at 6% paid at $500 a month is cleared in 87 months with $8,186.19 of interest. " +
      "The standard 10-year plan ($388.57 a month) would cost $11,628.61, so you save $3,442.42.",
    assumptions:
      "Assumes a fixed rate and the same payment every month. Doesn't model income-driven plans or Public Service " +
      "Loan Forgiveness, where paying extra may not help. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I pay off student loans early?",
        answer: "If you're not aiming for loan forgiveness and the rate is higher than you'd reliably earn elsewhere, paying extra usually makes sense once you have an emergency fund and are getting any employer retirement match.",
      },
    ],
  },
  {
    slug: "student-loan-refinance-calculator",
    title: "Student Loan Refinance Calculator",
    description: "Combine up to 3 student loans into one refinanced loan and see the weighted average rate, new payment, and total interest saved.",
    metaTitle: "Student Loan Refinance Calculator — Free & Instant",
    metaDescription: "Free student loan refinance calculator. Combine up to 3 loans to see your weighted average rate, new monthly payment, and total interest saved.",
    calcInputs: [
      currencyField("loan1Balance", "Loan 1 — Balance", { default: 12000, max: 1000000, step: 500 }),
      percentField("loan1RatePercent", "Loan 1 — Rate", { default: 6.8, max: 20, step: 0.05 }),
      currencyField("loan2Balance", "Loan 2 — Balance", { default: 15000, max: 1000000, step: 500 }),
      percentField("loan2RatePercent", "Loan 2 — Rate", { default: 5.5, max: 20, step: 0.05 }),
      currencyField("loan3Balance", "Loan 3 — Balance", { default: 8000, max: 1000000, step: 500 }),
      percentField("loan3RatePercent", "Loan 3 — Rate", { default: 7.5, max: 20, step: 0.05 }),
      numberField("remainingMonths", "Months Left on Current Loans", { default: 120, min: 1, max: 360, step: 1 }),
      percentField("newRatePercent", "New Refinance Rate", { default: 5, max: 20, step: 0.05 }),
      numberField("newTermMonths", "New Loan Term (Months)", { default: 120, min: 12, max: 360, step: 12 }),
    ],
    calcResult: { label: "Total Interest Saved", format: "currency" },
    calcResults: [
      { key: "weightedAverageRatePercent", label: "Current Weighted Average Rate", format: "percentage" },
      { key: "currentTotalPayment", label: "Current Total Monthly Payment", format: "currency" },
      { key: "newPayment", label: "New Monthly Payment", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "totalInterestSaved", label: "Total Saved Over the Loan", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the balance and rate of up to three student loans (leave unused ones at $0), how many months are " +
      "left on them, and the rate and term of the refinanced loan. The tool works out your current weighted " +
      "average rate and combined payment, then compares them with a single new loan.",
    examples:
      "Example: $12,000 at 6.8%, $15,000 at 5.5%, and $8,000 at 7.5% (a 6.40% weighted average) cost $395.85 a " +
      "month over 10 years. Refinancing all $35,000 at 5% for 10 years costs $371.23 a month — $24.62 less — and " +
      "saves $2,954.15.",
    assumptions:
      "Assumes all current loans have the same months remaining and no refinance fees. Refinancing US federal " +
      "loans into a private loan permanently gives up federal benefits such as income-driven repayment, " +
      "deferment, and forgiveness programs. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is refinancing the same as federal consolidation?",
        answer: "No. A federal Direct Consolidation Loan keeps federal benefits but uses the weighted average rate (rounded up slightly), so it doesn't lower your rate. Private refinancing can lower the rate but ends federal protections.",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
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
