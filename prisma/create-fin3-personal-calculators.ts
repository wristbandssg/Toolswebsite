// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// finance expansion 3 sub-batch "personal". See
// src/lib/calc-engine-fin3-derivatives-tax.ts for the full list of 10
// sub-batches, and src/lib/calc-engine-fin3-personal.ts for the math. Each tool
// is filed in the Finance Calculators sub-category the user named for it
// (created on first run; Retirement Calculators already exists).
//
// HOW TO RUN
//   npx tsx prisma/create-fin3-personal-calculators.ts
// or
//   npm run db:create-fin3-personal-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const FINANCE_SLUGS = ["finance-calculators", "finance"];

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
    max: opts.max ?? 1000000,
    step: opts.step ?? 1,
  };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "This tool gives estimates for learning and planning only and isn't financial, investment or tax advice. Results depend entirely on your inputs — check important decisions with a qualified professional.";

interface ToolDef {
  slug: string;
  category: { name: string; slug: string };
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

const num = (key: string, label: string, highlight = false, decimals?: number) => ({ key, label, format: "number", ...(decimals !== undefined ? { decimals } : {}), ...(highlight ? { highlight: true } : {}) });
const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });


// Tool categories follow the 14 Oct 2026 consolidation of the Finance sub-categories
// (see prisma/consolidate-finance-subcategories.ts).
const SAVINGS_CATEGORY = { name: "Savings Calculators", slug: "savings-calculators" };
const MACROECONOMICS_CATEGORY = { name: "Economics Calculators", slug: "economics-calculators" };
const BUDGETING_METHODS_CATEGORY = { name: "Budgeting Methods & Planning Calculators", slug: "budgeting-methods-calculators" };
const ALTERNATIVE_INVESTMENT_CATEGORY = { name: "Alternative Investment Calculators", slug: "alternative-investment-calculators" };
const TAX_CATEGORY = { name: "Tax Calculators", slug: "tax-calculators" };
const CREDIT_DEBT_CATEGORY = { name: "Credit & Debt Calculators", slug: "credit-debt-calculators" };

const WEIGHT_UNIT = dropdown("weightUnit", "Weight Unit", [["Grams", 1], ["Troy ounces", 2], ["Pennyweights (dwt)", 3]], 1);

