// Organizes every tool category into the user's final taxonomy (27 Sep
// 2026) and removes any category that isn't part of it:
//
//   Finance Calculators (main category)
//     +- Loan Calculators
//     |    +- General Loan Calculators          (added 2 Oct 2026 — the user
//     |    +- Personal Loan Calculators          asked for Loan Calculators to
//     |    +- Auto & Vehicle Loan Calculators    be split into 5 sub-categories
//     |    +- Home Improvement Loan Calculators  with the 98-tool loan
//     |    +- Short-Term & High-Cost Loan        expansion; every existing loan
//     |       Calculators                        tool moves into one of them)
//     +- Mortgage Calculators
//     |    +- Mortgage Payment & Type Calculators       (added 5 Oct 2026 —
//     |    +- Refinance & Home Equity Calculators         the user approved
//     |    +- Home Buyer Program Calculators              splitting Mortgage
//     |    +- Property & Construction Mortgage            into 5 sub-categories
//     |       Calculators                                 with the 37-tool
//     |    +- Mortgage Cost & Insurance Calculators       mortgage expansion)
//     +- Interest Calculators
//     +- Investment Calculators
//     |    +- Investment Returns & Planning Calculators  (added 5 Oct 2026 —
//     |    +- Stock & Options Calculators                  the user approved
//     |    +- Bond & Fixed Income Calculators              splitting Investment
//     |    +- Fund & ETF Calculators                       into 5 sub-categories
//     |    +- Alternative Investment Calculators           with the 40-tool
//     |                                                    investment expansion)
//     +- Savings Calculators
//     +- Retirement Calculators
//     +- Tax Calculators
//     |    +- the 12 country/state tax categories (UK, Canada, US states =
//     |       "Tax & Paycheck Calculators", ...) — kept as a third level
//     |       because Tax holds ~950 tools (the user chose this, "Plan B")
//     +- Credit & Debt Calculators
//     +- Salary & Income Calculators
//     +- Business Finance Calculators
//     +- Real Estate Calculators
//     +- Currency & Exchange Calculators
//     +- Budget Calculators                      (added 5 Oct 2026 with the
//     |    +- Budgeting Methods & Planning        84-tool budget expansion; all
//     |    +- Household & Family Expense          its tools are new, filed by
//     |    +- Life Events & Travel Budget         their create scripts)
//     |    +- Money-Saving & Spending
//     |    +- Net Worth & Cost of Living
//     +- Insurance Calculators                   (added 5 Oct 2026 with the
//     |    +- Life Insurance                      73-tool insurance expansion;
//     |    +- Health Insurance                    homeowners-insurance-calculator
//     |    +- Auto & Vehicle Insurance            moves here from Real Estate)
//     |    +- Home & Property Insurance
//     |    +- Business & Specialty Insurance
//     +- Car & Vehicle Cost Calculators          (added 6 Oct 2026 with the
//     |    +- Car Buying & Selling                88-tool car cost expansion; all
//     |    +- Car Lease, Rental & Transport       its tools are new, filed by
//     |    +- Car Ownership, Fuel & EV Cost       their create scripts)
//     |    +- Car Maintenance, Repair & Upgrade
//     |    +- Vehicle Business Use & Income
//   Math Calculators (main category, new — home of percentage-calculator)
//
// Plus two tool moves the user asked for: business-loan-calculator from
// Business Finance to Loan Calculators, and the original sample
// percentage-calculator (filed directly under Finance) to Math Calculators.
//
// EMPTY CATEGORIES ARE DELETED. Per the user (27 Sep 2026), any category
// with no tools in it or anywhere beneath it is removed — including one of
// the sub-categories listed above if it has no tools yet — and a missing
// sub-category is not created empty. A category is only created when a tool
// is moved into it. (A few extra empty categories — Budget, Insurance, Auto
// & Car, Crypto, Health & Fitness, Date & Time, Unit Conversion — were
// briefly part of this list and were dropped at the user's request; the
// cleanup below removes them if they were ever created.) Tools in any
// status, drafts included, count — a category holding only drafts is kept.
//
// SAFE BY DEFAULT
//   npm run db:organize-categories            -> REPORT ONLY, changes nothing
//   npm run db:organize-categories -- --apply -> makes the changes
// With --apply, a full backup of every category and every tool's category
// is written to prisma/backups/ first, so the previous state can be
// restored by hand if anything looks wrong.
//
// What it will NOT do on its own: guess where a tool from an unknown
// category belongs. Any category outside the taxonomy that still holds
// tools (e.g. one created by hand in /admin) is left in place and listed in
// the report, so the user can decide. Menu links pointing at a deleted
// category page are listed too.
//
// Tool URLs (/tools/<slug>) don't include the category, so moving a tool
// never changes its link. A deleted category's own page
// (/tools/category/<slug>) does disappear — the report lists those slugs
// so redirects can be added.

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");

