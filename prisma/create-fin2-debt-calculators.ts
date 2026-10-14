// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// finance expansion 2 sub-batch "debt". See
// src/lib/calc-engine-fin2-investing.ts for the full list of 9 sub-batches,
// and src/lib/calc-engine-fin2-debt.ts for the math. Each tool is filed in
// the Finance Calculators sub-category the user named for it (created on
// first run).
//
// HOW TO RUN
//   npx tsx prisma/create-fin2-debt-calculators.ts
// or
//   npm run db:create-fin2-debt-calculators

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
const BUSINESS_CATEGORY = { name: "Business Finance Calculators", slug: "business-calculators" };
const BOND_FIXED_INCOME_CATEGORY = { name: "Bond & Fixed Income Calculators", slug: "bond-fixed-income-calculators" };

const money = (key: string, label: string, def: number, required = true) => numberField(key, label, { unit: "$", default: def, min: -100000000000000, max: 100000000000000, step: 1, required });
const bigCur = (key: string, label: string, def: number, required = true) => currencyField(key, label, { default: def, max: 100000000000000, step: 1, required });

const TOOLS: ToolDef[] = [
  {
    slug: "altman-z-score-calculator",
    category: BUSINESS_CATEGORY,
    title: "Altman Z-Score Calculator",
    description: "Calculate the Altman Z-Score to assess a company's risk of bankruptcy — for public manufacturers (Z), private companies (Z') and non-manufacturers (Z'') — and see its zone.",
    metaTitle: "Altman Z-Score Calculator — Bankruptcy Risk (Z, Z', Z'')",
    metaDescription: "Free Altman Z-Score calculator. Score bankruptcy risk from working capital, retained earnings, EBIT, equity and sales, with safe, grey and distress zones.",
    calcInputs: [dropdown("model", "Model", [["Public manufacturer (original Z)", 1], ["Private company (Z')", 2], ["Non-manufacturer / service (Z'')", 3]], 1), money("workingCapital", "Working Capital", 1500000), money("retainedEarnings", "Retained Earnings", 2500000), money("ebit", "EBIT", 1000000), money("equityValue", "Equity — Market Value (book value for Z' and Z'')", 8000000), bigCur("sales", "Sales", 12000000), bigCur("totalAssets", "Total Assets", 10000000), bigCur("totalLiabilities", "Total Liabilities", 6000000)],
    calcResult: { label: "Z-Score", format: "number" },
    calcResults: [num("zScore", "Altman Z-Score", true), num("zone", "Zone (1 Safe, 2 Grey, 3 Distress)"), num("safeAbove", "Safe Zone Above"), num("distressBelow", "Distress Zone Below")],
    instructions: "Pick the model that fits the company and enter figures from its latest balance sheet and income statement. Use market capitalization for the original model and book equity for private and non-manufacturing companies.",
    examples: "Example: working capital $1.5M, retained earnings $2.5M, EBIT $1M, market cap $8M, sales $12M, assets $10M and liabilities $6M give a Z-Score of 2.86 — the grey zone, just below the 2.99 safe line.",
    assumptions: "Z = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E (zones 2.99/1.81); Z' = 0.717A + 0.847B + 3.107C + 0.420D + 0.998E (2.9/1.23); Z'' = 6.56A + 3.26B + 6.72C + 1.05D (2.6/1.1), where A–E are working capital, retained earnings, EBIT, equity ÷ liabilities and sales, each over total assets except D. Not designed for banks or insurers. " + DISCLAIMER,
    faq: [
      { question: "How accurate is the Altman Z-Score?", answer: "In Altman's studies it predicted bankruptcy within two years in roughly 70–90% of cases, but it's a screen, not a verdict." },
      { question: "Why not use it for banks?", answer: "Banks' balance sheets are built on leverage and they report sales differently, which distorts the ratios." },
    ],
  },
  {
    slug: "bond-price-calculator",
    category: BOND_FIXED_INCOME_CATEGORY,
    title: "Bond Price Calculator",
    description: "Calculate a bond's price from its face value, coupon rate, yield to maturity and years to maturity — and whether it trades at a premium, par or discount.",
    metaTitle: "Bond Price Calculator — Price from Yield & Coupon",
    metaDescription: "Free bond price calculator. Discount coupons and face value at the yield to maturity to get the bond's price, premium or discount, and current yield.",
    calcInputs: [currencyField("faceValue", "Face (Par) Value", { default: 1000, max: 1000000000, step: 1 }), percentField("couponRate", "Annual Coupon Rate", { default: 5, max: 50, step: 0.01 }), percentField("yieldToMaturity", "Yield to Maturity", { default: 6, min: -5, max: 50, step: 0.01 }), numberField("yearsToMaturity", "Years to Maturity", { default: 10, min: 0.25, max: 100, step: 0.25 }), dropdown("paymentsPerYear", "Coupon Frequency", [["Semi-annual", 2], ["Annual", 1], ["Quarterly", 4], ["Monthly", 12]], 2)],
    calcResult: { label: "Bond Price", format: "currency" },
    calcResults: [cur("bondPrice", "Bond Price", true), pct("pricePctOfPar", "Price as % of Par"), cur("couponPayment", "Coupon per Payment"), cur("annualCoupon", "Annual Coupon"), pct("currentYield", "Current Yield"), num("pricedAt", "Priced at (1 Premium, 2 Par, 3 Discount)")],
    instructions: "Enter the bond's face value, coupon rate and the market yield to maturity for similar bonds. When market yields are above the coupon, the bond sells at a discount; below, at a premium.",
    examples: "Example: a $1,000 bond paying 5% semi-annually with 10 years left, priced to yield 6%, is worth $925.61 — a discount, with a 5.40% current yield.",
    assumptions: "Price = Σ C ÷ (1 + y/m)^k + F ÷ (1 + y/m)^N on a coupon date (clean price, no accrued interest). Go the other way with the Bond Yield to Maturity Calculator. " + DISCLAIMER,
    faq: [
      { question: "Why do bond prices fall when rates rise?", answer: "Existing bonds pay fixed coupons, so their price must fall until their yield matches newly issued bonds." },
      { question: "What's the difference between clean and dirty price?", answer: "The dirty price adds interest accrued since the last coupon; quotes are usually clean." },
    ],
  },
  {
    slug: "credit-spread-calculator",
    category: BOND_FIXED_INCOME_CATEGORY,
    title: "Credit Spread Calculator",
    description: "Calculate a bond's credit spread over Treasuries in percent and basis points, and the default probability the spread implies.",
    metaTitle: "Credit Spread Calculator — Spread over Treasuries (bps)",
    metaDescription: "Free credit spread calculator. Subtract the Treasury yield from a corporate bond's yield to get the spread in basis points and the implied default probability.",
    calcInputs: [percentField("bondYield", "Corporate Bond Yield", { default: 6.2, min: -5, max: 100, step: 0.01 }), percentField("benchmarkYield", "Treasury Yield (same maturity)", { default: 4.3, min: -5, max: 50, step: 0.01 }), percentField("recoveryRate", "Expected Recovery Rate", { default: 40, step: 1 })],
    calcResult: { label: "Credit Spread", format: "percentage" },
    calcResults: [pct("creditSpread", "Credit Spread", true), num("spreadBasisPoints", "Spread in Basis Points"), pct("impliedDefaultProbability", "Implied Yearly Default Probability")],
    instructions: "Enter the bond's yield and a government bond's yield with the same maturity. The recovery rate is the share of face value bondholders expect to get back in a default (about 40% for senior unsecured bonds).",
    examples: "Example: a 6.20% corporate yield over a 4.30% Treasury is a 1.90% (190 bp) spread. With 40% recovery, that implies about a 3.17% yearly chance of default.",
    assumptions: "Implied default probability ≈ spread ÷ (1 − recovery). Real spreads also pay for liquidity and risk premiums, so this overstates true default risk. " + DISCLAIMER,
    faq: [
      { question: "What is a normal credit spread?", answer: "Investment-grade bonds often trade 0.8–2% over Treasuries; high-yield bonds 3–6%, and much more in a crisis." },
      { question: "What does a widening spread mean?", answer: "Investors see more risk in the issuer or the economy and demand more yield." },
    ],
  },
  {
    slug: "debt-to-asset-ratio-calculator",
    category: BUSINESS_CATEGORY,
    title: "Debt to Asset Ratio Calculator",
    description: "Calculate the debt-to-asset (debt) ratio — the share of a company's assets financed by liabilities — and its equity ratio.",
    metaTitle: "Debt to Asset Ratio Calculator — Debt Ratio",
    metaDescription: "Free debt to asset ratio calculator. Divide total liabilities (or debt) by total assets to see how much of a business is financed with borrowed money.",
    calcInputs: [bigCur("totalLiabilities", "Total Liabilities", 450000), bigCur("totalAssets", "Total Assets", 1000000), bigCur("totalDebt", "Interest-Bearing Debt Only (optional)", 0, false)],
    calcResult: { label: "Debt-to-Asset Ratio", format: "percentage" },
    calcResults: [pct("debtToAssetRatio", "Debt-to-Asset Ratio (liabilities)", true), pct("debtOnlyToAssets", "Debt-Only to Assets"), pct("equityRatio", "Equity Ratio"), cur("equity", "Shareholders' Equity")],
    instructions: "Enter total liabilities and total assets from the balance sheet. Some analysts use only interest-bearing debt — enter it to see both versions.",
    examples: "Example: $450,000 of liabilities against $1,000,000 of assets is a 45% debt-to-asset ratio, so 55% of assets are financed by owners' equity.",
    assumptions: "Debt ratio = total liabilities ÷ total assets. Lenders often look for below about 60%, but norms differ by industry. For your personal debt-to-asset ratio, use the Personal Net Worth Calculator. " + DISCLAIMER,
    faq: [
      { question: "What is a good debt-to-asset ratio?", answer: "Below 0.5 (50%) is generally considered conservative; above 1 means liabilities exceed assets." },
      { question: "How is it different from debt-to-equity?", answer: "Debt-to-asset compares debt with everything owned; debt-to-equity compares it with what owners have put in." },
    ],
  },
  {
    slug: "debt-to-capital-ratio-calculator",
    category: BUSINESS_CATEGORY,
    title: "Debt-to-Capital Ratio Calculator",
    description: "Calculate the debt-to-capital ratio — interest-bearing debt as a share of total capital (debt plus equity) — and the matching debt-to-equity ratio.",
    metaTitle: "Debt-to-Capital Ratio Calculator — Leverage Ratio",
    metaDescription: "Free debt-to-capital ratio calculator. Divide short- and long-term debt by debt plus shareholders' equity to measure financial leverage.",
    calcInputs: [bigCur("shortTermDebt", "Short-Term Debt (incl. current portion)", 100000), bigCur("longTermDebt", "Long-Term Debt", 500000), money("shareholdersEquity", "Shareholders' Equity", 900000)],
    calcResult: { label: "Debt-to-Capital", format: "percentage" },
    calcResults: [cur("totalDebt", "Total Debt"), cur("totalCapital", "Total Capital"), pct("debtToCapital", "Debt-to-Capital Ratio", true), num("debtToEquity", "Debt-to-Equity (×)")],
    instructions: "Enter short-term and long-term interest-bearing debt (including lease liabilities if you treat them as debt) and shareholders' equity.",
    examples: "Example: $600,000 of debt and $900,000 of equity make $1.5M of capital, so debt-to-capital is 40% (debt-to-equity 0.67).",
    assumptions: "Debt-to-capital = debt ÷ (debt + equity). Credit rating agencies use it to judge leverage; above about 60% is usually considered high. " + DISCLAIMER,
    faq: [
      { question: "Should I use book or market value?", answer: "Book values are standard for credit analysis; market values are used for WACC." },
      { question: "Does debt-to-capital include accounts payable?", answer: "No — only interest-bearing debt, unlike the debt-to-asset ratio." },
    ],
  },
  {
    slug: "debt-to-equity-calculator",
    category: BUSINESS_CATEGORY,
    title: "Debt to Equity Calculator",
    description: "Calculate a company's debt-to-equity (D/E) ratio three ways — total liabilities, interest-bearing debt and long-term debt — to judge its financial leverage.",
    metaTitle: "Debt to Equity Calculator — D/E Ratio",
    metaDescription: "Free debt to equity ratio calculator. Divide total liabilities, total debt or long-term debt by shareholders' equity to measure leverage.",
    calcInputs: [bigCur("shortTermDebt", "Short-Term Debt", 100000), bigCur("longTermDebt", "Long-Term Debt", 500000), bigCur("otherLiabilities", "Other Liabilities (payables, accruals)", 200000, false), money("shareholdersEquity", "Shareholders' Equity", 900000)],
    calcResult: { label: "D/E Ratio", format: "number" },
    calcResults: [num("totalLiabilitiesToEquity", "Total Liabilities ÷ Equity"), num("debtToEquity", "Debt ÷ Equity", true), num("longTermDebtToEquity", "Long-Term Debt ÷ Equity")],
    instructions: "Enter the debt and other liabilities from the balance sheet and total shareholders' equity. Many sources quote D/E using total liabilities; others use only interest-bearing debt — both are shown.",
    examples: "Example: $600,000 of debt, $200,000 of other liabilities and $900,000 of equity give a D/E of 0.67 on debt, 0.89 on total liabilities and 0.56 on long-term debt.",
    assumptions: "If equity is negative, D/E isn't meaningful and shows 0. Capital-intensive industries (utilities, telecoms) normally run higher D/E than software. " + DISCLAIMER,
    faq: [
      { question: "What is a good debt-to-equity ratio?", answer: "Roughly 1 to 1.5 is common; below 1 is conservative, above 2 is highly leveraged for most industries." },
      { question: "Can D/E be negative?", answer: "Yes, if equity is negative after losses or large buybacks — a red flag unless the company is very cash-generative." },
    ],
  },
  {
    slug: "defensive-interval-ratio-calculator",
    category: BUSINESS_CATEGORY,
    title: "Defensive Interval Ratio Calculator",
    description: "Calculate the defensive interval ratio — how many days a company could pay its operating expenses from liquid assets alone, without new revenue.",
    metaTitle: "Defensive Interval Ratio Calculator — Days of Liquidity",
    metaDescription: "Free defensive interval ratio calculator. Divide cash, marketable securities and receivables by daily cash expenses to get days of liquidity.",
    calcInputs: [bigCur("cash", "Cash", 150000), bigCur("marketableSecurities", "Marketable Securities", 50000, false), bigCur("receivables", "Accounts Receivable", 100000, false), bigCur("annualOperatingExpenses", "Annual Operating Expenses (incl. COGS)", 1460000), bigCur("nonCashExpenses", "Non-Cash Expenses (depreciation)", 0, false)],
    calcResult: { label: "Defensive Interval (days)", format: "number" },
    calcResults: [cur("defensiveAssets", "Defensive (Liquid) Assets"), cur("dailyCashExpenses", "Daily Cash Expenses"), num("defensiveIntervalDays", "Defensive Interval (days)", true)],
    instructions: "Enter liquid assets and yearly operating expenses, including cost of goods sold. Subtract non-cash expenses such as depreciation and amortisation.",
    examples: "Example: $300,000 of cash, securities and receivables covers $1,460,000 of yearly cash expenses ($4,000 a day) for 75 days.",
    assumptions: "DIR = (cash + marketable securities + receivables) ÷ ((operating expenses − non-cash expenses) ÷ 365). It ignores new revenue and inventory, so it's a stress test. " + DISCLAIMER,
    faq: [
      { question: "What is a good defensive interval?", answer: "It depends on the industry; 30–90 days is common, and more is safer in volatile businesses." },
      { question: "Why exclude inventory?", answer: "Inventory may take time to sell or sell below cost in a crisis, so it isn't counted as immediately available." },
    ],
  },
  {
    slug: "effective-duration-calculator",
    category: BOND_FIXED_INCOME_CATEGORY,
    title: "Effective Duration Calculator",
    description: "Calculate a bond's effective duration and effective convexity from its prices when yields shift up and down, and estimate the price change for any rate move.",
    metaTitle: "Effective Duration Calculator — Duration & Convexity",
    metaDescription: "Free effective duration calculator. Use prices after a yield shift up and down to get effective duration, convexity and the estimated price change.",
    calcInputs: [currencyField("initialPrice", "Current Price (P0)", { default: 1000, max: 1000000000, step: 0.01 }), currencyField("priceIfYieldsFall", "Price if Yields Fall (P−)", { default: 1045, max: 1000000000, step: 0.01 }), currencyField("priceIfYieldsRise", "Price if Yields Rise (P+)", { default: 958, max: 1000000000, step: 0.01 }), numberField("yieldShiftBps", "Yield Shift Used (bps)", { default: 50, min: 1, max: 1000 }), numberField("rateChangeBps", "Rate Change to Estimate (bps, + = rise)", { default: 100, min: -1000, max: 1000 })],
    calcResult: { label: "Effective Duration", format: "number", decimals: 4 },
    calcResults: [num("effectiveDuration", "Effective Duration", true, 4), num("effectiveConvexity", "Effective Convexity"), pct("estimatedPriceChangePct", "Estimated Price Change"), cur("estimatedNewPrice", "Estimated New Price")],
    instructions: "Reprice the bond (from a pricing model or your broker) with yields shifted down and up by the same amount, then enter the three prices and the shift. Effective duration is the right measure for bonds with options, like callable bonds and mortgage-backed securities.",
    examples: "Example: a $1,000 bond that rises to $1,045 or falls to $958 for a 50 bp move has an effective duration of 8.7 and convexity of 120. A 100 bp rise would cut its price about 8.1%, to $919.",
    assumptions: "Duration = (P− − P+) ÷ (2·P0·Δy); convexity = (P− + P+ − 2P0) ÷ (P0·Δy²); %ΔP ≈ −D·Δy + ½·C·Δy². For Macaulay and modified duration from cash flows, use the Interest Rate Sensitivity Calculator. " + DISCLAIMER,
    faq: [
      { question: "Effective duration vs modified duration?", answer: "Modified duration assumes cash flows don't change with rates; effective duration allows for calls, prepayments and other options." },
      { question: "What does negative convexity mean?", answer: "The bond gains less when rates fall than it loses when they rise — typical of callable bonds and MBS." },
    ],
  },
  {
    slug: "lgd-calculator",
    category: BOND_FIXED_INCOME_CATEGORY,
    title: "LGD Calculator",
    description: "Calculate loss given default (LGD) from exposure at default, collateral and recoveries — and the expected credit loss with a probability of default.",
    metaTitle: "LGD Calculator — Loss Given Default & Expected Loss",
    metaDescription: "Free loss given default calculator. Find LGD from exposure, collateral after haircut and recovery costs, then expected loss = PD × LGD × EAD.",
    calcInputs: [bigCur("exposureAtDefault", "Exposure at Default (EAD)", 500000), bigCur("collateralValue", "Collateral Value", 300000, false), percentField("haircut", "Collateral Haircut (forced-sale discount)", { default: 25, step: 1, required: false }), bigCur("otherRecoveries", "Other Recoveries (guarantees, payments)", 20000, false), bigCur("recoveryCosts", "Recovery Costs (legal, collection)", 15000, false), percentField("probabilityOfDefault", "Probability of Default (PD)", { default: 2, step: 0.01 })],
    calcResult: { label: "LGD %", format: "percentage" },
    calcResults: [cur("netRecovery", "Net Recovery"), pct("recoveryRate", "Recovery Rate"), cur("lossGivenDefault", "Loss Given Default ($)"), pct("lgdPercent", "LGD %", true), cur("expectedLoss", "Expected Loss (PD × LGD × EAD)")],
    instructions: "Enter what the borrower owes at default, the collateral's value and how much less it would fetch in a forced sale, other expected recoveries and the cost of collecting. Add a probability of default for the expected loss.",
    examples: "Example: a $500,000 loan with $300,000 of collateral at a 25% haircut, $20,000 of other recoveries and $15,000 of costs recovers $230,000 — an LGD of 54%. With a 2% PD, expected loss is $5,400.",
    assumptions: "LGD = 1 − net recovery ÷ EAD; recoveries are not discounted for time. Basel's foundation approach uses 45% LGD for senior unsecured corporate claims. " + DISCLAIMER,
    faq: [
      { question: "What is a typical LGD?", answer: "About 40–45% for senior unsecured corporate debt, lower for well-secured loans and higher for subordinated debt." },
      { question: "How is LGD used?", answer: "Banks multiply PD × LGD × EAD to estimate expected credit losses and set capital and provisions (IFRS 9, CECL)." },
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
