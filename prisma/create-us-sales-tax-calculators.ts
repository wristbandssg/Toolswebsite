// One-time (but safe to re-run) batch setup script: creates 50 US state
// Sales Tax Tools inside the existing "Tax & Paycheck Calculators"
// category — seventh batch of the 50-state audit.
//
// See src/lib/calc-engine-us-sales-tax.ts for the actual math and that
// file's header for how the 4 no-sales-tax states (Delaware, Montana, New
// Hampshire, Oregon), Alaska (no state rate, real local average), and the
// two gross-receipts-style analogs (Hawaii GET, New Mexico GRT) are modeled.
//
// HOW TO RUN
//   npx tsx prisma/create-us-sales-tax-calculators.ts
// or
//   npm run db:create-us-sales-tax-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "tax-paycheck-calculators";

function paragraphsToHtml(text: string): string {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${p}</p>`).join("");
}
function purchaseField() {
  return { key: "purchaseAmount", label: "Purchase Amount", type: "currency", required: true, default: 0, min: 0, max: 1_000_000, step: 10 };
}
function currencyResult(key: string, label: string, opts: { highlight?: boolean } = {}) {
  return { key, label, format: "currency", highlight: opts.highlight };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. Sales tax rules vary by product category (groceries, clothing, and services are often exempt or " +
  "taxed differently) and this covers general taxable purchases — check your state and local tax authority " +
  "for the exact rate and rules that apply to a specific item or address. Where a state's rate varies by city " +
  "or county, this uses a published statewide average combined rate rather than an exact per-address lookup.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

function salesTaxTool(
  state: string,
  slug: string,
  ratePct: number,
  rateLabel: string,
  instructionsExtra: string,
  assumptionsExtra: string
): ToolDef {
  const exampleTax = (500 * ratePct) / 100;
  return {
    slug,
    title: `${state} Sales Tax Calculator`,
    description: `Estimate ${state}'s sales tax on a purchase: ${rateLabel}.`,
    metaTitle: `${state} Sales Tax Calculator (2026) — Free & Instant`,
    metaDescription: `Free ${state} sales tax calculator. ${rateLabel}. Covers state sales and use tax.`,
    instructions: `${state}'s sales (and use) tax runs ${rateLabel}. ${instructionsExtra} Enter your purchase amount to see the estimated tax and total price.`,
    examples: `Example: a $500 purchase. Estimated ${state} sales tax: $500 x ${ratePct}% = $${exampleTax.toFixed(2)}. Total: $${(500 + exampleTax).toFixed(2)}.`,
    assumptions: `This calculator uses ${state}'s published rate as an estimate for general taxable purchases. ${assumptionsExtra}\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: `Does this include use tax too?`, answer: `Yes — ${state}'s use tax (owed on out-of-state purchases used in-state, such as many online orders) is generally the same rate as the sales tax modeled here.` }],
  };
}

