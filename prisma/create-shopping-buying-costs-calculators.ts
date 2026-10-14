// One-time (but safe to re-run) batch setup script: creates the 3 new tools of
// the user's car buying list (Shopping Calculators > Buying Costs Calculators).
// The other 17 names already exist and were NOT moved:
//   Car Payment -> auto-loan-calculator; Car Lease -> car-lease-calculator;
//   Car Depreciation, Car Affordability, Out the Door, New vs Used, Car
//   Registration Fee, Car Total Cost of Ownership -> same-name slugs;
//   Car Insurance Cost -> car-insurance-premium-calculator;
//   Lease vs Buy -> car-lease-vs-buy-calculator; Negative Equity ->
//   car-loan-payoff-vs-trade-in-calculator; Lease Buyout -> lease-buyout-calculator;
//   Extended Warranty -> extended-auto-warranty-vs-insurance-calculator;
//   Invoice Price -> dealer-invoice-price-calculator; Gap Insurance ->
//   gap-insurance-auto-calculator; Title Transfer -> car-registration-fee-calculator
//   (title transfer fees included); Car Auction Price -> car-auction-fee-calculator.
//
// See src/lib/calc-engine-shopping-buying-costs.ts for the math and how the
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-buying-costs-calculators.ts
// or
//   npm run db:create-shopping-buying-costs-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Buying Costs Calculators", slug: "buying-costs-calculators" };

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
    max: opts.max ?? 1000,
    step: opts.step ?? 1,
  };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

const TERMS: [string, number][] = [["24 months", 24], ["36 months", 36], ["48 months", 48], ["60 months", 60], ["72 months", 72], ["84 months", 84]];

const DISCLAIMER =
  "Results are estimates for planning. Your lender, dealer and local tax office set the real numbers, so check them before you sign.";