const FINANCE_SLUGS = ["finance-calculators", "finance"]; // first match wins
const FINANCE_NAME = "Finance Calculators";

const FINANCE_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "Loan Calculators", slug: "loan-calculators" },
  { name: "Mortgage Calculators", slug: "mortgage-calculators" },
  { name: "Interest Calculators", slug: "interest-calculators" },
  { name: "Investment Calculators", slug: "investment-calculators" },
  { name: "Savings Calculators", slug: "savings-calculators" },
  { name: "Retirement Calculators", slug: "retirement-calculators" },
  { name: "Tax Calculators", slug: "tax-calculators" },
  { name: "Credit & Debt Calculators", slug: "credit-debt-calculators" },
  { name: "Salary & Income Calculators", slug: "salary-income-calculators" },
  { name: "Business Finance Calculators", slug: "business-finance-calculators" },
  { name: "Real Estate Calculators", slug: "real-estate-calculators" },
  { name: "Currency & Exchange Calculators", slug: "currency-exchange-calculators" },
  { name: "Crypto Calculators", slug: "crypto-calculators" },
  // Added 5 Oct 2026 with the 84-tool budget expansion; its create scripts
  // make it (and its sub-categories) on first run.
  { name: "Budget Calculators", slug: "budget-calculators" },
  // Added 5 Oct 2026 with the 73-tool insurance expansion.
  { name: "Insurance Calculators", slug: "insurance-calculators" },
  // Added 6 Oct 2026 with the 88-tool car cost expansion.
  { name: "Car & Vehicle Cost Calculators", slug: "car-vehicle-cost-calculators" },
];

// Kept under Tax Calculators when they exist; never created empty (a
// country only gets a category once it has tools).
const TAX_COUNTRY_SLUGS = [
  "australia-tax-salary-calculators",
  "canada-tax-salary-calculators",
  "hong-kong-tax-salary-calculators",
  "india-tax-salary-calculators",
  "malaysia-tax-salary-calculators",
  "new-zealand-tax-salary-calculators",
  "pakistan-tax-salary-calculators",
  "philippines-tax-salary-calculators",
  "singapore-tax-salary-calculators",
  "south-africa-tax-salary-calculators",
  "tax-paycheck-calculators",
  "uk-tax-salary-calculators",
];

// Top-level categories besides Finance Calculators.
const OTHER_MAIN_CATEGORIES: { name: string; slug: string }[] = [{ name: "Math Calculators", slug: "math-calculators" }];

// Sub-categories of Loan Calculators (added 2 Oct 2026). Tools are filed at
// the leaf level, so once these exist Loan Calculators itself holds none.
const LOAN_PARENT_SLUG = "loan-calculators";
const LOAN_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "General Loan Calculators", slug: "general-loan-calculators" },
  { name: "Personal Loan Calculators", slug: "personal-loan-calculators" },
  { name: "Auto & Vehicle Loan Calculators", slug: "auto-vehicle-loan-calculators" },
  { name: "Home Improvement Loan Calculators", slug: "home-improvement-loan-calculators" },
  { name: "Short-Term & High-Cost Loan Calculators", slug: "short-term-loan-calculators" },
];

