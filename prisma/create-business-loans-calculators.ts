// One-time (but safe to re-run) batch setup script: creates the 4 tools
// of the "Business Finance Calculators" sub-batch H (Business Loans). Part of
// the Business Finance tool-list build-out: 108 tools in the source list, 17
// skipped as duplicates (9 in create-finance-business-calculators.ts, 8
// business-loan tools in create-loan-business-student-calculators.ts), 91
// built across 11 sub-batches — all under Finance Calculators > Business
// Finance Calculators except create-business-loans-calculators.ts (Loan
// Calculators):
//   create-business-profit-calculators.ts (10 tools)
//   create-business-breakeven-margin-calculators.ts (8 tools)
//   create-business-pricing-calculators.ts (7 tools)
//   create-business-revenue-calculators.ts (11 tools)
//   create-business-costs-calculators.ts (7 tools)
//   create-business-unit-returns-calculators.ts (9 tools)
//   create-business-liquidity-cash-calculators.ts (12 tools)
//   create-business-loans-calculators.ts (4 tools)
//   create-business-inventory-receivables-calculators.ts (9 tools)
//   create-business-valuation-calculators.ts (8 tools)
//   create-business-growth-variance-calculators.ts (6 tools)
//
// See src/lib/calc-engine-business-loans.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-business-loans-calculators.ts
// or
//   npm run db:create-business-loans-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Re-pointed 2 Oct 2026: Loan Calculators was split into 5 sub-categories
// (see organize-tool-categories.ts), and these tools now live in
// Loan Calculators > General Loan Calculators.
const CATEGORY_SLUG = "general-loan-calculators";

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
  "This tool provides general estimates for informational purposes only and isn't financial, accounting, tax " +
  "or legal advice. Results depend on the figures you enter — check them against your own accounts, or ask an " +
  "accountant or financial adviser before making business decisions.";

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
    slug: "business-loan-amortization-calculator",
    title: "Business Loan Amortization Calculator",
    description: "Amortize a business loan whose term is shorter than its amortization period — see the monthly payment and the balloon payment due at the end.",
    metaTitle: "Business Loan Amortization Calculator — Balloon",
    metaDescription: "Free business loan amortization calculator. See the monthly payment, interest and principal paid, and the balloon due when the term ends.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 250000, max: 10000000000, step: 5000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8, max: 40, step: 0.05 }),
      numberField("amortizationYears", "Amortization Period (Years)", { default: 15, min: 1, max: 40, step: 1 }),
      numberField("termYears", "Loan Term Before the Balloon (Years)", { default: 5, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "balloonPaymentAtEndOfTerm", label: "Balloon Payment Due at End of Term", format: "currency" },
      { key: "interestPaidDuringTerm", label: "Interest Paid During the Term", format: "currency" },
      { key: "principalPaidDuringTerm", label: "Principal Paid During the Term", format: "currency" },
      { key: "balanceAfterYear1", label: "Balance After Year 1", format: "currency" },
    ],
    instructions: "Enter the loan amount, rate, the amortization period used to set the payment, and the actual term. Many business and commercial loans are priced like a 15–25-year loan but come due in 5–10 years, leaving a large balance to pay off or refinance.",
    examples: "Example: $250,000 at 8% amortized over 15 years costs $2,389.13 a month. After a 5-year term you'll have paid $90,263.46 of interest and $53,084.35 of principal — with a $196,915.65 balloon still due.",
    assumptions: "Set the term equal to the amortization period for a fully repaying loan. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is a balloon payment?", answer: "A large final payment of the remaining balance when a loan's term ends before it's fully paid off. Borrowers usually refinance or sell an asset to cover it." }],
  },
  {
    slug: "business-loan-comparison-calculator",
    title: "Business Loan Comparison Calculator",
    description: "Compare two business loan offers with different rates, terms and origination fees — monthly payment, total cost and effective APR.",
    metaTitle: "Business Loan Comparison Calculator — Two Offers",
    metaDescription: "Free business loan comparison calculator. Compare two offers' payments, total cost and effective APR, including origination fees.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 150000, max: 10000000000, step: 5000 }),
      percentField("rateA", "Offer A — Interest Rate", { default: 9, max: 60, step: 0.05 }),
      numberField("termYearsA", "Offer A — Term (Years)", { default: 5, min: 1, max: 30, step: 1 }),
      percentField("feePercentA", "Offer A — Origination Fee", { default: 3, max: 15, step: 0.25 }),
      percentField("rateB", "Offer B — Interest Rate", { default: 10, max: 60, step: 0.05 }),
      numberField("termYearsB", "Offer B — Term (Years)", { default: 5, min: 1, max: 30, step: 1 }),
      percentField("feePercentB", "Offer B — Origination Fee", { default: 0, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Cost Difference", format: "currency" },
    calcResults: [
      { key: "costDifferenceAMinusB", label: "Offer A Costs More (+) or Less (−)", format: "currency", highlight: true },
      { key: "totalCostOfferA", label: "Offer A — Total Interest and Fees", format: "currency" },
      { key: "totalCostOfferB", label: "Offer B — Total Interest and Fees", format: "currency" },
      { key: "monthlyPaymentOfferA", label: "Offer A — Monthly Payment", format: "currency" },
      { key: "monthlyPaymentOfferB", label: "Offer B — Monthly Payment", format: "currency" },
      { key: "effectiveAprOfferAPercent", label: "Offer A — Effective APR", format: "percentage" },
      { key: "effectiveAprOfferBPercent", label: "Offer B — Effective APR", format: "percentage" },
    ],
    instructions: "Enter the loan amount, then each offer's rate, term and origination fee. A lower rate with a big fee can cost more than a higher rate with none — effective APR puts them on the same footing.",
    examples: "Example: on $150,000 for 5 years, Offer A (9% + 3% fee) costs $41,325.20 and Offer B (10%, no fee) $41,223.40 — B is $101.79 cheaper. A's lower payment ($3,113.75 vs $3,187.06) hides a 10.31% effective APR against B's 10%.",
    assumptions: "Fees are treated as paid upfront from the loan. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is an origination fee?", answer: "An upfront charge, usually 1–5% of the loan, for processing it. It raises the loan's true cost above its interest rate." }],
  },
  {
    slug: "business-loan-refinance-calculator",
    title: "Business Loan Refinance Calculator",
    description: "Decide whether to refinance a business loan — after the prepayment penalty on the old loan and fees on the new one — and when it breaks even.",
    metaTitle: "Business Loan Refinance Calculator — Worth It?",
    metaDescription: "Free business loan refinance calculator. Compare your current loan with a new one after prepayment penalties and fees, with break-even months.",
    calcInputs: [
      currencyField("currentBalance", "Current Loan Balance", { default: 120000, max: 10000000000, step: 1000 }),
      percentField("currentRatePercent", "Current Interest Rate", { default: 12, max: 60, step: 0.05 }),
      numberField("monthsLeft", "Months Left on Current Loan", { default: 48, min: 1, max: 480, step: 1 }),
      percentField("newRatePercent", "New Interest Rate", { default: 8.5, max: 60, step: 0.05 }),
      numberField("newTermMonths", "New Loan Term (Months)", { default: 48, min: 1, max: 480, step: 1 }),
      percentField("prepaymentPenaltyPercent", "Prepayment Penalty on Current Loan", { default: 2, max: 10, step: 0.25 }),
      currencyField("newLoanFees", "Fees on the New Loan", { default: 2500, max: 100000000, step: 100 }),
    ],
    calcResult: { label: "Net Savings", format: "currency" },
    calcResults: [
      { key: "netSavings", label: "Net Savings from Refinancing", format: "currency", highlight: true },
      { key: "monthlySaving", label: "Monthly Payment Saving", format: "currency" },
      { key: "newMonthlyPayment", label: "New Monthly Payment", format: "currency" },
      { key: "upfrontCostsToRefinance", label: "Upfront Costs (Penalty + Fees)", format: "currency" },
      { key: "breakEvenMonths", label: "Months to Break Even", format: "number" },
    ],
    instructions: "Enter your current loan's balance, rate and months left, the new loan's rate and term, any prepayment penalty on the old loan and fees on the new one. Net savings compares total interest on both paths after the upfront costs.",
    examples: "Example: refinancing $120,000 from 12% to 8.5% over 48 months cuts the payment by $202.26 to $2,957.80. After a 2% penalty and $2,500 of fees ($4,900), you break even in 24.23 months and save $4,808.66 overall.",
    assumptions: "Extending the term can lower payments but raise total interest — compare the net savings, not just the payment. " + GENERAL_DISCLAIMER,
    faq: [{ question: "When is refinancing a business loan worth it?", answer: "When net savings are positive and you'll keep the loan past the break-even point. Watch prepayment penalties, which can wipe out the gain." }],
  },
  {
    slug: "commercial-loan-calculator",
    title: "Commercial Loan Calculator",
    description: "Estimate a commercial real estate loan — amount from loan-to-value, monthly payment, balloon at maturity, and the debt service coverage ratio.",
    metaTitle: "Commercial Loan Calculator — CRE Loan & DSCR",
    metaDescription: "Free commercial loan calculator. Size a commercial property loan by LTV, and see the payment, balloon at maturity and DSCR from the property's NOI.",
    calcInputs: [
      currencyField("propertyValue", "Property Value", { default: 1500000, max: 100000000000, step: 10000 }),
      percentField("loanToValuePercent", "Loan-to-Value (LTV)", { default: 75, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7, max: 30, step: 0.05 }),
      numberField("amortizationYears", "Amortization (Years)", { default: 25, min: 1, max: 40, step: 1 }),
      numberField("termYears", "Loan Term (Years)", { default: 10, min: 1, max: 40, step: 1 }),
      currencyField("netOperatingIncome", "Property Net Operating Income (NOI)", { default: 120000, max: 100000000000, step: 1000 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "downPaymentNeeded", label: "Down Payment Needed", format: "currency" },
      { key: "balloonAtMaturity", label: "Balloon at Maturity", format: "currency" },
      { key: "debtServiceCoverageRatio", label: "Debt Service Coverage Ratio", format: "number" },
    ],
    instructions: "Enter the property value, the loan-to-value the lender offers (often 65–80%), rate, amortization, term and the property's net operating income (rent less operating costs). Lenders typically want a DSCR of at least 1.20–1.25.",
    examples: "Example: 75% of a $1.5 million property is a $1,125,000 loan (with $375,000 down). At 7% over 25 years it costs $7,951.27 a month, with an $884,625.71 balloon after 10 years. $120,000 of NOI covers the debt 1.26 times.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How are commercial loans different from home mortgages?", answer: "They usually have shorter terms than their amortization (leaving a balloon), lower LTVs, and are underwritten mainly on the property's income (DSCR) rather than the owner's salary." }],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
        "then re-run this script."
    );
  }

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
