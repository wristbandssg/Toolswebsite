// One-time (but safe to re-run) batch setup script: creates the 7 tools of
// finance expansion 3 sub-batch "property". See
// src/lib/calc-engine-fin3-derivatives-tax.ts for the full list of 10
// sub-batches, and src/lib/calc-engine-fin3-property.ts for the math. Each tool
// is filed in the Finance Calculators sub-category the user named for it
// (created on first run; Retirement Calculators already exists).
//
// HOW TO RUN
//   npx tsx prisma/create-fin3-property-calculators.ts
// or
//   npm run db:create-fin3-property-calculators

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

const gbp = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", currency: "GBP", ...(highlight ? { highlight: true } : {}) });

const TOOLS: ToolDef[] = [
  {
    slug: "affo-calculator",
    category: REAL_ESTATE_CATEGORY,
    title: "AFFO Calculator",
    description: "Calculate a REIT's funds from operations (FFO) and adjusted funds from operations (AFFO) — totals, per share, dividend payout ratio and price-to-FFO.",
    metaTitle: "AFFO Calculator — FFO & AFFO for REITs",
    metaDescription: "Free FFO and AFFO calculator for REITs. Add back depreciation, remove property-sale gains, subtract maintenance capex and get per-share figures and payout.",
    calcInputs: [numberField("netIncome", "Net Income", { unit: "$", default: 120000000, min: -100000000000, max: 100000000000 }), currencyField("depreciationAmortization", "Real Estate Depreciation & Amortization", { default: 90000000, max: 100000000000 }), numberField("gainsOnSales", "Gains on Property Sales (losses negative)", { unit: "$", default: 15000000, min: -100000000000, max: 100000000000 }), currencyField("impairments", "Impairment Write-Downs", { default: 0, max: 100000000000, required: false }), currencyField("recurringCapex", "Recurring (Maintenance) Capex", { default: 25000000, max: 100000000000 }), numberField("straightLineRent", "Straight-Line Rent Adjustment", { unit: "$", default: 5000000, min: -100000000000, max: 100000000000, required: false }), numberField("sharesOutstanding", "Shares Outstanding", { default: 100000000, min: 1, max: 100000000000 }), currencyField("dividendPerShare", "Dividend per Share", { default: 1.5, max: 100000, step: 0.01, required: false }), currencyField("sharePrice", "Share Price (optional)", { default: 0, max: 1000000, step: 0.01, required: false })],
    calcResult: { label: "AFFO", format: "currency" },
    calcResults: [cur("ffo", "Funds from Operations (FFO)"), cur("affo", "Adjusted FFO (AFFO)", true), cur("ffoPerShare", "FFO per Share"), cur("affoPerShare", "AFFO per Share"), pct("affoPayoutRatio", "Dividend Payout (% of AFFO)"), num("priceToFfo", "Price ÷ FFO")],
    instructions: "Take net income, real estate depreciation and gains on property sales from the REIT's income statement to get FFO (Nareit definition). AFFO then subtracts the capex needed to keep properties competitive and the non-cash straight-line rent adjustment — closer to the cash available for dividends.",
    examples: "Example: $120M net income + $90M depreciation − $15M of sale gains = $195M FFO ($1.95 a share). Less $25M of maintenance capex and $5M of straight-line rent, AFFO is $165M ($1.65), so a $1.50 dividend is 91% of AFFO.",
    assumptions: "FFO follows Nareit's definition; AFFO has no standard definition, so companies' figures differ. REITs are valued on P/FFO the way other stocks use P/E. " + DISCLAIMER,
    faq: [
      { question: "Why do REITs use FFO instead of earnings?", answer: "Real estate depreciation is a large non-cash expense even though properties often hold or gain value, so net income understates cash flow." },
      { question: "What is a safe AFFO payout ratio?", answer: "Below about 85% leaves room to maintain the dividend; above 100% means it isn't covered." },
    ],
  },
  {
    slug: "commercial-lease-calculator",
    category: REAL_ESTATE_CATEGORY,
    title: "Commercial Lease Calculator",
    description: "Calculate the cost of a commercial lease — base rent per square foot, NNN charges (taxes, insurance, CAM), yearly escalations and free rent — monthly, yearly and over the term.",
    metaTitle: "Commercial Lease Calculator — NNN Rent per Sq Ft",
    metaDescription: "Free commercial lease calculator. Work out monthly rent and total lease cost from rent per sq ft, NNN charges, escalations, free months and TI allowance.",
    calcInputs: [numberField("squareFeet", "Rentable Square Feet", { default: 2500, min: 1, max: 10000000 }), currencyField("baseRentPerSqFt", "Base Rent per Sq Ft per Year", { default: 28, max: 10000, step: 0.25 }), dropdown("leaseType", "Lease Type", [["Triple net (NNN)", 2], ["Full-service gross", 1]], 2), currencyField("taxesPerSqFt", "Property Taxes per Sq Ft (NNN)", { default: 4, max: 1000, step: 0.25, required: false }), currencyField("insurancePerSqFt", "Insurance per Sq Ft (NNN)", { default: 1, max: 1000, step: 0.25, required: false }), currencyField("camPerSqFt", "CAM per Sq Ft (NNN)", { default: 3, max: 1000, step: 0.25, required: false }), percentField("annualEscalation", "Yearly Rent Increase", { default: 3, max: 20, step: 0.1 }), numberField("termYears", "Lease Term (years)", { default: 5, min: 1, max: 50 }), numberField("freeRentMonths", "Free Rent Months", { default: 2, max: 12, required: false }), currencyField("tenantImprovementAllowance", "TI Allowance from Landlord", { default: 0, max: 100000000, step: 100, required: false })],
    calcResult: { label: "Year-1 Monthly Rent", format: "currency" },
    calcResults: [cur("firstYearMonthlyRent", "Year-1 Monthly Rent (incl. NNN)", true), cur("firstYearAnnualRent", "Year-1 Annual Rent"), cur("totalBaseRent", "Total Base Rent (after free months)"), cur("totalNnnCharges", "Total NNN Charges"), cur("totalLeaseCost", "Total Lease Cost"), cur("effectiveRentPerSqFtYear", "Effective Cost per Sq Ft per Year")],
    instructions: "Commercial rent is quoted per square foot per year. In a triple-net lease you also pay your share of property taxes, insurance and common-area maintenance (CAM); in a gross lease these are included in the rent.",
    examples: "Example: 2,500 sq ft at $28 NNN plus $8 of NNN charges costs $7,500 a month in year 1. Over 5 years with 3% increases and 2 free months, the lease costs about $459,973 — $36.80 per sq ft a year.",
    assumptions: "Escalations apply to base rent yearly; NNN charges are held flat (in practice they're reconciled each year). Free rent is taken in the first year. " + DISCLAIMER,
    faq: [
      { question: "What does $28/SF NNN mean?", answer: "$28 per square foot per year of base rent, plus your share of taxes, insurance and CAM on top." },
      { question: "How do I convert rent per square foot to monthly rent?", answer: "Multiply the annual rate by the square feet and divide by 12." },
    ],
  },
  {
    slug: "net-effective-rent-calculator",
    category: REAL_ESTATE_CATEGORY,
    title: "Net Effective Rent Calculator",
    description: "Calculate net effective rent — the real monthly rent after free months and other concessions — and the discount from the advertised rent.",
    metaTitle: "Net Effective Rent Calculator — Rent After Concessions",
    metaDescription: "Free net effective rent calculator. Spread free months and other concessions over the lease to find the true monthly rent and effective discount.",
    calcInputs: [currencyField("monthlyRent", "Gross Monthly Rent", { default: 3000, max: 10000000, step: 10 }), numberField("leaseMonths", "Lease Term (months)", { default: 12, min: 1, max: 240 }), numberField("freeMonths", "Free Months", { default: 1, max: 24, step: 0.5 }), currencyField("otherConcessions", "Other Concessions (gift cards, fee waivers)", { default: 0, max: 10000000, step: 10, required: false })],
    calcResult: { label: "Net Effective Rent", format: "currency" },
    calcResults: [cur("grossRentOverLease", "Gross Rent over the Lease"), cur("totalConcessions", "Total Concessions"), cur("netEffectiveRent", "Net Effective Monthly Rent", true), pct("effectiveDiscount", "Effective Discount")],
    instructions: "Enter the advertised (gross) rent, lease length and concessions. Listings in New York and other big cities often show net effective rent — make sure you know which one your lease says you'll pay each month.",
    examples: "Example: $3,000 a month on a 12-month lease with one month free is a net effective rent of $2,750 — an 8.33% discount. You still pay $3,000 in each of the other 11 months.",
    assumptions: "Net effective rent = (gross rent × term − concessions) ÷ term. Renewal increases are usually based on the gross rent, not the net effective figure.",
    faq: [
      { question: "Why do landlords offer free months instead of lower rent?", answer: "It keeps the official (gross) rent higher, which supports building values and future increases." },
      { question: "Is net effective rent what I pay each month?", answer: "Not usually — you pay gross rent and get the free month(s) at the start or end of the lease." },
    ],
  },
  {
    slug: "occupancy-rate-calculator",
    category: REAL_ESTATE_CATEGORY,
    title: "Occupancy Rate Calculator",
    description: "Calculate the occupancy rate of a hotel, rental portfolio or vacation rental, plus ADR (average daily rate) and RevPAR (revenue per available room).",
    metaTitle: "Occupancy Rate Calculator — Occupancy, ADR & RevPAR",
    metaDescription: "Free occupancy rate calculator. Get occupancy %, average daily rate (ADR) and RevPAR for hotels and rentals from rooms, nights sold and revenue.",
    calcInputs: [numberField("unitsAvailable", "Rooms / Units Available", { default: 120, min: 1, max: 1000000 }), numberField("daysInPeriod", "Days in the Period", { default: 30, min: 1, max: 366 }), numberField("unitNightsSold", "Room-Nights Sold (occupied)", { default: 2700, max: 100000000 }), currencyField("roomRevenue", "Room Revenue (optional)", { default: 391500, max: 10000000000, step: 1, required: false })],
    calcResult: { label: "Occupancy Rate", format: "percentage" },
    calcResults: [num("availableUnitNights", "Available Room-Nights"), pct("occupancyRate", "Occupancy Rate", true), cur("adr", "Average Daily Rate (ADR)"), cur("revpar", "RevPAR"), num("vacantUnitNights", "Vacant Room-Nights")],
    instructions: "Enter the rooms or units you have, the days in the period, how many room-nights were occupied and the revenue they earned. For long-term rentals use units and months instead — the occupancy formula is the same.",
    examples: "Example: a 120-room hotel selling 2,700 room-nights in a 30-day month is 75% occupied. $391,500 of room revenue is an ADR of $145 and RevPAR of $108.75.",
    assumptions: "Occupancy = occupied ÷ available; ADR = revenue ÷ occupied; RevPAR = revenue ÷ available = ADR × occupancy. US hotels averaged about 63% occupancy in 2024–2025. For a single Airbnb's break-even nights, use the Airbnb Occupancy Rate Calculator.",
    faq: [
      { question: "What is a good hotel occupancy rate?", answer: "Around 65–75% is healthy for most hotels; resorts and city hotels can run above 80% in peak season." },
      { question: "Why does RevPAR matter more than occupancy?", answer: "It combines price and occupancy — filling rooms by discounting heavily can lower RevPAR." },
    ],
  },
  {
    slug: "prorated-rent-calculator",
    category: REAL_ESTATE_CATEGORY,
    title: "Prorated Rent Calculator",
    description: "Calculate prorated rent for a partial month when you move in or out mid-month — by days in the month, a 365-day year or a 30-day banker's month.",
    metaTitle: "Prorated Rent Calculator — Partial Month Rent",
    metaDescription: "Free prorated rent calculator. Work out rent for a mid-month move-in or move-out with the daily rate by days in the month, 365-day or 30-day method.",
    calcInputs: [currencyField("monthlyRent", "Monthly Rent", { default: 1800, max: 10000000, step: 1 }), numberField("daysInMonth", "Days in the Month", { default: 31, min: 28, max: 31 }), numberField("moveInDay", "Move-In Day (first day you pay for)", { default: 20, min: 1, max: 31 }), dropdown("method", "Proration Method", [["Days in the month", 1], ["Yearly rent ÷ 365", 2], ["30-day banker's month", 3]], 1)],
    calcResult: { label: "Prorated Rent", format: "currency" },
    calcResults: [num("daysOccupied", "Days Charged"), cur("dailyRent", "Daily Rent"), cur("proratedRent", "Prorated Rent", true)],
    instructions: "Enter the monthly rent, the number of days in that month and the day you move in (the first day you're charged for). For a move-out, enter the day after your last day to charge for the days before it — or swap the logic: days charged = move-out day.",
    examples: "Example: moving in on the 20th of a 31-day month at $1,800 rent means paying for 12 days at $58.06 a day — $696.77.",
    assumptions: "Your lease decides the method; days-in-the-month is most common. Some landlords charge the full month or round to whole days.",
    faq: [
      { question: "Does a landlord have to prorate rent?", answer: "Not always — check your lease and local law. Many landlords prorate the first month as standard practice." },
      { question: "Which method gives the lowest prorated rent?", answer: "For 31-day months the 30-day method costs slightly more per day; in February it costs less." },
    ],
  },
  {
    slug: "rental-commission-calculator",
    category: REAL_ESTATE_CATEGORY,
    title: "Rental Commission Calculator",
    description: "Calculate a rental broker's fee or leasing commission — as a percentage of annual rent or a number of months' rent — and the agent's share after the split.",
    metaTitle: "Rental Commission Calculator — Broker & Leasing Fee",
    metaDescription: "Free rental commission calculator. Work out a leasing or apartment broker fee as a % of a year's rent or months of rent, plus the agent's split.",
    calcInputs: [currencyField("monthlyRent", "Monthly Rent", { default: 2500, max: 10000000, step: 10 }), numberField("leaseMonths", "Lease Term (months)", { default: 12, min: 1, max: 240 }), dropdown("feeBasis", "Fee Based On", [["% of total lease rent", 1], ["Months of rent", 2]], 1), numberField("feeRate", "Fee Rate (% or number of months)", { default: 15, max: 100, step: 0.5 }), percentField("agentSplit", "Agent's Share of the Fee", { default: 50, step: 1, required: false })],
    calcResult: { label: "Commission", format: "currency" },
    calcResults: [cur("totalLeaseValue", "Total Rent over the Lease"), cur("commission", "Commission / Broker Fee", true), cur("agentShare", "Agent's Share"), num("commissionAsMonthsOfRent", "Equivalent Months of Rent"), pct("commissionPctOfLease", "Fee as % of Lease Rent")],
    instructions: "Choose how the fee is quoted — a percentage of the rent over the lease (e.g. 15% of a year's rent) or a number of months' rent (e.g. one month) — and enter the rate.",
    examples: "Example: 15% of a 12-month lease at $2,500 a month is $4,500 — 1.8 months of rent. At a 50% split the agent keeps $2,250.",
    assumptions: "Since June 2025 New York City's FARE Act makes whoever hires the broker (usually the landlord) pay the fee. Commercial leasing commissions are often 4–6% of the total lease value.",
    faq: [
      { question: "How much is a typical broker fee for an apartment?", answer: "One month's rent or 10–15% of a year's rent in markets where tenants still pay it." },
      { question: "Who pays the rental commission?", answer: "It depends on local law and the agreement — landlords pay in most US markets and now in NYC under the FARE Act." },
    ],
  },
  {
    slug: "realtor-commission-calculator-with-vat",
    category: REAL_ESTATE_CATEGORY,
    title: "Realtor Commission Calculator with VAT",
    description: "Calculate an estate agent's or realtor's fee including VAT — commission before and after VAT, the effective rate and what you're left with from the sale.",
    metaTitle: "Estate Agent Fee Calculator with VAT — Realtor Commission",
    metaDescription: "Free estate agent fee calculator with VAT. Work out a realtor's commission plus 20% VAT (or any rate), the effective fee and your net sale proceeds.",
    calcInputs: [currencyField("salePrice", "Sale Price", { default: 350000, max: 10000000000, step: 100 }), percentField("commissionRate", "Commission Rate (before VAT)", { default: 1.5, max: 20, step: 0.01 }), percentField("vatRate", "VAT Rate", { default: 20, max: 30, step: 0.5 }), currencyField("fixedFees", "Fixed Fees (marketing, admin, before VAT)", { default: 0, max: 1000000, step: 10, required: false })],
    calcResult: { label: "Fee incl. VAT", format: "currency", currency: "GBP" },
    calcResults: [gbp("commissionExVat", "Commission before VAT"), gbp("vatAmount", "VAT"), gbp("totalFeeIncVat", "Total Fee incl. VAT", true), pct("effectiveRateIncVat", "Effective Rate incl. VAT"), gbp("sellerNetAfterFee", "Sale Price after the Fee")],
    instructions: "Enter the sale price, the agent's commission rate and the VAT rate. In the UK estate agents' fees attract 20% VAT; check whether your quote is \"plus VAT\" or \"including VAT\".",
    examples: "Example: a 1.5% + VAT fee on a £350,000 sale is £5,250 plus £1,050 VAT — £6,300 in total, an effective 1.8%.",
    assumptions: "VAT applies to the commission and any fixed fees. UK sole agency fees typically run 1–1.5% + VAT; multi-agency 2–3% + VAT. For US commission splits between brokerages, use the Real Estate Commission Calculator. " + DISCLAIMER,
    faq: [
      { question: "Do estate agents charge VAT?", answer: "Yes, VAT-registered agents must add 20% VAT in the UK, so a 1% fee is really 1.2%." },
      { question: "Is the fee paid on completion?", answer: "Usually — it's deducted from the sale proceeds by your solicitor when the sale completes." },
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