// Where each of the 58 loan tools that existed before the split goes. (The
// 98 new loan tools are filed by their own create-loan-*-calculators.ts
// scripts.)
const LOAN_TOOL_GROUPS: Record<string, string[]> = {
  "general-loan-calculators": [
    // calc-engine-loan-core.ts
    "loan-calculator", "loan-payment-calculator", "monthly-loan-payment-calculator", "emi-calculator",
    "installment-loan-calculator", "loan-repayment-calculator", "amortization-calculator", "loan-interest-calculator",
    "total-loan-cost-calculator", "simple-interest-loan-calculator", "compound-interest-loan-calculator",
    // calc-engine-loan-solve.ts
    "loan-amount-calculator", "loan-principal-calculator", "loan-term-calculator", "loan-rate-calculator",
    "loan-apr-calculator", "loan-affordability-calculator", "loan-eligibility-calculator", "loan-balance-calculator",
    "remaining-loan-balance-calculator", "loan-maturity-calculator",
    // calc-engine-loan-payoff-refinance.ts
    "loan-payoff-calculator", "extra-loan-payment-calculator", "early-loan-payoff-calculator", "loan-prepayment-calculator",
    "loan-refinance-calculator", "loan-refinance-savings-calculator", "loan-break-even-calculator", "balloon-loan-calculator",
    "interest-only-loan-calculator", "loan-comparison-calculator", "fixed-vs-variable-rate-loan-calculator",
    // calc-engine-loan-types.ts (general ones)
    "secured-vs-unsecured-loan-calculator", "long-term-loan-calculator",
    // business & student loans
    "business-loan-calculator", "business-loan-payment-calculator", "business-loan-interest-calculator",
    "business-loan-payoff-calculator", "business-loan-apr-calculator", "business-loan-affordability-calculator",
    "business-loan-emi-calculator", "working-capital-loan-calculator", "equipment-loan-calculator",
    "student-loan-calculator", "student-loan-payoff-calculator", "student-loan-refinance-calculator",
    "business-loan-amortization-calculator", "business-loan-comparison-calculator", "business-loan-refinance-calculator",
    "commercial-loan-calculator",
  ],
  "personal-loan-calculators": [
    "personal-loan-calculator", "personal-loan-refinance-calculator", "personal-loan-extra-payment-calculator",
    "personal-loan-apr-calculator",
  ],
  "auto-vehicle-loan-calculators": ["auto-loan-calculator", "auto-loan-payoff-calculator", "auto-loan-refinance-calculator"],
  "short-term-loan-calculators": ["short-term-loan-calculator"],
};

// Sub-categories of Mortgage Calculators (added 5 Oct 2026). As with Loan,
// tools are filed at the leaf level once these exist.
const MORTGAGE_PARENT_SLUG = "mortgage-calculators";
const MORTGAGE_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "Mortgage Payment & Type Calculators", slug: "mortgage-payment-type-calculators" },
  { name: "Refinance & Home Equity Calculators", slug: "refinance-home-equity-calculators" },
  { name: "Home Buyer Program Calculators", slug: "home-buyer-program-calculators" },
  { name: "Property & Construction Mortgage Calculators", slug: "property-construction-mortgage-calculators" },
  { name: "Mortgage Cost & Insurance Calculators", slug: "mortgage-cost-insurance-calculators" },
];