interface ToolDef {
  slug: string;
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

const TOOLS: ToolDef[] = [
  {
    slug: "car-price-calculator",
    title: "Car Price Calculator",
    description: "Find the highest car price your monthly payment budget can buy, after sales tax, dealer fees, your down payment and trade-in.",
    metaTitle: "Car Price Calculator — Price From Payment",
    metaDescription: "Free car price calculator. Turn a monthly payment you can afford into the maximum car price, with sales tax, fees, down payment and trade-in.",
    calcInputs: [
      currencyField("monthlyPayment", "Monthly Payment You Can Afford", { default: 500, max: 10000, step: 10 }),
      dropdown("termMonths", "Loan Term", TERMS, 60),
      percentField("interestRate", "Interest Rate (APR)", { default: 7, max: 30 }),
      currencyField("downPayment", "Cash Down Payment", { default: 4000, max: 1000000, step: 100, required: false }),
      currencyField("tradeInValue", "Trade-In Value", { default: 5000, max: 500000, step: 100, required: false }),
      percentField("salesTaxRate", "Sales Tax Rate", { default: 6, max: 20, step: 0.01 }),
      currencyField("fees", "Dealer, Title & Registration Fees", { default: 800, max: 50000, step: 10, required: false }),
    ],
    calcResult: { label: "Maximum Car Price", format: "currency" },
    calcResults: [
      { key: "maxCarPrice", label: "Maximum Car Price", format: "currency", highlight: true },
      { key: "outTheDoorPrice", label: "Out-the-Door Price (Tax & Fees Included)", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "salesTax", label: "Sales Tax", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCost", label: "Total Cost (Payments + Down + Trade-In)", format: "currency" },
    ],
    instructions:
      "Enter the monthly payment you're comfortable with, the loan term and the APR you expect to get.\n\n" +
      "Add your cash down payment, your trade-in value, your sales tax rate and the dealer, title and registration fees. The result is the highest price to negotiate to.",
    examples:
      "Example: $500 a month for 60 months at 7% repays a $25,251.00 loan. With $4,000 down, a $5,000 trade-in, 6% sales tax and $800 in fees, " +
      "you can pay up to $31,840.56 for the car — $34,251.00 out the door with $1,610.43 of tax. Interest adds $4,749.00, for a total cost of $39,000.00.",
    assumptions:
      "Standard amortized loan with monthly payments. Sales tax is charged on the price minus the trade-in, as most US states do; in states that tax the full price, " +
      "the answer is a little high. Fees are paid through the loan. " + DISCLAIMER,
    faq: [
      { question: "How much car can I buy for $500 a month?", answer: "About $25,000 of loan over 60 months at 7%. With some money down and a trade-in, that is often a car priced around $30,000." },
      { question: "Why shop by total price instead of payment?", answer: "A dealer can hit any payment by stretching the loan to 72 or 84 months. Knowing your top price keeps the negotiation on the number that matters." },
      { question: "How is this different from the car affordability calculator?", answer: "That one starts from your income to suggest a budget. This one starts from the payment you've already chosen and works back to the price." },
    ],
  },
  {
    slug: "car-down-payment-calculator",
    title: "Car Down Payment Calculator",
    description: "Work out how much to put down on a car — the 20% rule or the cash needed to hit your target payment — and how it changes your loan, payment and interest.",
    metaTitle: "Car Down Payment Calculator — How Much Down",
    metaDescription: "Free car down payment calculator. See how much to put down on a new or used car to meet the 20% rule or a target monthly payment.",
    calcInputs: [
      currencyField("carPrice", "Car Price", { default: 35000, max: 1000000, step: 100 }),
      currencyField("tradeInValue", "Trade-In Value", { default: 0, max: 500000, step: 100, required: false }),
      percentField("salesTaxRate", "Sales Tax Rate", { default: 6, max: 20, step: 0.01 }),
      currencyField("fees", "Dealer, Title & Registration Fees", { default: 800, max: 50000, step: 10, required: false }),
      percentField("interestRate", "Interest Rate (APR)", { default: 7, max: 30 }),
      dropdown("termMonths", "Loan Term", TERMS, 60),
      percentField("downPercent", "Down Payment Rule (% of Price)", { default: 20, max: 100, step: 1 }),
      currencyField("targetPayment", "Target Monthly Payment (Optional)", { default: 550, max: 10000, step: 10, required: false }),
    ],
    calcResult: { label: "Recommended Down Payment", format: "currency" },
    calcResults: [
      { key: "recommendedDownPayment", label: "Recommended Down Payment", format: "currency", highlight: true },
      { key: "downPaymentByRule", label: "Down Payment by % Rule", format: "currency" },
      { key: "downPaymentForTargetPayment", label: "Down Payment to Hit Target Payment", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "interestSavedVsZeroDown", label: "Interest Saved vs $0 Down", format: "currency" },
      { key: "loanToValue", label: "Loan-to-Value (Loan ÷ Price)", format: "percentage" },
    ],
    instructions:
      "Enter the car's price, any trade-in, your sales tax rate and fees, and the APR and term you expect.\n\n" +
      "Set the down payment rule (20% is common for new cars, 10% for used) and, if you have one, the most you want to pay each month. The calculator recommends whichever down payment is larger.",
    examples:
      "Example: a $35,000 car with 6% tax and $800 in fees costs $37,900 out the door. 20% down is $7,000, but a $550 payment at 7% over 60 months needs $10,123.90 down, " +
      "so that is the recommendation. You'd borrow $27,776.10 (79% of the price), pay $550 a month and save $1,904.02 in interest compared with putting nothing down.",
    assumptions:
      "Standard amortized loan with monthly payments; tax, fees and the trade-in are handled the same way as at the dealer (tax on price minus trade-in, fees financed). " +
      "The % rule is measured against the car's price. " + DISCLAIMER,
    faq: [
      { question: "How much should I put down on a car?", answer: "About 20% on a new car and 10% on a used one. That covers the first-year depreciation, so you're less likely to owe more than the car is worth." },
      { question: "Can I buy a car with no money down?", answer: "Often yes, with good credit, but you'll pay more interest and start with negative equity. Gap insurance becomes much more important." },
      { question: "Does a bigger down payment lower my interest rate?", answer: "It can. Lenders price loans partly on loan-to-value, and many offer better rates below about 80–100% LTV." },
    ],
  },
  {
    slug: "vehicle-property-tax-calculator",
    title: "Vehicle Property Tax Calculator",
    description: "Estimate the yearly personal property tax on your car from its value, your area's assessment ratio and tax rate, and any state tax relief — plus the next 5 years.",
    metaTitle: "Vehicle Property Tax Calculator — Car Tax",
    metaDescription: "Free vehicle property tax calculator. Estimate your annual car personal property tax from its value, assessment ratio, local rate and state relief.",
    calcInputs: [
      currencyField("vehicleValue", "Vehicle Value (Tax Office or Book Value)", { default: 25000, max: 2000000, step: 100 }),
      percentField("assessmentRatio", "Assessment Ratio (% of Value Taxed)", { default: 100, max: 100, step: 0.01 }),
      numberField("taxRate", "Local Tax Rate", { default: 4.57, max: 500, step: 0.01 }),
      dropdown("rateUnit", "Rate Is Quoted", [["Per $100 of assessed value", 100], ["In mills (per $1,000)", 1000]], 100),
      percentField("reliefPercent", "State Tax Relief (% Off)", { default: 30, max: 100, step: 0.1, required: false }),
      currencyField("reliefCapValue", "Relief Applies to Value Up To (0 = All)", { default: 20000, max: 2000000, step: 100, required: false }),
      percentField("yearlyValueDrop", "Yearly Drop in Car's Value", { default: 15, max: 50, step: 1, required: false }),
    ],
    calcResult: { label: "Annual Vehicle Property Tax", format: "currency" },
    calcResults: [
      { key: "annualTax", label: "Annual Vehicle Property Tax", format: "currency", highlight: true },
      { key: "assessedValue", label: "Assessed Value", format: "currency" },
      { key: "grossTaxBeforeRelief", label: "Tax Before Relief", format: "currency" },
      { key: "stateRelief", label: "State Tax Relief", format: "currency" },
      { key: "monthlySetAside", label: "Monthly Set-Aside", format: "currency" },
      { key: "effectiveTaxRate", label: "Effective Rate on Car's Value", format: "percentage" },
      { key: "fiveYearTax", label: "Total Tax Over the Next 5 Years", format: "currency" },
    ],
    instructions:
      "Enter the value your tax office uses (often a used-car guide value) and the share of it that is taxed — 100% in Virginia, 33.33% in Missouri, 70% in Connecticut, 6% in South Carolina.\n\n" +
      "Enter your county or city rate and say whether it's quoted per $100 or in mills. If your state gives relief (like Virginia's PPTRA on the first $20,000), add the percentage and the value it covers.",
    examples:
      "Example: a $25,000 car taxed at 100% and $4.57 per $100 owes $1,142.50. Relief of 30% on the first $20,000 takes off $274.20, " +
      "so the bill is $868.30 a year — $72.36 a month, or 3.47% of the car's value. If the car loses 15% of its value a year, the next 5 years cost $3,051.67.",
    assumptions:
      "Tax = value × assessment ratio × rate, minus relief on the value up to the cap. Rates and relief change each year and some places prorate the first year or add a flat " +
      "decal or license fee, which aren't included. Only about half of US states tax vehicles as personal property; in others, cars pay registration fees instead. " + DISCLAIMER,
    faq: [
      { question: "Which states charge personal property tax on cars?", answer: "About half of US states — including Virginia, Missouri, Connecticut, South Carolina, Mississippi, Kentucky and Kansas — tax cars yearly; in many others the cost is built into value-based registration fees." },
      { question: "How is car property tax calculated?", answer: "The tax office takes the car's value, applies the assessment ratio, then multiplies by the local rate. Any state relief is taken off the result." },
      { question: "Is vehicle property tax deductible?", answer: "On a US federal return, yes, if you itemize and the tax is based on the car's value. It counts toward the state and local tax (SALT) cap." },
    ],
  },
];

async function ensureCategories() {
  let main = await prisma.toolCategory.findUnique({ where: { slug: MAIN_CATEGORY.slug } });
  if (!main) {
    console.log(`Creating main category "${MAIN_CATEGORY.name}".`);
    main = await prisma.toolCategory.create({
      data: { ...MAIN_CATEGORY, parentId: null, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }

  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  console.log(`Creating sub-category "${CATEGORY.name}" under "${main.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: main.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategories();

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
  console.log("New tools are created with status Draft — review them in /admin/tools and publish when ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
