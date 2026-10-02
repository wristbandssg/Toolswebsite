// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the Loan Calculators expansion sub-batch 5 (Renovation & Timeshare Loans),
// filed under Finance Calculators > Loan Calculators > Home Improvement
// Loan Calculators. See src/lib/calc-engine-loan-renovation-timeshare.ts for
// the math and src/lib/calc-engine-loan-debt-consolidation.ts for the full
// batch context.
//
// If the "Home Improvement Loan Calculators" sub-category doesn't exist
// yet, it is created under Loan Calculators.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-renovation-timeshare-calculators.ts
// or
//   npm run db:create-loan-renovation-timeshare-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "loan-calculators";
const CATEGORY = { name: "Home Improvement Loan Calculators", slug: "home-improvement-loan-calculators" };

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
    slug: "renovation-loan-calculator",
    title: "Renovation Loan Calculator",
    description: "Size a renovation mortgage that combines the home's purchase price and renovation costs, with a contingency reserve, and see the loan-to-value against the after-renovation value.",
    metaTitle: "Renovation Loan Calculator — Purchase + Rehab",
    metaDescription: "Free renovation loan calculator. Combine purchase price, renovation and contingency, see your down payment, payment, LTV and equity when done.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price (or Current Payoff if Refinancing)", { default: 300000, max: 100000000, step: 5000 }),
      currencyField("renovationCost", "Renovation Cost", { default: 60000, max: 10000000, step: 1000 }),
      percentField("contingencyPercent", "Contingency Reserve", { default: 10, max: 30, step: 1, required: false }),
      currencyField("asCompletedValue", "Expected Value After Renovation", { default: 420000, max: 100000000, step: 5000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 3.5, max: 100, step: 0.5 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7, max: 20, step: 0.125 }),
      numberField("termYears", "Loan Term (Years)", { default: 30, min: 10, max: 30, step: 5 }),
    ],
    calcResult: { label: "Monthly Principal & Interest", format: "currency" },
    calcResults: [
      { key: "totalProjectCost", label: "Total Project Cost", format: "currency" },
      { key: "downPayment", label: "Cash Needed (Down Payment)", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPrincipalInterest", label: "Monthly Principal & Interest", format: "currency", highlight: true },
      { key: "ltvOnAsCompletedPercent", label: "LTV on After-Renovation Value", format: "percentage" },
      { key: "equityWhenFinished", label: "Equity When Finished", format: "currency" },
    ],
    instructions:
      "A renovation mortgage (such as FHA 203(k) or Fannie Mae HomeStyle) pays for the home and the work in one loan. " +
      "Enter the purchase price, the renovation cost, a contingency reserve for overruns (FHA requires 10%–20% on " +
      "larger projects), the appraiser's expected value after the work, your down payment, and the rate and term.\n\n" +
      "The loan is based on the lower of the total cost and the after-renovation value; if the cost is higher, " +
      "you cover the difference in cash.",
    examples:
      "Example: a $300,000 home plus $60,000 of work and a 10% ($6,000) reserve costs $366,000. With 3.5% down " +
      "($12,810) the loan is $353,190 — $2,349.78 a month at 7% over 30 years. Against a $420,000 after-renovation " +
      "value that's an 84.09% LTV, with $66,810 of equity once the work is done.",
    assumptions:
      "Excludes closing costs, taxes, insurance, and mortgage insurance. Programmes set their own limits on " +
      "renovation amounts, eligible work, and contractors. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between FHA 203(k) and HomeStyle?",
        answer: "FHA 203(k) is government-insured, allows lower credit scores and 3.5% down, but carries FHA mortgage insurance and limits on luxury items. HomeStyle is a conventional loan that allows almost any improvement and mortgage insurance that can be removed later.",
      },
      {
        question: "What happens to the contingency reserve if it isn't used?",
        answer: "Unused reserve money is usually applied to reduce the loan balance once the work is signed off.",
      },
    ],
  },
  {
    slug: "renovation-loan-payment-calculator",
    title: "Renovation Loan Payment Calculator",
    description: "Find the full monthly payment on a renovation mortgage: principal and interest plus property tax, homeowners insurance, and mortgage insurance.",
    metaTitle: "Renovation Loan Payment Calculator — Full PITI",
    metaDescription: "Free renovation loan payment calculator. Add property tax, insurance and mortgage insurance (like FHA MIP) to principal and interest.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 350000, max: 100000000, step: 5000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7, max: 20, step: 0.125 }),
      numberField("termYears", "Loan Term (Years)", { default: 30, min: 10, max: 30, step: 5 }),
      currencyField("annualPropertyTax", "Annual Property Tax", { default: 4200, max: 1000000, step: 100 }),
      currencyField("annualInsurance", "Annual Homeowners Insurance", { default: 1800, max: 1000000, step: 100 }),
      percentField("mortgageInsurancePercent", "Annual Mortgage Insurance Rate", { default: 0.55, max: 2, step: 0.05, required: false }),
    ],
    calcResult: { label: "Total Monthly Payment", format: "currency" },
    calcResults: [
      { key: "principalInterest", label: "Principal & Interest", format: "currency" },
      { key: "propertyTax", label: "Property Tax", format: "currency" },
      { key: "homeInsurance", label: "Homeowners Insurance", format: "currency" },
      { key: "mortgageInsurance", label: "Mortgage Insurance", format: "currency" },
      { key: "totalMonthlyPayment", label: "Total Monthly Payment", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan amount, rate, and term, your annual property tax and insurance, and the annual mortgage " +
      "insurance rate. FHA 203(k) loans with a small down payment typically carry an annual MIP of 0.55% of the " +
      "loan; conventional HomeStyle loans with under 20% equity carry PMI that varies with your credit score. " +
      "Enter 0 if you have no mortgage insurance.\n\n" +
      "Property tax is usually reassessed after a renovation, so use the tax on the after-renovation value if you " +
      "can.",
    examples:
      "Example: a $350,000 loan at 7% over 30 years has $2,328.56 of principal and interest. Add $350 of tax, $150 " +
      "of insurance, and $160.42 of mortgage insurance at 0.55%, and the full payment is $2,988.98 a month.",
    assumptions:
      "Mortgage insurance is estimated on the starting loan balance. FHA loans also charge an upfront MIP (1.75%), " +
      "usually added to the loan. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I make payments while the house is being renovated?",
        answer: "Usually yes — payments start on the normal schedule after closing. Some 203(k) loans let you finance up to six months of payments if you can't live in the home during the work.",
      },
    ],
  },
  {
    slug: "renovation-loan-payoff-calculator",
    title: "Renovation Loan Payoff Calculator",
    description: "See how extra payments shorten your renovation mortgage, the interest saved, and the month your balance reaches 78% of the home's value.",
    metaTitle: "Renovation Loan Payoff Calculator — Extra Payments",
    metaDescription: "Free renovation loan payoff calculator. See years and interest saved with extra payments and when your balance hits 78% of home value.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 350000, max: 100000000, step: 5000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7, max: 20, step: 0.125 }),
      numberField("termYears", "Loan Term (Years)", { default: 30, min: 10, max: 30, step: 5 }),
      currencyField("homeValue", "Home Value (After Renovation)", { default: 400000, max: 100000000, step: 5000 }),
      currencyField("extraMonthly", "Extra Monthly Payment", { default: 200, max: 100000, step: 25, required: false }),
    ],
    calcResult: { label: "Interest Saved", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Regular Monthly Payment", format: "currency" },
      { key: "monthsToPayoff", label: "Months to Payoff With Extra", format: "number", unit: "months" },
      { key: "yearsSaved", label: "Years Saved", format: "number", unit: "years" },
      { key: "interestSaved", label: "Interest Saved", format: "currency", highlight: true },
      { key: "monthReaching78Ltv", label: "Month Balance Reaches 78% of Value", format: "number" },
    ],
    instructions:
      "Enter the loan amount, rate, and term, the home's value after the renovation, and the extra you'd pay each " +
      "month. The tool shows the new payoff date and interest saved, and when your balance first falls to 78% of " +
      "the home's value — the point at which conventional PMI must automatically end.",
    examples:
      "Example: a $350,000, 30-year loan at 7% costs $2,328.56 a month. Paying $200 extra ends it in 284 months — " +
      "6.33 years early — saving $122,121.61 in interest. The balance reaches 78% of a $400,000 value in month 65.",
    assumptions:
      "PMI rules: conventional (HomeStyle) PMI ends automatically at 78% of the original value and can be cancelled " +
      "on request at 80%. FHA MIP with less than 10% down lasts for the life of the loan; with 10% or more down it " +
      "lasts 11 years — refinancing is the usual way out. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can a higher appraisal after renovation remove PMI sooner?",
        answer: "Some lenders let you request PMI removal based on a new appraisal once you've held the loan for a minimum period (often 2–5 years) and reached a lower LTV. Ask your servicer for its rules.",
      },
    ],
  },
  {
    slug: "renovation-loan-interest-calculator",
    title: "Renovation Loan Interest Calculator",
    description: "See the interest charged while renovation funds are released in stages, how much staged draws save versus taking it all upfront, and the loan's lifetime interest.",
    metaTitle: "Renovation Loan Interest Calculator — Draw Schedule",
    metaDescription: "Free renovation loan interest calculator. See interest on staged renovation draws during the work and lifetime interest on the full loan.",
    calcInputs: [
      currencyField("baseLoan", "Purchase / Base Loan (Paid at Closing)", { default: 290000, max: 100000000, step: 5000 }),
      currencyField("renovationFunds", "Renovation Funds (Released in Draws)", { default: 60000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7, max: 20, step: 0.125 }),
      numberField("renovationMonths", "Length of the Work (Months)", { default: 6, min: 1, max: 24, step: 1 }),
      numberField("termYears", "Loan Term (Years)", { default: 30, min: 10, max: 30, step: 5 }),
    ],
    calcResult: { label: "Interest on Draws During the Work", format: "currency" },
    calcResults: [
      { key: "interestOnDrawsDuringWork", label: "Interest on Draws During the Work", format: "currency", highlight: true },
      { key: "interestIfAllDrawnAtStart", label: "If It Were All Drawn on Day One", format: "currency" },
      { key: "interestSavedByStagedDraws", label: "Saved by Staged Draws", format: "currency" },
      { key: "monthlyPrincipalInterest", label: "Monthly Principal & Interest", format: "currency" },
      { key: "lifetimeInterest", label: "Lifetime Interest (Full Loan)", format: "currency" },
    ],
    instructions:
      "On a renovation loan, the purchase part is paid at closing but renovation money is usually held in an escrow " +
      "account and released to the contractor in draws as work is completed and inspected. Enter the base loan, the " +
      "renovation funds, the rate, how many months the work takes, and the term.\n\n" +
      "The tool assumes equal draws at the end of each month of work and shows the interest on the renovation money " +
      "during that time.",
    examples:
      "Example: $60,000 of renovation funds drawn in six equal monthly stages at 7% costs $875 of interest during the " +
      "work, versus $2,100 if it were all drawn on day one — $1,225 less. On the full $350,000 the payment is " +
      "$2,328.56 a month and lifetime interest is $488,281.14.",
    assumptions:
      "Some lenders charge interest on the full loan from closing or on a different draw schedule — check your loan " +
      "estimate. Lifetime interest assumes the full term with no extra payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who approves each draw?",
        answer: "Usually an inspector (a 203(k) consultant on FHA loans) checks the work before the lender releases each payment to the contractor.",
      },
    ],
  },
  {
    slug: "renovation-loan-affordability-calculator",
    title: "Renovation Loan Affordability Calculator",
    description: "Work out the most you can spend on a fixer-upper: the largest renovation mortgage your income supports, and the highest purchase price once the renovation budget is set aside.",
    metaTitle: "Renovation Loan Affordability Calculator — Fixer-Upper",
    metaDescription: "Free renovation loan affordability calculator. Turn your income and debts into a maximum renovation mortgage and fixer-upper purchase price.",
    calcInputs: [
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 9000, max: 1000000, step: 100 }),
      currencyField("otherDebtPayments", "Other Monthly Debt Payments", { default: 600, max: 100000, step: 25, required: false }),
      percentField("maxDtiPercent", "Maximum DTI", { default: 43, max: 57, step: 1 }),
      currencyField("monthlyTaxInsurance", "Monthly Property Tax + Insurance", { default: 550, max: 100000, step: 25 }),
      percentField("mortgageInsurancePercent", "Annual Mortgage Insurance Rate", { default: 0.55, max: 2, step: 0.05, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 7, max: 20, step: 0.125 }),
      numberField("termYears", "Loan Term (Years)", { default: 30, min: 10, max: 30, step: 5 }),
      percentField("downPaymentPercent", "Down Payment", { default: 3.5, max: 99, step: 0.5 }),
      currencyField("renovationCost", "Planned Renovation Budget", { default: 50000, max: 10000000, step: 1000 }),
    ],
    calcResult: { label: "Maximum Purchase Price", format: "currency" },
    calcResults: [
      { key: "maxHousingPayment", label: "Maximum Housing Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency" },
      { key: "maxTotalProject", label: "Maximum Total (Purchase + Renovation)", format: "currency" },
      { key: "maxPurchasePrice", label: "Maximum Purchase Price", format: "currency", highlight: true },
      { key: "downPaymentNeeded", label: "Down Payment Needed", format: "currency" },
    ],
    instructions:
      "Enter your gross monthly income, other debts, the lender's maximum DTI, estimated monthly tax and insurance, " +
      "the mortgage insurance rate, the loan's rate and term, your down payment, and your renovation budget.\n\n" +
      "The tool finds the highest housing payment the DTI limit allows, the loan that payment supports after tax, " +
      "insurance and mortgage insurance, and then subtracts the renovation budget to show the most you can pay " +
      "for the house itself.",
    examples:
      "Example: on $9,000 a month with $600 of other debts and a 43% DTI, housing can be $3,270. After $550 of tax " +
      "and insurance and 0.55% MIP, that supports a $382,486.71 loan. With 3.5% down the total project can be " +
      "$396,359.28 — so with $50,000 of work, look for homes up to $346,359.28.",
    assumptions:
      "FHA allows DTI above 43% in some cases with strong compensating factors. The home must also appraise at an " +
      "after-renovation value high enough to support the loan. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I spend the maximum?",
        answer: "Leave room for surprises. Renovations often run over budget, and moving, furnishing, and higher tax bills after the work all add costs.",
      },
    ],
  },
  {
    slug: "renovation-loan-comparison-calculator",
    title: "Renovation Loan Comparison Calculator",
    description: "Compare one renovation mortgage covering the home and the work with a regular mortgage plus a separate personal loan for the renovation.",
    metaTitle: "Renovation Loan Comparison — One Loan vs Two",
    metaDescription: "Free calculator comparing a renovation mortgage with a regular mortgage plus a personal loan for the work: payments and total cost.",
    calcInputs: [
      currencyField("purchaseLoan", "Mortgage Needed for the Purchase", { default: 280000, max: 100000000, step: 5000 }),
      currencyField("renovationCost", "Renovation Cost", { default: 50000, max: 10000000, step: 1000 }),
      percentField("renovationRatePercent", "Renovation Mortgage Rate", { default: 7.25, max: 20, step: 0.125 }),
      percentField("mortgageRatePercent", "Regular Mortgage Rate", { default: 6.875, max: 20, step: 0.125 }),
      numberField("termYears", "Mortgage Term (Years)", { default: 30, min: 10, max: 30, step: 5 }),
      percentField("personalRatePercent", "Personal Loan Rate", { default: 12, max: 40, step: 0.05 }),
      numberField("personalTermMonths", "Personal Loan Term (Months)", { default: 84, min: 12, max: 144, step: 12 }),
      currencyField("renovationExtraFees", "Extra Renovation Loan Fees (Consultant, Inspections)", { default: 1500, max: 100000, step: 100, required: false }),
    ],
    calcResult: { label: "Renovation Mortgage Saves", format: "currency" },
    calcResults: [
      { key: "renovationMortgagePayment", label: "One Loan — Monthly Payment", format: "currency" },
      { key: "twoLoansPaymentAtStart", label: "Two Loans — Monthly Payment at First", format: "currency" },
      { key: "twoLoansPaymentAfterPersonalLoan", label: "Two Loans — Payment After Personal Loan Ends", format: "currency" },
      { key: "renovationMortgageCost", label: "One Loan — Interest + Extra Fees", format: "currency" },
      { key: "twoLoansCost", label: "Two Loans — Total Interest", format: "currency" },
      { key: "renovationMortgageSaves", label: "Renovation Mortgage Saves (Negative = Costs More)", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the mortgage you need for the purchase, the renovation cost, the rate on a renovation mortgage (often a " +
      "little higher than a standard mortgage), the standard mortgage rate and term, the personal loan's rate and " +
      "term, and any extra fees the renovation loan charges.\n\n" +
      "One loan gives a much lower payment because the renovation is spread over 30 years. Two loans cost more " +
      "each month at first, but the renovation debt is gone in a few years — so the totals can go either way.",
    examples:
      "Example: a renovation mortgage for $330,000 at 7.25% costs $2,251.18 a month. A $280,000 mortgage at 6.875% " +
      "plus a $50,000 7-year personal loan at 12% costs $2,722.04 a month at first, then $1,839.40. Over the full " +
      "terms the single loan costs $481,925.42 and the two loans $406,325.72, so the renovation mortgage costs " +
      "$75,599.70 more — but with a far lower payment.",
    assumptions:
      "Assumes both mortgages run their full term with no extra payments. Ignores mortgage insurance and closing " +
      "costs that apply to both options. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why might I still choose the renovation mortgage?",
        answer: "A lower payment can be the only way to qualify, the rate is fixed for the whole loan, and you can always make extra payments to clear the renovation part faster.",
      },
    ],
  },
  {
    slug: "renovation-loan-eligibility-calculator",
    title: "Renovation Loan Eligibility Calculator",
    description: "Check a renovation mortgage against the main guidelines: loan-to-value on the after-renovation value, debt-to-income with the full housing payment, and credit score.",
    metaTitle: "Renovation Loan Eligibility Calculator — LTV & DTI",
    metaDescription: "Free renovation loan eligibility calculator. Check LTV on the as-completed value, DTI with the housing payment, and your credit score margin.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 280000, max: 100000000, step: 5000 }),
      currencyField("renovationCost", "Renovation Cost (Incl. Reserve)", { default: 60000, max: 10000000, step: 1000 }),
      currencyField("asCompletedValue", "Expected Value After Renovation", { default: 380000, max: 100000000, step: 5000 }),
      currencyField("downPayment", "Down Payment", { default: 15000, max: 100000000, step: 1000 }),
      percentField("maxLtvPercent", "Programme's Maximum LTV", { default: 96.5, max: 100, step: 0.5 }),
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 8500, max: 1000000, step: 100 }),
      currencyField("otherDebtPayments", "Other Monthly Debt Payments", { default: 500, max: 100000, step: 25, required: false }),
      currencyField("monthlyTaxInsurance", "Monthly Tax, Insurance & MI", { default: 500, max: 100000, step: 25 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7, max: 20, step: 0.125 }),
      numberField("termYears", "Loan Term (Years)", { default: 30, min: 10, max: 30, step: 5 }),
      percentField("maxDtiPercent", "Maximum DTI", { default: 43, max: 57, step: 1 }),
      numberField("creditScore", "Your Credit Score", { default: 640, min: 300, max: 850, step: 1 }),
      numberField("lenderMinScore", "Minimum Score", { default: 580, min: 300, max: 850, step: 1 }),
    ],
    calcResult: { label: "LTV on After-Renovation Value", format: "percentage" },
    calcResults: [
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "ltvPercent", label: "LTV on After-Renovation Value", format: "percentage", highlight: true },
      { key: "ltvHeadroomPercent", label: "Room Under LTV Limit", format: "percentage" },
      { key: "housingPayment", label: "Monthly Housing Payment", format: "currency" },
      { key: "dtiPercent", label: "DTI", format: "percentage" },
      { key: "dtiHeadroomPercent", label: "Room Under DTI Limit", format: "percentage" },
      { key: "scoreMargin", label: "Points Above Minimum Score", format: "number" },
    ],
    instructions:
      "Enter the purchase price, the renovation cost including any contingency reserve, the expected after-renovation " +
      "value, your down payment, and the programme's maximum LTV (96.5% for FHA 203(k); up to 97% for some HomeStyle " +
      "loans). Then add your income, debts, housing costs, rate, term, and credit score.\n\n" +
      "A negative room or margin shows which guideline you'd miss.",
    examples:
      "Example: $280,000 + $60,000 of work with $15,000 down needs a $325,000 loan — 85.53% of a $380,000 after-" +
      "renovation value, 10.97 points under 96.5%. The housing payment is $2,662.23, so DTI on $8,500 of income " +
      "with $500 of other debts is 37.20%, 5.80 points under 43%. A 640 score is 60 points above FHA's 580.",
    assumptions:
      "FHA's minimum score is 580 for 3.5% down (500–579 needs 10% down); individual lenders often require more. " +
      "HomeStyle typically needs 620+. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I do the renovation work myself?",
        answer: "Generally not with FHA 203(k) or HomeStyle — lenders require licensed contractors with approved bids. Limited sweat-equity is allowed in some cases.",
      },
    ],
  },
  {
    slug: "timeshare-loan-calculator",
    title: "Timeshare Loan Calculator",
    description: "See the monthly loan payment on a timeshare purchase plus the maintenance fees that come with it, and the total interest on developer financing.",
    metaTitle: "Timeshare Loan Calculator — Payment + Maintenance",
    metaDescription: "Free timeshare loan calculator. See your down payment, monthly loan payment, maintenance fees, total monthly cost and interest.",
    calcInputs: [
      currencyField("price", "Timeshare Price", { default: 24000, max: 10000000, step: 500 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 1 }),
      currencyField("closingCosts", "Closing Costs Financed", { default: 500, max: 100000, step: 50, required: false }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 14.9, max: 30, step: 0.1 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 15, step: 1 }),
      currencyField("annualMaintenance", "Annual Maintenance Fee", { default: 1200, max: 100000, step: 50 }),
    ],
    calcResult: { label: "Total Monthly Cost", format: "currency" },
    calcResults: [
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Loan Payment", format: "currency" },
      { key: "monthlyMaintenance", label: "Monthly Share of Maintenance", format: "currency" },
      { key: "totalMonthlyCost", label: "Total Monthly Cost", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the price, down payment, any closing costs rolled into the loan, the loan's rate and term, and the " +
      "annual maintenance fee. Developer timeshare loans commonly charge rates in the low-to-high teens, and " +
      "maintenance fees are owed every year whether or not you use the timeshare.",
    examples:
      "Example: a $24,000 timeshare with 10% ($2,400) down and $500 of closing costs needs a $22,100 loan. At 14.9% " +
      "over 10 years that's $355.20 a month, plus $100 a month of maintenance — $455.20 in total — with $20,523.77 " +
      "of interest.",
    assumptions:
      "Ignores special assessments, exchange-club fees, and taxes. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I resell a timeshare to pay off the loan?",
        answer: "Often only for a small fraction of the purchase price, and many sell for little or nothing. Don't count on resale value to repay the loan.",
      },
      {
        question: "Is there a cooling-off period?",
        answer: "Most US states give buyers a rescission period (often 3–10 days) to cancel a timeshare contract in writing. Check your contract and state law immediately if you have doubts.",
      },
    ],
  },
  {
    slug: "timeshare-loan-payment-calculator",
    title: "Timeshare Loan Payment Calculator",
    description: "See your timeshare loan payment plus maintenance fees that rise every year — the monthly cost in the first year, the last year of the loan, and on average.",
    metaTitle: "Timeshare Loan Payment Calculator — Rising Fees",
    metaDescription: "Free timeshare loan payment calculator. Add yearly-rising maintenance fees to your loan payment and see first, last and average monthly cost.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 20000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 14.9, max: 30, step: 0.1 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 15, step: 1 }),
      currencyField("annualMaintenance", "Annual Maintenance Fee Today", { default: 1200, max: 100000, step: 50 }),
      percentField("maintenanceIncreasePercent", "Yearly Fee Increase", { default: 5, max: 20, step: 0.5 }),
    ],
    calcResult: { label: "Average Monthly Cost", format: "currency" },
    calcResults: [
      { key: "loanPayment", label: "Monthly Loan Payment", format: "currency" },
      { key: "firstYearMonthlyCost", label: "Monthly Cost in Year 1", format: "currency" },
      { key: "lastYearMonthlyCost", label: "Monthly Cost in the Loan's Last Year", format: "currency" },
      { key: "averageMonthlyCost", label: "Average Monthly Cost", format: "currency", highlight: true },
      { key: "maintenanceOverLoan", label: "Maintenance Paid Over the Loan", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, rate, and term, today's annual maintenance fee, and how fast fees rise each year (they " +
      "have historically climbed faster than general inflation at many resorts). The tool adds the growing fee to " +
      "your fixed loan payment so you can see what the timeshare really costs each month while you're paying it off.",
    examples:
      "Example: a $20,000 loan at 14.9% over 10 years costs $321.45 a month. With a $1,200 fee rising 5% a year, the " +
      "monthly cost is $421.45 in year one and $476.58 in year ten — $447.23 on average — and you pay $15,093.47 of " +
      "maintenance over the loan.",
    assumptions:
      "Fees rise once a year by a constant percentage. Special assessments for major repairs are extra. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do maintenance fees stop when the loan is paid off?",
        answer: "No. Maintenance fees continue for as long as you own the timeshare, which for a deeded week can be indefinitely.",
      },
    ],
  },
  {
    slug: "timeshare-loan-cost-calculator",
    title: "Timeshare Loan Cost Calculator",
    description: "Add up the full cost of owning a financed timeshare — price, interest, and rising maintenance fees, less any resale value — and see the cost per vacation night.",
    metaTitle: "Timeshare Loan Cost Calculator — Cost per Night",
    metaDescription: "Free timeshare cost calculator. Total price, loan interest and rising maintenance fees over the years you own it, and the true cost per night.",
    calcInputs: [
      currencyField("price", "Timeshare Price", { default: 24000, max: 10000000, step: 500 }),
      currencyField("downPayment", "Down Payment", { default: 2400, max: 10000000, step: 100 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 14.9, max: 30, step: 0.1 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 15, step: 1 }),
      currencyField("annualMaintenance", "Annual Maintenance Fee Today", { default: 1200, max: 100000, step: 50 }),
      percentField("maintenanceIncreasePercent", "Yearly Fee Increase", { default: 5, max: 20, step: 0.5 }),
      numberField("yearsOwned", "Years You'll Own It", { default: 15, min: 1, max: 50, step: 1 }),
      numberField("nightsPerYear", "Nights Used per Year", { default: 7, min: 1, max: 365, step: 1 }),
      currencyField("resaleValue", "Expected Resale Value", { default: 0, max: 10000000, step: 500, required: false }),
    ],
    calcResult: { label: "Cost per Night", format: "currency" },
    calcResults: [
      { key: "totalInterest", label: "Loan Interest", format: "currency" },
      { key: "totalMaintenance", label: "Maintenance Fees While Owned", format: "currency" },
      { key: "totalCostOfOwnership", label: "Total Cost of Ownership", format: "currency" },
      { key: "costPerYear", label: "Cost per Year", format: "currency" },
      { key: "costPerNight", label: "Cost per Night", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the price and down payment, the loan's rate and term, today's maintenance fee and its yearly increase, " +
      "how many years you'll own the timeshare, how many nights a year you'll use it, and what you might sell it " +
      "for (many sell for little or nothing — 0 is a safe estimate).\n\n" +
      "Compare the cost per night with what renting a similar resort unit would cost.",
    examples:
      "Example: a $24,000 timeshare with $2,400 down at 14.9% over 10 years costs $20,059.43 in interest. A $1,200 fee " +
      "rising 5% a year adds $25,894.28 over 15 years. With no resale value, ownership costs $69,953.71 — " +
      "$4,663.58 a year, or $666.23 for each of 7 nights a year.",
    assumptions:
      "Ignores travel costs, exchange fees, special assessments, and what the down payment could have earned " +
      "elsewhere. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a timeshare an investment?",
        answer: "Generally no. Timeshares rarely appreciate, resale markets are weak, and fees continue every year. Think of it as prepaying for vacations rather than buying an asset.",
      },
    ],
  },
  {
    slug: "timeshare-loan-payoff-calculator",
    title: "Timeshare Loan Payoff Calculator",
    description: "Compare two ways to get out of a high-rate timeshare loan faster: paying extra each month, or refinancing the balance with a cheaper personal loan.",
    metaTitle: "Timeshare Loan Payoff Calculator — Extra vs Refinance",
    metaDescription: "Free timeshare loan payoff calculator. Compare extra monthly payments with refinancing into a lower-rate personal loan.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 15000, max: 10000000, step: 250 }),
      percentField("annualRatePercent", "Current Interest Rate", { default: 15.9, max: 30, step: 0.1 }),
      currencyField("monthlyPayment", "Current Monthly Payment", { default: 300, max: 100000, step: 10 }),
      currencyField("extraMonthly", "Extra Monthly Payment", { default: 100, max: 100000, step: 10, required: false }),
      percentField("refiRatePercent", "Personal Loan Rate for Refinancing", { default: 10, max: 40, step: 0.05 }),
    ],
    calcResult: { label: "Interest Saved by Refinancing", format: "currency" },
    calcResults: [
      { key: "monthsLeft", label: "Months Left at Current Payment", format: "number", unit: "months" },
      { key: "monthsWithExtra", label: "Months Left With Extra Payment", format: "number", unit: "months" },
      { key: "interestSavedWithExtra", label: "Interest Saved With Extra Payment", format: "currency" },
      { key: "refinancePayment", label: "Personal Loan Payment (Same Months Left)", format: "currency" },
      { key: "interestSavedByRefinancing", label: "Interest Saved by Refinancing", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your balance, rate, and payment, an extra amount you could add, and the rate a personal loan lender " +
      "offers you. The refinance option keeps the same number of months left, so you can see the saving from the " +
      "lower rate alone. You can combine both: refinance and then pay extra on the new loan.",
    examples:
      "Example: $15,000 at 15.9% paid at $300 a month takes 83 more months. Paying $100 extra cuts it to 53 months " +
      "and saves $3,881.45. Refinancing at 10% over the same 83 months drops the payment to $251.09 and saves " +
      "$3,915.26.",
    assumptions:
      "Ignores any origination fee on the personal loan. Check whether the developer loan has a prepayment " +
      "penalty. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why are timeshare loans so expensive?",
        answer: "Developers offer instant financing at the sales presentation, often without much shopping around, and timeshares make poor collateral because they're hard to resell — so rates are high.",
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
