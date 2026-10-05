// One-time (but safe to re-run) batch setup script: creates the Health Coverage tools
// (7) of the Insurance Calculators expansion, filed under Insurance Calculators >
// Health Insurance Calculators (both categories are created on first run).
// See src/lib/calc-engine-ins-health-coverage.ts for the math and
// src/lib/calc-engine-ins-life-core.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-ins-health-coverage-calculators.ts
// or
//   npm run db:create-ins-health-coverage-calculators

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
    slug: "disability-insurance-calculator",
    title: "Disability Insurance Calculator",
    description: "Estimate short-term or long-term disability insurance benefits: the monthly benefit (after tax if your employer pays the premium), income lost during the waiting period, and the premium.",
    metaTitle: "Disability Insurance Calculator — LTD & STD Benefits",
    metaDescription: "Free disability insurance calculator. Estimate long- or short-term disability benefits after tax, income lost in the waiting period and premiums.",
    calcInputs: [
      currencyField("salary", "Yearly Salary", { default: 80000, max: 100000000, step: 1000 }),
      percentField("benefitPercent", "Benefit (% of Salary)", { default: 60, max: 100, step: 5 }),
      currencyField("monthlyCap", "Monthly Benefit Cap", { default: 10000, max: 1000000, step: 500 }),
      numberField("eliminationDays", "Waiting (Elimination) Period (Days)", { default: 90, min: 0, max: 730, step: 7 }),
      numberField("benefitYears", "Benefit Period (Years)", { default: 5, min: 0, max: 50, step: 1 }),
      percentField("premiumPercent", "Premium (% of Salary per Year)", { default: 2, max: 10, step: 0.25 }),
      {
        key: "employerPaid", label: "Who Pays the Premium?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Employer (Benefits Are Taxable)", value: 1 },
          { label: "Me, After Tax (Benefits Are Tax-Free)", value: 0 },
        ],
      },
      percentField("taxRatePercent", "Your Tax Rate", { default: 22, max: 60, step: 1 }),
    ],
    calcResult: { label: "Monthly Benefit After Tax", format: "currency" },
    calcResults: [
      { key: "monthlyBenefit", label: "Monthly Benefit", format: "currency" },
      { key: "monthlyBenefitAfterTax", label: "Monthly Benefit After Tax", format: "currency", highlight: true },
      { key: "replacementOfTakeHome", label: "Share of Take-Home Pay Replaced", format: "percentage" },
      { key: "incomeLostDuringWaitingPeriod", label: "Income Lost During the Waiting Period", format: "currency" },
      { key: "maximumTotalBenefit", label: "Maximum Total Benefit", format: "currency" },
      { key: "yearlyPremium", label: "Yearly Premium", format: "currency" },
    ],
    instructions:
      "Disability insurance replaces part of your income if illness or injury stops you working. Short-term disability " +
      "usually pays 60–70% of pay for 3–6 months after a 1–2 week wait; long-term disability pays around 60% after a 90-day " +
      "waiting period, often until 65. If your employer pays the premium, benefits are taxable; if you pay with after-tax " +
      "money, they're tax-free.\n\n" +
      "Your emergency fund needs to cover the waiting period.",
    examples:
      "Example: 60% of an $80,000 salary is $4,000 a month — $3,120 after tax with an " +
      "employer-paid policy, about 60% of take-home pay. A 90-day waiting period means " +
      "$19,726.03 of lost pay to cover yourself.",
    assumptions:
      "Benefit is a flat share of salary; offsets for Social Security disability are not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Own-occupation or any-occupation?",
        answer: "Own-occupation policies pay if you can't do your own job; any-occupation policies only if you can't do any suitable job. Own-occupation costs more but protects specialists.",
      },
    ],
  },
  {
    slug: "long-term-care-insurance-calculator",
    title: "Long-Term Care Insurance Calculator",
    description: "Estimate future long-term care costs and how much a long-term care policy would cover with inflation protection — the monthly gap, total cost of care and total premiums.",
    metaTitle: "Long-Term Care Insurance Calculator — Cost & Coverage",
    metaDescription: "Free long-term care insurance calculator. Project future care costs, policy benefits with inflation protection, and the gap to cover.",
    calcInputs: [
      currencyField("monthlyCareCost", "Monthly Care Cost Today", { default: 6000, max: 1000000, step: 100 }),
      percentField("careInflationPercent", "Care Cost Increase per Year", { default: 4, max: 15, step: 0.5 }),
      numberField("yearsUntilCare", "Years Until Care Is Needed", { default: 20, min: 0, max: 60, step: 1 }),
      numberField("careYears", "Years of Care", { default: 3, min: 0, max: 20, step: 0.5 }),
      currencyField("policyMonthlyBenefit", "Policy Monthly Benefit Today", { default: 5000, max: 1000000, step: 100 }),
      percentField("inflationProtectionPercent", "Inflation Protection", { default: 3, max: 10, step: 0.5, required: false }),
      numberField("benefitYears", "Policy Benefit Period (Years)", { default: 3, min: 0, max: 20, step: 1 }),
      currencyField("yearlyPremium", "Yearly Premium", { default: 3000, max: 1000000, step: 100 }),
      numberField("yearsPaying", "Years Paying Premiums", { default: 20, min: 0, max: 60, step: 1 }),
    ],
    calcResult: { label: "Monthly Gap", format: "currency" },
    calcResults: [
      { key: "futureMonthlyCareCost", label: "Future Monthly Care Cost", format: "currency" },
      { key: "futureMonthlyBenefit", label: "Future Monthly Benefit", format: "currency" },
      { key: "monthlyGap", label: "Monthly Gap", format: "currency", highlight: true },
      { key: "totalCareCost", label: "Total Cost of Care", format: "currency" },
      { key: "totalPolicyBenefits", label: "Total Policy Benefits", format: "currency" },
      { key: "totalPremiums", label: "Total Premiums", format: "currency" },
    ],
    instructions:
      "Most people over 65 will need some long-term care, and Medicare doesn't cover custodial care. Long-term care " +
      "insurance pays a daily or monthly benefit for home care, assisted living or a nursing home. Inflation protection " +
      "matters most if you buy decades before you'd need care. Hybrid life/LTC policies avoid \"use it or lose it\".\n\n" +
      "Look up current care costs in your area to set today's monthly cost.",
    examples:
      "Example: care costing $6,000 a month today, rising 4% a year, could cost " +
      "$13,146.74 in 20 years. A $5,000 policy with 3% " +
      "protection would pay $9,030.56 — a $4,116.18 monthly gap.",
    assumptions:
      "Premiums for traditional LTC policies can rise with regulator approval. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When should I buy long-term care insurance?",
        answer: "Many people look in their 50s or early 60s — premiums rise with age and health problems can make you ineligible.",
      },
    ],
  },
  {
    slug: "critical-illness-insurance-calculator",
    title: "Critical Illness Insurance Calculator",
    description: "Estimate whether a critical illness policy's lump sum would cover the real cost of a serious diagnosis — out-of-pocket medical bills, other costs and lost income.",
    metaTitle: "Critical Illness Insurance Calculator — Coverage Needed",
    metaDescription: "Free critical illness insurance calculator. Compare the lump-sum benefit with medical bills, other costs and lost income after a diagnosis.",
    calcInputs: [
      currencyField("lumpSum", "Lump-Sum Benefit", { default: 25000, max: 10000000, step: 1000 }),
      currencyField("monthlyPremium", "Monthly Premium", { default: 30, max: 10000, step: 1 }),
      currencyField("medicalOutOfPocket", "Medical Out-of-Pocket (Deductible, Coinsurance)", { default: 8000, max: 1000000, step: 500 }),
      currencyField("otherCosts", "Travel, Childcare & Other Costs", { default: 3000, max: 1000000, step: 500, required: false }),
      numberField("monthsOffWork", "Months Off Work Unpaid", { default: 3, min: 0, max: 60, step: 1, required: false }),
      currencyField("monthlyIncome", "Monthly Take-Home Pay", { default: 5000, max: 1000000, step: 100, required: false }),
      numberField("yearsPaying", "Years Paying Premiums", { default: 20, min: 0, max: 60, step: 1 }),
    ],
    calcResult: { label: "Remaining Gap", format: "currency" },
    calcResults: [
      { key: "totalFinancialImpact", label: "Total Financial Impact", format: "currency" },
      { key: "coveredByLumpSum", label: "Covered by the Lump Sum", format: "currency" },
      { key: "remainingGap", label: "Remaining Gap", format: "currency", highlight: true },
      { key: "yearlyPremium", label: "Yearly Premium", format: "currency" },
      { key: "totalPremiums", label: "Total Premiums", format: "currency" },
    ],
    instructions:
      "Critical illness insurance pays a lump sum if you're diagnosed with a covered condition such as cancer, heart attack " +
      "or stroke. You can use it for anything: medical bills your health plan doesn't cover, travel for treatment, or " +
      "replacing lost income.\n\n" +
      "It's not a substitute for health or disability insurance; an emergency fund and disability coverage may do the same " +
      "job more broadly.",
    examples:
      "Example: a serious illness with $8,000 of medical costs, $3,000 of other costs and 3 months " +
      "unpaid would cost $26,000. A $25,000 policy covers $25,000, leaving $1,000.",
    assumptions:
      "Diagnosis must meet the policy's definitions; many pay a reduced amount for early-stage conditions. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is critical illness insurance worth it?",
        answer: "It helps most if you have a high-deductible plan, little savings, or a family history of covered illnesses. Read which conditions are covered and any waiting period.",
      },
    ],
  },
  {
    slug: "medicare-supplement-insurance-calculator",
    title: "Medicare Supplement Insurance Calculator",
    description: "Compare the yearly cost of Original Medicare with a Medigap (Medicare Supplement) plan and Part D against a Medicare Advantage plan, in a typical and a worst-case year.",
    metaTitle: "Medicare Supplement Calculator — Medigap vs Advantage",
    metaDescription: "Free Medicare Supplement calculator. Compare Medigap plus Part D with Medicare Advantage, for an expected year and a worst case.",
    calcInputs: [
      currencyField("partB", "Part B Premium per Month", { default: 202.9, max: 2000, step: 0.1 }),
      currencyField("partBDeductible", "Part B Deductible per Year", { default: 283, max: 2000, step: 1 }),
      currencyField("medigapMonthly", "Medigap (e.g., Plan G) Premium per Month", { default: 160, max: 2000, step: 1 }),
      currencyField("partDMonthly", "Part D Premium per Month", { default: 40, max: 1000, step: 1, required: false }),
      currencyField("advantageMonthly", "Medicare Advantage Premium per Month", { default: 0, max: 2000, step: 1, required: false }),
      currencyField("advantageExpectedCopays", "Expected Advantage Copays per Year", { default: 1500, max: 100000, step: 50 }),
      currencyField("advantageOopMax", "Advantage Out-of-Pocket Max", { default: 5500, max: 20000, step: 50 }),
    ],
    calcResult: { label: "Medigap Savings in a Worst Case", format: "currency" },
    calcResults: [
      { key: "medigapYearlyCost", label: "Original Medicare + Medigap + Part D", format: "currency" },
      { key: "advantageExpectedYearlyCost", label: "Medicare Advantage (Expected Year)", format: "currency" },
      { key: "advantageWorstCase", label: "Medicare Advantage (Worst Case)", format: "currency" },
      { key: "advantageSavingsExpected", label: "Advantage Savings in an Expected Year", format: "currency" },
      { key: "medigapSavingsWorstCase", label: "Medigap Savings in a Worst Case", format: "currency", highlight: true },
    ],
    instructions:
      "With Original Medicare, a Medigap plan covers most of what Medicare doesn't — Plan G leaves only the Part B " +
      "deductible ($283 in 2026) — and you add a Part D drug plan. Medicare Advantage bundles coverage, often with a low " +
      "premium, but charges copays up to a yearly out-of-pocket maximum and uses networks.\n\n" +
      "The standard Part B premium is $202.90 a month for 2026 (higher with high income). Medigap is easiest to buy in your " +
      "6-month open enrollment period after 65, when insurers can't price on health.",
    examples:
      "Example: Part B, a $160 Medigap plan and Part D cost $5,117.80 a year. Medicare Advantage costs about " +
      "$3,934.80 in a typical year but up to $7,934.80 in a bad one — so Medigap saves " +
      "$2,817 in a worst case.",
    assumptions:
      "Part D drug costs beyond the premium not included; Advantage plans may include drug coverage. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I switch from Medicare Advantage to Medigap later?",
        answer: "You can change Medicare coverage each fall, but outside your initial window most states let Medigap insurers deny you or charge more based on health.",
      },
    ],
  },
  {
    slug: "international-health-insurance-calculator",
    title: "International Health Insurance Calculator",
    description: "Estimate the yearly cost of international (expat) health insurance — with or without US coverage, for you and your dependants — plus expected out-of-pocket costs.",
    metaTitle: "International Health Insurance Calculator — Expat Cost",
    metaDescription: "Free international health insurance calculator. Estimate expat health premiums with or without US coverage, dependants and out-of-pocket costs.",
    calcInputs: [
      currencyField("basePremium", "Your Yearly Premium Excl. US (From a Quote)", { default: 4000, max: 1000000, step: 100 }),
      {
        key: "includeUS", label: "Include Coverage in the US?", type: "dropdown", required: true, default: 0,
        options: [
          { label: "No — Worldwide Excluding US", value: 0 },
          { label: "Yes — Worldwide Including US", value: 1 },
        ],
      },
      percentField("usLoadingPercent", "Extra Cost to Include the US", { default: 60, max: 300, step: 5 }),
      numberField("dependents", "Dependants", { default: 2, min: 0, max: 10, step: 1, required: false }),
      percentField("dependentSharePercent", "Each Dependant's Cost vs Yours", { default: 50, max: 150, step: 5 }),
      currencyField("deductible", "Deductible", { default: 1000, max: 100000, step: 100 }),
      currencyField("expectedCosts", "Expected Medical Costs per Year", { default: 2000, max: 1000000, step: 100 }),
    ],
    calcResult: { label: "Total Yearly Cost", format: "currency" },
    calcResults: [
      { key: "yourYearlyPremium", label: "Your Yearly Premium", format: "currency" },
      { key: "familyYearlyPremium", label: "Family Yearly Premium", format: "currency" },
      { key: "expectedOutOfPocket", label: "Expected Out-of-Pocket", format: "currency" },
      { key: "totalYearlyCost", label: "Total Yearly Cost", format: "currency", highlight: true },
      { key: "monthlyCost", label: "Monthly Cost", format: "currency" },
    ],
    instructions:
      "International health insurance covers expats and long-term travelers across countries, unlike travel insurance " +
      "(short trips) or a local national plan. Including the US, where care is most expensive, typically raises the premium " +
      "by half or more. Premiums rise with age and area of coverage.\n\n" +
      "Get a quote for your age and area, then adjust coverage options here.",
    examples:
      "Example: a $4,000 policy excluding the US, for you and 2 dependants, costs $8,000 a year. " +
      "Adding expected out-of-pocket costs of $1,000, the total is $9,000 — about $750 a month.",
    assumptions:
      "Costs above the deductible fully covered. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do US expats still need US health insurance?",
        answer: "The ACA penalty is gone federally, so there's no federal requirement, but you'll want coverage for trips home. Medicare doesn't cover care abroad.",
      },
    ],
  },
  {
    slug: "marketplace-health-insurance-subsidy-calculator",
    title: "Marketplace Health Insurance Subsidy Calculator",
    description: "Estimate your ACA marketplace premium tax credit for 2026 from your income and household size, and what you'd pay each month for the plan you choose.",
    metaTitle: "ACA Subsidy Calculator 2026 — Premium Tax Credit",
    metaDescription: "Free marketplace subsidy calculator. Estimate your 2026 ACA premium tax credit from income and household size, and your net monthly premium.",
    calcInputs: [
      currencyField("income", "Expected Household Income (MAGI)", { default: 55000, max: 10000000, step: 500 }),
      numberField("householdSize", "Household Size", { default: 2, min: 1, max: 12, step: 1 }),
      currencyField("benchmarkMonthly", "Benchmark (Second-Lowest Silver) Premium per Month", { default: 1100, max: 100000, step: 10 }),
      currencyField("chosenPlanMonthly", "Chosen Plan's Full Premium per Month", { default: 950, max: 100000, step: 10 }),
      currencyField("povertyBase", "Poverty Guideline (1 Person)", { default: 15650, max: 100000, step: 10 }),
    ],
    calcResult: { label: "Your Monthly Premium", format: "currency" },
    calcResults: [
      { key: "percentOfPovertyLevel", label: "Income as % of Poverty Level", format: "percentage" },
      { key: "expectedContributionPercent", label: "Expected Contribution (% of Income)", format: "percentage" },
      { key: "yearlyPremiumTaxCredit", label: "Yearly Premium Tax Credit", format: "currency" },
      { key: "monthlyPremiumTaxCredit", label: "Monthly Premium Tax Credit", format: "currency" },
      { key: "yourMonthlyPremium", label: "Your Monthly Premium", format: "currency", highlight: true },
    ],
    instructions:
      "The premium tax credit caps what you pay for the benchmark silver plan at a share of your income. For 2026, with the " +
      "temporary enhanced credits having expired after 2025, the share runs from 2.10% to 9.96% of income, and households " +
      "above 400% of the federal poverty level get no credit at all. 2026 coverage uses the 2025 poverty guidelines ($15,650 " +
      "for one person, plus $5,500 per extra person in the 48 states).\n\n" +
      "Find the benchmark premium for your household on HealthCare.gov. If Congress changes the rules, the subsidy will differ.",
    examples:
      "Example: a household of 2 with $55,000 of income is at 260.05% of the poverty level and is " +
      "expected to pay 8.75% of income. The credit is $699.17 a month, so a " +
      "$950 plan costs $250.83.",
    assumptions:
      "Advance credit equals the final credit; differences are reconciled on your tax return. Alaska and Hawaii have higher " +
      "poverty levels. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if my income changes during the year?",
        answer: "Update your marketplace application. If your income ends up higher, you may have to repay some of the advance credit at tax time.",
      },
    ],
  },
  {
    slug: "self-employed-health-insurance-cost-calculator",
    title: "Self-Employed Health Insurance Cost Calculator",
    description: "See the real cost of health insurance when you're self-employed after the self-employed health insurance deduction and HSA tax savings.",
    metaTitle: "Self-Employed Health Insurance Cost Calculator",
    metaDescription: "Free self-employed health insurance calculator. See your net premium after the self-employed health insurance deduction and HSA savings.",
    calcInputs: [
      currencyField("yearlyPremium", "Health Insurance Premiums per Year", { default: 9600, max: 1000000, step: 100 }),
      currencyField("netProfit", "Net Self-Employment Profit", { default: 70000, max: 100000000, step: 1000 }),
      percentField("federalRatePercent", "Federal Tax Bracket", { default: 22, max: 37, step: 1 }),
      percentField("stateRatePercent", "State Tax Rate", { default: 5, max: 15, step: 0.5, required: false }),
      currencyField("hsaContribution", "HSA Contribution (If HSA-Eligible Plan)", { default: 4400, max: 20000, step: 100, required: false }),
    ],
    calcResult: { label: "Net Monthly Cost", format: "currency" },
    calcResults: [
      { key: "deductiblePremiums", label: "Deductible Premiums", format: "currency" },
      { key: "taxSavingsOnPremiums", label: "Tax Savings on Premiums", format: "currency" },
      { key: "netPremiumCost", label: "Net Premium Cost per Year", format: "currency" },
      { key: "netMonthlyCost", label: "Net Monthly Cost", format: "currency", highlight: true },
      { key: "hsaTaxSavings", label: "Extra Tax Savings From the HSA", format: "currency" },
    ],
    instructions:
      "Self-employed people can deduct health, dental and qualified long-term care premiums for themselves and their family " +
      "as an adjustment to income, up to their net self-employment profit — even without itemizing. You can't take it for " +
      "months you were eligible for an employer plan (including a spouse's). It doesn't reduce self-employment tax.\n\n" +
      "An HSA-eligible plan adds a further deduction for HSA contributions.",
    examples:
      "Example: $9,600 of premiums is fully deductible against $70,000 of profit, saving $2,592 in " +
      "federal and state tax — a net cost of $7,008, or $584 a month. An HSA saves another $1,188.",
    assumptions:
      "Flat marginal rates; premium tax credits (if any) reduce the deductible amount. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I deduct premiums if I get a marketplace subsidy?",
        answer: "Only the part you actually pay, not the part covered by the premium tax credit.",
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
