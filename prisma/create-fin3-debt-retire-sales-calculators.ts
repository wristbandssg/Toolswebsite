// One-time (but safe to re-run) batch setup script: creates the 8 tools of
// finance expansion 3 sub-batch "debt-retire-sales". See
// src/lib/calc-engine-fin3-derivatives-tax.ts for the full list of 10
// sub-batches, and src/lib/calc-engine-fin3-debt-retire-sales.ts for the math. Each tool
// is filed in the Finance Calculators sub-category the user named for it
// (created on first run; Retirement Calculators already exists).
//
// HOW TO RUN
//   npx tsx prisma/create-fin3-debt-retire-sales-calculators.ts
// or
//   npm run db:create-fin3-debt-retire-sales-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const FINANCE_SLUGS = ["finance-calculators", "finance"];

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
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

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "This tool gives estimates for learning and planning only and isn't financial, investment or tax advice. Results depend entirely on your inputs — check important decisions with a qualified professional.";

interface ToolDef {
  slug: string;
  category: { name: string; slug: string };
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const num = (key: string, label: string, highlight = false, decimals?: number) => ({ key, label, format: "number", ...(decimals !== undefined ? { decimals } : {}), ...(highlight ? { highlight: true } : {}) });
const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });


const DEBT_MANAGEMENT = { name: "Debt Management Calculators", slug: "debt-management-calculators" };
const RETIREMENT = { name: "Retirement Calculators", slug: "retirement-calculators" };
const SALES = { name: "Sales Calculators", slug: "sales-calculators" };

