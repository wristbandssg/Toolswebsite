// One-time (but safe to re-run) batch setup script: creates the Personal Loan tools
// (6) of the Loan Calculators expansion 5, filed under Loan Calculators > Personal Loan Calculators.
// See src/lib/calc-engine-loan-personal-core.ts for the math and
// src/lib/calc-engine-loan-startup-business.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-personal-core-calculators.ts
// or
//   npm run db:create-loan-personal-core-calculators

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
    slug: "personal-loan-payment-calculator",
    title: "Personal Loan Payment Calculator",
    description: "See your personal loan's monthly payment and total interest at 3, 4 and 5 years side by side, to pick the term that fits your budget.",
    metaTitle: "Personal Loan Payment Calculator — 36, 48 or 60 Months",
    metaDescription: "Free personal loan payment calculator. Compare monthly payments and total interest for 36, 48 and 60-month unsecured personal loans.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 200000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 36, step: 0.05 }),
    ],
    calcResult: { label: "Payment — 36 Months", format: "currency" },
    calcResults: [
      { key: "payment36", label: "Payment — 36 Months", format: "currency", highlight: true },
      { key: "payment48", label: "Payment — 48 Months", format: "currency" },
      { key: "payment60", label: "Payment — 60 Months", format: "currency" },
      { key: "interest36", label: "Total Interest — 36 Months", format: "currency" },
      { key: "interest48", label: "Total Interest — 48 Months", format: "currency" },
      { key: "interest60", label: "Total Interest — 60 Months", format: "currency" },
    ],
    instructions:
      "Enter the amount and your rate. Most unsecured personal loans run 2–7 years; a longer term lowers the payment " +
      "but adds interest, and lenders often charge a slightly higher rate for longer terms.",
    examples:
      "Example: $15,000 at 12% costs $498.21 a month over 36 months ($2,935.73 of interest), " +
      "$395.01 over 48 ($3,960.36), or $333.67 over 60 ($5,020).",
    assumptions:
      "The same rate for every term; fixed rate and equal monthly payments; origination fees not included. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a good term for a personal loan?",
        answer: "The shortest one whose payment fits comfortably in your budget — it costs the least interest. You can usually prepay without a penalty if money frees up.",
      },
    ],
  },
  {
    slug: "personal-loan-interest-calculator",
    title: "Personal Loan Interest Calculator",
    description: "Calculate the interest on a personal loan at your rate — first-year and total — and how much less you'd pay with excellent credit.",
    metaTitle: "Personal Loan Interest Calculator — What Credit Costs",
    metaDescription: "Free personal loan interest calculator. See year-one and total interest at your rate and the extra cost compared with excellent credit.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 200000, step: 100 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 6, max: 84, step: 6 }),
      percentField("yourRatePercent", "Your Rate", { default: 18, max: 36, step: 0.05 }),
      percentField("excellentRatePercent", "Rate With Excellent Credit", { default: 10, max: 36, step: 0.05 }),
    ],
    calcResult: { label: "Total Interest at Your Rate", format: "currency" },
    calcResults: [
      { key: "interestFirstYear", label: "Interest in Year 1", format: "currency" },
      { key: "totalInterestYourRate", label: "Total Interest at Your Rate", format: "currency", highlight: true },
      { key: "totalInterestExcellentCredit", label: "Total Interest With Excellent Credit", format: "currency" },
      { key: "extraCostOfYourCredit", label: "Extra Cost of Your Credit", format: "currency" },
    ],
    instructions:
      "Personal loan rates depend heavily on your credit score. Enter the loan, term, your quoted rate, and a rate " +
      "for excellent credit (check lenders' advertised lowest rates). The difference shows what improving your credit " +
      "— or adding a creditworthy co-borrower — could save.",
    examples:
      "Example: $15,000 over 60 months at 18% costs $2,537.67 of interest in year 1 " +
      "and $7,854.08 in total. At 10% it would be $4,122.34 — " +
      "your credit costs $3,731.74 more.",
    assumptions:
      "Fixed rates and equal monthly payments; fees not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is personal loan interest calculated?",
        answer: "Most use simple interest on the remaining balance, charged monthly — so early payments are mostly interest and later ones mostly principal.",
      },
    ],
  },
  {
    slug: "personal-loan-affordability-calculator",
    title: "Personal Loan Affordability Calculator",
    description: "Start from the monthly payment you can afford and find the largest personal loan it supports — and the cash you'd actually get after the origination fee.",
    metaTitle: "Personal Loan Affordability Calculator — From Your Budget",
    metaDescription: "Free personal loan affordability calculator. Turn the payment you can afford into a max loan and the cash you'd receive after fees.",
    calcInputs: [
      currencyField("monthlyBudget", "Monthly Payment You Can Afford", { default: 400, max: 10000, step: 10 }),
      percentField("annualRatePercent", "Interest Rate", { default: 14, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 84, step: 6 }),
      percentField("originationFeePercent", "Origination Fee", { default: 5, max: 12, step: 0.25, required: false }),
    ],
    calcResult: { label: "Maximum Loan Amount", format: "currency" },
    calcResults: [
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency", highlight: true },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "cashYouReceive", label: "Cash You'd Receive", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Rather than asking how much a lender will approve, start with what your budget can handle. Enter that payment, " +
      "the rate you expect, the term and any origination fee (often 1%–10%, taken from the loan).",
    examples:
      "Example: $400 a month at 14% over 48 months repays a loan of $14,637.82. A " +
      "5% fee of $731.89 leaves you $13,905.93; interest totals $4,562.18.",
    assumptions:
      "Fixed rate, equal payments; fee deducted from the proceeds. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much of my income should go to a personal loan?",
        answer: "Lenders often cap all debt payments at around 36%–40% of gross income, but a lower share leaves more room for savings and emergencies.",
      },
    ],
  },
  {
    slug: "personal-loan-eligibility-calculator",
    title: "Personal Loan Eligibility Calculator",
    description: "Prequalify for a personal loan: check your credit score, debt-to-income ratio with the new payment, income and time at your job against typical lender rules.",
    metaTitle: "Personal Loan Eligibility & Prequalification Calculator",
    metaDescription: "Free personal loan eligibility calculator. Check credit score, DTI with the new payment, income and employment against typical lender rules.",
    calcInputs: [
      currencyField("annualIncome", "Gross Annual Income", { default: 60000, max: 10000000, step: 1000 }),
      currencyField("monthlyDebts", "Existing Monthly Debt Payments", { default: 800, max: 100000, step: 10, required: false }),
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 200000, step: 100 }),
      percentField("annualRatePercent", "Expected Interest Rate", { default: 14, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 84, step: 6 }),
      numberField("creditScore", "Your Credit Score", { default: 670, min: 300, max: 850, step: 1 }),
      numberField("monthsEmployed", "Months at Current Job", { default: 24, min: 0, max: 600, step: 1 }),
    ],
    calcResult: { label: "Checks Passed (of 4)", format: "number" },
    calcResults: [
      { key: "monthlyPayment", label: "New Monthly Payment", format: "currency" },
      { key: "dtiWithLoan", label: "Debt-to-Income With the Loan", format: "percentage" },
      { key: "maxPaymentAt40Dti", label: "Maximum Payment at a 40% DTI", format: "currency" },
      { key: "checksPassed", label: "Checks Passed (of 4)", format: "number", highlight: true },
    ],
    instructions:
      "Enter your income, current debt payments, the loan you want, and your credit and job history. The four checks " +
      "are common lender screens: a score of 640+; DTI of 40% or less with the new payment; income of at least " +
      "$25,000; and a year or more at your job. Many lenders let you prequalify with a soft credit check.",
    examples:
      "Example: with $60,000 of income and $800 of debt payments, a $15,000 loan at " +
      "14% over 48 months adds $409.90, for a DTI of 24.20%. With a " +
      "670 score and 24 months at your job, 4 of 4 checks pass.",
    assumptions:
      "Typical guidelines only; lenders set their own minimums and also consider credit history and recent " +
      "inquiries. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does prequalifying hurt my credit score?",
        answer: "No — prequalification usually uses a soft inquiry. Only a full application triggers a hard inquiry.",
      },
    ],
  },
  {
    slug: "personal-loan-amortization-calculator",
    title: "Personal Loan Amortization Calculator",
    description: "Look up any month of a personal loan: how much of that payment is interest and principal, the balance left, and the interest paid so far.",
    metaTitle: "Personal Loan Amortization Calculator — Any Month",
    metaDescription: "Free personal loan amortization calculator. See any month's interest and principal split, the remaining balance and interest paid so far.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 20000, max: 200000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 13, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 6, max: 84, step: 6 }),
      numberField("monthNumber", "Month to Show", { default: 24, min: 1, max: 84, step: 1 }),
    ],
    calcResult: { label: "Balance After That Month", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "interestThatMonth", label: "Interest That Month", format: "currency" },
      { key: "principalThatMonth", label: "Principal That Month", format: "currency" },
      { key: "balanceAfterMonth", label: "Balance After That Month", format: "currency", highlight: true },
      { key: "interestPaidSoFar", label: "Interest Paid So Far", format: "currency" },
    ],
    instructions:
      "Enter the loan, rate and term, then pick a month — for example the month you'd like to pay it off or refinance. " +
      "The balance shown is roughly your payoff amount then.",
    examples:
      "Example: a $20,000 loan at 13% over 60 months costs $455.06 a month. In " +
      "month 24, $149.62 goes to interest and $305.44 to principal, leaving " +
      "$13,505.73. Interest paid so far: $4,427.21.",
    assumptions:
      "Fixed rate, payments on time, interest charged monthly. Daily-interest loans differ slightly. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is so much of my early payment interest?",
        answer: "Interest is charged on the balance, which is highest at the start. As you pay it down, more of each payment goes to principal.",
      },
    ],
  },
  {
    slug: "personal-loan-total-cost-calculator",
    title: "Personal Loan Total Cost Calculator",
    description: "Add up the full cost of a personal loan — interest, the origination fee and any optional credit insurance — and the cost per dollar you actually receive.",
    metaTitle: "Personal Loan Total Cost Calculator — Fees & Interest",
    metaDescription: "Free personal loan total cost calculator. Add interest, origination fee and optional insurance to see the full cost per dollar received.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 20000, max: 200000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 13, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 6, max: 84, step: 6 }),
      percentField("originationFeePercent", "Origination Fee", { default: 6, max: 12, step: 0.25, required: false }),
      currencyField("insurancePerMonth", "Optional Credit Insurance per Month", { default: 0, max: 1000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Cost of Borrowing", format: "currency" },
    calcResults: [
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "insuranceCost", label: "Credit Insurance", format: "currency" },
      { key: "totalCostOfBorrowing", label: "Total Cost of Borrowing", format: "currency", highlight: true },
      { key: "costPerDollarReceived", label: "Cost per $1 You Receive", format: "currency", decimals: 3 },
    ],
    instructions:
      "Enter the loan, rate, term, origination fee and any optional credit life or disability insurance the lender " +
      "offers. The cost per dollar uses the cash you actually receive after the fee, which is the fair way to compare " +
      "offers.",
    examples:
      "Example: a $20,000 loan at 13% over 60 months costs $7,303.69 of interest, " +
      "and a 6% fee adds $1,200. Total cost: $8,503.69 — $0.45 " +
      "for every dollar you actually receive.",
    assumptions:
      "Fixed rate, held to term; late fees not included. Credit insurance is optional and you can usually decline it. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I avoid personal loan origination fees?",
        answer: "Yes — many banks and credit unions charge none, especially for borrowers with good credit. Compare APRs, which include the fee.",
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