const TOOLS: ToolDef[] = [
  salesTaxTool("Alabama", "alabama-sales-tax-calculator", 9.46, "4.00% state rate plus an average local add-on, for a combined average of about 9.46%", "Local sales taxes in Alabama vary meaningfully by city and county.", "This blends Alabama's 4.00% state rate with its published average local add-on (~5.46%)."),
  {
    slug: "alaska-sales-tax-calculator",
    title: "Alaska Sales Tax Calculator",
    description: "Alaska has no state sales tax — estimate the average local sales tax many Alaska municipalities charge instead (about 1.82%).",
    metaTitle: "Alaska Sales Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Alaska sales tax calculator. No state sales tax; average local rate about 1.82%.",
    instructions: "Alaska is one of the few states with no state-level sales tax at all. However, many Alaska cities and boroughs charge their own local sales tax, averaging around 1.82% statewide. Enter your purchase amount to see an estimate based on that average local rate.",
    examples: "Example: a $500 purchase in a typical Alaska municipality. Estimated local sales tax: $500 x 1.82% = $9.10. Total: $509.10.",
    assumptions: "Alaska genuinely has no state sales tax — this estimate reflects only the average LOCAL sales tax rate across municipalities that impose one; many rural areas of Alaska charge no sales tax at all, while some communities charge more than the average.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Why does Alaska have a sales tax calculator if there's no state tax?", answer: "Because many Alaska cities and boroughs (though not all) charge their own local sales tax — this estimates that average local burden, not a state tax." }],
  },
  salesTaxTool("Arizona", "arizona-sales-tax-calculator", 8.52, "a 5.60% state Transaction Privilege Tax (TPT) plus an average local add-on, for a combined average of about 8.52%", "Arizona calls its sales tax a 'Transaction Privilege Tax' (TPT), technically levied on the seller rather than the buyer, though it's passed through the same way a traditional sales tax is.", "This blends Arizona's 5.60% state TPT rate with its published average local add-on (~2.92%)."),
  salesTaxTool("Arkansas", "arkansas-sales-tax-calculator", 9.46, "6.50% state rate plus an average local add-on, for a combined average of about 9.46%", "Local sales taxes in Arkansas vary meaningfully by city and county.", "This blends Arkansas's 6.50% state rate with its published average local add-on (~2.96%)."),
  salesTaxTool("California", "california-sales-tax-calculator", 8.99, "a 7.25% state rate — the highest state-level rate in the US — plus an average local add-on, for a combined average of about 8.99%", "California's 7.25% state-level rate is already the highest in the country before any local add-on.", "This blends California's 7.25% state rate with its published average local add-on (~1.74%)."),
  salesTaxTool("Colorado", "colorado-sales-tax-calculator", 7.89, "a 2.90% state rate plus a substantial average local add-on, for a combined average of about 7.89%", "Colorado's many home-rule cities set their own local sales tax rates independently, so local add-ons vary widely.", "This blends Colorado's low 2.90% state rate with its published average local add-on (~4.99%), which is unusually large relative to the state rate."),
  salesTaxTool("Connecticut", "connecticut-sales-tax-calculator", 6.35, "a flat 6.35% state rate with no local add-ons", "Connecticut charges no local sales tax on top of the state rate.", ""),
  {
    slug: "delaware-sales-tax-calculator",
    title: "Delaware Sales Tax Calculator",
    description: "Delaware has no sales tax at all — see why your estimated sales tax is $0.",
    metaTitle: "Delaware Sales Tax Calculator (2026) — Free & Instant",
    metaDescription: "Delaware has no sales tax. Free calculator confirms your Delaware sales tax is $0.",
    instructions: "Delaware is one of a handful of states with no sales tax at all — state or local. Enter your purchase amount to confirm your Delaware sales tax is $0.",
    examples: "Example: a $500 purchase. Delaware sales tax owed: $0. Total: $500.",
    assumptions: "Delaware genuinely has no sales tax at any level of government — this is not a gap in the calculator, it's an honest reflection of Delaware law.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Does Delaware make up for having no sales tax with higher other taxes?", answer: "Delaware relies more heavily on other revenue sources (such as corporate franchise fees) instead of a sales tax — but that's a separate question from what you owe at checkout, which is $0." }],
  },
  salesTaxTool("Florida", "florida-sales-tax-calculator", 6.98, "6.00% state rate plus an average local add-on, for a combined average of about 6.98%", "", "This blends Florida's 6.00% state rate with its published average local add-on (~0.98%)."),
  salesTaxTool("Georgia", "georgia-sales-tax-calculator", 7.49, "4.00% state rate plus an average local add-on, for a combined average of about 7.49%", "Local sales taxes in Georgia vary meaningfully by county.", "This blends Georgia's 4.00% state rate with its published average local add-on (~3.49%)."),
  {
    slug: "hawaii-sales-tax-calculator",
    title: "Hawaii Sales Tax Calculator",
    description: "Hawaii has no traditional sales tax — estimate its General Excise Tax (GET) instead, a broader business tax typically passed on to buyers at about 4.5% combined with county surcharges.",
    metaTitle: "Hawaii Sales Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Hawaii General Excise Tax (GET) calculator. No traditional sales tax; GET runs about 4.5% combined with county surcharges.",
    instructions: "Hawaii has no traditional sales tax. Instead, it levies a General Excise Tax (GET) on businesses' gross income, which businesses are permitted to (and almost always do) pass on to customers as a visible surcharge on the receipt — functioning like a sales tax in practice, at roughly 4.5% combined with county surcharges. Enter your purchase amount to see an estimate.",
    examples: "Example: a $500 purchase. Estimated GET passed through: $500 x 4.5% = $22.50. Total: $522.50.",
    assumptions: "Hawaii genuinely has no traditional buyer-facing sales tax — this tool honestly models the GET, its closest practical equivalent, since it's routinely passed through to consumers as a visible line-item charge.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Is the GET legally the same as a sales tax?", answer: "No — legally, the GET is a tax on the SELLER's gross business income, not the buyer's purchase. In practice, though, Hawaii businesses are allowed to pass it through and almost universally do, so shoppers experience it like a sales tax." }],
  },
  salesTaxTool("Idaho", "idaho-sales-tax-calculator", 6.03, "6.00% state rate, combined average about 6.03% after modest local add-ons", "", "Idaho's local add-ons are small and uncommon relative to most states."),
  salesTaxTool("Illinois", "illinois-sales-tax-calculator", 8.98, "6.25% state rate plus substantial average local add-ons, for a combined average of about 8.98%", "Illinois local sales tax add-ons (especially in and around Chicago) can be large.", "This blends Illinois's 6.25% state rate with its published average local add-on."),
  salesTaxTool("Indiana", "indiana-sales-tax-calculator", 7.0, "a flat 7.00% state rate with no local add-ons", "Indiana charges no local sales tax on top of the state rate.", ""),
  salesTaxTool("Iowa", "iowa-sales-tax-calculator", 6.94, "6.00% state rate plus a local option tax of up to 1%, for a combined average of about 6.94%", "", "This blends Iowa's 6.00% state rate with its published average local option add-on."),
  salesTaxTool("Kansas", "kansas-sales-tax-calculator", 8.71, "6.50% state rate plus substantial average local add-ons, for a combined average of about 8.71%", "", "This blends Kansas's 6.50% state rate with its published average local add-on."),
  salesTaxTool("Kentucky", "kentucky-sales-tax-calculator", 6.0, "a flat 6.00% state rate with no local add-ons", "Kentucky charges no local sales tax on top of the state rate.", ""),
  salesTaxTool("Louisiana", "louisiana-sales-tax-calculator", 10.13, "a 5.00% state rate, but combined with local add-ons averaging about 10.13% total — the highest combined rate in the US", "Louisiana parishes and municipalities layer substantial local sales taxes on top of the state rate, making its combined average the highest of any state.", "This uses Louisiana's published combined average rate, the highest in the country."),
  salesTaxTool("Maine", "maine-sales-tax-calculator", 5.5, "a flat 5.50% state rate with no local add-ons", "Maine charges no local sales tax on top of the state rate.", ""),
  salesTaxTool("Maryland", "maryland-sales-tax-calculator", 6.0, "a flat 6.00% state rate with no local add-ons", "Maryland charges no local sales tax on top of the state rate.", ""),
  salesTaxTool("Massachusetts", "massachusetts-sales-tax-calculator", 6.25, "a flat 6.25% state rate with no local add-ons", "Massachusetts charges no local sales tax on top of the state rate.", ""),
  salesTaxTool("Michigan", "michigan-sales-tax-calculator", 6.0, "a flat 6% state rate with no local add-ons", "Michigan charges no local sales tax on top of the state rate.", ""),
  salesTaxTool("Minnesota", "minnesota-sales-tax-calculator", 6.875, "a 6.875% state rate", "Some Minnesota cities and counties add their own local sales tax on top of this state rate.", "This reflects Minnesota's state-level rate; local add-ons where they apply aren't included."),
  salesTaxTool("Mississippi", "mississippi-sales-tax-calculator", 7.0, "a flat 7% state rate", "", ""),
  salesTaxTool("Missouri", "missouri-sales-tax-calculator", 4.225, "a 4.225% state rate", "Missouri cities and counties commonly add substantial local sales tax on top of this state rate — your actual total is often meaningfully higher.", "This reflects only Missouri's STATE rate; local add-ons, which are common and can be significant, aren't included."),
  {
    slug: "montana-sales-tax-calculator",
    title: "Montana Sales Tax Calculator",
    description: "Montana has no sales tax at all — see why your estimated sales tax is $0.",
    metaTitle: "Montana Sales Tax Calculator (2026) — Free & Instant",
    metaDescription: "Montana has no sales tax. Free calculator confirms your Montana sales tax is $0.",
    instructions: "Montana is one of a handful of states with no sales tax at all — state or local. Enter your purchase amount to confirm your Montana sales tax is $0.",
    examples: "Example: a $500 purchase. Montana sales tax owed: $0. Total: $500.",
    assumptions: "Montana genuinely has no sales tax at any level of government — this is not a gap in the calculator, it's an honest reflection of Montana law.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Are there any exceptions, like resort towns?", answer: "A small number of Montana resort communities charge a local resort tax on certain goods and services (like lodging and restaurants) — but this is narrow and different from a general sales tax." }],
  },
  salesTaxTool("Nebraska", "nebraska-sales-tax-calculator", 5.5, "a 5.5% state rate", "Some Nebraska cities add their own local option sales tax on top of this state rate.", "This reflects Nebraska's state-level rate; local add-ons where they apply aren't included."),
  salesTaxTool("Nevada", "nevada-sales-tax-calculator", 6.85, "a 6.85% state rate", "Some Nevada counties add their own local sales tax on top of this state rate.", "This reflects Nevada's state-level rate; local add-ons where they apply aren't included."),
  {
    slug: "new-hampshire-sales-tax-calculator",
    title: "New Hampshire Sales Tax Calculator",
    description: "New Hampshire has no sales tax at all — see why your estimated sales tax is $0.",
    metaTitle: "New Hampshire Sales Tax Calculator (2026) — Free & Instant",
    metaDescription: "New Hampshire has no sales tax. Free calculator confirms your New Hampshire sales tax is $0.",
    instructions: "New Hampshire is one of a handful of states with no sales tax at all — state or local. Enter your purchase amount to confirm your New Hampshire sales tax is $0.",
    examples: "Example: a $500 purchase. New Hampshire sales tax owed: $0. Total: $500.",
    assumptions: "New Hampshire genuinely has no sales tax at any level of government — this is not a gap in the calculator, it's an honest reflection of New Hampshire law.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Is this why people from other New England states shop in New Hampshire?", answer: "It's a common reason cited for cross-border shopping — New Hampshire's lack of sales tax is one of its most well-known tax features." }],
  },
  salesTaxTool("New Jersey", "new-jersey-sales-tax-calculator", 6.625, "a flat 6.625% state rate", "A small number of New Jersey Urban Enterprise Zones charge a reduced rate on certain purchases, not modeled here.", ""),
  {
    slug: "new-mexico-sales-tax-calculator",
    title: "New Mexico Sales Tax Calculator",
    description: "New Mexico has no traditional sales tax — estimate its Gross Receipts Tax (GRT) instead, a seller-based tax typically passed on to buyers at a 4.875% state base rate.",
    metaTitle: "New Mexico Sales Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free New Mexico Gross Receipts Tax (GRT) calculator. No traditional sales tax; state base rate 4.875%, local add-ons vary.",
    instructions: "New Mexico has no traditional sales tax. Instead, it levies a Gross Receipts Tax (GRT) on sellers, which is almost always passed through to buyers as a visible charge — functioning like a sales tax in practice. The state base rate is 4.875%, with local jurisdictions commonly adding more. Enter your purchase amount to see an estimate using the state base rate.",
    examples: "Example: a $500 purchase. Estimated GRT at the state base rate: $500 x 4.875% = $24.38. Total: $524.38 — before any local add-on.",
    assumptions: "New Mexico genuinely has no traditional buyer-facing sales tax — this tool honestly models the GRT, its closest practical equivalent. This shows only the STATE base rate; New Mexico's local GRT add-ons vary significantly by municipality and can add several more percentage points.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Is the GRT legally the same as a sales tax?", answer: "No — legally, the GRT is imposed on the SELLER's gross receipts, not the buyer's purchase. In practice, sellers almost universally pass it through, so shoppers experience it like a sales tax." }],
  },
  salesTaxTool("New York", "new-york-sales-tax-calculator", 4.0, "a 4.00% state rate", "New York City and most counties add substantial local sales tax on top of this state rate — for example, combined rates in and around New York City commonly reach nearly 8.9%.", "This reflects only New York's STATE rate; local add-ons, which are common and often substantial, aren't included."),
  salesTaxTool("North Carolina", "north-carolina-sales-tax-calculator", 4.75, "a 4.75% state rate", "North Carolina counties commonly add their own local sales tax on top of this state rate.", "This reflects only North Carolina's STATE rate; local add-ons, which are common, aren't included."),
  salesTaxTool("North Dakota", "north-dakota-sales-tax-calculator", 5.0, "a 5.00% state rate", "Some North Dakota cities add their own local sales tax on top of this state rate.", "This reflects North Dakota's state-level rate; local add-ons where they apply aren't included."),
  salesTaxTool("Ohio", "ohio-sales-tax-calculator", 5.75, "a 5.75% state rate", "Ohio counties commonly add their own local sales tax (often around 1-1.5%) on top of this state rate.", "This reflects only Ohio's STATE rate; local add-ons, which are common, aren't included."),
  salesTaxTool("Oklahoma", "oklahoma-sales-tax-calculator", 4.5, "a 4.50% state rate", "Oklahoma cities and counties commonly add substantial local sales tax on top of this state rate.", "This reflects only Oklahoma's STATE rate; local add-ons, which are common and can be significant, aren't included."),
  {
    slug: "oregon-sales-tax-calculator",
    title: "Oregon Sales Tax Calculator",
    description: "Oregon has no sales tax at all — see why your estimated sales tax is $0.",
    metaTitle: "Oregon Sales Tax Calculator (2026) — Free & Instant",
    metaDescription: "Oregon has no sales tax. Free calculator confirms your Oregon sales tax is $0.",
    instructions: "Oregon is one of a handful of states with no sales tax at all — state or local. Enter your purchase amount to confirm your Oregon sales tax is $0.",
    examples: "Example: a $500 purchase. Oregon sales tax owed: $0. Total: $500.",
    assumptions: "Oregon genuinely has no sales tax at any level of government — this is not a gap in the calculator, it's an honest reflection of Oregon law.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Does Oregon have any transaction-based tax at all?", answer: "Oregon has a few narrow, specific taxes (like a vehicle privilege tax), but no general sales tax on everyday purchases." }],
  },
  salesTaxTool("Pennsylvania", "pennsylvania-sales-tax-calculator", 6.0, "a 6.00% state rate", "Philadelphia and Allegheny County add a small local sales tax on top of this state rate.", "This reflects Pennsylvania's state-level rate; local add-ons where they apply aren't included."),
  salesTaxTool("Rhode Island", "rhode-island-sales-tax-calculator", 7.0, "a flat 7.00% state rate with no local add-ons", "Rhode Island charges no local sales tax on top of the state rate.", ""),
  salesTaxTool("South Carolina", "south-carolina-sales-tax-calculator", 6.0, "a 6.00% state rate", "Many South Carolina counties add their own local option sales tax on top of this state rate.", "This reflects only South Carolina's STATE rate; local add-ons, which are common, aren't included."),
  salesTaxTool("South Dakota", "south-dakota-sales-tax-calculator", 4.2, "a 4.20% state rate, cut from 4.5% in 2023", "This reduced rate is scheduled to sunset in June 2027 unless extended by the legislature.", "This reflects South Dakota's current 4.20% state rate under its temporary 2023 reduction."),
  salesTaxTool("Tennessee", "tennessee-sales-tax-calculator", 7.0, "a 7.00% state rate", "Tennessee counties and cities commonly add a local option sales tax (often up to 2.75%) on top of this state rate.", "This reflects only Tennessee's STATE rate; local add-ons, which are common and can be significant, aren't included."),
  salesTaxTool("Texas", "texas-sales-tax-calculator", 6.25, "a 6.25% state rate", "Texas cities, counties, and special districts can add up to 2% in local sales tax on top of this state rate.", "This reflects only Texas's STATE rate; local add-ons, which are common and can add up to 2%, aren't included."),
  salesTaxTool("Utah", "utah-sales-tax-calculator", 6.1, "a combined 6.10% — 4.85% state plus a mandatory 1.25% statewide local rate", "This mandatory statewide local component means nearly every Utah purchase is taxed at at least this combined rate.", "This combines Utah's 4.85% state rate with its mandatory 1.25% statewide local rate; additional optional local add-ons in some areas aren't included."),
  salesTaxTool("Vermont", "vermont-sales-tax-calculator", 6.0, "a 6.00% state rate", "Some Vermont municipalities add a small local option tax on top of this state rate.", "This reflects Vermont's state-level rate; local add-ons where they apply aren't included."),
  salesTaxTool("Virginia", "virginia-sales-tax-calculator", 5.3, "a combined 5.30% — 4.3% state plus a 1% statewide local option commonly included in the quoted combined rate", "", "This combines Virginia's 4.3% state rate with its 1% statewide local option rate, as commonly quoted together."),
  salesTaxTool("Washington", "washington-sales-tax-calculator", 6.5, "a 6.50% state rate", "Washington cities and counties commonly add substantial local sales tax (in some areas up to about 3.9%) on top of this state rate.", "This reflects only Washington's STATE rate; local add-ons, which are common and can be significant, aren't included."),
  salesTaxTool("West Virginia", "west-virginia-sales-tax-calculator", 6.0, "a flat 6.00% state rate", "A small number of West Virginia municipalities add a modest local sales tax on top of this state rate.", "This reflects West Virginia's state-level rate; local add-ons where they apply aren't included."),
  salesTaxTool("Wisconsin", "wisconsin-sales-tax-calculator", 5.0, "a 5.00% state rate", "Most Wisconsin counties add a small (typically 0.5%) local sales tax on top of this state rate.", "This reflects only Wisconsin's STATE rate; county add-ons, which are common, aren't included."),
  salesTaxTool("Wyoming", "wyoming-sales-tax-calculator", 4.0, "a 4.00% state rate", "Wyoming counties can add a local option sales tax (up to about 2%) on top of this state rate.", "This reflects only Wyoming's STATE rate; local add-ons, which are common, aren't included."),
];

