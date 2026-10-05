// One-time (but safe to re-run) batch setup script: creates the Invoice Financing and Merchant Cash Advance tools
// (10) of the Loan Calculators expansion 3, filed under Loan Calculators > General Loan Calculators.
// See src/lib/calc-engine-loan-invoice-mca.ts for the math and
// src/lib/calc-engine-loan-sba.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-invoice-mca-calculators.ts
// or
//   npm run db:create-loan-invoice-mca-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "loan-calculators";
const CATEGORY = { name: "General Loan Calculators", slug: "general-loan-calculators" };

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
    slug: "invoice-financing-calculator",
    title: "Invoice Financing Calculator",
    description: "See how much cash you get today for an unpaid invoice, what the financing fee costs by the time your customer pays, and the rebate you receive after.",
    metaTitle: "Invoice Financing Calculator — Advance, Fee & Rebate",
    metaDescription: "Free invoice financing calculator. See the cash advance on an invoice, the fee based on days to pay, and the rebate when the customer pays.",
    calcInputs: [
      currencyField("invoiceAmount", "Invoice Amount", { default: 50000, max: 100000000, step: 100 }),
      percentField("advancePercent", "Advance Rate", { default: 85, max: 100, step: 1 }),
      percentField("feePercent", "Fee per 30 Days", { default: 3, max: 10, step: 0.1 }),
      numberField("daysToPay", "Days Until the Customer Pays", { default: 45, min: 0, max: 180, step: 1 }),
    ],
    calcResult: { label: "Cash Advanced Today", format: "currency" },
    calcResults: [
      { key: "advanceAmount", label: "Cash Advanced Today", format: "currency", highlight: true },
      { key: "financingFee", label: "Financing Fee", format: "currency" },
      { key: "rebateWhenPaid", label: "Rebate When the Customer Pays", format: "currency" },
      { key: "totalReceived", label: "Total You Receive", format: "currency" },
    ],
    instructions:
      "Enter the invoice, the advance rate (often 70%–90%), the fee per 30 days and how long your customer usually " +
      "takes to pay. You get the advance now; when the customer pays, the lender keeps its advance and fee and sends " +
      "you the rest. With invoice factoring the lender collects from your customer; with invoice financing you " +
      "collect and repay — the math is the same.",
    examples:
      "Example: a $50,000 invoice at an 85% advance gives you $42,500 today. If the " +
      "customer pays in 45 days, a 3%-per-30-days fee is $2,250, and you get a " +
      "$5,250 rebate — $47,750 in all.",
    assumptions:
      "The fee is charged on the full invoice and prorated daily; some providers charge per week or per full 30 days, " +
      "or charge on the advance only. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between invoice financing and factoring?",
        answer: "With factoring you sell the invoice and the factor collects from your customer. With invoice financing you borrow against it and still collect yourself, so customers may not know.",
      },
    ],
  },
  {
    slug: "invoice-financing-payment-calculator",
    title: "Invoice Financing Payment Calculator",
    description: "Estimate what an ongoing invoice financing program costs each month — and each year — when you finance a steady flow of invoices.",
    metaTitle: "Invoice Financing Payment Calculator — Monthly Cost",
    metaDescription: "Free invoice financing payment calculator. See the cash advanced each month, the monthly and annual fees, and their share of revenue.",
    calcInputs: [
      currencyField("monthlyInvoices", "Invoices Financed per Month", { default: 120000, max: 100000000, step: 1000 }),
      percentField("advancePercent", "Advance Rate", { default: 85, max: 100, step: 1 }),
      percentField("feePercent", "Fee per 30 Days", { default: 2.5, max: 10, step: 0.1 }),
      numberField("avgDaysToPay", "Average Days for Customers to Pay", { default: 40, min: 0, max: 180, step: 1 }),
    ],
    calcResult: { label: "Monthly Fees", format: "currency" },
    calcResults: [
      { key: "cashAdvancedPerMonth", label: "Cash Advanced per Month", format: "currency" },
      { key: "monthlyFees", label: "Monthly Fees", format: "currency", highlight: true },
      { key: "annualFees", label: "Annual Fees", format: "currency" },
      { key: "feeShareOfRevenue", label: "Fees as Share of Invoiced Sales", format: "percentage" },
    ],
    instructions:
      "Enter the value of invoices you finance each month, the advance rate, the fee and your customers' average " +
      "payment time. Compare the fee share with your profit margin — if fees take a big part of it, look at faster " +
      "collections, early-payment discounts, or a cheaper line of credit.",
    examples:
      "Example: financing $120,000 of invoices a month at an 85% advance brings in " +
      "$102,000. At 2.50% per 30 days with customers paying in 40 days, fees are " +
      "$4,000 a month — $48,000 a year, or 3.33% of those sales.",
    assumptions:
      "Volume and payment times are steady; fees prorated daily. Some programs add monthly minimums or setup fees. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I have to finance every invoice?",
        answer: "Not always — 'spot' factoring lets you pick invoices, while whole-ledger programs finance all of them, usually at a lower fee.",
      },
    ],
  },
  {
    slug: "invoice-financing-payoff-calculator",
    title: "Invoice Financing Payoff Calculator",
    description: "See what you owe to settle a financed invoice and how much you save when your customer pays early, with fees charged in 10-day blocks.",
    metaTitle: "Invoice Financing Payoff Calculator — Early Payment",
    metaDescription: "Free invoice financing payoff calculator. See your payoff amount and the fee saved when a customer pays early, with 10-day fee blocks.",
    calcInputs: [
      currencyField("invoiceAmount", "Invoice Amount", { default: 40000, max: 100000000, step: 100 }),
      percentField("advancePercent", "Advance Rate", { default: 80, max: 100, step: 1 }),
      percentField("feePer10DaysPercent", "Fee per 10 Days (or Part)", { default: 0.8, max: 5, step: 0.05 }),
      numberField("expectedDays", "Days You Planned For", { default: 60, min: 0, max: 180, step: 1 }),
      numberField("actualDays", "Days Until Actually Paid", { default: 35, min: 0, max: 180, step: 1 }),
    ],
    calcResult: { label: "Payoff Amount", format: "currency" },
    calcResults: [
      { key: "advanceAmount", label: "Advance Received", format: "currency" },
      { key: "feeIfPaidAsExpected", label: "Fee at the Planned Date", format: "currency" },
      { key: "feeIfPaidOnActualDay", label: "Fee When Actually Paid", format: "currency" },
      { key: "feeSaved", label: "Fee Saved", format: "currency" },
      { key: "payoffAmount", label: "Payoff Amount", format: "currency", highlight: true },
    ],
    instructions:
      "Many providers charge for each 10-day period (or part of one) that an invoice is outstanding. Enter the invoice, " +
      "advance rate, the fee per block, and the days you planned for vs when the money actually arrived. The payoff " +
      "is the advance plus the fee — what you repay if you collect the invoice yourself.",
    examples:
      "Example: a $40,000 invoice with an 80% advance gives $32,000. At 0.80% " +
      "per 10 days, waiting 60 days would cost $1,920; payment on day 35 costs " +
      "$1,280, saving $640. The payoff is $33,280.",
    assumptions:
      "Every started 10-day block is charged in full. Check your agreement for minimum fees. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why offer customers an early-payment discount?",
        answer: "If a small discount (like 1% for paying in 10 days) is less than the financing fee you'd otherwise pay, offering it saves you money.",
      },
    ],
  },
  {
    slug: "invoice-financing-interest-calculator",
    title: "Invoice Financing Interest Calculator",
    description: "Convert an invoice financing or factoring fee into an effective annual interest rate (APR) on the cash you actually receive.",
    metaTitle: "Invoice Financing Interest Calculator — Fee to APR",
    metaDescription: "Free invoice financing interest calculator. Turn a factoring fee into an effective APR on the cash advanced so you can compare with loans.",
    calcInputs: [
      percentField("feePercent", "Fee", { default: 3, max: 10, step: 0.1 }),
      numberField("feePeriodDays", "Fee Period (Days)", { default: 30, min: 1, max: 90, step: 1 }),
      numberField("avgDaysOutstanding", "Average Days Outstanding", { default: 45, min: 1, max: 180, step: 1 }),
      percentField("advancePercent", "Advance Rate", { default: 85, min: 1, max: 100, step: 1 }),
    ],
    calcResult: { label: "Effective APR", format: "percentage" },
    calcResults: [
      { key: "totalFeePercentOfInvoice", label: "Total Fee (% of Invoice)", format: "percentage" },
      { key: "costPer1000Invoiced", label: "Cost per $1,000 Invoiced", format: "currency" },
      { key: "feeAsAnnualRateOnInvoice", label: "Annualized Fee on the Invoice", format: "percentage" },
      { key: "effectiveApr", label: "Effective APR", format: "percentage", highlight: true },
    ],
    instructions:
      "Factoring fees look small because they're quoted per 30 days and on the whole invoice. Enter the fee, its " +
      "period, how long invoices stay unpaid, and the advance rate. The effective APR divides the fee by the cash you " +
      "actually get and annualizes it — the number to compare with a loan or line of credit.",
    examples:
      "Example: a 3% fee per 30 days on invoices paid in 45 days totals " +
      "4.50% of the invoice — $45 per $1,000. Annualized that's " +
      "36.50%, and on the 85% actually advanced it's an effective APR of 42.94%.",
    assumptions:
      "Simple (not compounded) annualization over 365 days; fee prorated by day. Ignores any rebate timing. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is invoice financing expensive?",
        answer: "Often more than a bank line of credit but less than a merchant cash advance. Its advantage is that approval leans on your customers' credit, not yours.",
      },
    ],
  },
  {
    slug: "invoice-financing-affordability-calculator",
    title: "Invoice Financing Affordability Calculator",
    description: "Check whether financing an invoice is worth it: how much of the job's gross profit the fee takes, and how many days until it would eat all of it.",
    metaTitle: "Invoice Financing Affordability — Fee vs Profit",
    metaDescription: "Free invoice financing affordability calculator. Compare the financing fee with the invoice's gross profit and see your profit after fees.",
    calcInputs: [
      currencyField("invoiceAmount", "Invoice Amount", { default: 25000, max: 100000000, step: 100 }),
      percentField("grossMarginPercent", "Gross Margin on the Job", { default: 30, max: 100, step: 0.5 }),
      percentField("feePercent", "Fee per 30 Days", { default: 2.5, max: 10, step: 0.1 }),
      numberField("daysOutstanding", "Days Until the Customer Pays", { default: 45, min: 0, max: 365, step: 1 }),
    ],
    calcResult: { label: "Fee as Share of Profit", format: "percentage" },
    calcResults: [
      { key: "grossProfit", label: "Gross Profit on the Invoice", format: "currency" },
      { key: "financingFee", label: "Financing Fee", format: "currency" },
      { key: "profitAfterFinancing", label: "Profit After Financing", format: "currency" },
      { key: "feeShareOfProfit", label: "Fee as Share of Profit", format: "percentage", highlight: true },
      { key: "daysUntilProfitIsGone", label: "Days Until the Fee Equals the Profit", format: "number" },
    ],
    instructions:
      "Enter the invoice, your gross margin on the work, the fee and the expected payment time. Financing makes sense " +
      "when the cash lets you take on more work, meet payroll, or grab a supplier discount — but not if the fee eats " +
      "most of the profit.",
    examples:
      "Example: a $25,000 invoice at a 30% margin earns $7,500. Financing it for " +
      "45 days at 2.50% per 30 days costs $937.50 — 12.50% of the profit — " +
      "leaving $6,562.50. After 359 days the fee would equal the whole profit.",
    assumptions:
      "Fee charged on the full invoice, prorated daily. Doesn't count what you earn by using the cash. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When is invoice financing a good idea?",
        answer: "When slow-paying customers would otherwise stop you taking profitable work or paying bills on time, and the fee is a modest share of profit.",
      },
    ],
  },
  {
    slug: "invoice-financing-comparison-calculator",
    title: "Invoice Financing Comparison Calculator",
    description: "Compare the cost of invoice financing or factoring with drawing the same cash from a business line of credit for the same time.",
    metaTitle: "Invoice Financing vs Line of Credit Calculator",
    metaDescription: "Free invoice financing comparison calculator. Compare a factoring fee with line-of-credit interest for the same cash and time.",
    calcInputs: [
      currencyField("invoiceAmount", "Invoice Amount", { default: 50000, max: 100000000, step: 100 }),
      percentField("advancePercent", "Advance Rate", { default: 85, max: 100, step: 1 }),
      percentField("feePercent", "Invoice Financing Fee per 30 Days", { default: 3, max: 10, step: 0.1 }),
      numberField("daysOutstanding", "Days Until the Customer Pays", { default: 45, min: 0, max: 365, step: 1 }),
      percentField("locRatePercent", "Line of Credit Rate", { default: 11, max: 40, step: 0.25 }),
    ],
    calcResult: { label: "Savings With the Line of Credit", format: "currency" },
    calcResults: [
      { key: "cashReceived", label: "Cash Needed (Advance)", format: "currency" },
      { key: "invoiceFinancingCost", label: "Invoice Financing Cost", format: "currency" },
      { key: "lineOfCreditCost", label: "Line of Credit Interest", format: "currency" },
      { key: "savingsWithLineOfCredit", label: "Savings With the Line of Credit", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the invoice, the advance rate and fee, the days until payment, and your line of credit rate. The " +
      "calculator draws the same cash from the line of credit for the same days. Lines of credit are usually cheaper " +
      "but need stronger credit; invoice financing grows with your sales.",
    examples:
      "Example: to get $42,500 for 45 days, invoice financing at 3% per 30 days costs " +
      "$2,250. Drawing it from a line of credit at 11% costs $576.37 — " +
      "$1,673.63 less.",
    assumptions:
      "Simple daily interest on a 365-day year; line of credit fees not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I have both?",
        answer: "Yes. Some businesses use a line of credit day to day and invoice financing for big orders or fast growth. Check that one lender's collateral claim doesn't block the other.",
      },
    ],
  },
  {
    slug: "invoice-financing-eligibility-calculator",
    title: "Invoice Financing Eligibility Calculator",
    description: "Work out how much invoice financing you can get: receivables after excluding past-due invoices and over-concentrated customers, times the advance rate.",
    metaTitle: "Invoice Financing Eligibility — Eligible Receivables",
    metaDescription: "Free invoice financing eligibility calculator. Remove past-due and concentrated receivables to find eligible invoices and available funding.",
    calcInputs: [
      currencyField("totalReceivables", "Total Accounts Receivable", { default: 400000, max: 1000000000, step: 1000 }),
      percentField("over90Percent", "Share Over 90 Days Past Invoice", { default: 10, max: 100, step: 1 }),
      percentField("largestCustomerPercent", "Largest Customer's Share", { default: 35, max: 100, step: 1 }),
      percentField("concentrationLimitPercent", "Lender's Concentration Limit", { default: 25, max: 100, step: 1 }),
      percentField("advancePercent", "Advance Rate", { default: 80, max: 100, step: 1 }),
    ],
    calcResult: { label: "Available Funding", format: "currency" },
    calcResults: [
      { key: "ineligiblePastDue", label: "Ineligible — Past Due", format: "currency" },
      { key: "ineligibleConcentration", label: "Ineligible — Over the Concentration Limit", format: "currency" },
      { key: "eligibleReceivables", label: "Eligible Receivables", format: "currency" },
      { key: "availableFunding", label: "Available Funding", format: "currency", highlight: true },
    ],
    instructions:
      "Lenders exclude invoices more than about 90 days old and cap how much any one customer can count for (often " +
      "20%–25% of receivables). Enter your receivables, the past-due share, your largest customer's share, the " +
      "lender's limit and the advance rate. Invoices to creditworthy business or government customers qualify best.",
    examples:
      "Example: $400,000 of receivables loses $40,000 past due. The largest customer is " +
      "35% against a 25% limit, so $40,000 more is " +
      "excluded. That leaves $320,000 eligible and $256,000 of funding at 80%.",
    assumptions:
      "The concentration excess is measured on total receivables. Lenders may also exclude invoices to related " +
      "companies, foreign customers or consumers. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does my credit score matter for invoice financing?",
        answer: "Less than for a loan — lenders mostly look at your customers' ability to pay — but they still review your business and may check your credit.",
      },
    ],
  },
  {
    slug: "merchant-cash-advance-calculator",
    title: "Merchant Cash Advance Calculator",
    description: "Calculate a merchant cash advance: the total payback from the factor rate, the daily payment taken from your card sales, and how long repayment takes.",
    metaTitle: "Merchant Cash Advance Calculator — Daily Payment",
    metaDescription: "Free merchant cash advance (MCA) calculator. See the payback amount, cost, daily holdback payment, and how long repayment takes.",
    calcInputs: [
      currencyField("advanceAmount", "Advance Amount", { default: 50000, max: 10000000, step: 1000 }),
      numberField("factorRate", "Factor Rate", { default: 1.35, min: 1, max: 3, step: 0.01 }),
      percentField("holdbackPercent", "Holdback (Share of Daily Card Sales)", { default: 12, max: 100, step: 0.5 }),
      currencyField("monthlyCardSales", "Monthly Card Sales", { default: 60000, max: 100000000, step: 1000 }),
    ],
    calcResult: { label: "Daily Payment", format: "currency" },
    calcResults: [
      { key: "totalPayback", label: "Total Payback", format: "currency" },
      { key: "costOfAdvance", label: "Cost of the Advance", format: "currency" },
      { key: "dailyPayment", label: "Daily Payment", format: "currency", highlight: true },
      { key: "daysToRepay", label: "Days to Repay", format: "number" },
      { key: "monthsToRepay", label: "Months to Repay", format: "number" },
    ],
    instructions:
      "A merchant cash advance (MCA) isn't a loan: the provider buys part of your future card sales. You repay the " +
      "advance times the factor rate (often 1.1–1.5) through a holdback — a share of each day's card sales. Enter the " +
      "advance, factor rate, holdback and your monthly card sales. Slower sales mean smaller payments but a longer " +
      "repayment; the total stays the same.",
    examples:
      "Example: a $50,000 advance at a 1.35 factor rate means repaying $67,500 — a cost of " +
      "$17,500. With $60,000 of monthly card sales and a 12% holdback, about " +
      "$240 is taken each day, so it's repaid in 282 days (about 9.38 months).",
    assumptions:
      "Card sales are spread evenly over 30 days a month. Many MCAs instead take a fixed daily or weekly ACH debit. " +
      "Fees for origination or underwriting aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a factor rate the same as an interest rate?",
        answer: "No. A 1.35 factor rate means 35% of the advance in fees, however fast you repay — over a few months that's a much higher annual rate.",
      },
    ],
  },
  {
    slug: "merchant-cash-advance-cost-calculator",
    title: "Merchant Cash Advance Cost Calculator",
    description: "Find the true cost of a merchant cash advance: total payback, fees, the daily payment over the expected term, and the equivalent APR.",
    metaTitle: "Merchant Cash Advance Cost Calculator — True APR",
    metaDescription: "Free MCA cost calculator. Convert a factor rate, fees and repayment term into the total cost and an equivalent APR.",
    calcInputs: [
      currencyField("advanceAmount", "Advance Amount", { default: 40000, max: 10000000, step: 1000 }),
      numberField("factorRate", "Factor Rate", { default: 1.3, min: 1, max: 3, step: 0.01 }),
      numberField("termMonths", "Expected Repayment Term (Months)", { default: 9, min: 1, max: 36, step: 0.5 }),
      currencyField("upfrontFees", "Upfront Fees (Origination, Underwriting)", { default: 1000, max: 1000000, step: 50, required: false }),
    ],
    calcResult: { label: "Equivalent APR", format: "percentage" },
    calcResults: [
      { key: "totalPayback", label: "Total Payback", format: "currency" },
      { key: "totalCost", label: "Total Cost (Including Fees)", format: "currency" },
      { key: "dailyPayment", label: "Daily Payment (Business Days)", format: "currency" },
      { key: "apr", label: "Equivalent APR", format: "percentage", highlight: true },
    ],
    instructions:
      "Enter the advance, factor rate, how long you expect repayment to take, and any upfront fees. The calculator " +
      "spreads the payback over business days (about 21 a month) and finds the annual rate that matches it. The " +
      "shorter the term, the higher the APR for the same factor rate.",
    examples:
      "Example: a $40,000 advance at a 1.30 factor rate repays $52,000. With $1,000 of " +
      "fees, the total cost is $13,000. Repaid over 9 months at $275.13 per business day, the " +
      "equivalent APR is 80.44%.",
    assumptions:
      "Fixed daily payments on 21 business days a month (252 a year); the APR is the daily rate times 252. Fees are " +
      "deducted from the advance. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do MCA providers have to disclose an APR?",
        answer: "Federal truth-in-lending rules don't apply, but some states (such as California and New York) now require commercial financing disclosures that include an estimated APR.",
      },
    ],
  },
  {
    slug: "merchant-cash-advance-payoff-calculator",
    title: "Merchant Cash Advance Payoff Calculator",
    description: "See what it takes to pay off a merchant cash advance early: the remaining balance and how much an early payoff discount on the remaining fee saves.",
    metaTitle: "Merchant Cash Advance Payoff Calculator — Early Payoff",
    metaDescription: "Free MCA payoff calculator. See your remaining balance, the fee still in it, and the payoff amount with an early payoff discount.",
    calcInputs: [
      currencyField("advanceAmount", "Original Advance", { default: 50000, max: 10000000, step: 1000 }),
      numberField("factorRate", "Factor Rate", { default: 1.4, min: 1, max: 3, step: 0.01 }),
      currencyField("amountPaid", "Amount Repaid So Far", { default: 30000, max: 30000000, step: 100 }),
      percentField("discountPercent", "Early Payoff Discount on the Remaining Fee", { default: 50, max: 100, step: 5, required: false }),
    ],
    calcResult: { label: "Payoff Amount", format: "currency" },
    calcResults: [
      { key: "totalPayback", label: "Total Payback", format: "currency" },
      { key: "remainingBalance", label: "Remaining Balance", format: "currency" },
      { key: "remainingFeePortion", label: "Fee Still in the Balance", format: "currency" },
      { key: "earlyPayoffDiscount", label: "Early Payoff Discount", format: "currency" },
      { key: "payoffAmount", label: "Payoff Amount", format: "currency", highlight: true },
      { key: "totalCostIfPaidNow", label: "Total Cost If Paid Off Now", format: "currency" },
    ],
    instructions:
      "With most MCAs, the full fee is owed no matter how early you repay — unless your contract offers an early " +
      "payoff discount. Enter the advance, factor rate, what you've repaid, and the discount (0 if none). The " +
      "calculator treats each payment as part fee and part advance, and applies the discount to the fee still owed.",
    examples:
      "Example: a $50,000 advance at 1.40 means $70,000 to repay; after $30,000, " +
      "$40,000 is left, of which $11,428.57 is fee. A 50% early payoff discount " +
      "takes off $5,714.29, so the payoff is $34,285.71 and the advance costs $14,285.71 in total.",
    assumptions:
      "Fees are spread evenly through the payback. Contracts differ — get a written payoff letter. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I refinance a merchant cash advance?",
        answer: "Yes — with a term loan, SBA loan or another MCA. Beware 'stacking' several MCAs; the combined daily payments can overwhelm cash flow.",
      },
    ],
  },
];

async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY_SLUG } });
  if (!parent) {
    throw new Error(
      `The "${PARENT_CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
        "then re-run this script."
    );
  }
  console.log(`Creating sub-category "${CATEGORY.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
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
