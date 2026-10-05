// One-time (but safe to re-run) batch setup script: creates the Home & Property Insurance tools
// (8) of the Insurance Calculators expansion, filed under Insurance Calculators >
// Home & Property Insurance Calculators (both categories are created on first run).
// See src/lib/calc-engine-ins-home-property.ts for the math and
// src/lib/calc-engine-ins-life-core.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-ins-home-property-calculators.ts
// or
//   npm run db:create-ins-home-property-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Insurance Calculators", slug: "insurance-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Home & Property Insurance Calculators", slug: "home-property-insurance-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function currencyField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 100000000,
    step: opts.step ?? 100,
  };
}

function percentField(
  key: string,
  label: string,
  opts: { required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "percentage",
    unit: "%",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 100,
    step: opts.step ?? 0.1,
  };
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

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't insurance, financial or " +
  "legal advice. Premiums and coverage depend on the insurer, your state and your details — get quotes from " +
  "licensed insurers or agents for exact figures.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "renters-insurance-calculator",
    title: "Renters Insurance Calculator",
    description: "Estimate renters insurance from the value of your belongings: yearly and monthly premium, and what you'd get back if everything were lost.",
    metaTitle: "Renters Insurance Calculator — Cost & Coverage",
    metaDescription: "Free renters insurance calculator. Estimate your premium from the value of your belongings and see the payout on a total loss.",
    calcInputs: [
      currencyField("belongings", "Value of Your Belongings", { default: 30000, max: 10000000, step: 1000 }),
      currencyField("ratePer1000", "Rate per $1,000 of Belongings", { default: 5, max: 100, step: 0.25 }),
      currencyField("basePremium", "Base Premium (Liability & Fees)", { default: 60, max: 10000, step: 5 }),
      currencyField("deductible", "Deductible", { default: 500, max: 10000, step: 250 }),
    ],
    calcResult: { label: "Monthly Premium", format: "currency" },
    calcResults: [
      { key: "annualPremium", label: "Annual Premium", format: "currency" },
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency", highlight: true },
      { key: "payoutOnTotalLoss", label: "Payout on a Total Loss", format: "currency" },
      { key: "costPer1000Covered", label: "Cost per $1,000 Covered", format: "currency" },
    ],
    instructions:
      "Your landlord's insurance covers the building, not your things. Renters insurance covers your belongings against fire, " +
      "theft and other perils, plus personal liability and extra living costs if you have to move out — often for $15–$25 " +
      "a month. Choose replacement-cost coverage so you aren't paid only depreciated value.\n\n" +
      "Walk through your home and add up what it would cost to replace everything; most people underestimate it.",
    examples:
      "Example: insuring $30,000 of belongings at $5 per $1,000 plus a $60 base costs $210 a " +
      "year — $17.50 a month. After a total loss you'd receive $29,500.",
    assumptions:
      "Replacement-cost coverage; jewelry and valuables have low sub-limits. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does renters insurance cover my roommate?",
        answer: "Only if they're named on the policy. Roommates usually each need their own.",
      },
    ],
  },
  {
    slug: "condo-insurance-calculator",
    title: "Condo Insurance Calculator",
    description: "Estimate condo (HO-6) insurance for walls-in coverage, belongings and loss assessment, and check that loss assessment covers your share of the HOA's master policy deductible.",
    metaTitle: "Condo Insurance Calculator — HO-6 Premium & Coverage",
    metaDescription: "Free condo insurance calculator. Estimate your HO-6 premium and check loss assessment against your share of the HOA master deductible.",
    calcInputs: [
      currencyField("wallsIn", "Walls-In (Interior) Coverage", { default: 50000, max: 10000000, step: 5000 }),
      currencyField("belongings", "Belongings Coverage", { default: 30000, max: 10000000, step: 1000 }),
      currencyField("lossAssessment", "Loss Assessment Coverage", { default: 25000, max: 1000000, step: 5000 }),
      currencyField("ratePer1000", "Rate per $1,000", { default: 4, max: 100, step: 0.25 }),
      currencyField("masterDeductible", "HOA Master Policy Deductible", { default: 25000, max: 10000000, step: 5000 }),
      numberField("units", "Units Sharing an Assessment", { default: 20, min: 1, max: 5000, step: 1 }),
    ],
    calcResult: { label: "Annual Premium", format: "currency" },
    calcResults: [
      { key: "annualPremium", label: "Annual Premium", format: "currency", highlight: true },
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency" },
      { key: "yourShareOfMasterDeductible", label: "Your Share of the Master Deductible", format: "currency" },
      { key: "lossAssessmentShortfall", label: "Loss Assessment Shortfall", format: "currency" },
    ],
    instructions:
      "The HOA's master policy covers the building and common areas; your HO-6 policy covers what the master policy " +
      "doesn't — often interior walls, fixtures and upgrades (\"walls-in\"), your belongings and liability. Loss assessment " +
      "coverage pays your share if the HOA bills owners for a big claim or the master deductible.\n\n" +
      "Check your HOA documents: \"bare walls\" master policies leave far more to you than \"all-in\" ones.",
    examples:
      "Example: $50,000 of walls-in and $30,000 of belongings coverage with $25,000 of loss assessment costs " +
      "$345 a year. Your share of a $25,000 master deductible is $1,250 — covered.",
    assumptions:
      "Loss assessment priced at $1 per $1,000; the master deductible split equally. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is condo insurance required?",
        answer: "Not by law, but most mortgage lenders and many HOAs require an HO-6 policy.",
      },
    ],
  },
  {
    slug: "flood-insurance-calculator",
    title: "Flood Insurance Calculator",
    description: "Estimate an NFIP flood insurance premium for your building and contents by flood zone, and see the chance of a flood during the years you own the home.",
    metaTitle: "Flood Insurance Calculator — Premium & Flood Risk",
    metaDescription: "Free flood insurance calculator. Estimate NFIP premiums by flood zone and the chance of a flood over the years you own your home.",
    calcInputs: [
      currencyField("buildingCoverage", "Building Coverage (Max $250,000)", { default: 250000, max: 250000, step: 10000 }),
      currencyField("contentsCoverage", "Contents Coverage (Max $100,000)", { default: 100000, max: 100000, step: 5000 }),
      currencyField("ratePer100", "Rate per $100 of Coverage", { default: 0.35, max: 10, step: 0.01 }),
      {
        key: "zone", label: "Flood Risk", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Low–Moderate Risk (Zones B, C, X)", value: 1 },
          { label: "High Risk (Zones A, AE)", value: 2 },
          { label: "Coastal High Risk (Zones V, VE)", value: 3 },
        ],
      },
      numberField("years", "Years You'll Own the Home", { default: 30, min: 1, max: 100, step: 1 }),
    ],
    calcResult: { label: "Annual Premium", format: "currency" },
    calcResults: [
      { key: "totalCoverage", label: "Total Coverage", format: "currency" },
      { key: "annualPremium", label: "Annual Premium", format: "currency", highlight: true },
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency" },
      { key: "annualFloodChance", label: "Approximate Yearly Flood Chance (%)", format: "number" },
      { key: "chanceOfFloodOverYears", label: "Chance of a Flood Over the Years", format: "percentage" },
    ],
    instructions:
      "Homeowners insurance doesn't cover flooding. The National Flood Insurance Program (NFIP) covers up to $250,000 for " +
      "the building and $100,000 for contents; private flood insurers can go higher. Under NFIP's Risk Rating 2.0, premiums " +
      "reflect your home's individual risk, so get a quote. Policies usually have a 30-day waiting period.\n\n" +
      "A high-risk zone means at least a 1% chance of flooding each year — about a 26% chance over a 30-year mortgage.",
    examples:
      "Example: $350,000 of building and contents coverage at $0.35 per $100 in a low-to-moderate risk zone costs about " +
      "$612.50 a year. Even there, the chance of a flood over 30 years is about 5.83%.",
    assumptions:
      "Typical zone factors and yearly flood chances; actual risk varies by property. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need flood insurance outside a flood zone?",
        answer: "It's not required, but more than a fifth of NFIP claims come from outside high-risk zones, and premiums there are much lower.",
      },
    ],
  },
  {
    slug: "earthquake-insurance-calculator",
    title: "Earthquake Insurance Calculator",
    description: "Estimate an earthquake insurance premium, the percentage deductible in dollars, and what the policy would pay on a given amount of damage.",
    metaTitle: "Earthquake Insurance Calculator — Premium & Deductible",
    metaDescription: "Free earthquake insurance calculator. Estimate the premium, the percentage deductible in dollars and the payout on earthquake damage.",
    calcInputs: [
      currencyField("dwellingCoverage", "Dwelling Coverage", { default: 400000, max: 100000000, step: 10000 }),
      currencyField("ratePer1000", "Rate per $1,000 of Coverage", { default: 2.5, max: 50, step: 0.1 }),
      percentField("deductiblePercent", "Deductible (% of Coverage)", { default: 15, max: 50, step: 5 }),
      currencyField("damage", "Damage From an Earthquake", { default: 150000, max: 100000000, step: 5000 }),
    ],
    calcResult: { label: "Payout on This Damage", format: "currency" },
    calcResults: [
      { key: "annualPremium", label: "Annual Premium", format: "currency" },
      { key: "deductibleAmount", label: "Deductible Amount", format: "currency" },
      { key: "payoutOnThisDamage", label: "Payout on This Damage", format: "currency", highlight: true },
      { key: "youPayOnThisDamage", label: "You Pay on This Damage", format: "currency" },
    ],
    instructions:
      "Standard homeowners policies exclude earthquake damage. Earthquake coverage (from the California Earthquake Authority " +
      "or private insurers) uses a percentage deductible — often 10–25% of the dwelling coverage — so it mainly protects " +
      "against major damage.\n\n" +
      "Retrofitting an older home (bolting it to the foundation) can lower the premium.",
    examples:
      "Example: $400,000 of coverage at $2.50 per $1,000 costs $1,000 a year. With a 15% " +
      "deductible ($60,000), $150,000 of damage would pay $90,000.",
    assumptions:
      "Contents and loss-of-use coverage not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is earthquake insurance worth it?",
        answer: "In high-risk areas, if a major loss would wipe out your equity or savings. The high deductible means smaller damage stays your cost.",
      },
    ],
  },
  {
    slug: "umbrella-insurance-calculator",
    title: "Umbrella Insurance Calculator",
    description: "Work out how much umbrella liability insurance you need from your net worth and future income at risk, above your auto and home liability limits, and what it costs.",
    metaTitle: "Umbrella Insurance Calculator — How Much Coverage",
    metaDescription: "Free umbrella insurance calculator. Estimate how much umbrella liability coverage you need above your auto and home limits, and its cost.",
    calcInputs: [
      currencyField("netWorth", "Net Worth (Assets That Could Be Claimed)", { default: 800000, max: 10000000000, step: 10000 }),
      currencyField("yearlyIncome", "Yearly Income", { default: 100000, max: 100000000, step: 1000 }),
      numberField("incomeYears", "Years of Future Income at Risk", { default: 5, min: 0, max: 30, step: 1 }),
      currencyField("underlyingLiability", "Your Auto/Home Liability Limit", { default: 300000, max: 10000000, step: 50000 }),
      currencyField("firstMillionPremium", "Premium for the First $1 Million", { default: 300, max: 10000, step: 10 }),
      currencyField("additionalMillionPremium", "Premium per Additional $1 Million", { default: 100, max: 10000, step: 10 }),
    ],
    calcResult: { label: "Suggested Umbrella ($ Millions)", format: "number" },
    calcResults: [
      { key: "totalExposure", label: "Total Exposure", format: "currency" },
      { key: "gapAboveUnderlying", label: "Gap Above Your Underlying Limits", format: "currency" },
      { key: "suggestedUmbrellaMillions", label: "Suggested Umbrella ($ Millions)", format: "number", highlight: true },
      { key: "annualPremium", label: "Annual Premium", format: "currency" },
      { key: "totalProtection", label: "Total Liability Protection", format: "currency" },
    ],
    instructions:
      "An umbrella policy adds liability coverage above your auto and home policies — for a serious car accident, a guest " +
      "injury or a lawsuit — and covers some claims they exclude. A common guide is coverage at least equal to your net " +
      "worth plus a few years of income, since wages can be garnished. Insurers require minimum underlying limits (often " +
      "$250,000/$500,000 auto and $300,000 home).\n\n" +
      "Umbrella coverage is sold in $1 million layers and is usually inexpensive.",
    examples:
      "Example: $800,000 of net worth plus 5 years of a $100,000 income is $1,300,000 at risk — " +
      "$1,000,000 above your $300,000 limit. A 1-million umbrella at " +
      "$300 a year gives $1,300,000 of protection.",
    assumptions:
      "Retirement accounts and home equity may be partly protected under state law. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who needs an umbrella policy?",
        answer: "Anyone with significant assets or income, teen drivers, a pool or trampoline, rental properties, or a dog breed some insurers consider higher risk.",
      },
    ],
  },
  {
    slug: "landlord-insurance-calculator",
    title: "Landlord Insurance Calculator",
    description: "Estimate landlord (rental dwelling) insurance for a long-term or short-term rental, including lost-rent coverage, and compare it with a homeowners policy.",
    metaTitle: "Landlord Insurance Calculator — Rental Property Cost",
    metaDescription: "Free landlord insurance calculator. Estimate rental property insurance for long- or short-term rentals and lost-rent coverage.",
    calcInputs: [
      currencyField("dwellingValue", "Dwelling Rebuild Value", { default: 300000, max: 100000000, step: 5000 }),
      currencyField("ratePer1000", "Rate per $1,000 (Long-Term Rental)", { default: 7, max: 100, step: 0.25 }),
      {
        key: "rentalType", label: "Rental Type", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Long-Term Rental", value: 1 },
          { label: "Short-Term / Vacation Rental (Airbnb, Vrbo)", value: 2 },
        ],
      },
      currencyField("monthlyRent", "Monthly Rent (or Average Rental Income)", { default: 2000, max: 1000000, step: 50 }),
      numberField("lostRentMonths", "Lost-Rent Coverage (Months)", { default: 12, min: 0, max: 24, step: 1 }),
      currencyField("homeownersPremium", "Homeowners Premium for the Same Home", { default: 1800, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Annual Premium", format: "currency" },
    calcResults: [
      { key: "annualPremium", label: "Annual Premium", format: "currency", highlight: true },
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency" },
      { key: "lostRentCoverage", label: "Lost-Rent Coverage", format: "currency" },
      { key: "differenceFromHomeowners", label: "Difference From Homeowners", format: "currency" },
      { key: "premiumAsShareOfRent", label: "Premium as % of Yearly Rent", format: "percentage" },
    ],
    instructions:
      "Once you rent out a home, your homeowners policy generally no longer applies. Landlord (dwelling fire) insurance covers " +
      "the building, your liability as a landlord and lost rent while the home is being repaired — usually costing about " +
      "15–25% more than homeowners insurance. Tenants need their own renters insurance for their belongings.\n\n" +
      "Short-term rentals need a policy built for them; platform host protection programs aren't full insurance.",
    examples:
      "Example: a $300,000 rental at $7 per $1,000 costs about $2,100 a year — $300 more " +
      "than homeowners insurance — and covers $24,000 of lost rent.",
    assumptions:
      "Short-term rentals loaded by 40%. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is landlord insurance tax-deductible?",
        answer: "Yes — premiums for a rental property are a deductible rental expense.",
      },
    ],
  },
  {
    slug: "title-insurance-calculator",
    title: "Title Insurance Calculator",
    description: "Estimate title insurance at closing: the owner's policy, the lender's policy issued at the same time, endorsements, and what the buyer pays.",
    metaTitle: "Title Insurance Calculator — Owner's & Lender's Policy",
    metaDescription: "Free title insurance calculator. Estimate owner's and lender's title policy costs, endorsements and the buyer's share at closing.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 400000, max: 100000000, step: 5000 }),
      percentField("ownerRatePercent", "Owner's Policy Rate (% of Price)", { default: 0.5, max: 2, step: 0.05 }),
      currencyField("loanAmount", "Loan Amount", { default: 320000, max: 100000000, step: 5000, required: false }),
      currencyField("lenderSimultaneousFee", "Lender's Policy (Simultaneous Issue)", { default: 300, max: 10000, step: 25, required: false }),
      currencyField("endorsements", "Endorsements", { default: 150, max: 10000, step: 25, required: false }),
      {
        key: "sellerPaysOwner", label: "Who Pays the Owner's Policy?", type: "dropdown", required: true, default: 0,
        options: [
          { label: "Buyer", value: 0 },
          { label: "Seller (Customary in Some States)", value: 1 },
        ],
      },
    ],
    calcResult: { label: "Buyer Pays", format: "currency" },
    calcResults: [
      { key: "ownersPolicy", label: "Owner's Policy", format: "currency" },
      { key: "lendersPolicy", label: "Lender's Policy", format: "currency" },
      { key: "totalTitleInsurance", label: "Total Title Insurance", format: "currency" },
      { key: "buyerPays", label: "Buyer Pays", format: "currency", highlight: true },
    ],
    instructions:
      "Title insurance protects against problems with ownership — liens, forged deeds, errors in public records — that " +
      "weren't found in the title search. You pay once, at closing. Lenders require a lender's policy; the owner's policy " +
      "protects you and is optional but recommended. Buying both together (simultaneous issue) makes the lender's policy " +
      "much cheaper.\n\n" +
      "Rates are set or filed by state; some states (like Texas) set them by law. Who pays is a local custom and negotiable.",
    examples:
      "Example: on a $400,000 home, the owner's policy at 0.50% is $2,000, plus a $300 " +
      "lender's policy and endorsements — $2,450 in total, paid by the buyer.",
    assumptions:
      "Flat rate; real rate tables are tiered by price. Search and settlement fees not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I shop for title insurance?",
        answer: "In most states, yes — your Loan Estimate lists services you can shop for. Rates vary less in states that regulate them.",
      },
    ],
  },
  {
    slug: "home-replacement-cost-calculator",
    title: "Home Replacement Cost Calculator",
    description: "Estimate what it would cost to rebuild your home — including high-value and custom homes — with debris removal and code upgrades, and check it against your dwelling coverage.",
    metaTitle: "Home Replacement Cost Calculator — Rebuild Cost",
    metaDescription: "Free home replacement cost calculator. Estimate rebuild cost with debris removal and code upgrades and check your dwelling coverage.",
    calcInputs: [
      numberField("sqft", "Home Size (Sq Ft)", { default: 2200, min: 100, max: 50000, step: 50 }),
      currencyField("costPerSqft", "Local Building Cost per Sq Ft", { default: 200, max: 5000, step: 5 }),
      {
        key: "quality", label: "Construction Quality", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Standard", value: 1 },
          { label: "Custom", value: 2 },
          { label: "Luxury / High-Value", value: 3 },
        ],
      },
      percentField("debrisPercent", "Demolition & Debris Removal", { default: 5, max: 30, step: 1 }),
      percentField("codePercent", "Building Code Upgrades", { default: 10, max: 30, step: 1 }),
      currencyField("dwellingCoverage", "Current Dwelling Coverage", { default: 400000, max: 100000000, step: 10000 }),
      percentField("extendedPercent", "Extended Replacement Cost Coverage", { default: 25, max: 100, step: 5, required: false }),
    ],
    calcResult: { label: "Coverage Gap", format: "currency" },
    calcResults: [
      { key: "rebuildCost", label: "Rebuild Cost", format: "currency" },
      { key: "replacementCostWithExtras", label: "Replacement Cost With Extras", format: "currency" },
      { key: "coverageGap", label: "Coverage Gap", format: "currency", highlight: true },
      { key: "coverageWithExtendedReplacement", label: "Coverage With Extended Replacement", format: "currency" },
      { key: "gapAfterExtendedReplacement", label: "Gap After Extended Replacement", format: "currency" },
    ],
    instructions:
      "Insure your home for what it would cost to rebuild, not its market value — land isn't included, and rebuild costs " +
      "can exceed the price you paid. Include demolition and debris removal and the cost of meeting today's building codes " +
      "(ordinance or law coverage). High-value and custom homes cost much more per square foot to rebuild.\n\n" +
      "Extended or guaranteed replacement cost coverage adds a cushion — 25–50% or more — if costs spike after a disaster.",
    examples:
      "Example: 2,200 sq ft at $200 a foot is a $440,000 rebuild, or $506,000 with debris removal and " +
      "code upgrades — $106,000 more than $400,000 of coverage. With 25% extended replacement, the gap " +
      "shrinks to $6,000.",
    assumptions:
      "Typical quality factors; get a professional estimate for unusual homes. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is my rebuild cost higher than my home's value?",
        answer: "Rebuilding one home costs more per foot than building a whole subdivision, and debris removal, code upgrades and post-disaster demand add more.",
      },
    ],
  },
];

// Insurance Calculators (and its sub-categories) are created on first use, under
// Finance Calculators.
async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  let parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY.slug } });
  if (!parent) {
    const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
    if (!finance) {
      throw new Error(
        `The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
          "then re-run this script."
      );
    }
    console.log(`Creating category "${PARENT_CATEGORY.name}" under "${finance.name}".`);
    parent = await prisma.toolCategory.create({
      data: { name: PARENT_CATEGORY.name, slug: PARENT_CATEGORY.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  console.log(`Creating sub-category "${CATEGORY.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory();

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all filed under "${category.name}".`);
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