async function main() {
  const category = await prisma.toolCategory.upsert({
    where: { slug: CATEGORY_SLUG },
    update: { name: "Tax & Paycheck Calculators" },
    create: { name: "Tax & Paycheck Calculators", slug: CATEGORY_SLUG, templateKey: "category-template-1", viewStyle: "grid" },
  });

  for (const t of TOOLS) {
    const toolContent = {
      title: t.title,
      description: t.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify([purchaseField()]),
      calcResult: JSON.stringify({ label: t.title, unit: "", format: "currency" }),
      calcResults: JSON.stringify([currencyResult("salesTax", "Sales Tax"), currencyResult("totalWithTax", "Total Price (with tax)", { highlight: true })]),
      instructions: paragraphsToHtml(t.instructions),
      examples: paragraphsToHtml(t.examples),
      assumptions: paragraphsToHtml(t.assumptions),
      faq: JSON.stringify(t.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = { contentType: "tool", metaTitle: t.metaTitle, metaDescription: t.metaDescription, schemaType: "SoftwareApplication" };

    const existing = await prisma.tool.findUnique({ where: { slug: t.slug } });
    if (existing) {
      await prisma.tool.update({ where: { slug: t.slug }, data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } } });
      console.log(`Updated "${t.slug}".`);
    } else {
      await prisma.tool.create({ data: { slug: t.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } } });
      console.log(`Created "${t.slug}" (status: draft).`);
    }
  }

  console.log(`\nDone — ${TOOLS.length} tools created/updated, all status "draft". Review in /admin/tools.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
