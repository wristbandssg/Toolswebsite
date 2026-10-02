// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the Loan Calculators expansion sub-batch 3 (Wedding & Vacation Loans),
// filed under Finance Calculators > Loan Calculators > Personal Loan
// Calculators. See src/lib/calc-engine-loan-wedding-vacation.ts for the math
// and src/lib/calc-engine-loan-debt-consolidation.ts for the full batch
// context.
//
// If the "Personal Loan Calculators" sub-category doesn't exist yet, it is
// created under Loan Calculators.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-wedding-vacation-calculators.ts
// or
//   npm run db:create-loan-wedding-vacation-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "loan-calculators";
const CATEGORY = { name: "Personal Loan Calculators", slug: "personal-loan-calculators" };

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
    slug: "wedding-loan-calculator",
    title: "Wedding Loan Calculator",
    description: "Start from your wedding budget, subtract savings and family help, and see how much to borrow, the monthly payment, and what the wedding really costs with interest.",
    metaTitle: "Wedding Loan Calculator — Budget, Payment & Cost",
    metaDescription: "Free wedding loan calculator. Subtract savings and family help from your budget, see the loan and payment, and the true cost with interest.",
    calcInputs: [
      currencyField("weddingBudget", "Total Wedding Budget", { default: 30000, max: 10000000, step: 500 }),
      currencyField("savings", "Your Savings for the Wedding", { default: 10000, max: 10000000, step: 250, required: false }),
      currencyField("familyContribution", "Family Contributions", { default: 5000, max: 10000000, step: 250, required: false }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 84, step: 6 }),
      percentField("originationFeePercent", "Origination Fee", { default: 0, max: 12, step: 0.25, required: false }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "cashNeeded", label: "Cash Still Needed", format: "currency" },
      { key: "loanAmount", label: "Loan Amount (Incl. Any Fee)", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "weddingCostWithBorrowing", label: "Wedding's Real Cost With Borrowing", format: "currency" },
    ],
    instructions:
      "Enter your total wedding budget, what you've saved, and what family members are contributing. The rest is " +
      "the cash you need to borrow. Add the loan's rate, term, and any origination fee — if the fee is taken out of " +
      "the loan, the tool borrows a little more so you still receive the full amount.\n\n" +
      "The last line shows what the wedding costs once interest and fees are added to the budget.",
    examples:
      "Example: a $30,000 wedding with $10,000 saved and $5,000 from family leaves $15,000 to borrow. At 11% over 36 " +
      "months the payment is $491.08 and interest totals $2,678.91, so the wedding really costs $32,678.91.",
    assumptions:
      "Assumes a fixed-rate personal loan with equal monthly payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is it a good idea to borrow for a wedding?",
        answer: "It can make sense for a small gap you can repay quickly, but the debt follows you into married life. Trimming the guest list or saving for a few more months often costs far less than interest.",
      },
    ],
  },
  {
    slug: "wedding-loan-payment-calculator",
    title: "Wedding Loan Payment Calculator",
    description: "See the monthly payment on a wedding loan and a fair split between two partners based on each person's take-home pay.",
    metaTitle: "Wedding Loan Payment Calculator — Split by Income",
    metaDescription: "Free wedding loan payment calculator. See the monthly payment, each partner's fair share by income, and the payment as a share of your pay.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 1000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 84, step: 6 }),
      currencyField("partner1Income", "Partner 1 Monthly Take-Home Pay", { default: 4000, max: 1000000, step: 100 }),
      currencyField("partner2Income", "Partner 2 Monthly Take-Home Pay", { default: 3000, max: 1000000, step: 100 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "partner1Share", label: "Partner 1's Share", format: "currency" },
      { key: "partner2Share", label: "Partner 2's Share", format: "currency" },
      { key: "paymentPercentOfIncome", label: "Payment as % of Combined Pay", format: "percentage" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, rate, and term, and each partner's monthly take-home pay. The tool works out the " +
      "monthly payment and splits it in proportion to income, so each of you pays the same share of what you earn. " +
      "For a 50/50 split, enter the same income for both.",
    examples:
      "Example: a $15,000 loan at 11% over 36 months costs $491.08 a month — 7.02% of a combined $7,000 take-home. " +
      "Split by income, partner 1 (earning $4,000) pays $280.62 and partner 2 (earning $3,000) pays $210.46.",
    assumptions:
      "Who owes the lender depends on whose name is on the loan, not on how you split it at home. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should one partner take the loan alone?",
        answer: "Only the borrower (and any co-borrower) is legally responsible. If one partner applies alone, agree in writing how the payments will be shared.",
      },
    ],
  },
  {
    slug: "wedding-loan-payoff-calculator",
    title: "Wedding Loan Payoff Calculator",
    description: "See how putting cash wedding gifts toward your wedding loan shortens it and how much interest it saves.",
    metaTitle: "Wedding Loan Payoff Calculator — Use Cash Gifts",
    metaDescription: "Free wedding loan payoff calculator. Put cash wedding gifts toward the loan after the big day and see the months and interest you save.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 1000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 84, step: 6 }),
      currencyField("cashGifts", "Cash Gifts Put Toward the Loan", { default: 4000, max: 1000000, step: 100 }),
      numberField("monthsAfterWedding", "Payments Made Before the Gifts Go In", { default: 2, min: 0, max: 84, step: 1 }),
    ],
    calcResult: { label: "Interest Saved", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "balanceWhenGiftsPaid", label: "Balance When Gifts Are Paid In", format: "currency" },
      { key: "newPayoffMonths", label: "New Total Payoff Time", format: "number", unit: "months" },
      { key: "monthsSaved", label: "Months Saved", format: "number", unit: "months" },
      { key: "interestSaved", label: "Interest Saved", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan amount, rate, and term, how much of your cash wedding gifts you'll put toward the loan, and how " +
      "many monthly payments you'll have made by then. The tool applies the gifts as a one-off extra payment and " +
      "keeps your regular payment the same, so the loan ends early.",
    examples:
      "Example: a $15,000 loan at 11% over 36 months costs $491.08 a month. After 2 payments the balance is " +
      "$14,289.60. Paying in $4,000 of gifts ends the loan after 26 months in total — 10 months early, saving " +
      "$1,218.09 in interest.",
    assumptions:
      "Assumes the lump sum goes straight to principal and there's no prepayment penalty. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I lower my payment instead of ending the loan early?",
        answer: "Some lenders will recast (re-amortise) the loan after a large payment, lowering the monthly amount. Most personal loans simply end sooner — ask your lender which applies.",
      },
    ],
  },
  {
    slug: "wedding-loan-interest-calculator",
    title: "Wedding Loan Interest Calculator",
    description: "See the interest on a wedding loan, what it adds per guest, and how much each guest really costs once borrowing is included.",
    metaTitle: "Wedding Loan Interest Calculator — Cost per Guest",
    metaDescription: "Free wedding loan interest calculator. See total interest, interest per guest, and the true cost per guest once borrowing is included.",
    calcInputs: [
      currencyField("weddingBudget", "Total Wedding Budget", { default: 30000, max: 10000000, step: 500 }),
      currencyField("loanAmount", "Amount Borrowed", { default: 15000, max: 10000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 84, step: 6 }),
      numberField("guestCount", "Number of Guests", { default: 100, min: 1, max: 2000, step: 5 }),
    ],
    calcResult: { label: "Interest per Guest", format: "currency" },
    calcResults: [
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "interestPerGuest", label: "Interest per Guest", format: "currency", highlight: true },
      { key: "costPerGuestBefore", label: "Cost per Guest (Budget Only)", format: "currency" },
      { key: "costPerGuestWithInterest", label: "Cost per Guest With Interest", format: "currency" },
      { key: "interestPercentOfBudget", label: "Interest as % of Budget", format: "percentage" },
    ],
    instructions:
      "Enter your total budget, how much of it you'll borrow, the loan's rate and term, and the number of guests. " +
      "Most wedding costs scale with the guest count, so seeing interest per guest is a practical way to decide " +
      "whether a bigger guest list is worth borrowing for.",
    examples:
      "Example: borrowing $15,000 of a $30,000 budget at 12% over 48 months costs $3,960.36 in interest — 13.20% of " +
      "the budget. With 100 guests, each costs $300 before interest and $339.60 after, so borrowing adds $39.60 per " +
      "guest.",
    assumptions:
      "Assumes a fixed rate and equal monthly payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the quickest way to cut the interest?",
        answer: "Borrow less (a smaller guest list is usually the biggest lever) or choose a shorter term. Paying cash gifts into the loan right after the wedding also helps.",
      },
    ],
  },
  {
    slug: "wedding-loan-affordability-calculator",
    title: "Wedding Loan Affordability Calculator",
    description: "Combine what you've saved, what you'll save before the date, and the loan your budget can repay afterwards to find the biggest wedding budget you can afford.",
    metaTitle: "Wedding Loan Affordability Calculator — Max Budget",
    metaDescription: "Free wedding affordability calculator. Add savings, saving until the date and an affordable loan to find your maximum wedding budget.",
    calcInputs: [
      currencyField("currentSavings", "Saved So Far", { default: 8000, max: 10000000, step: 250, required: false }),
      currencyField("monthlySaving", "Monthly Saving Until the Wedding", { default: 600, max: 100000, step: 25, required: false }),
      numberField("monthsUntilWedding", "Months Until the Wedding", { default: 12, min: 0, max: 60, step: 1 }),
      percentField("savingsRatePercent", "Savings Account Interest Rate", { default: 4, max: 15, step: 0.05, required: false }),
      currencyField("loanPaymentBudget", "Loan Payment You Can Afford After", { default: 400, max: 100000, step: 25 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 84, step: 6 }),
    ],
    calcResult: { label: "Maximum Wedding Budget", format: "currency" },
    calcResults: [
      { key: "savedByWedding", label: "Saved by the Wedding Date", format: "currency" },
      { key: "maxLoanAmount", label: "Largest Affordable Loan", format: "currency" },
      { key: "maxWeddingBudget", label: "Maximum Wedding Budget", format: "currency", highlight: true },
      { key: "loanInterest", label: "Interest on That Loan", format: "currency" },
    ],
    instructions:
      "Enter what you've already saved, how much you'll save each month until the wedding, how many months that " +
      "is, and your savings rate. Then enter the monthly loan payment you could comfortably manage after the " +
      "wedding, and the loan's rate and term.\n\n" +
      "The tool adds your savings (with interest) to the loan that payment can repay.",
    examples:
      "Example: $8,000 saved plus $600 a month for 12 months at 4% grows to $15,659.41. A $400 payment at 12% over " +
      "36 months repays a $12,043 loan, so you could afford a $27,702.41 wedding — paying $2,357 in loan interest.",
    assumptions:
      "Savings interest compounds monthly. Only you can decide what payment is comfortable — leave room for an " +
      "emergency fund. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should we borrow the maximum?",
        answer: "The maximum is a ceiling, not a target. Every dollar borrowed costs interest, so the smaller the loan, the better your finances look on day one of married life.",
      },
    ],
  },
  {
    slug: "wedding-loan-comparison-calculator",
    title: "Wedding Loan Comparison Calculator",
    description: "Compare borrowing for your wedding now with saving the same monthly amount first — how long saving takes, and the money each choice costs or earns.",
    metaTitle: "Wedding Loan Comparison Calculator — Borrow vs Save",
    metaDescription: "Free calculator comparing a wedding loan with saving first. See months to save, interest paid vs earned, and how much saving comes out ahead.",
    calcInputs: [
      currencyField("amount", "Amount Needed", { default: 15000, max: 10000000, step: 250 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 84, step: 6 }),
      percentField("savingsRatePercent", "Savings Account Interest Rate", { default: 4, max: 15, step: 0.05, required: false }),
    ],
    calcResult: { label: "How Much Saving Comes Out Ahead", format: "currency" },
    calcResults: [
      { key: "monthlyAmount", label: "Monthly Amount (Loan Payment or Saving)", format: "currency" },
      { key: "loanInterest", label: "Borrow Now — Interest Paid", format: "currency" },
      { key: "monthsToSave", label: "Save First — Months to Reach the Goal", format: "number", unit: "months" },
      { key: "monthsSooner", label: "Save First — Months Sooner Than the Loan Ends", format: "number", unit: "months" },
      { key: "interestEarnedSaving", label: "Save First — Interest Earned", format: "currency" },
      { key: "advantageOfSaving", label: "How Much Saving Comes Out Ahead", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the amount you need, the loan's rate and term, and your savings account rate. The tool takes the loan's " +
      "monthly payment and asks: what if you saved that same amount each month instead and married when the money " +
      "was there?\n\n" +
      "Borrowing gets you the wedding sooner but costs interest; saving delays it but earns interest. The " +
      "difference between the two paths is both figures added together.",
    examples:
      "Example: $15,000 at 12% over 36 months costs $498.21 a month and $2,935.73 in interest. Saving $498.21 a " +
      "month at 4% reaches $15,000 in 29 months — 7 months before the loan would end — earning $694.92. Saving " +
      "first comes out $3,630.65 ahead.",
    assumptions:
      "Assumes the same monthly amount on both paths and a steady savings rate. Wedding prices can rise while you " +
      "save. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can we do a bit of both?",
        answer: "Yes — saving for part of the cost and borrowing the rest shortens both the wait and the loan. Try a smaller amount in this calculator to see the effect.",
      },
    ],
  },
  {
    slug: "wedding-loan-eligibility-calculator",
    title: "Wedding Loan Eligibility Calculator",
    description: "Compare applying for a wedding loan alone with applying jointly: debt-to-income both ways, and how the lower credit score affects a joint application.",
    metaTitle: "Wedding Loan Eligibility Calculator — Solo vs Joint",
    metaDescription: "Free wedding loan eligibility calculator. Compare DTI applying alone vs jointly and see how both credit scores measure up to a lender minimum.",
    calcInputs: [
      currencyField("income1", "Applicant 1 Gross Monthly Income", { default: 4500, max: 1000000, step: 100 }),
      currencyField("income2", "Applicant 2 Gross Monthly Income", { default: 3500, max: 1000000, step: 100, required: false }),
      currencyField("debts1", "Applicant 1 Monthly Debt Payments (Incl. Rent)", { default: 1500, max: 100000, step: 25 }),
      currencyField("debts2", "Applicant 2 Monthly Debt Payments", { default: 400, max: 100000, step: 25, required: false }),
      numberField("score1", "Applicant 1 Credit Score", { default: 700, min: 300, max: 850, step: 1 }),
      numberField("score2", "Applicant 2 Credit Score", { default: 660, min: 300, max: 850, step: 1 }),
      numberField("lenderMinScore", "Lender's Minimum Score", { default: 640, min: 300, max: 850, step: 1 }),
      currencyField("loanAmount", "Loan Amount", { default: 20000, max: 1000000, step: 250 }),
      percentField("annualRatePercent", "Expected Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 84, step: 6 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 40, max: 60, step: 1 }),
    ],
    calcResult: { label: "Joint DTI", format: "percentage" },
    calcResults: [
      { key: "monthlyPayment", label: "Loan Payment", format: "currency" },
      { key: "soloDtiPercent", label: "Applicant 1 Alone — DTI", format: "percentage" },
      { key: "jointDtiPercent", label: "Joint — DTI", format: "percentage", highlight: true },
      { key: "jointHeadroomPercent", label: "Joint — Room Under DTI Limit", format: "percentage" },
      { key: "soloScoreMargin", label: "Applicant 1 — Points Above Minimum", format: "number" },
      { key: "jointScoreMargin", label: "Joint (Lower Score) — Points Above Minimum", format: "number" },
    ],
    instructions:
      "Enter each partner's gross monthly income, monthly debt payments, and credit score, plus the loan and the " +
      "lender's guidelines. The tool compares applicant 1 applying alone with a joint application.\n\n" +
      "A joint application pools income and debts, which usually lowers DTI. Many lenders look at the lower of " +
      "the two credit scores, so a joint application can face a stricter score test.",
    examples:
      "Example: a $20,000 loan at 12% over 48 months costs $526.68 a month. Alone, applicant 1's DTI would be " +
      "45.04% — over a 40% limit. Jointly it's 30.33%, with 9.67 points to spare. Applicant 1's 700 score is 60 " +
      "points above a 640 minimum; the lower joint score of 660 is 20 above.",
    assumptions:
      "Lenders differ in how they treat joint applications and which score they use. Both borrowers are fully " +
      "responsible for a joint loan. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a co-signer the same as a co-borrower?",
        answer: "Not quite. A co-borrower shares the loan and usually the money; a co-signer only guarantees it. Both are legally responsible if payments are missed.",
      },
    ],
  },
  {
    slug: "vacation-loan-calculator",
    title: "Vacation Loan Calculator",
    description: "Build your trip budget from flights, nightly lodging and daily spending, subtract savings, and see the loan payment and what the trip costs with interest.",
    metaTitle: "Vacation Loan Calculator — Trip Budget & Payment",
    metaDescription: "Free vacation loan calculator. Add up flights, lodging and daily spending, subtract savings, and see your loan payment and trip cost with interest.",
    calcInputs: [
      currencyField("flights", "Flights / Transport", { default: 1800, max: 1000000, step: 50 }),
      currencyField("lodgingPerNight", "Lodging per Night", { default: 200, max: 100000, step: 10 }),
      numberField("nights", "Number of Nights", { default: 7, min: 0, max: 365, step: 1 }),
      currencyField("dailySpending", "Daily Spending (Food, Activities)", { default: 150, max: 100000, step: 10 }),
      currencyField("otherCosts", "Other Costs (Insurance, Visas, Gear)", { default: 300, max: 1000000, step: 25, required: false }),
      currencyField("savings", "Savings for the Trip", { default: 1000, max: 1000000, step: 50, required: false }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 13, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 12, min: 3, max: 60, step: 3 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "tripCost", label: "Total Trip Cost", format: "currency" },
      { key: "amountToBorrow", label: "Amount to Borrow", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "tripCostWithInterest", label: "Trip Cost Including Interest", format: "currency" },
    ],
    instructions:
      "Enter your flights, the nightly lodging rate and number of nights, daily spending, and any other costs. Daily " +
      "spending is counted for one more day than nights (arrival and departure days). Subtract what you've saved, " +
      "and enter the loan's rate and term.",
    examples:
      "Example: $1,800 flights, 7 nights at $200, $150 a day for 8 days and $300 of extras make a $4,700 trip. With " +
      "$1,000 saved you borrow $3,700 — $330.47 a month at 13% over 12 months, adding $265.69 of interest for a " +
      "$4,965.69 trip.",
    assumptions:
      "Assumes a fixed-rate loan with no fees. Exchange rates and card foreign-transaction fees can add to the " +
      "cost abroad. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a vacation loan a good idea?",
        answer: "Generally it's better to save first — you'll pay for the trip long after it's over. If you do borrow, keep the term short so it's paid off before your next trip.",
      },
    ],
  },
  {
    slug: "vacation-loan-payment-calculator",
    title: "Vacation Loan Payment Calculator",
    description: "See the monthly payment on a vacation loan, what share of your take-home pay it takes, and how many days of payments each day of the trip costs.",
    metaTitle: "Vacation Loan Payment Calculator — Free",
    metaDescription: "Free vacation loan payment calculator. See your payment, its share of take-home pay, cost per trip day, and days of payments per vacation day.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 5000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 13, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 3, max: 60, step: 3 }),
      numberField("tripDays", "Length of Trip (Days)", { default: 8, min: 1, max: 365, step: 1 }),
      currencyField("monthlyTakeHome", "Monthly Take-Home Pay", { default: 4000, max: 1000000, step: 100 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "paymentPercentOfIncome", label: "Share of Take-Home Pay", format: "percentage" },
      { key: "totalPaid", label: "Total Paid", format: "currency" },
      { key: "costPerTripDay", label: "Cost per Day of Vacation", format: "currency" },
      { key: "paymentDaysPerTripDay", label: "Days of Payments per Vacation Day", format: "number" },
    ],
    instructions:
      "Enter the loan amount, rate, and term, the length of the trip, and your monthly take-home pay. Besides the " +
      "payment, the tool shows what each day of the trip costs once interest is included, and how many days you'll " +
      "spend paying for every day away.",
    examples:
      "Example: $5,000 at 13% over 24 months costs $237.71 a month — 5.94% of $4,000 take-home. You repay $5,705.02 " +
      "in total, or $713.13 for each of 8 vacation days, and spend about 91.31 days paying for every day away.",
    assumptions:
      "A month is counted as 30.4375 days. Assumes a fixed rate and no fees. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How short can a vacation loan be?",
        answer: "Many personal loans start at 12 months, and some lenders allow shorter terms. The shorter the term, the higher the payment but the less interest you pay.",
      },
    ],
  },
  {
    slug: "vacation-loan-cost-calculator",
    title: "Vacation Loan Cost Calculator",
    description: "Compare the cost of financing a trip with a personal loan versus leaving it on a credit card and paying only the minimum.",
    metaTitle: "Vacation Loan Cost Calculator — Loan vs Credit Card",
    metaDescription: "Free vacation loan cost calculator. Compare a personal loan with paying a credit card at the minimum: payoff time, interest and savings.",
    calcInputs: [
      currencyField("tripCost", "Trip Cost to Finance", { default: 5000, max: 1000000, step: 100 }),
      percentField("loanRatePercent", "Loan Interest Rate", { default: 13, max: 40, step: 0.05 }),
      numberField("loanTermMonths", "Loan Term (Months)", { default: 24, min: 3, max: 60, step: 3 }),
      percentField("loanFeePercent", "Loan Origination Fee", { default: 0, max: 12, step: 0.25, required: false }),
      percentField("cardAprPercent", "Credit Card APR", { default: 24, max: 40, step: 0.1 }),
      percentField("minPaymentPercent", "Card Minimum Payment (% of Balance)", { default: 3, min: 0.1, max: 10, step: 0.1 }),
      currencyField("minPaymentFloor", "Card Minimum Payment Floor", { default: 25, max: 1000, step: 5 }),
    ],
    calcResult: { label: "Savings With the Loan", format: "currency" },
    calcResults: [
      { key: "loanPayment", label: "Loan — Monthly Payment", format: "currency" },
      { key: "loanTotalCost", label: "Loan — Interest + Fee", format: "currency" },
      { key: "cardMonthsAtMinimum", label: "Card — Months at Minimum Payments", format: "number", unit: "months" },
      { key: "cardInterestAtMinimum", label: "Card — Total Interest", format: "currency" },
      { key: "savingsWithLoan", label: "Savings With the Loan", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the trip cost, the personal loan's rate, term, and fee, and your credit card's APR and minimum payment " +
      "rule (a percentage of the balance with a dollar floor — check your statement). The tool runs the card month " +
      "by month at the minimum, which shrinks as the balance falls, so payoff can take many years.",
    examples:
      "Example: $5,000 on a 24-month loan at 13% costs $237.71 a month and $705.02 in interest. Left on a 24% card " +
      "at a 3% minimum ($25 floor), it takes 234 months and $8,886.95 in interest — the loan saves $8,181.93.",
    assumptions:
      "Assumes no new charges on the card. Some card issuers set the minimum as 1% of the balance plus that month's " +
      "interest; your statement shows the payoff time at the minimum. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does paying the minimum take so long?",
        answer: "Because the minimum is a percentage of a falling balance, the payment keeps shrinking, and most of it goes to interest. Paying a fixed amount each month instead cuts the time dramatically.",
      },
    ],
  },
  {
    slug: "vacation-loan-payoff-calculator",
    title: "Vacation Loan Payoff Calculator",
    description: "Find out what you'll still owe on this trip when the next vacation comes round, and the payment needed to be debt-free before you go.",
    metaTitle: "Vacation Loan Payoff Calculator — Clear It Before Next Trip",
    metaDescription: "Free vacation loan payoff calculator. See your balance at the next trip and the monthly payment needed to be debt-free before you travel again.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 4000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 13, max: 40, step: 0.05 }),
      currencyField("currentPayment", "Current Monthly Payment", { default: 190, max: 100000, step: 10 }),
      numberField("monthsUntilNextTrip", "Months Until Your Next Trip", { default: 12, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Payment to Clear It Before the Trip", format: "currency" },
    calcResults: [
      { key: "monthsToPayoffNow", label: "Months to Pay Off at Current Payment", format: "number", unit: "months" },
      { key: "balanceAtNextTrip", label: "Balance When the Next Trip Arrives", format: "currency" },
      { key: "paymentToClearBeforeTrip", label: "Payment to Clear It Before the Trip", format: "currency", highlight: true },
      { key: "extraNeededPerMonth", label: "Extra Needed Each Month", format: "currency" },
    ],
    instructions:
      "Enter your current balance, rate, and monthly payment, and how many months until your next planned trip. The " +
      "tool shows what you'd still owe when you leave, and the payment that would clear the loan in time.",
    examples:
      "Example: $4,000 at 13% paid at $190 a month takes 25 months, so $2,131.25 would still be owed in 12 months' " +
      "time. Paying $357.27 a month — $167.27 more — clears it before the next trip.",
    assumptions:
      "Assumes a fixed rate, no fees, and no prepayment penalty. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I avoid borrowing for the next trip?",
        answer: "Once this loan is paid off, keep paying the same amount into a savings account. By the next trip you'll have cash instead of debt.",
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
