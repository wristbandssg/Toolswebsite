// One-time (but safe to re-run) batch setup script: creates 9 rent & tenant tools
// from the user's real estate list (Real Estate Calculators > Rent & Tenant Calculators).
// See src/lib/calc-engine-re-rent.ts for the math.
//
// HOW TO RUN (after prisma/restructure-real-estate-main-category.ts --apply)
//   npx tsx prisma/create-re-rent-calculators.ts
// or
//   npm run db:create-re-rent-calculators

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

const CAT = "rent-tenant-calculators";

const TOOLS: ToolDef[] = [
  {
    slug: "hud-rent-calculator",
    title: "HUD Rent Calculator",
    category: CAT,
    description: "Estimate your rent under HUD rules — public housing or a Section 8 Housing Choice Voucher — from your income, deductions, utility allowance and the local payment standard.",
    metaTitle: "HUD Rent Calculator — Section 8 & Public Housing Rent",
    metaDescription: "Free HUD rent calculator. Estimate your Section 8 or public housing rent: adjusted income, total tenant payment, utility allowance and the voucher payment.",
    calcInputs: [
      dropdown("program", "Program", [["Public Housing", 0], ["Housing Choice Voucher (Section 8)", 1]], 1),
      currencyField("annualIncome", "Annual Household Gross Income", { default: 30000, max: 300000, step: 100 }),
      numberField("dependents", "Dependents (Under 18, Full-Time Students, Disabled)", { default: 2, max: 15, required: false }),
      YN("elderlyOrDisabled", "Head, Co-Head or Spouse Is 62+ or Disabled", 0),
      currencyField("childcareExpenses", "Yearly Childcare Expenses (to Work or Study)", { default: 0, max: 50000, required: false }),
      currencyField("medicalExpenses", "Yearly Unreimbursed Medical Costs (Elderly/Disabled Only)", { default: 0, max: 100000, required: false }),
      currencyField("grossRent", "Gross Rent (Rent + Utility Allowance)", { default: 1600, max: 10000 }),
      currencyField("utilityAllowance", "Monthly Utility Allowance", { default: 150, max: 1000, required: false }),
      currencyField("paymentStandard", "Voucher Payment Standard (Monthly)", { default: 1550, max: 10000, required: false }),
      currencyField("minimumRent", "PHA Minimum Rent", { default: 50, max: 50, required: false }),
      currencyField("dependentDeduction", "Deduction per Dependent", { default: 480, max: 1000, required: false }),
      currencyField("elderlyDeduction", "Elderly/Disabled Family Deduction", { default: 525, max: 1000, required: false }),
    ],
    calcResult: { label: "Tenant Rent to Owner", format: "currency" },
    calcResults: [
      { key: "tenantRentToOwner", label: "Your Rent to the Landlord (Monthly)", format: "currency", highlight: true },
      { key: "totalTenantPayment", label: "Total Tenant Payment (TTP)", format: "currency" },
      { key: "tenantShareWithUtilities", label: "Your Share Including Utilities", format: "currency" },
      { key: "housingAssistancePayment", label: "Housing Assistance Payment (Voucher)", format: "currency" },
      { key: "adjustedAnnualIncome", label: "Adjusted Annual Income", format: "currency" },
      { key: "shareOfAdjustedIncome", label: "Share of Adjusted Monthly Income", format: "percentage" },
      { key: "over40PercentCap", label: "Over the 40% Move-In Cap? (1 = Yes)", format: "number" },
    ],
    instructions: "Pick your program and enter your household's yearly gross income. Add your dependents, whether the head of household is 62+ or disabled, and any childcare or medical costs that count as deductions.\n\nFor a voucher, enter the unit's gross rent (rent plus the PHA's utility allowance) and the local payment standard from your housing authority.",
    examples: "Example: a voucher family earning $30,000 with two dependents has an adjusted income of $29,040, so its total tenant payment is $726.00. On a $1,600 gross rent with a $1,550 payment standard, the voucher pays $824.00 and the family pays $776.00 — $626.00 to the landlord after the $150.00 utility allowance.",
    assumptions: "Total tenant payment is the highest of 30% of adjusted monthly income, 10% of gross monthly income or the minimum rent (up to $50). Deductions follow HOTMA: $480 per dependent, $525 for an elderly/disabled family (both indexed — your PHA uses its current amounts) and medical costs above 10% of income. A voucher family pays any rent above the payment standard, and at first lease-up can't pay more than 40% of adjusted monthly income. Your PHA's certification is the final word.",
    faq: [
      { question: "How is Section 8 rent calculated?", answer: "You generally pay 30% of your adjusted monthly income toward rent and utilities; the voucher pays the rest up to the payment standard." },
      { question: "What is a utility allowance?", answer: "The PHA's estimate of tenant-paid utilities. It's subtracted from your share, so you pay the landlord less when you pay utilities yourself." },
      { question: "Can my rent be more than 30% of my income?", answer: "Yes, with a voucher, if the unit's rent is above the payment standard — but not over 40% of adjusted income when you first move in." },
    ],
  },
  {
    slug: "mn-renters-rebate-calculator",
    title: "MN Renter's Rebate Calculator",
    category: CAT,
    description: "Estimate Minnesota's Renter's Credit (the old renter's rebate) from your household income and the rent you paid — using the 17% rent-as-property-tax rule and the state's income table.",
    metaTitle: "MN Renter's Rebate Calculator — Minnesota Renter's Credit",
    metaDescription: "Free Minnesota renter's rebate calculator. Estimate your Renter's Credit from household income and rent paid, with the 17% rule and income limit.",
    calcInputs: [
      currencyField("householdIncome", "Household Income for the Year", { default: 35000, max: 150000, step: 100 }),
      currencyField("rentPaid", "Total Rent Paid in the Year", { default: 14400, max: 100000, step: 50 }),
      numberField("dependents", "Dependents", { default: 0, max: 15, required: false }),
      currencyField("dependentSubtraction", "Subtraction per Dependent (from Form M1RENT)", { default: 0, max: 20000, required: false }),
    ],
    calcResult: { label: "Estimated Renter's Credit", format: "currency" },
    calcResults: [
      { key: "estimatedCredit", label: "Estimated Renter's Credit", format: "currency", highlight: true },
      { key: "rentConstitutingPropertyTax", label: "Rent Counted as Property Tax (17%)", format: "currency" },
      { key: "incomeThreshold", label: "Your Income Threshold", format: "currency" },
      { key: "claimantCopay", label: "Your Co-Pay Share", format: "currency" },
      { key: "maximumCredit", label: "Maximum Credit at Your Income", format: "currency" },
      { key: "householdIncomeUsed", label: "Household Income Used", format: "currency" },
    ],
    instructions: "Enter your household income (all taxable and most nontaxable income of you and your spouse) and the rent you paid for the year, as shown on your landlord's Certificate of Rent Paid (CRP). If you have dependents, enter the per-dependent subtraction from the current Form M1RENT instructions.",
    examples: "Example: a renter with $35,000 household income who paid $14,400 rent has $2,448.00 counted as property tax. The threshold is 1.8% of income ($630.00), the renter pays 25% of the rest ($454.50), so the estimated credit is $1,363.50.",
    assumptions: "Uses the Minn. Stat. 290.0693 table (statutory year 2024) indexed to the 2025 figures: a $2,720 top credit and a $77,570 income limit. The Department of Revenue re-indexes the brackets each year, so your credit can differ slightly. Since 2024 the credit is claimed on your income tax return (Schedule M1RENT) instead of the old M1PR rebate.",
    faq: [
      { question: "Is the Minnesota renter's rebate still available?", answer: "Yes — it became the Renter's Credit in 2024 and is claimed with your Minnesota income tax return." },
      { question: "What is the income limit for the renter's credit?", answer: "About $77,570 of household income for 2025 claims; the limit is adjusted every year." },
      { question: "Do I need a CRP?", answer: "Yes. Your landlord must give you a Certificate of Rent Paid showing the rent you paid." },
    ],
  },
  {
    slug: "nyc-rent-calculator",
    title: "NYC Rent Calculator",
    category: CAT,
    description: "Check whether you qualify for a New York City apartment under the 40x rent rule, what income a guarantor needs (80x), the most rent you can get approved for and the cash you need to move in.",
    metaTitle: "NYC Rent Calculator — 40x Rule, Guarantor & Move-In Cost",
    metaDescription: "Free NYC rent calculator. See the income you need under the 40x rule, guarantor 80x income, max approved rent and move-in costs in New York City.",
    calcInputs: [
      currencyField("monthlyRent", "Monthly Rent", { default: 3500, max: 50000, step: 25 }),
      currencyField("annualIncome", "Your Annual Gross Income (All Applicants)", { default: 120000, max: 2000000, step: 1000 }),
      currencyField("guarantorIncome", "Guarantor's Annual Income (Optional)", { default: 0, max: 5000000, step: 1000, required: false }),
      numberField("depositMonths", "Security Deposit (Months, Max 1)", { default: 1, max: 1, step: 0.5, required: false }),
      percentField("brokerFeePercent", "Broker Fee You Pay (% of Annual Rent)", { default: 0, max: 15, step: 0.5, required: false }),
      currencyField("applicationFee", "Application Fee (Capped at $20)", { default: 20, max: 20, required: false }),
    ],
    calcResult: { label: "Annual Income Needed (40x)", format: "currency" },
    calcResults: [
      { key: "annualIncomeNeeded", label: "Annual Income Needed (40x Rent)", format: "currency", highlight: true },
      { key: "maxRentOnYourIncome", label: "Max Rent You Qualify For", format: "currency" },
      { key: "qualifiesOnIncome", label: "You Qualify on Income? (1 = Yes)", format: "number" },
      { key: "guarantorIncomeNeeded", label: "Guarantor Income Needed (80x Rent)", format: "currency" },
      { key: "guarantorQualifies", label: "Guarantor Qualifies? (1 = Yes)", format: "number" },
      { key: "moveInCash", label: "Cash to Move In", format: "currency" },
      { key: "brokerFee", label: "Broker Fee", format: "currency" },
      { key: "rentToIncome", label: "Rent as % of Income", format: "percentage" },
    ],
    instructions: "Enter the monthly rent and the combined yearly income of everyone on the lease. Add a guarantor's income if you have one. Under the FARE Act, you only pay a broker fee if you hired the broker yourself — leave it at 0% otherwise.",
    examples: "Example: a $3,500 apartment needs $140,000 a year under the 40x rule, so a $120,000 earner qualifies for up to $3,000.00 a month. A guarantor would need $280,000. Moving in costs $7,020.00 — first month, a one-month deposit and the $20 application fee.",
    assumptions: "Most NYC landlords want yearly income of 40 times the monthly rent and 80 times for guarantors; some accept institutional guarantors instead. New York law caps the security deposit at one month and the application fee at $20, and the 2025 FARE Act makes the party who hires the broker pay the fee. Rent-stabilized units follow the Rent Guidelines Board's yearly increases.",
    faq: [
      { question: "What is the 40x rent rule in NYC?", answer: "Your yearly income should be at least 40 times the monthly rent — $120,000 for a $3,000 apartment." },
      { question: "Do I still pay a broker fee in NYC?", answer: "Since June 2025 the FARE Act says whoever hires the broker pays. If the landlord's broker lists the unit, the tenant shouldn't be charged." },
      { question: "How much is a security deposit in New York?", answer: "No more than one month's rent." },
    ],
  },
  {
    slug: "texas-rent-calculator",
    title: "Texas Rent Calculator",
    category: CAT,
    description: "See how much rent you can afford in Texas under the 3x income rule and after your debts, whether you qualify for a unit, and the move-in cash — deposit, per-adult application fees, admin and pet fees.",
    metaTitle: "Texas Rent Calculator — Rent Affordability & Move-In Cost",
    metaDescription: "Free Texas rent calculator. Check the 3x income rule, max rent after debts, and move-in costs with deposit, application, admin and pet fees.",
    calcInputs: [
      currencyField("monthlyRent", "Monthly Rent", { default: 1500, max: 20000, step: 25 }),
      currencyField("annualIncome", "Annual Gross Household Income", { default: 60000, max: 1000000, step: 1000 }),
      numberField("incomeMultiple", "Landlord's Income Rule (x Rent)", { default: 3, min: 2, max: 4, step: 0.5 }),
      currencyField("monthlyDebts", "Monthly Debt Payments", { default: 300, max: 20000, required: false }),
      numberField("adults", "Adults Applying", { default: 1, min: 1, max: 6 }),
      currencyField("depositAmount", "Security Deposit", { default: 500, max: 20000, required: false }),
      currencyField("applicationFee", "Application Fee per Adult", { default: 60, max: 300, required: false }),
      currencyField("adminFee", "Admin / Lease Fee", { default: 150, max: 1000, required: false }),
      currencyField("petFees", "Pet Deposit & Fees", { default: 0, max: 2000, required: false }),
      currencyField("utilities", "Monthly Utilities (Electric, Water, Internet)", { default: 220, max: 2000, required: false }),
      currencyField("rentersInsurance", "Monthly Renters Insurance", { default: 15, max: 200, required: false }),
    ],
    calcResult: { label: "Max Rent by Income Rule", format: "currency" },
    calcResults: [
      { key: "maxRentByIncomeRule", label: "Max Rent by the Income Rule", format: "currency", highlight: true },
      { key: "maxRentAfterDebts", label: "Max Rent After Debts (40% Rule)", format: "currency" },
      { key: "monthlyIncomeNeeded", label: "Monthly Income Needed for This Unit", format: "currency" },
      { key: "qualifiesOnIncome", label: "You Qualify? (1 = Yes)", format: "number" },
      { key: "moveInCash", label: "Cash to Move In", format: "currency" },
      { key: "totalMonthlyHousing", label: "Total Monthly Housing Cost", format: "currency" },
      { key: "rentToIncome", label: "Rent as % of Gross Income", format: "percentage" },
    ],
    instructions: "Enter the rent, your household income and the landlord's income rule (most Texas complexes use 3x the rent in gross monthly income). Add your monthly debts, how many adults are applying, and the move-in fees from the listing. Texas summers make electric bills a big line — include them in utilities.",
    examples: "Example: on $60,000 a year ($5,000 a month), the 3x rule allows up to $1,666.67 in rent. A $1,500 unit with a $500 deposit, one $60 application and a $150 admin fee takes $2,210.00 to move in; with utilities and insurance it costs $1,735.00 a month.",
    assumptions: "Texas has no state cap on security deposits and no state income tax, so landlords screen on gross income. Application fees are charged per adult. The 40% check keeps rent plus debt payments under 40% of gross income. Under Texas Property Code §92.103 a landlord must refund the deposit within 30 days of move-out.",
    faq: [
      { question: "How much income do I need to rent in Texas?", answer: "Most landlords want gross monthly income of about 3 times the rent — $4,500 a month for a $1,500 apartment." },
      { question: "Is there a limit on security deposits in Texas?", answer: "No. Texas doesn't cap deposits, though one month's rent or less is common." },
    ],
  },
  {
    slug: "chicago-rent-calculator",
    title: "Chicago Rent Calculator",
    category: CAT,
    description: "Check whether you qualify for a Chicago apartment, the move-in cash with a security deposit or a non-refundable move-in fee, and the deposit interest your landlord owes under the RLTO.",
    metaTitle: "Chicago Rent Calculator — Income Rule, Move-In Fee & Deposit",
    metaDescription: "Free Chicago rent calculator. Check the income rule, compare a move-in fee with a security deposit and estimate RLTO deposit interest.",
    calcInputs: [
      currencyField("monthlyRent", "Monthly Rent", { default: 2000, max: 20000, step: 25 }),
      currencyField("annualIncome", "Annual Gross Household Income", { default: 80000, max: 1000000, step: 1000 }),
      numberField("incomeMultiple", "Landlord's Income Rule (x Rent)", { default: 3, min: 2, max: 4, step: 0.5 }),
      YN("moveInFeeInstead", "Landlord Charges a Move-In Fee Instead of a Deposit", 0),
      currencyField("depositAmount", "Security Deposit", { default: 2000, max: 20000, required: false }),
      currencyField("moveInFee", "Non-Refundable Move-In Fee", { default: 500, max: 5000, required: false }),
      currencyField("applicationFee", "Application / Screening Fee", { default: 50, max: 500, required: false }),
      percentField("depositInterestRate", "Deposit Interest Rate (City Comptroller)", { default: 0.01, max: 5, step: 0.01, required: false }),
      numberField("yearsHeld", "Years the Deposit Is Held", { default: 1, max: 20, step: 0.5, required: false }),
    ],
    calcResult: { label: "Cash to Move In", format: "currency" },
    calcResults: [
      { key: "moveInCash", label: "Cash to Move In", format: "currency", highlight: true },
      { key: "nonRefundableAtMoveIn", label: "Non-Refundable Part", format: "currency" },
      { key: "maxRentByIncomeRule", label: "Max Rent by the Income Rule", format: "currency" },
      { key: "monthlyIncomeNeeded", label: "Monthly Income Needed for This Unit", format: "currency" },
      { key: "qualifiesOnIncome", label: "You Qualify? (1 = Yes)", format: "number" },
      { key: "depositInterestOwed", label: "Deposit Interest Owed to You", format: "currency" },
      { key: "rentToIncome", label: "Rent as % of Gross Income", format: "percentage" },
    ],
    instructions: "Enter the rent, your household income and the landlord's income rule. Many Chicago landlords charge a non-refundable move-in fee instead of a security deposit — choose which one applies. For a deposit, enter the City Comptroller's current interest rate and how long it will be held.",
    examples: "Example: a $2,000 apartment needs $6,000 a month in income under the 3x rule; an $80,000 earner qualifies for up to $2,222.22. With a $2,000 deposit and a $50 application fee you need $4,050.00 to move in; with a $500 move-in fee instead it's $2,550.00, of which $550.00 never comes back.",
    assumptions: "Chicago's Residential Landlord and Tenant Ordinance (RLTO) requires interest on deposits held more than six months, at a rate the City Comptroller sets each year, and strict receipt and return rules. Owner-occupied buildings with six or fewer units are exempt from the RLTO. Move-in fees are legal but non-refundable.",
    faq: [
      { question: "Is a move-in fee better than a security deposit in Chicago?", answer: "It's less cash up front, but you never get it back. A deposit costs more now but is refundable — with interest — if the unit is left in good shape." },
      { question: "Does my Chicago landlord owe interest on my deposit?", answer: "Yes, under the RLTO, for deposits held more than six months, unless the building is owner-occupied with six or fewer units." },
    ],
  },
  {
    slug: "security-deposit-calculator",
    title: "Security Deposit Calculator",
    category: CAT,
    description: "Work out a rental security deposit, check it against your state's legal maximum, add any interest owed, and see the refund due after deductions for unpaid rent, damage and cleaning.",
    metaTitle: "Security Deposit Calculator — Deposit, Limit & Refund",
    metaDescription: "Free security deposit calculator. Find the deposit amount, check your state's legal cap, add interest and work out the refund after deductions.",
    calcInputs: [
      currencyField("monthlyRent", "Monthly Rent", { default: 1800, max: 30000, step: 25 }),
      numberField("depositMonths", "Deposit (Months of Rent)", { default: 1, max: 6, step: 0.5 }),
      numberField("stateCapMonths", "State Legal Maximum (Months, 0 = No Cap)", { default: 0, max: 6, step: 0.5, required: false }),
      percentField("interestRate", "Required Interest Rate (If Any)", { default: 0, max: 10, step: 0.01, required: false }),
      numberField("monthsHeld", "Months the Deposit Was Held", { default: 12, max: 240, required: false }),
      currencyField("unpaidRent", "Unpaid Rent", { default: 0, max: 50000, required: false }),
      currencyField("damages", "Damage Beyond Normal Wear and Tear", { default: 0, max: 50000, required: false }),
      currencyField("cleaning", "Cleaning Charges", { default: 0, max: 5000, required: false }),
      currencyField("otherCharges", "Other Lawful Charges", { default: 0, max: 20000, required: false }),
    ],
    calcResult: { label: "Refund Due", format: "currency" },
    calcResults: [
      { key: "refundDue", label: "Refund Due to Tenant", format: "currency", highlight: true },
      { key: "depositAmount", label: "Security Deposit", format: "currency" },
      { key: "legalMaximum", label: "State Legal Maximum", format: "currency" },
      { key: "overTheCap", label: "Amount Over the Cap", format: "currency" },
      { key: "interestEarned", label: "Interest Owed", format: "currency" },
      { key: "totalDeductions", label: "Total Deductions", format: "currency" },
      { key: "tenantStillOwes", label: "Tenant Still Owes (Deductions Over Deposit)", format: "currency" },
    ],
    instructions: "Enter the rent and the deposit in months of rent. Add your state's cap if it has one (for example, 1 month in New York and California) and any interest rule. At move-out, enter itemized deductions to see the refund.",
    examples: "Example: a $1,800 rent with a 1-month deposit is $1,800.00. After 12 months at 1% interest ($18.00) and $250 of cleaning and $200 of damage, the tenant gets $1,368.00 back.",
    assumptions: "Deposit caps, interest rules and refund deadlines are set by each state (and some cities). Landlords can't deduct normal wear and tear and usually must send an itemized list within 14–45 days. Unpaid rent and damage over the deposit can still be collected from the tenant.",
    faq: [
      { question: "How much can a landlord charge for a security deposit?", answer: "It depends on the state — many cap it at 1–2 months' rent; some, like Texas, have no cap." },
      { question: "What can be deducted from a security deposit?", answer: "Unpaid rent, damage beyond normal wear and tear, and cleaning needed to return the unit to move-in condition." },
    ],
  },
  {
    slug: "cell-tower-lease-buyout-calculator",
    title: "Cell Tower Lease Buyout Calculator",
    category: CAT,
    description: "Decide whether to take a lump-sum buyout for your cell tower ground lease: the present value of the rent you'd give up, the offer as a multiple of rent and how many years of rent it equals.",
    metaTitle: "Cell Tower Lease Buyout Calculator — Is the Offer Fair?",
    metaDescription: "Free cell tower lease buyout calculator. Compare a lump-sum offer with the present value of your remaining tower rent, escalators and renewal risk.",
    calcInputs: [
      currencyField("annualRent", "Current Yearly Lease Rent", { default: 18000, max: 500000, step: 100 }),
      percentField("escalator", "Yearly Rent Escalator", { default: 3, max: 15, step: 0.25 }),
      numberField("yearsRemaining", "Years Left Including Renewals", { default: 25, min: 1, max: 99 }),
      percentField("discountRate", "Discount Rate (Your Required Return)", { default: 8, max: 25, step: 0.25 }),
      percentField("renewalProbability", "Chance the Tower Stays the Full Term", { default: 85, max: 100, step: 1 }),
      currencyField("buyoutOffer", "Lump-Sum Buyout Offer", { default: 250000, max: 20000000, step: 1000 }),
    ],
    calcResult: { label: "Present Value of Rent", format: "currency" },
    calcResults: [
      { key: "presentValueOfRent", label: "Present Value of Remaining Rent", format: "currency", highlight: true },
      { key: "offerVsPresentValue", label: "Offer as % of Present Value", format: "percentage" },
      { key: "offerMultipleOfRent", label: "Offer as a Multiple of Yearly Rent", format: "number", decimals: 1 },
      { key: "totalRentIfYouKeep", label: "Total Rent If You Keep the Lease", format: "currency" },
      { key: "yearsOfRentToMatchOffer", label: "Years of Rent to Equal the Offer", format: "number" },
      { key: "gainOrLossVsKeeping", label: "Offer Minus Present Value", format: "currency" },
    ],
    instructions: "Enter your yearly rent, the escalator in the lease and the years left including renewal options. Choose a discount rate — the return you could earn elsewhere — and how likely the carrier keeps the tower for the full term. Then enter the buyout offer.",
    examples: "Example: $18,000 a year rising 3% for 25 years, 85% likely to run full term and discounted at 8%, is worth about $212,450 today. A $250,000 offer is about 118% of that — 13.9 times yearly rent — and equals about 14 years of (risk-weighted) rent.",
    assumptions: "Buyouts usually buy a perpetual easement, so you give up all future rent, renewals and any co-location revenue share. Offers are often 10–20 times yearly rent; tower consolidation and network changes are the main risk of keeping the lease. Lump sums may be taxed as a capital gain or ordinary income — ask a tax adviser.",
    faq: [
      { question: "How much is a cell tower lease buyout worth?", answer: "Often 10–20 times the yearly rent, depending on the escalator, years left and the tower's importance to the network." },
      { question: "Should I sell my cell tower lease?", answer: "Compare the offer with the present value of the rent at a realistic discount rate and renewal risk. An offer above that value is usually worth considering." },
    ],
  },
  {
    slug: "rent-per-square-foot-calculator",
    title: "Rent per Square Foot Calculator",
    category: CAT,
    description: "Convert rent into price per square foot — monthly for apartments and yearly for commercial space — and compare it with the market rate to see if a unit is over- or under-priced.",
    metaTitle: "Rent per Square Foot Calculator — Monthly & Annual",
    metaDescription: "Free rent per square foot calculator. Get monthly and annual rent per sq ft and compare an apartment or office with the local market rate.",
    calcInputs: [
      currencyField("rent", "Rent", { default: 2200, max: 1000000, step: 25 }),
      dropdown("rentIsAnnual", "Rent Entered Is", [["Monthly", 0], ["Yearly", 1]], 0),
      numberField("squareFeet", "Square Feet", { default: 1000, min: 1, max: 1000000 }),
      currencyField("marketRentPerSqFtYear", "Market Rent per Sq Ft per Year (Optional)", { default: 24, max: 500, step: 0.5, required: false }),
    ],
    calcResult: { label: "Rent per Sq Ft per Month", format: "currency" },
    calcResults: [
      { key: "rentPerSqFtMonth", label: "Rent per Sq Ft per Month", format: "currency", highlight: true },
      { key: "rentPerSqFtYear", label: "Rent per Sq Ft per Year", format: "currency" },
      { key: "monthlyRent", label: "Monthly Rent", format: "currency" },
      { key: "marketMonthlyRent", label: "Monthly Rent at the Market Rate", format: "currency" },
      { key: "differenceVsMarket", label: "Above (+) or Below (−) Market", format: "percentage" },
    ],
    instructions: "Enter the rent, whether it's monthly or yearly, and the unit's square footage. Add the local market rent per square foot per year to compare — commercial listings usually quote it that way.",
    examples: "Example: a 1,000 sq ft apartment at $2,200 a month is $2.20 per sq ft per month, or $26.40 a year. Against a $24.00 market rate, it's 10% above market; at market it would rent for $2,000.00.",
    assumptions: "Residential rent is usually compared per month and commercial rent per year. Square footage definitions vary (usable vs rentable, with a load factor for common areas), so compare units measured the same way.",
    faq: [
      { question: "How do you calculate rent per square foot?", answer: "Divide the yearly rent by the square footage; divide by 12 again for the monthly figure." },
      { question: "Is commercial rent quoted monthly or yearly per square foot?", answer: "Usually yearly — $30/sq ft/yr on 2,000 sq ft is $60,000 a year, or $5,000 a month." },
    ],
  },
  {
    slug: "rera-rent-calculator",
    title: "RERA Rent Calculator",
    category: CAT,
    description: "Find the maximum rent increase your Dubai landlord can ask at renewal under RERA's rental index rules (Decree No. 43 of 2013), and your new annual and monthly rent.",
    metaTitle: "RERA Rent Calculator — Dubai Rent Increase Calculator",
    metaDescription: "Free RERA rent increase calculator for Dubai. See the maximum allowed increase from the gap between your rent and the rental index, and your new rent.",
    calcInputs: [
      numberField("currentRent", "Current Annual Rent", { unit: "AED", default: 90000, max: 5000000, step: 500 }),
      numberField("indexRent", "Average Rent in the RERA Rental Index", { unit: "AED", default: 110000, max: 5000000, step: 500 }),
    ],
    calcResult: { label: "Max Rent Increase", format: "percentage" },
    calcResults: [
      { key: "maxIncreasePercent", label: "Maximum Allowed Increase", format: "percentage", highlight: true },
      { key: "maxNewAnnualRent", label: "Maximum New Annual Rent", format: "currency", currency: "AED" },
      { key: "maxIncreaseAmount", label: "Maximum Increase Amount", format: "currency", currency: "AED" },
      { key: "newMonthlyRent", label: "New Rent per Month", format: "currency", currency: "AED" },
      { key: "belowIndexPercent", label: "Your Rent Below the Index", format: "percentage" },
    ],
    instructions: "Enter your current annual rent and the average rent the Dubai Land Department's rental index (Smart Rental Index) shows for a similar unit in your area. The calculator applies the Decree 43 bands.",
    examples: "Example: a tenant paying AED 90,000 when the index average is AED 110,000 is 18.2% below market, so the landlord can raise rent by up to 5% — to AED 94,500.00, or AED 7,875.00 a month.",
    assumptions: "Decree No. 43 of 2013: no increase if the rent is up to 10% below the index; 5% if 11–20% below; 10% if 21–30%; 15% if 31–40%; 20% if more than 40% below. Landlords must give 90 days' notice before the contract ends. Applies to Dubai only; disputes go to the Rental Disputes Centre.",
    faq: [
      { question: "How much can my landlord increase rent in Dubai?", answer: "Between 0% and 20%, depending on how far your rent is below the RERA rental index average for similar units." },
      { question: "How much notice must a Dubai landlord give for a rent increase?", answer: "At least 90 days before the tenancy contract expires." },
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
