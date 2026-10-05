// One-time (but safe to re-run) batch setup script: creates the Secured Personal Loan tools
// (10) of the Loan Calculators expansion 5, filed under Loan Calculators > Personal Loan Calculators.
// See src/lib/calc-engine-loan-secured-personal.ts for the math and
// src/lib/calc-engine-loan-startup-business.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-secured-personal-calculators.ts
// or
//   npm run db:create-loan-secured-personal-calculators

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
    slug: "secured-personal-loan-calculator",
    title: "Secured Personal Loan Calculator",
    description: "See how much you can borrow against savings, a CD, a paid-off vehicle or other valuables, and the monthly payment on a secured personal loan.",
    metaTitle: "Secured Personal Loan Calculator — Borrow Against Collateral",
    metaDescription: "Free secured personal loan calculator. See the max loan against your collateral, the monthly payment and total interest.",
    calcInputs: [
      {
        key: "collateralType", label: "Collateral", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Savings Account or CD (up to ~100%)", value: 1 },
          { label: "Paid-Off Vehicle (up to ~80%)", value: 2 },
          { label: "Other Valuables (up to ~50%)", value: 3 },
        ],
      },
      currencyField("collateralValue", "Collateral Value", { default: 15000, max: 1000000, step: 100 }),
      currencyField("requested", "Amount You Want to Borrow", { default: 10000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 120, step: 6 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "maxLoanAgainstCollateral", label: "Most You Can Borrow Against It", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Choose what you'll pledge, its value, how much you want, and the rate and term. Lenders lend a share of the " +
      "collateral's value: up to about 100% of savings or a CD you keep with them, around 80% of a vehicle's value, " +
      "and less for other items. If you request more than that, the loan is capped.",
    examples:
      "Example: a vehicle worth $15,000 supports up to $12,000. Borrowing $10,000 at " +
      "9% over 48 months costs $248.85 a month and $1,944.82 of interest.",
    assumptions:
      "Loan-to-value limits are typical, not universal. Fixed rate and equal monthly payments. If you don't repay, the " +
      "lender can take the collateral. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why choose a secured personal loan?",
        answer: "It's usually easier to get with fair or limited credit and comes with a lower rate than an unsecured loan, because the collateral reduces the lender's risk.",
      },
    ],
  },
  {
    slug: "secured-personal-loan-payment-calculator",
    title: "Secured Personal Loan Payment Calculator",
    description: "For a savings- or CD-secured loan: the rate (your savings rate plus a margin), the payment, and the net interest cost after your pledged savings keep earning.",
    metaTitle: "Share-Secured Loan Payment Calculator — Net Cost",
    metaDescription: "Free secured personal loan payment calculator for savings- or CD-secured loans. See the payment and net interest after savings earnings.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 8000, max: 1000000, step: 100 }),
      percentField("savingsRatePercent", "Rate Your Savings / CD Earns", { default: 4, max: 15, step: 0.05 }),
      percentField("marginPercent", "Lender's Margin Over That Rate", { default: 3, max: 10, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 120, step: 6 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "loanRate", label: "Loan Rate", format: "percentage" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "interestPaid", label: "Interest Paid", format: "currency" },
      { key: "interestEarnedOnSavings", label: "Interest Your Pledged Savings Earn", format: "currency" },
      { key: "netInterestCost", label: "Net Interest Cost", format: "currency" },
    ],
    instructions:
      "Credit unions and banks offer share- or CD-secured loans priced at your savings rate plus a small margin " +
      "(often 2%–3%). The pledged money stays in your account earning interest and is released as you repay. Enter the " +
      "loan, your savings rate, the margin and the term. These loans are a popular way to build credit.",
    examples:
      "Example: borrowing $8,000 against savings earning 4% at a 3% margin means a " +
      "7% rate and a $247.02 payment over 36 months. You pay $892.60 of interest but " +
      "your savings earn $510.06, so the net cost is just $382.54.",
    assumptions:
      "Pledged savings equal the loan and are released as it's repaid; savings rate fixed. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why borrow against my own savings?",
        answer: "To build or rebuild credit with on-time payments, or to keep savings intact (and earning) while covering an expense at a very low net cost.",
      },
    ],
  },
  {
    slug: "secured-personal-loan-payoff-calculator",
    title: "Secured Personal Loan Payoff Calculator",
    description: "See how paying extra each month clears your secured loan sooner, frees your collateral earlier and cuts the interest.",
    metaTitle: "Secured Personal Loan Payoff Calculator",
    metaDescription: "Free secured personal loan payoff calculator. Add extra each month to see your new payoff time, interest saved and when collateral is freed.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 7000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 36, step: 0.05 }),
      numberField("remainingMonths", "Months Left", { default: 36, min: 1, max: 120, step: 1 }),
      currencyField("extraMonthly", "Extra Payment Each Month", { default: 100, max: 10000, step: 5 }),
    ],
    calcResult: { label: "Months to Payoff", format: "number" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "newPayment", label: "New Monthly Payment", format: "currency" },
      { key: "monthsToPayoff", label: "Months to Payoff", format: "number", highlight: true },
      { key: "monthsSaved", label: "Months Saved", format: "number" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "Enter your balance, rate, months left and an extra monthly amount. Once the loan is paid, the lender releases " +
      "the lien on your vehicle or the hold on your savings.",
    examples:
      "Example: $7,000 at 9% with 36 months left costs $222.60 a month. " +
      "Paying $322.60 clears it in 24 months — 12 sooner — saving $344.63.",
    assumptions:
      "Fixed rate, no prepayment penalty. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I get my car title back after paying off a secured loan?",
        answer: "The lender releases its lien — it either sends you the title or notifies the motor vehicle agency, depending on your state.",
      },
    ],
  },
  {
    slug: "secured-personal-loan-refinance-calculator",
    title: "Secured Personal Loan Refinance Calculator",
    description: "See how much interest you'd save by moving high-rate credit card debt into a lower-rate secured personal loan.",
    metaTitle: "Secured Loan Refinance & Debt Consolidation Calculator",
    metaDescription: "Free secured personal loan refinance calculator. Compare paying off card debt as-is with consolidating it into a secured loan.",
    calcInputs: [
      currencyField("debt", "Debt to Consolidate", { default: 10000, max: 1000000, step: 100 }),
      percentField("debtAprPercent", "Current APR", { default: 24, max: 40, step: 0.05 }),
      currencyField("currentPayment", "What You Pay Now Each Month", { default: 350, max: 100000, step: 5 }),
      percentField("securedRatePercent", "Secured Loan Rate", { default: 9, max: 36, step: 0.05 }),
      numberField("termMonths", "Secured Loan Term (Months)", { default: 36, min: 6, max: 120, step: 6 }),
    ],
    calcResult: { label: "Interest Saved", format: "currency" },
    calcResults: [
      { key: "monthsAtCurrentPayment", label: "Months to Repay as You Are", format: "number" },
      { key: "interestAtCurrentPayment", label: "Interest as You Are", format: "currency" },
      { key: "newMonthlyPayment", label: "Secured Loan Payment", format: "currency" },
      { key: "newTotalInterest", label: "Secured Loan Interest", format: "currency" },
      { key: "interestSaved", label: "Interest Saved", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the debt you'd consolidate, its APR and what you pay each month now, plus the secured loan's rate and " +
      "term. Remember you're putting collateral at risk to repay unsecured debt — only do this if you're confident in " +
      "the payments.",
    examples:
      "Example: $10,000 at 24% paid at $350 a month takes 43 months and costs " +
      "$4,976.08 of interest. A secured loan at 9% over 36 months costs " +
      "$318 a month and $1,447.90 — saving $3,528.18.",
    assumptions:
      "No new card spending; the card APR stays the same; no fees. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is it risky to consolidate debt with a secured loan?",
        answer: "Yes, somewhat — card debt can't take your car or savings, but a secured loan can if you default. Keep the cards paid off afterwards.",
      },
    ],
  },
  {
    slug: "secured-personal-loan-apr-calculator",
    title: "Secured Personal Loan APR Calculator",
    description: "Turn a secured loan's interest rate and fees — application, lien-filing or title fees — into the true APR.",
    metaTitle: "Secured Personal Loan APR Calculator — With Fees",
    metaDescription: "Free secured personal loan APR calculator. Add application, lien and title fees to the rate to see the true annual cost.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 8000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 120, step: 6 }),
      currencyField("fees", "Fees (Application, Lien Filing, Title)", { default: 150, max: 10000, step: 5, required: false }),
    ],
    calcResult: { label: "APR", format: "percentage" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "cashReceived", label: "Cash Received After Fees", format: "currency" },
      { key: "apr", label: "APR", format: "percentage", highlight: true },
      { key: "aprAboveRate", label: "APR Above the Interest Rate", format: "percentage" },
    ],
    instructions:
      "Enter the loan, rate, term and the fees you pay to get it. On small loans even modest fees add noticeably to " +
      "the APR, so compare APRs between lenders.",
    examples:
      "Example: $8,000 at 9% over 36 months costs $254.40 a month. With " +
      "$150 of fees you receive $7,850, so the APR is 10.30% — 1.30% above the rate.",
    assumptions:
      "Fees paid from the loan or at closing; fixed rate, equal payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are secured loan rates always lower?",
        answer: "Usually, but not always — some lenders that focus on poor credit charge high rates even on secured loans. Compare the APR.",
      },
    ],
  },
  {
    slug: "secured-personal-loan-affordability-calculator",
    title: "Secured Personal Loan Affordability Calculator",
    description: "Find the most you can borrow on a secured loan — limited both by your collateral's value and by the payment your budget allows.",
    metaTitle: "Secured Personal Loan Affordability Calculator",
    metaDescription: "Free secured personal loan affordability calculator. See the max loan from your collateral and from your monthly budget.",
    calcInputs: [
      currencyField("collateralValue", "Collateral Value", { default: 15000, max: 1000000, step: 100 }),
      percentField("maxLtvPercent", "Lender's Max Loan-to-Value", { default: 80, max: 100, step: 1 }),
      currencyField("monthlyBudget", "Monthly Payment You Can Afford", { default: 300, max: 100000, step: 5 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 120, step: 6 }),
    ],
    calcResult: { label: "Maximum Loan", format: "currency" },
    calcResults: [
      { key: "maxByCollateral", label: "Max by Collateral", format: "currency" },
      { key: "maxByBudget", label: "Max by Your Budget", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your collateral's value and the lender's loan-to-value limit, the payment you can afford, and the rate " +
      "and term. Your limit is the lower of the two.",
    examples:
      "Example: $15,000 of collateral at 80% supports $12,000. $300 a month at " +
      "9% over 48 months repays $12,055.43. You can borrow up to $12,000.",
    assumptions:
      "Fixed rate, equal payments; lenders also check your income and credit. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is my car valued for a secured loan?",
        answer: "Lenders use a guide value (such as a used-car pricing guide) for the make, model, year and mileage, not what you paid.",
      },
    ],
  },
  {
    slug: "secured-personal-loan-eligibility-calculator",
    title: "Secured Personal Loan Eligibility Calculator",
    description: "Prequalify for a secured personal loan: loan-to-value against your collateral, your debt-to-income ratio, and the lower credit bar secured loans allow.",
    metaTitle: "Secured Personal Loan Eligibility Calculator",
    metaDescription: "Free secured personal loan eligibility calculator. Check loan-to-value, DTI with the new payment and the credit score for approval.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 10000, max: 1000000, step: 100 }),
      currencyField("collateralValue", "Collateral Value", { default: 14000, max: 1000000, step: 100 }),
      percentField("maxLtvPercent", "Lender's Max Loan-to-Value", { default: 80, max: 100, step: 1 }),
      currencyField("monthlyIncome", "Gross Monthly Income", { default: 3500, max: 1000000, step: 50 }),
      currencyField("monthlyDebts", "Existing Monthly Debt Payments", { default: 900, max: 100000, step: 10, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 10, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 120, step: 6 }),
      numberField("creditScore", "Your Credit Score", { default: 590, min: 300, max: 850, step: 1 }),
    ],
    calcResult: { label: "Checks Passed (of 3)", format: "number" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "loanToValue", label: "Loan-to-Value", format: "percentage" },
      { key: "dtiWithLoan", label: "Debt-to-Income With the Loan", format: "percentage" },
      { key: "checksPassed", label: "Checks Passed (of 3)", format: "number", highlight: true },
    ],
    instructions:
      "Enter the loan, your collateral and the lender's LTV limit, your income and debts, and your score. The three " +
      "checks: LTV within the limit; DTI of 45% or less; and a score of 580+ — lower than most unsecured loans need, " +
      "because the collateral protects the lender.",
    examples:
      "Example: $10,000 against $14,000 is a 71.43% LTV. The $253.63 payment brings your " +
      "DTI to 32.96%. With a 590 score, 3 of 3 checks pass.",
    assumptions:
      "Typical guidelines; savings-secured loans often have no minimum score at all. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get a secured loan with bad credit?",
        answer: "Often yes — especially a share- or CD-secured loan from a credit union, which can help rebuild credit.",
      },
    ],
  },
  {
    slug: "secured-personal-loan-interest-calculator",
    title: "Secured Personal Loan Interest Calculator",
    description: "Calculate the interest on a secured personal loan — in the first year, in total, per month on average, and as a share of the loan.",
    metaTitle: "Secured Personal Loan Interest Calculator",
    metaDescription: "Free secured personal loan interest calculator. See first-year, total and average monthly interest and interest as a share of the loan.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 10000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 120, step: 6 }),
    ],
    calcResult: { label: "Total Interest", format: "currency" },
    calcResults: [
      { key: "interestFirstYear", label: "Interest in Year 1", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency", highlight: true },
      { key: "averageMonthlyInterest", label: "Average Interest per Month", format: "currency" },
      { key: "interestAsShareOfLoan", label: "Interest as Share of the Loan", format: "percentage" },
    ],
    instructions:
      "Enter the loan, rate and term. To compare with an unsecured loan for the same amount, use the secured vs " +
      "unsecured loan calculator.",
    examples:
      "Example: $10,000 at 9% over 48 months costs $811.76 of interest in year 1 " +
      "and $1,944.82 in total — $40.52 a month on average, or 19.45% of the loan.",
    assumptions:
      "Fixed rate, equal monthly payments, simple interest on the balance. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is interest on a secured personal loan tax-deductible?",
        answer: "Generally not for personal use. Home equity debt used to improve the home, or loans used for business, can be different — ask a tax adviser.",
      },
    ],
  },
  {
    slug: "secured-personal-loan-amortization-calculator",
    title: "Secured Personal Loan Amortization Calculator",
    description: "Track a vehicle-secured loan against the car's falling value: the balance, the vehicle's value and your equity at any month.",
    metaTitle: "Secured Loan Amortization vs Vehicle Value Calculator",
    metaDescription: "Free secured personal loan amortization calculator. See the balance, collateral value, loan-to-value and equity at any month.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 6, max: 120, step: 6 }),
      currencyField("collateralValue", "Collateral Value Today", { default: 20000, max: 1000000, step: 100 }),
      percentField("depreciationPercent", "Value Lost per Year", { default: 12, max: 50, step: 0.5, required: false }),
      numberField("monthNumber", "Month to Show", { default: 24, min: 0, max: 120, step: 1 }),
    ],
    calcResult: { label: "Equity at That Month", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "balanceAtMonth", label: "Loan Balance", format: "currency" },
      { key: "collateralValueAtMonth", label: "Collateral Value", format: "currency" },
      { key: "loanToValueAtMonth", label: "Loan-to-Value", format: "percentage" },
      { key: "equityAtMonth", label: "Equity at That Month", format: "currency", highlight: true },
    ],
    instructions:
      "When a vehicle secures your loan, its value falls while the balance falls too. Enter the loan, the vehicle's " +
      "value and yearly depreciation, and a month. Negative equity would mean selling the vehicle wouldn't cover the " +
      "loan. Enter 0% depreciation for savings or a CD.",
    examples:
      "Example: a $15,000 loan at 9% over 60 months costs $311.38 a month. After " +
      "24 months you owe $9,791.76, the $20,000 vehicle is worth about $15,488 " +
      "(63.22% LTV), so your equity is $5,696.24.",
    assumptions:
      "Value falls by a fixed percentage each year; actual values depend on condition and market. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens if my collateral is worth less than the loan?",
        answer: "Nothing changes while you pay on time, but if you default or sell, the sale might not cover the debt and you could still owe the difference.",
      },
    ],
  },
  {
    slug: "secured-personal-loan-total-cost-calculator",
    title: "Secured Personal Loan Total Cost Calculator",
    description: "Add up the full cost of a secured personal loan: interest, fees and the extra full-coverage insurance a vehicle-secured loan usually requires.",
    metaTitle: "Secured Personal Loan Total Cost Calculator",
    metaDescription: "Free secured personal loan total cost calculator. Add interest, fees and required vehicle insurance to see the full cost per month.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 12000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 120, step: 6 }),
      currencyField("fees", "Fees (Application, Lien, Title)", { default: 150, max: 10000, step: 5, required: false }),
      currencyField("extraInsurancePerYear", "Extra Insurance Required per Year", { default: 600, max: 20000, step: 10, required: false }),
    ],
    calcResult: { label: "Total Cost of Borrowing", format: "currency" },
    calcResults: [
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "fees", label: "Fees", format: "currency" },
      { key: "requiredInsuranceCost", label: "Required Insurance", format: "currency" },
      { key: "totalCostOfBorrowing", label: "Total Cost of Borrowing", format: "currency", highlight: true },
      { key: "costPerMonth", label: "Cost per Month", format: "currency" },
    ],
    instructions:
      "If your car secures the loan, the lender will usually require comprehensive and collision coverage — enter what " +
      "that adds over liability-only insurance. For a savings-secured loan, enter 0.",
    examples:
      "Example: $12,000 at 9% over 48 months costs $2,333.78 of interest. With " +
      "$150 of fees and $2,400 of extra insurance, the total is $4,883.78 — " +
      "$101.75 a month.",
    assumptions:
      "Insurance cost flat each year; held to term. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need full coverage on a car used as loan collateral?",
        answer: "Almost always — lenders require it to protect the collateral and list themselves as loss payee.",
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
