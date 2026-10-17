// One-time (but safe to re-run) batch setup script: creates 11 home buying & affordability
// tools from the user's real estate list (Real Estate Calculators > Home Buying & Affordability).
// See src/lib/calc-engine-re-buying.ts for the math.
//
// HOW TO RUN (after prisma/restructure-real-estate-main-category.ts --apply)
//   npx tsx prisma/create-re-buying-calculators.ts
// or
//   npm run db:create-re-buying-calculators

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

const CAT = "home-buying-affordability-calculators";

const AFFORD_RESULTS = [
  { key: "maxHomePrice", label: "Most House You Can Afford", format: "currency", highlight: true },
  { key: "loanAmount", label: "Loan Amount", format: "currency" },
  { key: "monthlyPayment", label: "Total Monthly Payment", format: "currency" },
  { key: "principalAndInterest", label: "Principal & Interest", format: "currency" },
  { key: "monthlyPropertyTax", label: "Property Tax per Month", format: "currency" },
  { key: "monthlyPmi", label: "PMI per Month", format: "currency" },
  { key: "backEndDti", label: "Total Debt-to-Income Ratio", format: "percentage" },
];

function affordInputs(o: { taxRate: number; insurance: number; homesteadLabel?: string; extraLabel?: string; extraDefault?: number }) {
  return [
    currencyField("annualIncome", "Annual Gross Household Income", { default: 110000, max: 5000000, step: 1000 }),
    currencyField("monthlyDebts", "Monthly Debt Payments", { default: 500, max: 50000, required: false }),
    currencyField("downPayment", "Down Payment", { default: 40000, max: 5000000, step: 1000 }),
    percentField("interestRate", "Mortgage Interest Rate", { default: 6.5, max: 15, step: 0.125 }),
    dropdown("loanTerm", "Loan Term", [["30 Years", 30], ["20 Years", 20], ["15 Years", 15]], 30),
    percentField("propertyTaxRate", "Property Tax Rate", { default: o.taxRate, max: 5, step: 0.01 }),
    ...(o.homesteadLabel ? [YN("homestead", o.homesteadLabel, 1)] : []),
    currencyField("annualInsurance", "Homeowners Insurance per Year", { default: o.insurance, max: 50000, step: 50 }),
    ...(o.extraLabel ? [currencyField("extraAnnualCosts", o.extraLabel, { default: o.extraDefault ?? 0, max: 50000, step: 50, required: false })] : []),
    currencyField("monthlyHoa", "Monthly HOA Dues", { default: 0, max: 5000, required: false }),
    percentField("pmiRate", "PMI Rate (Under 20% Down)", { default: 0.5, max: 2, step: 0.05, required: false }),
  ];
}

