// One-time (but safe to re-run) batch setup script: creates the Health Plan tools
// (7) of the Insurance Calculators expansion, filed under Insurance Calculators >
// Health Insurance Calculators (both categories are created on first run).
// See src/lib/calc-engine-ins-health-plans.ts for the math and
// src/lib/calc-engine-ins-life-core.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-ins-health-plans-calculators.ts
// or
//   npm run db:create-ins-health-plans-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Insurance Calculators", slug: "insurance-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Health Insurance Calculators", slug: "health-insurance-calculators" };

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
    slug: "health-insurance-premium-calculator",
    title: "Health Insurance Premium Calculator",
    description: "Estimate an individual or family health insurance premium by age using the ACA age-rating curve, with tobacco surcharges and children's rates.",
    metaTitle: "Health Insurance Premium Calculator — By Age & Family",
    metaDescription: "Free health insurance premium calculator. Estimate premiums by age with the ACA age curve, tobacco surcharge and children's rates.",
    calcInputs: [
      currencyField("baseAt21", "Plan's Monthly Premium for a 21-Year-Old", { default: 380, max: 10000, step: 5 }),
      numberField("age1", "Your Age", { default: 40, min: 0, max: 100, step: 1 }),
      numberField("age2", "Spouse's Age (0 If None)", { default: 38, min: 0, max: 100, step: 1, required: false }),
      numberField("childrenUnder21", "Children Under 21", { default: 2, min: 0, max: 10, step: 1, required: false }),
      percentField("tobaccoPercent", "Tobacco Surcharge (Max 50%)", { default: 0, max: 50, step: 5, required: false }),
    ],
    calcResult: { label: "Family Monthly Premium", format: "currency" },
    calcResults: [
      { key: "ageFactor", label: "Your Age Factor", format: "number" },
      { key: "yourMonthlyPremium", label: "Your Monthly Premium", format: "currency" },
      { key: "familyMonthlyPremium", label: "Family Monthly Premium", format: "currency", highlight: true },
      { key: "familyYearlyPremium", label: "Family Yearly Premium", format: "currency" },
      { key: "childrenRated", label: "Children Charged (Max 3)", format: "number" },
    ],
    instructions:
      "Under the ACA, individual and small-group premiums can vary only by age, location, tobacco use and family size — not " +
      "health. A 64-year-old can be charged at most 3 times a 21-year-old, following a set age curve; children under 15 pay " +
      "0.765 times the age-21 rate, and only the three oldest children under 21 are charged.\n\n" +
      "Find a plan's premium for a 21-year-old on HealthCare.gov or your state exchange (or divide any quote by its age " +
      "factor). Subsidies aren't included — see the marketplace subsidy calculator.",
    examples:
      "Example: for a plan costing $380 for a 21-year-old, a 40-year-old (age factor 1.28) pays " +
      "$485.64 a month. With a 38-year-old spouse and 2 children, the family premium is " +
      "$1,540.52 — $18,486.24 a year.",
    assumptions:
      "Federal default age curve; a few states use their own (and some don't allow tobacco surcharges). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does my premium jump at certain ages?",
        answer: "The ACA age curve rises slowly in your 20s and 30s and faster after 45 — premiums at 60 are about 2.7 times those at 21.",
      },
    ],
  },
  {
    slug: "health-insurance-plan-comparison-calculator",
    title: "Health Insurance Plan Comparison Calculator",
    description: "Compare two health plans — such as a PPO and an HSA-eligible high-deductible plan, or a student or short-term plan — by total yearly cost at your expected medical use and in a worst case.",
    metaTitle: "Health Plan Comparison Calculator — PPO vs HDHP/HSA",
    metaDescription: "Free health plan comparison calculator. Compare total yearly costs of two plans, including HSA money, at your expected use and worst case.",
    calcInputs: [
      currencyField("expectedCosts", "Expected Medical Costs This Year", { default: 5000, max: 10000000, step: 100 }),
      currencyField("aPremium", "Plan A Monthly Premium", { default: 450, max: 100000, step: 5 }),
      currencyField("aDeductible", "Plan A Deductible", { default: 1500, max: 100000, step: 100 }),
      percentField("aCoinsurance", "Plan A Coinsurance", { default: 20, max: 100, step: 5 }),
      currencyField("aOopMax", "Plan A Out-of-Pocket Max", { default: 6000, max: 100000, step: 100 }),
      currencyField("bPremium", "Plan B Monthly Premium", { default: 320, max: 100000, step: 5 }),
      currencyField("bDeductible", "Plan B Deductible", { default: 3500, max: 100000, step: 100 }),
      percentField("bCoinsurance", "Plan B Coinsurance", { default: 20, max: 100, step: 5 }),
      currencyField("bOopMax", "Plan B Out-of-Pocket Max", { default: 7500, max: 100000, step: 100 }),
      currencyField("bHsaEmployer", "Plan B: Employer HSA Contribution", { default: 1000, max: 100000, step: 50, required: false }),
      currencyField("bHsaYours", "Plan B: Your HSA Contribution", { default: 3000, max: 100000, step: 50, required: false }),
      percentField("taxRatePercent", "Your Tax Rate", { default: 22, max: 60, step: 1, required: false }),
    ],
    calcResult: { label: "Plan B Savings", format: "currency" },
    calcResults: [
      { key: "planAYearlyCost", label: "Plan A Yearly Cost", format: "currency" },
      { key: "planBYearlyCost", label: "Plan B Yearly Cost (Net of HSA Benefits)", format: "currency" },
      { key: "planBSavings", label: "Plan B Savings", format: "currency", highlight: true },
      { key: "planAWorstCase", label: "Plan A Worst Case", format: "currency" },
      { key: "planBWorstCase", label: "Plan B Worst Case", format: "currency" },
    ],
    instructions:
      "The cheapest premium isn't always the cheapest plan. Add a year of premiums to what you'd pay out of pocket for the " +
      "care you expect; for an HSA-eligible plan, subtract employer HSA money and the tax saved on your own contributions. " +
      "Also compare the worst case — premiums plus the out-of-pocket maximum.\n\n" +
      "The same comparison works for a school student plan versus a parent's plan, or a short-term plan versus a " +
      "marketplace plan (short-term plans can exclude pre-existing conditions and aren't ACA-compliant). A negative saving " +
      "means Plan A is cheaper.",
    examples:
      "Example: with $5,000 of expected care, Plan A costs $7,600 a year and HSA-eligible Plan B " +
      "$5,980 after HSA benefits — $1,620 cheaper. In a bad year, Plan A could cost $11,400 and " +
      "Plan B $9,680.",
    assumptions:
      "Copays treated as part of coinsurance; in-network care only. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Who should choose a high-deductible plan?",
        answer: "People who expect low medical costs or can fund the HSA — the tax savings and employer money often outweigh the higher deductible.",
      },
    ],
  },
  {
    slug: "out-of-pocket-maximum-calculator",
    title: "Out-of-Pocket Maximum Calculator",
    description: "Work out what you'll pay on a medical bill under your plan — deductible, coinsurance and copays — and how close you are to the out-of-pocket maximum.",
    metaTitle: "Out-of-Pocket Maximum Calculator — Deductible & Coinsurance",
    metaDescription: "Free out-of-pocket calculator. See what you pay on a medical bill with deductible, coinsurance and copays, capped at your out-of-pocket max.",
    calcInputs: [
      currencyField("billAmount", "Allowed Amount of the Bill", { default: 12000, max: 10000000, step: 100 }),
      currencyField("deductible", "Deductible", { default: 2000, max: 100000, step: 100 }),
      currencyField("deductibleMet", "Deductible Already Met", { default: 0, max: 100000, step: 100, required: false }),
      percentField("coinsurancePercent", "Coinsurance", { default: 20, max: 100, step: 5 }),
      numberField("copayVisits", "Visits With a Copay", { default: 6, min: 0, max: 365, step: 1, required: false }),
      currencyField("copay", "Copay per Visit", { default: 30, max: 1000, step: 5, required: false }),
      currencyField("oopMax", "Out-of-Pocket Maximum", { default: 6000, max: 100000, step: 100 }),
      currencyField("paidSoFar", "Already Paid Toward the Max This Year", { default: 0, max: 100000, step: 100, required: false }),
    ],
    calcResult: { label: "You Pay", format: "currency" },
    calcResults: [
      { key: "youPayBeforeCap", label: "Your Share Before the Cap", format: "currency" },
      { key: "copaysTotal", label: "Copays", format: "currency" },
      { key: "youPay", label: "You Pay", format: "currency", highlight: true },
      { key: "insurancePays", label: "Insurance Pays", format: "currency" },
      { key: "remainingToOutOfPocketMax", label: "Left Until the Out-of-Pocket Max", format: "currency" },
    ],
    instructions:
      "You pay the deductible first, then coinsurance (a percentage of each bill), plus copays (flat fees for visits and " +
      "prescriptions). Once your total reaches the out-of-pocket maximum, the plan pays 100% of covered in-network care for " +
      "the rest of the year. Premiums don't count toward it.\n\n" +
      "Use the plan's allowed (negotiated) amount from your explanation of benefits, not the provider's list price.",
    examples:
      "Example: on a $12,000 bill with a $2,000 deductible and 20% coinsurance, plus $180 " +
      "of copays, you pay $4,180 and insurance pays $8,000. You're $1,820 from your " +
      "$6,000 maximum.",
    assumptions:
      "All costs in-network and covered; ACA plans' 2026 out-of-pocket limits are set yearly by HHS. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Copay or coinsurance — which is better?",
        answer: "Copays are predictable for routine care; coinsurance can cost more for expensive care until you hit the out-of-pocket max.",
      },
    ],
  },
  {
    slug: "dental-insurance-calculator",
    title: "Dental Insurance Calculator",
    description: "See whether dental insurance pays off: premiums plus your share of preventive, basic and major work, within the plan's annual maximum, versus paying cash.",
    metaTitle: "Dental Insurance Calculator — Is It Worth It",
    metaDescription: "Free dental insurance calculator. Compare premiums plus your share of dental work, within the annual maximum, against paying cash.",
    calcInputs: [
      currencyField("monthlyPremium", "Monthly Premium", { default: 35, max: 1000, step: 1 }),
      currencyField("annualMax", "Annual Maximum", { default: 1500, max: 100000, step: 100 }),
      currencyField("deductible", "Deductible", { default: 50, max: 10000, step: 25, required: false }),
      currencyField("preventive", "Preventive Care (Cleanings, X-Rays) — 100%", { default: 400, max: 100000, step: 25 }),
      currencyField("basic", "Basic Work (Fillings) — 80%", { default: 600, max: 100000, step: 25, required: false }),
      currencyField("major", "Major Work (Crowns, Root Canals) — 50%", { default: 2000, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Savings With Insurance", format: "currency" },
    calcResults: [
      { key: "totalDentalCosts", label: "Total Dental Costs", format: "currency" },
      { key: "insurancePays", label: "Insurance Pays (Up to the Max)", format: "currency" },
      { key: "yourCostWithInsurance", label: "Your Cost With Insurance (Incl. Premiums)", format: "currency" },
      { key: "yourCostWithoutInsurance", label: "Your Cost Without Insurance", format: "currency" },
      { key: "savingsWithInsurance", label: "Savings With Insurance", format: "currency", highlight: true },
    ],
    instructions:
      "Most dental plans follow a 100-80-50 pattern: preventive care covered in full, basic work at 80%, major work at 50% " +
      "after the deductible — up to an annual maximum, often $1,000–$2,000. Major work may have waiting periods of 6–12 " +
      "months.\n\n" +
      "Enter the work you expect this year. A negative saving means paying cash (or a dental discount plan) is cheaper.",
    examples:
      "Example: $3,000 of dental work, with insurance paying $1,500 (the $1,500 max), costs you " +
      "$1,920 including premiums — $1,080 less than paying cash.",
    assumptions:
      "Deductible applies to basic work; in-network fees. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is dental insurance worth it if I only get cleanings?",
        answer: "Often not — premiums can exceed the cost of two cleanings. Many dentists offer in-house membership plans that cost less.",
      },
    ],
  },
  {
    slug: "vision-insurance-calculator",
    title: "Vision Insurance Calculator",
    description: "Find out if vision insurance saves money: premiums, exam and lens copays and the frame allowance versus paying cash for an eye exam and glasses.",
    metaTitle: "Vision Insurance Calculator — Is It Worth It",
    metaDescription: "Free vision insurance calculator. Compare premiums, copays and frame allowances with paying cash for eye exams and glasses.",
    calcInputs: [
      currencyField("monthlyPremium", "Monthly Premium", { default: 12, max: 1000, step: 1 }),
      currencyField("examCost", "Eye Exam Price", { default: 150, max: 10000, step: 5 }),
      currencyField("examCopay", "Exam Copay", { default: 10, max: 1000, step: 5, required: false }),
      currencyField("framesCost", "Frames Price", { default: 250, max: 10000, step: 5, required: false }),
      currencyField("frameAllowance", "Frame Allowance", { default: 150, max: 10000, step: 5, required: false }),
      currencyField("lensesCost", "Lenses Price", { default: 150, max: 10000, step: 5, required: false }),
      currencyField("lensCopay", "Lens Copay", { default: 25, max: 1000, step: 5, required: false }),
      numberField("people", "People Covered", { default: 1, min: 1, max: 10, step: 1 }),
    ],
    calcResult: { label: "Savings With Insurance", format: "currency" },
    calcResults: [
      { key: "costWithoutInsurance", label: "Cost Without Insurance", format: "currency" },
      { key: "costWithInsurance", label: "Cost With Insurance", format: "currency" },
      { key: "savingsWithInsurance", label: "Savings With Insurance", format: "currency", highlight: true },
    ],
    instructions:
      "Vision plans cover a yearly eye exam with a copay and give an allowance toward frames or contacts; lenses usually " +
      "have a copay. They pay off mainly if you buy new glasses every year — if not, paying cash or shopping online is often " +
      "cheaper.\n\n" +
      "Enter prices for one year; a negative saving means the plan costs more than it saves.",
    examples:
      "Example: an exam and glasses cost $550 without insurance. With a $12 plan, copays and a " +
      "$150 frame allowance, you pay $279 — saving $271.",
    assumptions:
      "One exam and one pair of glasses per person per year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does health insurance cover eye exams?",
        answer: "ACA plans must cover children's vision care. For adults, medical plans usually cover eye disease but not routine exams or glasses.",
      },
    ],
  },
  {
    slug: "group-vs-individual-insurance-calculator",
    title: "Group vs Individual Insurance Calculator",
    description: "Compare your employer's group health plan with an individual market plan: the employer's contribution, pre-tax savings and what each option costs you per year.",
    metaTitle: "Group vs Individual Health Insurance Calculator",
    metaDescription: "Free group vs individual insurance calculator. Compare an employer plan's cost after pre-tax savings with an individual plan, and see employer value.",
    calcInputs: [
      currencyField("groupTotalMonthly", "Employer Plan Total Premium per Month", { default: 1800, max: 100000, step: 25 }),
      currencyField("yourShareMonthly", "Your Paycheck Deduction per Month", { default: 450, max: 100000, step: 10 }),
      percentField("taxRatePercent", "Your Tax Rate (Incl. 7.65% FICA)", { default: 30, max: 60, step: 1 }),
      currencyField("individualMonthly", "Individual Plan Premium per Month", { default: 1100, max: 100000, step: 25 }),
      currencyField("subsidyMonthly", "Premium Tax Credit per Month (If Eligible)", { default: 0, max: 100000, step: 10, required: false }),
    ],
    calcResult: { label: "Group Plan Savings", format: "currency" },
    calcResults: [
      { key: "employerContributionYearly", label: "Employer Contribution per Year", format: "currency" },
      { key: "employerShareOfPremium", label: "Employer Share of Premium", format: "percentage" },
      { key: "groupCostAfterTaxSavings", label: "Group Plan Cost to You (After Tax Savings)", format: "currency" },
      { key: "individualPlanCost", label: "Individual Plan Cost", format: "currency" },
      { key: "groupPlanSavings", label: "Group Plan Savings", format: "currency", highlight: true },
    ],
    instructions:
      "Employer plans are usually much cheaper for you: the employer typically pays 70–85% of the premium, and your share " +
      "comes out of your paycheck before income and payroll tax. That employer money is a real part of your pay. If an " +
      "employer plan is \"affordable\" and meets minimum value, you generally can't get marketplace subsidies.\n\n" +
      "Compare plans with similar deductibles and networks.",
    examples:
      "Example: a $1,800 group premium where you pay $450 means your employer contributes " +
      "$16,200 a year. After tax savings, the group plan costs you $3,780 versus " +
      "$13,200 for an individual plan — $9,420 saved.",
    assumptions:
      "Your share is deducted pre-tax under a Section 125 plan. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's an ICHRA?",
        answer: "An individual coverage HRA lets an employer give you tax-free money to buy your own individual plan instead of offering a group plan.",
      },
    ],
  },
  {
    slug: "cobra-insurance-cost-calculator",
    title: "COBRA Insurance Cost Calculator",
    description: "Calculate what COBRA continuation coverage will cost after leaving a job — the full premium plus the 2% admin fee — and compare it with a marketplace plan.",
    metaTitle: "COBRA Cost Calculator — Monthly Premium & Alternatives",
    metaDescription: "Free COBRA cost calculator. See your COBRA premium with the 2% admin fee, the total cost, and savings from a marketplace plan.",
    calcInputs: [
      currencyField("fullMonthlyPremium", "Full Plan Premium per Month (Employer + Employee)", { default: 1800, max: 100000, step: 25 }),
      percentField("adminPercent", "Admin Fee", { default: 2, max: 50, step: 1 }),
      numberField("months", "Months of COBRA", { default: 18, min: 0, max: 36, step: 1 }),
      currencyField("previousShare", "What You Paid per Month as an Employee", { default: 450, max: 100000, step: 10, required: false }),
      currencyField("marketplaceMonthly", "Marketplace Plan After Subsidy per Month", { default: 900, max: 100000, step: 10, required: false }),
    ],
    calcResult: { label: "COBRA Monthly Premium", format: "currency" },
    calcResults: [
      { key: "cobraMonthlyPremium", label: "COBRA Monthly Premium", format: "currency", highlight: true },
      { key: "totalCobraCost", label: "Total COBRA Cost", format: "currency" },
      { key: "increaseOverWhatYouPaid", label: "Increase Over What You Paid", format: "currency" },
      { key: "marketplaceSavingsPerMonth", label: "Marketplace Savings per Month", format: "currency" },
      { key: "marketplaceSavingsTotal", label: "Marketplace Savings Over the Period", format: "currency" },
    ],
    instructions:
      "COBRA lets you keep your employer health plan after leaving a job — usually for 18 months (up to 36 in some cases) — " +
      "but you pay the full premium, including the part your employer used to pay, plus up to a 2% admin fee (150% during a " +
      "disability extension). You have 60 days to elect it, and coverage is retroactive.\n\n" +
      "Losing job-based coverage also opens a special enrollment period for marketplace plans, which may be cheaper with a " +
      "subsidy — especially with lower income after a job loss.",
    examples:
      "Example: a $1,800 plan costs $1,836 a month on COBRA — $1,386 more than you " +
      "paid as an employee — and $33,048 over 18 months. A marketplace plan at $900 would save " +
      "$16,848.",
    assumptions:
      "Premium stays the same for the period. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I choose COBRA or a marketplace plan?",
        answer: "COBRA keeps your doctors, deductible progress and network; a marketplace plan is often cheaper. If you've already met a big deductible this year, COBRA can be worth it until year-end.",
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
