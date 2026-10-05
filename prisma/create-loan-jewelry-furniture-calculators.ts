// One-time (but safe to re-run) batch setup script: creates the 8 tools
// of the Loan Calculators expansion 2, sub-batch 2 (Jewelry & Furniture Loans),
// filed under Finance Calculators > Loan Calculators > Personal Loan Calculators. See src/lib/calc-engine-loan-jewelry-furniture.ts for
// the math and src/lib/calc-engine-loan-life-events.ts for the full batch
// context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-jewelry-furniture-calculators.ts
// or
//   npm run db:create-loan-jewelry-furniture-calculators

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
    slug: "jewelry-loan-calculator",
    title: "Jewelry Loan Calculator",
    description: "Estimate how much you can borrow against gold jewelry from its weight, karat and today's gold price, and what you'll repay with interest.",
    metaTitle: "Jewelry Loan Calculator — Gold Loan Amount & Interest",
    metaDescription: "Free jewelry (gold) loan calculator. Value your gold by weight and karat, apply the lender's LTV, and see the loan and total to repay.",
    calcInputs: [
      numberField("weightGrams", "Gold Weight (Grams)", { default: 50, min: 0, max: 100000, step: 0.5 }),
      numberField("karat", "Karat (Purity)", { default: 22, min: 1, max: 24, step: 1 }),
      currencyField("pricePerGram24k", "Gold Price per Gram (24K)", { default: 120, max: 100000, step: 0.5 }),
      percentField("ltvPercent", "Lender's Loan-to-Value", { default: 75, max: 100, step: 1 }),
      currencyField("amountWanted", "Amount You Want to Borrow", { default: 3500, max: 10000000, step: 50 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 12, max: 60, step: 0.1 }),
      numberField("months", "Months Until You Repay", { default: 6, min: 1, max: 36, step: 1 }),
    ],
    calcResult: { label: "Total to Repay", format: "currency" },
    calcResults: [
      { key: "goldValue", label: "Value of the Gold", format: "currency" },
      { key: "maxLoan", label: "Most You Can Borrow", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "interest", label: "Interest", format: "currency" },
      { key: "totalToRepay", label: "Total to Repay", format: "currency", highlight: true },
    ],
    instructions:
      "A gold loan lends money against jewelry, valued on the pure gold it contains — not on design or stones. Enter " +
      "the weight in grams, the karat (24K is pure gold, 22K is 91.7%, 18K is 75%), today's 24K price per gram, the " +
      "lender's loan-to-value limit, the amount you want, and the rate and months until you repay.",
    examples:
      "Example: 50 grams of 22K gold at $120 per gram (24K) contains $5,500 of gold. At a 75% LTV you can borrow up to " +
      "$4,125. Borrowing $3,500 at 12% for 6 months costs $210 of interest, so you repay $3,710.",
    assumptions:
      "Interest is simple interest paid at the end. Lenders test purity themselves and may deduct stone weight. If you " +
      "don't repay, the lender can sell the jewelry. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is a gold loan different from pawning?",
        answer: "A pawn shop lends a share of what it could resell the item for. A gold loan is priced on the gold's weight and purity, usually at a higher loan-to-value and lower rate, and is common at banks and lenders in countries like India.",
      },
    ],
  },
  {
    slug: "jewelry-loan-payment-calculator",
    title: "Jewelry Loan Payment Calculator",
    description: "See the monthly payment for financing an engagement ring or other jewelry, its share of your take-home pay, and the total cost with interest.",
    metaTitle: "Jewelry Loan Payment Calculator — Ring Financing",
    metaDescription: "Free jewelry financing calculator. See the monthly payment on a ring or other jewelry, its share of take-home pay, and the total with interest.",
    calcInputs: [
      currencyField("price", "Jewelry Price", { default: 6000, max: 10000000, step: 100 }),
      currencyField("downPayment", "Down Payment", { default: 1000, max: 10000000, step: 100, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 18, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 3, max: 72, step: 3 }),
      currencyField("monthlyTakeHome", "Monthly Take-Home Pay", { default: 4000, max: 1000000, step: 100 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "shareOfTakeHomePercent", label: "Share of Take-Home Pay", format: "percentage" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCost", label: "Total Cost of the Jewelry", format: "currency" },
    ],
    instructions:
      "Enter the price, your down payment, the financing rate and term (jewelers' store cards often carry high " +
      "rates after any promotion ends), and your monthly take-home pay.",
    examples:
      "Example: a $6,000 ring with $1,000 down leaves $5,000 to finance — $249.62 a month at 18% over 24 months, 6.24% " +
      "of $4,000 take-home pay. Interest adds $990.89, so the ring costs $6,990.89.",
    assumptions:
      "Assumes a fixed rate. If the store offers a deferred-interest promo, missing it can add interest back to the " +
      "purchase date. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much should an engagement ring cost?",
        answer: "There's no rule — old 'months of salary' guidelines came from advertising. Choose an amount you can pay off quickly without straining your budget.",
      },
    ],
  },
  {
    slug: "jewelry-loan-cost-calculator",
    title: "Jewelry Loan Cost Calculator",
    description: "Compare the interest on a gold jewelry loan repaid in one lump sum at the end with repaying it in monthly installments (EMIs).",
    metaTitle: "Jewelry Loan Cost Calculator — Bullet vs EMI",
    metaDescription: "Free gold loan cost calculator. Compare a bullet (lump-sum) repayment with monthly EMIs and see which costs less interest.",
    calcInputs: [
      currencyField("loanAmount", "Gold Loan Amount", { default: 3000, max: 10000000, step: 50 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 12, max: 60, step: 0.1 }),
      numberField("months", "Loan Term (Months)", { default: 12, min: 1, max: 36, step: 1 }),
    ],
    calcResult: { label: "Saved by Paying EMIs", format: "currency" },
    calcResults: [
      { key: "bulletInterest", label: "Bullet — Interest", format: "currency" },
      { key: "bulletRepayment", label: "Bullet — Repay at the End", format: "currency" },
      { key: "emiPayment", label: "EMI — Monthly Installment", format: "currency" },
      { key: "emiInterest", label: "EMI — Total Interest", format: "currency" },
      { key: "emiSaves", label: "Saved by Paying EMIs", format: "currency", highlight: true },
    ],
    instructions:
      "Gold loans are often repaid as a 'bullet' — interest and principal together at the end — or in equal monthly " +
      "installments. Enter the loan amount, rate, and term to compare the interest. Bullet repayment keeps monthly " +
      "costs at zero but charges interest on the full amount the whole time.",
    examples:
      "Example: a $3,000 gold loan at 12% for 12 months costs $360 of interest as a bullet loan — $3,360 at the end. " +
      "Repaid in EMIs of $266.55, interest is $198.56, saving $161.44.",
    assumptions:
      "Bullet interest is simple interest; EMIs use monthly amortization. Some lenders compound unpaid interest on " +
      "bullet loans, which costs more. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I pay just the interest monthly?",
        answer: "Many lenders allow monthly interest-only payments with the principal at the end. That costs the same as the bullet's simple interest but avoids a big final bill for interest.",
      },
    ],
  },
  {
    slug: "jewelry-loan-payoff-calculator",
    title: "Jewelry Loan Payoff Calculator",
    description: "If gold prices fall, see your gold loan's new loan-to-value, the part-payment needed to get back under the lender's limit, and the price that triggers it.",
    metaTitle: "Jewelry Loan Payoff Calculator — Gold Price Drop",
    metaDescription: "Free gold loan payoff calculator. See your loan-to-value after a gold price drop and the part-payment needed to stay under the limit.",
    calcInputs: [
      currencyField("amountOwed", "Amount Owed (Incl. Interest)", { default: 3600, max: 10000000, step: 50 }),
      numberField("weightGrams", "Gold Weight Pledged (Grams)", { default: 50, min: 0, max: 100000, step: 0.5 }),
      numberField("karat", "Karat (Purity)", { default: 22, min: 1, max: 24, step: 1 }),
      currencyField("pricePerGram24k", "Gold Price per Gram Now (24K)", { default: 100, max: 100000, step: 0.5 }),
      percentField("maxLtvPercent", "Lender's Maximum LTV", { default: 75, max: 100, step: 1 }),
    ],
    calcResult: { label: "Part-Payment Needed", format: "currency" },
    calcResults: [
      { key: "goldValueNow", label: "Gold Value Now", format: "currency" },
      { key: "currentLtvPercent", label: "Current Loan-to-Value", format: "percentage" },
      { key: "maxAllowedLoan", label: "Most the Lender Allows Now", format: "currency" },
      { key: "partPaymentNeeded", label: "Part-Payment Needed", format: "currency", highlight: true },
      { key: "priceAtLtvLimit", label: "Gold Price That Hits the Limit", format: "currency" },
    ],
    instructions:
      "When gold prices fall, your gold is worth less, so the loan becomes a bigger share of its value. If the " +
      "loan-to-value goes over the lender's limit, you may be asked to repay part of the loan or pledge more gold. " +
      "Enter what you owe, the gold's weight and karat, today's price, and the lender's limit.",
    examples:
      "Example: owing $3,600 against 50 grams of 22K gold, a drop to $100 per gram values the gold at $4,583.33 — an " +
      "LTV of 78.55%, above a 75% limit. The lender allows $3,437.50, so a $162.50 part-payment is needed. The limit " +
      "is hit once the price falls below $104.73 per gram.",
    assumptions:
      "Lenders may also auction pledged gold if a shortfall isn't covered in time — read the loan's terms. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I pledge more gold instead of paying?",
        answer: "Often, yes. Adding more gold raises the security's value and brings the loan-to-value back down without a cash payment.",
      },
    ],
  },
  {
    slug: "furniture-loan-calculator",
    title: "Furniture Loan Calculator",
    description: "Add delivery, assembly and sales tax to the furniture price, subtract your down payment, and see the amount financed and monthly payment.",
    metaTitle: "Furniture Loan Calculator — Payment With Tax & Delivery",
    metaDescription: "Free furniture loan calculator. Add delivery and sales tax, subtract your down payment, and see the amount financed and monthly payment.",
    calcInputs: [
      currencyField("itemsPrice", "Furniture Price", { default: 4500, max: 10000000, step: 50 }),
      currencyField("deliveryAssembly", "Delivery & Assembly", { default: 200, max: 100000, step: 10, required: false }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 7, max: 15, step: 0.125 }),
      currencyField("downPayment", "Down Payment", { default: 500, max: 10000000, step: 50, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 20, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 3, max: 72, step: 3 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Sales Tax", format: "currency" },
      { key: "totalPrice", label: "Total Price", format: "currency" },
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the furniture price, delivery and assembly charges, your sales tax rate, down payment, and the financing " +
      "rate and term. If you're offered 0% financing, enter 0 for the rate — and check whether it's a true 0% or a " +
      "deferred-interest promotion.",
    examples:
      "Example: $4,500 of furniture plus $200 delivery and 7% tax ($315) comes to $5,015. After $500 down you finance " +
      "$4,515 — $229.79 a month at 20% over 24 months, with $1,000.07 of interest.",
    assumptions:
      "Sales tax is applied to the furniture only; some states also tax delivery. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is store financing a good deal?",
        answer: "A true 0% promo you pay off in time is free money. Otherwise, store card rates are often higher than a personal loan or credit union — compare before you sign.",
      },
    ],
  },
  {
    slug: "furniture-loan-payment-calculator",
    title: "Furniture Loan Payment Calculator",
    description: "Compare weekly rent-to-own furniture payments — and the APR they really add up to — with the monthly payment on a furniture loan.",
    metaTitle: "Furniture Loan Payment Calculator — Rent-to-Own vs Loan",
    metaDescription: "Free calculator comparing rent-to-own furniture with a loan. See total cost, the hidden APR of rent-to-own, and the loan payment.",
    calcInputs: [
      currencyField("cashPrice", "Cash Price of the Furniture", { default: 1500, max: 1000000, step: 25 }),
      currencyField("rtoWeekly", "Rent-to-Own Weekly Payment", { default: 40, max: 10000, step: 1 }),
      numberField("rtoWeeks", "Rent-to-Own Weeks to Ownership", { default: 78, min: 1, max: 260, step: 1 }),
      percentField("loanRatePercent", "Loan Interest Rate", { default: 25, max: 40, step: 0.05 }),
      numberField("loanTermMonths", "Loan Term (Months)", { default: 18, min: 3, max: 60, step: 3 }),
    ],
    calcResult: { label: "Saved With the Loan", format: "currency" },
    calcResults: [
      { key: "rentToOwnTotal", label: "Rent-to-Own — Total Paid", format: "currency" },
      { key: "rentToOwnMarkup", label: "Rent-to-Own — Paid Above Cash Price", format: "currency" },
      { key: "rentToOwnApr", label: "Rent-to-Own — Equivalent APR", format: "percentage" },
      { key: "loanMonthlyPayment", label: "Loan — Monthly Payment", format: "currency" },
      { key: "loanTotal", label: "Loan — Total Paid", format: "currency" },
      { key: "loanSaves", label: "Saved With the Loan", format: "currency", highlight: true },
    ],
    instructions:
      "Rent-to-own stores quote a small weekly payment but don't show an interest rate. Enter the cash price, the " +
      "weekly payment and number of weeks to ownership, and a loan's rate and term. The tool works out the APR the " +
      "weekly payments add up to, so you can compare them fairly.",
    examples:
      "Example: $1,500 of furniture rented-to-own at $40 a week for 78 weeks costs $3,120 — $1,620 more than the cash " +
      "price, equal to an APR of 112.58%. An 18-month loan at 25% costs $100.79 a month and $1,814.18 in total, saving " +
      "$1,305.82.",
    assumptions:
      "Rent-to-own lets you return the item and stop paying, which a loan doesn't — that flexibility is part of what " +
      "you're paying for. Rent-to-own isn't regulated as credit in most states. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I buy out a rent-to-own agreement early?",
        answer: "Usually, yes — most stores offer an early purchase option that costs less than finishing all the payments. Ask for the buyout price in writing.",
      },
    ],
  },
  {
    slug: "furniture-loan-cost-calculator",
    title: "Furniture Loan Cost Calculator",
    description: "Add up everything a financed furniture purchase really costs — sales tax, delivery, a protection plan and interest — compared with the sticker price.",
    metaTitle: "Furniture Loan Cost Calculator — True Total Cost",
    metaDescription: "Free furniture loan cost calculator. Add tax, delivery, a protection plan and interest to see the true cost and how far above the sticker price it is.",
    calcInputs: [
      currencyField("stickerPrice", "Sticker Price", { default: 3000, max: 10000000, step: 50 }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 7, max: 15, step: 0.125 }),
      currencyField("delivery", "Delivery", { default: 150, max: 100000, step: 10, required: false }),
      currencyField("protectionPlan", "Protection Plan / Warranty", { default: 250, max: 100000, step: 10, required: false }),
      currencyField("downPayment", "Down Payment", { default: 0, max: 10000000, step: 50, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 22, max: 40, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 24, min: 3, max: 72, step: 3 }),
    ],
    calcResult: { label: "Cost Above Sticker Price", format: "percentage" },
    calcResults: [
      { key: "addOns", label: "Tax, Delivery & Protection Plan", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency" },
      { key: "costAboveStickerPercent", label: "Cost Above Sticker Price", format: "percentage", highlight: true },
    ],
    instructions:
      "Enter the sticker price, your sales tax rate, delivery, any protection plan you're offered, your down payment, " +
      "and the financing rate and term. The tool shows how much the extras and interest add, as a percentage of the " +
      "price on the tag.",
    examples:
      "Example: a $3,000 sofa set plus 7% tax, $150 delivery, and a $250 protection plan comes to $3,610. Financed at " +
      "22% over 24 months ($187.28 a month), interest adds $884.72 — a total of $4,494.72, or 49.82% above the sticker " +
      "price.",
    assumptions:
      "Protection plans are optional — check what they cover and whether your credit card or the manufacturer " +
      "already offers similar protection. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I lower the total?",
        answer: "Skip optional add-ons, pick up the furniture yourself, buy during sales, and pay as much as you can upfront so less is financed.",
      },
    ],
  },
  {
    slug: "furniture-loan-payoff-calculator",
    title: "Furniture Loan Payoff Calculator",
    description: "On a true 0% furniture promo, see the payment that clears it in time — and, at your planned payment, the balance and interest once the promo ends.",
    metaTitle: "Furniture Loan Payoff Calculator — 0% Promo",
    metaDescription: "Free furniture loan payoff calculator. Find the payment to clear a 0% promo and the balance and interest left after it ends at your payment.",
    calcInputs: [
      currencyField("balance", "Amount Financed", { default: 3600, max: 10000000, step: 50 }),
      numberField("promoMonths", "0% Promo Length (Months)", { default: 12, min: 0, max: 60, step: 1 }),
      currencyField("monthlyPayment", "What You'll Pay Each Month", { default: 200, max: 100000, step: 5 }),
      percentField("aprAfterPercent", "APR After the Promo", { default: 29.99, max: 40, step: 0.01 }),
    ],
    calcResult: { label: "Payment to Clear It in the Promo", format: "currency" },
    calcResults: [
      { key: "paymentToClearInPromo", label: "Payment to Clear It in the Promo", format: "currency", highlight: true },
      { key: "balanceAtPromoEnd", label: "Balance When the Promo Ends", format: "currency" },
      { key: "monthsAfterPromo", label: "Months to Pay Off After the Promo", format: "number", unit: "months" },
      { key: "interestAfterPromo", label: "Interest After the Promo", format: "currency" },
    ],
    instructions:
      "Enter the amount financed, the 0% promo length, your monthly payment, and the APR that starts after the promo. " +
      "This tool is for a true 0% offer, where interest only starts on what's left after the promo. If your offer says " +
      "'deferred interest' or 'no interest if paid in full', interest can be charged back to the purchase date " +
      "instead — use the Dental Loan Payoff Calculator to estimate that.",
    examples:
      "Example: $3,600 on a 12-month 0% promo needs $300 a month to clear in time. Paying $200 leaves $1,200 when the " +
      "promo ends; at 29.99% it takes 7 more months and $116.89 of interest.",
    assumptions:
      "Assumes no new purchases on the account and the same payment after the promo. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I know if my promo is deferred interest?",
        answer: "Look for 'no interest if paid in full within…' — that's deferred interest. A true 0% APR says the APR is 0% for the promo period.",
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
