// One-time (but safe to re-run) batch setup script: creates the 8 tools of
// the "Credit & Debt Calculators" batch — the first of 8 new topic batches
// built from Finance_Calculators_Topical_SEO_Master.xlsx (a finance-wide
// SEO/content plan). Filed under the existing "Credit & Debt Calculators"
// category (credit-debt-calculators), created empty by
// reparent-tool-categories-under-finance.ts and populated here for the
// first time.
//
// See src/lib/calc-engine-finance-credit-debt.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-finance-credit-debt-calculators.ts
// or
//   npm run db:create-finance-credit-debt-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "credit-debt-calculators";

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
    max: opts.max ?? 1000000,
    step: opts.step ?? 500,
  };
}

function percentField(
  key: string,
  label: string,
  opts: { required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "percentage",
    unit: "%",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 40,
    step: opts.step ?? 0.1,
  };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. Actual results depend on your card issuer's or lender's specific terms — check your statement or " +
  "loan agreement, or consult a qualified financial advisor for guidance specific to your situation.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "debt-payoff-calculator",
    title: "Debt Payoff Calculator",
    description:
      "See how many months it will take to pay off any debt, and how much interest you'll pay along the way, " +
      "from your balance, interest rate, and monthly payment.",
    metaTitle: "Debt Payoff Calculator (2026) — Free & Instant",
    metaDescription:
      "Free debt payoff calculator. Enter your balance, interest rate, and monthly payment to see your payoff " +
      "time, total interest, and total amount paid.",
    calcInputs: [
      currencyField("currentBalance", "Current Balance", { default: 8000, max: 500000, step: 100 }),
      percentField("annualInterestRate", "Annual Interest Rate (APR)", { default: 18, max: 36, step: 0.1 }),
      currencyField("monthlyPayment", "Monthly Payment", { default: 300, max: 20000, step: 10 }),
    ],
    calcResult: { label: "Months to Payoff", format: "number" },
    calcResults: [
      { key: "monthsToPayoff", label: "Months to Payoff", format: "number", highlight: true },
      { key: "yearsToPayoff", label: "Years to Payoff", format: "number" },
      { key: "totalInterestPaid", label: "Total Interest Paid", format: "currency" },
      { key: "totalAmountPaid", label: "Total Amount Paid", format: "currency" },
    ],
    instructions:
      "Enter your current balance, your annual interest rate (APR), and how much you plan to pay each month. " +
      "This works for any kind of debt with a fixed rate and a regular payment — credit cards, personal loans, " +
      "medical debt, and more.\n\n" +
      "The result shows how many months (and years) it will take to reach a zero balance at that payment, plus " +
      "the total interest and total amount you'll pay over that time. If your monthly payment doesn't even cover " +
      "a month's interest, the balance will never go down — the calculator flags this rather than showing a " +
      "misleadingly large payoff time.",
    examples:
      "Example: an $8,000 balance at 18% APR, paid down at $300 a month, takes about 35 months (2.9 years) to " +
      "pay off, with roughly $2,293 in total interest — for a total of about $10,293 paid.",
    assumptions:
      "This assumes a fixed interest rate and a fixed monthly payment applied consistently every month, with no " +
      "new charges added to the balance. A real card or loan may compound interest daily rather than monthly, " +
      "which can make the actual payoff slightly slower than this estimate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if my payment doesn't cover the interest?",
        answer:
          "Then your balance won't go down — it may even grow. This calculator caps its estimate at 50 years and " +
          "flags that outcome rather than pretending the debt gets paid off; if you see the maximum payoff time, " +
          "increase your monthly payment.",
      },
      {
        question: "Does paying extra each month help a lot?",
        answer:
          "Yes, often dramatically — because more of each payment goes to principal instead of interest sooner. " +
          "Try increasing the monthly payment amount here to see the effect on your payoff time and total " +
          "interest directly.",
      },
      {
        question: "Is this the same as a credit card minimum payment?",
        answer:
          "No — this assumes a fixed payment you choose. For how long payoff takes at your card's actual " +
          "shrinking minimum payment, see this site's Minimum Payment Calculator instead.",
      },
    ],
  },
  {
    slug: "credit-card-payoff-calculator",
    title: "Credit Card Payoff Calculator",
    description:
      "Find out how long it will take to pay off a credit card balance, and the total interest cost, at a fixed " +
      "monthly payment.",
    metaTitle: "Credit Card Payoff Calculator (2026) — Free & Instant",
    metaDescription:
      "Free credit card payoff calculator. Enter your card balance, APR, and monthly payment to see your payoff " +
      "time and total interest cost.",
    calcInputs: [
      currencyField("cardBalance", "Credit Card Balance", { default: 5000, max: 100000, step: 100 }),
      percentField("apr", "Card APR", { default: 22, max: 36, step: 0.1 }),
      currencyField("monthlyPayment", "Monthly Payment", { default: 250, max: 10000, step: 10 }),
    ],
    calcResult: { label: "Months to Payoff", format: "number" },
    calcResults: [
      { key: "monthsToPayoff", label: "Months to Payoff", format: "number", highlight: true },
      { key: "totalInterestPaid", label: "Total Interest Paid", format: "currency" },
      { key: "totalAmountPaid", label: "Total Amount Paid", format: "currency" },
    ],
    instructions:
      "Enter your current credit card balance, its APR (shown on your statement), and how much you plan to pay " +
      "each month. The result shows how many months it will take to pay the card off completely at that fixed " +
      "payment, plus the total interest and total amount you'll end up paying.",
    examples:
      "Example: a $5,000 card balance at 22% APR, paid down at $250 a month, takes about 26 months to clear, " +
      "with roughly $1,286 in total interest.",
    assumptions:
      "Credit card issuers typically compound interest daily rather than monthly, which can make the real " +
      "payoff slightly slower than this monthly-compounding estimate. It also assumes no new purchases are added " +
      "to the card while you're paying it down. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I stop using the card while paying it off?",
        answer:
          "This calculator assumes you do — any new charges added to the balance will extend your payoff time " +
          "and increase total interest beyond what's shown here.",
      },
      {
        question: "How is this different from the Minimum Payment Calculator?",
        answer:
          "This tool uses a payment amount YOU choose and hold fixed every month. The Minimum Payment Calculator " +
          "instead simulates your issuer's actual minimum, which is recalculated (and shrinks) every month as " +
          "your balance drops — a much slower, more expensive path.",
      },
    ],
  },
  {
    slug: "credit-card-interest-calculator",
    title: "Credit Card Interest Calculator",
    description: "See exactly how much interest your credit card balance is costing you — daily, monthly, and annually.",
    metaTitle: "Credit Card Interest Calculator — Free & Instant",
    metaDescription:
      "Free credit card interest calculator. Enter your balance and APR to see your daily, monthly, and annual " +
      "interest cost.",
    calcInputs: [
      currencyField("cardBalance", "Credit Card Balance", { default: 5000, max: 100000, step: 100 }),
      percentField("apr", "Card APR", { default: 22, max: 36, step: 0.1 }),
    ],
    calcResult: { label: "Monthly Interest", format: "currency" },
    calcResults: [
      { key: "dailyInterest", label: "Daily Interest", format: "currency" },
      { key: "monthlyInterest", label: "Monthly Interest", format: "currency", highlight: true },
      { key: "annualInterestIfUnpaid", label: "Annual Interest If Balance Stayed the Same", format: "currency" },
    ],
    instructions:
      "Enter your credit card balance and its APR. The result shows what that balance is costing you in " +
      "interest — per day, per month, and per year if the balance never changed — so you can see plainly how " +
      "much of a minimum payment is just covering interest rather than paying anything down.",
    examples: "Example: a $5,000 balance at 22% APR costs about $3.01 a day, $91.67 a month, or $1,100 a year in interest alone.",
    assumptions:
      "The daily figure uses APR / 365, applied to a static balance — most issuers do compound daily on the " +
      "actual daily balance, which shifts as you pay it down, so this is a snapshot at your current balance " +
      "rather than a running total. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why show a daily figure if I'm billed monthly?",
        answer:
          "Because most card issuers actually calculate interest daily on your outstanding balance (called " +
          "\"average daily balance\"), then total it up for your monthly statement — the daily figure shows what " +
          "each day of carrying that balance is really costing you.",
      },
      {
        question: "Does this go down as I pay off the balance?",
        answer:
          "Yes — interest is charged on whatever the balance is at the time, so every payment that reduces your " +
          "balance also reduces future interest. Re-run this calculator with a lower balance to see the effect.",
      },
    ],
  },
  {
    slug: "minimum-payment-calculator",
    title: "Minimum Payment Calculator",
    description:
      "See your card's minimum payment amount, and how long it would really take to pay off your balance if you " +
      "only ever paid the minimum.",
    metaTitle: "Minimum Payment Calculator — Free & Instant",
    metaDescription:
      "Free minimum payment calculator. See your credit card's minimum payment and how long payoff takes if you " +
      "only pay the minimum.",
    calcInputs: [
      currencyField("cardBalance", "Credit Card Balance", { default: 5000, max: 100000, step: 100 }),
      percentField("apr", "Card APR", { default: 22, max: 36, step: 0.1 }),
      percentField("minPaymentPercent", "Minimum Payment (% of Balance)", { default: 2, max: 10, step: 0.5 }),
      currencyField("minPaymentFloor", "Minimum Payment Floor ($)", { default: 25, max: 100, step: 5 }),
    ],
    calcResult: { label: "Initial Minimum Payment", format: "currency" },
    calcResults: [
      { key: "initialMinimumPayment", label: "Initial Minimum Payment", format: "currency", highlight: true },
      { key: "monthsToPayoffAtMinimum", label: "Months to Payoff at Minimum Only", format: "number" },
      { key: "totalInterestAtMinimum", label: "Total Interest at Minimum Only", format: "currency" },
    ],
    instructions:
      "Enter your card balance, APR, and your issuer's minimum payment formula — usually shown on your " +
      "statement as a percentage of your balance (commonly 1-3%) with a flat dollar floor (commonly $25-35), " +
      "whichever is greater. The default 2% / $25 matches a typical major-issuer formula if you're not sure.\n\n" +
      "The result shows your very first minimum payment, plus how long it would take (and how much interest " +
      "you'd pay) if you only ever paid the minimum every month — which recalculates and shrinks as your " +
      "balance drops, stretching payoff out far longer than a fixed payment would.",
    examples:
      "Example: a $5,000 balance at 22% APR with a 2% / $25 minimum formula starts at a $100 minimum payment, " +
      "but paying only the minimum every month takes roughly 300+ months and costs several times the original " +
      "balance in interest.",
    assumptions:
      "This assumes your issuer recalculates the minimum payment every month as a percentage of your then-current " +
      "balance (the common formula) — some cards use a flat fixed minimum instead, which pays off faster. Check " +
      "your card's actual minimum payment formula on your monthly statement or cardholder agreement. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does paying only the minimum take so long?",
        answer:
          "Because the minimum is calculated as a percentage of your CURRENT balance, it shrinks every month " +
          "right along with your balance — so the payment keeps getting smaller and a larger share of it keeps " +
          "going to interest rather than principal, dragging payoff out for years or even decades.",
      },
      {
        question: "How much would a fixed higher payment save me?",
        answer:
          "Often a great deal — see this site's Debt Payoff Calculator or Credit Card Payoff Calculator to " +
          "compare a fixed payment amount of your choice against the minimum-only path shown here.",
      },
    ],
  },
  {
    slug: "debt-consolidation-calculator",
    title: "Debt Consolidation Calculator",
    description:
      "Compare your current debt against a consolidation loan to see the new monthly payment and estimated " +
      "interest savings.",
    metaTitle: "Debt Consolidation Calculator (2026) — Free & Instant",
    metaDescription:
      "Free debt consolidation calculator. Compare your current average rate against a consolidation loan's rate " +
      "and term to see your new payment and potential savings.",
    calcInputs: [
      currencyField("totalDebtBalance", "Total Debt Balance", { default: 15000, max: 500000, step: 500 }),
      percentField("currentAverageApr", "Current Average APR", { default: 24, max: 36, step: 0.1 }),
      percentField("consolidationApr", "Consolidation Loan APR", { default: 12, max: 36, step: 0.1 }),
      { key: "consolidationTermMonths", label: "Consolidation Loan Term (Months)", type: "number", required: true, default: 36, min: 6, max: 84, step: 6 },
    ],
    calcResult: { label: "New Monthly Payment", format: "currency" },
    calcResults: [
      { key: "newMonthlyPayment", label: "New Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterestAfterConsolidation", label: "Total Interest After Consolidation", format: "currency" },
      { key: "estimatedInterestSavings", label: "Estimated Interest Savings", format: "currency" },
    ],
    instructions:
      "Enter your total combined debt balance, the average APR you're currently paying across it, and the rate " +
      "and term of a consolidation loan you're considering. The result compares paying off your current debt at " +
      "its current rate over that same term against the consolidation loan, showing the new fixed monthly " +
      "payment and the estimated interest you'd save (or, if the consolidation rate is actually higher, how much " +
      "more it would cost).",
    examples:
      "Example: $15,000 in debt at a 24% average APR, consolidated into a 36-month loan at 12% APR, comes to " +
      "about $498.21 a month — versus paying off the original debt over the same 36 months at 24% (which would " +
      "run about $588.49 a month), this saves roughly $3,250 in total interest.",
    assumptions:
      "This compares total interest over the SAME term for both paths — if your current debt (like a credit " +
      "card with no fixed term) would actually take longer than the consolidation term to pay off at your " +
      "current payment, the real savings are typically even larger than shown. It doesn't include any " +
      "consolidation loan origination fees, which some lenders charge. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does this include loan origination fees?",
        answer:
          "No — some consolidation lenders charge an origination fee (often 1-8% of the loan), which would " +
          "reduce your net savings. Factor any fee you're quoted into your own decision alongside this estimate.",
      },
      {
        question: "What if my current debt has no fixed payoff term?",
        answer:
          "Credit card debt with no fixed term often actually takes far longer than a loan's term to pay off if " +
          "left as-is — this calculator's comparison uses the consolidation loan's term for both sides to keep " +
          "the comparison apples-to-apples, which is a conservative (not inflated) estimate of your savings.",
      },
    ],
  },
  {
    slug: "debt-to-income-ratio-calculator",
    title: "Debt-to-Income Ratio Calculator",
    description: "Calculate your debt-to-income (DTI) ratio — the percentage of your gross monthly income that goes to debt payments.",
    metaTitle: "Debt-to-Income Ratio Calculator — Free & Instant",
    metaDescription:
      "Free debt-to-income ratio calculator. Enter your monthly debt payments and gross income to see your DTI " +
      "percentage.",
    calcInputs: [
      currencyField("monthlyDebtPayments", "Total Monthly Debt Payments", { default: 1200, max: 50000, step: 50 }),
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 6000, max: 200000, step: 100 }),
    ],
    calcResult: { label: "Debt-to-Income Ratio", format: "percentage" },
    calcResults: [],
    instructions:
      "Enter your total monthly debt payments (minimum credit card payments, auto loans, student loans, personal " +
      "loans, and any mortgage or rent-equivalent housing debt) and your gross (before-tax) monthly income. The " +
      "result is your debt-to-income ratio as a percentage — a figure lenders commonly use to assess how much " +
      "additional debt you can responsibly take on.",
    examples: "Example: $1,200 in monthly debt payments against $6,000 in gross monthly income gives a 20% DTI ratio.",
    assumptions:
      "Lenders vary in exactly which payments they count (some include rent, some don't; some exclude debts " +
      "close to being paid off) — for a mortgage application in particular, follow your specific lender's DTI " +
      "definition. As a general guide, many lenders view a DTI below 36% favorably, with 43% often cited as a " +
      "common upper threshold for mortgage qualification. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's considered a good DTI ratio?",
        answer:
          "There's no single universal cutoff, but many lenders view 36% or below favorably, with 43% commonly " +
          "cited as an upper threshold for conventional mortgage qualification — though exact requirements vary " +
          "by lender and loan type.",
      },
      {
        question: "Does this include rent or mortgage payments?",
        answer:
          "Include your housing payment (rent, or mortgage principal/interest/taxes/insurance) in your monthly " +
          "debt payments figure if you're calculating DTI for a mortgage application, since that's how most " +
          "mortgage lenders define it — for other purposes, you may want a version without housing costs.",
      },
    ],
  },
  {
    slug: "loan-to-income-ratio-calculator",
    title: "Loan-to-Income Ratio Calculator",
    description: "Calculate your loan-to-income ratio — how a loan amount compares to your annual gross income, as a multiple and a percentage.",
    metaTitle: "Loan-to-Income Ratio Calculator — Free & Instant",
    metaDescription:
      "Free loan-to-income ratio calculator. Enter a loan amount and your annual income to see the ratio as a " +
      "multiple and a percentage.",
    calcInputs: [
      currencyField("totalLoanAmount", "Total Loan Amount", { default: 250000, max: 5000000, step: 1000 }),
      currencyField("annualGrossIncome", "Annual Gross Income", { default: 80000, max: 2000000, step: 1000 }),
    ],
    calcResult: { label: "Loan-to-Income Multiple", format: "number" },
    calcResults: [
      { key: "loanToIncomeMultiple", label: "Loan-to-Income Multiple", format: "number", highlight: true },
      { key: "loanToIncomePercent", label: "Loan-to-Income (%)", format: "percentage" },
    ],
    instructions:
      "Enter the loan amount you're considering (or already carrying) and your annual gross income. The result " +
      "shows the loan-to-income ratio both as a multiple (e.g. \"3.1x\" your income) and as a percentage — " +
      "commonly used as a quick affordability check for mortgages and other large loans.",
    examples: "Example: a $250,000 loan against $80,000 in annual gross income is a 3.1x loan-to-income ratio (313%).",
    assumptions:
      "Different loan types and lenders use different comfortable thresholds for this ratio — mortgage lenders " +
      "commonly reference a range around 3-4.5x income depending on the program, rate environment, and your " +
      "other finances, so treat this as a rough affordability signal rather than a guaranteed qualification " +
      "threshold. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What loan-to-income ratio is considered safe?",
        answer:
          "It varies by loan type, lender, and interest-rate environment, but many mortgage guidelines fall " +
          "somewhere around 3-4.5x annual income as a rough comfort range — your own safe number also depends on " +
          "your other debts, down payment, and interest rate.",
      },
      {
        question: "How is this different from debt-to-income ratio?",
        answer:
          "Loan-to-income compares a loan's total AMOUNT to your annual income (a rough affordability snapshot " +
          "before payments are even calculated). Debt-to-income compares your actual monthly debt PAYMENTS to " +
          "your monthly income, which is what most lenders use for real underwriting decisions.",
      },
    ],
  },
  {
    slug: "debt-snowball-calculator",
    title: "Debt Snowball Calculator",
    description:
      "Simulate the debt snowball method — paying minimums on every debt while throwing extra money at your " +
      "smallest balance first — for up to 3 debts.",
    metaTitle: "Debt Snowball Calculator — Free & Instant",
    metaDescription:
      "Free debt snowball calculator. Enter up to 3 debts and an extra monthly payment to see your debt-free " +
      "timeline and total interest.",
    calcInputs: [
      currencyField("debt1Balance", "Debt 1 Balance", { default: 2000, max: 200000, step: 100 }),
      percentField("debt1Apr", "Debt 1 APR", { default: 24, max: 36, step: 0.1 }),
      currencyField("debt1MinPayment", "Debt 1 Minimum Payment", { default: 60, max: 5000, step: 10 }),
      currencyField("debt2Balance", "Debt 2 Balance (0 if none)", { default: 5000, required: false, max: 200000, step: 100 }),
      percentField("debt2Apr", "Debt 2 APR", { default: 20, required: false, max: 36, step: 0.1 }),
      currencyField("debt2MinPayment", "Debt 2 Minimum Payment", { default: 120, required: false, max: 5000, step: 10 }),
      currencyField("debt3Balance", "Debt 3 Balance (0 if none)", { default: 0, required: false, max: 200000, step: 100 }),
      percentField("debt3Apr", "Debt 3 APR", { default: 18, required: false, max: 36, step: 0.1 }),
      currencyField("debt3MinPayment", "Debt 3 Minimum Payment", { default: 0, required: false, max: 5000, step: 10 }),
      currencyField("extraMonthlyPayment", "Extra Monthly Payment", { default: 150, max: 20000, step: 10 }),
    ],
    calcResult: { label: "Months to Debt-Free", format: "number" },
    calcResults: [
      { key: "monthsToDebtFree", label: "Months to Debt-Free", format: "number", highlight: true },
      { key: "yearsToDebtFree", label: "Years to Debt-Free", format: "number" },
      { key: "totalInterestPaid", label: "Total Interest Paid (All Debts)", format: "currency" },
    ],
    instructions:
      "Enter the balance, APR, and minimum payment for up to 3 debts (leave a debt's balance at 0 if you have " +
      "fewer than 3), plus one extra amount you can put toward debt each month beyond the minimums.\n\n" +
      "The snowball method pays the minimum on every debt, then throws all remaining extra money at whichever " +
      "debt has the SMALLEST balance. Once that debt is paid off, its old minimum payment joins the extra amount " +
      "and rolls onto the next-smallest debt — the payoff \"snowballs\" faster with each debt cleared.",
    examples:
      "Example: a $2,000 debt at 24% APR ($60 min) and a $5,000 debt at 20% APR ($120 min), with $150 extra " +
      "toward the smaller balance first, reaches debt-free in about 27 months, with roughly $1,789 in total " +
      "interest across both debts.",
    assumptions:
      "Supports up to 3 debts as a simplification — if you have more, group similar-rate debts together into one " +
      "slot, or run smaller groups through this calculator separately. This method targets the smallest BALANCE " +
      "first regardless of interest rate (for the mathematically lowest total interest instead, order debts by " +
      "highest rate first — commonly called the \"debt avalanche\" method). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I have more than 3 debts?",
        answer:
          "Combine debts with similar balances and rates into a single slot here as an approximation, or run " +
          "your smallest few debts through this calculator first, then re-run it with the next few once those " +
          "are cleared.",
      },
      {
        question: "Is snowball better than paying off the highest interest rate first?",
        answer:
          "The \"avalanche\" method (highest rate first) minimizes total interest paid mathematically. The " +
          "snowball method (smallest balance first, used here) usually costs a little more in interest but " +
          "clears individual debts faster, which many people find more motivating to stick with.",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:setup-finance-categories" first, ` +
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
