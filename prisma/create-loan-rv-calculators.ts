// One-time (but safe to re-run) batch setup script: creates the 7 tools of
// the Loan Calculators expansion sub-batch 10 (RV Loans), filed
// under Finance Calculators > Loan Calculators > Auto & Vehicle Loan
// Calculators. See src/lib/calc-engine-loan-rv.ts for the math and
// src/lib/calc-engine-loan-debt-consolidation.ts for the full batch context.
//
// If the "Auto & Vehicle Loan Calculators" sub-category doesn't exist yet,
// it is created under Loan Calculators.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-rv-calculators.ts
// or
//   npm run db:create-loan-rv-calculators

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
    slug: "rv-loan-calculator",
    title: "RV Loan Calculator",
    description: "Work out the amount financed on an RV — price, service contract, sales tax, and fees, less your down payment and trade-in, including any loan still owed on the trade.",
    metaTitle: "RV Loan Calculator — Payment With Trade-In",
    metaDescription: "Free RV loan calculator. Add tax, fees and a service contract, subtract your down payment and trade-in (even if you owe on it), and see the payment.",
    calcInputs: [
      currencyField("rvPrice", "RV Price", { default: 85000, max: 10000000, step: 500 }),
      currencyField("serviceContract", "Extended Service Contract Financed", { default: 3000, max: 100000, step: 100, required: false }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 6, max: 15, step: 0.125 }),
      currencyField("fees", "Doc, Title & Registration Fees", { default: 900, max: 100000, step: 50, required: false }),
      currencyField("downPayment", "Down Payment", { default: 10000, max: 10000000, step: 500, required: false }),
      currencyField("tradeInValue", "Trade-In Value", { default: 20000, max: 10000000, step: 500, required: false }),
      currencyField("tradeInOwed", "Still Owed on the Trade-In", { default: 24000, max: 10000000, step: 500, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.99, max: 25, step: 0.01 }),
      numberField("termYears", "Loan Term (Years)", { default: 15, min: 2, max: 20, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Sales Tax", format: "currency" },
      { key: "negativeEquityRolledIn", label: "Negative Equity Rolled In", format: "currency" },
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the RV's price, any extended service contract you're financing, your sales tax rate and fees, your down " +
      "payment, and your trade-in's value and what you still owe on it. If you owe more than the trade-in is worth, " +
      "the difference (negative equity) is added to the new loan. Then enter the rate and term — RV loans often run " +
      "10 to 20 years.",
    examples:
      "Example: an $85,000 RV with a $3,000 service contract, 6% tax on the price after a $20,000 trade-in ($3,900) and " +
      "$900 of fees, with $10,000 down. You still owe $24,000 on the trade, so $4,000 of negative equity is rolled " +
      "in, and you finance $86,800 — $829 a month at 7.99% over 15 years, with $62,420.90 of interest.",
    assumptions:
      "Most states tax the price after the trade-in credit; some don't. Rolling negative equity into a long loan " +
      "makes it likely you'll owe more than the RV is worth for years. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I roll negative equity into a new RV loan?",
        answer: "Only if you have to. It increases what you owe on a vehicle that's already losing value. Paying the difference in cash, or keeping the old RV longer, is usually cheaper.",
      },
    ],
  },
  {
    slug: "rv-loan-payment-calculator",
    title: "RV Loan Payment Calculator",
    description: "See your RV loan payment plus insurance, storage, and maintenance, and what each night you actually spend in the RV really costs.",
    metaTitle: "RV Loan Payment Calculator — Cost per Night",
    metaDescription: "Free RV loan payment calculator. Add insurance, storage and maintenance to your payment and see the true cost per night you camp.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 70000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.99, max: 25, step: 0.01 }),
      numberField("termYears", "Loan Term (Years)", { default: 15, min: 2, max: 20, step: 1 }),
      currencyField("annualInsurance", "Yearly Insurance", { default: 1500, max: 100000, step: 50 }),
      currencyField("annualStorage", "Yearly Storage", { default: 1200, max: 100000, step: 50, required: false }),
      currencyField("annualMaintenance", "Yearly Maintenance", { default: 1500, max: 100000, step: 50 }),
      numberField("nightsPerYear", "Nights Used per Year", { default: 30, min: 1, max: 365, step: 1 }),
    ],
    calcResult: { label: "Cost per Night", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Loan Payment", format: "currency" },
      { key: "monthlyOwnershipCost", label: "Monthly Cost of Ownership", format: "currency" },
      { key: "annualOwnershipCost", label: "Yearly Cost of Ownership", format: "currency" },
      { key: "costPerNight", label: "Cost per Night", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan amount, rate, and term, your yearly insurance, storage, and maintenance, and how many nights a " +
      "year you'll actually sleep in the RV. The cost per night is the number to compare with a hotel or an RV rental " +
      "— before fuel and campground fees, which you'd pay on any trip.",
    examples:
      "Example: a $70,000 loan at 7.99% over 15 years costs $668.55 a month. With $1,500 insurance, $1,200 storage, " +
      "and $1,500 maintenance, owning costs $12,222.63 a year ($1,018.55 a month) — $407.42 for each of 30 nights.",
    assumptions:
      "Doesn't include depreciation, fuel, or campground fees. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I lower the cost per night?",
        answer: "Use the RV more, choose a smaller or used model, store it at home if your area allows, or rent it out through a peer-to-peer platform when you're not using it (check your insurance and loan terms first).",
      },
    ],
  },
  {
    slug: "rv-loan-payoff-calculator",
    title: "RV Loan Payoff Calculator",
    description: "See what you'll still owe on your RV loan when you plan to sell, what the RV may be worth then, and the extra monthly payment needed to break even.",
    metaTitle: "RV Loan Payoff Calculator — Underwater at Sale?",
    metaDescription: "Free RV loan payoff calculator. Compare your balance with the RV's value when you plan to sell, and find the extra payment to break even.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 70000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.99, max: 25, step: 0.01 }),
      numberField("termYears", "Loan Term (Years)", { default: 15, min: 2, max: 20, step: 1 }),
      currencyField("rvValue", "RV's Value Today", { default: 78000, max: 10000000, step: 500 }),
      percentField("depreciationPercent", "Yearly Depreciation", { default: 12, max: 50, step: 1 }),
      numberField("yearsUntilSale", "Years Until You Plan to Sell", { default: 5, min: 0, max: 20, step: 0.5 }),
      currencyField("extraMonthly", "Extra Monthly Payment", { default: 0, max: 100000, step: 25, required: false }),
    ],
    calcResult: { label: "Equity at Sale", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Regular Monthly Payment", format: "currency" },
      { key: "balanceAtSale", label: "Balance When You Sell", format: "currency" },
      { key: "valueAtSale", label: "Estimated Value When You Sell", format: "currency" },
      { key: "equityAtSale", label: "Equity at Sale", format: "currency", highlight: true },
      { key: "extraNeededToBreakEven", label: "Extra Monthly Payment to Break Even", format: "currency" },
    ],
    instructions:
      "Enter the loan, the RV's value today, how fast it loses value, when you expect to sell, and any extra you pay " +
      "each month. RVs often lose value faster than a long loan is paid down, so you can owe more than the RV is worth " +
      "when you sell. Negative equity means you'd have to bring cash to the sale.",
    examples:
      "Example: a $70,000, 15-year loan at 7.99% ($668.55 a month) on an RV worth $78,000 that loses 12% a year: after " +
      "5 years you'd owe $55,127.09 on an RV worth about $41,163.09 — $13,964 underwater. Paying about $190.10 a month " +
      "extra would bring you to break-even by then.",
    assumptions:
      "Depreciation varies widely by type (motorhome, travel trailer, fifth wheel), brand, and condition — check " +
      "valuation guides for your model. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I need to sell while underwater?",
        answer: "You'll need to pay the lender the difference at the sale. Options include saving up for the gap, a small personal loan, or waiting until the balance catches up with the value.",
      },
    ],
  },
  {
    slug: "rv-loan-interest-calculator",
    title: "RV Loan Interest Calculator",
    description: "Find the total and first-year interest on an RV loan, the tax saving if the RV qualifies as a second home, and the after-tax interest per night you use it.",
    metaTitle: "RV Loan Interest Calculator — Second-Home Deduction",
    metaDescription: "Free RV loan interest calculator. See total and first-year interest, the tax saving if your RV is a second home, and interest per night.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 70000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.99, max: 25, step: 0.01 }),
      numberField("termYears", "Loan Term (Years)", { default: 15, min: 2, max: 20, step: 1 }),
      {
        key: "deductible", label: "Does the RV Qualify as a Second Home (and Do You Itemize)?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes — It Has Sleeping, Cooking & Toilet Facilities, and I Itemize", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      percentField("marginalTaxPercent", "Your Marginal Tax Rate", { default: 24, max: 60, step: 1 }),
      numberField("nightsPerYear", "Nights Used per Year", { default: 30, min: 1, max: 365, step: 1 }),
    ],
    calcResult: { label: "After-Tax Interest", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "year1Interest", label: "Interest in Year 1", format: "currency" },
      { key: "year1TaxSaving", label: "Year 1 Tax Saving", format: "currency" },
      { key: "afterTaxInterest", label: "After-Tax Interest", format: "currency", highlight: true },
      { key: "year1InterestPerNight", label: "Year 1 After-Tax Interest per Night", format: "currency" },
    ],
    instructions:
      "Enter the loan, rate, and term, choose whether the interest is deductible, and enter your marginal tax rate and " +
      "the nights you use the RV each year.\n\n" +
      "Under US tax rules, a motorhome or trailer with sleeping, cooking, and toilet facilities can be a qualified " +
      "second home, so its loan interest can be deducted as home mortgage interest — but only if you itemize, the " +
      "loan is secured by the RV, and you stay within the mortgage debt limit.",
    examples:
      "Example: $70,000 at 7.99% over 15 years costs $668.55 a month and $50,339.43 in interest, $5,502.02 of it in year " +
      "one. If deductible at 24%, year one saves $1,320.48 and total after-tax interest is $38,257.97. Over 30 nights, " +
      "year-one interest after tax costs $139.38 a night.",
    assumptions:
      "Simplified: assumes you itemize every year at the same rate. You can only treat one second home as qualified at " +
      "a time, and renting the RV out can affect the rules — ask a tax adviser. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can full-time RVers deduct the interest?",
        answer: "If the RV is your main home and has sleeping, cooking, and toilet facilities, its loan interest can qualify as mortgage interest when you itemize.",
      },
    ],
  },
  {
    slug: "rv-loan-affordability-calculator",
    title: "RV Loan Affordability Calculator",
    description: "Use a lender's debt-to-income limit to find the largest RV loan you can qualify for and the highest RV price that fits with your down payment and sales tax.",
    metaTitle: "RV Loan Affordability Calculator — Max RV Price",
    metaDescription: "Free RV affordability calculator. Turn your income, debts and a DTI limit into a maximum RV loan and the highest RV price you can afford.",
    calcInputs: [
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 9000, max: 1000000, step: 100 }),
      currencyField("monthlyDebtPayments", "Current Monthly Debts (Incl. Housing)", { default: 2400, max: 1000000, step: 25 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 40, max: 60, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.99, max: 25, step: 0.01 }),
      numberField("termYears", "Loan Term (Years)", { default: 15, min: 2, max: 20, step: 1 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 99, step: 1 }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 6, max: 15, step: 0.125 }),
    ],
    calcResult: { label: "Maximum RV Price", format: "currency" },
    calcResults: [
      { key: "maxMonthlyPayment", label: "Maximum Loan Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency" },
      { key: "maxTotalWithTax", label: "Maximum Total Including Tax", format: "currency" },
      { key: "maxRvPrice", label: "Maximum RV Price", format: "currency", highlight: true },
      { key: "downPaymentNeeded", label: "Down Payment Needed", format: "currency" },
    ],
    instructions:
      "Enter your gross monthly income and current debts, the lender's maximum DTI, the loan's rate and term, your down " +
      "payment percentage, and your sales tax rate. The tool finds the largest payment the lender would allow and works " +
      "back to an RV price. Remember that insurance, storage, and fuel aren't counted by the lender but still come out " +
      "of your budget.",
    examples:
      "Example: 40% of $9,000 is $3,600; after $2,400 of debts, $1,200 is left for the RV payment. At 7.99% over 15 years " +
      "that supports a $125,644.60 loan. With 10% down that's $139,605.11 including tax — an RV priced up to $131,702.93, " +
      "with $13,960.51 down.",
    assumptions:
      "This is the most a lender may allow, not what's comfortable. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much should I really spend on an RV?",
        answer: "Use the RV Loan Payment Calculator to add insurance, storage, and maintenance, and make sure the total fits comfortably alongside savings and other goals — not just under the lender's limit.",
      },
    ],
  },
  {
    slug: "rv-loan-comparison-calculator",
    title: "RV Loan Comparison Calculator",
    description: "Compare financing and owning an RV with renting one for the same nights each year — total cost and cost per night over the years you compare.",
    metaTitle: "RV Loan Comparison Calculator — Buy vs Rent",
    metaDescription: "Free buy vs rent RV calculator. Compare the net cost of a financed RV, including depreciation, with renting for the same nights.",
    calcInputs: [
      currencyField("rvPrice", "RV Price", { default: 80000, max: 10000000, step: 500 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 1 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 7.99, max: 25, step: 0.01 }),
      numberField("termYears", "Loan Term (Years)", { default: 15, min: 2, max: 20, step: 1 }),
      percentField("depreciationPercent", "Yearly Depreciation", { default: 12, max: 50, step: 1 }),
      currencyField("annualFixedCosts", "Yearly Insurance, Storage & Maintenance", { default: 4200, max: 1000000, step: 100 }),
      numberField("yearsCompared", "Years to Compare", { default: 5, min: 1, max: 20, step: 1 }),
      numberField("nightsPerYear", "Nights per Year", { default: 30, min: 1, max: 365, step: 1 }),
      currencyField("rentalPerNight", "Rental Cost per Night (All-In)", { default: 200, max: 10000, step: 10 }),
    ],
    calcResult: { label: "Renting Saves", format: "currency" },
    calcResults: [
      { key: "ownNetCost", label: "Owning — Net Cost", format: "currency" },
      { key: "rentCost", label: "Renting — Total Cost", format: "currency" },
      { key: "ownCostPerNight", label: "Owning — Cost per Night", format: "currency" },
      { key: "rentCostPerNight", label: "Renting — Cost per Night", format: "currency" },
      { key: "rentingSaves", label: "Renting Saves", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the RV price, down payment, loan rate and term, yearly depreciation, yearly fixed costs (insurance, " +
      "storage, maintenance), how many years to compare, nights used per year, and what a comparable rental costs per " +
      "night including mileage and fees.\n\n" +
      "Owning's net cost = down payment + payments + fixed costs + the balance still owed − the RV's value at the end. " +
      "A negative 'renting saves' means owning is cheaper.",
    examples:
      "Example: an $80,000 RV with 10% down at 7.99% over 15 years, losing 12% a year and costing $4,200 a year to keep, " +
      "has a net cost of $84,742.83 over 5 years — $564.95 a night for 30 nights a year. Renting at $200 a night costs " +
      "$30,000, saving $54,742.83.",
    assumptions:
      "Fuel and campground fees are the same either way and are left out. Owning gets cheaper per night the more you " +
      "use it. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When does owning an RV make sense?",
        answer: "When you'll use it many nights a year, for several years, and value having it ready to go. Occasional campers usually save by renting.",
      },
    ],
  },
  {
    slug: "rv-loan-eligibility-calculator",
    title: "RV Loan Eligibility Calculator",
    description: "Check an RV loan against typical lender guidelines — loan-to-value, debt-to-income, credit score — and whether the loan is big enough for the longest terms.",
    metaTitle: "RV Loan Eligibility Calculator — LTV, DTI & Term",
    metaDescription: "Free RV loan eligibility calculator. Check LTV, DTI and your credit score, and whether your loan meets the minimum for a longer term.",
    calcInputs: [
      numberField("creditScore", "Your Credit Score", { default: 710, min: 300, max: 850, step: 1 }),
      numberField("lenderMinScore", "Lender's Minimum Score", { default: 680, min: 300, max: 850, step: 1 }),
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 9000, max: 1000000, step: 100 }),
      currencyField("monthlyDebtPayments", "Current Monthly Debts (Incl. Housing)", { default: 2300, max: 1000000, step: 25 }),
      currencyField("rvPrice", "RV Price", { default: 90000, max: 10000000, step: 500 }),
      currencyField("downPayment", "Down Payment", { default: 15000, max: 10000000, step: 500 }),
      percentField("maxLtvPercent", "Lender's Maximum LTV", { default: 90, max: 100, step: 1 }),
      percentField("annualRatePercent", "Expected Rate", { default: 7.99, max: 25, step: 0.01 }),
      numberField("termYears", "Loan Term Wanted (Years)", { default: 20, min: 2, max: 20, step: 1 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 40, max: 60, step: 1 }),
      currencyField("minLoanForTerm", "Lender's Minimum Loan for That Term", { default: 50000, max: 10000000, step: 1000, required: false }),
    ],
    calcResult: { label: "Loan-to-Value", format: "percentage" },
    calcResults: [
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "ltvPercent", label: "Loan-to-Value", format: "percentage", highlight: true },
      { key: "ltvHeadroomPercent", label: "Room Under LTV Limit", format: "percentage" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "dtiPercent", label: "DTI With New Loan", format: "percentage" },
      { key: "dtiHeadroomPercent", label: "Room Under DTI Limit", format: "percentage" },
      { key: "scoreMargin", label: "Points Above Minimum Score", format: "number" },
      { key: "marginOverTermMinimum", label: "Loan Size Above Term Minimum", format: "currency" },
    ],
    instructions:
      "Enter your credit score, income and debts, the RV price and down payment, the rate and term you want, and the " +
      "lender's limits. Many RV lenders only offer their longest terms (such as 15 or 20 years) on larger loans — check " +
      "the lender's term chart and enter the minimum loan size for the term you want. Any negative result shows where " +
      "you'd fall short.",
    examples:
      "Example: a $90,000 RV with $15,000 down needs a $75,000 loan — 83.33% LTV, 6.67 under a 90% cap. Over 20 years at " +
      "7.99% the payment is $626.86, so DTI on $9,000 of income with $2,300 of debts is 32.52% (7.48 under 40%). A 710 " +
      "score is 30 above 680, and the loan is $25,000 above a $50,000 minimum for a 20-year term.",
    assumptions:
      "Guideline check only. Lenders may also limit the RV's age and require a larger down payment on used or very " +
      "expensive RVs. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do lenders tie the term to the loan size?",
        answer: "Longer terms carry more risk and cost more to service, so lenders reserve them for larger loans — a small loan stretched over 20 years would also cost far more in interest than it's worth.",
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
