// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// finance expansion 2 sub-batch "web-saas". See
// src/lib/calc-engine-fin2-investing.ts for the full list of 9 sub-batches,
// and src/lib/calc-engine-fin2-web-saas.ts for the math. Each tool is filed in
// the Finance Calculators sub-category the user named for it (created on
// first run).
//
// HOW TO RUN
//   npx tsx prisma/create-fin2-web-saas-calculators.ts
// or
//   npm run db:create-fin2-web-saas-calculators

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


const BUSINESS_PLANNING = { name: "Business Planning Calculators", slug: "business-planning-calculators" };

const TOOLS: ToolDef[] = [
  {
    slug: "bounce-rate-calculator",
    category: BUSINESS_PLANNING,
    title: "Bounce Rate Calculator",
    description: "Calculate your website's bounce rate from single-page sessions, and the GA4 bounce rate and engagement rate from engaged sessions.",
    metaTitle: "Bounce Rate Calculator — UA & GA4 Bounce Rate",
    metaDescription: "Free bounce rate calculator. Get bounce rate from single-page sessions, or GA4 bounce rate and engagement rate from engaged sessions.",
    calcInputs: [numberField("sessions", "Total Sessions", { default: 5000, max: 10000000000 }), numberField("singlePageSessions", "Single-Page Sessions (bounces)", { default: 2100, max: 10000000000 }), numberField("engagedSessions", "Engaged Sessions (GA4, optional)", { default: 0, max: 10000000000, required: false })],
    calcResult: { label: "Bounce Rate", format: "percentage" },
    calcResults: [pct("bounceRate", "Bounce Rate (single-page)", true), pct("engagementRate", "GA4 Engagement Rate"), pct("ga4BounceRate", "GA4 Bounce Rate"), num("multiPageSessions", "Multi-Page Sessions")],
    instructions: "Enter sessions and the number that viewed only one page. In Google Analytics 4, a bounce is a session that wasn't \"engaged\" (under 10 seconds, one page and no conversion), so add engaged sessions to see GA4's version.",
    examples: "Example: 2,100 single-page sessions out of 5,000 is a 42% bounce rate. If 3,300 sessions were engaged, GA4 shows a 66% engagement rate and a 34% bounce rate.",
    assumptions: "Classic bounce rate = single-page sessions ÷ sessions; GA4 bounce rate = 1 − engagement rate. Typical bounce rates are 26–70% depending on the type of site; blogs and landing pages run higher.",
    faq: [
      { question: "What is a good bounce rate?", answer: "Around 25–55% for most business sites; 65–90% is normal for blogs and single-page content where readers get their answer and leave." },
      { question: "How do I lower my bounce rate?", answer: "Load pages faster, match the content to the search intent, and add clear links to related pages." },
    ],
  },
  {
    slug: "exit-rate-calculator",
    category: BUSINESS_PLANNING,
    title: "Exit Rate Calculator",
    description: "Calculate a page's exit rate — the share of its pageviews that were the last in the session — and compare it with its bounce rate.",
    metaTitle: "Exit Rate Calculator — Page Exit Rate vs Bounce Rate",
    metaDescription: "Free exit rate calculator. Divide exits by pageviews to get a page's exit rate, and compare it with its bounce rate to find leaky pages.",
    calcInputs: [numberField("pageviews", "Pageviews of the Page", { default: 8000, max: 10000000000 }), numberField("exits", "Exits from the Page", { default: 2400, max: 10000000000 }), numberField("entrances", "Entrances on the Page (optional)", { default: 0, max: 10000000000, required: false }), numberField("bounces", "Bounces on the Page (optional)", { default: 0, max: 10000000000, required: false })],
    calcResult: { label: "Exit Rate", format: "percentage" },
    calcResults: [pct("exitRate", "Exit Rate", true), pct("continuationRate", "Visitors Who Continued"), pct("bounceRate", "Bounce Rate (if entered)")],
    instructions: "Enter how many times the page was viewed and how many sessions ended on it. A high exit rate is normal on a thank-you or confirmation page, but a warning sign on a checkout or sign-up step.",
    examples: "Example: 2,400 exits from 8,000 pageviews is a 30% exit rate — 70% of views led somewhere else on the site.",
    assumptions: "Exit rate = exits ÷ pageviews. Bounce rate = bounces ÷ entrances, which only counts sessions that started on the page.",
    faq: [
      { question: "What's the difference between exit rate and bounce rate?", answer: "Exit rate counts every visit that ended on a page; bounce rate only counts visits that started and ended there with no other page viewed." },
      { question: "Does GA4 show exit rate?", answer: "Not by default — add Exits and Views to an Exploration report and divide them." },
    ],
  },
  {
    slug: "conversion-rate-calculator",
    category: BUSINESS_PLANNING,
    title: "Conversion Rate Calculator",
    description: "Calculate your conversion rate and online marketing funnel — visitor-to-lead and lead-to-customer rates, revenue per visitor, and the sales a target rate would bring.",
    metaTitle: "Conversion Rate Calculator — Website & Funnel Conversions",
    metaDescription: "Free conversion rate calculator. Find visitor, lead and customer conversion rates, revenue per visitor and sales at a target conversion rate.",
    calcInputs: [numberField("visitors", "Visitors (sessions or clicks)", { default: 10000, max: 10000000000 }), numberField("leads", "Leads / Sign-Ups (optional)", { default: 400, max: 10000000000, required: false }), numberField("customers", "Conversions / Customers", { default: 80, max: 10000000000 }), currencyField("revenue", "Revenue (optional)", { default: 8000, max: 100000000000, step: 1, required: false }), percentField("targetRate", "Target Conversion Rate", { default: 1, step: 0.01, required: false })],
    calcResult: { label: "Conversion Rate", format: "percentage" },
    calcResults: [pct("conversionRate", "Conversion Rate", true), pct("leadConversionRate", "Visitor-to-Lead Rate"), pct("leadToCustomerRate", "Lead-to-Customer Rate"), cur("revenuePerVisitor", "Revenue per Visitor"), cur("averageOrderValue", "Average Order Value"), num("conversionsAtTarget", "Conversions at Target Rate"), cur("revenueAtTarget", "Revenue at Target Rate")],
    instructions: "Enter visitors and conversions (a sale, sign-up or any goal). Add leads to see each step of the online marketing funnel, and revenue to see what each visitor is worth.",
    examples: "Example: 10,000 visitors, 400 leads and 80 sales is a 0.8% conversion rate (4% to lead, 20% of leads buy). With $8,000 of revenue each visitor is worth $0.80; at a 1% rate you'd make 100 sales and $10,000.",
    assumptions: "Conversion rate = conversions ÷ visitors × 100. E-commerce sites typically convert 2–3% of visits; the target-rate figures assume the same average order value.",
    faq: [
      { question: "What is a good conversion rate?", answer: "About 2–5% for most e-commerce and lead-gen sites; strong landing pages reach 10% or more." },
      { question: "Should I count sessions or users?", answer: "Either, but be consistent — sessions give a lower rate because one person can visit several times." },
    ],
  },
  {
    slug: "website-ad-revenue-calculator",
    category: BUSINESS_PLANNING,
    title: "Website Ad Revenue Calculator",
    description: "Estimate how much your website or blog earns from display ads such as Google AdSense — daily, monthly and yearly — from pageviews and page RPM or CTR and CPC.",
    metaTitle: "Website Ad Revenue Calculator — AdSense Earnings Estimate",
    metaDescription: "Free website ad revenue and AdSense calculator. Estimate blog earnings from monthly pageviews and page RPM, or from ad CTR and CPC.",
    calcInputs: [numberField("monthlyPageviews", "Monthly Pageviews", { default: 100000, max: 100000000000, step: 100 }), dropdown("method", "Estimate With", [["Page RPM", 1], ["Page CTR × CPC", 2]], 1), currencyField("pageRpm", "Page RPM (earnings per 1,000 pageviews)", { default: 8, max: 1000, step: 0.01, required: false }), percentField("pageCtr", "Page CTR (ad clicks ÷ pageviews)", { default: 1.5, step: 0.01, required: false }), currencyField("cpc", "Cost per Click (your share)", { default: 0.5, max: 1000, step: 0.01, required: false })],
    calcResult: { label: "Monthly Revenue", format: "currency" },
    calcResults: [cur("dailyRevenue", "Daily Revenue"), cur("monthlyRevenue", "Monthly Revenue", true), cur("yearlyRevenue", "Yearly Revenue"), cur("effectiveRpm", "Effective Page RPM")],
    instructions: "Enter monthly pageviews and your page RPM from AdSense (Reports → Page RPM) or your ad network. If you only know click-through rate and cost per click, choose the CTR × CPC method.",
    examples: "Example: 100,000 pageviews a month at an $8 page RPM earns about $800 a month ($9,600 a year). At a 1.5% page CTR and $0.50 per click it's $750.",
    assumptions: "AdSense pays publishers 80% of what advertisers pay for display ads; RPM already reflects your share. Page RPMs commonly run $2–$30 depending on niche, audience country and ad layout; premium networks such as Mediavine or Raptive often pay more.",
    faq: [
      { question: "How much does AdSense pay per 1,000 views?", answer: "Most sites see a page RPM of about $2–$10; finance, insurance and tech topics can be much higher." },
      { question: "How many pageviews do I need to earn $1,000 a month?", answer: "At a $10 RPM, about 100,000 pageviews a month." },
    ],
  },
  {
    slug: "grp-calculator",
    category: BUSINESS_PLANNING,
    title: "GRP Calculator",
    description: "Calculate gross rating points (GRP) for a TV, radio or digital campaign from reach and frequency, plus impressions, cost per point and CPM.",
    metaTitle: "GRP Calculator — Gross Rating Points, Reach & Frequency",
    metaDescription: "Free GRP calculator. Multiply reach by frequency to get gross rating points, then impressions, cost per rating point and CPM for your media plan.",
    calcInputs: [percentField("reachPercent", "Reach (% of target audience)", { default: 40, step: 0.1 }), numberField("frequency", "Average Frequency", { default: 3, max: 1000, step: 0.1 }), currencyField("campaignCost", "Campaign Cost", { default: 150000, max: 10000000000, step: 100 }), numberField("targetPopulation", "Target Audience Size", { default: 2000000, max: 10000000000, step: 1000 })],
    calcResult: { label: "GRP", format: "number" },
    calcResults: [num("grp", "Gross Rating Points (GRP)", true), num("peopleReached", "People Reached"), num("impressions", "Impressions"), cur("costPerPoint", "Cost per Rating Point (CPP)"), cur("cpm", "CPM")],
    instructions: "Enter the share of your target audience who will see the ad at least once (reach) and how many times on average they'll see it (frequency).",
    examples: "Example: reaching 40% of a 2 million audience 3 times is 120 GRPs — 2.4 million impressions. At $150,000 that's $1,250 per rating point and a $62.50 CPM.",
    assumptions: "GRP = reach % × frequency; impressions = audience × GRP ÷ 100. When GRPs are measured on a specific target group they're often called TRPs.",
    faq: [
      { question: "Can GRP be over 100?", answer: "Yes — GRPs count repeat exposures, so 300 GRP could mean 75% reach seen 4 times." },
      { question: "How many GRPs does a campaign need?", answer: "Brand campaigns often plan 100–300 GRPs a week, depending on goals and competition." },
    ],
  },
  {
    slug: "churn-rate-calculator",
    category: BUSINESS_PLANNING,
    title: "Churn Rate Calculator",
    description: "Calculate customer churn rate and customer retention rate for a month, quarter or year, the annualised churn, and the average customer lifetime.",
    metaTitle: "Churn Rate Calculator — Customer Churn & Retention Rate",
    metaDescription: "Free churn rate calculator. Get customer churn and retention rate from customers at the start and end and new customers, plus annual churn and lifetime.",
    calcInputs: [numberField("customersStart", "Customers at Start of Period", { default: 1000, max: 10000000000 }), numberField("customersEnd", "Customers at End of Period", { default: 1050, max: 10000000000 }), numberField("newCustomers", "New Customers Gained in the Period", { default: 120, max: 10000000000 }), dropdown("period", "Period Length", [["Month", 1], ["Quarter", 2], ["Year", 3]], 1)],
    calcResult: { label: "Churn Rate", format: "percentage" },
    calcResults: [num("customersLost", "Customers Lost"), pct("churnRate", "Churn Rate", true), pct("retentionRate", "Customer Retention Rate"), pct("annualChurnRate", "Annualised Churn Rate"), num("averageLifetimePeriods", "Average Customer Lifetime (periods)"), pct("netGrowthRate", "Net Customer Growth")],
    instructions: "Enter customers at the start and end of the period and how many new customers joined. Customers lost = start + new − end. Retention rate is the share of starting customers still with you.",
    examples: "Example: starting with 1,000 customers, gaining 120 and ending with 1,050 means 70 left — 7% monthly churn and 93% retention. That compounds to 58% a year, and the average customer stays about 14 months.",
    assumptions: "Churn = customers lost ÷ customers at start; retention = (end − new) ÷ start; annualised churn = 1 − (1 − churn)^periods per year. For revenue churn and net revenue retention, use the SaaS Metrics Calculator.",
    faq: [
      { question: "What is a good churn rate?", answer: "B2B SaaS companies aim for under 1–2% monthly churn; consumer subscriptions often see 3–8%." },
      { question: "Are churn rate and retention rate opposites?", answer: "Nearly — retention ignores new customers, so churn + retention = 100% when measured on the same starting group." },
    ],
  },
  {
    slug: "saas-metrics-calculator",
    category: BUSINESS_PLANNING,
    title: "SaaS Metrics Calculator",
    description: "Calculate the key SaaS metrics in one place — MRR, ARR, churn, net revenue retention, CAC, LTV, LTV:CAC and CAC payback.",
    metaTitle: "SaaS Metrics Calculator — MRR, ARR, LTV, CAC & NRR",
    metaDescription: "Free SaaS metrics calculator. Get MRR, ARR, churn, net revenue retention, CAC, LTV, LTV to CAC ratio and CAC payback months from one month's numbers.",
    calcInputs: [numberField("customersStart", "Customers at Start of Month", { default: 500, max: 100000000 }), currencyField("arpa", "Average Revenue per Account (monthly)", { default: 100, max: 10000000, step: 1 }), numberField("newCustomers", "New Customers This Month", { default: 40, max: 100000000 }), numberField("churnedCustomers", "Customers Lost This Month", { default: 15, max: 100000000 }), currencyField("expansionMrr", "Expansion MRR (upgrades)", { default: 1500, max: 1000000000, step: 1, required: false }), currencyField("contractionMrr", "Contraction MRR (downgrades)", { default: 500, max: 1000000000, step: 1, required: false }), percentField("grossMargin", "Gross Margin", { default: 80 }), currencyField("salesMarketingSpend", "Sales & Marketing Spend This Month", { default: 30000, max: 10000000000, step: 100 })],
    calcResult: { label: "MRR", format: "currency" },
    calcResults: [cur("mrr", "MRR (end of month)", true), cur("arr", "ARR"), pct("customerChurnRate", "Customer Churn (monthly)"), pct("netRevenueRetention", "Net Revenue Retention (monthly)"), cur("cac", "Customer Acquisition Cost (CAC)"), cur("ltv", "Customer Lifetime Value (LTV)"), num("ltvToCac", "LTV : CAC"), num("cacPaybackMonths", "CAC Payback (months)")],
    instructions: "Enter one month's numbers. MRR is starting customers × ARPA, plus new and expansion revenue, minus downgrades and churned revenue. LTV uses gross-margin revenue per account ÷ monthly churn.",
    examples: "Example: 500 customers at $100, 40 new, 15 lost, $1,500 of upgrades and $500 of downgrades give $53,500 MRR ($642,000 ARR) and 99% net revenue retention. $30,000 of sales and marketing means a $750 CAC against a $2,667 LTV — 3.56:1, paid back in 9.4 months.",
    assumptions: "New and lost customers are assumed to pay the average ARPA. A healthy SaaS business usually has LTV:CAC of 3 or more and CAC payback under 12–18 months.",
    faq: [
      { question: "What is net revenue retention?", answer: "Revenue kept from existing customers after upgrades, downgrades and churn. Above 100% means existing customers grow on their own." },
      { question: "What's the difference between MRR and ARR?", answer: "ARR is MRR × 12 — the yearly run rate of recurring revenue." },
    ],
  },
  {
    slug: "software-contract-value-calculator",
    category: BUSINESS_PLANNING,
    title: "Software Contract Value Calculator",
    description: "Calculate the total contract value (TCV) and annual contract value (ACV) of a software or SaaS deal, with yearly price increases and one-time fees.",
    metaTitle: "Software Contract Value Calculator — TCV & ACV",
    metaDescription: "Free software contract value calculator. Get total contract value, annual contract value, first-year value and MRR for multi-year SaaS deals with escalators.",
    calcInputs: [currencyField("annualFee", "Annual Subscription Fee (year 1)", { default: 24000, max: 10000000000, step: 100 }), numberField("contractYears", "Contract Length (years)", { default: 3, min: 1, max: 20 }), percentField("annualEscalator", "Yearly Price Increase", { default: 5, max: 50 }), currencyField("oneTimeFees", "One-Time Fees (setup, training)", { default: 5000, max: 10000000000, step: 100, required: false })],
    calcResult: { label: "TCV", format: "currency" },
    calcResults: [cur("totalContractValue", "Total Contract Value (TCV)", true), cur("recurringValue", "Recurring Value"), cur("annualContractValue", "Annual Contract Value (ACV)"), cur("firstYearValue", "First-Year Contract Value"), cur("finalYearFee", "Final-Year Fee"), cur("firstYearMrr", "Year-1 MRR")],
    instructions: "Enter the first year's subscription, the contract length, any yearly uplift and one-time fees.",
    examples: "Example: a 3-year deal at $24,000 a year rising 5% a year, plus $5,000 of setup, has a TCV of $80,660 and an ACV of $25,220 (recurring only). Year 3 costs $26,460.",
    assumptions: "ACV here excludes one-time fees, which is the most common definition; some companies include them in first-year ACV (shown separately).",
    faq: [
      { question: "What's the difference between TCV and ACV?", answer: "TCV is the whole contract's value; ACV is its average value per year." },
      { question: "Is ACV the same as ARR?", answer: "Close for annual subscriptions, but ARR is the current recurring run rate across all customers, while ACV describes one contract." },
    ],
  },
  {
    slug: "sell-through-rate-calculator",
    category: BUSINESS_PLANNING,
    title: "Sell-Through Rate Calculator",
    description: "Calculate the sell-through rate of your inventory — units sold as a share of units received — plus the daily sales rate and days to sell out.",
    metaTitle: "Sell-Through Rate Calculator — Retail Inventory STR",
    metaDescription: "Free sell-through rate calculator. Divide units sold by units received to get STR, then units sold per day and days left until you sell out.",
    calcInputs: [numberField("unitsReceived", "Units Received (or beginning inventory)", { default: 500, max: 10000000000 }), numberField("unitsSold", "Units Sold", { default: 320, max: 10000000000 }), numberField("periodDays", "Days in the Period", { default: 30, min: 1, max: 3650 })],
    calcResult: { label: "Sell-Through Rate", format: "percentage" },
    calcResults: [pct("sellThroughRate", "Sell-Through Rate", true), num("unitsRemaining", "Units Remaining"), num("unitsPerDay", "Units Sold per Day"), num("daysToSellOut", "Days to Sell Out at This Pace"), pct("weeklySellThrough", "Average Weekly Sell-Through")],
    instructions: "Enter the units you received (or had at the start of the period) and the units you sold during it. Retailers track it weekly or monthly to decide on reorders and markdowns.",
    examples: "Example: selling 320 of 500 units in 30 days is a 64% sell-through rate — about 10.7 units a day, so the remaining 180 will sell out in about 17 days.",
    assumptions: "Sell-through = units sold ÷ units received × 100. A monthly sell-through of 40–80% is generally healthy for retail; seasonal goods aim higher before the season ends.",
    faq: [
      { question: "What's a good sell-through rate?", answer: "Above 80% is strong for a season; below 40% suggests overbuying or a price that's too high." },
      { question: "How is sell-through different from inventory turnover?", answer: "Sell-through is the share of stock sold in a period; turnover counts how many times you sell your average inventory in a year." },
    ],
  },
  {
    slug: "gmroi-calculator",
    category: BUSINESS_PLANNING,
    title: "GMROI Calculator",
    description: "Calculate GMROI (gross margin return on investment) — the gross profit earned for every dollar invested in inventory — plus gross margin % and inventory turnover.",
    metaTitle: "GMROI Calculator — Gross Margin Return on Investment",
    metaDescription: "Free GMROI calculator. Divide gross margin by average inventory cost to see how many dollars of gross profit each inventory dollar earns.",
    calcInputs: [currencyField("netSales", "Net Sales", { default: 600000, max: 100000000000, step: 100 }), currencyField("cogs", "Cost of Goods Sold", { default: 360000, max: 100000000000, step: 100 }), currencyField("inventoryStart", "Inventory at Cost — Start", { default: 110000, max: 100000000000, step: 100 }), currencyField("inventoryEnd", "Inventory at Cost — End", { default: 90000, max: 100000000000, step: 100 })],
    calcResult: { label: "GMROI", format: "number" },
    calcResults: [cur("grossMargin", "Gross Margin"), pct("grossMarginPct", "Gross Margin %"), cur("averageInventory", "Average Inventory at Cost"), num("gmroi", "GMROI", true), num("inventoryTurnover", "Inventory Turnover")],
    instructions: "Enter a year's (or season's) net sales and cost of goods sold, and inventory at cost at the start and end of the period.",
    examples: "Example: $600,000 of sales with $360,000 COGS gives $240,000 gross margin. With average inventory of $100,000, GMROI is 2.4 — every inventory dollar earns $2.40 of gross margin — and stock turns 3.6 times.",
    assumptions: "GMROI = gross margin ÷ average inventory at cost. Use a yearly figure for comparison with benchmarks; a GMROI above 1 means you earn more than your inventory costs.",
    faq: [
      { question: "What's a good GMROI?", answer: "Many retailers target 3 or more; grocery runs lower with high turnover, jewelry lower with high margins." },
      { question: "How can I raise GMROI?", answer: "Improve margins, cut slow-moving stock, or turn inventory faster with smaller, more frequent orders." },
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
