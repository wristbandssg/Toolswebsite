// One-time (but safe to re-run) batch setup script: creates the Fleet Loan tools
// (7) of the Loan Calculators expansion 3, filed under Loan Calculators > Auto & Vehicle Loan Calculators.
// See src/lib/calc-engine-loan-fleet.ts for the math and
// src/lib/calc-engine-loan-sba.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-fleet-calculators.ts
// or
//   npm run db:create-loan-fleet-calculators

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
    slug: "fleet-loan-calculator",
    title: "Fleet Loan Calculator",
    description: "Finance several business vehicles at once: total fleet cost, amount financed, the monthly payment for the whole fleet and per vehicle, and total interest.",
    metaTitle: "Fleet Loan Calculator — Payment per Vehicle",
    metaDescription: "Free fleet loan calculator. Finance multiple business vehicles and see the fleet payment, payment per vehicle, and total interest.",
    calcInputs: [
      numberField("vehicles", "Number of Vehicles", { default: 5, min: 1, max: 1000, step: 1 }),
      currencyField("pricePerVehicle", "Price per Vehicle", { default: 45000, max: 1000000, step: 500 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 30, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 6 }),
    ],
    calcResult: { label: "Monthly Fleet Payment", format: "currency" },
    calcResults: [
      { key: "totalFleetCost", label: "Total Fleet Cost", format: "currency" },
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Fleet Payment", format: "currency", highlight: true },
      { key: "paymentPerVehicle", label: "Payment per Vehicle", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter how many vehicles you're buying, the price of each (after any fleet discount), your down payment, and " +
      "the loan terms. Fleet loans from banks, captive finance companies (like Ford Pro or GM Envolve) or equipment " +
      "lenders usually cover several vehicles under one agreement, with the vehicles as collateral.",
    examples:
      "Example: 5 vans at $45,000 each cost $225,000. With 10% down, you " +
      "finance $202,500. At 8.50% over 60 months, the fleet payment is $4,154.60 " +
      "— $830.92 per vehicle — with $46,775.86 of interest.",
    assumptions:
      "All vehicles cost the same and are financed together at a fixed rate. Sales tax, registration and upfitting " +
      "aren't included unless you add them to the price. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a fleet loan cheaper than financing vehicles one by one?",
        answer: "Often — buying several at once can earn fleet pricing from the dealer and better loan terms, and it's one application and one payment.",
      },
    ],
  },
  {
    slug: "fleet-loan-payment-calculator",
    title: "Fleet Loan Payment Calculator",
    description: "Break a fleet loan payment down per vehicle, per day and per mile driven, so you can price jobs and routes to cover the cost of the vehicles.",
    metaTitle: "Fleet Loan Payment Calculator — Per Vehicle & Mile",
    metaDescription: "Free fleet loan payment calculator. See the fleet payment per vehicle, per day, and per mile driven to price your work correctly.",
    calcInputs: [
      currencyField("loanAmount", "Fleet Loan Amount", { default: 200000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 30, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 6 }),
      numberField("vehicles", "Number of Vehicles", { default: 5, min: 1, max: 1000, step: 1 }),
      numberField("milesPerVehiclePerMonth", "Miles per Vehicle per Month", { default: 3000, min: 0, max: 50000, step: 100 }),
    ],
    calcResult: { label: "Loan Cost per Mile", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Fleet Payment", format: "currency" },
      { key: "paymentPerVehicle", label: "Payment per Vehicle", format: "currency" },
      { key: "paymentPerVehiclePerDay", label: "Payment per Vehicle per Day", format: "currency" },
      { key: "paymentPerMile", label: "Loan Cost per Mile", format: "currency", decimals: 3, highlight: true },
    ],
    instructions:
      "Enter the loan, rate, term, number of vehicles, and how many miles each drives in a month. The per-mile and " +
      "per-day figures show how much of every job or route has to go toward the vehicle loan before fuel, insurance, " +
      "maintenance and wages.",
    examples:
      "Example: a $200,000 fleet loan at 8.50% over 60 months costs $4,103.31 a " +
      "month — $820.66 for each of 5 vehicles, or $26.98 a day. At " +
      "3,000 miles a month, the loan costs $0.27 per mile.",
    assumptions:
      "The payment is shared equally across vehicles; a month is 365/12 days. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a typical total cost per mile for a business vehicle?",
        answer: "It depends on the vehicle — financing, fuel, insurance and maintenance together often come to well over a dollar a mile for vans and trucks. Track all of them.",
      },
    ],
  },
  {
    slug: "fleet-loan-payoff-calculator",
    title: "Fleet Loan Payoff Calculator",
    description: "At your planned replacement point, compare the fleet loan payoff with what the vehicles will sell for — and see the equity (or shortfall) per vehicle.",
    metaTitle: "Fleet Loan Payoff Calculator — Equity at Replacement",
    metaDescription: "Free fleet loan payoff calculator. Compare the payoff balance with the fleet's resale value to see your equity per vehicle.",
    calcInputs: [
      currencyField("loanAmount", "Original Fleet Loan", { default: 200000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 30, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 6 }),
      numberField("monthsPaid", "Replace the Fleet After (Months)", { default: 36, min: 0, max: 84, step: 1 }),
      numberField("vehicles", "Number of Vehicles", { default: 5, min: 1, max: 1000, step: 1 }),
      currencyField("resaleValuePerVehicle", "Expected Resale Value per Vehicle", { default: 22000, max: 1000000, step: 500 }),
    ],
    calcResult: { label: "Fleet Equity", format: "currency" },
    calcResults: [
      { key: "payoffBalance", label: "Loan Payoff Balance", format: "currency" },
      { key: "fleetResaleValue", label: "Fleet Resale Value", format: "currency" },
      { key: "equity", label: "Fleet Equity", format: "currency", highlight: true },
      { key: "equityPerVehicle", label: "Equity per Vehicle", format: "currency" },
      { key: "interestAvoided", label: "Future Interest Avoided", format: "currency" },
    ],
    instructions:
      "Many fleets replace vehicles before the loan ends, when repair costs start rising. Enter the loan, the month " +
      "you plan to replace the vehicles, and what each will sell or trade for. Positive equity can fund the next down " +
      "payment; a negative number means you'd owe more than the vehicles are worth.",
    examples:
      "Example: a $200,000 loan at 8.50% over 60 months has $90,270.49 left after " +
      "36 months. 5 vehicles selling for $22,000 each bring $110,000, " +
      "leaving $19,729.51 of equity — $3,945.90 per vehicle — and avoiding $8,208.86 of future interest.",
    assumptions:
      "Payments made on schedule; no prepayment penalty. Resale values are estimates. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When should a business replace fleet vehicles?",
        answer: "When rising repair and downtime costs plus falling resale value outweigh the cost of a new vehicle — often around 3–6 years or a mileage threshold.",
      },
    ],
  },
  {
    slug: "fleet-loan-interest-calculator",
    title: "Fleet Loan Interest Calculator",
    description: "Calculate interest on a fleet loan, the business-use share you can deduct, the tax it saves, and the real after-tax interest cost.",
    metaTitle: "Fleet Loan Interest Calculator — After-Tax Cost",
    metaDescription: "Free fleet loan interest calculator. See first-year and total interest, the deductible share, tax savings, and after-tax interest.",
    calcInputs: [
      currencyField("loanAmount", "Fleet Loan Amount", { default: 225000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 30, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 6 }),
      percentField("businessUsePercent", "Business Use", { default: 100, max: 100, step: 1 }),
      percentField("taxRatePercent", "Business Tax Rate", { default: 25, max: 70, step: 1 }),
    ],
    calcResult: { label: "After-Tax Interest", format: "currency" },
    calcResults: [
      { key: "interestFirstYear", label: "Interest in Year 1", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "deductibleInterest", label: "Deductible Interest", format: "currency" },
      { key: "taxSavings", label: "Tax Savings", format: "currency" },
      { key: "afterTaxInterest", label: "After-Tax Interest", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan, rate and term, the share of the vehicles' use that's for business, and your combined federal " +
      "and state tax rate. Interest on loans for business vehicles is generally a deductible business expense in " +
      "proportion to business use.",
    examples:
      "Example: a $225,000 fleet loan at 9% over 60 months costs $55,237.80 of " +
      "interest — $18,735.80 in year 1. At 100% business use and a 25% tax rate, " +
      "deducting $55,237.80 saves $13,809.45, so the after-tax interest is $41,428.35.",
    assumptions:
      "Tax savings are spread over the loan without discounting. Depreciation (including Section 179 or bonus " +
      "depreciation) is a separate deduction not shown here; business interest limits may apply to larger firms. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I deduct both depreciation and loan interest on fleet vehicles?",
        answer: "Generally yes — depreciation recovers the vehicle's cost and interest is a separate financing expense. Ask a tax professional about your situation.",
      },
    ],
  },
  {
    slug: "fleet-loan-affordability-calculator",
    title: "Fleet Loan Affordability Calculator",
    description: "Work out how much you can spend per vehicle — and on the whole fleet — from the revenue each vehicle earns and what it costs to run.",
    metaTitle: "Fleet Loan Affordability Calculator — Price per Vehicle",
    metaDescription: "Free fleet loan affordability calculator. Turn revenue and running costs per vehicle into a max payment, price per vehicle and fleet budget.",
    calcInputs: [
      numberField("vehicles", "Number of Vehicles", { default: 5, min: 1, max: 1000, step: 1 }),
      currencyField("revenuePerVehicle", "Monthly Revenue per Vehicle", { default: 6000, max: 1000000, step: 100 }),
      currencyField("operatingCostPerVehicle", "Monthly Running Cost per Vehicle (Fuel, Driver, Insurance…)", { default: 3800, max: 1000000, step: 100 }),
      percentField("sharePercent", "Share of the Margin for the Loan", { default: 40, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 30, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 6 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 99, step: 1 }),
    ],
    calcResult: { label: "Total Fleet Budget", format: "currency" },
    calcResults: [
      { key: "marginPerVehicle", label: "Monthly Margin per Vehicle", format: "currency" },
      { key: "maxPaymentPerVehicle", label: "Maximum Payment per Vehicle", format: "currency" },
      { key: "maxPricePerVehicle", label: "Maximum Price per Vehicle", format: "currency" },
      { key: "totalFleetBudget", label: "Total Fleet Budget", format: "currency", highlight: true },
    ],
    instructions:
      "Enter what each vehicle brings in a month, its running costs before the loan, and how much of the margin you're " +
      "willing to put toward financing (keep the rest for profit, overhead and repairs). Add the loan terms and down " +
      "payment to get the price each vehicle's work can support.",
    examples:
      "Example: $6,000 of revenue less $3,800 of running costs leaves $2,200 " +
      "per vehicle. Putting 40% toward the loan allows $880 a month, enough for a " +
      "$47,102.85 vehicle with 10% down. For 5 vehicles, the budget is $235,514.27.",
    assumptions:
      "Steady revenue and costs; all vehicles are similar. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I buy new or used fleet vehicles?",
        answer: "New vehicles cost more but have warranties, lower repair costs and better financing; used ones cost less upfront. Compare total cost per mile, not just price.",
      },
    ],
  },
  {
    slug: "fleet-loan-comparison-calculator",
    title: "Fleet Loan Comparison Calculator",
    description: "Compare financing and owning a fleet with leasing it: net cost of buying after resale vs total lease payments over the same period.",
    metaTitle: "Fleet Loan vs Fleet Lease Calculator",
    metaDescription: "Free fleet loan vs lease calculator. Compare the net cost of financing and reselling vehicles with total fleet lease payments.",
    calcInputs: [
      numberField("vehicles", "Number of Vehicles", { default: 5, min: 1, max: 1000, step: 1 }),
      currencyField("pricePerVehicle", "Price per Vehicle", { default: 45000, max: 1000000, step: 500 }),
      percentField("downPaymentPercent", "Down Payment (Loan)", { default: 10, max: 100, step: 1 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 8.5, max: 30, step: 0.05 }),
      numberField("termMonths", "Loan / Lease Term (Months)", { default: 48, min: 12, max: 84, step: 6 }),
      percentField("resalePercent", "Resale Value at the End (% of Price)", { default: 45, max: 100, step: 1 }),
      currencyField("leasePaymentPerVehicle", "Lease Payment per Vehicle", { default: 750, max: 100000, step: 10 }),
    ],
    calcResult: { label: "Savings by Buying", format: "currency" },
    calcResults: [
      { key: "loanPaymentPerVehicle", label: "Loan Payment per Vehicle", format: "currency" },
      { key: "buyNetCostFleet", label: "Buy — Net Cost After Resale", format: "currency" },
      { key: "leaseCostFleet", label: "Lease — Total Payments", format: "currency" },
      { key: "savingsWithBuying", label: "Savings by Buying", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the fleet, the loan terms, what the vehicles should be worth at the end, and the lease payment quoted per " +
      "vehicle for the same term. Buying costs the down payment and loan payments minus the resale value; leasing " +
      "costs the lease payments. A negative saving means leasing is cheaper.",
    examples:
      "Example: 5 vehicles at $45,000, financed with 10% down at 8.50% " +
      "for 48 months, cost $998.26 each a month. After selling them at 45% of the " +
      "price, buying nets $160,831.51. Leasing at $750 each costs $180,000, so buying " +
      "saves $19,168.49.",
    assumptions:
      "Same maintenance and insurance either way; lease mileage or wear charges and taxes not included; no time value " +
      "of money. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do businesses lease fleet vehicles?",
        answer: "Lower upfront cash, predictable costs, easy replacement cycles, and sometimes bundled maintenance. Buying usually wins on total cost for vehicles kept a long time.",
      },
    ],
  },
  {
    slug: "fleet-loan-eligibility-calculator",
    title: "Fleet Loan Eligibility Calculator",
    description: "Check the main things fleet lenders look at: debt service coverage with the new loan, time in business, and credit score.",
    metaTitle: "Fleet Loan Eligibility Calculator — DSCR & Credit",
    metaDescription: "Free fleet loan eligibility calculator. Check DSCR with the new fleet loan, years in business, and credit score against typical rules.",
    calcInputs: [
      currencyField("annualCashFlow", "Annual Business Cash Flow (EBITDA)", { default: 260000, max: 1000000000, step: 1000 }),
      currencyField("existingAnnualDebt", "Existing Annual Loan Payments", { default: 60000, max: 1000000000, step: 1000, required: false }),
      currencyField("loanAmount", "Fleet Loan Amount", { default: 200000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 30, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 6 }),
      numberField("yearsInBusiness", "Years in Business", { default: 3, min: 0, max: 100, step: 0.5 }),
      numberField("creditScore", "Owner's Credit Score", { default: 680, min: 300, max: 850, step: 1 }),
    ],
    calcResult: { label: "Checks Passed (of 3)", format: "number" },
    calcResults: [
      { key: "newAnnualPayments", label: "New Loan — Annual Payments", format: "currency" },
      { key: "dscr", label: "DSCR With the New Loan", format: "number" },
      { key: "maxNewMonthlyPayment", label: "Maximum New Payment at a 1.25 DSCR", format: "currency" },
      { key: "checksPassed", label: "Checks Passed (of 3)", format: "number", highlight: true },
    ],
    instructions:
      "Enter your business's yearly cash flow, current loan payments, the fleet loan you want, and your history and " +
      "credit. The three checks: DSCR of at least 1.25 with the new loan; 2+ years in business; and a credit score of " +
      "650 or more. Newer businesses can still qualify, usually with a bigger down payment.",
    examples:
      "Example: $260,000 of cash flow with $60,000 of existing payments. A $200,000 fleet loan at " +
      "9% over 60 months adds $49,820.05 a year, for a DSCR of 2.37. With " +
      "3 years in business and a 680 score, 3 of 3 checks pass.",
    assumptions:
      "Typical lender benchmarks; each lender sets its own. The vehicles serve as collateral. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can a new business get a fleet loan?",
        answer: "Yes, though often with a larger down payment, a personal guarantee, or a higher rate. Captive finance companies sometimes have startup programs.",
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
