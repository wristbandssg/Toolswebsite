// One-time (but safe to re-run) batch setup script: creates the Car Buying tools
// (8) of the Car & Vehicle Cost Calculators expansion, filed under Car & Vehicle
// Cost Calculators > Car Buying & Selling Calculators (both categories are created on first run).
// See src/lib/calc-engine-car-buying.ts for the math and
// src/lib/calc-engine-car-buying.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-car-buying-calculators.ts
// or
//   npm run db:create-car-buying-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Car & Vehicle Cost Calculators", slug: "car-vehicle-cost-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Car Buying & Selling Calculators", slug: "car-buying-selling-calculators" };

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
  "This tool provides general estimates for informational purposes only and isn't financial, tax or legal " +
  "advice. Prices, fees, taxes and rates vary by vehicle, dealer, location and provider — check current " +
  "quotes and your state or local rules for exact figures.";

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
    slug: "car-affordability-calculator",
    title: "Car Affordability Calculator",
    description: "Find how much car you can afford from your income, down payment and loan terms, with the payment, loan amount and a suggested 20% down payment.",
    metaTitle: "Car Affordability Calculator — How Much Car Can I Afford",
    metaDescription: "Free car affordability calculator. Find the car price, loan and monthly payment you can afford, plus a suggested down payment.",
    calcInputs: [
      currencyField("monthlyIncome", "Gross Monthly Income", { default: 6000, max: 1000000, step: 100 }),
      percentField("carBudgetPercent", "Share of Income for All Car Costs", { default: 15, max: 50, step: 1 }),
      currencyField("otherCarCosts", "Insurance, Fuel & Upkeep per Month", { default: 250, max: 10000, step: 10 }),
      currencyField("downPayment", "Down Payment", { default: 5000, max: 1000000, step: 500 }),
      currencyField("tradeInEquity", "Trade-In Equity", { default: 0, max: 1000000, step: 500, required: false }),
      percentField("ratePercent", "Loan Interest Rate (APR)", { default: 7, max: 30, step: 0.1 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 12, max: 96, step: 12 }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 7, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Car Price You Can Afford", format: "currency" },
    calcResults: [
      { key: "maxMonthlyPayment", label: "Max Monthly Car Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Max Loan Amount", format: "currency" },
      { key: "maxCarPrice", label: "Car Price You Can Afford", format: "currency", highlight: true },
      { key: "suggestedDownPayment", label: "Suggested Down Payment (20%)", format: "currency" },
      { key: "yourDownPaymentPercent", label: "Your Down Payment (% of Price)", format: "percentage" },
    ],
    instructions:
      "A common guideline is the 20/4/10 rule: put at least 20% down, finance for no more than 4 years, and keep total car " +
      "costs — payment, insurance, fuel and upkeep — under about 10–15% of gross income. This calculator works backward " +
      "from that budget to the price you can afford, including sales tax.\n\n" +
      "A bigger down payment lowers your payment and protects you from owing more than the car is worth.",
    examples:
      "Example: on $6,000 a month with 15% for car costs and $250 for insurance and fuel, you " +
      "could pay $650 a month — a $27,144.13 loan over 48 months. With $5,000 down, that " +
      "buys a car of about $30,041.24.",
    assumptions:
      "Sales tax applies to the full price; registration and dealer fees aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much should I put down on a car?",
        answer: "About 20% for a new car and 10% for a used one helps avoid owing more than it's worth as it depreciates.",
      },
    ],
  },
  {
    slug: "new-vs-used-car-calculator",
    title: "New vs Used Car Calculator",
    description: "Compare the total cost of a new car and a used or certified pre-owned (CPO) car over the years you keep it: payments, maintenance and resale value.",
    metaTitle: "New vs Used Car Calculator — Total Cost Comparison",
    metaDescription: "Free new vs used car calculator. Compare payments, maintenance and resale value of new, used and certified pre-owned cars.",
    calcInputs: [
      currencyField("newPrice", "New Car Price", { default: 40000, max: 1000000, step: 500 }),
      currencyField("usedPrice", "Used Car Price", { default: 25000, max: 1000000, step: 500 }),
      currencyField("cpoPremium", "Certified Pre-Owned Premium (0 = Not CPO)", { default: 0, max: 20000, step: 100, required: false }),
      percentField("newRate", "New Car Loan Rate", { default: 6, max: 30, step: 0.1 }),
      percentField("usedRate", "Used Car Loan Rate", { default: 8, max: 30, step: 0.1 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 96, step: 12 }),
      numberField("years", "Years You'll Keep It", { default: 5, min: 1, max: 20, step: 1 }),
      percentField("newDepreciationPercent", "New Car Depreciation per Year", { default: 15, max: 50, step: 1 }),
      percentField("usedDepreciationPercent", "Used Car Depreciation per Year", { default: 10, max: 50, step: 1 }),
      currencyField("newMaintenance", "New Car Maintenance per Year", { default: 500, max: 20000, step: 50 }),
      currencyField("usedMaintenance", "Used Car Maintenance per Year", { default: 1200, max: 20000, step: 50 }),
    ],
    calcResult: { label: "Savings with the Used Car", format: "currency" },
    calcResults: [
      { key: "newMonthlyPayment", label: "New Car Monthly Payment", format: "currency" },
      { key: "usedMonthlyPayment", label: "Used Car Monthly Payment", format: "currency" },
      { key: "newResaleValue", label: "New Car Resale Value", format: "currency" },
      { key: "usedResaleValue", label: "Used Car Resale Value", format: "currency" },
      { key: "newTotalCost", label: "New Car Net Cost", format: "currency" },
      { key: "usedTotalCost", label: "Used Car Net Cost", format: "currency" },
      { key: "savingsWithUsed", label: "Savings with the Used Car", format: "currency", highlight: true },
    ],
    instructions:
      "New cars lose value fastest in their first few years, so a lightly used car often costs less overall even with a " +
      "higher loan rate and more maintenance. Certified pre-owned (CPO) cars cost more than regular used cars but come " +
      "inspected and with an extended manufacturer warranty — enter the CPO premium to include it.\n\n" +
      "Net cost = all loan payments + maintenance − what the car is worth when you sell it.",
    examples:
      "Example: over 5 years, a $40,000 new car nets out at $31,150.51 and a $25,000 used car at " +
      "$21,652.34 — $9,498.17 less for the used car.",
    assumptions:
      "Both fully financed; insurance, fuel and registration assumed similar. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a certified pre-owned car worth the extra cost?",
        answer: "Often, if the CPO warranty covers repairs you'd otherwise risk paying for. Compare the premium with an extended warranty's price.",
      },
    ],
  },
  {
    slug: "car-financing-vs-cash-calculator",
    title: "Car Financing vs Cash Calculator",
    description: "Decide whether to pay cash for a car or finance it and keep your savings invested, comparing where you end up when the loan is paid off.",
    metaTitle: "Car Financing vs Cash Calculator — Pay Cash or Finance",
    metaDescription: "Free car financing vs cash calculator. Compare paying cash with financing and investing your savings at your loan rate.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 30000, max: 1000000, step: 500 }),
      percentField("ratePercent", "Loan Interest Rate (APR)", { default: 6.5, max: 30, step: 0.1 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 96, step: 12 }),
      percentField("investReturnPercent", "Return on Savings or Investments", { default: 5, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "Advantage of Paying Cash", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment If Financed", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "cashBuyerEndingSavings", label: "Pay Cash, Invest the Payments", format: "currency" },
      { key: "financeBuyerEndingSavings", label: "Finance, Keep the Cash Invested", format: "currency" },
      { key: "advantageOfPayingCash", label: "Advantage of Paying Cash", format: "currency", highlight: true },
    ],
    instructions:
      "Paying cash avoids interest; financing keeps your cash earning a return. To compare fairly, this calculator assumes " +
      "the cash buyer invests the amount they would have paid each month, while the financing buyer keeps the price " +
      "invested and makes the payments.\n\n" +
      "If your loan rate is above what your savings earn after tax, paying cash usually wins. A negative result means " +
      "financing comes out ahead. Keep an emergency fund either way.",
    examples:
      "Example: financing a $30,000 car at 6.50% for 60 months costs $586.98 a month and " +
      "$5,219.07 in interest. With savings earning 5%, paying cash leaves you $1,417.75 better off.",
    assumptions:
      "Investment returns are steady and before tax. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can paying cash cost me a better deal?",
        answer: "Sometimes — dealers earn money on financing and may offer bigger discounts or rebates tied to their loans. Negotiate the price first.",
      },
    ],
  },
  {
    slug: "zero-apr-vs-rebate-calculator",
    title: "Zero Percent APR vs Rebate Calculator",
    description: "Compare 0% APR dealer financing with taking the manufacturer cash rebate and financing elsewhere, and find the break-even loan rate.",
    metaTitle: "0% APR vs Rebate Calculator — Which Car Deal Is Better",
    metaDescription: "Free 0% APR vs rebate calculator. Compare zero percent financing with a manufacturer rebate plus a bank or credit union loan.",
    calcInputs: [
      currencyField("price", "Negotiated Car Price", { default: 35000, max: 1000000, step: 500 }),
      currencyField("downPayment", "Down Payment", { default: 0, max: 1000000, step: 500, required: false }),
      currencyField("rebate", "Manufacturer Cash Rebate", { default: 3000, max: 100000, step: 250 }),
      percentField("otherRatePercent", "Rate from Bank or Credit Union", { default: 5.9, max: 30, step: 0.1 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 96, step: 12 }),
    ],
    calcResult: { label: "Savings with 0% APR", format: "currency" },
    calcResults: [
      { key: "zeroAprMonthlyPayment", label: "0% APR Monthly Payment", format: "currency" },
      { key: "rebateMonthlyPayment", label: "Rebate + Loan Monthly Payment", format: "currency" },
      { key: "zeroAprTotalPaid", label: "0% APR Total Paid", format: "currency" },
      { key: "rebateTotalPaid", label: "Rebate + Loan Total Paid", format: "currency" },
      { key: "zeroAprSavings", label: "Savings with 0% APR", format: "currency", highlight: true },
      { key: "breakEvenRate", label: "Break-Even Loan Rate (%)", format: "number" },
    ],
    instructions:
      "Manufacturers often make you choose: 0% (or very low) APR financing, or a cash rebate off the price. Take the rebate " +
      "and you'll finance a smaller amount at a normal rate.\n\n" +
      "If you can borrow below the break-even rate, the rebate is the better deal; above it, 0% APR wins. A negative " +
      "savings figure means the rebate wins. 0% offers usually require top-tier credit.",
    examples:
      "Example: on a $35,000 car, 0% APR for 60 months costs $35,000. Taking a $3,000 rebate and " +
      "borrowing at 5.90% costs $37,029.77, so 0% APR saves $2,029.77. The rebate wins only below " +
      "about 3.58%.",
    assumptions:
      "Same term for both loans; the rebate reduces the amount financed. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is the rebate taxed?",
        answer: "In many states, sales tax is charged on the price before the rebate, so the rebate doesn't lower your tax. Check your state's rules.",
      },
    ],
  },
  {
    slug: "dealer-invoice-price-calculator",
    title: "Dealer Invoice Price Calculator",
    description: "See a new car's markup over dealer invoice, the dealer's true cost after holdback and incentives, and how much your offer saves — to negotiate with confidence.",
    metaTitle: "Dealer Invoice Price Calculator — Markup & True Cost",
    metaDescription: "Free dealer invoice calculator. See MSRP markup, holdback, dealer cost and your negotiation savings on a new car.",
    calcInputs: [
      currencyField("msrp", "MSRP (Sticker Price)", { default: 42000, max: 1000000, step: 500 }),
      currencyField("invoicePrice", "Dealer Invoice Price", { default: 39500, max: 1000000, step: 500 }),
      percentField("holdbackPercent", "Dealer Holdback (% of MSRP)", { default: 2, max: 5, step: 0.5 }),
      currencyField("dealerIncentive", "Dealer Incentives", { default: 1000, max: 100000, step: 250, required: false }),
      currencyField("offerPrice", "Your Offer Price", { default: 40000, max: 1000000, step: 250 }),
    ],
    calcResult: { label: "Savings vs MSRP", format: "currency" },
    calcResults: [
      { key: "markupOverInvoice", label: "MSRP Markup over Invoice", format: "currency" },
      { key: "markupPercent", label: "Markup over Invoice", format: "percentage" },
      { key: "dealerTrueCost", label: "Dealer's True Cost", format: "currency" },
      { key: "dealerProfitAtYourOffer", label: "Dealer Profit at Your Offer", format: "currency" },
      { key: "savingsVsMsrp", label: "Savings vs MSRP", format: "currency", highlight: true },
    ],
    instructions:
      "The invoice price is what the dealer nominally pays the manufacturer. But dealers also receive a holdback (often " +
      "1–3% of MSRP, paid back later) and sometimes dealer cash incentives, so their real cost is below invoice. An offer " +
      "near or slightly above invoice can still leave the dealer a profit.\n\n" +
      "Find invoice prices on car pricing sites, and negotiate the vehicle price before discussing trade-ins or financing.",
    examples:
      "Example: a car with a $42,000 MSRP and $39,500 invoice really costs the dealer about $37,660. An offer of " +
      "$40,000 saves you $2,000 and still leaves the dealer $2,340.",
    assumptions:
      "Holdback is a percentage of MSRP (some brands use invoice). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I buy a car below invoice?",
        answer: "Sometimes — on slow-selling models, at month or year end, or when large incentives apply.",
      },
    ],
  },
  {
    slug: "dealer-add-on-fee-calculator",
    title: "Dealer Add-On Fee Calculator",
    description: "Add up dealer add-ons, doc fees and market adjustments, and see their true cost once they're taxed and rolled into your car loan.",
    metaTitle: "Dealer Add-On Fee Calculator — True Cost of Extras",
    metaDescription: "Free dealer add-on fee calculator. See the true cost of doc fees, add-ons and markups once taxed and financed.",
    calcInputs: [
      currencyField("vehiclePrice", "Vehicle Price", { default: 35000, max: 1000000, step: 500 }),
      currencyField("docFee", "Documentation (Doc) Fee", { default: 499, max: 10000, step: 25 }),
      currencyField("addOns", "Add-Ons (Protection Packages, VIN Etching, Etc.)", { default: 1995, max: 100000, step: 50 }),
      currencyField("marketAdjustment", "Market Adjustment (Markup)", { default: 0, max: 100000, step: 250, required: false }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 7, max: 15, step: 0.1 }),
      percentField("ratePercent", "Loan Interest Rate (APR)", { default: 7, max: 30, step: 0.1 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 96, step: 12 }),
    ],
    calcResult: { label: "True Cost of Add-Ons", format: "currency" },
    calcResults: [
      { key: "addOnTotal", label: "Fees & Add-Ons", format: "currency" },
      { key: "taxOnAddOns", label: "Sales Tax on Them", format: "currency" },
      { key: "interestOnAddOns", label: "Interest If Financed", format: "currency" },
      { key: "trueCostOfAddOns", label: "True Cost of Add-Ons", format: "currency", highlight: true },
      { key: "extraPerMonth", label: "Extra per Month", format: "currency" },
      { key: "addOnsAsShareOfPrice", label: "Add-Ons as % of Price", format: "percentage" },
    ],
    instructions:
      "Dealers often add pre-installed or optional extras — paint and fabric protection, VIN etching, nitrogen tires, " +
      "anti-theft packages — plus a documentation fee and sometimes a market adjustment above MSRP. Most are negotiable " +
      "or removable; doc fees are capped in some states.\n\n" +
      "Ask for an itemized out-the-door price, and remember that financed extras also cost interest.",
    examples:
      "Example: $2,494 of fees and add-ons on a $35,000 car becomes $3,170.46 once taxed and financed for " +
      "60 months — $52.84 more per month.",
    assumptions:
      "All extras are taxable and financed with the car. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I have to pay for dealer add-ons?",
        answer: "Generally no — you can decline optional add-ons or ask for them to be removed from the price. Pre-installed items are still negotiable.",
      },
    ],
  },
  {
    slug: "car-sales-tax-calculator",
    title: "Car Sales Tax Calculator",
    description: "Calculate sales tax on a new or used car, including the trade-in tax credit and whether rebates are taxed in your state.",
    metaTitle: "Car Sales Tax Calculator — Trade-In Credit & Rebates",
    metaDescription: "Free car sales tax calculator. Find the tax on a car purchase with the trade-in credit and rebate rules for your state.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 30000, max: 1000000, step: 500 }),
      currencyField("tradeIn", "Trade-In Value", { default: 8000, max: 1000000, step: 500, required: false }),
      currencyField("rebate", "Manufacturer Rebate", { default: 1000, max: 100000, step: 250, required: false }),
      percentField("salesTaxPercent", "Sales Tax Rate (State + Local)", { default: 7, max: 15, step: 0.05 }),
      {
        key: "tradeInCredit", label: "Trade-In Reduces Taxable Price?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes (Most States)", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      {
        key: "rebateTaxed", label: "Is the Rebate Taxed?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes — Tax on Price Before Rebate", value: 1 },
          { label: "No — Rebate Lowers Taxable Price", value: 0 },
        ],
      },
    ],
    calcResult: { label: "Sales Tax", format: "currency" },
    calcResults: [
      { key: "taxableAmount", label: "Taxable Amount", format: "currency" },
      { key: "salesTax", label: "Sales Tax", format: "currency", highlight: true },
      { key: "tradeInTaxSavings", label: "Tax Saved by Trade-In", format: "currency" },
      { key: "priceAfterTradeInAndTax", label: "Price After Trade-In, Rebate & Tax", format: "currency" },
    ],
    instructions:
      "Most states tax only the difference between the car price and your trade-in value — a valuable credit when " +
      "trading in rather than selling privately. A few (such as California, Hawaii, Kentucky, Maryland, Michigan, " +
      "Montana and Virginia, with some limits) give little or no trade-in credit. Many states also tax the price before " +
      "manufacturer rebates.\n\n" +
      "Use your combined state and local rate. Registration, title and doc fees are extra.",
    examples:
      "Example: buying a $30,000 car with an $8,000 trade-in at 7% tax, you're taxed on $22,000 — " +
      "$1,540 in tax. The trade-in credit saves $560.",
    assumptions:
      "Rules vary by state, and some cap the trade-in credit. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I pay sales tax on a private-party used car?",
        answer: "Usually yes — you pay it to the DMV when you register the car, often based on the price paid or a book value.",
      },
    ],
  },
  {
    slug: "car-registration-fee-calculator",
    title: "Car Registration Fee Calculator",
    description: "Estimate car registration, title transfer and license plate fees for the first year, plus yearly renewals as the car's value drops.",
    metaTitle: "Car Registration Fee Calculator — Title & Plate Fees",
    metaDescription: "Free car registration fee calculator. Estimate registration, title transfer and license plate renewal fees over the years.",
    calcInputs: [
      currencyField("vehicleValue", "Vehicle Value", { default: 30000, max: 1000000, step: 500 }),
      currencyField("flatFee", "Flat Registration Fee", { default: 60, max: 5000, step: 5 }),
      percentField("valueFeePercent", "Value-Based Fee (% of Value)", { default: 0.5, max: 5, step: 0.05, required: false }),
      currencyField("titleFee", "Title Transfer Fee", { default: 75, max: 2000, step: 5 }),
      currencyField("plateFee", "License Plate Fee", { default: 25, max: 1000, step: 5 }),
      numberField("years", "Years", { default: 5, min: 1, max: 20, step: 1 }),
      percentField("depreciationPercent", "Value Drop per Year", { default: 15, max: 50, step: 1 }),
    ],
    calcResult: { label: "First-Year Total", format: "currency" },
    calcResults: [
      { key: "firstYearRegistration", label: "First-Year Registration", format: "currency" },
      { key: "firstYearTotal", label: "First-Year Total (with Title & Plates)", format: "currency", highlight: true },
      { key: "nextYearRenewal", label: "Next Year's Renewal", format: "currency" },
      { key: "totalOverYears", label: "Total over the Years", format: "currency" },
    ],
    instructions:
      "Registration fees vary widely by state. Some charge a flat fee; others add a fee based on the car's value (an " +
      "ad valorem or excise tax), weight or age. When you buy a car you also pay to transfer the title and for plates; " +
      "plates and registration then renew each year or two.\n\n" +
      "Enter your state's fees from the DMV website. Leave the value-based fee at 0 if your state doesn't charge one.",
    examples:
      "Example: a $30,000 car with a $60 flat fee and a 0.50% value-based fee costs $310 " +
      "to register, title and plate the first year, and $956.29 over 5 years.",
    assumptions:
      "Yearly renewals; the value-based fee falls with the car's value. Inspection and emissions fees are separate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are car registration fees tax-deductible?",
        answer: "The value-based part can be deductible as a personal property tax if you itemize; flat fees aren't.",
      },
    ],
  },
];

// Car & Vehicle Cost Calculators (and its sub-categories) are created on first use, under
// Finance Calculators.
async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  let parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY.slug } });
  if (!parent) {
    const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
    if (!finance) {
      throw new Error(
        `The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
          "then re-run this script."
      );
    }
    console.log(`Creating category "${PARENT_CATEGORY.name}" under "${finance.name}".`);
    parent = await prisma.toolCategory.create({
      data: { name: PARENT_CATEGORY.name, slug: PARENT_CATEGORY.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
    });
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
