// One-time (but safe to re-run) batch setup script: creates the 7 tools
// of the Loan Calculators expansion 2, sub-batch 4 (Farm Equipment Loans),
// filed under Finance Calculators > Loan Calculators > General Loan Calculators. See src/lib/calc-engine-loan-farm-equipment.ts for
// the math and src/lib/calc-engine-loan-life-events.ts for the full batch
// context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-farm-equipment-calculators.ts
// or
//   npm run db:create-loan-farm-equipment-calculators

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
    slug: "farm-equipment-loan-calculator",
    title: "Farm Equipment Loan Calculator",
    description: "Finance a tractor, combine or other farm equipment: subtract your trade-in and down payment, and see the payment on an annual, semi-annual, quarterly or monthly schedule.",
    metaTitle: "Farm Equipment Loan Calculator — Tractor & Combine",
    metaDescription: "Free farm equipment and tractor loan calculator. Subtract trade-in and down payment, choose annual or monthly payments, and see your cost.",
    calcInputs: [
      currencyField("price", "Equipment Price", { default: 150000, max: 100000000, step: 1000 }),
      currencyField("tradeInValue", "Trade-In Value", { default: 30000, max: 100000000, step: 1000, required: false }),
      percentField("downPaymentPercent", "Down Payment", { default: 15, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8, max: 25, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 7, min: 1, max: 15, step: 1 }),
      {
        key: "paymentsPerYear", label: "Payment Schedule", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Annual (After Harvest)", value: 1 },
          { label: "Semi-Annual", value: 2 },
          { label: "Quarterly", value: 4 },
          { label: "Monthly", value: 12 },
        ],
      },
    ],
    calcResult: { label: "Payment per Period", format: "currency" },
    calcResults: [
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "paymentPerPeriod", label: "Payment per Period", format: "currency", highlight: true },
      { key: "annualCost", label: "Total Payments per Year", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the equipment price, your trade-in, the down payment percentage (often 10%–20%), the rate and term, and " +
      "how often you'll pay. Many farm lenders and dealer finance companies let payments match your cash flow — for " +
      "example, one annual payment after harvest. This covers tractors as well as combines, planters, sprayers, and " +
      "other machinery.",
    examples:
      "Example: a $150,000 tractor with a $30,000 trade-in and 15% down ($18,000) leaves $102,000 to finance. At 8% " +
      "over 7 years with annual payments, that's $19,591.38 a year and $35,139.69 of interest.",
    assumptions:
      "Down payment is calculated on the price after the trade-in. Annual schedules charge more interest than monthly " +
      "ones because the balance falls more slowly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Where can farmers get equipment loans?",
        answer: "Farm Credit associations, local banks, manufacturer finance arms (often with promotional rates), and USDA Farm Service Agency loans for eligible farmers.",
      },
    ],
  },
  {
    slug: "farm-equipment-loan-payment-calculator",
    title: "Farm Equipment Loan Payment Calculator",
    description: "Time your first annual payment for harvest: compare the payment when it's due a set number of months after purchase with a standard 12-month schedule.",
    metaTitle: "Farm Equipment Loan Payment Calculator — Harvest Timing",
    metaDescription: "Free farm equipment payment calculator. See how timing the first annual payment to harvest changes the payment and total interest.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 120000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8, max: 25, step: 0.05 }),
      numberField("termYears", "Number of Annual Payments", { default: 5, min: 1, max: 15, step: 1 }),
      numberField("monthsUntilFirstPayment", "Months Until the First Payment (Harvest)", { default: 15, min: 1, max: 24, step: 1 }),
    ],
    calcResult: { label: "Annual Payment Timed to Harvest", format: "currency" },
    calcResults: [
      { key: "standardAnnualPayment", label: "Standard — First Payment at 12 Months", format: "currency" },
      { key: "harvestAnnualPayment", label: "Annual Payment Timed to Harvest", format: "currency", highlight: true },
      { key: "standardTotalInterest", label: "Standard — Total Interest", format: "currency" },
      { key: "harvestTotalInterest", label: "Harvest Timing — Total Interest", format: "currency" },
      { key: "extraCostOfTiming", label: "Extra Cost of the Later First Payment", format: "currency" },
    ],
    instructions:
      "If you buy equipment in spring, the first payment can often be set for after the next harvest rather than " +
      "exactly 12 months later. Enter the loan, rate, number of annual payments, and the months until your first " +
      "payment. A later first payment means more interest builds up, so each payment is a little higher; an earlier " +
      "one lowers it (and the extra cost becomes negative).",
    examples:
      "Example: $120,000 at 8% repaid in 5 annual payments costs $30,054.77 a year with the first payment at 12 months. " +
      "Setting the first payment for harvest, 15 months away, raises it to $30,638.64 — $2,919.30 more in total.",
    assumptions:
      "Interest compounds annually and accrues from the purchase date. Lenders may calculate interest daily, so " +
      "figures can differ slightly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a waiver of finance charges?",
        answer: "Manufacturers sometimes offer interest-free periods (for example, no interest until a set date) as a sales incentive. That can make a deferred first payment free — check the dates carefully.",
      },
    ],
  },
  {
    slug: "farm-equipment-loan-payoff-calculator",
    title: "Farm Equipment Loan Payoff Calculator",
    description: "See how an extra principal payment after a good harvest shortens a farm equipment loan with annual payments, and how much interest it saves.",
    metaTitle: "Farm Equipment Loan Payoff Calculator — Prepay After Harvest",
    metaDescription: "Free farm equipment loan payoff calculator. Add an extra payment in a good year and see years and interest saved on an annual-payment loan.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 150000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.5, max: 25, step: 0.05 }),
      numberField("termYears", "Number of Annual Payments", { default: 7, min: 1, max: 15, step: 1 }),
      currencyField("extraPayment", "Extra Principal Payment", { default: 30000, max: 100000000, step: 1000 }),
      numberField("extraYear", "Made After Payment Number", { default: 2, min: 1, max: 15, step: 1 }),
    ],
    calcResult: { label: "Interest Saved", format: "currency" },
    calcResults: [
      { key: "annualPayment", label: "Annual Payment", format: "currency" },
      { key: "paymentsNeeded", label: "Annual Payments Needed Now", format: "number" },
      { key: "yearsSaved", label: "Years Saved", format: "number", unit: "years" },
      { key: "finalPayment", label: "Size of the Final Payment", format: "currency" },
      { key: "interestSaved", label: "Interest Saved", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan, rate, and number of annual payments, then an extra principal payment and which year you'll make " +
      "it (for example, after a strong harvest or a crop insurance payout). The regular annual payment stays the same, " +
      "so the loan ends early.",
    examples:
      "Example: $150,000 at 7.5% over 7 annual payments costs $28,320.05 a year. Paying an extra $30,000 after the second " +
      "payment ends the loan after 6 payments — the last one just $14,600.20 — saving $12,039.89 in interest.",
    assumptions:
      "Assumes the extra payment goes straight to principal with no prepayment penalty. Keep enough working capital " +
      "for the next season before prepaying. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I prepay equipment or keep cash?",
        answer: "Prepaying saves interest at the loan's rate, but cash on hand protects you in a bad year. Many farmers prepay only after setting aside working capital.",
      },
    ],
  },
  {
    slug: "farm-equipment-loan-interest-calculator",
    title: "Farm Equipment Loan Interest Calculator",
    description: "Find the interest on a farm equipment loan and the after-tax cost of the machine once Section 179 expensing and interest deductions are counted.",
    metaTitle: "Farm Equipment Loan Interest Calculator — Section 179",
    metaDescription: "Free farm equipment interest calculator. See total interest, the year-one Section 179 and interest deduction, and the after-tax cost.",
    calcInputs: [
      currencyField("price", "Equipment Price", { default: 100000, max: 100000000, step: 1000 }),
      currencyField("amountFinanced", "Amount Financed", { default: 85000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8, max: 25, step: 0.05 }),
      numberField("termYears", "Number of Annual Payments", { default: 5, min: 1, max: 15, step: 1 }),
      percentField("expensedPercent", "Share of Price Expensed in Year 1 (Section 179 / Bonus)", { default: 100, max: 100, step: 5 }),
      percentField("taxRatePercent", "Your Combined Tax Rate", { default: 24, max: 70, step: 1 }),
    ],
    calcResult: { label: "After-Tax Cost", format: "currency" },
    calcResults: [
      { key: "annualPayment", label: "Annual Payment", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "year1Deduction", label: "Year 1 Deduction (Expensing + Interest)", format: "currency" },
      { key: "year1TaxSavings", label: "Year 1 Tax Savings", format: "currency" },
      { key: "afterTaxCost", label: "After-Tax Cost", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the price, the amount financed, the rate and number of annual payments, the share of the price you'll " +
      "deduct in the first year, and your combined federal and state tax rate.\n\n" +
      "US farms can usually deduct the full cost of qualifying equipment in the year it's placed in service under " +
      "Section 179 (limit raised to $2.5 million by the 2025 tax law, indexed for inflation) or 100% bonus " +
      "depreciation. Loan interest on business equipment is also deductible.",
    examples:
      "Example: a $100,000 machine with $85,000 financed at 8% over 5 annual payments ($21,288.80 a year) costs $21,443.99 " +
      "in interest. Expensing 100% plus year-one interest gives a $106,800 deduction — $25,632 of tax savings at 24% — " +
      "and an after-tax cost of $92,297.43.",
    assumptions:
      "Simplified: assumes you have enough taxable income to use the deductions at the same rate every year, and ignores " +
      "depreciation recapture if you sell. Ask your tax adviser. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does Section 179 apply to used equipment?",
        answer: "Yes — used equipment can qualify as long as it's new to you and used more than 50% for the business.",
      },
    ],
  },
  {
    slug: "farm-equipment-loan-affordability-calculator",
    title: "Farm Equipment Loan Affordability Calculator",
    description: "Set aside a share of net farm income for equipment payments and find the largest loan and equipment price it supports, plus the cost per acre.",
    metaTitle: "Farm Equipment Loan Affordability Calculator",
    metaDescription: "Free farm equipment affordability calculator. Turn a share of net farm income into a maximum loan, equipment price and cost per acre.",
    calcInputs: [
      currencyField("annualNetFarmIncome", "Net Farm Income per Year", { default: 120000, max: 100000000, step: 1000 }),
      percentField("maxSharePercent", "Share Available for Equipment Payments", { default: 20, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8, max: 25, step: 0.05 }),
      numberField("termYears", "Number of Annual Payments", { default: 7, min: 1, max: 15, step: 1 }),
      percentField("downPaymentPercent", "Down Payment", { default: 20, max: 99, step: 1 }),
      numberField("acres", "Acres Farmed", { default: 800, min: 0, max: 1000000, step: 10, required: false }),
    ],
    calcResult: { label: "Maximum Equipment Price", format: "currency" },
    calcResults: [
      { key: "maxAnnualPayment", label: "Maximum Annual Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency" },
      { key: "maxEquipmentPrice", label: "Maximum Equipment Price", format: "currency", highlight: true },
      { key: "downPaymentNeeded", label: "Down Payment Needed", format: "currency" },
      { key: "paymentPerAcre", label: "Payment per Acre per Year", format: "currency" },
    ],
    instructions:
      "Enter your typical net farm income, the share you can commit to this equipment's payments, the loan's rate and " +
      "term, your down payment, and the acres the machine will cover. Use a conservative income figure — a bad year " +
      "still has to cover the payment.",
    examples:
      "Example: 20% of $120,000 of net farm income allows a $24,000 annual payment. At 8% over 7 years that supports a " +
      "$124,952.88 loan; with 20% down, equipment up to $156,191.10, needing $31,238.22 down. Over 800 acres the payment " +
      "is $30 an acre per year.",
    assumptions:
      "Doesn't include fuel, repairs, insurance, or labour. Compare the per-acre cost with custom hire rates in your " +
      "area. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I hire custom work instead of buying?",
        answer: "For smaller acreages, paying a custom operator per acre can cost less than owning, financing, and maintaining a machine you use only a few days a year.",
      },
    ],
  },
  {
    slug: "farm-equipment-loan-comparison-calculator",
    title: "Farm Equipment Loan Comparison Calculator",
    description: "Compare financing and owning farm equipment with leasing it, after counting what the machine is worth at the end of the term.",
    metaTitle: "Farm Equipment Loan vs Lease Calculator",
    metaDescription: "Free farm equipment buy vs lease calculator. Compare the net cost of financing and owning, after resale value, with leasing.",
    calcInputs: [
      currencyField("price", "Equipment Price", { default: 200000, max: 100000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 15, max: 100, step: 1 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 8, max: 25, step: 0.05 }),
      numberField("termYears", "Term (Years, Both Options)", { default: 5, min: 1, max: 15, step: 1 }),
      percentField("residualPercent", "Value at the End (% of Price)", { default: 55, max: 100, step: 1 }),
      currencyField("leaseAnnual", "Annual Lease Payment", { default: 30000, max: 10000000, step: 500 }),
    ],
    calcResult: { label: "Buying Saves", format: "currency" },
    calcResults: [
      { key: "annualLoanPayment", label: "Annual Loan Payment", format: "currency" },
      { key: "ownNetCost", label: "Buy — Net Cost After Resale Value", format: "currency" },
      { key: "leaseTotalCost", label: "Lease — Total Payments", format: "currency" },
      { key: "buyingSaves", label: "Buying Saves", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the price, down payment, loan rate, the term (used for both the loan and the lease), what the machine " +
      "will be worth at the end, and the annual lease payment. Buying's net cost is the down payment plus loan payments " +
      "minus the machine's value at the end; leasing is the lease payments. A negative saving means leasing is cheaper.",
    examples:
      "Example: a $200,000 combine with 15% down at 8% over 5 years costs $42,577.60 a year. If it's worth 55% at the end, " +
      "owning costs $132,887.99 net. Leasing at $30,000 a year costs $150,000, so buying saves $17,112.01.",
    assumptions:
      "Ignores tax differences, lease hour limits, repairs, and the cost of the cash used for the down payment. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do farmers lease equipment?",
        answer: "Leasing keeps cash free, gives access to the latest technology, can be fully deductible as a business expense, and avoids resale risk — useful for machines you replace often.",
      },
    ],
  },
  {
    slug: "farm-equipment-loan-eligibility-calculator",
    title: "Farm Equipment Loan Eligibility Calculator",
    description: "Check a farm equipment loan the way ag lenders do: debt-service coverage ratio with the new payment, the most you could add, and your credit score margin.",
    metaTitle: "Farm Equipment Loan Eligibility Calculator — DSCR",
    metaDescription: "Free farm equipment loan eligibility calculator. Check your debt-service coverage ratio with the new loan and your credit score margin.",
    calcInputs: [
      currencyField("netIncomeBeforeDebt", "Net Farm Income Before Debt Payments (Yearly)", { default: 180000, max: 100000000, step: 1000 }),
      currencyField("existingAnnualDebt", "Existing Annual Debt Payments", { default: 60000, max: 100000000, step: 1000 }),
      currencyField("loanAmount", "New Loan Amount", { default: 150000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8, max: 25, step: 0.05 }),
      numberField("termYears", "Number of Annual Payments", { default: 7, min: 1, max: 15, step: 1 }),
      numberField("minDscr", "Lender's Minimum DSCR", { default: 1.25, min: 0.5, max: 3, step: 0.05 }),
      numberField("creditScore", "Your Credit Score", { default: 700, min: 300, max: 850, step: 1 }),
      numberField("lenderMinScore", "Lender's Minimum Score", { default: 680, min: 300, max: 850, step: 1 }),
    ],
    calcResult: { label: "Debt-Service Coverage Ratio", format: "number" },
    calcResults: [
      { key: "newAnnualPayment", label: "New Annual Payment", format: "currency" },
      { key: "dscr", label: "Debt-Service Coverage Ratio", format: "number", highlight: true },
      { key: "dscrHeadroom", label: "Room Above Minimum DSCR", format: "number" },
      { key: "maxNewPaymentAtMinimum", label: "Largest New Annual Payment Allowed", format: "currency" },
      { key: "scoreMargin", label: "Points Above Minimum Score", format: "number" },
    ],
    instructions:
      "The debt-service coverage ratio (DSCR) compares the income available to pay debts with the debt payments due. " +
      "Enter your net farm income before debt payments (lenders often average several years), existing annual debt " +
      "payments, the new loan, and the lender's minimum DSCR (often 1.25) and credit score. A DSCR below the minimum " +
      "— or negative room — means the lender is likely to want a smaller loan or more down.",
    examples:
      "Example: a $150,000 loan at 8% over 7 years costs $28,810.86 a year. With $180,000 of income and $60,000 of " +
      "existing payments, DSCR is 2.03 — 0.78 above 1.25. You could take on up to $84,000 a year of new payments. A 700 " +
      "score is 20 points above 680.",
    assumptions:
      "Lenders also look at working capital, equity, collateral, and farming experience. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What does a DSCR of 1.25 mean?",
        answer: "That income is 1.25 times the debt payments — there's a 25% cushion after paying all debts. Below 1.0, income doesn't cover the payments.",
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
