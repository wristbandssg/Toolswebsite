// One-time (but safe to re-run) batch setup script: creates the Asset-Based and Bridge Business Loan tools
// (14) of the Loan Calculators expansion 5, filed under Loan Calculators > General Loan Calculators.
// See src/lib/calc-engine-loan-asset-based-bridge.ts for the math and
// src/lib/calc-engine-loan-startup-business.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-asset-based-bridge-calculators.ts
// or
//   npm run db:create-loan-asset-based-bridge-calculators

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
    slug: "asset-based-loan-calculator",
    title: "Asset-Based Loan Calculator",
    description: "Estimate an asset-based line of credit: the borrowing base from your receivables, inventory and equipment at each lender advance rate.",
    metaTitle: "Asset-Based Loan Calculator — Borrowing Base",
    metaDescription: "Free asset-based loan calculator. Combine receivables, inventory and equipment at lender advance rates to estimate your ABL borrowing base.",
    calcInputs: [
      currencyField("receivables", "Eligible Accounts Receivable", { default: 500000, max: 1000000000, step: 1000 }),
      percentField("arAdvancePercent", "Receivables Advance Rate", { default: 85, max: 100, step: 1 }),
      currencyField("inventory", "Eligible Inventory (at Cost)", { default: 400000, max: 1000000000, step: 1000, required: false }),
      percentField("inventoryAdvancePercent", "Inventory Advance Rate", { default: 50, max: 100, step: 1 }),
      currencyField("equipment", "Equipment (Orderly Liquidation Value)", { default: 300000, max: 1000000000, step: 1000, required: false }),
      percentField("equipmentAdvancePercent", "Equipment Advance Rate", { default: 70, max: 100, step: 1 }),
    ],
    calcResult: { label: "Borrowing Base", format: "currency" },
    calcResults: [
      { key: "receivablesAvailability", label: "From Receivables", format: "currency" },
      { key: "inventoryAvailability", label: "From Inventory", format: "currency" },
      { key: "equipmentAvailability", label: "From Equipment", format: "currency" },
      { key: "borrowingBase", label: "Borrowing Base", format: "currency", highlight: true },
    ],
    instructions:
      "Asset-based lenders lend against your balance sheet. Enter the eligible amount of each asset and the advance " +
      "rate the lender applies — commonly 80%–90% of good receivables, 25%–65% of inventory, and a share of " +
      "equipment's orderly liquidation value. The total is how much you could draw, up to the line's limit.",
    examples:
      "Example: $500,000 of receivables at 85% gives $425,000; $400,000 of " +
      "inventory at 50% adds $200,000; $300,000 of equipment at " +
      "70% adds $210,000. The borrowing base is $835,000.",
    assumptions:
      "Amounts entered are already eligible (old, disputed or concentrated receivables and slow stock excluded). " +
      "The base is recalculated as your assets change, often weekly or monthly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who uses asset-based loans?",
        answer: "Manufacturers, distributors and wholesalers with sizeable receivables and inventory — especially fast-growing or seasonal businesses whose cash flow doesn't yet support a cash-flow loan.",
      },
    ],
  },
  {
    slug: "asset-based-loan-payment-calculator",
    title: "Asset-Based Loan Payment Calculator",
    description: "Estimate the monthly cost of an asset-based revolver: interest on what you draw, the unused-line fee, and the collateral monitoring fee.",
    metaTitle: "Asset-Based Loan Payment Calculator — Monthly Cost",
    metaDescription: "Free ABL payment calculator. See monthly interest on the drawn balance, unused-line and monitoring fees, and the effective rate.",
    calcInputs: [
      currencyField("commitment", "Line Commitment", { default: 1000000, max: 1000000000, step: 10000 }),
      currencyField("averageDrawn", "Average Amount Drawn", { default: 600000, max: 1000000000, step: 10000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 30, step: 0.05 }),
      percentField("unusedFeePercent", "Unused Line Fee (Annual)", { default: 0.375, max: 2, step: 0.025, required: false }),
      currencyField("monitoringFee", "Collateral Monitoring Fee per Month", { default: 1500, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Total Monthly Cost", format: "currency" },
    calcResults: [
      { key: "monthlyInterest", label: "Interest on the Drawn Balance", format: "currency" },
      { key: "unusedLineFee", label: "Unused Line Fee", format: "currency" },
      { key: "monitoringFee", label: "Monitoring Fee", format: "currency" },
      { key: "totalMonthlyCost", label: "Total Monthly Cost", format: "currency", highlight: true },
      { key: "effectiveRateOnDrawn", label: "Effective Annual Rate on the Drawn Balance", format: "percentage" },
    ],
    instructions:
      "ABL revolvers usually charge interest only on what's drawn, a small fee on the undrawn part of the line, and a " +
      "monthly fee for collateral monitoring and field exams. Principal goes up and down with your collections and " +
      "draws rather than following a fixed schedule.",
    examples:
      "Example: drawing $600,000 on a $1,000,000 line at 9% costs $4,500 of interest a " +
      "month, plus $125 of unused-line fee and $1,500 of monitoring — $6,125 a month, an " +
      "effective 12.25% on the money used.",
    assumptions:
      "Average balance for the month; 12 equal months. Field exam and audit fees vary. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do ABL lenders charge an unused line fee?",
        answer: "Because they must hold capital for the whole commitment. Keeping the line no bigger than you need keeps this fee down.",
      },
    ],
  },
  {
    slug: "asset-based-loan-payoff-calculator",
    title: "Asset-Based Loan Payoff Calculator",
    description: "See how fast customer collections pay down an asset-based line when you're still drawing on it, and the interest until it reaches zero.",
    metaTitle: "Asset-Based Loan Payoff Calculator — Paydown",
    metaDescription: "Free ABL payoff calculator. See how collections minus new draws pay down your asset-based line, the months to zero, and interest.",
    calcInputs: [
      currencyField("drawn", "Amount Drawn Now", { default: 600000, max: 1000000000, step: 10000 }),
      currencyField("monthlyCollections", "Collections Applied per Month", { default: 150000, max: 1000000000, step: 1000 }),
      currencyField("monthlyNewDraws", "New Draws per Month", { default: 100000, max: 1000000000, step: 1000, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 30, step: 0.05 }),
    ],
    calcResult: { label: "Months to Pay Off", format: "number" },
    calcResults: [
      { key: "netPaydownPerMonth", label: "Net Paydown per Month", format: "currency" },
      { key: "monthsToPayOff", label: "Months to Pay Off", format: "number", highlight: true },
      { key: "interestUntilPaidOff", label: "Interest Until Paid Off", format: "currency" },
    ],
    instructions:
      "With most ABL lines, customer payments go into a lender-controlled account and pay the line down automatically, " +
      "while you draw again to run the business. Enter the balance, monthly collections, monthly new draws and the " +
      "rate. If new draws plus interest match collections, the line never pays down (600 months is shown).",
    examples:
      "Example: $600,000 drawn, with $150,000 of collections and $100,000 of new draws each month, " +
      "pays down $50,000 a month before interest. At 9% the line reaches zero in " +
      "13 months, with $31,136.61 of interest.",
    assumptions:
      "Collections and draws are steady; interest is added monthly. Fees not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a lockbox or cash dominion?",
        answer: "An arrangement where customer payments go straight to the lender to reduce the line. 'Springing' dominion only kicks in if availability falls too low.",
      },
    ],
  },
  {
    slug: "asset-based-loan-interest-calculator",
    title: "Asset-Based Loan Interest Calculator",
    description: "Calculate interest on an asset-based line priced at SOFR plus a spread, and how much more you'd pay if SOFR rises one point.",
    metaTitle: "Asset-Based Loan Interest Calculator — SOFR + Spread",
    metaDescription: "Free ABL interest calculator. See the all-in rate, monthly and annual interest at SOFR plus spread, and the cost of a rate rise.",
    calcInputs: [
      currencyField("averageDrawn", "Average Amount Drawn", { default: 600000, max: 1000000000, step: 10000 }),
      percentField("sofrPercent", "SOFR (Base Rate)", { default: 4.25, max: 15, step: 0.05 }),
      percentField("spreadPercent", "Lender's Spread", { default: 3, max: 15, step: 0.05 }),
    ],
    calcResult: { label: "Annual Interest", format: "currency" },
    calcResults: [
      { key: "allInRate", label: "All-In Rate", format: "percentage" },
      { key: "monthlyInterest", label: "Monthly Interest", format: "currency" },
      { key: "annualInterest", label: "Annual Interest", format: "currency", highlight: true },
      { key: "extraIfSofrRises1Point", label: "Extra per Year If SOFR Rises 1 Point", format: "currency" },
    ],
    instructions:
      "Most ABL lines float over a benchmark — usually SOFR (or prime). Enter your average drawn balance, today's SOFR " +
      "and your spread. Because the rate floats, budgeting for a rate rise is prudent.",
    examples:
      "Example: $600,000 drawn at SOFR (4.25%) + 3% = 7.25% costs $3,625 a " +
      "month, $43,500 a year. If SOFR rose 1 point, interest would rise by $6,000 a year.",
    assumptions:
      "Average balance held all year; simple interest. Lenders often calculate on actual/360, which costs slightly " +
      "more. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I hedge a floating ABL rate?",
        answer: "Larger borrowers can use an interest rate cap or swap; smaller ones usually manage the risk by keeping the drawn balance down.",
      },
    ],
  },
  {
    slug: "asset-based-loan-affordability-calculator",
    title: "Asset-Based Loan Affordability Calculator",
    description: "See how much more you can draw on an asset-based line once the borrowing base, line limit and minimum excess-availability covenant are counted.",
    metaTitle: "ABL Availability Calculator — How Much More Can I Draw",
    metaDescription: "Free asset-based loan availability calculator. See availability, excess availability, utilization, and how much more you can draw.",
    calcInputs: [
      currencyField("borrowingBase", "Current Borrowing Base", { default: 700000, max: 1000000000, step: 10000 }),
      currencyField("lineLimit", "Line Limit", { default: 1000000, max: 1000000000, step: 10000 }),
      currencyField("currentlyDrawn", "Currently Drawn", { default: 450000, max: 1000000000, step: 10000 }),
      percentField("minExcessPercent", "Minimum Excess Availability Required", { default: 10, max: 50, step: 1, required: false }),
    ],
    calcResult: { label: "Maximum Additional Draw", format: "currency" },
    calcResults: [
      { key: "availability", label: "Availability (Lower of Base and Limit)", format: "currency" },
      { key: "excessAvailability", label: "Excess Availability", format: "currency" },
      { key: "maxAdditionalDraw", label: "Maximum Additional Draw", format: "currency", highlight: true },
      { key: "utilizationPercent", label: "Utilization", format: "percentage" },
    ],
    instructions:
      "You can draw up to the lower of your borrowing base and the line limit. Many agreements also require you to " +
      "keep some availability unused (or trigger stricter terms if you don't). Enter the base, limit, current draw and " +
      "that minimum.",
    examples:
      "Example: a $700,000 base on a $1,000,000 line gives $700,000 of availability. With $450,000 " +
      "drawn, excess availability is $250,000; keeping 10% unused, you can draw " +
      "$180,000 more. Utilization is 64.29%.",
    assumptions:
      "Reserves the lender may hold back aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens if my borrowing base drops below what I've drawn?",
        answer: "That's an overadvance — you'd usually have to repay the difference quickly, so watch the base when sales or inventory fall.",
      },
    ],
  },
  {
    slug: "asset-based-loan-comparison-calculator",
    title: "Asset-Based Loan Comparison Calculator",
    description: "Compare the yearly cost of an asset-based line with factoring the same receivables, and the effective rate of each.",
    metaTitle: "Asset-Based Loan vs Factoring Calculator",
    metaDescription: "Free ABL vs factoring calculator. Compare the annual cost and effective rate of an asset-based line and invoice factoring.",
    calcInputs: [
      currencyField("averageFinanced", "Average Amount Financed", { default: 400000, max: 1000000000, step: 10000 }),
      percentField("ablRatePercent", "ABL Interest Rate", { default: 9, max: 30, step: 0.05 }),
      currencyField("ablAnnualFees", "ABL Fees per Year (Monitoring, Unused, Exams)", { default: 18000, max: 10000000, step: 500, required: false }),
      percentField("factoringFeePercent", "Factoring Fee per 30 Days", { default: 2, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Savings With the ABL", format: "currency" },
    calcResults: [
      { key: "ablAnnualCost", label: "ABL — Annual Cost", format: "currency" },
      { key: "factoringAnnualCost", label: "Factoring — Annual Cost", format: "currency" },
      { key: "ablEffectiveRate", label: "ABL — Effective Rate", format: "percentage" },
      { key: "factoringEffectiveRate", label: "Factoring — Effective Rate", format: "percentage" },
      { key: "savingsWithAbl", label: "Savings With the ABL", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the average amount you'd have financed, the ABL rate and yearly fees, and a factoring fee per 30 days. " +
      "ABL is usually cheaper for larger, established businesses; factoring is easier to get and includes " +
      "collections. A negative saving means factoring is cheaper.",
    examples:
      "Example: financing $400,000 on average costs $54,000 a year through an ABL (13.50%) vs " +
      "$96,000 through factoring at 2% per 30 days (24%). The ABL " +
      "saves $42,000.",
    assumptions:
      "Factoring fee charged on the amount financed every 30 days; simple annual figures. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can a small business get an asset-based loan?",
        answer: "Banks often start ABL at about $1 million, but some specialty lenders go lower. Below that, factoring or inventory financing are more common.",
      },
    ],
  },
  {
    slug: "asset-based-loan-eligibility-calculator",
    title: "Asset-Based Loan Eligibility Calculator",
    description: "Check whether your receivables and inventory support the asset-based line you want: aged receivables, inventory turnover, and an estimated borrowing base.",
    metaTitle: "Asset-Based Loan Eligibility Calculator",
    metaDescription: "Free ABL eligibility calculator. Check aged receivables, inventory turnover and whether your estimated borrowing base covers the line.",
    calcInputs: [
      currencyField("receivables", "Accounts Receivable", { default: 500000, max: 1000000000, step: 1000 }),
      percentField("over90Percent", "Share More Than 90 Days Old", { default: 8, max: 100, step: 1 }),
      currencyField("inventory", "Inventory (at Cost)", { default: 400000, max: 1000000000, step: 1000, required: false }),
      currencyField("annualCogs", "Annual Cost of Goods Sold", { default: 2400000, max: 10000000000, step: 10000, required: false }),
      currencyField("requestedLine", "Line You Want", { default: 600000, max: 1000000000, step: 10000 }),
    ],
    calcResult: { label: "Checks Passed (of 3)", format: "number" },
    calcResults: [
      { key: "estimatedBorrowingBase", label: "Estimated Borrowing Base", format: "currency" },
      { key: "inventoryTurnover", label: "Inventory Turnover (Times per Year)", format: "number" },
      { key: "shortfall", label: "Shortfall vs the Line You Want", format: "currency" },
      { key: "checksPassed", label: "Checks Passed (of 3)", format: "number", highlight: true },
    ],
    instructions:
      "Enter your receivables and the share over 90 days old, inventory and yearly cost of goods sold, and the line " +
      "you want. The estimate uses 85% of current receivables and 50% of inventory. The three checks: no more than 15% " +
      "of receivables over 90 days; inventory turning at least 4 times a year; and a base that covers the line.",
    examples:
      "Example: $500,000 of receivables (8% over 90 days) and $400,000 of inventory support about " +
      "$591,000. Inventory turns 6 times a year. Against a $600,000 line, " +
      "2 of 3 checks pass.",
    assumptions:
      "Typical advance rates and guidelines; lenders also do field exams, appraisals and check customer concentration. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What makes receivables ineligible?",
        answer: "Invoices over 90 days, amounts owed by related companies or foreign customers, contra accounts, and anything over a single-customer concentration limit.",
      },
    ],
  },
  {
    slug: "bridge-business-loan-calculator",
    title: "Bridge Business Loan Calculator",
    description: "Cost out a short-term business bridge loan until longer-term funding arrives: monthly interest, origination and exit fees, and the payoff.",
    metaTitle: "Bridge Business Loan Calculator — Short-Term Cost",
    metaDescription: "Free bridge business loan calculator. See monthly interest, origination and exit fees, total cost and payoff for a short-term bridge.",
    calcInputs: [
      currencyField("loanAmount", "Bridge Loan Amount", { default: 250000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("months", "Months Until Repaid", { default: 6, min: 1, max: 36, step: 1 }),
      percentField("originationPercent", "Origination Fee", { default: 2, max: 10, step: 0.1, required: false }),
      percentField("exitFeePercent", "Exit Fee", { default: 1, max: 5, step: 0.1, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "monthlyInterest", label: "Monthly Interest", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "fees", label: "Origination + Exit Fees", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
      { key: "payoffAtEnd", label: "Payoff at the End", format: "currency" },
    ],
    instructions:
      "A bridge loan covers a short gap — for example while an SBA or bank loan closes, an equity round completes, or " +
      "a property sells. Most are interest-only, with the full amount repaid from that incoming money. Enter the " +
      "amount, rate, months and fees.",
    examples:
      "Example: a $250,000 bridge at 12% costs $2,500 a month — $15,000 over " +
      "6 months. With $7,500 of fees the total cost is $22,500, and the payoff at the end is $252,500.",
    assumptions:
      "Interest-only monthly payments; fees as a share of the loan. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the biggest risk with a bridge loan?",
        answer: "That the takeout money is delayed or falls through. Have a backup plan and know the extension terms before you sign.",
      },
    ],
  },
  {
    slug: "bridge-business-loan-payment-calculator",
    title: "Bridge Business Loan Payment Calculator",
    description: "Compare an interest-only bridge loan payment (with a balloon at the end) with paying it off in equal monthly payments over the same months.",
    metaTitle: "Bridge Business Loan Payment Calculator",
    metaDescription: "Free bridge business loan payment calculator. Compare interest-only payments and a balloon with an amortizing payment and interest.",
    calcInputs: [
      currencyField("loanAmount", "Bridge Loan Amount", { default: 200000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("months", "Term (Months)", { default: 9, min: 1, max: 36, step: 1 }),
    ],
    calcResult: { label: "Interest-Only Payment", format: "currency" },
    calcResults: [
      { key: "interestOnlyPayment", label: "Interest-Only Payment", format: "currency", highlight: true },
      { key: "balloonAtEnd", label: "Balloon at the End", format: "currency" },
      { key: "amortizingPayment", label: "Amortizing Payment Instead", format: "currency" },
      { key: "interestOnlyTotalInterest", label: "Total Interest — Interest-Only", format: "currency" },
      { key: "amortizingTotalInterest", label: "Total Interest — Amortizing", format: "currency" },
    ],
    instructions:
      "Enter the amount, rate and term. Interest-only keeps payments low but leaves the whole amount due at the end; " +
      "amortizing repays as you go, which only works if your cash flow can carry it.",
    examples:
      "Example: $200,000 at 12% for 9 months costs $2,000 a month interest-only, " +
      "with a $200,000 balloon and $18,000 of interest. Paying it off over the same months would " +
      "take $23,348.07 a month and cost $10,132.65 of interest.",
    assumptions:
      "Fixed rate, monthly payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can bridge loan interest be paid from the loan itself?",
        answer: "Some lenders hold back an interest reserve from the loan to cover payments, so you borrow more but don't pay monthly from cash flow.",
      },
    ],
  },
  {
    slug: "bridge-business-loan-payoff-calculator",
    title: "Bridge Business Loan Payoff Calculator",
    description: "See what it costs if your takeout funding is late: the extra interest, the extension fees, and the payoff when it finally arrives.",
    metaTitle: "Bridge Business Loan Payoff Calculator — Delays",
    metaDescription: "Free bridge business loan payoff calculator. See the extra interest and extension fees if your takeout funding is delayed.",
    calcInputs: [
      currencyField("loanAmount", "Bridge Loan Amount", { default: 250000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("plannedMonths", "Planned Payoff (Months)", { default: 6, min: 1, max: 36, step: 1 }),
      numberField("actualMonths", "Actual Payoff (Months)", { default: 9, min: 1, max: 60, step: 1 }),
      percentField("extensionFeePercent", "Extension Fee", { default: 1, max: 5, step: 0.1, required: false }),
      numberField("extensionMonths", "Months per Extension", { default: 3, min: 1, max: 12, step: 1 }),
    ],
    calcResult: { label: "Extra Cost of the Delay", format: "currency" },
    calcResults: [
      { key: "interestIfOnTime", label: "Interest If Paid Off on Time", format: "currency" },
      { key: "interestAtActualPayoff", label: "Interest at the Actual Payoff", format: "currency" },
      { key: "extensionFees", label: "Extension Fees", format: "currency" },
      { key: "extraCostOfDelay", label: "Extra Cost of the Delay", format: "currency", highlight: true },
      { key: "payoffAmount", label: "Payoff Amount (With Last Month's Interest)", format: "currency" },
    ],
    instructions:
      "Enter the loan, rate, the planned and actual payoff months, and the extension fee and how many months each " +
      "extension buys. Delays in SBA closings, investor funding or property sales are common, so check this before " +
      "you sign.",
    examples:
      "Example: a $250,000 bridge at 12% planned for 6 months costs $15,000 of " +
      "interest. Paid off at month 9 instead, interest is $22,500 and extension fees add " +
      "$2,500 — $10,000 more. The final payoff is $255,000.",
    assumptions:
      "Interest-only monthly payments; each started extension period is charged in full. Some lenders also raise the " +
      "rate after maturity. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I negotiate extension terms upfront?",
        answer: "Yes — ask for one or two pre-agreed extension options with fixed fees in the original term sheet.",
      },
    ],
  },
  {
    slug: "bridge-business-loan-interest-calculator",
    title: "Bridge Business Loan Interest Calculator",
    description: "Calculate daily (per-diem) interest on a business bridge loan and the extra a 360-day interest basis costs compared with 365 days.",
    metaTitle: "Bridge Loan Interest Calculator — Per Diem, 360 vs 365",
    metaDescription: "Free bridge business loan interest calculator. See per-diem interest and the extra cost of a 360-day basis versus 365 days.",
    calcInputs: [
      currencyField("loanAmount", "Bridge Loan Amount", { default: 300000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11.5, max: 40, step: 0.05 }),
      numberField("days", "Days Outstanding", { default: 150, min: 0, max: 1095, step: 1 }),
    ],
    calcResult: { label: "Interest (360-Day Basis)", format: "currency" },
    calcResults: [
      { key: "perDiem360", label: "Daily Interest (360-Day Basis)", format: "currency" },
      { key: "interest360", label: "Interest (360-Day Basis)", format: "currency", highlight: true },
      { key: "interest365", label: "Interest (365-Day Basis)", format: "currency" },
      { key: "extraFrom360Basis", label: "Extra Cost of the 360-Day Basis", format: "currency" },
    ],
    instructions:
      "Commercial lenders often charge 'actual/360': the annual rate divided by 360, charged for every actual day. " +
      "That makes the real rate slightly higher. Enter the loan, rate and days outstanding.",
    examples:
      "Example: $300,000 at 11.50% costs $95.83 a day on a 360-day basis — $14,375 over " +
      "150 days, vs $14,178.08 on a 365-day basis ($196.92 more).",
    assumptions:
      "Simple interest on the full balance. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the per-diem important?",
        answer: "Bridge loans are often paid off on a specific day; the payoff letter adds per-diem interest for each day until the money arrives.",
      },
    ],
  },
  {
    slug: "bridge-business-loan-affordability-calculator",
    title: "Bridge Business Loan Affordability Calculator",
    description: "Find the largest bridge loan you should take: limited by the takeout funding expected to repay it and by the monthly interest your business can carry.",
    metaTitle: "Bridge Business Loan Affordability Calculator",
    metaDescription: "Free bridge business loan affordability calculator. Find the max bridge from your expected takeout and your monthly interest budget.",
    calcInputs: [
      currencyField("expectedTakeout", "Expected Takeout Funding", { default: 500000, max: 1000000000, step: 1000 }),
      percentField("maxPercentOfTakeout", "Max Bridge as Share of the Takeout", { default: 80, max: 100, step: 1 }),
      currencyField("monthlyInterestBudget", "Monthly Interest You Can Afford", { default: 3000, max: 10000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.05 }),
    ],
    calcResult: { label: "Maximum Bridge Loan", format: "currency" },
    calcResults: [
      { key: "maxByTakeout", label: "Max Based on the Takeout", format: "currency" },
      { key: "maxByInterestBudget", label: "Max Based on Your Interest Budget", format: "currency" },
      { key: "maxBridgeLoan", label: "Maximum Bridge Loan", format: "currency", highlight: true },
    ],
    instructions:
      "A bridge should be comfortably smaller than the money that will repay it, and its interest should fit your " +
      "monthly cash flow. Enter the expected takeout, the share of it you'd borrow against, your monthly interest " +
      "budget and the rate.",
    examples:
      "Example: $500,000 of expected takeout at 80% supports $400,000. A $3,000 " +
      "monthly budget at 12% supports $300,000. The lower figure, $300,000, is your " +
      "limit.",
    assumptions:
      "Interest-only payments; fees not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much of an SBA approval can I bridge?",
        answer: "It depends on the lender, but bridging only part of a firm commitment — not the whole amount — leaves room for changes at closing.",
      },
    ],
  },
  {
    slug: "bridge-business-loan-comparison-calculator",
    title: "Bridge Business Loan Comparison Calculator",
    description: "Compare a short-term bridge loan with a merchant cash advance for the same amount and time — and see which costs less.",
    metaTitle: "Bridge Business Loan vs Merchant Cash Advance",
    metaDescription: "Free bridge business loan comparison calculator. Compare the cost of a bridge loan with a merchant cash advance for the same need.",
    calcInputs: [
      currencyField("amount", "Amount Needed", { default: 100000, max: 100000000, step: 1000 }),
      numberField("months", "Months Needed", { default: 6, min: 1, max: 36, step: 1 }),
      percentField("bridgeRatePercent", "Bridge Loan Rate", { default: 12, max: 40, step: 0.05 }),
      percentField("bridgeFeesPercent", "Bridge Loan Fees", { default: 3, max: 10, step: 0.1, required: false }),
      numberField("factorRate", "Cash Advance Factor Rate", { default: 1.25, min: 1, max: 3, step: 0.01 }),
    ],
    calcResult: { label: "Savings With the Bridge Loan", format: "currency" },
    calcResults: [
      { key: "bridgeLoanCost", label: "Bridge Loan — Cost", format: "currency" },
      { key: "cashAdvanceCost", label: "Merchant Cash Advance — Cost", format: "currency" },
      { key: "savingsWithBridgeLoan", label: "Savings With the Bridge Loan", format: "currency", highlight: true },
    ],
    instructions:
      "Both can be arranged quickly. A bridge loan charges interest for the time you use the money plus fees; a cash " +
      "advance charges a fixed factor-rate fee however fast you repay. Enter the amount, the months, and each offer. A " +
      "negative saving means the cash advance is cheaper.",
    examples:
      "Example: $100,000 for 6 months costs $9,000 as a bridge loan at 12% plus fees, vs " +
      "$25,000 as a cash advance at a 1.25 factor rate — the bridge loan saves $16,000.",
    assumptions:
      "Bridge loan interest-only on the full amount; fees as a share of the amount. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why would anyone choose a cash advance?",
        answer: "Approval is easier — it's based on card sales, often with no collateral — but it usually costs much more for the same time.",
      },
    ],
  },
  {
    slug: "bridge-business-loan-eligibility-calculator",
    title: "Bridge Business Loan Eligibility Calculator",
    description: "Check the main things a bridge lender wants: collateral at an acceptable loan-to-value, a committed takeout, and your credit score.",
    metaTitle: "Bridge Business Loan Eligibility Calculator",
    metaDescription: "Free bridge business loan eligibility calculator. Check loan-to-value on your collateral, a takeout commitment and credit score.",
    calcInputs: [
      currencyField("loanAmount", "Bridge Loan Amount", { default: 250000, max: 100000000, step: 1000 }),
      currencyField("collateralValue", "Collateral Value", { default: 400000, max: 1000000000, step: 1000 }),
      percentField("maxLtvPercent", "Lender's Maximum LTV", { default: 70, max: 100, step: 1 }),
      {
        key: "hasTakeout", label: "Do You Have a Takeout Commitment?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes — Signed Approval, Term Sheet or Sale Contract", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      numberField("creditScore", "Owner's Credit Score", { default: 670, min: 300, max: 850, step: 1 }),
    ],
    calcResult: { label: "Checks Passed (of 3)", format: "number" },
    calcResults: [
      { key: "loanToValue", label: "Loan-to-Value", format: "percentage" },
      { key: "maxLoanByCollateral", label: "Max Loan on This Collateral", format: "currency" },
      { key: "checksPassed", label: "Checks Passed (of 3)", format: "number", highlight: true },
    ],
    instructions:
      "Bridge lenders focus on the collateral and on how they'll be repaid (the 'exit'). Enter the loan, collateral " +
      "value and the lender's maximum LTV, whether you have a written takeout commitment, and your credit score. The " +
      "three checks: LTV within the limit; a takeout in place; a score of 650+.",
    examples:
      "Example: a $250,000 bridge against $400,000 of collateral is a 62.50% LTV — within a " +
      "70% limit, which allows up to $280,000. With a takeout commitment and a 670 " +
      "score, 3 of 3 checks pass.",
    assumptions:
      "Typical guidelines; lenders set their own. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What counts as an exit strategy?",
        answer: "A signed loan approval or term sheet for the long-term financing, a sale contract on an asset, or a committed equity investment.",
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
