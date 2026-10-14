// One-time (but safe to re-run) batch setup script: creates the 6 tools of
// finance expansion 3 sub-batch "homebuying". See
// src/lib/calc-engine-fin3-derivatives-tax.ts for the full list of 10
// sub-batches, and src/lib/calc-engine-fin3-homebuying.ts for the math. Each tool
// is filed in the Finance Calculators sub-category the user named for it
// (created on first run; Retirement Calculators already exists).
//
// HOW TO RUN
//   npx tsx prisma/create-fin3-homebuying-calculators.ts
// or
//   npm run db:create-fin3-homebuying-calculators

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
const REAL_ESTATE_CATEGORY = { name: "Real Estate Calculators", slug: "real-estate-calculators" };
const REFINANCE_HOME_EQUITY_CATEGORY = { name: "Refinance & Home Equity Calculators", slug: "refinance-home-equity-calculators" };
const MORTGAGE_PAYMENT_TYPE_CATEGORY = { name: "Mortgage Payment & Type Calculators", slug: "mortgage-payment-type-calculators" };
const HOME_BUYER_PROGRAM_CATEGORY = { name: "Home Buyer Program Calculators", slug: "home-buyer-program-calculators" };

const php = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", currency: "PHP", ...(highlight ? { highlight: true } : {}) });

