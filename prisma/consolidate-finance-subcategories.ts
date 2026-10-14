// Consolidates the Finance Calculators sub-categories (14 Oct 2026). The
// user asked to cut Finance's 42 sub-categories: every sub-category with
// fewer than 10 tools, and every one that duplicates an older sub-category,
// is merged into the closest established sub-category, then deleted.
//
// The 25 removed sub-categories were all created by the four finance
// expansions earlier the same day (create-fin-*, create-fin2-*, create-fin3-*,
// create-fin4-*); those scripts now file each tool straight into the target
// below, so re-running them won't recreate the old sub-categories. What's
// left under Finance: the 15 original sub-categories plus Microeconomics and
// Macroeconomics (17 in total).
//
// HOW TO RUN
//   npx tsx prisma/consolidate-finance-subcategories.ts            (report only)
//   npx tsx prisma/consolidate-finance-subcategories.ts --apply    (make the changes)
// or
//   npm run db:consolidate-finance-subcategories -- --apply
//
// In apply mode a JSON backup of every category and each tool's category is
// written to prisma/backups/ first. Safe to re-run: tools already in their
// target are left alone, and only empty sub-categories are deleted.

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

// Sub-categories removed from Finance Calculators.
const REMOVED = [
    "financial-calculators", "tax-duties-calculators", "sales-calculators", "uk-finance-calculators",
    "revenue-sales-calculators", "financial-investment-calculators", "additional-financial-calculators",
    "salary-wages-calculators", "derivatives-investment-calculators", "demand-elasticity-calculators",
    "growth-productivity-calculators", "profitability-cost-calculators", "debt-management-calculators",
    "indian-finance-calculators", "other-finance-calculators", "investment-depreciation-calculators",
    "miscellaneous-finance-calculators", "debt-investment-calculators", "business-financial-ratios",
    "tax-salary-calculators", "mortgage-real-estate-calculators", "personal-finance-calculators",
    "general-investment-calculators", "equity-investment-calculators", "business-planning-calculators",
];

