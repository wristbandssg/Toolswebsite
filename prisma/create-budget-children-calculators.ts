// One-time (but safe to re-run) batch setup script: creates the Children's Expense tools
// (8) of the Budget Calculators expansion, filed under Budget Calculators >
// Household & Family Expense Calculators (both categories are created on first run).
// See src/lib/calc-engine-budget-children.ts for the math and
// src/lib/calc-engine-budget-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-budget-children-calculators.ts
// or
//   npm run db:create-budget-children-calculators

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
    slug: "childcare-cost-budget-calculator",
    title: "Childcare Cost Budget Calculator",
    description: "Budget for daycare or after-school care: the yearly and monthly cost, the tax savings from a dependent care FSA and the child care credit, and the net cost.",
    metaTitle: "Childcare Cost Calculator — FSA & Child Care Credit",
    metaDescription: "Free childcare cost calculator. See yearly daycare costs, dependent care FSA tax savings, the child care credit and your net cost.",
    calcInputs: [
      currencyField("weeklyPerChild", "Weekly Cost per Child", { default: 300, max: 10000, step: 5 }),
      numberField("children", "Children in Care", { default: 1, min: 1, max: 10, step: 1 }),
      numberField("weeks", "Weeks of Care per Year", { default: 50, min: 0, max: 52, step: 1 }),
      currencyField("fsaContribution", "Dependent Care FSA Contribution (Max $7,500)", { default: 5000, max: 7500, step: 100, required: false }),
      percentField("taxRatePercent", "Your Combined Tax Rate (Incl. Payroll)", { default: 30, max: 60, step: 1 }),
      percentField("creditRatePercent", "Child Care Credit Rate", { default: 20, max: 50, step: 1 }),
      currencyField("income", "Monthly Take-Home Pay", { default: 9000, max: 10000000, step: 100 }),
    ],
    calcResult: { label: "Net Yearly Cost", format: "currency" },
    calcResults: [
      { key: "yearlyCost", label: "Yearly Cost", format: "currency" },
      { key: "monthlyCost", label: "Monthly Cost", format: "currency" },
      { key: "fsaTaxSavings", label: "FSA Tax Savings", format: "currency" },
      { key: "childCareCredit", label: "Child & Dependent Care Credit", format: "currency" },
      { key: "netYearlyCost", label: "Net Yearly Cost", format: "currency", highlight: true },
      { key: "shareOfIncome", label: "Net Cost as % of Take-Home Pay", format: "percentage" },
    ],
    instructions:
      "Childcare is often a family's biggest expense after housing. Two tax breaks help: a dependent care FSA through your " +
      "employer lets you pay up to $7,500 a year (from 2026) with pre-tax money, and the child and dependent care credit " +
      "covers a percentage of up to $3,000 of expenses for one child or $6,000 for two or more — reduced by any FSA money.\n\n" +
      "The credit rate depends on your income (higher for lower incomes); 20% is typical for middle and higher earners.",
    examples:
      "Example: $300 a week for 50 weeks is $15,000 a year. Running $5,000 through a " +
      "dependent care FSA saves $1,500 in tax, for a net cost of $13,500 — 12.50% of take-home pay. " +
      "With one child, the FSA uses up the whole credit limit.",
    assumptions:
      "Employment-related care for children under 13. You can't use the same dollars for both the FSA and the credit. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "FSA or credit — which is better?",
        answer: "For most middle- and higher-income families the FSA saves more because it also avoids payroll tax. Families with two or more children can use both: the FSA first, then the credit on any remaining expenses up to the limit.",
      },
    ],
  },
  {
    slug: "nanny-vs-daycare-cost-comparison-calculator",
    title: "Nanny vs Daycare Cost Comparison Calculator",
    description: "Compare a daycare center with sibling discounts against a nanny's wages plus employer payroll taxes, per year and per child.",
    metaTitle: "Nanny vs Daycare Cost Calculator — Which Is Cheaper",
    metaDescription: "Free nanny vs daycare calculator. Compare daycare with sibling discounts and a nanny with employer taxes, per year and per child.",
    calcInputs: [
      numberField("children", "Children", { default: 2, min: 1, max: 10, step: 1 }),
      currencyField("daycareWeekly", "Daycare Weekly Cost (First Child)", { default: 350, max: 10000, step: 5 }),
      percentField("siblingDiscountPercent", "Sibling Discount", { default: 10, max: 50, step: 1, required: false }),
      numberField("daycareWeeks", "Daycare Weeks Paid per Year", { default: 50, min: 0, max: 52, step: 1 }),
      currencyField("nannyHourly", "Nanny Hourly Wage", { default: 22, max: 200, step: 0.5 }),
      numberField("nannyHours", "Nanny Hours per Week", { default: 45, min: 0, max: 80, step: 1 }),
      numberField("nannyWeeks", "Nanny Weeks Paid per Year (Incl. Paid Time Off)", { default: 52, min: 0, max: 52, step: 1 }),
      percentField("employerTaxPercent", "Employer Taxes & Payroll Service", { default: 10, max: 30, step: 0.5 }),
    ],
    calcResult: { label: "Nanny Costs More by (per Year)", format: "currency" },
    calcResults: [
      { key: "daycareYearly", label: "Daycare per Year", format: "currency" },
      { key: "nannyWages", label: "Nanny Wages per Year", format: "currency" },
      { key: "nannyYearlyWithTaxes", label: "Nanny per Year With Taxes", format: "currency" },
      { key: "differencePerYear", label: "Nanny Costs More by (per Year)", format: "currency", highlight: true },
      { key: "daycarePerChildPerMonth", label: "Daycare per Child per Month", format: "currency" },
      { key: "nannyPerChildPerMonth", label: "Nanny per Child per Month", format: "currency" },
    ],
    instructions:
      "Daycare charges per child (often with a sibling discount); a nanny is paid by the hour no matter how many children, " +
      "so the gap narrows with more kids. As a household employer you owe Social Security and Medicare (7.65%) plus " +
      "unemployment taxes and usually pay overtime above 40 hours.\n\n" +
      "A nanny share with another family splits the cost. A negative difference means the nanny is cheaper.",
    examples:
      "Example: daycare for 2 children at $350 a week with a 10% sibling discount costs " +
      "$33,250 a year. A nanny at $22 an hour for 45 hours costs $56,628 with taxes — " +
      "$23,378 more.",
    assumptions:
      "Overtime premiums not included; daycare closures not counted. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I have to pay taxes for a nanny?",
        answer: "Yes, if you pay a household employee more than the yearly threshold ($2,800 for 2025). You withhold and pay Social Security and Medicare, may owe unemployment tax, and give them a W-2.",
      },
    ],
  },
  {
    slug: "back-to-school-budget-calculator",
    title: "Back-to-School Budget Calculator",
    description: "Plan back-to-school spending per child on clothes, supplies, tech and fees, and how much to save each month or week before school starts.",
    metaTitle: "Back-to-School Budget Calculator — Per Child Costs",
    metaDescription: "Free back-to-school budget calculator. Plan clothing, supplies, tech and fees per child and the monthly savings needed before school.",
    calcInputs: [
      numberField("children", "Children", { default: 2, min: 0, max: 10, step: 1 }),
      currencyField("clothing", "Clothing & Shoes per Child", { default: 150, max: 10000, step: 5 }),
      currencyField("supplies", "School Supplies per Child", { default: 100, max: 10000, step: 5 }),
      currencyField("tech", "Electronics per Child", { default: 150, max: 10000, step: 5, required: false }),
      currencyField("fees", "Fees, Sports & Activities per Child", { default: 120, max: 10000, step: 5, required: false }),
      numberField("monthsToSave", "Months Until School Starts", { default: 3, min: 1, max: 12, step: 1 }),
    ],
    calcResult: { label: "Total Back-to-School Budget", format: "currency" },
    calcResults: [
      { key: "perChild", label: "Per Child", format: "currency" },
      { key: "totalBudget", label: "Total Back-to-School Budget", format: "currency", highlight: true },
      { key: "monthlySavingsNeeded", label: "Save per Month", format: "currency" },
      { key: "weeklySavingsNeeded", label: "Save per Week", format: "currency" },
    ],
    instructions:
      "Get the school's supply list first, check what you already have, and shop during sales-tax holidays if your state " +
      "has one. Spreading purchases over a few months — and saving a little each week — avoids a big hit in August.\n\n" +
      "Enter typical costs per child; adjust for older kids, who usually cost more.",
    examples:
      "Example: $520 per child for 2 children is a $1,040 back-to-school budget. Starting 3 " +
      "months ahead, that's $346.67 a month or about $80.06 a week.",
    assumptions:
      "Same costs for each child. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much do families spend on back-to-school?",
        answer: "National surveys put it at roughly $500–$900 per K-12 child, with electronics the biggest swing; college students spend much more.",
      },
    ],
  },
  {
    slug: "new-baby-budget-calculator",
    title: "New Baby Budget Calculator",
    description: "Estimate what a new baby costs in the first year — diapers, formula, childcare, gear and medical bills — and how much to save each month before the due date.",
    metaTitle: "New Baby Budget Calculator — First-Year Costs",
    metaDescription: "Free new baby budget calculator. Estimate first-year costs for diapers, formula, childcare, gear and medical bills, and what to save before birth.",
    calcInputs: [
      currencyField("diapers", "Diapers & Wipes per Month", { default: 80, max: 10000, step: 5 }),
      currencyField("formula", "Formula & Food per Month (0 If Breastfeeding)", { default: 150, max: 10000, step: 5, required: false }),
      currencyField("childcare", "Childcare per Month", { default: 1200, max: 100000, step: 25, required: false }),
      currencyField("otherMonthly", "Clothes & Other per Month", { default: 100, max: 10000, step: 5, required: false }),
      currencyField("gear", "One-Time Gear (Crib, Car Seat, Stroller)", { default: 1500, max: 100000, step: 50 }),
      currencyField("medical", "Out-of-Pocket Medical", { default: 1000, max: 100000, step: 50, required: false }),
      numberField("monthsUntilDue", "Months Until the Due Date", { default: 6, min: 1, max: 12, step: 1 }),
    ],
    calcResult: { label: "First-Year Total", format: "currency" },
    calcResults: [
      { key: "monthlyOngoingCost", label: "Monthly Ongoing Cost", format: "currency" },
      { key: "oneTimeCosts", label: "One-Time Costs", format: "currency" },
      { key: "firstYearTotal", label: "First-Year Total", format: "currency", highlight: true },
      { key: "saveMonthlyBeforeBirth", label: "Save per Month Before Birth (One-Time Costs)", format: "currency" },
    ],
    instructions:
      "Childcare is usually the biggest new cost; diapers, formula and gear add up too. Borrowing or buying used gear " +
      "(except car seats) and registering for a baby shower cut the one-time costs. For delivery costs, see the pregnancy " +
      "and delivery cost calculator.\n\n" +
      "Enter monthly costs and one-time purchases; the savings figure covers the one-time costs before the baby arrives.",
    examples:
      "Example: $1,530 a month in ongoing costs plus $2,500 for gear and medical bills makes a " +
      "$20,860 first year. Saving $416.67 a month for 6 months covers the one-time costs.",
    assumptions:
      "Costs stay level through the year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does a new baby change my taxes?",
        answer: "Usually yes — the child tax credit, possibly the child care credit, and a new dependent for health insurance. Update your W-4 after the birth.",
      },
    ],
  },
  {
    slug: "pregnancy-and-delivery-cost-budget-calculator",
    title: "Pregnancy and Delivery Cost Budget Calculator",
    description: "Estimate your out-of-pocket cost for prenatal care and delivery under your health insurance — deductible, coinsurance and out-of-pocket maximum — plus income lost to unpaid leave.",
    metaTitle: "Pregnancy & Delivery Cost Calculator — Out-of-Pocket",
    metaDescription: "Free pregnancy and delivery cost calculator. Estimate your out-of-pocket costs with insurance, plus unpaid leave, and what to save each month.",
    calcInputs: [
      currencyField("billed", "Total Billed for Prenatal Care & Delivery", { default: 20000, max: 1000000, step: 500 }),
      currencyField("deductible", "Deductible", { default: 3000, max: 100000, step: 100 }),
      percentField("coinsurancePercent", "Coinsurance", { default: 20, max: 100, step: 5 }),
      currencyField("oopMax", "Out-of-Pocket Maximum", { default: 7000, max: 100000, step: 100 }),
      currencyField("alreadyPaid", "Already Paid Toward the Max This Year", { default: 0, max: 100000, step: 100, required: false }),
      numberField("unpaidLeaveWeeks", "Weeks of Unpaid Leave", { default: 4, min: 0, max: 52, step: 1, required: false }),
      currencyField("weeklyPay", "Weekly Take-Home Pay", { default: 1200, max: 100000, step: 25, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "outOfPocketMedical", label: "Your Medical Out-of-Pocket", format: "currency" },
      { key: "insurancePays", label: "Insurance Pays", format: "currency" },
      { key: "lostIncome", label: "Income Lost to Unpaid Leave", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
      { key: "saveMonthlyOver9Months", label: "Save per Month Over 9 Months", format: "currency" },
    ],
    instructions:
      "With insurance, a typical birth costs you the deductible plus coinsurance, up to your plan's out-of-pocket maximum. " +
      "If the pregnancy spans two plan years, you may pay a deductible in each. Ask your provider for a cost estimate and " +
      "your insurer about prior authorization.\n\n" +
      "Check whether your state or employer offers paid family leave; enter only the weeks you won't be paid.",
    examples:
      "Example: $20,000 billed with a $3,000 deductible and 20% coinsurance means you pay " +
      "$6,400. Adding $4,800 of unpaid leave, the total is $11,200 — about $1,244.44 a " +
      "month over 9 months.",
    assumptions:
      "In-network care; the baby's own hospital charges may be billed separately. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I use an HSA or FSA for delivery costs?",
        answer: "Yes — prenatal care, delivery and many supplies are qualified medical expenses, so paying from an HSA or FSA saves tax.",
      },
    ],
  },
  {
    slug: "homeschool-cost-budget-calculator",
    title: "Homeschool Cost Budget Calculator",
    description: "Estimate the yearly cost of homeschooling — curriculum, classes and co-ops, supplies and field trips — per child and in total, including any income given up.",
    metaTitle: "Homeschool Cost Calculator — Yearly Cost per Child",
    metaDescription: "Free homeschool cost calculator. Estimate curriculum, classes, supplies and field trips per child and in total, plus any lost income.",
    calcInputs: [
      numberField("children", "Children Homeschooled", { default: 2, min: 1, max: 10, step: 1 }),
      currencyField("curriculum", "Curriculum per Child per Year", { default: 600, max: 100000, step: 25 }),
      currencyField("classes", "Classes, Co-ops & Tutoring per Child", { default: 500, max: 100000, step: 25, required: false }),
      currencyField("supplies", "Supplies & Books per Child", { default: 200, max: 100000, step: 25, required: false }),
      currencyField("sharedCosts", "Shared Costs (Field Trips, Memberships)", { default: 400, max: 100000, step: 25, required: false }),
      currencyField("lostIncome", "Income Given Up by the Teaching Parent (Yearly)", { default: 0, max: 10000000, step: 1000, required: false }),
    ],
    calcResult: { label: "Direct Cost per Year", format: "currency" },
    calcResults: [
      { key: "directCostPerYear", label: "Direct Cost per Year", format: "currency", highlight: true },
      { key: "costPerChild", label: "Cost per Child", format: "currency" },
      { key: "monthlyCost", label: "Monthly Cost", format: "currency" },
      { key: "totalWithLostIncome", label: "Total Including Lost Income", format: "currency" },
    ],
    instructions:
      "Homeschool costs range from a few hundred dollars a year using free and library resources to several thousand with " +
      "boxed curricula, online classes and tutors. The biggest cost is often indirect: a parent working less.\n\n" +
      "Some states offer education savings accounts or tax credits for homeschool costs; 529 plans generally can't be used " +
      "for homeschool expenses.",
    examples:
      "Example: homeschooling 2 children with $600 of curriculum, $500 of classes and $200 of " +
      "supplies each, plus $400 of shared costs, costs $3,000 a year — $1,500 per child.",
    assumptions:
      "Costs per child are the same for each child. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is homeschooling cheaper than private school?",
        answer: "In direct costs, almost always. Include any lost income from a parent working less to compare fairly.",
      },
    ],
  },
  {
    slug: "private-school-tuition-budget-calculator",
    title: "Private School Tuition Budget Calculator",
    description: "Project private K-12 school costs with yearly tuition increases, fees and financial aid — first-year and total cost — and how much a 529 plan can cover tax-free.",
    metaTitle: "Private School Tuition Calculator — Total K-12 Cost",
    metaDescription: "Free private school tuition calculator. Project tuition with yearly increases, fees and aid, total cost, and tax-free 529 withdrawals.",
    calcInputs: [
      currencyField("tuition", "Tuition This Year", { default: 18000, max: 1000000, step: 500 }),
      currencyField("fees", "Fees, Books & Uniforms", { default: 1500, max: 100000, step: 100, required: false }),
      percentField("increasePercent", "Yearly Increase", { default: 4, max: 15, step: 0.5 }),
      numberField("years", "Years of Private School", { default: 6, min: 1, max: 13, step: 1 }),
      numberField("children", "Children", { default: 1, min: 1, max: 10, step: 1 }),
      percentField("aidPercent", "Financial Aid or Scholarship", { default: 0, max: 100, step: 5, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "firstYearCost", label: "First-Year Cost", format: "currency" },
      { key: "monthlyFirstYear", label: "Monthly (First Year)", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
      { key: "averageYearlyCost", label: "Average Yearly Cost", format: "currency" },
      { key: "taxFree529WithdrawalPerYear", label: "Tuition a 529 Can Cover Tax-Free (Yearly)", format: "currency" },
    ],
    instructions:
      "Private school tuition typically rises 3–5% a year. Enter today's tuition, fees and any aid, and how many years your " +
      "child will attend.\n\n" +
      "From 2026, up to $20,000 a year per student can be withdrawn tax-free from a 529 plan for K-12 tuition and related " +
      "costs (it was $10,000); some states also give a state tax deduction for contributions.",
    examples:
      "Example: $18,000 of tuition plus $1,500 of fees, rising 4% a year for 6 years, totals " +
      "$129,343.02 — $19,500 in the first year ($1,625 a month).",
    assumptions:
      "Same increase every year; aid applies to tuition and fees. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do private schools offer payment plans?",
        answer: "Most offer monthly or semester plans, sometimes for a small fee. Paying in full can earn a discount.",
      },
    ],
  },
  {
    slug: "summer-camp-cost-budget-calculator",
    title: "Summer Camp Cost Budget Calculator",
    description: "Budget for summer camp: weeks of camp for each child with sibling discounts and extras, the child care credit for day camps, and the monthly savings needed.",
    metaTitle: "Summer Camp Cost Calculator — Weekly Camp Budget",
    metaDescription: "Free summer camp cost calculator. Total weeks of camp for your kids with discounts and extras, the care credit, and what to save monthly.",
    calcInputs: [
      numberField("children", "Children", { default: 2, min: 1, max: 10, step: 1 }),
      numberField("weeks", "Weeks of Camp", { default: 6, min: 0, max: 12, step: 1 }),
      currencyField("costPerWeek", "Camp Cost per Week (One Child)", { default: 350, max: 10000, step: 10 }),
      currencyField("extrasPerWeek", "Extras per Child per Week (Lunch, Aftercare)", { default: 40, max: 1000, step: 5, required: false }),
      percentField("siblingDiscountPercent", "Sibling Discount", { default: 5, max: 50, step: 1, required: false }),
      percentField("creditRatePercent", "Child Care Credit Rate (Day Camp Only)", { default: 20, max: 50, step: 1, required: false }),
      numberField("monthsToSave", "Months to Save Beforehand", { default: 5, min: 1, max: 12, step: 1 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
      { key: "costPerChild", label: "Cost per Child", format: "currency" },
      { key: "dayCampCareCredit", label: "Child Care Credit (Day Camp)", format: "currency" },
      { key: "netCost", label: "Net Cost After Credit", format: "currency" },
      { key: "monthlySavingsNeeded", label: "Save per Month", format: "currency" },
    ],
    instructions:
      "Summer camp costs range from community day camps to pricey overnight camps. If both parents work, day camp counts " +
      "as child care: it qualifies for the child and dependent care credit and a dependent care FSA. Overnight camp " +
      "doesn't.\n\n" +
      "Enter weeks and prices; set the credit rate to 0 for overnight camp.",
    examples:
      "Example: 6 weeks of day camp at $350 for 2 children, with a sibling discount and extras, costs " +
      "$4,575. The child care credit gives back $819, for a net $3,756 — save $915 a " +
      "month for 5 months.",
    assumptions:
      "Credit on camp fees up to the $3,000 / $6,000 expense limit, before any FSA use. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I make summer camp cheaper?",
        answer: "Register early for discounts, look at city recreation and YMCA programs, ask about financial aid, and use a dependent care FSA for day camps.",
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
