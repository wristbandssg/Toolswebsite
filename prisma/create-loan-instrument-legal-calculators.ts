// One-time (but safe to re-run) batch setup script: creates the Musical Instrument and Legal Fee Loan tools
// (8) of the Loan Calculators expansion 4, filed under Loan Calculators > Personal Loan Calculators.
// See src/lib/calc-engine-loan-instrument-legal.ts for the math and
// src/lib/calc-engine-loan-powersports.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-instrument-legal-calculators.ts
// or
//   npm run db:create-loan-instrument-legal-calculators

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
    slug: "musical-instrument-loan-calculator",
    title: "Musical Instrument Loan Calculator",
    description: "Finance a piano, guitar, drum kit or band instrument: add sales tax, subtract your down payment, and see the monthly payment and total cost.",
    metaTitle: "Musical Instrument Loan Calculator — Payment & Cost",
    metaDescription: "Free musical instrument loan calculator. Finance a piano, guitar or band instrument and see the monthly payment, interest and total cost.",
    calcInputs: [
      currencyField("price", "Instrument Price", { default: 4000, max: 500000, step: 50 }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 7, max: 15, step: 0.05 }),
      currencyField("downPayment", "Down Payment", { default: 400, max: 500000, step: 50, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 9.9, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 3, max: 120, step: 3 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCost", label: "Total Cost (Price, Tax & Interest)", format: "currency" },
    ],
    instructions:
      "Enter the instrument's price, sales tax, your down payment and the loan's rate and term. Music stores often " +
      "offer store financing; personal loans and credit unions are alternatives, and high-end pianos can be financed " +
      "over longer terms.",
    examples:
      "Example: a $4,000 instrument plus tax, less $400 down, leaves $3,880 to finance. At " +
      "9.90% over 36 months, the payment is $125.01, with $620.53 of interest — " +
      "$4,900.53 in total.",
    assumptions:
      "Sales tax is financed; fixed rate and equal monthly payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I finance a used piano or a private-sale instrument?",
        answer: "Store financing usually only covers its own stock, but a personal loan works for any seller.",
      },
    ],
  },
  {
    slug: "musical-instrument-loan-payment-calculator",
    title: "Musical Instrument Loan Payment Calculator",
    description: "Using a music store's 0% financing? Find the payment that clears it before the promo ends — and the deferred interest you'd owe if you fall short.",
    metaTitle: "Instrument Payment Calculator — 0% Promo & Deferred Interest",
    metaDescription: "Free musical instrument payment calculator. See the payment to clear a 0% promo in time and the deferred interest if a balance remains.",
    calcInputs: [
      currencyField("price", "Purchase Amount", { default: 3000, max: 100000, step: 50 }),
      numberField("promoMonths", "Promo Length (Months)", { default: 12, min: 1, max: 60, step: 1 }),
      currencyField("plannedPayment", "What You Plan to Pay Each Month", { default: 200, max: 100000, step: 5 }),
      percentField("deferredAprPercent", "Card APR If the Promo Isn't Paid Off", { default: 29.99, max: 40, step: 0.01 }),
    ],
    calcResult: { label: "Payment Needed to Clear the Promo", format: "currency" },
    calcResults: [
      { key: "requiredMonthlyPayment", label: "Payment Needed to Clear the Promo", format: "currency", highlight: true },
      { key: "balanceLeftAtPromoEnd", label: "Balance Left When the Promo Ends", format: "currency" },
      { key: "deferredInterestCharged", label: "Deferred Interest Charged", format: "currency" },
      { key: "totalIfBalanceLeft", label: "Amount Owed After the Promo", format: "currency" },
    ],
    instructions:
      "Many 0% instrument offers are 'deferred interest': no interest if you pay in full by the end of the promo, but " +
      "if any balance is left, all the interest since the purchase date is added. Enter the purchase, the promo length, " +
      "what you plan to pay, and the card's APR.",
    examples:
      "Example: $3,000 on a 12-month 0% plan needs $250 a month. Paying $200 " +
      "leaves $600 at the end, which triggers $569.81 of deferred interest at " +
      "29.99% — $1,169.81 owed after the promo.",
    assumptions:
      "Deferred interest is estimated on the declining balance at the card APR, with no minimum-payment changes. True " +
      "0% offers (not deferred) charge interest only on what's left after the promo. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I avoid deferred interest?",
        answer: "Divide the price by the promo months and pay at least that each month, or set up autopay a little higher to be safe.",
      },
    ],
  },
  {
    slug: "musical-instrument-loan-cost-calculator",
    title: "Musical Instrument Loan Cost Calculator",
    description: "Compare a rent-to-own instrument plan with buying the instrument on a loan over the same months — and see how much more rent-to-own costs.",
    metaTitle: "Instrument Rent-to-Own vs Loan Cost Calculator",
    metaDescription: "Free musical instrument cost calculator. Compare rent-to-own payments with a loan for the same instrument and see the extra cost.",
    calcInputs: [
      currencyField("price", "Instrument Price", { default: 1800, max: 100000, step: 50 }),
      currencyField("rentalPerMonth", "Rent-to-Own Payment per Month", { default: 70, max: 10000, step: 1 }),
      numberField("monthsToOwn", "Months Until You Own It", { default: 36, min: 1, max: 120, step: 1 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 9.9, max: 36, step: 0.05 }),
    ],
    calcResult: { label: "Extra Cost of Rent-to-Own", format: "currency" },
    calcResults: [
      { key: "rentToOwnTotal", label: "Rent-to-Own Total", format: "currency" },
      { key: "loanPayment", label: "Loan Payment", format: "currency" },
      { key: "loanTotal", label: "Loan Total", format: "currency" },
      { key: "extraCostOfRentToOwn", label: "Extra Cost of Rent-to-Own", format: "currency", highlight: true },
    ],
    instructions:
      "School band programs often rent instruments with each payment going toward ownership. That flexibility — you " +
      "can return it if your child quits — has a price. Enter the instrument's price, the monthly rental and how long " +
      "until you own it, and a loan rate to compare.",
    examples:
      "Example: a $1,800 instrument at $70 a month for 36 months costs $2,520 through " +
      "rent-to-own. A loan at 9.90% over the same months costs $58 a month and $2,087.87 in " +
      "total — rent-to-own costs $432.13 more.",
    assumptions:
      "Rental plans often include damage protection and repairs, which a loan doesn't. Sales tax not included. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is rent-to-own good for a beginner?",
        answer: "Often yes for the first months, since you can return the instrument if interest fades. Once it's clear they'll keep playing, buying is usually cheaper.",
      },
    ],
  },
  {
    slug: "musical-instrument-loan-payoff-calculator",
    title: "Musical Instrument Loan Payoff Calculator",
    description: "See how much sooner you'll own your instrument outright, and the interest you'll save, by paying a little extra each month.",
    metaTitle: "Musical Instrument Loan Payoff Calculator",
    metaDescription: "Free musical instrument loan payoff calculator. Add an extra amount each month and see your new payoff time and interest saved.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 3500, max: 500000, step: 50 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 36, step: 0.05 }),
      numberField("remainingMonths", "Months Left", { default: 36, min: 1, max: 120, step: 1 }),
      currencyField("extraMonthly", "Extra Payment Each Month", { default: 40, max: 10000, step: 5 }),
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
      "Enter your balance, rate, months left and an extra amount you can add each month — for example, gig income.",
    examples:
      "Example: $3,500 at 12% with 36 months left costs $116.25 a month. " +
      "Paying $156.25 clears it in 26 months — 10 sooner — saving $202.49.",
    assumptions:
      "Fixed rate, no prepayment penalty. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I pay off my instrument loan or keep cash for upgrades?",
        answer: "If the loan's rate is high, paying it off is a guaranteed saving. Keep some cash for maintenance like piano tuning or setup.",
      },
    ],
  },
  {
    slug: "legal-fee-loan-calculator",
    title: "Legal Fee Loan Calculator",
    description: "Estimate your attorney's bill from hours and hourly rate plus court costs, subtract your savings, and see the loan and monthly payment to cover it.",
    metaTitle: "Legal Fee Loan Calculator — Attorney Bill & Payment",
    metaDescription: "Free legal fee loan calculator. Estimate legal costs from hours and rates, subtract savings, and see the loan amount and monthly payment.",
    calcInputs: [
      currencyField("hourlyRate", "Attorney's Hourly Rate", { default: 300, max: 2000, step: 5 }),
      numberField("hours", "Estimated Hours", { default: 40, min: 0, max: 2000, step: 1 }),
      currencyField("courtCosts", "Court Costs, Filing & Expert Fees", { default: 1500, max: 1000000, step: 50, required: false }),
      currencyField("savings", "Savings You'll Use", { default: 3000, max: 1000000, step: 100, required: false }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 12, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 36, min: 6, max: 84, step: 6 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "estimatedLegalBill", label: "Estimated Legal Bill", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "For a divorce, custody case, criminal defense or other matter billed by the hour, ask the attorney for an " +
      "estimate of hours. Enter the rate, hours, court and expert costs, and the savings you'll put in; the rest is " +
      "what you'd borrow, usually with a personal loan.",
    examples:
      "Example: 40 hours at $300 plus $1,500 of costs makes a $13,500 bill. After " +
      "$3,000 of savings, you'd borrow $10,500: at 12% over 36 months that's " +
      "$348.75 a month and $2,055.01 of interest.",
    assumptions:
      "Legal cases often run over estimates — consider borrowing a cushion or keeping savings in reserve. Fixed rate. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get a loan to pay a lawyer?",
        answer: "Yes — personal loans can be used for legal fees, and some firms partner with lenders. Also ask about payment plans, flat fees, or legal aid if you qualify.",
      },
    ],
  },
  {
    slug: "legal-fee-loan-payment-calculator",
    title: "Legal Fee Loan Payment Calculator",
    description: "Compare paying your law firm in monthly installments (with interest on the unpaid balance) against paying the bill with a personal loan.",
    metaTitle: "Legal Fee Payment Plan vs Loan Calculator",
    metaDescription: "Free legal fee payment calculator. Compare a law firm's installment plan with a personal loan by time to repay and interest.",
    calcInputs: [
      currencyField("amount", "Legal Bill to Pay Over Time", { default: 12000, max: 1000000, step: 100 }),
      percentField("firmMonthlyRatePercent", "Firm's Interest per Month on Unpaid Balance", { default: 1.5, max: 5, step: 0.1 }),
      currencyField("firmMonthlyPayment", "Monthly Payment the Firm Accepts", { default: 600, max: 100000, step: 10 }),
      percentField("loanRatePercent", "Personal Loan Rate (Annual)", { default: 11, max: 36, step: 0.05 }),
      numberField("loanTermMonths", "Personal Loan Term (Months)", { default: 24, min: 6, max: 84, step: 6 }),
    ],
    calcResult: { label: "Savings With the Loan", format: "currency" },
    calcResults: [
      { key: "firmPlanMonths", label: "Firm Plan — Months to Repay", format: "number" },
      { key: "firmPlanInterest", label: "Firm Plan — Interest", format: "currency" },
      { key: "loanPayment", label: "Loan — Monthly Payment", format: "currency" },
      { key: "loanInterest", label: "Loan — Interest", format: "currency" },
      { key: "savingsWithLoan", label: "Savings With the Loan", format: "currency", highlight: true },
    ],
    instructions:
      "Law firms that let you pay over time often charge interest on unpaid invoices, commonly around 1%–1.5% a " +
      "month (12%–18% a year). Enter the bill, the firm's monthly rate and the payment it accepts, then a personal " +
      "loan's rate and term. A negative saving means the firm's plan is cheaper.",
    examples:
      "Example: paying a $12,000 bill to the firm at $600 a month with 1.50% monthly " +
      "interest takes 24 months and costs $2,373.92. A loan at 11% over " +
      "24 months costs $559.29 a month and $1,423.06 — saving $950.86.",
    assumptions:
      "No new legal charges are added during repayment. Firm interest compounds monthly on the unpaid balance. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Will my lawyer keep working if I owe them money?",
        answer: "It depends on the agreement and court rules. Lawyers may withdraw for non-payment in some situations, so agree a plan you can keep up with.",
      },
    ],
  },
  {
    slug: "legal-fee-loan-cost-calculator",
    title: "Legal Fee Loan Cost Calculator",
    description: "See what pre-settlement (lawsuit) funding really costs: the amount owed when your case settles and what's left for you after the attorney's fee.",
    metaTitle: "Lawsuit Loan Cost Calculator — Pre-Settlement Funding",
    metaDescription: "Free pre-settlement funding cost calculator. See what you'll owe at settlement with simple or compound fees and your net recovery.",
    calcInputs: [
      currencyField("advance", "Cash Advance Received", { default: 10000, max: 1000000, step: 100 }),
      percentField("monthlyFeePercent", "Fee per Month", { default: 3, max: 10, step: 0.1 }),
      {
        key: "compounding", label: "How the Fee Grows", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Compounding Monthly", value: 1 },
          { label: "Simple (Non-Compounding)", value: 0 },
        ],
      },
      numberField("monthsToSettlement", "Months Until the Case Settles", { default: 18, min: 0, max: 120, step: 1 }),
      currencyField("settlement", "Expected Settlement", { default: 100000, max: 100000000, step: 1000 }),
      percentField("attorneyFeePercent", "Attorney's Contingency Fee", { default: 33.33, max: 50, step: 0.01 }),
    ],
    calcResult: { label: "Amount Owed at Settlement", format: "currency" },
    calcResults: [
      { key: "amountOwedAtSettlement", label: "Amount Owed at Settlement", format: "currency", highlight: true },
      { key: "fundingCost", label: "Cost of the Funding", format: "currency" },
      { key: "attorneyFee", label: "Attorney's Fee", format: "currency" },
      { key: "yourNetRecovery", label: "What's Left for You", format: "currency" },
    ],
    instructions:
      "Pre-settlement funding advances cash against a pending injury or other lawsuit; you repay only if you win " +
      "(non-recourse), from the settlement. Fees are charged monthly and can compound, so the cost grows fast the " +
      "longer the case takes. Enter the advance, the monthly fee and whether it compounds, the expected time to " +
      "settle, the settlement and your lawyer's contingency fee.",
    examples:
      "Example: a $10,000 advance at 3% a month, compounding, grows to $17,024.33 after " +
      "18 months — a $7,024.33 cost. From a $100,000 settlement, after the $33,330 " +
      "attorney's fee and the funding, $49,645.67 is left for you.",
    assumptions:
      "Medical liens and case costs, which also come out of the settlement, aren't included. Some contracts cap fees or " +
      "charge in 6-month blocks. Rules on lawsuit funding vary by state. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is pre-settlement funding a loan?",
        answer: "Legally it's usually structured as a non-recourse advance, not a loan — you owe nothing if you lose. That risk is why it costs far more than a typical loan.",
      },
    ],
  },
  {
    slug: "legal-fee-loan-payoff-calculator",
    title: "Legal Fee Loan Payoff Calculator",
    description: "See how putting a lump sum — such as attorney's fees the court ordered the other side to pay — toward your legal fee loan shortens it and saves interest.",
    metaTitle: "Legal Fee Loan Payoff Calculator — Lump Sum",
    metaDescription: "Free legal fee loan payoff calculator. Apply a lump sum to your loan and see the new payoff time and the interest you save.",
    calcInputs: [
      currencyField("balance", "Current Loan Balance", { default: 15000, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 36, step: 0.05 }),
      numberField("remainingMonths", "Months Left", { default: 30, min: 1, max: 120, step: 1 }),
      currencyField("lumpSum", "Lump Sum You Can Pay Now", { default: 6000, max: 1000000, step: 100 }),
    ],
    calcResult: { label: "Months to Payoff", format: "number" },
    calcResults: [
      { key: "currentPayment", label: "Monthly Payment (Unchanged)", format: "currency" },
      { key: "balanceAfterLumpSum", label: "Balance After the Lump Sum", format: "currency" },
      { key: "monthsToPayoff", label: "Months to Payoff", format: "number", highlight: true },
      { key: "monthsSaved", label: "Months Saved", format: "number" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "In some cases a court orders the other side to pay your legal fees, or you receive a settlement, tax refund or " +
      "bonus. Enter your balance, rate, months left and the lump sum; you keep paying the same monthly amount, so the " +
      "loan ends sooner.",
    examples:
      "Example: $15,000 at 12% with 30 months left costs $581.22 a month. A " +
      "$6,000 lump sum drops the balance to $9,000, so it's paid off in 17 months — " +
      "13 sooner — saving $1,609.32.",
    assumptions:
      "Fixed rate, no prepayment penalty; the lump sum goes to principal today. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I lower my payment instead of shortening the loan?",
        answer: "Some lenders will re-amortize (recast) after a large payment if you ask; otherwise refinancing the smaller balance is an option.",
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
