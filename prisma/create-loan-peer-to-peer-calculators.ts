// One-time (but safe to re-run) batch setup script: creates the Peer-to-Peer Loan tools
// (7) of the Loan Calculators expansion 3, filed under Loan Calculators > Personal Loan Calculators.
// See src/lib/calc-engine-loan-peer-to-peer.ts for the math and
// src/lib/calc-engine-loan-sba.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-peer-to-peer-calculators.ts
// or
//   npm run db:create-loan-peer-to-peer-calculators

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
    slug: "peer-to-peer-loan-calculator",
    title: "Peer-to-Peer Loan Calculator",
    description: "Work out how much to request on a peer-to-peer lending platform so you still receive what you need after the origination fee, plus the payment and APR.",
    metaTitle: "Peer-to-Peer Loan Calculator — Fee, Payment & APR",
    metaDescription: "Free peer-to-peer (P2P) loan calculator. Find the amount to request after the origination fee, your monthly payment, interest and APR.",
    calcInputs: [
      currencyField("amountNeeded", "Amount You Need to Receive", { default: 10000, max: 100000, step: 100 }),
      percentField("originationFeePercent", "Origination Fee", { default: 5, max: 20, step: 0.25 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 36, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 84, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "loanAmountToRequest", label: "Loan Amount to Request", format: "currency" },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "apr", label: "APR (Including the Fee)", format: "percentage" },
    ],
    instructions:
      "On peer-to-peer (P2P) lending platforms, investors fund your loan and the platform takes an origination fee out " +
      "of the money before you get it. Enter the amount you actually need, the fee, the rate and the term, and the " +
      "calculator grosses the request up so the fee doesn't leave you short.",
    examples:
      "Example: to receive $10,000 with a 5% fee, request $10,526.32 — the fee is " +
      "$526.32. At 12% over 36 months, the payment is $349.62, interest is " +
      "$2,060.16, and the APR is 15.61%.",
    assumptions:
      "The fee is deducted from the loan proceeds and interest is charged on the full loan. Fixed rate, equal monthly " +
      "payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How does peer-to-peer lending work?",
        answer: "A platform checks your credit and sets your rate; individual or institutional investors fund the loan; you repay the platform, which passes payments to investors after its fee.",
      },
    ],
  },
  {
    slug: "peer-to-peer-loan-payment-calculator",
    title: "Peer-to-Peer Loan Payment Calculator",
    description: "Compare the monthly payment on a 36-month and a 60-month peer-to-peer loan, and see how much more interest the longer term costs.",
    metaTitle: "P2P Loan Payment Calculator — 36 vs 60 Months",
    metaDescription: "Free peer-to-peer loan payment calculator. Compare 3-year and 5-year P2P loan payments and the extra interest of the longer term.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 100000, step: 100 }),
      percentField("rate36Percent", "Rate for 36 Months", { default: 11, max: 36, step: 0.25 }),
      percentField("rate60Percent", "Rate for 60 Months", { default: 13.5, max: 36, step: 0.25 }),
    ],
    calcResult: { label: "Payment — 36 Months", format: "currency" },
    calcResults: [
      { key: "payment36", label: "Payment — 36 Months", format: "currency", highlight: true },
      { key: "payment60", label: "Payment — 60 Months", format: "currency" },
      { key: "monthlyDifference", label: "Monthly Saving With 60 Months", format: "currency" },
      { key: "interest36", label: "Total Interest — 36 Months", format: "currency" },
      { key: "interest60", label: "Total Interest — 60 Months", format: "currency" },
      { key: "extraInterestFor60", label: "Extra Interest for 60 Months", format: "currency" },
    ],
    instructions:
      "Most P2P platforms offer 3-year and 5-year terms, usually at a higher rate for 5 years. Enter the loan and both " +
      "rates to see the trade-off between a lower payment and more interest.",
    examples:
      "Example: $15,000 at 11% for 36 months costs $491.08 a month and $2,678.91 of interest. " +
      "Over 60 months at 13.50%, it's $345.15 a month — $145.93 less — but $5,708.86 of " +
      "interest, $3,029.95 more.",
    assumptions:
      "Fixed rates and equal monthly payments; origination fees not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I pay a 60-month P2P loan off early?",
        answer: "Major platforms don't charge prepayment penalties, so you can take the lower payment and pay extra when you can — though the rate stays higher.",
      },
    ],
  },
  {
    slug: "peer-to-peer-loan-payoff-calculator",
    title: "Peer-to-Peer Loan Payoff Calculator",
    description: "See the balance and interest saved if you pay off a peer-to-peer loan early — and why the upfront origination fee makes your effective APR higher.",
    metaTitle: "P2P Loan Payoff Calculator — Early Payoff & APR",
    metaDescription: "Free peer-to-peer loan payoff calculator. See your payoff balance, interest saved, and the effective APR once the upfront fee is counted.",
    calcInputs: [
      currencyField("loanAmount", "Original Loan Amount", { default: 12000, max: 100000, step: 100 }),
      percentField("originationFeePercent", "Origination Fee Paid", { default: 6, max: 20, step: 0.25 }),
      percentField("annualRatePercent", "Interest Rate", { default: 14, max: 36, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 6, max: 84, step: 1 }),
      numberField("payoffMonth", "Pay Off After (Months)", { default: 24, min: 1, max: 84, step: 1 }),
    ],
    calcResult: { label: "Effective APR If Paid Off Early", format: "percentage" },
    calcResults: [
      { key: "balanceAtPayoff", label: "Balance to Pay Off", format: "currency" },
      { key: "interestPaid", label: "Interest Paid Until Then", format: "currency" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
      { key: "aprIfHeldToTerm", label: "APR If Held to Term", format: "percentage" },
      { key: "effectiveAprIfPaidEarly", label: "Effective APR If Paid Off Early", format: "percentage", highlight: true },
    ],
    instructions:
      "Enter your loan, the origination fee you paid, the rate, the term, and when you plan to pay it off. Paying early " +
      "always saves interest, but the fee was taken upfront and isn't refunded — so spread over fewer months it " +
      "makes the loan's effective annual cost higher. That matters when comparing it with what you'd refinance into.",
    examples:
      "Example: a $12,000, 60-month loan at 14% with a 6% fee has an " +
      "APR of 16.82%. Paying it off after 24 months means paying $8,169.64 and saves " +
      "$1,882.24 of interest, but the effective APR rises to 18.17%.",
    assumptions:
      "No prepayment penalty; payments made on schedule until the payoff. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is paying off a P2P loan early still worth it?",
        answer: "Yes, in dollars — you stop paying interest. The fee is a sunk cost; just don't take a new loan with another fee unless the savings beat it.",
      },
    ],
  },
  {
    slug: "peer-to-peer-loan-interest-calculator",
    title: "Peer-to-Peer Loan Interest Calculator",
    description: "Calculate the interest a borrower pays on a P2P loan — and what an investor funding it actually earns after the platform's service fee and expected defaults.",
    metaTitle: "Peer-to-Peer Loan Interest Calculator — Borrower & Investor",
    metaDescription: "Free P2P loan interest calculator. See borrower interest and the investor's net return after service fees and defaults.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 10000, max: 100000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 13, max: 36, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 84, step: 1 }),
      percentField("serviceFeePercent", "Investor Service Fee (of Payments)", { default: 1, max: 10, step: 0.1 }),
      percentField("annualDefaultPercent", "Expected Annual Default Rate", { default: 4, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Borrower's Total Interest", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "borrowerTotalInterest", label: "Borrower's Total Interest", format: "currency", highlight: true },
      { key: "investorServiceFees", label: "Platform Service Fees (Investor Side)", format: "currency" },
      { key: "investorExpectedProfit", label: "Investor's Expected Profit", format: "currency" },
      { key: "investorNetReturn", label: "Investor's Expected Annual Return", format: "percentage" },
    ],
    instructions:
      "Enter the loan, rate and term to see the borrower's interest. For the investor view, enter the platform's " +
      "service fee (often 1% of each payment) and the share of loans you expect to default each year — higher-rate " +
      "grades default more often, which is why their net returns are well below their rates.",
    examples:
      "Example: a $10,000 loan at 13% over 36 months costs the borrower $336.94 a " +
      "month and $2,129.82 of interest. An investor pays $121.30 in service fees and, with " +
      "4% of loans defaulting a year, expects $1,283.11 — about 8.50% a year.",
    assumptions:
      "Defaulted loans stop paying with no recovery; defaults are spread evenly over time. Investor returns aren't " +
      "guaranteed and P2P notes aren't FDIC insured. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can individuals still invest in P2P loans?",
        answer: "Fewer platforms accept individual investors today than in the 2010s — many are now funded by banks and institutions — but some still offer notes or funds.",
      },
    ],
  },
  {
    slug: "peer-to-peer-loan-affordability-calculator",
    title: "Peer-to-Peer Loan Affordability Calculator",
    description: "Find the largest peer-to-peer loan your income supports under a debt-to-income limit — and the cash you'd actually receive after the fee.",
    metaTitle: "P2P Loan Affordability Calculator — Max Loan by DTI",
    metaDescription: "Free peer-to-peer loan affordability calculator. See the maximum P2P loan your DTI allows and the cash you'd receive after the fee.",
    calcInputs: [
      currencyField("monthlyIncome", "Gross Monthly Income", { default: 4500, max: 1000000, step: 100 }),
      currencyField("existingDebtPayments", "Existing Monthly Debt Payments", { default: 900, max: 1000000, step: 10, required: false }),
      percentField("maxDtiPercent", "Maximum Debt-to-Income Ratio", { default: 40, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 14, max: 36, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 6, max: 84, step: 1 }),
      percentField("originationFeePercent", "Origination Fee", { default: 5, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Maximum Loan Amount", format: "currency" },
    calcResults: [
      { key: "maxMonthlyPayment", label: "Maximum New Monthly Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency", highlight: true },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "cashYouReceive", label: "Cash You'd Receive", format: "currency" },
    ],
    instructions:
      "Enter your income before tax, your current monthly debt payments, and the platform's maximum DTI (often around " +
      "40%, sometimes excluding your mortgage). The calculator finds the largest payment that fits and turns it into a " +
      "loan amount, then subtracts the origination fee.",
    examples:
      "Example: with $4,500 of income, $900 of debt payments and a 40% DTI limit, " +
      "you can add $900 a month. At 14% over 60 months, that's a loan of " +
      "$38,679.31; after the $1,933.97 fee you'd receive $36,745.35.",
    assumptions:
      "DTI = all monthly debt payments ÷ gross monthly income. Platforms also have their own loan limits and credit " +
      "rules — most cap P2P loans at about $40,000–$50,000. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Just because I can borrow it, should I?",
        answer: "Not necessarily — a DTI limit is the most a lender allows. Leave room in your budget for savings and surprises.",
      },
    ],
  },
  {
    slug: "peer-to-peer-loan-comparison-calculator",
    title: "Peer-to-Peer Loan Comparison Calculator",
    description: "Compare a peer-to-peer loan with a bank or credit union loan: a P2P loan's lower rate can lose to a no-fee loan once the origination fee is counted.",
    metaTitle: "Peer-to-Peer Loan vs Bank Loan Calculator",
    metaDescription: "Free P2P loan comparison calculator. Compare a peer-to-peer loan with a bank loan by APR and total cost, with fees included.",
    calcInputs: [
      currencyField("amountNeeded", "Amount You Need", { default: 15000, max: 100000, step: 100 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 84, step: 1 }),
      percentField("p2pRatePercent", "P2P Loan Rate", { default: 11, max: 36, step: 0.25 }),
      percentField("p2pFeePercent", "P2P Origination Fee", { default: 6, max: 20, step: 0.25 }),
      percentField("bankRatePercent", "Bank / Credit Union Rate", { default: 12.5, max: 36, step: 0.25 }),
      percentField("bankFeePercent", "Bank / Credit Union Fee", { default: 0, max: 20, step: 0.25, required: false }),
    ],
    calcResult: { label: "Extra Cost of the P2P Loan", format: "currency" },
    calcResults: [
      { key: "p2pMonthlyPayment", label: "P2P Monthly Payment", format: "currency" },
      { key: "bankMonthlyPayment", label: "Bank Monthly Payment", format: "currency" },
      { key: "p2pApr", label: "P2P APR", format: "percentage" },
      { key: "bankApr", label: "Bank APR", format: "percentage" },
      { key: "p2pTotalCost", label: "P2P Total Cost (Interest + Fee)", format: "currency" },
      { key: "bankTotalCost", label: "Bank Total Cost (Interest + Fee)", format: "currency" },
      { key: "costDifference", label: "Extra Cost of the P2P Loan", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the amount you need to receive and the term, then each lender's rate and fee. Each loan is sized so you " +
      "receive the same cash after fees. A negative extra cost means the P2P loan is cheaper.",
    examples:
      "Example: to receive $15,000 over 36 months, a P2P loan at 11% with a " +
      "6% fee has an APR of 15.33% and costs $3,807.35. A bank loan at 12.50% with no " +
      "fee has an APR of 12.50% and costs $3,064.96. The P2P loan costs $742.39 more.",
    assumptions:
      "Fees are deducted from the proceeds; fixed rates and equal monthly payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why compare APRs instead of rates?",
        answer: "APR includes the origination fee, so it shows the real yearly cost. A lower rate with a big fee can have a higher APR.",
      },
    ],
  },
  {
    slug: "peer-to-peer-loan-eligibility-calculator",
    title: "Peer-to-Peer Loan Eligibility Calculator",
    description: "Check whether you're likely to qualify for a peer-to-peer loan: credit score, debt-to-income ratio with the new payment, and the platform's maximum loan.",
    metaTitle: "Peer-to-Peer Loan Eligibility Calculator",
    metaDescription: "Free P2P loan eligibility calculator. Check your credit score, DTI with the new payment, and the loan size against platform limits.",
    calcInputs: [
      currencyField("monthlyIncome", "Gross Monthly Income", { default: 5000, max: 1000000, step: 100 }),
      currencyField("existingDebtPayments", "Existing Monthly Debt Payments", { default: 800, max: 1000000, step: 10, required: false }),
      currencyField("loanAmount", "Loan Amount", { default: 12000, max: 100000, step: 100 }),
      percentField("annualRatePercent", "Expected Interest Rate", { default: 15, max: 36, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 84, step: 1 }),
      numberField("creditScore", "Your Credit Score", { default: 660, min: 300, max: 850, step: 1 }),
      numberField("minScore", "Platform's Minimum Score", { default: 640, min: 300, max: 850, step: 1 }),
      percentField("maxDtiPercent", "Platform's Maximum DTI", { default: 40, max: 100, step: 1 }),
      currencyField("platformMax", "Platform's Maximum Loan", { default: 50000, max: 100000, step: 1000 }),
    ],
    calcResult: { label: "Checks Passed (of 3)", format: "number" },
    calcResults: [
      { key: "newMonthlyPayment", label: "New Monthly Payment", format: "currency" },
      { key: "dtiWithLoan", label: "DTI With the Loan", format: "percentage" },
      { key: "maxPaymentWithinDti", label: "Maximum Payment Within the DTI Limit", format: "currency" },
      { key: "checksPassed", label: "Checks Passed (of 3)", format: "number", highlight: true },
    ],
    instructions:
      "Enter your income, current debt payments and the loan you want, then the platform's limits. Minimum scores " +
      "range from about 600 to 660 on major platforms, maximum loans are often $40,000–$50,000, and DTI limits around " +
      "40%. Checking your rate on most platforms uses a soft credit pull that doesn't affect your score.",
    examples:
      "Example: with $5,000 of income and $800 of debt payments, a $12,000 loan at " +
      "15% over 36 months adds $415.98, for a DTI of 24.32%. With a " +
      "660 score, 3 of 3 checks pass.",
    assumptions:
      "Platforms also look at credit history length, recent inquiries, delinquencies and income verification. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get a P2P loan with bad credit?",
        answer: "It's harder — most platforms want scores of 600+. A co-borrower, a lower amount, or a secured loan can help.",
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
