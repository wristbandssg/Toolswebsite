// One-time (but safe to re-run) batch setup script: creates the Auto Insurance tools
// (8) of the Insurance Calculators expansion, filed under Insurance Calculators >
// Auto & Vehicle Insurance Calculators (both categories are created on first run).
// See src/lib/calc-engine-ins-auto-core.ts for the math and
// src/lib/calc-engine-ins-life-core.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-ins-auto-core-calculators.ts
// or
//   npm run db:create-ins-auto-core-calculators

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
    slug: "car-insurance-premium-calculator",
    title: "Car Insurance Premium Calculator",
    description: "See how age, credit, where you live, coverage level and accidents change a car insurance premium, starting from a quote for a standard driver.",
    metaTitle: "Car Insurance Premium Calculator — Rating Factors",
    metaDescription: "Free car insurance premium calculator. See how age, credit, zip code, coverage level and accidents change your yearly and monthly premium.",
    calcInputs: [
      currencyField("basePremium", "Yearly Quote for a Standard Profile", { default: 1800, max: 100000, step: 50 }),
      {
        key: "ageBand", label: "Driver Age", type: "dropdown", required: true, default: 3,
        options: [
          { label: "16–19", value: 1 },
          { label: "20–24", value: 2 },
          { label: "25–64", value: 3 },
          { label: "65–74", value: 4 },
          { label: "75+", value: 5 },
        ],
      },
      {
        key: "creditTier", label: "Credit-Based Insurance Score", type: "dropdown", required: true, default: 3,
        options: [
          { label: "Excellent", value: 1 },
          { label: "Good", value: 2 },
          { label: "Fair", value: 3 },
          { label: "Poor", value: 4 },
        ],
      },
      {
        key: "area", label: "Where You Live (Zip Code)", type: "dropdown", required: true, default: 3,
        options: [
          { label: "Rural", value: 1 },
          { label: "Suburban", value: 2 },
          { label: "Urban", value: 3 },
        ],
      },
      {
        key: "coverage", label: "Coverage Level", type: "dropdown", required: true, default: 3,
        options: [
          { label: "State Minimum Liability", value: 1 },
          { label: "Higher Liability Only (e.g., 100/300/100)", value: 2 },
          { label: "Full Coverage ($1,000 Deductibles)", value: 3 },
          { label: "Full Coverage ($250–$500 Deductibles)", value: 4 },
        ],
      },
      numberField("accidents", "At-Fault Accidents (Last 3–5 Years)", { default: 0, min: 0, max: 5, step: 1, required: false }),
    ],
    calcResult: { label: "Annual Premium", format: "currency" },
    calcResults: [
      { key: "combinedFactor", label: "Combined Rating Factor", format: "number" },
      { key: "annualPremium", label: "Annual Premium", format: "currency", highlight: true },
      { key: "sixMonthPremium", label: "6-Month Premium", format: "currency" },
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency" },
      { key: "differenceFromBase", label: "Difference From the Standard Quote", format: "currency" },
    ],
    instructions:
      "Insurers price car insurance by rating factors: age and experience (teens pay the most, rates creep up again for " +
      "older seniors), a credit-based insurance score (banned or limited in California, Hawaii, Massachusetts and " +
      "Michigan), your zip code, your coverage and deductibles, and your driving record.\n\n" +
      "Start from a quote for a typical adult with good credit in the suburbs, then pick your profile. Factors here are " +
      "typical industry ranges; each insurer uses its own.",
    examples:
      "Example: a $1,800 standard quote becomes $2,925 a year — $243.75 a month — for a driver with " +
      "fair credit in a city, a combined factor of 1.63.",
    assumptions:
      "Each at-fault accident adds about 40% for several years. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I lower my car insurance?",
        answer: "Shop quotes every year or two, raise deductibles, bundle with home or renters insurance, ask about safe-driver and telematics discounts, and improve your credit where it's used.",
      },
    ],
  },
  {
    slug: "motorcycle-insurance-premium-calculator",
    title: "Motorcycle Insurance Premium Calculator",
    description: "Estimate a motorcycle insurance premium by bike type, with a safety-course discount and savings from laying the bike up in the off-season.",
    metaTitle: "Motorcycle Insurance Calculator — Premium by Bike Type",
    metaDescription: "Free motorcycle insurance calculator. Estimate premiums by bike type, safety-course discounts and off-season lay-up savings.",
    calcInputs: [
      currencyField("basePremium", "Yearly Quote (Cruiser, Standard Rider)", { default: 700, max: 100000, step: 25 }),
      {
        key: "bikeType", label: "Bike Type", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Cruiser / Standard", value: 1 },
          { label: "Sport Bike", value: 2 },
          { label: "Touring", value: 3 },
          { label: "Scooter / Moped", value: 4 },
        ],
      },
      percentField("courseDiscountPercent", "Safety Course Discount", { default: 10, max: 50, step: 1, required: false }),
      numberField("layupMonths", "Months Laid Up for Winter", { default: 4, min: 0, max: 11, step: 1, required: false }),
      percentField("layupSavingsPercent", "Premium Saved During Lay-Up Months", { default: 80, max: 100, step: 5 }),
    ],
    calcResult: { label: "Annual Premium With Lay-Up", format: "currency" },
    calcResults: [
      { key: "fullYearPremium", label: "Full-Year Premium", format: "currency" },
      { key: "annualPremiumWithLayup", label: "Annual Premium With Lay-Up", format: "currency", highlight: true },
      { key: "monthlyAverage", label: "Monthly Average", format: "currency" },
      { key: "layupSavings", label: "Lay-Up Savings", format: "currency" },
    ],
    instructions:
      "Sport bikes cost much more to insure than cruisers because of their speed and accident rates; scooters cost the " +
      "least. Completing a motorcycle safety course usually earns a discount. If you store the bike for winter, many " +
      "insurers let you drop to comprehensive-only (lay-up) coverage, cutting the premium for those months.\n\n" +
      "Start from a quote for your area and adjust.",
    examples:
      "Example: a $700 cruiser quote with a 10% course discount is $630 a year. Laying " +
      "the bike up for 4 months brings it to $462 — $168 saved.",
    assumptions:
      "Typical bike-type factors; your insurer's differ. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is motorcycle insurance required?",
        answer: "In almost every state, at least liability coverage is required; lenders require full coverage on financed bikes.",
      },
    ],
  },
  {
    slug: "teen-driver-car-insurance-calculator",
    title: "Teen Driver Car Insurance Calculator",
    description: "Estimate what adding a teen driver to your car insurance costs, with good-student and telematics discounts, compared with a separate policy — and the cost until age 25.",
    metaTitle: "Teen Driver Insurance Calculator — Cost to Add a Teen",
    metaDescription: "Free teen driver insurance calculator. Estimate the cost of adding a teen to your policy with discounts, versus a separate policy.",
    calcInputs: [
      currencyField("currentPremium", "Current Yearly Premium", { default: 2000, max: 100000, step: 50 }),
      percentField("increasePercent", "Increase From Adding the Teen", { default: 100, max: 300, step: 5 }),
      percentField("goodStudentPercent", "Good Student Discount", { default: 15, max: 50, step: 1, required: false }),
      percentField("telematicsPercent", "Telematics / Safe-Driving App Discount", { default: 10, max: 50, step: 1, required: false }),
      currencyField("separatePolicy", "Separate Policy for the Teen (Yearly)", { default: 5000, max: 100000, step: 100 }),
      numberField("yearsUntil25", "Years Until the Teen Turns 25", { default: 8, min: 0, max: 15, step: 1 }),
    ],
    calcResult: { label: "Teen Cost After Discounts (Yearly)", format: "currency" },
    calcResults: [
      { key: "teenCostBeforeDiscounts", label: "Teen Cost Before Discounts", format: "currency" },
      { key: "teenCostAfterDiscounts", label: "Teen Cost After Discounts (Yearly)", format: "currency", highlight: true },
      { key: "newFamilyPremium", label: "New Family Premium", format: "currency" },
      { key: "savingsVsSeparatePolicy", label: "Savings vs a Separate Policy", format: "currency" },
      { key: "estimatedCostUntil25", label: "Estimated Cost Until 25", format: "currency" },
    ],
    instructions:
      "Teen drivers have the highest accident rates, so adding one often doubles a family's premium. Keeping the teen on " +
      "the family policy is usually far cheaper than a separate one. Good-student discounts (B average), driver training, " +
      "telematics programs and assigning the teen to an older, safer car help.\n\n" +
      "The cost to 25 assumes the surcharge fades steadily as the teen gains experience.",
    examples:
      "Example: adding a teen to a $2,000 policy could cost $2,000 more; with good-student and " +
      "telematics discounts it's $1,530, for a $3,530 family premium — $3,470 less " +
      "than a separate policy.",
    assumptions:
      "Discounts apply to the teen's added cost. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When should I add my teen to my policy?",
        answer: "Many insurers cover permit drivers under your policy at no charge; add them when they're licensed. Tell your insurer — an unlisted driver can complicate claims.",
      },
    ],
  },
  {
    slug: "high-risk-driver-insurance-calculator",
    title: "High-Risk Driver Insurance Calculator",
    description: "Estimate how much a DUI, at-fault accidents or an SR-22 requirement raise your car insurance, and the total extra cost over the years the surcharge lasts.",
    metaTitle: "High-Risk & SR-22 Insurance Calculator — Extra Cost",
    metaDescription: "Free high-risk driver insurance calculator. Estimate the surcharge after a DUI or accidents, SR-22 filing fees and the total extra cost.",
    calcInputs: [
      currencyField("basePremium", "Premium Before the Violation (Yearly)", { default: 1600, max: 100000, step: 50 }),
      percentField("surchargePercent", "Surcharge (DUI, Accidents, Violations)", { default: 80, max: 400, step: 5 }),
      numberField("years", "Years the Surcharge or SR-22 Lasts", { default: 3, min: 0, max: 10, step: 1 }),
      currencyField("sr22Fee", "SR-22 Filing Fee", { default: 25, max: 500, step: 5, required: false }),
      numberField("filingsPerYear", "Filings per Year", { default: 1, min: 0, max: 4, step: 1, required: false }),
    ],
    calcResult: { label: "Total Extra Cost", format: "currency" },
    calcResults: [
      { key: "highRiskPremium", label: "High-Risk Premium (Yearly)", format: "currency" },
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency" },
      { key: "extraPerYear", label: "Extra per Year", format: "currency" },
      { key: "sr22FeesTotal", label: "SR-22 Filing Fees", format: "currency" },
      { key: "totalExtraCost", label: "Total Extra Cost", format: "currency", highlight: true },
    ],
    instructions:
      "A DUI, reckless driving, several accidents or driving uninsured can make you a high-risk driver. Premiums often rise " +
      "70–100% or more for 3–5 years. Many states then require an SR-22 (or FR-44 in Florida and Virginia) — a form your " +
      "insurer files proving you carry insurance, usually for three years; letting it lapse can suspend your license.\n\n" +
      "Shop specialty insurers; prices for high-risk drivers vary widely.",
    examples:
      "Example: a 80% surcharge on a $1,600 premium raises it to $2,880 a year. Over 3 " +
      "years, plus $75 of SR-22 fees, that's $3,915 extra.",
    assumptions:
      "Surcharge stays level for the whole period. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need an SR-22 if I don't own a car?",
        answer: "Often yes, to reinstate your license — a non-owner SR-22 policy satisfies the requirement at a lower cost.",
      },
    ],
  },
  {
    slug: "non-owner-car-insurance-calculator",
    title: "Non-Owner Car Insurance Calculator",
    description: "See if a non-owner car insurance policy pays off for someone who rents or borrows cars, compared with buying liability coverage at the rental counter.",
    metaTitle: "Non-Owner Car Insurance Calculator — vs Rental Coverage",
    metaDescription: "Free non-owner car insurance calculator. Compare a non-owner policy with rental-counter liability coverage and see the savings.",
    calcInputs: [
      currencyField("nonOwnerPremium", "Non-Owner Policy per Year", { default: 450, max: 10000, step: 10 }),
      numberField("rentalDays", "Rental Car Days per Year", { default: 30, min: 0, max: 365, step: 1 }),
      currencyField("counterLiabilityPerDay", "Rental Counter Liability Coverage per Day", { default: 18, max: 200, step: 1 }),
      numberField("borrowedCarDays", "Days Driving Borrowed Cars", { default: 0, min: 0, max: 365, step: 1, required: false }),
    ],
    calcResult: { label: "Savings With a Non-Owner Policy", format: "currency" },
    calcResults: [
      { key: "nonOwnerYearly", label: "Non-Owner Policy per Year", format: "currency" },
      { key: "rentalCounterLiabilityYearly", label: "Rental Counter Liability per Year", format: "currency" },
      { key: "savingsWithNonOwner", label: "Savings With a Non-Owner Policy", format: "currency", highlight: true },
      { key: "costPerDayCovered", label: "Non-Owner Cost per Day Driven", format: "currency" },
    ],
    instructions:
      "Non-owner car insurance gives liability coverage when you drive a car you don't own — rentals, car-sharing or a " +
      "friend's car (as secondary coverage). It's often cheap, keeps you continuously insured (which lowers future rates) " +
      "and can satisfy an SR-22 requirement. It doesn't cover damage to the car you're driving.\n\n" +
      "Enter how often you rent; a negative saving means buying coverage at the counter is cheaper.",
    examples:
      "Example: renting 30 days a year and buying liability at $18 a day costs " +
      "$540. A $450 non-owner policy saves $90.",
    assumptions:
      "Damage waiver for the rental car is a separate cost. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I get non-owner insurance if I live with someone who has a car?",
        answer: "Usually not if you have regular access to a household car — insurers expect you to be listed on that policy instead.",
      },
    ],
  },
  {
    slug: "rideshare-driver-insurance-calculator",
    title: "Rideshare Driver Insurance Calculator",
    description: "Estimate the cost of a rideshare or delivery endorsement on your personal car insurance for Uber, Lyft, DoorDash and other gig work, compared with a commercial policy.",
    metaTitle: "Rideshare Insurance Calculator — Uber, Lyft & Gig Drivers",
    metaDescription: "Free rideshare insurance calculator. Estimate the cost of a rideshare or delivery endorsement versus a commercial auto policy.",
    calcInputs: [
      currencyField("personalPremium", "Personal Auto Premium per Year", { default: 1600, max: 100000, step: 50 }),
      currencyField("endorsementMonthly", "Rideshare Endorsement per Month", { default: 20, max: 1000, step: 1 }),
      numberField("hoursPerWeek", "Hours Driving for Apps per Week", { default: 15, min: 0, max: 80, step: 1 }),
      currencyField("commercialPremium", "Commercial Auto Policy per Year (Alternative)", { default: 4000, max: 100000, step: 100, required: false }),
    ],
    calcResult: { label: "Endorsement per Year", format: "currency" },
    calcResults: [
      { key: "endorsementYearly", label: "Endorsement per Year", format: "currency", highlight: true },
      { key: "totalWithEndorsement", label: "Total Premium With Endorsement", format: "currency" },
      { key: "increasePercent", label: "Increase Over Personal Policy", format: "percentage" },
      { key: "insuranceCostPerHourDriven", label: "Insurance Cost per Hour Driven", format: "currency" },
      { key: "savingsVsCommercial", label: "Savings vs a Commercial Policy", format: "currency" },
    ],
    instructions:
      "Personal auto policies usually exclude driving for pay. Rideshare companies provide coverage once you accept a ride, " +
      "but while the app is on and you're waiting for a request, coverage is limited — and your own collision coverage may " +
      "not apply. A rideshare (or delivery) endorsement fills that gap, often for $10–$30 a month.\n\n" +
      "Delivery drivers for food or package apps need a similar endorsement; full-time drivers may need a commercial policy.",
    examples:
      "Example: a $20-a-month endorsement adds $240 a year to a $1,600 policy — " +
      "15% more, about $0.31 per hour driven, and $2,160 less than a commercial " +
      "policy.",
    assumptions:
      "Endorsement availability varies by insurer and state. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens if I don't tell my insurer I drive for Uber?",
        answer: "A claim during app time could be denied and your policy cancelled. The endorsement is cheap insurance against that.",
      },
    ],
  },
  {
    slug: "gap-insurance-auto-calculator",
    title: "Gap Insurance (Auto) Calculator",
    description: "Find out how much you'd owe if your car were totaled while you owe more than it's worth, and compare gap insurance from your insurer with the dealer's price.",
    metaTitle: "Gap Insurance Calculator — Do You Need Gap Coverage",
    metaDescription: "Free gap insurance calculator. See the gap between your loan and car value, your exposure if it's totaled, and insurer vs dealer gap cost.",
    calcInputs: [
      currencyField("loanBalance", "Loan or Lease Balance", { default: 28000, max: 1000000, step: 500 }),
      currencyField("carValue", "Car's Actual Cash Value", { default: 22000, max: 1000000, step: 500 }),
      currencyField("deductible", "Collision Deductible", { default: 500, max: 10000, step: 100, required: false }),
      currencyField("dealerGapPrice", "Dealer Gap Price (One-Time)", { default: 800, max: 10000, step: 25 }),
      currencyField("insurerGapYearly", "Insurer Gap Coverage per Year", { default: 40, max: 1000, step: 5 }),
      numberField("yearsNeeded", "Years Until You No Longer Owe More Than It's Worth", { default: 2, min: 0, max: 8, step: 0.5 }),
    ],
    calcResult: { label: "Your Exposure If Totaled", format: "currency" },
    calcResults: [
      { key: "gapAmount", label: "Gap (Owed − Value)", format: "currency" },
      { key: "loanToValuePercent", label: "Loan-to-Value", format: "percentage" },
      { key: "exposureIfTotaled", label: "Your Exposure If Totaled", format: "currency", highlight: true },
      { key: "insurerGapTotalCost", label: "Insurer Gap Total Cost", format: "currency" },
      { key: "savingsVsDealerGap", label: "Savings vs Dealer Gap", format: "currency" },
    ],
    instructions:
      "If your car is totaled or stolen, insurance pays its actual cash value — which can be thousands less than you owe, " +
      "especially early in a long loan with little down. Gap insurance pays the difference. Adding it through your auto " +
      "insurer is usually much cheaper than buying it from the dealer; leases often include it.\n\n" +
      "Drop it once the loan balance falls below the car's value.",
    examples:
      "Example: owing $28,000 on a car worth $22,000 leaves a $6,000 gap — $6,500 out of pocket with " +
      "the deductible. Insurer gap coverage for 2 years costs $80, $720 less than the " +
      "dealer's.",
    assumptions:
      "Some gap policies also cover the deductible. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I cancel dealer gap insurance?",
        answer: "Usually yes, for a prorated refund — and if you pay off or refinance the loan, ask for one.",
      },
    ],
  },
  {
    slug: "extended-auto-warranty-vs-insurance-calculator",
    title: "Extended Auto Warranty vs Insurance Calculator",
    description: "Compare an extended car warranty (vehicle service contract), mechanical breakdown insurance and simply paying for repairs yourself, based on your expected repairs.",
    metaTitle: "Extended Warranty vs Breakdown Insurance Calculator",
    metaDescription: "Free extended car warranty calculator. Compare a service contract, mechanical breakdown insurance and paying repairs yourself.",
    calcInputs: [
      currencyField("warrantyPrice", "Extended Warranty Price", { default: 2500, max: 100000, step: 50 }),
      currencyField("warrantyDeductible", "Warranty Deductible per Repair", { default: 100, max: 5000, step: 25, required: false }),
      currencyField("mbiYearly", "Mechanical Breakdown Insurance per Year", { default: 400, max: 10000, step: 10 }),
      currencyField("mbiDeductible", "Breakdown Insurance Deductible", { default: 250, max: 5000, step: 25, required: false }),
      numberField("years", "Years of Coverage", { default: 3, min: 0.5, max: 10, step: 0.5 }),
      numberField("repairsPerYear", "Covered Repairs per Year", { default: 1, min: 0, max: 12, step: 0.5 }),
      currencyField("avgRepair", "Average Repair Cost", { default: 700, max: 100000, step: 50 }),
    ],
    calcResult: { label: "Saved With the Cheapest Option", format: "currency" },
    calcResults: [
      { key: "expectedRepairCost", label: "Expected Repair Cost", format: "currency" },
      { key: "warrantyTotalCost", label: "Extended Warranty Total", format: "currency" },
      { key: "breakdownInsuranceTotalCost", label: "Breakdown Insurance Total", format: "currency" },
      { key: "payYourselfCost", label: "Paying Repairs Yourself", format: "currency" },
      { key: "cheapestVsPayingYourself", label: "Saved With the Cheapest Option", format: "currency", highlight: true },
    ],
    instructions:
      "An extended warranty (vehicle service contract) is a prepaid repair plan sold by dealers or third parties. " +
      "Mechanical breakdown insurance (MBI) from some auto insurers covers similar repairs for a yearly premium, usually on " +
      "newer cars. Paying yourself — and setting money aside — often wins, since plans are priced to profit.\n\n" +
      "Estimate repairs from your car's reliability record. A negative saving means paying yourself is cheapest.",
    examples:
      "Example: expecting $2,100 of repairs over 3 years, a $2,500 warranty costs $2,800 " +
      "with deductibles and breakdown insurance $1,950. The cheaper plan saves $150 " +
      "over paying yourself.",
    assumptions:
      "All repairs covered; plans exclude wear items and have claim limits. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are extended warranty calls legitimate?",
        answer: "Unsolicited \"your warranty is expiring\" calls are often scams. Buy only from your dealer, manufacturer or a reputable provider after reading the contract.",
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
