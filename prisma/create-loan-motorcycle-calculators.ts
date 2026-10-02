// One-time (but safe to re-run) batch setup script: creates the 7 tools of
// the Loan Calculators expansion sub-batch 8 (Motorcycle Loans), filed
// under Finance Calculators > Loan Calculators > Auto & Vehicle Loan
// Calculators. See src/lib/calc-engine-loan-motorcycle.ts for the math and
// src/lib/calc-engine-loan-debt-consolidation.ts for the full batch context.
//
// If the "Auto & Vehicle Loan Calculators" sub-category doesn't exist yet,
// it is created under Loan Calculators.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-motorcycle-calculators.ts
// or
//   npm run db:create-loan-motorcycle-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "loan-calculators";
const CATEGORY = { name: "Auto & Vehicle Loan Calculators", slug: "auto-vehicle-loan-calculators" };

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
    slug: "motorcycle-loan-calculator",
    title: "Motorcycle Loan Calculator",
    description: "Work out the out-the-door price of a motorcycle — freight and prep, doc fees, riding gear, and sales tax — then the amount financed and your monthly payment.",
    metaTitle: "Motorcycle Loan Calculator — Out-the-Door Payment",
    metaDescription: "Free motorcycle loan calculator. Add freight & prep, fees, gear and sales tax, subtract your down payment and trade-in, and see your payment.",
    calcInputs: [
      currencyField("bikePrice", "Motorcycle Price (MSRP or Agreed)", { default: 15000, max: 1000000, step: 250 }),
      currencyField("freightPrep", "Freight & Prep (Destination) Fees", { default: 900, max: 10000, step: 50, required: false }),
      currencyField("docFees", "Doc / Title / Registration Fees", { default: 300, max: 10000, step: 25, required: false }),
      currencyField("gearFinanced", "Riding Gear Rolled Into the Loan", { default: 800, max: 20000, step: 50, required: false }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 7, max: 15, step: 0.125 }),
      currencyField("downPayment", "Down Payment", { default: 2000, max: 1000000, step: 100, required: false }),
      currencyField("tradeInValue", "Trade-In Value", { default: 0, max: 1000000, step: 100, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 12 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Sales Tax", format: "currency" },
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the bike's price and the dealer's freight & prep charge (often several hundred to well over a thousand " +
      "dollars on new bikes), doc and registration fees, any helmet, jacket, or accessories you're rolling into the " +
      "loan, your sales tax rate, down payment, trade-in, and the loan's rate and term.\n\n" +
      "Sales tax is applied after the trade-in credit, as most US states do.",
    examples:
      "Example: a $15,000 bike plus $900 freight & prep, $300 of fees, and $800 of gear, with 7% tax ($1,169), comes to " +
      "$18,169 out the door. After $2,000 down you finance $16,169 — $331.73 a month at 8.5% over 60 months, with " +
      "$3,734.91 of interest.",
    assumptions:
      "Tax rules on fees and trade-ins vary by state. Insurance isn't included — lenders require full coverage on a " +
      "financed bike. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I negotiate freight and prep fees?",
        answer: "Often, yes. Ask for the out-the-door price in writing before you talk about financing, and compare it with other dealers.",
      },
    ],
  },
  {
    slug: "motorcycle-loan-payment-calculator",
    title: "Motorcycle Loan Payment Calculator",
    description: "See your motorcycle loan payment plus insurance and maintenance, and what owning the bike really costs per month of riding season.",
    metaTitle: "Motorcycle Loan Payment Calculator — Cost per Ride Month",
    metaDescription: "Free motorcycle payment calculator. Add insurance and maintenance to your loan payment and see the cost per month of riding season.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 14000, max: 1000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 12 }),
      currencyField("monthlyInsurance", "Monthly Insurance", { default: 60, max: 5000, step: 5 }),
      currencyField("annualMaintenance", "Yearly Maintenance (Tyres, Service)", { default: 600, max: 20000, step: 50 }),
      numberField("ridingMonths", "Months You Can Ride Each Year", { default: 7, min: 1, max: 12, step: 1 }),
    ],
    calcResult: { label: "Cost per Riding Month", format: "currency" },
    calcResults: [
      { key: "loanPayment", label: "Loan Payment", format: "currency" },
      { key: "monthlyOwnershipCost", label: "Monthly Cost of Ownership", format: "currency" },
      { key: "annualOwnershipCost", label: "Yearly Cost of Ownership", format: "currency" },
      { key: "costPerRidingMonth", label: "Cost per Riding Month", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan amount, rate, and term, your monthly insurance, yearly maintenance, and how many months a year " +
      "the weather lets you ride. The loan payment is due all year, so in places with a short season each month of " +
      "riding costs a lot more than the payment suggests.",
    examples:
      "Example: $14,000 at 8.5% over 60 months is $287.23 a month. Adding $60 of insurance and $50 a month of " +
      "maintenance makes $397.23 — $4,766.78 a year. With a 7-month riding season, each month on the road costs " +
      "$680.97.",
    assumptions:
      "Fuel, gear, and storage aren't included. Some insurers offer a lay-up or seasonal policy that lowers the " +
      "winter premium. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I skip payments in winter?",
        answer: "Most motorcycle loans require payments every month. A few lenders offer skip-a-payment programmes, but interest keeps accruing — so it adds to your total cost.",
      },
    ],
  },
  {
    slug: "motorcycle-loan-payoff-calculator",
    title: "Motorcycle Loan Payoff Calculator",
    description: "See how extra payments speed up your motorcycle loan, the interest saved, and the month your bike becomes worth more than you owe on it.",
    metaTitle: "Motorcycle Loan Payoff Calculator — Beat Depreciation",
    metaDescription: "Free motorcycle loan payoff calculator. See months and interest saved by paying extra and when you stop owing more than the bike is worth.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 1000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 72, min: 12, max: 84, step: 12 }),
      currencyField("bikeValue", "Bike's Value Today", { default: 14000, max: 1000000, step: 250 }),
      percentField("depreciationPercent", "Yearly Depreciation", { default: 15, max: 50, step: 1 }),
      currencyField("extraMonthly", "Extra Monthly Payment", { default: 50, max: 100000, step: 10, required: false }),
    ],
    calcResult: { label: "Month You Owe Less Than It's Worth", format: "number" },
    calcResults: [
      { key: "monthlyPayment", label: "Regular Monthly Payment", format: "currency" },
      { key: "monthsToPayoff", label: "Months to Payoff With Extra", format: "number", unit: "months" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
      { key: "monthOwingLessThanValue", label: "Month You Owe Less Than It's Worth", format: "number", highlight: true },
      { key: "bikeValueAtPayoff", label: "Bike's Value at Payoff", format: "currency" },
    ],
    instructions:
      "Enter the loan amount, rate, and term, the bike's value today, how fast it loses value each year, and an extra " +
      "monthly payment. With little down and a long term, you can owe more than the bike is worth for a long time — " +
      "a problem if it's stolen, written off, or you want to sell. The tool shows when you get back above water.",
    examples:
      "Example: owing $15,000 on a bike worth $14,000, at 8.5% over 72 months ($266.68 a month), and paying $50 extra, " +
      "you owe less than the bike is worth from month 19 (assuming 15% yearly depreciation). The loan ends in month 58, " +
      "saving $862.07, when the bike is worth about $6,382.43.",
    assumptions:
      "Depreciation is applied smoothly each month; real values depend on make, model, mileage, and condition. " +
      "Month 0 means you already owe less than the value. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is GAP insurance?",
        answer: "Guaranteed Asset Protection pays the difference between what you owe and the bike's value if it's totalled or stolen. It's most useful while you're underwater.",
      },
    ],
  },
  {
    slug: "motorcycle-loan-interest-calculator",
    title: "Motorcycle Loan Interest Calculator",
    description: "See how much interest you'd pay if you paid off a motorcycle loan early on a simple-interest loan versus a precomputed Rule of 78s loan.",
    metaTitle: "Motorcycle Loan Interest Calculator — Rule of 78s",
    metaDescription: "Free motorcycle loan interest calculator. Compare interest and payoff amounts for early payoff on simple-interest vs Rule of 78s loans.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 12000, max: 1000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 16, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 6, max: 61, step: 1 }),
      numberField("payoffMonth", "Pay Off After This Many Payments", { default: 12, min: 0, max: 61, step: 1 }),
    ],
    calcResult: { label: "Extra Cost of Rule of 78s", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "totalInterestIfKept", label: "Total Interest If Kept to the End", format: "currency" },
      { key: "interestPaidSimple", label: "Interest Paid by Then — Simple Interest", format: "currency" },
      { key: "interestPaidRule78", label: "Interest Paid by Then — Rule of 78s", format: "currency" },
      { key: "payoffAmountSimple", label: "Payoff Amount — Simple Interest", format: "currency" },
      { key: "payoffAmountRule78", label: "Payoff Amount — Rule of 78s", format: "currency" },
      { key: "extraCostOfRule78", label: "Extra Cost of Rule of 78s", format: "currency", highlight: true },
    ],
    instructions:
      "Most motorcycle loans are simple-interest loans: you pay interest only on the balance you actually owe, so " +
      "paying off early saves all the future interest. Some precomputed loans instead use the 'Rule of 78s', which " +
      "assigns more of the total interest to the early months — so an early payoff saves less.\n\n" +
      "Enter the loan amount, rate, term, and when you'd pay it off. Your contract will say which method it uses.",
    examples:
      "Example: a $12,000, 48-month loan at 16% costs $340.08 a month and $4,324 in total interest. Paying it off after " +
      "12 payments, you'd have paid $1,754.27 of interest on a simple-interest loan (payoff $9,673.27) but $1,875.20 " +
      "under the Rule of 78s (payoff $9,794.20) — $120.94 more.",
    assumptions:
      "US federal law bans the Rule of 78s on consumer loans longer than 61 months, so the term is capped at 61. Some " +
      "states ban it entirely. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I know if my loan uses the Rule of 78s?",
        answer: "Look for 'precomputed interest', 'Rule of 78s' or 'sum of the digits' in your contract, or ask the lender how the payoff amount is calculated.",
      },
    ],
  },
  {
    slug: "motorcycle-loan-affordability-calculator",
    title: "Motorcycle Loan Affordability Calculator",
    description: "Cap your motorcycle payment and insurance at a share of your take-home pay and find the most you can spend on the bike before tax and fees.",
    metaTitle: "Motorcycle Loan Affordability Calculator — Free",
    metaDescription: "Free motorcycle affordability calculator. Keep payment plus insurance within a share of take-home pay and find your maximum bike price.",
    calcInputs: [
      currencyField("monthlyTakeHome", "Monthly Take-Home Pay", { default: 4500, max: 1000000, step: 100 }),
      percentField("maxSharePercent", "Max Share for Payment + Insurance", { default: 10, max: 30, step: 1 }),
      currencyField("monthlyInsurance", "Monthly Insurance", { default: 60, max: 5000, step: 5 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 12 }),
      currencyField("downPayment", "Down Payment", { default: 2000, max: 1000000, step: 100, required: false }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 7, max: 15, step: 0.125 }),
      currencyField("fees", "Freight, Prep & Other Fees", { default: 1200, max: 20000, step: 50, required: false }),
    ],
    calcResult: { label: "Maximum Bike Price", format: "currency" },
    calcResults: [
      { key: "maxLoanPayment", label: "Maximum Loan Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency" },
      { key: "maxOutTheDoor", label: "Maximum Out-the-Door Price", format: "currency" },
      { key: "maxBikePrice", label: "Maximum Bike Price", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your monthly take-home pay and the share you're willing to spend on the payment plus insurance (around " +
      "10% is a cautious rule of thumb for a second vehicle), your insurance quote, the loan's rate and term, your " +
      "down payment, sales tax rate, and the dealer's fees. The tool works back to the most you should agree to pay " +
      "for the bike itself.",
    examples:
      "Example: 10% of $4,500 is $450; after $60 of insurance, $390 is left for the payment. At 8.5% over 60 months " +
      "that supports a $19,009.06 loan, or $21,009.06 out the door with $2,000 down. After $1,200 of fees and 7% tax, " +
      "the bike's price should be no more than $18,513.14.",
    assumptions:
      "Sales tax is applied to the bike price only in this estimate. Insurance for young riders and sport bikes can " +
      "be much higher — get a quote first. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I get a quote for insurance before buying?",
        answer: "Yes. Premiums vary hugely by bike type, engine size, your age, and riding history — a sport bike can cost several times more to insure than a cruiser.",
      },
    ],
  },
  {
    slug: "motorcycle-loan-comparison-calculator",
    title: "Motorcycle Loan Comparison Calculator",
    description: "Compare a dealer's low promotional APR with taking the cash rebate and financing through a bank or credit union instead.",
    metaTitle: "Motorcycle Loan Comparison — Promo APR vs Rebate",
    metaDescription: "Free motorcycle loan comparison calculator. Compare a dealer's promotional APR with taking a cash rebate and financing elsewhere.",
    calcInputs: [
      currencyField("price", "Motorcycle Price", { default: 18000, max: 1000000, step: 250 }),
      currencyField("downPayment", "Down Payment", { default: 2000, max: 1000000, step: 100, required: false }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 12 }),
      percentField("promoRatePercent", "Dealer Promotional APR", { default: 3.99, max: 36, step: 0.01 }),
      currencyField("rebate", "Cash Rebate Instead of the Promo", { default: 1500, max: 100000, step: 100 }),
      percentField("bankRatePercent", "Bank / Credit Union Rate", { default: 7.5, max: 36, step: 0.05 }),
    ],
    calcResult: { label: "Promo APR Saves", format: "currency" },
    calcResults: [
      { key: "promoPayment", label: "Promo APR — Monthly Payment", format: "currency" },
      { key: "promoTotalPaid", label: "Promo APR — Total Paid", format: "currency" },
      { key: "rebatePayment", label: "Rebate + Bank Loan — Monthly Payment", format: "currency" },
      { key: "rebateTotalPaid", label: "Rebate + Bank Loan — Total Paid", format: "currency" },
      { key: "promoSaves", label: "Promo APR Saves", format: "currency", highlight: true },
    ],
    instructions:
      "Manufacturers often offer either a low promotional APR or a cash rebate, but not both. Enter the price, your " +
      "down payment, the term, the promo rate, the rebate, and the rate your bank or credit union offers. A negative " +
      "saving means the rebate is the better deal.",
    examples:
      "Example: on an $18,000 bike with $2,000 down over 60 months, the 3.99% promo costs $294.59 a month ($17,675.53 " +
      "in total). Taking a $1,500 rebate and borrowing at 7.5% costs $290.55 a month ($17,433.02) — the rebate wins " +
      "by $242.51.",
    assumptions:
      "Assumes the rebate reduces the amount financed and both loans run the full term. If you'll pay the loan off " +
      "early, the rebate usually looks even better. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do promotional rates need good credit?",
        answer: "Usually — the best manufacturer rates are typically reserved for top credit tiers. Get preapproved by a bank or credit union first so you know your alternative.",
      },
    ],
  },
  {
    slug: "motorcycle-loan-eligibility-calculator",
    title: "Motorcycle Loan Eligibility Calculator",
    description: "Check a motorcycle loan against typical powersports lender guidelines: loan-to-value, debt-to-income, and credit score.",
    metaTitle: "Motorcycle Loan Eligibility Calculator — Free",
    metaDescription: "Free motorcycle loan eligibility calculator. Check loan-to-value, DTI with the new payment, and your credit score margin over a lender minimum.",
    calcInputs: [
      numberField("creditScore", "Your Credit Score", { default: 670, min: 300, max: 850, step: 1 }),
      numberField("lenderMinScore", "Lender's Minimum Score", { default: 640, min: 300, max: 850, step: 1 }),
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 5000, max: 1000000, step: 100 }),
      currencyField("monthlyDebtPayments", "Current Monthly Debts (Incl. Rent)", { default: 1500, max: 100000, step: 25 }),
      currencyField("bikeValue", "Bike's Value (Book Value)", { default: 16000, max: 1000000, step: 250 }),
      currencyField("loanAmount", "Loan Amount", { default: 15000, max: 1000000, step: 250 }),
      percentField("maxLtvPercent", "Lender's Maximum Loan-to-Value", { default: 110, max: 150, step: 5 }),
      percentField("annualRatePercent", "Expected Rate", { default: 9, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 12 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 45, max: 60, step: 1 }),
    ],
    calcResult: { label: "Loan-to-Value", format: "percentage" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "ltvPercent", label: "Loan-to-Value", format: "percentage", highlight: true },
      { key: "ltvHeadroomPercent", label: "Room Under LTV Limit", format: "percentage" },
      { key: "dtiPercent", label: "DTI With New Loan", format: "percentage" },
      { key: "dtiHeadroomPercent", label: "Room Under DTI Limit", format: "percentage" },
      { key: "scoreMargin", label: "Points Above Minimum Score", format: "number" },
    ],
    instructions:
      "Enter your credit score, income, and current debts, the bike's book value, the loan amount, and the lender's " +
      "limits. Powersports lenders usually cap the loan at a percentage of the bike's value (sometimes above 100% to " +
      "cover tax and fees), and check your DTI and score. A negative room or margin shows where you'd fall short.",
    examples:
      "Example: a $15,000 loan on a $16,000 bike is a 93.75% LTV — 16.25 points under a 110% cap. At 9% over 60 months " +
      "the payment is $311.38, taking DTI on $5,000 of income with $1,500 of debts to 36.23%, 8.77 under 45%. A 670 " +
      "score is 30 points above 640.",
    assumptions:
      "Guideline check only — lenders set their own criteria and may also look at riding experience or a co-signer. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I improve my chances?",
        answer: "A bigger down payment lowers the LTV and payment, a co-signer with stronger credit can help, and paying down other debts improves your DTI.",
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