// Target sub-category slug -> tool slugs moved into it.
const MOVES_BY_KEY: Record<string, string[]> = {
  "finance-calculators": [
    "paypal-fee-calculator", "check-digit-calculator", "margin-with-discount-calculator", "ctr-calculator",
    "youtube-revenue-calculator", "sales-percentage-calculator", "million-to-billion-converter",
    "labor-cost-calculator", "employee-cost-calculator", "discount-calculator", "customer-effort-score-calculator",
    "trir-calculator", "remote-vs-on-location-workers-calculator", "macrs-depreciation-calculator",
    "depreciation-calculator", "units-of-production-depreciation-calculator", "fifo-lifo-calculator",
    "cpc-calculator", "cpm-calculator", "nps-calculator", "margin-of-error-calculator", "altman-z-score-calculator",
    "debt-to-asset-ratio-calculator", "debt-to-capital-ratio-calculator", "debt-to-equity-calculator",
    "defensive-interval-ratio-calculator", "wacc-calculator", "cost-of-equity-calculator", "roas-calculator",
    "stock-ratios-calculator", "liquidity-ratios-calculator", "debt-ratios-calculator",
    "profitability-ratios-calculator", "operations-ratios-calculator", "change-calculator",
    "round-to-nearest-dollar-or-cent-calculator", "nopat-calculator", "ttm-calculator",
    "year-over-year-growth-calculator", "market-value-added-calculator", "dupont-analysis-calculator",
    "economic-value-added-calculator", "roic-calculator", "sustainable-growth-rate-calculator",
    "operating-cash-flow-ratio-calculator", "bounce-rate-calculator", "exit-rate-calculator",
    "conversion-rate-calculator", "website-ad-revenue-calculator", "grp-calculator", "churn-rate-calculator",
    "saas-metrics-calculator", "software-contract-value-calculator", "sell-through-rate-calculator",
    "gmroi-calculator", "absence-percentage-calculator", "bradford-factor-calculator", "turnover-rate-calculator",
    "fte-calculator", "man-hours-calculator", "days-off-calculator", "tenure-calculator", "smokers-ctc-calculator",
    "burndown-chart-calculator", "3d-printer-buy-vs-outsource-calculator", "build-vs-buy-calculator",
    "business-budget-calculator", "cost-function-calculator", "cost-of-doing-business-calculator",
    "direct-material-price-variance-calculator", "price-quantity-calculator", "lemonade-stand-calculator",
    "parking-ratio-calculator", "effective-corporate-tax-rate-calculator", "additional-funds-needed-calculator",
    "evm-calculator", "emv-calculator", "operating-asset-turnover-calculator",
    "pre-and-post-money-valuation-calculator", "pvgo-calculator",
  ],
  "investment-returns-planning-calculators": [
    "inflation-calculator", "irr-calculator", "npv-calculator", "future-value-of-annuity-calculator",
    "expected-utility-calculator", "discount-rate-calculator", "hedge-ratio-calculator",
    "information-ratio-calculator", "jensens-alpha-calculator", "sortino-ratio-calculator",
    "treynor-ratio-calculator", "value-at-risk-calculator", "perpetuity-calculator", "pvifa-calculator",
    "future-value-of-cash-flows-calculator",
  ],
  "stock-options-calculators": [
    "black-scholes-calculator", "options-spread-calculator", "put-call-parity-calculator",
    "fibonacci-retracement-calculator", "pivot-point-calculator", "rsi-calculator", "earnings-per-share-calculator",
    "discounted-cash-flow-calculator", "beta-calculator", "moving-average-calculator", "free-float-calculator",
    "market-capitalization-calculator", "stock-split-calculator", "dividend-discount-model-calculator",
    "graham-number-calculator", "margin-of-safety-calculator", "peg-ratio-calculator",
    "price-to-book-ratio-calculator", "price-to-cash-flow-ratio-calculator", "price-to-sales-ratio-calculator",
    "ebitda-multiple-calculator", "ev-to-sales-calculator", "dividend-payout-ratio-calculator",
    "residual-income-calculator", "portfolio-beta-calculator", "unlevered-beta-calculator",
  ],
  "bond-fixed-income-calculators": [
    "forward-rate-calculator", "bond-price-calculator", "credit-spread-calculator", "effective-duration-calculator",
    "lgd-calculator",
  ],
  "fund-etf-calculators": [
    "swp-calculator", "lumpsum-calculator", "sip-calculator", "bitcoin-etf-calculator", "nav-calculator",
  ],
  "alternative-investment-calculators": [
    "gold-melt-calculator", "silver-melt-calculator", "carried-interest-calculator",
  ],
  "interest-rate-calculators": [
    "finance-calculator", "basis-point-calculator",
  ],
  "savings-calculators": [
    "ppf-calculator", "529-calculator", "trump-accounts-calculator",
  ],
  "retirement-calculators": [
    "atal-pension-yojana-calculator", "national-pension-system-calculator",
  ],
  "tax-calculators": [
    "agi-calculator", "zakat-calculator", "amt-calculator", "child-tax-credit-calculator", "magi-calculator",
    "lottery-tax-calculator", "lottery-payout-calculator", "stimulus-check-calculator",
  ],
  "canada-tax-salary-calculators": [
    "gst-qst-calculator",
  ],
  "india-tax-salary-calculators": [
    "elss-calculator", "hra-exemption-calculator", "tds-interest-calculator",
  ],
  "salary-income-calculators": [
    "va-disability-calculator", "future-salary-calculator", "12-hour-shift-pay-calculator",
    "billable-hours-calculator", "prorated-salary-calculator", "selling-leave-days-calculator",
    "california-overtime-calculator", "lifetime-earnings-calculator", "unpaid-work-calculator",
    "us-income-percentile-calculator", "unemployment-benefit-calculator",
  ],
  "credit-debt-calculators": [
    "credit-utilization-calculator", "debt-avalanche-calculator", "deferred-payment-loan-calculator",
    "finance-charge-calculator", "post-judgment-interest-calculator",
  ],
  "real-estate-calculators": [
    "price-per-square-foot-calculator", "affo-calculator", "commercial-lease-calculator",
    "net-effective-rent-calculator", "occupancy-rate-calculator", "prorated-rent-calculator",
    "rental-commission-calculator", "realtor-commission-calculator-with-vat", "earnest-money-calculator",
    "gift-of-equity-calculator", "what-to-offer-on-a-house-calculator",
  ],
  "refinance-home-equity-calculators": [
    "mortgage-penalty-calculator",
  ],
  "mortgage-payment-type-calculators": [
    "mortgage-rate-calculator",
  ],
  "home-buyer-program-calculators": [
    "pag-ibig-housing-loan-calculator",
  ],
  "budgeting-methods-calculators": [
    "bank-reconciliation-calculator", "adding-machine-calculator", "checkbook-balance-calculator",
  ],
  "household-family-expense-calculators": [
    "water-bill-calculator", "tip-calculator",
  ],
  "money-saving-calculators": [
    "money-counter-calculator",
  ],
  "business-specialty-insurance-calculators": [
    "combined-ratio-calculator",
  ],
  "car-buying-selling-calculators": [
    "out-the-door-price-calculator",
  ],
  "currency-exchange-forex-calculators": [
    "uk-coin-weight-calculator", "pence-to-pounds-converter",
  ],
  "economics-calculators": [
    "price-elasticity-of-demand-calculator", "income-elasticity-of-demand-calculator",
    "cross-price-elasticity-calculator", "consumer-surplus-calculator", "marginal-cost-calculator",
    "marginal-revenue-calculator", "maximum-profit-calculator", "deadweight-loss-calculator",
    "opportunity-cost-calculator", "hhi-calculator", "lerner-index-calculator",
  ],
  "economics-calculators-macro": [
    "mpc-calculator", "comparative-advantage-calculator", "gdp-calculator", "gdp-per-capita-calculator",
    "unemployment-rate-calculator", "growth-rate-calculator", "apc-calculator",
  ],
};

