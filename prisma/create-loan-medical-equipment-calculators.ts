// One-time (but safe to re-run) batch setup script: creates the Medical Equipment Loan tools
// (4) of the Loan Calculators expansion 4, filed under Loan Calculators > General Loan Calculators.
// See src/lib/calc-engine-loan-medical-equipment.ts for the math and
// src/lib/calc-engine-loan-powersports.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-medical-equipment-calculators.ts
// or
//   npm run db:create-loan-medical-equipment-calculators

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
    slug: "medical-equipment-loan-calculator",
    title: "Medical Equipment Loan Calculator",
    description: "Finance imaging, lasers, dental chairs or other practice equipment: include installation and training, subtract your down payment, and see the payment.",
    metaTitle: "Medical Equipment Loan Calculator — Practice Financing",
    metaDescription: "Free medical equipment loan calculator. Add installation and training, subtract the down payment, and see the payment and total cost.",
    calcInputs: [
      currencyField("price", "Equipment Price", { default: 250000, max: 10000000, step: 1000 }),
      currencyField("installation", "Installation, Shipping & Training", { default: 15000, max: 1000000, step: 500, required: false }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 25, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 120, step: 6 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalProjectCost", label: "Total Equipment Cost", format: "currency" },
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency" },
    ],
    instructions:
      "Enter the equipment price, the installation, shipping and staff training costs (lenders often finance these " +
      "too), your down payment, and the rate and term. Medical equipment lenders commonly finance up to 100% for " +
      "established practices, with terms matched to the equipment's useful life.",
    examples:
      "Example: $250,000 of equipment plus installation and training comes to $265,000. With " +
      "10% down you finance $238,500; at 8.50% over 60 months that's " +
      "$4,893.19 a month and $55,091.56 of interest.",
    assumptions:
      "Fixed rate, equal monthly payments. Service contracts and supplies aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can a new practice finance medical equipment?",
        answer: "Yes — many lenders specialise in healthcare and lend to new practices based on the provider's credentials and credit, sometimes with deferred first payments.",
      },
    ],
  },
  {
    slug: "medical-equipment-loan-payment-calculator",
    title: "Medical Equipment Loan Payment Calculator",
    description: "See how many procedures a month it takes to cover a medical equipment loan payment, and the cash the equipment adds after the payment.",
    metaTitle: "Medical Equipment Payment — Procedures to Break Even",
    metaDescription: "Free medical equipment payment calculator. See the payment, the procedures per month needed to cover it, and net cash after the payment.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 200000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 25, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 120, step: 6 }),
      currencyField("revenuePerProcedure", "Reimbursement per Procedure", { default: 350, max: 100000, step: 5 }),
      currencyField("suppliesPerProcedure", "Supplies & Variable Cost per Procedure", { default: 60, max: 100000, step: 5, required: false }),
      numberField("proceduresPerMonth", "Expected Procedures per Month", { default: 40, min: 0, max: 100000, step: 1 }),
    ],
    calcResult: { label: "Procedures Needed to Cover the Payment", format: "number" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "marginPerProcedure", label: "Margin per Procedure", format: "currency" },
      { key: "breakEvenProcedures", label: "Procedures Needed to Cover the Payment", format: "number", highlight: true },
      { key: "monthlyContribution", label: "Monthly Margin From the Equipment", format: "currency" },
      { key: "netAfterPayment", label: "Net Cash After the Payment", format: "currency" },
    ],
    instructions:
      "Enter the loan, the average reimbursement for a procedure done with the equipment, its supplies and other " +
      "per-procedure costs, and the volume you expect. The break-even count tells you how busy the equipment must be " +
      "just to pay for itself.",
    examples:
      "Example: a $200,000 loan at 8.50% over 60 months costs $4,103.31 a month. At " +
      "$350 a procedure less $60 of supplies, each earns $290, so " +
      "15 procedures cover the payment. At 40 a month, the equipment adds " +
      "$7,496.69 after the payment.",
    assumptions:
      "Staff time, service contracts and overhead aren't included; reimbursement varies by payer mix. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I estimate reimbursement per procedure?",
        answer: "Use your practice's actual collections for the procedure codes across your payer mix, not list prices — Medicare and commercial rates can differ widely.",
      },
    ],
  },
  {
    slug: "medical-equipment-loan-cost-calculator",
    title: "Medical Equipment Loan Cost Calculator",
    description: "Compare buying medical equipment with a loan — with the Section 179 deduction and resale value — against a fair-market-value lease, after tax.",
    metaTitle: "Medical Equipment Cost — Loan vs Lease After Tax",
    metaDescription: "Free medical equipment cost calculator. Compare a loan with Section 179 and resale against a fair-market-value lease, after taxes.",
    calcInputs: [
      currencyField("price", "Equipment Price", { default: 150000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 8.5, max: 25, step: 0.05 }),
      numberField("termMonths", "Loan / Lease Term (Months)", { default: 60, min: 12, max: 120, step: 6 }),
      currencyField("leasePayment", "Lease Payment per Month", { default: 2900, max: 1000000, step: 10 }),
      currencyField("resaleValue", "Resale Value at the End (If Bought)", { default: 30000, max: 10000000, step: 500, required: false }),
      percentField("taxRatePercent", "Practice Tax Rate", { default: 30, max: 70, step: 1 }),
    ],
    calcResult: { label: "Savings by Buying", format: "currency" },
    calcResults: [
      { key: "loanPayment", label: "Loan Payment", format: "currency" },
      { key: "loanAfterTaxCost", label: "Buy With a Loan — After-Tax Cost", format: "currency" },
      { key: "leaseAfterTaxCost", label: "Lease — After-Tax Cost", format: "currency" },
      { key: "savingsWithLoan", label: "Savings by Buying", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the price and loan terms, a lease quote for the same term, what the equipment should sell for at the end, " +
      "and your practice's tax rate. Buying lets you deduct the whole price up front under Section 179 (subject to its " +
      "annual limit) plus interest; lease payments are deducted as you pay. A negative saving means leasing is cheaper. " +
      "Leasing can make sense for technology that becomes outdated quickly.",
    examples:
      "Example: a $150,000 machine financed at 8.50% over 60 months costs $3,077.48 a month. " +
      "After the Section 179 and interest deductions and selling it for $30,000, buying costs $108,254.15 " +
      "after tax. Leasing at $2,900 a month costs $121,800 after tax, so buying saves $13,545.85.",
    assumptions:
      "No time value of money: the Section 179 deduction arrives in year 1, which makes buying better than shown. " +
      "Assumes the business has enough income to use the deduction and that resale is taxed as ordinary income. Not " +
      "tax advice. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a fair-market-value (FMV) lease?",
        answer: "A lease with lower payments where, at the end, you can return the equipment, renew, or buy it at its market value. A $1 buyout lease is really a purchase.",
      },
    ],
  },
  {
    slug: "medical-equipment-loan-payoff-calculator",
    title: "Medical Equipment Loan Payoff Calculator",
    description: "See how a lump sum and extra monthly payments from practice profits pay off a medical equipment loan sooner and save interest.",
    metaTitle: "Medical Equipment Loan Payoff Calculator",
    metaDescription: "Free medical equipment loan payoff calculator. Add a lump sum and extra payments to see your new payoff time and the interest saved.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 150000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 25, step: 0.05 }),
      numberField("remainingMonths", "Months Left", { default: 48, min: 1, max: 120, step: 1 }),
      currencyField("extraMonthly", "Extra Payment Each Month", { default: 1000, max: 1000000, step: 50, required: false }),
      currencyField("lumpSum", "Lump Sum Now", { default: 20000, max: 10000000, step: 500, required: false }),
    ],
    calcResult: { label: "Months to Payoff", format: "number" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "monthsToPayoff", label: "Months to Payoff", format: "number", highlight: true },
      { key: "monthsSaved", label: "Months Saved", format: "number" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "Enter your balance, rate and months left, plus any lump sum and extra monthly amount. Check the loan for " +
      "prepayment penalties first — some equipment loans charge one, or calculate the payoff with all remaining " +
      "interest included.",
    examples:
      "Example: $150,000 at 8.50% with 48 months left costs $3,697.25 a month. A " +
      "$20,000 lump sum plus $1,000 extra a month clears it in 31 months — 17 " +
      "sooner — saving $12,256.10.",
    assumptions:
      "Fixed rate, simple-interest loan, no prepayment penalty. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should a practice pay off equipment early or keep cash?",
        answer: "Keep enough working capital for payroll and slow insurance payments first. Paying off a loan saves interest but loses the interest deduction on it.",
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
