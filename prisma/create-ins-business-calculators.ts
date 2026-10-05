// One-time (but safe to re-run) batch setup script: creates the Business & Farm Insurance tools
// (8) of the Insurance Calculators expansion, filed under Insurance Calculators >
// Business & Specialty Insurance Calculators (both categories are created on first run).
// See src/lib/calc-engine-ins-business.ts for the math and
// src/lib/calc-engine-ins-life-core.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-ins-business-calculators.ts
// or
//   npm run db:create-ins-business-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Insurance Calculators", slug: "insurance-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Business & Specialty Insurance Calculators", slug: "business-specialty-insurance-calculators" };

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
    slug: "business-insurance-calculator",
    title: "Business Insurance Calculator",
    description: "Estimate the cost of small business insurance — a business owner's policy (BOP) combining liability and property cover — including for a home-based business.",
    metaTitle: "Business Insurance Calculator — BOP & Home Business Cost",
    metaDescription: "Free business insurance calculator. Estimate a business owner's policy (BOP) premium for a small or home-based business.",
    calcInputs: [
      {
        key: "businessType", label: "Business Type", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Home-Based Business", value: 1 },
          { label: "Office / Professional Services", value: 2 },
          { label: "Retail Store", value: 3 },
          { label: "Restaurant / Food Service", value: 4 },
          { label: "Contractor / Trades", value: 5 },
        ],
      },
      currencyField("annualRevenue", "Annual Revenue", { default: 250000, max: 1000000000, step: 10000 }),
      currencyField("propertyValue", "Business Property & Equipment Value", { default: 50000, max: 100000000, step: 5000 }),
      numberField("propertyRatePer100", "Property Rate per $100 of Value", { default: 0.4, min: 0, max: 5, step: 0.05 }),
    ],
    calcResult: { label: "Annual Premium", format: "currency" },
    calcResults: [
      { key: "liabilityPortion", label: "Liability Portion", format: "currency" },
      { key: "propertyPortion", label: "Property Portion", format: "currency" },
      { key: "annualPremium", label: "Annual Premium", format: "currency", highlight: true },
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency" },
      { key: "premiumAsShareOfRevenue", label: "Premium as % of Revenue", format: "percentage" },
    ],
    instructions:
      "A business owner's policy (BOP) bundles general liability and commercial property insurance, usually with business " +
      "interruption cover, at a lower price than buying them separately. It's designed for small, lower-risk businesses.\n\n" +
      "Homeowners policies cover very little business property (often around $2,500) and no business liability, so a " +
      "home-based business usually needs a home business endorsement or a BOP. Workers' comp, professional liability and " +
      "commercial auto are separate.",
    examples:
      "Example: an office business with $250,000 in revenue and $50,000 of property might pay about " +
      "$1,050 a year ($87.50 a month) for a BOP.",
    assumptions:
      "Typical base premiums and revenue rates by business type; quotes vary by location, claims and limits. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who qualifies for a BOP?",
        answer: "Generally small businesses with fewer than about 100 employees and under a few million dollars in revenue, in lower-risk industries.",
      },
    ],
  },
  {
    slug: "general-liability-insurance-calculator",
    title: "General Liability Insurance Calculator",
    description: "Estimate commercial general liability insurance from your revenue and class rate, for a $1M/$2M or $2M/$4M limit.",
    metaTitle: "General Liability Insurance Calculator — Business Cost",
    metaDescription: "Free general liability insurance calculator. Estimate your commercial GL premium from revenue, class rate and coverage limit.",
    calcInputs: [
      currencyField("annualRevenue", "Annual Revenue", { default: 500000, max: 1000000000, step: 10000 }),
      numberField("ratePer1000", "Rate per $1,000 of Revenue", { default: 1.5, min: 0, max: 50, step: 0.1 }),
      {
        key: "limit", label: "Coverage Limit", type: "dropdown", required: true, default: 1,
        options: [
          { label: "$1M per Occurrence / $2M Aggregate", value: 1 },
          { label: "$2M per Occurrence / $4M Aggregate", value: 2 },
        ],
      },
      percentField("claimsSurchargePercent", "Surcharge for Past Claims", { default: 0, max: 200, step: 5, required: false }),
      currencyField("minimumPremium", "Minimum Premium", { default: 500, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Annual Premium", format: "currency" },
    calcResults: [
      { key: "annualPremium", label: "Annual Premium", format: "currency", highlight: true },
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency" },
      { key: "premiumPer1000Revenue", label: "Premium per $1,000 of Revenue", format: "currency" },
      { key: "perOccurrenceLimit", label: "Per-Occurrence Limit", format: "currency" },
      { key: "aggregateLimit", label: "Aggregate Limit", format: "currency" },
    ],
    instructions:
      "General liability insurance covers claims that your business caused bodily injury or property damage to others, or " +
      "advertising injury. Insurers price it by a rate per $1,000 of revenue (or payroll) set by your business classification — " +
      "often under $2 for offices and $5–$15 or more for contractors.\n\n" +
      "Clients and landlords often require a $1M/$2M limit and a certificate of insurance.",
    examples:
      "Example: $500,000 of revenue at $1.50 per $1,000 gives about $750 a year ($62.50 a month).",
    assumptions:
      "A $2M/$4M limit costs about 40% more. Your insurer's class rate determines the real price. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does general liability cover mistakes in my work?",
        answer: "No — financial losses from professional errors are covered by professional liability (E&O) insurance.",
      },
    ],
  },
  {
    slug: "professional-liability-insurance-calculator",
    title: "Professional Liability Insurance Calculator",
    description: "Estimate professional liability (errors and omissions, E&O) insurance for consultants, IT, accountants, real estate and design professionals, and the expected cost of a claim.",
    metaTitle: "Professional Liability Insurance Calculator — E&O Cost",
    metaDescription: "Free professional liability (E&O) insurance calculator. Estimate your premium by profession, revenue and limit vs expected claim cost.",
    calcInputs: [
      currencyField("annualRevenue", "Annual Revenue", { default: 200000, max: 1000000000, step: 10000 }),
      {
        key: "profession", label: "Profession", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Consultant", value: 1 },
          { label: "IT / Technology", value: 2 },
          { label: "Accountant / Bookkeeper", value: 3 },
          { label: "Real Estate", value: 4 },
          { label: "Architect / Engineer", value: 5 },
        ],
      },
      {
        key: "limit", label: "Coverage Limit", type: "dropdown", required: true, default: 1,
        options: [
          { label: "$1 Million", value: 1 },
          { label: "$2 Million", value: 2 },
        ],
      },
      percentField("claimChancePercent", "Chance of a Claim per Year", { default: 3, max: 100, step: 0.5 }),
      currencyField("averageClaimCost", "Typical Claim Cost (Defense + Settlement)", { default: 50000, max: 10000000, step: 5000 }),
    ],
    calcResult: { label: "Annual Premium", format: "currency" },
    calcResults: [
      { key: "annualPremium", label: "Annual Premium", format: "currency", highlight: true },
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency" },
      { key: "premiumAsShareOfRevenue", label: "Premium as % of Revenue", format: "percentage" },
      { key: "coverageLimit", label: "Coverage Limit", format: "currency" },
      { key: "expectedYearlyClaimCost", label: "Expected Yearly Claim Cost (Uninsured)", format: "currency" },
    ],
    instructions:
      "Professional liability, or errors and omissions (E&O), insurance covers claims that your advice or work caused a " +
      "client financial loss — including legal defense costs, which can be large even when you did nothing wrong.\n\n" +
      "Most policies are claims-made: they cover claims filed while the policy is active, so keep coverage continuous or buy " +
      "tail coverage when you retire.",
    examples:
      "Example: a consultant with $200,000 in revenue might pay about $1,000 a year for a $1M limit. At a " +
      "3% yearly claim chance and $50,000 per claim, the expected cost is $1,500 a year.",
    assumptions:
      "Typical base and profession factors; actual pricing depends on contracts, claims and deductible. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is E&O required?",
        answer: "It's often required by clients, licensing boards or contracts — for example, for many real estate agents and accountants.",
      },
    ],
  },
  {
    slug: "workers-compensation-insurance-calculator",
    title: "Workers' Compensation Insurance Calculator",
    description: "Estimate workers' comp insurance from payroll, class code rate and your experience modification rate (EMR).",
    metaTitle: "Workers' Comp Insurance Calculator — Payroll & EMR",
    metaDescription: "Free workers' compensation insurance calculator. Estimate premiums from payroll, class code rate per $100 and experience mod.",
    calcInputs: [
      currencyField("payroll", "Annual Payroll", { default: 300000, max: 1000000000, step: 10000 }),
      numberField("classRatePer100", "Class Code Rate per $100 of Payroll", { default: 2.5, min: 0, max: 100, step: 0.05 }),
      numberField("experienceMod", "Experience Modification Rate (EMR)", { default: 0.9, min: 0.3, max: 3, step: 0.01 }),
      numberField("employees", "Number of Employees", { default: 6, min: 1, max: 100000, step: 1 }),
    ],
    calcResult: { label: "Estimated Premium", format: "currency" },
    calcResults: [
      { key: "manualPremium", label: "Manual Premium (Before EMR)", format: "currency" },
      { key: "modifiedPremium", label: "Estimated Premium", format: "currency", highlight: true },
      { key: "experienceModSavings", label: "Savings from Your EMR", format: "currency" },
      { key: "premiumPerEmployee", label: "Premium per Employee", format: "currency" },
      { key: "premiumAsShareOfPayroll", label: "Premium as % of Payroll", format: "percentage" },
    ],
    instructions:
      "Workers' compensation pays medical bills and lost wages for employees hurt on the job, and is required for employers " +
      "in almost every state. Premium = payroll ÷ 100 × class code rate × experience modification rate.\n\n" +
      "Class rates range from well under $1 for clerical work to $10–$30 or more for roofing and logging. An EMR below 1.0 " +
      "(fewer claims than average) lowers the premium; above 1.0 raises it. A negative savings figure means your EMR is costing you.",
    examples:
      "Example: $300,000 of payroll at $2.50 per $100 is $7,500. An EMR of 0.90 brings it to " +
      "$6,750 — $1,125 per employee.",
    assumptions:
      "State fees, premium discounts and minimum premiums aren't included; final premiums are audited against actual payroll. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does the insurer audit my payroll?",
        answer: "The premium is based on estimated payroll; after the year ends, it's adjusted to actual payroll, so you may owe more or get a refund.",
      },
    ],
  },
  {
    slug: "cyber-insurance-calculator",
    title: "Cyber Insurance Calculator",
    description: "Estimate cyber liability insurance for a small business and compare the coverage limit with the cost of a data breach.",
    metaTitle: "Cyber Insurance Calculator — Cyber Liability Cost",
    metaDescription: "Free cyber insurance calculator. Estimate cyber liability premiums and whether your limit covers a data breach.",
    calcInputs: [
      currencyField("annualRevenue", "Annual Revenue", { default: 1000000, max: 10000000000, step: 50000 }),
      currencyField("coverageLimit", "Coverage Limit", { default: 1000000, max: 100000000, step: 250000 }),
      {
        key: "industry", label: "Industry", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Low Risk (Professional Services)", value: 1 },
          { label: "Retail / E-Commerce", value: 2 },
          { label: "Healthcare", value: 3 },
          { label: "Financial Services", value: 4 },
          { label: "Technology", value: 5 },
        ],
      },
      {
        key: "security", label: "Security Controls", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Strong (MFA, Backups, EDR, Training)", value: 1 },
          { label: "Basic", value: 2 },
          { label: "Weak", value: 3 },
        ],
      },
      numberField("records", "Customer Records Held", { default: 5000, min: 0, max: 1000000000, step: 500 }),
      currencyField("costPerRecord", "Breach Cost per Record", { default: 160, max: 10000, step: 5 }),
    ],
    calcResult: { label: "Annual Premium", format: "currency" },
    calcResults: [
      { key: "annualPremium", label: "Annual Premium", format: "currency", highlight: true },
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency" },
      { key: "estimatedBreachCost", label: "Estimated Breach Cost", format: "currency" },
      { key: "coveredByPolicy", label: "Covered by the Policy", format: "currency" },
      { key: "uncoveredBreachCost", label: "Uncovered Breach Cost", format: "currency" },
    ],
    instructions:
      "Cyber insurance covers costs from data breaches and cyberattacks: forensic investigation, customer notification, " +
      "credit monitoring, ransomware, business interruption and lawsuits. Insurers increasingly require basic controls like " +
      "multi-factor authentication and offline backups before they'll quote.\n\n" +
      "Breach cost per record varies widely — healthcare and financial records cost the most.",
    examples:
      "Example: a business with $1,000,000 in revenue might pay about $1,500 a year for a $1,000,000 limit. " +
      "A breach of 5,000 records at $160 each would cost about $800,000.",
    assumptions:
      "Simplified pricing by revenue, industry and controls; breach cost scales with records. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does general liability cover a data breach?",
        answer: "Usually not — most general liability policies exclude cyber and data losses.",
      },
    ],
  },
  {
    slug: "directors-and-officers-insurance-calculator",
    title: "Directors and Officers (D&O) Insurance Calculator",
    description: "Estimate directors and officers (D&O) liability insurance for nonprofits, private companies, venture-backed startups and public companies.",
    metaTitle: "D&O Insurance Calculator — Directors & Officers Cost",
    metaDescription: "Free D&O insurance calculator. Estimate directors and officers liability premiums by company type, revenue and limit.",
    calcInputs: [
      currencyField("coverageLimit", "Coverage Limit", { default: 1000000, max: 100000000, step: 500000 }),
      {
        key: "companyType", label: "Company Type", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Nonprofit", value: 1 },
          { label: "Private Company", value: 2 },
          { label: "Venture-Backed Startup", value: 3 },
          { label: "Public Company", value: 4 },
        ],
      },
      currencyField("annualRevenue", "Annual Revenue", { default: 5000000, max: 100000000000, step: 100000 }),
      currencyField("basePerMillion", "Base Premium per $1M (Private Company)", { default: 2000, max: 100000, step: 100 }),
    ],
    calcResult: { label: "Annual Premium", format: "currency" },
    calcResults: [
      { key: "annualPremium", label: "Annual Premium", format: "currency", highlight: true },
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency" },
      { key: "costPerMillionOfCoverage", label: "Cost per $1M of Coverage", format: "currency" },
      { key: "premiumAsShareOfRevenue", label: "Premium as % of Revenue", format: "percentage" },
    ],
    instructions:
      "D&O insurance protects directors and officers personally — and often the company — against claims over management " +
      "decisions, such as from investors, regulators, employees or creditors. Investors often require it before joining a board.\n\n" +
      "Public companies pay far more because of securities lawsuits. Higher limits cost less per million.",
    examples:
      "Example: a private company with $5,000,000 in revenue might pay about $2,500 a year for a $1,000,000 D&O limit.",
    assumptions:
      "Simplified factors for company type and size; actual pricing depends on financials, industry and claims. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do nonprofits need D&O insurance?",
        answer: "Often yes — volunteer board members can still be sued, and many won't serve without it. Nonprofit D&O is usually inexpensive.",
      },
    ],
  },
  {
    slug: "farm-insurance-calculator",
    title: "Farm Insurance Calculator",
    description: "Estimate farm and ranch insurance: farm buildings, equipment, livestock and farm liability in one premium.",
    metaTitle: "Farm Insurance Calculator — Farm & Livestock Coverage",
    metaDescription: "Free farm insurance calculator. Estimate premiums for farm buildings, equipment, livestock and liability.",
    calcInputs: [
      currencyField("buildingsValue", "Farm Home & Buildings Value", { default: 600000, max: 100000000, step: 10000 }),
      numberField("buildingsRatePer100", "Buildings Rate per $100", { default: 0.5, min: 0, max: 5, step: 0.05 }),
      currencyField("equipmentValue", "Equipment & Machinery Value", { default: 250000, max: 100000000, step: 10000 }),
      numberField("equipmentRatePer100", "Equipment Rate per $100", { default: 0.8, min: 0, max: 5, step: 0.05 }),
      numberField("head", "Livestock (Head)", { default: 100, min: 0, max: 1000000, step: 1 }),
      currencyField("valuePerHead", "Value per Head", { default: 1500, max: 1000000, step: 50 }),
      percentField("livestockRatePercent", "Livestock Rate (% of Value)", { default: 2, max: 20, step: 0.1 }),
      currencyField("liabilityPremium", "Farm Liability Premium", { default: 800, max: 100000, step: 50 }),
    ],
    calcResult: { label: "Annual Premium", format: "currency" },
    calcResults: [
      { key: "buildingsPremium", label: "Buildings", format: "currency" },
      { key: "equipmentPremium", label: "Equipment", format: "currency" },
      { key: "livestockValue", label: "Livestock Value", format: "currency" },
      { key: "livestockPremium", label: "Livestock", format: "currency" },
      { key: "liabilityPremium", label: "Liability", format: "currency" },
      { key: "annualPremium", label: "Annual Premium", format: "currency", highlight: true },
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency" },
    ],
    instructions:
      "A farm policy combines the farmhouse, barns and outbuildings, machinery, livestock and farm liability. Homeowners " +
      "insurance doesn't cover a working farm. Livestock coverage can be for named perils (fire, lightning, theft) or " +
      "broader mortality cover at a higher rate.\n\n" +
      "Growing crops are insured separately through federal crop insurance.",
    examples:
      "Example: $600,000 of buildings, $250,000 of equipment and 100 head of livestock worth $150,000 " +
      "come to about $8,800 a year.",
    assumptions:
      "Simple rates by property type; enter your quoted rates for a closer estimate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do hobby farms need farm insurance?",
        answer: "A small hobby farm may be covered by a homeowners endorsement; once you sell products or keep much livestock, you'll likely need a farm policy.",
      },
    ],
  },
  {
    slug: "crop-insurance-calculator",
    title: "Crop Insurance Calculator",
    description: "Estimate a revenue protection crop insurance guarantee, payment and your share of the premium after the federal subsidy.",
    metaTitle: "Crop Insurance Calculator — Revenue Protection & Subsidy",
    metaDescription: "Free crop insurance calculator. Estimate revenue protection guarantees, indemnity payments and premium after the federal subsidy.",
    calcInputs: [
      numberField("acres", "Insured Acres", { default: 500, min: 0, max: 1000000, step: 10 }),
      numberField("aphYield", "APH Yield (Bushels per Acre)", { default: 180, min: 0, max: 1000, step: 1 }),
      numberField("coverageLevel", "Coverage Level (50–85%)", { default: 75, min: 50, max: 85, step: 5 }),
      currencyField("projectedPrice", "Projected Price per Bushel", { default: 4.5, max: 100, step: 0.05 }),
      currencyField("harvestPrice", "Harvest Price per Bushel", { default: 4, max: 100, step: 0.05 }),
      numberField("actualYield", "Actual Yield (Bushels per Acre)", { default: 140, min: 0, max: 1000, step: 1 }),
      currencyField("premiumPerAcre", "Total Premium per Acre (Before Subsidy)", { default: 30, max: 1000, step: 1 }),
    ],
    calcResult: { label: "Net Benefit", format: "currency" },
    calcResults: [
      { key: "coverageLevelUsed", label: "Coverage Level Used (%)", format: "number" },
      { key: "revenueGuarantee", label: "Revenue Guarantee", format: "currency" },
      { key: "revenueToCount", label: "Revenue to Count", format: "currency" },
      { key: "indemnityPayment", label: "Indemnity Payment", format: "currency" },
      { key: "totalPremium", label: "Total Premium", format: "currency" },
      { key: "subsidyPercent", label: "Federal Premium Subsidy (%)", format: "number" },
      { key: "farmerPaidPremium", label: "Your Share of the Premium", format: "currency" },
      { key: "netBenefit", label: "Net Benefit", format: "currency", highlight: true },
    ],
    instructions:
      "Revenue protection (RP), the most common federal crop insurance policy, guarantees APH yield × coverage level × the " +
      "higher of the projected and harvest prices. If actual yield × harvest price falls short, the policy pays the difference.\n\n" +
      "The federal government pays part of the premium — 67% at 50% coverage down to 38% at 85% coverage for basic and " +
      "optional units (enterprise units get more). Buy through a crop insurance agent before the sales closing date.",
    examples:
      "Example: 500 acres with a 180-bushel APH at 75% coverage guarantee $303,750. A 140-bushel " +
      "yield at $4 brings in $280,000, so the policy pays $23,750. After a 55% subsidy you pay " +
      "$6,750 of the premium.",
    assumptions:
      "Coverage level rounded to the nearest 5%; basic/optional unit subsidy rates. Your agent's quote sets the premium. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between revenue protection and yield protection?",
        answer: "Yield protection insures bushels at the projected price only; revenue protection also covers price drops and rises to the harvest price.",
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
