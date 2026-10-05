// One-time (but safe to re-run) batch setup script: creates the Green Energy Loan tools
// (7) of the Loan Calculators expansion 5, filed under Loan Calculators > Home Improvement Loan Calculators.
// See src/lib/calc-engine-loan-green-energy.ts for the math and
// src/lib/calc-engine-loan-startup-business.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-green-energy-calculators.ts
// or
//   npm run db:create-loan-green-energy-calculators

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
    slug: "green-energy-loan-calculator",
    title: "Green Energy Loan Calculator",
    description: "Finance a heat pump, insulation, new windows or other energy-efficiency upgrade: loan after rebates, monthly payment, and the net cost after energy savings.",
    metaTitle: "Green Energy Loan Calculator — Payment vs Savings",
    metaDescription: "Free green energy loan calculator. See the loan after rebates, the monthly payment, and your net monthly cost after energy savings.",
    calcInputs: [
      currencyField("projectCost", "Project Cost (Installed)", { default: 18000, max: 1000000, step: 100 }),
      currencyField("rebates", "Utility & State Rebates", { default: 2000, max: 1000000, step: 100, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.99, max: 30, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 120, min: 12, max: 240, step: 12 }),
      currencyField("annualEnergySavings", "Expected Energy Savings per Year", { default: 1500, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Net Monthly Cost After Savings", format: "currency" },
    calcResults: [
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "monthlyEnergySavings", label: "Monthly Energy Savings", format: "currency" },
      { key: "netMonthlyCost", label: "Net Monthly Cost After Savings", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the installed cost, any rebates from your utility or state, the loan's rate and term, and the energy " +
      "savings your contractor or an energy audit estimates. A negative net cost means the savings more than cover " +
      "the payment. For solar panels, see the solar panel loan calculators.",
    examples:
      "Example: an $18,000 heat pump and insulation project less $2,000 of rebates needs a $16,000 loan. At " +
      "7.99% over 120 months the payment is $194.04; with $125 a month " +
      "of savings, the net cost is $69.04 a month.",
    assumptions:
      "Savings are estimates and vary with weather and energy prices. The federal 25C efficiency credit ended for " +
      "upgrades placed in service after 2025. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What counts as a green energy upgrade?",
        answer: "Heat pumps, high-efficiency furnaces and water heaters, insulation and air sealing, efficient windows and doors, smart thermostats, and EV chargers, among others.",
      },
    ],
  },
  {
    slug: "green-energy-loan-payment-calculator",
    title: "Green Energy Loan Payment Calculator",
    description: "Compare the loan payment for an energy upgrade with the monthly energy savings — and find the loan term at which the savings fully cover the payment.",
    metaTitle: "Green Energy Loan Payment — Term for Savings to Cover It",
    metaDescription: "Free green energy loan payment calculator. Compare the payment with monthly savings and find the term where savings cover the payment.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.99, max: 30, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 84, min: 12, max: 240, step: 12 }),
      currencyField("monthlySavings", "Monthly Energy Savings", { default: 140, max: 10000, step: 5 }),
    ],
    calcResult: { label: "Monthly Cash Flow", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "monthlySavings", label: "Monthly Energy Savings", format: "currency" },
      { key: "monthlyCashFlow", label: "Monthly Cash Flow", format: "currency", highlight: true },
      { key: "termForSavingsToCoverPayment", label: "Term Where Savings Cover the Payment (Months)", format: "number" },
    ],
    instructions:
      "Enter the loan, rate, term and your expected monthly savings. A negative cash flow means you pay more each month " +
      "than you save while the loan runs. The last line shows the term at which savings would cover the whole payment " +
      "(600 means they never would at this rate).",
    examples:
      "Example: $15,000 at 7.99% over 84 months costs $233.72 a month against " +
      "$140 of savings — a cash flow of -$93.72. A term of 189 months " +
      "would let savings cover the payment.",
    assumptions:
      "Savings stay the same each month; in practice they vary by season. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I pick the term where savings cover the payment?",
        answer: "It keeps your budget neutral, but a longer term costs more interest. If you can afford a bit more each month, a shorter term saves money overall.",
      },
    ],
  },
  {
    slug: "green-energy-loan-payoff-calculator",
    title: "Green Energy Loan Payoff Calculator",
    description: "Put the money your upgrade saves on energy bills toward the loan each month, and see how much sooner it's paid off and the interest saved.",
    metaTitle: "Green Energy Loan Payoff Calculator — Use Your Savings",
    metaDescription: "Free green energy loan payoff calculator. Add your monthly energy savings to the payment and see your new payoff time and interest saved.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 15000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.99, max: 30, step: 0.05 }),
      numberField("remainingMonths", "Months Left", { default: 120, min: 1, max: 240, step: 1 }),
      currencyField("monthlySavings", "Energy Savings Added Each Month", { default: 125, max: 10000, step: 5 }),
    ],
    calcResult: { label: "Months to Payoff", format: "number" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "paymentWithSavings", label: "Payment With Savings Added", format: "currency" },
      { key: "monthsToPayoff", label: "Months to Payoff", format: "number", highlight: true },
      { key: "monthsSaved", label: "Months Saved", format: "number" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "If your bills drop after the upgrade, sending the difference to the loan keeps your budget the same as before " +
      "while clearing the debt much sooner. Enter your balance, rate, months left and the monthly savings.",
    examples:
      "Example: $15,000 at 7.99% with 120 months left costs $181.91 a month. Adding " +
      "$125 of energy savings ($306.91 a month) clears it in 60 months — " +
      "60 sooner — saving $3,623.20.",
    assumptions:
      "Fixed rate, no prepayment penalty; savings steady. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I measure my actual energy savings?",
        answer: "Compare usage (kWh, therms) on bills for the same months before and after, which removes the effect of price changes.",
      },
    ],
  },
  {
    slug: "green-energy-loan-interest-calculator",
    title: "Green Energy Loan Interest Calculator",
    description: "Weigh the interest on a green energy loan against the energy savings over the equipment's life, with rising energy prices, to see the net lifetime benefit.",
    metaTitle: "Green Energy Loan Interest vs Lifetime Savings",
    metaDescription: "Free green energy loan interest calculator. Compare loan interest and cost with lifetime energy savings and see the net benefit.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 16000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.99, max: 30, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 120, min: 12, max: 240, step: 12 }),
      currencyField("annualSavings", "Energy Savings in Year 1", { default: 1500, max: 100000, step: 50 }),
      numberField("lifeYears", "Equipment Life (Years)", { default: 15, min: 1, max: 40, step: 1 }),
      percentField("energyInflationPercent", "Energy Price Rise per Year", { default: 3, min: -5, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Net Lifetime Benefit", format: "currency" },
    calcResults: [
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCostWithInterest", label: "Total Cost With Interest", format: "currency" },
      { key: "lifetimeEnergySavings", label: "Lifetime Energy Savings", format: "currency" },
      { key: "netLifetimeBenefit", label: "Net Lifetime Benefit", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan, its rate and term, the first-year savings, how long the equipment should last (heat pumps " +
      "often 12–20 years, insulation much longer), and how fast you expect energy prices to rise.",
    examples:
      "Example: a $16,000 loan at 7.99% over 120 months costs $7,284.75 of interest — " +
      "$23,284.75 in all. Savings of $1,500 a year rising 3% a year add up to " +
      "$27,898.37 over 15 years, a net benefit of $4,613.62.",
    assumptions:
      "No discounting of future savings; maintenance and replacement parts not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which upgrades pay back fastest?",
        answer: "Air sealing and insulation usually pay back quickest; heat pumps pay back fastest when replacing oil, propane or electric resistance heat.",
      },
    ],
  },
  {
    slug: "green-energy-loan-affordability-calculator",
    title: "Green Energy Loan Affordability Calculator",
    description: "Find how big an energy upgrade you can finance when the energy savings help pay the loan, plus what you're willing to add from your budget.",
    metaTitle: "Green Energy Loan Affordability Calculator",
    metaDescription: "Free green energy loan affordability calculator. Combine your budget and energy savings to find the largest upgrade you can finance.",
    calcInputs: [
      currencyField("netBudget", "Extra You're Willing to Pay Each Month", { default: 50, max: 10000, step: 5, required: false }),
      currencyField("monthlySavings", "Expected Monthly Energy Savings", { default: 120, max: 10000, step: 5 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.99, max: 30, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 120, min: 12, max: 240, step: 12 }),
      currencyField("rebates", "Rebates You Expect", { default: 2000, max: 1000000, step: 100, required: false }),
    ],
    calcResult: { label: "Maximum Project Cost", format: "currency" },
    calcResults: [
      { key: "maxMonthlyPayment", label: "Maximum Monthly Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency" },
      { key: "maxProjectCost", label: "Maximum Project Cost", format: "currency", highlight: true },
    ],
    instructions:
      "Your payment can be covered partly by lower energy bills. Enter the savings you expect, the extra you'd pay " +
      "from your budget, the rate and term, and rebates. The result is the project size that keeps your monthly costs " +
      "where you want them.",
    examples:
      "Example: $120 of savings plus $50 from your budget allows a $170 payment. At " +
      "7.99% over 120 months that's a $14,017.76 loan; with $2,000 of rebates, a project of " +
      "up to $16,017.76.",
    assumptions:
      "Savings estimates may not be met; leave some margin. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I get a reliable savings estimate?",
        answer: "A home energy audit (often discounted by utilities) measures leaks and equipment efficiency and estimates savings for each upgrade.",
      },
    ],
  },
  {
    slug: "green-energy-loan-comparison-calculator",
    title: "Green Energy Loan Comparison Calculator",
    description: "Compare an energy-efficiency loan with PACE financing, which is repaid through your property tax bill over a longer term with upfront fees.",
    metaTitle: "Green Energy Loan vs PACE Financing Calculator",
    metaDescription: "Free green energy loan comparison calculator. Compare an energy loan with PACE financing by payment and total cost.",
    calcInputs: [
      currencyField("amount", "Project Amount to Finance", { default: 20000, max: 1000000, step: 100 }),
      percentField("loanRatePercent", "Energy Loan Rate", { default: 7.99, max: 30, step: 0.05 }),
      numberField("loanTermYears", "Energy Loan Term (Years)", { default: 10, min: 1, max: 25, step: 1 }),
      percentField("paceRatePercent", "PACE Rate", { default: 8.5, max: 20, step: 0.05 }),
      numberField("paceTermYears", "PACE Term (Years)", { default: 20, min: 1, max: 30, step: 1 }),
      percentField("paceFeesPercent", "PACE Fees Added", { default: 5, max: 15, step: 0.25, required: false }),
    ],
    calcResult: { label: "Savings With the Energy Loan", format: "currency" },
    calcResults: [
      { key: "loanMonthlyPayment", label: "Energy Loan — Monthly Payment", format: "currency" },
      { key: "paceAnnualAssessment", label: "PACE — Yearly Tax Assessment", format: "currency" },
      { key: "loanTotalCost", label: "Energy Loan — Total Cost", format: "currency" },
      { key: "paceTotalCost", label: "PACE — Total Cost", format: "currency" },
      { key: "savingsWithLoan", label: "Savings With the Energy Loan", format: "currency", highlight: true },
    ],
    instructions:
      "PACE (Property Assessed Clean Energy) programs pay for upgrades and add a yearly assessment to your property " +
      "tax bill. They're easy to qualify for, but terms are long and fees add up, and the assessment stays with the " +
      "house — which can complicate a sale or refinance. Enter each option's terms.",
    examples:
      "Example: $20,000 on a 7.99% energy loan over 10 years costs $242.55 a month " +
      "and $9,105.94 in interest. PACE at 8.50% over 20 years with 5% of fees " +
      "costs $2,219.09 a year and $24,381.81 — the loan saves $15,275.87.",
    assumptions:
      "PACE repaid in equal yearly assessments; no discounting. PACE availability and consumer protections vary by " +
      "state. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can PACE financing make it hard to sell my home?",
        answer: "It can — some mortgage lenders require PACE assessments to be paid off before they'll finance the purchase or a refinance.",
      },
    ],
  },
  {
    slug: "green-energy-loan-eligibility-calculator",
    title: "Green Energy Loan Eligibility Calculator",
    description: "Check the common requirements for an energy-efficiency loan: credit score, debt-to-income with the new payment, and owning the home.",
    metaTitle: "Green Energy Loan Eligibility Calculator",
    metaDescription: "Free green energy loan eligibility calculator. Check credit score, DTI with the new payment and homeownership for an energy upgrade loan.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.99, max: 30, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 120, min: 12, max: 240, step: 12 }),
      currencyField("monthlyIncome", "Gross Monthly Income", { default: 6000, max: 1000000, step: 50 }),
      currencyField("monthlyDebts", "Existing Monthly Debt Payments (Incl. Mortgage)", { default: 2000, max: 100000, step: 10, required: false }),
      numberField("creditScore", "Your Credit Score", { default: 680, min: 300, max: 850, step: 1 }),
      {
        key: "homeowner", label: "Do You Own the Home?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
    ],
    calcResult: { label: "Checks Passed (of 3)", format: "number" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "dtiWithLoan", label: "Debt-to-Income With the Loan", format: "percentage" },
      { key: "checksPassed", label: "Checks Passed (of 3)", format: "number", highlight: true },
    ],
    instructions:
      "Enter the loan, your income and debts, your score, and whether you own the home. The three checks: a score of " +
      "640+; DTI of 45% or less including the new payment; and home ownership, which most energy upgrade loans " +
      "require. Some utility and green bank programs accept lower scores.",
    examples:
      "Example: a $15,000 loan at 7.99% over 120 months costs $181.91, bringing DTI to " +
      "36.37%. With a 680 score as a homeowner, 3 of 3 checks pass.",
    assumptions:
      "Typical guidelines; lenders and programs vary. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Where can I find low-rate green energy loans?",
        answer: "Utility on-bill financing, state green banks, credit unions with energy loan programs, and manufacturer or contractor financing.",
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
