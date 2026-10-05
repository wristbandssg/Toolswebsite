// One-time (but safe to re-run) batch setup script: creates the Mortgage Cost & Insurance tools
// (4) of the Mortgage Calculators expansion, filed under
// Mortgage Calculators > Mortgage Cost & Insurance Calculators. See src/lib/calc-engine-mortgage-costs-insurance.ts for the math and
// src/lib/calc-engine-mortgage-loan-types.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-mortgage-costs-insurance-calculators.ts
// or
//   npm run db:create-mortgage-costs-insurance-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "mortgage-calculators";
const CATEGORY = { name: "Mortgage Cost & Insurance Calculators", slug: "mortgage-cost-insurance-calculators" };

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
    slug: "interest-rate-buydown-mortgage-calculator",
    title: "Interest Rate Buydown Mortgage Calculator",
    description: "See your payment each year with a temporary 2-1, 3-2-1 or 1-0 buydown, the full payment it steps up to, and how much the buydown costs the seller or builder who funds it.",
    metaTitle: "Interest Rate Buydown Calculator — 2-1 & 3-2-1",
    metaDescription: "Free rate buydown calculator. See each year's payment with a 2-1, 3-2-1 or 1-0 temporary buydown, the full payment and the buydown cost.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 350000, max: 10000000, step: 1000 }),
      percentField("noteRatePercent", "Note Rate (Full Rate)", { default: 6.75, max: 15, step: 0.125 }),
      numberField("termYears", "Loan Term (Years)", { default: 30, min: 10, max: 30, step: 5 }),
      {
        key: "buydownType", label: "Buydown Type", type: "dropdown", required: true, default: 1,
        options: [
          { label: "2-1 Buydown (−2% Year 1, −1% Year 2)", value: 1 },
          { label: "3-2-1 Buydown (−3%, −2%, −1%)", value: 2 },
          { label: "1-0 Buydown (−1% Year 1)", value: 3 },
        ],
      },
    ],
    calcResult: { label: "Buydown Cost", format: "currency" },
    calcResults: [
      { key: "year1Payment", label: "Year 1 Payment", format: "currency" },
      { key: "year2Payment", label: "Year 2 Payment", format: "currency" },
      { key: "year3Payment", label: "Year 3 Payment", format: "currency" },
      { key: "fullPayment", label: "Full Payment (Note Rate)", format: "currency" },
      { key: "buydownCost", label: "Buydown Cost", format: "currency", highlight: true },
      { key: "buydownCostPercent", label: "Cost as % of Loan", format: "percentage" },
      { key: "firstYearSavings", label: "Savings in Year 1", format: "currency" },
    ],
    instructions:
      "A temporary buydown lowers your rate for the first one to three years. The money to cover the lower payments — the " +
      "difference between the full and reduced payments — is paid up front, usually by the seller or builder as a " +
      "concession, and held in an escrow account. From the year after the buydown ends, you pay the full note rate.\n\n" +
      "Lenders qualify you at the full payment. To lower the rate for the whole loan instead, see the mortgage points " +
      "calculator.",
    examples:
      "Example: with a 2-1 buydown on a $350,000 loan at 6.75%, you pay $1,825.77 in year 1 and " +
      "$2,042.50 in year 2 before the full $2,270.09. The buydown costs $8,062.99 (2.30% of " +
      "the loan) and saves you $5,331.93 in the first year.",
    assumptions:
      "Fixed-rate loan; reduced payments are figured on the original loan amount and term. Seller concession limits (3–9% " +
      "of the price for conventional loans, 6% for FHA, 4% for VA) cap how large a buydown the seller can pay. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens to unused buydown funds if I refinance?",
        answer: "With Fannie Mae and Freddie Mac loans, money left in the buydown account is usually applied to the payoff or principal, so it isn't lost.",
      },
    ],
  },
  {
    slug: "mortgage-rate-lock-calculator",
    title: "Mortgage Rate Lock Calculator",
    description: "Weigh the cost of locking your mortgage rate — including a longer lock or an extension — against how much more you'd pay if rates rise before closing.",
    metaTitle: "Mortgage Rate Lock Calculator — Lock or Float?",
    metaDescription: "Free mortgage rate lock calculator. Compare the lock fee and extension cost with the extra interest you'd pay if rates rise before closing.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 350000, max: 10000000, step: 1000 }),
      percentField("lockedRatePercent", "Rate You Can Lock", { default: 6.5, max: 15, step: 0.125 }),
      percentField("lockFeePercent", "Lock Fee (% of Loan)", { default: 0.25, max: 3, step: 0.125, required: false }),
      numberField("extensionDays", "Extension Days Needed", { default: 7, min: 0, max: 90, step: 1, required: false }),
      percentField("extensionFeePerDayPercent", "Extension Fee per Day (% of Loan)", { default: 0.02, max: 0.1, step: 0.005, required: false }),
      percentField("floatRatePercent", "Rate If You Float and Rates Rise", { default: 6.875, max: 15, step: 0.125 }),
      numberField("yearsKept", "Years You'll Keep the Loan", { default: 7, min: 0, max: 30, step: 1 }),
    ],
    calcResult: { label: "Net Benefit of Locking", format: "currency" },
    calcResults: [
      { key: "lockCost", label: "Lock + Extension Cost", format: "currency" },
      { key: "lockedPayment", label: "Payment at Locked Rate", format: "currency" },
      { key: "paymentIfRateRises", label: "Payment If Rates Rise", format: "currency" },
      { key: "monthlyDifference", label: "Monthly Difference", format: "currency" },
      { key: "extraInterestIfRateRises", label: "Extra Interest If Rates Rise", format: "currency" },
      { key: "netBenefitOfLocking", label: "Net Benefit of Locking", format: "currency", highlight: true },
    ],
    instructions:
      "A rate lock guarantees your rate for a set period, typically 30–60 days. Standard locks are often free; longer locks " +
      "(for new construction, for example) cost a fee, and if closing is delayed you pay to extend. Floating means waiting " +
      "in the hope rates fall — at the risk they rise.\n\n" +
      "Enter the lock terms and the rate you'd face if rates move against you. A positive net benefit means locking pays " +
      "off in that scenario.",
    examples:
      "Example: locking $350,000 at 6.50% with a 0.25% fee and a 7-day " +
      "extension costs $1,365. If rates rise to 6.88%, the payment would be $2,299.25 instead " +
      "of $2,212.24 — $9,243.18 more interest over 7 years, so locking is worth " +
      "$7,878.18.",
    assumptions:
      "30-year fixed loan. Lock and extension fees are shown as percentages of the loan; lenders also quote them as points " +
      "or a rate increase. Some lenders offer a float-down option if rates drop after you lock. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When should I lock my rate?",
        answer: "Once you have an accepted offer and a closing date you're confident in. Choose a lock long enough to cover the closing, since extensions cost money.",
      },
    ],
  },
  {
    slug: "escrow-account-calculator",
    title: "Escrow Account Calculator",
    description: "Estimate your monthly escrow for property taxes and insurance, the cushion your lender can hold, the deposit due at closing, and how a tax increase changes your payment.",
    metaTitle: "Escrow Account Calculator — Deposit & Shortage",
    metaDescription: "Free escrow calculator. See your monthly escrow, the two-month cushion, the deposit due at closing, and your new payment after a tax increase.",
    calcInputs: [
      currencyField("annualTaxes", "Property Taxes per Year", { default: 4800, max: 500000, step: 100 }),
      currencyField("annualInsurance", "Homeowners Insurance per Year", { default: 1800, max: 100000, step: 50 }),
      currencyField("annualOther", "Other Escrowed Items per Year (PMI, Flood)", { default: 0, max: 100000, step: 50, required: false }),
      numberField("paymentsBeforeTaxDue", "Payments Before Next Tax Bill", { default: 4, min: 0, max: 12, step: 1 }),
      numberField("cushionMonths", "Cushion (Months, Max 2)", { default: 2, min: 0, max: 2, step: 1 }),
      percentField("taxIncreasePercent", "Property Tax Increase", { default: 10, min: 0, max: 100, step: 1, required: false }),
    ],
    calcResult: { label: "Monthly Escrow", format: "currency" },
    calcResults: [
      { key: "monthlyEscrow", label: "Monthly Escrow", format: "currency", highlight: true },
      { key: "cushion", label: "Cushion", format: "currency" },
      { key: "initialEscrowDeposit", label: "Initial Escrow Deposit at Closing", format: "currency" },
      { key: "escrowShortage", label: "Shortage After Tax Increase", format: "currency" },
      { key: "newMonthlyEscrow", label: "New Monthly Escrow (Repaying Shortage)", format: "currency" },
      { key: "monthlyIncrease", label: "Monthly Increase", format: "currency" },
    ],
    instructions:
      "An escrow account collects 1/12 of your yearly property taxes and insurance with each mortgage payment, and the " +
      "lender pays the bills when they're due. Under RESPA, the lender can keep a cushion of up to two months' payments.\n\n" +
      "At closing you fund the account so it can pay the next tax bill: the shorter the time until that bill, the more you " +
      "deposit. If taxes or insurance go up, the yearly escrow analysis finds a shortage, which is usually spread over the " +
      "next 12 payments on top of the higher monthly amount.",
    examples:
      "Example: $4,800 of taxes and $1,800 of insurance cost $550 a month. With the next tax " +
      "bill due after 4 payments and a $1,100 cushion, you deposit $4,300 at " +
      "closing. If taxes rise 10%, a $480 shortage pushes the escrow to $630 — " +
      "$80 more a month.",
    assumptions:
      "Taxes are paid once a year; the first year of insurance is paid at closing, so only taxes need a catch-up deposit. " +
      "Lenders run a full month-by-month projection, so their figure may differ slightly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I pay the shortage in one lump sum?",
        answer: "Yes. Paying it at once means only the higher monthly amount is added; you may get a new, lower payment after the next analysis.",
      },
    ],
  },
  {
    slug: "lender-paid-mortgage-insurance-calculator",
    title: "Lender-Paid Mortgage Insurance Calculator",
    description: "Compare the ways to pay for mortgage insurance with less than 20% down — monthly borrower-paid PMI, lender-paid MI (a higher rate), a single premium, or a split premium — over the years you'll keep the loan.",
    metaTitle: "Lender-Paid Mortgage Insurance Calculator — LPMI vs PMI",
    metaDescription: "Free LPMI calculator. Compare lender-paid MI, monthly PMI, single premium and split premium mortgage insurance over the years you keep the loan.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 400000, max: 10000000, step: 1000 }),
      currencyField("loanAmount", "Loan Amount", { default: 360000, max: 10000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate (Without LPMI)", { default: 6.5, max: 15, step: 0.125 }),
      percentField("bpmiRatePercent", "Monthly PMI Rate (Yearly %)", { default: 0.5, max: 3, step: 0.05 }),
      percentField("lpmiRateIncreasePercent", "LPMI Rate Increase", { default: 0.25, max: 2, step: 0.125 }),
      percentField("singlePremiumPercent", "Single Premium (% of Loan)", { default: 1.5, max: 6, step: 0.05 }),
      percentField("splitUpfrontPercent", "Split Premium Upfront (% of Loan)", { default: 0.5, max: 3, step: 0.05 }),
      percentField("splitMonthlyRatePercent", "Split Premium Monthly Rate (Yearly %)", { default: 0.25, max: 3, step: 0.05 }),
      numberField("yearsKept", "Years You'll Keep the Loan", { default: 10, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "LPMI Cost Over the Period", format: "currency" },
    calcResults: [
      { key: "borrowerPaidMonthly", label: "Monthly PMI (Borrower-Paid)", format: "currency" },
      { key: "borrowerPaidTotal", label: "Borrower-Paid PMI Total", format: "currency" },
      { key: "lpmiExtraMonthly", label: "LPMI Extra Monthly Payment", format: "currency" },
      { key: "lpmiTotalCost", label: "LPMI Cost Over the Period", format: "currency", highlight: true },
      { key: "singlePremiumCost", label: "Single Premium Cost", format: "currency" },
      { key: "splitPremiumTotal", label: "Split Premium Total", format: "currency" },
      { key: "monthsUntilBorrowerPmiEnds", label: "Months Until Monthly PMI Ends", format: "number" },
    ],
    instructions:
      "With less than 20% down on a conventional loan, you pay for mortgage insurance in one of four ways:\n\n" +
      "Borrower-paid monthly PMI ends automatically at 78% loan-to-value. Lender-paid MI (LPMI) is built into a higher rate " +
      "and can't be cancelled — you pay it until you sell or refinance. A single premium is paid once at closing. A split " +
      "premium is part upfront, with a lower monthly charge that ends like normal PMI. Enter the quotes and how long you'll " +
      "keep the loan to find the cheapest.",
    examples:
      "Example: on a $360,000 loan, monthly PMI of $150 lasts about 109 " +
      "months and totals $16,350 over 10 years. LPMI adds $59.51 a month — " +
      "$7,140.99 over the same time. A single premium costs $5,400 and a split premium $9,975.",
    assumptions:
      "30-year fixed loan; PMI ends on the original schedule without extra payments or a new appraisal. A single premium " +
      "isn't refunded if you sell or refinance early. Upfront premiums can sometimes be financed or paid by the seller. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When is lender-paid mortgage insurance a good choice?",
        answer: "When you expect to sell or refinance within several years, before borrower-paid PMI would have ended anyway, or when you need a lower payment than monthly PMI gives.",
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
