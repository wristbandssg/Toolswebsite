// One-time (but safe to re-run) batch setup script: creates the Household Bill tools
// (7) of the Budget Calculators expansion, filed under Budget Calculators >
// Household & Family Expense Calculators (both categories are created on first run).
// See src/lib/calc-engine-budget-household-bills.ts for the math and
// src/lib/calc-engine-budget-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-budget-household-bills-calculators.ts
// or
//   npm run db:create-budget-household-bills-calculators

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
    slug: "grocery-budget-calculator",
    title: "Grocery Budget Calculator",
    description: "Set a weekly and monthly grocery budget for your household based on the number of adults and children, and see your cost per home-cooked meal.",
    metaTitle: "Grocery Budget Calculator — Weekly & Monthly Food Budget",
    metaDescription: "Free grocery budget calculator. Set a weekly and monthly grocery budget for your household and see the cost per home-cooked meal.",
    calcInputs: [
      numberField("adults", "Adults", { default: 2, min: 0, max: 20, step: 1 }),
      numberField("children", "Children", { default: 2, min: 0, max: 20, step: 1 }),
      currencyField("weeklyPerAdult", "Weekly Grocery Cost per Adult", { default: 85, max: 10000, step: 5 }),
      percentField("childSharePercent", "Child's Cost vs an Adult's", { default: 70, max: 150, step: 5 }),
      numberField("mealsOutPerWeek", "Meals Eaten Out per Person per Week", { default: 3, min: 0, max: 21, step: 1, required: false }),
    ],
    calcResult: { label: "Monthly Grocery Budget", format: "currency" },
    calcResults: [
      { key: "weeklyGroceryBudget", label: "Weekly Grocery Budget", format: "currency" },
      { key: "monthlyGroceryBudget", label: "Monthly Grocery Budget", format: "currency", highlight: true },
      { key: "yearlyGroceryBudget", label: "Yearly Grocery Budget", format: "currency" },
      { key: "costPerMealAtHome", label: "Cost per Meal at Home", format: "currency" },
    ],
    instructions:
      "Grocery costs depend on where you live and how you shop. The USDA publishes monthly food plans (thrifty, low-cost, " +
      "moderate and liberal) by age; $60–$110 per adult per week covers most budgets, and young children cost less than " +
      "adults while teenagers can cost more.\n\n" +
      "Planning a weekly menu and shopping from a list is the easiest way to stay on budget and cut waste.",
    examples:
      "Example: 2 adults at $85 a week plus 2 children at 70% of that come to " +
      "$289 a week — $1,252.33 a month. That's about $4.01 per meal cooked at home.",
    assumptions:
      "Household items like cleaning supplies and toiletries are not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I lower my grocery bill?",
        answer: "Plan meals around sales, buy store brands, cook in batches, use leftovers, and limit trips to the store — each extra trip invites impulse buys.",
      },
    ],
  },
  {
    slug: "dining-out-budget-calculator",
    title: "Dining Out Budget Calculator",
    description: "See what eating out and takeout cost each month and year, including tips, and how much you'd save by cooking some of those meals at home.",
    metaTitle: "Dining Out Budget Calculator — Restaurant Spending",
    metaDescription: "Free dining out budget calculator. See your monthly and yearly restaurant spending with tips, and the savings from cooking at home.",
    calcInputs: [
      numberField("mealsPerWeek", "Meals Out or Takeout per Week", { default: 3, min: 0, max: 21, step: 1 }),
      numberField("people", "People per Meal", { default: 2, min: 1, max: 20, step: 1 }),
      currencyField("costPerPerson", "Average Cost per Person", { default: 25, max: 1000, step: 1 }),
      percentField("tipPercent", "Tip", { default: 18, max: 40, step: 1, required: false }),
      currencyField("homeCostPerPerson", "Cost per Person to Cook at Home", { default: 5, max: 100, step: 0.5 }),
      percentField("shareCookedAtHomePercent", "Share of Meals Out You'd Cook Instead", { default: 50, max: 100, step: 5 }),
    ],
    calcResult: { label: "Monthly Dining Cost", format: "currency" },
    calcResults: [
      { key: "costPerMealOut", label: "Cost per Meal Out (With Tip)", format: "currency" },
      { key: "monthlyDiningCost", label: "Monthly Dining Cost", format: "currency", highlight: true },
      { key: "yearlyDiningCost", label: "Yearly Dining Cost", format: "currency" },
      { key: "monthlySavingsCookingAtHome", label: "Monthly Savings Cooking at Home", format: "currency" },
      { key: "yearlySavingsCookingAtHome", label: "Yearly Savings Cooking at Home", format: "currency" },
    ],
    instructions:
      "Restaurant meals, takeout and delivery are often the biggest flexible line in a budget. Enter how often you eat out " +
      "and the typical bill per person; for delivery, add the fees and markups into the cost per person.\n\n" +
      "The savings show what happens if you cook a share of those meals instead.",
    examples:
      "Example: eating out 3 times a week for 2 at $25 each plus a 18% tip costs " +
      "$59 a meal — $767 a month. Cooking half of those at home would save about " +
      "$3,822 a year.",
    assumptions:
      "52 weeks a year; taxes included in the cost per person. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much should I spend on dining out?",
        answer: "Many budgets keep restaurants within 5–10% of take-home pay, inside the \"wants\" share of a 50/30/20 budget.",
      },
    ],
  },
  {
    slug: "utility-bill-budget-calculator",
    title: "Utility Bill Budget Calculator",
    description: "Add up your monthly utilities — electricity, gas, water, trash and internet — see the yearly total, a peak-season month, and the share of your income.",
    metaTitle: "Utility Bill Budget Calculator — Monthly Utilities",
    metaDescription: "Free utility budget calculator. Total electricity, gas, water, trash and internet, plan for peak months and see the share of income.",
    calcInputs: [
      currencyField("electricity", "Electricity (Average Month)", { default: 140, max: 10000, step: 5 }),
      currencyField("gas", "Natural Gas or Heating Oil", { default: 60, max: 10000, step: 5, required: false }),
      currencyField("water", "Water & Sewer", { default: 50, max: 10000, step: 5, required: false }),
      currencyField("trash", "Trash & Recycling", { default: 40, max: 10000, step: 5, required: false }),
      currencyField("internet", "Internet", { default: 70, max: 10000, step: 5, required: false }),
      percentField("peakIncreasePercent", "Peak-Season Rise in Energy Bills", { default: 40, max: 300, step: 5 }),
      currencyField("income", "Monthly Take-Home Pay", { default: 5000, max: 10000000, step: 50 }),
    ],
    calcResult: { label: "Monthly Utilities", format: "currency" },
    calcResults: [
      { key: "monthlyUtilities", label: "Monthly Utilities", format: "currency", highlight: true },
      { key: "yearlyUtilities", label: "Yearly Utilities", format: "currency" },
      { key: "peakMonthEstimate", label: "Peak-Season Month", format: "currency" },
      { key: "shareOfIncome", label: "Share of Income", format: "percentage" },
    ],
    instructions:
      "Use a 12-month average for each bill (your utility's online account usually shows it). Heating and cooling make " +
      "energy bills swing by season, so budget for a peak month or ask about budget billing, which spreads costs evenly " +
      "over the year.\n\n" +
      "Typical US households spend roughly 5–10% of take-home pay on utilities.",
    examples:
      "Example: $140 of electricity, $60 of gas, $50 of water, $40 of trash and $70 of internet " +
      "come to $360 a month — $4,320 a year and 7.20% of income. A 40% " +
      "jump in energy use makes a peak month about $440.",
    assumptions:
      "Only energy bills rise in the peak season. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I cut my utility bills?",
        answer: "A smart thermostat, sealing drafts, LED bulbs and low-flow fixtures help; also check for utility rebates and compare internet plans every year or two.",
      },
    ],
  },
  {
    slug: "cell-phone-plan-cost-calculator",
    title: "Cell Phone Plan Cost Calculator",
    description: "Work out the true monthly and yearly cost of your phone plan with device payments, taxes and fees, and how much a cheaper plan would save.",
    metaTitle: "Cell Phone Plan Cost Calculator — True Monthly Cost",
    metaDescription: "Free cell phone plan calculator. See your real monthly cost with device payments, taxes and fees, and the savings from a cheaper plan.",
    calcInputs: [
      numberField("lines", "Lines", { default: 2, min: 1, max: 20, step: 1 }),
      currencyField("planPerLine", "Plan Cost per Line", { default: 45, max: 1000, step: 1 }),
      currencyField("devicePrice", "Phone Price", { default: 900, max: 5000, step: 10, required: false }),
      numberField("devicesFinanced", "Phones Being Paid Off", { default: 2, min: 0, max: 20, step: 1, required: false }),
      numberField("deviceMonths", "Device Payment Term (Months)", { default: 36, min: 1, max: 48, step: 1 }),
      percentField("taxesFeesPercent", "Taxes & Fees", { default: 12, max: 40, step: 1 }),
      currencyField("altPlanPerLine", "Cheaper Plan per Line (e.g., Prepaid or MVNO)", { default: 25, max: 1000, step: 1 }),
    ],
    calcResult: { label: "Total Monthly Cost", format: "currency" },
    calcResults: [
      { key: "monthlyPlanWithTaxes", label: "Plan With Taxes & Fees", format: "currency" },
      { key: "monthlyDevicePayments", label: "Device Payments", format: "currency" },
      { key: "totalMonthlyCost", label: "Total Monthly Cost", format: "currency", highlight: true },
      { key: "yearlyCost", label: "Yearly Cost", format: "currency" },
      { key: "yearlySavingsWithCheaperPlan", label: "Yearly Savings With the Cheaper Plan", format: "currency" },
    ],
    instructions:
      "The advertised price is rarely what you pay: taxes and fees often add 10–20%, and phone installment payments sit on " +
      "the same bill. Prepaid carriers and MVNOs (which run on the big networks) often cost much less for similar coverage, " +
      "especially if you bring your own phone.\n\n" +
      "Enter your plan and devices, and a cheaper plan's price to compare.",
    examples:
      "Example: 2 lines at $45 with 12% in taxes and fees cost $100.80, plus " +
      "$50 for two phones — $150.80 a month. Switching to a $25-a-line plan saves " +
      "$537.60 a year.",
    assumptions:
      "Device payments at 0% interest; the savings compare plan costs only. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is it cheaper to buy a phone outright?",
        answer: "The total is similar at 0% financing, but carrier deals often lock you in. Keeping a phone a year or two longer is the biggest saving.",
      },
    ],
  },
  {
    slug: "gym-membership-cost-calculator",
    title: "Gym Membership Cost Calculator",
    description: "See the real cost of a gym membership with initiation and annual fees, your cost per visit, and whether paying per class or drop-in would be cheaper.",
    metaTitle: "Gym Membership Cost Calculator — Cost per Visit",
    metaDescription: "Free gym membership calculator. See your yearly cost with fees, the cost per visit, and the break-even vs paying per class.",
    calcInputs: [
      currencyField("monthlyFee", "Monthly Fee", { default: 50, max: 1000, step: 1 }),
      currencyField("initiationFee", "Initiation Fee", { default: 99, max: 5000, step: 1, required: false }),
      currencyField("annualFee", "Annual Maintenance Fee", { default: 49, max: 1000, step: 1, required: false }),
      numberField("visitsPerWeek", "Visits per Week", { default: 2.5, min: 0, max: 14, step: 0.5 }),
      currencyField("payPerVisit", "Drop-In or Class Price per Visit", { default: 20, max: 500, step: 1 }),
    ],
    calcResult: { label: "Cost per Visit", format: "currency" },
    calcResults: [
      { key: "firstYearCost", label: "First-Year Cost", format: "currency" },
      { key: "yearlyCostAfter", label: "Yearly Cost After That", format: "currency" },
      { key: "visitsPerYear", label: "Visits per Year", format: "number" },
      { key: "costPerVisit", label: "Cost per Visit", format: "currency", highlight: true },
      { key: "payPerVisitYearlyCost", label: "Paying per Visit Instead (Yearly)", format: "currency" },
      { key: "breakEvenVisitsPerMonth", label: "Visits per Month to Break Even", format: "number" },
    ],
    instructions:
      "A gym membership only pays off if you go. Enter the fees and how often you really visit (check your app or card " +
      "history), plus the price of a drop-in or single class to compare.\n\n" +
      "If you visit fewer times a month than the break-even, paying per visit or a class pass is cheaper. Many employers " +
      "and health insurers offer gym discounts.",
    examples:
      "Example: $50 a month plus a $99 initiation fee and $49 annual fee is $748 in " +
      "the first year. At 2.50 visits a week, that's $5.75 per visit — far less than $20 drop-ins. " +
      "You need about 2.70 visits a month to break even.",
    assumptions:
      "52 weeks a year; the per-visit cost uses first-year costs. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I cancel a gym membership?",
        answer: "Check your contract for notice periods and cancellation fees. A 2024 FTC rule aims to make online subscriptions as easy to cancel as to sign up for, but rules vary.",
      },
    ],
  },
  {
    slug: "subscription-cost-audit-calculator",
    title: "Subscription Cost Audit Calculator",
    description: "Add up streaming, music, gaming, cloud and other subscriptions to see what they cost each month, year and decade — and what you'd save by cancelling ones you rarely use.",
    metaTitle: "Subscription Cost Calculator — Streaming & More",
    metaDescription: "Free subscription audit calculator. Total your streaming, gaming and app subscriptions and see the savings from cancelling unused ones.",
    calcInputs: [
      currencyField("streaming1", "Streaming Service 1", { default: 17.99, max: 1000, step: 0.01, required: false }),
      currencyField("streaming2", "Streaming Service 2", { default: 15.49, max: 1000, step: 0.01, required: false }),
      currencyField("streaming3", "Streaming Service 3", { default: 10.99, max: 1000, step: 0.01, required: false }),
      currencyField("music", "Music", { default: 11.99, max: 1000, step: 0.01, required: false }),
      currencyField("gaming", "Gaming", { default: 9.99, max: 1000, step: 0.01, required: false }),
      currencyField("cloudApps", "Cloud Storage & Apps", { default: 9.99, max: 1000, step: 0.01, required: false }),
      currencyField("newsMagazines", "News & Magazines", { default: 10, max: 1000, step: 0.01, required: false }),
      currencyField("other", "Other Subscriptions", { default: 15, max: 10000, step: 0.01, required: false }),
      currencyField("rarelyUsed", "Monthly Cost of Ones You Rarely Use", { default: 30, max: 10000, step: 1, required: false }),
    ],
    calcResult: { label: "Yearly Total", format: "currency" },
    calcResults: [
      { key: "subscriptionsCounted", label: "Subscriptions", format: "number" },
      { key: "monthlyTotal", label: "Monthly Total", format: "currency" },
      { key: "yearlyTotal", label: "Yearly Total", format: "currency", highlight: true },
      { key: "tenYearTotal", label: "10-Year Total", format: "currency" },
      { key: "yearlySavingsCancellingUnused", label: "Yearly Savings Cancelling Unused Ones", format: "currency" },
    ],
    instructions:
      "Small monthly subscriptions add up, and prices rise every year or two. Go through your bank and card statements (and " +
      "app-store subscriptions) and list each one; convert annual plans to a monthly amount.\n\n" +
      "Rotating streaming services — keeping one or two at a time — is an easy way to cut costs without losing much.",
    examples:
      "Example: 8 subscriptions cost $101.44 a month — $1,217.28 a year, or $12,172.80 over " +
      "ten years. Cancelling $30 a month of rarely used ones saves $360 a year.",
    assumptions:
      "Current prices with no increases. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are annual subscriptions cheaper?",
        answer: "Usually 15–20% cheaper than paying monthly — worth it for services you use all year. See the annual vs monthly subscription savings calculator.",
      },
    ],
  },
  {
    slug: "roommate-expense-split-calculator",
    title: "Roommate Expense Split Calculator",
    description: "Split rent fairly between roommates by bedroom size — with shared space split equally — or evenly, and add utilities to see what each person pays.",
    metaTitle: "Roommate Rent Split Calculator — Fair Share by Room",
    metaDescription: "Free roommate expense split calculator. Divide rent by bedroom size or equally, add utilities, and see what each roommate pays.",
    calcInputs: [
      currencyField("rent", "Total Monthly Rent", { default: 2400, max: 1000000, step: 25 }),
      currencyField("utilities", "Shared Utilities & Internet", { default: 240, max: 100000, step: 5, required: false }),
      {
        key: "method", label: "How to Split Rent", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Equally", value: 1 },
          { label: "By Bedroom Size", value: 2 },
        ],
      },
      numberField("room1", "Bedroom 1 Size (Sq Ft)", { default: 160, min: 0, max: 10000, step: 5 }),
      numberField("room2", "Bedroom 2 Size (Sq Ft)", { default: 130, min: 0, max: 10000, step: 5 }),
      numberField("room3", "Bedroom 3 Size (Sq Ft, 0 If None)", { default: 110, min: 0, max: 10000, step: 5, required: false }),
      percentField("commonSharePercent", "Share of Rent for Shared Space (Split Equally)", { default: 40, max: 100, step: 5 }),
    ],
    calcResult: { label: "Roommate 1 Pays", format: "currency" },
    calcResults: [
      { key: "roommate1Pays", label: "Roommate 1 Pays", format: "currency", highlight: true },
      { key: "roommate2Pays", label: "Roommate 2 Pays", format: "currency" },
      { key: "roommate3Pays", label: "Roommate 3 Pays", format: "currency" },
      { key: "equalShare", label: "Equal Share for Comparison", format: "currency" },
    ],
    instructions:
      "When bedrooms differ, an equal split can feel unfair. A common method splits the part of the rent that pays for " +
      "shared space (kitchen, living room) equally and the rest by bedroom size. Adjust for perks like a private bathroom " +
      "or parking by agreement.\n\n" +
      "Utilities are split equally. Write the agreement down to avoid disputes.",
    examples:
      "Example: $2,400 of rent with 40% for shared space, plus $240 of utilities, means the largest room " +
      "pays $976, the middle $868 and the smallest $796 — versus $880 each if split " +
      "evenly.",
    assumptions:
      "One person per bedroom. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if a couple shares a room?",
        answer: "Many households have the couple pay a larger share of the common-space portion and utilities, since two people use them.",
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
