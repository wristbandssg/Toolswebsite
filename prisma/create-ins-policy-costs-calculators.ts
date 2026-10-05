// One-time (but safe to re-run) batch setup script: creates the Policy Costs & Claims tools
// (7) of the Insurance Calculators expansion, filed under Insurance Calculators >
// Home & Property Insurance Calculators (both categories are created on first run).
// See src/lib/calc-engine-ins-policy-costs.ts for the math and
// src/lib/calc-engine-ins-life-core.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-ins-policy-costs-calculators.ts
// or
//   npm run db:create-ins-policy-costs-calculators

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
    slug: "premium-vs-deductible-calculator",
    title: "Premium vs Deductible Calculator",
    description: "Compare a low-deductible and a high-deductible insurance quote: what the higher deductible saves each year, what it costs per claim, and which is cheaper on average.",
    metaTitle: "Premium vs Deductible Calculator — Which Deductible to Pick",
    metaDescription: "Free premium vs deductible calculator. Compare two deductibles: yearly savings, break-even years and expected cost with your claim odds.",
    calcInputs: [
      currencyField("lowDeductible", "Lower Deductible", { default: 500, max: 100000, step: 100 }),
      currencyField("lowDeductiblePremium", "Yearly Premium with Lower Deductible", { default: 1500, max: 100000, step: 50 }),
      currencyField("highDeductible", "Higher Deductible", { default: 1000, max: 100000, step: 100 }),
      currencyField("highDeductiblePremium", "Yearly Premium with Higher Deductible", { default: 1250, max: 100000, step: 50 }),
      percentField("claimChancePercent", "Chance of a Claim per Year", { default: 10, max: 100, step: 1 }),
    ],
    calcResult: { label: "Expected Yearly Savings with the Higher Deductible", format: "currency" },
    calcResults: [
      { key: "yearlyPremiumSavings", label: "Yearly Premium Savings", format: "currency" },
      { key: "extraOutOfPocketPerClaim", label: "Extra Out-of-Pocket per Claim", format: "currency" },
      { key: "breakEvenYears", label: "Claim-Free Years to Break Even", format: "number" },
      { key: "expectedYearlyCostLow", label: "Expected Yearly Cost (Lower Deductible)", format: "currency" },
      { key: "expectedYearlyCostHigh", label: "Expected Yearly Cost (Higher Deductible)", format: "currency" },
      { key: "expectedSavingsWithHigh", label: "Expected Savings with Higher Deductible", format: "currency", highlight: true },
    ],
    instructions:
      "A higher deductible lowers your premium, but you pay more when you claim. If you'd go a few years between claims " +
      "and can cover the higher deductible from savings, the higher deductible usually wins.\n\n" +
      "Break-even years = extra deductible ÷ yearly premium savings. Expected cost = premium + deductible × chance of a claim. " +
      "Get both quotes from the same insurer for the same coverage.",
    examples:
      "Example: raising the deductible from $500 to $1,000 saves $250 a year, so it pays off after " +
      "2 claim-free years. With a 10% yearly chance of a claim, the higher deductible saves " +
      "$200 a year on average.",
    assumptions:
      "At most one claim per year, each at least as large as the higher deductible. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What deductible should I choose?",
        answer: "The highest one you could pay tomorrow without strain — insurance is best used for losses you can't absorb.",
      },
    ],
  },
  {
    slug: "insurance-claim-payout-calculator",
    title: "Insurance Claim Payout Calculator",
    description: "Estimate what an insurance claim pays under a replacement cost policy vs an actual cash value (ACV) policy, after depreciation and your deductible.",
    metaTitle: "Insurance Claim Payout Calculator — ACV vs Replacement Cost",
    metaDescription: "Free insurance claim payout calculator. Compare actual cash value vs replacement cost payouts after depreciation and your deductible.",
    calcInputs: [
      currencyField("replacementCost", "Cost to Replace New", { default: 5000, max: 10000000, step: 100 }),
      numberField("ageYears", "Age of the Item (Years)", { default: 4, min: 0, max: 100, step: 0.5 }),
      numberField("usefulLifeYears", "Typical Useful Life (Years)", { default: 10, min: 1, max: 100, step: 1 }),
      currencyField("deductible", "Deductible", { default: 1000, max: 100000, step: 100 }),
      {
        key: "policyType", label: "Your Policy Pays", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Replacement Cost", value: 1 },
          { label: "Actual Cash Value (ACV)", value: 2 },
        ],
      },
    ],
    calcResult: { label: "Your Payout", format: "currency" },
    calcResults: [
      { key: "depreciation", label: "Depreciation", format: "currency" },
      { key: "actualCashValue", label: "Actual Cash Value", format: "currency" },
      { key: "replacementCostPayout", label: "Replacement Cost Payout", format: "currency" },
      { key: "actualCashValuePayout", label: "ACV Payout", format: "currency" },
      { key: "yourPayout", label: "Your Payout", format: "currency", highlight: true },
      { key: "differenceBetweenPolicies", label: "Difference Between the Two", format: "currency" },
    ],
    instructions:
      "Actual cash value (ACV) policies pay what the item was worth when it was lost — the cost to replace it minus " +
      "depreciation for age and wear. Replacement cost policies pay what it costs to buy a new equivalent. Both subtract your deductible.\n\n" +
      "Many replacement cost policies pay ACV first and the rest (the \"holdback\") once you actually replace the item, " +
      "usually within a time limit.",
    examples:
      "Example: a 4-year-old item that costs $5,000 to replace has lost $2,000 to depreciation. " +
      "After a $1,000 deductible, replacement cost pays $4,000 and ACV pays $2,000 — " +
      "a $2,000 difference.",
    assumptions:
      "Straight-line depreciation over the useful life; insurers use their own depreciation tables. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is replacement cost coverage worth the extra premium?",
        answer: "Usually, for home contents and roofs — older items can depreciate to a fraction of what replacing them costs.",
      },
    ],
  },
  {
    slug: "insurance-claim-vs-out-of-pocket-calculator",
    title: "Should I File an Insurance Claim Calculator",
    description: "Decide whether to file an insurance claim or pay out of pocket: the payout after your deductible vs the premium increase and lost no-claims discount afterwards.",
    metaTitle: "Should I File an Insurance Claim Calculator — Claim or Pay",
    metaDescription: "Free calculator: should you file an insurance claim? Compare the payout with the premium surcharge and lost no-claims discount.",
    calcInputs: [
      currencyField("damage", "Cost of the Damage", { default: 2500, max: 10000000, step: 100 }),
      currencyField("deductible", "Deductible", { default: 1000, max: 100000, step: 100 }),
      currencyField("yearlyPremium", "Current Yearly Premium", { default: 1800, max: 100000, step: 50 }),
      percentField("surchargePercent", "Premium Increase After a Claim", { default: 20, max: 200, step: 1 }),
      percentField("noClaimsDiscountPercent", "No-Claims Discount You Would Lose", { default: 0, max: 100, step: 1, required: false }),
      numberField("years", "Years the Increase Lasts", { default: 3, min: 0, max: 10, step: 1 }),
    ],
    calcResult: { label: "Net Benefit of Claiming", format: "currency" },
    calcResults: [
      { key: "claimPayout", label: "Claim Payout", format: "currency" },
      { key: "futurePremiumIncrease", label: "Future Premium Increase", format: "currency" },
      { key: "costIfYouClaim", label: "Your Total Cost If You Claim", format: "currency" },
      { key: "costIfYouPayYourself", label: "Your Cost If You Pay Yourself", format: "currency" },
      { key: "netBenefitOfClaiming", label: "Net Benefit of Claiming", format: "currency", highlight: true },
      { key: "breakEvenDamage", label: "Damage Needed for a Claim to Pay Off", format: "currency" },
    ],
    instructions:
      "A claim can raise your premium for several years, and may cost you a no-claims or claim-free discount. For a small " +
      "loss just above your deductible, paying yourself can be cheaper overall.\n\n" +
      "Enter the surcharge your insurer applies (often 20–40% for an at-fault auto claim) and any discount you'd lose. " +
      "A positive net benefit means claiming still comes out ahead.",
    examples:
      "Example: on $2,500 of damage with a $1,000 deductible, a claim pays $1,500 but raises your premium by about " +
      "$1,080 over 3 years — a net benefit of $420. Claims only pay off above about " +
      "$2,080 of damage.",
    assumptions:
      "The increase is a flat percentage of today's premium; some insurers don't surcharge not-at-fault or weather claims. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I have to report an accident even if I don't claim?",
        answer: "Many auto policies require you to report accidents, and an injury or another driver's claim can come later. Reporting is not the same as filing a claim.",
      },
    ],
  },
  {
    slug: "insurance-bundle-discount-calculator",
    title: "Insurance Bundle Discount Calculator",
    description: "Estimate how much bundling home and auto insurance and insuring several cars on one policy saves, with the multi-car and bundle discounts combined.",
    metaTitle: "Insurance Bundle Discount Calculator — Home & Auto Savings",
    metaDescription: "Free insurance bundle calculator. Estimate home and auto bundle savings plus the multi-car discount on your premiums.",
    calcInputs: [
      currencyField("homePremium", "Home or Renters Premium (Yearly)", { default: 1800, max: 100000, step: 50 }),
      currencyField("autoPremiumPerCar", "Auto Premium per Car (Yearly)", { default: 1400, max: 100000, step: 50 }),
      numberField("cars", "Number of Cars", { default: 2, min: 0, max: 10, step: 1 }),
      percentField("multiCarDiscountPercent", "Multi-Car Discount", { default: 20, max: 50, step: 1 }),
      percentField("bundleDiscountPercent", "Home + Auto Bundle Discount", { default: 15, max: 50, step: 1 }),
    ],
    calcResult: { label: "Total Savings", format: "currency" },
    calcResults: [
      { key: "totalWithoutDiscounts", label: "Total Without Discounts", format: "currency" },
      { key: "multiCarSavings", label: "Multi-Car Savings", format: "currency" },
      { key: "bundleSavings", label: "Bundle Savings", format: "currency" },
      { key: "bundledTotal", label: "Bundled Total (Yearly)", format: "currency" },
      { key: "monthlyBundled", label: "Bundled Total (Monthly)", format: "currency" },
      { key: "totalSavings", label: "Total Savings", format: "currency", highlight: true },
      { key: "savingsPercent", label: "Savings", format: "percentage" },
    ],
    instructions:
      "Insurers commonly discount 10–25% for insuring two or more cars together and 5–25% for bundling home or renters " +
      "with auto. This calculator applies the multi-car discount to the auto premiums, then the bundle discount to the total.\n\n" +
      "A bundle isn't always cheapest — compare it with the best separate quotes from different insurers.",
    examples:
      "Example: a $1,800 home policy and 2 cars at $1,400 each list at $4,600. The " +
      "multi-car discount saves $560 and the bundle another $606, for $3,434 a year — " +
      "$1,166 (25.35%) less.",
    assumptions:
      "Insurers apply discounts differently, sometimes to parts of the premium only. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I bundle with different family members?",
        answer: "Usually only within one household; cars must generally be garaged at the same address.",
      },
    ],
  },
  {
    slug: "insurance-lapse-calculator",
    title: "Insurance Lapse Calculator",
    description: "Estimate the cost of a lapse in insurance coverage: days uncovered after the grace period, what you saved by not paying, and the higher premiums afterwards.",
    metaTitle: "Insurance Lapse Calculator — Coverage Gap Cost",
    metaDescription: "Free insurance lapse calculator. Estimate uncovered days after the grace period and the cost of higher premiums after a gap.",
    calcInputs: [
      currencyField("yearlyPremium", "Yearly Premium", { default: 1600, max: 100000, step: 50 }),
      numberField("daysUnpaid", "Days Without Paying", { default: 45, min: 0, max: 1000, step: 1 }),
      numberField("graceDays", "Grace Period (Days)", { default: 10, min: 0, max: 60, step: 1 }),
      percentField("surchargePercent", "Premium Increase After a Lapse", { default: 20, max: 200, step: 1 }),
      numberField("surchargeYears", "Years the Increase Lasts", { default: 3, min: 0, max: 10, step: 1 }),
    ],
    calcResult: { label: "Net Cost of the Lapse", format: "currency" },
    calcResults: [
      { key: "daysWithoutCoverage", label: "Days Without Coverage", format: "number" },
      { key: "premiumSavedDuringLapse", label: "Premium Saved During the Lapse", format: "currency" },
      { key: "futureSurcharge", label: "Higher Premiums Afterwards", format: "currency" },
      { key: "netCostOfLapse", label: "Net Cost of the Lapse", format: "currency", highlight: true },
    ],
    instructions:
      "Most policies give a short grace period after a missed payment; after that, coverage lapses. Any loss during the gap " +
      "isn't covered, and insurers often charge more for drivers or homeowners with a gap in coverage. Driving uninsured " +
      "can also bring fines, license suspension or an SR-22 requirement.\n\n" +
      "If you can't pay, ask about a payment plan or a lower coverage level rather than letting the policy lapse.",
    examples:
      "Example: 45 days without paying on a $1,600 policy with a 10-day grace period leaves " +
      "35 days uncovered. You save $153.42 but may pay $960 more over the next " +
      "3 years.",
    assumptions:
      "Fines and uncovered losses during the gap aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does a short lapse matter?",
        answer: "Gaps of under 30 days are often treated more leniently, but any uninsured day leaves you exposed to a loss.",
      },
    ],
  },
  {
    slug: "insurance-cancellation-refund-calculator",
    title: "Insurance Cancellation Refund Calculator",
    description: "Estimate your refund when you cancel an insurance policy mid-term, pro-rata or short-rate, and the penalty a short-rate cancellation costs.",
    metaTitle: "Insurance Cancellation Refund Calculator — Pro-Rata",
    metaDescription: "Free insurance cancellation refund calculator. Estimate your pro-rata or short-rate refund when you cancel a policy early.",
    calcInputs: [
      currencyField("premium", "Premium Paid for the Term", { default: 1200, max: 1000000, step: 50 }),
      numberField("termDays", "Policy Term (Days)", { default: 365, min: 1, max: 1100, step: 1 }),
      numberField("daysUsed", "Days in Force Before Cancelling", { default: 120, min: 0, max: 1100, step: 1 }),
      {
        key: "method", label: "Refund Method", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Pro-Rata", value: 1 },
          { label: "Short-Rate", value: 2 },
        ],
      },
      percentField("shortRatePenaltyPercent", "Short-Rate Penalty (% of Unused Premium)", { default: 10, max: 100, step: 1 }),
      currencyField("cancellationFee", "Flat Cancellation Fee", { default: 0, max: 10000, step: 5, required: false }),
    ],
    calcResult: { label: "Your Refund", format: "currency" },
    calcResults: [
      { key: "earnedPremium", label: "Premium Used (Earned)", format: "currency" },
      { key: "unearnedPremium", label: "Unused Premium", format: "currency" },
      { key: "proRataRefund", label: "Pro-Rata Refund", format: "currency" },
      { key: "shortRateRefund", label: "Short-Rate Refund", format: "currency" },
      { key: "yourRefund", label: "Your Refund", format: "currency", highlight: true },
      { key: "shortRatePenalty", label: "Short-Rate Penalty", format: "currency" },
    ],
    instructions:
      "When a policy is cancelled before it ends, the insurer keeps the premium for the days you were covered (earned) and " +
      "refunds the rest (unearned). Pro-rata refunds return all of the unused premium — common when the insurer cancels or " +
      "you sell the car or home. Short-rate refunds keep a penalty, sometimes charged when you cancel to switch insurers.\n\n" +
      "Line up the new policy first so there's no gap in coverage.",
    examples:
      "Example: cancelling a $1,200 policy after 120 of 365 days leaves $805.48 unused. Pro-rata " +
      "refunds $805.48; short-rate refunds $724.93.",
    assumptions:
      "The short-rate penalty is a flat share of the unused premium; actual short-rate tables vary. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do monthly-pay policies get a refund?",
        answer: "Usually only for the part of the current month you've paid for but won't use — there's little unearned premium to return.",
      },
    ],
  },
  {
    slug: "direct-vs-agent-insurance-calculator",
    title: "Direct vs Agent Insurance Calculator",
    description: "Compare buying insurance direct from the insurer with buying through an agent: the agent's commission built into the premium and what going direct could save.",
    metaTitle: "Direct vs Agent Insurance Calculator — Commission & Savings",
    metaDescription: "Free direct vs agent insurance calculator. Estimate agent commission and how much a direct-to-consumer policy could save.",
    calcInputs: [
      currencyField("agentPremium", "Yearly Premium Through an Agent", { default: 1800, max: 1000000, step: 50 }),
      currencyField("directPremium", "Yearly Premium Buying Direct", { default: 1600, max: 1000000, step: 50 }),
      percentField("newCommissionPercent", "Agent Commission (First Year)", { default: 12, max: 100, step: 0.5 }),
      percentField("renewalCommissionPercent", "Agent Commission (Renewals)", { default: 8, max: 100, step: 0.5 }),
      numberField("years", "Years", { default: 5, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Savings Going Direct", format: "currency" },
    calcResults: [
      { key: "firstYearCommission", label: "Agent Commission (First Year)", format: "currency" },
      { key: "commissionOverYears", label: "Agent Commission over the Years", format: "currency" },
      { key: "yearlySavingsGoingDirect", label: "Yearly Savings Going Direct", format: "currency" },
      { key: "savingsOverYears", label: "Savings Going Direct", format: "currency", highlight: true },
      { key: "savingsPercent", label: "Savings", format: "percentage" },
    ],
    instructions:
      "Agents and brokers are paid a commission by the insurer — typically about 5–15% of the premium for home and auto, " +
      "usually higher on new policies than renewals. Direct-to-consumer insurers sell online or by phone without agents, " +
      "which can lower premiums, though not always.\n\n" +
      "An independent agent can shop several insurers for you and help with claims; compare actual quotes for the same coverage.",
    examples:
      "Example: on a $1,800 premium, the agent earns about $216 the first year and " +
      "$792 over 5 years. A $1,600 direct quote saves $200 a year — " +
      "$1,000 in total.",
    assumptions:
      "Both premiums stay the same over the years. Commission is paid by the insurer, not added as a separate fee. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does an agent cost me more?",
        answer: "Not necessarily — insurers set premiums, and agent-sold policies can be competitive. The commission is built in, so compare total quotes.",
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