// Where each of the 67 mortgage tools that existed before the split goes.
// (The 37 new mortgage tools are filed by their own create scripts.)
const MORTGAGE_TOOL_GROUPS: Record<string, string[]> = {
  "mortgage-payment-type-calculators": [
    "mortgage-calculator", "mortgage-interest-calculator", "home-loan-calculator", "mortgage-amortization-calculator",
    "mortgage-payoff-calculator", "debt-to-income-dti-mortgage-calculator", "extra-mortgage-payment-calculator",
    "mortgage-prepayment-calculator", "biweekly-mortgage-payment-calculator", "15-year-vs-30-year-mortgage-calculator",
    "mortgage-term-comparison-calculator", "fixed-rate-mortgage-calculator", "adjustable-rate-mortgage-arm-calculator",
    "fixed-rate-vs-arm-calculator", "interest-only-mortgage-calculator", "balloon-mortgage-calculator",
    "jumbo-mortgage-calculator", "mortgage-comparison-calculator",
  ],
  "refinance-home-equity-calculators": [
    "mortgage-refinance-calculator", "refinance-break-even-calculator", "cash-out-refinance-calculator",
    "mortgage-recast-calculator",
    "bridge-loan-calculator", "bridge-loan-payment-calculator", "bridge-loan-payoff-calculator",
    "bridge-loan-interest-calculator", "bridge-loan-affordability-calculator", "bridge-loan-comparison-calculator",
    "bridge-loan-eligibility-calculator",
  ],
  "home-buyer-program-calculators": [
    "fha-loan-calculator", "va-loan-calculator", "usda-loan-calculator", "first-time-home-buyer-mortgage-calculator",
    "down-payment-assistance-loan-calculator", "down-payment-assistance-loan-payment-calculator",
    "down-payment-assistance-loan-payoff-calculator", "down-payment-assistance-loan-interest-calculator",
    "down-payment-assistance-loan-affordability-calculator", "down-payment-assistance-loan-comparison-calculator",
    "down-payment-assistance-loan-eligibility-calculator",
  ],
  "property-construction-mortgage-calculators": [
    "construction-loan-calculator", "construction-loan-payment-calculator", "construction-loan-payoff-calculator",
    "construction-loan-refinance-calculator", "construction-loan-apr-calculator", "construction-loan-affordability-calculator",
    "construction-loan-eligibility-calculator", "construction-loan-interest-calculator",
    "construction-loan-early-payoff-calculator", "construction-loan-comparison-calculator",
    "construction-loan-amortization-calculator", "construction-loan-prequalification-calculator",
    "construction-loan-total-cost-calculator",
    "commercial-real-estate-loan-payment-calculator", "commercial-real-estate-loan-payoff-calculator",
    "commercial-real-estate-loan-refinance-calculator", "commercial-real-estate-loan-apr-calculator",
    "commercial-real-estate-loan-interest-calculator", "commercial-real-estate-loan-comparison-calculator",
    "commercial-real-estate-loan-amortization-calculator", "commercial-real-estate-loan-total-cost-calculator",
  ],
  "mortgage-cost-insurance-calculators": [
    "mortgage-apr-calculator", "mortgage-points-calculator", "mortgage-discount-points-break-even-calculator",
    "private-mortgage-insurance-pmi-calculator", "loan-to-value-ltv-calculator", "mortgage-tax-deduction-calculator",
  ],
};

// Sub-categories of Investment Calculators (added 5 Oct 2026). As with Loan
// and Mortgage, tools are filed at the leaf level once these exist.
const INVESTMENT_PARENT_SLUG = "investment-calculators";
const INVESTMENT_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "Investment Returns & Planning Calculators", slug: "investment-returns-planning-calculators" },
  { name: "Stock & Options Calculators", slug: "stock-options-calculators" },
  { name: "Bond & Fixed Income Calculators", slug: "bond-fixed-income-calculators" },
  { name: "Fund & ETF Calculators", slug: "fund-etf-calculators" },
  { name: "Alternative Investment Calculators", slug: "alternative-investment-calculators" },
];

