// One-time (but safe to re-run) batch setup script: creates 13 mortgage tools from the user's
// real estate list, filed in three children of Real Estate Calculators > Mortgage Calculators
// (Payment, Type & Cost; Refinance & Home Equity; Property & Construction Mortgage).
// See src/lib/calc-engine-re-mortgage-types.ts for the math.
//
// HOW TO RUN (after prisma/restructure-real-estate-main-category.ts --apply)
//   npx tsx prisma/create-re-mortgage-types-calculators.ts
// or
//   npm run db:create-re-mortgage-types-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

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
  return { key, label, type: "number", unit: opts.unit, required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
  title: string;
  category: string;
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

const YN = (key: string, label: string, def: number) => dropdown(key, label, [["No", 0], ["Yes", 1]], def);

const PAYMENT = "mortgage-payment-type-calculators";
const REFI = "refinance-home-equity-calculators";
const PROPERTY = "property-construction-mortgage-calculators";

const LAND_RESULTS = [
  { key: "monthlyPayment", label: "Monthly Loan Payment", format: "currency", highlight: true },
  { key: "downPayment", label: "Down Payment", format: "currency" },
  { key: "loanAmount", label: "Loan Amount", format: "currency" },
  { key: "balloonPayment", label: "Balloon Payment Due", format: "currency" },
  { key: "yearlyPropertyTax", label: "Yearly Property Tax", format: "currency" },
  { key: "totalMonthlyCost", label: "Monthly Cost incl. Property Tax", format: "currency" },
  { key: "totalInterest", label: "Total Interest", format: "currency" },
];

function landInputs(o: { price: number; down: number; rate: number; taxRate: number; agLabel: string; vlb?: boolean }) {
  return [
    currencyField("landPrice", "Land Price", { default: o.price, max: 20000000, step: 1000 }),
    ...(o.vlb ? [YN("vlbLoan", "Texas Veterans Land Board Loan (Max $150,000, 5% Down, 30 Years)", 0)] : []),
    percentField("downPaymentPercent", "Down Payment", { default: o.down, max: 100, step: 1 }),
    percentField("interestRate", "Interest Rate", { default: o.rate, max: 15, step: 0.125 }),
    numberField("amortizationYears", "Amortization (Years)", { default: 20, min: 1, max: 30 }),
    numberField("balloonYears", "Balloon After (Years, 0 = None)", { default: 0, max: 30, required: false }),
    percentField("propertyTaxRate", "Property Tax Rate", { default: o.taxRate, max: 5, step: 0.01 }),
    YN("agValuation", o.agLabel, 0),
  ];
}

const TOOLS: ToolDef[] = [
  {
    slug: "mortgage-on-1-million-house-calculator",
    title: "Mortgage on 1 Million House Calculator",
    category: PAYMENT,
    description: "See the monthly mortgage payment on a $1 million house — principal, interest, tax, insurance and PMI — the income you'd need to qualify, and whether the loan is a jumbo.",
    metaTitle: "Mortgage on a $1 Million House — Payment & Income Needed",
    metaDescription: "Free $1 million house mortgage calculator. See the monthly payment, income needed to afford a $1M home, down payment and jumbo loan check.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 1000000, max: 20000000, step: 10000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 20, max: 100, step: 1 }),
      percentField("interestRate", "Interest Rate", { default: 6.75, max: 15, step: 0.125 }),
      dropdown("loanTerm", "Loan Term", [["30 Years", 30], ["20 Years", 20], ["15 Years", 15]], 30),
      percentField("propertyTaxRate", "Property Tax Rate", { default: 1.1, max: 5, step: 0.01 }),
      currencyField("annualInsurance", "Homeowners Insurance per Year", { default: 3000, max: 50000, step: 100 }),
      currencyField("monthlyHoa", "Monthly HOA Dues", { default: 0, max: 10000, required: false }),
      currencyField("monthlyDebts", "Other Monthly Debt Payments", { default: 800, max: 50000, required: false }),
      percentField("pmiRate", "PMI Rate (Under 20% Down)", { default: 0.5, max: 2, step: 0.05, required: false }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Total Monthly Payment", format: "currency", highlight: true },
      { key: "principalAndInterest", label: "Principal & Interest", format: "currency" },
      { key: "incomeNeeded", label: "Yearly Income Needed (28/36 Rule)", format: "currency" },
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "isJumboLoan", label: "Jumbo Loan? (1 = Yes)", format: "number" },
      { key: "totalInterest", label: "Total Interest Over the Loan", format: "currency" },
    ],
    instructions: "The price starts at $1,000,000 — change it if you like. Enter your down payment, rate and term, then property tax, insurance and HOA. Add your other monthly debts to see the income lenders would want.",
    examples: "Example: a $1 million house with 20% down at 6.75% for 30 years costs $5,188.78 a month in principal and interest, or $6,355.45 with 1.1% property tax and $3,000 insurance. You'd need about $272,400 a year in income with $800 of other debts.",
    assumptions: "The 2026 conforming loan limit is $832,750 in most of the US (up to $1,249,125 in high-cost areas); loans above it are jumbo loans, which often need 10–20% down, 700+ credit and 6–12 months of reserves. Income needed uses the 28/36 rule; some lenders go to 43–45% DTI.",
    faq: [
      { question: "How much do I need to make to afford a $1 million house?", answer: "Roughly $250,000–$300,000 a year with 20% down at today's rates, depending on taxes, insurance and your other debts." },
      { question: "How much is the down payment on a $1 million house?", answer: "$200,000 at 20% (no PMI). Jumbo programs may allow 10% down — $100,000." },
    ],
  },
  {
    slug: "asset-depletion-mortgage-calculator",
    title: "Asset Depletion Mortgage Calculator",
    category: PAYMENT,
    description: "Qualify for a mortgage with your savings instead of a paycheck — turn cash, investment and retirement accounts into monthly qualifying income the way asset depletion lenders do, and see the most house it supports.",
    metaTitle: "Asset Depletion Mortgage Calculator — Qualify with Assets",
    metaDescription: "Free asset depletion mortgage calculator. Convert savings, brokerage and retirement assets into qualifying income and find your max home price.",
    calcInputs: [
      currencyField("cashAssets", "Cash, Savings & CDs", { default: 300000, max: 100000000, step: 1000 }),
      currencyField("investmentAssets", "Stocks, Bonds & Mutual Funds", { default: 1200000, max: 100000000, step: 1000 }),
      currencyField("retirementAssets", "Retirement Accounts (401k, IRA)", { default: 800000, max: 100000000, step: 1000 }),
      YN("over59", "Borrower Is 59½ or Older", 1),
      currencyField("downPayment", "Down Payment", { default: 200000, max: 50000000, step: 1000 }),
      currencyField("closingCosts", "Closing Costs", { default: 20000, max: 1000000, step: 500 }),
      currencyField("reservesRequired", "Reserves the Lender Requires", { default: 50000, max: 5000000, step: 500, required: false }),
      dropdown("depletionMonths", "Depletion Term", [["360 Months (Fannie Mae / Most Lenders)", 360], ["240 Months", 240], ["84 Months (Some Non-QM)", 84]], 360),
      currencyField("otherMonthlyIncome", "Other Monthly Income (Pension, Social Security)", { default: 2500, max: 200000, required: false }),
      currencyField("monthlyDebts", "Monthly Debt Payments", { default: 0, max: 100000, required: false }),
      percentField("dtiLimit", "Lender's DTI Limit", { default: 43, max: 55, step: 1 }),
      percentField("interestRate", "Interest Rate", { default: 7, max: 15, step: 0.125 }),
      dropdown("loanTerm", "Loan Term", [["30 Years", 30], ["15 Years", 15]], 30),
      percentField("propertyTaxRate", "Property Tax Rate", { default: 1.1, max: 5, step: 0.01 }),
      percentField("insuranceRate", "Insurance (% of Price per Year)", { default: 0.4, max: 3, step: 0.05 }),
    ],
    calcResult: { label: "Qualifying Monthly Income", format: "currency" },
    calcResults: [
      { key: "qualifyingMonthlyIncome", label: "Qualifying Monthly Income", format: "currency", highlight: true },
      { key: "incomeFromAssets", label: "Monthly Income from Assets", format: "currency" },
      { key: "eligibleAssets", label: "Eligible Assets After Haircuts & Cash Needs", format: "currency" },
      { key: "maxHousingPayment", label: "Max Monthly Housing Payment", format: "currency" },
      { key: "maxHomePrice", label: "Max Home Price", format: "currency" },
      { key: "maxLoanAmount", label: "Max Loan Amount", format: "currency" },
    ],
    instructions: "Enter your liquid assets by type, your down payment, closing costs and any reserves the lender wants kept aside. Choose the depletion term your lender uses, then add any other steady income, your debts and the loan terms.",
    examples: "Example: $300,000 cash, $1.2 million in investments and $800,000 in retirement (age 60+) count as $1,700,000 after haircuts. After $270,000 for the down payment, closing and reserves, $1,430,000 ÷ 360 months = $3,972.22 a month; with a $2,500 pension, $6,472.22 of income supports about a $520,500 home with $200,000 down.",
    assumptions: "Typical haircuts: cash 100%, stocks and bonds 70%, retirement accounts 60% (70% at 59½+). Fannie Mae's asset-depletion method divides by 360 months; non-QM lenders may use 84–240 months, which gives a much higher income. Funds used for the down payment, closing and reserves are taken out first.",
    faq: [
      { question: "What is an asset depletion mortgage?", answer: "A loan where the lender turns your assets into monthly income — usually assets ÷ 360 — so retirees and wealthy borrowers without a salary can qualify." },
      { question: "Which assets count for asset depletion?", answer: "Liquid assets: cash, CDs, stocks, bonds, mutual funds and retirement accounts (with haircuts). Real estate and business equity usually don't." },
    ],
  },
  {
    slug: "first-lien-heloc-vs-mortgage-calculator",
    title: "First Lien HELOC vs Mortgage Calculator",
    category: REFI,
    description: "Test the first-lien HELOC strategy honestly: deposit all your income into a HELOC that replaces your mortgage, vs keeping the mortgage and paying the same surplus as extra principal — payoff time and total interest.",
    metaTitle: "First Lien HELOC vs Mortgage Calculator — Fair Comparison",
    metaDescription: "Free first lien HELOC vs mortgage calculator. Compare payoff time and interest with all income in a HELOC vs extra payments on your mortgage.",
    calcInputs: [
      currencyField("balance", "Mortgage Balance", { default: 300000, max: 10000000, step: 1000 }),
      percentField("mortgageRate", "Mortgage Rate", { default: 6.5, max: 15, step: 0.125 }),
      numberField("remainingYears", "Years Left on Mortgage", { default: 30, min: 1, max: 40 }),
      percentField("helocRate", "First-Lien HELOC Rate", { default: 8.5, max: 18, step: 0.125 }),
      currencyField("monthlyIncome", "Monthly Take-Home Income", { default: 9000, max: 500000, step: 100 }),
      currencyField("monthlyExpenses", "Monthly Living Expenses (Excluding Mortgage)", { default: 6500, max: 500000, step: 100 }),
    ],
    calcResult: { label: "HELOC Saves", format: "currency" },
    calcResults: [
      { key: "helocSaves", label: "Interest the HELOC Saves (Negative = Mortgage Wins)", format: "currency", highlight: true },
      { key: "helocPayoffYears", label: "Payoff Time with the HELOC (Years)", format: "number" },
      { key: "mortgagePayoffYears", label: "Payoff Time with Mortgage + Extra Payments (Years)", format: "number" },
      { key: "helocTotalInterest", label: "Total Interest — HELOC", format: "currency" },
      { key: "mortgageTotalInterest", label: "Total Interest — Mortgage", format: "currency" },
      { key: "mortgagePayment", label: "Regular Mortgage Payment", format: "currency" },
      { key: "monthlySurplus", label: "Monthly Surplus (Income − Expenses)", format: "currency" },
    ],
    instructions: "Enter your mortgage balance, rate and years left, the HELOC's rate, your monthly take-home pay and your living costs. The HELOC side deposits every paycheck and pays bills from the line; the mortgage side pays the normal payment plus the same leftover cash as extra principal.",
    examples: "Example: a $300,000 balance at 6.5% vs a first-lien HELOC at 8.5%, with $9,000 of income and $6,500 of expenses. Paying the $2,500 surplus into the mortgage pays it off in about 16.3 years with $185,846 of interest; the HELOC takes about 21.4 years and costs $341,172 — the mortgage wins by about $155,300.",
    assumptions: "Interest on the HELOC is charged on the average daily balance: paychecks lower it at the start of the month and spending raises it gradually. The real driver of fast payoff is the surplus, not the account — so a first-lien HELOC only wins when its rate is close to or below the mortgage rate. HELOC rates are variable and can rise.",
    faq: [
      { question: "Does a first lien HELOC pay off a mortgage faster?", answer: "Only because all your surplus goes toward the balance. Paying the same surplus as extra principal on a lower-rate mortgage usually does as well or better." },
      { question: "What is a first lien HELOC?", answer: "A home equity line of credit that replaces your mortgage as the first lien, often used like a checking account." },
    ],
  },
  {
    slug: "proprietary-reverse-mortgage-calculator",
    title: "Proprietary Reverse Mortgage Calculator",
    category: REFI,
    description: "Estimate how much a proprietary (jumbo) reverse mortgage could give you on a high-value home, and compare it with a government HECM capped at the 2026 $1,249,125 limit.",
    metaTitle: "Proprietary Reverse Mortgage Calculator — Jumbo vs HECM",
    metaDescription: "Free proprietary reverse mortgage calculator. Estimate a jumbo reverse mortgage on a high-value home and compare it with a HECM.",
    calcInputs: [
      currencyField("homeValue", "Home Value", { default: 2500000, max: 20000000, step: 10000 }),
      numberField("youngestAge", "Youngest Borrower's Age", { default: 70, min: 55, max: 100 }),
      percentField("expectedRate", "Expected Interest Rate", { default: 7.5, max: 15, step: 0.125 }),
      currencyField("mortgageBalance", "Existing Mortgage to Pay Off", { default: 200000, max: 10000000, step: 1000, required: false }),
      currencyField("closingCosts", "Closing Costs & Origination", { default: 15000, max: 200000, step: 500 }),
    ],
    calcResult: { label: "Net Available — Proprietary", format: "currency" },
    calcResults: [
      { key: "proprietaryNetAvailable", label: "Net Available — Proprietary Reverse", format: "currency", highlight: true },
      { key: "proprietaryPrincipalLimit", label: "Proprietary Principal Limit", format: "currency" },
      { key: "hecmNetAvailable", label: "Net Available — HECM", format: "currency" },
      { key: "hecmPrincipalLimit", label: "HECM Principal Limit", format: "currency" },
      { key: "proprietaryGivesMore", label: "Proprietary Gives More By", format: "currency" },
      { key: "shortfallToPayOffMortgage", label: "Shortfall to Pay Off Your Mortgage", format: "currency" },
    ],
    instructions: "Enter your home's value, the youngest borrower's age, the expected rate, any mortgage that must be paid off and the closing costs. Some proprietary programs start at age 55; HECMs require 62.",
    examples: "Example: on a $2.5 million home with a 70-year-old borrower at 7.5%, a proprietary reverse mortgage could lend about $831,250; after a $200,000 payoff and $15,000 of costs, about $616,250 is available. A HECM, capped at $1,249,125 of value and charging 2% upfront MIP, nets about $234,700.",
    assumptions: "Principal limit factors here are approximations — each lender publishes its own by age and rate. Proprietary reverse mortgages have no FHA insurance or upfront MIP, lend on values up to about $4 million (some more), and may allow condos HECMs don't. Borrowers must keep paying property tax, insurance and upkeep. Get quotes and HUD-approved counseling.",
    faq: [
      { question: "What is a proprietary reverse mortgage?", answer: "A private 'jumbo' reverse mortgage not insured by FHA, for homes worth more than the HECM limit." },
      { question: "Is a jumbo reverse mortgage better than a HECM?", answer: "For high-value homes it usually lends more and has no mortgage insurance; for homes under the limit, a HECM often offers more and has FHA protections." },
    ],
  },
  {
    slug: "equity-release-calculator",
    title: "Equity Release Calculator",
    category: REFI,
    description: "Estimate how much tax-free cash you could release from your UK home with a lifetime mortgage, how the roll-up interest grows over time and how much equity would be left for your estate.",
    metaTitle: "Equity Release Calculator UK — Lifetime Mortgage",
    metaDescription: "Free equity release calculator (UK). See how much you could release with a lifetime mortgage by age, the roll-up interest and equity left.",
    calcInputs: [
      numberField("propertyValue", "Property Value", { unit: "£", default: 400000, max: 20000000, step: 1000 }),
      numberField("youngestAge", "Youngest Homeowner's Age", { default: 70, min: 55, max: 100 }),
      percentField("healthUplift", "Enhanced Rate Uplift (Health/Lifestyle)", { default: 0, max: 10, step: 1, required: false }),
      numberField("amountWanted", "Amount You Want to Release (0 = Maximum)", { unit: "£", default: 0, max: 10000000, step: 1000, required: false }),
      percentField("interestRate", "Lifetime Mortgage Rate (Fixed)", { default: 6.5, max: 12, step: 0.05 }),
      numberField("years", "Years Until the Loan Is Repaid", { default: 15, min: 1, max: 45 }),
      percentField("houseGrowth", "House Price Growth per Year", { default: 3, max: 10, step: 0.25 }),
    ],
    calcResult: { label: "Maximum Release", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "maxRelease", label: "Maximum You Could Release", format: "currency", currency: "GBP", highlight: true },
      { key: "maxLoanToValue", label: "Maximum Loan-to-Value", format: "percentage" },
      { key: "amountOwedLater", label: "Amount Owed with Roll-Up Interest", format: "currency", currency: "GBP" },
      { key: "homeValueLater", label: "Home Value Then", format: "currency", currency: "GBP" },
      { key: "equityLeftLater", label: "Equity Left for Your Estate", format: "currency", currency: "GBP" },
      { key: "yearsToDouble", label: "Years for the Debt to Double", format: "number" },
    ],
    instructions: "Enter your home's value and the youngest owner's age. If you have health conditions that may qualify for enhanced terms, add an uplift. Enter the amount you want (or leave 0 for the maximum), the fixed rate, and how many years until the loan is likely repaid.",
    examples: "Example: a 70-year-old with a £400,000 home could release up to about £152,000 (38%). At 6.5% rolled up monthly, that grows to about £401,900 in 15 years; if the home rises 3% a year to about £623,200, about £221,300 of equity remains.",
    assumptions: "Maximum loan-to-value rises with age — roughly 20% at 55 to about 55% in your 80s — and varies by lender. Lifetime mortgage interest compounds unless you choose voluntary payments. Equity Release Council standards include a no-negative-equity guarantee and the right to stay for life. Releasing equity can affect means-tested benefits; regulated advice is required.",
    faq: [
      { question: "How much equity can I release?", answer: "Typically 20–55% of your home's value depending on your age and health; older borrowers can release more." },
      { question: "How does interest work on equity release?", answer: "With a roll-up lifetime mortgage, interest is added to the loan and compounds — at 6.5% the debt roughly doubles every 11 years." },
    ],
  },
  {
    slug: "manufactured-home-refinance-calculator",
    title: "Manufactured Home Refinance Calculator",
    category: REFI,
    description: "See if refinancing your manufactured or mobile home loan pays off — new payment, monthly savings, break-even on closing costs, lifetime savings and the loan-to-value lenders allow for real-property vs chattel loans.",
    metaTitle: "Manufactured Home Refinance Calculator — Savings & Break-Even",
    metaDescription: "Free manufactured home refinance calculator. Compare your mobile home loan with a new one: payment, savings, break-even and LTV limits.",
    calcInputs: [
      currencyField("currentBalance", "Current Loan Balance", { default: 90000, max: 2000000, step: 500 }),
      percentField("currentRate", "Current Rate", { default: 9.5, max: 20, step: 0.125 }),
      numberField("remainingYears", "Years Left on Current Loan", { default: 20, min: 1, max: 30 }),
      currencyField("homeValue", "Home Value (with Land If Owned)", { default: 140000, max: 2000000, step: 1000 }),
      dropdown("realProperty", "Loan Type", [["Real Property (Home + Land Titled Together)", 1], ["Chattel (Home Only)", 0]], 1),
      percentField("newRate", "New Rate", { default: 7.25, max: 20, step: 0.125 }),
      numberField("newTerm", "New Term (Years)", { default: 20, min: 5, max: 30 }),
      currencyField("closingCosts", "Closing Costs", { default: 3500, max: 50000, step: 100 }),
      YN("rollInCosts", "Roll Closing Costs into the Loan", 1),
      currencyField("cashOut", "Cash Out (Optional)", { default: 0, max: 500000, step: 500, required: false }),
    ],
    calcResult: { label: "Monthly Savings", format: "currency" },
    calcResults: [
      { key: "monthlySavings", label: "Monthly Savings", format: "currency", highlight: true },
      { key: "newPayment", label: "New Monthly Payment", format: "currency" },
      { key: "currentPayment", label: "Current Monthly Payment", format: "currency" },
      { key: "breakEvenMonths", label: "Months to Break Even", format: "number" },
      { key: "lifetimeSavings", label: "Lifetime Savings", format: "currency" },
      { key: "newLoanToValue", label: "New Loan-to-Value", format: "percentage" },
      { key: "withinTypicalLtvLimit", label: "Within Typical LTV Limit? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter your current balance, rate and years left, and the home's value. Choose whether the home is titled as real property with its land or financed as personal property (chattel). Enter the new rate, term and closing costs.",
    examples: "Example: refinancing a $90,000 balance at 9.5% with 20 years left into a 7.25% 20-year loan with $3,500 of costs rolled in drops the payment from $838.92 to $739.00 — $99.92 a month, breaking even in 36 months and saving about $23,980 over the loan.",
    assumptions: "Real-property manufactured homes (on a permanent foundation, titled with the land) can use conventional, FHA, VA or USDA refinances, often up to 95% LTV (80% for cash-out). Chattel loans usually have higher rates and lower LTV limits (about 85% here). Many lenders need the home built after June 15, 1976 (HUD code).",
    faq: [
      { question: "Can you refinance a manufactured home?", answer: "Yes. Homes titled as real property can use regular mortgage refinances; chattel loans can be refinanced with specialized lenders." },
      { question: "Is refinancing a mobile home worth it?", answer: "Usually when the rate drops 1%+ and you'll keep the home past the break-even point." },
    ],
  },
  {
    slug: "texas-land-loan-calculator",
    title: "Texas Land Loan Calculator",
    category: PROPERTY,
    description: "Estimate a loan to buy land in Texas — down payment, payment, any balloon and property tax, with the Texas Veterans Land Board loan option and agricultural (1-d-1) valuation.",
    metaTitle: "Texas Land Loan Calculator — VLB & Ag Exemption",
    metaDescription: "Free Texas land loan calculator. Estimate your land payment, down payment and property tax, with Veterans Land Board loans and ag valuation.",
    calcInputs: landInputs({ price: 120000, down: 20, rate: 8, taxRate: 1.8, agLabel: "Agricultural (1-d-1) Valuation", vlb: true }),
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: LAND_RESULTS,
    instructions: "Enter the land price, down payment, rate and terms. Texas veterans can choose a Veterans Land Board loan — up to $150,000 with 5% down over 30 years. If the land qualifies for agricultural (1-d-1) or wildlife valuation, turn it on to see the lower tax.",
    examples: "Example: a $120,000 tract with a Veterans Land Board loan at 7.5% needs $6,000 down and costs $797.10 a month. With ag valuation, property tax drops to about $216 a year.",
    assumptions: "Land loans from banks and Texas farm credit lenders usually need 10–35% down with 10–30-year terms, sometimes with a balloon. VLB loans require Texas veteran status, at least 1 acre and a 5% down payment; the VLB rate is set periodically. Ag valuation taxes land on its productive value — often 90%+ lower — but requires qualifying use and has rollback taxes if the use changes.",
    faq: [
      { question: "How much down do you need for land in Texas?", answer: "Usually 10–35% with a bank or farm credit lender; 5% with a Texas Veterans Land Board loan." },
      { question: "What is a Texas VLB land loan?", answer: "A state loan for Texas veterans to buy at least an acre of land — up to $150,000 with 5% down over 30 years." },
    ],
  },
  {
    slug: "alabama-land-loan-calculator",
    title: "Alabama Land Loan Calculator",
    category: PROPERTY,
    description: "Estimate a loan to buy land in Alabama — down payment, monthly payment, any balloon and Alabama's low property tax, with current-use valuation for timber and farmland.",
    metaTitle: "Alabama Land Loan Calculator — Payment & Property Tax",
    metaDescription: "Free Alabama land loan calculator. Estimate land loan payments, down payment and property tax with current-use valuation for timber and farmland.",
    calcInputs: landInputs({ price: 80000, down: 20, rate: 8, taxRate: 0.38, agLabel: "Current-Use Valuation (Timber / Farm)" }),
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: LAND_RESULTS,
    instructions: "Enter the land price, down payment, rate and terms from your lender. If the land is timberland or farmland enrolled in Alabama's current-use program, turn it on to see the reduced tax.",
    examples: "Example: an $80,000 tract with 20% down at 8% over 20 years costs $535.32 a month, plus about $304 a year in property tax.",
    assumptions: "Alabama's property taxes are among the lowest in the US. Land loans (banks, Alabama Farm Credit, First South Farm Credit) usually need 15–30% down. Current-use valuation taxes qualifying timber and farmland on its use value rather than market value.",
    faq: [
      { question: "Can you get a loan for land in Alabama?", answer: "Yes — local banks and farm credit associations make land loans, usually with 15–30% down and 10–30-year terms." },
      { question: "Is property tax on land low in Alabama?", answer: "Yes, Alabama's effective property tax rate is under 0.4%, and current-use valuation lowers it further for timber and farmland." },
    ],
  },
  {
    slug: "nc-land-loan-calculator",
    title: "NC Land Loan Calculator",
    category: PROPERTY,
    description: "Estimate a North Carolina land loan — down payment, payment, balloon and property tax, with present-use value taxation for farm, forest and horticultural land.",
    metaTitle: "NC Land Loan Calculator — North Carolina Land Loans",
    metaDescription: "Free North Carolina land loan calculator. Estimate payment, down payment, balloon and property tax with present-use value for farm and forest land.",
    calcInputs: landInputs({ price: 100000, down: 25, rate: 8.25, taxRate: 0.66, agLabel: "Present-Use Value (Farm / Forest)" }),
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: LAND_RESULTS,
    instructions: "Enter the land price, down payment, rate, amortization and any balloon term. If the land qualifies for North Carolina's present-use value program (agricultural, horticultural or forest land), turn it on to see the lower tax.",
    examples: "Example: a $100,000 lot with 25% down at 8.25% amortized over 15 years costs $727.61 a month; with a 5-year balloon, about $59,322 is due at the end of year 5.",
    assumptions: "NC land loans usually need 20–30% down; raw land often has shorter terms or balloons. Present-use value requires minimum acreage, income or a forest management plan, and deferred taxes are due for 3 years if the land leaves the program. Lot loans for building often convert to construction loans.",
    faq: [
      { question: "What do land loans cost in North Carolina?", answer: "Rates are usually 1–3 points above home mortgages, with 20–30% down and 10–20-year terms." },
      { question: "What is present-use value in NC?", answer: "A program that taxes qualifying farm, horticultural and forest land on its use value instead of market value." },
    ],
  },
  {
    slug: "modular-home-mortgage-calculator",
    title: "Modular Home Mortgage Calculator",
    category: PROPERTY,
    description: "Estimate the full cost and mortgage on a modular home — factory price, delivery and set, foundation, site work, land and permits — with interest during the build and your monthly payment.",
    metaTitle: "Modular Home Mortgage Calculator — Total Cost & Payment",
    metaDescription: "Free modular home mortgage calculator. Add up the modular home, delivery, foundation, site work and land, and see the loan and monthly payment.",
    calcInputs: [
      numberField("squareFeet", "Home Size (Sq Ft)", { default: 1800, min: 200, max: 10000 }),
      currencyField("factoryCostPerSqFt", "Factory Price per Sq Ft", { default: 95, max: 500 }),
      currencyField("deliveryAndSet", "Delivery, Crane & Set", { default: 20000, max: 200000, step: 500 }),
      currencyField("foundation", "Foundation", { default: 25000, max: 200000, step: 500 }),
      currencyField("siteWork", "Site Work (Utilities, Septic, Driveway, Finish)", { default: 30000, max: 500000, step: 500 }),
      currencyField("landCost", "Land Cost (0 If Owned Free and Clear)", { default: 60000, max: 5000000, step: 1000, required: false }),
      currencyField("permitsAndFees", "Permits & Fees", { default: 8000, max: 100000, step: 100 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 1 }),
      percentField("interestRate", "Construction-to-Permanent Rate", { default: 7, max: 15, step: 0.125 }),
      dropdown("loanTerm", "Loan Term", [["30 Years", 30], ["15 Years", 15]], 30),
      numberField("buildMonths", "Months from Order to Move-In", { default: 6, max: 24 }),
      percentField("propertyTaxRate", "Property Tax Rate", { default: 1, max: 5, step: 0.01 }),
      currencyField("annualInsurance", "Insurance per Year", { default: 1500, max: 20000, step: 50 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment (PITI)", format: "currency", highlight: true },
      { key: "totalProjectCost", label: "Total Project Cost", format: "currency" },
      { key: "modularHomeCost", label: "Modular Home (Factory)", format: "currency" },
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "interestDuringBuild", label: "Interest During the Build", format: "currency" },
      { key: "allInCostPerSqFt", label: "All-In Cost per Sq Ft (Excl. Land)", format: "currency" },
    ],
    instructions: "Enter the home's size and the dealer's factory price per square foot, then the costs that come on top — delivery and set, foundation, site work, permits — and the land. Add your loan terms and the time from order to move-in.",
    examples: "Example: an 1,800 sq ft modular home at $95/sq ft ($171,000) plus $83,000 of delivery, foundation, site work and permits and $60,000 of land totals $314,000. With 10% down at 7%, the payment is about $2,266.81 a month, with about $6,000 of interest during a 6-month build.",
    assumptions: "Modular homes are built to local building codes and set on permanent foundations, so they qualify for conventional, FHA, VA and USDA loans (unlike HUD-code manufactured homes). The factory price is often only 50–60% of the finished cost. Build-period interest assumes draws average half of the build cost plus the land.",
    faq: [
      { question: "Can you get a mortgage on a modular home?", answer: "Yes — modular homes are real property, so they qualify for regular mortgages, usually through a construction-to-permanent loan." },
      { question: "How much does a modular home really cost?", answer: "Often $150–$250 per sq ft finished once delivery, foundation and site work are added to the factory price." },
    ],
  },
  {
    slug: "metal-building-finance-calculator",
    title: "Metal Building Finance Calculator",
    category: PROPERTY,
    description: "Estimate the full cost of a steel building — kit, concrete foundation and erection — and the monthly payment to finance it, with cost per square foot and total interest.",
    metaTitle: "Metal Building Finance Calculator — Steel Building Cost & Loan",
    metaDescription: "Free metal building finance calculator. Price a steel building kit, foundation and erection and see the loan payment and cost per square foot.",
    calcInputs: [
      numberField("width", "Width (Feet)", { default: 40, min: 10, max: 500 }),
      numberField("length", "Length (Feet)", { default: 60, min: 10, max: 1000 }),
      currencyField("kitCostPerSqFt", "Building Kit Cost per Sq Ft", { default: 18, max: 200, step: 0.5 }),
      currencyField("foundationPerSqFt", "Concrete Slab per Sq Ft", { default: 8, max: 50, step: 0.5 }),
      currencyField("erectionPerSqFt", "Erection Labor per Sq Ft", { default: 7, max: 50, step: 0.5 }),
      currencyField("extras", "Doors, Windows, Insulation & Extras", { default: 6000, max: 500000, step: 100 }),
      currencyField("deliveryAndPermits", "Delivery, Engineering & Permits", { default: 3000, max: 100000, step: 100 }),
      percentField("downPaymentPercent", "Down Payment", { default: 20, max: 100, step: 1 }),
      percentField("interestRate", "Interest Rate", { default: 8.5, max: 20, step: 0.125 }),
      numberField("loanTerm", "Loan Term (Years)", { default: 10, min: 1, max: 25 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalBuildingCost", label: "Total Building Cost", format: "currency" },
      { key: "buildingKitCost", label: "Building Kit", format: "currency" },
      { key: "costPerSqFt", label: "Total Cost per Sq Ft", format: "currency" },
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
    ],
    instructions: "Enter the building's width and length and the supplier's kit price per square foot. Add the slab, erection labor, extras and permits, then your financing terms — equipment-style loans for steel buildings often run 5–15 years.",
    examples: "Example: a 40×60 building (2,400 sq ft) with an $18/sq ft kit, $8 slab and $7 erection plus $9,000 of extras and permits costs $88,200 — $36.75/sq ft. With 20% down at 8.5% over 10 years, the payment is $874.84 a month.",
    assumptions: "Shell-only prices; finishing a metal building as a home (barndominium) adds interior build-out of $50–$150+/sq ft. Financing options include supplier programs, equipment loans, farm credit, construction loans or a HELOC. Steel prices move with the market — get current quotes.",
    faq: [
      { question: "How do you finance a metal building?", answer: "Through the supplier's financing, a bank or farm credit loan, a construction loan if it's a home, or a HELOC." },
      { question: "How much does a metal building cost per square foot?", answer: "Often $25–$50 per sq ft for a basic erected shell, and much more for a finished living space." },
    ],
  },
  {
    slug: "land-equity-loan-calculator",
    title: "Land Equity Loan Calculator",
    category: PROPERTY,
    description: "Use the land you already own as the down payment on a construction loan — see your land equity, the loan you can get under the lender's loan-to-cost limit, any cash still needed and the payment after the build.",
    metaTitle: "Land Equity Loan Calculator — Use Land as Down Payment",
    metaDescription: "Free land equity loan calculator. See how your land equity counts as the down payment on a construction loan, the loan size and the cash needed.",
    calcInputs: [
      currencyField("landValue", "Land Value (Appraised)", { default: 100000, max: 10000000, step: 1000 }),
      currencyField("landOwed", "Amount Still Owed on the Land", { default: 0, max: 10000000, step: 1000, required: false }),
      currencyField("constructionCost", "Construction Cost", { default: 380000, max: 20000000, step: 1000 }),
      currencyField("softCosts", "Soft Costs (Plans, Permits, Fees)", { default: 20000, max: 2000000, step: 500 }),
      percentField("maxLoanToCost", "Lender's Max Loan-to-Cost", { default: 80, max: 100, step: 1 }),
      percentField("interestRate", "Permanent Loan Rate", { default: 7, max: 15, step: 0.125 }),
      dropdown("loanTerm", "Loan Term", [["30 Years", 30], ["15 Years", 15]], 30),
    ],
    calcResult: { label: "Cash Needed", format: "currency" },
    calcResults: [
      { key: "cashNeeded", label: "Cash You Still Need", format: "currency", highlight: true },
      { key: "landEquity", label: "Your Land Equity", format: "currency" },
      { key: "totalProjectCost", label: "Total Project Cost (Land + Build)", format: "currency" },
      { key: "maxConstructionLoan", label: "Max Construction Loan", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "equityCountsAsDownPayment", label: "Land Equity as % of Project", format: "percentage" },
      { key: "monthlyPaymentAfterBuild", label: "Monthly Payment After the Build (P&I)", format: "currency" },
    ],
    instructions: "Enter the land's appraised value and anything still owed on it, the construction and soft costs, and the lender's maximum loan-to-cost. The loan pays off any land debt and funds the build; your land equity counts toward the down payment.",
    examples: "Example: land worth $100,000 owned free and clear plus $400,000 of construction and soft costs makes a $500,000 project. At 80% loan-to-cost the lender lends $400,000 — enough to fund the build — so your $100,000 of land equity covers the 20% down payment and no cash is needed. The payment is $2,661.21 a month at 7%.",
    assumptions: "Most construction-to-permanent lenders count land equity at its appraised value (some use the lower of cost or value if bought within 12 months). Loan-to-cost limits are typically 80–95%; FHA, VA and USDA one-time-close loans allow less equity. A contingency reserve may be required on top.",
    faq: [
      { question: "Can I use my land as a down payment?", answer: "Yes. If you own the land, its equity usually counts toward the down payment on a construction loan." },
      { question: "What is a land equity loan?", answer: "Using equity in land you own to qualify for a construction or home loan, or borrowing against the land itself." },
    ],
  },
  {
    slug: "adu-loan-calculator",
    title: "ADU Loan Calculator",
    category: PROPERTY,
    description: "See how to finance an accessory dwelling unit (ADU) — how much you can borrow with a HELOC, cash-out refinance or renovation loan, the monthly payment and how much the ADU's rent covers.",
    metaTitle: "ADU Loan Calculator — Finance a Granny Flat or Backyard Home",
    metaDescription: "Free ADU loan calculator. Compare HELOC, cash-out refinance and renovation loans for an ADU, the payment and how much rent covers it.",
    calcInputs: [
      currencyField("homeValue", "Current Home Value", { default: 700000, max: 20000000, step: 1000 }),
      currencyField("mortgageBalance", "Current Mortgage Balance", { default: 350000, max: 20000000, step: 1000 }),
      currencyField("aduCost", "ADU Project Cost", { default: 180000, max: 2000000, step: 1000 }),
      dropdown("loanType", "Loan Type", [["HELOC / Home Equity Loan (85% CLTV)", 0], ["Cash-Out Refinance (80% LTV)", 1], ["Renovation Loan (After-Completion Value)", 2]], 0),
      percentField("valueAddedPercent", "Share of Cost Added to Value", { default: 80, max: 200, step: 5 }),
      percentField("interestRate", "Interest Rate", { default: 8.5, max: 15, step: 0.125 }),
      numberField("loanTerm", "Loan Term (Years)", { default: 15, min: 5, max: 30 }),
      currencyField("aduRent", "Expected ADU Rent per Month", { default: 2200, max: 20000, step: 25, required: false }),
      percentField("vacancyRate", "Vacancy", { default: 5, max: 50, step: 1, required: false }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "maxYouCanBorrow", label: "Max You Can Borrow", format: "currency" },
      { key: "loanForAdu", label: "Loan for the ADU", format: "currency" },
      { key: "cashShortfall", label: "Cash Shortfall", format: "currency" },
      { key: "expectedRentAfterVacancy", label: "Expected Rent After Vacancy", format: "currency" },
      { key: "rentCoversPayment", label: "Rent Covers This Much of the Payment", format: "percentage" },
      { key: "estimatedValueAfterAdu", label: "Estimated Home Value After the ADU", format: "currency" },
    ],
    instructions: "Enter your home's value, mortgage balance and the ADU's total cost. Choose how you'd finance it: a HELOC or home equity loan borrows against today's value; a cash-out refinance replaces your mortgage (the payment shown is the whole new loan); a renovation loan can lend against the value after the ADU is built.",
    examples: "Example: a $700,000 home with $350,000 owed can borrow up to $245,000 with a HELOC at 85% CLTV — enough for a $180,000 ADU. Over 15 years at 8.5% the payment is $1,772.53; $2,200 of rent (after 5% vacancy) covers about 118% of it.",
    assumptions: "Limits are typical: HELOCs to 85% combined LTV, cash-out refis to 80%, renovation loans (Fannie Mae HomeStyle, FHA 203(k)) on the after-completion value. Fannie Mae and Freddie Mac allow some ADU rental income to help you qualify. ADU costs typically run $150,000–$400,000; local rules and permits apply.",
    faq: [
      { question: "How do you finance an ADU?", answer: "With a HELOC, home equity loan, cash-out refinance, renovation loan, construction loan or cash." },
      { question: "Can ADU rent help me qualify for the loan?", answer: "Often yes — conventional and FHA programs can count part of the projected ADU rent as income." },
    ],
  },
];

async function main() {
  const categoryIds = new Map<string, string>();
  for (const slug of new Set(TOOLS.map((t) => t.category))) {
    const c = await prisma.toolCategory.findUnique({ where: { slug } });
    if (!c) throw new Error(`The "${slug}" category doesn't exist — run "npx tsx prisma/restructure-real-estate-main-category.ts --apply" first.`);
    categoryIds.set(slug, c.id);
  }

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: categoryIds.get(def.category)!,
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
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