const TOOLS: ToolDef[] = [
  {
    slug: "debt-avalanche-calculator",
    category: DEBT_MANAGEMENT,
    title: "Debt Avalanche Calculator",
    description: "Plan your debt payoff with the avalanche method — extra money to the highest interest rate first — and compare months and interest with the snowball method.",
    metaTitle: "Debt Avalanche Calculator — Avalanche vs Snowball",
    metaDescription: "Free debt avalanche calculator. Pay off up to 5 debts highest-APR first and see payoff time, total interest and how much you save versus the debt snowball.",
    calcInputs: [...Array.from({ length: 5 }, (_, i) => [
      currencyField(`balance${i + 1}`, `Debt ${i + 1} — Balance`, { default: [4000, 9000, 2500, 0, 0][i], max: 10000000, step: 10, required: false }),
      percentField(`apr${i + 1}`, `Debt ${i + 1} — APR`, { default: [24, 7, 18, 0, 0][i], step: 0.1, required: false }),
      currencyField(`minPayment${i + 1}`, `Debt ${i + 1} — Minimum Payment`, { default: [120, 180, 75, 0, 0][i], max: 1000000, step: 5, required: false }),
    ]).flat(), currencyField("extraPayment", "Extra Payment per Month", { default: 200, max: 1000000, step: 10 })],
    calcResult: { label: "Interest Saved", format: "currency" },
    calcResults: [cur("totalDebt", "Total Debt"), num("avalancheMonths", "Months to Debt-Free — Avalanche"), cur("avalancheInterest", "Total Interest — Avalanche"), num("snowballMonths", "Months to Debt-Free — Snowball"), cur("snowballInterest", "Total Interest — Snowball"), cur("interestSaved", "Interest Saved with Avalanche", true)],
    instructions: "List each debt's balance, APR and minimum payment, and the extra amount you can add each month. The avalanche pays minimums on everything and puts every spare dollar on the highest-rate debt; when it's gone, its payment rolls to the next.",
    examples: "Example: $4,000 at 24%, $9,000 at 7% and $2,500 at 18% with $375 of minimums plus $200 extra are paid off in 32 months either way — but the avalanche costs $2,343 of interest, saving about $154 over paying the smallest balance first.",
    assumptions: "Interest compounds monthly on each balance; minimum payments stay fixed and freed-up payments roll over. The snowball (smallest balance first) costs more but gives quicker wins — see the Debt Snowball Calculator. " + DISCLAIMER,
    faq: [
      { question: "Is avalanche or snowball better?", answer: "Avalanche always costs the least interest; snowball can keep you motivated with early payoffs. The best plan is the one you stick to." },
      { question: "What if two debts have the same rate?", answer: "Pay the smaller one first — you free up its minimum payment sooner." },
    ],
  },
  {
    slug: "deferred-payment-loan-calculator",
    category: DEBT_MANAGEMENT,
    title: "Deferred Payment Loan Calculator",
    description: "Calculate a loan with deferred payments — the interest that builds up during the deferral, the payment when repayment starts, and the extra cost versus paying from day one.",
    metaTitle: "Deferred Payment Loan Calculator — Interest During Deferral",
    metaDescription: "Free deferred payment loan calculator. See interest accrued during a payment deferral, the new balance and payment, and what the deferral costs in total.",
    calcInputs: [currencyField("loanAmount", "Loan Amount", { default: 20000, max: 100000000, step: 100 }), percentField("apr", "Interest Rate (APR)", { default: 8, max: 50, step: 0.01 }), numberField("deferralMonths", "Months of Deferral", { default: 6, max: 120 }), numberField("repaymentMonths", "Repayment Term after Deferral (months)", { default: 60, min: 1, max: 480 }), dropdown("interestTreatment", "Interest During Deferral", [["Added to the balance (capitalized)", 1], ["Paid separately / subsidized", 2]], 1)],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [cur("interestDuringDeferral", "Interest Built Up During Deferral"), cur("balanceWhenRepaymentStarts", "Balance When Repayment Starts"), cur("monthlyPayment", "Monthly Payment", true), cur("totalInterest", "Total Interest over Repayment"), cur("paymentWithoutDeferral", "Payment with No Deferral"), cur("extraCostOfDeferral", "Extra Interest from Deferral")],
    instructions: "Enter the loan, rate, how long payments are deferred and the repayment term afterwards. Most deferred private and unsubsidized student loans, and many \"buy now, pay later\" and business loans, add the unpaid interest to the balance.",
    examples: "Example: deferring a $20,000 loan at 8% for 6 months adds $813 of interest, so the 60-month payment is $422 instead of $406 — about $990 more interest overall.",
    assumptions: "Interest compounds monthly during the deferral and is capitalized when repayment starts. Subsidized federal student loans don't accrue interest during deferment — choose \"paid separately / subsidized\" for those. " + DISCLAIMER,
    faq: [
      { question: "What is interest capitalization?", answer: "Unpaid interest being added to the principal, so you then pay interest on the interest." },
      { question: "Can I avoid the extra cost?", answer: "Pay the interest as it accrues during the deferral, even if principal payments are paused." },
    ],
  },
  {
    slug: "finance-charge-calculator",
    category: DEBT_MANAGEMENT,
    title: "Finance Charge Calculator",
    description: "Calculate a credit card finance charge with the average daily balance method — from your starting balance, purchases, payments and APR over the billing cycle.",
    metaTitle: "Finance Charge Calculator — Average Daily Balance",
    metaDescription: "Free finance charge calculator. Work out a credit card's interest for a billing cycle using the average daily balance method, daily periodic rate and APR.",
    calcInputs: [currencyField("startingBalance", "Balance at Start of Cycle", { default: 1500, max: 10000000, step: 0.01 }), currencyField("purchaseAmount", "New Purchases", { default: 400, max: 10000000, step: 0.01, required: false }), numberField("purchaseDay", "Day of Purchase in the Cycle", { default: 10, min: 1, max: 31 }), currencyField("paymentAmount", "Payment Made", { default: 600, max: 10000000, step: 0.01, required: false }), numberField("paymentDay", "Day of Payment in the Cycle", { default: 20, min: 1, max: 31 }), numberField("cycleDays", "Days in Billing Cycle", { default: 30, min: 1, max: 31 }), percentField("apr", "APR", { default: 24, max: 100, step: 0.01 })],
    calcResult: { label: "Finance Charge", format: "currency" },
    calcResults: [cur("averageDailyBalance", "Average Daily Balance"), { key: "dailyPeriodicRate", label: "Daily Periodic Rate", format: "percentage", decimals: 5 }, cur("financeCharge", "Finance Charge", true), cur("endingBalance", "New Balance incl. Charge")],
    instructions: "Enter the balance at the start of the billing cycle, a purchase and a payment with the day of the cycle each posted, the cycle length and your APR. Most US cards use the average daily balance method (including new purchases).",
    examples: "Example: a $1,500 balance, a $400 purchase on day 10 and a $600 payment on day 20 average $1,560 a day over 30 days. At 24% APR (0.06575% a day) the finance charge is $30.77.",
    assumptions: "Finance charge = average daily balance × APR ÷ 365 × days. Interest is usually waived on purchases if you paid the previous statement in full (grace period); cash advances accrue interest immediately.",
    faq: [
      { question: "How do I avoid finance charges?", answer: "Pay the full statement balance by the due date every month to keep your grace period." },
      { question: "Why is my finance charge higher than balance × APR ÷ 12?", answer: "Daily compounding and purchases made during the cycle both raise it slightly." },
    ],
  },
  {
    slug: "post-judgment-interest-calculator",
    category: DEBT_MANAGEMENT,
    title: "Post Judgment Interest Calculator",
    description: "Calculate post-judgment interest on a court judgment — federal (28 U.S.C. § 1961, compounded yearly) or simple state interest — and the daily per-diem amount.",
    metaTitle: "Post Judgment Interest Calculator — Federal & State",
    metaDescription: "Free post-judgment interest calculator. Work out interest on a judgment with the federal 1-year Treasury rate compounded annually or a state's simple rate.",
    calcInputs: [currencyField("judgmentAmount", "Judgment Amount", { default: 50000, max: 10000000000, step: 0.01 }), percentField("interestRate", "Interest Rate", { default: 3.6, max: 30, step: 0.01 }), numberField("daysOutstanding", "Days from Judgment to Payment", { default: 540, max: 36500 }), dropdown("method", "Rule", [["Federal court (compounded annually)", 1], ["State court (simple interest)", 2]], 1)],
    calcResult: { label: "Interest", format: "currency" },
    calcResults: [cur("interest", "Post-Judgment Interest", true), cur("totalOwed", "Total Owed"), cur("perDiem", "Per-Diem Interest")],
    instructions: "Enter the judgment amount, the rate and the days until it's paid. In federal court the rate is the weekly average 1-year constant-maturity Treasury yield for the week before the judgment (published by the Federal Reserve), compounded annually. Each state sets its own rate — often 6–10% simple.",
    examples: "Example: a $50,000 federal judgment at 3.6% paid 540 days later accrues about $2,694 of interest — $4.93 a day — for $52,694 in total.",
    assumptions: "Federal: interest from the date of judgment, compounded each anniversary, simple within a partial year. State rules (rates, compounding, whether costs earn interest) vary — check your state statute. " + DISCLAIMER,
    faq: [
      { question: "What is the federal post-judgment interest rate?", answer: "The weekly average 1-year Treasury yield for the calendar week before the judgment, under 28 U.S.C. § 1961." },
      { question: "Does pre-judgment interest work the same way?", answer: "No — pre-judgment interest is set by the claim's governing law and the court's discretion." },
    ],
  },
  {
    slug: "growing-annuity-calculator",
    category: RETIREMENT,
    title: "Growing Annuity Calculator",
    description: "Calculate the present and future value of a growing annuity — a stream of payments that rises at a constant rate, like a pension with COLA or rising savings deposits.",
    metaTitle: "Growing Annuity Calculator — PV & FV of Rising Payments",
    metaDescription: "Free growing annuity calculator. Find the present value and future value of payments that grow at a constant rate, ordinary or due.",
    calcInputs: [currencyField("firstPayment", "First Payment", { default: 10000, max: 100000000, step: 10 }), percentField("discountRate", "Interest / Discount Rate per Period", { default: 6, min: -50, max: 50, step: 0.01 }), percentField("growthRate", "Payment Growth Rate per Period", { default: 3, min: -50, max: 50, step: 0.01 }), numberField("periods", "Number of Payments", { default: 20, min: 1, max: 1200 }), dropdown("timing", "Payment Timing", [["End of period", 1], ["Start of period (annuity due)", 2]], 1)],
    calcResult: { label: "Present Value", format: "currency" },
    calcResults: [cur("presentValue", "Present Value", true), cur("futureValue", "Future Value"), cur("lastPayment", "Final Payment"), cur("totalPayments", "Total of All Payments")],
    instructions: "Enter the first payment, the interest or discount rate, how fast payments grow each period and how many there are. Use it to value a pension or annuity with cost-of-living increases, or to see what rising yearly savings grow to.",
    examples: "Example: 20 yearly payments starting at $10,000 and growing 3% are worth $145,615 today at 6%, and would grow to $467,008 by the last payment. The final payment is $17,535.",
    assumptions: "PV = P ÷ (r − g) × (1 − ((1 + g) ÷ (1 + r))^n); FV = P × ((1 + r)^n − (1 + g)^n) ÷ (r − g). When r = g, PV = n·P ÷ (1 + r). " + DISCLAIMER,
    faq: [
      { question: "Where are growing annuities used?", answer: "Valuing pensions and Social Security with COLAs, lease payments with escalators and salary-linked savings plans." },
      { question: "What's the difference from a growing perpetuity?", answer: "A perpetuity never ends; set the periods very high and the PV approaches P ÷ (r − g)." },
    ],
  },
  {
    slug: "variable-annuity-calculator",
    category: RETIREMENT,
    title: "Variable Annuity Calculator",
    description: "Project a variable annuity's value after its layers of fees — mortality and expense, administration, sub-account and rider fees — and compare it with a low-cost index fund.",
    metaTitle: "Variable Annuity Calculator — Fees & Growth",
    metaDescription: "Free variable annuity calculator. See how M&E, admin, fund and rider fees affect your annuity's growth, and what the same money could grow to in an index fund.",
    calcInputs: [currencyField("initialPremium", "Initial Premium", { default: 100000, max: 1000000000, step: 1000 }), currencyField("yearlyContribution", "Yearly Contributions", { default: 0, max: 100000000, step: 100, required: false }), percentField("grossReturn", "Sub-Account Return before Fees", { default: 7, min: -50, max: 50, step: 0.1 }), percentField("mortalityExpenseFee", "Mortality & Expense (M&E) Fee", { default: 1.25, max: 5, step: 0.01 }), percentField("adminFee", "Administrative Fee", { default: 0.15, max: 5, step: 0.01, required: false }), percentField("fundExpenses", "Sub-Account Fund Expenses", { default: 0.8, max: 5, step: 0.01 }), percentField("riderFees", "Rider Fees (e.g. income benefit)", { default: 1, max: 5, step: 0.01, required: false }), percentField("indexFundFee", "Low-Cost Index Fund Fee (comparison)", { default: 0.1, max: 3, step: 0.01, required: false }), numberField("years", "Years", { default: 20, min: 1, max: 60 })],
    calcResult: { label: "Annuity Value", format: "currency" },
    calcResults: [pct("totalFeeRate", "Total Yearly Fees"), cur("annuityValue", "Annuity Value", true), cur("totalFeesPaid", "Total Fees Paid"), cur("lowCostFundValue", "Same Money in a Low-Cost Fund"), cur("costOfFees", "Difference")],
    instructions: "Enter the premium and each fee from the prospectus. Variable annuities stack an insurance charge (M&E), admin fees, the sub-accounts' own expenses and optional riders — often 2–3.5% a year in total.",
    examples: "Example: $100,000 for 20 years at a 7% gross return with 3.2% of total fees grows to about $201,922, paying about $97,589 in fees. The same money in a 0.1% index fund would reach about $379,302.",
    assumptions: "Fees are charged on the account value each year after growth. Surrender charges, taxes (growth is tax-deferred, then taxed as ordinary income) and the value of riders' guarantees aren't included. " + DISCLAIMER,
    faq: [
      { question: "Are variable annuities worth the fees?", answer: "They can suit people who want guaranteed lifetime income or a death benefit, but most investors pay less by maxing out 401(k)s and IRAs first." },
      { question: "What is the M&E fee for?", answer: "It pays for the insurance guarantees (such as the death benefit) and the insurer's costs and profit." },
    ],
  },
  {
    slug: "check-digit-calculator",
    category: SALES,
    title: "Check Digit Calculator",
    description: "Calculate the check digit for a UPC-A or EAN-13 barcode, an ISBN-10 or any number using the Luhn algorithm (credit cards, IMEI).",
    metaTitle: "Check Digit Calculator — UPC, EAN, ISBN & Luhn",
    metaDescription: "Free check digit calculator. Get the last digit for a UPC-A or EAN-13 barcode, ISBN-10, or a Luhn (mod 10) number like a credit card or IMEI.",
    calcInputs: [dropdown("codeType", "Code Type", [["UPC-A (enter 11 digits)", 1], ["EAN-13 (enter 12 digits)", 2], ["ISBN-10 (enter 9 digits)", 3], ["Luhn / mod 10 (credit card, IMEI)", 4]], 1), numberField("digits", "Digits without the Check Digit", { default: 3600029145, max: 9007199254740991 })],
    calcResult: { label: "Check Digit", format: "number" },
    calcResults: [num("checkDigit", "Check Digit (10 = X for ISBN)", true), num("digitsUsed", "Digits Used")],
    instructions: "Choose the code type and type the number without its last (check) digit. Leading zeros are added back automatically for UPC, EAN and ISBN. Append the check digit to the end of your number.",
    examples: "Example: the UPC 03600029145 has check digit 2, giving the full barcode 036000291452. The Luhn check digit for 7992739871 is 3.",
    assumptions: "UPC-A: digits in odd positions × 3 plus even positions, check = (10 − sum mod 10) mod 10. EAN-13 weights alternate 1 and 3 from the left. ISBN-10 weights 10 down to 2, mod 11 (10 is written X). Luhn doubles every second digit from the right. Numbers longer than 15 digits lose precision in a browser number field.",
    faq: [
      { question: "What is a check digit for?", answer: "It catches typing and scanning errors — a single wrong digit or swapped neighbours almost always fails the check." },
      { question: "Can a check digit verify a credit card is real?", answer: "No — it only confirms the number is well-formed, not that the account exists." },
    ],
  },
  {
    slug: "margin-with-discount-calculator",
    category: SALES,
    title: "Margin With Discount Calculator",
    description: "See what a discount does to your profit margin — the sale price, margin before and after, profit per unit, the biggest discount that keeps your target margin, and the extra sales needed.",
    metaTitle: "Margin With Discount Calculator — Discount vs Profit",
    metaDescription: "Free margin with discount calculator. Find your margin after a discount, the maximum discount for a target margin and the sales increase needed to keep profit.",
    calcInputs: [currencyField("unitCost", "Unit Cost", { default: 40, max: 100000000, step: 0.01 }), currencyField("listPrice", "Regular Price", { default: 100, max: 100000000, step: 0.01 }), percentField("discountPercent", "Discount", { default: 20, step: 0.5 }), percentField("targetMargin", "Minimum Margin You Want to Keep", { default: 30, step: 0.5 })],
    calcResult: { label: "Margin after Discount", format: "percentage" },
    calcResults: [cur("salePrice", "Sale Price"), pct("marginBefore", "Margin Before Discount"), pct("marginAfter", "Margin After Discount", true), cur("profitPerUnitAfter", "Profit per Unit After"), pct("maxDiscountForTarget", "Maximum Discount for Your Target Margin"), pct("salesIncreaseToKeepProfit", "Extra Units Needed to Keep Total Profit")],
    instructions: "Enter what each item costs you, its regular price, the discount you're considering and the lowest margin you'll accept. Discounts cut margin faster than they cut price — this shows how many more units you must sell to make the same profit.",
    examples: "Example: an item costing $40 that sells for $100 has a 60% margin. At 20% off it sells for $80 with a 50% margin and $40 profit — you need 50% more sales to earn the same total profit. You can discount up to 42.86% and still keep a 30% margin.",
    assumptions: "Margin = (price − cost) ÷ price. Ignores payment fees and any extra marketing cost of the promotion. For stacked discounts and sale prices, use the Discount Calculator.",
    faq: [
      { question: "How much more do I need to sell after a discount?", answer: "Profit per unit ÷ new profit per unit − 1; small discounts on low-margin items need very large volume increases." },
      { question: "Is a 20% discount the same as 20% less margin?", answer: "No — at a 60% margin, 20% off cuts profit per unit by a third." },
    ],
  },
];

// Every sub-category here hangs directly under Finance Calculators and is
// created on first use.
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
  if (!finance) throw new Error(`The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first.`);
  console.log(`Creating sub-category "${cat.name}" under "${finance.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const category = await ensureCategory(def.category);
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
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