// Where each of the 56 investment tools that existed before the split goes.
// (The 40 new investment tools are filed by their own create scripts.)
const INVESTMENT_TOOL_GROUPS: Record<string, string[]> = {
  "investment-returns-planning-calculators": [
    "investment-calculator", "compound-interest-calculator", "simple-interest-calculator", "cagr-calculator",
    "dollar-cost-averaging-calculator", "compound-investment-calculator", "investment-growth-calculator",
    "investment-goal-calculator", "investment-contribution-calculator", "investment-time-horizon-calculator",
    "investment-future-value-calculator", "investment-present-value-calculator",
    "lump-sum-vs-dollar-cost-averaging-calculator", "rule-of-72-calculator", "investment-doubling-time-calculator",
    "portfolio-allocation-calculator", "portfolio-rebalancing-calculator", "weighted-portfolio-return-calculator",
    "portfolio-expected-return-calculator", "portfolio-standard-deviation-calculator", "sharpe-ratio-calculator",
    "investment-fee-calculator", "investment-fee-impact-calculator", "inflation-adjusted-return-calculator",
    "real-rate-of-return-calculator", "nominal-vs-real-return-calculator", "investment-return-calculator",
    "portfolio-return-calculator", "annualized-return-calculator", "holding-period-return-calculator",
    "total-return-calculator", "average-annual-return-calculator", "expected-return-calculator",
    "required-rate-of-return-calculator", "risk-adjusted-return-calculator",
    "break-even-investment-return-calculator", "portfolio-growth-calculator",
  ],
  "stock-options-calculators": [
    "dividend-calculator", "stock-profit-calculator", "stock-return-calculator", "stock-loss-calculator",
    "stock-average-price-calculator", "stock-cost-basis-calculator", "stock-break-even-calculator",
    "stock-investment-calculator", "dividend-yield-calculator", "dividend-reinvestment-calculator",
    "dividend-growth-calculator",
  ],
  "fund-etf-calculators": [
    "expense-ratio-calculator",
  ],
  "bond-fixed-income-calculators": [
    "bond-interest-calculator", "treasury-bill-calculator", "bond-yield-to-maturity-calculator",
    "interest-rate-sensitivity-calculator", "sukuk-profit-rate-calculator", "series-i-bond-calculator",
    "series-ee-bond-calculator",
  ],
};

// Sub-categories of Budget Calculators (added 5 Oct 2026). No existing tool
// moves here; the create-budget-* scripts file their tools directly.
const BUDGET_PARENT_SLUG = "budget-calculators";
const BUDGET_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "Budgeting Methods & Planning Calculators", slug: "budgeting-methods-calculators" },
  { name: "Household & Family Expense Calculators", slug: "household-family-expense-calculators" },
  { name: "Life Events & Travel Budget Calculators", slug: "life-events-travel-budget-calculators" },
  { name: "Money-Saving & Spending Calculators", slug: "money-saving-calculators" },
  { name: "Net Worth & Cost of Living Calculators", slug: "net-worth-cost-of-living-calculators" },
];

// Sub-categories of Insurance Calculators (added 5 Oct 2026).
const INSURANCE_PARENT_SLUG = "insurance-calculators";
const INSURANCE_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "Life Insurance Calculators", slug: "life-insurance-calculators" },
  { name: "Health Insurance Calculators", slug: "health-insurance-calculators" },
  { name: "Auto & Vehicle Insurance Calculators", slug: "auto-vehicle-insurance-calculators" },
  { name: "Home & Property Insurance Calculators", slug: "home-property-insurance-calculators" },
  { name: "Business & Specialty Insurance Calculators", slug: "business-specialty-insurance-calculators" },
];

// The one existing tool that moves into Insurance (from Real Estate).
const INSURANCE_TOOL_GROUPS: Record<string, string[]> = {
  "home-property-insurance-calculators": ["homeowners-insurance-calculator"],
};

// Sub-categories of Car & Vehicle Cost Calculators (added 6 Oct 2026). No
// existing tool moves here; the create-car-* scripts file their tools directly.
const CAR_PARENT_SLUG = "car-vehicle-cost-calculators";
const CAR_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "Car Buying & Selling Calculators", slug: "car-buying-selling-calculators" },
  { name: "Car Lease, Rental & Transport Calculators", slug: "car-lease-rental-transport-calculators" },
  { name: "Car Ownership, Fuel & EV Cost Calculators", slug: "car-ownership-fuel-ev-cost-calculators" },
  { name: "Car Maintenance, Repair & Upgrade Calculators", slug: "car-maintenance-repair-upgrade-calculators" },
  { name: "Vehicle Business Use & Income Calculators", slug: "vehicle-business-use-income-calculators" },
];

