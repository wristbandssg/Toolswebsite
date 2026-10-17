// One-time (but safe to re-run) batch setup script: creates 29 US state and city mortgage
// calculators plus UAE, Spain and Singapore tools from the user's real estate list
// (Real Estate Calculators > Mortgage Calculators > Mortgage Calculators by State, City & Country).
// The math and each place's defaults live in src/lib/calc-engine-re-mortgage-local.ts; every
// US example below is computed from that engine so the copy matches the calculator.
//
// HOW TO RUN (after prisma/restructure-real-estate-main-category.ts --apply)
//   npx tsx prisma/create-re-mortgage-local-calculators.ts
// or
//   npm run db:create-re-mortgage-local-calculators

import { LOCAL_MORTGAGES, localMortgagePayment } from "../src/lib/calc-engine-re-mortgage-local";
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

const CAT = "mortgage-by-location-calculators";

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const round = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** [slug, title, what's different about this place]. */
const PLACES: [string, string, string][] = [
  ["san-diego-mortgage-calculator", "San Diego Mortgage Calculator", "San Diego County property tax is 1% of the purchase price under Prop 13 plus local bonds — about 1.1–1.2% in the first year — and many newer communities (Otay Ranch, Del Sur, Rancho Penasquitos) add Mello-Roos taxes. Most San Diego loans are above the $832,750 conforming limit; the county's 2026 high-cost limit is higher, and jumbo loans cover the rest."],
  ["los-angeles-mortgage-calculator", "Los Angeles Mortgage Calculator", "Los Angeles County property tax starts at 1% of the purchase price (Prop 13) plus voter-approved bonds and direct assessments — about 1.2% in total. LA County's 2026 high-cost conforming limit is $1,249,125, so many purchases can still avoid jumbo pricing. Wildfire areas have higher, harder-to-find insurance."],
  ["long-island-mortgage-calculator", "Long Island Mortgage Calculator", "Nassau and Suffolk property taxes are among the highest in New York — often 2% or more of value, driven by school taxes. Nassau's assessment system and STAR credits change the bill a lot; check the town's tax rate. Homes near the shore may need flood insurance."],
  ["nyc-mortgage-payment-calculator", "NYC Mortgage Payment Calculator", "In New York City most buyers purchase condos or co-ops, so monthly common charges or maintenance (which, for co-ops, include the building's property tax and its underlying mortgage) are a big part of the payment. Condo owners pay their own property tax — effective rates are often under 1% of market value. Co-ops usually require 20–25%+ down and post-closing reserves."],
  ["san-francisco-mortgage-calculator", "San Francisco Mortgage Calculator", "San Francisco's 2025–26 property tax rate is about 1.18% of assessed value, which resets to the purchase price under Prop 13. SF's 2026 high-cost conforming limit is $1,249,125; above that you'll need a jumbo loan, often with 20% down. Condo HOA dues can be substantial."],
  ["pittsburgh-mortgage-calculator", "Pittsburgh Mortgage Calculator", "Pittsburgh homeowners pay Allegheny County, City of Pittsburgh and Pittsburgh Public Schools taxes — about 2% of value combined — with a homestead exclusion off the county portion. Home prices are well below the national median, so taxes are a larger share of the payment than in many cities."],
  ["orlando-mortgage-calculator", "Orlando Mortgage Calculator", "Orange County millage on a newly bought home is about 1.5–1.8% of value before the homestead exemption. Many newer Orlando-area communities have a CDD (community development district) assessment on the tax bill, and Florida insurance costs are high — add flood insurance if the home is in a flood zone."],
  ["sacramento-mortgage-calculator", "Sacramento Mortgage Calculator", "Sacramento County property tax is 1% of the purchase price plus local bonds and assessments — about 1.1–1.2% — and newer suburbs such as Natomas, Elk Grove and Folsom Ranch often carry Mello-Roos taxes. Many Sacramento loans fit under the county's conforming limit."],
  ["dallas-texas-mortgage-calculator", "Dallas Texas Mortgage Calculator", "Dallas County combined property tax rates (county, city, school district, college and hospital) run about 2.0–2.4% of value before the homestead exemption. Suburbs often add MUD or PID assessments. Texas has no state income tax, but hail-driven insurance premiums are well above average."],
  ["florida-mortgage-calculator", "Florida Mortgage Calculator", "Florida property tax on a newly bought home is often 1.4–2.0% of value before the homestead exemption, and Save Our Homes caps later increases at 3% a year. Florida homeowners insurance is the highest in the US on average, and flood insurance is required in many coastal areas."],
  ["indiana-mortgage-calculator", "Indiana Mortgage Calculator", "Indiana caps property taxes at 1% of assessed value for homesteads (2% for rentals and farmland), and the homestead deduction lowers the taxable value further, so most Indiana homeowners pay well under 1%."],
  ["nh-mortgage-calculator", "NH Mortgage Calculator", "New Hampshire has no income or sales tax, so property taxes are high — often 1.5–2.2% of value depending on the town. Check the town's equalized tax rate per $1,000 of value."],
  ["alaska-mortgage-calculator", "Alaska Mortgage Calculator", "Alaska has no statewide property tax; boroughs and cities set their own (Anchorage around 1.3–1.5% of value, many rural areas none). Alaska's conforming loan limit is higher than most states — $1,249,125 in 2026 — and AHFC offers its own loan programs."],
  ["arkansas-mortgage-calculator", "Arkansas Mortgage Calculator", "Arkansas assesses homes at 20% of market value, and millage rates make the effective tax about 0.6% of value, with a homestead credit for owner-occupied homes. Insurance is above average because of storm risk."],
  ["louisiana-mortgage-calculator", "Louisiana Mortgage Calculator", "Louisiana's homestead exemption takes the first $75,000 of value off most parish taxes, keeping effective rates low (about 0.6%), but homeowners and flood insurance are among the highest in the US."],
  ["oregon-mortgage-calculator", "Oregon Mortgage Calculator", "Oregon's Measures 5 and 50 limit taxes on assessed value, which is often below market value, so effective rates average just under 1% — though Portland-area bills can be higher. There is no sales tax."],
  ["ohio-house-payment-calculator", "Ohio House Payment Calculator", "Ohio effective property tax rates are about 1.3–1.8% of value, with big differences by school district. The homestead exemption and the 2.5% rollback help owner-occupants; 2025–26 reappraisals raised many values."],
  ["rochester-ny-mortgage-calculator", "Rochester NY Mortgage Calculator", "Rochester (Monroe County) has some of the highest effective property tax rates in the US — city, county and school taxes together often reach 2.5–3% of value — so taxes can rival principal and interest on a modestly priced home. STAR credits reduce school taxes for eligible owners."],
  ["utah-house-payment-calculator", "Utah House Payment Calculator", "Utah taxes primary residences on only 55% of market value, so effective property tax rates are low (about 0.5–0.6%), while home prices are above the national median."],
  ["alabama-home-loan-calculator", "Alabama Home Loan Calculator", "Alabama has among the lowest property taxes in the US — homes are assessed at 10% of value, and homestead exemptions lower bills further — so effective rates are often under 0.5%. Insurance is higher near the Gulf Coast."],
  ["tn-house-payment-calculator", "TN House Payment Calculator", "Tennessee has no state income tax on wages, and property taxes are moderate — homes are assessed at 25% of value, for effective rates of about 0.5–0.8% (higher in Memphis)."],
  ["ky-house-payment-calculator", "KY House Payment Calculator", "Kentucky effective property tax rates average a little under 1%, made up of state, county, city and school district levies; owners 65+ or disabled get a homestead exemption."],
  ["raleigh-nc-mortgage-calculator", "Raleigh NC Mortgage Calculator", "Raleigh homeowners pay Wake County and City of Raleigh taxes — about 0.9% of value combined after the 2024 revaluation. Fast-growing suburbs have similar rates, and North Carolina has no mortgage tax."],
  ["san-marcos-tx-mortgage-calculator", "San Marcos TX Mortgage Calculator", "San Marcos (Hays County) homeowners pay county, city, San Marcos CISD and ESD taxes — about 2.0–2.3% of value before exemptions — and many newer subdivisions add MUD or PID assessments."],
  ["taxes-california-mortgage-calculator", "Taxes California Mortgage Calculator", "California's Prop 13 sets property tax at 1% of the purchase price plus local voter-approved bonds — usually 1.1–1.3% in total in the first year — and limits assessment increases to 2% a year after that. Mello-Roos and other special assessments can add hundreds a month in newer areas."],
  ["ga-house-payment-calculator", "GA House Payment Calculator", "Georgia assesses homes at 40% of fair market value; after millage and the homestead exemption, effective rates are about 0.8–1.1%. Since 2024, a statewide floating homestead exemption limits yearly assessment increases in participating areas."],
  ["missouri-house-payment-calculator", "Missouri House Payment Calculator", "Missouri assesses homes at 19% of market value, for effective property tax rates around 1% (higher in St. Louis County and Kansas City)."],
  ["oklahoma-simple-mortgage-calculator", "Oklahoma Simple Mortgage Calculator", "Oklahoma property taxes are moderate (about 0.8–1% of value) and assessment increases on homesteads are capped at 3% a year, but homeowners insurance is among the most expensive in the US because of hail and tornadoes."],
  ["sc-mortgage-payment-calculator", "SC Mortgage Payment Calculator", "South Carolina assesses owner-occupied homes at just 4% of value (vs 6% for rentals and second homes), so primary residences pay low property taxes — about 0.5% of value. Coastal homes pay more for wind and flood insurance."],
];

const LOCAL_RESULTS = [
  { key: "monthlyPayment", label: "Total Monthly Payment", format: "currency", highlight: true },
  { key: "principalAndInterest", label: "Principal & Interest", format: "currency" },
  { key: "monthlyPropertyTax", label: "Property Tax", format: "currency" },
  { key: "monthlyInsurance", label: "Homeowners Insurance", format: "currency" },
  { key: "monthlyPmi", label: "PMI", format: "currency" },
  { key: "loanAmount", label: "Loan Amount", format: "currency" },
  { key: "totalInterest", label: "Total Interest Over the Loan", format: "currency" },
];

function placeTool([slug, title, note]: [string, string, string]): ToolDef {
  const m = LOCAL_MORTGAGES[slug];
  if (!m) throw new Error(`No mortgage data for ${slug}`);
  const ex = localMortgagePayment({
    homePrice: m.price, downPaymentPercent: 20, interestRate: 6.5, loanTerm: 30, propertyTaxRate: m.taxRate,
    annualInsurance: m.insurance, monthlyHoa: m.hoa ?? 0, pmiRate: 0.5, localExtra: 0,
  }) as Record<string, number>;
  const word = /house payment/i.test(title) ? "house payment" : /home loan/i.test(title) ? "home loan payment" : "mortgage payment";
  return {
    slug,
    title,
    category: CAT,
    description: `Calculate your ${word} in ${m.name} — principal and interest plus ${m.name} property tax, homeowners insurance, PMI and HOA dues — with defaults set for ${m.name}.`,
    metaTitle: `${title} — Monthly Payment with Taxes`.slice(0, 70),
    metaDescription: `Free ${m.name} mortgage calculator. Estimate your monthly payment with ${m.name} property taxes, insurance, PMI and HOA, and the total interest.`,
    calcInputs: [
      currencyField("homePrice", "Home Price", { default: m.price, max: 50000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 20, max: 100, step: 0.5 }),
      percentField("interestRate", "Interest Rate", { default: 6.5, max: 15, step: 0.125 }),
      dropdown("loanTerm", "Loan Term", [["30 Years", 30], ["20 Years", 20], ["15 Years", 15], ["10 Years", 10]], 30),
      percentField("propertyTaxRate", `${m.name} Property Tax Rate`, { default: m.taxRate, max: 5, step: 0.01 }),
      currencyField("annualInsurance", "Homeowners Insurance per Year", { default: m.insurance, max: 50000, step: 50 }),
      currencyField("monthlyHoa", m.hoa ? "Monthly HOA / Common Charges" : "Monthly HOA Dues", { default: m.hoa ?? 0, max: 20000, required: false }),
      ...(m.extraLabel ? [currencyField("localExtra", m.extraLabel, { default: m.extraDefault ?? 0, max: 5000, required: false })] : []),
      percentField("pmiRate", "PMI Rate (Under 20% Down)", { default: 0.5, max: 2, step: 0.05, required: false }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: LOCAL_RESULTS,
    instructions: `Enter the price, down payment, rate and term. The property tax rate and insurance start at typical ${m.name} levels — replace them with the actual tax bill and an insurance quote for the home you're looking at.${m.extraLabel ? ` Add ${m.extraLabel.replace(/ per Month$/, "").toLowerCase()} if the property has it.` : ""}`,
    examples: `Example: a ${round(m.price)} home in ${m.name} with 20% down at 6.5% for 30 years has ${money(ex.principalAndInterest)} of principal and interest. With ${money(ex.monthlyPropertyTax)} of property tax and ${money(ex.monthlyInsurance)} of insurance${m.hoa ? ` and ${money(m.hoa)} of common charges` : ""}, the total is ${money(ex.monthlyPayment)} a month.`,
    assumptions: `${note}\n\nPMI is added when the down payment is under 20% and drops off once you reach 20% equity on a conventional loan. Rates, taxes and insurance here are estimates — use your Loan Estimate, the property's tax bill and real insurance quotes.`,
    faq: [
      { question: `What is the average property tax rate in ${m.name}?`, answer: `About ${m.taxRate}% of value is a reasonable starting point for a recent purchase, but it varies by neighborhood and exemptions.` },
      { question: `How much is a ${word} on a ${round(m.price)} home in ${m.name}?`, answer: `About ${money(ex.monthlyPayment)} a month with 20% down at 6.5%, including tax and insurance.` },
    ],
  };
}

const TOOLS: ToolDef[] = [
  ...PLACES.map(placeTool),
  {
    slug: "uae-mortgage-calculator",
    title: "UAE Mortgage Calculator",
    category: CAT,
    description: "Calculate a mortgage in Dubai or the UAE — the Central Bank's loan-to-value limits for expats and UAE nationals, the monthly payment, and upfront costs including the 4% DLD fee, mortgage registration, agent and bank fees.",
    metaTitle: "UAE Mortgage Calculator — Dubai Mortgage & Upfront Costs",
    metaDescription: "Free UAE mortgage calculator. See your Dubai mortgage payment, the LTV limit for expats or nationals, and upfront costs: DLD 4%, registration and fees.",
    calcInputs: [
      numberField("propertyPrice", "Property Price", { unit: "AED", default: 2000000, max: 100000000, step: 10000 }),
      YN("uaeNational", "UAE National", 0),
      YN("secondHome", "Second or Investment Property", 0),
      YN("offPlan", "Off-Plan Property", 0),
      percentField("ltvWanted", "Loan-to-Value You Want", { default: 80, max: 85, step: 1 }),
      numberField("loanTerm", "Loan Term (Years, Max 25)", { default: 25, min: 5, max: 25 }),
      percentField("interestRate", "Interest Rate", { default: 4.5, max: 12, step: 0.05 }),
      percentField("agentFeePercent", "Agent Commission (+5% VAT)", { default: 2, max: 5, step: 0.25 }),
      percentField("bankFeePercent", "Bank Arrangement Fee (+5% VAT)", { default: 1, max: 2, step: 0.05 }),
      numberField("valuationFee", "Valuation Fee", { unit: "AED", default: 3000, max: 10000, step: 100 }),
      numberField("trusteeFee", "Registration Trustee Fee", { unit: "AED", default: 4200, max: 10000, step: 100 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency", currency: "AED" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Mortgage Payment", format: "currency", currency: "AED", highlight: true },
      { key: "loanAmount", label: "Loan Amount", format: "currency", currency: "AED" },
      { key: "downPayment", label: "Down Payment", format: "currency", currency: "AED" },
      { key: "upfrontCosts", label: "Upfront Fees & Charges", format: "currency", currency: "AED" },
      { key: "totalCashNeeded", label: "Total Cash Needed", format: "currency", currency: "AED" },
      { key: "dldTransferFee", label: "DLD Transfer Fee (4% + AED 580)", format: "currency", currency: "AED" },
      { key: "maxLoanToValue", label: "Maximum LTV Allowed", format: "percentage" },
    ],
    instructions: "Enter the price and whether you're a UAE national, buying a second property or buying off-plan — these set the Central Bank's maximum loan-to-value. Then enter the term, rate and fees from your bank and agent.",
    examples: "Example: an expat buying a AED 2,000,000 first home with 80% financing at 4.5% over 25 years pays AED 8,893.32 a month. Upfront costs — the AED 80,580 DLD fee, mortgage registration, 2% agent fee and 1% bank fee with VAT, valuation and trustee fees — total about AED 150,870, so the total cash needed is about AED 550,870.",
    assumptions: "UAE Central Bank limits: expats 80% LTV on a first home up to AED 5 million and 70% above; UAE nationals 85% and 75%; second homes 60% (65% for nationals); off-plan 50%. Maximum term is 25 years, and the debt burden ratio is capped at 50% of income. Fees are typical for Dubai; other emirates' land departments charge differently (Abu Dhabi 2%).",
    faq: [
      { question: "How much down payment do I need in Dubai?", answer: "At least 20% for an expat buying a first home up to AED 5 million, plus about 7–8% of the price in fees." },
      { question: "What is the DLD fee in Dubai?", answer: "4% of the purchase price plus an AED 580 admin fee, paid to the Dubai Land Department." },
    ],
  },
  {
    slug: "property-in-spain-mortgage-calculator",
    title: "Property in Spain Mortgage Calculator",
    category: CAT,
    description: "Calculate a Spanish mortgage for a resident or non-resident buyer — the loan-to-value Spanish banks allow, the monthly payment, and the purchase taxes (ITP on resales or IVA plus AJD on new builds), notary and registry fees.",
    metaTitle: "Spain Mortgage Calculator — Payment, Taxes & Fees",
    metaDescription: "Free mortgage calculator for property in Spain. See the payment, non-resident LTV, ITP or IVA + AJD purchase taxes, notary and registry fees.",
    calcInputs: [
      numberField("propertyPrice", "Property Price", { unit: "€", default: 300000, max: 50000000, step: 1000 }),
      YN("nonResident", "Non-Resident Buyer (Max About 70% LTV)", 1),
      percentField("ltvWanted", "Loan-to-Value You Want", { default: 70, max: 80, step: 1 }),
      numberField("loanTerm", "Loan Term (Years)", { default: 25, min: 5, max: 30 }),
      percentField("interestRate", "Interest Rate", { default: 3.5, max: 10, step: 0.05 }),
      YN("newBuild", "New Build from a Developer", 0),
      percentField("itpRate", "ITP Transfer Tax Rate (Resale, by Region)", { default: 8, max: 13, step: 0.5 }),
      percentField("ajdRate", "AJD Stamp Duty Rate (New Build, by Region)", { default: 1.5, max: 2, step: 0.1 }),
      percentField("notaryRegistryPercent", "Notary, Registry, Gestor & Legal", { default: 1.5, max: 4, step: 0.1 }),
      numberField("valuationFee", "Bank Valuation", { unit: "€", default: 400, max: 2000, step: 50 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency", currency: "EUR" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Mortgage Payment", format: "currency", currency: "EUR", highlight: true },
      { key: "loanAmount", label: "Loan Amount", format: "currency", currency: "EUR" },
      { key: "downPayment", label: "Deposit", format: "currency", currency: "EUR" },
      { key: "purchaseTaxes", label: "Purchase Taxes (ITP or IVA + AJD)", format: "currency", currency: "EUR" },
      { key: "notaryRegistryAndFees", label: "Notary, Registry & Other Fees", format: "currency", currency: "EUR" },
      { key: "totalCashNeeded", label: "Total Cash Needed", format: "currency", currency: "EUR" },
      { key: "totalInterest", label: "Total Interest", format: "currency", currency: "EUR" },
    ],
    instructions: "Enter the price and whether you're a non-resident. For a resale home enter your region's ITP rate (for example 7% Andalusia, 10% Valencia and Catalonia, 6% Madrid); for a new build, IVA is 10% plus the region's AJD stamp duty. Add notary, registry and legal costs.",
    examples: "Example: a non-resident buying a €300,000 resale home with 70% financing at 3.5% over 25 years pays €1,051.31 a month. ITP at 8% is €24,000 and fees about €4,900, so the total cash needed is €118,900.",
    assumptions: "Spanish banks usually lend up to 80% to residents and 60–70% to non-residents; buyers need an NIE number. Since 2019 the bank pays the AJD tax on the mortgage deed itself. Regional ITP and AJD rates vary and some regions offer reduced rates for young or first-time buyers. Total buying costs are commonly 10–14% of the price.",
    faq: [
      { question: "Can a foreigner get a mortgage in Spain?", answer: "Yes — non-residents can usually borrow 60–70% of the price, with terms up to 25–30 years." },
      { question: "What taxes do you pay buying property in Spain?", answer: "ITP of 6–10% (by region) on resales, or 10% IVA plus 0.5–2% AJD on new builds." },
    ],
  },
  {
    slug: "singapore-mortgage-affordability-calculator",
    title: "Singapore Mortgage Affordability Calculator",
    category: CAT,
    description: "Find how much property you can afford in Singapore — the bank loan you qualify for under TDSR (55%) and MSR (30% for HDB/EC) at MAS's 4% stress rate, LTV limits, Buyer's Stamp Duty and the cash and CPF you need.",
    metaTitle: "Singapore Mortgage Affordability Calculator — TDSR & MSR",
    metaDescription: "Free Singapore mortgage affordability calculator. See your max loan under TDSR and MSR at the 4% stress rate, max property price, BSD and down payment.",
    calcInputs: [
      numberField("monthlyIncome", "Gross Monthly Income (All Borrowers)", { unit: "S$", default: 12000, max: 1000000, step: 100 }),
      numberField("otherDebtPayments", "Other Monthly Debt Payments", { unit: "S$", default: 500, max: 100000, step: 50, required: false }),
      YN("hdbOrEc", "Buying an HDB Flat or New EC (MSR Applies)", 0),
      numberField("loanTenure", "Loan Tenure (Years)", { default: 30, min: 5, max: 35 }),
      numberField("age", "Age of Main Borrower", { default: 35, min: 21, max: 75 }),
      percentField("interestRate", "Actual Interest Rate", { default: 2.8, max: 8, step: 0.05 }),
      numberField("cashAndCpf", "Cash + CPF Available for Down Payment & Duty", { unit: "S$", default: 400000, max: 50000000, step: 1000 }),
    ],
    calcResult: { label: "Max Property Price", format: "currency", currency: "SGD" },
    calcResults: [
      { key: "maxPropertyPrice", label: "Maximum Property Price", format: "currency", currency: "SGD", highlight: true },
      { key: "maxLoan", label: "Maximum Loan (TDSR / MSR)", format: "currency", currency: "SGD" },
      { key: "loanAtThatPrice", label: "Loan at That Price", format: "currency", currency: "SGD" },
      { key: "monthlyInstalment", label: "Monthly Instalment at Actual Rate", format: "currency", currency: "SGD" },
      { key: "buyersStampDuty", label: "Buyer's Stamp Duty", format: "currency", currency: "SGD" },
      { key: "downPaymentNeeded", label: "Down Payment Needed", format: "currency", currency: "SGD" },
      { key: "minimumCashDownPayment", label: "Minimum Cash Portion", format: "currency", currency: "SGD" },
    ],
    instructions: "Enter your household's gross monthly income and other loan payments, whether it's an HDB flat or new EC, the loan tenure, the main borrower's age and the actual rate you've been quoted. Enter the cash and CPF you can use for the down payment and stamp duty.",
    examples: "Example: S$12,000 a month with S$500 of other debts leaves S$6,100 of TDSR room, which supports a loan of about S$1,277,700 at the 4% stress rate over 30 years. With S$400,000 of cash and CPF, the most you can buy is about S$1,432,400 — a S$1,074,300 loan (75% LTV), S$41,900 of BSD and an instalment of about S$4,414 at 2.8%.",
    assumptions: "TDSR caps all debt payments at 55% of gross monthly income and MSR caps HDB/EC loans at 30%, both tested at a 4% medium-term rate floor (or the actual rate if higher). Bank loan LTV is 75% (with at least 5% in cash) for a first loan, falling to 55% if the tenure runs past 30 years or age 65. HDB loans have different rules. ABSD for second properties, foreigners and PRs isn't included.",
    faq: [
      { question: "What is TDSR in Singapore?", answer: "The Total Debt Servicing Ratio: all your monthly debt payments, including the new mortgage tested at 4%, can't exceed 55% of your gross income." },
      { question: "What is MSR?", answer: "The Mortgage Servicing Ratio: for HDB flats and new ECs, the mortgage payment can't exceed 30% of gross monthly income." },
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
