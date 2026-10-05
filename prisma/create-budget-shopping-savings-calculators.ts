// One-time (but safe to re-run) batch setup script: creates the Shopping Savings tools
// (8) of the Budget Calculators expansion, filed under Budget Calculators >
// Money-Saving & Spending Calculators (both categories are created on first run).
// See src/lib/calc-engine-budget-shopping-savings.ts for the math and
// src/lib/calc-engine-budget-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-budget-shopping-savings-calculators.ts
// or
//   npm run db:create-budget-shopping-savings-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Budget Calculators", slug: "budget-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Money-Saving & Spending Calculators", slug: "money-saving-calculators" };

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
    slug: "buy-in-bulk-savings-estimate-calculator",
    title: "Buy-in-Bulk Savings Estimate Calculator",
    description: "Find out if buying in bulk really saves money: unit prices, savings per unit, and yearly savings after a warehouse club membership and any waste.",
    metaTitle: "Buy in Bulk Calculator — Unit Price & Yearly Savings",
    metaDescription: "Free buy-in-bulk calculator. Compare unit prices and see yearly savings after a warehouse membership fee and waste.",
    calcInputs: [
      currencyField("bulkPrice", "Bulk Package Price", { default: 24, max: 100000, step: 0.25 }),
      numberField("bulkUnits", "Units in Bulk Package", { default: 48, min: 1, max: 100000, step: 1 }),
      currencyField("regularPrice", "Regular Package Price", { default: 4.5, max: 100000, step: 0.25 }),
      numberField("regularUnits", "Units in Regular Package", { default: 6, min: 1, max: 100000, step: 1 }),
      numberField("bulkBuysPerYear", "Bulk Purchases per Year", { default: 12, min: 0, max: 365, step: 1 }),
      percentField("wastePercent", "Share That Goes to Waste", { default: 5, max: 100, step: 1, required: false }),
      currencyField("membership", "Warehouse Membership Fee (Yearly)", { default: 65, max: 10000, step: 1, required: false }),
    ],
    calcResult: { label: "Net Yearly Savings", format: "currency" },
    calcResults: [
      { key: "bulkUnitPrice", label: "Bulk Unit Price", format: "currency" },
      { key: "regularUnitPrice", label: "Regular Unit Price", format: "currency" },
      { key: "savingsPerUnitPercent", label: "Savings per Unit", format: "percentage" },
      { key: "yearlySavingsBeforeMembership", label: "Yearly Savings Before Membership", format: "currency" },
      { key: "netYearlySavings", label: "Net Yearly Savings", format: "currency", highlight: true },
    ],
    instructions:
      "Bulk buying saves money only on things you'll use before they spoil and have room to store. Compare unit prices " +
      "(price ÷ units), subtract any waste, and remember the membership fee only pays off if you buy enough.\n\n" +
      "Enter one product you buy regularly; repeat for others and add the savings up.",
    examples:
      "Example: a $24 pack of 48 costs $0.50 a unit versus $0.75 in a regular pack — " +
      "33.33% less. Buying it 12 times a year saves $122.40, or " +
      "$57.40 after the membership fee.",
    assumptions:
      "Wasted units would otherwise not have been bought. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's worth buying in bulk?",
        answer: "Non-perishables you use steadily — paper goods, cleaning supplies, rice, canned goods, coffee — and freezer-friendly meat. Skip fresh produce and condiments that expire.",
      },
    ],
  },
  {
    slug: "coupon-and-discount-savings-tracker-calculator",
    title: "Coupon and Discount Savings Tracker Calculator",
    description: "Estimate yearly savings from coupons, cash back and timing big purchases for seasonal sales — and how much you save per hour of effort.",
    metaTitle: "Coupon Savings Calculator — Coupons, Cash Back & Sales",
    metaDescription: "Free coupon and discount calculator. Estimate yearly savings from coupons, cash back and seasonal sales, and your savings per hour.",
    calcInputs: [
      currencyField("weeklySpend", "Weekly Shopping Spend", { default: 200, max: 100000, step: 5 }),
      percentField("couponPercent", "Saved With Coupons & Store Deals", { default: 8, max: 50, step: 0.5 }),
      percentField("cashBackPercent", "Cash Back (Card or App)", { default: 2, max: 10, step: 0.25, required: false }),
      currencyField("bigPurchasesYearly", "Big Purchases per Year (Electronics, Appliances)", { default: 1500, max: 1000000, step: 50, required: false }),
      percentField("saleTimingPercent", "Saved by Waiting for Seasonal Sales", { default: 20, max: 70, step: 1, required: false }),
      numberField("hoursPerWeek", "Hours per Week Spent on Deals", { default: 1, min: 0, max: 40, step: 0.25 }),
    ],
    calcResult: { label: "Total Yearly Savings", format: "currency" },
    calcResults: [
      { key: "couponSavings", label: "Coupon & Deal Savings", format: "currency" },
      { key: "cashBackEarned", label: "Cash Back", format: "currency" },
      { key: "saleTimingSavings", label: "Seasonal Sale Savings", format: "currency" },
      { key: "totalYearlySavings", label: "Total Yearly Savings", format: "currency", highlight: true },
      { key: "savingsPerHour", label: "Savings per Hour of Effort", format: "currency" },
    ],
    instructions:
      "Digital coupons, store loyalty deals, cash-back apps and timing big purchases for known sale periods (holiday " +
      "weekends, Black Friday, end-of-season clearances) all add up. Savings only count if you'd have bought the item anyway.\n\n" +
      "The savings-per-hour figure shows whether the effort is worth it to you.",
    examples:
      "Example: on $200 a week, coupons save $832 a year and 2% cash back adds " +
      "$191.36. Waiting for sales on $1,500 of big purchases saves $300 — $1,323.36 " +
      "in all, about $25.45 per hour of effort.",
    assumptions:
      "Cash back on spending after coupons. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When are the best seasonal sales?",
        answer: "Electronics and TVs around Black Friday and Super Bowl season, appliances on holiday weekends (Memorial Day, Labor Day), and clothing at the end of each season.",
      },
    ],
  },
  {
    slug: "loyalty-points-value-estimator-calculator",
    title: "Loyalty Points Value Estimator Calculator",
    description: "Find what your loyalty, airline or credit card points are worth in cash versus their best redemption, and the value of the points you earn each year.",
    metaTitle: "Points Value Calculator — Loyalty & Reward Points Worth",
    metaDescription: "Free loyalty points value calculator. See what your points are worth as cash and at their best redemption, plus yearly earnings value.",
    calcInputs: [
      numberField("points", "Points or Miles Balance", { default: 50000, min: 0, max: 100000000, step: 100 }),
      numberField("cashCentsPerPoint", "Cash Value (Cents per Point)", { default: 1, min: 0, max: 10, step: 0.05 }),
      numberField("bestCentsPerPoint", "Best Redemption Value (Cents per Point)", { default: 1.5, min: 0, max: 10, step: 0.05 }),
      numberField("yearlyPointsEarned", "Points Earned per Year", { default: 30000, min: 0, max: 100000000, step: 100, required: false }),
    ],
    calcResult: { label: "Best Redemption Value", format: "currency" },
    calcResults: [
      { key: "cashValue", label: "Cash Value", format: "currency" },
      { key: "bestRedemptionValue", label: "Best Redemption Value", format: "currency", highlight: true },
      { key: "extraFromBestRedemption", label: "Extra From Best Redemption", format: "currency" },
      { key: "yearlyEarningsValue", label: "Value of Points Earned per Year", format: "currency" },
    ],
    instructions:
      "Points are worth different amounts depending on how you use them. Cash back or statement credits are usually about 1 " +
      "cent per point; travel transfers can be worth more, while gift cards and merchandise are often worth less. To find " +
      "a redemption's value, divide its cash price by the points needed.\n\n" +
      "Points can expire or be devalued, so don't hoard them indefinitely.",
    examples:
      "Example: 50,000 points are worth $500 as cash at 1¢ each, or $750 at " +
      "1.50¢ through the best redemption — $250 more. The points you earn each year are worth " +
      "about $450.",
    assumptions:
      "Values per point as entered. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are points taxable?",
        answer: "Credit card rewards earned from spending are generally treated as a rebate, not income. Points from bank sign-up bonuses without spending may be taxable.",
      },
    ],
  },
  {
    slug: "credit-card-rewards-optimization-calculator",
    title: "Credit Card Rewards Optimization Calculator",
    description: "Compare a flat-rate cash-back card with a category rewards card based on your spending, net of annual fees — and the rewards from using both together.",
    metaTitle: "Credit Card Rewards Calculator — Best Card for Spending",
    metaDescription: "Free credit card rewards calculator. Compare flat-rate and category cards on your spending, net of annual fees, and the best combination.",
    calcInputs: [
      currencyField("groceries", "Groceries per Month", { default: 600, max: 100000, step: 25 }),
      currencyField("dining", "Dining per Month", { default: 300, max: 100000, step: 25 }),
      currencyField("gas", "Gas & Transit per Month", { default: 200, max: 100000, step: 25 }),
      currencyField("other", "Everything Else per Month", { default: 1500, max: 1000000, step: 25 }),
      percentField("flatRatePercent", "Flat-Rate Card: Rewards Rate", { default: 2, max: 10, step: 0.25 }),
      currencyField("flatFee", "Flat-Rate Card: Annual Fee", { default: 0, max: 1000, step: 5, required: false }),
      percentField("groceryRatePercent", "Category Card: Groceries", { default: 4, max: 10, step: 0.25 }),
      percentField("diningRatePercent", "Category Card: Dining", { default: 4, max: 10, step: 0.25 }),
      percentField("gasRatePercent", "Category Card: Gas", { default: 3, max: 10, step: 0.25 }),
      percentField("otherRatePercent", "Category Card: Everything Else", { default: 1, max: 10, step: 0.25 }),
      currencyField("categoryFee", "Category Card: Annual Fee", { default: 95, max: 1000, step: 5, required: false }),
    ],
    calcResult: { label: "Both Cards Together (Net)", format: "currency" },
    calcResults: [
      { key: "yearlySpending", label: "Yearly Card Spending", format: "currency" },
      { key: "flatCardNetRewards", label: "Flat-Rate Card (Net)", format: "currency" },
      { key: "categoryCardNetRewards", label: "Category Card (Net)", format: "currency" },
      { key: "categoryCardAdvantage", label: "Category Card Advantage", format: "currency" },
      { key: "comboNetRewards", label: "Both Cards Together (Net)", format: "currency", highlight: true },
    ],
    instructions:
      "A flat-rate card earns the same on everything; a category card earns more on groceries, dining or gas but less " +
      "elsewhere, often with an annual fee. Using the category card for its bonus categories and the flat card for " +
      "everything else usually earns the most.\n\n" +
      "Rewards are only worth it if you pay the balance in full each month — interest wipes them out quickly.",
    examples:
      "Example: on $31,200 a year, the flat-rate card earns $624 and the category card " +
      "$589 after its fee. Using each card where it pays most earns $769 a year.",
    assumptions:
      "Rewards valued at 1 cent per point; bonus caps and sign-up bonuses not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is an annual-fee card worth it?",
        answer: "If its extra rewards beat the fee at your spending level. A negative advantage here means a no-fee flat card is the better single choice.",
      },
    ],
  },
  {
    slug: "grocery-delivery-vs-in-store-cost-calculator",
    title: "Grocery Delivery vs In-Store Cost Calculator",
    description: "Compare grocery delivery — fees, item markups and tips — with shopping in person, including driving costs, impulse buys and the value of your time.",
    metaTitle: "Grocery Delivery vs In-Store Calculator — True Cost",
    metaDescription: "Free grocery delivery calculator. Compare delivery fees, markups and tips with driving, impulse buys and time spent shopping in store.",
    calcInputs: [
      currencyField("weeklyGroceries", "Weekly Grocery Bill", { default: 200, max: 100000, step: 5 }),
      numberField("ordersPerWeek", "Orders or Trips per Week", { default: 1, min: 0, max: 14, step: 1 }),
      currencyField("deliveryFee", "Delivery Fee per Order", { default: 6, max: 100, step: 0.5, required: false }),
      percentField("serviceFeePercent", "Service Fee", { default: 5, max: 30, step: 0.5, required: false }),
      percentField("markupPercent", "Item Price Markup", { default: 8, max: 30, step: 0.5, required: false }),
      currencyField("tip", "Tip per Order", { default: 8, max: 100, step: 1, required: false }),
      currencyField("membershipYearly", "Delivery Membership (Yearly)", { default: 0, max: 1000, step: 1, required: false }),
      numberField("milesRoundTrip", "Round-Trip Miles to the Store", { default: 6, min: 0, max: 200, step: 1 }),
      currencyField("costPerMile", "Driving Cost per Mile", { default: 0.7, max: 5, step: 0.01 }),
      percentField("impulsePercent", "Extra Impulse Buys In Store", { default: 10, max: 50, step: 1, required: false }),
      numberField("minutesPerTrip", "Minutes per Store Trip", { default: 60, min: 0, max: 600, step: 5 }),
      currencyField("hourlyValue", "Value of Your Time per Hour", { default: 20, max: 1000, step: 1, required: false }),
    ],
    calcResult: { label: "Delivery Costs More by (per Year)", format: "currency" },
    calcResults: [
      { key: "deliveryExtraCostPerYear", label: "Delivery Extra Costs per Year", format: "currency" },
      { key: "inStoreExtraCostPerYear", label: "In-Store Extra Costs per Year", format: "currency" },
      { key: "deliveryCostsMoreBy", label: "Delivery Costs More by (per Year)", format: "currency", highlight: true },
      { key: "valueOfTimeSaved", label: "Value of Time Saved", format: "currency" },
      { key: "netCostOfDeliveryAfterTime", label: "Net Cost After Valuing Time", format: "currency" },
    ],
    instructions:
      "Delivery adds fees, a tip and often higher item prices than in store. Shopping yourself costs driving and time — " +
      "and many people buy more on impulse in the aisles. Pickup orders are a middle ground: store prices, no tip, little " +
      "impulse buying.\n\n" +
      "A negative net cost means delivery is worth it once your time is counted.",
    examples:
      "Example: on $200 a week, delivery adds $2,080 a year in fees, markups and tips, while " +
      "shopping in person adds $1,258.40 in driving and impulse buys. Delivery costs $821.60 more, " +
      "but saves time worth $1,040.",
    assumptions:
      "52 weeks a year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a delivery membership worth it?",
        answer: "It waives delivery fees, so it pays off if you order often enough that the saved fees exceed the yearly price — but markups and tips still apply.",
      },
    ],
  },
  {
    slug: "meal-prep-vs-takeout-cost-savings-calculator",
    title: "Meal Prep vs Takeout Cost Savings Calculator",
    description: "See how much you save by meal prepping instead of buying takeout or lunch out — per week, month and year, and per hour spent cooking.",
    metaTitle: "Meal Prep vs Takeout Calculator — Weekly Savings",
    metaDescription: "Free meal prep savings calculator. Compare takeout with meal prep per meal and see weekly, yearly and per-hour savings.",
    calcInputs: [
      numberField("mealsPerWeek", "Meals per Week Replaced", { default: 10, min: 0, max: 42, step: 1 }),
      currencyField("takeoutPerMeal", "Takeout or Lunch Out per Meal", { default: 15, max: 500, step: 0.5 }),
      currencyField("prepPerMeal", "Meal Prep Cost per Meal", { default: 4.5, max: 500, step: 0.25 }),
      numberField("prepHoursPerWeek", "Prep & Cleanup Hours per Week", { default: 3, min: 0, max: 40, step: 0.5 }),
    ],
    calcResult: { label: "Yearly Savings", format: "currency" },
    calcResults: [
      { key: "weeklySavings", label: "Weekly Savings", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "yearlySavings", label: "Yearly Savings", format: "currency", highlight: true },
      { key: "savingsPerHourOfPrep", label: "Savings per Hour of Prep", format: "currency" },
    ],
    instructions:
      "Cooking a batch of meals once or twice a week costs a fraction of takeout. Enter how many meals you'd swap and the " +
      "cost of each; the per-hour figure shows what your prep time is \"paying\" you.",
    examples:
      "Example: replacing 10 takeout meals at $15 with prepped meals at $4.50 saves " +
      "$105 a week — $5,460 a year, or $35 for each hour of prep.",
    assumptions:
      "52 weeks a year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How long does meal prep last?",
        answer: "Most cooked meals keep 3–4 days in the fridge; freeze portions for later in the week.",
      },
    ],
  },
  {
    slug: "diy-vs-professional-service-cost-savings-calculator",
    title: "DIY vs Professional Service Cost Savings Calculator",
    description: "Decide whether to do a project yourself or hire a pro: DIY cash cost with materials, tools and a rework allowance, your time, and the effective hourly pay you earn.",
    metaTitle: "DIY vs Hiring a Pro Calculator — Is It Worth It",
    metaDescription: "Free DIY vs professional calculator. Compare a quote with materials, tools and your time, and see the effective hourly pay of doing it yourself.",
    calcInputs: [
      currencyField("proQuote", "Professional Quote", { default: 2000, max: 10000000, step: 50 }),
      currencyField("materials", "Materials", { default: 700, max: 10000000, step: 25 }),
      currencyField("tools", "Tools to Buy or Rent", { default: 250, max: 1000000, step: 10, required: false }),
      numberField("hours", "Your Hours", { default: 20, min: 0, max: 10000, step: 1 }),
      currencyField("hourlyValue", "Value of Your Time per Hour", { default: 30, max: 10000, step: 1, required: false }),
      percentField("reworkRiskPercent", "Allowance for Mistakes & Rework", { default: 10, max: 100, step: 5, required: false }),
    ],
    calcResult: { label: "Effective Hourly Pay for DIY", format: "currency" },
    calcResults: [
      { key: "diyCashCost", label: "DIY Cash Cost", format: "currency" },
      { key: "cashSavings", label: "Cash Savings", format: "currency" },
      { key: "diyCostIncludingTime", label: "DIY Cost Including Your Time", format: "currency" },
      { key: "savingsIncludingTime", label: "Savings Including Your Time", format: "currency" },
      { key: "effectiveHourlyPay", label: "Effective Hourly Pay for DIY", format: "currency", highlight: true },
    ],
    instructions:
      "DIY saves the labor part of a quote but costs your time, tools and the risk of mistakes. If the effective hourly pay " +
      "beats what your time is worth — and you have the skills — DIY makes sense.\n\n" +
      "Leave electrical, gas, structural and roofing work to licensed pros; mistakes can be dangerous and costly, and may " +
      "need permits.",
    examples:
      "Example: a $2,000 quote versus $700 of materials and $250 of tools (plus a 10% allowance) " +
      "means DIY costs $1,045 — $955 less. Over 20 hours, that's $47.75 an hour for your work.",
    assumptions:
      "Tools have no resale value. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which projects are best for DIY?",
        answer: "Painting, landscaping, simple repairs and assembly — lots of labor, little risk, cheap tools.",
      },
    ],
  },
  {
    slug: "recurring-bill-negotiation-savings-calculator",
    title: "Recurring Bill Negotiation Savings Calculator",
    description: "Estimate how much you could save by negotiating internet, phone, insurance, TV and other recurring bills — expected monthly and yearly savings.",
    metaTitle: "Bill Negotiation Savings Calculator — Lower Your Bills",
    metaDescription: "Free bill negotiation calculator. Estimate savings from negotiating internet, phone, insurance and TV bills each month and year.",
    calcInputs: [
      currencyField("internet", "Internet", { default: 80, max: 10000, step: 1, required: false }),
      currencyField("phone", "Phone", { default: 100, max: 10000, step: 1, required: false }),
      currencyField("insurance", "Car & Home Insurance (Monthly)", { default: 180, max: 10000, step: 1, required: false }),
      currencyField("tv", "TV or Streaming Bundle", { default: 90, max: 10000, step: 1, required: false }),
      currencyField("other", "Other Recurring Bills", { default: 50, max: 10000, step: 1, required: false }),
      percentField("reductionPercent", "Typical Reduction If Successful", { default: 15, max: 80, step: 1 }),
      percentField("successPercent", "Share of Bills You Expect to Lower", { default: 60, max: 100, step: 5 }),
    ],
    calcResult: { label: "Expected Yearly Savings", format: "currency" },
    calcResults: [
      { key: "monthlyBills", label: "Monthly Bills", format: "currency" },
      { key: "monthlySavingsIfAllSucceed", label: "Monthly Savings If All Succeed", format: "currency" },
      { key: "expectedMonthlySavings", label: "Expected Monthly Savings", format: "currency" },
      { key: "expectedYearlySavings", label: "Expected Yearly Savings", format: "currency", highlight: true },
    ],
    instructions:
      "Providers often keep their best prices for new customers. Calling the retention or loyalty department, mentioning a " +
      "competitor's offer, or asking about promotions can lower internet, phone and TV bills; shopping insurance every year " +
      "or two often saves more.\n\n" +
      "Enter your bills and a realistic success rate.",
    examples:
      "Example: $500 of monthly bills cut by 15% would save $75 a month. If " +
      "60% of them work out, expect about $45 a month — $540 a year.",
    assumptions:
      "Lower prices last a full year; promotions may end and need renegotiating. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are bill negotiation services worth it?",
        answer: "They charge a share of the savings (often 30–50% of the first year). Calling yourself keeps all the savings and usually takes under an hour per bill.",
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
