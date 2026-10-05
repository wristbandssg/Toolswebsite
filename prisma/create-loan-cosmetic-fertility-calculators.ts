// One-time (but safe to re-run) batch setup script: creates the Cosmetic Surgery and Fertility Treatment Loan tools
// (8) of the Loan Calculators expansion 4, filed under Loan Calculators > Personal Loan Calculators.
// See src/lib/calc-engine-loan-cosmetic-fertility.ts for the math and
// src/lib/calc-engine-loan-powersports.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-cosmetic-fertility-calculators.ts
// or
//   npm run db:create-loan-cosmetic-fertility-calculators

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
    slug: "cosmetic-surgery-loan-calculator",
    title: "Cosmetic Surgery Loan Calculator",
    description: "Add up a cosmetic procedure's full price — surgeon, anesthesia, facility and aftercare — subtract your savings, and see the loan and monthly payment.",
    metaTitle: "Cosmetic Surgery Loan Calculator — Full Cost & Payment",
    metaDescription: "Free cosmetic surgery loan calculator. Total the surgeon, anesthesia and facility fees, subtract savings, and see the monthly payment.",
    calcInputs: [
      currencyField("surgeonFee", "Surgeon's Fee", { default: 7000, max: 500000, step: 100 }),
      currencyField("anesthesiaFee", "Anesthesia Fee", { default: 1200, max: 100000, step: 50, required: false }),
      currencyField("facilityFee", "Operating Room / Facility Fee", { default: 1500, max: 100000, step: 50, required: false }),
      currencyField("aftercare", "Garments, Medication & Follow-Up", { default: 500, max: 100000, step: 50, required: false }),
      currencyField("savings", "Savings You'll Use", { default: 2000, max: 500000, step: 100, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 12.9, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 84, step: 6 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalProcedureCost", label: "Total Procedure Cost", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Surgeons often quote only their own fee. Ask for the anesthesia and facility fees too, and budget for " +
      "compression garments, prescriptions and follow-up visits. Enter all of them, the savings you'll put in, and the " +
      "loan's rate and term. Health insurance generally doesn't pay for purely cosmetic procedures.",
    examples:
      "Example: a $7,000 surgeon's fee plus anesthesia, facility and aftercare comes to $10,200. After " +
      "$2,000 of savings, the loan is $8,200: at 12.90% over 36 months that's " +
      "$275.90 a month and $1,732.24 of interest.",
    assumptions:
      "Fixed rate, equal monthly payments. Revision surgery, if needed, usually costs extra. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do people usually pay for cosmetic surgery?",
        answer: "Savings, personal loans, medical credit cards, or financing partners offered by the practice. Compare APRs and watch for deferred-interest promos.",
      },
    ],
  },
  {
    slug: "cosmetic-surgery-loan-payment-calculator",
    title: "Cosmetic Surgery Loan Payment Calculator",
    description: "Check whether a cosmetic surgery loan payment fits your budget: the payment as a share of take-home pay, and the largest loan that stays within your limit.",
    metaTitle: "Cosmetic Surgery Loan Payment Calculator — Budget Check",
    metaDescription: "Free cosmetic surgery payment calculator. See the payment as a share of your take-home pay and the largest loan within your budget.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 8000, max: 500000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 13, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 84, step: 6 }),
      currencyField("takeHomePay", "Monthly Take-Home Pay", { default: 4500, max: 1000000, step: 100 }),
      percentField("maxSharePercent", "Most You Want to Spend on This Payment", { default: 10, max: 100, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "shareOfTakeHomePay", label: "Share of Take-Home Pay", format: "percentage" },
      { key: "maxPaymentAtYourLimit", label: "Payment at Your Limit", format: "currency" },
      { key: "maxLoanAtYourLimit", label: "Largest Loan Within Your Limit", format: "currency" },
    ],
    instructions:
      "Enter the loan, rate and term, your monthly take-home pay, and the most of it you're comfortable spending on " +
      "this payment. For an elective procedure, a modest share keeps room for savings and surprises.",
    examples:
      "Example: $8,000 at 13% over 36 months costs $269.55 a month — " +
      "5.99% of $4,500 take-home pay. Keeping it to 10% ($450) " +
      "allows a loan of up to $13,355.51.",
    assumptions:
      "Fixed rate, equal monthly payments. The share limit is your own choice, not a lender rule. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I wait and save instead of financing?",
        answer: "For an elective procedure, saving for part or all of it means a smaller loan or none, and gives you time to choose a surgeon carefully.",
      },
    ],
  },
  {
    slug: "cosmetic-surgery-loan-cost-calculator",
    title: "Cosmetic Surgery Loan Cost Calculator",
    description: "Compare a deferred-interest medical credit card with a fixed-rate personal loan for cosmetic surgery — and see what happens if the promo isn't paid off.",
    metaTitle: "Cosmetic Surgery Financing Cost — Card vs Loan",
    metaDescription: "Free cosmetic surgery cost calculator. Compare a deferred-interest medical credit card with a personal loan by total interest.",
    calcInputs: [
      currencyField("amount", "Amount to Finance", { default: 9000, max: 500000, step: 100 }),
      numberField("promoMonths", "Card Promo Length (Months)", { default: 12, min: 1, max: 60, step: 1 }),
      currencyField("monthlyPayment", "What You Can Pay Each Month", { default: 600, max: 100000, step: 10 }),
      percentField("cardAprPercent", "Card APR After the Promo", { default: 26.99, max: 40, step: 0.01 }),
      percentField("loanRatePercent", "Personal Loan Rate", { default: 11.9, max: 36, step: 0.05 }),
      numberField("loanTermMonths", "Personal Loan Term (Months)", { default: 18, min: 6, max: 84, step: 6 }),
    ],
    calcResult: { label: "Savings With the Personal Loan", format: "currency" },
    calcResults: [
      { key: "balanceLeftAfterPromo", label: "Card Balance Left When the Promo Ends", format: "currency" },
      { key: "cardTotalInterest", label: "Card — Total Interest", format: "currency" },
      { key: "loanPayment", label: "Loan — Monthly Payment", format: "currency" },
      { key: "loanTotalInterest", label: "Loan — Total Interest", format: "currency" },
      { key: "savingsWithLoan", label: "Savings With the Personal Loan", format: "currency", highlight: true },
    ],
    instructions:
      "Medical credit cards often offer 'no interest if paid in full' promos. If any balance remains when the promo " +
      "ends, interest from the purchase date is added. Enter the amount, promo length, what you can pay each month, " +
      "the card's APR, and a personal loan quote. A negative saving means the card is cheaper — which happens when you " +
      "can clear it within the promo.",
    examples:
      "Example: $9,000 on a 12-month card paying $600 a month leaves $1,800 " +
      "when the promo ends, so deferred interest kicks in — $1,806.60 of interest in total. A personal loan at " +
      "11.90% over 18 months costs $548.42 a month and $871.57 — saving " +
      "$935.03.",
    assumptions:
      "Deferred interest is estimated on the declining balance at the card APR, added when the promo ends, then repaid " +
      "at the same monthly amount. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's deferred interest?",
        answer: "Interest that's tracked during a promo and charged in full — back to day one — if the balance isn't paid off by the deadline.",
      },
    ],
  },
  {
    slug: "cosmetic-surgery-loan-payoff-calculator",
    title: "Cosmetic Surgery Loan Payoff Calculator",
    description: "See how adding extra each month pays off your cosmetic surgery loan sooner and how much interest you save.",
    metaTitle: "Cosmetic Surgery Loan Payoff Calculator",
    metaDescription: "Free cosmetic surgery loan payoff calculator. Add an extra amount each month and see your new payoff time and interest saved.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 9000, max: 500000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 14, max: 36, step: 0.05 }),
      numberField("remainingMonths", "Months Left", { default: 48, min: 1, max: 120, step: 1 }),
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
      "Enter your balance, rate, months left and an extra monthly amount. Extra payments go to principal, so the loan " +
      "ends sooner and costs less.",
    examples:
      "Example: $9,000 at 14% with 48 months left costs $245.94 a month. " +
      "Paying $345.94 clears it in 32 months — 16 sooner — saving $1,016.63.",
    assumptions:
      "Fixed rate, no prepayment penalty. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I refinance a cosmetic surgery loan?",
        answer: "Yes — if your credit has improved, a new personal loan at a lower rate can replace it. Watch for origination fees.",
      },
    ],
  },
  {
    slug: "fertility-treatment-loan-calculator",
    title: "Fertility Treatment Loan Calculator",
    description: "Estimate the cost of IVF or other fertility treatment over several cycles, including medication, subtract insurance and savings, and see the monthly payment.",
    metaTitle: "Fertility Treatment Loan Calculator — IVF Cost & Payment",
    metaDescription: "Free fertility treatment loan calculator. Estimate IVF cycles and medication, subtract insurance and savings, and see the payment.",
    calcInputs: [
      numberField("cycles", "Number of Treatment Cycles", { default: 2, min: 1, max: 10, step: 1 }),
      currencyField("costPerCycle", "Clinic Cost per Cycle", { default: 15000, max: 200000, step: 500 }),
      currencyField("medicationPerCycle", "Medication per Cycle", { default: 5000, max: 50000, step: 100, required: false }),
      currencyField("insuranceCoverage", "Insurance Coverage", { default: 0, max: 1000000, step: 500, required: false }),
      currencyField("savings", "Savings You'll Use", { default: 5000, max: 1000000, step: 500, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 120, step: 6 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalTreatmentCost", label: "Total Treatment Cost", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Many people need more than one IVF cycle. Enter how many you want to plan for, the clinic's cost per cycle " +
      "(retrieval, lab, transfer and monitoring), medication, any insurance coverage, and your savings. Some states " +
      "require insurers to cover fertility treatment — check your plan.",
    examples:
      "Example: 2 cycles at $15,000 plus $5,000 of medication each cost $40,000. " +
      "After $5,000 of savings, the loan is $35,000: at 11% over 60 months that's " +
      "$760.98 a month and $10,659.09 of interest.",
    assumptions:
      "Costs are estimates — genetic testing, embryo storage and frozen transfers add more. Fixed rate. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are fertility treatment costs tax-deductible?",
        answer: "IVF and related costs can count as medical expenses, which are deductible if you itemize and they exceed 7.5% of your adjusted gross income.",
      },
    ],
  },
  {
    slug: "fertility-treatment-loan-payment-calculator",
    title: "Fertility Treatment Loan Payment Calculator",
    description: "Financing IVF one cycle at a time? See the payment after the first cycle, how it doubles if you need a second, and the total interest.",
    metaTitle: "Fertility Loan Payment Calculator — Cycle by Cycle",
    metaDescription: "Free fertility treatment payment calculator. See the payment after one IVF cycle, after two, and the total interest on both loans.",
    calcInputs: [
      currencyField("costPerCycle", "Cost per Cycle (Including Medication)", { default: 20000, max: 200000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 120, step: 6 }),
      numberField("monthsBetween", "Months Between Cycles", { default: 6, min: 0, max: 60, step: 1 }),
    ],
    calcResult: { label: "Payment After Cycle 1", format: "currency" },
    calcResults: [
      { key: "paymentAfterCycle1", label: "Payment After Cycle 1", format: "currency", highlight: true },
      { key: "paymentAfterCycle2", label: "Payment After Cycle 2 (Both Loans)", format: "currency" },
      { key: "monthsWithBothPayments", label: "Months Paying Both Loans", format: "number" },
      { key: "totalInterestTwoCycles", label: "Total Interest for Two Cycles", format: "currency" },
    ],
    instructions:
      "Borrowing for each cycle only when you need it avoids paying interest on money you may not use. Enter the cost " +
      "of one cycle, the rate and term, and the gap between cycles. Make sure you could carry the second payment too " +
      "before starting.",
    examples:
      "Example: a $20,000 cycle financed at 11% over 60 months costs $434.85 " +
      "a month. If a second cycle follows 6 months later on the same terms, payments rise to " +
      "$869.70 for 54 months. Two cycles cost $12,181.82 of interest.",
    assumptions:
      "Both cycles are financed on the same terms with separate loans. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get one loan for several IVF cycles?",
        answer: "Some fertility lenders offer a credit line or a loan sized for multiple cycles, so you only draw what you use. Compare that with separate loans.",
      },
    ],
  },
  {
    slug: "fertility-treatment-loan-cost-calculator",
    title: "Fertility Treatment Loan Cost Calculator",
    description: "Compare a fertility clinic's multi-cycle IVF package with paying per cycle — with and without financing — and see how many cycles it takes to break even.",
    metaTitle: "IVF Package vs Per-Cycle Cost Calculator",
    metaDescription: "Free fertility treatment cost calculator. Compare a multi-cycle IVF package with paying per cycle, including financing, and the break-even.",
    calcInputs: [
      currencyField("packagePrice", "Multi-Cycle Package Price", { default: 45000, max: 500000, step: 500 }),
      currencyField("costPerCycle", "Cost per Cycle if Paid Separately", { default: 20000, max: 200000, step: 500 }),
      numberField("expectedCycles", "Cycles You Expect to Need", { default: 2, min: 0, max: 10, step: 0.5 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 11, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 120, step: 6 }),
    ],
    calcResult: { label: "Savings With the Package", format: "currency" },
    calcResults: [
      { key: "payPerCycleTotal", label: "Pay-per-Cycle Total", format: "currency" },
      { key: "packageTotal", label: "Package Price", format: "currency" },
      { key: "savingsWithPackage", label: "Savings With the Package", format: "currency", highlight: true },
      { key: "financedSavingsWithPackage", label: "Savings With the Package (Financed)", format: "currency" },
      { key: "breakEvenCycles", label: "Cycles Needed to Break Even", format: "number" },
    ],
    instructions:
      "Many clinics sell packages of two or three cycles at a discount, and some 'shared-risk' programs refund part of " +
      "the price if treatment doesn't succeed. Enter the package price, the per-cycle price and how many cycles you " +
      "realistically expect (your doctor can help). A negative saving means paying per cycle is cheaper.",
    examples:
      "Example: needing 2 cycles at $20,000 each costs $40,000, vs $45,000 for " +
      "the package. The package costs $5,000 more unless you need more than 2.25 cycles; " +
      "financed at 11%, the gap is $6,522.73.",
    assumptions:
      "Refunds from shared-risk programs aren't included — if your package has one, the package looks better than " +
      "shown. Both options financed on the same terms for the financed line. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a shared-risk IVF program?",
        answer: "You pay a set price upfront for several cycles; if you don't have a baby, you get a large part back. Eligibility often depends on age and diagnosis.",
      },
    ],
  },
  {
    slug: "fertility-treatment-loan-payoff-calculator",
    title: "Fertility Treatment Loan Payoff Calculator",
    description: "See how a tax refund or other lump sum, plus a little extra each month, shortens your fertility treatment loan and saves interest.",
    metaTitle: "Fertility Treatment Loan Payoff Calculator",
    metaDescription: "Free fertility treatment loan payoff calculator. Add a lump sum and extra monthly payments to see your new payoff time and interest saved.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 30000, max: 1000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 36, step: 0.05 }),
      numberField("remainingMonths", "Months Left", { default: 60, min: 1, max: 120, step: 1 }),
      currencyField("extraMonthly", "Extra Payment Each Month", { default: 100, max: 10000, step: 5, required: false }),
      currencyField("lumpSum", "Lump Sum Now (e.g. Tax Refund)", { default: 3000, max: 1000000, step: 100, required: false }),
    ],
    calcResult: { label: "Months to Payoff", format: "number" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "monthsToPayoff", label: "Months to Payoff", format: "number", highlight: true },
      { key: "monthsSaved", label: "Months Saved", format: "number" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "If treatment costs pushed your medical expenses above 7.5% of your income, itemizing may bring a bigger tax " +
      "refund. Enter your balance, rate and months left, a lump sum you can put toward the loan, and any extra monthly " +
      "amount.",
    examples:
      "Example: $30,000 at 11% with 60 months left costs $652.27 a month. A " +
      "$3,000 lump sum plus $100 extra a month clears it in 44 months — 16 " +
      "sooner — saving $3,242.22.",
    assumptions:
      "Fixed rate, no prepayment penalty; the lump sum is paid today. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I use an HSA or FSA for fertility treatment?",
        answer: "Generally yes — IVF and fertility medication are usually eligible medical expenses, which can reduce what you need to borrow.",
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
