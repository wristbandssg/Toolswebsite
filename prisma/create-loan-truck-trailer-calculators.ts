// One-time (but safe to re-run) batch setup script: creates the Truck and Trailer Loan tools
// (10) of the Loan Calculators expansion 3, filed under Loan Calculators > Auto & Vehicle Loan Calculators.
// See src/lib/calc-engine-loan-truck-trailer.ts for the math and
// src/lib/calc-engine-loan-sba.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-truck-trailer-calculators.ts
// or
//   npm run db:create-loan-truck-trailer-calculators

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
    slug: "truck-loan-calculator",
    title: "Truck Loan Calculator",
    description: "Finance a semi truck or other commercial truck: trade-in, down payment, taxes and fees, the monthly payment, interest and the total cost.",
    metaTitle: "Truck Loan Calculator — Semi & Commercial Trucks",
    metaDescription: "Free commercial truck loan calculator. Enter price, trade-in, down payment and fees to see the monthly payment, interest and total cost.",
    calcInputs: [
      currencyField("price", "Truck Price", { default: 150000, max: 1000000, step: 1000 }),
      currencyField("tradeIn", "Trade-In Value", { default: 20000, max: 1000000, step: 500, required: false }),
      percentField("downPaymentPercent", "Down Payment", { default: 15, max: 100, step: 1 }),
      currencyField("taxesFees", "Taxes, Title & Fees Financed", { default: 3000, max: 200000, step: 100, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 10, max: 35, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 6 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCost", label: "Total Cost (Price, Fees & Interest)", format: "currency" },
    ],
    instructions:
      "Enter the truck's price, any trade-in, the down payment percentage (often 10%–20%, more for new businesses or " +
      "weaker credit), the taxes and fees you'll finance, and the rate and term. New heavy trucks also carry a 12% " +
      "federal excise tax, which is normally already in the dealer's price.",
    examples:
      "Example: a $150,000 truck with a $20,000 trade-in and 15% down ($19,500), plus " +
      "$3,000 of fees, leaves $113,500 to finance. At 10% over 60 months the " +
      "payment is $2,411.54, with $31,192.37 of interest — $184,192.37 in all.",
    assumptions:
      "The down payment is a percentage of the price after the trade-in. Fixed rate and equal monthly payments. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What credit score do I need for a semi truck loan?",
        answer: "Many lenders look for 600–650+, but some finance lower scores with a bigger down payment and a higher rate. Time in business matters a lot too.",
      },
    ],
  },
  {
    slug: "truck-loan-payment-calculator",
    title: "Truck Loan Payment Calculator",
    description: "Turn a commercial truck loan payment into a cost per mile and a share of your monthly revenue — the way owner-operators budget.",
    metaTitle: "Truck Loan Payment Calculator — Cost per Mile",
    metaDescription: "Free truck loan payment calculator. See the monthly payment, the truck payment per mile, and its share of your revenue.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 120000, max: 1000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10, max: 35, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 6 }),
      numberField("milesPerMonth", "Miles Driven per Month", { default: 10000, min: 0, max: 30000, step: 100 }),
      currencyField("revenuePerMile", "Revenue per Mile", { default: 2.2, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "Truck Payment per Mile", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "paymentPerMile", label: "Truck Payment per Mile", format: "currency", decimals: 3, highlight: true },
      { key: "monthlyRevenue", label: "Monthly Revenue", format: "currency" },
      { key: "paymentShareOfRevenue", label: "Payment as Share of Revenue", format: "percentage" },
    ],
    instructions:
      "Enter the loan, rate and term, then your average monthly miles and your all-in rate per mile (including fuel " +
      "surcharge). The payment per mile is a fixed cost every load has to cover, alongside fuel, insurance, " +
      "maintenance and your own pay.",
    examples:
      "Example: a $120,000 truck loan at 10% over 60 months costs $2,549.65 a " +
      "month. Running 10,000 miles, that's $0.26 a mile — 11.59% of " +
      "$22,000 of revenue at $2.20 a mile.",
    assumptions:
      "Miles and rates are steady month to month; slow months raise the cost per mile. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a typical truck payment per mile?",
        answer: "Often around 15–30 cents a mile for a financed tractor, depending on price, rate and miles run. Fewer miles means a higher per-mile cost.",
      },
    ],
  },
  {
    slug: "truck-loan-payoff-calculator",
    title: "Truck Loan Payoff Calculator",
    description: "See how much sooner you'll own your truck outright — and the interest you'll save — by adding extra to each monthly payment.",
    metaTitle: "Truck Loan Payoff Calculator — Extra Payments",
    metaDescription: "Free truck loan payoff calculator. Add an extra amount each month and see your new payoff date and interest saved.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 90000, max: 1000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 35, step: 0.05 }),
      numberField("remainingMonths", "Months Left", { default: 48, min: 1, max: 84, step: 1 }),
      currencyField("extraMonthly", "Extra Payment Each Month", { default: 500, max: 100000, step: 50 }),
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
      "Enter your balance, rate, months left and the extra you can pay each month. Owning the truck free and clear " +
      "lowers your cost per mile and makes slow freight markets easier to survive. Check your contract for prepayment " +
      "penalties, which some commercial lenders charge.",
    examples:
      "Example: $90,000 at 11% with 48 months left costs $2,326.10 a month. " +
      "Paying $2,826.10 instead pays the truck off in 38 months — 10 sooner — and saves " +
      "$4,737.79.",
    assumptions:
      "Fixed rate; extra payments go straight to principal. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I pay off my truck or save for repairs?",
        answer: "Keep a repair and slow-season reserve first — a breakdown without cash can cost far more than the interest you'd save.",
      },
    ],
  },
  {
    slug: "truck-loan-interest-calculator",
    title: "Truck Loan Interest Calculator",
    description: "Calculate total interest on a commercial truck loan at your rate, compare it with a better-credit rate, and see the interest cost per mile.",
    metaTitle: "Truck Loan Interest Calculator — Rate Comparison",
    metaDescription: "Free truck loan interest calculator. See total interest at your rate vs a better rate, the extra it costs, and interest per mile.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 120000, max: 1000000, step: 1000 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 6 }),
      percentField("yourRatePercent", "Your Interest Rate", { default: 14, max: 35, step: 0.05 }),
      percentField("betterRatePercent", "Rate With Better Credit or History", { default: 9, max: 35, step: 0.05 }),
      numberField("annualMiles", "Miles per Year", { default: 120000, min: 0, max: 400000, step: 1000 }),
    ],
    calcResult: { label: "Total Interest at Your Rate", format: "currency" },
    calcResults: [
      { key: "totalInterestYourRate", label: "Total Interest at Your Rate", format: "currency", highlight: true },
      { key: "totalInterestBetterRate", label: "Total Interest at the Better Rate", format: "currency" },
      { key: "extraInterest", label: "Extra Interest You Pay", format: "currency" },
      { key: "interestPerMile", label: "Interest per Mile (Your Rate)", format: "currency", decimals: 3 },
    ],
    instructions:
      "Truck loan rates vary widely — from single digits for established fleets with strong credit to well over 20% " +
      "for new authorities or weak credit. Enter your quote and a rate you might get with better credit or more time " +
      "in business to see what improving your profile is worth.",
    examples:
      "Example: $120,000 over 60 months at 14% costs $47,531.41 of interest; at " +
      "9% it would be $29,460.16 — $18,071.25 less. Driving 120,000 miles a " +
      "year, interest alone costs $0.08 a mile.",
    assumptions:
      "Fixed rates and equal monthly payments over the full term. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I refinance a truck loan later at a lower rate?",
        answer: "Yes — after a year or two of on-time payments and a stronger credit and business history, refinancing can cut the rate if the truck still has enough value.",
      },
    ],
  },
  {
    slug: "truck-loan-affordability-calculator",
    title: "Truck Loan Affordability Calculator",
    description: "Find the truck payment, loan and price an owner-operator can afford from miles run, rate per mile, operating costs per mile and the pay you need.",
    metaTitle: "Truck Loan Affordability Calculator — Owner-Operator",
    metaDescription: "Free truck loan affordability calculator for owner-operators. Turn miles, rate per mile and costs into a maximum truck payment and price.",
    calcInputs: [
      numberField("milesPerMonth", "Miles per Month", { default: 10000, min: 0, max: 30000, step: 100 }),
      currencyField("revenuePerMile", "Revenue per Mile", { default: 2.2, max: 20, step: 0.05 }),
      currencyField("costPerMile", "Operating Cost per Mile (Fuel, Insurance, Repairs…)", { default: 1.45, max: 20, step: 0.05 }),
      currencyField("ownerPay", "Your Monthly Take-Home Pay Needed", { default: 5000, max: 100000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 35, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 84, step: 6 }),
      percentField("downPaymentPercent", "Down Payment", { default: 15, max: 99, step: 1 }),
    ],
    calcResult: { label: "Maximum Truck Price", format: "currency" },
    calcResults: [
      { key: "monthlyRevenue", label: "Monthly Revenue", format: "currency" },
      { key: "operatingCosts", label: "Monthly Operating Costs", format: "currency" },
      { key: "maxTruckPayment", label: "Maximum Truck Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency" },
      { key: "maxTruckPrice", label: "Maximum Truck Price", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the miles you run, what you earn per mile, your operating cost per mile excluding the truck payment, and " +
      "the pay you need to take home. What's left is the most the truck payment can be; the calculator turns that into " +
      "a loan and, with your down payment, a truck price.",
    examples:
      "Example: 10,000 miles at $2.20 earns $22,000. Costs of $1.45 a mile " +
      "($14,500) and $5,000 of pay leave $2,500 for the truck. At 11% over " +
      "60 months that's a $114,982.58 loan — a truck of up to $135,273.63 with 15% down.",
    assumptions:
      "No cushion for slow months or big repairs is built in — consider budgeting below the maximum. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a typical owner-operator cost per mile?",
        answer: "Often about $1.50–$2.00 a mile including the truck payment, with fuel the biggest share. Track your own numbers from fuel and maintenance records.",
      },
    ],
  },
  {
    slug: "truck-loan-comparison-calculator",
    title: "Truck Loan Comparison Calculator",
    description: "Compare financing a new truck with a used one: loan payments, plus the higher repair costs and loan rates that usually come with older trucks.",
    metaTitle: "New vs Used Truck Loan Comparison Calculator",
    metaDescription: "Free new vs used truck loan calculator. Compare monthly payments and repairs per mile to see which truck costs less each month.",
    calcInputs: [
      numberField("milesPerMonth", "Miles per Month", { default: 10000, min: 0, max: 30000, step: 100 }),
      percentField("downPaymentPercent", "Down Payment (Both)", { default: 15, max: 100, step: 1 }),
      currencyField("newPrice", "New Truck — Price", { default: 165000, max: 1000000, step: 1000 }),
      percentField("newRatePercent", "New Truck — Rate", { default: 9, max: 35, step: 0.05 }),
      numberField("newTermMonths", "New Truck — Term (Months)", { default: 72, min: 12, max: 84, step: 6 }),
      currencyField("newRepairPerMile", "New Truck — Repairs per Mile", { default: 0.12, max: 5, step: 0.01 }),
      currencyField("usedPrice", "Used Truck — Price", { default: 85000, max: 1000000, step: 1000 }),
      percentField("usedRatePercent", "Used Truck — Rate", { default: 13, max: 35, step: 0.05 }),
      numberField("usedTermMonths", "Used Truck — Term (Months)", { default: 48, min: 12, max: 84, step: 6 }),
      currencyField("usedRepairPerMile", "Used Truck — Repairs per Mile", { default: 0.25, max: 5, step: 0.01 }),
    ],
    calcResult: { label: "Monthly Savings With the Used Truck", format: "currency" },
    calcResults: [
      { key: "newTruckPayment", label: "New Truck — Loan Payment", format: "currency" },
      { key: "usedTruckPayment", label: "Used Truck — Loan Payment", format: "currency" },
      { key: "newMonthlyCost", label: "New Truck — Payment + Repairs", format: "currency" },
      { key: "usedMonthlyCost", label: "Used Truck — Payment + Repairs", format: "currency" },
      { key: "monthlySavingsWithUsed", label: "Monthly Savings With the Used Truck", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your monthly miles and down payment, then each truck's price, rate, term and expected repair cost per mile. " +
      "Used trucks cost less but usually come with higher rates, shorter terms and more repairs and downtime. A " +
      "negative saving means the new truck is cheaper each month.",
    examples:
      "Example: a $165,000 new truck at 9% over 72 months costs $2,528.08 a month " +
      "plus repairs — $3,728.08. An $85,000 used truck at 13% over 48 months costs " +
      "$1,938.29 plus higher repairs — $4,438.29. Despite its lower price, the used truck's shorter loan and " +
      "repairs make it $710.20 a month more expensive (shown as a negative saving).",
    assumptions:
      "Repair cost per mile covers maintenance and repairs; downtime, fuel economy and warranty differences aren't " +
      "included. The two loans have different terms, so compare total cost too. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a new or used semi truck better for a new owner-operator?",
        answer: "A newer truck with warranty reduces breakdown risk; a used truck keeps debt low. Many start with a late-model used truck and get it inspected first.",
      },
    ],
  },
  {
    slug: "truck-loan-eligibility-calculator",
    title: "Truck Loan Eligibility Calculator",
    description: "Check whether you're ready for a commercial truck loan: the typical down payment for your time in business and credit, your CDL experience, and your score.",
    metaTitle: "Truck Loan Eligibility Calculator — Down Payment",
    metaDescription: "Free truck loan eligibility calculator. See the typical down payment for your credit and time in business, and check CDL experience.",
    calcInputs: [
      currencyField("price", "Truck Price", { default: 150000, max: 1000000, step: 1000 }),
      currencyField("downPaymentAvailable", "Cash Available for the Down Payment", { default: 20000, max: 1000000, step: 500 }),
      numberField("creditScore", "Your Credit Score", { default: 640, min: 300, max: 850, step: 1 }),
      numberField("yearsCdl", "Years With a CDL", { default: 3, min: 0, max: 50, step: 0.5 }),
      numberField("yearsInBusiness", "Years Your Business Has Had Its Own Authority", { default: 1, min: 0, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Checks Passed (of 3)", format: "number" },
    calcResults: [
      { key: "requiredDownPercent", label: "Typical Down Payment Required", format: "percentage" },
      { key: "requiredDownPayment", label: "Down Payment Needed", format: "currency" },
      { key: "downPaymentGap", label: "Down Payment Shortfall", format: "currency" },
      { key: "checksPassed", label: "Checks Passed (of 3)", format: "number", highlight: true },
    ],
    instructions:
      "Enter the truck price, the cash you have, your credit score, CDL experience and time in business. As a typical " +
      "guide, established businesses (2+ years) put about 10% down and newer ones about 20%, plus about 10% more with a " +
      "score below 600. The three checks: a score of 600+; 2+ years of CDL experience; and enough cash for the down " +
      "payment.",
    examples:
      "Example: with 1 year in business and a 640 score, expect about 20% " +
      "down on a $150,000 truck — $30,000. With $20,000 available, you're $10,000 " +
      "short. 2 of 3 checks pass.",
    assumptions:
      "These are general guidelines; lenders set their own rules and may also look at revenue, contracts and the " +
      "truck's age and mileage. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get a truck loan with a new authority?",
        answer: "Yes, but expect a bigger down payment (often 20%–30%) and a higher rate. A lease-purchase program or a co-signer are other options.",
      },
    ],
  },
  {
    slug: "trailer-loan-calculator",
    title: "Trailer Loan Calculator",
    description: "Finance a utility, cargo, horse, flatbed or semi trailer: sales tax and fees, amount financed, monthly payment, interest, and the trailer's total cost.",
    metaTitle: "Trailer Loan Calculator — Payment & Total Cost",
    metaDescription: "Free trailer loan calculator. Add sales tax and fees, subtract your down payment, and see the monthly payment, interest and total cost.",
    calcInputs: [
      currencyField("price", "Trailer Price", { default: 12000, max: 500000, step: 100 }),
      currencyField("downPayment", "Down Payment", { default: 1500, max: 500000, step: 100, required: false }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 6, max: 15, step: 0.05 }),
      currencyField("fees", "Title, Registration & Dealer Fees", { default: 300, max: 20000, step: 25, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 9.5, max: 36, step: 0.05 }),
      numberField("termMonths", "Loan Term (Months)", { default: 60, min: 12, max: 180, step: 6 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "Sales Tax", format: "currency" },
      { key: "amountFinanced", label: "Amount Financed", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCost", label: "Total Cost of the Trailer", format: "currency" },
    ],
    instructions:
      "Enter the trailer price, your down payment, your sales tax rate, the fees, and the loan terms. Trailer loans are " +
      "offered by dealers, banks, credit unions and online lenders; larger trailers can often be financed for longer. " +
      "The total cost adds tax, fees and interest to the price.",
    examples:
      "Example: a $12,000 trailer with $720 of sales tax and $300 of fees, less $1,500 down, means " +
      "financing $11,520. At 9.50% over 60 months that's $241.94 a month and " +
      "$2,996.49 of interest — a total cost of $16,016.49.",
    assumptions:
      "Tax and fees are financed. Some states tax trades or trailers differently. For travel trailers you'll live in, " +
      "see the RV loan calculators. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How long can you finance a trailer?",
        answer: "Commonly 2–7 years for utility and cargo trailers; larger or more expensive trailers can sometimes go longer.",
      },
    ],
  },
  {
    slug: "trailer-loan-payment-calculator",
    title: "Trailer Loan Payment Calculator",
    description: "Compare trailer loan payments and total interest over 3, 5 and 10 years to pick a term that fits your budget without overpaying.",
    metaTitle: "Trailer Loan Payment Calculator — 3, 5 or 10 Years",
    metaDescription: "Free trailer loan payment calculator. Compare monthly payments and total interest for 36, 60 and 120-month trailer loans.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 25000, max: 500000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 36, step: 0.05 }),
    ],
    calcResult: { label: "Payment — 60 Months", format: "currency" },
    calcResults: [
      { key: "payment36", label: "Payment — 36 Months", format: "currency" },
      { key: "payment60", label: "Payment — 60 Months", format: "currency", highlight: true },
      { key: "payment120", label: "Payment — 120 Months", format: "currency" },
      { key: "interest36", label: "Total Interest — 36 Months", format: "currency" },
      { key: "interest60", label: "Total Interest — 60 Months", format: "currency" },
      { key: "interest120", label: "Total Interest — 120 Months", format: "currency" },
    ],
    instructions:
      "Enter the loan amount and rate to see three common terms side by side. Longer terms lower the payment but add " +
      "interest — and a trailer can lose value faster than a long loan is paid down.",
    examples:
      "Example: $25,000 at 9% costs $794.99 a month over 36 months ($3,619.76 of interest), " +
      "$518.96 over 60 months ($6,137.53), or $316.69 over 120 months ($13,002.73).",
    assumptions:
      "The same rate for every term; lenders often charge more for longer terms. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a 10-year trailer loan a good idea?",
        answer: "Only for expensive trailers you'll keep a long time. For most, a shorter term costs much less and avoids owing more than the trailer is worth.",
      },
    ],
  },
  {
    slug: "trailer-loan-payoff-calculator",
    title: "Trailer Loan Payoff Calculator",
    description: "See how a one-time lump sum plus a little extra each month shortens your trailer loan and how much interest it saves.",
    metaTitle: "Trailer Loan Payoff Calculator — Pay It Off Early",
    metaDescription: "Free trailer loan payoff calculator. Add a lump sum and extra monthly payments to see your new payoff time and interest saved.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 15000, max: 500000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 10, max: 36, step: 0.05 }),
      numberField("remainingMonths", "Months Left", { default: 84, min: 1, max: 180, step: 1 }),
      currencyField("extraMonthly", "Extra Payment Each Month", { default: 100, max: 10000, step: 10, required: false }),
      currencyField("lumpSum", "One-Time Lump Sum Now", { default: 1000, max: 500000, step: 100, required: false }),
    ],
    calcResult: { label: "Months to Payoff", format: "number" },
    calcResults: [
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "monthsToPayoff", label: "Months to Payoff", format: "number", highlight: true },
      { key: "monthsSaved", label: "Months Saved", format: "number" },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
    ],
    instructions:
      "Enter your balance, rate and months left, then any one-time lump sum (say, from a tax refund) and the extra you " +
      "can add each month. Ask your lender to apply extra payments to principal.",
    examples:
      "Example: $15,000 at 10% with 84 months left costs $249.02 a month. A " +
      "$1,000 lump sum plus $100 extra a month clears it in 50 months — 34 " +
      "sooner — saving $2,805.83.",
    assumptions:
      "Fixed rate, no prepayment penalty, lump sum paid today. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is it worth paying off a trailer loan early?",
        answer: "If the rate is higher than what your savings earn and you have an emergency fund, yes — every extra dollar saves interest at the loan's rate.",
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