// Finance sub-categories that are split one level further.
const SPLITS: { parentSlug: string; subs: { name: string; slug: string }[] }[] = [
  { parentSlug: LOAN_PARENT_SLUG, subs: LOAN_SUBCATEGORIES },
  { parentSlug: MORTGAGE_PARENT_SLUG, subs: MORTGAGE_SUBCATEGORIES },
  { parentSlug: INVESTMENT_PARENT_SLUG, subs: INVESTMENT_SUBCATEGORIES },
  { parentSlug: BUDGET_PARENT_SLUG, subs: BUDGET_SUBCATEGORIES },
  { parentSlug: INSURANCE_PARENT_SLUG, subs: INSURANCE_SUBCATEGORIES },
  { parentSlug: CAR_PARENT_SLUG, subs: CAR_SUBCATEGORIES },
];

// tool slug -> category slug it must end up in.
const TOOL_MOVES: Record<string, string> = {
  ...Object.fromEntries(Object.entries(LOAN_TOOL_GROUPS).flatMap(([cat, slugs]) => slugs.map((slug) => [slug, cat]))),
  ...Object.fromEntries(Object.entries(MORTGAGE_TOOL_GROUPS).flatMap(([cat, slugs]) => slugs.map((slug) => [slug, cat]))),
  ...Object.fromEntries(Object.entries(INVESTMENT_TOOL_GROUPS).flatMap(([cat, slugs]) => slugs.map((slug) => [slug, cat]))),
  ...Object.fromEntries(Object.entries(INSURANCE_TOOL_GROUPS).flatMap(([cat, slugs]) => slugs.map((slug) => [slug, cat]))),
  "percentage-calculator": "math-calculators",
  // Moved 28 Sep 2026 with the Retirement Calculators batch (user request).
  "retirement-savings-goal-calculator": "retirement-calculators",
  // Moved 29 Sep 2026 with the Crypto Calculators batch (user request: the
  // whole currency/forex/crypto list lives under Crypto Calculators).
  "currency-converter": "crypto-calculators",
  "forex-profit-loss-calculator": "crypto-calculators",
  "forex-position-size-calculator": "crypto-calculators",
};

type Cat = { id: string; name: string; slug: string; parentId: string | null };
type ToolRow = { id: string; slug: string; title: string; categoryId: string | null };

// The subset of the Prisma client this script uses, so it can also be run
// against an in-memory stand-in for testing.
type Db = Pick<PrismaClient, "toolCategory" | "tool" | "seoMeta" | "menu">;

