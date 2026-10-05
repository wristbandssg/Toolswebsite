// One-time (but safe to re-run) batch setup script: creates the Valuables & Special Property Insurance tools
// (4) of the Insurance Calculators expansion, filed under Insurance Calculators >
// Home & Property Insurance Calculators (both categories are created on first run).
// See src/lib/calc-engine-ins-home-valuables.ts for the math and
// src/lib/calc-engine-ins-life-core.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-ins-home-valuables-calculators.ts
// or
//   npm run db:create-ins-home-valuables-calculators

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
    slug: "builders-risk-insurance-calculator",
    title: "Builder's Risk Insurance Calculator",
    description: "Estimate builder's risk insurance for a home being built or renovated: the premium on the completed value, prorated for how long construction takes.",
    metaTitle: "Builder's Risk Insurance Calculator — Construction Cover",
    metaDescription: "Free builder's risk insurance calculator. Estimate the premium for a home under construction or renovation, prorated for the build period.",
    calcInputs: [
      currencyField("completedValue", "Completed Value of the Project", { default: 400000, max: 1000000000, step: 5000 }),
      percentField("ratePercent", "Rate for a Full Term (% of Value)", { default: 1.5, max: 10, step: 0.1 }),
      numberField("buildMonths", "Construction Period (Months)", { default: 9, min: 1, max: 36, step: 1 }),
      numberField("policyMonths", "Full Policy Term (Months)", { default: 12, min: 1, max: 36, step: 1 }),
      currencyField("deductible", "Deductible", { default: 1000, max: 100000, step: 250, required: false }),
      currencyField("minimumPremium", "Minimum Premium", { default: 500, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Premium for the Build Period", format: "currency" },
    calcResults: [
      { key: "fullTermPremium", label: "Full-Term Premium", format: "currency" },
      { key: "premiumForBuildPeriod", label: "Premium for the Build Period", format: "currency", highlight: true },
      { key: "monthlyCost", label: "Cost per Month of Construction", format: "currency" },
      { key: "premiumAsShareOfValue", label: "Premium as % of Value", format: "percentage" },
      { key: "deductible", label: "Deductible", format: "currency" },
    ],
    instructions:
      "Builder's risk insurance covers a structure while it's being built or heavily renovated — fire, theft of materials, " +
      "vandalism and storms. Homeowners insurance doesn't cover a home under construction. Lenders usually require it for " +
      "construction loans; either the owner or the builder may buy it.\n\n" +
      "Rates are typically 1–4% of the completed value, depending on construction type and location. Liability is separate.",
    examples:
      "Example: a $400,000 project at 1.50% would cost $6,000 for a full year; for a 9-month " +
      "build that's $4,500 — about $500 a month.",
    assumptions:
      "Pro-rata for the build period, subject to a minimum premium. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens when construction finishes?",
        answer: "The builder's risk policy ends at completion or occupancy; you need a homeowners policy in place before you move in.",
      },
    ],
  },
  {
    slug: "vacant-home-insurance-calculator",
    title: "Vacant Home Insurance Calculator",
    description: "Estimate the extra cost of insuring a vacant or seasonal home — a home for sale, an inherited property or a winter home — for the months it sits empty.",
    metaTitle: "Vacant Home Insurance Calculator — Vacancy Cost",
    metaDescription: "Free vacant home insurance calculator. Estimate the cost of insuring a vacant or seasonal home for the months it sits empty.",
    calcInputs: [
      currencyField("normalPremium", "Normal Homeowners Premium (Yearly)", { default: 1800, max: 100000, step: 50 }),
      percentField("surchargePercent", "Vacancy Policy Surcharge", { default: 60, max: 300, step: 5 }),
      numberField("monthsVacant", "Months Vacant", { default: 8, min: 0, max: 12, step: 1 }),
    ],
    calcResult: { label: "Extra Cost of Vacancy", format: "currency" },
    calcResults: [
      { key: "vacantMonthlyPremium", label: "Vacant Monthly Premium", format: "currency" },
      { key: "vacancyCostForPeriod", label: "Cost for the Vacant Months", format: "currency" },
      { key: "yearlyCost", label: "Yearly Cost", format: "currency" },
      { key: "extraCostOfVacancy", label: "Extra Cost of Vacancy", format: "currency", highlight: true },
    ],
    instructions:
      "Standard homeowners policies typically limit or exclude coverage (for vandalism, glass breakage, water damage) once a " +
      "home has been vacant for 30–60 days. A vacant home policy or endorsement fills the gap, at a higher price because " +
      "problems go unnoticed. Seasonal homes that are furnished but unoccupied part of the year may need a seasonal policy.\n\n" +
      "Tell your insurer when a home will be empty, and winterize it.",
    examples:
      "Example: with a $1,800 normal premium and a 60% vacancy surcharge, 8 vacant months cost " +
      "$1,920 — $720 more for the year.",
    assumptions:
      "The normal policy applies to the occupied months. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a house that's for sale considered vacant?",
        answer: "If no one lives there and most furniture is gone, usually yes — a staged but unoccupied home may still count as vacant. Check your policy's definition.",
      },
    ],
  },
  {
    slug: "jewelry-insurance-calculator",
    title: "Jewelry Insurance Calculator",
    description: "Estimate the cost of scheduling jewelry, fine art, collectibles, musical instruments or camera gear on your insurance, and how much a homeowners theft limit would leave uncovered.",
    metaTitle: "Jewelry Insurance Calculator — Valuables Coverage Cost",
    metaDescription: "Free jewelry insurance calculator. Estimate scheduled coverage for jewelry, art, collectibles, instruments or cameras vs homeowners limits.",
    calcInputs: [
      currencyField("itemValue", "Appraised Value", { default: 12000, max: 100000000, step: 100 }),
      {
        key: "itemType", label: "Item Type", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Jewelry & Watches", value: 1 },
          { label: "Fine Art", value: 2 },
          { label: "Collectibles", value: 3 },
          { label: "Musical Instruments", value: 4 },
          { label: "Camera Equipment", value: 5 },
        ],
      },
      percentField("ratePercent", "Quoted Rate (0 = Typical for the Item Type)", { default: 0, max: 10, step: 0.05, required: false }),
      currencyField("homeownersSublimit", "Homeowners Theft Limit for This Type", { default: 1500, max: 100000, step: 100 }),
      currencyField("deductible", "Deductible on Scheduled Items", { default: 0, max: 10000, step: 50, required: false }),
    ],
    calcResult: { label: "Yearly Premium", format: "currency" },
    calcResults: [
      { key: "rateUsed", label: "Rate Used (%)", format: "number" },
      { key: "yearlyPremium", label: "Yearly Premium", format: "currency", highlight: true },
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency" },
      { key: "payoutIfStolenScheduled", label: "Payout If Stolen (Scheduled)", format: "currency" },
      { key: "payoutIfStolenUnscheduled", label: "Payout If Stolen (Not Scheduled)", format: "currency" },
      { key: "uncoveredWithoutScheduling", label: "Uncovered Without Scheduling", format: "currency" },
    ],
    instructions:
      "Homeowners and renters policies cap theft of jewelry, watches and similar valuables at a low limit — often $1,000–" +
      "$2,500 — and may not cover loss or accidental damage. Scheduling an item (a rider, also called a floater) insures its " +
      "appraised value against theft, loss and damage, often with no deductible. Typical rates are about 1–2% of value a year " +
      "for jewelry and well under 1% for fine art.\n\n" +
      "Keep appraisals current; values change.",
    examples:
      "Example: scheduling a $12,000 piece of jewelry at 1.50% costs $180 a year. If stolen, scheduled coverage " +
      "pays $12,000; without it, the $1,500 limit leaves $10,500 uncovered.",
    assumptions:
      "Typical rates by item type; standalone jewelry insurers price similarly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need an appraisal?",
        answer: "Usually for items over a few thousand dollars. Insurers may also accept a recent receipt.",
      },
    ],
  },
  {
    slug: "identity-theft-insurance-calculator",
    title: "Identity Theft Insurance Calculator",
    description: "Weigh the cost of identity theft insurance or protection against the expected cost of identity theft — out-of-pocket expenses and the time it takes to recover.",
    metaTitle: "Identity Theft Insurance Calculator — Is It Worth It",
    metaDescription: "Free identity theft insurance calculator. Compare the yearly premium with the expected cost of identity theft and recovery time.",
    calcInputs: [
      currencyField("monthlyPremium", "Monthly Premium or Service Fee", { default: 15, max: 1000, step: 1 }),
      percentField("yearlyChancePercent", "Chance of Identity Theft per Year", { default: 3, max: 100, step: 0.5 }),
      currencyField("outOfPocketIfVictim", "Out-of-Pocket Costs If It Happens", { default: 1500, max: 1000000, step: 100 }),
      numberField("hoursToResolve", "Hours to Resolve", { default: 20, min: 0, max: 1000, step: 1 }),
      currencyField("hourlyValue", "Value of Your Time per Hour", { default: 30, max: 1000, step: 1 }),
    ],
    calcResult: { label: "Premium Minus Expected Loss", format: "currency" },
    calcResults: [
      { key: "yearlyPremium", label: "Yearly Premium", format: "currency" },
      { key: "costIfYouAreAVictim", label: "Cost If You Are a Victim", format: "currency" },
      { key: "expectedYearlyLoss", label: "Expected Yearly Loss", format: "currency" },
      { key: "premiumMinusExpectedLoss", label: "Premium Minus Expected Loss", format: "currency", highlight: true },
    ],
    instructions:
      "Identity theft insurance reimburses costs of recovering your identity — lost wages, legal fees, notary and mailing " +
      "costs — and often includes restoration help. It usually doesn't repay stolen money (banks and card issuers typically " +
      "cover fraudulent charges). Some homeowners policies add it cheaply as an endorsement.\n\n" +
      "Free steps — freezing your credit at all three bureaus, strong passwords and two-factor login — prevent much of the risk.",
    examples:
      "Example: a $15-a-month plan costs $180 a year. With a 3% yearly chance of a " +
      "$2,100 hit, the expected loss is $63 — so the plan costs $117 more than " +
      "it's expected to save.",
    assumptions:
      "Covered expenses only; the value of restoration services isn't counted. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is identity theft protection the same as insurance?",
        answer: "Not quite — protection services monitor your credit and help you recover; insurance reimburses certain costs. Many bundles include both.",
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
