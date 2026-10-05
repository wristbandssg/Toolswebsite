// One-time (but safe to re-run) batch setup script: creates the Trade Credit Line, Purchase Order Financing and Term Loan tools
// (10) of the Loan Calculators expansion 5, filed under Loan Calculators > General Loan Calculators.
// See src/lib/calc-engine-loan-trade-po-term.ts for the math and
// src/lib/calc-engine-loan-startup-business.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-trade-po-term-calculators.ts
// or
//   npm run db:create-loan-trade-po-term-calculators

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
    slug: "trade-credit-line-calculator",
    title: "Trade Credit Line Calculator",
    description: "See how much credit your suppliers' net terms give you, the early-payment discount on offer, and the true annual cost of not taking it.",
    metaTitle: "Trade Credit Calculator — Cost of Skipping 2/10 Net 30",
    metaDescription: "Free trade credit calculator. See the credit supplier terms give you and the annual cost of skipping an early-payment discount like 2/10 net 30.",
    calcInputs: [
      currencyField("monthlyPurchases", "Purchases on Supplier Terms per Month", { default: 50000, max: 100000000, step: 1000 }),
      numberField("netDays", "Payment Due In (Net Days)", { default: 30, min: 1, max: 120, step: 1 }),
      percentField("discountPercent", "Early-Payment Discount", { default: 2, max: 10, step: 0.25, required: false }),
      numberField("discountDays", "Discount If Paid Within (Days)", { default: 10, min: 0, max: 119, step: 1 }),
    ],
    calcResult: { label: "Annual Cost of Skipping the Discount", format: "percentage" },
    calcResults: [
      { key: "averageCreditUsed", label: "Average Trade Credit You Use", format: "currency" },
      { key: "discountPerMonth", label: "Discount Available per Month", format: "currency" },
      { key: "discountsPerYear", label: "Discounts Available per Year", format: "currency" },
      { key: "annualCostOfSkippingDiscount", label: "Annual Cost of Skipping the Discount", format: "percentage", highlight: true },
    ],
    instructions:
      "Trade credit is the time suppliers give you to pay — for example \"2/10 net 30\" means 2% off if you pay within " +
      "10 days, otherwise the full amount in 30. Enter your monthly purchases on terms and the supplier's terms. " +
      "Skipping the discount is like borrowing for the extra days at the annual rate shown — usually far more than a " +
      "bank line of credit costs.",
    examples:
      "Example: $50,000 a month on net 30 terms means about $50,000 of supplier credit at any " +
      "time. A 2% discount for paying within 10 days is worth $1,000 a month " +
      "($12,000 a year). Skipping it costs the equivalent of 37.24% a year.",
    assumptions:
      "Purchases are spread evenly through the month; simple (not compounded) annual rate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does trade credit build business credit?",
        answer: "It can — some suppliers report payment history to business credit bureaus such as Dun & Bradstreet. Ask your suppliers whether they report.",
      },
    ],
  },
  {
    slug: "trade-credit-line-payment-calculator",
    title: "Trade Credit Line Payment Calculator",
    description: "Work out what a supplier invoice costs if you pay early (with the discount), on the due date, or late with monthly late charges.",
    metaTitle: "Trade Credit Payment Calculator — Early, On Time or Late",
    metaDescription: "Free trade credit payment calculator. See an invoice's amount with an early-payment discount, on the due date, and with late charges.",
    calcInputs: [
      currencyField("invoice", "Invoice Amount", { default: 20000, max: 100000000, step: 100 }),
      percentField("discountPercent", "Early-Payment Discount", { default: 2, max: 10, step: 0.25, required: false }),
      numberField("netDays", "Due In (Net Days)", { default: 30, min: 1, max: 120, step: 1 }),
      percentField("lateFeeMonthlyPercent", "Late Charge per Month", { default: 1.5, max: 5, step: 0.25, required: false }),
      numberField("daysPaid", "Days Until You Pay", { default: 45, min: 0, max: 365, step: 1 }),
    ],
    calcResult: { label: "Amount on Your Payment Date", format: "currency" },
    calcResults: [
      { key: "amountIfPaidEarly", label: "Pay Early (With Discount)", format: "currency" },
      { key: "amountOnDueDate", label: "Pay on the Due Date", format: "currency" },
      { key: "lateCharges", label: "Late Charges", format: "currency" },
      { key: "amountOnYourDate", label: "Amount on Your Payment Date", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the invoice, the early-payment discount, the due date in days, the supplier's late charge per month " +
      "(often 1%–1.5%), and when you expect to pay. Each started month past the due date adds a late charge — and " +
      "paying late can hurt your supplier relationship and credit terms.",
    examples:
      "Example: a $20,000 invoice costs $19,600 if you take the 2% discount, or " +
      "$20,000 on day 30. Paying on day 45 adds $300 of late charges, for " +
      "$20,300.",
    assumptions:
      "Late charges are a flat percentage per started month on the invoice. Check your supplier's actual terms. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I negotiate longer payment terms?",
        answer: "Often, once you have a good payment record. Moving from net 30 to net 45 or 60 frees cash without borrowing.",
      },
    ],
  },
  {
    slug: "trade-credit-line-cost-calculator",
    title: "Trade Credit Line Cost Calculator",
    description: "Is it worth drawing on a bank line of credit to pay suppliers early and take the discount? Compare the discount with the interest.",
    metaTitle: "Trade Credit Cost Calculator — Borrow to Take Discounts",
    metaDescription: "Free trade credit cost calculator. Compare an early-payment discount with line-of-credit interest to see your monthly and yearly savings.",
    calcInputs: [
      currencyField("monthlyPurchases", "Purchases per Month", { default: 50000, max: 100000000, step: 1000 }),
      percentField("discountPercent", "Early-Payment Discount", { default: 2, max: 10, step: 0.25 }),
      numberField("discountDays", "Discount If Paid Within (Days)", { default: 10, min: 0, max: 120, step: 1 }),
      numberField("netDays", "Otherwise Due In (Days)", { default: 30, min: 0, max: 120, step: 1 }),
      percentField("locRatePercent", "Line of Credit Rate", { default: 10, max: 40, step: 0.25 }),
    ],
    calcResult: { label: "Net Savings per Year", format: "currency" },
    calcResults: [
      { key: "discountEarnedPerMonth", label: "Discount Earned per Month", format: "currency" },
      { key: "lineOfCreditInterestPerMonth", label: "Line of Credit Interest per Month", format: "currency" },
      { key: "netSavingsPerMonth", label: "Net Savings per Month", format: "currency" },
      { key: "netSavingsPerYear", label: "Net Savings per Year", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your purchases, the discount terms and your line of credit rate. You'd borrow the discounted amount on " +
      "the discount date and repay it on the normal due date, when you would have paid anyway. A negative saving means " +
      "the line of credit costs more than the discount.",
    examples:
      "Example: paying $50,000 of purchases early earns $1,000 a month. Borrowing for " +
      "those extra days at 10% costs $268.49, so you save $731.51 a " +
      "month — $8,778.08 a year.",
    assumptions:
      "Simple daily interest on a 365-day year; line of credit fees not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why are early-payment discounts so valuable?",
        answer: "2% for paying 20 days early works out to roughly 37% a year — much higher than most business loan rates.",
      },
    ],
  },
  {
    slug: "trade-credit-line-payoff-calculator",
    title: "Trade Credit Line Payoff Calculator",
    description: "Agreed a payment plan for an overdue supplier balance? See how long it takes to clear, the finance charges, and the minimum that stops it growing.",
    metaTitle: "Trade Credit Payoff Calculator — Overdue Supplier Balance",
    metaDescription: "Free trade credit payoff calculator. See how long an overdue supplier balance takes to clear on a payment plan and the finance charges.",
    calcInputs: [
      currencyField("balance", "Overdue Supplier Balance", { default: 30000, max: 100000000, step: 100 }),
      currencyField("monthlyPayment", "Monthly Payment Agreed", { default: 4000, max: 10000000, step: 50 }),
      percentField("financeChargePercent", "Finance Charge per Month", { default: 1.5, max: 5, step: 0.25 }),
    ],
    calcResult: { label: "Months to Clear", format: "number" },
    calcResults: [
      { key: "monthsToClear", label: "Months to Clear", format: "number", highlight: true },
      { key: "totalFinanceCharges", label: "Total Finance Charges", format: "currency" },
      { key: "totalPaid", label: "Total Paid", format: "currency" },
      { key: "minimumToStopGrowth", label: "Minimum Payment to Stop It Growing", format: "currency" },
    ],
    instructions:
      "When cash is tight, suppliers will often agree a payment plan for an overdue account, usually with a monthly " +
      "finance charge. Enter the balance, the agreed payment and the charge. New purchases may need to be paid in " +
      "advance until the account is current.",
    examples:
      "Example: a $30,000 overdue balance paid at $4,000 a month with a 1.50% monthly charge " +
      "clears in 9 months, with $2,064.37 of finance charges — $32,064.37 in total. Anything " +
      "below $450 a month wouldn't reduce it.",
    assumptions:
      "No new charges added to the balance; the finance charge compounds monthly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I refinance overdue supplier bills with a loan?",
        answer: "If a loan's rate is well below the supplier's finance charge (1.5% a month is 18% a year), consolidating can save money and restore normal terms.",
      },
    ],
  },
  {
    slug: "purchase-order-financing-calculator",
    title: "Purchase Order Financing Calculator",
    description: "Fill a large order you can't afford upfront: see how much the financier pays your supplier, the fee, and the profit you keep on the deal.",
    metaTitle: "Purchase Order Financing Calculator — Deal Profit",
    metaDescription: "Free purchase order financing calculator. See the amount financed, the fee, and your profit and margin after financing on a big order.",
    calcInputs: [
      currencyField("orderValue", "Customer's Purchase Order Value", { default: 100000, max: 100000000, step: 1000 }),
      currencyField("supplierCost", "Your Supplier's Cost to Fill It", { default: 60000, max: 100000000, step: 1000 }),
      percentField("advancePercent", "Share of Supplier Cost Financed", { default: 100, max: 100, step: 5 }),
      percentField("feePer30DaysPercent", "Fee per 30 Days", { default: 3, max: 10, step: 0.25 }),
      numberField("daysToCustomerPayment", "Days Until Your Customer Pays", { default: 60, min: 0, max: 365, step: 1 }),
    ],
    calcResult: { label: "Profit After Financing", format: "currency" },
    calcResults: [
      { key: "amountFinanced", label: "Amount Financed (Paid to Supplier)", format: "currency" },
      { key: "yourCashNeeded", label: "Your Cash Needed", format: "currency" },
      { key: "financingFee", label: "Financing Fee", format: "currency" },
      { key: "grossProfit", label: "Gross Profit on the Order", format: "currency" },
      { key: "profitAfterFinancing", label: "Profit After Financing", format: "currency", highlight: true },
      { key: "marginAfterFinancing", label: "Margin After Financing", format: "percentage" },
    ],
    instructions:
      "Purchase order (PO) financing pays your supplier directly so you can fulfil a confirmed order from a " +
      "creditworthy customer; the financier is repaid when the customer pays the invoice. Enter the order, your " +
      "supplier's cost, the share financed, the fee and the time until payment. PO financing works best on orders " +
      "with gross margins of about 20% or more.",
    examples:
      "Example: a $100,000 order costing $60,000 to fill. The financier pays the supplier $60,000; at " +
      "3% per 30 days for 60 days the fee is $3,600. Of the $40,000 " +
      "gross profit you keep $36,400 — a 36.40% margin.",
    assumptions:
      "Fees are charged per started 30 days on the amount financed. Often paired with invoice factoring once the goods " +
      "ship, which adds its own fee. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who qualifies for purchase order financing?",
        answer: "Businesses reselling finished goods to creditworthy business or government customers — the customer's credit and the supplier's reliability matter more than yours.",
      },
    ],
  },
  {
    slug: "purchase-order-financing-payment-calculator",
    title: "Purchase Order Financing Payment Calculator",
    description: "Calculate what you repay on purchase order financing with a typical tiered fee — a rate for the first 30 days, then a charge per 10 days after.",
    metaTitle: "PO Financing Payment Calculator — Tiered Fees",
    metaDescription: "Free purchase order financing payment calculator. See the fee, the repayment due and the annualized rate with tiered 30-day and 10-day fees.",
    calcInputs: [
      currencyField("amountFinanced", "Amount Financed", { default: 60000, max: 100000000, step: 1000 }),
      percentField("initialFeePercent", "Fee for the First 30 Days", { default: 3, max: 10, step: 0.25 }),
      percentField("feePer10DaysPercent", "Fee per 10 Days After That", { default: 1, max: 5, step: 0.1 }),
      numberField("days", "Days Outstanding", { default: 55, min: 1, max: 365, step: 1 }),
    ],
    calcResult: { label: "Repayment Due", format: "currency" },
    calcResults: [
      { key: "totalFee", label: "Total Fee", format: "currency" },
      { key: "repaymentDue", label: "Repayment Due", format: "currency", highlight: true },
      { key: "feePercentOfAmount", label: "Fee as Share of the Amount", format: "percentage" },
      { key: "annualizedRate", label: "Annualized Rate", format: "percentage" },
    ],
    instructions:
      "Many PO financiers charge one rate for the first 30 days and a smaller charge for every 10 days (or part) after " +
      "that. Enter the amount financed, both fees and how long it will be outstanding.",
    examples:
      "Example: $60,000 outstanding for 55 days with 3% for the first 30 days and " +
      "1% per 10 days after costs $3,600 — 6% of the amount. You repay " +
      "$63,600, an annualized rate of 39.82%.",
    assumptions:
      "Every started 10-day block is charged in full; simple annualization. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who repays the PO financier?",
        answer: "Usually your customer pays the financier (or a factor) directly; the financier takes its advance and fees and sends you the rest.",
      },
    ],
  },
  {
    slug: "purchase-order-financing-cost-calculator",
    title: "Purchase Order Financing Cost Calculator",
    description: "See how much of an order's profit purchase order financing eats, its effective APR, and how long the customer can take before the fee wipes out the profit.",
    metaTitle: "Purchase Order Financing Cost Calculator — APR",
    metaDescription: "Free PO financing cost calculator. See the fee as a share of profit, the effective APR, and the days until the fee wipes out your profit.",
    calcInputs: [
      currencyField("orderValue", "Purchase Order Value", { default: 100000, max: 100000000, step: 1000 }),
      currencyField("supplierCost", "Supplier Cost (Amount Financed)", { default: 60000, max: 100000000, step: 1000 }),
      percentField("feePer30DaysPercent", "Fee per 30 Days", { default: 3.5, max: 10, step: 0.25 }),
      numberField("days", "Days Until Repaid", { default: 75, min: 1, max: 365, step: 1 }),
    ],
    calcResult: { label: "Effective APR", format: "percentage" },
    calcResults: [
      { key: "financingFee", label: "Financing Fee", format: "currency" },
      { key: "feeShareOfProfit", label: "Fee as Share of Profit", format: "percentage" },
      { key: "effectiveApr", label: "Effective APR", format: "percentage", highlight: true },
      { key: "daysUntilProfitIsGone", label: "Days Until the Fee Wipes Out the Profit", format: "number" },
    ],
    instructions:
      "Enter the order value, the supplier cost being financed, the fee per 30 days and how long until repayment. " +
      "Slow-paying customers are the main risk: every extra month adds another fee.",
    examples:
      "Example: financing $60,000 for a $100,000 order at 3.50% per 30 days for 75 days " +
      "costs $6,300 — 15.75% of the profit, an effective APR of 51.10%. After about " +
      "570 days the fees would equal the whole profit.",
    assumptions:
      "Fees charged per started 30 days; simple annualization. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is purchase order financing expensive?",
        answer: "Yes compared with bank credit — effective rates are often 20%–50% a year or more — but it can let you take orders you'd otherwise have to turn down.",
      },
    ],
  },
  {
    slug: "purchase-order-financing-payoff-calculator",
    title: "Purchase Order Financing Payoff Calculator",
    description: "See how much you save on purchase order financing fees when your customer pays sooner than planned, and the amount to settle.",
    metaTitle: "PO Financing Payoff Calculator — Early Customer Payment",
    metaDescription: "Free purchase order financing payoff calculator. Compare fees at the planned and actual payment dates and see the payoff amount.",
    calcInputs: [
      currencyField("amountFinanced", "Amount Financed", { default: 60000, max: 100000000, step: 1000 }),
      percentField("initialFeePercent", "Fee for the First 30 Days", { default: 3, max: 10, step: 0.25 }),
      percentField("feePer10DaysPercent", "Fee per 10 Days After That", { default: 1, max: 5, step: 0.1 }),
      numberField("plannedDays", "Days You Planned For", { default: 75, min: 1, max: 365, step: 1 }),
      numberField("actualDays", "Days Until Actually Repaid", { default: 45, min: 1, max: 365, step: 1 }),
    ],
    calcResult: { label: "Payoff Amount", format: "currency" },
    calcResults: [
      { key: "feeAtPlannedDate", label: "Fee at the Planned Date", format: "currency" },
      { key: "feeAtActualDate", label: "Fee When Actually Repaid", format: "currency" },
      { key: "feeSaved", label: "Fee Saved", format: "currency" },
      { key: "payoffAmount", label: "Payoff Amount", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the amount financed, the fee structure, the days you planned for and when the customer actually paid. " +
      "Offering your customer a small discount to pay early can be cheaper than the fees it saves.",
    examples:
      "Example: $60,000 planned for 75 days would cost $4,800 in fees. Repaid on day " +
      "45, the fee is $3,000 — $1,800 saved — and the payoff is $63,000.",
    assumptions:
      "Every started 10-day block after the first 30 days is charged in full. Check for minimum fees. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I pay off PO financing myself before the customer pays?",
        answer: "Usually yes — the fee simply stops growing. Check the agreement for any minimum fee period.",
      },
    ],
  },
  {
    slug: "term-loan-eligibility-calculator",
    title: "Term Loan Eligibility Calculator",
    description: "Prequalify for a business term loan: debt service coverage with the new payment, time in business, credit score and annual revenue.",
    metaTitle: "Term Loan Eligibility & Prequalification Calculator",
    metaDescription: "Free business term loan eligibility calculator. Check DSCR with the new loan, years in business, credit score and revenue.",
    calcInputs: [
      currencyField("annualRevenue", "Annual Revenue", { default: 400000, max: 1000000000, step: 1000 }),
      currencyField("annualCashFlow", "Annual Cash Flow Available for Debt", { default: 120000, max: 1000000000, step: 1000 }),
      currencyField("existingAnnualDebt", "Existing Annual Loan Payments", { default: 30000, max: 1000000000, step: 1000, required: false }),
      currencyField("loanAmount", "Term Loan Amount", { default: 200000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9.5, max: 40, step: 0.05 }),
      numberField("termYears", "Term (Years)", { default: 5, min: 1, max: 25, step: 1 }),
      numberField("yearsInBusiness", "Years in Business", { default: 3, min: 0, max: 100, step: 0.5 }),
      numberField("creditScore", "Owner's Credit Score", { default: 680, min: 300, max: 850, step: 1 }),
    ],
    calcResult: { label: "Checks Passed (of 4)", format: "number" },
    calcResults: [
      { key: "newAnnualPayments", label: "New Loan — Annual Payments", format: "currency" },
      { key: "dscr", label: "DSCR With the New Loan", format: "number" },
      { key: "maxLoanAtDscr125", label: "Largest Loan at a 1.25 DSCR", format: "currency" },
      { key: "checksPassed", label: "Checks Passed (of 4)", format: "number", highlight: true },
    ],
    instructions:
      "Enter your revenue and the cash flow available for debt (roughly EBITDA), existing loan payments, the term " +
      "loan you want, and your history and credit. The four checks follow common bank guidelines: DSCR of at least " +
      "1.25; 2+ years in business; a 660+ score; and $100,000+ of annual revenue. Online lenders may accept less.",
    examples:
      "Example: $120,000 of cash flow and $30,000 of existing payments. A $200,000 term loan at " +
      "9.50% over 5 years adds $50,404.47 a year, for a DSCR of 1.49. With " +
      "3 years in business and a 680 score, 4 of 4 checks pass. The largest loan " +
      "at a 1.25 DSCR is $261,881.55.",
    assumptions:
      "Typical benchmarks; lenders also review collateral, industry and financial statements. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between a term loan and a line of credit?",
        answer: "A term loan gives a lump sum repaid on a fixed schedule; a line of credit lets you draw and repay as needed, paying interest only on what you use.",
      },
    ],
  },
  {
    slug: "term-loan-total-cost-calculator",
    title: "Term Loan Total Cost Calculator",
    description: "Add up a business term loan's full cost — interest, origination and closing fees — including a prepayment penalty if you pay it off early.",
    metaTitle: "Term Loan Total Cost Calculator — Fees & Prepayment",
    metaDescription: "Free term loan total cost calculator. Add interest and fees, and a prepayment penalty if you pay off early, to see the full cost.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 250000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9.5, max: 40, step: 0.05 }),
      numberField("termYears", "Term (Years)", { default: 5, min: 1, max: 25, step: 1 }),
      percentField("originationPercent", "Origination Fee", { default: 2, max: 10, step: 0.1, required: false }),
      currencyField("closingCosts", "Other Closing Costs", { default: 2500, max: 1000000, step: 100, required: false }),
      percentField("prepaymentPenaltyPercent", "Prepayment Penalty (% of Balance)", { default: 2, max: 10, step: 0.25, required: false }),
      numberField("payoffYear", "Pay Off After (Years, 0 = Full Term)", { default: 0, min: 0, max: 25, step: 1 }),
    ],
    calcResult: { label: "Total Cost of Borrowing", format: "currency" },
    calcResults: [
      { key: "totalInterest", label: "Interest Paid", format: "currency" },
      { key: "upfrontFees", label: "Origination & Closing Fees", format: "currency" },
      { key: "prepaymentPenalty", label: "Prepayment Penalty", format: "currency" },
      { key: "totalCostOfBorrowing", label: "Total Cost of Borrowing", format: "currency", highlight: true },
      { key: "costPerDollarBorrowed", label: "Cost per $1 Borrowed", format: "currency", decimals: 3 },
    ],
    instructions:
      "Enter the loan, rate, term and fees. To see the cost if you pay it off early, enter the year you'd pay it off " +
      "and the prepayment penalty from your loan agreement; 0 means you keep it for the full term.",
    examples:
      "Example: a $250,000, 5-year loan at 9.50% kept to the end costs $65,027.92 of " +
      "interest and $7,500 of fees — $72,527.92 in total, or $0.29 per dollar.",
    assumptions:
      "Fixed rate, monthly payments; penalty applies to the balance at payoff. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do business term loans have prepayment penalties?",
        answer: "Some do — often a percentage of the balance in the first years, or all remaining interest on some online loans. Ask before signing.",
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
