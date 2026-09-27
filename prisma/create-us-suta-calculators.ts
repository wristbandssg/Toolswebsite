// One-time (but safe to re-run) batch setup script: creates 50 US state
// Unemployment Tax (SUTA) Tools inside the existing "Tax & Paycheck
// Calculators" category — ninth batch of the 50-state audit.
//
// See src/lib/calc-engine-us-suta.ts for the actual math and that file's
// header for which states use a dropdown for a confirmed 2/3-way
// new-employer rate split, and which states' rate is a disclosed
// approximation (wide industry variance or conflicting sources).
//
// HOW TO RUN
//   npx tsx prisma/create-us-suta-calculators.ts
// or
//   npm run db:create-us-suta-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "tax-paycheck-calculators";

function paragraphsToHtml(text: string): string {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${p}</p>`).join("");
}
function wagesField(label = "Employee's Annual Wages") {
  return { key: "annualWages", label, type: "currency", required: true, default: 40_000, min: 0, max: 200_000, step: 1_000 };
}
function currencyField(key: string, label: string, opts: { required?: boolean; default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "currency", required: opts.required ?? false, default: opts.default ?? 0, min: 0, max: opts.max ?? 2_000_000, step: opts.step ?? 10_000 };
}
function dropdownField(key: string, label: string, options: { label: string; value: number }[], defaultValue = 0) {
  return { key, label, type: "dropdown", required: true, default: defaultValue, options };
}
function currencyResult(key: string, label: string, opts: { highlight?: boolean } = {}) {
  return { key, label, format: "currency", highlight: opts.highlight };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. This models the NEW-EMPLOYER rate — most states adjust an established employer's actual rate up or " +
  "down over time based on that employer's own unemployment-claims history (its 'experience rate'), which " +
  "isn't a published state figure and isn't modeled here. Check with your state's unemployment insurance " +
  "agency for your business's actual current rate.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

function sutaTool(
  state: string,
  slug: string,
  wageBase: number,
  ratePct: number,
  instructionsExtra: string,
  assumptionsExtra: string
): ToolDef {
  const exampleWages = 40_000;
  const exampleTaxable = Math.min(exampleWages, wageBase);
  const exampleTax = (exampleTaxable * ratePct) / 100;
  return {
    slug,
    title: `${state} Unemployment Tax Calculator`,
    description: `Estimate ${state}'s SUTA (State Unemployment Tax): a $${wageBase.toLocaleString()} taxable wage base at a new-employer rate of about ${ratePct}%.`,
    metaTitle: `${state} Unemployment Tax Calculator (2026) — Free & Instant`,
    metaDescription: `Free ${state} SUTA calculator. $${wageBase.toLocaleString()} wage base, new-employer rate about ${ratePct}%.`,
    calcInputs: [wagesField()],
    calcResults: [currencyResult("totalTax", `${state} SUTA (per employee)`, { highlight: true })],
    instructions: `${state} taxes only the first $${wageBase.toLocaleString()} of each employee's annual wages for unemployment insurance, at a new-employer rate of about ${ratePct}%. ${instructionsExtra} Enter an employee's annual wages to see the estimated SUTA owed for that employee.`,
    examples: `Example: an employee earning $${exampleWages.toLocaleString()}/year. Taxable wages: $${exampleTaxable.toLocaleString()} (capped at the wage base). Estimated ${state} SUTA: $${exampleTaxable.toLocaleString()} x ${ratePct}% = $${exampleTax.toFixed(2)}.`,
    assumptions: `This calculator uses ${state}'s published new-employer SUTA rate and wage base. ${assumptionsExtra}\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Does this rate apply to every employer?", answer: "No — this is the NEW-EMPLOYER rate. Established employers' rates rise or fall over time based on their own layoff/claims history, which can push their actual rate well above or below this figure." }],
  };
}

const TOOLS: ToolDef[] = [
  sutaTool("Alabama", "alabama-unemployment-tax-calculator", 8_000, 2.7, "", ""),
  sutaTool("Alaska", "alaska-unemployment-tax-calculator", 54_200, 1.5, "Alaska's wage base is notably high compared to most states.", ""),
  sutaTool("Arizona", "arizona-unemployment-tax-calculator", 8_000, 2.0, "", ""),
  sutaTool("Arkansas", "arkansas-unemployment-tax-calculator", 7_000, 2.0, "", ""),
  sutaTool("California", "california-unemployment-tax-calculator", 7_000, 3.4, "", ""),
  {
    slug: "colorado-unemployment-tax-calculator",
    title: "Colorado Unemployment Tax Calculator",
    description: "Estimate Colorado's SUTA — a $30,600 wage base at 3.05% (standard) or 6.285% (heavy construction).",
    metaTitle: "Colorado Unemployment Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Colorado SUTA calculator. $30,600 wage base, 3.05% standard or 6.285% heavy construction.",
    calcInputs: [wagesField(), dropdownField("isHeavyConstruction", "Industry", [{ label: "Standard industry", value: 0 }, { label: "Heavy construction", value: 1 }])],
    calcResults: [currencyResult("totalTax", "Colorado SUTA (per employee)", { highlight: true })],
    instructions: "Colorado taxes the first $30,600 of each employee's annual wages at a new-employer rate of 3.05% for most industries — but heavy construction employers pay a much higher 6.285%. Enter an employee's annual wages and select the industry to see the estimated SUTA.",
    examples: "Example: an employee earning $40,000/year at a standard-industry employer. Taxable wages: $30,600. Estimated SUTA: $30,600 x 3.05% = $933.30.",
    assumptions: `This calculator applies Colorado's published $30,600 wage base and its confirmed standard (3.05%) and heavy-construction (6.285%) new-employer rates.\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Why is the heavy construction rate so much higher?", answer: "Heavy construction has historically had much higher unemployment claims than most industries, so Colorado (like several states) sets a materially higher new-employer rate for it." }],
  },
  sutaTool("Connecticut", "connecticut-unemployment-tax-calculator", 27_000, 1.9, "", ""),
  sutaTool("Delaware", "delaware-unemployment-tax-calculator", 14_500, 1.2, "", ""),
  sutaTool("Florida", "florida-unemployment-tax-calculator", 7_000, 2.7, "Florida officially calls this its 'Reemployment Tax' rather than SUTA, though it functions identically.", ""),
  sutaTool("Georgia", "georgia-unemployment-tax-calculator", 9_500, 2.7, "", ""),
  sutaTool("Hawaii", "hawaii-unemployment-tax-calculator", 64_500, 2.4, "Hawaii's wage base is among the highest in the country.", ""),
  sutaTool("Idaho", "idaho-unemployment-tax-calculator", 58_300, 1.0, "Idaho's wage base is notably high compared to most states.", ""),
  sutaTool("Illinois", "illinois-unemployment-tax-calculator", 14_250, 3.35, "A small number of Illinois industries pay a slightly higher 3.45% new-employer rate, not modeled here.", "This uses Illinois's standard 3.35% new-employer rate; a handful of specific industries pay 3.45% instead."),
  sutaTool("Indiana", "indiana-unemployment-tax-calculator", 9_500, 2.5, "", ""),
  sutaTool("Iowa", "iowa-unemployment-tax-calculator", 20_400, 1.0, "", ""),
  sutaTool("Kansas", "kansas-unemployment-tax-calculator", 15_100, 1.75, "", "This rate was confirmed from a single source this session and wasn't independently cross-verified — check with the Kansas Department of Labor for the current confirmed figure."),
  sutaTool("Kentucky", "kentucky-unemployment-tax-calculator", 12_000, 2.7, "", ""),
  sutaTool("Louisiana", "louisiana-unemployment-tax-calculator", 7_000, 2.0, "Louisiana's actual new-employer rate varies by industry, roughly between 1.2% and 2.8%.", "This uses the midpoint of Louisiana's confirmed 1.2%-2.8% industry range as a single representative estimate."),
  sutaTool("Maine", "maine-unemployment-tax-calculator", 12_000, 2.54, "This includes Maine's Competitive Skills Scholarship Fund (CSSF) and Unemployment Program Administrative Fund (UPAF) add-ons.", ""),
  sutaTool("Maryland", "maryland-unemployment-tax-calculator", 8_500, 1.8, "Maryland's wage base is unusually low, and its new-employer rate varies by industry between about 1.0% and 2.6%.", "This uses the midpoint of Maryland's confirmed 1.0%-2.6% industry range as a single representative estimate."),
  sutaTool("Massachusetts", "massachusetts-unemployment-tax-calculator", 15_000, 2.13, "", ""),
  {
    slug: "michigan-unemployment-tax-calculator",
    title: "Michigan Unemployment Tax Calculator",
    description: "Estimate Michigan's SUTA — a $9,000 wage base at 2.7% (standard) or 5% (construction).",
    metaTitle: "Michigan Unemployment Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Michigan SUTA calculator. $9,000 wage base, 2.7% standard or 5% construction.",
    calcInputs: [wagesField(), dropdownField("isConstruction", "Industry", [{ label: "Standard industry", value: 0 }, { label: "Construction", value: 1 }])],
    calcResults: [currencyResult("totalTax", "Michigan SUTA (per employee)", { highlight: true })],
    instructions: "Michigan taxes the first $9,000 of each employee's annual wages (rising to $9,500 for delinquent employers) at a new-employer rate of 2.7% for most industries — but construction employers pay a much higher 5%. Enter an employee's annual wages and select the industry to see the estimated SUTA.",
    examples: "Example: an employee earning $12,000/year at a standard-industry employer. Taxable wages: $9,000. Estimated SUTA: $9,000 x 2.7% = $243.00.",
    assumptions: `This calculator applies Michigan's published $9,000 wage base and its confirmed standard (2.7%) and construction (5%) new-employer rates; delinquent employers face a higher $9,500 wage base, not modeled here.\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Why is the construction rate so much higher?", answer: "Construction has historically had much higher unemployment claims than most industries, so Michigan sets a materially higher new-employer rate for it." }],
  },
  sutaTool("Minnesota", "minnesota-unemployment-tax-calculator", 44_000, 2.9, "Minnesota's new-employer rate varies enormously by industry, from about 1% up to 8.9%, plus a 0.4% base-rate add-on that applies to nearly every employer.", "Minnesota's rate varies so widely by industry (1%-8.9%) that no single figure is representative — this uses an approximate mid-range estimate plus the near-universal 0.4% add-on; your industry's actual rate could be substantially higher or lower."),
  {
    slug: "mississippi-unemployment-tax-calculator",
    title: "Mississippi Unemployment Tax Calculator",
    description: "Estimate Mississippi's SUTA — a $14,000 wage base at a rate that rises by the employer's year (1.0% year 1, 1.1% year 2, 1.2% year 3+).",
    metaTitle: "Mississippi Unemployment Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Mississippi SUTA calculator. $14,000 wage base, rate rises 1.0%/1.1%/1.2% by employer year.",
    calcInputs: [wagesField(), dropdownField("employerYear", "How many years has your business been paying Mississippi SUTA?", [{ label: "Year 1 (new employer)", value: 1 }, { label: "Year 2", value: 2 }, { label: "Year 3 or more", value: 3 }])],
    calcResults: [currencyResult("totalTax", "Mississippi SUTA (per employee)", { highlight: true })],
    instructions: "Mississippi taxes the first $14,000 of each employee's annual wages, at a rate that starts at 1.0% for a brand-new employer and rises to 1.1% in year 2 and 1.2% in year 3 and beyond. Enter an employee's annual wages and how long your business has been paying SUTA to see the estimated tax.",
    examples: "Example: an employee earning $14,000/year at a year-1 employer. Estimated SUTA: $14,000 x 1.0% = $140.00.",
    assumptions: `This calculator applies Mississippi's published wage base and its confirmed 3-year rate schedule (1.0%/1.1%/1.2%).\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Does the rate keep rising after year 3?", answer: "No — 1.2% is Mississippi's standing new-employer rate from year 3 onward, before any experience-rating adjustment based on the employer's own claims history." }],
  },
  sutaTool("Missouri", "missouri-unemployment-tax-calculator", 9_000, 2.376, "Nonprofit employers in Missouri pay a lower 1% rate, not modeled here.", "This uses Missouri's standard new-employer rate; qualifying nonprofits pay 1% instead."),
  sutaTool("Montana", "montana-unemployment-tax-calculator", 47_300, 1.7, "Montana's new-employer rate varies by industry, roughly between 1.3% and 2.1%.", "This uses the midpoint of Montana's confirmed 1.3%-2.1% industry range as a single representative estimate."),
  {
    slug: "nebraska-unemployment-tax-calculator",
    title: "Nebraska Unemployment Tax Calculator",
    description: "Estimate Nebraska's SUTA — a $9,000 wage base at 1.25% (standard) or 5.40% (construction).",
    metaTitle: "Nebraska Unemployment Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Nebraska SUTA calculator. $9,000 standard wage base, 1.25% standard or 5.40% construction.",
    calcInputs: [wagesField(), dropdownField("isConstruction", "Industry", [{ label: "Standard industry", value: 0 }, { label: "Construction", value: 1 }])],
    calcResults: [currencyResult("totalTax", "Nebraska SUTA (per employee)", { highlight: true })],
    instructions: "Nebraska taxes the first $9,000 of each employee's annual wages (employers who reach the maximum experience rate instead use a higher $24,000 wage base, not modeled here) at a new-employer rate of 1.25% for most industries — but construction employers pay a much higher 5.40%. Enter an employee's annual wages and select the industry to see the estimated SUTA.",
    examples: "Example: an employee earning $12,000/year at a standard-industry employer. Taxable wages: $9,000. Estimated SUTA: $9,000 x 1.25% = $112.50.",
    assumptions: `This calculator applies Nebraska's standard $9,000 wage base and its confirmed standard (1.25%) and construction (5.40%) new-employer rates; employers at the maximum experience rate instead use a $24,000 wage base, which isn't modeled here.\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Why is the construction rate so much higher?", answer: "Construction has historically had much higher unemployment claims than most industries, so Nebraska sets a materially higher new-employer rate for it." }],
  },
  sutaTool("Nevada", "nevada-unemployment-tax-calculator", 43_700, 2.95, "", ""),
  sutaTool("New Hampshire", "new-hampshire-unemployment-tax-calculator", 14_000, 2.2, "Published sources conflict on New Hampshire's exact new-employer rate, with figures ranging from about 1.7% to 2.7%.", "New Hampshire's new-employer rate could not be pinned to one confirmed figure this session — this uses the midpoint of the conflicting range found (~1.7%-2.7%); verify the current rate with New Hampshire Employment Security."),
  {
    slug: "new-jersey-unemployment-tax-calculator",
    title: "New Jersey Unemployment Tax Calculator",
    description: "Estimate New Jersey's SUTA — unique among all 50 states in charging both the employer (2.8%) AND the employee (0.425%) on a $44,800 wage base.",
    metaTitle: "New Jersey Unemployment Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free New Jersey SUTA calculator. $44,800 wage base; 2.8% employer share plus 0.425% employee share.",
    calcInputs: [wagesField()],
    calcResults: [currencyResult("employerSuta", "Employer's Share (2.8%)"), currencyResult("employeeSuta", "Employee's Share (0.425%)"), currencyResult("totalSuta", "Total New Jersey SUTA", { highlight: true })],
    instructions: "New Jersey is the only US state where employees also contribute directly to state unemployment insurance. On the first $44,800 of each employee's annual wages, the employer pays 2.8% and the employee separately pays 0.425% (typically withheld from paychecks). Enter an employee's annual wages to see both shares and the combined total.",
    examples: "Example: an employee earning $50,000/year (above the wage base). Taxable wages: $44,800. Employer's share: $1,254.40. Employee's share: $190.40. Combined total: $1,444.80.",
    assumptions: `This calculator applies New Jersey's published $44,800 wage base and both its employer (2.8%) and employee (0.425%) new-employer contribution rates.\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Do employees really pay unemployment tax themselves in New Jersey?", answer: "Yes — New Jersey is unique among US states in requiring a small employee-paid SUTA contribution (0.425%) in addition to the employer's share, typically withheld directly from paychecks." }],
  },
  sutaTool("New Mexico", "new-mexico-unemployment-tax-calculator", 34_800, 1.0, "", ""),
  sutaTool("New York", "new-york-unemployment-tax-calculator", 13_000, 4.1, "This includes New York's 0.075% Re-employment Service Fund (RSF) add-on.", "New York's wage base ($13,000) is unusually low compared to most states, even though its rate is comparatively high."),
  sutaTool("North Carolina", "north-carolina-unemployment-tax-calculator", 34_200, 1.0, "", ""),
  {
    slug: "north-dakota-unemployment-tax-calculator",
    title: "North Dakota Unemployment Tax Calculator",
    description: "Estimate North Dakota's SUTA — a $46,600 wage base at a bifurcated rate: 1.03% for positive-balance industries, 6.09% for negative-balance industries.",
    metaTitle: "North Dakota Unemployment Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free North Dakota SUTA calculator. $46,600 wage base; 1.03% positive-balance or 6.09% negative-balance.",
    calcInputs: [wagesField(), dropdownField("isNegativeBalance", "Industry Classification", [{ label: "Positive-balance industry", value: 0 }, { label: "Negative-balance industry", value: 1 }])],
    calcResults: [currencyResult("totalTax", "North Dakota SUTA (per employee)", { highlight: true })],
    instructions: "North Dakota taxes the first $46,600 of each employee's annual wages, but its new-employer rate is bifurcated by industry classification: 1.03% for industries with a historically positive unemployment-fund balance, versus a much higher 6.09% for industries with a historically negative balance. Enter an employee's annual wages and select the classification to see the estimated SUTA.",
    examples: "Example: an employee earning $50,000/year at a positive-balance-industry employer. Taxable wages: $46,600. Estimated SUTA: $46,600 x 1.03% = $479.98.",
    assumptions: `This calculator applies North Dakota's published $46,600 wage base and its confirmed bifurcated positive-balance (1.03%) and negative-balance (6.09%) new-employer rates.\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "How do I know if my industry is positive- or negative-balance?", answer: "North Dakota Job Service classifies each industry based on its historical unemployment-claims experience relative to contributions — check with Job Service North Dakota to confirm your industry's classification." }],
  },
  sutaTool("Ohio", "ohio-unemployment-tax-calculator", 9_000, 2.85, "Ohio's wage base is among the lowest in the country.", ""),
  sutaTool("Oklahoma", "oklahoma-unemployment-tax-calculator", 25_000, 1.5, "", ""),
  sutaTool("Oregon", "oregon-unemployment-tax-calculator", 56_700, 2.4, "Oregon's wage base is among the highest in the country.", ""),
  sutaTool("Pennsylvania", "pennsylvania-unemployment-tax-calculator", 10_000, 3.822, "Pennsylvania's new-employer rate is notably higher than most states.", ""),
  sutaTool("Rhode Island", "rhode-island-unemployment-tax-calculator", 30_800, 1.21, "This includes Rhode Island's 0.21% Job Development Assessment (JDA) add-on.", ""),
  sutaTool("South Carolina", "south-carolina-unemployment-tax-calculator", 14_000, 1.0, "Published sources leave South Carolina's exact new-employer rate somewhat unclear — a small Contingency Assessment (0.21%) may apply instead of, or alongside, a base rate, described as 'whichever is higher.'", "South Carolina's new-employer rate structure wasn't fully confirmed this session; this uses the more commonly cited 1.0% figure — verify the current rate with the South Carolina Department of Employment and Workforce."),
  sutaTool("South Dakota", "south-dakota-unemployment-tax-calculator", 15_000, 1.75, "This includes South Dakota's 0.55% investment fee alongside its ~1.20% base new-employer (non-construction, year 1) rate.", ""),
  sutaTool("Tennessee", "tennessee-unemployment-tax-calculator", 7_000, 2.7, "This rate applies for a new employer's first 3 years.", ""),
  sutaTool("Texas", "texas-unemployment-tax-calculator", 9_000, 2.7, "Texas's actual new-employer rate can instead be set to the average rate for the employer's specific industry.", "This uses Texas's commonly published 2.7% new-employer rate; some industries are instead assigned their own industry-average rate."),
  sutaTool("Utah", "utah-unemployment-tax-calculator", 50_700, 2.5, "Utah's new-employer rate varies by industry rather than using a single published flat figure.", "Utah publishes new-employer rates by industry rather than one flat figure — this uses an approximate representative rate; your industry's actual assigned rate could differ meaningfully."),
  sutaTool("Vermont", "vermont-unemployment-tax-calculator", 15_400, 1.0, "This rate applies to most new employers.", ""),
  sutaTool("Virginia", "virginia-unemployment-tax-calculator", 8_000, 2.5, "Virginia's new-employer rate can include additional small pool-cost and fund-building add-ons on top of the base rate.", "This uses Virginia's base new-employer rate; additional small add-ons may apply on top."),
  sutaTool("Washington", "washington-unemployment-tax-calculator", 78_200, 1.3, "Washington assigns new-employer rates by industry and experience rather than using a single published flat figure, and its wage base is the highest of any state.", "Washington publishes new-employer rates by industry rather than one flat figure — this uses an approximate representative rate; your industry's actual assigned rate could differ meaningfully."),
  sutaTool("West Virginia", "west-virginia-unemployment-tax-calculator", 9_500, 2.7, "West Virginia's exact current new-employer rate could not be confirmed from a clean, up-to-date source this session.", "West Virginia's new-employer rate wasn't independently confirmed from a clean source this session — this uses a commonly cited placeholder figure; verify the current rate with WorkForce West Virginia."),
  {
    slug: "wisconsin-unemployment-tax-calculator",
    title: "Wisconsin Unemployment Tax Calculator",
    description: "Estimate Wisconsin's SUTA — a $14,000 wage base at 3.05% (payroll under $500,000) or 3.25% (payroll at/above $500,000).",
    metaTitle: "Wisconsin Unemployment Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Wisconsin SUTA calculator. $14,000 wage base, 3.05% under $500K payroll or 3.25% at/above.",
    calcInputs: [wagesField(), currencyField("totalAnnualPayroll", "Business's Total Annual Payroll", { required: true, default: 200_000, max: 5_000_000, step: 25_000 })],
    calcResults: [currencyResult("totalTax", "Wisconsin SUTA (per employee)", { highlight: true })],
    instructions: "Wisconsin taxes the first $14,000 of each employee's annual wages, at a new-employer rate of 3.05% for businesses with total annual payroll under $500,000, or 3.25% for businesses at or above that threshold. Enter an employee's annual wages and your business's total annual payroll to see the estimated SUTA.",
    examples: "Example: an employee earning $14,000/year at a business with $200,000 in total annual payroll. Estimated SUTA: $14,000 x 3.05% = $427.00.",
    assumptions: `This calculator applies Wisconsin's published $14,000 wage base and its confirmed $500,000 payroll-size rate threshold (3.05%/3.25%).\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Is the $500,000 threshold based on one employee's wages or the whole business?", answer: "The whole business — it's your business's TOTAL annual payroll across all employees, not any single employee's wages, that determines which rate applies." }],
  },
  sutaTool("Wyoming", "wyoming-unemployment-tax-calculator", 33_800, 2.0, "Wyoming's new-employer rate varies by industry rather than using a single confirmed flat figure.", "Wyoming's new-employer rate wasn't confirmed as a single flat figure this session — this uses an approximate representative rate; verify the current rate with the Wyoming Department of Workforce Services."),
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
      calcInputs: JSON.stringify(t.calcInputs),
      calcResult: JSON.stringify({ label: t.title, unit: "", format: "currency" }),
      calcResults: JSON.stringify(t.calcResults),
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
