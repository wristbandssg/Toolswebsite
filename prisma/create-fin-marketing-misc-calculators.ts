// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// the finance sub-batch "Marketing Metrics & Everyday Money". See
// src/lib/calc-engine-fin-valuation.ts for the full list of 5 sub-batches,
// and src/lib/calc-engine-fin-marketing-misc.ts for the math.
// Each tool is filed in the Finance Calculators sub-category the user named
// for it (created on first run).
//
// HOW TO RUN
//   npx tsx prisma/create-fin-marketing-misc-calculators.ts
// or
//   npm run db:create-fin-marketing-misc-calculators

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


// Tool categories follow the 14 Oct 2026 consolidation of the Finance sub-categories
// (see prisma/consolidate-finance-subcategories.ts).
const BUSINESS_CATEGORY = { name: "Business Finance Calculators", slug: "business-calculators" };
const MONEY_SAVING_CATEGORY = { name: "Money-Saving & Spending Calculators", slug: "money-saving-calculators" };
const TAX_CATEGORY = { name: "Tax Calculators", slug: "tax-calculators" };

const AD_NOTE = "Industry benchmarks vary widely by platform, industry and season — compare against your own past campaigns.";

const TOOLS: ToolDef[] = [
  {
    slug: "roas-calculator",
    category: BUSINESS_CATEGORY,
    title: "ROAS Calculator",
    description: "Calculate return on ad spend (ROAS), ACoS, your break-even ROAS from your profit margin, and the profit left after advertising.",
    metaTitle: "ROAS Calculator — Return on Ad Spend & Break-Even ROAS",
    metaDescription: "Free ROAS calculator. Divide ad revenue by ad spend to get ROAS and ACoS, find your break-even ROAS from your margin and see profit after ads.",
    calcInputs: [currencyField("adRevenue", "Revenue from Ads", { default: 15000, max: 10000000000, step: 10 }), currencyField("adSpend", "Ad Spend", { default: 3000, max: 10000000000, step: 10 }), percentField("grossMargin", "Gross Profit Margin", { default: 40 })],
    calcResult: { label: "ROAS", format: "number" },
    calcResults: [num("roas", "ROAS (× revenue per $1)", true), pct("roasPercent", "ROAS as a Percentage"), pct("acos", "ACoS (ad spend ÷ revenue)"), num("breakEvenRoas", "Break-Even ROAS"), cur("profitAfterAdSpend", "Gross Profit After Ad Spend")],
    instructions: "Enter the revenue your ads brought in, what you spent and your gross margin (price minus product cost, as a % of price). A ROAS above your break-even ROAS means the ads are profitable before other overheads.",
    examples: "Example: $15,000 of sales from $3,000 of ads is a 5× ROAS (500%) and a 20% ACoS. With a 40% margin you break even at 2.5×, and the ads leave $3,000 of gross profit.",
    assumptions: "ROAS = ad revenue ÷ ad spend; break-even ROAS = 1 ÷ gross margin. Attribution windows and platforms differ, so revenue figures from ad dashboards are estimates. " + AD_NOTE,
    faq: [
      { question: "What is a good ROAS?", answer: "4× ($4 of revenue per $1) is a common target, but what matters is beating your break-even ROAS." },
      { question: "What's the difference between ROAS and ROI?", answer: "ROAS uses revenue; ROI uses profit after all costs, so ROI is always lower for the same campaign." },
    ],
  },
  {
    slug: "ctr-calculator",
    category: BUSINESS_CATEGORY,
    title: "CTR Calculator",
    description: "Calculate click-through rate (CTR) from clicks and impressions, and how many clicks you'd need to reach a target CTR.",
    metaTitle: "CTR Calculator — Click-Through Rate",
    metaDescription: "Free CTR calculator. Divide clicks by impressions to get click-through rate for ads, emails or search results, and the clicks needed for a target CTR.",
    calcInputs: [numberField("clicks", "Clicks", { default: 250, max: 10000000000 }), numberField("impressions", "Impressions (or emails delivered)", { default: 10000, max: 100000000000 }), percentField("targetCtr", "Target CTR", { default: 3, step: 0.01 })],
    calcResult: { label: "CTR", format: "percentage" },
    calcResults: [pct("ctr", "Click-Through Rate", true), num("clicksAtTargetCtr", "Clicks Needed at Target CTR"), num("additionalClicksNeeded", "Additional Clicks Needed"), num("impressionsPerClick", "Impressions per Click")],
    instructions: "Enter clicks and impressions from your ad platform, email tool or Google Search Console. CTR shows how compelling your ad, subject line or search snippet is.",
    examples: "Example: 250 clicks from 10,000 impressions is a 2.50% CTR. To reach 3% you'd need 300 clicks — 50 more.",
    assumptions: "CTR = clicks ÷ impressions × 100. Google Ads search averages roughly 3–6%, display ads under 1%. " + AD_NOTE,
    faq: [
      { question: "How can I improve CTR?", answer: "Match the headline to the search intent, add a clear benefit and call to action, and test different versions." },
      { question: "Is a high CTR always good?", answer: "Only if those clicks convert — clickbait raises CTR but can waste ad spend." },
    ],
  },
  {
    slug: "cpc-calculator",
    category: BUSINESS_CATEGORY,
    title: "CPC Calculator",
    description: "Calculate cost per click (CPC), cost per conversion and conversion rate, plus the maximum CPC you can afford for a target cost per acquisition.",
    metaTitle: "CPC Calculator — Cost per Click & Max CPC",
    metaDescription: "Free CPC calculator. Get cost per click, cost per conversion and conversion rate, and the max CPC bid that hits your target CPA.",
    calcInputs: [currencyField("adSpend", "Ad Spend", { default: 500, max: 10000000000, step: 1 }), numberField("clicks", "Clicks", { default: 400, max: 10000000000 }), numberField("conversions", "Conversions (sales or leads)", { default: 20, max: 10000000000, required: false }), currencyField("targetCpa", "Target Cost per Acquisition (optional)", { default: 0, max: 1000000, step: 1, required: false })],
    calcResult: { label: "CPC", format: "currency" },
    calcResults: [cur("cpc", "Cost per Click", true), cur("costPerConversion", "Cost per Conversion (CPA)"), pct("conversionRate", "Conversion Rate"), cur("maxCpcForTargetCpa", "Max CPC for Target CPA")],
    instructions: "Enter what you spent and the clicks it bought. Add conversions to see what each sale or lead cost, and a target CPA to find the highest CPC you can bid and still hit it.",
    examples: "Example: $500 for 400 clicks is $1.25 per click. 20 conversions is a 5% conversion rate and a $25 CPA. To hit a $30 CPA at 5% conversion, you can pay up to $1.50 per click.",
    assumptions: "CPC = spend ÷ clicks; max CPC = target CPA × conversion rate. Actual CPCs come from auctions and change daily. " + AD_NOTE,
    faq: [
      { question: "What is an average CPC?", answer: "Google Search averages a few dollars per click across industries; legal and insurance keywords can exceed $50." },
      { question: "How do I lower my CPC?", answer: "Improve ad relevance and landing pages to raise Quality Score, and use more specific long-tail keywords." },
    ],
  },
  {
    slug: "cpm-calculator",
    category: BUSINESS_CATEGORY,
    title: "CPM Calculator",
    description: "Calculate CPM (cost per thousand impressions), or solve for the campaign cost or the number of impressions a budget buys.",
    metaTitle: "CPM Calculator — Cost per 1,000 Impressions",
    metaDescription: "Free CPM calculator. Find cost per mille from cost and impressions, or the budget or impressions you get at a given CPM.",
    calcInputs: [dropdown("solveFor", "Solve For", [["CPM", 1], ["Campaign cost", 2], ["Impressions", 3]], 1), currencyField("cost", "Campaign Cost", { default: 2000, max: 10000000000, step: 1, required: false }), numberField("impressions", "Impressions", { default: 250000, max: 100000000000, step: 1000, required: false }), currencyField("cpm", "CPM", { default: 8, max: 100000, step: 0.01, required: false })],
    calcResult: { label: "CPM", format: "currency" },
    calcResults: [cur("cpm", "CPM", true), cur("cost", "Campaign Cost"), num("impressions", "Impressions"), { key: "costPerImpression", label: "Cost per Impression", format: "currency", decimals: 5 }],
    instructions: "Choose what to solve for and enter the other two values. CPM (\"mille\" = thousand) is how display, video, social and podcast ads are usually priced.",
    examples: "Example: $2,000 for 250,000 impressions is an $8 CPM. At a $5 CPM, a $1,000 budget buys 200,000 impressions.",
    assumptions: "CPM = cost ÷ impressions × 1,000. " + AD_NOTE,
    faq: [
      { question: "What is a good CPM?", answer: "Social and display ads often run $5–$15; premium video and targeted B2B audiences can cost far more." },
      { question: "CPM or CPC — which is better?", answer: "CPM suits brand awareness; CPC suits campaigns where you only want to pay for visits." },
    ],
  },
  {
    slug: "youtube-revenue-calculator",
    category: BUSINESS_CATEGORY,
    title: "YouTube Revenue Calculator",
    description: "Estimate YouTube ad revenue from daily views, the share of monetized views and advertiser CPM — daily, monthly and yearly earnings and your RPM.",
    metaTitle: "YouTube Revenue Calculator — Estimate Channel Earnings",
    metaDescription: "Free YouTube revenue calculator. Estimate daily, monthly and yearly AdSense earnings from views, monetized playbacks and CPM after YouTube's 45% cut.",
    calcInputs: [numberField("dailyViews", "Daily Views", { default: 10000, max: 1000000000, step: 100 }), percentField("monetizedPercent", "Monetized Playbacks (% of views with ads)", { default: 50, step: 1 }), currencyField("adCpm", "Advertiser CPM", { default: 10, max: 1000, step: 0.1 }), percentField("creatorShare", "Creator Revenue Share", { default: 55, step: 1 })],
    calcResult: { label: "Monthly Earnings", format: "currency" },
    calcResults: [cur("effectiveRpm", "Your RPM (per 1,000 views)"), cur("dailyEarnings", "Daily Earnings"), cur("monthlyEarnings", "Monthly Earnings", true), cur("yearlyEarnings", "Yearly Earnings"), cur("earningsPerMillionViews", "Earnings per 1 Million Views")],
    instructions: "Enter your average daily views. Not every view shows an ad, so set the share of monetized playbacks (YouTube Studio shows it). CPM is what advertisers pay per 1,000 ad impressions — finance, tech and business niches pay the most; US viewers pay more than most countries.",
    examples: "Example: 10,000 views a day, 50% monetized at a $10 CPM, with the creator's 55% share, gives an RPM of $2.75 — about $27.50 a day, $836 a month and $10,038 a year.",
    assumptions: "Long-form videos: creators keep 55% of ad revenue. Shorts pay from a pooled fund (45% creator share) at much lower RPMs, often $0.03–$0.10. Memberships, Super Chats and sponsorships aren't included. You must be in the YouTube Partner Program (1,000 subscribers plus 4,000 watch hours or 10M Shorts views). " + AD_NOTE,
    faq: [
      { question: "How much does YouTube pay per 1,000 views?", answer: "Most creators earn an RPM of about $1–$5 per 1,000 views; high-value niches can exceed $10." },
      { question: "What's the difference between CPM and RPM?", answer: "CPM is what advertisers pay per 1,000 ad impressions; RPM is what you earn per 1,000 views after YouTube's share and unmonetized views." },
    ],
  },
  {
    slug: "sales-percentage-calculator",
    category: BUSINESS_CATEGORY,
    title: "Sales Percentage Calculator",
    description: "Calculate what percentage of total sales a product, salesperson or region makes up, and its sales growth compared with a previous period.",
    metaTitle: "Sales Percentage Calculator — Share of Sales & Growth",
    metaDescription: "Free sales percentage calculator. Find a product's or rep's percentage of total sales and the sales growth percentage versus last period.",
    calcInputs: [currencyField("partSales", "Sales of the Product / Rep / Region", { default: 25000, max: 100000000000, step: 1 }), currencyField("totalSales", "Total Sales", { default: 120000, max: 100000000000, step: 1 }), currencyField("previousSales", "Its Sales Last Period (optional)", { default: 20000, max: 100000000000, step: 1, required: false })],
    calcResult: { label: "Share of Total Sales", format: "percentage" },
    calcResults: [pct("shareOfTotalSales", "Share of Total Sales", true), cur("restOfSales", "All Other Sales"), cur("salesChange", "Change vs Last Period"), pct("salesGrowth", "Sales Growth")],
    instructions: "Enter the sales of one part of the business and total sales for the same period. Add the same part's sales from the previous period to see its growth.",
    examples: "Example: a product selling $25,000 out of $120,000 total makes up 20.83% of sales. If it sold $20,000 last month, sales grew 25%.",
    assumptions: "Share = part ÷ total × 100; growth = (current − previous) ÷ previous × 100. Use the same measure (revenue or units) for every figure.",
    faq: [
      { question: "How do I calculate a percentage of sales?", answer: "Divide the part by the total and multiply by 100." },
      { question: "What is the percent-of-sales method?", answer: "A forecasting method that assumes costs and balance-sheet items stay a fixed percentage of sales." },
    ],
  },
  {
    slug: "nps-calculator",
    category: BUSINESS_CATEGORY,
    title: "NPS Calculator",
    description: "Calculate your Net Promoter Score (NPS) from the number of promoters, passives and detractors, and how many more promoters you'd need to hit a target score.",
    metaTitle: "NPS Calculator — Net Promoter Score",
    metaDescription: "Free NPS calculator. Enter promoters (9–10), passives (7–8) and detractors (0–6) to get your Net Promoter Score and the promoters needed for a target.",
    calcInputs: [numberField("promoters", "Promoters (scored 9–10)", { default: 120, max: 100000000 }), numberField("passives", "Passives (scored 7–8)", { default: 50, max: 100000000 }), numberField("detractors", "Detractors (scored 0–6)", { default: 30, max: 100000000 }), numberField("targetNps", "Target NPS (optional)", { default: 50, min: -100, max: 100, required: false })],
    calcResult: { label: "NPS", format: "number" },
    calcResults: [num("totalResponses", "Total Responses"), pct("promoterPct", "Promoters"), pct("passivePct", "Passives"), pct("detractorPct", "Detractors"), num("nps", "Net Promoter Score", true), num("promotersNeededForTarget", "Extra Promoters Needed for Target")],
    instructions: "Count the answers to \"How likely are you to recommend us to a friend or colleague?\" on a 0–10 scale. Passives count toward the total but not the score.",
    examples: "Example: 120 promoters, 50 passives and 30 detractors from 200 responses: 60% − 15% = an NPS of 45. You'd need 20 more promoters to reach 50.",
    assumptions: "NPS = % promoters − % detractors, from −100 to +100. Net Promoter, NPS and Net Promoter Score are trademarks of Bain & Company, Satmetrix and Fred Reichheld.",
    faq: [
      { question: "What is a good NPS?", answer: "Above 0 is positive, above 30 is good, and above 50 is excellent; averages vary by industry." },
      { question: "Why don't passives count?", answer: "They're satisfied but unenthusiastic and unlikely to promote or harm the brand, so they only dilute both percentages." },
    ],
  },
  {
    slug: "margin-of-error-calculator",
    category: BUSINESS_CATEGORY,
    title: "Margin of Error Calculator",
    description: "Calculate the margin of error of a survey or poll from the sample size and confidence level, the confidence interval, and the sample size needed for a target margin.",
    metaTitle: "Margin of Error Calculator — Survey Confidence Interval",
    metaDescription: "Free margin of error calculator. Get a survey's margin of error and confidence interval from sample size and confidence level, plus the sample needed.",
    calcInputs: [numberField("sampleSize", "Sample Size (responses)", { default: 1000, min: 1, max: 100000000 }), dropdown("confidenceLevel", "Confidence Level", [["95%", 95], ["90%", 90], ["99%", 99], ["98%", 98], ["85%", 85], ["80%", 80]], 95), percentField("proportion", "Sample Proportion (50% if unknown)", { default: 50, step: 1 }), numberField("populationSize", "Population Size (0 = very large)", { default: 0, max: 10000000000, required: false }), percentField("targetMargin", "Target Margin of Error", { default: 3, min: 0.1, max: 50, step: 0.1, required: false })],
    calcResult: { label: "Margin of Error", format: "percentage" },
    calcResults: [pct("marginOfError", "Margin of Error (±)", true), pct("lowerBound", "Confidence Interval — Low"), pct("upperBound", "Confidence Interval — High"), pct("standardError", "Standard Error"), num("sampleSizeForTarget", "Sample Size Needed for Target")],
    instructions: "Enter how many people responded and the confidence level. Use the share who gave a particular answer as the proportion, or 50% for the most cautious (widest) margin. Enter the population size if you surveyed a large share of a small group, such as a company's staff.",
    examples: "Example: 1,000 responses at 95% confidence give a margin of error of ±3.1%, so a 50% result means 46.9%–53.1%. You'd need 1,068 responses for ±3%.",
    assumptions: "MOE = z × √(p(1 − p) ÷ n) × √((N − n) ÷ (N − 1)), with z = 1.96 for 95%. Assumes a simple random sample; it doesn't cover non-response or biased questions.",
    faq: [
      { question: "Why do polls use about 1,000 people?", answer: "That gives about ±3% at 95% confidence, and quadrupling the sample only halves the margin." },
      { question: "Does population size matter?", answer: "Hardly, once the population is much larger than the sample — that's why it's optional." },
    ],
  },
  {
    slug: "money-counter-calculator",
    category: MONEY_SAVING_CATEGORY,
    title: "Money Counter Calculator",
    description: "Count cash fast — enter how many of each US bill and coin you have to get the total, the bills and coins subtotals and how many pieces you counted.",
    metaTitle: "Money Counter Calculator — Count Bills & Coins",
    metaDescription: "Free money counter calculator. Enter the number of $100, $50, $20, $10, $5, $2 and $1 bills and each coin to total your cash drawer or savings jar.",
    calcInputs: [
      numberField("b100", "$100 Bills", { default: 0, max: 1000000, required: false }),
      numberField("b50", "$50 Bills", { default: 0, max: 1000000, required: false }),
      numberField("b20", "$20 Bills", { default: 0, max: 1000000, required: false }),
      numberField("b10", "$10 Bills", { default: 0, max: 1000000, required: false }),
      numberField("b5", "$5 Bills", { default: 0, max: 1000000, required: false }),
      numberField("b2", "$2 Bills", { default: 0, max: 1000000, required: false }),
      numberField("b1", "$1 Bills", { default: 0, max: 1000000, required: false }),
      numberField("c100", "Dollar Coins", { default: 0, max: 1000000, required: false }),
      numberField("c50", "Half Dollars (50¢)", { default: 0, max: 1000000, required: false }),
      numberField("c25", "Quarters (25¢)", { default: 0, max: 1000000, required: false }),
      numberField("c10", "Dimes (10¢)", { default: 0, max: 1000000, required: false }),
      numberField("c5", "Nickels (5¢)", { default: 0, max: 1000000, required: false }),
      numberField("c1", "Pennies (1¢)", { default: 0, max: 1000000, required: false }),
    ],
    calcResult: { label: "Total Cash", format: "currency" },
    calcResults: [cur("billsTotal", "Bills Total"), cur("coinsTotal", "Coins Total"), cur("grandTotal", "Total Cash", true), num("numberOfBills", "Number of Bills"), num("numberOfCoins", "Number of Coins")],
    instructions: "Sort your cash by denomination and type in how many of each you have. It's handy for balancing a cash register, counting tips or a coin jar.",
    examples: "Example: three $100 bills, two $20s, seven quarters and three pennies total $341.78 — $340 in bills and $1.78 in coins.",
    assumptions: "US currency. Amounts are added in whole cents, so there are no rounding errors.",
    faq: [
      { question: "How much is a roll of quarters?", answer: "$10 — 40 quarters. Dimes come in $5 rolls, nickels in $2 and pennies in 50¢." },
      { question: "How do I count a cash drawer?", answer: "Count each denomination, total it, then subtract the starting float to get the day's cash sales." },
    ],
  },
  {
    slug: "zakat-calculator",
    category: TAX_CATEGORY,
    title: "Zakat Calculator",
    description: "Calculate the zakat you owe — 2.5% of your net zakatable wealth (cash, gold, silver, investments and business assets) once it reaches the nisab threshold.",
    metaTitle: "Zakat Calculator — Nisab & Zakat Due",
    metaDescription: "Free zakat calculator. Add cash, gold, silver, investments and business assets, subtract debts due, check the nisab (gold or silver) and get 2.5% zakat due.",
    calcInputs: [
      currencyField("cash", "Cash & Bank Balances", { default: 20000, max: 10000000000, step: 100 }),
      numberField("goldGrams", "Gold Owned (grams)", { default: 0, max: 10000000, step: 0.1, required: false }),
      numberField("silverGrams", "Silver Owned (grams)", { default: 0, max: 100000000, step: 1, required: false }),
      currencyField("investments", "Shares, Funds & Crypto (market value)", { default: 15000, max: 10000000000, step: 100, required: false }),
      currencyField("businessInventory", "Business Stock & Cash", { default: 0, max: 10000000000, step: 100, required: false }),
      currencyField("receivables", "Money Owed to You (expected back)", { default: 0, max: 10000000000, step: 100, required: false }),
      currencyField("otherAssets", "Other Zakatable Assets", { default: 0, max: 10000000000, step: 100, required: false }),
      currencyField("liabilities", "Debts & Bills Due Now", { default: 3000, max: 10000000000, step: 100, required: false }),
      dropdown("nisabBasis", "Nisab Based On", [["Silver (595 g) — lower threshold", 2], ["Gold (85 g)", 1]], 2),
      currencyField("goldPricePerGram", "Gold Price per Gram (today)", { default: 130, max: 100000, step: 0.01 }),
      currencyField("silverPricePerGram", "Silver Price per Gram (today)", { default: 1.6, max: 10000, step: 0.01 }),
    ],
    calcResult: { label: "Zakat Due", format: "currency" },
    calcResults: [cur("totalZakatableAssets", "Total Zakatable Assets"), cur("netZakatableWealth", "Net Zakatable Wealth"), cur("nisabThreshold", "Nisab Threshold"), num("meetsNisab", "Meets Nisab (1 = yes)"), cur("zakatDue", "Zakat Due (2.5%)", true)],
    instructions:
      "Enter what you own on your zakat date — after holding at least nisab for one lunar year (hawl) — and subtract debts that are due now. Update the gold and silver prices to today's rates.\n\n" +
      "Your home, car, personal belongings and work tools are not zakatable.",
    examples: "Example: $20,000 in the bank and $15,000 of investments, less $3,000 of bills due, leaves $32,000 of net wealth — above the silver nisab of $952 — so zakat is $800.",
    assumptions: "Zakat = 2.5% of net zakatable wealth at or above nisab: 85 g of gold or 595 g of silver at the prices you enter. Scholars differ on the nisab basis, jewellery in regular use, retirement accounts and long-term debts — follow your scholar's or local zakat authority's guidance.",
    faq: [
      { question: "Should I use the gold or silver nisab?", answer: "Many scholars recommend silver because the lower threshold means more people pay and the poor benefit more; others use gold. Choose the one your scholar follows." },
      { question: "Do I pay zakat on my house?", answer: "Not on the home you live in. Property held for resale counts as trade goods; rental property is usually zakatable on its saved rental income." },
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
