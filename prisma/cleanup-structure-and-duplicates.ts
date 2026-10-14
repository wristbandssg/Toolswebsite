// Site-wide structure and duplicate clean-up (14 Oct 2026, user request:
// "remove unnecessary sub-categories, remove duplicate / same-intent tools,
// put every tool in its most relevant category, keep it simple and SEO-friendly,
// don't delete anything unique").
//
//   1. Sub-category merges
//        Auto Loan Calculators (auto-loan-calculators, made in admin) -> Auto & Vehicle Loan Calculators
//        Net Worth & Cost of Living                                    -> Budgeting Methods & Planning
//        Vehicle Business Use & Income                                 -> Car Ownership, Fuel & EV Cost
//        Shopping Calculators (empty main category)                    -> deleted
//      The 1-tool country tax sub-categories are kept on purpose: Hong Kong,
//      Malaysia and the Philippines have extended batches (7–10 tools each)
//      still waiting to be run into them.
//   2. Misplaced tools moved (mortgage tools out of Real Estate, crypto
//      capital gains into Crypto tax, corporate tax rate into Tax).
//   3. RETIRED: tools that run the same calculation for the same search
//      intent as a tool that stays (identical engine function or identical
//      inputs/outputs, synonyms or word-order variants). Each is deleted and
//      the kept tool is listed next to it. Removed families: the 41 state
//      "commission tax" tools (same flat supplemental rate as the state bonus
//      tools) and the 41 state "contractor tax" tools (same as the state
//      freelance tools).
//
// HOW TO RUN
//   npx tsx prisma/cleanup-structure-and-duplicates.ts            (report only)
//   npx tsx prisma/cleanup-structure-and-duplicates.ts --apply    (make the changes)
//
// Apply mode first writes a full backup (affected categories, and every
// retired tool with its SEO meta) to prisma/backups/. Published URLs that
// disappear get a 301 (retired tool -> kept tool, removed category -> its
// new home). Safe to re-run.

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

// [from sub-category, into sub-category]
const CATEGORY_MERGES: [string, string][] = [
  ["auto-loan-calculators", "auto-vehicle-loan-calculators"],
  ["net-worth-cost-of-living-calculators", "budgeting-methods-calculators"],
  ["vehicle-business-use-income-calculators", "car-ownership-fuel-ev-cost-calculators"],
];
const EMPTY_CATEGORIES_TO_DELETE = ["shopping-calculators"];

// tool slug -> category slug
const TOOL_MOVES: Record<string, string> = {
  "mortgage-payment-calculator": "mortgage-payment-type-calculators",
  "mortgage-affordability-calculator": "mortgage-payment-type-calculators",
  "real-estate-mortgage-calculator": "mortgage-payment-type-calculators",
  "investment-property-mortgage-calculator": "property-construction-mortgage-calculators",
  "rental-property-mortgage-calculator": "property-construction-mortgage-calculators",
  "crypto-capital-gains-calculator": "crypto-market-tax-security-calculators",
  "effective-corporate-tax-rate-calculator": "tax-calculators",
};

