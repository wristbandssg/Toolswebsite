// One-time (but safe to re-run) batch setup script: creates the 13 tools
// of the Loan Calculators expansion 2, sub-batch 6 (Construction Loans),
// filed under Finance Calculators > Mortgage Calculators. See src/lib/calc-engine-mortgage-construction.ts for
// the math and src/lib/calc-engine-loan-life-events.ts for the full batch
// context.
//
// HOW TO RUN
//   npx tsx prisma/create-mortgage-construction-calculators.ts
// or
//   npm run db:create-mortgage-construction-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Re-pointed 5 Oct 2026: Mortgage Calculators was split into 5 sub-categories
// (see organize-tool-categories.ts); this script creates its sub-category if missing.
const PARENT_CATEGORY_SLUG = "mortgage-calculators";
const CATEGORY = { name: "Property & Construction Mortgage Calculators", slug: "property-construction-mortgage-calculators" };

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
    slug: "construction-loan-calculator",
    title: "Construction Loan Calculator",
    description: "Add up land, build, soft costs and a contingency, see how big a construction loan you can get under loan-to-cost and loan-to-value limits, and the cash and interest you'll need.",
    metaTitle: "Construction Loan Calculator — Build a Home",
    metaDescription: "Free construction loan calculator. Total your build costs, size the loan by LTC and LTV, and see cash needed and interest during construction.",
    calcInputs: [
      currencyField("landValue", "Land Price / Value", { default: 80000, max: 100000000, step: 1000 }),
      {
        key: "landOwned", label: "Do You Already Own the Land?", type: "dropdown", required: true, default: 0,
        options: [
          { label: "No — Buying It With the Loan", value: 0 },
          { label: "Yes — It Counts Toward My Equity", value: 1 },
        ],
      },
      currencyField("buildCost", "Builder's Construction Cost", { default: 350000, max: 100000000, step: 1000 }),
      currencyField("softCosts", "Soft Costs (Plans, Permits, Fees)", { default: 25000, max: 10000000, step: 500, required: false }),
      percentField("contingencyPercent", "Contingency (% of Build Cost)", { default: 10, max: 30, step: 1, required: false }),
      percentField("maxLtcPercent", "Lender's Maximum Loan-to-Cost", { default: 80, max: 100, step: 1 }),
      currencyField("asCompletedValue", "Appraised Value When Finished", { default: 520000, max: 100000000, step: 1000 }),
      percentField("maxLtvPercent", "Lender's Maximum Loan-to-Value", { default: 80, max: 100, step: 1 }),
      percentField("annualRatePercent", "Construction Interest Rate", { default: 8.5, max: 20, step: 0.125 }),
      numberField("buildMonths", "Months to Build", { default: 12, min: 1, max: 36, step: 1 }),
    ],
    calcResult: { label: "Loan Amount", format: "currency" },
    calcResults: [
      { key: "totalProjectCost", label: "Total Project Cost", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency", highlight: true },
      { key: "equityRequired", label: "Equity Required", format: "currency" },
      { key: "cashNeeded", label: "Cash Needed (After Land Equity)", format: "currency" },
      { key: "interestDuringBuild", label: "Interest During Construction", format: "currency" },
    ],
    instructions:
      "Enter the land price (or value, if you own it), the builder's cost, soft costs such as plans and permits, a " +
      "contingency, the lender's loan-to-cost and loan-to-value limits, the appraised value when finished, the " +
      "construction rate, and the build time.\n\n" +
      "The loan is the lower of the two limits. If you already own the land, its value usually counts toward the " +
      "equity the lender requires. Interest during the build assumes equal monthly draws, paid interest-only.",
    examples:
      "Example: $80,000 land, a $350,000 build, $25,000 of soft costs, and a 10% ($35,000) contingency total $490,000. " +
      "At 80% loan-to-cost you can borrow $392,000 (80% of the $520,000 finished value would allow $416,000). That " +
      "leaves $98,000 of equity to put in, and about $15,271.67 of interest over a 12-month build at 8.5%.",
    assumptions:
      "Lenders also require an approved builder, plans, and a budget. Closing costs aren't included. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is a construction loan different from a mortgage?",
        answer: "Money is released in stages (draws) as the house is built, you usually pay only interest on what's been drawn, and the loan is then converted to — or paid off by — a regular mortgage when the home is finished.",
      },
    ],
  },
  {
    slug: "construction-loan-payment-calculator",
    title: "Construction Loan Payment Calculator",
    description: "See how your interest-only construction payment grows as money is drawn, the total interest during the build, and the permanent mortgage payment afterwards.",
    metaTitle: "Construction Loan Payment Calculator — Interest-Only",
    metaDescription: "Free construction loan payment calculator. See the first and last interest-only payments, build-phase interest, and the permanent payment.",
    calcInputs: [
      currencyField("loanAmount", "Construction Loan Amount", { default: 400000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Construction Interest Rate", { default: 8.5, max: 20, step: 0.125 }),
      numberField("buildMonths", "Months to Build", { default: 12, min: 1, max: 36, step: 1 }),
      percentField("drawnAtClosingPercent", "Drawn at Closing (e.g. Land Purchase)", { default: 20, max: 100, step: 1, required: false }),
      percentField("permanentRatePercent", "Permanent Mortgage Rate", { default: 7, max: 20, step: 0.125 }),
      numberField("permanentYears", "Permanent Mortgage Term (Years)", { default: 30, min: 5, max: 40, step: 5 }),
    ],
    calcResult: { label: "Interest During the Build", format: "currency" },
    calcResults: [
      { key: "firstMonthPayment", label: "First Month's Payment", format: "currency" },
      { key: "lastMonthPayment", label: "Last Month's Payment (Fully Drawn)", format: "currency" },
      { key: "totalInterestDuringBuild", label: "Interest During the Build", format: "currency", highlight: true },
      { key: "permanentPayment", label: "Permanent Mortgage Payment", format: "currency" },
    ],
    instructions:
      "Enter the loan, construction rate, and build time, how much is drawn at closing (for example, to buy the land), " +
      "and the permanent mortgage's rate and term. The rest is drawn in equal amounts at the start of each month. You " +
      "pay interest only on what's been drawn, so payments start small and rise until the house is finished.",
    examples:
      "Example: a $400,000 loan at 8.5% over a 12-month build with 20% drawn at closing starts at $755.56 a month and " +
      "rises to $2,833.33 — $21,533.33 of interest during the build. Then the permanent mortgage at 7% over 30 years " +
      "costs $2,661.21 a month.",
    assumptions:
      "Real draw schedules follow inspections and may be uneven. Taxes and insurance aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I have to make payments while I'm still paying rent?",
        answer: "Usually yes — interest-only payments are due monthly during construction. Some lenders let you set up an interest reserve inside the loan so the payments are covered for you.",
      },
    ],
  },
  {
    slug: "construction-loan-payoff-calculator",
    title: "Construction Loan Payoff Calculator",
    description: "Plan how to pay off a construction-only loan when the house is finished: the payoff amount, the largest mortgage you can get, and whether selling your current home closes the gap.",
    metaTitle: "Construction Loan Payoff Calculator — End of Build",
    metaDescription: "Free construction loan payoff calculator. See the payoff amount, your maximum permanent mortgage, and any shortfall after selling your home.",
    calcInputs: [
      currencyField("constructionBalance", "Construction Loan Balance at Completion", { default: 400000, max: 100000000, step: 1000 }),
      currencyField("unpaidInterest", "Any Unpaid / Accrued Interest", { default: 0, max: 10000000, step: 100, required: false }),
      currencyField("homeSaleProceeds", "Net Proceeds From Selling Your Current Home", { default: 120000, max: 100000000, step: 1000, required: false }),
      currencyField("appraisedValue", "New Home's Appraised Value", { default: 520000, max: 100000000, step: 1000 }),
      percentField("permanentMaxLtvPercent", "Permanent Mortgage Maximum LTV", { default: 80, max: 100, step: 1 }),
      currencyField("closingCosts", "Permanent Mortgage Closing Costs", { default: 6000, max: 1000000, step: 100, required: false }),
    ],
    calcResult: { label: "Surplus (+) or Shortfall (−)", format: "currency" },
    calcResults: [
      { key: "payoffAmount", label: "Construction Loan Payoff", format: "currency" },
      { key: "maxPermanentMortgage", label: "Largest Permanent Mortgage", format: "currency" },
      { key: "mortgageNeeded", label: "Mortgage Needed After Sale Proceeds", format: "currency" },
      { key: "surplusOrShortfall", label: "Surplus (+) or Shortfall (−)", format: "currency", highlight: true },
    ],
    instructions:
      "With a construction-only (two-time close) loan, the whole balance is due when building ends, so you need a new " +
      "mortgage to pay it off. Enter the balance and any unpaid interest, the money from selling your current home, " +
      "the new home's appraised value, the mortgage's maximum LTV, and its closing costs. A negative result is cash " +
      "you'll need to find; 0 means it's covered exactly.",
    examples:
      "Example: a $400,000 construction balance plus $6,000 of closing costs, with $120,000 from selling your home, " +
      "needs a $286,000 mortgage — well under the $416,000 (80% of $520,000) available, so it's fully covered.",
    assumptions:
      "Assumes you qualify for the mortgage on income and credit at completion; rates can change while you build. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if my home hasn't sold when the house is finished?",
        answer: "You may need a bridge loan, a larger permanent mortgage if you qualify for both payments, or a construction loan extension. Plan for this before you start building.",
      },
    ],
  },
  {
    slug: "construction-loan-refinance-calculator",
    title: "Construction Loan Refinance Calculator",
    description: "Compare a one-time-close construction-to-permanent loan with refinancing into a separately shopped mortgage at completion (two-time close).",
    metaTitle: "Construction Loan Refinance — One-Time vs Two-Time Close",
    metaDescription: "Free calculator comparing one-time and two-time close construction loans: payments, extra closing costs, break-even and net savings.",
    calcInputs: [
      currencyField("loanAmount", "Permanent Loan Amount", { default: 400000, max: 100000000, step: 1000 }),
      percentField("oneTimeRatePercent", "One-Time Close Permanent Rate", { default: 7.25, max: 20, step: 0.125 }),
      percentField("twoTimeRatePercent", "Separate Mortgage Rate at Completion", { default: 6.75, max: 20, step: 0.125 }),
      currencyField("secondClosingCosts", "Second Closing Costs", { default: 6000, max: 1000000, step: 100 }),
      numberField("termYears", "Mortgage Term (Years)", { default: 30, min: 5, max: 40, step: 5 }),
      numberField("yearsKept", "Years You'll Keep the Mortgage", { default: 10, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Net Saving From Two-Time Close", format: "currency" },
    calcResults: [
      { key: "oneTimeClosePayment", label: "One-Time Close — Payment", format: "currency" },
      { key: "twoTimeClosePayment", label: "Two-Time Close — Payment", format: "currency" },
      { key: "monthlySavingTwoTime", label: "Monthly Saving With Two-Time Close", format: "currency" },
      { key: "breakEvenMonths", label: "Months to Recover Second Closing", format: "number", unit: "months" },
      { key: "netSavingTwoTime", label: "Net Saving From Two-Time Close", format: "currency", highlight: true },
    ],
    instructions:
      "A one-time close loan locks your permanent rate and needs only one closing. A two-time close lets you shop for " +
      "the best mortgage when the house is done, but you pay closing costs twice and take the risk that rates rise. " +
      "Enter the loan amount, both rates, the second closing's costs, the term, and how long you'll keep the mortgage.",
    examples:
      "Example: on $400,000 over 30 years, 7.25% one-time close costs $2,728.71 a month; a 6.75% mortgage shopped at " +
      "completion costs $2,594.39 — $134.31 less. The extra $6,000 closing is recovered in 45 months, and over 10 years " +
      "two-time close saves $10,117.53.",
    assumptions:
      "The two-time rate is your estimate — it could be higher if rates rise during the build. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which should I choose?",
        answer: "One-time close suits people who want certainty and fewer fees. Two-time close can make sense if you expect rates to fall, want to change lenders, or need a construction lender that doesn't offer permanent loans.",
      },
    ],
  },
  {
    slug: "construction-loan-apr-calculator",
    title: "Construction Loan APR Calculator",
    description: "Find the APR of a construction-to-permanent loan with an interest-only build phase, once points and closing fees are included.",
    metaTitle: "Construction Loan APR Calculator — Points & Fees",
    metaDescription: "Free construction loan APR calculator. Include points and fees on a construction-to-permanent loan with an interest-only build phase.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 400000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.5, max: 20, step: 0.125 }),
      numberField("buildMonths", "Interest-Only Build Months", { default: 12, min: 0, max: 36, step: 1 }),
      numberField("termYears", "Permanent Term After the Build (Years)", { default: 30, min: 5, max: 40, step: 5 }),
      percentField("pointsPercent", "Points / Origination (% of Loan)", { default: 1, max: 10, step: 0.125, required: false }),
      currencyField("fees", "Other Lender Fees ($)", { default: 4000, max: 1000000, step: 100, required: false }),
    ],
    calcResult: { label: "APR", format: "percentage" },
    calcResults: [
      { key: "aprPercent", label: "APR", format: "percentage", highlight: true },
      { key: "upfrontCosts", label: "Points + Fees", format: "currency" },
      { key: "interestOnlyPayment", label: "Interest-Only Payment (Fully Drawn)", format: "currency" },
      { key: "permanentPayment", label: "Permanent Payment", format: "currency" },
    ],
    instructions:
      "Enter the loan, rate, the interest-only build period, the permanent term, points, and other lender fees. The " +
      "APR spreads the upfront costs over the life of the loan, so you can compare offers with different rates and " +
      "fees on equal terms.",
    examples:
      "Example: $400,000 at 7.5% with 12 interest-only months ($2,500 a month) then 30 years at $2,796.86, plus 1 point " +
      "and $4,000 of fees ($8,000 in total), has an APR of about 7.70%.",
    assumptions:
      "Simplified: assumes the whole loan is advanced at closing. The official disclosure may assume a partial draw " +
      "during construction, so its APR can differ slightly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why compare APR and not just the rate?",
        answer: "A lower rate with high points and fees can cost more than a slightly higher rate with low fees. APR captures both.",
      },
    ],
  },
  {
    slug: "construction-loan-affordability-calculator",
    title: "Construction Loan Affordability Calculator",
    description: "Turn your income into the largest mortgage you qualify for, the biggest total project that allows, and the build budget left after buying land.",
    metaTitle: "Construction Loan Affordability Calculator — Build Budget",
    metaDescription: "Free construction loan affordability calculator. Turn income and debts into a maximum mortgage, total project and build budget after land.",
    calcInputs: [
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 12000, max: 10000000, step: 100 }),
      currencyField("otherDebts", "Other Monthly Debt Payments", { default: 800, max: 1000000, step: 25, required: false }),
      percentField("frontRatioPercent", "Max Housing Ratio", { default: 28, max: 50, step: 1 }),
      percentField("backRatioPercent", "Max Total DTI", { default: 36, max: 57, step: 1 }),
      currencyField("monthlyTaxInsurance", "Monthly Property Tax & Insurance", { default: 700, max: 100000, step: 25 }),
      percentField("annualRatePercent", "Permanent Mortgage Rate", { default: 7, max: 20, step: 0.125 }),
      numberField("termYears", "Mortgage Term (Years)", { default: 30, min: 5, max: 40, step: 5 }),
      percentField("downPaymentPercent", "Equity / Down Payment", { default: 20, max: 99, step: 1 }),
      currencyField("landCost", "Land Cost", { default: 80000, max: 100000000, step: 1000 }),
    ],
    calcResult: { label: "Maximum Build Budget", format: "currency" },
    calcResults: [
      { key: "maxHousingPayment", label: "Maximum Housing Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Mortgage", format: "currency" },
      { key: "maxTotalProject", label: "Maximum Total Project", format: "currency" },
      { key: "maxBuildBudget", label: "Maximum Build Budget", format: "currency", highlight: true },
      { key: "downPaymentNeeded", label: "Equity / Down Payment Needed", format: "currency" },
    ],
    instructions:
      "Enter your income and debts, the housing and total debt ratios (28% and 36% are classic guidelines), estimated " +
      "monthly tax and insurance on the finished home, the permanent mortgage's rate and term, your equity percentage " +
      "(construction lenders often want 20%), and the land cost. The housing payment is the lower of the two ratio " +
      "limits.",
    examples:
      "Example: on $12,000 a month with $800 of other debts, the housing payment can be $3,360. After $700 of tax and " +
      "insurance, that supports a $399,818.13 mortgage at 7% over 30 years. With 20% equity the project can total " +
      "$499,772.66 — a build budget of $419,772.66 after $80,000 of land.",
    assumptions:
      "Doesn't include closing costs or interest during construction, which you'll also need cash for. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does owning my land help?",
        answer: "Yes — land you own outright often counts toward the equity requirement, which can reduce or even cover the cash down payment.",
      },
    ],
  },
  {
    slug: "construction-loan-eligibility-calculator",
    title: "Construction Loan Eligibility Calculator",
    description: "Check a construction loan against typical lender requirements: loan-to-cost, debt-to-income with the finished home's payment, credit score and cash reserves.",
    metaTitle: "Construction Loan Eligibility Calculator — Free",
    metaDescription: "Free construction loan eligibility calculator. Check loan-to-cost, DTI, credit score and cash reserves against a lender's requirements.",
    calcInputs: [
      numberField("creditScore", "Your Credit Score", { default: 700, min: 300, max: 850, step: 1 }),
      numberField("lenderMinScore", "Lender's Minimum Score", { default: 680, min: 300, max: 850, step: 1 }),
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 12000, max: 10000000, step: 100 }),
      currencyField("otherDebts", "Other Monthly Debt Payments", { default: 800, max: 1000000, step: 25, required: false }),
      currencyField("projectCost", "Total Project Cost", { default: 480000, max: 100000000, step: 1000 }),
      currencyField("equityIn", "Your Equity (Cash + Land Value)", { default: 100000, max: 100000000, step: 1000 }),
      percentField("maxLtcPercent", "Lender's Maximum Loan-to-Cost", { default: 80, max: 100, step: 1 }),
      currencyField("monthlyTaxInsurance", "Monthly Property Tax & Insurance", { default: 700, max: 100000, step: 25 }),
      percentField("annualRatePercent", "Permanent Mortgage Rate", { default: 7, max: 20, step: 0.125 }),
      numberField("termYears", "Mortgage Term (Years)", { default: 30, min: 5, max: 40, step: 5 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 43, max: 57, step: 1 }),
      currencyField("liquidAssets", "Cash Reserves Left After Closing", { default: 40000, max: 100000000, step: 1000 }),
      numberField("reserveMonths", "Reserves Required (Months of Payments)", { default: 6, min: 0, max: 24, step: 1 }),
    ],
    calcResult: { label: "Loan-to-Cost", format: "percentage" },
    calcResults: [
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "ltcPercent", label: "Loan-to-Cost", format: "percentage", highlight: true },
      { key: "ltcHeadroomPercent", label: "Room Under LTC Limit", format: "percentage" },
      { key: "housingPayment", label: "Finished Home's Housing Payment", format: "currency" },
      { key: "dtiPercent", label: "DTI", format: "percentage" },
      { key: "dtiHeadroomPercent", label: "Room Under DTI Limit", format: "percentage" },
      { key: "scoreMargin", label: "Points Above Minimum Score", format: "number" },
      { key: "reserveMargin", label: "Cash Above Required Reserves", format: "currency" },
    ],
    instructions:
      "Construction lenders are usually stricter than regular mortgage lenders. Enter your score, income, and debts, " +
      "the total project cost and your equity in it (cash plus land you own), the lender's LTC limit, the finished " +
      "home's tax and insurance, the permanent rate and term, the DTI limit, and your cash reserves and the number of " +
      "months' payments the lender wants you to hold. Negative results show where you fall short.",
    examples:
      "Example: a $480,000 project with $100,000 of equity needs a $380,000 loan — 79.17% of cost, under an 80% limit. " +
      "The finished home's payment of $3,228.15 puts DTI at 33.57% on $12,000 of income. A 700 score is 20 above 680, " +
      "and $40,000 of savings is $20,631.10 more than 6 months of payments.",
    assumptions:
      "Lenders also approve the builder, plans, and budget. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What credit score do construction lenders want?",
        answer: "Often 680–720 or higher for conventional construction loans, with at least 20% equity. FHA, VA, and USDA one-time-close programmes can allow lower scores and down payments.",
      },
    ],
  },
  {
    slug: "construction-loan-interest-calculator",
    title: "Construction Loan Interest Calculator",
    description: "Estimate construction interest on a typical five-stage draw schedule, the interest reserve to budget, and how much staged draws save compared with drawing everything at closing.",
    metaTitle: "Construction Loan Interest Calculator — Draw Schedule",
    metaDescription: "Free construction loan interest calculator. Estimate interest on a 5-stage draw schedule, the interest reserve and savings from staged draws.",
    calcInputs: [
      currencyField("loanAmount", "Construction Loan Amount", { default: 400000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Construction Interest Rate", { default: 8.5, max: 20, step: 0.125 }),
      numberField("buildMonths", "Months to Build", { default: 10, min: 1, max: 36, step: 1 }),
    ],
    calcResult: { label: "Interest During the Build", format: "currency" },
    calcResults: [
      { key: "interestDuringBuild", label: "Interest During the Build", format: "currency", highlight: true },
      { key: "averageBalance", label: "Average Amount Drawn", format: "currency" },
      { key: "peakMonthlyInterest", label: "Highest Monthly Interest (Fully Drawn)", format: "currency" },
      { key: "interestIfAllDrawnAtClosing", label: "If It Were All Drawn at Closing", format: "currency" },
      { key: "savedByStagedDraws", label: "Saved by Staged Draws", format: "currency" },
    ],
    instructions:
      "Builders are paid in stages after inspections. This tool uses a common five-stage schedule — foundation 15%, " +
      "framing 20%, rough-ins (plumbing, electrical, HVAC) 25%, drywall and finishes 25%, and final completion 15% — " +
      "released at evenly spaced points in the build. Enter the loan, rate, and build time. The total is a good " +
      "estimate for an interest reserve if your lender lets you build one into the loan.",
    examples:
      "Example: a $400,000 loan at 8.5% over a 10-month build averages $236,000 drawn, so interest during the build is " +
      "about $16,716.67. Drawing it all at closing would cost $28,333.33 — staged draws save $11,616.67.",
    assumptions:
      "Your builder's draw schedule may differ — ask for it and adjust. Delays add interest. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is an interest reserve?",
        answer: "Part of the loan set aside to pay the construction interest automatically, so you don't make monthly payments during the build. It increases the loan amount.",
      },
    ],
  },
  {
    slug: "construction-loan-early-payoff-calculator",
    title: "Construction Loan Early Payoff Calculator",
    description: "See what finishing your build — and converting or paying off the construction loan — early saves in interest and rent, and what the same delay would cost including rate-lock extension fees.",
    metaTitle: "Construction Loan Early Payoff Calculator",
    metaDescription: "Free construction loan early payoff calculator. See savings from finishing early and the cost of delays, including rate-lock extension fees.",
    calcInputs: [
      currencyField("loanAmount", "Construction Loan (Fully Drawn)", { default: 400000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Construction Interest Rate", { default: 8.5, max: 20, step: 0.125 }),
      currencyField("monthlyRent", "Rent You Pay While Building", { default: 2200, max: 100000, step: 50, required: false }),
      percentField("lockExtensionPercent", "Rate-Lock Extension Fee per Month (% of Loan)", { default: 0.25, max: 2, step: 0.05, required: false }),
      numberField("months", "Months Early (or Late)", { default: 2, min: 0, max: 24, step: 0.5 }),
    ],
    calcResult: { label: "Saved by Finishing Early", format: "currency" },
    calcResults: [
      { key: "interestPerMonthFullyDrawn", label: "Construction Interest per Month", format: "currency" },
      { key: "carryingCostPerMonth", label: "Interest + Rent per Month", format: "currency" },
      { key: "savedByFinishingEarly", label: "Saved by Finishing Early", format: "currency", highlight: true },
      { key: "costOfSameDelay", label: "Cost If It Ran Late Instead", format: "currency" },
    ],
    instructions:
      "Near the end of a build, the loan is fully drawn and you may be paying rent too. Every month sooner you move in " +
      "and convert or pay off the construction loan saves both. Enter the drawn amount, rate, rent, any rate-lock " +
      "extension fee your lender charges if completion slips, and the number of months.",
    examples:
      "Example: a fully drawn $400,000 loan at 8.5% costs $2,833.33 a month; with $2,200 rent that's $5,033.33. Finishing " +
      "2 months early saves $10,066.67 — and a 2-month delay with a 0.25% monthly lock extension would cost $12,066.67.",
    assumptions:
      "Builder contracts may include completion deadlines or penalties for delays — check yours. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I avoid construction delays?",
        answer: "Choose an experienced builder, finalise selections before starting, order long-lead items early, and keep a weather buffer in the schedule.",
      },
    ],
  },
  {
    slug: "construction-loan-comparison-calculator",
    title: "Construction Loan Comparison Calculator",
    description: "Compare building a new home with a construction loan against buying an existing home: total cost to move in and the equity you'd start with.",
    metaTitle: "Construction Loan Comparison — Build vs Buy",
    metaDescription: "Free build vs buy calculator. Compare the full cost of building with a construction loan with buying an existing home, and starting equity.",
    calcInputs: [
      currencyField("landCost", "Build — Land", { default: 80000, max: 100000000, step: 1000 }),
      currencyField("buildCost", "Build — Construction Cost", { default: 380000, max: 100000000, step: 1000 }),
      currencyField("softCosts", "Build — Soft Costs", { default: 25000, max: 10000000, step: 500 }),
      currencyField("constructionInterest", "Build — Construction Interest", { default: 15000, max: 10000000, step: 500 }),
      currencyField("rentDuringBuild", "Build — Rent While Building", { default: 26400, max: 10000000, step: 500, required: false }),
      currencyField("newHomeValue", "Build — Value When Finished", { default: 540000, max: 100000000, step: 1000 }),
      currencyField("existingPrice", "Buy — Existing Home Price", { default: 500000, max: 100000000, step: 1000 }),
      currencyField("repairsAndUpdates", "Buy — Repairs & Updates", { default: 20000, max: 10000000, step: 500, required: false }),
    ],
    calcResult: { label: "Building Costs More By", format: "currency" },
    calcResults: [
      { key: "buildTotalCost", label: "Build — Total Cost to Move In", format: "currency" },
      { key: "buildEquityAtMoveIn", label: "Build — Equity at Move-In", format: "currency" },
      { key: "buyTotalCost", label: "Buy — Total Cost to Move In", format: "currency" },
      { key: "buildCostsMore", label: "Building Costs More By", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the costs of building — land, construction, soft costs, construction interest (see the Construction Loan " +
      "Interest Calculator), and rent while you wait — and the finished home's value. Then enter the price of a " +
      "comparable existing home and any repairs it needs. A negative result means building costs less.",
    examples:
      "Example: building costs $526,400 including $15,000 of interest and $26,400 of rent, for a home worth $540,000 — " +
      "$13,600 of equity on day one. Buying a $500,000 home that needs $20,000 of work costs $520,000, so building costs " +
      "$6,400 more but gives you a new home built to your plans.",
    assumptions:
      "Ignores closing costs (similar for both), cost overruns, and lower maintenance on a new home. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is building always more expensive?",
        answer: "Not always — it depends on land prices, local construction costs, and the existing-home market. New homes also tend to cost less to maintain and run in the early years.",
      },
    ],
  },
  {
    slug: "construction-loan-amortization-calculator",
    title: "Construction Loan Amortization Calculator",
    description: "See a construction-to-permanent loan's interest-only phase, then its permanent payment and balance after 5 and 10 years.",
    metaTitle: "Construction Loan Amortization Calculator",
    metaDescription: "Free construction loan amortization calculator. See the interest-only phase, permanent payment, and balances after 5 and 10 years.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 400000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7, max: 20, step: 0.125 }),
      numberField("interestOnlyMonths", "Interest-Only Months (Build Phase)", { default: 12, min: 0, max: 36, step: 1 }),
      numberField("termYears", "Permanent Term (Years)", { default: 30, min: 5, max: 40, step: 5 }),
    ],
    calcResult: { label: "Permanent Payment", format: "currency" },
    calcResults: [
      { key: "interestOnlyPayment", label: "Interest-Only Payment", format: "currency" },
      { key: "interestOnlyPhaseTotal", label: "Interest-Only Phase Total", format: "currency" },
      { key: "permanentPayment", label: "Permanent Payment", format: "currency", highlight: true },
      { key: "balanceAfter5Years", label: "Balance 5 Years Into the Permanent Loan", format: "currency" },
      { key: "balanceAfter10Years", label: "Balance 10 Years Into the Permanent Loan", format: "currency" },
      { key: "interestFirst5Years", label: "Interest in the First 5 Permanent Years", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, rate, interest-only build months, and permanent term. During the build no principal is " +
      "repaid; after conversion the loan amortizes like a normal mortgage. This shows both phases with the loan " +
      "fully drawn — useful for planning a sale or refinance.",
    examples:
      "Example: $400,000 at 7% costs $2,333.33 a month interest-only — $28,000 over 12 build months. The 30-year " +
      "permanent payment is $2,661.21. Five years in you'd owe $376,526.36 (having paid $136,198.96 of interest), and " +
      "$343,249.53 after ten.",
    assumptions:
      "Assumes the loan is fully drawn throughout the interest-only phase and the rate doesn't change at conversion. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can the rate change when the loan converts?",
        answer: "On a one-time close loan with a locked permanent rate, no. Some loans set or 'float down' the permanent rate at conversion — check your terms.",
      },
    ],
  },
  {
    slug: "construction-loan-prequalification-calculator",
    title: "Construction Loan Prequalification Calculator",
    description: "If you own your land, see whether a prequalified construction loan and your cash cover the project once the lender's loan-to-cost limit is applied.",
    metaTitle: "Construction Loan Prequalification Calculator",
    metaDescription: "Free construction loan prequalification calculator. Check your prequalified amount against the LTC limit and the cash still needed.",
    calcInputs: [
      currencyField("prequalifiedAmount", "Prequalified Loan Amount", { default: 380000, max: 100000000, step: 1000 }),
      percentField("maxLtcPercent", "Lender's Maximum Loan-to-Cost", { default: 80, max: 100, step: 1 }),
      currencyField("landValueOwned", "Value of Land You Own", { default: 80000, max: 100000000, step: 1000, required: false }),
      currencyField("buildBudget", "Builder's Budget", { default: 380000, max: 100000000, step: 1000 }),
      currencyField("softCosts", "Soft Costs", { default: 20000, max: 10000000, step: 500, required: false }),
      currencyField("cashAvailable", "Cash You Have Available", { default: 30000, max: 100000000, step: 1000 }),
    ],
    calcResult: { label: "Funding Gap", format: "currency" },
    calcResults: [
      { key: "totalProjectCost", label: "Total Project Cost (Incl. Land)", format: "currency" },
      { key: "maxByLoanToCost", label: "Most Allowed by Loan-to-Cost", format: "currency" },
      { key: "loanAvailable", label: "Loan Available", format: "currency" },
      { key: "cashNeeded", label: "Cash Needed After Land Equity", format: "currency" },
      { key: "fundingGap", label: "Funding Gap", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your prequalified amount, the lender's loan-to-cost limit, the value of land you already own, the " +
      "builder's budget, soft costs, and the cash you have. The loan is the lower of the prequalification and the LTC " +
      "limit; your land counts as equity, and any remaining equity must come from cash. A gap of 0 means you're " +
      "covered.",
    examples:
      "Example: owned land worth $80,000 plus a $380,000 build and $20,000 of soft costs makes a $480,000 project. 80% LTC " +
      "allows $384,000, but you're prequalified for $380,000. After your land equity, you need $20,000 of cash — covered " +
      "by the $30,000 you have.",
    assumptions:
      "Final approval depends on the appraisal, builder, and full underwriting. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does prequalification lock in my loan?",
        answer: "No — it's an estimate. Approval comes after the lender reviews your finances, plans, budget, builder, and an appraisal of the finished home.",
      },
    ],
  },
  {
    slug: "construction-loan-total-cost-calculator",
    title: "Construction Loan Total Cost Calculator",
    description: "Add up everything it takes to get into your new home — land, build, soft costs, contingency used, closing costs, interest during construction and rent — and the cost per square foot.",
    metaTitle: "Construction Loan Total Cost Calculator — Cost per Sq Ft",
    metaDescription: "Free calculator for the total cost of building a home with a construction loan, including interest and rent, and the cost per square foot.",
    calcInputs: [
      currencyField("landCost", "Land", { default: 80000, max: 100000000, step: 1000 }),
      currencyField("buildCost", "Construction Cost", { default: 380000, max: 100000000, step: 1000 }),
      currencyField("softCosts", "Soft Costs", { default: 25000, max: 10000000, step: 500, required: false }),
      currencyField("contingencyUsed", "Contingency Actually Used", { default: 15000, max: 10000000, step: 500, required: false }),
      currencyField("closingCosts", "Closing Costs", { default: 8000, max: 1000000, step: 100, required: false }),
      currencyField("loanAmount", "Construction Loan Amount", { default: 400000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Construction Interest Rate", { default: 8.5, max: 20, step: 0.125 }),
      numberField("buildMonths", "Months to Build", { default: 12, min: 1, max: 36, step: 1 }),
      currencyField("monthlyRent", "Rent While Building", { default: 2200, max: 100000, step: 50, required: false }),
      numberField("squareFeet", "Home Size (Sq Ft)", { default: 2400, min: 1, max: 100000, step: 10 }),
    ],
    calcResult: { label: "Total Cost to Move In", format: "currency" },
    calcResults: [
      { key: "interestDuringBuild", label: "Interest During the Build", format: "currency" },
      { key: "rentWhileBuilding", label: "Rent While Building", format: "currency" },
      { key: "totalCostToMoveIn", label: "Total Cost to Move In", format: "currency", highlight: true },
      { key: "costPerSquareFoot", label: "All-In Cost per Sq Ft", format: "currency" },
      { key: "buildCostPerSquareFoot", label: "Construction Cost per Sq Ft", format: "currency" },
    ],
    instructions:
      "Enter every cost of the project, the construction loan's amount and rate, the build time, any rent you pay " +
      "meanwhile, and the home's size. Interest assumes equal monthly draws. Builders usually quote construction cost " +
      "per square foot; the all-in figure shows what the home really cost you.",
    examples:
      "Example: $80,000 land, a $380,000 build, $25,000 of soft costs, $15,000 of contingency used and $8,000 of closing " +
      "costs, plus $15,583.33 of construction interest and $26,400 of rent, total $549,983.33. For 2,400 sq ft that's " +
      "$229.16 per sq ft all-in, versus $158.33 for construction alone.",
    assumptions:
      "Excludes furnishing, landscaping beyond the contract, and moving costs. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What are soft costs?",
        answer: "Costs that aren't physical construction: architectural and engineering plans, permits and impact fees, surveys, inspections, and utility hook-up fees.",
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
