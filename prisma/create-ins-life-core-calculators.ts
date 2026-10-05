// One-time (but safe to re-run) batch setup script: creates the Life Insurance tools
// (6) of the Insurance Calculators expansion, filed under Insurance Calculators >
// Life Insurance Calculators (both categories are created on first run).
// See src/lib/calc-engine-ins-life-core.ts for the math and
// src/lib/calc-engine-ins-life-core.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-ins-life-core-calculators.ts
// or
//   npm run db:create-ins-life-core-calculators

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
    slug: "life-insurance-calculator",
    title: "Life Insurance Calculator",
    description: "Find out how much life insurance you need with the DIME method — debts, income, mortgage and education — plus final expenses, and the coverage gap after savings and existing policies.",
    metaTitle: "Life Insurance Calculator — How Much Coverage You Need",
    metaDescription: "Free life insurance calculator. Estimate how much coverage you need for income, debts, mortgage and education, and your coverage gap.",
    calcInputs: [
      currencyField("annualIncome", "Yearly Income to Replace", { default: 80000, max: 100000000, step: 1000 }),
      numberField("yearsToReplace", "Years of Income to Replace", { default: 10, min: 0, max: 50, step: 1 }),
      currencyField("debts", "Debts Other Than Mortgage", { default: 25000, max: 100000000, step: 1000, required: false }),
      currencyField("mortgage", "Mortgage Balance", { default: 250000, max: 100000000, step: 5000, required: false }),
      numberField("children", "Children", { default: 2, min: 0, max: 20, step: 1 }),
      currencyField("educationPerChild", "Education Cost per Child", { default: 100000, max: 10000000, step: 5000, required: false }),
      currencyField("finalExpenses", "Final Expenses", { default: 15000, max: 1000000, step: 1000, required: false }),
      currencyField("savings", "Savings & Investments Available", { default: 50000, max: 1000000000, step: 1000, required: false }),
      currencyField("existingCoverage", "Existing Life Insurance", { default: 250000, max: 1000000000, step: 10000, required: false }),
    ],
    calcResult: { label: "Coverage Gap", format: "currency" },
    calcResults: [
      { key: "incomeReplacement", label: "Income Replacement", format: "currency" },
      { key: "totalNeed", label: "Total Need", format: "currency" },
      { key: "resourcesAvailable", label: "Savings + Existing Coverage", format: "currency" },
      { key: "coverageGap", label: "Coverage Gap", format: "currency", highlight: true },
      { key: "needAsMultipleOfIncome", label: "Need as a Multiple of Income", format: "number" },
    ],
    instructions:
      "The DIME method adds up Debts, Income (years your family would need it), the Mortgage and Education. Add final " +
      "expenses, then subtract what's already available — savings and any existing policies, including group coverage at " +
      "work. The gap is how much more coverage to consider.\n\n" +
      "A common shortcut is 10–15 times income; this calculator lets you tailor it.",
    examples:
      "Example: replacing $80,000 for 10 years ($800,000), paying off $250,000 of mortgage and " +
      "$25,000 of debts, and funding 2 children's education totals $1,290,000. With $300,000 of savings " +
      "and coverage, the gap is $990,000.",
    assumptions:
      "No investment return or inflation on the income replaced; Social Security survivor benefits not included. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is life insurance through work enough?",
        answer: "Often not — group coverage is usually 1–2 times salary and ends if you leave the job. Many people add an individual term policy.",
      },
    ],
  },
  {
    slug: "term-life-insurance-calculator",
    title: "Term Life Insurance Calculator",
    description: "Estimate a term life premium from a quoted rate per $1,000 and your health rating class — including ratings for pre-existing conditions and smoking — and the total cost over the term.",
    metaTitle: "Term Life Insurance Calculator — Premium by Rating Class",
    metaDescription: "Free term life insurance calculator. Estimate the annual and monthly premium by rating class, including pre-existing conditions, and total cost.",
    calcInputs: [
      currencyField("coverage", "Coverage Amount", { default: 500000, max: 100000000, step: 50000 }),
      currencyField("ratePer1000", "Rate per $1,000 (Preferred, From a Quote)", { default: 0.6, max: 100, step: 0.01 }),
      {
        key: "ratingClass", label: "Health Rating Class", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Preferred Plus (Excellent Health)", value: 1 },
          { label: "Preferred", value: 2 },
          { label: "Standard Plus", value: 3 },
          { label: "Standard", value: 4 },
          { label: "Table Rating (Pre-Existing Condition)", value: 5 },
          { label: "Tobacco User", value: 6 },
        ],
      },
      numberField("termYears", "Term (Years)", { default: 20, min: 1, max: 40, step: 5 }),
      currencyField("policyFee", "Yearly Policy Fee", { default: 60, max: 1000, step: 5, required: false }),
    ],
    calcResult: { label: "Annual Premium", format: "currency" },
    calcResults: [
      { key: "ratingFactor", label: "Rating Factor", format: "number" },
      { key: "annualPremium", label: "Annual Premium", format: "currency", highlight: true },
      { key: "monthlyPremium", label: "Monthly Premium", format: "currency" },
      { key: "totalPremiumsOverTerm", label: "Total Premiums Over the Term", format: "currency" },
      { key: "costPer1000PerYear", label: "Cost per $1,000 per Year", format: "currency" },
    ],
    instructions:
      "Term life covers you for a set period (10–30 years) and pays only if you die during it, which makes it far cheaper " +
      "than permanent insurance. Insurers price it per $1,000 of coverage, based on age, health and the term, then place you " +
      "in a rating class. Conditions such as diabetes or heart disease can mean a table rating (often 25%+ per table); " +
      "tobacco use roughly triples the price.\n\n" +
      "Get a preferred rate from an online quote and use the rating class to see how health changes it.",
    examples:
      "Example: $500,000 of coverage at $0.60 per $1,000 in the Preferred class costs $360 a year (about " +
      "$31.50 a month) — $7,200 over 20 years.",
    assumptions:
      "Rating factors are typical multiples; each insurer uses its own. Monthly premium uses a common 8.75% modal factor. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How long should my term be?",
        answer: "Long enough to cover your biggest obligations — until the mortgage is paid off or the youngest child is independent.",
      },
    ],
  },
  {
    slug: "whole-life-insurance-calculator",
    title: "Whole Life Insurance Calculator",
    description: "Project a whole life policy's cash value growth from your premium, the share credited to cash value and the crediting rate — and when the cash value catches up with premiums paid.",
    metaTitle: "Whole Life Insurance Calculator — Cash Value Growth",
    metaDescription: "Free whole life insurance calculator. Project cash value growth, surrender value, and the year cash value catches up with premiums.",
    calcInputs: [
      currencyField("faceAmount", "Death Benefit", { default: 250000, max: 100000000, step: 10000 }),
      currencyField("annualPremium", "Annual Premium", { default: 3000, max: 10000000, step: 100 }),
      percentField("creditedSharePercent", "Share of Premium Credited to Cash Value (After Year 1)", { default: 70, max: 100, step: 5 }),
      percentField("creditingRatePercent", "Cash Value Growth Rate (Incl. Dividends)", { default: 4, min: 0, max: 10, step: 0.25 }),
      numberField("years", "Years", { default: 20, min: 1, max: 60, step: 1 }),
      percentField("surrenderChargePercent", "Surrender Charge at That Point", { default: 0, max: 100, step: 1, required: false }),
    ],
    calcResult: { label: "Cash Value", format: "currency" },
    calcResults: [
      { key: "totalPremiumsPaid", label: "Total Premiums Paid", format: "currency" },
      { key: "cashValue", label: "Cash Value", format: "currency", highlight: true },
      { key: "surrenderValue", label: "Surrender Value", format: "currency" },
      { key: "deathBenefit", label: "Death Benefit", format: "currency" },
      { key: "cashValueBreakEvenYear", label: "Year Cash Value Catches Up With Premiums", format: "number" },
    ],
    instructions:
      "Whole life insurance lasts your lifetime and builds cash value at a guaranteed rate, plus dividends from participating " +
      "insurers. Early premiums go largely to commissions and costs, so cash value builds slowly — it often takes 10–20 years " +
      "to exceed what you've paid in.\n\n" +
      "Use the guaranteed and illustrated columns from the insurer's policy illustration to set the growth rate. 0 means " +
      "cash value doesn't catch up within the years entered.",
    examples:
      "Example: $3,000 a year for 20 years — $60,000 in total — with 70% credited " +
      "and growing at 4% builds about $60,433.97 of cash value, passing the premiums paid in year " +
      "20.",
    assumptions:
      "Simplified model: no credit in year one, a flat credited share afterwards; real policies vary. Loans and withdrawals " +
      "reduce the death benefit. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is whole life a good investment?",
        answer: "It's mainly insurance with forced savings. Returns are usually lower than investing on your own; it suits people who need lifelong coverage or have maxed other tax-advantaged accounts.",
      },
    ],
  },
  {
    slug: "universal-life-insurance-calculator",
    title: "Universal Life Insurance Calculator",
    description: "Project a universal life policy's account value as the cost of insurance rises with age, and see whether your premium keeps the policy in force or when it would lapse.",
    metaTitle: "Universal Life Insurance Calculator — Lapse Risk",
    metaDescription: "Free universal life calculator. Project account value with rising cost of insurance, and find the year the policy could lapse.",
    calcInputs: [
      currencyField("faceAmount", "Death Benefit", { default: 500000, max: 100000000, step: 10000 }),
      currencyField("annualPremium", "Annual Premium", { default: 3000, max: 10000000, step: 100 }),
      percentField("creditingRatePercent", "Crediting Rate", { default: 4, min: 0, max: 12, step: 0.25 }),
      currencyField("coiPer1000", "Cost of Insurance per $1,000 (Year 1)", { default: 1.2, max: 500, step: 0.05 }),
      percentField("coiIncreasePercent", "Yearly Increase in Cost of Insurance", { default: 9, max: 20, step: 0.5 }),
      percentField("expenseChargePercent", "Premium Expense Charge", { default: 5, max: 30, step: 0.5 }),
      numberField("years", "Years to Project", { default: 45, min: 1, max: 70, step: 1 }),
    ],
    calcResult: { label: "Lapse Year (0 = Stays in Force)", format: "number" },
    calcResults: [
      { key: "firstYearCostOfInsurance", label: "First-Year Cost of Insurance", format: "currency" },
      { key: "accountValueAtYear20", label: "Account Value at Year 20", format: "currency" },
      { key: "accountValueAtEnd", label: "Account Value at the End", format: "currency" },
      { key: "lapseYear", label: "Lapse Year (0 = Stays in Force)", format: "number", highlight: true },
    ],
    instructions:
      "Universal life has flexible premiums: they go into an account that earns interest, and the insurer deducts the cost " +
      "of insurance (COI) each month. COI rises as you age, so a premium that looks fine early can fail later — when the " +
      "account runs dry, the policy lapses unless you pay more.\n\n" +
      "Take the COI and rates from your policy illustration or annual statement.",
    examples:
      "Example: a $500,000 policy with a $3,000 premium and a 4% crediting rate has " +
      "$47,979.51 by year 20. But with the cost of insurance rising 9% a year, the account runs " +
      "out and the policy lapses in year 39.",
    assumptions:
      "Charges taken yearly; COI applies to the net amount at risk. Guaranteed (no-lapse) universal life works differently. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What should I do if my UL policy is projected to lapse?",
        answer: "Ask the insurer for an in-force illustration. Options include raising premiums, lowering the death benefit, or exchanging the policy (a 1035 exchange).",
      },
    ],
  },
  {
    slug: "life-insurance-beneficiary-payout-calculator",
    title: "Life Insurance Beneficiary Payout Calculator",
    description: "Compare how a beneficiary can receive a life insurance payout: a lump sum, monthly installments from the insurer, or investing the lump sum and drawing it down yourself.",
    metaTitle: "Life Insurance Payout Calculator — Lump Sum vs Installments",
    metaDescription: "Free life insurance payout calculator. Compare a lump sum with insurer installments or investing it yourself, and the taxable interest.",
    calcInputs: [
      currencyField("deathBenefit", "Death Benefit", { default: 500000, max: 100000000, step: 10000 }),
      numberField("installmentYears", "Installment Period (Years)", { default: 20, min: 1, max: 50, step: 1 }),
      percentField("insurerRatePercent", "Insurer's Interest Rate on Installments", { default: 3, max: 10, step: 0.25 }),
      percentField("ownReturnPercent", "Return If You Invest It Yourself", { default: 5, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Monthly Installment", format: "currency" },
    calcResults: [
      { key: "lumpSum", label: "Lump Sum", format: "currency" },
      { key: "monthlyInstallment", label: "Monthly Installment", format: "currency", highlight: true },
      { key: "totalFromInstallments", label: "Total From Installments", format: "currency" },
      { key: "taxableInterestInInstallments", label: "Taxable Interest in Installments", format: "currency" },
      { key: "monthlyIfYouInvestIt", label: "Monthly If You Invest It Yourself", format: "currency" },
    ],
    instructions:
      "The death benefit itself is generally income-tax-free. Beneficiaries can usually take it as a lump sum or choose a " +
      "settlement option — such as fixed installments for a number of years — where the insurer keeps the money and pays " +
      "interest, which is taxable.\n\n" +
      "Investing a lump sum yourself may pay more, but carries market risk and requires discipline.",
    examples:
      "Example: a $500,000 payout taken as installments over 20 years at 3% pays " +
      "$2,772.99 a month — $665,517.12 in total, of which $165,517.12 is taxable interest. " +
      "Invested at 5%, it could pay $3,299.78 a month for the same period.",
    assumptions:
      "Level monthly payments that use up the money by the end of the period. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a life insurance payout taxable?",
        answer: "The death benefit usually isn't subject to income tax; interest earned while the insurer holds it is. Large estates may owe estate tax if the insured owned the policy.",
      },
    ],
  },
  {
    slug: "mortgage-life-insurance-calculator",
    title: "Mortgage Life Insurance Calculator",
    description: "Compare mortgage life insurance — which pays off a shrinking loan balance — with a level term life policy that pays your family the full amount, by cost and payout.",
    metaTitle: "Mortgage Life Insurance Calculator — vs Term Life",
    metaDescription: "Free mortgage life insurance calculator. Compare decreasing mortgage protection with level term life by payout and total cost.",
    calcInputs: [
      currencyField("balance", "Mortgage Balance", { default: 300000, max: 100000000, step: 5000 }),
      percentField("ratePercent", "Mortgage Rate", { default: 6.5, max: 15, step: 0.125 }),
      numberField("yearsLeft", "Years Left on the Mortgage", { default: 25, min: 1, max: 40, step: 1 }),
      currencyField("mortgageLifeMonthly", "Mortgage Life Premium per Month", { default: 75, max: 10000, step: 1 }),
      currencyField("termLifeMonthly", "Level Term Premium per Month (Same Amount)", { default: 35, max: 10000, step: 1 }),
      numberField("checkYear", "Compare Payout in Year", { default: 10, min: 0, max: 40, step: 1 }),
    ],
    calcResult: { label: "Savings With Term Life", format: "currency" },
    calcResults: [
      { key: "mortgageLifePayoutAtYear", label: "Mortgage Life Payout in That Year", format: "currency" },
      { key: "levelTermPayoutAtYear", label: "Level Term Payout in That Year", format: "currency" },
      { key: "mortgageLifeTotalCost", label: "Mortgage Life Total Cost", format: "currency" },
      { key: "termLifeTotalCost", label: "Term Life Total Cost", format: "currency" },
      { key: "savingsWithTermLife", label: "Savings With Term Life", format: "currency", highlight: true },
    ],
    instructions:
      "Mortgage life (mortgage protection) insurance pays the lender whatever you still owe, so the payout shrinks as you " +
      "pay the loan down, while the premium usually stays the same. A level term policy for the same amount pays your " +
      "family the full sum, who can then decide whether to pay off the mortgage — and it's often cheaper for healthy people.\n\n" +
      "Mortgage life can make sense if health problems make regular term insurance hard to get.",
    examples:
      "Example: on a $300,000 mortgage, mortgage life would pay $232,534.08 in year 10, while level term " +
      "still pays $300,000. Over 25 years mortgage life costs $22,500 versus " +
      "$10,500 — $12,000 saved with term.",
    assumptions:
      "Regular amortization; premiums stay level. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is mortgage life insurance the same as PMI?",
        answer: "No. PMI protects the lender if you stop paying; mortgage life insurance pays off the loan if you die.",
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
