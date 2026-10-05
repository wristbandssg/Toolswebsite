// One-time (but safe to re-run) batch setup script: creates the Agricultural Loan tools
// (7) of the Loan Calculators expansion 3, filed under Loan Calculators > General Loan Calculators.
// See src/lib/calc-engine-loan-agricultural.ts for the math and
// src/lib/calc-engine-loan-sba.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-agricultural-calculators.ts
// or
//   npm run db:create-loan-agricultural-calculators

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
    slug: "agricultural-loan-calculator",
    title: "Agricultural Loan Calculator",
    description: "Finance farmland by price per acre: down payment, loan amount, the annual, semi-annual or monthly payment, and what it costs per acre each year.",
    metaTitle: "Agricultural Loan Calculator — Farmland per Acre",
    metaDescription: "Free agricultural loan calculator for farmland. Enter price per acre and acres to see the loan, annual payment, cost per acre and interest.",
    calcInputs: [
      currencyField("pricePerAcre", "Price per Acre", { default: 9000, max: 1000000, step: 100 }),
      numberField("acres", "Acres", { default: 160, min: 0, max: 100000, step: 1 }),
      percentField("downPaymentPercent", "Down Payment", { default: 25, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7, max: 20, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 25, min: 1, max: 40, step: 1 }),
      {
        key: "paymentsPerYear", label: "Payment Schedule", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Annual", value: 1 },
          { label: "Semi-Annual", value: 2 },
          { label: "Monthly", value: 12 },
        ],
      },
    ],
    calcResult: { label: "Payment per Period", format: "currency" },
    calcResults: [
      { key: "landPrice", label: "Land Price", format: "currency" },
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "paymentPerPeriod", label: "Payment per Period", format: "currency", highlight: true },
      { key: "paymentPerAcrePerYear", label: "Loan Cost per Acre per Year", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the price per acre, number of acres, down payment, rate and term, and how often you'll pay. Farm Credit " +
      "and other farm lenders often finance land over 20–30 years with annual or semi-annual payments timed to " +
      "harvest, and commonly ask for 20%–35% down. The per-acre figure helps compare the payment with the land's " +
      "income or local cash rents.",
    examples:
      "Example: 160 acres at $9,000 an acre cost $1,440,000. With 25% down " +
      "($360,000), the loan is $1,080,000. At 7% over 25 years, the annual payment is " +
      "$92,675.36 — $579.22 per acre — with $1,236,883.96 of total interest.",
    assumptions:
      "Fixed rate and equal payments. Many farm real estate loans have variable or periodically reset rates. Property " +
      "taxes and insurance aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Where can I get a farmland loan?",
        answer: "Farm Credit System lenders, local and regional banks, life insurance companies (for large loans), and USDA's Farm Service Agency for beginning and other eligible farmers.",
      },
    ],
  },
  {
    slug: "agricultural-loan-payment-calculator",
    title: "Agricultural Loan Payment Calculator",
    description: "Estimate the single payment due at harvest on a seasonal farm operating loan, including interest on money drawn through the season, per acre.",
    metaTitle: "Farm Operating Loan Payment Calculator — Harvest",
    metaDescription: "Free agricultural operating loan calculator. See interest on seasonal draws, the payment due at harvest, and the cost per acre.",
    calcInputs: [
      currencyField("operatingBudget", "Operating Budget Borrowed (Seed, Fertilizer, Fuel…)", { default: 300000, max: 100000000, step: 1000 }),
      numberField("acres", "Acres Farmed", { default: 1000, min: 0, max: 1000000, step: 10 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8, max: 20, step: 0.05 }),
      numberField("avgMonthsOutstanding", "Average Months Borrowed Before Harvest", { default: 6, min: 0, max: 18, step: 0.5 }),
    ],
    calcResult: { label: "Payment Due at Harvest", format: "currency" },
    calcResults: [
      { key: "interestCost", label: "Interest Cost", format: "currency" },
      { key: "paymentDueAtHarvest", label: "Payment Due at Harvest", format: "currency", highlight: true },
      { key: "interestPerAcre", label: "Interest per Acre", format: "currency" },
      { key: "costPerAcreIncludingInterest", label: "Operating Cost per Acre (With Interest)", format: "currency" },
    ],
    instructions:
      "Operating loans and lines of credit pay for a season's inputs and are repaid from the crop. Money is drawn as " +
      "you need it, so enter the AVERAGE time it's outstanding — if you draw evenly from March to September and repay " +
      "in October, that's roughly 4–5 months; if most is drawn at planting, it's longer.",
    examples:
      "Example: borrowing $300,000 for 1,000 acres at 8% for an average of " +
      "6 months costs $12,000 in interest — $12 an acre. The payment due at " +
      "harvest is $312,000, or $312 per acre.",
    assumptions:
      "Simple interest on the average balance; fees not included. If the crop is stored and sold later, interest keeps " +
      "running until repayment. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between an operating loan and an ownership loan?",
        answer: "Operating loans cover yearly costs and are repaid within the year (or a few years for livestock and machinery); ownership loans buy land over decades.",
      },
    ],
  },
  {
    slug: "agricultural-loan-payoff-calculator",
    title: "Agricultural Loan Payoff Calculator",
    description: "See how many years an extra principal payment each year takes off a farmland or other agricultural loan with annual payments, and the interest saved.",
    metaTitle: "Agricultural Loan Payoff Calculator — Extra Principal",
    metaDescription: "Free agricultural loan payoff calculator. Add extra principal each year to a farm loan and see years saved and interest saved.",
    calcInputs: [
      currencyField("loanAmount", "Loan Balance", { default: 800000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.5, max: 20, step: 0.05 }),
      numberField("termYears", "Years Left", { default: 25, min: 1, max: 40, step: 1 }),
      currencyField("extraAnnual", "Extra Principal Each Year", { default: 15000, max: 10000000, step: 500 }),
    ],
    calcResult: { label: "Years to Payoff", format: "number" },
    calcResults: [
      { key: "annualPayment", label: "Regular Annual Payment", format: "currency" },
      { key: "yearsToPayoff", label: "Years to Payoff", format: "number", highlight: true },
      { key: "yearsSaved", label: "Years Saved", format: "number" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "Enter the balance, rate, years left and the extra principal you can pay each year with the annual payment. " +
      "Farm income swings, so many farmers prepay in good years only — check that your loan allows prepayment " +
      "without a penalty.",
    examples:
      "Example: $800,000 at 6.50% over 25 years costs $65,585.18 a year. Adding " +
      "$15,000 of principal each year pays it off in 17 years — 8 years early — saving " +
      "$312,744.94 of interest.",
    assumptions:
      "Annual payments and annual compounding; the extra is paid with every payment. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I prepay my land loan or buy more land?",
        answer: "Compare the loan rate with the return on more land (income plus appreciation) and keep enough working capital for bad years.",
      },
    ],
  },
  {
    slug: "agricultural-loan-interest-calculator",
    title: "Agricultural Loan Interest Calculator",
    description: "Compare interest when buying farmland with a USDA FSA Down Payment Loan — 5% down, FSA 45% at a low rate, a lender 50% — vs financing 95% commercially.",
    metaTitle: "Farm Loan Interest Calculator — FSA Down Payment Loan",
    metaDescription: "Free farm loan interest calculator. Compare interest on a USDA FSA Down Payment Loan structure with an all-commercial farmland loan.",
    calcInputs: [
      currencyField("landPrice", "Farmland Price", { default: 1000000, max: 100000000, step: 1000 }),
      percentField("fsaRatePercent", "FSA Down Payment Loan Rate", { default: 1.5, max: 10, step: 0.05 }),
      numberField("fsaTermYears", "FSA Loan Term (Years)", { default: 20, min: 1, max: 40, step: 1 }),
      percentField("commercialRatePercent", "Commercial Lender Rate", { default: 7, max: 20, step: 0.05 }),
      numberField("commercialTermYears", "Commercial Loan Term (Years)", { default: 30, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Interest Saved With FSA", format: "currency" },
    calcResults: [
      { key: "fsaLoan", label: "FSA Loan (45%)", format: "currency" },
      { key: "fsaInterest", label: "FSA Loan Interest", format: "currency" },
      { key: "commercialLoan", label: "Commercial Loan (50%)", format: "currency" },
      { key: "commercialInterest", label: "Commercial Loan Interest", format: "currency" },
      { key: "annualPaymentsFirstYears", label: "Combined Annual Payments", format: "currency" },
      { key: "interestSavedVsAllCommercial", label: "Interest Saved With FSA", format: "currency", highlight: true },
    ],
    instructions:
      "USDA's Farm Service Agency (FSA) Down Payment Loan helps beginning and socially disadvantaged farmers buy land: " +
      "you put 5% down, FSA lends 45% at a fixed rate well below market (as low as 1.5%) for 20 years, and a commercial " +
      "lender finances the remaining 50%. Enter the price and the two loans' rates and terms; the comparison is with " +
      "borrowing 95% from a commercial lender alone.",
    examples:
      "Example: a $1,000,000 farm with 5% down. FSA lends $450,000 at 1.50%, costing $74,211.62 of " +
      "interest, and a lender $500,000 at 7%, costing $708,796.05. Combined annual " +
      "payments are $66,503.78. Compared with borrowing 95% commercially, the FSA structure saves " +
      "$563,704.82 of interest.",
    assumptions:
      "Annual payments at fixed rates. FSA rates are set monthly, and the FSA share is capped at a dollar limit, so on " +
      "expensive land the FSA loan may cover less than 45%. Eligibility rules apply. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who qualifies for an FSA Down Payment Loan?",
        answer: "Beginning farmers (generally 10 years or less of farm ownership) and socially disadvantaged farmers who meet FSA's credit, experience and operating requirements.",
      },
    ],
  },
  {
    slug: "agricultural-loan-affordability-calculator",
    title: "Agricultural Loan Affordability Calculator",
    description: "Find the most you can pay per acre for farmland if the land's own net income has to cover the loan payment and property tax.",
    metaTitle: "Farmland Affordability Calculator — Max Price per Acre",
    metaDescription: "Free agricultural loan affordability calculator. Turn per-acre net income into the maximum loan and maximum farmland price per acre.",
    calcInputs: [
      currencyField("netIncomePerAcre", "Net Income per Acre Before Land Costs", { default: 350, max: 100000, step: 5 }),
      currencyField("propertyTaxPerAcre", "Property Tax per Acre", { default: 30, max: 10000, step: 1, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.75, max: 20, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 25, min: 1, max: 40, step: 1 }),
      percentField("downPaymentPercent", "Down Payment", { default: 25, max: 99, step: 1 }),
    ],
    calcResult: { label: "Maximum Price per Acre", format: "currency" },
    calcResults: [
      { key: "maxAnnualPaymentPerAcre", label: "Maximum Annual Payment per Acre", format: "currency" },
      { key: "maxLoanPerAcre", label: "Maximum Loan per Acre", format: "currency" },
      { key: "maxPricePerAcre", label: "Maximum Price per Acre", format: "currency", highlight: true },
      { key: "downPaymentPerAcre", label: "Down Payment per Acre", format: "currency" },
    ],
    instructions:
      "Enter what an acre earns after all crop costs but before land costs (or the cash rent you'd get if you rented it " +
      "out), the property tax, and the loan terms. The calculator finds the price per acre at which the land pays for " +
      "itself. Paying more means other income has to make up the difference.",
    examples:
      "Example: $350 of net income per acre minus $30 of tax leaves " +
      "$320 for the payment. At 6.75% over 25 years that supports " +
      "$3,814.66 per acre; with 25% down, you can pay up to $5,086.21 an acre.",
    assumptions:
      "Annual payments; income per acre is an average over good and bad years. Land often sells above its " +
      "income-based value because of expected appreciation. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does farmland often sell above what it earns?",
        answer: "Buyers also pay for expected appreciation, neighboring-farm expansion, and land's role as a long-term store of wealth, so returns from rent alone are often only 2%–4%.",
      },
    ],
  },
  {
    slug: "agricultural-loan-comparison-calculator",
    title: "Agricultural Loan Comparison Calculator",
    description: "Compare buying farmland with a loan against cash-renting it: yearly cost of owning per acre vs rent, and the appreciation needed to break even.",
    metaTitle: "Buy vs Rent Farmland Calculator — Cost per Acre",
    metaDescription: "Free buy vs rent farmland calculator. Compare the yearly cost of owning with cash rent per acre, and see the break-even appreciation.",
    calcInputs: [
      currencyField("pricePerAcre", "Price per Acre", { default: 9000, max: 1000000, step: 100 }),
      percentField("downPaymentPercent", "Down Payment", { default: 25, max: 100, step: 1 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 6.75, max: 20, step: 0.05 }),
      currencyField("propertyTaxPerAcre", "Property Tax per Acre", { default: 30, max: 10000, step: 1, required: false }),
      percentField("opportunityRatePercent", "Return You'd Earn on the Down Payment Elsewhere", { default: 4, max: 20, step: 0.25 }),
      currencyField("cashRentPerAcre", "Cash Rent per Acre", { default: 250, max: 100000, step: 5 }),
      percentField("appreciationPercent", "Expected Land Appreciation per Year", { default: 3, min: -10, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Extra Yearly Cost to Own (per Acre)", format: "currency" },
    calcResults: [
      { key: "ownershipCostPerAcre", label: "Yearly Cost to Own per Acre", format: "currency" },
      { key: "cashRentPerAcre", label: "Cash Rent per Acre", format: "currency" },
      { key: "extraCostToOwn", label: "Extra Yearly Cost to Own (per Acre)", format: "currency", highlight: true },
      { key: "appreciationPerAcre", label: "Expected Appreciation per Acre", format: "currency" },
      { key: "netAdvantageOfOwning", label: "Net Advantage of Owning per Acre", format: "currency" },
      { key: "breakEvenAppreciationPercent", label: "Appreciation Needed to Break Even", format: "percentage" },
    ],
    instructions:
      "Enter the land price and loan terms, property tax, what your down payment could earn elsewhere, the local cash " +
      "rent, and expected appreciation. Owning costs loan interest, tax and the return given up on your cash; " +
      "renting costs the rent. Appreciation is what can make owning worthwhile.",
    examples:
      "Example: at $9,000 an acre with 25% down, owning costs $575.63 an acre in " +
      "year 1 vs $250 rent — $325.63 more. Even after 3% appreciation " +
      "($270 an acre), owning costs $55.62 an acre more than renting; it breaks even " +
      "at 3.62% appreciation a year.",
    assumptions:
      "First-year view: interest on the full loan, no principal (principal builds equity, not cost). Ignores taxes on " +
      "gains, insurance and improvements. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is it better to rent or buy farmland?",
        answer: "Renting keeps cash free to grow the operation; buying builds equity and protects you from losing the lease. Many farms do both.",
      },
    ],
  },
  {
    slug: "agricultural-loan-eligibility-calculator",
    title: "Agricultural Loan Eligibility Calculator",
    description: "Check the three farm financial ratios lenders look at first — current ratio, debt-to-asset ratio and term debt coverage — against common benchmarks.",
    metaTitle: "Agricultural Loan Eligibility Calculator — Farm Ratios",
    metaDescription: "Free farm loan eligibility calculator. Check current ratio, working capital, debt-to-asset and term debt coverage against benchmarks.",
    calcInputs: [
      currencyField("currentAssets", "Current Assets (Cash, Grain, Livestock for Sale…)", { default: 450000, max: 1000000000, step: 1000 }),
      currencyField("currentLiabilities", "Current Liabilities (Due Within a Year)", { default: 250000, max: 1000000000, step: 1000 }),
      currencyField("totalAssets", "Total Farm Assets", { default: 3000000, max: 1000000000, step: 10000 }),
      currencyField("totalLiabilities", "Total Farm Liabilities", { default: 1100000, max: 1000000000, step: 10000 }),
      currencyField("incomeForDebt", "Income Available for Debt Payments", { default: 220000, max: 1000000000, step: 1000 }),
      currencyField("annualDebtPayments", "Annual Term Debt Payments (Including the New Loan)", { default: 160000, max: 1000000000, step: 1000 }),
    ],
    calcResult: { label: "Benchmarks Met (of 3)", format: "number" },
    calcResults: [
      { key: "currentRatio", label: "Current Ratio", format: "number" },
      { key: "workingCapital", label: "Working Capital", format: "currency" },
      { key: "debtToAssetPercent", label: "Debt-to-Asset Ratio", format: "percentage" },
      { key: "termDebtCoverage", label: "Term Debt Coverage Ratio", format: "number" },
      { key: "checksPassed", label: "Benchmarks Met (of 3)", format: "number", highlight: true },
    ],
    instructions:
      "Take the figures from your farm balance sheet and income statement. Income available for debt is net farm " +
      "income plus depreciation and interest, plus non-farm income, minus family living and taxes. The benchmarks used " +
      "are a current ratio of at least 1.3, a debt-to-asset ratio of 60% or less, and term debt coverage of at least " +
      "1.25 — common lender guidelines, not fixed rules.",
    examples:
      "Example: $450,000 of current assets against $250,000 of current liabilities is a current ratio " +
      "of 1.80 ($200,000 of working capital). $1,100,000 of debt on $3,000,000 of assets " +
      "is 36.67%. $220,000 of income against $160,000 of payments covers them " +
      "1.38 times. 3 of 3 benchmarks are met.",
    assumptions:
      "Lenders also weigh credit history, collateral, management and trends over several years. Benchmarks vary by " +
      "lender and type of farm. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's term debt coverage?",
        answer: "Income available for debt payments divided by scheduled term debt payments. Above 1 means you can pay; lenders like a cushion, often 1.25 or more.",
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
