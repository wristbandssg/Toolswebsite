// One-time (but safe to re-run) batch setup script: creates 50 US state
// Property Tax Tools inside the existing "Tax & Paycheck Calculators"
// category — eighth batch of the 50-state audit.
//
// See src/lib/calc-engine-us-property-tax.ts for the actual math and that
// file's header for why every state uses a published average EFFECTIVE
// rate (property tax is overwhelmingly local/county-set, not state-set),
// and which states have a small genuine state-level component worth
// calling out (Kentucky, Maryland, New Hampshire's SWEPT, Vermont's
// state-set town rates, Washington's State School Levy).
//
// HOW TO RUN
//   npx tsx prisma/create-us-property-tax-calculators.ts
// or
//   npm run db:create-us-property-tax-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "tax-paycheck-calculators";

function paragraphsToHtml(text: string): string {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${p}</p>`).join("");
}
function propertyValueField() {
  return { key: "propertyValue", label: "Property Value (assessed or market)", type: "currency", required: true, default: 300_000, min: 0, max: 5_000_000, step: 10_000 };
}
function currencyResult(key: string, label: string, opts: { highlight?: boolean } = {}) {
  return { key, label, format: "currency", highlight: opts.highlight };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. Property tax in the US is set almost entirely at the county, city, and school-district level, so " +
  "actual rates vary widely even within the same state — this uses a published statewide average effective " +
  "rate (tax paid as a percentage of property value) as an estimate, not an exact bill for a specific parcel. " +
  "Check your county assessor's office for your property's actual assessed value and mill rate.";

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

function propertyTaxTool(
  state: string,
  slug: string,
  ratePct: number,
  rankNote: string,
  instructionsExtra: string,
  assumptionsExtra: string
): ToolDef {
  const exampleValue = 300_000;
  const exampleTax = (exampleValue * ratePct) / 100;
  return {
    slug,
    title: `${state} Property Tax Calculator`,
    description: `Estimate ${state}'s annual property tax using its average effective rate of about ${ratePct}%${rankNote}.`,
    metaTitle: `${state} Property Tax Calculator (2026) — Free & Instant`,
    metaDescription: `Free ${state} property tax calculator. Average effective rate about ${ratePct}%.`,
    instructions: `${state}'s property tax is set locally (by county, city, and school district), but averages about ${ratePct}% of a property's value statewide. ${instructionsExtra} Enter your property's assessed or market value to see an estimated annual property tax.`,
    examples: `Example: a $${exampleValue.toLocaleString()} home. Estimated annual ${state} property tax at the statewide average rate: $${exampleValue.toLocaleString()} x ${ratePct}% = $${exampleTax.toLocaleString()}.`,
    assumptions: `This calculator uses ${state}'s published statewide average EFFECTIVE property tax rate. ${assumptionsExtra}\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: `Why is my actual ${state} property tax bill different from this estimate?`, answer: `Because property tax rates in ${state} vary by county, city, and school district — this uses a statewide average, not your specific local mill rate or your property's official assessed value (which can differ from market value).` }],
  };
}

