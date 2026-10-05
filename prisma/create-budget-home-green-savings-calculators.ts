// One-time (but safe to re-run) batch setup script: creates the Home & Green Savings tools
// (6) of the Budget Calculators expansion, filed under Budget Calculators >
// Money-Saving & Spending Calculators (both categories are created on first run).
// See src/lib/calc-engine-budget-home-green-savings.ts for the math and
// src/lib/calc-engine-budget-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-budget-home-green-savings-calculators.ts
// or
//   npm run db:create-budget-home-green-savings-calculators

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
    slug: "second-hand-vs-new-purchase-savings-calculator",
    title: "Second-Hand vs New Purchase Savings Calculator",
    description: "Compare buying new, buying used, or borrowing and renting (library, tool library, sharing apps) by the real cost per year of use.",
    metaTitle: "Used vs New Calculator — Buy, Borrow or Rent",
    metaDescription: "Free second-hand vs new calculator. Compare the yearly cost of buying new, buying used, or borrowing and renting through sharing services.",
    calcInputs: [
      currencyField("newPrice", "New Price", { default: 800, max: 10000000, step: 5 }),
      numberField("newYears", "Years a New One Lasts", { default: 8, min: 0.1, max: 50, step: 0.5 }),
      currencyField("usedPrice", "Used Price", { default: 400, max: 10000000, step: 5 }),
      numberField("usedYears", "Years a Used One Lasts", { default: 5, min: 0.1, max: 50, step: 0.5 }),
      currencyField("borrowCostPerUse", "Rent or Borrow Cost per Use", { default: 15, max: 100000, step: 1, required: false }),
      numberField("usesPerYear", "Uses per Year", { default: 4, min: 0, max: 1000, step: 1 }),
    ],
    calcResult: { label: "Used Savings per Year", format: "currency" },
    calcResults: [
      { key: "newCostPerYear", label: "New: Cost per Year", format: "currency" },
      { key: "usedCostPerYear", label: "Used: Cost per Year", format: "currency" },
      { key: "borrowOrRentCostPerYear", label: "Borrow or Rent: Cost per Year", format: "currency" },
      { key: "usedSavingsPerYear", label: "Used Savings per Year", format: "currency", highlight: true },
      { key: "upfrontSavingsBuyingUsed", label: "Upfront Savings Buying Used", format: "currency" },
    ],
    instructions:
      "Buying used saves upfront, but a shorter life can eat into the savings — compare cost per year. For things you use " +
      "rarely (tools, camping gear, party supplies, books), borrowing from a library or renting is often cheapest of all.\n\n" +
      "Enter prices, how long each would last and how often you'd use it.",
    examples:
      "Example: new at $800 lasting 8 years costs $100 a year; used at $400 lasting " +
      "5 years costs $80. Renting it 4 times a year would cost just $60.",
    assumptions:
      "No resale value or repairs. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's usually worth buying used?",
        answer: "Furniture, tools, sports gear, books, kids' clothes and many electronics. Be careful with car seats, helmets and mattresses.",
      },
    ],
  },
  {
    slug: "energy-efficient-appliance-payback-period-calculator",
    title: "Energy-Efficient Appliance Payback Period Calculator",
    description: "Find out how long an energy-efficient appliance, insulation or other upgrade takes to pay for itself through lower energy bills, and its lifetime savings.",
    metaTitle: "Energy-Efficient Upgrade Payback Calculator",
    metaDescription: "Free energy-efficient upgrade payback calculator. See how long an appliance or insulation upgrade takes to pay off and its lifetime savings.",
    calcInputs: [
      currencyField("upgradeCost", "Upgrade Cost (Installed)", { default: 1200, max: 1000000, step: 25 }),
      currencyField("rebates", "Rebates", { default: 200, max: 1000000, step: 25, required: false }),
      currencyField("oldYearlyEnergy", "Yearly Energy Cost Before", { default: 220, max: 100000, step: 5 }),
      currencyField("newYearlyEnergy", "Yearly Energy Cost After", { default: 110, max: 100000, step: 5 }),
      numberField("lifeYears", "Useful Life (Years)", { default: 12, min: 1, max: 50, step: 1 }),
      percentField("priceIncreasePercent", "Energy Price Rise per Year", { default: 3, min: -10, max: 20, step: 0.5 }),
    ],
    calcResult: { label: "Payback Period (Years)", format: "number" },
    calcResults: [
      { key: "netCost", label: "Net Cost After Rebates", format: "currency" },
      { key: "firstYearSavings", label: "First-Year Savings", format: "currency" },
      { key: "paybackYears", label: "Payback Period (Years)", format: "number", highlight: true },
      { key: "lifetimeSavings", label: "Lifetime Savings", format: "currency" },
      { key: "netLifetimeGain", label: "Net Lifetime Gain", format: "currency" },
    ],
    instructions:
      "Energy Star labels and EnergyGuide stickers show an appliance's yearly energy cost — compare that with your current " +
      "one. For insulation, air sealing or windows, use an energy audit's estimate of savings. If you're replacing a broken " +
      "appliance anyway, use only the price difference over a standard model as the upgrade cost.\n\n" +
      "0 years means it doesn't pay back within its life.",
    examples:
      "Example: a $1,200 upgrade with $200 of rebates costs $1,000. Cutting energy costs from $220 to " +
      "$110 a year pays it back in 8.16 years and saves $1,561.12 over 12 years.",
    assumptions:
      "Federal 25C efficiency credits ended for upgrades placed in service after 2025; check utility and state rebates. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which upgrades pay back fastest?",
        answer: "Air sealing, attic insulation, LED lighting and smart thermostats usually pay back in a few years; new windows take much longer.",
      },
    ],
  },
  {
    slug: "solar-panel-household-payback-period-calculator",
    title: "Solar Panel Household Payback Period Calculator",
    description: "Estimate how long home solar panels take to pay for themselves: system cost after rebates, yearly electricity savings with rising rates, payback year and 25-year savings.",
    metaTitle: "Solar Panel Payback Calculator — Years to Break Even",
    metaDescription: "Free solar payback calculator. See your system cost, yearly savings with rising electricity rates, payback period and 25-year savings.",
    calcInputs: [
      numberField("systemKw", "System Size (kW)", { default: 7, min: 0, max: 100, step: 0.5 }),
      currencyField("costPerWatt", "Installed Cost per Watt", { default: 3, max: 10, step: 0.05 }),
      currencyField("rebates", "State & Utility Rebates", { default: 1000, max: 1000000, step: 100, required: false }),
      numberField("kwhPerKw", "Yearly Production per kW (kWh)", { default: 1300, min: 0, max: 3000, step: 50 }),
      currencyField("electricityRate", "Electricity Rate per kWh", { default: 0.17, max: 2, step: 0.01 }),
      percentField("rateIncreasePercent", "Electricity Rate Rise per Year", { default: 3, min: -5, max: 15, step: 0.5 }),
      percentField("degradationPercent", "Panel Output Loss per Year", { default: 0.5, max: 3, step: 0.1 }),
      numberField("years", "Years", { default: 25, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "Payback Period (Years)", format: "number" },
    calcResults: [
      { key: "grossCost", label: "Gross System Cost", format: "currency" },
      { key: "netCost", label: "Net Cost After Rebates", format: "currency" },
      { key: "firstYearSavings", label: "First-Year Savings", format: "currency" },
      { key: "paybackYears", label: "Payback Period (Years)", format: "number", highlight: true },
      { key: "lifetimeSavings", label: "Total Savings Over the Years", format: "currency" },
      { key: "netLifetimeGain", label: "Net Gain", format: "currency" },
    ],
    instructions:
      "Solar pays off through lower electric bills. Payback depends on your system cost, how much sun you get (roughly " +
      "1,100–1,600 kWh per kW a year in most of the US), your electricity rate and how your utility credits exported power " +
      "(net metering). The 30% federal residential clean energy credit ended for systems placed in service after 2025.\n\n" +
      "For financing a system, see the solar panel loan calculators.",
    examples:
      "Example: a 7-kW system at $3 a watt costs $21,000, or $20,000 after rebates. Producing " +
      "1,300 kWh per kW at $0.17 a kWh saves $1,547 in the first year. With rates rising " +
      "3% a year, it pays back in 11.35 years and saves $52,739.52 over 25 years.",
    assumptions:
      "All production offsets purchases at the retail rate; batteries and maintenance not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does solar add value to my home?",
        answer: "Owned systems often add resale value; leased systems can complicate a sale. Check local studies and your lease terms.",
      },
    ],
  },
  {
    slug: "water-conservation-savings-estimate-calculator",
    title: "Water Conservation Savings Estimate Calculator",
    description: "Estimate how much water and money you save by using less — low-flow fixtures, shorter showers, fixing leaks — and how fast water-saving upgrades pay back.",
    metaTitle: "Water Savings Calculator — Gallons & Dollars Saved",
    metaDescription: "Free water conservation calculator. Estimate gallons and dollars saved from using less water and the payback on water-saving fixtures.",
    calcInputs: [
      numberField("gallonsPerDay", "Household Water Use per Day (Gallons)", { default: 300, min: 0, max: 10000, step: 10 }),
      percentField("reductionPercent", "Reduction", { default: 20, max: 100, step: 5 }),
      currencyField("costPer1000", "Water + Sewer Cost per 1,000 Gallons", { default: 12, max: 200, step: 0.5 }),
      currencyField("heatingSavingsYearly", "Water-Heating Energy Saved per Year", { default: 50, max: 10000, step: 5, required: false }),
      currencyField("upgradeCost", "Cost of Fixtures & Repairs", { default: 150, max: 100000, step: 5, required: false }),
    ],
    calcResult: { label: "Total Yearly Savings", format: "currency" },
    calcResults: [
      { key: "gallonsSavedPerYear", label: "Gallons Saved per Year", format: "number" },
      { key: "waterBillSavings", label: "Water Bill Savings", format: "currency" },
      { key: "totalYearlySavings", label: "Total Yearly Savings", format: "currency", highlight: true },
      { key: "paybackMonths", label: "Payback (Months)", format: "number" },
    ],
    instructions:
      "The average US family uses about 300 gallons of water a day at home. WaterSense showerheads, toilets and faucet " +
      "aerators, fixing leaks and running full loads can cut use 20% or more. Less hot water also lowers your energy bill.\n\n" +
      "Find your water and sewer rate per 1,000 gallons (or per CCF ÷ 0.748) on your bill.",
    examples:
      "Example: cutting 300 gallons a day by 20% saves 21,900 gallons a year — " +
      "$262.80 on the water bill, $312.80 with the water-heating savings. A $150 upgrade pays back " +
      "in about 5.75 months.",
    assumptions:
      "Sewer charges based on water use. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I check for a leak?",
        answer: "Read your water meter, avoid using water for two hours, and read it again — any change means a leak. Toilets are the most common culprit.",
      },
    ],
  },
  {
    slug: "zero-waste-lifestyle-cost-impact-calculator",
    title: "Zero-Waste Lifestyle Cost Impact Calculator",
    description: "See the money side of going zero-waste: savings from reusables instead of disposables, composting and smaller trash service, against the upfront cost.",
    metaTitle: "Zero-Waste Savings Calculator — Reusables & Composting",
    metaDescription: "Free zero-waste calculator. Compare reusables with disposables, add composting and trash savings, and see the payback and long-term savings.",
    calcInputs: [
      currencyField("disposablesMonthly", "Disposables Bought per Month (Paper Towels, Bottled Water, Pods, Bags)", { default: 80, max: 10000, step: 5 }),
      currencyField("reusablesUpfront", "Reusables Upfront Cost", { default: 200, max: 100000, step: 5 }),
      currencyField("reusablesYearly", "Reusables Replacement per Year", { default: 40, max: 10000, step: 5, required: false }),
      currencyField("trashSavingsMonthly", "Trash Service Savings (Smaller Bin, Composting)", { default: 10, max: 1000, step: 1, required: false }),
      currencyField("compostSetup", "Compost Bin Setup", { default: 60, max: 10000, step: 5, required: false }),
      numberField("years", "Years", { default: 5, min: 0, max: 50, step: 1 }),
    ],
    calcResult: { label: "Yearly Savings", format: "currency" },
    calcResults: [
      { key: "upfrontCost", label: "Upfront Cost", format: "currency" },
      { key: "yearlySavings", label: "Yearly Savings", format: "currency", highlight: true },
      { key: "paybackMonths", label: "Payback (Months)", format: "number" },
      { key: "savingsOverYears", label: "Net Savings Over the Years", format: "currency" },
    ],
    instructions:
      "Swapping single-use items — paper towels, bottled water, coffee pods, plastic bags, wipes — for reusables usually " +
      "pays back within months. Composting food scraps can let you use a smaller, cheaper trash bin in some towns.\n\n" +
      "Add up what you spend on disposables each month for an honest starting point.",
    examples:
      "Example: replacing $80 a month of disposables, plus $10 of trash savings, saves " +
      "$1,040 a year after replacing reusables. The $260 upfront cost pays back in 3 months, " +
      "for $4,940 saved over 5 years.",
    assumptions:
      "Savings start immediately. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need to buy new zero-waste products?",
        answer: "Not necessarily — using what you already own (jars, old towels as rags) is cheaper and creates less waste than buying a new set.",
      },
    ],
  },
  {
    slug: "charitable-giving-planner-calculator",
    title: "Charitable Giving Planner Calculator",
    description: "Plan your charitable giving or tithe as a share of gross or take-home income, and estimate the tax savings under the 2026 rules for itemizers and non-itemizers.",
    metaTitle: "Charitable Giving Calculator — Tithing & Tax Savings",
    metaDescription: "Free charitable giving and tithing calculator. Plan giving as a share of income and estimate 2026 tax savings for itemizers and non-itemizers.",
    calcInputs: [
      currencyField("grossIncome", "Yearly Gross Income (AGI)", { default: 90000, max: 100000000, step: 1000 }),
      currencyField("takeHome", "Yearly Take-Home Pay", { default: 68000, max: 100000000, step: 1000 }),
      {
        key: "base", label: "Give a Share Of", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Gross Income", value: 1 },
          { label: "Take-Home Pay", value: 2 },
        ],
      },
      percentField("givingPercent", "Giving Rate (10% = Tithe)", { default: 10, max: 100, step: 1 }),
      {
        key: "itemize", label: "Do You Itemize Deductions?", type: "dropdown", required: true, default: 0,
        options: [
          { label: "No — Standard Deduction", value: 0 },
          { label: "Yes", value: 1 },
        ],
      },
      {
        key: "filing", label: "Filing Status", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Single", value: 1 },
          { label: "Married Filing Jointly", value: 2 },
        ],
      },
      percentField("marginalRatePercent", "Federal Tax Bracket", { default: 22, max: 37, step: 1 }),
    ],
    calcResult: { label: "Net Cost of Giving", format: "currency" },
    calcResults: [
      { key: "yearlyGiving", label: "Yearly Giving", format: "currency" },
      { key: "monthlyGiving", label: "Monthly Giving", format: "currency" },
      { key: "deductibleAmount", label: "Deductible Amount", format: "currency" },
      { key: "taxSavings", label: "Federal Tax Savings", format: "currency" },
      { key: "netCostOfGiving", label: "Net Cost of Giving", format: "currency", highlight: true },
    ],
    instructions:
      "Many people give a set share of income — a tithe is 10%, traditionally of gross income. From 2026, people who take " +
      "the standard deduction can deduct up to $1,000 ($2,000 married filing jointly) of cash gifts to charity; itemizers " +
      "can deduct gifts above 0.5% of their AGI, with the tax benefit capped at 35% for top-bracket filers.\n\n" +
      "Bunching several years of gifts into one year (for example through a donor-advised fund) can make itemizing worth it.",
    examples:
      "Example: giving 10% of a $90,000 income is $9,000 a year — $750 a month. Without " +
      "itemizing, a married couple can deduct $2,000, saving $440 in federal tax, so the gifts cost " +
      "$8,560.",
    assumptions:
      "Cash gifts to qualified charities; state tax effects not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I tithe on gross or net income?",
        answer: "It's a personal or faith-based choice. Gross is the traditional view; many give on take-home pay, especially when budgets are tight.",
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
