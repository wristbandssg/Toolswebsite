// One-time (but safe to re-run) batch setup script: creates the Down Payment Assistance Loan tools
// (7) of the Loan Calculators expansion 5, filed under Finance Calculators > Mortgage Calculators.
// See src/lib/calc-engine-mortgage-down-payment-assistance.ts for the math and
// src/lib/calc-engine-loan-startup-business.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-mortgage-down-payment-assistance-calculators.ts
// or
//   npm run db:create-mortgage-down-payment-assistance-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Re-pointed 5 Oct 2026: Mortgage Calculators was split into 5 sub-categories
// (see organize-tool-categories.ts); this script creates its sub-category if missing.
const PARENT_CATEGORY_SLUG = "mortgage-calculators";
const CATEGORY = { name: "Home Buyer Program Calculators", slug: "home-buyer-program-calculators" };

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
    slug: "down-payment-assistance-loan-calculator",
    title: "Down Payment Assistance Loan Calculator",
    description: "See how much a down payment assistance (DPA) loan covers of your down payment and closing costs, the cash you still need, and your first mortgage.",
    metaTitle: "Down Payment Assistance Loan Calculator — Cash Needed",
    metaDescription: "Free down payment assistance calculator. See how much DPA covers of your down payment and closing costs and the cash you still need.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 350000, max: 5000000, step: 1000 }),
      percentField("downPaymentPercent", "Minimum Down Payment", { default: 3.5, max: 50, step: 0.5 }),
      percentField("closingCostsPercent", "Closing Costs", { default: 3, max: 10, step: 0.25 }),
      percentField("dpaPercent", "Assistance Offered (% of Price)", { default: 5, max: 20, step: 0.5 }),
    ],
    calcResult: { label: "Your Cash Still Needed", format: "currency" },
    calcResults: [
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "closingCosts", label: "Closing Costs", format: "currency" },
      { key: "assistanceAmount", label: "Down Payment Assistance", format: "currency" },
      { key: "yourCashNeeded", label: "Your Cash Still Needed", format: "currency", highlight: true },
      { key: "firstMortgage", label: "First Mortgage Amount", format: "currency" },
    ],
    instructions:
      "State and local housing agencies (and some lenders) offer down payment assistance, often as a second loan of a " +
      "set percentage of the price. Enter the price, the minimum down payment for your loan type (3.5% for FHA, 3% for " +
      "some conventional loans), estimated closing costs and the assistance on offer.",
    examples:
      "Example: a $350,000 home with 3.50% down ($12,250) and $10,500 of closing costs. " +
      "5% assistance covers $17,500, leaving $5,250 for you to bring. The first mortgage " +
      "is $337,750.",
    assumptions:
      "Assistance is capped at the down payment plus closing costs. Some programs require a minimum contribution " +
      "from you (often $500–$1,000). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What forms does down payment assistance take?",
        answer: "Grants that never need repaying, forgivable loans that disappear after a set number of years, deferred 0% loans repaid when you sell or refinance, and low-rate loans with monthly payments.",
      },
    ],
  },
  {
    slug: "down-payment-assistance-loan-payment-calculator",
    title: "Down Payment Assistance Loan Payment Calculator",
    description: "Add the payment on your down payment assistance loan — none if deferred or forgivable, monthly if it amortizes — to your first mortgage payment.",
    metaTitle: "Down Payment Assistance Loan Payment Calculator",
    metaDescription: "Free DPA payment calculator. See your first mortgage payment plus the DPA second loan payment for deferred, forgivable or repayable loans.",
    calcInputs: [
      currencyField("firstMortgage", "First Mortgage Amount", { default: 337750, max: 5000000, step: 1000 }),
      percentField("firstRatePercent", "First Mortgage Rate", { default: 6.5, max: 15, step: 0.125 }),
      currencyField("dpaAmount", "Assistance Loan Amount", { default: 15000, max: 500000, step: 500 }),
      {
        key: "dpaType", label: "Type of Assistance Loan", type: "dropdown", required: true, default: 3,
        options: [
          { label: "Deferred (Repaid When You Sell or Refinance)", value: 1 },
          { label: "Forgivable (No Payments)", value: 2 },
          { label: "Repayable Monthly", value: 3 },
        ],
      },
      percentField("dpaRatePercent", "Assistance Loan Rate (If Repayable)", { default: 7, max: 15, step: 0.125, required: false }),
      numberField("dpaTermYears", "Assistance Loan Term (Years)", { default: 10, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "Total Principal & Interest", format: "currency" },
    calcResults: [
      { key: "firstMortgagePayment", label: "First Mortgage Payment (30 Years)", format: "currency" },
      { key: "assistancePayment", label: "Assistance Loan Payment", format: "currency" },
      { key: "totalPrincipalAndInterest", label: "Total Principal & Interest", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your first mortgage and rate, the assistance amount and its type. Deferred and forgivable assistance has " +
      "no monthly payment; repayable assistance adds one. Taxes, insurance and mortgage insurance come on top of the " +
      "total shown.",
    examples:
      "Example: a $337,750 first mortgage at 6.50% costs $2,134.81 a month. A $15,000 " +
      "repayable assistance loan at 7% over 10 years adds $174.16, for " +
      "$2,308.97 of principal and interest.",
    assumptions:
      "30-year fixed first mortgage. Lenders count any assistance payment in your debt-to-income ratio. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does a deferred DPA loan affect my monthly budget?",
        answer: "Not until it's due — usually when you sell, refinance or pay off the first mortgage — but it will reduce what you walk away with from a sale.",
      },
    ],
  },
  {
    slug: "down-payment-assistance-loan-payoff-calculator",
    title: "Down Payment Assistance Loan Payoff Calculator",
    description: "If your down payment assistance is forgiven over time, see how much has been forgiven and how much you'd owe if you sold or refinanced now.",
    metaTitle: "Forgivable DPA Payoff Calculator — Amount Owed at Sale",
    metaDescription: "Free down payment assistance payoff calculator. See how much forgivable DPA is forgiven so far and what you'd owe if you sold now.",
    calcInputs: [
      currencyField("dpaAmount", "Assistance Amount", { default: 15000, max: 500000, step: 500 }),
      numberField("forgivenessYears", "Years Until Fully Forgiven", { default: 5, min: 1, max: 30, step: 1 }),
      numberField("yearsOwned", "Years You've Owned the Home", { default: 3, min: 0, max: 40, step: 0.5 }),
    ],
    calcResult: { label: "Amount Owed If You Sell Now", format: "currency" },
    calcResults: [
      { key: "amountForgiven", label: "Amount Forgiven So Far", format: "currency" },
      { key: "amountOwedIfYouSellNow", label: "Amount Owed If You Sell Now", format: "currency", highlight: true },
      { key: "yearsUntilFullyForgiven", label: "Years Until Fully Forgiven", format: "number" },
    ],
    instructions:
      "Many forgivable programs forgive the assistance gradually — for example a fifth each year over 5 years — as " +
      "long as you live in the home. Selling, refinancing or moving out early usually makes the unforgiven part due. " +
      "Enter the amount, the forgiveness period and how long you've owned the home.",
    examples:
      "Example: $15,000 forgiven evenly over 5 years. After 3 years, $9,000 has been " +
      "forgiven, so selling now would mean repaying $6,000. It's fully forgiven in " +
      "2 more years.",
    assumptions:
      "Straight-line forgiveness; some programs forgive all at once at the end ('cliff' forgiveness). Check your note. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is forgiven down payment assistance taxable?",
        answer: "Generally government DPA grants and forgiven assistance aren't treated as taxable income, but rules vary — ask your program or a tax adviser.",
      },
    ],
  },
  {
    slug: "down-payment-assistance-loan-interest-calculator",
    title: "Down Payment Assistance Loan Interest Calculator",
    description: "See the hidden interest cost of down payment assistance: interest on a repayable DPA loan plus the higher first-mortgage rate DPA programs often require.",
    metaTitle: "Down Payment Assistance Interest Cost Calculator",
    metaDescription: "Free DPA interest calculator. Add a repayable DPA loan's interest to the cost of the higher first-mortgage rate that often comes with it.",
    calcInputs: [
      currencyField("dpaAmount", "Assistance Loan Amount", { default: 15000, max: 500000, step: 500 }),
      percentField("dpaRatePercent", "Assistance Loan Rate", { default: 7, max: 15, step: 0.125, required: false }),
      numberField("dpaTermYears", "Assistance Loan Term (Years)", { default: 10, min: 1, max: 30, step: 1 }),
      currencyField("firstMortgage", "First Mortgage Amount", { default: 337750, max: 5000000, step: 1000 }),
      percentField("firstRatePercent", "First Mortgage Rate Without DPA", { default: 6.5, max: 15, step: 0.125 }),
      percentField("ratePremiumPercent", "Rate Increase for Using DPA", { default: 0.375, max: 2, step: 0.125, required: false }),
      numberField("yearsKept", "Years You'll Keep the Mortgage", { default: 7, min: 0, max: 30, step: 1 }),
    ],
    calcResult: { label: "Total Extra Interest", format: "currency" },
    calcResults: [
      { key: "assistanceLoanInterest", label: "Assistance Loan Interest", format: "currency" },
      { key: "firstMortgageRatePremiumCost", label: "Cost of the Higher First-Mortgage Rate", format: "currency" },
      { key: "totalExtraInterest", label: "Total Extra Interest", format: "currency", highlight: true },
    ],
    instructions:
      "Housing finance agency mortgages that come with DPA are sometimes priced a little above the best market rate. " +
      "Enter the assistance loan's terms (set its rate to 0 for deferred or forgivable assistance), your first mortgage, " +
      "the rate increase, and how long you expect to keep the mortgage.",
    examples:
      "Example: a $15,000 assistance loan at 7% over 10 years costs $5,899.53 of " +
      "interest. A 0.38% higher rate on a $337,750 first mortgage adds $8,919.66 over " +
      "7 years — $14,819.19 in total.",
    assumptions:
      "30-year fixed first mortgage; you refinance or sell after the years entered. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is down payment assistance worth a higher rate?",
        answer: "Often yes, if it gets you into a home years sooner — but compare the extra cost with what renting and saving longer would cost.",
      },
    ],
  },
  {
    slug: "down-payment-assistance-loan-affordability-calculator",
    title: "Down Payment Assistance Loan Affordability Calculator",
    description: "With down payment assistance covering the upfront cash, see how much home your income supports under a lender's debt-to-income limit.",
    metaTitle: "Down Payment Assistance Affordability Calculator",
    metaDescription: "Free DPA affordability calculator. See the max home price your income supports and how much assistance it would take to buy it.",
    calcInputs: [
      currencyField("monthlyIncome", "Gross Monthly Income", { default: 6000, max: 1000000, step: 100 }),
      currencyField("monthlyDebts", "Other Monthly Debt Payments", { default: 500, max: 100000, step: 10, required: false }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 45, max: 60, step: 1 }),
      currencyField("taxesInsurance", "Property Tax, Insurance & MI per Month", { default: 450, max: 20000, step: 10 }),
      percentField("annualRatePercent", "Mortgage Rate", { default: 6.75, max: 15, step: 0.125 }),
      percentField("downPaymentPercent", "Minimum Down Payment", { default: 3.5, max: 50, step: 0.5 }),
      percentField("closingCostsPercent", "Closing Costs", { default: 3, max: 10, step: 0.25 }),
    ],
    calcResult: { label: "Maximum Home Price", format: "currency" },
    calcResults: [
      { key: "maxHousingPayment", label: "Maximum Housing Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Mortgage", format: "currency" },
      { key: "maxHomePrice", label: "Maximum Home Price", format: "currency", highlight: true },
      { key: "assistanceNeeded", label: "Assistance to Cover Down Payment + Closing", format: "currency" },
    ],
    instructions:
      "When assistance covers the down payment and closing costs, income — not savings — limits what you can buy. " +
      "Enter your income and debts, the lender's DTI limit (FHA often allows around 43%–50%), your estimated taxes and " +
      "insurance, the rate and the minimum down payment.",
    examples:
      "Example: $6,000 of income with $500 of debts at a 45% DTI allows $2,200 a " +
      "month for housing. After $450 of taxes and insurance, that supports a $269,812.69 mortgage — a home " +
      "of up to $279,598.65, needing about $18,173.91 of assistance for the down payment and closing costs.",
    assumptions:
      "30-year fixed mortgage; assistance payments (if any) not included in DTI. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do DPA programs have their own DTI limits?",
        answer: "Yes — many cap DTI at 45%–50% and set minimum credit scores, sometimes stricter than the first mortgage itself.",
      },
    ],
  },
  {
    slug: "down-payment-assistance-loan-comparison-calculator",
    title: "Down Payment Assistance Loan Comparison Calculator",
    description: "Compare buying now with down payment assistance against renting and saving the down payment yourself while home prices keep rising.",
    metaTitle: "Down Payment Assistance vs Saving Yourself Calculator",
    metaDescription: "Free DPA comparison calculator. Compare the extra cost of assistance with how much prices rise while you save the down payment.",
    calcInputs: [
      currencyField("homePrice", "Home Price Today", { default: 350000, max: 5000000, step: 1000 }),
      currencyField("cashNeeded", "Down Payment + Closing Costs Needed", { default: 22750, max: 1000000, step: 500 }),
      currencyField("currentSavings", "What You've Saved So Far", { default: 3000, max: 1000000, step: 500, required: false }),
      currencyField("monthlySaving", "What You Can Save per Month", { default: 600, max: 100000, step: 50 }),
      percentField("priceGrowthPercent", "Home Price Growth per Year", { default: 4, min: -10, max: 20, step: 0.25 }),
      currencyField("dpaExtraCost", "Extra Cost of Using DPA (Interest, Higher Rate)", { default: 9000, max: 1000000, step: 500 }),
    ],
    calcResult: { label: "Advantage of Using Assistance", format: "currency" },
    calcResults: [
      { key: "monthsToSaveYourself", label: "Months to Save It Yourself", format: "number" },
      { key: "priceRiseWhileSaving", label: "Price Rise While You Save", format: "currency" },
      { key: "assistanceExtraCost", label: "Extra Cost of Using Assistance", format: "currency" },
      { key: "advantageOfUsingAssistance", label: "Advantage of Using Assistance", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the home price, the cash you'd need, your savings and monthly saving rate, how fast prices are rising, and " +
      "the extra cost of the assistance (use the DPA interest calculator for this). A negative advantage means saving " +
      "yourself comes out ahead. Rent paid while saving isn't counted here.",
    examples:
      "Example: you need $22,750 for a $350,000 home and have $3,000. Saving the rest at $600 a month takes " +
      "33 months, while prices growing 4% a year add $39,860.94. With " +
      "assistance costing $9,000 extra, buying now with DPA comes out $30,860.94 ahead.",
    assumptions:
      "Prices grow steadily; savings earn nothing; the needed cash doesn't grow as prices rise (it would, making saving " +
      "slower). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What are the downsides of down payment assistance?",
        answer: "Possible higher rates or fees, repayment when you sell or refinance, occupancy requirements, and sometimes limits on resale profit.",
      },
    ],
  },
  {
    slug: "down-payment-assistance-loan-eligibility-calculator",
    title: "Down Payment Assistance Loan Eligibility Calculator",
    description: "Check the usual down payment assistance rules: household income within the area median income limit, first-time buyer status, credit score and price limit.",
    metaTitle: "Down Payment Assistance Eligibility Calculator",
    metaDescription: "Free DPA eligibility calculator. Check income against the area median income limit, first-time buyer status, score and price limit.",
    calcInputs: [
      currencyField("householdIncome", "Household Income per Year", { default: 85000, max: 10000000, step: 1000 }),
      currencyField("areaMedianIncome", "Area Median Income (Your County)", { default: 90000, max: 10000000, step: 1000 }),
      percentField("incomeLimitPercent", "Program Income Limit (% of Median)", { default: 120, max: 300, step: 5 }),
      {
        key: "firstTimeBuyer", label: "First-Time Buyer (No Home Owned in 3 Years)?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      numberField("creditScore", "Your Credit Score", { default: 660, min: 300, max: 850, step: 1 }),
      currencyField("homePrice", "Home Price", { default: 350000, max: 5000000, step: 1000 }),
      currencyField("priceLimit", "Program Purchase Price Limit", { default: 450000, max: 5000000, step: 1000 }),
    ],
    calcResult: { label: "Checks Passed (of 4)", format: "number" },
    calcResults: [
      { key: "incomeLimit", label: "Program Income Limit", format: "currency" },
      { key: "incomeAsShareOfMedian", label: "Your Income as % of Area Median", format: "percentage" },
      { key: "checksPassed", label: "Checks Passed (of 4)", format: "number", highlight: true },
    ],
    instructions:
      "Most DPA programs limit household income to a percentage of the area median income (AMI) — often 80% to 140% — " +
      "and cap the purchase price. Look up your county's figures on your state housing finance agency's site. The four " +
      "checks: income within the limit; first-time buyer; a 640+ score; and a price within the limit. Many also require " +
      "a homebuyer education course.",
    examples:
      "Example: a $85,000 household income in an area with a $90,000 median is 94.44% of " +
      "AMI, under a 120% limit of $108,000. As a first-time buyer with a 660 score buying at " +
      "$350,000, 4 of 4 checks pass.",
    assumptions:
      "Typical rules; programs differ and some don't require first-time buyer status. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who counts as a first-time homebuyer?",
        answer: "Usually anyone who hasn't owned a home in the past three years, which can include past owners. Some programs also include single parents or displaced homemakers.",
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