const TOOLS: ToolDef[] = [
  propertyTaxTool("Alabama", "alabama-property-tax-calculator", 0.38, " — the lowest among comparable states", "Alabama's rate is among the lowest in the country.", ""),
  propertyTaxTool("Alaska", "alaska-property-tax-calculator", 1.14, "", "Alaska has no state-level property tax at all — this is entirely a local (borough/city) tax, and many rural areas outside organized boroughs levy little or none.", "Alaska property tax is levied exclusively by boroughs and cities; areas outside organized boroughs often have no property tax at all."),
  propertyTaxTool("Arizona", "arizona-property-tax-calculator", 0.52, "", "", ""),
  propertyTaxTool("Arkansas", "arkansas-property-tax-calculator", 0.57, "", "", ""),
  propertyTaxTool("California", "california-property-tax-calculator", 0.71, "", "California's Proposition 13 caps the base rate at 1% of assessed value plus local voter-approved additions, and limits how fast assessed value can rise year to year — so a longtime owner's effective rate is often well below a recent buyer's.", "California's Prop 13 assessed-value growth cap means this average blends long-time owners (paying much less) with recent buyers (paying closer to the full rate) — your own rate depends heavily on how recently you purchased."),
  propertyTaxTool("Colorado", "colorado-property-tax-calculator", 0.49, "", "", ""),
  propertyTaxTool("Connecticut", "connecticut-property-tax-calculator", 1.92, " — the highest among comparable states", "Connecticut's property tax is set entirely at the municipal level and is among the highest in the country.", ""),
  propertyTaxTool("Delaware", "delaware-property-tax-calculator", 0.53, "", "Delaware's property tax is set by its 3 counties, and assessed values in some counties are notoriously outdated (based on decades-old reassessments), which can distort the effective rate on paper.", "Some Delaware counties use assessed values from very old reassessment cycles, which can make published mill rates look different from the true effective rate — this average reflects tax actually paid relative to current market value."),
  propertyTaxTool("Florida", "florida-property-tax-calculator", 0.79, "", "Florida's Save Our Homes cap limits how fast a primary residence's assessed value can rise each year, so longtime homeowners often pay a lower effective rate than recent buyers.", "Florida's Save Our Homes assessment cap means this average blends longtime homeowners (paying less) with recent buyers (paying closer to the full rate)."),
  propertyTaxTool("Georgia", "georgia-property-tax-calculator", 0.81, "", "", ""),
  propertyTaxTool("Hawaii", "hawaii-property-tax-calculator", 0.27, " — the lowest in the US", "Hawaii has the lowest average effective property tax rate of any state.", ""),
  propertyTaxTool("Idaho", "idaho-property-tax-calculator", 0.53, "", "", ""),
  propertyTaxTool("Illinois", "illinois-property-tax-calculator", 2.07, " — among the highest in the US", "Illinois has one of the highest average effective property tax rates in the country.", ""),
  propertyTaxTool("Indiana", "indiana-property-tax-calculator", 0.74, "", "Indiana's state constitution caps property tax at 1% of assessed value for homesteads, 2% for other residential/farmland, and 3% for other real property — a genuine circuit-breaker limit on how high the bill can go.", "Indiana's constitutional circuit-breaker caps (1%/2%/3% depending on property type) mean this average already reflects those limits."),
  propertyTaxTool("Iowa", "iowa-property-tax-calculator", 1.43, "", "", ""),
  propertyTaxTool("Kansas", "kansas-property-tax-calculator", 1.3, "", "", ""),
  propertyTaxTool("Kentucky", "kentucky-property-tax-calculator", 0.785, "", "Kentucky is unusual in having a small genuine STATE-level property tax rate (10.9 cents per $100 of assessed value for 2026, its sixth straight annual cut) layered on top of local county, city, and school district rates.", "This blends Kentucky's small state-level rate with its local rates into a single published average effective rate."),
  propertyTaxTool("Louisiana", "louisiana-property-tax-calculator", 0.55, "", "Louisiana's generous homestead exemption shields a meaningful portion of a primary residence's value from tax, helping keep its average effective rate low.", "Louisiana's homestead exemption (which shields a set amount of assessed value for primary residences) is reflected in this average."),
  propertyTaxTool("Maine", "maine-property-tax-calculator", 1.1, "", "", ""),
  propertyTaxTool("Maryland", "maryland-property-tax-calculator", 1.0, "", "Maryland is unusual in having a small genuine STATE-level property tax rate (11.2 cents per $100 for FY2026) layered on top of local county and municipal rates.", "This blends Maryland's small state-level rate with its local rates into a single published average effective rate."),
  propertyTaxTool("Massachusetts", "massachusetts-property-tax-calculator", 1.0, "", "", ""),
  propertyTaxTool("Michigan", "michigan-property-tax-calculator", 1.25, "", "", "Michigan's effective rate varies more than most states depending on source and locality (roughly 1.11%-1.38%); this uses the midpoint of that range."),
  propertyTaxTool("Minnesota", "minnesota-property-tax-calculator", 1.03, "", "Minnesota layers a state-administered property tax on commercial, industrial, and seasonal-recreational property on top of its local system (covered separately under Minnesota's Other Business Tax calculator) — this residential-oriented average reflects the local system most homeowners actually pay.", "Minnesota's state-administered commercial/seasonal-recreational property tax is a separate levy from the general local rate estimated here."),
  propertyTaxTool("Mississippi", "mississippi-property-tax-calculator", 0.7, "", "", ""),
  propertyTaxTool("Missouri", "missouri-property-tax-calculator", 0.89, "", "", ""),
  propertyTaxTool("Montana", "montana-property-tax-calculator", 0.61, "", "", ""),
  propertyTaxTool("Nebraska", "nebraska-property-tax-calculator", 1.44, "", "", ""),
  propertyTaxTool("Nevada", "nevada-property-tax-calculator", 0.5, "", "", ""),
  propertyTaxTool("New Hampshire", "new-hampshire-property-tax-calculator", 1.5, "", "New Hampshire has no sales or general income tax, so it relies heavily on property tax; a small state-level component (the Statewide Education Property Tax, or 'SWEPT') is layered on top of local town and school district rates.", "This blends New Hampshire's SWEPT state-level component with local rates into a single published average effective rate."),
  propertyTaxTool("New Jersey", "new-jersey-property-tax-calculator", 1.88, " — the highest in the US", "New Jersey has the highest average effective property tax rate of any state.", ""),
  propertyTaxTool("New Mexico", "new-mexico-property-tax-calculator", 0.63, "", "", ""),
  propertyTaxTool("New York", "new-york-property-tax-calculator", 1.3, "", "New York's effective rate varies enormously by region — often much lower in New York City (due to assessment rules) than in many upstate counties.", "New York City's property tax assessment rules produce meaningfully different effective rates than much of upstate New York; this is a single statewide average."),
  propertyTaxTool("North Carolina", "north-carolina-property-tax-calculator", 0.66, "", "", ""),
  propertyTaxTool("North Dakota", "north-dakota-property-tax-calculator", 0.92, "", "", ""),
  propertyTaxTool("Ohio", "ohio-property-tax-calculator", 1.36, "", "", ""),
  propertyTaxTool("Oklahoma", "oklahoma-property-tax-calculator", 0.79, "", "", ""),
  propertyTaxTool("Oregon", "oregon-property-tax-calculator", 0.81, "", "Oregon's Measure 50 limits how fast assessed value can grow each year, so longtime owners often pay a lower effective rate than recent buyers.", "Oregon's Measure 50 assessed-value growth limit means this average blends longtime owners (paying less) with recent buyers (paying closer to the full rate)."),
  propertyTaxTool("Pennsylvania", "pennsylvania-property-tax-calculator", 1.26, "", "", ""),
  propertyTaxTool("Rhode Island", "rhode-island-property-tax-calculator", 1.19, "", "", ""),
  propertyTaxTool("South Carolina", "south-carolina-property-tax-calculator", 0.49, " — the lowest among comparable states", "South Carolina's owner-occupied primary residences also qualify for a favorable assessment ratio that further lowers the effective rate for many homeowners.", ""),
  propertyTaxTool("South Dakota", "south-dakota-property-tax-calculator", 1.09, "", "", ""),
  propertyTaxTool("Tennessee", "tennessee-property-tax-calculator", 0.55, "", "", ""),
  propertyTaxTool("Texas", "texas-property-tax-calculator", 1.58, "", "Texas has no state income tax, so it relies heavily on property tax, which is set entirely by counties, cities, school districts, and special districts.", "Texas effective rates vary by source in the roughly 1.25%-1.58% range depending on methodology; this uses the higher end reported in the audit."),
  propertyTaxTool("Utah", "utah-property-tax-calculator", 0.53, "", "", ""),
  propertyTaxTool("Vermont", "vermont-property-tax-calculator", 1.71, " — among the highest in the US", "Vermont is unusual: the state itself sets separate homestead and non-homestead education property tax rates for each town (funding local schools), even though the tax is still billed and collected locally.", "Vermont's state-set homestead/non-homestead education tax rates (which vary by town) are blended into this single published average effective rate."),
  propertyTaxTool("Virginia", "virginia-property-tax-calculator", 0.74, "", "", ""),
  propertyTaxTool("Washington", "washington-property-tax-calculator", 0.84, "", "Washington is unusual in having a genuine state-level property tax component — the State School Levy, a state-set rate collected through county assessors — layered on top of local rates.", "This blends Washington's State School Levy state-level component with local rates into a single published average effective rate."),
  propertyTaxTool("West Virginia", "west-virginia-property-tax-calculator", 0.54, "", "", ""),
  propertyTaxTool("Wisconsin", "wisconsin-property-tax-calculator", 1.51, "", "", ""),
  propertyTaxTool("Wyoming", "wyoming-property-tax-calculator", 0.58, "", "", ""),
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
      calcInputs: JSON.stringify([propertyValueField()]),
      calcResult: JSON.stringify({ label: t.title, unit: "", format: "currency" }),
      calcResults: JSON.stringify([currencyResult("totalTax", "Estimated Annual Property Tax", { highlight: true })]),
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