// [retired tool, tool that covers the same intent]
const RETIRED: [string, string][] = [
  ["self-employment-tax-estimator", "self-employment-tax-calculator"],
  ["individual-income-tax-calculator", "income-tax-calculator"],
  ["personal-income-tax-calculator", "income-tax-calculator"],
  ["retirement-income-tax-calculator", "retirement-tax-calculator"],
  ["salary-tax-calculator", "take-home-pay-calculator"],
  ["payroll-tax-calculator", "take-home-pay-calculator"],
  ["salary-after-tax-calculator", "take-home-pay-calculator"],
  ["net-salary-calculator", "take-home-pay-calculator"],
  ["annual-salary-tax-calculator", "take-home-pay-calculator"],
  ["paycheck-tax-calculator", "take-home-pay-calculator"],
  ["salary-withholding-calculator", "take-home-pay-calculator"],
  ["monthly-salary-tax-calculator", "take-home-pay-calculator"],
  ["weekly-salary-tax-calculator", "take-home-pay-calculator"],
  ["biweekly-salary-tax-calculator", "take-home-pay-calculator"],
  ["freelancer-tax-calculator", "self-employment-tax-calculator"],
  ["contractor-tax-calculator", "self-employment-tax-calculator"],
  ["independent-contractor-tax-calculator", "self-employment-tax-calculator"],
  ["gig-worker-tax-calculator", "self-employment-tax-calculator"],
  ["side-hustle-tax-calculator", "self-employment-tax-calculator"],
  ["sole-trader-tax-calculator", "self-employment-tax-calculator"],
  ["freelancer-income-tax-calculator", "business-income-tax-calculator"],
  ["foreign-income-tax-calculator", "income-tax-calculator"],
  ["investment-income-tax-calculator", "income-tax-calculator"],
  ["commission-tax-calculator", "bonus-tax-calculator"],
  ["stock-capital-gains-calculator", "capital-gains-tax-calculator"],
  ["sales-tax-exclusive-calculator", "sales-tax-calculator"],
  ["sales-tax-inclusive-calculator", "reverse-sales-tax-calculator"],
  ["pre-tax-price-calculator", "reverse-sales-tax-calculator"],
  ["post-tax-price-calculator", "sales-tax-calculator"],
  ["consumer-use-tax-calculator", "use-tax-calculator"],
  ["city-sales-tax-calculator", "combined-sales-tax-calculator"],
  ["county-sales-tax-calculator", "combined-sales-tax-calculator"],
  ["vat-exclusive-calculator", "vat-calculator"],
  ["vat-inclusive-calculator", "reverse-vat-calculator"],
  ["input-vat-calculator", "vat-calculator"],
  ["output-vat-calculator", "vat-calculator"],
  ["annual-property-tax-calculator", "property-tax-calculator"],
  ["real-estate-tax-calculator", "property-tax-calculator"],
  ["monthly-property-tax-calculator", "property-tax-calculator"],
  ["property-purchase-tax-calculator", "property-transfer-tax-calculator"],
  ["property-sale-tax-calculator", "property-transfer-tax-calculator"],
  ["self-employed-gst-calculator", "self-employed-vat-calculator"],
  ["nominal-to-effective-interest-rate-calculator", "effective-interest-rate-calculator"],
  ["effective-to-nominal-interest-rate-calculator", "nominal-interest-rate-calculator"],
  ["quarterly-compound-interest-calculator", "compound-interest-calculator"],
  ["semiannual-compound-interest-calculator", "compound-interest-calculator"],
  ["annual-compound-interest-calculator", "compound-interest-calculator"],
  ["buy-vs-rent-calculator", "rent-vs-buy-calculator"],
  ["currency-cross-rate-calculator", "cross-currency-rate-calculator"],
  ["alabama-commission-tax-calculator", "alabama-bonus-tax-calculator"],
  ["alabama-contractor-tax-calculator", "alabama-freelance-tax-calculator"],
  ["arizona-commission-tax-calculator", "arizona-bonus-tax-calculator"],
  ["arizona-contractor-tax-calculator", "arizona-freelance-tax-calculator"],
  ["arkansas-commission-tax-calculator", "arkansas-bonus-tax-calculator"],
  ["arkansas-contractor-tax-calculator", "arkansas-freelance-tax-calculator"],
  ["california-commission-tax-calculator", "california-bonus-tax-calculator"],
  ["california-contractor-tax-calculator", "california-freelance-tax-calculator"],
  ["colorado-commission-tax-calculator", "colorado-bonus-tax-calculator"],
  ["colorado-contractor-tax-calculator", "colorado-freelance-tax-calculator"],
  ["connecticut-commission-tax-calculator", "connecticut-bonus-tax-calculator"],
  ["connecticut-contractor-tax-calculator", "connecticut-freelance-tax-calculator"],
  ["delaware-commission-tax-calculator", "delaware-bonus-tax-calculator"],
  ["delaware-contractor-tax-calculator", "delaware-freelance-tax-calculator"],
  ["georgia-commission-tax-calculator", "georgia-bonus-tax-calculator"],
  ["georgia-contractor-tax-calculator", "georgia-freelance-tax-calculator"],
  ["hawaii-commission-tax-calculator", "hawaii-bonus-tax-calculator"],
  ["hawaii-contractor-tax-calculator", "hawaii-freelance-tax-calculator"],
  ["idaho-commission-tax-calculator", "idaho-bonus-tax-calculator"],
  ["idaho-contractor-tax-calculator", "idaho-freelance-tax-calculator"],
  ["illinois-commission-tax-calculator", "illinois-bonus-tax-calculator"],
  ["illinois-contractor-tax-calculator", "illinois-freelance-tax-calculator"],
  ["indiana-commission-tax-calculator", "indiana-bonus-tax-calculator"],
  ["indiana-contractor-tax-calculator", "indiana-freelance-tax-calculator"],
  ["iowa-commission-tax-calculator", "iowa-bonus-tax-calculator"],
  ["iowa-contractor-tax-calculator", "iowa-freelance-tax-calculator"],
  ["kansas-commission-tax-calculator", "kansas-bonus-tax-calculator"],
  ["kansas-contractor-tax-calculator", "kansas-freelance-tax-calculator"],
  ["kentucky-commission-tax-calculator", "kentucky-bonus-tax-calculator"],
  ["kentucky-contractor-tax-calculator", "kentucky-freelance-tax-calculator"],
  ["louisiana-commission-tax-calculator", "louisiana-bonus-tax-calculator"],
  ["louisiana-contractor-tax-calculator", "louisiana-freelance-tax-calculator"],
  ["maine-commission-tax-calculator", "maine-bonus-tax-calculator"],
  ["maine-contractor-tax-calculator", "maine-freelance-tax-calculator"],
  ["maryland-commission-tax-calculator", "maryland-bonus-tax-calculator"],
  ["maryland-contractor-tax-calculator", "maryland-freelance-tax-calculator"],
  ["massachusetts-commission-tax-calculator", "massachusetts-bonus-tax-calculator"],
  ["massachusetts-contractor-tax-calculator", "massachusetts-freelance-tax-calculator"],
  ["michigan-commission-tax-calculator", "michigan-bonus-tax-calculator"],
  ["michigan-contractor-tax-calculator", "michigan-freelance-tax-calculator"],
  ["minnesota-commission-tax-calculator", "minnesota-bonus-tax-calculator"],
  ["minnesota-contractor-tax-calculator", "minnesota-freelance-tax-calculator"],
  ["mississippi-commission-tax-calculator", "mississippi-bonus-tax-calculator"],
  ["mississippi-contractor-tax-calculator", "mississippi-freelance-tax-calculator"],
  ["missouri-commission-tax-calculator", "missouri-bonus-tax-calculator"],
  ["missouri-contractor-tax-calculator", "missouri-freelance-tax-calculator"],
  ["montana-commission-tax-calculator", "montana-bonus-tax-calculator"],
  ["montana-contractor-tax-calculator", "montana-freelance-tax-calculator"],
  ["nebraska-commission-tax-calculator", "nebraska-bonus-tax-calculator"],
  ["nebraska-contractor-tax-calculator", "nebraska-freelance-tax-calculator"],
  ["new-jersey-commission-tax-calculator", "new-jersey-bonus-tax-calculator"],
  ["new-jersey-contractor-tax-calculator", "new-jersey-freelance-tax-calculator"],
  ["new-mexico-commission-tax-calculator", "new-mexico-bonus-tax-calculator"],
  ["new-mexico-contractor-tax-calculator", "new-mexico-freelance-tax-calculator"],
  ["new-york-commission-tax-calculator", "new-york-bonus-tax-calculator"],
  ["new-york-contractor-tax-calculator", "new-york-freelance-tax-calculator"],
  ["north-carolina-commission-tax-calculator", "north-carolina-bonus-tax-calculator"],
  ["north-carolina-contractor-tax-calculator", "north-carolina-freelance-tax-calculator"],
  ["north-dakota-commission-tax-calculator", "north-dakota-bonus-tax-calculator"],
  ["north-dakota-contractor-tax-calculator", "north-dakota-freelance-tax-calculator"],
  ["ohio-commission-tax-calculator", "ohio-bonus-tax-calculator"],
  ["ohio-contractor-tax-calculator", "ohio-freelance-tax-calculator"],
  ["oklahoma-commission-tax-calculator", "oklahoma-bonus-tax-calculator"],
  ["oklahoma-contractor-tax-calculator", "oklahoma-freelance-tax-calculator"],
  ["oregon-commission-tax-calculator", "oregon-bonus-tax-calculator"],
  ["oregon-contractor-tax-calculator", "oregon-freelance-tax-calculator"],
  ["pennsylvania-commission-tax-calculator", "pennsylvania-bonus-tax-calculator"],
  ["pennsylvania-contractor-tax-calculator", "pennsylvania-freelance-tax-calculator"],
  ["rhode-island-commission-tax-calculator", "rhode-island-bonus-tax-calculator"],
  ["rhode-island-contractor-tax-calculator", "rhode-island-freelance-tax-calculator"],
  ["south-carolina-commission-tax-calculator", "south-carolina-bonus-tax-calculator"],
  ["south-carolina-contractor-tax-calculator", "south-carolina-freelance-tax-calculator"],
  ["utah-commission-tax-calculator", "utah-bonus-tax-calculator"],
  ["utah-contractor-tax-calculator", "utah-freelance-tax-calculator"],
  ["vermont-commission-tax-calculator", "vermont-bonus-tax-calculator"],
  ["vermont-contractor-tax-calculator", "vermont-freelance-tax-calculator"],
  ["virginia-commission-tax-calculator", "virginia-bonus-tax-calculator"],
  ["virginia-contractor-tax-calculator", "virginia-freelance-tax-calculator"],
  ["west-virginia-commission-tax-calculator", "west-virginia-bonus-tax-calculator"],
  ["west-virginia-contractor-tax-calculator", "west-virginia-freelance-tax-calculator"],
  ["wisconsin-commission-tax-calculator", "wisconsin-bonus-tax-calculator"],
  ["wisconsin-contractor-tax-calculator", "wisconsin-freelance-tax-calculator"],
];

