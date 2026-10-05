// One-time (but safe to re-run) batch setup script: creates the Pet, Travel & Event Insurance tools
// (5) of the Insurance Calculators expansion, filed under Insurance Calculators >
// Business & Specialty Insurance Calculators (both categories are created on first run).
// See src/lib/calc-engine-ins-specialty-personal.ts for the math and
// src/lib/calc-engine-ins-life-core.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-ins-specialty-personal-calculators.ts
// or
//   npm run db:create-ins-specialty-personal-calculators

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
    slug: "pet-insurance-calculator",
    title: "Pet Insurance Calculator",
    description: "Estimate pet insurance for a dog or cat by breed and age, and compare the premium with what the policy would reimburse on your vet bills.",
    metaTitle: "Pet Insurance Calculator — Dog & Cat Cost by Breed and Age",
    metaDescription: "Free pet insurance calculator. Estimate dog or cat insurance by breed and age, and see if it pays off on your vet bills.",
    calcInputs: [
      {
        key: "species", label: "Pet", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Dog", value: 1 },
          { label: "Cat", value: 2 },
        ],
      },
      {
        key: "breedRisk", label: "Breed Risk", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Mixed Breed / Lower Risk", value: 1 },
          { label: "Average Purebred", value: 2 },
          { label: "Higher-Risk Breed (e.g., Bulldog, Great Dane)", value: 3 },
        ],
      },
      numberField("petAge", "Pet's Age (Years)", { default: 3, min: 0, max: 25, step: 1 }),
      percentField("reimbursementPercent", "Reimbursement Rate", { default: 80, max: 100, step: 10 }),
      currencyField("deductible", "Yearly Deductible", { default: 250, max: 5000, step: 50 }),
      currencyField("yearlyVetBills", "Expected Yearly Vet Bills (Accident & Illness)", { default: 1500, max: 100000, step: 100 }),
    ],
    calcResult: { label: "Monthly Premium", format: "currency" },
    calcResults: [
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency", highlight: true },
      { key: "yearlyPremium", label: "Yearly Premium", format: "currency" },
      { key: "reimbursementOnVetBills", label: "Reimbursement on Your Vet Bills", format: "currency" },
      { key: "yourCostWithInsurance", label: "Your Yearly Cost with Insurance", format: "currency" },
      { key: "netSavings", label: "Net Savings from Insurance", format: "currency" },
    ],
    instructions:
      "Accident and illness pet insurance reimburses a share of vet bills after a yearly deductible. Premiums rise as pets " +
      "age, and breeds prone to hereditary conditions cost more. Pre-existing conditions are generally excluded, so it's " +
      "cheapest and most useful when bought while your pet is young and healthy.\n\n" +
      "A negative net savings means you'd pay more in premiums than you'd get back in an average year — the value is in " +
      "protection against a large bill, such as surgery or cancer treatment.",
    examples:
      "Example: a 3-year-old mixed-breed dog with 80% reimbursement and a $250 deductible might " +
      "cost $68.20 a month. On $1,500 of vet bills, the policy reimburses $1,000.",
    assumptions:
      "Typical national base premiums; location and insurer change prices a lot. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does pet insurance cover routine care?",
        answer: "Accident and illness policies usually don't cover vaccines, checkups or dental cleanings — that's what a wellness add-on or plan is for.",
      },
    ],
  },
  {
    slug: "pet-wellness-plan-vs-insurance-calculator",
    title: "Pet Wellness Plan vs Pet Insurance Calculator",
    description: "Compare a pet wellness plan for routine care, accident and illness pet insurance, both or neither — your total yearly cost in each case.",
    metaTitle: "Pet Wellness Plan vs Insurance Calculator — Compare Costs",
    metaDescription: "Free calculator comparing a pet wellness plan with pet insurance. See your total yearly cost with each, both or neither.",
    calcInputs: [
      currencyField("wellnessMonthly", "Wellness Plan Cost per Month", { default: 25, max: 1000, step: 1 }),
      currencyField("wellnessCap", "Wellness Plan Yearly Benefit Cap", { default: 400, max: 10000, step: 25 }),
      currencyField("routineCosts", "Routine Care Costs per Year", { default: 450, max: 10000, step: 25 }),
      currencyField("insuranceMonthly", "Insurance Premium per Month", { default: 45, max: 1000, step: 1 }),
      currencyField("deductible", "Insurance Deductible", { default: 250, max: 5000, step: 50 }),
      percentField("reimbursementPercent", "Insurance Reimbursement Rate", { default: 80, max: 100, step: 10 }),
      currencyField("unexpectedBills", "Unexpected Vet Bills This Year", { default: 2000, max: 100000, step: 100 }),
    ],
    calcResult: { label: "Lowest Total Cost", format: "currency" },
    calcResults: [
      { key: "costWithNeither", label: "Cost with Neither", format: "currency" },
      { key: "costWithWellnessPlanOnly", label: "Cost with Wellness Plan Only", format: "currency" },
      { key: "costWithInsuranceOnly", label: "Cost with Insurance Only", format: "currency" },
      { key: "costWithBoth", label: "Cost with Both", format: "currency" },
      { key: "lowestTotalCost", label: "Lowest Total Cost", format: "currency", highlight: true },
      { key: "wellnessPlanNetValue", label: "Wellness Plan Net Value", format: "currency" },
    ],
    instructions:
      "A wellness plan pays fixed amounts for routine care — exams, vaccines, flea and heartworm prevention, dental " +
      "cleanings — up to a yearly cap. Pet insurance covers unexpected accidents and illnesses. They do different jobs.\n\n" +
      "Wellness plans rarely save much: you're mostly prepaying routine costs. Try a high unexpected bill (say $5,000) to " +
      "see how much insurance matters in a bad year.",
    examples:
      "Example: with $450 of routine care and $2,000 of unexpected bills, you'd pay $2,450 with no " +
      "coverage, $1,590 with insurance only and $1,490 with both.",
    assumptions:
      "The wellness plan pays routine costs up to its cap; insurance pays only unexpected bills. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I add wellness coverage to pet insurance?",
        answer: "Many insurers sell wellness as an add-on to an accident and illness policy; compare the add-on price with what it actually pays.",
      },
    ],
  },
  {
    slug: "travel-insurance-calculator",
    title: "Travel Insurance Calculator",
    description: "Estimate travel insurance cost for a trip — comprehensive, cruise, adventure sports, trip cancellation only or travel medical (including for international students) — with the cancel-for-any-reason option.",
    metaTitle: "Travel Insurance Calculator — Trip, Cruise & Medical Cost",
    metaDescription: "Free travel insurance calculator. Estimate trip cancellation, cruise, adventure or travel medical insurance by trip cost and age.",
    calcInputs: [
      currencyField("tripCost", "Prepaid, Non-Refundable Trip Cost", { default: 5000, max: 1000000, step: 100 }),
      numberField("travelerAge", "Traveler's Age", { default: 40, min: 0, max: 100, step: 1 }),
      {
        key: "planType", label: "Plan Type", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Comprehensive", value: 1 },
          { label: "Cruise", value: 2 },
          { label: "Adventure Sports", value: 3 },
          { label: "Trip Cancellation Only", value: 4 },
          { label: "Travel Medical Only (incl. International Students)", value: 5 },
        ],
      },
      numberField("tripDays", "Trip Length (Days)", { default: 10, min: 1, max: 365, step: 1 }),
      {
        key: "cfar", label: "Cancel for Any Reason Add-On", type: "dropdown", required: true, default: 0,
        options: [
          { label: "No", value: 0 },
          { label: "Yes", value: 1 },
        ],
      },
    ],
    calcResult: { label: "Premium", format: "currency" },
    calcResults: [
      { key: "premium", label: "Premium", format: "currency", highlight: true },
      { key: "premiumAsShareOfTrip", label: "Premium as % of Trip Cost", format: "percentage" },
      { key: "costPerDay", label: "Cost per Day", format: "currency" },
      { key: "cancellationReimbursement", label: "Covered-Reason Cancellation Refund", format: "currency" },
      { key: "cancelForAnyReasonRefund", label: "Cancel for Any Reason Refund", format: "currency" },
    ],
    instructions:
      "Comprehensive travel insurance typically costs 4–10% of the prepaid trip cost and covers trip cancellation and " +
      "interruption for covered reasons (illness, injury, severe weather), travel medical and evacuation, and delays and " +
      "baggage. Cruise plans add missed connections and onboard medical needs; adventure plans cover hazardous sports.\n\n" +
      "Travel medical plans, priced per day, suit long stays and international students who need health cover abroad. " +
      "Cancel for any reason (CFAR) costs about 40% more and usually refunds 75% of the trip cost; it must be bought soon after your first trip deposit.",
    examples:
      "Example: a $5,000 trip for a 40-year-old with a comprehensive plan costs about $275 " +
      "(5.50% of the trip).",
    assumptions:
      "Typical rates by plan and age band; Medicare and most US health plans pay little or nothing abroad. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do credit cards include travel insurance?",
        answer: "Some premium cards include trip cancellation and delay coverage when you pay with the card, but usually little medical coverage. Check the card's benefits guide.",
      },
    ],
  },
  {
    slug: "annual-travel-insurance-calculator",
    title: "Annual Travel Insurance Calculator",
    description: "Compare buying single-trip travel insurance for each trip with one annual multi-trip plan, and find how many trips make the annual plan worth it.",
    metaTitle: "Annual Travel Insurance Calculator — Multi-Trip vs Single",
    metaDescription: "Free annual travel insurance calculator. Compare a multi-trip plan with single-trip policies and find your break-even trips.",
    calcInputs: [
      numberField("tripsPerYear", "Trips per Year", { default: 4, min: 0, max: 100, step: 1 }),
      currencyField("averageTripCost", "Average Trip Cost", { default: 2000, max: 1000000, step: 100 }),
      percentField("singleTripRatePercent", "Single-Trip Plan Rate (% of Trip Cost)", { default: 5, max: 20, step: 0.5 }),
      currencyField("annualPlanPremium", "Annual Multi-Trip Plan Premium", { default: 350, max: 100000, step: 10 }),
    ],
    calcResult: { label: "Savings with the Annual Plan", format: "currency" },
    calcResults: [
      { key: "singleTripPlanEach", label: "Single-Trip Plan (Each Trip)", format: "currency" },
      { key: "yearlyCostSingleTripPlans", label: "Single-Trip Plans for the Year", format: "currency" },
      { key: "annualPlanCost", label: "Annual Plan", format: "currency" },
      { key: "savingsWithAnnualPlan", label: "Savings with the Annual Plan", format: "currency", highlight: true },
      { key: "breakEvenTrips", label: "Trips to Break Even", format: "number" },
    ],
    instructions:
      "An annual (multi-trip) plan covers every trip in a year, usually up to a set number of days per trip (often 30–90). " +
      "Frequent travelers often save, but annual plans typically cap trip cancellation coverage per trip at a lower amount than " +
      "single-trip plans — check that the cap covers your most expensive trip.",
    examples:
      "Example: 4 trips at $2,000 each cost $400 in single-trip plans, versus " +
      "$350 for an annual plan. The annual plan pays off after 3.50 trips.",
    assumptions:
      "Single-trip premiums are a flat share of trip cost. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do annual plans cover domestic trips?",
        answer: "Many only cover trips a set distance from home (often 100 miles). Check the plan's definition of a trip.",
      },
    ],
  },
  {
    slug: "wedding-insurance-calculator",
    title: "Wedding Insurance Calculator",
    description: "Estimate wedding or event insurance: cancellation and postponement coverage plus event liability, and how much of your non-refundable deposits it protects.",
    metaTitle: "Wedding Insurance Calculator — Event Insurance Cost",
    metaDescription: "Free wedding insurance calculator. Estimate event cancellation and liability insurance and how much of your deposits it protects.",
    calcInputs: [
      currencyField("eventCost", "Total Event Cost", { default: 30000, max: 10000000, step: 1000 }),
      currencyField("cancellationCoverage", "Cancellation Coverage Limit", { default: 30000, max: 10000000, step: 1000 }),
      currencyField("ratePer1000", "Cancellation Rate per $1,000 of Coverage", { default: 8, max: 100, step: 0.5 }),
      {
        key: "liability", label: "Event Liability ($1M)", type: "dropdown", required: true, default: 2,
        options: [
          { label: "No", value: 1 },
          { label: "Yes", value: 2 },
        ],
      },
      currencyField("liabilityPremium", "Liability Premium", { default: 185, max: 10000, step: 5 }),
      currencyField("nonRefundableDeposits", "Non-Refundable Deposits", { default: 12000, max: 10000000, step: 500 }),
    ],
    calcResult: { label: "Total Premium", format: "currency" },
    calcResults: [
      { key: "cancellationPremium", label: "Cancellation Premium", format: "currency" },
      { key: "liabilityPremium", label: "Liability Premium", format: "currency" },
      { key: "totalPremium", label: "Total Premium", format: "currency", highlight: true },
      { key: "premiumAsShareOfEvent", label: "Premium as % of Event Cost", format: "percentage" },
      { key: "depositsProtected", label: "Deposits Protected", format: "currency" },
      { key: "depositsNotCovered", label: "Deposits Not Covered", format: "currency" },
    ],
    instructions:
      "Wedding and special event insurance reimburses non-refundable costs if the event is cancelled or postponed for a " +
      "covered reason — severe weather, illness, vendor bankruptcy or no-show, military deployment. Event liability covers " +
      "injuries and property damage at the venue, which many venues require.\n\n" +
      "Change of heart is not covered. Buy early, as soon as you start paying deposits.",
    examples:
      "Example: $30,000 of cancellation coverage plus $1M of liability costs about $425 " +
      "(1.42% of a $30,000 event) and protects $12,000 of deposits.",
    assumptions:
      "Flat rate per $1,000 of cancellation coverage; liquor liability may cost extra. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does wedding insurance cover a cancellation due to cold feet?",
        answer: "No — a change of heart is excluded by virtually all wedding insurance policies.",
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