// Business Finance and the two economics sub-categories were folded further the same
// day (see flatten-business-finance-and-merge-economics.ts), so those targets now
// point at the Finance main category and Economics Calculators.
const MOVES: Record<string, string[]> = {};
for (const [key, slugs] of Object.entries(MOVES_BY_KEY)) {
  const target = key.replace(/-macro$/, "");
  MOVES[target] = [...(MOVES[target] ?? []), ...slugs];
}

async function main() {
  console.log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  const cats = await prisma.toolCategory.findMany({ select: { id: true, name: true, slug: true, parentId: true } });
  const tools = await prisma.tool.findMany({ select: { id: true, slug: true, categoryId: true } });
  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  const toolBySlug = new Map(tools.map((t) => [t.slug, t]));

  if (APPLY) {
    const dir = path.join(__dirname, "backups");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `tool-categories-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(file, JSON.stringify({ categories: cats, tools }, null, 2));
    console.log(`Backup written: ${file}`);
  }

  let moved = 0;
  let already = 0;
  for (const [targetSlug, slugs] of Object.entries(MOVES)) {
    const target = bySlug.get(targetSlug);
    if (!target) throw new Error(`Target sub-category "${targetSlug}" doesn't exist — nothing changed for it.`);
    for (const slug of slugs) {
      const tool = toolBySlug.get(slug);
      if (!tool) {
        console.log(`  (skip) tool ${slug} not found`);
        continue;
      }
      if (tool.categoryId === target.id) {
        already++;
        continue;
      }
      if (APPLY) await prisma.tool.update({ where: { id: tool.id }, data: { categoryId: target.id } });
      moved++;
    }
    console.log(`${APPLY ? "Moved" : "Would move"} into ${target.name}: ${slugs.length} tool(s)`);
  }

  // Any tool still sitting in a removed sub-category blocks its deletion.
  const removedIds = new Set(REMOVED.map((s) => bySlug.get(s)?.id).filter(Boolean));
  const mapped = new Set(Object.values(MOVES).flat());
  const strays = tools.filter((t) => t.categoryId && removedIds.has(t.categoryId) && !mapped.has(t.slug));
  for (const t of strays) console.log(`  WARNING: ${t.slug} is in a removed sub-category but has no target — that sub-category is kept.`);

  let deleted = 0;
  for (const slug of REMOVED) {
    const cat = bySlug.get(slug);
    if (!cat) continue;
    const blocked = strays.some((t) => t.categoryId === cat.id) || cats.some((c) => c.parentId === cat.id);
    if (blocked) continue;
    if (APPLY) {
      await prisma.seoMeta.deleteMany({ where: { toolCategoryId: cat.id } });
      await prisma.toolCategory.delete({ where: { id: cat.id } });
    }
    deleted++;
    console.log(`${APPLY ? "Deleted" : "Would delete"} sub-category "${cat.name}" (/${slug})`);
  }

  console.log(`Done: ${moved} tool(s) ${APPLY ? "moved" : "to move"}, ${already} already in place, ${deleted} sub-categor${deleted === 1 ? "y" : "ies"} ${APPLY ? "deleted" : "to delete"}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
