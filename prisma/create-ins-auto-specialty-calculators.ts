// One-time (but safe to re-run) batch setup script: creates the Specialty Vehicle Insurance tools
// (7) of the Insurance Calculators expansion, filed under Insurance Calculators >
// Auto & Vehicle Insurance Calculators (both categories are created on first run).
// See src/lib/calc-engine-ins-auto-specialty.ts for the math and
// src/lib/calc-engine-ins-life-core.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-ins-auto-specialty-calculators.ts
// or
//   npm run db:create-ins-auto-specialty-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Insurance Calculators", slug: "insurance-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Auto & Vehicle Insurance Calculators", slug: "auto-vehicle-insurance-calculators" };

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
    slug: "classic-car-insurance-calculator",
    title: "Classic Car Insurance Calculator",
    description: "Estimate classic, exotic or modified car insurance on an agreed value — including modifications — and compare it with a standard policy that pays only actual cash value.",
    metaTitle: "Classic Car Insurance Calculator — Agreed Value",
    metaDescription: "Free classic car insurance calculator. Estimate agreed-value premiums for classic, exotic or modified cars and compare with a standard policy.",
    calcInputs: [
      currencyField("agreedValue", "Agreed Value of the Car", { default: 45000, max: 100000000, step: 1000 }),
      currencyField("modificationsValue", "Modifications & Custom Parts", { default: 0, max: 10000000, step: 500, required: false }),
      percentField("ratePercent", "Rate (% of Agreed Value, From a Quote)", { default: 1, max: 10, step: 0.05 }),
      currencyField("standardPremium", "Standard Auto Policy Premium (Yearly)", { default: 1400, max: 100000, step: 50 }),
      currencyField("acvUnderStandard", "What a Standard Policy Would Pay (Actual Cash Value)", { default: 30000, max: 100000000, step: 1000 }),
    ],
    calcResult: { label: "Classic Car Premium", format: "currency" },
    calcResults: [
      { key: "insuredValue", label: "Insured (Agreed) Value", format: "currency" },
      { key: "classicPremium", label: "Classic Car Premium", format: "currency", highlight: true },
      { key: "savingsVsStandardPolicy", label: "Savings vs a Standard Policy", format: "currency" },
      { key: "extraPayoutIfTotaled", label: "Extra Payout If Totaled", format: "currency" },
    ],
    instructions:
      "Classic and collector car insurers cover an agreed value set when you buy the policy, not a depreciated cash value — " +
      "and premiums are often lower because the car is driven less, with mileage limits and garage requirements. Exotic " +
      "and high-performance cars use the same approach at higher rates. Declare aftermarket modifications, or they may not " +
      "be covered.\n\n" +
      "Get the rate from a specialty insurer's quote.",
    examples:
      "Example: a $45,000 classic at 1% costs about $450 a year — $950 less than a " +
      "standard policy — and pays $15,000 more if the car is totaled.",
    assumptions:
      "Usage limits (no daily commuting) usually apply. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What makes a car eligible for classic insurance?",
        answer: "Usually age (often 20–25+ years), limited use, secure storage, a good driving record and another car for daily driving.",
      },
    ],
  },
  {
    slug: "usage-based-insurance-savings-calculator",
    title: "Usage-Based Insurance Savings Calculator",
    description: "Estimate how much you could save with usage-based (telematics) car insurance from a sign-up discount and a safe-driving score — and what a surcharge would cost.",
    metaTitle: "Usage-Based Insurance Calculator — Telematics Savings",
    metaDescription: "Free usage-based insurance calculator. Estimate telematics savings from sign-up and safe-driving discounts on your car insurance.",
    calcInputs: [
      currencyField("currentPremium", "Current Yearly Premium", { default: 1800, max: 100000, step: 50 }),
      percentField("signUpDiscountPercent", "Sign-Up Discount", { default: 5, max: 50, step: 1 }),
      percentField("maxDiscountPercent", "Maximum Safe-Driving Discount", { default: 30, max: 60, step: 1 }),
      percentField("scorePercent", "Your Expected Score (% of Max Discount)", { default: 70, max: 100, step: 5 }),
      percentField("surchargePercent", "Possible Surcharge for Risky Driving", { default: 0, max: 50, step: 1, required: false }),
    ],
    calcResult: { label: "Yearly Savings", format: "currency" },
    calcResults: [
      { key: "totalDiscountPercent", label: "Total Discount", format: "percentage" },
      { key: "newAnnualPremium", label: "New Annual Premium", format: "currency" },
      { key: "yearlySavings", label: "Yearly Savings", format: "currency", highlight: true },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
    ],
    instructions:
      "Usage-based insurance tracks how — and sometimes how much — you drive, through an app or plug-in device: hard " +
      "braking, speeding, phone use, late-night driving and mileage. Safe drivers and low-mileage drivers save; some programs " +
      "can raise rates for risky driving.\n\n" +
      "Pay-per-mile insurance charges a base rate plus a per-mile rate and suits people who drive under about 10,000 miles a year.",
    examples:
      "Example: a 5% sign-up discount plus 70% of a 30% safe-driving discount " +
      "cuts a $1,800 premium by 26% to $1,332 — $468 a year.",
    assumptions:
      "Discounts applied to the full premium. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is my driving data private?",
        answer: "Insurers set their own policies on how data is used and shared. Read the program's privacy terms before enrolling.",
      },
    ],
  },
  {
    slug: "boat-insurance-calculator",
    title: "Boat Insurance Calculator",
    description: "Estimate boat and marine insurance from the hull rate, where you navigate, liability coverage and lay-up months, plus the deductible as a share of the boat's value.",
    metaTitle: "Boat Insurance Calculator — Hull & Liability Premium",
    metaDescription: "Free boat insurance calculator. Estimate hull and liability premiums by navigation area and lay-up months, plus the deductible amount.",
    calcInputs: [
      currencyField("boatValue", "Boat Value", { default: 40000, max: 100000000, step: 1000 }),
      percentField("hullRatePercent", "Hull Rate (% of Value)", { default: 1.5, max: 10, step: 0.1 }),
      {
        key: "area", label: "Navigation Area", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Inland Lakes & Rivers", value: 1 },
          { label: "Coastal Waters", value: 2 },
          { label: "Offshore / Hurricane Zone", value: 3 },
        ],
      },
      currencyField("liability", "Liability Coverage per Year", { default: 150, max: 100000, step: 10 }),
      numberField("layupMonths", "Lay-Up Months (Out of Water)", { default: 4, min: 0, max: 11, step: 1, required: false }),
      percentField("layupSavingsPercent", "Hull Premium Saved During Lay-Up", { default: 40, max: 100, step: 5 }),
      percentField("deductiblePercent", "Hull Deductible (% of Value)", { default: 1, max: 10, step: 0.5 }),
    ],
    calcResult: { label: "Total Premium", format: "currency" },
    calcResults: [
      { key: "hullPremium", label: "Hull Premium", format: "currency" },
      { key: "totalPremium", label: "Total Premium", format: "currency", highlight: true },
      { key: "monthlyAverage", label: "Monthly Average", format: "currency" },
      { key: "deductibleAmount", label: "Deductible Amount", format: "currency" },
    ],
    instructions:
      "Boat (marine) insurance covers the hull and engine plus liability for injuries and damage to others; larger yachts " +
      "may need protection & indemnity and wreck-removal coverage. Rates rise for coastal and offshore use, faster boats and " +
      "hurricane zones. A lay-up period, when the boat is stored out of the water, lowers the premium.\n\n" +
      "Get a hull rate from a marine insurer quote.",
    examples:
      "Example: a $40,000 boat at 1.50% on inland water, laid up 4 months, costs $520 for the " +
      "hull plus $150 of liability — $670 a year. The deductible is $400.",
    assumptions:
      "Typical area loadings; small boats may be covered under homeowners insurance up to a low limit. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Agreed value or actual cash value?",
        answer: "Agreed value pays the stated value for a total loss; actual cash value deducts depreciation but costs less.",
      },
    ],
  },
  {
    slug: "rv-insurance-calculator",
    title: "RV Insurance Calculator",
    description: "Estimate RV insurance for a motorhome or travel trailer by RV class, full-time living and storage months.",
    metaTitle: "RV Insurance Calculator — Motorhome & Trailer Premium",
    metaDescription: "Free RV insurance calculator. Estimate premiums for Class A or C motorhomes and travel trailers, full-timers and storage months.",
    calcInputs: [
      currencyField("rvValue", "RV Value", { default: 80000, max: 10000000, step: 1000 }),
      {
        key: "rvClass", label: "RV Type", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Class A Motorhome", value: 1 },
          { label: "Class B / C Motorhome", value: 2 },
          { label: "Travel Trailer / Fifth Wheel", value: 3 },
        ],
      },
      percentField("ratePercent", "Rate for a Class A (% of Value)", { default: 1.6, max: 10, step: 0.1 }),
      {
        key: "fullTimer", label: "Live in It Full Time?", type: "dropdown", required: true, default: 0,
        options: [
          { label: "No", value: 0 },
          { label: "Yes (Full-Timer Coverage)", value: 1 },
        ],
      },
      numberField("storageMonths", "Storage Months", { default: 5, min: 0, max: 11, step: 1, required: false }),
      percentField("storageSavingsPercent", "Premium Saved While Stored", { default: 50, max: 100, step: 5 }),
    ],
    calcResult: { label: "Annual Premium", format: "currency" },
    calcResults: [
      { key: "fullYearPremium", label: "Full-Year Premium", format: "currency" },
      { key: "annualPremium", label: "Annual Premium", format: "currency", highlight: true },
      { key: "monthlyAverage", label: "Monthly Average", format: "currency" },
      { key: "storageSavings", label: "Storage Savings", format: "currency" },
    ],
    instructions:
      "Motorhomes need their own auto policy with liability; towable trailers usually get liability from the tow vehicle " +
      "and need only physical-damage coverage, so they cost less. Full-timers need coverage closer to homeowners insurance " +
      "(personal belongings, liability at campsites). Storage coverage lowers the cost in the off-season.\n\n" +
      "Use a quote for your RV to set the rate.",
    examples:
      "Example: an $80,000 Class A motorhome at 1.60% costs $1,280 for a full year, or $1,013.33 with " +
      "5 months in storage — $266.67 saved.",
    assumptions:
      "Typical class factors; full-timers get no storage discount. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does my car insurance cover my travel trailer?",
        answer: "Usually only liability while towing. Damage to the trailer itself needs separate coverage.",
      },
    ],
  },
  {
    slug: "atv-insurance-calculator",
    title: "ATV Insurance Calculator",
    description: "Estimate ATV, UTV, snowmobile or golf cart insurance from the vehicle's value, type and liability coverage, with discounts.",
    metaTitle: "ATV Insurance Calculator — ATV, Snowmobile & Golf Cart",
    metaDescription: "Free ATV insurance calculator. Estimate premiums for ATVs, UTVs, snowmobiles and golf carts from value, type and liability.",
    calcInputs: [
      currencyField("vehicleValue", "Vehicle Value", { default: 9000, max: 1000000, step: 250 }),
      {
        key: "vehicleType", label: "Vehicle Type", type: "dropdown", required: true, default: 1,
        options: [
          { label: "ATV / UTV / Side-by-Side", value: 1 },
          { label: "Snowmobile", value: 2 },
          { label: "Golf Cart / LSV", value: 3 },
        ],
      },
      percentField("ratePercent", "Physical Damage Rate (% of Value)", { default: 3, max: 15, step: 0.1 }),
      currencyField("liability", "Liability Coverage per Year", { default: 100, max: 10000, step: 10 }),
      percentField("discountsPercent", "Discounts (Safety Course, Multi-Policy)", { default: 10, max: 50, step: 1, required: false }),
    ],
    calcResult: { label: "Annual Premium", format: "currency" },
    calcResults: [
      { key: "physicalDamagePremium", label: "Physical Damage Premium", format: "currency" },
      { key: "annualPremium", label: "Annual Premium", format: "currency", highlight: true },
      { key: "monthlyAverage", label: "Monthly Average", format: "currency" },
      { key: "premiumAsShareOfValue", label: "Premium as % of Value", format: "percentage" },
    ],
    instructions:
      "Powersports policies combine liability (required for public trails or roads in many states) with collision and " +
      "comprehensive for the vehicle. Homeowners insurance may cover a golf cart or ATV only on your own property, if at " +
      "all. Street-legal golf carts (low-speed vehicles) need auto-style coverage.\n\n" +
      "Enter a rate from a quote and your liability cost.",
    examples:
      "Example: a $9,000 ATV at 3% plus $100 of liability, with 10% of discounts, costs " +
      "$333 a year — 3.70% of its value.",
    assumptions:
      "Typical type factors for seasonal use. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need insurance for an ATV used only on my land?",
        answer: "It may not be legally required, but liability coverage protects you if a guest is hurt, and homeowners policies often exclude off-road vehicles.",
      },
    ],
  },
  {
    slug: "bicycle-insurance-calculator",
    title: "Bicycle Insurance Calculator",
    description: "Decide whether to insure an expensive bike or e-scooter: the premium versus expected theft and damage claims, and what a theft would cost you uninsured.",
    metaTitle: "Bicycle Insurance Calculator — Bike & E-Scooter Cover",
    metaDescription: "Free bicycle insurance calculator. Compare the premium for a bike or e-scooter with expected theft and damage claims.",
    calcInputs: [
      currencyField("bikeValue", "Bike or Scooter Value", { default: 3000, max: 100000, step: 50 }),
      percentField("ratePercent", "Premium (% of Value per Year)", { default: 6, max: 30, step: 0.5 }),
      percentField("theftRiskPercent", "Chance of Theft per Year", { default: 5, max: 100, step: 0.5 }),
      percentField("damageRiskPercent", "Chance of a Damage Claim per Year", { default: 5, max: 100, step: 0.5, required: false }),
      currencyField("averageDamage", "Average Damage Repair", { default: 600, max: 100000, step: 25, required: false }),
      currencyField("deductible", "Deductible", { default: 100, max: 10000, step: 25, required: false }),
    ],
    calcResult: { label: "Yearly Premium", format: "currency" },
    calcResults: [
      { key: "yearlyPremium", label: "Yearly Premium", format: "currency", highlight: true },
      { key: "expectedYearlyClaims", label: "Expected Claims per Year", format: "currency" },
      { key: "premiumMinusExpectedClaims", label: "Premium Minus Expected Claims", format: "currency" },
      { key: "lossIfStolenWithoutInsurance", label: "Loss If Stolen Uninsured", format: "currency" },
    ],
    instructions:
      "Homeowners or renters insurance may cover bike theft at home, subject to the deductible, but often not damage, " +
      "racing, or theft away from home above a sub-limit. Specialty bike insurance covers theft anywhere, crash damage and " +
      "sometimes liability. E-bikes and e-scooters may be excluded from home policies entirely.\n\n" +
      "Insurance makes sense when a loss would really hurt your budget, not because it's a good bet — on average, premiums " +
      "exceed claims.",
    examples:
      "Example: insuring a $3,000 bike at 6% costs $180 a year, against about $170 of " +
      "expected claims. Uninsured, a theft would cost the full $3,000.",
    assumptions:
      "At most one theft per year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does renters insurance cover my bike?",
        answer: "Often for theft, after the deductible and possibly with a limit for bikes; check the policy, especially for e-bikes and theft outside the home.",
      },
    ],
  },
  {
    slug: "aviation-insurance-calculator",
    title: "Aviation Insurance Calculator",
    description: "Estimate aircraft or drone insurance from the hull value, hull rate, pilot experience and liability coverage.",
    metaTitle: "Aviation Insurance Calculator — Aircraft & Drone",
    metaDescription: "Free aviation insurance calculator. Estimate aircraft or drone hull and liability premiums by value, rate and pilot experience.",
    calcInputs: [
      currencyField("hullValue", "Aircraft or Drone Value", { default: 150000, max: 1000000000, step: 1000 }),
      percentField("hullRatePercent", "Hull Rate (% of Value)", { default: 2, max: 20, step: 0.1 }),
      {
        key: "lowHours", label: "Pilot Experience", type: "dropdown", required: true, default: 0,
        options: [
          { label: "Experienced in This Make & Model", value: 0 },
          { label: "Low Hours or New to the Type", value: 1 },
        ],
      },
      currencyField("liabilityPremium", "Liability Premium per Year", { default: 600, max: 1000000, step: 50 }),
      percentField("instrumentRatingDiscountPercent", "Instrument Rating / Training Discount", { default: 5, max: 50, step: 1, required: false }),
    ],
    calcResult: { label: "Total Premium", format: "currency" },
    calcResults: [
      { key: "hullPremium", label: "Hull Premium", format: "currency" },
      { key: "totalPremium", label: "Total Premium", format: "currency", highlight: true },
      { key: "monthlyAverage", label: "Monthly Average", format: "currency" },
      { key: "premiumAsShareOfValue", label: "Premium as % of Value", format: "percentage" },
    ],
    instructions:
      "Aircraft insurance has two parts: hull (damage to the aircraft, priced as a percentage of its agreed value) and " +
      "liability. Pilot experience — total hours, hours in the type, ratings — strongly affects the rate. Drones used for " +
      "work need liability coverage (often $1 million) and optional hull coverage; recreational drones may be covered under " +
      "homeowners insurance only for limited liability.\n\n" +
      "Enter the rates from an aviation insurance broker's quote.",
    examples:
      "Example: a $150,000 aircraft at 2% with an instrument-rating discount costs $2,850 for the hull plus " +
      "$600 of liability — $3,450 a year, 2.30% of its value.",
    assumptions:
      "Low-hours pilots loaded by 25%. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need insurance to fly a drone commercially?",
        answer: "The FAA doesn't require it for Part 107 pilots, but most clients do, and liability coverage protects you from costly claims.",
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
