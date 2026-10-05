// One-time (but safe to re-run) batch setup script: creates the 7 tools
// of the Loan Calculators expansion 2, sub-batch 7 (Bridge Loans),
// filed under Finance Calculators > Mortgage Calculators. See src/lib/calc-engine-mortgage-bridge.ts for
// the math and src/lib/calc-engine-loan-life-events.ts for the full batch
// context.
//
// HOW TO RUN
//   npx tsx prisma/create-mortgage-bridge-calculators.ts
// or
//   npm run db:create-mortgage-bridge-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Re-pointed 5 Oct 2026: Mortgage Calculators was split into 5 sub-categories
// (see organize-tool-categories.ts); this script creates its sub-category if missing.
const PARENT_CATEGORY_SLUG = "mortgage-calculators";
const CATEGORY = { name: "Refinance & Home Equity Calculators", slug: "refinance-home-equity-calculators" };

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
    slug: "bridge-loan-calculator",
    title: "Bridge Loan Calculator",
    description: "See how much you can borrow against the home you're selling to fund the down payment on your next home, including the bridge loan's fee.",
    metaTitle: "Bridge Loan Calculator — Buy Before You Sell",
    metaDescription: "Free bridge loan calculator. See the most your current home's equity allows, the loan needed for your next down payment, and the fee.",
    calcInputs: [
      currencyField("currentHomeValue", "Current Home's Value", { default: 450000, max: 100000000, step: 1000 }),
      currencyField("currentMortgage", "Current Mortgage Balance", { default: 200000, max: 100000000, step: 1000, required: false }),
      percentField("maxCltvPercent", "Lender's Maximum Combined LTV", { default: 80, max: 100, step: 1 }),
      percentField("feePercent", "Bridge Loan Origination Fee", { default: 2, max: 10, step: 0.25 }),
      currencyField("newHomePrice", "New Home Price", { default: 600000, max: 100000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment on New Home", { default: 20, max: 100, step: 1 }),
    ],
    calcResult: { label: "Bridge Loan Amount", format: "currency" },
    calcResults: [
      { key: "maxBridgeLoan", label: "Most You Can Borrow", format: "currency" },
      { key: "downPaymentNeeded", label: "Down Payment Needed", format: "currency" },
      { key: "bridgeLoanAmount", label: "Bridge Loan Amount", format: "currency", highlight: true },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "shortfall", label: "Down Payment Still Short", format: "currency" },
    ],
    instructions:
      "Enter your current home's value and mortgage balance, the lender's maximum combined loan-to-value (often around " +
      "80%), the bridge loan's fee, and the new home's price and down payment. The tool borrows just enough that, after " +
      "the fee, the down payment is covered — up to the most your equity allows.",
    examples:
      "Example: a $450,000 home with a $200,000 mortgage at an 80% CLTV limit allows up to $160,000. A 20% down payment " +
      "on a $600,000 home is $120,000, so you'd borrow $122,448.98 — after the $2,448.98 fee, the down payment is fully " +
      "covered.",
    assumptions:
      "Some bridge loans also pay off the old mortgage; this tool assumes you keep it until the sale. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is a bridge loan?",
        answer: "A short-term loan — usually 6 to 12 months — secured by the home you're selling, so you can buy your next home before the sale closes. It's repaid from the sale proceeds.",
      },
    ],
  },
  {
    slug: "bridge-loan-payment-calculator",
    title: "Bridge Loan Payment Calculator",
    description: "See the monthly cost of carrying two homes while you wait to sell: the bridge loan's interest plus both mortgage payments.",
    metaTitle: "Bridge Loan Payment Calculator — Carrying Two Homes",
    metaDescription: "Free bridge loan payment calculator. Add the bridge's interest-only payment to both mortgages and see the monthly and total cost of the overlap.",
    calcInputs: [
      currencyField("bridgeAmount", "Bridge Loan Amount", { default: 120000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Bridge Loan Rate", { default: 9.5, max: 25, step: 0.125 }),
      numberField("months", "Months Until Your Home Sells", { default: 6, min: 1, max: 24, step: 1 }),
      currencyField("oldMortgagePayment", "Current Home's Mortgage Payment", { default: 1500, max: 1000000, step: 25 }),
      currencyField("newMortgagePayment", "New Home's Mortgage Payment", { default: 3200, max: 1000000, step: 25 }),
    ],
    calcResult: { label: "Total Monthly Housing Cost", format: "currency" },
    calcResults: [
      { key: "bridgeInterestPayment", label: "Bridge Loan Interest Payment", format: "currency" },
      { key: "totalMonthlyHousing", label: "Total Monthly Housing Cost", format: "currency", highlight: true },
      { key: "extraOverNewPaymentAlone", label: "Extra Over the New Payment Alone", format: "currency" },
      { key: "totalBridgeInterest", label: "Total Bridge Interest", format: "currency" },
      { key: "totalCostOfOverlap", label: "Total Extra Cost of the Overlap", format: "currency" },
    ],
    instructions:
      "Enter the bridge loan amount and rate, how many months until your current home sells, and both mortgage " +
      "payments. Bridge loans are usually interest-only (or the interest is deferred until the sale), so the monthly " +
      "cost is interest on the full amount. The last line is what the overlap costs on top of your new home's payment.",
    examples:
      "Example: a $120,000 bridge at 9.5% costs $950 a month in interest. With a $1,500 old payment and $3,200 new one, " +
      "housing costs $5,650 a month — $2,450 more than the new payment alone. Over 6 months, the overlap costs $14,700, " +
      "including $5,700 of bridge interest.",
    assumptions:
      "Add property taxes, insurance, and utilities on both homes for the full picture. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I have to make monthly bridge loan payments?",
        answer: "Not always. Many bridge loans let interest accrue and be paid at the sale, which helps cash flow but makes the payoff larger.",
      },
    ],
  },
  {
    slug: "bridge-loan-payoff-calculator",
    title: "Bridge Loan Payoff Calculator",
    description: "Work out what you'll walk away with when your old home sells, after selling costs, the old mortgage and the bridge loan (with any deferred interest) are repaid.",
    metaTitle: "Bridge Loan Payoff Calculator — Net Proceeds",
    metaDescription: "Free bridge loan payoff calculator. See the bridge payoff with deferred interest and your net proceeds after selling costs and both loans.",
    calcInputs: [
      currencyField("salePrice", "Sale Price of Your Home", { default: 450000, max: 100000000, step: 1000 }),
      percentField("commissionPercent", "Agent Commission", { default: 5.5, max: 10, step: 0.25 }),
      currencyField("otherSellingCosts", "Other Selling Costs", { default: 5000, max: 1000000, step: 100, required: false }),
      currencyField("oldMortgageBalance", "Mortgage Balance on the Old Home", { default: 200000, max: 100000000, step: 1000, required: false }),
      currencyField("bridgeAmount", "Bridge Loan Amount", { default: 120000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Bridge Loan Rate", { default: 9.5, max: 25, step: 0.125 }),
      numberField("monthsUntilSale", "Months Until the Sale Closes", { default: 5, min: 0, max: 24, step: 1 }),
      {
        key: "interestDeferred", label: "Was Bridge Interest Deferred to the Sale?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes — Paid at the Sale", value: 1 },
          { label: "No — I Paid It Monthly", value: 0 },
        ],
      },
    ],
    calcResult: { label: "Net Proceeds to You", format: "currency" },
    calcResults: [
      { key: "sellingCosts", label: "Selling Costs", format: "currency" },
      { key: "deferredInterestDue", label: "Deferred Interest Due", format: "currency" },
      { key: "bridgePayoff", label: "Bridge Loan Payoff", format: "currency" },
      { key: "netProceedsToYou", label: "Net Proceeds to You", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the sale price, agent commission, other selling costs, the old mortgage balance, the bridge loan, its rate, " +
      "the months until closing, and whether the interest was deferred. At closing, the old mortgage and bridge loan " +
      "are paid first; the rest is yours — often used to pay down the new mortgage.",
    examples:
      "Example: selling for $450,000 with 5.5% commission and $5,000 of other costs ($29,750 in total), repaying the " +
      "$200,000 mortgage and a $120,000 bridge with 5 months of deferred interest ($4,750) leaves you $95,500.",
    assumptions:
      "Deferred interest is simple interest. Some bridge loans charge a minimum interest period even if you sell " +
      "sooner. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if my home sells for less than expected?",
        answer: "The bridge loan still has to be repaid in full. A lower price reduces your net proceeds — or leaves a shortfall to cover from savings.",
      },
    ],
  },
  {
    slug: "bridge-loan-interest-calculator",
    title: "Bridge Loan Interest Calculator",
    description: "See what a bridge loan costs if your home sells in 3, 6 or 12 months — interest plus the origination fee — and the annualised cost of a typical 6-month bridge.",
    metaTitle: "Bridge Loan Interest Calculator — Cost by Month",
    metaDescription: "Free bridge loan interest calculator. See the cost of a bridge loan over 3, 6 and 12 months including fees, and its annualised cost.",
    calcInputs: [
      currencyField("bridgeAmount", "Bridge Loan Amount", { default: 120000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Bridge Loan Rate", { default: 9.5, max: 25, step: 0.125 }),
      percentField("feePercent", "Origination Fee", { default: 2, max: 10, step: 0.25 }),
    ],
    calcResult: { label: "Cost for 6 Months", format: "currency" },
    calcResults: [
      { key: "interestPerMonth", label: "Interest per Month", format: "currency" },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "costFor3Months", label: "Cost for 3 Months", format: "currency" },
      { key: "costFor6Months", label: "Cost for 6 Months", format: "currency", highlight: true },
      { key: "costFor12Months", label: "Cost for 12 Months", format: "currency" },
      { key: "annualisedCostOf6MonthsPercent", label: "Annualised Cost of a 6-Month Bridge", format: "percentage" },
    ],
    instructions:
      "Enter the bridge loan amount, rate, and fee. Because the fee is paid once, a quick sale makes it a larger share " +
      "of the cost. The annualised figure shows what a 6-month bridge really costs per year, fee included — compare it " +
      "with a HELOC's rate.",
    examples:
      "Example: a $120,000 bridge at 9.5% costs $950 a month in interest plus a $2,400 fee: $5,250 for 3 months, $8,100 " +
      "for 6, or $13,800 for 12. A 6-month bridge costs the equivalent of 13.50% a year.",
    assumptions:
      "Interest is simple interest on the full amount. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why are bridge loans more expensive than mortgages?",
        answer: "They're short-term, carry the risk that your home doesn't sell, and lenders earn their fees over months rather than decades.",
      },
    ],
  },
  {
    slug: "bridge-loan-affordability-calculator",
    title: "Bridge Loan Affordability Calculator",
    description: "Check whether you can carry two homes and a bridge loan at once: your debt-to-income ratio during the overlap, and how many months your savings cover the extra cost.",
    metaTitle: "Bridge Loan Affordability Calculator — Two Homes",
    metaDescription: "Free bridge loan affordability calculator. See your DTI carrying two mortgages and a bridge loan, and how long savings cover the extra cost.",
    calcInputs: [
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 14000, max: 10000000, step: 100 }),
      currencyField("otherDebts", "Other Monthly Debt Payments", { default: 600, max: 1000000, step: 25, required: false }),
      currencyField("oldMortgagePayment", "Current Home's Payment", { default: 1800, max: 1000000, step: 25 }),
      currencyField("newMortgagePayment", "New Home's Payment", { default: 3200, max: 1000000, step: 25 }),
      currencyField("bridgeAmount", "Bridge Loan Amount", { default: 120000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Bridge Loan Rate", { default: 9.5, max: 25, step: 0.125 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 50, max: 60, step: 1 }),
      currencyField("savings", "Savings Available", { default: 40000, max: 100000000, step: 1000, required: false }),
    ],
    calcResult: { label: "DTI During the Overlap", format: "percentage" },
    calcResults: [
      { key: "bridgeInterestPayment", label: "Bridge Interest Payment", format: "currency" },
      { key: "totalMonthlyDebts", label: "Total Monthly Debts", format: "currency" },
      { key: "dtiPercent", label: "DTI During the Overlap", format: "percentage", highlight: true },
      { key: "dtiHeadroomPercent", label: "Room Under DTI Limit", format: "percentage" },
      { key: "monthsSavingsCoverExtra", label: "Months Savings Cover the Extra Cost", format: "number", unit: "months" },
    ],
    instructions:
      "Enter your income and other debts, both mortgage payments, the bridge loan and rate, the lender's DTI limit, and " +
      "your savings. Lenders usually count both homes' payments when you apply for the new mortgage. The last result " +
      "shows how long your savings could cover the old home's payment and the bridge interest if the sale drags on.",
    examples:
      "Example: on $14,000 a month, $600 of other debts, $1,800 and $3,200 mortgage payments, and $950 of bridge interest " +
      "make $6,550 — a 46.79% DTI, 3.21 under 50%. $40,000 of savings covers the extra $2,750 a month for about 14.55 " +
      "months.",
    assumptions:
      "Taxes, insurance, and upkeep on two homes add to the real cost. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Will lenders ignore the old mortgage if my home is listed for sale?",
        answer: "Some will exclude it if the home is under contract or you show the bridge loan covers it; many won't. Ask your lender how they'll count it.",
      },
    ],
  },
  {
    slug: "bridge-loan-comparison-calculator",
    title: "Bridge Loan Comparison Calculator",
    description: "Compare three ways to move when you need the equity in your current home: a bridge loan, a HELOC on your current home, or selling first and renting.",
    metaTitle: "Bridge Loan Comparison — Bridge vs HELOC vs Sell First",
    metaDescription: "Free calculator comparing a bridge loan, a HELOC and selling first then renting. See the cost of each over the months between homes.",
    calcInputs: [
      currencyField("amount", "Amount Needed From Your Equity", { default: 120000, max: 100000000, step: 1000 }),
      numberField("months", "Months Between Buying and Selling", { default: 6, min: 0, max: 24, step: 1 }),
      percentField("bridgeRatePercent", "Bridge Loan Rate", { default: 9.5, max: 25, step: 0.125 }),
      percentField("bridgeFeePercent", "Bridge Loan Fee", { default: 2, max: 10, step: 0.25 }),
      percentField("helocRatePercent", "HELOC Rate", { default: 8.5, max: 25, step: 0.125 }),
      currencyField("helocCosts", "HELOC Setup Costs", { default: 1000, max: 100000, step: 50, required: false }),
      currencyField("monthlyRent", "Rent If You Sell First", { default: 2800, max: 100000, step: 50 }),
      currencyField("extraMovingCosts", "Extra Move & Storage If You Sell First", { default: 4000, max: 1000000, step: 100, required: false }),
    ],
    calcResult: { label: "Bridge Loan Cost", format: "currency" },
    calcResults: [
      { key: "bridgeLoanCost", label: "Bridge Loan Cost", format: "currency", highlight: true },
      { key: "helocCost", label: "HELOC Cost", format: "currency" },
      { key: "sellFirstAndRentCost", label: "Sell First & Rent Cost", format: "currency" },
      { key: "bridgeVsHelocExtra", label: "Bridge Costs More Than HELOC By", format: "currency" },
    ],
    instructions:
      "Enter how much equity you need, how many months the gap lasts, the bridge loan's rate and fee, a HELOC's rate and " +
      "setup costs, and — for selling first — the rent and extra moving or storage costs. A HELOC is often cheaper but " +
      "must be opened before you list your home; selling first avoids borrowing but means moving twice.",
    examples:
      "Example: over 6 months, a $120,000 bridge at 9.5% with a 2% fee costs $8,100; a HELOC at 8.5% with $1,000 of setup " +
      "costs $6,100 — $2,000 less. Selling first and renting at $2,800 a month with $4,000 of extra moving costs " +
      "$20,800.",
    assumptions:
      "Renting is compared on rent alone; you'd also avoid paying the old mortgage, which this simple comparison " +
      "doesn't count. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get a HELOC on a home that's for sale?",
        answer: "Usually not — most lenders won't open a HELOC on a listed home. Set it up before you list if you plan to use one.",
      },
    ],
  },
  {
    slug: "bridge-loan-eligibility-calculator",
    title: "Bridge Loan Eligibility Calculator",
    description: "Check a bridge loan against typical requirements: combined loan-to-value on your current home, debt-to-income while carrying both homes, and credit score.",
    metaTitle: "Bridge Loan Eligibility Calculator — Free",
    metaDescription: "Free bridge loan eligibility calculator. Check combined LTV on your current home, DTI with both mortgages, and your credit score margin.",
    calcInputs: [
      currencyField("homeValue", "Current Home's Value", { default: 450000, max: 100000000, step: 1000 }),
      currencyField("currentMortgage", "Current Mortgage Balance", { default: 200000, max: 100000000, step: 1000, required: false }),
      currencyField("bridgeAmount", "Bridge Loan Requested", { default: 120000, max: 100000000, step: 1000 }),
      percentField("maxCltvPercent", "Lender's Maximum Combined LTV", { default: 80, max: 100, step: 1 }),
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 14000, max: 10000000, step: 100 }),
      currencyField("otherDebts", "Other Monthly Debt Payments", { default: 600, max: 1000000, step: 25, required: false }),
      currencyField("oldMortgagePayment", "Current Home's Payment", { default: 1800, max: 1000000, step: 25 }),
      currencyField("newMortgagePayment", "New Home's Payment", { default: 3200, max: 1000000, step: 25 }),
      percentField("annualRatePercent", "Bridge Loan Rate", { default: 9.5, max: 25, step: 0.125 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 50, max: 60, step: 1 }),
      numberField("creditScore", "Your Credit Score", { default: 720, min: 300, max: 850, step: 1 }),
      numberField("lenderMinScore", "Lender's Minimum Score", { default: 700, min: 300, max: 850, step: 1 }),
    ],
    calcResult: { label: "Combined LTV", format: "percentage" },
    calcResults: [
      { key: "cltvPercent", label: "Combined LTV", format: "percentage", highlight: true },
      { key: "cltvHeadroomPercent", label: "Room Under CLTV Limit", format: "percentage" },
      { key: "equityLeftPercent", label: "Equity Left in Your Home", format: "percentage" },
      { key: "dtiPercent", label: "DTI Carrying Both Homes", format: "percentage" },
      { key: "dtiHeadroomPercent", label: "Room Under DTI Limit", format: "percentage" },
      { key: "scoreMargin", label: "Points Above Minimum Score", format: "number" },
    ],
    instructions:
      "Enter your current home's value and mortgage, the bridge loan, the lender's CLTV and DTI limits, your income, " +
      "debts, both mortgage payments, the bridge rate, and your credit score. Bridge lenders typically want plenty of " +
      "equity (around 20% left after the loan), good credit, and an income that can carry both homes. Negative results " +
      "show where you'd fall short.",
    examples:
      "Example: a $120,000 bridge on a $450,000 home with $200,000 owed puts CLTV at 71.11% — 8.89 under 80%, leaving " +
      "28.89% equity. Carrying both homes and the bridge interest, DTI is 46.79%, 3.21 under 50%. A 720 score is 20 " +
      "above 700.",
    assumptions:
      "Many lenders also want your current home listed or under contract. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who offers bridge loans?",
        answer: "Some banks, credit unions, and specialist lenders, often the same lender handling your new mortgage. Availability varies, so ask early in your home search.",
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
