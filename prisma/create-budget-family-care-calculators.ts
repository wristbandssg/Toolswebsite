// One-time (but safe to re-run) batch setup script: creates the Family Care Expense tools
// (5) of the Budget Calculators expansion, filed under Budget Calculators >
// Household & Family Expense Calculators (both categories are created on first run).
// See src/lib/calc-engine-budget-family-care.ts for the math and
// src/lib/calc-engine-budget-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-budget-family-care-calculators.ts
// or
//   npm run db:create-budget-family-care-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Budget Calculators", slug: "budget-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Household & Family Expense Calculators", slug: "household-family-expense-calculators" };

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
  "This tool provides general estimates for planning purposes only and isn't financial advice. Your actual " +
  "costs depend on where you live, your prices and your choices — adjust the inputs to your situation.";

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
    slug: "pet-ownership-cost-budget-calculator",
    title: "Pet Ownership Cost Budget Calculator",
    description: "Estimate what a dog, cat or other pet costs each month and year — food, vet care, insurance, grooming and supplies — plus the first-year and lifetime cost.",
    metaTitle: "Pet Cost Calculator — Monthly, Yearly & Lifetime",
    metaDescription: "Free pet ownership cost calculator. Estimate monthly, yearly, first-year and lifetime costs for food, vet care, insurance and grooming.",
    calcInputs: [
      currencyField("food", "Food & Treats per Month", { default: 60, max: 10000, step: 5 }),
      currencyField("insurance", "Pet Insurance per Month", { default: 40, max: 10000, step: 5, required: false }),
      currencyField("grooming", "Grooming per Month", { default: 30, max: 10000, step: 5, required: false }),
      currencyField("supplies", "Toys, Litter & Supplies per Month", { default: 20, max: 10000, step: 5, required: false }),
      currencyField("vetYearly", "Routine Vet Care per Year", { default: 400, max: 100000, step: 25 }),
      currencyField("upfront", "Adoption & Setup Costs", { default: 600, max: 100000, step: 25, required: false }),
      numberField("lifespanYears", "Expected Lifespan (Years)", { default: 12, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Yearly Cost", format: "currency" },
    calcResults: [
      { key: "monthlyCost", label: "Monthly Cost", format: "currency" },
      { key: "yearlyCost", label: "Yearly Cost", format: "currency", highlight: true },
      { key: "firstYearCost", label: "First-Year Cost", format: "currency" },
      { key: "lifetimeCost", label: "Lifetime Cost", format: "currency" },
    ],
    instructions:
      "Pets cost more than food. Budget for routine vet visits and vaccines, preventives, grooming, supplies and pet " +
      "insurance or an emergency fund for illness. Dogs generally cost more than cats, and large breeds more than small " +
      "ones. Add boarding or pet-sitting if you travel.\n\n" +
      "Enter typical monthly costs and the first-year setup.",
    examples:
      "Example: $60 of food, $40 of insurance, $30 of grooming, $20 of supplies and $400 a year " +
      "of vet care come to $183.33 a month — $2,200 a year, $2,800 in the first year and $27,000 " +
      "over 12 years.",
    assumptions:
      "Costs stay level; senior pets usually need more vet care. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is pet insurance worth it?",
        answer: "It protects against large, unexpected vet bills. If you'd rather self-insure, set aside the premium each month in a pet emergency fund.",
      },
    ],
  },
  {
    slug: "elder-care-budget-calculator",
    title: "Elder Care Budget Calculator",
    description: "Estimate the cost of caring for an aging parent — in-home aide, assisted living or nursing home — per month, per year and over several years with rising prices.",
    metaTitle: "Elder Care Cost Calculator — In-Home vs Assisted Living",
    metaDescription: "Free elder care calculator. Estimate in-home care, assisted living or nursing home costs per month and over several years.",
    calcInputs: [
      {
        key: "careType", label: "Type of Care", type: "dropdown", required: true, default: 1,
        options: [
          { label: "In-Home Aide (Hourly)", value: 1 },
          { label: "Assisted Living (Monthly)", value: 2 },
          { label: "Nursing Home (Daily)", value: 3 },
        ],
      },
      currencyField("hourlyRate", "In-Home Aide Hourly Rate", { default: 34, max: 500, step: 1 }),
      numberField("hoursPerWeek", "In-Home Hours per Week", { default: 20, min: 0, max: 168, step: 1 }),
      currencyField("assistedMonthly", "Assisted Living per Month", { default: 5900, max: 100000, step: 100 }),
      currencyField("nursingDaily", "Nursing Home per Day", { default: 320, max: 5000, step: 5 }),
      currencyField("coverageMonthly", "Covered by Insurance or Benefits (Monthly)", { default: 0, max: 100000, step: 100, required: false }),
      numberField("years", "Years of Care", { default: 3, min: 0, max: 30, step: 0.5 }),
      percentField("inflationPercent", "Yearly Cost Increase", { default: 4, max: 15, step: 0.5 }),
    ],
    calcResult: { label: "Total Cost Over the Years", format: "currency" },
    calcResults: [
      { key: "monthlyCost", label: "Monthly Cost", format: "currency" },
      { key: "monthlyAfterCoverage", label: "Monthly After Coverage", format: "currency" },
      { key: "yearlyCost", label: "Yearly Cost", format: "currency" },
      { key: "totalCostOverYears", label: "Total Cost Over the Years", format: "currency", highlight: true },
    ],
    instructions:
      "National median costs are roughly $30–$35 an hour for a home health aide, around $5,500–$6,000 a month for assisted " +
      "living and $300+ a day for a semi-private nursing home room — far higher in some states. Medicare doesn't cover " +
      "long-term custodial care; long-term care insurance, Medicaid (after spending down assets) and VA benefits may.\n\n" +
      "Choose the type of care and enter local prices.",
    examples:
      "Example: an in-home aide at $34 an hour for 20 hours a week costs $2,946.67 a month — " +
      "$35,360 a year. With prices rising 4% a year, 3 years of care cost $110,379.78.",
    assumptions:
      "Care level stays the same; needs usually increase over time. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I claim a tax break for caring for a parent?",
        answer: "If your parent qualifies as your dependent, you may claim medical expenses you pay for them and the credit for other dependents; check IRS rules.",
      },
    ],
  },
  {
    slug: "single-parent-budget-calculator",
    title: "Single-Parent Budget Calculator",
    description: "Build a single-parent budget with child support and benefits as income: total income and costs, your surplus or shortfall, childcare's share, and an emergency fund target.",
    metaTitle: "Single-Parent Budget Calculator — Income & Costs",
    metaDescription: "Free single-parent budget calculator. Include child support, see your surplus or shortfall, childcare share and emergency fund target.",
    calcInputs: [
      currencyField("income", "Monthly Take-Home Pay", { default: 4200, max: 10000000, step: 50 }),
      currencyField("childSupport", "Child Support Received", { default: 600, max: 1000000, step: 25, required: false }),
      currencyField("otherBenefits", "Other Benefits (e.g., Child Tax Credit, Assistance)", { default: 0, max: 1000000, step: 25, required: false }),
      currencyField("housing", "Housing", { default: 1500, max: 1000000, step: 25 }),
      currencyField("childcare", "Childcare", { default: 900, max: 1000000, step: 25, required: false }),
      currencyField("food", "Food", { default: 700, max: 1000000, step: 25 }),
      currencyField("other", "Everything Else", { default: 1200, max: 1000000, step: 25 }),
      numberField("emergencyMonths", "Emergency Fund (Months of Expenses)", { default: 6, min: 0, max: 24, step: 1 }),
    ],
    calcResult: { label: "Surplus or Shortfall", format: "currency" },
    calcResults: [
      { key: "totalIncome", label: "Total Monthly Income", format: "currency" },
      { key: "totalExpenses", label: "Total Monthly Expenses", format: "currency" },
      { key: "surplusOrDeficit", label: "Surplus or Shortfall", format: "currency", highlight: true },
      { key: "childcareShare", label: "Childcare as % of Income", format: "percentage" },
      { key: "emergencyFundTarget", label: "Emergency Fund Target", format: "currency" },
    ],
    instructions:
      "On one income, a budget leaves little room for surprises, so an emergency fund matters even more — many advisors " +
      "suggest six months of expenses. Count child support only if it's reliably paid.\n\n" +
      "Look into the child tax credit, earned income credit, the child care credit, and state childcare assistance, which " +
      "can make a big difference.",
    examples:
      "Example: $4,200 of pay plus $600 of child support is $4,800 a month. Expenses of $4,300 leave " +
      "$500; childcare takes 18.75% of income. A 6-month emergency fund is " +
      "$25,800.",
    assumptions:
      "Monthly figures; child support received isn't taxable income. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I file as head of household?",
        answer: "Usually, if you're unmarried and pay more than half the cost of a home for a qualifying child — it gives a larger standard deduction and wider tax brackets than single.",
      },
    ],
  },
  {
    slug: "divorce-expense-split-budget-calculator",
    title: "Divorce Expense Split Budget Calculator",
    description: "Split children's shared expenses between divorced, separated or blended-family parents in proportion to income, and see who owes whom each month.",
    metaTitle: "Divorce Expense Split Calculator — Child Costs by Income",
    metaDescription: "Free co-parenting expense calculator. Split children's shared costs between parents by income share and see the reimbursement owed.",
    calcInputs: [
      currencyField("incomeA", "Parent A Monthly Income", { default: 6000, max: 10000000, step: 50 }),
      currencyField("incomeB", "Parent B Monthly Income", { default: 3000, max: 10000000, step: 50 }),
      currencyField("sharedChildCosts", "Shared Child Costs per Month", { default: 1500, max: 1000000, step: 25 }),
      currencyField("paidByA", "Amount Parent A Actually Paid", { default: 1500, max: 1000000, step: 25 }),
    ],
    calcResult: { label: "Parent B Owes Parent A", format: "currency" },
    calcResults: [
      { key: "parentAShare", label: "Parent A's Income Share", format: "percentage" },
      { key: "parentAPortion", label: "Parent A's Portion", format: "currency" },
      { key: "parentBPortion", label: "Parent B's Portion", format: "currency" },
      { key: "parentBOwesParentA", label: "Parent B Owes Parent A (Negative = A Owes B)", format: "currency", highlight: true },
      { key: "yearlySharedCosts", label: "Yearly Shared Costs", format: "currency" },
    ],
    instructions:
      "Many parenting plans split children's extra costs — childcare, uninsured medical bills, school fees, activities — in " +
      "proportion to each parent's income. This also works for blended families sharing costs across two households.\n\n" +
      "Enter both incomes, the month's shared costs and how much Parent A paid. Your court order or agreement, and state " +
      "child support guidelines, take precedence.",
    examples:
      "Example: Parent A earns $6,000 and Parent B $3,000, so A covers 66.67% of $1,500 of shared " +
      "costs ($1,000) and B $500. Since A paid it all, B owes A $500 this month.",
    assumptions:
      "Shared costs are separate from base child support. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do we keep track of shared expenses?",
        answer: "Co-parenting apps log expenses with receipts and handle reimbursements, which reduces disputes and keeps a record if questions come up later.",
      },
    ],
  },
  {
    slug: "home-office-utility-cost-split-calculator",
    title: "Home Office Utility Cost Split Calculator",
    description: "Work out the business share of your home's utilities, internet, rent or mortgage interest and insurance for a home office, and compare the regular and simplified deduction methods.",
    metaTitle: "Home Office Utility Split Calculator — Deduction",
    metaDescription: "Free home office calculator. Find the business-use share of utilities, internet and housing costs and compare regular vs simplified methods.",
    calcInputs: [
      numberField("homeSqFt", "Home Size (Sq Ft)", { default: 2000, min: 1, max: 100000, step: 50 }),
      numberField("officeSqFt", "Office Size (Sq Ft)", { default: 200, min: 0, max: 100000, step: 10 }),
      currencyField("yearlyUtilities", "Utilities per Year", { default: 4200, max: 1000000, step: 100 }),
      currencyField("yearlyInternet", "Internet per Year", { default: 840, max: 100000, step: 10 }),
      percentField("internetBusinessPercent", "Internet Used for Business", { default: 50, max: 100, step: 5 }),
      currencyField("yearlyHousing", "Rent or Mortgage Interest + Property Tax per Year", { default: 18000, max: 10000000, step: 100 }),
      currencyField("yearlyInsurance", "Home or Renters Insurance per Year", { default: 1500, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Regular Method Total", format: "currency" },
    calcResults: [
      { key: "businessUsePercent", label: "Business-Use Share of Home", format: "percentage" },
      { key: "utilitiesShare", label: "Utilities Share", format: "currency" },
      { key: "internetShare", label: "Internet Share", format: "currency" },
      { key: "housingAndInsuranceShare", label: "Housing & Insurance Share", format: "currency" },
      { key: "regularMethodTotal", label: "Regular Method Total", format: "currency", highlight: true },
      { key: "simplifiedMethodTotal", label: "Simplified Method ($5/Sq Ft)", format: "currency" },
    ],
    instructions:
      "Self-employed people can deduct a home office used regularly and only for business. The regular method deducts the " +
      "business-use share (office area ÷ home area) of actual costs; the simplified method allows $5 per square foot up to " +
      "300 square feet. Employees can't deduct a home office on their federal return, but can use this to agree a fair " +
      "reimbursement with their employer.\n\n" +
      "Internet and phone are split by actual business use, not floor area.",
    examples:
      "Example: a 200-sq-ft office in a 2,000-sq-ft home is 10% business use. That share of utilities " +
      "($420), housing and insurance ($1,950) plus $420 of internet comes to " +
      "$2,790 — versus $1,000 under the simplified method.",
    assumptions:
      "Depreciation on an owned home isn't included; it adds to the regular method but is recaptured when you sell. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which home office method is better?",
        answer: "The regular method usually gives more for larger offices and higher housing costs; the simplified method is easier and avoids depreciation recapture.",
      },
    ],
  },
];

// Budget Calculators (and its sub-categories) are created on first use, under
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