type Cat = { id: string; name: string; slug: string; parentId: string | null };

async function main() {
  console.log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  const cats: Cat[] = await prisma.toolCategory.findMany({ select: { id: true, name: true, slug: true, parentId: true } });
  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  const byId = new Map(cats.map((c) => [c.id, c]));
  const href = (id: string | null): string => {
    const parts: string[] = [];
    let c = id ? byId.get(id) : undefined;
    while (c) {
      parts.unshift(c.slug);
      c = c.parentId ? byId.get(c.parentId) : undefined;
    }
    return parts.length ? `/${parts.join("/")}/` : "/calculators/";
  };
  const redirects: [string, string][] = [];

  const doomed = await prisma.tool.findMany({ where: { slug: { in: RETIRED.map(([s]) => s) } }, include: { seoMeta: true } });
  if (APPLY) {
    const dir = path.join(__dirname, "backups");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `structure-cleanup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    const touched = await prisma.toolCategory.findMany({
      where: { slug: { in: [...CATEGORY_MERGES.flat(), ...EMPTY_CATEGORIES_TO_DELETE] } },
      include: { seoMeta: true },
    });
    const movedTools = await prisma.tool.findMany({ where: { slug: { in: Object.keys(TOOL_MOVES) } }, select: { slug: true, categoryId: true } });
    fs.writeFileSync(file, JSON.stringify({ categories: touched, movedTools, retiredTools: doomed }, null, 2));
    console.log(`Backup written: ${file}`);
  }

  // 1. Category merges.
  for (const [from, into] of CATEGORY_MERGES) {
    const a = bySlug.get(from);
    const b = bySlug.get(into);
    if (!a) {
      console.log(`"${from}" is already gone.`);
      continue;
    }
    if (!b) throw new Error(`Target "${into}" doesn't exist.`);
    if (cats.some((c) => c.parentId === a.id)) throw new Error(`"${from}" has sub-categories.`);
    const count = await prisma.tool.count({ where: { categoryId: a.id } });
    redirects.push([href(a.id), href(b.id)]);
    if (APPLY) {
      await prisma.tool.updateMany({ where: { categoryId: a.id }, data: { categoryId: b.id } });
      await prisma.seoMeta.deleteMany({ where: { toolCategoryId: a.id } });
      await prisma.toolCategory.delete({ where: { id: a.id } });
    }
    console.log(`${APPLY ? "Merged" : "Would merge"} "${a.name}" (${count} tools) into "${b.name}".`);
  }
  for (const slug of EMPTY_CATEGORIES_TO_DELETE) {
    const c = bySlug.get(slug);
    if (!c) continue;
    const used = (await prisma.tool.count({ where: { categoryId: c.id } })) + cats.filter((k) => k.parentId === c.id).length;
    if (used) {
      console.log(`"${c.name}" isn't empty — kept.`);
      continue;
    }
    redirects.push([href(c.id), "/calculators/"]);
    if (APPLY) {
      await prisma.seoMeta.deleteMany({ where: { toolCategoryId: c.id } });
      await prisma.toolCategory.delete({ where: { id: c.id } });
    }
    console.log(`${APPLY ? "Deleted" : "Would delete"} empty category "${c.name}".`);
  }

  // 2. Tool moves.
  let moved = 0;
  for (const [slug, target] of Object.entries(TOOL_MOVES)) {
    const tool = await prisma.tool.findUnique({ where: { slug }, select: { id: true, categoryId: true } });
    const cat = bySlug.get(target);
    if (!tool || !cat) throw new Error(`Missing tool ${slug} or category ${target}.`);
    if (tool.categoryId === cat.id) continue;
    if (APPLY) await prisma.tool.update({ where: { id: tool.id }, data: { categoryId: cat.id } });
    moved++;
  }
  console.log(`${APPLY ? "Moved" : "Would move"} ${moved} misplaced tool(s).`);

  // 3. Retired duplicates.
  const keepers = await prisma.tool.findMany({ where: { slug: { in: RETIRED.map(([, k]) => k) } }, select: { slug: true, categoryId: true } });
  const keeperBySlug = new Map(keepers.map((k) => [k.slug, k]));
  let deleted = 0;
  for (const [slug, keep] of RETIRED) {
    const tool = doomed.find((t) => t.slug === slug);
    if (!tool) continue;
    const keeper = keeperBySlug.get(keep);
    if (!keeper) throw new Error(`Kept tool ${keep} (for ${slug}) doesn't exist.`);
    if (tool.status === "published") redirects.push([href(tool.categoryId) + slug + "/", href(keeper.categoryId) + keep + "/"]);
    if (APPLY) {
      await prisma.internalLinkSuggestion.deleteMany({ where: { OR: [{ sourceToolId: tool.id }, { targetToolId: tool.id }] } });
      await prisma.stateCalculatorLink.updateMany({ where: { toolSlug: slug }, data: { toolSlug: keep } });
      await prisma.tool.delete({ where: { id: tool.id } });
    }
    deleted++;
  }
  console.log(`${APPLY ? "Deleted" : "Would delete"} ${deleted} duplicate tool(s).`);

  // 301s for URLs that disappear (stored the way the admin stores them: lowercase, no trailing slash).
  for (const [from, to] of redirects) {
    const key = from.toLowerCase().replace(/\/+$/, "");
    if (APPLY) await prisma.redirect.upsert({ where: { fromPath: key }, update: { toPath: to }, create: { fromPath: key, toPath: to } });
    console.log(`  ${APPLY ? "Redirect" : "Would redirect"} ${key} -> ${to}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
