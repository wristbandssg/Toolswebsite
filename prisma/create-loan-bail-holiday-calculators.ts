// One-time (but safe to re-run) batch setup script: creates the Bail Bond and Holiday Loan tools
// (8) of the Loan Calculators expansion 5, filed under Loan Calculators > Personal Loan Calculators.
// See src/lib/calc-engine-loan-bail-holiday.ts for the math and
// src/lib/calc-engine-loan-startup-business.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-bail-holiday-calculators.ts
// or
//   npm run db:create-loan-bail-holiday-calculators

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
    slug: "bail-bond-loan-calculator",
    title: "Bail Bond Loan Calculator",
    description: "Work out a bail bond's premium, the down payment the bondsman wants, and the monthly payment on the rest through a payment plan.",
    metaTitle: "Bail Bond Calculator — Premium & Payment Plan",
    metaDescription: "Free bail bond calculator. See the bond premium, the down payment, the monthly payment plan amount, and the total you'll pay.",
    calcInputs: [
      currencyField("bailAmount", "Bail Amount Set by the Court", { default: 25000, max: 10000000, step: 500 }),
      percentField("premiumPercent", "Bond Premium", { default: 10, max: 25, step: 0.5 }),
      percentField("downPercent", "Down Payment (Share of the Premium)", { default: 30, max: 100, step: 5 }),
      percentField("annualRatePercent", "Plan Interest / Finance Rate", { default: 12, max: 36, step: 0.5, required: false }),
      numberField("months", "Months to Pay the Rest", { default: 10, min: 1, max: 36, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "bondPremium", label: "Bond Premium (Non-Refundable)", format: "currency" },
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "amountOnPaymentPlan", label: "Amount on the Payment Plan", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalPaid", label: "Total Paid", format: "currency" },
    ],
    instructions:
      "A bail bond agent posts the full bail for you in exchange for a non-refundable premium — commonly about 10% of " +
      "the bail, with the rate set or limited by state law. Many agents accept part of the premium upfront and the rest " +
      "in installments. Enter the bail, premium, down payment and plan terms.",
    examples:
      "Example: $25,000 bail at a 10% premium costs $2,500. Paying $750 down leaves " +
      "$1,750, or $184.77 a month for 10 months at 12% — $2,597.69 in all.",
    assumptions:
      "Collateral the agent may require (such as a car title or property) isn't included. Some states don't allow " +
      "commercial bail bonds. The premium is owed even if the case is dismissed. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I get the bail bond premium back?",
        answer: "No — the premium is the bondsman's fee. Cash bail paid directly to the court is usually refunded when the case ends, if all court dates were kept.",
      },
    ],
  },
  {
    slug: "bail-bond-loan-payment-calculator",
    title: "Bail Bond Loan Payment Calculator",
    description: "Split the balance you owe a bail bond agent into weekly, every-two-weeks or monthly payments, and see the total finance charges.",
    metaTitle: "Bail Bond Payment Plan Calculator — Weekly or Monthly",
    metaDescription: "Free bail bond payment calculator. See weekly, biweekly or monthly payments on a bail bond balance and the total charges.",
    calcInputs: [
      currencyField("balance", "Balance Owed to the Bail Agent", { default: 2000, max: 1000000, step: 50 }),
      percentField("annualRatePercent", "Plan Interest / Finance Rate", { default: 12, max: 36, step: 0.5, required: false }),
      numberField("months", "Months to Pay", { default: 8, min: 1, max: 36, step: 1 }),
      {
        key: "paymentsPerYear", label: "Payment Frequency", type: "dropdown", required: true, default: 52,
        options: [
          { label: "Weekly", value: 52 },
          { label: "Every Two Weeks", value: 26 },
          { label: "Monthly", value: 12 },
        ],
      },
    ],
    calcResult: { label: "Payment per Period", format: "currency" },
    calcResults: [
      { key: "numberOfPayments", label: "Number of Payments", format: "number" },
      { key: "paymentPerPeriod", label: "Payment per Period", format: "currency", highlight: true },
      { key: "monthlyEquivalent", label: "Monthly Equivalent", format: "currency" },
      { key: "totalInterestAndFees", label: "Total Finance Charges", format: "currency" },
    ],
    instructions:
      "Bail agents often take weekly payments that line up with paydays. Enter what you still owe, any finance rate, " +
      "how many months you have, and how often you'll pay. Missing payments can lead the agent to take collateral or " +
      "the co-signer to be pursued.",
    examples:
      "Example: $2,000 over 8 months paid weekly is 35 payments of $59.55 — about " +
      "$258.04 a month — with $84.16 of finance charges.",
    assumptions:
      "Equal payments; finance charges applied per period. Agents' plans and fees vary and may be regulated by the " +
      "state. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I can't keep up with bail bond payments?",
        answer: "Talk to the agent early — many will adjust the plan. Unpaid premium is a debt like any other and can go to collections.",
      },
    ],
  },
  {
    slug: "bail-bond-loan-cost-calculator",
    title: "Bail Bond Loan Cost Calculator",
    description: "Compare posting full cash bail — refunded later, minus court fees and the interest your money could have earned — with paying a bail bond premium.",
    metaTitle: "Cash Bail vs Bail Bond Cost Calculator",
    metaDescription: "Free bail bond cost calculator. Compare the real cost of posting cash bail with a non-refundable bail bond premium.",
    calcInputs: [
      currencyField("bailAmount", "Bail Amount", { default: 25000, max: 10000000, step: 500 }),
      percentField("premiumPercent", "Bail Bond Premium", { default: 10, max: 25, step: 0.5 }),
      percentField("courtFeePercent", "Court Fee Kept From Cash Bail", { default: 1, max: 10, step: 0.25, required: false }),
      numberField("caseMonths", "Months Until the Case Ends", { default: 9, min: 0, max: 60, step: 1 }),
      percentField("savingsRatePercent", "Interest the Cash Could Earn", { default: 4, max: 15, step: 0.25, required: false }),
    ],
    calcResult: { label: "Savings by Paying Cash Bail", format: "currency" },
    calcResults: [
      { key: "cashBailCost", label: "Cost of Posting Cash Bail", format: "currency" },
      { key: "interestGivenUp", label: "Interest Given Up While It's Held", format: "currency" },
      { key: "bondPremiumCost", label: "Cost of a Bail Bond", format: "currency" },
      { key: "savingsPayingCash", label: "Savings by Paying Cash Bail", format: "currency", highlight: true },
    ],
    instructions:
      "If you (or family) can post the full bail in cash, it's generally returned when the case ends — as long as " +
      "every court date is kept — minus any court fees or fines taken from it. A bond premium is never returned. Enter " +
      "the bail, premium, court fee, case length and what the money could have earned.",
    examples:
      "Example: posting $25,000 in cash for 9 months costs about $1,000 — a small court fee plus " +
      "$750 of interest given up. A bond at 10% costs $2,500, so paying cash saves " +
      "$1,500.",
    assumptions:
      "Assumes all court dates are kept so cash bail is refunded; some courts deduct fines, fees or restitution from it. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How long does it take to get cash bail back?",
        answer: "Usually weeks to a few months after the case ends, depending on the court. It's normally refunded to whoever posted it.",
      },
    ],
  },
  {
    slug: "bail-bond-loan-payoff-calculator",
    title: "Bail Bond Loan Payoff Calculator",
    description: "See how adding extra to your bail bond payment plan clears it sooner and cuts the finance charges.",
    metaTitle: "Bail Bond Payoff Calculator — Pay It Off Sooner",
    metaDescription: "Free bail bond payoff calculator. See how extra payments shorten a bail bond payment plan and how much in finance charges you save.",
    calcInputs: [
      currencyField("balance", "Balance Owed", { default: 1800, max: 1000000, step: 50 }),
      percentField("annualRatePercent", "Plan Interest / Finance Rate", { default: 12, max: 36, step: 0.5, required: false }),
      currencyField("monthlyPayment", "Current Monthly Payment", { default: 200, max: 100000, step: 5 }),
      currencyField("extraMonthly", "Extra Payment Each Month", { default: 100, max: 100000, step: 5 }),
    ],
    calcResult: { label: "Months With Extra Payments", format: "number" },
    calcResults: [
      { key: "monthsAtCurrentPayment", label: "Months at Your Current Payment", format: "number" },
      { key: "monthsWithExtra", label: "Months With Extra Payments", format: "number", highlight: true },
      { key: "monthsSaved", label: "Months Saved", format: "number" },
      { key: "chargesSaved", label: "Finance Charges Saved", format: "currency" },
    ],
    instructions:
      "The premium balance stays owed even after the case is over. Enter what you owe, the plan rate, your payment and " +
      "an extra amount. Once it's paid, ask the agent to release any collateral and confirm in writing.",
    examples:
      "Example: $1,800 paid at $200 a month takes 10 months. Adding $100 " +
      "cuts it to 7 months, saving $30.09 of charges.",
    assumptions:
      "Finance charge applied monthly on the balance. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When is collateral returned on a bail bond?",
        answer: "After the case ends (the bond is 'exonerated') and the premium is fully paid.",
      },
    ],
  },
  {
    slug: "holiday-loan-calculator",
    title: "Holiday Loan Calculator",
    description: "Budget the holidays — gifts, travel, hosting and decorations — subtract your savings, and see the payment on a holiday (Christmas) loan.",
    metaTitle: "Holiday & Christmas Loan Calculator — Budget & Payment",
    metaDescription: "Free holiday and Christmas loan calculator. Add up gifts, travel and hosting, subtract savings, and see the monthly payment and interest.",
    calcInputs: [
      currencyField("gifts", "Gifts", { default: 1500, max: 100000, step: 50 }),
      currencyField("travel", "Travel", { default: 800, max: 100000, step: 50, required: false }),
      currencyField("hosting", "Food & Hosting", { default: 400, max: 100000, step: 25, required: false }),
      currencyField("decorations", "Decorations & Other", { default: 200, max: 100000, step: 25, required: false }),
      currencyField("savings", "Savings You'll Use", { default: 500, max: 100000, step: 50, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 15, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 12, min: 3, max: 36, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalHolidayBudget", label: "Total Holiday Budget", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Set a budget for each part of the season, subtract what you've saved, and enter the loan's rate and term. " +
      "Keeping the term to a year or less means it's paid off before next holiday season.",
    examples:
      "Example: $1,500 of gifts plus travel, hosting and decorations comes to $2,900. After $500 of " +
      "savings, a $2,400 loan at 15% over 12 months costs $216.62 a month and " +
      "$199.44 of interest.",
    assumptions:
      "Fixed rate, equal monthly payments; origination fees not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a holiday loan better than a credit card?",
        answer: "Often, if its rate is lower than your card's — and the fixed payments make sure it's paid off by a set date instead of lingering.",
      },
    ],
  },
  {
    slug: "holiday-loan-payment-calculator",
    title: "Holiday Loan Payment Calculator",
    description: "Find the monthly payment that clears your holiday debt before next season — and how long and costly it is if you pay only the card minimum.",
    metaTitle: "Holiday Debt Payment Calculator — Before Next Season",
    metaDescription: "Free holiday loan payment calculator. See the payment to clear holiday debt before next season vs paying only the minimum.",
    calcInputs: [
      currencyField("balance", "Holiday Balance", { default: 2500, max: 100000, step: 50 }),
      percentField("annualRatePercent", "Interest Rate (APR)", { default: 22, max: 36, step: 0.05 }),
      numberField("monthsUntilNextHoliday", "Months Until Next Holiday Season", { default: 11, min: 1, max: 24, step: 1 }),
      percentField("minimumPercent", "Card Minimum Payment (% of Balance)", { default: 3, min: 0.5, max: 10, step: 0.5 }),
    ],
    calcResult: { label: "Payment to Clear It Before Next Season", format: "currency" },
    calcResults: [
      { key: "paymentToClearBeforeNextHoliday", label: "Payment to Clear It Before Next Season", format: "currency", highlight: true },
      { key: "interestIfCleared", label: "Interest If Cleared in Time", format: "currency" },
      { key: "minimumPayment", label: "Minimum Payment", format: "currency" },
      { key: "monthsAtMinimum", label: "Months at the Minimum", format: "number" },
      { key: "interestAtMinimum", label: "Interest at the Minimum", format: "currency" },
    ],
    instructions:
      "Enter your holiday balance, its APR, and how many months until the next season. The calculator shows the " +
      "payment that clears it in time, compared with paying the same minimum each month.",
    examples:
      "Example: $2,500 at 22% needs $253.03 a month to be gone in " +
      "11 months ($283.32 of interest). Paying just $75 would take " +
      "52 months and cost $1,399.03.",
    assumptions:
      "The minimum stays at the first month's amount; no new charges. Real card minimums fall as the balance falls, " +
      "making payoff even slower. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I used buy now, pay later for gifts?",
        answer: "Add those balances too. BNPL plans are often interest-free but have fixed due dates and late fees — make sure the payments fit alongside this one.",
      },
    ],
  },
  {
    slug: "holiday-loan-cost-calculator",
    title: "Holiday Loan Cost Calculator",
    description: "Compare borrowing for the holidays now with saving a little each month for next year — the loan's interest vs the interest your savings earn.",
    metaTitle: "Holiday Loan Cost Calculator — Borrow vs Save Ahead",
    metaDescription: "Free holiday loan cost calculator. Compare the interest on a holiday loan with saving monthly ahead of time in a holiday fund.",
    calcInputs: [
      currencyField("amount", "Holiday Amount", { default: 2000, max: 100000, step: 50 }),
      percentField("loanRatePercent", "Loan Interest Rate", { default: 18, max: 36, step: 0.05 }),
      numberField("termMonths", "Months (Loan Term / Saving Period)", { default: 12, min: 1, max: 36, step: 1 }),
      percentField("savingsRatePercent", "Savings Account Rate", { default: 4, max: 15, step: 0.05, required: false }),
    ],
    calcResult: { label: "Advantage of Saving Ahead", format: "currency" },
    calcResults: [
      { key: "loanMonthlyPayment", label: "Loan — Monthly Payment", format: "currency" },
      { key: "loanInterest", label: "Loan — Interest Paid", format: "currency" },
      { key: "monthlySavingNeeded", label: "Save Ahead — Monthly Amount", format: "currency" },
      { key: "interestEarnedSaving", label: "Save Ahead — Interest Earned", format: "currency" },
      { key: "advantageOfSavingAhead", label: "Advantage of Saving Ahead", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the amount, a loan rate, the number of months, and a savings rate. Borrowing means paying it back after " +
      "the holidays with interest; a holiday savings fund means setting money aside beforehand and earning interest. " +
      "This year's loan can become next year's savings habit.",
    examples:
      "Example: borrowing $2,000 at 18% for 12 months costs $183.36 a month and " +
      "$200.32 of interest. Saving $163.63 a month at 4% instead builds the same " +
      "amount and earns $36.40 — $236.72 better off.",
    assumptions:
      "Monthly deposits at the end of each month; rates stay the same. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a Christmas club account?",
        answer: "A savings account some banks and credit unions offer for holiday saving: you deposit regularly during the year and the money is released in the fall.",
      },
    ],
  },
  {
    slug: "holiday-loan-payoff-calculator",
    title: "Holiday Loan Payoff Calculator",
    description: "See how a January lump sum — a bonus, gift money or tax refund — plus a little extra each month wipes out holiday debt faster.",
    metaTitle: "Holiday Loan Payoff Calculator — Lump Sum + Extra",
    metaDescription: "Free holiday loan payoff calculator. Add a lump sum and extra monthly payments to clear holiday debt faster and save interest.",
    calcInputs: [
      currencyField("balance", "Holiday Debt Balance", { default: 3000, max: 100000, step: 50 }),
      percentField("annualRatePercent", "Interest Rate (APR)", { default: 20, max: 36, step: 0.05 }),
      currencyField("monthlyPayment", "Current Monthly Payment", { default: 150, max: 100000, step: 5 }),
      currencyField("lumpSum", "Lump Sum You Can Pay Now", { default: 800, max: 100000, step: 50, required: false }),
      currencyField("extraMonthly", "Extra Each Month", { default: 50, max: 100000, step: 5, required: false }),
    ],
    calcResult: { label: "Months With Your Plan", format: "number" },
    calcResults: [
      { key: "monthsAsIs", label: "Months at Your Current Payment", format: "number" },
      { key: "monthsWithPlan", label: "Months With Your Plan", format: "number", highlight: true },
      { key: "monthsSaved", label: "Months Saved", format: "number" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "Enter your holiday balance, its APR and your current payment, plus a lump sum you can put toward it now and " +
      "any extra each month.",
    examples:
      "Example: $3,000 at 20% paid at $150 a month takes 25 months. A $800 " +
      "lump sum plus $50 extra a month clears it in 13 months — 12 sooner — saving " +
      "$429.02.",
    assumptions:
      "No new charges; the APR stays the same. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I use savings to pay off holiday debt?",
        answer: "If the debt's rate is high and you'll still have an emergency cushion, yes — paying off a 20% balance is like earning 20% risk-free.",
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
