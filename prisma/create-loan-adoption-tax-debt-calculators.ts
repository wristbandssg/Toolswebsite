// One-time (but safe to re-run) batch setup script: creates the Adoption and Tax Debt Loan tools
// (11) of the Loan Calculators expansion 4, filed under Loan Calculators > Personal Loan Calculators.
// See src/lib/calc-engine-loan-adoption-tax-debt.ts for the math and
// src/lib/calc-engine-loan-powersports.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-adoption-tax-debt-calculators.ts
// or
//   npm run db:create-loan-adoption-tax-debt-calculators

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
    slug: "adoption-loan-calculator",
    title: "Adoption Loan Calculator",
    description: "Add up adoption costs — agency and legal fees, travel and home study — subtract grants, employer help and savings, and see the loan and monthly payment.",
    metaTitle: "Adoption Loan Calculator — Cost & Monthly Payment",
    metaDescription: "Free adoption loan calculator. Total agency, legal, travel and home study costs, subtract grants and savings, and see the payment.",
    calcInputs: [
      currencyField("agencyLegalFees", "Agency & Legal Fees", { default: 35000, max: 500000, step: 500 }),
      currencyField("travel", "Travel Costs", { default: 5000, max: 200000, step: 100, required: false }),
      currencyField("homeStudy", "Home Study & Background Checks", { default: 2500, max: 50000, step: 100, required: false }),
      currencyField("grants", "Adoption Grants", { default: 5000, max: 500000, step: 100, required: false }),
      currencyField("employerAssistance", "Employer Adoption Assistance", { default: 5000, max: 500000, step: 100, required: false }),
      currencyField("savings", "Savings You'll Use", { default: 5000, max: 500000, step: 100, required: false }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 10, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 120, step: 6 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalAdoptionCost", label: "Total Adoption Cost", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Domestic infant and international adoptions commonly cost tens of thousands of dollars; foster-care adoptions " +
      "cost far less. Enter your agency and legal fees, travel and home study, then the grants, employer assistance " +
      "and savings you'll use. The rest is what you'd borrow.",
    examples:
      "Example: $35,000 of agency and legal fees plus travel and home study total $42,500. After " +
      "grants, employer help and savings, the loan is $27,500: at 10% over 60 months " +
      "that's $584.29 a month and $7,557.62 of interest.",
    assumptions:
      "Fixed rate, equal monthly payments. The federal adoption tax credit isn't subtracted here — see the adoption " +
      "loan payment and cost calculators. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are there loans made just for adoption?",
        answer: "Some nonprofits offer low- or no-interest adoption loans, and many families use personal loans or home equity. Grants don't need repaying, so apply for those first.",
      },
    ],
  },
  {
    slug: "adoption-loan-payment-calculator",
    title: "Adoption Loan Payment Calculator",
    description: "See your adoption loan payment, the 2026 federal adoption tax credit you can claim, and how much sooner the loan is gone if you put the first year's credit toward it.",
    metaTitle: "Adoption Loan Payment Calculator — With Tax Credit",
    metaDescription: "Free adoption loan payment calculator. See the payment and how applying the $17,670 adoption tax credit to the loan shortens it.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 30000, max: 500000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 120, step: 6 }),
      currencyField("qualifiedExpenses", "Qualified Adoption Expenses", { default: 30000, max: 500000, step: 500 }),
      currencyField("federalTaxOwed", "Your Federal Income Tax for the Year", { default: 6000, max: 1000000, step: 100 }),
      numberField("monthsUntilRefund", "Months Until the Credit Arrives", { default: 12, min: 0, max: 36, step: 1 }),
    ],
    calcResult: { label: "Months to Payoff With the Credit", format: "number" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "adoptionCredit", label: "Adoption Tax Credit", format: "currency" },
      { key: "firstYearTaxBenefit", label: "Credit You Get in Year 1", format: "currency" },
      { key: "creditCarriedForward", label: "Credit Carried to Later Years", format: "currency" },
      { key: "monthsToPayoffWithCredit", label: "Months to Payoff With the Credit", format: "number", highlight: true },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "For 2026 the federal adoption credit covers up to $17,670 of qualified expenses per child. Up to $5,120 of it is " +
      "refundable — you get it even if you owe no tax — and the rest only reduces the tax you owe, with any unused part " +
      "carried forward up to 5 years. Enter your loan, your qualified expenses, your federal tax for the year, and when " +
      "you expect the refund. The calculator puts the year-1 credit toward the loan.",
    examples:
      "Example: a $30,000 loan at 10% over 60 months costs $637.41 a month. " +
      "$30,000 of expenses earn a $17,670 credit; with $6,000 of tax you get " +
      "$11,120 in year 1 and carry $6,550 forward. Paying the year-1 amount onto the loan " +
      "clears it in 37 months, saving $3,933.35.",
    assumptions:
      "2026 limits; the credit phases out for modified AGI above $265,080 (gone at $305,080), which isn't applied. " +
      "Later years' carried-forward credit isn't applied to the loan. Not tax advice. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When can I claim the adoption credit?",
        answer: "For domestic adoptions, generally for expenses paid in the year before finalization, or the year paid if finalization happened; for foreign adoptions, once the adoption is final.",
      },
    ],
  },
  {
    slug: "adoption-loan-cost-calculator",
    title: "Adoption Loan Cost Calculator",
    description: "Work out the net cost of adopting after grants, employer adoption assistance and the federal adoption tax credit — including the interest on any loan.",
    metaTitle: "Adoption Cost Calculator — Net of Tax Credit & Loan",
    metaDescription: "Free adoption cost calculator. Subtract grants, employer help and the adoption tax credit, add loan interest, and see your net cost.",
    calcInputs: [
      currencyField("totalExpenses", "Total Adoption Expenses", { default: 45000, max: 500000, step: 500 }),
      currencyField("grants", "Grants Received", { default: 5000, max: 500000, step: 100, required: false }),
      currencyField("employerAssistance", "Employer Adoption Assistance", { default: 5000, max: 500000, step: 100, required: false }),
      currencyField("loanAmount", "Amount Borrowed", { default: 25000, max: 500000, step: 500, required: false }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 10, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 120, step: 6 }),
    ],
    calcResult: { label: "Net Cost of Adoption", format: "currency" },
    calcResults: [
      { key: "adoptionTaxCredit", label: "Adoption Tax Credit", format: "currency" },
      { key: "loanInterest", label: "Loan Interest", format: "currency" },
      { key: "outOfPocketBeforeCredit", label: "Out of Pocket Before the Credit", format: "currency" },
      { key: "netCostOfAdoption", label: "Net Cost of Adoption", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your total adoption expenses, grants, employer assistance, and any amount you borrowed with its rate and " +
      "term. Expenses your employer or a grant paid for can't also count toward the tax credit, so the credit is based " +
      "on what's left, up to $17,670 per child for 2026.",
    examples:
      "Example: $45,000 of expenses with $5,000 of grants and $5,000 from an employer. Borrowing " +
      "$25,000 at 10% adds $6,870.57 of interest, so you pay $41,870.57. A " +
      "$17,670 credit brings the net cost to $24,200.57.",
    assumptions:
      "Assumes you can use the full credit over time (it carries forward 5 years) and your income is below the " +
      "phase-out. Employer assistance is also tax-free up to the same limit. Not tax advice. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does adopting from foster care qualify for the credit?",
        answer: "Yes — and for a child with special needs, you can claim the full credit even if your expenses were lower.",
      },
    ],
  },
  {
    slug: "adoption-loan-payoff-calculator",
    title: "Adoption Loan Payoff Calculator",
    description: "See how a lump sum and a little extra each month pay off your adoption loan sooner, and how much interest you save.",
    metaTitle: "Adoption Loan Payoff Calculator — Pay Off Early",
    metaDescription: "Free adoption loan payoff calculator. Add a lump sum and extra monthly payments to see your new payoff time and interest saved.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 25000, max: 500000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10, max: 36, step: 0.05 }),
      numberField("remainingMonths", "Months Left", { default: 60, min: 1, max: 120, step: 1 }),
      currencyField("extraMonthly", "Extra Payment Each Month", { default: 100, max: 10000, step: 5, required: false }),
      currencyField("lumpSum", "Lump Sum Now", { default: 2000, max: 500000, step: 100, required: false }),
    ],
    calcResult: { label: "Months to Payoff", format: "number" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "monthsToPayoff", label: "Months to Payoff", format: "number", highlight: true },
      { key: "monthsSaved", label: "Months Saved", format: "number" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "Enter your balance, rate and months left, any lump sum (such as a late-arriving grant or carried-forward tax " +
      "credit), and an extra monthly amount.",
    examples:
      "Example: $25,000 at 10% with 60 months left costs $531.18 a month. A " +
      "$2,000 lump sum plus $100 extra a month clears it in 44 months — 16 " +
      "sooner — saving $2,343.22.",
    assumptions:
      "Fixed rate, no prepayment penalty; the lump sum is paid today. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I pay off an adoption loan early or save for my child?",
        answer: "Keep an emergency fund first. After that, paying off a high-rate loan is a guaranteed return; a 0% nonprofit loan can be left to run.",
      },
    ],
  },
  {
    slug: "tax-debt-loan-calculator",
    title: "Tax Debt Loan Calculator",
    description: "Find how much to borrow to pay your IRS or state tax bill in full after a loan's origination fee, plus the monthly payment and total cost.",
    metaTitle: "Tax Debt Loan Calculator — Pay the IRS With a Loan",
    metaDescription: "Free tax debt loan calculator. See the loan needed to pay your tax bill after fees, the monthly payment, interest and total cost.",
    calcInputs: [
      currencyField("taxOwed", "Tax Bill to Pay Off", { default: 15000, max: 1000000, step: 100 }),
      percentField("originationFeePercent", "Loan Origination Fee", { default: 5, max: 20, step: 0.25, required: false }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 11, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 84, step: 6 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "loanAmountNeeded", label: "Loan Amount Needed", format: "currency" },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCost", label: "Total Cost (Interest + Fee)", format: "currency" },
    ],
    instructions:
      "Enter the tax you owe (including penalties and interest so far), the loan's fee, rate and term. Because the fee " +
      "is taken out of the loan, you need to borrow a little more than the bill. Paying in full stops IRS penalties " +
      "and interest from growing.",
    examples:
      "Example: to pay a $15,000 tax bill with a 5% fee, borrow $15,789.47 (a " +
      "$789.47 fee). At 11% over 36 months that's $516.93 a month, " +
      "$2,819.90 of interest and $3,609.38 in total cost.",
    assumptions:
      "Fixed rate, equal payments; fee deducted from the proceeds. Compare with an IRS payment plan, which is often " +
      "cheaper. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is it smart to take a loan to pay the IRS?",
        answer: "Sometimes — if the loan's rate is close to or below the IRS's interest plus penalties, or if you need to avoid a lien. Often an IRS installment plan costs less.",
      },
    ],
  },
  {
    slug: "tax-debt-loan-payment-calculator",
    title: "Tax Debt Loan Payment Calculator",
    description: "Estimate your monthly IRS installment plan payment, including interest (7% for late 2026) and the reduced failure-to-pay penalty, plus the setup fee.",
    metaTitle: "IRS Payment Plan Calculator — Monthly Payment",
    metaDescription: "Free IRS payment plan calculator. Estimate the monthly payment on tax debt with IRS interest, the 0.25% plan penalty and setup fee.",
    calcInputs: [
      currencyField("balance", "Tax Balance Owed", { default: 15000, max: 1000000, step: 100 }),
      numberField("months", "Months to Pay (Up to 72)", { default: 72, min: 1, max: 120, step: 1 }),
      percentField("irsRatePercent", "IRS Interest Rate", { default: 7, max: 20, step: 0.25 }),
      percentField("penaltyMonthlyPercent", "Failure-to-Pay Penalty per Month", { default: 0.25, max: 1, step: 0.05 }),
      currencyField("setupFee", "Plan Setup Fee", { default: 22, max: 500, step: 1, required: false }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalPenalties", label: "Total Penalties", format: "currency" },
      { key: "setupFee", label: "Setup Fee", format: "currency" },
      { key: "totalCost", label: "Total Cost of the Plan", format: "currency" },
    ],
    instructions:
      "Enter what you owe and how many months you want to pay over — individuals owing $50,000 or less can usually " +
      "set up a long-term plan online for up to 72 months. IRS interest is 7% a year for the fourth quarter of 2026, " +
      "and the failure-to-pay penalty drops to 0.25% a month during a plan if you filed on time (0.5% if not). The " +
      "online setup fee with automatic debit is $22.",
    examples:
      "Example: $15,000 over 72 months at 7% interest and a 0.25% monthly penalty " +
      "costs $278.04 a month. Over the plan that's $3,516.05 of interest and $1,502.63 of " +
      "penalties — $5,040.68 in total with the $22 fee.",
    assumptions:
      "The rate stays the same (the IRS resets it quarterly); the penalty is applied to the whole balance and the " +
      "25% penalty cap isn't reached. Setup fees are higher by phone or mail and may be waived for low incomes. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does the IRS charge interest on a payment plan?",
        answer: "Yes — interest and a reduced failure-to-pay penalty keep running until the balance is paid, so paying faster costs less.",
      },
    ],
  },
  {
    slug: "tax-debt-loan-payoff-calculator",
    title: "Tax Debt Loan Payoff Calculator",
    description: "See how paying extra on an IRS installment plan shortens it and saves interest and penalties.",
    metaTitle: "Tax Debt Payoff Calculator — Pay the IRS Faster",
    metaDescription: "Free tax debt payoff calculator. See how extra payments on an IRS payment plan cut the months left and the interest and penalties.",
    calcInputs: [
      currencyField("balance", "Tax Balance Owed", { default: 12000, max: 1000000, step: 100 }),
      currencyField("currentPayment", "Current Monthly Payment", { default: 300, max: 100000, step: 5 }),
      currencyField("extraMonthly", "Extra Payment Each Month", { default: 150, max: 100000, step: 5 }),
      percentField("irsRatePercent", "IRS Interest Rate", { default: 7, max: 20, step: 0.25 }),
      percentField("penaltyMonthlyPercent", "Failure-to-Pay Penalty per Month", { default: 0.25, max: 1, step: 0.05 }),
    ],
    calcResult: { label: "Months With Extra Payments", format: "number" },
    calcResults: [
      { key: "monthsAtCurrentPayment", label: "Months at Your Current Payment", format: "number" },
      { key: "monthsWithExtra", label: "Months With Extra Payments", format: "number", highlight: true },
      { key: "monthsSaved", label: "Months Saved", format: "number" },
      { key: "chargesSaved", label: "Interest & Penalties Saved", format: "currency" },
    ],
    instructions:
      "You can pay more than your IRS plan requires at any time without a penalty. Enter what you owe, your current " +
      "payment, an extra amount, and the current IRS rate and plan penalty.",
    examples:
      "Example: $12,000 paid at $300 a month takes 49 months. Adding $150 " +
      "cuts it to 31 months — 18 sooner — and saves $1,032.86 of interest and penalties.",
    assumptions:
      "Rate and penalty stay the same; penalty applied to the whole balance. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I pay off an IRS plan early?",
        answer: "Yes. Extra or lump-sum payments are allowed anytime and reduce future interest and penalties.",
      },
    ],
  },
  {
    slug: "tax-debt-loan-interest-calculator",
    title: "Tax Debt Loan Interest Calculator",
    description: "See how fast an unpaid tax bill grows: IRS interest, the failure-to-pay penalty, and the much bigger failure-to-file penalty if you haven't filed.",
    metaTitle: "IRS Tax Debt Interest & Penalty Calculator",
    metaDescription: "Free tax debt interest calculator. See IRS interest, failure-to-pay and failure-to-file penalties, and what an unpaid bill grows to.",
    calcInputs: [
      currencyField("taxOwed", "Unpaid Tax", { default: 10000, max: 1000000, step: 100 }),
      numberField("monthsLate", "Months Unpaid", { default: 12, min: 0, max: 120, step: 1 }),
      {
        key: "filedOnTime", label: "Did You File the Return on Time?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes — Filed, Just Didn't Pay", value: 1 },
          { label: "No — Not Filed", value: 0 },
        ],
      },
      percentField("irsRatePercent", "IRS Interest Rate", { default: 7, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Total Owed", format: "currency" },
    calcResults: [
      { key: "interest", label: "Interest", format: "currency" },
      { key: "failureToPayPenalty", label: "Failure-to-Pay Penalty", format: "currency" },
      { key: "failureToFilePenalty", label: "Failure-to-File Penalty", format: "currency" },
      { key: "totalOwed", label: "Total Owed", format: "currency", highlight: true },
      { key: "growthPercent", label: "Growth Over the Original Tax", format: "percentage" },
    ],
    instructions:
      "Enter the unpaid tax, how many months it's been unpaid, whether you filed, and the IRS rate. The failure-to-pay " +
      "penalty is 0.5% a month (up to 25%). Not filing adds a failure-to-file penalty of 5% a month, reduced by the " +
      "failure-to-pay penalty for the same month, for up to 5 months — so filing on time matters even if you can't pay.",
    examples:
      "Example: $10,000 unpaid for 12 months on a filed return builds $725.01 of interest at " +
      "7% and a $600 failure-to-pay penalty, for $11,325.01 in total — " +
      "13.25% more than the original tax.",
    assumptions:
      "Interest on the tax only (the IRS also charges interest on penalties); daily compounding; the rate stays the " +
      "same. Minimum failure-to-file penalties for returns over 60 days late aren't applied. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can IRS penalties be removed?",
        answer: "Sometimes — first-time penalty abatement is available if you have a clean recent history, and reasonable-cause relief for things like serious illness. Interest generally isn't removed.",
      },
    ],
  },
  {
    slug: "tax-debt-loan-affordability-calculator",
    title: "Tax Debt Loan Affordability Calculator",
    description: "Turn the monthly amount you can afford into the largest tax debt you could clear — with a personal loan, or with a 72-month IRS payment plan.",
    metaTitle: "Tax Debt Affordability Calculator — Loan vs IRS Plan",
    metaDescription: "Free tax debt affordability calculator. See how much tax debt your monthly budget can clear with a loan or a 72-month IRS plan.",
    calcInputs: [
      currencyField("monthlyBudget", "What You Can Pay Each Month", { default: 500, max: 100000, step: 10 }),
      percentField("loanRatePercent", "Personal Loan Rate", { default: 11, max: 36, step: 0.05 }),
      numberField("loanTermMonths", "Personal Loan Term (Months)", { default: 60, min: 6, max: 84, step: 6 }),
      percentField("originationFeePercent", "Loan Origination Fee", { default: 5, max: 20, step: 0.25, required: false }),
      percentField("irsRatePercent", "IRS Interest Rate", { default: 7, max: 20, step: 0.25 }),
      percentField("penaltyMonthlyPercent", "IRS Plan Penalty per Month", { default: 0.25, max: 1, step: 0.05 }),
    ],
    calcResult: { label: "Largest Tax Debt — IRS Plan", format: "currency" },
    calcResults: [
      { key: "maxLoanAmount", label: "Largest Loan You Can Repay", format: "currency" },
      { key: "maxTaxDebtWithLoan", label: "Largest Tax Debt — Personal Loan", format: "currency" },
      { key: "maxTaxDebtWithIrsPlan", label: "Largest Tax Debt — IRS Plan", format: "currency", highlight: true },
      { key: "irsPlanMonths", label: "IRS Plan Length (Months)", format: "number" },
    ],
    instructions:
      "Enter the monthly payment you can manage, a personal loan's rate, term and fee, and the IRS interest rate and " +
      "plan penalty. If your tax debt is above both results, you may need to pay some upfront, or ask the IRS about " +
      "other options such as an offer in compromise or currently-not-collectible status.",
    examples:
      "Example: $500 a month repays a $22,996.52 loan at 11% over 60 months — " +
      "after the fee, enough for $21,846.69 of tax. On a 72-month IRS plan, the same payment " +
      "clears up to $26,974.81.",
    assumptions:
      "Rates stay the same; the IRS plan uses 72 months, the usual maximum for an online long-term plan. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I can't afford any payment plan?",
        answer: "The IRS may delay collection (currently not collectible) or accept less than the full amount through an offer in compromise if you qualify. A tax professional can help.",
      },
    ],
  },
  {
    slug: "tax-debt-loan-comparison-calculator",
    title: "Tax Debt Loan Comparison Calculator",
    description: "Compare paying your tax bill with a personal loan against an IRS installment plan over the same months — payments and total cost.",
    metaTitle: "Personal Loan vs IRS Payment Plan Calculator",
    metaDescription: "Free tax debt comparison calculator. Compare a personal loan with an IRS installment plan by monthly payment and total cost.",
    calcInputs: [
      currencyField("taxOwed", "Tax Owed", { default: 15000, max: 1000000, step: 100 }),
      numberField("months", "Months to Repay (Both)", { default: 36, min: 1, max: 84, step: 1 }),
      percentField("loanRatePercent", "Personal Loan Rate", { default: 11, max: 36, step: 0.05 }),
      percentField("originationFeePercent", "Loan Origination Fee", { default: 5, max: 20, step: 0.25, required: false }),
      percentField("irsRatePercent", "IRS Interest Rate", { default: 7, max: 20, step: 0.25 }),
      percentField("penaltyMonthlyPercent", "IRS Plan Penalty per Month", { default: 0.25, max: 1, step: 0.05 }),
      currencyField("setupFee", "IRS Plan Setup Fee", { default: 22, max: 500, step: 1, required: false }),
    ],
    calcResult: { label: "Savings With the IRS Plan", format: "currency" },
    calcResults: [
      { key: "loanPayment", label: "Personal Loan — Monthly Payment", format: "currency" },
      { key: "irsPlanPayment", label: "IRS Plan — Monthly Payment", format: "currency" },
      { key: "loanTotalCost", label: "Personal Loan — Total Cost", format: "currency" },
      { key: "irsPlanTotalCost", label: "IRS Plan — Total Cost", format: "currency" },
      { key: "savingsWithIrsPlan", label: "Savings With the IRS Plan", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the tax owed and the months to repay, a personal loan quote, and the IRS rate, plan penalty and setup fee. " +
      "An IRS plan costs about 10% a year (7% interest plus 0.25% a month), so a loan only wins if its APR is lower. A " +
      "negative saving means the loan is cheaper.",
    examples:
      "Example: $15,000 over 36 months. A personal loan at 11% with a 5% fee " +
      "costs $516.93 a month and $3,609.38 in total. An IRS plan costs $484.15 a month and " +
      "$2,451.30 — saving $1,158.08.",
    assumptions:
      "Rates stay the same; IRS penalty applied to the whole balance; the loan's fee is deducted from proceeds. An IRS " +
      "plan may come with a tax lien for larger debts, which a loan avoids. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Will an IRS payment plan hurt my credit?",
        answer: "The plan itself isn't reported to credit bureaus, and the IRS no longer reports tax liens to them. A personal loan does appear on your credit report.",
      },
    ],
  },
  {
    slug: "tax-debt-loan-eligibility-calculator",
    title: "Tax Debt Loan Eligibility Calculator",
    description: "See which ways to pay your tax debt are open to you: an IRS short-term plan, a long-term plan, or a personal loan based on your credit and debt-to-income.",
    metaTitle: "Tax Debt Options Eligibility Calculator — IRS Plan or Loan",
    metaDescription: "Free tax debt eligibility calculator. Check if you qualify for an IRS short-term or long-term payment plan or a personal loan.",
    calcInputs: [
      currencyField("totalOwed", "Total Owed (Tax, Penalties & Interest)", { default: 30000, max: 10000000, step: 100 }),
      {
        key: "allReturnsFiled", label: "Have You Filed All Required Returns?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      numberField("creditScore", "Your Credit Score", { default: 660, min: 300, max: 850, step: 1 }),
      currencyField("monthlyIncome", "Gross Monthly Income", { default: 5500, max: 1000000, step: 100 }),
      currencyField("existingDebtPayments", "Existing Monthly Debt Payments", { default: 900, max: 1000000, step: 10, required: false }),
      percentField("loanRatePercent", "Expected Loan Rate", { default: 12, max: 36, step: 0.05 }),
      numberField("loanTermMonths", "Loan Term (Months)", { default: 60, min: 6, max: 84, step: 6 }),
    ],
    calcResult: { label: "Options Available (of 3)", format: "number" },
    calcResults: [
      { key: "paymentToClearIn180Days", label: "Short-Term Plan — Monthly to Clear in 180 Days", format: "currency" },
      { key: "minimumPaymentOver72Months", label: "Long-Term Plan — Monthly Over 72 Months (Before Interest)", format: "currency" },
      { key: "loanPayment", label: "Personal Loan — Monthly Payment", format: "currency" },
      { key: "dtiWithLoan", label: "Debt-to-Income With the Loan", format: "percentage" },
      { key: "optionsAvailable", label: "Options Available (of 3)", format: "number", highlight: true },
    ],
    instructions:
      "Enter everything you owe the IRS, whether all your returns are filed, and your credit and income. The three " +
      "options checked: a short-term plan (up to 180 days) for under $100,000; a long-term online plan for $50,000 or " +
      "less; and a personal loan if your score is 640+ and your debt-to-income with the loan stays at or below 40%. " +
      "The IRS requires all returns to be filed before agreeing a plan.",
    examples:
      "Example: owing $30,000 with all returns filed, clearing it in 180 days takes about $5,000 a " +
      "month; over 72 months it's at least $416.67 a month plus interest. A loan at " +
      "12% costs $667.33, a DTI of 28.50%. 3 of 3 options are open.",
    assumptions:
      "IRS thresholds for individuals applying online; larger debts may still get a plan by phone or with financial " +
      "disclosure. Loan checks are typical lender benchmarks. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I owe more than $50,000?",
        answer: "You can still request a plan, but usually by phone or mail with a financial statement (Form 433-F), or pay the balance below $50,000 to use the online option.",
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