const TOOLS: ToolDef[] = [
  {
    slug: "529-calculator",
    category: SAVINGS_CATEGORY,
    title: "529 Calculator",
    description: "Project your 529 college savings plan balance from monthly contributions and expected returns, and the state income-tax deduction your contributions earn.",
    metaTitle: "529 Calculator — College Savings Plan Growth",
    metaDescription: "Free 529 plan calculator. Project your 529 balance by college age, tax-free growth and the yearly state tax savings from your contributions.",
    calcInputs: [currencyField("currentBalance", "Current 529 Balance", { default: 5000, max: 100000000, step: 100 }), currencyField("monthlyContribution", "Monthly Contribution", { default: 250, max: 1000000, step: 10 }), numberField("yearsUntilCollege", "Years Until College", { default: 15, min: 1, max: 30 }), percentField("expectedReturn", "Expected Yearly Return", { default: 6, max: 20, step: 0.1 }), percentField("stateTaxRate", "Your State Income Tax Rate", { default: 5, max: 15, step: 0.01, required: false }), currencyField("stateDeductionCap", "State Deduction Limit per Year (0 = none)", { default: 10000, max: 1000000, step: 100, required: false })],
    calcResult: { label: "Projected Balance", format: "currency" },
    calcResults: [cur("projectedBalance", "Projected 529 Balance", true), cur("totalContributed", "Total Contributed"), cur("taxFreeGrowth", "Tax-Free Growth"), cur("yearlyStateTaxSavings", "State Tax Savings per Year"), cur("totalStateTaxSavings", "Total State Tax Savings")],
    instructions: "Enter what's already saved, what you'll add each month and the years until your child starts college. Over 30 states give a tax deduction or credit for contributions — enter your state rate and its yearly cap (0 if there's no cap; set the rate to 0 if your state has none).",
    examples: "Example: $5,000 now plus $250 a month for 15 years at 6% grows to about $84,975 — $50,000 contributed and $34,975 of tax-free growth. A 5% state deduction saves $150 a year.",
    assumptions: "Monthly compounding, contributions at month-end. Withdrawals for qualified education (tuition, room and board, up to $10,000 a year of K-12 tuition — $20,000 from 2026) are tax-free; up to $35,000 can roll to the beneficiary's Roth IRA after 15 years. To plan from college costs instead, use the College Savings Goal Calculator. " + DISCLAIMER,
    faq: [
      { question: "What happens if my child doesn't go to college?", answer: "Change the beneficiary, use it for trade school or apprenticeships, roll up to $35,000 to a Roth IRA, or withdraw with tax plus a 10% penalty on the earnings." },
      { question: "How much can I put in a 529?", answer: "There's no yearly limit, but gifts above $19,000 per person (2026) need a gift tax return; you can front-load five years ($95,000)." },
    ],
  },
  {
    slug: "apc-calculator",
    category: MACROECONOMICS_CATEGORY,
    title: "APC Calculator",
    description: "Calculate the average propensity to consume (APC) and to save (APS) — the share of income spent and saved — and the marginal propensity to consume between two periods.",
    metaTitle: "APC Calculator — Average Propensity to Consume & Save",
    metaDescription: "Free APC calculator. Divide consumption by disposable income to get the average propensity to consume, APS, savings and MPC between two periods.",
    calcInputs: [currencyField("consumption", "Consumption Spending", { default: 54000, max: 100000000000, step: 100 }), currencyField("disposableIncome", "Disposable Income", { default: 60000, max: 100000000000, step: 100 }), currencyField("previousConsumption", "Previous Period Consumption (optional)", { default: 0, max: 100000000000, step: 100, required: false }), currencyField("previousIncome", "Previous Period Income (optional)", { default: 0, max: 100000000000, step: 100, required: false })],
    calcResult: { label: "APC", format: "number", decimals: 4 },
    calcResults: [num("apc", "Average Propensity to Consume (APC)", true, 4), num("aps", "Average Propensity to Save (APS)", false, 4), cur("savings", "Savings"), num("mpc", "MPC (if previous period entered)", false, 4)],
    instructions: "Enter spending and disposable (after-tax) income for a household or a whole economy. APC + APS always equals 1. Add the previous period to see the marginal propensity to consume — how much of the extra income was spent.",
    examples: "Example: spending $54,000 out of $60,000 of disposable income is an APC of 0.90 and APS of 0.10 — $6,000 saved.",
    assumptions: "APC = C ÷ Y; APS = 1 − APC. An APC above 1 means spending more than income (dissaving). For the spending multiplier, see the MPC Calculator.",
    faq: [
      { question: "What's the difference between APC and MPC?", answer: "APC is the share of total income spent; MPC is the share of an extra dollar of income spent." },
      { question: "Why does APC fall as income rises?", answer: "Higher-income households can cover their needs with a smaller share of income and save more of the rest." },
    ],
  },
  {
    slug: "bank-reconciliation-calculator",
    category: BUDGETING_METHODS_CATEGORY,
    title: "Bank Reconciliation Calculator",
    description: "Reconcile your bank statement with your books — adjust both balances for deposits in transit, outstanding checks, fees, interest and errors — and find any difference.",
    metaTitle: "Bank Reconciliation Calculator — Bank vs Book Balance",
    metaDescription: "Free bank reconciliation calculator. Adjust the bank balance for deposits in transit and outstanding checks, and your books for fees, interest and NSF checks.",
    calcInputs: [numberField("bankBalance", "Balance per Bank Statement", { unit: "$", default: 8450, min: -100000000, max: 100000000, step: 0.01 }), currencyField("depositsInTransit", "Deposits in Transit", { default: 1200, max: 100000000, step: 0.01, required: false }), currencyField("outstandingChecks", "Outstanding Checks", { default: 1575, max: 100000000, step: 0.01, required: false }), numberField("bankErrors", "Bank Errors (+ add / − subtract)", { unit: "$", default: 0, min: -100000000, max: 100000000, step: 0.01, required: false }), numberField("bookBalance", "Balance per Your Books", { unit: "$", default: 8125, min: -100000000, max: 100000000, step: 0.01 }), currencyField("interestEarned", "Interest Earned (not yet recorded)", { default: 15, max: 100000000, step: 0.01, required: false }), currencyField("collectionsByBank", "Collections by Bank (not yet recorded)", { default: 0, max: 100000000, step: 0.01, required: false }), currencyField("bankFees", "Bank Service Fees", { default: 25, max: 100000000, step: 0.01, required: false }), currencyField("nsfChecks", "NSF (Bounced) Checks", { default: 0, max: 100000000, step: 0.01, required: false }), numberField("bookErrors", "Book Errors (+ add / − subtract)", { unit: "$", default: -40, min: -100000000, max: 100000000, step: 0.01, required: false })],
    calcResult: { label: "Difference", format: "currency" },
    calcResults: [cur("adjustedBankBalance", "Adjusted Bank Balance"), cur("adjustedBookBalance", "Adjusted Book Balance"), cur("difference", "Difference (should be 0)", true), num("reconciled", "Reconciled (1 = yes)")],
    instructions: "Start with the statement balance and add deposits the bank hasn't recorded yet, then subtract checks that haven't cleared. On the book side, record the bank's fees, interest, bounced checks and any of your own errors. When both adjusted balances match, you're reconciled.",
    examples: "Example: a $8,450 statement balance + $1,200 in transit − $1,575 of outstanding checks = $8,075. Books of $8,125 + $15 interest − $25 fees − a $40 recording error also give $8,075 — reconciled.",
    assumptions: "Only the book-side adjustments need journal entries; bank-side items clear on their own. A transposition error shows up as a difference divisible by 9.",
    faq: [
      { question: "How often should I reconcile?", answer: "Every month when the statement arrives — catching errors and fraud early is the point." },
      { question: "What if the difference isn't zero?", answer: "Look for missing entries, amounts typed twice, transposed digits (differences divisible by 9) and items recorded in the wrong month." },
    ],
  },
  {
    slug: "gold-melt-calculator",
    category: ALTERNATIVE_INVESTMENT_CATEGORY,
    title: "Gold Melt Calculator",
    description: "Calculate the melt value of gold jewelry or scrap gold from its weight and karat at today's spot price, and what a buyer is likely to pay.",
    metaTitle: "Gold Melt Calculator — Scrap Gold Value by Karat",
    metaDescription: "Free gold melt value calculator. Enter weight in grams, troy ounces or pennyweights and the karat (10k–24k) to get scrap gold value at the spot price.",
    calcInputs: [numberField("weight", "Weight", { default: 20, max: 1000000, step: 0.01 }), WEIGHT_UNIT, dropdown("karat", "Purity", [["24k (99.9%)", 24], ["22k (91.67%)", 22], ["18k (75%)", 18], ["14k (58.5%)", 14], ["10k (41.7%)", 10], ["9k (37.5%)", 9]], 14), currencyField("spotPricePerOz", "Gold Spot Price per Troy Ounce (today)", { default: 4000, max: 1000000, step: 1 }), percentField("payoutPercent", "Buyer Payout (% of melt value)", { default: 80, step: 1 })],
    calcResult: { label: "Melt Value", format: "currency" },
    calcResults: [num("fineGoldGrams", "Pure Gold (grams)", false, 4), num("fineGoldTroyOz", "Pure Gold (troy oz)", false, 4), cur("meltValue", "Melt Value", true), cur("expectedOffer", "Expected Buyer Offer"), cur("valuePerGram", "Value per Gram of Item")],
    instructions: "Weigh the item (a kitchen scale in grams is fine) and find the karat stamp (10K, 14K, 585, 750…). Enter today's gold spot price from a live quote. Refiners and pawn shops pay a percentage of melt value — compare offers.",
    examples: "Example: 20 grams of 14k gold contains 11.7 g of pure gold (0.376 troy oz). At $4,000 an ounce that's $1,504.65 of melt value; a buyer paying 80% offers about $1,204.",
    assumptions: "Purity by karat: 24k .999, 22k .9167, 18k .750, 14k .585, 10k .417, 9k .375. 1 troy oz = 31.1035 g; 1 dwt = 1.555 g. Stones, clasps and solder reduce the gold weight; collectible or designer pieces can be worth more than melt.",
    faq: [
      { question: "How much do gold buyers pay?", answer: "Typically 70–90% of melt value for scrap; online refiners often pay more than pawn shops." },
      { question: "Is a troy ounce the same as a regular ounce?", answer: "No — a troy ounce is 31.1 g, about 10% heavier than a regular (avoirdupois) ounce of 28.35 g." },
    ],
  },
  {
    slug: "silver-melt-calculator",
    category: ALTERNATIVE_INVESTMENT_CATEGORY,
    title: "Silver Melt Calculator",
    description: "Calculate the melt value of silver coins, sterling silver or scrap silver — by weight and purity or by the face value of 90% US silver coins.",
    metaTitle: "Silver Melt Calculator — Coin & Scrap Silver Value",
    metaDescription: "Free silver melt value calculator. Price sterling, .999 bullion, 90% coin silver and 40% halves by weight, or junk silver coins by face value, at spot.",
    calcInputs: [dropdown("mode", "Calculate By", [["Weight and purity", 1], ["Face value of 90% US coins (pre-1965)", 2]], 1), numberField("weight", "Weight", { default: 100, max: 10000000, step: 0.01, required: false }), WEIGHT_UNIT, dropdown("purity", "Purity", [[".999 fine silver", 1], [".925 sterling", 2], [".900 US coin silver", 3], [".800 silver", 4], [".400 (1965–70 Kennedy halves)", 5]], 2), currencyField("faceValue", "Face Value of 90% Coins", { default: 10, max: 10000000, step: 0.05, required: false }), currencyField("spotPricePerOz", "Silver Spot Price per Troy Ounce (today)", { default: 50, max: 100000, step: 0.01 }), percentField("payoutPercent", "Buyer Payout (% of melt value)", { default: 85, step: 1 })],
    calcResult: { label: "Melt Value", format: "currency" },
    calcResults: [num("fineSilverTroyOz", "Pure Silver (troy oz)", false, 4), num("fineSilverGrams", "Pure Silver (grams)"), cur("meltValue", "Melt Value", true), cur("expectedOffer", "Expected Buyer Offer")],
    instructions: "For jewelry, flatware or bars, enter the weight and purity. For pre-1965 US dimes, quarters and halves (\"junk silver\"), choose face value and add up the coins' face amount.",
    examples: "Example: 100 g of sterling silver holds 92.5 g of pure silver — 2.974 troy oz, worth $148.70 at $50 an ounce. $10 face value of 90% coins contains 7.15 oz.",
    assumptions: "$1 face value of 90% US dimes, quarters or halves contains about 0.715 troy oz of silver (allowing for wear). Silverplate contains almost no silver. 1 troy oz = 31.1035 g.",
    faq: [
      { question: "Which US coins are silver?", answer: "Dimes, quarters and half dollars dated 1964 or earlier are 90% silver; Kennedy halves from 1965–70 are 40%." },
      { question: "How can I tell if something is sterling?", answer: "Look for a \"925\", \"Sterling\" or \"Ster\" stamp; silver isn't magnetic." },
    ],
  },
  {
    slug: "lottery-payout-calculator",
    category: TAX_CATEGORY,
    title: "Lottery Payout Calculator",
    description: "Calculate a Powerball or Mega Millions jackpot payout — the lump-sum cash option and the 30-payment annuity — after federal and state taxes.",
    metaTitle: "Lottery Payout Calculator — Powerball & Mega Millions",
    metaDescription: "Free lottery payout calculator. Compare a Powerball or Mega Millions jackpot's cash option with the 30-year annuity after 2026 federal and state taxes.",
    calcInputs: [currencyField("advertisedJackpot", "Advertised Jackpot (annuity value)", { default: 500000000, max: 100000000000, step: 1000000 }), percentField("cashOptionPercent", "Cash Option (% of jackpot)", { default: 45, step: 0.5 }), percentField("stateTaxRate", "State Tax on Lottery Winnings", { default: 5, max: 15, step: 0.01 })],
    calcResult: { label: "Cash after Tax", format: "currency" },
    calcResults: [cur("cashOption", "Cash Option (before tax)"), cur("cashAfterTax", "Cash Option after Tax", true), cur("federalWithholdingOnCash", "Federal Withholding at 24%"), cur("firstAnnuityPayment", "First Annuity Payment"), cur("firstAnnuityAfterTax", "First Payment after Tax"), cur("lastAnnuityPayment", "Final (30th) Payment"), cur("totalAnnuityAfterTax", "Total Annuity after Tax")],
    instructions: "Enter the advertised jackpot and the cash option (the lottery announces it with each jackpot — usually 45–50%). Advertised jackpots are the annuity's total: one payment now and 29 more over 29 years, each 5% bigger than the last.",
    examples: "Example: a $500 million jackpot with a 45% cash option is $225 million before tax, about $130.5 million after federal and 5% state tax. The annuity starts at $7.53 million ($4.41 million after tax) and pays about $291 million after tax in total.",
    assumptions: "Powerball and Mega Millions annuities: 30 payments rising 5% a year. Taxes use 2026 single-filer federal brackets (each payment taxed alone, brackets not indexed) plus a flat state rate; withholding is 24% federal, with the rest owed at filing. Lottery odds are extremely long — play for fun. " + DISCLAIMER,
    faq: [
      { question: "Lump sum or annuity?", answer: "The lump sum lets you invest now and avoids future tax-rate risk; the annuity protects against overspending and pays more in total." },
      { question: "Why is the cash option so much smaller?", answer: "It's the money the lottery actually has today — the amount it would invest to fund the 30-year annuity." },
    ],
  },
  {
    slug: "stimulus-check-calculator",
    category: TAX_CATEGORY,
    title: "Stimulus Check Calculator",
    description: "Calculate the amount of each 2020–2021 federal stimulus check (Economic Impact Payments 1, 2 and 3) for your filing status, income and children.",
    metaTitle: "Stimulus Check Calculator — EIP 1, 2 & 3 Amounts",
    metaDescription: "Free stimulus check calculator. Find what the first ($1,200), second ($600) and third ($1,400) Economic Impact Payments paid for your income and family.",
    calcInputs: [dropdown("round", "Stimulus Payment", [["Third — American Rescue Plan ($1,400, 2021)", 3], ["Second — December 2020 relief bill ($600)", 2], ["First — CARES Act ($1,200, 2020)", 1]], 3), dropdown("filingStatus", "Filing Status", [["Single", 1], ["Married filing jointly", 2], ["Head of household", 3]], 2), currencyField("agi", "Adjusted Gross Income", { default: 90000, max: 100000000, step: 100 }), numberField("childrenUnder17", "Children Under 17", { default: 2, max: 20 }), numberField("otherDependents", "Other Dependents (third payment only)", { default: 0, max: 20, required: false })],
    calcResult: { label: "Payment", format: "currency" },
    calcResults: [cur("fullAmount", "Full Amount"), cur("phaseOutReduction", "Phase-Out Reduction"), cur("estimatedPayment", "Estimated Payment", true)],
    instructions: "Choose the payment and enter the AGI from the tax return the IRS used (2018 or 2019 for the first, 2019 for the second, 2019 or 2020 for the third) and your dependants.",
    examples: "Example: a married couple with two children and $90,000 AGI received $5,600 from the third payment, $2,400 from the second and $3,400 from the first.",
    assumptions: "First: $1,200 per adult + $500 per child under 17, reduced 5% of AGI over $75,000 / $150,000 / $112,500. Second: $600 per adult and child, same phase-out. Third: $1,400 per person including all dependants, phased out evenly over $75–80k / $150–160k / $112.5–120k. Missed payments could be claimed as the Recovery Rebate Credit; the deadlines (May 2024 for 2020, April 2025 for 2021) have passed. Proposed packages (HEROES, HEALS, CASH Act) were never enacted.",
    faq: [
      { question: "Can I still claim a missed stimulus check?", answer: "No — the last chance to claim the 2021 Recovery Rebate Credit was April 15, 2025." },
      { question: "Is there a new stimulus check in 2026?", answer: "No federal stimulus checks have been enacted; be wary of scams claiming otherwise." },
    ],
  },
  {
    slug: "trump-accounts-calculator",
    category: SAVINGS_CATEGORY,
    title: "Trump Accounts Calculator",
    description: "Project a child's Trump Account balance at age 18 — the $1,000 federal pilot deposit for babies born 2025–2028, family and employer contributions, and investment growth.",
    metaTitle: "Trump Accounts Calculator — Child Account at 18",
    metaDescription: "Free Trump Account calculator. See what a child's account could grow to by 18 with the $1,000 pilot deposit and up to $5,000 a year of contributions.",
    calcInputs: [numberField("birthYear", "Child's Birth Year", { default: 2025, min: 2008, max: 2030 }), numberField("childAge", "Child's Age Now", { default: 1, max: 17 }), currencyField("currentBalance", "Current Balance (optional)", { default: 0, max: 1000000, step: 10, required: false }), currencyField("yearlyFamilyContribution", "Yearly Family Contribution", { default: 2000, max: 5000, step: 50 }), currencyField("yearlyEmployerContribution", "Yearly Employer Contribution (max $2,500)", { default: 500, max: 2500, step: 50, required: false }), percentField("expectedReturn", "Expected Yearly Return", { default: 7, max: 20, step: 0.1 }), percentField("expenseRatio", "Fund Expense Ratio", { default: 0.05, max: 0.1, step: 0.01, required: false })],
    calcResult: { label: "Value at 18", format: "currency" },
    calcResults: [cur("pilotDeposit", "Federal Pilot Deposit"), cur("yearlyContribution", "Yearly Contributions (capped at $5,000)"), cur("valueAt18", "Value at Age 18", true), cur("totalContributed", "Total Put In"), cur("investmentGrowth", "Investment Growth"), num("yearsOfGrowth", "Years of Growth")],
    instructions: "Enter the child's birth year and age, and how much the family and an employer will add each year. US-citizen children born from 2025 through 2028 get a one-time $1,000 Treasury deposit.",
    examples: "Example: a baby born in 2025 with the $1,000 pilot deposit, $2,000 a year from family and $500 from an employer for 17 years at 7% could have about $85,224 at 18 — $43,500 put in and $41,724 of growth.",
    assumptions: "Created by the One Big Beautiful Bill Act (2025). Contributions from 4 July 2026; up to $5,000 a year in total (2026–2027, then inflation-indexed), with employer contributions up to $2,500 per employee excluded from income; the pilot deposit doesn't count toward the cap. Money must be invested in low-cost US equity index funds (fees ≤ 0.1%) until 18, then the account follows traditional IRA rules. Treasury/IRS rules were still being finalised in 2026. " + DISCLAIMER,
    faq: [
      { question: "Who can open a Trump Account?", answer: "A parent or guardian for any child under 18 with a Social Security number; the $1,000 deposit is only for US citizens born 2025–2028." },
      { question: "When can the money be used?", answer: "Not before 18. After that, withdrawals follow IRA rules — penalty-free for education, a first home (up to $10,000) and other exceptions." },
    ],
  },
  {
    slug: "credit-utilization-calculator",
    category: CREDIT_DEBT_CATEGORY,
    title: "Credit Utilization Calculator",
    description: "Calculate your credit utilization ratio across up to five credit cards — overall and on your highest card — and how much to pay down to get under 30% or 10%.",
    metaTitle: "Credit Utilization Calculator — Ratio & Pay-Down Target",
    metaDescription: "Free credit utilization calculator. Add your card balances and limits to see your utilization ratio and the pay-down needed to reach 30% or 10%.",
    calcInputs: Array.from({ length: 5 }, (_, i) => [
      currencyField(`balance${i + 1}`, `Card ${i + 1} — Balance`, { default: [1800, 2400, 300, 0, 0][i], max: 10000000, step: 10, required: false }),
      currencyField(`limit${i + 1}`, `Card ${i + 1} — Credit Limit`, { default: [5000, 4000, 6000, 0, 0][i], max: 10000000, step: 100, required: false }),
    ]).flat(),
    calcResult: { label: "Utilization", format: "percentage" },
    calcResults: [cur("totalBalance", "Total Balances"), cur("totalLimit", "Total Credit Limits"), pct("overallUtilization", "Overall Utilization", true), pct("highestCardUtilization", "Highest Single-Card Utilization"), cur("payDownFor30", "Pay Down to Reach 30%"), cur("payDownFor10", "Pay Down to Reach 10%")],
    instructions: "Enter the balance on each card as it appears on the statement (that's what's reported to the credit bureaus) and its credit limit.",
    examples: "Example: $4,500 owed on $15,000 of limits is 30% utilization overall, but one card is at 60%. Paying $3,000 would bring you to 10%.",
    assumptions: "Utilization = balances ÷ limits. Scoring models look at both overall and per-card utilization; under 30% is good and under 10% is best. It has no memory — paying down improves your score as soon as new balances are reported.",
    faq: [
      { question: "Does paying in full each month mean 0% utilization?", answer: "Not necessarily — the statement balance is reported before you pay, so pay before the statement date to lower it." },
      { question: "Should I close old cards?", answer: "Closing a card removes its limit and can raise your utilization; keeping it open (and unused) usually helps." },
    ],
  },
];

// Every sub-category here hangs directly under Finance Calculators and is
// created on first use.
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
  if (!finance) throw new Error(`The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first.`);
  console.log(`Creating sub-category "${cat.name}" under "${finance.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const category = await ensureCategory(def.category);
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
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