const TOOLS: ToolDef[] = [
  {
    slug: "cash-to-close-calculator",
    title: "Cash to Close Calculator",
    category: CAT,
    description: "Find the total cash you need at closing — down payment, closing costs, prepaid insurance and interest and escrow reserves — minus your earnest money and any seller or lender credits.",
    metaTitle: "Cash to Close Calculator — How Much Cash Do You Need?",
    metaDescription: "Free cash to close calculator. Add up your down payment, closing costs, prepaids and escrow, then subtract earnest money and credits.",
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: 400000, max: 10000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 0.5 }),
      percentField("closingCostPercent", "Closing Costs (% of Price)", { default: 3, max: 10, step: 0.1 }),
      percentField("propertyTaxRate", "Property Tax Rate", { default: 1.1, max: 5, step: 0.01 }),
      currencyField("annualInsurance", "First-Year Homeowners Insurance", { default: 1800, max: 30000, step: 50 }),
      numberField("escrowMonths", "Escrow Reserve Months", { default: 3, max: 12, required: false }),
      percentField("interestRate", "Mortgage Interest Rate", { default: 6.5, max: 15, step: 0.125 }),
      numberField("prepaidInterestDays", "Days of Prepaid Interest", { default: 15, max: 31, required: false }),
      currencyField("earnestMoney", "Earnest Money Already Paid", { default: 8000, max: 500000, required: false }),
      currencyField("sellerCredit", "Seller Credit / Concessions", { default: 0, max: 200000, required: false }),
      currencyField("lenderCredit", "Lender Credit", { default: 0, max: 100000, required: false }),
    ],
    calcResult: { label: "Cash to Close", format: "currency" },
    calcResults: [
      { key: "cashToClose", label: "Cash to Close", format: "currency", highlight: true },
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "closingCosts", label: "Closing Costs", format: "currency" },
      { key: "prepaidsAndEscrow", label: "Prepaids & Escrow Reserves", format: "currency" },
      { key: "prepaidInterest", label: "Prepaid Interest", format: "currency" },
      { key: "credits", label: "Earnest Money & Credits", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
    ],
    instructions: "Enter the price, your down payment and an estimate of closing costs (2–5% of the price is typical). Add your first-year insurance premium, the escrow reserve months your lender wants and the days of prepaid interest (from closing day to month-end). Subtract the earnest money you already deposited and any credits.",
    examples: "Example: a $400,000 home with 10% down needs $40,000.00 down, $12,000.00 of closing costs and $4,311.64 of prepaids (insurance, three months of tax and insurance reserves and 15 days of interest). After the $8,000 earnest money, the cash to close is $48,311.64.",
    assumptions: "Your Closing Disclosure, sent at least three business days before closing, shows the exact figure. Prepaids are what you pay up front for the escrow account and interest — they're not lender fees. Wire funds only after confirming instructions by phone with your title or escrow company to avoid wire fraud.",
    faq: [
      { question: "What is cash to close?", answer: "The total you bring to closing: down payment plus closing costs and prepaids, minus deposits and credits already applied." },
      { question: "Is earnest money part of cash to close?", answer: "Yes — it's credited toward your cash to close, so you bring less on closing day." },
      { question: "Can the seller pay my closing costs?", answer: "Yes, through seller concessions, within loan limits (often 3–9% of the price for conventional loans and 6% for FHA)." },
    ],
  },
  {
    slug: "fha-affordability-calculator",
    title: "FHA Affordability Calculator",
    category: CAT,
    description: "Find how much house you can afford with an FHA loan under the 31% / 43% debt-to-income limits — with the 1.75% upfront MIP financed and monthly MIP included — and check the DTI on a home you like.",
    metaTitle: "FHA Affordability Calculator — FHA DTI & Max Home Price",
    metaDescription: "Free FHA affordability calculator. Find your max FHA home price with MIP, check front-end and back-end DTI against FHA limits and the county loan limit.",
    calcInputs: [
      currencyField("annualIncome", "Annual Gross Income", { default: 75000, max: 2000000, step: 1000 }),
      currencyField("monthlyDebts", "Monthly Debt Payments", { default: 400, max: 20000, required: false }),
      percentField("downPaymentPercent", "Down Payment (Min 3.5%)", { default: 3.5, min: 3.5, max: 50, step: 0.5 }),
      percentField("interestRate", "FHA Interest Rate", { default: 6.25, max: 15, step: 0.125 }),
      dropdown("loanTerm", "Loan Term", [["30 Years", 30], ["15 Years", 15]], 30),
      percentField("propertyTaxRate", "Property Tax Rate", { default: 1.1, max: 5, step: 0.01 }),
      currencyField("annualInsurance", "Homeowners Insurance per Year", { default: 1600, max: 30000, step: 50 }),
      currencyField("monthlyHoa", "Monthly HOA Dues", { default: 0, max: 3000, required: false }),
      dropdown("ausApproval", "DTI Limits", [["Standard FHA (31% / 43%)", 0], ["AUS Approve with Strong File (40% / 50%)", 1]], 0),
      currencyField("targetPrice", "Home Price to Check (Optional)", { default: 300000, max: 5000000, step: 1000, required: false }),
      currencyField("countyLoanLimit", "FHA Loan Limit in Your County", { default: 541287, max: 3000000, step: 1000, required: false }),
    ],
    calcResult: { label: "Max FHA Home Price", format: "currency" },
    calcResults: [
      { key: "maxHomePrice", label: "Max FHA Home Price", format: "currency", highlight: true },
      { key: "maxLoanWithUfmip", label: "Loan Amount with Upfront MIP", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment (PITI + MIP)", format: "currency" },
      { key: "monthlyMip", label: "Monthly MIP", format: "currency" },
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "targetFrontEndDti", label: "Front-End DTI at Your Price", format: "percentage" },
      { key: "targetBackEndDti", label: "Back-End DTI at Your Price", format: "percentage" },
      { key: "targetQualifies", label: "Your Price Qualifies? (1 = Yes)", format: "number" },
      { key: "overCountyLimit", label: "Max Loan Over County Limit? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter your gross income, monthly debts (car, student loans, minimum card payments), down payment and rate. Pick standard FHA limits or the higher limits an automated underwriting approval can allow. Enter a home price to see its front-end and back-end DTI, and your county's FHA loan limit from HUD.",
    examples: "Example: $75,000 a year with $400 of debts allows a $1,937.50 housing payment (31%), so the most house is about $243,650 with 3.5% down. A $300,000 home would put front-end DTI at 37.7% and back-end at 44.1% — over the standard limits.",
    assumptions: "FHA adds a 1.75% upfront MIP (financed here) and an annual MIP of 0.55% (0.50% with 5%+ down) for 30-year loans, or 0.15%/0.40% for 15-year loans. 3.5% down needs a 580+ credit score; 500–579 needs 10%. The 2026 one-unit loan limit runs from $541,287 in most counties to $1,249,125 in high-cost areas.",
    faq: [
      { question: "What is the FHA debt-to-income limit?", answer: "31% front-end (housing) and 43% back-end (all debts), and up to about 46.9% / 56.9% with an automated approval and compensating factors." },
      { question: "How much house can I afford with an FHA loan?", answer: "Roughly the price whose full payment — principal, interest, tax, insurance and MIP — is no more than 31% of your gross monthly income." },
      { question: "How much is FHA mortgage insurance?", answer: "1.75% of the loan up front plus 0.50–0.55% a year on most 30-year loans." },
    ],
  },
  {
    slug: "texas-mortgage-affordability-calculator",
    title: "Texas Mortgage Affordability Calculator",
    category: CAT,
    description: "Find how much house you can afford in Texas — Texas has no state income tax but high property taxes, so this applies the $140,000 school homestead exemption and higher insurance costs under the 28/36 rule.",
    metaTitle: "Texas Mortgage Affordability Calculator — How Much House?",
    metaDescription: "Free Texas mortgage affordability calculator with property tax, the $140,000 homestead exemption, insurance and PMI under the 28/36 rule.",
    calcInputs: affordInputs({ taxRate: 1.8, insurance: 3200, homesteadLabel: "Claim the Texas Homestead Exemption", extraLabel: "MUD / PID Assessments per Year", extraDefault: 0 }),
    calcResult: { label: "Most House You Can Afford", format: "currency" },
    calcResults: AFFORD_RESULTS,
    instructions: "Enter your household income, monthly debts, down payment and rate. The property tax rate is the total of your county, city, school district and any MUD — 1.6–2.4% is common in Texas. Add yearly MUD or PID assessments if the neighborhood has them.",
    examples: "Example: $110,000 a year with $500 of debts and $40,000 down at 6.5% can afford about $324,700 in Texas. The $2,566.67 payment includes $382.02 of property tax after the homestead exemption.",
    assumptions: "Uses the 28/36 rule (housing up to 28% of gross income, all debts up to 36%). The 2025 school homestead exemption is $140,000 ($200,000 for 65+ or disabled); school taxes are taken as about half of the total rate. Texas insurance averages well above the US because of hail and wind. Your appraisal district's rates are the final word.",
    faq: [
      { question: "How much house can I afford in Texas on $100,000?", answer: "Often around $290,000–$330,000 with a modest down payment, because Texas property taxes take a large share of the payment." },
      { question: "Does Texas have a homestead exemption?", answer: "Yes — $140,000 off your school district taxable value from 2025, plus optional local exemptions." },
    ],
  },
  {
    slug: "california-mortgage-affordability-calculator",
    title: "California Mortgage Affordability Calculator",
    category: CAT,
    description: "Find how much house you can afford in California, with Prop 13 property tax on the purchase price (1% plus local bonds), Mello-Roos special taxes, insurance and PMI under the 28/36 rule.",
    metaTitle: "California Mortgage Affordability Calculator — How Much House?",
    metaDescription: "Free California mortgage affordability calculator with Prop 13 property tax, Mello-Roos, insurance and PMI. See the most house you can afford.",
    calcInputs: affordInputs({ taxRate: 1.2, insurance: 1500, extraLabel: "Mello-Roos / Special Taxes per Year", extraDefault: 0 }),
    calcResult: { label: "Most House You Can Afford", format: "currency" },
    calcResults: AFFORD_RESULTS,
    instructions: "Enter your income, debts, down payment and rate. California property tax is 1% of the purchase price plus local voter-approved bonds — usually 1.1–1.3% in total. Newer developments often add a Mello-Roos tax; enter it if the listing shows one.",
    examples: "Example: $110,000 a year with $500 of debts and $40,000 down at 6.5% can afford about $350,400 in California. Property tax at 1.2% adds $350.40 a month.",
    assumptions: "Uses the 28/36 rule. Prop 13 sets the assessed value at the purchase price and limits yearly increases to 2%. Loans above the 2026 conforming limit ($832,750 in most counties, up to $1,249,125 in high-cost areas) are jumbo loans with stricter rules. California's insurance market is tight in wildfire areas — get quotes early.",
    faq: [
      { question: "What is the property tax rate in California?", answer: "1% of the purchase price plus local bonds, typically 1.1–1.3% in total in the first year." },
      { question: "What is Mello-Roos?", answer: "A special tax in some newer California communities to pay for schools, roads and parks, added to your property tax bill." },
    ],
  },
  {
    slug: "florida-mortgage-affordability-calculator",
    title: "Florida Mortgage Affordability Calculator",
    category: CAT,
    description: "Find how much house you can afford in Florida — with the homestead exemption, Florida's high homeowners and flood insurance costs, HOA dues and PMI under the 28/36 rule.",
    metaTitle: "Florida Mortgage Affordability Calculator — How Much House?",
    metaDescription: "Free Florida mortgage affordability calculator with the homestead exemption, high insurance, flood insurance and HOA dues. See your max price.",
    calcInputs: affordInputs({ taxRate: 1.6, insurance: 4000, homesteadLabel: "Claim the Florida Homestead Exemption", extraLabel: "Flood Insurance per Year", extraDefault: 0 }),
    calcResult: { label: "Most House You Can Afford", format: "currency" },
    calcResults: AFFORD_RESULTS,
    instructions: "Enter your income, debts, down payment and rate. Florida millage on a newly bought home is often 1.4–2.0% of market value. Insurance is the big Florida variable — use a real quote, and add flood insurance if the home is in a flood zone or your lender requires it.",
    examples: "Example: $110,000 a year with $500 of debts and $40,000 down at 6.5% can afford about $316,700 in Florida with $4,000 of yearly insurance. Homestead brings the property tax to $368.96 a month.",
    assumptions: "Uses the 28/36 rule. The homestead exemption takes $25,000 off all taxes and a second $25,000 off non-school taxes (taken as 60% of the millage). Save Our Homes caps yearly assessment increases at 3% after the first year. A November 2026 ballot measure would raise the exemption sharply from 2027.",
    faq: [
      { question: "Why is homeowners insurance so high in Florida?", answer: "Hurricane risk, roof claims and a shrinking insurer market — averages are well above the US, especially near the coast." },
      { question: "How much is the Florida homestead exemption?", answer: "Up to $50,000: $25,000 off all property taxes and another $25,000 off non-school taxes for homes valued over $50,000." },
    ],
  },
  {
    slug: "nj-mortgage-affordability-calculator",
    title: "NJ Mortgage Affordability Calculator",
    category: CAT,
    description: "Find how much house you can afford in New Jersey, where property taxes are the highest in the US — with tax, insurance, HOA and PMI under the 28/36 rule.",
    metaTitle: "NJ Mortgage Affordability Calculator — New Jersey",
    metaDescription: "Free New Jersey mortgage affordability calculator with NJ's high property taxes, insurance and PMI. See the most house you can afford in NJ.",
    calcInputs: affordInputs({ taxRate: 2.2, insurance: 1500 }),
    calcResult: { label: "Most House You Can Afford", format: "currency" },
    calcResults: AFFORD_RESULTS,
    instructions: "Enter your income, debts, down payment and rate. Look up the town's effective tax rate (total tax ÷ market value) — 1.5–3% is common in New Jersey, so it changes your budget a lot from one town to the next.",
    examples: "Example: $110,000 a year with $500 of debts and $40,000 down at 6.5% can afford about $316,300 in a New Jersey town with a 2.2% effective rate — property tax alone is $579.94 a month.",
    assumptions: "Uses the 28/36 rule. New Jersey has no general homestead exemption on the tax bill; ANCHOR and Stay NJ benefits are paid as separate rebates and are not included. On sales of $1 million or more, the 2025 graduated mansion tax is paid by the seller.",
    faq: [
      { question: "Why are New Jersey property taxes so high?", answer: "Schools and local services are funded mostly by property taxes, and NJ has many small municipalities and school districts." },
      { question: "How much house can I afford in NJ?", answer: "Less than the same income buys elsewhere, because property taxes often add $500–$1,000+ a month." },
    ],
  },
  {
    slug: "appraisal-gap-calculator",
    title: "Appraisal Gap Calculator",
    category: CAT,
    description: "See what happens when a home appraises below the contract price — the gap, the extra cash you'd need, what your appraisal gap clause covers and how much the seller would need to drop.",
    metaTitle: "Appraisal Gap Calculator — Low Appraisal Cash Needed",
    metaDescription: "Free appraisal gap calculator. See the gap, the extra cash a low appraisal costs you, your gap coverage and the price cut the seller would need to make.",
    calcInputs: [
      currencyField("contractPrice", "Contract Price", { default: 420000, max: 10000000, step: 1000 }),
      currencyField("appraisedValue", "Appraised Value", { default: 400000, max: 10000000, step: 1000 }),
      percentField("downPaymentPercent", "Planned Down Payment", { default: 10, max: 100, step: 0.5 }),
      currencyField("gapCoverage", "Appraisal Gap Coverage You Offered", { default: 10000, max: 1000000, step: 500, required: false }),
    ],
    calcResult: { label: "Appraisal Gap", format: "currency" },
    calcResults: [
      { key: "appraisalGap", label: "Appraisal Gap", format: "currency", highlight: true },
      { key: "cashNeededAtClose", label: "Cash Needed (Down Payment + Gap)", format: "currency" },
      { key: "extraCashVsPlan", label: "Extra Cash vs Your Plan", format: "currency" },
      { key: "loanAmount", label: "Loan Amount (Based on Appraisal)", format: "currency" },
      { key: "buyerCoversUnderClause", label: "You Cover Under the Gap Clause", format: "currency" },
      { key: "sellerReductionNeeded", label: "Price Cut Needed from the Seller", format: "currency" },
      { key: "gapPercent", label: "Gap as % of Price", format: "percentage" },
    ],
    instructions: "Enter the contract price, the appraised value and your planned down payment percentage. If your offer included an appraisal gap clause, enter the most you agreed to cover.",
    examples: "Example: a $420,000 contract appraises at $400,000 — a $20,000 gap. With 10% down, the lender lends $360,000, so you need $60,000.00 in cash instead of $42,000 — $18,000.00 more. A $10,000 gap clause leaves $10,000.00 for the seller to cut.",
    assumptions: "Lenders base the loan on the lower of the price and the appraised value, so the buyer pays the gap in cash or the price is renegotiated. An appraisal contingency usually lets you cancel and keep your earnest money if the parties can't agree. You can also ask for a reconsideration of value with better comparable sales.",
    faq: [
      { question: "Who pays the appraisal gap?", answer: "The buyer in cash, the seller through a price cut, or both — unless the buyer walks away under an appraisal contingency." },
      { question: "What is an appraisal gap clause?", answer: "A promise in your offer to cover a low appraisal up to a set amount, which makes the offer stronger in a competitive market." },
    ],
  },
  {
    slug: "renovate-or-move-calculator",
    title: "Renovate or Move Calculator",
    category: CAT,
    description: "Compare renovating your home with selling and buying a bigger one — renovation cost net of value added and financing, vs selling and buying costs, moving and giving up a low mortgage rate.",
    metaTitle: "Renovate or Move Calculator — Remodel vs Buy a New Home",
    metaDescription: "Free renovate or move calculator. Compare remodeling costs and value added with selling, buying, moving and losing your low mortgage rate.",
    calcInputs: [
      currencyField("homeValue", "Current Home Value", { default: 450000, max: 10000000, step: 1000 }),
      currencyField("mortgageBalance", "Current Mortgage Balance", { default: 250000, max: 10000000, step: 1000 }),
      percentField("currentRate", "Current Mortgage Rate", { default: 3.5, max: 15, step: 0.125 }),
      numberField("remainingYears", "Years Left on Current Mortgage", { default: 25, min: 1, max: 40 }),
      currencyField("renovationCost", "Renovation Cost", { default: 80000, max: 2000000, step: 1000 }),
      percentField("valueAddedPercent", "Share of Cost Added to Home Value", { default: 70, max: 150, step: 5 }),
      percentField("renovationRate", "Renovation Loan / HELOC Rate (15-Year)", { default: 8, max: 20, step: 0.125 }),
      currencyField("newHomePrice", "Price of the Home You'd Buy", { default: 550000, max: 10000000, step: 1000 }),
      percentField("newRate", "New Mortgage Rate (30-Year)", { default: 6.5, max: 15, step: 0.125 }),
      percentField("sellingCostPercent", "Selling Costs (Commission + Closing)", { default: 7, max: 12, step: 0.5 }),
      percentField("buyingCostPercent", "Buying Closing Costs", { default: 3, max: 8, step: 0.5 }),
      currencyField("movingCost", "Moving Costs", { default: 5000, max: 50000, step: 100 }),
      numberField("yearsToCompare", "Years to Compare", { default: 7, min: 1, max: 30 }),
    ],
    calcResult: { label: "Cheaper Option Saves", format: "currency" },
    calcResults: [
      { key: "renovateNetCost", label: "Net Cost to Renovate", format: "currency", highlight: true },
      { key: "moveNetCost", label: "Net Cost to Move", format: "currency", highlight: true },
      { key: "savingsOfCheaperOption", label: "Cheaper Option Saves", format: "currency" },
      { key: "renovateIsCheaper", label: "Renovating Is Cheaper? (1 = Yes)", format: "number" },
      { key: "monthlyPaymentIfRenovate", label: "Monthly Payments If You Renovate", format: "currency" },
      { key: "monthlyPaymentIfMove", label: "Monthly Payment If You Move", format: "currency" },
      { key: "transactionCostsToMove", label: "Selling, Buying & Moving Costs", format: "currency" },
    ],
    instructions: "Enter your home's value, mortgage and rate. For renovating, add the project cost, how much of it you expect to get back in home value and the loan rate. For moving, add the new home's price, today's rate and typical selling and buying costs. Choose how many years to compare.",
    examples: "Example: an $80,000 remodel that adds 70% of its cost in value, financed at 8%, costs about $62,300 over 7 years. Selling a $450,000 home with a 3.5% loan to buy a $550,000 home at 6.5% costs about $170,700 — $53,000 of transaction costs plus higher interest on a bigger loan.",
    assumptions: "Renovation cost = project cost − value added + interest paid over the comparison period. Moving cost = selling, buying and moving costs + extra interest vs your current loan (sale equity goes into the new home). It's a cost comparison; a bigger new home also gives you more space and possibly more appreciation, which isn't counted.",
    faq: [
      { question: "Is it cheaper to renovate or move?", answer: "Renovating is often cheaper when you have a low mortgage rate, because moving means 8–10% in transaction costs and a higher rate on a bigger loan." },
      { question: "How much of a renovation do you get back?", answer: "Typically 50–90% at resale depending on the project; kitchens and exterior work tend to recoup more." },
    ],
  },
  {
    slug: "walk-score-calculator",
    title: "Walk Score Calculator",
    category: CAT,
    description: "Estimate how walkable an address is from the distance to groceries, restaurants, shops, schools, parks and transit, with a penalty for long blocks and few intersections — on a 0–100 scale.",
    metaTitle: "Walk Score Calculator — Estimate a Home's Walkability",
    metaDescription: "Free walk score calculator. Estimate a 0–100 walkability score from distances to amenities, block length and intersection density.",
    calcInputs: [
      numberField("groceryMiles", "Nearest Grocery Store (Miles)", { default: 0.4, max: 10, step: 0.05 }),
      numberField("restaurantMiles", "Nearest Restaurants & Bars (Miles)", { default: 0.3, max: 10, step: 0.05 }),
      numberField("shoppingMiles", "Nearest Shops (Miles)", { default: 0.6, max: 10, step: 0.05 }),
      numberField("coffeeMiles", "Nearest Coffee Shop (Miles)", { default: 0.3, max: 10, step: 0.05 }),
      numberField("schoolMiles", "Nearest School (Miles)", { default: 0.8, max: 10, step: 0.05 }),
      numberField("parkMiles", "Nearest Park (Miles)", { default: 0.2, max: 10, step: 0.05 }),
      numberField("bankMiles", "Nearest Bank (Miles)", { default: 0.5, max: 10, step: 0.05 }),
      numberField("entertainmentMiles", "Nearest Entertainment / Library (Miles)", { default: 1, max: 10, step: 0.05 }),
      numberField("transitMiles", "Nearest Transit Stop (Miles)", { default: 0.3, max: 10, step: 0.05 }),
      numberField("intersectionsPerSqMile", "Intersections per Square Mile", { default: 160, max: 1000 }),
      numberField("avgBlockFeet", "Average Block Length (Feet)", { default: 450, max: 3000, step: 10 }),
    ],
    calcResult: { label: "Walk Score Estimate", format: "number" },
    calcResults: [
      { key: "walkScore", label: "Walkability Score (0–100)", format: "number", highlight: true },
      { key: "ratingBand", label: "Rating (5 = Walker's Paradise … 1 = Car-Dependent)", format: "number" },
      { key: "amenityScoreBeforePenalty", label: "Amenity Score Before Street Penalty", format: "number" },
      { key: "streetPenaltyPercent", label: "Street Layout Penalty", format: "percentage" },
    ],
    instructions: "Use a map to measure the walking distance from the address to the nearest place in each group. Add the area's intersection density and typical block length if you know them — dense, short-block grids score higher.",
    examples: "Example: groceries at 0.4 mi, restaurants and coffee at 0.3 mi, a park at 0.2 mi and transit at 0.3 mi score about 89 before the street penalty; 160 intersections per sq mi and 450-ft blocks take 2% off, for an estimated 87 — very walkable.",
    assumptions: "An independent estimate using a Walk Score-style method — not the official Walk Score® from Redfin. Each amenity earns full points within a 5-minute walk (0.25 mi), decaying to zero at 30 minutes (1.5 mi); groceries and restaurants count most. Bands: 90–100 walker's paradise, 70–89 very walkable, 50–69 somewhat walkable, 25–49 car-dependent, 0–24 almost all errands need a car.",
    faq: [
      { question: "What is a good walk score?", answer: "70 or more means most errands can be done on foot; 90+ means you can easily live without a car." },
      { question: "Does walkability affect home value?", answer: "Studies generally find more walkable homes sell for a premium, especially in cities." },
    ],
  },
  {
    slug: "canada-rent-vs-buy-calculator",
    title: "Canada Rent vs Buy Calculator",
    category: CAT,
    description: "Compare renting with buying a home in Canada — CMHC insurance, the land transfer tax in Ontario, Toronto, BC, Alberta or Quebec, semi-annual mortgage compounding, appreciation and the return on money you'd invest instead.",
    metaTitle: "Canada Rent vs Buy Calculator — CMHC & Land Transfer Tax",
    metaDescription: "Free Canada rent vs buy calculator with CMHC insurance, provincial land transfer tax, first-time buyer rebates and investing your down payment.",
    calcInputs: [
      currencyField("homePrice", "Home Price (CAD)", { default: 750000, max: 20000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment (Min 5%)", { default: 10, min: 5, max: 100, step: 0.5 }),
      dropdown("amortization", "Amortization", [["25 Years", 25], ["30 Years (First-Time / New Build)", 30]], 25),
      percentField("interestRate", "Mortgage Rate", { default: 4.5, max: 12, step: 0.05 }),
      dropdown("province", "Province / City", [["Ontario", 0], ["Toronto", 1], ["British Columbia", 2], ["Alberta", 3], ["Quebec", 4]], 0),
      YN("firstTimeBuyer", "First-Time Home Buyer", 1),
      currencyField("otherClosingCosts", "Legal & Other Closing Costs", { default: 2500, max: 50000, step: 100 }),
      percentField("propertyTaxRate", "Property Tax Rate", { default: 0.8, max: 3, step: 0.05 }),
      percentField("maintenanceRate", "Maintenance per Year (% of Price)", { default: 1, max: 5, step: 0.1 }),
      currencyField("annualInsurance", "Home Insurance per Year", { default: 1500, max: 20000, step: 50 }),
      percentField("appreciationRate", "Home Price Growth per Year", { default: 3, max: 15, step: 0.25 }),
      percentField("sellingCostPercent", "Selling Costs", { default: 5, max: 10, step: 0.5 }),
      currencyField("monthlyRent", "Monthly Rent for a Similar Home", { default: 2800, max: 30000, step: 25 }),
      percentField("rentIncrease", "Rent Increase per Year", { default: 3, max: 15, step: 0.25 }),
      currencyField("rentersInsurance", "Tenant Insurance per Year", { default: 300, max: 5000, step: 10, required: false }),
      percentField("investmentReturn", "Return on Invested Down Payment", { default: 5, max: 15, step: 0.25 }),
      numberField("yearsToCompare", "Years to Compare", { default: 10, min: 1, max: 30 }),
    ],
    calcResult: { label: "Buying Saves", format: "currency", currency: "CAD" },
    calcResults: [
      { key: "buyingSaves", label: "Buying Saves (Negative = Renting Wins)", format: "currency", currency: "CAD", highlight: true },
      { key: "netCostOfBuying", label: "Net Cost of Buying", format: "currency", currency: "CAD" },
      { key: "netCostOfRenting", label: "Net Cost of Renting", format: "currency", currency: "CAD" },
      { key: "monthlyMortgagePayment", label: "Monthly Mortgage Payment", format: "currency", currency: "CAD" },
      { key: "cmhcPremium", label: "CMHC Insurance Premium", format: "currency", currency: "CAD" },
      { key: "landTransferTax", label: "Land Transfer Tax (After Rebates)", format: "currency", currency: "CAD" },
      { key: "equityAtEnd", label: "Your Equity After Selling", format: "currency", currency: "CAD" },
    ],
    instructions: "Enter the price, your down payment, amortization and rate, and pick your province. Add yearly owning costs and the price growth you expect. For renting, enter the rent on a similar home and what you'd earn investing your down payment instead.",
    examples: "Example: a $750,000 Ontario home with 10% down at 4.5% has a $20,925 CMHC premium, a $7,475 land transfer tax after the first-time rebate and a $3,851.76 monthly payment. Over 10 years, buying costs about $298,000 net vs $388,600 for renting — buying wins by about $90,600.",
    assumptions: "Canadian fixed mortgages compound semi-annually. CMHC premiums: 4.00% (5–9.99% down), 3.10% (10–14.99%), 2.80% (15–19.99%), +0.20% for 30-year amortization. Land transfer tax: Ontario and Toronto brackets with first-time rebates of $4,000 and $4,475; BC's first-time exemption on the first $500,000 for homes up to $835,000 (phasing out to $860,000); Alberta charges only title fees; Quebec's 2025 welcome-tax brackets. Net cost of buying includes the lost return on your down payment and closing costs.",
    faq: [
      { question: "Is it better to rent or buy in Canada?", answer: "It depends on how long you stay, price growth, rates and rent. Buying usually wins over 7–10+ years; renting is often cheaper for short stays in expensive cities." },
      { question: "How much is CMHC insurance?", answer: "2.80–4.00% of the loan when you put less than 20% down, added to your mortgage." },
    ],
  },
  {
    slug: "hoa-loan-calculator",
    title: "HOA Loan Calculator",
    category: CAT,
    description: "Turn an HOA or condo association loan for a roof, repairs or other capital project into the monthly assessment each owner pays — and compare it with a one-time special assessment.",
    metaTitle: "HOA Loan Calculator — Per-Unit Assessment for an HOA Loan",
    metaDescription: "Free HOA loan calculator. See the association's payment, each owner's monthly assessment, total interest and the special assessment alternative.",
    calcInputs: [
      currencyField("loanAmount", "HOA Loan Amount", { default: 1200000, max: 50000000, step: 1000 }),
      percentField("interestRate", "Interest Rate", { default: 7, max: 15, step: 0.125 }),
      numberField("loanTerm", "Loan Term (Years)", { default: 10, min: 1, max: 30 }),
      numberField("units", "Number of Units", { default: 80, min: 1, max: 5000 }),
      percentField("unitSharePercent", "Your Unit's Ownership Share (Blank = Equal Split)", { default: 0, max: 100, step: 0.01, required: false }),
    ],
    calcResult: { label: "Your Monthly Assessment", format: "currency" },
    calcResults: [
      { key: "perUnitMonthly", label: "Your Monthly Loan Assessment", format: "currency", highlight: true },
      { key: "associationMonthlyPayment", label: "Association's Monthly Loan Payment", format: "currency" },
      { key: "perUnitTotalPaid", label: "Your Total Over the Loan", format: "currency" },
      { key: "perUnitInterest", label: "Your Share of the Interest", format: "currency" },
      { key: "specialAssessmentInstead", label: "One-Time Special Assessment Instead", format: "currency" },
      { key: "totalInterest", label: "Total Interest (Association)", format: "currency" },
    ],
    instructions: "Enter the loan amount, rate and term from the board's proposal and the number of units. If assessments follow ownership percentages, enter your unit's share from the governing documents; otherwise the cost is split equally.",
    examples: "Example: a $1.2 million, 10-year HOA loan at 7% costs the association $13,933.02 a month. Split over 80 units that's $174.16 a month per owner — $20,899.53 in total — vs a $15,000.00 special assessment paid at once.",
    assumptions: "HOA loans are usually 5–15-year commercial loans secured by assessment income, not by the units. Owners repay through a dedicated monthly assessment; some associations let owners pay their share up front and skip the interest. Votes and limits are set by the governing documents and state law.",
    faq: [
      { question: "What is an HOA loan?", answer: "A loan the association takes out for big repairs, repaid over time through owner assessments instead of one large special assessment." },
      { question: "Is an HOA loan better than a special assessment?", answer: "It spreads the cost, but adds interest. Owners with cash may save by paying their share up front if allowed." },
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
