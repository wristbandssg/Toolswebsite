// One-time (but safe to re-run) batch setup script: creates the BNPL, Layaway & Loan Shark tools
// (3) of the Interest Calculators expansion, filed under Loan Calculators > Short-Term & High-Cost Loan Calculators.
// See src/lib/calc-engine-loan-bnpl-layaway.ts for the math and
// src/lib/calc-engine-interest-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-bnpl-layaway-calculators.ts
// or
//   npm run db:create-loan-bnpl-layaway-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "loan-calculators";
const CATEGORY = { name: "Short-Term & High-Cost Loan Calculators", slug: "short-term-loan-calculators" };

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
    slug: "loan-shark-interest-comparison-calculator",
    title: "Loan Shark Interest Comparison Calculator",
    description: "See how much an illegal loan shark's weekly interest really costs as an APR, and how much you'd save with a legal small loan such as a credit union payday alternative loan.",
    metaTitle: "Loan Shark Interest Calculator — True Cost vs Legal Loan",
    metaDescription: "Free loan shark interest calculator. Turn weekly interest into an APR and compare the total cost with a legal small loan from a credit union.",
    calcInputs: [
      currencyField("amount", "Amount Borrowed", { default: 500, max: 100000, step: 50 }),
      percentField("weeklyRatePercent", "Weekly Interest Charged", { default: 20, max: 100, step: 1 }),
      numberField("weeks", "Weeks Until Repaid", { default: 8, min: 1, max: 104, step: 1 }),
      percentField("legalAprPercent", "Legal Loan APR", { default: 28, max: 100, step: 0.5 }),
      numberField("legalTermMonths", "Legal Loan Term (Months)", { default: 6, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Money Saved With a Legal Loan", format: "currency" },
    calcResults: [
      { key: "sharkWeeklyInterest", label: "Interest per Week", format: "currency" },
      { key: "sharkTotalInterest", label: "Total Interest (Loan Shark)", format: "currency" },
      { key: "sharkTotalRepaid", label: "Total Repaid (Loan Shark)", format: "currency" },
      { key: "sharkApr", label: "Loan Shark APR", format: "percentage" },
      { key: "legalLoanPayment", label: "Legal Loan Monthly Payment", format: "currency" },
      { key: "legalLoanInterest", label: "Legal Loan Interest", format: "currency" },
      { key: "moneySavedWithLegalLoan", label: "Money Saved With a Legal Loan", format: "currency", highlight: true },
    ],
    instructions:
      "Loan sharks are unlicensed lenders who charge extreme interest — often a percentage every week on the full amount — " +
      "and may use threats to collect. Weekly charges that sound small add up to APRs in the hundreds or thousands of " +
      "percent, and the debt often never shrinks.\n\n" +
      "Enter what you were offered and compare it with a legal option. Federal credit unions offer payday alternative loans " +
      "(PALs) of $200–$2,000 at no more than 28% APR. If you're being threatened, contact the police or, in the UK, the Stop " +
      "Loan Sharks team.",
    examples:
      "Example: borrowing $500 at 20% a week costs $100 every week — $800 " +
      "over 8 weeks, an APR of 1,040%. A legal 6-month loan at 28% costs " +
      "$90.27 a month and only $41.62 of interest — saving $758.38.",
    assumptions:
      "Interest is charged each week on the full amount and the principal is repaid at the end; the APR shown is simple " +
      "(weekly rate × 52), and compounding makes the true cost even higher. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I have to repay a loan shark?",
        answer: "Loans from unlicensed lenders are often unenforceable, but get advice before you stop paying, and report threats to the police. Free debt advice is available from nonprofit credit counselors.",
      },
    ],
  },
  {
    slug: "layaway-plan-calculator",
    title: "Layaway Plan Calculator",
    description: "Plan a layaway purchase: the down payment, each installment, the total with fees, and how the layaway fee compares with the interest on a credit card.",
    metaTitle: "Layaway Plan Calculator — Payments & Fees",
    metaDescription: "Free layaway calculator. See the down payment, each installment and the total cost with fees, compared with putting it on a credit card.",
    calcInputs: [
      currencyField("price", "Item Price", { default: 600, max: 100000, step: 10 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 5 }),
      currencyField("fee", "Layaway Fee", { default: 10, max: 1000, step: 1, required: false }),
      numberField("weeks", "Layaway Period (Weeks)", { default: 8, min: 1, max: 52, step: 1 }),
      numberField("weeksBetweenPayments", "Weeks Between Payments", { default: 2, min: 1, max: 4, step: 1 }),
      percentField("cardAprPercent", "Credit Card APR (for Comparison)", { default: 24, max: 40, step: 0.25 }),
    ],
    calcResult: { label: "Payment Amount", format: "currency" },
    calcResults: [
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "numberOfPayments", label: "Number of Payments", format: "number" },
      { key: "paymentAmount", label: "Payment Amount", format: "currency", highlight: true },
      { key: "totalCost", label: "Total Cost (Price + Fee)", format: "currency" },
      { key: "feeAsPercentOfPrice", label: "Fee as % of Price", format: "percentage" },
      { key: "creditCardInterestSameTime", label: "Card Interest Over the Same Time", format: "currency" },
    ],
    instructions:
      "With layaway, the store holds the item while you pay for it in installments, and you take it home once it's paid " +
      "off. There's no interest and no credit check, but there may be a service fee and a cancellation fee if you don't " +
      "finish. Unlike BNPL, you don't get the item until the end.\n\n" +
      "Enter the price, the store's terms and how often you'll pay.",
    examples:
      "Example: a $600 item with 10% down ($60) over 8 weeks means 4 " +
      "payments of $135. With the $10 fee it costs $610 — 1.67% of the price — " +
      "versus about $18.06 of interest on a card paid off over the same time.",
    assumptions:
      "Equal installments; the card comparison assumes equal monthly payments over the layaway period. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I cancel a layaway?",
        answer: "Stores usually refund your payments minus a cancellation or restocking fee. Check the policy before you start, especially for seasonal layaway.",
      },
    ],
  },
  {
    slug: "buy-now-pay-later-calculator",
    title: "Buy Now Pay Later Calculator",
    description: "Work out a buy now, pay later (BNPL) plan: pay-in-4 or monthly installments with interest, the total cost with late fees, and how it compares with a credit card.",
    metaTitle: "Buy Now Pay Later Calculator — BNPL Payments & Cost",
    metaDescription: "Free buy now pay later calculator. See your BNPL payments, interest and late fees, and compare the total cost with a credit card.",
    calcInputs: [
      currencyField("price", "Purchase Price", { default: 800, max: 100000, step: 10 }),
      {
        key: "plan", label: "Plan Type", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Pay in 4 (Every 2 Weeks, 0%)", value: 1 },
          { label: "Monthly Installments With APR", value: 2 },
        ],
      },
      numberField("months", "Monthly Plan Length (Months)", { default: 12, min: 1, max: 60, step: 1 }),
      percentField("aprPercent", "Monthly Plan APR", { default: 15, max: 36, step: 0.25 }),
      currencyField("lateFee", "Late Fee per Missed Payment", { default: 7, max: 100, step: 1, required: false }),
      numberField("latePayments", "Late or Missed Payments", { default: 0, min: 0, max: 60, step: 1, required: false }),
      percentField("cardAprPercent", "Credit Card APR (for Comparison)", { default: 24, max: 40, step: 0.25 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "numberOfPayments", label: "Number of Payments", format: "number" },
      { key: "paymentAmount", label: "Payment Amount", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "lateFees", label: "Late Fees", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
      { key: "creditCardInterestSameTime", label: "Card Interest Over the Same Time", format: "currency" },
    ],
    instructions:
      "BNPL services such as Affirm, Klarna and Afterpay split a purchase into installments. Pay-in-4 plans charge no " +
      "interest — 25% today and 25% every two weeks — but may charge late fees. Longer monthly plans can charge an APR of " +
      "0% to 36%.\n\n" +
      "Enter the purchase and plan. The card comparison shows the interest if you charged the same amount and paid it off " +
      "over the same time.",
    examples:
      "Example: a $800 purchase on a pay-in-4 plan is 4 payments of $200 with no interest — " +
      "$800 in total if paid on time. Paying it off on a card at 24% over two months would cost about " +
      "$24.08 in interest.",
    assumptions:
      "Equal installments; late fees as entered (some providers cap them or charge none). Missed payments can be reported " +
      "to credit bureaus. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does buy now pay later affect my credit score?",
        answer: "Pay-in-4 often uses only a soft check, but longer loans may use a hard check, and more providers now report payments to credit bureaus — so on-time payments can help and missed ones can hurt.",
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
