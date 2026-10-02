// One-time (but safe to re-run) batch setup script: creates the 7 tools of
// the Loan Calculators expansion sub-batch 9 (Boat Loans), filed
// under Finance Calculators > Loan Calculators > Auto & Vehicle Loan
// Calculators. See src/lib/calc-engine-loan-boat.ts for the math and
// src/lib/calc-engine-loan-debt-consolidation.ts for the full batch context.
//
// If the "Auto & Vehicle Loan Calculators" sub-category doesn't exist yet,
// it is created under Loan Calculators.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-boat-calculators.ts
// or
//   npm run db:create-loan-boat-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "loan-calculators";
const CATEGORY = { name: "Auto & Vehicle Loan Calculators", slug: "auto-vehicle-loan-calculators" };

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
    slug: "boat-loan-calculator",
    title: "Boat Loan Calculator",
    description: "Price a boat and trailer with sales tax and fees, apply a percentage down payment, and see the monthly payment over a long marine loan term.",
    metaTitle: "Boat Loan Calculator — Payment With Trailer & Tax",
    metaDescription: "Free boat loan calculator. Add the trailer, sales tax and fees, apply your down payment, and see the payment and interest over 10–20 years.",
    calcInputs: [
      currencyField("boatPrice", "Boat Price", { default: 50000, max: 10000000, step: 500 }),
      currencyField("trailerPrice", "Trailer Price", { default: 5000, max: 1000000, step: 250, required: false }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 6, max: 15, step: 0.125 }),
      currencyField("fees", "Registration, Doc & Survey Fees", { default: 800, max: 100000, step: 50, required: false }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.5, max: 25, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 15, min: 2, max: 20, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalPrice", label: "Total Price With Tax & Fees", format: "currency" },
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the boat price, the trailer if you're buying one, your sales tax rate, and registration, documentation, " +
      "and marine survey fees. Marine lenders usually ask for 10%–20% down and offer long terms — often up to 15 or 20 " +
      "years on larger loans. Enter your down payment percentage and the loan's rate and term.",
    examples:
      "Example: a $50,000 boat and $5,000 trailer with 6% tax and $800 of fees comes to $59,100. With 10% down " +
      "($5,910), the $53,190 loan costs $493.08 a month at 7.5% over 15 years — and $35,564.02 in interest.",
    assumptions:
      "Sales tax rules for boats and trailers vary by state, and some states charge yearly property tax on boats. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why are boat loan terms so long?",
        answer: "Larger boats cost as much as a small house, so lenders spread payments over 10–20 years to keep them manageable. The trade-off is much more interest and a long time owing more than the boat is worth.",
      },
      {
        question: "Do I need a marine survey?",
        answer: "Lenders and insurers usually require one for used boats and larger purchases. It checks the boat's condition and value, much like a home inspection and appraisal.",
      },
    ],
  },
  {
    slug: "boat-loan-payment-calculator",
    title: "Boat Loan Payment Calculator",
    description: "See your boat loan payment plus the running costs that come with it — storage or slip fees, insurance, maintenance, and fuel — for the true monthly cost.",
    metaTitle: "Boat Loan Payment Calculator — True Monthly Cost",
    metaDescription: "Free boat payment calculator. Add slip or storage fees, insurance, maintenance and fuel to your loan payment to see the true monthly cost.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 45000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.5, max: 25, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 15, min: 2, max: 20, step: 1 }),
      currencyField("boatValue", "Boat's Value", { default: 50000, max: 10000000, step: 500 }),
      percentField("insurancePercent", "Insurance (% of Value per Year)", { default: 1.5, max: 10, step: 0.1 }),
      percentField("maintenancePercent", "Maintenance (% of Value per Year)", { default: 5, max: 20, step: 0.5 }),
      currencyField("monthlyStorage", "Slip / Storage per Month", { default: 250, max: 100000, step: 25, required: false }),
      currencyField("monthlyFuel", "Fuel per Month (Averaged)", { default: 150, max: 100000, step: 10, required: false }),
    ],
    calcResult: { label: "Total Monthly Cost", format: "currency" },
    calcResults: [
      { key: "loanPayment", label: "Loan Payment", format: "currency" },
      { key: "insuranceMonthly", label: "Insurance", format: "currency" },
      { key: "maintenanceMonthly", label: "Maintenance", format: "currency" },
      { key: "totalMonthlyCost", label: "Total Monthly Cost", format: "currency", highlight: true },
      { key: "runningCostSharePercent", label: "Share That Isn't the Loan", format: "percentage" },
    ],
    instructions:
      "Enter the loan amount, rate, and term, then the boat's value and your running costs: insurance and maintenance " +
      "as yearly percentages of the boat's value (insurance is often about 1%–2%; maintenance rules of thumb run from " +
      "a few percent to 10% for older or larger boats), plus monthly slip or storage fees and fuel averaged over the " +
      "year.",
    examples:
      "Example: a $45,000 loan at 7.5% over 15 years costs $417.16 a month. On a $50,000 boat, 1.5% insurance adds " +
      "$62.50, 5% maintenance $208.33, plus $250 storage and $150 fuel — $1,087.99 a month in total, with 61.66% of it " +
      "not going to the loan.",
    assumptions:
      "Running costs are averaged evenly over 12 months; real costs are seasonal. Winterising, haul-outs, and " +
      "registration add more. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do running costs matter for the loan?",
        answer: "Because they don't stop and often outweigh the payment. Budgeting for the payment alone is the most common reason boat owners end up selling sooner than planned.",
      },
    ],
  },
  {
    slug: "boat-loan-payoff-calculator",
    title: "Boat Loan Payoff Calculator",
    description: "See how a once-a-year lump-sum payment — from a bonus, tax refund, or the end of the boating season — shortens your boat loan and cuts the interest.",
    metaTitle: "Boat Loan Payoff Calculator — Yearly Lump Sum",
    metaDescription: "Free boat loan payoff calculator. Add a yearly lump-sum payment and see how many years and how much interest you save.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 40000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.5, max: 25, step: 0.05 }),
      currencyField("monthlyPayment", "Monthly Payment", { default: 400, max: 100000, step: 10 }),
      currencyField("annualLumpSum", "Extra Lump Sum Once a Year", { default: 2000, max: 1000000, step: 100 }),
    ],
    calcResult: { label: "Interest Saved", format: "currency" },
    calcResults: [
      { key: "monthsLeft", label: "Months Left Without Lump Sums", format: "number", unit: "months" },
      { key: "monthsWithLumpSum", label: "Months Left With Lump Sums", format: "number", unit: "months" },
      { key: "yearsSaved", label: "Years Saved", format: "number", unit: "years" },
      { key: "interestSaved", label: "Interest Saved", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your balance, rate, monthly payment, and an extra amount you could pay once a year. The lump sum is added " +
      "to every 12th payment. On long boat loans, even a modest yearly payment can take years off the loan.",
    examples:
      "Example: $40,000 at 7.5% paid at $400 a month takes 158 months. Adding $2,000 once a year cuts it to 96 months — " +
      "5.17 years sooner — and saves $9,310.77 in interest.",
    assumptions:
      "Assumes extra payments go to principal and there's no prepayment penalty — check your marine loan, as some " +
      "charge one in the early years. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is it better to pay extra monthly or once a year?",
        answer: "Paying the same total spread monthly saves slightly more because principal falls sooner, but a yearly lump sum is easier to fit around seasonal income.",
      },
    ],
  },
  {
    slug: "boat-loan-interest-calculator",
    title: "Boat Loan Interest Calculator",
    description: "Compare the payment and total interest on a boat loan over 10, 15, and 20 years, each at its own rate, to see what a longer term really costs.",
    metaTitle: "Boat Loan Interest Calculator — 10 vs 15 vs 20 Years",
    metaDescription: "Free boat loan interest calculator. Compare payments and total interest over 10, 15 and 20 years, each at its own rate.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 60000, max: 10000000, step: 500 }),
      percentField("rate10Percent", "Rate for 10 Years", { default: 7.25, max: 25, step: 0.05 }),
      percentField("rate15Percent", "Rate for 15 Years", { default: 7.5, max: 25, step: 0.05 }),
      percentField("rate20Percent", "Rate for 20 Years", { default: 7.75, max: 25, step: 0.05 }),
    ],
    calcResult: { label: "Total Interest Over 20 Years", format: "currency" },
    calcResults: [
      { key: "payment10", label: "10 Years — Monthly Payment", format: "currency" },
      { key: "interest10", label: "10 Years — Total Interest", format: "currency" },
      { key: "payment15", label: "15 Years — Monthly Payment", format: "currency" },
      { key: "interest15", label: "15 Years — Total Interest", format: "currency" },
      { key: "payment20", label: "20 Years — Monthly Payment", format: "currency" },
      { key: "interest20", label: "20 Years — Total Interest", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan amount and the rate a lender quotes for each term — longer marine loans are often priced a " +
      "little higher. The tool shows how much a longer term lowers the payment and how much more interest it costs.",
    examples:
      "Example: a $60,000 boat loan costs $704.41 a month over 10 years at 7.25% ($24,528.75 interest), $556.21 over 15 " +
      "years at 7.5% ($40,117.33), and $492.57 over 20 years at 7.75% ($58,216.59). The 20-year loan saves $211.84 a " +
      "month but costs more than twice the interest of the 10-year loan.",
    assumptions:
      "Assumes fixed rates and no extra payments. A boat with sleeping, cooking, and toilet facilities can count as a " +
      "second home, making the interest potentially deductible if you itemize — ask a tax adviser. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I take a long term and pay it off faster?",
        answer: "Yes, if there's no prepayment penalty. A longer term gives you a lower required payment for flexibility, and extra payments bring the payoff date forward.",
      },
    ],
  },
  {
    slug: "boat-loan-affordability-calculator",
    title: "Boat Loan Affordability Calculator",
    description: "Start from your total monthly boating budget, set aside the running costs, and see the largest loan and boat price that fit.",
    metaTitle: "Boat Loan Affordability Calculator — Max Boat Price",
    metaDescription: "Free boat affordability calculator. Subtract running costs from your monthly boating budget to find your maximum loan and boat price.",
    calcInputs: [
      currencyField("monthlyBoatBudget", "Total Monthly Boating Budget", { default: 1200, max: 1000000, step: 50 }),
      currencyField("monthlyRunningCosts", "Monthly Running Costs (Storage, Insurance, Upkeep, Fuel)", { default: 550, max: 1000000, step: 25 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.5, max: 25, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 15, min: 2, max: 20, step: 1 }),
      percentField("downPaymentPercent", "Down Payment", { default: 15, max: 99, step: 1 }),
    ],
    calcResult: { label: "Maximum Boat Price", format: "currency" },
    calcResults: [
      { key: "paymentRoom", label: "Room for the Loan Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency" },
      { key: "maxBoatPrice", label: "Maximum Boat Price", format: "currency", highlight: true },
      { key: "downPaymentNeeded", label: "Down Payment Needed", format: "currency" },
    ],
    instructions:
      "Enter everything you're prepared to spend on boating each month, your expected running costs (use the Boat Loan " +
      "Payment Calculator to estimate them), the loan's rate and term, and your down payment percentage. What's left " +
      "after running costs is the room for the loan payment.",
    examples:
      "Example: a $1,200 monthly budget with $550 of running costs leaves $650 for the payment. At 7.5% over 15 years " +
      "that supports a $70,117.73 loan; with 15% down, a boat up to $82,491.44, needing $12,373.72 down.",
    assumptions:
      "Running costs grow with the size of the boat, so re-check them for the boat you actually choose. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a sensible boating budget?",
        answer: "Many advisers suggest keeping all recreational vehicle costs — loans and upkeep — to a small share of take-home pay, after savings and essentials are covered.",
      },
    ],
  },
  {
    slug: "boat-loan-comparison-calculator",
    title: "Boat Loan Comparison Calculator",
    description: "Compare buying a new boat with buying a used one over the years you'll own it: payments, depreciation, and the net cost of each.",
    metaTitle: "Boat Loan Comparison Calculator — New vs Used",
    metaDescription: "Free new vs used boat loan comparison. See payments, depreciation and the net cost of owning each over the years you'll keep it.",
    calcInputs: [
      currencyField("newPrice", "New Boat Price", { default: 60000, max: 10000000, step: 500 }),
      percentField("newRatePercent", "New Boat Loan Rate", { default: 7.25, max: 25, step: 0.05 }),
      numberField("newTermYears", "New Boat Loan Term (Years)", { default: 15, min: 2, max: 20, step: 1 }),
      percentField("newDepreciationPercent", "New Boat Yearly Depreciation", { default: 10, max: 50, step: 1 }),
      currencyField("usedPrice", "Used Boat Price", { default: 38000, max: 10000000, step: 500 }),
      percentField("usedRatePercent", "Used Boat Loan Rate", { default: 8.25, max: 25, step: 0.05 }),
      numberField("usedTermYears", "Used Boat Loan Term (Years)", { default: 10, min: 2, max: 20, step: 1 }),
      percentField("usedDepreciationPercent", "Used Boat Yearly Depreciation", { default: 6, max: 50, step: 1 }),
      percentField("downPaymentPercent", "Down Payment (Both)", { default: 15, max: 100, step: 1 }),
      numberField("yearsHeld", "Years You'll Keep It", { default: 5, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "Used Boat Saves", format: "currency" },
    calcResults: [
      { key: "newPayment", label: "New — Monthly Payment", format: "currency" },
      { key: "newNetCost", label: "New — Net Cost Over the Period", format: "currency" },
      { key: "usedPayment", label: "Used — Monthly Payment", format: "currency" },
      { key: "usedNetCost", label: "Used — Net Cost Over the Period", format: "currency" },
      { key: "usedSaves", label: "Used Boat Saves", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the price, loan rate, term, and yearly depreciation for a new boat and a comparable used one, your down " +
      "payment percentage, and how many years you'll keep the boat. Used boats usually carry slightly higher rates and " +
      "shorter terms, but they've already taken the steepest depreciation.\n\n" +
      "Net cost = down payment + payments made + balance still owed − the boat's value when you sell.",
    examples:
      "Example: a $60,000 new boat at 7.25% over 15 years costs $465.56 a month; a $38,000 used boat at 8.25% over 10 " +
      "years costs $396.17. Kept for 5 years with 15% down, the new boat's net cost is $41,159.74 and the used boat's " +
      "$21,005.29 — the used boat saves $20,154.44.",
    assumptions:
      "Depreciation is a smooth yearly rate; real resale values depend on make, engine hours, and condition. Running " +
      "costs aren't included — older boats can cost more to maintain. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do lenders finance older boats?",
        answer: "Many do, but some limit the boat's age (for example, 15–20 years) or shorten the term for older boats. A survey is usually required.",
      },
    ],
  },
  {
    slug: "boat-loan-eligibility-calculator",
    title: "Boat Loan Eligibility Calculator",
    description: "Check a boat loan against typical marine lender guidelines: loan-to-value, debt-to-income, credit score, and the cash reserves many require on bigger loans.",
    metaTitle: "Boat Loan Eligibility Calculator — LTV, DTI & Reserves",
    metaDescription: "Free boat loan eligibility calculator. Check loan-to-value, DTI, credit score and cash reserves against a marine lender's guidelines.",
    calcInputs: [
      numberField("creditScore", "Your Credit Score", { default: 720, min: 300, max: 850, step: 1 }),
      numberField("lenderMinScore", "Lender's Minimum Score", { default: 680, min: 300, max: 850, step: 1 }),
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 10000, max: 1000000, step: 100 }),
      currencyField("monthlyDebtPayments", "Current Monthly Debts (Incl. Housing)", { default: 2800, max: 1000000, step: 25 }),
      currencyField("boatPrice", "Boat Price", { default: 80000, max: 10000000, step: 500 }),
      currencyField("downPayment", "Down Payment", { default: 12000, max: 10000000, step: 500 }),
      percentField("maxLtvPercent", "Lender's Maximum LTV", { default: 90, max: 100, step: 1 }),
      percentField("annualRatePercent", "Expected Rate", { default: 7.5, max: 25, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 20, min: 2, max: 20, step: 1 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 40, max: 60, step: 1 }),
      currencyField("liquidAssets", "Cash & Liquid Savings After Down Payment", { default: 15000, max: 100000000, step: 500 }),
      percentField("reservePercent", "Reserves Required (% of Loan)", { default: 10, max: 100, step: 1, required: false }),
    ],
    calcResult: { label: "Loan-to-Value", format: "percentage" },
    calcResults: [
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "ltvPercent", label: "Loan-to-Value", format: "percentage", highlight: true },
      { key: "ltvHeadroomPercent", label: "Room Under LTV Limit", format: "percentage" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "dtiPercent", label: "DTI With New Loan", format: "percentage" },
      { key: "dtiHeadroomPercent", label: "Room Under DTI Limit", format: "percentage" },
      { key: "scoreMargin", label: "Points Above Minimum Score", format: "number" },
      { key: "reserveMargin", label: "Cash Above Required Reserves", format: "currency" },
    ],
    instructions:
      "Enter your credit score, income and debts, the boat price and down payment, the loan's rate and term, and the " +
      "lender's limits. For larger loans, many marine lenders also want to see liquid savings left over after the " +
      "down payment — enter yours and the reserve requirement as a percentage of the loan. Any negative result shows " +
      "where you'd fall short.",
    examples:
      "Example: an $80,000 boat with $12,000 down needs a $68,000 loan — 85% LTV, 5 points under a 90% cap. At 7.5% over " +
      "20 years the payment is $547.80, so DTI on $10,000 of income with $2,800 of debts is 33.48% (6.52 under 40%). A " +
      "720 score is 40 above 680, and $15,000 of savings is $8,200 above a 10% reserve requirement.",
    assumptions:
      "Guideline check only; lenders also review the boat's age, survey, and your boating experience. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What credit score do boat lenders want?",
        answer: "Many marine lenders look for the high 600s or above, especially for larger loans and the longest terms. Lower scores may still qualify with a bigger down payment or shorter term.",
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
