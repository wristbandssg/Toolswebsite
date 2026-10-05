// One-time (but safe to re-run) batch setup script: creates the Home Buyer Program tools
// (7) of the Mortgage Calculators expansion, filed under
// Mortgage Calculators > Home Buyer Program Calculators. See src/lib/calc-engine-mortgage-buyer-programs.ts for the math and
// src/lib/calc-engine-mortgage-loan-types.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-mortgage-buyer-programs-calculators.ts
// or
//   npm run db:create-mortgage-buyer-programs-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "mortgage-calculators";
const CATEGORY = { name: "Home Buyer Program Calculators", slug: "home-buyer-program-calculators" };

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
    slug: "fha-203k-renovation-mortgage-calculator",
    title: "FHA 203k Renovation Mortgage Calculator",
    description: "Estimate a renovation mortgage that covers the purchase and the repairs in one loan — FHA 203(k) Standard or Limited, or Fannie Mae HomeStyle — with the loan amount, cash needed and monthly payment.",
    metaTitle: "FHA 203k Calculator — 203(k) & HomeStyle Renovation",
    metaDescription: "Free FHA 203k calculator. Estimate the loan for purchase plus repairs, cash needed and monthly payment for FHA 203(k) or HomeStyle loans.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 250000, max: 5000000, step: 1000 }),
      currencyField("repairCost", "Repair & Renovation Cost", { default: 60000, max: 2000000, step: 1000 }),
      percentField("contingencyPercent", "Contingency Reserve", { default: 10, max: 20, step: 5, required: false }),
      currencyField("afterRepairValue", "Value After Repairs", { default: 350000, max: 10000000, step: 1000 }),
      {
        key: "program", label: "Loan Program", type: "dropdown", required: true, default: 1,
        options: [
          { label: "FHA 203(k) Standard", value: 1 },
          { label: "FHA 203(k) Limited (Repairs up to $75,000)", value: 2 },
          { label: "Fannie Mae HomeStyle Renovation", value: 3 },
        ],
      },
      percentField("annualRatePercent", "Interest Rate", { default: 6.5, max: 15, step: 0.125 }),
      percentField("fhaMipPercent", "FHA Annual MIP", { default: 0.55, max: 2, step: 0.05 }),
      percentField("homeStyleLtvPercent", "HomeStyle Maximum LTV", { default: 97, max: 97, step: 1 }),
      percentField("homeStylePmiPercent", "HomeStyle PMI Rate (Yearly)", { default: 0.5, max: 3, step: 0.05 }),
    ],
    calcResult: { label: "Total Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalProjectCost", label: "Price + Repairs + Contingency", format: "currency" },
      { key: "baseLoanAmount", label: "Base Loan Amount", format: "currency" },
      { key: "upfrontMip", label: "Upfront MIP (FHA)", format: "currency" },
      { key: "totalLoanAmount", label: "Total Loan Amount", format: "currency" },
      { key: "cashNeeded", label: "Cash Needed (Down Payment)", format: "currency" },
      { key: "principalAndInterest", label: "Principal & Interest", format: "currency" },
      { key: "monthlyMortgageInsurance", label: "Monthly Mortgage Insurance", format: "currency" },
      { key: "totalMonthlyPayment", label: "Total Monthly Payment", format: "currency", highlight: true },
    ],
    instructions:
      "Renovation mortgages roll the price of a fixer-upper and the cost of repairs into one loan. The repair money is held " +
      "in escrow and paid to contractors as work is done.\n\n" +
      "FHA 203(k) lends 96.5% of the lower of (price + repairs) and 110% of the value after repairs; the Limited version " +
      "caps repairs at $75,000 and doesn't allow structural work. Fannie Mae HomeStyle lends up to 97% (95% for some " +
      "borrowers) of the lower of (price + renovation) and the as-completed value, with PMI that can later be removed.",
    examples:
      "Example: buying at $250,000 with $60,000 of repairs plus a 10% contingency is a " +
      "$316,000 project. With a 203(k) Standard loan, the base loan is $304,940, plus $5,336.45 of " +
      "upfront MIP. You bring $11,060, and the payment is $2,100.92 a month including " +
      "$139.76 of MIP.",
    assumptions:
      "30-year fixed rate; taxes and insurance not included. FHA loans must also stay within your county's FHA loan limit. " +
      "The contingency reserve is financed and returned to principal if unused. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "203(k) or HomeStyle — which is better?",
        answer: "203(k) is easier to qualify for with lower credit scores. HomeStyle suits stronger credit, allows luxury items and investment properties, and its PMI can be cancelled.",
      },
    ],
  },
  {
    slug: "homeready-mortgage-calculator",
    title: "HomeReady Mortgage Calculator",
    description: "Check whether your income fits Fannie Mae HomeReady or Freddie Mac Home Possible (80% of area median income) and see your 3%-down payment and the savings from reduced PMI.",
    metaTitle: "HomeReady Mortgage Calculator — Income Limit & PMI",
    metaDescription: "Free HomeReady and Home Possible calculator. Check the 80% AMI income limit and see your 3%-down payment and lower PMI cost.",
    calcInputs: [
      currencyField("annualIncome", "Your Household Income (Yearly)", { default: 70000, max: 1000000, step: 1000 }),
      currencyField("areaMedianIncome", "Area Median Income", { default: 95000, max: 1000000, step: 1000 }),
      currencyField("homePrice", "Home Price", { default: 320000, max: 5000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 3, max: 100, step: 0.5 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.5, max: 15, step: 0.125 }),
      percentField("programPmiPercent", "HomeReady PMI Rate (Yearly)", { default: 0.45, max: 3, step: 0.05 }),
      percentField("standardPmiPercent", "Standard PMI Rate (Yearly)", { default: 0.7, max: 3, step: 0.05 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "incomeLimit", label: "Income Limit (80% of AMI)", format: "currency" },
      { key: "eligible", label: "Income Eligible (1 = Yes)", format: "number" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "principalAndInterest", label: "Principal & Interest", format: "currency" },
      { key: "monthlyPmi", label: "Monthly PMI", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "pmiSavingsPerMonth", label: "PMI Savings vs Standard", format: "currency" },
    ],
    instructions:
      "HomeReady (Fannie Mae) and Home Possible (Freddie Mac) are conventional loans for low- to moderate-income buyers: 3% " +
      "down, income up to 80% of the area median income (AMI), and lower mortgage insurance coverage, which cuts the PMI " +
      "cost. Gifts, grants and income from a boarder or co-borrower can count.\n\n" +
      "Look up your AMI with Fannie Mae's or Freddie Mac's eligibility tool, then enter your income and the loan details.",
    examples:
      "Example: with an AMI of $95,000, the income limit is $76,000, so a $70,000 income qualifies. " +
      "A $320,000 home with 3% down needs a $310,400 loan: $1,961.94 principal and " +
      "interest plus $116.40 of PMI — $2,078.34 a month, $64.67 less PMI than a standard loan.",
    assumptions:
      "30-year fixed; taxes and insurance not included. PMI rates depend on your credit score; the reduced coverage typically " +
      "lowers PMI by a third or more. A homebuyer education course is required for first-time buyers. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I have to be a first-time buyer?",
        answer: "No. HomeReady and Home Possible are open to repeat buyers, as long as income fits and it's your primary residence.",
      },
    ],
  },
  {
    slug: "good-neighbor-next-door-mortgage-calculator",
    title: "Good Neighbor Next Door Mortgage Calculator",
    description: "Estimate a HUD Good Neighbor Next Door purchase for teachers, police officers, firefighters and EMTs: the 50% discount, the FHA loan with $100 down, and your monthly payment.",
    metaTitle: "Good Neighbor Next Door Calculator — 50% Off HUD Home",
    metaDescription: "Free Good Neighbor Next Door calculator. See the 50% HUD discount, your FHA loan with $100 down, your payment and the monthly savings.",
    calcInputs: [
      currencyField("listPrice", "HUD List Price", { default: 220000, max: 2000000, step: 1000 }),
      percentField("discountPercent", "Discount", { default: 50, max: 50, step: 5 }),
      currencyField("downPayment", "Down Payment", { default: 100, max: 1000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.5, max: 15, step: 0.125 }),
      percentField("annualMipPercent", "FHA Annual MIP", { default: 0.55, max: 2, step: 0.05 }),
      currencyField("annualTaxesInsurance", "Taxes & Insurance per Year", { default: 3600, max: 100000, step: 100, required: false }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "discount", label: "HUD Discount", format: "currency" },
      { key: "purchasePrice", label: "Your Purchase Price", format: "currency" },
      { key: "firstMortgage", label: "FHA Loan (Incl. Upfront MIP)", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "monthlySavingsVsListPrice", label: "Monthly Savings vs Paying List Price", format: "currency" },
      { key: "silentSecondForgiven", label: "Silent Second Forgiven After 3 Years", format: "currency" },
    ],
    instructions:
      "HUD's Good Neighbor Next Door program sells HUD-owned homes in revitalization areas at 50% off the list price to " +
      "full-time law enforcement officers, pre-K–12 teachers, firefighters and EMTs. You must live in the home for 36 months. " +
      "The discount is recorded as a \"silent\" second mortgage with no payments or interest, forgiven after the 36 months.\n\n" +
      "With an FHA loan, the down payment can be as low as $100. Homes are listed on HUD's website and sold by lottery when " +
      "more than one buyer bids.",
    examples:
      "Example: a home listed at $220,000 sells for $110,000 after the $110,000 discount. With $100 " +
      "down, the FHA loan is $111,823.25, and the payment with MIP, taxes and insurance is $1,057.17 — about " +
      "$757.86 a month less than at full price. Stay 3 years and the $110,000 second " +
      "mortgage is forgiven.",
    assumptions:
      "30-year FHA loan with 1.75% upfront MIP financed. If you sell or move out before 36 months, you repay part of the " +
      "discount. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who qualifies for Good Neighbor Next Door?",
        answer: "Full-time law enforcement officers, pre-K through 12th grade teachers, firefighters and EMTs, buying in the area they serve. You can't have owned a home in the past year.",
      },
    ],
  },
  {
    slug: "teacher-next-door-mortgage-calculator",
    title: "Teacher Next Door Mortgage Calculator",
    description: "See how much a Teacher Next Door grant and down payment assistance reduce the cash you need to buy a home, and what your first mortgage payment will be.",
    metaTitle: "Teacher Next Door Calculator — Grant & Cash Needed",
    metaDescription: "Free Teacher Next Door calculator. See how a grant and down payment assistance cut the cash a teacher needs to buy, plus the mortgage payment.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 300000, max: 5000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 3.5, max: 100, step: 0.5 }),
      percentField("closingCostsPercent", "Closing Costs (% of Price)", { default: 3, max: 10, step: 0.5 }),
      currencyField("grant", "Program Grant", { default: 6000, max: 100000, step: 500, required: false }),
      currencyField("assistance", "Down Payment Assistance", { default: 10000, max: 100000, step: 500, required: false }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.5, max: 15, step: 0.125 }),
    ],
    calcResult: { label: "Cash Needed With the Program", format: "currency" },
    calcResults: [
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "closingCosts", label: "Closing Costs", format: "currency" },
      { key: "cashNeededWithout", label: "Cash Needed Without the Program", format: "currency" },
      { key: "programHelp", label: "Grant + Assistance Used", format: "currency" },
      { key: "cashNeededWith", label: "Cash Needed With the Program", format: "currency", highlight: true },
      { key: "firstMortgagePayment", label: "First Mortgage Payment", format: "currency" },
    ],
    instructions:
      "Teacher Next Door is a private program for teachers and other school staff, and some versions also cover health care " +
      "workers, first responders and government employees. It offers a grant toward closing costs and separate down payment " +
      "assistance, usually as a second mortgage. Amounts depend on the loan and your location, so enter the figures you're " +
      "offered.\n\n" +
      "This is different from HUD's Good Neighbor Next Door, which sells HUD homes at 50% off — see that calculator.",
    examples:
      "Example: a $300,000 home with 3.50% down needs $10,500 plus $9,000 of closing costs " +
      "— $19,500 in all. A $6,000 grant and $10,000 of assistance cover $16,000, leaving " +
      "$3,500. The first mortgage payment is $1,829.84 a month.",
    assumptions:
      "30-year first mortgage, principal and interest only. Down payment assistance is often a deferred second mortgage " +
      "repaid when you sell or refinance; its terms aren't modeled here. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I have to repay the Teacher Next Door grant?",
        answer: "Grants are generally not repaid if you meet the program's terms. Down payment assistance is often a second loan that may be deferred or forgiven — read the terms.",
      },
    ],
  },
  {
    slug: "energy-efficient-mortgage-calculator",
    title: "Energy Efficient Mortgage Calculator",
    description: "See how much an FHA Energy Efficient Mortgage lets you add for energy upgrades, the extra monthly payment, the energy savings, and whether the upgrades pay for themselves.",
    metaTitle: "Energy Efficient Mortgage Calculator — FHA EEM",
    metaDescription: "Free energy efficient mortgage calculator. See how much an FHA EEM adds for upgrades, the extra payment, monthly savings and net benefit.",
    calcInputs: [
      currencyField("homeValue", "Home Value", { default: 300000, max: 5000000, step: 1000 }),
      currencyField("baseLoan", "Base Mortgage Amount", { default: 289500, max: 5000000, step: 1000 }),
      currencyField("improvementCost", "Energy Improvement Cost", { default: 12000, max: 500000, step: 500 }),
      currencyField("annualSavings", "Energy Savings per Year", { default: 1200, max: 100000, step: 50 }),
      numberField("usefulLifeYears", "Useful Life of Improvements (Years)", { default: 15, min: 1, max: 50, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.5, max: 15, step: 0.125 }),
    ],
    calcResult: { label: "Net Monthly Benefit", format: "currency" },
    calcResults: [
      { key: "maxEemAmount", label: "Maximum EEM Amount (5% of Value)", format: "currency" },
      { key: "amountFinanced", label: "Improvements Financed", format: "currency" },
      { key: "newLoanAmount", label: "New Loan Amount", format: "currency" },
      { key: "addedMonthlyPayment", label: "Added Monthly Payment", format: "currency" },
      { key: "monthlyEnergySavings", label: "Monthly Energy Savings", format: "currency" },
      { key: "netMonthlyBenefit", label: "Net Monthly Benefit", format: "currency", highlight: true },
      { key: "costEffective", label: "Cost-Effective (1 = Yes)", format: "number" },
    ],
    instructions:
      "An FHA Energy Efficient Mortgage (EEM) adds the cost of energy upgrades to your purchase or refinance loan, on top " +
      "of the normal FHA limit, with no extra down payment. A home energy assessment estimates the savings, and the upgrades " +
      "must be cost-effective: total savings over their useful life must at least equal the cost.\n\n" +
      "The amount is capped at the lowest of 5% of the home's value, 115% of the area median home price, or 150% of the " +
      "conforming loan limit; this calculator uses the 5% cap. VA and conventional loans have similar programs.",
    examples:
      "Example: on a $300,000 home, the EEM can add up to $15,000. Financing $12,000 of upgrades raises " +
      "the loan to $301,500 and the payment by $75.85, while saving $100 a month " +
      "on energy — a net benefit of $24.15 a month.",
    assumptions:
      "30-year loan; savings stay level. The cost-effectiveness test here ignores rising energy prices, which make it easier " +
      "to pass. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What upgrades qualify for an EEM?",
        answer: "Ones recommended by the energy assessment — insulation, efficient windows, HVAC, water heaters and often solar panels.",
      },
    ],
  },
  {
    slug: "community-reinvestment-mortgage-calculator",
    title: "Community Reinvestment Mortgage Calculator",
    description: "Compare a bank's Community Reinvestment Act (CRA) mortgage — low down payment, no PMI, often a lower rate — with a conventional loan with PMI, and check the income guideline.",
    metaTitle: "Community Reinvestment (CRA) Mortgage Calculator",
    metaDescription: "Free CRA mortgage calculator. Check the 80% AMI income guideline and compare a no-PMI CRA loan's payment with a conventional loan with PMI.",
    calcInputs: [
      currencyField("annualIncome", "Your Household Income (Yearly)", { default: 60000, max: 1000000, step: 1000 }),
      currencyField("areaMedianIncome", "Area Median Income", { default: 90000, max: 1000000, step: 1000 }),
      currencyField("homePrice", "Home Price", { default: 300000, max: 5000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 3, max: 100, step: 0.5 }),
      percentField("craRatePercent", "CRA Loan Rate", { default: 6.25, max: 15, step: 0.125 }),
      percentField("conventionalRatePercent", "Conventional Loan Rate", { default: 6.5, max: 15, step: 0.125 }),
      percentField("pmiRatePercent", "Conventional PMI Rate (Yearly)", { default: 0.6, max: 3, step: 0.05 }),
    ],
    calcResult: { label: "Monthly Savings", format: "currency" },
    calcResults: [
      { key: "incomeAsShareOfMedian", label: "Your Income as % of AMI", format: "percentage" },
      { key: "eligibleByIncome", label: "Within 80% of AMI (1 = Yes)", format: "number" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "craPayment", label: "CRA Loan Payment (No PMI)", format: "currency" },
      { key: "conventionalPayment", label: "Conventional Payment (With PMI)", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency", highlight: true },
      { key: "yearlySavings", label: "Yearly Savings", format: "currency" },
    ],
    instructions:
      "Under the Community Reinvestment Act, banks must serve low- and moderate-income (LMI) borrowers and neighborhoods in " +
      "their area, and many offer special CRA mortgages: 3% down or less, no PMI, and sometimes a lower rate or closing cost " +
      "help. Eligibility usually depends on income (often up to 80% of AMI) or buying in an LMI census tract, where income " +
      "may not matter.\n\n" +
      "Enter your income, the AMI and both offers. Ask local banks and credit unions for their CRA or \"community\" loan.",
    examples:
      "Example: a $60,000 income is 66.67% of the $90,000 AMI, so it qualifies. On a " +
      "$291,000 loan, the CRA payment at 6.25% with no PMI is $1,791.74, versus $1,984.82 " +
      "for a conventional loan with PMI — saving $193.08 a month, or $2,316.97 a year.",
    assumptions:
      "30-year fixed loans; taxes and insurance are the same for both and not included. Each bank sets its own CRA terms. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get a CRA loan if my income is too high?",
        answer: "Often yes, if the home is in a low- or moderate-income census tract. Banks map eligible tracts using FFIEC data.",
      },
    ],
  },
  {
    slug: "down-payment-gift-fund-mortgage-calculator",
    title: "Down Payment Gift Fund Mortgage Calculator",
    description: "See how a family gift covers your down payment and closing costs, how much of your own money you still need, and whether the gift goes over the 2026 gift tax exclusion.",
    metaTitle: "Down Payment Gift Calculator — Cash & Gift Tax Limit",
    metaDescription: "Free down payment gift calculator. See how much a gift covers, your own funds still needed, and whether it exceeds the $19,000 gift tax exclusion.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 400000, max: 10000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 0.5 }),
      percentField("closingCostsPercent", "Closing Costs (% of Price)", { default: 3, max: 10, step: 0.5 }),
      currencyField("ownFunds", "Your Own Savings Available", { default: 15000, max: 10000000, step: 500 }),
      currencyField("giftAmount", "Gift Amount", { default: 30000, max: 10000000, step: 500 }),
      numberField("givers", "Number of Givers", { default: 2, min: 1, max: 10, step: 1 }),
      numberField("recipients", "Number of Recipients (You + Spouse)", { default: 1, min: 1, max: 4, step: 1 }),
      currencyField("annualExclusion", "Annual Gift Tax Exclusion (per Giver, per Recipient)", { default: 19000, max: 100000, step: 1000 }),
    ],
    calcResult: { label: "Own Funds Still Needed", format: "currency" },
    calcResults: [
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "totalCashNeeded", label: "Total Cash Needed", format: "currency" },
      { key: "giftUsed", label: "Gift Used", format: "currency" },
      { key: "ownFundsNeeded", label: "Own Funds Still Needed", format: "currency", highlight: true },
      { key: "shortfall", label: "Shortfall After Your Savings", format: "currency" },
      { key: "giftTaxExclusion", label: "Gift Tax-Free Without Filing", format: "currency" },
      { key: "giftAboveExclusion", label: "Gift Above the Exclusion", format: "currency" },
    ],
    instructions:
      "Most loans let a relative gift money for the down payment and closing costs: FHA and most conventional loans on a " +
      "one-unit primary home allow the whole amount to come from a gift, while second homes, multi-unit homes and jumbo " +
      "loans often require some of your own money. The giver signs a gift letter saying no repayment is expected, and the " +
      "lender tracks the money from their account to yours.\n\n" +
      "For 2026, each person can give each recipient $19,000 without filing a gift tax return; a couple giving to a married " +
      "couple can give $76,000. Above that, the giver files Form 709, but tax is rarely due because of the lifetime " +
      "exemption ($15 million per person in 2026).",
    examples:
      "Example: a $400,000 home with 10% down needs $40,000 plus closing costs — " +
      "$52,000 in all. A $30,000 gift covers $30,000, leaving $22,000 for you. With " +
      "$15,000 saved, you're $7,000 short. Two givers can give $38,000 before any filing, so this " +
      "gift needs no return.",
    assumptions:
      "Gift used toward the down payment and closing costs only. Lender rules on gifts vary; who may give (relatives, " +
      "fiancés, employers, charities) depends on the loan type. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does the gift giver pay tax?",
        answer: "Gift tax is the giver's responsibility, not yours, and is only owed once their lifetime gifts exceed the lifetime exemption. You don't pay income tax on a gift.",
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