const TOOLS: ToolDef[] = [
  {
    slug: "earnest-money-calculator",
    category: REAL_ESTATE_CATEGORY,
    title: "Earnest Money Calculator",
    description: "Calculate the earnest money deposit for a home offer, and how much cash you'll still need at closing after it's credited toward your down payment and closing costs.",
    metaTitle: "Earnest Money Calculator — Deposit & Cash to Close",
    metaDescription: "Free earnest money calculator. Find a typical 1–3% good-faith deposit for your offer and the cash still due at closing after it's credited.",
    calcInputs: [currencyField("purchasePrice", "Purchase Price", { default: 400000, max: 1000000000, step: 1000 }), percentField("earnestPercent", "Earnest Money (% of price)", { default: 2, max: 20, step: 0.1 }), percentField("downPaymentPercent", "Down Payment", { default: 10, step: 0.5 }), percentField("closingCostPercent", "Closing Costs", { default: 3, max: 15, step: 0.1 })],
    calcResult: { label: "Earnest Money", format: "currency" },
    calcResults: [cur("earnestMoney", "Earnest Money Deposit", true), cur("downPayment", "Down Payment"), cur("closingCosts", "Closing Costs"), cur("totalCashToClose", "Total Cash Needed"), cur("remainingAfterEarnest", "Still Due at Closing")],
    instructions: "Enter the offer price and the earnest money percentage your agent recommends. It's held in escrow and credited toward your down payment and closing costs at closing.",
    examples: "Example: 2% earnest money on a $400,000 offer is $8,000. With 10% down and 3% closing costs you need $52,000 in total, so $44,000 is still due at closing.",
    assumptions: "Earnest money is typically 1–3% of the price (up to 5–10% in hot markets or for new construction). You can lose it if you back out for a reason not covered by your contract's contingencies.",
    faq: [
      { question: "Do I get earnest money back?", answer: "Yes if the deal fails under a contingency (inspection, financing, appraisal); otherwise the seller may keep it." },
      { question: "Is earnest money the same as a down payment?", answer: "No, but it's credited toward your down payment or closing costs when the sale closes." },
    ],
  },
  {
    slug: "gift-of-equity-calculator",
    category: REAL_ESTATE_CATEGORY,
    title: "Gift of Equity Calculator",
    description: "Calculate a gift of equity when buying a home from family below market value — the gift amount, how it covers your down payment, the loan and any gift-tax filing needed.",
    metaTitle: "Gift of Equity Calculator — Family Home Sale",
    metaDescription: "Free gift of equity calculator. See the equity gift, loan amount, down payment it covers and the part above the 2026 $19,000 gift-tax exclusion.",
    calcInputs: [currencyField("marketValue", "Appraised Market Value", { default: 400000, max: 1000000000, step: 1000 }), currencyField("salePrice", "Price Paid by the Family Buyer", { default: 320000, max: 1000000000, step: 1000 }), percentField("loanToValue", "Loan-to-Value the Lender Allows", { default: 80, step: 1 }), numberField("donors", "Number of Donors (sellers)", { default: 2, min: 1, max: 10 }), numberField("recipients", "Number of Recipients (buyers)", { default: 2, min: 1, max: 10 })],
    calcResult: { label: "Gift of Equity", format: "currency" },
    calcResults: [cur("giftOfEquity", "Gift of Equity", true), pct("giftPctOfValue", "Gift as % of Value"), cur("loanAmount", "Loan Amount"), cur("buyerCashNeeded", "Buyer Cash for Down Payment"), cur("equityAtPurchase", "Buyer's Equity at Purchase"), cur("annualExclusionCovered", "Covered by Annual Exclusions"), cur("giftAboveExclusion", "Gift Above Exclusions (Form 709)")],
    instructions: "Enter the appraised value, the price the family member is selling for, and the loan-to-value your lender allows. The difference is the gift of equity, which most lenders accept as the down payment.",
    examples: "Example: parents sell a $400,000 home to their child and spouse for $320,000. The $80,000 gift covers the full 20% down payment on an 80% loan. Two donors to two recipients can exclude $76,000 in 2026; the $4,000 excess needs a gift tax return but no tax.",
    assumptions: "2026 gift-tax annual exclusion $19,000 per donor per recipient; amounts above it use the lifetime exemption ($15 million per person in 2026), so tax is rarely due. The buyer's tax basis is the price paid plus part of the seller's basis. " + DISCLAIMER,
    faq: [
      { question: "Can a gift of equity be my down payment?", answer: "Yes — conventional, FHA, VA and USDA loans accept a gift of equity from a family member with a signed gift letter." },
      { question: "Does the seller owe tax on a gift of equity?", answer: "Rarely — the gift may require Form 709, but tax is only owed after the lifetime exemption is used up." },
    ],
  },
  {
    slug: "mortgage-penalty-calculator",
    category: REFINANCE_HOME_EQUITY_CATEGORY,
    title: "Mortgage Penalty Calculator",
    description: "Estimate a mortgage prepayment penalty for breaking your mortgage early — three months' interest, the interest rate differential (IRD) or a percentage of the balance.",
    metaTitle: "Mortgage Penalty Calculator — IRD & 3 Months' Interest",
    metaDescription: "Free mortgage penalty calculator. Estimate the cost of breaking a fixed mortgage early: 3 months' interest, interest rate differential (IRD) or % of balance.",
    calcInputs: [currencyField("balance", "Mortgage Balance", { default: 300000, max: 100000000, step: 1000 }), percentField("contractRate", "Your Mortgage Rate", { default: 5.5, max: 30, step: 0.01 }), percentField("comparableRate", "Lender's Current Rate for Your Remaining Term", { default: 4.2, max: 30, step: 0.01 }), numberField("monthsRemaining", "Months Left in the Term", { default: 30, max: 600 }), dropdown("method", "Penalty Type", [["Fixed rate (Canada): greater of 3 months or IRD", 1], ["Three months' interest (variable rate)", 2], ["% of balance (US prepayment penalty)", 3]], 1), percentField("percentOfBalance", "Penalty % of Balance (if applicable)", { default: 2, max: 10, step: 0.1, required: false })],
    calcResult: { label: "Penalty", format: "currency" },
    calcResults: [cur("threeMonthsInterest", "Three Months' Interest"), cur("interestRateDifferential", "Interest Rate Differential (IRD)"), cur("percentOfBalancePenalty", "% of Balance Penalty"), cur("penalty", "Estimated Penalty", true), pct("penaltyPctOfBalance", "Penalty as % of Balance")],
    instructions: "Enter your balance, your rate, the rate your lender now offers for a term similar to what's left on yours, and the months remaining. Canadian fixed-rate mortgages usually charge the greater of three months' interest and the IRD.",
    examples: "Example: breaking a $300,000 mortgage at 5.5% with 30 months left when the comparable rate is 4.2% costs $4,125 under the 3-month rule but $9,750 under the IRD — so the penalty is $9,750.",
    assumptions: "Simple IRD = balance × (your rate − comparable rate) × years remaining; big banks often use posted rates and discounts that make the IRD larger. Most US mortgages have no prepayment penalty; where they do (some non-QM loans), it's usually 1–3% in the first few years. " + DISCLAIMER,
    faq: [
      { question: "When are mortgage penalties highest?", answer: "When rates have fallen since you locked in and there's a long time left in your term — that's when the IRD is large." },
      { question: "How can I avoid a mortgage penalty?", answer: "Use your yearly prepayment privileges, port the mortgage to a new home, or wait until renewal." },
    ],
  },
  {
    slug: "mortgage-rate-calculator",
    category: MORTGAGE_PAYMENT_TYPE_CATEGORY,
    title: "Mortgage Rate Calculator",
    description: "See how your mortgage rate changes your monthly payment — the payment at your rate and at ±0.5 and ±1 point — and find the rate behind a quoted payment.",
    metaTitle: "Mortgage Rate Calculator — Payment at Different Rates",
    metaDescription: "Free mortgage rate calculator. Compare your monthly payment at your rate and ±0.5%/±1%, total interest, and solve for the interest rate from a payment.",
    calcInputs: [currencyField("loanAmount", "Loan Amount", { default: 350000, max: 100000000, step: 1000 }), numberField("termYears", "Loan Term (years)", { default: 30, min: 1, max: 50 }), percentField("interestRate", "Interest Rate", { default: 6.5, max: 30, step: 0.01 }), currencyField("quotedPayment", "Quoted Monthly Payment (optional, to solve the rate)", { default: 0, max: 10000000, step: 0.01, required: false })],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [cur("monthlyPayment", "Monthly Payment (P&I)", true), cur("paymentMinus1", "Payment at 1 Point Lower"), cur("paymentMinusHalf", "Payment at 0.5 Point Lower"), cur("paymentPlusHalf", "Payment at 0.5 Point Higher"), cur("paymentPlus1", "Payment at 1 Point Higher"), cur("totalInterest", "Total Interest over the Loan"), { key: "impliedRate", label: "Rate Implied by the Quoted Payment", format: "percentage", decimals: 3 }],
    instructions: "Enter the loan amount, term and the rate you've been quoted to see the principal-and-interest payment, and how much it changes with each half point. Enter a payment from a lender's quote to work out the rate it implies.",
    examples: "Example: $350,000 over 30 years at 6.5% is $2,212.24 a month. At 5.5% it would be $1,987.26 — $225 less — and at 7.5% $2,447.25.",
    assumptions: "Fixed-rate, monthly payments, principal and interest only (taxes, insurance and PMI are extra — see the Mortgage Payment Calculator). Compare APRs, which include fees, as well as rates. " + DISCLAIMER,
    faq: [
      { question: "How much does 1% change a mortgage payment?", answer: "On a 30-year loan, about 6–7% of the payment per point at today's rate levels — over $200 a month on $350,000." },
      { question: "Should I buy points to lower my rate?", answer: "It pays off if you keep the loan beyond the break-even — see the Mortgage Points Calculator." },
    ],
  },
  {
    slug: "pag-ibig-housing-loan-calculator",
    category: HOME_BUYER_PROGRAM_CATEGORY,
    title: "Pag-IBIG Housing Loan Calculator",
    description: "Calculate your Pag-IBIG Fund housing loan monthly amortization, total interest, the income you need, the maximum loan for your salary and your age at maturity.",
    metaTitle: "Pag-IBIG Housing Loan Calculator — Monthly Amortization",
    metaDescription: "Free Pag-IBIG housing loan calculator. Estimate monthly amortization, required income, maximum loan and age at maturity for loans up to ₱6M over 30 years.",
    calcInputs: [{ key: "loanAmount", label: "Loan Amount (max ₱6,000,000)", type: "currency", unit: "PHP", required: true, default: 2000000, min: 0, max: 6000000, step: 1000 }, numberField("termYears", "Loan Term (years, up to 30)", { default: 30, min: 1, max: 30 }), dropdown("rateOption", "Interest Rate", [["5.75% — 1-year repricing", 1], ["6.25% — 3-year repricing", 2], ["3% — Affordable Housing Program", 3], ["Other (enter below)", 4]], 2), percentField("customRate", "Other Rate (5-, 10-year and longer repricing)", { default: 6.5, max: 20, step: 0.01, required: false }), { key: "grossMonthlyIncome", label: "Gross Monthly Income", type: "currency", unit: "PHP", required: true, default: 50000, min: 0, max: 100000000, step: 500 }, numberField("age", "Your Age Now", { default: 35, min: 18, max: 69 })],
    calcResult: { label: "Monthly Amortization", format: "currency", currency: "PHP" },
    calcResults: [pct("interestRateUsed", "Interest Rate Used"), php("monthlyAmortization", "Monthly Amortization", true), php("totalInterest", "Total Interest"), php("incomeRequired", "Gross Monthly Income Required"), php("maxLoanForIncome", "Maximum Loan for Your Income"), num("ageAtMaturity", "Age at Loan Maturity"), num("withinAgeLimit", "Within Age Limit of 70 (1 = yes)")],
    instructions: "Enter the amount you'll borrow, the term and the repricing period you'll choose. Pag-IBIG allows a monthly amortization of up to about 35% of gross monthly income, and the loan must be paid off by age 70.",
    examples: "Example: ₱2,000,000 over 30 years at 6.25% (3-year repricing) is ₱12,314 a month, needing about ₱35,184 of gross monthly income. On ₱50,000 a month you could borrow up to about ₱2.84 million.",
    assumptions: "Rates as published by Pag-IBIG Fund for 2025 (5.75% for 1-year, 6.25% for 3-year repricing; 3% for qualified low-income members under the Affordable Housing Program); longer repricing periods carry higher rates — check pagibigfund.gov.ph. Rates reset at each repricing date. Fire and MRI insurance premiums are extra. " + DISCLAIMER,
    faq: [
      { question: "What is the maximum Pag-IBIG housing loan?", answer: "₱6 million, subject to your capacity to pay, the property's appraised value and your age." },
      { question: "What does repricing mean?", answer: "The rate is fixed only for the period you choose (1, 3, 5, 10 years and so on), then reset to the prevailing rate." },
    ],
  },
  {
    slug: "what-to-offer-on-a-house-calculator",
    category: REAL_ESTATE_CATEGORY,
    title: "What To Offer On A House Calculator",
    description: "Get a suggested offer range for a house from comparable sales, needed repairs, how hot the market is and how long the home has been listed.",
    metaTitle: "What to Offer on a House Calculator — Offer Price Range",
    metaDescription: "Free what to offer on a house calculator. Estimate a smart offer range from comps, repairs, market conditions and days on market, versus the list price.",
    calcInputs: [currencyField("listPrice", "List Price", { default: 450000, max: 1000000000, step: 1000 }), currencyField("compsValue", "Value from Comparable Sales", { default: 440000, max: 1000000000, step: 1000 }), currencyField("repairCosts", "Repairs You'll Need to Make", { default: 5000, max: 100000000, step: 500, required: false }), numberField("daysOnMarket", "Days on Market", { default: 45, max: 3650 }), dropdown("marketType", "Market", [["Seller's market (bidding wars)", 1], ["Balanced", 2], ["Buyer's market", 3]], 2), currencyField("maxBudget", "Your Maximum Budget (optional)", { default: 0, max: 1000000000, step: 1000, required: false })],
    calcResult: { label: "Suggested Offer", format: "currency" },
    calcResults: [cur("estimatedValue", "Value after Repairs"), cur("suggestedOffer", "Suggested Offer", true), cur("offerLow", "Offer Range — Low"), cur("offerHigh", "Offer Range — High"), pct("offerVsListPct", "Offer vs List Price")],
    instructions: "Ask your agent for recent comparable sales to estimate value, subtract repairs you'll have to make, then choose the market type. Homes that have sat for 60+ days usually have more room to negotiate.",
    examples: "Example: a home listed at $450,000 with comps around $440,000 and $5,000 of repairs is worth about $435,000. In a balanced market after 45 days, a suggested offer is about $430,650 — 4.3% under list (range $422,037–$439,263).",
    assumptions: "A rule-of-thumb model: comparable value − repairs, adjusted +2% (seller's market), −1% (balanced) or −4% (buyer's market), and −2% after 60 days or −4% after 90 days on market (+1% under 10 days). It isn't an appraisal — local conditions, competing offers and terms matter. " + DISCLAIMER,
    faq: [
      { question: "Is it rude to offer below asking?", answer: "No — it's normal when comps or the home's condition support it. A well-reasoned offer with comps is taken seriously." },
      { question: "How much under asking should I offer?", answer: "Often 1–5% in a balanced market; in a seller's market expect to pay list price or more." },
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
