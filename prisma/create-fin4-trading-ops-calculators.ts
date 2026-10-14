// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// finance expansion 4 sub-batch "trading-ops". See
// src/lib/calc-engine-fin4-india-uk.ts for the full list of 3 sub-batches,
// and src/lib/calc-engine-fin4-trading-ops.ts for the math. Each tool is filed in
// the Finance Calculators sub-category the user named for it (created on
// first run if new).
//
// HOW TO RUN
//   npx tsx prisma/create-fin4-trading-ops-calculators.ts
// or
//   npm run db:create-fin4-trading-ops-calculators

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


const OTHER = { name: "Other Calculators", slug: "other-finance-calculators" };
const TAX_SALARY = { name: "Tax & Salary Calculators", slug: "tax-salary-calculators" };

const TRADE_NOTE = "Technical indicators describe past prices; they don't predict them reliably. Use them with risk management, not as advice.";

const TOOLS: ToolDef[] = [
  {
    slug: "combined-ratio-calculator",
    category: OTHER,
    title: "Combined Ratio Calculator",
    description: "Calculate an insurer's combined ratio — loss ratio plus expense ratio — and underwriting profit, to see whether it makes money from writing insurance.",
    metaTitle: "Combined Ratio Calculator — Loss & Expense Ratio",
    metaDescription: "Free combined ratio calculator. Find an insurer's loss ratio, expense ratio, combined ratio and underwriting profit from premiums, losses and expenses.",
    calcInputs: [currencyField("earnedPremium", "Earned Premiums", { default: 10000000, max: 1000000000000, step: 1000 }), currencyField("incurredLosses", "Incurred Losses (claims)", { default: 6000000, max: 1000000000000, step: 1000 }), currencyField("lossAdjustmentExpenses", "Loss Adjustment Expenses", { default: 700000, max: 1000000000000, step: 1000, required: false }), currencyField("underwritingExpenses", "Underwriting & Operating Expenses", { default: 2800000, max: 1000000000000, step: 1000 }), currencyField("policyholderDividends", "Policyholder Dividends (optional)", { default: 0, max: 1000000000000, step: 1000, required: false })],
    calcResult: { label: "Combined Ratio", format: "percentage" },
    calcResults: [pct("lossRatio", "Loss Ratio (incl. LAE)"), pct("expenseRatio", "Expense Ratio"), pct("combinedRatio", "Combined Ratio", true), cur("underwritingProfit", "Underwriting Profit (Loss)")],
    instructions: "Enter premiums earned, claims incurred and the cost of handling them (LAE), and the insurer's other underwriting expenses — commissions, salaries, overhead. Below 100% means an underwriting profit.",
    examples: "Example: $10M of earned premium, $6.7M of losses and LAE and $2.8M of expenses give a 67% loss ratio, a 28% expense ratio and a 95% combined ratio — $500,000 of underwriting profit.",
    assumptions: "Combined ratio = (losses + LAE) ÷ earned premium + expenses ÷ earned premium (+ dividends). Statutory reporting divides expenses by written premium instead. Investment income isn't included, so insurers can be profitable even above 100%. " + DISCLAIMER,
    faq: [
      { question: "What is a good combined ratio?", answer: "Below 100% means underwriting profit; strong property-casualty insurers run 90–95% over a cycle." },
      { question: "What is the loss ratio?", answer: "Claims and claim-handling costs as a percentage of premiums — the main part of the combined ratio." },
    ],
  },
  {
    slug: "customer-effort-score-calculator",
    category: OTHER,
    title: "Customer Effort Score Calculator",
    description: "Calculate your Customer Effort Score (CES) from 1–7 survey answers — the average score, the share who found it easy and the share who found it hard.",
    metaTitle: "Customer Effort Score Calculator — CES",
    metaDescription: "Free Customer Effort Score calculator. Enter how many customers chose each answer from 1 to 7 to get your CES average, % easy and % difficult.",
    calcInputs: [1, 2, 3, 4, 5, 6, 7].map((k) => numberField(`score${k}`, `Responses of ${k}${k === 1 ? " (very difficult)" : k === 7 ? " (very easy)" : ""}`, { default: [4, 6, 10, 20, 40, 60, 60][k - 1], max: 100000000, required: false })),
    calcResult: { label: "Average CES", format: "number" },
    calcResults: [num("responses", "Total Responses"), num("averageCes", "Average CES (1–7)", true), pct("percentEasy", "Found It Easy (5–7)"), pct("percentDifficult", "Found It Difficult (1–3)"), pct("netEaseScore", "Net Ease (easy − difficult)")],
    instructions: "Ask \"The company made it easy for me to handle my issue\" (1 = strongly disagree, 7 = strongly agree) and enter how many customers chose each answer.",
    examples: "Example: 200 responses averaging 5.53 out of 7, with 80% scoring 5–7 (easy) and 10% scoring 1–3 (difficult) — a net ease of +70.",
    assumptions: "Uses the 7-point agreement scale from CEB/Gartner's CES 2.0; some companies use 1–5, so compare like with like. Lower-effort experiences predict loyalty better than satisfaction in Gartner's research.",
    faq: [
      { question: "What is a good CES score?", answer: "On a 7-point scale, an average above 5 is good and above 6 is excellent." },
      { question: "CES, CSAT or NPS?", answer: "CES measures one interaction's ease, CSAT measures satisfaction, NPS measures overall loyalty — many teams track all three." },
    ],
  },
  {
    slug: "trir-calculator",
    category: OTHER,
    title: "TRIR Calculator",
    description: "Calculate your OSHA total recordable incident rate (TRIR), DART rate and lost-time incident rate (LTIR) per 100 full-time workers.",
    metaTitle: "TRIR Calculator — TRIR, DART & LTIR Safety Rates",
    metaDescription: "Free TRIR calculator. Work out OSHA total recordable incident rate, DART rate and lost-time rate from cases and hours worked (× 200,000).",
    calcInputs: [numberField("hoursWorked", "Total Hours Worked by All Employees (year)", { default: 400000, min: 1, max: 100000000000 }), numberField("recordableCases", "OSHA Recordable Cases", { default: 6, max: 1000000 }), numberField("dartCases", "Days Away, Restricted or Transferred (DART) Cases", { default: 3, max: 1000000, required: false }), numberField("lostTimeCases", "Lost-Time Cases (days away)", { default: 2, max: 1000000, required: false })],
    calcResult: { label: "TRIR", format: "number" },
    calcResults: [num("trir", "TRIR", true), num("dartRate", "DART Rate"), num("ltir", "Lost-Time Incident Rate (LTIR)"), num("fullTimeEquivalentWorkers", "Full-Time Equivalent Workers")],
    instructions: "Take the cases from your OSHA 300 log and total hours actually worked (not paid leave). The 200,000 factor equals 100 full-time employees working 40 hours for 50 weeks.",
    examples: "Example: 6 recordable cases in 400,000 hours is a TRIR of 3.0 — 3 injuries per 100 full-time workers a year. With 3 DART cases the DART rate is 1.5.",
    assumptions: "Rate = cases × 200,000 ÷ hours worked (OSHA). The BLS private-industry TRIR averaged about 2.4 in 2023; construction and manufacturing run higher.",
    faq: [
      { question: "What is a good TRIR?", answer: "Lower than your industry's BLS average; many contractors must be under 1.0–3.0 to bid on projects." },
      { question: "What counts as an OSHA recordable?", answer: "Work-related injuries or illnesses needing treatment beyond first aid, days away, restricted work, loss of consciousness or a significant diagnosis." },
    ],
  },
  {
    slug: "fibonacci-retracement-calculator",
    category: OTHER,
    title: "Fibonacci Retracement Calculator",
    description: "Calculate Fibonacci retracement levels (23.6%, 38.2%, 50%, 61.8%, 78.6%) and extension targets (127.2%, 161.8%) from a swing high and low.",
    metaTitle: "Fibonacci Retracement Calculator — Levels & Extensions",
    metaDescription: "Free Fibonacci retracement calculator. Get 23.6%, 38.2%, 50%, 61.8% and 78.6% retracements and 127.2%/161.8% extensions for an uptrend or downtrend.",
    calcInputs: [currencyField("swingHigh", "Swing High", { default: 150, max: 100000000, step: 0.0001 }), currencyField("swingLow", "Swing Low", { default: 100, max: 100000000, step: 0.0001 }), dropdown("trend", "Trend", [["Uptrend (low → high)", 1], ["Downtrend (high → low)", 2]], 1)],
    calcResult: { label: "61.8% Level", format: "currency" },
    calcResults: [cur("level236", "23.6% Retracement"), cur("level382", "38.2% Retracement"), cur("level500", "50% Retracement"), cur("level618", "61.8% Retracement", true), cur("level786", "78.6% Retracement"), cur("extension1272", "127.2% Extension"), cur("extension1618", "161.8% Extension")],
    instructions: "Enter the high and low of the move you're measuring and its direction. In an uptrend, retracements are pullbacks below the high where buyers may step in; extensions are targets beyond it.",
    examples: "Example: a rally from $100 to $150 has retracement levels at $138.20 (23.6%), $130.90 (38.2%), $125 (50%), $119.10 (61.8%) and $110.70 (78.6%), and extension targets at $163.60 and $180.90.",
    assumptions: "Uptrend retracement = high − range × ratio; extension = low + range × ratio. The 50% level isn't a Fibonacci ratio but is traditionally included. " + TRADE_NOTE,
    faq: [
      { question: "Which Fibonacci level matters most?", answer: "Traders watch 38.2%, 50% and especially 61.8% (the \"golden ratio\") for possible support or resistance." },
      { question: "Does it work on any timeframe?", answer: "Yes — the math is the same for minutes or months; results depend on choosing meaningful swing points." },
    ],
  },
  {
    slug: "pivot-point-calculator",
    category: OTHER,
    title: "Pivot Point Calculator",
    description: "Calculate pivot points with support and resistance levels (S1–S3, R1–R3) from the previous period's high, low and close — classic, Woodie or Fibonacci.",
    metaTitle: "Pivot Point Calculator — Support & Resistance Levels",
    metaDescription: "Free pivot point calculator. Get classic, Woodie or Fibonacci pivot points with three support and three resistance levels for day or swing trading.",
    calcInputs: [currencyField("high", "Previous High", { default: 52, max: 100000000, step: 0.0001 }), currencyField("low", "Previous Low", { default: 48, max: 100000000, step: 0.0001 }), currencyField("close", "Previous Close", { default: 51, max: 100000000, step: 0.0001 }), dropdown("method", "Method", [["Classic (floor)", 1], ["Woodie", 2], ["Fibonacci", 3]], 1)],
    calcResult: { label: "Pivot", format: "currency" },
    calcResults: [cur("r3", "Resistance 3"), cur("r2", "Resistance 2"), cur("r1", "Resistance 1"), cur("pivot", "Pivot Point", true), cur("s1", "Support 1"), cur("s2", "Support 2"), cur("s3", "Support 3")],
    instructions: "Enter yesterday's (or last week's) high, low and close to get today's (this week's) levels. Price above the pivot is often read as bullish, below as bearish.",
    examples: "Example: a high of $52, low of $48 and close of $51 give a classic pivot of $50.33, with resistance at $52.67 / $54.33 / $56.67 and support at $48.67 / $46.33 / $44.67.",
    assumptions: "Classic: P = (H + L + C) ÷ 3, R1 = 2P − L, S1 = 2P − H, R2/S2 = P ± (H − L), R3 = H + 2(P − L), S3 = L − 2(H − P). Woodie weights the close: P = (H + L + 2C) ÷ 4. Fibonacci: R/S = P ± 0.382, 0.618, 1.0 × range. " + TRADE_NOTE,
    faq: [
      { question: "Which period should I use?", answer: "Day traders use the previous day; swing traders use the previous week or month." },
      { question: "Do pivot points work for crypto?", answer: "Yes, but 24/7 markets have no official close — use a consistent UTC daily close." },
    ],
  },
  {
    slug: "rsi-calculator",
    category: OTHER,
    title: "Relative Strength Index Calculator (RSI)",
    description: "Calculate the Relative Strength Index (RSI) from closing prices with Wilder's smoothing, and see whether a stock looks overbought or oversold.",
    metaTitle: "RSI Calculator — Relative Strength Index",
    metaDescription: "Free RSI calculator. Enter up to 20 closing prices to get Wilder's Relative Strength Index, average gain and loss, and an overbought/oversold signal.",
    calcInputs: [dropdown("period", "RSI Period", [["14 (standard)", 14], ["9", 9], ["7", 7], ["5", 5]], 14), ...Array.from({ length: 20 }, (_, i) => currencyField(`price${i + 1}`, `Close ${i + 1} (oldest first)`, { default: [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46, 46.03, 46.41, 46.22, 45.64][i], max: 100000000, step: 0.0001, required: false }))],
    calcResult: { label: "RSI", format: "number" },
    calcResults: [num("rsi", "RSI", true), num("averageGain", "Average Gain", false, 4), num("averageLoss", "Average Loss", false, 4), num("signal", "Signal (1 Overbought ≥70, 2 Neutral, 3 Oversold ≤30)"), num("pricesUsed", "Prices Entered")],
    instructions: "Enter closing prices in date order, oldest first — at least one more than the RSI period (15 for a 14-period RSI). Readings above 70 are traditionally overbought, below 30 oversold.",
    examples: "Example: Wilder's classic 20-close sample (44.34 … 45.64) gives a 14-period RSI of about 57.9 — neutral.",
    assumptions: "RSI = 100 − 100 ÷ (1 + average gain ÷ average loss); the first average is a simple mean of n changes, later ones use Wilder smoothing (n − 1 parts old, 1 part new). Charting platforms use hundreds of prices, so short series differ slightly. " + TRADE_NOTE,
    faq: [
      { question: "What does an RSI of 70 mean?", answer: "Gains have heavily outweighed losses recently — the stock may be overbought, though strong trends can stay above 70 for a long time." },
      { question: "What is RSI divergence?", answer: "When price makes a new high or low but RSI doesn't, which can warn that momentum is fading." },
    ],
  },
  {
    slug: "remote-vs-on-location-workers-calculator",
    category: OTHER,
    title: "Remote vs. On-Location Workers Calculator",
    description: "Compare what an employer spends on an office-based employee versus a remote one — office space, supplies, stipends, equipment and productivity — and the yearly savings.",
    metaTitle: "Remote vs On-Location Workers Calculator — Employer Cost",
    metaDescription: "Free remote vs office worker cost calculator. Compare the yearly cost of on-site and remote employees for a business, including office space and stipends.",
    calcInputs: [numberField("employees", "Employees Considered", { default: 20, min: 1, max: 1000000 }), currencyField("averageSalary", "Average Salary", { default: 70000, max: 100000000, step: 1000 }), currencyField("officeCostPerSeat", "Office Space Cost per Seat per Year", { default: 12000, max: 1000000, step: 100 }), currencyField("officeSuppliesPerSeat", "Office Utilities, Supplies & Snacks per Seat", { default: 1500, max: 1000000, step: 100, required: false }), currencyField("remoteStipend", "Remote Work Stipend per Year", { default: 1200, max: 1000000, step: 100, required: false }), currencyField("remoteEquipmentPerYear", "Home Equipment (per year)", { default: 800, max: 1000000, step: 100, required: false }), currencyField("remoteSoftwarePerSeat", "Extra Collaboration Software per Seat", { default: 400, max: 1000000, step: 50, required: false }), percentField("productivityChange", "Remote Productivity Change (+/−)", { default: 0, min: -50, max: 50, step: 0.5, required: false }), currencyField("turnoverSavingsPerRemote", "Turnover / Hiring Savings per Remote Worker", { default: 0, max: 1000000, step: 100, required: false })],
    calcResult: { label: "Total Yearly Savings", format: "currency" },
    calcResults: [cur("costPerOnLocationWorker", "Cost per On-Location Worker"), cur("costPerRemoteWorker", "Cost per Remote Worker"), cur("savingsPerWorker", "Savings per Worker"), cur("totalYearlySavings", "Total Yearly Savings", true)],
    instructions: "Enter the real cost of a desk (rent, service charges and furniture spread per seat) and what you'd pay remote staff for home offices. A positive productivity change counts as value gained; enter a negative number if you expect a drop.",
    examples: "Example: 20 employees on $70,000 cost $83,500 each in an office ($12,000 seat + $1,500 supplies) versus $72,400 remote ($2,400 of stipend, equipment and software) — $11,100 per worker, $222,000 a year.",
    assumptions: "Salaries are assumed equal in both settings (location-based pay would change this). Global Workplace Analytics estimates employers save about $11,000 a year per half-time remote worker. For an employee's own commuting costs, use the Commuter vs Remote Cost Comparison Calculator. " + DISCLAIMER,
    faq: [
      { question: "Is remote work cheaper for employers?", answer: "Usually, if office space can be cut — savings disappear if you keep paying for the same office." },
      { question: "What about hybrid work?", answer: "Hybrid saves less unless desks are shared; enter a smaller office cost per seat to model hot-desking." },
    ],
  },
  {
    slug: "california-overtime-calculator",
    category: TAX_SALARY,
    title: "California Overtime Calculator",
    description: "Calculate California overtime pay for a week — daily overtime after 8 hours, double time after 12, weekly overtime after 40, and the seventh-consecutive-day rule.",
    metaTitle: "California Overtime Calculator — Daily OT & Double Time",
    metaDescription: "Free California overtime calculator. Enter hours for each day to get regular, overtime (1.5×) and double-time (2×) hours and pay under California law.",
    calcInputs: [currencyField("hourlyRate", "Regular Hourly Rate", { default: 22, max: 10000, step: 0.25 }), ...[1, 2, 3, 4, 5, 6, 7].map((d) => numberField(`day${d}`, `Day ${d} Hours${d === 1 ? " (first day of workweek)" : ""}`, { default: [9, 10, 8, 13, 8, 0, 0][d - 1], max: 24, step: 0.25, required: false }))],
    calcResult: { label: "Total Weekly Pay", format: "currency" },
    calcResults: [num("totalHours", "Total Hours"), num("regularHours", "Regular Hours"), num("overtimeHours", "Overtime Hours (1.5×)"), num("doubleTimeHours", "Double-Time Hours (2×)"), cur("regularPay", "Regular Pay"), cur("overtimePay", "Overtime & Double-Time Pay"), cur("totalPay", "Total Weekly Pay", true)],
    instructions: "Enter the hours worked each day of your workweek. In California every hour over 8 in a day is overtime and over 12 is double time; regular hours beyond 40 in the week also become overtime; and working all 7 days makes the first 8 hours of day 7 overtime and the rest double time.",
    examples: "Example: 9, 10, 8, 13 and 8 hours at $22 is 48 hours — 40 regular, 7 overtime and 1 double-time hour — for $1,155 in the week.",
    assumptions: "California Labor Code § 510. Hours aren't double-counted between daily and weekly overtime. Exempt employees, alternative workweek schedules and some industries (e.g. agriculture, home care) follow different rules. Other states such as Texas, Florida and Georgia use only the federal 40-hour rule — see the Overtime Calculator. " + DISCLAIMER,
    faq: [
      { question: "Does California pay overtime after 8 hours?", answer: "Yes — over 8 hours in a workday is paid at 1.5×, and over 12 hours at 2×." },
      { question: "What is the seventh-day rule?", answer: "If you work all seven days of a workweek, the first 8 hours on day 7 are overtime and anything beyond is double time." },
    ],
  },
  {
    slug: "change-calculator",
    category: TAX_SALARY,
    title: "Change Calculator",
    description: "Calculate the change due from a cash payment and the fewest US bills and coins to give back — for cashiers, students and checking your change.",
    metaTitle: "Change Calculator — Change Due in Bills & Coins",
    metaDescription: "Free change calculator. Enter the amount due and the amount paid to get the change and how many $100s, $20s, quarters, dimes, nickels and pennies to give.",
    calcInputs: [currencyField("amountDue", "Amount Due", { default: 37.42, max: 10000000, step: 0.01 }), currencyField("amountPaid", "Amount Paid", { default: 100, max: 10000000, step: 0.01 })],
    calcResult: { label: "Change Due", format: "currency" },
    calcResults: [cur("changeDue", "Change Due", true), cur("shortBy", "Customer Still Owes"), num("bills100", "$100 Bills"), num("bills50", "$50 Bills"), num("bills20", "$20 Bills"), num("bills10", "$10 Bills"), num("bills5", "$5 Bills"), num("bills1", "$1 Bills"), num("quarters", "Quarters"), num("dimes", "Dimes"), num("nickels", "Nickels"), num("pennies", "Pennies"), num("totalPieces", "Total Bills & Coins")],
    instructions: "Enter what the customer owes and what they handed over. The breakdown uses the fewest bills and coins (largest first).",
    examples: "Example: $100 paid on a $37.42 bill is $62.58 in change — a $50, a $10, two $1 bills, two quarters, a nickel and three pennies (10 pieces).",
    assumptions: "US currency without $2 bills or half dollars. Counting change up from the bill to the amount paid gives the same result.",
    faq: [
      { question: "How do cashiers count back change?", answer: "Start at the price and count up with coins then bills until you reach the amount paid." },
      { question: "Is the penny still in use?", answer: "The US Mint stopped making new pennies in 2025, but existing pennies remain legal tender; some stores now round cash totals to 5 cents." },
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
