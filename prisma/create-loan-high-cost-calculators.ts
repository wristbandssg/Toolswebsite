// One-time (but safe to re-run) batch setup script: creates the 12 tools
// of the Loan Calculators expansion sub-batch 7 (Payday, Title & Pawn Shop
// Loans), filed under Finance Calculators > Loan Calculators > Short-Term &
// High-Cost Loan Calculators. See src/lib/calc-engine-loan-high-cost.ts for
// the math and src/lib/calc-engine-loan-debt-consolidation.ts for the full
// batch context.
//
// If the "Short-Term & High-Cost Loan Calculators" sub-category doesn't
// exist yet, it is created under Loan Calculators.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-high-cost-calculators.ts
// or
//   npm run db:create-loan-high-cost-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "loan-calculators";
const CATEGORY = { name: "Short-Term & High-Cost Loan Calculators", slug: "short-term-loan-calculators" };

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
    slug: "payday-loan-calculator",
    title: "Payday Loan Calculator",
    description: "Turn a payday lender's fee per $100 into the dollar fee, the amount due on payday, the APR, and how much of your next paycheck it will take.",
    metaTitle: "Payday Loan Calculator — Fee, APR & Paycheck Share",
    metaDescription: "Free payday loan calculator. Convert the fee per $100 into dollars and APR, and see how much of your next paycheck repaying it will take.",
    calcInputs: [
      currencyField("amount", "Amount Borrowed", { default: 400, max: 5000, step: 25 }),
      currencyField("feePer100", "Fee per $100 Borrowed", { default: 15, max: 100, step: 1 }),
      numberField("termDays", "Days Until Due", { default: 14, min: 1, max: 62, step: 1 }),
      currencyField("nextPaycheck", "Your Next Paycheck (Take-Home)", { default: 1200, max: 100000, step: 50 }),
    ],
    calcResult: { label: "APR", format: "percentage" },
    calcResults: [
      { key: "fee", label: "Fee", format: "currency" },
      { key: "totalDue", label: "Total Due on Payday", format: "currency" },
      { key: "aprPercent", label: "APR", format: "percentage", highlight: true },
      { key: "shareOfPaycheckPercent", label: "Share of Your Next Paycheck", format: "percentage" },
      { key: "paycheckLeftOver", label: "Paycheck Left After Repaying", format: "currency" },
    ],
    instructions:
      "Payday lenders usually quote a fee per $100 borrowed rather than an interest rate. Enter the amount, the fee " +
      "per $100, the days until the loan is due, and your next take-home paycheck.\n\n" +
      "The last two results matter most: if repaying leaves too little for rent and bills, you're likely to need " +
      "another loan — which is how the payday debt cycle starts.",
    examples:
      "Example: borrowing $400 at $15 per $100 for 14 days costs a $60 fee, so $460 is due — an APR of 391.07%. That's " +
      "38.33% of a $1,200 paycheck, leaving $740 for everything else.",
    assumptions:
      "APR = fee ÷ amount × 365 ÷ days. Fee limits, maximum loan sizes, and whether payday loans are allowed at all " +
      "vary by state. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What are cheaper alternatives to a payday loan?",
        answer: "A credit union payday alternative loan (PAL, capped at 28% APR), an employer paycheck advance, a payment plan with the company you owe, local assistance programmes, or a small personal loan usually cost far less.",
      },
    ],
  },
  {
    slug: "payday-loan-payment-calculator",
    title: "Payday Loan Payment Calculator",
    description: "For an installment payday loan repaid in fixed payments, find the total you'll repay, the finance charge, and the true APR from the payment schedule.",
    metaTitle: "Payday Loan Payment Calculator — Installment APR",
    metaDescription: "Free installment payday loan calculator. Enter the payment schedule to find the total repaid, finance charge and the true APR.",
    calcInputs: [
      currencyField("amount", "Amount Borrowed", { default: 1000, max: 10000, step: 50 }),
      currencyField("paymentAmount", "Each Payment", { default: 160, max: 10000, step: 5 }),
      numberField("numberOfPayments", "Number of Payments", { default: 10, min: 1, max: 104, step: 1 }),
      {
        key: "periodsPerYear", label: "How Often You Pay", type: "dropdown", required: true, default: 26,
        options: [
          { label: "Every Two Weeks", value: 26 },
          { label: "Weekly", value: 52 },
          { label: "Monthly", value: 12 },
        ],
      },
    ],
    calcResult: { label: "APR", format: "percentage" },
    calcResults: [
      { key: "totalRepaid", label: "Total Repaid", format: "currency" },
      { key: "totalFinanceCharge", label: "Finance Charge", format: "currency" },
      { key: "aprPercent", label: "APR", format: "percentage", highlight: true },
      { key: "costPer100Borrowed", label: "Cost per $100 Borrowed", format: "currency" },
      { key: "weeksToRepay", label: "Weeks to Repay", format: "number", unit: "weeks" },
    ],
    instructions:
      "Installment payday loans are repaid in several fixed payments instead of one lump sum. Enter the amount you " +
      "receive, the amount of each payment, how many payments there are, and how often they're due. The tool works " +
      "out the APR from that schedule — the number to compare with other loans.",
    examples:
      "Example: borrowing $1,000 and repaying $160 every two weeks for 10 payments means repaying $1,600 — a $600 " +
      "finance charge, or $60 per $100 — over 20 weeks. The APR is 249.75%.",
    assumptions:
      "Assumes the first payment is due one period after you receive the money and that all payments are equal. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is an installment payday loan better than a regular one?",
        answer: "Smaller payments are easier to manage than one big lump sum, but the total cost is often higher because you borrow for longer at a very high rate.",
      },
    ],
  },
  {
    slug: "payday-loan-cost-calculator",
    title: "Payday Loan Cost Calculator",
    description: "See what a payday loan really costs when you roll it over several times — including states that require you to pay down part of the principal at each renewal.",
    metaTitle: "Payday Loan Cost Calculator — Rollovers & Paydowns",
    metaDescription: "Free payday loan cost calculator. Add up fees over several rollovers, with optional principal paydowns, and see days in debt and total paid.",
    calcInputs: [
      currencyField("amount", "Amount Borrowed", { default: 500, max: 5000, step: 25 }),
      currencyField("feePer100", "Fee per $100", { default: 15, max: 100, step: 1 }),
      numberField("termDays", "Days per Loan Period", { default: 14, min: 1, max: 62, step: 1 }),
      numberField("rollovers", "Number of Rollovers / Renewals", { default: 4, min: 0, max: 26, step: 1 }),
      percentField("paydownPercent", "Principal Paid Down at Each Renewal", { default: 10, max: 100, step: 5, required: false }),
    ],
    calcResult: { label: "Total Fees", format: "currency" },
    calcResults: [
      { key: "totalFees", label: "Total Fees", format: "currency", highlight: true },
      { key: "daysInDebt", label: "Days in Debt", format: "number", unit: "days" },
      { key: "owedAfterRollovers", label: "Still Owed at the Final Due Date", format: "currency" },
      { key: "totalPaid", label: "Total Paid (Loan + Fees)", format: "currency" },
      { key: "feesAsPercentOfLoan", label: "Fees as % of Amount Borrowed", format: "percentage" },
    ],
    instructions:
      "Enter the amount, the fee per $100, the length of each loan period, how many times you expect to roll the loan " +
      "over, and how much of the original amount you must pay down at each renewal (some states require a paydown; " +
      "enter 0 if yours doesn't). Each renewal charges a new fee on what's still owed.",
    examples:
      "Example: $500 at $15 per $100, rolled over 4 times with a 10% paydown each time, keeps you in debt for 70 days. " +
      "Fees total $300 — 60% of the amount borrowed — and you still owe $300 at the final due date, paying $800 in " +
      "all.",
    assumptions:
      "Assumes the same fee rate on every renewal. Many states limit or ban rollovers. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the 'payday debt trap'?",
        answer: "When repaying the full amount leaves you short, you renew the loan and pay another fee — over and over — so fees pile up while the amount you owe barely falls.",
      },
    ],
  },
  {
    slug: "payday-loan-payoff-calculator",
    title: "Payday Loan Payoff Calculator",
    description: "Compare rolling a payday loan over until you can pay it with using a no-fee Extended Payment Plan, and see the installment and the savings.",
    metaTitle: "Payday Loan Payoff Calculator — Extended Payment Plan",
    metaDescription: "Free payday loan payoff calculator. Compare rolling over with a no-fee extended payment plan and see your installment and savings.",
    calcInputs: [
      currencyField("amount", "Amount Borrowed", { default: 500, max: 5000, step: 25 }),
      currencyField("feePer100", "Fee per $100", { default: 15, max: 100, step: 1 }),
      numberField("rolloversNeeded", "Rollovers You'd Need to Pay It Off", { default: 3, min: 0, max: 26, step: 1 }),
      numberField("eppInstallments", "Extended Payment Plan Installments", { default: 4, min: 1, max: 12, step: 1 }),
    ],
    calcResult: { label: "Savings With the Payment Plan", format: "currency" },
    calcResults: [
      { key: "eppInstallment", label: "Payment Plan — Each Installment", format: "currency" },
      { key: "eppTotalCost", label: "Payment Plan — Total Paid", format: "currency" },
      { key: "rolloverTotalCost", label: "Rolling Over — Total Paid", format: "currency" },
      { key: "savingsWithEpp", label: "Savings With the Payment Plan", format: "currency", highlight: true },
    ],
    instructions:
      "Some states require payday lenders to offer an Extended Payment Plan (EPP) — often four equal installments on " +
      "your next paydays — with no extra fees, if you ask before the loan is due. Lenders who belong to the main " +
      "industry association also promise to offer one.\n\n" +
      "Enter the amount, fee, how many times you'd otherwise roll the loan over, and the number of EPP installments.",
    examples:
      "Example: a $500 loan with a $75 fee becomes $575. Split into 4 plan installments, that's $143.75 each. Rolling " +
      "over 3 times instead costs $800 — the payment plan saves $225.",
    assumptions:
      "EPP rules (who qualifies, how many installments, how often you can use one) differ by state and lender. Ask " +
      "for it in writing before the due date. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I ask for an extended payment plan?",
        answer: "Contact the lender before the due date (usually by the last business day before it) and ask specifically for an 'extended payment plan'. Get the schedule in writing.",
      },
    ],
  },
  {
    slug: "title-loan-calculator",
    title: "Title Loan Calculator",
    description: "See how much a title lender may lend against your car, the monthly fee and lien fee, the amount due in 30 days, and the APR.",
    metaTitle: "Title Loan Calculator — Amount, Fees & APR",
    metaDescription: "Free car title loan calculator. See the most you can borrow against your car, the finance charge, the amount due and the APR.",
    calcInputs: [
      currencyField("carValue", "Car's Value", { default: 8000, max: 1000000, step: 250 }),
      percentField("maxLtvPercent", "Lender's Maximum Loan-to-Value", { default: 40, max: 100, step: 5 }),
      currencyField("amountWanted", "Amount You Want", { default: 2500, max: 1000000, step: 50 }),
      percentField("monthlyFeePercent", "Monthly Finance Fee", { default: 25, max: 50, step: 1 }),
      currencyField("lienFee", "Lien / Title Fee", { default: 25, max: 1000, step: 5, required: false }),
      numberField("termDays", "Loan Length (Days)", { default: 30, min: 1, max: 90, step: 1 }),
    ],
    calcResult: { label: "APR", format: "percentage" },
    calcResults: [
      { key: "maxLoan", label: "Most the Lender May Lend", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "financeCharge", label: "Finance Charge + Fees", format: "currency" },
      { key: "totalDue", label: "Total Due", format: "currency" },
      { key: "aprPercent", label: "APR", format: "percentage", highlight: true },
    ],
    instructions:
      "A title loan uses your car's title as security. Lenders typically lend 25%–50% of the car's value, often for " +
      "30 days, charging a monthly fee (commonly around 25%) plus fees for recording the lien. Enter the car's value, " +
      "the lender's loan-to-value limit, the amount you want, and the fees.",
    examples:
      "Example: on an $8,000 car with a 40% limit, the lender could lend up to $3,200. Borrowing $2,500 for 30 days " +
      "at 25% plus a $25 lien fee costs $650, so $3,150 is due — an APR of 316.33%.",
    assumptions:
      "If you can't repay, the lender can repossess the car. Title loans are banned or capped in many states. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How often do title loan borrowers lose their car?",
        answer: "A CFPB study found about one in five single-payment title loan sequences ended with the car being repossessed. Treat a title loan as a last resort.",
      },
    ],
  },
  {
    slug: "title-loan-payment-calculator",
    title: "Title Loan Payment Calculator",
    description: "Find the monthly payment on an installment title loan at a triple-digit APR, the total you'll repay, and how it compares with your car's value.",
    metaTitle: "Title Loan Payment Calculator — Installment Loans",
    metaDescription: "Free installment title loan payment calculator. See the monthly payment, total interest and total repaid compared with your car's value.",
    calcInputs: [
      currencyField("amount", "Loan Amount", { default: 3000, max: 1000000, step: 50 }),
      percentField("aprPercent", "APR", { default: 150, max: 400, step: 1 }),
      numberField("termMonths", "Loan Term (Months)", { default: 12, min: 1, max: 48, step: 1 }),
      currencyField("carValue", "Car's Value", { default: 9000, max: 1000000, step: 250 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalRepaid", label: "Total Repaid", format: "currency" },
      { key: "interestPercentOfLoan", label: "Interest as % of the Loan", format: "percentage" },
      { key: "totalRepaidPercentOfCar", label: "Total Repaid as % of Car Value", format: "percentage" },
    ],
    instructions:
      "Some title lenders offer installment loans repaid monthly over several months or years instead of in one lump " +
      "sum. Enter the amount, the APR from your loan agreement, the term, and your car's value. The tool shows the " +
      "payment and how close the total repaid comes to the value of the car you're pledging.",
    examples:
      "Example: $3,000 at 150% APR over 12 months costs $495.58 a month. You repay $5,947 in total — $2,947 of " +
      "interest, or 98.23% of the loan — which is 66.08% of a $9,000 car's value.",
    assumptions:
      "Assumes a fixed APR and equal monthly payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I refinance a title loan?",
        answer: "Yes — a credit union or online personal loan at a far lower rate can pay it off and release your title. Even with fair or poor credit, the savings can be large.",
      },
    ],
  },
  {
    slug: "title-loan-cost-calculator",
    title: "Title Loan Cost Calculator",
    description: "See how fees pile up when a title loan is renewed month after month by paying only the fee — compared with the loan and with your car's value.",
    metaTitle: "Title Loan Cost Calculator — Cost of Renewing",
    metaDescription: "Free title loan cost calculator. See how much renewing a title loan by paying only the fee costs over several months vs your car's value.",
    calcInputs: [
      currencyField("amount", "Loan Amount", { default: 2000, max: 1000000, step: 50 }),
      percentField("monthlyFeePercent", "Monthly Finance Fee", { default: 25, max: 50, step: 1 }),
      numberField("monthsRenewed", "Times You Renew (Pay Only the Fee)", { default: 6, min: 0, max: 36, step: 1 }),
      currencyField("carValue", "Car's Value", { default: 7000, max: 1000000, step: 250 }),
    ],
    calcResult: { label: "Total Fees Paid", format: "currency" },
    calcResults: [
      { key: "monthlyFee", label: "Fee Each Month", format: "currency" },
      { key: "totalFeesPaid", label: "Total Fees Paid", format: "currency", highlight: true },
      { key: "totalPaid", label: "Total Paid (Loan + Fees)", format: "currency" },
      { key: "feesAsPercentOfLoan", label: "Fees as % of the Loan", format: "percentage" },
      { key: "feesAsPercentOfCar", label: "Fees as % of Car Value", format: "percentage" },
    ],
    instructions:
      "When a 30-day title loan comes due, many borrowers pay only the fee and renew it, still owing the full amount. " +
      "Enter the loan, the monthly fee, how many times you might renew, and your car's value. Fees are counted for each " +
      "renewal plus the final month when you repay.",
    examples:
      "Example: a $2,000 loan at 25% a month costs $500 each month. Renewing 6 times and then repaying means 7 fees " +
      "— $3,500, or 175% of the loan and 50% of a $7,000 car — for $5,500 paid in total.",
    assumptions:
      "Assumes the fee is the same every month and no principal is repaid until the end. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I stop renewing?",
        answer: "Pay a little principal with every fee, ask the lender for a payment plan, or refinance with a cheaper lender. Every dollar of principal you pay cuts the next month's fee.",
      },
    ],
  },
  {
    slug: "title-loan-payoff-calculator",
    title: "Title Loan Payoff Calculator",
    description: "See how many months it takes to pay off a title loan when each payment covers the monthly fee plus some principal, and the payment needed to finish by a target.",
    metaTitle: "Title Loan Payoff Calculator — Get Your Title Back",
    metaDescription: "Free title loan payoff calculator. See months to pay off and total fees with your payment, and the payment needed to finish by a target.",
    calcInputs: [
      currencyField("balance", "Amount Owed", { default: 2000, max: 1000000, step: 50 }),
      percentField("monthlyRatePercent", "Monthly Fee / Interest Rate", { default: 15, max: 50, step: 0.5 }),
      currencyField("monthlyPayment", "What You Can Pay Each Month", { default: 500, max: 100000, step: 10 }),
      numberField("targetMonths", "Target Months to Pay Off", { default: 4, min: 1, max: 36, step: 1 }),
    ],
    calcResult: { label: "Months to Pay Off", format: "number", unit: "months" },
    calcResults: [
      { key: "firstMonthFee", label: "First Month's Fee", format: "currency" },
      { key: "monthsToPayoff", label: "Months to Pay Off", format: "number", unit: "months", highlight: true },
      { key: "totalFeesPaid", label: "Total Fees Paid", format: "currency" },
      { key: "paymentForTarget", label: "Payment Needed for Target", format: "currency" },
    ],
    instructions:
      "Enter what you owe, the monthly fee or interest rate (a monthly rate, not an APR), what you can pay each month, " +
      "and when you'd like to be done. Each payment first covers that month's fee on the remaining balance, and the " +
      "rest reduces what you owe. If your payment doesn't cover the fee, the loan never gets paid off and the tool " +
      "shows 0 months.",
    examples:
      "Example: $2,000 at 15% a month starts with a $300 fee. Paying $500 a month clears it in 7 months with $1,286.64 " +
      "of fees. To finish in 4 months you'd need to pay $700.53 a month.",
    assumptions:
      "Assumes the lender applies anything above the fee to principal — confirm this, as some single-payment title " +
      "loans don't allow part-payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When do I get my title back?",
        answer: "Once the loan is paid in full, the lender must release the lien and return the title. Keep proof of your final payment.",
      },
    ],
  },
  {
    slug: "pawn-shop-loan-calculator",
    title: "Pawn Shop Loan Calculator",
    description: "Estimate what a pawn shop may lend on an item, the finance charge, the amount needed to get the item back, and the APR.",
    metaTitle: "Pawn Shop Loan Calculator — Loan, Charge & APR",
    metaDescription: "Free pawn shop loan calculator. Estimate the loan on your item, the monthly finance charge, the amount to redeem it, and the APR.",
    calcInputs: [
      currencyField("itemValue", "Item's Resale Value", { default: 600, max: 1000000, step: 25 }),
      percentField("loanToValuePercent", "Share of Value the Shop Lends", { default: 50, max: 100, step: 5 }),
      percentField("monthlyChargePercent", "Monthly Finance Charge", { default: 20, max: 30, step: 0.5 }),
      currencyField("otherFees", "Storage / Setup Fees", { default: 0, max: 1000, step: 5, required: false }),
      numberField("months", "Months Until You Redeem", { default: 1, min: 1, max: 12, step: 1 }),
    ],
    calcResult: { label: "Amount to Redeem", format: "currency" },
    calcResults: [
      { key: "loanOffered", label: "Estimated Loan Offer", format: "currency" },
      { key: "financeCharge", label: "Finance Charge + Fees", format: "currency" },
      { key: "redeemAmount", label: "Amount to Redeem", format: "currency", highlight: true },
      { key: "aprPercent", label: "APR", format: "percentage" },
    ],
    instructions:
      "Pawn shops usually lend a fraction (often 25%–60%) of what they could resell the item for, and charge a monthly " +
      "finance charge that's set or capped by state law. Enter the item's resale value, the share the shop lends, the " +
      "monthly charge, any extra fees, and how many months you'll take to redeem it.",
    examples:
      "Example: on an item that would resell for $600, a shop lending 50% offers $300. At 20% a month, redeeming after " +
      "1 month costs $360 — a $60 charge, or an APR of 243.33%.",
    assumptions:
      "A month is counted as 30 days. If you don't redeem or extend by the end of the loan (plus any grace period), " +
      "the shop keeps the item and you owe nothing more. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does a pawn loan affect my credit?",
        answer: "No. Pawn shops don't usually check or report to credit bureaus — if you don't repay, you simply lose the item.",
      },
    ],
  },
  {
    slug: "pawn-shop-loan-payment-calculator",
    title: "Pawn Shop Loan Payment Calculator",
    description: "See the monthly payment needed to keep extending a pawn loan, the total paid to do so, and the final amount to get your item back.",
    metaTitle: "Pawn Shop Loan Payment Calculator — Extensions",
    metaDescription: "Free pawn shop loan payment calculator. See the monthly extension payment, total charges over several extensions, and the final redeem amount.",
    calcInputs: [
      currencyField("loanAmount", "Pawn Loan Amount", { default: 300, max: 1000000, step: 25 }),
      percentField("monthlyChargePercent", "Monthly Finance Charge", { default: 20, max: 30, step: 0.5 }),
      numberField("extensions", "Months You'll Extend", { default: 3, min: 0, max: 24, step: 1 }),
    ],
    calcResult: { label: "Monthly Extension Payment", format: "currency" },
    calcResults: [
      { key: "extensionPayment", label: "Monthly Extension Payment", format: "currency", highlight: true },
      { key: "chargesPaidExtending", label: "Charges Paid to Extend", format: "currency" },
      { key: "finalRedeemAmount", label: "Final Amount to Redeem", format: "currency" },
      { key: "totalPaid", label: "Total Paid", format: "currency" },
      { key: "chargesAsPercentOfLoan", label: "All Charges as % of the Loan", format: "percentage" },
    ],
    instructions:
      "If you can't redeem your item when the pawn is due, most shops let you extend (renew) it by paying just that " +
      "month's charge. Enter the loan amount, the monthly charge, and how many months you expect to extend. The tool " +
      "shows the payment each month and what you'll have paid by the time you redeem.",
    examples:
      "Example: a $300 pawn at 20% a month costs $60 to extend each month. Extending 3 times costs $180, then $360 " +
      "redeems the item — $540 in total, with charges equal to 80% of the loan.",
    assumptions:
      "Assumes the same charge each month and no principal paid until the end. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is there a limit on extensions?",
        answer: "It depends on the shop and state law. Ask before you pawn, and always get a receipt for each extension payment.",
      },
    ],
  },
  {
    slug: "pawn-shop-loan-cost-calculator",
    title: "Pawn Shop Loan Cost Calculator",
    description: "Weigh your options with a pawned item: what it costs to redeem, what you lose if you forfeit it, and how much more cash selling would give.",
    metaTitle: "Pawn Shop Loan Cost Calculator — Redeem, Forfeit or Sell",
    metaDescription: "Free pawn shop loan cost calculator. Compare the cost of redeeming, the loss if you forfeit, and the cash from selling the item instead.",
    calcInputs: [
      currencyField("loanOffer", "Pawn Loan Offer", { default: 300, max: 1000000, step: 25 }),
      percentField("monthlyChargePercent", "Monthly Finance Charge", { default: 20, max: 30, step: 0.5 }),
      numberField("monthsUntilRedeem", "Months Until You Could Redeem", { default: 2, min: 1, max: 12, step: 1 }),
      currencyField("saleOffer", "Offer to Buy the Item Outright", { default: 350, max: 1000000, step: 25 }),
      currencyField("replacementCost", "Cost to Replace the Item", { default: 800, max: 1000000, step: 25 }),
    ],
    calcResult: { label: "Cost to Redeem", format: "currency" },
    calcResults: [
      { key: "costToRedeem", label: "Cost to Redeem", format: "currency", highlight: true },
      { key: "totalToGetItemBack", label: "Total to Get the Item Back", format: "currency" },
      { key: "lossIfForfeited", label: "Loss If You Forfeit (Replacement − Loan)", format: "currency" },
      { key: "extraCashFromSelling", label: "Extra Cash From Selling Instead", format: "currency" },
      { key: "redeemCostVsReplacing", label: "Saved by Redeeming vs Replacing", format: "currency" },
    ],
    instructions:
      "Enter the pawn loan you're offered, the monthly charge, how long until you could repay, the shop's offer to buy " +
      "the item outright, and what it would cost to replace. If you'll need the item again, redeeming is usually far " +
      "cheaper than replacing it. If you won't, selling often gives more cash than pawning.",
    examples:
      "Example: a $300 pawn at 20% for 2 months costs $120 in charges — $420 to get the item back. Forfeiting an item " +
      "that costs $800 to replace loses $500 of value. Selling outright would give $50 more cash than the loan, and " +
      "redeeming saves $380 compared with buying a replacement.",
    assumptions:
      "Ignores sentimental value, which can't be replaced at any price. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does selling pay more than pawning?",
        answer: "When a shop buys an item, it owns it immediately and can resell it. When it lends, it has to hold the item and may get it back only at the loan amount, so it offers less.",
      },
    ],
  },
  {
    slug: "pawn-shop-loan-payoff-calculator",
    title: "Pawn Shop Loan Payoff Calculator",
    description: "See how quickly monthly part-payments pay off a pawn loan and how much they save compared with paying only the charge and redeeming at the end.",
    metaTitle: "Pawn Shop Loan Payoff Calculator — Part-Payments",
    metaDescription: "Free pawn shop loan payoff calculator. See months to redeem with monthly part-payments and the charges saved vs interest-only extensions.",
    calcInputs: [
      currencyField("loanAmount", "Pawn Loan Amount", { default: 400, max: 1000000, step: 25 }),
      percentField("monthlyChargePercent", "Monthly Finance Charge", { default: 20, max: 30, step: 0.5 }),
      currencyField("monthlyPayment", "What You Can Pay Each Month", { default: 150, max: 100000, step: 5 }),
    ],
    calcResult: { label: "Months to Redeem", format: "number", unit: "months" },
    calcResults: [
      { key: "monthsToRedeem", label: "Months to Redeem", format: "number", unit: "months", highlight: true },
      { key: "totalCharges", label: "Total Charges", format: "currency" },
      { key: "totalPaid", label: "Total Paid", format: "currency" },
      { key: "chargesIfInterestOnly", label: "Charges If You Only Paid Interest", format: "currency" },
      { key: "savedByPartPayments", label: "Saved by Part-Payments", format: "currency" },
    ],
    instructions:
      "Some pawn shops accept part-payments that reduce the loan, so each month's charge is smaller. Enter the loan, " +
      "the monthly charge, and what you can pay each month. The tool compares that with paying only the charge for " +
      "the same number of months and repaying the loan in one go at the end.",
    examples:
      "Example: a $400 pawn at 20% a month, paid at $150 a month, is redeemed in 5 months with $229.09 of charges — " +
      "$629.09 in total. Paying only the $80 charge for 5 months would cost $400, so part-payments save $170.91.",
    assumptions:
      "Ask the shop whether part-payments reduce the principal — not all shops accept them. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens if I miss the due date?",
        answer: "Most states give a short grace period (often 30 days). After that, the shop can keep and sell the item. Contact the shop before the deadline if you need more time.",
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