export async function organizeToolCategories(prisma: Db, APPLY: boolean, log: (s?: string) => void = (s = "") => console.log(s)) {
  const would = APPLY ? "" : "[would] ";
  log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  log();

  let cats: Cat[] = await prisma.toolCategory.findMany({ select: { id: true, name: true, slug: true, parentId: true } });
  const tools: ToolRow[] = await prisma.tool.findMany({ select: { id: true, slug: true, title: true, categoryId: true } });

  if (APPLY) {
    const dir = path.join(__dirname, "backups");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `tool-categories-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(file, JSON.stringify({ categories: cats, tools }, null, 2));
    log(`Backup written: ${file}`);
    log();
  }

  // Placeholder ids for categories that only exist after a real create, so
  // report mode can still show the full outcome.
  let fakeId = 0;
  const bySlug = () => new Map(cats.map((c) => [c.slug, c]));

  // Makes sure a category exists with this name and parent. A missing one is
  // only created when `createIfMissing` is set — i.e. when something is
  // about to be filed in it — so no empty categories are ever created.
  async function ensureCategory(name: string, slug: string, parentId: string | null, createIfMissing: boolean): Promise<Cat | null> {
    const existing = bySlug().get(slug);
    if (!existing) {
      if (!createIfMissing) return null;
      log(`${would}CREATE category "${name}" (${slug})`);
      const created: Cat = APPLY
        ? await prisma.toolCategory.create({
            data: { name, slug, parentId, templateKey: "category-template-1", viewStyle: "grid" },
            select: { id: true, name: true, slug: true, parentId: true },
          })
        : { id: `new-${++fakeId}`, name, slug, parentId };
      cats.push(created);
      return created;
    }
    const data: { name?: string; parentId?: string | null } = {};
    if (existing.name !== name) data.name = name;
    if (existing.parentId !== parentId) data.parentId = parentId;
    if (Object.keys(data).length > 0) {
      const changes = [
        data.name !== undefined ? `rename "${existing.name}" -> "${name}"` : "",
        data.parentId !== undefined ? "move to correct parent" : "",
      ].filter(Boolean);
      log(`${would}UPDATE category ${slug}: ${changes.join(", ")}`);
      if (APPLY) await prisma.toolCategory.update({ where: { id: existing.id }, data });
      Object.assign(existing, data);
    }
    return existing;
  }

  // Categories that must exist because a tool is about to be moved into them.
  const moveTargets = new Set(
    Object.entries(TOOL_MOVES)
      .filter(([toolSlug]) => tools.some((t) => t.slug === toolSlug))
      .map(([, catSlug]) => catSlug)
  );
  const anyCountryExists = TAX_COUNTRY_SLUGS.some((s) => bySlug().has(s));

  // 1. Main categories and their sub-categories.
  const financeExisting = FINANCE_SLUGS.map((s) => bySlug().get(s)).find(Boolean);
  const finance = (await ensureCategory(FINANCE_NAME, financeExisting?.slug ?? "finance-calculators", null, true))!;
  const otherMains: Cat[] = [];
  for (const main of OTHER_MAIN_CATEGORIES) {
    const c = await ensureCategory(main.name, main.slug, null, moveTargets.has(main.slug));
    if (c) otherMains.push(c);
  }
  const subBySlug = new Map<string, Cat>();
  for (const sub of FINANCE_SUBCATEGORIES) {
    const needed =
      moveTargets.has(sub.slug) ||
      (sub.slug === "tax-calculators" && anyCountryExists) ||
      SPLITS.some((sp) => sp.parentSlug === sub.slug && sp.subs.some((l) => moveTargets.has(l.slug)));
    const c = await ensureCategory(sub.name, sub.slug, finance.id, needed);
    if (c) subBySlug.set(sub.slug, c);
  }
  // parent id -> its sub-categories that exist
  const splitSubs = new Map<string, Cat[]>();
  for (const sp of SPLITS) {
    const parent = subBySlug.get(sp.parentSlug);
    if (!parent) continue;
    const found: Cat[] = [];
    for (const sub of sp.subs) {
      const c = await ensureCategory(sub.name, sub.slug, parent.id, moveTargets.has(sub.slug));
      if (c) found.push(c);
    }
    splitSubs.set(parent.id, found);
  }
  const tax = subBySlug.get("tax-calculators");
  for (const slug of TAX_COUNTRY_SLUGS) {
    const c = bySlug().get(slug);
    if (c && tax) await ensureCategory(c.name, slug, tax.id, false);
  }

  // 2. The requested tool moves.
  for (const [toolSlug, catSlug] of Object.entries(TOOL_MOVES)) {
    const tool = tools.find((t) => t.slug === toolSlug);
    if (!tool) {
      log(`(tool ${toolSlug} not in the database — nothing to move)`);
      continue;
    }
    const target = bySlug().get(catSlug)!;
    if (tool.categoryId === target.id) continue;
    const from = cats.find((c) => c.id === tool.categoryId)?.name ?? "no category";
    log(`${would}MOVE tool "${tool.title}" from "${from}" to "${target.name}"`);
    if (APPLY) await prisma.tool.update({ where: { id: tool.id }, data: { categoryId: target.id } });
    tool.categoryId = target.id;
  }

  // 3. Everything else must already sit in an allowed category.
  const allowed = new Set<string>([finance.id, ...otherMains.map((c) => c.id), ...[...subBySlug.values()].map((c) => c.id)]);
  for (const slug of TAX_COUNTRY_SLUGS) {
    const c = bySlug().get(slug);
    if (c) allowed.add(c.id);
  }
  for (const subs of splitSubs.values()) for (const c of subs) allowed.add(c.id);
  // Once Loan, Mortgage or Investment Calculators has sub-categories, a tool left
  // directly in it needs a decision too (tools are filed at the leaf level).
  const splitParents = new Set([...splitSubs].filter(([, subs]) => subs.length > 0).map(([id]) => id));
  const unplaced = tools.filter(
    (t) => !t.categoryId || !allowed.has(t.categoryId) || t.categoryId === finance.id || splitParents.has(t.categoryId)
  );

  // 4. Delete every category that ends up with no tools in it or beneath it
  //    — whether or not it's part of the taxonomy — children first,
  //    repeating until nothing more can go.
  const deleted: Cat[] = [];
  const keptUnknown: Cat[] = [];
  let progress = true;
  while (progress) {
    progress = false;
    for (const c of [...cats]) {
      const hasTools = tools.some((t) => t.categoryId === c.id);
      const hasChildren = cats.some((k) => k.parentId === c.id);
      if (hasTools || hasChildren) continue;
      log(`${would}DELETE category "${c.name}" (${c.slug})`);
      if (APPLY) {
        await prisma.seoMeta.deleteMany({ where: { toolCategoryId: c.id } });
        await prisma.toolCategory.delete({ where: { id: c.id } });
      }
      deleted.push(c);
      cats = cats.filter((k) => k.id !== c.id);
      progress = true;
    }
  }
  for (const c of cats.filter((c) => !allowed.has(c.id))) keptUnknown.push(c);

  // 5. Report.
  log();
  log("=== RESULT ===");
  const count = (id: string) => tools.filter((t) => t.categoryId === id).length;
  const printTree = (c: Cat, depth: number) => {
    log(`${"  ".repeat(depth)}- ${c.name} (${c.slug}) — ${count(c.id)} tool(s) directly`);
    for (const k of cats.filter((k) => k.parentId === c.id).sort((a, b) => a.name.localeCompare(b.name))) printTree(k, depth + 1);
  };
  for (const root of cats.filter((c) => !c.parentId).sort((a, b) => a.name.localeCompare(b.name))) printTree(root, 0);
  log();
  log(`Total tools: ${tools.length}`);

  if (unplaced.length > 0) {
    log();
    log(`NEEDS A DECISION — ${unplaced.length} tool(s) not in a known category (left where they are):`);
    for (const t of unplaced) log(`  - ${t.slug} (in: ${cats.find((c) => c.id === t.categoryId)?.slug ?? "no category"})`);
  }
  if (keptUnknown.length > 0) {
    log();
    log("NEEDS A DECISION — categories outside the new structure that still hold tools or sub-categories (kept):");
    for (const c of keptUnknown) log(`  - ${c.name} (${c.slug}) — ${count(c.id)} tool(s)`);
  }
  if (deleted.length > 0) {
    log();
    log("Deleted category pages (add redirects for these URLs):");
    for (const c of deleted) log(`  /tools/category/${c.slug}`);
    const menus = await prisma.menu.findMany({ select: { location: true, structure: true } });
    for (const m of menus) {
      for (const c of deleted) {
        if (m.structure.includes(`/tools/category/${c.slug}`)) log(`  ! The "${m.location}" menu links to /tools/category/${c.slug} — update it in the Menu Builder.`);
      }
    }
  }
  log();
  log(APPLY ? "Done — changes applied." : "Report only — nothing was changed. Run again with --apply to make these changes.");
}

if (process.argv[1]?.includes("organize-tool-categories")) {
  const prisma = new PrismaClient();
  organizeToolCategories(prisma, APPLY)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
