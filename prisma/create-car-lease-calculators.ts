// One-time (but safe to re-run) batch setup script: creates the Car Leasing tools
// (7) of the Car & Vehicle Cost Calculators expansion, filed under Car & Vehicle
// Cost Calculators > Car Lease, Rental & Transport Calculators (both categories are created on first run).
// See src/lib/calc-engine-car-lease.ts for the math and
// src/lib/calc-engine-car-buying.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-car-lease-calculators.ts
// or
//   npm run db:create-car-lease-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Car & Vehicle Cost Calculators", slug: "car-vehicle-cost-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Car Lease, Rental & Transport Calculators", slug: "car-lease-rental-transport-calculators" };

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
    slug: "car-lease-calculator",
    title: "Car Lease Calculator",
    description: "Calculate a car lease payment from the price, residual value, money factor and term, with the depreciation and finance parts and the equivalent APR.",
    metaTitle: "Car Lease Calculator — Monthly Lease Payment",
    metaDescription: "Free car lease calculator. Find your monthly lease payment from price, residual, money factor and term, plus the equivalent APR.",
    calcInputs: [
      currencyField("msrp", "MSRP", { default: 40000, max: 1000000, step: 500 }),
      currencyField("negotiatedPrice", "Negotiated Price (Gross Cap Cost)", { default: 38000, max: 1000000, step: 500 }),
      currencyField("downPayment", "Down Payment (Cap Cost Reduction)", { default: 2000, max: 1000000, step: 250, required: false }),
      currencyField("acquisitionFee", "Acquisition Fee", { default: 695, max: 5000, step: 5, required: false }),
      percentField("residualPercent", "Residual Value (% of MSRP)", { default: 58, max: 100, step: 1 }),
      numberField("moneyFactor", "Money Factor", { default: 0.0025, min: 0, max: 0.01, step: 0.0001 }),
      numberField("termMonths", "Lease Term (Months)", { default: 36, min: 12, max: 60, step: 3 }),
      percentField("salesTaxPercent", "Sales Tax on Payment", { default: 7, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "residualValue", label: "Residual Value", format: "currency" },
      { key: "monthlyDepreciation", label: "Monthly Depreciation Charge", format: "currency" },
      { key: "monthlyFinanceCharge", label: "Monthly Finance Charge", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment (with Tax)", format: "currency", highlight: true },
      { key: "equivalentApr", label: "Equivalent APR (%)", format: "number" },
      { key: "totalLeaseCost", label: "Total Lease Cost", format: "currency" },
    ],
    instructions:
      "A lease payment has two parts: depreciation — the drop from the adjusted cap cost (price + fees − down payment) to " +
      "the residual value, spread over the term — and a finance charge of (cap cost + residual) × money factor. Most " +
      "states then tax the monthly payment.\n\n" +
      "Multiply the money factor by 2,400 to compare it with a loan APR. Negotiate the price just as you would when buying; " +
      "a higher residual means a lower payment.",
    examples:
      "Example: leasing a $40,000 car for $38,000 with a 58% residual and a 0.0025 money factor " +
      "(6% APR) costs $561.32 a month for 36 months.",
    assumptions:
      "Tax on the monthly payment; some states tax the full price up front. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I put money down on a lease?",
        answer: "Usually as little as possible — if the car is totaled or stolen early, gap coverage pays the lender, but your down payment is typically lost.",
      },
    ],
  },
  {
    slug: "car-lease-vs-buy-calculator",
    title: "Car Lease vs Buy Calculator",
    description: "Compare leasing a car with buying it on a loan over the same period, counting the equity you'd own at the end of the lease term.",
    metaTitle: "Car Lease vs Buy Calculator — Which Costs Less",
    metaDescription: "Free lease vs buy calculator. Compare lease payments with loan payments minus your car equity over the same term.",
    calcInputs: [
      currencyField("price", "Car Price", { default: 38000, max: 1000000, step: 500 }),
      currencyField("downPayment", "Down Payment (Both Options)", { default: 2000, max: 1000000, step: 250, required: false }),
      currencyField("leasePayment", "Monthly Lease Payment", { default: 450, max: 100000, step: 10 }),
      numberField("leaseTermMonths", "Lease Term (Months)", { default: 36, min: 12, max: 60, step: 3 }),
      currencyField("leaseEndFees", "Lease-End Fees (Disposition, Wear)", { default: 395, max: 10000, step: 25, required: false }),
      percentField("loanRatePercent", "Loan Interest Rate (APR)", { default: 6.5, max: 30, step: 0.1 }),
      numberField("loanTermMonths", "Loan Term (Months)", { default: 60, min: 12, max: 96, step: 12 }),
      percentField("valueLostPercent", "Value Lost by End of Lease Term", { default: 40, max: 100, step: 1 }),
    ],
    calcResult: { label: "Savings with Leasing", format: "currency" },
    calcResults: [
      { key: "leaseTotalCost", label: "Lease Total Cost", format: "currency" },
      { key: "loanMonthlyPayment", label: "Loan Monthly Payment", format: "currency" },
      { key: "buyPaymentsOverTerm", label: "Paid on the Loan by Then", format: "currency" },
      { key: "carValueAtEnd", label: "Car Value at the End", format: "currency" },
      { key: "loanBalanceAtEnd", label: "Loan Balance at the End", format: "currency" },
      { key: "buyNetCost", label: "Buying Net Cost (After Equity)", format: "currency" },
      { key: "leaseSavings", label: "Savings with Leasing", format: "currency", highlight: true },
    ],
    instructions:
      "Leasing gives lower payments and a new car every few years, but you own nothing at the end. Buying costs more each " +
      "month, but you build equity — the car's value minus what you still owe. This compares both over the lease term.\n\n" +
      "Buying usually wins if you keep cars well past the loan; leasing can suit drivers who want a new car every 2–3 " +
      "years and stay within the mileage limit. A negative result means buying is cheaper.",
    examples:
      "Example: over 36 months, leasing a $38,000 car costs $18,595. Buying it costs $27,357.73 " +
      "in payments but leaves $22,800 of car against a $15,812.36 balance, a net $20,370.09 — so leasing " +
      "saves $1,775.09 over this period.",
    assumptions:
      "Insurance and maintenance assumed equal; opportunity cost of cash ignored. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens if I end a lease early?",
        answer: "Early termination usually means paying the remaining depreciation and fees, which can be thousands of dollars. Lease transfers or buyouts may cost less.",
      },
    ],
  },
  {
    slug: "lease-buyout-calculator",
    title: "Lease Buyout Calculator",
    description: "Calculate the cost of buying your car at the end of a lease — residual value, purchase option fee and sales tax — and compare it with the car's market value.",
    metaTitle: "Lease Buyout Calculator — Is Buying Your Lease Worth It",
    metaDescription: "Free lease buyout calculator. Add the residual, fees and tax and compare your lease-end buyout price with market value.",
    calcInputs: [
      currencyField("residualValue", "Residual Value (Buyout Price in Contract)", { default: 22000, max: 1000000, step: 250 }),
      currencyField("purchaseOptionFee", "Purchase Option Fee", { default: 350, max: 5000, step: 25, required: false }),
      numberField("monthsLeft", "Payments Left (0 = Lease End)", { default: 0, min: 0, max: 60, step: 1, required: false }),
      currencyField("monthlyPayment", "Monthly Lease Payment", { default: 450, max: 100000, step: 10, required: false }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 7, max: 15, step: 0.1 }),
      currencyField("marketValue", "Market Value of the Car", { default: 25000, max: 1000000, step: 250 }),
    ],
    calcResult: { label: "Savings vs Market Price", format: "currency" },
    calcResults: [
      { key: "remainingPayments", label: "Remaining Payments", format: "currency" },
      { key: "salesTax", label: "Sales Tax", format: "currency" },
      { key: "totalBuyoutCost", label: "Total Buyout Cost", format: "currency" },
      { key: "marketValueWithTax", label: "Similar Car on the Market (with Tax)", format: "currency" },
      { key: "buyoutSavingsVsMarket", label: "Savings vs Market Price", format: "currency", highlight: true },
    ],
    instructions:
      "Your lease contract sets the price to buy the car — the residual value — plus a purchase option fee. When used-car " +
      "prices are high, the car may be worth more than the buyout, so buying it (and keeping or selling it) can make sense. " +
      "If it's worth less, just return it.\n\n" +
      "Many lessors allow early buyouts; you'll pay the remaining payments or an adjusted payoff. Ask for the exact payoff quote.",
    examples:
      "Example: a $22,000 residual plus a $350 fee and tax makes the buyout $23,890. A similar " +
      "car would cost $26,750, so buying out saves $2,860.",
    assumptions:
      "Sales tax applies to the residual; some states also tax fees. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I sell my leased car to a dealer?",
        answer: "Some lessors allow third-party buyouts and some don't; check with your leasing company before shopping it around.",
      },
    ],
  },
  {
    slug: "lease-mileage-overage-calculator",
    title: "Lease Mileage Overage Calculator",
    description: "Project your lease-end mileage from the miles you've driven so far, the overage fee you'd owe, and the miles per month you can drive to stay under the limit.",
    metaTitle: "Lease Mileage Overage Calculator — Excess Mile Fees",
    metaDescription: "Free lease mileage calculator. Project lease-end miles, excess mileage fees and the monthly miles that keep you under the limit.",
    calcInputs: [
      numberField("milesPerYearAllowed", "Miles Allowed per Year", { default: 12000, min: 0, max: 100000, step: 1000 }),
      numberField("termMonths", "Lease Term (Months)", { default: 36, min: 12, max: 60, step: 3 }),
      numberField("milesSoFar", "Miles Driven So Far", { default: 30000, min: 0, max: 1000000, step: 500 }),
      numberField("monthsElapsed", "Months into the Lease", { default: 24, min: 1, max: 60, step: 1 }),
      currencyField("overageFeePerMile", "Excess Mileage Fee per Mile", { default: 0.25, max: 2, step: 0.01 }),
      currencyField("prepaidPerMile", "Price per Mile If Bought in Advance", { default: 0.15, max: 2, step: 0.01, required: false }),
    ],
    calcResult: { label: "Overage Fee", format: "currency" },
    calcResults: [
      { key: "totalMilesAllowed", label: "Total Miles Allowed", format: "number" },
      { key: "projectedMilesAtEnd", label: "Projected Miles at Lease End", format: "number" },
      { key: "projectedOverageMiles", label: "Projected Excess Miles", format: "number" },
      { key: "overageFee", label: "Overage Fee", format: "currency", highlight: true },
      { key: "costIfMilesBoughtUpFront", label: "Cost If Miles Bought in Advance", format: "currency" },
      { key: "milesPerMonthToStayUnder", label: "Miles per Month to Stay Under", format: "number" },
    ],
    instructions:
      "Leases include a mileage allowance — often 10,000–15,000 miles a year — and charge about 15–30 cents for each mile " +
      "over at turn-in. If you're on track to go over, you can drive less, buy extra miles (some lessors sell them at a " +
      "discount before the lease ends), or buy the car, which avoids the fee.\n\n" +
      "Excess mileage fees don't apply if you buy out the lease.",
    examples:
      "Example: 30,000 miles after 24 months puts you on track for 45,000 miles — 9,000 " +
      "over the allowance, or $2,250 in fees. To stay under, drive no more than 500 miles a month.",
    assumptions:
      "Your mileage continues at the same pace. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I get money back for unused miles?",
        answer: "Rarely — most leases don't refund unused miles, though some lessors credit miles bought in advance that you didn't use.",
      },
    ],
  },
  {
    slug: "car-subscription-calculator",
    title: "Car Subscription Calculator",
    description: "Compare a car subscription service, which bundles insurance and maintenance, with leasing or buying a car — total and per-month cost over the same period.",
    metaTitle: "Car Subscription Calculator — Subscription vs Lease vs Buy",
    metaDescription: "Free car subscription calculator. Compare an all-in car subscription with leasing or buying, including insurance and upkeep.",
    calcInputs: [
      numberField("months", "Months You Need a Car", { default: 24, min: 1, max: 120, step: 1 }),
      currencyField("subscriptionMonthly", "Subscription Fee per Month (All-In)", { default: 900, max: 100000, step: 25 }),
      currencyField("subscriptionStartFee", "Subscription Start Fee", { default: 500, max: 10000, step: 25, required: false }),
      currencyField("leasePayment", "Lease Payment per Month", { default: 450, max: 100000, step: 10 }),
      currencyField("leaseDueAtSigning", "Lease Due at Signing", { default: 2500, max: 100000, step: 100 }),
      currencyField("insuranceMonthly", "Insurance per Month (Lease or Buy)", { default: 150, max: 10000, step: 5 }),
      currencyField("upkeepMonthly", "Maintenance & Registration per Month", { default: 40, max: 10000, step: 5 }),
      currencyField("price", "Car Price If Buying", { default: 35000, max: 1000000, step: 500 }),
      currencyField("downPayment", "Down Payment If Buying", { default: 3500, max: 1000000, step: 250 }),
      percentField("loanRatePercent", "Loan Rate (60-Month Loan)", { default: 7, max: 30, step: 0.1 }),
      percentField("depreciationPercent", "Depreciation per Year", { default: 15, max: 50, step: 1 }),
    ],
    calcResult: { label: "Cheapest per Month", format: "currency" },
    calcResults: [
      { key: "subscriptionTotal", label: "Subscription Total", format: "currency" },
      { key: "leaseTotal", label: "Lease Total (with Insurance & Upkeep)", format: "currency" },
      { key: "buyNetCost", label: "Buying Net Cost (After Equity)", format: "currency" },
      { key: "subscriptionPerMonth", label: "Subscription per Month", format: "currency" },
      { key: "leasePerMonth", label: "Lease per Month", format: "currency" },
      { key: "buyPerMonth", label: "Buying per Month", format: "currency" },
      { key: "cheapestPerMonth", label: "Cheapest per Month", format: "currency", highlight: true },
    ],
    instructions:
      "Car subscriptions charge one monthly fee that typically includes the car, insurance, maintenance and roadside " +
      "assistance, with short commitments and sometimes the option to swap cars. You pay for that flexibility.\n\n" +
      "For a fair comparison, add insurance and upkeep to the lease and buy options. Buying counts the equity you'd have " +
      "if you sold the car at the end.",
    examples:
      "Example: over 24 months, a subscription costs $920.83 a month, leasing $744.17 and buying " +
      "$747.62 once you count the car's resale value.",
    assumptions:
      "Buying uses a 60-month loan and steady depreciation; selling costs ignored. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who is a car subscription good for?",
        answer: "People who need a car for a few months, are relocating, or want flexibility and don't mind paying more for it.",
      },
    ],
  },
  {
    slug: "novated-lease-calculator",
    title: "Novated Lease Calculator",
    description: "Estimate the tax savings of an Australian novated lease: salary-packaged car payments and running costs, the ATO minimum residual, and FBT-exempt electric vehicles.",
    metaTitle: "Novated Lease Calculator — Australia Tax Savings",
    metaDescription: "Free novated lease calculator for Australia. Estimate pre-tax savings, residual and FBT for EVs and petrol cars.",
    calcInputs: [
      currencyField("vehiclePrice", "Drive-Away Price (incl. GST)", { unit: "A$", default: 50000, max: 1000000, step: 500 }),
      currencyField("runningCosts", "Yearly Running Costs (Fuel, Rego, Insurance, Service)", { unit: "A$", default: 6000, max: 100000, step: 100 }),
      {
        key: "termYears", label: "Lease Term", type: "dropdown", required: true, default: 3,
        options: [
          { label: "1 Year", value: 1 },
          { label: "2 Years", value: 2 },
          { label: "3 Years", value: 3 },
          { label: "4 Years", value: 4 },
          { label: "5 Years", value: 5 },
        ],
      },
      percentField("ratePercent", "Lease Interest Rate", { default: 8, max: 20, step: 0.1 }),
      {
        key: "fbtExempt", label: "Vehicle Type", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Electric Vehicle Under the LCT Threshold (FBT-Exempt)", value: 1 },
          { label: "Petrol / Diesel / Hybrid", value: 0 },
        ],
      },
      percentField("marginalRatePercent", "Marginal Tax Rate (incl. Medicare Levy)", { default: 32, max: 47, step: 1 }),
    ],
    calcResult: { label: "Yearly Savings", format: "currency", currency: "AUD" },
    calcResults: [
      { key: "residualPayment", label: "Residual (Balloon) at Lease End", format: "currency", currency: "AUD" },
      { key: "annualLeasePayments", label: "Yearly Lease Payments", format: "currency", currency: "AUD" },
      { key: "preTaxDeductions", label: "Yearly Pre-Tax Deductions", format: "currency", currency: "AUD" },
      { key: "postTaxContribution", label: "Yearly Post-Tax Contribution", format: "currency", currency: "AUD" },
      { key: "taxSaved", label: "Income Tax Saved", format: "currency", currency: "AUD" },
      { key: "netAnnualCost", label: "Net Yearly Cost", format: "currency", currency: "AUD" },
      { key: "costWithoutNovatedLease", label: "Yearly Cost Without Salary Packaging", format: "currency", currency: "AUD" },
      { key: "annualSavings", label: "Yearly Savings", format: "currency", highlight: true, currency: "AUD" },
    ],
    instructions:
      "A novated lease is a three-way agreement between you, your employer and a lender: your employer pays the car lease " +
      "and running costs from your salary, mostly before tax, and GST is claimed on the car price and running costs.\n\n" +
      "Electric vehicles under the luxury car tax threshold are exempt from fringe benefits tax, so the whole package can " +
      "be pre-tax (the exempt benefit still counts toward reportable fringe benefits). For petrol cars, part of the cost — " +
      "about 20% of the car's price a year — is usually paid post-tax to remove FBT. The ATO sets a minimum residual you " +
      "pay at the end of the lease.",
    examples:
      "Example: a $50,000 EV on a 3-year novated lease with $6,000 of running costs means " +
      "$16,238.84 of pre-tax deductions a year, saving $5,196.43 in tax at 32%. That's about " +
      "$6,820.31 a year less than paying from your take-home pay.",
    assumptions:
      "GST credits on price and running costs; ATO minimum residuals; residual not included in yearly costs. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens at the end of a novated lease?",
        answer: "You pay the residual and own the car, refinance the residual, or trade the car in and start a new lease.",
      },
    ],
  },
  {
    slug: "company-car-benefit-calculator",
    title: "Company Car Benefit Calculator",
    description: "Calculate UK company car tax (benefit in kind) from the list price and BIK rate, the employer's National Insurance, and compare it with taking a cash allowance.",
    metaTitle: "Company Car Benefit Calculator — UK BIK Tax",
    metaDescription: "Free UK company car tax calculator. Find benefit in kind tax on a company car and compare it with a cash allowance.",
    calcInputs: [
      currencyField("listPrice", "List Price (P11D Value)", { unit: "£", default: 40000, max: 1000000, step: 500 }),
      percentField("bikPercent", "BIK Rate (EV 4% in 2026/27)", { default: 4, max: 37, step: 1 }),
      {
        key: "taxBand", label: "Your Income Tax Band", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Basic Rate (20%)", value: 1 },
          { label: "Higher Rate (40%)", value: 2 },
          { label: "Additional Rate (45%)", value: 3 },
        ],
      },
      currencyField("employeeContribution", "Your Yearly Contribution to the Car", { unit: "£", default: 0, max: 100000, step: 100, required: false }),
      currencyField("cashAllowance", "Cash Allowance Alternative (Yearly)", { unit: "£", default: 6000, max: 100000, step: 100, required: false }),
    ],
    calcResult: { label: "Yearly Company Car Tax", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "taxableBenefit", label: "Taxable Benefit", format: "currency", currency: "GBP" },
      { key: "yearlyTax", label: "Yearly Company Car Tax", format: "currency", highlight: true, currency: "GBP" },
      { key: "monthlyTax", label: "Monthly Company Car Tax", format: "currency", currency: "GBP" },
      { key: "employerClass1ANic", label: "Employer's Class 1A NIC", format: "currency", currency: "GBP" },
      { key: "cashAllowanceAfterTaxAndNi", label: "Cash Allowance After Tax & NI", format: "currency", currency: "GBP" },
    ],
    instructions:
      "In the UK a company car you can use privately is a taxable benefit in kind (BIK). The benefit is the car's list " +
      "price × a BIK percentage set by its CO2 emissions; you pay income tax on it at your marginal rate, and your " +
      "employer pays Class 1A National Insurance at 15%.\n\n" +
      "Electric cars have a 4% BIK rate in 2026/27, rising to 5% in 2027/28; petrol and diesel cars range up to 37%. " +
      "Fuel provided for private use is taxed separately.",
    examples:
      "Example: a £40,000 electric car at 4% BIK is a £1,600 benefit, costing a higher-rate taxpayer " +
      "£640 a year (£53.33 a month). A £6,000 cash allowance would leave £3,480 after tax and NI.",
    assumptions:
      "2026/27 rates; no fuel benefit. Scottish income tax bands differ. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is an electric company car worth it?",
        answer: "Usually — the low BIK rate makes electric company cars, or salary sacrifice for one, very tax-efficient compared with petrol cars.",
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
