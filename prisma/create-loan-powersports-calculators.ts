// One-time (but safe to re-run) batch setup script: creates the Golf Cart, ATV and Snowmobile Loan tools
// (12) of the Loan Calculators expansion 4, filed under Loan Calculators > Auto & Vehicle Loan Calculators.
// See src/lib/calc-engine-loan-powersports.ts for the math and
// src/lib/calc-engine-loan-powersports.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-powersports-calculators.ts
// or
//   npm run db:create-loan-powersports-calculators

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
    slug: "golf-cart-loan-calculator",
    title: "Golf Cart Loan Calculator",
    description: "Finance a golf cart or street-legal LSV: add sales tax, subtract your down payment, and see the monthly payment, interest and total cost.",
    metaTitle: "Golf Cart Loan Calculator — Payment & Total Cost",
    metaDescription: "Free golf cart loan calculator. Add sales tax, subtract your down payment, and see the monthly payment, interest and total cost.",
    calcInputs: [
      currencyField("price", "Golf Cart Price", { default: 12000, max: 100000, step: 100 }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 6, max: 15, step: 0.05 }),
      currencyField("downPayment", "Down Payment", { default: 1500, max: 100000, step: 100, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 6 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Sales Tax", format: "currency" },
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCost", label: "Total Cost (Price, Tax & Interest)", format: "currency" },
    ],
    instructions:
      "Enter the cart's price, your sales tax rate, the down payment, and the loan rate and term. Dealers, powersports " +
      "lenders, credit unions and personal loans all finance golf carts; street-legal low-speed vehicles (LSVs) can " +
      "sometimes get auto-style rates.",
    examples:
      "Example: a $12,000 golf cart with $720 of sales tax and $1,500 down leaves $11,220 to " +
      "finance. At 8.50% over 60 months the payment is $230.20, with $2,591.73 " +
      "of interest — $15,311.73 in total.",
    assumptions:
      "Sales tax is financed; fixed rate and equal monthly payments. Registration and insurance aren't included. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I finance a used golf cart?",
        answer: "Yes — through a personal loan, a credit union, or some dealers. Rates on used carts and private sales are usually a bit higher.",
      },
    ],
  },
  {
    slug: "golf-cart-loan-payment-calculator",
    title: "Golf Cart Loan Payment Calculator",
    description: "See your golf cart loan payment plus a monthly set-aside for the battery pack an electric cart will eventually need — your real monthly budget.",
    metaTitle: "Golf Cart Loan Payment Calculator — With Battery",
    metaDescription: "Free golf cart payment calculator. See the loan payment plus a monthly reserve for battery replacement to budget an electric cart.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 10000, max: 100000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 6 }),
      currencyField("batteryCost", "Battery Replacement Cost", { default: 2500, max: 20000, step: 100, required: false }),
      numberField("batteryLifeYears", "Battery Life (Years)", { default: 6, min: 1, max: 15, step: 1 }),
    ],
    calcResult: { label: "Total Monthly Budget", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Loan Payment", format: "currency" },
      { key: "batteryReserve", label: "Battery Reserve per Month", format: "currency" },
      { key: "totalMonthlyBudget", label: "Total Monthly Budget", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions:
      "Enter the loan, rate and term. For an electric cart, add what a replacement battery pack costs and how long it " +
      "lasts — lead-acid packs often last about 4–6 years and lithium packs longer. Setting money aside each month " +
      "means the replacement won't land on a credit card. Enter 0 for a gas cart.",
    examples:
      "Example: a $10,000 cart loan at 8.50% over 60 months costs $205.17 a month. " +
      "Saving for a $2,500 battery every 6 years adds $34.72, for a monthly budget " +
      "of $239.89.",
    assumptions:
      "Battery cost spread evenly over its life; no savings interest. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Gas or electric golf cart — which costs less?",
        answer: "Electric carts are cheaper to run and quieter but need battery replacements; gas carts cost more for fuel and engine upkeep. Compare over the years you'll own it.",
      },
    ],
  },
  {
    slug: "golf-cart-loan-cost-calculator",
    title: "Golf Cart Loan Cost Calculator",
    description: "Find the true cost of owning a financed golf cart: price, loan interest, insurance and upkeep, minus what you'll sell it for — in total and per month.",
    metaTitle: "Golf Cart Loan Cost Calculator — Ownership Cost",
    metaDescription: "Free golf cart cost calculator. Add loan interest, insurance and upkeep, subtract resale value, and see the cost per month of owning a cart.",
    calcInputs: [
      currencyField("price", "Golf Cart Price (Financed)", { default: 12000, max: 100000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.5, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 6 }),
      currencyField("annualInsurance", "Insurance & Registration per Year", { default: 300, max: 10000, step: 10, required: false }),
      currencyField("annualUpkeep", "Maintenance & Charging per Year", { default: 250, max: 10000, step: 10, required: false }),
      numberField("yearsOwned", "Years You'll Keep It", { default: 6, min: 1, max: 20, step: 1 }),
      percentField("resalePercent", "Resale Value (% of Price)", { default: 35, max: 100, step: 1 }),
    ],
    calcResult: { label: "Net Cost of Ownership", format: "currency" },
    calcResults: [
      { key: "totalInterest", label: "Loan Interest", format: "currency" },
      { key: "runningCosts", label: "Insurance & Upkeep", format: "currency" },
      { key: "resaleValue", label: "Resale Value", format: "currency" },
      { key: "netCostOfOwnership", label: "Net Cost of Ownership", format: "currency", highlight: true },
      { key: "costPerMonth", label: "Cost per Month Owned", format: "currency" },
    ],
    instructions:
      "Enter the financed price, loan terms, yearly insurance and upkeep, how long you'll keep the cart, and what " +
      "share of its price you expect to get back when you sell. The net cost tells you what the cart really costs to " +
      "have — useful when deciding between new and used, or whether to buy at all.",
    examples:
      "Example: a $12,000 cart financed at 8.50% over 60 months adds $2,771.90 of " +
      "interest. 6 years of insurance and upkeep cost $3,300, and it resells for $4,200. " +
      "Net cost: $13,871.90, or $192.67 a month.",
    assumptions:
      "Whole price financed; costs stay flat each year; no battery replacement unless you add it to upkeep. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do golf carts hold their value?",
        answer: "Well-kept carts from major brands hold value fairly well, especially in golf and retirement communities; battery condition matters a lot for electric carts.",
      },
    ],
  },
  {
    slug: "golf-cart-loan-payoff-calculator",
    title: "Golf Cart Loan Payoff Calculator",
    description: "See how adding a little extra each month pays off your golf cart loan sooner, and how much interest it saves.",
    metaTitle: "Golf Cart Loan Payoff Calculator — Extra Payments",
    metaDescription: "Free golf cart loan payoff calculator. Add extra each month and see your new payoff time and the interest you save.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 8000, max: 100000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 36, step: 0.05 }),
      numberField("remainingMonths", "Months Left", { default: 48, min: 1, max: 84, step: 1 }),
      currencyField("extraMonthly", "Extra Payment Each Month", { default: 75, max: 10000, step: 5 }),
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
      "Enter your balance, rate, months left and an extra amount you can add each month. Make sure the lender applies " +
      "it to principal.",
    examples:
      "Example: $8,000 at 9% with 48 months left costs $199.08 a month. " +
      "Paying $274.08 clears it in 34 months — 14 sooner — saving $493.04.",
    assumptions:
      "Fixed rate, no prepayment penalty. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is there a penalty for paying off a golf cart loan early?",
        answer: "Most consumer powersports and personal loans have none, but check your contract — some dealer financing does.",
      },
    ],
  },
  {
    slug: "atv-loan-calculator",
    title: "ATV Loan Calculator",
    description: "Finance an ATV or side-by-side (UTV): include the dealer's freight and prep fees and sales tax for the real out-the-door price, then see the payment.",
    metaTitle: "ATV Loan Calculator — Out-the-Door Payment",
    metaDescription: "Free ATV and UTV loan calculator. Add freight, prep and sales tax, subtract your down payment, and see the payment and total cost.",
    calcInputs: [
      currencyField("price", "ATV / UTV Price (MSRP)", { default: 11000, max: 100000, step: 100 }),
      currencyField("dealerFees", "Freight, Setup & Doc Fees", { default: 900, max: 10000, step: 50, required: false }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 6, max: 15, step: 0.05 }),
      currencyField("downPayment", "Down Payment", { default: 1000, max: 100000, step: 100, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 10.5, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 12, max: 84, step: 6 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "outTheDoorPrice", label: "Out-the-Door Price", format: "currency" },
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency" },
    ],
    instructions:
      "Powersports dealers usually add freight (destination), setup/prep and documentation fees on top of MSRP. Enter " +
      "those with the price, your sales tax, down payment, rate and term to see the out-the-door price and payment.",
    examples:
      "Example: an $11,000 ATV with $900 of fees and tax comes to $12,614 out the door. With " +
      "$1,000 down, you finance $11,614; at 10.50% over 48 months that's " +
      "$297.36 a month and $2,659.17 of interest.",
    assumptions:
      "Sales tax applied to the price plus fees (rules vary by state). Fixed rate, equal monthly payments. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I negotiate ATV freight and prep fees?",
        answer: "Often yes — they're part of the dealer's price. Compare out-the-door quotes from several dealers rather than MSRP.",
      },
    ],
  },
  {
    slug: "atv-loan-payment-calculator",
    title: "ATV Loan Payment Calculator",
    description: "Should you take the dealer's low promotional rate or the cash rebate plus a bank loan? Compare the payments and total paid for each.",
    metaTitle: "ATV Loan Payment — Promo Rate vs Rebate",
    metaDescription: "Free ATV loan payment calculator. Compare a dealer promo rate with a cash rebate plus a bank or credit union loan.",
    calcInputs: [
      currencyField("amount", "Amount to Finance (Before Any Rebate)", { default: 12000, max: 100000, step: 100 }),
      percentField("promoRatePercent", "Dealer Promo Rate", { default: 1.99, max: 20, step: 0.01 }),
      numberField("promoTermMonths", "Promo Term (Months)", { default: 36, min: 6, max: 84, step: 6 }),
      currencyField("rebate", "Cash Rebate Instead of the Promo", { default: 1000, max: 20000, step: 50 }),
      percentField("bankRatePercent", "Bank / Credit Union Rate", { default: 9, max: 36, step: 0.05 }),
      numberField("bankTermMonths", "Bank Loan Term (Months)", { default: 36, min: 6, max: 84, step: 6 }),
    ],
    calcResult: { label: "Savings With the Promo Rate", format: "currency" },
    calcResults: [
      { key: "promoPayment", label: "Promo Rate — Monthly Payment", format: "currency" },
      { key: "rebatePayment", label: "Rebate + Bank Loan — Monthly Payment", format: "currency" },
      { key: "promoTotalPaid", label: "Promo Rate — Total Paid", format: "currency" },
      { key: "rebateTotalPaid", label: "Rebate + Bank Loan — Total Paid", format: "currency" },
      { key: "savingsWithPromo", label: "Savings With the Promo Rate", format: "currency", highlight: true },
    ],
    instructions:
      "Manufacturers often offer either a low promotional APR or a cash rebate, not both. Enter the amount, the promo " +
      "rate and term, the rebate, and the rate you could get from your bank or credit union. A negative saving means " +
      "the rebate is the better deal.",
    examples:
      "Example: financing $12,000 at a 1.99% promo for 36 months costs $343.66 a " +
      "month and $12,371.71 in total. Taking the $1,000 rebate and a bank loan at 9% costs " +
      "$349.80 a month and $12,592.69. The promo saves $220.99.",
    assumptions:
      "Promo rates usually need strong credit. If the terms differ, compare monthly budgets as well as totals. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do ATV promo rates have catches?",
        answer: "Some are 'deferred interest' offers on a store card: if you don't pay in full by the deadline, interest is charged back to the purchase date. Read the terms.",
      },
    ],
  },
  {
    slug: "atv-loan-cost-calculator",
    title: "ATV Loan Cost Calculator",
    description: "Work out what a financed ATV really costs per year and per hour of riding — loan interest, insurance and maintenance, minus resale value.",
    metaTitle: "ATV Loan Cost Calculator — Cost per Hour of Riding",
    metaDescription: "Free ATV cost calculator. Add loan interest, insurance and maintenance, subtract resale, and see the cost per year and per riding hour.",
    calcInputs: [
      currencyField("price", "ATV Price (Financed)", { default: 12000, max: 100000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10.5, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 48, min: 12, max: 84, step: 6 }),
      currencyField("annualInsurance", "Insurance & Registration per Year", { default: 250, max: 10000, step: 10, required: false }),
      currencyField("annualMaintenance", "Maintenance, Tires & Parts per Year", { default: 400, max: 10000, step: 10, required: false }),
      numberField("yearsOwned", "Years You'll Keep It", { default: 5, min: 1, max: 20, step: 1 }),
      percentField("resalePercent", "Resale Value (% of Price)", { default: 45, max: 100, step: 1 }),
      numberField("hoursPerYear", "Hours of Riding per Year", { default: 80, min: 0, max: 2000, step: 5 }),
    ],
    calcResult: { label: "Cost per Hour of Riding", format: "currency" },
    calcResults: [
      { key: "totalInterest", label: "Loan Interest", format: "currency" },
      { key: "runningCosts", label: "Insurance & Maintenance", format: "currency" },
      { key: "netCostOfOwnership", label: "Net Cost of Ownership", format: "currency" },
      { key: "costPerYear", label: "Cost per Year", format: "currency" },
      { key: "costPerHourOfUse", label: "Cost per Hour of Riding", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the financed price and loan terms, yearly insurance and maintenance, how long you'll keep the ATV, its " +
      "expected resale value, and how many hours you ride a year. Cost per hour is a handy way to compare buying with " +
      "renting or guided rides.",
    examples:
      "Example: a $12,000 ATV financed at 10.50% for 48 months adds $2,747.55 of " +
      "interest; 5 years of insurance and maintenance cost $3,250. After resale, owning it costs " +
      "$12,597.55 — $2,519.51 a year, or $31.49 per hour at 80 hours a year.",
    assumptions:
      "Fuel, gear and trailering aren't included; costs stay flat each year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do ATVs depreciate quickly?",
        answer: "They lose value fastest in the first couple of years; popular brands kept in good condition hold value relatively well afterward.",
      },
    ],
  },
  {
    slug: "atv-loan-payoff-calculator",
    title: "ATV Loan Payoff Calculator",
    description: "Set a date to be done with your ATV loan and see the monthly payment it takes, how much extra that is, and the interest you'll save.",
    metaTitle: "ATV Loan Payoff Calculator — Target Payoff Date",
    metaDescription: "Free ATV loan payoff calculator. Pick a target payoff month and see the payment needed, the extra per month, and interest saved.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 8000, max: 100000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 36, step: 0.05 }),
      numberField("remainingMonths", "Months Left on the Loan", { default: 48, min: 1, max: 84, step: 1 }),
      numberField("targetMonths", "Pay It Off In (Months)", { default: 24, min: 1, max: 84, step: 1 }),
    ],
    calcResult: { label: "Payment Needed", format: "currency" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "requiredPayment", label: "Payment Needed", format: "currency", highlight: true },
      { key: "extraPerMonth", label: "Extra per Month", format: "currency" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "Enter your balance, rate, the months left, and how soon you want to be debt-free — for example, before you plan " +
      "to trade up. The calculator shows the payment that gets you there.",
    examples:
      "Example: $8,000 at 11% with 48 months left costs $206.76 a month. To " +
      "pay it off in 24 months, pay $372.86 — $166.10 more — and save $975.98.",
    assumptions:
      "Fixed rate, no prepayment penalty. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I pay off my ATV before trading it in?",
        answer: "It helps — trading in with a loan balance higher than the ATV's value rolls that negative equity into your next loan.",
      },
    ],
  },
  {
    slug: "snowmobile-loan-calculator",
    title: "Snowmobile Loan Calculator",
    description: "Estimate a snowmobile loan payment — and what it works out to for each month of the riding season you actually use the sled.",
    metaTitle: "Snowmobile Loan Calculator — Payment & Cost per Season",
    metaDescription: "Free snowmobile loan calculator. See the monthly payment, total interest, and the loan cost per month of riding season.",
    calcInputs: [
      currencyField("price", "Snowmobile Price (Out the Door)", { default: 15000, max: 100000, step: 100 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9.5, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 120, step: 6 }),
      numberField("ridingMonths", "Riding Months per Year", { default: 4, min: 1, max: 12, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "loanCostPerRidingMonth", label: "Loan Cost per Riding Month", format: "currency" },
    ],
    instructions:
      "Enter the out-the-door price, down payment, rate and term, and how many months a year you can ride. You pay " +
      "every month, but only ride a few — the per-riding-month figure shows what each month on the snow really costs.",
    examples:
      "Example: a $15,000 sled with 10% down means financing $13,500. At 9.50% " +
      "over 60 months, the payment is $283.53, with $3,511.51 of interest. Over a " +
      "4-month season, that's $850.58 per riding month.",
    assumptions:
      "Fixed rate, equal monthly payments. Trail permits, insurance, storage and gear aren't included. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When is the best time to buy a snowmobile?",
        answer: "Spring and summer often bring the best deals and promotional financing on leftover models; preorder programs in spring can include rebates.",
      },
    ],
  },
  {
    slug: "snowmobile-loan-payment-calculator",
    title: "Snowmobile Loan Payment Calculator",
    description: "Compare a regular monthly snowmobile payment with a seasonal plan that skips payments in the off-season — and the extra interest skipping costs.",
    metaTitle: "Snowmobile Loan Payment Calculator — Seasonal Plan",
    metaDescription: "Free snowmobile payment calculator. Compare paying every month with skipping off-season payments, and see the extra interest.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 14000, max: 100000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9.5, max: 36, step: 0.05 }),
      numberField("termYears", "Loan Term (Years)", { default: 5, min: 1, max: 10, step: 1 }),
      numberField("payMonthsPerYear", "Months You Pay Each Year", { default: 8, min: 1, max: 12, step: 1 }),
    ],
    calcResult: { label: "Seasonal Payment", format: "currency" },
    calcResults: [
      { key: "regularPayment", label: "Regular Payment (12 a Year)", format: "currency" },
      { key: "seasonalPayment", label: "Seasonal Payment", format: "currency", highlight: true },
      { key: "regularTotalInterest", label: "Total Interest — Regular", format: "currency" },
      { key: "seasonalTotalInterest", label: "Total Interest — Seasonal", format: "currency" },
      { key: "extraInterestForSkipping", label: "Extra Interest for Skipping", format: "currency" },
    ],
    instructions:
      "Some powersports lenders offer skip-payment or seasonal plans so you only pay part of the year. Enter the loan, " +
      "rate, term and how many months a year you'll pay. Interest keeps building in the skipped months, so each " +
      "payment is bigger and the total interest is higher.",
    examples:
      "Example: $14,000 at 9.50% over 5 years costs $294.03 a month paying all " +
      "year, with $3,641.56 of interest. Paying only 8 months a year, each payment is " +
      "$448.14 and interest is $3,925.71 — $284.15 more.",
    assumptions:
      "The skipped months are the first months of each loan year (the off-season after a spring or summer purchase); " +
      "interest accrues monthly throughout. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are skip-payment plans worth it?",
        answer: "They help if your income is seasonal, but they cost more. If you can, pay year-round and keep the off-season money as a buffer.",
      },
    ],
  },
  {
    slug: "snowmobile-loan-cost-calculator",
    title: "Snowmobile Loan Cost Calculator",
    description: "Compare the yearly cost of owning a financed snowmobile — payments, insurance, storage and upkeep — with renting one for the days you ride.",
    metaTitle: "Snowmobile Cost Calculator — Own vs Rent",
    metaDescription: "Free snowmobile cost calculator. Compare owning a financed sled with renting by the day, and see the riding days needed to break even.",
    calcInputs: [
      currencyField("monthlyPayment", "Loan Payment per Month", { default: 285, max: 10000, step: 5 }),
      currencyField("annualInsurance", "Insurance & Registration per Year", { default: 300, max: 10000, step: 10, required: false }),
      currencyField("annualStorage", "Storage & Trail Permits per Year", { default: 400, max: 10000, step: 10, required: false }),
      currencyField("annualMaintenance", "Maintenance per Year", { default: 500, max: 10000, step: 10, required: false }),
      currencyField("rentalPerDay", "Rental Cost per Day", { default: 250, max: 5000, step: 5 }),
      numberField("ridingDays", "Riding Days per Season", { default: 15, min: 0, max: 200, step: 1 }),
    ],
    calcResult: { label: "Savings by Owning", format: "currency" },
    calcResults: [
      { key: "ownershipCostPerYear", label: "Cost to Own per Year", format: "currency" },
      { key: "rentalCostPerYear", label: "Cost to Rent per Year", format: "currency" },
      { key: "savingsByOwning", label: "Savings by Owning", format: "currency", highlight: true },
      { key: "ownershipCostPerDay", label: "Owning — Cost per Riding Day", format: "currency" },
      { key: "breakEvenRidingDays", label: "Riding Days to Break Even", format: "number" },
    ],
    instructions:
      "Enter your loan payment, yearly insurance, storage, permits and maintenance, plus the local daily rental rate " +
      "and how many days you ride. A negative saving means renting is cheaper at your number of riding days.",
    examples:
      "Example: a $285 payment plus insurance, storage and maintenance costs $4,620 a year. " +
      "Renting for 15 days at $250 costs $3,750. Owning costs $308 " +
      "per riding day; you'd need 19 riding days a season to break even.",
    assumptions:
      "While the loan is being repaid; after payoff, owning gets much cheaper. Doesn't include depreciation or the " +
      "value of the sled you'll own. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How many days a year do I need to ride to make buying worth it?",
        answer: "Roughly the yearly cost of owning divided by the daily rental rate — often 15–25 days for a financed sled.",
      },
    ],
  },
  {
    slug: "snowmobile-loan-payoff-calculator",
    title: "Snowmobile Loan Payoff Calculator",
    description: "See how a one-time lump sum and a small extra monthly payment shorten your snowmobile loan and cut the interest.",
    metaTitle: "Snowmobile Loan Payoff Calculator — Pay Off Early",
    metaDescription: "Free snowmobile loan payoff calculator. Add a lump sum and extra monthly payments to see your new payoff time and interest saved.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 11000, max: 100000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9.5, max: 36, step: 0.05 }),
      numberField("remainingMonths", "Months Left", { default: 48, min: 1, max: 120, step: 1 }),
      currencyField("extraMonthly", "Extra Payment Each Month", { default: 50, max: 10000, step: 5, required: false }),
      currencyField("lumpSum", "One-Time Lump Sum Now", { default: 1500, max: 100000, step: 100, required: false }),
    ],
    calcResult: { label: "Months to Payoff", format: "number" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "monthsToPayoff", label: "Months to Payoff", format: "number", highlight: true },
      { key: "monthsSaved", label: "Months Saved", format: "number" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "Enter your balance, rate and months left, a lump sum you can pay now (a bonus or tax refund), and any extra each " +
      "month. Paying down the loan in the off-season is a good use of money you aren't spending on riding.",
    examples:
      "Example: $11,000 at 9.50% with 48 months left costs $276.35 a month. A " +
      "$1,500 lump sum plus $50 extra a month clears it in 34 months — 14 " +
      "sooner — saving $923.59.",
    assumptions:
      "Fixed rate, no prepayment penalty, lump sum paid today. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does paying extra lower my monthly snowmobile payment?",
        answer: "Usually not — it shortens the loan instead. Some lenders will re-amortize after a large lump sum if you ask.",
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
