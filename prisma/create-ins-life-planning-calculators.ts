// One-time (but safe to re-run) batch setup script: creates the Life Insurance Planning tools
// (6) of the Insurance Calculators expansion, filed under Insurance Calculators >
// Life Insurance Calculators (both categories are created on first run).
// See src/lib/calc-engine-ins-life-planning.ts for the math and
// src/lib/calc-engine-ins-life-core.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-ins-life-planning-calculators.ts
// or
//   npm run db:create-ins-life-planning-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Insurance Calculators", slug: "insurance-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Life Insurance Calculators", slug: "life-insurance-calculators" };

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
    slug: "key-person-life-insurance-calculator",
    title: "Key Person Life Insurance Calculator",
    description: "Estimate how much key person life insurance a business needs: profit lost while replacing an essential employee or owner, recruiting costs, and the salary-multiple rule.",
    metaTitle: "Key Person Insurance Calculator — Coverage Amount",
    metaDescription: "Free key person insurance calculator. Estimate coverage from lost profit while replacing a key employee, hiring costs and salary multiples.",
    calcInputs: [
      currencyField("salary", "Key Person's Salary", { default: 150000, max: 100000000, step: 1000 }),
      currencyField("revenueAttributed", "Yearly Revenue They Generate", { default: 600000, max: 10000000000, step: 10000 }),
      percentField("profitMarginPercent", "Profit Margin on That Revenue", { default: 25, max: 100, step: 1 }),
      numberField("replacementMonths", "Months to Replace Them", { default: 12, min: 0, max: 60, step: 1 }),
      percentField("recruitingPercent", "Recruiting & Training Cost (% of Salary)", { default: 30, max: 200, step: 5 }),
      numberField("salaryMultiple", "Salary Multiple Rule", { default: 5, min: 0, max: 20, step: 1 }),
    ],
    calcResult: { label: "Suggested Coverage", format: "currency" },
    calcResults: [
      { key: "lostProfitWhileReplacing", label: "Profit Lost While Replacing", format: "currency" },
      { key: "recruitingAndTrainingCost", label: "Recruiting & Training Cost", format: "currency" },
      { key: "coverageByContribution", label: "Coverage by Contribution Method", format: "currency" },
      { key: "coverageBySalaryMultiple", label: "Coverage by Salary Multiple", format: "currency" },
      { key: "suggestedCoverage", label: "Suggested Coverage", format: "currency", highlight: true },
    ],
    instructions:
      "Key person insurance is a life policy the business owns on an essential owner or employee, paying the business if " +
      "they die. Size it by the profit the business would lose until a replacement is up to speed plus hiring costs, or by " +
      "a rule of thumb of 5–10 times the person's salary. Insurers usually cap coverage at a multiple of compensation.\n\n" +
      "Premiums aren't tax-deductible, but the death benefit is generally tax-free to the business (with proper notice and " +
      "consent under IRC 101(j)).",
    examples:
      "Example: someone earning $150,000 who brings in $600,000 at a 25% margin would cost " +
      "$150,000 in lost profit over 12 months, plus $45,000 to hire. The " +
      "5x salary rule suggests $750,000.",
    assumptions:
      "Revenue lost evenly while the position is vacant. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can key person insurance fund a buy-sell agreement?",
        answer: "Separate life policies are usually used to fund buy-sell agreements, but the same idea applies: cover the value the business or owners would need to pay out.",
      },
    ],
  },
  {
    slug: "annuity-vs-life-insurance-calculator",
    title: "Annuity vs Life Insurance Calculator",
    description: "Compare turning savings into a lifetime annuity — optionally buying life insurance to replace the legacy — with keeping the money invested for income and heirs.",
    metaTitle: "Annuity vs Life Insurance Calculator — Income & Legacy",
    metaDescription: "Free annuity vs life insurance calculator. Compare lifetime annuity income plus a life policy with keeping savings invested for income and heirs.",
    calcInputs: [
      currencyField("amount", "Savings to Use", { default: 200000, max: 100000000, step: 5000 }),
      percentField("payoutRatePercent", "Annuity Payout Rate (From a Quote)", { default: 7, max: 20, step: 0.1 }),
      currencyField("lifePremium", "Life Insurance Premium per Year", { default: 4000, max: 1000000, step: 100, required: false }),
      currencyField("lifeDeathBenefit", "Life Insurance Death Benefit", { default: 200000, max: 100000000, step: 5000, required: false }),
      percentField("investedYieldPercent", "Income Yield If Kept Invested", { default: 4.5, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Extra Income vs Investing", format: "currency" },
    calcResults: [
      { key: "annuityIncome", label: "Annuity Income per Year", format: "currency" },
      { key: "netIncomeAfterLifePremium", label: "Income After Life Premium", format: "currency" },
      { key: "legacyWithLifePolicy", label: "Legacy With Life Policy", format: "currency" },
      { key: "incomeIfInvested", label: "Income If Kept Invested", format: "currency" },
      { key: "legacyIfInvested", label: "Legacy If Kept Invested", format: "currency" },
      { key: "extraIncomeVsInvesting", label: "Extra Income vs Investing", format: "currency", highlight: true },
    ],
    instructions:
      "A life annuity pays guaranteed income for life, often more than you'd safely draw from investments, but the money " +
      "is gone at death. Life insurance does the opposite — it pays at death. Pairing them (an annuity for income, a life " +
      "policy to leave the same legacy) can give more income than investing, if you're healthy enough to get affordable " +
      "life insurance.\n\n" +
      "Get annuity payout rates for your age from insurer quotes.",
    examples:
      "Example: $200,000 in an annuity paying 7% gives $14,000 a year. Spending $4,000 on a " +
      "$200,000 life policy leaves $10,000 with the same legacy — $1,000 more " +
      "than the $9,000 from keeping it invested.",
    assumptions:
      "Investments keep their value; annuity payments taxed partly as return of principal (not shown). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens to an annuity when I die?",
        answer: "A straight life annuity stops. Options like a period certain or cash refund continue payments to heirs, at a lower payout rate.",
      },
    ],
  },
  {
    slug: "insurance-rider-cost-calculator",
    title: "Insurance Rider Cost Calculator",
    description: "Add up the cost of life insurance riders — waiver of premium, accidental death, child term and return of premium — per year and over the policy term.",
    metaTitle: "Insurance Rider Cost Calculator — Life Policy Add-Ons",
    metaDescription: "Free insurance rider calculator. See what waiver of premium, accidental death, child term and return-of-premium riders add to your policy.",
    calcInputs: [
      currencyField("basePremium", "Base Annual Premium", { default: 600, max: 1000000, step: 10 }),
      percentField("waiverPercent", "Waiver of Premium (% of Base)", { default: 6, max: 30, step: 0.5, required: false }),
      currencyField("adbCoverage", "Accidental Death Benefit Amount", { default: 250000, max: 10000000, step: 10000, required: false }),
      currencyField("adbRatePer1000", "Accidental Death Rate per $1,000", { default: 0.6, max: 10, step: 0.05, required: false }),
      currencyField("childRider", "Child Term Rider per Year", { default: 60, max: 10000, step: 5, required: false }),
      percentField("ropPercent", "Return of Premium Rider (% of Base)", { default: 0, max: 300, step: 5, required: false }),
      numberField("termYears", "Policy Term (Years)", { default: 20, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Riders per Year", format: "currency" },
    calcResults: [
      { key: "ridersPerYear", label: "Riders per Year", format: "currency", highlight: true },
      { key: "ridersShareOfPremium", label: "Riders as % of Base Premium", format: "percentage" },
      { key: "totalAnnualPremium", label: "Total Annual Premium", format: "currency" },
      { key: "ridersOverTerm", label: "Riders Over the Term", format: "currency" },
      { key: "totalOverTerm", label: "Total Over the Term", format: "currency" },
    ],
    instructions:
      "Riders add coverage to a life policy for an extra cost. Waiver of premium keeps the policy going if you become " +
      "disabled; accidental death pays extra if death is accidental; a child term rider covers your children; return of " +
      "premium refunds premiums if you outlive a term policy — but often doubles or triples its cost. Accelerated death " +
      "benefit riders are usually included free.\n\n" +
      "Enter each rider's price from your quote; leave unused riders at zero.",
    examples:
      "Example: on a $600 base premium, waiver of premium, $250,000 of accidental death cover and a child rider add " +
      "$246 a year — 41% more — for $846 a year and $4,920 in riders over " +
      "20 years.",
    assumptions:
      "Rider prices stay level. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is accidental death coverage worth it?",
        answer: "Usually not as your main protection — most deaths aren't accidental. Buying more regular term coverage is often better value.",
      },
    ],
  },
  {
    slug: "term-life-insurance-ladder-strategy-calculator",
    title: "Term Life Insurance Ladder Strategy Calculator",
    description: "Compare a term life ladder — 30-, 20- and 10-year policies stacked together — with one large 30-year policy, by coverage over time and total premiums.",
    metaTitle: "Term Life Ladder Calculator — Laddering vs One Policy",
    metaDescription: "Free term life ladder calculator. Compare stacked 10-, 20- and 30-year policies with one 30-year policy by coverage and total premiums.",
    calcInputs: [
      currencyField("coverage30", "30-Year Policy Coverage", { default: 500000, max: 100000000, step: 50000 }),
      currencyField("rate30", "30-Year Rate per $1,000", { default: 0.9, max: 100, step: 0.01 }),
      currencyField("coverage20", "20-Year Policy Coverage", { default: 300000, max: 100000000, step: 50000, required: false }),
      currencyField("rate20", "20-Year Rate per $1,000", { default: 0.6, max: 100, step: 0.01, required: false }),
      currencyField("coverage10", "10-Year Policy Coverage", { default: 200000, max: 100000000, step: 50000, required: false }),
      currencyField("rate10", "10-Year Rate per $1,000", { default: 0.4, max: 100, step: 0.01, required: false }),
    ],
    calcResult: { label: "Ladder Savings", format: "currency" },
    calcResults: [
      { key: "totalCoverageToday", label: "Total Coverage Today", format: "currency" },
      { key: "ladderPremiumFirst10Years", label: "Ladder Premium per Year (First 10 Years)", format: "currency" },
      { key: "coverageYears11To20", label: "Coverage in Years 11–20", format: "currency" },
      { key: "coverageYears21To30", label: "Coverage in Years 21–30", format: "currency" },
      { key: "ladderTotalPremiums", label: "Ladder Total Premiums", format: "currency" },
      { key: "singlePolicyTotalPremiums", label: "One 30-Year Policy Total Premiums", format: "currency" },
      { key: "ladderSavings", label: "Ladder Savings", format: "currency", highlight: true },
    ],
    instructions:
      "Your need for life insurance usually shrinks over time as the mortgage falls, children grow up and savings build. A " +
      "ladder matches that: several term policies with different lengths, so coverage steps down as each expires — and you " +
      "don't pay for coverage you no longer need.\n\n" +
      "Get rates per $1,000 for each term from a quote.",
    examples:
      "Example: $500,000 for 30 years, $300,000 for 20 and $200,000 for 10 gives $1,000,000 of coverage now, " +
      "stepping down to $800,000 and then $500,000. It costs $17,900 in total versus " +
      "$27,000 for one 30-year policy — saving $9,100.",
    assumptions:
      "Level premiums; each policy fee counted in its rate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I still need coverage later?",
        answer: "Many term policies can be converted to permanent insurance without a medical exam before a set age — check the conversion terms.",
      },
    ],
  },
  {
    slug: "second-to-die-life-insurance-calculator",
    title: "Second-to-Die Life Insurance Calculator",
    description: "Estimate the estate tax heirs could owe after both spouses die, the liquidity gap a survivorship (second-to-die) policy would fill, and the premiums to cover it.",
    metaTitle: "Second-to-Die Insurance Calculator — Estate Tax Gap",
    metaDescription: "Free second-to-die life insurance calculator. Estimate estate tax after both spouses die, the liquidity gap and survivorship premiums.",
    calcInputs: [
      currencyField("estateValue", "Estate Value at the Second Death", { default: 40000000, max: 100000000000, step: 500000 }),
      currencyField("exemptionPerPerson", "Estate Tax Exemption per Person", { default: 15000000, max: 100000000, step: 100000 }),
      percentField("estateTaxRatePercent", "Estate Tax Rate", { default: 40, max: 60, step: 1 }),
      currencyField("liquidAssets", "Liquid Assets Available", { default: 1500000, max: 10000000000, step: 50000, required: false }),
      currencyField("annualPremium", "Survivorship Policy Premium per Year", { default: 30000, max: 100000000, step: 1000, required: false }),
      numberField("yearsPaying", "Years Paying Premiums", { default: 20, min: 0, max: 60, step: 1 }),
    ],
    calcResult: { label: "Liquidity Gap", format: "currency" },
    calcResults: [
      { key: "taxableEstate", label: "Taxable Estate", format: "currency" },
      { key: "estimatedEstateTax", label: "Estimated Estate Tax", format: "currency" },
      { key: "liquidityGap", label: "Liquidity Gap", format: "currency", highlight: true },
      { key: "totalPremiums", label: "Total Premiums", format: "currency" },
      { key: "premiumsAsShareOfCoverage", label: "Premiums as % of the Gap", format: "percentage" },
    ],
    instructions:
      "A second-to-die (survivorship) policy insures two people and pays when the second dies — usually when estate tax is " +
      "due, since the unlimited marital deduction defers it until then. It's typically cheaper than two separate policies. " +
      "For 2026, each person can pass $15 million free of federal estate tax, and a surviving spouse can use the unused " +
      "exemption (portability) — $30 million for a couple, indexed for inflation.\n\n" +
      "Owning the policy in an irrevocable life insurance trust keeps the payout out of the estate.",
    examples:
      "Example: a $40,000,000 estate with two $15,000,000 exemptions has $10,000,000 taxable, owing about " +
      "$4,000,000. With $1,500,000 of liquid assets, heirs face a $2,500,000 gap — the coverage to consider.",
    assumptions:
      "Federal estate tax only; some states have their own estate or inheritance tax at much lower thresholds. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why not just sell assets to pay the tax?",
        answer: "Estate tax is due nine months after death; selling a business, farm or real estate quickly can mean a low price. Insurance provides cash on time.",
      },
    ],
  },
  {
    slug: "whole-vs-term-life-insurance-cost-comparison-calculator",
    title: "Whole vs Term Life Insurance Cost Comparison Calculator",
    description: "Compare whole life insurance with buying cheaper term insurance and investing the difference — total premiums, whole life cash value and the invested balance.",
    metaTitle: "Whole vs Term Life Calculator — Buy Term, Invest the Rest",
    metaDescription: "Free whole vs term life calculator. Compare whole life cash value with buying term and investing the premium difference.",
    calcInputs: [
      currencyField("termPremium", "Term Life Premium per Year", { default: 400, max: 1000000, step: 10 }),
      currencyField("wholePremium", "Whole Life Premium per Year", { default: 4500, max: 1000000, step: 50 }),
      numberField("years", "Years", { default: 30, min: 1, max: 60, step: 1 }),
      percentField("investReturnPercent", "Return on Invested Difference", { default: 7, min: -10, max: 20, step: 0.25 }),
      percentField("wholeCreditedSharePercent", "Whole Life Premium Credited to Cash Value", { default: 70, max: 100, step: 5 }),
      percentField("wholeGrowthPercent", "Whole Life Cash Value Growth", { default: 4, min: 0, max: 10, step: 0.25 }),
    ],
    calcResult: { label: "Buy-Term Advantage", format: "currency" },
    calcResults: [
      { key: "termTotalPremiums", label: "Term Total Premiums", format: "currency" },
      { key: "wholeTotalPremiums", label: "Whole Life Total Premiums", format: "currency" },
      { key: "investedDifferenceValue", label: "Invested Difference Value", format: "currency" },
      { key: "wholeLifeCashValue", label: "Whole Life Cash Value", format: "currency" },
      { key: "buyTermAdvantage", label: "Buy-Term Advantage", format: "currency", highlight: true },
    ],
    instructions:
      "\"Buy term and invest the difference\" compares putting the money saved by choosing term into investments with the " +
      "cash value a whole life policy builds. It usually comes out ahead if you actually invest the difference every year — " +
      "but whole life offers lifelong coverage, guarantees and tax-deferred growth.\n\n" +
      "After the term ends you have no coverage but keep the investments; whole life's death benefit continues.",
    examples:
      "Example: term at $400 versus whole life at $4,500 a year for 30 years. Investing the difference at " +
      "7% grows to $414,399.47, against $173,517.55 of whole life cash value — a " +
      "$240,881.92 advantage for buying term.",
    assumptions:
      "Investments taxed only at the end (not shown); whole life model is simplified. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When does whole life make more sense?",
        answer: "For lifelong needs — estate liquidity, a dependent with special needs, or a business purpose — or for people who won't reliably invest on their own.",
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
